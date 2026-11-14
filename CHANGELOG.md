<!--
✒ Metadata
    - Title: Shipped File Changelogs (Terrane Edition - v1.5)
    - File Name: CHANGELOG.md
    - Relative Path: CHANGELOG.md
    - Artifact Type: docs
    - Version: 1.5.0
    - Date: 11/13/2026
    - Update: Friday, November 13, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 1.5.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] — Records app.js 1.9.0:
      the demo world on a page no service served. app.js's header rolls its 1.6.0 entry
      out; this file already holds it.
    - 1.4.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] — Records app.js 1.8.0:
      single-key shortcuts are off unless turned on in the guide.
    - 1.3.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] — Records the hardening
      pass: app.js 1.7.0 in full, index.html 1.6.0 and viewport.js 1.5.0. Adds the sections
      for web/js/ui.js and web/css/tokens.css, whose 1.0.0 entries left their headers with
      the 1.3.0 releases. The polish pass that followed extends the same five entries, and
      app.js's header rolls its 1.5.0 entry out to this file's copy.
    - 1.2.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] — Records app.js 1.6.0 and
      terrane.css 2.3.0: the Findings sort keys, the Survey and query seams, and the
      session traverse's stylesheet; the Age lens's typical age for closed masses and the
      strata stylesheet; archive interiors in the controller and their stylesheet. Adds the
      sections for web/js/layout.js and web/js/viewport.js, whose 1.0.0 entries left their
      headers with the 1.4.0 releases; viewport.js's 1.4.0 entry also records a corrected
      header.
    - 1.1.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] — Records the Wave 1 releases of
      app.js (1.5.0), index.html (1.5.0) and terrane.css (2.2.0): the time
      view, landmarks and their seams.
    - 1.0.0 (11/12/2026) [dendogg + Anthropic - Claude Opus 5.5] — Initial release.

✒ Description:
    The full changelog of every browser file whose header keeps only its
    three most recent entries. Those files are sent to the browser on
    every load, so their headers stay short; the complete record lives
    here, newest first, one section per file.

✒ Key Features:
    - One section per shipped file, named by its path
    - Every entry the file's header has carried, moved verbatim
    - Newest entry first, as in the headers

✒ Other Important Information:
    - Dependencies: none
    - Compatible platforms: any Markdown viewer
---------
-->

# Changelog of shipped files

The headers of `web/` files keep their three latest entries. This file
keeps all of them. When a header rolls an entry out, the entry is copied
here unchanged in the same edit.

## web/js/app.js

- 1.9.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] — A page no service served,
  opened over http or https (GitHub Pages, `npm run demo`), runs the demo world: DEMO is
  demo.js's startDemo(), imported with a top-level await before anything asks for /api/, so
  every request the page makes is answered in the page by demo-service.js. rawUrl takes the
  world's picture for an image and a synthesized tone for audio, and /api/raw otherwise; the
  status line says "Demo world"; the loading sheet says it is
  building the demo world; and a notice after the survey says what the visitor is looking at,
  with a link to the repository. A page opened from disk still says how to start the
  service, and so does one whose demo could not start.

- 1.8.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] — Single-key shortcuts are
  off unless turned on in the guide, on Dennis's call after the hardening pass offered the
  setting with shortcuts on: letters, digits and signs act while the world or the ledger
  list has focus, and Ctrl and Alt chords act everywhere. A first key pressed before
  anything has focus therefore does nothing until the world is clicked or tabbed to; the
  page still leaves focus alone on load, so the skip link stays the first stop for Tab.

- 1.7.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] — Hardening: a folder gone from
  disk no longer stalls every refresh; Rescan all lets go of the old tree and runs the search
  again; the forced unfold ends at the overview or off its branch; focus survives a redraw or a
  hidden panel; a narrow inspector drawer and a single-key setting; a page the service did not
  serve asks it nothing. In full: refreshDirs reads a folder that is gone from disk through its
  parent in the same pass, where it used to wait on a refresh chained behind itself, which left
  every later refresh, Undo, Restore, F5 and B waiting for good. fullScan stops placing and lets
  go of S.force, S.search, S.sessions, the sorted Findings and a held flight, then runs the query
  again once the new tree is surveyed; Findings says the search will run again meanwhile.
  forceOpen(node) opens the way to a folded folder for setFocus, reveal and J, and the unfold
  ends at the overview (overview(): 0, Home, the view tools, the menu) or when the location
  settles off that branch. keepFocus puts focus back on a control a redraw rebuilt (the legend's
  kind chips, the sort keys, the Survey and Places rows, the inspector's buttons), else on its
  container; the rich panel's sections keep whether they are open. A panel that holds focus
  hands it to its toggle before it hides, and says so; below 860 px ] opens the inspector as a
  drawer and its toggle says what is shown. The guide's setting keeps single-key shortcuts to
  the world and the ledger list (WCAG 2.1.4). Unavailable inspector actions stay in the tab
  order, aria-disabled, with their reason in their name and a visible note. The altitude and the
  status label are written only when they change; without WebGL the canvas says what still
  works. The ledger list is named for what it shows and keeps its cursor on its item. A page
  whose token is still the placeholder stops before its first request (elsewhere.js explains).
  The api gains forceOpen and overview. Polish: the ledger's counts say "1 item" and "1 match";
  an empty folder, a search with no match and a kind legend with nothing to colour each say so
  in a sentence (the list's through setEmpty, which its name carries too), and Findings with no
  match offers no Select all or sort keys, nor Contents of an empty folder its sort keys; the
  Contents and Findings sort keys sit in one group that moves under the count in a narrow
  ledger; the inspector's Copy, and New folder's Create and Rename's confirm buttons carry icons
  as their neighbours do. The header's 1.5.0 entry rolled out to keep it within 40 lines.
- 1.6.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] — Findings sorts by Size or
  Changed; a search opens in the order it asks for and keeps the one chosen until the query
  changes, and Select all follows the order shown. The Survey tab's sections are a registry
  (SURVEY), AFTER_QUERY hooks hear every run of the search and may give Findings its order and a
  note, and setQuery puts a query in Find and runs it at once. Under the Age lens a closed mass
  shows its typical age, the median step of its bytes in the age table (strata.js), instead of
  its newest change; the legend says so. Inside an open archive, which the table does not hold,
  a closed mass keeps its newest change, and while one is open the legend's title says that too.
  An archive opened with I (interior.js) hangs from its file: isAttached, updateWhere,
  stepSelection, goUp, refreshDirs, the crumbs and absPath (x.zip!/inner/file) follow the graft,
  and a flight into it lands where it was going. runOp refuses any change under it before
  anything is sent; the keys, menu and inspector say why. Paint walls it in the file's colour,
  hatches locked entries and half-bands twins, tied as the relation set 'twins'. The api gains
  hostOf and listCursor.
- 1.5.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] — Paint draws a box the layout marks
  AUX.CROSSED (the time view) in the crossed convention, its colour washed 60% toward paper unless
  it is selected; a Contents row whose entry is crossed carries a crossed swatch and says so to
  assistive technology. Two seams for features: AFTER_OP hooks hear every change the service
  carried out (Undo included, with the paths it moved back) before the folders are re-read, and a
  change that stopped part way with what it finished; MENU entries add a group of context menu
  items; window.__terrane.places is the landmarks store.
- 1.4.0 (11/12/2026) [dendogg + Anthropic - Claude Opus 5.5] — The loading sheet (splash.js)
  covers the page from start until the service answers and the first survey batch is drawn,
  naming each stage; it leaves early on either failure so the veil can explain.
- 1.3.0 (11/12/2026) [dendogg + Anthropic - Claude Opus 5.5] — Icons on menus, tabs, sort keys,
  actions and operations; the north arrow and storage scale over the world (hud.js); tab and lens
  indicators that slide; status figures that count to their new values; the inspector settles in
  when its subject changes; the veil lifts away instead of vanishing; panel toggles and a Find
  clear button.
- 1.2.0 (11/11/2026) [dendogg + Anthropic - Claude Opus 5.5] — Paint uses the STYLE table; the
  viewport's notices are shown; the title block says when a layout left blocks out to stay in
  budget. Keys, Escape, pins, hover lines, inspector sections, Reading rows, tabs, layout options
  and after-layout, refresh and survey hooks are registries that feature modules fill through
  install(api); the key allocation is fixed and the guide is made from the key table. Without
  WebGL, going to a folder moves the location there and a relayout leaves it in place, so
  Contents can go down levels. Every survey rebuilds a shared table of each folder's bytes and
  files by last change (S.ages), and Rescan all drops the old one. The Menu key opens the menu
  without WebGL instead of throwing.
- 1.1.0 (11/11/2026) [dendogg + Anthropic - Claude Opus 5.5] — A progress panel with Cancel for
  copy, move and remove; snapshot mode (status, refusals, newer-snapshot notice); thumbnails in
  the inspector and the hover tip in place of original files; the journal tab marks
  earlier-session and purged entries.
- 1.0.0 (11/09/2026) [dendogg + Anthropic - Claude Fable 5.2] — Initial release.

## web/index.html

- 1.6.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] — js/elsewhere.js, a classic script
  before the app, tells a page the service did not serve how to start Terrane. The altitude
  readout is no longer a live region and the status cell announces its state, not its counting
  figures. The lens names sit in spans so the narrow title block can show icons and keep the
  names; the ledger's rich panel and the inspector body take focus when a redraw removes the
  control that had it. The placing banner's buttons carry icons, and Cancel names its key;
  Find's example tokens are single-spaced, so the whole line fits the field at full width.
- 1.5.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] — An As of cell in the title block: a
  stepper for the date the world looks back to (earlier, the date or Now, later), reachable by Tab.
- 1.4.0 (11/12/2026) [dendogg + Anthropic - Claude Opus 5.5] — The loading sheet's host, first in
  the body: the T is surveyed and laid down stratum by stratum while the service connects and the
  first survey arrives, then the sheet is excavated away.
- 1.3.0 (11/12/2026) [dendogg + Anthropic - Claude Opus 5.5] — Icons on every tool, the survey
  frame and instruments over the world (north arrow, storage scale), panel toggles in the view
  tools, a clear button and key hint in Find, a strata favicon, and the vendored Motion and
  Floating UI scripts.
- 1.2.0 (11/12/2026) [dendogg + Anthropic - Claude Opus 5.5] — The ledger's tab buttons are made
  by app.js from its tab registry, so a feature can add a tab without editing this page.
- 1.1.0 (11/11/2026) [dendogg + Anthropic - Claude Opus 5.5] — Adds the panel that holds
  operations in progress, at the lower left of the world.
- 1.0.0 (11/09/2026) [dendogg + Anthropic - Claude Fable 5.2] — Initial release.

## web/css/terrane.css

- 2.3.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] — Imports components/traverse.css:
  the Findings sub-line in two rows with its sort keys and note, the Working sessions rows and the
  traverse glyph; components/strata.css: the inspector's Bytes by last change and the
  typical-age glyph; and components/interior.css: an open archive's crumb, locked and escaping
  swatches, the Inside sections and the walled-floor glyph.
- 2.2.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] — Imports components/time.css: the
  As of stepper and the crossed swatch and glyph; and components/places.css: benchmark tags in the
  world, the Places tab and the Benchmark section.
- 2.1.0 (11/12/2026) [dendogg + Anthropic - Claude Opus 5.5] — The loading sheet joins the
  components layer (components/splash.css): the T mark, the TERRANE wordmark and the status line.
- 2.0.0 (11/12/2026) [dendogg + Anthropic - Claude Opus 5.5] — The one stylesheet becomes the
  entry to a layered system: tokens, fonts, base, layout, seven component modules, utilities,
  motion and print, each in its own file and cascade layer. Adds icons, the highlighter sweep,
  sliding indicators, survey instruments around the world, entry and exit motion, and a print
  sheet.
- 1.1.0 (11/11/2026) [dendogg + Anthropic - Claude Opus 5.5] — The operations panel (verdigris
  progress track, stipple while the total is still being counted), the picture in the hover tip,
  and previews that keep their aspect ratio.
- 1.0.0 (11/09/2026) [dendogg + Anthropic - Claude Fable 5.2] — Initial release.

## web/js/layout.js

- 1.4.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] — An open archive (options.inside)
  stands as a chamber on its file's footprint: four WALL boxes on the edges and, between them,
  the archive's root as a plateau keyed by the file, whose contents open by distance like any
  folder's. layout.chamber gives the range of the chamber's boxes.
- 1.3.0 (11/12/2026) [dendogg + Anthropic - Claude Opus 5.5] — The time view: given asOf, a file
  changed after that date lies flat as a crossed slab, an empty folder changed after it does too,
  and a closed mass is lowered by the share of its bytes kept unchanged, down to a crossed slab
  when nothing was kept. Footprints, the box count and key order stay those of the present. AUX
  names the per-box marks.
- 1.2.0 (11/11/2026) [dendogg + Anthropic - Claude Opus 5.5] — The box budget is checked before
  every box, so a layout never holds more than 70,000 and cannot overflow the viewport. Options
  reach the layout as one object; a per-box aux byte, an optional plateau key and index aliases
  are added; BOX and STYLE codes are allocated here, with WALL and CROSSED reserved.
- 1.0.0 (11/09/2026) [dendogg + Anthropic - Claude Fable 5.2] — Initial release.

## web/js/viewport.js

- 1.5.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] — The relation layer is drawn only
  while it holds a line (three.js draws an empty range), and labels are placed again only when
  the eye, the layout, the marks or the canvas change, not on a frame redrawn for a hover. The
  overview, a selection and a search each cost one draw call fewer; the baseline was recorded
  again (overview 6, selected 8, search 7, dupTies 9). A label's overlap test measures the tag
  as drawn (LABEL_BOX: a folder's expanded capitals and its 9 px leader line, a file's mono, a
  mark's pin below it) with a 2 px gap, so no tag stands across another or over another's line;
  before, a folder's tag was measured as narrow as a file's and 20 px tall.
- 1.4.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] — The walls of an open archive's
  chamber (BOX.WALL) carry no label; its floor is labelled with the archive's name, as a folder
  is. The header no longer calls the labels readable by assistive technology: their layer is
  hidden from it.
- 1.3.0 (11/12/2026) [dendogg + Anthropic - Claude Opus 5.5] — The crossed convention
  (STYLE.CROSSED, the time view): the two diagonals of a box's footprint in ink on its top and
  bottom faces, measured in the box's own coordinates so a re-based origin cannot move them,
  thin at any distance, and faded with the haze and as the box shrinks on screen. The colour is
  washed once, by paint. A pin can stand on the peak of everything on its box and point up
  (benchmarks' survey marks, in the same pin mesh); up to 12 mark tags are placed before every
  other label (setMarks); pose() returns the eye and its heading.
- 1.2.0 (11/11/2026) [dendogg + Anthropic - Claude Opus 5.5] — A layout larger than the instance
  buffers draws up to their capacity and says so through on.notice, instead of throwing a
  RangeError. Shader style branches take their codes from STYLE and are bounded on both sides, so
  an unassigned code draws plain. Box and pin buffers upload only the part that is drawn, not the
  whole array, and during a transition the shadow map is redrawn on every fourth frame at most and
  on the frame the boxes arrive. Duplicate ties become the set 'dup' in one relation-line layer
  that any named set can draw into: one preallocated buffer uploaded by range instead of a new one
  at every repaint, rewritten around the floating origin at every layout, hidden while boxes
  travel, with dashes of a constant size on screen and chevrons for direction. A set's arc
  segments and lift are made whole and finite, so one bad set cannot blank the others; frame and
  screenOf stop at the drawn count.
- 1.0.0 (11/09/2026) [dendogg + Anthropic - Claude Fable 5.2] — Initial release.

## web/js/ui.js

- 1.3.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] — Unavailable menu items are reached
  by the arrows and carry their reason as their description; the menu stops the browser's own
  context menu the Menu key would open over it. The virtual list keeps its cursor on its item
  when the list is redrawn, has a name and says several rows can be selected; ask() can start on
  its confirm button. A closed menu keeps its items while it fades out (160 ms), then lets them
  go; an empty list shows the sentence setEmpty gives it, and its name carries the same words.
- 1.2.0 (11/12/2026) [dendogg + Anthropic - Claude Opus 5.5] — Menu items and notices carry
  icons; the menu and tip are placed by Floating UI and unfold from the pointer's corner; notices
  show their time left, pause it under the pointer, and leave with an animation while their
  neighbours slide (FLIP); the virtual list cascades rows in when its items change;
  slideIndicator moves the ink plate of a tab strip or segmented switch.
- 1.1.0 (11/11/2026) [dendogg + Anthropic - Claude Opus 5.5] — The hover tip can carry a picture
  below its lines.
- 1.0.0 (11/09/2026) [dendogg + Anthropic - Claude Fable 5.2] — Initial release.

## web/css/tokens.css

- 1.3.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] — --ink-3 darkened to #5a6661, so
  --text-3 reads at 4.5:1 or more on every surface; --signal-deep and --search-text for search
  figures as text; plaster, clay and mass tokens for the inspector's key (the twins of
  THEME.plaster and THEME.clay); --z-drawer for the narrow inspector. --tool-h, --north,
  --hud-inset and --hud-lift set the instruments over the world on two rows, so the scale, the
  view tools, operations in progress and notices never stand on one another.
- 1.2.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] — The traverse in miniature:
  --tex-traverse (a dashed ink arc with its chevron, for the Reading glyph) and --tex-dash (a
  dashed ink stroke, for a working session's swatch). The Age lens ramp as primitives,
  --ramp-age-0 to --ramp-age-5 (the twins of THEME.ageRamp), and --tex-strata, a closed mass in
  three layers of it with a tick at half its height, for the typical-age glyph. --tex-chamber: a
  walled floor, the archive kind's colour around chalk, for the glyph of an archive looked
  inside.
- 1.1.0 (11/12/2026) [dendogg + Anthropic - Claude Opus 5.5] — The crossed convention as tokens:
  --crossed-wash (the 60% paper wash the world gives a crossed block) and --tex-crossed (the two
  diagonals of a footprint). A role for benchmarks, --bench (verdigris, the colour of their
  survey marks), and its wash. Sizes the ledger and the world's labels use that the scales
  lacked: --fs-row and --fs-fig, the row padding and indent, and a tag's padding (11/13/2026).
- 1.0.0 (11/12/2026) [dendogg + Anthropic - Claude Opus 5.5] — Initial release.

<!-- ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once! -->
