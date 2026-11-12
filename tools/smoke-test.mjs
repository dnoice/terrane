#!/usr/bin/env node
/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Service Smoke Test (Terrane Edition - v1.2)
 *     - File Name: smoke-test.mjs
 *     - Relative Path: tools/smoke-test.mjs
 *     - Artifact Type: test
 *     - Version: 1.2.0
 *     - Date: 11/12/2026
 *     - Update: Thursday, November 12, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Changelog:
 *     - 1.2.0 (11/11/2026) [dendogg + Anthropic - Claude Opus 5.5] — A
 *       layout section runs the browser's layout module in Node: a tree
 *       shaped to overflow the old folder-entry check stays within the
 *       box budget, an unfittable tree stops at exactly the budget, the
 *       aux bytes, index aliases and code tables, and the viewport's
 *       capacity above the budget. A relation-line section builds the
 *       viewport's line vertices in Node: duplicate ties identical to the
 *       old arcs, dash distances and chevrons, a leg 13 levels down kept
 *       in shape around a nearby origin, room shared between sets, bad
 *       legs skipped, and the three.js expression the dash replaces. A
 *       search-token section checks the is: words and name:value tokens
 *       a caller adds, that built-in ones cannot be replaced, and that
 *       is:constructor and is:__proto__ match nothing. An age-table
 *       section checks the shared table against a brute-force walk of a
 *       2,400-folder tree at every step, its six strata, median and last
 *       steps, the edges of a step, files of no size, a folder newer than
 *       the table, and that no field is written onto a node.
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
 *     - Layout safety, without the service: the box budget holds at every
 *       box, so no layout can pass the viewport's capacity
 *     - Relation lines, without the service or a browser: the vertices the
 *       viewport writes for ties, routes and chevrons
 *     - Search tokens, without the service: the grammar answers as before
 *       and takes is: words and name:value tokens from its caller
 *     - The age table, without the service: changed bytes and files per
 *       folder and step equal a brute-force walk, and the strata add up
 *
 * ✒ Usage Instructions:
 *     node tools/smoke-test.mjs
 *     Exit code 0 means every check passed. The temp directory is removed
 *     afterwards.
 *
 * ✒ Other Important Information:
 *     - Dependencies: Node.js built-ins only; server/terrane.mjs,
 *       server/snapshot.mjs, web/js/layout.js, web/js/model.js,
 *       web/js/timeline.js, and web/js/viewport.js with the vendored
 *       three.js
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

console.log('\nLayout (no service)');
const { buildLayout, BOX, STYLE, MAX_BOXES } = await import(new URL('../web/js/layout.js', import.meta.url));
const { Model } = await import(new URL('../web/js/model.js', import.meta.url));
const NOW = Date.UTC(2026, 10, 11);
// The shape the old folder-entry check let through: a folder whose 14
// subfolders of 5,000 files each are entered under the budget, then 4,999
// files beside it, about 75,000 boxes from close up at a fine grain.
const overflowTree = () => {
  const m = new Model('root');
  const files = (count, prefix) => Array.from({ length: count }, (_, i) => [`${prefix}${i}.dat`, 1000, NOW - 86400000, 0]).flat();
  const recs = [[0, -1, 'root', NOW, 0, files(4999, 'r')], [1, 0, 'X', NOW, 0, []]];
  for (let k = 0; k < 14; k++) recs.push([2 + k, 1, `sub${k}`, NOW, 0, files(5000, `s${k}-`)]);
  m.ingest(recs, [], m.root);
  return m;
};
const near = { x: 0, y: 50, z: 0 };
let tree = overflowTree();
let lay = buildLayout(tree.root, { cam: near, grain: 0.0024, now: NOW });
check(`a tree that overflowed the old check fits by coarsening (${lay.n} boxes)`, lay.n <= MAX_BOXES && lay.coarsened && !lay.over, `${lay.n} boxes`);
check('every box carries an aux byte, zero when no feature marks it', lay.aux instanceof Uint8Array && lay.aux.length === lay.n && lay.aux.every((v) => v === 0));
tree = overflowTree();
lay = buildLayout(tree.root, { cam: near, grain: 1e-9, now: NOW });
check('a tree that cannot fit at any grain stops at exactly the budget and says so',
  lay.n === MAX_BOXES && lay.over && lay.index.size === lay.n && lay.geo.length === lay.n * 6 && [...lay.scree.keys()].every((i) => i < lay.n), `${lay.n} boxes, over ${lay.over}`);
const X = tree.root.c.find((c) => c.n === 'X');
const ghost = {};
lay = buildLayout(tree.root, { cam: { x: 0, y: 900, z: 1200 }, now: NOW, aliases: [[ghost, X], [X, tree.root], [{}, {}]] });
check('an index alias resolves to its key\'s box and never displaces a real key',
  lay.index.get(ghost) === lay.index.get(X) && lay.index.get(X) !== lay.index.get(tree.root) && lay.index.size === lay.n + 1);
check('box and style codes are frozen and unique, with WALL 4 and CROSSED 6 reserved',
  Object.isFrozen(BOX) && Object.isFrozen(STYLE) && BOX.WALL === 4 && STYLE.CROSSED === 6
  && new Set(Object.values(BOX)).size === Object.keys(BOX).length && new Set(Object.values(STYLE)).size === Object.keys(STYLE).length
  && !Object.values(STYLE).includes(7));
const capacity = Number(fs.readFileSync(new URL('../web/js/viewport.js', import.meta.url), 'utf8').match(/const CAPACITY = (\d+);/)?.[1]);
check(`the viewport holds more boxes (${capacity}) than a layout may (${MAX_BOXES})`, capacity >= MAX_BOXES);

console.log('\nRelation lines (no service)');
const THREE = await import(new URL('../web/vendor/three/three.module.js', import.meta.url));
const { relationVertices } = await import(new URL('../web/js/viewport.js', import.meta.url));
const REL = Number(fs.readFileSync(new URL('../web/js/viewport.js', import.meta.url), 'utf8').match(/const REL_CAPACITY = (\d+);/)?.[1]);
const relBuf = (cap = REL) => ({ pos: new Float32Array(cap * 3), col: new Float32Array(cap * 3), dist: new Float32Array(cap) });
const relRun = (sets, origin, cap = REL) => {
  const b = relBuf(cap);
  return { ...b, ...relationVertices(sets, origin, b.pos, b.col, b.dist, cap) };
};
const GARNET = 0x9b1c3a;
// Two ties from one box top, as the old setTies drew them: a 28-point
// quadratic curve built in origin-relative 32-bit vectors.
const tieLegs = [10, 5, -20, 300, 12, 40, 10, 5, -20, -150, 2, 90];
const tieOrigin = { x: 1, y: 2, z: 3 };
let rel = relRun([{ color: GARNET, dashed: false, lift: 0.3, arrows: false, segments: 28, legs: tieLegs }], tieOrigin);
const oldTies = [];
for (let o = 0; o < tieLegs.length; o += 6) {
  const a = new THREE.Vector3(tieLegs[o] - 1, tieLegs[o + 1] - 2, tieLegs[o + 2] - 3);
  const b = new THREE.Vector3(tieLegs[o + 3] - 1, tieLegs[o + 4] - 2, tieLegs[o + 5] - 3);
  const mid = new THREE.Vector3((a.x + b.x) / 2, Math.max(a.y, b.y) + a.distanceTo(b) * 0.3, (a.z + b.z) / 2);
  const curve = new THREE.QuadraticBezierCurve3(a, mid, b).getPoints(28);
  for (let k = 0; k < curve.length - 1; k++) oldTies.push(curve[k].x, curve[k].y, curve[k].z, curve[k + 1].x, curve[k + 1].y, curve[k + 1].z);
}
check('duplicate ties from the relation layer are the arcs the old ties drew, identical in 32 bits',
  rel.count * 3 === oldTies.length && oldTies.every((x, i) => Math.fround(x) === rel.pos[i]), `${rel.count} vertices`);
const garnetLinear = new THREE.Color().setHex(GARNET);
check('a solid set is breakless (-1 on every vertex) and coloured in linear garnet, as the old material',
  rel.dist.subarray(0, rel.count).every((d) => d === -1)
  && [0, 1, 2].every((c) => rel.col[c] === Math.fround([garnetLinear.r, garnetLinear.g, garnetLinear.b][c])));

// A dashed, arched route with chevrons.
const routeLegs = [0, 0, 0, 100, 0, 0, 100, 0, 0, 100, 20, 60];
rel = relRun([{ color: 0x18201e, dashed: true, lift: 0.12, arrows: true, segments: 16, legs: routeLegs }], { x: 0, y: 0, z: 0 });
const perLeg = (16 + 2) * 2;
const leg0 = rel.dist.subarray(0, perLeg);
let joined = true;
for (let k = 1; k < 16; k++) if (leg0[2 * k - 1] !== leg0[2 * k]) joined = false;
let arc = 0;
const P = (t) => {
  const u = 1 - t;
  const my = 0 + 100 * 0.12;
  return [u * u * 0 + 2 * u * t * 50 + t * t * 100, 2 * u * t * my, 0];
};
for (let k = 0, prev = P(0); k < 4096; k++) {
  const q = P((k + 1) / 4096);
  arc += Math.hypot(q[0] - prev[0], q[1] - prev[1], q[2] - prev[2]);
  prev = q;
}
check('a dashed leg measures from 0 at its first end, unbroken at every joint, to its arc length',
  rel.count === 2 * perLeg && leg0[0] === 0 && joined && Math.abs(leg0[31] - arc) / arc < 0.002, `ends at ${leg0[31]}, arc ${arc.toFixed(4)}`);
const tip = [rel.pos[32 * 3], rel.pos[32 * 3 + 1], rel.pos[32 * 3 + 2]];
const armA = [rel.pos[33 * 3], rel.pos[33 * 3 + 1], rel.pos[33 * 3 + 2]];
const armB = [rel.pos[35 * 3], rel.pos[35 * 3 + 1], rel.pos[35 * 3 + 2]];
const sameTip = [0, 1, 2].every((c) => rel.pos[34 * 3 + c] === tip[c]);
const lenA = Math.hypot(armA[0] - tip[0], armA[1] - tip[1], armA[2] - tip[2]);
const lenB = Math.hypot(armB[0] - tip[0], armB[1] - tip[1], armB[2] - tip[2]);
check('each leg carries a solid chevron at its middle, pointing from its first end to its second',
  sameTip && rel.dist.subarray(32, 36).every((d) => d === -1) && Math.abs(lenA - 6) < 1e-4 && Math.abs(lenB - 6) < 1e-4
  && Math.abs(tip[0] - 53) < 1e-4 && Math.abs(tip[1] - 6) < 1e-4 && armA[0] < tip[0] && armB[0] < tip[0] && Math.abs(armA[2] + armB[2]) < 1e-4 && armA[2] !== 0,
  `tip ${tip.map((x) => x.toFixed(3))}, arms ${lenA.toFixed(4)} ${lenB.toFixed(4)}`);

// Thirteen levels down: a leg a ten-thousandth of a unit long, far from
// the world's centre. Around a nearby origin it keeps its shape in 32 bits;
// around the world's centre it would not, which is why every layout
// writes the lines again around the new origin.
const deep = [123.456789, 7.891234, -301.234567, 123.456789 + 1e-4, 7.891234, -301.234567 + 0.5e-4];
const deepErr = (origin) => {
  const r = relRun([{ color: 0x18201e, dashed: false, lift: 0, legs: deep }], origin);
  const want = [deep[3] - deep[0], 0, deep[5] - deep[2]];
  const got = [r.pos[3] - r.pos[0], r.pos[4] - r.pos[1], r.pos[5] - r.pos[2]];
  return Math.hypot(got[0] - want[0], got[1] - want[1], got[2] - want[2]) / Math.hypot(...want);
};
const nearErr = deepErr({ x: 123.4567, y: 7.8912, z: -301.2345 });
const farErr = deepErr({ x: 0, y: 0, z: 0 });
check(`a leg 13 levels down keeps its shape around a nearby origin (error ${nearErr.toExponential(1)} of its length; ${farErr.toExponential(1)} around the centre)`,
  nearErr < 1e-5 && farErr > 1e-2);

// Room: a 1,000-leg route and 40 ties fit, the ties whole.
const many = (count, len) => {
  const out = [];
  for (let i = 0; i < count; i++) out.push(i, 0, 0, i + len, 0, len);
  return out;
};
const tiesSet = { color: GARNET, dashed: false, lift: 0.3, arrows: false, segments: 28, legs: many(40, 10) };
rel = relRun([{ color: 0x18201e, dashed: true, lift: 0.12, arrows: true, segments: 28, legs: many(1000, 50) }, tiesSet], { x: 0, y: 0, z: 0 });
const tieStart = rel.count - 40 * 56;
check(`a 1,000-leg route and 40 ties fit in ${REL.toLocaleString('en-US')} vertices, the ties whole and drawn last (${rel.count.toLocaleString('en-US')} used)`,
  rel.count <= REL && rel.legs === 1040 && rel.leftOut === 0 && rel.dist.subarray(tieStart, rel.count).every((d) => d === -1)
  && rel.col[tieStart * 3] === Math.fround(garnetLinear.r), `${rel.legs} legs, ${rel.leftOut} left out`);
rel = relRun([{ color: 0x18201e, dashed: false, lift: 0, legs: many(30000, 5) }, tiesSet], { x: 0, y: 0, z: 0 });
check('sets that cannot fit leave their last legs out, count them, and keep the small sets whole',
  rel.count <= REL && rel.leftOut > 0 && rel.legs + rel.leftOut === 30040 && rel.dist.subarray(rel.count - 40 * 56, rel.count).every((d) => d === -1),
  `${rel.legs} drawn, ${rel.leftOut} left out`);
rel = relRun([{ color: GARNET, lift: 0.3, legs: [1, 1, 1, 1, 1, 1, NaN, 0, 0, 1, 1, 1, 0, 0, 0, Infinity, 0, 0, 0, 0, 0, 3, 0, 4] }], { x: 0, y: 0, z: 0 });
check('legs of no length or with coordinates that are not numbers draw nothing', rel.legs === 1 && rel.count === 56, `${rel.legs} legs`);
check('the vendored three.js still has the dash expression the relation material replaces',
  THREE.ShaderChunk.linedashed_frag.includes('mod( vLineDistance, totalSize ) > dashSize'));

console.log('\nSearch tokens (no service)');
const { parseQuery, runSearch } = await import(new URL('../web/js/model.js', import.meta.url));
const qm = new Model('root');
qm.ingest([
  [0, -1, 'root', NOW, 0, ['Report-2026.pdf', 5000, NOW - 86400000, 0, 'notes.md', 300, NOW, 0, 'empty.txt', 0, NOW, 0]],
  [1, 0, 'Session', NOW, 0, ['a.js', 100, NOW - 1000, 0, 'b.js', 200, NOW - 500, 0]],
], [], qm.root);
const hits = (q, ext) => {
  const pred = parseQuery(q, ext);
  return pred ? runSearch(qm, pred).list.map((x) => x.n).sort() : null;
};
const plain = ['report', 'ext:js', 'is:empty', '>1kb', 'older:1h', 'kind:code', '*.md', 'foo:bar'].map((q) => JSON.stringify(hits(q)));
check('without feature tokens every query answers as before', JSON.stringify(plain)
  === JSON.stringify([['Report-2026.pdf'], ['a.js', 'b.js'], ['empty.txt'], ['Report-2026.pdf'], ['Report-2026.pdf', 'Session', 'a.js', 'b.js', 'empty.txt', 'notes.md'], ['a.js', 'b.js'], ['notes.md'], []].map((x) => JSON.stringify(x))), plain.join(' '));
const marked = new Set();
let seenRaw = null;
const ext = {
  is: { marked: (n) => marked.has(n), dup: () => true },
  prefix: {
    within: (v, raw) => { seenRaw = raw; return (n) => n.p?.n.toLowerCase() === v; },
    ext: () => () => true,
    broken: () => 'not a function',
  },
};
marked.add(qm.find('notes.md'));
check('an is: word from the caller finds what it names, combined with built-in tokens',
  JSON.stringify(hits('is:marked', ext)) === '["notes.md"]' && JSON.stringify(hits('is:marked >1kb', ext)) === '[]');
check('a name:value token from the caller gets the value lower-cased and as typed',
  JSON.stringify(hits('within:SESSION', ext)) === '["a.js","b.js"]' && seenRaw === 'SESSION' && JSON.stringify(hits('within:session b', ext)) === '["b.js"]');
check('built-in words and prefixes cannot be replaced by the caller',
  JSON.stringify(hits('is:dup', ext)) === '[]' && JSON.stringify(hits('ext:js', ext)) === '["a.js","b.js"]');
check('a maker that returns no predicate matches nothing; unknown prefixes stay plain words',
  JSON.stringify(hits('broken:x', ext)) === '[]' && JSON.stringify(hits('nothere:x', ext)) === '[]' && hits('nothere:x', ext) !== null);
let protoErr = null;
let protoHits = null;
try {
  protoHits = [hits('is:constructor'), hits('is:__proto__'), hits('is:tostring', ext), hits('within:', ext)];
} catch (err) {
  protoErr = err.message;
}
check('is: and prefix lookups use real words only: is:constructor and is:__proto__ match nothing and do not throw',
  !protoErr && JSON.stringify(protoHits.slice(0, 3)) === '[[],[],[]]', protoErr || JSON.stringify(protoHits));

console.log('\nAge table (no service)');
const { buildAgeTable, LADDER_DAYS, STEPS, BAND_STEPS, BANDS, DAY } = await import(new URL('../web/js/timeline.js', import.meta.url));
const ladderRises = LADDER_DAYS.every((d, i) => i === 0 || d > LADDER_DAYS[i - 1]);
check('the ladder has 20 steps from now back to 30 years and holds exactly 1, 7, 30, 365 and 1,095 days',
  STEPS === 20 && LADDER_DAYS[0] === 0 && LADDER_DAYS.at(-1) === 10950 && ladderRises && Object.isFrozen(LADDER_DAYS) && Object.isFrozen(BAND_STEPS)
  && BANDS === 6 && JSON.stringify(BAND_STEPS.map((k) => LADDER_DAYS[k])) === '[1,7,30,365,1095]', JSON.stringify(LADDER_DAYS));

// A random tree 13 levels deep: times over 40 years, undated files,
// files dated in the future, files exactly on a step and a millisecond
// after it, and files of no size.
const AT = Date.UTC(2026, 10, 12, 8, 0, 0);
const stepTimes = LADDER_DAYS.map((d) => AT - d * DAY);
let ageSeed = 11;
const ageRnd = () => {
  ageSeed = (ageSeed + 0x6d2b79f5) >>> 0;
  let x = ageSeed;
  x = Math.imul(x ^ (x >>> 15), x | 1);
  x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
  return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
};
const ageTime = () => {
  const r = ageRnd();
  if (r < 0.02) return 0;
  if (r < 0.03) return AT + Math.floor(ageRnd() * DAY);
  if (r < 0.08) return stepTimes[1 + Math.floor(ageRnd() * (STEPS - 1))] + (ageRnd() < 0.5 ? 0 : 1);
  return AT - Math.floor(ageRnd() ** 2.5 * 40 * 365 * DAY);
};
const am = new Model('root');
const adirs = [{ id: 0, depth: 0 }];
while (adirs.length < 2400) {
  const parent = ageRnd() < 0.3 ? adirs[adirs.length - 1 - Math.floor(ageRnd() * Math.min(adirs.length, 30))] : adirs[Math.floor(ageRnd() * adirs.length)];
  if (parent.depth < 13) adirs.push({ id: adirs.length, pid: parent.id, depth: parent.depth + 1 });
}
const afiles = adirs.map(() => []);
for (let i = 0; i < 34000; i++) {
  const at = Math.floor(ageRnd() ** 1.7 * adirs.length);
  afiles[at].push(`f${i}.dat`, ageRnd() < 0.04 ? 0 : Math.floor(Math.exp(ageRnd() * 20)), ageTime(), 0);
}
am.ingest(adirs.map((d) => [d.id, d.id ? d.pid : -1, d.id ? `d${d.id}` : 'root', AT - DAY, 0, afiles[d.id]]), [], am.root);
const allDirs = [];
(function collect(dir) { allDirs.push(dir); for (const c of dir.c) if (c.d) collect(c); }(am.root));
const shapeOf = (n) => `${Object.keys(n).join()}|${Object.getOwnPropertySymbols(n).length}`;
const shapes = allDirs.flatMap((d) => [d, ...d.c]).map(shapeOf);
const ages = buildAgeTable(am.root, AT);
const subtreeFiles = (dir) => {
  const out = [];
  (function walk(d) { for (const c of d.c) { if (c.d) walk(c); else out.push(c); } }(dir));
  return out;
};
let stepMiss = 0;
let bandMiss = 0;
let sumMiss = 0;
let defMiss = 0;
for (const dir of allDirs) {
  const fl = subtreeFiles(dir);
  const cb = new Array(STEPS).fill(0);
  const cf = new Array(STEPS).fill(0);
  const bb = new Array(6).fill(0);
  const bf = new Array(6).fill(0);
  for (const f of fl) {
    for (let k = 0; k < STEPS; k++) if (f.m > stepTimes[k]) { cb[k] += f.s; cf[k]++; }
    const days = (AT - f.m) / DAY;
    const band = !f.m ? 5 : [1, 7, 30, 365, 1095].findIndex((d) => days < d);
    bb[band < 0 ? 5 : band] += f.s;
    bf[band < 0 ? 5 : band]++;
  }
  for (let k = 0; k < STEPS; k++) if (ages.changedBytes(dir, k) !== cb[k] || ages.changedFiles(dir, k) !== cf[k]) stepMiss++;
  const b = ages.bands(dir);
  if (JSON.stringify(b.bytes) !== JSON.stringify(bb) || JSON.stringify(b.files) !== JSON.stringify(bf)) bandMiss++;
  if (b.bytes.reduce((x, y) => x + y, 0) !== dir.s || b.files.reduce((x, y) => x + y, 0) !== dir.fc) sumMiss++;
  const tb = fl.reduce((x, f) => x + f.s, 0);
  const firstAt = (w, need) => { const k = w.findIndex((v) => v >= need); return k < 0 ? STEPS - 1 : k; };
  const median = fl.length ? firstAt(tb > 0 ? cb : cf, (tb > 0 ? tb : fl.length) / 2) : -1;
  const last = fl.length ? firstAt(cf, fl.length) : -1;
  const keptOk = cb.every((c, k) => ages.kept(dir, k) === (tb > 0 ? 1 - c / tb : fl.length ? 1 - cf[k] / fl.length : dir.mm > stepTimes[k] ? 0 : 1));
  if (ages.medianStep(dir) !== median || ages.lastStep(dir) !== last || !keptOk || ages.totalBytes(dir) !== dir.s || ages.totalFiles(dir) !== dir.fc) defMiss++;
}
check(`changed bytes and files equal a brute-force walk in every folder at all 20 steps (${allDirs.length.toLocaleString('en-US')} folders, ${am.root.fc.toLocaleString('en-US')} files, built in ${ages.ms.toFixed(1)} ms)`,
  stepMiss === 0 && ages.folders === allDirs.length, `${stepMiss} mismatches`);
check('the six strata are the ladder\'s differences: each holds the files its ages put there, and they add up to dir.s and dir.fc', bandMiss === 0 && sumMiss === 0, `${bandMiss} strata, ${sumMiss} sums`);
check('kept, the median step, the last step and the totals agree with their definitions in every folder', defMiss === 0, `${defMiss} folders`);
check('nothing is written onto the model\'s nodes', allDirs.flatMap((d) => [d, ...d.c]).every((n, i) => shapeOf(n) === shapes[i]));

// The edges, one file each.
const em = new Model('root');
em.ingest([
  [0, -1, 'root', AT, 0, ['future.txt', 10, AT + 1000, 0, 'on-a-day.txt', 100, AT - DAY, 0, 'after-a-day.txt', 1000, AT - DAY + 1, 0, 'undated.txt', 10000, 0, 0, 'ancient.txt', 5, AT - 11000 * DAY, 0]],
  [1, 0, 'zeros', AT, 0, ['a', 0, AT - 2 * DAY, 0, 'b', 0, AT - 400 * DAY, 0]],
  [2, 0, 'empty', AT, 0, []],
], [], em.root);
const et = buildAgeTable(em.root, AT);
const ef = (n) => em.find(n);
const zeros = ef('zeros');
const empty = ef('empty');
check('a time exactly on a step is not after it, a millisecond later is, and undated or older files never count',
  JSON.stringify(['future.txt', 'after-a-day.txt', 'on-a-day.txt', 'undated.txt', 'ancient.txt'].map((n) => et.stepOf(ef(n).m))) === '[0,1,2,20,20]'
  && et.changedBytes(em.root, 0) === 10 && et.changedBytes(em.root, 1) === 1010 && et.changedBytes(em.root, 2) === 1110 && et.changedFiles(em.root, 2) === 4
  && JSON.stringify(et.bands(em.root)) === JSON.stringify({ bytes: [1010, 100, 0, 0, 0, 10005], files: [2, 2, 0, 0, 1, 2] })
  && et.medianStep(em.root) === STEPS - 1 && et.lastStep(em.root) === STEPS - 1);
check('files of no size are weighed by count, and a folder with no files by its own date',
  et.kept(zeros, 1) === 1 && et.kept(zeros, 2) === 0.5 && et.kept(zeros, 10) === 0 && et.medianStep(zeros) === 2 && et.lastStep(zeros) === 10
  && et.medianStep(empty) === -1 && et.lastStep(empty) === -1 && et.kept(empty, 19) === 1 && et.bands(empty).files.every((x) => x === 0));
em.ingest([[1, 0, 'late', AT - 5 * DAY, 0, ['n.txt', 77, AT - 3 * DAY, 0]]], [em.root], em.root);
const late = ef('late');
check('a folder newer than the table counts as wholly changed at its newest change; the folders it holds keep their figures until the next build',
  !et.has(late) && et.has(em.root) && LADDER_DAYS.every((_, k) => et.kept(late, k) === (late.mm > stepTimes[k] ? 0 : 1))
  && et.changedBytes(late, 1) === 0 && et.changedBytes(late, 2) === 77 && et.changedFiles(late, 2) === 1 && et.medianStep(late) === 2
  && JSON.stringify(et.bands(late).bytes) === '[0,77,0,0,0,0]' && et.totalBytes(em.root) === 11115 && em.root.s === 11192);
const file = ef('after-a-day.txt');
let refused = 0;
for (const k of [-1, 20, 1.5, NaN, '2']) {
  try {
    et.kept(em.root, k);
  } catch (err) {
    if (err instanceof RangeError) refused++;
  }
}
check('a file answers from its own date and size; steps off the ladder are refused; the table is frozen',
  et.changedBytes(file, 0) === 0 && et.changedBytes(file, 1) === 1000 && et.kept(file, 1) === 0 && et.medianStep(file) === 1 && !et.has(file)
  && JSON.stringify(et.bands(file).bytes) === '[1000,0,0,0,0,0]' && refused === 5 && Object.isFrozen(et) && Object.isFrozen(et.T) && et.T[1] === AT - DAY);

fs.rmSync(work, { recursive: true, force: true });
console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
