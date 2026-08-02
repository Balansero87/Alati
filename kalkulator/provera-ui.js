/*
 * Provera kroz pravu aplikaciju.
 *
 *   npm run test:ui
 *
 * Pokrece PRAVI main.js, ali sa userData preusmerenim u privremeni folder, pa
 * kroz stvarni prozor odradi racun, izazove gresku i proveri sta je zavrsilo
 * na disku. Ne ulazi u instaler — vidi "files" u package.json.
 *
 * Drugi argument je putanja gde da snimi sliku prozora (podrazumevano
 * snimak.png u tekucem folderu).
 */
'use strict';

var electron = require('electron');
var app = electron.app;
var fs = require('fs');
var os = require('os');
var path = require('path');

var privremeni = fs.mkdtempSync(path.join(os.tmpdir(), 'kalkulator-ui-'));
app.setPath('userData', privremeni);

require(path.join(__dirname, 'main.js'));

var greske = [];
function proveri(naziv, dobio, ocekivano) {
  var a = JSON.stringify(dobio);
  var b = JSON.stringify(ocekivano);
  if (a === b) console.log('  ok   ' + naziv);
  else {
    greske.push(naziv);
    console.log('  PALO ' + naziv + '  dobio: ' + a + '  ocekivano: ' + b);
  }
}

function cekaj(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

app.whenReady().then(async function () {
  var prozor = electron.BrowserWindow.getAllWindows()[0];
  if (!prozor) { console.log('NEMA PROZORA'); app.exit(1); return; }

  var wc = prozor.webContents;
  if (wc.isLoading()) {
    await new Promise(function (r) { wc.once('did-stop-loading', r); });
  }
  await cekaj(600);

  var konzolneGreske = [];
  wc.on('console-message', function (e) {
    if (e && (e.level === 'error' || e.level === 3)) konzolneGreske.push(e.message);
  });

  // 1) Racun preko dugmadi: 12 + 3 * 2 =
  var redosled = ['1', '2', '+', '3', '*', '2'];
  for (var i = 0; i < redosled.length; i++) {
    await wc.executeJavaScript(
      'document.querySelector(\'[data-unos="' + redosled[i] + '"]\').click(), null');
  }

  proveri('izraz sastavljen dugmadima',
    await wc.executeJavaScript('document.getElementById("unos").value'), '12+3*2');
  proveri('medjurezultat se prikazuje dok se kuca',
    await wc.executeJavaScript('document.getElementById("pregled").textContent'), '= 18');

  await wc.executeJavaScript('document.querySelector(\'[data-radnja="izracunaj"]\').click(), null');
  await cekaj(300);

  proveri('rezultat na ekranu',
    await wc.executeJavaScript('document.getElementById("unos").value'), '18');
  proveri('izraz ostaje u gornjoj liniji',
    await wc.executeJavaScript('document.getElementById("poruka").textContent'), '12+3*2 =');
  proveri('istorija ima jedan zapis',
    await wc.executeJavaScript('document.querySelectorAll(".istorija-stavka").length'), 1);
  proveri('zapis u istoriji pokazuje rezultat',
    await wc.executeJavaScript(
      'document.querySelector(".istorija-rezultat").textContent'), '18');

  // 2) Greska se prijavljuje i NE upisuje u istoriju
  await wc.executeJavaScript(
    'var u=document.getElementById("unos");u.value="5/0";' +
    'u.dispatchEvent(new Event("input",{bubbles:true}));' +
    'document.querySelector(\'[data-radnja="izracunaj"]\').click(), null');
  await cekaj(250);

  proveri('poruka o gresci',
    await wc.executeJavaScript('document.getElementById("poruka").textContent'), 'Deljenje nulom');
  proveri('greska je oznacena crvenim',
    await wc.executeJavaScript(
      'document.getElementById("poruka").classList.contains("greska")'), true);
  proveri('greska se ne pamti u istoriji',
    await wc.executeJavaScript('document.querySelectorAll(".istorija-stavka").length'), 1);

  // 3) Tastatura
  await wc.executeJavaScript(
    'document.querySelector(\'[data-radnja="ocisti"]\').click();' +
    'var u=document.getElementById("unos");u.focus();u.value="(2+3)*4";' +
    'u.dispatchEvent(new Event("input",{bubbles:true}));' +
    'document.dispatchEvent(new KeyboardEvent("keydown",{key:"Enter",bubbles:true})), null');
  await cekaj(300);

  proveri('Enter racuna',
    await wc.executeJavaScript('document.getElementById("unos").value'), '20');

  // 4) Klik na zapis u istoriji ubacuje rezultat
  await wc.executeJavaScript(
    'document.querySelector(\'[data-radnja="ocisti"]\').click();' +
    'document.querySelectorAll(".istorija-stavka")[0].click(), null');
  await cekaj(200);
  proveri('klik na istoriju ubacuje rezultat',
    await wc.executeJavaScript('document.getElementById("unos").value'), '20');

  // 5) Podaci su na disku, u userData, kao JSON
  var putanjaFajla = path.join(privremeni, 'podaci.json');
  proveri('podaci.json postoji u userData', fs.existsSync(putanjaFajla), true);
  var sadrzaj = JSON.parse(fs.readFileSync(putanjaFajla, 'utf8'));
  proveri('istorija je zapisana u fajl', sadrzaj.istorija.length, 2);
  proveri('najnoviji zapis u fajlu', sadrzaj.istorija[0].izraz, '(2+3)*4');
  proveri('putanja se prikazuje u podnozju',
    await wc.executeJavaScript('document.getElementById("putanjaPodataka").textContent'),
    putanjaFajla);

  proveri('nema gresaka u konzoli renderera', konzolneGreske, []);

  // Slika za vizuelnu proveru
  var slika = await wc.capturePage();
  var putanjaSlike = process.argv[2] || path.join(os.tmpdir(), 'kalkulator-snimak.png');
  fs.writeFileSync(putanjaSlike, slika.toPNG());
  console.log('\nslika prozora: ' + putanjaSlike);

  console.log(greske.length === 0 ? 'UI OK' : 'UI PALO: ' + greske.join(', '));

  // Electron jos drzi fajlove u privremenom folderu — brisanje sme da ne uspe.
  try {
    fs.rmSync(privremeni, { recursive: true, force: true });
  } catch (e) {
    console.log('(privremeni folder ostaje: ' + privremeni + ')');
  }

  app.exit(greske.length === 0 ? 0 : 1);
});
