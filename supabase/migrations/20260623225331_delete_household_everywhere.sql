-- BACKLOG.md Epic 1 follow-up: "Reset Everything" (DangerZonePanel) and "Leave household"
-- (SyncPanel) both only ever disconnect the *local* device from sync — neither deletes the
-- household's row in `public.households`, so a household a family is done with keeps
-- existing server-side indefinitely. That's intentional for "leave" (other devices synced
-- to the same code still depend on the row, so leaving must not delete it out from under
-- them) but it means there was no way to actually delete a household's data everywhere.
--
-- This adds a fourth SECURITY DEFINER RPC, scoped to one code like the three in
-- 20260623000000_scope_household_mutations.sql, backing a new, separate "Delete household
-- everywhere" action in the UI (distinct from "Turn off cloud sync").

create or replace function public.gravy_delete_household(p_code text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_code !~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$' then
    raise exception 'invalid household code';
  end if;
  delete from public.households where code = p_code;
end;
$$;

revoke all on function public.gravy_delete_household(text) from public;
grant execute on function public.gravy_delete_household(text) to anon;
