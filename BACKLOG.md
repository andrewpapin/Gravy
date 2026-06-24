# Gravy Product Backlog

This is the living backlog for Gravy, written during a project takeover after the
previous build phase went heads-down on features with no roadmap, no tests, and
two PRs left open-ended. It's grounded in a fresh audit of the codebase (engineering,
PWA/infra/accessibility, security/privacy) and the full PR history (93 PRs).

## How to read this

- **Priority**: `P0` = do next, live risk or blocker · `P1` = important, do soon ·
  `P2` = valuable but not urgent, or contingent on a later distribution decision.
- **Size**: `S` = under a day · `M` = a few days · `L` = a real project.
- Items reference the evidence behind them (PR numbers, file paths) so priority
  calls can be re-checked later instead of taken on faith.

## Snapshot — what's already built

Goals (daily/one-time/multi-step) + streaks, a reward store with parent approval,
61 badges across 6 groups, a 24-tier rank ladder, 4 educational mini-games
(Hangman, Math Facts, Word Scramble, Memory Match), multi-kid profiles per
household, 5 visual themes, full-screen onboarding, a PIN-gated parent dashboard
(Approvals/Goals/Calendar/Store/Badges/Settings), and optional real-time Supabase
sync via a 6-character household code. This is a mature, feature-complete product
surface — the gaps below are about durability (security, tests, accessibility,
process), not missing features.

## Epic 1 — Security & Trust

- ~~**Revive PR #93**~~ — **DONE.** Rebased and merged as PR #97
  (`Hash PIN and recovery answer; add brute-force lockout`). PIN and recovery
  answer are now salted-SHA-256 hashes (`src/state/hash.ts`), with a per-device
  exponential-backoff lockout after 5 failed attempts (`src/state/pinLockout.ts`).
  Plaintext fields are migrated to hashes on load and deleted.
- ~~**Decide the fate of PR #92** (rank-ladder reorder)~~ — **DECIDED: stays
  closed, won't merge.** The diff only reshuffles rank *names* across the same
  placeholder point thresholds from PR #90 ("exact balance will be revisited
  later") — no stated rationale ties the new order to any difficulty curve or
  theme, and it doesn't touch the actual flagged problem (the thresholds
  themselves are still the placeholder quadratic curve from PR #90). Merging it
  would just rename which animal a kid currently holds at a given point total,
  with no game-balance benefit, and would need re-deciding anyway once the real
  rank-curve design pass (Epic 4) happens. Re-open only as part of that design
  pass, not as a standalone reorder.
- ~~**Add real access control to the Supabase `households` table.**~~ —
  **DONE.** `supabase/migrations/20260623000000_scope_household_mutations.sql`
  revokes the unscoped anon INSERT/UPDATE grants and replaces them with three
  `SECURITY DEFINER` RPCs (`gravy_create_household`, `gravy_upsert_household_state`,
  `gravy_rename_household`) that each only touch the one row matching the
  caller-supplied code. SELECT is intentionally still open (required for
  Supabase Realtime sync under the shared anon key — there's no per-household
  auth claim to scope it by). Decision: accept the remaining read exposure for
  now given single/few-household scope; revisit if the household-code space is
  ever opened to the public.
- ~~**Rate-limit household-code lookups**~~ — **DONE.**
  `supabase/migrations/20260623184956_rate_limit_household_lookup.sql` adds a
  `gravy_lookup_household` `SECURITY DEFINER` RPC (and a backing
  `household_lookup_attempts` table) that throttles join-by-code lookups to 10
  per 5-minute window per source IP (read from PostgREST's `request.headers`
  GUC, falling back to a single shared bucket if no IP is available) before
  returning a code's state. `fetchHousehold()` (`src/state/sync.ts`) now calls
  this RPC instead of querying the table directly; `joinHousehold` surfaces the
  rate-limit error as a toast. Residual risk, same class as the one already
  accepted above: the table's SELECT grant must stay open for `anon` for
  Realtime, so a client that bypasses this RPC and queries the REST endpoint
  directly isn't blocked by it — this closes the documented, discoverable
  join-flow path, not direct REST access. *(P1, S–M.)*
- ~~**Write a short data-handling note**~~ — **DONE.** See `DATA_HANDLING.md`:
  what's collected (child name + hashed PIN/recovery answer only — no email,
  accounts, or analytics), where it lives (`localStorage` + optional Supabase
  household row), and how to delete it.
- ~~**Close two gaps found while writing that note**~~ — **DONE.**
  (1) `supabase/migrations/20260623225331_delete_household_everywhere.sql`
  adds a `gravy_delete_household` SECURITY DEFINER RPC, scoped to one code
  like the other three; `SyncPanel` now has a "Delete household everywhere"
  action distinct from "Turn off cloud sync" — leaving still only disconnects
  this device (other devices may depend on the row), but a parent can now
  explicitly delete it for everyone. (2)
  `supabase/migrations/20260623225536_cleanup_lookup_attempts.sql` has
  `gravy_lookup_household` opportunistically delete other buckets whose
  rate-limit window has lapsed on every call, bounding
  `household_lookup_attempts` to roughly the IPs seen in the last window
  instead of growing forever, without needing a separate scheduled job.
  *(P2, S.)*

## Epic 2 — Engineering Foundation & Quality

- ~~**Stand up Vitest** and write unit tests for the state logic that actually
  moves points: `awardPoints`/`awardPointsForDay`, streak rollover
  (`applyDayRollover`), badge triggers (`findNewlyEarnedBadges`), and bonus-item
  forgiveness/exact-undo.~~ **DONE.** Added `vitest` + `npm test`; the award/
  forgiveness/exact-undo arithmetic was extracted out of `GravyContext.tsx`'s
  `useCallback` closures into a pure `src/state/points.ts` (same behavior, now
  independently testable) with `src/state/points.test.ts` covering it,
  `src/state/defaultState.test.ts` covering `applyDayRollover`/
  `backfillStreaksFromLogs`, and `src/state/badges.test.ts` covering
  `findNewlyEarnedBadges`/`getBadgeProgress`/`getBadgeDisplay`. *(P0, M.)*
- ~~**Fix the `todayGoals` rollover bug**~~ caught while writing the tests
  above: `applyDayRollover` only cleared `todayGoals` of ids that no longer
  matched a *current* daily goal, instead of clearing it outright, so a daily
  goal's id stayed there forever once logged once — permanently tripping
  `incrementGoal`'s "already awarded today" guard and silently killing its
  payout from day 2 onward, while the UI (driven by `todayGoalCounts`,
  correctly reset daily) kept showing it as completable. **DONE** —
  `todayGoals` is now unconditionally cleared (`= []`) at rollover, same as
  `todayGoalCounts`. Exactly the kind of regression standing up tests was
  meant to catch.
- ~~**Fix UTC/local day-boundary mismatch in day rollover**~~ — reported as
  "the day at the top says today, but items I selected last night are still
  selected." `todayStr()`/`applyDayRollover()` keyed "today" off **UTC**
  date fields (by original deliberate design, so every device in a synced
  household agreed on "today" regardless of timezone) while the date shown
  in the UI (`Greeting.tsx`, `CalendarPanel.tsx`) used the device's
  **local** date. For any timezone west of UTC (all of North/South America),
  UTC midnight lands hours before local midnight, so an evening goal-check
  could already land on the next UTC day; by the next local morning, the
  local calendar had rolled over but the UTC date — and thus
  `lastActiveDate` — hadn't, so rollover silently no-op'd and last night's
  selections stayed checked. **DONE** — `dateStrUTC()` is now
  `dateStrLocal()`, built from local date fields, matching the UI; all call
  sites (`todayStr()`, `applyDayRollover()`'s yesterday calc,
  `backfillStreaksFromLogs()`) and their `setUTCDate`/`setDate` arithmetic
  were updated to match. `vitest.config.ts` pins `TZ=UTC` for the test
  process so the existing UTC-suffixed test fixtures stay deterministic;
  `src/state/defaultState.test.ts` adds a regression test that fails
  against the old UTC-keyed implementation. Tradeoff: a household synced
  across timezones may now briefly disagree on "today" near midnight
  instead of agreeing on the wrong "today" for everyone.
- ~~**Add a CI gate**~~ — **DONE.** `deploy.yml` now runs `npm run lint` then
  `npm test` before `npm run build`, so a lint or test failure blocks deploy.
  *(P0, S.)*
- ~~**Harden error handling**: wrap `localStorage` writes in try/catch with a
  user-visible fallback for quota-exceeded or disabled storage (e.g. iOS private
  browsing), and validate the shape of incoming Supabase realtime payloads
  before trusting them.~~ — **DONE.** Every `localStorage` call in `src/`
  now goes through `safeGetItem`/`safeSetItem`/`safeRemoveItem`
  (`src/state/storage.ts`), which catch the exception `localStorage` throws
  when disabled or full instead of letting it propagate. `saveState`/
  `saveRoot` (`src/state/defaultState.ts`) return a boolean; `GravyProvider`'s
  autosave effect shows a one-time "Couldn't save" toast on failure (deduped
  on repeat failures, reset once a write succeeds again) so a kid's progress
  isn't silently lost. `subscribeToHousehold` (`src/state/sync.ts`) now
  validates an incoming realtime payload has a `profiles` array
  (`isValidHouseholdStatePayload`) before handing it to the app, on top of
  the existing per-field `hydrateState`/`sanitizeState` validation. *(P1, M.)*
- ~~**Add an "update available" prompt** for the PWA.~~ — **DONE.**
  `src/components/UpdatePrompt.tsx` (using `virtual:pwa-register/react`'s
  `useRegisterSW()`) checks for a new service worker every 60s while the app
  is open and again on every `visibilitychange` to visible, then auto-applies
  and reloads immediately (no manual click, no dismiss) with a brief status
  banner — tuned for a rapid-beta-testing phase where missing an update is
  worse than an unprompted reload.
- **Refactor `GravyContext.tsx`** (~1240 lines) — extract household/sync logic
  into its own hook/module before it grows further. Pure maintainability, no
  user-facing effect. *(P2, M.)*

## Epic 3 — Accessibility

- ~~**Accessibility hardening pass**~~ — **DONE.** All four sub-items below
  landed together (interactive tiles, modals/drawers, theme CSS, label
  sizes), as planned. *(P1, M overall.)*
  - ~~Add aria-labels / semantic roles to interactive tiles~~ — many were
    `div`+`onClick` or unlabeled buttons across both kid and parent surfaces.
    **DONE.**
  - ~~Add focus trapping / return-focus to modals and drawers~~ (Calendar,
    Badge popup, Onboarding, PIN screen). **DONE** — `useFocusTrap`
    (`src/components/useFocusTrap.ts`), wired into `Modal`, `RankScreen`,
    `GamesScreen`, `BadgePopup`, `ConfirmDialog`, `AccountMenu`,
    `SyncGateModal`, `Celebration`, and `PinScreen`.
  - ~~Run a color-contrast pass across all 5 themes~~ (classic / midnight /
    ocean / bubblegum / cyberpunk). **DONE** — darkened the base `--muted`
    token for classic and ocean (the two themes where `--bg`/`--card`/
    `--cream` are all light, so a single token fix covers every
    muted-text-on-card combination); for midnight/cyberpunk, where `--dark`/
    `--text`/`--muted` are dual-purposed (flipped light to read on dark
    surfaces elsewhere), extended the existing scoped per-selector ink
    overrides in `src/index.css` instead of touching the shared token. Added
    `.muted-note` and `.empty-state--bare` classes to replace inline
    `color: 'var(--muted)'` styles and a dual-context shared class, both of
    which were otherwise unreachable by a CSS theme override.
  - ~~Audit/raise minimum label font sizes~~ — **DONE.** Raised the
    `--text-2xs` token from 10px to 11px (the floor used by `.food-label`,
    `.store-need-more`, `.badge-progress-label`, `.rank-row-points`,
    `.rank-row-status`, and `.theme-swatch-label`); verified via Playwright
    screenshots across classic/cyberpunk that none of the six clip or
    overflow at the new size. Left three single-glyph icon-badge sizes below
    11px untouched as out of scope — `.sync-warning-icon` (0.6rem),
    `.nav-badge::after` (0.6rem), and `.food-check-badge` (0.55rem) are
    decorative counts/glyphs in small fixed circles, not textual labels.

## Epic 4 — Game Balance & Content Debt

- **Design the points economy in one pass**: resolve the rank point-curve
  (explicitly called a placeholder in PR #90, "exact balance will be revisited
  later") *and* re-check the total daily point ceiling (daily goals, bonus
  items, and 4 separately-capped games all award points now) together — rank
  thresholds can't be sanely set without first knowing the realistic
  daily/weekly point ceiling they're paced against, so treat the curve and the
  ceiling check as one design pass, not two. *(P1, M.)*
- **Lock the theme palette.** It was wholesale-replaced once already (4 themes →
  5 new ones in PR #80); avoid a second full swap without a clear signal that
  the current set isn't working. *(P2, decision only.)*

## Epic 5 — Retention & Engagement

- **PWA push notifications** for chore reminders and streak-about-to-break
  nudges — the single biggest lever for a habit-forming app, currently absent
  entirely. *(P1, L.)*
- **Parent weekly digest/summary** surfaced in-app (no email infra exists today)
  so engagement doesn't require opening the dashboard. *(P2, M.)*
- **Family/sibling comparison view** — multi-profile support shipped (PR #82)
  but profiles currently can't see each other. *(P2, M.)*

## Epic 6 — Distribution & Growth

*(Contingent — only pursue if/when a wider-distribution decision is made;
scope today is "plan for optionality," not commit.)*

- App store packaging (TWA/PWABuilder for Android; iOS wrapper or App Clip).
- Lightweight, privacy-respecting, **opt-in** analytics — no third-party
  trackers exist today by design; if added, keep it self-hosted/aggregate-only
  given the child-data context.
- Formal privacy policy / ToS page and a COPPA-adjacent compliance review
  before any public sign-up flow.

## Epic 7 — Process Hygiene

- ~~**Triage every open/unmerged branch explicitly** (#92, #93 today)~~ —
  **DONE**: #93 merged as #97, #92 explicitly decided to stay closed (see
  Epic 1). Standing principle going forward: don't let future work pile up
  unmerged and unresolved the way these two did.
- **Keep this `BACKLOG.md` living** — update priorities as items land instead
  of letting new PRs silently supersede old ones without a record.
- **Hold a short UI-stabilization window** while Epics 1–3 land: the parent
  dashboard was fully redesigned three times (PRs #71, #73, plus earlier passes)
  and the theme palette fully replaced once (PR #80) in recent history — high
  churn, low durability. Resist a fourth redesign or second palette swap until
  there's a concrete signal (user feedback, data) calling for it.

## Do these next (top 5, in order)

The original top-5 here (PIN/recovery hashing, the PR #92 decision, the lint
gate, Vitest, and Supabase access control) is now fully done — see the
strikethroughs in Epics 1, 2, and 7 above. Replacing it with the next five,
prioritized from what's actually still open:

1. ~~Write the data-handling note~~ (Epic 1, P1/S) — **DONE**, see
   `DATA_HANDLING.md`.
2. ~~Harden error handling~~ around `localStorage` writes and incoming
   Supabase realtime payloads (Epic 2, P1/M) — **DONE**, see Epic 2 above.
3. ~~Run the accessibility hardening pass~~ (Epic 3, P1/M) — **DONE**: all
   four sub-items (aria-labels, focus trapping, the contrast pass, and the
   font-size audit) are complete, see Epic 3 above.
4. **Design the points economy in one pass**: rank curve + daily point
   ceiling together (Epic 4, P1/M).
5. **Ship PWA push notifications** (Epic 5, P1/L) — the single biggest lever
   for retention; sequenced last here only because of size, not importance.
