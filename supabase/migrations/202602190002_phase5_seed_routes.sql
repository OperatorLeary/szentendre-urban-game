-- Phase 5 seed data for Szentendre City Quest
-- Safe to run multiple times (idempotent upserts)

insert into public.routes (slug, name, description, is_active)
values
  ('short', 'Short Route', 'Compact route for quick exploration.', true),
  ('medium', 'Medium Route', 'Balanced route across key landmarks.', true),
  ('long', 'Long Route', 'Full city quest route with all checkpoints.', true)
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  is_active = excluded.is_active,
  updated_at = now();

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
values
  (
    'fo-ter',
    'Fo ter',
    'Historic town square.',
    47.6698,
    19.0742,
    40,
    '/r/short/l/fo-ter',
    'What is the main color of the city hall facade?',
    'yellow',
    true
  ),
  (
    'muveszetmalom',
    'MuveszetMalom',
    'Art mill cultural venue.',
    47.6686,
    19.0775,
    40,
    '/r/short/l/muveszetmalom',
    'How many floors are visible from the main entrance?',
    'three',
    true
  ),
  (
    'duna-korzo',
    'Duna Korzo',
    'Danube riverside promenade.',
    47.6707,
    19.0806,
    40,
    '/r/short/l/duna-korzo',
    'Which river are you standing next to?',
    'danube',
    true
  ),
  (
    'szamos-marzipan',
    'Szamos Marzipan',
    'Museum and confectionery stop.',
    47.6676,
    19.0758,
    40,
    '/r/medium/l/szamos-marzipan',
    'What sweet ingredient is this museum known for?',
    'marzipan',
    true
  ),
  (
    'blagovestenszka',
    'Blagovestenszka Church',
    'Orthodox church landmark.',
    47.6692,
    19.0787,
    40,
    '/r/long/l/blagovestenszka',
    'What is the dominant roof color?',
    'green',
    true
  )
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  radius_m = excluded.radius_m,
  qr_code_value = excluded.qr_code_value,
  question_prompt = excluded.question_prompt,
  expected_answer = excluded.expected_answer,
  is_active = excluded.is_active,
  updated_at = now();

with short_route as (
  select id
  from public.routes
  where slug = 'short'
),
medium_route as (
  select id
  from public.routes
  where slug = 'medium'
),
long_route as (
  select id
  from public.routes
  where slug = 'long'
),
fo_ter as (
  select id
  from public.locations
  where slug = 'fo-ter'
),
muveszetmalom as (
  select id
  from public.locations
  where slug = 'muveszetmalom'
),
duna_korzo as (
  select id
  from public.locations
  where slug = 'duna-korzo'
),
szamos_marzipan as (
  select id
  from public.locations
  where slug = 'szamos-marzipan'
),
blagovestenszka as (
  select id
  from public.locations
  where slug = 'blagovestenszka'
)
insert into public.route_locations (route_id, location_id, sequence_index)
select short_route.id, fo_ter.id, 1
from short_route, fo_ter
on conflict (route_id, sequence_index) do update
set
  location_id = excluded.location_id,
  updated_at = now();

with short_route as (
  select id
  from public.routes
  where slug = 'short'
),
muveszetmalom as (
  select id
  from public.locations
  where slug = 'muveszetmalom'
)
insert into public.route_locations (route_id, location_id, sequence_index)
select short_route.id, muveszetmalom.id, 2
from short_route, muveszetmalom
on conflict (route_id, sequence_index) do update
set
  location_id = excluded.location_id,
  updated_at = now();

with short_route as (
  select id
  from public.routes
  where slug = 'short'
),
duna_korzo as (
  select id
  from public.locations
  where slug = 'duna-korzo'
)
insert into public.route_locations (route_id, location_id, sequence_index)
select short_route.id, duna_korzo.id, 3
from short_route, duna_korzo
on conflict (route_id, sequence_index) do update
set
  location_id = excluded.location_id,
  updated_at = now();

with medium_route as (
  select id
  from public.routes
  where slug = 'medium'
),
fo_ter as (
  select id
  from public.locations
  where slug = 'fo-ter'
),
szamos_marzipan as (
  select id
  from public.locations
  where slug = 'szamos-marzipan'
),
duna_korzo as (
  select id
  from public.locations
  where slug = 'duna-korzo'
)
insert into public.route_locations (route_id, location_id, sequence_index)
select medium_route.id, fo_ter.id, 1
from medium_route, fo_ter
on conflict (route_id, sequence_index) do update
set
  location_id = excluded.location_id,
  updated_at = now();

with medium_route as (
  select id
  from public.routes
  where slug = 'medium'
),
szamos_marzipan as (
  select id
  from public.locations
  where slug = 'szamos-marzipan'
)
insert into public.route_locations (route_id, location_id, sequence_index)
select medium_route.id, szamos_marzipan.id, 2
from medium_route, szamos_marzipan
on conflict (route_id, sequence_index) do update
set
  location_id = excluded.location_id,
  updated_at = now();

with medium_route as (
  select id
  from public.routes
  where slug = 'medium'
),
muveszetmalom as (
  select id
  from public.locations
  where slug = 'muveszetmalom'
)
insert into public.route_locations (route_id, location_id, sequence_index)
select medium_route.id, muveszetmalom.id, 3
from medium_route, muveszetmalom
on conflict (route_id, sequence_index) do update
set
  location_id = excluded.location_id,
  updated_at = now();

with medium_route as (
  select id
  from public.routes
  where slug = 'medium'
),
duna_korzo as (
  select id
  from public.locations
  where slug = 'duna-korzo'
)
insert into public.route_locations (route_id, location_id, sequence_index)
select medium_route.id, duna_korzo.id, 4
from medium_route, duna_korzo
on conflict (route_id, sequence_index) do update
set
  location_id = excluded.location_id,
  updated_at = now();

with long_route as (
  select id
  from public.routes
  where slug = 'long'
),
fo_ter as (
  select id
  from public.locations
  where slug = 'fo-ter'
),
szamos_marzipan as (
  select id
  from public.locations
  where slug = 'szamos-marzipan'
),
blagovestenszka as (
  select id
  from public.locations
  where slug = 'blagovestenszka'
),
muveszetmalom as (
  select id
  from public.locations
  where slug = 'muveszetmalom'
),
duna_korzo as (
  select id
  from public.locations
  where slug = 'duna-korzo'
)
insert into public.route_locations (route_id, location_id, sequence_index)
select long_route.id, fo_ter.id, 1
from long_route, fo_ter
on conflict (route_id, sequence_index) do update
set
  location_id = excluded.location_id,
  updated_at = now();

with long_route as (
  select id
  from public.routes
  where slug = 'long'
),
szamos_marzipan as (
  select id
  from public.locations
  where slug = 'szamos-marzipan'
)
insert into public.route_locations (route_id, location_id, sequence_index)
select long_route.id, szamos_marzipan.id, 2
from long_route, szamos_marzipan
on conflict (route_id, sequence_index) do update
set
  location_id = excluded.location_id,
  updated_at = now();

with long_route as (
  select id
  from public.routes
  where slug = 'long'
),
blagovestenszka as (
  select id
  from public.locations
  where slug = 'blagovestenszka'
)
insert into public.route_locations (route_id, location_id, sequence_index)
select long_route.id, blagovestenszka.id, 3
from long_route, blagovestenszka
on conflict (route_id, sequence_index) do update
set
  location_id = excluded.location_id,
  updated_at = now();

with long_route as (
  select id
  from public.routes
  where slug = 'long'
),
muveszetmalom as (
  select id
  from public.locations
  where slug = 'muveszetmalom'
)
insert into public.route_locations (route_id, location_id, sequence_index)
select long_route.id, muveszetmalom.id, 4
from long_route, muveszetmalom
on conflict (route_id, sequence_index) do update
set
  location_id = excluded.location_id,
  updated_at = now();

with long_route as (
  select id
  from public.routes
  where slug = 'long'
),
duna_korzo as (
  select id
  from public.locations
  where slug = 'duna-korzo'
)
insert into public.route_locations (route_id, location_id, sequence_index)
select long_route.id, duna_korzo.id, 5
from long_route, duna_korzo
on conflict (route_id, sequence_index) do update
set
  location_id = excluded.location_id,
  updated_at = now();
