# Alati

Mali alati bez naloga, bez servera i bez pretplate. Dva rade u browseru i svaki je **jedan HTML fajl** — dvoklik pa radi. Treći je pravi Windows program sa instalerom.

## Prevodilac SR ⇄ DE

`prevodilac/prevodilac.html`

Prevod srpski ⇄ nemački. Sam prepoznaje smer, prebacuje ćirilicu u latinicu, i ume da prebaci nemački tekst između persiranja (*Sie*) i tikanja (*du*) bez ponovnog prevođenja.

Traži internet — prevod ide na Google, pa na MyMemory ako Google zakaže.

**Na telefon:** `prevodilac/web/` je ista aplikacija sa PWA omotačem. Serviraj je pa instaliraj:

```bash
npx serve "E:\Program Files\Claude code\prevodilac\web"
```

## Smanji slike

`smanji-slike/smanji-slike.html` — ili **ikona „Smanji slike" na desktopu**, koja ga otvara u sopstvenom prozoru.

Menja dimenzije i kompresuje slike. Više slika odjednom, sve odjednom preuzmeš kao ZIP.

- Dimenzije u procentima, pikselima, centimetrima ili inčima
- Stretch, Fit ili Crop
- Izlaz JPG, PNG ili WEBP, sa klizačem kvaliteta
- Boja pozadine i providnost
- „Ne uvećavaj" — male slike ostaju male

**Ne šalje ništa na internet.** Nema nijednog mrežnog poziva; slike se obrađuju u tvom browseru i nikad ne napuštaju računar. Radi i bez interneta.

Provera ispravnosti je ugrađena — otvori fajl sa `#test` na kraju adrese.

## Kalkulator

`kalkulator/` — Windows program, instalira se pa se pokreće iz start menija ili sa desktopa.

Računa ceo izraz odjednom, onako kako se piše: `(120+35)*3`. Zagrade, procenat, promena znaka. Radi i mišem i tastaturom, u isto polje — `Enter` računa, `Esc` briše.

Sve što izračunaš ostaje u istoriji sa desne strane i **preživljava gašenje aplikacije**. Klik na stari račun ubacuje njegov rezultat u tekući izraz. Podaci se čuvaju u `%APPDATA%\Kalkulator\podaci.json`; ta putanja piše u dnu prozora.

**Ne traži internet.** Ništa ne šalje nikuda.

Instaler se pravi ovako (traži Node.js):

```bash
cd kalkulator && npm install && npm run dist
```

Gotov `.exe` završi u `kalkulator/izlaz/`. Instaler nije digitalno potpisan, pa će Windows pri prvom pokretanju prikazati SmartScreen upozorenje — „More info" pa „Run anyway".

Da se aplikacija samo pokrene, bez pravljenja instalera: `npm start`.
Provera ispravnosti: `npm test`.

## Šta je gde

| Putanja | Šta je |
|---|---|
| `prevodilac/` | prevodilac, standalone + PWA verzija |
| `smanji-slike/` | alat za slike, plus ikona za prečicu |
| `kalkulator/` | Electron aplikacija, izvorni kod i ikona za instaler |
| `docs/specifikacije/` | šta je trebalo napraviti i zašto tako |
| `docs/planovi/` | kako je građeno, korak po korak |
| `docs/smanji-slike-dnevnik-izrade.md` | nalazi recenzija i odluke tokom izrade |
| `CLAUDE.md` | uputstvo za Claude Code, ne za ljude |

Specifikacija za „Smanji slike" ima i interaktivnu maketu — otvori `docs/specifikacije/2026-08-01-smanji-slike-playground.html` da vidiš kako se izgled birao.
