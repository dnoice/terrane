/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Structure Snapshot (Terrane Edition - v1.0)
 *     - File Name: snapshot.mjs
 *     - Relative Path: server/snapshot.mjs
 *     - Artifact Type: javascript
 *     - Version: 1.0.0
 *     - Date: 11/11/2026
 *     - Update: Wednesday, November 11, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Description:
 *     Records the structure of a directory (folders, file names, sizes,
 *     dates and entry types; never contents) into a SQLite database, and
 *     serves that database back in exactly the record format the live
 *     scanner produces. Development and demonstration then run against a
 *     faithful copy of a real tree without the service touching it.
 *
 * ✒ Key Features:
 *     - Written by the same progressive scanner the live service uses, so
 *       a snapshot and a live scan of the same tree are record-for-record
 *       alike
 *     - Read-only on the source: readdir and lstat only, no file is opened
 *     - Each snapshot is a new timestamped file, written beside the others
 *       and renamed into place when complete, so a reader never sees a
 *       half-written snapshot and Windows never refuses a swap
 *     - Keeps the newest few snapshots and prunes the rest, skipping any a
 *       reader still has open
 *     - Queryable for development: folders and files tables, a path index,
 *       and an entries view joining them
 *     - Reader opens the database per request and closes it, so a newer
 *       snapshot can land while the service runs
 *     - Breadth-first replay with depth limits and STUB records, matching
 *       the live /api/scan contract
 *     - Dataset home outside synced folders by default
 *       (%LOCALAPPDATA%\terrane on Windows, ~/.cache/terrane elsewhere)
 *
 * ✒ Usage Instructions:
 *     import { takeSnapshot, openSnapshots, datasetHome } from './snapshot.mjs';
 *     const dir = datasetHome('projects');
 *     const info = await takeSnapshot('C:/data/projects', dir);
 *     const src = openSnapshots(dir);          // newest snapshot in dir
 *     for await (const batch of src.scan('docs', { depth: 1 })) send(batch);
 *
 * ✒ Examples:
 *     sqlite3 structure-2026-11-11T21-40-00.db
 *       "SELECT folder, name, size FROM entries ORDER BY size DESC LIMIT 20"
 *     sqlite3 structure-2026-11-11T21-40-00.db
 *       "SELECT path, error FROM folders WHERE error IS NOT NULL"
 *
 * ✒ Other Important Information:
 *     - Dependencies: Node.js built-ins only (node:sqlite, Node 22.5+);
 *       scan.mjs
 *     - Compatible platforms: Node.js 22.5+ on Windows, macOS, Linux
 *     - Performance: about 250,000 entries in 30,000 folders snapshot in
 *       well under a minute on a local SSD; replay of the whole tree is a
 *       few hundred milliseconds
 *     - Security: snapshots hold real file names and should stay local;
 *       the default home is outside the project and outside OneDrive
 * ----------------------------------------------------------------------------
 */

import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { scan } from './scan.mjs';

export const SNAPSHOT_FORMAT = 1;
const KEEP = 3;
const PREFIX = 'structure-';

const SCHEMA = `
CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE folders (
  id INTEGER PRIMARY KEY,
  parent_id INTEGER,
  name TEXT NOT NULL,
  path TEXT NOT NULL,
  depth INTEGER NOT NULL,
  mtime INTEGER NOT NULL,
  error TEXT
);
CREATE TABLE files (
  folder_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  size INTEGER NOT NULL,
  mtime INTEGER NOT NULL,
  flags INTEGER NOT NULL
);
CREATE UNIQUE INDEX folders_path ON folders(path);
CREATE INDEX folders_parent ON folders(parent_id);
CREATE INDEX files_folder ON files(folder_id);
CREATE VIEW entries AS
  SELECT f.path AS folder,
         CASE WHEN f.path = '' THEN x.name ELSE f.path || '/' || x.name END AS path,
         x.name, x.size, x.mtime, x.flags
  FROM files x JOIN folders f ON f.id = x.folder_id;
`;

/** Where datasets live for a given target, outside any synced folder. */
export function datasetHome(slug, base = process.env.TERRANE_DATA) {
  const home = base
    || (process.platform === 'win32' && process.env.LOCALAPPDATA
      ? path.join(process.env.LOCALAPPDATA, 'terrane', 'datasets')
      : path.join(os.homedir(), '.cache', 'terrane', 'datasets'));
  return path.join(home, slug);
}

export const slugOf = (dir) => path.basename(path.resolve(dir)).toLowerCase().replace(/[^a-z0-9._-]+/g, '-') || 'root';

const stamp = (ms) => {
  const d = new Date(ms);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}`;
};

/** Snapshot files in dir, newest first. */
export function listSnapshots(dir) {
  let names;
  try {
    names = fs.readdirSync(dir);
  } catch {
    return [];
  }
  return names.filter((n) => n.startsWith(PREFIX) && n.endsWith('.db')).sort().reverse().map((n) => path.join(dir, n));
}

/** Reads the meta table of a snapshot file. */
export function readMeta(file) {
  const db = new DatabaseSync(file, { readOnly: true });
  try {
    const meta = Object.fromEntries(db.prepare('SELECT key, value FROM meta').all().map((r) => [r.key, r.value]));
    for (const k of ['takenAt', 'durationMs', 'folders', 'files', 'bytes', 'format']) if (k in meta) meta[k] = Number(meta[k]);
    return meta;
  } finally {
    db.close();
  }
}

/**
 * Walks root with the live scanner and writes a new snapshot into dir.
 * Resolves to the snapshot's meta.
 */
export async function takeSnapshot(rootInput, dir, { onProgress, signal } = {}) {
  const root = await fsp.realpath(path.resolve(rootInput));
  if (!(await fsp.stat(root)).isDirectory()) throw new Error(`Not a directory: ${root}`);
  await fsp.mkdir(dir, { recursive: true });
  const takenAt = Date.now();
  const file = path.join(dir, `${PREFIX}${stamp(takenAt)}.db`);
  const tmp = `${file}.partial`;
  await fsp.rm(tmp, { force: true });

  const db = new DatabaseSync(tmp);
  let folders = 0;
  let files = 0;
  let bytes = 0;
  try {
    db.exec('PRAGMA journal_mode = OFF; PRAGMA synchronous = OFF;');
    db.exec(SCHEMA);
    const addFolder = db.prepare('INSERT INTO folders (id, parent_id, name, path, depth, mtime, error) VALUES (?, ?, ?, ?, ?, ?, ?)');
    const addFile = db.prepare('INSERT INTO files (folder_id, name, size, mtime, flags) VALUES (?, ?, ?, ?, ?)');
    const where = new Map();
    db.exec('BEGIN');
    for await (const batch of scan(root, { isRoot: true, signal })) {
      for (const [id, parentId, name, mtime, err, packed] of batch) {
        const parent = parentId === -1 ? null : where.get(parentId);
        const rel = parent === null ? '' : parent.path ? `${parent.path}/${name}` : name;
        const depth = parent === null ? 0 : parent.depth + 1;
        where.set(id, { path: rel, depth });
        addFolder.run(id, parentId === -1 ? null : parentId, name, rel, depth, mtime, err || null);
        folders++;
        for (let i = 0; i < packed.length; i += 4) {
          addFile.run(id, packed[i], packed[i + 1], packed[i + 2], packed[i + 3]);
          files++;
          bytes += packed[i + 1];
        }
      }
      onProgress?.({ folders, files, bytes });
    }
    if (signal?.aborted) throw new Error('Snapshot cancelled.');
    const meta = {
      format: SNAPSHOT_FORMAT, root, name: path.basename(root) || root, sep: path.sep, platform: process.platform,
      takenAt, durationMs: Date.now() - takenAt, folders, files, bytes,
    };
    const addMeta = db.prepare('INSERT INTO meta (key, value) VALUES (?, ?)');
    for (const [k, v] of Object.entries(meta)) addMeta.run(k, String(v));
    db.exec('COMMIT');
    db.exec('ANALYZE');
    db.close();
    await fsp.rename(tmp, file);
    prune(dir);
    return { ...meta, file };
  } catch (err) {
    try {
      db.close();
    } catch { /* already closed */ }
    await fsp.rm(tmp, { force: true });
    throw err;
  }
}

/** Removes all but the newest KEEP snapshots; one still open is left for next time. */
function prune(dir) {
  for (const old of listSnapshots(dir).slice(KEEP)) {
    try {
      fs.rmSync(old);
    } catch { /* in use by a reader */ }
  }
}

/**
 * A read source over the newest snapshot in dir (or one fixed file).
 * Every call opens the database, reads, and closes it again.
 */
export function openSnapshots(target) {
  const fixed = target.endsWith('.db');
  const current = () => {
    const file = fixed ? target : listSnapshots(target)[0];
    if (!file || !fs.existsSync(file)) throw new Error(`No snapshot found in ${target}. Take one with: npm run snapshot -- <directory>`);
    return file;
  };
  const withDb = (fn) => {
    const db = new DatabaseSync(current(), { readOnly: true });
    try {
      return fn(db);
    } finally {
      db.close();
    }
  };

  return {
    file: current,
    meta: () => readMeta(current()),

    /** Folder or file at a root-relative path, or null. */
    stat(rel) {
      return withDb((db) => {
        const dir = db.prepare('SELECT id, mtime, error FROM folders WHERE path = ?').get(rel);
        if (dir) return { dir: true, size: 0, mtime: dir.mtime, error: dir.error };
        const cut = rel.lastIndexOf('/');
        const parent = cut < 0 ? '' : rel.slice(0, cut);
        const name = rel.slice(cut + 1);
        const f = db.prepare('SELECT x.size, x.mtime, x.flags FROM files x JOIN folders d ON d.id = x.folder_id WHERE d.path = ? AND x.name = ?').get(parent, name);
        return f ? { dir: false, size: f.size, mtime: f.mtime, flags: f.flags } : null;
      });
    },

    /** Same records, order and depth semantics as scan.mjs. */
    async* scan(rel, { depth = Infinity, signal } = {}) {
      const db = new DatabaseSync(current(), { readOnly: true });
      try {
        const top = db.prepare('SELECT id, name, path, depth, mtime, error FROM folders WHERE path = ?').get(rel);
        if (!top) {
          const e = new Error('That folder is not in the snapshot.');
          e.code = 'ENOENT';
          throw e;
        }
        const filesOf = db.prepare('SELECT name, size, mtime, flags FROM files WHERE folder_id = ?');
        const pack = (id) => {
          const out = [];
          for (const f of filesOf.iterate(id)) out.push(f.name, f.size, f.mtime, f.flags);
          return out;
        };
        const maxDepth = top.depth + depth;
        // ids follow breadth-first discovery, so ordering by id puts every
        // parent before its children.
        const rows = rel === ''
          ? db.prepare('SELECT id, parent_id, name, depth, mtime, error FROM folders WHERE depth <= ? ORDER BY id').iterate(Number.isFinite(maxDepth) ? maxDepth : 1e9)
          : db.prepare(`SELECT id, parent_id, name, depth, mtime, error FROM folders
              WHERE (path = ? OR substr(path, 1, ?) = ?) AND depth <= ? ORDER BY id`)
            .iterate(rel, rel.length + 1, `${rel}/`, Number.isFinite(maxDepth) ? maxDepth : 1e9);
        let out = [];
        for (const r of rows) {
          if (signal?.aborted) return;
          const isTop = r.id === top.id;
          if (r.depth === maxDepth && !isTop) out.push([r.id, r.parent_id, r.name, 0, 'STUB', []]);
          else out.push([r.id, isTop ? -1 : r.parent_id, r.name, r.mtime, r.error || 0, r.error ? [] : pack(r.id)]);
          if (out.length >= 200) {
            yield out;
            out = [];
          }
        }
        if (out.length) yield out;
      } finally {
        db.close();
      }
    },
  };
}
