-- ============================================================
-- Sports Performance OS — Supabase Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- Drop existing tables to avoid schema collision
drop table if exists scan_logs cascade;
drop table if exists test_results cascade;
drop table if exists athlete_sessions cascade;
drop table if exists test_events cascade;
drop table if exists athletes cascade;
drop table if exists athlete_tests cascade;

-- ATHLETES
create table if not exists athletes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  full_name text not null,
  date_of_birth date,
  gender text check (gender in ('male', 'female', 'other')),
  sport text,
  height_cm numeric,
  weight_kg numeric,
  qr_token text unique not null default gen_random_uuid()::text,
  created_at timestamptz default now()
);

-- TEST EVENTS
create table if not exists test_events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  test_type text not null check (test_type in ('20m_sprint', '30m_sprint', 'agility')),
  status text default 'pending' check (status in ('pending', 'active', 'completed')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

-- ATHLETE SESSIONS (athlete enrolled in a test event)
create table if not exists athlete_sessions (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid references athletes(id) on delete cascade,
  test_event_id uuid references test_events(id) on delete cascade,
  status text default 'queued' check (status in ('queued', 'ready', 'testing', 'completed')),
  scanned_at timestamptz default now(),
  unique(athlete_id, test_event_id)
);

-- TEST RESULTS
create table if not exists test_results (
  id uuid primary key default gen_random_uuid(),
  athlete_session_id uuid references athlete_sessions(id) on delete cascade,
  athlete_id uuid references athletes(id) on delete cascade,
  test_event_id uuid references test_events(id) on delete cascade,
  result_value numeric not null,
  unit text default 'seconds',
  raw_iot_payload jsonb,
  recorded_at timestamptz default now()
);

-- SCAN LOGS (audit trail)
create table if not exists scan_logs (
  id uuid primary key default gen_random_uuid(),
  qr_token text not null,
  athlete_id uuid references athletes(id) on delete cascade,
  test_event_id uuid references test_events(id) on delete cascade,
  scan_result text check (scan_result in ('success', 'not_found', 'already_enrolled')),
  scanned_by uuid references auth.users(id) on delete set null,
  scanned_at timestamptz default now()
);

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- Enable RLS
alter table athletes enable row level security;
alter table test_events enable row level security;
alter table athlete_sessions enable row level security;
alter table test_results enable row level security;
alter table scan_logs enable row level security;

-- ATHLETES: own row access
create policy "Athletes can read own data"
  on athletes for select
  using (auth.uid() = user_id);

create policy "Athletes can update own data"
  on athletes for update
  using (auth.uid() = user_id);

create policy "Coaches can read all athletes"
  on athletes for select
  using ((auth.jwt() -> 'user_metadata' ->> 'role') in ('coach', 'admin'));

create policy "Service role full access on athletes"
  on athletes for all
  using (auth.role() = 'service_role');

-- TEST EVENTS: coaches can manage
create policy "Coaches can manage events"
  on test_events for all
  using ((auth.jwt() -> 'user_metadata' ->> 'role') in ('coach', 'admin'));

create policy "Athletes can view active events"
  on test_events for select
  using (status = 'active');

create policy "Service role full access on events"
  on test_events for all
  using (auth.role() = 'service_role');

-- ATHLETE SESSIONS
create policy "Coaches can manage sessions"
  on athlete_sessions for all
  using ((auth.jwt() -> 'user_metadata' ->> 'role') in ('coach', 'admin'));

create policy "Athletes can view own sessions"
  on athlete_sessions for select
  using (
    athlete_id in (
      select id from athletes where user_id = auth.uid()
    )
  );

create policy "Service role full access on sessions"
  on athlete_sessions for all
  using (auth.role() = 'service_role');

-- TEST RESULTS
create policy "Coaches can manage results"
  on test_results for all
  using ((auth.jwt() -> 'user_metadata' ->> 'role') in ('coach', 'admin'));

create policy "Athletes can view own results"
  on test_results for select
  using (
    athlete_id in (
      select id from athletes where user_id = auth.uid()
    )
  );

create policy "Service role full access on results"
  on test_results for all
  using (auth.role() = 'service_role');

-- SCAN LOGS: insert only for authenticated users
create policy "Authenticated users can insert scan logs"
  on scan_logs for insert
  with check (auth.uid() is not null);

create policy "Coaches can view scan logs"
  on scan_logs for select
  using ((auth.jwt() -> 'user_metadata' ->> 'role') in ('coach', 'admin'));

create policy "Service role full access on logs"
  on scan_logs for all
  using (auth.role() = 'service_role');

-- ============================================================
-- REALTIME
-- Enable in Supabase Dashboard > Database > Replication
-- Or run these:
-- ============================================================
-- alter publication supabase_realtime add table athlete_sessions;
-- alter publication supabase_realtime add table test_results;

-- ============================================================
-- HELPER FUNCTION: get or create athlete profile on user signup
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  -- Only create athlete profile if role is 'athlete'
  if (new.raw_user_meta_data ->> 'role') = 'athlete' then
    insert into public.athletes (user_id, full_name, sport, qr_token)
    values (
      new.id,
      coalesce(new.raw_user_meta_data ->> 'full_name', 'Unnamed Athlete'),
      coalesce(new.raw_user_meta_data ->> 'sport', 'General'),
      gen_random_uuid()::text
    );
  end if;
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
