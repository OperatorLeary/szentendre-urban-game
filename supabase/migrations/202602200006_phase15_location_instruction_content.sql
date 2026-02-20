-- Phase 15: Layered station instruction content
-- Adds short and long instruction fields (HU + default) for text-first navigation UX.

alter table public.locations
add column if not exists instruction_brief text null,
add column if not exists instruction_brief_hu text null,
add column if not exists instruction_full text null,
add column if not exists instruction_full_hu text null;

comment on column public.locations.instruction_brief is
  'Short navigation hint (default language). Used as always-visible instruction text.';
comment on column public.locations.instruction_brief_hu is
  'Short navigation hint in Hungarian. Falls back to instruction_brief if null.';
comment on column public.locations.instruction_full is
  'Detailed station instruction/background text (default language).';
comment on column public.locations.instruction_full_hu is
  'Detailed station instruction/background text in Hungarian.';

-- Normalize accidental empty strings to NULL.
update public.locations
set
  instruction_brief = nullif(trim(instruction_brief), ''),
  instruction_brief_hu = nullif(trim(instruction_brief_hu), ''),
  instruction_full = nullif(trim(instruction_full), ''),
  instruction_full_hu = nullif(trim(instruction_full_hu), '');

-- Backfill short hints from existing content for immediate usability.
update public.locations
set instruction_brief = coalesce(
  instruction_brief,
  nullif(trim(description), ''),
  question_prompt
);

update public.locations
set instruction_brief_hu = coalesce(
  instruction_brief_hu,
  nullif(trim(question_prompt_hu), ''),
  instruction_brief
);

alter table public.locations
drop constraint if exists locations_instruction_brief_length_chk;

alter table public.locations
add constraint locations_instruction_brief_length_chk
check (
  instruction_brief is null
  or char_length(trim(instruction_brief)) between 5 and 2000
);

alter table public.locations
drop constraint if exists locations_instruction_brief_hu_length_chk;

alter table public.locations
add constraint locations_instruction_brief_hu_length_chk
check (
  instruction_brief_hu is null
  or char_length(trim(instruction_brief_hu)) between 5 and 2000
);

alter table public.locations
drop constraint if exists locations_instruction_full_length_chk;

alter table public.locations
add constraint locations_instruction_full_length_chk
check (
  instruction_full is null
  or char_length(trim(instruction_full)) between 10 and 20000
);

alter table public.locations
drop constraint if exists locations_instruction_full_hu_length_chk;

alter table public.locations
add constraint locations_instruction_full_hu_length_chk
check (
  instruction_full_hu is null
  or char_length(trim(instruction_full_hu)) between 10 and 20000
);
