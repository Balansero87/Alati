/*
 * Racunanje — cista logika kalkulatora.
 *
 * Nema DOM-a, nema Electrona, nema fajl sistema. Zato moze da se testira
 * obicnim `node samoprovera.js`, bez pokretanja aplikacije.
 *
 * Ucitava se i u rendereru (obican <script>) i u testu (require).
 */
(function (globalniObjekat) {
  'use strict';

  // Prioritet operatora. Veci broj = jace vezuje.
  var PRIORITET = {
    '+': 2,
    '-': 2,
    '*': 3,
    '/': 3,
    'unarni-': 4
  };

  // Znakovi koje korisnik moze da otkuca, a koji znace isto sto i ASCII varijanta.
  var ZAMENE = {
    '×': '*',   // ×
    '÷': '/',   // ÷
    '−': '-',   // −
    '–': '-',   // –
    '—': '-',   // —
    ',': '.'         // srpski decimalni zarez
  };

  function Greska(poruka) {
    var g = new Error(poruka);
    g.naziv = 'GreskaRacunanja';
    return g;
  }

  function jeCifra(znak) {
    return znak >= '0' && znak <= '9';
  }

  /* Deli izraz na tokene: {vrsta: 'broj'|'operator'|'zagrada', vrednost}. */
  function tokenizuj(izraz) {
    if (typeof izraz !== 'string') throw Greska('Prazan izraz');

    var tokeni = [];
    var i = 0;

    while (i < izraz.length) {
      var znak = izraz.charAt(i);

      if (ZAMENE[znak]) znak = ZAMENE[znak];

      if (znak === ' ' || znak === '\t' || znak === '\n') {
        i++;
        continue;
      }

      if (jeCifra(znak) || znak === '.') {
        var pocetak = i;
        var tacaka = 0;
        while (i < izraz.length) {
          var t = izraz.charAt(i);
          if (t === ',') t = '.';
          if (jeCifra(t)) {
            i++;
          } else if (t === '.') {
            tacaka++;
            if (tacaka > 1) throw Greska('Neispravan broj');
            i++;
          } else {
            break;
          }
        }
        var tekst = izraz.slice(pocetak, i).replace(/,/g, '.');
        if (tekst === '.') throw Greska('Neispravan broj');
        tokeni.push({ vrsta: 'broj', vrednost: parseFloat(tekst) });
        continue;
      }

      if (znak === '+' || znak === '-' || znak === '*' || znak === '/') {
        tokeni.push({ vrsta: 'operator', vrednost: znak });
        i++;
        continue;
      }

      if (znak === '%') {
        tokeni.push({ vrsta: 'procenat', vrednost: '%' });
        i++;
        continue;
      }

      if (znak === '(' || znak === ')') {
        tokeni.push({ vrsta: 'zagrada', vrednost: znak });
        i++;
        continue;
      }

      throw Greska('Nepoznat znak: ' + znak);
    }

    return tokeni;
  }

  /*
   * Shunting-yard: infiksni tokeni -> postfiksni (RPN) niz.
   * Vraca niz stringova i brojeva, npr. [2, 3, '+'].
   */
  function uPostfiks(tokeni) {
    var izlaz = [];
    var stek = [];
    var ocekujemOperand = true;   // true = sledi broj, '(' ili unarni znak
    var k;

    /*
     * Stavlja binarni operator na stek, uz prethodno skidanje svega sto jace
     * ili jednako vezuje. Svi binarni operatori su levo-asocijativni; unarni
     * minus je desno-asocijativan pa se ne skida sam sa sobom.
     */
    function ubaciOperator(operator) {
      while (stek.length) {
        var vrh = stek[stek.length - 1];
        if (vrh === '(') break;
        if (PRIORITET[vrh] > PRIORITET[operator] ||
            (PRIORITET[vrh] === PRIORITET[operator] && vrh !== 'unarni-')) {
          izlaz.push(stek.pop());
        } else {
          break;
        }
      }
      stek.push(operator);
    }

    for (k = 0; k < tokeni.length; k++) {
      var token = tokeni[k];

      if (token.vrsta === 'broj') {
        // "(1+1)2" — implicitno mnozenje
        if (!ocekujemOperand) ubaciOperator('*');
        izlaz.push(token.vrednost);
        ocekujemOperand = false;
        continue;
      }

      if (token.vrsta === 'operator') {
        if (ocekujemOperand) {
          // Unarni znak ispred broja: -5, +5, 2*(-3)
          if (token.vrednost === '-') {
            stek.push('unarni-');
          } else if (token.vrednost !== '+') {
            throw Greska('Neispravan izraz');
          }
          continue;
        }
        ubaciOperator(token.vrednost);
        ocekujemOperand = true;
        continue;
      }

      if (token.vrsta === 'procenat') {
        if (ocekujemOperand) throw Greska('Neispravan izraz');
        // Postfiksni operator najviseg prioriteta — ide pravo na izlaz.
        izlaz.push('%');
        continue;
      }

      if (token.vrednost === '(') {
        if (!ocekujemOperand) ubaciOperator('*');   // 2(3+1) = 2*(3+1)
        stek.push('(');
        ocekujemOperand = true;
        continue;
      }

      // ')'
      if (ocekujemOperand) throw Greska('Neispravan izraz');
      var nadjenaOtvorena = false;
      while (stek.length) {
        var stavka = stek.pop();
        if (stavka === '(') {
          nadjenaOtvorena = true;
          break;
        }
        izlaz.push(stavka);
      }
      if (!nadjenaOtvorena) throw Greska('Visak zatvorene zagrade');
      ocekujemOperand = false;
    }

    if (ocekujemOperand && izlaz.length === 0 && stek.length === 0) {
      throw Greska('Prazan izraz');
    }
    if (ocekujemOperand) throw Greska('Neispravan izraz');

    while (stek.length) {
      var ostatak = stek.pop();
      if (ostatak === '(') throw Greska('Nezatvorena zagrada');
      izlaz.push(ostatak);
    }

    return izlaz;
  }

  /* Racuna postfiksni niz. */
  function izracunajPostfiks(postfiks) {
    var stek = [];
    var i;

    for (i = 0; i < postfiks.length; i++) {
      var stavka = postfiks[i];

      if (typeof stavka === 'number') {
        stek.push(stavka);
        continue;
      }

      if (stavka === 'unarni-') {
        if (stek.length < 1) throw Greska('Neispravan izraz');
        stek.push(-stek.pop());
        continue;
      }

      if (stavka === '%') {
        if (stek.length < 1) throw Greska('Neispravan izraz');
        stek.push(stek.pop() / 100);
        continue;
      }

      if (stek.length < 2) throw Greska('Neispravan izraz');
      var desni = stek.pop();
      var levi = stek.pop();

      if (stavka === '+') stek.push(levi + desni);
      else if (stavka === '-') stek.push(levi - desni);
      else if (stavka === '*') stek.push(levi * desni);
      else if (stavka === '/') {
        if (desni === 0) throw Greska('Deljenje nulom');
        stek.push(levi / desni);
      } else throw Greska('Nepoznat operator');
    }

    if (stek.length !== 1) throw Greska('Neispravan izraz');

    var rezultat = stek[0];
    if (!isFinite(rezultat)) throw Greska('Broj je prevelik');
    return rezultat;
  }

  /* Ceo put: tekst -> broj. Baca Error sa srpskom porukom. */
  function izracunaj(izraz) {
    return izracunajPostfiks(uPostfiks(tokenizuj(izraz)));
  }

  /*
   * Prikaz broja. Odseca smece iz binarne aritmetike (0.1+0.2) i prelazi
   * na eksponencijalni zapis kad broj izadje iz citljivog opsega.
   */
  function formatiraj(broj) {
    if (typeof broj !== 'number' || isNaN(broj)) return 'Greška';
    if (!isFinite(broj)) return 'Greška';
    if (broj === 0) return '0';   // gasi i -0

    var apsolutna = Math.abs(broj);
    if (apsolutna >= 1e15 || apsolutna < 1e-9) {
      return broj.toExponential(6)
        .replace(/\.?0+e/, 'e')
        .replace('e+', 'e');
    }

    return String(parseFloat(broj.toPrecision(12)));
  }

  /*
   * Da li izraz izgleda kao da je spreman za racunanje (za prikaz medjurezultata
   * dok korisnik kuca). Ne baca — samo kaze da/ne.
   */
  function jeKompletan(izraz) {
    try {
      izracunaj(izraz);
      return true;
    } catch (e) {
      return false;
    }
  }

  var api = {
    tokenizuj: tokenizuj,
    uPostfiks: uPostfiks,
    izracunajPostfiks: izracunajPostfiks,
    izracunaj: izracunaj,
    formatiraj: formatiraj,
    jeKompletan: jeKompletan
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    globalniObjekat.Racunanje = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
