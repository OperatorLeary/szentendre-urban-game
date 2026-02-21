-- Phase 26: Seed English navigation instructions for all 24 canonical stations.
-- Goal: English UI shows English instruction brief/full text on every station.
--
-- Strategy:
-- 1) map long route sequence_index -> location_id
-- 2) provide canonical English instruction_brief + instruction_full per sequence
-- 3) update both base locations and all active route_stations sharing the location_id

with english_instruction_seed as (
  select *
  from (
    values
      (
        1,
        $$From the school, walk right along Route 11 toward the Roman Lapidarium.$$,
        $$Roman Lapidarium station:
Walk right from the school along Route 11 until you reach the Roman stone collection.

Background:
This area preserves remains connected to the Roman Ulcisia Castra settlement.

What to do:
Look closely at the sarcophagus and identify the carved top detail before answering.$$ 
      ),
      (
        2,
        $$From the Lapidarium, go up the stairs and continue via Paprika Biro Street to the stream.$$,
        $$Stream crossing station:
Walk down to the stream and cross the nearby bridge toward the outpatient clinic.

Background:
Paprika Biro Street is named after an 18th-century city judge.

What to do:
Identify the stream name and inspect the bridge details.$$ 
      ),
      (
        3,
        $$Head to the City Hall area on Fo ter and check the flag.$$,
        $$City Hall station:
Continue toward the historic center and stop by City Hall.

Background:
The building has baroque origins and reached its current form in the 20th century.

What to do:
Observe the city flag colors and answer based on what you see.$$ 
      ),
      (
        4,
        $$Find the old preserved house, then climb Varlepcso to the Hild Janos plaque.$$,
        $$Varlepcso and Hild plaque station:
From the historic house, take the stairs up and locate the Hild Janos memorial plaque.

What to do:
Near the plaque, find the built-in Roman carved stone and determine its position.$$ 
      ),
      (
        5,
        $$On Templomdomb, find the church tower clock and another timekeeping device nearby.$$,
        $$Templomdomb station:
Climb to Templomdomb and inspect the church exterior near the entrance.

Background:
The parish church has medieval roots and later baroque transformation.

What to do:
Besides the tower clock, identify the second timekeeping instrument.$$ 
      ),
      (
        6,
        $$Go down behind the church toward the Belgrad Cathedral.$$,
        $$Belgrad Cathedral station:
From Templomdomb, descend toward the northern Serbian Orthodox cathedral.

Background:
Its history is tied to the Serbian settlement period around the end of the 17th century.

What to do:
Follow the nearby memorial clue and identify the instrument mentioned in the question.$$ 
      ),
      (
        7,
        $$Continue through the narrow streets and find the Saint Nicholas facade fresco.$$,
        $$Saint Nicholas fresco station:
Pass through the side streets and locate the house with the Saint Nicholas depiction.

What to do:
Inspect the composition around Saint Nicholas and identify what appears at his feet.$$ 
      ),
      (
        8,
        $$Turn into Gozhajo Street, then left to Rab Raby Square and inspect the gate.$$,
        $$Rab Raby Square station:
Reach Rab Raby Square and focus on the baroque house details.

Background:
The square is associated with Rab Raby Matyas, known from Hungarian literature.

What to do:
Examine the gate keystone symbol and answer accordingly.$$ 
      ),
      (
        9,
        $$Follow Bartok Bela Street toward Szamar-hegy and find the wall plaque.$$,
        $$Szamar-hegy lower station:
Walk uphill and locate the memorial plaque mounted high on the wall.

What to do:
Read the clue context and identify who is commemorated.$$ 
      ),
      (
        10,
        $$Continue to Tobakosok Cross and inspect the Preobrazsenszka tower.$$,
        $$Tobakosok Cross station:
From the viewpoint area, look at the church tower side facing your direction.

What to do:
Count the vertically aligned window openings on that side.$$ 
      ),
      (
        11,
        $$At the Y junction take the right branch downhill to the Winegrowers Cross.$$,
        $$Szent Orban Cross station:
Reach the historic cross linked to local vineyard traditions.

What to do:
Observe the vine ornament around the column and estimate how many turns it makes.$$ 
      ),
      (
        12,
        $$Walk via Ady Endre Street toward the park and enter the sculpture area.$$,
        $$Sculpture Park station:
Find the sculpture commonly known as the Europa abduction motif.

What to do:
Use the mythological clue to identify the form taken by Zeus.$$ 
      ),
      (
        13,
        $$Move toward the Preobrazsenszka square and the decorative fountain.$$,
        $$Decorative fountain station:
Locate the fountain in front of the church and inspect the heraldic motif.

What to do:
Identify the city coat-of-arms animal represented there.$$ 
      ),
      (
        14,
        $$Continue to the MuveszetMalom cultural center.$$,
        $$MuveszetMalom station:
Follow the street until the route joins again and you reach the former mill complex.

What to do:
Determine the current use of the building.$$ 
      ),
      (
        15,
        $$Stay on Bogdanyi Street and find the Barczy inn building.$$,
        $$Barczy inn station:
Locate the historic inn facade and inspect its founding year details.

What to do:
Choose the correct founding year from the options.$$ 
      ),
      (
        16,
        $$At Lazar Car Square, find the memorial column and cross.$$,
        $$Lazar Car memorial station:
Examine the column capital at the corner memorial.

What to do:
Identify the decorative motif on the capital.$$ 
      ),
      (
        17,
        $$Go to the Danube embankment and look downstream for the white sculpture.$$,
        $$Greeting sculpture station:
Find the large riverside sculpture and inspect its silhouette.

What to do:
Pick the option that best matches what the form resembles.$$ 
      ),
      (
        18,
        $$Enter Fo ter from the Greek Street side and find the plague cross.$$,
        $$Plague cross station:
At the triangular-base cross, examine the apostle figures on all sides.

What to do:
Count the visible apostle representations in total.$$ 
      ),
      (
        19,
        $$Find the small square near Torok koz and inspect the side gate of Peter-Paul church.$$,
        $$Peter-Paul church side gate station:
Locate the marble side gate opening onto the small square.

What to do:
Identify the marble color of that gate.$$ 
      ),
      (
        20,
        $$Walk along Kor Street and look for the Saint Andrew fresco above a gateway.$$,
        $$Saint Andrew fresco station:
Inspect the diagonal cross behind Saint Andrew in the fresco scene.

What to do:
Decide which letter shape that cross forms.$$ 
      ),
      (
        21,
        $$On Kor Street, locate the historic flood-level marker on a house wall.$$,
        $$Flood marker station:
Find the old high-water inscription marker.

What to do:
Identify the language of the inscription, then note the additional flood clues.$$ 
      ),
      (
        22,
        $$Continue to Bukkos stream, cross the bridge, and find the memorial plaque.$$,
        $$Bukkos stream plaque station:
Locate the plaque near the stream crossing.

What to do:
Use the inscription clue to identify the stream's historical name.$$ 
      ),
      (
        23,
        $$Between the two churches, inspect the basket-arch gateway keystone.$$,
        $$Basket-arch gate station:
Find the carved keystone marking on the old gateway.

What to do:
Read the carved code and select the exact inscription.$$ 
      ),
      (
        24,
        $$Return to the school and answer the final question from the memorial plaque.$$,
        $$Final station:
At the school wall plaque, gather the final clue and complete the route.

What to do:
Identify who Jozsef Petzelt was based on the options.

Optional finale:
If you combine the answer letters, you reveal the name of a well-known Serbian scholar.$$ 
      )
  ) as x(sequence_index, instruction_brief_en, instruction_full_en)
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
canonical_en_instruction as (
  select
    lrl.location_id,
    eis.instruction_brief_en,
    eis.instruction_full_en
  from long_route_locations lrl
  join english_instruction_seed eis
    on eis.sequence_index = lrl.sequence_index
),
updated_locations as (
  update public.locations l
  set
    instruction_brief = cei.instruction_brief_en,
    instruction_full = cei.instruction_full_en,
    updated_at = now()
  from canonical_en_instruction cei
  where l.id = cei.location_id
  returning l.id
),
updated_route_stations as (
  update public.route_stations rs
  set
    instruction_brief = cei.instruction_brief_en,
    instruction_full = cei.instruction_full_en,
    updated_at = now()
  from canonical_en_instruction cei
  where rs.location_id = cei.location_id
    and rs.is_active = true
  returning rs.id
)
select
  (select count(*) from updated_locations) as updated_locations_count,
  (select count(*) from updated_route_stations) as updated_route_stations_count;
