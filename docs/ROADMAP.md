<!--
✒ Metadata
    - Title: Terrane Roadmap (Terrane Edition - v1.2)
    - File Name: ROADMAP.md
    - Relative Path: docs/ROADMAP.md
    - Artifact Type: docs
    - Version: 1.2.0
    - Date: 11/13/2026
    - Update: Friday, November 13, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 1.2.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] — Stage
      5 is under way: its first increment (archive interiors, working
      sessions as a traverse, the date scrub, strata, benchmarks and the
      return point) is recorded as delivered, with what each deferred
      and the question each answers. Requirement 1 covers archive
      entries as the archive's directory lists them; the out-of-scope
      table says an archive is looked at, never mounted; the
      exploration loop names what now serves each step.
    - 1.1.0 (11/11/2026) [dendogg + Anthropic - Claude Opus 5.5] —
      Requirements 14 and 15 are met. Stage 6 records progress,
      cancellation and the persistent journal as done. Adds development
      datasets: structure snapshots and thumbnails.
    - 1.0.0 (11/09/2026) [dendogg + Anthropic - Claude Fable 5.2] —
      Initial release.

✒ Description:
    The plan behind Terrane: the exploration loop the world is designed
    around, the minimum viable filesystem scope, the practical filesystem
    interaction requirements, a staged implementation roadmap that marks
    what is built and what is next, and the datasets that let development
    run against real data without touching it.

✒ Key Features:
    - Exploration loop with the system that serves each step
    - Minimum filesystem scope: in, out, and why
    - Interaction requirements written as checkable statements
    - Six stages, each with an exit test; stages 1 to 3 are complete,
      and stages 5 and 6 are under way
    - Stage 5's first increment: what was delivered, what was deferred,
      and the question each feature answers
    - Development datasets: how to build against real data safely

✒ Other Important Information:
    - Dependencies: none
    - Compatible platforms: not applicable
---------
-->

# Roadmap

## 1. The exploration loop

One pass through the loop, and what serves each step today.

| Step | The visitor | Served by |
| ---- | ----------- | --------- |
| 1. Arrive | Sees the whole directory from above as a hundred or so masses: where the bytes are, what kind they are | Overview vantage; area is bytes; masses tinted by dominant kind; heavyweight pins |
| 2. Notice | Something stands out: a large mass, a tall fresh block, a pin, a colour | Lenses (kind, age, size, duplicates), with closed masses at their typical age under the Age lens; survey tab, working sessions included; search pins; benchmark tags that say what changed; the time view, where what changed since a date lies flat |
| 3. Approach | Flies toward it. It opens as it gets close | Wheel flies to the cursor; distance-driven unfolding; contents rise out of the plateau |
| 4. Orient | Knows where they are without thinking about it | Breadcrumbs and ledger follow the camera; tags on nearby plateaus; benchmarks as survey marks; horizon and haze |
| 5. Inspect | Selects a thing and reads it | Inspector: path, size and shares, dates, composition, bytes by last change, what changed since a benchmark or a date, preview, duplicates; an archive's contents with I |
| 6. Act | Opens, renames, moves, removes | Context menu, keys, placing mode, drag and drop; every result stated in words |
| 7. Confirm | Sees the world change to match the disk | Affected folders re-read; boxes move or rise; Undo offered in the notice |
| 8. Leave | Goes up, back, or jumps somewhere else | Backspace, Alt+Left, 0, J to a marked return point, breadcrumbs, search results, survey entries |

The loop has two speeds. On foot (W A S D at eye level) it is browsing. By
jump (search, survey, breadcrumbs) it is retrieval. Both end in the same
inspector and the same operations.

## 2. Minimum viable filesystem scope

The smallest scope at which Terrane is a tool and not a demonstration.

### In scope (all built)

| Area | Minimum |
| ---- | ------- |
| Authorization | Exactly one directory, named on the command line. No default. No way to widen it from the interface |
| Read | Names, sizes, modification times, entry type for every level; creation time and link target on demand |
| Entry types | Regular files, folders, symbolic links (reported, never followed), special files (reported) |
| Conditions | Unreadable folders, empty folders, hidden (dot) names, zero-byte files, unusual and very long names |
| Non-mutating actions | Open with the system default, reveal in the system file manager, copy absolute path, preview text and images |
| Mutating actions | Create folder, rename, move, copy, remove to holding area, restore |
| Guarantees | No overwrite. No direct delete. Every mutation has an inverse and can be undone. A refused batch changes nothing |
| Change awareness | Outside changes appear without a rescan, or a clear manual refresh where watching is unavailable |
| Read-only mode | One flag that makes every mutation impossible |

### Out of scope for the minimum, deliberately

| Not included | Why |
| ------------ | --- |
| Permanent delete of live files | Purging the holding area is the only permanent deletion. One irreversible path is enough |
| Editing file contents | A different product |
| Permissions, ownership, attributes | Platform-specific and rarely the question a storage explorer answers |
| Following symbolic links, mounting archives | Each breaks "area is bytes inside this directory" and invites cycles. Stage 5 lets a zip archive's directory be looked at, read-only, as a walled floor; it is never mounted, nothing in it counts toward the tree's totals, and nothing in it can be changed |
| Multiple roots, network authentication, cloud APIs | The single-root boundary is the safety model. A mounted share already works as a directory |
| Batch rename, sync, compression | Useful, not minimal |

## 3. Practical filesystem interaction requirements

Written so each can be checked. All fifteen are met by the current build.

1. Every item drawn in the world corresponds to exactly one real entry,
   or to one entry of an open archive as the archive's directory lists
   them, or is an aggregate that states its count and total size. The
   four walls around an open archive stand for its file.
2. Any item can be identified by pointing at it: name, size, kind and age
   within one hover.
3. Any item that search or the survey names can be reached in one action,
   at any depth, including items currently folded into a mass or scree.
4. Every operation is available from at least two routes, one of which
   does not need the 3D view or a pointer.
5. A destination can be chosen in the world (click a plateau), by travel
   (go there, place here), or by drag and drop.
6. An action that cannot be performed is not offered as if it could be:
   unavailable controls are inert and say why.
7. Every operation ends in a sentence: what happened, or why it did not.
8. A visual change never precedes the disk. The world updates from a
   re-read of the affected folders, not from an assumption that the
   operation succeeded.
9. Nothing is overwritten. A collision stops the batch before it starts
   and offers Keep both.
10. Nothing is deleted without passing through the holding area, and the
    one permanent action says it is permanent before it runs.
11. Undo reverses the latest change exactly, or refuses and says what on
    disk now prevents it.
12. The user can always tell where they are (breadcrumbs follow the
    camera) and can always get out (Backspace, 0, Escape).
13. Selection survives a refresh of the folder it is in.
14. Operations longer than a moment show progress (bytes, rate, time
    left, current item) and can be cancelled. A cancelled copy removes
    only its own partial output, and what finished before the cancel can
    be undone.
15. The undo journal survives a restart of the service. It is kept in
    `.terrane-trash/journal.json`, and its paths pass through the guard
    again on undo.

## 4. Staged implementation

### Stage 1. Trustworthy service. Complete

Path guard, progressive scan, operations with journal and holding area,
watcher, hashing, loopback and token security.

Exit test: `npm test` passes 28 checks, including a full undo chain that
returns a directory to a content-hash-identical state.

### Stage 2. One coherent interface. Complete

Design system, ledger with four views, inspector, breadcrumbs, search
grammar, lenses, context menu, dialogs, notices, placing mode, drag and
drop, keyboard coverage, live region.

Exit test: every operation driven through the interface in a headless
browser and confirmed on disk.

### Stage 3. A world, not a model. Complete

Continuous world coordinates, self-similar scale, distance-driven
unfolding with hysteresis, free camera with scale-proportional travel,
terrain collision, floating origin, altitude-scaled haze and shadows,
location derived from the camera.

Exit test: fly from the overview to a file twelve levels down in a
400,000-file tree, with stable geometry and correct location at each end.

### Stage 4. Streaming the data, not only the geometry

The browser currently holds the whole tree. For trees in the millions:

- The service keeps the tree and serves regions: children of a folder,
  with aggregates, on request.
- The browser requests regions as the eye approaches and drops them as
  it leaves, the same way it already does for geometry.
- Search, survey and duplicate grouping move to the service.
- A cache of the last scan on disk, validated by folder modification
  times, so a second launch is immediate.
- Layout in a worker.

Exit test: five million entries with browser memory under 300 MB and no
frame over 16 ms from script.

### Stage 5. Beyond the ground plane. Under way

The honest gap against the open-world idea. Candidates, in order of how
much information each adds:

- **Interiors.** Entering a large file kind-appropriately: an archive's
  contents as a chamber, an image at wall scale, a text file as a
  readable surface.
- **Relations across the tree.** Duplicate ties are the first. Next:
  same-name siblings, symbolic links drawn as bridges to their targets,
  files modified in the same session as a path through the world.
- **Time as a dimension.** Scrub the world backward: blocks sink as you
  go past their modification date, so growth is visible.
- **Vertical organisation.** Use the space above a plateau for what is
  about it and not in it: its history, its largest descendants.
- **Landmarks and memory.** Named places, a trail of where you have
  been, a return-to-here marker.

Exit test for each: it answers a question about the directory that the
ledger alone cannot.

Groundwork landed on 11/12/2026: a box budget checked before every box,
uploads by range, one relation-line layer for named sets, the
registries feature modules fill, a fixed key allocation, the shared age
table and the headless interface check. The first increment of every
candidate followed by 11/13/2026, each in its own module:

| Candidate | Delivered | Deferred |
| --------- | --------- | -------- |
| Interiors | A zip archive (and the formats built on zip: jar, war, ear, apk, aab, whl, xpi, nupkg, vsix, ipa) looked inside with I, as a walled floor on its file's footprint. The service lists its directory without unpacking it (`GET /api/inside`), bounded and with locked and escaping names flagged; nothing inside can be changed; entries already in the directory by name and size are half-banded and tied as twins | tar and its compressed forms; CRC-32 verification; search inside an interior; more than one archive open at once; the age table and typical ages for an archive's folders; an image at wall scale; a text file as a readable surface |
| Relations across the tree | Duplicate ties and archive twins as named sets in one line layer. Working sessions (files changed within 30 minutes of one another) as a search, `session:N`, a Survey section, and a route drawn through the world: the traverse | Stop-stepping keys; a gap selector; a way to include folders whose names start with a dot; "Changed with it" in the inspector and the context menu; folders as stops of their own; same-name siblings; symbolic links as bridges to their targets |
| Time as a dimension | The date scrub: T , . < > and the As of stepper look back along a ladder of dates; what changed after the date lies flat and crossed, closed masses sink to the share they kept, and the inspector says what changed since and where | Scree taking part; replay; calendar-aligned steps; an "as it looked then" height mode; creation dates |
| Vertical organisation | Strata, without using the space above: the inspector's Bytes by last change in six strata, and closed masses coloured by their typical age under the Age lens | Staffs above the plateaus; leaders to the largest descendants; an "Untouched" Contents sort |
| Landmarks and memory | Benchmarks: B measures a folder, a verdigris survey mark and its tag stand on it, and the Places tab says what changed since, including what left it. One return point: H marks where you stand, J flies back and swaps the two | Export and import of places, first; a trail of where you have been, under a name and a drawing convention other than the traverse's; coverage; search over benchmarks beyond `is:benchmark` |

What each answers that the ledger alone cannot:

- **Interiors**: what an archive holds, and which of its files are
  already in this directory, without unpacking it.
- **Session traverse**: which files changed together, across folders,
  and in what order.
- **Time**: what changed in this place since a date, and where the
  change is.
- **Strata**: how much of a folder's bytes have lain untouched, and for
  how long.
- **Landmarks**: what changed in a folder since it was measured,
  including what left it.

Places are kept in this browser for this directory at this address, and
a snapshot's apart from the live directory's, so export and import come
before the next landmark feature.

### Stage 6. Operations at scale. Under way

Done on 11/11/2026:

- Progress and cancellation for copies, moves and removals, with cleanup
  of the partial item and undo of the finished ones.
- A journal that persists across restarts.

Next:

- Batch rename with preview.
- Send to the operating system's recycle bin as an alternative holding
  area.
- A packaged desktop build (single executable, no terminal) once the
  service interface has settled.
- Windows hidden attribute, allocated sizes, hard-link detection.

Exit test: move 50 GB between folders with a live progress figure, cancel
halfway, and undo to the starting state. Within one volume a move is a
rename and finishes at once; the test applies to a copy, or a move onto
another volume. `npm test` runs the same sequence on a 24 MB copy slowed
to take a second.

## 5. Development datasets

Building Terrane against a real directory without risk to it.

| Dataset | Made by | Holds | Used by |
| ------- | ------- | ----- | ------- |
| Structure snapshot | `npm run snapshot -- <dir>` | Every folder and file: name, size, dates, type. No contents | `terrane --snapshot`, which touches no real file |
| Thumbnails | `npm run thumbs` | Per image: average colour, 4×4 colour grid, 160 and 480 px WebP, or the source of a light SVG | `/api/thumbs`, `/api/thumb`, in both modes |

`npm run dev` ties them together: it refreshes a stale snapshot, starts the
service in snapshot mode, keeps thumbnails current in the background, and
re-snapshots every hour while it runs. Both datasets live in
`%LOCALAPPDATA%\terrane\datasets\<name>`, outside the project and outside
OneDrive, because they hold real file names and run to hundreds of
megabytes. A snapshot holds names, sizes and dates, not what a file
contains, so in snapshot mode an archive cannot be looked inside.

The rules the image work follows, set by the shape of the real data
(19,181 images, 35.7 GB, a largest file of 443 MB):

- The browser never requests an original image. The inspector and the
  hover tip use thumbnails; the tip waits for the pointer to rest.
- Thumbnail URLs carry the image's version and no token, so each is
  cached once, as immutable, across reloads and restarts.
- The builder is incremental: an image is read again only when its size
  or date changes. It goes cheapest first, skips OneDrive cloud-only
  files, holds images over 80 megapixels for an explicit `--huge` pass,
  and renders heavy SVGs through Inkscape only with `--heavy-svg`.
- A heavy SVG borrows the thumbnail of its own raster export only when
  the export sits within two folders of it. A same-named file further
  away is a different artwork, such as a generated frame around a photo.

<!-- ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once! -->
