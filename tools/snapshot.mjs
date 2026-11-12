#!/usr/bin/env node
/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Snapshot Tool (Terrane Edition - v1.0)
 *     - File Name: snapshot.mjs
 *     - Relative Path: tools/snapshot.mjs
 *     - Artifact Type: CLI
 *     - Version: 1.0.0
 *     - Date: 11/11/2026
 *     - Update: Wednesday, November 11, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Description:
 *     Records the structure of a real directory into a structure database
 *     that `terrane --snapshot` serves, so development and demonstration
 *     run against real-world shape without the service touching real
 *     files. Reads names, sizes, dates and entry types only.
 *
 * ✒ Key Features:
 *     - One command, progress on one line, summary at the end
 *     - Writes into the dataset home for the target (outside OneDrive by
 *       default), or any folder given with --out
 *     - --every repeats the snapshot on an interval until stopped
 *     - Keeps the newest three snapshots and prunes older ones
 *
 * ✒ Usage Instructions:
 *     node tools/snapshot.mjs <directory> [--out <folder>] [--every <minutes>]
 *     npm run snapshot -- <directory>
 *
 * ✒ Examples:
 *     npm run snapshot -- "C:\Users\DnnsS\OneDrive\Desktop\dd1\projects"
 *     node tools/snapshot.mjs ~/Music --out ./snaps
 *     node tools/snapshot.mjs D:\archive --every 60
 *
 * ✒ Command-Line Arguments:
 *     Input:
 *         <directory>       The real directory to record. Only read.
 *     Output:
 *         --out <folder>    Where snapshots go. Default: the dataset home,
 *                           %LOCALAPPDATA%\terrane\datasets\<name>.
 *     Processing:
 *         --every <min>     Take a new snapshot every so many minutes.
 *
 * ✒ Other Important Information:
 *     - Dependencies: Node.js 22.5+ (node:sqlite); server/snapshot.mjs
 *     - Compatible platforms: Windows, macOS, Linux
 * ----------------------------------------------------------------------------
 */

import { takeSnapshot, datasetHome, slugOf } from '../server/snapshot.mjs';

const args = process.argv.slice(2);
const option = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const positional = args.filter((a, i) => !a.startsWith('--') && !['--out', '--every'].includes(args[i - 1]));
if (positional.length !== 1) {
  console.error('\n  Usage: node tools/snapshot.mjs <directory> [--out <folder>] [--every <minutes>]\n');
  process.exit(1);
}
const target = positional[0];
const out = option('--out') || datasetHome(slugOf(target));
const every = Number(option('--every')) || 0;

const mb = (b) => (b / 1048576).toLocaleString('en-US', { maximumFractionDigits: 1 });
const n = (v) => v.toLocaleString('en-US');

async function once() {
  const t0 = Date.now();
  let last = 0;
  const meta = await takeSnapshot(target, out, {
    onProgress: ({ folders, files, bytes }) => {
      if (Date.now() - last < 250 || !process.stdout.isTTY) return;
      last = Date.now();
      process.stdout.write(`\r  ${n(folders)} folders · ${n(files)} files · ${mb(bytes)} MB`);
    },
  });
  if (process.stdout.isTTY) process.stdout.write('\r\x1b[K');
  console.log(`  Snapshot: ${n(meta.folders)} folders, ${n(meta.files)} files, ${mb(meta.bytes)} MB in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  console.log(`  Written : ${meta.file}`);
}

try {
  await once();
} catch (err) {
  console.error(`\n  Snapshot failed: ${err.message}\n`);
  process.exit(1);
}
if (every > 0) {
  console.log(`  Repeating every ${every} min. Ctrl+C to stop.`);
  setInterval(() => once().catch((err) => console.error(`  Snapshot failed: ${err.message}`)), every * 60000);
}
