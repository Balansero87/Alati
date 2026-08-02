# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Three unrelated tools. Two are browser tools written as single self-contained HTML files — inline CSS, one IIFE of ES5-style JavaScript, zero dependencies, no build step, no package manager; each is meant to be opened straight from disk and to keep working on older mobile browsers. The third is an Electron desktop app and is the one exception to all of that.

```
prevodilac/       Serbian ⇄ German translator
  prevodilac.html   standalone, double-click to open
  web/              same file as index.html + PWA wrapper (manifest, sw.js, icons)

smanji-slike/     image resizer and compressor
  smanji-slike.html standalone, double-click to open
  smanji-slike.ico  icon used by the desktop shortcut

kalkulator/       Electron desktop calculator (Windows, NSIS installer)
  main.js           main process — owns the data, only thing that touches disk
  preload.js        contextBridge, the renderer's entire API surface
  skladiste.js      JSON persistence in app.getPath('userData')
  renderer/         index.html, stil.css, renderer.js, racunanje.js
  samoprovera.js    72 assertions, no framework — `npm test`
  kalkulator.ico    installer and window icon

docs/
  specifikacije/    design specs (+ the interactive mockup for smanji-slike)
  planovi/          implementation plans
  smanji-slike-dnevnik-izrade.md   review findings and rulings from the build
```

The three tools share nothing — no code, no assets, no conventions beyond style. Work on one without touching the others.

This **is** a git repository (branch `main`). Commit when the user asks.

## Adding a new tool (required convention)

Every tool gets its own folder. **Never add tool files to the repository root** — the root holds only `README.md`, `CLAUDE.md`, and dotfiles. This is a standing instruction from the user, not a suggestion.

When building a new tool:

1. **Create `<ime-alata>/` at the root**, kebab-case, Serbian name. The main file is named after the folder: `<ime-alata>/<ime-alata>.html`. Everything belonging to that tool — icons, PWA wrapper, assets — goes inside that folder and nowhere else.
2. **Follow the house style**: single self-contained HTML, inline CSS, one IIFE, ES5 (`var`, function declarations), zero dependencies, no build step. UI strings and code comments in Serbian (Latin script). If the tool genuinely cannot be a browser page — it needs the file system, a real installer, or OS integration — the single-file rule is off, but everything else still holds: ES5 style, Serbian, and no dependency you did not have to add. `kalkulator/` is the only tool that has taken this exit so far.
3. **Add a built-in self-check** if the tool has pure functions worth testing — same pattern as `smanji-slike`: a `proveri(naziv, dobio, ocekivano)` helper, a `samoprovera()` runner behind `#test`, and `window.samoprovera` exposed for the console. No framework, no dependency.
4. **Write the spec to `docs/specifikacije/`** and the implementation plan to `docs/planovi/`, both dated `YYYY-MM-DD-<ime-alata>-*`.
5. **Update `README.md`** — this is the step that is easiest to skip and the one the user explicitly asked for:
   - a section for the tool: what it does, its path, and **whether it needs internet**
   - a row in the „Šta je gde" table
   - if it launches from a desktop shortcut, say so
6. **If it should launch like a normal program**, generate an `.ico` in the tool's folder and create a desktop shortcut running `chrome.exe --app=file:///...`. The shortcut hard-codes an absolute path — recreate it if the file ever moves.

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

### Architecture

**Direction detection is local, deliberately.** `guessLang()` scores the input against hard-coded Serbian and German word lists (plus Cyrillic and diacritic checks) and the resolved direction is always sent explicitly to the translation service. The services' own `auto` detection misidentifies short Serbian text, so it is never used. The `dirSel` dropdown overrides detection. Ties fall back to Serbian → German, the primary use case.

**Translation is a two-service chain with chunking.** `translateChunk()` tries Google's unofficial `translate_a/single` endpoint and silently falls back to MyMemory. Both are keyless and anonymous, so limits differ: text is split at 3000 chars for the main path (`runDirection`) and MyMemory re-splits its input at 450 chars. `splitText()` cuts on paragraph → sentence → word boundaries. A chunk that fails is left as the original text and counted in `res.failed`, so a partial failure degrades instead of losing the whole translation; only an all-chunks failure throws.

**Auto-correcting a wrong direction guess.** If detection was on `auto`, no chunk failed, and the output came back identical to the input, `translateText()` retries in the opposite direction and keeps whichever result actually changed.

**Serbian output is transliterated.** The services return Serbian in Cyrillic; `toLatin()` converts it, handling the LJ/NJ/DŽ digraph casing rule.

**Sie/du register switching is pure post-processing.** `rawOut` holds the untouched translation. `renderOutput()` applies `toSie()` / `toDu()` on top of it, so toggling register never re-fetches. Both run per-sentence via `eachSentence()` and combine: greeting/sign-off phrase tables (`PHRASES_DU`, `PHRASES_SIE`), pronoun substitution, and verb conjugation built from `DU_IRREG`, `DU_IMP`, the derived `SIE_IRREG` inverse map, and morphological fallbacks (`duForm`, `sieForm`, `impForm`, `stemOf`). Sentence position decides which rule fires. The register buttons only appear when the target language is German.

**Request and state discipline.** `reqId` increments per request and stale responses are dropped. `lastKey` (`direction|text`) suppresses redundant re-translation; anything that must force a re-run clears it before calling `translate(true)`. Input is debounced 500 ms; Ctrl/Cmd+Enter translates immediately. State persists to `localStorage` under `prevodilac.v3`, wrapped in try/catch for private mode.

**Service worker is network-first** (`web/sw.js`, cache `prevodilac-v3`), so a fresh deploy reaches users without bumping a version manually; the cache is only an offline fallback. Cross-origin requests return early and are never cached. When changing the cached asset list, bump the `CACHE` name so `activate` purges the old one. All paths inside `web/` are relative (`./`), so the folder can be moved as a unit.

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

Add an assertion for every pure function you touch. `proveri(naziv, dobio, ocekivano)` compares via `JSON.stringify`.

### Architecture

**The pipeline is four independent units,** the first three pure or nearly so — that is the only reason they can be tested without a browser around them:

- `racunajDimenzije(pw, ph, p)` → `{w, h}`. Units `percent / pixels / cm / inch`, empty field derived from aspect ratio, `neUvecavaj` scaling the target box down so it fits inside the original. Touches no DOM and no shared state.
- `nacrtaj(src, w, h, p)` → canvas of exactly `w`×`h`. `fit` uses `Math.min`, `crop` uses `Math.max`, `stretch` ignores aspect ratio. Background is painted unless `providno && alfaMoguca`.
- `uKodiraj(canvas, mime, quality, cb)` — wraps `toBlob`, catching both the synchronous throw and a `null` blob.
- `napraviZip(unosi)` → `Blob`. Hand-written, store-only (method 0), local headers + central directory + EOCD, CRC-32 from a lazily built table, UTF-8 names with flag bit 11. Deflate would gain ~0 on already-compressed images.

**`efektivnoStanje()` sanitises before computing, not while typing.** Any DPI that is not a positive number counts as 96 for the calculation, but the field and `localStorage` keep whatever the user typed — otherwise clearing the field to retype it would fight the user.

**Permanent and transient errors are different things.** `s.trajnaGreska` (decode failed — the file will never become an image) skips the item forever. A plain `s.greska` from processing depends on current settings, so it is cleared before every new pass and the item is retried. Conflating them strands items permanently.

**`stavke` slots are reserved with `null` and filled asynchronously** so rows keep input order regardless of decode order. **Every read of `stavke[i]` must check the slot is not `null` first** — this has been a crash twice.

**Processing is sequential on purpose,** one image at a time with a `setTimeout(dalje, 0)` between them. Guarding via `uToku`/`zahtev` restarts the pass when settings change mid-run. A failed image degrades to an error row; the batch continues.

**`ImageBitmap` is kept on `s.src` for the item's lifetime** and closed only in `ukloniStavku`, so changing a setting does not re-decode every file. The memory cost of that trade-off is documented under „Poznata ograničenja" in the spec.

**Settings persist** to `localStorage` under `smanjiSlike.v1` in try/catch. `format` is accepted only if a matching `<option>` still exists — WEBP detection removes that option on browsers that cannot encode it, and must run *after* `ucitaj()`.

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

### Architecture

**The renderer is sandboxed and cannot reach the disk.** `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`. `preload.js` exposes exactly four functions on `window.kalkulatorMost` and nothing else. Every persistence request crosses IPC (`kalk:istorija-ucitaj`, `-dodaj`, `-obrisi`, `kalk:gde-su-podaci`). Do not widen this bridge to "make something easier" — that is the whole security model.

**`renderer/racunanje.js` is pure and is the only part worth testing.** Tokenizer → shunting-yard → postfix evaluator, plus `formatiraj()`. No DOM, no Electron, no `fs`. A UMD tail lets the same file load as a plain `<script>` in the renderer and as a `require()` in `samoprovera.js`. Keep it that way — the moment it touches the DOM, the test suite needs a browser.

**Implicit multiplication goes on the operator stack, not the output.** `2(3+1)` and `(1+1)2` insert a `*` via `ubaciOperator()`, which runs the normal precedence pop-loop. Pushing `'*'` straight to `izlaz` produces `[2,'*',3,1,'+']` and blows up at evaluation — this was a real bug caught by the self-check.

**Percent is postfix "divide by 100", always.** `50%` → `0.5`, `2+3%` → `2.03`. Windows Calculator's context-sensitive percent (`50+10%` → `55`) is deliberately not implemented; it is undefined for `(2+3)%` and untestable. Documented in the spec.

**Writes are atomic and corruption is survivable.** `skladiste.js` writes `podaci.json.tmp` then renames over the real file. Unparseable JSON is renamed to `podaci.json.osteceno` and the app starts empty rather than crashing or overwriting. History is capped at 200 records, newest first.

**`skladiste.js` takes the file path as an argument** instead of calling `app.getPath()` itself. That is why the self-check can exercise it against a temp folder with no Electron running. Do not inline the path.

**Permanent vs transient, again:** an expression that fails to evaluate shows a red message and is **not** written to history. An unfinished expression while typing is not an error at all — the preview line just goes blank.

### Tests

`samoprovera.js` follows the same pattern as `smanji-slike`: `proveri(naziv, dobio, ocekivano)` compared via `JSON.stringify`, plus `proveriGresku(naziv, funkcija, poruka)` for the error paths. Exit code 0 or 1, so it works in a pipeline. Add an assertion for every pure function you touch.

`provera-ui.js` (`npm run test:ui`) covers the parts `samoprovera.js` cannot: it `require`s the **real** `main.js` after pointing `userData` at a temp folder, then drives the actual page with `webContents.executeJavaScript` and saves `capturePage()` to a PNG. 16 checks — buttons, keyboard, error path, history, and the contents of `podaci.json`. Do not verify this app by screenshotting the desktop; drive it through `webContents`.

`provera-ui.js` and `napravi-ikonu.js` are dev-only and excluded from the installer by the `files` list in `package.json`. `provera-ui.js` is the one file here that uses `async`/`await` — it never ships, and the alternative is a promise pyramid.

### Icon

`kalkulator.ico` is generated by `napravi-ikonu.js` (`npm run ikona`) — RGBA buffer, signed-distance rounded rectangles for antialiasing, PNG via Node's `zlib`, PNG entries packed into an ICO container, six sizes (256/128/64/48/32/16). No image library. If the icon needs changing, edit `nacrtaj()` and rerun rather than adding a dependency.

## Language conventions

Both tools: UI, all user-facing strings, and all code comments are in Serbian (Latin script). Keep new code in the same style — `var`, function declarations, no ES6+ syntax, no modules, no template literals.

Check before committing:

```bash
grep -nE "\blet\b|\bconst\b|=>|\bclass\b" smanji-slike/smanji-slike.html
```

(`class` will match HTML attributes — read the hits, do not trust the count.)

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
