/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Thumbnail Source (Terrane Edition - v1.0)
 *     - File Name: thumbs.mjs
 *     - Relative Path: server/thumbs.mjs
 *     - Artifact Type: javascript
 *     - Version: 1.0.0
 *     - Date: 11/11/2026
 *     - Update: Wednesday, November 11, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Description:
 *     Serves the thumbnail dataset that tools/thumbs.py builds: one compact
 *     index of every image (colour, size, status, available rungs) and the
 *     thumbnails themselves by key. The interface shows images through this
 *     and never loads an original, in live mode and in snapshot mode alike.
 *
 * ✒ Key Features:
 *     - Lookup by root-relative path as a database key; no filesystem path
 *       is ever built from what the browser sends
 *     - Versioned responses: a URL carries the image's size and mtime, so
 *       a matching request is cached by the browser as immutable, and a
 *       stale one still gets an ETag and a 304 when nothing changed
 *     - Light SVGs are stored gzip-compressed and sent as stored, with
 *       Content-Encoding: gzip, so the server spends no CPU on them; they go
 *       out under a sandbox policy so they can never run script
 *     - The 480 rung falls back to 160 when the source was too small to
 *       need one
 *     - The index is built once per dataset change and kept gzipped in
 *       memory; about 19,000 images index to well under a megabyte
 *     - One long-lived read-only connection; SQLite's write-ahead log lets
 *       the builder keep writing while the service reads
 *     - Refuses a dataset recorded for a different root
 *
 * ✒ Usage Instructions:
 *     const thumbs = openThumbs('/path/to/dataset/thumbs.db', { root });
 *     if (thumbs) {
 *       const { body, gzip } = thumbs.index();
 *       const t = thumbs.get('photos/a.jpg', '480');  // { type, body, etag, gzip }
 *     }
 *
 * ✒ Other Important Information:
 *     - Dependencies: Node.js 22.5+ (node:sqlite), node:zlib
 *     - Compatible platforms: Windows, macOS, Linux
 *     - Limitations: an image added after the last thumbnail run has no
 *       entry until the builder runs again
 * ----------------------------------------------------------------------------
 */

import fs from 'node:fs';
import zlib from 'node:zlib';
import { DatabaseSync } from 'node:sqlite';

export const RUNGS = ['160', '480', 'svg'];

/** Opens a thumbnail dataset, or returns null when there is none to serve. */
export function openThumbs(file, { root } = {}) {
  if (!file || !fs.existsSync(file)) return null;
  let db;
  try {
    db = new DatabaseSync(file, { readOnly: true });
    const meta = Object.fromEntries(db.prepare('SELECT key, value FROM meta').all().map((r) => [r.key, r.value]));
    if (root && meta.root && meta.root.toLowerCase() !== root.toLowerCase()) {
      db.close();
      return null;
    }
  } catch {
    try {
      db?.close();
    } catch { /* not open */ }
    return null;
  }

  const one = db.prepare(`SELECT size, mtime, kind, status,
      t160 IS NOT NULL AS has160, t480 IS NOT NULL AS has480, svg IS NOT NULL AS hasSvg FROM images WHERE path = ?`);
  const blob = {
    160: db.prepare('SELECT t160 AS b FROM images WHERE path = ?'),
    480: db.prepare('SELECT COALESCE(t480, t160) AS b FROM images WHERE path = ?'),
    svg: db.prepare('SELECT svg AS b FROM images WHERE path = ?'),
  };
  let cached = null;
  let cachedAt = -1;

  const version = (r) => `${r.size}-${Math.round(r.mtime)}`;

  return {
    file,

    /**
     * Every image in one compact table:
     * [path, version, kind, status, width, height, colour, rungs].
     * rungs is a bit set: 1 = 160, 2 = 480, 4 = svg source.
     */
    index() {
      let stamp = 0;
      try {
        stamp = fs.statSync(`${file}-wal`).mtimeMs;
      } catch { /* no write-ahead log */ }
      stamp += fs.statSync(file).mtimeMs;
      if (cached && stamp === cachedAt) return cached;
      const rows = [];
      for (const r of db.prepare(`SELECT path, size, mtime, kind, status, width, height, color,
          t160 IS NOT NULL AS a, t480 IS NOT NULL AS b, svg IS NOT NULL AS c FROM images`).iterate()) {
        rows.push([r.path, version(r), r.kind, r.status, r.width, r.height, r.color, (r.a ? 1 : 0) | (r.b ? 2 : 0) | (r.c ? 4 : 0)]);
      }
      const json = JSON.stringify({ fields: ['path', 'v', 'kind', 'status', 'w', 'h', 'color', 'rungs'], rows });
      cached = { body: Buffer.from(json), gzip: zlib.gzipSync(json, { level: 6 }), count: rows.length };
      cachedAt = stamp;
      return cached;
    },

    /** One thumbnail, or null. rung is '160', '480' or 'svg'. */
    get(rel, rung) {
      if (!RUNGS.includes(rung)) return null;
      const r = one.get(rel);
      if (!r || r.status !== 'ok') return null;
      if (rung === 'svg' ? !r.hasSvg : !r.has160) return null;
      const b = blob[rung].get(rel)?.b;
      if (!b) return null;
      return {
        type: rung === 'svg' ? 'image/svg+xml' : 'image/webp',
        gzip: rung === 'svg',
        body: Buffer.from(b),
        version: version(r),
        etag: `"${version(r)}-${rung}"`,
      };
    },

    close() {
      db.close();
    },
  };
}
