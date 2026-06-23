-- BACKLOG.md Epic 1 follow-up to 20260623000000_scope_household_mutations.sql: that
-- migration scoped INSERT/UPDATE behind SECURITY DEFINER RPCs but left the join-by-code
-- lookup (`fetchHousehold` in src/state/sync.ts) as a plain `.from('households').select()`,
-- with nothing slowing down a scripted sweep of the ~32^6 household code space.
--
-- This adds household_lookup_attempts (a per-source-IP sliding-window counter) and a
-- SECURITY DEFINER RPC, gravy_lookup_household, that the client now calls instead of
-- querying the table directly. The function throttles to 10 lookups per 5-minute window
-- per IP (read from the PostgREST `request.headers` GUC's x-forwarded-for, falling back to
-- a single shared "unknown" bucket if no IP is available — degraded but still rate-limited,
-- not unlimited) before returning the household state for a valid, existing code.
--
-- Residual risk, same class as the one already accepted in the prior migration: the
-- `households` table's SELECT grant/policy must stay open for `anon` because Realtime's
-- postgres_changes delivery depends on it, so a client that bypasses this RPC and queries
-- the REST endpoint directly is not blocked by this change. This closes the documented,
-- discoverable join-flow path (what an actual scripted sweep through the public app would
-- use); it does not turn SELECT into a fully access-controlled endpoint, which would need a
-- different realtime auth model (out of scope here).

create table if not exists public.household_lookup_attempts (
  bucket_key text primary key,
  attempt_count integer not null default 0,
  window_start timestamptz not null default now()
);

alter table public.household_lookup_attempts enable row level security;

-- No grants/policies for anon or authenticated: only the SECURITY DEFINER function below
-- (running as the function owner) ever reads or writes this table.
revoke all on public.household_lookup_attempts from anon, authenticated;

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

  if v_count > v_max_attempts then
    raise exception 'Too many attempts — please wait a few minutes and try again.';
  end if;

  if p_code !~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$' then
    return null;
  end if;

  select state into v_state from public.households where code = p_code;
  return v_state;
end;
$$;

revoke all on function public.gravy_lookup_household(text) from public;
grant execute on function public.gravy_lookup_household(text) to anon;
