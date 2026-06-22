# Gravy — End-to-End Code Review

Scope: full repository as of branch `claude/end-to-end-code-review-dyfzf3` (state/sync layer, UI components, build/tooling, security surface). Every finding below was personally verified against the source (file + line) rather than taken at face value from initial recon — a few recon claims turned out to be inaccurate or overstated and were dropped or corrected (noted inline where relevant).

## Summary

Gravy is a well-built, type-safe client-side PWA. TypeScript strict mode is on with no escape hatches (`any`, `@ts-ignore`) anywhere in the codebase, ESLint runs clean with no rule overrides, there's no `dangerouslySetInnerHTML`/`eval`/direct DOM injection anywhere, the GitHub Actions deploy workflow has minimal permissions, and `npm audit` reports zero known vulnerabilities. Several subsystems (`defaultState.ts`'s migration/hydration logic, the points-arithmetic "exact inverse" design in `GravyContext.tsx`, the lazy-loaded parent dashboard) are deliberately and clearly commented, which made this review easier and more confident.

The real findings cluster in three places: **PIN/credential handling** (plaintext storage, no brute-force protection, weak default), a **timezone-naive day-rollover** that can misbehave for traveling/multi-device users, and a handful of **maintainability** items (one large context file, some duplicated modal/form JSX) that aren't bugs today but raise the cost of future changes.

## What's already solid

- Strict TypeScript (`noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`) with zero `any`/`@ts-ignore`/`@ts-expect-error` in the codebase.
- ESLint (flat config, `react-hooks` + `react-refresh` recommended rules) runs with **zero errors/warnings** (verified this session, see Build & tooling results below).
- No XSS-prone patterns (`dangerouslySetInnerHTML`, `innerHTML`, `eval`) anywhere in `src/`.
- `src/lib/supabaseClient.ts` uses a `sb_publishable_...` key, which is meant to be public — appropriate for a client-only app, contingent on RLS (see Finding S-3).
- `defaultState.ts`'s `migrateLegacyState()`/`hydrateState()`/`backfillStreaksFromLogs()` are careful, idempotent, and well-commented about *why* each migration step exists.
- The points-mutation code in `GravyContext.tsx` (`awardPoints`, `logFood`/`removeFood`, `incrementGoal`/`decrementGoal`) is intentionally symmetric — each action documents that it's the "exact inverse" of its counterpart, specifically so an action followed by its own removal nets to zero without flooring artifacts. This is good, deliberate design, not duplication to clean up.
- `GrownUpsDrawer.tsx` lazy-loads `ParentDashboard` only after the PIN succeeds, with a comment citing the React docs pattern it follows for resetting stage-on-reopen — a clean, deliberate choice, not an anti-pattern.
- The Supabase realtime handler (`GravyContext.tsx:211-237`) already wraps incoming payloads in `try/catch` and ignores malformed updates rather than crashing — there is a real gap here (see S-4 below) but it's not the "no safety net at all" picture initial recon suggested.
- GitHub Actions deploy workflow (`.github/workflows/deploy.yml`) requests only `contents: read` and `pages: write`/`id-token: write` — no excess permissions, no secrets in use.

## Findings

### High

**H-1. PIN and recovery answer are stored and synced in plaintext.**
`Settings.pin` and `Settings.recoveryAnswer` (`src/state/types.ts:49,52`) are plain strings. They're listed in `SHARED_SETTING_KEYS` (`src/state/defaultState.ts:228-234`), so they persist to `localStorage` under `gravy_v1` **and** get pushed verbatim, unencrypted, inside the `GravyRoot` JSON blob to the Supabase `households.state` column (`src/state/sync.ts:41-46`, pushed from `GravyContext.tsx:193-208`). Anyone with read access to that row (a found/synced device, or the DB itself if Supabase RLS isn't locked down — see S-3 below) gets the PIN and recovery answer as plain text.
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

### Unverified — flagged, not asserted

**S-3. Supabase Row Level Security posture on the `households` table could not be checked from this session.** `mcp__Supabase__list_projects`/`get_advisors` calls were denied by the environment ("MCP tool call requires approval") and couldn't be retried into a working state. This matters because H-1's severity is bounded by RLS: if RLS properly restricts each row to only be readable/writable by clients that know its 6-character code (which is the apparent design intent, per the unambiguous-character-set code generation in `sync.ts:5`), exposure is limited to people who already have a household's join code. If RLS is permissive (e.g. allows scanning all rows), the plaintext PIN/recovery data in H-1 would be readable by anyone with the public anon key, not just household members. **This should be verified directly in the Supabase dashboard** (Authentication → Policies on `households`) since it materially changes H-1's real-world severity.

## Build & tooling results (this session)

- `npm ci` — clean install, 444 packages, **0 vulnerabilities**.
- `npm run lint` (ESLint flat config) — **0 errors, 0 warnings**.
- `npm run build` (`tsc -b && vite build`) — **succeeds**; see M-4 for the one warning it emits (chunk size).
- `npm audit` (dev + prod) — **0 vulnerabilities** in either mode.

(Note: `node_modules` wasn't present at the start of this review — both `lint` and `build` initially failed with module-resolution errors purely because dependencies weren't installed yet in this environment. After `npm ci`, both ran clean. This is an environment-setup artifact, not a codebase defect.)

## Suggested next steps, roughly prioritized

1. Hash the PIN (and ideally the recovery answer) instead of storing/syncing plaintext (H-1), and add attempt lockout (H-2) — these two compound each other.
2. Manually confirm Supabase RLS on `households` (S-3) — quick to check, materially changes how urgent H-1 is.
3. Decide whether timezone-naive day rollover (M-1) is acceptable for the target use case (single household, mostly-same-timezone devices) or worth hardening.
4. If/when touching `GoalsPanel`/modals again, extract the shared `<Modal>` and form-row patterns (L-3, L-4) opportunistically rather than as a dedicated refactor.
5. Consider further code-splitting (M-4) if initial load time on mobile becomes a concern.

---
*This review documents findings only; no code changes were made as part of it.*
