# Smanji slike — dizajn

Datum: 2026-08-01
Status: odobren dizajn, potvrđen kroz maketu, ide na plan implementacije
Maketa: `2026-08-01-smanji-slike-playground.html` (isti direktorijum)

## Problem

reduceimages.com naplaćuje pretplatu ($3.99/mes – $14.99/6mes) za batch obradu
(„Resize multiple images at once") i za privatnost („Images never leave your
device"). Obe stvari su besplatne posledica toga što se obrada radi u browseru
preko Canvas API-ja. Treba nam lokalan alat bez limita, bez pretplate, bez
uploada.

## Isporuka

Jedan samostalan fajl: `smanji-slike.html` u rootu projekta.

Bez PWA omotača, bez `smanji-slike-web/`, bez servisnog radnika. Duplo klikni pa
radi sa diska.

Ovo je zaseban alat od prevodioca — ne dira `prevodilac.html` niti
`prevodilac-web/`. Ne postoji zahtev za dva identična fajla (to pravilo iz
CLAUDE.md važi samo za prevodioca).

## Konvencije

Iste kao prevodilac:

- Inline CSS, jedan `<script>` blok, jedan IIFE.
- ES5: `var`, deklaracije funkcija, bez strelica, bez `let`/`const`, bez
  modula, bez template literala. Cilj su i stariji mobilni browseri.
- UI, svi korisnički vidljivi stringovi i svi komentari na srpskom (latinica).
- Nula zavisnosti, bez build koraka, bez package managera.

## Arhitektura

Nema mreže. Nijedan `fetch`, nijedan `XMLHttpRequest`, nijedan spoljni resurs.
Fajl radi sa `file://`, offline, bez interneta.

Cevovod po jednoj slici:

1. `File` → `createImageBitmap(file)`; fallback na `new Image()` +
   `URL.createObjectURL` za starije browsere. Odatle prirodne dimenzije.
2. Izračunaj ciljne `W`×`H` iz unesenih vrednosti, jedinice i režima.
3. Nacrtaj na offscreen `<canvas>` prema režimu.
4. `canvas.toBlob(callback, mime, quality)` → `Blob`.
5. Blob ide u red rezultata: pojedinačno preuzimanje ili ZIP.

Slike se obrađuju **sekvencijalno**, jedna po jedna, ne paralelno. Paralelno
dekodovanje desetak slika obara memoriju na telefonu.

### Moduli unutar IIFE

Granice su postavljene tako da svaki deo ima jednu svrhu i može se čitati bez
ostatka:

- `racunajDimenzije(prirodnaW, prirodnaH, unos)` — čista funkcija, bez DOM-a,
  bez canvasa. Vraća `{w, h}`. Ovde žive jedinice i pravilo praznog polja.
- `nacrtaj(bitmap, w, h, rezim, boja)` — vraća canvas. Ovde žive Stretch/Fit/Crop.
- `uKodiraj(canvas, mime, quality)` — omotač oko `toBlob` koji vraća blob ili
  baca grešku sa razumljivom porukom.
- `obradiFajl(file, podesavanja)` — spaja gornja tri, vraća rezultat ili grešku.
- `napraviZip(stavke)` — čista funkcija: niz `{ime, blob}` → jedan `Blob`.
  Ne zna ništa o slikama.
- `crc32(uint8)` — pomoćna, sa predračunatom tabelom.
- Sloj UI-ja — render tabele, progres, event handleri, `localStorage`.

## Opcije

### Dimenzije

Polja `W` i `H` plus izbor jedinice: `percent`, `pixels`, `centimeters`,
`inches`.

Ako je jedno od polja prazno, izvodi se iz drugog po odnosu stranica originala.
Ako su oba prazna, slika prolazi neizmenjenih dimenzija (i dalje se re-enkodira,
što ima smisla kad se menja format ili quality).

`percent` se računa u odnosu na prirodne dimenzije te slike — pri batch obradi
svaka slika dobija svoj rezultat, što je i poenta procenta.

`centimeters` i `inches` zahtevaju DPI da bi se preveli u piksele. Dodaje se
malo brojčano polje `DPI`, default `96` (CSS standard). Koristi se **isključivo**
za taj preračun. DPI se **ne upisuje** u izlazni fajl — to je svesno izostavljeno
jer bi tražilo ručno krpljenje JFIF/pHYs hedera.

Polje DPI je vidljivo samo kad je jedinica `centimeters` ili `inches`.

### Ne uvećavaj

Čekboks `ne uvećavaj`, **podrazumevano uključen**.

Kad je uključen, ciljni okvir se skalira naniže dok ne stane u prirodne
dimenzije, uz očuvan odnos zadatog okvira:

```
f = min(1, prirodnaW / ciljnaW, prirodnaH / ciljnaH)
ciljnaW *= f;  ciljnaH *= f
```

Bez ovoga „maks. širina 1600 px" uvećava portret od 1000×1500 na 1600×2400 —
fajl raste, informacije nema više. U alatu za smanjivanje slika to je pogrešno
podrazumevano ponašanje. Isključuje se kad korisniku treba tačna ciljna veličina
(ikonica 512×512, format za štampu).

Nalaz iz makete (`2026-08-01-smanji-slike-playground.html`): sa uključenom
opcijom isti batch od četiri uzorka daje 405 KB → 90 KB uz sve dimenzije
nepromenjene ili manje.

### Režim

Izlazni canvas je kod sva tri režima tačno `W`×`H`.

- `Stretch` — nacrtaj sliku na tačno `W`×`H`, odnos stranica se ignoriše.
- `Fit` — skaliraj da stane unutar `W`×`H` uz očuvan odnos; preostale trake
  popuni bojom pozadine (ili ostavi providne ako je izlaz PNG/WEBP i boja
  postavljena na „providno").
- `Crop` — skaliraj da pokrije `W`×`H` uz očuvan odnos; višak iseci iz centra.

### Format

`Original`, `JPG`, `PNG`, `WEBP`.

`Original` zadržava ulazni MIME kad ga canvas ume da enkoduje; za GIF ulaz pada
na PNG.

**GIF kao izlaz nije podržan** — `canvas.toBlob` ne ume da enkoduje GIF. To je
ograničenje browsera, ne propust. GIF kao **ulaz** radi i uzima prvi frejm.
WEBP je dodat umesto njega i kompresuje bolje od svega što original nudi.

Ako browser ne podržava WEBP enkodiranje, ta opcija se sakriva pri startu
(detekcija preko `canvas.toDataURL('image/webp')`).

### Quality

Slajder 1–100, prosleđuje se kao `quality/100`. Aktivan za JPG i WEBP; za PNG
se prikazuje sivo jer ga canvas tamo ignoriše.

### Boja pozadine

Color picker. Koristi se za `Fit` popunu i kad se providna PNG ravna u JPG
(bez toga providnost postaje crna). Uz njega čekboks „providno", koji je
dostupan samo za PNG/WEBP izlaz.

## Podrazumevane vrednosti

Potvrđeno kroz maketu:

| Opcija | Vrednost |
|---|---|
| jedinica | `pixels` |
| W / H | `1600` / prazno (visina iz odnosa) |
| DPI | `96` |
| režim | `Fit` |
| format | `WEBP` (pada na `JPG` ako browser ne ume WEBP) |
| quality | `82` |
| boja pozadine | `#ffffff` |
| providno | isključeno |
| ne uvećavaj | **uključeno** |

## Izgled

Preuzima se vizuelni jezik prevodioca: iste CSS promenljive, isti karton
(`--panel`, radius 12px, `--shadow`), isti sistemski font, ista svetla/tamna tema
preko `prefers-color-scheme`.

- **Raspored:** kontrole u vodoravnoj traci iznad rezultata (ne uspravna kolona).
- **Gustina tabele:** normalna, `padding: 10px`.
- **Sličice:** prikazane, 34×34, `object-fit: cover`.
- **Akcent:** `hsl(222 85% 56%)` — isti plavi kao u prevodiocu.
- **Progres traka:** vidljiva samo tokom obrade, sakriva se kad batch završi.
- **Šahovnica** iza pregleda, da se providnost vidi.

## Batch i ZIP

Unos: drag&drop zona preko cele stranice plus dugme za izbor fajlova.
`<input type="file" multiple accept="image/*">`. Bez ograničenja broja fajlova.

Tabela rezultata, jedan red po slici: sličica, ime fajla, originalne dimenzije
i veličina, nove dimenzije i veličina, ušteda u procentima, dugme za
preuzimanje. Progres traka dok obrada traje, sa brojačem `n/ukupno`.

Dugme „Preuzmi sve (ZIP)" ispod tabele, aktivno kad je bar jedan fajl uspešno
obrađen.

### ZIP writer

Piše se ručno, bez biblioteke.

- Metoda 0 (store), bez kompresije. JPEG/PNG/WEBP su već kompresovani; deflate
  bi dao ~0 dobitka a višestruko uvećao kod.
- Struktura: local file header po stavci → central directory → EOCD.
- CRC32 iz predračunate tabele od 256 unosa.
- Imena fajlova u UTF-8, sa postavljenim flag bitom 11 (jezički enkoding), da
  bi ćirilica i dijakritici preživeli.
- Sudari imena se razrešavaju sufiksom `-2`, `-3` itd.

## Rukovanje greškama

Filozofija je ista kao chunking u prevodiocu: **degradiraj, ne gubi sve**.

Neuspeh jedne slike ne prekida batch. Red se markira greškom i obrada ide dalje.
Slučajevi koji se hvataju:

- Fajl nije slika ili je format nepodržan → „Nije podržana slika".
- Slika prelazi limit canvasa (mobilni Safari puca oko 16.7 MP) → „Slika je
  prevelika za ovaj browser".
- `toBlob` vrati `null` → „Neuspešno kodiranje".
- Ciljne dimenzije ≤ 0 ili nisu broj → validacija pre obrade, poruka uz polje.

Memorija: `URL.revokeObjectURL` posle svake upotrebe, canvas se ne drži u nizu
rezultata (čuva se samo blob).

`ImageBitmap` se **ne** zatvara posle crtanja, nego tek kad se stavka ukloni iz
liste. Razlog: svaka promena podešavanja pokreće nov prolaz nad istim slikama, a
zatvorena bitmapa bi tražila ponovno dekodovanje fajla pri svakom pomeraju
slajdera. Cena te odluke je opisana u „Poznata ograničenja".

## Stanje

Podešavanja (jedinica, W, H, režim, format, quality, boja, providno, DPI) se
čuvaju u `localStorage` pod ključem `smanjiSlike.v1`, obavijeno u try/catch zbog
privatnog režima — isti obrazac kao `prevodilac.v3`.

Slike se **ne** čuvaju nigde. Osvežavanje stranice briše red obrade.

## Provera

Projekat nema test suite. Provera je ručna, u browseru, po ovoj listi:

1. Svaka jedinica: percent, pixels, centimeters, inches (sa DPI 96 i 300).
2. Prazno `W` odnosno prazno `H` — izvodi se iz odnosa stranica.
2a. `ne uvećavaj` uključen: slika manja od ciljnog okvira ostaje u svojim
    dimenzijama. Isključen: uvećava se do okvira.
3. Sva tri režima na slici koja nije istog odnosa kao ciljni okvir.
4. Sva četiri izbora formata; WEBP se sakriva ako browser ne ume.
5. Providna PNG → JPG: pozadina je zadata boja, ne crna.
6. Providna PNG → PNG sa čekboksom „providno": providnost očuvana.
7. Batch od ~10 mešanih fajlova (JPG, PNG, GIF, jedan tekstualni fajl
   preimenovan u `.jpg`) — tekstualni pada, ostalih 9 prolazi.
8. ZIP se otvara u Windows Explorer-u i sadrži svih 9 fajlova ispravnih.
9. Naziv sa ćirilicom i sa dijakriticima preživi ZIP.
10. Podešavanja prežive osvežavanje stranice.
11. Konzola bez grešaka i upozorenja.

## Poznata ograničenja

- **Sve dekodovane slike stoje u memoriji dok traje batch.** `ImageBitmap` se
  drži na `s.src` i zatvara tek pri uklanjanju stavke, pa zauzeće raste linearno
  sa brojem slika — grubo `širina × visina × 4` bajta po slici, nezavisno od
  veličine fajla na disku. Fotografija 4000×3000 zauzima oko 48 MB, deset takvih
  oko 0,5 GB.

  Ovo je svesna razmena, ne propust: bez toga bi svaki pomeraj quality slajdera
  tražio ponovno dekodovanje svih fajlova. Delimično potire razlog zbog kog je
  obrada sekvencijalna („paralelno dekodovanje desetak slika obara memoriju na
  telefonu") — sekvencijalnost i dalje sprečava vršno zauzeće tokom samog
  dekodovanja, ali ne i zbirno zauzeće posle njega.

  Na desktopu nebitno. Na starijem telefonu sa dvadesetak fotografija iz
  telefonske kamere može da izazove pad kartice. Zaobilaženje za korisnika:
  obrađivati u manjim grupama i uklanjati gotove stavke dugmetom „×", što
  poziva `bitmap.close()`.

  Ako ovo ikad postane stvaran problem, rešenje nije zatvarati bitmape nego
  čuvati original kao `Blob` i dekodovati ga na zahtev, uz keširanje samo one
  slike koja je trenutno u pregledu.

- Canvas re-enkodira JPEG kroz sopstveni enkoder, što je generacijski gubitak.
  Za smanjivanje dimenzija nebitno; za „samo smanji fajl bez menjanja dimenzija"
  rezultat je nešto slabiji nego mozjpeg. Bolje ne može bez WASM biblioteke, što
  bi razbilo „jedan fajl, nula zavisnosti".
- GIF izlaz nije moguć (vidi gore).
- DPI se ne upisuje u izlazni fajl.
- Animirani GIF/WEBP ulaz daje samo prvi frejm.
