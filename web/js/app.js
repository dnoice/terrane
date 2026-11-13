/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Terrane Application (Terrane Edition - v1.7)
 *     - File Name: app.js
 *     - Relative Path: web/js/app.js
 *     - Artifact Type: javascript
 *     - Version: 1.7.0
 *     - Date: 11/13/2026
 *     - Update: Friday, November 13, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Changelog:
 *     - 1.7.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] —
 *       Hardening: a folder gone from disk no longer stalls every
 *       refresh; Rescan all lets go of the old tree and runs the search
 *       again; the forced unfold ends at the overview or off its
 *       branch; focus survives a redraw or a hidden panel; a narrow
 *       inspector drawer and a single-key setting; a page the service
 *       did not serve asks it nothing. Counts say "1 item" and "1
 *       match"; an empty folder, a search with no match and a legend
 *       with nothing to colour each say so, with no sort keys over an
 *       empty list; Copy, Create and Rename carry icons as their
 *       neighbours do.
 *     - 1.6.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] —
 *       Findings sorts by Size or Changed; a search opens in the order it
 *       asks for and keeps the one chosen until the query changes, and
 *       Select all follows the order shown. The Survey tab's sections are
 *       a registry (SURVEY), AFTER_QUERY hooks hear every run of the
 *       search and may give Findings its order and a note, and setQuery
 *       puts a query in Find and runs it at once. Under the Age lens a
 *       closed mass shows its typical age, the median step of its bytes
 *       in the age table (strata.js), instead of its newest change; the
 *       legend says so. Inside an open archive, which the table does not
 *       hold, a closed mass keeps its newest change, and while one is
 *       open the legend's title says that too. An archive opened with I
 *       (interior.js) hangs from its file: isAttached, updateWhere,
 *       stepSelection, goUp, refreshDirs, the crumbs and absPath
 *       (x.zip!/inner/file) follow the graft, and a flight into it lands
 *       where it was going. runOp refuses any change under it before
 *       anything is sent; the keys, menu and inspector say why. Paint
 *       walls it in the file's colour, hatches locked entries and
 *       half-bands twins, tied as the relation set 'twins'. The api gains
 *       hostOf and listCursor.
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
 *     - Real operations through the service: open, reveal, copy path, new
 *       folder, rename, move, copy, duplicate, remove to holding, restore,
 *       undo; every result or refusal is reported in words
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
 *       TIP_LINES, INSPECTOR, READING, TABS, SURVEY, LAYOUT_OPTS, MENU)
 *       and hook lists (AFTER_LAYOUT, AFTER_REFRESH, AFTER_SURVEY,
 *       AFTER_OP, AFTER_QUERY), so a feature adds entries from its own
 *       file instead of editing these functions
 *     - One key table drives the keyboard, the guide and the fixed key
 *       allocation; a reserved key can only be bound by its owner
 *     - One age table per survey (timeline.js) answers how much of any
 *       folder changed since a date, for every feature that asks
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
 *     Every entry has a unique id; order (default 50) places it.
 *
 * ✒ Other Important Information:
 *     - Dependencies: model.js, layout.js, viewport.js, theme.js, ui.js,
 *       thumbs.js, timeline.js, strata.js (the Age lens's mass colours),
 *       features.js, icons.js, motion.js, hud.js, float.js, splash.js
 *     - Compatible platforms: current evergreen browsers with WebGL2
 *     - Limitations: when WebGL is unavailable the ledger, inspector,
 *       search and every operation keep working without the 3D world
 * ----------------------------------------------------------------------------
 */

import {
  Model, KINDS, FLAG_LINK, FLAG_HIDDEN, extOf, fmtBytes, fmtCount, fmtDate, fmtAge, freshness, relPath, depthOf,
  isAncestor, parseQuery, runSearch,
} from './model.js';
import { buildLayout, BOX, STYLE, AUX } from './layout.js';
import { Viewport } from './viewport.js';
import { THEME, mixHex, ramp, cssHex } from './theme.js';
import { el, openMenu, closeFloating, floatingOpen, ask, notice, tip, hideTip, slideIndicator, VirtualList } from './ui.js';
import { thumbs } from './thumbs.js';
import { buildAgeTable } from './timeline.js';
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
 * fills in. elsewhere.js says why; nothing here may ask the service.
 */
const ELSEWHERE = TOKEN === ['__TERRANE', 'TOKEN__'].join('_');
const GRAINS = [{ label: 'Coarse', v: 0.0105 }, { label: 'Medium', v: 0.0062 }, { label: 'Fine', v: 0.0038 }, { label: 'Finest', v: 0.0024 }];

const S = {
  info: null, model: null, view: null, layout: null, focus: null, trail: [],
  sel: new Set(), primary: null,
  lens: 'kind', grain: 1, kindFilter: -1, force: null, lastEye: null,
  query: '', search: null,
  survey: null, scanning: false, watch: 'idle',
  placing: null, drag: null,
  tab: 'contents', sort: { key: 'size', dir: -1 },
  // The Findings order a person chose; null keeps the search's own default.
  findSort: null,
  layoutTimer: 0, surveyTimer: 0,
  // Owned by feature modules, null until one fills it: the date scrub,
  // the open archive interior, benchmarks and the return point, and
  // working sessions. ages is the shared age table (timeline.js), rebuilt
  // after every survey and null until the first one.
  time: null, interior: null, places: null, ages: null, sessions: null,
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
 * canvas keeps its travel keys; Session and Strata have no keys.
 */
const KEY_OWNERS = Object.freeze({
  w: 'viewport', a: 'viewport', s: 'viewport', d: 'viewport', q: 'viewport', e: 'viewport', r: 'viewport', f: 'viewport',
  i: 'interiors',
  t: 'time', ',': 'time', '.': 'time', '<': 'time', '>': 'time',
  b: 'landmarks', h: 'landmarks', j: 'landmarks',
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
 * canvas's own keys.
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
 * Reading the world 90.
 */
const INSPECTOR = Object.freeze({
  focus: registry('INSPECTOR.focus', needs('INSPECTOR.focus', 'build')),
  node: registry('INSPECTOR.node', needs('INSPECTOR.node', 'build')),
});

/** READING: the "Reading the world" rows: { id, order, glyph, title, text }. */
const READING = registry('READING', (x) => {
  for (const f of ['glyph', 'title', 'text']) if (typeof x[f] !== 'string') throw new TypeError(`READING: "${x.id}" needs ${f}.`);
});

/**
 * TABS: the ledger tabs: { id, order, label, draw(sub, host, keepScroll),
 * list, count(), enter(node), key() }. list tabs draw into the virtual
 * list, the rest into the rich panel; count() puts a figure on the tab;
 * enter(node) is Enter on a list row (default: go there or open it);
 * key() adds to what decides whether the ledger keeps its scroll.
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
 * is what was asked ({ type: 'rename', path, name }, { type: 'move',
 * paths, dest }, ...; { type: 'undo' } for Undo) and res its answer
 * (renamed, results, label; for an Undo, moved: the [from, to] paths it
 * carried back). A change that stopped part way runs it too, with res
 * { partial: true, results, label }: what it finished. It runs before the
 * affected folders are re-read, so a feature that names places by path
 * can follow Terrane's own renames and moves (and their undo) before the
 * tree changes.
 */
const AFTER_OP = registry('AFTER_OP', needs('AFTER_OP', 'run'));

/**
 * MENU: context menu items from features: { id, order, items(node, ctx)
 * -> item[] | null }, where node is the item the menu is for (null for
 * the folder you are in) and ctx is { ro }. Items take openMenu's shape
 * and appear as a group after the first one (Open, Reveal, Copy path) or,
 * for the folder you are in, at the end. A selection of many has none.
 */
const MENU = registry('MENU', needs('MENU', 'items'));

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

for (const reg of [KEYS, ESCAPE, PIN_SOURCES, TIP_LINES, INSPECTOR.focus, INSPECTOR.node, READING, TABS, LAYOUT_OPTS, AFTER_LAYOUT, AFTER_REFRESH, AFTER_SURVEY, AFTER_OP, MENU, AFTER_QUERY, SURVEY]) Object.freeze(reg);

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
  // A change that stopped part way names what it finished.
  if (Array.isArray(body.results)) err.results = body.results;
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

async function scanStream(rel, depth, onBatch) {
  const params = new URLSearchParams({ path: rel });
  if (depth) params.set('depth', depth);
  const res = await fetch(`/api/scan?${params}`, { headers: { 'X-Terrane-Token': TOKEN } });
  if (!res.ok) throw await asError(res);
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
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
}

const rawUrl = (node, max) => `/api/raw?${new URLSearchParams({ path: relPath(node), max, t: TOKEN })}`;
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

/* ====================================================================== */
/* scanning and refresh                                                   */
/* ====================================================================== */

async function scanInto(dir) {
  const idMap = [];
  await scanStream(relPath(dir), 0, (records) => {
    S.model.ingest(records, idMap, dir);
    if (!S.noGL) hideVeil();
    queueLayout();
    drawStatus();
    endSplash();
  });
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
/** Re-reads the given folders (root-relative paths) and merges the result. */
function refreshDirs(rels) {
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
    for (const n of [...S.sel]) if (!isAttached(n)) S.sel.delete(n);
    if (S.primary && !isAttached(S.primary)) S.primary = [...S.sel].at(-1) || null;
    if (!isAttached(S.focus)) S.focus = S.model.root;
    S.trail = S.trail.filter(isAttached);
    runHooks(AFTER_REFRESH, dirs);
    if (S.search) runQuery();
    queueLayout(40);
    queueSurvey();
    drawAll();
  }).catch((err) => notice(`Refresh failed: ${err.message}`, { kind: 'error' }));
  return refreshChain;
}

function queueSurvey() {
  clearTimeout(S.surveyTimer);
  S.surveyTimer = setTimeout(() => {
    const verified = new Map((S.model.dupGroups || []).filter((g) => g.verified).map((g) => [g.files.map(relPath).sort().join('|'), g]));
    S.survey = S.model.survey();
    for (const g of S.survey.dupGroups) {
      const v = verified.get(g.files.map(relPath).sort().join('|'));
      if (v) { g.verified = true; g.mode = v.mode; }
    }
    runHooks(AFTER_SURVEY, S.survey, { full: false });
    repaint();
    if (S.tab === 'survey') drawLedger();
    drawLegend();
  }, 500);
}

function connectEvents() {
  const es = new EventSource(`/api/events?${new URLSearchParams({ t: TOKEN, dirs: S.model.root.dc })}`);
  es.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.type === 'job') return onJob(msg);
    if (msg.type === 'watch') S.watch = msg.state;
    else if (msg.type === 'change' && !S.scanning) refreshDirs(msg.dirs);
    else if (msg.type === 'bulk') {
      notice(`${fmtCount(msg.count)} folders changed on disk.`, { kind: 'info', action: { label: 'Rescan all', run: fullScan } });
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
  S.scanning = true;
  stopPlacing();
  const name = S.info.name;
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
  thumbs.reload(TOKEN);
  try {
    await scanInto(S.model.root);
  } catch (err) {
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
  S.layout = buildLayout(S.model.root, opts);
  S.view.setLayout(S.layout, paint(), { animate });
  syncViewSelection();
  drawPins();
  updateWhere();
  drawStatus();
  runHooks(AFTER_LAYOUT, S.layout);
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
  drawCrumbs();
  if (S.tab === 'contents') drawLedger();
  if (!S.primary) drawInspector();
  drawLegend();
  $('b-up').toggleAttribute('disabled', !S.focus.p);
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
  const kids = S.layout.node[i].c;
  for (let k = info.from; k < kids.length; k++) if (S.search.set.has(kids[k]) || S.search.within.has(kids[k])) return true;
  return false;
}

function paint() {
  const L = S.layout;
  const n = L.n;
  const color = new Uint32Array(n);
  const style = new Float32Array(n);
  const dim = new Float32Array(n);
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
      else if (node.c.length === 0) { c = THEME.paper; s = STYLE.HOLLOW; }
      else if (S.lens === 'kind') c = mixHex(THEME.clay, KINDS[dominantKind(node)].color, 0.42);
      else if (S.lens === 'age') {
        const k = ages && !inRoom ? ages.medianStep(node) : -1;
        c = k >= 0 ? tones[k] : mixHex(THEME.clay, ramp(THEME.ageRamp, freshness(node.mm, now)), 0.7);
      } else if (S.lens === 'size') c = mixHex(THEME.clay, ramp(THEME.sizeRamp, Math.log2(node.s + 2) / maxLog), 0.7);
      else c = THEME.clay;
    } else {
      if (S.lens === 'kind') c = KINDS[node.k].color;
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
    if (S.sel.has(node) && type !== BOX.SCREE) {
      c = THEME.mark;
      d = 0;
    }
    color[i] = c;
    style[i] = s;
    dim[i] = d;
  }
  return { color, style, dim };
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
    if (group) ties = group.files.filter((f) => f !== p).slice(0, 40).map(visibleIndexOf).filter((j) => j >= 0 && j !== i);
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

function select(node, { add = false, quiet = false } = {}) {
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
  repaint();
  drawInspector();
  if (!quiet) drawLedger(true);
  if (S.primary) say(S.sel.size > 1 ? `${S.sel.size} items selected` : describe(S.primary));
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
function setFocus(dir, { remember = true } = {}) {
  if (!dir || !dir.d) return;
  if (remember && S.focus !== dir) S.trail.push(S.focus);
  hold = null;
  if (!dir.p) {
    // The root: going there is rising to the overview.
    S.force = null;
    relayout();
    S.view.overview();
    if (S.noGL || !S.view.look()) moveFocus(dir);
    say(`Travelling to ${dir.n}, ${fmtCount(dir.c.length)} items`);
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
  say(`Travelling to ${dir.n}, ${fmtCount(dir.c.length)} items`);
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

/** Makes a node visible (changing focus if it must) and flies to it. */
function reveal(node) {
  if (!S.layout.index.has(node)) {
    forceOpen(node);
    relayout();
  }
  select(node);
  const i = visibleIndexOf(node);
  if (i > 0) S.view.frame(i);
}

function activate(node) {
  if (!node) return;
  if (node.d) setFocus(node);
  else runOp({ type: 'open', path: relPath(node) });
}

function stepSelection(key) {
  const cur = S.primary;
  if (!cur) return select(S.focus.c[0] || S.focus);
  // An open archive's root steps up to its file, and the file down to it;
  // the root has no siblings, since its file holds nothing else.
  const I = S.interior;
  let next = null;
  if (key === 'ArrowUp') next = I && cur === I.root ? I.host : cur !== S.focus ? cur.p : null;
  else if (key === 'ArrowDown') next = cur.d ? cur.c[0] : I && cur === I.host ? I.root : null;
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

const writable = () => (S.info.snapshot ? 'snapshot mode' : S.info.readOnly ? 'read-only mode' : null);

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
  try {
    const res = await post('undo');
    runHooks(AFTER_OP, { type: 'undo' }, res);
    notice(res.label);
    await refreshDirs(res.affected);
    if (S.tab === 'journal') drawLedger();
  } catch (err) {
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
  if (refuseInside([dir])) return;
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
  if (!node || !node.p || refuseInside([node])) return;
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
  if (!nodes.length || refuseInside(nodes)) return;
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
  if (refuseInside(nodes)) return;
  const byParent = new Map();
  for (const n of nodes) byParent.set(n.p, [...(byParent.get(n.p) || []), n]);
  for (const [parent, list] of byParent) await runOp({ type: 'copy', paths: list.map(relPath), dest: relPath(parent) });
}

async function remove(nodes = [...S.sel]) {
  nodes = tops(movable(nodes));
  if (!nodes.length || refuseInside(nodes)) return;
  const size = nodes.reduce((a, n) => a + n.s, 0);
  const what = nodes.length === 1 ? `"${nodes[0].n}"` : `${nodes.length} items`;
  const ok = await ask({
    title: `Remove ${what}?`, confirm: 'Remove to holding area', danger: true,
    body: `${fmtBytes(size)} will be moved into Terrane's holding area inside this directory. Nothing is deleted: Undo, or the Journal tab, puts it back exactly where it was.`,
  });
  if (ok) await runOp({ type: 'trash', paths: nodes.map(relPath) });
}

async function copyPaths(nodes = [...S.sel]) {
  if (!nodes.length) nodes = [S.focus];
  const text = nodes.map(absPath).join('\n');
  try {
    await navigator.clipboard.writeText(text);
    notice(nodes.length === 1 ? 'Path copied to the clipboard' : `${nodes.length} paths copied to the clipboard`);
  } catch {
    notice('The browser did not allow clipboard access. The path is shown in the inspector.', { kind: 'error' });
  }
}

async function verifyDuplicates() {
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
      if (list.length > 1) out.push({ size: g.size, files: list, waste: g.size * (list.length - 1), verified: true, mode: hashOf.get(list[0]).mode });
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
    try {
      const got = m.items(node, ctx);
      if (got?.length) out.push(...got.filter(Boolean));
    } catch (err) {
      console.error(`MENU "${m.id}" failed:`, err);
    }
  }
  return out.length ? ['sep', ...out] : [];
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
  for (const id of ['b-new', 'b-undo']) {
    $(id).toggleAttribute('disabled', !!S.info.readOnly);
    if (S.info.readOnly) $(id).title = `Unavailable: Terrane is in ${S.info.snapshot ? 'snapshot' : 'read-only'} mode`;
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
  const cls = (node.d ? (node.e ? 'swatch is-sealed' : node.c.length ? 'swatch is-dir' : 'swatch is-empty') : 'swatch') + (crossed ? ' is-crossed' : '') + (mark ? ` ${mark.cls}` : '');
  const share = total ? Math.max(0, Math.min(1, node.s / total)) : 0;
  const row = el('div', { class: `row${S.sel.has(node) ? ' is-selected' : ''}`, draggable: node.p && !S.info.readOnly && !hostOf(node) ? 'true' : null, 'aria-selected': S.sel.has(node) ? 'true' : 'false', title: showPath ? relPath(node) : node.n },
    el('span', { class: cls, style: node.d ? null : { background: cssHex(KINDS[node.k].color) } }),
    el('span', { class: 'row-name' }, node.n, node.d ? el('small', { text: node.e ? node.e : fmtCount(node.fc) }) : showPath ? el('small', { text: relPath(node.p) || '/' }) : null,
      crossed ? el('span', { class: 'sr', text: `, changed since ${S.time.date}` }) : null, mark ? el('span', { class: 'sr', text: mark.sr }) : null),
    el('span', { class: 'row-size' }, fmtBytes(node.s), total ? el('i', { style: { width: `${share * 100}%` } }) : null));
  row.addEventListener('click', (e) => {
    list.cursor = list.items.indexOf(node);
    if (showPath && !e.ctrlKey && !e.metaKey) reveal(node);
    else select(node, { add: e.ctrlKey || e.metaKey });
  });
  row.addEventListener('dblclick', () => {
    if (S.placing && node.d) transfer(S.placing.type, S.placing.nodes, node);
    else activate(node);
  });
  row.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (!S.sel.has(node)) select(node);
    menuFor(node, e.clientX, e.clientY);
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

function sortedContents() {
  const { key, dir } = S.sort;
  const items = [...S.focus.c];
  const cmp = key === 'name' ? (a, b) => a.n.localeCompare(b.n, undefined, { numeric: true, sensitivity: 'base' })
    : key === 'date' ? (a, b) => (a.d ? a.mm : a.m) - (b.d ? b.mm : b.m) : (a, b) => a.s - b.s;
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
  keepFocus($('ledger'), () => drawLedgerNow(keepScroll), $('ledger-rich').hidden ? $('ledger-list') : $('ledger-rich'));
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

/** A sort key toggle for the ledger's sub-line; the chosen one shows its direction. */
function sortToggle(label, on, dir, onclick) {
  return el('button', {
    class: 'sort', type: 'button', 'aria-pressed': String(on),
    title: on ? `Sorted by ${label.toLowerCase()}, ${dir < 0 ? 'descending' : 'ascending'}; click to reverse` : `Sort by ${label.toLowerCase()}`,
    onclick,
  }, label, on ? icon(dir < 0 ? 'sortDown' : 'sortUp') : null);
}

function drawContents(sub, _host, keepScroll) {
  const sortBtn = (key, label) => sortToggle(label, S.sort.key === key, S.sort.dir, () => {
    S.sort = { key, dir: S.sort.key === key ? -S.sort.dir : key === 'name' ? 1 : -1 };
    drawLedger();
  });
  const n = S.focus.c.length;
  // The sort keys stay together: in a narrow ledger they move under the
  // count as one. An empty folder has nothing to sort, so it shows none.
  sub.replaceChildren(el('span', { class: 'sub-count', text: `${fmtCount(n)} item${n === 1 ? '' : 's'} · ${fmtBytes(S.focus.s)}` }),
    ...(n ? [el('span', { class: 'sorts' }, sortBtn('name', 'Name'), sortBtn('size', 'Size'), sortBtn('date', 'Changed'))] : []));
  list.render = (node) => rowFor(node, { total: S.focus.s });
  list.setEmpty(S.focus.e ? `This folder could not be read (${S.focus.e}).` : S.focus.stub ? 'This folder has not been read yet.' : 'This folder is empty.');
  list.setItems(sortedContents(), keepScroll, { follow: S.primary });
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
    sub.replaceChildren(el('span', { class: 'grow', text: S.query && S.scanning ? 'The search runs again once the survey has finished.' : 'Type in the Find field to search every level.' }));
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
  const note = S.search.note || '';
  const n = S.search.list.length;
  sub.classList.add('is-rows');
  // With no match there is nothing to select or sort: the list says so.
  // (replaceChildren would print a null argument as the text "null".)
  sub.replaceChildren(...[
    el('div', { class: 'sub-row' }, el('span', { class: 'sub-count', text: `${fmtCount(n)} match${n === 1 ? '' : 'es'} · ${fmtBytes(S.search.bytes)}` }),
      n ? el('button', { class: 'sort', type: 'button', title: 'Select every match (up to 5,000)', onclick: () => {
        S.sel = new Set(items.slice(0, 5000));
        S.primary = items[0] || null;
        repaint();
        drawInspector();
        drawLedger(true);
      } }, icon('selectAll'), 'Select all') : null),
    n || note ? el('div', { class: 'sub-row' }, el('span', { class: 'sub-note', text: note, title: note || null }),
      n ? el('span', { class: 'sorts' }, sortBtn('size', 'Size'), sortBtn('date', 'Changed')) : null) : null,
  ].filter(Boolean));
  list.render = (node) => rowFor(node, { showPath: true });
  list.setEmpty('Nothing on any level matches this search.');
  list.setItems(items, keepScroll, { follow: S.primary });
}

/** Which rich-panel sections a person opened or closed, by title: a redraw keeps them so. */
const sectionOpen = new Map();

/** A collapsible section of the rich ledger panel; open is its state until someone toggles it. */
const section = (title, count, open, ...body) => {
  const d = el('details', { open: sectionOpen.get(title) ?? open }, el('summary', {}, title, el('span', { class: 'n', text: count })), ...body);
  d.addEventListener('toggle', () => sectionOpen.set(title, d.open));
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
  if (!sv) {
    sub.replaceChildren(el('span', { class: 'grow', text: 'The survey is compiled when the scan completes.' }));
    host.replaceChildren();
    return;
  }
  sub.replaceChildren(el('span', { class: 'grow', text: 'Noteworthy conditions across every level' }));
  host.replaceChildren(...buildSections(SURVEY, sv, {}));
}

/* The Survey tab's own sections, in SURVEY order. */

function surveyDuplicates(sv) {
  const verifiedGroups = sv.dupGroups.filter((g) => g.verified);
  const waste = sv.dupGroups.reduce((a, g) => a + g.waste, 0);
  const dupBody = [];
  if (sv.dupGroups.length) {
    dupBody.push(el('p', { class: 'note', text: verifiedGroups.length
      ? `${fmtCount(verifiedGroups.length)} groups confirmed identical by content. Unconfirmed groups share only their size.`
      : `Files of identical size, up to ${fmtBytes(waste)} if all are true copies. Size alone is only a hint.` }));
    dupBody.push(el('div', { class: 'actions' }, el('button', { class: 'btn btn-small', type: 'button', onclick: verifyDuplicates }, icon('verify'), 'Verify by content'),
      el('button', { class: 'btn btn-small', type: 'button', onclick: () => setLens('dup') }, icon('eye'), 'Show in the world')));
    for (const g of sv.dupGroups.slice(0, 60)) {
      dupBody.push(el('div', { class: 'group-head', text: `${g.files.length} × ${fmtBytes(g.size)} · ${g.verified ? (g.mode === 'sampled' ? 'probable (sampled)' : 'identical') : 'same size'}` }));
      for (const f of g.files.slice(0, 12)) dupBody.push(itemButton(f, ''));
    }
  } else dupBody.push(el('p', { class: 'note', text: 'No files of 4 KB or more share a size.' }));
  return section('Duplicate candidates', fmtCount(sv.dupGroups.length), false, dupBody);
}

async function drawJournal(sub, host) {
  sub.replaceChildren(el('span', { class: 'grow', text: 'Changes made to this directory, and the holding area' }));
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
    el('details', { open: true }, el('summary', {}, 'Changes', el('span', { class: 'n', text: fmtCount(entries.length) })),
      entries.length ? null : el('p', { class: 'note', text: ro ? 'Read-only mode: nothing can be changed.' : 'Nothing has been changed yet.' }),
      entries.length ? el('p', { class: 'note', text: 'Kept in .terrane-trash with the holding area, so Undo still works after Terrane restarts.' }) : null,
      entries.some((e) => !e.undone) && !ro ? el('div', { class: 'actions' }, el('button', { class: 'btn btn-small', type: 'button', onclick: undo }, icon('undo'), 'Undo latest')) : null,
      entries.map((e) => el('div', { class: 'item is-static' }, el('span', { class: e.undone ? 'swatch is-empty' : 'swatch', style: e.undone ? null : { background: 'var(--verdigris)' } }),
        el('span', {}, el('span', { class: 'nm', text: e.label }),
          el('span', { class: 'path', text: `${fmtDate(e.at)}${e.earlier ? ' · earlier session' : ''}${e.purged ? ' · purged' : e.undone ? ' · undone' : ''}` })), el('span')))),
    el('details', { open: true }, el('summary', {}, 'Holding area', el('span', { class: 'n', text: fmtCount(data.holding.length) })),
      el('p', { class: 'note', text: data.holding.length ? 'Removed items wait here, inside .terrane-trash in this directory, until restored or purged.' : 'Empty. Removed items wait here until restored or purged.' }),
      data.holding.map((h) => el('div', { class: 'item is-static' }, el('span', { class: 'swatch' }),
        el('span', {}, el('span', { class: 'nm', text: h.name }), el('span', { class: 'path', text: `from ${h.origin} · ${fmtDate(h.at)}` })),
        ro ? el('span') : el('button', { class: 'btn btn-small', type: 'button', onclick: async () => {
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

const IMAGE_EXT = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'avif', 'ico']);
const TEXT_EXT = new Set(['txt', 'md', 'markdown', 'rst', 'log', 'nfo', 'tex', 'svg']);

function fact(label, ...value) {
  return el('div', {}, el('dt', { text: label }), el('dd', {}, ...value));
}
const shareBar = (part, whole) => el('span', { class: 'share' }, el('i', { style: { width: `${whole ? Math.min(100, (part / whole) * 100) : 0}%` } }));
const pct = (part, whole) => (whole ? `${((part / whole) * 100).toFixed(part / whole < 0.1 ? 1 : 0)}%` : '0%');

function composition(dir) {
  const parts = KINDS.map((k, i) => ({ k, bytes: dir.ks[i] })).filter((p) => p.bytes > 0).sort((a, b) => b.bytes - a.bytes);
  if (!parts.length) return [];
  return [
    el('div', { class: 'section-title', text: 'Composition' }),
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
function actionButton(label, run, { off, danger, wide, title, icon: name } = {}) {
  return el('button', {
    class: `btn${danger ? ' btn-danger' : ''}${wide ? ' wide' : ''}`, type: 'button', 'aria-disabled': off ? 'true' : null,
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
  const host = $('inspector-body');
  keepFocus(host, drawInspectorNow, host);
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
      el('dl', { class: 'facts' }, fact('Size', el('b', { text: fmtBytes(size) }), ` · ${pct(size, S.model.root.s)} of root`, shareBar(size, S.model.root.s)),
        fact('Folders', fmtCount(nodes.filter((n) => n.d).length)), fact('Files', fmtCount(nodes.filter((n) => !n.d).length))),
      el('div', { class: 'section-title', text: 'Actions' }),
      el('div', { class: 'actions-grid' }, actionButton('Move to…', () => startPlacing('move'), { off, icon: 'move' }), actionButton('Copy to…', () => startPlacing('copy'), { off, icon: 'copy' }),
        actionButton('Duplicate', () => duplicate(), { off, icon: 'duplicate' }), actionButton('Copy paths', () => copyPaths(), { icon: 'copyPath' }),
        actionButton('Remove…', () => remove(), { off, danger: true, icon: 'remove' }), actionButton('Clear selection', () => select(null), { icon: 'clear' })),
      offNote(off),
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

const readingRow = (r) => el('li', {}, el('span', { class: `glyph ${r.glyph}` }), el('span', {}, el('b', { text: r.title }), r.text));

/* The inspector's own sections, in INSPECTOR order. */

function nodeTitle(node) {
  const kindLine = node.d ? (node.e ? `Sealed folder · ${node.e}` : node.c.length ? 'Folder' : 'Empty folder')
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
    fact('Size', el('b', { text: fmtBytes(node.s) }), node.s >= 1024 ? ` · ${fmtCount(node.s)} B` : ''),
    parent?.d ? fact('Of parent', pct(node.s, parent.s), shareBar(node.s, parent.s)) : null,
    fact(ctx.inside ? 'Of the archive' : 'Of root', pct(node.s, top.s), shareBar(node.s, top.s)),
    node.d ? fact('Contains', `${fmtCount(node.fc)} files · ${fmtCount(node.dc)} folders`) : null,
    node.d ? fact('Levels', `${depthOf(node)} above · ${node.h} below`) : fact('Level', String(depthOf(node))),
    fact(node.d ? 'Newest' : 'Changed', `${fmtDate(node.d ? node.mm : node.m)}`, el('br'), fmtAge(node.d ? node.mm : node.m)),
    el('div', {}, el('dt', { text: 'Created' }), ctx.created),
    ctx.linkRow,
    !ctx.visible ? fact('In the world', 'inside the framed mass or scree; fly to it to see it') : null);
}

function nodeCopies(node) {
  if (node.d || !node.dup || !S.survey) return null;
  const g = S.survey.dupGroups[node.dup - 1];
  if (!g) return null;
  return [
    el('div', { class: 'section-title', text: g.verified ? (g.mode === 'sampled' ? 'Probable copies' : 'Identical copies') : 'Same-size candidates' }),
    el('div', {}, g.files.filter((f) => f !== node).slice(0, 8).map((f) => itemButton(f, ''))),
  ];
}

function nodeActions(node, { ro, lockRoot, visible, inside }) {
  // Inside an open archive nothing is opened, revealed or changed.
  const shut = inside ? 'inside an archive' : null;
  return [
    el('div', { class: 'section-title', text: 'Actions' }),
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
    return [el('div', { class: 'section-title', text: t?.w ? `Preview · ${fmtCount(t.w)} × ${fmtCount(t.h)} px` : 'Preview' }), el('div', { class: 'preview' }, body)];
  }
  if (S.info.snapshot) {
    return [el('div', { class: 'section-title', text: 'Preview' }), el('div', { class: 'preview' }, el('div', { class: 'none', text: 'Snapshot mode holds names, sizes and dates, not contents.' }))];
  }
  if (node.k === 0 || node.k === 6 || TEXT_EXT.has(ext)) {
    const pre = el('pre', { text: '…' });
    fetch(rawUrl(node, 16384)).then((r) => (r.ok ? r.text() : Promise.reject())).then((t) => {
      pre.textContent = t.includes('\u0000') ? 'Binary content: no text preview.' : t;
    }).catch(() => { pre.textContent = 'This file could not be read.'; });
    return [el('div', { class: 'section-title', text: node.s > 16384 ? 'Preview · first 16 KB' : 'Preview' }), el('div', { class: 'preview' }, pre)];
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

function drawLegendNow() {
  const host = $('legend');
  if (!S.focus) return;
  const gradient = (stops) => `linear-gradient(to right, ${stops.map(cssHex).join(', ')})`;
  if (S.lens === 'kind') {
    $('legend-label').textContent = 'Kind · click to isolate';
    const kinds = KINDS.map((k, i) => ({ k, i, bytes: S.focus.ks[i] })).filter((x) => x.bytes > 0).sort((a, b) => b.bytes - a.bytes);
    if (!kinds.length) {
      host.replaceChildren(el('span', { class: 'legend-none', text: S.focus.fc ? 'Only empty files here.' : 'No files here.' }));
      return;
    }
    host.replaceChildren(...kinds.map((x) => el('button', {
      class: 'chip', type: 'button', 'aria-pressed': String(S.kindFilter === x.i), title: `${x.k.label}: ${fmtBytes(x.bytes)} here`,
      onclick: () => {
        S.kindFilter = S.kindFilter === x.i ? -1 : x.i;
        repaint();
        drawLegend();
      },
    }, el('span', { class: 'swatch', style: { background: cssHex(x.k.color) } }), x.k.label)));
  } else if (S.lens === 'age') {
    // Files by their last change; a closed mass by its typical age
    // (strata.js), except inside an open archive, which the age table
    // does not hold: there a closed mass shows its newest change.
    $('legend-label').textContent = 'Last change · closed masses: typical age';
    const archive = S.interior ? ` Inside ${S.interior.host.n} a closed mass shows its newest change: typical ages are for folders on disk.` : '';
    host.replaceChildren(el('div', { class: 'rampbar', title: `A file shows its last change. A closed mass shows its typical age: half its bytes have not changed since then.${archive}` },
      '10 years +', el('i', { style: { background: gradient(THEME.ageRamp) } }), 'today'));
  } else if (S.lens === 'size') {
    $('legend-label').textContent = 'File size · log scale';
    host.replaceChildren(el('div', { class: 'rampbar' }, '0', el('i', { style: { background: gradient(THEME.sizeRamp) } }), fmtBytes(S.survey?.largest[0]?.s || 0)));
  } else {
    $('legend-label').textContent = 'Duplicates';
    const groups = S.survey?.dupGroups || [];
    const v = groups.filter((g) => g.verified).length;
    host.replaceChildren(el('div', { class: 'rampbar' },
      el('span', { class: 'swatch', style: { background: 'repeating-linear-gradient(135deg, var(--garnet) 0 3px, var(--paper) 3px 6px)' } }), `same size · ${fmtCount(groups.length - v)}`,
      el('span', { class: 'swatch', style: { background: 'var(--garnet)' } }), `confirmed · ${fmtCount(v)}`,
      groups.length ? el('button', { class: 'btn btn-small', type: 'button', onclick: verifyDuplicates }, icon('verify'), 'Verify by content') : ''));
  }
}

/** The status line's parts, made once so their figures can count between values. */
let statusParts = null;
function statusLine() {
  if (statusParts) return statusParts;
  const fig = () => el('span', { class: 'num' });
  statusParts = { lamp: el('span', { class: 'pulse' }), dirs: fig(), files: fig(), bytes: fig() };
  $('status').replaceChildren(statusParts.lamp, el('span', {}, statusParts.dirs, ' folders · ', statusParts.files, ' files · ', statusParts.bytes));
  return statusParts;
}

function drawStatus() {
  if (!S.model) return;
  const r = S.model.root;
  let cls = 'pulse';
  let label;
  if (S.scanning) { cls += ' is-busy'; label = 'Surveying'; }
  else if (S.watch === 'snapshot') { cls += ' is-off'; label = `Snapshot · ${fmtDate(S.info.snapshot.takenAt)}`; }
  else if (S.watch === 'live') label = 'Live';
  else if (S.watch === 'lost') { cls += ' is-off'; label = 'Service stopped'; }
  else { cls += ' is-off'; label = 'Manual refresh'; }
  const fit = S.layout?.over ? ' · grain raised, some blocks left out' : S.layout?.coarsened ? ' · grain raised to fit' : '';
  setText($('status-label'), `${label}${S.info.readOnly && !S.info.snapshot ? ' · read-only' : ''}${fit}`);
  const parts = statusLine();
  parts.lamp.className = cls;
  countTo(parts.dirs, r.dc, fmtCount);
  countTo(parts.files, r.fc, fmtCount);
  countTo(parts.bytes, r.s, fmtBytes);
  $('status').title = `${fmtCount(S.layout?.n || 0)} blocks drawn`;
}

/* ====================================================================== */
/* search                                                                 */
/* ====================================================================== */

function runQuery() {
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
  runQuery();
  if (S.search && S.tab !== 'findings') S.tab = 'findings';
  else if (!S.search && had && S.tab === 'findings') S.tab = 'contents';
  repaint();
  drawLedger();
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
  applyQuery();
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
function fatal(title, text, kind = 'error') {
  const veil = $('veil');
  clearTimeout(veilTimer);
  veil.className = kind === 'busy' ? '' : `is-${kind}`;
  veil.replaceChildren(el('div', { class: 'stack', style: { alignItems: 'center', gap: '10px' } },
    veilMark(), el('strong', { text: title }), el('div', { class: 'veil-path', text }),
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
 * either way. Kept in this browser; on unless turned off in the guide.
 */
const PREF_KEY = 'terrane.single-keys';
const prefs = {
  get singleKeys() {
    try {
      return localStorage.getItem(PREF_KEY) !== 'focused';
    } catch {
      return true;
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
  core({ id: 'descend', keys: ['v'], run: () => { S.view.descend(); }, guide: [GO, 'V', 'Drop to eye level'] });
  core({ id: 'overview', keys: ['0', 'Home'], run: () => { overview(); }, guide: [GO, '0', 'Rise to the overview'] });
  core({ id: 'fly-to-selection', keys: ['g'], run: () => { if (S.primary) reveal(S.primary); }, guide: [GO, 'G', 'Fly to the selection'] });
  core({ id: 'closer', keys: ['+', '='], run: () => { S.view.zoomAt(0.7); } });
  core({ id: 'farther', keys: ['-', '_'], run: () => { S.view.zoomAt(1.45); } });
  core({ id: 'guide-double-click', guide: [GO, 'Double-click', 'Fly to folder / open file'] });
  core({ id: 'guide-click', guide: [SEL, 'Click', 'Select'] });
  core({ id: 'guide-ctrl-click', guide: [SEL, 'Ctrl+click', 'Add to selection'] });
  core({ id: 'sibling', keys: ['ArrowLeft', 'ArrowRight'], when: (c) => c.onCanvas, run: (c) => { stepSelection(c.k); }, guide: [SEL, '← →', 'Previous / next sibling'] });
  core({ id: 'parent-child', keys: ['ArrowUp', 'ArrowDown'], when: (c) => c.onCanvas, run: (c) => { stepSelection(c.k); }, guide: [SEL, '↑ ↓', 'Parent / first child'] });
  core({
    id: 'activate', keys: ['Enter'], inList: false, when: (c) => !c.t.closest?.('button, summary, a'),
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
  core({ id: 'panels', keys: ['[', ']'], run: (c) => { togglePanel(c.k === '[' ? 'ledger' : 'inspector'); }, guide: [SEL, '[  ]', 'Hide ledger / inspector'] });
  core({ id: 'lens', keys: ['1', '2', '3', '4'], run: (c) => { setLens(['kind', 'age', 'size', 'dup'][Number(c.k) - 1]); }, guide: [SEL, '1 – 4', 'Lens'] });
  core({ id: 'new-folder', keys: ['n'], run: () => { newFolder(S.primary?.d && S.sel.size === 1 ? S.primary : S.focus); }, guide: [CHG, 'N', 'New folder'] });
  core({ id: 'rename', keys: ['F2'], run: () => { rename(); }, guide: [CHG, 'F2', 'Rename'] });
  core({
    id: 'move', keys: ['m'],
    run: () => {
      if (refuseInside([...S.sel])) return;
      if (!writable()) startPlacing('move');
      else notice('Read-only mode: nothing can be moved.', { kind: 'info' });
    },
    guide: [CHG, 'M', 'Move to…'],
  });
  core({ id: 'duplicate', mod: 'ctrl', keys: ['d'], run: () => { if (!refuseInside([...S.sel]) && !writable()) duplicate(); }, guide: [CHG, 'Ctrl+D', 'Duplicate'] });
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
    id: 'menu', keys: ['ContextMenu', 'F10'], when: (c) => c.k === 'ContextMenu' || c.e.shiftKey,
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
  AFTER_SURVEY.add({ id: 'ages', order: 10, run: () => { S.ages = buildAgeTable(S.model.root, Date.now()); } });

  PIN_SOURCES.add({ id: 'search', order: 20, pins: searchPins });
  PIN_SOURCES.add({ id: 'heavy', order: 30, pins: heavyPins });

  TIP_LINES.add({ id: 'levels', order: 10, lines: (node, c) => (c.type === BOX.CAP && !node.e && node.c.length ? `${node.h + 1} level${node.h ? 's' : ''} inside · opens as you approach · double-click to go` : null) });
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
    build: (f) => el('dl', { class: 'facts' }, fact('Size', el('b', { text: fmtBytes(f.s) })), fact('Contains', `${fmtCount(f.fc)} files · ${fmtCount(f.dc)} folders`), fact('Depth below', `${f.h} level${f.h === 1 ? '' : 's'}`)),
  });
  INSPECTOR.focus.add({ id: 'composition', order: 20, build: (f) => composition(f) });
  INSPECTOR.focus.add({ id: 'reading', order: 90, build: () => [el('div', { class: 'section-title', text: 'Reading the world' }), el('ul', { class: 'reading' }, [...READING].map(readingRow))] });

  INSPECTOR.node.add({ id: 'title', order: 0, build: nodeTitle });
  INSPECTOR.node.add({ id: 'path', order: 5, build: (node) => el('div', { class: 'insp-path' }, el('code', { text: absPath(node) }), el('button', { class: 'btn btn-small', type: 'button', title: 'Copy path (Ctrl+C)', onclick: () => copyPaths([node]) }, icon('copyPath'), 'Copy')) });
  INSPECTOR.node.add({ id: 'facts', order: 10, build: nodeFacts });
  INSPECTOR.node.add({ id: 'composition', order: 20, build: (node) => (node.d ? composition(node) : null) });
  INSPECTOR.node.add({ id: 'copies', order: 30, build: nodeCopies });
  INSPECTOR.node.add({ id: 'actions', order: 50, build: nodeActions });
  INSPECTOR.node.add({ id: 'preview', order: 60, build: nodePreview });

  READING.add({ id: 'footprint', order: 10, glyph: 'g-foot', title: 'Footprint is storage', text: 'Ground area is share of the parent folder.' });
  READING.add({ id: 'elevation', order: 20, glyph: 'g-elev', title: 'Elevation is nesting', text: 'Each level stands one step up, one tone lighter, and one scale smaller.' });
  READING.add({ id: 'height', order: 30, glyph: 'g-height', title: 'Height is recency', text: 'Fresh files stand tall; untouched ones wear down flat.' });
  READING.add({ id: 'mass', order: 40, glyph: 'g-mass', title: 'Closed mass', text: 'A folder seen from afar. Taller means more levels inside. Approach and it opens.' });
  READING.add({ id: 'scree', order: 50, glyph: 'g-scree', title: 'Scree', text: 'Items too small to see from here, gathered into one tile. Go closer.' });
  READING.add({ id: 'sealed', order: 60, glyph: 'g-seal', title: 'Hatched', text: 'Sealed: the folder could not be read.' });
  READING.add({ id: 'empty', order: 70, glyph: 'g-empty', title: 'Hollow', text: 'An empty folder.' });
  READING.add({ id: 'pin', order: 80, glyph: 'g-pin', title: 'Pin', text: 'Vermilion marks a search match; ink marks a heavyweight file.' });

  TABS.add({ id: 'contents', order: 10, label: 'Contents', list: true, draw: drawContents });
  TABS.add({
    id: 'findings', order: 20, label: 'Findings', list: true, draw: drawFindings, count: () => (S.search ? S.search.list.length : null), enter: (node) => reveal(node),
    key: () => { const o = findSort(); return `${o.key}:${o.dir}`; },
  });
  TABS.add({ id: 'survey', order: 30, label: 'Survey', draw: drawSurvey });
  TABS.add({ id: 'journal', order: 40, label: 'Journal', draw: drawJournal });

  SURVEY.add({ id: 'largest', order: 10, build: (sv) => section('Largest files', fmtCount(sv.largest.length), true, sv.largest.slice(0, 80).map((f) => itemButton(f, fmtBytes(f.s)))) });
  SURVEY.add({ id: 'duplicates', order: 20, build: surveyDuplicates });
  SURVEY.add({ id: 'empty', order: 30, build: (sv) => section('Empty folders', fmtCount(sv.empty.length), false, sv.empty.length ? sv.empty.slice(0, 300).map((d) => itemButton(d, '')) : el('p', { class: 'note', text: 'None.' })) });
  SURVEY.add({
    id: 'sealed', order: 40,
    build: (sv) => section('Sealed folders', fmtCount(sv.sealed.length), sv.sealed.length > 0, sv.sealed.length
      ? [el('p', { class: 'note', text: 'These could not be read, so their contents are not counted.' }), sv.sealed.slice(0, 300).map((d) => itemButton(d, d.e))]
      : el('p', { class: 'note', text: 'Every folder was readable.' })),
  });
  SURVEY.add({
    id: 'links', order: 50,
    build: (sv) => section('Symbolic links', fmtCount(sv.links.length), false, sv.links.length
      ? [el('p', { class: 'note', text: 'Shown but never followed.' }), sv.links.slice(0, 300).map((f) => itemButton(f, 'link'))]
      : el('p', { class: 'note', text: 'None.' })),
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
  AFTER_QUERY, SURVEY,
  get, post, runOp, refreshDirs, writable, isAttached, hostOf, relPath, absPath,
  // The ledger row the keyboard cursor is on, or null.
  listCursor: () => (list?.items.length ? list.items[list.cursor] ?? null : null),
  relayout, queueLayout, repaint, drawPins, visibleIndexOf,
  select, setFocus, reveal, activate, describe, say, forceOpen, overview,
  drawAll, drawTabs, drawLedger, drawInspector, drawLegend, drawStatus, runQuery, setQuery,
  el, notice, section, itemButton, actionButton, fact, shareBar, pct,
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
  // Not served by the service: elsewhere.js has said so and sent the
  // loading sheet away. Should it not have run, the veil says it here.
  if (ELSEWHERE) {
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
    splash.stage('Connecting to the local service');
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
    fatal('3D view unavailable', `This browser could not start WebGL (${err.message}). The ledger, inspector, search and every operation still work.`, 'quiet');
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
      if (e.key.startsWith('Arrow') || e.key.startsWith('Page') || e.key === 'Home' || e.key === 'End') select(node, { quiet: true });
      else if (e.key === 'Enter') {
        e.preventDefault();
        if (S.placing && node.d) transfer(S.placing.type, S.placing.nodes, node);
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
  if (!S.noGL) fatal(S.info.snapshot ? 'Reading the snapshot' : 'Surveying', S.info.root, 'busy');
  splash?.stage(S.info.snapshot ? `Reading the snapshot of ${S.info.name}` : `Surveying ${S.info.name}`);
  S.scanning = true;
  thumbs.load(TOKEN);
  drawAll();
  const t0 = performance.now();
  try {
    await scanInto(S.model.root);
  } catch (err) {
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
  // places: the landmarks store (S.places), when that feature is installed.
  window.__terrane = { S, list, scanMs: Math.round(performance.now() - t0), api: API, install: installFeatures, get places() { return S.places; } };
  if (S.model.root.e) notice(`The root could not be read: ${S.model.root.e}`, { kind: 'error' });
  connectEvents();
}

start();
