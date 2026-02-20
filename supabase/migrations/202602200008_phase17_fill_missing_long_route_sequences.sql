-- Phase 17: Fill missing long-route sequence slots (6..24)
-- Creates placeholder locations for any missing sequence index on route slug "long",
-- then maps them into route_locations so instruction seed scripts can populate all 24 steps.
-- This version only uses base columns from the initial schema for maximum compatibility.

with target_route as (
  select id
  from public.routes
  where slug = 'long'
  limit 1
),
desired_sequences as (
  select generate_series(6, 24) as sequence_index
),
missing_sequences as (
  select ds.sequence_index
  from desired_sequences ds
  cross join target_route tr
  left join public.route_locations rl
    on rl.route_id = tr.id
   and rl.sequence_index = ds.sequence_index
  where rl.id is null
),
seed as (
  select
    ms.sequence_index,
    format('long-auto-%s', lpad(ms.sequence_index::text, 2, '0')) as slug,
    format('Long Route Station %s', ms.sequence_index) as name,
    format(
      'Auto-generated placeholder station for long route sequence %s. Replace with exact station metadata.',
      ms.sequence_index
    ) as description,
    (47.6698 + (ms.sequence_index::double precision * 0.00003)) as latitude,
    (19.0742 + (ms.sequence_index::double precision * 0.00003)) as longitude,
    format('/r/long/l/%s', format('long-auto-%s', lpad(ms.sequence_index::text, 2, '0'))) as qr_code_value,
    format('Station %s task answer', ms.sequence_index) as question_prompt
  from missing_sequences ms
),
upsert_locations as (
  insert into public.locations (
    slug,
    name,
    description,
    latitude,
    longitude,
    radius_m,
    qr_code_value,
    question_prompt,
    expected_answer,
    is_active
  )
  select
    seed.slug,
    seed.name,
    seed.description,
    seed.latitude,
    seed.longitude,
    40,
    seed.qr_code_value,
    seed.question_prompt,
    'a',
    true
  from seed
  on conflict (slug) do update
  set
    is_active = true,
    updated_at = now()
  returning id, slug
),
location_ids as (
  select
    seed.sequence_index,
    l.id as location_id
  from seed
  join public.locations l on l.slug = seed.slug
),
mapped as (
  insert into public.route_locations (route_id, location_id, sequence_index)
  select
    tr.id,
    li.location_id,
    li.sequence_index
  from target_route tr
  join location_ids li on true
  on conflict (route_id, sequence_index) do update
  set
    location_id = excluded.location_id,
    updated_at = now()
  returning sequence_index
)
select
  (select count(*) from missing_sequences) as inserted_missing_sequences,
  (select count(*) from mapped) as mapped_sequences;
