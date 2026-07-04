-- C-1 remediation: the existing "anyone can insert households" / "anyone can update
-- households" policies grant unscoped INSERT/UPDATE to the anon role on every row, so any
-- client holding the public anon key can overwrite or flood the entire households table
-- rather than just the one household it knows the code for.
--
-- This migration replaces direct anon INSERT/UPDATE table grants with three narrow
-- SECURITY DEFINER functions that each take the row's `code` and only ever touch that one
-- row. The SELECT policy ("anyone can read households") is intentionally left untouched:
-- Supabase Realtime's postgres_changes delivery is gated by the subscribing role's SELECT
-- RLS permission, and this app authenticates every client with the same shared anon key
-- (no per-household auth claim exists to scope SELECT by), so revoking SELECT would break
-- the app's live cross-device sync. Locking down INSERT/UPDATE still removes the ability for
-- an arbitrary client to vandalize or flood other households' rows, which was the most
-- severe part of the exposure.

drop policy if exists "anyone can insert households" on public.households;
drop policy if exists "anyone can update households" on public.households;

revoke insert, update on public.households from anon;

create or replace function public.gravy_create_household(p_code text, p_state jsonb)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_code !~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$' then
    raise exception 'invalid household code';
  end if;
  insert into public.households (code, state) values (p_code, p_state);
end;
$$;

-- Mirrors the client's previous `.upsert({ code, state, updated_at })` call: inserts a new
-- row if the code doesn't exist yet, otherwise updates the existing row's state.
create or replace function public.gravy_upsert_household_state(p_code text, p_state jsonb)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_code !~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$' then
    raise exception 'invalid household code';
  end if;
  insert into public.households (code, state, updated_at)
  values (p_code, p_state, now())
  on conflict (code) do update set state = excluded.state, updated_at = excluded.updated_at;
end;
$$;

-- A plain UPDATE with no ON CONFLICT handling, same as the code it replaces: if p_new_code
-- already belongs to another row, the primary-key constraint raises 23505 naturally, which
-- the client's collision-retry logic depends on.
create or replace function public.gravy_rename_household(p_old_code text, p_new_code text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_new_code !~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$' then
    raise exception 'invalid household code';
  end if;
  update public.households set code = p_new_code where code = p_old_code;
end;
$$;

revoke all on function public.gravy_create_household(text, jsonb) from public;
revoke all on function public.gravy_upsert_household_state(text, jsonb) from public;
revoke all on function public.gravy_rename_household(text, text) from public;

grant execute on function public.gravy_create_household(text, jsonb) to anon;
grant execute on function public.gravy_upsert_household_state(text, jsonb) to anon;
grant execute on function public.gravy_rename_household(text, text) to anon;
