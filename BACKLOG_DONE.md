# Gravy Backlog — Done & Resolved

Archive of completed (`DONE`), decided (`DECIDED`), and superseded items split out
of `BACKLOG.md` so the active list stays scannable. This is the **decision record**:
each line names what shipped (or what was decided and why) plus the key file / PR /
migration, and folds in any caveat that's still binding. Grouped by the original
epic numbers so existing "BACKLOG.md Epic N" references still resolve here. Open
work lives in `BACKLOG.md`.

## Epic 1 — Security & Trust

- **PIN/recovery hashing** (PR #93 → merged as #97) — salted-SHA-256 hashes,
  per-device exponential-backoff lockout after 5 fails; plaintext migrated to
  hashes on load. `src/state/hash.ts`, `src/state/pinLockout.ts`.
- **PR #92 (rank-ladder reorder)** — DECIDED stays closed: rename-only over the
  same placeholder thresholds, no balance benefit. Re-open only inside the Epic 4
  rank-curve design pass, never as a standalone reorder.
- **Supabase `households` access control** — `SECURITY DEFINER` RPCs
  (`gravy_create_household`/`gravy_upsert_household_state`/`gravy_rename_household`),
  each scoped to one row; unscoped anon INSERT/UPDATE revoked.
  `20260623123203_scope_household_mutations.sql`. SELECT stays open (Realtime needs
  it under the shared anon key) — accepted residual read risk; tighten via Epic 9 RLS.
- **Rate-limit household-code lookups** — `gravy_lookup_household` RPC throttles
  joins to 10 per 5-min window per IP; `fetchHousehold()` uses it, `joinHousehold`
  toasts the limit. `20260623184956_rate_limit_household_lookup.sql`. Caveat: only
  closes the documented join flow, not direct REST queries against the open SELECT.
- **Data-handling note** — `DATA_HANDLING.md`: what's collected (child name +
  hashed PIN/recovery only), where it lives, how to delete it.
- **Two gaps closed while writing that note** — `gravy_delete_household` RPC +
  "Delete household everywhere" in `SyncPanel`
  (`20260623225331_delete_household_everywhere.sql`); `gravy_lookup_household` now
  opportunistically GCs lapsed rate-limit buckets
  (`20260623225536_cleanup_lookup_attempts.sql`).

## Epic 2 — Engineering Foundation & Quality

- **Vitest + `points.ts` extraction** — award/forgiveness/exact-undo arithmetic
  pulled out of `GravyContext.tsx` into pure `src/state/points.ts`; tests in
  `points.test.ts`, `defaultState.test.ts`, `badges.test.ts`.
- **`useHouseholdSync` extraction** — the cloud-sync + parent-account reactive
  layer (household code/sync-status/auth/ownership state + the Supabase realtime
  push/subscribe, `onAuthChange`, and `getHouseholdStatus` effects) moved out of
  `GravyContext.tsx` into `src/state/useHouseholdSync.ts`; behavior-preserving,
  `actorRef`/`lastSyncedRef` now owned by the hook and forwarded to the action hooks.
- **`todayGoals` rollover bug** — `applyDayRollover` now clears `todayGoals`
  outright; previously a logged daily goal's id stuck forever, killing its payout
  from day 2 while the UI still showed it completable.
- **UTC/local day-boundary fix** — `dateStrUTC()` → `dateStrLocal()`; rollover/
  streak date math switched off UTC fields so "today" matches the UI. `TZ=UTC`
  pinned in `vitest.config.ts`; regression test added.
- **Household-wide configurable time zone** — shared `Settings.timezone` (IANA,
  default `America/New_York`) via `TimezonePanel`; `todayStr`/`applyDayRollover`/
  `backfillStreaksFromLogs` derive the zone via `Intl.DateTimeFormat` +
  `addDaysToDateStr()`. `src/data/timezones.ts`, `isValidTimezone()`.
- **CI gate** — `deploy.yml` runs lint → test → build; failure blocks deploy.
- **Hardened error handling** — all `localStorage` I/O via
  `safeGetItem`/`safeSetItem`/`safeRemoveItem` (`src/state/storage.ts`);
  `saveState`/`saveRoot` return bool, autosave shows a deduped "Couldn't save"
  toast; `subscribeToHousehold` validates incoming realtime payload shape
  (`isValidHouseholdStatePayload`).
- **PWA "update available"** — `UpdatePrompt.tsx` checks every 60s + on
  visibility, auto-applies and reloads with a brief status banner (no manual click).

## Epic 3 — Accessibility

- **Accessibility hardening pass** — aria-labels/semantic roles on interactive
  tiles; focus trap + return-focus on modals/drawers (`useFocusTrap`);
  color-contrast pass across all 5 themes (`--muted` darkened, scoped ink
  overrides, `.muted-note`/`.empty-state--bare`); min label font size raised
  (`--text-2xs` 10px → 11px), three decorative sub-11px glyphs left as out of scope.

## Epic 4 — Game Balance & Content Debt

- **Points economy in one pass** — computed realistic daily ceiling (~285 max,
  120–200 typical); rescaled rank gaps 5× (250/rank, max 69,000, `src/data/ranks.ts`)
  to target ~11–15 months to max rank while keeping the first rank-up fast. Bonus
  items stay uncapped (parent tap is the gate); action point values and points-badges
  left untouched (parent-editable / intentionally shorter arc).

## Epic 6 — Distribution & Growth

- **App-store packaging (TWA/PWABuilder/App Clip)** — SUPERSEDED: the
  wider-distribution decision is a Capacitor wrap, see Epic 10's packaging items.

## Epic 7 — Process Hygiene

- **Triage every open/unmerged branch** — #93 merged as #97, #92 decided to stay
  closed (see Epic 1). Standing principle (don't let work pile up unmerged) kept
  live in `BACKLOG.md` Epic 7.

## Epic 8 — Real Auth & Account Model

- **Supabase Auth for parent accounts** — email/password + magic link
  (`src/state/auth.ts`, `AccountPanel`); session in `GravyContext`
  (`authUser`/`authReady`). `auth.uid()`-scoped RLS itself deferred to Epic 9.
- **PIN kept as a local kid-screen lock, decoupled from account auth** —
  `grownUpUnlocked` / `src/state/grownUpUnlock.ts` / `pinLockout.ts`; neither
  gates the other.
- **Household ownership + invite-by-code** — `households.owner_id` +
  `household_members` table; all RPCs membership-aware, plus
  `gravy_claim_household`/`gravy_household_status`; the 6-char code is the
  join/invite token. `20260627132616_auth_household_ownership.sql`.
- **Claim-or-deprecate window for PIN-only households** — pre-existing rows
  (`owner_id IS NULL`) keep working anonymously until a signed-in parent claims
  them via `gravy_claim_household` (no data migration); "Secure this household"
  banner in `SyncPanel` drives it. RLS close-out is the Epic 9 item.
- **PIN removed; account made mandatory and the sole access gate** — supersedes
  the "PIN kept as a local kid-screen lock" decision above. The PIN subsystem
  (`grownUpUnlock.ts`, `pinLockout.ts`, `hash.ts`, `PinScreen`/`PinSetupStep`/
  `SecurityPanel`) is deleted; `grownUpUnlocked` is now a derived value
  (`isGrownUpUnlocked(authUser, householdStatus)` in `src/state/auth.ts`) —
  signed in AND a household member, nothing else. Household creation now
  requires `auth.uid()` (`20260701234953_require_account_for_household.sql`),
  closing the claim-or-deprecate window above: every household is claimed at
  creation, so there's no more unclaimed state. An anonymous device can still
  join a household by code and sync kid-mode progress (the RPC's existing-row
  write path stays anon-writable for a claimed household) — it just can never
  reach a parental-control screen. Onboarding gained a three-way fork (new
  family / sign in to join / kid device with no account) replacing the old
  optional account+sync steps and `PinSetupStep` wizard.
- **Per-parent attribution on `actionLog`** — `actorUserId`/`actorLabel` stamped
  by `appendActionLog`; `LogPanel` shows "· by <email>". `actionLog.test.ts`.
- **Audit trail for dashboard/destructive actions** — shared `auditLog` +
  `src/state/auditLog.ts` (cap 300), instrumented across catalog/settings/badge/
  profile/danger-zone/sync changes; read-only "Admin Log" (`AuditLogPanel`).
  Settings logs value-change-only and never secret values. `auditLog.test.ts`.
- **Decision (don't silently revisit):** kid profiles stay non-authenticated
  sub-records under a parent-owned household, switched via the PIN-gated
  `ProfileSwitcher` — no kid email/password/OAuth, avoiding COPPA exposure.

## Epic 9 — Cloud-First Storage & Offline Sync

- **Collection/record-level sync merge** (replaced whole-blob last-write-wins) —
  `src/state/merge.ts` (`mergeRoots`/`mergeStates`, pure, `merge.test.ts`).
  `GravyContext`'s realtime-receive effect now `mergeRoots(localRoot, remoteRoot)`
  against the current local root (via `rootRef`/`stateRef`) instead of replacing
  it: profiles union by id, and per-profile id-keyed collections union
  (goals/rewards by id; badgeConfig/dayLogs by key; earnedBadges as a set;
  action/audit logs by entry id). Live progress scalars/counters + pendingRewards
  keep last-write-wins (remote snapshot wins). Idempotent, so the receive effect
  marks the incoming snapshot seen and lets the push effect re-send local-only
  additions; devices converge to union-of-collections + last-writer's scalars.
  Residual (offline-queue/RLS items): server-side push races inside the 800ms
  debounce, and pendingRewards add/remove tombstones.
- **Parent email no longer embedded in the synced audit/action logs** (the July 2026
  audit's highest-severity finding, P0) — `LogActor` carries only the opaque `userId`;
  `appendActionLog`/`appendAuditLog` stamp just `actorUserId` (the `actorLabel` field is
  gone from `types.ts`), `useHouseholdSync` no longer sources `user.email`, and `LogPanel`
  resolves the display name client-side from the signed-in session (other members show as
  "another grown-up"). `migrateLegacyState` scrubs `actorLabel` from pre-fix saves — both
  local loads and incoming Supabase rows pass through it via `hydrateState`.
  `DATA_HANDLING.md` updated with the only-opaque-id rule.

## Epic 10 — Mobile App & Native Capacities

- **Capacitor wrap spike** — `@capacitor/{core,cli,ios,android}` added, `capacitor.config.ts`
  (`appId com.gravyapp.app`, `webDir dist`); `npm run build:native`/`cap:sync` build with
  `--mode capacitor` to force a root-relative Vite `base` (a `/Gravy/` base white-screens the
  native WebView). iOS (SPM) + Android (Gradle) platforms verified to scaffold and `cap sync`
  cleanly; `ios/`/`android/` left gitignored (regenerable) until the shells carry real
  customizations. `docs/capacitor.md`. Remaining Epic 10 items (native push, signing, store
  config, CI, OTA) stay open in `BACKLOG.md`.
- **Disable the PWA/Workbox service worker under `--mode capacitor`** — `vite.config.ts` now
  passes `disable: mode === 'capacitor'` to `VitePWA`, so the native bundle emits no Workbox SW
  (redundant in a WebView, and it could cache-fight `UpdatePrompt`'s auto-reload). `disable`
  (vs. dropping the plugin) keeps the `virtual:pwa-register` modules resolvable as no-ops so
  `UpdatePrompt`/`useRegisterSW` still build; the Pages/PWA build keeps its SW. `docs/capacitor.md`.
  First item on the "Path to first TestFlight build" critical path.
- **Native app icon + splash, `ios/` graduated into the repo** — generated
  `AppIcon.appiconset`/`Splash.imageset` from the existing PWA source art (`public/pwa-512x512.png`
  for the icon, `public/maskable-icon-512x512.png` — already safe-zone-padded — for the splash);
  no higher-res source logo exists yet, so both are upscaled from 512px (acceptable placeholder
  quality, easy to regenerate once a bigger source exists). `ios/` is now tracked in git (its own
  `ios/.gitignore` still excludes the synced web bundle, Pods, DerivedData, generated config);
  `android/` stays gitignored. `docs/capacitor.md`. Second item on the "Path to first TestFlight
  build" critical path.

## Epic 12 — Badge System Removal

- **Removed the badge feature entirely** (product decision) — deleted `src/data/badges.ts`
  (71 `BADGE_MASTER` defs), `src/state/badges.ts` (`findNewlyEarnedBadges`/`getBadgeDisplay`/
  progress helpers) + `badges.test.ts`, `BadgesScreen.tsx`, `BadgePopup.tsx`, and the parent
  `BadgesPanel.tsx`. Dropped `earnedBadges`/`badgeConfig`/`BadgeOverride` from `GravyState`
  (and their sanitize/merge/mirror handling in `defaultState.ts`/`merge.ts`), the `checkBadges`
  callback and its threading through every point-earning action hook, `updateBadgeConfig`, the
  `badgeConfigChanged` audit type, and the `'badges'` arm of `ParentDashboard`/`RootMenu`'s
  `RootDest` union. `ConfirmDialog.tsx`'s reused `badge-popup-*` CSS was renamed to
  `confirm-dialog-*` rather than deleted; `GoalsPanel`'s reused `pbadge-toggle` CSS was renamed
  to `goal-type-toggle`. No Supabase migration needed — old synced rows just carry a dead
  `earnedBadges`/`badgeConfig` JSON key forever, same as any other retired field.

## Epic 13 — Engineering & Security Audit (July 2026)

- **Toast/notification system removed entirely** (product decision, not a bug fix) — resolves
  the "no `aria-live` region on toasts" a11y gap by eliminating the toast system it applied to.
  `showToast`/`dismissToast`/`ToastItem`/`ToastContainer` deleted from `GravyContext` and every
  call site (`src/state/actions/*`, `CopyCodeButton`, `CalendarGrid`); everyday confirmations
  (points, goals, catalog/profile/sync edits) now rely on the already-visible state change
  (checkmark, counter, list update) instead. `CopyCodeButton` grew its own inline
  copied/failed icon state; the one true "no other feedback" case — a failed `localStorage`
  write — became `storageError`, a persistent dismissible banner (`StorageErrorBanner`,
  `src/components/StorageErrorBanner.tsx`) rather than an ephemeral toast.
- **Theme set trimmed from seven to three (Capri/Classic/2.0)**, removing
  `midnight`/`ocean`/`bubblegum`/`cyberpunk`/`ranger`. This eliminated the "dark-theme CSS
  overrides are a growing, manually-maintained list" risk (`src/index.css:153-215+`) outright,
  since `midnight`/`cyberpunk` were the only themes needing per-component ink overrides beyond
  the token swap — the new `twopointoh` theme is a plain light theme (black ink on white) like
  `capri`/`classic`, so it needs none. Saved profiles on a removed theme id fall back to
  `'capri'` via the existing `validThemes` migration in `defaultState.ts`.
- **`GoalsPanel` UX pass** — fixed a user-reported "confusing and inconsistent" Settings →
  Goals screen. Moved the Daily Goal/Bonus Points toggle above the add-goal fields it governs
  instead of below them; unified the toggle into one `GoalTypeToggle` component used by both
  the add form and (newly) the per-goal edit form, replacing the old bare unlabeled switch on
  each row — a goal's type is now only changed via the same edit-and-Save flow as its other
  fields, not an instant separate toggle. Moved `PointsPanel` (food-tray points) to the bottom
  of the panel so opening "Goals" shows goal content first, matching what `docs/ui-surfaces.md`
  already described. Added a `ConfirmDialog` (the same component `DangerZonePanel`/`SyncPanel`/
  `ApprovalsPanel` use) before `removeGoal`, replacing the old instant/irreversible delete.
  Points/target inputs now normalize on blur (mirroring `PointsPanel`'s existing clamp-on-blur
  pattern) so an invalid/blank value's fallback is visible before submit instead of silently
  applied after. Added `aria-label`s to `GoalsPanel`'s name/points/target inputs.
- **Baseline `households` migration restored** — `supabase/migrations/` was missing the
  original `CREATE TABLE`/RLS/policy migration for `public.households` (applied directly to
  production on 2026-06-13, never committed); every later migration assumed the table already
  existed, and a fresh database replay hit a missing relation on the very first guarded
  `drop policy if exists`. This was also why Supabase's GitHub branching integration's
  persistent `main` preview branch had been stuck in `MIGRATIONS_FAILED` since 2026-06-23.
  Added `20260613184631_create_households_table.sql`, reconstructed from the live schema and
  named with the version Supabase's own migration history already recorded for it (so
  production recognizes it as already-applied rather than replaying it). Also renamed three
  other migration files whose committed timestamps didn't match what was actually recorded in
  production's migration history (`20260623123203_scope_household_mutations.sql`,
  `20260627132616_auth_household_ownership.sql`,
  `20260701234953_require_account_for_household.sql`) so the repo's migration ledger matches
  production exactly.
- **`CODE_REVIEW.md` labeled as historical** — prominent banner added at the top stating it
  predates the PIN/badge removals and pointing to `AUDIT_REPORT.md` as the living audit; the
  document itself kept intact for the record.
- **`@capacitor/core` moved to `devDependencies`** — never imported in `src/` (only
  `capacitor.config.ts` type-imports from `@capacitor/cli`); now sits alongside its
  `@capacitor/{cli,ios,android}` siblings.
- **`ProfilesManager` double-write on name edit fixed** — the edit input now buffers the name
  in local state and commits via `updateProfile` once on blur, instead of firing a state
  update (and a cloud sync) per keystroke plus again on blur.
- **Placeholder-only inputs labeled** — `aria-label`s added to `PointsPanel`'s per-food and
  full-tray-bonus number inputs and `ProfilesManager`'s edit/add name inputs
  (`StorePanel`'s fields had already been labeled in the Goals-panel UX pass).
- **`LogPanel` merged-log sort memoized** — the actionLog+auditLog merge/sort now runs in a
  `useMemo` keyed on the two arrays instead of on every render.
- **`UpdatePrompt` force-reload — already fixed, closed** — the audit finding described an
  unconditional `updateServiceWorker(true)` on `needRefresh`; the current component (commit
  `a200047`) already gates the reload behind a real "Update" button with a dismiss option,
  matching `registerType: 'prompt'`. No change needed.
- **Inconsistent `useCallback` deps in `useKidProgressActions` — verified correct, closed
  (decision)** — the "trimmed" arrays (`removeFood`/`decrementGoal`/`undoBonusItem`/
  `declineGameWin`/`declineRollToGoalRound`) close over nothing but `setState` and
  module-level imports, so every array is exhaustive-deps-accurate as written; the
  `react-hooks` recommended lint config guards against future drift if an import becomes a
  prop. Left as-is.

## Epic 14 — Onboarding Revamp & First-Run Guided Tour

- **Onboarding redesigned around a clear three-button fork** (New Family / Existing Parent /
  Existing Kid), replacing the old one-button-plus-two-links `'welcome'` screen and the
  `name → walkthrough → account → creating` phase order. `Onboarding.tsx` shrank from a 6-phase
  wizard to 4 (`welcome → account → join → creating`); the kid's-name ask and the product tour
  both moved out of it entirely, into new post-onboarding components mounted on top of the
  already-live `HomeScreen` (`src/components/tour/FirstKidPrompt.tsx`,
  `src/components/tour/HomeTour.tsx`) rather than blocking the main app behind them.
- **Real pending-email-confirmation screen** — `signUpWithPassword` (`src/state/auth.ts`) now
  sets `emailRedirectTo` and returns `SignUpResult`'s `needsConfirmation` (from Supabase's own
  `!data.session` signal) instead of silently discarding it; `AccountSetupStep` shows a "Check
  Your Email" screen with a `resendSignUpConfirmation` retry, auto-continuing once `authUser`
  resolves (no polling — Supabase mirrors the session across tabs via localStorage).
- **"Existing Parent" auto-attaches to its household with no manual code** — new
  `gravy_my_household_code()` RPC (`supabase/migrations/20260706210522_my_household_code_rpc.sql`),
  keyed by the caller's `household_members` row (prefers `role = 'owner'`, else most recent)
  instead of a code, wrapped as `findMyHouseholdCode`/`findMyHousehold`. Falls back to the
  existing manual join-by-code UI if the account has no household yet.
- **Family-code reveal folded into the guided tour** instead of a dedicated post-creation
  screen — `'creating'` is now a plain spinner/retry state with no code display.
- **First-run guided tour built from scratch** (`src/components/tour/Spotlight.tsx` — a
  dependency-free `box-shadow` cutout, no SVG mask, no library) spotlights real home-screen
  elements via new `data-tour-id` hooks (`GamesCard`, `StatsPill`, `PrizesPill`, `TopBar`'s
  hamburger button, plus a new `tourId` prop on `CollapsibleCard` for `FoodTray`/`DailyGoals`)
  instead of the old 4-slide abstract walkthrough. Runs once per device across every onboarding
  path (`HOME_TOUR_DONE_KEY`), bypassed retroactively for installs that predate this feature —
  same pattern as `ONBOARDING_DONE_KEY`.
