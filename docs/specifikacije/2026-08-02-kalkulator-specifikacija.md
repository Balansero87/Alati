# Kalkulator — specifikacija

Datum: 2026-08-02
Folder: `kalkulator/`

## Šta je

Desktop kalkulator za Windows, Electron aplikacija. Računa izraz koji se piše u
jednoj liniji (`(2+3)*4`, ne „pritisni broj pa operaciju pa broj"), i pamti
istoriju računa na disk.

Prvi alat u ovom repozitorijumu koji **nije** jedan HTML fajl. Razlog je izričit
zahtev: pravi `.exe` instaler i podaci u `app.getPath('userData')`, što browser
ne može.

## Šta radi

- Četiri osnovne operacije, zagrade, procenat, promena znaka, brisanje znaka
- Unos i mišem (dugmad) i tastaturom — istovremeno, u isto polje
- Međurezultat se prikazuje ispod izraza dok se kuca
- `Enter` ili `=` računa, `Esc` briše, `Backspace` briše znak
- Istorija računa u desnoj koloni; klik na zapis ubacuje njegov rezultat u tekući izraz
- „Obriši sve" prazni istoriju (uz potvrdu)
- Dimenzije i pozicija prozora se pamte između pokretanja
- Svetla i tamna tema, prati podešavanje Windowsa

## Šta ne radi (svesno izostavljeno)

- Nema naučnih funkcija (sin, log, koren, stepen) — traženo je „jednostavan, čist interfejs"
- Nema memorije (M+, M−, MR, MC) — istorija pokriva istu potrebu bolje
- Nema eksponentnog zapisa **na ulazu** (`1e9` je greška); na izlazu ga ima kad broj izađe iz čitljivog opsega
- Nema automatskog ažuriranja, nema potpisivanja instalera

## Odluke koje nisu očigledne

### Procenat je postfiksni operator „podeli sa 100"

`50%` je `0.5`, `200*15%` je `30`, `2+3%` je `2.03`.

Windows kalkulator radi drugačije — tamo `50+10%` daje `55`, jer se procenat
računa u odnosu na levu stranu izraza. To ponašanje zavisi od operatora ispred i
nije definisano za `(2+3)%` ili `5*(10%+2)`. Pošto ovde postoji pun izraz sa
zagradama, kontekstualno tumačenje bi bilo i nepredvidivo i teško za testiranje.
Odabrano je pravilo koje uvek znači istu stvar.

### Računanje je odvojeno od svega ostalog

`renderer/racunanje.js` nema DOM, nema Electron, nema fajl sistem — samo
tokenizer, shunting-yard i evaluator. Zato se testira običnim `node`-om, bez
pokretanja aplikacije. Isti fajl se učitava i u rendereru (`<script>`) i u testu
(`require`), preko UMD omotača.

### Renderer ne dira disk

`contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`. Renderer
dobija tačno četiri funkcije preko `contextBridge` i ništa više. Glavni proces je
jedini vlasnik podataka i jedini koji piše po disku. Ovo nije bilo traženo, ali
je jedini način da se `nodeIntegration` drži isključen, a Electron aplikacija bez
toga je otvorena rana.

### JSON, ne SQLite

Traženo je „SQLite ili JSON". Izabran je JSON jer:

- istorija je ograničena na 200 zapisa — nema šta da se indeksira
- `better-sqlite3` je nativni modul, traži `electron-rebuild` i komplikuje pakovanje
- ceo fajl staje u memoriju i čita se jednom, pri pokretanju

Upis je atomičan: prvo u `podaci.json.tmp`, pa `rename` preko pravog fajla. Prekid
struje usred upisa ne ostavlja polupraznu istoriju.

### Oštećen fajl se sklanja, ne prepisuje

Ako se `podaci.json` ne parsira ili nema očekivan oblik, preimenuje se u
`podaci.json.osteceno` i kreće se od praznog stanja. Aplikacija se ne ruši, a
podaci ostaju na disku ako korisnik hoće da ih spašava ručno.

### Format podataka

```json
{
  "verzija": 1,
  "istorija": [
    { "izraz": "2+2", "rezultat": "4", "vreme": 1754123456789 }
  ],
  "prozor": { "sirina": 880, "visina": 660, "x": 100, "y": 60 }
}
```

Lokacija: `%APPDATA%\Kalkulator\podaci.json`. Puna putanja se prikazuje u dnu
desne kolone — korisnik uvek zna gde su mu podaci.

Najnoviji zapis je prvi. Preko 200 zapisa najstariji se tiho odbacuju.

## Greške

Sve poruke su srpske i prikazuju se crveno iznad izraza. Izraz koji ne može da se
izračuna **ne ulazi u istoriju**.

| Poruka | Kada |
|---|---|
| `Prazan izraz` | ništa nije uneto |
| `Neispravan izraz` | operator bez desne strane, prazne zagrade |
| `Neispravan broj` | dve decimalne tačke, sama tačka |
| `Nepoznat znak: x` | znak koji ne pripada izrazu |
| `Deljenje nulom` | delilac je 0 |
| `Nezatvorena zagrada` | `(` bez para |
| `Visak zatvorene zagrade` | `)` bez para |
| `Broj je prevelik` | rezultat izlazi iz opsega |

Dok se kuca, nedovršen izraz **nije** greška — polje sa međurezultatom se samo
isprazni.

## Provera ispravnosti

`kalkulator/samoprovera.js`, bez frejmvorka i bez zavisnosti, po istom obrascu
kao „Smanji slike": `proveri(naziv, dobio, ocekivano)`, izlazni kod 0 ili 1.

```bash
cd kalkulator && npm test
```

Pokriva računanje (prioriteti, zagrade, unarni znak, procenat, sve poruke o
greškama), formatiranje brojeva i skladište (upis, čitanje, ograničenje na 200,
pamćenje prozora, oporavak od oštećenog fajla).

Ono što se ne može proveriti bez Electrona — dugmad, tastatura, istorija u
prozoru, stvarni upis u `userData` — pokriva `kalkulator/provera-ui.js`:

```bash
cd kalkulator && npm run test:ui
```

Pokreće pravu aplikaciju sa `userData` u privremenom folderu, klikće po pravom
prozoru i na kraju snimi sliku. 16 provera. Nijedna od ove dve skripte ne ulazi
u instaler.

## Poznata ograničenja

- Instaler nije digitalno potpisan — Windows SmartScreen će prikazati upozorenje
  pri prvom pokretanju. Potpis košta i traži sertifikat.
- Istorija se drži cela u memoriji. Sa 200 zapisa to je nekoliko kilobajta.
- Aritmetika je `double` kao svuda u JavaScriptu. `formatiraj()` odseca smeće na
  12 značajnih cifara, pa `0.1+0.2` piše `0.3`, ali kalkulator nije za
  finansijske proračune gde svaka para mora da se poklopi.
- Nema više prozora — drugo pokretanje samo izvlači postojeći u prvi plan.
