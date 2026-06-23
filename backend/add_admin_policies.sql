-- Update RLS policies to allow the 'admin' role
-- Run this in your Supabase SQL Editor

-- 1. Athletes
drop policy if exists "Coaches can read all athletes" on athletes;
create policy "Coaches can read all athletes"
  on athletes for select
  using ((auth.jwt() -> 'user_metadata' ->> 'role') in ('coach', 'admin'));

-- 2. Test Events
drop policy if exists "Coaches can manage events" on test_events;
create policy "Coaches can manage events"
  on test_events for all
  using ((auth.jwt() -> 'user_metadata' ->> 'role') in ('coach', 'admin'));

-- 3. Athlete Sessions
drop policy if exists "Coaches can manage sessions" on athlete_sessions;
create policy "Coaches can manage sessions"
  on athlete_sessions for all
  using ((auth.jwt() -> 'user_metadata' ->> 'role') in ('coach', 'admin'));

-- 4. Test Results
drop policy if exists "Coaches can manage results" on test_results;
create policy "Coaches can manage results"
  on test_results for all
  using ((auth.jwt() -> 'user_metadata' ->> 'role') in ('coach', 'admin'));

-- 5. Scan Logs
drop policy if exists "Coaches can view scan logs" on scan_logs;
create policy "Coaches can view scan logs"
  on scan_logs for select
  using ((auth.jwt() -> 'user_metadata' ->> 'role') in ('coach', 'admin'));
