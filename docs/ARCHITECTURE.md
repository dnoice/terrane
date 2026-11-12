<!--
✒ Metadata
    - Title: Terrane Architecture (Terrane Edition - v1.0)
    - File Name: ARCHITECTURE.md
    - Relative Path: docs/ARCHITECTURE.md
    - Artifact Type: docs
    - Version: 1.0.0
    - Date: 11/09/2026
    - Update: Monday, November 9, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Fable 5.2
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

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
| Frontend | Plain ES modules, no build step | Six modules, one page; a bundler would be the largest dependency in the project | React, Vite |
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
  GET  /api/events              ->   fs.watch      SSE: folders that changed
  POST /api/op                  ->   ops.mjs       mkdir rename move copy trash open reveal
  POST /api/undo | restore | purge
  POST /api/hash                ->   SHA-1         duplicate verification
  GET  /api/stat | raw          ->   metadata, sandboxed preview bytes
           every path  ->  guard.mjs  (root-relative, lexical check, realpath check)
```

- **One mutation at a time**, through a queue. A batch is validated in
  full before its first item moves.
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

## 5. Visual identity

The brief asked for a clean break from earlier digiSpace work. The
direction is a survey sheet around a plaster world.

- **Ground**: pale mineral green-grey, light theme. No dark dashboard,
  no neon, no glass, no blur, no gradients except the two data ramps.
- **Line**: 1px ink rules, square corners. The same ink draws box edges
  in the 3D world through the fragment shader, which is what ties the
  two halves together.
- **Colour is semantic only**: highlighter yellow is selection and hover
  everywhere; vermilion is search; garnet is duplicates and destructive
  actions; verdigris is destinations and live state; nine muted pigments
  are file kinds.
- **Drawing conventions instead of icons**: hatch is sealed, hollow is
  empty, stipple is aggregate, bands are links. The same marks appear in
  the ledger swatches and the inspector key.
- **Type**: Archivo, one variable family used across its width axis
  (expanded capitals for reference labels, normal for reading, condensed
  for dense rows), with DM Mono for paths and figures.
- **Layout motifs** from drawing sheets: lettered panel references and a
  title block along the bottom edge carrying lens, legend, grain,
  altitude and status.

<!-- ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once! -->
