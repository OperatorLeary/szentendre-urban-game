-- Phase 8: Bilingual answer support for location questions
-- Adds multi-answer acceptance while keeping backward compatibility with expected_answer.

alter table public.locations
add column if not exists expected_answers text[] null;

comment on column public.locations.expected_answers is
  'Accepted answers list. Application normalizes user input and matches against any value.';

-- Backfill from the existing single-answer column when empty/missing.
update public.locations
set expected_answers = array[expected_answer]
where expected_answers is null
   or cardinality(expected_answers) = 0;

-- Normalize and de-duplicate all answer options.
with normalized as (
  select
    l.id,
    coalesce(
      array_agg(distinct lower(trim(candidate_answer)))
        filter (where char_length(trim(candidate_answer)) between 1 and 300),
      array[lower(trim(l.expected_answer))]
    ) as normalized_answers
  from public.locations l
  left join lateral unnest(coalesce(l.expected_answers, array[]::text[])) as answer_item(candidate_answer)
    on true
  group by l.id, l.expected_answer
)
update public.locations as l
set expected_answers = normalized.normalized_answers
from normalized
where l.id = normalized.id;

-- Seed bilingual accepted answers for current baseline stations.
update public.locations
set expected_answers = array['yellow', 'sarga']
where slug = 'fo-ter';

update public.locations
set expected_answers = array['three', 'harom']
where slug = 'muveszetmalom';

update public.locations
set expected_answers = array['danube', 'duna']
where slug = 'duna-korzo';

update public.locations
set expected_answers = array['marzipan', 'marcipan']
where slug = 'szamos-marzipan';

update public.locations
set expected_answers = array['green', 'zold']
where slug = 'blagovestenszka';

-- Keep expected_answer aligned with the first accepted answer for legacy readers.
update public.locations
set expected_answer = expected_answers[1]
where expected_answers is not null
  and cardinality(expected_answers) > 0;

alter table public.locations
drop constraint if exists locations_expected_answers_nonempty_chk;

alter table public.locations
add constraint locations_expected_answers_nonempty_chk
check (
  expected_answers is null
  or cardinality(expected_answers) > 0
);
