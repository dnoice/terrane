/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Working Sessions (Terrane Edition - v1.0)
 *     - File Name: relations.js
 *     - Relative Path: web/js/relations.js
 *     - Artifact Type: javascript
 *     - Version: 1.0.0
 *     - Date: 11/13/2026
 *     - Update: Friday, November 13, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Description:
 *     Relations between files that the tree does not hold: which files
 *     changed together. A working session is a run of files whose last
 *     changes follow each other with no pause longer than a gap (30
 *     minutes by default). This module finds the sessions in a tree, says
 *     what each one covers, turns one into a search predicate, and lays
 *     the route through it over a layout, so the world can draw where the
 *     work went and in what order.
 *
 * ✒ Key Features:
 *     - sessions(root): one walk and one typed-array sort over every file
 *       outside folders whose names start with a dot; sessions of two or
 *       more files, newest first, each with its files in time order
 *     - The sort packs each file's quantised time and its index into one
 *       exact double, so a Float64Array sorts natively without a compare
 *       callback; times inside a quantum are put in exact order after, and
 *       a quantum coarser than the gap (dates hundreds of millennia apart)
 *       falls back to a plain sort
 *     - Bulk: twenty or more files at twenty or more a second, the mark of
 *       an extraction, a copy or an install rather than of work by hand
 *     - runsOf(session): consecutive files in one folder, the stops of
 *       the work in order; sessionFacts(session): files, bytes, places,
 *       runs, the deepest folder holding them all, start, end, bulk
 *     - sessionPredicate(list, k): the k-th newest session's window of
 *       time as a search predicate, files under dot-folders excluded
 *     - route(L, session): each file resolved to the box that shows it,
 *       or to the mass or scree tile hiding it, memoised per folder;
 *       repeated boxes merged; at most 1,000 legs between box tops
 *     - DOM-free, so the same module runs in the browser and in Node tests
 *
 * ✒ Usage Instructions:
 *     import { sessions, sessionFacts, route } from './relations.js';
 *     const list = sessions(model.root);          // newest first
 *     const f = sessionFacts(list[0]);            // { count, places, ... }
 *     const r = route(layout, list[0]);           // { legs, count, total }
 *     view.setRelation('session', { dashed: true, lift: 0.12, arrows: true, legs: r.legs });
 *
 * ✒ Examples:
 *     sessions(root, { gapMs: 10 * 60000 })      // a tighter gap
 *     parseQuery('session:2', { prefix: { session: (v) => sessionPredicate(list, Number(v)) } })
 *     runsOf(list[0]).map((r) => r.dir.n)         // the folders, in order
 *
 * ✒ Other Important Information:
 *     - Dependencies: model.js (FLAG_HIDDEN), layout.js (BOX)
 *     - Compatible platforms: any browser with ES2022 modules; Node.js 22
 *     - Semantics: a time is a file's last modification, never its
 *       creation or arrival. A copy, a checkout or an extraction restamps
 *       files, so it reads as a session of its own. A symbolic link counts
 *       by its own time, when the link itself last changed, as a search
 *       for the window matches it
 *     - Performance: 40 to 75 ms for 400,000 files on the 16-core dev
 *       box; the walk is linear and the sort n log n with no callback
 *     - Limitations: folders are not stops of their own; a session's
 *       window is fixed when it is found, so a later change is counted at
 *       the next survey
 * ----------------------------------------------------------------------------
 */

import { FLAG_HIDDEN } from './model.js';
import { BOX } from './layout.js';

/** The longest pause inside one session: 30 minutes. */
export const GAP_MS = 30 * 60000;
/** The fewest files a session holds; a file changed alone is not one. */
export const MIN_FILES = 2;
/** A session this large, at this many files a second or more, was written at once. */
export const BULK_FILES = 20;
export const BULK_RATE = 20;
/** The most legs a route draws. */
export const MAX_LEGS = 1000;

/** Whether a node lies inside a folder whose name starts with a dot. The root never counts. */
export function underHidden(node) {
  for (let a = node.p; a && a.p; a = a.p) if (a.f & FLAG_HIDDEN) return true;
  return false;
}

/** One session from positions [from, to) of the time order. */
function makeSession(nodes, order, from, to, start, end, inOrder) {
  const files = new Array(to - from);
  let bytes = 0;
  for (let k = from; k < to; k++) {
    const f = nodes[order[k]];
    files[k - from] = f;
    bytes += f.s;
  }
  // Inside one quantum the packed order follows the walk, not the clock.
  if (!inOrder) files.sort((a, b) => a.m - b.m);
  const count = files.length;
  const bulk = count >= BULK_FILES && count / Math.max(1, (end - start) / 1000) >= BULK_RATE;
  return { start, end, files, count, bytes, bulk };
}

/**
 * Finds the working sessions under root: runs of files whose changes
 * follow each other with no pause longer than gapMs, of at least minFiles
 * files, newest first. Files inside folders whose names start with a dot
 * are left out, and so are files with no time. Each session is
 * { start, end, files (time order), count, bytes, bulk }. The array also
 * carries considered (files looked at), skipped (files left out inside
 * dot-folders) and gapMs.
 */
export function sessions(root, { gapMs = GAP_MS, minFiles = MIN_FILES } = {}) {
  const nodes = [];
  let skipped = 0;
  const stack = [root];
  while (stack.length) {
    const kids = stack.pop().c;
    for (let i = 0; i < kids.length; i++) {
      const ch = kids[i];
      if (ch.d) {
        if (ch.f & FLAG_HIDDEN) skipped += ch.fc;
        else stack.push(ch);
      } else if (ch.m > 0) nodes.push(ch);
    }
  }
  const n = nodes.length;
  const list = [];
  if (n >= Math.max(1, minFiles)) {
    const M = new Float64Array(n);
    let lo = Infinity;
    let hi = -Infinity;
    for (let i = 0; i < n; i++) {
      const m = nodes[i].m;
      M[i] = m;
      if (m < lo) lo = m;
      if (m > hi) hi = m;
    }
    // key = quantised time * 2^bits + index, an integer below 2^53, so it
    // is exact in a double and one native numeric sort orders by time.
    const bits = Math.max(1, Math.ceil(Math.log2(n)));
    const P = 2 ** bits;
    const room = 2 ** (53 - bits);
    let q = 1;
    while ((hi - lo) / q >= room) q *= 2;
    let order;
    if (q > gapMs) {
      // Times spread over hundreds of millennia (a junk date): a quantum
      // could hide a gap, so the exact order is sorted with a callback.
      order = new Uint32Array(n);
      for (let i = 0; i < n; i++) order[i] = i;
      order.sort((a, b) => M[a] - M[b]);
    } else {
      const keys = new Float64Array(n);
      for (let i = 0; i < n; i++) keys[i] = Math.floor((M[i] - lo) / q) * P + i;
      keys.sort();
      order = new Uint32Array(n);
      for (let k = 0; k < n; k++) order[k] = keys[k] % P;
    }

    let from = 0;
    let start = M[order[0]];
    let end = start;
    let inOrder = true;
    for (let k = 1; k <= n; k++) {
      const t = k < n ? M[order[k]] : Infinity;
      if (t - end > gapMs) {
        if (k - from >= minFiles) list.push(makeSession(nodes, order, from, k, start, end, inOrder));
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
  return Object.assign(list, { considered: n, skipped, gapMs });
}

/** Consecutive files in one folder, in time order: [{ dir, from, to, start, end }] (to exclusive). */
export function runsOf(session) {
  const files = Array.isArray(session) ? session : session.files;
  const out = [];
  let last = null;
  for (let k = 0; k < files.length; k++) {
    const f = files[k];
    if (last && last.dir === f.p) {
      last.to = k + 1;
      if (f.m > last.end) last.end = f.m;
    } else {
      last = { dir: f.p, from: k, to: k + 1, start: f.m, end: f.m };
      out.push(last);
    }
  }
  return out;
}

const depth = (node) => {
  let d = 0;
  for (let a = node.p; a; a = a.p) d++;
  return d;
};

/** The deepest folder holding both a and b. */
function commonOf(a, b) {
  let da = depth(a);
  let db = depth(b);
  while (da > db) { a = a.p; da--; }
  while (db > da) { b = b.p; db--; }
  while (a !== b) { a = a.p; b = b.p; }
  return a;
}

const FACTS = new WeakMap();

/**
 * What a session covers: { count, bytes, places (folders holding its
 * files), runs (stops in time order), common (the deepest folder holding
 * them all), start, end, span, bulk }. Worked out once per session.
 */
export function sessionFacts(session) {
  let f = FACTS.get(session);
  if (f) return f;
  const dirs = new Set();
  for (const x of session.files) dirs.add(x.p);
  let common = null;
  for (const d of dirs) common = common ? commonOf(common, d) : d;
  f = Object.freeze({
    count: session.count, bytes: session.bytes, places: dirs.size, runs: runsOf(session).length, common,
    start: session.start, end: session.end, span: session.end - session.start, bulk: session.bulk,
  });
  FACTS.set(session, f);
  return f;
}

/**
 * The k-th newest session (1 for the newest) as a search predicate: a
 * file changed inside its window of time, outside dot-folders. null when
 * there is no such session.
 */
export function sessionPredicate(list, k) {
  const s = Number.isInteger(k) && k > 0 ? list?.[k - 1] : null;
  if (!s) return null;
  const { start, end } = s;
  return (n) => !n.d && n.m >= start && n.m <= end && !underHidden(n);
}

/**
 * The route through a session over layout L: each file in time order is
 * resolved to the box that shows it, or to the closed mass, scree tile or
 * plateau that hides it at this level of detail (worked out once per
 * folder), consecutive files on one box are merged into one stop, and a
 * leg joins the tops of each two stops that follow each other. At most
 * maxLegs legs, the first ones; total says how many there were.
 *
 * @param L        a layout from buildLayout
 * @param session  a session, or an array of files in time order
 * @returns {{ legs: Float64Array, stops: Int32Array, at: Int32Array,
 *   count: number, total: number, truncated: boolean }} legs holds six
 *   world coordinates per leg (ax ay az bx by bz); stops the box index of
 *   each stop; at the position in the files of each stop's first file
 */
export function route(L, session, { maxLegs = MAX_LEGS } = {}) {
  const files = Array.isArray(session) ? session : session?.files || [];
  const memo = new Map();
  // The box that shows an entry of dir that has no box of its own.
  const hidden = (dir) => {
    let i = memo.get(dir);
    if (i !== undefined) return i;
    const own = L.index.get(dir);
    if (own === undefined) i = dir.p ? hidden(dir.p) : -1;
    else if (L.type[own] === BOX.DIR) {
      // An open plateau: what it does not draw one by one is in its scree.
      const si = dir._scree ? L.index.get(dir._scree) : undefined;
      i = si === undefined ? own : si;
    } else i = own;
    memo.set(dir, i);
    return i;
  };
  const stops = [];
  const at = [];
  let prev = -1;
  for (let k = 0; k < files.length; k++) {
    const f = files[k];
    let i = L.index.get(f);
    if (i === undefined) i = f.p ? hidden(f.p) : -1;
    if (i < 0 || i === prev) continue;
    stops.push(i);
    at.push(k);
    prev = i;
  }
  const total = Math.max(0, stops.length - 1);
  const cap = Number(maxLegs);
  const count = Math.min(total, cap >= 0 ? Math.floor(cap) : 0);
  const legs = new Float64Array(count * 6);
  const g = L.geo;
  for (let j = 0; j < count; j++) {
    const a = stops[j] * 6;
    const b = stops[j + 1] * 6;
    const o = j * 6;
    legs[o] = g[a]; legs[o + 1] = g[a + 1] + g[a + 4] / 2; legs[o + 2] = g[a + 2];
    legs[o + 3] = g[b]; legs[o + 4] = g[b + 1] + g[b + 4] / 2; legs[o + 5] = g[b + 2];
  }
  return { legs, stops: Int32Array.from(stops), at: Int32Array.from(at), count, total, truncated: total > count };
}
