/*
 * Skladiste — jedini deo aplikacije koji dira disk.
 *
 * Zivi u glavnom procesu. Renderer nema pristup fajl sistemu; sve ide preko IPC-a.
 * Podaci idu u JSON fajl u app.getPath('userData'), ne u localStorage.
 *
 * Cela struktura fajla:
 *   { "verzija": 1,
 *     "istorija": [ { "izraz": "2+2", "rezultat": "4", "vreme": 1754... } ],
 *     "prozor": { "sirina": 820, "visina": 620, "x": 100, "y": 60 } }
 */
'use strict';

var fs = require('fs');
var putanja = require('path');

var VERZIJA = 1;
var NAJVISE_ZAPISA = 200;   // starije se tiho odbacuje

function prazniPodaci() {
  return { verzija: VERZIJA, istorija: [], prozor: null };
}

/*
 * Pravi skladiste nad datim fajlom. Odmah ucitava sa diska, pa dalje radi
 * iz memorije i upisuje pri svakoj izmeni — fajl je mali, upis je jeftin.
 */
function napraviSkladiste(putanjaFajla) {
  var podaci = prazniPodaci();

  /* Ostecen fajl se sklanja u stranu umesto da se prepise ili srusi aplikaciju. */
  function odloziOsteceno() {
    try {
      fs.renameSync(putanjaFajla, putanjaFajla + '.osteceno');
    } catch (e) {
      // Ako ni to ne uspe, nastavljamo sa praznim podacima u memoriji.
    }
  }

  function ucitajSaDiska() {
    var sirovo;
    try {
      sirovo = fs.readFileSync(putanjaFajla, 'utf8');
    } catch (e) {
      return prazniPodaci();   // fajl jos ne postoji — prvo pokretanje
    }

    var procitano;
    try {
      procitano = JSON.parse(sirovo);
    } catch (e) {
      odloziOsteceno();
      return prazniPodaci();
    }

    if (!procitano || typeof procitano !== 'object' || !Array.isArray(procitano.istorija)) {
      odloziOsteceno();
      return prazniPodaci();
    }

    return {
      verzija: VERZIJA,
      istorija: procitano.istorija.filter(jeValidanZapis),
      prozor: jeValidanProzor(procitano.prozor) ? procitano.prozor : null
    };
  }

  /*
   * Atomican upis: prvo u privremeni fajl, pa rename preko pravog. Tako
   * prekid struje usred upisa ne ostavlja polupraznu istoriju.
   */
  function upisi() {
    var privremeni = putanjaFajla + '.tmp';
    try {
      fs.mkdirSync(putanja.dirname(putanjaFajla), { recursive: true });
      fs.writeFileSync(privremeni, JSON.stringify(podaci, null, 2), 'utf8');
      fs.renameSync(privremeni, putanjaFajla);
      return true;
    } catch (e) {
      try { fs.unlinkSync(privremeni); } catch (e2) { /* nema sta da se cisti */ }
      return false;
    }
  }

  podaci = ucitajSaDiska();

  return {
    putanja: putanjaFajla,

    ucitajIstoriju: function () {
      return podaci.istorija.slice();
    },

    /* Vraca ceo novi niz da renderer ne mora ponovo da pita. */
    dodajUIstoriju: function (izraz, rezultat) {
      var zapis = {
        izraz: String(izraz),
        rezultat: String(rezultat),
        vreme: Date.now()
      };
      podaci.istorija.unshift(zapis);
      if (podaci.istorija.length > NAJVISE_ZAPISA) {
        podaci.istorija.length = NAJVISE_ZAPISA;
      }
      upisi();
      return podaci.istorija.slice();
    },

    obrisiIstoriju: function () {
      podaci.istorija = [];
      upisi();
      return [];
    },

    ucitajProzor: function () {
      return podaci.prozor;
    },

    sacuvajProzor: function (prozor) {
      if (!jeValidanProzor(prozor)) return false;
      podaci.prozor = {
        sirina: Math.round(prozor.sirina),
        visina: Math.round(prozor.visina),
        x: typeof prozor.x === 'number' ? Math.round(prozor.x) : null,
        y: typeof prozor.y === 'number' ? Math.round(prozor.y) : null
      };
      return upisi();
    }
  };
}

function jeValidanZapis(zapis) {
  return !!zapis &&
    typeof zapis === 'object' &&
    typeof zapis.izraz === 'string' &&
    typeof zapis.rezultat === 'string' &&
    typeof zapis.vreme === 'number';
}

function jeValidanProzor(prozor) {
  return !!prozor &&
    typeof prozor === 'object' &&
    typeof prozor.sirina === 'number' && prozor.sirina > 0 &&
    typeof prozor.visina === 'number' && prozor.visina > 0;
}

module.exports = napraviSkladiste;
