/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Terrane Application (Terrane Edition - v1.12)
 *     - File Name: app.js
 *     - Relative Path: web/js/app.js
 *     - Artifact Type: javascript
 *     - Version: 1.12.0
 *     - Date: 11/14/2026
 *     - Update: Saturday, November 14, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Changelog:
 *     - 1.12.0 (11/14/2026) [dendogg + Anthropic - Claude Opus 5.5] — The
 *       sheet's polish: the ledger head in two rows (the count and its tools,
 *       then the keys over the columns; Select all an icon) with one-line
 *       captions; facts from parts, sectionTitle and the path broken after
 *       each slash; the legend's whole chips behind +N; the status reads
 *       files, bytes, folders; the veil's error on its own line. A tree
 *       above the region threshold, or one a survey finds past it, is drawn
 *       from regions (regions.js) the page asks for as the eye nears them;
 *       a folder's region is held before you go there or select it; changed
 *       folders are read again as fresh regions. Region answers are decoded
 *       in a module worker, and regions are let go under a budget of held
 *       entries, never a pinned folder or one standing open. The service
 *       answers search, the survey and Verify there: Findings lists the
 *       first 5,000 of the true total as refs, each made a node when acted
 *       on, and marks by name dim and pin what is held. A warm start is
 *       checked by folder modification times (GET /api/check), and in
 *       region mode in place by the service while changes wait. What
 *       follows a region landing, a layout's location and a reveal's
 *       panels run in tasks of their own there; the Survey is not drawn
 *       again on select, and its closed sections of many rows build them
 *       when first opened; a reveal paints its selection once. After the
 *       review: changes the service read itself are asked for as kept,
 *       pinned children past a folder's 5,000 kept through refills, the
 *       search and survey asked again at a pace the service bears, and
 *       Findings turned page by page. A search's answer in region mode is
 *       painted and listed once as it lands, not twice in one task.
 *     - 1.11.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] —
 *       Paint gives each file its kind's colour in a tone of its own
 *       extension, a closed mass a richer tint and, on its sides, strata
 *       of what it holds (strataOf, as bands and shares for the viewport);
 *       Reading the world says so.
 *     - 1.10.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] —
 *       A page no service served, opened over http or https (GitHub
 *       Pages), runs the demo world (demo.js): /api/ is answered in the
 *       page, the status says Demo world, pictures, sounds and film come
 *       from the world, and a notice says what the visitor is looking at.
 *     Earlier entries: see CHANGELOG.md
 *
 * ✒ Description:
 *     The controller that makes Terrane one product instead of several
 *     parts. It owns the session state (focus, selection, lens, search,
 *     placing), talks to the local service, and keeps the 3D world, the
 *     ledger, the inspector, the location bar and the title block showing
 *     the same thing at the same time.
 *
 * ✒ Key Features:
 *     - A loading sheet over the whole page while the service answers and
 *       the first survey batch arrives; it names each stage in words and
 *       hands over once the world has something to show
 *     - Streams the scan into the model and redraws while it is running
 *     - A warm start: the tree the service kept from the last complete
 *       survey is drawn at once and checked in the background by folder
 *       modification times, only the folders that changed read again (the
 *       service's sweep then finds files rewritten in place); the
 *       location, the selection and the eye stay where they are, changes
 *       wait until it is done, and a notice says what changed since the
 *       last session. In region mode the service checks the tree it read
 *       from the cache in place, and changes wait for it the same way
 *     - One selection shared by the viewport and the ledger; either can
 *       drive it, by pointer or by keyboard
 *     - Location follows the eye: the folder you are in is derived from
 *       where the camera is looking, and the breadcrumbs, ledger and
 *       legend follow it; clicking any of them flies you there. Without
 *       WebGL there is no camera, and going to a folder sets it directly
 *     - World management: the layout is rebuilt around the eye whenever
 *       it has moved more than a fraction of its altitude
 *     - Four lenses over one geometry: kind, age, size, duplicates; under
 *       the Age lens a closed mass shows its typical age, the date half
 *       its bytes have not changed since
 *     - Search that dims everything else, pins the matches, and marks
 *       closed masses and scree that contain matches; Findings lists them
 *       by size or by last change, and says so when nothing matches
 *     - Contents sorts by name, size, last change or Untouched: typical
 *       age from the age table, longest untouched first
 *     - Real operations through the service: open, reveal, copy path, new
 *       folder, rename, move, copy, duplicate, remove to holding, restore,
 *       undo; every result or refusal is reported in words
 *     - Verify by content splits duplicate candidates by their hash; what
 *       it proved survives a refresh while each file keeps its size and
 *       last change, and a verified group keeps its hash for the features
 *       that act on it
 *     - Placing mode and drag-and-drop for choosing a destination either
 *       in the world, in the ledger, or on a breadcrumb
 *     - After every change only the affected folders are re-read
 *     - Live updates from the service's watcher, merged the same way
 *     - Long operations show progress (bytes, rate, time left, current
 *       item) after 400 ms and can be cancelled from the keyboard or pointer
 *     - Images are shown only through thumbnails: the inspector and the
 *       hover tip never request an original file
 *     - Snapshot mode is stated in the title block, and every change and
 *       system hand-off is shown as unavailable with the reason
 *     - An open archive (S.interior) hangs its root from its file: every
 *       walk up the tree, the crumbs, the paths, the selection steps and
 *       the one lock in runOp know the graft, and nothing inside is ever
 *       fetched, changed, opened or revealed
 *     - Seams for features: ordered registries (KEYS, ESCAPE, PIN_SOURCES,
 *       TIP_LINES, INSPECTOR focus, node and many, READING, TABS, SURVEY,
 *       LAYOUT_OPTS, MENU, COMMANDS, LEDGER_SUB, TAB_SECTIONS,
 *       RENAME_MANY, DUP_GROUP) and hook lists
 *       (AFTER_LAYOUT, AFTER_REFRESH, AFTER_SURVEY, AFTER_OP, AFTER_QUERY,
 *       AFTER_FOCUS, AFTER_SELECT), so a feature adds entries from its own
 *       file instead of editing these functions
 *     - One key table drives the keyboard, the guide and the fixed key
 *       allocation; a reserved key can only be bound by its owner
 *     - The sheet's text on its grid: the ledger head's two rows, facts
 *       built from parts that break only at separators (api.parts),
 *       section heads with a figure (api.sectionTitle), and a legend that
 *       shows whole chips and puts the rest behind "+N"
 *     - One age table per survey (timeline.js) answers how much of any
 *       folder changed since a date, for every feature that asks
 *     - Region mode for a tree too large to hold (S.regions, regions.js):
 *       the page holds only the folders it asked the service for, opens a
 *       closed folder once its region lands, reads a folder's region before
 *       going there, selecting it or measuring it, and finds any path or
 *       ref by asking for its chain; the status line says how much it holds
 *     - In region mode the service answers the questions that walk the
 *       whole tree (search, its marks, the survey, Verify's groups): lists
 *       of refs with the true counts, a ref made a node in its list's place
 *       before anything acts on it, and the marks of the folders held asked
 *       by name, and carried on every region asked for while a search shows
 *     - Region answers fetched and decoded in a module worker
 *       (region-worker.js), so the main thread never parses one; regions
 *       let go under a budget once the view is settled, never those of the
 *       folder you are in, the selection, the trail, a flight, a benchmark
 *       or an open archive, nor a folder standing open
 *     - Instruments over the world: a north arrow that turns with the
 *       camera and back to north on a click, and a storage scale
 *
 * ✒ Usage Instructions:
 *     Loaded by web/index.html as a module; start the service and open the
 *     address it prints. Feature modules listed in features.js export
 *     name and install(api); api carries S, the registries and the
 *     controller's own functions:
 *         api.KEYS.add({ id: 'time-toggle', owner: 'time', keys: ['t'],
 *           run: () => toggle(), guide: ['Time', 'T', 'Look back'] });
 *         api.ESCAPE.add({ id: 'time', order: 40, active, clear });
 *         api.PIN_SOURCES.add({ id: 'places', order: 10, pins: (L) => [] });
 *         api.AFTER_LAYOUT.add({ id: 'route', run: (L) => draw(L) });
 *         api.AFTER_OP.add({ id: 'places', run: (body, res) => follow(body, res) });
 *         api.MENU.add({ id: 'places', items: (node) => [{ label, run }] });
 *         api.SURVEY.add({ id: 'sessions', order: 5, build: (sv) => el(...) });
 *         api.AFTER_QUERY.add({ id: 'route', run: (search, query) => {} });
 *         api.setQuery('session:1');   // into Find, run at once
 *         api.COMMANDS.add({ id: 'link', section: 'Links', items: () => [{ label, run }] });
 *         api.LEDGER_SUB.add({ id: 'save', tab: 'findings', build: (ctx) => button });
 *         api.TAB_SECTIONS.add({ id: 'saved', tab: 'places', build: () => details });
 *         api.AFTER_FOCUS.add({ id: 'hash', run: (dir) => {} });
 *         api.RENAME_MANY.add({ id: 'batch', run: (nodes) => openSheet(nodes) });
 *         api.MENU.add({ id: 'copyas', many: (nodes, ctx) => [{ label, run }] });
 *         api.DUP_GROUP.add({ id: 'dupes', build: (group, ctx) => el(...) });
 *     Every entry has a unique id; order (default 50) places it.
 *
 * ✒ Other Important Information:
 *     - Dependencies: model.js, layout.js, viewport.js, theme.js, ui.js,
 *       thumbs.js, timeline.js, regions.js (and its worker,
 *       region-worker.js), strata.js (the Age lens's mass colours),
 *       places.js (anchorOf, poseRelative, vantage: the eye through a
 *       warm start's check), features.js, icons.js, motion.js, hud.js,
 *       float.js, splash.js
 *     - Compatible platforms: current evergreen browsers with WebGL2
 *     - Limitations: when WebGL is unavailable the ledger, inspector,
 *       search and every operation keep working without the 3D world. A
 *       file rewritten in place keeps its folder's time, so a warm start's
 *       check misses it until the sweep that follows reads it. Survey
 *       again, after a check that failed, surveys the whole directory and
 *       holds two trees while it runs. In region mode the twins of an open
 *       archive are not looked for, and Findings and the Survey's lists
 *       hold the first 5,000 and 1,000 the service sends
 * ----------------------------------------------------------------------------
 */

import {
  Model, KINDS, FLAG_LINK, FLAG_HIDDEN, IMAGE_EXT, TEXT_EXT, extOf, fmtBytes, fmtCount, fmtDate, fmtAge, freshness, relPath, depthOf,
  isAncestor, parseQuery, runSearch, plural, kids, refFrom,
} from './model.js';
import { anchorOf, poseRelative, vantage } from './places.js';
import { buildLayout, BOX, STYLE, AUX } from './layout.js';
import { Viewport } from './viewport.js';
import { THEME, mixHex, ramp, cssHex } from './theme.js';
import { el, openMenu, closeFloating, floatingOpen, ask, notice, tip, hideTip, slideIndicator, VirtualList } from './ui.js';
import { thumbs } from './thumbs.js';
import { buildAgeTable } from './timeline.js';
import { createRegions, decode, measure } from './regions.js';
import { massTones } from './strata.js';
import { FEATURES } from './features.js';
import { icon } from './icons.js';
import { countTo } from './motion.js';
import { createHud } from './hud.js';
import { startSplash } from './splash.js';
import { preloadFloat } from './float.js';

const $ = (id) => document.getElementById(id);
const TOKEN = document.querySelector('meta[name="terrane-token"]').content;
/**
 * True on a page the service did not serve (opened from disk, from another
 * server or from GitHub Pages): it still holds the placeholder the service
 * fills in. Nothing here may ask a service: over http or https the demo
 * world answers instead, and from disk elsewhere.js says how to start one.
 */
const ELSEWHERE = TOKEN === ['__TERRANE', 'TOKEN__'].join('_');
/**
 * The demo world (demo.js), on a page no service served that was opened
 * over http or https: it answers /api/ in the page, so every request
 * below stays in the page. null when a service served the page, or when
 * the demo could not start.
 */
const DEMO = ELSEWHERE && /^https?:$/.test(location.protocol)
  ? await import('./demo.js').then((m) => m.startDemo({ thumbs })).catch((err) => {
    console.error('The demo world could not start:', err);
    return null;
  })
  : null;
const GRAINS = [{ label: 'Coarse', v: 0.0105 }, { label: 'Medium', v: 0.0062 }, { label: 'Fine', v: 0.0038 }, { label: 'Finest', v: 0.0024 }];

const S = {
  info: null, model: null, view: null, layout: null, focus: null, trail: [],
  sel: new Set(), primary: null,
  lens: 'kind', grain: 1, kindFilter: -1, force: null, lastEye: null,
  query: '', search: null,
  survey: null, scanning: false, watch: 'idle',
  // A warm start: the tree from the last session is drawn while the
  // directory is surveyed again ({ takenAt, pending: the folders to read
  // again once it has been, failed }); null otherwise. Changes wait while
  // it is set.
  warm: null,
  placing: null, drag: null,
  tab: 'contents', sort: { key: 'size', dir: -1 },
  // The Findings order a person chose; null keeps the search's own default.
  findSort: null,
  layoutTimer: 0, surveyTimer: 0,
  // Owned by feature modules, null until one fills it: the date scrub,
  // the open archive interior, benchmarks and the return point, working
  // sessions, and the search history and saved searches. ages is the
  // shared age table (timeline.js), rebuilt after every survey and null
  // until the first one.
  time: null, interior: null, places: null, ages: null, sessions: null, searches: null,
  // Region mode (regions.js): the client that holds the parts of a large
  // tree near the eye; null while the page holds the whole tree.
  regions: null,
};

/* ====================================================================== */
/* seams: registries that feature modules fill through install(api)       */
/* ====================================================================== */

/**
 * An ordered registry. Every entry is an object with a unique string id;
 * `order` (default 50) places it, and entries of equal order keep the
 * order they were added in. Iterating walks a copy, so an entry may
 * remove itself while the registry is being run.
 */
function registry(name, check) {
  const list = [];
  const reg = {
    name,
    add(entry) {
      if (!entry || typeof entry !== 'object') throw new TypeError(`${name}: an entry must be an object.`);
      if (typeof entry.id !== 'string' || !entry.id) throw new TypeError(`${name}: an entry needs an id.`);
      if (list.some((x) => x.id === entry.id)) throw new Error(`${name}: "${entry.id}" is already registered.`);
      check?.(entry, list);
      const order = entry.order ?? 50;
      let at = list.length;
      while (at > 0 && (list[at - 1].order ?? 50) > order) at--;
      list.splice(at, 0, entry);
      return entry;
    },
    remove(id) {
      const at = list.findIndex((x) => x.id === id);
      if (at >= 0) list.splice(at, 1);
      return at >= 0;
    },
    get: (id) => list.find((x) => x.id === id),
    ids: () => list.map((x) => x.id),
    get size() { return list.length; },
    [Symbol.iterator]: () => [...list][Symbol.iterator](),
  };
  return reg;
}

const needs = (name, ...fns) => (x) => {
  for (const f of fns) if (typeof x[f] !== 'function') throw new TypeError(`${name}: "${x.id}" needs ${f}().`);
};

/** Runs every hook of a list; a hook that throws is reported and the rest still run. */
function runHooks(reg, ...args) {
  for (const h of reg) {
    try {
      h.run(...args);
    } catch (err) {
      console.error(`${reg.name} "${h.id}" failed:`, err);
    }
  }
}

/**
 * The fixed key allocation for plain keys (no Ctrl, Cmd or Alt). A
 * reserved key is refused to any entry whose owner is not its owner. The
 * canvas keeps its travel keys; P is Quick look's; Session and Strata have
 * no keys.
 */
const KEY_OWNERS = Object.freeze({
  w: 'viewport', a: 'viewport', s: 'viewport', d: 'viewport', q: 'viewport', e: 'viewport', r: 'viewport', f: 'viewport',
  i: 'interiors',
  t: 'time', ',': 'time', '.': 'time', '<': 'time', '>': 'time',
  b: 'landmarks', h: 'landmarks', j: 'landmarks',
  p: 'quicklook',
});
const keyName = (k) => (k.length === 1 ? k.toLowerCase() : k);

/**
 * KEYS: the keyboard map and the guide, as data. An entry is
 *   { id, owner, keys: ['t'], mod: '' | 'ctrl' | 'alt', run(c), when?(c),
 *     inList, guide: [section, keys label, description] }
 * keys are KeyboardEvent.key values (letters match either case). mod ''
 * means neither Ctrl/Cmd nor Alt is held; 'ctrl' needs Ctrl or Cmd; 'alt'
 * needs Alt. inList (default true) lets the key act while the ledger list
 * has focus. run(c) gets { e, k, t, ctrl, alt, inList, onCanvas } and
 * returns false, exactly, when the key was not used, so the browser keeps
 * it. An entry with a guide row and no keys documents the pointer or the
 * canvas's own keys. Three fields are for the command palette only:
 * labels ({ key: label }, one palette item per key), palette: false (not
 * offered there) and gl: true (offered as unavailable without WebGL); c
 * then carries palette: true.
 */
const KEYS = registry('KEYS', (x, list) => {
  const mod = x.mod || '';
  if (!['', 'ctrl', 'alt'].includes(mod)) throw new TypeError(`KEYS: "${x.id}" has an unknown mod "${x.mod}".`);
  if (!x.keys && !x.guide) throw new TypeError(`KEYS: "${x.id}" has neither keys nor a guide row.`);
  if (x.keys && typeof x.run !== 'function') throw new TypeError(`KEYS: "${x.id}" needs run().`);
  for (const k of x.keys || []) {
    const name = keyName(k);
    const owner = mod === '' && Object.hasOwn(KEY_OWNERS, name) ? KEY_OWNERS[name] : undefined;
    if (owner && owner !== x.owner) throw new Error(`KEYS: "${k}" belongs to ${owner}, not ${x.owner || 'an unnamed owner'}.`);
    const taken = list.find((y) => (y.mod || '') === mod && y.keys?.some((z) => keyName(z) === name));
    if (taken) throw new Error(`KEYS: "${k}" is already bound to "${taken.id}".`);
  }
});
/** The entry that answers a key event, or undefined. */
KEYS.match = (c) => {
  const name = keyName(c.k);
  for (const x of KEYS) {
    if (!x.keys) continue;
    const mod = x.mod || '';
    if (mod === 'ctrl' ? !c.ctrl : mod === 'alt' ? !c.alt : c.ctrl || c.alt) continue;
    if (!x.keys.some((k) => keyName(k) === name)) continue;
    if (c.inList && x.inList === false) continue;
    if (x.when && !x.when(c)) continue;
    return x;
  }
  return undefined;
};
/** The guide's sections in order of first appearance: Map<title, [keys, text][]>. */
KEYS.guide = () => {
  const sections = new Map();
  for (const x of KEYS) {
    if (!x.guide) continue;
    const [title, keys, text] = x.guide;
    if (!sections.has(title)) sections.set(title, []);
    sections.get(title).push([keys, text]);
  }
  return sections;
};

/**
 * ESCAPE: what Escape undoes, first match wins: { id, order, active(),
 * clear(), typing }. Only entries with typing: true act while a text field
 * has focus. Orders: floating surface 10, placing 20, kind filter 30,
 * search 50, selection 70; a date scrub sits at 40, an interior after 70.
 */
const ESCAPE = registry('ESCAPE', needs('ESCAPE', 'active', 'clear'));

/**
 * PIN_SOURCES: { id, order, pins(L, room) -> [{ i, color }] | null }. The
 * sources add up in order and the total stops at the pin capacity. Orders:
 * places 10, search matches 20, heavyweight files 30.
 */
const PIN_SOURCES = registry('PIN_SOURCES', needs('PIN_SOURCES', 'pins'));
const PIN_CAP = 3000; // the viewport's pin capacity

/**
 * TIP_LINES: { id, order, lines(node, { i, type, L }) -> string | string[]
 * | null }. Lines follow the name and summary of the hovered block, scree
 * included (type is BOX.SCREE and node its folder).
 */
const TIP_LINES = registry('TIP_LINES', needs('TIP_LINES', 'lines'));

/**
 * INSPECTOR.focus: the "You are in" summary when nothing is selected;
 * INSPECTOR.node: the single selected item. Sections are { id, order,
 * build(node, ctx) -> Element | Element[] | null }; ctx carries ro (why
 * changes are unavailable, or null) and, for node, lockRoot and visible.
 * Node orders: title 0, path 5, facts 10, composition 20, copies 30,
 * actions 50, preview 60. Focus orders: title 0, facts 10, composition 20,
 * Reading the world 90. INSPECTOR.many: sections after the Actions grid of
 * a selection of several, { id, owner, order, build(nodes, ctx) }, where
 * ctx is { ro, off } (off: why changes are unavailable for this
 * selection, an archive's lock included, or null).
 */
const INSPECTOR = Object.freeze({
  focus: registry('INSPECTOR.focus', needs('INSPECTOR.focus', 'build')),
  node: registry('INSPECTOR.node', needs('INSPECTOR.node', 'build')),
  many: registry('INSPECTOR.many', needs('INSPECTOR.many', 'build')),
});

/** READING: the "Reading the world" rows: { id, order, glyph, title, text }. */
const READING = registry('READING', (x) => {
  for (const f of ['glyph', 'title', 'text']) if (typeof x[f] !== 'string') throw new TypeError(`READING: "${x.id}" needs ${f}.`);
});

/**
 * TABS: the ledger tabs: { id, order, label, draw(sub, host, keepScroll),
 * list, count(), enter(node), key(), selection }. list tabs draw into the
 * virtual list, the rest into the rich panel; count() puts a figure on the
 * tab; enter(node) is Enter on a list row (default: go there or open it);
 * key() adds to what decides whether the ledger keeps its scroll;
 * selection: false for a tab whose content does not follow the selection,
 * which a select then leaves as it is.
 */
const TABS = registry('TABS', (x) => {
  if (typeof x.label !== 'string') throw new TypeError(`TABS: "${x.id}" needs a label.`);
  needs('TABS', 'draw')(x);
});

/** LAYOUT_OPTS: { id, order, options(opts) -> object | null }, merged into buildLayout's options. */
const LAYOUT_OPTS = registry('LAYOUT_OPTS', needs('LAYOUT_OPTS', 'options'));

/**
 * Hook lists, each { id, order, run(...) }:
 * AFTER_LAYOUT run(L) at the end of every relayout;
 * AFTER_REFRESH run(dirs) in refreshDirs once selection, focus and trail
 *   are pruned, to prune or re-resolve a feature's own node references;
 * AFTER_SURVEY run(survey, { full }) whenever a survey is compiled; full
 *   is true when the whole model is new (first scan or Rescan all). The
 *   age table is rebuilt first (order 10), so later hooks read S.ages new.
 */
const AFTER_LAYOUT = registry('AFTER_LAYOUT', needs('AFTER_LAYOUT', 'run'));
const AFTER_REFRESH = registry('AFTER_REFRESH', needs('AFTER_REFRESH', 'run'));
const AFTER_SURVEY = registry('AFTER_SURVEY', needs('AFTER_SURVEY', 'run'));
/**
 * AFTER_OP run(body, res) once the service has carried out a change: body
 * is what was asked ({ type: 'rename', path, name }, { type: 'renames',
 * items: [{ path, name }] }, { type: 'move', paths, dest }, ...; { type:
 * 'undo' } for Undo) and res its answer (renamed: a path, or for renames
 * the [from, to] pairs; results, label; for an Undo, moved: the [from, to]
 * paths it carried back). A change that stopped part way runs it too, with res
 * { partial: true, results, label }: what it finished; an Undo that stopped
 * part way, with { partial: true, moved, label }: what it carried back. It
 * runs before the affected folders are re-read, so a feature that names places by path
 * can follow Terrane's own renames and moves (and their undo) before the
 * tree changes.
 */
const AFTER_OP = registry('AFTER_OP', needs('AFTER_OP', 'run'));

/**
 * MENU: context menu items from features: { id, order, items(node, ctx)
 * -> item[] | null, many(nodes, ctx) -> item[] | null }, at least one of
 * the two. items: node is the item the menu is for (null for the folder
 * you are in) and ctx is { ro }; they appear as a group after the first
 * one (Open, Reveal, Copy path) or, for the folder you are in, at the
 * end. many: the selection of several, ctx { ro, off }; they follow
 * Copy paths.
 */
const MENU = registry('MENU', (x) => {
  if (typeof x.items !== 'function' && typeof x.many !== 'function') throw new TypeError(`MENU: "${x.id}" needs items() or many().`);
});

/**
 * RENAME_MANY: what F2 does with more than one item selected: { id, owner,
 * run(nodes) }; the first entry wins. With one item, or none registered,
 * F2 renames the one item as it always has.
 */
const RENAME_MANY = registry('RENAME_MANY', needs('RENAME_MANY', 'run'));

/**
 * DUP_GROUP: what a feature adds under a group of duplicate candidates:
 * { id, owner, order, build(group, ctx) -> Element | Element[] | null }.
 * group is one of S.survey.dupGroups ({ size, files, waste, verified,
 * mode, hash }); ctx is { node, where, ro }: the inspected file and
 * 'inspector' in the inspector's copies, null and 'survey' after each
 * group's rows in the Survey tab.
 */
const DUP_GROUP = registry('DUP_GROUP', needs('DUP_GROUP', 'build'));

/** QUERY: search tokens for parseQuery: is.<word>(node) and prefix.<name>(value, raw) -> predicate. */
const QUERY = Object.freeze({ is: {}, prefix: {} });

/**
 * AFTER_QUERY run(search, query) whenever the search has been run again:
 * typed, cleared, set by setQuery, or re-run after a refresh or a survey.
 * search is S.search (null when Find is empty). A hook may annotate it for
 * the Findings tab: search.sort, the order it opens in ({ key: 'size' |
 * 'date', dir }), and search.note, a sentence under the sort keys.
 */
const AFTER_QUERY = registry('AFTER_QUERY', needs('AFTER_QUERY', 'run'));

/**
 * SURVEY: the sections of the Survey tab: { id, order, build(survey) ->
 * Element | null }. Orders: largest files 10, duplicate candidates 20,
 * empty folders 30, sealed folders 40, symbolic links 50; working
 * sessions sit first, at 5.
 */
const SURVEY = registry('SURVEY', needs('SURVEY', 'build'));

/**
 * COMMANDS: what the command palette offers besides the keys, actions
 * that have none: { id, owner, order, section, items() -> [{ label,
 * detail?, hint?, run(), off?: string | null }] }. items() runs each time
 * the palette opens, so it can say what applies now; an item that cannot
 * run gives the reason as off. A static command returns one item.
 */
const COMMANDS = registry('COMMANDS', needs('COMMANDS', 'items'));

/**
 * LEDGER_SUB: controls on the ledger's count row: { id, owner, order,
 * tab: 'contents' | 'findings', build(ctx) -> Element | Element[] | null },
 * where ctx is { items (the rows in the order shown), search, focus }.
 * They stand in a span.sub-tools after the count and its keys (Findings:
 * its first sub-row). Every control carries data-k, so a redraw keeps
 * focus on it.
 */
const LEDGER_SUB = registry('LEDGER_SUB', (x) => {
  if (x.tab !== 'contents' && x.tab !== 'findings') throw new TypeError(`LEDGER_SUB: "${x.id}" needs tab 'contents' or 'findings'.`);
  needs('LEDGER_SUB', 'build')(x);
});

/**
 * AFTER_FOCUS run(dir) once the folder you are in has changed: moveFocus,
 * and a refresh, the catch-up or Rescan all that moved it (focusMoved).
 * AFTER_SELECT run(sel, primary) at the end of every selection change,
 * select() (quiet ones included) and selectAll(). Both run often: a hook
 * must be cheap, and defer anything that is not.
 */
const AFTER_FOCUS = registry('AFTER_FOCUS', needs('AFTER_FOCUS', 'run'));
const AFTER_SELECT = registry('AFTER_SELECT', needs('AFTER_SELECT', 'run'));

/**
 * TAB_SECTIONS: sections a feature adds to a tab another one draws: { id,
 * owner, order, tab, build() -> Element | null }. The tab's draw appends
 * api.tabSections(tab), in order; one that throws is reported and left out.
 */
const TAB_SECTIONS = registry('TAB_SECTIONS', (x) => {
  if (typeof x.tab !== 'string' || !x.tab) throw new TypeError(`TAB_SECTIONS: "${x.id}" needs a tab.`);
  needs('TAB_SECTIONS', 'build')(x);
});

for (const reg of [KEYS, ESCAPE, PIN_SOURCES, TIP_LINES, INSPECTOR.focus, INSPECTOR.node, INSPECTOR.many, READING, TABS, LAYOUT_OPTS, AFTER_LAYOUT, AFTER_REFRESH, AFTER_SURVEY, AFTER_OP, MENU, AFTER_QUERY, SURVEY,
  COMMANDS, LEDGER_SUB, AFTER_FOCUS, AFTER_SELECT, TAB_SECTIONS, RENAME_MANY, DUP_GROUP]) Object.freeze(reg);

/* ====================================================================== */
/* service                                                                */
/* ====================================================================== */

async function asError(res) {
  let body = {};
  try {
    body = await res.json();
  } catch { /* not json */ }
  const err = new Error(body.message || `The service answered ${res.status}.`);
  err.code = body.code || String(res.status);
  err.affected = body.affected || [];
  // A change that stopped part way names what it finished; an Undo, what it carried back.
  if (Array.isArray(body.results)) err.results = body.results;
  if (Array.isArray(body.moved)) err.moved = body.moved;
  return err;
}

async function get(route, params = {}) {
  const res = await fetch(`/api/${route}?${new URLSearchParams(params)}`, { headers: { 'X-Terrane-Token': TOKEN } });
  if (!res.ok) throw await asError(res);
  return res.json();
}

async function post(route, body = {}) {
  let res;
  try {
    res = await fetch(`/api/${route}`, {
      method: 'POST', headers: { 'X-Terrane-Token': TOKEN, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
  } catch {
    throw new Error('The Terrane service is not reachable. Is it still running?');
  }
  if (!res.ok) throw await asError(res);
  return res.json();
}

/**
 * Streams scanner records from the service, one batch to onBatch per
 * line: /api/scan for rel to depth (0: all of it), or another route that
 * answers the same NDJSON (/api/warm, the tree from the last session).
 * signal stops it.
 */
async function scanStream(rel, depth, onBatch, { route = 'scan', signal } = {}) {
  const params = new URLSearchParams(route === 'scan' ? { path: rel } : {});
  if (depth) params.set('depth', depth);
  const res = await fetch(`/api/${route}?${params}`, { headers: { 'X-Terrane-Token': TOKEN }, signal });
  if (!res.ok) throw await asError(res);
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let nl;
      while ((nl = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, nl);
        buf = buf.slice(nl + 1);
        if (line) onBatch(JSON.parse(line));
      }
    }
  } catch (err) {
    // A line that is not JSON (a kept tree cut short) lets the stream go.
    reader.cancel().catch(() => {});
    throw err;
  }
}

// The demo world draws pictures and sounds itself; text still comes
// through /api/raw, which it answers in the page.
const rawUrl = (node, max) => DEMO?.rawUrl(relPath(node), max) || `/api/raw?${new URLSearchParams({ path: relPath(node), max, t: TOKEN })}`;
const absPath = (node) => {
  // Inside an open archive: the archive's own path, '!', then the entry's
  // path inside it, x.zip!/inner/file.
  const I = S.interior;
  if (I) {
    const inner = [];
    for (let a = node; a; a = a.p) {
      if (a === I.root) return `${absPath(I.host)}!/${inner.reverse().join('/')}`;
      inner.push(a.n);
    }
  }
  const rel = relPath(node);
  return rel ? S.info.root + S.info.sep + rel.split('/').join(S.info.sep) : S.info.root;
};

/**
 * A node's path as a person reads it inside the directory: absPath without
 * the root and its separator, joined with '/'; the root itself is '.',
 * and inside an open archive it reads dir/x.zip!/inner/file.
 */
const relLabel = (node) => {
  const I = S.interior;
  if (I) {
    const inner = [];
    for (let a = node; a; a = a.p) {
      if (a === I.root) return `${relLabel(I.host)}!/${inner.reverse().join('/')}`;
      inner.push(a.n);
    }
  }
  return relPath(node) || '.';
};

/* ====================================================================== */
/* scanning and refresh                                                   */
/* ====================================================================== */

/**
 * Streams a survey of dir into the model. switchAt (the region threshold,
 * when the service could not say how large the tree is): once the tree
 * holds more entries than that, the survey stops and rejects with
 * err.switchToRegions, and the page reads the tree in regions instead.
 */
async function scanInto(dir, { switchAt = 0 } = {}) {
  const idMap = [];
  const ac = switchAt ? new AbortController() : null;
  let over = false;
  try {
    await scanStream(relPath(dir), 0, (records) => {
      if (over) return;
      S.model.ingest(records, idMap, dir);
      const r = S.model.root;
      if (switchAt && r.fc + r.dc + 1 > switchAt) {
        over = true;
        ac.abort();
        return;
      }
      if (!S.noGL) hideVeil();
      queueLayout();
      drawStatus();
      endSplash();
    }, { signal: ac?.signal });
  } catch (err) {
    if (!over) throw err;
  }
  if (over) {
    const err = new Error('The directory holds more entries than the page keeps whole.');
    err.switchToRegions = true;
    throw err;
  }
}

/**
 * Whether a node is still in the tree. An open archive's root hangs from
 * its file (S.interior), which has no children of its own: that one link
 * holds while the archive is open, and no other link through a file does.
 */
function isAttached(node) {
  const I = S.interior;
  let a = node;
  while (a.p) {
    const p = a.p;
    if (p.d ? !p.c.includes(a) : !(I && a === I.root && p === I.host)) return false;
    a = p;
  }
  return a === S.model.root;
}

/** The open archive's file when node is inside it (its root included); null otherwise. */
function hostOf(node) {
  const I = S.interior;
  if (!I || !node) return null;
  for (let a = node; a; a = a.p) if (a === I.root) return I.host;
  return null;
}

let refreshChain = Promise.resolve();
/**
 * Re-reads the given folders (root-relative paths) and merges the result.
 * While the tree from the last session is being checked (S.warm) they
 * are noted and read once it has been; the promise settles then. kept:
 * the service read them into its tree itself (a change event it marked
 * so), which in region mode is asked for without a read of the disk.
 */
function refreshDirs(rels, { kept = false } = {}) {
  if (S.warm) {
    for (const rel of rels) S.warm.pending.add(rel);
    return S.warm.done;
  }
  if (S.regions) return refreshRegions(rels, kept);
  refreshChain = refreshChain.then(async () => {
    const dirs = new Set();
    for (const rel of rels) {
      let node = S.model.find(rel);
      let path = rel;
      while (!node && path) {
        path = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '';
        node = S.model.find(path);
      }
      // A path that goes on through a file reaches into an open archive:
      // the folder its file is in is the one on disk to read again.
      if (node && !node.d && path !== rel) node = node.p;
      if (node && node.d) dirs.add(node);
    }
    // A folder gone from disk is read again through its parent, in this
    // same pass: waiting on another refresh from inside the chain would
    // wait on itself, and every later refresh would wait behind it.
    const queue = [...dirs];
    for (let q = 0; q < queue.length; q++) {
      const dir = queue[q];
      if (!isAttached(dir)) continue;
      const records = [];
      try {
        await scanStream(relPath(dir), 1, (batch) => records.push(...batch));
      } catch (err) {
        let up = dir.p;
        if (up && !up.d) up = up.p;
        if (err.code === 'ENOENT' && up && !dirs.has(up)) {
          dirs.add(up);
          queue.push(up);
        }
        continue;
      }
      const { added } = S.model.reconcile(dir, records);
      for (const child of added) await scanInto(child);
    }
    const was = S.focus;
    for (const n of [...S.sel]) if (!isAttached(n)) S.sel.delete(n);
    if (S.primary && !isAttached(S.primary)) S.primary = [...S.sel].at(-1) || null;
    if (!isAttached(S.focus)) S.focus = S.model.root;
    S.trail = S.trail.filter(isAttached);
    runHooks(AFTER_REFRESH, dirs);
    focusMoved(was);
    if (S.search) runQuery();
    queueLayout(40);
    queueSurvey();
    drawAll();
  }).catch((err) => notice(`Refresh failed: ${err.message}`, { kind: 'error' }));
  return refreshChain;
}

/**
 * Region mode: folders read again by the service (fresh=1), or already
 * read into its tree (kept), and what the page holds filled again with
 * its nodes kept, its pinned children named so a refill keeps them. What
 * arrives while one refresh runs waits for the next, which takes it all
 * at once. The search and the survey of the changed tree are asked again
 * no more often than their cost allows (queueQueryAgain, queueSurvey).
 */
let regionBatch = null;
function refreshRegions(rels, kept) {
  if (!regionBatch) {
    const batch = { fresh: new Set(), kept: new Set(), done: null };
    regionBatch = batch;
    batch.done = refreshChain = refreshChain.then(async () => {
      if (regionBatch === batch) regionBatch = null;
      const R = S.regions;
      if (!R) return;
      const dirs = new Set();
      for (const [list, k] of [[batch.fresh, false], [batch.kept, true]]) {
        if (!list.size) continue;
        const got = await R.refresh([...list], { kept: k });
        if (got.stale || S.regions !== R) return;
        for (const d of got.dirs) dirs.add(d);
      }
      const was = S.focus;
      for (const n of [...S.sel]) if (!isAttached(n)) S.sel.delete(n);
      if (S.primary && !isAttached(S.primary)) S.primary = [...S.sel].at(-1) || null;
      if (!isAttached(S.focus)) S.focus = S.model.root;
      S.trail = S.trail.filter(isAttached);
      runHooks(AFTER_REFRESH, dirs);
      focusMoved(was);
      if (S.search) queueQueryAgain();
      queueLayout(40);
      queueSurvey();
      drawAll();
    }).catch((err) => notice(`Refresh failed: ${err.message}`, { kind: 'error' }));
  }
  for (const rel of rels) regionBatch[kept ? 'kept' : 'fresh'].add(rel);
  return regionBatch.done;
}

/** The service's own time for the last search (GET /api/find's ms), which sets how soon a change asks it again. */
let lastFindMs = 0;
let queryAgainTimer = 0;
/**
 * Region mode: the search in Find asked again after a change, at most
 * once in six times the service's last search took, so a stream of
 * changes leaves most of the service's time to the regions.
 */
function queueQueryAgain() {
  if (queryAgainTimer) return;
  queryAgainTimer = setTimeout(() => {
    queryAgainTimer = 0;
    if (S.search?.regions) runQuery();
  }, Math.max(250, lastFindMs * 6));
}

function queueSurvey() {
  // Region mode: one survey waits at a time, and a change does not push
  // it back, so a stream of changes still sees the survey kept current.
  if (S.regions) {
    if (!S.surveyTimer) S.surveyTimer = setTimeout(surveyNow, 500);
    return;
  }
  clearTimeout(S.surveyTimer);
  S.surveyTimer = setTimeout(surveyNow, 500);
}

/** Compiles the survey of the tree as it is now; a queued one runs here instead. */
function surveyNow() {
  clearTimeout(S.surveyTimer);
  S.surveyTimer = 0;
  if (S.regions) return surveyRegions();
  S.survey = S.model.survey();
  S.survey.dupGroups = keepVerified(S.survey.dupGroups);
  S.model.dupGroups = S.survey.dupGroups;
  runHooks(AFTER_SURVEY, S.survey, { full: false });
  repaint();
  if (S.tab === 'survey') drawLedger();
  drawLegend();
}

/** The change stream, once connected: after the first survey, or once a warm start has drawn its tree. */
let events = null;
function connectEvents() {
  if (events) return;
  const es = new EventSource(`/api/events?${new URLSearchParams({ t: TOKEN, dirs: S.model.root.dc })}`);
  events = es;
  es.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.type === 'job') return onJob(msg);
    if (msg.type === 'watch') S.watch = msg.state;
    else if (msg.type === 'change' && !S.scanning) refreshDirs(msg.dirs, { kept: !!msg.kept });
    else if (msg.type === 'bulk') {
      notice(`${fmtCount(msg.count)} folders changed on disk.`, { kind: 'info', action: { label: 'Rescan all', run: fullScan } });
    } else if (msg.type === 'checked') regionsChecked();
    else if (msg.type === 'swept') {
      // The sweep after a check: files rewritten in place, which a folder's
      // time does not show, arrived as ordinary changes and were read again.
      if (msg.changed > 0) notice(`${plural(msg.changed, 'file')} rewritten in place since the last session ${msg.changed === 1 ? 'was' : 'were'} read again.`, { kind: 'info' });
    } else if (msg.type === 'snapshot') {
      S.info.snapshot = { ...S.info.snapshot, takenAt: msg.takenAt, folders: msg.folders, files: msg.files };
      notice(`A newer snapshot is ready: ${fmtCount(msg.files)} files, taken ${fmtDate(msg.takenAt)}.`,
        { kind: 'info', action: { label: 'Rescan', run: fullScan }, ms: 20000 });
    }
    drawStatus();
    return undefined;
  };
  es.onerror = () => {
    S.watch = 'lost';
    drawStatus();
  };
}

async function fullScan() {
  // In region mode the service reads the tree afresh and the page opens
  // it again, keeping the folder you are in by its path.
  if (S.regions) {
    stopPlacing();
    return reopenRegions({ build: true });
  }
  // A survey of the whole directory replaces the tree from the last
  // session too: its own survey stops, and what waited for it is let go.
  const W = S.warm;
  if (W) {
    catching?.abort();
    S.warm = null;
    W.release();
  }
  S.scanning = true;
  stopPlacing();
  const name = S.info.name;
  const was = S.focus;
  S.model = new Model(name);
  S.focus = S.model.root;
  S.sel.clear();
  S.primary = null;
  S.trail = [];
  S.survey = null;
  S.ages = null;
  // Nothing may keep the old tree reachable or on screen: the forced
  // unfold, the search and its sorted copy, the sessions and a held
  // flight all hold its nodes. The query stays in Find and runs again on
  // the new tree once it has been surveyed.
  S.force = null;
  S.search = null;
  S.sessions = null;
  findCache = { search: null, key: '', items: [] };
  hold = null;
  drawAll();
  focusMoved(was);
  thumbs.reload(TOKEN);
  try {
    await scanInto(S.model.root, { switchAt: switchAt() });
  } catch (err) {
    if (err.switchToRegions) return startRegions({ build: true });
    fatal('The survey stopped', err.message);
  }
  S.scanning = false;
  S.survey = S.model.survey();
  runHooks(AFTER_SURVEY, S.survey, { full: true });
  // A hook may have run it already (a session: search).
  if (S.query && !S.search) runQuery();
  relayout();
  drawAll();
}

/* ====================================================================== */
/* warm start: the tree from the last session, then a survey to catch up  */
/* ====================================================================== */

/** Why changes wait during a warm start, as a menu or button gives a reason. */
const WARM_WAIT = 'the tree from the last session is still being checked';
/** The same as the sentence a refused change says. */
const WARM_SENTENCE = `Changes wait while ${WARM_WAIT}. They are available again once the directory has been surveyed.`;

/** performance.now() when the first layout that drew a box was made; null before. */
let firstDrawMs = null;
/** Whether this page was drawn from the tree from the last session, and when its catch-up ended. */
const warmRecord = { used: false, settledMs: null };
/** The check's (or a survey again's) AbortController while it runs. */
let catching = null;

/** What a check found, in one sentence. */
const checkedSentence = ({ read = 0, changed = 0, added = 0, removed = 0 }) => (changed || added || removed
  ? `Checked against the disk: ${plural(read, 'folder')} read again; ${plural(changed, 'file')} changed, ${fmtCount(added)} here now, ${fmtCount(removed)} gone since the last session.`
  : 'Nothing changed since the last session.');

/** A new S.warm: what the page is waiting for, and a promise that settles once it has caught up. */
function warmState(takenAt) {
  let release;
  const done = new Promise((r) => { release = r; });
  return { takenAt, pending: new Set(), failed: false, done, release, notice: null };
}

/**
 * Says that changes wait, when they do, and returns true. Every change
 * refuses while the tree from the last session is checked; this says so
 * before a dialog asks for a name or a destination.
 */
function refuseWarm() {
  if (!S.warm) return false;
  notice(WARM_SENTENCE, { kind: 'info' });
  return true;
}

/**
 * Draws the tree the service kept from the last complete survey, before
 * anything is read from disk. Resolves to true once it is drawn; false
 * when it could not be read whole (a stream that broke, counts that do
 * not match its meta), and the page then surveys from nothing.
 */
async function warmStart(w) {
  const idMap = [];
  try {
    await scanStream('', 0, (records) => S.model.ingest(records, idMap, S.model.root), { route: 'warm' });
  } catch {
    return false;
  }
  const r = S.model.root;
  if (r.dc + 1 !== w.folders || r.fc !== w.files) return false;
  S.scanning = false;
  warmRecord.used = true;
  if (!S.noGL) hideVeil();
  clearTimeout(S.layoutTimer);
  S.layoutTimer = 0;
  S.survey = S.model.survey();
  runHooks(AFTER_SURVEY, S.survey, { full: true, warm: true });
  relayout();
  drawAll();
  endSplash();
  return true;
}

/**
 * Checks the tree from the last session against the disk while it stays
 * on screen: the service reads its cache, lists again only the folders
 * whose modification times changed (GET /api/check) and answers each as
 * it goes; once it is done they are taken on folder by folder
 * (Model.reconcile, and Model.ingest for a new folder), so the selection,
 * the location, benchmarks and anything else that holds a node keep it.
 * The eye stays where it was relative to the folder you are in. Changes
 * wait until then; the folders the change stream or a refresh asked for
 * meanwhile are read afterwards, so what changed while it ran is not
 * lost. A file rewritten in place keeps its folder's time: the service's
 * sweep finds those afterwards and sends them as ordinary changes.
 */
async function checkUp() {
  const W = S.warm;
  if (!W || catching) return;
  W.failed = false;
  drawStatus();
  const ac = new AbortController();
  catching = ac;
  const reads = [];
  let done = null;
  try {
    await scanStream('', 0, (msg) => {
      if (msg.error) throw new Error(msg.error);
      if (msg.done) done = msg;
      else reads.push(msg);
    }, { route: 'check', signal: ac.signal });
    if (!done) throw new Error('the check ended before it was done');
  } catch (err) {
    if (ac.signal.aborted || S.warm !== W) return;
    W.failed = true;
    drawStatus();
    notice(`The directory could not be surveyed again (${err.message}). The tree from the last session stays on screen, and changes wait until a survey has checked it.`,
      { kind: 'error', ms: 30000, action: { label: 'Survey again', run: surveyAgain } });
    return;
  } finally {
    if (catching === ac) catching = null;
  }
  if (ac.signal.aborted || S.warm !== W) return;
  // Where the eye stands relative to the box of the folder you are in,
  // unless it is on its way somewhere.
  let at = null;
  if (!S.noGL && S.layout && !S.view.flight && !S.view.keys?.size) {
    const i = S.layout.index.get(S.focus);
    if (i !== undefined && i < S.view.n) {
      const a = anchorOf(S.layout, i);
      at = { dir: S.focus, a, pose: poseRelative(S.view.pose(), a) };
    }
  }
  // Parents first: a folder listed again, then each new folder in it whole.
  for (const r of reads) {
    const node = S.model.find(r.dir);
    if (!node?.d) continue;
    if (r.records) S.model.reconcile(node, r.records);
    else if (r.deep) S.model.ingest(r.deep, [], node);
  }
  const was = S.focus;
  for (const n of [...S.sel]) if (!isAttached(n)) S.sel.delete(n);
  if (S.primary && !isAttached(S.primary)) S.primary = [...S.sel].at(-1) || null;
  if (!isAttached(S.focus)) S.focus = S.model.root;
  S.trail = S.trail.filter(isAttached);
  runHooks(AFTER_REFRESH, null);
  focusMoved(was);
  clearTimeout(S.surveyTimer);
  S.surveyTimer = 0;
  S.survey = S.model.survey();
  S.survey.dupGroups = keepVerified(S.survey.dupGroups);
  S.model.dupGroups = S.survey.dupGroups;
  runHooks(AFTER_SURVEY, S.survey, { full: false, settled: true });
  // The tree is checked: changes, benchmarks and refreshes go ahead again.
  S.warm = null;
  W.notice?.();
  if (S.search) runQuery();
  clearTimeout(S.layoutTimer);
  S.layoutTimer = 0;
  // The location holds through the new layout while the eye stands where
  // it was; if the folder's box moved as the totals changed, the eye
  // moves with it and the location holds while it stands there.
  const held = hold;
  if (at && isAttached(at.dir)) hold = { dir: at.dir, goal: S.view.pose() };
  relayout();
  hold = held;
  if (at && isAttached(at.dir)) {
    const i = S.layout.index.get(at.dir);
    if (i !== undefined && i < S.view.n) {
      const a = anchorOf(S.layout, i);
      if (a.x !== at.a.x || a.y !== at.a.y || a.z !== at.a.z || a.w !== at.a.w) {
        S.view.flyTo(vantage(at.pose, a), 0);
        hold = { dir: at.dir, goal: S.view.pose() };
      }
    }
  }
  drawAll();
  warmRecord.settledMs = Math.round(performance.now());
  const pending = [...W.pending];
  (pending.length ? refreshDirs(pending) : Promise.resolve()).then(W.release, W.release);
  notice(checkedSentence(done), { kind: 'info' });
}

/**
 * What Survey again does after a check failed: the whole directory
 * surveyed as it is now while the tree from the last session stays on
 * screen, then taken on node by node (Model.adopt), so the selection, the
 * location, benchmarks and anything else that holds a node keep it. The
 * eye stays where it was relative to the folder you are in. Changes wait
 * until then; the folders the change stream or a refresh asked for
 * meanwhile are read afterwards, so what changed while it ran is not lost.
 */
async function surveyAgain() {
  const W = S.warm;
  if (!W || catching) return;
  W.failed = false;
  drawStatus();
  const ac = new AbortController();
  catching = ac;
  const fresh = new Model(S.info.name);
  const idMap = [];
  try {
    await scanStream('', 0, (records) => fresh.ingest(records, idMap, fresh.root), { signal: ac.signal });
  } catch (err) {
    if (ac.signal.aborted || S.warm !== W) return;
    W.failed = true;
    drawStatus();
    notice(`The directory could not be surveyed again (${err.message}). The tree from the last session stays on screen, and changes wait until a survey has checked it.`,
      { kind: 'error', ms: 30000, action: { label: 'Survey again', run: surveyAgain } });
    return;
  } finally {
    if (catching === ac) catching = null;
  }
  if (ac.signal.aborted || S.warm !== W) return;
  // Where the eye stands relative to the box of the folder you are in,
  // unless it is on its way somewhere.
  let at = null;
  if (!S.noGL && S.layout && !S.view.flight && !S.view.keys?.size) {
    const i = S.layout.index.get(S.focus);
    if (i !== undefined && i < S.view.n) {
      const a = anchorOf(S.layout, i);
      at = { dir: S.focus, a, pose: poseRelative(S.view.pose(), a) };
    }
  }
  const counts = S.model.adopt(fresh);
  const was = S.focus;
  for (const n of [...S.sel]) if (!isAttached(n)) S.sel.delete(n);
  if (S.primary && !isAttached(S.primary)) S.primary = [...S.sel].at(-1) || null;
  if (!isAttached(S.focus)) S.focus = S.model.root;
  S.trail = S.trail.filter(isAttached);
  runHooks(AFTER_REFRESH, null);
  focusMoved(was);
  clearTimeout(S.surveyTimer);
  S.surveyTimer = 0;
  S.survey = S.model.survey();
  S.survey.dupGroups = keepVerified(S.survey.dupGroups);
  S.model.dupGroups = S.survey.dupGroups;
  runHooks(AFTER_SURVEY, S.survey, { full: false, settled: true });
  // The tree is checked: changes, benchmarks and refreshes go ahead again.
  S.warm = null;
  W.notice?.();
  if (S.search) runQuery();
  clearTimeout(S.layoutTimer);
  S.layoutTimer = 0;
  // The location holds through the new layout while the eye stands where
  // it was; if the folder's box moved as the totals changed, the eye
  // moves with it and the location holds while it stands there.
  const held = hold;
  if (at && isAttached(at.dir)) hold = { dir: at.dir, goal: S.view.pose() };
  relayout();
  hold = held;
  if (at && isAttached(at.dir)) {
    const i = S.layout.index.get(at.dir);
    if (i !== undefined && i < S.view.n) {
      const a = anchorOf(S.layout, i);
      if (a.x !== at.a.x || a.y !== at.a.y || a.z !== at.a.z || a.w !== at.a.w) {
        S.view.flyTo(vantage(at.pose, a), 0);
        hold = { dir: at.dir, goal: S.view.pose() };
      }
    }
  }
  drawAll();
  warmRecord.settledMs = Math.round(performance.now());
  const pending = [...W.pending];
  (pending.length ? refreshDirs(pending) : Promise.resolve()).then(W.release, W.release);
  const { changed, added, removed } = counts;
  notice(changed || added || removed
    ? `Surveyed again: ${plural(changed, 'file')} changed, ${fmtCount(added)} here now, ${fmtCount(removed)} gone since the last session.`
    : 'Nothing changed since the last session.', { kind: 'info' });
}

/* ====================================================================== */
/* region mode: a tree too large to hold whole, held near the eye         */
/* ====================================================================== */

/** What the loading sheet and the veil say while a large tree is read in regions. */
const REGION_STAGE = 'Large directory: reading it in regions';

/**
 * The survey in region mode until the service's is in: every list empty
 * and pending set, so the Survey tab says it is being compiled.
 */
const regionSurvey = () => ({
  regions: true, pending: true, largest: [], heavy: [], empty: [], sealed: [], links: [], counts: { empty: 0, sealed: 0, links: 0 }, dupGroups: [], base: [],
});

/** The sentence a whole-tree question the service does not answer gives in region mode: the twins of an open archive. */
const notAtSize = (what) => `${what} is not available at this size.`;

/** The most matches a search lists in region mode, and how many Select all takes. */
const FIND_LIMIT = 5000;
const SELECT_ALL_REGIONS = 1000;
/** Folders whose marks one request asks for. */
const MARK_CHUNK = 1500;

/**
 * The entries past which a whole survey stops and the page reads the tree
 * in regions: the threshold, when the service could not say how large the
 * tree is; 0 (never) when it could, or when it draws every tree in regions.
 */
function switchAt() {
  const R = S.info?.regions;
  return R && R.threshold > 0 && R.entries === null ? R.threshold : 0;
}

/* ---------- the transport: a worker decodes, the main thread builds ---------- */

let regionWorker = null;

/** A query string from params, a list value as its key repeated (with=a&with=b). */
function regionQuery(params) {
  const out = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (Array.isArray(v)) for (const x of v) out.append(k, x);
    else if (v !== undefined && v !== null) out.append(k, v);
  }
  return out;
}

/** A region answer read and decoded on the main thread: the demo world, and a page with no worker. */
async function mainThreadRegion(params) {
  const res = await fetch(`/api/region?${regionQuery(params)}`, { headers: { 'X-Terrane-Token': TOKEN } });
  if (!res.ok) {
    const err = await asError(res);
    err.status = res.status;
    throw err;
  }
  const text = await res.text();
  const out = decode(JSON.parse(text));
  out.bytes = text.length;
  return out;
}

/**
 * The region worker (region-worker.js), made the first time it is needed;
 * none in the demo world, whose answers a worker's fetch never reaches,
 * nor where workers are missing. A worker that fails hands what waits on
 * it, and everything after, to the main thread.
 */
function regionWorkerOf() {
  if (regionWorker !== null) return regionWorker || null;
  if (DEMO || typeof Worker !== 'function') {
    regionWorker = false;
    return null;
  }
  try {
    const w = new Worker(new URL('./region-worker.js', import.meta.url), { type: 'module' });
    const rw = { w, seq: 0, pending: new Map() };
    w.onmessage = (e) => {
      const m = e.data || {};
      const p = rw.pending.get(m.id);
      if (!p) return;
      rw.pending.delete(m.id);
      if (m.ok) p.resolve(m);
      else {
        const err = new Error(m.message);
        err.code = m.code;
        err.status = m.status;
        p.reject(err);
      }
    };
    w.onerror = (e) => {
      e.preventDefault?.();
      regionWorker = false;
      for (const p of rw.pending.values()) p.retry().then(p.resolve, p.reject);
      rw.pending.clear();
      w.terminate();
    };
    w.postMessage({ type: 'init', token: TOKEN });
    regionWorker = rw;
  } catch {
    regionWorker = false;
  }
  return regionWorker || null;
}

/** The region client's transport: /api/region through the worker (decoded there), anything else as get(). */
function regionFetch(route, params) {
  if (route !== 'region') return get(route, params);
  const rw = regionWorkerOf();
  if (!rw) return mainThreadRegion(params);
  return new Promise((resolve, reject) => {
    const id = ++rw.seq;
    rw.pending.set(id, { resolve, reject, retry: () => mainThreadRegion(params) });
    rw.w.postMessage({ id, url: `/api/region?${regionQuery(params)}` });
  });
}

/**
 * A whole-tree question's answer from the service (find, marks, survey,
 * sessions, places), for the generation the page holds: parsed in the
 * worker when there is one, so a long list never parses on the main
 * thread. A stale generation opens the tree again.
 */
const asked = { find: 0, marks: 0, survey: 0, sessions: 0, places: 0, ms: [] };
function askTree(route, params = {}) {
  const all = { v: String(S.regions?.v ?? 1), ...params };
  asked[route] = (asked[route] || 0) + 1;
  const t0 = performance.now();
  const rw = regionWorkerOf();
  const direct = () => get(route, all);
  const p = !rw ? direct() : new Promise((resolve, reject) => {
    const id = ++rw.seq;
    rw.pending.set(id, { resolve: (m) => resolve(m.json), reject, retry: () => direct().then((json) => ({ json })) });
    rw.w.postMessage({ id, url: `/api/${route}?${new URLSearchParams(all)}`, json: true });
  });
  return p.then((json) => {
    // How long each answer took, for the scale measurement: the last 200.
    asked.ms.push([route, Math.round(performance.now() - t0), json?.ms ?? null]);
    if (asked.ms.length > 200) asked.ms.shift();
    return json;
  }, (err) => {
    if (err?.code === 'ESTALE' && S.regions) reopenRegions({ build: false });
    throw err;
  });
}

/* ---------- opening a tree in regions ---------- */

const regionClient = (model) => createRegions({
  fetchJSON: regionFetch, model, onStale: () => { reopenRegions({ build: false }); }, onLanded: regionsLanded,
  // A search's marks ride on every region asked for while it shows.
  extra: () => (S.search?.regions && S.search.qid ? { q: S.search.qid } : null),
  onFilled: regionMarks,
  // What a refill must keep wherever it ranks: the pins, and what is selected.
  pinned: () => {
    const pins = regionPins();
    return (n) => pins.has(n) || S.sel.has(n) || n === S.primary || n === S.focus || n === S.interior?.host;
  },
  // A folder the service no longer has: its parent, as the service's tree now says.
  onGone: (node) => { if (node.p) refreshDirs([relPath(node.p)], { kept: true }); },
});

/**
 * Puts a client whose tree is open in place of what was shown: a new
 * model, nothing selected, the folder you are in its root; the survey's
 * placeholder and its hooks; a layout from the root's region.
 */
function takeRegions(client) {
  S.regions?.close();
  const was = S.focus;
  S.regions = client;
  S.model = client.model;
  S.focus = S.model.root;
  S.sel.clear();
  S.primary = null;
  S.trail = [];
  S.force = null;
  S.search = null;
  S.sessions = null;
  findCache = { search: null, key: '', items: [] };
  hold = null;
  S.scanning = false;
  clearTimeout(S.layoutTimer);
  S.layoutTimer = 0;
  S.survey = regionSurvey();
  provedRel.clear();
  focusMoved(was);
  runHooks(AFTER_SURVEY, S.survey, { full: true, regions: true });
  relayout();
  drawAll();
  // The service's survey of the whole tree, and the search in Find on it.
  surveyNow();
  if (S.query.trim()) runQuery();
}

/**
 * Starts region mode: at once when the service says the tree is above the
 * threshold, or once a whole survey passed it (build: the service reads
 * the tree afresh, and the partial model is dropped). The loading sheet
 * and the veil say so while the service reads.
 */
async function startRegions({ build = false, t0 = performance.now() } = {}) {
  splash?.stage(REGION_STAGE);
  if (!S.noGL) fatal(REGION_STAGE, S.info.root, 'busy');
  S.scanning = true;
  S.model = new Model(S.info.name);
  S.focus = S.model.root;
  S.sel.clear();
  S.primary = null;
  S.survey = null;
  drawAll();
  const client = regionClient(new Model(S.info.name, { regions: true }));
  let tree;
  try {
    tree = await client.open({
      build,
      onProgress: (t) => {
        const p = t.progress;
        if (p?.of) splash?.progress((p.folders + p.files) / p.of);
      },
    });
  } catch (err) {
    endSplash();
    fatal('The survey stopped', err.message);
    return;
  }
  splash?.progress(null);
  takeRegions(client);
  if (!S.noGL) hideVeil();
  expose(t0);
  if (tree.error) notice(tree.error, { kind: 'error' });
  // Read from the tree the last session kept, and being checked: changes
  // wait until the service says it is (GET /api/tree, or 'checked').
  if (tree.warm?.checking) {
    warmRecord.used = true;
    S.warm = warmState(tree.warm.takenAt);
    S.warm.notice = notice(`Showing ${S.info.name} as it was when the last session surveyed it, ${fmtDate(tree.warm.takenAt)}. Checking it against the disk; changes wait until then.`, { kind: 'info', ms: 12000 });
    drawAll();
    watchChecked(client);
  }
  if (S.model.root.e) notice(`The root could not be read: ${S.model.root.e}`, { kind: 'error' });
  connectEvents();
  endSplash();
  DEMO?.welcome(API);
}

let reopening = null;
/**
 * Opens the tree again: Rescan all (build), or a new generation the
 * service read meanwhile (409 ESTALE). The old tree stays on screen until
 * the new one is open; then the folder you were in is found by its path.
 */
function reopenRegions({ build = false } = {}) {
  if (reopening) return reopening;
  const keep = S.focus && !hostOf(S.focus) ? relPath(S.focus) : '';
  reopening = (async () => {
    const client = regionClient(new Model(S.info.name, { regions: true }));
    let tree;
    try {
      tree = await client.open({ build });
    } catch (err) {
      notice(`The directory could not be read again: ${err.message}`, { kind: 'error' });
      return;
    }
    takeRegions(client);
    thumbs.reload(TOKEN);
    if (tree.error) notice(tree.error, { kind: 'error' });
    if (keep) {
      const node = await client.resolve(keep);
      if (S.regions === client && node?.d && node !== S.focus) setFocus(node, { remember: false });
    }
  })().finally(() => { reopening = null; });
  return reopening;
}

/**
 * Region mode, a tree read from the last session's cache: polls GET
 * /api/tree until the service says its check is done (the 'checked' event
 * does the same sooner), then lets changes go.
 */
function watchChecked(client) {
  const poll = async () => {
    if (S.regions !== client || !S.warm) return;
    try {
      const t = await get('tree', { peek: '1' });
      if (!t.warm?.checking) {
        regionsChecked(t.warm);
        return;
      }
    } catch { /* the next poll */ }
    setTimeout(poll, 1000);
  };
  setTimeout(poll, 1000);
}

/**
 * The service has checked the tree it read from the cache: what it read
 * again is read again here too (with what the change stream asked for
 * meanwhile), changes go ahead, and a notice says what changed.
 */
async function regionsChecked(w = null) {
  const W = S.warm;
  if (!S.regions || !W) return;
  let info = w;
  if (!info) {
    try {
      info = (await get('tree', { peek: '1' })).warm;
    } catch {
      info = null;
    }
  }
  if (S.warm !== W) return;
  if (info?.checking) return;
  S.warm = null;
  W.notice?.();
  warmRecord.settledMs = Math.round(performance.now());
  drawAll();
  // The service read every one of them into its tree: they are asked for as kept.
  const dirs = new Set([...W.pending, ...(info?.checked?.dirs || [])]);
  if (info?.checked?.more) reopenRegions({ build: false });
  else if (dirs.size) refreshDirs([...dirs], { kept: true });
  W.release();
  if (info?.failed) notice(info.failed, { kind: 'error' });
  else notice(checkedSentence(info?.checked || {}), { kind: 'info' });
}

/* ---------- regions landing, and the budget ---------- */

/** A batch of regions is in: the folders that wanted them open in the next layout. */
function regionsLanded() {
  queueLayout(30);
  scheduleEvict();
}

let evictTimer = 0;
/**
 * Lets regions go once the entries held pass the budget, but only while
 * the view is settled (no flight, no transition, no layout waiting), so
 * nothing moving loses its ground; then lays out again without animation.
 */
function scheduleEvict() {
  const R = S.regions;
  if (!R || R.held <= R.budget || evictTimer) return;
  const run = () => {
    evictTimer = 0;
    const C = S.regions;
    if (!C || C.held <= C.budget || !S.layout) return;
    if (S.layoutTimer || (!S.noGL && (S.view.flight || S.view.transition))) {
      evictTimer = setTimeout(run, 120);
      return;
    }
    const t0 = performance.now();
    const n = C.evict(regionPins(), openSet(S.layout));
    measure('terrane:evict', t0);
    if (n) relayout({ animate: false });
  };
  evictTimer = setTimeout(run, 60);
}

/** The folders standing open (DIR boxes) in a layout. */
function openSet(L) {
  const out = new Set();
  if (!L) return out;
  for (let i = 0; i < L.n; i++) if (L.type[i] === BOX.DIR) out.add(L.node[i]);
  return out;
}

/**
 * The folders whose regions are never let go, with every ancestor: the
 * folder you are in; the folder of everything selected and every selected
 * folder's own; the trail; the forced chain; a held flight's folder; every
 * benchmark's and the return point's; an open archive's folder.
 */
function regionPins() {
  const pins = new Set();
  const add = (n) => {
    for (let a = n; a && !pins.has(a); a = a.p) pins.add(a);
  };
  add(S.focus);
  for (const n of S.sel) add(n.d ? n : n.p);
  if (S.primary) add(S.primary.d ? S.primary : S.primary.p);
  for (const n of S.trail) add(n);
  if (S.force) for (const n of S.force) add(n);
  if (hold) add(hold.dir);
  for (const b of S.places?.benchmarks || []) if (b.node) add(b.node);
  if (S.places?.ret && S.regions) add(S.regions.nearest(S.places.ret.rel));
  if (S.interior) add(S.interior.host.p);
  return pins;
}

/** The deepest node of the whole tree on a path: api.nearest in whole-tree mode. */
function nearestNode(rel) {
  let node = S.model.root;
  for (const part of String(rel ?? '').split('/')) {
    if (!part) continue;
    const next = node.d ? node.c.find((ch) => ch.n === part) : null;
    if (!next) break;
    node = next;
  }
  return node;
}

/* ---------- the whole-tree questions, answered by the service ---------- */

/**
 * A region is in: what its new nodes are marked with. The survey's marks
 * (dup: a candidate's group, hv: a heavyweight) on its files; and, when
 * it carries the marks of the search showing (mk, by place), its matches,
 * the folders holding matches and how many of its children not held do.
 */
function regionMarks(node, R) {
  const nf = R.files.names.length;
  const c = node.c;
  for (let j = 0; j < nf; j++) {
    const f = c[j];
    if (f.dup) f.dup = 0;
    if (f.hv) f.hv = false;
  }
  if (R.dup) for (let i = 0; i < R.dup.length; i += 2) if (c[R.dup[i]]) c[R.dup[i]].dup = dupNumber(R.dup[i + 1], c[R.dup[i]]);
  if (R.hv) for (const i of R.hv) if (c[i]) c[i].hv = true;
  const s = S.search;
  if (!R.mk || !s?.regions || R.mk.q !== s.qid) return;
  if (R.mk.w) s.within.set(node, R.mk.w);
  let marked = 0;
  for (const [di, w, self] of R.mk.d) {
    const ch = c[nf + di];
    if (!ch) continue;
    marked++;
    if (self) s.set.add(ch);
    if (w) s.within.set(ch, w);
  }
  for (const fi of R.mk.f) {
    if (!c[fi]) continue;
    marked++;
    s.set.add(c[fi]);
  }
  if (R.mk.n > marked) s.tail.set(node, R.mk.n - marked);
  else s.tail.delete(node);
}

/**
 * A candidate's group as the page numbers it: the service's number, or,
 * once Verify (or proof kept from it) regrouped the candidates, its new
 * one: by path for a file whose group was read, by group for the rest.
 */
function dupNumber(g, node) {
  const map = S.survey?.dupMap;
  if (!map) return g;
  const r = map.byRel.get(relPath(node));
  if (r !== undefined) return r;
  return map.byOld.get(g) ?? g;
}

/** A held folder's marks by name, from GET /api/marks: its matches, the folders holding them, how many of its children not held do. */
function markFolder(dir, m, search) {
  if (!dir || dir.u) return;
  if (m.w) search.within.set(dir, m.w);
  let marked = 0;
  if (m.d.length || m.f.length) {
    const files = new Map();
    const dirs = new Map();
    for (const c of dir.c) (c.d ? dirs : files).set(c.n, c);
    for (const [name, w, self] of m.d) {
      const c = dirs.get(name);
      if (!c) continue;
      marked++;
      if (self) search.set.add(c);
      if (w) search.within.set(c, w);
    }
    for (const name of m.f) {
      const c = files.get(name);
      if (!c) continue;
      marked++;
      search.set.add(c);
    }
  }
  if (m.n > marked) search.tail.set(dir, m.n - marked);
}

/** Asks the marks of a new search for every folder held, 1,500 at a time, and repaints as they land. */
async function markSearch(search) {
  const R = S.regions;
  const ids = R.heldIds();
  for (let i = 0; i < ids.length; i += MARK_CHUNK) {
    let ans;
    try {
      ans = await askTree('marks', { q: search.qid, ids: ids.slice(i, i + MARK_CHUNK).join(',') });
    } catch (err) {
      // The service let the search go (four newer ones): it runs again.
      if (err.code === 'EQUERY' && S.search === search) runQuery();
      return;
    }
    if (S.search !== search || S.regions !== R) return;
    for (const m of ans.marks) markFolder(R.node(m.id), m, search);
    repaint();
  }
}

/** Asks the survey's marks (candidates' groups, heavyweights) for every folder held, and repaints. */
async function markDups() {
  const R = S.regions;
  const sv = S.survey;
  const ids = R.heldIds();
  for (let i = 0; i < ids.length; i += MARK_CHUNK) {
    let ans;
    try {
      ans = await askTree('marks', { dup: '1', ids: ids.slice(i, i + MARK_CHUNK).join(',') });
    } catch {
      return;
    }
    if (S.survey !== sv || S.regions !== R) return;
    for (const m of ans.marks) {
      const dir = R.node(m.id);
      if (!dir || dir.u) continue;
      const files = new Map();
      for (const c of dir.c) {
        if (c.d) continue;
        files.set(c.n, c);
        c.dup = 0;
        c.hv = false;
      }
      for (const [name, g] of m.dup) {
        const f = files.get(name);
        if (f) f.dup = dupNumber(g, f);
      }
      for (const name of m.hv) {
        const f = files.get(name);
        if (f) f.hv = true;
      }
    }
  }
  repaint();
  drawLegend();
}

/** The benchmarks' paths, which is:benchmark names to the service. */
const benchRels = () => (S.places?.benchmarks || []).map((b) => b.rel).filter((r) => typeof r === 'string').slice(0, 200);

/** What GET /api/find is asked for a query in an order (extra: its qid, or from, a page further in). */
function findParams(text, order, extra = {}) {
  const p = { q: text, sort: order.key, dir: String(order.dir), limit: String(FIND_LIMIT), focus: S.focus && !hostOf(S.focus) ? relPath(S.focus) : '', ...extra };
  if (/is:benchmark/i.test(text)) p.bench = JSON.stringify(benchRels());
  return p;
}

let querySeq = 0;
/**
 * The search in region mode: the service runs it over the whole tree and
 * answers the true total and the first 5,000 in the order asked, as refs;
 * a later query, or the tree read again, drops a late answer. Then the
 * marks of every folder held, so the world dims and pins as it does.
 */
async function runQueryRegions() {
  const seq = ++querySeq;
  const R = S.regions;
  const text = S.query;
  const none = () => {
    S.search = null;
    findCache = { search: null, key: '', items: [] };
    $('q-count').textContent = '';
    runHooks(AFTER_QUERY, null, S.query);
  };
  if (!text.trim()) return none();
  const order = S.findSort || { key: 'size', dir: -1 };
  // The same search asked again (after a change) stays on the page shown.
  const was = S.search?.regions && S.search.text === text && S.search.order?.key === order.key && S.search.order?.dir === order.dir ? S.search.from || 0 : 0;
  let ans;
  try {
    ans = await askTree('find', findParams(text, order, was ? { from: String(was) } : {}));
    // Fewer matches than the page started at: the last page there is.
    if (was && !ans.hits.length && ans.total > 0) ans = await askTree('find', findParams(text, order, { from: String(Math.floor((ans.total - 1) / FIND_LIMIT) * FIND_LIMIT) }));
  } catch (err) {
    if (seq === querySeq && S.regions === R && err.code !== 'ESTALE') notice(`The search could not run: ${err.message}`, { kind: 'error' });
    return undefined;
  }
  if (seq !== querySeq || S.regions !== R || S.query !== text) return undefined;
  lastFindMs = Number(ans.ms) || 0;
  if (ans.qid === null) return none();
  const search = {
    regions: true, qid: ans.qid, text, list: ans.hits.map(refFrom), order: ans.sort || order, total: ans.total, bytes: ans.bytes, from: ans.from || 0,
    set: new WeakSet(), within: new WeakMap(), tail: new WeakMap(), in: ans.in, sess: ans.sess, note: '',
  };
  S.search = search;
  findCache = { search: null, key: '', items: [] };
  $('q-count').textContent = `${fmtCount(search.total)} found`;
  runHooks(AFTER_QUERY, search, S.query);
  markSearch(search);
  repaint();
  drawLedger(true);
  // Painted and listed: applyQuery need not do either again in this task.
  return true;
}

/** The search's first 5,000 asked again in another order (a sort key, or the order a feature gives a search). */
async function reorderHits(s, o) {
  const k = `${o.key}:${o.dir}`;
  if (s.reordering === k) return;
  s.reordering = k;
  let ans;
  try {
    ans = await askTree('find', findParams(s.text, o, { qid: s.qid }));
  } catch {
    s.reordering = null;
    return;
  }
  if (S.search !== s) return;
  s.reordering = null;
  s.list = ans.hits.map(refFrom);
  s.from = 0;
  s.order = ans.sort || o;
  s.total = ans.total;
  s.bytes = ans.bytes;
  if (ans.qid !== s.qid) {
    s.qid = ans.qid;
    s.set = new WeakSet();
    s.within = new WeakMap();
    s.tail = new WeakMap();
    markSearch(s);
  }
  findCache = { search: null, key: '', items: [] };
  if (S.tab === 'findings') drawLedger(true);
}

/**
 * Region mode: Findings turned to the page of matches that starts at
 * from (5,000 to a page), in the order shown, and said.
 */
async function turnPage(s, from) {
  if (S.search !== s || !s.regions) return;
  const total = s.total ?? 0;
  const at = Math.max(0, Math.min(from, Math.max(0, total - 1)));
  let ans;
  try {
    ans = await askTree('find', findParams(s.text, s.order, { qid: s.qid, from: String(at) }));
  } catch (err) {
    if (S.search === s && err.code !== 'ESTALE') notice(`The next matches could not be listed: ${err.message}`, { kind: 'error' });
    return;
  }
  if (S.search !== s) return;
  s.list = ans.hits.map(refFrom);
  s.from = ans.from ?? at;
  s.total = ans.total;
  s.bytes = ans.bytes;
  if (ans.qid !== s.qid) {
    s.qid = ans.qid;
    s.set = new WeakSet();
    s.within = new WeakMap();
    s.tail = new WeakMap();
    markSearch(s);
  }
  findCache = { search: null, key: '', items: [] };
  if (S.tab === 'findings') drawLedger(true);
  say(`Matches ${fmtCount(s.from + 1)} to ${fmtCount(s.from + s.list.length)} of ${fmtCount(s.total)}.`);
}

/** The service's survey as the page's: refs in every list, the counts beside them, groups numbered as sent. */
function surveyFrom(ans) {
  const base = ans.dupGroups.map((g, i) => ({ g: i + 1, size: g.size, count: g.count, waste: g.waste, files: g.files.map(refFrom), verified: false }));
  return {
    regions: true, pending: false,
    largest: ans.largest.map(refFrom), heavy: ans.heavy.map(refFrom),
    empty: ans.empty.list.map(refFrom), sealed: ans.sealed.list.map(refFrom), links: ans.links.list.map(refFrom),
    counts: { empty: ans.empty.count, sealed: ans.sealed.count, links: ans.links.count },
    dupGroups: base, base, dupMap: null, ms: ans.ms,
  };
}

let surveySeq = 0;
/**
 * The survey in region mode, asked of the service (debounced after a
 * refresh, as a page survey is): the lists, the candidates with what
 * Verify proved put back by path, then the survey's marks on what is held.
 */
async function surveyRegions() {
  const seq = ++surveySeq;
  const R = S.regions;
  let ans;
  try {
    ans = await askTree('survey');
  } catch (err) {
    if (seq === surveySeq && S.regions === R && err.code !== 'ESTALE') notice(`The survey could not be read: ${err.message}`, { kind: 'error' });
    return;
  }
  if (seq !== surveySeq || S.regions !== R) return;
  // The service answered the last survey it worked out, the tree having
  // changed since (stale): asked again once it may work one out. Until
  // then what is shown stays, and the survey's marks are not asked for,
  // since that would work it out now.
  if (ans.stale) {
    clearTimeout(S.surveyTimer);
    S.surveyTimer = setTimeout(surveyNow, Math.max(200, (Number(ans.retry) || 0) + 50));
    if (S.survey && !S.survey.pending) return;
  }
  const sv = surveyFrom(ans);
  if (provedRel.size && !ans.stale) await keepVerifiedRegions(sv);
  if (seq !== surveySeq || S.regions !== R) return;
  S.survey = sv;
  S.model.dupGroups = sv.dupGroups;
  runHooks(AFTER_SURVEY, sv, { full: false, regions: true });
  if (!ans.stale) markDups();
  repaint();
  if (S.tab === 'survey') drawLedger();
  drawLegend();
}

/**
 * What Verify proved in region mode, by path: { hash, mode, s, m }. It
 * stands while a file keeps its size and last change, as proved does for
 * the whole tree; a Rescan all starts afresh.
 */
const provedRel = new Map();

/**
 * Regroups the service's candidates (sv.base) where their files' contents
 * are known: full lists the top groups' files whole; settled(g) says
 * whether a group is read (Verify) or proved throughout (kept). A read
 * group splits by hash into confirmed groups; the rest stay as they are.
 * The new numbering is kept (dupMap) for nodes held now and regions to come.
 */
function regroupRegions(sv, full, settled) {
  const read = new Map();
  for (const x of full) if (settled(x)) read.set(x.g, x);
  const out = sv.base.filter((g) => !read.has(g.g));
  const byRel = new Map();
  for (const x of read.values()) {
    const buckets = new Map();
    for (const f of x.files) {
      byRel.set(f.rel, 0);
      const p = provedRel.get(f.rel);
      if (!p || p.s !== f.s || p.m !== f.m) continue;
      if (!buckets.has(p.hash)) buckets.set(p.hash, []);
      buckets.get(p.hash).push(f);
    }
    for (const [hash, list] of buckets) {
      if (list.length > 1) out.push({ g: null, size: x.size, count: list.length, files: list, waste: x.size * (list.length - 1), verified: true, mode: provedRel.get(list[0].rel).mode, hash });
    }
  }
  out.sort((a, b) => b.waste - a.waste);
  const byOld = new Map();
  out.forEach((g, i) => {
    if (g.verified) for (const f of g.files) byRel.set(f.rel, i + 1);
    else byOld.set(g.g, i + 1);
  });
  for (const g of read.keys()) byOld.set(g, 0);
  sv.dupGroups = out;
  sv.dupMap = { byOld, byRel };
  return read.size;
}

/** The candidates of a new survey with what was proved put back: the top groups' files read, where every one is proved still. */
async function keepVerifiedRegions(sv) {
  let ans;
  try {
    ans = await askTree('survey', { dupfiles: '4000' });
  } catch {
    return;
  }
  const full = ans.groups.map((x) => ({ g: x.g, size: x.size, files: x.files.map(refFrom) }));
  regroupRegions(sv, full, (x) => x.files.every((f) => {
    const p = provedRel.get(f.rel);
    return p && p.s === f.s && p.m === f.m;
  }));
}

/** Verify by content in region mode: the top groups' files, up to 4,000, read by path and split by hash. */
async function verifyRegions() {
  const sv = S.survey;
  if (!sv || sv.pending) return;
  let ans;
  try {
    ans = await askTree('survey', { dupfiles: '4000' });
  } catch (err) {
    notice(err.message, { kind: 'error' });
    return;
  }
  const full = ans.groups.map((x) => ({ g: x.g, size: x.size, files: x.files.map(refFrom) }));
  const files = full.flatMap((x) => x.files);
  if (!files.length) return;
  notice(`Reading ${fmtCount(files.length)} files to compare their contents…`, { kind: 'info', ms: 3000 });
  let results;
  try {
    ({ results } = await post('hash', { paths: files.map((f) => f.rel) }));
  } catch (err) {
    notice(err.message, { kind: 'error' });
    return;
  }
  if (S.survey !== sv) return;
  files.forEach((f, i) => {
    const h = results[i];
    if (h && !h.error) provedRel.set(f.rel, { hash: h.hash, mode: h.mode, s: f.s, m: f.m });
  });
  regroupRegions(sv, full, () => true);
  S.model.dupGroups = sv.dupGroups;
  // Held files take their new numbers; regions to come are numbered by dupMap.
  for (const id of S.regions.heldIds()) {
    const dir = S.regions.node(id);
    if (!dir || dir.u) continue;
    for (const f of dir.c) {
      if (f.d) continue;
      const r = sv.dupMap.byRel.get(relPath(f));
      if (r !== undefined) f.dup = r;
      else if (f.dup) f.dup = sv.dupMap.byOld.get(f.dup) ?? f.dup;
    }
  }
  const confirmed = sv.dupGroups.filter((g) => g.verified);
  notice(`${fmtCount(confirmed.length)} groups confirmed identical, ${fmtBytes(confirmed.reduce((a, g) => a + g.waste, 0))} reclaimable.`);
  repaint();
  drawLedger();
  drawLegend();
  drawInspector();
}

/**
 * A ref made a node (its path resolved, its region held), and put in its
 * place in the list that showed it, so the list's cursor, highlight and
 * selection work on the node from then on.
 */
function resolveRow(ref) {
  const found = S.regions ? S.regions.resolve(ref.rel) : Promise.resolve(S.model.find(ref.rel));
  return found.then((node) => {
    if (!node) {
      notice(`${ref.rel || ref.n} is no longer in the tree.`, { kind: 'info' });
      return null;
    }
    if (swapRef(ref, node)) list?.draw();
    return node;
  });
}

/** Puts node in ref's place in every list that shows it; true when one did. */
function swapRef(ref, node) {
  let swapped = false;
  for (const arr of new Set([list?.items, S.search?.list, findCache.items])) {
    if (!arr) continue;
    const i = arr.indexOf(ref);
    if (i >= 0) {
      arr[i] = node;
      swapped = true;
    }
  }
  return swapped;
}

/** fn(node), once a ref is a node; at once for a node. */
const withNode = (node, fn) => (node?.ref ? resolveRow(node).then((n) => n && nextTask(() => fn(n)), (err) => notice(err.message, { kind: 'error' })) : fn(node));

/**
 * Select all in Findings. In region mode the first 1,000 matches are
 * found (each made a node) and selected, and the page says so.
 */
async function selectAllMatches(items) {
  if (!S.regions) {
    selectAll(items.slice(0, 5000), items[0]);
    return;
  }
  const search = S.search;
  const first = items.slice(0, SELECT_ALL_REGIONS);
  // Each folder's region held once, its matches found in it by name; only
  // a match outside its folder's held children (a tail) is asked for alone.
  const found = new Map();
  const byDir = new Map();
  for (const it of first) {
    if (!it.ref) continue;
    if (!byDir.has(it.p.rel)) byDir.set(it.p.rel, []);
    byDir.get(it.p.rel).push(it);
  }
  // A region the service could not answer stops the gathering with a
  // sentence; what was found until then is selected.
  let stopped = null;
  try {
    for (const [rel, refs] of byDir) {
      const dir = await S.regions.ensure(await S.regions.resolve(rel));
      if (S.search !== search) return;
      const kids = new Map();
      for (const c of dir?.d ? dir.c : []) kids.set(`${c.d ? 'd' : 'f'}:${c.n}`, c);
      for (const ref of refs) {
        const n = kids.get(`${ref.d ? 'd' : 'f'}:${ref.n}`) ?? await resolveRow(ref);
        if (S.search !== search) return;
        if (n) found.set(ref, n);
      }
    }
  } catch (err) {
    stopped = err;
  }
  if (S.search !== search) return;
  const nodes = [];
  for (const it of first) {
    const n = it.ref ? found.get(it) : it;
    if (!n) continue;
    if (it.ref) swapRef(it, n);
    nodes.push(n);
  }
  list?.draw();
  selectAll(nodes, nodes[0] ?? null);
  if (stopped) notice(`Select all stopped after ${fmtCount(nodes.length)} matches: ${stopped.message}`, { kind: 'error' });
  else say(`Select all takes the first ${fmtCount(SELECT_ALL_REGIONS)} matches at this size.`);
}

/* ====================================================================== */
/* layout and paint                                                       */
/* ====================================================================== */

function queueLayout(ms) {
  if (S.layoutTimer) return;
  S.layoutTimer = setTimeout(() => {
    S.layoutTimer = 0;
    relayout();
  }, ms ?? (S.scanning ? 900 : 60));
}

function relayout({ animate = true } = {}) {
  const t0 = performance.now();
  S.model.now = Date.now();
  const eye = S.view.eye || { x: 0, y: 900, z: 1200 };
  S.lastEye = { ...eye, alt: S.view.alt || 900 };
  const opts = { cam: eye, grain: GRAINS[S.grain].v, now: S.model.now, force: S.force };
  for (const o of LAYOUT_OPTS) {
    try {
      const more = o.options(opts);
      if (more) Object.assign(opts, more);
    } catch (err) {
      console.error(`LAYOUT_OPTS "${o.id}" failed:`, err);
    }
  }
  const tl = performance.now();
  S.layout = buildLayout(S.model.root, opts);
  measure('terrane:layout', tl);
  if (firstDrawMs === null && S.layout.n > 0) firstDrawMs = Math.round(performance.now());
  S.view.setLayout(S.layout, paint(), { animate });
  syncViewSelection();
  drawPins();
  // Region mode: the location, and the ledger and inspector it may draw
  // again, follow in the next task, so a layout and the panels never share
  // one (the Stage 4 exit test's frames).
  if (S.regions) queueWhere();
  else updateWhere();
  drawStatus();
  runHooks(AFTER_LAYOUT, S.layout);
  // Region mode: the folders this layout would open whose children are
  // not held yet are asked for. Without WebGL nothing opens by approach.
  if (S.regions && !S.noGL) S.regions.want(S.layout.want);
  measure('terrane:relayout', t0);
}

let whereQueued = 0;
/** updateWhere in the next task, once however often it is asked for meanwhile. */
function queueWhere() {
  if (!whereQueued) whereQueued = setTimeout(() => { whereQueued = 0; updateWhere(); }, 0);
}

/**
 * The folder you are "in": the deepest one under the centre of the view
 * that still fills a good part of it. Breadcrumbs and the ledger follow.
 * Without a 3D view there is no camera to read, so the location stays
 * where setFocus put it.
 */
function updateWhere() {
  const L = S.layout;
  if (!L) return;
  const p = S.view.look();
  if (!p) return;
  // A flight into an open archive lands where it was going (setFocus).
  if (hold) {
    const v = S.view;
    if (isAttached(hold.dir) && (v.flight ? v.flight.to === hold.goal : stillAt(v.pose(), hold.goal))) {
      moveFocus(hold.dir);
      return;
    }
    hold = null;
  }
  const I = S.interior;
  let dir = S.model.root;
  if (p.point) {
    const width = p.dist * 0.82 * (S.view.w / S.view.h);
    for (;;) {
      let next = null;
      for (let ch of dir.c) {
        // An open archive's file is walled in and its floor is the
        // archive's root, so going on from the file goes inside.
        if (I && ch === I.host) ch = I.root;
        if (!ch.d) continue;
        const i = L.index.get(ch);
        if (i === undefined) continue;
        const o = i * 6;
        if (Math.abs(p.point.x - L.geo[o]) <= L.geo[o + 3] / 2 && Math.abs(p.point.z - L.geo[o + 2]) <= L.geo[o + 5] / 2) {
          if (Math.max(L.geo[o + 3], L.geo[o + 5]) >= width * 0.42) next = ch;
          break;
        }
      }
      if (!next || L.type[L.index.get(next)] !== BOX.DIR) {
        if (next) dir = next;
        break;
      }
      dir = next;
    }
  }
  moveFocus(dir);
}

/** Makes dir the folder you are in and redraws everything that shows it. */
function moveFocus(dir) {
  // Once the eye has landed somewhere off the branch a flight opened, the
  // branch may fold again as distance says (checked even when the
  // location already moved there during the flight).
  if (S.force && (S.noGL || !S.view.flight) && !onForcedBranch(dir)) releaseForce();
  if (dir === S.focus) return;
  S.focus = dir;
  // In region mode the eye can come to rest over a closed folder whose
  // children are not held: they are asked for, and shown once in.
  if (S.regions && dir.u) {
    S.regions.ensure(dir).then((n) => {
      if (n !== dir || S.focus !== dir) return;
      nextTask(() => {
        if (S.focus !== dir) return;
        if (S.tab === 'contents') drawLedger(true);
        if (!S.primary) drawInspector();
        drawLegend();
      });
    }, () => {});
  }
  drawCrumbs();
  if (S.tab === 'contents') drawLedger();
  if (!S.primary) drawInspector();
  drawLegend();
  $('b-up').toggleAttribute('disabled', !S.focus.p);
  runHooks(AFTER_FOCUS, dir);
}

/**
 * AFTER_FOCUS for a location the controller moved without moveFocus: a
 * refresh, the warm start's catch-up or Rescan all found the folder you
 * were in (was) gone and put you at the root, or a hook moved you. The
 * address and the kept view hear it as they hear any move.
 */
function focusMoved(was) {
  if (S.focus !== was) runHooks(AFTER_FOCUS, S.focus);
}

/**
 * Inside an open archive the location stays where a flight took you while
 * the eye is still where the flight put it, { dir, goal }: a lone folder
 * filling the floor would otherwise take it over as the flight lands.
 * Moving, turning or another flight lets go.
 */
let hold = null;
const stillAt = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) <= Math.max(S.view.alt || 0, 1e-6) * 0.02
  && Math.abs(a.yaw - b.yaw) < 1e-3 && Math.abs(a.pitch - b.pitch) < 1e-3;

let whereTimer = 0;
/** The north arrow and storage scale over the world; null without WebGL. */
let hud = null;

function onMoved(settled) {
  hud?.heading(S.view.cam?.yaw);
  const eye = S.view.eye;
  const last = S.lastEye;
  if (last && !S.scanning) {
    const moved = Math.hypot(eye.x - last.x, eye.y - last.y, eye.z - last.z);
    if (moved > Math.min(S.view.alt, last.alt) * 0.12) queueLayout(settled ? 30 : 140);
  }
  if (!whereTimer) whereTimer = setTimeout(() => { whereTimer = 0; updateWhere(); drawAltitude(); }, 180);
}

function drawAltitude() {
  if (S.view.alt === undefined) return;
  hud?.scale(S.view, S.model.root.s);
  // Stated in the unit that matters here: roughly how much storage one
  // screen-width of ground stands for from this height.
  const p = S.view.look();
  let text = 'Horizon';
  if (p.point) {
    const width = p.dist * 0.82 * (S.view.w / S.view.h);
    const share = Math.min(1, (width * width) / 1e6);
    text = share >= 1 ? 'Overview · everything' : `≈ ${fmtBytes(S.model.root.s * share)} across the view`;
  }
  setText($('alt-val'), text);
}

/** Writes text only when it differs, so an unchanged value is never announced again. */
function setText(node, text) {
  if (node && node.textContent !== text) node.textContent = text;
}

function repaint() {
  if (!S.layout) return;
  S.view.setPaint(paint());
  syncViewSelection();
  drawPins();
}

function dominantKind(dir) {
  let best = 8;
  let max = 0;
  for (let k = 0; k < 9; k++) if (dir.ks[k] > max) { max = dir.ks[k]; best = k; }
  return best;
}

function screeHasMatch(i) {
  const info = S.layout.scree.get(i);
  const dir = S.layout.node[i];
  const kids = dir.c;
  for (let k = info.from; k < kids.length; k++) if (S.search.set.has(kids[k]) || S.search.within.has(kids[k])) return true;
  // Region mode: the children not held lie in the scree too, and the
  // service counted their matches.
  return !!dir.tail && S.search.tail?.get(dir) > 0;
}

/**
 * A kind's colour in a tone of its own for each extension: one of five
 * steps from 22 % darker to 24 % lighter, the same for every file of that
 * extension, so a folder of .tsx and .css reads as two families of one
 * kind.
 */
const extTones = new Map();
const TONE_STEPS = [-0.22, -0.11, 0, 0.12, 0.24];
// Common neighbours get steps apart (.ts and .tsx, .tsx and .css, .jpg
// and .png, .mov and .mp4); any other extension takes a step by its hash.
const TONE_OF = {
  ts: 0, tsx: 2, js: 1, jsx: 3, mjs: 1, cjs: 1, css: 4, scss: 4, html: 3, py: 1, lua: 0, sh: 3, ipynb: 4,
  md: 2, txt: 3, pdf: 0, docx: 1, xlsx: 4, pptx: 3,
  jpg: 2, jpeg: 2, png: 3, psd: 0, svg: 4, cr3: 1, cr2: 1, dng: 1, nef: 1, arw: 1, tif: 0, tiff: 0, fig: 4, ai: 0, gif: 3, webp: 3,
  mp4: 2, mov: 1, mkv: 3, prproj: 4,
  wav: 1, flac: 2, mp3: 3, ogg: 4, als: 0,
  zip: 2, gz: 1, '7z': 0, rar: 3, iso: 4, dmg: 4,
  json: 2, csv: 3, parquet: 1, yml: 4, yaml: 4, toml: 4, pkl: 0,
};
function extTone(node) {
  const key = `${node.k}:${extOf(node.n)}`;
  let c = extTones.get(key);
  if (c === undefined) {
    const ext = extOf(node.n);
    let h = 2166136261;
    for (let i = 0; i < ext.length; i++) h = Math.imul(h ^ ext.charCodeAt(i), 16777619) >>> 0;
    const t = ext ? TONE_STEPS[TONE_OF[ext] ?? h % TONE_STEPS.length] : 0;
    c = mixHex(KINDS[node.k].color, t > 0 ? 0xffffff : 0x000000, Math.abs(t));
    extTones.set(key, c);
  }
  return c;
}

/**
 * A closed mass's strata: what it holds by kind, largest at the foot,
 * as three band colours and where the first two end. The third band
 * takes every kind after the second.
 */
function strataOf(node) {
  const order = [];
  for (let k = 0; k < 9; k++) if (node.ks[k] > 0) order.push(k);
  order.sort((a, b) => node.ks[b] - node.ks[a]);
  const total = node.s || 1;
  const tone = (k) => mixHex(THEME.clay, KINDS[k].color, 0.7);
  if (!order.length) return null;
  const a = order[0];
  const b = order[1] ?? a;
  const c = order[2] ?? b;
  const s1 = node.ks[a] / total;
  const s2 = order[1] === undefined ? 1 : s1 + node.ks[b] / total;
  return { a: tone(a), b: tone(b), c: tone(c), s1: Math.min(1, s1), s2: Math.min(1, order[2] === undefined ? 1 : s2) };
}

function paint() {
  const tp = performance.now();
  const L = S.layout;
  const n = L.n;
  const color = new Uint32Array(n);
  const style = new Float32Array(n);
  const dim = new Float32Array(n);
  const bands = new Uint32Array(n * 3);
  const shares = new Float32Array(n * 2);
  const now = S.model.now;
  const maxLog = Math.log2((S.survey?.largest[0]?.s || S.model.root.s || 1) + 2);
  const search = S.search;
  const filter = S.kindFilter;
  const placing = S.placing;
  // Age lens: a closed mass shows its typical age, the median step of its
  // bytes in the age table (strata.js), one colour per step made here.
  // Before the first table it shows its newest change, as it always did,
  // and so does one inside an open archive: the table holds only the
  // tree on disk, so it knows no median for the archive's folders.
  const ages = S.lens === 'age' ? S.ages : null;
  const tones = ages ? massTones(ages, now) : null;
  // An open archive (S.interior): its chamber's boxes stand outside the
  // search, which does not reach into archives, and are no destination
  // while placing. Its walls take the file's own colour (their node is
  // the file); locked entries are hatched and twins half-banded.
  const I = S.interior;
  const room = I ? L.chamber : null;

  for (let i = 0; i < n; i++) {
    const node = L.node[i];
    const type = L.type[i];
    const lvl = L.level[i];
    const inRoom = room !== null && i >= room.from && i < room.to;
    let c;
    let s = STYLE.PLAIN;
    if (type === BOX.DIR) {
      c = THEME.plaster[Math.min(lvl, THEME.plaster.length - 1)];
    } else if (type === BOX.SCREE) {
      c = THEME.plaster[Math.max(0, Math.min(lvl, 5) - 1)];
      s = STYLE.STIPPLE;
    } else if (type === BOX.CAP) {
      if (node.e) { c = THEME.clay; s = STYLE.HATCH; }
      else if (kids(node) === 0) { c = THEME.paper; s = STYLE.HOLLOW; }
      else if (S.lens === 'kind') c = mixHex(THEME.clay, KINDS[dominantKind(node)].color, 0.56);
      else if (S.lens === 'age') {
        const k = ages && !inRoom ? ages.medianStep(node) : -1;
        c = k >= 0 ? tones[k] : mixHex(THEME.clay, ramp(THEME.ageRamp, freshness(node.mm, now)), 0.7);
      } else if (S.lens === 'size') c = mixHex(THEME.clay, ramp(THEME.sizeRamp, Math.log2(node.s + 2) / maxLog), 0.7);
      else c = THEME.clay;
    } else {
      if (S.lens === 'kind') c = extTone(node);
      else if (S.lens === 'age') c = ramp(THEME.ageRamp, freshness(node.m, now));
      else if (S.lens === 'size') c = ramp(THEME.sizeRamp, Math.log2(node.s + 2) / maxLog);
      else if (node.dup) {
        c = THEME.garnet;
        if (!S.survey?.dupGroups[node.dup - 1]?.verified) s = STYLE.HALF_BANDS;
      } else c = 0xd3d9d4;
      if (node.f & FLAG_LINK) s = STYLE.BANDS;
      if (node.f & FLAG_HIDDEN && S.lens === 'kind') c = mixHex(c, THEME.paper, 0.4);
      if (I && type === BOX.FILE) {
        const own = I.styleOf(node);
        if (own !== null) s = own;
      }
    }
    // Changed after the date the time view looks back to: washed toward
    // paper once, here, and crossed by the shader. A selection keeps its
    // highlighter colour below, with the cross over it.
    if (L.aux[i] === AUX.CROSSED) {
      s = STYLE.CROSSED;
      c = mixHex(c, THEME.paper, 0.6);
    }

    let d = 0;
    if (search) {
      if (inRoom) d = 0;
      else if (search.set.has(node) && type !== BOX.SCREE) d = 0;
      else if (type === BOX.DIR) d = search.within.has(node) ? 0.3 : 0.7;
      else if (type === BOX.CAP) d = search.within.has(node) ? 0 : 1;
      else if (type === BOX.SCREE) d = screeHasMatch(i) ? 0 : 1;
      else d = 1;
    } else if (filter >= 0) {
      if (type === BOX.FILE) d = node.k === filter ? 0 : 1;
      else if (type === BOX.CAP) d = node.ks[filter] > 0 ? 0 : 1;
      else if (type === BOX.DIR) d = node.ks[filter] > 0 ? 0.25 : 0.7;
      else d = 0.6;
    } else if (placing) {
      if (inRoom || type === BOX.FILE || type === BOX.SCREE) d = 0.75;
      else if (placing.nodes.some((x) => isAncestor(x, node))) d = 1;
    }
    const picked = S.sel.has(node) && type !== BOX.SCREE;
    if (picked) {
      c = THEME.mark;
      d = 0;
    }
    color[i] = c;
    style[i] = s;
    dim[i] = d;
    // Strata on a closed mass's sides, under the Kind lens; every other
    // box keeps one colour all round.
    const st = type === BOX.CAP && S.lens === 'kind' && !picked && !node.e && s === STYLE.PLAIN ? strataOf(node) : null;
    if (st) {
      bands[i * 3] = st.a; bands[i * 3 + 1] = st.b; bands[i * 3 + 2] = st.c;
      shares[i * 2] = st.s1; shares[i * 2 + 1] = st.s2;
    } else {
      bands[i * 3] = bands[i * 3 + 1] = bands[i * 3 + 2] = c;
      shares[i * 2] = shares[i * 2 + 1] = 1;
    }
  }
  measure('terrane:paint', tp);
  return { color, style, dim, bands, shares };
}

/** Index of the box that shows a node, or of the mass or scree hiding it. */
function visibleIndexOf(node) {
  const L = S.layout;
  if (!L || !node) return -1;
  let a = node;
  while (a) {
    const i = L.index.get(a);
    if (i !== undefined) return i;
    const p = a.p;
    if (p && p._scree) {
      const si = L.index.get(p._scree);
      if (si !== undefined && L.index.get(p) !== undefined) {
        const from = L.scree.get(si).from;
        if (p.c.indexOf(a) >= from) return si;
      }
    }
    a = p;
  }
  return -1;
}

function syncViewSelection() {
  const i = visibleIndexOf(S.primary);
  S.view.setSelected(i);
  let ties = [];
  const p = S.primary;
  if (p && !p.d && p.dup && S.survey) {
    const group = S.survey.dupGroups[p.dup - 1];
    // A group's files are refs in region mode: each ties to the held box nearest it.
    const at = (f) => visibleIndexOf(f.ref && S.regions ? S.regions.nearest(f.rel) : f);
    const own = relPath(p);
    if (group) ties = group.files.filter((f) => f !== p && relPath(f) !== own).slice(0, 40).map(at).filter((j) => j >= 0 && j !== i);
  }
  S.view.setTies(ties.length ? i : -1, [...new Set(ties)]);
  // Twins: an entry of the open archive and the files here with its name
  // and size, tied in the archive kind's colour (the relation set 'twins').
  const tw = p && S.interior ? S.interior.twinsOf(p) : null;
  const tj = tw && i >= 0 ? [...new Set(tw.slice(0, 40).map(visibleIndexOf))].filter((j) => j >= 0 && j !== i) : [];
  if (tj.length) S.view.setRelation('twins', { color: KINDS[5].color, lift: 0.22, legs: topLegs(i, tj) });
  else S.view.clearRelation('twins');
}

/** Legs from the top of box i to the top of each box in js, in world coordinates. */
function topLegs(i, js) {
  const g = S.layout.geo;
  const top = (k) => [g[k * 6], g[k * 6 + 1] + g[k * 6 + 4] / 2, g[k * 6 + 2]];
  const a = top(i);
  return js.flatMap((j) => [...a, ...top(j)]);
}

/** Pins from every source in PIN_SOURCES order, up to the capacity. */
function drawPins() {
  const L = S.layout;
  if (!L) return;
  const pins = [];
  for (const src of PIN_SOURCES) {
    const room = PIN_CAP - pins.length;
    if (room <= 0) break;
    let got;
    try {
      got = src.pins(L, room);
    } catch (err) {
      console.error(`PIN_SOURCES "${src.id}" failed:`, err);
      continue;
    }
    if (got) for (let k = 0; k < got.length && k < room; k++) pins.push(got[k]);
  }
  S.view.setPins(pins);
}

/** Search matches in vermilion: files, masses holding matches, and scree hiding them. */
function searchPins(L, room) {
  if (!S.search) return null;
  const pins = [];
  const cap = Math.min(2500, room);
  for (let i = 0; i < L.n && pins.length < cap; i++) {
    const node = L.node[i];
    const t = L.type[i];
    if (t === BOX.FILE ? S.search.set.has(node)
      : t === BOX.CAP ? S.search.set.has(node) || S.search.within.has(node)
        : t === BOX.SCREE ? screeHasMatch(i) : false) pins.push({ i, color: THEME.signal });
  }
  return pins;
}

/** Heavyweight files in ink, when no search is showing and the lens is not duplicates. */
function heavyPins(L) {
  if (S.search || !S.survey || S.lens === 'dup') return null;
  const pins = [];
  // Region mode: the survey's heavyweights are refs; their nodes carry hv.
  if (S.regions) {
    for (let i = 0; i < L.n; i++) if (L.type[i] === BOX.FILE && L.node[i].hv) pins.push({ i, color: THEME.ink });
    return pins;
  }
  for (const f of S.survey.heavy) {
    const i = L.index.get(f);
    if (i !== undefined) pins.push({ i, color: THEME.ink });
  }
  return pins;
}

/* ====================================================================== */
/* selection, travel, navigation                                          */
/* ====================================================================== */

const say = (text) => { $('live').textContent = text; };

function describe(node) {
  if (node.d) return `${node.n}, folder, ${fmtBytes(node.s)}, ${fmtCount(node.fc)} files`;
  return `${node.n}, ${KINDS[node.k].label}, ${fmtBytes(node.s)}, changed ${fmtAge(node.m)}`;
}

/**
 * Selects node (null: nothing), or adds it to the selection or takes it
 * out (add). quiet leaves the ledger as it is; painted says a layout just
 * painted this selection already (revealNow), so it is not painted again.
 */
function select(node, { add = false, quiet = false, painted = false } = {}) {
  // A ref (a list's entry the page may not hold) is made a node first:
  // the selection only ever holds nodes.
  if (node?.ref) {
    withNode(node, (n) => select(n, { add, quiet }));
    return;
  }
  if (!node) {
    S.sel.clear();
    S.primary = null;
  } else if (add) {
    if (S.sel.has(node)) {
      S.sel.delete(node);
      S.primary = [...S.sel].at(-1) || null;
    } else {
      S.sel.add(node);
      S.primary = node;
    }
  } else {
    S.sel.clear();
    S.sel.add(node);
    S.primary = node;
  }
  if (!painted) repaint();
  drawInspector();
  if (!quiet && TABS.get(S.tab)?.selection !== false) drawLedger(true);
  if (S.primary) say(S.sel.size > 1 ? `${S.sel.size} items selected` : describe(S.primary));
  runHooks(AFTER_SELECT, S.sel, S.primary);
  // Region mode: a folder selected whose children are not held is asked
  // for, and the inspector, which reads them, is drawn again once in.
  if (S.regions && node?.d && node.u) {
    S.regions.ensure(node).then(() => { if (S.primary === node) drawInspector(); }, () => {});
  }
}

/**
 * Selects nodes at once, primary (default the first) as the one the
 * inspector shows: Findings' Select all, and a selection put back.
 */
function selectAll(nodes, primary = null) {
  S.sel = new Set(nodes);
  S.primary = primary && S.sel.has(primary) ? primary : nodes[0] ?? null;
  repaint();
  drawInspector();
  drawLedger(true);
  runHooks(AFTER_SELECT, S.sel, S.primary);
}

/**
 * Opens the way to node whatever the distance: it and every folder above
 * it stand open (S.force) so a flight has a box to land on. The unfold
 * ends when the view returns to the overview (overview()) or the location
 * settles off that branch (moveFocus).
 */
function forceOpen(node) {
  S.force = new Set();
  for (let a = node; a; a = a.p) S.force.add(a);
}

/** Ends the forced unfold, and lays the world out again without it. */
function releaseForce() {
  if (!S.force) return;
  S.force = null;
  queueLayout();
}

/** True when dir is on the forced chain, or under the folder it opened. */
function onForcedBranch(dir) {
  if (S.force.has(dir)) return true;
  const target = S.force.values().next().value;
  for (let a = dir; a; a = a.p) if (a === target) return true;
  return false;
}

/** Rises to the overview; whatever was forced open folds as distance says. */
function overview() {
  hold = null;
  releaseForce();
  S.view.overview();
}

/**
 * Flies to a folder. "Where you are" then follows from the camera, or,
 * without a 3D view, moves to the folder at once.
 */
/**
 * Runs fn in a task of its own. In region mode a folder's region lands in
 * a task that built its nodes; the relayout, paint and ledger that act on
 * it follow in the next, so no task does both.
 */
const nextTask = (fn) => setTimeout(fn, 0);

let goSeq = 0;
function setFocus(dir, opts = {}) {
  if (!dir || !dir.d) return;
  // Each go counts, so a region that lands late never overrides a newer one.
  const seq = ++goSeq;
  if (S.regions && dir.x !== undefined && (dir.u || !S.regions.live(dir))) {
    S.regions.ensure(dir).then((node) => {
      if (seq === goSeq && node?.d) nextTask(() => { if (seq === goSeq) goTo(node, opts); });
    }, (err) => notice(err.message, { kind: 'error' }));
    return;
  }
  goTo(dir, opts);
}

/** setFocus once the folder's children are held (at once, in whole-tree mode). */
function goTo(dir, { remember = true } = {}) {
  if (remember && S.focus !== dir) S.trail.push(S.focus);
  hold = null;
  if (!dir.p) {
    // The root: going there is rising to the overview.
    S.force = null;
    relayout();
    S.view.overview();
    if (S.noGL || !S.view.look()) moveFocus(dir);
    say(`Travelling to ${dir.n}, ${fmtCount(kids(dir))} items`);
    return;
  }
  forceOpen(dir);
  relayout();
  const i = S.layout.index.get(dir);
  if (i === undefined) S.view.overview();
  else S.view.frame(i);
  // With a 3D view the location follows the camera when the flight lands.
  // Without one there is no camera to follow, so the location moves here.
  // A view that looks at the sky still has a camera: setting the location
  // early there would be undone by the first frame of the flight. Inside
  // an open archive the location moves here too, and holds (see hold).
  if (S.noGL || !S.view.look()) moveFocus(dir);
  else if (hostOf(dir)) {
    hold = { dir, goal: S.view.flight?.to || S.view.pose() };
    moveFocus(dir);
  }
  say(`Travelling to ${dir.n}, ${fmtCount(kids(dir))} items`);
}

/** Up one level; from an open archive's root, to the folder its file is in. */
const goUp = () => {
  const up = S.focus.p;
  if (up) setFocus(up.d ? up : up.p);
};
const goBack = () => {
  const prev = S.trail.pop();
  if (prev && isAttached(prev)) setFocus(prev, { remember: false });
};

let revealSeq = 0;
/**
 * Makes a node visible (changing focus if it must) and flies to it. In
 * region mode a ref, or a node of a region let go since, is found by its
 * path first.
 */
function reveal(node) {
  if (!node) return;
  const seq = ++revealSeq;
  if (node.ref || (S.regions && !isAttached(node))) {
    // A ref is put in its list's place as its node (resolveRow).
    const found = node.ref ? resolveRow(node) : S.regions ? S.regions.resolve(relPath(node)) : Promise.resolve(null);
    found.then((n) => { if (seq === revealSeq && n) nextTask(() => { if (seq === revealSeq) revealNow(n); }); }, (err) => notice(err.message, { kind: 'error' }));
    return;
  }
  revealNow(node);
}

function revealNow(node) {
  if (!S.layout.index.has(node)) {
    forceOpen(node);
    // Selected before the layout, so its paint shows the selection once.
    S.sel.clear();
    S.sel.add(node);
    S.primary = node;
    relayout();
    // Region mode: the inspector and the ledger follow in the next task,
    // so the layout and the panels do not share one.
    if (S.regions) nextTask(() => { if (S.primary === node) select(node, { painted: true }); });
    else select(node, { painted: true });
  } else select(node);
  const i = visibleIndexOf(node);
  if (i > 0) S.view.frame(i);
}

function activate(node) {
  if (!node) return;
  if (node.d) setFocus(node);
  else runOp({ type: 'open', path: relPath(node) });
}

let stepSeq = 0;
function stepSelection(key) {
  stepSeq++;
  const cur = S.primary;
  if (!cur) return select(S.focus.c[0] || S.focus);
  // An open archive's root steps up to its file, and the file down to it;
  // the root has no siblings, since its file holds nothing else.
  const I = S.interior;
  let next = null;
  if (key === 'ArrowUp') next = I && cur === I.root ? I.host : cur !== S.focus ? cur.p : null;
  else if (key === 'ArrowDown' && S.regions && cur.d && cur.u) {
    const seq = ++stepSeq;
    S.regions.ensure(cur).then((n) => {
      if (seq === stepSeq && S.primary === cur && n?.c.length) nextTask(() => { if (seq === stepSeq && S.primary === cur) select(n.c[0]); });
    }, () => {});
    return undefined;
  } else if (key === 'ArrowDown') next = cur.d ? cur.c[0] : I && cur === I.host ? I.root : null;
  else if (cur.p?.d) {
    const sibs = cur.p.c;
    const i = sibs.indexOf(cur);
    next = sibs[i + (key === 'ArrowRight' ? 1 : -1)];
  }
  if (next) select(next);
  return undefined;
}

/* ====================================================================== */
/* operations                                                             */
/* ====================================================================== */

/** Why the service refuses every change for as long as it runs: 'snapshot mode', 'read-only mode', or null. */
const readOnlyMode = () => (S.info.snapshot ? 'snapshot mode' : S.info.readOnly ? 'read-only mode' : null);
/**
 * Why nothing can be changed now, as a menu or a button gives a reason,
 * or null: the service's mode, or a warm start whose tree is still being
 * checked against the disk.
 */
const writable = () => readOnlyMode() || (S.warm ? WARM_WAIT : null);

/* ---------- long operations: progress and cancel ---------- */

const JOBS = new Map();
const LONG_OPS = new Set(['move', 'copy', 'trash']);
const JOB_VERB = { move: 'Moving', copy: 'Copying', trash: 'Removing' };
const newJobId = () => (crypto.randomUUID?.() || `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`).replace(/-/g, '').slice(0, 24);

const JOB_ICON = { move: 'move', copy: 'copy', trash: 'remove' };

function jobFor(id, op) {
  let j = JOBS.get(id);
  if (j) return j;
  const bar = el('i');
  const track = el('span', { class: 'job-track', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-label': 'Progress' }, bar);
  const title = el('span', { class: 'job-title', text: JOB_VERB[op] || 'Working' });
  const label = el('span', { class: 'label', text: 'Cancel' });
  const cancel = el('button', { class: 'btn btn-small', type: 'button', onclick: () => cancelJob(id) }, icon('cancel'), label);
  const figure = el('span', { class: 'job-fig' });
  const current = el('code', { class: 'job-cur' });
  const node = el('div', { class: 'job', role: 'group', 'aria-label': `${JOB_VERB[op] || 'Operation'} in progress` },
    el('div', { class: 'job-head' }, icon(JOB_ICON[op] || 'busy'), title, cancel), track, figure, current);
  j = { id, op, node, bar, track, title, cancel, label, figure, current, samples: [], shown: false, timer: 0 };
  JOBS.set(id, j);
  return j;
}

function showJob(j) {
  if (j.shown || !JOBS.has(j.id)) return;
  j.shown = true;
  $('jobs').append(j.node);
  say(`${JOB_VERB[j.op] || 'Working'}. Cancel is available.`);
}

function endJob(id) {
  const j = JOBS.get(id);
  if (!j) return;
  clearTimeout(j.timer);
  j.node.remove();
  JOBS.delete(id);
}

async function cancelJob(id) {
  const j = JOBS.get(id);
  if (!j) return;
  j.cancel.disabled = true;
  j.label.textContent = 'Cancelling…';
  try {
    await post('cancel', { job: id });
  } catch (err) {
    if (err.code !== 'ENOJOB') notice(err.message, { kind: 'error' });
  }
}

const fmtSecs = (s) => (s < 60 ? `${Math.max(1, Math.round(s))} s` : s < 3600 ? `${Math.round(s / 60)} min` : `${(s / 3600).toFixed(1)} h`);

/** Applies one progress message from the event stream. */
function onJob(msg) {
  if (msg.phase === 'end') return endJob(msg.id);
  // A job this page did not start (another tab, or a reload mid-copy) shows at once.
  const j = JOBS.get(msg.id) || jobFor(msg.id, msg.op);
  if (!j.timer) showJob(j);
  const [b0, b1] = msg.bytes;
  const [i0, i1] = msg.items;
  const verb = JOB_VERB[msg.op] || 'Working';
  let frac = null;
  let fig = '';
  if (msg.phase === 'queued') {
    j.title.textContent = `${verb} · waiting for the operation ahead of it`;
  } else if (msg.phase === 'counting') {
    j.title.textContent = `${verb} · counting`;
    fig = `${fmtCount(msg.files[1])} files, ${fmtBytes(b1)} so far`;
  } else {
    j.title.textContent = `${verb} · item ${Math.min(i0 + 1, i1)} of ${fmtCount(i1)}`;
    const now = performance.now();
    j.samples.push([now, b0]);
    while (j.samples.length > 2 && now - j.samples[0][0] > 4000) j.samples.shift();
    if (b1 > 0) {
      frac = b0 / b1;
      const [t0, s0] = j.samples[0];
      const rate = (b0 - s0) / Math.max(0.001, (now - t0) / 1000);
      fig = `${fmtBytes(b0)} of ${fmtBytes(b1)} · ${Math.floor(frac * 100)}%`;
      if (rate > 0 && now - t0 > 1200) fig += ` · ${fmtBytes(rate)}/s · about ${fmtSecs((b1 - b0) / rate)} left`;
    } else if (i1 > 0) {
      frac = i0 / i1;
      fig = `${fmtCount(i0)} of ${fmtCount(i1)} items`;
    }
  }
  j.track.classList.toggle('is-unknown', frac === null);
  j.bar.style.width = frac === null ? '' : `${(frac * 100).toFixed(1)}%`;
  if (frac === null) j.track.removeAttribute('aria-valuenow');
  else j.track.setAttribute('aria-valuenow', String(Math.floor(frac * 100)));
  j.figure.textContent = fig;
  j.current.textContent = msg.current || '';
  if (msg.cancelling) {
    j.cancel.disabled = true;
    j.label.textContent = 'Cancelling…';
  }
  return undefined;
}

async function runOp(body, { silent = false } = {}) {
  // The one lock on an open archive: nothing under its path is changed,
  // opened or revealed, whoever asks, and nothing is sent.
  const locked = S.interior?.refuse(body);
  if (locked) {
    notice(locked, { kind: 'info' });
    return null;
  }
  // While the tree from the last session is checked, changes wait;
  // opening and revealing what is on disk do not.
  if (body.type !== 'open' && body.type !== 'reveal' && refuseWarm()) return null;
  let id = null;
  if (LONG_OPS.has(body.type)) {
    id = newJobId();
    body = { ...body, job: id };
    const j = jobFor(id, body.type);
    // Quick operations finish before the panel would appear, so it never flickers.
    j.timer = setTimeout(() => showJob(j), 400);
  }
  try {
    const res = await post('op', body);
    runHooks(AFTER_OP, body, res);
    if (res.cancelled) notice(res.label, { kind: 'info', ...(res.undoable ? { action: { label: 'Undo', run: undo } } : {}) });
    else if (!silent) notice(res.label, res.undoable ? { action: { label: 'Undo', run: undo } } : {});
    if (res.affected?.length) await refreshDirs(res.affected);
    if (S.tab === 'journal') drawLedger();
    return res;
  } catch (err) {
    // What was finished before it stopped is journaled like a whole change,
    // so features follow it the same way, before the folders are re-read.
    if (err.results) runHooks(AFTER_OP, body, { ok: false, partial: true, label: err.message, results: err.results, affected: err.affected });
    if (err.affected?.length) refreshDirs(err.affected);
    if (err.code === 'EEXIST' && (body.type === 'move' || body.type === 'copy') && body.onConflict !== 'keepBoth') {
      notice(err.message, { kind: 'error', action: { label: 'Keep both', run: () => runOp({ ...body, onConflict: 'keepBoth' }) } });
    } else notice(err.message, { kind: 'error' });
    return null;
  } finally {
    if (id) endJob(id);
  }
}

async function undo() {
  if (refuseWarm()) return;
  try {
    const res = await post('undo');
    runHooks(AFTER_OP, { type: 'undo' }, res);
    notice(res.label);
    await refreshDirs(res.affected);
    if (S.tab === 'journal') drawLedger();
  } catch (err) {
    // An Undo that stopped part way carried some paths back: features
    // follow them, and their folders are read again, as for a whole one.
    if (err.moved?.length) runHooks(AFTER_OP, { type: 'undo' }, { ok: false, partial: true, label: err.message, moved: err.moved, affected: err.affected });
    if (err.affected?.length) refreshDirs(err.affected);
    if (S.tab === 'journal') drawLedger();
    notice(err.message, { kind: err.code === 'ENOUNDO' ? 'info' : 'error' });
  }
}

/**
 * Says why nothing can be changed when any of nodes is inside the open
 * archive, and returns true. runOp refuses such a change anyway; this
 * says so before a dialog asks for a name or a destination.
 */
function refuseInside(nodes) {
  if (!S.interior || !nodes.some((n) => hostOf(n))) return false;
  notice(S.interior.lock, { kind: 'info' });
  return true;
}

const nameProblem = (v) => {
  const name = v.name;
  if (!name.trim()) return 'Enter a name.';
  if (/[\\/]/.test(name)) return 'A name cannot contain a slash.';
  if (name === '.' || name === '..') return 'That name is reserved.';
  return null;
};

async function newFolder(dir = S.focus) {
  if (refuseInside([dir]) || refuseWarm()) return;
  const v = await ask({
    title: 'New folder', body: `Inside ${relPath(dir) || S.info.name}`, confirm: 'Create', confirmIcon: 'newFolder',
    fields: [{ name: 'name', label: 'Folder name', value: 'New folder' }], validate: nameProblem,
  });
  if (!v) return;
  const res = await runOp({ type: 'mkdir', parent: relPath(dir), name: v.name });
  if (res?.created) {
    const node = S.model.find(res.created);
    if (node) select(node);
  }
}

async function rename(node = S.primary) {
  if (!node || !node.p || refuseInside([node]) || refuseWarm()) return;
  const v = await ask({
    title: 'Rename', confirm: 'Rename', confirmIcon: 'rename', validate: nameProblem,
    fields: [{ name: 'name', label: node.d ? 'Folder name' : 'File name', value: node.n, selectStem: !node.d }],
  });
  if (!v || v.name === node.n) return;
  const res = await runOp({ type: 'rename', path: relPath(node), name: v.name });
  if (res?.renamed) {
    const again = S.model.find(res.renamed);
    if (again) select(again);
  }
}

const movable = (nodes) => nodes.filter((n) => n.p);
const tops = (nodes) => nodes.filter((n) => !nodes.some((o) => o !== n && isAncestor(o, n)));

function startPlacing(type, nodes = [...S.sel]) {
  nodes = tops(movable(nodes));
  if (!nodes.length || refuseInside(nodes) || refuseWarm()) return;
  closeFloating();
  S.placing = { type, nodes };
  $('placing').hidden = false;
  $('placing-text').textContent = `${type === 'move' ? 'Move' : 'Copy'} ${nodes.length === 1 ? `"${nodes[0].n}"` : `${nodes.length} items`}: click a folder in the world, or travel to one and place it there.`;
  $('view').classList.add('is-placing');
  repaint();
  say('Choose a destination folder. Escape cancels.');
}

function stopPlacing() {
  if (!S.placing) return;
  S.placing = null;
  $('placing').hidden = true;
  $('view').classList.remove('is-placing');
  repaint();
}

function destinationProblem(type, nodes, dest) {
  if (!dest || !dest.d) return 'not a folder';
  if (hostOf(dest)) return 'it is inside an archive';
  if (dest.e) return 'that folder cannot be read';
  if (nodes.some((n) => n.d && isAncestor(n, dest))) return 'a folder cannot go inside itself';
  if (type === 'move' && nodes.every((n) => n.p === dest)) return 'already there';
  return null;
}

async function transfer(type, nodes, dest) {
  nodes = tops(movable(nodes));
  const problem = destinationProblem(type, nodes, dest);
  if (problem) {
    notice(`Cannot ${type} there: ${problem}.`, { kind: 'info' });
    return;
  }
  stopPlacing();
  await runOp({ type, paths: nodes.map(relPath), dest: relPath(dest) });
}

async function duplicate(nodes = [...S.sel]) {
  nodes = tops(movable(nodes));
  if (refuseInside(nodes) || refuseWarm()) return;
  const byParent = new Map();
  for (const n of nodes) byParent.set(n.p, [...(byParent.get(n.p) || []), n]);
  for (const [parent, list] of byParent) await runOp({ type: 'copy', paths: list.map(relPath), dest: relPath(parent) });
}

async function remove(nodes = [...S.sel]) {
  nodes = tops(movable(nodes));
  if (!nodes.length || refuseInside(nodes) || refuseWarm()) return;
  const size = nodes.reduce((a, n) => a + n.s, 0);
  const what = nodes.length === 1 ? `"${nodes[0].n}"` : `${nodes.length} items`;
  const ok = await ask({
    title: `Remove ${what}?`, confirm: 'Remove to holding area', danger: true,
    body: `${fmtBytes(size)} will be moved into Terrane's holding area inside this directory. Nothing is deleted: Undo, or the Journal tab, puts it back exactly where it was.`,
  });
  if (ok) await runOp({ type: 'trash', paths: nodes.map(relPath) });
}

/**
 * Puts text on the clipboard and says so with said; when the browser
 * refuses, says that instead, with fail as the rest of the sentence.
 * Resolves to true when the text was copied.
 */
async function copyText(text, said, fail = '') {
  try {
    await navigator.clipboard.writeText(text);
    notice(said);
    return true;
  } catch {
    notice(`The browser did not allow clipboard access.${fail ? ` ${fail}` : ''}`, { kind: 'error' });
    return false;
  }
}

async function copyPaths(nodes = [...S.sel]) {
  if (!nodes.length) nodes = [S.focus];
  await copyText(nodes.map(absPath).join('\n'), nodes.length === 1 ? 'Path copied to the clipboard' : `${nodes.length} paths copied to the clipboard`,
    'The path is shown in the inspector.');
}

/**
 * What Verify by content proved, per file node: { hash, mode, s, m } as
 * read. A survey after a refresh rebuilds the candidates by size; a group
 * whose every file was read and has kept its size and last change since
 * is split by content again, as Verify split it, so a refresh elsewhere
 * no longer forgets a verification (a same-size file that matched none
 * stays out). Node references only: a Rescan all starts afresh.
 */
const proved = new WeakMap();

/** The candidates with what was proved put back: verified groups by content where nothing changed. */
function keepVerified(groups) {
  let changed = false;
  const out = [];
  for (const g of groups) {
    const rec = g.files.map((f) => proved.get(f));
    if (!rec.every((r, i) => r && r.s === g.files[i].s && r.m === g.files[i].m)) {
      out.push(g);
      continue;
    }
    changed = true;
    const buckets = new Map();
    g.files.forEach((f, i) => buckets.set(rec[i].hash, [...(buckets.get(rec[i].hash) || []), f]));
    for (const f of g.files) f.dup = 0;
    for (const [hash, list] of buckets) {
      if (list.length > 1) out.push({ size: g.size, files: list, waste: g.size * (list.length - 1), verified: true, mode: proved.get(list[0]).mode, hash });
    }
  }
  if (!changed) return groups;
  out.sort((a, b) => b.waste - a.waste);
  out.forEach((g, i) => g.files.forEach((f) => { f.dup = i + 1; }));
  return out;
}

async function verifyDuplicates() {
  // Region mode: the service lists the top groups' files, read by path.
  if (S.regions) return verifyRegions();
  // A survey still queued after a refresh holds the files as they are
  // now; the one shown may hold nodes a refresh has replaced since.
  if (S.surveyTimer) surveyNow();
  const groups = S.survey.dupGroups;
  const files = [];
  for (const g of groups) {
    if (files.length + g.files.length > 4000) break;
    files.push(...g.files);
  }
  if (!files.length) return;
  notice(`Reading ${fmtCount(files.length)} files to compare their contents…`, { kind: 'info', ms: 3000 });
  let results;
  try {
    ({ results } = await post('hash', { paths: files.map(relPath) }));
  } catch (err) {
    notice(err.message, { kind: 'error' });
    return;
  }
  const hashOf = new Map(files.map((f, i) => [f, results[i]]));
  for (const [f, h] of hashOf) if (h && !h.error) proved.set(f, { hash: h.hash, mode: h.mode, s: f.s, m: f.m });
  const out = [];
  for (const g of groups) {
    if (!hashOf.has(g.files[0])) {
      out.push(g);
      continue;
    }
    const buckets = new Map();
    for (const f of g.files) {
      const h = hashOf.get(f);
      if (!h || h.error) continue;
      buckets.set(h.hash, [...(buckets.get(h.hash) || []), f]);
    }
    for (const list of buckets.values()) {
      // The hash is kept with the group, so an action on it can tell a
      // file that changed since it was verified.
      if (list.length > 1) out.push({ size: g.size, files: list, waste: g.size * (list.length - 1), verified: true, mode: hashOf.get(list[0]).mode, hash: hashOf.get(list[0]).hash });
    }
    for (const f of g.files) f.dup = 0;
  }
  out.sort((a, b) => b.waste - a.waste);
  out.forEach((g, i) => g.files.forEach((f) => { f.dup = i + 1; }));
  S.survey.dupGroups = out;
  S.model.dupGroups = out;
  const confirmed = out.filter((g) => g.verified);
  notice(`${fmtCount(confirmed.length)} groups confirmed identical, ${fmtBytes(confirmed.reduce((a, g) => a + g.waste, 0))} reclaimable.`);
  repaint();
  drawLedger();
  drawLegend();
  drawInspector();
}

/* ====================================================================== */
/* menus                                                                  */
/* ====================================================================== */

/** Menu items the MENU entries add for node (null: the folder you are in), as one group. */
function menuExtras(node, ctx) {
  const out = [];
  for (const m of MENU) {
    if (typeof m.items !== 'function') continue;
    try {
      const got = m.items(node, ctx);
      if (got?.length) out.push(...got.filter(Boolean));
    } catch (err) {
      console.error(`MENU "${m.id}" failed:`, err);
    }
  }
  return out.length ? ['sep', ...out] : [];
}

/** Menu items the MENU entries add for a selection of several (many()), in order; they follow Copy paths. */
function menuMany(nodes, ctx) {
  const out = [];
  for (const m of MENU) {
    if (typeof m.many !== 'function') continue;
    try {
      const got = m.many(nodes, ctx);
      if (got?.length) out.push(...got.filter(Boolean));
    } catch (err) {
      console.error(`MENU "${m.id}" failed:`, err);
    }
  }
  return out;
}

function menuFor(node, x, y) {
  const ro = writable();
  const many = S.sel.size > 1 && S.sel.has(node);
  const isRoot = node && !node.p;
  const lock = (extra) => ({ disabled: !!(ro || extra), reason: ro || extra || undefined });
  // Inside an open archive nothing can be changed, opened or revealed.
  const shut = (inside, extra) => (inside ? { disabled: true, reason: 'inside an archive' } : lock(extra));
  let items;
  if (!node) {
    const here = !!hostOf(S.focus);
    items = [
      { label: 'New folder here…', icon: 'newFolder', hint: 'N', run: () => newFolder(S.focus), ...shut(here) },
      { label: 'Copy path of this folder', icon: 'copyPath', run: () => copyPaths([S.focus]) },
      { label: 'Reveal in file manager', icon: 'reveal', run: () => runOp({ type: 'reveal', path: relPath(S.focus) }), ...(here ? shut(true) : {}) },
      'sep',
      { label: 'Up one level', icon: 'up', hint: 'Backspace', run: goUp, disabled: !S.focus.p, reason: 'already at the root' },
      { label: 'Rise to the overview', icon: 'overview', hint: '0', run: overview },
      { label: 'Re-read this folder', icon: 'refresh', hint: 'F5', run: () => refreshDirs([relPath(S.focus)]) },
      ...menuExtras(null, { ro }),
    ];
  } else if (many) {
    const nodes = [...S.sel];
    const inside = nodes.some((n) => hostOf(n));
    items = [
      { label: `Move ${nodes.length} items to…`, icon: 'move', hint: 'M', run: () => startPlacing('move'), ...shut(inside) },
      { label: `Copy ${nodes.length} items to…`, icon: 'copy', run: () => startPlacing('copy'), ...shut(inside) },
      { label: 'Duplicate in place', icon: 'duplicate', hint: 'Ctrl+D', run: () => duplicate(), ...shut(inside) },
      { label: 'Copy paths', icon: 'copyPath', hint: 'Ctrl+C', run: () => copyPaths() },
      ...menuMany(nodes, { ro, off: inside ? 'inside an archive' : ro }),
      'sep',
      { label: `Remove ${nodes.length} items…`, icon: 'remove', hint: 'Del', danger: true, run: () => remove(), ...shut(inside) },
    ];
  } else {
    const rootLock = isRoot ? 'the authorized root' : null;
    const inside = !!hostOf(node);
    items = [
      node.d ? { label: 'Go there', icon: 'goThere', hint: 'Enter', run: () => setFocus(node), disabled: !!node.e, reason: 'cannot be read' }
        : { label: 'Open', icon: 'open', hint: 'Enter', run: () => activate(node), ...(inside ? shut(true) : {}) },
      { label: 'Reveal in file manager', icon: 'reveal', run: () => runOp({ type: 'reveal', path: relPath(node) }), ...(inside ? shut(true) : {}) },
      { label: 'Copy path', icon: 'copyPath', hint: 'Ctrl+C', run: () => copyPaths([node]) },
      ...menuExtras(node, { ro }),
      'sep',
      node.d ? { label: 'New folder inside…', icon: 'newFolder', run: () => newFolder(node), ...shut(inside, node.e ? 'cannot be read' : null) } : null,
      { label: 'Rename…', icon: 'rename', hint: 'F2', run: () => rename(node), ...shut(inside, rootLock) },
      { label: 'Move to…', icon: 'move', hint: 'M', run: () => startPlacing('move', [node]), ...shut(inside, rootLock) },
      { label: 'Copy to…', icon: 'copy', run: () => startPlacing('copy', [node]), ...shut(inside, rootLock) },
      { label: 'Duplicate in place', icon: 'duplicate', hint: 'Ctrl+D', run: () => duplicate([node]), ...shut(inside, rootLock) },
      'sep',
      { label: 'Remove…', icon: 'remove', hint: 'Del', danger: true, run: () => remove([node]), ...shut(inside, rootLock) },
    ].filter(Boolean);
  }
  openMenu(x, y, items, { title: many ? `${S.sel.size} items` : node ? node.n : S.focus.n });
}

/* ====================================================================== */
/* drawing: bar, ledger, inspector, title block                           */
/* ====================================================================== */

function drawAll() {
  drawCrumbs();
  drawLedger();
  drawInspector();
  drawLegend();
  drawStatus();
  $('b-up').toggleAttribute('disabled', !S.focus?.p);
  const off = writable();
  for (const id of ['b-new', 'b-undo']) {
    const b = $(id);
    b.dataset.title ??= b.title;
    b.toggleAttribute('disabled', !!off);
    b.title = !off ? b.dataset.title : off === WARM_WAIT ? `Unavailable: ${WARM_WAIT}` : `Unavailable: Terrane is in ${off}`;
  }
}

function dropTarget(node, target) {
  target.addEventListener('dragover', (e) => {
    if (!S.drag || destinationProblem('move', S.drag, node)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = e.ctrlKey ? 'copy' : 'move';
    target.classList.add('is-drop');
  });
  target.addEventListener('dragleave', () => target.classList.remove('is-drop'));
  target.addEventListener('drop', (e) => {
    e.preventDefault();
    target.classList.remove('is-drop');
    if (S.drag) transfer(e.ctrlKey ? 'copy' : 'move', S.drag, node);
  });
}

function drawCrumbs() {
  const host = $('crumbs');
  const chain = [];
  // An open archive's file is not a step of its own: its root, named as
  // the file is, stands for it.
  for (let a = S.focus; a; a = a.p) if (a.d) chain.unshift(a);
  const parts = [];
  chain.forEach((node, i) => {
    if (i) parts.push(el('span', { class: 'slash', 'aria-hidden': 'true', text: '/' }));
    const b = el('button', { class: S.interior?.root === node ? 'crumb is-archive' : 'crumb', type: 'button', text: node.n, title: absPath(node), 'aria-current': node === S.focus ? 'location' : null, onclick: () => setFocus(node) });
    dropTarget(node, b);
    parts.push(b);
  });
  host.replaceChildren(...parts);
  host.scrollLeft = host.scrollWidth;
}

/* ---------- ledger ---------- */

let list;

function rowFor(node, { showPath = false, total } = {}) {
  // S.time.crossed: the time view's answer, by the rules the layout draws with.
  const crossed = !!S.time?.crossed?.(node);
  // A locked entry of an open archive, or one whose name climbs out.
  const mark = S.interior?.rowMark(node);
  const cls = (node.d ? (node.e ? 'swatch is-sealed' : kids(node) ? 'swatch is-dir' : 'swatch is-empty') : 'swatch') + (crossed ? ' is-crossed' : '') + (mark ? ` ${mark.cls}` : '');
  const share = total ? Math.max(0, Math.min(1, node.s / total)) : 0;
  const row = el('div', { class: `row${S.sel.has(node) ? ' is-selected' : ''}`, draggable: node.p && !node.ref && !writable() && !hostOf(node) ? 'true' : null, 'aria-selected': S.sel.has(node) ? 'true' : 'false', title: showPath ? relPath(node) : node.n },
    el('span', { class: cls, style: node.d ? null : { background: cssHex(KINDS[node.k].color) } }),
    el('span', { class: 'row-name' }, node.n, node.d ? el('small', { text: node.e ? node.e : fmtCount(node.fc) }) : showPath ? el('small', { text: relPath(node.p) || '/' }) : null,
      crossed ? el('span', { class: 'sr', text: `, changed since ${S.time.date}` }) : null, mark ? el('span', { class: 'sr', text: mark.sr }) : null),
    el('span', { class: 'row-size' }, fmtBytes(node.s), total ? el('i', { style: { width: `${share * 100}%` } }) : null));
  // A ref's row acts on its node, found by its path and put in its place.
  row.addEventListener('click', (e) => {
    list.cursor = list.items.indexOf(node);
    const add = e.ctrlKey || e.metaKey;
    withNode(node, (n) => {
      if (showPath && !add) reveal(n);
      else select(n, { add });
    });
  });
  row.addEventListener('dblclick', () => {
    withNode(node, (n) => {
      if (S.placing && n.d) transfer(S.placing.type, S.placing.nodes, n);
      else activate(n);
    });
  });
  row.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const { clientX: x, clientY: y } = e;
    withNode(node, (n) => {
      if (!S.sel.has(n)) select(n);
      menuFor(n, x, y);
    });
  });
  row.addEventListener('dragstart', (e) => {
    S.drag = S.sel.has(node) ? tops(movable([...S.sel])) : [node];
    e.dataTransfer.effectAllowed = 'copyMove';
    e.dataTransfer.setData('text/plain', S.drag.map(absPath).join('\n'));
  });
  row.addEventListener('dragend', () => { S.drag = null; S.view.setHover(-1); });
  if (node.d) dropTarget(node, row);
  return row;
}

const byName = (a, b) => a.n.localeCompare(b.n, undefined, { numeric: true, sensitivity: 'base' });

/**
 * The Untouched order, longest untouched first: by typical age, the median
 * step of the age table (a file by its own step), the larger step first;
 * then the older last change; then the name. Before the first age table,
 * and inside an open archive, whose folders the table does not hold, by
 * the last change alone, oldest first, then the name.
 */
function untouchedOrder() {
  const ages = S.ages;
  if (!ages || hostOf(S.focus)) return (a, b) => changedAt(a) - changedAt(b) || byName(a, b);
  const steps = new Map();
  const stepOf = (n) => {
    let k = steps.get(n);
    if (k === undefined) steps.set(n, (k = ages.medianStep(n)));
    return k;
  };
  return (a, b) => stepOf(b) - stepOf(a) || changedAt(a) - changedAt(b) || byName(a, b);
}

function sortedContents() {
  const { key, dir } = S.sort;
  const items = [...S.focus.c];
  const cmp = key === 'name' ? byName : key === 'date' ? (a, b) => changedAt(a) - changedAt(b)
    : key === 'untouched' ? untouchedOrder() : (a, b) => a.s - b.s;
  items.sort((a, b) => cmp(a, b) * dir);
  return items;
}

/** A tab's label, in a span that can shorten with an ellipsis when the ledger is narrow. */
const tabLabel = (tab) => el('span', { class: 'tab-label', text: tab.label });

/** Icons for the built-in tabs; a feature's tab may name its own as tab.icon. */
const TAB_ICON = { contents: 'contents', findings: 'findings', survey: 'survey', journal: 'journal' };
const tabIcon = (tab) => icon(tab.icon || TAB_ICON[tab.id] || 'list-tree');

/** Moves the tab underline and the lens plate under their chosen items. */
function slideIndicators() {
  slideIndicator(document.querySelector('.tabs'), document.querySelector('.tabs [aria-selected=true]'));
  slideIndicator($('lens'), document.querySelector('#lens [aria-checked=true]'));
}

/** The tab buttons, made from TABS. */
function drawTabs() {
  document.querySelector('.tabs').replaceChildren(...[...TABS].map((tab) => el('button', {
    role: 'tab', type: 'button', 'data-tab': tab.id, 'aria-selected': String(tab.id === S.tab), title: tab.label,
    onclick: () => {
      S.tab = tab.id;
      drawLedger();
    },
  }, tabIcon(tab), tabLabel(tab))));
  requestAnimationFrame(slideIndicators);
}

/**
 * What identifies a control across a redraw: its data-k, or its tag,
 * class and name. A control rebuilt with the same signature is the same
 * control to the person using it.
 */
const signature = (node) => node.dataset?.k || `${node.tagName}.${node.className}|${node.getAttribute('aria-label') || node.textContent.trim().slice(0, 120)}`;
const FOCUSABLE = 'button, summary, a[href], input, select, textarea, [tabindex]';

/**
 * Runs draw(), which rebuilds what host holds, and keeps keyboard focus
 * where it was: on the control with the same signature (the same one of
 * several), else on fallback (the container), so the next Tab goes on
 * from there instead of from the top of the page. A draw that put focus
 * somewhere itself is left alone.
 */
function keepFocus(host, draw, fallback = host) {
  const was = document.activeElement;
  const inside = was && was !== document.body && host.contains(was);
  const sig = inside ? signature(was) : null;
  const nth = inside ? [...host.querySelectorAll(FOCUSABLE)].filter((x) => signature(x) === sig).indexOf(was) : -1;
  draw();
  if (!inside || was.isConnected) return;
  const now = document.activeElement;
  if (now && now !== document.body && host.contains(now)) return;
  const same = [...host.querySelectorAll(FOCUSABLE)].filter((x) => signature(x) === sig);
  const to = same[Math.max(0, Math.min(nth, same.length - 1))];
  to?.focus({ preventScroll: true });
  if (document.activeElement !== to) fallback?.focus({ preventScroll: true });
}

let ledgerKey = null;
function drawLedger(keepScroll = false) {
  const t0 = performance.now();
  keepFocus($('ledger'), () => drawLedgerNow(keepScroll), $('ledger-rich').hidden ? $('ledger-list') : $('ledger-rich'));
  measure('terrane:ledger', t0);
}

function drawLedgerNow(keepScroll) {
  let tab = TABS.get(S.tab);
  if (!tab) {
    S.tab = 'contents';
    tab = TABS.get(S.tab);
  }
  // The list only returns to the top when it shows something different;
  // a refresh of the same folder leaves the reader where they were.
  const key = [S.tab, S.focus, S.sort.key, S.sort.dir, S.query].map((v) => (typeof v === 'object' ? v?.n : v)).join('|') + '|' + (S.tab === 'contents' ? relPath(S.focus) : '') + (tab.key ? `|${tab.key()}` : '');
  if (key === ledgerKey) keepScroll = true;
  ledgerKey = key;
  document.querySelectorAll('.tabs [role=tab]').forEach((b) => {
    b.setAttribute('aria-selected', String(b.dataset.tab === S.tab));
    const t = TABS.get(b.dataset.tab);
    if (t?.count) {
      const n = t.count();
      b.replaceChildren(tabIcon(t), tabLabel(t), n != null ? el('span', { class: 'count', text: fmtCount(n) }) : '');
    }
  });
  slideIndicators();
  const sub = $('ledger-sub');
  sub.className = 'panel-sub';
  sub.dataset.tab = S.tab;
  const rich = $('ledger-rich');
  const listHost = $('ledger-list');
  const useList = !!tab.list;
  listHost.hidden = !useList;
  rich.hidden = useList;
  if (useList) {
    // A tab that has no sentence for an empty list shows none, never another tab's.
    list.setEmpty('');
    list.setLabel(tab.id === 'contents' ? `Contents of ${S.focus.n}` : tab.label);
  }
  tab.draw(sub, useList ? listHost : rich, keepScroll);
}

/**
 * A sort key toggle for the ledger's sub-line; the chosen one shows its
 * direction. titles ({ off, up, down }) names an order that ascending and
 * descending do not describe.
 */
function sortToggle(label, on, dir, onclick, titles = null) {
  const title = titles ? (on ? `${dir < 0 ? titles.down : titles.up}; click to reverse` : titles.off)
    : on ? `Sorted by ${label.toLowerCase()}, ${dir < 0 ? 'descending' : 'ascending'}; click to reverse` : `Sort by ${label.toLowerCase()}`;
  return el('button', { class: 'sort', type: 'button', 'aria-pressed': String(on), title, onclick }, label, on ? icon(dir < 0 ? 'sortDown' : 'sortUp') : null);
}

/**
 * A ledger head's caption: one line of 36 characters or fewer, ending in
 * an ellipsis where the ledger is narrower, its words also its title.
 */
const caption = (text) => el('span', { class: 'grow', text, title: text });

/** The count of a head's count row: "14 items" and " · 199 GB", which a selection's total can stand in for. */
const subCount = (n, bytes) => el('span', { class: 'sub-count', title: `${n}${bytes}` }, el('span', { class: 'n', text: n }), el('span', { class: 'b', text: bytes }));

/** The Untouched key's titles: its order is by typical age, not by a value up or down. */
const UNTOUCHED = Object.freeze({
  off: 'Longest untouched first (typical age)',
  up: 'Sorted longest untouched first (typical age)',
  down: 'Sorted most recently touched first (typical age)',
});

/**
 * The controls LEDGER_SUB entries add to a tab's count row, in a
 * span.sub-tools; null when there are none. One that throws is reported
 * and left out.
 */
function subTools(tab, ctx) {
  const parts = [];
  for (const x of LEDGER_SUB) {
    if (x.tab !== tab) continue;
    try {
      const r = x.build(ctx);
      if (Array.isArray(r)) parts.push(...r.flat(Infinity));
      else parts.push(r);
    } catch (err) {
      console.error(`LEDGER_SUB "${x.id}" failed:`, err);
    }
  }
  const got = parts.filter(Boolean);
  return got.length ? el('span', { class: 'sub-tools' }, ...got) : null;
}

/** The sections TAB_SECTIONS entries add to a tab, in order, for its draw to append. */
function tabSections(tab) {
  const out = [];
  for (const x of TAB_SECTIONS) {
    if (x.tab !== tab) continue;
    try {
      const r = x.build();
      if (r) out.push(r);
    } catch (err) {
      console.error(`TAB_SECTIONS "${x.id}" failed:`, err);
    }
  }
  return out;
}

function drawContents(sub, _host, keepScroll) {
  // Name and Untouched start in their natural order (dir 1), size and
  // Changed largest and newest first; a second press reverses.
  const sortBtn = (key, label, titles) => sortToggle(label, S.sort.key === key, S.sort.dir, () => {
    S.sort = { key, dir: S.sort.key === key ? -S.sort.dir : key === 'name' || key === 'untouched' ? 1 : -1 };
    drawLedger();
  }, titles);
  const f = S.focus;
  const n = kids(f);
  const items = sortedContents();
  const tools = subTools('contents', { items, search: S.search, focus: f });
  // Region mode: a folder of more than 5,000 lists its largest; the rest
  // lie in its scree, and the sentence says how many and how much, and
  // how to list them all: a search the service answers, in: the folder.
  // in: lists everything beneath the folder, so the rest are among its
  // matches; Findings turns through them 5,000 at a time, in any order.
  const where = relPath(f) || '/';
  const inToken = `in:${/\s/.test(where) ? `"${where}"` : where}`;
  const tail = f.tail ? `The largest ${fmtCount(f.c.length)} of ${fmtCount(n)} items are listed; the other ${fmtCount(f.tail.n)}, ${fmtBytes(f.tail.s)}, lie in the scree. Find them with ${inToken}: Findings turns through every match, ${fmtCount(FIND_LIMIT)} at a time.` : null;
  // Two rows: the count and its tools, then the sort keys over the list's
  // columns (Name over the names, Size on the size column). An empty
  // folder has nothing to sort, so it shows no keys.
  sub.replaceChildren(
    el('div', { class: 'sub-row is-count' }, subCount(`${fmtCount(n)} item${n === 1 ? '' : 's'}`, ` · ${fmtBytes(f.s)}`), tools),
    ...(tail ? [el('div', { class: 'sub-row sub-note', text: tail })] : []),
    ...(n ? [el('div', { class: 'sub-row is-columns' },
      el('span', { class: 'sorts' }, sortBtn('name', 'Name'), sortBtn('date', 'Changed'), sortBtn('untouched', 'Untouched', UNTOUCHED), sortBtn('size', 'Size')))] : []));
  list.render = (node) => rowFor(node, { total: S.focus.s });
  list.setEmpty(f.e ? `This folder could not be read (${f.e}).` : f.u ? 'Reading this folder…' : f.stub ? 'This folder has not been read yet.' : 'This folder is empty.');
  list.setItems(items, keepScroll, { follow: S.primary });
}

/**
 * The Findings order: the one chosen with the sort keys, else the one the
 * search asks for (search.sort, set by a feature), else largest first.
 */
const findSort = () => S.findSort || S.search?.sort || { key: 'size', dir: -1 };
const changedAt = (n) => (n.d ? n.mm : n.m);

let findCache = { search: null, key: '', items: [] };
/** The matches in the Findings order, sorted once per search and order. */
function findingsItems() {
  const s = S.search;
  // Region mode: the service sent the first 5,000 in the order asked; a
  // different order is asked for, and the list stays until it lands.
  if (s.regions) {
    const o = findSort();
    if (o.key !== s.order.key || o.dir !== s.order.dir) reorderHits(s, o);
    return s.list;
  }
  const { key, dir } = findSort();
  const k = `${key}:${dir}`;
  if (findCache.search === s && findCache.key === k) return findCache.items;
  // runSearch lists largest first; any other order is a sorted copy.
  const items = key === 'size' && dir < 0 ? s.list
    : [...s.list].sort(key === 'date' ? (a, b) => (changedAt(a) - changedAt(b)) * dir : (a, b) => (a.s - b.s) * dir);
  findCache = { search: s, key: k, items };
  return items;
}

function drawFindings(sub, _host, keepScroll) {
  if (!S.search) {
    sub.replaceChildren(caption(S.query && S.scanning ? 'Runs again once the survey is done' : 'Type in Find to search every level.'));
    list.setEmpty('');
    list.setItems([]);
    return;
  }
  const items = findingsItems();
  const order = findSort();
  const sortBtn = (key, label) => sortToggle(label, order.key === key, order.dir, () => {
    S.findSort = { key, dir: order.key === key ? -order.dir : key === 'date' ? 1 : -1 };
    drawLedger();
  });
  const total = S.search.total ?? S.search.list.length;
  // Region mode: the service lists 5,000 at a time in the order asked;
  // the arrows on the count row turn the page (findingsPager).
  const from = S.search.from || 0;
  const cut = S.search.regions && total > S.search.list.length
    ? `Matches ${fmtCount(from + (S.search.list.length ? 1 : 0))} to ${fmtCount(from + S.search.list.length)} of ${fmtCount(total)}, in this order, ${fmtCount(FIND_LIMIT)} to a page.` : '';
  const note = [S.search.note || '', cut].filter(Boolean).join(' ');
  const n = total;
  // The count row's tools: in region mode the arrows that turn the page
  // first, then what features add (LEDGER_SUB).
  let tools = subTools('findings', { items, search: S.search, focus: S.focus });
  const pager = findingsPager(S.search);
  if (pager.length) {
    if (tools) tools.prepend(...pager);
    else tools = el('span', { class: 'sub-tools' }, ...pager);
  }
  // The count row and its tools, the note on a row of its own, then the
  // column heads: Select all in the mark slot, Changed, and Size on the
  // size column. With no match there is nothing to select or sort: the
  // list says so. (replaceChildren would print a null argument as "null".)
  sub.replaceChildren(...[
    el('div', { class: 'sub-row is-count' }, subCount(`${fmtCount(n)} match${n === 1 ? '' : 'es'}`, ` · ${fmtBytes(S.search.bytes)}`), tools),
    note ? el('div', { class: 'sub-row sub-note', text: note }) : null,
    n ? el('div', { class: 'sub-row is-columns' },
      el('button', { class: 'btn btn-icon sub-tool sub-select', type: 'button', title: S.regions ? `Select the first ${fmtCount(SELECT_ALL_REGIONS)} matches` : 'Select every match (up to 5,000)', onclick: () => { selectAllMatches(items); } },
        icon('selectAll'), el('span', { class: 'sr', text: 'Select all' })),
      el('span', { class: 'sorts' }, sortBtn('date', 'Changed'), sortBtn('size', 'Size'))) : null,
  ].filter(Boolean));
  list.render = (node) => rowFor(node, { showPath: true });
  list.setEmpty('Nothing on any level matches this search.');
  list.setItems(items, keepScroll, { follow: S.primary });
}

/**
 * Region mode, more matches than one page: Findings' previous and next
 * 5,000, two 24 px icon tools on its count row, each with data-k so a
 * redraw keeps focus on it; at either end the arrow says why it cannot.
 */
function findingsPager(search) {
  if (!search?.regions || (search.total ?? 0) <= FIND_LIMIT) return [];
  const from = search.from || 0;
  const page = (k, label, name, to, off) => el('button', {
    class: 'btn btn-icon sub-tool', type: 'button', 'data-k': k, 'aria-label': label, 'aria-disabled': off ? 'true' : null,
    title: off ? `${label}: ${off}` : label, onclick: () => { if (!off) turnPage(search, to); },
  }, icon(name));
  return [
    page('page-prev', `Previous ${fmtCount(FIND_LIMIT)} matches`, 'earlier', from - FIND_LIMIT, from > 0 ? null : 'these are the first'),
    page('page-next', `Next ${fmtCount(FIND_LIMIT)} matches`, 'later', from + FIND_LIMIT, from + search.list.length < search.total ? null : 'these are the last'),
  ];
}

/** Which rich-panel sections a person opened or closed, by title: a redraw keeps them so. */
const sectionOpen = new Map();

/**
 * A collapsible section of the rich ledger panel; open is its state until
 * someone toggles it. The body may be one function instead: it builds the
 * body the first time the section is open (at once when it is drawn
 * open), so a closed section of hundreds of rows costs nothing until then.
 */
const section = (title, count, open, ...body) => {
  const make = body.length === 1 && typeof body[0] === 'function' ? body[0] : null;
  const d = el('details', { open: sectionOpen.get(title) ?? open }, el('summary', {}, el('span', { class: 't', text: title }), el('span', { class: 'n', text: count })), ...(make ? [] : body));
  let built = !make;
  const build = () => {
    if (built || !d.open) return;
    built = true;
    d.append(...[make()].flat(Infinity).filter(Boolean));
  };
  build();
  d.addEventListener('toggle', () => {
    sectionOpen.set(title, d.open);
    build();
  });
  return d;
};

function itemButton(node, figure) {
  return el('button', { class: 'item', type: 'button', onclick: () => reveal(node) },
    el('span', { class: node.d ? 'swatch is-dir' : 'swatch', style: node.d ? null : { background: cssHex(KINDS[node.k].color) } }),
    el('span', {}, el('span', { class: 'nm', text: node.n }), el('span', { class: 'path', text: relPath(node.p || node) || '/' })),
    el('span', { class: 'fig', text: figure }));
}

function drawSurvey(sub, host) {
  const sv = S.survey;
  // Region mode: the service's survey is on its way.
  if (!sv || sv.pending) {
    sub.replaceChildren(caption('Compiled once the survey is done'));
    host.replaceChildren();
    return;
  }
  sub.replaceChildren(caption('Noteworthy conditions, every level'));
  host.replaceChildren(...buildSections(SURVEY, sv, {}));
}

/* The Survey tab's own sections, in SURVEY order. */

function surveyDuplicates(sv) {
  return section('Duplicate candidates', fmtCount(sv.dupGroups.length), false, () => duplicatesBody(sv));
}

/** The rows of Duplicate candidates, built when the section is first open. */
function duplicatesBody(sv) {
  const verifiedGroups = sv.dupGroups.filter((g) => g.verified);
  const waste = sv.dupGroups.reduce((a, g) => a + g.waste, 0);
  const reclaimable = verifiedGroups.reduce((a, g) => a + g.waste, 0);
  const ro = writable();
  const dupBody = [];
  if (sv.dupGroups.length) {
    dupBody.push(el('p', { class: 'note', text: verifiedGroups.length
      ? `${fmtCount(verifiedGroups.length)} group${verifiedGroups.length === 1 ? '' : 's'} confirmed identical by content, ${fmtBytes(reclaimable)} reclaimable. Unconfirmed groups share only their size.`
      : `Files of identical size, up to ${fmtBytes(waste)} if all are true copies. Size alone is only a hint.` }));
    dupBody.push(el('div', { class: 'actions' }, el('button', { class: 'btn btn-small', type: 'button', onclick: verifyDuplicates }, icon('verify'), 'Verify by content'),
      el('button', { class: 'btn btn-small', type: 'button', onclick: () => setLens('dup') }, icon('eye'), 'Show in the world')));
    for (const g of sv.dupGroups.slice(0, 60)) {
      dupBody.push(el('div', { class: 'group-head', text: `${g.files.length} × ${fmtBytes(g.size)} · ${g.verified ? (g.mode === 'sampled' ? 'probable (sampled)' : 'identical') : 'same size'}` }));
      for (const f of g.files.slice(0, 12)) dupBody.push(itemButton(f, ''));
      dupBody.push(...dupExtras(g, { node: null, where: 'survey', ro }));
    }
  } else dupBody.push(el('p', { class: 'note', text: 'No files of 4 KB or more share a size.' }));
  return dupBody;
}

async function drawJournal(sub, host) {
  sub.replaceChildren(caption('Changes and the holding area'));
  if (S.info.snapshot) {
    host.replaceChildren(el('p', { class: 'note', text: 'Snapshot mode: this is a recorded copy of the directory structure, so nothing can be changed and there is no journal.' }));
    return;
  }
  let data;
  try {
    data = await get('journal');
  } catch (err) {
    host.replaceChildren(el('p', { class: 'note', text: err.message }));
    return;
  }
  if (S.tab !== 'journal') return;
  const ro = S.info.readOnly;
  const entries = [...data.journal].reverse();
  host.replaceChildren(
    el('details', { open: true }, el('summary', {}, el('span', { class: 't', text: 'Changes' }), el('span', { class: 'n', text: fmtCount(entries.length) })),
      !ro && S.warm ? el('p', { class: 'note', text: WARM_SENTENCE }) : null,
      entries.length ? null : el('p', { class: 'note', text: ro ? 'Read-only mode: nothing can be changed.' : 'Nothing has been changed yet.' }),
      entries.length ? el('p', { class: 'note', text: 'Kept in .terrane-trash with the holding area, so Undo still works after Terrane restarts.' }) : null,
      entries.some((e) => !e.undone) && !ro ? el('div', { class: 'actions' }, el('button', { class: 'btn btn-small', type: 'button', onclick: undo }, icon('undo'), 'Undo latest')) : null,
      entries.map((e) => el('div', { class: 'item is-static' }, el('span', { class: e.undone ? 'swatch is-empty' : 'swatch', style: e.undone ? null : { background: 'var(--verdigris)' } }),
        el('span', {}, el('span', { class: 'nm', text: e.label }),
          el('span', { class: 'path', text: `${fmtDate(e.at)}${e.earlier ? ' · earlier session' : ''}${e.purged ? ' · purged' : e.undone ? ' · undone' : ''}` })), el('span')))),
    el('details', { open: true }, el('summary', {}, el('span', { class: 't', text: 'Holding area' }), el('span', { class: 'n', text: fmtCount(data.holding.length) })),
      el('p', { class: 'note', text: data.holding.length ? 'Removed items wait here, inside .terrane-trash in this directory, until restored or purged.' : 'Empty. Removed items wait here until restored or purged.' }),
      data.holding.map((h) => el('div', { class: 'item is-static' }, el('span', { class: 'swatch' }),
        el('span', {}, el('span', { class: 'nm', text: h.name }), el('span', { class: 'path', text: `from ${h.origin} · ${fmtDate(h.at)}` })),
        ro ? el('span') : el('button', { class: 'btn btn-small', type: 'button', onclick: async () => {
          if (refuseWarm()) return;
          try {
            const res = await post('restore', { ids: [h.id] });
            notice(res.label);
            await refreshDirs(res.affected);
          } catch (err) {
            notice(err.message, { kind: 'error' });
          }
          drawLedger();
        } }, icon('restore'), 'Restore'))),
      data.holding.length && !ro ? el('div', { class: 'actions' }, el('button', { class: 'btn btn-small btn-danger', type: 'button', onclick: async () => {
        if (refuseWarm()) return;
        const ok = await ask({ title: 'Purge the holding area?', danger: true, confirm: 'Delete permanently',
          body: `${data.holding.length} held item${data.holding.length === 1 ? '' : 's'} will be deleted from disk. This is the one action in Terrane that cannot be undone.` });
        if (!ok) return;
        try {
          notice((await post('purge')).label);
        } catch (err) {
          notice(err.message, { kind: 'error' });
        }
        drawLedger();
      } }, icon('remove'), 'Purge holding area…')) : null),
  );
}

/* ---------- inspector ---------- */

/** A fact: its label (one line, its words also its title) and its value. */
function fact(label, ...value) {
  return el('div', {}, el('dt', { text: label, title: label }), el('dd', {}, ...value));
}

/**
 * A value built from parts: each figure with its unit in a span.part that
 * never breaks, joined by " · ", so a value breaks only after a separator.
 * A part may be a node (a <b>) or text; null and false are left out.
 */
function parts(...items) {
  const out = [];
  for (const x of items.flat()) {
    if (x == null || x === false || x === '') continue;
    if (out.length) out.push(' · ');
    out.push(el('span', { class: 'part' }, x));
  }
  return out;
}

/**
 * A section's head: its title, the rule, and a figure at the right in
 * mono. The text reads "Title · figure" (sep, an .sr " · " by default,
 * before the figure), as the head read before the figure had a place of
 * its own; "Since" passes ' ' and keeps reading "Since MM/DD/YYYY".
 */
function sectionTitle(text, figure = null, sep = ' · ') {
  return el('div', { class: 'section-title' }, el('span', { class: 't', text, title: text }),
    figure != null && figure !== '' ? [el('span', { class: 'sr', text: sep }), el('span', { class: 'n', text: figure })] : null);
}
const shareBar = (part, whole) => el('span', { class: 'share' }, el('i', { style: { width: `${whole ? Math.min(100, (part / whole) * 100) : 0}%` } }));
const pct = (part, whole) => (whole ? `${((part / whole) * 100).toFixed(part / whole < 0.1 ? 1 : 0)}%` : '0%');

function composition(dir) {
  const parts = KINDS.map((k, i) => ({ k, bytes: dir.ks[i] })).filter((p) => p.bytes > 0).sort((a, b) => b.bytes - a.bytes);
  if (!parts.length) return [];
  return [
    sectionTitle('Composition'),
    el('div', { class: 'comp', role: 'img', 'aria-label': parts.map((p) => `${p.k.label} ${pct(p.bytes, dir.s)}`).join(', ') },
      parts.map((p) => el('i', { style: { width: `${(p.bytes / dir.s) * 100}%`, background: cssHex(p.k.color) }, title: `${p.k.label} ${fmtBytes(p.bytes)}` }))),
    el('ul', { class: 'comp-key' }, parts.slice(0, 6).map((p) => el('li', {}, el('span', { class: 'swatch', style: { background: cssHex(p.k.color) } }), el('span', { text: p.k.label }), el('span', { text: pct(p.bytes, dir.s) })))),
  ];
}

/**
 * An inspector action. One that cannot run here stays in the tab order,
 * marked aria-disabled, and says why in its name, so a keyboard or
 * screen-reader user learns that it exists and what stops it; the
 * section's note says the same where it can be seen.
 */
function actionButton(label, run, { off, danger, wide, title, icon: name, named } = {}) {
  return el('button', {
    class: `btn${danger ? ' btn-danger' : ''}${wide ? ' wide' : ''}`, type: 'button', 'aria-disabled': off ? 'true' : null, 'data-named': named ? '' : null,
    title: off ? `Unavailable: ${off}` : title, onclick: (e) => { if (!off) run(e); },
  }, name ? icon(name) : null, label, off ? el('span', { class: 'sr', text: `, unavailable: ${off}` }) : null);
}

/** One line under a grid of actions naming why some are unavailable; null when none is. */
function offNote(...reasons) {
  const why = [...new Set(reasons.filter(Boolean))];
  return why.length ? el('p', { class: 'actions-why', text: `Unavailable here: ${why.join('; ')}.` }) : null;
}

let inspected = null;
let inspectTimer = 0;
/** Sections settle in one after another, but only when the subject changes. */
function settleInspector(host, subject) {
  if (subject === inspected) return;
  inspected = subject;
  [...host.children].forEach((c, i) => c.style.setProperty('--i', String(i)));
  host.classList.remove('is-entering');
  void host.offsetWidth;
  host.classList.add('is-entering');
  clearTimeout(inspectTimer);
  inspectTimer = setTimeout(() => host.classList.remove('is-entering'), 600);
}

function drawInspector() {
  const t0 = performance.now();
  const host = $('inspector-body');
  keepFocus(host, drawInspectorNow, host);
  measure('terrane:inspector', t0);
}

function drawInspectorNow() {
  const host = $('inspector-body');
  const ro = writable();
  queueMicrotask(() => settleInspector(host, S.sel.size > 1 ? `sel:${S.sel.size}` : S.primary || S.focus));
  if (S.sel.size > 1) {
    const nodes = [...S.sel];
    const size = tops(nodes).reduce((a, n) => a + n.s, 0);
    const off = nodes.some((n) => hostOf(n)) ? 'inside an archive' : ro;
    host.replaceChildren(
      el('div', { class: 'insp-title' }, el('div', { class: 'insp-kind', text: 'Selection' }), el('h3', { class: 'insp-name', text: `${fmtCount(nodes.length)} items` })),
      el('dl', { class: 'facts' }, fact('Size', parts(el('b', { text: fmtBytes(size) }), `${pct(size, S.model.root.s)} of root`), shareBar(size, S.model.root.s)),
        fact('Folders', fmtCount(nodes.filter((n) => n.d).length)), fact('Files', fmtCount(nodes.filter((n) => !n.d).length))),
      sectionTitle('Actions'),
      el('div', { class: 'actions-grid' }, actionButton('Move to…', () => startPlacing('move'), { off, icon: 'move' }), actionButton('Copy to…', () => startPlacing('copy'), { off, icon: 'copy' }),
        actionButton('Duplicate', () => duplicate(), { off, icon: 'duplicate' }), actionButton('Copy paths', () => copyPaths(), { icon: 'copyPath' }),
        actionButton('Remove…', () => remove(), { off, danger: true, icon: 'remove' }), actionButton('Clear selection', () => select(null), { icon: 'clear' })),
      // replaceChildren would print a null argument as the text "null".
      ...[offNote(off)].filter(Boolean),
      // Sections features add for a selection of several (INSPECTOR.many).
      ...buildSections(INSPECTOR.many, nodes, { ro, off }),
    );
    return;
  }
  const node = S.primary;
  if (!node) {
    host.replaceChildren(...buildSections(INSPECTOR.focus, S.focus, { ro }));
    return;
  }
  // inside: the open archive's file when node is one of its entries.
  const inside = hostOf(node);
  const ctx = { ro, lockRoot: inside ? 'inside an archive' : ro || (node.p ? null : 'the authorized root'), visible: S.layout.index.has(node), inside };
  host.replaceChildren(...buildSections(INSPECTOR.node, node, ctx));
  host.scrollTop = 0;
  // An archive's entries are not on disk: there is nothing to stat.
  if (inside) return;
  const { created, linkRow } = ctx;
  get('stat', { path: relPath(node) }).then((st) => {
    if (S.primary !== node || !created) return;
    created.textContent = st.birthtime ? fmtDate(st.birthtime) : 'not recorded';
    if (st.link) {
      linkRow.hidden = false;
      linkRow.lastChild.textContent = st.link;
    }
  }).catch(() => { if (created) created.textContent = 'unavailable'; });
}

/** Builds the sections of one INSPECTOR registry; a section that throws is reported and left out. */
function buildSections(reg, node, ctx) {
  const parts = [];
  for (const s of reg) {
    try {
      const r = s.build(node, ctx);
      if (Array.isArray(r)) parts.push(...r.flat(Infinity));
      else parts.push(r);
    } catch (err) {
      console.error(`${reg.name} "${s.id}" failed:`, err);
    }
  }
  return parts.filter(Boolean);
}

/** A path as text with a <wbr> after every "/" (and so after "!/"): it breaks only there, never inside a name. */
const pathBreaks = (p) => p.split('/').flatMap((seg, i, all) => (i < all.length - 1 ? [`${seg}/`, el('wbr')] : [seg])).filter((x) => x !== '');

const readingRow = (r) => el('li', {}, el('span', { class: `glyph ${r.glyph}` }), el('span', {}, el('b', { text: r.title }), r.text));

/* The inspector's own sections, in INSPECTOR order. */

function nodeTitle(node) {
  const kindLine = node.d ? (node.e ? `Sealed folder · ${node.e}` : kids(node) ? 'Folder' : 'Empty folder')
    : `${KINDS[node.k].label}${extOf(node.n) ? ` · .${extOf(node.n)}` : ''}${node.f & FLAG_LINK ? ' · symbolic link' : ''}${node.f & FLAG_HIDDEN ? ' · hidden' : ''}`;
  return el('div', { class: 'insp-title' },
    el('div', { class: 'insp-kind' }, el('span', { class: node.d ? 'swatch is-dir' : 'swatch', style: node.d ? null : { background: cssHex(KINDS[node.k].color) } }), kindLine),
    el('h3', { class: 'insp-name', text: node.n }));
}

function nodeFacts(node, ctx) {
  const parent = node.p;
  // Filled in by drawInspector when the service answers /stat. An entry of
  // an open archive is measured against the archive, and the archive's
  // root has a file, not a folder, above it.
  ctx.created = el('dd', { text: ctx.inside ? 'not recorded in the archive' : '…' });
  ctx.linkRow = el('div', { hidden: true }, el('dt', { text: 'Points to' }), el('dd'));
  const top = ctx.inside ? S.interior.root : S.model.root;
  return el('dl', { class: 'facts' },
    fact('Size', parts(el('b', { text: fmtBytes(node.s) }), node.s >= 1024 ? `${fmtCount(node.s)} B` : null)),
    parent?.d ? fact('Of parent', pct(node.s, parent.s), shareBar(node.s, parent.s)) : null,
    fact(ctx.inside ? 'Of archive' : 'Of root', pct(node.s, top.s), shareBar(node.s, top.s)),
    node.d ? fact('Contains', parts(`${fmtCount(node.fc)} files`, `${fmtCount(node.dc)} folders`)) : null,
    node.d ? fact('Levels', parts(`${depthOf(node)} above`, `${node.h} below`)) : fact('Level', String(depthOf(node))),
    fact(node.d ? 'Newest' : 'Changed', `${fmtDate(node.d ? node.mm : node.m)}`, el('br'), fmtAge(node.d ? node.mm : node.m)),
    el('div', {}, el('dt', { text: 'Created' }), ctx.created),
    ctx.linkRow,
    !ctx.visible ? fact('In the world', 'inside the framed mass or scree; fly to it to see it') : null);
}

function nodeCopies(node, ctx) {
  if (node.d || !node.dup || !S.survey) return null;
  const g = S.survey.dupGroups[node.dup - 1];
  if (!g) return null;
  return [
    sectionTitle(g.verified ? (g.mode === 'sampled' ? 'Probable copies' : 'Identical copies') : 'Same-size candidates'),
    el('div', {}, g.files.filter((f) => f !== node && relPath(f) !== relPath(node)).slice(0, 8).map((f) => itemButton(f, ''))),
    ...dupExtras(g, { node, where: 'inspector', ro: ctx?.ro ?? writable() }),
  ];
}

/** What DUP_GROUP entries add under a group of duplicate candidates; one that throws is reported and left out. */
function dupExtras(group, ctx) {
  const out = [];
  for (const x of DUP_GROUP) {
    try {
      const r = x.build(group, ctx);
      if (Array.isArray(r)) out.push(...r.flat(Infinity));
      else out.push(r);
    } catch (err) {
      console.error(`DUP_GROUP "${x.id}" failed:`, err);
    }
  }
  return out.filter(Boolean);
}

function nodeActions(node, { ro, lockRoot, visible, inside }) {
  // Inside an open archive nothing is opened, revealed or changed.
  const shut = inside ? 'inside an archive' : null;
  return [
    sectionTitle('Actions'),
    el('div', { class: 'actions-grid' },
      node.d ? actionButton('Go there', () => setFocus(node), { off: node.e ? 'cannot be read' : null, icon: 'goThere' })
        : actionButton('Open', () => activate(node), { title: 'Open with the system default application', off: S.info.snapshot ? 'snapshot mode' : shut, icon: 'open' }),
      actionButton('Reveal', () => runOp({ type: 'reveal', path: relPath(node) }), { title: 'Show in the system file manager', off: S.info.snapshot ? 'snapshot mode' : shut, icon: 'reveal' }),
      actionButton('Rename…', () => rename(node), { off: lockRoot, icon: 'rename' }),
      actionButton('Duplicate', () => duplicate([node]), { off: lockRoot, icon: 'duplicate' }),
      actionButton('Move to…', () => startPlacing('move', [node]), { off: lockRoot, icon: 'move' }),
      actionButton('Copy to…', () => startPlacing('copy', [node]), { off: lockRoot, icon: 'copy' }),
      node.d ? actionButton('New folder inside…', () => newFolder(node), { off: shut || ro || (node.e ? 'cannot be read' : null), wide: true, icon: 'newFolder' }) : null,
      actionButton(visible ? 'Fly to it' : 'Find it in the world', () => reveal(node), { wide: true, title: 'G', icon: 'fly' }),
      actionButton('Remove…', () => remove([node]), { off: lockRoot, danger: true, wide: true, icon: 'remove' })),
    offNote(node.d ? (node.e ? 'cannot be read' : null) : S.info.snapshot ? 'snapshot mode' : shut, lockRoot, node.d ? shut || ro : null),
  ];
}

function nodePreview(node, ctx) {
  const ext = extOf(node.n);
  // An entry of an open archive is never fetched: its path goes through a file.
  if (node.d || node.f & FLAG_LINK || node.s <= 0 || ctx?.inside) return null;
  if (IMAGE_EXT.has(ext)) {
    // Thumbnails only: an original can be hundreds of megabytes.
    const rel = relPath(node);
    const t = thumbs.info(rel);
    const img = thumbs.img(rel, 480, `Preview of ${node.n}`);
    const small = !S.info.snapshot && node.s <= 2 * 1024 * 1024 && ext !== 'svg';
    let body;
    if (img) body = img;
    else if (small) body = el('img', { src: rawUrl(node, 2 * 1024 * 1024), alt: `Preview of ${node.n}`, loading: 'lazy', decoding: 'async' });
    else if (t?.status === 'huge') body = el('div', { class: 'none', text: 'Too large to thumbnail in the normal pass. npm run thumbs -- --huge makes one.' });
    else if (t?.status === 'heavy-svg') body = el('div', { class: 'none', text: 'Heavy vector art. npm run thumbs -- --heavy-svg renders it.' });
    else if (t?.status === 'error') body = el('div', { class: 'none', text: 'This file could not be read as an image.' });
    else body = el('div', { class: 'none', text: 'No thumbnail yet. npm run thumbs makes one.' });
    return [sectionTitle('Preview', t?.w ? `${fmtCount(t.w)} × ${fmtCount(t.h)} px` : null), el('div', { class: 'preview' }, body)];
  }
  if (S.info.snapshot) {
    return [sectionTitle('Preview'), el('div', { class: 'preview' }, el('div', { class: 'none', text: 'Snapshot mode holds names, sizes and dates, not contents.' }))];
  }
  if (node.k === 0 || node.k === 6 || TEXT_EXT.has(ext)) {
    const pre = el('pre', { text: '…' });
    fetch(rawUrl(node, 16384)).then((r) => (r.ok ? r.text() : Promise.reject())).then((t) => {
      pre.textContent = t.includes('\u0000') ? 'Binary content: no text preview.' : t;
    }).catch(() => { pre.textContent = 'This file could not be read.'; });
    return [sectionTitle('Preview', node.s > 16384 ? 'first 16 KB' : null), el('div', { class: 'preview' }, pre)];
  }
  return null;
}

/* ---------- title block ---------- */

function setLens(lens) {
  S.lens = lens;
  S.kindFilter = -1;
  document.querySelectorAll('#lens button').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.lens === lens)));
  slideIndicators();
  repaint();
  drawLegend();
}

function drawLegend() {
  keepFocus($('block'), drawLegendNow, document.querySelector('#lens [aria-checked=true]'));
}

/**
 * A title block label's words: the label's .text span, after its icon.
 * more is a tail that drops out when the window is narrow (block.css).
 */
function setLabel(id, text, more = '') {
  const t = $(id).querySelector('.text');
  if (t.textContent === text + more) return;
  t.replaceChildren(...[text, more ? el('span', { class: 'more', text: more }) : null].filter(Boolean));
}

/**
 * Shows only whole chips: those that do not fit stand behind a "+N" chip
 * whose menu lists them, each isolating its kind as its chip does; the
 * Verify button steps out when it does not fit (the Survey and the
 * palette keep it). Run after each draw and whenever the legend's width
 * changes.
 */
function fitLegend() {
  const host = $('legend');
  host.querySelector('.chip-more')?.remove();
  const chips = [...host.querySelectorAll('.chip[data-kind]')];
  for (const c of chips) c.hidden = false;
  const verify = host.querySelector('.legend-verify');
  if (verify) verify.hidden = false;
  const room = host.clientWidth;
  if (host.scrollWidth <= room + 0.5) return;
  if (verify) {
    verify.hidden = true;
    return;
  }
  if (!chips.length) return;
  const more = el('button', { class: 'chip chip-more', type: 'button', 'aria-haspopup': 'menu', text: `+${chips.length}` });
  host.append(more);
  const gap = parseFloat(getComputedStyle(host).columnGap) || 0;
  const left = host.getBoundingClientRect().left;
  const need = more.getBoundingClientRect().width + gap;
  let kept = 0;
  for (const c of chips) {
    if (c.getBoundingClientRect().right - left + need > room + 0.5) break;
    kept++;
  }
  const rest = chips.slice(kept);
  for (const c of rest) c.hidden = true;
  more.textContent = `+${rest.length}`;
  more.title = `${rest.length} more: ${rest.map((c) => c.dataset.label).join(', ')}`;
  more.setAttribute('aria-label', `${rest.length} more kinds: ${rest.map((c) => c.dataset.label).join(', ')}`);
  more.onclick = () => {
    const r = more.getBoundingClientRect();
    openMenu(r.left, r.top - 2, rest.map((c) => ({ label: `${c.dataset.label} · ${c.dataset.bytes}`, run: () => c.click() })), { title: 'More kinds' });
  };
}
let legendFit = 0;

function drawLegendNow() {
  const host = $('legend');
  if (!S.focus) return;
  const gradient = (stops) => `linear-gradient(to right, ${stops.map(cssHex).join(', ')})`;
  if (S.lens === 'kind') {
    setLabel('legend-label', 'Kind', ' · click to isolate');
    const kinds = KINDS.map((k, i) => ({ k, i, bytes: S.focus.ks[i] })).filter((x) => x.bytes > 0).sort((a, b) => b.bytes - a.bytes);
    if (!kinds.length) {
      host.replaceChildren(el('span', { class: 'legend-none', text: S.focus.fc ? 'Only empty files here.' : 'No files here.' }));
      return;
    }
    host.replaceChildren(...kinds.map((x) => el('button', {
      class: 'chip', type: 'button', 'aria-pressed': String(S.kindFilter === x.i), title: `${x.k.label}: ${fmtBytes(x.bytes)} here`,
      'data-kind': String(x.i), 'data-label': x.k.label, 'data-bytes': fmtBytes(x.bytes),
      onclick: () => {
        S.kindFilter = S.kindFilter === x.i ? -1 : x.i;
        repaint();
        drawLegend();
      },
    }, el('span', { class: 'swatch', style: { background: cssHex(x.k.color) } }), x.k.label)));
    fitLegend();
  } else if (S.lens === 'age') {
    // Files by their last change; a closed mass by its typical age
    // (strata.js), except inside an open archive, which the age table
    // does not hold: there a closed mass shows its newest change.
    setLabel('legend-label', 'Last change · closed masses: typical age');
    const archive = S.interior ? ` Inside ${S.interior.host.n} a closed mass shows its newest change: typical ages are for folders on disk.` : '';
    host.replaceChildren(el('div', { class: 'rampbar', title: `A file shows its last change. A closed mass shows its typical age: half its bytes have not changed since then.${archive}` },
      '10 years +', el('i', { style: { background: gradient(THEME.ageRamp) } }), 'today'));
  } else if (S.lens === 'size') {
    setLabel('legend-label', 'File size · log scale');
    host.replaceChildren(el('div', { class: 'rampbar' }, '0', el('i', { style: { background: gradient(THEME.sizeRamp) } }), fmtBytes(S.survey?.largest[0]?.s || 0)));
  } else {
    setLabel('legend-label', 'Duplicates');
    const groups = S.survey?.dupGroups || [];
    const v = groups.filter((g) => g.verified).length;
    // Each group a swatch and its words, held together; Verify steps out
    // when it does not fit (fitLegend).
    host.replaceChildren(el('div', { class: 'rampbar is-units' },
      el('span', { class: 'unit', title: `Same size: ${fmtCount(groups.length - v)} groups` }, el('span', { class: 'swatch', style: { background: 'repeating-linear-gradient(135deg, var(--garnet) 0 3px, var(--paper) 3px 6px)' } }),
        el('span', { class: 'w', text: 'same size · ' }), fmtCount(groups.length - v)),
      el('span', { class: 'unit', title: `Confirmed: ${fmtCount(v)} groups` }, el('span', { class: 'swatch', style: { background: 'var(--garnet)' } }),
        el('span', { class: 'w', text: 'confirmed · ' }), fmtCount(v))),
    groups.length ? el('button', { class: 'btn btn-small legend-verify', type: 'button', onclick: verifyDuplicates }, icon('verify'), 'Verify by content') : '');
    fitLegend();
  }
}

/** The status line's parts, made once so their figures can count between values. */
let statusParts = null;
function statusLine() {
  if (statusParts) return statusParts;
  const fig = () => el('span', { class: 'num' });
  statusParts = { lamp: el('span', { class: 'pulse' }), dirs: fig(), files: fig(), bytes: fig(), held: fig(), entries: fig() };
  // Region mode: how much of the tree the page holds, after the figures.
  statusParts.regions = el('span', { class: 'status-regions', hidden: true }, ' · Regions · ', statusParts.held, ' of ', statusParts.entries, ' entries held');
  // Files, bytes, folders: in a narrow cell the ellipsis takes the least needed figure first.
  $('status').replaceChildren(statusParts.lamp, el('span', {}, statusParts.files, ' files · ', statusParts.bytes, ' · ', statusParts.dirs, ' folders', statusParts.regions));
  return statusParts;
}

function drawStatus() {
  if (!S.model) return;
  const r = S.model.root;
  let cls = 'pulse';
  let label;
  if (S.warm) {
    cls += S.warm.failed ? ' is-off' : ' is-busy';
    label = S.warm.failed ? 'Last session · not surveyed' : 'Last session · surveying';
  } else if (S.scanning) { cls += ' is-busy'; label = 'Surveying'; }
  else if (S.watch === 'snapshot') { cls += ' is-off'; label = `Snapshot · ${fmtDate(S.info.snapshot.takenAt)}`; }
  else if (S.watch === 'live') label = 'Live';
  else if (S.watch === 'demo') label = 'Demo world';
  else if (S.watch === 'lost') { cls += ' is-off'; label = 'Service stopped'; }
  else { cls += ' is-off'; label = 'Manual refresh'; }
  const fit = S.layout?.over ? ' · grain raised, some blocks left out' : S.layout?.coarsened ? ' · grain raised to fit' : '';
  setText($('status-label').querySelector('.text'), `${label}${S.info.readOnly && !S.info.snapshot ? ' · read-only' : ''}${fit}`);
  const parts = statusLine();
  parts.lamp.className = cls;
  countTo(parts.dirs, r.dc, fmtCount);
  countTo(parts.files, r.fc, fmtCount);
  countTo(parts.bytes, r.s, fmtBytes);
  const R = S.regions;
  parts.regions.hidden = !R;
  if (R) {
    setText(parts.held, fmtCount(R.held));
    setText(parts.entries, fmtCount(R.entries ?? 0));
  }
  $('status').title = `${fmtCount(S.layout?.n || 0)} blocks drawn`;
}

/* ====================================================================== */
/* search                                                                 */
/* ====================================================================== */

/**
 * Runs the query in Find. In whole-tree mode at once, over the model; in
 * region mode the service runs it and this returns a promise that settles
 * once the answer is shown (a later query drops an earlier answer), true
 * when it painted the world and drew the ledger.
 */
function runQuery() {
  if (S.regions) return runQueryRegions();
  const pred = parseQuery(S.query, QUERY);
  S.search = pred ? runSearch(S.model, pred) : null;
  $('q-count').textContent = S.search ? `${fmtCount(S.search.list.length)} found` : '';
  runHooks(AFTER_QUERY, S.search, S.query);
}

let queryTimer = 0;
/** Runs what the Find field holds and shows it: Findings for matches, Contents again when cleared. */
function applyQuery() {
  clearTimeout(queryTimer);
  queryTimer = 0;
  const text = $('q').value;
  // A different query opens in its own order; a re-run keeps the one chosen.
  if (text !== S.query) S.findSort = null;
  S.query = text;
  const had = !!S.search;
  const show = (drawn) => {
    if (S.query !== text) return;
    const tab = S.tab;
    if (S.search && S.tab !== 'findings') S.tab = 'findings';
    else if (!S.search && had && S.tab === 'findings') S.tab = 'contents';
    // Region mode: the answer was painted and listed as it landed, in this
    // same task; only a change of tab draws the ledger again.
    if (drawn === true) {
      if (S.tab !== tab) drawLedger();
      return;
    }
    repaint();
    drawLedger();
  };
  const ran = runQuery();
  // Region mode: shown once the service has answered.
  if (ran?.then) return ran.then(show);
  show();
  return undefined;
}

function onQuery() {
  clearTimeout(queryTimer);
  queryTimer = setTimeout(applyQuery, 160);
}

/**
 * Puts text in the Find field and runs it at once, as typing it would
 * after its pause; the Findings list starts again at its first row.
 */
function setQuery(text) {
  $('q').value = text;
  if (text !== S.query) list.cursor = 0;
  return applyQuery();
}

function clearQuery() {
  $('q').value = '';
  onQuery();
}

/* ====================================================================== */
/* guide                                                                  */
/* ====================================================================== */

async function showGuide() {
  const keys = (title, rows) => el('div', {}, el('h3', { text: title }), el('dl', {}, rows.flatMap(([k, d]) => [el('dt', { text: k }), el('dd', { text: d })])));
  const dlg = $('dialog');
  dlg.classList.add('is-wide');
  // The setting for single-key shortcuts, under the keys it governs.
  const box = el('input', { type: 'checkbox', id: 'pref-single-keys', checked: singleKeysEverywhere() || null });
  box.addEventListener('change', () => {
    prefs.singleKeys = box.checked;
    say(box.checked ? 'Single-key shortcuts act wherever focus is.' : 'Single-key shortcuts act only in the world and the ledger list. Ctrl and Alt shortcuts act everywhere.');
  });
  await ask({
    title: 'Guide', confirm: 'Close', cancel: false, focusConfirm: true,
    body: el('div', {}, el('div', { class: 'guide' }, [...KEYS.guide()].map(([title, rows]) => keys(title, rows))),
      el('label', { class: 'guide-pref', for: 'pref-single-keys' }, box,
        el('span', { text: 'Single-key shortcuts act wherever focus is. Off, letters, digits and signs act only in the world and the ledger list; Ctrl and Alt shortcuts always act.' }))),
  });
  dlg.classList.remove('is-wide');
}

/** The strata mark, drawn large for the veil. */
const veilMark = () => {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('class', 'veil-mark');
  svg.setAttribute('viewBox', '0 0 28 20');
  svg.setAttribute('aria-hidden', 'true');
  for (const [x, y, w, h] of [[0, 14, 28, 6], [5, 8, 17, 6], [10, 2, 7, 6]]) {
    const r = document.createElementNS(ns, 'rect');
    Object.entries({ x, y, width: w, height: h }).forEach(([k, v]) => r.setAttribute(k, v));
    svg.append(r);
  }
  return svg;
};

/**
 * Shows the veil over the world. kind 'busy' while surveying, 'error' when
 * the survey or the connection failed, 'quiet' when the world is simply
 * unavailable and the rest of the page must stay usable.
 */
function fatal(title, text, kind = 'error', detail = '') {
  const veil = $('veil');
  clearTimeout(veilTimer);
  veil.className = kind === 'busy' ? '' : `is-${kind}`;
  // A quiet message is a sentence, set in sans; a path or an error in
  // mono. The detail behind a quiet message stands on a line of its own.
  veil.replaceChildren(el('div', { class: 'stack', style: { alignItems: 'center', gap: '10px' } },
    veilMark(), el('strong', { text: title }), el('div', { class: kind === 'quiet' ? 'veil-say' : 'veil-path', text }),
    detail ? el('div', { class: 'veil-detail', text: detail }) : null,
    kind === 'busy' ? el('div', { class: 'veil-rule', 'aria-hidden': 'true' }) : null));
  veil.hidden = false;
}

let veilTimer = 0;
/** Lifts the veil away rather than cutting it. */
function hideVeil() {
  const veil = $('veil');
  if (veil.hidden || veil.classList.contains('is-leaving')) return;
  veil.classList.add('is-leaving');
  veilTimer = setTimeout(() => {
    veil.hidden = true;
    veil.classList.remove('is-leaving');
  }, 420);
}

/* ====================================================================== */
/* wiring                                                                 */
/* ====================================================================== */

function wireViewport() {
  const v = S.view;
  const canvas = $('view');
  v.on.hover = (i, e) => {
    v.setHover(i);
    canvas.classList.toggle('is-hot', i >= 0);
    if (i < 0) return hideTip();
    const L = S.layout;
    const node = L.node[i];
    const t = L.type[i];
    let lines;
    if (t === BOX.SCREE) {
      const info = L.scree.get(i);
      lines = [`${fmtCount(info.count)} small items in ${node.n}`, `${fmtBytes(info.size)} · too small to see from here`, 'Double-click to fly closer'];
    } else if (node.d) {
      lines = [node.n, node.e ? `Sealed · ${node.e}` : `${fmtBytes(node.s)} · ${fmtCount(node.fc)} files · ${fmtCount(node.dc)} folders`];
    } else {
      lines = [node.n, `${fmtBytes(node.s)} · ${KINDS[node.k].label} · changed ${fmtAge(node.m)}`];
    }
    for (const p of TIP_LINES) {
      try {
        const more = p.lines(node, { i, type: t, L });
        if (more) lines.push(...[more].flat().filter(Boolean));
      } catch (err) {
        console.error(`TIP_LINES "${p.id}" failed:`, err);
      }
    }
    tip(e.clientX, e.clientY, lines);
    // A picture only for a pointer that rests: sweeping across the world
    // must not fire a request per block it passes.
    clearTimeout(S.tipTimer);
    // No picture for an entry of an open archive: its path goes through a file.
    if (!node.d && t !== BOX.SCREE && !hostOf(node)) {
      S.tipTimer = setTimeout(() => {
        if (S.view.hoverIndex !== i) return;
        const img = thumbs.img(relPath(node), 160, '');
        if (img) tip(e.clientX, e.clientY, lines, img);
      }, 180);
    }
    return undefined;
  };
  v.on.click = (i, e) => {
    closeFloating();
    const node = i >= 0 ? S.layout.node[i] : null;
    if (S.placing) {
      if (node) transfer(S.placing.type, S.placing.nodes, node.d ? node : node.p);
      return;
    }
    select(node, { add: !!node && (e.ctrlKey || e.metaKey) });
  };
  v.on.moved = onMoved;
  v.on.notice = (text) => notice(text, { kind: 'info' });
  v.on.dblclick = (i, e) => {
    if (i < 0 || S.placing) return;
    const node = S.layout.node[i];
    if (S.layout.type[i] === BOX.SCREE) S.view.zoomAt(0.25, e.clientX, e.clientY);
    else if (S.layout.type[i] === BOX.WALL && S.interior) setFocus(S.interior.root);
    else activate(node);
  };
  v.on.context = (i, e) => {
    const node = i >= 0 && S.layout.type[i] !== BOX.SCREE ? S.layout.node[i] : null;
    if (node && !S.sel.has(node)) select(node);
    menuFor(node, e.clientX, e.clientY);
  };
  canvas.addEventListener('dragover', (e) => {
    if (!S.drag) return;
    const i = v.pick(e.clientX, e.clientY);
    const node = i >= 0 ? S.layout.node[i] : null;
    const dest = node && (node.d ? node : node.p);
    v.setHover(dest ? S.layout.index.get(dest) ?? -1 : -1);
    if (dest && !destinationProblem('move', S.drag, dest)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = e.ctrlKey ? 'copy' : 'move';
    }
  });
  canvas.addEventListener('drop', (e) => {
    e.preventDefault();
    const i = v.pick(e.clientX, e.clientY);
    const node = i >= 0 ? S.layout.node[i] : null;
    if (node && S.drag) transfer(e.ctrlKey ? 'copy' : 'move', S.drag, node.d ? node : node.p);
  });
}

/** Below this width the inspector folds away and ] opens it as a drawer over the world. */
const NARROW = matchMedia('(max-width: 860px)');

/** Whether a side panel is shown now, the narrow drawer included. */
function panelShown(which) {
  const b = document.body.classList;
  if (which === 'ledger') return !b.contains('no-ledger');
  return NARROW.matches ? b.contains('show-inspector') : !b.contains('no-inspector');
}

/** The view tools' toggles say what is actually shown. */
function syncPanelToggles() {
  $('v-ledger').setAttribute('aria-pressed', String(panelShown('ledger')));
  $('v-inspector').setAttribute('aria-pressed', String(panelShown('inspector')));
}

/**
 * Shows or hides a side panel. Below the breakpoint the inspector is a
 * drawer over the world, which ] opens and closes. A panel that holds
 * keyboard focus hands it to its toggle before it goes, and says so.
 */
function togglePanel(which) {
  const panel = $(which);
  const shown = panelShown(which);
  if (shown && panel.contains(document.activeElement)) {
    const toggle = $(which === 'ledger' ? 'v-ledger' : 'v-inspector');
    (toggle.checkVisibility?.() !== false ? toggle : $('view')).focus({ preventScroll: true });
  }
  const b = document.body.classList;
  if (which === 'ledger') b.toggle('no-ledger', shown);
  else if (NARROW.matches) b.toggle('show-inspector', !shown);
  else b.toggle('no-inspector', shown);
  syncPanelToggles();
  const name = which === 'ledger' ? 'Ledger' : 'Inspector';
  const key = which === 'ledger' ? '[' : ']';
  say(shown ? `${name} hidden. ${key} shows it again.` : `${name} shown. ${key} hides it.`);
}

function wireControls() {
  $('b-up').onclick = goUp;
  $('b-new').onclick = () => newFolder(S.primary?.d && S.sel.size === 1 ? S.primary : S.focus);
  $('b-undo').onclick = undo;
  $('b-refresh').onclick = () => refreshDirs([relPath(S.focus)]).then(() => notice('Folder re-read from disk', { ms: 1800 }));
  $('b-help').onclick = showGuide;
  $('q').addEventListener('input', onQuery);
  $('q').addEventListener('keydown', (e) => {
    // A feature's listener, installed first, may claim a key (the search
    // history's arrows).
    if (e.defaultPrevented) return;
    if (e.key === 'Escape') { clearQuery(); $('view').focus(); }
    if (e.key === 'Enter' || e.key === 'ArrowDown') { e.preventDefault(); $('ledger-list').focus(); }
  });
  document.querySelectorAll('#lens button').forEach((b) => { b.onclick = () => setLens(b.dataset.lens); });
  const grain = (d) => {
    S.grain = Math.max(0, Math.min(GRAINS.length - 1, S.grain + d));
    $('grain-val').textContent = GRAINS[S.grain].label;
    relayout();
  };
  $('grain-less').onclick = () => grain(-1);
  $('grain-more').onclick = () => grain(1);
  $('v-in').onclick = () => S.view.zoomAt(0.6);
  $('v-out').onclick = () => S.view.zoomAt(1.6);
  $('v-left').onclick = () => S.view.turn(-Math.PI / 8);
  $('v-right').onclick = () => S.view.turn(Math.PI / 8);
  $('v-over').onclick = overview;
  $('v-down').onclick = () => S.view.descend();
  $('v-go').onclick = () => (S.primary ? reveal(S.primary) : notice('Select something first, then fly to it.', { kind: 'info', ms: 2500 }));
  $('v-ledger').onclick = () => togglePanel('ledger');
  $('v-inspector').onclick = () => togglePanel('inspector');
  NARROW.addEventListener('change', syncPanelToggles);
  syncPanelToggles();
  $('q-clear').onclick = () => { clearQuery(); $('q').focus(); };
  // Tabs and the lens switch are flexible; their indicators follow resizes.
  const ro = new ResizeObserver(() => slideIndicators());
  ro.observe(document.querySelector('.tabs'));
  ro.observe($('lens'));
  // The legend shows whole chips at any width: fitted again when it resizes.
  new ResizeObserver(() => {
    cancelAnimationFrame(legendFit);
    legendFit = requestAnimationFrame(fitLegend);
  }).observe($('legend'));
  $('placing-cancel').onclick = stopPlacing;
  $('placing-here').onclick = () => S.placing && transfer(S.placing.type, S.placing.nodes, S.focus);
}

/** Escape: the first ESCAPE entry that is active is cleared. */
function onEscape(typing) {
  for (const x of ESCAPE) {
    if (typing && !x.typing) continue;
    let on = false;
    try {
      on = x.active();
      if (on) x.clear();
    } catch (err) {
      console.error(`ESCAPE "${x.id}" failed:`, err);
    }
    if (on) return;
  }
}

/**
 * Whether single-character shortcuts (T, B, 1, [, ? and the rest) act
 * wherever focus is. Off, they act only while the world or the ledger
 * list has focus, so a stray key on a button or a word said to speech
 * input starts nothing (WCAG 2.1.4); Ctrl and Alt chords act everywhere
 * either way. Kept in this browser; off unless turned on in the guide.
 */
const PREF_KEY = 'terrane.single-keys';
const prefs = {
  get singleKeys() {
    try {
      return localStorage.getItem(PREF_KEY) === 'everywhere';
    } catch {
      return false;
    }
  },
  set singleKeys(on) {
    try {
      localStorage.setItem(PREF_KEY, on ? 'everywhere' : 'focused');
    } catch { /* not kept: the choice lasts until the page closes */ }
    prefs.session = on;
  },
  session: null,
};
const singleKeysEverywhere = () => prefs.session ?? prefs.singleKeys;

function wireKeys() {
  window.addEventListener('keydown', (e) => {
    const t = e.target;
    const typing = t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable;
    if ($('dialog').open) return;
    if (e.key === 'Escape') {
      onEscape(typing);
      return;
    }
    if (typing || floatingOpen()) return;
    const c = { e, k: e.key, t, ctrl: e.ctrlKey || e.metaKey, alt: e.altKey, inList: !!t.closest?.('.vl'), onCanvas: t === $('view') };
    if (c.k.length === 1 && !c.ctrl && !c.alt && !c.inList && !c.onCanvas && !singleKeysEverywhere()) return;
    const entry = KEYS.match(c);
    if (entry && entry.run(c) !== false) e.preventDefault();
  });
}

/* ====================================================================== */
/* the controller's own registry entries                                  */
/* ====================================================================== */

{
  const core = (x) => KEYS.add({ owner: 'core', ...x });
  const GO = 'Travelling';
  const SEL = 'Selecting and going places';
  const CHG = 'Changing things';
  // In guide order. Rows without keys document the pointer and the keys
  // the canvas handles itself.
  core({ id: 'guide-wheel', guide: [GO, 'Wheel', 'Fly toward what is under the cursor'] });
  core({ id: 'guide-drag', guide: [GO, 'Drag', 'Slide the ground'] });
  core({ id: 'guide-right-drag', guide: [GO, 'Right-drag', 'Orbit the point you grabbed'] });
  core({ id: 'guide-alt-drag', guide: [GO, 'Alt+drag', 'Look around'] });
  core({ id: 'guide-travel', guide: [GO, 'W A S D', 'Move (Shift: faster)'] });
  core({ id: 'guide-turn', guide: [GO, 'Q  E', 'Turn'] });
  core({ id: 'guide-rise', guide: [GO, 'R  F', 'Rise / descend'] });
  core({ id: 'descend', keys: ['v'], gl: true, run: () => { S.view.descend(); }, guide: [GO, 'V', 'Drop to eye level'] });
  core({ id: 'overview', keys: ['0', 'Home'], gl: true, run: () => { overview(); }, guide: [GO, '0', 'Rise to the overview'] });
  core({ id: 'fly-to-selection', keys: ['g'], run: () => { if (S.primary) reveal(S.primary); }, guide: [GO, 'G', 'Fly to the selection'] });
  core({ id: 'closer', keys: ['+', '='], run: () => { S.view.zoomAt(0.7); } });
  core({ id: 'farther', keys: ['-', '_'], run: () => { S.view.zoomAt(1.45); } });
  core({ id: 'guide-double-click', guide: [GO, 'Double-click', 'Fly to folder / open file'] });
  core({ id: 'guide-click', guide: [SEL, 'Click', 'Select'] });
  core({ id: 'guide-ctrl-click', guide: [SEL, 'Ctrl+click', 'Add to selection'] });
  core({ id: 'sibling', keys: ['ArrowLeft', 'ArrowRight'], palette: false, when: (c) => c.onCanvas, run: (c) => { stepSelection(c.k); }, guide: [SEL, '← →', 'Previous / next sibling'] });
  core({ id: 'parent-child', keys: ['ArrowUp', 'ArrowDown'], palette: false, when: (c) => c.onCanvas, run: (c) => { stepSelection(c.k); }, guide: [SEL, '↑ ↓', 'Parent / first child'] });
  core({
    id: 'activate', keys: ['Enter'], inList: false, palette: false, when: (c) => !c.t.closest?.('button, summary, a'),
    run: () => {
      if (S.placing && S.primary?.d) transfer(S.placing.type, S.placing.nodes, S.primary);
      else activate(S.primary);
    },
    guide: [SEL, 'Enter', 'Go to folder / open file'],
  });
  core({ id: 'up', keys: ['Backspace'], run: () => { goUp(); }, guide: [SEL, 'Backspace', 'Up one level'] });
  core({ id: 'back', mod: 'alt', keys: ['ArrowLeft'], run: () => { goBack(); }, guide: [SEL, 'Alt+←', 'Back'] });
  core({ id: 'find', keys: ['/'], run: () => { $('q').focus(); }, guide: [SEL, '/', 'Find'] });
  core({ id: 'guide-escape', guide: [SEL, 'Esc', 'Cancel, clear'] });
  core({
    id: 'panels', keys: ['[', ']'], labels: { '[': 'Hide or show the ledger', ']': 'Hide or show the inspector' },
    run: (c) => { togglePanel(c.k === '[' ? 'ledger' : 'inspector'); }, guide: [SEL, '[  ]', 'Hide ledger / inspector'],
  });
  core({
    id: 'lens', keys: ['1', '2', '3', '4'], labels: { 1: 'Lens: kind', 2: 'Lens: age', 3: 'Lens: size', 4: 'Lens: duplicates' },
    run: (c) => { setLens(['kind', 'age', 'size', 'dup'][Number(c.k) - 1]); }, guide: [SEL, '1 – 4', 'Lens'],
  });
  core({ id: 'new-folder', keys: ['n'], run: () => { newFolder(S.primary?.d && S.sel.size === 1 ? S.primary : S.focus); }, guide: [CHG, 'N', 'New folder'] });
  // With several selected, F2 is the batch rename a feature offers (RENAME_MANY).
  core({
    id: 'rename', keys: ['F2'],
    run: () => {
      if (S.sel.size > 1 && RENAME_MANY.size) [...RENAME_MANY][0].run([...S.sel]);
      else rename();
    },
    guide: [CHG, 'F2', 'Rename'],
  });
  core({
    id: 'move', keys: ['m'],
    run: () => {
      if (refuseInside([...S.sel]) || refuseWarm()) return;
      if (!writable()) startPlacing('move');
      else notice('Read-only mode: nothing can be moved.', { kind: 'info' });
    },
    guide: [CHG, 'M', 'Move to…'],
  });
  core({ id: 'duplicate', mod: 'ctrl', keys: ['d'], run: () => { if (!refuseInside([...S.sel]) && !refuseWarm() && !writable()) duplicate(); }, guide: [CHG, 'Ctrl+D', 'Duplicate'] });
  core({ id: 'remove', keys: ['Delete'], run: () => { remove(); }, guide: [CHG, 'Del', 'Remove to holding area'] });
  core({ id: 'undo', mod: 'ctrl', keys: ['z'], run: () => { undo(); }, guide: [CHG, 'Ctrl+Z', 'Undo'] });
  core({
    id: 'copy-paths', mod: 'ctrl', keys: ['c'],
    // Selected text on the page is the browser's to copy.
    run: () => {
      if (window.getSelection().toString()) return false;
      copyPaths();
      return undefined;
    },
    guide: [CHG, 'Ctrl+C', 'Copy path'],
  });
  core({ id: 'guide-drag-row', guide: [CHG, 'Drag a row', 'Drop on a folder, breadcrumb or plateau'] });
  core({
    id: 'menu', keys: ['ContextMenu', 'F10'], palette: false, when: (c) => c.k === 'ContextMenu' || c.e.shiftKey,
    run: () => {
      const i = visibleIndexOf(S.primary);
      // Without WebGL screenOf returns nothing; the menu opens mid-window.
      const p = (i >= 0 && S.view.screenOf(i)) || { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      menuFor(S.primary, p.x, p.y);
    },
    guide: [CHG, 'Menu key', 'Context menu'],
  });
  core({ id: 'reread', keys: ['F5'], run: () => { refreshDirs([relPath(S.focus)]); }, guide: [CHG, 'F5', 'Re-read folder'] });
  core({ id: 'guide', keys: ['?'], run: () => { showGuide(); } });

  ESCAPE.add({ id: 'floating', order: 10, typing: true, active: floatingOpen, clear: closeFloating });
  ESCAPE.add({ id: 'placing', order: 20, typing: true, active: () => !!S.placing, clear: stopPlacing });
  ESCAPE.add({
    id: 'kind-filter', order: 30, active: () => S.kindFilter >= 0,
    clear: () => {
      S.kindFilter = -1;
      repaint();
      drawLegend();
    },
  });
  ESCAPE.add({ id: 'search', order: 50, active: () => !!S.search, clear: clearQuery });
  ESCAPE.add({ id: 'selection', order: 70, active: () => S.sel.size > 0 || !!S.primary, clear: () => select(null) });

  // The shared age table, rebuilt with every survey so no feature walks
  // the tree for it and pressing a key never waits on it.
  // In region mode every folder carries its own row from the service.
  AFTER_SURVEY.add({ id: 'ages', order: 10, run: () => { S.ages = S.regions ? S.regions.ages : buildAgeTable(S.model.root, Date.now()); } });

  PIN_SOURCES.add({ id: 'search', order: 20, pins: searchPins });
  PIN_SOURCES.add({ id: 'heavy', order: 30, pins: heavyPins });

  TIP_LINES.add({ id: 'levels', order: 10, lines: (node, c) => (c.type === BOX.CAP && !node.e && kids(node) ? `${node.h + 1} level${node.h ? 's' : ''} inside · opens as you approach · double-click to go` : null) });
  TIP_LINES.add({ id: 'matches', order: 20, lines: (node, c) => (c.type !== BOX.SCREE && node.d && S.search?.within.has(node) ? `${fmtCount(S.search.within.get(node))} matches inside` : null) });
  TIP_LINES.add({
    id: 'placing', order: 30,
    lines: (node, c) => {
      if (c.type === BOX.SCREE || !node.d || !S.placing) return null;
      const why = destinationProblem(S.placing.type, S.placing.nodes, node);
      return why ? `Cannot place here: ${why}` : 'Click to place here';
    },
  });
  TIP_LINES.add({ id: 'copies', order: 40, lines: (node) => (!node.d && node.dup ? (S.survey?.dupGroups[node.dup - 1]?.verified ? 'Has identical copies' : 'Shares its size with other files') : null) });
  TIP_LINES.add({
    id: 'pixels', order: 50,
    lines: (node) => {
      if (node.d || hostOf(node)) return null;
      const pic = thumbs.info(relPath(node));
      return pic?.w ? `${fmtCount(pic.w)} × ${fmtCount(pic.h)} px` : null;
    },
  });

  INSPECTOR.focus.add({ id: 'title', order: 0, build: (f) => el('div', { class: 'insp-title' }, el('div', { class: 'insp-kind', text: 'You are in' }), el('h3', { class: 'insp-name', text: f.n })) });
  INSPECTOR.focus.add({
    id: 'facts', order: 10,
    build: (f) => el('dl', { class: 'facts' }, fact('Size', el('b', { text: fmtBytes(f.s) })), fact('Contains', parts(`${fmtCount(f.fc)} files`, `${fmtCount(f.dc)} folders`)), fact('Depth below', `${f.h} level${f.h === 1 ? '' : 's'}`)),
  });
  INSPECTOR.focus.add({ id: 'composition', order: 20, build: (f) => composition(f) });
  INSPECTOR.focus.add({ id: 'reading', order: 90, build: () => [sectionTitle('Reading the world'), el('ul', { class: 'reading' }, [...READING].map(readingRow))] });

  INSPECTOR.node.add({ id: 'title', order: 0, build: nodeTitle });
  INSPECTOR.node.add({ id: 'path', order: 5, build: (node) => el('div', { class: 'insp-path' }, el('code', {}, pathBreaks(absPath(node))), el('button', { class: 'btn btn-small', type: 'button', title: 'Copy path (Ctrl+C)', onclick: () => copyPaths([node]) }, icon('copyPath'), 'Copy')) });
  INSPECTOR.node.add({ id: 'facts', order: 10, build: nodeFacts });
  INSPECTOR.node.add({ id: 'composition', order: 20, build: (node) => (node.d ? composition(node) : null) });
  INSPECTOR.node.add({ id: 'copies', order: 30, build: nodeCopies });
  INSPECTOR.node.add({ id: 'actions', order: 50, build: nodeActions });
  INSPECTOR.node.add({ id: 'preview', order: 60, build: nodePreview });

  READING.add({ id: 'footprint', order: 10, glyph: 'g-foot', title: 'Footprint is storage', text: 'Ground area is share of the parent folder.' });
  READING.add({ id: 'elevation', order: 20, glyph: 'g-elev', title: 'Elevation is nesting', text: 'Each level stands one step up, one tone lighter, and one scale smaller.' });
  READING.add({ id: 'height', order: 30, glyph: 'g-height', title: 'Height is recency', text: 'Fresh files stand tall; untouched ones wear down flat.' });
  READING.add({ id: 'mass', order: 40, glyph: 'g-mass', title: 'Closed mass', text: 'A folder seen from afar. Its sides show its strata: what it holds by kind, the largest at the foot. Taller means more levels inside. Approach and it opens.' });
  READING.add({ id: 'scree', order: 50, glyph: 'g-scree', title: 'Scree', text: 'Items too small to see from here, gathered into one tile. Go closer.' });
  READING.add({ id: 'sealed', order: 60, glyph: 'g-seal', title: 'Hatched', text: 'Sealed: the folder could not be read.' });
  READING.add({ id: 'empty', order: 70, glyph: 'g-empty', title: 'Hollow', text: 'An empty folder.' });
  READING.add({ id: 'pin', order: 80, glyph: 'g-pin', title: 'Pin', text: 'Vermilion marks a search match; ink marks a heavyweight file.' });

  TABS.add({ id: 'contents', order: 10, label: 'Contents', list: true, draw: drawContents });
  TABS.add({
    id: 'findings', order: 20, label: 'Findings', list: true, draw: drawFindings, count: () => (S.search ? S.search.total ?? S.search.list.length : null), enter: (node) => reveal(node),
    key: () => { const o = findSort(); return `${o.key}:${o.dir}`; },
  });
  // The Survey's lists do not follow the selection: a select leaves the tab as it is.
  TABS.add({ id: 'survey', order: 30, label: 'Survey', draw: drawSurvey, selection: false });
  TABS.add({ id: 'journal', order: 40, label: 'Journal', draw: drawJournal });

  SURVEY.add({ id: 'largest', order: 10, build: (sv) => section('Largest files', fmtCount(sv.largest.length), true, sv.largest.slice(0, 80).map((f) => itemButton(f, fmtBytes(f.s)))) });
  SURVEY.add({ id: 'duplicates', order: 20, build: surveyDuplicates });
  // In region mode a list holds the first 1,000 the service sent, and its count is the whole tree's.
  const countOf = (sv, key) => sv.counts?.[key] ?? sv[key].length;
  const cutNote = (sv, key) => {
    const n = countOf(sv, key);
    const shown = Math.min(300, sv[key].length);
    return sv.regions && n > shown ? el('p', { class: 'note', text: `The first ${fmtCount(shown)} of ${fmtCount(n)}.` }) : null;
  };
  SURVEY.add({ id: 'empty', order: 30, build: (sv) => section('Empty folders', fmtCount(countOf(sv, 'empty')), false, () => (sv.empty.length ? [cutNote(sv, 'empty'), sv.empty.slice(0, 300).map((d) => itemButton(d, ''))] : el('p', { class: 'note', text: 'None.' }))) });
  SURVEY.add({
    id: 'sealed', order: 40,
    build: (sv) => section('Sealed folders', fmtCount(countOf(sv, 'sealed')), sv.sealed.length > 0, sv.sealed.length
      ? [el('p', { class: 'note', text: 'These could not be read, so their contents are not counted.' }), cutNote(sv, 'sealed'), sv.sealed.slice(0, 300).map((d) => itemButton(d, d.e))]
      : el('p', { class: 'note', text: 'Every folder was readable.' })),
  });
  SURVEY.add({
    id: 'links', order: 50,
    build: (sv) => section('Symbolic links', fmtCount(countOf(sv, 'links')), false, () => (sv.links.length
      ? [el('p', { class: 'note', text: 'Shown but never followed.' }), cutNote(sv, 'links'), sv.links.slice(0, 300).map((f) => itemButton(f, 'link'))]
      : el('p', { class: 'note', text: 'None.' }))),
  });
}

/* ====================================================================== */
/* feature modules                                                        */
/* ====================================================================== */

/**
 * What install(api) receives: the session state, every registry, and the
 * controller functions a feature needs to read the tree, travel, redraw
 * and speak. Frozen, so a feature extends Terrane only through entries.
 */
const API = Object.freeze({
  S, KEY_OWNERS,
  KEYS, ESCAPE, PIN_SOURCES, TIP_LINES, INSPECTOR, READING, TABS, LAYOUT_OPTS, AFTER_LAYOUT, AFTER_REFRESH, AFTER_SURVEY, AFTER_OP, MENU, QUERY,
  AFTER_QUERY, SURVEY, COMMANDS, LEDGER_SUB, AFTER_FOCUS, AFTER_SELECT, TAB_SECTIONS, RENAME_MANY, DUP_GROUP,
  get, post, runOp, refreshDirs, writable, isAttached, hostOf, relPath, absPath, relLabel,
  // The service's own mode, without the wait of a warm start: what refuses
  // something that is not a change Terrane makes, such as a terminal.
  readOnlyMode,
  // A file's colour under the Kind lens: its kind's, in its extension's tone.
  kindTone: extTone,
  // The address of a file's bytes for a preview: at most max of them
  // without a Range header (0: the service's default, 256 KB).
  rawUrl,
  // The ledger row the keyboard cursor is on, or null.
  listCursor: () => (list?.items.length ? list.items[list.cursor] ?? null : null),
  // The ledger list's rows, in the order shown.
  listItems: () => list?.items ?? [],
  // Moves the list's cursor to node and scrolls to it; false when it is not listed.
  cursorTo: (node) => {
    const i = list ? list.items.indexOf(node) : -1;
    if (i >= 0) list.setCursor(i, true);
    return i >= 0;
  },
  relayout, queueLayout, repaint, drawPins, visibleIndexOf,
  // Region mode (regions.js): whether the page holds only regions; and,
  // in either mode, a folder's children held (ensure), a path or a ref
  // made a node (resolve, resolveAll, resolveRef), each a promise, and
  // the deepest node held on a path (nearest). In whole-tree mode they
  // answer at once from the whole model.
  regionMode: () => !!S.regions,
  ensure: (dir) => (S.regions ? S.regions.ensure(dir) : Promise.resolve(dir ?? null)),
  resolve: (rel) => (S.regions ? S.regions.resolve(rel) : Promise.resolve(rel === null || rel === undefined ? null : S.model.find(rel))),
  resolveAll: (rels) => (S.regions ? S.regions.resolveAll(rels) : Promise.resolve(rels.map((r) => (r === null || r === undefined ? null : S.model.find(r))))),
  resolveRef: (ref) => (!ref?.ref ? Promise.resolve(ref ?? null) : S.regions ? S.regions.resolve(ref.rel) : Promise.resolve(S.model.find(ref.rel))),
  nearest: (rel) => (S.regions ? S.regions.nearest(rel) : nearestNode(rel)),
  // How many entries a folder holds (the service's count in region mode),
  // and the sentence a whole-tree question the service does not answer
  // gives in region mode (the twins of an open archive).
  kids, notAtSize,
  // Region mode: a whole-tree question asked of the service (find, marks,
  // survey, sessions, places), resolving to its JSON; and a ref made a
  // node in the list that showed it.
  ask: askTree, resolveRow,
  select, selectAll, setFocus, reveal, activate, describe, say, forceOpen, overview, setLens, copyText,
  rescan: fullScan,
  drawAll, drawTabs, drawLedger, drawInspector, drawLegend, drawStatus, runQuery, setQuery, tabSections,
  el, notice, section, itemButton, actionButton, fact, shareBar, pct,
  // A value from parts that break only at their " · " separators, and a
  // section's head with its figure at the right.
  parts, sectionTitle,
});

/** Installs feature modules; one that fails to start is reported and the rest still start. */
function installFeatures(features) {
  for (const f of features) {
    const name = f?.name || 'A feature';
    const failed = (err) => {
      console.error(`${name} could not start:`, err);
      notice(`${name} could not start: ${err?.message || err}`, { kind: 'error' });
    };
    try {
      const r = f.install(API);
      if (typeof r?.then === 'function') r.then(null, failed);
    } catch (err) {
      failed(err);
    }
  }
}

/** The loading sheet (splash.js) while the page starts; null once sent away. */
let splash = null;
/** Sends the loading sheet away. Safe to call any number of times. */
function endSplash() {
  if (!splash) return;
  splash.done();
  splash = null;
}

async function start() {
  // Not served by the service, and no demo world: elsewhere.js has said
  // so and sent the loading sheet away. Should it not have run, the veil
  // says it here.
  if (ELSEWHERE && !DEMO) {
    if (!document.documentElement.hasAttribute('data-elsewhere')) {
      $('splash').hidden = true;
      fatal('Terrane runs from its local service', 'Open the address npm start prints. Terrane, and how to start it: https://github.com/dnoice/terrane');
    }
    return;
  }
  try {
    splash = startSplash({
      cover: [document.querySelector('.skip'), $('bar'), document.querySelector('main'), $('block')],
    });
    splash.stage(DEMO ? 'Building the demo world' : 'Connecting to the local service');
  } catch {
    splash = null;        // no #splash host in the page: start without the sheet
  }
  try {
    S.info = await get('info');
  } catch (err) {
    endSplash();
    fatal('Not connected', err.message);
    return;
  }
  document.title = `${S.info.name} · Terrane`;
  S.model = new Model(S.info.name);
  S.focus = S.model.root;
  splash?.stage('Starting the 3D world');
  try {
    S.view = new Viewport({ canvas: $('view'), labelLayer: $('tags') });
  } catch (err) {
    // No WebGL: every call becomes a no-op and the ledger carries the work.
    const noop = new Proxy(function () {}, { get: (_t, p) => (p === 'on' ? {} : p === 'eye' || p === 'alt' || p === 'w' || p === 'h' ? undefined : noop), apply: () => undefined, set: () => true });
    S.view = noop;
    S.noGL = true;
    document.body.classList.add('no-gl');
    // The canvas keeps its keys (the arrows, Enter, Backspace and the
    // letters) but no longer promises travel it cannot do.
    $('view').setAttribute('aria-label', 'The 3D world is unavailable in this browser. Arrow keys still move between items, Enter goes to a folder or opens a file, Backspace goes up. The ledger lists the same items.');
    fatal('3D view unavailable', 'This browser could not start WebGL. The ledger, inspector, search and every operation still work.', 'quiet', err.message);
    $('veil').style.pointerEvents = 'none';
  }
  if (!S.noGL) {
    hud = createHud({ onNorth: (yaw) => S.view.turn(-yaw) });
    hud.heading(S.view.cam.yaw);
    hud.printWith(() => S.view);
  }
  preloadFloat();
  list = new VirtualList($('ledger-list'), {
    label: 'Contents', multiple: true,
    render: (n) => rowFor(n),
    onKey: (e, node) => {
      if (!node) return;
      if (e.key.startsWith('Arrow') || e.key.startsWith('Page') || e.key === 'Home' || e.key === 'End') {
        // With Ctrl the cursor moves and the selection stays, so Space can
        // add the row it reaches: several rows selected by keyboard alone.
        if (!(e.ctrlKey || e.metaKey)) select(node, { quiet: true });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        // A ref's row is made a node first (select and reveal do it too).
        if (S.placing && node.d) withNode(node, (n) => transfer(S.placing.type, S.placing.nodes, n));
        else (TABS.get(S.tab)?.enter || activate)(node);
      } else if (e.key === ' ') {
        e.preventDefault();
        select(node, { add: true });
      } else return;
      list.draw();
    },
  });
  installFeatures(FEATURES);
  drawTabs();
  wireViewport();
  wireControls();
  wireKeys();
  // Region mode: the service says the tree is above the threshold (or
  // draws every tree in regions), so the page never holds it whole.
  const R = S.info.regions;
  const large = !!R && (R.threshold === 0 || (R.entries !== null && R.entries > R.threshold));
  if (large) {
    thumbs.load(TOKEN);
    await startRegions({ build: false, t0: performance.now() });
    return;
  }
  // The tree the service kept from the last complete survey, when there is
  // one: drawn first, then checked against the disk (checkUp).
  const warm = S.info.warm && !S.info.snapshot ? S.info.warm : null;
  if (!S.noGL) fatal(S.info.snapshot ? 'Reading the snapshot' : warm ? 'Drawing the last session\'s tree' : 'Surveying', S.info.root, 'busy');
  splash?.stage(S.info.snapshot ? `Reading the snapshot of ${S.info.name}` : warm ? `Drawing ${S.info.name} as it was on ${fmtDate(warm.takenAt)}` : `Surveying ${S.info.name}`);
  S.scanning = true;
  if (warm) S.warm = warmState(warm.takenAt);
  thumbs.load(TOKEN);
  drawAll();
  const t0 = performance.now();
  if (warm) {
    if (await warmStart(warm)) {
      expose(t0);
      S.warm.notice = notice(`Showing ${S.info.name} as it was when the last session surveyed it, ${fmtDate(warm.takenAt)}. Surveying it as it is now; changes wait until then.`, { kind: 'info', ms: 12000 });
      if (S.model.root.e) notice(`The root could not be read: ${S.model.root.e}`, { kind: 'error' });
      // The change stream connects now, so a change on disk while the
      // catch-up runs is noted (refreshDirs keeps it for afterwards) and
      // not lost between the survey's pass over its folder and the end.
      connectEvents();
      checkUp();
      return;
    }
    // Read part way, or not at all: the page surveys from nothing.
    const W = S.warm;
    S.warm = null;
    W.release();
    S.model = new Model(S.info.name);
    S.focus = S.model.root;
    if (!S.noGL) fatal('Surveying', S.info.root, 'busy');
    splash?.stage(`Surveying ${S.info.name}`);
    notice('The tree from the last session could not be read, so Terrane surveyed the directory afresh.', { kind: 'info', ms: 12000 });
    drawAll();
  }
  try {
    await scanInto(S.model.root, { switchAt: switchAt() });
  } catch (err) {
    // Larger than the page keeps whole: the tree is read in regions.
    if (err.switchToRegions) {
      await startRegions({ build: true, t0 });
      return;
    }
    endSplash();
    fatal('The survey stopped', err.message);
    return;
  }
  S.scanning = false;
  if (!S.noGL) hideVeil();
  clearTimeout(S.layoutTimer);
  S.layoutTimer = 0;
  S.survey = S.model.survey();
  runHooks(AFTER_SURVEY, S.survey, { full: true });
  relayout();
  drawAll();
  expose(t0);
  if (S.model.root.e) notice(`The root could not be read: ${S.model.root.e}`, { kind: 'error' });
  connectEvents();
  DEMO?.welcome(API);
}

/**
 * window.__terrane, for checks and the console: the session state, the
 * list, the api; scanMs, from the start of the first survey (or of the
 * last session's tree) until it was in; firstDrawMs, when the first box
 * was laid out; warm, whether the tree from the last session was used
 * and when its catch-up ended; places, the landmarks store.
 */
function expose(t0) {
  window.__terrane = {
    S, list, scanMs: Math.round(performance.now() - t0), api: API, install: installFeatures, warm: warmRecord, demo: DEMO,
    get firstDrawMs() { return firstDrawMs; },
    get places() { return S.places; },
    get regions() { return S.regions; },
    // Region mode: lets regions go now if the entries held pass the budget,
    // once the view is settled (a check that lowered the budget calls it).
    evictSoon: () => scheduleEvict(),
    // Region mode: how many of each whole-tree question were asked, and
    // the last 200 answers' [route, ms in the page, ms in the service].
    asked,
    // Whether region answers are decoded in the worker: true, false (on the
    // main thread), or null before the first one.
    get regionWorker() { return regionWorker === null ? null : !!regionWorker; },
  };
}

start();
