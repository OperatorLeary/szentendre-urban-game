-- Phase 25: English question-block alignment for route_stations + EN detail fallback
-- Goal: when UI language is English, question and options are English too.
--
-- Strategy:
-- 1) map long route sequence -> location_id
-- 2) seed canonical English question + options block
-- 3) update question_prompt (default language field) for locations + all active route_stations rows
--    sharing that location_id (short / medium / long)
-- 4) if instruction_full currently equals instruction_full_hu, clear instruction_full to avoid
--    showing Hungarian detailed text in English UI (HU still uses instruction_full_hu).

with english_question_seed as (
  select *
  from (
    values
      (1, $$What was carved on top of the sarcophagus?
v) six stone knobs
t) four stone knobs
c) one large stone knob$$),
      (2, $$What is the name of this stream?
a) Dera
e) Csele
u) Bukkos$$),
      (3, $$What are the colors of Szentendre's flag?
k) yellow and blue
l) blue and red
m) green and white$$),
      (4, $$From the memorial plaque, where did you find the carved stone?
z) to the right
s) to the left
p) above it$$),
      (5, $$What is this timekeeping device?
n) hourglass
k) water clock
t) sundial$$),
      (6, $$What kind of instrument did Avakum discover?
i) guitar-like
e) wind and keyboard
o) drum$$),
      (7, $$What can be seen at Saint Nicholas's feet?
l) a horse carriage
h) a wine barrel
f) a ship$$),
      (8, $$What symbol is visible on the gate's keystone?
e) a barrel
i) an anchor
a) a bunch of grapes$$),
      (9, $$Whom does the memorial plaque commemorate?
n) icon painters
c) codex copyists
j) textile painters$$),
      (10, $$On the tower side facing you, how many windows are stacked vertically?
o) three
a) four
u) five$$),
      (11, $$How many times does the vine ornament twist around the column?
c) not at all
b) twice
v) almost four times$$),
      (12, $$In what form did Zeus abduct Europa?
i) bull
e) golden river
o) swan$$),
      (13, $$Which animal appears on Szentendre's coat of arms?
a) goat
b) cow
c) lamb$$),
      (14, $$What is in this building today?
a) grain milling
s) exhibitions
x) a crumbling ruin$$),
      (15, $$When was this building founded?
k) 1734
h) 1834
s) 1934$$),
      (16, $$What can be seen on the column capital?
i) acanthus leaves
e) human head
a) twisted pattern$$),
      (17, $$What does this sculpture resemble?
r) two glued-together forks
b) a galloping horse
y) a fish head$$),
      (18, $$How many apostles can you see in total on the cross?
a) 12
e) 8
i) 9
o) 15$$),
      (19, $$What color marble is the side gate opening to the square?
q) green
d) red
c) white$$),
      (20, $$Which letter does Saint Andrew's cross form?
z) X
s) Y
r) T$$),
      (21, $$In which language is the inscription written?
a) Hungarian
f) Serbian
s) German$$),
      (22, $$What was this stream called in Saint Stephen's era?
i) Apor
e) Lehel
a) Bukkoske$$),
      (23, $$What is carved into the keystone?
c) 1808 SK
b) 1908 PK
l) 1708 DP$$),
      (24, $$Who was Jozsef Petzelt?
s) Artillery officer, lieutenant colonel, teacher-training director
b) ship captain
z) goalkeeper of the Red Meteor football team$$)
  ) as x(sequence_index, question_block_en)
),
long_route as (
  select id
  from public.routes
  where slug = 'long'
  limit 1
),
long_route_locations as (
  select
    rl.sequence_index,
    rl.location_id
  from public.route_locations rl
  join long_route lr
    on lr.id = rl.route_id
),
canonical_en_content as (
  select
    lrl.location_id,
    eqs.question_block_en
  from long_route_locations lrl
  join english_question_seed eqs
    on eqs.sequence_index = lrl.sequence_index
),
updated_locations as (
  update public.locations l
  set
    question_prompt = cec.question_block_en,
    updated_at = now()
  from canonical_en_content cec
  where l.id = cec.location_id
  returning l.id
),
updated_questions as (
  update public.route_stations rs
  set
    question_prompt = cec.question_block_en,
    updated_at = now()
  from canonical_en_content cec
  where rs.location_id = cec.location_id
    and rs.is_active = true
  returning rs.id
),
cleared_en_details as (
  update public.route_stations rs
  set
    instruction_full = null,
    updated_at = now()
  where rs.is_active = true
    and rs.instruction_full is not null
    and rs.instruction_full_hu is not null
    and rs.instruction_full = rs.instruction_full_hu
  returning rs.id
),
cleared_location_en_details as (
  update public.locations l
  set
    instruction_full = null,
    updated_at = now()
  where l.instruction_full is not null
    and l.instruction_full_hu is not null
    and l.instruction_full = l.instruction_full_hu
  returning l.id
)
select
  (select count(*) from updated_locations) as updated_location_question_prompt_count,
  (select count(*) from updated_questions) as updated_question_prompt_count,
  (select count(*) from cleared_en_details) as cleared_instruction_full_count,
  (select count(*) from cleared_location_en_details) as cleared_location_instruction_full_count;
