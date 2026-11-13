/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Terrace Layout (Terrane Edition - v1.3)
 *     - File Name: layout.js
 *     - Relative Path: web/js/layout.js
 *     - Artifact Type: javascript
 *     - Version: 1.3.0
 *     - Date: 11/12/2026
 *     - Update: Thursday, November 12, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Changelog:
 *     - 1.3.0 (11/12/2026) [dendogg + Anthropic - Claude Opus 5.5] — The
 *       time view: given asOf, a file changed after that date lies flat as
 *       a crossed slab, an empty folder changed after it does too, and a
 *       closed mass is lowered by the share of its bytes kept unchanged,
 *       down to a crossed slab when nothing was kept. Footprints, the box
 *       count and key order stay those of the present. AUX names the
 *       per-box marks.
 *     - 1.2.0 (11/11/2026) [dendogg + Anthropic - Claude Opus 5.5] — The
 *       box budget is checked before every box, so a layout never holds
 *       more than 70,000 and cannot overflow the viewport. Options reach
 *       the layout as one object; a per-box aux byte, an optional plateau
 *       key and index aliases are added; BOX and STYLE codes are allocated
 *       here, with WALL and CROSSED reserved.
 *     - 1.0.0 (11/09/2026) [dendogg + Anthropic - Claude Fable 5.2] —
 *       Initial release.
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
 *     - Box budget: checked before every box; if a layout would exceed
 *       70,000 boxes the grain is coarsened and the layout is rebuilt, and
 *       one folder draws at most 5,000 entries individually
 *     - Every entry gets a small base footprint so zero-byte files and
 *       empty folders stay visible
 *     - Time view (asOf): heights look back to a date while footprints,
 *       the box count and key order stay as they are now; whatever
 *       changed after the date lies flat, crossed corner to corner
 *     - One table of box types (BOX) and one of drawing conventions
 *       (STYLE), so every code has a single owner
 *
 * ✒ Usage Instructions:
 *     const layout = buildLayout(root, { cam: { x, y, z }, grain: 0.006 });
 *     Options travel to the layout as one object: cam, grain, now, force,
 *     aliases (pairs [node, key]: the node resolves in index to the box
 *     with that key), and any key a feature reads, such as asOf or inside.
 *     asOf is { t, kept(dir) }: t a date (ms), kept(dir) the share of a
 *     folder's bytes unchanged since t, from 0 to 1 (timeline.js answers
 *     it). Without asOf the layout is exactly the present one.
 *     layout.n          number of boxes, never more than MAX_BOXES
 *     layout.geo        Float64Array, 6 per box: cx, cy, cz, sx, sy, sz
 *     layout.type[i]    a BOX code
 *     layout.node[i]    model node (for scree: the folder it belongs to)
 *     layout.key[i]     identity used to animate between layouts
 *     layout.top[i]     highest point of everything standing on box i
 *     layout.aux[i]     a feature's mark for box i, 0 when unmarked: an
 *                       AUX code (SUNK, CROSSED) in the time view
 *     layout.scree      Map of box index to { count, size }
 *     layout.coarsened  the grain was raised to fit the budget
 *     layout.over       even the coarsest grain did not fit: the boxes
 *                       past the budget were left out
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

/**
 * Box types. Codes are allocated here and nowhere else, so two features
 * cannot claim the same number. WALL is reserved for archive interiors;
 * no box uses it yet.
 */
export const BOX = Object.freeze({ DIR: 0, FILE: 1, CAP: 2, SCREE: 3, WALL: 4 });

/**
 * Drawing conventions: the per-box style code the fragment shader in
 * viewport.js draws, allocated here for the same reason. CROSSED is
 * reserved for the time view and draws plain until its branch exists;
 * 7 is free.
 */
export const STYLE = Object.freeze({ PLAIN: 0, HATCH: 1, HOLLOW: 2, STIPPLE: 3, BANDS: 4, HALF_BANDS: 5, CROSSED: 6 });

/**
 * Marks in layout.aux, allocated here like the tables above. The time view
 * sets SUNK on a closed mass lowered to the share it kept unchanged, and
 * CROSSED on a box that changed after the date it looks back to, which
 * paint draws as STYLE.CROSSED. 3 and up are free.
 */
export const AUX = Object.freeze({ NONE: 0, SUNK: 1, CROSSED: 2 });

export const WORLD = 1000;
export const RISER_MAX = 9;
const RISER_RATIO = 0.045;
const OPEN_AT = 0.135;
const PER_FOLDER_MAX = 5000;
// A crossed slab: a share of its plateau's step, or of its own short side
// when that is smaller, so it reads the same at every scale.
const SLAB_RISER = 0.08;
const SLAB_SIDE = 0.05;
/** The most boxes one layout holds; the viewport's capacity is above it. */
export const MAX_BOXES = 70000;

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

/**
 * One layout at one grain. `opts` is buildLayout's options object, passed
 * whole, so a feature reads its own key from it without a new parameter.
 */
function attempt(root, opts) {
  const { cam, grain, now, force, asOf } = opts;
  // The time view: entries changed after asOfT lie flat; a closed mass
  // keeps the share of its height that it kept unchanged.
  const asOfT = asOf ? asOf.t : 0;
  const key = [];
  const node = [];
  const type = [];
  const level = [];
  const geo = [];
  const top = [];
  const aux = [];
  const scree = new Map();
  let over = false;

  // The budget is checked before every box, whoever pushes it. A box that
  // would pass MAX_BOXES is refused (-1) and ends the attempt, so n never
  // passes the viewport's capacity. `ax` is a free byte per box for a
  // feature's own mark, read back as layout.aux.
  const push = (k, nd, t, lvl, cx, cy, cz, sx, sy, sz, ax = 0) => {
    if (over || key.length >= MAX_BOXES) {
      over = true;
      return -1;
    }
    key.push(k); node.push(nd); type.push(t); level.push(lvl);
    geo.push(cx, cy, cz, sx, sy, sz);
    top.push(cy + sy / 2);
    aux.push(ax);
    return key.length - 1;
  };

  // `k` is the plateau's identity across layouts: the folder itself, or
  // another object when a feature keys a plateau by something else.
  const place = (dir, x, z, w, d, y, lvl, k = dir) => {
    // The step height belongs to the plateau: the world is self-similar,
    // so a folder looks the same from as many of its own widths away.
    const riser = Math.min(Math.min(w, d) * RISER_RATIO, RISER_MAX);
    const idx = push(k, dir, BOX.DIR, lvl, x + w / 2, y + riser / 2, z + d / 2, w, riser, d);
    if (idx < 0) return y;
    const base = y + riser;
    let peak = base;
    const kids = dir.c;
    if (!kids.length || over) return peak;
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

    // Once the budget is spent, nothing more is placed in this attempt.
    for (let i = 0; i < n && !over; i++) {
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
        if (si >= 0) scree.set(si, { count: screeCount, size: screeSize, from: big });
        continue;
      }
      const ch = kids[i];
      let t;
      // Heights keep their freshness from now; only what changed after
      // the date looked back to is lowered.
      if (!ch.d) {
        const fresh = freshness(ch.m, now);
        let h = Math.min(riser * (0.35 + 3.4 * fresh * fresh), side * 1.8 + riser * 0.15);
        let ax = AUX.NONE;
        if (asOf && ch.m > asOfT) {
          h = Math.min(riser * SLAB_RISER, side * SLAB_SIDE);
          ax = AUX.CROSSED;
        }
        t = base + h;
        push(ch, ch, BOX.FILE, lvl + 1, cx, base + h / 2, cz, rw, h, rd, ax);
      } else if (ch.e || ch.c.length === 0) {
        let h = Math.min(ch.e ? riser : riser * 0.3, side);
        let ax = AUX.NONE;
        if (asOf && !ch.e && ch.m > asOfT) {
          h = Math.min(riser * SLAB_RISER, side * SLAB_SIDE);
          ax = AUX.CROSSED;
        }
        t = base + h;
        push(ch, ch, BOX.CAP, lvl + 1, cx, base + h / 2, cz, rw, h, rd, ax);
      } else {
        // A folder opens when the eye is near enough for its contents to
        // read; it closes again a little further out, so it cannot flicker.
        const ratio = side / Math.max(distToRect(cam, rx, rz, rw, rd, base), 1e-6);
        const open = (force && force.has(ch)) || ratio > (ch._open ? OPEN_AT * 0.72 : OPEN_AT);
        ch._open = open;
        if (open) t = place(ch, rx, rz, rw, rd, base, lvl + 1);
        else {
          let h = Math.min(side * RISER_RATIO * (1.6 + 1.1 * Math.min(ch.h + 1, 8)), side * 0.9);
          let ax = AUX.NONE;
          if (asOf && ch.mm > asOfT) {
            // Never below a slab, so stepping further back never raises it.
            const slab = Math.min(riser * SLAB_RISER, side * SLAB_SIDE);
            const kept = Math.min(1, asOf.kept(ch));
            if (kept > 0) {
              h = Math.max(slab, h * kept);
              ax = AUX.SUNK;
            } else {
              h = slab;
              ax = AUX.CROSSED;
            }
          }
          t = base + h;
          push(ch, ch, BOX.CAP, lvl + 1, cx, base + h / 2, cz, rw, h, rd, ax);
        }
      }
      if (t > peak) peak = t;
    }
    top[idx] = peak;
    return peak;
  };

  place(root, -WORLD / 2, -WORLD / 2, WORLD, WORLD, 0, 0);
  return { over, key, node, type, level, geo, top, aux, scree };
}

/**
 * Lays the tree out as seen from `options.cam`. The options object reaches
 * attempt() whole (with grain, now and force defaulted), so a new option
 * never changes a signature. `options.aliases` is an iterable of
 * [node, key] pairs: each node that is not itself a box's key resolves in
 * layout.index to the box keyed by `key`, when that box is present.
 */
export function buildLayout(root, options = {}) {
  const grain = options.grain ?? 0.006;
  const opts = { ...options, grain, now: options.now ?? Date.now(), force: options.force ?? null };
  let r = attempt(root, opts);
  let guard = 0;
  while (r.over && guard++ < 8) {
    opts.grain *= 1.45;
    r = attempt(root, opts);
  }
  const index = new Map();
  for (let i = 0; i < r.key.length; i++) index.set(r.key[i], i);
  if (opts.aliases) {
    for (const [alias, k] of opts.aliases) {
      const i = index.get(k);
      if (i !== undefined && !index.has(alias)) index.set(alias, i);
    }
  }
  return {
    n: r.key.length, key: r.key, node: r.node, type: Uint8Array.from(r.type), level: Uint8Array.from(r.level),
    geo: Float64Array.from(r.geo), top: Float64Array.from(r.top), aux: Uint8Array.from(r.aux), scree: r.scree, index, root,
    coarsened: opts.grain !== grain, over: r.over,
  };
}
