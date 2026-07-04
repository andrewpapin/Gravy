-- BACKLOG.md Epic 13 follow-up: this project's actual first migration (creating
-- `public.households`) was applied directly against production on 2026-06-13 and was never
-- committed to this repo, so `supabase/migrations/` couldn't rebuild the schema from scratch —
-- every migration since assumes this table already exists (e.g. the `drop policy if exists`
-- calls in 20260623123203_scope_household_mutations.sql). That gap is also why the Supabase
-- GitHub branching integration's persistent preview branch has been stuck in
-- MIGRATIONS_FAILED since 2026-06-23: a fresh preview database replays every file in this
-- folder from a blank schema, and the first one hit a table that didn't exist yet.
--
-- Reconstructed here to match the live production schema exactly (columns, primary key, and
-- the original read/insert/update policies that 20260623123203_scope_household_mutations.sql
-- goes on to tighten). Named with the version Supabase's migration history already recorded
-- for it in production, so this is recognized as already-applied there rather than replayed.

create table public.households (
  code text primary key,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.households enable row level security;

create policy "anyone can read households"
  on public.households for select using (true);

create policy "anyone can insert households"
  on public.households for insert with check (true);

create policy "anyone can update households"
  on public.households for update using (true);
