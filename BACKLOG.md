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
- **Rate-limit household-code lookups** against brute-force scanning (today
  nothing stops a scripted sweep of the ~32^6 code space). Not addressed by the
  RPC migration above — RPCs validate code *format*, not request *rate*.
  *(P1, S–M.)*
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
  `findNewlyEarnedBadges`/`getBadgeProgress`/`getBadgeDisplay`. Writing the
  rollover tests caught a real live bug in the process (see new entry below) —
  exactly the kind of regression this item was meant to guard against. *(P0, M.)*
- **Fix:** `applyDayRollover` only cleared `todayGoals` of ids that no longer
  matched a *current* daily goal, instead of clearing it outright. Once a daily
  goal's id had ever appeared in `todayGoals`, it stayed there forever across
  every future day rollover, which made `incrementGoal`'s "already awarded
  today" guard (`!next.todayGoals.includes(id)`) permanently true for that
  goal — so it silently stopped paying out points on day 2 onward while the UI
  (which checks `todayGoalCounts`, correctly reset daily) kept showing it as
  completable/done. Found and fixed while writing the day-rollover Vitest
  suite; `todayGoals` is now unconditionally cleared (`= []`) at rollover, same
  as `todayGoalCounts`. *(was silently shipped, now fixed)*
- ~~**Add a CI gate**~~ — **DONE.** `deploy.yml` now runs `npm run lint` then
  `npm test` before `npm run build`, so a lint or test failure blocks deploy.
  *(P0, S.)*
- **Harden error handling**: wrap `localStorage` writes in try/catch with a
  user-visible fallback for quota-exceeded or disabled storage (e.g. iOS private
  browsing), and validate the shape of incoming Supabase realtime payloads
  before trusting them. *(P1, M.)*
- ~~**Add an "update available" prompt** for the PWA.~~ — **DONE.**
  `registerType` switched to `'prompt'` and `src/components/UpdatePrompt.tsx`
  (using `virtual:pwa-register/react`'s `useRegisterSW()`) renders a dismissible
  bottom banner with a "Refresh" button when a new service worker is waiting,
  instead of silently auto-activating in the background until a cold relaunch.
- **Refactor `GravyContext.tsx`** (~1240 lines) — extract household/sync logic
  into its own hook/module before it grows further. Pure maintainability, no
  user-facing effect. *(P2, M.)*

## Epic 3 — Accessibility

- **Add aria-labels / semantic roles** to interactive tiles — many are
  `div`+`onClick` or unlabeled buttons across both kid and parent surfaces.
  *(P1, M.)*
- **Add focus trapping / return-focus** to modals and drawers (Calendar, Badge
  popup, Onboarding, PIN screen). *(P1, M.)*
- **Run a color-contrast pass** across all 5 themes (classic / midnight / ocean
  / bubblegum / cyberpunk) — likely WCAG AA failures in muted-text-on-card
  combinations, especially after prior ad-hoc contrast patches. *(P1, S.)*
- **Audit/raise minimum label font sizes** (some labels sit around ~10px).
  *(P2, S.)*

## Epic 4 — Game Balance & Content Debt

- **Resolve the rank point-curve**, explicitly called a placeholder in PR #90
  ("exact balance will be revisited later") — needs a real design pass now that
  the 24-tier ladder is live and kids are progressing through it. *(P1, M.)*
- **Lock the theme palette.** It was wholesale-replaced once already (4 themes →
  5 new ones in PR #80); avoid a second full swap without a clear signal that
  the current set isn't working. *(P2, decision only.)*
- **Re-check the total daily point ceiling** now that daily goals, bonus items,
  and 4 separately-capped games all award points — confirm the per-source caps
  compose into a sane daily maximum rather than just being capped in isolation.
  *(P1, S.)*

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

- **Triage every open/unmerged branch explicitly** (#92, #93 today) — don't
  let future work pile up unmerged and unresolved the way these two did.
- **Keep this `BACKLOG.md` living** — update priorities as items land instead
  of letting new PRs silently supersede old ones without a record.
- **Hold a short UI-stabilization window** while Epics 1–3 land: the parent
  dashboard was fully redesigned three times (PRs #71, #73, plus earlier passes)
  and the theme palette fully replaced once (PR #80) in recent history — high
  churn, low durability. Resist a fourth redesign or second palette swap until
  there's a concrete signal (user feedback, data) calling for it.

## Do these first (top 5, in order)

1. ~~Revive and merge PR #93 (PIN/recovery hashing + lockout).~~ **DONE** — merged as #97.
2. ~~Decide the fate of PR #92 (rank reorder)~~ — **DECIDED**: stays closed, won't merge (see Epic 1).
3. ~~Add the `npm run lint` CI gate to `deploy.yml`.~~ **DONE.**
4. ~~Stand up Vitest with tests for points/streak/badge logic.~~ **DONE** —
   also caught and fixed a live `todayGoals` rollover bug along the way (see Epic 2).
5. ~~Make an explicit access-control decision for Supabase~~ — **DONE**, see
   Epic 1: scoped mutations behind `SECURITY DEFINER` RPCs, SELECT left open
   for Realtime sync, accepted as the current risk posture for single/few-household scope.
