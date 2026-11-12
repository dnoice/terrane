/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Measured Transfer (Terrane Edition - v1.0)
 *     - File Name: transfer.mjs
 *     - Relative Path: server/transfer.mjs
 *     - Artifact Type: javascript
 *     - Version: 1.0.0
 *     - Date: 11/11/2026
 *     - Update: Wednesday, November 11, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Description:
 *     The copy engine behind Terrane's copy and cross-volume move. It
 *     measures what is about to be copied, copies it while reporting bytes
 *     and files as they land, stops between chunks when cancelled, and
 *     keeps a list of every path it created so a cancelled or failed copy
 *     can remove exactly its own output and nothing else.
 *
 * ✒ Key Features:
 *     - measure(): bytes and file count of a file, link or folder tree,
 *       without following links, with bounded stat concurrency
 *     - copyTree(): copies a file, folder or symbolic link to a destination
 *       that must not exist; nothing is ever overwritten (exclusive create)
 *     - Files above 4 MB are streamed in 1 MB chunks so progress moves and
 *       cancellation takes effect within one chunk; smaller files use the
 *       operating system's own copy call
 *     - Cancellation through an AbortSignal, surfaced as a typed
 *       ECANCELED error the caller can tell apart from a real failure
 *     - Every created path is recorded in creation order; removeCreated()
 *       undoes them newest first, removing folders only when empty, so
 *       anything another program wrote meanwhile is left alone
 *     - Modification and access times are carried over, as the system
 *       file managers do
 *     - Symbolic links are copied as links (target text verbatim), never
 *       followed
 *     - File handles are closed before cleanup, so Windows can remove a
 *       partial file immediately
 *
 * ✒ Usage Instructions:
 *     import { measure, copyTree, removeCreated } from './transfer.mjs';
 *     const { bytes, files } = await measure(src, { signal });
 *     const created = [];
 *     try {
 *       await copyTree(src, dst, { signal, created, onBytes: (n) => {} });
 *     } catch (err) {
 *       await removeCreated(created);
 *       throw err;
 *     }
 *
 * ✒ Other Important Information:
 *     - Dependencies: Node.js built-ins only; GuardError from guard.mjs
 *     - Compatible platforms: Node.js 20+ on Windows, macOS, Linux
 *     - Testing: TERRANE_SLOW_COPY_MS adds a delay per streamed chunk and
 *       streams every file, so the smoke test can cancel a copy halfway.
 *       It has no other use and is unset in normal operation
 *     - Limitations: special files (sockets, FIFOs, devices) are refused
 *       rather than copied. Ownership, permissions beyond the defaults, and
 *       alternate data streams are not carried over
 * ----------------------------------------------------------------------------
 */

import fs from 'node:fs/promises';
import { constants, createReadStream, createWriteStream } from 'node:fs';
import { once } from 'node:events';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { GuardError } from './guard.mjs';

const STREAM_ABOVE = 4 * 1024 * 1024;
const CHUNK = 1024 * 1024;
const STAT_CONCURRENCY = 32;
const SLOW_MS = Number(process.env.TERRANE_SLOW_COPY_MS) || 0;

export const isCancel = (err) => err?.code === 'ECANCELED';

const cancelled = () => new GuardError('ECANCELED', 'Cancelled.', 409);

function checkpoint(signal) {
  if (signal?.aborted) throw cancelled();
}

/** Bytes and file count under abs, links counted as files of no size. */
export async function measure(abs, { signal, onCount } = {}) {
  let bytes = 0;
  let files = 0;
  const top = await fs.lstat(abs);
  if (!top.isDirectory()) return { bytes: top.isSymbolicLink() ? 0 : top.size, files: 1 };
  const stack = [abs];
  while (stack.length) {
    checkpoint(signal);
    const dir = stack.pop();
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const leaves = [];
    for (const d of entries) {
      if (d.isDirectory()) stack.push(path.join(dir, d.name));
      else leaves.push(d);
    }
    for (let i = 0; i < leaves.length; i += STAT_CONCURRENCY) {
      checkpoint(signal);
      const sizes = await Promise.all(leaves.slice(i, i + STAT_CONCURRENCY).map(async (d) => {
        if (d.isSymbolicLink()) return 0;
        try {
          return (await fs.lstat(path.join(dir, d.name))).size;
        } catch {
          return 0;
        }
      }));
      for (const s of sizes) bytes += s;
      files += sizes.length;
    }
    onCount?.(files, bytes);
  }
  return { bytes, files };
}

/** Resolves once a stream has released its file descriptor. */
const released = (stream) => (stream.closed ? Promise.resolve() : new Promise((resolve) => stream.once('close', resolve)));

async function streamFile(from, to, { signal, onBytes, created }) {
  // Exclusive create: refuses an existing name instead of truncating it.
  const ws = createWriteStream(to, { flags: 'wx' });
  try {
    await once(ws, 'open');
  } catch (err) {
    await released(ws);
    throw err;
  }
  created.push(to);
  const rs = createReadStream(from, { highWaterMark: CHUNK });
  const meter = async function* (source) {
    for await (const chunk of source) {
      onBytes?.(chunk.length);
      if (SLOW_MS) await delay(SLOW_MS, undefined, { signal });
      yield chunk;
    }
  };
  try {
    await pipeline(rs, meter, ws, { signal });
  } catch (err) {
    rs.destroy();
    ws.destroy();
    if (err?.name === 'AbortError' || signal?.aborted) throw cancelled();
    throw err;
  } finally {
    // Windows cannot remove a file that is still open, so cleanup waits.
    await Promise.all([released(rs), released(ws)]);
  }
}

/**
 * Copies one entry (file, folder or link) to `to`, which must not exist.
 * Every path created is pushed onto `created` in creation order.
 */
export async function copyTree(from, to, opts) {
  const { signal, onBytes, onFile, created } = opts;
  checkpoint(signal);
  const st = await fs.lstat(from);

  if (st.isSymbolicLink()) {
    await fs.symlink(await fs.readlink(from), to);
    created.push(to);
    onFile?.(from);
    return;
  }

  if (st.isDirectory()) {
    await fs.mkdir(to);
    created.push(to);
    for (const name of await fs.readdir(from)) {
      await copyTree(path.join(from, name), path.join(to, name), opts);
    }
    await fs.utimes(to, st.atime, st.mtime).catch(() => {});
    return;
  }

  if (!st.isFile()) {
    throw new GuardError('ESPECIAL', `"${path.basename(from)}" is a special file (socket, pipe or device) and cannot be copied.`);
  }

  if (st.size > STREAM_ABOVE || SLOW_MS) {
    await streamFile(from, to, opts);
  } else {
    try {
      await fs.copyFile(from, to, constants.COPYFILE_EXCL);
    } catch (err) {
      // EEXIST means the name belonged to someone else; anything else left
      // a file of ours behind.
      if (err.code !== 'EEXIST') created.push(to);
      throw err;
    }
    created.push(to);
    onBytes?.(st.size);
  }
  await fs.utimes(to, st.atime, st.mtime).catch(() => {});
  onFile?.(from);
}

/**
 * Removes what a copy created, newest first. Folders are removed only when
 * empty. Returns the number of paths that could not be removed.
 */
export async function removeCreated(created) {
  let leftover = 0;
  for (const p of [...created].reverse()) {
    try {
      const st = await fs.lstat(p);
      if (st.isDirectory()) await fs.rmdir(p);
      else await fs.unlink(p);
    } catch (err) {
      if (err.code !== 'ENOENT') leftover++;
    }
  }
  created.length = 0;
  return leftover;
}
