<!--
✒ Metadata
    - Title: Vendored Code Register (Terrane Edition - v1.1)
    - File Name: VENDORED.md
    - Relative Path: web/vendor/VENDORED.md
    - Artifact Type: docs
    - Version: 1.1.1
    - Date: 11/13/2026
    - Update: Friday, November 13, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 1.1.1 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] —
      Names the 69 Lucide icons the sprite holds, grouped as the icon
      list in tools/vendor.mjs groups them, among them the As of
      stepper's and the Places tab's. Updating three.js names the
      relation lines' patched material beside the box material.
    - 1.1.0 (11/12/2026) [dendogg + Anthropic - Claude Opus 5.5] — Adds
      Lucide icons, Floating UI and Motion, fetched from jsDelivr by
      tools/vendor.mjs with a manifest of digests, and explains why a CDN
      is used at development time but never at run time.
    - 1.0.0 (11/09/2026) [dendogg + Anthropic - Claude Fable 5.2] —
      Initial release.

✒ Description:
    Records the third-party files shipped inside Terrane, where they came
    from and under what licence. Vendored files keep their own attribution
    and do not carry the digiSpace header.

✒ Key Features:
    - Source, version and licence for each vendored item
    - The reason each is vendored rather than loaded from a CDN
    - How to update one, and how to verify what is on disk
    - The Lucide icons the sprite holds, by purpose

✒ Other Important Information:
    - Dependencies: tools/vendor.mjs, web/vendor/manifest.json
    - Compatible platforms: not applicable
---------
-->

# Vendored code and fonts

Terrane runs with no `npm install` and no network access. Everything it
needs at run time is in this repository.

| Item | Location | Version | Source | Licence |
| ---- | -------- | ------- | ------ | ------- |
| three.js | `web/vendor/three/three.module.js`, `three.core.js` | 0.187.0 (r187) | npm package `three`, `build/` | MIT, see `web/vendor/three/LICENSE` |
| Lucide icons (69, listed below) | `web/vendor/lucide/icons.svg` | 1.72.0 | jsDelivr, `lucide-static/icons/*.svg` | ISC, see `web/vendor/lucide/LICENSE` |
| Floating UI | `web/vendor/floating-ui/floating-ui.dom.browser.min.mjs`, `floating-ui.core.browser.min.mjs` | dom 1.8.0, core 1.8.0 | jsDelivr, `@floating-ui/dom`, `@floating-ui/core` | MIT, see `web/vendor/floating-ui/LICENSE` |
| Motion | `web/vendor/motion/motion.js` | 14.12.0 | jsDelivr, `motion/dist/motion.js` (UMD) | MIT, see `web/vendor/motion/LICENSE.md` |
| Archivo (variable, width and weight axes) | `web/fonts/archivo-latin-wdth-normal.woff2`, `archivo-latin-ext-wdth-normal.woff2` | Fontsource `@fontsource-variable/archivo` | Omnibus-Type | SIL OFL 1.1, see `web/fonts/LICENSE-archivo.txt` |
| DM Mono 400, 500 | `web/fonts/dm-mono-latin-400-normal.woff2`, `dm-mono-latin-500-normal.woff2` | Fontsource `@fontsource/dm-mono` | Colophon Foundry | SIL OFL 1.1, see `web/fonts/LICENSE-dm-mono.txt` |

## Why vendored

The libraries come from a CDN, but only once, at development time. At run
time the page loads them from its own origin.

- The service binds to the loopback address and works offline. A CDN
  request would break that.
- The page runs under a content security policy of `default-src 'self'`.
  It holds a token that can move and remove files, so it never runs code
  fetched live from a third party.
- Pinned files with recorded digests mean a reviewer sees exactly what
  changed when a version moves.

## The Lucide icons

The sprite holds the icons named in the `ICONS` list at the top of
`tools/vendor.mjs`, and no others. `web/js/icons.js` maps the interface's
actions and states to these names. By purpose, as the list groups them:

| Purpose | Icons |
| ------- | ----- |
| Bar and navigation | corner-left-up, folder-plus, undo-2, refresh-cw, book-open, search, x, keyboard, command |
| View tools and the stage | zoom-in, zoom-out, rotate-ccw, rotate-cw, person-standing, locate-fixed, scan, panel-left, panel-right, navigation-2, mountain, ruler, compass |
| Operations | corner-down-right, square-arrow-out-up-right, folder-search, clipboard-copy, pencil-line, folder-input, copy, copy-plus, trash-2, circle-stop, move |
| State and notices | check, triangle-alert, info, loader-circle, eye, radar, history |
| Ledger, lenses and inspector | list-tree, list-filter, scroll-text, shapes, ruler-dimension-line, layers, chevron-down, chevron-up, arrow-down-wide-narrow, arrow-up-narrow-wide, folder, folder-open, file, hard-drive, minus, plus, sparkles, scale, binoculars, map, grip-vertical, circle-help |
| The title block's As of stepper (time) | calendar-clock, chevron-left, chevron-right |
| Landmarks: the Places tab, benchmarks and the return point | map-pinned, flag, bookmark, arrow-left-right |

An icon names an action; it never stands for a drawing convention of the
world.

## Updating the CDN-sourced libraries

Change a pin, or the icon list, at the top of `tools/vendor.mjs`, then:

```bash
npm run vendor
npm run vendor -- --check
```

The first command fetches every pinned file from jsDelivr and rewrites
`web/vendor/manifest.json` with each file's source, size and SHA-256. The
second verifies the files on disk against that manifest without network
access. Review the diff of `web/vendor/` before committing it, and bring
the table of icons above up to date with the list.

Two adjustments are made on the way in:

- **Lucide:** only the named icons are kept, and they are written as one
  sprite of `<symbol>` elements. Size, stroke and colour come from the
  `.icon` rule in `web/css/base.css`.
- **Floating UI:** the DOM module's bare `@floating-ui/core` import is
  rewritten to the sibling file, so no import map is needed.

## Updating three.js

```bash
npm pack three@<version>
tar -xzf three-<version>.tgz package/build/three.module.js package/build/three.core.js package/LICENSE
```

Copy the three files into `web/vendor/three/`, then run the application and
check the two patched materials in `web/js/viewport.js`. The box material
patches the Lambert shader through `onBeforeCompile` and depends on the
chunk names `common`, `begin_vertex` and `dithering_fragment`. The
relation lines' material patches `LineDashedMaterial` the same way: it
depends on `common` and on the dash test
`mod( vLineDistance, totalSize ) > dashSize` in its fragment shader, and
draws every line solid if that expression is gone. The `relations`
scenario of `npm run ui-check` measures the dash on screen.

<!-- ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once! -->
