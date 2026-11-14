<!--
✒ Metadata
    - Title: Shipped File Changelogs (Terrane Edition - v1.7)
    - File Name: CHANGELOG.md
    - Relative Path: CHANGELOG.md
    - Artifact Type: docs
    - Version: 1.7.0
    - Date: 11/13/2026
    - Update: Friday, November 13, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 1.7.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] — Records the blocks'
      new look: viewport.js 1.6.0, app.js 1.11.0 and model.js 1.5.0. viewport.js's header
      rolls its 1.3.0 entry out, app.js's its 1.8.0 and model.js's its 1.2.0; this file
      already holds them.
    - 1.6.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] — Records app.js 1.10.0:
      the demo world on a page no service served. app.js's header gives its 1.9.0 entry a
      short form; the long form stays here.
    - 1.5.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] — Records the seams for
      finding your way: app.js 1.9.0, ui.js 1.4.0, and the first sections for web/js/model.js
      (1.4.0, double quotes in search) and web/js/landmarks.js (1.3.0, the Places tab's
      sections from other features), whose 1.0.0 entries left their headers with these
      releases. Then the features themselves: terrane.css 2.4.0, and the first section for
      web/js/features.js (1.3.0, the palette, the remembered view and searches), whose
      1.0.0 entry left its header with that release. Looking before you act extends
      the same entries of app.js, model.js, terrane.css and features.js: Quick look;
      the selection's total, the quick searches and the Untouched order. The seams for
      acting on many extend those of app.js and landmarks.js, and acting on many itself
      those of terrane.css and features.js: the batch rename, duplicate cleanup and copy
      as. Getting things in and out extends those of ui.js and features.js: download()
      and the lists saved as CSV; then that of landmarks.js: places export and import;
      then that of features.js again: a terminal opened in a folder. Starting fast extends
      those of app.js, model.js, landmarks.js and ui.js: the warm start; app.js's header
      rolls its 1.7.0 entry out to this file's copy. The review of Wave 3 extends that of
      app.js again: the folder you are in followed after a refresh, and an Undo that
      stopped part way. The app.js 1.7.0 entry now opens with its header's words, which
      rolled out without being copied here, and the page says how an entry's long form and
      its header's short form are kept together.
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
here unchanged in the same edit. Where this file already holds an
entry's long form, the header's words are copied in to open it, so the
short form is kept too.

## web/js/app.js

- 1.11.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] — Paint gives each file its
  kind's colour in a tone of its own extension (extTone): five steps from 22 % darker to 24 %
  lighter, with common neighbours set apart (.ts and .tsx, .tsx and .css, .jpg and .png, .mov
  and .mp4) and every other extension stepped by its hash. A closed mass takes 56 % of its
  dominant kind over clay where it took 42 %, and its strata (strataOf): the three largest
  kinds it holds, as 70 % tints over clay, largest at the foot, the third band taking every
  kind after the second, passed to the viewport as bands and shares. Only under the Kind lens,
  and not on a selected, sealed or conventionally drawn mass. Reading the world says that a
  closed mass's sides show its strata.

- 1.10.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] — A page no service served,
  opened over http or https (GitHub Pages, `npm run demo`), runs the demo world: DEMO is
  demo.js's startDemo(), imported with a top-level await before anything asks for /api/, so
  every request the page makes is answered in the page by demo-service.js. rawUrl takes the
  world's picture for an image, a synthesized tone for audio and a few seconds of film recorded
  in the page for video, and /api/raw otherwise, so Quick look plays them too; the status line
  says "Demo world"; the loading sheet says it is building the demo world; window.__terrane
  carries demo; and a notice after the survey says what the visitor is looking at, with a link
  to the repository. A page opened from disk still says how to start the service, and so does
  one whose demo could not start. The header's 1.9.0 entry takes a short form.

- 1.9.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] — Seams for Wave 3's first
  group, finding your way (the command palette, the remembered view and links, search
  history and saved searches). Five registries, frozen with the rest and handed out in the
  api: COMMANDS, the palette's actions that have no key ({ id, owner, order, section,
  items() }, asked each time the palette opens, an item unavailable with its reason as off);
  LEDGER_SUB, controls a feature adds to the ledger's count row for Contents or Findings
  ({ tab, build(ctx) } with ctx { items, search, focus }, drawn in a span.sub-tools after
  the sort keys, Findings' on its first sub-row, each control with a data-k so a redraw
  keeps focus on it); AFTER_FOCUS, run(dir) in moveFocus once the folder you are in has
  changed; AFTER_SELECT, run(sel, primary) at the end of select(), quiet ones included, and
  of the new selectAll(); and TAB_SECTIONS, sections a feature adds to a tab another one
  draws, built by api.tabSections(tab). The key table takes three fields only the palette
  reads: labels (one palette item per key, on the lens 1 to 4 and the panels [ ]),
  palette: false (the arrows, Enter and the menu key) and gl: true (V and 0, unavailable
  without WebGL). The api gains setLens; selectAll(nodes, primary), which Findings' Select
  all now uses; copyText(text, said, fail), the clipboard write and its refusal, which
  copyPaths now uses with the same sentences; listItems; cursorTo(node), which moves the
  list's cursor to a node and scrolls to it; rescan, the whole survey again; and
  tabSections. S declares the searches slot. Find's own keydown handler returns first when
  a listener installed before it has claimed the key with preventDefault, so the search
  history's arrows can step without the list taking focus. Looking before you act: P is
  allocated to Quick look in KEY_OWNERS; the api gains rawUrl(node, max), the address of a
  file's bytes for a preview; and the inspector's preview reads its picture and text
  extensions from model.js (IMAGE_EXT, TEXT_EXT), the list Quick look reads too. Contents
  gains a fourth sort key, Untouched (titled "Longest untouched first (typical age)"):
  the median step of the age table, descending (a file by its own step), then the older
  last change, then the name; before the first age table, and inside an open archive,
  whose folders the table does not hold, the last change alone, oldest first. It starts
  in its natural order (dir 1) and reverses like the others; sortToggle takes titles for
  an order that ascending and descending do not describe. In the ledger list, Ctrl with an
  arrow, Page Up or Down, Home or End moves the cursor and leaves the selection alone, so
  Space can gather several rows by keyboard. Acting on many: RENAME_MANY ({ id, owner,
  run(nodes) }, the first entry wins), which the core F2 now dispatches to when more than
  one item is selected, while F2 with one item opens the single rename as before and its
  guide row is unchanged; MENU entries may define many(nodes, ctx), whose items follow
  Copy paths in the menu of several (ctx { ro, off }, off naming an archive's lock), and
  an entry needs items() or many(); INSPECTOR.many, sections after the Actions grid of a
  selection of several, built with ctx { ro, off }; DUP_GROUP ({ id, owner, build(group,
  ctx) }), what a feature adds under a group of duplicate candidates, in the inspector's
  copies (ctx { node, where: 'inspector', ro }) and after each group's rows in the Survey
  (ctx { node: null, where: 'survey', ro }), whose note now also gives the reclaimable size
  of the confirmed groups; and api.relLabel(node), absPath without the root and its
  separator, joined with '/', the root as '.' and an archive entry as dir/x.zip!/inner/file.
  A verified group keeps the hash it was verified by. A survey after a refresh no longer
  matches the old groups by their exact file lists, which dropped the verification of any
  group whose size bucket held a file that matched none: what Verify by content proved is
  kept per file (its hash, mode, size and last change), and a size group whose every file
  is unchanged since is split by content again, as Verify split it. Verify by content runs
  a survey still queued after a refresh first (surveyNow): pressed within the survey's
  500 ms debounce it used to hash the nodes the refresh had just replaced, and the survey
  that followed forgot the result. The inspector of a
  selection of several no longer prints the word "null" under its Actions grid when no
  action is unavailable (a writable service): the missing note was handed to
  replaceChildren. Starting fast, a warm start: when GET /api/info names a kept tree
  (warm) and this is not snapshot mode, start() sets S.warm ({ takenAt, pending,
  failed }), says "Drawing <name> as it was on MM/DD/YYYY HH:MM" on the loading sheet,
  reads GET /api/warm into the model and checks it against the meta's counts (root.dc + 1
  folders, root.fc files). A tree that reads whole is surveyed (AFTER_SURVEY with { full:
  true, warm: true }), laid out, drawn and handed over from the sheet at once, with a
  12-second notice ("Showing <name> as it was when the last session surveyed it, <date>.
  Surveying it as it is now; changes wait until then."), and the change stream connects
  then, so a change on disk during the catch-up is noted; one that does not is set aside
  with the notice "The tree from the last session could not be read, so Terrane surveyed
  the directory afresh." and the page surveys from nothing. catchUp() then streams GET
  /api/scan into a model of its own, touching nothing in S; notes the eye relative to the
  box of the folder you are in (places.js anchorOf and poseRelative); takes the new tree
  on with Model.adopt, so every node still there is kept; prunes the selection, focus and
  trail; runs AFTER_REFRESH (null), the survey and AFTER_SURVEY with { full: false,
  settled: true }; clears S.warm and withdraws its notice; runs the search again; lays the
  world out with its boxes travelling and the location held through it, and, when the
  folder's box moved, puts the eye back where it stood relative to it (flyTo, then hold);
  reads again the folders the change stream or a refresh asked for meanwhile; and says
  "Surveyed again: N files changed, M here now, K gone since the last session." or
  "Nothing changed since the last session." A catch-up that fails keeps
  the tree from the last session, with an error notice whose action is Survey again, and
  the status reads "Last session · not surveyed". While S.warm is set, writable() returns
  "the tree from the last session is still being checked", so every change control shows
  unavailable with that reason (the menu, the inspector, the toolbar's New folder and
  Undo, a row's drag); runOp (Open and Reveal aside), Undo, Restore and Purge, and N, F2,
  M, Ctrl+D, Delete and placing refuse with "Changes wait while the tree from the last
  session is still being checked. They are available again once the directory has been
  surveyed." before a dialog asks or anything is sent; refreshDirs notes its folders and
  returns a promise that settles once they have been read; the status reads "Last session
  · surveying" with the busy lamp; and the Journal tab says that changes wait.
  readOnlyMode(), new in the api, gives the service's own mode without that wait, for
  what Terrane does not change itself (a terminal). A Rescan all begun meanwhile stops
  the catch-up and lets go of what waited for it. scanStream(rel, depth, onBatch,
  { route, signal }) reads any route that answers the scan's NDJSON. window.__terrane
  gains firstDrawMs (performance.now() at the first layout that drew a box, rounded) and
  warm: { used, settledMs }, and is set once the first tree is drawn, warm or not. The
  header's 1.7.0 entry rolled out to keep it within 40 lines. The review of Wave 3:
  refreshDirs and catchUp note the folder you were in before they prune the tree, and
  fullScan before it starts a new one; once the selection, focus and trail are pruned
  and AFTER_REFRESH has run (fullScan: once everything is reset and drawn), the new
  focusMoved(was) runs AFTER_FOCUS when the location moved, so the address and the kept
  view no longer name a folder that left the tree, and a reload no longer says "Nothing
  at" it. asError carries moved; an Undo that fails with moved (one that stopped part
  way) runs AFTER_OP with { type: 'undo' } and { ok: false, partial: true, moved, label,
  affected }, reads the affected folders again and redraws the Journal tab before its
  error notice, which now carries the service's own sentence.
- 1.8.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] — Single-key shortcuts are
  off unless turned on in the guide: letters, digits and signs act while the world or the
  ledger list has focus, and Ctrl and Alt chords act everywhere. This was Dennis's call after
  the hardening pass offered the setting with shortcuts on. A first key pressed before
  anything has focus therefore does nothing until the world is clicked or tabbed to; the
  page still leaves focus alone on load, so the skip link stays the first stop for Tab.

- 1.7.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] — Hardening: a folder gone from
  disk no longer stalls every refresh; Rescan all lets go of the old tree and runs the search
  again; the forced unfold ends at the overview or off its branch; focus survives a redraw or a
  hidden panel; a narrow inspector drawer and a single-key setting; a page the service did not
  serve asks it nothing. Counts say "1 item" and "1 match"; an empty folder, a search with no
  match and a legend with nothing to colour each say so, with no sort keys over an empty list;
  Copy, Create and Rename carry icons as their neighbours do.
  In full: refreshDirs reads a folder that is gone from disk through its
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

- 2.4.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] — Imports
  components/palette.css: the command palette's field, its options with the highlighter
  and an ink bar on the active one, its group labels and its foot line, in the shared
  dialog set high in the window; and components/searches.css: the Places tab's saved
  searches, a bookmark mark, the name over the query in mono, Run and Forget. Then
  components/quicklook.css: the Quick look sheet, about 1,100 px by 86% of the window, a
  ruled head with the kind swatch, the name, Close, the facts, the position and the cut
  note; one scroll container for the body, text as a sticky gutter of line numbers beside
  a pre, a picture or a player fitted and centred, facts under a sentence; a foot line of
  keys. And components/presets.css: the selection's total on the ledger's count row, in
  mono on a highlighter wash, and the Survey's Quick searches rows with the search icon.
  Then components/batch.css: the batch rename sheet, about 860 px wide, its rules in three
  ruled sets side by side (stacked when narrow), a preview table of Now, Becomes and Note
  under a sticky head with problem rows on a garnet wash, and the reason Apply is
  unavailable in garnet; and the duplicate cleanup line under a group of copies, its
  reclaimable size on a garnet wash, its buttons and its sentences, with the
  confirmation's list of what moves.
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

- 1.6.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] — Boxes look made, not drawn.
  The box material is a MeshStandardMaterial (roughness 0.46) whose shader, from each box's
  own dimensions: rounds every edge, the normal leaning toward the edge within a bevel of 16 %
  of the short side or 6 % of the footprint, never under about a pixel and a half nor over a
  third of the short side; shades each side toward its foot (to 66 %) over the lesser of 45 %
  of its height and 30 % of its footprint; gives a closed mass's sides strata in three bands
  with a fine seam (aRole, aBandA to aBandC, aShare); lays two courses on a plateau's riser;
  adds a fine grain stepped by octaves of three pixels; and darkens a top 5 % toward its rim.
  Every edge is a soft crease in the box's own tone, at half strength; ink stays for hatch and
  hollow. Contact shadows: a second instanced mesh shares the boxes' matrix buffer and draws one
  flat shade per box on the surface below it, its soft edge scaling with the box, slid away
  from the sun, faded by dimming and haze; screes and walls cast none. That is one draw call
  more. The sun keeps a three-quarter angle to the view, from the left and a little behind, in
  steps of about ten degrees of turn: it had stood behind the default view, where every shadow
  fell behind the box that cast it and none could be seen. Neutral tone mapping; a cool sky
  over a warm bounce (1.35) and a warm sun (2.9), with stronger, softer shadows.

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

- 1.4.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] — openSheet(build, {
  className, label, onKey }): a sheet in the shared dialog for something richer than ask(),
  first the command palette. build(body) fills it before it opens; it is modal, so the
  page's keys rest while it is open and Escape closes it natively; it takes the floating
  slot as ask() does; className is on the dialog only while it is open, label names it, and
  onKey hears every key pressed inside. It returns { close, body }. close(then) shuts it,
  puts focus back on what had it before, and runs then in the next animation frame after
  the close event, so an action chosen in the sheet that moves focus keeps it where it put
  it rather than having the dialog's own return of focus undo it.
  download(filename, text, type): text handed to the browser as a file to save, through a
  Blob, its object URL and a hidden a[download] that is clicked and removed, the URL
  revoked a tick later. Nothing goes through the service, so it works in snapshot and
  read-only mode alike; the CSV export is the first to use it. notice() returns a
  function that withdraws the notice early, for a sentence that stops being true: a warm
  start's "changes wait until then" once its catch-up is in.
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

## web/js/features.js

- 1.3.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] — The sixth to eighth
  features, finding your way: the command palette, Ctrl+K, every action and every folder
  and file by fuzzy match (palette.js, with the DOM-free fuzzy.js); the remembered view
  and links, a reload coming back to the folder, the lens, the tab, the selection and the
  eye, and an address (#/folder) that opens a folder and follows the one you are in
  (resume.js); and the search history, saved searches and the in: token (searches.js).
  resume.js and searches.js keep their data through the DOM-free memory.js. Then,
  looking before you act: Quick look, P, the selected file's text, picture, sound or
  film in a large sheet, stepped through the list shown with the arrows (quicklook.js);
  totals and quick searches, the selection's size on the ledger's count row and four
  common searches counted in the Survey and run with a key (presets.js). Then, acting on
  many: the batch rename, F2 with several selected, a sheet of rules over a preview that
  the DOM-free rename.js works out, one change and one Undo (batch.js); duplicate cleanup,
  keep one verified copy and move the others to the holding area after reading them again
  (dupes.js); and copy as, names and relative paths from the menus and the palette
  (copyas.js). Then, getting things in and out: lists saved as CSV, the Contents and
  Findings in the order shown from Export CSV on their count rows, and the Survey's five
  lists from its last section, Export as CSV, all in the palette too; the CSV is written
  by the DOM-free csv.js (RFC 4180, a UTF-8 byte order mark, CRLF, and an apostrophe
  before a text cell that begins with = + - @, a tab or a CR) and saved in the page,
  with no service call (exports.js); and a terminal opened in a folder, from the context
  menu (a folder's "Open a terminal here", a file's "in its folder", the folder you are
  in), the inspector's Terminal here and the palette, unavailable with the reason in
  snapshot or read-only mode, inside an open archive and in a folder that cannot be read;
  the service starts it with the folder as its working directory, never an argument
  (terminal.js).
- 1.2.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] — The third: Session
  traverse, working sessions as a search and a route (traverse.js). The fourth: Strata,
  bytes by last change and the Age lens's typical age for closed masses (strata.js). The
  fifth: Interiors, a zip archive looked inside as a walled floor (interior.js).
- 1.1.0 (11/12/2026) [dendogg + Anthropic - Claude Opus 5.5] — The first feature: Time,
  the date scrub (time.js). The second: Landmarks, benchmarks and the return point
  (landmarks.js).
- 1.0.0 (11/12/2026) [dendogg + Anthropic - Claude Opus 5.5] — Initial release.

## web/js/model.js

- 1.5.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] — Camera RAW files are images:
  cr3, nrw, srf, sr2, raf, rw2, orf, pef, srw, 3fr, erf, kdc, mrw, x3f and iiq join cr2, nef,
  arw and dng. Canon's CR3 had counted as Other, so a photo library shot in it read as grey.

- 1.4.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] — Double quotes keep spaces in
  one search token and are dropped: "two words" is one name term, and in:"My Folder"
  reaches its prefix as the value my folder and the raw My Folder. A token that begins with
  a quote is a literal name term, never a prefix, a glob or a size; a quote left open runs
  to the end of the query, and empty quotes add nothing. A query without quotes is split
  and read exactly as before. IMAGE_EXT and TEXT_EXT: the extensions a preview shows as a
  picture or reads as text, one list for the inspector's preview and Quick look, moved
  here from app.js. ext: and kind: take a comma list, any of them: ext:jpg,png and
  kind:video,audio,image; a listed word that names no kind adds nothing. adopt(fresh)
  takes on a fresh model of the same directory, walking both trees from their roots with a
  stack: a folder's children are matched by name and kind (folder or file); a matched file
  keeps its node and takes size, date and flags from fresh; a matched folder keeps its
  node and is walked in turn; a new entry is fresh's node, its parent set to the old
  folder; a gone one is dropped. Every old folder takes its size, date, error, stub flag,
  file and folder counts, height, newest change and a copy of its bytes by kind from
  fresh, and is marked dirty, so the layout sorts it again. It returns { kept, added,
  removed, changed }: entries kept, entries here now and gone (a folder with all it
  holds), and files whose size or date changed. 200,000 files are adopted in about 23 ms
  in Node; the warm start's catch-up uses it.
- 1.3.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] — fmtDay (MM/DD/YYYY) and
  plural are the one date formatter and count wording every module imports; fmtDate builds
  on fmtDay. isDir, which nothing used, is gone.
- 1.2.0 (11/12/2026) [dendogg + Anthropic - Claude Opus 5.5] — The search grammar takes
  is: words and name:value tokens from the caller, so a feature can make itself
  searchable; is: looks up only real words, so is:constructor no longer matches
  everything.
- 1.0.0 (11/09/2026) [dendogg + Anthropic - Claude Fable 5.2] — Initial release.

## web/js/landmarks.js

- 1.3.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] — The Places tab ends with the
  sections other features keep there (api.tabSections('places')), such as Saved searches,
  after the return point. A batch rename (body type 'renames') carries benchmarks along by
  the pairs the service answers (res.renamed); one that stopped part way, by each item's
  path to its entry in res.results, where it now is, leaving out an item that kept its
  name. Export and import, a section after the return point and two palette commands,
  carries places between browsers, profiles and addresses. Export places saves
  terrane-places-<directory>-YYYY-MM-DD.json: { terrane: 'places', format: 1, root,
  source ('live' or 'snapshot'), exportedAt, benchmarks, ret, searches }, the benchmarks
  and the return point from the store's exportData() and the saved searches as kept.
  Import places… clicks a file input kept in the section (the palette's command shows
  the tab first, inside the frame that keeps the key's activation for the picker). A
  file over 2 MB, one that is not JSON, not terrane 'places' of format 1 or of no known
  source is "not a Terrane places file"; one for another root (compared exactly, in any
  case on Windows and macOS) or another source is refused with a sentence naming both,
  and nothing changes. Otherwise the store's importData() takes the benchmarks and the
  return point, the searches store's mergeSaved() the saved searches, the benchmarks are
  found in the tree, and the notice says "Imported from <file>: 3 added, 1 updated, 2
  skipped." (and how many did not fit in 64), with an Undo that puts back both. With a
  warm start, ready() also waits for S.warm to clear, so B and the Places, inspector and
  menu actions wait for the survey that checks the tree from the last session (the menu's
  Set benchmark is unavailable "once the survey has finished" then too). AFTER_SURVEY
  finds the benchmarks on a full survey and on the catch-up's settled one; the notice of
  benchmarks that changed is given on a full survey that is not warm, or on the settled
  one, never of the tree from the last session itself.
- 1.2.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] — A Find that asks
  is:benchmark runs again whenever the benchmarks change, so Findings, its count, the pins
  and the dimming follow; J opens a folded return point through api.forceOpen, so the
  overview ends that unfold.
- 1.1.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] — A folder inside an open
  archive takes no benchmark: B says why, the menu item is unavailable and the inspector
  has no Benchmark section for it. H there marks the return point in the folder that holds
  the archive, and J there keeps that folder as the point J again comes back to.
- 1.0.0 (11/12/2026) [dendogg + Anthropic - Claude Opus 5.5] — Initial release.

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
