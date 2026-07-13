# Data Handling

A short note on what Gravy collects, where it lives, and how to delete it.
Tracked as an Epic 1 backlog item (`BACKLOG_DONE.md`) — written for transparency
ahead of any wider distribution, not as a formal legal document. A polished
privacy policy/ToS page is a separate, contingent item (`BACKLOG.md` Epic 6).

## What's collected

Gravy collects nothing beyond what's needed to run the app for the kids in one
household:

- **Parent account email (required).** A parent must create a Supabase Auth
  account (email/password or magic link) to reach any parental-control screen
  — see "Parent accounts" below. This is the only personal data tied to a real
  adult, and it is strictly a grown-up identity: account creation never
  collects a child's name or any in-app data (those are entered in the app
  *after* a parent is signed in). A device can still join a household by just
  entering its code with no account at all, for kid-mode use only — see
  "Where it lives" below.
- **Child name** — free text, parent-entered, per profile. The only field
  in the in-app data that could identify a real person.
- **Gameplay/progress data** — points, streaks, goals, rewards,
  day-by-day logs, game stats. Behavioral, not personal.
- **Appearance preferences** — theme, avatar icon, avatar colors.

Apart from the optional parent-account email above, there's no birthdate,
address, photo, or any other PII field in the in-app data model
(`src/state/types.ts`), and no analytics, telemetry, crash reporting, or
third-party tracking script anywhere in the app.

## Parent accounts (Supabase Auth)

Creating a parent account is **required** — it's the only way to reach any
parental-control screen (Approvals/Profiles/Game Settings/Calendar/Log/
Advanced Settings; there is no PIN). It also gives a household real ownership
instead of "anyone with the 6-character code can read and write it":

- **What's stored, and where.** The email (and, for password sign-in, a hashed
  password) lives in Supabase's managed `auth.users` table, not in the app's
  `state` JSONB. Magic-link sign-in stores a short-lived token the same way any
  Supabase Auth project does. The app never sees or stores the plaintext
  password.
- **Action/audit logs record only an opaque account id.** The grown-ups-only
  Log attributes each entry to the account that performed it via the Supabase
  user id (`actorUserId`) — never the email. Both logs ride the synced
  household payload, so the email deliberately stays out of them; the Log
  screen resolves a display name from the locally signed-in session instead,
  and older saves that predate this rule have the embedded label scrubbed on
  load (`migrateLegacyState`).
- **Ownership link.** A household is owned by the account that created it from
  the moment it exists (`households.owner_id`, plus a membership row in
  `household_members`) — there's no separate unclaimed state to transition out
  of. Only the household's members can rename or write settings-shaped changes
  to it, and only its owner can delete it everywhere; the 6-character code is
  the join/invite token a second parent's account (or a kid's device, for
  kid-mode sync only — see "Where it lives" below) uses to connect to it.
- **Deletion.** Signing out (`AccountMenu` header button, "Log out" when
  unlocked) ends the session on this device. Full account-level deletion
  (removing the `auth.users` row itself) is tracked as a follow-up in
  `BACKLOG.md` Epic 9 ("Account-level data deletion").

## Where it lives

- **The device, always.** Everything above is saved to `localStorage` under
  the key `gravy_v1` (`src/state/defaultState.ts`). If a household never
  turns on cloud sync, none of this data ever leaves the device.
- **Supabase, optionally.** If a household enables sync, the same data — the
  *whole* household (every kid's profile, not just one) — is upserted into a
  single `households` row keyed by a 6-character household code (`code TEXT
  PRIMARY KEY`, `state JSONB`, plus `owner_id`, always set from the moment the
  row is created). A device that just enters the code — no account — can still
  join and sync kid-mode progress (goal checkboxes, food log, etc.); creating,
  renaming, or deleting the household, and reaching any parental-control
  screen, requires being signed into a member (or owner) account (see "Parent
  accounts" below).
- **Rate-limit bookkeeping.** Looking up a household by code is throttled
  server-side; the limiter stores a bucket derived from the request's source
  IP in `household_lookup_attempts`, separately from the household data
  itself.

## How to delete it

- **Local data:** `AccountMenu` → Advanced Settings → Reset → "Reset
  Everything" clears all progress on the active profile (points,
  history, counters) and disconnects the device from sync (it does not sign
  the account out). It intentionally leaves the child's name, theme, and
  avatar set — those are identity settings, not progress, and resetting a
  kid's points shouldn't rename the kid. Clearing the browser's site data for
  the app removes the `gravy_v1` entry entirely.
- **Synced data, this device only:** `AccountMenu` → Advanced Settings →
  Family Code → "Turn off cloud sync" stops *this device* from syncing and
  forgets the code locally — the household row keeps existing for any other
  device still using that code.
- **Synced data, everywhere:** `AccountMenu` → Advanced Settings → Family
  Code → "Delete household everywhere" permanently deletes the Supabase
  `households` row for that code, so every device synced to it (not just
  this one) loses access. Deliberately a separate, more destructive action
  from "Turn off cloud sync" for that reason.

## Known limitations

- **`household_lookup_attempts` is opportunistically swept, not retained
  forever.** Rate-limit buckets older than the rate-limit window are deleted
  the next time `gravy_lookup_household` runs (see
  `supabase/migrations/20260623225536_cleanup_lookup_attempts.sql`), bounding
  the table to roughly the IPs seen in the last window rather than growing
  unbounded — there's still no scheduled job, so a long stretch with no
  lookups at all would leave stale rows until the next lookup happens.

This is tracked as a closed-out item in `BACKLOG_DONE.md` Epic 1.
