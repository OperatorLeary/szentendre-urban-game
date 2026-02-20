-- Phase 10: Hungarian question prompts for locations
-- Adds dedicated Hungarian question text while keeping question_prompt for legacy/default use.

alter table public.locations
add column if not exists question_prompt_hu text null;

comment on column public.locations.question_prompt_hu is
  'Hungarian localized question prompt for the location. If null, application falls back to question_prompt.';

-- Backfill with the existing prompt for safety.
update public.locations
set question_prompt_hu = question_prompt
where question_prompt_hu is null
   or char_length(trim(question_prompt_hu)) = 0;

-- Seed Hungarian prompts for baseline locations.
update public.locations
set question_prompt_hu = 'Milyen színű a városháza homlokzata?'
where slug = 'fo-ter';

update public.locations
set question_prompt_hu = 'Hány szint látszik a főbejárat felől?'
where slug = 'muveszetmalom';

update public.locations
set question_prompt_hu = 'Melyik folyó partján állsz?'
where slug = 'duna-korzo';

update public.locations
set question_prompt_hu = 'Melyik édességalapanyagról híres ez a múzeum?'
where slug = 'szamos-marzipan';

update public.locations
set question_prompt_hu = 'Milyen szín dominál a tetőn?'
where slug = 'blagovestenszka';

alter table public.locations
drop constraint if exists locations_question_prompt_hu_length_chk;

alter table public.locations
add constraint locations_question_prompt_hu_length_chk
check (
  question_prompt_hu is null
  or char_length(trim(question_prompt_hu)) between 5 and 500
);

