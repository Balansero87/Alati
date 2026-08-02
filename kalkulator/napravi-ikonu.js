/*
 * Pravi kalkulator.ico — bez ijedne spoljne zavisnosti.
 * Crta u RGBA bafer, pakuje u PNG (zlib iz Node-a), pa PNG-ove u ICO kontejner.
 */
'use strict';

var zlib = require('zlib');
var fs = require('fs');

/* ---------- crtanje ---------- */

function napraviPlatno(velicina) {
  return { w: velicina, h: velicina, piksel: Buffer.alloc(velicina * velicina * 4, 0) };
}

function stopi(platno, x, y, r, g, b, a) {
  if (a <= 0) return;
  var i = (y * platno.w + x) * 4;
  var p = platno.piksel;
  var staraA = p[i + 3] / 255;
  var novaA = a + staraA * (1 - a);
  if (novaA <= 0) return;
  p[i] = Math.round((r * a + p[i] * staraA * (1 - a)) / novaA);
  p[i + 1] = Math.round((g * a + p[i + 1] * staraA * (1 - a)) / novaA);
  p[i + 2] = Math.round((b * a + p[i + 2] * staraA * (1 - a)) / novaA);
  p[i + 3] = Math.round(novaA * 255);
}

/* Udaljenost od zaobljenog pravougaonika (negativna unutra) — daje glatke ivice. */
function udaljenost(x, y, cx, cy, hw, hh, r) {
  var dx = Math.abs(x - cx) - (hw - r);
  var dy = Math.abs(y - cy) - (hh - r);
  var ax = Math.max(dx, 0);
  var ay = Math.max(dy, 0);
  return Math.sqrt(ax * ax + ay * ay) + Math.min(Math.max(dx, dy), 0) - r;
}

function pravougaonik(platno, x0, y0, x1, y1, r, boja) {
  var cx = (x0 + x1) / 2;
  var cy = (y0 + y1) / 2;
  var hw = (x1 - x0) / 2;
  var hh = (y1 - y0) / 2;

  var pocetakY = Math.max(0, Math.floor(y0 - 2));
  var krajY = Math.min(platno.h - 1, Math.ceil(y1 + 2));
  var pocetakX = Math.max(0, Math.floor(x0 - 2));
  var krajX = Math.min(platno.w - 1, Math.ceil(x1 + 2));

  for (var y = pocetakY; y <= krajY; y++) {
    for (var x = pocetakX; x <= krajX; x++) {
      var d = udaljenost(x + 0.5, y + 0.5, cx, cy, hw, hh, r);
      var pokrivenost = Math.min(Math.max(0.5 - d, 0), 1);
      if (pokrivenost <= 0) continue;
      var a = boja.a === undefined ? 1 : boja.a;
      // Vertikalni gradijent ako je zadat drugi ton.
      var t = boja.do ? (y - y0) / Math.max(1, y1 - y0) : 0;
      var r1 = boja.do ? boja.r + (boja.do.r - boja.r) * t : boja.r;
      var g1 = boja.do ? boja.g + (boja.do.g - boja.g) * t : boja.g;
      var b1 = boja.do ? boja.b + (boja.do.b - boja.b) * t : boja.b;
      stopi(platno, x, y, r1, g1, b1, pokrivenost * a);
    }
  }
}

function nacrtaj(velicina) {
  var platno = napraviPlatno(velicina);
  var s = velicina / 256;

  // Pozadina: zaobljeni kvadrat, indigo gradijent (isti ton kao dugme "=").
  pravougaonik(platno, 8 * s, 8 * s, 248 * s, 248 * s, 52 * s,
    { r: 0x4c, g: 0x5e, b: 0xf0, do: { r: 0x2f, g: 0x3f, b: 0xc8 } });

  // Ekran.
  pravougaonik(platno, 44 * s, 36 * s, 212 * s, 88 * s, 12 * s,
    { r: 255, g: 255, b: 255, a: 0.95 });

  // Tri reda po tri tastera.
  var kolone = 3;
  var redovi = 3;
  var levo = 44;
  var gore = 104;
  var sirinaTastera = 44;
  var visinaTastera = 28;
  var razmakX = 18;
  var razmakY = 16;

  for (var red = 0; red < redovi; red++) {
    for (var kolona = 0; kolona < kolone; kolona++) {
      var x = levo + kolona * (sirinaTastera + razmakX);
      var y = gore + red * (visinaTastera + razmakY);
      pravougaonik(platno, x * s, y * s, (x + sirinaTastera) * s, (y + visinaTastera) * s, 8 * s,
        { r: 255, g: 255, b: 255, a: red === 2 && kolona === 2 ? 1 : 0.72 });
    }
  }

  return platno;
}

/* ---------- PNG ---------- */

var crcTabela = null;
function crc32(bafer) {
  if (!crcTabela) {
    crcTabela = [];
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      crcTabela[n] = c >>> 0;
    }
  }
  var crc = 0xFFFFFFFF;
  for (var i = 0; i < bafer.length; i++) {
    crc = crcTabela[(crc ^ bafer[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function deo(tip, podaci) {
  var duzina = Buffer.alloc(4);
  duzina.writeUInt32BE(podaci.length, 0);
  var telo = Buffer.concat([Buffer.from(tip, 'ascii'), podaci]);
  var crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(telo), 0);
  return Buffer.concat([duzina, telo, crc]);
}

function uPng(platno) {
  var ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(platno.w, 0);
  ihdr.writeUInt32BE(platno.h, 4);
  ihdr[8] = 8;    // 8 bita po kanalu
  ihdr[9] = 6;    // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  var sirovo = Buffer.alloc(platno.h * (platno.w * 4 + 1));
  for (var y = 0; y < platno.h; y++) {
    var izvor = y * platno.w * 4;
    var cilj = y * (platno.w * 4 + 1);
    sirovo[cilj] = 0;   // filter 0 (none)
    platno.piksel.copy(sirovo, cilj + 1, izvor, izvor + platno.w * 4);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    deo('IHDR', ihdr),
    deo('IDAT', zlib.deflateSync(sirovo, { level: 9 })),
    deo('IEND', Buffer.alloc(0))
  ]);
}

/* ---------- ICO ---------- */

function uIco(slike) {
  var zaglavlje = Buffer.alloc(6);
  zaglavlje.writeUInt16LE(0, 0);
  zaglavlje.writeUInt16LE(1, 2);            // tip 1 = ikona
  zaglavlje.writeUInt16LE(slike.length, 4);

  var pomeraj = 6 + slike.length * 16;
  var stavke = [];
  var telo = [];

  slike.forEach(function (slika) {
    var stavka = Buffer.alloc(16);
    stavka[0] = slika.velicina >= 256 ? 0 : slika.velicina;
    stavka[1] = slika.velicina >= 256 ? 0 : slika.velicina;
    stavka[2] = 0;
    stavka[3] = 0;
    stavka.writeUInt16LE(1, 4);             // ravni
    stavka.writeUInt16LE(32, 6);            // bita po pikselu
    stavka.writeUInt32LE(slika.png.length, 8);
    stavka.writeUInt32LE(pomeraj, 12);
    pomeraj += slika.png.length;
    stavke.push(stavka);
    telo.push(slika.png);
  });

  return Buffer.concat([zaglavlje].concat(stavke).concat(telo));
}

var velicine = [256, 128, 64, 48, 32, 16];
var slike = velicine.map(function (v) {
  return { velicina: v, png: uPng(nacrtaj(v)) };
});

var izlaz = process.argv[2];
fs.writeFileSync(izlaz, uIco(slike));
console.log('napravljeno: ' + izlaz + ' (' + fs.statSync(izlaz).size + ' bajtova, ' +
  velicine.join('/') + ')');
