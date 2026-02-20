-- Phase 18: Replace long-auto station placeholders (6..24) with real metadata
-- Updates existing long route station rows in-place so route_locations mapping remains stable.

with station_seed as (
  select *
  from (
    values
      (
        6,
        'belgrad-szekesegyhaz',
        'Belgrad-szekesegyhaz',
        'Szerb ortodox szekesegyhaz es Avakumovics-emlektabla kornyezete.',
        47.6689449::double precision,
        19.0757363::double precision,
        'Milyen hangszert fedezett fel Avakumovics Avakum?',
        'Milyen hangszert fedezett fel Avakumovics Avakum?',
        'e',
        array['e', 'fuvos es billentyus', 'fuvos-billentyus']::text[]
      ),
      (
        7,
        'szent-miklos-fresko',
        'Szent Miklos-fresko',
        'Szent Miklos abrazolasa a haz oromzatan, a Gozhajo utca kornyeken.',
        47.6695374::double precision,
        19.0762572::double precision,
        'Mi lathato Miklos labanal?',
        'Mi lathato Miklos labanal?',
        'f',
        array['f', 'egy hajo']::text[]
      ),
      (
        8,
        'rab-raby-ter',
        'Rab Raby ter',
        'Barokk lakoepulet es zaroko a Rab Raby teren.',
        47.6696053::double precision,
        19.0764080::double precision,
        'Milyen szimbolum lathato a haz kapujanak zarokoven?',
        'Milyen szimbolum lathato a haz kapujanak zarokoven?',
        'a',
        array['a', 'egy szolofurt']::text[]
      ),
      (
        9,
        'szamarhegy-emlektabla',
        'Szamar-hegy emlektabla',
        'Bartok Bela utca, falon lathato emlektabla.',
        47.6702500::double precision,
        19.0769000::double precision,
        'Kinek allit emleket a ket meter magasan lathato emlektabla?',
        'Kinek allit emleket a ket meter magasan lathato emlektabla?',
        'n',
        array['n', 'ikonfestoknek']::text[]
      ),
      (
        10,
        'tobakosok-keresztje',
        'Tobakosok keresztje',
        'Szamar-hegyi panoramapont a Tobakosok keresztjenel.',
        47.6734300::double precision,
        19.0787800::double precision,
        'A Preobrazsenszka templom tornyan hany ablaknyilas van egymas alatt?',
        'A Preobrazsenszka templom tornyan hany ablaknyilas van egymas alatt?',
        'o',
        array['o', 'harom', '3']::text[]
      ),
      (
        11,
        'szolosgazdak-kereszt',
        'Szolosgazdak keresztje',
        'Szent Orban kereszt az Angyal utca aljan.',
        47.6739484::double precision,
        19.0781267::double precision,
        'Hanyszor csavarodik korbe a szoloinda?',
        'Hanyszor csavarodik korbe a szoloinda?',
        'v',
        array['v', 'majdnem negyszer']::text[]
      ),
      (
        12,
        'kerenyi-szoborpark',
        'Kerenyi-szoborpark',
        'Kerenyi Jeno szoborpark, Lopjak Europat szobor.',
        47.6749973::double precision,
        19.0786507::double precision,
        'Minek a kepeben ragadja el Zeusz Europat?',
        'Minek a kepeben ragadja el Zeusz Europat?',
        'i',
        array['i', 'bika']::text[]
      ),
      (
        13,
        'diszkut-agnus-dei',
        'Agnus Dei diszkut',
        'Preobrazsenszka templom elotti ter diszkutja.',
        47.6712900::double precision,
        19.0780000::double precision,
        'Milyen allat Szentendre cimerallata?',
        'Milyen allat Szentendre cimerallata?',
        'c',
        array['c', 'barany']::text[]
      ),
      (
        14,
        'muveszetmalom-long',
        'MuveszetMalom',
        'MuveszetMalom Kepzomuveszeti es Kulturalis Kozpont.',
        47.6702208::double precision,
        19.0772198::double precision,
        'Mi van most az epuletben?',
        'Mi van most az epuletben?',
        's',
        array['s', 'kiallitasok']::text[]
      ),
      (
        15,
        'barczy-fogado',
        'Barczy fogado',
        'Torteneti fogado a Bogdanyi uton.',
        47.6700170::double precision,
        19.0776350::double precision,
        'Mikor alapitottak ezt az epuletet?',
        'Mikor alapitottak ezt az epuletet?',
        'k',
        array['k', '1734']::text[]
      ),
      (
        16,
        'lazar-car-emlekoszlop',
        'Lazar car emlekoszlop',
        'Emlekkereszt a Lazar car ter sarkan.',
        47.6690394::double precision,
        19.0777030::double precision,
        'Mi lathato az oszlopfejezeten?',
        'Mi lathato az oszlopfejezeten?',
        'a',
        array['a', 'csavart minta']::text[]
      ),
      (
        17,
        'koszonto-szobor',
        'Koszonto szobor',
        'Farkas Adam Koszonto cimu szobra a Duna-korzo deli vegen.',
        47.6627892::double precision,
        19.0794821::double precision,
        'Mihez hasonlit szerinted a szobor?',
        'Mihez hasonlit szerinted a szobor?',
        'r',
        array['r', 'ket osszeragadt villahoz']::text[]
      ),
      (
        18,
        'pestis-kereszt',
        'Pestis kereszt',
        'Kesoi rokoko kereszt Szentendre Fo teren.',
        47.6675792::double precision,
        19.0761782::double precision,
        'Osszesen mennyi apostolt latsz a kereszten?',
        'Osszesen mennyi apostolt latsz a kereszten?',
        'a',
        array['a', '12']::text[]
      ),
      (
        19,
        'peter-pal-templom',
        'Peter-Pal templom',
        'Csiprovacska templom oldalkapuja a Kucsera utcaban.',
        47.6668233::double precision,
        19.0758034::double precision,
        'Milyen szinu marvanybol van az oldalkapu?',
        'Milyen szinu marvanybol van az oldalkapu?',
        'd',
        array['d', 'voros']::text[]
      ),
      (
        20,
        'szent-andras-fresko',
        'Szent Andras-fresko',
        'Szent Andras fresko a Kor utcai kapuzat felett.',
        47.6659862::double precision,
        19.0752464::double precision,
        'Milyen betut formaz az andraskereszt?',
        'Milyen betut formaz az andraskereszt?',
        'z',
        array['z', 'x']::text[]
      ),
      (
        21,
        'arviz-jelzes-kor-utca',
        'Arvizjelzes a Kor utcan',
        'Torteneti arvizszint-jelzes a Kor utcai hazfalon.',
        47.6658200::double precision,
        19.0751800::double precision,
        'Milyen nyelven van a felirat?',
        'Milyen nyelven van a felirat?',
        's',
        array['s', 'nemetul']::text[]
      ),
      (
        22,
        'bukkos-part-emlektabla',
        'Bukkos-part emlektabla',
        'Emlektabla a Bukkos-part hidjanal.',
        47.6656000::double precision,
        19.0749500::double precision,
        'Hogyan hivtak Szent Istvan idejen a patakot?',
        'Hogyan hivtak Szent Istvan idejen a patakot?',
        'i',
        array['i', 'apor']::text[]
      ),
      (
        23,
        'kosarives-kapu-ko',
        'Kosarives kapu zarokove',
        'Regi haz zarokove a ket templom kozotti szakaszon.',
        47.6657600::double precision,
        19.0749800::double precision,
        'Mi lathato a zarokobe faragva?',
        'Mi lathato a zarokobe faragva?',
        'c',
        array['c', '1808 sk']::text[]
      ),
      (
        24,
        'petzelt-jozsef-tabla',
        'Petzelt Jozsef emlektabla',
        'Az iskola falan talalhato emlektabla.',
        47.6704048::double precision,
        19.0732515::double precision,
        'Ki volt Petzelt Jozsef?',
        'Ki volt Petzelt Jozsef?',
        's',
        array['s', 'tuzertiszt alezredes tanodaigazgato']::text[]
      )
  ) as seed(
    sequence_index,
    slug,
    name,
    description,
    latitude,
    longitude,
    question_prompt,
    question_prompt_hu,
    expected_answer,
    expected_answers
  )
),
target_route as (
  select id
  from public.routes
  where slug = 'long'
  limit 1
),
target_locations as (
  select
    rl.sequence_index,
    rl.location_id
  from public.route_locations rl
  join target_route tr
    on tr.id = rl.route_id
  join station_seed ss
    on ss.sequence_index = rl.sequence_index
),
updated as (
  update public.locations l
  set
    slug = ss.slug,
    name = ss.name,
    description = ss.description,
    latitude = ss.latitude,
    longitude = ss.longitude,
    radius_m = 40,
    qr_code_value = format('/r/long/l/%s?entry=qr', ss.slug),
    question_prompt = ss.question_prompt,
    question_prompt_hu = ss.question_prompt_hu,
    expected_answer = ss.expected_answer,
    expected_answers = ss.expected_answers,
    is_active = true,
    updated_at = now()
  from target_locations tl
  join station_seed ss
    on ss.sequence_index = tl.sequence_index
  where l.id = tl.location_id
  returning tl.sequence_index
),
missing_sequences as (
  select ss.sequence_index
  from station_seed ss
  left join target_locations tl
    on tl.sequence_index = ss.sequence_index
  where tl.location_id is null
)
select
  (select count(*) from updated) as updated_station_count,
  (select count(*) from missing_sequences) as missing_sequence_count,
  coalesce(
    (
      select string_agg(ms.sequence_index::text, ', ' order by ms.sequence_index)
      from missing_sequences ms
    ),
    ''
  ) as missing_sequences;
