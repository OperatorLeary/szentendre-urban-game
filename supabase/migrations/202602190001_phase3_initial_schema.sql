-- Phase 3: Database schema and RLS for Szentendre City Quest
-- Postgres target: Supabase

create extension if not exists pgcrypto;

-- Enums
do $$
begin
  if not exists (select 1 from pg_type where typname = 'run_status') then
    create type public.run_status as enum ('active', 'completed', 'abandoned');
  end if;

  if not exists (select 1 from pg_type where typname = 'validation_type') then
    create type public.validation_type as enum ('gps', 'qr_override');
  end if;
end
$$;

-- Updated_at trigger helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- routes
create table if not exists public.routes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint routes_slug_format_chk check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint routes_name_nonempty_chk check (char_length(trim(name)) >= 2)
);

drop trigger if exists trg_routes_set_updated_at on public.routes;
create trigger trg_routes_set_updated_at
before update on public.routes
for each row
execute function public.set_updated_at();

-- locations
create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text null,
  latitude double precision not null,
  longitude double precision not null,
  radius_m integer not null default 40,
  qr_code_value text not null,
  question_prompt text not null,
  expected_answer text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint locations_slug_format_chk check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint locations_name_nonempty_chk check (char_length(trim(name)) >= 2),
  constraint locations_latitude_chk check (latitude between -90 and 90),
  constraint locations_longitude_chk check (longitude between -180 and 180),
  constraint locations_radius_m_chk check (radius_m between 5 and 500)
);

create index if not exists idx_locations_slug on public.locations (slug);

drop trigger if exists trg_locations_set_updated_at on public.locations;
create trigger trg_locations_set_updated_at
before update on public.locations
for each row
execute function public.set_updated_at();

-- route_locations
create table if not exists public.route_locations (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references public.routes(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete restrict,
  sequence_index integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint route_locations_sequence_positive_chk check (sequence_index > 0),
  constraint route_locations_route_sequence_uq unique (route_id, sequence_index),
  constraint route_locations_route_location_uq unique (route_id, location_id)
);

create index if not exists idx_route_locations_route_id
  on public.route_locations (route_id);
create index if not exists idx_route_locations_location_id
  on public.route_locations (location_id);

drop trigger if exists trg_route_locations_set_updated_at on public.route_locations;
create trigger trg_route_locations_set_updated_at
before update on public.route_locations
for each row
execute function public.set_updated_at();

-- runs
create table if not exists public.runs (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references public.routes(id) on delete restrict,
  device_id text not null,
  player_alias text not null,
  start_location_id uuid null references public.locations(id) on delete set null,
  current_sequence_index integer not null default 1,
  status public.run_status not null default 'active',
  started_at timestamptz not null default now(),
  completed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint runs_device_id_nonempty_chk check (char_length(trim(device_id)) >= 8),
  constraint runs_player_alias_length_chk check (
    char_length(trim(player_alias)) between 2 and 40
  ),
  constraint runs_current_sequence_positive_chk check (current_sequence_index > 0),
  constraint runs_completed_at_consistency_chk check (
    (status = 'completed' and completed_at is not null) or
    (status <> 'completed')
  )
);

create unique index if not exists uq_runs_active_per_device
  on public.runs (device_id)
  where status = 'active';

create index if not exists idx_runs_route_id on public.runs (route_id);

drop trigger if exists trg_runs_set_updated_at on public.runs;
create trigger trg_runs_set_updated_at
before update on public.runs
for each row
execute function public.set_updated_at();

-- checkins
create table if not exists public.checkins (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.runs(id) on delete cascade,
  route_id uuid not null references public.routes(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete restrict,
  sequence_index integer not null,
  validation_type public.validation_type not null,
  validated_at timestamptz not null default now(),
  gps_lat double precision null,
  gps_lng double precision null,
  detected_distance_m double precision null,
  scanned_qr_token text null,
  answer_text text null,
  is_answer_correct boolean null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint checkins_sequence_positive_chk check (sequence_index > 0),
  constraint checkins_run_location_uq unique (run_id, location_id),
  constraint checkins_gps_lat_chk check (gps_lat is null or gps_lat between -90 and 90),
  constraint checkins_gps_lng_chk check (gps_lng is null or gps_lng between -180 and 180),
  constraint checkins_detected_distance_chk check (
    detected_distance_m is null or detected_distance_m >= 0
  ),
  constraint checkins_validation_data_chk check (
    (validation_type = 'gps' and detected_distance_m is not null and scanned_qr_token is null) or
    (validation_type = 'qr_override' and scanned_qr_token is not null and detected_distance_m is null)
  )
);

create index if not exists idx_checkins_run_id on public.checkins (run_id);
create index if not exists idx_checkins_route_id on public.checkins (route_id);
create index if not exists idx_checkins_location_id on public.checkins (location_id);

drop trigger if exists trg_checkins_set_updated_at on public.checkins;
create trigger trg_checkins_set_updated_at
before update on public.checkins
for each row
execute function public.set_updated_at();

-- bug_reports
create table if not exists public.bug_reports (
  id uuid primary key default gen_random_uuid(),
  run_id uuid null references public.runs(id) on delete set null,
  location_id uuid null references public.locations(id) on delete set null,
  gps_lat double precision null,
  gps_lng double precision null,
  detected_distance_m double precision null,
  device_info text not null,
  description text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bug_reports_gps_lat_chk check (gps_lat is null or gps_lat between -90 and 90),
  constraint bug_reports_gps_lng_chk check (gps_lng is null or gps_lng between -180 and 180),
  constraint bug_reports_detected_distance_chk check (
    detected_distance_m is null or detected_distance_m >= 0
  ),
  constraint bug_reports_device_info_nonempty_chk check (
    char_length(trim(device_info)) >= 3
  ),
  constraint bug_reports_description_length_chk check (
    char_length(trim(description)) between 10 and 3000
  )
);

create index if not exists idx_bug_reports_run_id on public.bug_reports (run_id);
create index if not exists idx_bug_reports_location_id on public.bug_reports (location_id);

drop trigger if exists trg_bug_reports_set_updated_at on public.bug_reports;
create trigger trg_bug_reports_set_updated_at
before update on public.bug_reports
for each row
execute function public.set_updated_at();

-- RLS
alter table public.routes enable row level security;
alter table public.locations enable row level security;
alter table public.route_locations enable row level security;
alter table public.runs enable row level security;
alter table public.checkins enable row level security;
alter table public.bug_reports enable row level security;

-- Read-only public catalog access
drop policy if exists "routes_read_active" on public.routes;
create policy "routes_read_active"
on public.routes
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "locations_read_active" on public.locations;
create policy "locations_read_active"
on public.locations
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "route_locations_read_active" on public.route_locations;
create policy "route_locations_read_active"
on public.route_locations
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.routes r
    join public.locations l on l.id = route_locations.location_id
    where r.id = route_locations.route_id
      and r.is_active = true
      and l.is_active = true
  )
);

-- Runtime write access for quest clients (anon/app users)
drop policy if exists "runs_insert_public" on public.runs;
create policy "runs_insert_public"
on public.runs
for insert
to anon, authenticated
with check (true);

drop policy if exists "runs_select_public" on public.runs;
create policy "runs_select_public"
on public.runs
for select
to anon, authenticated
using (true);

drop policy if exists "runs_update_public" on public.runs;
create policy "runs_update_public"
on public.runs
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "checkins_insert_public" on public.checkins;
create policy "checkins_insert_public"
on public.checkins
for insert
to anon, authenticated
with check (true);

drop policy if exists "checkins_select_public" on public.checkins;
create policy "checkins_select_public"
on public.checkins
for select
to anon, authenticated
using (true);

drop policy if exists "bug_reports_insert_public" on public.bug_reports;
create policy "bug_reports_insert_public"
on public.bug_reports
for insert
to anon, authenticated
with check (true);

drop policy if exists "bug_reports_select_public" on public.bug_reports;
create policy "bug_reports_select_public"
on public.bug_reports
for select
to anon, authenticated
using (true);
