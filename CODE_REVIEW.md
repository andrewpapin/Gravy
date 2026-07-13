# Gravy — End-to-End Code Review

> **⚠️ Historical document — do not treat as current.** This review predates several
> major changes and describes subsystems that no longer exist: the PIN-unlock flow and
> badge system were both fully removed (Epics 8 and 12 — parent access is now gated by
> Supabase Auth accounts), and the RLS/security posture has changed since (see
> `docs/persistence-and-sync.md` and `BACKLOG.md` Epic 9 for the current state). It is
> kept for the historical record only; findings here should not be re-filed or acted on
> without re-verifying against today's code. The living audit is `AUDIT_REPORT.md`
> (July 2026), tracked in `BACKLOG.md` Epic 13.

Scope: full repository as of branch `claude/end-to-end-code-review-dyfzf3` (state/sync layer, UI components, build/tooling, security surface). Every finding below was personally verified against the source (file + line) rather than taken at face value from initial recon — a few recon claims turned out to be inaccurate or overstated and were dropped or corrected (noted inline where relevant).

## Summary

Gravy is a well-built, type-safe client-side PWA. TypeScript strict mode is on with no escape hatches (`any`, `@ts-ignore`) anywhere in the codebase, ESLint runs clean with no rule overrides, there's no `dangerouslySetInnerHTML`/`eval`/direct DOM injection anywhere, the GitHub Actions deploy workflow has minimal permissions, and `npm audit` reports zero known vulnerabilities. Several subsystems (`defaultState.ts`'s migration/hydration logic, the points-arithmetic "exact inverse" design in `GravyContext.tsx`, the lazy-loaded parent dashboard) are deliberately and clearly commented, which made this review easier and more confident.

The real findings cluster in four places: **unscoped Supabase Row Level Security** that lets any client with the public anon key read or overwrite every household's data (not just its own), **PIN/credential handling** (plaintext storage, no brute-force protection, weak default), a **timezone-naive day-rollover** that can misbehave for traveling/multi-device users, and a handful of **maintainability** items (one large context file, some duplicated modal/form JSX) that aren't bugs today but raise the cost of future changes.

## What's already solid

- Strict TypeScript (`noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`) with zero `any`/`@ts-ignore`/`@ts-expect-error` in the codebase.
- ESLint (flat config, `react-hooks` + `react-refresh` recommended rules) runs with **zero errors/warnings** (verified this session, see Build & tooling results below).
- No XSS-prone patterns (`dangerouslySetInnerHTML`, `innerHTML`, `eval`) anywhere in `src/`.
- `src/lib/supabaseClient.ts` uses a `sb_publishable_...` key, which is meant to be public — appropriate for a client-only app, *contingent on RLS actually scoping access*, which it currently does not (see Finding C-1).
- `defaultState.ts`'s `migrateLegacyState()`/`hydrateState()`/`backfillStreaksFromLogs()` are careful, idempotent, and well-commented about *why* each migration step exists.
- The points-mutation code in `GravyContext.tsx` (`awardPoints`, `logFood`/`removeFood`, `incrementGoal`/`decrementGoal`) is intentionally symmetric — each action documents that it's the "exact inverse" of its counterpart, specifically so an action followed by its own removal nets to zero without flooring artifacts. This is good, deliberate design, not duplication to clean up.
- `GrownUpsDrawer.tsx` lazy-loads `ParentDashboard` only after the PIN succeeds, with a comment citing the React docs pattern it follows for resetting stage-on-reopen — a clean, deliberate choice, not an anti-pattern.
- The Supabase realtime handler (`GravyContext.tsx:211-237`) already wraps incoming payloads in `try/catch` and ignores malformed updates rather than crashing — there is a real gap here (see M-3 below) but it's not the "no safety net at all" picture initial recon suggested.
- GitHub Actions deploy workflow (`.github/workflows/deploy.yml`) requests only `contents: read` and `pages: write`/`id-token: write` — no excess permissions, no secrets in use.

## Findings

### Critical

**C-1. Supabase RLS on the `households` table is enabled but unscoped — any client with the public anon key can read or overwrite every household in production, not just its own.** Verified directly against the live Supabase dashboard (Authentication → Policies, `households` table, project behind `hooadhlgxaivkgvqptcu.supabase.co`): RLS is **on** (the "Disable RLS" control is present, confirming it's currently enabled), but the only three policies defined are:

| Name | Command | Applied to |
|---|---|---|
| anyone can insert households | INSERT | `anon` |
| anyone can read households | SELECT | `anon` |
| anyone can update households | UPDATE | `anon` |

None of these are scoped to a specific row — there's no policy restricting access to the row matching a client-supplied household `code`. A policy literally named "anyone can read households" applied unconditionally to `anon` is, by its own name and the dashboard's policy semantics, an unrestricted grant rather than a per-row check (the exact `USING`/`WITH CHECK` SQL wasn't independently pulled via `pg_policies` — the Supabase MCP tool calls needed for that were gated by the environment this session — but the policy names and the all-`anon`, no-other-policies picture are unambiguous on their own). Practical effect: since `src/lib/supabaseClient.ts`'s anon key ships in every client bundle, **anyone** can call the Supabase REST API directly (bypassing the app's UI entirely) and:
- `SELECT * FROM households` — dump every household's full state for every Gravy user: kid names, points, goals/rewards, settings, and the H-1 PIN/recovery fields — this row-scoping gap is what turns H-1's plaintext storage from "exposed to someone with a found/synced device" into "exposed to anyone with the public anon key."
- `UPDATE households SET state = ...` for **any** code, not just one the attacker legitimately holds — i.e. any household's data can be overwritten/vandalized by a stranger.
- `INSERT` arbitrary new rows (storage/data pollution). No `DELETE` policy exists, so outright row deletion via the API isn't currently possible.

This is the root cause that makes H-1 worse than originally scoped ("contingent on RLS" — RLS does not provide the assumed protection) and is independently a Critical finding on its own: it's a live, unauthenticated, full-table read/write exposure on a production database, not a hypothetical. (Note: this document records findings as of the original review pass; it doesn't track which findings have since been fixed in code — see the repo's commit history / PR for current status of H-1 and others.)
*Suggested direction:* scope the `SELECT`/`UPDATE` policies so a row is only readable/writable by a request that already knows that row's `code` (e.g. drop blanket `anon` policies and instead expose access through a `SECURITY DEFINER` Postgres function that takes `code` as a parameter and is the only way to reach the table, with direct table grants revoked from `anon`). Combined with the household code's existing unambiguous-character-set design (`sync.ts:5`), this would mean an attacker needs to already know or brute-force a specific 6-character code rather than being able to enumerate/overwrite the entire table in one unauthenticated call. This requires a production database migration — do not apply without explicit sign-off given the live `PRODUCTION` label on this project.

*Remediation applied (partial):* `supabase/migrations/20260623000000_scope_household_mutations.sql` drops the blanket `anon` INSERT/UPDATE policies and revokes those table grants entirely, replacing them with three `SECURITY DEFINER` RPCs (`gravy_create_household`, `gravy_upsert_household_state`, `gravy_rename_household`) that each take a `code` and only ever touch that one row; `src/state/sync.ts`'s `createHousehold`/`pushHouseholdState`/`renameHousehold` now call those RPCs instead of mutating the table directly. This closes the "overwrite/flood any row, or every row, in one call" exposure. **The SELECT policy is intentionally left unscoped** — Supabase Realtime's `postgres_changes` delivery is gated by the subscribing role's SELECT RLS permission, every client in this app shares the same anon key with no per-household auth claim to scope by, so revoking SELECT would break the app's live cross-device sync entirely. This means a full unauthenticated table read (`SELECT * FROM households`, including every household's plaintext PIN/recovery answer per H-1) **remains possible** after this migration — closing that residual gap requires either H-1's fix (hash the PIN/recovery answer so a table dump no longer yields usable credentials) or a larger redesign (real per-household auth). The migration must be applied to the live database (it can't be applied via this session's tooling) before/at the same time as this branch merges, or sync will break for all users in production once deployed.

### High

**H-1. PIN and recovery answer are stored and synced in plaintext.**
`Settings.pin` and `Settings.recoveryAnswer` (`src/state/types.ts:49,52`) are plain strings. They're listed in `SHARED_SETTING_KEYS` (`src/state/defaultState.ts:228-234`), so they persist to `localStorage` under `gravy_v1` **and** get pushed verbatim, unencrypted, inside the `GravyRoot` JSON blob to the Supabase `households.state` column (`src/state/sync.ts:41-46`, pushed from `GravyContext.tsx:193-208`). Anyone with read access to that row gets the PIN and recovery answer as plain text — and per C-1 above, that's no longer a narrow "found/synced device" scenario: the table's RLS doesn't restrict reads to a specific household, so this data is reachable by anyone with the (public) anon key.
*Suggested direction:* hash the PIN (and recovery answer) at rest, comparing hashes instead of raw strings in `PinScreen.tsx`'s `checkPin`/`submitRecoverAnswer`.

**H-2. No rate-limiting or lockout on PIN attempts, plus a guessable default.**
`checkPin()` in `src/components/PinScreen.tsx:54-63` does a direct string comparison with no attempt counter, backoff, or lockout. The shipped default PIN is `'1234'` (`src/state/defaultState.ts:54`) and there's no first-run prompt forcing a change. Combined with H-1's lack of hashing, a 4-digit PIN gating the entire parent dashboard (including the rewards economy and PIN/recovery settings themselves) is brute-forceable in a handful of seconds by a motivated kid with physical access.
*Suggested direction:* add an increasing delay or temporary lockout after N consecutive wrong attempts; consider nudging parents to change the default PIN during onboarding.

### Medium

**M-1. Day rollover uses browser-local time with no timezone normalization.**
`todayStr()` (`src/state/defaultState.ts:69-72`) and `applyDayRollover()` (`defaultState.ts:313-367`) derive "today"/"yesterday" purely from the device's local clock. If a household's devices are in different timezones (or a device travels), `lastActiveDate` comparisons can fire a rollover early/late relative to other devices, which can incorrectly reset or extend `streak`/`foodStreak`/`goalStreak`/`megaStreak` for that profile. This is consistent with the "last-write-wins, no server authority" design documented in CLAUDE.md, but the specific timezone-drift failure mode isn't called out there.
*Suggested direction:* at minimum, document the assumption explicitly; a more robust fix would normalize to a fixed reference (e.g. UTC, or the household's chosen timezone) rather than each device's local clock.

**M-2. `approveReward` can silently shortchange the floor instead of validating the original request.**
`src/state/GravyContext.tsx:752-765`: approval deducts the reward's *current* `cost` from the *current* `points` balance, floored at 0 (`Math.max(0, next.points - reward.cost)`). If the kid's balance dropped below the reward's cost between request and parent approval (e.g. they spent points elsewhere in the meantime), approval just floors to zero rather than flagging that the original request can no longer be fully honored. Not a crash or data-corruption risk — just a quiet inconsistency a parent has no visibility into.
*Suggested direction:* validate against the cost at approval time and surface a toast/warning if the balance can't fully cover it, rather than floor silently.

**M-3. Incoming Supabase payloads aren't schema-validated, only shape-guarded.**
The realtime subscription handler (`GravyContext.tsx:211-237`) and `hydrateState()` (`defaultState.ts:178-208`) check that `raw` is an object and that `profiles` is a non-empty array, but don't validate the *types* of nested fields (e.g. a `points` field that's a string, or a `goals` array with malformed entries) before merging the payload into live state. The `try/catch` prevents an outright crash, but a malformed-yet-object-shaped payload from a buggy client could still propagate bad data into a household's other devices.
*Suggested direction:* add light runtime validation (e.g. a small schema check) before accepting a remote payload, rather than relying solely on optimistic property access.

**M-4. Production bundle exceeds Vite's recommended chunk size.**
Verified by running `npm run build` this session: the main bundle is `dist/assets/index-*.js` at **622 KB (182 KB gzipped)**, triggering Vite's "chunks larger than 500 kB" warning. `ParentDashboard` is already code-split via `lazy()` (26 KB separately), which is good, but the remaining kid-facing bundle is still large for a PWA likely used on phones/tablets.
*Suggested direction:* look for further `lazy()` opportunities (e.g. `Onboarding`, `ProfilesManager`, badge/store screens) or audit for large dependencies pulled into the main chunk.

### Low

**L-1. Deferred celebration/badge timers aren't cleared on `resetAll()` or `leaveHousehold()`.**
`pendingTimersRef` (`GravyContext.tsx:178`) collects `setTimeout` handles used to stagger badge/rank-up toasts after a celebration overlay (e.g. `maybeCelebrateRankUp`, `checkBadges` with `delayMs`). It's only ever cleared inside an action's own "Undo" closure (e.g. `logFood`'s `undo()` at `GravyContext.tsx:379-381`) — not in `resetAll()` (`:898-923`) or `leaveHousehold()` (`:1110-1116`). If a parent resets progress or disconnects sync within ~1.4s of a kid's action that queued a deferred toast, a stale toast/confetti burst can still fire afterward. Cosmetic only — no state corruption, since the closures reference already-captured values.

**L-2. Two modals use a generic `aria-label="Close"` instead of a descriptive one.**
`src/components/ProfilesManager.tsx:75` and `src/components/ProfileSwitcher.tsx:38` both use the bare label `"Close"`. By contrast, `StoreScreen.tsx`, `BadgesScreen.tsx`, and `GrownUpsDrawer.tsx` all use specific labels ("Close store", "Close badges", "Close grown-up mode") — worth matching for consistency. (Initial recon over-generalized this as "many modals have generic labels"; in fact it's isolated to these two.)

**L-3. Modal overlay/header/close-button JSX is duplicated near-verbatim across ~5+ components.**
`StoreScreen.tsx`, `BadgesScreen.tsx`, `GrownUpsDrawer.tsx`, `ProfilesManager.tsx`, and `ProfileSwitcher.tsx` each repeat the same `calendar-modal-overlay` / `calendar-modal-sheet` / `calendar-modal-header` / close-button structure. A shared `<Modal title onClose>` wrapper would reduce duplication and make future a11y fixes (like L-2) a one-place change instead of five.

**L-4. `GoalsPanel.tsx`'s add-goal and edit-goal forms duplicate the same input-row structure** (icon picker, name, points, optional target fields) twice (`src/components/parent/GoalsPanel.tsx:60-100` vs `:136-159`). Functionally correct, just a maintenance cost — a shared form sub-component would remove the duplication.

**L-5. `GravyContext.tsx` is a single 1,215-line file mixing domain state, Supabase wiring, and side effects** (toasts, celebrations, badge detection) behind one `useGravy()` hook. Nothing incorrect was found in it during this review, and it's consistently commented, but its size makes it the highest-risk file to touch — a future refactor splitting sync/celebration concerns out of the core reducer-like logic would reduce blast radius for changes.

**L-6. Badge trigger strings are parsed with an unchecked `string.split(':')` in two places** (`src/state/badges.ts:38,85`) with no validation against `src/data/badges.ts`. A typo'd trigger (e.g. `'friut:5'`) would silently fall through to a 0-threshold/never-earned badge rather than raising a build-time or load-time error. Low risk since `data/badges.ts` is static, developer-authored content, not user input.

## Build & tooling results (this session)

- `npm ci` — clean install, 444 packages, **0 vulnerabilities**.
- `npm run lint` (ESLint flat config) — **0 errors, 0 warnings**.
- `npm run build` (`tsc -b && vite build`) — **succeeds**; see M-4 for the one warning it emits (chunk size).
- `npm audit` (dev + prod) — **0 vulnerabilities** in either mode.

(Note: `node_modules` wasn't present at the start of this review — both `lint` and `build` initially failed with module-resolution errors purely because dependencies weren't installed yet in this environment. After `npm ci`, both ran clean. This is an environment-setup artifact, not a codebase defect.)

## Suggested next steps, roughly prioritized

1. ~~Scope the `households` RLS policies so writes require knowing a row's `code` instead of being open to any `anon` client (C-1)~~ — INSERT/UPDATE are now scoped via `SECURITY DEFINER` RPCs (see migration + remediation note above); the migration still needs to be run against the live database. SELECT remains intentionally open (Realtime constraint) — H-1 is now the binding mitigation for the data it exposes.
2. Hash the PIN (and ideally the recovery answer) instead of storing/syncing plaintext (H-1), and add attempt lockout (H-2) — these two compound each other and compound C-1's still-open SELECT policy.
3. Decide whether timezone-naive day rollover (M-1) is acceptable for the target use case (single household, mostly-same-timezone devices) or worth hardening.
4. If/when touching `GoalsPanel`/modals again, extract the shared `<Modal>` and form-row patterns (L-3, L-4) opportunistically rather than as a dedicated refactor.
5. Consider further code-splitting (M-4) if initial load time on mobile becomes a concern.

---
*This review documents findings only; no code changes were made as part of it.*
