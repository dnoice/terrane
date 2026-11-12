#!/usr/bin/env node
/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Service Smoke Test (Terrane Edition - v1.1)
 *     - File Name: smoke-test.mjs
 *     - Relative Path: tools/smoke-test.mjs
 *     - Artifact Type: test
 *     - Version: 1.1.0
 *     - Date: 11/11/2026
 *     - Update: Wednesday, November 11, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Changelog:
 *     - 1.1.0 (11/11/2026) [dendogg + Anthropic - Claude Opus 5.5] — The
 *       undo chain now runs in a second service process, proving the
 *       journal survives a restart. Adds progress and cancellation checks
 *       (mid-file, while queued, after finishing), a full streamed copy
 *       verified by hash and modification time, a tampered journal that
 *       tries to leave the root, and an unreadable journal set aside.
 *       Snapshot mode is checked against a live scan record for record.
 *     - 1.0.0 (11/09/2026) [dendogg + Anthropic - Claude Fable 5.2] —
 *       Initial release.
 *
 * ✒ Description:
 *     Starts the real Terrane service against a throwaway directory it
 *     creates in the system temp folder, performs every operation through
 *     the HTTP API, and checks the result on disk with the filesystem
 *     itself. It proves the operations are real, that refusals refuse, that
 *     long operations can be watched and cancelled, and that undo, run by a
 *     restarted service, returns the directory to its exact starting state.
 *
 * ✒ Key Features:
 *     - Boundary checks: missing token, foreign Host header, traversal,
 *       holding-area access, and a write through an escaping symbolic link
 *     - Every mutation verified on disk: mkdir, rename, move, copy,
 *       duplicate, remove to holding, restore
 *     - Collision checks: nothing is overwritten and nothing moves when a
 *       batch is refused; "keep both" picks a free name
 *     - Persistence: the service is stopped and started again, and the
 *       second process sees the first one's journal as an earlier session
 *     - Progress events on the change stream: counting, totals, rising
 *       byte counts, and a closing event with the outcome
 *     - Cancellation mid-file leaves the finished items, removes the
 *       partial one, and is undoable; a queued job cancels before it starts
 *     - Full undo chain across the restart compared against a snapshot of
 *       names, sizes and content hashes taken before the first change
 *     - A journal edited to point outside the root is refused on undo
 *     - Snapshot mode: written outside the tree it records, replays a live
 *       scan exactly, refuses every change and every content read
 *     - Read-only mode refuses mutations
 *     - Duplicate hashing distinguishes true copies from same-size files
 *
 * ✒ Usage Instructions:
 *     node tools/smoke-test.mjs
 *     Exit code 0 means every check passed. The temp directory is removed
 *     afterwards.
 *
 * ✒ Other Important Information:
 *     - Dependencies: Node.js built-ins only; server/terrane.mjs,
 *       server/snapshot.mjs
 *     - Compatible platforms: Node.js 22.5+; the symbolic-link checks are
 *       skipped where links cannot be created
 *     - Performance: about 10 seconds; the second service runs with
 *       TERRANE_SLOW_COPY_MS so a 24 MB copy takes long enough to cancel
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
const BIG = 24 * 1024 * 1024;
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'terrane-smoke-'));
const root = path.join(work, 'root');
const outside = path.join(work, 'outside');
fs.mkdirSync(path.join(root, 'docs', 'drafts'), { recursive: true });
fs.mkdirSync(path.join(root, 'media'));
fs.mkdirSync(path.join(root, 'big'));
fs.mkdirSync(outside);
fs.writeFileSync(path.join(root, 'docs', 'a.txt'), 'alpha');
fs.writeFileSync(path.join(root, 'docs', 'b.txt'), 'bravo');
fs.writeFileSync(path.join(root, 'docs', 'drafts', 'c.txt'), 'charlie');
fs.writeFileSync(path.join(root, 'media', 'a.txt'), 'media-alpha');
fs.writeFileSync(path.join(root, 'media', 'x.bin'), Buffer.alloc(9000, 'q'));
fs.writeFileSync(path.join(root, 'media', 'y.bin'), Buffer.alloc(9000, 'q'));
fs.writeFileSync(path.join(root, 'media', 'z.bin'), Buffer.alloc(9000, 'r'));
fs.writeFileSync(path.join(root, 'big', 'movie.bin'), crypto.randomBytes(BIG));
fs.writeFileSync(path.join(root, 'big', 'notes.txt'), 'notes');
const OLD = new Date('2021-03-04T05:06:07Z');
fs.utimesSync(path.join(root, 'big', 'movie.bin'), OLD, OLD);
fs.writeFileSync(path.join(outside, 'keep.txt'), 'outside');
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
const sha = (...p) => crypto.createHash('sha1').update(fs.readFileSync(path.join(root, ...p))).digest('hex');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

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

async function boot(extra, port, env = {}, { withRoot = true } = {}) {
  const child = spawn(process.execPath, [SERVER, ...(withRoot ? [root] : []), '--no-open', '--no-watch', '--port', String(port), ...extra], {
    stdio: ['ignore', 'pipe', 'inherit'], env: { ...process.env, ...env },
  });
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
  /** Subscribes to the event stream; returns the collected messages and a closer. */
  const events = () => new Promise((resolve) => {
    const seen = [];
    const req = http.get({ host: '127.0.0.1', port: actual, path: `/api/events?t=${token}` }, (res) => {
      res.on('error', () => {});
      let buf = '';
      res.on('data', (c) => {
        buf += c;
        let i;
        while ((i = buf.indexOf('\n\n')) >= 0) {
          const block = buf.slice(0, i);
          buf = buf.slice(i + 2);
          if (block.startsWith('data: ')) seen.push(JSON.parse(block.slice(6)));
        }
      });
      resolve({ seen, close: () => req.destroy() });
    });
    req.on('error', () => {});
  });
  const stop = () => new Promise((resolve) => {
    child.once('exit', resolve);
    child.kill();
  });
  return {
    child, token, request, events, stop,
    get: (route) => request('GET', route, { token }),
    op: (body) => request('POST', '/api/op', { token, body }),
    post: (route, body = {}) => request('POST', route, { token, body }),
  };
}

/** Polls until pred() is true or the time runs out. */
async function until(pred, ms = 8000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (pred()) return true;
    await wait(15);
  }
  return false;
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
check('scan streams one record per folder', records.length === 5 && records[0][1] === -1, `${records.length} records`);
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

const firstJournal = (await s.get('/api/journal')).body.journal;
await s.stop();

console.log('\nPersistence');
check('the journal is written to the holding area', fs.existsSync(path.join(root, '.terrane-trash', 'journal.json')));
const s2 = await boot([], 4400, { TERRANE_SLOW_COPY_MS: '40' });
j = (await s2.get('/api/journal')).body;
check(`a restarted service reads the journal back (${firstJournal.length} entries)`,
  j.journal.length === firstJournal.length && j.journal.every((e, i) => e.label === firstJournal[i].label), JSON.stringify(j.journal.map((e) => e.label)));
check('entries from before the restart are marked as an earlier session', j.journal.length > 0 && j.journal.every((e) => e.earlier));

console.log('\nProgress and cancellation');
const ev = await s2.events();
const jobEvents = (id) => ev.seen.filter((m) => m.type === 'job' && m.id === id);
const pending = s2.op({ type: 'copy', paths: ['big/notes.txt', 'big/movie.bin'], dest: 'docs', job: 'smoke-cancel-1' });
const midFile = await until(() => jobEvents('smoke-cancel-1').some((m) => m.phase === 'copying' && m.current === 'big/movie.bin' && m.bytes[0] > 6 * 1024 * 1024));
r = await s2.post('/api/cancel', { job: 'smoke-cancel-1' });
check('cancel is accepted while a copy is running', midFile && r.status === 200, JSON.stringify(r.body));
r = await pending;
// The closing event travels on the event stream, which can trail the reply.
await until(() => jobEvents('smoke-cancel-1').at(-1)?.phase === 'end', 3000);
const seen1 = jobEvents('smoke-cancel-1');
check('progress counts first, with the true total', seen1.some((m) => m.phase === 'counting') && seen1.some((m) => m.bytes[1] === BIG + 5 && m.files[1] === 2),
  JSON.stringify(seen1.slice(0, 3)));
const rising = seen1.filter((m) => m.phase === 'copying').map((m) => m.bytes[0]);
check('progress reports rising byte counts', rising.length >= 3 && rising.every((b, i) => i === 0 || b >= rising[i - 1]) && rising.at(-1) > 0, rising.join(','));
check('the cancelled copy says what it did', r.status === 200 && r.body.cancelled === true && /1 of 2 items/.test(r.body.label) && r.body.undoable === true, JSON.stringify(r.body));
check('finished items stay and the partial one is removed', read('docs', 'notes.txt') === 'notes' && !has('docs', 'movie.bin'));
check('the job closes with its outcome', seen1.at(-1)?.phase === 'end' && seen1.at(-1)?.outcome === 'cancelled');
check('cancelling a finished job is refused plainly', (await s2.post('/api/cancel', { job: 'smoke-cancel-1' })).status === 404);

const slow = s2.op({ type: 'copy', paths: ['big/movie.bin'], dest: 'media', job: 'smoke-full-1' });
const queued = s2.op({ type: 'copy', paths: ['big/notes.txt'], dest: 'media', job: 'smoke-queued-1' });
await until(() => jobEvents('smoke-queued-1').length > 0);
r = await s2.post('/api/cancel', { job: 'smoke-queued-1' });
const q = await queued;
r = await slow;
check('a full streamed copy completes and matches by content', r.status === 200 && !r.body.cancelled && sha('media', 'movie.bin') === sha('big', 'movie.bin'));
check('a copy keeps the modification time', Math.abs(fs.statSync(path.join(root, 'media', 'movie.bin')).mtimeMs - OLD.getTime()) < 2000);
check('a queued job cancels before it starts and changes nothing', q.status === 200 && q.body.cancelled && /before it started/.test(q.body.label) && !has('media', 'notes.txt'),
  JSON.stringify(q.body));
check('job ids sent by the page are used for its events', jobEvents('smoke-full-1').some((m) => m.phase === 'copying'));
ev.close();

console.log('\nUndo across the restart');
let steps = 0;
let labels = [];
for (;;) {
  r = await s2.post('/api/undo');
  if (r.status !== 200) break;
  labels.push(r.body.label);
  steps++;
}
check('undo stops with a clear message when the journal is empty', r.status === 409 && /nothing to undo/i.test(r.body.message));
check('undo names entries from the earlier session', labels.some((l) => /earlier session/.test(l)) && labels.some((l) => !/earlier session/.test(l)), labels.join(' | '));
// The one restore above was not an undo of its trash entry, so replaying
// that entry's undo restores the remaining held item only.
const after = snapshot();
check(`undo chain (${steps} steps, two processes) returns the directory to its starting state`, JSON.stringify(after) === JSON.stringify(before),
  `\n   before: ${before.join(' ')}\n   after:  ${after.join(' ')}`);
j = (await s2.get('/api/journal')).body;
check('the journal records every entry as undone', j.journal.length > 0 && j.journal.every((e) => e.undone));
await s2.stop();

console.log('\nJournal integrity');
const journalFile = path.join(root, '.terrane-trash', 'journal.json');
fs.writeFileSync(journalFile, JSON.stringify({ format: 1, entries: [
  { id: 1, type: 'move', label: 'Planted', at: Date.now(), session: 'x', undone: false, undo: { kind: 'moves', pairs: [['../outside/keep.txt', 'docs/b.txt']] } },
] }));
const s3 = await boot([], 4405);
r = await s3.post('/api/undo');
check('an edited journal that points outside the root is refused', r.status === 400 && fs.readFileSync(path.join(outside, 'keep.txt'), 'utf8') === 'outside' && read('docs', 'b.txt') === 'bravo',
  JSON.stringify(r.body));
await s3.stop();
fs.writeFileSync(journalFile, '{ not json');
const s4 = await boot([], 4410);
j = (await s4.get('/api/journal')).body;
const setAside = fs.readdirSync(path.join(root, '.terrane-trash')).some((n) => n.startsWith('journal.unreadable-'));
check('an unreadable journal is set aside, not overwritten', j.journal.length === 0 && setAside);
await s4.stop();

console.log('\nSnapshot mode');
const { takeSnapshot } = await import('../server/snapshot.mjs');
const snapDir = path.join(work, 'snaps');
const snapMeta = await takeSnapshot(root, snapDir);
check('a snapshot is written outside the directory it records, which is left unchanged',
  fs.existsSync(snapMeta.file) && !snapMeta.file.startsWith(root + path.sep) && JSON.stringify(snapshot()) === JSON.stringify(before));
const flat = (text) => {
  const where = new Map();
  const out = new Map();
  for (const [id, pid, name, , err, files] of text.trim().split('\n').flatMap((l) => JSON.parse(l))) {
    const p = pid === -1 ? '' : where.get(pid) ? `${where.get(pid)}/${name}` : name;
    where.set(id, p);
    const rows = [];
    for (let i = 0; i < files.length; i += 4) rows.push(files.slice(i, i + 4).join('|'));
    out.set(p, `${err}:${rows.sort().join(',')}`);
  }
  return JSON.stringify([...out].sort());
};
const liveRo = await boot(['--read-only'], 4415);
const liveScan = flat((await liveRo.get('/api/scan?path=')).text);
const liveShallow = flat((await liveRo.get('/api/scan?path=docs&depth=1')).text);
await liveRo.stop();
const sm = await boot(['--snapshot', snapDir], 4420, {}, { withRoot: false });
check('snapshot replay matches a live scan record for record', flat((await sm.get('/api/scan?path=')).text) === liveScan);
check('a depth-limited replay matches too', flat((await sm.get('/api/scan?path=docs&depth=1')).text) === liveShallow);
const info = (await sm.get('/api/info')).body;
check('the service says which snapshot it is showing', info.snapshot?.takenAt === snapMeta.takenAt && info.readOnly === true && info.root === snapMeta.root);
r = await sm.op({ type: 'mkdir', parent: '', name: 'from-snapshot' });
const u = await sm.post('/api/undo');
check('snapshot mode refuses every change', r.status === 403 && u.status === 403 && /snapshot/i.test(r.body.message) && !has('from-snapshot'));
check('snapshot mode never reads file contents', (await sm.get('/api/raw?path=docs/b.txt')).status === 403);
check('snapshot mode keeps the path rules', (await sm.get('/api/scan?path=' + encodeURIComponent('../outside'))).status === 400);
check('without a thumbnail dataset the index says so', (await sm.get('/api/thumbs')).body.available === false);
await sm.stop();

console.log('\nRead-only mode');
const ro = await boot(['--read-only'], 4395);
r = await ro.op({ type: 'mkdir', parent: '', name: 'nope' });
check('read-only refuses mutations with an explanation', r.status === 403 && /read-only/i.test(r.body.message) && !has('nope'));
check('read-only still scans', (await ro.get('/api/scan?path=')).status === 200);
await ro.stop();

fs.rmSync(work, { recursive: true, force: true });
console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
