-- Epic 8 (Real Auth & Account Model), items 1, 3 and 4 — see BACKLOG.md.
--
-- Introduces real parent identity (Supabase Auth) and household ownership on top of the
-- existing code-only model, WITHOUT breaking any household that hasn't migrated yet:
--
--   * households gain a nullable owner_id. Every pre-existing row has owner_id IS NULL
--     ("unclaimed") and keeps the exact legacy behaviour — anyone holding the 6-char code can
--     read and write it via the same anon RPCs as before. This is the "claim-or-deprecate
--     window" from BACKLOG Epic 8: unmigrated households keep working until claimed.
--   * Once a signed-in parent CLAIMS a household (gravy_claim_household), owner_id is set and
--     the existing code becomes a join/invite token: writes are then restricted to members,
--     and entering the code while signed in (gravy_lookup_household) links that account as a
--     member. The open SELECT/anon-read residual risk that Realtime depends on is unchanged
--     here — tightening reads to auth.uid()-scoped RLS is deferred to Epic 9, which can only
--     run once enough households have claimed.
--
-- This migration also reconciles two repo migrations that were authored but never applied to
-- the live project (gravy_delete_household and the lookup-attempts cleanup), folding both into
-- the RPC rewrites below so the deployed functions match the repo.

-- ---------------------------------------------------------------------------------------------
-- Schema: ownership column + membership join table
-- ---------------------------------------------------------------------------------------------

alter table public.households
  add column if not exists owner_id uuid references auth.users (id) on delete set null;

-- A parent account ↔ household link. household_code references households(code) with
-- ON UPDATE CASCADE so memberships follow a renamed code (gravy_rename_household). RLS is on
-- with no anon/authenticated grants: only the SECURITY DEFINER functions below ever touch it.
create table if not exists public.household_members (
  household_code text not null
    references public.households (code) on update cascade on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  primary key (household_code, user_id)
);

alter table public.household_members enable row level security;
revoke all on public.household_members from anon, authenticated;

-- Broaden the read policy so signed-in clients (role `authenticated`) still receive Realtime
-- postgres_changes, which is gated by the subscribing role's SELECT permission. Reads stay
-- open (true) for both roles for now — same accepted residual risk as before; Epic 9 replaces
-- this with auth.uid()-scoped predicates once households are claimed.
drop policy if exists "anyone can read households" on public.households;
create policy "anyone can read households"
  on public.households for select to anon, authenticated using (true);

-- ---------------------------------------------------------------------------------------------
-- Internal helper (function-only access to household_members)
-- ---------------------------------------------------------------------------------------------

create or replace function public.gravy_is_member(p_code text, p_uid uuid)
returns boolean
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select exists (
    select 1 from public.household_members
    where household_code = p_code and user_id = p_uid
  );
$$;

-- ---------------------------------------------------------------------------------------------
-- RPC rewrites — membership-aware, but legacy (unclaimed, owner_id IS NULL) rows unchanged
-- ---------------------------------------------------------------------------------------------

create or replace function public.gravy_create_household(p_code text, p_state jsonb)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
begin
  if p_code !~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$' then
    raise exception 'invalid household code';
  end if;
  -- A signed-in creator owns the household immediately; an anon creator leaves it unclaimed
  -- (legacy path) so it keeps working until someone claims it.
  insert into public.households (code, state, owner_id) values (p_code, p_state, v_uid);
  if v_uid is not null then
    insert into public.household_members (household_code, user_id, role)
    values (p_code, v_uid, 'owner')
    on conflict (household_code, user_id) do update set role = 'owner';
  end if;
end;
$$;

create or replace function public.gravy_upsert_household_state(p_code text, p_state jsonb)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_owner uuid;
  v_found boolean := false;
begin
  if p_code !~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$' then
    raise exception 'invalid household code';
  end if;
  select owner_id, true into v_owner, v_found from public.households where code = p_code;
  if not v_found then
    -- First push for this code (the row didn't exist yet): create it, owned by the signed-in
    -- pusher if any. Mirrors the old upsert's insert branch.
    insert into public.households (code, state, updated_at, owner_id)
    values (p_code, p_state, now(), v_uid);
    if v_uid is not null then
      insert into public.household_members (household_code, user_id, role)
      values (p_code, v_uid, 'owner')
      on conflict (household_code, user_id) do update set role = 'owner';
    end if;
    return;
  end if;
  -- A claimed household only accepts writes from its members. Unclaimed (v_owner IS NULL)
  -- rows accept writes from anyone with the code, exactly as before this migration.
  if v_owner is not null and (v_uid is null or not public.gravy_is_member(p_code, v_uid)) then
    raise exception 'not authorized for this household';
  end if;
  update public.households set state = p_state, updated_at = now() where code = p_code;
end;
$$;

-- Sets owner_id on a previously-unclaimed household and records the caller as its owner. Used
-- by an existing PIN-only household's first parent-account signup to "claim" it with no data
-- migration (the state JSONB is untouched). Idempotent for the existing owner; rejects a code
-- already owned by a different account. Returns the household state so the client can adopt it.
create or replace function public.gravy_claim_household(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_owner uuid;
  v_state jsonb;
  v_found boolean := false;
begin
  if v_uid is null then
    raise exception 'must be signed in to claim a household';
  end if;
  if p_code !~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$' then
    raise exception 'invalid household code';
  end if;
  select owner_id, state, true into v_owner, v_state, v_found from public.households where code = p_code;
  if not v_found then
    raise exception 'household not found';
  end if;
  if v_owner is not null and v_owner <> v_uid then
    raise exception 'household already claimed by another account';
  end if;
  if v_owner is null then
    update public.households set owner_id = v_uid where code = p_code;
  end if;
  insert into public.household_members (household_code, user_id, role)
  values (p_code, v_uid, 'owner')
  on conflict (household_code, user_id) do update set role = 'owner';
  return v_state;
end;
$$;

create or replace function public.gravy_rename_household(p_old_code text, p_new_code text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_owner uuid;
begin
  if p_new_code !~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$' then
    raise exception 'invalid household code';
  end if;
  select owner_id into v_owner from public.households where code = p_old_code;
  if v_owner is not null and (v_uid is null or not public.gravy_is_member(p_old_code, v_uid)) then
    raise exception 'not authorized for this household';
  end if;
  -- membership rows follow via the ON UPDATE CASCADE FK on household_members.household_code.
  update public.households set code = p_new_code where code = p_old_code;
end;
$$;

create or replace function public.gravy_delete_household(p_code text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_owner uuid;
begin
  if p_code !~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$' then
    raise exception 'invalid household code';
  end if;
  select owner_id into v_owner from public.households where code = p_code;
  -- Deleting a claimed household everywhere is an owner-only action; unclaimed rows keep the
  -- legacy "anyone with the code" behaviour. membership rows cascade-delete via the FK.
  if v_owner is not null and v_owner <> coalesce(v_uid, '00000000-0000-0000-0000-000000000000') then
    raise exception 'only the household owner can delete it';
  end if;
  delete from public.households where code = p_code;
end;
$$;

-- Rate-limited join-by-code read (10 lookups / 5 min per source IP) with opportunistic cleanup
-- of lapsed buckets. Extended for Epic 8: when called by a signed-in user against a CLAIMED
-- household, it also links that account as a member — entering the code is how an invited
-- parent accepts the invite. Unclaimed households just return state, as before.
create or replace function public.gravy_lookup_household(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_key text;
  v_window_seconds constant integer := 300;
  v_max_attempts constant integer := 10;
  v_count integer;
  v_state jsonb;
  v_owner uuid;
  v_uid uuid := auth.uid();
  v_found boolean := false;
begin
  begin
    v_key := split_part(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ',', 1);
  exception when others then
    v_key := null;
  end;
  if v_key is null or v_key = '' then
    v_key := 'unknown';
  end if;

  insert into public.household_lookup_attempts (bucket_key, attempt_count, window_start)
  values (v_key, 1, now())
  on conflict (bucket_key) do update
  set
    attempt_count = case
      when now() - household_lookup_attempts.window_start > make_interval(secs => v_window_seconds)
        then 1
      else household_lookup_attempts.attempt_count + 1
    end,
    window_start = case
      when now() - household_lookup_attempts.window_start > make_interval(secs => v_window_seconds)
        then now()
      else household_lookup_attempts.window_start
    end
  returning attempt_count into v_count;

  -- Opportunistic cleanup: other buckets whose window has lapsed are done rate-limiting.
  delete from public.household_lookup_attempts
  where bucket_key <> v_key
    and now() - window_start > make_interval(secs => v_window_seconds);

  if v_count > v_max_attempts then
    raise exception 'Too many attempts — please wait a few minutes and try again.';
  end if;

  if p_code !~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$' then
    return null;
  end if;

  select state, owner_id, true into v_state, v_owner, v_found from public.households where code = p_code;
  if not v_found then
    return null;
  end if;

  -- Joining a claimed household while signed in links the account as a member.
  if v_uid is not null and v_owner is not null then
    insert into public.household_members (household_code, user_id, role)
    values (p_code, v_uid, 'member')
    on conflict (household_code, user_id) do nothing;
  end if;

  return v_state;
end;
$$;

-- Lightweight read used by the UI to decide whether to show the "secure this household" claim
-- prompt: is the code claimed at all, and is the caller already a member/owner of it.
create or replace function public.gravy_household_status(p_code text)
returns table (claimed boolean, is_member boolean, is_owner boolean)
language plpgsql
security definer
set search_path = public, pg_temp
stable
as $$
declare
  v_uid uuid := auth.uid();
  v_owner uuid;
  v_found boolean := false;
begin
  select owner_id, true into v_owner, v_found from public.households where code = p_code;
  if not v_found then
    return query select false, false, false;
    return;
  end if;
  return query select
    v_owner is not null,
    v_uid is not null and public.gravy_is_member(p_code, v_uid),
    v_uid is not null and v_owner = v_uid;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------------------------

-- Supabase grants EXECUTE to anon+authenticated by default on new public functions (schema
-- default privileges), so locking a function down to fewer roles needs explicit per-role
-- revokes, not just `revoke ... from public`.
revoke all on function public.gravy_is_member(text, uuid) from public, anon, authenticated;
revoke all on function public.gravy_create_household(text, jsonb) from public;
revoke all on function public.gravy_upsert_household_state(text, jsonb) from public;
revoke all on function public.gravy_claim_household(text) from public;
revoke all on function public.gravy_rename_household(text, text) from public;
revoke all on function public.gravy_delete_household(text) from public;
revoke all on function public.gravy_lookup_household(text) from public;
revoke all on function public.gravy_household_status(text) from public;

grant execute on function public.gravy_create_household(text, jsonb) to anon, authenticated;
grant execute on function public.gravy_upsert_household_state(text, jsonb) to anon, authenticated;
grant execute on function public.gravy_rename_household(text, text) to anon, authenticated;
grant execute on function public.gravy_delete_household(text) to anon, authenticated;
grant execute on function public.gravy_lookup_household(text) to anon, authenticated;
grant execute on function public.gravy_household_status(text) to anon, authenticated;
-- Claiming requires a real account; granted to authenticated only (explicitly revoke the
-- default anon grant first).
revoke execute on function public.gravy_claim_household(text) from anon;
grant execute on function public.gravy_claim_household(text) to authenticated;
