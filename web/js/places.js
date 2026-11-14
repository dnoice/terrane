/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Places Store (Terrane Edition - v1.2)
 *     - File Name: places.js
 *     - Relative Path: web/js/places.js
 *     - Artifact Type: javascript
 *     - Version: 1.2.0
 *     - Date: 11/13/2026
 *     - Update: Friday, November 13, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Changelog:
 *     - 1.2.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] —
 *       exportData() and importData(data) for a places file: benchmarks
 *       matched by folder, added under new ids or updated when newer,
 *       the malformed and those past 64 skipped, the return point added
 *       or updated by the same rule, and undo() for the whole import.
 *     - 1.1.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] —
 *       resolve(model) without dirs, a whole survey, empties the detail
 *       cache, which held the old tree. plural comes from model.js.
 *     - 1.0.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] —
 *       Initial release.
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
 *     - Persistence under terrane.places.v1|<root> (|snapshot appended for
 *       a snapshot of it), saves debounced to 1 s; every storage access is
 *       guarded, and a refusal is reported once while everything keeps
 *       working in memory
 *     - Two tabs on one directory and address: what another saved is
 *       merged in before every write and on sync(), benchmark by benchmark,
 *       a change made here winning over one made there, so neither tab's
 *       save wipes the other's
 *     - Return point arithmetic: anchorOf, poseRelative and vantage turn
 *       an eye into an offset in units of a box's width and back
 *     - Short and long change wording that says "changed", never
 *       "created" or "added"
 *     - exportData() for a places file; importData(data) takes one in:
 *       each benchmark checked as a load checks it, matched by folder,
 *       new ones under new ids (skipped past 64), known ones updated
 *       only by a newer measurement, the return point by the same rule;
 *       it counts what was added, updated and skipped, saves once, and
 *       its undo() puts back what was here before
 *
 * ✒ Usage Instructions:
 *     const store = new Places({ key: storageKey(root), storage: () => localStorage,
 *       onFail: (why) => notice(why), onSync: () => redraw() });
 *     store.load();
 *     addEventListener('storage', (e) => e.key === store.key && store.sync());
 *     store.resolve(model);                  // after the first scan
 *     const { b } = store.set(folder);       // B: measure now
 *     deltaText(store.summary(b));           // "+1 file, +12 B"
 *     store.rebase('a/old', 'a/new');        // after Terrane renamed a folder
 *     const r = store.importData(file);      // { added, updated, skipped, full, undo }
 *     r.undo();                              // what was here before, back
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

import { relPath, fmtBytes, fmtCount, plural } from './model.js';

/** The most benchmarks one directory keeps. */
export const MAX_BENCHMARKS = 64;
/** Direct entries a measurement keeps by name, largest first; the rest are summed. */
export const KEEP_ENTRIES = 64;
/** Saves wait this long after the last change. */
export const SAVE_MS = 1000;
const FORMAT = 1;

/**
 * The storage key for one directory. A snapshot of it is another source
 * ('snapshot'), kept apart, so a benchmark is only ever compared with the
 * source it was measured from.
 */
export const storageKey = (root, source = '') => `terrane.places.v1|${root}${source ? `|${source}` : ''}`;

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

/** The persisted part of a benchmark. */
const benchData = ({ id, rel, name, set, m }) => ({ id, rel, name, set, m });

/** A benchmark as text, to tell whether it changed since it was last in storage. */
const benchText = (b) => (b ? JSON.stringify(benchData(b)) : undefined);

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
   * @param {() => number} o.now the clock: when a measurement is of (a
   *   snapshot's is the moment it was taken)
   * @param {() => void} o.onSync called after another tab's saved changes
   *   were merged in, so the page can find their folders and redraw
   * @param {{ set: Function, clear: Function }} o.timers for the save debounce
   */
  constructor({ key, storage = () => null, onFail = () => {}, onSync = () => {}, now = Date.now, timers = { set: (fn, ms) => setTimeout(fn, ms), clear: (id) => clearTimeout(id) } } = {}) {
    this.key = key;
    this.storage = storage;
    this.onFail = onFail;
    this.onSync = onSync;
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
    // What storage held when this store last read or wrote it: the text,
    // each benchmark as text by id, and the return point as text. A change
    // here since then is this tab's own; anything else another tab's.
    this.synced = null;
    this.base = new Map();
    this.baseRet = 'null';
  }

  /* ---- storage ---- */

  #fail(what, err) {
    if (this.failed) return;
    this.failed = `${what}: ${err?.name === 'QuotaExceededError' ? 'the storage is full' : err?.message || String(err)}`;
    try {
      this.onFail(this.failed);
    } catch { /* a reporter that throws changes nothing here */ }
  }

  /** Kept text -> { benchmarks, ret, seq }, the malformed and foreign refused; null when unreadable. */
  static parse(text) {
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return null;
    }
    if (!data || data.format !== FORMAT || !Array.isArray(data.benchmarks)) return null;
    const rels = new Set();
    const ids = new Set();
    const benchmarks = [];
    let seq = 0;
    for (const b of data.benchmarks) {
      if (benchmarks.length >= MAX_BENCHMARKS) break;
      if (!b || typeof b.id !== 'string' || !isRel(b.rel) || typeof b.name !== 'string' || !num(b.set) || !validMeasure(b.m) || rels.has(b.rel) || ids.has(b.id)) continue;
      rels.add(b.rel);
      ids.add(b.id);
      benchmarks.push({ id: b.id, rel: b.rel, name: b.name, set: b.set, m: b.m, node: null });
      const k = Number(/^b(\d+)$/.exec(b.id)?.[1]);
      if (k > seq) seq = k;
    }
    return { benchmarks, ret: validPoint(data.ret) ? pointData(data.ret) : null, seq };
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
    this.synced = text;
    if (!text) return 0;
    const data = Places.parse(text);
    if (!data) return 0;
    this.benchmarks = data.benchmarks;
    this.ret = data.ret;
    if (data.seq > this.seq) this.seq = data.seq;
    this.#remember(text, this.benchmarks, this.ret);
    this.version++;
    return this.benchmarks.length;
  }

  /** What is written: the persisted fields only. */
  toJSON() {
    return { format: FORMAT, benchmarks: this.benchmarks.map(benchData), ret: pointData(this.ret) };
  }

  /** The text a state is kept as; null when there is nothing to keep (the key is removed). */
  static #textOf(benchmarks, ret) {
    return !benchmarks.length && !ret ? null : JSON.stringify({ format: FORMAT, benchmarks: benchmarks.map(benchData), ret: pointData(ret) });
  }

  /** Notes what storage now holds, as the base later changes are told apart by. */
  #remember(text, benchmarks, ret) {
    this.synced = text;
    this.base = new Map(benchmarks.map((b) => [b.id, benchText(b)]));
    this.baseRet = JSON.stringify(pointData(ret));
  }

  /**
   * Merges what another tab on this directory and address saved (text)
   * into this store. Per benchmark, by id: one changed or forgotten here
   * since the last read or write is kept as it is here; otherwise the
   * other tab's is taken, a new one included, and one it forgot is
   * dropped. Two new ones under one id (each tab counted from the same
   * number) are both kept, this tab's under a new id. Two on one folder
   * leave the later measurement. The return point is this tab's when it
   * changed here, else the other tab's. Returns { changed, ours }: whether
   * this store changed, and whether storage now lacks something of this
   * tab's and must be written.
   */
  #merge(text) {
    const inc = text ? Places.parse(text) : { benchmarks: [], ret: null, seq: 0 };
    if (!inc) {
      // Unreadable: nothing can be taken from it, and the next save
      // replaces it, as after a load.
      this.synced = text;
      return { changed: false, ours: true };
    }
    const before = Places.#textOf(this.benchmarks, this.ret);
    const stored = Places.#textOf(inc.benchmarks, inc.ret);
    const incBase = new Map(inc.benchmarks.map((b) => [b.id, benchText(b)]));
    const incRet = JSON.stringify(pointData(inc.ret));
    const local = new Map(this.benchmarks.map((b) => [b.id, b]));
    const out = [];
    const renumber = [];
    for (const ib of inc.benchmarks) {
      const lb = local.get(ib.id);
      const was = this.base.get(ib.id);
      if (!lb) {
        if (was === undefined) out.push(ib);
        continue;
      }
      if (was === undefined && benchText(lb) !== incBase.get(ib.id)) {
        out.push(ib, lb);
        renumber.push(lb);
        continue;
      }
      if (benchText(lb) === was) {
        // Unchanged here: the other tab's version, kept on this object so
        // what holds it (an Undo, an open row) still finds it.
        if (lb.rel !== ib.rel) lb.node = null;
        Object.assign(lb, { rel: ib.rel, name: ib.name, set: ib.set, m: ib.m });
      }
      out.push(lb);
    }
    for (const lb of this.benchmarks) {
      if (incBase.has(lb.id)) continue;
      const was = this.base.get(lb.id);
      if (was === undefined || benchText(lb) !== was) out.push(lb);
    }
    this.seq = Math.max(this.seq, inc.seq);
    for (const b of renumber) b.id = `b${++this.seq}`;
    const at = new Map();
    const merged = [];
    for (const b of out) {
      const k = at.get(b.rel);
      if (k === undefined) {
        at.set(b.rel, merged.length);
        merged.push(b);
      } else if (b.m.at > merged[k].m.at) merged[k] = b;
    }
    this.benchmarks = merged.slice(0, MAX_BENCHMARKS);
    this.byNode.clear();
    for (const b of this.benchmarks) if (b.node) this.byNode.set(b.node, b);
    this.cache.clear();
    if (JSON.stringify(pointData(this.ret)) === this.baseRet) this.ret = inc.ret;
    this.synced = text;
    this.base = incBase;
    this.baseRet = incRet;
    this.version++;
    const after = Places.#textOf(this.benchmarks, this.ret);
    return { changed: after !== before, ours: after !== stored };
  }

  #announce() {
    try {
      this.onSync();
    } catch { /* a listener that throws changes nothing here */ }
  }

  /**
   * Takes in what another tab on this directory and address saved since
   * this store last read or wrote storage (the page calls it on a storage
   * event). Writes again when this tab has changes of its own that storage
   * now lacks. Returns whether this store changed.
   */
  sync() {
    let text;
    try {
      const st = this.storage();
      if (!st) return false;
      text = st.getItem(this.key);
    } catch (err) {
      this.#fail('it could not be read', err);
      return false;
    }
    if (text === this.synced) return false;
    const { changed, ours } = this.#merge(text);
    if (ours) this.save();
    else {
      this.dirty = false;
      this.timers.clear(this.saveTimer);
      this.saveTimer = 0;
    }
    if (changed) this.#announce();
    return changed;
  }

  /** Marks the store changed and saves SAVE_MS after the last change. */
  save() {
    this.version++;
    this.dirty = true;
    this.timers.clear(this.saveTimer);
    this.saveTimer = this.timers.set(() => this.flush(), SAVE_MS);
  }

  /**
   * Writes now, if anything is waiting. What another tab saved since this
   * store last read or wrote storage is merged in first, so neither tab's
   * changes are lost. Returns whether it was written.
   */
  flush() {
    this.timers.clear(this.saveTimer);
    this.saveTimer = 0;
    if (!this.dirty) return false;
    this.dirty = false;
    let changed = false;
    try {
      const st = this.storage();
      if (!st) return false;
      const now = st.getItem(this.key);
      if (now !== this.synced) ({ changed } = this.#merge(now));
      const text = Places.#textOf(this.benchmarks, this.ret);
      if (text === null) st.removeItem(this.key);
      else st.setItem(this.key, text);
      this.#remember(text, this.benchmarks, this.ret);
      return true;
    } catch (err) {
      this.#fail('it could not be written', err);
      return false;
    } finally {
      if (changed) this.#announce();
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
    // A whole survey is a new tree: the details worked out against the old
    // one would keep it reachable, and are of folders no longer shown.
    if (!dirs) this.cache.clear();
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

  /* ---- export and import ---- */

  /** What an export holds: the persisted benchmarks and the return point. */
  exportData() {
    return { benchmarks: this.benchmarks.map(benchData), ret: pointData(this.ret) };
  }

  /**
   * Takes in an export's { benchmarks, ret }. Each benchmark is checked as
   * a load checks it (Places.parse), and a malformed one is skipped.
   * Benchmarks are matched by folder (rel): a new folder is added under a
   * new id, b<n> after the highest kept, or skipped once MAX_BENCHMARKS are
   * kept (full); a folder already measured takes the imported measurement
   * when it is newer (updated), and is skipped otherwise. The return point
   * is added when there is none here, updated when it differs and is
   * newer, and skipped otherwise. One save. Returns { added, updated,
   * skipped, full, undo }, where undo() puts back what was here before
   * (once; false when there is nothing to put back).
   */
  importData(data) {
    const counts = { added: 0, updated: 0, skipped: 0, full: 0 };
    const added = [];
    const was = new Map();
    const one = (bench, ret) => {
      let text;
      try {
        text = JSON.stringify({ format: FORMAT, benchmarks: bench === undefined ? [] : [bench], ret: ret ?? null });
      } catch {
        return null;
      }
      return Places.parse(text);
    };
    for (const raw of Array.isArray(data?.benchmarks) ? data.benchmarks : []) {
      const b = one(raw ?? null)?.benchmarks[0];
      if (!b) {
        counts.skipped++;
        continue;
      }
      const have = this.findRel(b.rel);
      if (!have) {
        if (this.full) {
          counts.skipped++;
          counts.full++;
          continue;
        }
        const nb = { id: `b${++this.seq}`, rel: b.rel, name: b.name, set: b.set, m: b.m, node: null };
        this.benchmarks.push(nb);
        added.push(nb);
        counts.added++;
      } else if (b.m.at > have.m.at) {
        if (!was.has(have)) was.set(have, have.m);
        have.m = b.m;
        this.cache.delete(have.id);
        counts.updated++;
      } else counts.skipped++;
    }
    const prevRet = this.ret;
    let nextRet = null;
    if (data && data.ret != null) {
      const r = one(undefined, data.ret)?.ret;
      if (!r) counts.skipped++;
      else if (!this.ret) {
        nextRet = r;
        counts.added++;
      } else if (JSON.stringify(r) !== JSON.stringify(pointData(this.ret)) && r.at > this.ret.at) {
        nextRet = r;
        counts.updated++;
      } else counts.skipped++;
      if (nextRet) this.ret = nextRet;
    }
    const changed = counts.added + counts.updated > 0;
    if (changed) this.save();
    let undone = !changed;
    const undo = () => {
      if (undone) return false;
      undone = true;
      for (const b of added) {
        const at = this.benchmarks.indexOf(b);
        if (at < 0) continue;
        this.benchmarks.splice(at, 1);
        if (b.node && this.byNode.get(b.node) === b) this.byNode.delete(b.node);
        this.cache.delete(b.id);
      }
      for (const [b, m] of was) {
        if (!this.benchmarks.includes(b)) continue;
        b.m = m;
        this.cache.delete(b.id);
      }
      if (nextRet && this.ret === nextRet) this.ret = prevRet;
      this.save();
      return true;
    };
    return { ...counts, undo };
  }
}
