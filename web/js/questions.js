/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Whole-Tree Questions (Terrane Edition - v1.0)
 *     - File Name: questions.js
 *     - Relative Path: web/js/questions.js
 *     - Artifact Type: javascript
 *     - Version: 1.0.0
 *     - Date: 11/14/2026
 *     - Update: Saturday, November 14, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Changelog:
 *     - 1.0.0 (11/14/2026) [dendogg + Anthropic - Claude Opus 5.5] —
 *       Initial release.
 *
 * ✒ Description:
 *     The questions that walk the whole tree, answered over the column tree
 *     (columns.js) for a page that holds only regions of it: a search, the
 *     survey and its duplicate candidates, working sessions and the
 *     palette's places. Each answer equals what the page's own model.js,
 *     relations.js and fuzzy.js give over the whole tree, order and ties
 *     included, so a person sees the same lists in either mode.
 *
 * ✒ Key Features:
 *     - find: model.js parseQuery over one flyweight per entry with its
 *       lower-cased name, plus is:benchmark (the folders named), session:N
 *       (the service's sessions) and in: (resolved as searches.js resolves
 *       it); every match counted, the first 5,000 in the order asked, ties
 *       as the page's runSearch and Findings sort leave them
 *     - The last four queries kept by qid: a hit bit per entry and a
 *       count of matches beneath every folder, for marks and regions
 *     - marks: by name, per folder held, what matches, what holds matches
 *       and how many of its children do; with dup, the survey's groups and
 *       heavyweights
 *     - survey: largest, heavyweights, empty, sealed, links and duplicate
 *       candidates exactly as Model.survey finds them, from one sort of
 *       sizes; the first 1,000 of each list sent, with its count
 *     - sessions: relations.js sessions over the columns, with their
 *       facts, a session's files, and a file's session and neighbours
 *     - places: fuzzy.js rank over every name, folders first, or over
 *       paths when the query holds a slash
 *     - The walk order every list's ties follow is the page's own (a
 *       stack, children in scan order), worked out once per change
 *     - No DOM: the service, the demo and the Node checks share it
 *
 * ✒ Usage Instructions:
 *     columns.js answer() hands the routes find, marks, survey, sessions
 *     and places to ask(tree, route, params, ctx), and decorates regions
 *     through markRegion(). A list entry travels as a ref tuple:
 *     [rel, d, s, m (mm for a folder), k, f, fc, cn, e, x or -1, pid].
 *
 * ✒ Examples:
 *     ask(tree, 'find', { q: 'ext:psd >50mb', sort: 'size', dir: '-1' }, ctx)
 *     ask(tree, 'marks', { q: 'q3', ids: '0,14,90' }, ctx)
 *     ask(tree, 'survey', {}, ctx)            // and { dupfiles: '4000' }
 *     ask(tree, 'sessions', { k: '2', files: '1000' }, ctx)
 *     ask(tree, 'places', { q: 'inv', limit: '50' }, ctx)
 *
 * ✒ Other Important Information:
 *     - Dependencies: model.js (parseQuery, flags), relations.js (the
 *       session rules), fuzzy.js (rank)
 *     - Compatible platforms: any browser with ES2022 modules; Node.js
 *       22.5+
 *     - Performance: what a change invalidates is worked out again when
 *       next asked; a search costs one predicate call per entry
 *     - Limitations: dates in a query are read on this process's clock;
 *       the twins of an open archive are not looked for at this size
 * ----------------------------------------------------------------------------
 */

import { parseQuery, FLAG_LINK, FLAG_HIDDEN } from './model.js';
import { GAP_MS, MIN_FILES, BULK_FILES, BULK_RATE } from './relations.js';
import { rank } from './fuzzy.js';

/** The most matches a find lists, and the caps of the other answers. */
export const FIND_LIMIT = 5000;
export const MARK_IDS_MAX = 1500;
export const BENCH_MAX = 200;
export const LIST_MAX = 1000;
export const DUP_FILES_MAX = 4000;
export const SESSION_ROWS = 40;
export const SESSION_FILES_MAX = 1000;
export const PLACES_MAX = 200;
const QUERY_MAX = 2000;
const QUERIES = 4;
const LARGEST = 80;
const HEAVY = 24;
const GROUPS = 400;
const GROUP_FILES = 12;
const DUP_MIN = 4096;
const STUB = 'STUB';
const REMOVED = -2;
const DOT = 46;

/** A ref tuple's fields. */
export const R_REL = 0;
export const R_D = 1;
export const R_S = 2;
export const R_M = 3;
export const R_K = 4;
export const R_F = 5;
export const R_FC = 6;
export const R_CN = 7;
export const R_E = 8;
export const R_X = 9;
export const R_PID = 10;

function failure(code, status, message, extra = {}) {
  const e = new Error(message);
  e.code = code;
  e.status = status;
  Object.assign(e, extra);
  return e;
}

const clock = () => globalThis.performance?.now?.() ?? Date.now();

/* ---------- what is worked out once per change ---------- */

const STATE = new WeakMap();
function state(tree) {
  let st = STATE.get(tree);
  if (!st) {
    st = { order: null, hid: null, survey: null, sessions: null, places: null, paths: null, queries: new Map(), seq: 0 };
    STATE.set(tree, st);
  }
  return st;
}

/**
 * The page's walk order: a stack from the root, each folder's children
 * visited in scan order (files, then folders) and its folders pushed, so
 * the last is walked first. pop holds the folders as they are walked;
 * drank and frank the place each folder and file is visited at. Every
 * list the page builds with that walk breaks its ties by it.
 */
function orderOf(tree) {
  const st = state(tree);
  if (st.order?.at === tree.edits) return st.order;
  const { F, N, kids, kid0, kidN, file0, fileN } = tree;
  const total = tree.folders;
  const pop = new Int32Array(total);
  const drank = new Uint32Array(F);
  const frank = new Uint32Array(N);
  const stack = new Int32Array(total + 1);
  let sp = 0;
  let np = 0;
  let r = 0;
  if (F) stack[sp++] = 0;
  while (sp) {
    const x = stack[--sp];
    pop[np++] = x;
    const f0 = file0[x];
    const fe = f0 + fileN[x];
    for (let j = f0; j < fe; j++) frank[j] = ++r;
    const k0 = kid0[x];
    const ke = k0 + kidN[x];
    for (let i = k0; i < ke; i++) {
      const c = kids[i];
      drank[c] = ++r;
      stack[sp++] = c;
    }
  }
  st.order = { at: tree.edits, pop: np === total ? pop : pop.subarray(0, np), drank, frank };
  return st.order;
}

/**
 * Per folder, 1 when it or a folder above it (the root aside) has a name
 * that starts with a dot: what relations.js's underHidden asks of a file
 * in it. Parents always have smaller ids than their children.
 */
function hiddenOf(tree) {
  const st = state(tree);
  if (st.hid?.at === tree.edits) return st.hid.v;
  const { F, parent, name } = tree;
  const v = new Uint8Array(F);
  for (let x = 1; x < F; x++) {
    const p = parent[x];
    if (p < 0) continue;
    v[x] = name[x].charCodeAt(0) === DOT || v[p] ? 1 : 0;
  }
  st.hid = { at: tree.edits, v };
  return v;
}

const errOf = (tree, x) => {
  const code = tree.codes[tree.err[x]];
  return code === STUB ? 0 : code;
};
const isStub = (tree, x) => tree.codes[tree.err[x]] === STUB;
const folderFlags = (tree, x) => (x !== 0 && tree.name[x].charCodeAt(0) === DOT ? FLAG_HIDDEN : 0);

/* ---------- refs ---------- */

/** Builds ref tuples, each folder's path worked out once per answer. */
function refMaker(tree) {
  const rels = new Map([[0, '']]);
  const relOf = (x) => {
    let r = rels.get(x);
    if (r === undefined) {
      const p = tree.parent[x];
      const up = relOf(p);
      r = up ? `${up}/${tree.name[x]}` : tree.name[x];
      rels.set(x, r);
    }
    return r;
  };
  return {
    relOf,
    folder: (x) => [relOf(x), 1, tree.s[x], tree.mm[x], 0, folderFlags(tree, x), tree.fc[x], tree.cn[x], errOf(tree, x), x, tree.parent[x]],
    file: (j) => {
      const dir = tree.fdir[j];
      const up = relOf(dir);
      return [up ? `${up}/${tree.fname[j]}` : tree.fname[j], 0, tree.fsize[j], tree.fmtime[j], tree.fkind[j], tree.fflags[j], 0, 0, 0, -1, dir];
    },
  };
}

/* ---------- the top of a list ---------- */

/**
 * The best `cap` of a stream of items by before(a, b) (a ranks first): a
 * binary heap with the worst at its top. Items are numbers.
 */
function topOf(cap, before) {
  const heap = new Float64Array(Math.max(1, cap));
  let n = 0;
  const swap = (i, j) => {
    const t = heap[i];
    heap[i] = heap[j];
    heap[j] = t;
  };
  // worse(i, j): the item at i ranks after the item at j.
  const worse = (i, j) => before(heap[j], heap[i]);
  return {
    push(item) {
      if (cap <= 0) return;
      if (n < cap) {
        heap[n] = item;
        for (let c = n++; c > 0;) {
          const p = (c - 1) >> 1;
          if (!worse(c, p)) break;
          swap(c, p);
          c = p;
        }
        return;
      }
      if (!before(item, heap[0])) return;
      heap[0] = item;
      for (let i = 0; ;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < n && worse(l, m)) m = l;
        if (r < n && worse(r, m)) m = r;
        if (m === i) break;
        swap(i, m);
        i = m;
      }
    },
    /** The items kept, best first. */
    sorted() {
      return Array.from(heap.subarray(0, n)).sort((a, b) => (before(a, b) ? -1 : before(b, a) ? 1 : 0));
    },
  };
}

/* ---------- the survey ---------- */

/**
 * The survey of the tree as Model.survey makes it: folders in the walk's
 * pop order (sealed, then empty), files in its visit order (links apart,
 * the rest by size, largest first and the earlier first among equals),
 * and duplicate candidates: files of 4 KB or more, not links, sharing a
 * size, grouped, the 400 that waste most, ties to the size met first.
 */
function surveyOf(tree) {
  const st = state(tree);
  if (st.survey?.at === tree.edits) return st.survey;
  const t0 = clock();
  const { pop } = orderOf(tree);
  const { fsize, fflags, file0, fileN, cn, N } = tree;
  const sealed = [];
  const empty = [];
  const links = [];
  let nSealed = 0;
  let nEmpty = 0;
  let nLinks = 0;
  let nDup = 0;
  // Visit order of each file, for the ties of the largest.
  const seq = new Uint32Array(N);
  let at = 0;
  for (let i = 0; i < pop.length; i++) {
    const x = pop[i];
    if (errOf(tree, x)) {
      if (nSealed++ < LIST_MAX) sealed.push(x);
    } else if (cn[x] === 0 && x !== 0 && !isStub(tree, x)) {
      if (nEmpty++ < LIST_MAX) empty.push(x);
    }
    const f0 = file0[x];
    for (let j = f0; j < f0 + fileN[x]; j++) {
      seq[j] = ++at;
      if (fflags[j] & FLAG_LINK) {
        if (nLinks++ < LIST_MAX) links.push(j);
      } else if (fsize[j] >= DUP_MIN) nDup++;
    }
  }
  const before = (a, b) => fsize[a] > fsize[b] || (fsize[a] === fsize[b] && seq[a] < seq[b]);
  const top = topOf(LARGEST, before);
  // Sizes of the duplicate candidates, sorted, to count the runs of each.
  const sizes = new Float64Array(nDup);
  let k = 0;
  for (let i = 0; i < pop.length; i++) {
    const x = pop[i];
    const f0 = file0[x];
    for (let j = f0; j < f0 + fileN[x]; j++) {
      if (fflags[j] & FLAG_LINK) continue;
      top.push(j);
      if (fsize[j] >= DUP_MIN) sizes[k++] = fsize[j];
    }
  }
  sizes.sort();
  // Each run's waste; the 400th largest is the line a group must reach.
  const runs = [];
  for (let i = 0; i < sizes.length;) {
    let e = i + 1;
    while (e < sizes.length && sizes[e] === sizes[i]) e++;
    if (e - i > 1) runs.push(sizes[i], e - i);
    i = e;
  }
  const wastes = new Float64Array(runs.length / 2);
  for (let i = 0; i < wastes.length; i++) wastes[i] = runs[2 * i] * (runs[2 * i + 1] - 1);
  const sortedW = wastes.slice().sort();
  const line = sortedW.length > GROUPS ? sortedW[sortedW.length - GROUPS] : -Infinity;
  const cand = new Map();
  for (let i = 0; i < wastes.length; i++) {
    if (wastes[i] >= line) cand.set(runs[2 * i], { size: runs[2 * i], count: runs[2 * i + 1], waste: wastes[i], first: Infinity, files: [] });
  }
  if (cand.size) {
    for (let i = 0; i < pop.length; i++) {
      const x = pop[i];
      const f0 = file0[x];
      for (let j = f0; j < f0 + fileN[x]; j++) {
        if (fflags[j] & FLAG_LINK || fsize[j] < DUP_MIN) continue;
        const g = cand.get(fsize[j]);
        if (!g) continue;
        if (g.first === Infinity) g.first = seq[j];
        g.files.push(j);
      }
    }
  }
  const groups = [...cand.values()].sort((a, b) => b.waste - a.waste || a.first - b.first).slice(0, GROUPS);
  const fdup = new Uint16Array(N);
  groups.forEach((g, i) => {
    for (const j of g.files) fdup[j] = i + 1;
  });
  const largest = top.sorted();
  const floor = Math.max(tree.bytes * 0.02, 1);
  const heavy = largest.slice(0, HEAVY).filter((j) => fsize[j] >= floor);
  st.survey = {
    at: tree.edits, largest, heavy, hv: new Set(heavy), sealed, empty, links, counts: { sealed: nSealed, empty: nEmpty, links: nLinks },
    groups, fdup, ms: clock() - t0,
  };
  return st.survey;
}

/** The survey cached for the tree as it is now, or null; never works one out. */
export function surveyReady(tree) {
  const s = STATE.get(tree)?.survey;
  return s && s.at === tree.edits ? s : null;
}

/* ---------- working sessions ---------- */

/**
 * relations.js sessions() over the columns: files outside dot-folders,
 * with a time, in the walk's visit order; one typed sort of packed keys;
 * runs with no pause over gapMs, of at least minFiles, newest first.
 */
function sessionsOf(tree, { gapMs = GAP_MS, minFiles = MIN_FILES } = {}) {
  const st = state(tree);
  if (st.sessions?.at === tree.edits && st.sessions.gapMs === gapMs) return st.sessions;
  const t0 = clock();
  const { pop } = orderOf(tree);
  const hid = hiddenOf(tree);
  const { fmtime, fsize, file0, fileN, parent, name, fc, F } = tree;
  let skipped = 0;
  for (let x = 1; x < F; x++) {
    const p = parent[x];
    if (p < 0 || hid[p] || name[x].charCodeAt(0) !== DOT) continue;
    skipped += fc[x];
  }
  let n = 0;
  for (let i = 0; i < pop.length; i++) {
    const x = pop[i];
    if (hid[x]) continue;
    const f0 = file0[x];
    for (let j = f0; j < f0 + fileN[x]; j++) if (fmtime[j] > 0) n++;
  }
  const nodes = new Uint32Array(n);
  n = 0;
  for (let i = 0; i < pop.length; i++) {
    const x = pop[i];
    if (hid[x]) continue;
    const f0 = file0[x];
    for (let j = f0; j < f0 + fileN[x]; j++) if (fmtime[j] > 0) nodes[n++] = j;
  }
  const list = [];
  if (n >= Math.max(1, minFiles)) {
    const M = new Float64Array(n);
    let lo = Infinity;
    let hi = -Infinity;
    for (let i = 0; i < n; i++) {
      const m = fmtime[nodes[i]];
      M[i] = m;
      if (m < lo) lo = m;
      if (m > hi) hi = m;
    }
    const bits = Math.max(1, Math.ceil(Math.log2(n)));
    const P = 2 ** bits;
    const room = 2 ** (53 - bits);
    let q = 1;
    while ((hi - lo) / q >= room) q *= 2;
    let order;
    if (q > gapMs) {
      const idx = Array.from({ length: n }, (_, i) => i);
      idx.sort((a, b) => M[a] - M[b]);
      order = Uint32Array.from(idx);
    } else {
      const keys = new Float64Array(n);
      for (let i = 0; i < n; i++) keys[i] = Math.floor((M[i] - lo) / q) * P + i;
      keys.sort();
      order = new Uint32Array(n);
      for (let k = 0; k < n; k++) order[k] = keys[k] % P;
    }
    const make = (from, to, start, end, inOrder) => {
      let files = new Uint32Array(to - from);
      let bytes = 0;
      for (let k = from; k < to; k++) {
        const j = nodes[order[k]];
        files[k - from] = j;
        bytes += fsize[j];
      }
      if (!inOrder) files = Uint32Array.from(Array.from(files).sort((a, b) => fmtime[a] - fmtime[b]));
      const count = files.length;
      const bulk = count >= BULK_FILES && count / Math.max(1, (end - start) / 1000) >= BULK_RATE;
      return { start, end, files, count, bytes, bulk, facts: null };
    };
    let from = 0;
    let start = M[order[0]];
    let end = start;
    let inOrder = true;
    for (let k = 1; k <= n; k++) {
      const t = k < n ? M[order[k]] : Infinity;
      if (t - end > gapMs) {
        if (k - from >= minFiles) list.push(make(from, k, start, end, inOrder));
        from = k;
        start = t;
        end = t;
        inOrder = true;
      } else if (t < end) {
        inOrder = false;
        if (t < start) start = t;
      } else end = t;
    }
    list.reverse();
  }
  st.sessions = { at: tree.edits, gapMs, list, considered: n, skipped, ms: clock() - t0 };
  return st.sessions;
}

/** A session's facts: places, runs, the deepest folder holding them all, as relations.js sessionFacts. */
function factsOf(tree, s) {
  if (s.facts) return s.facts;
  const dirs = new Set();
  let runs = 0;
  let last = -1;
  for (const j of s.files) {
    const d = tree.fdir[j];
    dirs.add(d);
    if (d !== last) runs++;
    last = d;
  }
  const depth = (x) => {
    let n = 0;
    for (let a = tree.parent[x]; a >= 0; a = tree.parent[a]) n++;
    return n;
  };
  let common = -1;
  let cd = 0;
  for (const d of dirs) {
    if (common < 0) {
      common = d;
      cd = depth(d);
      continue;
    }
    let a = common;
    let b = d;
    let da = cd;
    let db = depth(d);
    while (da > db) { a = tree.parent[a]; da--; }
    while (db > da) { b = tree.parent[b]; db--; }
    while (a !== b) { a = tree.parent[a]; b = tree.parent[b]; da--; }
    common = a;
    cd = da;
  }
  s.facts = { count: s.count, bytes: s.bytes, places: dirs.size, runs, common: common < 0 ? 0 : common, start: s.start, end: s.end, span: s.end - s.start, bulk: s.bulk };
  return s.facts;
}

/** The number of the session holding file j, 1 for the newest, or 0: relations.js sessionOf. */
function sessionOfFile(tree, list, j) {
  const m = tree.fmtime[j];
  if (!list.length || !(m > 0)) return 0;
  let lo = 0;
  let hi = list.length - 1;
  let at = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (list[mid].start <= m) {
      at = mid;
      hi = mid - 1;
    } else lo = mid + 1;
  }
  if (at < 0 || m > list[at].end) return 0;
  return list[at].files.includes(j) ? at + 1 : 0;
}

/** The n files of a session nearest in time to file j, in time order: relations.js nearest. */
function nearestIn(tree, files, j, n) {
  const T = tree.fmtime;
  const want = Math.max(0, Math.floor(Number(n) || 0));
  if (!files.length || !want) return { near: [], before: 0 };
  const m = T[j];
  let lo = files.indexOf(j);
  let hi;
  if (lo >= 0) hi = lo + 1;
  else {
    let a = 0;
    let b = files.length;
    while (a < b) {
      const mid = (a + b) >> 1;
      if (T[files[mid]] <= m) a = mid + 1;
      else b = mid;
    }
    lo = a;
    hi = a;
  }
  for (let got = 0; got < want && (lo > 0 || hi < files.length); got++) {
    const left = lo > 0 ? m - T[files[lo - 1]] : Infinity;
    const right = hi < files.length ? T[files[hi]] - m : Infinity;
    if (left <= right) lo--;
    else hi++;
  }
  const at = files.indexOf(j);
  const near = [];
  let before = 0;
  for (let k = lo; k < hi; k++) {
    if (files[k] === j) continue;
    near.push(files[k]);
    if (at >= 0 && k < at) before++;
  }
  return { near, before };
}

/* ---------- a search ---------- */

/** The folder a path names below base: exactly, else segment by segment in any case (searches.js folderAt). */
function folderAt(tree, base, rel) {
  const parts = rel.split('/').filter(Boolean);
  if (parts.some((p) => p === '..' || p === '.')) return -1;
  const baseRel = base ? tree.relOf(base) : '';
  const exact = tree.idOf([baseRel, ...parts].filter(Boolean).join('/'));
  if (exact >= 0) return exact;
  let dir = base;
  for (const p of parts) {
    let next = tree.kidByName(dir, p);
    if (next < 0) {
      const low = p.toLowerCase();
      const k0 = tree.kid0[dir];
      for (let i = 0; i < tree.kidN[dir]; i++) {
        const c = tree.kids[k0 + i];
        if (tree.name[c].toLowerCase() === low) {
          next = c;
          break;
        }
      }
    }
    if (next < 0) return -1;
    dir = next;
  }
  return dir;
}

/** The folders at and under id, as a mask over folder ids. */
function subtreeMask(tree, id) {
  const mask = new Uint8Array(tree.F);
  const stack = [id];
  while (stack.length) {
    const x = stack.pop();
    mask[x] = 1;
    const k0 = tree.kid0[x];
    for (let i = 0; i < tree.kidN[x]; i++) stack.push(tree.kids[k0 + i]);
  }
  return mask;
}

/**
 * Runs a query over every entry: the hit bits (folders at their ids,
 * files after them), the count of matches beneath each folder, the total
 * and the bytes of the files matched, and what in: and session: named.
 * null for an empty query. focus is the folder in: ./ starts from.
 */
function evaluate(tree, text, { focus = 0, bench = null } = {}) {
  const { F, N, parent, fdir } = tree;
  const lo = tree.lowerNames();
  const hid = hiddenOf(tree);
  let inInfo = null;
  let sess = null;
  // is:dup reads the survey's groups, as the page's reads node.dup.
  const dup = /is:dup/i.test(text) ? surveyOf(tree).fdup : surveyReady(tree)?.fdup ?? null;
  const ext = {
    is: { benchmark: (n) => !!n.d && bench !== null && bench.has(n.id) },
    prefix: {
      in: (_value, raw) => {
        const t = raw.trim();
        let id;
        if (t === '.' || t === './') id = focus;
        else if (t.startsWith('./')) id = folderAt(tree, focus, t.slice(2));
        else id = folderAt(tree, 0, t.replace(/^\/+/, ''));
        inInfo = { raw: t, id };
        if (id < 0) return () => false;
        const inside = subtreeMask(tree, id);
        return (n) => (n.d ? n.id !== id && inside[n.id] === 1 : inside[n.dir] === 1);
      },
      session: (value) => {
        const k = /^\d+$/.test(value) ? Number(value) : 0;
        const S = sessionsOf(tree);
        const s = k > 0 ? S.list[k - 1] : null;
        if (!sess) sess = { k, s: s || null, count: S.list.length };
        if (!s) return null;
        const { start, end } = s;
        return (n) => !n.d && n.m >= start && n.m <= end && hid[n.dir] === 0;
      },
    },
  };
  const pred = parseQuery(text, ext);
  if (!pred) return null;
  const hit = new Uint8Array(F + N);
  const within = new Uint32Array(F);
  let total = 0;
  let bytes = 0;
  const fw = { n: '', d: true, s: 0, m: 0, mm: 0, f: 0, k: 0, e: 0, c: { length: 0 }, dup: 0, id: 0, dir: 0 };
  for (let x = 1; x < F; x++) {
    if (parent[x] < 0) continue;
    fw.n = lo.d[x];
    fw.d = true;
    fw.s = tree.s[x];
    fw.m = tree.mtime[x];
    fw.mm = tree.mm[x];
    fw.f = tree.name[x].charCodeAt(0) === DOT ? FLAG_HIDDEN : 0;
    fw.k = undefined;
    fw.e = errOf(tree, x);
    fw.c.length = tree.cn[x];
    fw.dup = undefined;
    fw.id = x;
    fw.dir = parent[x];
    if (pred(fw)) {
      hit[x] = 1;
      total++;
    }
  }
  for (let j = 0; j < N; j++) {
    const d = fdir[j];
    if (d < 0) continue;
    fw.n = lo.f[j];
    fw.d = false;
    fw.s = tree.fsize[j];
    fw.m = tree.fmtime[j];
    fw.mm = undefined;
    fw.f = tree.fflags[j];
    fw.k = tree.fkind[j];
    fw.e = 0;
    fw.c.length = 0;
    fw.dup = dup ? dup[j] : undefined;
    fw.id = -1;
    fw.dir = d;
    if (pred(fw)) {
      hit[F + j] = 1;
      total++;
      bytes += tree.fsize[j];
      within[d]++;
    }
  }
  // Beneath each folder: children after parents in id, so one pass from the top id down.
  for (let x = F - 1; x > 0; x--) {
    const p = parent[x];
    if (p < 0) continue;
    within[p] += within[x] + hit[x];
  }
  return { hit, within, total, bytes, inInfo, sess };
}

/** A query kept by qid, worked out again when the tree changed since. */
function queryOf(tree, qid) {
  const st = state(tree);
  const Q = st.queries.get(qid);
  if (!Q) return null;
  st.queries.delete(qid);
  st.queries.set(qid, Q);
  if (Q.at !== tree.edits) {
    const focus = Q.focusRel === null ? 0 : tree.idOf(Q.focusRel) >= 0 ? tree.idOf(Q.focusRel) : tree.nearest(Q.focusRel);
    const bench = Q.benchRels ? new Set(Q.benchRels.map((r) => tree.idOf(r)).filter((x) => x >= 0)) : null;
    Object.assign(Q, evaluate(tree, Q.text, { focus, bench }), { at: tree.edits });
  }
  return Q;
}

/** Whether entry a (a folder id, or F + a file slot) comes before b in the order asked. */
function orderer(tree, key, dir) {
  const { F } = tree;
  const { drank, frank } = orderOf(tree);
  const sz = (e) => (e < F ? tree.s[e] : tree.fsize[e - F]);
  const at = (e) => (e < F ? tree.mm[e] : tree.fmtime[e - F]);
  const rk = (e) => (e < F ? drank[e] : frank[e - F]);
  if (key === 'date') {
    return (a, b) => {
      const d = (at(a) - at(b)) * dir;
      if (d) return d < 0;
      const t = sz(b) - sz(a);
      if (t) return t < 0;
      return rk(a) < rk(b);
    };
  }
  return (a, b) => {
    const d = (sz(a) - sz(b)) * dir;
    if (d) return d < 0;
    return rk(a) < rk(b);
  };
}

/* ---------- marks on regions ---------- */

/**
 * Adds to a region what the page marks with: mk for the query qid (the
 * held child folders that match or hold matches, by place, the held files
 * that match, and how many of all its children do), and, once the survey
 * is ready, dup (each held candidate's group) and hv (held heavyweights).
 */
export function markRegion(tree, qid) {
  const Q = qid ? queryOf(tree, qid) : null;
  const sv = surveyReady(tree);
  if (!Q && !sv) return null;
  return (R, files, kids) => {
    if (Q) {
      const { hit, within } = Q;
      const F = tree.F;
      const d = [];
      const f = [];
      kids.forEach((c, i) => {
        if (hit[c] || within[c]) d.push([i, within[c], hit[c]]);
      });
      files.forEach((j, i) => {
        if (hit[F + j]) f.push(i);
      });
      R.mk = { q: qid, w: within[R.id], d, f, n: childMatches(tree, Q, R.id) };
    }
    if (sv) {
      const dup = [];
      const hv = [];
      files.forEach((j, i) => {
        if (sv.fdup[j]) dup.push(i, sv.fdup[j]);
        if (sv.hv.has(j)) hv.push(i);
      });
      if (dup.length) R.dup = dup;
      if (hv.length) R.hv = hv;
    }
  };
}

/** How many of a folder's children match or hold matches. */
function childMatches(tree, Q, id) {
  const { hit, within } = Q;
  const F = tree.F;
  let n = 0;
  const f0 = tree.file0[id];
  for (let j = f0; j < f0 + tree.fileN[id]; j++) if (hit[F + j]) n++;
  const k0 = tree.kid0[id];
  for (let i = 0; i < tree.kidN[id]; i++) {
    const c = tree.kids[k0 + i];
    if (hit[c] || within[c]) n++;
  }
  return n;
}

/* ---------- the routes ---------- */

const reader = (params) => (params && typeof params.get === 'function' ? params : {
  get: (k) => (params?.[k] === undefined || params[k] === null ? null : String(params[k])),
});

/** A whole number from a parameter, between lo and hi, or def when it is absent. */
function whole(q, key, def, lo, hi) {
  const t = q.get(key);
  if (t === null || t === '') return def;
  if (!/^-?\d{1,10}$/.test(t)) throw failure('EBADREQ', 400, `${key} is a whole number.`);
  const n = Number(t);
  if (n < lo || n > hi) throw failure(n > hi ? 'ETOOMANY' : 'EBADREQ', n > hi ? 413 : 400, `${key} is at most ${hi.toLocaleString('en-US')}.`);
  return n;
}

/** A JSON list of root-relative paths, each through parts. */
function pathList(q, key, max, parts) {
  const t = q.get(key);
  if (t === null || t === '') return [];
  let list;
  try {
    list = JSON.parse(t);
  } catch {
    list = null;
  }
  if (!Array.isArray(list) || !list.every((r) => typeof r === 'string')) throw failure('EBADREQ', 400, `${key} is a list of paths.`);
  if (list.length > max) throw failure('ETOOMANY', 413, `At most ${max} paths can be named in ${key}; ${list.length} were.`);
  return list.map((r) => parts(r).join('/'));
}

function idsOf(tree, text, max) {
  const raw = String(text ?? '').split(',').filter((x) => x !== '');
  if (raw.length > max) throw failure('ETOOMANY', 413, `At most ${max.toLocaleString('en-US')} folders can be marked at once; ${raw.length.toLocaleString('en-US')} were.`);
  return raw.map((x) => {
    if (!/^\d{1,10}$/.test(x)) throw failure('EBADREQ', 400, 'A folder id is a whole number.');
    const id = Number(x);
    if (!tree.has(id)) throw failure('EBADREQ', 400, `There is no folder ${id} in this tree.`);
    return id;
  });
}

function find(tree, q, ctx) {
  const t0 = clock();
  const parts = ctx.parts;
  const text = q.get('q') ?? '';
  if (text.length > QUERY_MAX) throw failure('EBADREQ', 400, `A search holds at most ${QUERY_MAX.toLocaleString('en-US')} characters.`);
  const key = q.get('sort') === 'date' ? 'date' : 'size';
  const dir = q.get('dir') === '1' ? 1 : -1;
  const limit = whole(q, 'limit', FIND_LIMIT, 0, FIND_LIMIT);
  const focusText = q.get('focus');
  const focusRel = focusText === null ? null : parts(focusText).join('/');
  const benchRels = q.get('bench') === null ? null : pathList(q, 'bench', BENCH_MAX, parts);
  const focus = focusRel === null ? 0 : tree.idOf(focusRel) >= 0 ? tree.idOf(focusRel) : tree.nearest(focusRel);
  const bench = benchRels ? new Set(benchRels.map((r) => tree.idOf(r)).filter((x) => x >= 0)) : null;
  // The same query in another order reads the bits it kept (qid), when it still has them.
  const again = q.get('qid');
  const kept = again ? queryOf(tree, again) : null;
  const r = kept && kept.text === text ? kept : evaluate(tree, text, { focus, bench });
  if (!r) return { v: ctx.v, qid: null, total: 0, bytes: 0, hits: [], in: null, sess: null, ms: Math.round(clock() - t0) };
  let qid = r === kept ? again : null;
  if (limit > 0 && !qid) {
    const st = state(tree);
    qid = `q${++st.seq}`;
    st.queries.set(qid, { ...r, text, focusRel, benchRels, at: tree.edits });
    while (st.queries.size > QUERIES) st.queries.delete(st.queries.keys().next().value);
  }
  const hits = [];
  if (limit > 0 && r.total) {
    const top = topOf(Math.min(limit, r.total), orderer(tree, key, dir));
    const { hit } = r;
    for (let e = 0; e < hit.length; e++) if (hit[e]) top.push(e);
    const ref = refMaker(tree);
    for (const e of top.sorted()) hits.push(e < tree.F ? ref.folder(e) : ref.file(e - tree.F));
  }
  const inn = r.inInfo ? { raw: r.inInfo.raw, rel: r.inInfo.id < 0 ? null : tree.relOf(r.inInfo.id) } : null;
  let sess = null;
  if (r.sess) {
    const s = r.sess.s;
    sess = { k: r.sess.k, count: r.sess.count, facts: s ? factsJSON(tree, s, refMaker(tree)) : null };
  }
  return { v: ctx.v, qid, total: r.total, bytes: r.bytes, hits, in: inn, sess, sort: { key, dir }, ms: Math.round(clock() - t0) };
}

function marks(tree, q, ctx) {
  const qid = q.get('q');
  const Q = qid ? queryOf(tree, qid) : null;
  if (qid && !Q) throw failure('EQUERY', 404, 'That search is no longer kept here; it is run again.');
  const withDup = q.get('dup') === '1';
  const sv = withDup ? surveyOf(tree) : null;
  const ids = idsOf(tree, q.get('ids'), MARK_IDS_MAX);
  const F = tree.F;
  const out = [];
  for (const id of ids) {
    const mask = tree.heldMask(id);
    const nf = tree.fileN[id];
    const f0 = tree.file0[id];
    const k0 = tree.kid0[id];
    const m = { id };
    if (Q) {
      const { hit, within } = Q;
      const d = [];
      const f = [];
      for (let i = 0; i < nf; i++) if ((!mask || mask[i]) && hit[F + f0 + i]) f.push(tree.fname[f0 + i]);
      for (let i = 0; i < tree.kidN[id]; i++) {
        const c = tree.kids[k0 + i];
        if ((!mask || mask[nf + i]) && (hit[c] || within[c])) d.push([tree.name[c], within[c], hit[c]]);
      }
      Object.assign(m, { w: within[id], d, f, n: childMatches(tree, Q, id) });
    }
    if (sv) {
      const dup = [];
      const hv = [];
      for (let i = 0; i < nf; i++) {
        if (mask && !mask[i]) continue;
        const j = f0 + i;
        if (sv.fdup[j]) dup.push([tree.fname[j], sv.fdup[j]]);
        if (sv.hv.has(j)) hv.push(tree.fname[j]);
      }
      Object.assign(m, { dup, hv });
    }
    out.push(m);
  }
  return { v: ctx.v, q: qid, marks: out };
}

function survey(tree, q, ctx) {
  const sv = surveyOf(tree);
  const ref = refMaker(tree);
  const dupFiles = whole(q, 'dupfiles', -1, 0, DUP_FILES_MAX);
  if (dupFiles >= 0) {
    // The top groups' files, whole, until the next group would pass the cap: what Verify reads.
    const groups = [];
    let n = 0;
    for (let i = 0; i < sv.groups.length; i++) {
      const g = sv.groups[i];
      if (n + g.files.length > dupFiles) break;
      groups.push({ g: i + 1, size: g.size, files: g.files.map((j) => ref.file(j)) });
      n += g.files.length;
    }
    return { v: ctx.v, groups, files: n };
  }
  const list = (ids, count, make) => ({ count, list: ids.map(make) });
  return {
    v: ctx.v,
    largest: sv.largest.map((j) => ref.file(j)),
    heavy: sv.heavy.map((j) => ref.file(j)),
    empty: list(sv.empty, sv.counts.empty, ref.folder),
    sealed: list(sv.sealed, sv.counts.sealed, ref.folder),
    links: list(sv.links, sv.counts.links, ref.file),
    dupGroups: sv.groups.map((g) => ({ size: g.size, count: g.count, waste: g.waste, files: g.files.slice(0, GROUP_FILES).map((j) => ref.file(j)) })),
    ms: Math.round(sv.ms),
  };
}

function factsJSON(tree, s, ref) {
  const f = factsOf(tree, s);
  return { start: f.start, end: f.end, count: f.count, bytes: f.bytes, bulk: f.bulk, places: f.places, runs: f.runs, common: ref.relOf(f.common) };
}

function sessions(tree, q, ctx) {
  const S = sessionsOf(tree);
  const ref = refMaker(tree);
  const base = { v: ctx.v, gapMs: S.gapMs, considered: S.considered, skipped: S.skipped, count: S.list.length };
  const path = q.get('path');
  if (path !== null) {
    const rel = ctx.parts(path).join('/');
    const cut = rel.lastIndexOf('/');
    const dir = tree.idOf(cut < 0 ? '' : rel.slice(0, cut));
    const j = dir < 0 ? -1 : tree.fileByName(dir, cut < 0 ? rel : rel.slice(cut + 1));
    if (j < 0) throw failure('ENOENT', 404, `"${rel}" is not a file in the tree.`);
    const k = sessionOfFile(tree, S.list, j);
    if (!k) {
      const why = hiddenOf(tree)[dir] ? 'in a folder whose name starts with a dot' : !(tree.fmtime[j] > 0) ? 'its last change is not recorded' : 'changed alone';
      return { ...base, k: 0, why, facts: null, near: [], before: 0, self: ref.file(j) };
    }
    const s = S.list[k - 1];
    const { near, before } = nearestIn(tree, s.files, j, whole(q, 'near', 8, 0, 100));
    return { ...base, k, why: null, facts: factsJSON(tree, s, ref), near: near.map((x) => ref.file(x)), before, self: ref.file(j) };
  }
  if (q.get('k') !== null) {
    const k = whole(q, 'k', 0, 1, 1e9);
    const s = S.list[k - 1];
    if (!s) throw failure('ENOENT', 404, `There is no session ${k}: ${S.list.length} were found.`);
    const max = whole(q, 'files', SESSION_FILES_MAX, 0, SESSION_FILES_MAX);
    const qid = q.get('q');
    const Q = qid ? queryOf(tree, qid) : null;
    if (qid && !Q) throw failure('EQUERY', 404, 'That search is no longer kept here; it is run again.');
    const files = [];
    let total = 0;
    for (const j of s.files) {
      if (Q && !Q.hit[tree.F + j]) continue;
      total++;
      if (files.length < max) files.push(ref.file(j));
    }
    return { ...base, k, facts: factsJSON(tree, s, ref), files, total };
  }
  return {
    ...base,
    list: S.list.slice(0, SESSION_ROWS).map((s, i) => ({ k: i + 1, ...factsJSON(tree, s, ref) })),
    ms: Math.round(S.ms),
  };
}

/** Every folder (the root aside), then every file, in the walk's visit order: the palette's list. */
function placeList(tree) {
  const st = state(tree);
  if (st.places?.at === tree.edits) return st.places.list;
  const { pop } = orderOf(tree);
  const F = tree.F;
  const dirs = [];
  const files = [];
  for (let i = 0; i < pop.length; i++) {
    const x = pop[i];
    const f0 = tree.file0[x];
    for (let j = f0; j < f0 + tree.fileN[x]; j++) files.push(F + j);
    const k0 = tree.kid0[x];
    for (let k = 0; k < tree.kidN[x]; k++) dirs.push(tree.kids[k0 + k]);
  }
  const list = new Int32Array(dirs.length + files.length);
  list.set(dirs, 0);
  list.set(files, dirs.length);
  st.places = { at: tree.edits, list };
  return list;
}

function places(tree, q, ctx) {
  const t0 = clock();
  const text = (q.get('q') ?? '').trim();
  const limit = whole(q, 'limit', 50, 0, PLACES_MAX);
  if (!text) return { v: ctx.v, places: [], ms: 0 };
  const list = placeList(tree);
  const F = tree.F;
  const lo = tree.lowerNames();
  const ref = refMaker(tree);
  let key;
  let lower;
  if (text.includes('/')) {
    const path = (e) => (e < F ? ref.relOf(e) : (() => {
      const up = ref.relOf(tree.fdir[e - F]);
      return up ? `${up}/${tree.fname[e - F]}` : tree.fname[e - F];
    })());
    key = path;
    lower = (e) => path(e).toLowerCase();
  } else {
    key = (e) => (e < F ? tree.name[e] : tree.fname[e - F]);
    lower = (e) => (e < F ? lo.d[e] : lo.f[e - F]);
  }
  const got = rank(text, list, { limit, key, lower });
  return { v: ctx.v, places: got.map((r) => (r.item < F ? ref.folder(r.item) : ref.file(r.item - F))), ms: Math.round(clock() - t0) };
}

/**
 * The routes find, marks, survey, sessions and places over a tree. params
 * are URLSearchParams or a plain object; ctx carries { v, parts }. Returns
 * the answer's JSON; an error carries code, status and a sentence.
 */
export function ask(tree, route, params, ctx) {
  const q = reader(params);
  if (route === 'find') return find(tree, q, ctx);
  if (route === 'marks') return marks(tree, q, ctx);
  if (route === 'survey') return survey(tree, q, ctx);
  if (route === 'sessions') return sessions(tree, q, ctx);
  if (route === 'places') return places(tree, q, ctx);
  throw failure('EROUTE', 404, 'No such endpoint.');
}

/**
 * For checks: a kept query's hit bits (folders at their ids, files after
 * them) and the matches beneath each folder, or null.
 */
export function queryBits(tree, qid) {
  const Q = queryOf(tree, qid);
  return Q ? { hit: Q.hit, within: Q.within, F: tree.F } : null;
}

/** Works out the survey ahead of the first ask, so regions carry its marks at once. */
export function prepare(tree) {
  surveyOf(tree);
}

export const QUESTION_ROUTES = Object.freeze(['find', 'marks', 'survey', 'sessions', 'places']);
