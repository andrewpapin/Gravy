# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server at http://localhost:5173
npm run build     # Type-check (tsc -b) then bundle to ./dist
npm run lint      # Run ESLint
npm run preview   # Serve ./dist locally
```

There is **no test framework configured** (no Jest/Vitest/`npm test`, no `npm run` script for Playwright despite it being a devDependency). `verify_gravy.mjs` at the repo root is an ad-hoc Playwright smoke-test script (not wired into `npm`) that drives the app in a headless browser against a running `npm run dev` server and screenshots each step to `/tmp`. Run it manually with `node verify_gravy.mjs` only if you need to script a UI walkthrough — otherwise testing is manual via the browser.

See `BACKLOG.md` for a living backlog (security, infra, accessibility, process gaps) written from an audit of the codebase and PR history — check it before assuming a known gap (e.g. plaintext PIN storage) is unintentional or unreported.

## Architecture Overview

Gravy is a gamified chores + nutrition + rewards PWA for kids built with React 19, TypeScript, and Vite. It is a client-side-only SPA — no server, no API. Data persists to `localStorage` with optional cloud sync via Supabase. The real entry point is `index.html` → `src/main.tsx` → `src/App.tsx`.

> **Ignore `gravy.html`** at the repo root — it's an old static single-file prototype (inline CSS, dark/gold theme) from before the Vite rewrite. It isn't referenced by any build config or script and isn't part of the live app; don't edit it expecting it to affect the running app.

> **`README.md` is stale** — it predates multi-profile support, the Games hub, the rank ladder, and the current theme names/badge count. Treat this CLAUDE.md as authoritative over the README for architecture; update the README too if you touch any of the areas it describes.

### Two User Surfaces

Both surfaces are reached as overlay drawers/modals from `HomeScreen` (`src/App.tsx` `AppShell`); there is no router, just boolean open/close state per drawer.

- **Kid view** (`src/components/`) — `HomeScreen` (rank/streak/badge stats card, Games hub card, food tray, daily goals, bonus items) plus drawers for the reward store, badges, games, and the rank ladder. Tapping the avatar icon in `TopBar` opens **`AccountMenu`**, a menu with up to four destinations:
  - **Reward Store** — no PIN.
  - **Switch Profile** — PIN-gated; only shown when there's more than one profile. Opens `ProfileSwitcher`, a read-only quick-switch list (tap a profile → `switchProfile(id)`).
  - **Grown ups** — PIN-gated. Gates `ParentDashboard` behind `PinScreen`.
  - **Profiles** — PIN-gated. Opens `ProfilesManager`, full CRUD for kid profiles (add/edit name, avatar icon+colors, theme; delete with confirm; never deletes the last profile).

  There is no longer a no-PIN "kid settings" screen — theme and child name, which used to live in a standalone `SettingsScreen`, are now per-profile fields edited through the PIN-gated `ProfilesManager`.

- **Parent dashboard** (`src/components/parent/`) — `ParentDashboard` is a two-level router: a local `root` state (`'menu' | 'approvals' | 'goals' | 'calendar' | 'store' | 'badges' | 'settings'`). At `'menu'` it renders `RootMenu` (a card list, not tabs); picking a card drills into one panel with a back button that restores the menu:
  - `ApprovalsPanel` — approve/decline pending reward requests.
  - `GoalsPanel` — goal/bonus-item CRUD, and (nested at the bottom of this same panel) `PointsPanel` for the per-action point values (`foodPts`, `bonusPts`, `gamePts`).
  - `CalendarPanel` — view/edit past days.
  - `StorePanel` — reward CRUD.
  - `BadgesPanel` — customize badge name/emoji/icon/visibility.
  - `SettingsPanel` — a thin composer that just renders `SecurityPanel` (PIN + recovery Q&A) + `SyncPanel` (household code create/join/change/leave) + `DangerZonePanel` (reset today / reset everything) in sequence.

### Global State

All state flows through a single React Context defined in `src/state/GravyContext.tsx`. Components consume it via `useGravy()`. The context owns:

- The `GravyRoot` object (multi-profile container; see Profiles below) and the active profile's `GravyState` (see `src/state/types.ts` for full shapes)
- Auto-save to `localStorage` on every state/root change (a plain `useEffect`)
- Supabase sync (`src/state/sync.ts`) — debounced 800ms push to avoid spamming on rapid taps; incoming `postgres_changes` events are skipped if they match the last value this client itself pushed (`lastSyncedRef`), since conflict resolution is otherwise last-write-wins. The synced payload is the **whole household root** (every profile + shared config), not just one kid.
- Theme application via `useLayoutEffect` (sets `document.documentElement.dataset.theme` and the `<meta theme-color>` tag before paint, avoiding a flash of the wrong theme)
- Day-rollover re-check on `visibilitychange`, applied to **every** profile (not just the active one), so a kid not opened in days still has correct streaks/cleared "today" state when picked
- Toast notifications with optional undo actions, celebration/confetti triggers, badge-earned detection — all run after each state-mutating action

### Profiles (multi-kid households)

The persisted shape is `GravyRoot` (`{ version: 2, activeProfileId, profiles: ProfileEntry[] }`), not a bare `GravyState` — `src/state/types.ts`. Each `ProfileEntry` (`{ id, state }`) holds a complete, independent `GravyState` for one kid. `loadRoot()`/`saveRoot()` in `src/state/defaultState.ts` handle persistence; `loadRoot()` also migrates a legacy flat single-profile save (pre-multi-profile) by wrapping it as a one-entry root.

- **Shared vs. per-kid fields** — `goals`, `rewards`, `badgeConfig`, and a subset of `settings` (`SHARED_SETTING_KEYS`: `foodPts`, `bonusPts`, `gamePts`, `pin`, `recoveryQuestion`, `recoveryAnswer`) are identical across every profile in a household. Per-kid fields are everything else: progress (points, streaks, counters, logs) plus identity (`childName`, `avatarIcon`, `avatarIconColor`, `avatarBgColor`, `theme`).
- `mirrorSharedFields(root)` copies the shared fields from the **active** profile onto every other profile after any edit — the active profile is where all parent config changes happen, so it's the source of truth for shared config at any moment.
- `switchProfile(id)` folds the live `state` back into `root` (via `mirrorSharedFields`), then makes `id` active and runs `applyDayRollover()` on its state (it may not have been opened today).
- `addProfile(name, opts)` calls `makeNewProfile()`, which clones `defaultState`, copies in the current shared config, and sets the new kid's identity — so a new sibling starts with zero progress but the same goals/rewards/points config/PIN.
- The context exposes per-profile actions distinct from the active-profile ones: `profiles: ProfileSummary[]` (id/name/avatar/theme/points for every kid, for rendering switcher/manager lists), `switchProfile`, `addProfile`, `updateProfile(id, patch)`, `deleteProfile(id)` (refuses to delete the last profile).

### Key State Concepts

- **Goals** — chores assigned to the child (formerly called "chores"; `migrateLegacyState()` in `src/state/defaultState.ts` renames old keys/fields on load, including the `choreIds` → `goalIds` rename inside `dayLogs`). A goal can be:
  - **Daily** (`isDaily !== false`, the default) — resets each day, shown under "Daily Goals" (`DailyGoals.tsx`)
  - **Bonus item** (`isDaily: false`) — repeatable any number of times per day (not a one-time toggle — there is no more "Other Goals" one-time-completion concept), shown under "Bonus Points" (`BonusPoints.tsx`). `pts` may be negative (a deduction, e.g. "Swear Jar"). `target` is unused for bonus items.
  - **Multi-step** (`target > 1`, Daily goals only) — must be incremented/decremented `target` times via `incrementGoal`/`decrementGoal` before it counts as done
- **Streaks** — there are four independent counters, not one: `streak` (general daily-activity streak, used for badges/UI), `foodStreak` (consecutive full-tray days), `goalStreak` (consecutive all-daily-goals-done days), `megaStreak` (consecutive days that hit both). All four are recomputed in `applyDayRollover()` (`src/state/defaultState.ts`) when the day changes; `streak` only extends if the closed-out day had real logged activity, otherwise it resets to 0. `backfillStreaksFromLogs()` seeds `foodStreak`/`goalStreak`/`megaStreak` by replaying `dayLogs` for saves written before these fields existed, so upgrading the app doesn't reset an in-progress streak.
- **Day rollover** — `applyDayRollover()` archives yesterday's food counts/completed goals/bonus-item counts into `dayLogs[dateStr]`, updates the four streaks, then clears the live `today*` fields (food, daily-goal completions/counts, bonus-item ledger, and `todayGameWins`) for the new day. Bonus-item completions, like daily goals, reset every day.
- **Counters** (`GravyState.counters`) — lifetime aggregates used for badge progress: `foodLogs` (per food-group log count), `fullTrayDays`, `totalGoals`, `allGoalsDays`, `comboDays` (full tray + all daily goals same day), `totalRewards`, `maxDayPoints`, `gamesPlayed`, `gamesWon`.
- **Pending rewards** — kids request rewards via `requestReward` (which reserves points already promised to other pending requests so a kid can't queue more requests than their balance covers); they sit in `pendingRewards` until a parent calls `approveReward`/`declineReward` from `ApprovalsPanel`.
- **Editing past days** — the Calendar lives in the PIN-gated parent dashboard (`CalendarPanel`), not in the kid-facing UI, since past-day edits affect real points. Picking a day renders `FoodTray`/`DailyGoals`/`BonusPoints` with a `dateStr` prop; when it's not today they read/write that day's log via `getDayLog()` (`src/state/dayLog.ts`) and the `*ForDay` actions (`logFoodForDay`/`removeFoodForDay`/`toggleGoalForDay`/`logBonusItemForDay`/`undoBonusItemForDay`), which mutate `dayLogs[dateStr]` directly (today's edits use the separate `logFood`/`incrementGoal`/`logBonusItem` actions that mutate the live `today*` fields instead). The `*ForDay` actions are full point-parity with their "today" counterparts: they award/remove points via `awardPointsForDay` (the day-scoped mirror of `awardPoints`) which moves `next.points`/`next.totalPoints` in lockstep with `log.points`, run `maybeCelebrateRankUp()` and `checkBadges()` (so rank-ups and badge unlocks still fire), and apply the same unfloored exact-inverse arithmetic and bonus-item forgiveness/exact-undo tracking (`DayLog.bonusApplied`) as today's actions — so editing a past day changes the live balance exactly as if it were edited today. The one thing intentionally *not* ported is the food/goal-specific full-screen celebration overlays (`'Full Tray!'`, `'All Goals Done!'`) — those are kid-engagement flourishes for live play, not needed in this parent admin tool, so a toast covers the same bonus-point award on past days instead. Multi-step goals (`target > 1`) only track step counts for today — past days only store goal completion as a boolean (`goalIds` membership), so `DailyGoals` renders past-day multi-step goals as a simple toggle tile rather than a stepper.

### Games Hub

`GamesScreen` (opened from `HomeScreen`'s `GamesCard`) is a hub listing the catalog in `src/data/games.ts` (`GAMES: GameDef[]` — currently Hangman, Math Facts, Word Scramble, Memory Match; add a game by adding an entry there plus a component in `src/components/games/`). Each game component calls `completeGameRound(gameId, won)` on finish. That action increments `counters.gamesPlayed`/`gamesWon` and, on a win, awards `settings.gamePts` points — but only up to `DAILY_GAME_WIN_CAP` (3, defined in `GravyContext.tsx`) wins per day via `todayGameWins`, so a kid can't farm points by replaying an easy round; wins beyond the cap still show a toast but pay no points. `todayGameWins` resets at day rollover like other "today" fields.

### Rank Ladder

`src/data/ranks.ts` defines `RANKS: Rank[]`, a 24-tier ladder (`Noob` → `Sonic Snail`) keyed by `totalPoints` thresholds (`min`/`max`). `getRank(pts)` returns the current tier; `useTodaySnapshot()` (`src/state/useTodaySnapshot.ts`) derives the rank, XP-to-next-rank text/percent, and today's food/goal completion — shared by the kid-facing `StatsCard` and used as the basis for the parent dashboard's day-snapshot displays. `RankScreen` is the kid-facing drawer listing every rank with locked/current/achieved state and a progress bar.

### Badge System

65 unlockable badges defined in `src/data/badges.ts` across 7 groups (Food, Chores, Points, Streaks, Store, Combos, Games), evaluated in `src/state/badges.ts`. Badges are triggered by:
- First-time events (`first_food`, `first_chore`, `first_reward`, `first_game`)
- Cumulative counter thresholds (`fruit:N`, `veggie:N`, `pts:N`, `pts_day:N`, `streak:N`, `chore_count:N`, `combo:N`, `games_won:N`, etc. — see the trigger-type comment atop `badges.ts`)

`findNewlyEarnedBadges()` is called after each state-mutating action in `GravyContext`. Parents can override a badge's name/emoji/icon/visibility per-id via `badgeConfig` in state; `getBadgeDisplay()` merges the override onto the `BADGE_MASTER` definition. `badgeConfig` (like `goals`/`rewards`) is a shared field, mirrored across every profile in a household.

### Icon System

Every visual entity (`Goal`, `Reward`, `BadgeDef`/`BadgeOverride`, `Rank`, `GameDef`, `Food`) carries **both** an `emoji` string (legacy fallback) and an `icon`/`iconKey` string. `src/data/icons.ts` is the single source of truth mapping string keys to imported FontAwesome `IconDefinition`s — FontAwesome tree-shakes, so any icon used anywhere in the app must be explicitly imported and added to the `ICONS` map there. `<AppIcon iconKey emojiFallback>` (`src/components/AppIcon.tsx`) renders the FontAwesome icon for a known key, or falls back to the raw emoji string for unknown/absent keys — this keeps old synced data (created before the icon system, or by another device's older build) rendering correctly. When adding a new goal/reward/badge/game in code, set `icon` to a real key from `icons.ts` rather than relying on the emoji fallback. `IconPicker`/`ColorPicker` (`src/components/`) are the generic, reusable tap-to-open grid pickers used wherever a parent customizes an icon (goals/rewards/badges) or a profile's avatar icon and colors (`avatarIconColor`/`avatarBgColor`).

### Theming

`Settings.theme` is one of `'classic' | 'midnight' | 'ocean' | 'bubblegum' | 'cyberpunk'` (renamed from the older `light`/`dark`/`rainbow`/`gold` — `migrateLegacyState()` falls back any unrecognized saved value to `'classic'`), set per-profile via `ProfilesManager` and applied globally for the active profile (see Global State above). Theme CSS lives in `src/index.css`, keyed off `[data-theme="..."]` on `<html>`.

### Onboarding

First-run users (no `localStorage[STORAGE_KEY]` and no `ONBOARDING_DONE_KEY = 'gravy_onboarded'`) see `Onboarding` instead of the normal home screen — see the check in `AppShell` (`src/App.tsx`). It's a phase state machine (`welcome → name → walkthrough → sync → creating`, with a parallel `join` phase) that collects the child's name, shows a short walkthrough, and offers to create/join/skip a Supabase household before landing in the app. Existing users (who had saved progress before this feature shipped) are detected via the `STORAGE_KEY` check and skip straight past it.

### Persistence & Sync

- Primary: `localStorage` key `gravy_v1` (`STORAGE_KEY` in `src/state/defaultState.ts`) — stores the whole `GravyRoot` (all profiles), not a single `GravyState`
- Optional cloud: Supabase `households` table — `{ code TEXT PK, state JSONB, updated_at, created_at }`, where `state` is the serialized `GravyRoot`. Client and anon key are hardcoded in `src/lib/supabaseClient.ts` (no env vars) since the anon/publishable key is safe to ship client-side.
- Household codes use an unambiguous character set (no `0/O`, `1/I/l`) — see `CODE_CHARS` in `src/state/sync.ts`. Codes can be auto-generated or parent-chosen (`createHousehold(customCode)`), and changed later (`changeHouseholdCode`) — both validate via `isValidHouseholdCode()` and surface a friendly error on a Postgres unique-constraint collision (`error.code === '23505'`).
- Real-time sync via Supabase `postgres_changes` subscription; conflict resolution is last-write-wins
- `SyncGateModal` prompts new users to create/join a household after onboarding, unless dismissed (`gravy_sync_skipped` key) — onboarding's own `sync` phase covers first-run setup, so this modal mainly catches users who skipped that step.

**Known gap (tracked in `BACKLOG.md`)**: the parent PIN and recovery answer are stored in plaintext in `localStorage`/Supabase with no rate-limiting on PIN attempts. Don't assume this is accidental dead code to "clean up" — it's a known, prioritized backlog item; check `BACKLOG.md` before changing PIN/recovery storage or lockout behavior.

### Deployment

GitHub Actions (`.github/workflows/deploy.yml`) builds and deploys to GitHub Pages on push to `main`. The Vite `base` is `/Gravy/`.
