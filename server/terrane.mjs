#!/usr/bin/env node
/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Terrane Service (Terrane Edition - v1.4)
 *     - File Name: terrane.mjs
 *     - Relative Path: server/terrane.mjs
 *     - Artifact Type: CLI
 *     - Version: 1.4.0
 *     - Date: 11/13/2026
 *     - Update: Friday, November 13, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Changelog:
 *     - 1.4.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] — POST
 *       /api/hash reads a file only once its real location is proved
 *       inside the root and outside the holding area, as /api/raw and
 *       /api/inside do (guard.realInside), so a link no longer hands out
 *       the hash of a file outside. The scan routes write through
 *       pump(), which waits for 'drain' or 'close': a survey the page
 *       drops while the socket is full no longer leaves its scan, or in
 *       snapshot mode its open database, suspended for good. The
 *       thumbnail cookie is named for the port and holds a secret of its
 *       own that opens /api/thumbs and /api/thumb only, never the session
 *       token. The service reports itself as Terrane 1.3.0, the
 *       package version.
 *     - 1.3.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] — The
 *       interface's files are revalidated instead of fetched again on
 *       every use: each carries a weak ETag from its size and change time
 *       and Cache-Control no-cache, and an unchanged file answers 304. The
 *       page itself, which holds the session token, is still never stored.
 *       A malformed or null-byte static path is a 404 rather than an
 *       error. /api/raw and /api/inside check containment with the
 *       guard's own test, so a drive root such as C:\ works as the root.
 *     - 1.2.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] — GET
 *       /api/inside lists what a zip archive holds, as scanner records,
 *       through the same checks as /api/raw (the file's own real location
 *       must be inside the root) and stops reading when the page goes
 *       away. Other formats are refused with 415 naming the format found
 *       or the one the name suggests; a damaged zip gets 422 with a
 *       sentence. Snapshot mode refuses it with ESNAPSHOT. Error bodies
 *       carry format and claimed when an archive is refused, and results
 *       (the paths finished) when a change stopped part way.
 *     - 1.1.0 (11/11/2026) [dendogg + Anthropic - Claude Opus 5.5] — Job
 *       progress is broadcast on the change stream and replayed to a page
 *       that connects mid-job; POST /api/cancel stops a job; Ctrl+C
 *       cancels running jobs and waits for their cleanup before exiting.
 *       Snapshot mode (--snapshot) serves a recorded structure and touches
 *       no real file. /api/thumbs and /api/thumb serve the thumbnail
 *       dataset with versioned, immutable caching. Requires Node 22.5.
 *     - 1.0.0 (11/09/2026) [dendogg + Anthropic - Claude Fable 5.2] —
 *       Initial release.
 *
 * ✒ Description:
 *     The local service behind Terrane. It is given exactly one directory on
 *     the command line, serves the interface on the loopback address, and
 *     exposes that directory (and nothing else) to the browser: progressive
 *     scanning, metadata, previews, archive contents, guarded file
 *     operations, undo, and live change notifications.
 *
 * ✒ Key Features:
 *     - Explicit authorization: no directory argument, no service
 *     - Loopback only (127.0.0.1), Host-header check against DNS rebinding,
 *       and a per-session token required on every API call
 *     - NDJSON scan stream with backpressure, cancelled when the tab closes
 *     - Server-sent change events from a recursive watcher, debounced and
 *       reduced to the set of folders that need re-reading
 *     - Progress for copy, move and remove on the same event stream, with
 *       cancellation through POST /api/cancel
 *     - Ctrl+C cancels running jobs and lets them remove their partial
 *       output before the process exits
 *     - Duplicate verification by content hash (full SHA-1 up to 16 MB,
 *       three sampled megabytes plus size beyond that, reported as such),
 *       of files whose real location is inside the root
 *     - Sandboxed raw-file endpoint for previews: capped length, nosniff,
 *       and a CSP sandbox so a previewed HTML or SVG file cannot run
 *     - Archive interiors: a zip's central directory read without
 *       unpacking (server/archive.mjs), bounded in entries, directory
 *       size and time, with anything left out stated in a sentence
 *     - Snapshot mode: the same scan, stat and event contract served from
 *       a structure database; every change, open, reveal, content read and
 *       archive listing is refused; a newer snapshot landing beside it is
 *       announced
 *     - Thumbnails from the thumbnail dataset, in both modes: one gzipped
 *       index, and versioned images cached as immutable; image URLs carry
 *       no token and authenticate with a SameSite=Strict cookie named for
 *       the port, whose secret opens thumbnails and nothing else
 *     - Interface files revalidated by a weak ETag (no-cache, 304 when
 *       unchanged); the page, which holds the token, is never stored
 *     - Zero npm dependencies; three.js and the fonts are vendored in web/
 *
 * ✒ Usage Instructions:
 *     node server/terrane.mjs <directory> [options]
 *     node server/terrane.mjs --snapshot <dataset folder or .db> [options]
 *     The service prints its address and opens it in the default browser.
 *     Stop it with Ctrl+C. For development, npm run dev wraps snapshot mode.
 *
 * ✒ Examples:
 *     node server/terrane.mjs "C:\Users\DnnsS\OneDrive\Desktop\dd1\projects"
 *     node server/terrane.mjs ~/Music --read-only
 *     node server/terrane.mjs /srv/share --port 5050 --no-open
 *     node server/terrane.mjs . --no-watch
 *     node server/terrane.mjs --snapshot "%LOCALAPPDATA%\terrane\datasets\projects"
 *
 * ✒ Command-Line Arguments:
 *     Input:
 *         <directory>     The one directory Terrane may read and change.
 *         --snapshot <p>  Instead of a directory: a dataset folder (newest
 *                         snapshot in it) or one structure .db file.
 *         --thumbs <db>   Thumbnail dataset to serve (default: thumbs.db in
 *                         the dataset folder for the root).
 *     Safety:
 *         --read-only     Refuse every operation that changes the disk.
 *     Processing:
 *         --no-watch      Do not watch for outside changes (manual refresh).
 *     Output:
 *         --port <n>      Preferred port (default 4173; next free is used).
 *         --no-open       Do not open the browser automatically.
 *
 * ✒ Other Important Information:
 *     - Dependencies: Node.js built-ins only (node:sqlite for datasets)
 *     - Compatible platforms: Node.js 22.5+ on Windows, macOS, Linux
 *     - Security: the token defends against other web pages, not against
 *       other programs running as the same user, which already have the
 *       same filesystem access the service has. The token never leaves the
 *       page's meta tag and the X-Terrane-Token header; the cookie, which
 *       the browser sends to every port on this host, carries only the
 *       thumbnail secret
 *     - Limitations: on Linux the recursive watcher is skipped above 15,000
 *       folders, where its setup cost stops being reasonable; the interface
 *       then offers manual refresh
 * ----------------------------------------------------------------------------
 */

import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { makeGuard, GuardError, HOLD_DIR, relParts } from './guard.mjs';
import { scan, pump } from './scan.mjs';
import { makeOps } from './ops.mjs';
import { openSnapshots, listSnapshots, datasetHome, slugOf } from './snapshot.mjs';
import { openThumbs } from './thumbs.mjs';
import { inspect } from './archive.mjs';

const VERSION = '1.3.0';
const WEB = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'web');

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const VALUED = ['--port', '--snapshot', '--thumbs'];
const positional = args.filter((a, i) => !a.startsWith('--') && !VALUED.includes(args[i - 1]));
const snapshotArg = option('--snapshot', null);
const usageOk = snapshotArg ? positional.length === 0 : positional.length === 1;

if (!usageOk || flag('--help')) {
  console.error([
    '',
    '  Terrane ' + VERSION,
    '  Usage: node server/terrane.mjs <directory> [--read-only] [--port n] [--no-open] [--no-watch]',
    '         node server/terrane.mjs --snapshot <folder or .db> [--port n] [--no-open]',
    '',
    '  Terrane only works inside the directory you name here. With --snapshot it',
    '  shows a recorded structure instead and touches no real files at all.',
    '',
  ].join('\n'));
  process.exit(usageOk ? 0 : 1);
}

let guard = null;
let snap = null;
let snapMeta = null;
if (snapshotArg) {
  try {
    snap = openSnapshots(path.resolve(snapshotArg));
    snapMeta = snap.meta();
  } catch (err) {
    console.error(`\n  Cannot use snapshot "${snapshotArg}": ${err.message}\n`);
    process.exit(1);
  }
} else {
  try {
    guard = await makeGuard(positional[0]);
  } catch (err) {
    console.error(`\n  Cannot use "${positional[0]}": ${err.message}\n`);
    process.exit(1);
  }
}
const readOnly = flag('--read-only') || !!snap;

// The thumbnail dataset sits beside the structure snapshots. It is opened
// lazily so one built after the service started is still picked up.
const thumbsFile = option('--thumbs', null)
  || (snap ? path.join(path.dirname(snap.file()), 'thumbs.db') : path.join(datasetHome(slugOf(guard.root)), 'thumbs.db'));
let thumbs = null;
const getThumbs = () => thumbs || (thumbs = openThumbs(thumbsFile, { root: snap ? snapMeta.root : guard.root }));
const token = crypto.randomBytes(24).toString('base64url');
// The thumbnail cookie's own secret, good for nothing but thumbnails: a
// cookie reaches every service on this host whatever its port, so it
// must never be the session token.
const thumbKey = crypto.randomBytes(24).toString('base64url');
let port = Number(option('--port', 4173));

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.json': 'application/json',
  '.txt': 'text/plain; charset=utf-8',
};
const IMAGE_MIME = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp',
  '.svg': 'image/svg+xml', '.bmp': 'image/bmp', '.avif': 'image/avif', '.ico': 'image/x-icon',
};

const json = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
};

const fail = (res, err) => {
  const status = err instanceof GuardError ? err.status : 500;
  const explain = {
    EACCES: 'Permission denied by the operating system.',
    EPERM: 'The operating system did not permit this.',
    EBUSY: 'The item is in use by another program.',
    ENOSPC: 'The disk is full.',
    ENOTEMPTY: 'The folder is not empty.',
  }[err.code];
  if (!res.headersSent) {
    json(res, status, {
      ok: false, code: err.code || 'EIO', message: explain || err.message, affected: err.affected || [],
      // An archive refusal names the format found and the one the name suggests.
      ...(err.format !== undefined ? { format: err.format } : {}), ...(err.claimed ? { claimed: err.claimed } : {}),
      // A change that stopped part way names what it finished.
      ...(Array.isArray(err.results) ? { results: err.results } : {}),
    });
  } else res.end();
};

const readBody = (req) => new Promise((resolve, reject) => {
  let size = 0;
  const chunks = [];
  req.on('data', (c) => {
    size += c.length;
    if (size > 8 * 1024 * 1024) {
      reject(new GuardError('E2BIG', 'Request too large.', 413));
      req.destroy();
    } else chunks.push(c);
  });
  req.on('end', () => {
    try {
      resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
    } catch {
      reject(new GuardError('EJSON', 'Malformed request.'));
    }
  });
  req.on('error', reject);
});

/* ---------- change watching ---------- */

const listeners = new Set();
let watcher = null;
let watchState = snap ? 'snapshot' : flag('--no-watch') ? 'off' : 'idle';
let pendingDirs = new Set();
let pendingTimer = null;

const broadcast = (obj) => {
  const line = `data: ${JSON.stringify(obj)}\n\n`;
  for (const res of listeners) res.write(line);
};

const ops = snap ? null : makeOps(guard, { readOnly, onJob: (job) => broadcast({ type: 'job', ...job }) });

/* ---------- snapshot mode ---------- */

const SNAP_REFUSAL = 'Snapshot mode: Terrane is showing a recorded copy of the directory structure, so nothing on disk is read or changed. Start Terrane on the real directory to do this.';

// A newer snapshot landing in the folder is announced to open pages.
if (snap && !snapshotArg.endsWith('.db')) {
  let newest = snap.file();
  setInterval(() => {
    const now = listSnapshots(path.resolve(snapshotArg))[0];
    if (!now || now === newest) return;
    newest = now;
    try {
      snapMeta = snap.meta();
      broadcast({ type: 'snapshot', takenAt: snapMeta.takenAt, folders: snapMeta.folders, files: snapMeta.files });
    } catch { /* still being renamed into place */ }
  }, 5000).unref();
}

const snapInfo = () => ({
  version: VERSION, root: snapMeta.root, name: snapMeta.name, sep: snapMeta.sep, platform: snapMeta.platform,
  readOnly: true, watch: 'snapshot',
  snapshot: { takenAt: snapMeta.takenAt, folders: snapMeta.folders, files: snapMeta.files, bytes: snapMeta.bytes },
});

async function snapshotApi(req, res, route, q) {
  if (req.method !== 'GET') throw new GuardError('ESNAPSHOT', SNAP_REFUSAL, 403);
  if (route === 'info') return json(res, 200, snapInfo());
  if (route === 'scan') {
    const rel = relParts(q.get('path') || '').join('/');
    const depth = q.get('depth') ? Math.max(1, Number(q.get('depth'))) : Infinity;
    const ac = new AbortController();
    res.on('close', () => ac.abort());
    const it = snap.scan(rel, { depth, signal: ac.signal });
    let first;
    try {
      first = await it.next();
    } catch (err) {
      throw new GuardError(err.code || 'ENOENT', err.message, 404);
    }
    res.writeHead(200, { 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-store' });
    // The first batch was read to tell a missing folder from an empty
    // one; the rest follow it. Returning this generator returns the
    // snapshot's, whose finally closes the database.
    const rest = async function* () {
      try {
        for (let step = first; !step.done; step = await it.next()) yield step.value;
      } finally {
        await it.return();
      }
    };
    return pump(res, rest(), ac.signal);
  }
  if (route === 'stat') {
    const parts = relParts(q.get('path') || '');
    const s = snap.stat(parts.join('/'));
    if (!s) throw new GuardError('ENOENT', 'That item is not in the snapshot.', 404);
    return json(res, 200, {
      abs: [snapMeta.root, ...parts].join(snapMeta.sep), size: s.size, mtime: s.mtime,
      birthtime: null, atime: null, mode: null, dir: s.dir, link: null, snapshot: true,
    });
  }
  if (route === 'events') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
    res.write(`data: ${JSON.stringify({ type: 'watch', state: 'snapshot' })}\n\n`);
    listeners.add(res);
    const beat = setInterval(() => res.write(': keep-alive\n\n'), 25000);
    res.on('close', () => {
      clearInterval(beat);
      listeners.delete(res);
    });
    return undefined;
  }
  if (route === 'journal') return json(res, 200, { journal: [], holding: [], snapshot: true });
  if (route === 'raw') throw new GuardError('ESNAPSHOT', 'Previews of the original file are not available in snapshot mode: a snapshot holds names, sizes and dates, not contents.', 403);
  if (route === 'inside') throw new GuardError('ESNAPSHOT', 'Looking inside an archive is not available in snapshot mode: a snapshot holds names, sizes and dates, not what a file contains. Start Terrane on the real directory to do this.', 403);
  throw new GuardError('EROUTE', 'No such endpoint.', 404);
}

function startWatch(dirCount) {
  if (watchState !== 'idle') return;
  if (process.platform === 'linux' && dirCount > 15000) {
    watchState = 'manual';
    return;
  }
  try {
    watcher = fs.watch(guard.root, { recursive: true }, (_event, filename) => {
      if (!filename) return;
      const rel = String(filename).split(path.sep).join('/');
      if (rel === HOLD_DIR || rel.startsWith(HOLD_DIR + '/')) return;
      const dir = rel.includes('/') ? rel.slice(0, rel.lastIndexOf('/')) : '';
      pendingDirs.add(dir);
      if (!pendingTimer) {
        pendingTimer = setTimeout(() => {
          const dirs = [...pendingDirs];
          pendingDirs = new Set();
          pendingTimer = null;
          broadcast(dirs.length > 300 ? { type: 'bulk', count: dirs.length } : { type: 'change', dirs });
        }, 450);
      }
    });
    watcher.on('error', () => {
      watchState = 'manual';
      broadcast({ type: 'watch', state: 'manual' });
    });
    watchState = 'live';
  } catch {
    watchState = 'manual';
  }
}

/* ---------- duplicate hashing ---------- */

async function hashFile(abs) {
  const st = await fsp.stat(abs);
  const h = crypto.createHash('sha1');
  const FULL = 16 * 1024 * 1024;
  if (st.size <= FULL) {
    await new Promise((resolve, reject) => {
      fs.createReadStream(abs).on('data', (c) => h.update(c)).on('end', resolve).on('error', reject);
    });
    return { hash: h.digest('hex'), mode: 'full' };
  }
  const fd = await fsp.open(abs, 'r');
  try {
    const buf = Buffer.alloc(1024 * 1024);
    for (const pos of [0, Math.floor(st.size / 2), st.size - buf.length]) {
      const { bytesRead } = await fd.read(buf, 0, buf.length, pos);
      h.update(buf.subarray(0, bytesRead));
    }
    h.update(String(st.size));
  } finally {
    await fd.close();
  }
  return { hash: h.digest('hex'), mode: 'sampled' };
}

/* ---------- thumbnails ---------- */

function thumbApi(req, res, route, q) {
  const t = getThumbs();
  if (route === 'thumbs') {
    if (!t) return json(res, 200, { available: false, fields: [], rows: [] });
    const idx = t.index();
    const gz = /\bgzip\b/.test(String(req.headers['accept-encoding'] || ''));
    res.writeHead(200, {
      'Content-Type': 'application/json', 'Cache-Control': 'no-store', Vary: 'Accept-Encoding',
      ...(gz ? { 'Content-Encoding': 'gzip' } : {}),
    });
    return res.end(gz ? idx.gzip : idx.body);
  }
  const rel = relParts(q.get('path') || '').join('/');
  const hit = t?.get(rel, q.get('w') || '160');
  if (!hit) throw new GuardError('ENOTHUMB', 'There is no thumbnail for that item yet.', 404);
  if (req.headers['if-none-match'] === hit.etag) {
    res.writeHead(304, { ETag: hit.etag });
    return res.end();
  }
  res.writeHead(200, {
    'Content-Type': hit.type, 'Content-Length': hit.body.length, ETag: hit.etag,
    // A URL naming the current version never changes meaning.
    'Cache-Control': q.get('v') === hit.version ? 'private, max-age=31536000, immutable' : 'private, no-cache',
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "sandbox; default-src 'none'; style-src 'unsafe-inline'",
    ...(hit.gzip ? { 'Content-Encoding': 'gzip' } : {}),
  });
  return res.end(hit.body);
}

/* ---------- routes ---------- */

/** This service's thumbnail cookie from a request, or undefined. Other ports' cookies are ignored. */
const cookieOf = (req) => {
  const name = `terrane-${port}=`;
  for (const part of String(req.headers.cookie || '').split(';')) {
    const p = part.trim();
    if (p.startsWith(name)) return p.slice(name.length);
  }
  return undefined;
};

async function api(req, res, url) {
  const route = url.pathname.slice(5);
  const q = url.searchParams;
  const isThumb = req.method === 'GET' && (route === 'thumb' || route === 'thumbs');
  // Thumbnail URLs carry no token so they stay identical across restarts
  // and the browser cache survives; a SameSite=Strict cookie stands in,
  // named for this port and holding a secret that opens thumbnails only.
  const cookie = isThumb ? cookieOf(req) : undefined;
  const supplied = req.headers['x-terrane-token'] || q.get('t');
  if (supplied !== token && !(isThumb && !supplied && cookie === thumbKey)) throw new GuardError('ETOKEN', 'Missing or wrong session token. Reload the page from the address Terrane printed.', 401);
  if (isThumb) return thumbApi(req, res, route, q);
  if (snap) return snapshotApi(req, res, route, q);

  if (req.method === 'GET') {
    if (route === 'info') {
      return json(res, 200, {
        version: VERSION, root: guard.root, name: path.basename(guard.root) || guard.root, sep: path.sep,
        platform: process.platform, readOnly, watch: watchState,
      });
    }
    if (route === 'scan') {
      const rel = q.get('path') || '';
      const abs = guard.resolve(rel);
      await guard.assertDirInside(abs);
      const depth = q.get('depth') ? Math.max(1, Number(q.get('depth'))) : Infinity;
      const ac = new AbortController();
      res.on('close', () => ac.abort());
      res.writeHead(200, { 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-store' });
      return pump(res, scan(abs, { depth, signal: ac.signal, isRoot: rel === '' }), ac.signal);
    }
    if (route === 'stat') {
      const abs = guard.resolve(q.get('path') || '');
      await guard.assertParentInside(abs);
      const st = await fsp.lstat(abs);
      let link = null;
      if (st.isSymbolicLink()) {
        try {
          link = await fsp.readlink(abs);
        } catch { /* unreadable link */ }
      }
      return json(res, 200, {
        abs, size: st.size, mtime: st.mtimeMs, birthtime: st.birthtimeMs, atime: st.atimeMs, mode: st.mode & 0o777,
        dir: st.isDirectory(), link,
      });
    }
    if (route === 'raw') {
      const abs = guard.resolve(q.get('path') || '', { allowRoot: false });
      await guard.assertParentInside(abs);
      const real = await guard.realInside(abs);
      const st = await fsp.stat(real);
      if (!st.isFile()) throw new GuardError('ENOTFILE', 'Not a regular file.');
      const max = Math.min(Number(q.get('max')) || 262144, 32 * 1024 * 1024);
      const type = IMAGE_MIME[path.extname(abs).toLowerCase()] || 'text/plain; charset=utf-8';
      res.writeHead(200, {
        'Content-Type': type, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store',
        'Content-Security-Policy': "sandbox; default-src 'none'; style-src 'unsafe-inline'",
        'X-Terrane-Truncated': st.size > max ? '1' : '0',
      });
      if (st.size === 0) return res.end();
      return fs.createReadStream(real, { start: 0, end: Math.min(st.size, max) - 1 }).on('error', () => res.end()).pipe(res);
    }
    if (route === 'inside') {
      // The /raw sequence: lexical check, parent's real location, the
      // file's own real location, then a regular file. Entry names that
      // come back are data and are never joined to a path on disk.
      const rel = q.get('path') || '';
      const abs = guard.resolve(rel, { allowRoot: false });
      await guard.assertParentInside(abs);
      const name = path.basename(abs);
      let st;
      const real = await guard.realInside(abs, { gone: `${name} is no longer there.` });
      if (real === guard.root) throw new GuardError('EOUTSIDE', 'This link points outside the authorized directory.', 403);
      try {
        st = await fsp.stat(real);
      } catch (err) {
        throw new GuardError(err.code || 'ENOENT', `${name} is no longer there.`, 404);
      }
      if (!st.isFile()) throw new GuardError('ENOTFILE', st.isDirectory() ? `${name} is a folder, not an archive file.` : `${name} is not a regular file.`);
      const ac = new AbortController();
      res.on('close', () => ac.abort());
      try {
        return json(res, 200, await inspect(real, { name, signal: ac.signal }));
      } catch (err) {
        if (ac.signal.aborted) return undefined;
        throw err;
      }
    }
    if (route === 'events') {
      startWatch(Number(q.get('dirs')) || 0);
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
      res.write(`data: ${JSON.stringify({ type: 'watch', state: watchState })}\n\n`);
      for (const job of ops.jobs()) res.write(`data: ${JSON.stringify({ type: 'job', ...job })}\n\n`);
      listeners.add(res);
      const beat = setInterval(() => res.write(': keep-alive\n\n'), 25000);
      res.on('close', () => {
        clearInterval(beat);
        listeners.delete(res);
      });
      return undefined;
    }
    if (route === 'journal') return json(res, 200, { journal: await ops.journal(), holding: await ops.holding() });
  }

  if (req.method === 'POST') {
    if (!String(req.headers['content-type'] || '').startsWith('application/json')) {
      throw new GuardError('ETYPE', 'Requests must be JSON.', 415);
    }
    const body = await readBody(req);
    if (route === 'op') return json(res, 200, await ops.run(body));
    if (route === 'undo') return json(res, 200, await ops.undo());
    if (route === 'restore') return json(res, 200, await ops.restore(body.ids || []));
    if (route === 'purge') return json(res, 200, await ops.purge());
    if (route === 'cancel') return json(res, 200, ops.cancel(String(body.job || '')));
    if (route === 'hash') {
      const paths = (body.paths || []).slice(0, 4000);
      const results = new Array(paths.length);
      let next = 0;
      const worker = async () => {
        while (next < paths.length) {
          const i = next++;
          try {
            const abs = guard.resolve(paths[i], { allowRoot: false });
            await guard.assertParentInside(abs);
            // Reading follows a link, so its end must be inside the root,
            // as for a preview.
            results[i] = await hashFile(await guard.realInside(abs));
          } catch (err) {
            results[i] = { error: err.code || 'EIO' };
          }
        }
      };
      await Promise.all([worker(), worker(), worker(), worker()]);
      return json(res, 200, { results });
    }
  }
  throw new GuardError('EROUTE', 'No such endpoint.', 404);
}

async function serveStatic(req, res, url) {
  let rel;
  try {
    rel = decodeURIComponent(url.pathname);
  } catch {
    throw new GuardError('EPATH', 'Not found.', 404);
  }
  if (rel === '/') rel = '/index.html';
  if (rel.includes('\0')) throw new GuardError('EPATH', 'Not found.', 404);
  const abs = path.join(WEB, rel);
  if (!abs.startsWith(WEB + path.sep)) throw new GuardError('EPATH', 'Not found.', 404);
  let st;
  try {
    st = await fsp.stat(abs);
  } catch {
    throw new GuardError('ENOENT', 'Not found.', 404);
  }
  if (!st.isFile()) throw new GuardError('ENOENT', 'Not found.', 404);
  const page = rel === '/index.html';
  const headers = {
    'Content-Type': MIME[path.extname(abs)] || 'application/octet-stream',
    // The page carries this session's token, so it is never stored. Every
    // other file is revalidated: the browser keeps it and asks with its
    // ETag, and an unchanged file costs a 304 instead of a download.
    'Cache-Control': page ? 'no-store' : 'no-cache',
    'X-Content-Type-Options': 'nosniff',
  };
  if (!page) {
    const etag = `W/"${st.size.toString(36)}-${Math.trunc(st.mtimeMs).toString(36)}"`;
    headers.ETag = etag;
    if (req.headers['if-none-match'] === etag) {
      res.writeHead(304, headers);
      return res.end();
    }
  }
  let data;
  try {
    data = await fsp.readFile(abs);
  } catch {
    throw new GuardError('ENOENT', 'Not found.', 404);
  }
  if (page) {
    data = Buffer.from(data.toString('utf8').replace('__TERRANE_TOKEN__', token));
    headers['Content-Security-Policy'] = "default-src 'self'; img-src 'self' blob: data:; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'";
    headers['Referrer-Policy'] = 'no-referrer';
    // Lets thumbnail images authenticate without a token in their URL:
    // a secret of its own, named for this port, so another service on this
    // host never sees the session token and a second Terrane never
    // overwrites this one's cookie.
    headers['Set-Cookie'] = `terrane-${port}=${thumbKey}; Path=/api/; HttpOnly; SameSite=Strict`;
  }
  res.writeHead(200, headers);
  res.end(data);
}

const server = http.createServer(async (req, res) => {
  try {
    const host = String(req.headers.host || '');
    if (host !== `127.0.0.1:${port}` && host !== `localhost:${port}`) {
      throw new GuardError('EHOST', 'Terrane only answers on its loopback address.', 403);
    }
    const url = new URL(req.url, `http://${host}`);
    if (url.pathname.startsWith('/api/')) await api(req, res, url);
    else if (req.method === 'GET') await serveStatic(req, res, url);
    else throw new GuardError('EROUTE', 'Not found.', 404);
  } catch (err) {
    fail(res, err);
  }
});

const listen = (attempt = 0) => {
  server.once('error', (err) => {
    if (err.code === 'EADDRINUSE' && attempt < 20) {
      port += 1;
      listen(attempt + 1);
    } else {
      console.error(`\n  Could not start: ${err.message}\n`);
      process.exit(1);
    }
  });
  server.listen(port, '127.0.0.1', () => {
    const address = `http://127.0.0.1:${port}/`;
    console.log([
      '',
      `  Terrane ${VERSION}`,
      ...(snap
        ? [`  Snapshot of          : ${snapMeta.root}`,
          `  Taken                : ${new Date(snapMeta.takenAt).toLocaleString('en-US')} (${snapMeta.files.toLocaleString('en-US')} files)`,
          '  Mode                 : snapshot (no real file is read or changed)']
        : [`  Authorized directory : ${guard.root}`,
          `  Mode                 : ${readOnly ? 'read-only' : 'read and write (no overwrite, no direct delete)'}`]),
      `  Open                 : ${address}`,
      '',
      '  Ctrl+C to stop.',
      '',
    ].join('\n'));
    if (!flag('--no-open')) {
      const [cmd, a] = process.platform === 'win32' ? ['explorer.exe', [address]]
        : process.platform === 'darwin' ? ['open', [address]] : ['xdg-open', [address]];
      const child = spawn(cmd, a, { detached: true, stdio: 'ignore', windowsHide: true });
      child.on('error', () => {});
      child.unref();
    }
  });
};
listen();

let stopping = false;
const stop = async () => {
  if (stopping) process.exit(1);
  stopping = true;
  watcher?.close();
  server.close();
  if (ops?.jobs().length) {
    console.log('  Cancelling running operations and removing their partial output…');
    await ops.shutdown();
  }
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
