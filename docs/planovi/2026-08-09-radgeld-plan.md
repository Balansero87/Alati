# RadGeld — plan izrade

> **Za agente:** koraci su čekirani (`- [ ]`). Radi zadatak po zadatak, samoprovera
> mora da prođe pre svakog komita.

Datum: 2026-08-09
Specifikacija: `docs/specifikacije/2026-08-09-radgeld-specifikacija.md`

**Cilj:** alat koji beleži vožnje biciklom, pešice i gradskim prevozom i sabira
koliko je novca ušteđeno time što auto nije korišćen.

**Pristup:** jedan samostalan HTML fajl. Prvo čiste funkcije i njihove tvrdnje,
pa tek onda interfejs — isti redosled kao kod kalkulatora, jer je logika ovde
jedina stvar koja može tiho da bude pogrešna.

## Uslov pre početka

Folder se još zove `RadGeld/`; treba `Radgeld/`. Preimenovanje ne može iz sesije
čiji je to radni direktorijum. Uradi ovo pre prvog koraka, iz drugog terminala:

```bash
cd "E:/Program Files/Claude code" && mv RadGeld __tmp && mv __tmp Radgeld
```

## Opšta pravila (važe za svaki zadatak)

- Jedan fajl: `Radgeld/radgeld.html`. Inline CSS, jedan `<script>`, jedan IIFE.
- ES5: `var`, deklaracije funkcija. Bez `let`, `const`, strelica, template
  literala, modula, klasa.
- Nula zavisnosti, bez build koraka. **Nijedan `fetch`, nijedan spoljni resurs.**
- Svi vidljivi stringovi i svi komentari na srpskom, latinica.
- Ključ u `localStorage`: `radGeld.v1`, svaki pristup u `try/catch`.
- Zaokruživanje samo pri prikazu. Zbirovi se sabiraju iz nezaokruženih vrednosti.

## Kako se pokreće provera

`#hash` se u nekim okruženjima gubi, a browser panel ne parsira ponovo već
učitan `file://`. Zato:

```js
fetch('radgeld.html?v=' + Date.now())
  .then(function (r) { return r.text(); })
  .then(function (h) { document.open(); document.write(h); document.close(); });
```

pa `window.samoprovera()` iz konzole. Ručno: `radgeld.html#test`.

## Mapa funkcija

Sve u jednom IIFE. Čiste (bez DOM-a, bez `localStorage`) su prvih devet — one
se i testiraju:

```
uBroj(x)                      -> broj      "3,5" i "3.5" -> 3.5, inače NaN
sanirajPostavke(p)            -> postavke  popunjava neispravno podrazumevanim
cenaGorivaPoKm(p)             -> broj
cenaAutaPoKm(p)               -> broj
trosakAutom(v, p)             -> broj
trosakAlternative(v)          -> broj
usteda(v, p)                  -> broj      sme da bude negativna
co2Usteda(v, p)               -> broj      kilogrami
zbir(voznje, p)               -> {novac, km, co2}
filtriraj(voznje, prefiks)    -> niz       poređenje po "YYYY" ili "YYYY-MM"
grupisiPoMesecu(voznje, p)    -> [{kljuc, naziv, stavke, novac}]
formatiraj(broj, valuta)      -> string    "3,42 €"
dodajVoznju(stanje, v)        -> stanje    najnovija prva, kapa 500
procitajUvoz(tekst)           -> {ok, stanje, greska}
ucitaj() / sacuvaj(stanje)                 localStorage, try/catch
prikazi()                                  jedina funkcija koja crta
```

---

### 1. Skelet, samoprovera pre svega ostalog

**Fajl:** kreiraj `Radgeld/radgeld.html`

Prvo runner, pa tek onda išta što on proverava — inače se prve tvrdnje pišu
naslepo.

- [ ] **Korak 1:** HTML skelet — `<meta charset="utf-8">`, `<title>RadGeld</title>`,
      `<meta name="viewport">`, inline `<style>`, jedan `<script>` sa IIFE.
- [ ] **Korak 2:** helper i runner unutar IIFE:

```js
var tvrdnje = [];
function proveri(naziv, dobio, ocekivano) {
  var a = JSON.stringify(dobio), b = JSON.stringify(ocekivano);
  tvrdnje.push({ naziv: naziv, prosao: a === b, dobio: a, ocekivano: b });
}
function samoprovera() {
  tvrdnje = [];
  sveTvrdnje();                       // popunjava se u narednim zadacima
  var palo = 0, i, red, html = '';
  for (i = 0; i < tvrdnje.length; i++) {
    red = tvrdnje[i];
    if (!red.prosao) palo++;
    html += '<div class="' + (red.prosao ? 'ok' : 'palo') + '">' +
            (red.prosao ? 'OK  ' : 'PALO ') + red.naziv +
            (red.prosao ? '' : '  dobio: ' + red.dobio +
                               '  ocekivano: ' + red.ocekivano) + '</div>';
  }
  var rezime = palo === 0 ? 'OK ' + tvrdnje.length + '/' + tvrdnje.length
                          : 'PALO ' + palo + '/' + tvrdnje.length;
  document.title = rezime;
  document.body.innerHTML = '<pre>' + rezime + '</pre>' + html;
  return rezime;
}
window.samoprovera = samoprovera;
if (location.hash === '#test') samoprovera();
```

- [ ] **Korak 3:** privremeno `function sveTvrdnje() { proveri('runner radi', 1, 1); }`
- [ ] **Korak 4:** otvori `radgeld.html#test` → naslov taba mora reći `OK 1/1`.
      Zatim namerno pokvari tvrdnju u `1, 2` i potvrdi `PALO 1/1`, pa vrati.
- [ ] **Korak 5:** komit

```bash
git add Radgeld/radgeld.html && git commit -m "feat(radgeld): skelet i samoprovera"
```

---

### 2. Formula — čiste funkcije

**Troši:** ništa. **Daje:** `uBroj`, `cenaGorivaPoKm`, `cenaAutaPoKm`,
`trosakAutom`, `trosakAlternative`, `usteda`, `co2Usteda`.

Novac se sabira u plivajućem zarezu, pa se izvedene vrednosti porede kroz
`blizu()`. Ovo nije popuštanje testa: po specifikaciji se zaokružuje samo pri
prikazu, pa bi tačno poređenje ovde merilo IEEE 754, a ne formulu.

- [ ] **Korak 1:** napiši tvrdnje koje padaju, u `sveTvrdnje()`:

```js
function blizu(a, b) { return Math.abs(a - b) < 1e-9; }
var P = { potrosnja: 8, cenaGoriva: 2, trosakPoKm: 0.1,
          parkingPoVoznji: 1, co2PoKm: 150, valuta: '\u20AC' };
proveri('blizu prihvata gresku', blizu(0.1 + 0.2, 0.3), true);
proveri('blizu nije slepa', blizu(1, 1.01), false);
proveri('uBroj zarez', uBroj('3,5'), 3.5);
proveri('uBroj tacka', uBroj('3.5'), 3.5);
proveri('uBroj prazno', isNaN(uBroj('')), true);
proveri('gorivo po km', blizu(cenaGorivaPoKm(P), 0.16), true);
proveri('auto po km', blizu(cenaAutaPoKm(P), 0.26), true);
proveri('trosak autom', blizu(trosakAutom({ km: 10 }, P), 3.6), true);
proveri('alternativa bicikl', trosakAlternative({ nacin: 'bicikl', cenaKarte: 9 }), 0);
proveri('alternativa prevoz', trosakAlternative({ nacin: 'prevoz', cenaKarte: 1.2 }), 1.2);
proveri('usteda bicikl', blizu(usteda({ km: 10, nacin: 'bicikl' }, P), 3.6), true);
proveri('usteda negativna',
        blizu(usteda({ km: 1, nacin: 'prevoz', cenaKarte: 5 }, P), -3.74), true);
proveri('co2 u kg', blizu(co2Usteda({ km: 10 }, P), 1.5), true);
```

- [ ] **Korak 2:** pokreni — mora `PALO 13/13` uz „is not defined".
- [ ] **Korak 3:** implementiraj tačno po specifikaciji. `trosakAlternative`
      vraća `cenaKarte` samo za `'prevoz'`, inače `0`. Ušteda se **ne** seče na
      nulu — tvrdnja „usteda negativna" postoji baš zato da to zaključa.
- [ ] **Korak 4:** pokreni — `OK 13/13`.
- [ ] **Korak 5:** `git commit -m "feat(radgeld): formula ustede"`

---

### 3. Sanitizacija postavki

Neispravna postavka ne sme da sruši račun, ali polje i `localStorage` čuvaju ono
što je korisnik ukucao — brisanje polja radi prekucavanja ne sme da se bori sa
korisnikom. Zato se sanira **na ulazu u račun**, ne pri kucanju.

- [ ] **Korak 1:** tvrdnje koje padaju:

```js
proveri('prazna potrosnja -> podrazumevana', sanirajPostavke({ potrosnja: '' }).potrosnja, 7.5);
proveri('negativna potrosnja -> podrazumevana', sanirajPostavke({ potrosnja: -3 }).potrosnja, 7.5);
proveri('nula trosak po km ostaje', sanirajPostavke({ trosakPoKm: 0 }).trosakPoKm, 0);
proveri('smece u parkingu -> nula', sanirajPostavke({ parkingPoVoznji: 'abc' }).parkingPoVoznji, 0);
proveri('valuta prazna -> evro', sanirajPostavke({ valuta: '' }).valuta, '\u20AC');
proveri('zarez u ceni goriva', sanirajPostavke({ cenaGoriva: '1,75' }).cenaGoriva, 1.75);
proveri('ne dira original', (function () {
  var p = { potrosnja: -1 }; sanirajPostavke(p); return p.potrosnja;
}()), -1);
```

- [ ] **Korak 2:** pokreni, potvrdi da pada.
- [ ] **Korak 3:** implementiraj. Podrazumevano: `potrosnja` 7.5, `cenaGoriva`
      1.75 (moraju biti **strogo pozitivni**), `trosakPoKm` 0.10 i `co2PoKm` 150
      i `parkingPoVoznji` 0 (dozvoljena je nula, odbija se samo NaN i negativno),
      `valuta` `'€'`. Vraća **nov** objekat.
- [ ] **Korak 4:** pokreni — sve prolazi.
- [ ] **Korak 5:** `git commit -m "feat(radgeld): sanitizacija postavki"`

---

### 4. Zbirovi, filtriranje, grupisanje po mesecu, format

`blizu` i `P` su već definisani u zadatku 2 i sve tvrdnje žive u istoj
`sveTvrdnje()` — ne definiši ih ponovo. `V` odavde koristi i zadatak 5.

- [ ] **Korak 1:** tvrdnje koje padaju:

```js
var V = [{ id: 3, datum: '2026-08-05', km: 10, nacin: 'bicikl', cenaKarte: 0 },
         { id: 2, datum: '2026-08-01', km: 4,  nacin: 'pesice', cenaKarte: 0 },
         { id: 1, datum: '2026-07-20', km: 6,  nacin: 'prevoz', cenaKarte: 1 }];
proveri('filtriraj mesec', filtriraj(V, '2026-08').length, 2);
proveri('filtriraj godinu', filtriraj(V, '2026').length, 3);
proveri('filtriraj promasaj', filtriraj(V, '2025').length, 0);
proveri('zbir km', zbir(V, P).km, 20);
// 3.6 (bicikl) + 2.04 (pesice) + 1.56 (prevoz: 2.56 minus karta 1) = 7.2
proveri('zbir novca', blizu(zbir(V, P).novac, 7.2), true);
proveri('karta se oduzima od zbira',
        blizu(zbir([V[2]], P).novac, 1.56), true);
proveri('zbir praznog', zbir([], P), { novac: 0, km: 0, co2: 0 });
proveri('grupa broj meseci', grupisiPoMesecu(V, P).length, 2);
proveri('grupa najnoviji prvi', grupisiPoMesecu(V, P)[0].kljuc, '2026-08');
proveri('naziv meseca', grupisiPoMesecu(V, P)[0].naziv, 'avgust 2026.');
proveri('zbir grupe', blizu(grupisiPoMesecu(V, P)[0].novac, 5.64), true);
proveri('format zarez', formatiraj(3.418, '\u20AC'), '3,42 \u20AC');
proveri('format negativan', formatiraj(-1.2, '\u20AC'), '-1,20 \u20AC');
```

- [ ] **Korak 2:** pokreni, potvrdi pad.
- [ ] **Korak 3:** implementiraj. `filtriraj` poredi prefiks datuma
      (`v.datum.indexOf(prefiks) === 0`) — bez `Date`, jer je datum već
      `YYYY-MM-DD` i leksičko poređenje je tačno. Nazivi meseci su niz od
      dvanaest stringova: januar…decembar. `formatiraj` koristi `toFixed(2)` pa
      zamenjuje tačku zarezom.
- [ ] **Korak 4:** pokreni — sve prolazi.
- [ ] **Korak 5:** `git commit -m "feat(radgeld): zbirovi i grupisanje po mesecu"`

---

### 5. Stanje: dodavanje, kapa, čuvanje

- [ ] **Korak 1:** tvrdnje koje padaju:

```js
proveri('dodata je prva', dodajVoznju({ voznje: V.slice() },
        { id: 9, datum: '2026-09-01', km: 1, nacin: 'bicikl' }).voznje[0].id, 9);
proveri('kapa 500', (function () {
  var s = { voznje: [] }, i;
  for (i = 0; i < 505; i++) s = dodajVoznju(s, { id: i, datum: '2026-08-01', km: 1, nacin: 'bicikl' });
  return s.voznje.length;
}()), 500);
proveri('uvoz smeca', procitajUvoz('{ ovo nije json').ok, false);
proveri('uvoz praznog niza', procitajUvoz('{"verzija":1,"voznje":[],"postavke":{}}').ok, true);
proveri('uvoz bez voznji polja', procitajUvoz('{"verzija":1}').ok, false);
proveri('uvoz vraca sanirane postavke',
        procitajUvoz('{"verzija":1,"voznje":[],"postavke":{}}').stanje.postavke.potrosnja, 7.5);
```

- [ ] **Korak 2:** pokreni, potvrdi pad.
- [ ] **Korak 3:** implementiraj `dodajVoznju` (novi niz, sortiran po `datum`
      opadajuće pa `id` opadajuće, `slice(0, 500)`) i `procitajUvoz`
      (`JSON.parse` u `try/catch`, obavezno polje `voznje` mora biti niz, inače
      `{ ok: false, greska: 'Fajl nije RadGeld izvoz.' }`).
- [ ] **Korak 4:** dodaj `ucitaj()` i `sacuvaj()` — `localStorage` u `try/catch`,
      nepostojeći ili neispravan ključ daje podrazumevano stanje umesto pada.
      Ove dve se ne testiraju tvrdnjama, proveravaju se u zadatku 8.
- [ ] **Korak 5:** pokreni — sve prolazi. `git commit -m "feat(radgeld): stanje, kapa i uvoz"`

---

### 6. Interfejs: unos i živi pregled

**Troši:** sve iz zadataka 2–5.

- [ ] **Korak 1:** forma — datum (`<input type="date">`, podrazumevano danas),
      kilometri, tri dugmeta za način, opis, i **cena karte koja se prikazuje
      samo kad je način `prevoz`**.
- [ ] **Korak 2:** ispod polja red „Ušteda: —" koji se osvežava na `input`
      događaj, kroz `usteda()` + `formatiraj()`. Negativna vrednost dobija klasu
      `negativno` (crveno).
- [ ] **Korak 3:** dugme **Dodaj** — validira da su kilometri pozitivan broj i da
      datum postoji; poziva `dodajVoznju`, `sacuvaj`, `prikazi`; čisti km i opis,
      ostavlja datum i način.
- [ ] **Korak 4:** oznaka „tamo i nazad? upiši zbir kilometara" ispod polja za
      km. Odluka je jedan unos sa duplim kilometrima — zapis **nema** polje za
      povratak i ništa se ne udvostručuje u kodu.
- [ ] **Korak 5:** ručno u browseru: unesi 10 km biciklom, potvrdi da pregled
      pokazuje očekivanu uštedu i da red uđe u listu. Osveži stranicu i potvrdi
      da je zapis preživeo.
- [ ] **Korak 6:** `git commit -m "feat(radgeld): unos voznje sa zivim pregledom"`

---

### 7. Interfejs: istorija, zbirovi, postavke

- [ ] **Korak 1:** istorija iz `grupisiPoMesecu` — zaglavlje meseca sa zbirom, pa
      redovi: datum, oznaka načina, opis, km, ušteda. Prazno stanje objašnjava
      čemu alat služi.
- [ ] **Korak 2:** brisanje reda uz `confirm()`.
- [ ] **Korak 3:** tri kartice — ovaj mesec, ova godina, ukupno; svaka pokazuje
      novac, km i kg CO₂ (`filtriraj` + `zbir`).
- [ ] **Korak 4:** `<details>` sa postavkama; svaka promena zove `sacuvaj` pa
      `prikazi`, tako da se cela istorija odmah preračuna.
- [ ] **Korak 5:** dugmad **Izvezi** (Blob + `URL.createObjectURL`, `download`) i
      **Uvezi** (`FileReader` → `procitajUvoz`, uz `confirm` jer briše sve).
- [ ] **Korak 6:** ručno: promeni cenu goriva i potvrdi da se svi stari redovi
      promene. Izvezi, obriši sve, uvezi nazad, potvrdi da je stanje isto.
- [ ] **Korak 7:** `git commit -m "feat(radgeld): istorija, zbirovi, postavke, izvoz"`

---

### 8. Završna provera i dokumentacija

- [ ] **Korak 1:** `window.samoprovera()` → mora `OK n/n`. Zapiši tačan `n`.
- [ ] **Korak 2:** provera stila — **ovo ne sme ništa da ispiše**:

```bash
grep -nE "\blet\b|\bconst\b|=>" Radgeld/radgeld.html
```

- [ ] **Korak 3:** potvrdi da nema mreže — `grep -nE "fetch|XMLHttpRequest|https?://" Radgeld/radgeld.html`
      sme da pogodi samo blok sa uputstvom za osvežavanje u komentaru, ako je tu.
- [ ] **Korak 4:** `README.md` — sekcija (šta radi, putanja, **radi bez
      interneta**) i red u tabeli „Šta je gde".
- [ ] **Korak 5:** `CLAUDE.md` — uvod više ne kaže „tri alata"; dodaj sekciju
      RadGeld sa tačnim brojem tvrdnji i pravilima koja se ne smeju poništiti
      (ušteda sme da bude negativna; sanira se pri računu, ne pri kucanju).
- [ ] **Korak 6:** u planu čekiraj sve i dopiši ishod svakog zadatka.
- [ ] **Korak 7:** `git commit -m "docs: RadGeld u README i CLAUDE.md"`

---

### 9. Ikona i prečica — opciono, tek na zahtev

Specifikacija ovo ne traži. Ako zatreba: `napravi-ikonu.js` po uzoru na
kalkulatorov (bez biblioteke za slike) i prečica sa
`chrome.exe --app=file:///.../Radgeld/radgeld.html`. Prečica tvrdo kodira
apsolutnu putanju — ako se fajl pomeri, pravi se ponovo.

## Šta se menja van foldera `Radgeld/`

- `README.md` — sekcija i red u tabeli
- `CLAUDE.md` — nova sekcija, ispravljen uvod
- `docs/specifikacije/`, `docs/planovi/` — već napisani

## Ako se nastavlja

- Ponavljajuće vožnje (na posao i nazad, radnim danima) jednim potezom
- Cilj za mesec i traka napretka
- Više vozila sa različitom potrošnjom
