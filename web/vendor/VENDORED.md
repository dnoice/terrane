<!--
✒ Metadata
    - Title: Vendored Code Register (Terrane Edition - v1.0)
    - File Name: VENDORED.md
    - Relative Path: web/vendor/VENDORED.md
    - Artifact Type: docs
    - Version: 1.0.0
    - Date: 11/09/2026
    - Update: Monday, November 9, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Fable 5.2
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Description:
    Records the third-party files shipped inside Terrane, where they came
    from and under what licence. Vendored files keep their own attribution
    and do not carry the digiSpace header.

✒ Key Features:
    - Source, version and licence for each vendored item
    - The reason each is vendored rather than installed
    - How to update one

✒ Other Important Information:
    - Dependencies: none
    - Compatible platforms: not applicable
---------
-->

# Vendored code and fonts

Terrane runs with no `npm install` and no network access. Everything it
needs at run time is in this repository.

| Item | Location | Version | Source | Licence |
| ---- | -------- | ------- | ------ | ------- |
| three.js | `web/vendor/three/three.module.js`, `three.core.js` | 0.187.0 (r187) | npm package `three`, `build/` | MIT, see `web/vendor/three/LICENSE` |
| Archivo (variable, width and weight axes) | `web/fonts/archivo-latin-wdth-normal.woff2`, `archivo-latin-ext-wdth-normal.woff2` | Fontsource `@fontsource-variable/archivo` | Omnibus-Type | SIL OFL 1.1, see `web/fonts/LICENSE-archivo.txt` |
| DM Mono 400, 500 | `web/fonts/dm-mono-latin-400-normal.woff2`, `dm-mono-latin-500-normal.woff2` | Fontsource `@fontsource/dm-mono` | Colophon Foundry | SIL OFL 1.1, see `web/fonts/LICENSE-dm-mono.txt` |

## Why vendored

The service binds to the loopback address and the page runs under a
content security policy of `default-src 'self'`. A CDN would break both the
offline guarantee and the policy.

## Updating three.js

```bash
npm pack three@<version>
tar -xzf three-<version>.tgz package/build/three.module.js package/build/three.core.js package/LICENSE
```

Copy the three files into `web/vendor/three/`, then run the application and
check the box material in `web/js/viewport.js`: it patches the Lambert
shader through `onBeforeCompile` and depends on the chunk names
`common`, `begin_vertex` and `dithering_fragment`.

<!-- ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once! -->
