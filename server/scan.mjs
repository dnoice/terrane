/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Progressive Scanner (Terrane Edition - v1.1)
 *     - File Name: scan.mjs
 *     - Relative Path: server/scan.mjs
 *     - Artifact Type: javascript
 *     - Version: 1.1.0
 *     - Date: 11/13/2026
 *     - Update: Friday, November 13, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Changelog:
 *     - 1.1.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] —
 *       pump(res, source, signal) writes a stream of records as NDJSON and
 *       waits for 'drain' or 'close', whichever comes first, then returns
 *       the source. A survey the page drops while the socket is full no
 *       longer leaves its scan, or a snapshot's open database, suspended
 *       for good.
 *     - 1.0.0 (11/09/2026) [dendogg + Anthropic - Claude Fable 5.2] —
 *       Initial release.
 *
 * ✒ Description:
 *     Walks a directory breadth-first and reports each folder the moment it
 *     has been read, so the interface can draw a tree that is still being
 *     discovered. Used for the first survey of the root, for re-reading one
 *     folder after a change, and for surveying a newly appeared subtree.
 *
 * ✒ Key Features:
 *     - Breadth-first, so the top of the hierarchy arrives first and the
 *       overview is usable long before the deep levels finish
 *     - Bounded concurrency (folders in flight and stat calls per folder)
 *       to stay responsive on spinning disks and network shares
 *     - One compact record per folder; files are packed into a flat array
 *     - Symbolic links are reported and never followed, which also removes
 *       any possibility of a link cycle
 *     - A folder that cannot be read is reported with its error code
 *       instead of aborting the scan
 *     - Depth limit (depth=1 lists a single folder and stubs its children)
 *     - Cancels cleanly through an AbortSignal when the client disconnects
 *     - pump(): the NDJSON writer for the scan routes, with backpressure
 *       that also ends when the page goes away
 *
 * ✒ Usage Instructions:
 *     Record shape, one JSON array per folder:
 *         [id, parentId, name, mtimeMs, error, files]
 *     error is 0, an errno string such as "EACCES", or "STUB" for a child
 *     folder that was listed but deliberately not read (depth limit).
 *     files is flat: name, size, mtimeMs, flags, name, size, ...
 *     flags: 1 symbolic link, 2 hidden (dot name), 4 special (socket, fifo,
 *     device).
 *
 * ✒ Examples:
 *     for await (const batch of scan('/data', { signal })) send(batch);
 *     for await (const batch of scan('/data/a', { depth: 1 })) send(batch);
 *     await pump(res, scan('/data', { signal }), signal);
 *
 * ✒ Other Important Information:
 *     - Dependencies: Node.js built-ins only (node:fs, node:path)
 *     - Compatible platforms: Node.js 20+ on Windows, macOS, Linux
 *     - Limitations: "hidden" is detected by dot prefix only; the Windows
 *       hidden attribute is not read. Sizes are logical sizes from lstat,
 *       not allocated blocks.
 * ----------------------------------------------------------------------------
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { HOLD_DIR } from './guard.mjs';

export const FLAG_LINK = 1;
export const FLAG_HIDDEN = 2;
export const FLAG_SPECIAL = 4;

const DIR_CONCURRENCY = 12;
const STAT_CONCURRENCY = 48;
const BATCH_MAX = 200;
const BATCH_MS = 60;

async function mapLimit(items, limit, fn) {
  let next = 0;
  const workers = [];
  const run = async () => {
    while (next < items.length) {
      const i = next++;
      await fn(items[i], i);
    }
  };
  for (let i = 0; i < Math.min(limit, items.length); i++) workers.push(run());
  await Promise.all(workers);
}

async function readOne(abs, isRoot) {
  let dirents;
  try {
    dirents = await fs.readdir(abs, { withFileTypes: true });
  } catch (err) {
    return { err: err.code || 'EIO', files: [], dirs: [] };
  }
  const dirs = [];
  const pending = [];
  for (const d of dirents) {
    if (isRoot && d.name === HOLD_DIR) continue;
    if (d.isDirectory()) dirs.push(d.name);
    else pending.push(d);
  }
  const packed = new Array(pending.length * 4);
  await mapLimit(pending, STAT_CONCURRENCY, async (d, i) => {
    let size = 0;
    let mtime = 0;
    let flags = 0;
    if (d.isSymbolicLink()) flags |= FLAG_LINK;
    else if (!d.isFile()) flags |= FLAG_SPECIAL;
    if (d.name.startsWith('.')) flags |= FLAG_HIDDEN;
    try {
      const st = await fs.lstat(path.join(abs, d.name));
      size = flags & FLAG_LINK ? 0 : st.size;
      mtime = Math.round(st.mtimeMs);
    } catch {
      flags |= FLAG_SPECIAL;
    }
    packed[i * 4] = d.name;
    packed[i * 4 + 1] = size;
    packed[i * 4 + 2] = mtime;
    packed[i * 4 + 3] = flags;
  });
  return { err: 0, files: packed, dirs };
}

/**
 * Async generator of record batches. Each batch is an array of records.
 */
export async function* scan(rootAbs, { depth = Infinity, signal, isRoot = false } = {}) {
  let nextId = 0;
  let out = [];
  let lastFlush = Date.now();
  // Queue entries: [abs, id, parentId, name, level]
  let frontier = [[rootAbs, nextId++, -1, path.basename(rootAbs), 0]];

  while (frontier.length && !signal?.aborted) {
    const level = frontier;
    frontier = [];
    // Process this level in slices so batches flush while a wide level runs.
    for (let i = 0; i < level.length && !signal?.aborted; i += DIR_CONCURRENCY * 4) {
      const slice = level.slice(i, i + DIR_CONCURRENCY * 4);
      const results = new Array(slice.length);
      await mapLimit(slice, DIR_CONCURRENCY, async (entry, k) => {
        const [abs, , , , lvl] = entry;
        let mtime = 0;
        try {
          mtime = Math.round((await fs.lstat(abs)).mtimeMs);
        } catch { /* reported through readdir below */ }
        results[k] = { mtime, ...(await readOne(abs, isRoot && lvl === 0)) };
      });
      for (let k = 0; k < slice.length; k++) {
        const [abs, id, parentId, name, lvl] = slice[k];
        const r = results[k];
        out.push([id, parentId, name, r.mtime, r.err, r.files]);
        for (const child of r.dirs) {
          const childAbs = path.join(abs, child);
          const childId = nextId++;
          if (lvl + 1 >= depth) out.push([childId, id, child, 0, 'STUB', []]);
          else frontier.push([childAbs, childId, id, child, lvl + 1]);
        }
        if (out.length >= BATCH_MAX || Date.now() - lastFlush > BATCH_MS) {
          yield out;
          out = [];
          lastFlush = Date.now();
        }
      }
    }
  }
  if (out.length) yield out;
}

/**
 * Writes each item of source to res as one line of JSON and ends res.
 * When res is full it waits for 'drain' or 'close', whichever comes first:
 * a socket destroyed by the page emits 'close' and never 'drain', so a
 * wait for 'drain' alone would hold the generator, and whatever it has
 * open, for good. Leaving the loop early returns the generator, so its
 * finally blocks run.
 */
export async function pump(res, source, signal) {
  let closed = res.destroyed;
  const onClose = () => { closed = true; };
  res.once('close', onClose);
  const gone = () => closed || res.destroyed || !!signal?.aborted;
  try {
    for await (const item of source) {
      if (gone()) break;
      if (!res.write(JSON.stringify(item) + '\n')) {
        await new Promise((resolve) => {
          const done = () => {
            res.off('drain', done);
            res.off('close', done);
            resolve();
          };
          res.on('drain', done);
          res.on('close', done);
          if (gone()) done();
        });
        if (gone()) break;
      }
    }
  } finally {
    res.off('close', onClose);
    if (!res.writableEnded) res.end();
  }
}
