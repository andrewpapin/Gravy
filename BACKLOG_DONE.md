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
  `20260623000000_scope_household_mutations.sql`. SELECT stays open (Realtime needs
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
  join/invite token. `20260627000000_auth_household_ownership.sql`.
- **Claim-or-deprecate window for PIN-only households** — pre-existing rows
  (`owner_id IS NULL`) keep working anonymously until a signed-in parent claims
  them via `gravy_claim_household` (no data migration); "Secure this household"
  banner in `SyncPanel` drives it. RLS close-out is the Epic 9 item.
- **Per-parent attribution on `actionLog`** — `actorUserId`/`actorLabel` stamped
  by `appendActionLog`; `LogPanel` shows "· by <email>". `actionLog.test.ts`.
- **Audit trail for dashboard/destructive actions** — shared `auditLog` +
  `src/state/auditLog.ts` (cap 300), instrumented across catalog/settings/badge/
  profile/danger-zone/sync changes; read-only "Admin Log" (`AuditLogPanel`).
  Settings logs value-change-only and never secret values. `auditLog.test.ts`.
- **Decision (don't silently revisit):** kid profiles stay non-authenticated
  sub-records under a parent-owned household, switched via the PIN-gated
  `ProfileSwitcher` — no kid email/password/OAuth, avoiding COPPA exposure.
