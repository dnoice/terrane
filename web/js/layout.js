/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Terrace Layout (Terrane Edition - v1.6)
 *     - File Name: layout.js
 *     - Relative Path: web/js/layout.js
 *     - Artifact Type: javascript
 *     - Version: 1.6.0
 *     - Date: 11/15/2026
 *     - Update: Sunday, November 15, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Changelog:
 *     - 1.6.0 (11/14/2026) [dendogg + Anthropic - Claude Opus 5.5] —
 *       Everything in a folder is measured in its unit (unitOf, layout.unit):
 *       plates half a unit thick, files one even channel apart, a folder a
 *       street of three or 0.12 / 0.88 of its square, every block exactly
 *       0.04 S from the edge (rows laid again so footprints stay size); a
 *       file's height is one recency scale per folder, from its tile
 *       (layout.tile, TILE_H), slabs too.
 *     - 1.5.0 (11/14/2026) [dendogg + Anthropic - Claude Opus 5.5] —
 *       Region mode: a folder's count is kids(dir), so one held in part
 *       puts its tail's entries and bytes in its scree; a folder whose
 *       children are not held (u) stands as a closed mass and goes into
 *       layout.want when it would open, and from 0.6 of that distance.
 *       With every folder held whole the layout is the same as before.
 *     - 1.4.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] — An
 *       open archive (options.inside) stands as a chamber on its file's
 *       footprint: four WALL boxes on the edges and, between them, the
 *       archive's root as a plateau keyed by the file, whose contents
 *       open by distance like any folder's. layout.chamber gives the
 *       range of the chamber's boxes.
 *     Earlier entries: see CHANGELOG.md
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
 *     - Elevation is nesting: each level stands on a thin plate, half the
 *       unit of the folder it stands in; a folder's unit is 4.5% of its
 *       short side (at most 9), so the landscape is self-similar and can
 *       be travelled at any scale
 *     - Height is recency: a file stands tall when recently modified and
 *       wears down toward the plateau as it ages (log scale, ten years),
 *       0.35 to 3.75 of its folder's height unit: one scale per folder, so
 *       files of one age stand equal; the unit is the folder's, or 0.24 of
 *       its tile (the tile its lower-quartile entry would take) when that
 *       is smaller, so a fresh file of that size stands 0.9 of its side
 *     - Spacing in the folder's measure: one channel between its files
 *       (1.2% of its short side, narrower in a crowded folder); a street
 *       beside a folder, three file channels or 0.12 / 0.88 of the side
 *       its square would have, so two large masses part by at least 6% of
 *       each one's slot; and every block exactly 4% of the short side from
 *       the plateau's edge; the weights are compensated for the channels,
 *       and laid again for a folder at the edge, so area stays size
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
 *     - Archive chambers (inside): an archive opened with I is walled in
 *       on its own footprint, and what its directory lists stands on the
 *       floor between the walls, at any depth and any scale
 *     - One table of box types (BOX) and one of drawing conventions
 *       (STYLE), so every code has a single owner
 *     - Regions by approach: a folder whose children the page does not
 *       hold is drawn closed and asked for (layout.want) as the eye nears
 *       it, a little before it would open
 *
 * ✒ Usage Instructions:
 *     const layout = buildLayout(root, { cam: { x, y, z }, grain: 0.006 });
 *     Options travel to the layout as one object: cam, grain, now, force,
 *     aliases (pairs [node, key]: the node resolves in index to the box
 *     with that key), and any key a feature reads, such as asOf or inside.
 *     asOf is { t, kept(dir) }: t a date (ms), kept(dir) the share of a
 *     folder's bytes unchanged since t, from 0 to 1 (timeline.js answers
 *     it). Without asOf the layout is exactly the present one. inside is
 *     { host, root, walls }: host a file node, root the root of what the
 *     archive lists (its p is host), walls four objects that key the
 *     walls from one layout to the next; pass aliases [[root, host]] too,
 *     so the archive's root finds its floor in layout.index.
 *     layout.n          number of boxes, never more than MAX_BOXES
 *     layout.geo        Float64Array, 6 per box: cx, cy, cz, sx, sy, sz
 *     layout.type[i]    a BOX code
 *     layout.node[i]    model node (for scree: the folder it belongs to)
 *     layout.key[i]     identity used to animate between layouts
 *     layout.top[i]     highest point of everything standing on box i
 *     layout.aux[i]     a feature's mark for box i, 0 when unmarked: an
 *                       AUX code (SUNK, CROSSED) in the time view
 *     layout.unit[i]    Float64Array: the unit of the folder box i stands
 *                       in (the root's own unit for the root; a scree's
 *                       folder's; for an archive's walls and floor, the
 *                       folder holding the file), what its name, plate and
 *                       channel are measured in
 *     layout.tile[i]    Float64Array: that folder's tile, the side of the
 *                       tile its lower-quartile entry would take (the
 *                       root's own for the root); a file's height unit is
 *                       min(unit, TILE_H × tile), and the far view leans a
 *                       file by its tile on screen
 *     layout.scree      Map of box index to { count, size }
 *     layout.chamber    the open archive's boxes, { from, floor, to }:
 *                       four walls from `from`, the floor at `floor`,
 *                       what stands on it up to `to`; null when the
 *                       archive is not drawn as a chamber
 *     layout.coarsened  the grain was raised to fit the budget
 *     layout.over       even the coarsest grain did not fit: the boxes
 *                       past the budget were left out
 *     layout.want       region mode: [{ node, pri }], highest pri first,
 *                       the folders whose children are not held (u) that
 *                       this layout would open (pri = ratio / OPEN_AT, over
 *                       1; a forced one 8 at least) or nearly would (from
 *                       0.6); [] when every folder is held
 *     A folder held in part (dir.tail = { n, s }, the children a region
 *     does not hold) counts them through kids(dir) and lays them in its
 *     scree, so its layout is the one the whole tree gives.
 *
 * ✒ Other Important Information:
 *     - Dependencies: model.js (freshness, kids)
 *     - Compatible platforms: any browser with ES2022 modules
 *     - Performance: cost is proportional to boxes drawn plus one sort per
 *       changed folder, not to the size of the tree; a folder whose rows
 *       put a folder at the edge is laid twice, on the same rows, and the
 *       working arrays are kept for each depth between layouts
 *     - Limitations: the base footprint means areas are proportional to
 *       size plus a small constant, so a folder of many tiny files reads
 *       slightly larger than its bytes alone; the channel compensation is
 *       exact for square slots, and area per byte within a folder agrees
 *       within about 14% for the rest; on the smallest slots a channel
 *       stops at a quarter of the slot's side, which also keeps such a
 *       slot off the exact margin; a file much smaller than its folder's
 *       tile can stand taller than wide when fresh
 * ----------------------------------------------------------------------------
 */

import { freshness, kids } from './model.js';

/**
 * Box types. Codes are allocated here and nowhere else, so two features
 * cannot claim the same number. WALL is the four walls of an open
 * archive's chamber; their node is the archive's file.
 */
export const BOX = Object.freeze({ DIR: 0, FILE: 1, CAP: 2, SCREE: 3, WALL: 4 });

/**
 * Drawing conventions: the per-box style code the fragment shader in
 * viewport.js draws, allocated here for the same reason. CROSSED is the
 * time view's: the footprint's two diagonals, which paint gives a box the
 * layout marks AUX.CROSSED. 7 is free.
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
/**
 * The unit: everything inside a folder is measured in that folder, whose
 * unit is UNIT_RATIO of its short side, at most UNIT_MAX. Its plateau's
 * thickness, its files' heights, the channels between its blocks and the
 * margin at its edge are all set in it, so a folder looks the same from
 * as many of its own widths away, at any depth.
 */
export const UNIT_MAX = 9;
const UNIT_RATIO = 0.045;
export const unitOf = (w, d) => Math.min(Math.min(w, d) * UNIT_RATIO, UNIT_MAX);
// A plateau is a thin plate: half the unit of the folder it stands in,
// never more than a tenth of its own short side. An open archive's floor
// is a share of its file's short side only, as its walls are.
const PLATE = 0.5;
const PLATE_SIDE = 0.1;
const FLOOR_PLATE = 0.02;
/**
 * Spacing, as shares of the folder's short side S: every block stands
 * MARGIN from the plateau's edge; the channel between two files is
 * CHANNEL, or DENSITY over the square root of the folder's count when
 * that is narrower, so a crowded folder keeps its seams in proportion; a
 * folder among the children (open, closed, empty or sealed) takes GROUP
 * times a file's channel, or GROUP_SIDE of the side its square would
 * have when that is wider, so groups stand apart and two large masses
 * part by a street at least 6 % of each one's slot, as wide as the old
 * rule of 6 % of each side gave them (0.12 over 0.88: a slot is at most
 * its channel and the square, so half the channel is 6 % of it).
 */
export const MARGIN = 0.04;
const CHANNEL = 0.012;
const DENSITY = 0.1;
const GROUP = 3;
const GROUP_SIDE = 0.12 / 0.88;
/**
 * A file's height is its folder's height unit times 0.35 to 3.75 by
 * freshness. The height unit is the folder's unit, or TILE_H of its tile
 * when that is smaller; the tile is the side of the tile its
 * lower-quartile entry would take, its square less a file's channel
 * (TILE_Q of the way down its entries by size, among the PER_FOLDER_MAX
 * largest, so a folder held in part has the tile the whole folder has).
 * One folder has one recency scale, so equal ages stand equal, and a
 * fresh file the size of the folder's tile stands 0.9 of its side; a
 * smaller one may stand taller than wide. A crossed slab (the time view)
 * is measured in the height unit too.
 */
export const TILE_H = 0.24;
const TILE_Q = 0.75;
const OPEN_AT = 0.135;
// A closed folder whose children are not held is asked for a little
// before it would open: from this share of the distance it opens at.
const PREFETCH = 0.6;
const PER_FOLDER_MAX = 5000;
// A crossed slab: a share of its folder's height unit, or of its own
// short side when that is smaller, so it reads the same at every scale
// and never stands taller than the oldest file beside it.
const SLAB_UNIT = 0.08;
const SLAB_SIDE = 0.05;
// An archive's chamber: walls this share of the footprint's short side
// thick and high. Shares only, so the chamber is the same at every depth.
const WALL_THICK = 0.035;
const WALL_HIGH = 0.1;
/** The most boxes one layout holds; the viewport's capacity is above it. */
export const MAX_BOXES = 70000;

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

function worstRatio(sum, min, max, short, scale) {
  const s = sum * scale;
  const s2 = s * s;
  const l2 = short * short;
  return Math.max((l2 * max * scale) / s2, s2 / (l2 * min * scale));
}

/**
 * Squarified treemap. weights descending; writes x, z, w, d per item.
 * plan, when given, records where each row ends and whether it ran
 * across (a column, as when the rest was at least as wide as deep); with
 * fixed set, the rows of a recorded plan are laid again with these
 * weights, so the same items touch the same edges.
 */
function squarify(weights, n, x, z, W, D, out, plan = null, fixed = false) {
  let total = 0;
  for (let i = 0; i < n; i++) total += weights[i];
  let i = 0;
  let row = 0;
  while (i < n) {
    const scale = (W * D) / total;
    let rowSum = weights[i];
    let j = i + 1;
    let across;
    if (fixed) {
      j = plan.end[row];
      for (let k = i + 1; k < j; k++) rowSum += weights[k];
      across = plan.across[row] === 1;
    } else {
      const short = Math.min(W, D);
      let rowMin = weights[i];
      const rowMax = weights[i];
      let worst = worstRatio(rowSum, rowMin, rowMax, short, scale);
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
      across = W >= D;
      if (plan) {
        plan.end[row] = j;
        plan.across[row] = across ? 1 : 0;
      }
    }
    row++;
    const thick = (rowSum * scale) / (across ? D : W);
    if (across) {
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

/**
 * Footprint stays size: each weight w becomes (c + r sqrt(w))^2, c the
 * channel its slot gives up (give), so once a square slot gives it up the
 * rest is r^2 w. r fills the inner area A: W r^2 + 2 B r + C = A, with W
 * the weights' sum, B the sum of c sqrt(w) and C that of c^2; roots holds
 * sqrt(w). The weights are rewritten in place, kept raw when no positive r
 * fills the area.
 */
function compensate(weights, roots, give, n, sumW, area) {
  let sumB = 0;
  let sumC = 0;
  for (let i = 0; i < n; i++) {
    sumB += give[i] * roots[i];
    sumC += give[i] * give[i];
  }
  const disc = sumB * sumB - sumW * (sumC - area);
  const rk = disc > 0 ? (-sumB + Math.sqrt(disc)) / sumW : 0;
  for (let i = 0; i < n; i++) {
    const v = rk > 0 ? give[i] + rk * roots[i] : roots[i];
    weights[i] = v * v;
  }
}

/**
 * place()'s working arrays, one set for each depth, grown as needed and
 * kept from one layout to the next, so a layout allocates none: a
 * folder's set stays in use while its children are placed, each one
 * depth further down, and a layout runs to its end before another starts.
 */
const scratch = [];
function scratchAt(depth, n) {
  let s = scratch[depth];
  if (!s || s.cap < n) {
    const cap = Math.max(n, (s ? s.cap : 32) * 2);
    s = {
      cap,
      weights: new Float64Array(cap), rects: new Float64Array(cap * 4), chans: new Float64Array(cap),
      give: new Float64Array(cap), roots: new Float64Array(cap), sides: new Uint8Array(cap),
      plan: { end: new Int32Array(cap), across: new Uint8Array(cap) },
    };
    scratch[depth] = s;
  }
  return s;
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
  const { cam, grain, now, force, asOf, inside } = opts;
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
  const unitArr = [];
  const tileArr = [];
  const scree = new Map();
  // Region mode: folders whose children the page does not hold yet, which
  // this layout would open ({ node, pri }, pri the ratio over OPEN_AT).
  const want = [];
  let over = false;
  let chamberAt = null;

  // The budget is checked before every box, whoever pushes it. A box that
  // would pass MAX_BOXES is refused (-1) and ends the attempt, so n never
  // passes the viewport's capacity. `ax` is a free byte per box for a
  // feature's own mark, read back as layout.aux; `un` and `tl` are the
  // unit and the tile of the folder the box stands in, read back as
  // layout.unit and layout.tile.
  const push = (k, nd, t, lvl, cx, cy, cz, sx, sy, sz, ax = 0, un = 0, tl = 0) => {
    if (over || key.length >= MAX_BOXES) {
      over = true;
      return -1;
    }
    key.push(k); node.push(nd); type.push(t); level.push(lvl);
    geo.push(cx, cy, cz, sx, sy, sz);
    top.push(cy + sy / 2);
    aux.push(ax);
    unitArr.push(un);
    tileArr.push(tl);
    return key.length - 1;
  };

  // `k` is the plateau's identity across layouts: the folder itself, or
  // another object when a feature keys a plateau by something else.
  // `plate` is the plateau's thickness, which the folder it stands in
  // sets, and `upUnit` and `upTile` that folder's unit and tile (upTile
  // null for the root, which carries its own).
  const place = (dir, x, z, w, d, y, lvl, k, plate, upUnit, upTile) => {
    // Everything on the plateau is measured in its own unit: the world is
    // self-similar, so a folder looks the same from as many of its own
    // widths away.
    const S = Math.min(w, d);
    const unit = unitOf(w, d);
    const idx = push(k, dir, BOX.DIR, lvl, x + w / 2, y + plate / 2, z + d / 2, w, plate, d, 0, upUnit, upTile ?? 0);
    if (idx < 0) return y;
    const base = y + plate;
    let peak = base;
    const items = dir.c;
    if (!items.length || over) return peak;
    // How many entries the folder holds: in region mode the service's
    // count, which takes in the children not held (dir.tail).
    const count = kids(dir);
    const tail = dir.tail;
    const eps = (dir.s / count) * 0.12 + 1;
    if (dir.dirty) {
      items.sort((a, b) => b.s - a.s);
      dir.dirty = false;
    }
    // The channels: one width between the files of this folder, GROUP
    // times it beside a folder, or more beside a large one. Each child is
    // inset by half its channel, and by half a file's at the plateau's
    // edge, so every block stands exactly MARGIN of S from the edge.
    const fileCh = S * Math.min(CHANNEL, DENSITY / Math.sqrt(Math.max(count, 1)));
    const groupCh = fileCh * GROUP;
    const pad = S * MARGIN - fileCh / 2;
    const iw = w - pad * 2;
    const id = d - pad * 2;
    const total = dir.s + eps * count;
    const perWeight = (iw * id) / total;
    // The folder's tile and height unit: the side of the tile its
    // lower-quartile entry would take (its square, less a file's channel),
    // from its count and sizes alone, so neither moves as the eye does.
    const q = Math.min(Math.floor(TILE_Q * (count - 1)), PER_FOLDER_MAX - 1, items.length - 1);
    const square = Math.sqrt((items[q].s + eps) * perWeight);
    const tile = Math.max(square - fileCh, square * 0.5);
    const hUnit = Math.min(unit, TILE_H * tile);
    if (upTile === null) tileArr[idx] = tile;
    // Smallest side worth drawing here, from how far away the eye is.
    const reach = Math.max(distToRect(cam, x, z, w, d, base), S * 0.02);
    const minSide = reach * grain;
    const minArea = minSide * minSide;
    let big = 0;
    const cap = Math.min(items.length, PER_FOLDER_MAX);
    while (big < cap && (items[big].s + eps) * perWeight >= minArea) big++;
    if (force && big < items.length) {
      for (let i = big; i < Math.min(items.length, PER_FOLDER_MAX * 2); i++) if (force.has(items[i])) big = i + 1;
    }
    let screeCount = count - big;
    // One left over stands on its own, when the page holds it.
    if (screeCount === 1 && big > 0 && big < items.length) {
      big++;
      screeCount = 0;
    }
    const n = big + (screeCount ? 1 : 0);
    const { weights, rects, chans, give, roots, sides, plan } = scratchAt(lvl, n);
    for (let i = 0; i < big; i++) weights[i] = items[i].s + eps;
    let screeSize = 0;
    if (screeCount) {
      let wsum = 0;
      for (let i = big; i < items.length; i++) {
        wsum += items[i].s + eps;
        screeSize += items[i].s;
      }
      // The children a region does not hold lie in the scree too.
      if (tail) {
        wsum += tail.s + eps * tail.n;
        screeSize += tail.s;
      }
      // Scree never shrinks below a readable tile.
      weights[big] = Math.max(wsum, (minArea * 2.5) / perWeight);
    }
    // Each child's channel: a file's, or a folder's, the wider of GROUP
    // file channels and GROUP_SIDE of the side its square would have; the
    // weights are then compensated for it, so footprint stays size.
    let sumW = 0;
    for (let i = 0; i < n; i++) {
      chans[i] = i < big && items[i].d ? Math.max(groupCh, GROUP_SIDE * Math.sqrt(weights[i] * perWeight)) : fileCh;
      roots[i] = Math.sqrt(weights[i]);
      sumW += weights[i];
    }
    compensate(weights, roots, chans, n, sumW, iw * id);
    squarify(weights, n, x + pad, z + pad, iw, id, rects, plan);
    // At the plateau's edge every block gives up half a file's channel,
    // whatever it is, so the margin is the same all round. Which sides of
    // a slot lie on the edge (1 left, 2 right, 4 near, 8 far) is the rows'
    // doing, so when a folder lies on it, every slot is weighed again for
    // the channel it gives up (the mean of its sides') and the same rows
    // are laid once more: a folder at the edge keeps its size.
    const ex0 = x + pad;
    const ex1 = x + pad + iw;
    const ez0 = z + pad;
    const ez1 = z + pad + id;
    const tol = S * 1e-9;
    let again = false;
    for (let i = 0; i < n; i++) {
      const o = i * 4;
      sides[i] = (rects[o] - ex0 <= tol ? 1 : 0) | (ex1 - (rects[o] + rects[o + 2]) <= tol ? 2 : 0)
        | (rects[o + 1] - ez0 <= tol ? 4 : 0) | (ez1 - (rects[o + 1] + rects[o + 3]) <= tol ? 8 : 0);
      if (sides[i] && chans[i] > fileCh) again = true;
    }
    if (again) {
      for (let i = 0; i < n; i++) {
        const c = chans[i];
        const e = sides[i];
        give[i] = ((e & 1 ? fileCh : c) + (e & 2 ? fileCh : c) + (e & 4 ? fileCh : c) + (e & 8 ? fileCh : c)) / 4;
      }
      compensate(weights, roots, give, n, sumW, iw * id);
      squarify(weights, n, x + pad, z + pad, iw, id, rects, plan, true);
    }
    // Once the budget is spent, nothing more is placed in this attempt.
    for (let i = 0; i < n && !over; i++) {
      let rx = rects[i * 4];
      let rz = rects[i * 4 + 1];
      let rw = rects[i * 4 + 2];
      let rd = rects[i * 4 + 3];
      // Half its channel on every side, never more than a quarter of the
      // slot's short side, so the smallest slot keeps half of itself; on
      // a side at the plateau's edge, half a file's channel, so the margin
      // is the same whatever stands at it (a slot the quarter binds keeps
      // the quarter all round).
      const half = Math.min(chans[i] / 2, Math.min(rw, rd) * 0.25);
      const edge = half < chans[i] / 2 ? half : Math.min(fileCh / 2, half);
      const hl = sides[i] & 1 ? edge : half;
      const hr = sides[i] & 2 ? edge : half;
      const hn = sides[i] & 4 ? edge : half;
      const hs = sides[i] & 8 ? edge : half;
      rx += hl; rz += hn; rw -= hl + hr; rd -= hn + hs;
      if (rw <= 0 || rd <= 0) continue;
      const cx = rx + rw / 2;
      const cz = rz + rd / 2;
      const side = Math.min(rw, rd);
      if (i === big) {
        const h = unit * 0.2;
        dir._scree ||= { scree: true };
        const si = push(dir._scree, dir, BOX.SCREE, lvl + 1, cx, base + h / 2, cz, rw, h, rd, 0, unit, tile);
        if (si >= 0) scree.set(si, { count: screeCount, size: screeSize, from: big });
        continue;
      }
      const ch = items[i];
      let t;
      if (!ch.d && inside && ch === inside.host) {
        // The open archive's file stands as its chamber (below).
        t = chamber(ch, rx, rz, rw, rd, base, lvl + 1, unit, tile);
      } else if (!ch.d) {
        // Heights keep their freshness from now; only what changed after
        // the date looked back to is lowered. A tile: 0.35 to 3.75 of its
        // folder's height unit by freshness, one scale for the folder.
        const fresh = freshness(ch.m, now);
        let h = hUnit * (0.35 + 3.4 * fresh * fresh);
        let ax = AUX.NONE;
        if (asOf && ch.m > asOfT) {
          h = Math.min(hUnit * SLAB_UNIT, side * SLAB_SIDE);
          ax = AUX.CROSSED;
        }
        t = base + h;
        push(ch, ch, BOX.FILE, lvl + 1, cx, base + h / 2, cz, rw, h, rd, ax, unit, tile);
      } else if (ch.e || kids(ch) === 0) {
        let h = Math.min(ch.e ? unit : unit * 0.3, side);
        let ax = AUX.NONE;
        if (asOf && !ch.e && ch.m > asOfT) {
          h = Math.min(hUnit * SLAB_UNIT, side * SLAB_SIDE);
          ax = AUX.CROSSED;
        }
        t = base + h;
        push(ch, ch, BOX.CAP, lvl + 1, cx, base + h / 2, cz, rw, h, rd, ax, unit, tile);
      } else {
        // A folder opens when the eye is near enough for its contents to
        // read; it closes again a little further out, so it cannot flicker.
        const ratio = side / Math.max(distToRect(cam, rx, rz, rw, rd, base), 1e-6);
        const forced = !!force && force.has(ch);
        let open = forced || ratio > (ch._open ? OPEN_AT * 0.72 : OPEN_AT);
        if (ch.u) {
          // Its children are not held: it stands closed and is asked for,
          // first when it would open, and a little before.
          if (open) want.push({ node: ch, pri: forced ? Math.max(ratio / OPEN_AT, 8) : ratio / OPEN_AT });
          else if (ratio > PREFETCH * OPEN_AT) want.push({ node: ch, pri: ratio / OPEN_AT });
          open = false;
        }
        ch._open = open;
        if (open) t = place(ch, rx, rz, rw, rd, base, lvl + 1, ch, Math.min(PLATE * unit, PLATE_SIDE * side), unit, tile);
        else {
          let h = Math.min(side * UNIT_RATIO * (1.6 + 1.1 * Math.min(ch.h + 1, 8)), side * 0.9);
          let ax = AUX.NONE;
          if (asOf && ch.mm > asOfT) {
            // Never below a slab, so stepping further back never raises it.
            const slab = Math.min(hUnit * SLAB_UNIT, side * SLAB_SIDE);
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
          push(ch, ch, BOX.CAP, lvl + 1, cx, base + h / 2, cz, rw, h, rd, ax, unit, tile);
        }
      }
      if (t > peak) peak = t;
    }
    top[idx] = peak;
    return peak;
  };

  // An open archive on its file's footprint: four walls on the edges and,
  // between them, the archive's root as a plateau keyed by the file, so
  // the file's box becomes the floor in a transition and back again. The
  // walls' node is the file; the floor's is the archive's root. upUnit and
  // upTile are the unit and the tile of the folder that holds the file,
  // which the walls and the floor stand in.
  const chamber = (host, x, z, w, d, y, lvl, upUnit, upTile) => {
    const side = Math.min(w, d);
    const th = side * WALL_THICK;
    const h = side * WALL_HIGH;
    const from = key.length;
    const [north, south, west, east] = inside.walls;
    // The long walls run the whole side and the short ones stand between
    // them, so the chamber is the same whichever way its footprint lies.
    const ew = w >= d ? w : w - th * 2;
    const nd = w >= d ? d - th * 2 : d;
    push(north, host, BOX.WALL, lvl, x + w / 2, y + h / 2, z + th / 2, ew, h, th, 0, upUnit, upTile);
    push(south, host, BOX.WALL, lvl, x + w / 2, y + h / 2, z + d - th / 2, ew, h, th, 0, upUnit, upTile);
    push(west, host, BOX.WALL, lvl, x + th / 2, y + h / 2, z + d / 2, th, h, nd, 0, upUnit, upTile);
    push(east, host, BOX.WALL, lvl, x + w - th / 2, y + h / 2, z + d / 2, th, h, nd, 0, upUnit, upTile);
    if (over) return y;
    const floor = key.length;
    // The floor is a share of the file's short side, as the walls are.
    const peak = place(inside.root, x + th, z + th, w - th * 2, d - th * 2, y, lvl, host, side * FLOOR_PLATE, upUnit, upTile);
    chamberAt = { from, floor: key.length > floor ? floor : -1, to: key.length };
    return Math.max(peak, y + h);
  };

  // The root stands half its own unit thick and is measured in that unit
  // and its own tile.
  const rootUnit = unitOf(WORLD, WORLD);
  place(root, -WORLD / 2, -WORLD / 2, WORLD, WORLD, 0, 0, root, PLATE * rootUnit, rootUnit, null);
  return { over, key, node, type, level, geo, top, aux, unit: unitArr, tile: tileArr, scree, chamber: chamberAt, want };
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
    geo: Float64Array.from(r.geo), top: Float64Array.from(r.top), aux: Uint8Array.from(r.aux), unit: Float64Array.from(r.unit), tile: Float64Array.from(r.tile), scree: r.scree, index, root,
    coarsened: opts.grain !== grain, over: r.over, chamber: r.chamber,
    want: r.want.sort((a, b) => b.pri - a.pri),
  };
}
