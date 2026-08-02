/* Service worker.
   Mreža ima prednost: aplikacija se uvek učitava sveža ako ima signala,
   pa nove verzije stižu same, bez ručnog podizanja broja verzije.
   Keš služi samo kao rezerva kad mreže nema.
   Sam prevod se namerno ne kešira — on uvek ide na mrežu. */

var CACHE = 'prevodilac-v3';
var ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return c.addAll(ASSETS); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;

  // Zahtevi ka prevodilačkim servisima idu pravo na mrežu.
  if (new URL(req.url).origin !== self.location.origin) return;

  e.respondWith(
    fetch(req).then(function (res) {
      // Osveži keš svakom uspešnom posetom.
      if (res && res.status === 200) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
      }
      return res;
    }).catch(function () {
      // Nema mreže — posluži poslednju sačuvanu verziju.
      return caches.match(req).then(function (hit) {
        return hit || caches.match('./index.html');
      });
    })
  );
});
