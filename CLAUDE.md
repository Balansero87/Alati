# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Four unrelated tools. Three are browser tools written as single self-contained HTML files — inline CSS, one IIFE of ES5-style JavaScript, zero dependencies, no build step, no package manager; each is meant to be opened straight from disk and to keep working on older mobile browsers. The fourth is an Electron desktop app and is the one exception to all of that.

```
prevodilac/       Serbian ⇄ German translator
  prevodilac.html   standalone, double-click to open
  web/              same file as index.html + PWA wrapper (manifest.webmanifest, sw.js, icons)

smanji-slike/     image resizer and compressor
  smanji-slike.html standalone, double-click to open
  smanji-slike.ico  icon used by the desktop shortcut

kalkulator/       Electron desktop calculator (Windows, NSIS installer)
  package.json      entry point, npm scripts, electron-builder config
  main.js           main process — owns the data, only thing that touches disk
  preload.js        contextBridge, the renderer's entire API surface
  skladiste.js      JSON persistence in app.getPath('userData')
  renderer/         index.html, stil.css, renderer.js, racunanje.js
  samoprovera.js    72 assertions, no framework — `npm test`
  provera-ui.js     drives the real app through webContents — `npm run test:ui`
  napravi-ikonu.js  generates kalkulator.ico — `npm run ikona`
  kalkulator.ico    installer and window icon

Radgeld/          savings tracker — money not spent on driving
  radgeld.html      standalone, double-click to open; also the PWA entry point
  manifest.webmanifest, sw.js, ikona-192.png, ikona-512.png   PWA wrapper
  napravi-ikone.js  generates the two PNG icons — `node napravi-ikone.js`

docs/
  specifikacije/    design specs (+ the interactive mockup for smanji-slike)
  planovi/          implementation plans
  smanji-slike-dnevnik-izrade.md   review findings and rulings from the build
```

The four tools share nothing — no code, no assets, no conventions beyond style. Work on one without touching the others.

This **is** a git repository (branch `main`). Commit when the user asks.

## Adding a new tool (required convention)

Every tool gets its own folder. **Never add tool files to the repository root** — the root holds only `README.md`, `CLAUDE.md`, and dotfiles. This is a standing instruction from the user, not a suggestion.

When building a new tool:

1. **Create `<ime-alata>/` at the root**, kebab-case, Serbian name. The entry point is named after the folder — `<ime-alata>/<ime-alata>.html` for a browser tool, `package.json` + `main.js` for a desktop app. Everything belonging to that tool — icons, PWA wrapper, build config, assets — goes inside that folder and nowhere else.
2. **Follow the house style**: single self-contained HTML, inline CSS, one IIFE, ES5 (`var`, function declarations), zero dependencies, no build step. UI strings and code comments in Serbian (Latin script). If the tool genuinely cannot be a browser page — it needs the file system, a real installer, or OS integration — the single-file rule is off, but everything else still holds: ES5 style, Serbian, and no dependency you did not have to add. `kalkulator/` is the only tool that has taken this exit so far.
3. **Add a built-in self-check** if the tool has pure functions worth testing. Always the same `proveri(naziv, dobio, ocekivano)` helper comparing via `JSON.stringify`, always printing `OK n/n` or `PALO n/n`, never a framework or a dependency. Only the way it is launched differs: a browser tool puts the runner behind `#test` and exposes `window.samoprovera` for the console (`smanji-slike`); a Node or Electron tool is a plain script with an exit code (`kalkulator/samoprovera.js`, run by `npm test`).
4. **Write the spec to `docs/specifikacije/`** and the implementation plan to `docs/planovi/`, both dated `YYYY-MM-DD-<ime-alata>-*`.
5. **Update `README.md`** — this is the step that is easiest to skip and the one the user explicitly asked for:
   - a section for the tool: what it does, its path, and **whether it needs internet**
   - a row in the „Šta je gde" table
   - if it launches from a desktop shortcut, say so
6. **If it should launch like a normal program**, generate an `.ico` in the tool's folder. A browser tool then needs a desktop shortcut running `chrome.exe --app=file:///...`; that shortcut hard-codes an absolute path, so recreate it if the file ever moves. A packaged desktop app instead hands the `.ico` to its installer (`build.win.icon` in `kalkulator/package.json`) and the installer creates the shortcuts — nothing is hard-coded.

Do not reorganise or rename an existing tool's folder while adding a new one.

## Prevodilac SR ⇄ DE

**`prevodilac/prevodilac.html` and `prevodilac/web/index.html` are byte-identical copies.** There is no build that generates one from the other. Any edit must be written to both, and they must stay identical:

```bash
md5sum "prevodilac/prevodilac.html" "prevodilac/web/index.html"
```

Open the standalone file directly:

```bash
start "" "E:\Program Files\Claude code\prevodilac\prevodilac.html"
```

For anything involving the service worker, manifest, or install prompt, serve over HTTP — `file://` will not register a service worker:

```bash
npx serve "E:\Program Files\Claude code\prevodilac\web"
```

There is no test suite for this tool. Verify in the browser (console + rendered output).

### Do not undo these

- **Never send `auto` to the translation services.** `guessLang()` resolves the direction locally and it is always sent explicitly, because the services misidentify short Serbian text. `dirSel` overrides detection; ties fall back to SR → DE. If detection was on `auto` and the output came back identical to the input, `translateText()` retries the other way.
- **A failed chunk degrades, it does not throw.** It is left as the original text and counted in `res.failed`; only an all-chunks failure throws. The two services have different limits (3000 chars on the main path, 450 for MyMemory) — they are not interchangeable numbers.
- **Sie/du switching never re-fetches.** `rawOut` holds the untouched translation and `renderOutput()` applies the register on top of it. Keep it pure post-processing.
- **Clear `lastKey` before forcing a re-run.** It suppresses redundant translation as `direction|text`, so anything calling `translate(true)` must clear it first or nothing happens. Stale responses are dropped via `reqId`.
- **Bump the `CACHE` name in `web/sw.js` when changing the cached asset list**, or `activate` will not purge the old one. The worker is network-first on purpose — the cache is only an offline fallback. Paths inside `web/` are relative so the folder moves as a unit.
- Serbian comes back in Cyrillic; `toLatin()` converts it and handles the LJ/NJ/DŽ digraph casing rule. State lives in `localStorage` under `prevodilac.v3`.

## Smanji slike

Resizes and compresses images entirely in the browser via the Canvas API. **Makes no network requests at all** — no `fetch`, no `XMLHttpRequest`. It works from `file://` and offline, which is the whole point of the tool. Do not introduce any external resource.

```bash
start "" "E:\Program Files\Claude code\smanji-slike\smanji-slike.html"
```

A desktop shortcut launches it in a Chrome app window (`--app=file:///...`) with `smanji-slike.ico`. **The shortcut hard-codes the absolute path** — if this file moves, recreate the shortcut.

### Tests

This tool has a built-in self-check: **51 assertions**, no framework, no dependencies.

```bash
start "" "E:\Program Files\Claude code\smanji-slike\smanji-slike.html#test"
```

`#test` replaces the page with the results and puts `OK 51/51` or `PALO n/51` in the tab title. The runner is also exposed as `window.samoprovera()` so it can be called from the console — some environments drop the `#hash` on navigation.

The testable core is four units, the first three pure or nearly so: `racunajDimenzije`, `nacrtaj`, `uKodiraj`, `napraviZip`. Add an assertion for every one you touch. `proveri(naziv, dobio, ocekivano)` compares via `JSON.stringify`.

### Do not undo these

- **Every read of `stavke[i]` must check the slot is not `null` first.** Slots are reserved with `null` and filled asynchronously so rows keep input order regardless of decode order. This has been a crash twice.
- **Permanent and transient errors are different things.** `s.trajnaGreska` (decode failed — the file will never become an image) skips the item forever. A plain `s.greska` depends on current settings, so it is cleared before every new pass and the item is retried. Conflating them strands items permanently.
- **`efektivnoStanje()` sanitises before computing, not while typing.** A DPI that is not a positive number counts as 96 for the calculation, but the field and `localStorage` keep whatever the user typed — otherwise clearing the field to retype it would fight the user.
- **Processing is sequential on purpose,** one image at a time with `setTimeout(dalje, 0)` between them; `uToku`/`zahtev` restart the pass when settings change mid-run. Do not parallelise it. A failed image degrades to an error row and the batch continues.
- **`ImageBitmap` stays on `s.src` for the item's lifetime**, closed only in `ukloniStavku`, so changing a setting does not re-decode every file. The memory cost is documented under „Poznata ograničenja" in the spec.
- **`format` is read back from `localStorage` only if a matching `<option>` still exists**, and WEBP detection must run *after* `ucitaj()`. Settings live under `smanjiSlike.v1`, in try/catch for private mode.
- The ZIP writer is store-only by design — deflate gains ~0 on already-compressed images.

## Kalkulator

Electron desktop app. Expression-line calculator (`(2+3)*4`, not press-number-press-operator) with a history panel that persists to disk.

```bash
cd "E:\Program Files\Claude code\kalkulator"
npm start          # run it
npm test           # 72 assertions, no framework, no browser
npm run test:ui    # launches the real app, drives the UI, saves a screenshot
npm run dist       # NSIS installer into izlaz/
npm run ikona      # regenerate kalkulator.ico
```

`node_modules/` and `izlaz/` are gitignored. **npm blocks Electron's postinstall in this environment** — after a fresh `npm install`, `node_modules/electron/dist/electron.exe` will be missing. Fix with `node node_modules/electron/install.js`.

### Tests

`samoprovera.js` — **72 assertions**, `proveri(naziv, dobio, ocekivano)` plus `proveriGresku(naziv, funkcija, poruka)` for the error paths, exit code 0 or 1. Add an assertion for every pure function you touch.

`provera-ui.js` (`npm run test:ui`) — **16 checks** covering what `samoprovera.js` cannot: it `require`s the **real** `main.js` after pointing `userData` at a temp folder, drives the actual page with `webContents.executeJavaScript`, and saves `capturePage()` to a PNG. Do not verify this app by screenshotting the desktop; drive it through `webContents`.

`provera-ui.js` and `napravi-ikonu.js` are dev-only and excluded from the installer by the `files` list in `package.json`. `provera-ui.js` is the one file here that uses `async`/`await` — it never ships.

### Do not undo these

- **Do not widen the preload bridge.** `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`; the renderer gets exactly four functions on `window.kalkulatorMost` and reaches the disk only through IPC (`kalk:istorija-ucitaj`, `-dodaj`, `-obrisi`, `kalk:gde-su-podaci`). That is the whole security model.
- **Keep `renderer/racunanje.js` pure.** No DOM, no Electron, no `fs`. A UMD tail lets the same file load as a `<script>` in the renderer and as a `require()` in the test. The moment it touches the DOM, the test suite needs a browser.
- **Implicit multiplication goes on the operator stack, not the output.** `2(3+1)` and `(1+1)2` insert a `*` via `ubaciOperator()`. Pushing `'*'` straight to `izlaz` produces `[2,'*',3,1,'+']` and blows up at evaluation — this was a real bug caught by the self-check.
- **`skladiste.js` takes the file path as an argument** instead of calling `app.getPath()` itself. That is why the self-check can exercise it against a temp folder with no Electron running. Do not inline the path.
- **Writes are atomic and corruption is survivable.** `.tmp` then rename over the real file; unparseable JSON is renamed to `podaci.json.osteceno` and the app starts empty rather than crashing or overwriting. History is capped at 200 records, newest first.
- **A failed expression is shown in red and is not written to history.** An unfinished expression while typing is not an error at all — the preview line just goes blank.
- Percent is postfix "divide by 100", always (`2+3%` → `2.03`). Windows Calculator's context-sensitive percent is deliberately not implemented — reasons in the spec.
- `kalkulator.ico` comes from `napravi-ikonu.js`. If it needs changing, edit `nacrtaj()` and rerun rather than adding an image library.

## RadGeld

Logs trips made by bike, on foot, or by public transport, and totals the money
not spent on driving. Everything in `localStorage` under `radGeld.v1`.

```bash
start "" "E:\Program Files\Claude code\Radgeld\radgeld.html"
```

### Tests

Built-in self-check: **66 assertions**, no framework, no dependencies.

```bash
start "" "E:\Program Files\Claude code\Radgeld\radgeld.html#test"
```

`#test` replaces the page with the results and puts `OK 66/66` or `PALO n/66`
in the tab title; the runner is also exposed as `window.samoprovera()`.

### Do not undo these

- **Bump `KES` in `sw.js` when changing the cached file list**, or `activate`
  will not purge the old cache. Unlike prevodilac's worker this one is
  **cache-first**: RadGeld has nothing to fetch, so offline is the normal state,
  not a fallback. There is no second copy of the HTML — the PWA serves
  `radgeld.html` itself, so the byte-identical-twins rule from prevodilac does
  not apply here and must not be introduced.
- **The service worker is only registered over http(s)** (`prijaviRadnika`).
  From `file://` registration throws, so it is not attempted; the tool still
  works, just without offline install. A plain-HTTP LAN address is **not** a
  secure context either — service workers need HTTPS or localhost.
- **History is never recalculated.** Every ride carries `snimak`, the settings
  that were in effect when it was logged, and is always computed from it — a new
  fuel price applies only to rides added afterwards, so two rides in one list can
  legitimately use different prices. `postavkeZa()` is the *only* place that
  chooses snapshot over current settings, which is why `usteda`, `zbir`, and
  `grupisiPoMesecu` never took a new parameter. A ride with no snapshot falls
  back to current settings instead of throwing, and `migriraj()` stamps it once
  on load **and saves immediately** — without that write the snapshots live only
  in memory and the next reload re-derives them, defeating the freeze.
- **The fuel-price timestamp is only set on manual edits** (`cenaGorivaIzmenjena`,
  in the settings input handler, not in `sacuvaj`). Missing means "never set",
  which counts as stale at once. Migration deliberately does **not** invent one.
- **Savings are allowed to be negative.** A transit ticket costing more than the
  drive is a loss, shown in red and summed as-is. Clamping it to zero would make
  every total a lie. The assertion `usteda negativna` exists to lock this.
- **Settings are sanitised at calculation time, never while typing.**
  `sanirajPostavke()` is called on every render; the input field and
  `localStorage` keep the raw string. **`ucitaj()` deliberately does not
  sanitise** — if it did, every page load would overwrite what the user typed.
  Clearing a field to retype it must not fight the user.
- **Money is compared through `blizu()` in the self-check**, not `===`. Rounding
  happens only in `formatiraj`/`formatirajKm`/`formatirajKg`, at display time;
  sums add unrounded values. Exact float comparison here tests IEEE 754, not the
  formula.
- **The runner catches exceptions from `sveTvrdnje()`** and turns them into a
  failed assertion. Without it an undefined function kills the runner and the
  page renders blank, so a red state is invisible.
- A round trip is **one entry with doubled km** — the record has no notion of a
  return leg, and nothing is doubled in code.
- History is capped at 500 rides, newest first. Import replaces everything and
  sanitises the settings it reads, because that file came from outside.

## Language conventions

**Exception: RadGeld's UI is in English** — user-facing strings only, requested
explicitly. Its code, comments, and assertion names stay Serbian, as do its spec
and plan. Do not "fix" it back.

The other three tools: UI, all user-facing strings, and all code comments are in Serbian (Latin script). Keep new code in the same style — `var`, function declarations, no ES6+ syntax, no modules, no template literals.

Check before committing. **This should print nothing** — any hit is a real violation:

```bash
grep -nE "\blet\b|\bconst\b|=>" prevodilac/prevodilac.html smanji-slike/smanji-slike.html Radgeld/radgeld.html kalkulator/main.js kalkulator/preload.js kalkulator/skladiste.js kalkulator/renderer/*.js
```

`\bclass\b` is deliberately out of that pattern — it matched HTML `class` attributes 42 times in one file, so nobody ever read the hits and the check became noise. Look for real classes separately when you have reason to.

`kalkulator/provera-ui.js` and `kalkulator/napravi-ikonu.js` are not in the list on purpose: they are dev-only, never ship, and `provera-ui.js` uses `async`/`await` because the alternative is a pyramid of callbacks.

## Browser Automation — Native Navigation Only (HARD RULE)

When driving Claude in Chrome (`mcp__claude-in-chrome`) or the in-app Browser pane (`mcp__Claude_Browser__*`), use NATIVE navigation. Never drive by screenshots:

- Navigate by URL deep-links instead of clicking through menus.
- Locate elements with `find` (natural-language search) or `read_page` (accessibility tree, `filter: "interactive"`). Both return element refs.
- Click by passing that ref to `computer` instead of coordinates.
- Fill fields with `form_input` using the ref. Use `key` for Enter/Tab/Escape, `scroll_to` with a ref to bring elements into view.
- Verify each step with `find` or `read_page` on the new state — not by screenshotting.
- Screenshots are allowed ONLY when the deliverable itself is visual — never as the driving mechanism.

Why: the `computer` tool's own description tells you to consult a screenshot before clicking. Ignore that default. Screenshot-coordinate clicking is slow and misclicks constantly; accessibility refs are exact.

### Known quirk with local files

The Browser pane does not re-parse a `file://` page that was already loaded, and it drops the `#hash`. To get a genuinely fresh parse:

```js
fetch('smanji-slike.html?v=' + Date.now())
  .then(function (r) { return r.text(); })
  .then(function (html) { document.open(); document.write(html); document.close(); });
```

Then call `window.samoprovera()` directly instead of relying on `#test`. If `javascript_tool` reports no preview open, call `preview_start` with the `file://` URL first. Real drag-and-drop and the native file dialog are not reachable — build `File` objects and dispatch a synthetic `drop` with a `DataTransfer`.
