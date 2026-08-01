# Smanji slike — plan implementacije

> **Za agentske izvršioce:** OBAVEZAN SUB-SKILL: koristi superpowers:subagent-driven-development (preporučeno) ili superpowers:executing-plans da bi plan izveo zadatak po zadatak. Koraci koriste checkbox (`- [ ]`) sintaksu za praćenje.

**Cilj:** Napraviti `smanji-slike.html` — samostalan alat koji u browseru menja dimenzije i kompresuje slike, batch, bez mreže i bez ograničenja.

**Arhitektura:** Jedan HTML fajl, inline CSS, jedan IIFE. Cevovod po slici je `ucitajSliku` → `racunajDimenzije` → `nacrtaj` → `uKodiraj`. Sve četiri su nezavisne jedinice: prve tri su čiste ili skoro čiste funkcije bez DOM zavisnosti, pa su testabilne direktno. ZIP se piše ručno, store-only. Obrada je sekvencijalna.

**Tech stack:** Nema. Canvas 2D API, Blob, FileReader, `localStorage`. ES5 sintaksa, nula zavisnosti, bez build koraka.

**Spec:** `docs/superpowers/specs/2026-08-01-smanji-slike-design.md`
**Maketa:** `docs/superpowers/specs/2026-08-01-smanji-slike-playground.html` — u njoj već rade `racunajDimenzije`, `nacrtaj` i `uKodiraj` u prototipnom obliku; koristi je kao referencu za izgled i za očekivano ponašanje.

## Globalna ograničenja

- ES5 sintaksa: `var`, deklaracije funkcija. Bez `let`/`const`, strelica, template literala, `class`, destrukturiranja, spread-a, `async`/`await`.
- Nula zavisnosti. Nijedan `<script src>`, `<link href>` ka spolja, nijedan CDN, nijedan font sa mreže.
- **Nijedan mrežni poziv.** Bez `fetch`, `XMLHttpRequest`, `WebSocket`. Fajl mora da radi otvoren sa `file://`, offline.
- Sav UI tekst i **svi komentari u kodu na srpskom, latinica**.
- Sve u jednom fajlu: `smanji-slike.html` u rootu projekta.
- Ne dirati `prevodilac.html` ni `prevodilac-web/`.
- CSS promenljive, boje, radius i senke preuzeti iz `prevodilac.html` (linije 17–44) da alati izgledaju kao ista porodica.
- Akcent: `hsl(222 85% 56%)` u svetloj temi, `hsl(222 100% 68%)` u tamnoj.

## Napomena o gitu i testovima

Ovaj direktorijum **nije git repozitorijum** (potvrđeno u `CLAUDE.md`). Koraci „Commit" u nastavku važe samo ako prvo pokreneš:

```bash
git init && git add -A && git commit -m "chore: početno stanje"
```

Ako to ne uradiš, preskoči korake sa commit-om; ostatak plana radi nepromenjen.

Projekat nema test framework i ne sme da ga dobije (nula zavisnosti). Zato Zadatak 1 uvodi **ugrađenu samoproveru** koja se pokreće samo kad adresa ima `#test` — obična funkcija sa tvrdnjama koja ispisuje rezultat. Nevidljiva je u normalnoj upotrebi. Time čiste funkcije (`racunajDimenzije`, `crc32`, `napraviZip`, `uUtf8`) dobijaju pravi automatski test, a ostalo se proverava ručno u browseru.

Komanda za pokretanje testova je svuda ista:

```bash
start "" "E:\Program Files\Claude code\smanji-slike.html#test"
```

Ako je stranica već otvorena na `#test`, dovoljno je osvežiti (F5).

---

## Struktura fajla

Jedan fajl, `smanji-slike.html`, ovim redom:

| Deo | Odgovornost |
|---|---|
| `<head>` / `<style>` | CSS promenljive, tema, raspored, tabela, šahovnica |
| `<body>` markup | zaglavlje, traka kontrola, drop zona, kartica pregleda, kartica rezultata, ZIP traka |
| IIFE: blok „podaci" | `DEFAULTS`, `state`, `$()` |
| IIFE: blok „čiste funkcije" | `racunajDimenzije`, `mimeZa`, `alfaMoguca`, `uUtf8`, `crc32`, `napraviZip`, `kb`, `preimenuj` |
| IIFE: blok „slike" | `ucitajSliku`, `nacrtaj`, `uKodiraj` |
| IIFE: blok „obrada" | `obradiFajl`, `obradiSve`, red čekanja, progres |
| IIFE: blok „UI" | render tabele, event handleri, `localStorage` |
| IIFE: blok „samoprovera" | `samoprovera()` iza `#test` |

Granica koja se poštuje kroz ceo plan: **čiste funkcije ne smeju da diraju DOM ni `state`.** Sve što im treba stiže kao argument. To je jedini razlog zbog kog se mogu testirati bez browsera oko sebe.

---

## Zadatak 1: Kostur, tema i samoprovera

**Fajlovi:**
- Kreirati: `smanji-slike.html`

**Interfejsi:**
- Koristi: ništa
- Daje: `proveri(naziv, dobio, ocekivano)` i `samoprovera()` — svi kasniji zadaci dodaju tvrdnje unutar `samoprovera()`.

- [ ] **Korak 1: Napiši kostur fajla**

Kreiraj `smanji-slike.html` sa `<!DOCTYPE html>`, `<html lang="sr">`, `charset=utf-8`, viewport meta tagom i naslovom „Smanji slike".

U `<style>` prekopiraj blok CSS promenljivih iz `prevodilac.html` (linije 17–44), pa promeni `--accent` na `hsl(222 85% 56%)` u svetloj i `hsl(222 100% 68%)` u tamnoj temi. Zadrži `--bg`, `--panel`, `--border`, `--text`, `--muted`, `--ok`, `--err`, `--shadow` nepromenjene, kao i `@media (prefers-color-scheme: dark)` blok.

Dodaj osnovni raspored: `body` sa `max-width: 1040px` omotačem, `h1` „Smanji slike", podnaslov „Sve ostaje na tvom uređaju. Bez uploada, bez naloga, bez ograničenja."

- [ ] **Korak 2: Dodaj prazan markup za sve delove**

Ispod zaglavlja, ovim redom, sa praznim sadržajem:

```html
<div class="bar" id="traka"></div>
<div class="drop" id="drop">Prevuci slike ovde ili <b>izaberi fajlove</b> &nbsp;·&nbsp; JPG, PNG, WEBP, GIF</div>
<input type="file" id="fajlovi" multiple accept="image/*" hidden>
<div class="prog hidden" id="prog"><i></i></div>
<div class="card"><div class="card-head"><span>Pregled</span><span id="pregledInfo"></span></div>
  <div class="canvas-wrap"><canvas id="cv"></canvas></div></div>
<div class="card"><div class="card-head"><span>Rezultati</span><span id="brojInfo"></span></div>
  <table><thead><tr><th></th><th>Fajl</th><th>Original</th><th>Novo</th><th>Ušteda</th><th></th></tr></thead>
  <tbody id="redovi"></tbody></table></div>
<div class="zipbar"><span id="zbir"></span><button class="primary" id="zip" disabled>Preuzmi sve (ZIP)</button></div>
```

Za CSS ovih delova (kartica, tabela, šahovnica iza pregleda, drop zona, progres traka) prekopiraj pravila iz makete `2026-08-01-smanji-slike-playground.html` — sve što je pod `.app ...` selektorima, bez `.app` prefiksa.

- [ ] **Korak 3: Napiši samoproveru sa jednom tvrdnjom koja pada**

Na kraju IIFE:

```js
  // ---- samoprovera: pokreće se samo kad adresa ima #test ----
  function samoprovera() {
    var pali = 0, ukupno = 0, redovi = [];

    function proveri(naziv, dobio, ocekivano) {
      ukupno++;
      var ok = JSON.stringify(dobio) === JSON.stringify(ocekivano);
      if (ok) pali++;
      redovi.push((ok ? 'OK   ' : 'PAO  ') + naziv +
        (ok ? '' : '\n       dobio: ' + JSON.stringify(dobio) +
                   '\n       očekivano: ' + JSON.stringify(ocekivano)));
    }

    // ---- tvrdnje ----
    proveri('kostur radi', 1 + 1, 3);

    // ---- ispis ----
    var pre = document.createElement('pre');
    pre.style.cssText = 'padding:20px;font:13px/1.7 ui-monospace,Consolas,monospace;white-space:pre-wrap';
    pre.textContent = pali + '/' + ukupno + ' prošlo\n\n' + redovi.join('\n');
    document.body.innerHTML = '';
    document.body.appendChild(pre);
    document.title = (pali === ukupno ? 'OK ' : 'PALO ') + pali + '/' + ukupno;
  }

  if (location.hash === '#test') { samoprovera(); return; }
```

Napomena: `return` na kraju IIFE prekida ostatak inicijalizacije, pa se u test režimu ne pokreće UI.

- [ ] **Korak 4: Pokreni i potvrdi da tvrdnja pada**

```bash
start "" "E:\Program Files\Claude code\smanji-slike.html#test"
```

Očekivano: stranica pokazuje `0/1 prošlo` i red `PAO  kostur radi`, naslov taba `PALO 0/1`. Ovim je potvrđeno da harness zaista prijavljuje pad, a ne da tiho prolazi.

- [ ] **Korak 5: Popravi tvrdnju i potvrdi da prolazi**

Zameni `proveri('kostur radi', 1 + 1, 3);` sa `proveri('kostur radi', 1 + 1, 2);`

Osveži. Očekivano: `1/1 prošlo`, naslov `OK 1/1`.

- [ ] **Korak 6: Potvrdi izgled u normalnom režimu**

```bash
start "" "E:\Program Files\Claude code\smanji-slike.html"
```

Očekivano: zaglavlje, prazna traka, drop zona, prazna kartica pregleda sa šahovnicom, prazna tabela, sivo dugme „Preuzmi sve (ZIP)". Konzola bez grešaka. Prebaci Windows na tamnu temu — boje se menjaju.

- [ ] **Korak 7: Commit**

```bash
git add smanji-slike.html && git commit -m "feat: kostur, tema i samoprovera za smanji-slike"
```

---

## Zadatak 2: racunajDimenzije

**Fajlovi:**
- Izmeniti: `smanji-slike.html` — blok „čiste funkcije" i `samoprovera()`

**Interfejsi:**
- Koristi: `proveri()` iz Zadatka 1
- Daje: `racunajDimenzije(pw, ph, p)` → `{w: broj, h: broj}`, oba celi brojevi ≥ 1.
  `p` je objekat sa poljima `jedinica` (`'percent'|'pixels'|'cm'|'inch'`), `w` i `h` (broj ili `''`), `dpi` (broj), `neUvecavaj` (bool).

- [ ] **Korak 1: Napiši tvrdnje koje padaju**

U `samoprovera()`, umesto tvrdnje iz Zadatka 1:

```js
    function d(pw, ph, p) { return racunajDimenzije(pw, ph, p); }
    var px = { jedinica: 'pixels', dpi: 96, neUvecavaj: false };
    var pc = { jedinica: 'percent', dpi: 96, neUvecavaj: false };

    proveri('pixels: oba data',
      d(1500, 1000, { jedinica: 'pixels', w: 800, h: 600, dpi: 96, neUvecavaj: false }),
      { w: 800, h: 600 });

    proveri('pixels: prazna visina se izvodi iz odnosa',
      d(1500, 1000, { jedinica: 'pixels', w: 600, h: '', dpi: 96, neUvecavaj: false }),
      { w: 600, h: 400 });

    proveri('pixels: prazna širina se izvodi iz odnosa',
      d(1500, 1000, { jedinica: 'pixels', w: '', h: 400, dpi: 96, neUvecavaj: false }),
      { w: 600, h: 400 });

    proveri('oba prazna daju original',
      d(1500, 1000, { jedinica: 'pixels', w: '', h: '', dpi: 96, neUvecavaj: false }),
      { w: 1500, h: 1000 });

    proveri('percent: 50% obe strane',
      d(1500, 1000, { jedinica: 'percent', w: 50, h: 50, dpi: 96, neUvecavaj: false }),
      { w: 750, h: 500 });

    proveri('percent: 50% širine, visina iz odnosa',
      d(1500, 1000, { jedinica: 'percent', w: 50, h: '', dpi: 96, neUvecavaj: false }),
      { w: 750, h: 500 });

    proveri('cm pri 300 dpi',
      d(3000, 2000, { jedinica: 'cm', w: 15, h: 10, dpi: 300, neUvecavaj: false }),
      { w: 1772, h: 1181 });

    proveri('inch pri 300 dpi',
      d(3000, 2000, { jedinica: 'inch', w: 6, h: 4, dpi: 300, neUvecavaj: false }),
      { w: 1800, h: 1200 });

    proveri('neUvecavaj sprečava uvećanje portreta',
      d(1000, 1500, { jedinica: 'pixels', w: 1600, h: '', dpi: 96, neUvecavaj: true }),
      { w: 1000, h: 1500 });

    proveri('neUvecavaj ne dira sliku veću od okvira',
      d(3000, 2000, { jedinica: 'pixels', w: 1600, h: '', dpi: 96, neUvecavaj: true }),
      { w: 1600, h: 1067 });

    proveri('neUvecavaj čuva odnos zadatog okvira',
      d(400, 400, { jedinica: 'pixels', w: 800, h: 600, dpi: 96, neUvecavaj: true }),
      { w: 533, h: 400 });

    proveri('nula i negativno se tretiraju kao prazno',
      d(1500, 1000, { jedinica: 'pixels', w: 0, h: -5, dpi: 96, neUvecavaj: false }),
      { w: 1500, h: 1000 });
```

Obriši nekorišćene promenljive `px` i `pc` ako ih linter prijavi — ostavljene su samo kao podsetnik na oblik objekta.

- [ ] **Korak 2: Pokreni i potvrdi da padaju**

Osveži `smanji-slike.html#test`.
Očekivano: `0/12 prošlo`, svaki red `PAO`, u konzoli `ReferenceError: racunajDimenzije is not defined`.

- [ ] **Korak 3: Napiši implementaciju**

U blok „čiste funkcije":

```js
  // Ciljne dimenzije iz unosa. Čista funkcija — ne dira DOM ni state.
  // pw, ph = prirodne dimenzije slike. p = {jedinica, w, h, dpi, neUvecavaj}
  function racunajDimenzije(pw, ph, p) {
    // prazno, nula i negativno znače „nije zadato"
    var W = p.w === '' || p.w === null || p.w === undefined ? null : Number(p.w);
    var H = p.h === '' || p.h === null || p.h === undefined ? null : Number(p.h);
    if (W !== null && !(W > 0)) W = null;
    if (H !== null && !(H > 0)) H = null;

    function uPiksele(v) {
      if (p.jedinica === 'pixels') return v;
      if (p.jedinica === 'cm') return v / 2.54 * p.dpi;
      if (p.jedinica === 'inch') return v * p.dpi;
      return v;
    }

    var w = null, h = null;
    if (p.jedinica === 'percent') {
      if (W !== null) w = pw * W / 100;
      if (H !== null) h = ph * H / 100;
    } else {
      if (W !== null) w = uPiksele(W);
      if (H !== null) h = uPiksele(H);
    }

    if (w === null && h === null) { w = pw; h = ph; }   // oba prazna → original
    else if (w === null) w = h * pw / ph;               // izvedi iz odnosa
    else if (h === null) h = w * ph / pw;

    // ne uvećavaj: skaliraj ciljni okvir naniže dok ne stane u original,
    // uz očuvan odnos zadatog okvira
    if (p.neUvecavaj) {
      var f = Math.min(1, pw / w, ph / h);
      w *= f; h *= f;
    }

    return { w: Math.max(1, Math.round(w)), h: Math.max(1, Math.round(h)) };
  }
```

- [ ] **Korak 4: Pokreni i potvrdi da sve prolazi**

Osveži `smanji-slike.html#test`.
Očekivano: `12/12 prošlo`, naslov taba `OK 12/12`.

Ako `cm pri 300 dpi` padne za piksel, proveri redosled operacija — mora biti `v / 2.54 * dpi`, ne `v / (2.54 * dpi)`.

- [ ] **Korak 5: Commit**

```bash
git add smanji-slike.html && git commit -m "feat: racunajDimenzije sa jedinicama i opcijom ne-uvecavaj"
```

---

## Zadatak 3: Učitavanje fajlova i tabela originala

**Fajlovi:**
- Izmeniti: `smanji-slike.html` — blok „slike", blok „UI"

**Interfejsi:**
- Koristi: `racunajDimenzije` (još ne, ali stiže u Zadatku 4)
- Daje:
  - `ucitajSliku(file, cb)` → `cb(greska, podaci)`; `greska` je `null` ili string poruka; `podaci` je `{src, w, h, alfa, ime, bajta}` gde je `src` `ImageBitmap` ili `HTMLImageElement`
  - `stavke` — niz u modulu, svaka stavka `{ime, bajta, w, h, alfa, src, tr, blob, novaW, novaH, greska}`
  - `kb(b)` → string
  - `renderRed(stavka)` → upisuje `<tr>` u `#redovi`

- [ ] **Korak 1: Napiši tvrdnje za kb() koje padaju**

Dodaj u `samoprovera()`:

```js
    proveri('kb: bajtovi', kb(512), '512 B');
    proveri('kb: kilobajti', kb(2048), '2 KB');
    proveri('kb: megabajti', kb(3 * 1024 * 1024), '3.00 MB');
    proveri('kb: nepoznato', kb(null), '—');
```

- [ ] **Korak 2: Pokreni i potvrdi da padaju**

Osveži `#test`. Očekivano: `12/16 prošlo`, četiri nova reda `PAO`.

- [ ] **Korak 3: Napiši kb() i ucitajSliku()**

U blok „čiste funkcije":

```js
  // Ljudski čitljiva veličina fajla.
  function kb(b) {
    if (b === null || b === undefined) return '—';
    if (b < 1024) return b + ' B';
    if (b < 1024 * 1024) return (b / 1024).toFixed(0) + ' KB';
    return (b / 1024 / 1024).toFixed(2) + ' MB';
  }
```

U blok „slike":

```js
  // Dekodiraj fajl u nešto što canvas ume da nacrta.
  // Moderni put je createImageBitmap; stariji browseri idu preko <img>.
  function ucitajSliku(file, cb) {
    if (!/^image\//.test(file.type)) { cb('Nije podržana slika', null); return; }
    var alfa = /png|webp|gif/i.test(file.type);

    function gotovo(src, w, h) {
      cb(null, { src: src, w: w, h: h, alfa: alfa, ime: file.name, bajta: file.size });
    }

    if (window.createImageBitmap) {
      createImageBitmap(file).then(function (bm) {
        gotovo(bm, bm.width, bm.height);
      }, function () { preko_img(); });
    } else {
      preko_img();
    }

    function preko_img() {
      var url = URL.createObjectURL(file);
      var im = new Image();
      im.onload = function () {
        URL.revokeObjectURL(url);
        if (!im.naturalWidth) { cb('Nije podržana slika', null); return; }
        gotovo(im, im.naturalWidth, im.naturalHeight);
      };
      im.onerror = function () {
        URL.revokeObjectURL(url);
        cb('Nije podržana slika', null);
      };
      im.src = url;
    }
  }
```

- [ ] **Korak 4: Poveži drop zonu i izbor fajlova**

U blok „UI":

```js
  var stavke = [];

  function dodajFajlove(lista) {
    var i;
    for (i = 0; i < lista.length; i++) (function (f) {
      ucitajSliku(f, function (greska, p) {
        var s = greska
          ? { ime: f.name, bajta: f.size, greska: greska }
          : p;
        stavke.push(s);
        renderRed(s);
        $('brojInfo').textContent = stavke.length + ' fajlova';
      });
    })(lista[i]);
  }

  $('drop').onclick = function () { $('fajlovi').click(); };
  $('fajlovi').onchange = function () { dodajFajlove(this.files); this.value = ''; };

  ['dragenter', 'dragover'].forEach(function (e) {
    document.addEventListener(e, function (ev) {
      ev.preventDefault();
      $('drop').classList.add('preko');
    });
  });
  ['dragleave', 'drop'].forEach(function (e) {
    document.addEventListener(e, function (ev) {
      ev.preventDefault();
      if (e === 'dragleave' && ev.relatedTarget) return;
      $('drop').classList.remove('preko');
      if (e === 'drop' && ev.dataTransfer && ev.dataTransfer.files.length) {
        dodajFajlove(ev.dataTransfer.files);
      }
    });
  });
```

Dodaj CSS: `.drop.preko { border-color: var(--accent); background: var(--panel); }`

- [ ] **Korak 5: Napiši renderRed() sa kolonom originala**

```js
  // Upiši red u tabelu. Kolone „Novo" i „Ušteda" popunjava Zadatak 5.
  function renderRed(s) {
    var tr = document.createElement('tr');
    s.tr = tr;
    if (s.greska) {
      tr.innerHTML =
        '<td><div class="thumb sivo">⚠</div></td>' +
        '<td class="fname bad"></td>' +
        '<td class="num">—</td>' +
        '<td class="bad" colspan="2"></td>' +
        '<td style="text-align:right"><button disabled>Preuzmi</button></td>';
      tr.querySelector('.fname').textContent = s.ime;
      tr.querySelector('.bad[colspan]').textContent = s.greska;
    } else {
      tr.innerHTML =
        '<td></td>' +
        '<td class="fname"></td>' +
        '<td class="num"></td>' +
        '<td class="num" data-novo>…</td>' +
        '<td class="save" data-ust>…</td>' +
        '<td style="text-align:right"><button data-dl disabled>Preuzmi</button></td>';
      tr.querySelector('.fname').textContent = s.ime;
      tr.querySelector('.num').textContent = s.w + '×' + s.h + ' · ' + kb(s.bajta);
    }
    $('redovi').appendChild(tr);
  }
```

Dodaj CSS: `.thumb.sivo { display:flex; align-items:center; justify-content:center; font-size:16px; }`

- [ ] **Korak 6: Proveri ručno u browseru**

```bash
start "" "E:\Program Files\Claude code\smanji-slike.html"
```

Pripremi test fajlove: jedan JPG, jedan PNG sa providnošću, jedan GIF, i jedan tekstualni fajl preimenovan u `beleska.txt.jpg`.

Očekivano:
- Prevlačenje preko prozora oboji ivicu drop zone u akcent boju.
- Puštanje fajlova dodaje po jedan red za svaki.
- JPG/PNG/GIF pokazuju tačne dimenzije i veličinu.
- `beleska.txt.jpg` daje crveni red „Nije podržana slika", a ostali redovi su i dalje tu.
- Klik na drop zonu otvara dijalog za izbor fajlova; isti fajlovi izabrani tim putem daju iste redove.
- Konzola bez grešaka.

Osveži `#test` — očekivano `16/16 prošlo`.

- [ ] **Korak 7: Commit**

```bash
git add smanji-slike.html && git commit -m "feat: ucitavanje fajlova, drop zona i tabela originala"
```

---

## Zadatak 4: nacrtaj — Stretch, Fit, Crop

**Fajlovi:**
- Izmeniti: `smanji-slike.html` — blok „slike", traka kontrola, blok „UI"

**Interfejsi:**
- Koristi: `racunajDimenzije` (Zadatak 2), `stavke` (Zadatak 3)
- Daje: `nacrtaj(src, w, h, p)` → `HTMLCanvasElement` širine `w` i visine `h`.
  `p` je `{rezim: 'stretch'|'fit'|'crop', boja: '#rrggbb', providno: bool, alfaMoguca: bool}`

- [ ] **Korak 1: Dodaj kontrole dimenzija i režima u traku**

U `#traka`:

```html
<div class="fld">
  <span class="lbl">Dimenzije</span>
  <input type="number" id="w" placeholder="W" min="1">
  <span class="lbl">×</span>
  <input type="number" id="h" placeholder="H" min="1">
  <select id="jedinica">
    <option value="percent">percent</option>
    <option value="pixels">pixels</option>
    <option value="cm">centimeters</option>
    <option value="inch">inches</option>
  </select>
</div>
<div class="fld hidden" id="dpiFld">
  <span class="lbl">DPI</span><input type="number" id="dpi" min="1">
</div>
<span class="sep"></span>
<div class="fld">
  <span class="lbl">Režim</span>
  <button class="mode" data-rezim="stretch">Stretch</button>
  <button class="mode" data-rezim="crop">Crop</button>
  <button class="mode" data-rezim="fit">Fit</button>
</div>
<span class="sep"></span>
<div class="fld">
  <span class="lbl">Pozadina</span>
  <input type="color" id="boja">
  <label class="chk" id="provFld"><input type="checkbox" id="providno"> providno</label>
</div>
<div class="fld">
  <label class="chk"><input type="checkbox" id="neUvecavaj"> ne uvećavaj</label>
</div>
```

Definiši `DEFAULTS` i `state` u bloku „podaci":

```js
  var DEFAULTS = {
    jedinica: 'pixels', w: 1600, h: '', dpi: 96,
    rezim: 'fit', format: 'webp', quality: 82,
    boja: '#ffffff', providno: false, neUvecavaj: true
  };
  var state = {};
  for (var kljuc in DEFAULTS) state[kljuc] = DEFAULTS[kljuc];
```

- [ ] **Korak 2: Napiši nacrtaj()**

U blok „slike":

```js
  // Iscrtaj sliku na canvas tačnih dimenzija w×h prema režimu.
  // p = {rezim, boja, providno, alfaMoguca}
  function nacrtaj(src, w, h, p) {
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    var x = c.getContext('2d');
    x.imageSmoothingEnabled = true;
    x.imageSmoothingQuality = 'high';

    // pozadina se crta uvek osim kad korisnik traži providnost i format je ume
    if (!(p.providno && p.alfaMoguca)) {
      x.fillStyle = p.boja;
      x.fillRect(0, 0, w, h);
    }

    var sw = src.width || src.naturalWidth;
    var sh = src.height || src.naturalHeight;
    var sc, dw, dh;

    if (p.rezim === 'stretch') {
      x.drawImage(src, 0, 0, w, h);            // odnos stranica se ignoriše
    } else {
      // fit staje unutra, crop pokriva i višak ispada van canvasa
      sc = p.rezim === 'fit' ? Math.min(w / sw, h / sh) : Math.max(w / sw, h / sh);
      dw = sw * sc; dh = sh * sc;
      x.drawImage(src, (w - dw) / 2, (h - dh) / 2, dw, dh);
    }
    return c;
  }
```

- [ ] **Korak 3: Napiši tvrdnje za geometriju**

`nacrtaj` vraća canvas, pa se testira preko dimenzija i preko boje piksela. Dodaj u `samoprovera()`:

```js
    // uzorak 100×50, levo crveno, desno plavo
    var uz = document.createElement('canvas');
    uz.width = 100; uz.height = 50;
    var ux = uz.getContext('2d');
    ux.fillStyle = '#ff0000'; ux.fillRect(0, 0, 50, 50);
    ux.fillStyle = '#0000ff'; ux.fillRect(50, 0, 50, 50);

    function piksel(c, x, y) {
      var d = c.getContext('2d').getImageData(x, y, 1, 1).data;
      return [d[0], d[1], d[2], d[3]];
    }

    var izl = nacrtaj(uz, 200, 200, { rezim: 'stretch', boja: '#00ff00', providno: false, alfaMoguca: false });
    proveri('stretch: dimenzije', [izl.width, izl.height], [200, 200]);
    proveri('stretch: popunjava ceo canvas, bez pozadine', piksel(izl, 10, 190), [255, 0, 0, 255]);

    izl = nacrtaj(uz, 200, 200, { rezim: 'fit', boja: '#00ff00', providno: false, alfaMoguca: false });
    proveri('fit: dimenzije', [izl.width, izl.height], [200, 200]);
    proveri('fit: trake su boja pozadine', piksel(izl, 10, 10), [0, 255, 0, 255]);
    proveri('fit: sredina je slika', piksel(izl, 10, 100), [255, 0, 0, 255]);

    izl = nacrtaj(uz, 200, 200, { rezim: 'crop', boja: '#00ff00', providno: false, alfaMoguca: false });
    proveri('crop: dimenzije', [izl.width, izl.height], [200, 200]);
    proveri('crop: nema traka pozadine', piksel(izl, 10, 10), [255, 0, 0, 255]);

    izl = nacrtaj(uz, 200, 200, { rezim: 'fit', boja: '#00ff00', providno: true, alfaMoguca: true });
    proveri('providno: trake ostaju prozirne', piksel(izl, 10, 10)[3], 0);

    izl = nacrtaj(uz, 200, 200, { rezim: 'fit', boja: '#00ff00', providno: true, alfaMoguca: false });
    proveri('providno se ignoriše kad format ne ume alfa', piksel(izl, 10, 10), [0, 255, 0, 255]);
```

- [ ] **Korak 4: Pokreni testove**

Osveži `#test`. Očekivano: `25/25 prošlo`.

Ako `crop: nema traka pozadine` padne sa zelenom bojom, `Math.max` i `Math.min` su zamenjeni mestima.

- [ ] **Korak 5: Poveži kontrole i pregled**

```js
  function trenutniPregled() {
    var s = null, i;
    for (i = 0; i < stavke.length; i++) if (!stavke[i].greska) { s = stavke[i]; break; }
    if (!s) { $('pregledInfo').textContent = ''; return; }

    var d = racunajDimenzije(s.w, s.h, state);
    var izlaz = nacrtaj(s.src, d.w, d.h, {
      rezim: state.rezim, boja: state.boja,
      providno: state.providno, alfaMoguca: true
    });
    var cv = $('cv');
    cv.width = izlaz.width; cv.height = izlaz.height;
    cv.getContext('2d').drawImage(izlaz, 0, 0);
    $('pregledInfo').textContent = d.w + ' × ' + d.h + ' px';
  }
```

Zakači `oninput`/`onchange` na `#w`, `#h`, `#jedinica`, `#dpi`, `#boja`, `#providno`, `#neUvecavaj` i na `.mode` dugmad tako da upišu u `state` pa pozovu `trenutniPregled()`. Dugme sa `data-rezim === state.rezim` dobija klasu `on`. `#dpiFld` je vidljiv samo kad je `state.jedinica` `cm` ili `inch`. Postavi početne vrednosti kontrola iz `state`.

- [ ] **Korak 6: Proveri ručno**

Otvori alat, ubaci pejzažnu sliku pa portretnu.

Očekivano:
- Prebacivanje Stretch/Fit/Crop menja pregled odmah; na Stretch je slika vidno izobličena.
- Na Fit se vide trake u izabranoj boji; menjanje boje ih menja u realnom vremenu.
- Prebacivanje na `centimeters` prikazuje polje DPI; na `pixels` ga sakriva.
- Sa uključenim `ne uvećavaj` i širinom 1600, slika od 1000×1500 ostaje 1000×1500 (piše u `#pregledInfo`).

- [ ] **Korak 7: Commit**

```bash
git add smanji-slike.html && git commit -m "feat: nacrtaj sa stretch/fit/crop i pregled uzivo"
```

---

## Zadatak 5: Format, quality i pojedinačno preuzimanje

**Fajlovi:**
- Izmeniti: `smanji-slike.html` — blok „čiste funkcije", blok „slike", traka, blok „UI"

**Interfejsi:**
- Koristi: `nacrtaj` (Zadatak 4), `stavke` (Zadatak 3)
- Daje:
  - `mimeZa(format, ulaznaAlfa)` → `'image/jpeg'|'image/png'|'image/webp'`
  - `alfaMoguca(mime)` → bool
  - `nastavak(mime)` → `'jpg'|'png'|'webp'`
  - `preimenuj(ime, mime)` → string
  - `uKodiraj(canvas, mime, quality, cb)` → `cb(greska, blob)`

- [ ] **Korak 1: Napiši tvrdnje koje padaju**

```js
    proveri('mimeZa: jpg', mimeZa('jpg', false), 'image/jpeg');
    proveri('mimeZa: png', mimeZa('png', false), 'image/png');
    proveri('mimeZa: webp', mimeZa('webp', true), 'image/webp');
    proveri('mimeZa: original bez alfe → jpeg', mimeZa('original', false), 'image/jpeg');
    proveri('mimeZa: original sa alfom → png', mimeZa('original', true), 'image/png');

    proveri('alfaMoguca: jpeg ne', alfaMoguca('image/jpeg'), false);
    proveri('alfaMoguca: png da', alfaMoguca('image/png'), true);
    proveri('alfaMoguca: webp da', alfaMoguca('image/webp'), true);

    proveri('nastavak', nastavak('image/jpeg'), 'jpg');
    proveri('preimenuj menja nastavak', preimenuj('slika.PNG', 'image/webp'), 'slika.webp');
    proveri('preimenuj čuva tačke u imenu', preimenuj('a.b.c.jpg', 'image/png'), 'a.b.c.png');
    proveri('preimenuj bez nastavka', preimenuj('bezTacke', 'image/jpeg'), 'bezTacke.jpg');
```

- [ ] **Korak 2: Pokreni i potvrdi da padaju**

Osveži `#test`. Očekivano: `25/37 prošlo`.

- [ ] **Korak 3: Napiši implementaciju**

```js
  // Format koji je korisnik izabrao → MIME. „original" bira po tome da li ulaz nosi alfu.
  function mimeZa(format, ulaznaAlfa) {
    if (format === 'jpg') return 'image/jpeg';
    if (format === 'png') return 'image/png';
    if (format === 'webp') return 'image/webp';
    return ulaznaAlfa ? 'image/png' : 'image/jpeg';
  }

  function alfaMoguca(mime) { return mime !== 'image/jpeg'; }

  function nastavak(mime) {
    return mime === 'image/jpeg' ? 'jpg' : mime === 'image/png' ? 'png' : 'webp';
  }

  function preimenuj(ime, mime) {
    return ime.replace(/\.[^.\\/]*$/, '') + '.' + nastavak(mime);
  }
```

U blok „slike":

```js
  // toBlob je asinhron i ume da vrati null kad ostane bez memorije.
  function uKodiraj(c, mime, quality, cb) {
    try {
      c.toBlob(function (b) {
        if (!b) { cb('Neuspešno kodiranje', null); return; }
        cb(null, b);
      }, mime, quality / 100);
    } catch (e) {
      cb('Neuspešno kodiranje', null);
    }
  }
```

- [ ] **Korak 4: Pokreni testove**

Osveži `#test`. Očekivano: `37/37 prošlo`.

- [ ] **Korak 5: Dodaj kontrole formata i quality-ja**

U traku, pre polja za pozadinu:

```html
<span class="sep"></span>
<div class="fld">
  <span class="lbl">Format</span>
  <select id="format">
    <option value="original">Original</option>
    <option value="jpg">JPG</option>
    <option value="png">PNG</option>
    <option value="webp">WEBP</option>
  </select>
</div>
<div class="fld" id="kvalFld">
  <span class="lbl">Quality</span>
  <input type="range" id="quality" min="1" max="100">
  <span class="lbl mono" id="qualityVal"></span>
</div>
```

Sakrivanje WEBP-a kad browser ne ume da ga enkoduje, odmah po startu:

```js
  // WEBP se nudi samo ako ga ovaj browser ume enkodovati
  (function () {
    var t = document.createElement('canvas');
    t.width = t.height = 1;
    if (t.toDataURL('image/webp').indexOf('data:image/webp') !== 0) {
      var o = $('format').querySelector('option[value="webp"]');
      if (o) o.parentNode.removeChild(o);
      if (state.format === 'webp') state.format = 'jpg';
      DEFAULTS.format = 'jpg';
    }
  })();
```

`#kvalFld` je skriven kad je `state.format === 'png'`. `#provFld` je skriven kad je `mimeZa(state.format, true) === 'image/jpeg'`.

- [ ] **Korak 6: Popuni kolone „Novo" i „Ušteda" i dugme za preuzimanje**

```js
  // Obradi jednu stavku do gotovog bloba.
  function obradiStavku(s, gotovo) {
    var mime = mimeZa(state.format, s.alfa);
    var d = racunajDimenzije(s.w, s.h, state);
    var c;
    try {
      c = nacrtaj(s.src, d.w, d.h, {
        rezim: state.rezim, boja: state.boja,
        providno: state.providno, alfaMoguca: alfaMoguca(mime)
      });
    } catch (e) {
      gotovo('Slika je prevelika za ovaj browser');
      return;
    }
    uKodiraj(c, mime, state.quality, function (greska, blob) {
      if (greska) { gotovo(greska); return; }
      s.blob = blob; s.novaW = d.w; s.novaH = d.h; s.noviMime = mime;
      gotovo(null);
    });
  }

  function osveziRed(s) {
    if (!s.tr) return;
    if (s.greska) {
      s.tr.querySelector('[data-novo]').textContent = '—';
      var e = s.tr.querySelector('[data-ust]');
      e.textContent = s.greska; e.className = 'bad';
      return;
    }
    s.tr.querySelector('[data-novo]').textContent =
      s.novaW + '×' + s.novaH + ' · ' + kb(s.blob.size);
    var u = Math.round((1 - s.blob.size / s.bajta) * 100);
    var el = s.tr.querySelector('[data-ust]');
    el.textContent = (u >= 0 ? '−' : '+') + Math.abs(u) + '%';
    el.className = u >= 0 ? 'save' : 'save bad';

    var dl = s.tr.querySelector('[data-dl]');
    dl.disabled = false;
    dl.onclick = function () { preuzmi(s.blob, preimenuj(s.ime, s.noviMime)); };
  }

  // Preuzimanje bloba pod zadatim imenom.
  function preuzmi(blob, ime) {
    var a = document.createElement('a');
    var url = URL.createObjectURL(blob);
    a.href = url; a.download = ime;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }
```

Takođe dodaj sličicu u prvu kolonu: nacrtaj `s.src` na canvas 68×68 režimom `crop` i upiši `toDataURL()` u `<img class="thumb">`.

- [ ] **Korak 7: Proveri ručno**

Ubaci nekoliko slika, pa:
- Menjaj quality slajder — kolona „Novo" i „Ušteda" prate.
- Prebaci format na PNG — quality slajder nestaje.
- Prebaci na WEBP — fajlovi su vidno manji nego JPG na istom quality-ju.
- Klikni „Preuzmi" u jednom redu — fajl stiže sa tačnim nastavkom i otvara se ispravno.
- Providna PNG → format JPG: providnost postaje izabrana boja, ne crna. Nazad na PNG uz čekiran „providno": providnost očuvana (proveri u pregledaču slika sa šahovnicom).

Osveži `#test` — `37/37`.

- [ ] **Korak 8: Commit**

```bash
git add smanji-slike.html && git commit -m "feat: format, quality i pojedinacno preuzimanje"
```

---

## Zadatak 6: ZIP

**Fajlovi:**
- Izmeniti: `smanji-slike.html` — blok „čiste funkcije", blok „UI"

**Interfejsi:**
- Koristi: `stavke`, `preimenuj`, `preuzmi` (Zadatak 5)
- Daje:
  - `uUtf8(s)` → `Uint8Array`
  - `crc32(u8)` → neoznačen 32-bitni broj
  - `napraviZip(unosi)` → `Blob` tipa `application/zip`; `unosi` je niz `{ime: string, bajtovi: Uint8Array}`

- [ ] **Korak 1: Napiši tvrdnje koje padaju**

```js
    proveri('uUtf8: ASCII', Array.prototype.slice.call(uUtf8('AB')), [65, 66]);
    proveri('uUtf8: ćirilica', Array.prototype.slice.call(uUtf8('Ж')), [0xD0, 0x96]);
    proveri('uUtf8: š', Array.prototype.slice.call(uUtf8('š')), [0xC5, 0xA1]);
    proveri('uUtf8: emodži izvan BMP',
      Array.prototype.slice.call(uUtf8('\uD83D\uDE00')), [0xF0, 0x9F, 0x98, 0x80]);

    // standardni kontrolni vektor za CRC-32
    proveri('crc32 kontrolni vektor', crc32(uUtf8('123456789')), 0xCBF43926);
    proveri('crc32 praznog niza', crc32(new Uint8Array(0)), 0);

    var zip = napraviZip([{ ime: 'a.txt', bajtovi: uUtf8('zdravo') }]);
    proveri('zip: tip bloba', zip.type, 'application/zip');
    // 30 (lokalni header) + 5 (ime) + 6 (podaci) + 46 + 5 (centralni) + 22 (EOCD)
    proveri('zip: tačna veličina', zip.size, 114);
    proveri('zip: prazan ulaz daje samo EOCD', napraviZip([]).size, 22);
```

- [ ] **Korak 2: Pokreni i potvrdi da padaju**

Osveži `#test`. Očekivano: `37/46 prošlo`.

- [ ] **Korak 3: Napiši uUtf8 i crc32**

```js
  // Ručni UTF-8 enkoder — TextEncoder ne postoji na starijim mobilnim browserima.
  function uUtf8(s) {
    var izlaz = [], i, c, c2, cp;
    for (i = 0; i < s.length; i++) {
      c = s.charCodeAt(i);
      if (c < 0x80) {
        izlaz.push(c);
      } else if (c < 0x800) {
        izlaz.push(0xC0 | (c >> 6), 0x80 | (c & 63));
      } else if (c >= 0xD800 && c <= 0xDBFF && i + 1 < s.length) {
        c2 = s.charCodeAt(i + 1);
        cp = 0x10000 + ((c - 0xD800) << 10) + (c2 - 0xDC00);
        izlaz.push(0xF0 | (cp >> 18), 0x80 | ((cp >> 12) & 63),
                   0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63));
        i++;
      } else {
        izlaz.push(0xE0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
      }
    }
    return new Uint8Array(izlaz);
  }

  // CRC-32 (IEEE), sa tabelom koja se pravi pri prvom pozivu.
  function crc32(u8) {
    var t = crc32.tabela, n, k, c, i;
    if (!t) {
      t = crc32.tabela = new Int32Array(256);
      for (n = 0; n < 256; n++) {
        c = n;
        for (k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        t[n] = c;
      }
    }
    var crc = -1;
    for (i = 0; i < u8.length; i++) crc = (crc >>> 8) ^ t[(crc ^ u8[i]) & 0xFF];
    return (crc ^ -1) >>> 0;
  }
```

- [ ] **Korak 4: Napiši napraviZip**

```js
  // ZIP bez kompresije (metoda 0). Slike su već kompresovane, pa deflate
  // ne bi doneo ništa osim mnogo koda.
  function napraviZip(unosi) {
    var lokalni = [], centralni = [], offset = 0, i;
    var sada = new Date();
    var vreme = ((sada.getHours() << 11) | (sada.getMinutes() << 5) |
                 (sada.getSeconds() >> 1)) & 0xFFFF;
    var datum = (((sada.getFullYear() - 1980) << 9) | ((sada.getMonth() + 1) << 5) |
                 sada.getDate()) & 0xFFFF;

    for (i = 0; i < unosi.length; i++) {
      var ime = uUtf8(unosi[i].ime);
      var pod = unosi[i].bajtovi;
      var crc = crc32(pod);

      var lh = new Uint8Array(30 + ime.length);
      var lv = new DataView(lh.buffer);
      lv.setUint32(0, 0x04034b50, true);   // potpis
      lv.setUint16(4, 20, true);           // potrebna verzija
      lv.setUint16(6, 0x0800, true);       // bit 11: ime je UTF-8
      lv.setUint16(8, 0, true);            // metoda 0 = store
      lv.setUint16(10, vreme, true);
      lv.setUint16(12, datum, true);
      lv.setUint32(14, crc, true);
      lv.setUint32(18, pod.length, true);  // kompresovana veličina
      lv.setUint32(22, pod.length, true);  // stvarna veličina
      lv.setUint16(26, ime.length, true);
      lv.setUint16(28, 0, true);           // bez extra polja
      lh.set(ime, 30);
      lokalni.push(lh, pod);

      var ch = new Uint8Array(46 + ime.length);
      var cv = new DataView(ch.buffer);
      cv.setUint32(0, 0x02014b50, true);
      cv.setUint16(4, 20, true);           // verzija kojom je napravljen
      cv.setUint16(6, 20, true);           // potrebna verzija
      cv.setUint16(8, 0x0800, true);
      cv.setUint16(10, 0, true);
      cv.setUint16(12, vreme, true);
      cv.setUint16(14, datum, true);
      cv.setUint32(16, crc, true);
      cv.setUint32(20, pod.length, true);
      cv.setUint32(24, pod.length, true);
      cv.setUint16(28, ime.length, true);
      cv.setUint16(30, 0, true);           // extra
      cv.setUint16(32, 0, true);           // komentar
      cv.setUint16(34, 0, true);           // broj diska
      cv.setUint16(36, 0, true);           // interni atributi
      cv.setUint32(38, 0, true);           // eksterni atributi
      cv.setUint32(42, offset, true);      // pomeraj lokalnog headera
      ch.set(ime, 46);
      centralni.push(ch);

      offset += lh.length + pod.length;
    }

    var cdVel = 0;
    for (i = 0; i < centralni.length; i++) cdVel += centralni[i].length;

    var eocd = new Uint8Array(22);
    var ev = new DataView(eocd.buffer);
    ev.setUint32(0, 0x06054b50, true);
    ev.setUint16(4, 0, true);              // broj ovog diska
    ev.setUint16(6, 0, true);              // disk sa početkom centralnog direktorijuma
    ev.setUint16(8, unosi.length, true);
    ev.setUint16(10, unosi.length, true);
    ev.setUint32(12, cdVel, true);
    ev.setUint32(16, offset, true);
    ev.setUint16(20, 0, true);             // bez komentara

    return new Blob(lokalni.concat(centralni, [eocd]), { type: 'application/zip' });
  }
```

- [ ] **Korak 5: Pokreni testove**

Osveži `#test`. Očekivano: `46/46 prošlo`.

Ako `zip: tačna veličina` padne, uporedi sa računicom u komentaru tvrdnje — najčešći uzrok je zaboravljen `true` (little-endian) u nekom `setUint*` pozivu.

- [ ] **Korak 6: Poveži dugme „Preuzmi sve (ZIP)"**

```js
  // Imena se ne smeju ponoviti unutar arhive.
  function jedinstvenoIme(ime, zauzeta) {
    if (!zauzeta[ime]) { zauzeta[ime] = true; return ime; }
    var tacka = ime.lastIndexOf('.');
    var osnova = tacka > 0 ? ime.slice(0, tacka) : ime;
    var nast = tacka > 0 ? ime.slice(tacka) : '';
    var n = 2;
    while (zauzeta[osnova + '-' + n + nast]) n++;
    var novo = osnova + '-' + n + nast;
    zauzeta[novo] = true;
    return novo;
  }

  $('zip').onclick = function () {
    var dobre = [], i;
    for (i = 0; i < stavke.length; i++) if (stavke[i].blob) dobre.push(stavke[i]);
    if (!dobre.length) return;

    var unosi = [], zauzeta = {}, ostalo = dobre.length;
    dobre.forEach(function (s, idx) {
      var fr = new FileReader();
      fr.onload = function () {
        unosi[idx] = {
          ime: jedinstvenoIme(preimenuj(s.ime, s.noviMime), zauzeta),
          bajtovi: new Uint8Array(fr.result)
        };
        if (--ostalo === 0) preuzmi(napraviZip(unosi), 'smanjene-slike.zip');
      };
      fr.readAsArrayBuffer(s.blob);
    });
  };
```

Dugme `#zip` je omogućeno čim postoji bar jedna stavka sa `blob`-om.

- [ ] **Korak 7: Proveri ZIP ručno**

Ubaci 4 slike, uključujući jednu sa ćiriličnim imenom (`слика ђак.jpg`) i jednu sa dijakriticima (`čaša-šećer.png`). Klikni „Preuzmi sve (ZIP)".

Očekivano:
- Windows Explorer otvara `smanjene-slike.zip` bez upozorenja.
- Unutra su sva 4 fajla, sa tačnim nazivima uključujući ćirilicu i dijakritike.
- Svaka slika se otvara ispravno iz arhive.
- Ubaci dva fajla istog imena iz različitih foldera — u arhivi su `ime.jpg` i `ime-2.jpg`.

- [ ] **Korak 8: Commit**

```bash
git add smanji-slike.html && git commit -m "feat: rucni ZIP writer bez zavisnosti"
```

---

## Zadatak 7: Sekvencijalna obrada, progres i greške

**Fajlovi:**
- Izmeniti: `smanji-slike.html` — blok „obrada", blok „UI"

**Interfejsi:**
- Koristi: `obradiStavku` (Zadatak 5), `osveziRed` (Zadatak 5), `stavke`
- Daje: `obradiSve()` — obrađuje sve stavke jednu po jednu i osvežava progres i zbir

- [ ] **Korak 1: Napiši obradiSve()**

```js
  var uToku = false, zahtev = 0;

  // Obrada je sekvencijalna namerno — paralelno dekodovanje desetak slika
  // obara memoriju na telefonu.
  function obradiSve() {
    var moj = ++zahtev;
    if (uToku) return;                 // tekući prolaz će videti novi zahtev
    uToku = true;

    var i = 0, ukupnoOrig = 0, ukupnoNovo = 0;
    $('prog').classList.remove('hidden');

    function dalje() {
      if (moj !== zahtev) {            // podešavanja su se promenila u međuvremenu
        uToku = false;
        obradiSve();
        return;
      }
      if (i >= stavke.length) {
        uToku = false;
        $('prog').classList.add('hidden');
        $('zbir').textContent = brojDobrih() + ' slika · ' + kb(ukupnoOrig) +
          ' → ' + kb(ukupnoNovo) +
          (ukupnoOrig ? '  (−' + Math.round((1 - ukupnoNovo / ukupnoOrig) * 100) + '%)' : '');
        $('zip').disabled = brojDobrih() === 0;
        return;
      }

      var s = stavke[i++];
      $('prog').firstChild.style.width = Math.round(i / stavke.length * 100) + '%';

      if (s.greska) { osveziRed(s); dalje(); return; }

      obradiStavku(s, function (greska) {
        if (greska) { s.greska = greska; }
        else { ukupnoOrig += s.bajta; ukupnoNovo += s.blob.size; }
        osveziRed(s);
        // predah između slika: pušta browser da oslobodi memoriju i osveži UI
        setTimeout(dalje, 0);
      });
    }
    dalje();
  }

  function brojDobrih() {
    var n = 0, i;
    for (i = 0; i < stavke.length; i++) if (stavke[i].blob) n++;
    return n;
  }
```

- [ ] **Korak 2: Zameni direktne pozive**

Svaki handler koji je do sada zvao `trenutniPregled()` sada zove i `obradiSve()`, kroz zajedničku funkciju:

```js
  var odloz = null;
  function osvezi() {
    trenutniPregled();                 // pregled je trenutan
    clearTimeout(odloz);
    odloz = setTimeout(obradiSve, 200); // batch čeka da korisnik pusti slajder
  }
```

`dodajFajlove` na kraju svakog učitavanja zove `osvezi()`.

- [ ] **Korak 3: Očisti memoriju**

U `obradiStavku`, posle uspešnog `uKodiraj`, canvas se ne čuva nigde — samo `s.blob`. Dodatno, kad se stavka zameni novim blobom, stari se odbacuje. `ImageBitmap` se zatvara tek kad se stavka ukloni iz liste, jer je potreban za svaku ponovnu obradu:

```js
  function ukloniStavku(s) {
    if (s.src && s.src.close) s.src.close();
    if (s.tr && s.tr.parentNode) s.tr.parentNode.removeChild(s.tr);
    var i = stavke.indexOf(s);
    if (i >= 0) stavke.splice(i, 1);
  }
```

Dodaj dugme „×" u poslednju kolonu svakog reda koje zove `ukloniStavku(s)` pa `osvezi()`.

- [ ] **Korak 4: Proveri ručno — sreća**

Ubaci 10 slika odjednom.

Očekivano:
- Progres traka se pojavljuje i puni se do 100%, pa nestaje.
- Redovi se popunjavaju jedan po jedan, odozgo nadole.
- Zbir na dnu pokazuje ukupno pre → posle i procenat.
- Vučenje quality slajdera levo-desno ne obara stranicu; obrada kreće tek kad se slajder pusti, i uvek završava sa poslednjom vrednošću, ne nekom usput.

- [ ] **Korak 5: Proveri ručno — nesreća**

Ubaci 10 slika među kojima su:
- `beleska.txt.jpg` (tekstualni fajl preimenovan)
- vrlo velika slika, npr. 12000×12000 px

Očekivano:
- Tekstualni fajl daje crveni red „Nije podržana slika"; ostalih 9 prolazi.
- Ako velika slika probije limit canvasa, njen red kaže „Slika je prevelika za ovaj browser", a batch ide dalje.
- Zbir i ZIP obuhvataju samo uspešne.
- Konzola bez neuhvaćenih izuzetaka.

- [ ] **Korak 6: Commit**

```bash
git add smanji-slike.html && git commit -m "feat: sekvencijalna obrada, progres i degradacija na gresku"
```

---

## Zadatak 8: Pamćenje podešavanja i finalna provera

**Fajlovi:**
- Izmeniti: `smanji-slike.html` — blok „UI"

**Interfejsi:**
- Koristi: `state`, `DEFAULTS`
- Daje: `sacuvaj()`, `ucitaj()`

- [ ] **Korak 1: Napiši sacuvaj i ucitaj**

```js
  var KLJUC = 'smanjiSlike.v1';

  // localStorage baca izuzetak u privatnom režimu — isti obrazac kao u prevodiocu.
  function sacuvaj() {
    try { localStorage.setItem(KLJUC, JSON.stringify(state)); } catch (e) {}
  }

  function ucitaj() {
    try {
      var s = localStorage.getItem(KLJUC);
      if (!s) return;
      var o = JSON.parse(s);
      for (var k in DEFAULTS) if (o.hasOwnProperty(k)) state[k] = o[k];
    } catch (e) {}
  }
```

Pozovi `ucitaj()` pre prvog `renderIzgled()`, a `sacuvaj()` na kraju `osvezi()`.

Slike se **ne** čuvaju — samo podešavanja.

- [ ] **Korak 2: Proveri pamćenje**

Promeni jedinicu na `centimeters`, DPI na 300, režim na Crop, format na JPG, quality na 65, boju na crvenu, isključi „ne uvećavaj". Osveži stranicu (F5).

Očekivano: sve kontrole su na izabranim vrednostima; tabela je prazna (slike se ne pamte).

Otvori stranicu u privatnom prozoru — radi normalno, bez grešaka u konzoli.

- [ ] **Korak 3: Odradi punu ručnu proveru iz specifikacije**

Prođi listu iz `docs/superpowers/specs/2026-08-01-smanji-slike-design.md`, odeljak „Provera", svih 12 tačaka. Zabeleži rezultat svake.

- [ ] **Korak 4: Potvrdi da nema mreže**

Otvori DevTools → Network, očisti listu, pa ubaci slike i preuzmi ZIP.

Očekivano: **nijedan zahtev.** Ako se pojavi ijedan, negde je ostao spoljni resurs — nađi ga i ukloni.

Zatim isključi internet i ponovi ceo tok. Očekivano: sve radi isto.

- [ ] **Korak 5: Potvrdi da samoprovera i dalje prolazi**

Osveži `smanji-slike.html#test`. Očekivano: `46/46 prošlo`.

- [ ] **Korak 6: Proveri veličinu i stil fajla**

```bash
powershell -c "(Get-Item 'E:\Program Files\Claude code\smanji-slike.html').Length"
```

Pretraži fajl na zabranjenu sintaksu — nijedan pogodak nije dozvoljen:

```bash
grep -nE "\blet\b|\bconst\b|=>|\bclass\b|\.\.\.|\`" "E:\Program Files\Claude code\smanji-slike.html"
```

(Pogodci unutar `<style>` bloka na `...` u `font-family` listama ne postoje; ako grep nešto nađe, to je stvarno ES6.)

- [ ] **Korak 7: Commit**

```bash
git add smanji-slike.html && git commit -m "feat: pamcenje podesavanja i zavrsna provera"
```

---

## Samopregled plana

**Pokrivenost specifikacije:**

| Zahtev iz specifikacije | Zadatak |
|---|---|
| Jedan samostalan fajl, ES5, srpski | 1, provereno u 8 |
| Bez mreže, radi sa `file://` | 1, provereno u 8 |
| `racunajDimenzije`, jedinice percent/px/cm/inch | 2 |
| Prazno polje se izvodi iz odnosa | 2 |
| DPI polje, vidljivo samo za cm/inch | 2, 4 |
| Ne uvećavaj (podrazumevano uključeno) | 2, 4 |
| `nacrtaj` — Stretch, Fit, Crop | 4 |
| Boja pozadine, čekboks „providno" | 4 |
| Format Original/JPG/PNG/WEBP, WEBP se sakriva | 5 |
| GIF kao ulaz, ne kao izlaz | 3 (ulaz), 5 (`mimeZa` nikad ne vraća GIF) |
| Quality slajder, siv za PNG | 5 |
| Drag&drop i izbor fajlova, bez limita broja | 3 |
| Tabela sa sličicom, dimenzijama, uštedom | 3, 5 |
| ZIP store-only sa CRC32 i UTF-8 imenima | 6 |
| Sudari imena → `-2`, `-3` | 6 |
| Sekvencijalna obrada, progres traka | 7 |
| Degradacija na grešku, batch ne puca | 7 |
| Čišćenje memorije (`revokeObjectURL`, `close`) | 3, 7 |
| `localStorage` pod `smanjiSlike.v1`, try/catch | 8 |
| Izgled: traka gore, normalna gustina, sličice, akcent | 1, 4 |
| Puna ručna provera, 12 tačaka | 8 |

Bez rupa.

**Doslednost imena kroz zadatke:** `racunajDimenzije`, `nacrtaj`, `uKodiraj`, `mimeZa`, `alfaMoguca`, `nastavak`, `preimenuj`, `kb`, `uUtf8`, `crc32`, `napraviZip`, `ucitajSliku`, `obradiStavku`, `obradiSve`, `osveziRed`, `renderRed`, `preuzmi`, `osvezi`, `sacuvaj`, `ucitaj` — svako se uvodi u tačno jednom zadatku i posle se koristi pod istim imenom. `state`, `DEFAULTS`, `stavke` su jedini deljeni podaci.

**Broj tvrdnji po zadacima:** 1 (Z1) → 12 (Z2) → 16 (Z3) → 25 (Z4) → 37 (Z5) → 46 (Z6). Brojevi u koracima „Očekivano" prate ovaj zbir.
