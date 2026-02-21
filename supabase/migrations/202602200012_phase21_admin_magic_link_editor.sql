-- Phase 21: Admin allowlist + RLS for magic-link content editor
-- Adds admin_users table and grants authenticated admins privileged read/write
-- access to route-station content while keeping public runtime policies intact.

create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_users_email_nonempty_chk check (char_length(trim(email)) between 5 and 254),
  constraint admin_users_email_normalized_chk check (email = lower(trim(email))),
  constraint admin_users_email_format_chk check (
    email ~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$'
  )
);

create unique index if not exists uq_admin_users_email_lower
  on public.admin_users (lower(trim(email)));

drop trigger if exists trg_admin_users_set_updated_at on public.admin_users;
create trigger trg_admin_users_set_updated_at
before update on public.admin_users
for each row
execute function public.set_updated_at();

comment on table public.admin_users is
  'Allowlist for authenticated admin emails permitted to edit route_stations content.';

alter table public.admin_users enable row level security;

drop policy if exists "admin_users_select_self" on public.admin_users;
create policy "admin_users_select_self"
on public.admin_users
for select
to authenticated
using (
  is_active = true
  and lower(trim(email)) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

drop policy if exists "routes_admin_read_all" on public.routes;
create policy "routes_admin_read_all"
on public.routes
for select
to authenticated
using (
  exists (
    select 1
    from public.admin_users au
    where au.is_active = true
      and lower(trim(au.email)) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
);

drop policy if exists "locations_admin_read_all" on public.locations;
create policy "locations_admin_read_all"
on public.locations
for select
to authenticated
using (
  exists (
    select 1
    from public.admin_users au
    where au.is_active = true
      and lower(trim(au.email)) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
);

drop policy if exists "route_locations_admin_read_all" on public.route_locations;
create policy "route_locations_admin_read_all"
on public.route_locations
for select
to authenticated
using (
  exists (
    select 1
    from public.admin_users au
    where au.is_active = true
      and lower(trim(au.email)) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
);

drop policy if exists "route_stations_admin_read_all" on public.route_stations;
create policy "route_stations_admin_read_all"
on public.route_stations
for select
to authenticated
using (
  exists (
    select 1
    from public.admin_users au
    where au.is_active = true
      and lower(trim(au.email)) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
);

drop policy if exists "route_stations_admin_insert" on public.route_stations;
create policy "route_stations_admin_insert"
on public.route_stations
for insert
to authenticated
with check (
  exists (
    select 1
    from public.admin_users au
    where au.is_active = true
      and lower(trim(au.email)) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
);

drop policy if exists "route_stations_admin_update" on public.route_stations;
create policy "route_stations_admin_update"
on public.route_stations
for update
to authenticated
using (
  exists (
    select 1
    from public.admin_users au
    where au.is_active = true
      and lower(trim(au.email)) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
)
with check (
  exists (
    select 1
    from public.admin_users au
    where au.is_active = true
      and lower(trim(au.email)) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
);
