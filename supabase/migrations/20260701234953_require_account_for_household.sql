-- Epic 8 follow-up — Account-Mandatory Household Model. See BACKLOG_DONE.md Epic 8 for the
-- original claim/ownership model this tightens.
--
-- The previous migration (20260627132616_auth_household_ownership.sql) deliberately kept
-- "unclaimed" households working anonymously — a claim-or-deprecate transition window for
-- pre-account data. That window is over: the app now requires every parent to have an account
-- before it will create or join a household on their behalf, so unclaimed households can no
-- longer be created going forward. This migration:
--
--   * Requires auth.uid() to create a household (gravy_create_household, and the
--     first-write/insert branch of gravy_upsert_household_state) — no more anon-created,
--     forever-unclaimed rows.
--   * Requires membership to rename, and ownership to delete — no more "anyone with the code"
--     branch for those actions, since every household is now claimed at creation.
--   * Deliberately LEAVES gravy_upsert_household_state's existing-row branch open to anonymous
--     callers holding a valid household code. This is what lets a kid's device sync progress
--     (goal checkboxes, food log, etc.) without ever having a parent account — the app's UI
--     never lets such a device reach settings/parental-control screens, so the RPC only needs
--     to guard the household-code boundary, not the shape of the write. A signed-in caller who
--     is NOT a member is still rejected, unchanged from before.
--   * gravy_lookup_household, gravy_household_status and gravy_claim_household are unchanged —
--     the first already links a signed-in caller as a member on lookup (the mechanism both the
--     "existing parent, second device" and "co-parent" onboarding paths reuse), the second is a
--     read-only status check, and the third becomes a dead-code safety valve now that every
--     household is claimed at creation, but stays in place at no cost.
--
-- No grant/revoke changes: anon still needs EXECUTE on the tightened functions so a rejected
-- anonymous call surfaces as a readable Postgres exception (res.error) rather than a bare
-- permission-denied from PostgREST.

create or replace function public.gravy_create_household(p_code text, p_state jsonb)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'must be signed in to create a household';
  end if;
  if p_code !~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$' then
    raise exception 'invalid household code';
  end if;
  insert into public.households (code, state, owner_id) values (p_code, p_state, v_uid);
  insert into public.household_members (household_code, user_id, role)
  values (p_code, v_uid, 'owner')
  on conflict (household_code, user_id) do update set role = 'owner';
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
    -- First push for this code creates the row — mirrors gravy_create_household, so it also
    -- requires a signed-in caller. In practice the client always calls gravy_create_household
    -- first; this branch just keeps the two functions consistent rather than leaving a second,
    -- looser path to an owned row.
    if v_uid is null then
      raise exception 'must be signed in to create a household';
    end if;
    insert into public.households (code, state, updated_at, owner_id)
    values (p_code, p_state, now(), v_uid);
    insert into public.household_members (household_code, user_id, role)
    values (p_code, v_uid, 'owner')
    on conflict (household_code, user_id) do update set role = 'owner';
    return;
  end if;
  -- Every household is claimed at creation now, so v_owner is never null here in practice — but
  -- keep the "is not null" guard rather than assuming it, in case of pre-migration rows.
  -- Anonymous callers (kid-mode devices, v_uid IS NULL) are allowed through: that's the load-
  -- bearing relaxation that keeps kid-mode sync working without an account. A signed-in caller
  -- who isn't a member is still rejected.
  if v_owner is not null and v_uid is not null and not public.gravy_is_member(p_code, v_uid) then
    raise exception 'not authorized for this household';
  end if;
  update public.households set state = p_state, updated_at = now() where code = p_code;
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
begin
  if p_new_code !~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$' then
    raise exception 'invalid household code';
  end if;
  if v_uid is null or not public.gravy_is_member(p_old_code, v_uid) then
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
  if v_uid is null or v_owner is null or v_owner <> v_uid then
    raise exception 'only the household owner can delete it';
  end if;
  delete from public.households where code = p_code;
end;
$$;
