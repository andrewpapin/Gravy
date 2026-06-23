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
- **Write a short data-handling note**: what's collected, where it lives
  (device `localStorage` + optional Supabase row), how to delete it (`Reset
  Everything`). Cheap now, required before any wider distribution. *(P1, S.)*

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
- ~~**Add a CI gate**~~ — **DONE.** `deploy.yml` now runs `npm run lint` then
  `npm test` before `npm run build`, so a lint or test failure blocks deploy.
  *(P0, S.)*
- **Harden error handling**: wrap `localStorage` writes in try/catch with a
  user-visible fallback for quota-exceeded or disabled storage (e.g. iOS private
  browsing), and validate the shape of incoming Supabase realtime payloads
  before trusting them. *(P1, M.)*
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

- **Accessibility hardening pass** — bundle the four items below into one
  effort instead of four separate sweeps: each one touches the same surfaces
  (interactive tiles, modals/drawers, theme CSS), so reviewing/landing them
  together is cheaper than reopening the same components four times.
  *(P1, M overall.)*
  - Add aria-labels / semantic roles to interactive tiles — many are
    `div`+`onClick` or unlabeled buttons across both kid and parent surfaces.
  - Add focus trapping / return-focus to modals and drawers (Calendar, Badge
    popup, Onboarding, PIN screen).
  - Run a color-contrast pass across all 5 themes (classic / midnight / ocean
    / bubblegum / cyberpunk) — likely WCAG AA failures in muted-text-on-card
    combinations, especially after prior ad-hoc contrast patches.
  - Audit/raise minimum label font sizes (some labels sit around ~10px) —
    lowest priority of the four (P2); fold in opportunistically rather than
    blocking the rest.

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

1. **Write the data-handling note** (Epic 1, P1/S) — cheapest remaining item,
   and a prerequisite for any wider distribution.
2. **Harden error handling** around `localStorage` writes and incoming
   Supabase realtime payloads (Epic 2, P1/M).
3. **Run the accessibility hardening pass** (Epic 3, P1/M) — bundles
   aria-labels, focus trapping, contrast, and the font-size audit into one
   effort over the same surfaces.
4. **Design the points economy in one pass**: rank curve + daily point
   ceiling together (Epic 4, P1/M).
5. **Ship PWA push notifications** (Epic 5, P1/L) — the single biggest lever
   for retention; sequenced last here only because of size, not importance.
