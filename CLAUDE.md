# CLAUDE.md

Guidance for Claude Code working in this repo. This file is loaded every session, so it's kept
lean: terse pointers here, deep reference in `docs/` (read those only when working in that area).

## Commands

```bash
npm run dev       # Start dev server at http://localhost:5173
npm run build     # Type-check (tsc -b) then bundle to ./dist
npm run lint      # Run ESLint
npm run preview   # Serve ./dist locally
npm test          # Run Vitest unit tests (src/**/*.test.ts)
```

`npm run lint`, `npm test`, and `npm run build` are all required to merge into `main` — `ci.yml`
runs all three as a required PR status check, and `deploy.yml` re-runs them after merge before
deploying from `main`. Run all three before considering a change finished.

## Testing

Vitest covers the pure point/streak logic: `src/state/points.ts` (award/forgiveness/exact-undo
arithmetic), `src/state/defaultState.ts` (`applyDayRollover`, `backfillStreaksFromLogs`),
`src/state/auth.ts` (`normalizeHouseholdStatus`), and `src/state/merge.ts` (`mergeRoots`/`mergeStates`, the
collection/record-level cloud-sync merge). Colocated `*.test.ts` files live next to the module they
test. There
is no component/UI test setup — `verify_gravy.mjs` at the repo root is an ad-hoc Playwright
smoke-test (not wired into `npm`) that drives the app in a headless browser against a running
`npm run dev`; run it manually with `node verify_gravy.mjs` if you need a scripted UI walkthrough.

See `BACKLOG.md` for the living backlog of **open** items (security, infra, accessibility, process
gaps) — check it before assuming a known gap (e.g. the open-SELECT RLS policy on `households`) is
unintentional or unreported. Completed/decided items are condensed to one-liners in `BACKLOG_DONE.md`
(the decision record — the "why" behind shipped work); epic numbers are stable across both files, so
`BACKLOG.md` has numbering gaps where fully-done epics live only in `BACKLOG_DONE.md`.

## Keeping tests and docs in sync

- **New/changed logic in `src/state/*.ts`** (points, streaks, day rollover, any pure state
  logic) needs matching coverage in its colocated `*.test.ts`. If the logic is still tangled inside a
  `GravyContext` action hook (side effects mixed with arithmetic), extract the pure part into
  `src/state/*.ts` first, the way `points.ts` was pulled out — that's the established pattern.
- **Architecture or behavior changes** (new screens, shared/per-profile fields, panels, data flow)
  need the relevant pointer in this file **and** the matching `docs/` file updated in the same
  change — both are read to understand the system, so stale text misleads future work.
- **Closing/opening a tracked gap** needs the backlog updated: a done/decided item **moves out of
  `BACKLOG.md` into `BACKLOG_DONE.md` as a one-liner** (what + outcome + key file/PR/migration, under
  the same epic heading); a new gap gets an entry in `BACKLOG.md`, following the existing format.
- **Anything found but not addressed in the current PR** (a bug, gap, or improvement spotted
  in passing that's out of scope for the change at hand) gets automatically added to
  `BACKLOG.md` in the same PR, following the existing format — don't just mention it in
  conversation or a PR comment and let it evaporate.

## Git & PR workflow

`main` only accepts changes through a PR (`ci.yml` gates lint/test/build). Once a change is
committed, pushed to the session's branch, and verified — `lint`/`test`/`build` green, plus a
manual browser check for UI changes — open the pull request proactively; don't wait to be asked.
Merging is a separate step and still needs explicit confirmation before it happens.

If the PR ships a user-facing change, add a `RELEASE_NOTES` entry (`src/data/releaseNotes.ts`) —
bump `version` one higher than the current last entry, write a single plain-language bullet, set
`prNumber` to this PR's number, and set `at` to an ISO 8601 timestamp (approximate is fine at
authoring time — the merge time isn't known yet — but true it up to the actual merge commit time,
e.g. via `git log -1 --format=%cI <merge-commit-sha>`, once merged if it drifted). GitHub assigns
the PR number as soon as the PR is opened, so this is a follow-up commit pushed to the same branch
after opening the PR, before it merges.

## Architecture

Gravy is a gamified chores + nutrition + rewards PWA for kids: React 19 + TypeScript + Vite,
client-side-only SPA (no server/API). Data persists to `localStorage` with optional Supabase cloud
sync. Entry point: `index.html` → `src/main.tsx` → `src/App.tsx`. There is no router — every screen
beyond `HomeScreen` is an overlay drawer/modal toggled by boolean state in `AppShell`.

All state flows through one React Context (`src/state/GravyContext.tsx`), consumed via `useGravy()`.
It owns the multi-profile `GravyRoot`, the active profile's `GravyState`, local persistence/theme/
day-rollover effects, and celebrations. There is no toast/notification system — see
`docs/state-model.md`. The cloud-sync + parent-account
reactive layer (household code/status, Supabase realtime push/subscribe, auth tracking) lives in its
own `src/state/useHouseholdSync.ts` hook. The provider's imperative actions are split into
per-domain custom hooks under `src/state/actions/` (kid-progress, day-edit, rewards, catalog,
profile, household); the pure point arithmetic lives in `src/state/points.ts`. Persisted shapes are
in `src/state/types.ts`.

> **`README.md`** is a user-facing overview; this file is authoritative for architecture. Update the
> README too if you touch the areas it describes.

## Subsystem pointers

Deep detail lives in `docs/`. Read the linked file when working in that area.

- **State model** (`docs/state-model.md`) — `GravyContext` global state and the
  `src/state/actions/` hook layout; multi-kid Profiles (shared vs per-kid fields,
  `mirrorSharedFields`, `switchProfile`/`addProfile`); Key State Concepts (goals: daily/bonus/
  multi-step; the four streaks; `applyDayRollover`; counters; pending rewards; past-day editing via
  `*ForDay` actions + `dayLogs`; read-only kid history view via `viewedDate`/`CalendarGrid`).
- **Persistence & sync** (`docs/persistence-and-sync.md`) — `localStorage` (`STORAGE_KEY`
  `gravy_v1`); Supabase `households`/`household_members` tables; `SECURITY DEFINER` RPCs +
  rate-limiting in `supabase/migrations/`; the account-mandatory ownership model (every household
  is claimed at creation); `safe*` storage wrappers; Parent Accounts (`src/state/auth.ts`) —
  there's no PIN; `isGrownUpUnlocked` (also in `src/state/auth.ts`) is the sole access gate,
  derived from the signed-in account and its household membership.
- **UI surfaces** (`docs/ui-surfaces.md`) — kid view + `AccountMenu` (the single `grownUpUnlocked`
  lock gating Approvals/Profiles/Game Settings/Calendar/Advanced Settings, now account-based
  via `SignInPrompt` rather than PIN-based); the "Game Settings" dashboard (`ParentDashboard`
  component, formerly labeled "Grown ups") two-level router and its 5 first-level panels
  (`GoalsPanel` — taking a `filter: 'daily'|'bonus'` prop — plus `PointsPanel`/`StorePanel`/
  `ArcadePanel`, each its own `RootMenu` destination); `ApprovalsPanel`/`CalendarPanel` reached
  directly from
  `AccountMenu` via `ApprovalsDrawer`/`CalendarDrawer`, plus `SettingsPanel` (including the nested
  `LogPanel`) reached via `AdvancedSettingsDrawer`; `Onboarding`'s three-button fork (New Family /
  Existing Parent / Existing Kid), including New Family's pending-email-confirmation screen and
  Existing Parent's auto-attach-by-account (falling back to manual code entry); the post-onboarding
  `FirstKidPrompt` + spotlight `HomeTour` (`src/components/tour/`), mounted on top of the live
  `HomeScreen` rather than as part of `Onboarding`.
- **Subsystems** (`docs/systems.md`) — Arcade/games hub (`src/data/games.ts`, `completeGameRound`,
  `DAILY_GAME_WIN_CAP`); Rank ladder (`src/data/ranks.ts`, `getRank`, `useTodaySnapshot`); Icon system (`src/data/icons.ts`,
  `AppIcon`); Theming (`Settings.theme`, `src/index.css`); Time zone (`Settings.timezone`,
  `todayStr`, `src/data/timezones.ts`); Deployment (`deploy.yml`); Version display
  (`__APP_VERSION__`); PWA update (`UpdatePrompt.tsx`, `vite-plugin-pwa`); Release notes
  (`src/data/releaseNotes.ts`, `src/state/releaseNotes.ts`) — the auto-popup `ReleaseNotesDrawer.tsx`
  ("what's new since last seen") plus the on-demand `ReleaseNotesHistoryDrawer.tsx` (full history,
  reached from the Grown-Up Menu next to the version number); First-run guided tour
  (`src/components/tour/`, `src/data/tourSteps.ts`, `HOME_TOUR_DONE_KEY`).
- **Native wrap** (`docs/capacitor.md`) — Capacitor packaging spike (Epic 10): `capacitor.config.ts`,
  the `--mode capacitor` root-relative build (`npm run build:native`/`cap:sync`), and why
  `ios/`/`android/` are gitignored. Read before touching the native build path.

See also `DATA_HANDLING.md` for what's collected/stored/deletable (COPPA notes).
