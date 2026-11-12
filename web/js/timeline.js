/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Age Table (Terrane Edition - v1.0)
 *     - File Name: timeline.js
 *     - Relative Path: web/js/timeline.js
 *     - Artifact Type: javascript
 *     - Version: 1.0.0
 *     - Date: 11/12/2026
 *     - Update: Thursday, November 12, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Description:
 *     One table of every folder's bytes and files by last change, measured
 *     at a fixed ladder of dates looking back from the moment it was built.
 *     It answers "how much of this folder has changed since that date" in
 *     constant time, so a date scrub, an inspector section and an age
 *     colouring can share one walk instead of each making its own.
 *
 * ✒ Key Features:
 *     - A 20-step ladder from now back to 30 years, roughly even on a log
 *       scale, that holds exactly 1, 7, 30, 365 and 1,095 days
 *     - One pre-order walk bins each folder's own files by the first step
 *       they count as changed at; a reverse pass over the folders adds each
 *       one into its parent, so every folder holds its whole subtree
 *     - Per folder and step: changed bytes, changed files, and the share
 *       kept (unchanged), weighted by bytes
 *     - The byte-weighted median step and the step where everything has
 *       changed, for choosing where a view starts and ends
 *     - Six strata (under a day, a week, a month, a year, three years,
 *       older) read as differences between ladder steps, so they always
 *       agree with the steps
 *     - Nothing is written onto model nodes: a side Map from folder to
 *       slot and two typed arrays hold everything
 *     - A folder the table does not know (it appeared after the build)
 *       counts as wholly changed at its newest change (mm); a file answers
 *       from its own date and size
 *     - DOM-free, so the same module runs in the browser and in Node tests
 *
 * ✒ Usage Instructions:
 *     import { buildAgeTable, LADDER_DAYS, STEPS } from './timeline.js';
 *     const ages = buildAgeTable(model.root, Date.now());
 *     ages.T[k]                  // date of step k (ms); T[0] is the anchor
 *     ages.changedBytes(dir, k)  // bytes changed after T[k]
 *     ages.kept(dir, k)          // share unchanged since T[k], 0 to 1
 *     ages.medianStep(dir)       // first step where half the bytes changed
 *     ages.bands(dir)            // { bytes: [6], files: [6] }, newest first
 *     app.js builds the table after every survey (an AFTER_SURVEY hook at
 *     order 10) and keeps it in S.ages; it is null until the first survey.
 *
 * ✒ Examples:
 *     ages.kept(dir, LADDER_DAYS.indexOf(365))  // unchanged for a year
 *     ages.changedFiles(S.focus, 2)             // files changed this week
 *     ages.bands(dir).bytes[5]                  // bytes older than 3 years
 *     ages.T[ages.medianStep(dir)]              // half changed after this
 *     ages.stepOf(file.m)                       // first step a file counts at
 *     ages.has(dir)                             // false when newer than it
 *
 * ✒ Other Important Information:
 *     - Dependencies: none
 *     - Compatible platforms: any browser with ES2022 modules; Node.js
 *       22.5+ for the tests
 *     - Semantics: "changed after T" means a file's modification time is
 *       later than T. That is the last change, never the creation or the
 *       arrival. A file with no time (0) never counts as changed and sits
 *       in the oldest stratum
 *     - Performance: one O(entries) walk plus 21 adds per folder, and 12
 *       bytes per folder and cell: 23 ms and 7.9 MB for 400,000 files in
 *       28,571 folders on a 16-core machine. An accessor is one Map lookup
 *     - The table is a snapshot: until the next survey rebuilds it, a
 *       folder whose contents changed answers with its old figures
 * ----------------------------------------------------------------------------
 */

export const DAY = 86400000;

/**
 * The look-back ladder in whole days. Step 0 is the moment the table was
 * built; a month is a twelfth of a 365-day year, rounded, and a year is 365
 * days, so 30 and 1,095 are exact.
 */
export const LADDER_DAYS = Object.freeze([0, 1, 7, 14, 30, 61, 91, 182, 274, 365, 548, 730, 1095, 1460, 1825, 2555, 3650, 5475, 7300, 10950]);
export const STEPS = LADDER_DAYS.length;

/** The ladder steps that bound the six strata: a day, a week, a month, a year and three years. */
export const BAND_STEPS = Object.freeze([1, 7, 30, 365, 1095].map((d) => LADDER_DAYS.indexOf(d)));
export const BANDS = BAND_STEPS.length + 1;

// Each folder's row: STEPS cumulative bins, then the total.
const W = STEPS + 1;

const now = () => globalThis.performance?.now?.() ?? Date.now();

/** Index of the first ladder time a modification time is later than, or STEPS when none is. */
function firstStep(T, ms) {
  let lo = 0;
  let hi = STEPS;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (ms > T[mid]) hi = mid;
    else lo = mid + 1;
  }
  return lo;
}

/** A frozen, read-only answer to "how much of this changed since step k". */
class AgeTable {
  #T;
  #slots;
  #bytes;
  #files;

  constructor(anchor, T, Tf, slots, bytes, files, ms) {
    /** The moment the ladder looks back from (ms). */
    this.anchor = anchor;
    /** The date of each step, newest first: T[0] is the anchor. Frozen. */
    this.T = T;
    /** Folders held, and how long the build took (ms). */
    this.folders = slots.size;
    this.ms = ms;
    this.#T = Tf;
    this.#slots = slots;
    this.#bytes = bytes;
    this.#files = files;
    Object.freeze(this);
  }

  #step(k) {
    if (!Number.isInteger(k) || k < 0 || k >= STEPS) throw new RangeError(`An age-table step is a whole number from 0 to ${STEPS - 1}, not ${k}.`);
    return k;
  }

  /** The folder's row offset, or -1 for a file or a folder the table does not hold. */
  #row(node) {
    const slot = node.d ? this.#slots.get(node) : undefined;
    return slot === undefined ? -1 : slot * W;
  }

  /** True when the table holds this folder. */
  has(node) {
    return !!node?.d && this.#slots.has(node);
  }

  /** The first step at which a modification time counts as changed; STEPS when it never does. */
  stepOf(ms) {
    return firstStep(this.#T, ms);
  }

  /** Bytes changed after T[k]. */
  changedBytes(node, k) {
    this.#step(k);
    const o = this.#row(node);
    if (o >= 0) return this.#bytes[o + k];
    return (node.d ? node.mm : node.m) > this.#T[k] ? node.s : 0;
  }

  /** Files changed after T[k]. */
  changedFiles(node, k) {
    this.#step(k);
    const o = this.#row(node);
    if (o >= 0) return this.#files[o + k];
    return (node.d ? node.mm : node.m) > this.#T[k] ? (node.d ? node.fc : 1) : 0;
  }

  /** The bytes the table counted for this node (dir.s at the build). */
  totalBytes(node) {
    const o = this.#row(node);
    return o >= 0 ? this.#bytes[o + STEPS] : node.s;
  }

  /** The files the table counted for this node (dir.fc at the build). */
  totalFiles(node) {
    const o = this.#row(node);
    return o >= 0 ? this.#files[o + STEPS] : node.d ? node.fc : 1;
  }

  /**
   * Share of the node unchanged since T[k], from 0 to 1, weighted by bytes;
   * by file count when its files hold no bytes; by its newest change when
   * it holds no files or the table does not know it (mm > T[k] ? 0 : 1).
   */
  kept(node, k) {
    this.#step(k);
    const o = this.#row(node);
    if (o >= 0) {
      const tb = this.#bytes[o + STEPS];
      if (tb > 0) return 1 - this.#bytes[o + k] / tb;
      const tf = this.#files[o + STEPS];
      if (tf > 0) return 1 - this.#files[o + k] / tf;
    }
    return (node.d ? node.mm : node.m) > this.#T[k] ? 0 : 1;
  }

  /** The first step where `share` of the weight has changed; -1 with no files; STEPS - 1 when never. */
  #reach(node, share) {
    const o = this.#row(node);
    if (o < 0) {
      if (node.d && !node.fc) return -1;
      return Math.min(firstStep(this.#T, node.d ? node.mm : node.m), STEPS - 1);
    }
    const tf = this.#files[o + STEPS];
    if (!tf) return -1;
    const tb = this.#bytes[o + STEPS];
    const row = tb > 0 ? this.#bytes : this.#files;
    const need = (tb > 0 ? tb : tf) * share;
    for (let k = 0; k < STEPS; k++) if (row[o + k] >= need) return k;
    return STEPS - 1;
  }

  /**
   * The byte-weighted median: the first step at which at least half the
   * bytes have changed (half the files when they hold no bytes). The last
   * step also stands for anything older; -1 means there are no files.
   */
  medianStep(node) {
    return this.#reach(node, 0.5);
  }

  /** The first step at which every file has changed; the last step when some never do; -1 with no files. */
  lastStep(node) {
    const o = this.#row(node);
    if (o < 0) return this.#reach(node, 1);
    const tf = this.#files[o + STEPS];
    if (!tf) return -1;
    for (let k = 0; k < STEPS; k++) if (this.#files[o + k] === tf) return k;
    return STEPS - 1;
  }

  /**
   * Six strata by last change, newest first: under a day, a day to a week,
   * a week to a month, a month to a year, a year to three years, and older
   * (or undated). Each is a difference between two ladder steps, so the
   * strata add up to the totals and agree with every step.
   */
  bands(node) {
    const bytes = new Array(BANDS).fill(0);
    const files = new Array(BANDS).fill(0);
    const o = this.#row(node);
    if (o < 0) {
      const s = firstStep(this.#T, node.d ? node.mm : node.m);
      let j = 0;
      while (j < BAND_STEPS.length && BAND_STEPS[j] < s) j++;
      bytes[j] = node.s;
      files[j] = node.d ? node.fc : 1;
      return { bytes, files };
    }
    let pb = 0;
    let pf = 0;
    for (let j = 0; j < BANDS; j++) {
      const k = j < BAND_STEPS.length ? BAND_STEPS[j] : STEPS;
      bytes[j] = this.#bytes[o + k] - pb;
      files[j] = this.#files[o + k] - pf;
      pb = this.#bytes[o + k];
      pf = this.#files[o + k];
    }
    return { bytes, files };
  }
}

/**
 * Builds the table for every folder under `root`, looking back from
 * `anchor` (ms). Nothing is written onto the nodes.
 */
export function buildAgeTable(root, anchor = Date.now()) {
  const t0 = now();
  const T = Object.freeze(LADDER_DAYS.map((d) => anchor - d * DAY));
  const Tf = Float64Array.from(T);
  const slots = new Map();
  let cap = Math.max(16, (root.dc | 0) + 1);
  let bytes = new Float64Array(cap * W);
  let files = new Uint32Array(cap * W);
  let up = new Int32Array(cap);
  let n = 0;

  // Pre-order: a folder takes its slot before any of its descendants, and
  // its own files go into the bin of the first step they count at.
  const stack = [root];
  const from = [-1];
  while (stack.length) {
    const dir = stack.pop();
    const parent = from.pop();
    if (n === cap) {
      cap *= 2;
      const b = new Float64Array(cap * W);
      b.set(bytes);
      bytes = b;
      const f = new Uint32Array(cap * W);
      f.set(files);
      files = f;
      const u = new Int32Array(cap);
      u.set(up);
      up = u;
    }
    const slot = n++;
    slots.set(dir, slot);
    up[slot] = parent;
    const o = slot * W;
    for (const ch of dir.c) {
      if (ch.d) {
        stack.push(ch);
        from.push(slot);
      } else {
        const k = firstStep(Tf, ch.m);
        bytes[o + k] += ch.s || 0;
        files[o + k]++;
      }
    }
  }

  // Reverse pre-order: every descendant is added in before its folder is
  // added to its own parent.
  for (let i = n - 1; i > 0; i--) {
    const o = i * W;
    const p = up[i] * W;
    for (let k = 0; k < W; k++) {
      bytes[p + k] += bytes[o + k];
      files[p + k] += files[o + k];
    }
  }
  // Bins become "changed after T[k]"; the last cell is the total.
  for (let i = 0; i < n; i++) {
    const o = i * W;
    for (let k = 1; k < W; k++) {
      bytes[o + k] += bytes[o + k - 1];
      files[o + k] += files[o + k - 1];
    }
  }
  if (n < cap) {
    bytes = bytes.slice(0, n * W);
    files = files.slice(0, n * W);
  }
  return new AgeTable(anchor, T, Tf, slots, bytes, files, now() - t0);
}
