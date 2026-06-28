# State model

Deep reference for Gravy's state shape, profiles, and core concepts. CLAUDE.md links here; read
it when working on points/streaks/day-rollover/counters/profiles or the GravyContext data flow.

## Global State

All state flows through a single React Context in `src/state/GravyContext.tsx`, consumed via
`useGravy()`. The context owns:

- The `GravyRoot` object (multi-profile container; see Profiles below) and the active profile's
  `GravyState` (full shapes in `src/state/types.ts`).
- Auto-save to `localStorage` on every state/root change (a plain `useEffect`).
- Supabase sync (`src/state/sync.ts`) — debounced 800ms push; incoming `postgres_changes` events
  are skipped if they match the last value this client pushed (`lastSyncedRef`), since conflict
  resolution is last-write-wins. The synced payload is the **whole household root** (every profile
  + shared config), not one kid.
- Theme application via `useLayoutEffect` (sets `document.documentElement.dataset.theme` and the
  `<meta theme-color>` before paint, avoiding a flash of the wrong theme).
- Day-rollover re-check on `visibilitychange`, applied to **every** profile (not just the active
  one), so a kid not opened in days still has correct streaks/cleared "today" state when picked.
- Toast notifications (plain, no undo — undo lives in the Log), celebration/confetti triggers,
  badge-earned detection — all run after each state-mutating action.
- `actionLog: ActionLogEntry[]` (per-profile) — append-only history of kid-progress/reward actions,
  capped at `ACTION_LOG_MAX_ENTRIES` (500, FIFO). `src/state/actionLog.ts` holds the pure helpers:
  `appendActionLog(next, actor, entry)` (push + cap, stamps `actorUserId`/`actorLabel` from the
  signed-in parent account — Epic 8 item 5; absent when no account is signed in),
  `markMostRecentUndone` (called by the reverse actions so the Log reflects taps undone via the live
  UI, not just via the Log's own button), and `isMostRecentNonUndone` (drives whether `LogPanel`
  renders an Undo button — most-recent-only per (type, itemId, dateStr) key).
- `auditLog: AuditLogEntry[]` (Epic 8 item 6) — append-only history of **household
  admin/destructive** actions the kid-progress `actionLog` excludes: catalog edits (goals/rewards),
  settings changes, badge config, profile CRUD, danger-zone resets, sync/ownership changes. Unlike
  `actionLog` this is a **shared** field, mirrored across profiles by
  `mirrorSharedFields`/`copySharedInto`. `src/state/auditLog.ts` has the pure
  `appendAuditLog(next, actor, entry)` (push + cap at `AUDIT_LOG_MAX_ENTRIES` 300, same
  actor-stamping). Appended inline in the relevant `GravyContext` actions via the `actorRef` ref;
  shown read-only (never undoable) in `AuditLogPanel`. `saveSetting` only logs a `settingChanged`
  entry when the value actually changed, and never records the value of secret fields (PIN /
  recovery answer); `resetAll` preserves the prior audit trail rather than wiping it.
- Parent account / Supabase Auth state (`authUser`, `authReady`) and actions
  (`signUp`/`signIn`/`sendSignInLink`/`signOutAccount`, plus `claimHousehold` and
  `householdStatus`) — see `docs/persistence-and-sync.md`. `src/state/auth.ts` wraps the Supabase
  Auth client so nothing else imports it directly; the context subscribes via `onAuthChange` and
  refreshes `householdStatus` whenever the code or signed-in account changes.

### Action hooks (`src/state/actions/`)

The provider's imperative actions are split into per-domain custom hooks, each called once inside
`GravyProvider` and receiving the shared state setters/refs and helper callbacks
(`showToast`/`showCelebration`/`awardPoints`/`awardPointsForDay`/`checkBadges`/
`maybeCelebrateRankUp`/`actorRef`) as explicit deps:

- `useKidProgressActions.ts` — live "today" actions: `logFood`, `removeFood`, `incrementGoal`,
  `decrementGoal`, `logBonusItem`, `undoBonusItem`, `completeGameRound`.
- `useDayEditActions.ts` — the five `*ForDay` Calendar edits + `undoActionLogEntry` (takes the three
  kid-progress today-inverses as deps to dispatch today-vs-`*ForDay`).
- `useRewardActions.ts` — `requestReward`, `approveReward`, `declineReward`.
- `useCatalogActions.ts` — goal/reward CRUD, `saveSetting`, `resetToday`, `resetAll`,
  `updateBadgeConfig` (+ the `SETTING_LABELS` map for audit labels).
- `useProfileActions.ts` — `switchProfile`, `addProfile`, `updateProfile`, `deleteProfile`.
- `useHouseholdActions.ts` — `createHousehold`/`joinHousehold`/`leaveHousehold`/
  `deleteHouseholdEverywhere`/`changeHouseholdCode` + `signUp`/`signIn`/`sendSignInLink`/
  `signOutAccount`/`claimHousehold`.

`src/state/actions/shared.ts` holds `clone`/`buildMergedRoot`/`activeStateOf` and the
`HOUSEHOLD_CODE_KEY`/`SYNC_SKIPPED_KEY`/`DAILY_GAME_WIN_CAP` constants (the latter two re-exported
from `GravyContext` so consumer import paths are unchanged). `src/state/actions/types.ts` holds
`SyncStatus`, the dependency function-signature aliases, `SettableSettingKey`, and `ProfilePatch`.
GravyContext keeps the `useState`/`useRef` declarations, all `useEffect`/`useLayoutEffect` blocks,
the toast/celebration/award/badge/rank helper callbacks, the `profiles` derivation, the assembled
`value`, and `useGravy`. The pure point arithmetic still lives in `src/state/points.ts`.

## Profiles (multi-kid households)

The persisted shape is `GravyRoot` (`{ version: 2, activeProfileId, profiles: ProfileEntry[] }`),
not a bare `GravyState` (`src/state/types.ts`). Each `ProfileEntry` (`{ id, state }`) holds a
complete, independent `GravyState` for one kid. `loadRoot()`/`saveRoot()` in
`src/state/defaultState.ts` handle persistence; `loadRoot()` also migrates a legacy flat
single-profile save by wrapping it as a one-entry root.

- **Shared vs. per-kid fields** — `goals`, `rewards`, `badgeConfig`, and a subset of `settings`
  (`SHARED_SETTING_KEYS`: `foodPts`, `bonusPts`, `gamePts`, `pin`, `recoveryQuestion`,
  `recoveryAnswer`, `timezone`) are identical across every profile in a household. Per-kid fields
  are everything else: progress (points, streaks, counters, logs) plus identity (`childName`,
  `avatarIcon`, `avatarIconColor`, `avatarBgColor`, `theme`).
- `mirrorSharedFields(root)` copies the shared fields from the **active** profile onto every other
  profile after any edit — the active profile is where all parent config changes happen, so it's the
  source of truth for shared config at any moment.
- `switchProfile(id)` folds the live `state` back into `root` (via `mirrorSharedFields`), then makes
  `id` active and runs `applyDayRollover()` on its state.
- `addProfile(name, opts)` calls `makeNewProfile()`, which clones `defaultState`, copies in the
  current shared config, and sets the new kid's identity — so a new sibling starts with zero
  progress but the same goals/rewards/points config/PIN.
- The context exposes per-profile actions distinct from the active-profile ones:
  `profiles: ProfileSummary[]` (id/name/avatar/theme/points for every kid),
  `switchProfile`, `addProfile`, `updateProfile(id, patch)`, `deleteProfile(id)` (refuses to delete
  the last profile).

## Key State Concepts

- **Goals** — chores assigned to the child (formerly "chores"; `migrateLegacyState()` in
  `src/state/defaultState.ts` renames old keys/fields on load, including `choreIds` → `goalIds`
  inside `dayLogs`). A goal can be:
  - **Daily** (`isDaily !== false`, default) — resets each day, under "Daily Goals"
    (`DailyGoals.tsx`).
  - **Bonus item** (`isDaily: false`) — repeatable any number of times per day (not a one-time
    toggle), under "Bonus Points" (`BonusPoints.tsx`). `pts` may be negative (a deduction, e.g.
    "Swear Jar"). `target` is unused for bonus items.
  - **Multi-step** (`target > 1`, Daily only) — must be incremented/decremented `target` times via
    `incrementGoal`/`decrementGoal` before it counts as done.
- **Streaks** — four independent counters: `streak` (general daily-activity, used for badges/UI),
  `foodStreak` (consecutive full-tray days), `goalStreak` (consecutive all-daily-goals-done days),
  `megaStreak` (consecutive days hitting both). All four are recomputed in `applyDayRollover()`
  when the day changes; `streak` only extends if the closed-out day had real logged activity,
  otherwise resets to 0. `backfillStreaksFromLogs()` seeds `foodStreak`/`goalStreak`/`megaStreak` by
  replaying `dayLogs` for saves written before these fields existed.
- **Day rollover** — `applyDayRollover()` archives yesterday's food counts/completed goals/bonus
  counts into `dayLogs[dateStr]`, updates the four streaks, then clears the live `today*` fields
  (food, daily-goal completions/counts, bonus-item ledger, `todayGameWins`). Bonus-item completions,
  like daily goals, reset every day.
- **Counters** (`GravyState.counters`) — lifetime aggregates for badge progress: `foodLogs`
  (per food-group), `fullTrayDays`, `totalGoals`, `allGoalsDays`, `comboDays` (full tray + all daily
  goals same day), `totalRewards`, `maxDayPoints`, `gamesPlayed`, `gamesWon`.
- **Pending rewards** — kids request via `requestReward` (which reserves points already promised to
  other pending requests so a kid can't queue more than their balance covers); they sit in
  `pendingRewards` until a parent calls `approveReward`/`declineReward` from `ApprovalsPanel`.
- **Editing past days** — the Calendar lives in the PIN-gated parent dashboard (`CalendarPanel`),
  since past-day edits affect real points. Picking a day renders `FoodTray`/`DailyGoals`/
  `BonusPoints` with a `dateStr` prop; when it's not today they read/write that day's log via
  `getDayLog()` (`src/state/dayLog.ts`) and the `*ForDay` actions
  (`logFoodForDay`/`removeFoodForDay`/`toggleGoalForDay`/`logBonusItemForDay`/
  `undoBonusItemForDay`), which mutate `dayLogs[dateStr]` directly (today's edits use the separate
  `logFood`/`incrementGoal`/`logBonusItem`). The `*ForDay` actions are full point-parity with their
  "today" counterparts: they award/remove via `awardPointsForDay` (the day-scoped mirror of
  `awardPoints`) moving `next.points`/`next.totalPoints` in lockstep with `log.points`, run
  `maybeCelebrateRankUp()` and `checkBadges()`, and apply the same unfloored exact-inverse
  arithmetic and bonus-item forgiveness/exact-undo tracking (`DayLog.bonusApplied`). The one thing
  intentionally *not* ported is the food/goal-specific full-screen celebration overlays (`'Full
  Tray!'`, `'All Goals Done!'`) — a toast covers the bonus award on past days instead. Multi-step
  goals (`target > 1`) only track step counts for today — past days store goal completion as a
  boolean (`goalIds` membership), so `DailyGoals` renders past-day multi-step goals as a simple
  toggle tile rather than a stepper.
- **Viewing (not editing) past days from the kid view** — `HomeScreen` tracks a `viewedDate: string
  | null` (`null` = "follow today live"; a concrete date string once the kid navigates away, back to
  `null` on return, so midnight rollover never leaves it on a stale "today"). `TopBar`
  (`src/components/TopBar.tsx`) is the single merged header row (3-column grid `auto 1fr auto`):
  the avatar button (`onOpenAvatarMenu`, opens `AccountMenu`) left, `Greeting`
  (`src/components/Greeting.tsx`) middle, points pill + calendar-icon button (`faCalendarDays`,
  `onOpenHistory`) right. There's no chevron date nav — the calendar icon (opening `HistoryScreen`,
  a `Modal` wrapping the shared `CalendarGrid`) is the only way to a different day; picking a day
  sets `viewedDate` and closes the modal. While viewing a non-today date, `HomeScreen` renders a
  full-width `.home-history-banner` ("Viewing June 25 — not today") above `StatsCard` and a fixed
  `.return-today-fab` ("Return to Today") resetting `viewedDate` to `null`. This kid path is
  **read-only**: `FoodTray`/`DailyGoals`/`BonusPoints` each take an `editable?: boolean` prop
  (default `true`, so `CalendarPanel` is unaffected); `HomeScreen` passes `editable={isToday}`.
  `src/components/CalendarGrid.tsx` is the month-grid UI shared by both surfaces; it disables/mutes
  any day cell whose date string is greater than today's so neither surface navigates to a future
  date. `formatFriendlyDate()`/`formatShortDate()` (`src/state/defaultState.ts`, alongside
  `todayStr`/`addDaysToDateStr`) are the shared date-label formatters.
