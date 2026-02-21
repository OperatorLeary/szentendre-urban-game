-- Phase 22: Rebalance medium route to a true middle-ground experience
-- Rebuilds "medium" from the first 12 stations of the "long" route.
-- This keeps the station order coherent while removing the 4-station cliff.

with medium_route as (
  select id
  from public.routes
  where slug = 'medium'
  limit 1
),
long_route as (
  select id
  from public.routes
  where slug = 'long'
  limit 1
),
removed_medium_mappings as (
  delete from public.route_locations rl
  using medium_route mr
  where rl.route_id = mr.id
  returning rl.location_id
),
long_segment as (
  select
    row_number() over (order by rl.sequence_index)::integer as medium_sequence_index,
    rl.location_id
  from public.route_locations rl
  join long_route lr
    on lr.id = rl.route_id
  where rl.sequence_index between 1 and 12
),
inserted_medium_mappings as (
  insert into public.route_locations (route_id, location_id, sequence_index)
  select
    mr.id as route_id,
    ls.location_id,
    ls.medium_sequence_index
  from medium_route mr
  join long_segment ls
    on true
  returning route_id, location_id, sequence_index
),
seeded_medium_route_stations as (
  insert into public.route_stations (
    route_id,
    location_id,
    question_prompt,
    question_prompt_hu,
    instruction_brief,
    instruction_brief_hu,
    instruction_full,
    instruction_full_hu,
    expected_answer,
    expected_answers,
    is_active
  )
  select
    mr.id as route_id,
    rl.location_id,
    nullif(trim(coalesce(rs_long.question_prompt, l.question_prompt)), '') as question_prompt,
    nullif(trim(coalesce(rs_long.question_prompt_hu, l.question_prompt_hu)), '') as question_prompt_hu,
    nullif(trim(coalesce(rs_long.instruction_brief, l.instruction_brief)), '') as instruction_brief,
    nullif(trim(coalesce(rs_long.instruction_brief_hu, l.instruction_brief_hu)), '') as instruction_brief_hu,
    nullif(trim(coalesce(rs_long.instruction_full, l.instruction_full)), '') as instruction_full,
    nullif(trim(coalesce(rs_long.instruction_full_hu, l.instruction_full_hu)), '') as instruction_full_hu,
    nullif(trim(coalesce(rs_long.expected_answer, l.expected_answer)), '') as expected_answer,
    coalesce(
      rs_long.expected_answers,
      case
        when l.expected_answers is not null and cardinality(l.expected_answers) > 0
          then l.expected_answers
        when nullif(trim(l.expected_answer), '') is not null
          then array[l.expected_answer]
        else null
      end
    ) as expected_answers,
    true as is_active
  from medium_route mr
  join public.route_locations rl
    on rl.route_id = mr.id
  join public.locations l
    on l.id = rl.location_id
  left join long_route lr
    on true
  left join public.route_stations rs_long
    on rs_long.route_id = lr.id
   and rs_long.location_id = rl.location_id
   and rs_long.is_active = true
  on conflict (route_id, location_id) do update
  set
    question_prompt = coalesce(route_stations.question_prompt, excluded.question_prompt),
    question_prompt_hu = coalesce(route_stations.question_prompt_hu, excluded.question_prompt_hu),
    instruction_brief = coalesce(route_stations.instruction_brief, excluded.instruction_brief),
    instruction_brief_hu = coalesce(route_stations.instruction_brief_hu, excluded.instruction_brief_hu),
    instruction_full = coalesce(route_stations.instruction_full, excluded.instruction_full),
    instruction_full_hu = coalesce(route_stations.instruction_full_hu, excluded.instruction_full_hu),
    expected_answer = coalesce(route_stations.expected_answer, excluded.expected_answer),
    expected_answers = case
      when route_stations.expected_answers is null or cardinality(route_stations.expected_answers) = 0
        then excluded.expected_answers
      else route_stations.expected_answers
    end,
    is_active = true,
    updated_at = now()
  returning location_id
)
select
  (select count(*) from removed_medium_mappings) as removed_old_medium_mappings,
  (select count(*) from inserted_medium_mappings) as inserted_new_medium_mappings,
  (select count(*) from seeded_medium_route_stations) as seeded_medium_route_stations;
