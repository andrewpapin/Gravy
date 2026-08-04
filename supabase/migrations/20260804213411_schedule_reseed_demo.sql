-- Recurring reseed of the shared, unclaimed Demo Mode household (code TRYDEM) — see
-- supabase/functions/reseed-demo/index.ts. The function's generated data is anchored to
-- "today" (relative day offsets for history, streaks, etc.), so it needs to be re-run daily
-- to stay fresh; this also resets anything a demo visitor changed during the day.
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'reseed-demo-household',
  '0 9 * * *', -- daily at 09:00 UTC (~4-5am US Eastern, off-peak for the default demo timezone)
  $$
  select net.http_post(
    url := 'https://hooadhlgxaivkgvqptcu.supabase.co/functions/v1/reseed-demo',
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
  $$
);
