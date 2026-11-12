/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Thumbnails (Terrane Edition - v1.0)
 *     - File Name: thumbs.js
 *     - Relative Path: web/js/thumbs.js
 *     - Artifact Type: javascript
 *     - Version: 1.0.0
 *     - Date: 11/11/2026
 *     - Update: Wednesday, November 11, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Description:
 *     The browser's single way to show an image from the directory. It
 *     knows, from one small index, what every image looks like on average,
 *     how large it is, and which thumbnail rungs exist, and it hands out
 *     versioned thumbnail URLs. Originals are never requested.
 *
 * ✒ Key Features:
 *     - One index request per survey: colour, pixel size, status and rungs
 *       for every image, gzipped (about 200 KB for 19,000 images)
 *     - info() answers synchronously from the index, so painting and
 *       layout can use an image's real colour without loading it
 *     - url() picks the best rung available for the size asked for: the
 *       SVG source for light vector art, else 480 or 160 WebP
 *     - URLs carry the image version and no token, so the browser caches
 *       each one once, forever, across reloads and restarts
 *     - img() builds an element that loads lazily, decodes off the main
 *       thread, and has its box size set up front so nothing jumps
 *
 * ✒ Usage Instructions:
 *     import { thumbs } from './thumbs.js';
 *     await thumbs.load(token);
 *     thumbs.info(relPath)?.color;           // '#a16837' or null
 *     thumbs.img(relPath, 480, 'Preview');   // HTMLImageElement or null
 *
 * ✒ Other Important Information:
 *     - Dependencies: ui.js (el)
 *     - Compatible platforms: current evergreen browsers
 *     - Limitations: an image added after the last thumbnail run shows its
 *       text facts only until the builder runs again
 * ----------------------------------------------------------------------------
 */

import { el } from './ui.js';

const R160 = 1;
const R480 = 2;
const RSVG = 4;

class Thumbs {
  constructor() {
    this.map = new Map();
    this.pending = null;
    this.available = false;
  }

  /** Fetches the index; later calls reuse it until reload() is called. */
  load(token) {
    if (this.pending) return this.pending;
    this.pending = fetch('/api/thumbs', { headers: { 'X-Terrane-Token': token } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        this.map = new Map();
        this.available = !!data?.rows?.length;
        for (const [path, v, kind, status, w, h, color, rungs] of data?.rows || []) {
          this.map.set(path, { v, kind, status, w, h, color, rungs });
        }
        return this;
      })
      .catch(() => this);
    return this.pending;
  }

  reload(token) {
    this.pending = null;
    return this.load(token);
  }

  info(rel) {
    return this.map.get(rel) || null;
  }

  /** Best URL for an image shown at about `px` pixels on its long side. */
  url(rel, px = 160) {
    const t = this.map.get(rel);
    if (!t || t.status !== 'ok') return null;
    const q = (w) => `/api/thumb?${new URLSearchParams({ path: rel, w, v: t.v })}`;
    if (t.rungs & RSVG) return q('svg');
    if (px > 200 && t.rungs & R480) return q('480');
    if (t.rungs & R160) return q('160');
    return null;
  }

  /** The box an image occupies when fitted inside px by px. */
  fit(rel, px) {
    const t = this.map.get(rel);
    if (!t?.w || !t?.h) return { width: px, height: px };
    const s = Math.min(1, px / Math.max(t.w, t.h));
    return { width: Math.max(1, Math.round(t.w * s)), height: Math.max(1, Math.round(t.h * s)) };
  }

  /** A lazily loaded image element, or null when there is no thumbnail. */
  img(rel, px, alt) {
    const src = this.url(rel, px);
    if (!src) return null;
    const { width, height } = this.fit(rel, px);
    const t = this.map.get(rel);
    return el('img', {
      src, alt, width, height, loading: 'lazy', decoding: 'async', draggable: 'false',
      style: t.color ? { backgroundColor: t.color } : null,
    });
  }
}

export const thumbs = new Thumbs();
