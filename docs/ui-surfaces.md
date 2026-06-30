# UI surfaces

Deep reference for the two user surfaces (kid view + parent dashboard) and onboarding. CLAUDE.md
links here; read it when working on screens, drawers, `AccountMenu`, `ParentDashboard`, or
`Onboarding`.

Both surfaces are reached as overlay drawers/modals from `HomeScreen` (`src/App.tsx` `AppShell`);
there is no router, just boolean open/close state per drawer.

## Kid view (`src/components/`)

`HomeScreen` (rank/streak/badge stats card, Arcade hub card, food tray, daily goals, bonus items)
plus drawers for the reward store, badges, the Arcade (games), and the rank ladder. The user-facing
label for the games hub is "Arcade" (`GamesCard`, `GamesScreen`) — kept distinct from the parent
dashboard's "Game Settings" label (see below) so the two aren't confused; the underlying
component/file names (`GamesCard`, `GamesScreen`, `onOpenGames`, `gamesOpen`, `src/data/games.ts`)
are unchanged. The coin balance and Reward Store entry point live in `StatsCard`'s coins row (the
top row of the stacked rank/badges card), not in `TopBar` — `TopBar` only holds the avatar,
greeting, and the grown-up menu (hamburger) icon. There is no kid-facing calendar/history icon or
screen; the only calendar surface is the PIN-gated parent `CalendarPanel` (see below), reached via
`AccountMenu` → "Calendar".

Tapping the hamburger icon in `TopBar` always opens **`AccountMenu`**, whether locked or unlocked —
it's a single "open the menu" button, not a lock/unlock toggle, so closing the menu (e.g. after
using an item) and tapping the icon again reopens the menu rather than re-locking. `AccountMenu` is
styled like every other drawer (the shared `Modal` bottom-sheet — header with title + close button,
scrollable body), plus a round lock button passed via `Modal`'s `headerExtra` prop, rendered
immediately to the left of the close (X) button. The lock button reflects `grownUpUnlocked`
(closed-lock glyph + neutral background when locked, open-lock glyph + yellow background when
unlocked) and is the only lock/unlock control — there's no separate "Lock" list item. The item list
itself always renders (it's not swapped out for `PinScreen`): each item button gets `disabled` and a
greyed-out/desaturated style whenever `grownUpUnlocked` is false, so the menu's shape is visible but
inert while locked. Tapping the lock button when locked swaps the body (title becomes "Grown-Up
Access", and a back-chevron appears via `Modal`'s `onBack`) to render `PinScreen` inline; on a
correct PIN, `onSuccess` calls `unlockGrownUpAccess()` and the body reverts to the now-enabled item
list. Tapping the lock button when unlocked calls `lockGrownUpAccess()` directly (no PIN re-entry to
lock) and the menu stays open with items now greyed/disabled — re-locking doesn't close the drawer.
A `pinPromptOpen` flag tracks whether the inline `PinScreen` is showing; it resets to `false`
whenever the drawer transitions from closed to open (see the `pinNonce` note below), so the menu
always opens to the greyed item list rather than mid-PIN-entry.

- **Reward Store** — no PIN, always tappable (its entry point is on `StatsCard`, not this menu).
- **Approvals** — the first item in the list. Opens `ApprovalsDrawer`
  (`src/components/parent/ApprovalsDrawer.tsx`), a thin `Modal` wrapper around `ApprovalsPanel`
  (approve/decline pending reward requests) — a first-class `AccountMenu` item, no longer nested
  inside the Game Settings dashboard (it used to be the dashboard's `RootMenu` "Approvals" card).
  The icon span reuses the `nav-badge` CSS class (`src/index.css`) with `data-count={pendingCount}`
  to show the same pending-request count badge `TopBar`'s hamburger icon already shows.
- **Switch Profile** — only shown when there's more than one profile. Opens `ProfileSwitcher`, a
  read-only quick-switch list (tap → `switchProfile(id)`).
- **Game Settings** (formerly "Grown ups") — opens `GrownUpsDrawer` → `ParentDashboard` directly.
  Renamed because, with Approvals/Calendar/Log/Advanced Settings all graduated to top-level items
  (see below and this list), all that's left inside is gamification config (Goals/Store/Badges) —
  "Game Settings" describes that scope more accurately than the old catch-all "Grown ups" label.
- **Calendar** — opens `CalendarDrawer` (`src/components/parent/CalendarDrawer.tsx`), a thin
  `Modal` wrapper around `CalendarPanel` (view/edit past days) — a first-class `AccountMenu` item,
  sibling to "Game Settings", rather than nested inside the Game Settings dashboard.
- **Log** — opens `LogDrawer` (`src/components/parent/LogDrawer.tsx`), a thin `Modal` wrapper
  around `LogPanel` (`src/components/parent/LogPanel.tsx`). Merges and time-sorts (newest first)
  two separate fields for display: the active profile's `actionLog` — kid-progress and reward
  actions only (food logged/removed, daily-goal steps, bonus-item taps, game wins, reward
  requested/approved/declined, plus the Calendar's `*ForDay` equivalents), each with label, signed
  point delta, and timestamp — and the shared `auditLog` — household admin/destructive actions
  (catalog edits, settings, profile CRUD, danger-zone resets, sync/ownership changes), each
  attributed to the parent account that made it. Only `food`/`goal`/`bonus` action entries get an
  "Undo" button, shown when they're the most-recent non-undone entry for their (type, item, day)
  key — tapping calls `undoActionLogEntry(entry)`, which dispatches to the same exact-inverse
  context function (`removeFood`/`decrementGoal`/`undoBonusItem` or their `*ForDay` variants) used
  by the live UI. Game/reward entries and all audit entries are informational-only — never
  undoable. The two fields stay separate in state (`actionLog` is per-profile, `auditLog` is
  shared/mirrored); the merge happens only at render time in `LogPanel`.
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
`GrownUpsDrawer`/`ProfilesManager`/`ProfileSwitcher`/`AdvancedSettingsDrawer`/`LogDrawer`/
`CalendarDrawer`/`ApprovalsDrawer` don't render `PinScreen` themselves; they assume they're only
opened from `AccountMenu` once unlocked.

Every drawer reached directly from `AccountMenu` (the seven above) is a first-level drawer and gets
a working back button via the shared `Modal` component's optional `onBack` prop — `Modal` renders a
back-chevron button ahead of the title when `onBack` is passed. Each of these drawers' `onBack`
closes itself and reopens `AccountMenu` (wired in `AppShell`, `src/App.tsx`). Nested panels inside a
drawer (e.g. the picked-date view inside `CalendarPanel`) use their own existing
`onHeaderChange`/`goToRoot` mechanism instead, which takes precedence — `GrownUpsDrawer`/
`CalendarDrawer` pass `onBack={header.onBack ?? onBack}`, so back goes to the nested panel's own
root first, and only falls through to `AccountMenu` once you're at that drawer's own top level.

There is no longer a no-PIN "kid settings" screen — theme and child name are now per-profile fields
edited through the PIN-gated `ProfilesManager`.

## Game Settings dashboard (`src/components/parent/`, `ParentDashboard` component)

User-facing label is "Game Settings" (the `AccountMenu` item and `GrownUpsDrawer`/`ParentDashboard`
header both read "Game Settings"); the component/file names (`ParentDashboard`, `GrownUpsDrawer`,
`RootMenu`) are unchanged — only user-facing copy was renamed, since those symbols also represent
the PIN-gated access tier shared by every parent-only feature, not just this dashboard.

`ParentDashboard` is a two-level router: a local `root` state (`'menu' | 'goals' | 'store' |
'badges'`). At `'menu'` it renders `RootMenu` (a card list, not tabs); picking a card drills into
one panel with a back button:

- `GoalsPanel` — goal/bonus-item CRUD, and (nested at the bottom) `PointsPanel` for the per-action
  point values (`foodPts`, `bonusPts`, `gamePts` — the latter's section is labeled "Arcade" to match
  the kid-facing hub name).
- `StorePanel` — reward CRUD.
- `BadgesPanel` — customize badge name/emoji/icon/visibility.

`ApprovalsPanel` (approve/decline pending reward requests) is no longer nested here — it's reached
directly from `AccountMenu`'s top-level "Approvals" item (the first item in the list) via the
standalone `ApprovalsDrawer`, the same graduation pattern already applied to Calendar and Advanced
Settings below.

`CalendarPanel` (view/edit past days) is no longer nested here — it's reached directly from
`AccountMenu`'s top-level "Calendar" item via the standalone `CalendarDrawer` (see above). The old
"Admin Log" panel (`AuditLogPanel`) was deleted; its content (the shared `auditLog` field) is now
merged into the top-level `LogPanel` reached via `AccountMenu` → "Log" (see above).

`SettingsPanel` — a thin composer that renders `TimezonePanel` (account time zone) + `AccountPanel`
(parent account sign up/in/out + magic link) + `SecurityPanel` (PIN + recovery Q&A) + `SyncPanel`
(household code create/join/change/leave, plus the "Secure this household" claim banner) +
`DangerZonePanel` (reset today / reset everything) in sequence — is **not** one of
`ParentDashboard`'s root-menu panels. It's reached directly from `AccountMenu`'s "Advanced Settings"
item via `AdvancedSettingsDrawer`, not nested inside the Game Settings dashboard.

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
