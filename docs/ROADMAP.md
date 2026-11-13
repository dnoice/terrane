<!--
✒ Metadata
    - Title: Terrane Roadmap (Terrane Edition - v1.4)
    - File Name: ROADMAP.md
    - Relative Path: docs/ROADMAP.md
    - Artifact Type: docs
    - Version: 1.4.0
    - Date: 11/13/2026
    - Update: Friday, November 13, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 1.4.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] — The
      Audit, the Hardening pass, Enhancement and polish and the Sanity
      sweeps are recorded as complete, each with its commits and its
      check lines, the final ones from the last sweep, and as merged
      into `main` as Terrane 1.3.0. The GitHub Pages entry gives its
      address. The load screen is what comes next. Wave 2 names its
      merge commit.
    - 1.3.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] — Stage
      5 is under way: its first increment (archive interiors, working
      sessions as a traverse, the date scrub, strata, benchmarks and the
      return point) is recorded as delivered, with the wave that built
      it, what each deferred and the question each answers. Requirement
      1 covers archive entries as the archive's directory lists them;
      the out-of-scope table says an archive is looked at, never
      mounted; the exploration loop names what now serves each step.
      With Wave 2 merged, the build waves move it and the Docs pass to
      complete, and the Audit through the Sanity sweeps to under way.
    - 1.2.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] —
      Adds where things stand and the build waves: what is complete
      (Wave 0, the 1.2.0 interface, the load screen's first cut, Wave 1,
      the first hardening fixes, the GitHub Pages entry), what is under
      way (Wave 2), and what comes next, in order, through to the load
      screen. Stage 5 is under way, with each candidate's status, wave
      and deferred work. The exploration loop names the Wave 1 features
      that now serve it.
    - 1.1.0 (11/11/2026) [dendogg + Anthropic - Claude Opus 5.5] —
      Requirements 14 and 15 are met. Stage 6 records progress,
      cancellation and the persistent journal as done. Adds development
      datasets: structure snapshots and thumbnails.
    - 1.0.0 (11/09/2026) [dendogg + Anthropic - Claude Fable 5.2] —
      Initial release.

✒ Description:
    The plan behind Terrane: the exploration loop the world is designed
    around, the minimum viable filesystem scope, the practical filesystem
    interaction requirements, a staged implementation roadmap, the build
    waves that carry it out (what is complete on `main` and what comes
    next), and the datasets that let development run against real data
    without touching it.

✒ Key Features:
    - Where things stand, dated, in three lines
    - Exploration loop with the system that serves each step
    - Minimum filesystem scope: in, out, and why
    - Interaction requirements written as checkable statements
    - Six stages, each with an exit test; stages 1 to 3 are complete,
      and stages 5 and 6 are under way
    - Stage 5's first increment: what was delivered, by which wave,
      what was deferred, and the question each feature answers
    - Build waves: complete on `main` and next, with commits and checks
    - Development datasets: how to build against real data safely

✒ Other Important Information:
    - Dependencies: none
    - Compatible platforms: not applicable
---------
-->

# Roadmap

## Where things stand

As of 11/13/2026:

- **Complete, on `main`:** Stages 1 to 3, Wave 0 (the Stage 5
  groundwork), the 1.2.0 interface, the load screen's first cut, Wave 1
  (Time, Landmarks and the service half of Interiors), the first
  hardening fixes, the GitHub Pages entry, Wave 2 (Session traverse,
  Strata and the client half of Interiors), the Docs pass for both
  waves, and the Audit, Hardening pass, Enhancement and polish and Sanity
  sweeps, merged as Terrane 1.3.0. Every Stage 5 candidate now has its
  first increment.
- **Next:** the load screen.

Section 5 has the detail for every wave.

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
| 8. Leave | Goes up, back, or jumps somewhere else | Backspace, Alt+Left, 0, J to a marked return point, Fly there in the Places tab, breadcrumbs, search results, survey entries |

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

Written so each can be checked. All fifteen are met by the build on
`main`.

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
table and the headless interface check (Wave 0). The first increment of
every candidate followed by 11/13/2026, each in its own module, in
Waves 1 and 2 (section 5):

| Candidate | Wave | Delivered | Deferred |
| --------- | ---- | --------- | -------- |
| Interiors | 1 (service), 2 (world) | A zip archive (and the formats built on zip: jar, war, ear, apk, aab, whl, xpi, nupkg, vsix, ipa) looked inside with I, as a walled floor on its file's footprint. The service lists its directory without unpacking it (`GET /api/inside`), bounded and with locked and escaping names flagged; nothing inside can be changed; entries already in the directory by name and size are half-banded and tied as twins | tar and its compressed forms; CRC-32 verification; search inside an interior; more than one archive open at once; the age table and typical ages for an archive's folders; an image at wall scale; a text file as a readable surface |
| Relations across the tree | 0 (line layer), 2 (traverse) | Duplicate ties and archive twins as named sets in one line layer. Working sessions (files changed within 30 minutes of one another) as a search, `session:N`, a Survey section, and a route drawn through the world: the traverse | Stop-stepping keys; a gap selector; a way to include folders whose names start with a dot; "Changed with it" in the inspector and the context menu; folders as stops of their own; same-name siblings; symbolic links as bridges to their targets |
| Time as a dimension | 1 | The date scrub: T , . < > and the As of stepper look back along a ladder of dates; what changed after the date lies flat and crossed, closed masses sink to the share they kept, and the inspector says what changed since and where | Scree taking part; replay; calendar-aligned steps; an "as it looked then" height mode; creation dates |
| Vertical organisation | 2 | Strata, without using the space above: the inspector's Bytes by last change in six strata, and closed masses coloured by their typical age under the Age lens | Staffs above the plateaus; leaders to the largest descendants; an "Untouched" Contents sort |
| Landmarks and memory | 1 | Benchmarks: B measures a folder, a verdigris survey mark and its tag stand on it, and the Places tab says what changed since, including what left it. One return point: H marks where you stand, J flies back and swaps the two | Export and import of places, first; a trail of where you have been, under a name and a drawing convention other than the traverse's; coverage; search over benchmarks beyond `is:benchmark` |

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

## 5. Build waves

Stage 5 is built in waves. Each wave runs on its own branch (`wave-1`,
`wave-2`) in a separate worktree: its build steps one after another, then
an adversarial review, a fix step, and a docs and header pass. A wave is
merged into `main` and pushed only when `npm test`,
`node tools/vendor.mjs --check` and the full `node tools/ui-check.mjs`
pass, with and without WebGL, on the default fixture. The one accepted
failure is the load screen's reload check, which times out once per pass
and is parked for the load-screen work at the end.

The plan had five waves: Wave 0 for the groundwork, Waves 1 to 3 for the
features and Wave 4 for the docs. In practice the client half of
Interiors (planned as Wave 3) and the docs (planned as Wave 4) ran as the
last steps of Wave 2.

### Complete

- **Wave 0: groundwork (G1 to G7).** 11/12/2026, `d5434d3`. The seams
  every Stage 5 feature plugs into:
  - a hard 70,000-box layout budget, so no layout overruns the instance
    buffers;
  - GPU uploads limited to the drawn range, and shadows redrawn at most
    every fourth frame while boxes travel;
  - one relation-line layer of named sets, with the duplicate ties as
    its first set;
  - the controller's registries (keys, Escape, pins, hover lines,
    inspector sections, Reading rows, tabs, and the layout, refresh and
    survey hooks), which each feature fills from its own module;
  - the no-WebGL route: Contents can go into folders and stay there;
  - the shared age table (`web/js/timeline.js`), rebuilt with every
    survey;
  - `tools/ui-check.mjs`, the headless browser check: keyboard only,
    with and without WebGL, with a draw-call baseline.
- **Terrane 1.2.0 interface.** 11/12/2026, `4b6eee2`. The layered design
  system and its tokens, icons, the survey instruments over the world,
  motion, and the vendoring tool that pins every third-party file by its
  SHA-256 digest.
- **Load screen, first cut.** 11/12/2026, `9d8e2af`. The loading sheet:
  the T mark, the TERRANE wordmark and T-madness.
- **Wave 1.** Merged 11/13/2026, `0d76f60`:
  - Time as a dimension (`0496959`): the date scrub described under
    Stage 5;
  - Landmarks (`2248ead`): benchmarks, the return point and the Places
    tab, kept per browser, address and source;
  - Interiors, service half (`3cbd222`): `GET /api/inside` lists a zip
    archive's directory within fixed bounds, flags locked entries and
    names that would escape the archive, and is refused in snapshot mode;
  - the review fixes (`b707c33`).

  After the merge, and one fix to the browser check so it waits for the
  load screen after a reload, every check passed apart from the load
  screen's reload check.
- **First hardening fixes.** 11/13/2026, `5f45117`. Interface files are
  revalidated by a weak ETag instead of downloaded again on every use,
  while the page, which holds the session token, is never stored.
  Malformed static paths are a 404. `/api/raw` and `/api/inside` work
  when the root is a whole drive such as `C:\`. Smoke test: 154 passed.
- **GitHub Pages entry.** 11/13/2026. The root `index.html` forwards
  visitors to `web/`, and `.nojekyll` publishes the repository as it is.
  Pages can show the interface but not run it, because the page needs the
  local service. Published at <https://dnoice.github.io/terrane/> since
  11/13/2026; since Terrane 1.3.0 the page there says that Terrane runs
  from its local service and how to start it.

- **Wave 2.** Merged 11/13/2026, `461651c`:
  - Session traverse (`fdf6f05`): working sessions, groups of files
    changed close together in time, listed in the Survey tab.
    `session:N` finds a session's files, and its route is drawn through
    the world as a traverse;
  - Strata (`5cbb225`): the inspector's Bytes by last change, in six
    bands from under a day to over three years. Under the Age lens, a
    closed mass is coloured by its typical age instead of its newest
    change;
  - Interiors, client half (`d532863`): `I` opens a zip-family archive
    (zip, jar, war, ear, apk, aab, whl, xpi, nupkg, vsix, ipa) as a
    walled floor in the world, read from the archive's directory without
    unpacking it;
  - the review fixes (`43c7239`): J inside an open archive saves the
    folder that holds the archive as its return point, an archive's twins
    are worked out again after every refresh, and inside an archive a
    closed mass keeps its newest-change colour, which the legend and the
    hover tip say;
  - Docs (`9376405`), the planned Wave 4: README, ARCHITECTURE, this
    roadmap, `CHANGELOG.md` and every header Waves 1 and 2 touched,
    checked against the code.

  The merge passed every check apart from the load screen's reload
  check.

### Complete: the Audit to the Sanity sweeps

Steps 1 to 4 ran as one workflow on their own branch, `finish`, made
from `main` at the Wave 2 merge (`461651c`), and were merged into `main`
on 11/13/2026 as Terrane 1.3.0, in the commit titled "Merge finish:
Audit, Hardening pass, Enhancement and polish, Sanity sweeps". The merge
passed every check apart from the load screen's reload check.

1. **Audit.** Five read-only auditors, one lens each: security,
   correctness, accessibility (the keyboard and no-WebGL routes),
   performance, and whether the docs and comments are true of the code.
   A finding was kept only once it was confirmed. The Audit changed no
   file, so it has no commit of its own; its confirmed findings are what
   the Hardening pass fixed.
2. **Hardening pass.** Every confirmed finding fixed, each with a check
   that would have caught it, plus the two known items:
   - a page not served by the service (opened from disk, from another
     server or from GitHub Pages) says that Terrane runs from its local
     service and how to start it, instead of "The service answered 404.";
   - the forced unfold that J leaves behind ends when the view returns to
     the overview.

   Commits: the service (`0ce2225`: the holding area by any name, its
   index read as untrusted data, links followed only to an end inside
   the root, the scan stream and the thumbnail cookie); the page
   (`913c753`: refresh, Rescan all, the forced unfold, focus, contrast,
   the narrow inspector drawer, the single-key setting and the unserved
   page); the docs and dead code (`3881804`); and the checks that
   followed (`2881ff8`). Checks: `npm test` 392 passed (181, 77, 45, 33
   and 56), none failed; `node tools/ui-check.mjs` 867 passed and 5
   skipped, with the `splash` reload step failing once in each pass; the
   draw-call baseline recorded again once the empty relation layer
   stopped drawing (overview 6, selected 8, search 7, duplicate ties 9).
3. **Enhancement and polish** (`e152119`). Polish of the interface,
   judged from screenshots at two widths: the instruments over the world
   on two rows, so notices and operations in progress no longer cover
   the view tools or the storage scale; world labels measured as drawn;
   empty states that say so, and counts such as "1 item"; a narrow
   ledger's tabs, captions and sort keys; focus rings kept inside the
   panel edges; the menu fading out and the narrow drawer sliding; type
   sizes on the scale; and the print sheet. Checks: `npm test` 392 passed;
   `node tools/vendor.mjs --check` clean; `node tools/ui-check.mjs` 867
   passed, 5 skipped and 2 failed, the known `splash` reload step once
   per pass.
4. **Sanity sweeps.** Every check, every header and every claim in the
   docs, once more, in the commit titled "Sanity sweep": the docs now
   describe the interface files' revalidation, containment at a drive
   root and the page the service did not serve. Final check lines, on
   Windows 11 with Edge 157 on an RTX 5050 laptop GPU and the default
   fixture of 3,126 files:
   - `node --check` on all 57 script files outside `web/vendor/`: no
     error;
   - `npm test`: "181 passed, 0 failed", "77 passed, 0 failed",
     "45 passed, 0 failed", "33 passed, 0 failed" and
     "56 passed, 0 failed", 392 in all;
   - `node tools/vendor.mjs --check`:
     "Every vendored file matches the manifest.";
   - `node tools/ui-check.mjs --no-shots`, both passes:
     "867 passed, 2 failed, 5 skipped". The two failures are the known
     `splash` reload step, once per pass ("Timed out after 20000 ms
     waiting for the loading sheet after a reload"); draw calls at the
     baseline (overview 6, selected 8, search 7, duplicate ties 9).

### Next

**Load screen.** Sort out the loading sheet, including the reload check
that times out once per pass.

No wave is planned past the load screen yet. The open ground is Stage 4,
the rest of Stage 6, and the Stage 5 deferrals in section 4.

## 6. Development datasets

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
