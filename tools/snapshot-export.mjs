#!/usr/bin/env node
/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Snapshot Export (Terrane Edition - v1.0)
 *     - File Name: snapshot-export.mjs
 *     - Relative Path: tools/snapshot-export.mjs
 *     - Artifact Type: CLI
 *     - Version: 1.0.0
 *     - Date: 11/13/2026
 *     - Update: Friday, November 13, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Description:
 *     Writes a structure snapshot out as a CSV table and a JSON tree, so
 *     the recorded shape of a directory opens in a spreadsheet, a script
 *     or jq without SQLite. Reads the snapshot only; never the directory
 *     it describes.
 *
 * ✒ Key Features:
 *     - CSV: one row per folder and file, with kind, path, name,
 *       extension, depth, size, modified time and the entry's flags
 *     - Folder rows carry the total size, file count and folder count of
 *       everything beneath them, as the world's Survey does
 *     - JSON: the same entries as a nested tree with a header naming the
 *       snapshot, its root and its totals
 *     - Takes a snapshot file, a dataset folder (its newest snapshot), or
 *       nothing when the dataset home holds a single dataset
 *     - Streams both files to disk, so a snapshot of a few hundred
 *       thousand entries exports in seconds without a large heap
 *     - Writes beside the snapshot in an exports folder unless --out says
 *       otherwise; file names follow the snapshot's own timestamp
 *
 * ✒ Usage Instructions:
 *     node tools/snapshot-export.mjs [<snapshot.db | dataset folder>]
 *         [--out <folder>] [--csv] [--json]
 *     npm run export -- [<snapshot.db | dataset folder>]
 *     With neither --csv nor --json, both are written.
 *
 * ✒ Examples:
 *     npm run export
 *     npm run export -- "%LOCALAPPDATA%\terrane\datasets\projects"
 *     node tools/snapshot-export.mjs structure-2026-11-11T21-40-54.db --csv
 *     node tools/snapshot-export.mjs D:\snaps\music --json --out D:\exports
 *     jq ".tree.children[] | {name, size}" structure-...json
 *
 * ✒ Command-Line Arguments:
 *     Input:
 *         <snapshot>       A structure-*.db file, or a dataset folder whose
 *                          newest snapshot is used. Optional when the
 *                          dataset home holds exactly one dataset.
 *     Output:
 *         --out <folder>   Where the exports go. Default: an exports folder
 *                          beside the snapshot.
 *         --csv            Write the CSV table.
 *         --json           Write the JSON tree.
 *
 * ✒ Other Important Information:
 *     - Dependencies: Node.js 22.5+ (node:sqlite); server/snapshot.mjs
 *     - Compatible platforms: Windows, macOS, Linux
 *     - Format: times are ISO 8601 in UTC (with the milliseconds since
 *       1970 beside them in the CSV), because both files are data for
 *       programs; sizes are bytes. CSV fields are quoted per RFC 4180 and
 *       the file starts with a UTF-8 byte order mark so Excel reads names
 *       outside ASCII correctly.
 *     - Security: an export holds real file names, like the snapshot it
 *       comes from. Keep it local; the default location is outside the
 *       project and outside OneDrive.
 * ----------------------------------------------------------------------------
 */

import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { datasetHome, listSnapshots, readMeta } from '../server/snapshot.mjs';

const FLAG_LINK = 1;
const FLAG_HIDDEN = 2;
const FLAG_SPECIAL = 4;

const args = process.argv.slice(2);
const option = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const positional = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--out');
const wantCsv = args.includes('--csv') || !args.includes('--json');
const wantJson = args.includes('--json') || !args.includes('--csv');

function fail(message) {
  console.error(`\n  ${message}\n`);
  process.exit(1);
}

/** The snapshot file the arguments name. */
function pickSnapshot() {
  if (positional.length > 1) fail('Usage: node tools/snapshot-export.mjs [<snapshot.db | dataset folder>] [--out <folder>] [--csv] [--json]');
  let target = positional[0];
  if (!target) {
    const home = path.dirname(datasetHome('x'));
    let sets = [];
    try {
      sets = fs.readdirSync(home, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
    } catch { /* no dataset home yet */ }
    if (sets.length !== 1) {
      fail(sets.length
        ? `The dataset home holds ${sets.length} datasets (${sets.join(', ')}). Name one: npm run export -- "${path.join(home, sets[0])}"`
        : `No datasets in ${home}. Take a snapshot first: npm run snapshot -- <directory>`);
    }
    target = path.join(home, sets[0]);
  }
  if (target.endsWith('.db')) {
    if (!fs.existsSync(target)) fail(`No such snapshot: ${target}`);
    return path.resolve(target);
  }
  const newest = listSnapshots(target)[0];
  if (!newest) fail(`No snapshot in ${target}. Take one with: npm run snapshot -- <directory>`);
  return newest;
}

/** A small buffered writer over a file descriptor. */
function writer(file) {
  const fd = fs.openSync(file, 'w');
  let chunks = [];
  let size = 0;
  const flush = () => {
    if (!size) return;
    fs.writeSync(fd, chunks.join(''));
    chunks = [];
    size = 0;
  };
  return {
    write(s) {
      chunks.push(s);
      size += s.length;
      if (size > 1 << 20) flush();
    },
    close() {
      flush();
      fs.closeSync(fd);
    },
  };
}

const csvField = (v) => {
  const s = String(v ?? '');
  return /[",\r\n]/.test(s) || /^\s|\s$/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const iso = (ms) => (Number.isFinite(ms) && ms > 0 ? new Date(ms).toISOString() : '');
const extOf = (name) => {
  const dot = name.lastIndexOf('.');
  return dot > 0 && dot < name.length - 1 ? name.slice(dot + 1).toLowerCase() : '';
};
const kindOf = (flags) => (flags & FLAG_LINK ? 'link' : flags & FLAG_SPECIAL ? 'special' : 'file');

const file = pickSnapshot();
const meta = readMeta(file);
const outDir = path.resolve(option('--out') || path.join(path.dirname(file), 'exports'));
fs.mkdirSync(outDir, { recursive: true });
const base = path.basename(file, '.db');
const t0 = Date.now();

const db = new DatabaseSync(file, { readOnly: true });
let folders;
try {
  // Folders in discovery order (parents before children), with totals
  // gathered from the bottom up.
  folders = db.prepare('SELECT id, parent_id, name, path, depth, mtime, error FROM folders ORDER BY id').all();
  const byId = new Map();
  for (const f of folders) {
    f.bytes = 0;
    f.fileCount = 0;
    f.folderCount = 0;
    f.subs = [];
    byId.set(f.id, f);
  }
  for (const r of db.prepare('SELECT folder_id, COUNT(*) AS n, COALESCE(SUM(size), 0) AS b FROM files GROUP BY folder_id').iterate()) {
    const f = byId.get(r.folder_id);
    if (f) {
      f.fileCount = r.n;
      f.bytes = r.b;
    }
  }
  for (let i = folders.length - 1; i >= 0; i--) {
    const f = folders[i];
    const p = f.parent_id === null ? null : byId.get(f.parent_id);
    if (!p) continue;
    p.bytes += f.bytes;
    p.fileCount += f.fileCount;
    p.folderCount += f.folderCount + 1;
  }
  for (let i = 0; i < folders.length; i++) {
    const f = folders[i];
    const p = f.parent_id === null ? null : byId.get(f.parent_id);
    if (p) p.subs.push(f);
  }
  const filesOf = db.prepare('SELECT name, size, mtime, flags FROM files WHERE folder_id = ? ORDER BY name');
  const joinPath = (dir, name) => (dir ? `${dir}/${name}` : name);
  const written = [];

  if (wantCsv) {
    const out = path.join(outDir, `${base}.csv`);
    const w = writer(out);
    w.write('\uFEFF');
    w.write('kind,path,name,extension,depth,size_bytes,files_beneath,folders_beneath,modified_utc,modified_ms,hidden,link,special,error\r\n');
    for (const f of folders) {
      const hidden = f.name.startsWith('.') ? 1 : 0;
      w.write([
        'folder', csvField(f.path || '.'), csvField(f.parent_id === null ? meta.name : f.name), '', f.depth, f.bytes,
        f.fileCount, f.folderCount, iso(f.mtime), Math.trunc(f.mtime) || '', hidden, 0, 0, csvField(f.error || ''),
      ].join(','));
      w.write('\r\n');
      for (const x of filesOf.iterate(f.id)) {
        w.write([
          kindOf(x.flags), csvField(joinPath(f.path, x.name)), csvField(x.name), csvField(extOf(x.name)), f.depth + 1, x.size,
          '', '', iso(x.mtime), Math.trunc(x.mtime) || '', x.flags & FLAG_HIDDEN ? 1 : 0, x.flags & FLAG_LINK ? 1 : 0,
          x.flags & FLAG_SPECIAL ? 1 : 0, '',
        ].join(','));
        w.write('\r\n');
      }
    }
    w.close();
    written.push(out);
  }

  if (wantJson) {
    const out = path.join(outDir, `${base}.json`);
    const w = writer(out);
    const head = {
      format: 'terrane-structure-export',
      version: 1,
      snapshot: {
        file: path.basename(file), name: meta.name, root: meta.root, sep: meta.sep, platform: meta.platform,
        takenAt: iso(meta.takenAt), folders: meta.folders, files: meta.files, bytes: meta.bytes,
      },
    };
    const headText = JSON.stringify(head, null, 2);
    w.write(`${headText.slice(0, -2)},\n  "tree": `);
    const pad = (n) => '  '.repeat(n);
    const writeFolder = (f, level) => {
      const own = {
        name: f.parent_id === null ? meta.name : f.name, type: 'folder', path: f.path, modified: iso(f.mtime),
        size: f.bytes, files: f.fileCount, folders: f.folderCount,
      };
      if (f.name.startsWith('.')) own.hidden = true;
      if (f.error) own.error = f.error;
      const fields = JSON.stringify(own).slice(1, -1);
      w.write(`{${fields}, "children": [`);
      let first = true;
      const sep = () => {
        w.write(first ? '\n' : ',\n');
        first = false;
        w.write(pad(level + 1));
      };
      for (const s of f.subs) {
        sep();
        writeFolder(s, level + 1);
      }
      for (const x of filesOf.iterate(f.id)) {
        const entry = { name: x.name, type: kindOf(x.flags), path: joinPath(f.path, x.name), size: x.size, modified: iso(x.mtime) };
        if (x.flags & FLAG_HIDDEN) entry.hidden = true;
        sep();
        w.write(JSON.stringify(entry));
      }
      w.write(first ? ']}' : `\n${pad(level)}]}`);
    };
    const root = folders.find((f) => f.parent_id === null);
    if (root) writeFolder(root, 1);
    else w.write('null');
    w.write('\n}\n');
    w.close();
    written.push(out);
  }

  const mb = (b) => (b / 1048576).toLocaleString('en-US', { maximumFractionDigits: 1 });
  console.log(`  Snapshot: ${meta.name}, ${meta.folders.toLocaleString('en-US')} folders, ${meta.files.toLocaleString('en-US')} files`);
  for (const f of written) console.log(`  Written : ${f} (${mb(fs.statSync(f).size)} MB)`);
  console.log(`  Done in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
} finally {
  db.close();
}
