/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Places Store (Terrane Edition - v1.0)
 *     - File Name: places.js
 *     - Relative Path: web/js/places.js
 *     - Artifact Type: javascript
 *     - Version: 1.0.0
 *     - Date: 11/12/2026
 *     - Update: Thursday, November 12, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Description:
 *     The memory behind landmarks: benchmarks (a folder's size, counts and
 *     largest entries measured at a moment) and the return point (a pose
 *     kept relative to a folder's box). It touches no DOM: storage, timers
 *     and the model are handed to it, so it runs in Node as in the page.
 *
 * ✒ Key Features:
 *     - Up to 64 benchmarks per directory, each a snapshot of the folder's
 *       bytes, files, folders and newest change, plus its 64 largest
 *       direct entries by name and a total for the rest
 *     - summary(b): what changed since, from the folder's own totals, in
 *       constant time; detail(b): which entries are gone, here now, grown
 *       or shrunk, computed on demand and cached by a fingerprint of the
 *       folder
 *     - Benchmarks name folders by root-relative path; resolve(model)
 *       finds them again after a scan or a refresh, and a path with
 *       nothing at it is missing, never dropped
 *     - rebase(from, to) carries paths along when Terrane itself renames or
 *       moves a folder (and back, when that is undone)
 *     - Persistence under terrane.places.v1|<root>, saves debounced to
 *       1 s; every storage access is guarded, and a refusal is reported
 *       once while everything keeps working in memory
 *     - Return point arithmetic: anchorOf, poseRelative and vantage turn
 *       an eye into an offset in units of a box's width and back
 *     - Short and long change wording that says "changed", never
 *       "created" or "added"
 *
 * ✒ Usage Instructions:
 *     const store = new Places({ key: storageKey(root), storage: () => localStorage,
 *       onFail: (why) => notice(why) });
 *     store.load();
 *     store.resolve(model);                  // after the first scan
 *     const { b } = store.set(folder);       // B: measure now
 *     deltaText(store.summary(b));           // "+1 file, +12 B"
 *     store.rebase('a/old', 'a/new');        // after Terrane renamed a folder
 *
 * ✒ Examples:
 *     store.summary(b)  ->  { missing: false, ds: 12, df: 1, dd: 0, di: 1, later: true, changed: true }
 *     deltaText(s)      ->  "+1 file, +12 B"
 *     deltaText(s, { short: true })  ->  "+1 file"
 *     store.detail(b)   ->  { gone: [], here: [{ name, d, s, f }], grown: [], shrunk: [], partial: false }
 *     vantage(point, anchorOf(layout, i))  ->  { x, y, z, yaw, pitch }
 *
 * ✒ Other Important Information:
 *     - Dependencies: model.js (relPath, fmtBytes, fmtCount)
 *     - Compatible platforms: any browser with ES2022 modules; Node.js 22
 *     - Storage: localStorage is per origin, and the origin includes the
 *       port, so another address, browser or profile sees no places
 *     - Limitations: the snapshot keeps the 64 largest direct entries by
 *       name; an entry outside them then can only be said to be "not among
 *       the 64 largest then"
 * ----------------------------------------------------------------------------
 */

import { relPath, fmtBytes, fmtCount } from './model.js';

/** The most benchmarks one directory keeps. */
export const MAX_BENCHMARKS = 64;
/** Direct entries a measurement keeps by name, largest first; the rest are summed. */
export const KEEP_ENTRIES = 64;
/** Saves wait this long after the last change. */
export const SAVE_MS = 1000;
const FORMAT = 1;

/** The storage key for one directory. */
export const storageKey = (root) => `terrane.places.v1|${root}`;

/* ---------- measuring and comparing ---------- */

const byName = (a, b) => (a.n < b.n ? -1 : a.n > b.n ? 1 : 0);

/** A folder measured now: totals, newest change and its largest direct entries. */
export function measure(dir, at = Date.now()) {
  const kids = dir.c.slice().sort((a, b) => b.s - a.s || byName(a, b));
  const top = [];
  const rest = { n: 0, s: 0, f: 0 };
  kids.forEach((ch, k) => {
    const f = ch.d ? ch.fc : 1;
    if (k < KEEP_ENTRIES) top.push([ch.n, ch.d ? 1 : 0, ch.s, f]);
    else {
      rest.n++;
      rest.s += ch.s;
      rest.f += f;
    }
  });
  return { at, s: dir.s, fc: dir.fc, dc: dir.dc, items: kids.length, mm: dir.mm, top, rest };
}

/**
 * What changed since a measurement, from the folder's own totals: bytes,
 * files, folders and direct entries, and whether anything inside changed
 * after it (its newest change is later). Constant time.
 */
export function summarize(m, node) {
  if (!node) return { missing: true, changed: true, ds: 0, df: 0, dd: 0, di: 0, later: false };
  const ds = node.s - m.s;
  const df = node.fc - m.fc;
  const dd = node.dc - m.dc;
  const di = node.c.length - m.items;
  const later = node.mm > m.mm;
  return { missing: false, ds, df, dd, di, later, changed: !!(ds || df || dd || di || later) };
}

/** Which direct entries are gone, here now but not then, grown or shrunk. */
export function compare(m, node) {
  const then = new Map();
  for (const e of m.top) then.set(`${e[1]}|${e[0]}`, e);
  const here = [];
  const grown = [];
  const shrunk = [];
  const seen = new Set();
  for (const ch of node.c) {
    const key = `${ch.d ? 1 : 0}|${ch.n}`;
    const f = ch.d ? ch.fc : 1;
    const e = then.get(key);
    if (!e) {
      here.push({ name: ch.n, d: !!ch.d, s: ch.s, f, node: ch });
      continue;
    }
    seen.add(key);
    const ds = ch.s - e[2];
    const df = f - e[3];
    const row = { name: ch.n, d: !!ch.d, s: ch.s, f, ds, df, node: ch };
    if (ds > 0 || (!ds && df > 0)) grown.push(row);
    else if (ds < 0 || df < 0) shrunk.push(row);
  }
  const gone = [];
  for (const [key, e] of then) if (!seen.has(key)) gone.push({ name: e[0], d: !!e[1], s: e[2], f: e[3] });
  const bySize = (a, b) => b.s - a.s || (a.name < b.name ? -1 : 1);
  const byDelta = (a, b) => Math.abs(b.ds) - Math.abs(a.ds) || Math.abs(b.df) - Math.abs(a.df) || (a.name < b.name ? -1 : 1);
  return { gone: gone.sort(bySize), here: here.sort(bySize), grown: grown.sort(byDelta), shrunk: shrunk.sort(byDelta), partial: m.rest.n > 0 };
}

const MINUS = '−';
const signed = (v, text) => `${v < 0 ? MINUS : '+'}${text}`;
const plural = (n, one, many = `${one}s`) => `${fmtCount(Math.abs(n))} ${Math.abs(n) === 1 ? one : many}`;

/**
 * A summary in words: "+1 file, +12 B", "−2 folders", "changed inside" or
 * "no change". short keeps the first figure only, for a tag in the world.
 */
export function deltaText(sm, { short = false } = {}) {
  if (sm.missing) return 'missing';
  const parts = [];
  if (sm.df) parts.push(signed(sm.df, plural(sm.df, 'file')));
  if (sm.ds) parts.push(signed(sm.ds, fmtBytes(Math.abs(sm.ds))));
  if (sm.dd) parts.push(signed(sm.dd, plural(sm.dd, 'folder')));
  if (!parts.length && sm.di) parts.push(signed(sm.di, plural(sm.di, 'entry', 'entries')));
  if (!parts.length) return sm.later ? 'changed inside' : 'no change';
  return short ? parts[0] : parts.join(', ');
}

/* ---------- the return point's arithmetic ---------- */

/** The anchor of box i: the centre of its base, and its width. */
export function anchorOf(L, i) {
  const g = L.geo;
  const o = i * 6;
  return { x: g[o], y: g[o + 1] - g[o + 4] / 2, z: g[o + 2], w: Math.max(g[o + 3], g[o + 5], 1e-12) };
}

/** An eye as an offset from an anchor, in units of the anchor's width, with its heading. */
export function poseRelative(cam, a) {
  return { off: [(cam.x - a.x) / a.w, (cam.y - a.y) / a.w, (cam.z - a.z) / a.w], yaw: cam.yaw, pitch: cam.pitch };
}

/** The eye an offset stands for, from an anchor where the layout puts it now. */
export function vantage(point, a) {
  return { x: a.x + point.off[0] * a.w, y: a.y + point.off[1] * a.w, z: a.z + point.off[2] * a.w, yaw: point.yaw, pitch: point.pitch };
}

/* ---------- validation ---------- */

const num = (v) => typeof v === 'number' && Number.isFinite(v);
const isRel = (v) => typeof v === 'string' && !v.startsWith('/') && !v.split('/').some((p) => p === '..' || (v && !p));

function validMeasure(m) {
  return m && num(m.at) && num(m.s) && num(m.fc) && num(m.dc) && num(m.items) && num(m.mm)
    && Array.isArray(m.top) && m.top.length <= KEEP_ENTRIES
    && m.top.every((e) => Array.isArray(e) && typeof e[0] === 'string' && (e[1] === 0 || e[1] === 1) && num(e[2]) && num(e[3]))
    && m.rest && num(m.rest.n) && num(m.rest.s) && num(m.rest.f);
}

function validPoint(p) {
  return p && isRel(p.rel) && typeof p.name === 'string' && num(p.at)
    && (p.off === null || (Array.isArray(p.off) && p.off.length === 3 && p.off.every(num) && num(p.yaw) && num(p.pitch)));
}

/** The persisted part of a return point. */
const pointData = (p) => (p ? { rel: p.rel, name: p.name, at: p.at, off: p.off ?? null, yaw: p.yaw ?? 0, pitch: p.pitch ?? 0 } : null);

/** A path with `from` (or anything under it) moved to `to`; the same path when it is not under `from`. */
export function rebased(rel, from, to) {
  if (rel === from) return to;
  if (from && rel.startsWith(`${from}/`)) return to + rel.slice(from.length);
  return rel;
}

/* ---------- the store ---------- */

function attached(node, root) {
  let a = node;
  while (a.p) {
    if (!a.p.c.includes(a)) return false;
    a = a.p;
  }
  return a === root;
}

const under = (node, dirs) => {
  for (let a = node; a; a = a.p) if (dirs.has(a)) return true;
  return false;
};

/**
 * Benchmarks and the return point for one directory. A benchmark is
 * { id, rel, name, set, m } on disk; in memory it also carries node (the
 * folder it resolves to, or null when missing). Nothing is ever written
 * onto a model node: lookups go through a side map.
 */
export class Places {
  /**
   * @param {object} o
   * @param {string} o.key the storage key (storageKey(root))
   * @param {() => Storage} o.storage returns the storage to use; may throw
   * @param {(why: string) => void} o.onFail called once, when storage first refuses
   * @param {() => number} o.now the clock
   * @param {{ set: Function, clear: Function }} o.timers for the save debounce
   */
  constructor({ key, storage = () => null, onFail = () => {}, now = Date.now, timers = { set: (fn, ms) => setTimeout(fn, ms), clear: (id) => clearTimeout(id) } } = {}) {
    this.key = key;
    this.storage = storage;
    this.onFail = onFail;
    this.now = now;
    this.timers = timers;
    this.benchmarks = [];
    this.ret = null;
    this.failed = null;
    this.resolved = false;
    this.version = 0;
    this.seq = 0;
    this.byNode = new Map();
    this.cache = new Map();
    this.saveTimer = 0;
    this.dirty = false;
  }

  /* ---- storage ---- */

  #fail(what, err) {
    if (this.failed) return;
    this.failed = `${what}: ${err?.name === 'QuotaExceededError' ? 'the storage is full' : err?.message || String(err)}`;
    try {
      this.onFail(this.failed);
    } catch { /* a reporter that throws changes nothing here */ }
  }

  /** Reads what this directory kept. Returns the number of benchmarks read. */
  load() {
    let text = null;
    try {
      const st = this.storage();
      if (!st) return 0;
      text = st.getItem(this.key);
    } catch (err) {
      this.#fail('it could not be read', err);
      return 0;
    }
    if (!text) return 0;
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return 0;
    }
    if (!data || data.format !== FORMAT || !Array.isArray(data.benchmarks)) return 0;
    const seen = new Set();
    this.benchmarks = [];
    for (const b of data.benchmarks) {
      if (this.benchmarks.length >= MAX_BENCHMARKS) break;
      if (!b || typeof b.id !== 'string' || !isRel(b.rel) || typeof b.name !== 'string' || !num(b.set) || !validMeasure(b.m) || seen.has(b.rel)) continue;
      seen.add(b.rel);
      this.benchmarks.push({ id: b.id, rel: b.rel, name: b.name, set: b.set, m: b.m, node: null });
      const k = Number(/^b(\d+)$/.exec(b.id)?.[1]);
      if (k > this.seq) this.seq = k;
    }
    this.ret = validPoint(data.ret) ? pointData(data.ret) : null;
    this.version++;
    return this.benchmarks.length;
  }

  /** What is written: the persisted fields only. */
  toJSON() {
    return {
      format: FORMAT,
      benchmarks: this.benchmarks.map(({ id, rel, name, set, m }) => ({ id, rel, name, set, m })),
      ret: pointData(this.ret),
    };
  }

  /** Marks the store changed and saves SAVE_MS after the last change. */
  save() {
    this.version++;
    this.dirty = true;
    this.timers.clear(this.saveTimer);
    this.saveTimer = this.timers.set(() => this.flush(), SAVE_MS);
  }

  /** Writes now, if anything is waiting. Returns whether it was written. */
  flush() {
    this.timers.clear(this.saveTimer);
    this.saveTimer = 0;
    if (!this.dirty) return false;
    this.dirty = false;
    try {
      const st = this.storage();
      if (!st) return false;
      if (!this.benchmarks.length && !this.ret) st.removeItem(this.key);
      else st.setItem(this.key, JSON.stringify(this));
      return true;
    } catch (err) {
      this.#fail('it could not be written', err);
      return false;
    }
  }

  /* ---- benchmarks ---- */

  /** The benchmark on a folder node, if any. */
  find(node) {
    return node ? this.byNode.get(node) : undefined;
  }

  /** The benchmark kept for a path, if any. */
  findRel(rel) {
    return this.benchmarks.find((b) => b.rel === rel);
  }

  get full() {
    return this.benchmarks.length >= MAX_BENCHMARKS;
  }

  /**
   * Measures a folder now. A folder with a benchmark is measured again
   * (prev holds the earlier measurement, for undo); otherwise a new one
   * is kept, unless MAX_BENCHMARKS are kept already ({ full: true }).
   */
  set(node, at = this.now()) {
    const rel = relPath(node);
    let b = this.find(node) || this.findRel(rel);
    const m = measure(node, at);
    if (b) {
      const prev = b.m;
      b.m = m;
      b.rel = rel;
      b.name = node.n;
      this.#bind(b, node);
      this.save();
      return { b, prev, created: false };
    }
    if (this.full) return { full: true };
    b = { id: `b${++this.seq}`, rel, name: node.n, set: at, m, node: null };
    this.benchmarks.push(b);
    this.#bind(b, node);
    this.save();
    return { b, prev: null, created: true };
  }

  /** Puts an earlier measurement back (undo of a second measurement). */
  restore(b, m) {
    if (!this.benchmarks.includes(b)) return false;
    b.m = m;
    this.cache.delete(b.id);
    this.save();
    return true;
  }

  /** Forgets one benchmark. */
  remove(b) {
    const at = this.benchmarks.indexOf(b);
    if (at < 0) return false;
    this.benchmarks.splice(at, 1);
    if (b.node && this.byNode.get(b.node) === b) this.byNode.delete(b.node);
    this.cache.delete(b.id);
    this.save();
    return true;
  }

  /** Puts a forgotten benchmark back where it was in the list (undo of Forget). */
  reinstate(b, at = this.benchmarks.length) {
    if (this.benchmarks.includes(b) || this.findRel(b.rel) || this.full) return false;
    this.benchmarks.splice(Math.min(at, this.benchmarks.length), 0, b);
    if (b.node) this.byNode.set(b.node, b);
    this.save();
    return true;
  }

  /** Forgets every benchmark and the return point. */
  clear() {
    this.benchmarks = [];
    this.byNode.clear();
    this.cache.clear();
    this.ret = null;
    this.save();
  }

  #bind(b, node) {
    if (b.node && this.byNode.get(b.node) === b) this.byNode.delete(b.node);
    b.node = node;
    if (node) this.byNode.set(node, b);
  }

  /**
   * Finds every benchmark's folder in a model. With dirs (a Set of the
   * folders just re-read), only benchmarks that could have moved are
   * looked at again: those under one of them, and those missing. Returns
   * the benchmarks that went missing and those found again.
   */
  resolve(model, dirs = null) {
    const lost = [];
    const found = [];
    const first = !this.resolved;
    for (const b of this.benchmarks) {
      const had = b.node;
      if (dirs && had && !under(had, dirs)) continue;
      if (had && attached(had, model.root) && relPath(had) === b.rel) continue;
      const n = model.find(b.rel);
      this.#bind(b, n && n.d ? n : null);
      if (!first && had && !b.node) lost.push(b);
      if (!first && !had && b.node) found.push(b);
    }
    this.resolved = true;
    this.version++;
    return { lost, found };
  }

  /**
   * Carries paths along a rename or move made by Terrane: a benchmark (or
   * the return point) at `from` or under it now names the same place under
   * `to`. Its folder is found again by the next resolve. Returns the
   * benchmarks moved.
   */
  rebase(from, to) {
    const moved = [];
    if (from === to || !isRel(from) || !isRel(to) || !from) return moved;
    for (const b of this.benchmarks) {
      const next = rebased(b.rel, from, to);
      if (next === b.rel) continue;
      b.rel = next;
      if (next === to) b.name = to.slice(to.lastIndexOf('/') + 1);
      this.#bind(b, null);
      this.cache.delete(b.id);
      moved.push(b);
    }
    if (this.ret) {
      const next = rebased(this.ret.rel, from, to);
      if (next !== this.ret.rel) {
        this.ret = { ...this.ret, rel: next, name: next === to ? to.slice(to.lastIndexOf('/') + 1) : this.ret.name };
        moved.push(this.ret);
      }
    }
    if (moved.length) this.save();
    return moved;
  }

  /** What changed since b was measured, in constant time; null before the first resolve. */
  summary(b) {
    if (!this.resolved) return null;
    return summarize(b.m, b.node);
  }

  /** Which entries changed since b was measured; cached until the folder changes. */
  detail(b) {
    const node = b.node;
    if (!node) return null;
    const fp = `${node.s}|${node.fc}|${node.dc}|${node.c.length}|${node.mm}|${node.m}`;
    const hit = this.cache.get(b.id);
    if (hit && hit.fp === fp && hit.node === node && hit.m === b.m) return hit.res;
    const res = compare(b.m, node);
    this.cache.set(b.id, { fp, node, m: b.m, res });
    return res;
  }

  /* ---- the return point ---- */

  /** Keeps a return point: { rel, name, at, off, yaw, pitch } (off is null without a 3D view). */
  setReturn(point) {
    this.ret = pointData(point);
    this.save();
    return this.ret;
  }

  forgetReturn() {
    this.ret = null;
    this.save();
  }
}
