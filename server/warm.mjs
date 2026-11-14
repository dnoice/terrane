/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Warm Start Cache (Terrane Edition - v1.1)
 *     - File Name: warm.mjs
 *     - Relative Path: server/warm.mjs
 *     - Artifact Type: javascript
 *     - Version: 1.1.0
 *     - Date: 11/14/2026
 *     - Update: Saturday, November 14, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Changelog:
 *     - 1.1.0 (11/14/2026) [dendogg + Anthropic - Claude Opus 5.5] — The
 *       cache is checked by folder modification times: readWarmTree reads
 *       it into a column tree; checkWarm lstats every folder, 12 at a
 *       time, breadth first, and lists again only the folders whose time
 *       changed (a new folder whole, a gone one through its parent),
 *       answering parents first; sweepWarm then lstats the files of every
 *       other folder, 8 at a time, waiting while a change runs, and lists
 *       again a folder with a file rewritten in place, 100 at a time;
 *       writeWarmTree writes the checked tree back through warmWriter.
 *     - 1.0.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] —
 *       Initial release.
 *
 * ✒ Description:
 *     Keeps the last complete survey of a directory on disk, so the next
 *     launch can draw the tree at once and check it against the disk
 *     afterwards. The cache is written by teeing the page's own full
 *     survey as it streams, never by a second walk, and it is read back
 *     only when its meta file, its root and its size all agree.
 *
 * ✒ Key Features:
 *     - warmPaths(root): the cache lives in the dataset home for the root
 *       (datasetHome, so TERRANE_DATA moves it), as
 *       warm-<sha256(root), 16 hex>.ndjson.gz and warm-<same>.json
 *     - warmWriter(root): push(batch) gzips each batch of scanner records
 *       as one JSON line into a temporary file of its own and counts
 *       folders, files and bytes; commit() renames it over the cache and
 *       then writes the meta atomically; abort() removes the temporary
 *       file. Nothing it does can fail the survey it is fed from
 *     - Commits are serialized by one promise chain, so two surveys that
 *       finish together cannot interleave a data file with the other's
 *       meta in this process
 *     - A rename refused by Windows (EPERM, EBUSY, EACCES), while a reader
 *       or a scanner holds the file, is tried again, as ops.mjs's
 *       writeAtomic does
 *     - readWarm(root): the meta, or null unless it is format 1, names
 *       exactly this root, holds finite counts, and the data file has the
 *       size the meta records; any error is null
 *     - warmInside(root): whether the cache's folder, by its real
 *       location (the nearest part that exists resolved, the rest added
 *       back), is the root or under it, compared as the platform compares
 *       names; the service then keeps none, so the cache never lands in
 *       the tree it records
 *     - Temporary files another process left behind more than ten
 *       minutes ago are removed when a writer starts
 *     - The records are the scanner's: names, sizes, dates and flags,
 *       never what a file contains
 *     - readWarmTree(root): the cache as a finished column tree
 *       (columns.js), or null when it does not read whole or its counts
 *       differ from its meta's
 *     - checkWarm(guard, tree, emit): every folder lstat'ed, 12 at a time,
 *       breadth first; one whose time differs listed again (depth 1), each
 *       new folder in it read whole, a folder that is gone or no longer a
 *       folder read through its parent; emit hears { dir, records }, {
 *       dir, deep } and { done, folders, read, added, removed, changed,
 *       ms }, parents first; the tree takes each read through mutate
 *     - sweepWarm(guard, tree): the files of every folder the check did
 *       not list again, lstat'ed 8 at a time while no change runs; a
 *       folder with a file whose size or rounded time differs is listed
 *       again, and onChange hears them 100 at a time, never as bulk
 *     - writeWarmTree(root, tree): the tree's records() as the cache,
 *       committed atomically as a survey's are
 *     - Every read of the disk goes through guard.resolve and
 *       guard.assertDirInside (folderReaders), or lstat of a path built
 *       from the guard's root and the scanner's names through relParts;
 *       no shell, nothing outside the root
 *
 * ✒ Usage Instructions:
 *     import { warmWriter, readWarm, warmPaths, warmInside } from './warm.mjs';
 *     if (await warmInside(guard.root)) return;   // no cache inside the root
 *     const w = warmWriter(guard.root, { version: '1.3.0' });
 *     for await (const batch of scan(root, { signal })) w.push(batch);
 *     if (!signal.aborted) await w.commit(); else await w.abort();
 *     const meta = await readWarm(guard.root);   // or null
 *
 * ✒ Examples:
 *     warmPaths('C:\\data\\projects')
 *       { dir: '%LOCALAPPDATA%\\terrane\\datasets\\projects',
 *         data: '...\\warm-3f2a9c...ndjson.gz', meta: '...\\warm-3f2a9c....json' }
 *     readWarm(root)
 *       { format: 1, root, takenAt, folders, files, bytes, size, version }
 *
 * ✒ Other Important Information:
 *     - Dependencies: Node.js built-ins only (fs, zlib, crypto, stream,
 *       readline); snapshot.mjs (datasetHome, slugOf), guard.mjs
 *       (foldName, relParts), scan.mjs, web/js/columns.js (ColumnTree)
 *     - Compatible platforms: Node.js 22.5+ on Windows, macOS, Linux
 *     - Security: the cache holds real file names, as a snapshot does, so
 *       it stays in the dataset home, outside the project. The service
 *       asks warmInside first and keeps no cache when that home's real
 *       location is inside the authorized directory, so the cache is
 *       never written inside the root; read-only mode, which refuses
 *       changes to the directory, still writes it there
 *     - Limitations: one cache per root, replaced by every complete
 *       survey and every check; a cache from a survey that was dropped
 *       part way is never written. A file rewritten in place keeps its
 *       folder's time, so until the sweep reaches it the check's tree can
 *       hold its old size and date
 * ----------------------------------------------------------------------------
 */

import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import readline from 'node:readline';
import { pipeline } from 'node:stream';
import { datasetHome, slugOf } from './snapshot.mjs';
import { foldName, relParts } from './guard.mjs';
import { scan } from './scan.mjs';
import { ColumnTree } from '../web/js/columns.js';

export const WARM_FORMAT = 1;
/** A temporary file of another process older than this is taken as left behind. */
const STALE_MS = 10 * 60 * 1000;
const NUMBERS = ['takenAt', 'folders', 'files', 'bytes', 'size'];

/** Where the cache for root lives: { dir, data, meta }. base overrides the dataset home's parent. */
export function warmPaths(root, base) {
  const dir = datasetHome(slugOf(root), base);
  const stem = `warm-${crypto.createHash('sha256').update(String(root)).digest('hex').slice(0, 16)}`;
  return { dir, data: path.join(dir, `${stem}.ndjson.gz`), meta: path.join(dir, `${stem}.json`) };
}

/**
 * Whether the cache for root would be written inside root: its folder's
 * real location (the nearest part of it that exists, resolved, with the
 * rest added back) is root or lies under it, compared as this platform
 * compares names. A dataset home inside the directory, set by
 * TERRANE_DATA or reached because the root is a home folder or a whole
 * drive, would put the cache into the tree it records: a write inside
 * the root, a record of its own temporary file, and a change the watcher
 * sees. root is the guard's root, a real path already.
 */
export async function warmInside(root, base) {
  const { dir } = warmPaths(root, base);
  let at = path.resolve(dir);
  const rest = [];
  let real = null;
  for (;;) {
    try {
      real = path.join(await fsp.realpath(at), ...rest);
      break;
    } catch {
      const up = path.dirname(at);
      if (up === at) break;
      rest.unshift(path.basename(at));
      at = up;
    }
  }
  const fold = (p) => p.split(path.sep).map(foldName).join(path.sep);
  const r = fold(path.resolve(root));
  const prefix = r.endsWith(path.sep) ? r : r + path.sep;
  const d = fold(real ?? path.resolve(dir));
  return d === r || d.startsWith(prefix);
}

const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const tmpName = (file) => `${file}.${process.pid}-${crypto.randomBytes(6).toString('hex')}.tmp`;

/** Renames from over to; Windows refuses while another program holds the target, and that clears. */
async function swap(from, to) {
  for (let attempt = 0; ; attempt++) {
    try {
      await fsp.rename(from, to);
      return;
    } catch (err) {
      if (attempt >= 6 || !['EPERM', 'EBUSY', 'EACCES'].includes(err.code)) throw err;
      await pause(40 * (attempt + 1));
    }
  }
}

/** Writes a sibling file and renames it over file. */
async function writeAtomic(file, text) {
  const tmp = tmpName(file);
  await fsp.writeFile(tmp, text);
  try {
    await swap(tmp, file);
  } catch (err) {
    await fsp.rm(tmp, { force: true }).catch(() => {});
    throw err;
  }
}

/** Removes temporary files of this cache that another process left behind. */
async function sweep(dir, data, meta) {
  let names;
  try {
    names = await fsp.readdir(dir);
  } catch {
    return;
  }
  const mine = `.${process.pid}-`;
  for (const name of names) {
    const ours = [data, meta].some((f) => name.startsWith(`${path.basename(f)}.`));
    if (!ours || !name.endsWith('.tmp') || name.includes(mine)) continue;
    const file = path.join(dir, name);
    try {
      if (Date.now() - (await fsp.stat(file)).mtimeMs > STALE_MS) await fsp.rm(file, { force: true });
    } catch { /* gone, or in use */ }
  }
}

/** Commits run one after another, so a data file and its meta are never interleaved with another's. */
let chain = Promise.resolve();

/**
 * A writer for one survey of root. push(batch) takes each batch of scanner
 * records as it streams; commit() makes it the cache and resolves to the
 * meta, or to null when it could not be written; abort() removes what was
 * written and resolves once it is gone. Neither throws.
 */
export function warmWriter(root, { version = '' } = {}) {
  const { dir, data, meta } = warmPaths(root);
  const tmp = tmpName(data);
  let folders = 0;
  let files = 0;
  let bytes = 0;
  // open, committing, committed, aborted or failed
  let state = 'open';
  let gz = null;
  let ended = Promise.resolve();
  let closed = Promise.resolve();
  try {
    fs.mkdirSync(dir, { recursive: true });
    gz = zlib.createGzip({ level: 4 });
    const out = fs.createWriteStream(tmp);
    closed = new Promise((resolve) => out.once('close', resolve));
    ended = new Promise((resolve, reject) => pipeline(gz, out, (err) => (err ? reject(err) : resolve())));
    // A write that fails (a full disk) only means there will be no cache.
    ended.catch(() => { if (state === 'open') state = 'failed'; });
    sweep(dir, data, meta);
  } catch {
    state = 'failed';
  }

  const discard = async () => {
    // The temporary file can be removed only once its stream has let it go.
    await Promise.race([closed, pause(2000)]);
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        await fsp.rm(tmp, { force: true });
        return;
      } catch {
        await pause(50 * (attempt + 1));
      }
    }
  };

  return {
    /** Takes one batch of scanner records, as /api/scan writes them. */
    push(batch) {
      if (state !== 'open' || gz.destroyed) return;
      for (const rec of batch) {
        folders++;
        const list = rec[5];
        files += list.length / 4;
        for (let i = 1; i < list.length; i += 4) bytes += list[i];
      }
      gz.write(`${JSON.stringify(batch)}\n`);
    },

    /** Makes what was pushed the cache: the data renamed into place, then the meta. */
    commit() {
      if (state !== 'open') {
        if (state === 'failed') return discard().then(() => null);
        return Promise.resolve(null);
      }
      state = 'committing';
      const takenAt = Date.now();
      gz.end();
      const work = chain.then(async () => {
        await ended;
        const size = (await fsp.stat(tmp)).size;
        await swap(tmp, data);
        const m = { format: WARM_FORMAT, root, takenAt, folders, files, bytes, size, version };
        await writeAtomic(meta, JSON.stringify(m));
        state = 'committed';
        return m;
      }).catch(async () => {
        state = 'failed';
        await discard();
        return null;
      });
      chain = work;
      return work;
    },

    /** Drops what was pushed: a survey that did not finish leaves nothing behind. */
    abort() {
      if (state !== 'open' && state !== 'failed') return Promise.resolve();
      state = 'aborted';
      gz?.destroy();
      return discard();
    },

    get counts() {
      return { folders, files, bytes };
    },
  };
}

/**
 * The meta of the cache for root, or null. It must be format 1, name this
 * root exactly, hold finite counts, and the data file must have the size
 * it records: a data file another process replaced or cut short reads as
 * no cache. Any error reads as no cache.
 */
export async function readWarm(root) {
  try {
    const { data, meta } = warmPaths(root);
    const m = JSON.parse(await fsp.readFile(meta, 'utf8'));
    if (!m || typeof m !== 'object' || m.format !== WARM_FORMAT || m.root !== root) return null;
    if (!NUMBERS.every((k) => typeof m[k] === 'number' && Number.isFinite(m[k]) && m[k] >= 0)) return null;
    const st = await fsp.stat(data);
    if (!st.isFile() || st.size !== m.size) return null;
    return m;
  } catch {
    return null;
  }
}

/* ---------- the check by folder modification times ---------- */

/** How many folders are lstat'ed at once by the check, and files by the sweep. */
const CHECK_CONCURRENCY = 12;
const SWEEP_CONCURRENCY = 8;
/** The most folders one change event of the sweep names. */
const SWEEP_BATCH = 100;

/**
 * Reads the cache for root into a finished column tree, as a scan of the
 * root would build it. Resolves to null when there is no cache, or when
 * it cannot be read whole or does not hold the counts its meta records.
 * onProgress({ folders, files, of }) hears it every 50,000 rows.
 */
export async function readWarmTree(root, { name = path.basename(root) || root, onProgress = null, signal } = {}) {
  const m = await readWarm(root);
  if (!m) return null;
  const tree = new ColumnTree({ name, expect: { folders: m.folders, files: m.files } });
  let folders = 0;
  let files = 0;
  let mark = 50000;
  const lines = readline.createInterface({ input: fs.createReadStream(warmPaths(root).data).pipe(zlib.createGunzip()), crlfDelay: Infinity });
  try {
    for await (const line of lines) {
      if (signal?.aborted) return null;
      if (!line) continue;
      const batch = JSON.parse(line);
      tree.add(batch);
      folders += batch.length;
      for (const r of batch) files += r[5].length / 4;
      if (folders + files >= mark) {
        mark = folders + files + 50000;
        onProgress?.({ folders, files, of: m.folders + m.files });
        await new Promise((r) => setImmediate(r));
      }
    }
  } catch {
    return null;
  }
  tree.finish({ anchor: Date.now() });
  if (tree.folders !== m.folders || tree.files !== m.files) return null;
  return Object.assign(tree, { warmMeta: m });
}

/**
 * The reads a check and a sweep make: a folder at a root-relative path,
 * depth 1 or whole, through guard.resolve and guard.assertDirInside, as
 * GET /api/scan reads it; the holding area left out at the root. A folder
 * that is gone rejects with ENOENT.
 */
export function folderReaders(guard) {
  const collect = async (rel, depth) => {
    const parts = relParts(rel);
    const abs = guard.resolve(parts.join('/'));
    await guard.assertDirInside(abs);
    const out = [];
    for await (const b of scan(abs, { depth, isRoot: parts.length === 0 })) for (const r of b) out.push(r);
    return out;
  };
  return { depth1: (rel) => collect(rel, 1), deep: (rel) => collect(rel, Infinity) };
}

/** The real path of a folder of the tree: the guard's root and the names the scanner read, each checked as a path's segments are. */
const absOf = (guard, rel) => path.join(guard.root, ...relParts(rel));

/** Runs fn over items, limit at a time, in order of start. */
async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  const run = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return out;
}

/**
 * Checks a tree read from the cache against the disk by folder
 * modification times. Every folder is lstat'ed, 12 at a time, breadth
 * first; a folder whose time differs from the cache's is listed again
 * (depth 1) and a new folder in it read whole, and a folder that is gone
 * (or no longer a folder) has its parent listed again instead. The tree
 * takes each read as it comes (through mutate, so readers of it wait),
 * and emit hears, parents first, { dir, records } for a folder read
 * again, { dir, deep } for a new one, and { done, folders, read, added,
 * removed, changed, ms } at the end. Resolves to that last, with read,
 * the set of folder ids listed again. A file rewritten in place does not
 * change its folder's time: sweepWarm finds those.
 */
export async function checkWarm(guard, tree, emit, { signal, readers = folderReaders(guard), mutate = (fn) => fn() } = {}) {
  const t0 = Date.now();
  const listed = new Set();
  const count = { read: 0, added: 0, removed: 0, changed: 0 };
  const stop = () => {
    if (signal?.aborted) throw Object.assign(new Error('The check was stopped.'), { code: 'EABORT' });
  };
  /** Lists folder id again and fills every new folder in it. */
  const relist = async (id) => {
    for (;;) {
      if (listed.has(id) || !tree.has(id)) return;
      const rel = tree.relOf(id);
      let records;
      try {
        records = await readers.depth1(rel);
      } catch (err) {
        if (err?.code === 'ENOENT' && id !== 0) {
          id = tree.parentOf(id);
          continue;
        }
        throw err;
      }
      stop();
      const r = await mutate(() => tree.replace(id, records));
      listed.add(id);
      count.read++;
      count.changed += r.changed;
      count.removed += r.removed;
      count.added += r.addedFiles;
      emit({ dir: rel, records });
      for (const a of r.added) {
        let deep;
        try {
          deep = await readers.deep(a.rel);
        } catch (err) {
          if (err?.code !== 'ENOENT') throw err;
          await mutate(() => tree.remove(a.id));
          continue;
        }
        stop();
        const g = await mutate(() => tree.graft(a.id, deep));
        count.added += g.folders + g.files;
        emit({ dir: a.rel, deep });
      }
      return;
    }
  };
  const F = tree.F;
  for (let i = 0; i < F; i += CHECK_CONCURRENCY) {
    stop();
    const ids = [];
    for (let id = i; id < Math.min(F, i + CHECK_CONCURRENCY); id++) if (tree.has(id)) ids.push(id);
    const times = await mapLimit(ids, CHECK_CONCURRENCY, async (id) => {
      try {
        const st = await fsp.lstat(absOf(guard, tree.relOf(id)));
        return st.isDirectory() ? Math.round(st.mtimeMs) : null;
      } catch {
        return null;
      }
    });
    for (let k = 0; k < ids.length; k++) {
      const id = ids[k];
      if (!tree.has(id) || listed.has(id)) continue;
      if (times[k] === null) {
        if (id === 0) throw Object.assign(new Error('The directory itself can no longer be read.'), { code: 'ENOENT' });
        await relist(tree.parentOf(id));
      } else if (times[k] !== tree.mtime[id]) await relist(id);
    }
  }
  const done = { done: true, folders: tree.folders, ...count, ms: Date.now() - t0 };
  emit(done);
  return { ...done, listed };
}

/**
 * Finds the files rewritten in place since the cache was written, which
 * a check by folder times cannot see: the files of every folder the check
 * did not list again (skip) are lstat'ed, 8 at a time, pausing while
 * busy() says a change is running; a folder with any file whose size or
 * rounded time differs is listed again, the tree takes it (mutate), and
 * onChange(dirs) hears them in batches of at most 100, never as bulk.
 * Resolves to { folders, files, changed, read }: folders and files
 * looked at, files changed, folders listed again.
 */
export async function sweepWarm(guard, tree, { skip = new Set(), onChange = () => {}, busy = () => false, signal, readers = folderReaders(guard), mutate = (fn) => fn() } = {}) {
  let folders = 0;
  let files = 0;
  let changed = 0;
  let read = 0;
  let pending = [];
  const flush = async () => {
    const dirs = [];
    for (const id of pending) {
      if (!tree.has(id)) continue;
      const rel = tree.relOf(id);
      let records;
      try {
        records = await readers.depth1(rel);
      } catch (err) {
        if (err?.code === 'ENOENT') continue;
        throw err;
      }
      const r = await mutate(() => tree.replace(id, records));
      changed += r.changed + r.addedFiles;
      read++;
      for (const a of r.added) {
        try {
          const deep = await readers.deep(a.rel);
          await mutate(() => tree.graft(a.id, deep));
        } catch {
          await mutate(() => (tree.has(a.id) ? tree.remove(a.id) : null));
        }
      }
      dirs.push(rel);
    }
    pending = [];
    if (dirs.length) onChange(dirs);
  };
  const F = tree.F;
  for (let id = 0; id < F; id++) {
    if (signal?.aborted) break;
    if (!tree.has(id) || skip.has(id) || !tree.fileN[id]) continue;
    while (busy() && !signal?.aborted) await new Promise((r) => setTimeout(r, 200));
    const dir = absOf(guard, tree.relOf(id));
    const f0 = tree.file0[id];
    const slots = Array.from({ length: tree.fileN[id] }, (_, k) => f0 + k);
    folders++;
    files += slots.length;
    const differs = await mapLimit(slots, SWEEP_CONCURRENCY, async (j) => {
      try {
        const st = await fsp.lstat(path.join(dir, tree.fname[j]));
        const size = st.isSymbolicLink() ? 0 : st.size;
        return size !== tree.fsize[j] || Math.round(st.mtimeMs) !== tree.fmtime[j];
      } catch {
        return true;
      }
    });
    if (differs.some(Boolean)) pending.push(id);
    if (pending.length >= SWEEP_BATCH) await flush();
  }
  if (pending.length && !signal?.aborted) await flush();
  return { folders, files, changed, read };
}

/** Writes the tree to the cache for root, as a whole survey writes it: one batch per line, committed atomically. Resolves to the meta, or null. */
export async function writeWarmTree(root, tree, { version = '' } = {}) {
  const w = warmWriter(root, { version });
  for (const batch of tree.records()) w.push(batch);
  return w.commit();
}
