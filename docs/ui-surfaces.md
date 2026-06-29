# UI surfaces

Deep reference for the two user surfaces (kid view + parent dashboard) and onboarding. CLAUDE.md
links here; read it when working on screens, drawers, `AccountMenu`, `ParentDashboard`, or
`Onboarding`.

Both surfaces are reached as overlay drawers/modals from `HomeScreen` (`src/App.tsx` `AppShell`);
there is no router, just boolean open/close state per drawer.

## Kid view (`src/components/`)

`HomeScreen` (rank/streak/badge stats card, Games hub card, food tray, daily goals, bonus items)
plus drawers for the reward store, badges, games, and the rank ladder. The coin balance and Reward
Store entry point live in `StatsCard`'s coins row (the top row of the stacked rank/badges card), not
in `TopBar` — `TopBar` only holds the avatar, greeting, and the grown-up lock icon. There is no
kid-facing calendar/history icon or screen; the only calendar surface is the PIN-gated parent
`CalendarPanel` (see below), reached via `AccountMenu` → "Grown ups".

Tapping the lock icon in `TopBar` opens **`AccountMenu`**, styled like every other drawer (the
shared `Modal` bottom-sheet — header with title + close button, scrollable body). Its content is
derived directly from `grownUpUnlocked` rather than a separate stage: while locked, the drawer's
body renders `PinScreen` immediately (no intermediate "tap to unlock" row); on a correct PIN,
`onSuccess` calls `unlockGrownUpAccess()` and the same drawer re-renders as the full menu, with
every item always enabled (there's nothing to disable — the menu only ever exists once unlocked):

- **Reward Store** — no PIN, always tappable (its entry point is on `StatsCard`, not this menu).
- **Lock** — shows `faLockOpen` and "Unlocked for this session — tap to lock"; tapping calls
  `lockGrownUpAccess()` then closes the drawer, dropping back to the kid view. This is the only
  item that's a toggle rather than a destination.
- **Switch Profile** — only shown when there's more than one profile. Opens `ProfileSwitcher`, a
  read-only quick-switch list (tap → `switchProfile(id)`).
- **Grown ups** — opens `GrownUpsDrawer` → `ParentDashboard` directly, which includes the
  `CalendarPanel` for viewing/editing past days.
- **Log** — opens `LogDrawer` (`src/components/parent/LogDrawer.tsx`), a thin `Modal` wrapper
  around `LogPanel` (`src/components/parent/LogPanel.tsx`). Lists every entry in the active
  profile's `actionLog` (newest first) — kid-progress and reward actions only (food logged/removed,
  daily-goal steps, bonus-item taps, game wins, reward requested/approved/declined, plus the
  Calendar's `*ForDay` equivalents), each with label, signed point delta, and timestamp.
  `food`/`goal`/`bonus` entries get an "Undo" button when they're the most-recent non-undone entry
  for their (type, item, day) key — tapping calls `undoActionLogEntry(entry)`, which dispatches to
  the same exact-inverse context function (`removeFood`/`decrementGoal`/`undoBonusItem` or their
  `*ForDay` variants) used by the live UI. Game and reward entries are informational-only — never
  undoable. Parent catalog edits are deliberately excluded from the Log.
- **Profiles** — opens `ProfilesManager`, full CRUD for kid profiles (add/edit name, avatar
  icon+colors, theme; delete with confirm; never deletes the last profile).
- **Advanced Settings** — opens `AdvancedSettingsDrawer`
  (`src/components/parent/AdvancedSettingsDrawer.tsx`) directly — a thin `Modal` wrapper around
  `SettingsPanel`. It's a top-level `AccountMenu` item, sibling to Profiles, since it's account-level
  config rather than day-to-day parenting tasks.

A `pinNonce` key on `PinScreen`, bumped whenever the drawer transitions from closed to open, forces
a fresh `PinScreen` instance on every open so a half-entered PIN never lingers across opens/closes.

The unlocked state (`grownUpUnlocked` in `GravyContext`, backed by `src/state/grownUpUnlock.ts`) is
stored in `sessionStorage`, not `localStorage` — so it follows the current browser tab/PWA window and
resets to locked whenever that session ends, even though everything else persists indefinitely.
`GrownUpsDrawer`/`ProfilesManager`/`ProfileSwitcher`/`AdvancedSettingsDrawer`/`LogDrawer` don't
render `PinScreen` themselves; they assume they're only opened from `AccountMenu` once unlocked.

There is no longer a no-PIN "kid settings" screen — theme and child name are now per-profile fields
edited through the PIN-gated `ProfilesManager`.

## Parent dashboard (`src/components/parent/`)

`ParentDashboard` is a two-level router: a local `root` state
(`'menu' | 'approvals' | 'goals' | 'calendar' | 'store' | 'badges' | 'audit'`). At `'menu'` it
renders `RootMenu` (a card list, not tabs); picking a card drills into one panel with a back button:

- `ApprovalsPanel` — approve/decline pending reward requests.
- `GoalsPanel` — goal/bonus-item CRUD, and (nested at the bottom) `PointsPanel` for the per-action
  point values (`foodPts`, `bonusPts`, `gamePts`).
- `CalendarPanel` — view/edit past days.
- `StorePanel` — reward CRUD.
- `BadgesPanel` — customize badge name/emoji/icon/visibility.
- `AuditLogPanel` ("Admin Log") — read-only household history of grown-up admin/destructive actions
  (catalog edits, settings, profile CRUD, danger-zone resets, sync/ownership changes), each
  attributed to the parent account that made it. Backed by the shared `auditLog` field; informational
  only, never undoable (unlike the kid-progress Log in `AccountMenu`).

`SettingsPanel` — a thin composer that renders `TimezonePanel` (account time zone) + `AccountPanel`
(parent account sign up/in/out + magic link) + `SecurityPanel` (PIN + recovery Q&A) + `SyncPanel`
(household code create/join/change/leave, plus the "Secure this household" claim banner) +
`DangerZonePanel` (reset today / reset everything) in sequence — is **not** one of
`ParentDashboard`'s root-menu panels. It's reached directly from `AccountMenu`'s "Advanced Settings"
item via `AdvancedSettingsDrawer`, not nested inside the Grown ups dashboard.

## Onboarding

First-run users (no `localStorage[STORAGE_KEY]` and no `ONBOARDING_DONE_KEY = 'gravy_onboarded'`)
see `Onboarding` instead of the normal home screen — see the check in `AppShell` (`src/App.tsx`).
It's a phase state machine (`welcome → name → walkthrough → account → sync → creating → pinSetup`,
with a parallel `join` phase) that collects the child's name, shows a short walkthrough, offers to
create a parent account, then offers to create/join/skip a Supabase household before landing in the
app. Existing users (saved progress before this feature shipped) are detected via the `STORAGE_KEY`
check and skip past it.

The `'account'` phase (Epic 8) renders `AccountSetupStep` (`src/components/AccountSetupStep.tsx`) —
an optional, skippable parent-account step (email/password or magic link, parent-only/COPPA
language) placed **before** household creation on purpose: a parent who signs in here owns the
household automatically when the next `'sync'` phase creates it (`createHousehold` sets `owner_id`
from the JWT), so no separate "claim" is needed. Skipping leaves the household unclaimed (legacy
path), claimable later via the `SyncPanel` banner. It's rendered self-contained like `PinSetupStep`.
The same account form also lives in `AccountPanel` (Advanced Settings) for users who skip or who
onboarded before this step existed.

When a household is freshly **created** (not joined — an existing household already has a real PIN),
the `'creating'` phase's "Let's go!" button advances to `'pinSetup'` instead of finishing onboarding
directly. That phase renders `PinSetupStep` (`src/components/PinSetupStep.tsx`), a two-screen
mini-wizard (`'pin' → 'recovery'`) that walks the parent through replacing the default PIN (`1234`)
with a real one and optionally setting a recovery question/answer, both via `saveSetting()` —
`onDone` calls `finish()` to complete onboarding either way (both steps have a skip option). The same
component is reused by `SyncGateModal` for the other household-creating path. This exists so
PIN/recovery setup isn't only reachable later via the PIN-gated Settings screen (`SecurityPanel`).
`PinSetupStep` lays the PIN/Confirm (or question/answer) inputs side by side within a step rather
than stacking every field in one tall form, the same fix applied to `PinScreen`'s pre-existing
"Forgot PIN? → set new PIN" recovery step.
