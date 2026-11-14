#!/usr/bin/env node
/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Demo Tool (Terrane Edition - v1.0)
 *     - File Name: demo.mjs
 *     - Relative Path: tools/demo.mjs
 *     - Artifact Type: CLI
 *     - Version: 1.0.0
 *     - Date: 11/13/2026
 *     - Update: Friday, November 13, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Description:
 *     Two ways to use the demo world locally. serve hosts the repository
 *     the way GitHub Pages does, so the page runs the demo world in the
 *     browser with nothing else started. write puts the same world on
 *     disk as real folders and files, for running the real service, and
 *     every operation on it, somewhere that does not matter.
 *
 * ✒ Key Features:
 *     - serve: a static server on the loopback address over the
 *       repository root, with the root page forwarding to web/ as on
 *       Pages; no /api/ route, so the page answers itself
 *     - serve hides every dot-path (.git included) and anything outside
 *       the repository
 *     - write: the demo world's folders and files with their dates; text
 *       files carry their generated contents at their exact sizes, files
 *       of 1 MB and over are sparse at their declared sizes, links are
 *       links where the system allows them
 *     - write refuses a path that already exists, and marks its output
 *       with a note at the root
 *     - The same seed as the browser, so the tree on disk is the tree on
 *       the page, a few files of the tool's own aside
 *
 * ✒ Usage Instructions:
 *     node tools/demo.mjs [serve] [--port <n>]
 *     node tools/demo.mjs write <folder>
 *     npm run demo
 *     npm run demo -- write C:\temp\terrane-demo
 *
 * ✒ Examples:
 *     npm run demo                                  then open the address it prints
 *     npm run demo -- --port 4190
 *     npm run demo -- write C:\temp\studio
 *     npm start -- C:\temp\studio                   the real service on the written world
 *     node tools/demo.mjs write /tmp/studio
 *
 * ✒ Command-Line Arguments:
 *     Input:
 *         serve              Host the repository as GitHub Pages does
 *                            (the default).
 *         write <folder>     Write the demo world into a new folder.
 *     Processing:
 *         --port <n>         Port for serve (default 4180).
 *
 * ✒ Other Important Information:
 *     - Dependencies: Node.js built-ins only; web/js/demo-world.js;
 *       fsutil on Windows for sparse files
 *     - Compatible platforms: Windows, macOS, Linux; Node.js 20+
 *     - Limitations: written zip files are sparse placeholders, so their
 *       interiors are listed by the browser demo only. Symbolic links need
 *       Developer Mode or an elevated prompt on Windows and are skipped
 *       without it. The sealed folder is sealed only where permissions
 *       allow it (not on Windows). A volume without sparse files (FAT32,
 *       exFAT) leaves large files empty.
 *     - Security: serve answers on 127.0.0.1 only and never lists a
 *       folder; write never writes outside the folder it creates
 * ----------------------------------------------------------------------------
 */

import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildWorld, textOf, FLAG_LINK, FLAG_SPECIAL } from '../web/js/demo-world.js';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SPARSE_MIN = 1024 * 1024;
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp',
  '.woff2': 'font/woff2', '.json': 'application/json', '.md': 'text/markdown; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
  '.ico': 'image/x-icon',
};

const args = process.argv.slice(2);
const option = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const words = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--port');
const command = words[0] || 'serve';

function fail(message) {
  console.error(`\n  ${message}\n`);
  process.exit(1);
}

/* ---------- serve ---------- */

function serve(port) {
  const server = http.createServer((req, res) => {
    const host = String(req.headers.host || '');
    if (host !== `127.0.0.1:${port}` && host !== `localhost:${port}`) {
      res.writeHead(403);
      res.end('Loopback only.');
      return;
    }
    let rel;
    try {
      rel = decodeURIComponent(new URL(req.url, `http://${host}`).pathname);
    } catch {
      rel = '/';
    }
    if (rel.endsWith('/')) rel += 'index.html';
    const file = path.join(REPO, rel);
    const inside = file.startsWith(REPO + path.sep);
    const dotted = rel.split('/').some((p) => p.startsWith('.') && p !== '.nojekyll');
    let ok = false;
    try {
      ok = inside && !dotted && !rel.includes('\0') && fs.statSync(file).isFile();
    } catch { /* missing */ }
    if (req.method !== 'GET' || !ok) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found.');
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
    fs.createReadStream(file).pipe(res);
  });
  server.on('error', (err) => fail(err.code === 'EADDRINUSE' ? `Port ${port} is taken. Try: npm run demo -- --port ${port + 1}` : err.message));
  server.listen(port, '127.0.0.1', () => {
    console.log('\n  Terrane demo, served as GitHub Pages serves it');
    console.log(`  Open:  http://127.0.0.1:${port}/web/`);
    console.log('  The page builds the demo world itself; nothing on this computer is shown or changed.');
    console.log('  Ctrl+C to stop.\n');
  });
}

/* ---------- write ---------- */

const run = (cmd, argv) => new Promise((resolve) => {
  execFile(cmd, argv, { windowsHide: true }, (err) => resolve(!err));
});

async function inParallel(items, limit, fn) {
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      await fn(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}

async function write(target) {
  if (!target) fail('Usage: node tools/demo.mjs write <folder>');
  const out = path.resolve(target);
  if (fs.existsSync(out)) fail(`Refusing to write into an existing path: ${out}`);
  const started = Date.now();
  const world = buildWorld({ now: started });
  const win = process.platform === 'win32';
  const big = [];
  const dirs = [];
  let files = 0;
  let links = 0;
  let skippedLinks = 0;
  let sealed = null;

  const put = (node, abs, rel) => {
    if (node.dir) {
      fs.mkdirSync(abs, { recursive: true });
      dirs.push([abs, node.mtime]);
      if (node.err) sealed = abs;
      for (const k of node.kids.values()) put(k, path.join(abs, k.name), rel ? `${rel}/${k.name}` : k.name);
      return;
    }
    if (node.flags & FLAG_SPECIAL) return;
    if (node.flags & FLAG_LINK) {
      try {
        fs.symlinkSync(node.link, abs);
        links++;
      } catch {
        skippedLinks++;
      }
      return;
    }
    files++;
    if (node.size >= SPARSE_MIN) {
      fs.writeFileSync(abs, '');
      big.push([abs, node.size, node.mtime]);
      return;
    }
    fs.writeFileSync(abs, textOf(node, node.size, rel), 'latin1');
    const t = node.mtime / 1000;
    fs.utimesSync(abs, t, t);
  };
  console.log(`  Writing the demo world (${world.stats.files.toLocaleString('en-US')} files) to ${out}`);
  put(world.root, out, '');
  fs.writeFileSync(path.join(out, 'ABOUT-THIS-FOLDER.txt'), [
    'This folder is the Terrane demo world, written by tools/demo.mjs.',
    'Every name, file and date in it is invented. Large files are sparse and hold no data.',
    'Point Terrane at it to try every operation somewhere that does not matter:',
    `    npm start -- "${out}"`,
    '',
  ].join('\n'));

  let sparseFailed = 0;
  let done = 0;
  await inParallel(big, win ? 16 : 4, async ([abs, size, mtime]) => {
    const ok = !win || await run('fsutil', ['sparse', 'setflag', abs]);
    const fd = fs.openSync(abs, 'r+');
    if (ok) fs.ftruncateSync(fd, size);
    else sparseFailed++;
    fs.futimesSync(fd, mtime / 1000, mtime / 1000);
    fs.closeSync(fd);
    if (++done % 250 === 0 && process.stdout.isTTY) process.stdout.write(`\r  Large files: ${done} of ${big.length}`);
  });
  if (process.stdout.isTTY) process.stdout.write('\r\x1b[K');
  // Folder dates last, deepest first, since writing into a folder moves its date.
  for (const [abs, mtime] of dirs.reverse()) {
    try {
      fs.utimesSync(abs, mtime / 1000, mtime / 1000);
    } catch { /* a folder the system will not date */ }
  }
  if (sealed && !win) fs.chmodSync(sealed, 0o000);
  console.log(`  Wrote ${dirs.length.toLocaleString('en-US')} folders and ${files.toLocaleString('en-US')} files (${big.length.toLocaleString('en-US')} sparse) in ${((Date.now() - started) / 1000).toFixed(1)} s`);
  if (links) console.log(`  Links: ${links}`);
  if (skippedLinks) console.log(`  Links skipped: ${skippedLinks} (this system does not allow creating them here)`);
  if (sparseFailed) console.log(`  ${sparseFailed} large files could not be made sparse on this volume and were left empty`);
  console.log(`  Try it:  npm start -- "${out}"`);
}

if (command === 'serve') serve(Number(option('--port')) || 4180);
else if (command === 'write') await write(words[1]);
else fail('Usage: node tools/demo.mjs [serve] [--port <n>] | write <folder>');
