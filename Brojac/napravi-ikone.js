/* Pravi PNG ikonice iz marke koja stoji u index.html (mesingana poluga,
   koštani bubanj, cifra 1). Pokretanje:  node napravi-ikone.js
   Geometrija je ista kao u <svg class="mark"> — ako se marka menja tamo,
   promeni je i ovde, pa pusti skriptu ponovo. */

var fs = require('fs');
var putanja = require('path');
var sharp = require('sharp');

var POLJE = '#2B302C';   /* pozadina */
var MESING = '#C29B4A';
var KOST = '#EDE9DE';
var MASTILO = '#171916';

var IZLAZ = putanja.join(__dirname, 'icons');

/* Same shape marke, bez pozadine. Crta se u koordinatama 64x64;
   sadržaj zauzima pravougaonik x 10..54, y 10..50. */
var SADRZAJ = { x: 10, y: 10, s: 44, v: 40 };

function marka(){
  return '' +
    '<rect x="10" y="10" width="44" height="4" rx="2" fill="' + MESING + '"/>' +
    '<rect x="10" y="19" width="44" height="31" rx="6" fill="' + KOST + '"/>' +
    '<path d="M24 30 L31 24 L31 31 Z" fill="' + MASTILO + '"/>' +
    '<rect x="29" y="24" width="6" height="17" fill="' + MASTILO + '"/>' +
    '<rect x="23" y="40" width="18" height="4" rx="1" fill="' + MASTILO + '"/>';
}

/* Ikonica identična marki u zaglavlju: zaobljena pozadina, sadržaj do ivica. */
function svgPuna(velicina){
  var rx = 14 / 64 * velicina;
  return '<svg xmlns="http://www.w3.org/2000/svg" width="' + velicina + '" height="' + velicina + '" viewBox="0 0 64 64">' +
    '<rect width="64" height="64" rx="14" fill="' + POLJE + '"/>' +
    marka() +
    '</svg>';
}

/* Pozadina preko celog platna, marka centrirana i smanjena tako da ostane
   prazan pojas okolo. udeo = koliki deo stranice sme da zauzme sadržaj
   (0.8 znači ~10% praznog sa svake strane — bezbedna zona za maskable). */
function svgSaProstorom(velicina, udeo){
  var razmera = velicina * udeo / SADRZAJ.s;
  var pomakX = (velicina - SADRZAJ.s * razmera) / 2 - SADRZAJ.x * razmera;
  var pomakY = (velicina - SADRZAJ.v * razmera) / 2 - SADRZAJ.y * razmera;
  return '<svg xmlns="http://www.w3.org/2000/svg" width="' + velicina + '" height="' + velicina + '">' +
    '<rect width="' + velicina + '" height="' + velicina + '" fill="' + POLJE + '"/>' +
    '<g transform="translate(' + pomakX.toFixed(3) + ',' + pomakY.toFixed(3) + ') scale(' + razmera.toFixed(5) + ')">' +
    marka() +
    '</g></svg>';
}

var poslovi = [
  { fajl: 'ikona-192.png',          svg: svgPuna(192) },
  { fajl: 'ikona-512.png',          svg: svgPuna(512) },
  { fajl: 'ikona-512-maskable.png', svg: svgSaProstorom(512, 0.8) },
  { fajl: 'apple-touch-icon.png',   svg: svgSaProstorom(180, 0.86) }
];

if(!fs.existsSync(IZLAZ)) fs.mkdirSync(IZLAZ);

poslovi.reduce(function(lanac, p){
  return lanac.then(function(){
    return sharp(Buffer.from(p.svg))
      .png({ compressionLevel: 9 })
      .toFile(putanja.join(IZLAZ, p.fajl))
      .then(function(info){
        console.log('  ' + p.fajl + '  ' + info.width + 'x' + info.height + '  ' + info.size + ' B');
      });
  });
}, Promise.resolve())
  .then(function(){ console.log('Gotovo — ikonice su u icons/'); })
  .catch(function(g){ console.error('PALO: ' + g.message); process.exit(1); });
