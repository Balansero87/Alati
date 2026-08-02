# Kalkulator — plan izrade

Datum: 2026-08-02
Specifikacija: `docs/specifikacije/2026-08-02-kalkulator-specifikacija.md`

## Redosled

Logika pre interfejsa, interfejs pre pakovanja. Svaki korak je proveren pre
sledećeg.

### 1. `renderer/racunanje.js` — čista logika

Tokenizer → shunting-yard → evaluator postfiksa, plus `formatiraj()`.
Bez DOM-a, bez Electrona. UMD omotač da isti fajl radi i kao `<script>` i kao
`require`.

**Napravljeno:** ✅

### 2. `skladiste.js` — JSON u userData

Atomičan upis (`.tmp` + `rename`), ograničenje na 200 zapisa, sklanjanje
oštećenog fajla u `.osteceno`, pamćenje dimenzija prozora.
Prima putanju kao argument — zato može da se testira nad privremenim folderom,
bez Electrona.

**Napravljeno:** ✅

### 3. `samoprovera.js` — provera pre bilo kakvog UI-ja

72 tvrdnje. Pokrenuto pre pisanja interfejsa; našlo je jednu pravu grešku:
implicitno množenje (`2(3+1)`) slalo je `*` pravo na izlaz umesto na stek
operatora, pa je postfiks ispadao `[2,'*',3,1,'+']` umesto `[2,3,1,'+','*']`.
Popravljeno izdvajanjem `ubaciOperator()`.

**Napravljeno:** ✅ — `OK 72/72`

### 4. `main.js` + `preload.js` — glavni proces i most

`contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`.
Četiri IPC kanala (`kalk:istorija-ucitaj`, `-dodaj`, `-obrisi`,
`kalk:gde-su-podaci`). Zabranjena spoljna navigacija i otvaranje prozora.
Pamćenje dimenzija prozora odloženo za 400 ms da vučenje ivice ne piše po disku
50 puta u sekundi.

**Napravljeno:** ✅

### 5. `renderer/` — interfejs

`index.html` + `stil.css` + `renderer.js`. Izraz je pravi `<input>` (kursor se
pomera, može se lepiti tekst), a dugmad ubacuju znakove na mesto kursora.
Ono što se otkuca ili nalepi se filtrira kroz belu listu znakova.

**Napravljeno:** ✅

### 6. `napravi-ikonu.js` → `kalkulator.ico`

Skripta bez zavisnosti: crtanje u RGBA bafer sa antialiasingom preko funkcije
udaljenosti, PNG kroz `zlib` iz Node-a, pa PNG-ovi u ICO kontejner. Šest
veličina: 256/128/64/48/32/16. Ostaje u repozitorijumu (`npm run ikona`) da bi
ikona mogla ponovo da se napravi bez dodavanja biblioteke za slike.

**Napravljeno:** ✅

### 7. `provera-ui.js` — provera kroz pravu aplikaciju

Pokreće **pravi** `main.js` (sa `userData` preusmerenim u privremeni folder) i
kroz stvarni prozor odradi račun, izazove grešku, proveri istoriju i sadržaj
`podaci.json`. Snima i sliku prozora. `npm run test:ui`.

**Napravljeno:** ✅ — 16 provera, sve prolaze, bez grešaka u konzoli renderera

### 8. `electron-builder` → instaler

NSIS, ne one-click: korisnik bira folder, dobija prečicu na desktopu i u start
meniju.

**Napravljeno:** ✅ — `izlaz/Kalkulator-1.0.0-instaler.exe` (95 MB), raspakovana
aplikacija pokrenuta i potvrđeno da prozor postoji

### 9. Dokumentacija

Specifikacija, ovaj plan, sekcija u `README.md` i u `CLAUDE.md`.

**Napravljeno:** ✅

## Šta je izmenjeno van foldera `kalkulator/`

- `.gitignore` — dodat `kalkulator/izlaz/`
- `README.md` — sekcija i red u tabeli
- `CLAUDE.md` — uvod više ne tvrdi da su u repozitorijumu samo dva HTML alata

## Ako se nastavlja

- Potpisivanje instalera (sertifikat) da nestane SmartScreen upozorenje
- Pretraga kroz istoriju kad zapisa bude previše da se skroluje
- Kopiranje rezultata u ostavu jednim potezom
