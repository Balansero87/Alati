/*
 * Glavni proces.
 *
 * Otvara prozor, vlasnik je podataka i jedini prica sa diskom. Renderer trazi
 * podatke preko IPC-a (kanali 'kalk:*'); nema ni node integraciju ni pristup
 * fajl sistemu.
 */
'use strict';

var electron = require('electron');
var putanja = require('path');
var napraviSkladiste = require('./skladiste.js');

var app = electron.app;
var BrowserWindow = electron.BrowserWindow;
var ipcMain = electron.ipcMain;

var PODRAZUMEVANI_PROZOR = { sirina: 880, visina: 660 };
var NAJMANJI_PROZOR = { sirina: 560, visina: 520 };

var skladiste = null;
var glavniProzor = null;
var tajmerZaPamcenjeProzora = null;

/* Podaci idu u %APPDATA%\Kalkulator\podaci.json — ne u localStorage. */
function putanjaPodataka() {
  return putanja.join(app.getPath('userData'), 'podaci.json');
}

/* Snimanje dimenzija prozora se odlaze da vucenje ivice ne pise 50 puta u sekundi. */
function zapamtiProzorUskoro() {
  if (tajmerZaPamcenjeProzora) clearTimeout(tajmerZaPamcenjeProzora);
  tajmerZaPamcenjeProzora = setTimeout(zapamtiProzorOdmah, 400);
}

function zapamtiProzorOdmah() {
  if (tajmerZaPamcenjeProzora) {
    clearTimeout(tajmerZaPamcenjeProzora);
    tajmerZaPamcenjeProzora = null;
  }
  if (!glavniProzor || glavniProzor.isDestroyed()) return;
  if (glavniProzor.isMinimized() || glavniProzor.isMaximized()) return;

  var okvir = glavniProzor.getNormalBounds();
  skladiste.sacuvajProzor({
    sirina: okvir.width,
    visina: okvir.height,
    x: okvir.x,
    y: okvir.y
  });
}

function napraviProzor() {
  var zapamcen = skladiste.ucitajProzor();
  var opcije = {
    width: zapamcen ? zapamcen.sirina : PODRAZUMEVANI_PROZOR.sirina,
    height: zapamcen ? zapamcen.visina : PODRAZUMEVANI_PROZOR.visina,
    minWidth: NAJMANJI_PROZOR.sirina,
    minHeight: NAJMANJI_PROZOR.visina,
    backgroundColor: '#f4f5f7',
    show: false,
    title: 'Kalkulator',
    autoHideMenuBar: true,
    webPreferences: {
      preload: putanja.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  };

  if (zapamcen && typeof zapamcen.x === 'number' && typeof zapamcen.y === 'number') {
    opcije.x = zapamcen.x;
    opcije.y = zapamcen.y;
  }

  glavniProzor = new BrowserWindow(opcije);
  glavniProzor.removeMenu();
  glavniProzor.loadFile(putanja.join(__dirname, 'renderer', 'index.html'));

  // Prikazujemo tek kad je iscrtano — bez belog bleska pri pokretanju.
  glavniProzor.once('ready-to-show', function () {
    glavniProzor.show();
  });

  glavniProzor.on('resize', zapamtiProzorUskoro);
  glavniProzor.on('move', zapamtiProzorUskoro);
  glavniProzor.on('close', zapamtiProzorOdmah);
  glavniProzor.on('closed', function () {
    glavniProzor = null;
  });

  // F12 otvara alatke za razvoj; meni je sklonjen pa nema drugog puta.
  glavniProzor.webContents.on('before-input-event', function (dogadjaj, unos) {
    if (unos.type === 'keyDown' && unos.key === 'F12') {
      glavniProzor.webContents.toggleDevTools();
      dogadjaj.preventDefault();
    }
  });

  // Aplikacija je potpuno lokalna — nista ne sme da otvori spoljasnju stranicu.
  glavniProzor.webContents.setWindowOpenHandler(function () {
    return { action: 'deny' };
  });
  glavniProzor.webContents.on('will-navigate', function (dogadjaj) {
    dogadjaj.preventDefault();
  });
}

/* Drugo pokretanje samo izvlaci postojeci prozor u prvi plan. */
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', function () {
    if (!glavniProzor) return;
    if (glavniProzor.isMinimized()) glavniProzor.restore();
    glavniProzor.focus();
  });

  app.whenReady().then(function () {
    skladiste = napraviSkladiste(putanjaPodataka());

    ipcMain.handle('kalk:istorija-ucitaj', function () {
      return skladiste.ucitajIstoriju();
    });

    ipcMain.handle('kalk:istorija-dodaj', function (dogadjaj, zapis) {
      if (!zapis || typeof zapis.izraz !== 'string' || typeof zapis.rezultat !== 'string') {
        return skladiste.ucitajIstoriju();
      }
      return skladiste.dodajUIstoriju(zapis.izraz, zapis.rezultat);
    });

    ipcMain.handle('kalk:istorija-obrisi', function () {
      return skladiste.obrisiIstoriju();
    });

    ipcMain.handle('kalk:gde-su-podaci', function () {
      return skladiste.putanja;
    });

    napraviProzor();

    app.on('activate', function () {
      if (BrowserWindow.getAllWindows().length === 0) napraviProzor();
    });
  });

  app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
  });
}
