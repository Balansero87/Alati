/*
 * Samoprovera — bez frejmvorka, bez zavisnosti.
 *
 *   npm test        (u folderu kalkulator/)
 *   node samoprovera.js
 *
 * Izlazni kod je 0 ako sve prodje, 1 ako nesto padne.
 */
'use strict';

var putanja = require('path');
var os = require('os');
var fs = require('fs');

var Racunanje = require('./renderer/racunanje.js');
var napraviSkladiste = require('./skladiste.js');

var ukupno = 0;
var palo = 0;

function proveri(naziv, dobio, ocekivano) {
  ukupno++;
  var a = JSON.stringify(dobio);
  var b = JSON.stringify(ocekivano);
  if (a === b) {
    console.log('  ok   ' + naziv);
  } else {
    palo++;
    console.log('  PALO ' + naziv + '\n         dobio:     ' + a + '\n         ocekivano: ' + b);
  }
}

/* Proverava da poziv baci gresku sa tacno ovom porukom. */
function proveriGresku(naziv, funkcija, ocekivanaPoruka) {
  ukupno++;
  var poruka = null;
  try {
    funkcija();
  } catch (e) {
    poruka = e.message;
  }
  if (poruka === ocekivanaPoruka) {
    console.log('  ok   ' + naziv);
  } else {
    palo++;
    console.log('  PALO ' + naziv + '\n         dobio:     ' + JSON.stringify(poruka) +
      '\n         ocekivano: ' + JSON.stringify(ocekivanaPoruka));
  }
}

function racunaj(izraz) {
  return Racunanje.izracunaj(izraz);
}

console.log('\nracunanje — osnovne operacije');
proveri('sabiranje', racunaj('2+3'), 5);
proveri('oduzimanje', racunaj('10-4'), 6);
proveri('mnozenje', racunaj('6*7'), 42);
proveri('deljenje', racunaj('9/2'), 4.5);
proveri('jedan broj bez operacije', racunaj('42'), 42);
proveri('decimalni broj', racunaj('1.5+2.25'), 3.75);
proveri('decimalni zarez isto kao tacka', racunaj('1,5+1,5'), 3);
proveri('broj koji pocinje tackom', racunaj('.5+.5'), 1);
proveri('razmaci se ignorisu', racunaj('  2  +  3  '), 5);

console.log('\nracunanje — prioritet i zagrade');
proveri('mnozenje pre sabiranja', racunaj('2+3*4'), 14);
proveri('deljenje pre oduzimanja', racunaj('10-6/2'), 7);
proveri('zagrade menjaju prioritet', racunaj('(2+3)*4'), 20);
proveri('ugnezdene zagrade', racunaj('((1+2)*(3+4))'), 21);
proveri('levo-asocijativno oduzimanje', racunaj('10-3-2'), 5);
proveri('levo-asocijativno deljenje', racunaj('100/5/2'), 10);
proveri('implicitno mnozenje pred zagradom', racunaj('2(3+1)'), 8);
proveri('implicitno mnozenje izmedju zagrada', racunaj('(1+1)(2+2)'), 8);

console.log('\nracunanje — unarni znak');
proveri('negativan broj na pocetku', racunaj('-5+8'), 3);
proveri('unarni plus', racunaj('+5'), 5);
proveri('minus posle operatora', racunaj('2*-3'), -6);
proveri('dvostruki minus', racunaj('2--3'), 5);
proveri('minus pred zagradom', racunaj('-(2+3)'), -5);
proveri('unarni minus jace vezuje od mnozenja', racunaj('-2*3'), -6);

console.log('\nracunanje — procenat (postfiks: deli sa 100)');
proveri('procenat samostalno', racunaj('50%'), 0.5);
proveri('procenat od broja', racunaj('200*15%'), 30);
proveri('procenat u sabiranju', racunaj('2+3%'), 2.03);
proveri('procenat na zagradu', racunaj('(20+30)%'), 0.5);

console.log('\nracunanje — greske');
proveriGresku('prazan izraz', function () { racunaj(''); }, 'Prazan izraz');
proveriGresku('sam razmak je prazan izraz', function () { racunaj('   '); }, 'Prazan izraz');
proveriGresku('deljenje nulom', function () { racunaj('5/0'); }, 'Deljenje nulom');
proveriGresku('deljenje izrazom koji je nula', function () { racunaj('5/(3-3)'); }, 'Deljenje nulom');
proveriGresku('nezatvorena zagrada', function () { racunaj('(2+3'); }, 'Nezatvorena zagrada');
proveriGresku('visak zatvorene zagrade', function () { racunaj('2+3)'); }, 'Visak zatvorene zagrade');
proveriGresku('operator bez desne strane', function () { racunaj('2+'); }, 'Neispravan izraz');
proveriGresku('prazne zagrade', function () { racunaj('()'); }, 'Neispravan izraz');
proveriGresku('dve tacke u broju', function () { racunaj('1.2.3'); }, 'Neispravan broj');
proveriGresku('sama tacka', function () { racunaj('.'); }, 'Neispravan broj');
proveriGresku('nepoznat znak', function () { racunaj('2$3'); }, 'Nepoznat znak: $');
proveriGresku('eksponentni zapis nije podrzan na ulazu', function () { racunaj('1e9'); }, 'Nepoznat znak: e');

console.log('\nracunanje — zamene znakova sa dugmadi');
proveri('znak puta ×', racunaj('6×7'), 42);
proveri('znak podeljeno ÷', racunaj('84÷2'), 42);
proveri('tipografski minus −', racunaj('10−4'), 6);

console.log('\nformatiraj');
proveri('ceo broj', Racunanje.formatiraj(5), '5');
proveri('nula', Racunanje.formatiraj(0), '0');
proveri('minus nula je nula', Racunanje.formatiraj(-0), '0');
proveri('binarno smece se odseca', Racunanje.formatiraj(0.1 + 0.2), '0.3');
proveri('trecina ostaje citljiva', Racunanje.formatiraj(1 / 3), '0.333333333333');
proveri('negativan decimalni', Racunanje.formatiraj(-2.5), '-2.5');
proveri('veliki broj u eksponent', Racunanje.formatiraj(1e20), '1e20');
proveri('mali broj u eksponent', Racunanje.formatiraj(1.5e-10), '1.5e-10');
proveri('NaN je greska', Racunanje.formatiraj(NaN), 'Greška');
proveri('beskonacno je greska', Racunanje.formatiraj(Infinity), 'Greška');

console.log('\njeKompletan');
proveri('pun izraz je kompletan', Racunanje.jeKompletan('2+2'), true);
proveri('izraz u toku kucanja nije', Racunanje.jeKompletan('2+'), false);
proveri('prazan nije', Racunanje.jeKompletan(''), false);

console.log('\ntokenizuj / uPostfiks');
proveri('broj tokena', Racunanje.tokenizuj('12+3.5').length, 3);
proveri('postfiks za 2+3*4', Racunanje.uPostfiks(Racunanje.tokenizuj('2+3*4')), [2, 3, 4, '*', '+']);
proveri('postfiks za (2+3)*4', Racunanje.uPostfiks(Racunanje.tokenizuj('(2+3)*4')), [2, 3, '+', 4, '*']);

console.log('\nskladiste (privremeni folder, ne dira stvarne podatke)');
var probniFolder = fs.mkdtempSync(putanja.join(os.tmpdir(), 'kalkulator-test-'));
var probnaPutanja = putanja.join(probniFolder, 'podaci.json');
var skladiste = napraviSkladiste(probnaPutanja);

proveri('prazna istorija na pocetku', skladiste.ucitajIstoriju(), []);
skladiste.dodajUIstoriju('2+2', '4');
skladiste.dodajUIstoriju('3*3', '9');
var istorija = skladiste.ucitajIstoriju();
proveri('istorija ima dva zapisa', istorija.length, 2);
proveri('najnoviji zapis je prvi', istorija[0].izraz, '3*3');
proveri('rezultat je sacuvan', istorija[0].rezultat, '9');
proveri('zapis ima vreme', typeof istorija[0].vreme, 'number');
proveri('fajl zaista postoji na disku', fs.existsSync(probnaPutanja), true);

var ponovoUcitano = napraviSkladiste(probnaPutanja).ucitajIstoriju();
proveri('podaci prezive novo otvaranje', ponovoUcitano.length, 2);

skladiste.obrisiIstoriju();
proveri('brisanje prazni istoriju', skladiste.ucitajIstoriju(), []);

var i;
for (i = 0; i < 210; i++) skladiste.dodajUIstoriju('1+' + i, String(1 + i));
proveri('istorija je ogranicena na 200', skladiste.ucitajIstoriju().length, 200);
proveri('ogranicenje baca najstarije', skladiste.ucitajIstoriju()[199].izraz, '1+10');

skladiste.sacuvajProzor({ sirina: 900, visina: 640, x: 10, y: 20 });
proveri('dimenzije prozora se pamte', napraviSkladiste(probnaPutanja).ucitajProzor().sirina, 900);

fs.writeFileSync(probnaPutanja, '{ ovo nije validan json', 'utf8');
var posleKvara = napraviSkladiste(probnaPutanja);
proveri('ostecen fajl ne rusi aplikaciju', posleKvara.ucitajIstoriju(), []);
proveri('ostecen fajl je odlozen u stranu', fs.existsSync(probnaPutanja + '.osteceno'), true);
posleKvara.dodajUIstoriju('1+1', '2');
proveri('posle oporavka moze da se pise', posleKvara.ucitajIstoriju().length, 1);

fs.rmSync(probniFolder, { recursive: true, force: true });

console.log('\n' + (palo === 0 ? 'OK ' + ukupno + '/' + ukupno : 'PALO ' + palo + '/' + ukupno) + '\n');
process.exit(palo === 0 ? 0 : 1);
