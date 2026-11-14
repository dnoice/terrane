#!/usr/bin/env node
/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Scale Driver (Terrane Edition - v1.0)
 *     - File Name: scale.mjs
 *     - Relative Path: tools/scale.mjs
 *     - Artifact Type: CLI
 *     - Version: 1.0.0
 *     - Date: 11/14/2026
 *     - Update: Saturday, November 14, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Changelog:
 *     - 1.0.0 (11/14/2026) [dendogg + Anthropic - Claude Opus 5.5] —
 *       Initial release.
 *
 * ✒ Description:
 *     Measures Terrane at several sizes of synthetic tree, one heavy
 *     process at a time: it generates each snapshot, then either drives
 *     the page over it through the scale scenario of tools/ui-check.mjs,
 *     or measures the service alone, and prints a table and writes the
 *     figures as JSON. It is how the Stage 4 exit test is proved on a
 *     machine that must stay responsive.
 *
 * ✒ Key Features:
 *     - Points of any size, 100k, 1m, 2m and 5m by default, each in a
 *       dataset of its own under the OS temp folder, deleted after it is
 *       measured unless --keep
 *     - One heavy process at a time: the generator, then the service or
 *       ui-check, each with an explicit --max-old-space-size; a point of a
 *       million entries or more waits for 6 GB of free memory, polling
 *       every 20 s for up to 10 minutes
 *     - Before every browser run it waits until no headless Edge or
 *       Chrome is running (a fixed PowerShell query on Windows, ps
 *       elsewhere), polling every 20 s
 *     - A browser point runs the scale scenario with --no-shots,
 *       --no-baseline, --ready-ms 600000 and --min-free 6, and reads its
 *       SCALE line and its pass, fail and skip counts; until the page
 *       draws in regions, only points at or below the threshold run a
 *       browser, unless --force
 *     - --service-only: the service on the snapshot, polled until its tree
 *       is ready (load time, memory), eight levels walked down by the
 *       child folder with the most folders beneath, each region timed, 50
 *       chains to random deep files timed, and its memory read again
 *     - Ctrl+C stops every process it started; nothing is left running
 *
 * ✒ Usage Instructions:
 *     node tools/scale.mjs --points 100k --port 5220
 *     node tools/scale.mjs --points 1m,2m,5m --service-only --port 5220
 *     The JSON goes to <OS temp>/terrane-scale/scale-YYYY-MM-DD-HHMM.json
 *     unless --out names a file.
 *
 * ✒ Examples:
 *     node tools/scale.mjs
 *     node tools/scale.mjs --points 100k --nogl
 *     node tools/scale.mjs --points 400k,1m --service-only --keep
 *     node tools/scale.mjs --points 1m --force --region-threshold 0
 *     node tools/scale.mjs --points 5m --service-only --out C:\temp\scale-5m.json
 *
 * ✒ Command-Line Arguments:
 *     Input:
 *         --points <list>        Comma list of sizes: 100k, 400k, 1m, 2m, 5m
 *                                or numbers (default 100k,1m,2m,5m).
 *         --seed <n>             The generator's seed (default 11).
 *     Processing:
 *         --port <n>             First port (default 5220); ui-check uses
 *                                it, the next one and the ninth after it.
 *         --nogl                 The browser pass without WebGL.
 *         --service-only         Measure the service alone, no browser.
 *         --region-threshold <n> Passed to every service (environment).
 *         --force                Run a browser point above the threshold.
 *     Output:
 *         --out <file>           Where the JSON goes.
 *         --keep                 Keep the generated datasets.
 *
 * ✒ Other Important Information:
 *     - Dependencies: Node.js 22.5+; tools/make-synthetic.mjs,
 *       server/terrane.mjs, tools/ui-check.mjs and its scale scenario;
 *       Edge or Chrome for a browser point
 *     - Compatible platforms: Windows, macOS, Linux
 *     - Safety: writes only under <OS temp>/terrane-scale, never reads a
 *       real dataset, and stops what it started on exit or Ctrl+C
 * ----------------------------------------------------------------------------
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { parseEntries, labelOf, mulberry32 } from './make-synthetic.mjs';
import { listSnapshots } from '../server/snapshot.mjs';
import { REGION_THRESHOLD, D_NAME, D_DC, D_S } from '../web/js/columns.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SERVER = path.join(HERE, '..', 'server', 'terrane.mjs');
const GENERATOR = path.join(HERE, 'make-synthetic.mjs');
const UI_CHECK = path.join(HERE, 'ui-check.mjs');
const HOME = path.join(os.tmpdir(), 'terrane-scale');
const GB = 1024 ** 3;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const print = (s) => console.log(s);

/* ---------- arguments ---------- */

const argv = process.argv.slice(2);
const VALUED = new Set(['--points', '--seed', '--port', '--region-threshold', '--out']);
const opt = {};
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (VALUED.has(a)) opt[a.slice(2)] = argv[++i];
  else if (a.startsWith('--')) opt[a.slice(2)] = true;
  else {
    console.error(`  Unknown argument: ${a}`);
    process.exit(2);
  }
}
const POINTS = String(opt.points || '100k,1m,2m,5m').split(',').map((x) => parseEntries(x));
const SEED = opt.seed === undefined ? 11 : Number(opt.seed);
const PORT = Number(opt.port || 5220);
const THRESHOLD = opt['region-threshold'] !== undefined ? Number(opt['region-threshold']) : REGION_THRESHOLD;
if (POINTS.some((n) => !Number.isInteger(n)) || !Number.isInteger(SEED) || !Number.isInteger(PORT) || !(Number.isInteger(THRESHOLD) && THRESHOLD >= 0)) {
  console.error('  --points takes sizes such as 100k,1m,5m; --seed, --port and --region-threshold whole numbers.');
  process.exit(2);
}

/** The heap a process of this size is given: --max-old-space-size in MB. */
const heapFor = (n) => (n <= 400000 ? 1024 : n <= 1e6 ? 2048 : n <= 2e6 ? 3072 : 4096);

/* ---------- processes ---------- */

const running = new Set();
let stopping = false;

/** Runs node with args; resolves to { code, out } once it exits. Every line it prints is passed on when echo. */
function run(args, { echo = false, env = {} } = {}) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, args, { stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, ...env } });
    running.add(child);
    let out = '';
    const take = (c) => {
      out += c;
      if (echo) process.stdout.write(c);
    };
    child.stdout.on('data', take);
    child.stderr.on('data', take);
    child.on('exit', (code) => {
      running.delete(child);
      resolve({ code, out });
    });
  });
}

function killAll() {
  for (const child of running) {
    try {
      child.kill();
    } catch { /* gone */ }
  }
}
process.on('SIGINT', () => {
  if (stopping) process.exit(130);
  stopping = true;
  print('\n  Stopping everything this run started…');
  killAll();
  setTimeout(() => process.exit(130), 3000).unref();
});

const freeGB = () => os.freemem() / GB;

/** Waits up to ten minutes for `need` GB of free memory, polling every 20 s. */
async function memoryFor(need, what) {
  const end = Date.now() + 10 * 60000;
  for (;;) {
    const free = freeGB();
    if (free >= need) return free;
    if (Date.now() > end) throw new Error(`${what} needs ${need} GB of free memory; only ${free.toFixed(1)} GB was free for ten minutes.`);
    print(`  note  ${free.toFixed(1)} GB free; waiting for ${need} GB before ${what}`);
    await wait(20000);
  }
}

const HEADLESS_PS = "(Get-CimInstance Win32_Process -Filter \"Name='msedge.exe' or Name='chrome.exe'\" | Where-Object { $_.CommandLine -match 'headless|remote-debugging' } | Measure-Object).Count";

/** How many headless or remotely debugged Edge or Chrome processes run now. */
function headlessCount() {
  if (process.platform === 'win32') {
    const r = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', HEADLESS_PS], { encoding: 'utf8', windowsHide: true });
    const n = Number(String(r.stdout).trim());
    return Number.isFinite(n) ? n : 0;
  }
  const r = spawnSync('ps', ['-eo', 'args'], { encoding: 'utf8' });
  return String(r.stdout).split('\n').filter((l) => /(chrome|chromium|msedge|microsoft-edge)/i.test(l) && /headless|remote-debugging/.test(l)).length;
}

async function noBrowser() {
  for (;;) {
    const n = headlessCount();
    if (n === 0) return;
    print(`  note  ${n} headless browser process${n === 1 ? '' : 'es'} running; waiting 20 s before starting one`);
    await wait(20000);
  }
}

/* ---------- one point ---------- */

async function generate(entries) {
  const label = labelOf(entries);
  const dir = path.join(HOME, `synthetic-${label}`);
  fs.rmSync(dir, { recursive: true, force: true });
  if (entries >= 1e6) await memoryFor(6, `generating ${label}`);
  const r = await run([`--max-old-space-size=2048`, GENERATOR, '--entries', String(entries), '--seed', String(SEED), '--out', dir, '--json']);
  const line = r.out.trim().split('\n').reverse().find((l) => l.startsWith('{'));
  if (r.code !== 0 || !line) throw new Error(`The generator stopped (${r.code}): ${r.out.trim().slice(-400)}`);
  return { dir, ...JSON.parse(line) };
}

/** A small HTTP client of one service: the token from its page, then JSON GETs. */
async function client(port) {
  const request = (route, token) => new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path: route, headers: token ? { 'X-Terrane-Token': token } : {} }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        let body = null;
        try {
          body = JSON.parse(raw);
        } catch { /* the page */ }
        resolve({ status: res.statusCode, raw, body });
      });
    });
    req.on('error', reject);
    req.end();
  });
  const page = await request('/');
  const token = page.raw.match(/terrane-token" content="([^"]+)"/)?.[1];
  if (!token) throw new Error('The service gave no token.');
  return async (route) => {
    const t0 = performance.now();
    const r = await request(route, token);
    return { ...r, ms: performance.now() - t0 };
  };
}

const stats = (list) => {
  const s = [...list].sort((a, b) => a - b);
  const at = (q) => (s.length ? s[Math.min(s.length - 1, Math.floor(q * s.length))] : null);
  const r = (x) => (x === null ? null : Math.round(x * 10) / 10);
  return { n: s.length, median: r(at(0.5)), p95: r(at(0.95)), max: r(s.at(-1) ?? null) };
};

/** Files at least six levels down, chosen by a seeded draw from the snapshot itself. */
function deepFiles(dir, count, seed) {
  const db = new DatabaseSync(listSnapshots(dir)[0], { readOnly: true });
  try {
    const max = db.prepare('SELECT max(rowid) AS m FROM files').get().m || 0;
    const one = db.prepare('SELECT f.path AS dir, x.name AS name, f.depth AS depth FROM files x JOIN folders f ON f.id = x.folder_id WHERE x.rowid = ?');
    const R = mulberry32(seed);
    const out = [];
    for (let tries = 0; out.length < count && tries < count * 200; tries++) {
      const row = one.get(1 + Math.floor(R() * max));
      if (row && row.depth >= 6) out.push(row.dir ? `${row.dir}/${row.name}` : row.name);
    }
    return out;
  } finally {
    db.close();
  }
}

async function serviceOnly(point) {
  const heap = heapFor(point.entries);
  if (point.entries >= 1e6) await memoryFor(6, `the service at ${labelOf(point.entries)}`);
  const t0 = Date.now();
  const child = spawn(process.execPath, [`--max-old-space-size=${heap}`, SERVER, '--snapshot', point.dir, '--no-open', '--no-warm', '--port', String(PORT), '--region-threshold', String(THRESHOLD === REGION_THRESHOLD ? 0 : THRESHOLD)], { stdio: ['ignore', 'pipe', 'pipe'] });
  running.add(child);
  let printed = '';
  child.stderr.on('data', (c) => { printed += c; });
  try {
    const port = await new Promise((resolve, reject) => {
      child.stdout.on('data', (c) => {
        printed += c;
        const m = printed.match(/127\.0\.0\.1:(\d+)/);
        if (m) resolve(Number(m[1]));
      });
      child.on('exit', (code) => reject(new Error(`The service exited (${code}): ${printed.trim().slice(-400)}`)));
    });
    const get = await client(port);
    let tree = null;
    const end = Date.now() + 10 * 60000;
    for (;;) {
      tree = (await get('/api/tree')).body;
      if (tree?.state === 'ready' || tree?.state === 'failed') break;
      if (Date.now() > end) throw new Error(`The tree was not ready in ten minutes (${JSON.stringify(tree?.progress)})`);
      await wait(250);
    }
    if (tree.state !== 'ready') throw new Error(tree.error || 'The tree could not be read.');
    const readyMs = Date.now() - t0;
    const memLoaded = tree.mem;
    // Eight levels down by the child folder with the most folders beneath.
    const regionMs = [];
    let id = 0;
    let depth = 0;
    let held = 0;
    for (; depth <= 8; depth++) {
      const r = await get(`/api/region?v=${tree.v}&ids=${id}`);
      if (r.status !== 200) throw new Error(`A region answered ${r.status}: ${r.raw.slice(0, 200)}`);
      regionMs.push(r.ms);
      const reg = r.body.regions[0];
      held += 1 + reg.d.length + reg.f.length / 4;
      const next = [...reg.d].sort((a, b) => b[D_DC] - a[D_DC] || b[D_S] - a[D_S])[0];
      if (!next || depth === 8) break;
      id = next[0];
      void next[D_NAME];
    }
    // Fifty chains to deep files.
    const chainMs = [];
    let chainFails = 0;
    for (const rel of deepFiles(point.dir, 50, SEED)) {
      const r = await get(`/api/region?v=${tree.v}&path=${encodeURIComponent(rel)}`);
      if (r.status === 200) chainMs.push(r.ms);
      else chainFails++;
    }
    const after = (await get('/api/tree?peek=1')).body;
    return {
      heap, readyMs, loadMs: tree.loadMs, memLoaded, memAfter: after.mem, levels: depth, held,
      region: stats(regionMs), chains: { ...stats(chainMs), fails: chainFails },
    };
  } finally {
    if (child.exitCode === null) {
      const gone = new Promise((r) => child.once('exit', r));
      child.kill();
      await gone;
    }
    running.delete(child);
  }
}

async function browser(point) {
  await noBrowser();
  const pass = opt.nogl ? 'nogl' : 'webgl';
  const r = await run([
    UI_CHECK, 'scale', '--snapshot', point.dir, '--port', String(PORT), '--no-shots', '--no-baseline', '--pass', pass,
    '--service-heap', String(heapFor(point.entries)), '--ready-ms', '600000', '--min-free', '6',
  ], { echo: true, env: { TERRANE_REGION_THRESHOLD: String(THRESHOLD) } });
  const line = r.out.split('\n').find((l) => l.includes('note  SCALE '));
  const counts = r.out.match(/(\d+) passed, (\d+) failed(?:, (\d+) skipped)?/);
  return {
    pass, code: r.code, scale: line ? JSON.parse(line.slice(line.indexOf('SCALE ') + 6)) : null,
    passed: counts ? Number(counts[1]) : null, failed: counts ? Number(counts[2]) : null, skipped: counts?.[3] ? Number(counts[3]) : 0,
  };
}

/* ---------- the run ---------- */

const pad = (n) => String(n).padStart(2, '0');
const now = new Date();
const outFile = opt.out ? path.resolve(opt.out) : path.join(HOME, `scale-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}.json`);

async function main() {
  fs.mkdirSync(HOME, { recursive: true });
  const results = [];
  print(`\nTerrane scale: points ${POINTS.map(labelOf).join(', ')}, seed ${SEED}, ${opt['service-only'] ? 'the service alone' : `the page, ${opt.nogl ? 'without WebGL' : 'with WebGL'}`}; ${os.cpus().length} cores, ${freeGB().toFixed(1)} of ${(os.totalmem() / GB).toFixed(1)} GB free`);
  for (const entries of POINTS) {
    if (stopping) break;
    const label = labelOf(entries);
    const res = { point: label, entries, freeGBAtStart: Math.round(freeGB() * 10) / 10 };
    results.push(res);
    if (!opt['service-only'] && entries > THRESHOLD && !opt.force) {
      res.skipped = `above the threshold (${THRESHOLD.toLocaleString('en-US')}) the page would hold the whole tree; it draws in regions from increment 2 (--force runs it anyway)`;
      print(`\n[${label}] skipped: ${res.skipped}`);
      continue;
    }
    print(`\n[${label}] generating ${entries.toLocaleString('en-US')} entries`);
    let point = null;
    try {
      point = await generate(entries);
      res.generator = { ms: point.ms, dbMB: Math.round((point.dbBytes / 1024 ** 2) * 10) / 10, folders: point.folders, files: point.files, bytes: point.bytes, deepest: point.deepest, largest: point.largest, seed: point.seed };
      print(`  generated in ${(point.ms / 1000).toFixed(1)} s, ${res.generator.dbMB} MB: ${point.folders.toLocaleString('en-US')} folders, ${point.files.toLocaleString('en-US')} files, ${point.deepest} levels, the largest folder ${point.largest.toLocaleString('en-US')} files`);
      if (opt['service-only']) {
        res.service = await serviceOnly(point);
        const s = res.service;
        print(`  service: ready in ${s.readyMs} ms (load ${s.loadMs} ms), rss ${s.memLoaded.rss} MB, heap ${s.memLoaded.heapUsed} MB, arrays ${s.memLoaded.arrayBuffers} MB; region median ${s.region.median} ms, p95 ${s.region.p95} ms over ${s.region.n}; chains median ${s.chains.median} ms, p95 ${s.chains.p95} ms over ${s.chains.n}; rss after ${s.memAfter.rss} MB`);
      } else {
        res.page = await browser(point);
      }
    } catch (err) {
      res.error = err.message;
      print(`  stopped: ${err.message}`);
    } finally {
      if (point && !opt.keep) fs.rmSync(point.dir, { recursive: true, force: true });
    }
  }
  fs.writeFileSync(outFile, `${JSON.stringify({ at: now.toISOString(), seed: SEED, threshold: THRESHOLD, serviceOnly: !!opt['service-only'], cores: os.cpus().length, totalGB: Math.round(os.totalmem() / GB), points: results }, null, 2)}\n`);
  // The table.
  print('\n  point  generated        service                                        page');
  for (const r of results) {
    const g = r.generator ? `${(r.generator.ms / 1000).toFixed(1)} s ${r.generator.dbMB} MB` : '-';
    const s = r.service ? `load ${r.service.loadMs} ms, rss ${r.service.memLoaded.rss}/${r.service.memAfter.rss} MB, region ${r.service.region.median}/${r.service.region.p95} ms, chain ${r.service.chains.median}/${r.service.chains.p95} ms` : '-';
    const p = r.page?.scale ? `${r.page.scale.mode}, first box ${r.page.scale.firstBoxColdMs}/${r.page.scale.firstBoxReadyMs} ms, heap ${r.page.scale.settled.jsHeapUsedMB}/${r.page.scale.peak.jsHeapUsedMB}/${r.page.scale.afterTour.jsHeapUsedMB}/${r.page.scale.afterGC.jsHeapUsedMB} MB, script ${r.page.scale.frames?.longestScriptMs ?? '-'} ms (${r.page.passed} passed, ${r.page.failed} failed)` : r.skipped ? 'skipped' : r.error ? `stopped: ${r.error}` : '-';
    print(`  ${r.point.padEnd(6)} ${g.padEnd(16)} ${s.padEnd(46)} ${p}`);
  }
  print(`\n  Figures written to ${outFile}`);
  return results.some((r) => r.error || r.page?.failed) ? 1 : 0;
}

let code = 1;
try {
  code = await main();
} catch (err) {
  console.error(`\n  scale stopped: ${err.stack || err.message}`);
}
killAll();
process.exit(code);
