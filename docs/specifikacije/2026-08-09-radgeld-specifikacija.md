# RadGeld — specifikacija

Datum: 2026-08-09
Status: nacrt, čeka odobrenje pre plana implementacije

## Problem

Kad odeš biciklom, pešice ili gradskim prevozom umesto autom, ušteda je stvarna
ali nevidljiva — nigde se ne sabira. RadGeld beleži takve vožnje i pokazuje
koliko je novca ostalo u džepu: po vožnji, po mesecu i ukupno.

## Isporuka

Jedan samostalan fajl: `Radgeld/radgeld.html`. Duplo klikni pa radi sa diska.
Inline CSS, jedan IIFE, ES5, nula zavisnosti, bez build koraka, UI i komentari
na srpskom (latinica). **Bez mreže** — nijedan `fetch`, nijedan spoljni resurs.

## Model podataka

Sve u `localStorage` pod ključem `radGeld.v1`, u try/catch (privatni režim).
Jedan objekat:

```
{
  verzija: 1,
  postavke: {
    potrosnja: 7.5,      // l/100 km
    cenaGoriva: 1.75,    // po litru
    trosakPoKm: 0.10,    // održavanje, gume, amortizacija
    parkingPoVoznji: 0,  // fiksno po vožnji autom
    co2PoKm: 150,        // g/km, za informativni prikaz
    valuta: "€"
  },
  voznje: [ { id, datum, opis, km, nacin, cenaKarte } ]
}
```

- `id` — vreme kreiranja u ms, koristi se za brisanje i za stabilan redosled.
- `datum` — `YYYY-MM-DD`, unosi se, ne izvodi se iz `id`.
- `km` — pozitivan broj, decimale dozvoljene.
- `nacin` — `"bicikl"`, `"pesice"` ili `"prevoz"`.
- `cenaKarte` — samo za `"prevoz"`, inače 0.

Nema izračunatih polja u zapisu. Ušteda se uvek računa iz trenutnih postavki,
pa promena cene goriva odmah menja ceo prikaz istorije. Kapa: 500 vožnji,
najnovija prva; preko toga se najstarija odbacuje. Rezervna kopija: **Izvezi** /
**Uvezi** rade sa istim JSON-om kao fajl; uvoz zamenjuje sve, uz potvrdu.

## Formula

Pure funkcije, jedina stvar vredna testiranja:

```
cenaGorivaPoKm(p)  = p.potrosnja / 100 * p.cenaGoriva
cenaAutaPoKm(p)    = cenaGorivaPoKm(p) + p.trosakPoKm
trosakAutom(v, p)  = v.km * cenaAutaPoKm(p) + p.parkingPoVoznji
trosakAlternative(v) = v.nacin === "prevoz" ? v.cenaKarte : 0
usteda(v, p)       = trosakAutom(v, p) - trosakAlternative(v)
co2Usteda(v, p)    = v.km * p.co2PoKm / 1000        // kg
```

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

**Postavke** su sklopljene ispod (`<details>`), otvaraju se po potrebi.
Promena bilo koje postavke odmah preračunava istoriju i zbirove.

## Samoprovera

`radgeld.html#test` zamenjuje stranicu rezultatima i piše `OK n/n` ili `PALO
n/n` u naslov taba; isti runner je izložen kao `window.samoprovera()` jer neka
okruženja gube `#hash`. Helper je `proveri(naziv, dobio, ocekivano)`, poređenje
preko `JSON.stringify`. Pokriva sve iz sekcije Formula, plus sanitizaciju
postavki, mesečno grupisanje i uvoz neispravnog JSON-a.

## Ograničenja

Bez mape i GPS-a — kilometraža se unosi ručno. Jedno vozilo. `valuta` je samo
oznaka uz broj, bez kursne konverzije. Vožnja na posao i nazad je **jedan unos
sa duplim kilometrima** — korisnik sam upiše zbir; zapis nema pojam povratka.
