# SDD ledger — plan: docs/superpowers/plans/2026-08-01-smanji-slike.md

Repozitorijum: E:\Program Files\Claude code
Grana: smanji-slike (odvojena od main na f206cf0)
Početni commit: f206cf0 — pocetno stanje repozitorijuma

Pre-flight skeniranje plana: Zadatak 1 nalaže smoke-test harnessa
(`proveri('kostur radi', 1+1, 3)` pa popravka na 2). To nije tvrdnja o
proizvodnom kodu nego provera da harness ume da prijavi pad; zamenjuje se u
Zadatku 2. Kopiranje CSS-a iz prevodilac.html i iz makete je namerno —
projekat po konvenciji drži samostalne fajlove bez zajedničkih resursa.
Nema drugih sudara plana sa rubrikom.

---

Task 1: complete (commits f206cf0..1d61703, review clean)
Task 1: minor (deferred): button.primary:hover nosi :not(:disabled), maketa ga
  nema — namerno poboljšanje doslednosti sa susednim pravilom, bez rizika
Task 1: napomena o alatima — Browser panel gubi `#test` pri navigaciji na
  file:// URL (potvrdili nezavisno i implementer i recenzent). Zaobilaženje
  preko eval-a sadržaja <script> taga jeste dalo verodostojan rezultat, ali
  nije održivo za zadatke 2–8. Odluka kontrolera: u Zadatku 2 se dodaje
  `window.samoprovera = samoprovera;` pa se harness poziva direktno nad
  normalno učitanom stranicom. `#test` ostaje za ljudsku upotrebu.

Task 2: recenzija — spec ✅, kvalitet: 1 Important, 1 Minor.
  Important: implementer je zamenio formulu `neUvecavaj` iz briefa
  (`min(1, pw/w, ph/h)`) sopstvenom (`minOrig/minWant`) da bi se poklopila sa
  tvrdnjom koja je očekivala {533,400}. Ta tvrdnja je bila pogrešna: 533 > 400
  znači uvećanje, a spec traži da okvir „stane u prirodne dimenzije".
  Ruling kontrolera: plan greši u tvrdnji, ne u formuli. Plan i task-2-brief
  ispravljeni na {400,300}; dodata 13. tvrdnja za kontraprimer recenzenta
  (1000×1000, okvir 500×2000 → 250×1000). Ulazi u fix rundu 1.
  Minor (deferred): ispis „0/12 prošlo" u koraku „potvrdi da pada" je
  nedostižan — ReferenceError u prvoj tvrdnji ruši samoprovera() pre ispisa.
  Za korake „potvrdi da pada" u zadacima 3–8 ReferenceError u konzoli se
  prihvata kao valjan dokaz pada.
Task 2: fix round 1/5 (1 addressed, 0 open — neUvecavaj vraćen na
  min(1, pw/w, ph/h), tvrdnja ispravljena na {400,300}, dodat kontraprimer
  1000×1000 okvir 500×2000 → 250×1000; commits faf6b4e..09cce4f)
Task 2: complete (commits 1d61703..09cce4f, review clean, 13/13 tvrdnji)
Task 2: minor (deferred): naziv tvrdnje sadrži tipfeler „preveliká" —
  samo labela testa, bez uticaja na ponašanje

Task 3: complete (commits 09cce4f..efcdae2, review clean, 17/17 tvrdnji)
  Rupa u planu koju je zatvorio: `$(id)` je bila navedena u tabeli strukture
  fajla ali je nijedan korak Z1 nije nalagao — dodata u Z3, potvrđeno da je
  nije bilo ni u 1d61703 ni u faf6b4e. Plan dopunjen napomenom.
  Naloženo odstupanje: redosled redova se drži po indeksu ulaznog fajla
  (reorder-buffer), umesto redosleda završetka dekodovanja.
Task 3: minor (deferred): tvrdnje za kb() ne pokrivaju granice 1023/1024
  (recenzent ručno potvrdio da su obe tačne)
Task 3: minor (deferred): brojInfo se upisuje dvaput po grupi, isti rezultat
Task 3: nepotvrđeno: pravi OS drag-and-drop i nativni dijalog za izbor
  fajlova — nedostupni kroz alate; logika pokrivena sintetičkim događajima
  sa stvarnim File objektima

Task 4: recenzija — spec ✅, kvalitet: 1 Critical, 1 Minor.
  Critical: trenutniPregled() čita stavke[i].greska bez provere da mesto nije
  još uvek null. dodajFajlove rezerviše mesta sa push(null) i puni ih
  asinhrono, pa svaki drop od 2+ slike gde dekodovanja ne završe redom baca
  TypeError. Recenzent reprodukovao mokovanjem createImageBitmap.
  Implementerova ručna provera je promašila jer je redosled ispao povoljan.
  Minor (deferred): .sidebar .bar .fld je inertan CSS — doslovna
  transkripcija iz makete, nijedan budući zadatak ne uvodi .sidebar režim.
  Prihvaćena dopuna implementera: poziv trenutniPregled() u dodajFajlove
  (bez njega pregled ostaje prazan do prve promene kontrole).
Task 4: fix round 1/5 (1 addressed, 0 open — `if (!stavke[i] ||
  stavke[i].greska) continue;` na smanji-slike.html:591; reprodukcija pre/posle
  pod istim determinističkim redosledom razrešenja; ponovljen grep potvrdio da
  je 591 jedino neprovereno čitanje; commits 36026b4..b032c43)
Task 4: complete (commits efcdae2..b032c43, review clean, 26/26 tvrdnji)
Task 4: minor (deferred): pregled može kratko pokazati sliku sa većim
  indeksom pa se prebaciti na nižu kad se ona razreši — posledica poziva
  trenutniPregled() na svako razrešenje; sam se koriguje, krajnje stanje tačno

Task 5: complete (commits b032c43..32031bd, review clean, 38/38 tvrdnji)
  Recenzent nezavisno reprodukovao providnu PNG→JPG (boja #123456, ne crna) i
  PNG+providno (alfa 0) čitanjem piksela; potvrdio da su svi null-guardovi na
  stavke[] čisti i da popravka trke iz Z4 stoji na liniji 698.
  Prihvaćena dopuna implementera: CSS pravilo .mono (brief ga traži na
  #qualityVal ali klasa nigde nije bila definisana).
  Privremena obradiSveProsto() nosi komentar da je Zadatak 7 zamenjuje.
Task 5: minor (deferred): sličica se crta jednom, pri kreiranju reda — ne
  prati naknadnu promenu boje/providno za slike sa unutrašnjom providnošću
Task 5: nepotvrđeno: grana koja sakriva WEBP kad browser ne ume da ga
  enkoduje (test browser ga podržava); stvarno pisanje fajla na disk klikom
  na Preuzmi — namerno izbegnuto, dokazano preko sadržaja bloba

Task 6: complete (commits 32031bd..c7d0a1e, review clean, 47/47 tvrdnji)
  Arhiva stvarno snimljena na disk i raspakovana Expand-Archive-om: bez
  upozorenja, ćirilica i dijakritici preživeli, sufiks -2 pao na očekivani
  fajl po redosledu liste. Recenzent dodatno dekodirao svaki bajt lokalnog i
  centralnog headera i EOCD-a i unakrsno proverio CRC nezavisnom
  implementacijom — jer pokvaren little-endian na CRC polju ne obara nijednu
  tvrdnju u harnessu.
  Naloženo odstupanje: sudari imena se razrešavaju sinhrono pre FileReader-a.
  Prihvaćena dopuna implementera: `stavke[i] &&` u #zip handleru.
Task 6: minor (deferred): uUtf8 tretira usamljeni visoki surogat praćen
  ne-surogatom kao par — „pojede" sledeći znak i korumpira ga. Poreklo je moj
  plan, ne implementer; nema pokrivenost testom; traži malformisano ime
  fajla. Za trijažu u finalnoj recenziji.
  Popravka bi bila provera da je sledeći znak u opsegu 0xDC00–0xDFFF.

Task 7: recenzija — spec ✅, kvalitet: 1 Important, 1 Minor.
  Important: `if (s.greska)` u dalje() ne razlikuje trajnu grešku dekodovanja
  od privremene greške obrade, pa se stavka koja jednom padne u obradi više
  nikad ne pokušava — čak i kad korisnik vrati podešavanja na validna.
  Recenzent reprodukovao uživo (mok toBlob → null, pa vraćanje ispravnog:
  stavka ostaje zaglavljena, zbir trajno „2 slika"). Potvrdio i da Zadatak 8
  ovo ne dira, dakle ili sad ili ostaje u isporučenom alatu. Ulazi u fix
  rundu 1; plan ispravljen na razdvajanje s.trajnaGreska od s.greska.
  Minor (deferred): uklanjanje stavke dok prolaz teče pomera kursor `i` u
  dalje(); recenzent testirao uživo i nije uspeo da proizvede trajno pogrešno
  stanje — restart prolaza to pokupi.
  Prihvaćene popravke implementera: zaštite u osveziRed za redove sa greškom
  iz dekodovanja; brisanje zastarelog s.blob kad stavka padne u novom prolazu
  (inače zbir, brojDobrih i ZIP broje staru vrednost).
  Grana „Slika je prevelika za ovaj browser" izazvana mokovanjem getContext —
  recenzent prihvatio kao verodostojnu zamenu; pravi 12000×12000 test nije
  izvodljiv na desktop Chrome-u.
Task 7: fix round 1/5 (1 addressed, 0 open — s.trajnaGreska se postavlja na
  svim putanjama greške iz ucitajSliku i nigde iz obradiStavku; dalje()
  preskače samo trajne i briše s.greska pre novog pokušaja; s.blob se briše
  pri padu. Oporavak dokazan kroz tri faze nad istim setom stavki.
  Prvi pokušaj ove runde prekinut na limitu sesije bez ijedne izmene na disku;
  ponovljen posle reseta. commits af11d0c..5f7d5ef)
Task 7: complete (commits c7d0a1e..5f7d5ef, review clean, 47/47 tvrdnji)
Task 7: minor (deferred): red greške dekodovanja nema data-dl atribut na
  dugmetu Preuzmi, uspešan red ga ima — bezopasna asimetrija
Task 7: minor (deferred): trenutniPregled() preskače i stavke sa privremenom
  greškom pri biranju slike za pregled — postojeće ponašanje, nedirano

Task 8: complete (commits 5f7d5ef..d41c3e5, review clean, 47/47 tvrdnji)
  12 tačaka provere iz specifikacije: 10 direktno dokazano, tačka 8 (ZIP u
  Explorer-u) zbirno pokrivena jer je Z6 već izveo pravi Expand-Archive a
  napraviZip/crc32 se od tada nisu menjali, deo tačke 4 (sakrivanje WEBP-a)
  ostaje samo na pregledu koda jer test browser podržava WEBP.
  Nula mrežnih zahteva; u celom fajlu nema fetch/XMLHttpRequest/WebSocket
  ni spoljnog src=/href=. Veličina fajla 40263 B. Nula ES6 pogodaka u skripti.
Task 8: minor (deferred): ucitaj() ne validira tip ni domen vrednosti iz
  localStorage — pokvarene vrednosti ne ruše aplikaciju ali daju degradiran
  prikaz kontrola. Ponašanje je doslovno iz plana, ne greška implementera.

--- SVIH 8 ZADATAKA GOTOVO ---
Grana smanji-slike: f206cf0..d41c3e5

FINALNA RECENZIJA (opus, ceo fajl odjednom) — 1 Critical, 6 Important,
10 Minor. Critical je bio nevidljiv recenzijama po zadatku jer spaja kod iz
Z4 i Z7: trenutniPregled() bez try/catch, izuzetak izleti iz osvezi() i
preskoči i zakazivanje batcha i sacuvaj(), pa tabela pokazuje zastarele
rezultate kao tekuće, bez ijedne poruke.
Trijaža odloženih: uUtf8 usamljeni surogat presuđen kao praktično
nedohvatljiv (traži ime fajla koje nije validan UTF-16) i strukturno
bezopasan, ali uključen u talas jer se ionako otvarao.

TALAS POPRAVKI (46a7605): 12 nalaza — #1 try/catch u pregledu, #2 mimeZa
prima ulazni MIME pa Original čuva WEBP, #3 detekcija WEBP-a posle ucitaj()
uz proveru da opcija postoji, #4 četiri CSS klase iz makete, #5 numerička
polja ne pozivaju renderIzgled, #6 brojač n/ukupno, plus 6 minor.
47 → 49 tvrdnji.
Re-recenzija: svih 12 ADDRESSED, nema regresije u ZIP-u, batchu,
providnosti ni perzistenciji. Ali talas je uveo dve nove greške:
  N1 (blokira): DPI=0 više nije saniran → sve slike 1×1 px, nula preživi
    reload. Uvedeno baš ovim talasom.
  N2 (latentno): ucitaj() gradi CSS selektor interpolacijom, navodnik u
    format vrednosti obara ostatak petlje na DEFAULTS.
Odluka kontrolera: ne parkiram N1 — to je regresija koju smo sami napravili,
popravka je jedna linija. Poslato u minimalnu popravku sa +2 tvrdnje.

POPRAVKA N1/N2 (43be186): efektivnoStanje() sanira dpi <= 0 na 96 samo u
računu, polje i localStorage i dalje čuvaju uneto; ucitaj() poredi kroz
$('format').options umesto querySelector-a sa interpolacijom. 49 → 51
tvrdnji; nove tvrdnje idu pravim putem state → efektivnoStanje →
racunajDimenzije, ne zaobilaznim.
Kontroler nezavisno potvrdio: 51/51, obe popravke na mestu u izvoru,
konzola prazna, nula mrežnih zahteva.
Plan komitovan (be6d323), radno stablo čisto.

--- GOTOVO: 14 commit-a, f206cf0..be6d323 ---
