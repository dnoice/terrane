/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Terrace Layout (Terrane Edition - v1.0)
 *     - File Name: layout.js
 *     - Relative Path: web/js/layout.js
 *     - Artifact Type: javascript
 *     - Version: 1.0.0
 *     - Date: 11/09/2026
 *     - Update: Monday, November 9, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Fable 5.2
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Description:
 *     Turns the tree model into the list of boxes that make up the world,
 *     as seen from where the eye currently is. This file is the spatial
 *     language of Terrane: it decides what footprint, elevation and height
 *     mean, and how much of a very large tree stands open, stands as a
 *     closed mass, or is gathered into scree.
 *
 * ✒ Key Features:
 *     - Footprint is storage: every folder is a plateau whose area is its
 *       share of its parent, divided by a squarified treemap so shapes stay
 *       close to square and comparable
 *     - Elevation is nesting: each level stands one step above its parent,
 *       and the step is proportional to the plateau, so the landscape is
 *       self-similar and can be travelled at any scale
 *     - Height is recency: a file stands tall when recently modified and
 *       wears down toward the plateau as it ages (log scale, ten years)
 *     - Unfolding by approach: a folder stands open when the eye is close
 *       enough to read its contents and closes again further out (with
 *       hysteresis); a closed mass is taller the more levels it conceals
 *     - Scree: entries too small to read from the current distance are
 *       gathered into one stippled tile per folder that carries their
 *       count and size
 *     - Forced path: a set of nodes that must be drawn regardless of
 *       distance, used to reveal a search result before flying to it
 *     - Box budget: if a layout would exceed 70,000 boxes the grain is
 *       coarsened and the layout is rebuilt; one folder draws at most
 *       5,000 entries individually
 *     - Every entry gets a small base footprint so zero-byte files and
 *       empty folders stay visible
 *
 * ✒ Usage Instructions:
 *     const layout = buildLayout(root, { cam: { x, y, z }, grain: 0.006 });
 *     layout.n          number of boxes
 *     layout.geo        Float64Array, 6 per box: cx, cy, cz, sx, sy, sz
 *     layout.type[i]    BOX.DIR | BOX.FILE | BOX.CAP | BOX.SCREE
 *     layout.node[i]    model node (for scree: the folder it belongs to)
 *     layout.key[i]     identity used to animate between layouts
 *     layout.top[i]     highest point of everything standing on box i
 *     layout.scree      Map of box index to { count, size }
 *
 * ✒ Other Important Information:
 *     - Dependencies: model.js (freshness)
 *     - Compatible platforms: any browser with ES2022 modules
 *     - Performance: cost is proportional to boxes drawn plus one sort per
 *       changed folder, not to the size of the tree
 *     - Limitations: the base footprint means areas are proportional to
 *       size plus a small constant, so a folder of many tiny files reads
 *       slightly larger than its bytes alone
 * ----------------------------------------------------------------------------
 */

import { freshness } from './model.js';

export const BOX = { DIR: 0, FILE: 1, CAP: 2, SCREE: 3 };
export const WORLD = 1000;
export const RISER_MAX = 9;
const RISER_RATIO = 0.045;
const OPEN_AT = 0.135;
const PER_FOLDER_MAX = 5000;
const MAX_BOXES = 70000;

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

function worstRatio(sum, min, max, short, scale) {
  const s = sum * scale;
  const s2 = s * s;
  const l2 = short * short;
  return Math.max((l2 * max * scale) / s2, s2 / (l2 * min * scale));
}

/** Squarified treemap. weights descending; writes x, z, w, d per item. */
function squarify(weights, n, x, z, W, D, out) {
  let total = 0;
  for (let i = 0; i < n; i++) total += weights[i];
  let i = 0;
  while (i < n) {
    const short = Math.min(W, D);
    const scale = (W * D) / total;
    let rowSum = weights[i];
    let rowMin = weights[i];
    const rowMax = weights[i];
    let worst = worstRatio(rowSum, rowMin, rowMax, short, scale);
    let j = i + 1;
    while (j < n) {
      const s2 = rowSum + weights[j];
      const mn = Math.min(rowMin, weights[j]);
      const r = worstRatio(s2, mn, rowMax, short, scale);
      if (r > worst) break;
      rowSum = s2;
      rowMin = mn;
      worst = r;
      j++;
    }
    const thick = (rowSum * scale) / short;
    if (W >= D) {
      let zz = z;
      for (let k = i; k < j; k++) {
        const len = (weights[k] * scale) / thick;
        out[k * 4] = x; out[k * 4 + 1] = zz; out[k * 4 + 2] = thick; out[k * 4 + 3] = len;
        zz += len;
      }
      x += thick;
      W -= thick;
    } else {
      let xx = x;
      for (let k = i; k < j; k++) {
        const len = (weights[k] * scale) / thick;
        out[k * 4] = xx; out[k * 4 + 1] = z; out[k * 4 + 2] = len; out[k * 4 + 3] = thick;
        xx += len;
      }
      z += thick;
      D -= thick;
    }
    total -= rowSum;
    i = j;
  }
}

function distToRect(cam, x, z, w, d, y) {
  const dx = Math.max(x - cam.x, 0, cam.x - (x + w));
  const dz = Math.max(z - cam.z, 0, cam.z - (z + d));
  const dy = cam.y - y;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function attempt(root, cam, grain, now, force) {
  const key = [];
  const node = [];
  const type = [];
  const level = [];
  const geo = [];
  const top = [];
  const scree = new Map();
  let over = false;

  const push = (k, nd, t, lvl, cx, cy, cz, sx, sy, sz) => {
    key.push(k); node.push(nd); type.push(t); level.push(lvl);
    geo.push(cx, cy, cz, sx, sy, sz);
    top.push(cy + sy / 2);
    return key.length - 1;
  };

  const place = (dir, x, z, w, d, y, lvl) => {
    // The step height belongs to the plateau: the world is self-similar,
    // so a folder looks the same from as many of its own widths away.
    const riser = Math.min(Math.min(w, d) * RISER_RATIO, RISER_MAX);
    const idx = push(dir, dir, BOX.DIR, lvl, x + w / 2, y + riser / 2, z + d / 2, w, riser, d);
    const base = y + riser;
    let peak = base;
    const kids = dir.c;
    if (!kids.length || over) return peak;
    if (key.length > MAX_BOXES) {
      over = true;
      return peak;
    }
    const eps = (dir.s / kids.length) * 0.12 + 1;
    if (dir.dirty) {
      kids.sort((a, b) => b.s - a.s);
      dir.dirty = false;
    }
    const pad = Math.min(w, d) * 0.035;
    const iw = w - pad * 2;
    const id = d - pad * 2;
    const total = dir.s + eps * kids.length;
    const perWeight = (iw * id) / total;
    // Smallest side worth drawing here, from how far away the eye is.
    const reach = Math.max(distToRect(cam, x, z, w, d, base), Math.min(w, d) * 0.02);
    const minSide = reach * grain;
    const minArea = minSide * minSide;
    let big = 0;
    const cap = Math.min(kids.length, PER_FOLDER_MAX);
    while (big < cap && (kids[big].s + eps) * perWeight >= minArea) big++;
    if (force && big < kids.length) {
      for (let i = big; i < Math.min(kids.length, PER_FOLDER_MAX * 2); i++) if (force.has(kids[i])) big = i + 1;
    }
    let screeCount = kids.length - big;
    if (screeCount === 1 && big > 0) {
      big++;
      screeCount = 0;
    }
    const n = big + (screeCount ? 1 : 0);
    const weights = new Float64Array(n);
    for (let i = 0; i < big; i++) weights[i] = kids[i].s + eps;
    let screeSize = 0;
    if (screeCount) {
      let wsum = 0;
      for (let i = big; i < kids.length; i++) {
        wsum += kids[i].s + eps;
        screeSize += kids[i].s;
      }
      // Scree never shrinks below a readable tile.
      weights[big] = Math.max(wsum, (minArea * 2.5) / perWeight);
    }
    const rects = new Float64Array(n * 4);
    squarify(weights, n, x + pad, z + pad, iw, id, rects);

    for (let i = 0; i < n; i++) {
      let rx = rects[i * 4];
      let rz = rects[i * 4 + 1];
      let rw = rects[i * 4 + 2];
      let rd = rects[i * 4 + 3];
      const gap = Math.min(rw, rd) * 0.06;
      rx += gap; rz += gap; rw -= gap * 2; rd -= gap * 2;
      if (rw <= 0 || rd <= 0) continue;
      const cx = rx + rw / 2;
      const cz = rz + rd / 2;
      const side = Math.min(rw, rd);
      if (i === big) {
        const h = riser * 0.2;
        dir._scree ||= { scree: true };
        const si = push(dir._scree, dir, BOX.SCREE, lvl + 1, cx, base + h / 2, cz, rw, h, rd);
        scree.set(si, { count: screeCount, size: screeSize, from: big });
        continue;
      }
      const ch = kids[i];
      let t;
      if (!ch.d) {
        const fresh = freshness(ch.m, now);
        const h = Math.min(riser * (0.35 + 3.4 * fresh * fresh), side * 1.8 + riser * 0.15);
        t = base + h;
        push(ch, ch, BOX.FILE, lvl + 1, cx, base + h / 2, cz, rw, h, rd);
      } else if (ch.e || ch.c.length === 0) {
        const h = Math.min(ch.e ? riser : riser * 0.3, side);
        t = base + h;
        push(ch, ch, BOX.CAP, lvl + 1, cx, base + h / 2, cz, rw, h, rd);
      } else {
        // A folder opens when the eye is near enough for its contents to
        // read; it closes again a little further out, so it cannot flicker.
        const ratio = side / Math.max(distToRect(cam, rx, rz, rw, rd, base), 1e-6);
        const open = (force && force.has(ch)) || ratio > (ch._open ? OPEN_AT * 0.72 : OPEN_AT);
        ch._open = open;
        if (open) t = place(ch, rx, rz, rw, rd, base, lvl + 1);
        else {
          const h = Math.min(side * RISER_RATIO * (1.6 + 1.1 * Math.min(ch.h + 1, 8)), side * 0.9);
          t = base + h;
          push(ch, ch, BOX.CAP, lvl + 1, cx, base + h / 2, cz, rw, h, rd);
        }
      }
      if (t > peak) peak = t;
    }
    top[idx] = peak;
    return peak;
  };

  place(root, -WORLD / 2, -WORLD / 2, WORLD, WORLD, 0, 0);
  return { over, key, node, type, level, geo, top, scree };
}

export function buildLayout(root, { cam, grain = 0.006, now = Date.now(), force = null } = {}) {
  let g = grain;
  let r = attempt(root, cam, g, now, force);
  let guard = 0;
  while (r.over && guard++ < 8) {
    g *= 1.45;
    r = attempt(root, cam, g, now, force);
  }
  const index = new Map();
  for (let i = 0; i < r.key.length; i++) index.set(r.key[i], i);
  return {
    n: r.key.length, key: r.key, node: r.node, type: Uint8Array.from(r.type), level: Uint8Array.from(r.level),
    geo: Float64Array.from(r.geo), top: Float64Array.from(r.top), scree: r.scree, index, root,
    coarsened: g !== grain,
  };
}
