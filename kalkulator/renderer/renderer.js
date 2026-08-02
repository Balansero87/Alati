/*
 * Renderer — sve sto korisnik vidi i dodiruje.
 *
 * Racuna preko Racunanje (racunanje.js), a podatke trazi od glavnog procesa
 * preko `window.kalkulatorMost`. Nikad ne dira disk direktno.
 */
(function () {
  'use strict';

  var most = window.kalkulatorMost;

  var unos = document.getElementById('unos');
  var poruka = document.getElementById('poruka');
  var pregled = document.getElementById('pregled');
  var dugmad = document.getElementById('dugmad');
  var istorijaLista = document.getElementById('istorijaLista');
  var istorijaPrazna = document.getElementById('istorijaPrazna');
  var dugmeObrisi = document.getElementById('obrisiIstoriju');
  var poljePutanje = document.getElementById('putanjaPodataka');

  // Sve sto sme da udje u izraz. Ostalo se tiho odbacuje pri kucanju i lepljenju.
  var DOZVOLJENI = /[0-9+\-*\/()%.,×÷−\s]/;

  /* ---------- ekran ---------- */

  function ocistiPoruku() {
    poruka.textContent = ' ';
    poruka.classList.remove('greska');
  }

  function prikaziPoruku(tekst) {
    poruka.textContent = tekst || ' ';
    poruka.classList.remove('greska');
  }

  function prikaziGresku(tekst) {
    poruka.textContent = tekst;
    poruka.classList.add('greska');
    pregled.textContent = ' ';
  }

  /*
   * Medjurezultat dok se kuca. Prikazuje se samo ako izraz zaista ima sta da
   * racuna — za goli broj bi samo ponovio ono sto vec pise iznad.
   */
  function osveziPregled() {
    var izraz = unos.value.trim();
    if (!izraz || !/[+\-*\/%()×÷−]/.test(izraz)) {
      pregled.textContent = ' ';
      return;
    }
    try {
      pregled.textContent = '= ' + Racunanje.formatiraj(Racunanje.izracunaj(izraz));
    } catch (e) {
      pregled.textContent = ' ';   // izraz je jos nedovrsen, to nije greska
    }
  }

  function postaviKaret(mesto) {
    unos.focus();
    unos.setSelectionRange(mesto, mesto);
  }

  /* ---------- unos ---------- */

  function ubaci(tekst) {
    var pocetak = unos.selectionStart;
    var kraj = unos.selectionEnd;
    var vrednost = unos.value;
    unos.value = vrednost.slice(0, pocetak) + tekst + vrednost.slice(kraj);
    postaviKaret(pocetak + tekst.length);
    ocistiPoruku();
    osveziPregled();
  }

  function obrisiZnak() {
    var pocetak = unos.selectionStart;
    var kraj = unos.selectionEnd;
    var vrednost = unos.value;

    if (pocetak !== kraj) {
      unos.value = vrednost.slice(0, pocetak) + vrednost.slice(kraj);
      postaviKaret(pocetak);
    } else if (pocetak > 0) {
      unos.value = vrednost.slice(0, pocetak - 1) + vrednost.slice(pocetak);
      postaviKaret(pocetak - 1);
    }
    ocistiPoruku();
    osveziPregled();
  }

  function ocisti() {
    unos.value = '';
    postaviKaret(0);
    ocistiPoruku();
    osveziPregled();
  }

  /*
   * ± menja znak broja levo od kareta. Ako je taj broj vec negativan zbog
   * unarnog minusa, minus se sklanja; inace se dodaje.
   */
  function promeniZnak() {
    var kraj = unos.selectionEnd;
    var levo = unos.value.slice(0, kraj);
    var poklapanje = levo.match(/(\d+[.,]?\d*|[.,]\d+)$/);
    if (!poklapanje) return;

    var pocetakBroja = kraj - poklapanje[0].length;
    var predBrojem = levo.slice(0, pocetakBroja);
    var znakPre = predBrojem.charAt(predBrojem.length - 1);
    var predZnakom = predBrojem.charAt(predBrojem.length - 2);

    // Minus je unarni ako je na pocetku izraza ili odmah posle operatora/zagrade.
    var jeUnarniMinus = (znakPre === '-' || znakPre === '−') &&
      (predBrojem.length === 1 || /[+\-*\/(×÷−]/.test(predZnakom));

    if (jeUnarniMinus) {
      unos.value = predBrojem.slice(0, -1) + unos.value.slice(pocetakBroja);
      postaviKaret(kraj - 1);
    } else {
      unos.value = predBrojem + '-' + unos.value.slice(pocetakBroja);
      postaviKaret(kraj + 1);
    }
    ocistiPoruku();
    osveziPregled();
  }

  /* ---------- racunanje ---------- */

  function izvrsi() {
    var izraz = unos.value.trim();
    if (!izraz) return;

    var rezultat;
    try {
      rezultat = Racunanje.izracunaj(izraz);
    } catch (greska) {
      prikaziGresku(greska.message);
      return;
    }

    var tekst = Racunanje.formatiraj(rezultat);
    prikaziPoruku(izraz + ' =');
    unos.value = tekst;
    postaviKaret(tekst.length);
    pregled.textContent = ' ';

    most.dodajUIstoriju(izraz, tekst).then(nacrtajIstoriju);
  }

  /* ---------- istorija ---------- */

  function formatirajVreme(vreme) {
    var datum = new Date(vreme);
    var danas = new Date();
    var istiDan = datum.toDateString() === danas.toDateString();
    if (istiDan) {
      return datum.toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' });
    }
    return datum.toLocaleDateString('sr-RS', { day: '2-digit', month: '2-digit' });
  }

  function nacrtajIstoriju(zapisi) {
    istorijaLista.textContent = '';

    var prazna = !zapisi || zapisi.length === 0;
    istorijaPrazna.hidden = !prazna;
    dugmeObrisi.disabled = prazna;
    if (prazna) return;

    var i;
    for (i = 0; i < zapisi.length; i++) {
      istorijaLista.appendChild(napraviStavku(zapisi[i]));
    }
  }

  function napraviStavku(zapis) {
    var stavka = document.createElement('li');

    var dugme = document.createElement('button');
    dugme.type = 'button';
    dugme.className = 'istorija-stavka';
    dugme.title = zapis.izraz + ' = ' + zapis.rezultat + '  (' + formatirajVreme(zapis.vreme) + ')';

    var izraz = document.createElement('span');
    izraz.className = 'istorija-izraz';
    izraz.textContent = zapis.izraz;

    var rezultat = document.createElement('span');
    rezultat.className = 'istorija-rezultat';
    rezultat.textContent = zapis.rezultat;

    dugme.appendChild(izraz);
    dugme.appendChild(rezultat);
    dugme.addEventListener('click', function () {
      ubaci(zapis.rezultat);   // klik na zapis ubacuje rezultat u tekuci izraz
    });

    stavka.appendChild(dugme);
    return stavka;
  }

  /* ---------- dogadjaji ---------- */

  dugmad.addEventListener('click', function (dogadjaj) {
    var dugme = dogadjaj.target.closest('.dugme');
    if (!dugme) return;

    var radnja = dugme.getAttribute('data-radnja');
    if (radnja === 'ocisti') ocisti();
    else if (radnja === 'brisi') obrisiZnak();
    else if (radnja === 'znak') promeniZnak();
    else if (radnja === 'izracunaj') izvrsi();
    else ubaci(dugme.getAttribute('data-unos'));
  });

  // Ciscenje onoga sto je otkucano ili nalepljeno, uz cuvanje pozicije kareta.
  unos.addEventListener('input', function () {
    var pocetak = unos.selectionStart;
    var original = unos.value;
    var ocisceno = '';
    var i;
    var izbaceno = 0;

    for (i = 0; i < original.length; i++) {
      if (DOZVOLJENI.test(original.charAt(i))) {
        ocisceno += original.charAt(i);
      } else if (i < pocetak) {
        izbaceno++;
      }
    }

    if (ocisceno !== original) {
      unos.value = ocisceno;
      unos.setSelectionRange(pocetak - izbaceno, pocetak - izbaceno);
    }

    ocistiPoruku();
    osveziPregled();
  });

  function kratkoOsvetli(znak) {
    var dugme = dugmad.querySelector('[data-unos="' + znak + '"]');
    if (!dugme) return;
    dugme.classList.add('pritisnuto');
    setTimeout(function () { dugme.classList.remove('pritisnuto'); }, 110);
  }

  document.addEventListener('keydown', function (dogadjaj) {
    if (dogadjaj.ctrlKey || dogadjaj.altKey || dogadjaj.metaKey) return;

    if (dogadjaj.key === 'Enter' || dogadjaj.key === '=') {
      dogadjaj.preventDefault();
      izvrsi();
      return;
    }

    if (dogadjaj.key === 'Escape') {
      dogadjaj.preventDefault();
      ocisti();
      return;
    }

    if (dogadjaj.key.length === 1 && DOZVOLJENI.test(dogadjaj.key)) {
      kratkoOsvetli(dogadjaj.key === ',' ? '.' : dogadjaj.key);
      // Ako je fokus odlutao na dugme ili istoriju, znak svejedno ide u izraz.
      if (document.activeElement !== unos) {
        dogadjaj.preventDefault();
        ubaci(dogadjaj.key === ',' ? '.' : dogadjaj.key);
      }
      return;
    }

    if (dogadjaj.key === 'Backspace' && document.activeElement !== unos) {
      dogadjaj.preventDefault();
      obrisiZnak();
    }
  });

  dugmeObrisi.addEventListener('click', function () {
    if (!window.confirm('Obrisati celu istoriju? Ovo se ne može opozvati.')) return;
    most.obrisiIstoriju().then(nacrtajIstoriju);
    unos.focus();
  });

  /* ---------- pokretanje ---------- */

  most.ucitajIstoriju().then(nacrtajIstoriju);

  most.gdeSuPodaci().then(function (putanja) {
    poljePutanje.textContent = putanja;
    poljePutanje.title = putanja;
  });

  ocistiPoruku();
  osveziPregled();
  unos.focus();
})();
