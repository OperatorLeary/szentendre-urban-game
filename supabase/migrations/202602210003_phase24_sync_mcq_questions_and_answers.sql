-- Phase 24: Sync route-station MCQ question/answer content from long-route canonical keys.
-- Fixes mismatched question vs instruction content (for example short/fo-ter).
--
-- Canonical source:
-- 1) long route sequence mapping (location identity by long sequence)
-- 2) Hungarian instruction blocks already seeded in route_stations.instruction_full_hu
-- 3) explicit answer key (helyesvalaszok)
--
-- Effect:
-- - Builds a compact question block: "question + options" from instruction_full_hu.
-- - Writes that block into question_prompt_hu (and question_prompt for consistency).
-- - Writes deterministic expected_answer/expected_answers from answer key.
-- - Applies to every active route_stations row sharing the same location_id.

with answer_key as (
  select *
  from (
    values
      (1,  't', '4 kődudort'),
      (2,  'u', 'bükkös'),
      (3,  'k', 'sárga és kék'),
      (4,  'z', 'jobbra'),
      (5,  't', 'napóra'),
      (6,  'e', 'fúvós és billentyűs'),
      (7,  'f', 'egy hajó'),
      (8,  'a', 'egy szőlőfürt'),
      (9,  'n', 'ikonfestőknek'),
      (10, 'a', 'négy'),
      (11, 'v', 'majdnem négyszer'),
      (12, 'i', 'bika'),
      (13, 'c', 'bárány'),
      (14, 's', 'kiállítások'),
      (15, 'k', '1734'),
      (16, 'i', 'akantusz levelek'),
      (17, 'r', 'két összeragadt villához'),
      (18, 'i', '9'),
      (19, 'd', 'vörös'),
      (20, 'z', 'x'),
      (21, 's', 'németül'),
      (22, 'i', 'apor'),
      (23, 'c', '1808 sk'),
      (24, 's', 'tüzértiszt, alezredes, tanodaigazgató')
  ) as x(sequence_index, correct_letter, correct_text)
),
long_route as (
  select id
  from public.routes
  where slug = 'long'
  limit 1
),
long_route_station_source as (
  select
    rl.sequence_index,
    rl.location_id,
    rs.instruction_full_hu,
    ak.correct_letter,
    ak.correct_text
  from public.route_locations rl
  join long_route lr
    on lr.id = rl.route_id
  join public.route_stations rs
    on rs.route_id = rl.route_id
   and rs.location_id = rl.location_id
   and rs.is_active = true
  join answer_key ak
    on ak.sequence_index = rl.sequence_index
),
parsed_content as (
  select
    src.sequence_index,
    src.location_id,
    nullif(
      trim(
        (
          regexp_match(
            src.instruction_full_hu,
            '(?is)feladat:\s*(?:\d+\.\s*)?([^\r\n?]+\?)'
          )
        )[1]
      ),
      ''
    ) as parsed_question,
    (
      select string_agg(
        format(
          '%s) %s',
          lower(trim(option_match[1])),
          trim(option_match[2])
        ),
        E'\n'
        order by option_row.ordinality
      )
      from regexp_matches(
        src.instruction_full_hu,
        '(?im)^\s*([a-z])\)\s*([^\r\n]+)\s*$',
        'g'
      ) with ordinality as option_row(option_match, ordinality)
    ) as parsed_options_block,
    lower(trim(src.correct_letter)) as correct_letter_normalized,
    lower(trim(src.correct_text)) as correct_text_normalized
  from long_route_station_source src
),
canonical_content as (
  select
    pc.location_id,
    case
      when pc.parsed_question is not null
       and pc.parsed_options_block is not null
        then concat(pc.parsed_question, E'\n', pc.parsed_options_block)
      else pc.parsed_question
    end as question_block_hu,
    pc.correct_letter_normalized,
    pc.correct_text_normalized,
    (
      select array_agg(distinct answer_value)
      from unnest(
        array[
          pc.correct_letter_normalized,
          pc.correct_text_normalized,
          translate(
            pc.correct_text_normalized,
            'áéíóöőúüű',
            'aeiooouuu'
          )
        ]::text[]
      ) as raw_answers(answer_value)
      where answer_value is not null
        and char_length(trim(answer_value)) > 0
    ) as accepted_answers
  from parsed_content pc
  where pc.parsed_question is not null
),
updated as (
  update public.route_stations rs
  set
    question_prompt_hu = cc.question_block_hu,
    question_prompt = cc.question_block_hu,
    expected_answer = cc.correct_letter_normalized,
    expected_answers = cc.accepted_answers,
    updated_at = now()
  from canonical_content cc
  where rs.location_id = cc.location_id
    and rs.is_active = true
  returning rs.id
)
select count(*) as updated_route_stations_count
from updated;
