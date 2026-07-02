# Gravy — External Code Audit

**Scope:** Full codebase — React 19 + TypeScript + Vite, client-side-only PWA with optional
Supabase cloud sync (~9,800 LOC across `src/`), plus build/CI config, SQL migrations, and
project documentation. This is a fresh-eyes review; no prior familiarity with the codebase
or its design intent was assumed. Findings are based on static reading of the repository
only — no dynamic/browser testing, no `npm audit` run (no `node_modules` installed in the
review environment), no visual contrast measurement.

**Auditor's note on existing documentation:** this repo already has strong internal
tracking (`BACKLOG.md`/`BACKLOG_DONE.md`, `docs/`, `DATA_HANDLING.md`) and a prior review
(`CODE_REVIEW.md`). Where a finding below is already tracked in `BACKLOG.md`, that's called
out explicitly rather than presented as new. `CODE_REVIEW.md` itself, however, is now stale
— it describes a PIN-unlock system and a badge system that have both been **fully removed**
from the codebase since it was written, and its findings on those subsystems are moot. That
staleness is itself flagged as a finding (see Developer Experience).

---

## 1. Executive Summary

Gravy is in noticeably better shape than most small-team side projects: the dependency list
is lean and current, there's a real automated CI gate (lint → test → build) before deploy,
accessibility fundamentals (semantic buttons, focus trapping, aria-labels) are solidly above
average, and the Supabase migration history shows genuine, iterative security hardening
rather than a one-time pass. The team's own docs are candid about tradeoffs rather than
silent about them, which made this audit easier and more productive. The most significant
open issue is the `households` table's fully-open `SELECT` policy — already tracked
internally, but this audit found a sharper reason to prioritize it: the signed-in parent's
**email address is now embedded in the synced audit log** and is therefore readable by
anyone with the app's public key, directly contradicting the written data-handling policy.
Beyond that, the recurring secondary themes are: duplicated CRUD/router logic across a
handful of parent-facing panels, a single unmemoized global context that every component
subscribes to, zero component-level automated test coverage, and one stale artifact
(`CODE_REVIEW.md`) plus one broken artifact (`verify_gravy.mjs`) that could each mislead a
future contributor into false confidence if left as-is.

---

## 2. Quick Wins

Low-effort, high-impact items, roughly in the order they'd take to fix:

- **Label or retire `CODE_REVIEW.md`.** It describes a PIN-unlock system and badge system
  that no longer exist. Mark it "historical — superseded" or delete it; leaving it
  unlabeled will mislead the next person who opens it.
- **Fix or delete `verify_gravy.mjs`.** It asserts against `.pin-key`/`.pin-dot`/`.nav-btn`
  selectors that don't exist in the current app — running it today fails immediately. It
  looks like a smoke test but currently isn't one.
- **Add `aria-live="polite"` to `ToastContainer`.** One attribute, makes point-award/error/
  sync toasts audible to screen-reader users.
- **Add `maxLength` to goal/reward name inputs** in `GoalsPanel.tsx`/`StorePanel.tsx`,
  matching the existing pattern on child name (20) and join code (6).
- **Move `@capacitor/core` from `dependencies` to `devDependencies`** in `package.json` — it
  is never imported anywhere in `src/`.
- **Add explicit `<label>` elements** to the numeric inputs in `GoalsPanel.tsx`/
  `StorePanel.tsx`/`PointsPanel.tsx` and the name input in `ProfilesManager.tsx` — currently
  identified only by placeholder text.
- **Enable `"strict": true`** in `tsconfig.app.json`/`tsconfig.node.json` (see finding under
  Developer Experience) and work through whatever it surfaces.

---

## 3. Findings by Category

### 3.1 Bugs & Correctness

#### Double state-write on profile name edit
- **Category:** Bugs & Correctness
- **Severity:** Low
- **Location:** `src/components/ProfilesManager.tsx:138-139`
- **Description:** The name-edit `<input>` calls `updateProfile` on every `onChange`
  keystroke *and again* on `onBlur`. Given the global context is unmemoized (see §3.2), each
  keystroke already triggers a full context-value rebuild and re-render of every `useGravy()`
  consumer; the blur handler then fires a second, redundant write of the same final value.
  Not data-corrupting, but it's doing more work than intended and suggests the pattern was
  copy-adjusted rather than designed — buffering local state and committing once on blur
  would be both correct and cheaper.
- **Recommendation:** Buffer the edited name in local component state; call `updateProfile`
  only from `onBlur` (or on Enter), not on every keystroke.

#### `UpdatePrompt` ignores its own "prompt" registration mode
- **Category:** Bugs & Correctness
- **Severity:** Low
- **Location:** `src/components/UpdatePrompt.tsx:22-24`; `vite.config.ts` (`registerType: 'prompt'`)
- **Description:** The PWA is configured with `registerType: 'prompt'`, which implies the
  service worker should wait for user confirmation before activating a new version. But
  `UpdatePrompt` does:
  ```tsx
  useEffect(() => {
    if (needRefresh) updateServiceWorker(true);
  }, [needRefresh, updateServiceWorker]);
  ```
  This calls `updateServiceWorker(true)` — which force-reloads the page — the instant
  `needRefresh` flips true, with no actual yes/no interaction. The visible "Updating to the
  latest version…" banner is purely informational; it appears *while* the reload is already
  in flight, not before it. A kid or parent mid-interaction (filling a form, mid-game) can
  have the page reloaded out from under them with no way to defer it.
- **Recommendation:** Either switch `registerType` to `'autoUpdate'` to match the actual
  behavior (simplest fix, removes the misleading name), or make the banner an actual prompt
  with a button that calls `updateServiceWorker(true)` only on user action.

#### Inconsistent `useCallback` dependency arrays in kid-progress actions
- **Category:** Bugs & Correctness
- **Severity:** Low
- **Location:** `src/state/actions/useKidProgressActions.ts` — compare `removeFood`/
  `decrementGoal`/`undoBonusItem`/`declineGameWin` (dep array `[setState]` only) against
  `logFood`/`incrementGoal` (full dep arrays including `awardPoints`, `maybeCelebrateRankUp`,
  `showCelebration`, `showToast`, `actorRef`, `requiresApproval`)
- **Description:** Not a live bug today — the omitted dependencies in the first group are
  stable module-level imports, not props or state, so there's no actual stale-closure issue.
  But the inconsistency within the same file is a trap: if someone later converts one of
  those "stable" imports into a prop or piece of state (a very plausible future edit), the
  functions with the trimmed dependency array will silently start reading stale values, and
  nothing in the file's own conventions would warn the editor to check.
- **Recommendation:** Normalize to listing full, accurate dependency arrays throughout the
  file (ESLint's `react-hooks/exhaustive-deps` rule, already part of the flat config, would
  catch true violations — worth confirming it's not being locally suppressed here).

---

### 3.2 Architecture & Structure

#### Single unmemoized, unsliced global context
- **Category:** Architecture & Structure
- **Severity:** Medium
- **Location:** `src/state/GravyContext.tsx:325-348`
- **Description:** The entire app's state — kid progress, toasts, celebrations, sync status,
  auth, every imperative action — flows through one `React.Context` whose `value` object is
  a fresh object literal built by spreading six action-hook results on every provider
  render, with no `useMemo` wrapping it. Because there is exactly one context for everything,
  every component calling `useGravy()` re-renders on *any* state change — a toast fading out
  re-renders `HomeScreen`, `FoodTray`, `StatsCard`, etc., even though none of them read toast
  state. There's no context-splitting (e.g. a separate `ToastContext`/`SyncContext`) and no
  selector pattern. At the app's current size this is unlikely to cause visible jank, but
  it's the single biggest structural scalability risk as more screens/state are added (see
  §3.10), and it compounds with the fact that zero components anywhere use `React.memo`.
- **Recommendation:** Two independent, combinable fixes: (1) wrap the context `value` in
  `useMemo` keyed on its actual dependencies so at least referential-equality-based
  optimizations (e.g. `React.memo` on children) become possible; (2) split the context along
  natural boundaries (e.g. toasts/celebration vs. core game state vs. sync/auth status) so a
  toast update doesn't force every consumer to re-render.

#### `AppShell` overlay state is ten independent booleans
- **Category:** Architecture & Structure
- **Severity:** Low-Medium
- **Location:** `src/App.tsx:53-62`
- **Description:** `AppShell` tracks which drawer/overlay is open via ten separate
  `useState<boolean>` flags (`storeOpen`, `gamesOpen`, `rankOpen`, `accountMenuOpen`,
  `grownUpsOpen`, `switchProfileOpen`, `profilesOpen`, `settingsOpen`, `calendarOpen`,
  `approvalsOpen`). Nothing in the type system prevents two of these from being `true`
  simultaneously, and every new overlay added to the app means one more boolean plus one
  more explicit "close everything else" wiring point scattered through the open handlers.
- **Recommendation:** Replace with a single `activeOverlay: OverlayKey | null` state (a
  discriminated union of the overlay names). This makes "only one overlay open at a time" true
  by construction rather than by convention, and adding a new overlay becomes a one-line
  addition to the union rather than a new state variable plus new wiring.

#### Duplicated "menu/detail router + header-sync effect" pattern
- **Category:** Architecture & Structure
- **Severity:** Low
- **Location:** `src/components/parent/ParentDashboard.tsx:7-36`, `src/components/parent/SettingsPanel.tsx:10-45`, and (partially) `src/components/parent/CalendarPanel.tsx:16-22`
- **Description:** The same shape — a `root: 'menu' | Dest` union, a `ROOT_TITLES` lookup
  table, and a `useEffect` that syncs the drawer header title/back-button based on `root` —
  is implemented three separate times, byte-for-byte structurally identical apart from the
  destination names. Same story for the `{ title, onBack }` header-state object, redefined
  identically as a local `HeaderState` interface in `GrownUpsDrawer.tsx:10-13`,
  `AdvancedSettingsDrawer.tsx:5-8`, and `CalendarDrawer.tsx:5-8`.
- **Recommendation:** Extract a shared `useSubPanelRouter<T>(titles, initialTitle)` hook and
  a shared `useDrawerHeader(initialTitle)` hook. Together these would remove the duplication
  in six files and mean a future bug fix (e.g. to how the back button behaves) only needs to
  land once.

#### No baseline SQL migration for the `households` table
- **Category:** Architecture & Structure
- **Severity:** Low (process hygiene)
- **Location:** `supabase/migrations/` (earliest file: `20260623000000_scope_household_mutations.sql`)
- **Description:** The six migrations in this directory all modify or reference an existing
  `households` table, but the table's original `CREATE TABLE` statement and its
  originally-open RLS policies aren't present anywhere in the migrations directory — the
  earliest migration's own comment refers to "the existing... policies" as pre-existing
  state. This means the schema can't be fully reconstructed from the repo alone; someone
  provisioning a fresh Supabase project via `supabase db reset` would get a broken/incomplete
  schema.
- **Recommendation:** Add a `0000_init.sql` (or similarly early-sorting) baseline migration
  that creates `households` with its current, correct shape and policies, so the migration
  history is self-contained and reproducible from a blank project.

---

### 3.3 Code Quality

#### Duplicated CRUD scaffolding between `GoalsPanel` and `StorePanel`
- **Category:** Code Quality
- **Severity:** Medium
- **Location:** `src/components/parent/GoalsPanel.tsx:68-166` vs `src/components/parent/StorePanel.tsx:11-126`
- **Description:** `StorePanel` is essentially a stripped-down copy of `GoalsPanel`'s
  add/edit-reward flow — the same `editingId`/`editX` state shape, the same
  `startEdit`/`saveEdit`/`handleAdd` handlers, and the same inline form/edit-row/display-row
  JSX structure, hand-duplicated rather than shared. `GoalsPanel` additionally factors its
  form fields into a `GoalFormFields` sub-component, but the surrounding CRUD scaffolding
  (edit-state object, save/cancel handlers) is copy-pasted, not shared — meaning a
  validation fix applied to one form won't automatically propagate to the other.
- **Recommendation:** Extract a generic `useEditableList<T>` hook (or a shared
  `<CrudPanel>` component) that owns the `editingId`/edit-buffer state and save/cancel/delete
  handlers, parameterized by the item shape and a form-fields renderer. Would remove roughly
  80 lines of duplication.

#### Theme set is hand-encoded in three unsynchronized places
- **Category:** Code Quality
- **Severity:** Low
- **Location:** `src/index.css` (`:root[data-theme=...]` blocks, lines 71-152+), `THEME_COLORS` in `src/state/GravyContext.tsx:35-43`, `THEME_OPTIONS` in `src/components/ProfilesManager.tsx:12-20`
- **Description:** "The set of available themes" is encoded independently in three places:
  the CSS theme-token blocks, a PWA `theme-color` meta-value lookup, and a UI label list for
  the theme picker. A shared `Theme` union type (`src/state/types.ts`) prevents a *typo'd*
  theme id from compiling, but nothing prevents a *missing* entry — e.g. adding a new theme
  to the CSS without remembering to add it to `THEME_COLORS` would compile fine and silently
  produce a wrong PWA chrome color for that theme.
- **Recommendation:** Derive `THEME_OPTIONS`/`THEME_COLORS` from a single typed source of
  truth (e.g. one `THEMES: Record<Theme, {...}>` object that both the color-picker UI and the
  PWA meta-color logic read from), so the `Theme` union type's exhaustiveness checking
  actually covers all three consumers.

#### `Onboarding.tsx` — largest component, flat-state wizard with hand-rolled back-navigation
- **Category:** Code Quality
- **Severity:** Medium
- **Location:** `src/components/Onboarding.tsx` (306 lines; phase state at lines 57-67; `handleBack` at lines 125-141)
- **Description:** This is the single largest and most complex component in the app: a
  6-phase (`welcome | join | name | walkthrough | account | creating`) wizard with two entry
  origins and two return-paths, modeled as flat sibling `useState` calls rather than a single
  state machine. `handleBack` is a nested if/else chain that has to independently know every
  phase's provenance to decide where "back" goes. Adding a 7th phase requires touching
  `handleBack`, `showBack`, `showDots`, and `activeDot` in four separate places — this is
  exactly the shape that gets a subtle bug (wrong back-target for some phase combination)
  the next time someone extends it without re-deriving all four call sites correctly.
- **Recommendation:** Model the wizard as a `useReducer` with explicit
  `{ type: 'GO_BACK' | 'ADVANCE_TO', ... }` transitions instead of ad-hoc booleans/strings —
  this makes every valid transition (including "back") explicit and centralizes the logic
  `handleBack` currently has to infer.

#### Icon registry requires touching three places per icon
- **Category:** Code Quality
- **Severity:** Low
- **Location:** `src/data/icons.ts` (import block lines 2-36; `ICONS` map lines 46-173; `PICKER_ICONS`/`AVATAR_ICONS` lines 193/251)
- **Description:** Adding one pickable icon requires: (1) importing it from FontAwesome,
  (2) adding it to the flat `ICONS` registry, and (3) adding it to `PICKER_ICONS` and/or
  `AVATAR_ICONS` if it should be user-selectable. Nothing enforces that these stay in sync —
  it's easy to add an icon to `ICONS` and forget to make it pickable, or vice versa.
- **Recommendation:** Low priority given the current ~110-icon scale, but worth a lint rule
  or a small unit test asserting `PICKER_ICONS`/`AVATAR_ICONS` are subsets of `ICONS`'s keys,
  so a typo'd or missing entry fails fast rather than silently rendering a fallback glyph.

---

### 3.4 Performance

#### Zero use of `React.memo` anywhere in the app
- **Category:** Performance
- **Severity:** Low-Medium
- **Location:** Codebase-wide; see also §3.2's unmemoized context finding
- **Description:** No display component — including list-rendering ones like `DailyGoals`,
  `BonusPoints`, `FoodTray`, `GoalsPanel`, `StorePanel`, `LogPanel` — is wrapped in
  `React.memo`. Combined with the unmemoized context value (§3.2), this means every one of
  these components re-renders in full on every context change, regardless of whether the
  specific state it reads changed. All the lists involved are small today (5 foods,
  single-digit goals/rewards), so this is low-severity in practice right now, but it's the
  performance-facing symptom of the same root cause as the architecture finding above.
- **Recommendation:** Not urgent at current scale. If profiling ever shows jank (e.g. once
  log-heavy households or more simultaneous UI surfaces exist), memoizing the context value
  and wrapping the highest-render-frequency leaf components (food/goal/bonus tiles) would be
  the first place to look.

#### Unbounded, un-virtualized merge+sort in `LogPanel`
- **Category:** Performance
- **Severity:** Low
- **Location:** `src/components/parent/LogPanel.tsx:67-70`
- **Description:** `LogPanel` concatenates `state.actionLog` and `state.auditLog` and
  sorts the merged array on every render, with no pagination or virtualization. Both logs
  are capped (500/300 entries respectively, oldest evicted first), so this doesn't grow
  unboundedly, but a merge-sort of up to 800 entries on every render of an open Log panel is
  more work than necessary for what's likely a short visible list.
- **Recommendation:** Memoize the merged/sorted array with `useMemo` keyed on the two log
  arrays, and consider paginating or windowing the rendered list rather than rendering all
  entries at once.

#### Full deep-clone (`JSON.parse(JSON.stringify(...))`) on every single state mutation
- **Category:** Performance
- **Severity:** Low
- **Location:** `src/state/actions/shared.ts` (the `clone` helper used by every action hook)
- **Description:** Every mutation — a single food tap, a single goal tap — clones the
  entire `GravyState` via `JSON.parse(JSON.stringify(prev))` before mutating the copy. This
  is simple and correct (no risk of accidentally mutating shared references), but its cost
  scales with the size of `GravyState`, which includes `dayLogs`/`actionLog`/`auditLog` — so
  the cost of *every* action grows as a household's history grows, even though only a small
  part of the state actually changes per action.
- **Recommendation:** Not worth changing today given the log caps keep this bounded. If it
  ever becomes measurable, a structural-sharing approach (e.g. Immer, or hand-written shallow
  copies of only the touched sub-trees) would decouple per-action cost from total history size.

---

### 3.5 Security

#### `households` table SELECT policy is fully open — and now confirmed to leak the parent's email
- **Category:** Security
- **Severity:** Medium-High
- **Location:** `supabase/migrations/20260627000000_auth_household_ownership.sql:47-49` (RLS policy); `src/state/auditLog.ts:16-19` (email embedding); `src/state/useHouseholdSync.ts:77` (email source); `DATA_HANDLING.md` (contradicted claim)
- **Description:** The `households` table's `SELECT` policy is `using (true)` for both
  `anon` and `authenticated` roles — any holder of the app's public key (i.e. anyone who
  loads the deployed site) can query `SELECT * FROM households` directly via the Supabase
  REST endpoint and read **every household's full state**, not just households whose 6-char
  code they know. This is a real, currently-live gap, and it's already tracked in
  `BACKLOG.md` (Epic 9) as an accepted, deliberately-deferred risk — deferred because
  Supabase Realtime's `postgres_changes` delivery needs SELECT permission to work at all, and
  there's currently no per-household auth claim to scope it by instead.

  What this audit adds: `appendAuditLog` (`src/state/auditLog.ts:16-19`) stamps every
  admin/destructive action with `actorLabel`, which is populated from the signed-in parent's
  **email address** (`useHouseholdSync.ts:77`: `{ userId, label: email }`). `auditLog` is
  part of `GravyState`, which is part of the JSONB blob synced into `households.state` — the
  exact column exposed by the open SELECT policy. This directly contradicts
  `DATA_HANDLING.md`'s stated claim that the parent's email "lives in Supabase's managed
  `auth.users` table, not in the app's `state` JSONB." In practice: any household that has
  performed at least one admin action (editing a goal, adding a reward, etc.) while signed in
  has that parent's email address readable by any anonymous party who queries the table
  directly, for every household in the deployment, not just their own.
- **Recommendation:** Two independent actions, both worth doing regardless of order: (1)
  treat the SELECT-scoping work in `BACKLOG.md` Epic 9 as higher priority given this new
  finding — even a coarse per-household scoping (e.g. requiring the 6-char code as a query
  parameter checked by a `SECURITY DEFINER` function, rather than a blanket table SELECT)
  would close the "read every household" exposure; (2) regardless of the RLS timeline, stop
  persisting the raw email into `actorLabel` — store only `userId` in the synced audit log
  and resolve it to a display label client-side from the locally-known signed-in account,
  rather than writing the email itself into synced state. This second fix is small,
  independent of the RLS fix, and directly restores the guarantee `DATA_HANDLING.md` already
  claims to make.

#### Client-side-only parent-gate has no server-mirrored authorization check
- **Category:** Security
- **Severity:** Low-Medium
- **Location:** `src/state/auth.ts:114-116` (`isGrownUpUnlocked`); `src/state/actions/useCatalogActions.ts` (mutation functions); `supabase/migrations/...` (`gravy_upsert_household_state`)
- **Description:** `isGrownUpUnlocked` is a pure client-side rendering predicate — every
  parent-only panel checks it to decide whether to show `SignInPrompt` instead of real
  content. The actual mutation functions it gates (`addGoal`, `removeGoal`, `updateReward`,
  `saveSetting`, etc. in `useCatalogActions.ts`) have no authorization check of their own;
  they're reachable purely because the UI doesn't render a path to call them when locked.
  Separately, the `gravy_upsert_household_state` RPC's existing-row branch intentionally
  allows anonymous writes to an already-claimed household (by design, so a kid-only device
  can sync without an account) — it only checks that the household code is valid, not that
  the shape of the write looks like something a "kid mode" client would send. Combined: a
  household member with DevTools access (which, notably, is guaranteed to include anyone
  whose device already holds that household's own sync code) could call the catalog action
  functions directly from the console, or `fetch`/`curl` the RPC directly, to inflate points,
  edit rewards, or change settings without ever unlocking the parent gate. This is explicitly
  and honestly documented as an accepted tradeoff in `docs/persistence-and-sync.md`.
- **Recommendation:** Given the documented product intent (frictionless kid-device sync
  without mandatory accounts for every child), this is a reasonable tradeoff rather than an
  oversight — but the audit recommends an explicit, written sign-off on the threat model
  (attacker is a household member, blast radius is limited to that one household's own
  gamification data) so it's a deliberate decision rather than an implicit one. If tightened
  later, the RPC could validate that the write's `state` shape only touches fields a
  "kid-mode" client is expected to touch (points/logs), rejecting writes that modify
  `goals`/`rewards`/`settings` unless the caller is an authenticated member — closing the gap
  without requiring every child to have an account.

#### Hardcoded Supabase URL and key, no environment-variable indirection
- **Category:** Security
- **Severity:** Low
- **Location:** `src/lib/supabaseClient.ts:3-4`
- **Description:** The Supabase project URL and `sb_publishable_...` key are hardcoded
  directly in source, with no `import.meta.env` usage anywhere in the repo. The key itself is
  not a live secret — it's Supabase's publishable-key format, explicitly designed to ship in
  client bundles, and its actual safety is entirely a function of RLS/RPC scoping on the
  server (see the finding above). This is a config-hygiene gap, not a live vulnerability: it
  means there's no way to point the app at a staging/dev Supabase project without editing
  source, and no established convention if a future config value genuinely needs to be
  environment-specific.
- **Recommendation:** Move both values to `import.meta.env.VITE_SUPABASE_URL`/
  `VITE_SUPABASE_ANON_KEY` with a committed `.env.example` documenting the expected shape.
  Low priority, but cheap and establishes a pattern for the future.

#### No Content-Security-Policy
- **Category:** Security
- **Severity:** Low / Informational
- **Location:** `index.html`
- **Description:** No CSP `<meta>` tag is present. No active injection sink was found
  anywhere in the codebase during this review (no `dangerouslySetInnerHTML`, `eval`,
  `innerHTML`, or unescaped user-input rendering — confirmed via full-repo grep), so this is
  defense-in-depth rather than a response to an identified vulnerability.
- **Recommendation:** Add a reasonably strict CSP meta tag. The current `<head>` has no
  inline scripts/styles that would require `unsafe-inline` exceptions, so this should be
  low-cost to add.

#### Household-lookup rate limiting is IP-based and easily bypassed
- **Category:** Security
- **Severity:** Low
- **Location:** `supabase/migrations/20260623184956_rate_limit_household_lookup.sql`
- **Description:** `gravy_lookup_household` is rate-limited at 10 requests per 5 minutes,
  keyed by `x-forwarded-for` (falling back to a shared `'unknown'` bucket if that header is
  absent). This is trivially defeated by a distributed or proxy-rotating attacker, and it
  doesn't apply at all to a direct REST `SELECT` against the table (only to calls through
  this specific RPC). This is self-documented as a known limitation in the migration's own
  comments, so it's not a hidden gap — flagged here for completeness and because it compounds
  with the open-SELECT finding above (rate-limiting the RPC path doesn't matter much if the
  same data is reachable unthrottled via direct SELECT).
- **Recommendation:** Acceptable as "slows down casual abuse of the documented UI flow,"
  which appears to be its actual intent. Not worth investment beyond that unless the SELECT
  policy above is also tightened, at which point this becomes the primary remaining
  abuse-surface worth re-evaluating.

---

### 3.6 Accessibility

The overall accessibility baseline here is genuinely good: no `<div onClick>` button
substitutes were found anywhere in the reviewed screens, icon-only buttons are proper
`<button type="button">` elements, `IconPicker`/`ColorPicker` correctly implement the
listbox pattern (`role="listbox"`/`role="option"`/`aria-selected"`), there's a solid
hand-written focus trap (`useFocusTrap`) used consistently across every modal/drawer, and
there are no `<img>` tags anywhere (all iconography goes through FontAwesome with
`aria-hidden` applied to decorative icons by default). The gaps below are the real,
concrete exceptions to that otherwise-solid baseline.

#### Toasts have no `aria-live` region
- **Category:** Accessibility
- **Severity:** Medium
- **Location:** `src/components/ToastContainer.tsx:6-15`
- **Description:** Point-award confirmations, sync errors, and storage-failure warnings are
  all rendered as plain `<div>`s with no `role="status"` or `aria-live="polite"`. A
  screen-reader user gets no announcement for any of these — including the storage-failure
  warning, which is arguably the most important one to actually notice.
- **Recommendation:** Add `role="status" aria-live="polite"` to the toast container (or
  `aria-live="assertive"` specifically for error-type toasts, if distinguishing urgency is
  wanted).

#### No automated accessibility linting
- **Category:** Accessibility
- **Severity:** Low-Medium
- **Location:** `eslint.config.js:1-22`
- **Description:** The flat ESLint config wires `js.configs.recommended`, `tseslint`,
  `react-hooks`, and `react-refresh`, but no `eslint-plugin-jsx-a11y` — confirmed absent from
  `package.json` as well. The good patterns described above (semantic buttons, aria-labels,
  focus management) are currently being maintained by discipline and convention, not by
  tooling that would catch a regression.
- **Recommendation:** Add `eslint-plugin-jsx-a11y` to the flat config with its recommended
  rule set. Given the codebase already follows most of its rules, this should surface few if
  any new violations and mainly serves as a regression guard for future changes.

#### Several inputs rely on placeholder text instead of an associated `<label>`
- **Category:** Accessibility
- **Severity:** Low
- **Location:** `src/components/parent/GoalsPanel.tsx:44` (inline-edit form), `src/components/parent/StorePanel.tsx:62`, `src/components/parent/PointsPanel.tsx` (number inputs), `src/components/ProfilesManager.tsx:133-140` (name-edit input)
- **Description:** These inputs identify themselves only via `placeholder` text (e.g. `pts`,
  `×`, `Name`) with no `<label htmlFor>` or `aria-label` association. Placeholder text
  disappears once the field has a value and isn't reliably exposed to all assistive
  technology the way a real label is (WCAG 1.3.1/3.3.2 territory).
- **Recommendation:** Add visually-hidden `<label>` elements (or `aria-label` attributes)
  tied to each of these inputs. Low cost, doesn't require a visual redesign since the labels
  can be screen-reader-only if the placeholder-driven visual design is otherwise intentional.

#### Dark themes require growing, manually-maintained per-component CSS overrides
- **Category:** Accessibility
- **Severity:** Low
- **Location:** `src/index.css:153-215+`
- **Description:** The theme system's stated design (per its own comment) is that
  components should repaint automatically from CSS custom-property tokens. In practice, the
  two dark themes (`midnight`, `cyberpunk`) require dozens of individually-re-specified,
  per-component overrides beyond the token swap (`.btn-purple`, `.btn-dark`, `.topbar`,
  `.pin-key.delete`, `.calendar-day.selected`, and more, each re-listed per dark theme). This
  means contrast correctness for any new component or any new theme depends on someone
  remembering to add a corresponding override — nothing in the token system enforces it. No
  actual contrast failure was measured in this review (that requires rendering the app), but
  the pattern itself is a standing risk that a new component added without an override could
  silently fail contrast on the dark themes.
- **Recommendation:** Where possible, replace hardcoded per-component colors with token
  references so the "just override tokens" model actually holds; where a genuine
  per-component dark-theme adjustment is unavoidable, keep a single co-located manifest
  (rather than scattered overrides) so it's obvious when a new component needs one added.

---

### 3.7 Testing & Reliability

#### `verify_gravy.mjs` is broken against the current app
- **Category:** Testing & Reliability
- **Severity:** Medium (false-confidence risk)
- **Location:** `/verify_gravy.mjs` (repo root, ~445 lines)
- **Description:** This ad-hoc Playwright script repeatedly drives a `.pin-key`/`.pin-dot`
  4-digit PIN entry flow (e.g. "Enter PIN 1234 on screen buttons") and interacts with
  `.nav-btn`/`.week-strip-header` elements. None of these selectors exist anywhere in the
  current codebase — PIN-based unlock was fully replaced by account-based sign-in some time
  ago (per `CLAUDE.md`/`BACKLOG_DONE.md`), and the corresponding UI was removed. Running
  `node verify_gravy.mjs` today would fail at the very first PIN-entry step. It's not wired
  into `npm test` or CI, so its brokenness isn't caught automatically — a reader who sees a
  445-line Playwright smoke test at the repo root could reasonably assume it provides
  meaningful safety-net coverage, when currently it provides none.
- **Recommendation:** Either update the script to exercise the current sign-in/onboarding
  flow (and consider wiring it into CI once updated), or delete it. A broken script that
  looks functional is worse than no script.

#### Zero component/UI-level automated test coverage
- **Category:** Testing & Reliability
- **Severity:** Medium
- **Location:** `vitest.config.ts` (`include: ['src/**/*.test.ts']`, `environment: 'node'`); `package.json` (no `@testing-library/react`, no `jsdom`)
- **Description:** All nine existing `*.test.ts` files cover pure logic under `src/state/`
  (points arithmetic, day rollover, auth status normalization, cloud-sync merge, etc.) — this
  coverage is good and well-targeted for what it covers. But there is no component-level
  testing at all: no render tests, no interaction tests, and no test of `GravyContext`'s
  actual wiring (as opposed to the pure functions it calls). A regression in, say, how
  `AppShell` wires overlay state together, or how a panel calls its action hooks, would not
  be caught by anything short of manual testing.
- **Recommendation:** Not necessarily worth pursuing full component-test coverage given the
  app's size and the deliberate choice documented in `CLAUDE.md`, but consider adding
  `@testing-library/react` + `jsdom` as a second Vitest project/config specifically for the
  highest-value integration points — `GravyProvider`'s wiring and one or two of the more
  complex panels (`Onboarding`, `GoalsPanel`) would give the most coverage per test written.

#### Single global error boundary, no per-feature isolation
- **Category:** Testing & Reliability
- **Severity:** Low-Medium
- **Location:** `src/App.tsx:27-50` (class `ErrorBoundary`), mounted at `App.tsx:151`
- **Description:** One `ErrorBoundary` wraps the entire app (`<GravyProvider><AppShell/></GravyProvider>`).
  It's a reasonable last line of defense (a "Something went wrong / Tap to reload" fallback
  that calls `window.location.reload()`), but a render error anywhere in the tree — a bug in
  one mini-game, one drawer, one panel — takes down the *entire* app to that fallback, rather
  than isolating the failure to just the feature that broke.
- **Recommendation:** Add per-feature boundaries around the `lazy()`-loaded overlays
  (`StoreScreen`, `GamesScreen`, `RankScreen`, the various drawers) so a bug in one doesn't
  blank the home screen a kid was otherwise using successfully.

#### Reliability strengths worth calling out
- **Category:** Testing & Reliability
- **Severity:** N/A (positive finding)
- **Location:** `src/state/defaultState.ts` (`hydrateState`/`migrateLegacyState`/sanitizers), `src/state/useHouseholdSync.ts` (cancelled-flag guarding on async effects, try/catch around realtime payload handling), `src/state/GravyContext.tsx:206-217` (one-time storage-failure toast)
- **Description:** Worth naming explicitly since a review that only lists problems can be
  misleading: `hydrateState` runs defensive sanitization (coercing malformed/wrong-typed
  fields back to safe defaults) on *every* load path — both initial boot and incoming
  Supabase payloads — so a hand-edited `localStorage` blob or a malformed remote row degrades
  gracefully instead of crashing the app. `useHouseholdSync`'s async effects correctly use a
  `cancelled` flag to guard against late-resolving promises, and the realtime-receive path is
  wrapped in try/catch specifically so a malformed payload can't crash the app (with an
  explicit inline comment saying so). The storage-failure toast is guarded so it only fires
  once rather than looping if `localStorage` is permanently unavailable. These are the kind
  of defensive patterns that are easy to skip and weren't skipped here.

---

### 3.8 Developer Experience & Maintainability

#### TypeScript strict mode is not actually enabled
- **Category:** Developer Experience & Maintainability
- **Severity:** Medium
- **Location:** `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`
- **Description:** None of the three tsconfig files set `"strict": true`, and
  `tsconfig.json` only references the other two via `"references"` (no `extends` of a base
  config that might set it either). This means implicit `any` and non-strict null checks are
  permitted by the compiler, even though `noUnusedLocals`/`noUnusedParameters`/
  `noFallthroughCasesInSwitch` are enabled. This directly contradicts the repo's own stale
  `CODE_REVIEW.md`, which claims "TypeScript strict mode is on with no escape hatches" — that
  claim is not accurate against the current config. In practice the code appears to be
  written in a strict style by convention (careful null-guards were observed throughout the
  reviewed files), so enabling strict mode may surface relatively few real issues, but
  there's currently no compiler-enforced guarantee of that.
- **Recommendation:** Add `"strict": true` to both `tsconfig.app.json` and
  `tsconfig.node.json`, then work through whatever `tsc -b` surfaces. Given the codebase's
  apparent existing discipline, this is likely a smaller lift than it would be in a less
  careful codebase, and it closes the gap between the documented and actual TS configuration.

#### Stale prior audit document left unlabeled at repo root
- **Category:** Developer Experience & Maintainability
- **Severity:** Low
- **Location:** `/CODE_REVIEW.md`
- **Description:** This document describes `PinScreen.tsx`, `src/state/hash.ts`,
  `src/state/pinLockout.ts`, `BadgesScreen.tsx`/`BadgePopup.tsx`/`badges.ts`, and cites line
  numbers against a much larger single-file `GravyContext.tsx` (it describes a "1,215-line"
  file; the current file is 358 lines, having since been split into `useHouseholdSync.ts`
  plus seven per-domain action hooks). None of the PIN or badge files exist anymore — both
  subsystems were fully removed (per `BACKLOG_DONE.md`, Epics 8 and 12). Its high-severity
  findings about plaintext PIN storage and missing PIN lockout are moot. Its finding about
  unscoped RLS INSERT/UPDATE is also resolved (writes are now RPC-gated). A new contributor
  who opens this file without noticing it's dated would likely be confused about the current
  architecture.
- **Recommendation:** Rename to something like `CODE_REVIEW_2026-XX-XX.md` and add a one-line
  "superseded, kept for history" note at the top, move it into an `archive/` or `docs/`
  subfolder, or delete it if the git history is sufficient record. Any of these is fine; the
  goal is just that a fresh reader doesn't mistake it for current.

#### No environment-variable convention established
- **Category:** Developer Experience & Maintainability
- **Severity:** Low / Informational
- **Location:** Repo-wide — confirmed zero `import.meta.env` usage, no `.env*` files, no `.env.example`
- **Description:** Given the app's only "secret" is the publishable Supabase key (see §3.5),
  there's no functioning need for environment variables today, and the `.gitignore` doesn't
  even need an `.env` exclusion. But this also means there's no established pattern if a
  second, genuinely environment-specific value is ever needed (a staging Supabase project, a
  future third-party API key, etc.).
- **Recommendation:** Addressed as a side effect of the Supabase-key recommendation in §3.5;
  no separate action needed beyond that.

#### Strengths worth calling out
- **Category:** Developer Experience & Maintainability
- **Severity:** N/A (positive finding)
- **Location:** `eslint.config.js`, `.github/workflows/deploy.yml`, `BACKLOG.md`/`BACKLOG_DONE.md`
- **Description:** The flat ESLint config correctly wires `react-hooks` and `react-refresh`
  alongside the TS-ESLint recommended set; CI runs `npm ci` → `lint` → `test` → `build` as a
  real, non-bypassable gate before deploy, with minimally-scoped workflow permissions
  (`contents: read`, `pages: write`, `id-token: write`, no secrets referenced). The codebase
  has zero `TODO`/`FIXME`/`HACK` comments anywhere — open work is tracked formally in
  `BACKLOG.md` instead, with completed work condensed into `BACKLOG_DONE.md` as a genuine
  decision record. This is a materially better process than most projects of this size.

---

### 3.9 Dependencies

#### `@capacitor/core` is an unused production dependency
- **Category:** Dependencies
- **Severity:** Low
- **Location:** `package.json` (`dependencies`)
- **Description:** Zero references to `@capacitor/core`/`Capacitor` were found anywhere in
  `src/` (verified via case-insensitive grep). `@capacitor/android`, `@capacitor/cli`, and
  `@capacitor/ios` are correctly placed in `devDependencies` (only needed for the native
  build/CLI tooling), but `@capacitor/core` is listed as a runtime `dependency` despite never
  being imported. Bundlers will tree-shake this out of the actual shipped JS, so it likely
  doesn't bloat the real bundle, but it's a `package.json` correctness issue.
- **Recommendation:** Move `@capacitor/core` to `devDependencies` alongside its siblings, or
  drop it entirely if it's not needed by the native build pipeline either.

#### `@playwright/test` is present but not integrated into any script
- **Category:** Dependencies
- **Severity:** Low
- **Location:** `package.json` (`devDependencies`); no `playwright.config.ts` in the repo
- **Description:** Playwright is a dev dependency, but there's no `playwright.config.ts` and
  no `test:e2e` (or similar) script in `package.json`. The only place it's actually used is
  the ad-hoc, currently-broken `verify_gravy.mjs` (§3.7). As it stands, this dependency is
  present but not meaningfully wired into the project's standard workflows.
- **Recommendation:** Resolve together with the `verify_gravy.mjs` finding — either build out
  a real, CI-wired Playwright setup (config + script) once the script itself is fixed, or
  remove the dependency if e2e testing isn't going to be maintained.

#### Overall dependency hygiene — positive finding
- **Category:** Dependencies
- **Severity:** N/A (positive finding)
- **Location:** `package.json`
- **Description:** The dependency list is deliberately minimal — 17 packages total plus
  transitives, no lodash/moment/axios-style utility bloat, and every major version observed
  (React 19, Vite 8, TypeScript ~6, ESLint 10, Vitest 4) is current for a 2026-era project.
  This is a genuine strength for a PWA that should care about bundle size, and it's a marked
  contrast to the "several majors behind" pattern common in older codebases.
- **Recommendation:** No action needed beyond routine maintenance. `npm audit` was not
  re-run as part of this review (no `node_modules` installed in the review environment, and
  the figure recorded in the stale `CODE_REVIEW.md` is against an old lockfile state) — the
  team should run `npm ci && npm audit` directly to get a current reading.

---

### 3.10 Scalability

#### Entire multi-profile state lives under one `localStorage` key, fully re-cloned per mutation
- **Category:** Scalability
- **Severity:** Low (forward-looking)
- **Location:** `src/state/defaultState.ts` (`STORAGE_KEY = 'gravy_v1'`); `src/state/actions/shared.ts` (`clone` helper)
- **Description:** The entire `GravyRoot` — every profile in the household — is persisted
  under one `localStorage` key and fully deep-cloned via `JSON.parse(JSON.stringify(...))` on
  every single mutation (see §3.4). This is fine at the app's current scale (one household,
  a handful of kid profiles), but both the per-mutation clone cost and the JSONB payload size
  synced to Supabase grow linearly with accumulated history (`dayLogs`/`actionLog`/
  `auditLog`, though the latter two are capped at 500/300 entries).
- **Recommendation:** No action needed today. Worth revisiting if the app ever supports
  larger households, longer retained history, or higher-frequency actions — at that point,
  moving away from whole-state cloning (e.g. Immer-style structural sharing) would decouple
  per-action cost from total accumulated history size.

#### Monolithic context and zero memoization compound at scale
- **Category:** Scalability
- **Severity:** Low (forward-looking)
- **Location:** Cross-reference §3.2, §3.4
- **Description:** The unmemoized single-context/no-`React.memo` pattern described above is
  low-severity today because state and screen count are both small. It will matter more as
  either grows — more screens subscribing to `useGravy()`, more frequent state updates (e.g.
  real-time multiplayer-style features), or larger per-household state.
- **Recommendation:** Cross-referenced, no separate action beyond §3.2's recommendation.

#### Manual-sync-across-multiple-places patterns (themes, icons) get costlier as the app grows
- **Category:** Scalability
- **Severity:** Low (forward-looking)
- **Location:** Cross-reference §3.3 (icon registry), §3.3/§3.6 (theme set)
- **Description:** Both the icon registry and the theme system require a human to remember
  to update multiple, unconnected places for one logical change (one new icon, one new
  theme). This is a minor annoyance at ~110 icons and 7 themes; it becomes a more frequent
  source of subtle bugs (a theme missing a PWA chrome-color entry, a picker missing an icon)
  as either list continues to grow.
- **Recommendation:** Cross-referenced — consolidating to single sources of truth (per §3.3's
  recommendations) becomes more valuable the more the app grows in these two dimensions.

#### No offline write queue — already tracked
- **Category:** Scalability
- **Severity:** Low (already tracked)
- **Location:** `src/state/useHouseholdSync.ts:125-140` (800ms debounced push); `BACKLOG.md` Epic 9
- **Description:** Cloud sync pushes are debounced by 800ms with no retry/replay queue for
  offline or failed writes — an edit made while offline simply lags in `localStorage` until
  the next successful push attempt, with no guaranteed eventual delivery mechanism beyond
  "the user reopens the app while online." This is already an open, prioritized item in
  `BACKLOG.md` Epic 9 ("Offline write queue with replay"), not a new finding — included here
  only because it's directly relevant to how the app will behave as usage grows to more
  multi-device, flakier-network households.
- **Recommendation:** Already tracked at appropriate priority; no new recommendation beyond
  what's in `BACKLOG.md`.

---

## 4. Suggested Priority Order

1. **Fix the parent-email leak in the synced audit log**, and treat the underlying open
   `households` SELECT policy as higher priority given this new finding (§3.5). This is the
   one item in this report with direct, live user-data impact.
2. **Label/retire `CODE_REVIEW.md` and fix/remove `verify_gravy.mjs`** (§3.7, §3.8) — both
   are cheap to address and both are currently "false confidence" risks: one looks like a
   current review, the other looks like a working smoke test, and neither is.
3. **Enable TypeScript strict mode** (§3.8) and work through whatever it surfaces, while the
   codebase is still small enough that this is a contained effort.
4. **Address the accessibility gaps** — `aria-live` on toasts, `jsx-a11y` lint, missing
   `<label>`s (§3.6). All are cheap, and accessibility carries extra weight for an app built
   for kids.
5. **Extract the duplicated CRUD (`GoalsPanel`/`StorePanel`) and router/header-state patterns**
   (§3.2, §3.3) — moderate effort, removes real duplication, makes the next new panel cheaper
   to build correctly.
6. **Consider splitting/memoizing the `GravyContext` value and adding targeted component
   tests**, starting with `GravyProvider`'s own wiring and the highest-traffic panels (§3.2,
   §3.7) — larger effort, most valuable once the app's surface area grows further.
7. **Refactor `Onboarding.tsx` to a `useReducer`-based state machine**, and address the
   remaining low-severity items (icon/theme single-source-of-truth, CSP header, dependency
   placement fixes) opportunistically as adjacent work touches those files.
