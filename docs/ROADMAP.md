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
    waves that carry it out (what is complete, what is under way and what
    comes next), and the datasets that let development run against real
    data without touching it.

✒ Key Features:
    - Where things stand, dated, in three lines
    - Exploration loop with the system that serves each step
    - Minimum filesystem scope: in, out, and why
    - Interaction requirements written as checkable statements
    - Six stages, each with an exit test; stages 1 to 3 are complete and
      stages 5 and 6 are under way
    - Stage 5's candidates with their status, wave and deferred work
    - Build waves: complete, under way and next, with commits and checks
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
  hardening fixes and the GitHub Pages entry.
- **Under way:** Wave 2 (Session traverse, Strata and the client half of
  Interiors), now in its fix step. Stage 6.
- **Next, in order:** Docs, the Wave 2 merge, Audit, Hardening pass,
  Enhancement and polish, Sanity sweeps, then the load screen.

Section 5 has the detail for every wave.

## 1. The exploration loop

One pass through the loop, and what serves each step today.

| Step | The visitor | Served by |
| ---- | ----------- | --------- |
| 1. Arrive | Sees the whole directory from above as a hundred or so masses: where the bytes are, what kind they are | Overview vantage; area is bytes; masses tinted by dominant kind; heavyweight pins |
| 2. Notice | Something stands out: a large mass, a tall fresh block, a pin, a colour | Lenses (kind, age, size, duplicates); survey tab; search pins; the time scrub (T), which draws what changed since a date crossed |
| 3. Approach | Flies toward it. It opens as it gets close | Wheel flies to the cursor; distance-driven unfolding; contents rise out of the plateau |
| 4. Orient | Knows where they are without thinking about it | Breadcrumbs and ledger follow the camera; tags on nearby plateaus; horizon and haze |
| 5. Inspect | Selects a thing and reads it | Inspector: path, size and shares, dates, composition, preview, duplicates, what changed since a date, what changed since a benchmark |
| 6. Act | Opens, renames, moves, removes | Context menu, keys, placing mode, drag and drop; every result stated in words |
| 7. Confirm | Sees the world change to match the disk | Affected folders re-read; boxes move or rise; Undo offered in the notice |
| 8. Leave | Goes up, back, or jumps somewhere else | Backspace, Alt+Left, 0, breadcrumbs, search results, survey entries, the return point (H marks it, J returns), the Places tab |

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
| Following symbolic links, mounting archives | Each breaks "area is bytes inside this directory" and invites cycles |
| Multiple roots, network authentication, cloud APIs | The single-root boundary is the safety model. A mounted share already works as a directory |
| Batch rename, sync, compression | Useful, not minimal |

## 3. Practical filesystem interaction requirements

Written so each can be checked. All fifteen are met by the build on
`main`. Wave 2 amends the first when it merges (section 5).

1. Every item drawn in the world corresponds to exactly one real entry,
   or is an aggregate that states its count and total size.
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

The honest gap against the open-world idea. Stage 5 is built in waves
(section 5), on the groundwork Wave 0 laid. The five candidates, in order
of how much information each adds:

| Candidate | The idea | Built so far | Status | Deferred |
| --------- | -------- | ------------ | ------ | -------- |
| Interiors | Entering a large file kind-appropriately: an archive's contents as a chamber, an image at wall scale, a text file as a readable surface | Archive chambers. The service lists a zip archive's directory through `GET /api/inside` (Wave 1); `I` opens a zip-family archive as a walled floor in the world (Wave 2) | Service half complete; client half in Wave 2 | tar and tgz, CRC-32 verification, search inside an archive; images at wall scale; text as a readable surface |
| Relations across the tree | Duplicate ties are the first. Next: same-name siblings, symbolic links drawn as bridges to their targets, files modified in the same session as a path through the world | One relation-line layer of named sets, with the duplicate ties as its first set (Wave 0); working sessions as a search (`session:N`) and a traverse drawn through the world (Wave 2) | Session traverse in Wave 2 | Stop-stepping keys, a gap selector, a way to include dot-folders, "Changed with it"; same-name siblings; link bridges |
| Time as a dimension | Scrub the world backward: blocks sink as you go past their modification date, so growth is visible | The date scrub (T , . < >): files changed since the date are drawn crossed, closed masses sink by what they kept; the As of stepper; the inspector's Since section (Wave 1) | Complete | Scree participation, replay, calendar-aligned steps, an "as it looked then" height mode, creation dates |
| Vertical organisation | Use the space above a plateau for what is about it and not in it: its history, its largest descendants | Strata: the inspector's Bytes by last change; under the Age lens a closed mass takes its typical age, not its newest change (Wave 2) | In Wave 2, without the 3D part | The staffs above a plateau, leaders to the largest descendant, an Untouched sort in Contents |
| Landmarks and memory | Named places, a trail of where you have been, a return-to-here marker | Benchmarks (B), which say later what changed in a folder, including what left it; the return point (H, J); the Places tab (Wave 1) | First increment complete | Export and Import (first in the next increment), the station trail, coverage |

Exit test for each: it answers a question about the directory that the
ledger alone cannot.

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
Interiors (planned as Wave 3) and the docs (planned as Wave 4) run as the
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
  local service.

### Under way

**Wave 2** (branch `wave-2`). Its three build steps are committed:

- Session traverse (`fdf6f05`): working sessions, groups of files changed
  close together in time, listed in the Survey tab. `session:N` finds a
  session's files, and its route is drawn through the world as a
  traverse.
- Strata (`5cbb225`): the inspector's Bytes by last change, in six bands
  from under a day to over three years. Under the Age lens, a closed mass
  is coloured by its typical age instead of its newest change.
- Interiors, client half (`d532863`): `I` opens a zip-family archive
  (zip, jar, war, ear, apk, aab, whl, xpi, nupkg, vsix, ipa) as a walled
  floor in the world, read from the archive's directory without
  unpacking it.

The review ran the full browser check: 769 passed, and the 2 failures
are the load screen's reload check, once per pass. It found three things,
which the fix step is working on now:

- Medium: J does not yet handle an open archive the way H does, so the
  return point it saves can point inside the archive.
- Low: if a refresh removes a twin of an archive entry, the open archive
  still shows that entry as a twin.
- Low: inside an open archive, the Age legend's "typical age" does not
  hold, because the age table covers only the tree on disk.

When Wave 2 merges, requirement 1 is amended to cover archive entries as
the archive's directory lists them.

### Next, in order

1. **Docs.** Wave 2's last step: README, ARCHITECTURE, this roadmap,
   `CHANGELOG.md` and every header Waves 1 and 2 touched, checked against
   the code.
2. **Wave 2 merge.** Into `main`, with every check run again, then
   pushed.
3. **Audit.** Five read-only auditors, one lens each: security,
   correctness, accessibility (the keyboard and no-WebGL routes),
   performance, and whether the docs and comments are true of the code.
   A finding is kept only once it is confirmed.
4. **Hardening pass.** Every confirmed finding fixed, each with a check
   that would have caught it, plus two known items:
   - a page not served by the service (opened from disk, from another
     server or from GitHub Pages) says that Terrane runs from its local
     service and how to start it, instead of "The service answered 404.";
   - the forced unfold that J leaves behind ends when the view returns to
     the overview.
5. **Enhancement and polish.** Polish of the interface, with no change
   in behaviour, judged from screenshots.
6. **Sanity sweeps.** Every check, every header and every claim in the
   docs, once more.
7. **Load screen.** Sort out the loading sheet, including the reload
   check that times out once per pass.

Steps 3 to 6 run as one workflow on their own branch (`finish`), which is
merged and pushed like a wave.

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
megabytes.

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
