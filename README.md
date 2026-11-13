<!--
✒ Metadata
    - Title: Terrane Readme (Terrane Edition - v1.5)
    - File Name: README.md
    - Relative Path: README.md
    - Artifact Type: docs
    - Version: 1.5.0
    - Date: 11/13/2026
    - Update: Friday, November 13, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 1.5.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] — The
      project map lists the root index.html and .nojekyll, which publish
      the repository on GitHub Pages and forward visitors to web/.
    - 1.4.0 (11/12/2026) [dendogg + Anthropic - Claude Opus 5.5] — The
      framed wordmark and `npm run wordmark`, which builds it from
      Dennis's TER.svg and R-N.svg; the project map lists both
      wordmarks and the new tool.
    - 1.3.1 (11/12/2026) [dendogg + Anthropic - Claude Opus 5.5] — The
      project map describes T Madness as it now stands: ten variants on
      a slab with depth, six played with the pointer.
    - 1.3.0 (11/12/2026) [dendogg + Anthropic - Claude Opus 5.5] — The
      loading sheet under Launch; `npm run mark`; the project map lists
      the mark, the sheet, T Madness, the wordmark and the generator;
      the interface check with the sheet in place under What was
      verified.
    - 1.2.0 (11/12/2026) [dendogg + Anthropic - Claude Opus 5.5] — The
      instruments over the world, the browser check and the vendoring
      tool; the project map lists the stylesheet modules and the new
      interface modules, and License names every vendored library.
    - 1.1.1 (11/12/2026) [dendogg + Anthropic - Claude Opus 5.5] —
      Adds the License section for the public release under MIT, with the
      licenses of the bundled three.js and fonts.
    - 1.1.0 (11/11/2026) [dendogg + Anthropic - Claude Opus 5.5] —
      Development against snapshots, the thumbnail dataset, progress and
      cancellation, the persistent journal, and the first verification on
      Windows with a hardware GPU.
    - 1.0.0 (11/09/2026) [dendogg + Anthropic - Claude Fable 5.2] —
      Initial release, built to Dennis's brief for a filesystem explorer
      you step inside rather than look at.

✒ Description:
    How to launch Terrane, how to develop it against real data without
    touching that data, how to read and travel its world, what it can do to
    files and how those actions are kept safe, and where to start when
    continuing development.

✒ Key Features:
    - Launch instructions for Windows, macOS and Linux
    - Development mode: snapshots and thumbnails of a real directory
    - The visual language in one table
    - Travel, selection and operation controls
    - Safety model and its limits
    - What was verified, and what was not
    - Project map for continuing development
    - License terms, including the bundled third-party files

✒ Other Important Information:
    - Dependencies: Node.js 22.5 or newer; a browser with WebGL2; Python
      3.10+ with Pillow for thumbnails, and Inkscape for heavy SVGs
    - Compatible platforms: tested on Linux and on Windows 11; written for
      macOS but not yet run there
---------
-->

# Terrane

Terrane turns one directory into a world you travel through. Folders are
plateaus, files are blocks standing on them, and going deeper into the
hierarchy means going down in scale. From inside that world you can open,
rename, move, copy and remove real files, with undo.

It is two parts: a small local service that is given exactly one directory,
and a browser interface that talks only to that service.

## Launch

Requires Node.js 22.5 or newer. Nothing to install.

```bash
node server/terrane.mjs "C:\Users\DnnsS\OneDrive\Desktop\dd1\projects"
```

The service prints its address (`http://127.0.0.1:4173/`) and opens it in
the default browser. Stop it with Ctrl+C.

The page opens on a loading sheet: the T is surveyed and laid down
stratum by stratum while the service connects and the first survey
arrives, and the line beneath the TERRANE wordmark says which of those
is happening. When the first batch is drawn the sheet is excavated
away. Once the page is ready, a click or any key skips what is left of
the intro. With reduced motion the sheet shows the finished T and leaves
without moving.

| Option | Effect |
| ------ | ------ |
| `--read-only` | Refuses every action that changes the disk. Start here on anything you care about. |
| `--port <n>` | Preferred port. The next free one is used if it is taken. |
| `--no-open` | Does not open the browser. |
| `--no-watch` | Does not watch for outside changes; use Refresh. |

```bash
node server/terrane.mjs "E:\digiSpace" --read-only
npm start -- ~/Music --port 5050
```

## Developing against real data

Development runs against a recorded copy of a real directory, so nothing
real can be changed by a bug, a test or a half-built feature.

```bash
npm run dev -- --target "C:\Users\DnnsS\OneDrive\Desktop\dd1\projects"
npm run dev
```

The first form remembers the target; after that `npm run dev` is enough.
It does four things:

1. Takes a structure snapshot if the newest is more than six hours old:
   every folder and file with its name, size, dates and type, never its
   contents. About 230,000 entries take under three seconds.
2. Starts Terrane with `--snapshot`. In this mode the service reads only
   the snapshot; every change, open, reveal and content preview is refused
   with a sentence saying why.
3. Updates the thumbnail dataset in the background at below-normal
   priority. Only new or changed images are read.
4. Takes a new snapshot every hour while it runs. The open page offers to
   rescan when one lands.

| Command | Does |
| ------- | ---- |
| `npm run snapshot -- <dir>` | One snapshot now |
| `npm run thumbs` | Update thumbnails; `--stats` shows what is stored |
| `npm run thumbs -- --huge` | Also thumbnail images over 80 megapixels, one at a time |
| `npm run thumbs -- --heavy-svg` | Also render SVGs over 512 KB through Inkscape |
| `node server/terrane.mjs --snapshot <folder>` | Serve a snapshot without the dev runner |
| `npm run ui-check` | Drive the page in headless Edge or Chrome, keyboard only, with and without WebGL |
| `npm run vendor -- --check` | Verify the vendored browser libraries against their recorded digests |
| `npm run wordmark` | Rebuild the framed wordmark from Dennis's `TER.svg` and `R-N.svg` (Python with svgelements and shapely) |
| `npm run mark` | Rebuild `web/js/terrane-mark.js` from the T drawings and the framed wordmark; run it after `npm run wordmark` |

Datasets live in `%LOCALAPPDATA%\terrane\datasets\<name>` (on other
systems `~/.cache/terrane/datasets`), outside the project and outside
OneDrive. They hold real file names, so they stay local. Both are SQLite
files and can be queried directly, for example
`SELECT folder, name, size FROM entries ORDER BY size DESC LIMIT 20`.

## Reading the world

| What you see | What it means |
| ------------ | ------------- |
| Ground area of a plateau or block | Its share of the parent folder's bytes |
| Elevation | Nesting. Each level stands one step up, one tone lighter, one scale smaller |
| Height of a file block | Recency. Fresh files stand tall; untouched ones wear down over ten years |
| Colour of a file block | The lens: kind, age, size, or duplicates |
| Tinted closed mass | A folder seen from too far to read. Taller means more levels inside. It opens as you approach |
| Stippled tile (scree) | Items too small to see from here, with their count and size |
| Hatched mass | Sealed: the folder could not be read |
| Hollow tile | An empty folder |
| Diagonal light bands | A symbolic link (shown, never followed) |
| Vermilion pin | A search match, or a mass or scree that contains one |
| Ink pin | A heavyweight: one of the largest files, at least 2% of the root |
| Highlighter yellow | What you have selected, here and in every list |
| Garnet arc | Ties a selected file to its duplicate candidates |
| North arrow (top right) | Turns with the camera; click it to face north again |
| Storage scale (bottom left) | How much storage a square that size holds at this height |

## Travelling

| Input | Effect |
| ----- | ------ |
| Wheel | Fly toward whatever is under the cursor |
| Drag | Slide the ground |
| Right-drag | Orbit the point you grabbed |
| Alt+drag | Look around in place |
| W A S D | Move. Shift moves faster. Speed scales with your height above the surface |
| Q E, R F | Turn, rise and descend |
| V | Drop to eye level where you are looking |
| 0 | Rise to the overview |
| G | Fly to the selection |
| Double-click | Fly to a folder; open a file |
| Backspace, Alt+Left | Up one level; back |

The breadcrumbs and the Contents tab follow the folder you are in. Clicking
a breadcrumb, a ledger row, a search result or a survey entry flies you
there. Everything can also be done from the ledger with the keyboard alone;
the 3D view is never the only route. Press `?` in the app for the full key
list.

## Doing things to files

| Action | How | Notes |
| ------ | --- | ----- |
| Open | Double-click, Enter, inspector | Handed to the operating system's default application |
| Reveal | Menu, inspector | Opens the system file manager at the item |
| Copy path | Ctrl+C, menu, inspector | Absolute path |
| New folder | N, toolbar, menu | |
| Rename | F2, menu, inspector | |
| Move, Copy | M, menu, drag a ledger row | Click a destination plateau, or travel there and choose Place where I am. Anything that takes longer than a moment shows progress and a Cancel button |
| Duplicate | Ctrl+D | Copies in place as `name copy.ext` |
| Remove | Del | Moves to the holding area. Nothing is deleted |
| Undo | Ctrl+Z, toolbar, Journal tab | Reverses the latest change |
| Restore, Purge | Journal tab | Purge is the only permanent deletion and asks first |

### Safety model

- The service reads and writes only inside the directory named on the
  command line. Paths are root-relative; traversal segments are refused,
  and symbolic links that lead outside are refused for both reads and
  writes.
- It never overwrites. A name collision stops the whole batch before
  anything moves, and offers Keep both.
- It never deletes directly. Remove moves items into `.terrane-trash`
  inside the authorized directory, so the move is atomic and reversible.
- Every change records its inverse in a journal kept beside the holding
  area, so Undo works after a restart. Journal paths pass through the
  same guard as a request. Undo refuses, with the reason, if the disk has
  changed in a way that would make the undo destroy something.
- A cancelled copy removes only the paths it created, newest first, and
  folders only when empty. Items finished before the cancel stay and can
  be undone.
- The service listens on `127.0.0.1` only, checks the Host header, and
  requires a per-session token on every API call.

Limits worth knowing: the journal keeps the latest 500 changes;
`.terrane-trash` lives inside your directory, so on a OneDrive folder it
will sync until purged; hidden items are detected by dot prefix only, not
by the Windows hidden attribute.

## What was verified

| Check | Result |
| ----- | ------ |
| `npm test` on Windows 11: 54 service checks on a throwaway directory (boundary, every operation verified on disk, collisions, progress and cancel mid-file, a queued job cancelled, the full undo chain run by a restarted service against content hashes, a tampered journal, snapshot replay against a live scan, read-only) | 54 passed, three runs in a row |
| Interface driven in headless Chrome on scratch data (11/09/2026, Linux): new folder, F2 rename, move by placing, live pickup of an outside change, collision refusal, Keep both, remove, journal | Passed, each confirmed on disk |
| Snapshot of real data on Windows: 230,307 files in 30,159 folders | Snapshot 2.4 s; replay matches a live scan folder for folder; served in 0.3 s against 2.3 s live |
| Same snapshot in Chrome on an RTX 5050 laptop GPU | Surveyed in 1.6 s; 84 MB heap; 60 fps at the overview (the display's limit); search, fly-to seven levels down, inspector and hover thumbnails exercised |
| Thumbnails of the same tree | 11,103 rasters and 4,467 light SVGs in about 3 minutes, 255 MB; an inspector preview is one 32 KB request in place of a 2.2 MB original |
| `npm run ui-check` on Windows 11 (11/12/2026): keyboard routes, layout budget, relation lines, seams, focus and the age table, in a WebGL pass and a pass with WebGL disabled | 314 passed; draw calls at the recorded baseline |
| `npm run ui-check` on Linux, software rendering (11/12/2026), with the loading sheet in place: every earlier scenario, plus `splash` (the sheet covers the page and makes it inert, names each stage, keeps Tab out, a key skips it once the survey is done, the page comes back intact, reduced motion does not move) | 354 passed across the two passes: the 314 earlier checks unchanged, 40 new; draw calls at the recorded baseline |
| Scale: synthetic 400,018 files in 28,575 folders, 12 levels deep (11/09/2026, Linux) | Scan 7 to 12 s on 2 cores; 85 MB browser heap; layout plus paint about 10 ms; pick 0.08 ms |

Not verified: running on macOS; frame rate at street level in the largest
trees on a hardware GPU; Open and Reveal reaching a desktop application on
Windows; the progress panel driven in a browser (its service side is
covered by `npm test`); the loading sheet in Firefox and Safari, and on
Windows.

## Continuing development

```text
index.html           GitHub Pages entry: forwards visitors to web/
.nojekyll            publishes the repository on Pages without Jekyll
server/terrane.mjs   entry point, HTTP routes, watcher, hashing, snapshot mode
server/guard.mjs     the permission boundary
server/scan.mjs      progressive breadth-first scanner
server/ops.mjs       real operations, persistent journal, holding area, jobs
server/transfer.mjs  measured, cancellable copy that cleans up after itself
server/snapshot.mjs  structure snapshots: write, replay, dataset home
server/thumbs.mjs    serves the thumbnail dataset
web/index.html       page structure
web/css/terrane.css  stylesheet entry: cascade layers and module imports
web/css/tokens.css   every colour, size, shadow, layer and motion value
web/css/components/  controls, bar, ledger, stage, inspector, block, floating,
                     splash (the loading sheet)
web/css/*.css        also: fonts, base, layout, utilities, motion, print
web/js/app.js        controller: state, service calls, panels, progress
web/js/model.js      tree model, aggregation, search, survey
web/js/layout.js     the spatial language and level of detail
web/js/viewport.js   3D world, camera, picking, transitions
web/js/theme.js      colours shared with the stylesheet
web/js/thumbs.js     the only way the page shows an image
web/js/ui.js         menu, dialog, notices, tip, indicators, virtual list
web/js/icons.js      the only way the page draws an icon (Lucide sprite)
web/js/float.js      places the menu and tip beside a point (Floating UI)
web/js/motion.js     counting figures, FLIP, springs (Motion, or WAAPI)
web/js/hud.js        north arrow, storage scale, the print frame
web/js/features.js   the feature modules app.js installs
web/js/timeline.js   the shared table of bytes by last change
web/js/splash.js     the loading sheet: survey, strata, sounding, excavation
web/js/terrane-mark.js  the T, its grid and the wordmark as data (generated)
web/js/t-madness.js  ten T animations on a slab with depth, six played with
                     the pointer; not loaded by the app
web/assets/logos/    TERRANE-wordmark-framed.svg (the loading sheet's),
                     TERRANE-wordmark.svg (single colour)
web/vendor/          three.js, Floating UI, Motion, Lucide; see VENDORED.md
tools/dev.mjs        development runner (snapshot mode, kept current)
tools/snapshot.mjs   take a structure snapshot
tools/thumbs.py      build and update the thumbnail dataset
tools/build_terrane_wordmark.py  generate the framed wordmark (npm run wordmark)
tools/build_terrane_mark.py  generate web/js/terrane-mark.js (npm run mark)
tools/ui-check.mjs   headless browser check; scenarios in tools/ui-scenarios/
tools/vendor.mjs     fetch and verify the vendored browser libraries
tools/               also: fixture generator, smoke test
docs/                ARCHITECTURE.md, ROADMAP.md
```

There is no build step. Edit a file and reload the page. The design
decisions and their trade-offs are in `docs/ARCHITECTURE.md`; the staged
plan, the minimum filesystem scope and the exploration loop are in
`docs/ROADMAP.md`.

For GitHub Pages (deploy from the `main` branch, root folder), the root
`index.html` forwards visitors to `web/`, so the interface keeps a
single page. Pages can show the interface but cannot run it: the page
needs the local service, so its world stays empty there.

## License

Terrane is released under the MIT License; see `LICENSE`. The bundled
third-party files keep their own licenses, which sit beside them:

- three.js, Floating UI and Motion in `web/vendor/` are MIT.
- The Lucide icons in `web/vendor/lucide/` are ISC.
- The Archivo and DM Mono fonts in `web/fonts/` are under the SIL Open
  Font License 1.1.

`web/vendor/VENDORED.md` records the version and source of each.

<!-- ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once! -->
