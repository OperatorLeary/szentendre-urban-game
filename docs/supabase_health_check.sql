-- Szentendre City Quest - Supabase DB Health Check
-- Read-only checks. Safe to run in Supabase SQL editor.

-- ============================================================
-- 1) PASS/FAIL SUMMARY
-- ============================================================
with
required_tables as (
  select unnest(array[
    'routes',
    'locations',
    'route_locations',
    'route_stations',
    'runs',
    'checkins',
    'bug_reports',
    'admin_users'
  ]) as table_name
),
missing_tables as (
  select rt.table_name
  from required_tables rt
  left join pg_tables pt
    on pt.schemaname = 'public'
   and pt.tablename = rt.table_name
  where pt.tablename is null
),
tables_without_rls as (
  select c.relname as table_name
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
    and c.relname = any (array(
      select table_name from required_tables
    ))
    and c.relrowsecurity = false
),
expected_policies as (
  select *
  from (values
    ('routes', 'routes_read_active'),
    ('routes', 'routes_admin_read_all'),
    ('locations', 'locations_read_active'),
    ('locations', 'locations_admin_read_all'),
    ('route_locations', 'route_locations_read_active'),
    ('route_locations', 'route_locations_admin_read_all'),
    ('route_stations', 'route_stations_read_active'),
    ('route_stations', 'route_stations_admin_read_all'),
    ('route_stations', 'route_stations_admin_insert'),
    ('route_stations', 'route_stations_admin_update'),
    ('runs', 'runs_insert_public'),
    ('runs', 'runs_select_public'),
    ('runs', 'runs_update_public'),
    ('checkins', 'checkins_insert_public'),
    ('checkins', 'checkins_select_public'),
    ('bug_reports', 'bug_reports_insert_public'),
    ('bug_reports', 'bug_reports_select_public'),
    ('admin_users', 'admin_users_select_self')
  ) as x(tablename, policyname)
),
missing_policies as (
  select ep.tablename, ep.policyname
  from expected_policies ep
  left join pg_policies p
    on p.schemaname = 'public'
   and p.tablename = ep.tablename
   and p.policyname = ep.policyname
  where p.policyname is null
),
expected_triggers as (
  select *
  from (values
    ('routes', 'trg_routes_set_updated_at'),
    ('locations', 'trg_locations_set_updated_at'),
    ('route_locations', 'trg_route_locations_set_updated_at'),
    ('route_stations', 'trg_route_stations_set_updated_at'),
    ('runs', 'trg_runs_set_updated_at'),
    ('runs', 'trg_runs_validate_player_alias'),
    ('checkins', 'trg_checkins_set_updated_at'),
    ('bug_reports', 'trg_bug_reports_set_updated_at'),
    ('admin_users', 'trg_admin_users_set_updated_at')
  ) as x(table_name, trigger_name)
),
missing_triggers as (
  select et.table_name, et.trigger_name
  from expected_triggers et
  left join information_schema.triggers t
    on t.event_object_schema = 'public'
   and t.event_object_table = et.table_name
   and t.trigger_name = et.trigger_name
  where t.trigger_name is null
),
run_status_anomalies as (
  select count(*) as failures
  from public.runs r
  where
    (r.status = 'completed' and r.completed_at is null)
    or (r.status = 'active' and r.completed_at is not null)
),
run_abandoned_without_completed_at as (
  select count(*) as failures
  from public.runs r
  where r.status = 'abandoned'
    and r.completed_at is null
),
run_device_conflicts as (
  select count(*) as failures
  from (
    select device_id
    from public.runs
    where status = 'active'
    group by device_id
    having count(*) > 1
  ) d
),
run_start_location_mismatch as (
  select count(*) as failures
  from public.runs r
  where r.start_location_id is not null
    and not exists (
      select 1
      from public.route_locations rl
      where rl.route_id = r.route_id
        and rl.location_id = r.start_location_id
    )
),
route_sequence_gaps as (
  select count(*) as failures
  from (
    select
      rl.route_id,
      max(rl.sequence_index) as max_seq,
      count(*) as seq_count,
      count(distinct rl.sequence_index) as distinct_seq_count,
      min(rl.sequence_index) as min_seq
    from public.route_locations rl
    group by rl.route_id
    having min(rl.sequence_index) <> 1
       or max(rl.sequence_index) <> count(*)
       or count(*) <> count(distinct rl.sequence_index)
  ) g
),
checkin_route_mismatch as (
  select count(*) as failures
  from public.checkins c
  join public.runs r on r.id = c.run_id
  where c.route_id <> r.route_id
),
checkin_route_location_mismatch as (
  select count(*) as failures
  from public.checkins c
  where not exists (
    select 1
    from public.route_locations rl
    where rl.route_id = c.route_id
      and rl.location_id = c.location_id
      and rl.sequence_index = c.sequence_index
  )
),
checkin_validation_anomalies as (
  select count(*) as failures
  from public.checkins c
  where
    (
      c.validation_type = 'gps'
      and (c.detected_distance_m is null or c.scanned_qr_token is not null)
    )
    or (
      c.validation_type = 'qr_override'
      and (c.scanned_qr_token is null or c.detected_distance_m is not null)
    )
),
checkin_answer_anomalies as (
  select count(*) as failures
  from public.checkins c
  where c.answer_text is null
     or btrim(c.answer_text) = ''
     or c.is_answer_correct is null
),
route_station_orphans as (
  select count(*) as failures
  from public.route_stations rs
  where not exists (
    select 1
    from public.route_locations rl
    where rl.route_id = rs.route_id
      and rl.location_id = rs.location_id
  )
),
admin_email_anomalies as (
  select count(*) as failures
  from public.admin_users au
  where au.email <> lower(btrim(au.email))
),
long_route_qr_anomalies as (
  select count(*) as failures
  from public.locations l
  join public.route_locations rl on rl.location_id = l.id
  join public.routes r on r.id = rl.route_id
  where r.slug = 'long'
    and l.is_active = true
    and l.qr_code_value <> format('/r/long/l/%s?entry=qr', l.slug)
),
summary as (
  select 10 as ord, 'missing_tables' as check_name, (select count(*) from missing_tables) as failures
  union all
  select 20, 'tables_without_rls', (select count(*) from tables_without_rls)
  union all
  select 30, 'missing_policies', (select count(*) from missing_policies)
  union all
  select 40, 'missing_triggers', (select count(*) from missing_triggers)
  union all
  select 50, 'run_status_anomalies', (select failures from run_status_anomalies)
  union all
  select 55, 'run_abandoned_without_completed_at', (select failures from run_abandoned_without_completed_at)
  union all
  select 60, 'run_device_conflicts', (select failures from run_device_conflicts)
  union all
  select 70, 'run_start_location_mismatch', (select failures from run_start_location_mismatch)
  union all
  select 80, 'route_sequence_gaps', (select failures from route_sequence_gaps)
  union all
  select 90, 'checkin_route_mismatch', (select failures from checkin_route_mismatch)
  union all
  select 100, 'checkin_route_location_mismatch', (select failures from checkin_route_location_mismatch)
  union all
  select 110, 'checkin_validation_anomalies', (select failures from checkin_validation_anomalies)
  union all
  select 120, 'checkin_answer_anomalies', (select failures from checkin_answer_anomalies)
  union all
  select 130, 'route_station_orphans', (select failures from route_station_orphans)
  union all
  select 140, 'admin_email_anomalies', (select failures from admin_email_anomalies)
  union all
  select 150, 'long_route_qr_anomalies', (select failures from long_route_qr_anomalies)
)
select
  check_name,
  case when failures = 0 then 'PASS' else 'FAIL' end as status,
  failures
from summary
order by ord;

-- ============================================================
-- 2) DETAIL QUERIES (only rows with issues)
-- ============================================================

-- Missing physical tables
select * from (
  select rt.table_name
  from (select unnest(array[
    'routes','locations','route_locations','route_stations','runs','checkins','bug_reports','admin_users'
  ]) as table_name) rt
  left join pg_tables pt
    on pt.schemaname = 'public'
   and pt.tablename = rt.table_name
  where pt.tablename is null
) t
order by table_name;

-- Tables without RLS enabled
select c.relname as table_name
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relname = any (array[
    'routes','locations','route_locations','route_stations','runs','checkins','bug_reports','admin_users'
  ])
  and c.relrowsecurity = false
order by table_name;

-- Missing expected policies
with expected_policies as (
  select *
  from (values
    ('routes', 'routes_read_active'),
    ('routes', 'routes_admin_read_all'),
    ('locations', 'locations_read_active'),
    ('locations', 'locations_admin_read_all'),
    ('route_locations', 'route_locations_read_active'),
    ('route_locations', 'route_locations_admin_read_all'),
    ('route_stations', 'route_stations_read_active'),
    ('route_stations', 'route_stations_admin_read_all'),
    ('route_stations', 'route_stations_admin_insert'),
    ('route_stations', 'route_stations_admin_update'),
    ('runs', 'runs_insert_public'),
    ('runs', 'runs_select_public'),
    ('runs', 'runs_update_public'),
    ('checkins', 'checkins_insert_public'),
    ('checkins', 'checkins_select_public'),
    ('bug_reports', 'bug_reports_insert_public'),
    ('bug_reports', 'bug_reports_select_public'),
    ('admin_users', 'admin_users_select_self')
  ) as x(tablename, policyname)
)
select ep.tablename, ep.policyname
from expected_policies ep
left join pg_policies p
  on p.schemaname = 'public'
 and p.tablename = ep.tablename
 and p.policyname = ep.policyname
where p.policyname is null
order by ep.tablename, ep.policyname;

-- Missing expected triggers
with expected_triggers as (
  select *
  from (values
    ('routes', 'trg_routes_set_updated_at'),
    ('locations', 'trg_locations_set_updated_at'),
    ('route_locations', 'trg_route_locations_set_updated_at'),
    ('route_stations', 'trg_route_stations_set_updated_at'),
    ('runs', 'trg_runs_set_updated_at'),
    ('runs', 'trg_runs_validate_player_alias'),
    ('checkins', 'trg_checkins_set_updated_at'),
    ('bug_reports', 'trg_bug_reports_set_updated_at'),
    ('admin_users', 'trg_admin_users_set_updated_at')
  ) as x(table_name, trigger_name)
)
select et.table_name, et.trigger_name
from expected_triggers et
left join information_schema.triggers t
  on t.event_object_schema = 'public'
 and t.event_object_table = et.table_name
 and t.trigger_name = et.trigger_name
where t.trigger_name is null
order by et.table_name, et.trigger_name;

-- Non-contiguous route sequence maps
select
  rl.route_id,
  r.slug as route_slug,
  min(rl.sequence_index) as min_seq,
  max(rl.sequence_index) as max_seq,
  count(*) as seq_count,
  count(distinct rl.sequence_index) as distinct_seq_count
from public.route_locations rl
join public.routes r on r.id = rl.route_id
group by rl.route_id, r.slug
having min(rl.sequence_index) <> 1
   or max(rl.sequence_index) <> count(*)
   or count(*) <> count(distinct rl.sequence_index)
order by r.slug;

-- Runs: status/completed_at inconsistencies (true invalid states)
select
  r.id,
  r.device_id,
  r.status,
  r.started_at,
  r.completed_at
from public.runs r
where
  (r.status = 'completed' and r.completed_at is null)
  or (r.status = 'active' and r.completed_at is not null)
order by r.updated_at desc
limit 200;

-- Runs: abandoned without completed_at (optional quality check)
select
  r.id,
  r.device_id,
  r.status,
  r.started_at,
  r.completed_at
from public.runs r
where r.status = 'abandoned'
  and r.completed_at is null
order by r.updated_at desc
limit 200;

-- Runs: more than one active run per device
select
  r.device_id,
  count(*) as active_run_count,
  array_agg(r.id order by r.started_at desc) as run_ids
from public.runs r
where r.status = 'active'
group by r.device_id
having count(*) > 1
order by active_run_count desc, r.device_id;

-- Runs: start_location not part of run route
select
  r.id as run_id,
  r.route_id,
  rt.slug as route_slug,
  r.start_location_id,
  l.slug as start_location_slug
from public.runs r
left join public.routes rt on rt.id = r.route_id
left join public.locations l on l.id = r.start_location_id
where r.start_location_id is not null
  and not exists (
    select 1
    from public.route_locations rl
    where rl.route_id = r.route_id
      and rl.location_id = r.start_location_id
  )
order by r.updated_at desc
limit 200;

-- Checkins: run.route mismatch
select
  c.id as checkin_id,
  c.run_id,
  c.route_id as checkin_route_id,
  r.route_id as run_route_id,
  c.location_id,
  c.sequence_index
from public.checkins c
join public.runs r on r.id = c.run_id
where c.route_id <> r.route_id
order by c.created_at desc
limit 200;

-- Checkins: route/location/sequence not matching route_locations
select
  c.id as checkin_id,
  c.run_id,
  c.route_id,
  c.location_id,
  c.sequence_index
from public.checkins c
where not exists (
  select 1
  from public.route_locations rl
  where rl.route_id = c.route_id
    and rl.location_id = c.location_id
    and rl.sequence_index = c.sequence_index
)
order by c.created_at desc
limit 200;

-- Checkins: validation payload mismatch by type
select
  c.id as checkin_id,
  c.validation_type,
  c.detected_distance_m,
  c.scanned_qr_token,
  c.gps_lat,
  c.gps_lng
from public.checkins c
where
  (
    c.validation_type = 'gps'
    and (c.detected_distance_m is null or c.scanned_qr_token is not null)
  )
  or (
    c.validation_type = 'qr_override'
    and (c.scanned_qr_token is null or c.detected_distance_m is not null)
  )
order by c.created_at desc
limit 200;

-- Checkins: answer capture anomalies
select
  c.id as checkin_id,
  c.answer_text,
  c.is_answer_correct
from public.checkins c
where c.answer_text is null
   or btrim(c.answer_text) = ''
   or c.is_answer_correct is null
order by c.created_at desc
limit 200;

-- Route station rows that no longer map to route_locations
select
  rs.id as route_station_id,
  rs.route_id,
  r.slug as route_slug,
  rs.location_id,
  l.slug as location_slug
from public.route_stations rs
left join public.routes r on r.id = rs.route_id
left join public.locations l on l.id = rs.location_id
where not exists (
  select 1
  from public.route_locations rl
  where rl.route_id = rs.route_id
    and rl.location_id = rs.location_id
)
order by rs.updated_at desc
limit 200;

-- Admin allowlist emails that are not normalized
select
  au.id,
  au.email,
  au.is_active
from public.admin_users au
where au.email <> lower(btrim(au.email))
order by au.updated_at desc
limit 200;

-- Long route QR payloads missing ?entry=qr marker
select
  l.id as location_id,
  l.slug,
  l.qr_code_value
from public.locations l
join public.route_locations rl on rl.location_id = l.id
join public.routes r on r.id = rl.route_id
where r.slug = 'long'
  and l.is_active = true
  and l.qr_code_value <> format('/r/long/l/%s?entry=qr', l.slug)
order by l.slug;

-- ============================================================
-- 3) QUICK SIZE SNAPSHOT
-- ============================================================
select
  relname as table_name,
  n_live_tup as estimated_live_rows,
  pg_size_pretty(pg_total_relation_size(relid)) as total_size
from pg_stat_user_tables
where schemaname = 'public'
  and relname = any (array[
    'routes','locations','route_locations','route_stations','runs','checkins','bug_reports','admin_users'
  ])
order by pg_total_relation_size(relid) desc;
