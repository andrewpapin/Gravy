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
71 badges across 7 groups, a 24-tier rank ladder, 4 educational mini-games
(Hangman, Math Facts, Word Scramble, Memory Match), multi-kid profiles per
household, 5 visual themes, full-screen onboarding, optional parent accounts
(Supabase Auth), a PIN-gated parent dashboard
(Approvals/Goals/Calendar/Store/Badges/Admin-Log), and optional real-time Supabase
sync via a 6-character household code. This is a mature, feature-complete product
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

### Path to first TestFlight build (internal testing)

The active near-term goal. **Internal TestFlight first** (up to 100 testers on the dev team)
was chosen over straight-to-external because internal needs **no Beta App Review, no privacy
nutrition labels, and no COPPA store questionnaire** to get a running build into testers'
hands — those gate *external* testers and public submission, not the first internal build.
The items below are the critical path, ordered; the "before external testers" block after it
is explicitly *not* blocking the first build.

**Blocks the first internal build:**

- **Disable the PWA/Workbox service worker under `--mode capacitor`.** `vite.config.ts`
  runs `VitePWA` for *every* build, so the native bundle still registers a Workbox SW inside
  the Capacitor WebView — redundant (the shell bundles assets locally) and able to cache-fight
  `UpdatePrompt`'s auto-reload. Flagged in `docs/capacitor.md` as "decide before shipping a
  real build"; it's unresolved in code. Gate the plugin on `mode !== 'capacitor'`. *(P1, S.)*
- **Generate native app icons + splash/launch screen.** Only web/PWA icons exist in `public/`;
  a real iOS build needs a native icon set and launch screen. Use `@capacitor/assets` to
  generate both from a source logo. *(P1, S.)*
- **Graduate the spike — commit `ios/`.** `docs/capacitor.md` defines this: once the shell
  carries real customizations (`Info.plist`, app icons/splash, signing), the gitignored
  native folder becomes source and must be tracked. Commit `ios/` with the first build;
  `android/` can stay gitignored until an Android track is scheduled. *(P1, S.)*
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

The original top-5 (PIN/recovery hashing, the PR #92 decision, the lint gate,
Vitest, and Supabase access control) is fully done, as is the second wave
(data-handling note, error hardening, accessibility pass, points economy) — all
in `BACKLOG_DONE.md`. Two more of the prior top-5 are now done as well: the
**collection/record-level sync merge** that replaced whole-blob last-write-wins
(`src/state/merge.ts`, Epic 9) and the **Capacitor wrap spike** (Epic 10;
`docs/capacitor.md`).

**Current focus: get a first build into internal TestFlight.** Push notifications
were the prior #1, but a TestFlight build needs no push — it's a fast-follow once
on-device, not a blocker. The path below is Epic 10's "Path to first TestFlight
build (internal testing)" critical path, front-loaded, then the highest-value work
that pairs with going on-device:

1. **Disable the PWA service worker under `--mode capacitor`** (Epic 10, P1/S) —
   smallest, first: the native bundle still registers a Workbox SW that can
   cache-fight `UpdatePrompt`. Gate `VitePWA` on `mode !== 'capacitor'` in
   `vite.config.ts` before any real build.
2. **Native app icons + splash, then graduate `ios/` into the repo** (Epic 10,
   P1/S) — generate assets via `@capacitor/assets`, commit the now-customized
   `ios/` shell (per `docs/capacitor.md`'s graduation step).
3. **Signing + App Store Connect + a build→upload pipeline** (Epic 10, P1/M) —
   Apple Developer membership, App ID for `com.gravyapp.app`, distribution
   cert/profile, the app record (answer export-compliance), and at minimum a
   documented local `xcodebuild archive` + Transporter upload. This is the step
   that actually puts a build in TestFlight; CI/Fastlane is the durable version.
4. **Native push notifications (APNs/FCM)** (Epic 5/10, P1/M) — the biggest
   retention lever and the top fast-follow once on-device. Skip web push: with the
   Capacitor route chosen, iOS PWA web push would be partly throwaway.
5. **Crash reporting (Sentry or equivalent)** (Epic 10, P1/M) — pull in right
   after the first build lands; on-device, you can't reproduce crashes from a web
   console, and update cadence depends on seeing them.

Holding just off the top-5 but still near-term: **offline write queue with replay**
(Epic 9, P1/M), and — gated on *external* TestFlight rather than internal — the
**COPPA signup review** (Epic 9, P0 once real-account rollout is scheduled) and
**account-level data deletion** (Epic 9, P1/S–M). These move up the moment the
target shifts from internal to external testers.
