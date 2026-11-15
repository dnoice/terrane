/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Region Service (Terrane Edition - v1.1)
 *     - File Name: regions.mjs
 *     - Relative Path: server/regions.mjs
 *     - Artifact Type: javascript
 *     - Version: 1.1.0
 *     - Date: 11/15/2026
 *     - Update: Sunday, November 15, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Changelog:
 *     - 1.1.0 (11/15/2026) [dendogg + Anthropic - Claude Opus 5.5] —
 *       handleAsk answers the Cleanup tab's question, cleanup, too: it
 *       comes with questions.js's routes, behind the same checks.
 *     - 1.0.0 (11/14/2026) [dendogg + Anthropic - Claude Opus 5.5] —
 *       Initial release. After the review: the watcher's changes are read
 *       into the tree whether or not a page listens (applyChanges), one
 *       folder at a time, and announced as kept; a page arriving while the
 *       disk is not watched has the tree checked by folder times
 *       (recheck); the survey of a changed tree is answered stale between
 *       workings, at most an eighth of the time; questions wait for the
 *       region answers already asked.
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
 *       sessions, places, cleanup: questions.js) after any change under way and the
 *       region answers already asked; the survey is worked out before a
 *       new tree is served (prepMs), so every region carries its
 *       candidates and heavyweights from the first; once the tree changes
 *       it is worked out again at most once in SURVEY_DUTY times its last
 *       length, the last one answered meanwhile with stale and retry
 *     - applyChanges(dirs): the watcher's changes read into the tree
 *       served, listening page or not, one folder per step of the
 *       mutation chain (refreshFrom), those seen during a walk read into
 *       the new tree too, and announced through onApplied in batches of
 *       300; checkInPlace's change events say kept as well
 *     - recheck(): a page arriving while the disk is not watched has the
 *       tree checked by folder modification times, as a whole survey would
 *       read it again, at most once in ten seconds
 *
 * ✒ Usage Instructions:
 *     import { makeRegions } from './regions.mjs';
 *     const regions = makeRegions({ guard, snap, threshold, warmOn, version, warmWriter, onApplied });
 *     if (!regions.applyChanges(dirs)) broadcast({ type: 'change', dirs });
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
 *     GET /api/region?v=1&fresh=1&kept=1&paths=["docs"]&with=14:a.txt
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
import { ColumnTree, answer, refreshFrom, REGION_THRESHOLD } from '../web/js/columns.js';
import { prepare, surveyReady, QUESTION_ROUTES } from '../web/js/questions.js';
import { readWarmTree, checkWarm, sweepWarm, writeWarmTree } from './warm.mjs';

const BATCH = 200;
const PROGRESS_ROWS = 50000;
const MB = 1024 * 1024;
/** Folders a change event names at most; a larger set goes out in several. */
const EVENT_DIRS = 300;
/**
 * The survey is worked out again at most once in this many times the
 * time it last took (an eighth of the service's time at most), and never
 * sooner than SURVEY_MIN_MS after the last; meanwhile the last one is
 * answered, marked stale, with when to ask again.
 */
const SURVEY_DUTY = 8;
const SURVEY_MIN_MS = 1000;
/** A check of the tree by folder times, run again on a page's arrival while the disk is not watched, at most this often. */
const RECHECK_MIN_MS = 10000;

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
export function makeRegions({ guard = null, snap = null, meta = null, threshold = REGION_THRESHOLD, warmOn = false, version = '', warmWriter = null, onApplied = () => {} } = {}) {
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
  // Changes the watcher saw, read into the tree one folder at a time
  // (applyChanges): the folders waiting, the run that reads them, what it
  // read and has yet to announce, and those seen while a new tree was
  // being read, which are read into that tree too once it is in.
  const pendingApply = new Set();
  let applying = null;
  let appliedOut = [];
  let seenWhileBuilding = null;
  // The last survey answered, for the stale answer between two workings.
  let lastSurvey = null;
  // Region requests being answered: a whole-tree question waits for them.
  let regionBusy = 0;
  // The last check of the tree run when a page arrived unwatched.
  let lastRecheck = { at: 0, ms: 0 };

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
    seenWhileBuilding = guard ? new Set() : null;
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
        lastSurvey = null;
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
        // What changed while the walk ran may have been walked before it
        // changed: it is read again into whichever tree is served now.
        const seen = seenWhileBuilding;
        seenWhileBuilding = null;
        if (seen?.size) applyChanges([...seen]);
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

  /** Announces the folders read into the tree, EVENT_DIRS at a time. */
  const announce = (dirs) => {
    for (let i = 0; i < dirs.length; i += EVENT_DIRS) onApplied(dirs.slice(i, i + EVENT_DIRS));
  };

  /**
   * Reads every folder waiting into the tree served, one at a time through
   * the mutation chain, so region answers wait for at most one folder; a
   * folder gone is read through its parent (refreshFrom), one that cannot
   * be read now is left as it is. What was read is announced in batches.
   */
  async function drain() {
    while (pendingApply.size) {
      if (building) {
        await building;
        continue;
      }
      const t = tree;
      if (!t) {
        pendingApply.clear();
        break;
      }
      const rel = pendingApply.values().next().value;
      pendingApply.delete(rel);
      try {
        const clean = relParts(rel).join('/');
        await serial(async () => {
          if (tree === t) await refreshFrom(t, clean, readers.depth1, readers.deep);
        });
        appliedOut.push(rel);
      } catch { /* refused by the guard, or unreadable now: left as it is */ }
      if (appliedOut.length >= EVENT_DIRS || !pendingApply.size) {
        const out = appliedOut;
        appliedOut = [];
        announce(out);
      }
      await tick();
    }
    if (appliedOut.length) {
      const out = appliedOut;
      appliedOut = [];
      announce(out);
    }
  }

  /**
   * The watcher's changes, while a tree is kept here (live mode): each
   * folder is read into the tree whether or not a page is listening, and
   * announced through onApplied once it is in, so a page only asks for
   * what the tree now says (kept=1). False when there is no tree to keep
   * up (the page reads changes itself).
   */
  function applyChanges(dirs) {
    if (!guard || (!tree && !building)) return false;
    for (const d of dirs) {
      pendingApply.add(String(d));
      seenWhileBuilding?.add(String(d));
    }
    if (!applying) applying = drain().finally(() => { applying = null; });
    return true;
  }

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
      // Already read into the tree: a page asks for them with kept=1.
      const dirs = [...r.listed].filter((id) => t.has(id)).map((id) => t.relOf(id));
      for (let i = 0; i < dirs.length; i += 100) broadcast({ type: 'change', dirs: dirs.slice(i, i + 100), kept: true });
      const counts = { read: r.read, changed: r.changed, added: r.added, removed: r.removed };
      warm = { ...warm, checking: false, checked: { ...counts, dirs: dirs.slice(0, 5000), more: dirs.length > 5000 } };
      broadcast({ type: 'checked', ...counts });
      await writeWarmTree(guard.root, t, { version });
      const sw = await sweepWarm(guard, t, { skip: r.listed, onChange: (d) => broadcast({ type: 'change', dirs: d, kept: true }), busy, signal, mutate });
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
   * A page arrived while the disk is not watched (--no-watch, a watcher
   * that failed, or one skipped for a large tree): the tree kept is
   * checked again by folder modification times, as a page that surveys
   * the whole tree would read it again, its changes read in place and
   * announced as kept. Not while a walk or another check runs, and at most
   * once in RECHECK_MIN_MS or four times its last length. Resolves to the
   * check's counts, or null when none ran.
   */
  async function recheck() {
    if (!guard || !tree || state !== 'ready' || building || checker) return null;
    const now = Date.now();
    if (now - lastRecheck.at < Math.max(RECHECK_MIN_MS, lastRecheck.ms * 4)) return null;
    const t = tree;
    const own = new AbortController();
    checker = own;
    lastRecheck = { at: now, ms: lastRecheck.ms };
    try {
      const r = await checkWarm(guard, t, () => {}, { signal: own.signal, mutate: (fn) => serial(fn) });
      lastRecheck = { at: Date.now(), ms: Date.now() - now };
      if (tree !== t) return null;
      announce([...r.listed].filter((id) => t.has(id)).map((id) => t.relOf(id)));
      return { read: r.read, changed: r.changed, added: r.added, removed: r.removed };
    } catch {
      return null;
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
    seenWhileBuilding = new Set();
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
        lastSurvey = null;
        state = 'ready';
      } catch (err) {
        state = tree ? 'ready' : 'none';
        error = signal.aborted ? null : `The tree from the last session could not be read: ${err.message}`;
        next = null;
      } finally {
        building = null;
        ac = null;
        const seen = seenWhileBuilding;
        seenWhileBuilding = null;
        if (seen?.size) applyChanges([...seen]);
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
    applyChanges,
    recheck,

    /** Settles once every change waiting has been read into the tree, for checks. */
    async settled() {
      while (applying) await applying;
    },

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

    /**
     * GET /api/region: ids, a path's chain, or a fresh read; a fresh read
     * with kept=1 reads nothing, the tree being kept up already.
     */
    async handleRegion(req, res, q) {
      const reads = q.get('fresh') === '1' && q.get('kept') !== '1' && !!readers;
      const run = () => answer(tree, 'region', q, { ...ctx(), readers: reads ? readers : null });
      regionBusy++;
      try {
        let r;
        if (reads) r = await serial(run);
        else {
          await chain;
          r = await run();
        }
        return send(res, r.status, r.json);
      } catch (err) {
        if (err instanceof GuardError) throw err;
        return refuse(res, err);
      } finally {
        regionBusy--;
      }
    },

    /**
     * The whole-tree questions (find, marks, survey, sessions, places, cleanup),
     * after any change under way and after the region answers already
     * asked for. The survey of a tree that changed since it was worked out
     * is worked out again at most once in SURVEY_DUTY times its length:
     * between, the last one is answered with stale: true and retry, the
     * milliseconds until it may be worked out again.
     */
    async handleAsk(req, res, q, route) {
      try {
        await tick();
        for (let i = 0; regionBusy > 0 && i < 200; i++) await tick();
        await chain;
        const plain = route === 'survey' && q.get('dupfiles') === null;
        if (plain && tree && lastSurvey?.tree === tree && !surveyReady(tree)) {
          const wait = lastSurvey.at + Math.max(SURVEY_MIN_MS, lastSurvey.ms * SURVEY_DUTY) - Date.now();
          if (wait > 0 && q.get('v') === String(v)) return send(res, 200, { ...lastSurvey.json, stale: true, retry: wait });
        }
        const was = plain && tree ? surveyReady(tree) : null;
        const r = await answer(tree, route, q, ctx());
        if (plain && r.status === 200) {
          const fresh = !was;
          lastSurvey = { tree, json: r.json, at: fresh ? Date.now() : lastSurvey?.at ?? Date.now(), ms: fresh ? r.json.ms ?? 0 : lastSurvey?.ms ?? r.json.ms ?? 0 };
        }
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
      pendingApply.clear();
    },
  };
}
