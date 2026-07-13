# Subsystems

Deep reference for games, ranks, icons, theming, time zone, deployment, versioning, and the
PWA update mechanism. CLAUDE.md links here; read the relevant section when touching those areas.

## Daily Game

The app has exactly one game — Roll to the Goal (`rollgoal`, dice icon 🎲) — reached by tapping
`GamesCard`'s home-screen "Daily" pill (sits in `HomeScreen`'s `QuickLinksRow` alongside
`StatsPill`/`PrizesPill`, see `docs/ui-surfaces.md`), which opens `DailyGameDrawer`
(`src/components/DailyGameDrawer.tsx`). `src/data/games.ts`'s `GAMES: GameDef[]` catalog still
exists as a single-entry array mainly so `getGamesBreakdown`/`GamesBreakdownSection`
(`docs/ui-surfaces.md`'s `RankScreen` stats charts) have a name/icon to key off.

`DailyGameDrawer` is built on the shared `Modal` component and has two local views (`'info' |
'play'`, default `'info'`) rather than a multi-game tile grid:

- **Info view** — the game blurb + today's target (`getDailyTarget(todayStr(timezone))`) + rounds
  remaining, a Play button, a "Today" stats block (rounds played/`ROLL_TO_GOAL_ROUNDS_PER_DAY`,
  `state.rollGoalDailyScore`, points earned today, and a per-round list from
  `state.rollGoalRoundsLog` — see below), and a "History" block (`getGamesBreakdown`'s
  aggregate played/won/win-rate tiles plus `getRollToGoalHistory` — `src/state/statsSnapshot.ts` —
  a recent-rounds list built from `actionLog`, same pattern as `getRewardsHistory`).
- **Play view** — renders `RollToTheGoalGame` (`src/components/games/RollToTheGoalGame.tsx`).
  Clicking Play is the only click needed to start playing: the component auto-rolls the round's
  first attempt on mount (and again immediately on "Next Round"), rather than landing on an idle
  "Roll" button.

Each round is **`ROLL_TO_GOAL_ATTEMPTS_PER_ROUND` (3) independent full re-rolls of all
`ROLL_TO_GOAL_DICE_COUNT` (10) dice** — no per-die holding. The system automatically keeps
whichever of the 3 attempts landed closest to the target (`evaluateAttempt`/`pickBestAttempt` in
`src/data/rollToGoal.ts`) as the round's result; a round only busts if every attempt exceeds the
target. `RollToTheGoalGame` reports whether a round is in progress (an attempt has been rolled,
not yet resolved) via `onRoundActiveChange`, and backing out (`Modal`'s back/close, which also
covers Escape/backdrop-click) while a round is active shows a "Leave the game? Your progress this
round will be lost." confirm instead of exiting immediately.

Roll to the Goal has its own independent 3-rounds/day structure (`rollGoalRoundsToday`,
`ROLL_TO_GOAL_ROUNDS_PER_DAY` in `src/data/rollToGoal.ts`) — every round is always eligible to pay
out, with no separate daily win cap. Its daily target number is `getDailyTarget(todayStr(timezone))`,
a deterministic (mulberry32-seeded) pure function of the day string rather than a persisted/synced
field, in the range `[ROLL_TO_GOAL_MIN_TARGET, ROLL_TO_GOAL_MAX_TARGET]` (33-48, scaled from the
same z-score band as the original 5-dice game so exact/near1/near2/far stay about as rare), so
every household device agrees on the same target with no Supabase merge logic involved.
Payout per round scales `settings.gamePts` by accuracy tier (`getRollToGoalPayout` in
`src/data/rollToGoal.ts`); the 0-500 number shown to the kid mid-game is a separate
bragging-rights score (`rollGoalDailyScore`, the "Final Daily Score"), not the real point award.
Dispatches via `completeRollToGoalRound`/`declineRollToGoalRound` in `useKidProgressActions.ts`,
and its own `'rollgoal'` `PendingPointsKind` with its own decline handler.

Every completed round (including busts) is also appended to `state.rollGoalRoundsLog` —
`{ round, tier, total, displayScore, pts, pending, at }` — reset alongside `rollGoalRoundsToday`/
`rollGoalDailyScore` at day rollover. Unlike `actionLog` (which only logs a round when it pays
real points), this is a complete per-day record, feeding the Info view's per-round "Today" list.

## Rank Ladder

`src/data/ranks.ts` defines `RANKS: Rank[]`, a 24-tier ladder (`Noob` → `Sonic Snail`) keyed by
`totalPoints` thresholds (`min`/`max`) — gaps grow by 250 per rank transition (250, 500, 750, …),
topping out at 69,000 for max rank, calibrated so a consistently-engaged kid (~150-200 pts/day)
reaches max rank in roughly a school year (see `BACKLOG.md` Epic 4). `getRank(pts)` returns the
current tier; `useTodaySnapshot()` (`src/state/useTodaySnapshot.ts`) derives the rank, XP-to-next
text/percent, and today's food/goal completion — shared by the kid-facing `StatsCard` and the parent
dashboard's day-snapshot displays. `RankScreen` is the kid-facing drawer listing every rank with
locked/current/achieved state and a progress bar. Its modal body opens with a "Your Stats" summary
row (`.rank-stats-summary`/`.rank-stats-chip`) — food streak, goal streak (when daily goals exist),
day streak, and mega streak (`state.foodStreak`/`goalStreak`/`streak`/`megaStreak`) — before the
rank list. `StatsCard` shows only the rank icon/name/XP bar plus the conditional streak-at-risk
nudge; the (i) info button (`onOpenRank`) is the only entry point to these stats.

## Icon System

Every visual entity (`Goal`, `Reward`, `Rank`, `GameDef`, `Food`) carries
**both** an `emoji` string (legacy fallback) and an `icon`/`iconKey` string. `src/data/icons.ts` is
the single source of truth mapping string keys to imported FontAwesome `IconDefinition`s —
FontAwesome tree-shakes, so any icon used anywhere must be explicitly imported and added to the
`ICONS` map there. `<AppIcon iconKey emojiFallback>` (`src/components/AppIcon.tsx`) renders the
FontAwesome icon for a known key, or falls back to the raw emoji string for unknown/absent keys —
keeping old synced data rendering correctly. When adding a new goal/reward/game in code, set
`icon` to a real key from `icons.ts`. `IconPicker`/`ColorPicker` (`src/components/`) are the generic
tap-to-open grid pickers used wherever a parent customizes an icon (goals/rewards) or a
profile's avatar icon and colors (`avatarIconColor`/`avatarBgColor`).

## Theming

`Settings.theme` is one of `'capri' | 'classic' | 'twopointoh'` (renamed from the older
`light`/`dark`/`rainbow`/`gold` — `migrateLegacyState()` falls back any unrecognized saved value to
`'capri'`; the set was later trimmed from seven themes down to these three), set per-profile via
`ProfilesManager` and applied globally for the active profile. `'capri'` is the base/default theme
(its tokens live on the unmarked `:root` in `src/index.css`); `'classic'` is the original default
palette, demoted to a selectable theme under `:root[data-theme="classic"]`; `'twopointoh'`
("2.0") is a black-and-white-forward theme whose only saturated color lives on the three
quick-links pills (Sunshine Orange/Skyblue Azure/Morning Yellow). Theme CSS lives in
`src/index.css`, keyed off `[data-theme="..."]` on `<html>`.

Each theme defines two groups of color tokens: **decorative** (`--yellow`/`--cream`/`--sage`/
`--coral`/`--teal`/`--dark`/`--card`/`--bg`/`--text`/`--muted`) reused freely for accents, icon tints, and
the rank/streak banner (`--teal` is a narrower exception — currently used only by the Stats quick-links
pill, to avoid it duplicating `--coral`'s use on the rank-avatar circle directly below it); and **semantic** (`--success`/`--danger`), which always mean "done/correct"
and "alarming/destructive" respectively, in every theme. `--success`/`--danger` exist specifically
because `--sage`/`--coral` aren't reliably green/red across themes (e.g. `--sage` is Sunshine Orange
in `twopointoh`) — using them for "done"/"danger" state CSS broke that signal when switching themes.
When adding a new "done"/"correct"/"earned" or "danger"/"destructive"/"error" UI state, use
`var(--success)`/`var(--danger)`, not `var(--sage)`/`var(--coral)` directly — reserve the latter for
purely decorative use (icon tints, banners, accents) where hue consistency with green/red doesn't
matter.

## Time Zone

`Settings.timezone` is a single household-wide IANA zone id (e.g. `'America/New_York'`), defaulting
to `DEFAULT_TIMEZONE` (`'America/New_York'`, `src/data/timezones.ts`) and listed in
`SHARED_SETTING_KEYS` (`defaultState.ts`) — accounts don't support per-profile zones (one household,
one time zone). A parent changes it via `TimezonePanel` (`src/components/parent/TimezonePanel.tsx`,
the first panel in `SettingsPanel`), a grouped-by-region `<select>` (the app's first native HTML
select, since the ~400-entry IANA list is too large for the grid-style pickers) populated from
`TIMEZONES` in `src/data/timezones.ts` (`Intl.supportedValuesOf('timeZone')`, with a small static
`FALLBACK_TIMEZONES` for older runtimes).

This setting is what "today" means for the whole household, not each device's own clock.
`todayStr(timezone)` (`src/state/defaultState.ts`) computes the current date string via
`Intl.DateTimeFormat` scoped to the given zone, instead of reading device/process-local `Date`
fields — so `applyDayRollover()` and `backfillStreaksFromLogs()` take/derive their zone from
`state.settings.timezone` and walk dates with a UTC-anchored `addDaysToDateStr()` helper, never
local-`Date` mutation. The effect: every device in a household agrees on when a day rolls over and
what "today" is for streaks and the calendar, regardless of each device's clock.
`isValidTimezone()` (`src/data/timezones.ts`) guards both `saveSetting()` (so a bad value is never
written) and `sanitizeState()`/`hydrateState()` (so a corrupt or pre-feature save falls back to the
default rather than throwing inside `Intl.DateTimeFormat`).

## Deployment

GitHub Actions (`.github/workflows/deploy.yml`) builds and deploys to GitHub Pages on push to
`main`. The Vite `base` is `/Gravy/`. The checkout step uses `fetch-depth: 0` (full history) so the
version computation below has commit messages to search.

The Capacitor native wrap (Epic 10 spike) reuses this same build but needs a **root-relative**
base, since a native WebView serves `dist/` from `/` rather than the Pages sub-path. `npm run
build:native` (`vite build --mode capacitor`) selects `base: '/'`; see `docs/capacitor.md` for the
full native build/sync workflow.

## Version Display

`vite.config.ts` computes a version string at build time and injects it via the `__APP_VERSION__`
define: `APP_VERSION_BASE` (currently `'1.1'`, bumped manually for breaking/major UI changes) plus
the most recent PR number found by scanning `git log -50 --pretty=%s` for a `#<digits>` pattern
(matches both merge-commit titles like `Merge pull request #109 from ...` and squash-merge titles
like `Title (#102)`) — falls back to `0` if none is found. `src/version.ts` declares the
`__APP_VERSION__` ambient global and re-exports it as `APP_VERSION`; `AccountMenu.tsx` renders it
(`v1.1.109`-style) in a small footer below the menu options. This number is display/debugging only —
it doesn't drive `migrateLegacyState()` or any other app logic, and it isn't related to the
persisted-state `version: 2` field in `GravyRoot`.

## PWA Update Mechanism

`vite-plugin-pwa` (configured in `vite.config.ts`, `registerType: 'prompt'`) generates a Workbox
service worker that precaches the build's hashed JS/CSS plus `index.html`, so a fresh deploy always
ships under new asset URLs. `UpdatePrompt.tsx` drives when that new service worker is detected and
applied: it checks for updates on a `UPDATE_CHECK_INTERVAL_MS` (60s) interval while the app is open,
and again on every `visibilitychange` to `'visible'` — covering a backgrounded PWA being reopened,
not just a cold load. As soon as an update is found it calls `updateServiceWorker(true)` immediately
(no button, no dismiss) and reloads, showing a brief non-interactive "Updating…" status. This is a
deliberate tradeoff for a rapid-beta-testing phase — favoring "no one is stuck on a stale build" over
interruption-free UX. The service worker only runs against production builds (`npm run build && npm
run preview`); `npm run dev` doesn't register it since `devOptions.enabled` isn't set in
`vite.config.ts`.

## Release Notes Drawer

`src/data/releaseNotes.ts` holds `RELEASE_NOTES`, a hand-maintained list of `{ version, note,
prNumber, at }` entries — one plain-language bullet, the GitHub PR number that shipped it, and an
ISO 8601 merge timestamp, per user-facing change worth announcing. `version` is a manually-bumped
integer local to this feature (append a new entry with `version` one higher than the current last
entry, `prNumber` set to the PR's number, and `at` set to the merge time, whenever a PR ships
something worth telling users about — see the "Git & PR workflow" step in `CLAUDE.md`); `version`
is intentionally unrelated to the auto-derived `__APP_VERSION__` build string above. The pure logic
(`getUnseenReleaseNotes`/`getLatestReleaseNoteVersion`/`getAllReleaseNotesSorted`, tested in
`src/state/releaseNotes.test.ts`) lives in `src/state/releaseNotes.ts`. Both drawer components
render `at` via `new Date(n.at).toLocaleString()`.

Two components consume this data, for two different purposes:

- **`ReleaseNotesDrawer.tsx`** — the auto-popup "What's New". Reads the last-seen version from
  `localStorage` (`gravy_release_notes_seen`) on mount, shows a drawer listing any notes newer than
  it (newest first) via `getUnseenReleaseNotes`, and immediately records the latest version as seen
  — so a shown drawer won't reappear next load. A `null` last-seen value (brand-new install, or an
  existing install from before this feature shipped) is treated as nothing-to-announce, so it
  bootstraps silently instead of dumping the whole history. Since `UpdatePrompt` auto-reloads on
  every deploy (see above) and each merge to `main` changes `__APP_VERSION__`, in practice this
  drawer surfaces once per meaningful release: the reload after a deploy is what makes "loads with a
  new version" and "a PR merged to main" the same event from the client's point of view. Mounted
  last in `AppShell` (`App.tsx`) and given `overlayClassName="release-notes-overlay"` (z-index 1200)
  so it always stacks above the cloud-sync gate (`SyncGateModal`, z-index 1100) rather than getting
  silently buried behind it.
- **`ReleaseNotesHistoryDrawer.tsx`** — an on-demand full history, reached via the "Release Notes"
  link next to the version number in the Grown-Up Menu (`AccountMenu.tsx`). Lists every entry in
  `RELEASE_NOTES` (via `getAllReleaseNotesSorted`, newest first, scrollable), each linking to
  `github.com/andrewpapin/gravy/pull/{prNumber}`. Unlike `ReleaseNotesDrawer`, it has no "seen"
  side effect — it's a plain browsing view, wired into `AppShell` the same way as
  `CalendarDrawer`/`AdvancedSettingsDrawer` (`open`/`onClose`/`onBack` props, lazy-loaded).

## First-Run Guided Tour

`src/components/tour/` — a spotlight/coachmark walkthrough that points at real home-screen
elements, mounted from `AppShell` on top of the already-live `HomeScreen` once `Onboarding`
completes (not part of `Onboarding` itself; see `docs/ui-surfaces.md` for the full onboarding flow).
Runs once per device across every onboarding path, gated by `HOME_TOUR_DONE_KEY =
'gravy_home_tour_done'` (`src/state/defaultState.ts`), set on both finishing and skipping, and
bypassed retroactively for installs that already had saved progress before this feature shipped
(same `alreadyHadProgress` check `ONBOARDING_DONE_KEY` uses).

- **Targeting**: elements carry a `data-tour-id` attribute (`GamesCard`, `StatsPill`, `PrizesPill`,
  `TopBar`'s hamburger button; `CollapsibleCard` takes an optional `tourId` prop for `FoodTray`/
  `DailyGoals`, since it always renders a fixed wrapper div with no other passthrough).
  `src/data/tourSteps.ts`'s `TOUR_STEPS` maps each step to a `targetId` (or `null` for the
  centered opening slide), an icon, a title, and a `desc(householdCode)` — the last step reads the
  live household code from context, folding in what used to be a dedicated post-creation
  code-reveal screen.
- **`Spotlight`** (`src/components/tour/Spotlight.tsx`) is the dependency-free cutout: a
  `position: fixed` div sized to the target's `getBoundingClientRect()` with a huge spread
  `box-shadow: 0 0 0 9999px rgba(...)` that dims everything else; with no target, it dims the whole
  screen instead (no SVG mask, no library).
- **`HomeTour`** (`src/components/tour/HomeTour.tsx`) measures the current step's target on mount
  and on window resize / `.scroll-area` scroll, `scrollIntoView`s it before re-measuring, and
  renders the callout above or below the target (`placement.ts`'s `placementFor`, kept in its own
  module since a file exporting both a component and a plain function breaks fast refresh).
- **`FirstKidPrompt`** (`src/components/tour/FirstKidPrompt.tsx`) is a separate, New-Family-only
  overlay that runs *before* `HomeTour` (gated by `Onboarding`'s `onComplete({ isNewFamily })`
  result, not a `HOME_TOUR_DONE_KEY`-style flag of its own) — see `docs/ui-surfaces.md`.
