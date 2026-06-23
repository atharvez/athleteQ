-- Fix test_results foreign keys
alter table test_results drop constraint if exists test_results_athlete_session_id_fkey;
alter table test_results add constraint test_results_athlete_session_id_fkey foreign key (athlete_session_id) references athlete_sessions(id) on delete cascade;

alter table test_results drop constraint if exists test_results_athlete_id_fkey;
alter table test_results add constraint test_results_athlete_id_fkey foreign key (athlete_id) references athletes(id) on delete cascade;

alter table test_results drop constraint if exists test_results_test_event_id_fkey;
alter table test_results add constraint test_results_test_event_id_fkey foreign key (test_event_id) references test_events(id) on delete cascade;

-- Fix scan_logs foreign keys
alter table scan_logs drop constraint if exists scan_logs_athlete_id_fkey;
alter table scan_logs add constraint scan_logs_athlete_id_fkey foreign key (athlete_id) references athletes(id) on delete cascade;

alter table scan_logs drop constraint if exists scan_logs_test_event_id_fkey;
alter table scan_logs add constraint scan_logs_test_event_id_fkey foreign key (test_event_id) references test_events(id) on delete cascade;

alter table scan_logs drop constraint if exists scan_logs_scanned_by_fkey;
alter table scan_logs add constraint scan_logs_scanned_by_fkey foreign key (scanned_by) references auth.users(id) on delete set null;

-- Fix test_events foreign keys
alter table test_events drop constraint if exists test_events_created_by_fkey;
alter table test_events add constraint test_events_created_by_fkey foreign key (created_by) references auth.users(id) on delete set null;
