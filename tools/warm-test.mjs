#!/usr/bin/env node
/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Warm Start Test (Terrane Edition - v1.0)
 *     - File Name: warm-test.mjs
 *     - Relative Path: tools/warm-test.mjs
 *     - Artifact Type: test
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
 *     Checks the warm start from both ends: the service that keeps the
 *     last complete survey of a directory and serves it back, and the
 *     page's Model.adopt, which takes a fresh survey onto the tree drawn
 *     from the cache without losing a node. Every service runs on a
 *     throwaway tree with TERRANE_DATA in a temporary folder, so nothing
 *     reaches the real dataset home.
 *
 * ✒ Key Features:
 *     - No cache before a survey; after a whole survey of the root, a cache
 *       whose counts equal the survey's, in GET /api/info
 *     - GET /api/warm with gzip and without gives the records of a live
 *       survey, path for path and size for size
 *     - A depth-limited or sub-folder survey writes nothing; a survey
 *       dropped part way leaves no data, meta or temporary file
 *     - A meta naming another root, or a data file cut short, reads as no
 *       cache; --no-warm keeps none and serves none (404); snapshot mode
 *       refuses the route; the route needs the token
 *     - The cache holds names, sizes and dates, never a file's contents
 *     - The writer in-process: abort removes its temporary file, two
 *       commits in a row leave one data file and its meta
 *     - Model.adopt: kept nodes keep their identity, new ones hang from
 *       the old folders, gone ones are dropped, every folder's totals and
 *       every parent pointer equal a model built fresh, every folder is
 *       dirty, and the counts say what changed; 200,000 files adopted
 *       under a ceiling
 *
 * ✒ Usage Instructions:
 *     node tools/warm-test.mjs
 *     npm test runs it after the export test. It boots the service on
 *     ports 5052 to 5058 (the next free one when taken).
 *
 * ✒ Other Important Information:
 *     - Dependencies: Node.js 22.5+; server/terrane.mjs, server/warm.mjs,
 *       server/scan.mjs, server/snapshot.mjs, web/js/model.js
 *     - Compatible platforms: Windows, macOS, Linux
 *     - Performance: a 4,000-file tree in 2,051 folders in the OS temp
 *       folder, removed afterwards; about five seconds. The 200,000-file
 *       adoption took 23 ms on the 16-core machine (11/13/2026); its
 *       ceiling is 400 ms
 *     - Exit code 0 means every check passed
 * ----------------------------------------------------------------------------
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import zlib from 'node:zlib';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SERVER = path.join(HERE, '..', 'server', 'terrane.mjs');
const { Model, relPath } = await import(new URL('../web/js/model.js', import.meta.url).href);
const { scan } = await import(new URL('../server/scan.mjs', import.meta.url).href);
const { warmWriter, readWarm, warmPaths } = await import(new URL('../server/warm.mjs', import.meta.url).href);
const { takeSnapshot } = await import(new URL('../server/snapshot.mjs', import.meta.url).href);

let passed = 0;
let failed = 0;
const check = (name, cond, detail = '') => {
  if (cond) passed++;
  else failed++;
  console.log(`${cond ? '  ok  ' : ' FAIL '} ${name}${cond || !detail ? '' : ` — ${detail}`}`);
};
const section = (title) => console.log(`\n${title}`);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------- a throwaway tree with contents no cache may hold ---------- */

const work = fs.mkdtempSync(path.join(os.tmpdir(), 'terrane-warm-'));
const root = path.join(work, 'root');
const SECRET = `warm-secret-${Date.now().toString(36)}`;
const contents = [];
fs.mkdirSync(root);
for (let a = 0; a < 50; a++) {
  for (let b = 0; b < 40; b++) {
    const dir = path.join(root, `area-${String(a).padStart(2, '0')}`, `plot-${String(b).padStart(2, '0')}`);
    fs.mkdirSync(dir, { recursive: true });
    for (let c = 0; c < 2; c++) {
      const text = `${SECRET} ${a}/${b}/${c} ${'x'.repeat((a * 7 + b * 3 + c) % 40)}`;
      if (contents.length < 50) contents.push(text);
      fs.writeFileSync(path.join(dir, `entry-${c}-with-a-fairly-long-name-to-fill-the-stream.txt`), text);
    }
  }
}
fs.writeFileSync(path.join(root, 'top.txt'), `${SECRET} top`);
contents.push(`${SECRET} top`);

/** A fresh dataset home for one service. */
let homes = 0;
const newHome = () => {
  const dir = path.join(work, `data-${++homes}`);
  fs.mkdirSync(dir);
  return dir;
};

/* ---------- the service ---------- */

async function boot(args, port, home) {
  const child = spawn(process.execPath, [SERVER, ...args, '--no-open', '--no-watch', '--port', String(port)], {
    stdio: ['ignore', 'pipe', 'inherit'], env: { ...process.env, TERRANE_DATA: home },
  });
  const actual = await new Promise((resolve, reject) => {
    let buf = '';
    child.stdout.on('data', (c) => {
      buf += c;
      const m = buf.match(/127\.0\.0\.1:(\d+)/);
      if (m) resolve(Number(m[1]));
    });
    child.on('exit', () => reject(new Error(`the service exited: ${buf}`)));
  });
  /** One request; the body as a Buffer, and parsed when it is JSON. */
  const request = (route, { token, headers = {} } = {}) => new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port: actual, path: route, method: 'GET', headers: { ...headers, ...(token ? { 'X-Terrane-Token': token } : {}) } }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks);
        let body = null;
        try {
          body = JSON.parse(raw.toString('utf8'));
        } catch { /* NDJSON or gzip */ }
        resolve({ status: res.statusCode, headers: res.headers, raw, body });
      });
    });
    req.on('error', reject);
    req.end();
  });
  const page = await request('/');
  const token = page.raw.toString('utf8').match(/terrane-token" content="([^"]+)"/)[1];
  const stop = () => new Promise((resolve) => {
    if (child.exitCode !== null) return resolve();
    child.once('exit', resolve);
    child.kill();
    return undefined;
  });
  return {
    port: actual, token, request, stop,
    get: (route, headers) => request(route, { token, headers }),
    info: async () => (await request('/api/info', { token })).body,
  };
}

/** Scanner records from NDJSON text. */
const recordsOf = (text) => text.trim().split('\n').filter(Boolean).flatMap((l) => JSON.parse(l));

/** Folder and file paths with sizes from scanner records: 'a/' and 'a/b.txt:5'. */
function recordPaths(records) {
  const where = new Map();
  const out = [];
  for (const [id, pid, name, , , files] of records) {
    const at = pid === -1 ? '' : where.get(pid) ? `${where.get(pid)}/${name}` : name;
    where.set(id, at);
    if (pid !== -1) out.push(`${at}/`);
    for (let i = 0; i < files.length; i += 4) out.push(`${at ? `${at}/` : ''}${files[i]}:${files[i + 1]}`);
  }
  return out.sort();
}

/** Folders, files and bytes in scanner records. */
function countsOf(records) {
  let files = 0;
  let bytes = 0;
  for (const r of records) {
    files += r[5].length / 4;
    for (let i = 1; i < r[5].length; i += 4) bytes += r[5][i];
  }
  return { folders: records.length, files, bytes };
}

/** The files a dataset home holds for warm starts, by name. */
const warmFiles = (home) => {
  const out = [];
  const walk = (dir) => {
    let list = [];
    try {
      list = fs.readdirSync(dir, { withFileTypes: true });
    } catch { /* not made */ }
    for (const d of list) {
      if (d.isDirectory()) walk(path.join(dir, d.name));
      else if (d.name.startsWith('warm-')) out.push(d.name);
    }
  };
  walk(home);
  return out.sort();
};

/** Polls until fn() is truthy, or the time runs out; resolves to its last value. */
async function until(fn, ms = 6000) {
  const end = Date.now() + ms;
  for (;;) {
    const v = await fn();
    if (v || Date.now() > end) return v;
    await wait(40);
  }
}

/* ====================================================================== */

section('The cache is written by a whole survey');
const home1 = newHome();
const s = await boot([root], 5052, home1);
let info = await s.info();
check('before any survey, info.warm is null', info.warm === null, JSON.stringify(info.warm));
let r = await s.get('/api/warm');
check('and GET /api/warm is 404 ENOWARM', r.status === 404 && r.body?.code === 'ENOWARM', `${r.status} ${r.raw}`);

r = await s.get('/api/scan?path=docs-none&depth=1');
r = await s.get('/api/scan?path=area-01&depth=1');
r = await s.get('/api/scan?path=area-02');
r = await s.get('/api/scan?path=&depth=1');
await wait(400);
check('a depth-1 survey or a survey of a sub-folder writes nothing', warmFiles(home1).length === 0 && (await s.info()).warm === null, warmFiles(home1).join(', '));

r = await s.get('/api/scan?path=');
const live = recordsOf(r.raw.toString('utf8'));
const liveCounts = countsOf(live);
info = await until(async () => {
  const i = await s.info();
  return i.warm ? i : null;
});
const { data: dataFile, meta: metaFile, dir: cacheDir } = warmPaths(info?.root ?? root, home1);
check(`after a whole survey of the root the cache is in the dataset home (${path.relative(home1, cacheDir)})`, !!info && fs.existsSync(dataFile) && fs.existsSync(metaFile),
  `${dataFile} ${fs.existsSync(dataFile)}`);
check(`its counts equal the survey's: ${liveCounts.folders} folders, ${liveCounts.files} files, ${liveCounts.bytes} bytes`,
  !!info?.warm && info.warm.folders === liveCounts.folders && info.warm.files === liveCounts.files && info.warm.bytes === liveCounts.bytes && Number.isFinite(info.warm.takenAt),
  JSON.stringify(info?.warm));
check('info.warm says when and what, nothing else', !!info?.warm && same(Object.keys(info.warm).sort(), ['bytes', 'files', 'folders', 'takenAt']), JSON.stringify(info?.warm));
const meta = JSON.parse(fs.readFileSync(metaFile, 'utf8'));
check('the meta is format 1, names the root exactly and records the data file\'s size',
  meta.format === 1 && meta.root === info.root && meta.size === fs.statSync(dataFile).size && meta.version === info.version, JSON.stringify(meta));
check('no temporary file is left beside it', fs.readdirSync(cacheDir).every((n) => !n.endsWith('.tmp')), fs.readdirSync(cacheDir).join(', '));

section('GET /api/warm');
r = await s.get('/api/warm', { 'Accept-Encoding': 'gzip' });
check('with gzip accepted: 200, the file as it is, Content-Encoding gzip, NDJSON, no-store, nosniff',
  r.status === 200 && r.headers['content-encoding'] === 'gzip' && r.headers['content-type'] === 'application/x-ndjson'
  && r.headers['cache-control'] === 'no-store' && r.headers['x-content-type-options'] === 'nosniff' && r.raw.equals(fs.readFileSync(dataFile)),
  JSON.stringify(r.headers));
const viaGzip = recordsOf(zlib.gunzipSync(r.raw).toString('utf8'));
check(`its records are a live survey's, path for path (${viaGzip.length} folders)`, same(recordPaths(viaGzip), recordPaths(live)));
r = await s.get('/api/warm');
const plain = r.status === 200 ? recordsOf(r.raw.toString('utf8')) : [];
check('without gzip: decompressed by the service, no Content-Encoding, the same records',
  r.status === 200 && !r.headers['content-encoding'] && same(recordPaths(plain), recordPaths(live)), `${r.status} ${JSON.stringify(r.headers)}`);
r = await s.request('/api/warm');
check('the route needs the token (401 without it)', r.status === 401 && r.body?.code === 'ETOKEN', `${r.status}`);
r = await s.request('/api/warm', { token: `${s.token}x` });
check('and refuses a wrong one', r.status === 401);
r = await s.request('/api/warm', { token: s.token, headers: { Host: `evil.example:${s.port}` } });
check('and answers only on its loopback address (Host check)', r.status === 403 && r.body?.code === 'EHOST', `${r.status}`);

section('What the cache holds');
const text = zlib.gunzipSync(fs.readFileSync(dataFile)).toString('utf8');
check(`the decompressed cache holds none of the ${contents.length} files' contents checked, nor the marker they share`,
  !text.includes(SECRET) && contents.every((c) => !text.includes(c)));
check('it holds the scanner\'s records: names, sizes, dates and flags', text.includes('entry-0-with-a-fairly-long-name-to-fill-the-stream.txt') && text.includes('"top.txt"'));
check('the cache is outside the root', !path.resolve(dataFile).toLowerCase().startsWith(path.resolve(root).toLowerCase() + path.sep));

section('A cache that does not hold together reads as none');
const goodMeta = fs.readFileSync(metaFile, 'utf8');
fs.writeFileSync(metaFile, JSON.stringify({ ...meta, root: path.join(meta.root, 'other') }));
info = await s.info();
r = await s.get('/api/warm');
check('a meta naming another root is ignored: info.warm null, /api/warm 404', info.warm === null && r.status === 404, JSON.stringify(info.warm));
fs.writeFileSync(metaFile, JSON.stringify({ ...meta, files: 'many' }));
check('a meta whose counts are not numbers is ignored', (await s.info()).warm === null);
fs.writeFileSync(metaFile, '{"format":1,');
check('a meta that is not JSON is ignored', (await s.info()).warm === null);
fs.writeFileSync(metaFile, goodMeta);
check('the meta put back is read again', !!(await s.info()).warm);
const whole = fs.readFileSync(dataFile);
fs.writeFileSync(dataFile, whole.subarray(0, Math.floor(whole.length / 2)));
info = await s.info();
r = await s.get('/api/warm');
check('a data file cut short gives info.warm null and /api/warm 404', info.warm === null && r.status === 404, JSON.stringify(info.warm));
fs.writeFileSync(dataFile, whole);
check('put back whole, it is read again', !!(await s.info()).warm);
process.env.TERRANE_DATA = home1;
check('readWarm in-process agrees: the meta for this root, null for any other',
  same(await readWarm(meta.root), meta) && (await readWarm(path.join(meta.root, 'x'))) === null && (await readWarm(meta.root.toUpperCase() === meta.root ? `${meta.root}/` : meta.root.toUpperCase())) === null);
delete process.env.TERRANE_DATA;
await s.stop();

section('A survey dropped part way');
const home2 = newHome();
const d = await boot([root], 5053, home2);
const dropped = await new Promise((resolve) => {
  let got = 0;
  const req = http.get({ host: '127.0.0.1', port: d.port, path: '/api/scan?path=', headers: { 'X-Terrane-Token': d.token } }, (res) => {
    res.on('data', (c) => {
      got += c.length;
      // Gone after the first chunk, as a tab closed mid-survey.
      req.destroy();
      resolve(got);
    });
    res.on('error', () => {});
  });
  req.on('error', () => {});
});
await wait(300);
const left = await until(() => {
  const f = warmFiles(home2);
  return f.length === 0 ? 'none' : null;
}, 4000);
check(`a survey dropped after its first ${dropped} bytes leaves no data, meta or temporary file`, left === 'none', warmFiles(home2).join(', '));
check('and info.warm stays null', (await d.info()).warm === null);
await d.stop();

section('--no-warm');
const home3 = newHome();
const n = await boot([root, '--no-warm'], 5054, home3);
r = await n.get('/api/scan?path=');
await wait(600);
info = await n.info();
check('a whole survey writes nothing', recordsOf(r.raw.toString('utf8')).length === liveCounts.folders && warmFiles(home3).length === 0, warmFiles(home3).join(', '));
check('info.warm is null', info.warm === null);
fs.mkdirSync(path.dirname(warmPaths(info.root, home3).data), { recursive: true });
fs.copyFileSync(dataFile, warmPaths(info.root, home3).data);
fs.writeFileSync(warmPaths(info.root, home3).meta, goodMeta);
info = await n.info();
r = await n.get('/api/warm');
check('even with a good cache beside it: info.warm null, /api/warm 404 ENOWARM saying why', info.warm === null && r.status === 404 && r.body?.code === 'ENOWARM' && /--no-warm/.test(r.body?.message), `${r.status} ${r.raw}`);
await n.stop();

section('Read-only mode keeps the cache (it is outside the root)');
const home4 = newHome();
const ro = await boot([root, '--read-only'], 5055, home4);
await ro.get('/api/scan?path=');
info = await until(async () => {
  const i = await ro.info();
  return i.warm ? i : null;
});
check('a read-only service writes the cache of its survey too', !!info?.warm && info.readOnly === true);
await ro.stop();

section('Snapshot mode');
const snapDir = path.join(work, 'snaps');
await takeSnapshot(root, snapDir);
const home5 = newHome();
const sm = await boot(['--snapshot', snapDir], 5056, home5);
info = await sm.info();
r = await sm.get('/api/warm');
check('snapshot mode refuses GET /api/warm with ESNAPSHOT and a sentence', r.status === 403 && r.body?.code === 'ESNAPSHOT' && /snapshot/i.test(r.body?.message), `${r.status} ${r.raw}`);
check('and info.warm is null', info.warm === null && !!info.snapshot);
await sm.get('/api/scan?path=');
await wait(300);
check('a whole survey of the snapshot writes no cache', warmFiles(home5).length === 0);
await sm.stop();

section('The writer, in-process');
{
  const home = newHome();
  process.env.TERRANE_DATA = home;
  const rootId = path.join(work, 'in-process-root');
  const batches = [];
  for await (const b of scan(root, { isRoot: true })) batches.push(b);
  const w1 = warmWriter(rootId, { version: 'test' });
  for (const b of batches.slice(0, 3)) w1.push(b);
  await w1.abort();
  check('abort removes its temporary file and writes no meta', warmFiles(home).length === 0, warmFiles(home).join(', '));
  const w2 = warmWriter(rootId, { version: 'test' });
  const w3 = warmWriter(rootId, { version: 'test' });
  for (const b of batches) {
    w2.push(b);
    w3.push(b);
  }
  const [m2, m3] = await Promise.all([w2.commit(), w3.commit()]);
  const p = warmPaths(rootId);
  check('two commits at once leave one data file and its meta, the second\'s, which reads back',
    !!m2 && !!m3 && same(warmFiles(home), [path.basename(p.meta), path.basename(p.data)].sort()) && same(await readWarm(rootId), m3), warmFiles(home).join(', '));
  check(`the writer counts what it was given: ${m3?.folders} folders, ${m3?.files} files`, m3?.folders === liveCounts.folders && m3?.files === liveCounts.files && m3?.bytes === liveCounts.bytes);
  check('a commit after a commit does nothing', (await w3.commit()) === null && same(await readWarm(rootId), m3));
  // A stale temporary file of another process is swept by the next writer.
  const stale = `${p.data}.99999-deadbeef.tmp`;
  fs.writeFileSync(stale, 'left behind');
  const old = (Date.now() - 3600 * 1000) / 1000;
  fs.utimesSync(stale, old, old);
  const fresh = `${p.data}.99998-cafe.tmp`;
  fs.writeFileSync(fresh, 'in use');
  const w4 = warmWriter(rootId);
  await until(() => !fs.existsSync(stale), 2000);
  check('a temporary file another process left an hour ago is swept; a recent one is left', !fs.existsSync(stale) && fs.existsSync(fresh));
  await w4.abort();
  fs.rmSync(fresh, { force: true });
  delete process.env.TERRANE_DATA;
}

/* ====================================================================== */

section('Model.adopt');

/** A model built from scanner batches. */
function modelOf(name, batches) {
  const m = new Model(name);
  const idMap = [];
  for (const b of batches) m.ingest(b, idMap, m.root);
  return m;
}
async function batchesOf(dir) {
  const out = [];
  for await (const b of scan(dir, { isRoot: true })) out.push(b);
  return out;
}
/** Every node by path: 'a/b/' for folders. */
function byPath(m) {
  const map = new Map();
  const stack = [m.root];
  while (stack.length) {
    const dir = stack.pop();
    for (const ch of dir.c) {
      map.set(`${relPath(ch)}${ch.d ? '/' : ''}`, ch);
      if (ch.d) stack.push(ch);
    }
  }
  return map;
}
/** A folder's totals as a string. */
const totals = (d) => JSON.stringify([d.s, d.fc, d.dc, d.h, d.mm, d.e, d.stub, [...d.ks], d.m]);

{
  const tree = path.join(work, 'adopt');
  const mk = (rel, text = rel) => {
    fs.mkdirSync(path.dirname(path.join(tree, rel)), { recursive: true });
    fs.writeFileSync(path.join(tree, rel), text);
  };
  for (let i = 0; i < 6; i++) for (let j = 0; j < 5; j++) mk(`f${i}/g${j}/file-${j}.txt`, 'x'.repeat(10 + i + j));
  mk('keep/same.txt', 'same');
  mk('keep/grows.txt', 'small');
  mk('gone/inner/a.txt', 'a');
  mk('gone/inner/b.txt', 'b');
  mk('turns/into-folder', 'a file now');
  mk('top.bin', '0123456789');
  const before = modelOf('adopt', await batchesOf(tree));
  const oldNodes = byPath(before);
  const oldRoot = before.root;

  // Changes on disk: one file grows, a folder is gone, a file becomes a
  // folder, new files and a new folder with files come.
  fs.writeFileSync(path.join(tree, 'keep/grows.txt'), 'much larger than it was');
  fs.rmSync(path.join(tree, 'gone'), { recursive: true });
  fs.rmSync(path.join(tree, 'turns/into-folder'));
  mk('turns/into-folder/now.txt', 'inside');
  mk('keep/new.txt', 'new');
  mk('arrived/deep/one.txt', '1');
  mk('arrived/deep/two.txt', '22');
  const later = await batchesOf(tree);
  const fresh = modelOf('adopt', later);
  const reference = modelOf('adopt', later);
  const counts = before.adopt(fresh);
  const after = byPath(before);
  const ref = byPath(reference);

  check('the root keeps its node', before.root === oldRoot);
  const keptPaths = [...oldNodes.keys()].filter((p) => ref.has(p) && !!oldNodes.get(p).d === !!ref.get(p).d);
  check(`every entry still there keeps its node (${keptPaths.length})`, keptPaths.every((p) => after.get(p) === oldNodes.get(p)));
  check('the tree adopted has exactly the paths of a fresh model', same([...after.keys()].sort(), [...ref.keys()].sort()));
  check('a file that grew keeps its node and takes its new size and date',
    after.get('keep/grows.txt') === oldNodes.get('keep/grows.txt') && after.get('keep/grows.txt').s === ref.get('keep/grows.txt').s && after.get('keep/grows.txt').m === ref.get('keep/grows.txt').m);
  check('a folder that is gone is dropped, all it held with it', !after.has('gone/') && !after.has('gone/inner/a.txt') && !before.root.c.includes(oldNodes.get('gone/')));
  check('a file that became a folder is a new folder node, its file node dropped',
    after.get('turns/into-folder/')?.d === true && after.get('turns/into-folder/') !== oldNodes.get('turns/into-folder') && after.has('turns/into-folder/now.txt'));
  check('new entries hang from the old folders', after.get('keep/new.txt').p === oldNodes.get('keep/') && after.get('arrived/').p === oldRoot);
  let parents = true;
  let dirty = true;
  let sums = true;
  const bad = [];
  const stack = [before.root];
  while (stack.length) {
    const dir = stack.pop();
    if (!dir.dirty) dirty = false;
    const twin = dir === before.root ? reference.root : ref.get(`${relPath(dir)}/`);
    if (!twin || totals(dir) !== totals(twin)) {
      sums = false;
      bad.push(relPath(dir) || '(root)');
    }
    for (const ch of dir.c) {
      if (ch.p !== dir) parents = false;
      if (ch.d) stack.push(ch);
    }
  }
  check('every folder\'s totals (size, files, folders, height, newest, error, kinds, date) equal a fresh model\'s', sums, bad.slice(0, 5).join(', '));
  check('every child\'s parent pointer is the folder that holds it', parents);
  check('every folder is marked dirty, so the layout sorts it again', dirty);
  // kept: every entry matched. added: keep/new.txt, the new folder
  // turns/into-folder and its file, arrived with deep and two files.
  // removed: gone, inner and two files, and the file into-folder.
  // changed: grows.txt.
  check(`the counts say what changed: ${JSON.stringify(counts)}`,
    counts.kept === keptPaths.length && counts.added === 1 + 2 + 4 && counts.removed === 4 + 1 && counts.changed === 1, JSON.stringify(counts));
  const quiet = modelOf('adopt', later);
  const again = quiet.adopt(modelOf('adopt', later));
  check('a tree adopted onto its own twin says nothing changed', again.added === 0 && again.removed === 0 && again.changed === 0 && again.kept === ref.size, JSON.stringify(again));
}

{
  // 200,000 files in 2,000 folders under 40 more, built as scanner
  // records in memory.
  const PLOTS = 2000;
  const PER = 100;
  const now = Date.now();
  const recordsFor = (shift) => {
    const recs = [[0, -1, 'big', now, 0, []]];
    let id = 1;
    const tops = [];
    for (let t = 0; t < 40; t++) {
      tops.push(id);
      recs.push([id++, 0, `top-${t}`, now, 0, []]);
    }
    for (let k = 0; k < PLOTS; k++) {
      const files = [];
      for (let f = 0; f < PER; f++) {
        // One file in a hundred changes size, one goes and one comes.
        if (shift && f === 0) continue;
        const size = 1000 + ((k * 31 + f * 7) % 5000) + (shift && f === 1 ? 17 : 0);
        files.push(`file-${f}.dat`, size, now - ((k + f) % 3000) * 86400000, 0);
      }
      if (shift) files.push('arrived.dat', 64, now, 0);
      recs.push([id++, tops[k % 40], `plot-${k}`, now, 0, files]);
    }
    return recs;
  };
  const oldRecs = recordsFor(false);
  const newRecs = recordsFor(true);
  const files = oldRecs.reduce((a, r) => a + r[5].length / 4, 0);
  const big = modelOf('big', [oldRecs]);
  const freshBig = modelOf('big', [newRecs]);
  const t0 = performance.now();
  const c = big.adopt(freshBig);
  const ms = performance.now() - t0;
  const CEILING = 400;
  check(`${files.toLocaleString('en-US')} files adopted in ${ms.toFixed(0)} ms (ceiling ${CEILING} ms)`, files === 200000 && ms < CEILING, `${files} files, ${ms} ms`);
  check('and the counts are those of the change', c.changed === PLOTS && c.added === PLOTS && c.removed === PLOTS && c.kept === 40 + PLOTS + PLOTS * (PER - 1), JSON.stringify(c));
  check('the totals of the root equal a fresh model\'s', totals(big.root) === totals(modelOf('big', [newRecs]).root));
}

fs.rmSync(work, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
