<!--
✒ Metadata
    - Title: Terrane Architecture (Terrane Edition - v1.2)
    - File Name: ARCHITECTURE.md
    - Relative Path: docs/ARCHITECTURE.md
    - Artifact Type: docs
    - Version: 1.2.0
    - Date: 11/12/2026
    - Update: Thursday, November 12, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
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
    them, including the mid-build change from a tabletop model to a world
    on Dennis's direction, an honest account of how far the result goes
    toward the open-world idea, and the measured performance.

✒ Key Features:
    - Stack choices and what was rejected
    - The spatial model and why it was rebuilt
    - World management: level of detail, budgets, coordinates
    - Service design and data flow
    - Datasets for development against real data
    - The visual identity
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
  it. Breadcrumbs, ledger and legend follow.
- **An environment.** Sky, horizon, altitude-scaled haze, a surveyed
  ground plane running to the horizon, and terrain the eye cannot pass
  through.

### How far this goes toward the open-world idea

| Open-world technique | Status here |
| -------------------- | ----------- |
| Camera inside the world, free movement on all axes | Done |
| Render only what is relevant to the player's position | Done: distance-driven level of detail with a 70,000-box budget |
| Multiple navigation scales | Done: scale-proportional flight, plus jumps from breadcrumbs, ledger, search and survey |
| Coordinate management | Done: floating origin. Layout is computed in 64-bit; instance positions are sent to the GPU relative to the eye, re-based at every layout. A file twelve levels down, four orders of magnitude smaller than the world, renders without jitter |
| Procedural generation | Done in the sense that matters: all geometry is generated from data at run time |
| World streaming of data | Not done. The service streams the scan, but the browser then holds the whole tree. See Roadmap stage 4 |
| Regions that are not confined to a ground plane | Partly. Elevation carries nesting, so the world has real relief, but it is a landscape, not a volume. Interiors, bridges between related regions, and vertical organisation are not attempted. See Roadmap stage 5 |

## 3. Service

```text
browser                              service (127.0.0.1)
  GET  /api/scan?path=&depth=   ->   scan.mjs      NDJSON, one record per folder
  GET  /api/events              ->   fs.watch      SSE: folders that changed, job progress
  POST /api/op                  ->   ops.mjs       mkdir rename move copy trash open reveal
  POST /api/cancel              ->   ops.mjs       stop a running or queued job
  POST /api/undo | restore | purge
  POST /api/hash                ->   SHA-1         duplicate verification
  GET  /api/stat | raw          ->   metadata, sandboxed preview bytes
  GET  /api/thumbs | thumb      ->   thumbs.mjs    image index, versioned thumbnails
           every path  ->  guard.mjs  (root-relative, lexical check, realpath check)

snapshot mode (--snapshot):  scan, stat, events  ->  snapshot.mjs  (structure database)
                             every change, open, reveal, raw  ->  refused
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
- **After a change, only the affected folders are re-read** (depth-1
  scan), reconciled into the model by name so selection survives, and
  any new child folder is deep-scanned. The watcher feeds the same path.
- **State lives in one place per kind**: the disk is the truth; the model
  is a cache of it; the layout is a function of model and eye; paint is a
  function of layout and session state. Nothing is patched in place
  across those boundaries.

## 4. Scale

| Technique | Where |
| --------- | ----- |
| Breadth-first progressive scan, bounded concurrency | `scan.mjs` |
| Incremental roll-up of size, counts, kinds, recency, height | `model.js` `ingest` |
| Layout cost proportional to boxes drawn, not tree size | `layout.js` |
| One instanced mesh, one draw call; drawing conventions in the fragment shader | `viewport.js` |
| Render on demand | `viewport.js` `invalidate` |
| Picking by direct ray and box tests on typed arrays | `viewport.js` `#cast` |
| Virtual list for folders with tens of thousands of rows | `ui.js` |

Cognitive scale is handled by the same mechanism as rendering scale: you
see at most a few thousand things, chosen by where you are. From the
overview a 400,000-file tree is about a hundred masses.

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
  caches each one once, as immutable; a SameSite=Strict cookie
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
  actions; verdigris is destinations and live state; nine muted pigments
  are file kinds. Hover is a highlighter stroke that wipes across a
  control from the left, the same yellow that marks a selection.
- **Icons name actions; conventions draw data**: Lucide line icons sit on
  tools, menu items and buttons. What the world shows keeps its drawing
  conventions: hatch is sealed, hollow is empty, stipple is aggregate,
  bands are links. The same marks appear in the ledger swatches and the
  inspector key, and no icon replaces them.
- **Type**: Archivo, one variable family used across its width axis
  (expanded capitals for reference labels, normal for reading, condensed
  for dense rows), with DM Mono for paths and figures in tabular numbers.
- **Layout motifs** from drawing sheets: lettered panel references, a
  title block along the bottom edge carrying lens, legend, grain,
  altitude and status, and instruments around the world: ruler ticks on
  two edges, registration corners, a north arrow that turns with the
  camera, and a scale stating how much storage a square of screen holds.
- **Motion explains a change and stops**: things arrive from where they
  came from, rules draw themselves, strata settle, figures count to
  their new value, indicators slide to the chosen item. Only instruments
  showing live work loop (the status lamp, a running copy). Under
  `prefers-reduced-motion` every animation resolves to its end state.
- **Stylesheet structure**: `web/css/terrane.css` declares the layers
  `tokens, fonts, base, layout, components, utilities, motion, print`
  and imports one module into each. Components read semantic roles from
  `tokens.css`, never raw colours; utilities outrank components by
  layer, not by `!important`. The print sheet lays the last drawn frame
  of the world beside the inspector.

<!-- ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once! -->
