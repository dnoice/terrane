/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Shelf Store (Terrane Edition - v1.0)
 *     - File Name: shelf-store.js
 *     - Relative Path: web/js/shelf-store.js
 *     - Artifact Type: javascript
 *     - Version: 1.0.0
 *     - Date: 11/15/2026
 *     - Update: Sunday, November 15, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Changelog:
 *     - 1.0.0 (11/15/2026) [dendogg + Anthropic - Claude Opus 5.5] —
 *       Initial release.
 *
 * ✒ Description:
 *     What the Shelf keeps, without the DOM: the files and folders a
 *     person gathered from anywhere in one directory, by path, newest
 *     first, at most 1,000 of them, kept in this browser for that
 *     directory. Storage and the clock are handed in, so it runs in Node
 *     as in the page.
 *
 * ✒ Key Features:
 *     - One storage key per directory, kept apart for a snapshot of it:
 *       terrane.shelf.v1|<root>, with |snapshot appended
 *     - An item is { rel, d, s, m, at }: its root-relative path, whether
 *       it is a folder, its size and last change when it was added, and
 *       when it was added; the name is the path's last segment and a
 *       file's kind comes from its name, so neither is stored
 *     - normRel refuses the root, a leading '/', an empty, '.' or '..'
 *       segment, a NUL and anything over 4,096 characters
 *     - add keeps an exact duplicate where it is ('already'), refuses a
 *       bad path, and cuts what passes the cap; remove, clear (the list
 *       kept for Put back) and restore (in its earlier order)
 *     - follow carries items through Terrane's renames and moves and
 *       their Undo, a folder with everything inside it; two that land on
 *       one path keep the earlier
 *     - Every write re-reads storage and merges it by path first, so two
 *       tabs keep each other's additions and a removal in either holds;
 *       sync merges another tab's write without writing
 *     - Storage that refuses (on read, or full) is reported once, and
 *       the store goes on in memory
 *     - Pure helpers: parentOf, tops (nothing inside another listed
 *       folder), commonFolder and summary (bytes of the tops only)
 *
 * ✒ Usage Instructions:
 *     import { Shelf, shelfKey } from './shelf-store.js';
 *     const shelf = new Shelf({ key: shelfKey(root), storage: () => localStorage, onFail, onChange });
 *     shelf.load();
 *     shelf.add([{ rel: 'Projects/tidelines/frame-0412.exr', d: 0, s: 52428800, m: 1794700000000 }]);
 *     shelf.follow([['Projects/tidelines', 'Archive/tidelines']]);
 *
 * ✒ Examples:
 *     shelfKey('C:\\data')               ->  'terrane.shelf.v1|C:\\data'
 *     shelfKey('C:\\data', 'snapshot')   ->  'terrane.shelf.v1|C:\\data|snapshot'
 *     normRel('a/../b')                  ->  null
 *     tops(['a', 'a/b', 'c'])            ->  ['a', 'c']
 *     commonFolder(['a/b/x', 'a/c/y'])   ->  'a'
 *
 * ✒ Other Important Information:
 *     - Dependencies: memory.js (isRel)
 *     - Compatible platforms: any browser with ES2022 modules; Node.js 22
 *     - Storage: localStorage is per origin, so another address, browser
 *       or profile has its own shelf
 *     - Performance: look-ups by a Map; a write serialises at most 1,000
 *       items
 * ----------------------------------------------------------------------------
 */

import { isRel } from './memory.js';

/** The most items one directory's shelf holds. */
export const SHELF_MAX = 1000;
/** A path longer than this, in characters, is refused. */
export const REL_MAX = 4096;
/** The kept format; any other is read as nothing. */
export const FORMAT = 1;

/** The storage key of one directory's shelf; a snapshot of it is kept apart. */
export const shelfKey = (root, source = '') => `terrane.shelf.v1|${root}${source ? `|${source}` : ''}`;

/** A valid root-relative path to put on the shelf, or null: never the root ('') and never over REL_MAX. */
export function normRel(v) {
  if (typeof v !== 'string' || !v || v.length > REL_MAX || !isRel(v)) return null;
  return v;
}

const fig = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const figOr0 = (v) => (fig(v) ? v : 0);

/** The folder a path lies in: '' for an item at the root. */
export const parentOf = (rel) => (rel.includes('/') ? rel.slice(0, rel.lastIndexOf('/')) : '');

/** The name a path ends in. */
export const nameOf = (rel) => rel.slice(rel.lastIndexOf('/') + 1);

/** rel carried from one path to another: itself or something inside it; null when from does not hold it. */
const carried = (rel, from, to) => (rel === from ? to : rel.startsWith(`${from}/`) ? `${to}${rel.slice(from.length)}` : null);

/** The paths with anything inside another listed folder left out, in the order given. */
export function tops(rels) {
  const all = new Set(rels);
  return rels.filter((r) => {
    for (let p = parentOf(r); p; p = parentOf(p)) if (all.has(p)) return false;
    return true;
  });
}

/** The deepest folder holding every path's folder; '' (the root) when they spread apart or there are none. */
export function commonFolder(rels) {
  if (!rels.length) return '';
  let common = parentOf(rels[0]).split('/').filter(Boolean);
  for (const r of rels.slice(1)) {
    const segs = parentOf(r).split('/').filter(Boolean);
    let i = 0;
    while (i < common.length && i < segs.length && common[i] === segs[i]) i++;
    common = common.slice(0, i);
    if (!common.length) break;
  }
  return common.join('/');
}

/**
 * The head's figures: { files, folders, bytes, from }. bytes adds up the
 * tops only, so an item inside a listed folder is counted once; from is
 * how many distinct folders the items lie in. live(item) may give the
 * item's present { s } (a node held), else its stored figure counts.
 */
export function summary(items, live = () => null) {
  let files = 0;
  let folders = 0;
  const parents = new Set();
  for (const it of items) {
    if (it.d) folders++;
    else files++;
    parents.add(parentOf(it.rel));
  }
  const top = new Set(tops(items.map((it) => it.rel)));
  let bytes = 0;
  for (const it of items) {
    if (!top.has(it.rel)) continue;
    const s = live(it)?.s;
    bytes += fig(s) ? s : it.s;
  }
  return { files, folders, bytes, from: parents.size };
}

/** One kept item, or null when anything in it does not check out. */
function readItem(x) {
  if (!x || typeof x !== 'object') return null;
  const rel = normRel(x.rel);
  if (!rel) return null;
  if (x.d !== 0 && x.d !== 1 && x.d !== true && x.d !== false) return null;
  if (!fig(x.s) || !fig(x.m) || !fig(x.at)) return null;
  return { rel, d: x.d ? 1 : 0, s: x.s, m: x.m, at: x.at };
}

const data = ({ rel, d, s, m, at }) => ({ rel, d, s, m, at });

/** Newest first by when each was added; equal times keep their order (a stable sort). */
const byAt = (list) => list.map((it, i) => [it, i]).sort((a, b) => b[0].at - a[0].at || a[1] - b[1]).map(([it]) => it);

/**
 * One directory's shelf, kept in storage. items is read directly, newest
 * first; every change goes through the methods, which write at once, after
 * merging what another tab wrote.
 */
export class Shelf {
  /**
   * @param {object} o
   * @param {string} o.key the storage key (shelfKey(root))
   * @param {() => Storage} o.storage returns the storage to use; may throw
   * @param {(why: string) => void} o.onFail called once, when storage first refuses
   * @param {() => void} o.onChange called after every change, this tab's or another's merged in
   * @param {() => number} o.now the clock
   */
  constructor({ key, storage = () => null, onFail = () => {}, onChange = () => {}, now = Date.now } = {}) {
    this.key = key;
    this.storage = storage;
    this.onFail = onFail;
    this.onChange = onChange;
    this.now = now;
    this.items = [];
    this.index = new Map();
    this.failed = null;
    // Paths storage held when last read or written, paths added here since,
    // and paths taken off here since: what tells this tab's edits from another's.
    this.base = new Set();
    this.changed = new Set();
    this.forgotten = new Set();
  }

  get size() {
    return this.items.length;
  }

  has(rel) {
    return this.index.has(rel);
  }

  get(rel) {
    return this.index.get(rel) || null;
  }

  #reindex() {
    this.index = new Map(this.items.map((it) => [it.rel, it]));
  }

  #fail(what, err) {
    if (this.failed) return;
    this.failed = `${what}: ${err?.name === 'QuotaExceededError' ? 'the storage is full' : err?.message || String(err)}`;
    try {
      this.onFail(this.failed);
    } catch { /* a reporter that throws changes nothing here */ }
  }

  #changed() {
    try {
      this.onChange();
    } catch { /* a listener that throws changes nothing here */ }
  }

  /** Kept text -> the items, malformed and repeated ones left out, at most SHELF_MAX; null when unreadable. */
  static parse(text) {
    let v;
    try {
      v = typeof text === 'string' ? JSON.parse(text) : null;
    } catch {
      return null;
    }
    if (!v || typeof v !== 'object' || v.format !== FORMAT || !Array.isArray(v.items)) return null;
    const out = [];
    const seen = new Set();
    for (const x of v.items) {
      const it = readItem(x);
      if (!it || seen.has(it.rel)) continue;
      seen.add(it.rel);
      out.push(it);
      if (out.length >= SHELF_MAX) break;
    }
    return out;
  }

  #read() {
    if (this.failed) return { st: null, text: null };
    try {
      const st = this.storage();
      return { st, text: st ? st.getItem(this.key) : null };
    } catch (err) {
      this.#fail('it could not be read', err);
      return { st: null, text: null };
    }
  }

  /** Reads what this directory kept; junk reads as an empty shelf. */
  load() {
    const { text } = this.#read();
    this.items = Shelf.parse(text) || [];
    this.base = new Set(this.items.map((it) => it.rel));
    this.#reindex();
    return this;
  }

  /**
   * This tab's items merged with what storage holds: one this tab holds
   * stays unless another tab took it off (storage held it, holds it no
   * longer, and it was not added here since); one another tab added stays
   * unless it was taken off here. Newest first by when each was added,
   * this tab's order first where the times are equal; at most SHELF_MAX.
   */
  #merge(inc) {
    const stored = new Set(inc.map((it) => it.rel));
    const out = [];
    const seen = new Set();
    for (const it of this.items) {
      seen.add(it.rel);
      if (stored.has(it.rel) || !this.base.has(it.rel) || this.changed.has(it.rel)) out.push(it);
    }
    for (const it of inc) if (!seen.has(it.rel) && !this.forgotten.has(it.rel)) out.push(it);
    return byAt(out).slice(0, SHELF_MAX);
  }

  /** Re-reads storage, merges, writes the result and says it changed. In memory only once storage refused. */
  #write() {
    if (!this.failed) {
      const { st, text } = this.#read();
      if (!this.failed) {
        this.items = this.#merge(Shelf.parse(text) || []);
        if (st) {
          try {
            if (!this.items.length) st.removeItem(this.key);
            else st.setItem(this.key, JSON.stringify({ format: FORMAT, items: this.items.map(data) }));
            this.base = new Set(this.items.map((it) => it.rel));
            this.changed.clear();
            this.forgotten.clear();
          } catch (err) {
            this.#fail('it could not be written', err);
          }
        }
      }
    }
    this.#reindex();
    this.#changed();
  }

  /** Another tab wrote: its changes are merged in here, without writing. True when anything changed. */
  sync() {
    if (this.failed) return false;
    const { text } = this.#read();
    if (this.failed) return false;
    const inc = Shelf.parse(text) || [];
    const before = this.items.map((it) => it.rel).join('\n');
    this.items = this.#merge(inc);
    this.base = new Set(inc.map((it) => it.rel));
    // What another tab took off and this one had re-added is this tab's again.
    for (const it of this.items) if (!this.base.has(it.rel)) this.changed.add(it.rel);
    this.#reindex();
    const changed = this.items.map((it) => it.rel).join('\n') !== before;
    if (changed) this.#changed();
    return changed;
  }

  /**
   * Puts entries ({ rel, d, s, m }) at the top, in the order given.
   * Returns { added: [items], already, refused, cut }: an exact duplicate
   * is already there and keeps its place; a bad path is refused; what
   * passes SHELF_MAX is cut.
   */
  add(entries) {
    const res = { added: [], already: 0, refused: 0, cut: 0 };
    const at = this.now();
    const fresh = new Set();
    for (const e of Array.isArray(entries) ? entries : []) {
      const rel = normRel(e?.rel);
      if (!rel) {
        res.refused++;
        continue;
      }
      if (this.index.has(rel) || fresh.has(rel)) {
        res.already++;
        continue;
      }
      if (this.items.length + res.added.length >= SHELF_MAX) {
        res.cut++;
        continue;
      }
      fresh.add(rel);
      res.added.push({ rel, d: e.d ? 1 : 0, s: figOr0(e.s), m: figOr0(e.m), at });
    }
    if (res.added.length) {
      for (const it of res.added) {
        this.changed.add(it.rel);
        this.forgotten.delete(it.rel);
      }
      this.items = [...res.added, ...this.items];
      this.#write();
    }
    return res;
  }

  /** Takes paths off the shelf; the number taken off. */
  remove(rels) {
    const gone = new Set((Array.isArray(rels) ? rels : [rels]).filter((r) => this.index.has(r)));
    if (!gone.size) return 0;
    this.items = this.items.filter((it) => !gone.has(it.rel));
    for (const r of gone) {
      this.forgotten.add(r);
      this.changed.delete(r);
    }
    this.#write();
    return gone.size;
  }

  /** Empties the shelf; the items it held, newest first, for Put back. */
  clear() {
    const was = this.items.map(data);
    if (!was.length) return was;
    for (const it of was) {
      this.forgotten.add(it.rel);
      this.changed.delete(it.rel);
    }
    this.items = [];
    this.#write();
    return was;
  }

  /**
   * Puts a list back (clear()'s), in its earlier order, after what was
   * added meanwhile: one already there is skipped, and none passes the
   * cap. The number put back.
   */
  restore(list) {
    let n = 0;
    const back = [];
    for (const x of Array.isArray(list) ? list : []) {
      const it = readItem(x);
      if (!it || this.index.has(it.rel) || back.some((b) => b.rel === it.rel)) continue;
      if (this.items.length + back.length >= SHELF_MAX) break;
      back.push(it);
      this.changed.add(it.rel);
      this.forgotten.delete(it.rel);
      n++;
    }
    if (!n) return 0;
    this.items = [...this.items, ...back];
    this.#write();
    return n;
  }

  /**
   * Carries items through renames and moves, [[from, to], ...]: an item
   * at from, or inside it, takes the path to holds; the longest from that
   * holds it wins. Two that land on one path keep the earlier. A pair that
   * is not two distinct valid paths is ignored. The number carried.
   */
  follow(pairs) {
    const ok = (Array.isArray(pairs) ? pairs : []).filter((p) => Array.isArray(p) && normRel(p[0]) && normRel(p[1]) && p[0] !== p[1]);
    if (!ok.length || !this.items.length) return 0;
    let n = 0;
    const out = [];
    const seen = new Set();
    for (const it of this.items) {
      let to = null;
      let len = -1;
      for (const [from, dest] of ok) {
        if (from.length <= len) continue;
        const c = carried(it.rel, from, dest);
        if (c !== null && normRel(c)) {
          to = c;
          len = from.length;
        }
      }
      if (to === null) {
        // A carried item already took this path: the earlier is kept.
        if (seen.has(it.rel)) {
          n++;
          continue;
        }
        seen.add(it.rel);
        out.push(it);
        continue;
      }
      n++;
      this.forgotten.add(it.rel);
      this.changed.delete(it.rel);
      if (seen.has(to)) continue;
      seen.add(to);
      this.changed.add(to);
      this.forgotten.delete(to);
      out.push({ ...it, rel: to });
    }
    if (!n) return 0;
    this.items = out;
    this.#write();
    return n;
  }

  /** Updates an item's figures in memory; they are written with the next change. True when anything changed. */
  refresh(rel, { s, m, d } = {}) {
    const it = this.index.get(rel);
    if (!it) return false;
    let changed = false;
    if (fig(s) && s !== it.s) {
      it.s = s;
      changed = true;
    }
    if (fig(m) && m !== it.m) {
      it.m = m;
      changed = true;
    }
    if (d !== undefined && (d ? 1 : 0) !== it.d) {
      it.d = d ? 1 : 0;
      changed = true;
    }
    return changed;
  }
}
