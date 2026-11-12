<!--
✒ Metadata
    - Title: Terrane Readme (Terrane Edition - v1.0)
    - File Name: README.md
    - Relative Path: README.md
    - Artifact Type: docs
    - Version: 1.0.0
    - Date: 11/09/2026
    - Update: Monday, November 9, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Fable 5.2
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Description:
    How to launch Terrane, how to read and travel its world, what it can
    do to files and how those actions are kept safe, and where to start
    when continuing development. Built to Dennis's brief for a filesystem
    explorer you step inside rather than look at.

✒ Key Features:
    - Launch instructions for Windows, macOS and Linux
    - The visual language in one table
    - Travel, selection and operation controls
    - Safety model and its limits
    - What was verified, and what was not
    - Project map for continuing development

✒ Other Important Information:
    - Dependencies: Node.js 20 or newer; a browser with WebGL2
    - Compatible platforms: developed and tested on Linux; written for
      Windows and macOS but not yet run there
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

Requires Node.js 20 or newer. Nothing to install.

```bash
node server/terrane.mjs "C:\Users\DnnsS\OneDrive\Desktop\dd1\projects"
```

The service prints its address (`http://127.0.0.1:4173/`) and opens it in
the default browser. Stop it with Ctrl+C.

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
| Move, Copy | M, menu, drag a ledger row | Click a destination plateau, or travel there and choose Place where I am |
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
- Every change records its inverse. Undo refuses, with the reason, if the
  disk has changed in a way that would make the undo destroy something.
- The service listens on `127.0.0.1` only, checks the Host header, and
  requires a per-session token on every API call.

Limits worth knowing: the undo journal lasts for the session (the holding
area persists); `.terrane-trash` lives inside your directory, so on a
OneDrive folder it will sync until purged; hidden items are detected by dot
prefix only, not by the Windows hidden attribute.

## What was verified

| Check | Result |
| ----- | ------ |
| `npm test`: 28 service checks on a throwaway directory (boundary, every operation verified on disk, collisions, full undo chain against content hashes, read-only) | 28 passed |
| Interface driven in headless Chrome on scratch data: new folder, F2 rename, move by placing, live pickup of an outside change, collision refusal, Keep both, remove, journal | Passed, each confirmed on disk |
| Real data, read-only: a 39,990-file, 3,160-folder dependency tree | Scanned in about 0.9 s; travel, search, lenses, reveal exercised |
| Scale: synthetic 400,018 files in 28,575 folders, 12 levels deep | Scan 7 to 12 s on 2 cores; 85 MB browser heap; layout plus paint about 10 ms; pick 0.08 ms |

Not verified: running on Windows or macOS; frame rate on a real GPU (the
test machine had only a software rasterizer, which managed 0.3 to 1 s per
frame and says nothing about hardware); Open and Reveal reaching a desktop
application (the test machine has no desktop).

## Continuing development

```text
server/terrane.mjs   entry point, HTTP routes, watcher, hashing
server/guard.mjs     the permission boundary
server/scan.mjs      progressive breadth-first scanner
server/ops.mjs       real operations, journal, holding area
web/index.html       page structure
web/css/terrane.css  design system
web/js/app.js        controller: state, service calls, panels
web/js/model.js      tree model, aggregation, search, survey
web/js/layout.js     the spatial language and level of detail
web/js/viewport.js   3D world, camera, picking, transitions
web/js/theme.js      colours shared with the stylesheet
web/js/ui.js         menu, dialog, notices, virtual list
tools/               fixture generator, smoke test
docs/                ARCHITECTURE.md, ROADMAP.md
```

There is no build step. Edit a file and reload the page. The design
decisions and their trade-offs are in `docs/ARCHITECTURE.md`; the staged
plan, the minimum filesystem scope and the exploration loop are in
`docs/ROADMAP.md`.

<!-- ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once! -->
