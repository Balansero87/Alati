# Brojač

PWA sa brojilima koja korisnik sam dodaje. Tap na karticu je +1, „−" oduzima,
pod „Uredi" se menjaju imena, vraća na nulu i briše. Stanje je u `localStorage`
pod ključem `brojac:v1`, oblik `[{id, name, value}]`, upis sa 350 ms odlaganja.

Aplikacija je jedan fajl — `index.html`, inline CSS i jedan IIFE. Nema build
korak i **ne sme da napravi nijedan mrežni poziv**: fontovi stoje u `fonts/`,
ikonice u `icons/`. `sharp` je alat za ikonice, ne zavisnost aplikacije.

## Komande

```bash
python -m http.server 8000     # lokalni server (iz ovog foldera)
node napravi-ikone.js          # regeneriše sve četiri PNG ikonice u icons/
```

## Ne diraj bez pitanja

- **Dizajn tokeni su zaključani.** `#2B302C` polje, `#222623` dublje polje,
  `#EDE9DE` kost, `#D5D0C2` prigušeno, `#171916` mastilo, `#6B6E66` meko
  mastilo, `#C29B4A` mesing, `#B4432F` crveno. Cifre Martian Mono 700, ostalo
  Archivo 400/500/600. Raspored, tekstovi i animacija cifara isto tako — ako ti
  se nešto čini kao poboljšanje, prvo pitaj.
- **Podigni `VERZIJA` u `sw.js` pri svakoj izmeni fajla iz `LJUSKA`.** Bez toga
  `activate` ne briše stari keš i telefon ostaje na staroj verziji. Strategija
  je cache-first namerno: aplikacija nema šta da traži sa mreže, pa je offline
  normalno stanje.
- **Dugme „Dodaj" sluša `pointerdown` sa `preventDefault()`, ne `click`.** Na
  telefonu zatvaranje tastature pomeri dugme pre nego što `click` stigne, pa
  dodir promaši. Uz to stoji `click` sa `e.detail === 0` samo za tastaturu.
- **Ako se marka menja**, promeni je i u `index.html` i u `napravi-ikone.js` —
  geometrija je prepisana, nema zajedničkog izvora.

## Service worker traži siguran kontekst

`https://` ili `localhost`/`127.0.0.1`. Preko `http://192.168.x.x` Chrome uopšte
ne daje `navigator.serviceWorker` — aplikacija radi, ali bez offline režima i
bez instalacije. Za probu sa telefona: `chrome://flags/#unsafely-treat-insecure-origin-as-secure`
i upiši tačno `http://<ip>:8000`.
