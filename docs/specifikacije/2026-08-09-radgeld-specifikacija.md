# RadGeld — specifikacija

Datum: 2026-08-09
Status: nacrt, čeka odobrenje pre plana implementacije

## Problem

Kad odeš biciklom, pešice ili gradskim prevozom umesto autom, ušteda je stvarna
ali nevidljiva — nigde se ne sabira. RadGeld beleži takve vožnje i pokazuje
koliko je novca ostalo u džepu: po vožnji, po mesecu i ukupno.

## Isporuka

Jedan samostalan fajl: `Radgeld/radgeld.html`. Duplo klikni pa radi sa diska.
Inline CSS, jedan IIFE, ES5, nula zavisnosti, bez build koraka. **UI je na
engleskom** — izuzetak od pravila iz `CLAUDE.md`, tražen izričito; kod i
komentari ostaju na srpskom.

Uz njega ide i PWA omotač — `manifest.webmanifest`, `sw.js` i dve PNG ikone
(`napravi-ikone.js`) — da bi alat mogao na početni ekran telefona i radio bez
signala. Nema druge kopije HTML-a: omotač služi baš `radgeld.html`, pa pravilo
o dva identična fajla iz prevodioca ovde **ne** važi. Servisni radnik je
keš-prvi i traži https (ili localhost).

**Bez mreže** — nijedan `fetch`, nijedan `XMLHttpRequest`, nijedan spoljni
resurs se ne učitava. Jedini izuzetak je obična veza ka `clever-tanken.de` u
postavkama: ništa ne povlači i ništa ne šalje dok korisnik sam ne klikne, pa
alat i dalje radi offline i sa `file://`.

## Model podataka

Sve u `localStorage` pod ključem `radGeld.v1`, u try/catch (privatni režim).
Jedan objekat:

```
{
  verzija: 1,
  postavke: {
    potrosnja: 7.5,      // l/100 km
    cenaGoriva: 2.20,    // po litru
    trosakPoKm: 0.10,    // održavanje, gume, amortizacija
    parkingPoVoznji: 0,  // fiksno po vožnji autom
    co2PoKm: 150,        // g/km, za informativni prikaz
    valuta: "€",
    cenaGorivaIzmenjena: 1754... // ms, kad je korisnik poslednji put dirao cenu
  },
  voznje: [ { id, datum, opis, km, nacin, cenaKarte, snimak } ]
}
```

- `id` — vreme kreiranja u ms, koristi se za brisanje i za stabilan redosled.
- `datum` — `YYYY-MM-DD`, unosi se, ne izvodi se iz `id`.
- `km` — pozitivan broj, decimale dozvoljene.
- `nacin` — `"bicikl"`, `"pesice"` ili `"prevoz"`.
- `cenaKarte` — samo za `"prevoz"`, inače 0.
- `snimak` — postavke koje su važile u trenutku upisa; zamrznute.
- `cenaGorivaIzmenjena` — postavlja se **samo** kad korisnik rukom promeni cenu
  goriva. Prazno znači „nikad postavljena", što se broji kao zastarelo.

**Istorija se ne preračunava.** Svaka vožnja nosi `snimak` postavki iz trenutka
kad je upisana i uvek se računa po njemu — ono što se već desilo desilo se po
tadašnjoj ceni. Nova postavka važi tek za vožnje upisane posle nje, pa dve
vožnje u istoj listi legitimno mogu imati različitu cenu po kilometru.
Vožnja bez `snimka` (zapis stariji od ove izmene) pada nazad na trenutne
postavke umesto da pukne, a `migriraj()` joj pri prvom učitavanju dodeli tadašnje
postavke i odmah to upiše — od tog trenutka je i ona zamrznuta. Vreme izmene
cene se pritom **ne izmišlja**: nije poznato, pa ostaje prazno.

Kapa: 500 vožnji, najnovija prva; preko toga se najstarija odbacuje. Rezervna
kopija: **Izvezi** / **Uvezi** rade sa istim JSON-om kao fajl; uvoz zamenjuje
sve, uz potvrdu.

## Formula

Pure funkcije, jedina stvar vredna testiranja:

```
postavkeZa(v, p)   = v.snimak ? sanirajPostavke(v.snimak) : p
cenaGorivaPoKm(p)  = p.potrosnja / 100 * p.cenaGoriva
cenaAutaPoKm(p)    = cenaGorivaPoKm(p) + p.trosakPoKm
trosakAutom(v, p)  = v.km * cenaAutaPoKm(q) + q.parkingPoVoznji, q = postavkeZa(v, p)
trosakAlternative(v) = v.nacin === "prevoz" ? v.cenaKarte : 0
usteda(v, p)       = trosakAutom(v, p) - trosakAlternative(v)
co2Usteda(v, p)    = v.km * postavkeZa(v, p).co2PoKm / 1000    // kg

starostCene(izmenjena, sada) = { poznato, dana, zastarelo }   // dana > 30
tekstStarosti(s)   = string    // vidi Ekrani
```

`postavkeZa` je jedino mesto gde se bira između snimka i trenutnih postavki —
zato `usteda`, `zbir` i `grupisiPoMesecu` nisu menjali potpis. Dani se broje
kalendarski, ne po 24 sata: cena postavljena sinoć u 23h je „juče", ne „danas".

- Ušteda **sme biti negativna** — skupa karta za kratku relaciju je gubitak i
  prikazuje se crveno. Ne sabija se na nulu; sabiranje ostaje pošteno.
- Postavka koja nije pozitivan broj računa se kao 0 (`parkingPoVoznji`,
  `trosakPoKm`) odnosno kao podrazumevana vrednost (`potrosnja`, `cenaGoriva`),
  ali polje i `localStorage` zadržavaju ono što je korisnik ukucao — brisanje
  polja radi prekucavanja ne sme da se bori sa korisnikom.
- Zaokruživanje samo pri prikazu, na 2 decimale; zbirovi se sabiraju iz
  nezaokruženih vrednosti.

## Ekrani

Jedna stranica, tri sekcije jedna ispod druge, bez rutiranja.

**1. Unos.** Datum (podrazumevano danas), kilometri, način (tri dugmeta),
opis (opciono), cena karte (vidljiva samo kad je način „prevoz"). Ispod polja
živi pregled: „Ušteda: 3,42 €" koji se osvežava dok se kuca. Dugme **Dodaj**.

**2. Istorija.** Lista vožnji, najnovija gore, grupisana po mesecu sa zbirom u
zaglavlju grupe. Svaki red: datum, ikonica načina, opis, km, ušteda. Dugme za
brisanje reda, uz potvrdu. Prazno stanje objašnjava šta alat radi.

**3. Zbir.** Kartice: ovaj mesec, ova godina, ukupno — novac, kilometri, kg CO₂.

**Postavke** su sklopljene ispod (`<details>`), otvaraju se po potrebi. Promena
važi za vožnje upisane od tog trenutka; već upisane se ne diraju.

Ispod polja za cenu goriva stoji red o starosti cene:

| Stanje | Tekst | Izgled |
|---|---|---|
| nikad postavljena | `Not set yet` | narandžasto |
| isti dan | `Last updated today` | obično |
| jedan dan | `Last updated yesterday` | obično |
| 2–30 dana | `Last updated N days ago` | obično |
| preko 30 dana | `Price is N days old — please check` | narandžasto |

Uz taj red ide i veza **Current prices at clever-tanken.de**, `target="_blank"`
sa `rel="noopener noreferrer"`.

## Samoprovera

`radgeld.html#test` zamenjuje stranicu rezultatima i piše `OK n/n` ili `PALO
n/n` u naslov taba; isti runner je izložen kao `window.samoprovera()` jer neka
okruženja gube `#hash`. Helper je `proveri(naziv, dobio, ocekivano)`, poređenje
preko `JSON.stringify`. Pokriva sve iz sekcije Formula, plus sanitizaciju
postavki, mesečno grupisanje, uvoz neispravnog JSON-a, prvenstvo snimka nad
trenutnim postavkama, granicu od 30 dana i migraciju zapisa bez snimka.

## Ograničenja

Bez mape i GPS-a — kilometraža se unosi ručno. Jedno vozilo. `valuta` je samo
oznaka uz broj, bez kursne konverzije. Vožnja na posao i nazad je **jedan unos
sa duplim kilometrima** — korisnik sam upiše zbir; zapis nema pojam povratka.
