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
  before returning a code's state — exceeding it fails `joinHousehold` (surfaced to the caller as
  `syncStatus === 'error'`, shown inline by `SyncGateModal`/`SyncPanel`/`SignInPrompt`). That
  function opportunistically deletes other rate-limit buckets whose window has
  lapsed on every call, so `household_lookup_attempts` stays bounded without a scheduled cleanup
  job. The table's SELECT grant/policy is open to `anon` **and** `authenticated` (both required for
  Realtime's `postgres_changes` delivery, which has no per-household auth claim to scope by), so this
  throttles the documented join flow, not a client querying the REST endpoint directly.
- **Ownership (Epic 8, tightened by the account-mandatory migration).**
  `20260627132616_auth_household_ownership.sql` introduced membership-aware RPCs and a
  claim-or-deprecate transition window (unclaimed households — `owner_id IS NULL` — kept working
  anonymously). `20260701234953_require_account_for_household.sql` closed that window: creating a
  household (`gravy_create_household`, and the first-write branch of
  `gravy_upsert_household_state`) now requires `auth.uid()`, so every household is claimed
  (owned) from the moment it exists — there's no more unclaimed state to transition out of.
  Renaming (`gravy_rename_household`) and deleting (`gravy_delete_household`) require membership
  and ownership respectively, unconditionally. The one deliberate exception:
  `gravy_upsert_household_state`'s *existing-row* branch still accepts anonymous writes to an
  already-claimed household — this is what lets a kid's device (or any device that joined by code
  without an account, see the Onboarding "kid device" fork in `docs/ui-surfaces.md`) sync progress
  without ever having a parent account. A signed-in caller who isn't a member is still rejected.
  Enforcement that such a device can never reach settings-shaped UI happens entirely client-side
  (`isGrownUpUnlocked` in `src/state/auth.ts`) — the RPC only guards the household-code boundary,
  not the shape of the write, since it can't tell one from the other.
  `gravy_household_status` (`{claimed,is_member,is_owner}`) and `gravy_claim_household` (sets
  `owner_id` on an unclaimed row, idempotent for the owner) are unchanged; `claimed` is now
  effectively always `true`, and `gravy_claim_household` is a dead-code safety valve kept at no
  cost. `gravy_lookup_household` links a signed-in caller as a `member` when they enter a claimed
  household's code — the mechanism both "sign in to join an existing family" and co-parent
  onboarding paths reuse unchanged. An internal `gravy_is_member` helper is **not** granted to
  `anon`/`authenticated` (Supabase's schema default-privileges auto-grant required an explicit
  per-role revoke). Tightening the still-open `anon`/`authenticated` SELECT into
  `auth.uid()`-scoped RLS is deferred to Epic 9.
  `gravy_my_household_code()` (authenticated-only) is the one lookup keyed by the caller's identity
  rather than a code — `select household_code from household_members where user_id = auth.uid()
  order by (role = 'owner') desc, created_at desc limit 1`, or `null` if the account has none. This
  is what lets the "Existing Parent" onboarding fork auto-attach a second device to its household
  without re-typing the code (`findMyHouseholdCode` in `src/state/auth.ts` wraps it; the client
  falls back to manual join-by-code if it returns `null`).
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
  (`goals`/`rewards` by id, `dayLogs` by key, `actionLog`/
  `auditLog` by entry id, sorted by `at`) so edits made locally but not yet pushed aren't clobbered.
  Live progress scalars/counters (points, streaks, the `today*` fields, `counters`, `settings`) and
  `pendingRewards` still take the remote snapshot — last-write-wins **within those fields only**. The
  merge is idempotent, so the receive effect marks the *incoming* snapshot as seen (not the merged
  result) and lets the push effect re-send any local-only additions; both devices converge to
  union-of-collections + last-writer's scalars. Server-side write races (two pushes inside the 800ms
  debounce) and `pendingRewards` add/remove tombstones remain for the offline-queue/RLS items.
  `lastSyncedRef` (used by both the push and receive effects to recognize a device's own echo) is
  stamped with the outgoing JSON the moment the debounced push *fires*, not after its RPC response
  resolves — the realtime echo of that write can arrive over the websocket before the RPC's HTTP
  response does, and if `lastSyncedRef` weren't updated yet, the receive effect would treat that
  echo as a genuine remote change and merge it in, clobbering a click made in the intervening moment
  with the (now-stale) echoed scalars. This was a real bug (a tapped goal/food/reward flashing done
  then reverting) fixed by marking the snapshot as seen at send-time instead of on resolution.
- `SyncGateModal` is only reachable post-onboarding, after `resetAll()` ("Reset Everything")
  disconnects sync (`setHouseholdCode(null)`) without signing the account out — reconnecting here is
  optional (`gravy_sync_skipped` key) since the account, and this device's settings access, are
  untouched either way. Onboarding itself is now the mandatory create/join path (see
  `docs/ui-surfaces.md`), so this modal no longer has a first-run role.
- All `localStorage` reads/writes go through `safeGetItem`/`safeSetItem`/`safeRemoveItem`
  (`src/state/storage.ts`), which swallow the exception `localStorage` throws when storage is
  disabled or full (iOS private browsing, quota exceeded) instead of crashing the caller.
  `saveState`/`saveRoot` (`src/state/defaultState.ts`) return a boolean for this reason;
  `GravyProvider`'s autosave effect sets `storageError` on a failed write (surfaced by
  `StorageErrorBanner`, a persistent dismissible banner rather than a toast — dismissing it doesn't
  suppress a *new* failure episode, only repeats of the same one; see `storageErrorRef`), cleared
  again once a write succeeds.
- `subscribeToHousehold` (`src/state/sync.ts`) checks an incoming realtime payload has a `profiles`
  array (`isValidHouseholdStatePayload`) before handing it to the app — a structurally malformed row
  is dropped rather than crashing the subscription callback. Deeper per-field validation happens via
  `hydrateState`/`sanitizeState` once this passes.

## Parent Accounts (Supabase Auth, Epic 8) — the sole access gate

Creating a parent account (email/password or magic link) is **mandatory** — every onboarding path
that reaches parental controls goes through `AccountSetupStep` first (see `docs/ui-surfaces.md`);
the only account-free path is the "kid's device" onboarding fork, which by design never reaches
those controls. `src/state/auth.ts` is the only module that touches `supabase.auth` — it exposes
`signUpWithPassword`/`signInWithPassword`/`sendMagicLink`/`resendSignUpConfirmation`/`signOut`, an
`onAuthChange` subscription, the ownership RPC wrappers (`claimHousehold`/`getHouseholdStatus`/
`findMyHouseholdCode`, plus the pure `normalizeHouseholdStatus` covered by `auth.test.ts`), and
**`isGrownUpUnlocked(authUser, householdStatus)`** — the pure predicate
(`!!authUser && !!householdStatus?.isMember`, also
unit-tested in `auth.test.ts`) that `GravyContext` uses to derive `grownUpUnlocked` every render.
`useHouseholdSync` (`src/state/useHouseholdSync.ts`, the sync/auth reactive hook `GravyContext`
calls) tracks `authUser`/`authReady` and re-checks `householdStatus` on code/account change. Once
signed in, `createHousehold` automatically sets `owner_id` (supabase-js sends the JWT to the RPC) —
there's no unclaimed state left to separately "claim" (see the Ownership bullet above).

`signUpWithPassword` sets `emailRedirectTo` (same pattern as `sendMagicLink`) and returns
`SignUpResult = { ok: true; needsConfirmation: boolean } | { ok: false; error }` instead of the
plain `AuthResult` the other auth calls use — `needsConfirmation` is `!data.session` from
Supabase's own signup response, true only when the project's dashboard-configured "Confirm email"
setting (not visible in this repo) requires it. `AccountSetupStep` shows a "Check Your Email"
screen in that case, with `resendSignUpConfirmation` available if the email doesn't arrive; no
polling is needed for it to continue once confirmed — Supabase mirrors the session to every tab via
localStorage, so the existing `authUser` reactivity picks it up on its own.

There is no PIN. `grownUpUnlocked` — the single gate for Approvals/Profiles/Game Settings/Calendar/
Log/Advanced Settings — is derived, not stored: a device unlocks those screens only by having a
signed-in account that's a member (or owner) of the household currently synced to it. Locking a
device means signing out (`signOutAccount`, surfaced as "Log out" in `AccountMenu`'s header button);
there's no separate "lock without signing out." COPPA: an account is still only ever a parent
identity — signup never collects child data; see `DATA_HANDLING.md` for what's collected/stored/
deletable overall, and `BACKLOG.md` Epics 1/8/9 for remaining known gaps.
