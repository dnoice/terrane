#!/usr/bin/env node
/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Terrane Service (Terrane Edition - v1.0)
 *     - File Name: terrane.mjs
 *     - Relative Path: server/terrane.mjs
 *     - Artifact Type: CLI
 *     - Version: 1.0.0
 *     - Date: 11/09/2026
 *     - Update: Monday, November 9, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Fable 5.2
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Description:
 *     The local service behind Terrane. It is given exactly one directory on
 *     the command line, serves the interface on the loopback address, and
 *     exposes that directory (and nothing else) to the browser: progressive
 *     scanning, metadata, previews, guarded file operations, undo, and live
 *     change notifications.
 *
 * ✒ Key Features:
 *     - Explicit authorization: no directory argument, no service
 *     - Loopback only (127.0.0.1), Host-header check against DNS rebinding,
 *       and a per-session token required on every API call
 *     - NDJSON scan stream with backpressure, cancelled when the tab closes
 *     - Server-sent change events from a recursive watcher, debounced and
 *       reduced to the set of folders that need re-reading
 *     - Duplicate verification by content hash (full SHA-1 up to 16 MB,
 *       three sampled megabytes plus size beyond that, reported as such)
 *     - Sandboxed raw-file endpoint for previews: capped length, nosniff,
 *       and a CSP sandbox so a previewed HTML or SVG file cannot run
 *     - Zero npm dependencies; three.js and the fonts are vendored in web/
 *
 * ✒ Usage Instructions:
 *     node server/terrane.mjs <directory> [options]
 *     The service prints its address and opens it in the default browser.
 *     Stop it with Ctrl+C.
 *
 * ✒ Examples:
 *     node server/terrane.mjs "C:\Users\DnnsS\OneDrive\Desktop\dd1\projects"
 *     node server/terrane.mjs ~/Music --read-only
 *     node server/terrane.mjs /srv/share --port 5050 --no-open
 *     node server/terrane.mjs . --no-watch
 *
 * ✒ Command-Line Arguments:
 *     Input:
 *         <directory>     The one directory Terrane may read and change.
 *     Safety:
 *         --read-only     Refuse every operation that changes the disk.
 *     Processing:
 *         --no-watch      Do not watch for outside changes (manual refresh).
 *     Output:
 *         --port <n>      Preferred port (default 4173; next free is used).
 *         --no-open       Do not open the browser automatically.
 *
 * ✒ Other Important Information:
 *     - Dependencies: Node.js built-ins only
 *     - Compatible platforms: Node.js 20+ on Windows, macOS, Linux
 *     - Security: the token defends against other web pages, not against
 *       other programs running as the same user, which already have the
 *       same filesystem access the service has
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
import { makeGuard, GuardError, HOLD_DIR } from './guard.mjs';
import { scan } from './scan.mjs';
import { makeOps } from './ops.mjs';

const VERSION = '1.0.0';
const WEB = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'web');

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const positional = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--port');

if (positional.length !== 1 || flag('--help')) {
  console.error([
    '',
    '  Terrane ' + VERSION,
    '  Usage: node server/terrane.mjs <directory> [--read-only] [--port n] [--no-open] [--no-watch]',
    '',
    '  Terrane only works inside the directory you name here.',
    '',
  ].join('\n'));
  process.exit(positional.length === 1 ? 0 : 1);
}

let guard;
try {
  guard = await makeGuard(positional[0]);
} catch (err) {
  console.error(`\n  Cannot use "${positional[0]}": ${err.message}\n`);
  process.exit(1);
}
const readOnly = flag('--read-only');
const ops = makeOps(guard, { readOnly });
const token = crypto.randomBytes(24).toString('base64url');
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
  if (!res.headersSent) json(res, status, { ok: false, code: err.code || 'EIO', message: explain || err.message, affected: err.affected || [] });
  else res.end();
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
let watchState = flag('--no-watch') ? 'off' : 'idle';
let pendingDirs = new Set();
let pendingTimer = null;

const broadcast = (obj) => {
  const line = `data: ${JSON.stringify(obj)}\n\n`;
  for (const res of listeners) res.write(line);
};

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

/* ---------- routes ---------- */

async function api(req, res, url) {
  const route = url.pathname.slice(5);
  const q = url.searchParams;
  const supplied = req.headers['x-terrane-token'] || q.get('t');
  if (supplied !== token) throw new GuardError('ETOKEN', 'Missing or wrong session token. Reload the page from the address Terrane printed.', 401);

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
      for await (const batch of scan(abs, { depth, signal: ac.signal, isRoot: rel === '' })) {
        if (ac.signal.aborted) break;
        if (!res.write(JSON.stringify(batch) + '\n')) await new Promise((r) => res.once('drain', r));
      }
      return res.end();
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
      const real = await fsp.realpath(abs);
      if (!(real === guard.root || real.startsWith(guard.root + path.sep))) {
        throw new GuardError('EOUTSIDE', 'This link points outside the authorized directory.', 403);
      }
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
    if (route === 'events') {
      startWatch(Number(q.get('dirs')) || 0);
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
      res.write(`data: ${JSON.stringify({ type: 'watch', state: watchState })}\n\n`);
      listeners.add(res);
      const beat = setInterval(() => res.write(': keep-alive\n\n'), 25000);
      res.on('close', () => {
        clearInterval(beat);
        listeners.delete(res);
      });
      return undefined;
    }
    if (route === 'journal') return json(res, 200, { journal: ops.journal(), holding: await ops.holding() });
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
            results[i] = await hashFile(abs);
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
  let rel = decodeURIComponent(url.pathname);
  if (rel === '/') rel = '/index.html';
  const abs = path.join(WEB, rel);
  if (!abs.startsWith(WEB + path.sep)) throw new GuardError('EPATH', 'Not found.', 404);
  let data;
  try {
    data = await fsp.readFile(abs);
  } catch {
    throw new GuardError('ENOENT', 'Not found.', 404);
  }
  const headers = {
    'Content-Type': MIME[path.extname(abs)] || 'application/octet-stream',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  };
  if (rel === '/index.html') {
    data = Buffer.from(data.toString('utf8').replace('__TERRANE_TOKEN__', token));
    headers['Content-Security-Policy'] = "default-src 'self'; img-src 'self' blob: data:; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'";
    headers['Referrer-Policy'] = 'no-referrer';
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
      `  Authorized directory : ${guard.root}`,
      `  Mode                 : ${readOnly ? 'read-only' : 'read and write (no overwrite, no direct delete)'}`,
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

process.on('SIGINT', () => {
  watcher?.close();
  server.close();
  process.exit(0);
});
