-- Route/Profile Audit (read-only)
-- Focused checks for QR profile behavior assumptions:
-- short=3, medium=12, long=24

with expected_routes as (
  select *
  from (values
    ('short', 3),
    ('medium', 12),
    ('long', 24)
  ) as x(route_slug, expected_count)
),
route_counts as (
  select
    r.slug as route_slug,
    count(*)::int as mapped_count,
    min(rl.sequence_index)::int as min_sequence,
    max(rl.sequence_index)::int as max_sequence,
    count(distinct rl.sequence_index)::int as distinct_sequence_count
  from public.routes r
  join public.route_locations rl
    on rl.route_id = r.id
  where r.slug in (select route_slug from expected_routes)
  group by r.slug
),
route_count_check as (
  select
    er.route_slug,
    er.expected_count,
    coalesce(rc.mapped_count, 0) as actual_count,
    case
      when coalesce(rc.mapped_count, 0) = er.expected_count then 'PASS'
      else 'FAIL'
    end as status
  from expected_routes er
  left join route_counts rc
    on rc.route_slug = er.route_slug
),
route_sequence_contiguity_check as (
  select
    rc.route_slug,
    rc.mapped_count,
    rc.min_sequence,
    rc.max_sequence,
    rc.distinct_sequence_count,
    case
      when rc.mapped_count = rc.distinct_sequence_count
       and rc.min_sequence = 1
       and rc.max_sequence = rc.mapped_count
        then 'PASS'
      else 'FAIL'
    end as status
  from route_counts rc
),
route_station_mapping_check as (
  select
    r.slug as route_slug,
    count(*) filter (
      where rs.id is null
    )::int as missing_route_station_rows,
    count(*) filter (
      where rs.id is not null
    )::int as present_route_station_rows
  from public.routes r
  join public.route_locations rl
    on rl.route_id = r.id
  left join public.route_stations rs
    on rs.route_id = rl.route_id
   and rs.location_id = rl.location_id
   and rs.is_active = true
  where r.slug in (select route_slug from expected_routes)
  group by r.slug
),
profile_summary as (
  select
    'route_count_check' as check_name,
    route_slug,
    status,
    format('expected=%s actual=%s', expected_count, actual_count) as details
  from route_count_check
  union all
  select
    'route_sequence_contiguity' as check_name,
    route_slug,
    status,
    format(
      'mapped=%s min_seq=%s max_seq=%s distinct_seq=%s',
      mapped_count,
      min_sequence,
      max_sequence,
      distinct_sequence_count
    ) as details
  from route_sequence_contiguity_check
  union all
  select
    'route_station_mapping' as check_name,
    route_slug,
    case when missing_route_station_rows = 0 then 'PASS' else 'FAIL' end as status,
    format(
      'missing_route_station_rows=%s present_route_station_rows=%s',
      missing_route_station_rows,
      present_route_station_rows
    ) as details
  from route_station_mapping_check
)
select
  check_name,
  route_slug,
  status,
  details
from profile_summary
order by check_name, route_slug;

-- Detailed failures only

-- 1) Missing expected route rows
with expected_routes as (
  select *
  from (values
    ('short', 3),
    ('medium', 12),
    ('long', 24)
  ) as x(route_slug, expected_count)
),
route_counts as (
  select
    r.slug as route_slug,
    count(*)::int as mapped_count
  from public.routes r
  join public.route_locations rl
    on rl.route_id = r.id
  where r.slug in (select route_slug from expected_routes)
  group by r.slug
)
select
  er.route_slug,
  er.expected_count,
  coalesce(rc.mapped_count, 0) as actual_count
from expected_routes er
left join route_counts rc
  on rc.route_slug = er.route_slug
where coalesce(rc.mapped_count, 0) <> er.expected_count
order by er.route_slug;

-- 2) Non-contiguous sequence maps
with expected_routes as (
  select unnest(array['short', 'medium', 'long']) as route_slug
)
select
  r.slug as route_slug,
  min(rl.sequence_index)::int as min_sequence,
  max(rl.sequence_index)::int as max_sequence,
  count(*)::int as mapped_count,
  count(distinct rl.sequence_index)::int as distinct_sequence_count
from public.routes r
join public.route_locations rl
  on rl.route_id = r.id
where r.slug in (select route_slug from expected_routes)
group by r.slug
having min(rl.sequence_index) <> 1
   or max(rl.sequence_index) <> count(*)
   or count(distinct rl.sequence_index) <> count(*)
order by r.slug;

-- 3) Route location rows missing active route_stations content row
with expected_routes as (
  select unnest(array['short', 'medium', 'long']) as route_slug
)
select
  r.slug as route_slug,
  rl.sequence_index,
  l.slug as location_slug
from public.routes r
join public.route_locations rl
  on rl.route_id = r.id
join public.locations l
  on l.id = rl.location_id
left join public.route_stations rs
  on rs.route_id = rl.route_id
 and rs.location_id = rl.location_id
 and rs.is_active = true
where r.slug in (select route_slug from expected_routes)
  and rs.id is null
order by r.slug, rl.sequence_index;
