/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Region Service (Terrane Edition - v1.0)
 *     - File Name: regions.mjs
 *     - Relative Path: server/regions.mjs
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
 *     Keeps the whole directory tree in the service, in the typed columns
 *     of web/js/columns.js, and answers GET /api/tree and GET /api/region
 *     from it, so a page can hold only the folders near the eye. The tree
 *     is read from a structure snapshot or by a walk of the root, one at a
 *     time, and the old one serves until the new one is ready.
 *
 * ✒ Key Features:
 *     - State: none, loading (a snapshot), building (a walk), ready or
 *       failed with a sentence; the generation v, the progress and how
 *       long the load took
 *     - fromSnapshot: two ordered reads (folders by id, files by folder
 *       and row) merged into scanner batches of 200 folders, rows as
 *       arrays, progress every 50,000 rows, the database closed in finally
 *     - fromScan: the root walked with the scanner under the build's own
 *       AbortController, teed into the warm cache when it is kept, which
 *       commits on completion and is dropped otherwise, as a whole survey
 *       keeps it
 *     - The old tree answers until the new one is ready; then v rises and
 *       every id of the old one is stale (409 ESTALE)
 *     - One mutation at a time, on a promise chain that region reads wait
 *       for; a fresh read in live mode lists each folder again from disk
 *       (depth 1, then any new folder whole) before anything is answered
 *     - Every path a request names passes relParts; a fresh read reaches
 *       the disk only through guard.resolve and guard.assertDirInside, as
 *       GET /api/scan does, and snapshot mode reads nothing at all
 *     - The handlers parse and cap their parameters (64 ids, 100 names,
 *       50 fresh paths), answer through columns.js answer() and write JSON
 *       with no-store; mem is the process's memory in MB
 *     - loadWarm (live mode, a warm cache above the threshold): the tree
 *       is read from the cache at startup and served at once with
 *       warm.checking, then checked in place by folder modification times
 *       through the mutation chain (warm.mjs checkWarm); the folders read
 *       again go out as change events, then { type: 'checked' }; the cache
 *       is written again, and the sweep's changes follow, then { type:
 *       'swept' }. A walk (build=1) ends any check under way
 *     - handleAsk answers the whole-tree questions (find, marks, survey,
 *       sessions, places: questions.js) after any change under way; the
 *       survey is worked out before a new tree is served (prepMs), so
 *       every region carries its candidates and heavyweights from the first
 *
 * ✒ Usage Instructions:
 *     import { makeRegions } from './regions.mjs';
 *     const regions = makeRegions({ guard, snap, threshold, warmOn, version, warmWriter });
 *     regions.info({ warm })                   // { threshold, entries, v, state }
 *     if (route === 'tree') return regions.handleTree(req, res, q);
 *     if (route === 'region') return regions.handleRegion(req, res, q);
 *     regions.startLoad();                     // snapshot mode, above the threshold
 *     regions.shutdown();                      // on SIGINT: stop a build
 *
 * ✒ Examples:
 *     GET /api/tree?build=1          walk the root again (live), the newest
 *                                    snapshot again (snapshot mode)
 *     GET /api/tree?peek=1           the state and memory, starting nothing
 *     GET /api/region?v=1&ids=0,4,9&with=4:IMG_0001.jpg
 *     GET /api/region?v=1&path=Photos/2019/IMG_0001.jpg&skip=2
 *     GET /api/region?v=1&fresh=1&paths=["docs","Photos/2019"]
 *
 * ✒ Other Important Information:
 *     - Dependencies: Node.js built-ins only (node:sqlite); scan.mjs,
 *       guard.mjs, web/js/columns.js (which imports model.js, timeline.js
 *       and questions.js, and through it relations.js and fuzzy.js)
 *     - Compatible platforms: Node.js 22.5+ on Windows, macOS, Linux
 *     - Performance: about 650 to 750 MB for 5,000,000 entries; run such a
 *       service with --max-old-space-size=4096
 *     - Security: a name from the tree is never joined to a path on disk
 *       except through guard.resolve of a path that passed relParts
 * ----------------------------------------------------------------------------
 */

import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { scan } from './scan.mjs';
import { relParts, GuardError } from './guard.mjs';
import { ColumnTree, answer, REGION_THRESHOLD } from '../web/js/columns.js';
import { prepare, QUESTION_ROUTES } from '../web/js/questions.js';
import { readWarmTree, checkWarm, sweepWarm, writeWarmTree } from './warm.mjs';

const BATCH = 200;
const PROGRESS_ROWS = 50000;
const MB = 1024 * 1024;

const tick = () => new Promise((resolve) => setImmediate(resolve));

/** The process's memory, in whole MB. */
export function memMB() {
  const m = process.memoryUsage();
  return { rss: Math.round(m.rss / MB), heapUsed: Math.round(m.heapUsed / MB), external: Math.round(m.external / MB), arrayBuffers: Math.round(m.arrayBuffers / MB) };
}

/**
 * The service's tree and its two routes. guard is the live guard (null
 * in snapshot mode); snap the snapshot source and meta() its newest meta
 * (null in live mode); warmWriter(root, { version }) the warm cache's
 * writer, used when warmOn.
 */
export function makeRegions({ guard = null, snap = null, meta = null, threshold = REGION_THRESHOLD, warmOn = false, version = '', warmWriter = null } = {}) {
  let tree = null;
  let state = 'none';
  let error = null;
  let v = 1;
  let loaded = 0;
  let progress = { folders: 0, files: 0, of: null };
  let loadMs = null;
  let prepMs = null;
  let building = null;
  let ac = null;
  let chain = Promise.resolve();
  // A tree read from the warm cache, checked in place: { takenAt, checking,
  // checked: { read, changed, added, removed, dirs } | null, failed }.
  let warm = null;
  let checker = null;

  /** Runs fn after every mutation before it, and before every one after it. */
  const serial = (fn) => {
    const next = chain.then(fn);
    chain = next.catch(() => {});
    return next;
  };

  const snapMeta = () => (meta ? meta() : snap?.meta()) || null;

  /** The entries the page decides by: the snapshot's, else the warm cache's, else unknown. */
  const entriesOf = (warm) => {
    if (snap) {
      const m = snapMeta();
      return m ? m.folders + m.files : null;
    }
    return warm && Number.isFinite(warm.folders) && Number.isFinite(warm.files) ? warm.folders + warm.files : null;
  };

  /** Reads a snapshot file into a finished tree. */
  async function fromSnapshot(file, signal) {
    const db = new DatabaseSync(file, { readOnly: true });
    try {
      const m = Object.fromEntries(db.prepare('SELECT key, value FROM meta').all().map((r) => [r.key, r.value]));
      const folders = Number(m.folders) || 0;
      const files = Number(m.files) || 0;
      progress = { folders: 0, files: 0, of: folders + files || null };
      const t = new ColumnTree({ name: m.name || '', expect: { folders, files } });
      const fq = db.prepare('SELECT id, parent_id, name, mtime, error FROM folders ORDER BY id');
      fq.setReturnArrays(true);
      const xq = db.prepare('SELECT folder_id, name, size, mtime, flags FROM files ORDER BY folder_id, rowid');
      xq.setReturnArrays(true);
      const xit = xq.iterate();
      let x = xit.next();
      let batch = [];
      let nf = 0;
      let nx = 0;
      let mark = PROGRESS_ROWS;
      for (const [id, pid, name, mtime, err] of fq.iterate()) {
        const packed = [];
        while (!x.done && x.value[0] < id) x = xit.next();
        while (!x.done && x.value[0] === id) {
          const r = x.value;
          packed.push(r[1], r[2], r[3], r[4]);
          nx++;
          x = xit.next();
        }
        batch.push([id, pid === null ? -1 : pid, name, mtime, err || 0, err ? [] : packed]);
        nf++;
        if (batch.length >= BATCH) {
          t.add(batch);
          batch = [];
        }
        if (nf + nx >= mark) {
          mark = nf + nx + PROGRESS_ROWS;
          progress = { folders: nf, files: nx, of: progress.of };
          await tick();
          if (signal.aborted) throw new Error('The load was stopped.');
        }
      }
      if (batch.length) t.add(batch);
      progress = { folders: nf, files: nx, of: progress.of };
      await tick();
      return t.finish({ anchor: Date.now() });
    } finally {
      db.close();
    }
  }

  /** Walks the root into a finished tree, copied into the warm cache when it is kept. */
  async function fromScan(signal) {
    const t = new ColumnTree({ name: path.basename(guard.root) || guard.root });
    const w = warmOn && warmWriter ? warmWriter(guard.root, { version }) : null;
    let finished = false;
    let nf = 0;
    let nx = 0;
    try {
      for await (const batch of scan(guard.root, { isRoot: true, signal })) {
        t.add(batch);
        w?.push(batch);
        nf += batch.length;
        for (const r of batch) nx += r[5].length / 4;
        progress = { folders: nf, files: nx, of: null };
      }
      finished = !signal.aborted;
    } finally {
      if (w) {
        if (finished) await w.commit();
        else await w.abort();
      }
    }
    if (!finished) throw new Error('The walk was stopped.');
    return t.finish({ anchor: Date.now() });
  }

  /**
   * Reads the tree afresh: the newest snapshot, or a walk of the root.
   * One at a time; asked again while it runs, it is the same build.
   */
  function build() {
    if (building) return building;
    state = snap ? 'loading' : 'building';
    error = null;
    const t0 = Date.now();
    ac = new AbortController();
    const signal = ac.signal;
    building = (async () => {
      try {
        const next = snap ? await fromSnapshot(snap.file(), signal) : await fromScan(signal);
        if (signal.aborted) throw new Error('The build was stopped.');
        loadMs = Date.now() - t0;
        // The survey is worked out before the tree is served, so every
        // region carries its candidates and heavyweights from the first.
        const p0 = Date.now();
        prepare(next);
        prepMs = Date.now() - p0;
        await serial(() => {
          tree = next;
          if (loaded++ > 0) v++;
        });
        // A walk is checked by being one: whatever warm check ran is done with.
        checker?.abort();
        warm = null;
        state = 'ready';
      } catch (err) {
        if (signal.aborted) state = tree ? 'ready' : 'none';
        else {
          state = tree ? 'ready' : 'failed';
          error = `The tree could not be read: ${err.message}`;
        }
      } finally {
        building = null;
        ac = null;
      }
    })();
    return building;
  }

  /** The reads of a fresh request in live mode: each path through the guard, as GET /api/scan reads it. */
  const collect = async (rel, depth) => {
    const parts = relParts(rel);
    const abs = guard.resolve(parts.join('/'));
    await guard.assertDirInside(abs);
    const out = [];
    for await (const b of scan(abs, { depth, isRoot: parts.length === 0 })) for (const r of b) out.push(r);
    return out;
  };
  const readers = guard ? { depth1: (rel) => collect(rel, 1), deep: (rel) => collect(rel, Infinity) } : null;

  const ctx = (kept) => ({
    threshold, state, v, progress, loadMs, prepMs, error, mem: memMB(), warm, entries: entriesOf(kept), relParts,
  });

  /**
   * Checks the tree read from the warm cache against the disk, in place,
   * every change made through the mutation chain so region reads wait for
   * it: the folders whose modification times changed are listed again and
   * sent as change events (100 at a time), then { type: 'checked' } with
   * the counts; the cache is written from the checked tree; then the sweep
   * finds files rewritten in place, sends them as change events and ends
   * with { type: 'swept' }, writing the cache again if it read anything.
   * gate (a path, for checks): the check waits while that file exists.
   */
  async function checkInPlace(t, { broadcast, busy, gate }) {
    checker?.abort();
    const own = new AbortController();
    checker = own;
    const signal = own.signal;
    const mutate = (fn) => serial(fn);
    try {
      while (gate && fs.existsSync(gate) && !signal.aborted) await new Promise((r) => setTimeout(r, 100));
      const r = await checkWarm(guard, t, () => {}, { signal, mutate });
      if (tree !== t) return;
      const dirs = [...r.listed].filter((id) => t.has(id)).map((id) => t.relOf(id));
      for (let i = 0; i < dirs.length; i += 100) broadcast({ type: 'change', dirs: dirs.slice(i, i + 100) });
      const counts = { read: r.read, changed: r.changed, added: r.added, removed: r.removed };
      warm = { ...warm, checking: false, checked: { ...counts, dirs: dirs.slice(0, 5000), more: dirs.length > 5000 } };
      broadcast({ type: 'checked', ...counts });
      await writeWarmTree(guard.root, t, { version });
      const sw = await sweepWarm(guard, t, { skip: r.listed, onChange: (d) => broadcast({ type: 'change', dirs: d }), busy, signal, mutate });
      if (signal.aborted || tree !== t) return;
      if (sw.read) await writeWarmTree(guard.root, t, { version });
      warm = { ...warm, swept: sw };
      broadcast({ type: 'swept', folders: sw.folders, files: sw.files, changed: sw.changed });
    } catch (err) {
      if (signal.aborted || tree !== t) return;
      warm = { ...warm, checking: false, failed: `The tree from the last session could not be checked: ${err.message}` };
      broadcast({ type: 'checked', failed: warm.failed });
    } finally {
      if (checker === own) checker = null;
    }
  }

  /**
   * Live mode, a warm cache above the threshold: the tree is read from the
   * cache at startup and served at once (warm.checking), then checked in
   * place. Without a cache that reads whole, nothing is loaded and the
   * page asks for a walk (build=1) as it would.
   */
  function loadWarm(hooks) {
    if (building || !guard) return building;
    state = 'loading';
    error = null;
    const t0 = Date.now();
    ac = new AbortController();
    const signal = ac.signal;
    building = (async () => {
      let next = null;
      try {
        next = await readWarmTree(guard.root, { signal, onProgress: (p) => { progress = p; } });
        if (!next || signal.aborted) {
          state = tree ? 'ready' : 'none';
          return;
        }
        loadMs = Date.now() - t0;
        const p0 = Date.now();
        prepare(next);
        prepMs = Date.now() - p0;
        await serial(() => {
          tree = next;
          if (loaded++ > 0) v++;
        });
        warm = { takenAt: next.warmMeta.takenAt, checking: true, checked: null, failed: null };
        state = 'ready';
      } catch (err) {
        state = tree ? 'ready' : 'none';
        error = signal.aborted ? null : `The tree from the last session could not be read: ${err.message}`;
        next = null;
      } finally {
        building = null;
        ac = null;
      }
      if (next) checkInPlace(next, hooks);
    })();
    return building;
  }

  const send = (res, status, body) => {
    res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(body));
  };

  /** An answer's error as the service writes errors, with the progress of a tree still being read. */
  const refuse = (res, err) => {
    if (!Number.isInteger(err?.status)) throw err;
    send(res, err.status, {
      ok: false, code: err.code || 'EIO', message: err.message, affected: [],
      ...(err.progress !== undefined ? { progress: err.progress } : {}),
      ...(err.deepest !== undefined ? { deepest: err.deepest } : {}),
      ...(err.code === 'ESTALE' ? { v: err.v } : {}),
    });
  };

  return {
    /** What GET /api/info carries: { threshold, entries, v, state }. warm is the warm cache's meta, if any. */
    info({ warm = null } = {}) {
      return { threshold, entries: entriesOf(warm), v, state };
    },

    /** The tree as it stands, for checks in the same process. */
    get tree() {
      return tree;
    },

    /** Starts reading the tree unless it is read or being read. */
    startLoad() {
      if (state === 'none' || state === 'failed') build();
      return building;
    },

    build,
    loadWarm,

    /** The warm state of the tree, for GET /api/info and checks. */
    get warm() {
      return warm;
    },

    /**
     * GET /api/tree[?build=1]. In snapshot mode the first ask starts the
     * load; peek=1 only looks, so a measurement never starts one.
     */
    async handleTree(req, res, q) {
      if (q.get('build') === '1') build();
      else if (snap && q.get('peek') !== '1' && (state === 'none' || state === 'failed') && !tree) build();
      const r = await answer(tree, 'tree', q, ctx());
      return send(res, r.status, r.json);
    },

    /** GET /api/region: ids, a path's chain, or a fresh read. */
    async handleRegion(req, res, q) {
      const fresh = q.get('fresh') === '1';
      const run = () => answer(tree, 'region', q, { ...ctx(), readers: fresh && readers ? readers : null });
      try {
        let r;
        if (fresh && readers) r = await serial(run);
        else {
          await chain;
          r = await run();
        }
        return send(res, r.status, r.json);
      } catch (err) {
        if (err instanceof GuardError) throw err;
        return refuse(res, err);
      }
    },

    /** The whole-tree questions (find, marks, survey, sessions, places), after any change under way. */
    async handleAsk(req, res, q, route) {
      try {
        await chain;
        const r = await answer(tree, route, q, ctx());
        return send(res, r.status, r.json);
      } catch (err) {
        if (err instanceof GuardError) throw err;
        return refuse(res, err);
      }
    },

    /** The routes handleAsk answers. */
    asks: QUESTION_ROUTES,

    /** Stops a build or a check that is running; the process is about to end. */
    shutdown() {
      ac?.abort();
      checker?.abort();
    },
  };
}
