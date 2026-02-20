-- Phase 20: Route-specific station content model
-- Moves per-route prompts/instructions/answers into dedicated route_stations rows.
-- This allows the same physical location to have different content on different routes.

create table if not exists public.route_stations (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null,
  location_id uuid not null,
  question_prompt text null,
  question_prompt_hu text null,
  instruction_brief text null,
  instruction_brief_hu text null,
  instruction_full text null,
  instruction_full_hu text null,
  expected_answer text null,
  expected_answers text[] null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint route_stations_route_location_uq unique (route_id, location_id),
  constraint route_stations_route_location_fkey
    foreign key (route_id, location_id)
    references public.route_locations(route_id, location_id)
    on delete cascade,
  constraint route_stations_question_prompt_length_chk check (
    question_prompt is null
    or char_length(trim(question_prompt)) between 5 and 500
  ),
  constraint route_stations_question_prompt_hu_length_chk check (
    question_prompt_hu is null
    or char_length(trim(question_prompt_hu)) between 5 and 500
  ),
  constraint route_stations_instruction_brief_length_chk check (
    instruction_brief is null
    or char_length(trim(instruction_brief)) between 5 and 2000
  ),
  constraint route_stations_instruction_brief_hu_length_chk check (
    instruction_brief_hu is null
    or char_length(trim(instruction_brief_hu)) between 5 and 2000
  ),
  constraint route_stations_instruction_full_length_chk check (
    instruction_full is null
    or char_length(trim(instruction_full)) between 10 and 20000
  ),
  constraint route_stations_instruction_full_hu_length_chk check (
    instruction_full_hu is null
    or char_length(trim(instruction_full_hu)) between 10 and 20000
  ),
  constraint route_stations_expected_answer_length_chk check (
    expected_answer is null
    or char_length(trim(expected_answer)) between 1 and 300
  ),
  constraint route_stations_expected_answers_nonempty_chk check (
    expected_answers is null
    or cardinality(expected_answers) > 0
  )
);

create index if not exists idx_route_stations_route_id
  on public.route_stations (route_id);
create index if not exists idx_route_stations_location_id
  on public.route_stations (location_id);

drop trigger if exists trg_route_stations_set_updated_at on public.route_stations;
create trigger trg_route_stations_set_updated_at
before update on public.route_stations
for each row
execute function public.set_updated_at();

comment on table public.route_stations is
  'Route-specific station content (question/instruction/answers).';
comment on column public.route_stations.expected_answers is
  'Route-specific accepted answers list. Falls back to locations.expected_answers/expected_answer when null.';

-- Backfill route-specific content from current locations content.
-- If a route_station row already exists, only missing fields are filled.
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
  rl.route_id,
  rl.location_id,
  nullif(trim(l.question_prompt), '') as question_prompt,
  nullif(trim(l.question_prompt_hu), '') as question_prompt_hu,
  nullif(trim(l.instruction_brief), '') as instruction_brief,
  nullif(trim(l.instruction_brief_hu), '') as instruction_brief_hu,
  nullif(trim(l.instruction_full), '') as instruction_full,
  nullif(trim(l.instruction_full_hu), '') as instruction_full_hu,
  nullif(trim(l.expected_answer), '') as expected_answer,
  case
    when l.expected_answers is not null and cardinality(l.expected_answers) > 0 then l.expected_answers
    when nullif(trim(l.expected_answer), '') is not null then array[l.expected_answer]
    else null
  end as expected_answers,
  true as is_active
from public.route_locations rl
join public.locations l
  on l.id = rl.location_id
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
  is_active = route_stations.is_active,
  updated_at = now();

alter table public.route_stations enable row level security;

drop policy if exists "route_stations_read_active" on public.route_stations;
create policy "route_stations_read_active"
on public.route_stations
for select
to anon, authenticated
using (
  is_active = true
  and exists (
    select 1
    from public.routes r
    join public.locations l
      on l.id = route_stations.location_id
    where r.id = route_stations.route_id
      and r.is_active = true
      and l.is_active = true
  )
);
