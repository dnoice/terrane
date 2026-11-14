<!--
✒ Metadata
    - Title: Package Manifest (Terrane Edition - v1.9)
    - File Name: package.json
    - Relative Path: package.json
    - Artifact Type: config
    - Version: 1.9.0
    - Date: 11/13/2026
    - Update: Friday, November 13, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 1.9.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] — The
      test script ends with tools/finding-test.mjs, the Node check of the
      command palette's fuzzy ranking and of the kept view, links, search
      history and saved searches.
    - 1.8.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] — Raises
      the package version to 1.3.0: every Stage 5 candidate has its
      first increment, and the Audit, Hardening pass, Enhancement and
      polish and Sanity sweeps are merged.
    - 1.7.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] — The
      test script also runs tools/relations-test.mjs, the Node check of
      working sessions and the traverse route, after the places test,
      then tools/strata-test.mjs, the Node check of bytes by last change
      and the Age lens's closed-mass colours, and last
      tools/interior-test.mjs, the Node check of archive interiors.
    - 1.6.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] — The
      test script also runs tools/places-test.mjs, the Node check of the
      landmarks store, after the service smoke test.
    - 1.5.0 (11/12/2026) [dendogg + Anthropic - Claude Opus 5.5] — Adds
      the wordmark script, which builds the framed TERRANE wordmark from
      Dennis's TER.svg and R-N.svg; run it before mark.
    - 1.4.0 (11/12/2026) [dendogg + Anthropic - Claude Opus 5.5] — Adds
      the mark script, which regenerates web/js/terrane-mark.js (the T,
      its grid and the TERRANE wordmark as data) from the drawings.
    - 1.3.0 (11/12/2026) [dendogg + Anthropic - Claude Opus 5.5] — Adds
      the vendor script, which fetches the pinned browser libraries once
      and verifies them offline, and raises the package version to 1.2.0
      for the interface overhaul.
    - 1.2.0 (11/12/2026) [dendogg + Anthropic - Claude Opus 5.5] — Adds
      the ui-check script, the headless browser check of the keyboard
      routes with and without WebGL.
    - 1.1.1 (11/12/2026) [dendogg + Anthropic - Claude Opus 5.5] —
      Declares the MIT license, the author, and the GitHub repository and
      homepage, for the public release.
    - 1.1.0 (11/11/2026) [dendogg + Anthropic - Claude Opus 5.5] — Adds
      the dev, snapshot and thumbs scripts and raises the minimum Node.js
      to 22.5 for the built-in SQLite the datasets use.
    - 1.0.0 (11/09/2026) [dendogg + Anthropic - Claude Fable 5.2] —
      Initial release.

✒ Description:
    Sibling metadata for package.json, which npm parses strictly and which
    therefore cannot carry a header of its own. The manifest names the
    project, pins the minimum Node.js version and provides the run scripts.
    It declares no dependencies because Terrane has none.

✒ Key Features:
    - start: runs the service; pass the directory after a double dash
    - dev: development against a snapshot of a real directory; refreshes
      the snapshot and thumbnails and touches no real file
    - snapshot: records a directory's structure into a dataset
    - thumbs: builds or updates the thumbnail dataset (Python and Pillow)
    - wordmark: builds web/assets/logos/TERRANE-wordmark-framed.svg from
      Dennis's TER.svg and R-N.svg (Python with svgelements and shapely)
    - mark: regenerates web/js/terrane-mark.js from the T drawings and
      the framed wordmark (Python with svgelements and shapely); run it
      after changing any of them, and after wordmark
    - test: runs the service smoke test against a throwaway directory,
      then the places store test (benchmarks and the return point), the
      working sessions test (sessions, session:N, the route), the
      strata test (bytes by last change, typical age), the interior
      test (the graft, the chamber, twins, the lock) and the finding
      test (fuzzy ranking, the kept view, links, history, saved
      searches) in Node
    - vendor: fetches the pinned third-party browser files into
      web/vendor/ from jsDelivr; --check verifies them offline
    - ui-check: drives the page in headless Edge or Chrome, keyboard
      only, with and without WebGL, and compares draw calls with the
      recorded baseline; needs Edge or Chrome installed
    - fixture: builds a synthetic tree for scale and write testing, with
      the shared sets the interface checks rely on

✒ Usage Instructions:
    npm start -- "C:\path\to\directory"
    npm start -- "C:\path\to\directory" --read-only
    npm run dev -- --target "C:\path\to\directory"
    npm run snapshot -- "C:\path\to\directory"
    npm run thumbs -- --heavy-svg
    npm run wordmark
    npm run mark
    npm test
    npm run ui-check
    npm run ui-check -- core --pass nogl
    npm run vendor -- --check
    npm run fixture -- C:\temp\terrane-fixture 50000

✒ Other Important Information:
    - Dependencies: none at run time (three.js, Motion, Floating UI,
      Lucide icons and the fonts are vendored in web/);
      the thumbnail builder needs Python 3.10+ with Pillow, and Inkscape
      for heavy SVGs; the wordmark and mark generators need Python
      3.10+ with svgelements and shapely; ui-check needs Microsoft Edge or Google
      Chrome
    - Compatible platforms: Node.js 22.5 or newer
    - License: MIT (see LICENSE); private stays true so the package is
      never published to npm by accident
---------
-->

# package.json metadata

This file documents `package.json`. See the header above.

<!-- ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once! -->
