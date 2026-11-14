/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: View and Search Memory (Terrane Edition - v1.0)
 *     - File Name: memory.js
 *     - Relative Path: web/js/memory.js
 *     - Artifact Type: javascript
 *     - Version: 1.0.0
 *     - Date: 11/13/2026
 *     - Update: Friday, November 13, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Changelog:
 *     - 1.0.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] —
 *       Initial release.
 *
 * ✒ Description:
 *     What Terrane remembers between visits, without the DOM: the view
 *     you left (the folder, the lens, the tab, the selection and where
 *     the eye stood), the address of a folder as a link, and your search
 *     history and saved searches. Storage and the clock are handed in, so
 *     it runs in Node as in the page.
 *
 * ✒ Key Features:
 *     - Storage keys per directory, kept apart for a snapshot of it:
 *       terrane.view.v1|<root> and terrane.searches.v1|<root>, with
 *       |snapshot appended
 *     - readView(text) accepts a kept view only when every field checks
 *       out: root-relative paths with no '..', '.' or leading '/', a known
 *       lens, finite numbers, at most 500 selected paths
 *     - hashFor(rel) and relOfHash(hash): a folder's address as
 *       #/<segment>/<segment>, every segment percent-encoded, and back;
 *       a bad escape, an empty segment, '.' or '..' gives null
 *     - pushHistory: newest first, a repeat moves to the front, at most
 *       20 queries of at most 500 characters
 *     - HistoryWalk: ArrowUp and ArrowDown through the history, keeping
 *       what was being typed as the step before the newest
 *     - Searches, the store behind S.searches: history and up to 50 saved
 *       searches (a name of at most 80 characters and a query), re-read
 *       and merged before every write so two tabs keep each other's,
 *       mergeSaved for an import; a refusal from storage is reported once
 *       and everything keeps working in memory
 *
 * ✒ Usage Instructions:
 *     import { viewKey, readView, hashFor, relOfHash, Searches, searchKey } from './memory.js';
 *     const view = readView(localStorage.getItem(viewKey(root)));
 *     location.hash = hashFor('docs/2024');            // '#/docs/2024'
 *     relOfHash('#/My%20Folder/a%23b')                  // 'My Folder/a#b'
 *     const store = new Searches({ key: searchKey(root), storage: () => localStorage, onFail });
 *     store.load();
 *     store.push('ext:md newer:7d');
 *     store.save('Recent notes', 'ext:md newer:7d');  // { entry, updated: false }
 *
 * ✒ Examples:
 *     viewKey('C:\\data')                  ->  'terrane.view.v1|C:\\data'
 *     viewKey('C:\\data', 'snapshot')      ->  'terrane.view.v1|C:\\data|snapshot'
 *     readView('{"format":1,"focus":"../x",...}')  ->  null
 *     relOfHash('#/a/%E0%A4%A')            ->  null (a bad escape)
 *     pushHistory(['b', 'a'], 'a')         ->  ['a', 'b']
 *
 * ✒ Other Important Information:
 *     - Dependencies: none
 *     - Compatible platforms: any browser with ES2022 modules; Node.js 22
 *     - Storage: localStorage is per origin, and the origin includes the
 *       port, so another address, browser or profile remembers nothing
 *     - Limitations: two tabs on one directory keep the view saved last;
 *       saved searches are merged entry by entry
 * ----------------------------------------------------------------------------
 */

/** Lenses a kept view may name. */
export const LENSES = Object.freeze(['kind', 'age', 'size', 'dup']);
/** The most selected paths a kept view holds. */
export const MAX_SEL = 500;
/** The history keeps this many queries, newest first. */
export const HISTORY_MAX = 20;
/** A query longer than this is not kept. */
export const QUERY_MAX = 500;
/** The most saved searches one directory keeps. */
export const SAVED_MAX = 50;
/** A saved search's name is cut to this length. */
export const NAME_MAX = 80;
const FORMAT = 1;

const num = (v) => typeof v === 'number' && Number.isFinite(v);

/** A root-relative path: no leading '/', no empty, '.' or '..' segment, no NUL; '' is the root. */
export const isRel = (v) => typeof v === 'string' && !v.includes('\u0000')
  && (v === '' || v.split('/').every((p) => p && p !== '.' && p !== '..'));

/** The storage key of the kept view for one directory; a snapshot of it is kept apart. */
export const viewKey = (root, source = '') => `terrane.view.v1|${root}${source ? `|${source}` : ''}`;
/** The storage key of the search history and saved searches for one directory. */
export const searchKey = (root, source = '') => `terrane.searches.v1|${root}${source ? `|${source}` : ''}`;

/* ---------- the kept view ---------- */

function validPose(p) {
  return p && Array.isArray(p.off) && p.off.length === 3 && p.off.every(num) && num(p.yaw) && num(p.pitch);
}

/**
 * A view to keep: { format, at, focus, lens, tab, sel, primary, pose }.
 * Paths are root-relative; sel is cut to MAX_SEL; pose is relative to the
 * focus folder's box ({ off: [x, y, z], yaw, pitch }) or null.
 */
export function viewRecord({ focus = '', lens = 'kind', tab = 'contents', sel = [], primary = null, pose = null, at = Date.now() } = {}) {
  return {
    format: FORMAT, at, focus, lens, tab,
    sel: sel.slice(0, MAX_SEL), primary,
    pose: validPose(pose) ? { off: [...pose.off], yaw: pose.yaw, pitch: pose.pitch } : null,
  };
}

/** A kept view read back, or null when anything in it does not check out. */
export function readView(text) {
  let v;
  try {
    v = typeof text === 'string' ? JSON.parse(text) : null;
  } catch {
    return null;
  }
  if (!v || typeof v !== 'object' || v.format !== FORMAT || !num(v.at)) return null;
  if (!isRel(v.focus) || !LENSES.includes(v.lens)) return null;
  if (typeof v.tab !== 'string' || !v.tab || v.tab.length > 40) return null;
  if (!Array.isArray(v.sel) || v.sel.length > MAX_SEL || !v.sel.every(isRel)) return null;
  if (v.primary !== null && !isRel(v.primary)) return null;
  if (v.pose !== null && !validPose(v.pose)) return null;
  return viewRecord(v);
}

/* ---------- links ---------- */

/** The address of a folder (or file) as a hash: '#/' and its segments, percent-encoded. */
export function hashFor(rel) {
  return rel ? `#/${rel.split('/').map(encodeURIComponent).join('/')}` : '#/';
}

/**
 * The root-relative path a hash names, '' for the root, or null when it
 * names nothing Terrane would accept: no '#/' at its start, a bad escape,
 * an empty segment, '.', '..', a slash or a NUL inside a segment. One
 * trailing slash is allowed.
 */
export function relOfHash(hash) {
  if (typeof hash !== 'string' || !hash.startsWith('#/')) return null;
  let body = hash.slice(2);
  if (body.endsWith('/')) body = body.slice(0, -1);
  if (!body) return '';
  const out = [];
  for (const part of body.split('/')) {
    if (!part) return null;
    let seg;
    try {
      seg = decodeURIComponent(part);
    } catch {
      return null;
    }
    if (!seg || seg === '.' || seg === '..' || seg.includes('/') || seg.includes('\u0000')) return null;
    out.push(seg);
  }
  return out.join('/');
}

/* ---------- search history ---------- */

/** The history with q at its front: a repeat moves up, the oldest fall off. Unchanged for an empty or overlong q. */
export function pushHistory(list, q) {
  const text = typeof q === 'string' ? q.trim() : '';
  if (!text || text.length > QUERY_MAX) return list;
  return [text, ...list.filter((x) => x !== text)].slice(0, HISTORY_MAX);
}

/**
 * Stepping through the history from the Find field. index -1 is what was
 * being typed (the draft); 0 is the newest entry.
 */
export class HistoryWalk {
  constructor() {
    this.index = -1;
    this.draft = '';
  }

  /** ArrowUp: the next older entry (the oldest stays), or null when the history is empty. */
  older(list, current) {
    if (!list.length) return null;
    if (this.index === -1) this.draft = current;
    this.index = Math.min(this.index + 1, list.length - 1);
    return list[this.index];
  }

  /** ArrowDown: the next newer entry, the draft after the newest, or null at the draft (not stepping). */
  newer(list) {
    if (this.index < 0) return null;
    this.index = Math.min(this.index, list.length) - 1;
    return this.index < 0 ? this.draft : list[this.index];
  }

  /** Typing, or a cleared field, ends the walk. */
  reset() {
    this.index = -1;
    this.draft = '';
  }

  get stepping() {
    return this.index >= 0;
  }
}

/* ---------- the store: history and saved searches ---------- */

function validSaved(s) {
  return s && typeof s.id === 'string' && s.id && s.id.length <= 40
    && typeof s.name === 'string' && s.name.trim() && s.name.length <= NAME_MAX
    && typeof s.query === 'string' && s.query.trim() && s.query.length <= QUERY_MAX && num(s.at);
}

const sameName = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();
const savedData = ({ id, name, query, at }) => ({ id, name, query, at });

/**
 * The search history and the saved searches of one directory, kept in
 * storage. history and saved are read directly; every change goes through
 * the methods, which write at once, after merging what another tab wrote.
 */
export class Searches {
  /**
   * @param {object} o
   * @param {string} o.key the storage key (searchKey(root))
   * @param {() => Storage} o.storage returns the storage to use; may throw
   * @param {(why: string) => void} o.onFail called once, when storage first refuses
   * @param {() => void} o.onChange called after another tab's saves were merged in
   * @param {() => number} o.now the clock
   */
  constructor({ key, storage = () => null, onFail = () => {}, onChange = () => {}, now = Date.now } = {}) {
    this.key = key;
    this.storage = storage;
    this.onFail = onFail;
    this.onChange = onChange;
    this.now = now;
    this.history = [];
    this.saved = [];
    this.failed = null;
    // Ids storage held when last read or written, ids changed here since,
    // and ids forgotten here: what tells this tab's edits from another's.
    this.base = new Set();
    this.changed = new Set();
    this.forgotten = new Set();
    this.seq = 0;
  }

  #fail(what, err) {
    if (this.failed) return;
    this.failed = `${what}: ${err?.name === 'QuotaExceededError' ? 'the storage is full' : err?.message || String(err)}`;
    try {
      this.onFail(this.failed);
    } catch { /* a reporter that throws changes nothing here */ }
  }

  /** Kept text -> { history, saved }, the malformed left out; null when unreadable. */
  static parse(text) {
    let data;
    try {
      data = typeof text === 'string' ? JSON.parse(text) : null;
    } catch {
      return null;
    }
    if (!data || data.format !== FORMAT) return null;
    const history = [];
    for (const q of Array.isArray(data.history) ? data.history : []) {
      if (typeof q === 'string' && q.trim() && q.length <= QUERY_MAX && !history.includes(q)) history.push(q);
      if (history.length >= HISTORY_MAX) break;
    }
    const saved = [];
    const ids = new Set();
    for (const s of Array.isArray(data.saved) ? data.saved : []) {
      if (!validSaved(s) || ids.has(s.id)) continue;
      ids.add(s.id);
      saved.push(savedData(s));
      if (saved.length >= SAVED_MAX) break;
    }
    return { history, saved };
  }

  #read() {
    try {
      const st = this.storage();
      return { st, text: st ? st.getItem(this.key) : null };
    } catch (err) {
      this.#fail('it could not be read', err);
      return { st: null, text: null };
    }
  }

  /** Reads what this directory kept. */
  load() {
    const { text } = this.#read();
    const data = Searches.parse(text);
    if (!data) return this;
    this.history = data.history;
    this.saved = data.saved;
    this.base = new Set(this.saved.map((s) => s.id));
    return this;
  }

  /**
   * This tab's state merged with what storage holds: a saved search
   * changed here keeps this tab's version, one forgotten here stays
   * forgotten, one another tab forgot (here unchanged) goes, and anything
   * new on either side stays; two of one name keep the later. This tab's
   * order is kept, another tab's new searches follow. The history is this
   * tab's, newest first, then storage's, without repeats.
   */
  #merge(inc) {
    const stored = new Map(inc.saved.map((s) => [s.id, s]));
    const out = [];
    const seen = new Set();
    for (const s of this.saved) {
      seen.add(s.id);
      if (stored.has(s.id)) out.push(this.changed.has(s.id) ? s : stored.get(s.id));
      else if (!this.base.has(s.id) || this.changed.has(s.id)) out.push(s);
    }
    for (const s of inc.saved) if (!seen.has(s.id) && !this.forgotten.has(s.id)) out.push(s);
    const byName = [];
    for (const s of out) {
      const twin = byName.findIndex((x) => sameName(x.name, s.name));
      if (twin < 0) byName.push(s);
      else if (s.at > byName[twin].at) byName[twin] = s;
    }
    const history = [...this.history];
    for (const q of inc.history) if (!history.includes(q)) history.push(q);
    return { saved: byName.slice(0, SAVED_MAX), history: history.slice(0, HISTORY_MAX) };
  }

  /** Re-reads storage, merges, and writes the result. */
  #write() {
    const { st, text } = this.#read();
    const merged = this.#merge(Searches.parse(text) || { history: [], saved: [] });
    this.saved = merged.saved;
    this.history = merged.history;
    this.changed.clear();
    if (!st || this.failed) return;
    try {
      if (!this.saved.length && !this.history.length) st.removeItem(this.key);
      else st.setItem(this.key, JSON.stringify({ format: FORMAT, history: this.history, saved: this.saved.map(savedData) }));
      this.base = new Set(this.saved.map((s) => s.id));
    } catch (err) {
      this.#fail('it could not be written', err);
    }
  }

  /** Another tab wrote: its changes are merged in here, without writing. */
  sync() {
    const { text } = this.#read();
    const data = Searches.parse(text);
    if (!data) return false;
    const merged = this.#merge(data);
    const before = JSON.stringify([this.history, this.saved.map(savedData)]);
    this.saved = merged.saved;
    this.history = merged.history;
    this.base = new Set(data.saved.map((s) => s.id));
    const changed = JSON.stringify([this.history, this.saved.map(savedData)]) !== before;
    if (changed) {
      try {
        this.onChange();
      } catch { /* a listener that throws changes nothing here */ }
    }
    return changed;
  }

  /** Puts a query at the front of the history. Returns false when nothing changed. */
  push(q) {
    const next = pushHistory(this.history, q);
    if (next === this.history || next[0] === this.history[0] && next.length === this.history.length && next.every((x, i) => x === this.history[i])) return false;
    this.history = next;
    this.#write();
    return true;
  }

  #id() {
    this.seq++;
    return `s${this.now().toString(36)}${this.seq.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  }

  find(name) {
    return this.saved.find((s) => sameName(s.name, name)) || null;
  }

  /**
   * Saves a query under a name. The same name (in any case) takes the new
   * query: { entry, updated: true, prev }. A new name past SAVED_MAX is
   * refused: { full: true }. An empty name or query: { error }.
   */
  save(name, query) {
    const n = String(name ?? '').trim().slice(0, NAME_MAX);
    const q = String(query ?? '').trim();
    if (!n) return { error: 'Enter a name.' };
    if (!q) return { error: 'There is no search to save.' };
    if (q.length > QUERY_MAX) return { error: `A saved search holds at most ${QUERY_MAX} characters.` };
    const twin = this.find(n);
    if (twin) {
      const prev = { name: twin.name, query: twin.query, at: twin.at };
      Object.assign(twin, { name: n, query: q, at: this.now() });
      this.changed.add(twin.id);
      this.#write();
      return { entry: twin, updated: true, prev };
    }
    if (this.saved.length >= SAVED_MAX) return { full: true };
    const entry = { id: this.#id(), name: n, query: q, at: this.now() };
    this.saved.push(entry);
    this.changed.add(entry.id);
    this.#write();
    return { entry, updated: false };
  }

  /** Forgets a saved search: { entry, at } for Undo, or null when it is not there. */
  forget(id) {
    const at = this.saved.findIndex((s) => s.id === id);
    if (at < 0) return null;
    const [entry] = this.saved.splice(at, 1);
    this.forgotten.add(id);
    this.changed.delete(id);
    this.#write();
    return { entry, at };
  }

  /** Puts a forgotten search back where it was. False when its name is taken again or the list is full. */
  reinstate(entry, at = this.saved.length) {
    if (!entry || this.saved.some((s) => s.id === entry.id) || this.find(entry.name) || this.saved.length >= SAVED_MAX) return false;
    this.forgotten.delete(entry.id);
    this.saved.splice(Math.max(0, Math.min(at, this.saved.length)), 0, entry);
    this.changed.add(entry.id);
    this.#write();
    return true;
  }

  /**
   * Merges saved searches from elsewhere (an import), [{ name, query }]:
   * a new name is added while there is room, a known name with another
   * query is updated, and the rest (the same query, malformed, no room)
   * are skipped. One write. Returns { added, updated, skipped }.
   */
  mergeSaved(list) {
    const counts = { added: 0, updated: 0, skipped: 0 };
    for (const s of Array.isArray(list) ? list : []) {
      const name = typeof s?.name === 'string' ? s.name.trim().slice(0, NAME_MAX) : '';
      const query = typeof s?.query === 'string' ? s.query.trim() : '';
      if (!name || !query || query.length > QUERY_MAX) {
        counts.skipped++;
        continue;
      }
      const twin = this.find(name);
      if (twin) {
        if (twin.query === query) counts.skipped++;
        else {
          Object.assign(twin, { query, at: this.now() });
          this.changed.add(twin.id);
          counts.updated++;
        }
      } else if (this.saved.length < SAVED_MAX) {
        const entry = { id: this.#id(), name, query, at: num(s.at) ? s.at : this.now() };
        this.saved.push(entry);
        this.changed.add(entry.id);
        counts.added++;
      } else counts.skipped++;
    }
    if (counts.added || counts.updated) this.#write();
    return counts;
  }
}
