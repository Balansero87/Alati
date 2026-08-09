/*
 * Pravi ikone za PWA — bez ijedne spoljne zavisnosti.
 * Crta u RGBA bafer i pakuje u PNG (zlib iz Node-a), isti pristup kao
 * kalkulator/napravi-ikonu.js, samo je izlaz PNG a ne ICO.
 *
 *   node napravi-ikone.js
 */
'use strict';

var zlib = require('zlib');
var fs = require('fs');
var put = require('path');

/* ---------- crtanje ---------- */

function napraviPlatno(v) {
  return { w: v, h: v, piksel: Buffer.alloc(v * v * 4, 0) };
}

function stopi(platno, x, y, r, g, b, a) {
  if (a <= 0) { return; }
  var i = (y * platno.w + x) * 4;
  var p = platno.piksel;
  var staraA = p[i + 3] / 255;
  var novaA = a + staraA * (1 - a);
  if (novaA <= 0) { return; }
  p[i] = Math.round((r * a + p[i] * staraA * (1 - a)) / novaA);
  p[i + 1] = Math.round((g * a + p[i + 1] * staraA * (1 - a)) / novaA);
  p[i + 2] = Math.round((b * a + p[i + 2] * staraA * (1 - a)) / novaA);
  p[i + 3] = Math.round(novaA * 255);
}

/* Zaobljen pravougaonik preko funkcije udaljenosti — glatke ivice bez biblioteke. */
function pozadina(platno, boja, radijus) {
  var v = platno.w, x, y, dx, dy, ax, ay, d, pokrivenost;
  for (y = 0; y < v; y++) {
    for (x = 0; x < v; x++) {
      dx = Math.abs(x + 0.5 - v / 2) - (v / 2 - radijus);
      dy = Math.abs(y + 0.5 - v / 2) - (v / 2 - radijus);
      ax = Math.max(dx, 0);
      ay = Math.max(dy, 0);
      d = Math.sqrt(ax * ax + ay * ay) + Math.min(Math.max(dx, dy), 0) - radijus;
      pokrivenost = Math.min(Math.max(0.5 - d, 0), 1);
      stopi(platno, x, y, boja.r, boja.g, boja.b, pokrivenost);
    }
  }
}

/* Prsten: tocak bicikla. */
function prsten(platno, cx, cy, poluprecnik, debljina, boja) {
  var x, y, d, pokrivenost;
  for (y = 0; y < platno.h; y++) {
    for (x = 0; x < platno.w; x++) {
      d = Math.abs(Math.sqrt((x + 0.5 - cx) * (x + 0.5 - cx) +
                             (y + 0.5 - cy) * (y + 0.5 - cy)) - poluprecnik);
      pokrivenost = Math.min(Math.max(debljina / 2 - d + 0.5, 0), 1);
      stopi(platno, x, y, boja.r, boja.g, boja.b, pokrivenost);
    }
  }
}

/* Zica tocka. */
function zica(platno, cx, cy, ugao, duzina, debljina, boja) {
  var x2 = cx + Math.cos(ugao) * duzina;
  var y2 = cy + Math.sin(ugao) * duzina;
  var x, y, t, px, py, d, pokrivenost, dx = x2 - cx, dy = y2 - cy;
  var duzina2 = dx * dx + dy * dy;
  for (y = 0; y < platno.h; y++) {
    for (x = 0; x < platno.w; x++) {
      t = ((x + 0.5 - cx) * dx + (y + 0.5 - cy) * dy) / duzina2;
      t = Math.min(Math.max(t, 0), 1);
      px = cx + dx * t;
      py = cy + dy * t;
      d = Math.sqrt((x + 0.5 - px) * (x + 0.5 - px) + (y + 0.5 - py) * (y + 0.5 - py));
      pokrivenost = Math.min(Math.max(debljina / 2 - d + 0.5, 0), 1);
      stopi(platno, x, y, boja.r, boja.g, boja.b, pokrivenost);
    }
  }
}

function nacrtaj(v) {
  var platno = napraviPlatno(v);
  var zelena = { r: 21, g: 127, b: 59 };
  var bela = { r: 255, g: 255, b: 255 };
  pozadina(platno, zelena, v * 0.22);

  var cx = v / 2, cy = v / 2;
  var i;
  for (i = 0; i < 8; i++) {
    zica(platno, cx, cy, i * Math.PI / 4, v * 0.26, v * 0.028, bela);
  }
  prsten(platno, cx, cy, v * 0.28, v * 0.055, bela);
  prsten(platno, cx, cy, v * 0.055, v * 0.055, bela);
  return platno;
}

/* ---------- PNG ---------- */

var crcTabela = null;
function crc32(bafer) {
  if (!crcTabela) {
    crcTabela = [];
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) { c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); }
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
  ihdr[8] = 8;   // bita po kanalu
  ihdr[9] = 6;   // RGBA
  var sirovo = Buffer.alloc(platno.h * (platno.w * 4 + 1));
  for (var y = 0; y < platno.h; y++) {
    var izvor = y * platno.w * 4;
    var cilj = y * (platno.w * 4 + 1);
    sirovo[cilj] = 0;
    platno.piksel.copy(sirovo, cilj + 1, izvor, izvor + platno.w * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    deo('IHDR', ihdr),
    deo('IDAT', zlib.deflateSync(sirovo, { level: 9 })),
    deo('IEND', Buffer.alloc(0))
  ]);
}

/* ---------- izlaz ---------- */

[192, 512].forEach(function (v) {
  var ime = put.join(__dirname, 'ikona-' + v + '.png');
  fs.writeFileSync(ime, uPng(nacrtaj(v)));
  console.log('napravljeno: ' + ime);
});
