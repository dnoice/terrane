/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Terrane Application (Terrane Edition - v1.0)
 *     - File Name: app.js
 *     - Relative Path: web/js/app.js
 *     - Artifact Type: javascript
 *     - Version: 1.0.0
 *     - Date: 11/09/2026
 *     - Update: Monday, November 9, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Fable 5.2
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Description:
 *     The controller that makes Terrane one product instead of several
 *     parts. It owns the session state (focus, selection, lens, search,
 *     placing), talks to the local service, and keeps the 3D world, the
 *     ledger, the inspector, the location bar and the title block showing
 *     the same thing at the same time.
 *
 * ✒ Key Features:
 *     - Streams the scan into the model and redraws while it is running
 *     - One selection shared by the viewport and the ledger; either can
 *       drive it, by pointer or by keyboard
 *     - Location follows the eye: the folder you are in is derived from
 *       where the camera is looking, and the breadcrumbs, ledger and
 *       legend follow it; clicking any of them flies you there
 *     - World management: the layout is rebuilt around the eye whenever
 *       it has moved more than a fraction of its altitude
 *     - Four lenses over one geometry: kind, age, size, duplicates
 *     - Search that dims everything else, pins the matches, and marks
 *       closed masses and scree that contain matches
 *     - Real operations through the service: open, reveal, copy path, new
 *       folder, rename, move, copy, duplicate, remove to holding, restore,
 *       undo; every result or refusal is reported in words
 *     - Placing mode and drag-and-drop for choosing a destination either
 *       in the world, in the ledger, or on a breadcrumb
 *     - After every change only the affected folders are re-read
 *     - Live updates from the service's watcher, merged the same way
 *
 * ✒ Usage Instructions:
 *     Loaded by web/index.html as a module. There is no public API; start
 *     the service and open the address it prints.
 *
 * ✒ Other Important Information:
 *     - Dependencies: model.js, layout.js, viewport.js, theme.js, ui.js
 *     - Compatible platforms: current evergreen browsers with WebGL2
 *     - Limitations: when WebGL is unavailable the ledger, inspector,
 *       search and every operation keep working without the 3D world
 * ----------------------------------------------------------------------------
 */

import {
  Model, KINDS, FLAG_LINK, FLAG_HIDDEN, extOf, fmtBytes, fmtCount, fmtDate, fmtAge, freshness, relPath, depthOf,
  isAncestor, parseQuery, runSearch,
} from './model.js';
import { buildLayout, BOX } from './layout.js';
import { Viewport } from './viewport.js';
import { THEME, mixHex, ramp, cssHex } from './theme.js';
import { el, openMenu, closeFloating, floatingOpen, ask, notice, tip, hideTip, VirtualList } from './ui.js';

const $ = (id) => document.getElementById(id);
const TOKEN = document.querySelector('meta[name="terrane-token"]').content;
const GRAINS = [{ label: 'Coarse', v: 0.0105 }, { label: 'Medium', v: 0.0062 }, { label: 'Fine', v: 0.0038 }, { label: 'Finest', v: 0.0024 }];

const S = {
  info: null, model: null, view: null, layout: null, focus: null, trail: [],
  sel: new Set(), primary: null,
  lens: 'kind', grain: 1, kindFilter: -1, force: null, lastEye: null,
  query: '', search: null,
  survey: null, scanning: false, watch: 'idle',
  placing: null, drag: null,
  tab: 'contents', sort: { key: 'size', dir: -1 },
  layoutTimer: 0, surveyTimer: 0,
};

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
    if (!S.noGL) $('veil').hidden = true;
    queueLayout();
    drawStatus();
  });
}

function isAttached(node) {
  let a = node;
  while (a.p) {
    if (!a.p.c.includes(a)) return false;
    a = a.p;
  }
  return a === S.model.root;
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
      if (node && node.d) dirs.add(node);
    }
    for (const dir of dirs) {
      if (!isAttached(dir)) continue;
      const records = [];
      try {
        await scanStream(relPath(dir), 1, (batch) => records.push(...batch));
      } catch (err) {
        if (err.code === 'ENOENT' && dir.p) await refreshDirs([relPath(dir.p)]);
        continue;
      }
      const { added } = S.model.reconcile(dir, records);
      for (const child of added) await scanInto(child);
    }
    for (const n of [...S.sel]) if (!isAttached(n)) S.sel.delete(n);
    if (S.primary && !isAttached(S.primary)) S.primary = [...S.sel].at(-1) || null;
    if (!isAttached(S.focus)) S.focus = S.model.root;
    S.trail = S.trail.filter(isAttached);
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
    repaint();
    if (S.tab === 'survey') drawLedger();
    drawLegend();
  }, 500);
}

function connectEvents() {
  const es = new EventSource(`/api/events?${new URLSearchParams({ t: TOKEN, dirs: S.model.root.dc })}`);
  es.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.type === 'watch') S.watch = msg.state;
    else if (msg.type === 'change' && !S.scanning) refreshDirs(msg.dirs);
    else if (msg.type === 'bulk') {
      notice(`${fmtCount(msg.count)} folders changed on disk.`, { kind: 'info', action: { label: 'Rescan all', run: fullScan } });
    }
    drawStatus();
  };
  es.onerror = () => {
    S.watch = 'lost';
    drawStatus();
  };
}

async function fullScan() {
  S.scanning = true;
  const name = S.info.name;
  S.model = new Model(name);
  S.focus = S.model.root;
  S.sel.clear();
  S.primary = null;
  S.trail = [];
  S.survey = null;
  drawAll();
  try {
    await scanInto(S.model.root);
  } catch (err) {
    fatal('The survey stopped', err.message);
  }
  S.scanning = false;
  S.survey = S.model.survey();
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
  S.layout = buildLayout(S.model.root, { cam: eye, grain: GRAINS[S.grain].v, now: S.model.now, force: S.force });
  S.view.setLayout(S.layout, paint(), { animate });
  syncViewSelection();
  drawPins();
  updateWhere();
  drawStatus();
}

/**
 * The folder you are "in": the deepest one under the centre of the view
 * that still fills a good part of it. Breadcrumbs and the ledger follow.
 */
function updateWhere() {
  const L = S.layout;
  if (!L) return;
  const p = S.view.look();
  let dir = S.model.root;
  if (p && p.point) {
    const width = p.dist * 0.82 * (S.view.w / S.view.h);
    for (;;) {
      let next = null;
      for (const ch of dir.c) {
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
  if (dir === S.focus) return;
  S.focus = dir;
  drawCrumbs();
  if (S.tab === 'contents') drawLedger();
  if (!S.primary) drawInspector();
  drawLegend();
  $('b-up').toggleAttribute('disabled', !S.focus.p);
}

let whereTimer = 0;
function onMoved(settled) {
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
  // Stated in the unit that matters here: roughly how much storage one
  // screen-width of ground stands for from this height.
  const p = S.view.look();
  if (!p.point) {
    $('alt-val').textContent = 'Horizon';
    return;
  }
  const width = p.dist * 0.82 * (S.view.w / S.view.h);
  const share = Math.min(1, (width * width) / 1e6);
  $('alt-val').textContent = share >= 1 ? 'Overview · everything' : `≈ ${fmtBytes(S.model.root.s * share)} across the view`;
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

  for (let i = 0; i < n; i++) {
    const node = L.node[i];
    const type = L.type[i];
    const lvl = L.level[i];
    let c;
    let s = 0;
    if (type === BOX.DIR) {
      c = THEME.plaster[Math.min(lvl, THEME.plaster.length - 1)];
    } else if (type === BOX.SCREE) {
      c = THEME.plaster[Math.max(0, Math.min(lvl, 5) - 1)];
      s = 3;
    } else if (type === BOX.CAP) {
      if (node.e) { c = THEME.clay; s = 1; }
      else if (node.c.length === 0) { c = THEME.paper; s = 2; }
      else if (S.lens === 'kind') c = mixHex(THEME.clay, KINDS[dominantKind(node)].color, 0.42);
      else if (S.lens === 'age') c = mixHex(THEME.clay, ramp(THEME.ageRamp, freshness(node.mm, now)), 0.7);
      else if (S.lens === 'size') c = mixHex(THEME.clay, ramp(THEME.sizeRamp, Math.log2(node.s + 2) / maxLog), 0.7);
      else c = THEME.clay;
    } else {
      if (S.lens === 'kind') c = KINDS[node.k].color;
      else if (S.lens === 'age') c = ramp(THEME.ageRamp, freshness(node.m, now));
      else if (S.lens === 'size') c = ramp(THEME.sizeRamp, Math.log2(node.s + 2) / maxLog);
      else if (node.dup) {
        c = THEME.garnet;
        if (!S.survey?.dupGroups[node.dup - 1]?.verified) s = 5;
      } else c = 0xd3d9d4;
      if (node.f & FLAG_LINK) s = 4;
      if (node.f & FLAG_HIDDEN && S.lens === 'kind') c = mixHex(c, THEME.paper, 0.4);
    }

    let d = 0;
    if (search) {
      if (search.set.has(node) && type !== BOX.SCREE) d = 0;
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
      if (type === BOX.FILE || type === BOX.SCREE) d = 0.75;
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
}

function drawPins() {
  const L = S.layout;
  const pins = [];
  if (S.search) {
    for (let i = 0; i < L.n && pins.length < 2500; i++) {
      const node = L.node[i];
      const t = L.type[i];
      if (t === BOX.FILE ? S.search.set.has(node)
        : t === BOX.CAP ? S.search.set.has(node) || S.search.within.has(node)
          : t === BOX.SCREE ? screeHasMatch(i) : false) pins.push({ i, color: THEME.signal });
    }
  } else if (S.survey && S.lens !== 'dup') {
    for (const f of S.survey.heavy) {
      const i = L.index.get(f);
      if (i !== undefined) pins.push({ i, color: THEME.ink });
    }
  }
  S.view.setPins(pins);
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

/** Flies to a folder. "Where you are" then follows from the camera. */
function setFocus(dir, { remember = true } = {}) {
  if (!dir || !dir.d) return;
  if (remember && S.focus !== dir) S.trail.push(S.focus);
  S.force = new Set();
  for (let a = dir; a; a = a.p) S.force.add(a);
  relayout();
  const i = S.layout.index.get(dir);
  if (!dir.p || i === undefined) S.view.overview();
  else S.view.frame(i);
  say(`Travelling to ${dir.n}, ${fmtCount(dir.c.length)} items`);
}

const goUp = () => S.focus.p && setFocus(S.focus.p);
const goBack = () => {
  const prev = S.trail.pop();
  if (prev && isAttached(prev)) setFocus(prev, { remember: false });
};

/** Makes a node visible (changing focus if it must) and flies to it. */
function reveal(node) {
  if (!S.layout.index.has(node)) {
    S.force = new Set();
    for (let a = node; a; a = a.p) S.force.add(a);
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
  let next = null;
  if (key === 'ArrowUp') next = cur !== S.focus ? cur.p : null;
  else if (key === 'ArrowDown') next = cur.d ? cur.c[0] : null;
  else if (cur.p) {
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

const writable = () => (S.info.readOnly ? 'read-only mode' : null);

async function runOp(body, { silent = false } = {}) {
  try {
    const res = await post('op', body);
    if (!silent) notice(res.label, res.undoable ? { action: { label: 'Undo', run: undo } } : {});
    if (res.affected?.length) await refreshDirs(res.affected);
    if (S.tab === 'journal') drawLedger();
    return res;
  } catch (err) {
    if (err.affected?.length) refreshDirs(err.affected);
    if (err.code === 'EEXIST' && (body.type === 'move' || body.type === 'copy') && body.onConflict !== 'keepBoth') {
      notice(err.message, { kind: 'error', action: { label: 'Keep both', run: () => runOp({ ...body, onConflict: 'keepBoth' }) } });
    } else notice(err.message, { kind: 'error' });
    return null;
  }
}

async function undo() {
  try {
    const res = await post('undo');
    notice(res.label);
    await refreshDirs(res.affected);
    if (S.tab === 'journal') drawLedger();
  } catch (err) {
    notice(err.message, { kind: err.code === 'ENOUNDO' ? 'info' : 'error' });
  }
}

const nameProblem = (v) => {
  const name = v.name;
  if (!name.trim()) return 'Enter a name.';
  if (/[\\/]/.test(name)) return 'A name cannot contain a slash.';
  if (name === '.' || name === '..') return 'That name is reserved.';
  return null;
};

async function newFolder(dir = S.focus) {
  const v = await ask({
    title: 'New folder', body: `Inside ${relPath(dir) || S.info.name}`, confirm: 'Create',
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
  if (!node || !node.p) return;
  const v = await ask({
    title: 'Rename', confirm: 'Rename', validate: nameProblem,
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
  if (!nodes.length) return;
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
  const byParent = new Map();
  for (const n of nodes) byParent.set(n.p, [...(byParent.get(n.p) || []), n]);
  for (const [parent, list] of byParent) await runOp({ type: 'copy', paths: list.map(relPath), dest: relPath(parent) });
}

async function remove(nodes = [...S.sel]) {
  nodes = tops(movable(nodes));
  if (!nodes.length) return;
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

function menuFor(node, x, y) {
  const ro = writable();
  const many = S.sel.size > 1 && S.sel.has(node);
  const isRoot = node && !node.p;
  const lock = (extra) => ({ disabled: !!(ro || extra), reason: ro || extra || undefined });
  let items;
  if (!node) {
    items = [
      { label: 'New folder here…', hint: 'N', run: () => newFolder(S.focus), ...lock() },
      { label: 'Copy path of this folder', run: () => copyPaths([S.focus]) },
      { label: 'Reveal in file manager', run: () => runOp({ type: 'reveal', path: relPath(S.focus) }) },
      'sep',
      { label: 'Up one level', hint: 'Backspace', run: goUp, disabled: !S.focus.p, reason: 'already at the root' },
      { label: 'Rise to the overview', hint: '0', run: () => S.view.overview() },
      { label: 'Re-read this folder', hint: 'F5', run: () => refreshDirs([relPath(S.focus)]) },
    ];
  } else if (many) {
    const nodes = [...S.sel];
    items = [
      { label: `Move ${nodes.length} items to…`, hint: 'M', run: () => startPlacing('move'), ...lock() },
      { label: `Copy ${nodes.length} items to…`, run: () => startPlacing('copy'), ...lock() },
      { label: 'Duplicate in place', hint: 'Ctrl+D', run: () => duplicate(), ...lock() },
      { label: 'Copy paths', hint: 'Ctrl+C', run: () => copyPaths() },
      'sep',
      { label: `Remove ${nodes.length} items…`, hint: 'Del', danger: true, run: () => remove(), ...lock() },
    ];
  } else {
    const rootLock = isRoot ? 'the authorized root' : null;
    items = [
      node.d ? { label: 'Go there', hint: 'Enter', run: () => setFocus(node), disabled: !!node.e, reason: 'cannot be read' }
        : { label: 'Open', hint: 'Enter', run: () => activate(node) },
      { label: 'Reveal in file manager', run: () => runOp({ type: 'reveal', path: relPath(node) }) },
      { label: 'Copy path', hint: 'Ctrl+C', run: () => copyPaths([node]) },
      'sep',
      node.d ? { label: 'New folder inside…', run: () => newFolder(node), ...lock(node.e ? 'cannot be read' : null) } : null,
      { label: 'Rename…', hint: 'F2', run: () => rename(node), ...lock(rootLock) },
      { label: 'Move to…', hint: 'M', run: () => startPlacing('move', [node]), ...lock(rootLock) },
      { label: 'Copy to…', run: () => startPlacing('copy', [node]), ...lock(rootLock) },
      { label: 'Duplicate in place', hint: 'Ctrl+D', run: () => duplicate([node]), ...lock(rootLock) },
      'sep',
      { label: 'Remove…', hint: 'Del', danger: true, run: () => remove([node]), ...lock(rootLock) },
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
    if (S.info.readOnly) $(id).title = 'Unavailable: Terrane was started in read-only mode';
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
  for (let a = S.focus; a; a = a.p) chain.unshift(a);
  const parts = [];
  chain.forEach((node, i) => {
    if (i) parts.push(el('span', { class: 'slash', 'aria-hidden': 'true', text: '/' }));
    const b = el('button', { class: 'crumb', type: 'button', text: node.n, title: absPath(node), 'aria-current': node === S.focus ? 'location' : null, onclick: () => setFocus(node) });
    dropTarget(node, b);
    parts.push(b);
  });
  host.replaceChildren(...parts);
  host.scrollLeft = host.scrollWidth;
}

/* ---------- ledger ---------- */

let list;

function rowFor(node, { showPath = false, total } = {}) {
  const cls = node.d ? (node.e ? 'swatch is-sealed' : node.c.length ? 'swatch is-dir' : 'swatch is-empty') : 'swatch';
  const share = total ? Math.max(0, Math.min(1, node.s / total)) : 0;
  const row = el('div', { class: `row${S.sel.has(node) ? ' is-selected' : ''}`, draggable: node.p && !S.info.readOnly ? 'true' : null, 'aria-selected': S.sel.has(node) ? 'true' : 'false', title: showPath ? relPath(node) : node.n },
    el('span', { class: cls, style: node.d ? null : { background: cssHex(KINDS[node.k].color) } }),
    el('span', { class: 'row-name' }, node.n, node.d ? el('small', { text: node.e ? node.e : fmtCount(node.fc) }) : showPath ? el('small', { text: relPath(node.p) || '/' }) : null),
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

let ledgerKey = null;
function drawLedger(keepScroll = false) {
  // The list only returns to the top when it shows something different;
  // a refresh of the same folder leaves the reader where they were.
  const key = [S.tab, S.focus, S.sort.key, S.sort.dir, S.query].map((v) => (typeof v === 'object' ? v?.n : v)).join('|') + '|' + (S.tab === 'contents' ? relPath(S.focus) : '');
  if (key === ledgerKey) keepScroll = true;
  ledgerKey = key;
  document.querySelectorAll('.tabs [role=tab]').forEach((t) => t.setAttribute('aria-selected', String(t.dataset.tab === S.tab)));
  const sub = $('ledger-sub');
  const rich = $('ledger-rich');
  const listHost = $('ledger-list');
  const useList = S.tab === 'contents' || S.tab === 'findings';
  listHost.hidden = !useList;
  rich.hidden = useList;
  const findTab = document.querySelector('[data-tab=findings]');
  findTab.replaceChildren('Findings', S.search ? el('span', { class: 'count', text: fmtCount(S.search.list.length) }) : '');

  if (S.tab === 'contents') {
    const sortBtn = (key, label) => el('button', {
      class: 'sort', type: 'button', 'aria-pressed': String(S.sort.key === key), text: label + (S.sort.key === key ? (S.sort.dir < 0 ? ' ↓' : ' ↑') : ''),
      onclick: () => {
        S.sort = { key, dir: S.sort.key === key ? -S.sort.dir : key === 'name' ? 1 : -1 };
        drawLedger();
      },
    });
    sub.replaceChildren(el('span', { class: 'grow', text: `${fmtCount(S.focus.c.length)} items · ${fmtBytes(S.focus.s)}` }), sortBtn('name', 'Name'), sortBtn('size', 'Size'), sortBtn('date', 'Changed'));
    list.render = (node) => rowFor(node, { total: S.focus.s });
    list.setItems(sortedContents(), keepScroll);
  } else if (S.tab === 'findings') {
    if (!S.search) {
      sub.replaceChildren(el('span', { class: 'grow', text: 'Type in the Find field to search every level.' }));
      list.setItems([]);
    } else {
      sub.replaceChildren(el('span', { class: 'grow', text: `${fmtCount(S.search.list.length)} matches · ${fmtBytes(S.search.bytes)}` }),
        el('button', { class: 'sort', type: 'button', text: 'Select all', onclick: () => {
          S.sel = new Set(S.search.list.slice(0, 5000));
          S.primary = S.search.list[0] || null;
          repaint();
          drawInspector();
          drawLedger(true);
        } }));
      list.render = (node) => rowFor(node, { showPath: true });
      list.setItems(S.search.list, keepScroll);
    }
  } else if (S.tab === 'survey') drawSurvey(sub, rich);
  else drawJournal(sub, rich);
}

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
  const section = (title, count, open, ...body) => el('details', { open }, el('summary', {}, title, el('span', { class: 'n', text: count })), ...body);
  const verifiedGroups = sv.dupGroups.filter((g) => g.verified);
  const waste = sv.dupGroups.reduce((a, g) => a + g.waste, 0);
  const dupBody = [];
  if (sv.dupGroups.length) {
    dupBody.push(el('p', { class: 'note', text: verifiedGroups.length
      ? `${fmtCount(verifiedGroups.length)} groups confirmed identical by content. Unconfirmed groups share only their size.`
      : `Files of identical size, up to ${fmtBytes(waste)} if all are true copies. Size alone is only a hint.` }));
    dupBody.push(el('div', { class: 'actions' }, el('button', { class: 'btn btn-small', type: 'button', text: 'Verify by content', onclick: verifyDuplicates }),
      el('button', { class: 'btn btn-small', type: 'button', text: 'Show in the world', onclick: () => setLens('dup') })));
    for (const g of sv.dupGroups.slice(0, 60)) {
      dupBody.push(el('div', { class: 'group-head', text: `${g.files.length} × ${fmtBytes(g.size)} · ${g.verified ? (g.mode === 'sampled' ? 'probable (sampled)' : 'identical') : 'same size'}` }));
      for (const f of g.files.slice(0, 12)) dupBody.push(itemButton(f, ''));
    }
  } else dupBody.push(el('p', { class: 'note', text: 'No files of 4 KB or more share a size.' }));

  host.replaceChildren(
    section('Largest files', fmtCount(sv.largest.length), true, sv.largest.slice(0, 80).map((f) => itemButton(f, fmtBytes(f.s)))),
    section('Duplicate candidates', fmtCount(sv.dupGroups.length), false, dupBody),
    section('Empty folders', fmtCount(sv.empty.length), false, sv.empty.length ? sv.empty.slice(0, 300).map((d) => itemButton(d, '')) : el('p', { class: 'note', text: 'None.' })),
    section('Sealed folders', fmtCount(sv.sealed.length), sv.sealed.length > 0, sv.sealed.length
      ? [el('p', { class: 'note', text: 'These could not be read, so their contents are not counted.' }), sv.sealed.slice(0, 300).map((d) => itemButton(d, d.e))]
      : el('p', { class: 'note', text: 'Every folder was readable.' })),
    section('Symbolic links', fmtCount(sv.links.length), false, sv.links.length
      ? [el('p', { class: 'note', text: 'Shown but never followed.' }), sv.links.slice(0, 300).map((f) => itemButton(f, 'link'))]
      : el('p', { class: 'note', text: 'None.' })),
  );
}

async function drawJournal(sub, host) {
  sub.replaceChildren(el('span', { class: 'grow', text: 'Changes made this session, and the holding area' }));
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
    el('details', { open: true }, el('summary', {}, 'Session changes', el('span', { class: 'n', text: fmtCount(entries.length) })),
      entries.length ? null : el('p', { class: 'note', text: ro ? 'Read-only mode: nothing can be changed.' : 'Nothing has been changed yet.' }),
      entries.some((e) => !e.undone) ? el('div', { class: 'actions' }, el('button', { class: 'btn btn-small', type: 'button', text: 'Undo latest', onclick: undo })) : null,
      entries.map((e) => el('div', { class: 'item is-static' }, el('span', { class: e.undone ? 'swatch is-empty' : 'swatch', style: e.undone ? null : { background: 'var(--verdigris)' } }),
        el('span', {}, el('span', { class: 'nm', text: e.label }), el('span', { class: 'path', text: `${fmtDate(e.at)}${e.undone ? ' · undone' : ''}` })), el('span')))),
    el('details', { open: true }, el('summary', {}, 'Holding area', el('span', { class: 'n', text: fmtCount(data.holding.length) })),
      el('p', { class: 'note', text: data.holding.length ? 'Removed items wait here, inside .terrane-trash in this directory, until restored or purged.' : 'Empty. Removed items wait here until restored or purged.' }),
      data.holding.map((h) => el('div', { class: 'item is-static' }, el('span', { class: 'swatch' }),
        el('span', {}, el('span', { class: 'nm', text: h.name }), el('span', { class: 'path', text: `from ${h.origin} · ${fmtDate(h.at)}` })),
        ro ? el('span') : el('button', { class: 'btn btn-small', type: 'button', text: 'Restore', onclick: async () => {
          try {
            const res = await post('restore', { ids: [h.id] });
            notice(res.label);
            await refreshDirs(res.affected);
          } catch (err) {
            notice(err.message, { kind: 'error' });
          }
          drawLedger();
        } }))),
      data.holding.length && !ro ? el('div', { class: 'actions' }, el('button', { class: 'btn btn-small btn-danger', type: 'button', text: 'Purge holding area…', onclick: async () => {
        const ok = await ask({ title: 'Purge the holding area?', danger: true, confirm: 'Delete permanently',
          body: `${data.holding.length} held item${data.holding.length === 1 ? '' : 's'} will be deleted from disk. This is the one action in Terrane that cannot be undone.` });
        if (!ok) return;
        try {
          notice((await post('purge')).label);
        } catch (err) {
          notice(err.message, { kind: 'error' });
        }
        drawLedger();
      } })) : null),
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

function actionButton(label, run, { off, danger, wide, title } = {}) {
  return el('button', { class: `btn${danger ? ' btn-danger' : ''}${wide ? ' wide' : ''}`, type: 'button', text: label, disabled: !!off, title: off ? `Unavailable: ${off}` : title, onclick: run });
}

function drawInspector() {
  const host = $('inspector-body');
  const ro = writable();
  if (S.sel.size > 1) {
    const nodes = [...S.sel];
    const size = tops(nodes).reduce((a, n) => a + n.s, 0);
    host.replaceChildren(
      el('div', { class: 'insp-title' }, el('div', { class: 'insp-kind', text: 'Selection' }), el('h3', { class: 'insp-name', text: `${fmtCount(nodes.length)} items` })),
      el('dl', { class: 'facts' }, fact('Size', el('b', { text: fmtBytes(size) }), ` · ${pct(size, S.model.root.s)} of root`, shareBar(size, S.model.root.s)),
        fact('Folders', fmtCount(nodes.filter((n) => n.d).length)), fact('Files', fmtCount(nodes.filter((n) => !n.d).length))),
      el('div', { class: 'section-title', text: 'Actions' }),
      el('div', { class: 'actions-grid' }, actionButton('Move to…', () => startPlacing('move'), { off: ro }), actionButton('Copy to…', () => startPlacing('copy'), { off: ro }),
        actionButton('Duplicate', () => duplicate(), { off: ro }), actionButton('Copy paths', () => copyPaths()),
        actionButton('Remove…', () => remove(), { off: ro, danger: true }), actionButton('Clear selection', () => select(null))),
    );
    return;
  }
  const node = S.primary;
  if (!node) {
    const f = S.focus;
    host.replaceChildren(
      el('div', { class: 'insp-title' }, el('div', { class: 'insp-kind', text: 'You are in' }), el('h3', { class: 'insp-name', text: f.n })),
      el('dl', { class: 'facts' }, fact('Size', el('b', { text: fmtBytes(f.s) })), fact('Contains', `${fmtCount(f.fc)} files · ${fmtCount(f.dc)} folders`), fact('Depth below', `${f.h} level${f.h === 1 ? '' : 's'}`)),
      ...composition(f),
      el('div', { class: 'section-title', text: 'Reading the world' }),
      el('ul', { class: 'reading' },
        el('li', {}, el('span', { class: 'glyph g-foot' }), el('span', {}, el('b', { text: 'Footprint is storage' }), 'Ground area is share of the parent folder.')),
        el('li', {}, el('span', { class: 'glyph g-elev' }), el('span', {}, el('b', { text: 'Elevation is nesting' }), 'Each level stands one step up, one tone lighter, and one scale smaller.')),
        el('li', {}, el('span', { class: 'glyph g-height' }), el('span', {}, el('b', { text: 'Height is recency' }), 'Fresh files stand tall; untouched ones wear down flat.')),
        el('li', {}, el('span', { class: 'glyph g-mass' }), el('span', {}, el('b', { text: 'Closed mass' }), 'A folder seen from afar. Taller means more levels inside. Approach and it opens.')),
        el('li', {}, el('span', { class: 'glyph g-scree' }), el('span', {}, el('b', { text: 'Scree' }), 'Items too small to see from here, gathered into one tile. Go closer.')),
        el('li', {}, el('span', { class: 'glyph g-seal' }), el('span', {}, el('b', { text: 'Hatched' }), 'Sealed: the folder could not be read.')),
        el('li', {}, el('span', { class: 'glyph g-empty' }), el('span', {}, el('b', { text: 'Hollow' }), 'An empty folder.')),
        el('li', {}, el('span', { class: 'glyph g-pin' }), el('span', {}, el('b', { text: 'Pin' }), 'Vermilion marks a search match; ink marks a heavyweight file.')),
      ));
    return;
  }
  const parent = node.p;
  const isRoot = !parent;
  const lockRoot = ro || (isRoot ? 'the authorized root' : null);
  const kindLine = node.d ? (node.e ? `Sealed folder · ${node.e}` : node.c.length ? 'Folder' : 'Empty folder')
    : `${KINDS[node.k].label}${extOf(node.n) ? ` · .${extOf(node.n)}` : ''}${node.f & FLAG_LINK ? ' · symbolic link' : ''}${node.f & FLAG_HIDDEN ? ' · hidden' : ''}`;
  const created = el('dd', { text: '…' });
  const linkRow = el('div', { hidden: true }, el('dt', { text: 'Points to' }), el('dd'));
  const visible = S.layout.index.has(node);
  const parts = [
    el('div', { class: 'insp-title' },
      el('div', { class: 'insp-kind' }, el('span', { class: node.d ? 'swatch is-dir' : 'swatch', style: node.d ? null : { background: cssHex(KINDS[node.k].color) } }), kindLine),
      el('h3', { class: 'insp-name', text: node.n })),
    el('div', { class: 'insp-path' }, el('code', { text: absPath(node) }), el('button', { class: 'btn btn-small', type: 'button', text: 'Copy', onclick: () => copyPaths([node]) })),
    el('dl', { class: 'facts' },
      fact('Size', el('b', { text: fmtBytes(node.s) }), node.s >= 1024 ? ` · ${fmtCount(node.s)} B` : ''),
      parent ? fact('Of parent', pct(node.s, parent.s), shareBar(node.s, parent.s)) : null,
      fact('Of root', pct(node.s, S.model.root.s), shareBar(node.s, S.model.root.s)),
      node.d ? fact('Contains', `${fmtCount(node.fc)} files · ${fmtCount(node.dc)} folders`) : null,
      node.d ? fact('Levels', `${depthOf(node)} above · ${node.h} below`) : fact('Level', String(depthOf(node))),
      fact(node.d ? 'Newest' : 'Changed', `${fmtDate(node.d ? node.mm : node.m)}`, el('br'), fmtAge(node.d ? node.mm : node.m)),
      el('div', {}, el('dt', { text: 'Created' }), created),
      linkRow,
      !visible ? fact('In the world', 'inside the framed mass or scree; fly to it to see it') : null),
  ];
  if (node.d) parts.push(...composition(node));
  if (!node.d && node.dup && S.survey) {
    const g = S.survey.dupGroups[node.dup - 1];
    if (g) {
      parts.push(el('div', { class: 'section-title', text: g.verified ? (g.mode === 'sampled' ? 'Probable copies' : 'Identical copies') : 'Same-size candidates' }));
      parts.push(el('div', {}, g.files.filter((f) => f !== node).slice(0, 8).map((f) => itemButton(f, ''))));
    }
  }
  parts.push(el('div', { class: 'section-title', text: 'Actions' }));
  parts.push(el('div', { class: 'actions-grid' },
    node.d ? actionButton('Go there', () => setFocus(node), { off: node.e ? 'cannot be read' : null })
      : actionButton('Open', () => activate(node), { title: 'Open with the system default application' }),
    actionButton('Reveal', () => runOp({ type: 'reveal', path: relPath(node) }), { title: 'Show in the system file manager' }),
    actionButton('Rename…', () => rename(node), { off: lockRoot }),
    actionButton('Duplicate', () => duplicate([node]), { off: lockRoot }),
    actionButton('Move to…', () => startPlacing('move', [node]), { off: lockRoot }),
    actionButton('Copy to…', () => startPlacing('copy', [node]), { off: lockRoot }),
    node.d ? actionButton('New folder inside…', () => newFolder(node), { off: ro || (node.e ? 'cannot be read' : null), wide: true }) : null,
    actionButton(visible ? 'Fly to it' : 'Find it in the world', () => reveal(node), { wide: true, title: 'G' }),
    actionButton('Remove…', () => remove([node]), { off: lockRoot, danger: true, wide: true })));

  const ext = extOf(node.n);
  if (!node.d && !(node.f & FLAG_LINK) && node.s > 0) {
    if (IMAGE_EXT.has(ext) && node.s < 32 * 1024 * 1024) {
      parts.push(el('div', { class: 'section-title', text: 'Preview' }), el('div', { class: 'preview' }, el('img', { src: rawUrl(node, 33554432), alt: `Preview of ${node.n}`, loading: 'lazy' })));
    } else if (node.k === 0 || node.k === 6 || TEXT_EXT.has(ext)) {
      const pre = el('pre', { text: '…' });
      parts.push(el('div', { class: 'section-title', text: node.s > 16384 ? 'Preview · first 16 KB' : 'Preview' }), el('div', { class: 'preview' }, pre));
      fetch(rawUrl(node, 16384)).then((r) => (r.ok ? r.text() : Promise.reject())).then((t) => {
        pre.textContent = t.includes('\u0000') ? 'Binary content: no text preview.' : t;
      }).catch(() => { pre.textContent = 'This file could not be read.'; });
    }
  }
  host.replaceChildren(...parts.filter(Boolean));
  host.scrollTop = 0;
  get('stat', { path: relPath(node) }).then((st) => {
    if (S.primary !== node) return;
    created.textContent = st.birthtime ? fmtDate(st.birthtime) : 'not recorded';
    if (st.link) {
      linkRow.hidden = false;
      linkRow.lastChild.textContent = st.link;
    }
  }).catch(() => { created.textContent = 'unavailable'; });
}

/* ---------- title block ---------- */

function setLens(lens) {
  S.lens = lens;
  S.kindFilter = -1;
  document.querySelectorAll('#lens button').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.lens === lens)));
  repaint();
  drawLegend();
}

function drawLegend() {
  const host = $('legend');
  if (!S.focus) return;
  const gradient = (stops) => `linear-gradient(to right, ${stops.map(cssHex).join(', ')})`;
  if (S.lens === 'kind') {
    $('legend-label').textContent = 'Kind · click to isolate';
    const kinds = KINDS.map((k, i) => ({ k, i, bytes: S.focus.ks[i] })).filter((x) => x.bytes > 0).sort((a, b) => b.bytes - a.bytes);
    host.replaceChildren(...kinds.map((x) => el('button', {
      class: 'chip', type: 'button', 'aria-pressed': String(S.kindFilter === x.i), title: `${x.k.label}: ${fmtBytes(x.bytes)} here`,
      onclick: () => {
        S.kindFilter = S.kindFilter === x.i ? -1 : x.i;
        repaint();
        drawLegend();
      },
    }, el('span', { class: 'swatch', style: { background: cssHex(x.k.color) } }), x.k.label)));
  } else if (S.lens === 'age') {
    $('legend-label').textContent = 'Last change';
    host.replaceChildren(el('div', { class: 'rampbar' }, '10 years +', el('i', { style: { background: gradient(THEME.ageRamp) } }), 'today'));
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
      groups.length ? el('button', { class: 'btn btn-small', type: 'button', text: 'Verify by content', onclick: verifyDuplicates }) : ''));
  }
}

function drawStatus() {
  if (!S.model) return;
  const r = S.model.root;
  const counts = `${fmtCount(r.dc)} folders · ${fmtCount(r.fc)} files · ${fmtBytes(r.s)}`;
  let cls = 'pulse';
  let label;
  if (S.scanning) { cls += ' is-busy'; label = 'Surveying'; }
  else if (S.watch === 'live') label = 'Live';
  else if (S.watch === 'lost') { cls += ' is-off'; label = 'Service stopped'; }
  else { cls += ' is-off'; label = 'Manual refresh'; }
  $('status-label').textContent = `${label}${S.info.readOnly ? ' · read-only' : ''}${S.layout?.coarsened ? ' · grain raised to fit' : ''}`;
  $('status').replaceChildren(el('span', { class: cls }), counts);
  $('status').title = `${fmtCount(S.layout?.n || 0)} blocks drawn`;
}

/* ====================================================================== */
/* search                                                                 */
/* ====================================================================== */

function runQuery() {
  const pred = parseQuery(S.query);
  S.search = pred ? runSearch(S.model, pred) : null;
  $('q-count').textContent = S.search ? `${fmtCount(S.search.list.length)} found` : '';
}

let queryTimer = 0;
function onQuery() {
  clearTimeout(queryTimer);
  queryTimer = setTimeout(() => {
    S.query = $('q').value;
    const had = !!S.search;
    runQuery();
    if (S.search && S.tab !== 'findings') S.tab = 'findings';
    else if (!S.search && had && S.tab === 'findings') S.tab = 'contents';
    repaint();
    drawLedger();
  }, 160);
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
  await ask({
    title: 'Guide', confirm: 'Close', cancel: false,
    body: el('div', { class: 'guide' },
      keys('Travelling', [['Wheel', 'Fly toward what is under the cursor'], ['Drag', 'Slide the ground'], ['Right-drag', 'Orbit the point you grabbed'], ['Alt+drag', 'Look around'], ['W A S D', 'Move (Shift: faster)'], ['Q  E', 'Turn'], ['R  F', 'Rise / descend'], ['V', 'Drop to eye level'], ['0', 'Rise to the overview'], ['G', 'Fly to the selection'], ['Double-click', 'Fly to folder / open file']]),
      keys('Selecting and going places', [['Click', 'Select'], ['Ctrl+click', 'Add to selection'], ['← →', 'Previous / next sibling'], ['↑ ↓', 'Parent / first child'], ['Enter', 'Go to folder / open file'], ['Backspace', 'Up one level'], ['Alt+←', 'Back'], ['/', 'Find'], ['Esc', 'Cancel, clear'], ['[  ]', 'Hide ledger / inspector'], ['1 – 4', 'Lens']]),
      keys('Changing things', [['N', 'New folder'], ['F2', 'Rename'], ['M', 'Move to…'], ['Ctrl+D', 'Duplicate'], ['Del', 'Remove to holding area'], ['Ctrl+Z', 'Undo'], ['Ctrl+C', 'Copy path'], ['Drag a row', 'Drop on a folder, breadcrumb or plateau'], ['Menu key', 'Context menu'], ['F5', 'Re-read folder']]),
    ),
  });
  dlg.classList.remove('is-wide');
}

function fatal(title, text) {
  const veil = $('veil');
  veil.replaceChildren(el('strong', { text: title }), text);
  veil.hidden = false;
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
      if (t === BOX.CAP && !node.e && node.c.length) lines.push(`${node.h + 1} level${node.h ? 's' : ''} inside · opens as you approach · double-click to go`);
      if (S.search?.within.has(node)) lines.push(`${fmtCount(S.search.within.get(node))} matches inside`);
      if (S.placing) lines.push(destinationProblem(S.placing.type, S.placing.nodes, node) ? `Cannot place here: ${destinationProblem(S.placing.type, S.placing.nodes, node)}` : 'Click to place here');
    } else {
      lines = [node.n, `${fmtBytes(node.s)} · ${KINDS[node.k].label} · changed ${fmtAge(node.m)}`];
      if (node.dup) lines.push(S.survey?.dupGroups[node.dup - 1]?.verified ? 'Has identical copies' : 'Shares its size with other files');
    }
    return tip(e.clientX, e.clientY, lines);
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
  v.on.dblclick = (i, e) => {
    if (i < 0 || S.placing) return;
    const node = S.layout.node[i];
    if (S.layout.type[i] === BOX.SCREE) S.view.zoomAt(0.25, e.clientX, e.clientY);
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
  document.querySelectorAll('.tabs [role=tab]').forEach((t) => { t.onclick = () => { S.tab = t.dataset.tab; drawLedger(); }; });
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
  $('v-over').onclick = () => S.view.overview();
  $('v-down').onclick = () => S.view.descend();
  $('v-go').onclick = () => (S.primary ? reveal(S.primary) : notice('Select something first, then fly to it.', { kind: 'info', ms: 2500 }));
  $('placing-cancel').onclick = stopPlacing;
  $('placing-here').onclick = () => S.placing && transfer(S.placing.type, S.placing.nodes, S.focus);
}

function wireKeys() {
  window.addEventListener('keydown', (e) => {
    const t = e.target;
    const typing = t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable;
    if ($('dialog').open) return;
    if (e.key === 'Escape') {
      if (floatingOpen()) closeFloating();
      else if (S.placing) stopPlacing();
      else if (typing) return;
      else if (S.kindFilter >= 0) { S.kindFilter = -1; repaint(); drawLegend(); }
      else if (S.search) clearQuery();
      else select(null);
      return;
    }
    if (typing || floatingOpen()) return;
    const ctrl = e.ctrlKey || e.metaKey;
    const inList = !!t.closest?.('.vl');
    const onCanvas = t === $('view');
    const k = e.key;
    let used = true;
    if (ctrl && k.toLowerCase() === 'z') undo();
    else if (ctrl && k.toLowerCase() === 'd') { if (!writable()) duplicate(); }
    else if (ctrl && k.toLowerCase() === 'c') { if (window.getSelection().toString()) return; copyPaths(); }
    else if (ctrl || e.altKey) {
      if (e.altKey && k === 'ArrowLeft') goBack();
      else used = false;
    } else if (k === '/') $('q').focus();
    else if (k === '?') showGuide();
    else if (k === 'F5') refreshDirs([relPath(S.focus)]);
    else if (k === 'F2') rename();
    else if (k === 'Delete') remove();
    else if (k === 'Backspace') goUp();
    else if (k === 'ContextMenu' || (e.shiftKey && k === 'F10')) {
      const i = visibleIndexOf(S.primary);
      const p = i >= 0 ? S.view.screenOf(i) : { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      menuFor(S.primary, p.x, p.y);
    } else if (k === 'Enter' && !inList && !t.closest?.('button, summary, a')) { if (S.placing && S.primary?.d) transfer(S.placing.type, S.placing.nodes, S.primary); else activate(S.primary); }
    else if (k.startsWith('Arrow') && onCanvas) stepSelection(k);
    else if (k === 'n' || k === 'N') newFolder(S.primary?.d && S.sel.size === 1 ? S.primary : S.focus);
    else if (k === 'm' || k === 'M') { if (!writable()) startPlacing('move'); else notice('Read-only mode: nothing can be moved.', { kind: 'info' }); }
    else if (k === 'g' || k === 'G') { if (S.primary) reveal(S.primary); }
    else if (k === '0' || k === 'Home') S.view.overview();
    else if (k === 'v' || k === 'V') S.view.descend();
    else if (k === '+' || k === '=') S.view.zoomAt(0.7);
    else if (k === '-' || k === '_') S.view.zoomAt(1.45);
    else if (k === '[') document.body.classList.toggle('no-ledger');
    else if (k === ']') document.body.classList.toggle('no-inspector');
    else if (k >= '1' && k <= '4') setLens(['kind', 'age', 'size', 'dup'][Number(k) - 1]);
    else used = false;
    if (used) e.preventDefault();
  });
}

async function start() {
  try {
    S.info = await get('info');
  } catch (err) {
    fatal('Not connected', err.message);
    return;
  }
  document.title = `${S.info.name} · Terrane`;
  S.model = new Model(S.info.name);
  S.focus = S.model.root;
  try {
    S.view = new Viewport({ canvas: $('view'), labelLayer: $('tags') });
  } catch (err) {
    // No WebGL: every call becomes a no-op and the ledger carries the work.
    const noop = new Proxy(function () {}, { get: (_t, p) => (p === 'on' ? {} : p === 'eye' || p === 'alt' || p === 'w' || p === 'h' ? undefined : noop), apply: () => undefined, set: () => true });
    S.view = noop;
    S.noGL = true;
    fatal('3D view unavailable', `This browser could not start WebGL (${err.message}). The ledger, inspector, search and every operation still work.`);
    $('veil').style.pointerEvents = 'none';
  }
  list = new VirtualList($('ledger-list'), {
    render: (n) => rowFor(n),
    onKey: (e, node) => {
      if (!node) return;
      if (e.key.startsWith('Arrow') || e.key.startsWith('Page') || e.key === 'Home' || e.key === 'End') select(node, { quiet: true });
      else if (e.key === 'Enter') {
        e.preventDefault();
        if (S.placing && node.d) transfer(S.placing.type, S.placing.nodes, node);
        else if (S.tab === 'findings') reveal(node);
        else activate(node);
      } else if (e.key === ' ') {
        e.preventDefault();
        select(node, { add: true });
      } else return;
      list.draw();
    },
  });
  wireViewport();
  wireControls();
  wireKeys();
  if (!S.noGL) fatal('Surveying', S.info.root);
  S.scanning = true;
  drawAll();
  const t0 = performance.now();
  try {
    await scanInto(S.model.root);
  } catch (err) {
    fatal('The survey stopped', err.message);
    return;
  }
  S.scanning = false;
  if (!S.noGL) $('veil').hidden = true;
  clearTimeout(S.layoutTimer);
  S.layoutTimer = 0;
  S.survey = S.model.survey();
  relayout();
  drawAll();
  window.__terrane = { S, list, scanMs: Math.round(performance.now() - t0) };
  if (S.model.root.e) notice(`The root could not be read: ${S.model.root.e}`, { kind: 'error' });
  connectEvents();
}

start();
