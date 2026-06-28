# Gravy Product Backlog

This is the living backlog for Gravy, written during a project takeover after the
previous build phase went heads-down on features with no roadmap, no tests, and
two PRs left open-ended. It's grounded in a fresh audit of the codebase (engineering,
PWA/infra/accessibility, security/privacy) and the full PR history (93 PRs).

## How to read this

- **Priority**: `P0` = do next, live risk or blocker · `P1` = important, do soon ·
  `P2` = valuable but not urgent, or contingent on a later distribution decision.
- **Size**: `S` = under a day · `M` = a few days · `L` = a real project.
- Items reference the evidence behind them (PR numbers, file paths) so priority
  calls can be re-checked later instead of taken on faith.

## Snapshot — what's already built

Goals (daily/one-time/multi-step) + streaks, a reward store with parent approval,
61 badges across 6 groups, a 24-tier rank ladder, 4 educational mini-games
(Hangman, Math Facts, Word Scramble, Memory Match), multi-kid profiles per
household, 5 visual themes, full-screen onboarding, a PIN-gated parent dashboard
(Approvals/Goals/Calendar/Store/Badges/Settings), and optional real-time Supabase
sync via a 6-character household code. This is a mature, feature-complete product
surface — the gaps below are about durability (security, tests, accessibility,
process), not missing features.

## Epic 1 — Security & Trust

- ~~**Revive PR #93**~~ — **DONE.** Rebased and merged as PR #97
  (`Hash PIN and recovery answer; add brute-force lockout`). PIN and recovery
  answer are now salted-SHA-256 hashes (`src/state/hash.ts`), with a per-device
  exponential-backoff lockout after 5 failed attempts (`src/state/pinLockout.ts`).
  Plaintext fields are migrated to hashes on load and deleted.
- ~~**Decide the fate of PR #92** (rank-ladder reorder)~~ — **DECIDED: stays
  closed, won't merge.** The diff only reshuffles rank *names* across the same
  placeholder point thresholds from PR #90 ("exact balance will be revisited
  later") — no stated rationale ties the new order to any difficulty curve or
  theme, and it doesn't touch the actual flagged problem (the thresholds
  themselves are still the placeholder quadratic curve from PR #90). Merging it
  would just rename which animal a kid currently holds at a given point total,
  with no game-balance benefit, and would need re-deciding anyway once the real
  rank-curve design pass (Epic 4) happens. Re-open only as part of that design
  pass, not as a standalone reorder.
- ~~**Add real access control to the Supabase `households` table.**~~ —
  **DONE.** `supabase/migrations/20260623000000_scope_household_mutations.sql`
  revokes the unscoped anon INSERT/UPDATE grants and replaces them with three
  `SECURITY DEFINER` RPCs (`gravy_create_household`, `gravy_upsert_household_state`,
  `gravy_rename_household`) that each only touch the one row matching the
  caller-supplied code. SELECT is intentionally still open (required for
  Supabase Realtime sync under the shared anon key — there's no per-household
  auth claim to scope it by). Decision: accept the remaining read exposure for
  now given single/few-household scope; revisit if the household-code space is
  ever opened to the public.
- ~~**Rate-limit household-code lookups**~~ — **DONE.**
  `supabase/migrations/20260623184956_rate_limit_household_lookup.sql` adds a
  `gravy_lookup_household` `SECURITY DEFINER` RPC (and a backing
  `household_lookup_attempts` table) that throttles join-by-code lookups to 10
  per 5-minute window per source IP (read from PostgREST's `request.headers`
  GUC, falling back to a single shared bucket if no IP is available) before
  returning a code's state. `fetchHousehold()` (`src/state/sync.ts`) now calls
  this RPC instead of querying the table directly; `joinHousehold` surfaces the
  rate-limit error as a toast. Residual risk, same class as the one already
  accepted above: the table's SELECT grant must stay open for `anon` for
  Realtime, so a client that bypasses this RPC and queries the REST endpoint
  directly isn't blocked by it — this closes the documented, discoverable
  join-flow path, not direct REST access. *(P1, S–M.)*
- ~~**Write a short data-handling note**~~ — **DONE.** See `DATA_HANDLING.md`:
  what's collected (child name + hashed PIN/recovery answer only — no email,
  accounts, or analytics), where it lives (`localStorage` + optional Supabase
  household row), and how to delete it.
- ~~**Close two gaps found while writing that note**~~ — **DONE.**
  (1) `supabase/migrations/20260623225331_delete_household_everywhere.sql`
  adds a `gravy_delete_household` SECURITY DEFINER RPC, scoped to one code
  like the other three; `SyncPanel` now has a "Delete household everywhere"
  action distinct from "Turn off cloud sync" — leaving still only disconnects
  this device (other devices may depend on the row), but a parent can now
  explicitly delete it for everyone. (2)
  `supabase/migrations/20260623225536_cleanup_lookup_attempts.sql` has
  `gravy_lookup_household` opportunistically delete other buckets whose
  rate-limit window has lapsed on every call, bounding
  `household_lookup_attempts` to roughly the IPs seen in the last window
  instead of growing forever, without needing a separate scheduled job.
  *(P2, S.)*

## Epic 2 — Engineering Foundation & Quality

- ~~**Stand up Vitest** and write unit tests for the state logic that actually
  moves points: `awardPoints`/`awardPointsForDay`, streak rollover
  (`applyDayRollover`), badge triggers (`findNewlyEarnedBadges`), and bonus-item
  forgiveness/exact-undo.~~ **DONE.** Added `vitest` + `npm test`; the award/
  forgiveness/exact-undo arithmetic was extracted out of `GravyContext.tsx`'s
  `useCallback` closures into a pure `src/state/points.ts` (same behavior, now
  independently testable) with `src/state/points.test.ts` covering it,
  `src/state/defaultState.test.ts` covering `applyDayRollover`/
  `backfillStreaksFromLogs`, and `src/state/badges.test.ts` covering
  `findNewlyEarnedBadges`/`getBadgeProgress`/`getBadgeDisplay`. *(P0, M.)*
- ~~**Fix the `todayGoals` rollover bug**~~ caught while writing the tests
  above: `applyDayRollover` only cleared `todayGoals` of ids that no longer
  matched a *current* daily goal, instead of clearing it outright, so a daily
  goal's id stayed there forever once logged once — permanently tripping
  `incrementGoal`'s "already awarded today" guard and silently killing its
  payout from day 2 onward, while the UI (driven by `todayGoalCounts`,
  correctly reset daily) kept showing it as completable. **DONE** —
  `todayGoals` is now unconditionally cleared (`= []`) at rollover, same as
  `todayGoalCounts`. Exactly the kind of regression standing up tests was
  meant to catch.
- ~~**Fix UTC/local day-boundary mismatch in day rollover**~~ — reported as
  "the day at the top says today, but items I selected last night are still
  selected." `todayStr()`/`applyDayRollover()` keyed "today" off **UTC**
  date fields (by original deliberate design, so every device in a synced
  household agreed on "today" regardless of timezone) while the date shown
  in the UI (`Greeting.tsx`, `CalendarPanel.tsx`) used the device's
  **local** date. For any timezone west of UTC (all of North/South America),
  UTC midnight lands hours before local midnight, so an evening goal-check
  could already land on the next UTC day; by the next local morning, the
  local calendar had rolled over but the UTC date — and thus
  `lastActiveDate` — hadn't, so rollover silently no-op'd and last night's
  selections stayed checked. **DONE** — `dateStrUTC()` is now
  `dateStrLocal()`, built from local date fields, matching the UI; all call
  sites (`todayStr()`, `applyDayRollover()`'s yesterday calc,
  `backfillStreaksFromLogs()`) and their `setUTCDate`/`setDate` arithmetic
  were updated to match. `vitest.config.ts` pins `TZ=UTC` for the test
  process so the existing UTC-suffixed test fixtures stay deterministic;
  `src/state/defaultState.test.ts` adds a regression test that fails
  against the old UTC-keyed implementation. Tradeoff: a household synced
  across timezones may now briefly disagree on "today" near midnight
  instead of agreeing on the wrong "today" for everyone.
- ~~**Add a household-wide configurable time zone**~~ — resolves the
  tradeoff noted at the end of the entry above: with day-boundary logic
  keyed off each device's own local clock, a household synced across
  timezones could briefly disagree on "today" near midnight, and any
  device's own system timezone (not necessarily where the kid actually
  lives) silently decided streak/rollover behavior. **DONE** —
  `Settings.timezone` (an IANA zone id, default `'America/New_York'`) is now
  a shared field (`SHARED_SETTING_KEYS` in `defaultState.ts`) editable by a
  parent via the new `TimezonePanel` in the Settings screen. `todayStr()`,
  `applyDayRollover()`, and `backfillStreaksFromLogs()` (`defaultState.ts`)
  no longer read any local `Date` field at all — they take/derive an
  explicit zone and use `Intl.DateTimeFormat` (and a UTC-anchored
  `addDaysToDateStr()` helper for date-string arithmetic), so every device
  in a household now agrees on "today" by using the same configured zone,
  not whichever zone each device's clock happens to be set to.
  `src/data/timezones.ts` holds the default, the full IANA list (via
  `Intl.supportedValuesOf('timeZone')`, with a static fallback for older
  runtimes), and `isValidTimezone()` validation used by both
  `sanitizeState()` and `saveSetting()`.
- ~~**Add a CI gate**~~ — **DONE.** `deploy.yml` now runs `npm run lint` then
  `npm test` before `npm run build`, so a lint or test failure blocks deploy.
  *(P0, S.)*
- ~~**Harden error handling**: wrap `localStorage` writes in try/catch with a
  user-visible fallback for quota-exceeded or disabled storage (e.g. iOS private
  browsing), and validate the shape of incoming Supabase realtime payloads
  before trusting them.~~ — **DONE.** Every `localStorage` call in `src/`
  now goes through `safeGetItem`/`safeSetItem`/`safeRemoveItem`
  (`src/state/storage.ts`), which catch the exception `localStorage` throws
  when disabled or full instead of letting it propagate. `saveState`/
  `saveRoot` (`src/state/defaultState.ts`) return a boolean; `GravyProvider`'s
  autosave effect shows a one-time "Couldn't save" toast on failure (deduped
  on repeat failures, reset once a write succeeds again) so a kid's progress
  isn't silently lost. `subscribeToHousehold` (`src/state/sync.ts`) now
  validates an incoming realtime payload has a `profiles` array
  (`isValidHouseholdStatePayload`) before handing it to the app, on top of
  the existing per-field `hydrateState`/`sanitizeState` validation. *(P1, M.)*
- ~~**Add an "update available" prompt** for the PWA.~~ — **DONE.**
  `src/components/UpdatePrompt.tsx` (using `virtual:pwa-register/react`'s
  `useRegisterSW()`) checks for a new service worker every 60s while the app
  is open and again on every `visibilitychange` to visible, then auto-applies
  and reloads immediately (no manual click, no dismiss) with a brief status
  banner — tuned for a rapid-beta-testing phase where missing an update is
  worse than an unprompted reload.
- **Refactor `GravyContext.tsx`** (~1240 lines) — extract household/sync logic
  into its own hook/module before it grows further. Pure maintainability, no
  user-facing effect. *(P2, M.)*

## Epic 3 — Accessibility

- ~~**Accessibility hardening pass**~~ — **DONE.** All four sub-items below
  landed together (interactive tiles, modals/drawers, theme CSS, label
  sizes), as planned. *(P1, M overall.)*
  - ~~Add aria-labels / semantic roles to interactive tiles~~ — many were
    `div`+`onClick` or unlabeled buttons across both kid and parent surfaces.
    **DONE.**
  - ~~Add focus trapping / return-focus to modals and drawers~~ (Calendar,
    Badge popup, Onboarding, PIN screen). **DONE** — `useFocusTrap`
    (`src/components/useFocusTrap.ts`), wired into `Modal`, `RankScreen`,
    `GamesScreen`, `BadgePopup`, `ConfirmDialog`, `AccountMenu`,
    `SyncGateModal`, `Celebration`, and `PinScreen`.
  - ~~Run a color-contrast pass across all 5 themes~~ (classic / midnight /
    ocean / bubblegum / cyberpunk). **DONE** — darkened the base `--muted`
    token for classic and ocean (the two themes where `--bg`/`--card`/
    `--cream` are all light, so a single token fix covers every
    muted-text-on-card combination); for midnight/cyberpunk, where `--dark`/
    `--text`/`--muted` are dual-purposed (flipped light to read on dark
    surfaces elsewhere), extended the existing scoped per-selector ink
    overrides in `src/index.css` instead of touching the shared token. Added
    `.muted-note` and `.empty-state--bare` classes to replace inline
    `color: 'var(--muted)'` styles and a dual-context shared class, both of
    which were otherwise unreachable by a CSS theme override.
  - ~~Audit/raise minimum label font sizes~~ — **DONE.** Raised the
    `--text-2xs` token from 10px to 11px (the floor used by `.food-label`,
    `.store-need-more`, `.badge-progress-label`, `.rank-row-points`,
    `.rank-row-status`, and `.theme-swatch-label`); verified via Playwright
    screenshots across classic/cyberpunk that none of the six clip or
    overflow at the new size. Left three single-glyph icon-badge sizes below
    11px untouched as out of scope — `.sync-warning-icon` (0.6rem),
    `.nav-badge::after` (0.6rem), and `.food-check-badge` (0.55rem) are
    decorative counts/glyphs in small fixed circles, not textual labels.

## Epic 4 — Game Balance & Content Debt

- ~~**Design the points economy in one pass**~~ — **DONE.** Computed the
  realistic daily point ceiling from current defaults: food (5 groups ×
  `foodPts` + the one-time full-tray `bonusPts`) = 75, all 8 default daily
  goals = 105, each positive bonus item once = ~60, games capped at
  `DAILY_GAME_WIN_CAP` (3) × `gamePts` = 45 — a max-engagement day ≈ 285,
  with a more typical day around 120–200. Decision (confirmed with product
  owner): bonus items stay uncapped — the parent tapping the button after
  witnessing the real behavior is the actual gate, not a UI limit, so the
  ceiling math is sized off realistic engagement rather than a theoretical
  unbounded one. Against that ceiling, the old rank curve (gaps growing 50/
  rank, max rank at 13,800 — the placeholder from PR #90) topped out in only
  ~2-3 months of consistent play, leaving the 24-tier ladder with nothing
  left to chase for the rest of the app's life. Rescaled gaps 5x (250/rank,
  `src/data/ranks.ts`, max rank now 69,000) to target roughly 11-15 months
  to max rank at the typical 150-200 pts/day pace (69,000 / 200 ≈ 345 days,
  69,000 / 150 ≈ 460 days), while keeping the first rank-up
  fast (~1-2 days) for early hook. Action point values (food/goal/bonus/game
  pts, reward costs) were left untouched — they're parent-editable per
  household already, and the points-badges in `badges.ts` (max 10,000) were
  also left as-is, intentionally completing earlier in the new ladder as a
  shorter-arc reward system distinct from the rank ladder's longer arc.
  *(P1, M.)*
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
scope today is "plan for optionality," not commit.)*

- ~~App store packaging (TWA/PWABuilder for Android; iOS wrapper or App
  Clip).~~ **SUPERSEDED** — the wider-distribution decision this was
  contingent on has been made (Capacitor wrap, not a TWA/App Clip wrapper);
  see Epic 10's packaging items instead.
- Lightweight, privacy-respecting, **opt-in** analytics — no third-party
  trackers exist today by design; if added, keep it self-hosted/aggregate-only
  given the child-data context.
- Formal privacy policy / ToS page and a COPPA-adjacent compliance review
  before any public sign-up flow. Partly addressed by Epic 9's "COPPA-specific
  review of the account signup flow" item once real accounts are scheduled —
  that item is narrower (the signup flow itself); this one covers the
  standalone policy page/ToS.

## Epic 7 — Process Hygiene

- ~~**Triage every open/unmerged branch explicitly** (#92, #93 today)~~ —
  **DONE**: #93 merged as #97, #92 explicitly decided to stay closed (see
  Epic 1). Standing principle going forward: don't let future work pile up
  unmerged and unresolved the way these two did.
- **Keep this `BACKLOG.md` living** — update priorities as items land instead
  of letting new PRs silently supersede old ones without a record.
- **Hold a short UI-stabilization window** while Epics 1–3 land: the parent
  dashboard was fully redesigned three times (PRs #71, #73, plus earlier passes)
  and the theme palette fully replaced once (PR #80) in recent history — high
  churn, low durability. Resist a fourth redesign or second palette swap until
  there's a concrete signal (user feedback, data) calling for it.

## Epic 8 — Real Auth & Account Model

*(Supersedes the household-code access control accepted as residual risk in Epic 1 —
see the "real access control" and rate-limiting items there. Supabase Auth is the
assumed backend: `@supabase/supabase-js` is already a dependency, and RLS policies keyed
to `auth.uid()` are only cleanly achievable through it.)*

- ~~**Adopt Supabase Auth for parent accounts**~~ — **DONE.** Email/password + magic-link
  sign-in via `src/state/auth.ts`, surfaced in `AccountPanel` (Parent Dashboard → Advanced
  Settings → Parent Account). Session state lives in `GravyContext` (`authUser`/`authReady`).
  `auth.uid()`-scoped RLS itself is still deferred to Epic 9 (it can only land once enough
  households have claimed), but the account identity it depends on now exists. *(was P1, L.)*
- ~~**Keep the household PIN as a local kid-screen lock, decoupled from account auth.**~~ —
  **DONE.** The PIN/`grownUpUnlocked` lock (`src/state/grownUpUnlock.ts`,
  `src/state/pinLockout.ts`) is explicitly documented and kept as a per-device kid-screen
  lock independent of the parent account — neither gates the other. *(was P1, S.)*
- ~~**Household ownership + invite-by-code model.**~~ — **DONE.**
  `supabase/migrations/20260627000000_auth_household_ownership.sql` adds `households.owner_id`,
  a `household_members` (`household_code`, `user_id`, `role`) join table, and rewrites every
  `SECURITY DEFINER` RPC (`gravy_create_household`, `gravy_upsert_household_state`,
  `gravy_rename_household`, `gravy_delete_household`, `gravy_lookup_household`, plus new
  `gravy_claim_household`/`gravy_household_status`) to check membership/ownership. A claimed
  household restricts writes to members; the 6-char code becomes the join/invite token
  (entering it while signed in links the account). *(was P1, L.)*
- ~~**Migration: claim-or-deprecate window for existing PIN-only households.**~~ — **DONE.**
  Pre-existing households all have `owner_id IS NULL` and keep working anonymously (legacy
  anon read/write) until a signed-in parent claims them via `gravy_claim_household` — which
  sets `owner_id` with no data migration (`state` JSONB untouched). The "Secure this
  household" prompt in `SyncPanel` is the in-app banner driving the window. Tightening the
  open-`SELECT` residual risk into `auth.uid()`-scoped RLS (the actual close-out) is the
  Epic 9 RLS-migration item, sequenced after enough households claim. *(was P1, M.)*
- ~~**Per-parent attribution on `actionLog`.**~~ — **DONE.** `ActionLogEntry` gained
  `actorUserId`/`actorLabel` (`src/state/types.ts`); `appendActionLog(next, actor, entry)`
  stamps them from the signed-in account (absent when none), and `LogPanel` shows "· by
  <email>" on attributed entries. Unit-tested in `actionLog.test.ts`. *(was P2, S.)*
- ~~**Audit trail for dashboard-level/destructive actions.**~~ — **DONE.** New shared
  `auditLog` field + `src/state/auditLog.ts` (`appendAuditLog`, cap 300), instrumented across
  catalog edits, settings (value-change-only; never logs secret values), badge config, profile
  CRUD, danger-zone resets, and sync/ownership changes — each actor-attributed. Surfaced as a
  new read-only "Admin Log" `ParentDashboard` destination (`AuditLogPanel`), distinct from the
  kid-progress action log. Unit-tested in `auditLog.test.ts`. *(was P2, M.)*
- *(Decision, stated so it isn't silently revisited: kid profiles stay non-authenticated
  sub-records under a parent-owned household, switched via the existing PIN-gated
  `ProfileSwitcher` — no kid email/password/OAuth, avoiding COPPA exposure from collecting
  any kid-direct credential.)*

## Epic 9 — Cloud-First Storage & Offline Sync

*(The RLS-migration and account-deletion items depend on Epic 8's account/membership model;
the merge and offline-queue items are valuable regardless, since today's "local cache + LWW
on reconnect" is already the weakest link for any multi-device household.)*

- **Replace whole-blob last-write-wins with collection/record-level merge.** Today any write
  anywhere (`pushHouseholdState` in `src/state/sync.ts`) overwrites the entire `state` JSONB
  column; two parents editing on two devices at once silently drop one's changes with no
  conflict surfaced. Multi-device-per-account becomes the normal case once real accounts
  exist, not the edge case it is today. Scope as "merge id-keyed arrays (goals/rewards/
  badgeConfig) by id+timestamp, last-write-wins only within a single counter field" — not a
  general CRDT library; full CRDT is real but `XL`, and isn't warranted by the current data
  shapes. *(P1, L.)*
- **Offline write queue with replay.** No queue or retry/backoff exists today beyond the
  realtime subscription — a device with no signal just edits `localStorage` and sync
  silently lags until reconnect. Needed regardless of account model so a kid can check off
  chores with no signal and have it reliably land later; pairs with the merge item above
  since replay needs something better than "overwrite" to land safely. *(P1, M.)*
- **Migrate `households` RLS from open-SELECT/RPC-gated to `auth.uid()`-scoped policies.**
  Once Epic 8's `household_members` exists, replace the anon-role/open-SELECT model
  (required today only because Realtime has no per-household auth claim to scope by) with
  real RLS predicates, so Realtime is authenticated per-household instead of relying on a
  shared anon key with table-wide read access. Mechanical once accounts/membership exist,
  but every RPC and the `subscribeToHousehold` call site need updating together. *(P1, M.)*
- **Account-level data export.** A parent can request a structured export of everything
  tied to their account. Doesn't exist as a concept today (no account to scope it to);
  becomes a real expectation once accounts exist, and is the easy half of COPPA's
  access-and-deletion requirement. *(P2, S.)*
- **Account-level data deletion (right-to-delete).** Extends the existing "Delete household
  everywhere" (`DangerZonePanel`/`SyncPanel`, Epic 1, done) to also delete the account and
  any auth-table rows, and to define what happens to a multi-member household when the
  owning account deletes itself. *(P1, S–M.)*
- **COPPA-specific review of the account signup flow itself.** Narrower and must land
  *before* Epic 8 ships to real users: verify signup never collects a child's name/data as
  part of account creation (only as in-app profile data after a parent is authenticated),
  add explicit parent-only language to the signup screen, and update `DATA_HANDLING.md` to
  cover Supabase Auth's own data (email on file, magic-link token storage) — this is what
  turns the app from "no PII" to "parent email on file." *(P0 once Epic 8 is scheduled.)*

## Epic 10 — Mobile App & Native Capacities

*(Packaging decision: Capacitor wrap of the existing Vite/React app, not a PWA+TWA/App-Clip
wrapper and not a React Native rewrite — gets real native capability access (APNs/FCM,
biometrics, camera, widgets, legitimate store-review posture) with near-zero rewrite of
`src/`, versus a rewrite of all 40+ components in `src/components/` for React Native.)*

- **Packaging spike: Capacitor wrap of the existing Vite/React build.** Wraps `dist/` in a
  thin native shell with no rewrite of `src/`. *(P1, M for the initial wrap/spike; L total
  once signing and store-review items below are included.)*
- **Native push notifications (APNs/FCM).** Distinct implementation from the existing
  web-push item in Epic 5 (see annotation there) — native transport only available once
  wrapped. *(P1, M, once wrapped.)*
- **Biometric unlock alongside PIN.** Face ID/Touch ID/Android biometric as an *additional*
  unlock path for the grown-up lock — PIN stays as fallback (no biometric-hardware
  guarantee, and the recovery-question flow already covers PIN-forgotten). No equivalent
  exists for a PWA. *(P2, S, once wrapped.)*
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
- **App-store packaging process gaps** — currently 100% absent (today's CI is
  lint→test→build→GitHub-Pages only):
  - Developer account setup, signing certificates/provisioning profiles, App Store
    Connect/Play Console project setup. *(P1, M.)*
  - CI extension for native builds (Fastlane or equivalent) producing signed builds for
    TestFlight/internal Play track. *(P1, M.)*
  - OTA update policy decision (e.g. Capacitor Live Updates vs. accepting store-review-per-
    release) — a real decision, not just an implementation detail. *(P1, M.)*
  - Store listing content and the COPPA-relevant store questionnaires (Apple's Kids
    Category/age rating, Google Play Families program) — both stricter than Epic 6's
    general privacy-policy item specifically because this targets kids. *(P0 once store
    submission is scheduled.)*
  - Crash reporting (Sentry or equivalent) — zero crash/error visibility in production
    today; much higher-value once native, since store reviewers and update cadence both
    depend on knowing about crashes you can't reproduce from a web console. *(P1, M.)*
  - Device-matrix testing — `verify_gravy.mjs` today is a manual, non-CI Playwright script
    against one browser viewport; native shipping needs real device/OS-version coverage.
    *(P1, M.)*

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
  `StatsCard → GamesCard → FoodTray → DailyGoals → BonusPoints`
  (`src/components/HomeScreen.tsx`) is one long vertical scroll — the biggest
  "use the space differently" win. Candidates: a 2-up row pairing the Games
  card with a compact stat, or Daily Goals / Bonus Points side-by-side on
  wider phones (the `@media (min-width: 768px)` block in `src/index.css`
  already does this kind of widening for the food/store/badge grids). Needs a
  mockup to compare against the current flow before building. *(P2, M.)*
- **Modernize the shadow treatment.** The hard `Npx Npx 0` offset shadows are
  the heaviest part of the neo-brutalist look. Options: drop card shadows to
  `2px`, or move cards to a soft `0 2px 8px rgba()` while keeping hard offset
  shadows only on interactive buttons/tiles. This is a real style shift (it
  changes the brand feel, not just density), so it should be designed and
  reviewed as a deliberate visual-direction decision rather than a tweak.
  *(P2, S–M.)*

## Do these next (top 5, in order)

The original top-5 here (PIN/recovery hashing, the PR #92 decision, the lint
gate, Vitest, and Supabase access control) is now fully done — see the
strikethroughs in Epics 1, 2, and 7 above. Replacing it with the next five,
prioritized from what's actually still open:

1. ~~Write the data-handling note~~ (Epic 1, P1/S) — **DONE**, see
   `DATA_HANDLING.md`.
2. ~~Harden error handling~~ around `localStorage` writes and incoming
   Supabase realtime payloads (Epic 2, P1/M) — **DONE**, see Epic 2 above.
3. ~~Run the accessibility hardening pass~~ (Epic 3, P1/M) — **DONE**: all
   four sub-items (aria-labels, focus trapping, the contrast pass, and the
   font-size audit) are complete, see Epic 3 above.
4. ~~Design the points economy in one pass~~ (Epic 4, P1/M) — **DONE**, see
   Epic 4 above.
5. **Ship PWA push notifications** (Epic 5, P1/L) — the single biggest lever
   for retention. Note: with a Capacitor-wrapped iOS app now the planned
   distribution path (Epic 10), skip the web-push (Notifications API)
   implementation here — iOS PWA web push is limited and would be partly
   throwaway. Go straight to native push (APNs/FCM) as Epic 10's distinct
   P1/M item once the Capacitor wrap ships instead.
