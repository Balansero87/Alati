/*
 * Servisni radnik za RadGeld.
 *
 * Za razliku od prevodioca, ovde je keš prvi, ne mreža: alat nema šta da
 * dovuče sa interneta, pa je offline normalno stanje a ne rezervni plan.
 * Nova verzija se povlači u pozadini i vidi se pri sledećem otvaranju.
 *
 * Kad se promeni spisak fajlova, MORA da se promeni i ime keša — inače
 * "activate" ne obriše stari.
 */
'use strict';

var KES = 'radgeld-v1';

var FAJLOVI = [
  'radgeld.html',
  'manifest.webmanifest',
  'ikona-192.png',
  'ikona-512.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(KES).then(function (kes) {
      return kes.addAll(FAJLOVI);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (imena) {
      return Promise.all(imena.map(function (ime) {
        return ime === KES ? null : caches.delete(ime);
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') { return; }
  e.respondWith(
    caches.match(e.request).then(function (izKesa) {
      // Osvezavanje u pozadini: odgovor stize iz kesa odmah, a sledeci put
      // je novija verzija. Pad mreze se ignorise jer offline nije greska.
      var samreze = fetch(e.request).then(function (odgovor) {
        if (odgovor && odgovor.status === 200 && odgovor.type === 'basic') {
          var kopija = odgovor.clone();
          caches.open(KES).then(function (kes) { kes.put(e.request, kopija); });
        }
        return odgovor;
      }).catch(function () {
        return izKesa;
      });
      return izKesa || samreze;
    })
  );
});
