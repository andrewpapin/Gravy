# Persistence & sync

Deep reference for localStorage persistence, Supabase cloud sync, the household RPCs, ownership
(Epic 8), and parent accounts. CLAUDE.md links here; read it when working on `src/state/sync.ts`,
`src/state/auth.ts`, or `supabase/migrations/`.

## Storage & sync

- Primary: `localStorage` key `gravy_v1` (`STORAGE_KEY` in `src/state/defaultState.ts`) — stores the
  whole `GravyRoot` (all profiles), not a single `GravyState`.
- Optional cloud: Supabase `households` table — `{ code TEXT PK, state JSONB, updated_at,
  created_at, owner_id UUID NULL }`, where `state` is the serialized `GravyRoot` and `owner_id`
  (Epic 8) is the `auth.users` id of the parent account that claimed it (NULL = unclaimed/legacy).
  A companion `household_members` table (`household_code`, `user_id`, `role`) records who can write a
  claimed household. Client and anon key are hardcoded in `src/lib/supabaseClient.ts` (no env vars)
  since the anon/publishable key is safe to ship client-side.
- Household codes use an unambiguous character set (no `0/O`, `1/I/l`) — see `CODE_CHARS` in
  `src/state/sync.ts`. Codes can be auto-generated or parent-chosen (`createHousehold(customCode)`),
  and changed later (`changeHouseholdCode`) — both validate via `isValidHouseholdCode()` and surface
  a friendly error on a Postgres unique-constraint collision (`error.code === '23505'`).
- All household mutations and the join-by-code lookup go through `SECURITY DEFINER` RPCs
  (`supabase/migrations/`), not direct table inserts/updates/selects, so the shared anon key can't be
  used to vandalize/flood other households' rows or sweep the code space unthrottled:
  `gravy_create_household`/`gravy_upsert_household_state`/`gravy_rename_household`/
  `gravy_delete_household` each scope to one row by code, and `gravy_lookup_household` (called by
  `fetchHousehold()`) additionally rate-limits to 10 lookups per 5-minute window per source IP
  before returning a code's state — exceeding it surfaces a "Too many attempts" toast from
  `joinHousehold`. That function opportunistically deletes other rate-limit buckets whose window has
  lapsed on every call, so `household_lookup_attempts` stays bounded without a scheduled cleanup
  job. The table's SELECT grant/policy is open to `anon` **and** `authenticated` (both required for
  Realtime's `postgres_changes` delivery, which has no per-household auth claim to scope by), so this
  throttles the documented join flow, not a client querying the REST endpoint directly.
- **Ownership (Epic 8).** As of `20260627000000_auth_household_ownership.sql`, those RPCs are
  membership-aware: a **claimed** household (`owner_id IS NOT NULL`) only accepts writes
  (`gravy_upsert_household_state`/`gravy_rename_household`) from its members, and delete only from
  its owner; an **unclaimed** household (`owner_id IS NULL`, every pre-Epic-8 row) keeps the exact
  legacy "anyone with the code" behavior, so no existing household breaks. Two new RPCs back this:
  `gravy_claim_household` (sets `owner_id` on an unclaimed row + records the caller as owner;
  idempotent for the owner, rejects a code owned by someone else) and `gravy_household_status`
  (read-only `{claimed,is_member,is_owner}` for the claim banner). `gravy_lookup_household` also links
  a signed-in caller as a `member` when they enter a claimed household's code — the join/invite path.
  An internal `gravy_is_member` helper is **not** granted to `anon`/`authenticated` (Supabase's
  schema default-privileges auto-grant required an explicit per-role revoke). Tightening the still-
  open `anon`/`authenticated` SELECT into `auth.uid()`-scoped RLS is deferred to Epic 9.
- `leaveHousehold()` ("Turn off cloud sync" in `SyncPanel`) only disconnects the current device —
  the household row keeps existing for any other device still using that code.
  `deleteHouseholdEverywhere()` ("Delete household everywhere", same panel) is the separate, more
  destructive action that deletes the Supabase row via `gravy_delete_household`, so every device
  synced to that code loses it.
- Real-time sync via Supabase `postgres_changes` subscription. Conflict resolution is
  **collection/record-level merge**, not whole-blob last-write-wins (`src/state/merge.ts`, Epic 9):
  when a remote root arrives, `GravyContext`'s receive effect runs `mergeRoots(localRoot, remoteRoot)`
  against the *current* local root (read via `rootRef`/`stateRef`) rather than replacing it. Profiles
  union by id (a kid added on either device survives); per-profile, id-keyed collections union
  (`goals`/`rewards` by id, `badgeConfig`/`dayLogs` by key, `earnedBadges` as a set, `actionLog`/
  `auditLog` by entry id, sorted by `at`) so edits made locally but not yet pushed aren't clobbered.
  Live progress scalars/counters (points, streaks, the `today*` fields, `counters`, `settings`) and
  `pendingRewards` still take the remote snapshot — last-write-wins **within those fields only**. The
  merge is idempotent, so the receive effect marks the *incoming* snapshot as seen (not the merged
  result) and lets the push effect re-send any local-only additions; both devices converge to
  union-of-collections + last-writer's scalars. Server-side write races (two pushes inside the 800ms
  debounce) and `pendingRewards` add/remove tombstones remain for the offline-queue/RLS items.
- `SyncGateModal` prompts new users to create/join a household after onboarding, unless dismissed
  (`gravy_sync_skipped` key) — onboarding's own `sync` phase covers first-run setup, so this modal
  mainly catches users who skipped that step. Like onboarding, if the modal's own "Create New
  Household" (or custom-code) button is what creates the household, it tracks that with a local
  `justCreated` flag and renders `PinSetupStep` in place of the create/join form before closing, so
  this path also gets prompted to replace the default PIN/add a recovery question — joining an
  existing household skips this, since that household's PIN was already set by whoever created it.
- All `localStorage` reads/writes go through `safeGetItem`/`safeSetItem`/`safeRemoveItem`
  (`src/state/storage.ts`), which swallow the exception `localStorage` throws when storage is
  disabled or full (iOS private browsing, quota exceeded) instead of crashing the caller.
  `saveState`/`saveRoot` (`src/state/defaultState.ts`) return a boolean for this reason;
  `GravyProvider`'s autosave effect shows a one-time "Couldn't save" toast on failure (suppressed on
  repeat failures via `storageWarnedRef`, reset once a write succeeds again).
- `subscribeToHousehold` (`src/state/sync.ts`) checks an incoming realtime payload has a `profiles`
  array (`isValidHouseholdStatePayload`) before handing it to the app — a structurally malformed row
  is dropped rather than crashing the subscription callback. Deeper per-field validation happens via
  `hydrateState`/`sanitizeState` once this passes.

## Parent Accounts (Supabase Auth, Epic 8)

A parent can optionally create an account (email/password or magic link) via `AccountPanel`.
`src/state/auth.ts` is the only module that touches `supabase.auth` — it exposes
`signUpWithPassword`/`signInWithPassword`/`sendMagicLink`/`signOut`, an `onAuthChange` subscription,
and the ownership RPC wrappers (`claimHousehold`/`getHouseholdStatus`, plus the pure
`normalizeHouseholdStatus` covered by `auth.test.ts`). `useHouseholdSync`
(`src/state/useHouseholdSync.ts`, the sync/auth reactive hook GravyContext calls) tracks
`authUser`/`authReady` and re-checks `householdStatus` on code/account change. Once signed in, `createHousehold`
automatically sets `owner_id` (supabase-js sends the JWT to the RPC); an already-synced legacy
household is secured via the "Secure this household" banner in `SyncPanel` → `claimHousehold()`. The
account is **only** a parent identity for household ownership — it is deliberately decoupled from the
kid-screen PIN below (COPPA: account signup never collects child data; see `DATA_HANDLING.md`).

The parent PIN and recovery answer are stored as salted SHA-256 hashes (`src/state/hash.ts`), never
plaintext, with a per-device exponential-backoff lockout after 5 failed attempts
(`src/state/pinLockout.ts`). This PIN is a **per-device kid-screen lock** (keeps a kid out of the
dashboard on a shared device) and is independent of the parent account — see the Epic 8 note in
`src/state/grownUpUnlock.ts`. See `DATA_HANDLING.md` for what's collected/stored/deletable overall,
and `BACKLOG.md` Epics 1/8/9 for remaining known gaps.
