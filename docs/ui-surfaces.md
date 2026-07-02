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
top row of the stacked rank/badges card), not in `TopBar` — `TopBar` holds the avatar, greeting, a
bell icon, and the grown-up menu (hamburger) icon. There is no kid-facing calendar/history icon or
screen; the only calendar surface is the PIN-gated parent `CalendarPanel` (see below), reached via
`AccountMenu` → "Calendar".

The bell icon opens `ApprovalsDrawer` directly — Approvals is no longer an `AccountMenu` item (it
used to be the first one); it's its own top-level entry point next to the hamburger, badged via the
same `nav-badge` CSS class with `data-count={pendingRewards.length + pendingPointsAwards.length}`.
Since it's no longer reached only through an already-unlocked `AccountMenu`, `ApprovalsDrawer` gates
itself: it reads `grownUpUnlocked` directly and renders `SignInPrompt` (title "Sign In") in place of
`ApprovalsPanel` whenever locked, falling back to the panel on its own once sign-in flips
`grownUpUnlocked` true (same mechanic as `AccountMenu`'s own sign-in swap, including a `signInNonce`
remount) — a kid tapping the bell on a locked device sees a sign-in prompt, not the pending list.

Tapping the hamburger icon in `TopBar` always opens **`AccountMenu`**, whether locked or unlocked —
it's a single "open the menu" button, not a lock/unlock toggle, so closing the menu (e.g. after
using an item) and tapping the icon again reopens the menu rather than re-locking. `AccountMenu` is
styled like every other drawer (the shared `Modal` bottom-sheet — header with title + close button,
scrollable body), plus a round button passed via `Modal`'s `headerExtra` prop, rendered immediately
to the left of the close (X) button. That button reflects `grownUpUnlocked` (a derived value — see
`isGrownUpUnlocked` in `src/state/auth.ts` — not stored state): "Sign In" glyph + neutral background
when locked, "Log Out" glyph + yellow background when unlocked. The item list itself always renders
(it's not swapped out for a PIN pad): each item button gets `disabled` and a greyed-out/desaturated
style whenever `grownUpUnlocked` is false, so the menu's shape is visible but inert while locked.
Tapping the button when locked swaps the body (title becomes "Sign In", and a back-chevron appears
via `Modal`'s `onBack`) to render `SignInPrompt` (`src/components/SignInPrompt.tsx`) inline — either
a sign-up/sign-in/magic-link form (not signed in at all) or a family-code join prompt (signed in but
not yet a member of this device's household). There's no explicit "unlock" call: `grownUpUnlocked`
recomputes automatically once `authUser`/`householdStatus` update, and a `useEffect` in `AccountMenu`
watches it and closes the prompt back to the item list once it flips true. Tapping the button when
unlocked calls `signOutAccount()` directly — logging out is what re-locks the device, there's no
separate "lock without signing out." A `signInNonce` flag remounts a fresh `SignInPrompt` on every
open (mirroring the old `pinNonce` idea) so a half-finished sign-in attempt never lingers.

- **Reward Store** — no PIN, always tappable (its entry point is on `StatsCard`, not this menu).
  Approvals also isn't in this menu anymore — see the `TopBar` bell icon above.
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
  requested/approved/declined, points approved/declined, plus the Calendar's `*ForDay`
  equivalents), each with label, signed point delta, and timestamp — and the shared `auditLog` —
  household admin/destructive actions (catalog edits, settings, profile CRUD, danger-zone resets,
  sync/ownership changes), each attributed to the parent account that made it. Only `food`/`goal`/
  `bonus` action entries get an "Undo" button, shown when they're the most-recent non-undone entry
  for their (type, item, day) key — tapping calls `undoActionLogEntry(entry)`, which dispatches to
  the same exact-inverse context function (`removeFood`/`decrementGoal`/`undoBonusItem` or their
  `*ForDay` variants) used by the live UI. On a kid-only device, that original `food`/`goal`/`bonus`
  entry logs `pts: 0` (the points are pending, not yet real) until a parent resolves it from
  Approvals, which appends its own `pointsApproved`/`pointsDeclined` entry carrying the actual point
  delta — mirroring how `rewardRequested` logs `pts: 0` and `rewardApproved`/`rewardDeclined` carry
  the real delta. Game/reward/points entries and all audit entries are informational-only — never
  undoable here (declining or self-cancelling a still-pending item is done from Approvals or the
  live UI, not the Log). The two fields stay separate in state (`actionLog` is per-profile,
  `auditLog` is shared/mirrored); the merge happens only at render time in `LogPanel`.
- **Profiles** — opens `ProfilesManager`, full CRUD for kid profiles (add/edit name, avatar
  icon+colors, theme; delete with confirm; never deletes the last profile).
- **Advanced Settings** — opens `AdvancedSettingsDrawer`
  (`src/components/parent/AdvancedSettingsDrawer.tsx`) directly — a `Modal` wrapper around
  `SettingsPanel`, which is itself a two-level menu/drill-down router (see below). It's a top-level
  `AccountMenu` item, sibling to Profiles, since it's account-level config rather than day-to-day
  parenting tasks.

The unlocked state (`grownUpUnlocked` in `GravyContext`) is not stored anywhere — it's recomputed on
every render from `authUser` (the Supabase Auth session, which persists across tab/PWA restarts) and
`householdStatus.isMember` (this device's membership in its currently-synced household). So a device
stays unlocked across reopens as long as the parent stays signed in and synced to a household they
belong to; it only re-locks when they sign out (or this device's household membership changes).
`GrownUpsDrawer`/`ProfilesManager`/`ProfileSwitcher`/`AdvancedSettingsDrawer`/`LogDrawer`/
`CalendarDrawer` don't render `SignInPrompt` themselves; they assume they're only opened from
`AccountMenu` once unlocked. `ApprovalsDrawer` is the one exception — it's reached from the `TopBar`
bell, not `AccountMenu`, so it gates itself (see above) rather than assuming.

Every drawer reached directly from `AccountMenu` (the six above) is a first-level drawer and gets
a working back button via the shared `Modal` component's optional `onBack` prop — `Modal` renders a
back-chevron button ahead of the title when `onBack` is passed. Each of these drawers' `onBack`
closes itself and reopens `AccountMenu` (wired in `AppShell`, `src/App.tsx`). `ApprovalsDrawer` has
no `onBack` — reached directly from the bell rather than nested under `AccountMenu`, it has nothing
to go "back" to, so it only shows a close (X) button. Nested panels inside a
drawer (e.g. the picked-date view inside `CalendarPanel`, or the settings menu inside `SettingsPanel`)
use their own existing `onHeaderChange`/`goToRoot` mechanism instead, which takes precedence —
`GrownUpsDrawer`/`CalendarDrawer`/`AdvancedSettingsDrawer` pass `onBack={header.onBack ?? onBack}`,
so back goes to the nested panel's own root first, and only falls through to `AccountMenu` once
you're at that drawer's own top level.

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

`ApprovalsPanel` (approve/decline pending points and pending reward requests) is no longer nested
here — it's reached directly from the `TopBar` bell icon via the standalone, self-gating
`ApprovalsDrawer` (see above), not from `AccountMenu` at all.

`CalendarPanel` (view/edit past days) is no longer nested here — it's reached directly from
`AccountMenu`'s top-level "Calendar" item via the standalone `CalendarDrawer` (see above). The old
"Admin Log" panel (`AuditLogPanel`) was deleted; its content (the shared `auditLog` field) is now
merged into the top-level `LogPanel` reached via `AccountMenu` → "Log" (see above).

`SettingsPanel` (`src/components/parent/SettingsPanel.tsx`) is **not** one of `ParentDashboard`'s
root-menu panels — it's reached directly from `AccountMenu`'s "Advanced Settings" item via
`AdvancedSettingsDrawer`, not nested inside the Game Settings dashboard. It follows the same
two-level menu/drill-down router shape as `ParentDashboard`: a local `root` state (`'menu' |
SettingsDest` where `SettingsDest` is `'timezone' | 'account' | 'sync' | 'reset'`) that renders
`SettingsMenu` (a `menu-card` list, mirroring `RootMenu`) at `'menu'`, and drills into one panel
with a back button otherwise:

- `TimezonePanel` — household time zone.
- `AccountPanel` — signed-in-only view (email + Sign out). There's no not-signed-in form here
  anymore — reaching this screen at all requires being signed in (see `isGrownUpUnlocked`), and
  signing out immediately re-locks `AccountMenu`, closing this screen too. The sign-in form itself
  now lives only in `SignInPrompt` (see above).
- `SyncPanel` (menu label "Family Code") — household code create/join/change/leave. The old "Secure
  this household" claim banner is gone: every household is now claimed (owned) at creation, so the
  unclaimed-state branch it handled can no longer occur.
- `DangerZonePanel` — reset today / reset everything (surfaced as "Reset" on the menu card).

`AdvancedSettingsDrawer` owns the `header` state and passes `onHeaderChange` into `SettingsPanel`,
the same wiring `GrownUpsDrawer` uses for `ParentDashboard` — so the Modal title/back button track
which settings section (if any) is drilled into.

## Onboarding

First-run users (no `localStorage[STORAGE_KEY]` and no `ONBOARDING_DONE_KEY = 'gravy_onboarded'`)
see `Onboarding` instead of the normal home screen — see the check in `AppShell` (`src/App.tsx`).
It's a phase state machine (`welcome → name → walkthrough → account → creating`, with a parallel
`join` phase) built around a three-way fork at `'welcome'`, since account creation is now mandatory
and there's no PIN — a device's only way into parental controls is a signed-in account that's a
member of its synced household (see `isGrownUpUnlocked` in `src/state/auth.ts`):

1. **Set up a new family** — `'name'` (kid's name) → `'walkthrough'` (product tour) → `'account'`
   forced into `signup` mode → on success, `createHousehold()` auto-fires (no custom-code option
   here; that's still available later via `SyncPanel` → "Customize code") → `'creating'` reveals the
   generated code → `finish()`.
2. **"I'm a parent — sign in to join my family"** (link on `'welcome'`) — skips straight to
   `'account'` forced into `signin` mode (no name/walkthrough, since joining pulls the existing
   family's kid profiles) → on success, `'join'` prompts for the family code → `joinHousehold(code)`
   (signed in, so `gravy_lookup_household` auto-adds this account as a `household_members` row —
   the same mechanism a co-parent uses) → `finish()`.
3. **"This is my kid's device — just enter a family code"** (link on `'welcome'`) — skips `'account'`
   entirely, straight to `'join'` → `joinHousehold(code)` called anonymously → `finish()`. This
   device never has an account, so `grownUpUnlocked` stays false on it permanently unless someone
   signs in later via `SignInPrompt` (see above) — which doesn't change this device's own
   no-account default once they sign back out.

`'join'` tracks a `JoinOrigin` (`'welcome' | 'account'`) so Back returns to the right place. Existing
users (saved progress before this feature shipped) are detected via the `STORAGE_KEY` check and skip
past onboarding entirely.

`AccountSetupStep` (`src/components/AccountSetupStep.tsx`) takes an `initialMode` prop (`'signup'`
for fork 1, `'signin'` for fork 2) and reports which mode was actually used back to `Onboarding` via
`onDone(mode)`, so the caller can branch (auto-create a household vs. prompt for a code to join).
There's no "Skip for now" — account creation is mandatory on every path that reaches this phase.
