# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Serbian ⇄ German translator ("Prevodilac SR ⇄ DE") shipped as a single self-contained HTML file — inline CSS, one IIFE of ES5-style JavaScript, zero dependencies, no build step, no package manager, no tests, no version control.

Two deliverables, both from the same source:

- `prevodilac.html` — standalone file, double-click to open from disk.
- `prevodilac-web/` — the same file as `index.html` plus PWA wrapper (`manifest.webmanifest`, `sw.js`, icons), meant to be served over HTTP and installed on a phone.

**`prevodilac.html` and `prevodilac-web/index.html` are byte-identical copies.** There is no build that generates one from the other. Any edit to the app must be written to both files, and they must stay identical (`Get-FileHash` on both to confirm).

## Running it

Open the standalone file directly:

```bash
start "" "E:\Program Files\Claude code\prevodilac.html"
```

For anything involving the service worker, manifest, or install prompt, serve over HTTP — `file://` will not register a service worker:

```bash
npx serve "E:\Program Files\Claude code\prevodilac-web"
```

Node is installed; there is no `package.json`, so `npx` fetches the server on first use. Verify changes in the browser (console + rendered output); there is no test suite to run.

## Language conventions

The UI, all user-facing strings, and all code comments are in Serbian (Latin script). Keep new code in the same style — comments in Serbian, `var`, function declarations, no ES6+ syntax, no modules. The file is written to run unmodified in older mobile browsers.

## Architecture

Everything lives in the one `<script>` block in `index.html`. The pieces that matter:

**Direction detection is local, deliberately.** `guessLang()` scores the input against hard-coded Serbian and German word lists (plus Cyrillic and diacritic checks) and the resolved direction is always sent explicitly to the translation service. The services' own `auto` detection misidentifies short Serbian text, so it is never used. The `dirSel` dropdown overrides detection. Ties fall back to Serbian → German, the primary use case.

**Translation is a two-service chain with chunking.** `translateChunk()` tries Google's unofficial `translate_a/single` endpoint and silently falls back to MyMemory. Both are keyless and anonymous, so limits differ: text is split at 3000 chars for the main path (`runDirection`) and MyMemory re-splits its input at 450 chars. `splitText()` cuts on paragraph → sentence → word boundaries. A chunk that fails is left as the original text and counted in `res.failed`, so a partial failure degrades instead of losing the whole translation; only an all-chunks failure throws.

**Auto-correcting a wrong direction guess.** If detection was on `auto`, no chunk failed, and the output came back identical to the input, `translateText()` retries in the opposite direction and keeps whichever result actually changed.

**Serbian output is transliterated.** The services return Serbian in Cyrillic; `toLatin()` converts it, handling the LJ/NJ/DŽ digraph casing rule.

**Sie/du register switching is pure post-processing.** `rawOut` holds the untouched translation. `renderOutput()` applies `toSie()` / `toDu()` on top of it, so toggling register never re-fetches. Both functions run per-sentence via `eachSentence()` and combine: greeting/sign-off phrase tables (`PHRASES_DU`, `PHRASES_SIE`), pronoun substitution, and verb conjugation built from `DU_IRREG` (irregular Sie→du forms), `DU_IMP` (imperatives), the derived `SIE_IRREG` inverse map, and morphological fallbacks (`duForm`, `sieForm`, `impForm`, `stemOf`). Sentence position decides which rule fires — verb-initial and not a question means imperative, `Sie` + verb means a statement, verb + `Sie` means inversion. The register buttons only appear when the target language is German; clicking the active one clears the override.

**Request and state discipline.** `reqId` increments per request and stale responses are dropped. `lastKey` (`direction|text`) suppresses redundant re-translation; anything that must force a re-run clears it before calling `translate(true)`. Input is debounced 500 ms; Ctrl/Cmd+Enter translates immediately. Input text, direction, and register persist to `localStorage` under `prevodilac.v3`, wrapped in try/catch for private mode.

**Service worker is network-first** (`sw.js`, cache `prevodilac-v3`), so a fresh deploy reaches users without bumping a version manually; the cache is only an offline fallback. Cross-origin requests return early and are never cached — translations always hit the network. When changing the cached asset list, bump the `CACHE` name so `activate` purges the old one.

## Browser Automation — Native Navigation Only (HARD RULE)

When driving Claude in Chrome (the `mcp__claude-in-chrome` tools), use NATIVE navigation. Never drive by screenshots:

- Navigate by URL deep-links whenever possible instead of clicking through menus.
- Locate elements with the `find` tool (natural-language search) or `read_page` (accessibility tree — use `filter: "interactive"`). Both return element refs.
- Click by passing that ref to the `computer` tool instead of coordinates. Never take a screenshot to figure out where to click.
- Fill fields with `form_input` using the ref. Use `key` actions for Enter, Tab, Escape. Use `scroll_to` with a ref to bring elements into view.
- Verify each step by running `find` or `read_page` on the new state and checking the text — not by screenshotting.
- Screenshots are allowed ONLY when the deliverable itself is visual (design review, capturing proof for the user) — never as the driving mechanism.

Why this rule exists: the `computer` tool's own description tells you to consult a screenshot to determine coordinates before clicking. Ignore that default. Screenshot-coordinate clicking is slow (a full round-trip per look) and misclicks constantly. Accessibility refs are exact and fast.

The same rule applies to the in-app Browser pane tools (`mcp__Claude_Browser__*`), which expose the identical `find` / `read_page` / `computer` / `form_input` surface.

## Notes

- There is no `.claude/launch.json`. Preview the app with `preview_start {url}` against the served address rather than a named dev-server config.
- Root-level `.gitignore`/git setup is absent — this directory is not a git repository.
