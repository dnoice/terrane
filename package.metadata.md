<!--
✒ Metadata
    - Title: Package Manifest (Terrane Edition - v1.1)
    - File Name: package.json
    - Relative Path: package.json
    - Artifact Type: config
    - Version: 1.1.0
    - Date: 11/11/2026
    - Update: Wednesday, November 11, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
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
    - test: runs the service smoke test against a throwaway directory
    - fixture: builds a synthetic tree for scale and write testing

✒ Usage Instructions:
    npm start -- "C:\path\to\directory"
    npm start -- "C:\path\to\directory" --read-only
    npm run dev -- --target "C:\path\to\directory"
    npm run snapshot -- "C:\path\to\directory"
    npm run thumbs -- --heavy-svg
    npm test
    npm run fixture -- C:\temp\terrane-fixture 50000

✒ Other Important Information:
    - Dependencies: none (three.js and the fonts are vendored in web/);
      the thumbnail builder needs Python 3.10+ with Pillow, and Inkscape
      for heavy SVGs
    - Compatible platforms: Node.js 22.5 or newer
---------
-->

# package.json metadata

This file documents `package.json`. See the header above.

<!-- ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once! -->
