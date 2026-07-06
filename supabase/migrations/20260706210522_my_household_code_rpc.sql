-- "Existing Parent" onboarding fork needs to auto-attach a signed-in parent to their own household
-- without asking them to re-type the family code on a second device. Every prior lookup RPC is
-- keyed by household code; this is the first one keyed by the caller's identity alone.
--
-- Returns the household_code of the caller's most relevant household_members row, or null if they
-- have none (fresh account — client falls back to manual join-by-code). Tie-break: prefer a row
-- where role = 'owner' (a parent almost always wants their own family, not one they were invited
-- into as a co-parent on some other device); otherwise the most recently-created row. A real-world
-- caller should only ever have 0 or 1 rows in practice today (no multi-household UI exists), so
-- this tie-break is a defensive default, not a common case.
create or replace function public.gravy_my_household_code()
returns text
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select household_code
  from public.household_members
  where user_id = auth.uid()
  order by (role = 'owner') desc, created_at desc
  limit 1;
$$;

-- Supabase grants EXECUTE to anon+authenticated by default on new public functions; anon callers
-- always have a null auth.uid() so the query would just return null, but lock it to authenticated
-- only anyway for clarity/consistency with gravy_claim_household.
revoke all on function public.gravy_my_household_code() from public, anon, authenticated;
grant execute on function public.gravy_my_household_code() to authenticated;
