/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Warm Start Cache (Terrane Edition - v1.0)
 *     - File Name: warm.mjs
 *     - Relative Path: server/warm.mjs
 *     - Artifact Type: javascript
 *     - Version: 1.0.0
 *     - Date: 11/13/2026
 *     - Update: Friday, November 13, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Changelog:
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
 *     - Dependencies: Node.js built-ins only (fs, zlib, crypto, stream);
 *       snapshot.mjs (datasetHome, slugOf), guard.mjs (foldName)
 *     - Compatible platforms: Node.js 22.5+ on Windows, macOS, Linux
 *     - Security: the cache holds real file names, as a snapshot does, so
 *       it stays in the dataset home, outside the project. The service
 *       asks warmInside first and keeps no cache when that home's real
 *       location is inside the authorized directory, so the cache is
 *       never written inside the root; read-only mode, which refuses
 *       changes to the directory, still writes it there
 *     - Limitations: one cache per root, replaced by every complete
 *       survey; a cache from a survey that was dropped part way is never
 *       written
 * ----------------------------------------------------------------------------
 */

import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import { pipeline } from 'node:stream';
import { datasetHome, slugOf } from './snapshot.mjs';
import { foldName } from './guard.mjs';

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
