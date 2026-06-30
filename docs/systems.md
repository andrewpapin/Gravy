# Subsystems

Deep reference for games, ranks, badges, icons, theming, time zone, deployment, versioning, and the
PWA update mechanism. CLAUDE.md links here; read the relevant section when touching those areas.

## Arcade (Games Hub)

User-facing label is "Arcade" (`GamesCard`'s title, `GamesScreen`'s header/aria-labels) — kept
distinct from the parent dashboard's "Game Settings" label so the two aren't confused; the
underlying component/file/prop names (`GamesCard`, `GamesScreen`, `onOpenGames`, `gamesOpen`,
`src/data/games.ts`, `completeGameRound`) are unchanged.

`GamesScreen` (opened from `HomeScreen`'s `GamesCard`) is a hub listing the catalog in
`src/data/games.ts` (`GAMES: GameDef[]` — currently Hangman, Math Facts, Word Scramble, Memory
Match; add a game by adding an entry there plus a component in `src/components/games/`). Each game
component calls `completeGameRound(gameId, won)` on finish. That action increments
`counters.gamesPlayed`/`gamesWon` and, on a win, awards `settings.gamePts` points — but only up to
`DAILY_GAME_WIN_CAP` (3, defined in `src/state/actions/shared.ts`, re-exported from `GravyContext`)
wins per day via `todayGameWins`, so a kid can't farm points by replaying an easy round; wins beyond
the cap still show a toast but pay no points. `todayGameWins` resets at day rollover.

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

## Badge System

71 unlockable badges defined in `src/data/badges.ts` across 7 groups (Food, Chores, Points, Streaks,
Store, Combos, Games), evaluated in `src/state/badges.ts`. Badges are triggered by:
- First-time events (`first_food`, `first_chore`, `first_reward`, `first_game`).
- Cumulative counter thresholds (`fruit:N`, `veggie:N`, `pts:N`, `pts_day:N`, `streak:N`,
  `chore_count:N`, `combo:N`, `games_won:N`, etc. — see the trigger-type comment atop `badges.ts`).

`findNewlyEarnedBadges()` is called after each state-mutating action in `GravyContext`. Parents can
override a badge's name/emoji/icon/visibility per-id via `badgeConfig` in state; `getBadgeDisplay()`
merges the override onto the `BADGE_MASTER` definition. `badgeConfig` (like `goals`/`rewards`) is a
shared field, mirrored across every profile in a household.

## Icon System

Every visual entity (`Goal`, `Reward`, `BadgeDef`/`BadgeOverride`, `Rank`, `GameDef`, `Food`) carries
**both** an `emoji` string (legacy fallback) and an `icon`/`iconKey` string. `src/data/icons.ts` is
the single source of truth mapping string keys to imported FontAwesome `IconDefinition`s —
FontAwesome tree-shakes, so any icon used anywhere must be explicitly imported and added to the
`ICONS` map there. `<AppIcon iconKey emojiFallback>` (`src/components/AppIcon.tsx`) renders the
FontAwesome icon for a known key, or falls back to the raw emoji string for unknown/absent keys —
keeping old synced data rendering correctly. When adding a new goal/reward/badge/game in code, set
`icon` to a real key from `icons.ts`. `IconPicker`/`ColorPicker` (`src/components/`) are the generic
tap-to-open grid pickers used wherever a parent customizes an icon (goals/rewards/badges) or a
profile's avatar icon and colors (`avatarIconColor`/`avatarBgColor`).

## Theming

`Settings.theme` is one of
`'capri' | 'classic' | 'midnight' | 'ocean' | 'bubblegum' | 'cyberpunk' | 'ranger'`
(renamed from the older `light`/`dark`/`rainbow`/`gold` — `migrateLegacyState()` falls back any
unrecognized saved value to `'capri'`), set per-profile via `ProfilesManager` and applied globally
for the active profile. `'capri'` is the base/default theme (its tokens live on the unmarked
`:root` in `src/index.css`); `'classic'` is the original default palette, demoted to a selectable
theme under `:root[data-theme="classic"]`. Theme CSS lives in `src/index.css`, keyed off
`[data-theme="..."]` on `<html>`.

Each theme defines two groups of color tokens: **decorative** (`--yellow`/`--cream`/`--sage`/
`--coral`/`--dark`/`--card`/`--bg`/`--text`/`--muted`) reused freely for accents, icon tints, and
the rank/streak banner; and **semantic** (`--success`/`--danger`), which always mean "done/correct"
and "alarming/destructive" respectively, in every theme. `--success`/`--danger` exist specifically
because `--sage`/`--coral` aren't reliably green/red across themes (e.g. `--sage` is purple in
Midnight, blue in Ocean) — using them for "done"/"danger" state CSS broke that signal when switching
themes. When adding a new "done"/"correct"/"earned" or "danger"/"destructive"/"error" UI state, use
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
what "today" is for streaks, badges, and the calendar, regardless of each device's clock.
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
