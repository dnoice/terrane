#!/usr/bin/env node
/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Development Runner (Terrane Edition - v1.0)
 *     - File Name: dev.mjs
 *     - Relative Path: tools/dev.mjs
 *     - Artifact Type: CLI
 *     - Version: 1.0.0
 *     - Date: 11/11/2026
 *     - Update: Wednesday, November 11, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Description:
 *     One command for development against real-world data without touching
 *     real files: it refreshes the structure snapshot of the target when
 *     stale, starts Terrane in snapshot mode, keeps the thumbnail dataset
 *     current in the background, and re-snapshots on an interval while it
 *     runs so the data stays recent.
 *
 * ✒ Key Features:
 *     - Remembers the target in .dev/config.json (git-ignored), so later
 *       runs are just `npm run dev`
 *     - Takes a snapshot on start only when the newest is older than
 *       --max-age, so restarts are instant
 *     - Re-snapshots every --every minutes; the running service notices
 *       and the open page offers to rescan
 *     - Runs the thumbnail builder after each snapshot at below-normal
 *       priority, one run at a time, logging to the dataset folder
 *     - The service it starts is in snapshot mode: no real file is read or
 *       changed by it
 *     - Ctrl+C stops the service and any builder it started
 *
 * ✒ Usage Instructions:
 *     npm run dev -- --target <directory>     first time
 *     npm run dev                             afterwards
 *
 * ✒ Examples:
 *     npm run dev -- --target "C:\Users\DnnsS\OneDrive\Desktop\dd1\projects"
 *     npm run dev -- --every 30 --max-age 2
 *     npm run dev -- --no-thumbs --port 5050
 *
 * ✒ Command-Line Arguments:
 *     Input:
 *         --target <dir>    The real directory to mirror. Saved for next time.
 *     Processing:
 *         --every <min>     Minutes between snapshots while running (60).
 *         --max-age <h>     Refresh on start when older than this (6).
 *         --no-thumbs       Do not run the thumbnail builder.
 *     Output:
 *         --port <n>        Preferred port for the service.
 *         --no-open         Do not open the browser.
 *
 * ✒ Other Important Information:
 *     - Dependencies: Node.js 22.5+; Python 3.10+ with Pillow for
 *       thumbnails (optional; set PYTHON to choose the interpreter)
 *     - Compatible platforms: Windows (primary), macOS, Linux
 * ----------------------------------------------------------------------------
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { takeSnapshot, listSnapshots, readMeta, datasetHome, slugOf } from '../server/snapshot.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECT = path.join(HERE, '..');
const CONFIG = path.join(PROJECT, '.dev', 'config.json');

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const option = (n) => {
  const i = args.indexOf(n);
  return i >= 0 ? args[i + 1] : undefined;
};

let config = {};
try {
  config = JSON.parse(fs.readFileSync(CONFIG, 'utf8'));
} catch { /* first run */ }
const target = option('--target') || config.target;
if (!target) {
  console.error('\n  First run: name the directory to mirror.\n  npm run dev -- --target "C:\\path\\to\\directory"\n');
  process.exit(1);
}
const every = Number(option('--every') || config.everyMinutes || 60);
const maxAge = Number(option('--max-age') || config.maxAgeHours || 6);
config = { target: path.resolve(target), everyMinutes: every, maxAgeHours: maxAge };
fs.mkdirSync(path.dirname(CONFIG), { recursive: true });
fs.writeFileSync(CONFIG, JSON.stringify(config, null, 2));

const data = datasetHome(slugOf(config.target));
const say = (s) => console.log(`  [dev] ${s}`);
const n = (v) => Number(v).toLocaleString('en-US');

async function snapshot(reason) {
  say(`Snapshot (${reason}) of ${config.target}…`);
  const meta = await takeSnapshot(config.target, data);
  say(`Snapshot ready: ${n(meta.folders)} folders, ${n(meta.files)} files in ${(meta.durationMs / 1000).toFixed(1)} s`);
}

let builder = null;
function buildThumbs() {
  if (flag('--no-thumbs') || builder) return;
  const log = fs.openSync(path.join(data, 'thumbs-run.log'), 'w');
  builder = spawn(process.env.PYTHON || 'python', [path.join(HERE, 'thumbs.py'), '--data', data], {
    stdio: ['ignore', log, log], windowsHide: true,
  });
  builder.once('spawn', () => {
    try {
      os.setPriority(builder.pid, os.constants.priority.PRIORITY_BELOW_NORMAL);
    } catch { /* not permitted */ }
    say('Thumbnails updating in the background (log: thumbs-run.log in the dataset folder)');
  });
  builder.once('error', () => {
    say('Thumbnails skipped: Python was not found (set PYTHON, or pass --no-thumbs).');
    builder = null;
  });
  builder.once('exit', (code) => {
    fs.closeSync(log);
    if (code === 0) say('Thumbnails up to date');
    else if (code !== null) say(`Thumbnail builder stopped with code ${code}; see thumbs-run.log`);
    builder = null;
  });
}

const newest = listSnapshots(data)[0];
const age = newest ? (Date.now() - readMeta(newest).takenAt) / 3600000 : Infinity;
if (age > maxAge) await snapshot(newest ? `older than ${maxAge} h` : 'none yet');
else say(`Using snapshot from ${(age * 60).toFixed(0)} min ago`);
buildThumbs();

const passthrough = [];
if (option('--port')) passthrough.push('--port', option('--port'));
if (flag('--no-open')) passthrough.push('--no-open');
const service = spawn(process.execPath, [path.join(PROJECT, 'server', 'terrane.mjs'), '--snapshot', data, ...passthrough], { stdio: 'inherit' });

const timer = setInterval(() => {
  snapshot(`every ${every} min`).then(buildThumbs).catch((err) => say(`Snapshot failed: ${err.message}`));
}, every * 60000);

const stop = () => {
  clearInterval(timer);
  builder?.kill();
  service.kill();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
service.on('exit', (code) => {
  clearInterval(timer);
  builder?.kill();
  process.exit(code ?? 0);
});
