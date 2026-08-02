/*
 * Preload — jedini most izmedju renderera i glavnog procesa.
 *
 * Renderer dobija tacno ove cetiri funkcije i nista vise: bez `require`,
 * bez `fs`, bez `ipcRenderer`. Sve je Promise.
 */
'use strict';

var electron = require('electron');

electron.contextBridge.exposeInMainWorld('kalkulatorMost', {
  ucitajIstoriju: function () {
    return electron.ipcRenderer.invoke('kalk:istorija-ucitaj');
  },

  dodajUIstoriju: function (izraz, rezultat) {
    return electron.ipcRenderer.invoke('kalk:istorija-dodaj', {
      izraz: String(izraz),
      rezultat: String(rezultat)
    });
  },

  obrisiIstoriju: function () {
    return electron.ipcRenderer.invoke('kalk:istorija-obrisi');
  },

  gdeSuPodaci: function () {
    return electron.ipcRenderer.invoke('kalk:gde-su-podaci');
  }
});
