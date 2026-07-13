# Gravy Product Backlog

This is the living backlog for Gravy, written during a project takeover after the
previous build phase went heads-down on features with no roadmap, no tests, and
two PRs left open-ended. It's grounded in a fresh audit of the codebase (engineering,
PWA/infra/accessibility, security/privacy) and the full PR history.

> **Completed, decided, and superseded items live in `BACKLOG_DONE.md`** — a
> condensed decision record kept out of this file so this list stays scannable.
> This file holds only open work and standing principles. When an item closes,
> move it there as a one-liner rather than leaving a strikethrough here.

## How to read this

- **Priority**: `P0` = do next, live risk or blocker · `P1` = important, do soon ·
  `P2` = valuable but not urgent, or contingent on a later distribution decision.
- **Size**: `S` = under a day · `M` = a few days · `L` = a real project.
- Items reference the evidence behind them (PR numbers, file paths) so priority
  calls can be re-checked later instead of taken on faith.
- Epic numbers are kept stable across the split (some epics — 1, 2, 3, 8 — are fully
  done and now appear only in `BACKLOG_DONE.md`, so the numbering has gaps here).

## Snapshot — what's already built

Goals (daily/bonus/multi-step) + streaks, a reward store with parent approval,
a 24-tier rank ladder, 4 educational mini-games
(Hangman, Math Facts, Word Scramble, Memory Match), multi-kid profiles per
household, 5 visual themes, full-screen onboarding, mandatory parent accounts
(Supabase Auth) as the sole gate for the parent dashboard
(Approvals/Goals/Calendar/Store/Admin-Log — no PIN), and real-time Supabase
sync via a 6-character household code, bundled into account creation. This is a mature, feature-complete product
surface — the gaps below are about durability (security, tests, accessibility,
process) and the next wave of capability (cloud-first sync, native app), not
missing core features.

## Epic 4 — Game Balance & Content Debt

- **Lock the theme palette.** It was wholesale-replaced once already (4 themes →
  5 new ones in PR #80); avoid a second full swap without a clear signal that
  the current set isn't working. *(P2, decision only.)*

## Epic 5 — Retention & Engagement

- **PWA push notifications** for chore reminders and streak-about-to-break
  nudges — the single biggest lever for a habit-forming app, currently absent
  entirely. *(P1, L.)* Scoped to web push (Notifications API + service worker)
  for the PWA as it exists today. If/when Epic 10's Capacitor wrap ships,
  native push (APNs/FCM) is a separate P1/M implementation, not a free
  upgrade of this item — don't let "we already shipped push" get assumed to
  cover the native case.
- **Parent weekly digest/summary** surfaced in-app (no email infra exists today)
  so engagement doesn't require opening the dashboard. *(P2, M.)*
- **Family/sibling comparison view** — multi-profile support shipped (PR #82)
  but profiles currently can't see each other. *(P2, M.)*
- **Goal categorization (Morning/School/Evening tabs or collapsible sections)**
  for `DailyGoals`/`BonusPoints` — raised in a UX review as a "only if the
  list grows" suggestion; deliberately deferred since the current goal lists
  are short enough that a flat grid is still clear. Revisit if a household's
  goal count grows large enough that scanning the flat grid becomes a
  problem. *(P2, M.)*

## Epic 6 — Distribution & Growth

*(Contingent — only pursue if/when a wider-distribution decision is made;
scope today is "plan for optionality," not commit. App-store packaging moved to
Epic 10 once the Capacitor decision was made — see `BACKLOG_DONE.md`.)*

- Lightweight, privacy-respecting, **opt-in** analytics — no third-party
  trackers exist today by design; if added, keep it self-hosted/aggregate-only
  given the child-data context.
- Formal privacy policy / ToS page and a COPPA-adjacent compliance review
  before any public sign-up flow. Partly addressed by Epic 9's "COPPA-specific
  review of the account signup flow" item once real accounts are scheduled —
  that item is narrower (the signup flow itself); this one covers the
  standalone policy page/ToS.

## Epic 7 — Process Hygiene

- **Keep this `BACKLOG.md` living** — update priorities as items land instead
  of letting new PRs silently supersede old ones without a record. Closing an
  item means moving it to `BACKLOG_DONE.md` as a one-liner; opening one means
  adding it here.
- **Hold a short UI-stabilization window** while durability work lands: the parent
  dashboard was fully redesigned three times (PRs #71, #73, plus earlier passes)
  and the theme palette fully replaced once (PR #80) in recent history — high
  churn, low durability. Resist a fourth redesign or second palette swap until
  there's a concrete signal (user feedback, data) calling for it.

## Epic 9 — Cloud-First Storage & Offline Sync

*(The RLS-migration and account-deletion items depend on Epic 8's account/membership model
— see `BACKLOG_DONE.md` Epic 8. The collection/record-level sync merge that replaced whole-blob
last-write-wins is now done — see `BACKLOG_DONE.md` Epic 9; the offline-queue item below is
valuable regardless, since today's "local cache + merge on reconnect" still has no write queue
for a device that's offline at edit time.)*

- **Offline write queue with replay.** No queue or retry/backoff exists today beyond the
  realtime subscription — a device with no signal just edits `localStorage` and sync
  silently lags until reconnect. Needed regardless of account model so a kid can check off
  chores with no signal and have it reliably land later; pairs with the now-done collection/
  record-level merge (`src/state/merge.ts`), since replay needs that merge rather than a blind
  overwrite to land queued edits safely. *(P1, M.)*
- **Migrate `households` RLS from open-SELECT/RPC-gated to `auth.uid()`-scoped policies.**
  Once Epic 8's `household_members` exists, replace the anon-role/open-SELECT model
  (required today only because Realtime has no per-household auth claim to scope by) with
  real RLS predicates, so Realtime is authenticated per-household instead of relying on a
  shared anon key with table-wide read access. Mechanical once accounts/membership exist,
  but every RPC and the `subscribeToHousehold` call site need updating together. *(P1, M.)*
- **Stop embedding the parent's email in the synced audit log.** A fresh audit
  (`AUDIT_REPORT.md`, see Epic 13) found `appendAuditLog` (`src/state/auditLog.ts:16-19`)
  stamps `actorLabel` with the signed-in parent's email (sourced from
  `useHouseholdSync.ts:77`), which lives in `state.auditLog` — part of the JSONB blob
  exposed by the open SELECT policy above. This directly contradicts `DATA_HANDLING.md`'s
  claim that email never leaves `auth.users`. Independent of the larger RLS migration above
  (which needs a Realtime redesign and stays deliberately deferred): store `actorUserId`
  only in the synced log and resolve the display label client-side from the locally-known
  signed-in account. Small, live-risk, and doesn't need to wait on the RLS item. *(P0, S.)*
- **Account-level data export.** A parent can request a structured export of everything
  tied to their account. Doesn't exist as a concept today (no account to scope it to);
  becomes a real expectation once accounts exist, and is the easy half of COPPA's
  access-and-deletion requirement. *(P2, S.)*
- **Account-level data deletion (right-to-delete).** Extends the existing "Delete household
  everywhere" (`DangerZonePanel`/`SyncPanel`, done — see `BACKLOG_DONE.md` Epic 1) to also
  delete the account and any auth-table rows, and to define what happens to a multi-member
  household when the owning account deletes itself. *(P1, S–M.)*
- **COPPA-specific review of the account signup flow itself.** Narrower and must land
  *before* real accounts ship to users: verify signup never collects a child's name/data as
  part of account creation (only as in-app profile data after a parent is authenticated),
  add explicit parent-only language to the signup screen, and update `DATA_HANDLING.md` to
  cover Supabase Auth's own data (email on file, magic-link token storage) — this is what
  turns the app from "no PII" to "parent email on file." *(P0 once real-account rollout is scheduled.)*

## Epic 10 — Mobile App & Native Capacities

*(Packaging decision: Capacitor wrap of the existing Vite/React app, not a PWA+TWA/App-Clip
wrapper and not a React Native rewrite — gets real native capability access (APNs/FCM,
biometrics, camera, widgets, legitimate store-review posture) with near-zero rewrite of
`src/`, versus a rewrite of all 40+ components in `src/components/` for React Native.)*

- **Native push notifications (APNs/FCM).** Distinct implementation from the existing
  web-push item in Epic 5 (see annotation there) — native transport only available once
  wrapped. *(P1, M, once wrapped.)*
- **Biometric quick re-entry.** Face ID/Touch ID/Android biometric as a faster way to
  re-open the grown-up lock on a device that's already signed into a parent account — the
  account sign-in stays the actual gate (no PIN exists to "fall back" to; a fully signed-out
  device still needs a real sign-in). No equivalent exists for a PWA. *(P2, S, once wrapped.)*
- **Haptics on native.** `src/lib/haptics.ts` already exists and calls
  `navigator.vibrate()` — extend the same call site to use native haptic engines once
  wrapped; the abstraction point already exists, so this is a small win. *(P2, S.)*
- **Camera-based proof-of-chore photos.** New capacity: a kid attaches a photo when
  completing a goal, parent approves with the photo visible in `ApprovalsPanel`. Needs
  native camera access (awkward/permission-flaky on mobile web) and new storage — photo
  blobs don't belong in the JSONB state blob, needs Supabase Storage scoped by Epic 9's
  account model. *(P2, L — gated on both the packaging decision and Epic 9.)*
- **Home-screen widget / streak status** (iOS Live Activity, Android widget). Surfaces
  "streak about to break" without opening the app — extends the same retention thesis as
  Epic 5's push-notification item, but needs native widget APIs with no PWA equivalent.
  *(P2, L.)*
- **Calendar integration** (push a recurring goal as a device reminder). Two tiers: a `.ics`
  download works even unwrapped *(P2, S)*; two-way native reminders-app integration is
  richer once wrapped *(P2, M)*.

### Path to first TestFlight build (internal testing)

The active near-term goal. **Internal TestFlight first** (up to 100 testers on the dev team)
was chosen over straight-to-external because internal needs **no Beta App Review, no privacy
nutrition labels, and no COPPA store questionnaire** to get a running build into testers'
hands — those gate *external* testers and public submission, not the first internal build.
The items below are the critical path, ordered; the "before external testers" block after it
is explicitly *not* blocking the first build.

**Blocks the first internal build:**

- **Apple Developer Program + signing.** Membership, an App ID for `com.gravyapp.app`, and a
  distribution certificate + provisioning profile. Mostly a human/account task, but nothing
  uploads without it. *(P1, M.)*
- **App Store Connect app record.** Create the app (bundle id `com.gravyapp.app`) so a build
  has somewhere to land; answer the **export-compliance** question (standard "no
  non-exempt encryption") — required to process any uploaded build. *(P1, S.)*
- **A build → upload pipeline.** Minimum viable: a documented local `xcodebuild archive` +
  Transporter/Organizer upload so a build reaches TestFlight at all. The durable version is
  CI (Fastlane or equivalent) producing signed builds — worth doing early but the manual path
  unblocks the first build. *(P1, M.)*

**Before external testers / public submission (not first-build blockers):**

- Store listing content + the COPPA-relevant store questionnaires (Apple Kids Category/age
  rating, and Google Play Families if/when Android ships) — stricter than Epic 6's general
  privacy-policy item because this targets kids. Pairs with Epic 9's COPPA signup review.
  *(P0 once external/public submission is scheduled.)*
- Privacy nutrition labels + Beta App Review prep (only external TestFlight triggers review).
  *(P1, S–M, before external testers.)*
- **Crash reporting (Sentry or equivalent)** — zero crash/error visibility today. Not a hard
  gate on the first internal build, but pull it in right after: once on-device, the update
  cadence and any reviewer back-and-forth depend on seeing crashes you can't reproduce from a
  web console. *(P1, M — fast-follow.)*
- **Device-matrix testing** — `verify_gravy.mjs` is a manual, single-viewport Playwright
  script; broader device/OS coverage matters before scaling testers, not for the first build.
  *(P1, M.)*
- **OTA update policy decision** (Capacitor Live Updates vs. store-review-per-release) — a real
  decision, but it only bites once you're shipping updates, not on the first build. *(P1, M.)*

## Epic 11 — Visual Design & Layout Polish

Grounded in a UI-density pass on the kid home screen (branch
`claude/ui-spacing-layout-d8s2gh`): the screen read as "chonky." A first pass
tightened it at the token level — radii `22/14 → 18/12`, shadows `4px/5px →
3px/4px`, `.scroll-area` gutter `16 → 12px`, `.card` padding/gap `16/14 →
14/10`, the stats/games cards and history banner gaps to `10`, and harmonized
all hardcoded `14px` radii (parent panels + the kid food/goal tiles) onto
`var(--radius-sm)` so they track the token as originally intended. The two
items below were deferred from that pass because they're larger, more
opinionated changes that need a mockup before committing.

- **Break the single-column home stack into a denser layout.** On a phone,
  `QuickLinksRow → StatsCard → FoodTray → DailyGoals → BonusPoints`
  (`src/components/HomeScreen.tsx`) is one long vertical scroll — the biggest
  "use the space differently" win. The Games card has since been folded into
  `QuickLinksRow`'s 3-pill row alongside Stats/Prizes, but `StatsCard`, `FoodTray`,
  `DailyGoals`, and `BonusPoints` still stack full-width. Remaining candidate:
  Daily Goals / Bonus Points side-by-side on wider phones (the
  `@media (min-width: 768px)` block in `src/index.css` already does this kind
  of widening for the food/store grids). Needs a mockup to compare against the
  current flow before building. *(P2, M.)*
- **Modernize the shadow treatment.** The hard `Npx Npx 0` offset shadows are
  the heaviest part of the neo-brutalist look. Options: drop card shadows to
  `2px`, or move cards to a soft `0 2px 8px rgba()` while keeping hard offset
  shadows only on interactive buttons/tiles. This is a real style shift (it
  changes the brand feel, not just density), so it should be designed and
  reviewed as a deliberate visual-direction decision rather than a tweak.
  *(P2, S–M.)*

## Epic 13 — Engineering & Security Audit (July 2026)

*(Grounded in a fresh, independent codebase audit — `AUDIT_REPORT.md` — covering bugs,
architecture, code quality, performance, security, accessibility, testing, DX, dependencies,
and scalability. The single highest-severity finding from that audit — the parent's email
leaking via the synced audit log — is filed under Epic 9 above since it's a direct extension
of that epic's existing RLS item. Everything else from the audit lands here.)*

### Security

- **Client-side-only parent gate has no server-mirrored authorization check.**
  `isGrownUpUnlocked` (`src/state/auth.ts:114-116`) is a pure rendering predicate; the
  catalog mutation functions it gates (`src/state/actions/useCatalogActions.ts`) have no
  authorization check of their own, and `gravy_upsert_household_state`'s existing-row branch
  is anon-writable for an already-claimed household by design (kid-mode sync without an
  account). A household member with DevTools access could bypass the parent gate entirely
  for their own household's data — documented as an accepted tradeoff in
  `docs/persistence-and-sync.md`. This item is to get explicit sign-off on that threat model,
  or scope the RPC to reject settings-shaped payloads from non-members. *(P2, decision, or S
  if scoping the RPC.)*
- **Hardcoded Supabase URL/key, no `.env` convention.** `src/lib/supabaseClient.ts:3-4` —
  not a live secret (publishable-key-by-design) but there's no way to point at a
  staging project without a code change. *(P2, S.)*
- **No CSP meta tag.** `index.html` — defense-in-depth only, no injection sink found. *(P2, S.)*
- **`@capacitor/core` misplaced in `dependencies`.** Never imported in `src/`; belongs in
  `devDependencies` alongside its siblings. *(P2, S.)*

### Testing & Reliability

- **`verify_gravy.mjs` is broken against the current app.** Asserts against a removed
  PIN-unlock flow (`.pin-key`/`.pin-dot`) and nonexistent `.nav-btn`/`.week-strip-header`
  selectors — would fail immediately if run, giving false confidence that a working smoke
  test exists. Not wired into CI. *(P1, S to update selectors for the current sign-in flow;
  the long-term successor is Epic 10's "device-matrix testing" item.)*
- **Zero component/UI-level automated test coverage.** `vitest.config.ts` only covers pure
  logic under `src/state/`; no `@testing-library/react`/`jsdom`, no render/interaction
  tests, `GravyContext`'s actual wiring is untested. *(P2, M — start with `GravyProvider`
  wiring plus one or two panels rather than full coverage.)*
- **Single global `ErrorBoundary`.** `src/App.tsx:27-50` wraps the entire app; a bug in one
  drawer/mini-game blanks the whole UI instead of isolating failure. *(P2, S–M.)*

### Developer Experience

- **TypeScript strict mode is not actually enabled**, despite the now-stale
  `CODE_REVIEW.md` claiming it is — none of the three tsconfig files set `"strict": true`.
  *(P1, S–M — likely a contained lift given the code already appears written in a strict
  style by convention.)*
- **Stale prior audit doc left unlabeled.** `/CODE_REVIEW.md` describes a PIN-unlock system
  and badge system both fully removed since it was written (Epics 8, 12); its findings on
  those subsystems are moot and it could mislead a new contributor. *(P1, S — label as
  historical/archive, don't delete the history.)*

### Architecture, Performance & Code Quality

- **`GravyContext`'s value is unmemoized and unsliced.** `src/state/GravyContext.tsx:325-348`
  — every `useGravy()` consumer re-renders on any state change (a celebration overlay firing
  re-renders the whole tree); zero components anywhere use `React.memo`. Low pain today at this app's scale,
  but the structural root cause worth fixing before state/screen count grows further. *(P2, M.)*
- **`GoalsPanel`/`StorePanel` duplicate ~80 lines of CRUD/inline-edit scaffolding.**
  `src/components/parent/GoalsPanel.tsx` vs `StorePanel.tsx` — same edit-state shape and
  save/cancel handlers, copy-pasted rather than shared; a validation fix to one won't
  propagate to the other. *(P2, M — extract a shared `useEditableList` hook.)*
- **`Onboarding.tsx` (180 lines, shrunk from 306/6 phases by the onboarding revamp — see
  BACKLOG_DONE.md Epic 14) still models its 4-phase wizard as flat sibling `useState`s**
  with a hand-rolled back-navigation if/else chain (`handleBack`) that has to independently
  know every phase's provenance. *(P2, S — candidate for `useReducer`, smaller now than
  before.)*
- **`AppShell` tracks overlay visibility via ten independent booleans**
  (`src/App.tsx:53-62`) rather than one discriminated-union `activeOverlay` state; permits
  two overlays open at once in principle and adds a boolean per future drawer. *(P2, S.)*
- **Duplicated "menu/detail router + header-sync" pattern**, implemented identically three
  times (`ParentDashboard.tsx`, `SettingsPanel.tsx`, partially `CalendarPanel.tsx`), and a
  duplicated `{title, onBack}` header-state shape in three drawer components. *(P2, S —
  extract `useSubPanelRouter`/`useDrawerHeader`.)*
- **Theme set hand-encoded in three unsynchronized places** (CSS `:root[data-theme]`
  blocks, `THEME_COLORS` in `GravyContext.tsx:35-43`, `THEME_OPTIONS` in
  `ProfilesManager.tsx:12-20`) — nothing enforces all three stay in sync when a theme is
  added. *(P2, S.)*
- **Icon registry requires touching three places per pickable icon**
  (`src/data/icons.ts`) with nothing enforcing consistency. *(P2, S.)*
- **`LogPanel` re-sorts the merged action/audit log on every render**, unbounded within the
  existing 500/300-entry caps. *(P2, S — memoize.)*

### Accessibility

- **No automated a11y linting.** `eslint-plugin-jsx-a11y` isn't wired into
  `eslint.config.js`; existing good patterns rely on discipline, not tooling. *(P1, S.)*
- **Several inputs identified only by placeholder text, no `<label>`.**
  `StorePanel.tsx`, `PointsPanel.tsx`, `ProfilesManager.tsx:133-140` (`GoalsPanel.tsx`'s
  fields got `aria-label`s in the Goals-panel UX pass below). *(P2, S.)*

### Bugs

- **`ProfilesManager` double-writes on name edit.** `src/components/ProfilesManager.tsx:138-139`
  — `updateProfile` fires on every keystroke (`onChange`) and again on `onBlur`. *(P2, S —
  buffer locally, commit on blur only.)*
- **`UpdatePrompt` force-reloads without an actual prompt**, despite
  `registerType: 'prompt'`. `src/components/UpdatePrompt.tsx:22-24` — can reload the page out
  from under an active interaction. *(P2, S — either switch to `registerType: 'autoUpdate'`
  to match behavior, or gate the reload on real user confirmation.)*
- **Inconsistent `useCallback` dependency arrays** in
  `src/state/actions/useKidProgressActions.ts` — not a live bug (omitted deps are stable
  imports) but a maintenance trap if one of those imports later becomes a prop/state.
  *(P2, S.)*

### Dependencies

- **`@playwright/test` present with no `playwright.config.ts`/script**, only reachable via
  the broken `verify_gravy.mjs` above. *(P2, S — resolve alongside that item.)*

## Epic 15 — Expert Panel Review (July 2026)

*(Grounded in `EXPERT_PANEL_REPORT.md` — a simulated 25-persona expert review spanning child
psychology, pediatric nutrition, accessibility, security/privacy, game design, teaching, and
family logistics; every finding verified against shipped code and a live browser walkthrough.
Finding numbers (F1…) reference that report. Panel findings that re-discovered already-tracked
gaps stay in their home epics — see the report's §10 corroboration table — so this epic holds
only net-new items.)*

### Nutrition model

- **Stop requiring Sweets for Full Tray and the food streaks (F1).** `fullTray` is
  `FOODS.every(...)` (`src/state/defaultState.ts:590-596`, mirrored in
  `backfillStreaksFromLogs`), so the +25 bonus, `foodStreak`, and `megaStreak` all *require*
  logging Sweets daily — a kid who skips dessert can never hold a food streak, and Sweets pays
  the same +10 as Veggie. Decide the intended model (exclude Sweets from gating, or a
  configurable gating set), then update rollover/backfill/`FoodTray` copy together. The panel's
  top reputational-risk item. *(P1, S–M.)*
- **Make the food-group list parent-editable, or at least Sweets-optional (F2).** `FOODS` is a
  hardcoded const (`src/data/foods.ts:10-17`); `PointsPanel` edits point values only, so parents
  can't remove/rename a group the way they can any goal or reward. Shape depends on the F1
  decision. *(P1, M.)*
- **Review the seeded food-penalty item against responsive-feeding guidance (F3).** "Junk food
  as a 'meal'" −20 (`src/state/defaultState.ts:68`) coexists with Sweets earning +10, and
  penalizing a child for food choices contradicts division-of-responsibility feeding practice.
  *(P2, decision + S.)*

### Behavioral design

- **Add a streak grace mechanism (F4).** All four streaks hard-reset on one missed day
  (`applyDayRollover`, `src/state/defaultState.ts:585-596`) — a sick day zeroes a 40-day Mega
  Streak. One forgiveness day per week (or an earnable streak freeze) is the standard fix; the
  point-forgiveness arithmetic in `src/state/points.ts` shows the house pattern to follow.
  *(P1, M.)*
- **Make behavior deductions opt-in rather than seeded defaults (F5).** "Swear jar"/"Sore
  loser"/"Junk food" ship as kid-visible, kid-tappable home-screen rows
  (`src/state/defaultState.ts:66-68`); the panel (child-psych + special-ed) recommends
  deductions be a parent-enabled pattern, possibly parent-side-only. *(P2, decision + S.)*
- **Decide on Roll to the Goal's gambling-adjacent mechanics, and label the display score
  (F6).** Hold/reroll dice + near-miss payout tiers (`src/data/rollToGoal.ts:69-74`) are
  variable-ratio reinforcement mechanics; separately, nothing on screen says the 0–500 "Final
  Daily Score" isn't real points. *(P2, decision; S for the score label.)*
- **Rename the bottom rank tiers (F7).** "Noob" negs the beginner and "Granny" as the
  second-lowest rank is casually ageist (`src/data/ranks.ts:18-19`); "Aura Farmer" is
  untranslatable trend slang. A one-time copy fix, consistent with Epic 4's don't-churn-content
  caution. *(P2, S.)*

### Accessibility

- **Hide closed overlays from assistive tech and the tab order (F8).** Every screen is always
  mounted and hidden only via `opacity: 0; pointer-events: none` (`src/index.css:889-894`) with
  a permanent `role="dialog" aria-modal="true"` (`src/components/Modal.tsx:28-29`) — verified
  live: 40 Tab presses from home landed focus inside the closed Reward Store. Add `inert` (or
  `visibility: hidden` post-transition) to closed overlays. The app's largest structural a11y
  defect, distinct from Epic 13's lint/label items. *(P1, M.)*
- **Announce dynamic feedback to screen readers (F9).** Zero `aria-live`/`role="status"`/
  `role="alert"` in `src/` — point awards, celebrations, game banners, sync/storage errors are
  all visual-only. *(P1, S.)*
- **Deduplicate goal-row tab stops (F10).** Each daily-goal row is a `role="button"` div *plus*
  an inner check `<button>` bound to the same action (`src/components/DailyGoals.tsx:95-98,129`),
  doubling keyboard traversal of the core loop. *(P2, S.)*
- **Replace the blanket reduced-motion kill switch with targeted rules, and measure theme
  contrast (F11).** `* { animation: none; transition: none }` (`src/index.css:2667-2669`) also
  removes non-vestibular affordances; theme palettes have never been checked against WCAG
  ratios. *(P2, S–M.)*

### UX & copy

- **Show pending (awaiting-approval) points inline on kid devices (F12).** On approval-gated
  devices earns queue at 0 pts and the StatsCard still reads "0 Coins" — the only cue is the
  bell badge (`src/components/TopBar.tsx:15,37`). An inline "waiting for a grown-up" state
  preserves the do-thing→number-goes-up loop. *(P1, S–M.)*
- **Reconcile the "Daily" pill with the "Arcade" screen title (F13).** Documented as deliberate
  in `docs/systems.md`, but three panel personas mis-predicted it independently. *(P2, S.)*
- **Unify the currency name (F14).** `StatsCard` says "Coins" (`src/components/StatsCard.tsx:64`);
  everywhere else says "pts"/"points". *(P2, S.)*
- **Give kids a read-only view of their own past days (F15).** The calendar is parent-gated;
  kid-facing stats are aggregates only. Note `CLAUDE.md:85` currently claims this view already
  exists (`viewedDate`/`CalendarGrid`) — it does not (see the docs-accuracy item below).
  *(P2, M.)*
- **Add a quick re-lock for shared family devices (F16).** Re-locking requires full sign-out +
  password re-entry, so shared tablets stay permanently unlocked, giving kids standing access to
  Approvals/Game Settings. An unlock timeout or per-open confirmation is the web-side answer;
  pairs with Epic 10's biometric re-entry for native. *(P2, M.)*
- **Replace the "Zack" default child name with a neutral fallback (F17).**
  `src/state/defaultState.ts:82` — shows as "Good evening, Zack!" until (or unless)
  `FirstKidPrompt` sets a name. *(P2, S.)*
- **Feed the release-notes ticker or drop it (F18).** `RELEASE_NOTES` has one entry ever
  (`src/data/releaseNotes.ts:10-12`) at app version v1.1.205. *(P2, decision + S.)*

### Games & economy

- **Per-profile difficulty for the Arcade (F19).** Math Facts generates one fixed band
  (`src/data/mathFacts.ts:15-30`); Hangman/Scramble draw from one 3rd-grade list
  (`src/data/hangmanWords.ts`). Too hard at 7, trivial at 12 — and per-kid profiles already
  exist to hang a setting on. *(P1, M.)*
- **Reprice the seeded reward economy against the daily earn ceiling (F20).** A strong day
  yields 200+ pts; "$5 allowance" costs 200 (`src/state/defaultState.ts:76`) — as seeded, a
  diligent kid mints ~$150/month. Reprice the money reward or surface the economy math in the
  parent dashboard. *(P2, S.)*

### Process & engineering

- **Fix verifiably false claims in the always-read docs (F22).** `CLAUDE.md:85` describes a
  nonexistent kid history view (`viewedDate` appears nowhere in `src/`); `AUDIT_REPORT.md` §3.6
  references removed themes. Same class of hazard as the `CODE_REVIEW.md` item in Epic 13.
  *(P1, S.)*
- **Fix the heatmap pluralization, and take an explicit stance on i18n (F21, F23).** "1 active
  days in the last 12 weeks" (`src/components/stats/ActivityHeatmapSection.tsx:23`); more
  broadly every string is hardcoded hand-pluralized English — staying English-only is fine but
  should be a recorded decision. *(P2, S for the bug; decision only for i18n.)*

## Do these next (top 5, in order)

The original top-5 (PIN/recovery hashing, the PR #92 decision, the lint gate,
Vitest, and Supabase access control) is fully done, as is the second wave
(data-handling note, error hardening, accessibility pass, points economy) — all
in `BACKLOG_DONE.md`. Two more of the prior top-5 are now done as well: the
**collection/record-level sync merge** that replaced whole-blob last-write-wins
(`src/state/merge.ts`, Epic 9) and the **Capacitor wrap spike** (Epic 10;
`docs/capacitor.md`).

**Reprioritized after the July 2026 audit (Epic 13):** one finding from that audit —
a live data-exposure bug, cheap to fix — now outranks everything else, including the
TestFlight path. Do it first, standalone, before resuming the TestFlight critical path:

0. **Stop embedding the parent's email in the synced audit log** (Epic 9, P0/S) — a
   fresh audit found the signed-in parent's email is being written into `state.auditLog`,
   which is exposed by the already-known-open `households` SELECT policy
   (`src/state/auditLog.ts:16-19`). Directly contradicts `DATA_HANDLING.md`. One small,
   self-contained change (store `actorUserId` only, resolve the label client-side) — do
   this before anything else below, it doesn't block or depend on the larger RLS migration.

**Then, current focus: get a first build into internal TestFlight.** Push notifications
were the prior #1, but a TestFlight build needs no push — it's a fast-follow once
on-device, not a blocker. The first two critical-path items are now done:
**disabling the PWA service worker under `--mode capacitor`** and **native app
icons/splash + graduating `ios/` into the repo** (both `BACKLOG_DONE.md` Epic 10).
The path below is the rest of Epic 10's "Path to first TestFlight build (internal
testing)" critical path, front-loaded, then the highest-value work that pairs with
going on-device:

1. **Signing + App Store Connect + a build→upload pipeline** (Epic 10, P1/M) —
   Apple Developer membership, App ID for `com.gravyapp.app`, distribution
   cert/profile, the app record (answer export-compliance), and at minimum a
   documented local `xcodebuild archive` + Transporter upload. This is the step
   that actually puts a build in TestFlight; CI/Fastlane is the durable version.
2. **Native push notifications (APNs/FCM)** (Epic 5/10, P1/M) — the biggest
   retention lever and the top fast-follow once on-device. Skip web push: with the
   Capacitor route chosen, iOS PWA web push would be partly throwaway.
3. **Crash reporting (Sentry or equivalent)** (Epic 10, P1/M) — pull in right
   after the first build lands; on-device, you can't reproduce crashes from a web
   console, and update cadence depends on seeing them.
4. **Offline write queue with replay** (Epic 9, P1/M) — no write queue exists
   today beyond the realtime subscription, so a device offline at edit time just
   lags until reconnect; pairs with the now-done collection/record-level merge
   (`src/state/merge.ts`) so replay lands queued edits safely.

**Audit fast-follows (Epic 13) — parallel track, none block the TestFlight path above,**
each is small enough to slot into any gap in the native work:

- Fix or explicitly deprecate **`verify_gravy.mjs`** (P1/S) and label **`CODE_REVIEW.md`**
  as historical (P1/S) — both are currently "false confidence" artifacts.
- Enable **TypeScript strict mode** (P1/S–M) while the codebase is still small enough for
  it to be a contained lift.
- Wire up **`eslint-plugin-jsx-a11y`** (P1/S) —
  cheap, and accessibility carries extra weight for an app built for kids.
- Everything else in Epic 13 (duplicated CRUD/router extraction, `GravyContext`
  memoization, `Onboarding.tsx` → `useReducer`, component test infra, and the remaining
  P2 items) is real but not urgent — pick up opportunistically once the items above and
  the TestFlight path are moving.

**Panel fast-follows (Epic 15) — second parallel track, also non-blocking for TestFlight.**
The July 2026 expert panel independently re-derived item 0 above and several Epic 13 items
(reinforcing their priority — see `EXPERT_PANEL_REPORT.md` §10), and added two product-level
P1 clusters of its own, worth slotting in before external testers ever see the app:

- **The nutrition-model fix (F1/F2)** — Sweets currently gates Full Tray and both food
  streaks; the panel's top reputational-risk finding, and cheap to at least decide.
- **The closed-overlay a11y fix + live-region announcements (F8/F9)** — the app is
  effectively unusable non-visually until closed dialogs leave the accessibility tree.
- Then, as retention levers alongside the native push work: **streak grace (F4)**,
  **visible pending points on kid devices (F12)**, and **per-profile game difficulty (F19)**.

Holding just off the top-5 but still near-term: gated on *external* TestFlight
rather than internal, the **COPPA signup review** (Epic 9, P0 once real-account
rollout is scheduled) and **account-level data deletion** (Epic 9, P1/S–M). These
move up the moment the target shifts from internal to external testers.
