/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Region Client (Terrane Edition - v1.0)
 *     - File Name: regions.js
 *     - Relative Path: web/js/regions.js
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
 *     The page's side of region mode: it keeps a partial Model filled with
 *     the regions the service sends, asks for more as the layout wants to
 *     open folders, finds any path by asking for the chain of regions down
 *     to it, reads changed folders again, and lets regions go under a
 *     budget of held entries. It holds no DOM and takes its transport as a
 *     function, so the page, the demo and the Node checks run it alike.
 *
 * ✒ Key Features:
 *     - decode(json): a region answer as columns (names, errors and one
 *       Float64Array of folder figures per region; file names, sizes,
 *       dates and flags), the same in a worker and on the main thread
 *     - open(): polls GET /api/tree until the tree is ready, makes the
 *       root from its record and loads the root's region
 *     - want(list): the layout's wants, highest priority first, at most
 *       two requests in flight, each of at most 64 folders and 40,000
 *       expected entries; prefetch stops once the floor is reached
 *     - ensure(dir), resolve(rel), resolveAll, resolveRef and nearest:
 *       a folder's children held before a feature acts on them, and any
 *       path made a node, a file in a folder's tail included
 *     - One region ingested per task, each inside a terrane:region
 *       measure, so no task builds more than one region's nodes
 *     - refresh(rels): folders read again with fresh=1, held ones filled
 *       again with their nodes kept, ancestors given their new figures
 *     - evict(pins, open): the least recently opened held folders that
 *       are neither pinned nor open in the layout are let go, deepest
 *       first, until the entries held are at the floor
 *     - A stale generation (409 ESTALE) stops every request and calls
 *       onStale once, so no answer of an old tree lands in a new model
 *     - ages: a RegionAges over the rows every folder carries
 *
 * ✒ Usage Instructions:
 *     const R = createRegions({ fetchJSON, model, onStale, onLanded });
 *     await R.open({ build: false, onProgress: (tree) => {} });
 *     R.want(layout.want);                 // after every layout
 *     const dir = await R.ensure(folder);  // its children are held
 *     const node = await R.resolve('Photos/2019/IMG_0001.jpg');
 *     fetchJSON(route, params) resolves to decode(answer) for 'region'
 *     and to the answer itself for 'tree'; an error carries code, status.
 *
 * ✒ Examples:
 *     R.stats              // { requests, ms, bytes, held, regions, dropped, idle }
 *     R.budget = 400; R.floor = 300;      // a small budget, for checks
 *     R.evict(pins, open)  // regions dropped
 *     await R.refresh(['docs'])           // { dirs: Set of folders read again }
 *     R.nearest('a/b/c')   // the deepest node held on the path
 *
 * ✒ Other Important Information:
 *     - Dependencies: model.js (kids, dirFrom, depthOf, relPath, the D
 *       layout), timeline.js (RegionAges)
 *     - Compatible platforms: any browser with ES2022 modules, in a
 *       module worker too; Node.js 22.5+ for the checks
 *     - Performance: a node per held entry and nothing per entry not
 *       held; 200,000 entries held by default (REGION_BUDGET)
 *     - Limitations: nodes of a dropped region are not reused; a feature
 *       that keeps a node pins its folder (app.js regionPins) or keeps a
 *       path and resolves it again
 * ----------------------------------------------------------------------------
 */

import { D_ID, D_NAME, D_ERR, D_LEN, kids, dirFrom, depthOf, relPath } from './model.js';
import { RegionAges } from './timeline.js';

/** The entries held before regions are let go, and the floor they are let go to. */
export const REGION_BUDGET = 200000;
export const REGION_FLOOR = 150000;
const IN_FLIGHT = 2;
const BATCH_IDS = 64;
const BATCH_ENTRIES = 40000;
const FRESH_MAX = 50;
const POLL_MS = 250;
const MS_KEPT = 200;

/* ---------- decoding ---------- */

/** Folder records D as columns: names, errors, ids and one Float64Array of every figure. */
function decodeDirs(list) {
  const n = list.length;
  const names = new Array(n);
  const errs = new Array(n);
  const ids = new Int32Array(n);
  const figs = new Float64Array(n * D_LEN);
  for (let i = 0; i < n; i++) {
    const D = list[i];
    names[i] = String(D[D_NAME]);
    errs[i] = D[D_ERR] || 0;
    ids[i] = D[D_ID];
    const o = i * D_LEN;
    for (let k = 0; k < D_LEN; k++) if (k !== D_NAME && k !== D_ERR) figs[o + k] = D[k];
  }
  return { names, errs, ids, figs };
}

/** Packed files (name, size, mtime, flags, ...) as columns. */
function decodeFiles(f) {
  const n = f.length / 4;
  const names = new Array(n);
  const size = new Float64Array(n);
  const mtime = new Float64Array(n);
  const flags = new Uint8Array(n);
  for (let i = 0, j = 0; i < n; i++, j += 4) {
    names[i] = String(f[j]);
    size[i] = f[j + 1];
    mtime[i] = f[j + 2];
    flags[i] = f[j + 3];
  }
  return { names, size, mtime, flags };
}

/**
 * A region answer as columns: { v, anchor, regions: [{ id, n, tail,
 * dirs, files }], more, target, up, gone }. dirs[0] is the folder itself,
 * then the child folders held; files are the child files held; both in
 * the order the service sent them. up is the ancestors of a fresh read.
 */
export function decode(json) {
  return {
    v: json.v ?? null,
    anchor: json.anchor ?? null,
    regions: (json.regions || []).map((R) => ({
      id: R.id, n: R.n, tail: R.tail || null, dirs: decodeDirs([R.self, ...R.d]), files: decodeFiles(R.f || []),
    })),
    more: json.more || [],
    target: json.target || null,
    up: json.up ? decodeDirs(json.up) : null,
    gone: json.gone || [],
  };
}

/** The buffers of a decoded answer, for postMessage to transfer instead of copy. */
export function transferables(out) {
  const list = [];
  for (const R of out.regions) list.push(R.dirs.ids.buffer, R.dirs.figs.buffer, R.files.size.buffer, R.files.mtime.buffer, R.files.flags.buffer);
  if (out.up) list.push(out.up.ids.buffer, out.up.figs.buffer);
  return list;
}

/* ---------- tasks ---------- */

/** A task of its own for fn: setImmediate in Node, a MessageChannel message in a browser. */
function poster(fn) {
  if (typeof setImmediate === 'function') return () => setImmediate(fn);
  if (typeof MessageChannel === 'function') {
    const ch = new MessageChannel();
    ch.port1.onmessage = fn;
    return () => ch.port2.postMessage(0);
  }
  return () => setTimeout(fn, 0);
}

const clock = () => globalThis.performance?.now?.() ?? Date.now();

/** A terrane:* measure from t0 to now, for a trace; the buffer is cleared so it never grows. */
export function measure(name, t0) {
  try {
    performance.measure(name, { start: t0 });
    performance.clearMeasures(name);
  } catch { /* no user timing here */ }
}

/* ---------- the client ---------- */

/**
 * The region client. fetchJSON(route, params) is the transport: 'tree'
 * answers as the service writes it, 'region' as decode() gives it, and an
 * error carries code and status. model is the Model it fills (made with
 * { regions: true }). onStale() runs once when the tree's generation
 * changed under it; onLanded() after each batch of regions is in.
 */
export function createRegions({ fetchJSON, model, onStale = () => {}, onLanded = () => {} } = {}) {
  const M = model;
  let v = null;
  let entries = null;
  let stale = false;
  let closed = false;
  // Every folder node the model holds, by its service id; a node of a
  // dropped region is no longer here, which is how it is known as gone.
  const byId = new Map();
  // Folders whose children are held, and how many entries are held: the
  // root and every held child.
  const heldSet = new Set();
  let held = 0;
  let tick = 0;
  const queue = new Map();
  const flying = new Map();
  const waiters = new Map();
  let flights = 0;
  const stats = { requests: 0, ms: [], bytes: 0, dropped: 0 };

  const tasks = [];
  let posted = false;
  const runTask = () => {
    posted = false;
    const t = tasks.shift();
    if (tasks.length) {
      posted = true;
      post();
    }
    if (!t) return;
    try {
      t.resolve(t.fn());
    } catch (err) {
      t.reject(err);
    }
  };
  const post = poster(runTask);
  /** Runs fn in a task of its own, after those already waiting. */
  const schedule = (fn) => new Promise((resolve, reject) => {
    tasks.push({ fn, resolve, reject });
    if (!posted) {
      posted = true;
      post();
    }
  });

  const live = (node) => !!node && node.x !== undefined && byId.get(node.x) === node;

  const settle = (id, value) => {
    const list = waiters.get(id);
    if (!list) return;
    waiters.delete(id);
    for (const w of list) w.resolve(value);
  };

  /** Forgets a folder node and everything held beneath it. */
  function forget(node) {
    const stack = [node];
    while (stack.length) {
      const d = stack.pop();
      if (byId.get(d.x) === d) byId.delete(d.x);
      if (heldSet.delete(d)) held -= d.c.length;
      if (d.u) continue;
      for (const ch of d.c) if (ch.d) stack.push(ch);
    }
  }

  /** Fills node from R, or fills it again when it is held; null when it is no longer in the model. */
  function apply(node, R) {
    if (stale || closed || !live(node) || node.x !== R.id) return null;
    const t0 = clock();
    if (node.u) {
      M.fillRegion(node, R);
      held += node.c.length;
    } else {
      const before = node.c.length;
      const { removed } = M.refillRegion(node, R);
      for (const r of removed) if (r.d) forget(r);
      held += node.c.length - before;
    }
    for (const ch of node.c) if (ch.d) byId.set(ch.x, ch);
    heldSet.add(node);
    node._t = ++tick;
    measure('terrane:region', t0);
    return node;
  }

  function goStale() {
    if (stale || closed) return;
    stale = true;
    queue.clear();
    for (const id of [...waiters.keys()]) settle(id, null);
    onStale();
  }

  function failed(err, ids) {
    if (err?.code === 'ESTALE') {
      goStale();
      return;
    }
    for (const id of ids) {
      const list = waiters.get(id);
      if (!list) continue;
      waiters.delete(id);
      for (const w of list) w.reject(err);
    }
    if (!closed) console.error('A region request failed:', err);
  }

  async function request(items) {
    const ids = items.map((it) => it.node.x);
    for (const it of items) flying.set(it.node.x, it);
    flights++;
    stats.requests++;
    const t0 = clock();
    let ans;
    try {
      ans = await fetchJSON('region', { v: String(v), ids: ids.join(',') });
    } catch (err) {
      for (const id of ids) flying.delete(id);
      flights--;
      failed(err, ids);
      pump();
      return;
    }
    flights--;
    stats.ms.push(clock() - t0);
    if (stats.ms.length > MS_KEPT) stats.ms.shift();
    stats.bytes += ans.bytes || 0;
    if (ans.v !== v) {
      for (const id of ids) flying.delete(id);
      goStale();
      return;
    }
    const landed = ans.regions.map((R) => schedule(() => {
      const it = flying.get(R.id);
      flying.delete(R.id);
      const node = it ? apply(it.node, R) : null;
      settle(R.id, node);
      return node;
    }));
    for (const id of ans.more) {
      const it = flying.get(id);
      flying.delete(id);
      if (it && live(it.node) && it.node.u) queue.set(id, it);
      else settle(id, null);
    }
    pump();
    await Promise.allSettled(landed);
    if (!stale && !closed) onLanded();
    pump();
  }

  function pump() {
    if (stale || closed || v === null) return;
    while (flights < IN_FLIGHT && queue.size) {
      const items = [...queue.values()].sort((a, b) => b.pri - a.pri);
      const batch = [];
      let expect = 0;
      for (const it of items) {
        if (!live(it.node) || !it.node.u || flying.has(it.node.x)) {
          queue.delete(it.node.x);
          if (!live(it.node) || !it.node.u) settle(it.node.x, live(it.node) ? it.node : null);
          continue;
        }
        const e = 1 + kids(it.node);
        if (batch.length && (batch.length >= BATCH_IDS || expect + e > BATCH_ENTRIES)) break;
        batch.push(it);
        expect += e;
      }
      if (!batch.length) break;
      for (const it of batch) queue.delete(it.node.x);
      request(batch);
    }
  }

  /** The child of node called name: a folder, or a file too when it is the path's last link. */
  const childNamed = (node, name, last) => {
    for (const ch of node.c) if (ch.n === name && (ch.d || last)) return ch;
    return null;
  };

  async function resolveOnce(rel) {
    const parts = String(rel ?? '').split('/').filter(Boolean);
    let node = M.root;
    let i = 0;
    for (; i < parts.length; i++) {
      if (!node.d || node.u) break;
      const next = childNamed(node, parts[i], i === parts.length - 1);
      if (!next) break;
      node = next;
    }
    if (i === parts.length) {
      if (node.d) node._t = ++tick;
      return node;
    }
    if (!node.d || !live(node)) return null;
    const at = v;
    let ans;
    try {
      ans = await fetchJSON('region', { v: String(v), path: parts.join('/'), skip: String(i) });
    } catch (err) {
      if (err?.code === 'ESTALE') {
        goStale();
        return null;
      }
      if (err?.status === 404 || err?.code === 'ENOENT') return null;
      throw err;
    }
    if (v !== at || stale || closed) return null;
    let cur = node;
    for (let j = 0; j < ans.regions.length; j++) {
      const R = ans.regions[j];
      const target = cur;
      const got = await schedule(() => apply(target, R));
      if (!got) return undefined;
      if (j + 1 < ans.regions.length) {
        cur = childNamed(cur, parts[i + j], false);
        if (!cur) return undefined;
      }
    }
    const t = ans.target;
    if (!t || t.dir) return cur;
    const file = cur.c.find((ch) => !ch.d && ch.n === t.name);
    return file ?? null;
  }

  const client = {
    budget: REGION_BUDGET,
    floor: REGION_FLOOR,
    /** RegionAges over the tree's rows, once open. */
    ages: null,
    get model() {
      return M;
    },
    get v() {
      return v;
    },
    get entries() {
      return entries;
    },
    get held() {
      return held;
    },
    get stats() {
      return {
        requests: stats.requests, ms: stats.ms.slice(), bytes: stats.bytes, held, regions: heldSet.size, dropped: stats.dropped,
        idle: flights === 0 && queue.size === 0 && flying.size === 0 && tasks.length === 0,
      };
    },
    live,

    /**
     * Waits for the service's tree, polling GET /api/tree, then makes the
     * root and loads its region. build asks the service to read the tree
     * afresh (Rescan all, or the switch from a whole survey); onProgress
     * hears every answer while it reads. Resolves to the tree's answer.
     */
    async open({ build = false, onProgress = null } = {}) {
      let info = await fetchJSON('tree', build ? { build: '1' } : {});
      if (!build && info.state === 'none') info = await fetchJSON('tree', { build: '1' });
      while (info.state === 'loading' || info.state === 'building' || info.state === 'none') {
        onProgress?.(info);
        await new Promise((r) => setTimeout(r, POLL_MS));
        if (closed) throw new Error('The region client was closed.');
        info = await fetchJSON('tree', {});
      }
      if (info.state !== 'ready' || !info.root) throw new Error(info.error || 'The directory\'s tree could not be read.');
      onProgress?.(info);
      v = info.v;
      entries = info.entries;
      client.ages = new RegionAges(info.anchor);
      const root = dirFrom(info.root, null, M.root.n);
      M.root = root;
      byId.clear();
      heldSet.clear();
      byId.set(root.x, root);
      held = 1;
      await client.ensure(root);
      return info;
    },

    /** Takes the layout's wants ({ node, pri }): they replace the wants still queued, and are asked for in order. */
    want(list) {
      if (stale || closed) return;
      for (const [id, it] of queue) if (!it.ensure) queue.delete(id);
      const prefetch = held < client.floor;
      for (const { node, pri } of list || []) {
        if (!node.u || !live(node) || flying.has(node.x)) continue;
        if (pri <= 1 && !prefetch) continue;
        const had = queue.get(node.x);
        if (!had || had.pri < pri) queue.set(node.x, { node, pri, ensure: had?.ensure || false });
      }
      pump();
    },

    /**
     * Resolves to dir once its children are held (at once when they are):
     * dir itself, or the node found again by its path when dir belonged to
     * a region let go since; null when it is gone. A node that is not a
     * region's (inside an open archive) resolves to itself.
     */
    ensure(dir) {
      if (!dir || !dir.d || dir.x === undefined) return Promise.resolve(dir ?? null);
      if (stale || closed) return Promise.resolve(null);
      if (!live(dir)) return client.resolve(relPath(dir));
      if (!dir.u) {
        dir._t = ++tick;
        return Promise.resolve(dir);
      }
      return new Promise((resolve, reject) => {
        const list = waiters.get(dir.x) || [];
        list.push({ resolve, reject });
        waiters.set(dir.x, list);
        if (!flying.has(dir.x)) queue.set(dir.x, { node: dir, pri: Infinity, ensure: true });
        pump();
      });
    },

    /**
     * The node at a root-relative path, its chain of folders held: walked
     * through what is held, and asked of the service (path, skip) from the
     * first folder not held, or whose next link it does not hold. null
     * when the path is not in the tree.
     */
    async resolve(rel) {
      if (stale || closed) return null;
      for (let attempt = 0; attempt < 3; attempt++) {
        const got = await resolveOnce(rel);
        // undefined: a region on the way was let go meanwhile; again.
        if (got !== undefined) return got;
      }
      return null;
    },

    async resolveAll(rels) {
      const out = [];
      for (const rel of rels) out.push(rel === null || rel === undefined ? null : await client.resolve(rel));
      return out;
    },

    /** A ref's node (resolve of its path); a node is itself. */
    resolveRef(ref) {
      if (!ref?.ref) return Promise.resolve(ref ?? null);
      return client.resolve(ref.rel);
    },

    /** The deepest node held on a path, the root at least. Synchronous. */
    nearest(rel) {
      const parts = String(rel ?? '').split('/').filter(Boolean);
      let node = M.root;
      for (let i = 0; i < parts.length; i++) {
        if (!node.d || node.u) break;
        const next = childNamed(node, parts[i], i === parts.length - 1);
        if (!next) break;
        node = next;
      }
      return node;
    },

    /**
     * Reads folders again (fresh=1, 50 at a time): a held one is filled
     * again with its nodes kept, one not held takes its new figures, and
     * every ancestor whose figures changed takes them. A folder gone was
     * read through its parent by the service, whose region drops it.
     * Resolves to { dirs: the held folders filled again }.
     */
    async refresh(rels) {
      const dirs = new Set();
      if (stale || closed || !rels?.length) return { dirs };
      for (let i = 0; i < rels.length; i += FRESH_MAX) {
        const chunk = rels.slice(i, i + FRESH_MAX);
        let ans;
        try {
          ans = await fetchJSON('region', { v: String(v), fresh: '1', paths: JSON.stringify(chunk) });
        } catch (err) {
          if (err?.code === 'ESTALE') {
            goStale();
            return { dirs, stale: true };
          }
          throw err;
        }
        if (ans.v !== v) {
          goStale();
          return { dirs, stale: true };
        }
        for (const R of ans.regions) {
          const node = byId.get(R.id);
          if (!node) continue;
          if (node.u) {
            M.setFigures(node, R.dirs.figs, 0, R.dirs.errs[0]);
            continue;
          }
          const got = await schedule(() => apply(node, R));
          if (got) dirs.add(got);
        }
        const up = ans.up;
        if (up) {
          for (let j = 0; j < up.names.length; j++) {
            const node = byId.get(up.ids[j]);
            if (node) M.setFigures(node, up.figs, j * D_LEN, up.errs[j]);
          }
        }
      }
      return { dirs };
    },

    /**
     * Lets regions go until no more than floor entries are held: the held
     * folders neither in pins nor in open (folders standing open in the
     * layout), least recently opened first, the deeper first among equals,
     * each with everything held beneath it. Returns the regions let go.
     */
    evict(pins, open) {
      if (held <= client.floor) return 0;
      const cand = [];
      for (const n of heldSet) if (n !== M.root && !pins.has(n) && !open.has(n)) cand.push(n);
      const depth = new Map(cand.map((n) => [n, depthOf(n)]));
      cand.sort((a, b) => a._t - b._t || depth.get(b) - depth.get(a));
      let dropped = 0;
      for (const d of cand) {
        if (held <= client.floor) break;
        if (d.u || !live(d)) continue;
        const old = d.c;
        const beneath = M.dropRegion(d);
        held -= old.length;
        heldSet.delete(d);
        for (const ch of old) if (ch.d && byId.get(ch.x) === ch) byId.delete(ch.x);
        for (const h of beneath) {
          if (heldSet.delete(h)) held -= h.c.length;
          for (const ch of h.c) if (ch.d && byId.get(ch.x) === ch) byId.delete(ch.x);
        }
        dropped += 1 + beneath.length;
      }
      stats.dropped += dropped;
      return dropped;
    },

    /** Stops every request; late answers are ignored. */
    close() {
      closed = true;
      queue.clear();
      for (const id of [...waiters.keys()]) settle(id, null);
    },
  };
  return client;
}
