#!/usr/bin/env node
/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Service Smoke Test (Terrane Edition - v1.0)
 *     - File Name: smoke-test.mjs
 *     - Relative Path: tools/smoke-test.mjs
 *     - Artifact Type: test
 *     - Version: 1.0.0
 *     - Date: 11/09/2026
 *     - Update: Monday, November 9, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Fable 5.2
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Description:
 *     Starts the real Terrane service against a throwaway directory it
 *     creates in the system temp folder, performs every operation through
 *     the HTTP API, and checks the result on disk with the filesystem
 *     itself. It proves the operations are real, that refusals refuse, and
 *     that undo returns the directory to its exact starting state.
 *
 * ✒ Key Features:
 *     - Boundary checks: missing token, foreign Host header, traversal,
 *       holding-area access, and a write through an escaping symbolic link
 *     - Every mutation verified on disk: mkdir, rename, move, copy,
 *       duplicate, remove to holding, restore
 *     - Collision checks: nothing is overwritten and nothing moves when a
 *       batch is refused; "keep both" picks a free name
 *     - Full undo chain compared against a snapshot of names, sizes and
 *       content hashes taken before the first change
 *     - Read-only mode refuses mutations
 *     - Duplicate hashing distinguishes true copies from same-size files
 *
 * ✒ Usage Instructions:
 *     node tools/smoke-test.mjs
 *     Exit code 0 means every check passed. The temp directory is removed
 *     afterwards.
 *
 * ✒ Other Important Information:
 *     - Dependencies: Node.js built-ins only; server/terrane.mjs
 *     - Compatible platforms: Node.js 20+; the symbolic-link check is
 *       skipped where links cannot be created
 * ----------------------------------------------------------------------------
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SERVER = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'server', 'terrane.mjs');
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'terrane-smoke-'));
const root = path.join(work, 'root');
const outside = path.join(work, 'outside');
fs.mkdirSync(path.join(root, 'docs', 'drafts'), { recursive: true });
fs.mkdirSync(path.join(root, 'media'));
fs.mkdirSync(outside);
fs.writeFileSync(path.join(root, 'docs', 'a.txt'), 'alpha');
fs.writeFileSync(path.join(root, 'docs', 'b.txt'), 'bravo');
fs.writeFileSync(path.join(root, 'docs', 'drafts', 'c.txt'), 'charlie');
fs.writeFileSync(path.join(root, 'media', 'a.txt'), 'media-alpha');
fs.writeFileSync(path.join(root, 'media', 'x.bin'), Buffer.alloc(9000, 'q'));
fs.writeFileSync(path.join(root, 'media', 'y.bin'), Buffer.alloc(9000, 'q'));
fs.writeFileSync(path.join(root, 'media', 'z.bin'), Buffer.alloc(9000, 'r'));
let linked = false;
try {
  fs.symlinkSync(outside, path.join(root, 'escape'), 'dir');
  linked = true;
} catch { /* no link privilege */ }

let passed = 0;
let failed = 0;
const check = (name, cond, detail = '') => {
  if (cond) passed++;
  else failed++;
  console.log(`${cond ? '  ok  ' : ' FAIL '} ${name}${cond || !detail ? '' : ' — ' + detail}`);
};
const has = (...p) => fs.existsSync(path.join(root, ...p));
const read = (...p) => fs.readFileSync(path.join(root, ...p), 'utf8');

function snapshot(dir = root, rel = '') {
  const out = [];
  for (const d of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (d.name === '.terrane-trash') continue;
    const r = rel ? `${rel}/${d.name}` : d.name;
    if (d.isDirectory()) out.push(`${r}/`, ...snapshot(path.join(dir, d.name), r));
    else if (d.isSymbolicLink()) out.push(`${r}@`);
    else out.push(`${r}:${crypto.createHash('sha1').update(fs.readFileSync(path.join(dir, d.name))).digest('hex')}`);
  }
  return out;
}

async function boot(extra, port) {
  const child = spawn(process.execPath, [SERVER, root, '--no-open', '--no-watch', '--port', String(port), ...extra], { stdio: ['ignore', 'pipe', 'inherit'] });
  const actual = await new Promise((resolve, reject) => {
    let buf = '';
    child.stdout.on('data', (c) => {
      buf += c;
      const m = buf.match(/127\.0\.0\.1:(\d+)/);
      if (m) resolve(Number(m[1]));
    });
    child.on('exit', () => reject(new Error('service exited')));
  });
  const request = (method, route, { body, token, host } = {}) => new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({ host: '127.0.0.1', port: actual, path: route, method, headers: {
      ...(host ? { Host: host } : {}), ...(token ? { 'X-Terrane-Token': token } : {}),
      ...(data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {}),
    } }, (res) => {
      let text = '';
      res.on('data', (c) => { text += c; });
      res.on('end', () => {
        let parsed = text;
        try {
          parsed = JSON.parse(text);
        } catch { /* ndjson or html */ }
        resolve({ status: res.statusCode, body: parsed, text });
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
  const page = await request('GET', '/');
  const token = page.text.match(/terrane-token" content="([^"]+)"/)[1];
  return {
    child, token, request,
    get: (route) => request('GET', route, { token }),
    op: (body) => request('POST', '/api/op', { token, body }),
    post: (route, body = {}) => request('POST', route, { token, body }),
  };
}

const before = snapshot();
const s = await boot([], 4390);

console.log('\nBoundary');
check('API refuses a request without the token', (await s.request('GET', '/api/info')).status === 401);
check('API refuses a foreign Host header', (await s.request('GET', '/api/info', { token: s.token, host: 'evil.example:80' })).status === 403);
check('traversal segments are refused', (await s.get('/api/scan?path=' + encodeURIComponent('../outside'))).status === 400);
check('the holding area cannot be addressed', (await s.get('/api/scan?path=.terrane-trash')).status === 403);
if (linked) {
  const r = await s.op({ type: 'mkdir', parent: 'escape', name: 'planted' });
  check('write through an escaping symbolic link is refused', r.status === 403 && !fs.existsSync(path.join(outside, 'planted')), JSON.stringify(r.body));
  check('scan through an escaping symbolic link is refused', (await s.get('/api/scan?path=escape')).status === 403);
}
check('invalid names are refused', (await s.op({ type: 'mkdir', parent: '', name: 'a/b' })).status === 400 && (await s.op({ type: 'mkdir', parent: '', name: '..' })).status === 400);
check('the root itself cannot be renamed or removed', (await s.op({ type: 'rename', path: '', name: 'x' })).status === 403 && (await s.op({ type: 'trash', paths: [''] })).status === 403);

console.log('\nScan');
const scan = await s.get('/api/scan?path=');
const records = scan.text.trim().split('\n').flatMap((l) => JSON.parse(l));
check('scan streams one record per folder', records.length === (linked ? 4 : 4) && records[0][1] === -1, `${records.length} records`);
check('symbolic link is reported as a link, not followed', !linked || records[0][5].includes('escape'));
const shallow = (await s.get('/api/scan?path=docs&depth=1')).text.trim().split('\n').flatMap((l) => JSON.parse(l));
check('depth=1 stubs child folders', shallow.length === 2 && shallow[1][4] === 'STUB');

console.log('\nOperations');
let r = await s.op({ type: 'mkdir', parent: 'docs', name: 'New folder' });
check('mkdir creates the folder on disk', r.status === 200 && has('docs', 'New folder'));
check('mkdir refuses an existing name', (await s.op({ type: 'mkdir', parent: 'docs', name: 'New folder' })).status === 409);
r = await s.op({ type: 'rename', path: 'docs/a.txt', name: 'alpha.txt' });
check('rename changes the name on disk', r.status === 200 && has('docs', 'alpha.txt') && !has('docs', 'a.txt') && read('docs', 'alpha.txt') === 'alpha');
r = await s.op({ type: 'rename', path: 'docs/alpha.txt', name: 'b.txt' });
check('rename onto an existing file is refused and both survive', r.status === 409 && read('docs', 'alpha.txt') === 'alpha' && read('docs', 'b.txt') === 'bravo');
r = await s.op({ type: 'rename', path: 'docs/alpha.txt', name: 'a.txt' });
r = await s.op({ type: 'move', paths: ['docs/b.txt', 'docs/a.txt'], dest: 'media' });
check('a batch with a collision is refused whole', r.status === 409 && has('docs', 'b.txt') && has('docs', 'a.txt') && read('media', 'a.txt') === 'media-alpha', JSON.stringify(r.body));
r = await s.op({ type: 'move', paths: ['docs/b.txt', 'docs/a.txt'], dest: 'media', onConflict: 'keepBoth' });
check('keep both moves under a free name without overwriting', r.status === 200 && has('media', 'b.txt') && read('media', 'a copy.txt') === 'alpha' && read('media', 'a.txt') === 'media-alpha' && !has('docs', 'a.txt'));
r = await s.op({ type: 'move', paths: ['docs'], dest: 'docs/drafts' });
check('a folder cannot be moved into itself', r.status === 400 && has('docs', 'drafts', 'c.txt'));
r = await s.op({ type: 'copy', paths: ['docs/drafts'], dest: 'media' });
check('copy duplicates a folder with its contents', r.status === 200 && read('media', 'drafts', 'c.txt') === 'charlie' && has('docs', 'drafts', 'c.txt'));
r = await s.op({ type: 'copy', paths: ['media/x.bin'], dest: 'media' });
check('duplicate in place picks a "copy" name', r.status === 200 && has('media', 'x copy.bin') && has('media', 'x.bin'));
r = await s.op({ type: 'trash', paths: ['media/drafts', 'media/drafts/c.txt', 'media/z.bin'] });
check('remove takes items off disk into the holding area', r.status === 200 && !has('media', 'drafts') && !has('media', 'z.bin'));
let j = (await s.get('/api/journal')).body;
check('holding area lists what was removed', j.holding.length === 2 && j.holding.some((h) => h.origin === 'media/z.bin'), JSON.stringify(j.holding));
r = await s.post('/api/restore', { ids: [j.holding.find((h) => h.name === 'z.bin').id] });
check('restore puts a held item back', r.status === 200 && has('media', 'z.bin') && fs.readFileSync(path.join(root, 'media', 'z.bin'))[0] === 0x72);

console.log('\nDuplicates');
r = await s.post('/api/hash', { paths: ['media/x.bin', 'media/y.bin', 'media/z.bin'] });
check('hashing separates true copies from same-size files', r.body.results[0].hash === r.body.results[1].hash && r.body.results[0].hash !== r.body.results[2].hash);

console.log('\nUndo');
let steps = 0;
for (;;) {
  r = await s.post('/api/undo');
  if (r.status !== 200) break;
  steps++;
}
check('undo stops with a clear message when the journal is empty', r.status === 409 && /nothing to undo/i.test(r.body.message));
// The one restore above was not an undo of its trash entry, so replaying
// that entry's undo restores the remaining held item only.
const after = snapshot();
const expected = [...before];
check(`undo chain (${steps} steps) returns the directory to its starting state`, JSON.stringify(after) === JSON.stringify(expected),
  `\n   before: ${before.join(' ')}\n   after:  ${after.join(' ')}`);
s.child.kill();

console.log('\nRead-only mode');
const ro = await boot(['--read-only'], 4395);
r = await ro.op({ type: 'mkdir', parent: '', name: 'nope' });
check('read-only refuses mutations with an explanation', r.status === 403 && /read-only/i.test(r.body.message) && !has('nope'));
check('read-only still scans', (await ro.get('/api/scan?path=')).status === 200);
ro.child.kill();

fs.rmSync(work, { recursive: true, force: true });
console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
