<!--
✒ Metadata
    - Title: Terrane Roadmap (Terrane Edition - v1.9)
    - File Name: ROADMAP.md
    - Relative Path: docs/ROADMAP.md
    - Artifact Type: docs
    - Version: 1.9.0
    - Date: 11/13/2026
    - Update: Friday, November 13, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 1.9.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] — Build
      waves record the blocks' new look, merged into `main`; where things
      stand says so.
    - 1.8.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] — Build
      waves record the demo world, merged into `main`: the page runs on a
      generated studio drive where no service served it. Where things
      stand says so.
    - 1.7.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] — Wave
      3 is merged into `main` as Terrane 1.4.0: where things stand,
      the requirements, the stages and section 5 say so.
    - 1.6.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] — Wave
      3, quality of life, is recorded as complete on branch `qol`, with
      its commits and final check lines, waiting to be merged into
      `main`; where things stand gains that line, and Next is the
      merge. The original plan's Waves 3 and 4 ran inside Wave 2, so
      this is the first wave numbered 3 to run on its own. The Stage 4
      cache, the Stage 6 batch rename, and the Stage 5 deferrals Changed
      with it, the Untouched sort and export and import of places move
      to done where they are; the exploration loop, requirement 11, the
      out-of-scope table and the datasets name what Wave 3 added.
    - 1.5.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] — The
      load screen is complete: its reload check timed out because,
      with reduced motion, the sheet left before the first look, and
      the check now reads a record the page keeps from its first
      frame. No wave is planned next; the open ground is named.
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
    waves that carry it out (what is complete on `main`, what is
    complete on a branch and waits to be merged, and what comes next),
    and the datasets that let development run against real data
    without touching it.

✒ Key Features:
    - Where things stand, dated, in three lines
    - Exploration loop with the system that serves each step
    - Minimum filesystem scope: in, out, and why
    - Interaction requirements written as checkable statements
    - Six stages, each with an exit test; stages 1 to 3 are complete,
      and stages 4 to 6 are under way
    - Stage 5's first increment: what was delivered, by which wave,
      what was deferred, and the question each feature answers
    - Build waves: complete on `main` and next, with commits and
      checks
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
  sweeps, merged as Terrane 1.3.0, and the load screen, whose reload
  check now passes. Every Stage 5 candidate now has its first increment.
- **Complete, on `main` as Terrane 1.4.0:** Wave 3, quality of life: finding your
  way (the command palette, the remembered view and links, search
  history, saved searches and `in:`), looking before you act (Quick
  look, the selection's total, the quick searches, the Untouched order,
  Changed with it), acting on many (the batch rename, duplicate cleanup,
  copy as), getting things in and out (lists as CSV, places files, a
  terminal opened in a folder) and starting fast (the warm start), with
  its review fixes and its docs and sweep.
- **Complete, on `main`:** the demo world. The page on GitHub Pages, or
  any server without the service, runs on a generated studio drive of
  about 12,000 files, with every route and operation answered in the
  page; `npm run demo` serves it locally, and `npm run export` writes a
  snapshot out as CSV and JSON.
- **Complete, on `main`:** the blocks' look. Rounded edges, a satin
  finish, contact shadows and a sun at a three-quarter angle to the
  view; a closed mass's sides show its strata, and each extension takes
  a tone of its kind's colour.
- **Next:** no wave is planned yet; the open ground is the rest of
  Stage 4, the rest of Stage 6, and the Stage 5 deferrals in section 4.

Section 5 has the detail for every wave.

## 1. The exploration loop

One pass through the loop, and what serves each step today.

| Step | The visitor | Served by |
| ---- | ----------- | --------- |
| 1. Arrive | Sees the whole directory from above as a hundred or so masses: where the bytes are, what kind they are | Overview vantage; area is bytes; masses tinted by dominant kind; heavyweight pins; a warm start that draws the last session's tree at once; a reload or a link that lands where it names |
| 2. Notice | Something stands out: a large mass, a tall fresh block, a pin, a colour | Lenses (kind, age, size, duplicates), with closed masses at their typical age under the Age lens; survey tab, working sessions and quick searches included; search pins; benchmark tags that say what changed; the time view, where what changed since a date lies flat |
| 3. Approach | Flies toward it. It opens as it gets close | Wheel flies to the cursor; distance-driven unfolding; contents rise out of the plateau |
| 4. Orient | Knows where they are without thinking about it | Breadcrumbs, ledger and the address follow the camera; tags on nearby plateaus; benchmarks as survey marks; horizon and haze |
| 5. Inspect | Selects a thing and reads it | Inspector: path, size and shares, dates, composition, bytes by last change, what changed since a benchmark or a date, what changed with a file, preview, duplicates; Quick look, stepped through a list; what a selection weighs; an archive's contents with I |
| 6. Act | Opens, renames, moves, removes | Context menu, keys, placing mode, drag and drop, the command palette; many items renamed with a preview; verified copies cleaned up; names and paths copied; lists saved as CSV; a terminal in the folder; every result stated in words |
| 7. Confirm | Sees the world change to match the disk | Affected folders re-read; boxes move or rise; Undo offered in the notice |
| 8. Leave | Goes up, back, or jumps somewhere else | Backspace, Alt+Left, 0, J to a marked return point, Fly there in the Places tab, breadcrumbs, search results and saved searches, survey entries, the command palette (Ctrl+K) |

The loop has two speeds. On foot (W A S D at eye level) it is browsing. By
jump (search, the palette, survey, breadcrumbs) it is retrieval. Both end
in the same inspector and the same operations.

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
| Sync, compression | Useful, not minimal. Batch rename, once listed here too, is built in Stage 6 (Wave 3) |

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
    disk now prevents it. An Undo stopped part way by
    an item in use says how many items went back, and the next Undo
    resumes.
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

### Stage 4. Streaming the data, not only the geometry. Under way

The browser currently holds the whole tree. The plan for trees in the
millions has one item done.

Done on 11/13/2026 (Wave 3):

- A cache of the last scan on disk, so a second launch draws at once:
  the warm start. Its first form is validated by a full survey in the
  background rather than by folder modification times, and while that
  survey runs the page holds two trees.

Next:

- The service keeps the tree and serves regions: children of a folder,
  with aggregates, on request.
- The browser requests regions as the eye approaches and drops them as
  it leaves, the same way it already does for geometry.
- Search, survey and duplicate grouping move to the service.
- The cache validated by folder modification times, so the check after
  a warm start reads only what changed.
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
Waves 1 and 2 (section 5), and Wave 3 delivered three of the deferrals:

| Candidate | Wave | Delivered | Deferred |
| --------- | ---- | --------- | -------- |
| Interiors | 1 (service), 2 (world) | A zip archive (and the formats built on zip: jar, war, ear, apk, aab, whl, xpi, nupkg, vsix, ipa) looked inside with I, as a walled floor on its file's footprint. The service lists its directory without unpacking it (`GET /api/inside`), bounded and with locked and escaping names flagged; nothing inside can be changed; entries already in the directory by name and size are half-banded and tied as twins | tar and its compressed forms; CRC-32 verification; search inside an interior; more than one archive open at once; the age table and typical ages for an archive's folders; an image at wall scale; a text file as a readable surface |
| Relations across the tree | 0 (line layer), 2 (traverse), 3 (Changed with it) | Duplicate ties and archive twins as named sets in one line layer. Working sessions (files changed within 30 minutes of one another) as a search, `session:N`, a Survey section, and a route drawn through the world: the traverse. Changed with it: a selected file's session and the files nearest it in time, in the inspector, the context menu and the palette | Stop-stepping keys; a gap selector; a way to include folders whose names start with a dot; folders as stops of their own; same-name siblings; symbolic links as bridges to their targets |
| Time as a dimension | 1 | The date scrub: T , . < > and the As of stepper look back along a ladder of dates; what changed after the date lies flat and crossed, closed masses sink to the share they kept, and the inspector says what changed since and where | Scree taking part; replay; calendar-aligned steps; an "as it looked then" height mode; creation dates |
| Vertical organisation | 2, 3 (Untouched) | Strata, without using the space above: the inspector's Bytes by last change in six strata, and closed masses coloured by their typical age under the Age lens. Contents sorted Untouched, longest untouched first by typical age | Staffs above the plateaus; leaders to the largest descendants |
| Landmarks and memory | 1, 3 (places files) | Benchmarks: B measures a folder, a verdigris survey mark and its tag stand on it, and the Places tab says what changed since, including what left it. One return point: H marks where you stand, J flies back and swaps the two. Export and import of places as a file, saved searches with them | A trail of where you have been, under a name and a drawing convention other than the traverse's; coverage; search over benchmarks beyond `is:benchmark` |

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
a snapshot's apart from the live directory's. Export and import, which
were to come before the next landmark feature, now carry them to
another browser, profile or address as a file (Wave 3).

### Stage 6. Operations at scale. Under way

Done on 11/11/2026:

- Progress and cancellation for copies, moves and removals, with cleanup
  of the partial item and undo of the finished ones.
- A journal that persists across restarts.

Done on 11/13/2026 (Wave 3):

- Batch rename with preview: rules over a preview of every new name,
  the whole batch checked again by the service before its first rename,
  and one journal entry, so one Undo puts every name back.
- Duplicate cleanup: one verified copy kept and the others moved to the
  holding area as one change, after the group is hashed again.
- An Undo that stops part way keeps what is still to go back, so the
  next Undo resumes, after a restart too.

Next:

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

Stage 5 is built in waves, and Wave 3 took the same method across
Stages 4 to 6. Each wave runs on its own branch (`wave-1`, `wave-2`,
then `qol`) in a separate worktree: its build steps one after
another, then an adversarial review, a fix step, and a docs and header
pass. A wave is merged into `main` and pushed only when `npm test`,
`node tools/vendor.mjs --check` and the full `node tools/ui-check.mjs`
pass, with and without WebGL, on the default fixture. Through Wave 2
and the Sanity sweeps the one accepted failure was the load screen's
reload check, which timed out once per pass; since the load screen work
every check passes.

The plan had five waves: Wave 0 for the groundwork, Waves 1 to 3 for the
features and Wave 4 for the docs. In practice the client half of
Interiors (planned as Wave 3) and the docs (planned as Wave 4) ran as the
last steps of Wave 2, so the original plan's Waves 3 and 4 ran inside
Wave 2. Wave 3 below, quality of life, is therefore the first wave
numbered 3 to run on its own, and not the Wave 3 of that plan.

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

### Complete: the load screen

The one open fault was the `splash` check's reload step, which timed out
once per pass. The sheet was not at fault. With reduced motion it leaves
the moment the first survey is drawn, with no exit, and on the fixture
that took 48 to 98 ms, so it had come and gone before the check's first
look and the check waited for a sheet that never returned. The check now
installs a recorder for the new page that notes the sheet from its first
frame, and reads that record when the sheet has already gone. Checks:
`node tools/ui-check.mjs --no-shots`, both passes: "879 passed, 0 failed, 5 skipped".

### Complete: Wave 3, quality of life

Wave 3 runs on its own branch, `qol`, made from `main` at `515faee`
("Single-key shortcuts off by default"), in a separate worktree. It
began by scoping what Terrane already does, then chose thirteen
features that make it more useful from day to day and built them in
five groups, one after another, each with Node checks in `npm test`
and `ui-check` scenarios of its own, run in both passes before it
committed. An adversarial review, a fix step and a docs and sweep step
followed. It was merged into `main` as Terrane 1.4.0, in the commit
titled "Merge qol: Wave 3, quality of life".

1. **Finding your way.** The seams (`1543ad9`): the registries
   `COMMANDS`, `LEDGER_SUB`, `AFTER_FOCUS`, `AFTER_SELECT` and
   `TAB_SECTIONS`, `openSheet`, and double quotes in search. The
   features (`1b1cd15`): the command palette (Ctrl+K), the remembered
   view and links, and search history, saved searches and `in:`.
2. **Looking before you act.** Quick look, P, with byte ranges on
   `GET /api/raw` (`091605e`); the selection's total, the quick
   searches and the Untouched order (`df29bc7`); Changed with it
   (`8b2bcb3`).
3. **Acting on many** (`fc1e39f`): the batch rename with a preview and
   the service's `renames` operation, duplicate cleanup and copy as,
   through the seams `RENAME_MANY`, `MENU` `many()`, `INSPECTOR.many`
   and `DUP_GROUP`; what Verify proved now survives a refresh.
4. **Getting things in and out.** The service passes over a port
   Windows refuses (`c7bb15c`); lists saved as CSV (`5b44d33`); places
   export and import (`937cd13`); a terminal opened in a folder,
   `POST /api/terminal` (`dd86458`).
5. **Starting fast** (`974596f`): the warm start, the cache in the
   service (`GET /api/warm`) and the catch-up in the page.
6. **The review fixes** (`ffd528f`): an Undo that stops part way
   resumes; no warm cache inside the root; the address and the kept
   view follow when the folder you are in goes; Quick look leaves a long
   text and a player their keys; two records put right.
7. **Docs and sweep**, in the commit titled "Wave 3 docs and sweep":
   README, ARCHITECTURE, this roadmap, `CHANGELOG.md` and every header
   the wave touched, checked against the code. Final check lines, on
   Windows 11 with Edge 157 on an RTX 5050 laptop GPU and the default
   fixture of 3,126 files:
   - `node --check` on all 81 script files outside `web/vendor/`: no
     error;
   - `npm test`: "255 passed, 0 failed", "97 passed, 0 failed",
     "57 passed, 0 failed", "33 passed, 0 failed", "57 passed, 0 failed",
     "52 passed, 0 failed", "54 passed, 0 failed", "31 passed, 0 failed"
     and "68 passed, 0 failed", 704 in all;
   - `node tools/vendor.mjs --check`:
     "Every vendored file matches the manifest.";
   - `node tools/ui-check.mjs --no-shots --port 5080`, both passes, 37
     scenarios: "1369 passed, 0 failed, 6 skipped" (744 and 2 skipped
     with WebGL, 625 and 4 skipped without). The skips are, in each
     pass, what needs `--snapshot` and the `splash` check for a sheet
     gone before the first look, and without WebGL two checks of what
     is drawn in the world. Draw calls at the baseline (overview 6,
     selected 8, search 7, duplicate ties 9).

### Complete: the demo world

The GitHub Pages address said only how to start the service, so nobody
could try Terrane without installing it. The page now runs on a
generated studio drive when no service served it: about 12,000 files,
every route and operation answered in the page, nothing sent anywhere.
`npm run demo` serves the repository as Pages does; its `write`
command puts the same world on disk for the real service; and
`npm run export` writes a structure snapshot out as CSV and JSON.
Checks on the branch: `node tools/demo-test.mjs`, "93 passed, 0
failed"; `node tools/ui-check.mjs demo`, both passes, "38 passed, 0
failed". It was merged into `main` after Wave 3, in the commit titled
"Merge demo: the demo world".

### Complete: the blocks' look

The boxes looked like placeholders: flat colour, a black outline on every
edge, no sense of material or light. They now read as a model's pieces:
rounded edges that catch the sun, a satin finish, shade toward each
side's foot, a soft contact shadow under every box, and a closed mass's
sides in strata of what it holds. Each extension takes a tone of its
kind's colour. The sun had stood behind the default view, so every cast
shadow fell behind its box; it now keeps a three-quarter angle to the
view. Camera RAW files (Canon's CR3 among them) count as images. One
draw call more, for the contact shadows. It was merged into `main`
after the demo world, in the commit titled "Merge look: the blocks'
look"; the draw-call baseline was recorded again with it.

### Next

No wave is planned yet. The open ground is the rest of Stage 4, the
rest of Stage 6, and the Stage 5 deferrals in section 4.

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
contains, so in snapshot mode an archive cannot be looked inside. The
warm start's cache, the last complete survey of any directory Terrane
is started on, sits in the same folder, and `TERRANE_DATA` moves all of
them; the checks give every service they start a folder of its own.

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
