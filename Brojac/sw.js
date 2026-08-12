/* Service worker za Brojač.

   Aplikacija nema nijedan mrežni poziv — sve što joj treba je u ljusci ispod.
   Zato je strategija cache-first: offline je normalno stanje, ne izuzetak.

   VAŽNO: pri svakoj izmeni bilo kog fajla iz LJUSKA podigni VERZIJA.
   Bez toga 'activate' ne briše stari keš i telefon ostaje na staroj verziji. */

var VERZIJA = 'v2';
var KES = 'brojac-' + VERZIJA;

var LJUSKA = [
  './',
  'index.html',
  'manifest.webmanifest',
  'fonts/archivo-latin.woff2',
  'fonts/archivo-latin-ext.woff2',
  'fonts/martian-mono-latin.woff2',
  'fonts/martian-mono-latin-ext.woff2',
  'icons/ikona-192.png',
  'icons/ikona-512.png',
  'icons/ikona-512-maskable.png',
  'icons/apple-touch-icon.png'
];

self.addEventListener('install', function(dogadjaj){
  dogadjaj.waitUntil(
    caches.open(KES).then(function(kes){
      return kes.addAll(LJUSKA);
    }).then(function(){
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function(dogadjaj){
  dogadjaj.waitUntil(
    caches.keys().then(function(imena){
      return Promise.all(imena.map(function(ime){
        if(ime !== KES) return caches.delete(ime);
        return null;
      }));
    }).then(function(){
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function(dogadjaj){
  var zahtev = dogadjaj.request;
  if(zahtev.method !== 'GET') return;

  dogadjaj.respondWith(
    caches.match(zahtev).then(function(pogodak){
      if(pogodak) return pogodak;
      return fetch(zahtev).catch(function(){
        /* Van keša i bez mreže: navigacija svejedno dobija ljusku,
           pa aplikacija ne pokazuje dinosaurusa. */
        if(zahtev.mode === 'navigate') return caches.match('index.html');
        return Response.error();
      });
    })
  );
});
