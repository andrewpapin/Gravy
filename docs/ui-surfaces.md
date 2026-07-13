# UI surfaces

Deep reference for the two user surfaces (kid view + parent dashboard) and onboarding. CLAUDE.md
links here; read it when working on screens, drawers, `AccountMenu`, `ParentDashboard`, or
`Onboarding`.

Both surfaces are reached as overlay drawers/modals from `HomeScreen` (`src/App.tsx` `AppShell`);
there is no router, just boolean open/close state per drawer.

## Kid view (`src/components/`)

`HomeScreen` (avatar/greeting top bar, quick-links pill row, rank/streak stats card, food tray,
daily goals, bonus items) plus drawers for the reward store, the Daily Game, and the rank
ladder. `FoodTray` and `BonusPoints` share a 3-column tile grid (`.tray-grid`/`.goal-grid`,
`.gtile`); `DailyGoals` instead renders as a vertical list of full-width horizontal rows
(`.goal-rows`/`.goal-row`) — icon + name/points on the left, a Complete/Undo button (or the
shared `.gtile-stepper` for multi-step goals) on the right. All three are each wrapped in
`CollapsibleCard`
(`src/components/CollapsibleCard.tsx`), which renders the header as a full-width toggle button
(chevron + progress badge) and persists the collapsed/expanded state per kid via `Settings.
collapsedSections` (`toggleSectionCollapsed` in `GravyContext`) — see `docs/state-model.md`'s
shared-vs-per-kid fields note. `TopBar` holds the avatar, greeting, a bell icon, and the grown-up
menu (hamburger) icon, same as before. Directly below it, `QuickLinksRow` — the first thing inside
the scrollable content — renders three equal-width pills (`.pill-row`/`.home-pill`): `GamesCard`
("Daily", sage, gamepad icon → `onOpenDailyGame`), `StatsPill` ("Stats", coral, trophy icon →
`onOpenRank`), and `PrizesPill` ("Prizes", yellow, gift icon → `onOpenStore`) — quick shortcuts to
screens also reachable from `StatsCard` below (rank ladder, reward store). The pill opens
`DailyGameDrawer` (`src/components/DailyGameDrawer.tsx`, `dailyGameOpen` state in `AppShell`) —
see `docs/systems.md`'s "Daily Game" section for its play/stats/history layout. The parent
dashboard's own "Arcade" label (see below) refers only to its `gamePts` settings panel, not this
drawer. The coin balance and
a second Reward Store entry point live in `StatsCard`'s coins row. There is no kid-facing
calendar/history icon or screen; the only calendar surface is the PIN-gated parent `CalendarPanel`
(see below), reached via `AccountMenu` → "Calendar".

`RankScreen` (opened by both `StatsPill` and `StatsCard`) is more than a rank ladder: below the
24-tier ladder and the 4 streak chips, it renders a run of kid-facing chart sections —
`src/components/stats/*` — covering points/rank growth over time, a 12-week GitHub-style activity
heatmap, personal bests (best day ever, lifetime full-tray/combo days, longest-ever streaks),
a 4-week daily-goals trend, favorite foods, a games/win-rate breakdown, and recent reward
redemptions. All of it is derived client-side from existing state (`dayLogs`/`counters`/
`actionLog` — see `src/state/statsSnapshot.ts` and the memoizing `useStatsSnapshot` hook); no new
persisted fields or backend calls. Charts are hand-rolled SVG/CSS (`src/components/charts/
{Sparkline,BarChart,HeatmapGrid,StatTile}.tsx`) since the app has no charting library dependency.
`RankScreen` itself was migrated from its old hand-rolled bottom-sheet markup onto the shared
`Modal` component as part of this, matching every other drawer.

The bell icon opens `ApprovalsDrawer` directly — Approvals is no longer an `AccountMenu` item (it
used to be the first one); it's its own top-level entry point next to the hamburger, marked with a
count pill via the `nav-badge` CSS class with `data-count={pendingRewards.length + pendingPointsAwards.length}`.
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
not yet a member of this device's household). The sign-in form's "Forgot password?" link swaps to a
third internal mode that just collects an email and calls `sendPasswordReset` (`src/state/auth.ts`,
wrapping `supabase.auth.resetPasswordForEmail`) — the reset email's link returns the user to the
app's origin, where Supabase fires a `PASSWORD_RECOVERY` auth event (`onPasswordRecovery` in
`auth.ts`) that `useHouseholdSync` turns into the `passwordRecovery` context flag. `AppShell`
(`src/App.tsx`) renders the full-screen `ResetPasswordScreen` overlay whenever that flag is true,
above every other overlay (mounted last, after `ReleaseNotesDrawer`) since a parent can land on that
link at any point in the app; it collects a new password, calls `updatePassword`, and the "Continue"
button clears the flag once the parent confirms. There's no explicit "unlock" call: `grownUpUnlocked`
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
  Renamed because, with Approvals/Calendar/Advanced Settings all graduated to top-level items (see
  below and this list), all that's left inside is gamification config (Goals/Store) — "Game
  Settings" describes that scope more accurately than the old catch-all "Grown ups" label.
- **Calendar** — opens `CalendarDrawer` (`src/components/parent/CalendarDrawer.tsx`), a thin
  `Modal` wrapper around `CalendarPanel` (view/edit past days) — a first-class `AccountMenu` item,
  sibling to "Game Settings", rather than nested inside the Game Settings dashboard.
- **Profiles** — opens `ProfilesManager`, full CRUD for kid profiles (add/edit name, avatar
  icon+colors, theme; delete with confirm; never deletes the last profile).
- **Advanced Settings** — opens `AdvancedSettingsDrawer`
  (`src/components/parent/AdvancedSettingsDrawer.tsx`) directly — a `Modal` wrapper around
  `SettingsPanel`, which is itself a two-level menu/drill-down router (see below), and includes
  the Log (see below) as one of its nested panels. It's a top-level `AccountMenu` item, sibling to
  Profiles, since it's account-level config rather than day-to-day parenting tasks.

The unlocked state (`grownUpUnlocked` in `GravyContext`) is not stored anywhere — it's recomputed on
every render from `authUser` (the Supabase Auth session, which persists across tab/PWA restarts) and
`householdStatus.isMember` (this device's membership in its currently-synced household). So a device
stays unlocked across reopens as long as the parent stays signed in and synced to a household they
belong to; it only re-locks when they sign out (or this device's household membership changes).
`GrownUpsDrawer`/`ProfilesManager`/`ProfileSwitcher`/`AdvancedSettingsDrawer`/`CalendarDrawer` don't
render `SignInPrompt` themselves; they assume they're only opened from `AccountMenu` once unlocked.
`ApprovalsDrawer` is the one exception — it's reached from the `TopBar` bell, not `AccountMenu`, so
it gates itself (see above) rather than assuming.

Every drawer reached directly from `AccountMenu` (the five above) is a first-level drawer and gets
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

`ParentDashboard` is a two-level router: a local `root` state (`'menu' | 'daily-goals' |
'food-tray' | 'bonus-points' | 'store' | 'arcade'`). At `'menu'` it renders `RootMenu` (a 5-card
list, not tabs); picking a card drills into one panel with a back button:

- `GoalsPanel` — goal CRUD, now taking a required `filter: 'daily' | 'bonus'` prop rather than
  showing both types on one screen; `'daily-goals'` and `'bonus-points'` each mount
  `GoalsPanel` with a different `filter`, so the add/edit drawer and list only ever deal with
  one goal type at a time (no in-panel Daily/Bonus switch — converting a goal's type is
  remove-and-re-add on the other screen). Add/edit both go through a single stacked `Modal`
  drawer (`overlayClassName="item-edit-drawer-overlay"`, layered above the Game Settings modal
  the same way `ReleaseNotesDrawer` layers above the base modal): a "+ Add a Goal"/"+ Add a
  Bonus Item" button opens it empty, a pencil (`faPenToSquare`) button on each row opens it
  pre-filled; Cancel/Save sit in one row, with a full-width Delete button below them (edit mode
  only) that swaps in an inline "This can't be undone" confirm — mirroring the delete-confirm
  block `ProfilesManager` already uses for deleting a kid profile — rather than a separate
  `ConfirmDialog` popup.
- `PointsPanel` — food-tray point values (one points input per `FOODS` item,
  `Settings.foodPtsByItem`, set via `saveFoodPts`, plus the full-tray `bonusPts`); its own
  top-level `'food-tray'` destination rather than nested inside `GoalsPanel`. Unlike
  `GoalsPanel`/`StorePanel` there's nothing to add or delete here, so it keeps the older
  inline-input-with-autosave editing style.
- `StorePanel` — reward CRUD, its own top-level `'store'` destination; same pencil-triggered
  add/edit drawer pattern as `GoalsPanel` (icon, name, cost instead of pts/target). The add/edit
  drawer also has an optional dollar `valueUsd` field (`Reward.valueUsd` in `types.ts`); once set,
  it shows a computed "≈ N days to earn" estimate using `getAverageDailyPoints`
  (`state/statsSnapshot.ts`, a trailing-14-day average including zero-point days), so a parent can
  gauge a reward's cost against the kid's real pace.
- `ArcadePanel` — base payout for the Daily Game (`gamePts`), labeled "Arcade" (its own top-level
  `'arcade'` destination, unrelated to goals/food/reward configuration) — a legacy label kept
  distinct from the kid-facing "Daily Game" drawer so the two settings surfaces aren't confused.

`ApprovalsPanel` (approve/decline pending points and pending reward requests) is no longer nested
here — it's reached directly from the `TopBar` bell icon via the standalone, self-gating
`ApprovalsDrawer` (see above), not from `AccountMenu` at all.

`CalendarPanel` (view/edit past days) is no longer nested here — it's reached directly from
`AccountMenu`'s top-level "Calendar" item via the standalone `CalendarDrawer` (see above). The old
"Admin Log" panel (`AuditLogPanel`) was deleted; its content (the shared `auditLog` field) is now
merged into `LogPanel`, nested inside `SettingsPanel` and reached via `AccountMenu` → "Advanced
Settings" → "Log" (see below).

`SettingsPanel` (`src/components/parent/SettingsPanel.tsx`) is **not** one of `ParentDashboard`'s
root-menu panels — it's reached directly from `AccountMenu`'s "Advanced Settings" item via
`AdvancedSettingsDrawer`, not nested inside the Game Settings dashboard. It follows the same
two-level menu/drill-down router shape as `ParentDashboard`: a local `root` state (`'menu' |
SettingsDest` where `SettingsDest` is `'timezone' | 'account' | 'sync' | 'log' | 'reset'`) that
renders `SettingsMenu` (a `menu-card` list, mirroring `RootMenu`) at `'menu'`, and drills into one
panel with a back button otherwise:

- `TimezonePanel` — household time zone.
- `AccountPanel` — signed-in-only view (email + Sign out). There's no not-signed-in form here
  anymore — reaching this screen at all requires being signed in (see `isGrownUpUnlocked`), and
  signing out immediately re-locks `AccountMenu`, closing this screen too. The sign-in form itself
  now lives only in `SignInPrompt` (see above).
- `SyncPanel` (menu label "Family Code") — household code create/join/change/leave. The old "Secure
  this household" claim banner is gone: every household is now claimed (owned) at creation, so the
  unclaimed-state branch it handled can no longer occur.
- `LogPanel` (`src/components/parent/LogPanel.tsx`, menu label "Log") — merges and time-sorts
  (newest first) two separate fields for display: the active profile's `actionLog` — kid-progress
  and reward actions only (food logged/removed, daily-goal steps, bonus-item taps, game wins,
  reward requested/approved/declined, points approved/declined, plus the Calendar's `*ForDay`
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
- `DangerZonePanel` — reset today / reset everything (surfaced as "Reset" on the menu card).

`AdvancedSettingsDrawer` owns the `header` state and passes `onHeaderChange` into `SettingsPanel`,
the same wiring `GrownUpsDrawer` uses for `ParentDashboard` — so the Modal title/back button track
which settings section (if any) is drilled into.

## Onboarding

First-run users (no `localStorage[STORAGE_KEY]` and no `ONBOARDING_DONE_KEY = 'gravy_onboarded'`)
see `Onboarding` instead of the normal home screen — see the check in `AppShell` (`src/App.tsx`).
It's a phase state machine (`welcome → account → join → creating`) built around a three-button
fork at `'welcome'` — **New Family**, **Existing Parent**, **Existing Kid** — since account creation
is now mandatory and there's no PIN — a device's only way into parental controls is a signed-in
account that's a member of its synced household (see `isGrownUpUnlocked` in `src/state/auth.ts`).
The kid's name and the guided app tour both happen *after* this component hands off to the main
app, not as part of it — see "First-Run Guided Tour" below.

1. **New Family** — `'account'` forced into `signup` mode. Signing up may land on a "Check Your
   Email" pending-confirmation screen inside `AccountSetupStep` first (see below) if the Supabase
   project requires confirming email — a dashboard setting, not visible in this repo. Once
   `authUser` resolves (immediately, or after the confirmation link is opened in any tab —
   Supabase mirrors sessions across tabs via localStorage, so no polling is needed), `onDone('signup')`
   fires `startCreate()` → `createHousehold()` (no custom-code option here; that's still available
   later via `SyncPanel` → "Customize code") → on success, `finish({ isNewFamily: true })` directly.
   There's no code-reveal screen anymore — the family code is instead one of the guided tour's steps.
2. **Existing Parent** — `'account'` forced into `signin` mode → on success, `onDone('signin')` calls
   `findMyHousehold()` (wraps the `gravy_my_household_code` RPC, keyed by the signed-in account's
   `household_members` row rather than a code) and, if it returns one, `joinHousehold(code)`
   automatically — no manual code entry. If the account has no household yet (a fresh account, or
   the lookup failed), falls back to the same manual `'join'` phase fork 3 uses, with an explanatory
   note.
3. **Existing Kid** — skips `'account'` entirely, straight to `'join'` → `joinHousehold(code)` called
   anonymously → `finish({ isNewFamily: false })`. This device never has an account, so
   `grownUpUnlocked` stays false on it permanently unless someone signs in later via `SignInPrompt`
   (see above) — which doesn't change this device's own no-account default once they sign back out.

`Onboarding`'s `onComplete` prop is `(result: { isNewFamily: boolean }) => void` — the one signal
`AppShell` needs to decide whether the kid-name prompt should run before the tour (fork 1 only;
joining an existing household means its kid profiles already synced in). Existing users (saved
progress before this feature shipped) are detected via the `STORAGE_KEY` check and skip past
onboarding entirely.

`AccountSetupStep` (`src/components/AccountSetupStep.tsx`) takes an `initialMode` prop (`'signup'`
for fork 1, `'signin'` for fork 2) and reports which mode was actually used back to `Onboarding` via
`onDone(mode)`. For signup, it also handles the pending-confirmation branch: `signUpWithPassword`
(now `emailRedirectTo`-aware) returns `{ ok: true, needsConfirmation }`; when `needsConfirmation` is
true, the component shows "Check Your Email" (with a "Resend confirmation email" action via
`resendConfirmation`) until the existing `if (authUser)` branch picks up the session on its own.
There's no "Skip for now" — account creation is mandatory on every path that reaches this phase. Its
sign-in mode has the same "Forgot password?" sub-flow as `SignInPrompt` (see above), reusing
`sendPasswordReset`.

## First-Run Guided Tour (`src/components/tour/`)

Once `Onboarding` completes, `AppShell` mounts two more on-top-of-`HomeScreen` overlays (not part of
`Onboarding` itself — the main app is already live underneath them), gated by their own
`localStorage` flags so they only ever run once per device, exactly mirroring `ONBOARDING_DONE_KEY`'s
existing bypass for installs that predate this feature:

- **`FirstKidPrompt`** — New-Family-only (`needsFirstKid`, set from `Onboarding`'s
  `onComplete({ isNewFamily })`). Asks for the first kid's name (more can be added later via
  Profiles) and calls the same `saveSetting('childName', ...)` the old in-onboarding `'name'` phase
  used to call.
- **`HomeTour`** — runs after `FirstKidPrompt` (or immediately, for forks 2/3) once per device, via
  `HOME_TOUR_DONE_KEY = 'gravy_home_tour_done'` (`src/state/defaultState.ts`). Steps through
  `src/data/tourSteps.ts`'s `TOUR_STEPS`, spotlighting real elements by `data-tour-id` (added to
  `GamesCard`, `StatsPill`, `PrizesPill`, `TopBar`'s hamburger button, and `CollapsibleCard` via a
  `tourId` prop passed from `FoodTray`/`DailyGoals`) instead of the old static 4-slide walkthrough.
  `Spotlight` (`src/components/tour/Spotlight.tsx`) is the dependency-free cutout primitive: a fixed
  div sized to the target's `getBoundingClientRect()` with a huge spread `box-shadow` dimming
  everywhere else; the one step with no target (the opening slide) dims the whole screen instead.
  The last step shows the real household code, folding in what used to be a dedicated
  post-creation code-reveal screen.
