-- Phase 23: Device-bound runtime RLS hardening
-- Restricts run/checkin/bug-report access to the caller's device context
-- using x-device-id request header.

create or replace function public.request_device_id()
returns text
language sql
stable
as $$
  select nullif(
    trim(
      coalesce(
        nullif(current_setting('request.headers', true), '')::jsonb ->> 'x-device-id',
        ''
      )
    ),
    ''
  );
$$;

comment on function public.request_device_id() is
  'Returns x-device-id from request headers for device-scoped runtime RLS.';

drop policy if exists "runs_insert_public" on public.runs;
create policy "runs_insert_public"
on public.runs
for insert
to anon, authenticated
with check (
  public.request_device_id() is not null
  and device_id = public.request_device_id()
  and char_length(trim(device_id)) >= 8
);

drop policy if exists "runs_select_public" on public.runs;
create policy "runs_select_public"
on public.runs
for select
to anon, authenticated
using (
  public.request_device_id() is not null
  and device_id = public.request_device_id()
);

drop policy if exists "runs_update_public" on public.runs;
create policy "runs_update_public"
on public.runs
for update
to anon, authenticated
using (
  public.request_device_id() is not null
  and device_id = public.request_device_id()
)
with check (
  public.request_device_id() is not null
  and device_id = public.request_device_id()
);

drop policy if exists "checkins_insert_public" on public.checkins;
create policy "checkins_insert_public"
on public.checkins
for insert
to anon, authenticated
with check (
  public.request_device_id() is not null
  and exists (
    select 1
    from public.runs r
    where r.id = checkins.run_id
      and r.device_id = public.request_device_id()
      and r.route_id = checkins.route_id
      and r.status = 'active'
  )
  and exists (
    select 1
    from public.route_locations rl
    where rl.route_id = checkins.route_id
      and rl.location_id = checkins.location_id
      and rl.sequence_index = checkins.sequence_index
  )
);

drop policy if exists "checkins_select_public" on public.checkins;
create policy "checkins_select_public"
on public.checkins
for select
to anon, authenticated
using (
  public.request_device_id() is not null
  and exists (
    select 1
    from public.runs r
    where r.id = checkins.run_id
      and r.device_id = public.request_device_id()
  )
);

drop policy if exists "bug_reports_insert_public" on public.bug_reports;
create policy "bug_reports_insert_public"
on public.bug_reports
for insert
to anon, authenticated
with check (
  public.request_device_id() is not null
  and (
    bug_reports.run_id is null
    or exists (
      select 1
      from public.runs r
      where r.id = bug_reports.run_id
        and r.device_id = public.request_device_id()
    )
  )
);

drop policy if exists "bug_reports_select_public" on public.bug_reports;
create policy "bug_reports_select_public"
on public.bug_reports
for select
to anon, authenticated
using (
  public.request_device_id() is not null
  and bug_reports.run_id is not null
  and exists (
    select 1
    from public.runs r
    where r.id = bug_reports.run_id
      and r.device_id = public.request_device_id()
  )
);
