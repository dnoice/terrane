<!--
✒ Metadata
    - Title: Terrane Readme (Terrane Edition - v1.10)
    - File Name: README.md
    - Relative Path: README.md
    - Artifact Type: docs
    - Version: 1.10.0
    - Date: 11/13/2026
    - Update: Friday, November 13, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 1.10.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] — Try
      it: the demo world on GitHub Pages and through npm run demo, and
      the same world written to disk for the real service. A page from
      another server or Pages runs the demo; one from disk says how to
      start the service. The datasets section adds npm run export, the
      commands table the demo and export scripts and the demo test, and
      the project map the demo modules and tools.
    - 1.9.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] — Single-key
      shortcuts are off unless turned on in the guide, and the key
      section says how to reach them. What was verified records the
      full interface check with the new default.
    - 1.8.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] — What
      was verified records the full interface check with the `splash`
      reload step fixed, and the loading sheet after a reload under
      Edge leaves the list of what was not verified.
    - 1.7.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] — The
      hardening pass: a page opened anywhere but the service says how to
      start it; the guide's single-key setting and the narrow window's
      inspector drawer; the safety model covers the holding area by any
      name, links followed only inside the root, a dropped stream and
      the thumbnail cookie; What was verified records the runs of
      11/13/2026 after the hardening; the project map lists
      elsewhere.js and the hardening scenarios, and says what
      tokens.css holds. The sanity sweep: Launch says the directory can
      be a whole drive; the safety model says the page is never stored
      while the files it loads are revalidated by a weak ETag; What was
      verified records the final runs on branch finish, and the same
      results once it was merged into `main` as Terrane 1.3.0.
    - 1.6.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] —
      Looking further: the date scrub (T , . < >), benchmarks and the
      return point (B, H, J and the Places tab, with where places are
      kept), working sessions (session:N and the traverse), bytes by
      last change and the Age lens's typical age, and archive interiors
      (I). Reading the world gains their conventions; the safety model
      covers the archive listing; the commands name npm test's five
      checks and a single ui-check scenario; What was verified records
      the runs of 11/13/2026; the project map lists the new modules,
      stylesheets and checks.
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
    How to launch Terrane, how to develop and check it against real data
    without touching that data, how to read and travel its world, and
    what it shows beyond the ground plane: a date scrub, landmarks,
    working sessions, strata and archive interiors. Also what it can do
    to files, how those actions are kept safe, and where to start when
    continuing development.

✒ Key Features:
    - Launch instructions for Windows, macOS and Linux
    - Development mode: snapshots and thumbnails of a real directory
    - The visual language in one table, the features' conventions
      included
    - Travel, selection and operation controls
    - Looking further: time, landmarks, working sessions, strata and
      archive interiors, with their keys and where places are kept
    - Safety model and its limits, the archive listing included
    - The checks (npm test, ui-check), what was verified, and what was
      not
    - Project map for continuing development
    - License terms, including the bundled third-party files

✒ Other Important Information:
    - Dependencies: Node.js 22.5 or newer; a browser with WebGL2; Python
      3.10+ with Pillow for thumbnails, and Inkscape for heavy SVGs;
      Microsoft Edge or Google Chrome for ui-check
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

## Try it

Open <https://dnoice.github.io/terrane/> and Terrane starts on its demo
world: a made-up studio drive of about twelve thousand files in code
projects, photos, film footage, music, design work, documents, an old
laptop's archive and downloads, built in the page from one seed. Every
feature works on it, changes and undo included, and nothing leaves the
page; a reload starts the world again.

The same page runs locally with nothing but Node.js:

```bash
npm run demo
```

It prints an address to open. To try the real service, and every
operation on real files, somewhere that does not matter, write the same
world to disk and point Terrane at it:

```bash
npm run demo -- write C:\temp\terrane-demo
npm start -- C:\temp\terrane-demo
```

## Launch

Requires Node.js 22.5 or newer. Nothing to install.

```bash
node server/terrane.mjs "C:\Users\DnnsS\OneDrive\Desktop\dd1\projects"
```

The service prints its address (`http://127.0.0.1:4173/`) and opens it in
the default browser. Stop it with Ctrl+C. The directory can be a whole
drive, such as `D:\`.

Open the page only at that address to see your own directory. Opened
from another server or from GitHub Pages, the page has no service behind
it and runs the demo world instead; opened from disk, it says how to
start Terrane and links to this repository.

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
   the snapshot; every change, open, reveal, content preview and archive
   listing is refused with a sentence saying why.
3. Updates the thumbnail dataset in the background at below-normal
   priority. Only new or changed images are read.
4. Takes a new snapshot every hour while it runs. The open page offers to
   rescan when one lands.

| Command | Does |
| ------- | ---- |
| `npm run snapshot -- <dir>` | One snapshot now |
| `npm run export` | The newest snapshot as a CSV table and a JSON tree, in an `exports` folder beside it; name a dataset folder or a `.db` file when there is more than one |
| `npm run demo` | Serve the repository as GitHub Pages does, so the page runs the demo world |
| `npm run demo -- write <folder>` | Write the demo world to disk: text files with their contents, large files sparse at their sizes |
| `npm run thumbs` | Update thumbnails; `--stats` shows what is stored |
| `npm run thumbs -- --huge` | Also thumbnail images over 80 megapixels, one at a time |
| `npm run thumbs -- --heavy-svg` | Also render SVGs over 512 KB through Inkscape |
| `node server/terrane.mjs --snapshot <folder>` | Serve a snapshot without the dev runner |
| `npm test` | The service smoke test on a throwaway directory, then the Node checks of landmarks (`places-test`), working sessions (`relations-test`), strata (`strata-test`), archive interiors (`interior-test`) and the demo world and its service (`demo-test`) |
| `npm run ui-check` | Drive the page in headless Edge or Chrome, keyboard only, with and without WebGL, on a fresh fixture in the OS temp folder; compares draw calls with the recorded baseline |
| `npm run ui-check -- time --pass nogl` | One scenario in one pass; `npm run ui-check -- --list` names every scenario |
| `npm run vendor -- --check` | Verify the vendored browser libraries against their recorded digests |
| `npm run wordmark` | Rebuild the framed wordmark from Dennis's `TER.svg` and `R-N.svg` (Python with svgelements and shapely) |
| `npm run mark` | Rebuild `web/js/terrane-mark.js` from the T drawings and the framed wordmark; run it after `npm run wordmark` |

Datasets live in `%LOCALAPPDATA%\terrane\datasets\<name>` (on other
systems `~/.cache/terrane/datasets`), outside the project and outside
OneDrive. They hold real file names, so they stay local. Both are SQLite
files and can be queried directly, for example
`SELECT folder, name, size FROM entries ORDER BY size DESC LIMIT 20`.
`npm run export` writes a snapshot out for anything else: one CSV row
per folder and file (kind, path, size, files and folders beneath,
modified time in UTC, flags), and the same entries as a nested JSON
tree.

## Reading the world

| What you see | What it means |
| ------------ | ------------- |
| Ground area of a plateau or block | Its share of the parent folder's bytes |
| Elevation | Nesting. Each level stands one step up, one tone lighter, one scale smaller |
| Height of a file block | Recency. Fresh files stand tall; untouched ones wear down over ten years |
| Colour of a file block | The lens: kind, age (last change), size, or duplicates |
| Tinted closed mass | A folder seen from too far to read. Taller means more levels inside. It opens as you approach. Under the Age lens its colour is its typical age: half its bytes have not changed since then |
| Stippled tile (scree) | Items too small to see from here, with their count and size |
| Hatched mass | Sealed: the folder could not be read |
| Hollow tile | An empty folder |
| Diagonal light bands | A symbolic link (shown, never followed) |
| Half bands | Under the duplicates lens, a candidate not yet verified. While an archive is open, an entry with a twin in the directory (same name and size), and that twin |
| Flat block, crossed corner to corner | Changed after the As of date the time view looks back to |
| Lowered closed mass | In the time view, a folder lowered to the share of its bytes unchanged since the As of date |
| Vermilion pin | A search match, or a mass or scree that contains one |
| Ink pin | A heavyweight: one of the largest files, at least 2% of the root |
| Verdigris survey mark, point up | A benchmark. Its tag says what changed in the folder since it was measured |
| Highlighter yellow | What you have selected, here and in every list |
| Garnet arc | Ties a selected file to its duplicate candidates |
| Dashed ink arcs with chevrons | The traverse: a working session's files in the order they changed |
| Walled floor | A zip archive opened with I: what its directory lists, inside walls of the archive's colour. Hatched entries in it are locked (encrypted) |
| Arcs in the archive colour | Tie a selected archive entry to its twins in the directory, or a twin to its entries |
| North arrow (top right) | Turns with the camera; click it to face north again |
| Storage scale (bottom left) | How much storage a square that size holds at this height |

The inspector's Reading the world section lists the same conventions,
the features' rows included.

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
list. Single-key shortcuts (letters, digits and signs) act while the
world or the ledger list has focus: click the world, or Tab to it, and
they work. Ctrl and Alt shortcuts act everywhere. A setting in the guide
lets single-key shortcuts act wherever focus is.

Below 860 px wide (or at 200% zoom) the inspector folds away, and `]` or
its toggle in the view tools opens it as a drawer over the world.

## Looking further

| Input | Effect |
| ----- | ------ |
| T | Look back to the date since which half of the folder you are in has changed. T again returns to now |
| , . | One date earlier, one date later |
| < > | The earliest date; the present |
| B | Set a benchmark on the selected folder, or on the folder you are in; on a benchmark, measure it again |
| H | Mark a return point where you stand |
| J | Fly back to the return point; J again comes back |
| I | Look inside the zip archive you are on; I again, or Escape with nothing selected, closes it |
| `session:N` in Find | The N-th newest working session (`session:1` is the newest) |

**Time.** The world looks back to one of 19 dates on a fixed ladder, from
a day to 30 years back. Whatever changed after it lies flat, crossed
corner to corner, and a closed mass is lowered to the share of its bytes
it kept unchanged. Footprints and positions stay as they are now, so a
place can be compared with itself. The As of stepper in the title block
shows the date and is reachable by Tab; the inspector's Since section
sums what changed and what did not, and lists where the change is.
Escape returns to the present.

**Landmarks.** A benchmark measures a folder at a moment: its size, files,
folders and its 64 largest direct entries. The Places tab lists every benchmark
with what changed since (entries gone, here now, grown and shrunk), with
Fly there, Measure again, Forget and Forget all, and holds the return
point. `is:benchmark` in Find finds them. Terrane's own renames and moves,
and their undo, carry benchmarks along; a folder renamed or removed from
outside is marked missing, with Forget, and never silently dropped.
Places are kept in this browser for this directory at this address: another
browser, profile or port keeps its own, and benchmarks of a snapshot are
kept apart from those of the live directory.

**Working sessions.** Files whose last changes follow each other within 30
minutes make a session; folders whose names start with a dot are left
out. The Survey tab's Working sessions section lists the newest 40, and a
session written at once (an extraction, a copy or an install) is labelled
so. Enter on a row puts `session:N` in Find: Findings lists its files in
the order they changed, and the world draws the traverse through them.
ArrowDown and Enter in Findings step from stop to stop.

**Strata.** The inspector's Bytes by last change, for the folder you are
in or a selected folder, splits its bytes into six strata (under a day, a
week, a month, a year, three years, older) with a sentence such as "81% of
these bytes have not changed in over a year". The Age lens colours a
closed mass by the same table.

**Archive interiors.** I on a zip archive (or a jar, war, ear, apk, aab,
whl, xpi, nupkg, vsix or ipa) reads its directory through the service
without unpacking it and walls what it lists in on the archive's own
footprint. In the ledger I acts on the row the cursor is on; elsewhere,
on the selection. Contents lists the archive like a folder, the
breadcrumbs go through it, and a path inside reads `x.zip!/inner/file`.
Nothing inside can be changed, opened or revealed. The interior closes
when the archive changes on disk, and is unavailable in snapshot mode.
Other formats are named and refused, and search does not reach inside.

In the time view, working sessions and strata, "changed" means a file's
last modification time. A copy, a checkout or an extraction restamps the
files it writes, so they read as changed then, never as created or
arrived.

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

Inside an open archive, Open, Reveal and every change to an entry are
refused with a sentence before anything is sent to the service. Copy path
gives the path through the archive, `x.zip!/inner/file`.

### Safety model

- The service reads and writes only inside the directory named on the
  command line. Paths are root-relative; traversal segments are refused,
  and symbolic links that lead outside are refused for both reads and
  writes.
- It never overwrites. A name collision stops the whole batch before
  anything moves, and offers Keep both.
- It never deletes directly. Remove moves items into `.terrane-trash`
  inside the authorized directory, so the move is atomic and reversible.
- The holding area is refused by where it is, not only by its name: in
  any case, by its short name, through a link or a junction that leads
  there. Its index is read as untrusted data, so a record planted in it
  can neither move nor delete anything outside its own slot, and the
  holding area is used only while it is a plain folder.
- A symbolic link is followed only to an end inside the directory, for a
  preview, an archive listing, a hash, Open and Reveal; a copy or move
  never carries a relative link to where it would point outside.
- Every change records its inverse in a journal kept beside the holding
  area, so Undo works after a restart. Journal paths pass through the
  same guard as a request. Undo refuses, with the reason, if the disk has
  changed in a way that would make the undo destroy something.
- A cancelled copy removes only the paths it created, newest first, and
  folders only when empty. Items finished before the cancel stay and can
  be undone.
- Looking inside an archive reads only its directory, through the same
  checks as a preview: the file's real location must be inside the root.
  It extracts and writes nothing, and an entry's name is never joined to
  a path on disk. The read stops at 100,000 entries, a 64 MB directory or
  4 seconds, and says what it left out.
- The service listens on `127.0.0.1` only, checks the Host header, and
  requires a per-session token on every API call. The cookie that lets
  thumbnails load carries a secret of its own, named for the port, which
  opens thumbnails and nothing else.
- The page, which carries the token, is never stored by the browser. The
  files it loads are kept and revalidated by a weak ETag, so one that has
  not changed costs a 304 instead of a download.

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
| `npm test` on Windows 11 (11/13/2026): the service smoke test (boundary, static files and their revalidation, scan, every operation on disk, undo across a restart, progress and cancel, snapshot and read-only modes, the fixture's archives through `GET /api/inside`, the archive reader, the layout, relation lines, search tokens, the age table, the time view), then the landmarks store, working sessions, strata and archive interiors in Node | 358 passed (154, 76, 45, 33 and 50), none failed, after the Wave 2 merge |
| `npm run ui-check` on Windows 11 (11/13/2026), Edge 157 on an RTX 5050 laptop GPU, on the default fixture of 3,126 files: 22 scenarios, the earlier ones plus `time`, `landmarks`, `interior`, `traverse` and `strata` and their on-disk variants, in a WebGL pass and a pass with WebGL disabled | 793 passed and 5 skipped (what needs `--snapshot`, or reads the sheet after it had gone) after the Wave 2 merge; two failures, the `splash` scenario's reload step in each pass, which timed out waiting for the sheet (the docs pass before the merge saw it in the pass without WebGL only); draw calls at the recorded baseline, with the time view and the Age lens too, and 64 benchmarks one call over it (the shared pin mesh) |
| `npm test` on Windows 11 (11/13/2026), after the hardening pass: the smoke test adds the holding area by any name (case, a trailing dot, NTFS stream names, its 8.3 short name, a junction), planted holding records, a holding area that is a link, links that lead outside refused for hashing and Open, relative links a copy or move would aim outside, the thumbnail cookie, the scan writer when the page goes away, and source checks; the module tests add twins after a refresh, time inside an archive and the detail cache | 392 passed (181, 77, 45, 33 and 56), none failed |
| `npm run ui-check` on Windows 11 (11/13/2026), Edge 157 on an RTX 5050 laptop GPU, after the hardening pass: 24 scenarios, the earlier ones plus `hardening` (focus kept through redraws and hidden panels, contrast, live regions, menus, the single-key setting, is:benchmark, the forced unfold, an 800 by 500 window, the page opened from disk and from another server) and `hardening-disk` (a folder deleted from outside, the time view after a change, a list reordered under its cursor, Rescan all with a search), in a WebGL pass and a pass with WebGL disabled | 867 passed and 5 skipped; two failures, the `splash` scenario's reload step in each pass, as before; draw calls at the baseline recorded again once the empty relation layer stopped drawing (overview 6, selected 8, search 7, duplicate ties 9) |
| The final sanity sweep on Windows 11 (11/13/2026), after the polish pass: `node --check` on every script outside `web/vendor/`, `npm test`, `npm run vendor -- --check`, and `npm run ui-check` in both passes with Edge 157 on an RTX 5050 laptop GPU and the default fixture of 3,126 files | No syntax error in 57 scripts; 392 passed (181, 77, 45, 33 and 56), none failed; every vendored file matches the manifest; 867 passed and 5 skipped, with the `splash` reload step failing once in each pass as before; draw calls at the baseline. The same results again after the merge into `main` as Terrane 1.3.0 |
| `npm run ui-check` on Windows 11 (11/13/2026), Edge 157 on an RTX 5050 laptop GPU, after the load screen fix: the `splash` reload step reads a record the page keeps of the sheet from its first frame, because with reduced motion the sheet left 48 to 98 ms after it appeared, before the first look | 879 passed, 0 failed, 5 skipped; draw calls at the baseline |
| `npm run ui-check` on Windows 11 (11/13/2026), Edge 157 on an RTX 5050 laptop GPU, with single-key shortcuts off by default: the interface check turns them on for every page it opens, and `hardening` clears the setting to check the default (T on a toolbar button starts nothing, T in the world looks back; turned on in the guide, T on the button acts and the choice is kept) | 879 passed, 0 failed, 5 skipped |

Not verified: running on macOS; frame rate at street level in the largest
trees on a hardware GPU; Open and Reveal reaching a desktop application on
Windows; the progress panel driven in a browser (its service side is
covered by `npm test`); the loading sheet in Firefox and Safari; an
archive interior, the traverse and the time view in the largest trees,
and on the 2-core software rasterizer; the demo world on GitHub Pages
itself (it was checked through a stand-in Pages server in both passes);
the inspector drawer and the menu's reasons with a screen reader.

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
server/archive.mjs   reads a zip archive's directory, bounded (GET /api/inside)
web/index.html       page structure
web/css/terrane.css  stylesheet entry: cascade layers and module imports
web/css/tokens.css   the colours, type and space scales, named sizes, shadows,
                     layers and motion values the components read
web/css/components/  controls, bar, ledger, stage, inspector, block, floating,
                     splash (the loading sheet), and one per feature: time,
                     places, traverse, strata, interior
web/css/*.css        also: fonts, base, layout, utilities, motion, print
web/js/app.js        controller: state, service calls, panels, progress, and
                     the registries feature modules fill
web/js/elsewhere.js  a page opened from disk says how to start the service
web/js/demo.js       the demo world in the page: answers /api/ and the event
                     stream, draws pictures and sounds (no service behind it)
web/js/demo-service.js  the service's routes and operations over the world
web/js/demo-world.js the demo world: one seed, about 12,000 files, contents
web/js/model.js      tree model, aggregation, search, survey
web/js/layout.js     the spatial language and level of detail; BOX, STYLE, AUX
web/js/viewport.js   3D world, camera, picking, transitions, relation lines
web/js/theme.js      colours shared with the stylesheet
web/js/thumbs.js     the only way the page shows an image
web/js/ui.js         menu, dialog, notices, tip, indicators, virtual list
web/js/icons.js      the only way the page draws an icon (Lucide sprite)
web/js/float.js      places the menu and tip beside a point (Floating UI)
web/js/motion.js     counting figures, FLIP, springs (Motion, or WAAPI)
web/js/hud.js        north arrow, storage scale, the print frame
web/js/features.js   the feature modules app.js installs, in order
web/js/timeline.js   the shared table of bytes by last change (S.ages)
web/js/time.js       Time: the date scrub, T , . < >, the As of stepper
web/js/landmarks.js  Landmarks: benchmarks, the return point, the Places tab
web/js/places.js     the landmarks store, DOM-free: measure, compare, persist
web/js/traverse.js   Session traverse: Working sessions, session:N, the route
web/js/relations.js  working sessions and their route, DOM-free
web/js/strata.js     Strata: bytes by last change, the Age lens's typical age
web/js/interior.js   Interiors: I, the walled floor, twins, the lock
web/js/splash.js     the loading sheet: survey, strata, sounding, excavation
web/js/terrane-mark.js  the T, its grid and the wordmark as data (generated)
web/js/t-madness.js  ten T animations on a slab with depth, six played with
                     the pointer; not loaded by the app
web/assets/logos/    TERRANE-wordmark-framed.svg (the loading sheet's),
                     TERRANE-wordmark.svg (single colour)
web/vendor/          three.js, Floating UI, Motion, Lucide; see VENDORED.md
tools/dev.mjs        development runner (snapshot mode, kept current)
tools/snapshot.mjs   take a structure snapshot
tools/snapshot-export.mjs  a snapshot as CSV and JSON (npm run export)
tools/demo.mjs       serve the repository as Pages does, or write the demo
                     world to disk (npm run demo)
tools/thumbs.py      build and update the thumbnail dataset
tools/build_terrane_wordmark.py  generate the framed wordmark (npm run wordmark)
tools/build_terrane_mark.py  generate web/js/terrane-mark.js (npm run mark)
tools/smoke-test.mjs the service, the layout, the age table and the archive
                     reader, in Node (first in npm test)
tools/places-test.mjs, relations-test.mjs, strata-test.mjs, interior-test.mjs
                     the features' DOM-free modules in Node (npm test)
tools/demo-test.mjs  the demo world and service in Node, against the real
                     scanner and model (last in npm test)
tools/ui-check.mjs   headless browser check; scenarios in tools/ui-scenarios/,
                     hardening.mjs and demo.mjs among them
tools/make-fixture.mjs  the synthetic tree the checks run on (npm run fixture)
tools/vendor.mjs     fetch and verify the vendored browser libraries
docs/                ARCHITECTURE.md, ROADMAP.md
```

There is no build step. Edit a file and reload the page. A feature lives
in its own module, listed in `web/js/features.js`, and reaches the
controller only through the registries it is handed; `docs/ARCHITECTURE.md`
section 7 describes them. The design decisions and their trade-offs are in
`docs/ARCHITECTURE.md`; the staged plan, the minimum filesystem scope and
the exploration loop are in `docs/ROADMAP.md`.

For GitHub Pages (deploy from the `main` branch, root folder), the root
`index.html` forwards visitors to `web/`, so the interface keeps a
single page. Pages has no service, so there the page runs the demo
world: `web/js/demo.js` answers every request to `/api/` in the page
from `web/js/demo-service.js`, over the tree `web/js/demo-world.js`
builds. Nothing a visitor does is sent anywhere.

## License

Terrane is released under the MIT License; see `LICENSE`. The bundled
third-party files keep their own licenses, which sit beside them:

- three.js, Floating UI and Motion in `web/vendor/` are MIT.
- The Lucide icons in `web/vendor/lucide/` are ISC.
- The Archivo and DM Mono fonts in `web/fonts/` are under the SIL Open
  Font License 1.1.

`web/vendor/VENDORED.md` records the version and source of each.

<!-- ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once! -->
