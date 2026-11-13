<!--
✒ Metadata
    - Title: Terrane Architecture (Terrane Edition - v1.5)
    - File Name: ARCHITECTURE.md
    - Relative Path: docs/ARCHITECTURE.md
    - Artifact Type: docs
    - Version: 1.5.0
    - Date: 11/13/2026
    - Update: Friday, November 13, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 1.5.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] — The
      hardening pass. The route diagram names info and journal, and
      what snapshot mode answers and refuses (hash among the refusals);
      the service section says how the holding area, links, a dropped
      stream and the thumbnail cookie are guarded. Scale: the relation
      layer is drawn only while it holds a line, sessions are found when
      read, twins after a refresh walk only what was read again, and one
      dated figure for sessions. The registry table gives the
      controller's tip lines; key allocation covers the single-key
      setting; a hazard for the forced unfold. Two sentences now say
      what is true: components read colours from tokens.css (sizes
      mostly), and a locked entry's hatch replaces a link's bands. The
      polish pass: the instruments' two rows over the world, and the
      print sheet's title block, inspector and buttons.
    - 1.4.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] — The
      visual identity gains the conventions Stage 5 added: the crossed
      footprint and AUX, the upright verdigris benchmark mark, the
      session traverse, the walled floor and twins, and the Age lens's
      typical age for closed masses. A new section 7 covers feature
      modules and their seams (the registries, AFTER_OP and MENU among
      them, the key allocation, the relation-line layer, the code
      tables and the shared age table) and the hazards a feature must
      respect. The service section adds GET /api/inside with its flag
      bits, bounds and snapshot refusal, and what Undo and a partial
      change answer; Scale adds the age table, sessions and interiors
      as measured; the open-world table and the known limitations
      follow the code. The Description keeps attribution to this log.
    - 1.3.1 (11/12/2026) [dendogg + Anthropic - Claude Opus 5.5] — The
      wordmark on the loading sheet is the framed TERRANE Dennis set the
      style for in TER.svg, and its colour rule is written down.
    - 1.3.0 (11/12/2026) [dendogg + Anthropic - Claude Opus 5.5] — The
      visual identity covers the T mark, the TERRANE wordmark and the
      loading sheet, and names the sheet among what may loop.
    - 1.2.0 (11/12/2026) [dendogg + Anthropic - Claude Opus 5.5] — The
      stack table names the vendored browser libraries; the visual
      identity covers icons for actions, the survey instruments, the
      layered stylesheet and the rules for motion.
    - 1.1.0 (11/11/2026) [dendogg + Anthropic - Claude Opus 5.5] — The
      service section covers jobs, the persistent journal, snapshot mode
      and thumbnails; a datasets section; the first measurements on
      Windows with a hardware GPU.
    - 1.0.0 (11/09/2026) [dendogg + Anthropic - Claude Fable 5.2] —
      Initial release.

✒ Description:
    The technical and design decisions behind Terrane and the reasons for
    them, including the mid-build change from a tabletop model to a
    world, an honest account of how far the result goes toward the
    open-world idea, and the measured performance. It also records the
    drawing conventions the world uses and the seams through which
    feature modules extend the controller.

✒ Key Features:
    - Stack choices and what was rejected
    - The spatial model and why it was rebuilt
    - World management: level of detail, budgets, coordinates
    - Service design and data flow, archive listing included
    - Datasets for development against real data
    - The visual identity and every drawing convention
    - Feature modules and their seams: registries, key allocation,
      relation sets, code tables, the shared age table
    - Measurements and known limitations

✒ Other Important Information:
    - Dependencies: none
    - Compatible platforms: not applicable
---------
-->

# Architecture

## 1. Stack

| Decision | Choice | Why | Rejected |
| -------- | ------ | --- | -------- |
| Filesystem access | Local Node service on the loopback address | The only option that can open, reveal, move and watch arbitrary local paths from a web interface | File System Access API: Chromium only, permission is per session, cannot open or reveal in the system, no change watching |
| Service dependencies | None | One command to run, nothing to install, small audit surface for code that moves your files | Express, chokidar, trash: each replaceable by 30 to 80 lines here |
| Rendering | three.js r187, WebGL2, vendored | Mature instancing and shader hooks; runs everywhere | Babylon.js (heavier, no advantage here); WebGPU (not yet universal); React Three Fiber (the scene is one instanced mesh, so a scene-graph reconciler adds cost and nothing else) |
| Frontend | Plain ES modules, no build step | A handful of modules, one page; a bundler would be the largest dependency in the project | React, Vite |
| Browser libraries | Floating UI (menu and tip placement), Motion (springs, counting figures), Lucide icons; fetched from jsDelivr once by `tools/vendor.mjs` and served from the page's own origin | Each does one hard job well; vendored with recorded digests, so the page keeps working offline and never runs live third-party code while holding a token that can move files | Loading them from a CDN at run time; a component framework |
| Stylesheet | Native CSS in cascade layers, one module per component, no preprocessor | Layers settle precedence by intent instead of specificity; tokens, container queries, `color-mix`, `@property` and `@starting-style` cover what a preprocessor or animation runtime would | Sass, Tailwind, CSS-in-JS |
| Geometry | Procedural | Every shape is data-driven: its size, height and position are the information | Blender assets. Blender 5.2 is available and was considered; nothing in this world is a fixed asset, so authored meshes would be decoration |
| Scan transport | NDJSON over a streamed HTTP response | Progressive, backpressured, cancellable, no protocol code | WebSocket |
| Change transport | Server-sent events | One-way, auto-reconnecting, built in | WebSocket, polling |
| Archive reading | The zip central directory parsed in the service with Node built-ins | A listing needs only the directory at the end of the file; nothing is extracted, so no decompressor and no library touch untrusted bytes beyond it | An unzip library; extracting to a temporary folder |

## 2. The spatial model

### What it was

The first build was a squarified treemap extruded into terraces, shown
from outside through an orthographic camera, re-rooted on a fixed table
each time a folder was entered. It worked and was legible. Dennis's
verdict was that it was a 3D arrangement on a 2D plane, a thing you look
at and not a place you are in, and that adding a first-person camera to
it would not change that.

### Evaluation

He was right about the cause. Three properties made it a diagram:

1. **A fixed frame.** Entering a folder swapped the contents of the same
   table. There was no "there" to travel to, so there was no travel.
2. **Absolute scale.** Step heights and minimum sizes were constants, so
   detail existed at exactly one zoom level.
3. **Detail chosen by a setting.** A "strata" number decided how many
   levels were drawn, regardless of where the viewer was.

The layout algorithm itself (area is bytes, nesting is elevation) was
sound and carries real information, so it was kept. The three properties
above were replaced.

### What it is now

- **One continuous world.** The whole authorized directory is laid out
  once in world coordinates. Nothing is re-rooted. A folder has a
  location, and going to it is a flight.
- **Self-similar scale.** A plateau's step height is 4.5% of its own
  width. A folder ten levels down looks, from ten of its own widths away,
  like the root does from ten of its widths away. Depth is scale, and you
  shrink as you descend: travel speed, eye height, near clipping, haze
  distance and the sun's shadow frustum are all proportional to your
  height above the local surface.
- **Geometry generated around the eye.** `layout.js` takes the eye
  position. A folder stands open when its width divided by its distance
  from the eye exceeds a threshold, and closes again below 72% of that
  threshold so it cannot flicker. Within an open folder, entries smaller
  than a few pixels from here are gathered into scree. The layout is
  rebuilt whenever the eye has moved more than 12% of its altitude; boxes
  that persist do not move, new ones rise out of their parent.
- **Location derived from the camera.** "Where you are" is the deepest
  folder under the centre of the view that still fills a good part of
  it. Breadcrumbs, ledger and legend follow. Without WebGL there is no
  camera, so going to a folder sets the location directly and a relayout
  leaves it in place.
- **An environment.** Sky, horizon, altitude-scaled haze, a surveyed
  ground plane running to the horizon, and terrain the eye cannot pass
  through.

### How far this goes toward the open-world idea

| Open-world technique | Status here |
| -------------------- | ----------- |
| Camera inside the world, free movement on all axes | Done |
| Render only what is relevant to the player's position | Done: distance-driven level of detail with a 70,000-box budget, checked before every box |
| Multiple navigation scales | Done: scale-proportional flight, plus jumps from breadcrumbs, ledger, search and survey |
| Coordinate management | Done: floating origin. Layout is computed in 64-bit; instance positions are sent to the GPU relative to the eye, re-based at every layout. A file twelve levels down, four orders of magnitude smaller than the world, renders without jitter |
| Procedural generation | Done in the sense that matters: all geometry is generated from data at run time |
| World streaming of data | Not done. The service streams the scan, but the browser then holds the whole tree. See Roadmap stage 4 |
| Regions that are not confined to a ground plane | Partly. Elevation carries nesting, so the world has real relief, but it is a landscape, not a volume. A zip archive can be entered as a walled floor on its own file's footprint. Bridges between related regions and vertical organisation are not attempted. See Roadmap stage 5 |
| Landmarks and waypoints | A first form: benchmarks stand as survey marks that say what changed since they were set, and one return point can be marked and flown back to. No trail of where you have been |
| Paths through the world | A first form: the traverse draws a working session from file to file in the order they changed |

## 3. Service

```text
browser                              service (127.0.0.1)
  GET  /api/info                ->   the root, its name, the mode, the watcher's state
  GET  /api/scan?path=&depth=   ->   scan.mjs      NDJSON, one record per folder
  GET  /api/events              ->   fs.watch      SSE: folders that changed, job progress
  GET  /api/journal             ->   ops.mjs       the journal and the holding area
  POST /api/op                  ->   ops.mjs       mkdir rename move copy trash open reveal
  POST /api/cancel              ->   ops.mjs       stop a running or queued job
  POST /api/undo | restore | purge
  POST /api/hash                ->   SHA-1         duplicate verification
  GET  /api/stat | raw          ->   metadata, sandboxed preview bytes
  GET  /api/inside?path=        ->   archive.mjs   a zip's directory, as scan records
  GET  /api/thumbs | thumb      ->   thumbs.mjs    image index, versioned thumbnails
           every path  ->  guard.mjs  (root-relative, lexical check, realpath check)

snapshot mode (--snapshot):  info, scan, stat, events, an empty journal  ->  snapshot.mjs
                             every change, open, reveal, raw, inside, hash  ->  refused
```

- **One mutation at a time**, through a queue. A batch is validated in
  full before its first item moves.
- **Copy, move and remove run as jobs.** Each reports its phase, bytes,
  files and items over the event stream, throttled to about seven
  updates a second. A copy measures first, then streams large files in
  1 MB chunks so a cancel lands within one chunk. Every path it creates
  is recorded; on cancel or failure those paths are removed newest first,
  folders only when empty, so nothing another program wrote is touched.
- **The journal persists** in `.terrane-trash/journal.json`, written
  atomically after every change, with root-relative paths that are
  resolved through the guard again on undo.
- **Answers name what moved.** Undo of a rename or move answers with
  `moved`, the paths it carried back as `[where it was, where it is now]`
  pairs. A move, copy or removal that stops part way answers with
  `results`, the paths it finished, which are journaled like a whole
  change. The page follows both by path (section 7, `AFTER_OP`).
- **After a change, only the affected folders are re-read** (depth-1
  scan), reconciled into the model by name so selection survives, and
  any new child folder is deep-scanned. The watcher feeds the same path.
- **The holding area is refused by where it is.** A path segment that
  names it is refused in any case on Windows and macOS, and on Windows
  with trailing dots or as an NTFS stream; a real location in or under
  it is refused too, so its 8.3 short name, or a link or junction that
  leads there, reaches nothing. Its index is read as untrusted data: a
  record whose id or name could climb out of its slot is dropped before
  the Journal lists it or a restore or Undo moves anything. The holding
  area must be a plain folder, not a link, before anything is held,
  restored, purged or journaled there.
- **A link is followed only to an end inside the root.** Previews,
  archive listings, hashing, Open and Reveal resolve a link to its end
  and refuse one outside (`guard.realInside`). A copy or a move refuses
  to carry a relative link to a folder from which it would point outside
  the root.
- **A stream the page drops ends.** The scan routes wait for `drain` or
  `close`, whichever comes first, so a survey dropped while the socket is
  full leaves no scan, and in snapshot mode no open database, behind.
- **The thumbnail cookie is not the token.** It is named for the port
  and holds a secret of its own that opens `/api/thumbs` and
  `/api/thumb` only; a cookie reaches every service on the host whatever
  its port, so it never carries the session token.
- **State lives in one place per kind**: the disk is the truth; the model
  is a cache of it; the layout is a function of model and eye; paint is a
  function of layout and session state. Nothing is patched in place
  across those boundaries. An open archive's listing is a second model,
  read whole and only then hung from the archive's file, so no total in
  the tree changes; it is never written back.

### Archive listing

`GET /api/inside?path=` lists what a zip archive holds without unpacking
it. The file is untrusted input, so the route and the reader are bounded
on every side.

- **The same checks as a preview.** The path is resolved lexically with
  the root itself refused, the parent's real location must be inside the
  root, the file's own real location must be inside the root, and it
  must be a regular file (a folder is refused with `ENOTFILE`).
- **Format from the first bytes.** `archive.mjs` names zip, 7z, RAR,
  gzip, bzip2, xz, zstd, cabinet, ar and tar, and lists only zip. A file
  whose first bytes match nothing is still listed when its end holds a
  zip directory that checks out (a self-extracting stub, a launcher
  before a jar). Any other format is refused with 415, naming the format
  found or the one the name suggests. A damaged zip gets 422 and a
  sentence saying why it looks damaged; a directory that breaks off part
  way is listed up to the break, and the listing says so.
- **One read of the directory.** The end record is found from the tail,
  ZIP64 records included, and the whole central directory is read at
  once. Names are UTF-8 when flagged, the Unicode Path field when its CRC
  matches, otherwise UTF-8 or code page 437; dates come from the
  extended timestamp or NTFS field before the DOS fields.
- **Scanner records.** The answer is the scanner's per-folder records,
  parents first, plus the listing's figures. Entry flags use the
  scanner's bits, 1 link, 2 hidden and 4 special, plus **8 locked** (the
  entry is encrypted) and **16 escape** (a name that would land outside
  the folder if extracted). A name repeated in one folder is numbered,
  as in `a (2)`, so every path finds one entry.
- **Bounds.** 100,000 entries, a 64 MB directory, 4 seconds, 128 folders
  deep and 100,000 folders; at most two archives are read at once, and a
  read stops when the page goes away. Anything left out is stated in one
  sentence (`partial`), never silently dropped.
- **Names are data.** A name is split into segments, `.` and `..` are
  resolved inside the archive, and an absolute or climbing name is kept,
  flagged and counted. Nothing is ever joined to a path on disk, nothing
  is extracted and nothing is written.
- **Snapshot mode refuses it** with `ESNAPSHOT` (403) and a sentence: a
  snapshot holds names, sizes and dates, not what a file contains.

## 4. Scale

| Technique | Where |
| --------- | ----- |
| Breadth-first progressive scan, bounded concurrency | `scan.mjs` |
| Incremental roll-up of size, counts, kinds, recency, height | `model.js` `ingest` |
| Layout cost proportional to boxes drawn, not tree size; a 70,000-box budget checked before every box | `layout.js` |
| One instanced mesh, one draw call; drawing conventions in the fragment shader | `viewport.js` |
| Buffer uploads cover only the boxes, pins and line vertices drawn; while boxes travel the shadow map is redrawn on every fourth frame at most | `viewport.js` |
| Every relation set in one preallocated line buffer and one draw call, drawn only while it holds a line | `viewport.js` |
| Labels placed again only when the eye, the layout, the marks or the canvas change | `viewport.js` |
| Render on demand | `viewport.js` `invalidate` |
| Picking by direct ray and box tests on typed arrays | `viewport.js` `#cast` |
| Virtual list for folders with tens of thousands of rows | `ui.js` |
| One age table per survey: every folder's bytes and files by last change at 20 ladder steps, in typed arrays beside the model | `timeline.js` |
| Working sessions from one walk and one typed-array sort with no compare callback, found the first time something reads them after a survey | `relations.js`, `traverse.js` |
| An open archive's twins after a refresh: only the folders read again, and any new since | `interior.js` |
| An archive's listing read into a model of its own, then grafted; its chamber inside the same box budget | `interior.js`, `layout.js` |

Cognitive scale is handled by the same mechanism as rendering scale: you
see at most a few thousand things, chosen by where you are. From the
overview a 400,000-file tree is about a hundred masses.

The age table is rebuilt after each survey, inside the survey's
debounce; working sessions are found the first time the Survey tab, a
`session:` search or the traverse reads them after it; an archive is
listed only when asked for. None of them runs on the frame path.

### Measured (Linux container, 2 cores, software rasterizer)

| Measure | 39,990 files / 3,160 folders (real) | 400,018 files / 28,575 folders (synthetic) |
| ------- | ---- | ---- |
| Full scan | 0.9 s | 7 to 12 s |
| Browser heap | not recorded | 85 MB |
| Service memory | not recorded | 63 MB |
| Boxes drawn, overview to street level | 570 to 8,500 | 110 to 11,200 |
| Layout plus paint | not recorded | 10.5 ms at 9,850 boxes |
| Pick | not recorded | 0.08 ms |
| Whole-tree search | not recorded | under 0.4 s including debounce |
| Script time per frame, GPU excluded | not recorded | within one 16 ms frame |

Frame rate on real graphics hardware was not measured. The test machine
rasterizes on the CPU.

### Measured (Windows 11, 16 cores, RTX 5050 laptop GPU, 11/11/2026)

| Measure | 230,307 files / 30,159 folders (real, from a snapshot) |
| ------- | ---- |
| Snapshot taken | 2.4 s |
| Survey in the browser | 1.6 s (0.3 s served, the rest ingest and layout) |
| Browser heap | 84 MB |
| Frame rate at the overview | 60 fps, the display's limit |
| Thumbnail index | 19,181 images, one request of 346 KB |
| Inspector preview | one 32 KB thumbnail in place of a 2.2 MB original |

### Measured (Windows 11, 16 cores, 11/13/2026, `npm test` in Node)

| Measure | Result |
| ------- | ------ |
| Working sessions over 400,000 files | 84.0 ms, the best of three (78.7 and 113 ms on other runs the same day; the test's ceiling is 120 ms) |
| Age table over 400,000 files in 30,000 folders | 32.5 ms |
| Paint under the Age lens, 9,929 boxes (1,694 closed masses) | median 0.089 ms, against 0.096 ms when masses took their newest change |
| A 300,000-entry archive listed into a model and grafted | 150 ms; its layout from the floor, 50,305 boxes, in 94 ms |
| Twins by name and size over 200,000 files | 5.8 ms |
| Twins after a refresh of three folders, against a whole walk of 200,000 files | 0.01 ms, against 2.7 ms |

These are Node figures on the 16-core machine. A 2-core machine like the
Linux container above was not measured for them.

## 5. Datasets

Two SQLite files per mirrored directory, kept in
`%LOCALAPPDATA%\terrane\datasets\<name>`, outside the project and outside
OneDrive.

| Dataset | Written by | Read by | Shape |
| ------- | ---------- | ------- | ----- |
| `structure-<time>.db` | `snapshot.mjs`, through the live scanner | snapshot mode | `folders` (path-indexed, breadth-first ids), `files`, an `entries` view, `meta` |
| `thumbs.db` | `tools/thumbs.py` | `thumbs.mjs`, both modes | one row per image: version, status, size in pixels, average colour, 4×4 grid, 160 and 480 px WebP or gzipped SVG source |

Choices and their reasons:

- **Snapshots are new files, never rewritten.** A reader opens the
  database per request and closes it, so a new snapshot can be renamed
  into place while the service runs; on Windows an open file cannot be
  replaced. The newest three are kept.
- **Replay keeps the scan contract exactly.** Ids are assigned
  breadth-first, so ordering by id puts every parent before its children
  and the replay is the same stream the live scanner produces. The smoke
  test compares the two record for record.
- **Thumbnails are built by Python and Pillow**, not the service. Node has
  no image decoder, and the builder is a development tool, not a runtime
  dependency. It reads originals only, through the paths the snapshot
  recorded, and skips OneDrive cloud-only files by their attributes.
- **Images never reach the browser at full size.** The index carries each
  image's colour and pixel size, so the world and the panels can use them
  with no image request. Thumbnails are fetched only where they are shown,
  and their URLs carry the image version and no token, so the browser
  caches each one once, as immutable; a SameSite=Strict cookie named for
  the port, holding a secret that opens thumbnails and nothing else,
  authenticates them.
- **Opening a large file is expensive on Windows** because the antivirus
  scans it in full on open, even for an 8 KB header read. The builder
  therefore records heavy SVGs without opening them, and renders them
  only on request.

### Known limitations

- The browser holds the whole tree: about 150 MB per million entries.
- One folder draws at most 5,000 entries individually; the rest are scree
  until you are close enough for the largest of them to matter.
- On Linux the recursive watcher is skipped above 15,000 folders.
- Sizes are logical sizes. Sparse files and hard links are not detected.
- Duplicate candidates are files of identical size until verified;
  verification of files over 16 MB samples three megabytes and is
  reported as probable.
- Shadows soften at very small scales.
- Touch input is limited to one-finger slide and tap.
- The time view, working sessions and strata read modification times:
  the last change, never a creation or an arrival. A copy, a checkout, an
  extraction or a tool that writes fixed dates restamps files and skews
  all three.
- The age table is a snapshot of the tree at the last survey; until the
  next one, a folder whose contents changed answers with its old figures.
- Drawing conventions are exclusive, one per box: a crossed slab hides a
  link's bands or a candidate's half bands, and a locked entry's hatch
  replaces a link's bands. A combinable mark would need a bitfield
  attribute.
- A relative link inside a moved folder keeps its text, so it may point
  somewhere else from the folder's new place; anything that reads or
  launches what a link leads to checks its real location first.
- Where the graphics driver returns 0 from `fwidth` on a line fragment,
  dashed relation lines draw solid. The traverse is then told from
  duplicate ties by its colour and its lower arc.
- Places live in the browser's per-origin storage: another browser,
  profile or port sees none, and a snapshot's benchmarks are kept apart
  from the live directory's.
- Archive interiors cover the zip family only, one archive at a time;
  search does not reach inside, and entry contents and CRCs are not read.

## 6. Visual identity

The brief asked for a clean break from earlier digiSpace work. The
direction is a survey sheet around a plaster world.

- **Ground**: pale mineral green-grey, light theme. No dark dashboard,
  no neon, no glass, no blur. Gradients only for the two data ramps and
  the drawing textures (stipple, hatch, grid, a faint paper grain).
- **Line**: 1px ink rules, square corners, hard offset shadows on what
  floats. The same ink draws box edges in the 3D world through the
  fragment shader, which is what ties the two halves together.
- **Colour is semantic only**: highlighter yellow is selection and hover
  everywhere; vermilion is search; garnet is duplicates and destructive
  actions; verdigris is destinations, live state and benchmarks; nine
  muted pigments are file kinds. Hover is a highlighter stroke that wipes
  across a control from the left, the same yellow that marks a selection.
- **Icons name actions; conventions draw data**: Lucide line icons sit on
  tools, menu items and buttons. What the world shows keeps its drawing
  conventions: hatch is sealed (or, inside an archive, locked), hollow is
  empty, stipple is aggregate, bands are links, half bands are a
  candidate not yet verified or a twin, and the cross is changed since
  the date looked back to. The same marks appear in the ledger swatches
  and the inspector key, and no icon replaces them.
- **Crossed footprint (the time view)**: when the world looks back to a
  date, the layout marks a box `AUX.CROSSED` if it changed after that
  date. A file or an empty folder lies flat as a slab, the lesser of 8%
  of its plateau's step and 5% of its own short side, and so does a
  closed mass that kept none of its bytes. Paint gives it
  `STYLE.CROSSED` and washes its colour 60% toward paper, once; the
  shader draws only the footprint's two diagonals in ink on its top and
  bottom faces, in the box's own coordinates so a re-based origin cannot
  move them, thin at any distance and faded with the haze and as the box
  shrinks on screen. A selected crossed box keeps highlighter yellow with
  the cross over it. A closed mass that kept part of its bytes is
  lowered to that share (`AUX.SUNK`) and carries no other mark.
  Footprints, positions and the box count stay those of the present.
  `AUX` is the per-box byte `layout.aux`, allocated in `layout.js` like
  `BOX` and `STYLE`.
- **Benchmark**: an upright verdigris survey mark, point up, standing on
  the peak of everything on the box that shows the folder, or on the
  mass or scree hiding it. It shares the pin mesh, so it adds no draw
  call of its own. Its tag carries a verdigris rule on its left and says what
  changed since the measurement; up to 12 such tags are placed before
  every other label. Verdigris is also the age ramp's fifth stop and
  lies close to the code pigment, so a benchmark is told apart by its
  shape, by pins being unlit and fogless, and by its tag. It is never
  drawn as a box colour.
- **Traverse (working sessions)**: a session is drawn as dashed ink arcs
  from stop to stop in the order its files changed, lifted 0.12 of their
  chord, with a chevron at the middle of each pointing on. The dash
  period is 11 pixels on screen rounded up to a power of two in world
  units, so it stays between 11 and 22 pixels at any depth and changes
  by octaves rather than crawling as the eye moves. The name
  "traverse" and the dashed-ink convention belong to working sessions; a
  later trail of where you have been needs a name and a convention of
  its own.
- **Walled floor (archive interiors)**: an archive opened with I stands
  as a chamber on its own file's footprint. Four walls (`BOX.WALL`, whose
  node is the file, so they take the file's lens colour) stand on the
  edges and carry no label; between them the floor is labelled with the
  archive's name, and what the directory lists stands on it in the
  world's usual conventions, opening by distance like any folder. Locked
  entries are hatched. Twins, an entry and the files in the directory
  with its name and size, are half-banded on both sides while it is
  open, and a selected one is tied to the others by solid arcs in the
  archive kind's colour, the relation set `twins`.
- **Typical age (the Age lens)**: a file is coloured by its last change
  and a closed mass by its typical age, the byte-weighted median step of
  the age table: the date half its bytes have not changed since. A
  folder of old bytes with one fresh file no longer reads as fresh. The
  legend's title, the hover line ("Half its bytes unchanged since
  MM/DD/YYYY") and a Reading the world row say so. Inside an open
  archive, which the table does not hold, a closed mass keeps its newest
  change, and the legend and hover line say that too.
- **Type**: Archivo, one variable family used across its width axis
  (expanded capitals for reference labels, normal for reading, condensed
  for dense rows), with DM Mono for paths and figures in tabular numbers.
- **Layout motifs** from drawing sheets: lettered panel references, a
  title block along the bottom edge carrying lens, legend, the As of
  date, grain, altitude and status, and instruments around the world:
  ruler ticks on two edges, registration corners, a north arrow that
  turns with the camera, and a scale stating how much storage a square
  of screen holds.
- **Motion explains a change and stops**: things arrive from where they
  came from, rules draw themselves, strata settle, figures count to
  their new value, indicators slide to the chosen item. Only instruments
  showing live work loop (the status lamp, a running copy, the loading
  sheet while it waits for the first survey). Under
  `prefers-reduced-motion` every animation resolves to its end state.
- **Mark and loading sheet**: the T is Dennis's drawing, an inlaid
  channel in four pigments around a white face. The TERRANE wordmark
  (`web/assets/logos/TERRANE-wordmark-framed.svg`) is built the way he
  drew the letters in `TER.svg`: a near-white face inside a frame of
  colour strips, over a soft shadow. Its T, E and R are his from that
  file, its N is his from `R-N.svg`, and its A is a draft; the file is
  generated by `tools/build_terrane_wordmark.py`. One rule colours every
  frame, read off his T: vertical strips carry the colour (warm on
  left-facing sides, cool on right-facing ones, light where their top
  meets an up-facing edge, dark where they hang under a down-facing
  one) and horizontal strips blend between the verticals they join.
  The mark and the wordmark reach the page as data in
  `web/js/terrane-mark.js`, generated by `tools/build_terrane_mark.py`.
  The loading sheet (`web/js/splash.js`) uses them in one sequence: a
  survey crew stakes out the T on the sheet's grid, the strata are
  deposited one cell at a time, the pen traces the inlay, a sounding
  passes down the face, and the wordmark rises beneath. While the
  service connects and the first survey arrives the T holds still and a
  comet laps its channel; when the first batch is drawn the sheet is
  excavated away from the top. The regions beneath are inert while it is
  up, its status line is a polite live region, and a click or key skips
  the intro once the page is ready. The mark's pigments and the letters'
  face are scoped to the sheet: they are identity, not meaning, and the
  interface never uses them.
- **Stylesheet structure**: `web/css/terrane.css` declares the layers
  `tokens, fonts, base, layout, components, utilities, motion, print`
  and imports its modules into them: one each for the other layers,
  and for components one per component group (controls, bar, ledger,
  stage, inspector, block, floating, splash) and one per feature (time,
  places, traverse, strata, interior). Components read their colours
  from `tokens.css`, never a raw colour (the loading sheet's artwork
  palette is scoped to the sheet); most sizes are tokens too, while
  component-local paddings and gaps are written in place; the
  instruments over the world stand on two rows set by tokens
  (`--hud-inset`, `--hud-lift`), so the storage scale, the view tools,
  operations in progress and notices never cover one another. Utilities
  outrank components by layer, not by `!important`. The print sheet puts
  the title block under the location bar and lays the last drawn frame
  of the world beside the inspector, which runs on across pages in its
  frame; nothing that is pressed is printed.

## 7. Features and their seams

Stage 5's features each live in one module and reach the controller only
through the `api` that `install(api)` is handed. `web/js/features.js`
lists them in install order: `time.js` (the date scrub), `landmarks.js`
(benchmarks and the return point, with the DOM-free store `places.js`),
`traverse.js` (working sessions, with the DOM-free `relations.js`),
`strata.js` (bytes by last change) and `interior.js` (archive interiors).
`api` is frozen: the session state `S`, the registries below, and the
controller functions a feature needs to read the tree, travel, redraw and
speak. A module that throws while installing is named in a notice, and
the others still start.

### Registries

Every entry is an object with a unique `id`, an `order` (default 50,
equal orders keep the order they were added in) and, for a feature, its
`owner`. Hooks run in order; one that throws is reported in the console
and the rest still run.

| Registry | An entry | Filled by |
| -------- | -------- | --------- |
| `KEYS` | `{ keys, mod, run(c), when, inList, guide }`: the keyboard map and the `?` guide as one table | the controller, Time, Landmarks, Interiors |
| `ESCAPE` | `{ active(), clear(), typing }`, first active wins: floating surface 10, placing 20, kind filter 30, Time 40, search 50, selection 70, an open archive 80 | the controller, Time, Interiors |
| `PIN_SOURCES` | `{ pins(L, room) }`, added up in order to the 3,000-pin capacity: benchmarks 10, search 20, heavyweights 30 | the controller, Landmarks |
| `TIP_LINES` | `{ lines(node, { i, type, L }) }`: hover lines after the name and summary: levels 10, Strata 15, matches 20, placing 30, copies 40, pixels 50, Landmarks 50, Time 60, Interiors 70 | the controller, Time, Landmarks, Strata, Interiors |
| `INSPECTOR.focus`, `INSPECTOR.node` | `{ build(node, ctx) }`: sections of the "You are in" summary and of a selected item | the controller, Time, Landmarks, Strata, Interiors |
| `READING` | `{ glyph, title, text }`: a Reading the world row | the controller and every feature |
| `TABS` | `{ label, draw, list, count, enter, key }`: a ledger tab | the controller, Landmarks (Places) |
| `SURVEY` | `{ build(survey) }`: a Survey tab section | the controller, Session traverse (Working sessions, first at 5) |
| `LAYOUT_OPTS` | `{ options(opts) }`, merged into the layout's one options object | Time (`asOf`), Interiors (`inside`, `aliases`) |
| `MENU` | `{ items(node, ctx) }`: a group of context menu items after Open, Reveal and Copy path, or at the end for the folder you are in | Landmarks, Interiors |
| `QUERY.is`, `QUERY.prefix` | `is:<word>` and `<name>:<value>` search tokens; built-in tokens cannot be replaced | Landmarks (`is:benchmark`), Session traverse (`session:N`) |
| `AFTER_LAYOUT` | `run(L)` at the end of every relayout | Landmarks, Session traverse |
| `AFTER_REFRESH` | `run(dirs)` once a refresh has pruned selection, focus and trail | Landmarks, Interiors |
| `AFTER_SURVEY` | `run(survey, { full })` after every survey; the age table is rebuilt first, at 10 | the controller and every feature |
| `AFTER_OP` | `run(body, res)` once the service has carried out a change, before the affected folders are re-read: Undo included (`res.moved`), and a change that stopped part way (`res.partial`, `res.results`) | Landmarks |
| `AFTER_QUERY` | `run(search, query)` whenever the search runs; it may set `search.sort` and `search.note` for Findings | Session traverse |

`AFTER_OP` is what lets Landmarks follow Terrane's own renames and moves,
and their undo, by path before the tree changes, after a reload too.
`MENU` lets a feature offer its actions where the controller's are, and
shows them unavailable, with the reason, where they do not apply.

### Key allocation

`KEY_OWNERS` in `app.js` fixes the plain keys a feature may bind: W A S
D Q E R F stay the viewport's, I is Interiors', T , . < > are Time's, and
B H J are Landmarks'. A reserved key is refused to any other owner, and a
key bound twice is refused. Session traverse and Strata have no keys.
`inList` (default true) decides whether a key acts while the ledger list
has focus; the guide is made from the same table. The guide also holds
the single-key setting: turned off, a key that types one character and
needs neither Ctrl nor Alt acts only while the world or the ledger list
has focus (WCAG 2.1.4), and Ctrl and Alt chords act everywhere. It is
kept in this browser.

### Relation lines

One preallocated line buffer of 40,000 vertices draws every named set in
one draw call, and only while some set holds a line: three.js draws an
empty range too, so the layer is hidden when it is empty.
`setRelation(key, { color, dashed, lift, arrows, legs })` keeps each
set's endpoints in 64-bit world coordinates, and the vertices
are rewritten around the floating origin at every layout and uploaded by
range. Three sets exist:

| Set | Drawn by | Look |
| --- | -------- | ---- |
| `dup` | the controller, for a selected duplicate candidate | garnet, solid, lifted 0.3 |
| `session` | Session traverse | ink, dashed, lifted 0.12, chevrons |
| `twins` | the controller, for a selected twin while an archive is open | the archive kind's colour, solid, lifted 0.22 |

The layer is hidden while boxes travel, because its endpoints are where
the boxes end up. That holds for duplicate ties too, which stayed drawn
through a transition before this layer replaced them.

### Code tables and the layout's options

`layout.js` allocates every code, so two features cannot claim one:
`BOX` (`DIR 0`, `FILE 1`, `CAP 2`, `SCREE 3`, `WALL 4`), `STYLE`
(`PLAIN 0`, `HATCH 1`, `HOLLOW 2`, `STIPPLE 3`, `BANDS 4`, `HALF_BANDS 5`,
`CROSSED 6`; 7 is free) and `AUX` (`NONE 0`, `SUNK 1`, `CROSSED 2`). The
shader's style branches are bounded on both sides, so a code with no
branch draws plain. `buildLayout(root, options)` passes one options
object whole: `cam`, `grain`, `now`, `force`, `aliases`, and a feature's
own keys, `asOf` from Time and `inside` from Interiors. A layout never
holds more than 70,000 boxes; the viewport's buffers hold 72,000.

### The shared age table

After every survey an `AFTER_SURVEY` hook at order 10 rebuilds `S.ages`
(`timeline.js`): each folder's bytes and files by last change at 20
ladder steps from now back to 30 years, a ladder that holds exactly 1, 7,
30, 365 and 1,095 days. Time steps along it, Strata reads its six bands
as differences between those steps, and the Age lens reads each folder's
median step, kept with the table, so all three agree. It is null until
the first survey.

### Hazards a feature must respect

- **The graft.** While an archive is open its root hangs from its file
  (`root.p` is the file), so a parent's children do not contain that
  node. `isAttached`, `hostOf`, `updateWhere`, `goUp`, `stepSelection`,
  `refreshDirs`, the breadcrumbs and `absPath` (`x.zip!/inner/file`)
  know it; any new walk up the tree that reads `.p.c` must use them.
- **One lock.** `runOp` refuses any body whose `path`, `paths`, `parent`
  or `dest` lies under the archive's path, before anything is sent. The
  keys say so before a dialog asks for a name or a destination, and the
  menu and inspector show those actions unavailable, with the reason.
- **Names reach words.** Labels in the world are `aria-hidden`, so every
  name a feature shows only there (benchmark tags, the archive's floor)
  also reaches the ledger, the inspector or a sentence.
- **Shader variants.** The box material's program cache key is its
  `onBeforeCompile` source. A second material built by the same function
  must override `customProgramCacheKey`, or it shares the first shader.
- **The forced unfold.** A feature that must open a folded folder to
  fly to it calls `api.forceOpen(node)`, as going there does. The unfold
  ends when the view returns to the overview (`api.overview()`, 0) or
  the location settles off that branch; nothing else clears it.
- **Wording.** Features that read modification times say "changed",
  never "created", "added" or "arrived".

<!-- ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once! -->
