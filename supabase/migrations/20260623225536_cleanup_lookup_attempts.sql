-- BACKLOG.md Epic 1 follow-up: household_lookup_attempts (the rate-limit bucket table added
-- in 20260623184956_rate_limit_household_lookup.sql) never expired old rows, so it grows by
-- one row per distinct source IP forever. There's no pg_cron job in this project to sweep it
-- on a schedule, so instead gravy_lookup_household opportunistically deletes buckets whose
-- window has already lapsed every time it runs — since the function is called on every
-- join-by-code attempt, this keeps the table bounded to roughly the IPs seen in the last
-- rate-limit window without needing a separate scheduled job.

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

  -- Opportunistic cleanup: other buckets (not the one just touched above) whose window has
  -- already lapsed are done rate-limiting anything and can be swept.
  delete from public.household_lookup_attempts
  where bucket_key <> v_key
    and now() - window_start > make_interval(secs => v_window_seconds);

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
