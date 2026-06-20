# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server at http://localhost:5173
npm run build     # Type-check (tsc -b) then bundle to ./dist
npm run lint      # Run ESLint
npm run preview   # Serve ./dist locally
```

There is **no test framework configured** (no Jest/Vitest/`npm test`). `verify_gravy.mjs` at the repo root is an ad-hoc Playwright smoke-test script (not wired into `npm`) that drives the app in a headless browser against a running `npm run dev` server and screenshots each step to `/tmp`. Run it manually with `node verify_gravy.mjs` only if you need to script a UI walkthrough — otherwise testing is manual via the browser.

## Architecture Overview

Gravy is a gamified chores + nutrition + rewards PWA for kids built with React 19, TypeScript, and Vite. It is a client-side-only SPA — no server, no API. Data persists to `localStorage` with optional cloud sync via Supabase. The real entry point is `index.html` → `src/main.tsx` → `src/App.tsx`.

> **Ignore `gravy.html`** at the repo root — it's an old static single-file prototype (inline CSS, dark/gold theme) from before the Vite rewrite. It isn't referenced by any build config or script and isn't part of the live app; don't edit it expecting it to affect the running app.

### Two User Surfaces

Both surfaces are reached as overlay drawers/modals from `HomeScreen` (`src/App.tsx` `AppShell`); there is no router, just boolean open/close state per drawer.

- **Kid view** (`src/components/`) — `HomeScreen` (rank, streaks, food tray, daily/other goals) plus drawers for the calendar, reward store, and badges. Tapping the avatar icon in `TopBar` opens **`AccountMenu`**, a small menu that splits into two destinations:
  - **`SettingsScreen`** — *no PIN required*. Theme picker + child's display name only.
  - **`GrownUpsDrawer`** — *PIN required* (default `1234`). Gates `ParentDashboard` behind `PinScreen`.

  Don't confuse the two "Settings": the kid-facing `SettingsScreen` (`src/components/SettingsScreen.tsx`) and the parent-facing `SettingsPanel` (`src/components/parent/SettingsPanel.tsx`, one tab inside `ParentDashboard`) are different components with different scopes (appearance/name vs. points config, PIN, recovery Q&A, cloud sync, reset).

- **Parent dashboard** (`src/components/parent/`) — `ParentDashboard` renders five tabs: `ApprovalsPanel`, `GoalsPanel`, `StorePanel`, `BadgesPanel`, `SettingsPanel`. Manages goals/rewards, approves reward requests, customizes badge name/emoji/icon/visibility, edits points/PIN/recovery, and resets progress.

### Global State

All state flows through a single React Context defined in `src/state/GravyContext.tsx`. Components consume it via `useGravy()`. The context owns:

- The `GravyState` object (see `src/state/types.ts` for full shape)
- Auto-save to `localStorage` on every state change (a plain `useEffect` on `state`)
- Supabase sync (`src/state/sync.ts`) — debounced 800ms push to avoid spamming on rapid taps; incoming `postgres_changes` events are skipped if they match the last value this client itself pushed (`lastSyncedRef`), since conflict resolution is otherwise last-write-wins
- Theme application via `useLayoutEffect` (sets `document.documentElement.dataset.theme` and the `<meta theme-color>` tag before paint, avoiding a flash of the wrong theme)
- Day-rollover re-check on `visibilitychange` (catches the case where the app was left open across midnight)
- Toast notifications with optional undo actions, celebration/confetti triggers, badge-earned detection — all run after each state-mutating action

### Key State Concepts

- **Goals** — chores assigned to the child (formerly called "chores"; `migrateLegacyState()` in `src/state/defaultState.ts` renames old keys/fields on load, including the `choreIds` → `goalIds` rename inside `dayLogs`). A goal can be:
  - **Daily** (`isDaily !== false`, the default) — resets each day, shown under "Today's Goals" (`DailyGoals.tsx`)
  - **One-time** (`isDaily: false`) — persists until manually toggled, shown under "Other Goals" (`OtherGoals.tsx`)
  - **Multi-step** (`target > 1`) — must be incremented/decremented `target` times via `incrementGoal`/`decrementGoal` before it counts as done
- **Streaks** — there are four independent counters, not one: `streak` (general daily-activity streak, used for badges/UI), `foodStreak` (consecutive full-tray days), `goalStreak` (consecutive all-daily-goals-done days), `megaStreak` (consecutive days that hit both). All four are recomputed in `applyDayRollover()` (`src/state/defaultState.ts`) when the day changes; `streak` only extends if the closed-out day had real logged activity, otherwise it resets to 0. `backfillStreaksFromLogs()` seeds `foodStreak`/`goalStreak`/`megaStreak` by replaying `dayLogs` for saves written before these fields existed, so upgrading the app doesn't reset an in-progress streak.
- **Day rollover** — `applyDayRollover()` archives yesterday's food counts/completed goals into `dayLogs[dateStr]`, updates the four streaks, then clears only *daily* goal completions for the new day (one-time goal completions are untouched).
- **Counters** (`GravyState.counters`) — lifetime aggregates used for badge progress: `foodLogs` (per food-group log count), `fullTrayDays`, `totalGoals`, `allGoalsDays`, `comboDays` (full tray + all daily goals same day), `totalRewards`, `maxDayPoints`.
- **Pending rewards** — kids request rewards via `requestReward`; they sit in `pendingRewards` until a parent calls `approveReward`/`declineReward` from `ApprovalsPanel`.
- **Editing past days** — `FoodTray`/`DailyGoals`/`BonusPoints` all accept an optional `dateStr` prop (passed from `HomeScreen` as `selectedDate`); when it's not today they read/write a past day's log via `getDayLog()` and the `*ForDay` actions (`logFoodForDay`/`removeFoodForDay`/`toggleGoalForDay`/`logBonusItemForDay`/`undoBonusItemForDay`), which mutate `dayLogs[dateStr]` directly. This keeps past-day editing visually and structurally identical to today's view (today's edits use the separate `logFood`/`incrementGoal`/`logBonusItem` actions that mutate the live `today*` fields instead). Multi-step goals (`target > 1`) only track step counts for today — past days only store goal completion as a boolean (`goalIds` membership), so `DailyGoals` renders past-day multi-step goals as a simple toggle tile rather than a stepper.

### Badge System

61 unlockable badges defined in `src/data/badges.ts` across 6 groups (Food, Chores, Points, Streaks, Store, Combos), evaluated in `src/state/badges.ts`. Badges are triggered by:
- First-time events (`first_food`, `first_chore`, `first_reward`)
- Cumulative counter thresholds (`fruit:N`, `veggie:N`, `pts:N`, `pts_day:N`, `streak:N`, `chore_count:N`, `combo:N`, etc. — see the trigger-type comment atop `badges.ts`)

`findNewlyEarnedBadges()` is called after each state-mutating action in `GravyContext`. Parents can override a badge's name/emoji/icon/visibility per-id via `badgeConfig` in state; `getBadgeDisplay()` merges the override onto the `BADGE_MASTER` definition.

### Icon System

Every visual entity (`Goal`, `Reward`, `BadgeDef`/`BadgeOverride`, `Rank`, `Food`) carries **both** an `emoji` string (legacy fallback) and an `icon`/`iconKey` string. `src/data/icons.ts` is the single source of truth mapping string keys to imported FontAwesome `IconDefinition`s — FontAwesome tree-shakes, so any icon used anywhere in the app must be explicitly imported and added to the `ICONS` map there. `<AppIcon iconKey emojiFallback>` (`src/components/AppIcon.tsx`) renders the FontAwesome icon for a known key, or falls back to the raw emoji string for unknown/absent keys — this keeps old synced data (created before the icon system, or by another device's older build) rendering correctly. When adding a new goal/reward/badge in code, set `icon` to a real key from `icons.ts` rather than relying on the emoji fallback.

### Theming

`Settings.theme` is one of `'light' | 'dark' | 'rainbow' | 'gold'`, changed via the no-PIN `SettingsScreen` and applied globally (see Global State above). Theme CSS lives in `src/index.css`, keyed off `[data-theme="..."]` on `<html>`.

### Persistence & Sync

- Primary: `localStorage` key `gravy_v1` (`STORAGE_KEY` in `src/state/defaultState.ts`)
- Optional cloud: Supabase `households` table — `{ code TEXT PK, state JSONB, updated_at, created_at }`. Client and anon key are hardcoded in `src/lib/supabaseClient.ts` (no env vars) since the anon/publishable key is safe to ship client-side.
- Household codes use an unambiguous character set (no `0/O`, `1/I/l`) — see `CODE_CHARS` in `src/state/sync.ts`
- Real-time sync via Supabase `postgres_changes` subscription; conflict resolution is last-write-wins
- `SyncGateModal` prompts new users to create/join a household on first run unless dismissed (`gravy_sync_skipped` key)

### Deployment

GitHub Actions (`.github/workflows/deploy.yml`) builds and deploys to GitHub Pages on push to `main`. The Vite `base` is `/Gravy/`.
