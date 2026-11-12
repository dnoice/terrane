<!--
✒ Metadata
    - Title: Terrane Roadmap (Terrane Edition - v1.0)
    - File Name: ROADMAP.md
    - Relative Path: docs/ROADMAP.md
    - Artifact Type: docs
    - Version: 1.0.0
    - Date: 11/09/2026
    - Update: Monday, November 9, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Fable 5.2
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Description:
    The four planning items Dennis asked for alongside the build: the
    exploration loop the world is designed around, the minimum viable
    filesystem scope, the practical filesystem interaction requirements,
    and a staged implementation roadmap that marks what is built and what
    is next.

✒ Key Features:
    - Exploration loop with the system that serves each step
    - Minimum filesystem scope: in, out, and why
    - Interaction requirements written as checkable statements
    - Six stages, each with an exit test; stages 1 to 3 are complete

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
| 2. Notice | Something stands out: a large mass, a tall fresh block, a pin, a colour | Lenses (kind, age, size, duplicates); survey tab; search pins |
| 3. Approach | Flies toward it. It opens as it gets close | Wheel flies to the cursor; distance-driven unfolding; contents rise out of the plateau |
| 4. Orient | Knows where they are without thinking about it | Breadcrumbs and ledger follow the camera; tags on nearby plateaus; horizon and haze |
| 5. Inspect | Selects a thing and reads it | Inspector: path, size and shares, dates, composition, preview, duplicates |
| 6. Act | Opens, renames, moves, removes | Context menu, keys, placing mode, drag and drop; every result stated in words |
| 7. Confirm | Sees the world change to match the disk | Affected folders re-read; boxes move or rise; Undo offered in the notice |
| 8. Leave | Goes up, back, or jumps somewhere else | Backspace, Alt+Left, 0, breadcrumbs, search results, survey entries |

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

Written so each can be checked. All are met by the current build unless
marked otherwise.

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
14. *Not yet met:* operations longer than a few seconds show progress and
    can be cancelled. Large copies currently block until done.
15. *Not yet met:* the undo journal survives a restart of the service.

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

### Stage 5. Beyond the ground plane

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

### Stage 6. Operations at scale

- Progress and cancellation for long copies and moves.
- A journal that persists across restarts.
- Batch rename with preview.
- Send to the operating system's recycle bin as an alternative holding
  area.
- A packaged desktop build (single executable, no terminal) once the
  service interface has settled.
- Windows hidden attribute, allocated sizes, hard-link detection.

Exit test: move 50 GB between folders with a live progress figure, cancel
halfway, and undo to the starting state.

<!-- ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once! -->
