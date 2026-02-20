-- Phase 16: Seed full Hungarian instruction content for the 24-station school route
-- Target route slug: long
-- Maps instruction text by route sequence_index (1..24).

with instruction_seed as (
  select *
  from (
    values
      (
        1,
        $$Az iskola elől indulj jobbra a 11-es főút mellett a Római Kőtár felé.$$,
        $$Római Kőtár állomás:
Az iskola elől indulj jobbra a 11-es főút mellett a Római Kőtárig.

Háttér:
Az Ulcisia Castra római tábor Kr.u. 2-4. századi alapfalait ma már csak részben látni, a feltárás után visszatemették.

Feladat:
Mit faragtak ki a szarkofág tetején?
v) 6 kődudort
t) 4 kődudort
c) egy nagy kődudort$$
      ),
      (
        2,
        $$A Római Kőtár mellől menj fel a lépcsőn, balra a Paprika bíró utcán a patakig.$$,
        $$Patak és híd állomás:
Menj le a patakhoz, majd kelj át jobbra a közeli hídon a szakorvosi rendelő irányába.

Háttér:
A Paprika bíró utca nevét Paprika Péter 18. századi bíróról kapta.

Feladat:
2. Hogy hívják ezt a patakot?
a) Dera
e) Csele
u) Bükkös

Extra:
Hány fa „x”-et számolsz meg a hídon?$$
      ),
      (
        3,
        $$Menj a városházáig, és figyeld a zászlót a Fő tér környékén.$$,
        $$Városháza állomás:
Indulj a városközpont felé, haladj a szakorvosi rendelő előtti úton, majd menj a városházáig.

Háttér:
A szentendrei városháza barokk eredetű épület, mai formáját 1924-ben nyerte el.

Feladat:
3. Milyen színei vannak a szentendrei zászlónak?
k) Sárga és kék
l) Kék és piros
m) Zöld és fehér$$
      ),
      (
        4,
        $$Keresd a legrégebbi épen maradt házat, majd menj fel a Várlépcsőn a Hild János emléktábláig.$$,
        $$Várlépcső és Hild-emléktábla állomás:
A régi háztól jobbra indul a Várlépcső. Menj fel a Hild János emléktábláig, és a közelben keress beépített római faragott követ.

Feladat:
4. Az emléktáblától merre találtad meg?
z) jobbra
s) balra
p) felette$$
      ),
      (
        5,
        $$A Templomdombon a toronyóra alatt keress még egy időmérő eszközt a bejárat közelében.$$,
        $$Templomdomb állomás:
Menj fel a Templomdombra. A toronyóra környékén, a bejárat közelében (kívül) keress egy másik időmérőt.

Háttér:
A római katolikus plébániatemplom középkori eredetű, később barokk átalakítást kapott.

Feladat:
5. Mi ez?
n) homokóra
k) vízóra
t) napóra$$
      ),
      (
        6,
        $$A templom mögött menj le az iskola mellett a Belgrád-székesegyházhoz.$$,
        $$Belgrád-székesegyház állomás:
A Templomdombról menj le a következő templomhoz, a legészakabbra épült szerb székesegyházhoz.

Háttér:
A Belgrád-székesegyház története a szerbek 1690 körüli betelepülésével kezdődött.

Feladat:
6. Milyen hangszert fedezett fel Avakumovics Avakum?
i) gitárfélét
e) fúvós és billentyűs
o) dobot$$
      ),
      (
        7,
        $$A szűk utcákon haladva keresd Szent Miklós ábrázolását egy ház oromzatán.$$,
        $$Szent Miklós-freskó állomás:
Haladj a kis alpinista szobra felé, majd balra a zsidó imaház mellett, és keresd egy ház oromzatán Szent Miklóst.

Feladat:
7. Mi látható Miklós lábánál?
l) egy lovaskocsi
h) egy boroshordó
f) egy hajó$$
      ),
      (
        8,
        $$Fordulj a Gőzhajó utcába, majd balra a Rab Ráby térre, és keresd a kapu zárókövét.$$,
        $$Rab Ráby tér állomás:
Menj a Rab Ráby térre, ahol a barokk lakóház és kapu díszítése látható.

Háttér:
Rab Ráby Mátyás alakját Jókai Mór regénye tette ismertté.

Feladat:
8. Milyen szimbólum látható a ház kapujának zárókövén?
e) egy hordó
i) egy horgony
a) egy szőlőfürt$$
      ),
      (
        9,
        $$Indulj a Bartók Béla utcán a Szamár-hegy felé, és keresd az emléktáblát.$$,
        $$Szamár-hegy alsó állomás:
Haladj a Bartók Béla utcán felfelé, nézd meg a falon kb. két méter magasan lévő emléktáblát.

Feladat:
9. Kinek állít emléket?
n) ikonfestőknek
c) kódexmásolóknak
j) kelmefestőknek$$
      ),
      (
        10,
        $$Menj tovább a Tobakosok keresztjéig, és nézd meg a Preobrazsenszka templom tornyát.$$,
        $$Tobakosok keresztje állomás:
A Szamár-hegyen állj meg a panorámánál, majd nézd a Preobrazsenszka templom tornyát a feléd eső oldalon.

Feladat:
10. Hány ablaknyílás van egymás alatt?
o) három
a) négy
u) öt$$
      ),
      (
        11,
        $$Az Y elágazásnál menj a jobboldali úton lefelé a Szőlősgazdák (Szent Orbán) keresztjéhez.$$,
        $$Szent Orbán keresztje állomás:
Az Angyal utca alján keresd a Szőlősgazdák keresztjét, amely a szőlőművelés védelmét jelképezi.

Feladat:
11. Hányszor csavarodik körbe a szőlőinda?
c) egyszer sem
b) kétszer
v) majdnem négyszer$$
      ),
      (
        12,
        $$Haladj az Ady Endre utcán a park felé, majd balra a Szoborparkba.$$,
        $$Szoborpark állomás:
A Szoborparkban keresd a Lopják Európát című szobrot (Kerényi Jenő).

Feladat:
12. Minek a képében ragadja el Zeuszt Európát?
i) bika
e) aranyfolyam
o) hattyú$$
      ),
      (
        13,
        $$Menj a Duna felé, majd a Bogdányi úton a Preobrazsenszka templom előtti tér díszkútjához.$$,
        $$Díszkút állomás:
A tér díszkútján az Agnus Dei (Isten báránya) motívumát keresd.

Feladat:
13. Milyen állat Szentendre címerállata?
a) kecske
b) tehén
c) bárány$$
      ),
      (
        14,
        $$Haladj tovább a MűvészetMalom épületéig.$$,
        $$MűvészetMalom állomás:
Menj a kékfestő üzlet mellett addig, amíg az utak újra összefutnak, ott találod a MűvészetMalmot.

Feladat:
14. Mi van most az épületben?
a) gabonaőrlés
s) kiállítások
x) düledező rom$$
      ),
      (
        15,
        $$A Bogdányi úton menj tovább a Bárczy fogadó épületéhez.$$,
        $$Bárczy fogadó állomás:
Az étterem ma is működik, az alapítás évét kell megfigyelni.

Feladat:
15. Mikor alapították ezt az épületet?
k) 1734
h) 1834
s) 1934$$
      ),
      (
        16,
        $$A parkolóban, a Lázár cár tér sarkán keresd az emlékkeresztet.$$,
        $$Lázár cár emlékoszlop állomás:
Nézd meg az oszlop fejezetét.

Feladat:
16. Mi látható az oszlopfejezeten?
i) akantusz levelek
e) emberfej
a) csavart minta$$
      ),
      (
        17,
        $$Menj a Duna partjára a mobilgáthoz, és nézz folyásirányban.$$,
        $$Köszöntő szobor állomás:
A távolban látható fehér beton szobor címe Köszöntő.

Feladat:
17. Mihez hasonlít szerinted?
r) két összeragadt villához
b) vágtató lóhoz
y) halfejhez$$
      ),
      (
        18,
        $$A Görög utca felől térj a Fő térre, és keresd a pestis keresztet.$$,
        $$Pestis kereszt állomás:
A háromoldalú talpazaton álló kereszten apostolalakok láthatók.

Feladat:
18. Összesen mennyit látsz?
a) 12
e) 8
i) 9
o) 15$$
      ),
      (
        19,
        $$Keresd a Török köz felé nyíló teret, majd a Péter-Pál templom oldalkapuját.$$,
        $$Péter-Pál templom állomás:
A kis térre nyíló oldalkapu márványának színét figyeld meg.

Feladat:
19. Milyen színű márványból van az oldalkapu?
q) zöld
d) vörös
c) fehér$$
      ),
      (
        20,
        $$Haladj a Kör utcán, és figyeld Szent András freskóját a kapu felett.$$,
        $$Szent András-freskó állomás:
A freskón Szent András mögött andráskereszt látható.

Feladat:
20. Milyen betűt formáz a kereszt?
z) X
s) Y
r) T$$
      ),
      (
        21,
        $$A Kör utcán keresd meg a régi árvíz jelzését a házfalon.$$,
        $$Árvízjelzés állomás:
Olvasd le a felirat nyelvét, és becsüld meg a vízszint magasságát.

Feladat:
21. Milyen nyelven van a felirat?
a) magyarul
f) szerbül
s) németül

Extra:
Tippeld meg, meddig ért a víz és mikor volt az árvíz.$$ 
      ),
      (
        22,
        $$Menj a Bükkös-partig, kelj át a hídon, és keresd az emléktáblát az emlékkövön.$$,
        $$Bükkös-part emléktábla állomás:
Az emléktábla a patak régi nevére utal.

Feladat:
22. Hogyan hívták Szent István idején a patakot?
i) Apor
e) Lehel
a) Bükköske$$
      ),
      (
        23,
        $$A két templom közül a régebbivel szembeni ház kapujának zárókövét figyeld.$$,
        $$Kosáríves kapu állomás:
A zárókőbe faragott jelzés alapján válaszolj.

Feladat:
23. Mi látható a zárókőbe faragva?
c) 1808 SK
b) 1908 PK
l) 1708 DP$$
      ),
      (
        24,
        $$Térj vissza az iskolához, és az emléktábla alapján válaszolj az utolsó kérdésre.$$,
        $$Záró állomás:
Az iskola falán látható emléktábla alapján add meg a választ.

Feladat:
24. Ki volt Petzelt József?
s) tüzértiszt, alezredes, tanodaigazgató
b) hajóskapitány
z) kapus a Vörös Meteor focicsapatban

Megfejtés:
Ha összerakod a betűket, egy híres szerb tudós nevét kapod.$$ 
      )
  ) as seed(sequence_index, instruction_brief_hu, instruction_full_hu)
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
  join target_route tr on tr.id = rl.route_id
),
updated as (
  update public.locations l
  set
    instruction_brief_hu = seed.instruction_brief_hu,
    instruction_full_hu = seed.instruction_full_hu,
    instruction_brief = coalesce(l.instruction_brief, seed.instruction_brief_hu),
    instruction_full = coalesce(l.instruction_full, seed.instruction_full_hu),
    updated_at = now()
  from target_locations tl
  join instruction_seed seed on seed.sequence_index = tl.sequence_index
  where l.id = tl.location_id
  returning tl.sequence_index
),
missing_sequences as (
  select seed.sequence_index
  from instruction_seed seed
  left join target_locations tl on tl.sequence_index = seed.sequence_index
  where tl.location_id is null
)
select
  (select count(*) from updated) as updated_locations_count,
  (select count(*) from missing_sequences) as missing_sequence_count,
  coalesce(
    (
      select string_agg(missing_sequences.sequence_index::text, ', ' order by missing_sequences.sequence_index)
      from missing_sequences
    ),
    ''
  ) as missing_sequences;
