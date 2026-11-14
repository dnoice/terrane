#!/usr/bin/env node
/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Synthetic Tree Generator (Terrane Edition - v1.0)
 *     - File Name: make-synthetic.mjs
 *     - Relative Path: tools/make-synthetic.mjs
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
 *       Initial release. The summary gives its moment as MM/DD/YYYY HH:MM
 *       (dateTime), never ISO.
 *
 * ✒ Description:
 *     Writes a structure snapshot of a directory tree that does not exist:
 *     100,000 to 5,000,000 entries or more, of a realistic shape, from one
 *     seed, straight into the snapshot database, without creating a single
 *     file on disk. Terrane's service serves it in snapshot mode exactly as
 *     it serves a snapshot of a real directory, so the scale of the world
 *     can be measured without millions of files.
 *
 * ✒ Key Features:
 *     - Deterministic: mulberry32 seeded with --seed, every date relative
 *       to --now (today at 12:00 by default), so a seed and a day always
 *       give the same rows
 *     - Exact counts: folders and files add up to the entries asked for,
 *       about 9% of them folders; ids are breadth first
 *     - A skeleton of folders built first in typed arrays, fanning out by
 *       depth (14 to 24 at the top, then means of 6, 3.2, 1.6 and 0.6,
 *       none at level 12), scaled level by level to meet the count
 *     - Themes per folder (code projects with .git and node_modules,
 *       photos, video, music, documents, data, archives, mixed) choosing
 *       names and the kinds of their files
 *     - Files shared out by Pareto weights (alpha 1.2), about 5% of
 *       folders empty, and a few folders of 5,000 to 30,000 files
 *     - Sizes log-normal by kind, 0.5% empty files, 2% copying an earlier
 *       file's size and often its name, so duplicate candidates exist
 *     - Dates in working sessions of 5 to 200 files within 2 to 30
 *       minutes inside each folder's working period; about 10% of folders
 *       active in the last 30 days; a few bulk writes of 2,000 files in 10
 *       seconds
 *     - Hidden names, links, special files, and folders that could not be
 *       read (EACCES, EPERM) with nothing in them
 *     - Holds only the skeleton and one folder's files at a time
 *     - Refuses the real projects dataset, a folder holding a snapshot of
 *       a real directory, and sizes outside 1,000 to 10,000,000 entries
 *
 * ✒ Usage Instructions:
 *     node tools/make-synthetic.mjs --entries 100k
 *     node --max-old-space-size=2048 tools/make-synthetic.mjs --entries 5m --out <folder>
 *     As a module:
 *         import { generate, writeSynthetic } from './make-synthetic.mjs';
 *         for (const batch of generate({ entries: 20000, seed: 11, now })) ...
 *         const r = await writeSynthetic({ entries: 100000, out: dir });
 *     Serve the result with:
 *         node server/terrane.mjs --snapshot <folder>
 *
 * ✒ Examples:
 *     node tools/make-synthetic.mjs --entries 100k
 *     node tools/make-synthetic.mjs --entries 1m --seed 7 --json
 *     node tools/make-synthetic.mjs --entries 250000 --out C:\temp\syn --name huge
 *     node tools/make-synthetic.mjs --entries 2m --now 1794744000000
 *     node tools/make-synthetic.mjs --entries 5m --out %TEMP%\terrane-scale\synthetic-5m
 *
 * ✒ Command-Line Arguments:
 *     Input:
 *         --entries <n>   Entries, folders and files with the root counted:
 *                         a number, or 100k, 1m, 2m, 5m (required).
 *         --seed <n>      The seed (default 11).
 *         --now <ms>      The moment every date is relative to (default
 *                         today at 12:00 local time).
 *     Output:
 *         --out <folder>  Where the snapshot is written (default the
 *                         dataset home's synthetic-<label>).
 *         --name <name>   The tree's name (default synthetic-<label>).
 *         --json          Print the figures as one JSON line.
 *     Safety:
 *         Refuses, with exit code 2, an --out that is or lies under the
 *         dataset home's projects folder, an --out holding a snapshot
 *         whose meta has no synthetic field, and entries below 1,000 or
 *         above 10,000,000.
 *
 * ✒ Other Important Information:
 *     - Dependencies: Node.js 22.5+ (node:sqlite); server/snapshot.mjs,
 *       web/js/model.js (kindOf)
 *     - Compatible platforms: Windows, macOS, Linux
 *     - Performance: run a point of a million entries or more in its own
 *       process with --max-old-space-size=2048; tools/scale.mjs does
 *     - Safety: the root it records is a path in the OS temp folder that
 *       is never created, and snapshot mode never reads it
 * ----------------------------------------------------------------------------
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { snapshotWriter, datasetHome, listSnapshots, readMeta, SNAPSHOT_FORMAT } from '../server/snapshot.mjs';
import { kindOf } from '../web/js/model.js';

export const GENERATOR_VERSION = '1.0.0';
export const MIN_ENTRIES = 1000;
export const MAX_ENTRIES = 10_000_000;

const MIN = 60e3;
const DAY = 86400e3;
const YEAR = 365.25 * DAY;
const LEVELS = 12;
/** Mean child folders per folder, by level; level 0 draws 14 to 24. */
const FAN = [0, 6, 3.2, 3.2, 3.2, 3.2, 1.6, 1.6, 1.6, 1.6, 0.6, 0.6, 0];
const BATCH = 200;

/* ---------- small helpers ---------- */

/** mulberry32: a fast, seeded, deterministic generator of [0, 1). */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** '100k', '1m', '2.5m' or a plain number, as a whole number of entries; NaN otherwise. */
export function parseEntries(text) {
  const m = /^(\d+(?:\.\d+)?)([km]?)$/i.exec(String(text ?? '').trim().replace(/_/g, ''));
  if (!m) return NaN;
  return Math.round(Number(m[1]) * (m[2].toLowerCase() === 'm' ? 1e6 : m[2].toLowerCase() === 'k' ? 1e3 : 1));
}

/** 100000 -> '100k', 5000000 -> '5m', anything else its digits. */
export function labelOf(n) {
  if (n >= 1e6 && n % 1e5 === 0) return `${n / 1e6}m`;
  if (n >= 1e3 && n % 1e3 === 0) return `${n / 1e3}k`;
  return String(n);
}

/** Today at 12:00 local time, so two runs on one day agree. */
export function noonToday() {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  return d.getTime();
}

const pad = (n, w) => String(n).padStart(w, '0');

/** A moment as a person reads it here: MM/DD/YYYY HH:MM, local time. */
export function dateTime(ms) {
  const d = new Date(ms);
  return `${pad(d.getMonth() + 1, 2)}/${pad(d.getDate(), 2)}/${d.getFullYear()} ${pad(d.getHours(), 2)}:${pad(d.getMinutes(), 2)}`;
}

/* ---------- names ---------- */

const T_CODE = 0;
const T_PHOTOS = 1;
const T_VIDEO = 2;
const T_MUSIC = 3;
const T_DOCS = 4;
const T_DATA = 5;
const T_ARCHIVE = 6;
const T_MIXED = 7;

const R_PLAIN = 0;
const R_CONTAINER = 1;
const R_PROJECT = 2;
const R_GIT = 3;
const R_MODULES = 4;
const R_OBJECTS = 5;
const R_PACKAGE = 6;

const TOP = [
  ['Projects', T_CODE, R_CONTAINER], ['Photos', T_PHOTOS], ['Video', T_VIDEO], ['Music', T_MUSIC], ['Documents', T_DOCS],
  ['Data', T_DATA], ['Archive', T_ARCHIVE], ['Downloads', T_MIXED], ['Desktop', T_MIXED], ['Work', T_DOCS],
  ['Code', T_CODE, R_CONTAINER], ['Camera Uploads', T_PHOTOS], ['Footage', T_VIDEO], ['Samples', T_MUSIC], ['Datasets', T_DATA],
  ['Backups', T_ARCHIVE], ['Clients', T_DOCS], ['Experiments', T_CODE, R_CONTAINER], ['Scans', T_DOCS], ['Shared', T_MIXED],
  ['Renders', T_VIDEO], ['Old Laptop', T_ARCHIVE], ['Library', T_DOCS], ['Misc', T_MIXED],
];
const ADJ = ['harbor', 'tidepool', 'granite', 'amber', 'north', 'quiet', 'copper', 'salt', 'cedar', 'violet', 'rapid', 'lunar', 'iron', 'paper', 'silver', 'delta'];
const NOUN = ['api', 'web', 'engine', 'tools', 'kit', 'studio', 'lab', 'core', 'sync', 'deck', 'atlas', 'relay', 'forge', 'garden', 'ledger', 'pilot'];
const PROJECT_KIDS = [['src'], ['.git', R_GIT], ['node_modules', R_MODULES], ['test'], ['docs'], ['scripts'], ['assets'], ['build'], ['config'], ['examples'], ['lib'], ['dist'], ['tools'], ['public'], ['packages']];
const GIT_KIDS = ['objects', 'refs', 'hooks', 'info', 'logs', 'branches'];
const PACKAGES = ['react', 'lodash', '@babel', 'typescript', 'webpack', 'eslint', 'vite', 'express', 'chalk', 'debug', 'semver', 'glob', 'rxjs', 'zod', 'three', 'jest', 'mocha', 'axios', 'yargs', 'commander', 'postcss', 'esbuild', 'rollup', 'prettier', 'uuid', 'ws', 'dotenv', 'minimist', 'tslib', 'core-js'];
const PACKAGE_KIDS = ['lib', 'dist', 'src', 'esm', 'cjs', 'types', 'test', 'bin'];
const CODE_DIRS = ['components', 'utils', 'hooks', 'models', 'views', 'api', 'core', 'internal', 'services', 'handlers', 'styles', 'fixtures', 'migrations', 'routes', 'store', 'helpers'];
const THEME_DIRS = [
  CODE_DIRS,
  ['RAW', 'Edited', 'Exports', 'Selects', 'Camera Roll', 'Prints', 'Phone', 'Scans'],
  ['Footage', 'A-cam', 'B-cam', 'Renders', 'Proxies', 'Audio', 'Graphics', 'Exports', 'Project Files', 'Cache'],
  ['Albums', 'Stems', 'Samples', 'Mixes', 'Masters', 'Sessions', 'Bounces', 'Loops'],
  ['Taxes', 'Contracts', 'Notes', 'Invoices', 'Receipts', 'Reports', 'Letters', 'Manuals', 'Research', 'Meetings'],
  ['raw', 'processed', 'shards', 'exports', 'staging', 'archive', 'tmp', 'features'],
  ['Backups', 'Old Laptop', 'Discs', 'Imports', 'Phone Backup', 'Email', 'Site'],
  ['misc', 'New folder', 'stuff', 'temp', 'inbox', 'sort later', 'keep'],
];
const THEME_STEM = ['module', 'shoot', 'reel', 'session', 'section', 'part', 'backup', 'folder'];
const PLACES = ['Lisbon', 'Kyoto', 'Oslo', 'Tide pools', 'Coast', 'Desert', 'Wedding', 'Garden', 'Harbor', 'Alps'];
const HIDDEN_DIRS = ['.cache', '.vscode', '.idea', '.config', '.thumbnails'];
const HIDDEN_FILES = ['.env', '.gitignore', '.DS_Store', '.npmrc', '.editorconfig', '.prettierrc', '.eslintrc.json', '.babelrc', '.htaccess', '.dockerignore'];
const WORDS = ['index', 'utils', 'main', 'app', 'config', 'server', 'client', 'helpers', 'types', 'constants', 'routes', 'store', 'api', 'auth', 'db', 'logger', 'parser', 'render', 'schema', 'session', 'cache', 'queue', 'worker', 'model', 'view', 'layout', 'theme', 'events', 'format', 'errors'];
const TRACKS = ['Low Tide', 'Signal', 'Northern', 'Glass', 'Paper Moon', 'Static', 'Harbor Lights', 'Undertow', 'Driftwood', 'Long Way'];
const RAW_EXT = new Set(['arw', 'cr3', 'cr2', 'nef', 'dng', 'raf']);

/** Extensions by theme, with weights; one table per theme. */
const EXTS = [
  [['js', 20], ['ts', 15], ['tsx', 8], ['py', 10], ['json', 8], ['md', 6], ['css', 5], ['html', 3], ['go', 4], ['rs', 4], ['c', 2], ['h', 2], ['yaml', 3], ['sh', 2], ['svg', 2], ['png', 2], ['map', 2], ['lock', 1], ['toml', 1], ['wasm', 1], ['so', 1], ['dll', 1], ['exe', 1]],
  [['jpg', 60], ['ARW', 8], ['CR3', 6], ['NEF', 4], ['DNG', 2], ['heic', 10], ['png', 5], ['psd', 3], ['mp4', 2]],
  [['mp4', 40], ['mov', 30], ['mkv', 5], ['m4v', 5], ['wav', 6], ['srt', 4], ['xml', 4], ['prproj', 2], ['jpg', 4]],
  [['flac', 30], ['wav', 30], ['mp3', 25], ['aiff', 5], ['als', 3], ['mid', 2], ['jpg', 5]],
  [['pdf', 35], ['docx', 20], ['xlsx', 10], ['md', 10], ['txt', 10], ['pptx', 5], ['odt', 2], ['rtf', 2], ['png', 3], ['jpg', 3]],
  [['parquet', 30], ['csv', 25], ['json', 15], ['jsonl', 10], ['npy', 5], ['h5', 5], ['sqlite', 3], ['arrow', 3], ['gz', 4]],
  [['zip', 40], ['gz', 10], ['tgz', 5], ['7z', 10], ['rar', 5], ['iso', 5], ['dmg', 3], ['tar', 7], ['pdf', 8], ['jpg', 7], ['exe', 4], ['bin', 2]],
];
const EXT_TOTAL = EXTS.map((t) => t.reduce((a, [, w]) => a + w, 0));

/** Log-normal size parameters by kind index (model.js KINDS), and RAW apart: [median bytes, sigma]. */
const SIZE = {
  0: [4 * 1024, 1.2], 1: [400 * 1024, 1.0], 2: [3 * 1024 ** 2, 0.8], 3: [300 * 1024 ** 2, 1.2], 4: [8 * 1024 ** 2, 0.8],
  5: [50 * 1024 ** 2, 1.5], 6: [2 * 1024 ** 2, 2.0], 7: [1024 ** 2, 1.2], 8: [20 * 1024, 1.5], raw: [25 * 1024 ** 2, 0.3],
};

/* ---------- the plan: the folder skeleton and every folder's file count ---------- */

/**
 * Builds the skeleton: breadth-first folder ids with parent, level,
 * theme, role and name, every folder's file count, and the folders that
 * could not be read. Holds typed arrays and one name per folder.
 */
export function plan({ entries, seed = 11, now = noonToday(), name = null } = {}) {
  if (!Number.isInteger(entries) || entries < MIN_ENTRIES || entries > MAX_ENTRIES) {
    throw new RangeError(`A synthetic tree holds ${MIN_ENTRIES.toLocaleString('en-US')} to ${MAX_ENTRIES.toLocaleString('en-US')} entries, not ${entries}.`);
  }
  const R = mulberry32(seed);
  const label = labelOf(entries);
  const F = Math.max(16, Math.round(entries * 0.09));

  // Level counts: level 1 draws 14 to 24; deeper levels follow the
  // fan-out means scaled by one factor x, found so the expected count
  // meets F; rounding is settled on the widest level.
  const c1 = Math.min(F - 1, 14 + Math.floor(R() * 11));
  const levelsOf = (x) => {
    const out = [1, c1];
    for (let L = 1; L < LEVELS; L++) out.push(out[L] * FAN[L] * x);
    return out;
  };
  let lo = 0;
  let hi = 20;
  for (let i = 0; i < 80; i++) {
    const x = (lo + hi) / 2;
    if (levelsOf(x).reduce((a, b) => a + b, 0) > F) hi = x;
    else lo = x;
  }
  const want = levelsOf(lo).map((c) => Math.round(c));
  want[0] = 1;
  want[1] = c1;
  let diff = F - want.reduce((a, b) => a + b, 0);
  let widest = 2;
  for (let L = 2; L <= LEVELS; L++) if (want[L] > want[widest]) widest = L;
  want[widest] = Math.max(0, want[widest] + diff);
  for (let L = 2; L <= LEVELS; L++) if (!want[L - 1]) want[L] = 0;
  diff = F - want.reduce((a, b) => a + b, 0);
  want[widest] += diff;

  const parent = new Int32Array(F);
  const level = new Uint8Array(F);
  const theme = new Uint8Array(F);
  const role = new Uint8Array(F);
  const kids = new Uint32Array(F);
  const names = new Array(F);
  parent[0] = -1;
  names[0] = name || `synthetic-${label}`;
  theme[0] = T_MIXED;
  let next = 1;
  let from = 0;
  let to = 1;
  for (let L = 0; L < LEVELS && next < F; L++) {
    const count = Math.min(want[L + 1] || 0, F - next);
    if (count <= 0) break;
    const n = to - from;
    // Each folder of this level gets a weight; children go to folders by
    // weight, so a few hold many and many hold none.
    const cum = new Float64Array(n);
    let sum = 0;
    for (let i = 0; i < n; i++) {
      const w = L === 0 ? 1 : Math.pow(-Math.log(1 - R()), 1.3);
      sum += w;
      cum[i] = sum;
    }
    const per = new Uint32Array(n);
    if (L === 0) per[0] = count;
    else {
      for (let k = 0; k < count; k++) {
        const t = R() * sum;
        let a = 0;
        let b = n - 1;
        while (a < b) {
          const mid = (a + b) >> 1;
          if (cum[mid] < t) a = mid + 1;
          else b = mid;
        }
        per[a]++;
      }
    }
    for (let i = 0; i < n; i++) {
      const p = from + i;
      kids[p] = per[i];
      const used = new Set();
      for (let k = 0; k < per[i]; k++) {
        const id = next++;
        parent[id] = p;
        level[id] = L + 1;
        let nm;
        let th = theme[p];
        let rl = R_PLAIN;
        if (L === 0) {
          const top = TOP[k % TOP.length];
          nm = k < TOP.length ? top[0] : `${top[0]} ${Math.floor(k / TOP.length) + 1}`;
          th = top[1];
          rl = top[2] || R_PLAIN;
        } else if (role[p] === R_CONTAINER) {
          nm = `${ADJ[Math.floor(R() * ADJ.length)]}-${NOUN[Math.floor(R() * NOUN.length)]}`;
          rl = R_PROJECT;
        } else if (role[p] === R_PROJECT && k < PROJECT_KIDS.length) {
          nm = PROJECT_KIDS[k][0];
          rl = PROJECT_KIDS[k][1] || R_PLAIN;
        } else if (role[p] === R_GIT && k < GIT_KIDS.length) {
          nm = GIT_KIDS[k];
          rl = k === 0 ? R_OBJECTS : R_PLAIN;
        } else if (role[p] === R_OBJECTS) {
          nm = pad(((p * 37 + k) % 256).toString(16), 2);
        } else if (role[p] === R_MODULES) {
          nm = k < PACKAGES.length ? PACKAGES[k] : `pkg-${k}`;
          rl = R_PACKAGE;
        } else if (role[p] === R_PACKAGE && k < PACKAGE_KIDS.length) {
          nm = PACKAGE_KIDS[k];
        } else if (R() < 0.03) {
          nm = HIDDEN_DIRS[Math.floor(R() * HIDDEN_DIRS.length)];
        } else {
          if (th === T_MIXED && R() < 0.3) th = Math.floor(R() * 7);
          const list = THEME_DIRS[th];
          if (th === T_PHOTOS && R() < 0.5) nm = `${2014 + Math.floor(R() * 13)}-${pad(1 + Math.floor(R() * 12), 2)} ${PLACES[Math.floor(R() * PLACES.length)]}`;
          else if (th === T_DOCS && R() < 0.3) nm = String(2014 + Math.floor(R() * 13));
          else nm = k < list.length && R() < 0.7 ? list[k] : `${THEME_STEM[th]}-${pad(k + 1, 2)}`;
        }
        if (used.has(nm)) {
          let j = 2;
          while (used.has(`${nm} (${j})`)) j++;
          nm = `${nm} (${j})`;
        }
        used.add(nm);
        names[id] = nm;
        theme[id] = th;
        role[id] = rl;
      }
    }
    from = to;
    to = next;
  }
  // Every entry that is not a folder is a file, so the counts are exact
  // whatever the skeleton reached.
  const F2 = next;
  const N = entries - F2;

  // Folders that could not be read: leaves only, EACCES and EPERM in turn.
  const leaves = [];
  for (let i = 1; i < F2; i++) if (!kids[i]) leaves.push(i);
  const take = (list) => {
    const j = Math.floor(R() * list.length);
    const x = list[j];
    list[j] = list[list.length - 1];
    list.pop();
    return x;
  };
  const err = new Uint8Array(F2);
  const errCount = Math.max(2, Math.round(F2 * 0.0005));
  for (let i = 0; i < errCount && leaves.length; i++) err[take(leaves)] = 1 + (i % 2);

  // The big folders: 5,001 to 30,000 files each, for the region's tail.
  // Drawn freely; only a set that would pass 35% of the files is scaled
  // down, never below 5,001 each.
  const files = new Uint32Array(F2);
  const big = new Uint8Array(F2);
  let bigFiles = 0;
  const bigCount = N >= 20000 ? Math.max(1, Math.round(F2 * 0.0002)) : 0;
  const deepLeaves = leaves.filter((i) => level[i] >= 2 && [T_PHOTOS, T_VIDEO, T_DATA, T_MIXED].includes(theme[i]));
  const bigSet = [];
  for (let i = 0; i < bigCount; i++) {
    const pool = deepLeaves.length ? deepLeaves : leaves;
    if (!pool.length) break;
    bigSet.push([take(pool), 5001 + Math.floor(R() * 25000)]);
  }
  const drawn = bigSet.reduce((a, [, n]) => a + n, 0);
  const budget = Math.floor(N * 0.35);
  for (const [x, n0] of bigSet) {
    const n = drawn > budget ? Math.max(5001, Math.floor((n0 * budget) / drawn)) : n0;
    if (bigFiles + n > budget) break;
    big[x] = 1;
    files[x] = n;
    bigFiles += n;
  }

  // The rest by Pareto weights, alpha 1.2, capped; about 5% of folders
  // hold none. floor(share), then the remainder one at a time.
  const weight = new Float64Array(F2);
  const eligible = [];
  let total = 0;
  for (let i = 0; i < F2; i++) {
    if (err[i] || big[i] || R() < 0.05) continue;
    const w = Math.min(2500, Math.pow(1 - R(), -1 / 1.2));
    weight[i] = w;
    total += w;
    eligible.push(i);
  }
  const rest = N - bigFiles;
  let given = 0;
  for (const i of eligible) {
    const n = Math.floor((weight[i] / total) * rest);
    files[i] = n;
    given += n;
  }
  for (let r = rest - given; r > 0; r--) files[eligible[Math.floor(R() * eligible.length)]]++;

  let deepest = 0;
  let largest = 0;
  for (let i = 0; i < F2; i++) {
    if (level[i] > deepest) deepest = level[i];
    if (files[i] > largest) largest = files[i];
  }
  return {
    entries, seed, now, label, name: names[0], folders: F2, files: N, R,
    parent, level, theme, role, kids, names, err, counts: files, big, deepest, largest,
  };
}

/* ---------- the records ---------- */

function normal(R) {
  const u = 1 - R();
  const v = R();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function pick(R, table, total) {
  let t = R() * total;
  for (const [x, w] of table) {
    t -= w;
    if (t < 0) return x;
  }
  return table[table.length - 1][0];
}

/**
 * The scanner records of a plan, in batches of 200: [id, pid, name,
 * mtime, err, files], breadth first, files packed name, size, mtime,
 * flags. Folder by folder, only one folder's files at a time.
 */
export function* records(p) {
  const { R, now } = p;
  const ring = [];
  let out = [];
  let bigSeen = 0;
  // Links and specials at fixed shares of the files, at least one each.
  const linkEvery = Math.max(1, Math.round(1 / 0.001));
  const specialEvery = Math.max(1, Math.round(1 / 0.0001));
  let fileNo = 0;
  let links = 0;
  let specials = 0;
  for (let id = 0; id < p.folders; id++) {
    const th0 = p.theme[id];
    const rl = p.role[id];
    const n = p.counts[id];
    // The folder's working period inside the last 12 years; about 10% are
    // active in the last 30 days.
    const end = R() < 0.1 ? now - R() * 30 * DAY : now - Math.pow(R(), 1.5) * 12 * YEAR;
    const span = Math.exp(R() * Math.log(3650)) * DAY;
    const start = Math.max(now - 12 * YEAR, end - span);
    const err = p.err[id] ? (p.err[id] === 1 ? 'EACCES' : 'EPERM') : 0;
    const packed = [];
    let newest = 0;
    if (!err && n) {
      const used = new Set();
      const camera = ['IMG_', 'DSC0', '_MG_', 'PXL_', 'DJI_'][Math.floor(R() * 5)];
      let seq = 1000 + Math.floor(R() * 8000);
      const bulk = p.big[id] && bigSeen++ % 4 === 0 ? Math.min(2000, n) : 0;
      let left = 0;
      let at = 0;
      let width = 0;
      for (let i = 0; i < n; i++) {
        // A session: 5 to 200 files within 2 to 30 minutes; a bulk write
        // puts 2,000 within 10 seconds.
        if (left === 0) {
          left = i === 0 && bulk ? bulk : Math.min(n - i, 5 + Math.floor(R() * 196));
          width = i === 0 && bulk ? 10e3 : (2 + R() * 28) * MIN;
          at = start + R() * Math.max(0, end - start - width);
        }
        left--;
        const mtime = Math.min(now, Math.round(at + R() * width));
        const th = th0 === T_MIXED ? Math.floor(R() * 7) : th0;
        let name;
        let size = -1;
        let flags = 0;
        if (ring.length > 8 && R() < 0.02) {
          // A copy of an earlier file's size, and often its name.
          const e = ring[Math.floor(R() * ring.length)];
          size = e[1];
          if (R() < 0.6) name = e[0];
        }
        if (name === undefined && R() < 0.01) name = HIDDEN_FILES[Math.floor(R() * HIDDEN_FILES.length)];
        if (name === undefined || used.has(name)) {
          if (rl === R_OBJECTS || (rl === R_PLAIN && p.role[p.parent[id]] === R_OBJECTS)) {
            name = '';
            for (let k = 0; k < 38; k++) name += '0123456789abcdef'[Math.floor(R() * 16)];
          } else if (rl === R_PACKAGE && i < 4) name = ['index.js', 'package.json', 'README.md', 'LICENSE'][i];
          else {
            const ext = pick(R, EXTS[th], EXT_TOTAL[th]);
            if (th === T_PHOTOS) name = `${camera}${pad(seq++, 4)}.${ext}`;
            else if (th === T_VIDEO) name = R() < 0.5 ? `clip-${pad(seq++, 4)}.${ext}` : `A${pad(1 + Math.floor(R() * 9), 3)}_C${pad(seq++, 3)}.${ext}`;
            else if (th === T_MUSIC) name = R() < 0.6 ? `${pad(i + 1, 2)} - ${TRACKS[Math.floor(R() * TRACKS.length)]}.${ext}` : `stem-${['bass', 'drums', 'vox', 'keys', 'fx'][Math.floor(R() * 5)]}-${pad(seq++, 2)}.${ext}`;
            else if (th === T_DOCS) name = `${['report', 'invoice', 'notes', 'meeting', 'contract', 'statement'][Math.floor(R() * 6)]}-${2014 + Math.floor(R() * 13)}-${pad(1 + Math.floor(R() * 12), 2)}.${ext}`;
            else if (th === T_DATA) name = `${['part', 'dump', 'events', 'features', 'shard'][Math.floor(R() * 5)]}-${pad(seq++, 5)}.${ext}`;
            else if (th === T_ARCHIVE) name = `${['backup', 'site', 'old-photos', 'export', 'mail'][Math.floor(R() * 5)]}-${2010 + Math.floor(R() * 16)}${ext === 'gz' ? '.tar' : ''}.${ext}`;
            else name = `${WORDS[Math.floor(R() * WORDS.length)]}.${ext}`;
          }
        }
        if (used.has(name)) {
          const dot = name.lastIndexOf('.');
          const stem = dot > 0 ? name.slice(0, dot) : name;
          const ext = dot > 0 ? name.slice(dot) : '';
          let j = 2;
          while (used.has(`${stem} (${j})${ext}`)) j++;
          name = `${stem} (${j})${ext}`;
        }
        used.add(name);
        if (name.startsWith('.')) flags |= 2;
        fileNo++;
        if (fileNo % linkEvery === 0 || (links === 0 && fileNo === 7)) {
          flags |= 1;
          links++;
        } else if (fileNo % specialEvery === specialEvery - 1 || (specials === 0 && fileNo === 13)) {
          flags |= 4;
          specials++;
        }
        if (flags & 5) size = 0;
        else if (size < 0) {
          if (R() < 0.005) size = 0;
          else {
            const ext = name.slice(name.lastIndexOf('.') + 1).toLowerCase();
            const [median, sigma] = RAW_EXT.has(ext) ? SIZE.raw : SIZE[kindOf(name)];
            size = Math.max(1, Math.round(median * Math.exp(sigma * normal(R))));
          }
        }
        if (!(flags & 5) && size >= 4096) {
          if (ring.length < 256) ring.push([name, size]);
          else ring[Math.floor(R() * 256)] = [name, size];
        }
        if (mtime > newest) newest = mtime;
        packed.push(name, size, mtime, flags);
      }
    }
    const mtime = newest || Math.round(Math.min(now, end));
    out.push([id, p.parent[id], p.names[id], mtime, err, packed]);
    if (out.length >= BATCH) {
      yield out;
      out = [];
    }
  }
  if (out.length) yield out;
}

/** The scanner batches of a synthetic tree: deterministic for one seed and one now. */
export function* generate({ entries, seed = 11, now = noonToday(), name = null } = {}) {
  yield* records(plan({ entries, seed, now, name }));
}

/* ---------- writing ---------- */

const fold = (p) => (process.platform === 'win32' ? path.resolve(p).toLowerCase() : path.resolve(p));

/** Why out may not be written to, or null. */
export function refusal(out, entries) {
  if (!Number.isInteger(entries) || entries < MIN_ENTRIES || entries > MAX_ENTRIES) {
    return `A synthetic tree holds ${MIN_ENTRIES.toLocaleString('en-US')} to ${MAX_ENTRIES.toLocaleString('en-US')} entries; ${Number.isFinite(entries) ? entries.toLocaleString('en-US') : 'that'} is not in range.`;
  }
  const real = fold(datasetHome('projects'));
  const o = fold(out);
  if (o === real || o.startsWith(real + path.sep)) {
    return `${out} is the snapshot of the real projects directory, or lies inside it; synthetic trees are written elsewhere.`;
  }
  for (const file of listSnapshots(out)) {
    let meta = null;
    try {
      meta = readMeta(file);
    } catch { /* unreadable: not ours to replace */ }
    if (!meta?.synthetic) return `${out} holds a snapshot of a real directory (${path.basename(file)}); synthetic trees are written to a folder of their own.`;
  }
  return null;
}

/**
 * Writes a synthetic snapshot into out and resolves to its figures:
 * entries, folders, files, bytes, deepest, largest, seed, ms, dbBytes,
 * file. Throws with a sentence (code EREFUSED) for a refused out.
 */
export async function writeSynthetic({ entries, seed = 11, now = noonToday(), out = null, name = null } = {}) {
  const label = labelOf(entries);
  const dir = path.resolve(out || datasetHome(`synthetic-${label}`));
  const why = refusal(dir, entries);
  if (why) {
    const e = new Error(why);
    e.code = 'EREFUSED';
    throw e;
  }
  const t0 = Date.now();
  const p = plan({ entries, seed, now, name });
  const w = snapshotWriter(dir, { takenAt: now });
  try {
    for (const batch of records(p)) w.add(batch);
  } catch (err) {
    await w.abort();
    throw err;
  }
  const { folders, files, bytes } = w.counts;
  const meta = await w.finish({
    format: SNAPSHOT_FORMAT, root: path.join(os.tmpdir(), 'terrane-synthetic', label), name: p.name, sep: path.sep,
    platform: process.platform, takenAt: now, durationMs: Date.now() - t0, folders, files, bytes,
    synthetic: { seed, entries, now, generator: GENERATOR_VERSION },
  });
  return {
    entries: folders + files, folders, files, bytes, deepest: p.deepest, largest: p.largest, seed, now,
    ms: Date.now() - t0, dbBytes: fs.statSync(meta.file).size, file: meta.file, dir,
  };
}

/* ---------- the command line ---------- */

async function main(argv) {
  const opt = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (['--entries', '--seed', '--now', '--out', '--name'].includes(a)) opt[a.slice(2)] = argv[++i];
    else if (a === '--json') opt.json = true;
    else if (a === '--help') opt.help = true;
    else {
      console.error(`  Unknown argument: ${a}`);
      return 2;
    }
  }
  if (opt.help || opt.entries === undefined) {
    console.error('\n  Usage: node tools/make-synthetic.mjs --entries <n|100k|1m|2m|5m> [--seed n] [--now ms] [--out folder] [--name name] [--json]\n');
    return opt.help ? 0 : 2;
  }
  const entries = parseEntries(opt.entries);
  const seed = opt.seed === undefined ? 11 : Number(opt.seed);
  const now = opt.now === undefined ? noonToday() : Number(opt.now);
  if (!Number.isInteger(seed) || !Number.isFinite(now)) {
    console.error('  --seed takes a whole number and --now a time in milliseconds.');
    return 2;
  }
  const out = path.resolve(opt.out || datasetHome(`synthetic-${labelOf(entries)}`));
  const why = refusal(out, entries);
  if (why) {
    console.error(`  ${why}`);
    return 2;
  }
  const disk = (() => {
    try {
      fs.mkdirSync(out, { recursive: true });
      const s = fs.statfsSync(out);
      return s.bavail * s.bsize;
    } catch {
      return Infinity;
    }
  })();
  if (disk < 2 * 1024 ** 3) {
    console.error(`  Only ${(disk / 1024 ** 3).toFixed(1)} GB is free where ${out} is; a synthetic snapshot is written only with at least 2 GB free.`);
    return 2;
  }
  const r = await writeSynthetic({ entries, seed, now, out, name: opt.name || null });
  if (opt.json) console.log(JSON.stringify(r));
  else {
    const f = (n) => n.toLocaleString('en-US');
    console.log([
      '',
      `  Synthetic tree     : ${r.file}`,
      `  Entries            : ${f(r.entries)} (${f(r.folders)} folders, ${f(r.files)} files)`,
      `  Bytes              : ${f(r.bytes)} (${(r.bytes / 1024 ** 4).toFixed(2)} TB)`,
      `  Deepest level      : ${r.deepest}`,
      `  Largest folder     : ${f(r.largest)} files`,
      `  Seed, now          : ${r.seed}, ${dateTime(r.now)}`,
      `  Written in         : ${(r.ms / 1000).toFixed(1)} s, ${(r.dbBytes / 1024 ** 2).toFixed(1)} MB`,
      '',
    ].join('\n'));
  }
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then((code) => process.exit(code), (err) => {
    console.error(`  make-synthetic stopped: ${err.message}`);
    process.exit(err.code === 'EREFUSED' ? 2 : 1);
  });
}
