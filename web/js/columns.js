/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Column Tree (Terrane Edition - v1.0)
 *     - File Name: columns.js
 *     - Relative Path: web/js/columns.js
 *     - Artifact Type: javascript
 *     - Version: 1.0.0
 *     - Date: 11/14/2026
 *     - Update: Saturday, November 14, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Changelog:
 *     - 1.0.0 (11/14/2026) [dendogg + Anthropic - Claude Opus 5.5] —
 *       Initial release: the tree in typed columns, regions, the region
 *       protocol's answers and the shared refresh. The record D's indices
 *       are model.js's, re-exported here, so the page reads D by them.
 *
 * ✒ Description:
 *     The directory tree held in typed columns instead of one object per
 *     entry, so a service can keep millions of entries and answer for one
 *     folder at a time: its children, with every figure the page's model,
 *     layout, lenses and inspector read. The service, the demo service and
 *     the Node checks all answer the region routes through this module.
 *
 * ✒ Key Features:
 *     - Folder columns (parent, name, mtime, error, child and file ranges)
 *       and file columns (name, size, mtime, flags, kind, folder), each a
 *       typed array whose capacity doubles, names as plain strings
 *     - Figures equal to model.js node for node: size, files, folders,
 *       height, newest change, kinds and direct children; ingest semantics
 *       on a build, recompute semantics along a chain a change touched
 *     - Every folder's row of bytes and files by last change, as
 *       timeline.js builds it, with the median step, from one fixed anchor
 *     - Regions: a folder's children in scan order (files, then folders),
 *       all of them up to REGION_MAX, else the largest by size (ties by
 *       scan order) plus any named, and the rest's count and bytes as a
 *       tail; the held set is cached per folder until it changes
 *     - Batches of regions under an entry and byte cap, and the chain of
 *       regions from the root to any path, a file in a tail included
 *     - Mutations: a folder listed again (replace), a new folder filled
 *       (graft) and a folder removed, with figures and age rows kept exact
 *     - records(): the tree as scanner batches, breadth first, fresh ids
 *     - answer(): the pure logic of GET /api/tree and GET /api/region,
 *       errors carrying code, status and a sentence; refreshFrom() reads
 *       folders again through injected readers
 *     - No DOM: the page, the demo, the service and Node import it alike
 *
 * ✒ Usage Instructions:
 *     import { ColumnTree, treeFrom, answer, refreshFrom } from './columns.js';
 *     const tree = new ColumnTree({ name: 'projects' });
 *     for await (const batch of scan(root)) tree.add(batch);
 *     tree.finish({ anchor: Date.now() });
 *     tree.region(tree.idOf('docs'));          // { id, self, n, d, f, tail }
 *     await answer(tree, 'region', { v: '1', ids: '0,3' }, { v: 1 });
 *     A record D is an array of D_LEN values; read it with the D_ indices:
 *     [id, name, mtime, err, s, fc, dc, h, mm, cn, k0..k8, b0..b20,
 *      f0..f20, md]. b and f are "changed after T[k]" for the 20 ladder
 *     steps, then the total; md is the median step, -1 with no files.
 *
 * ✒ Examples:
 *     treeFrom(batches, { name: 'Studio', anchor })
 *     tree.pathRegions('Photos/2019/IMG_0001.jpg', 1)   // skip the root
 *     tree.regionsFor([4, 9], { with: new Map([[4, ['a.txt']]]) })
 *     tree.replace(id, depth1Records)   // { added, removed, changed }
 *     tree.graft(stubId, deepRecords)
 *     for (const batch of tree.records()) writer.push(batch);
 *     await refreshFrom(tree, 'docs', readDepth1, readDeep)
 *
 * ✒ Other Important Information:
 *     - Dependencies: model.js (kindOf, the record D's indices),
 *       timeline.js (LADDER_DAYS, STEPS, DAY)
 *     - Compatible platforms: any browser with ES2022 modules; Node.js
 *       22.5+
 *     - Performance: about 103 bytes an entry with names, plus 253 bytes
 *       a folder of age rows and 72 of kinds; a 20,000-file folder's
 *       region in a few milliseconds
 *     - Limitations: space a change frees is not reused within a tree's
 *       life; a tree built again compacts it. Ids are internal and change
 *       with every build
 * ----------------------------------------------------------------------------
 */

import {
  kindOf, D_ID, D_NAME, D_MTIME, D_ERR, D_S, D_FC, D_DC, D_H, D_MM, D_CN, D_KS, D_AB, D_AF, D_MD, D_LEN,
} from './model.js';
import { LADDER_DAYS, STEPS, DAY } from './timeline.js';

// The record D's layout is model.js's, which the page's model reads it by.
export { D_ID, D_NAME, D_MTIME, D_ERR, D_S, D_FC, D_DC, D_H, D_MM, D_CN, D_KS, D_AB, D_AF, D_MD, D_LEN };

/** Above this many entries (folders and files, the root counted) the page draws in regions. */
export const REGION_THRESHOLD = 400000;
/** The most children a region holds of one folder: the layout's own per-folder limit. */
export const REGION_MAX = 5000;
/** Caps of one region request, and of what one answer carries. */
export const REGION_IDS_MAX = 64;
export const REGION_WITH_MAX = 100;
export const REGION_FRESH_MAX = 50;
export const REGION_ENTRIES_MAX = 40000;
export const REGION_BYTES_MAX = 4 * 1024 * 1024;

/** Width of an age row: the ladder's steps, then the total. */
const W = STEPS + 1;
const KINDS = 9;
const REMOVED = -2;
const STUB = 'STUB';
/** A folder with more children than this finds one by name through a Map. */
const NAME_MAP_AT = 64;
const HELD_CACHE = 256;

/** An error the routes answer with: code, HTTP status and a sentence. */
function failure(code, status, message, extra = {}) {
  const e = new Error(message);
  e.code = code;
  e.status = status;
  Object.assign(e, extra);
  return e;
}

/** An array of the same type and at least `need` slots, twice as large as before when it grows. */
function grown(arr, need) {
  if (need <= arr.length) return arr;
  let cap = Math.max(arr.length * 2, 1024);
  while (cap < need) cap *= 2;
  const out = new arr.constructor(cap);
  out.set(arr);
  return out;
}

/** Index of the first ladder time a modification time is later than, or STEPS: timeline.js's own rule. */
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

/** The ladder's dates looking back from anchor. */
const ladder = (anchor) => Float64Array.from(LADDER_DAYS, (d) => anchor - d * DAY);

/** A root-relative path's segments, refused as the service's guard refuses them; the default when none is given. */
function defaultParts(rel) {
  if (typeof rel !== 'string') throw failure('EPATH', 400, 'Path must be a string.');
  if (rel.includes('\0')) throw failure('EPATH', 400, 'Path contains a null byte.');
  const parts = rel.split('/').filter((p) => p !== '');
  for (const p of parts) {
    if (p === '.' || p === '..') throw failure('EPATH', 400, 'Relative segments are not allowed.');
    if (p.toLowerCase() === '.terrane-trash') throw failure('EPATH', 403, 'The holding area is reached through the Journal, not by path.');
  }
  return parts;
}

export class ColumnTree {
  /** expect: { folders, files } sizes the columns once when the counts are known. */
  constructor({ name = '', expect = null } = {}) {
    const nf = Math.max(1024, (expect?.folders | 0) + 1);
    const nn = Math.max(1024, (expect?.files | 0) + 1);
    this.rootName = name;
    this.anchor = null;
    this.T = null;
    this.F = 0;
    this.N = 0;
    this.K = 0;
    // Folder columns.
    this.parent = new Int32Array(nf);
    this.name = [];
    this.mtime = new Float64Array(nf);
    this.err = new Uint8Array(nf);
    this.kid0 = new Uint32Array(nf);
    this.kidN = new Uint32Array(nf);
    this.file0 = new Uint32Array(nf);
    this.fileN = new Uint32Array(nf);
    this.kids = new Int32Array(nf);
    // Figures.
    this.s = new Float64Array(nf);
    this.fc = new Float64Array(nf);
    this.mm = new Float64Array(nf);
    this.dc = new Uint32Array(nf);
    this.cn = new Uint32Array(nf);
    this.h = new Uint16Array(nf);
    this.ks = new Float64Array(nf * KINDS);
    // Age rows.
    this.ab = new Float64Array(nf * W);
    this.af = new Uint32Array(nf * W);
    this.md = new Int8Array(nf);
    // File columns.
    this.fname = [];
    this.fsize = new Float64Array(nn);
    this.fmtime = new Float64Array(nn);
    this.fflags = new Uint8Array(nn);
    this.fkind = new Uint8Array(nn);
    this.fdir = new Int32Array(nn);
    // Error codes by index; 0 is no error.
    this.codes = [0];
    this.codeIndex = new Map();
    // Source ids of add() to internal ids.
    this.src = new Int32Array(nf).fill(-1);
    this.srcMap = null;
    this.names = new Map();
    this.held = new Map();
    this.finished = false;
  }

  /* ---------- counts ---------- */

  get folders() {
    return this.F ? this.dc[0] + 1 : 0;
  }

  get files() {
    return this.F ? this.fc[0] : 0;
  }

  get entries() {
    return this.folders + this.files;
  }

  get bytes() {
    return this.F ? this.s[0] : 0;
  }

  /* ---------- building ---------- */

  #code(err) {
    if (!err) return 0;
    let i = this.codeIndex.get(err);
    if (i === undefined) {
      if (this.codes.length > 255) return this.#code('EIO');
      i = this.codes.length;
      this.codes.push(String(err));
      this.codeIndex.set(err, i);
    }
    return i;
  }

  #fit(need) {
    if (need <= this.parent.length) return;
    let cap = this.parent.length * 2;
    while (cap < need) cap *= 2;
    for (const k of ['parent', 'mtime', 'err', 'kid0', 'kidN', 'file0', 'fileN', 's', 'fc', 'mm', 'dc', 'cn', 'h', 'md']) this[k] = grown(this[k], cap);
    this.ks = grown(this.ks, cap * KINDS);
    this.ab = grown(this.ab, cap * W);
    this.af = grown(this.af, cap * W);
  }

  #fitFiles(need) {
    if (need <= this.fsize.length) return;
    for (const k of ['fsize', 'fmtime', 'fflags', 'fkind', 'fdir']) this[k] = grown(this[k], need);
  }

  #srcGet(sid) {
    if (this.srcMap) return this.srcMap.get(sid) ?? -1;
    return Number.isInteger(sid) && sid >= 0 && sid < this.src.length ? this.src[sid] : -1;
  }

  #srcSet(sid, id) {
    if (!this.srcMap && Number.isInteger(sid) && sid >= 0 && sid < 0x7fffffff) {
      if (sid >= this.src.length) {
        const old = this.src.length;
        this.src = grown(this.src, sid + 1);
        this.src.fill(-1, old);
      }
      this.src[sid] = id;
      return;
    }
    if (!this.srcMap) {
      // An id that is not a small whole number: every mapping moves to a Map.
      this.srcMap = new Map();
      for (let i = 0; i < this.src.length; i++) if (this.src[i] >= 0) this.srcMap.set(i, this.src[i]);
    }
    this.srcMap.set(sid, id);
  }

  /** A new folder slot under p (-1 for the root), every figure zero. */
  #newFolder(p, name, mtime, err) {
    const id = this.F++;
    this.#fit(this.F);
    this.parent[id] = p;
    this.name[id] = name;
    this.mtime[id] = mtime || 0;
    this.err[id] = this.#code(err);
    this.kid0[id] = 0;
    this.kidN[id] = 0;
    this.file0[id] = this.N;
    this.fileN[id] = 0;
    this.s[id] = 0;
    this.fc[id] = 0;
    this.mm[id] = 0;
    this.dc[id] = 0;
    this.cn[id] = 0;
    this.h[id] = 0;
    this.md[id] = -1;
    this.ks.fill(0, id * KINDS, id * KINDS + KINDS);
    this.ab.fill(0, id * W, id * W + W);
    this.af.fill(0, id * W, id * W + W);
    return id;
  }

  /** Writes packed files (name, size, mtime, flags, ...) at `at` for folder id. */
  #writeFiles(id, packed, at) {
    const n = packed.length / 4;
    this.#fitFiles(at + n);
    for (let i = 0, j = at; i < packed.length; i += 4, j++) {
      const name = packed[i];
      this.fname[j] = name;
      this.fsize[j] = packed[i + 1];
      this.fmtime[j] = packed[i + 2];
      this.fflags[j] = packed[i + 3];
      this.fkind[j] = kindOf(name);
      this.fdir[j] = id;
    }
    this.file0[id] = at;
    this.fileN[id] = n;
    if (at + n > this.N) this.N = at + n;
  }

  /** Appends child folder c to p's list; a list that is not at the end of kids moves there first. */
  #appendKid(p, c) {
    const n = this.kidN[p];
    if (n === 0) {
      this.kids = grown(this.kids, this.K + 1);
      this.kid0[p] = this.K;
      this.kids[this.K++] = c;
    } else if (this.kid0[p] + n === this.K) {
      this.kids = grown(this.kids, this.K + 1);
      this.kids[this.K++] = c;
    } else {
      this.kids = grown(this.kids, this.K + n + 1);
      this.kids.copyWithin(this.K, this.kid0[p], this.kid0[p] + n);
      this.kid0[p] = this.K;
      this.K += n;
      this.kids[this.K++] = c;
    }
    this.kidN[p] = n + 1;
    this.names.delete(p);
  }

  /** Replaces p's child list with list, in place when it fits. */
  #setKids(p, list) {
    if (list.length > this.kidN[p]) {
      this.kids = grown(this.kids, this.K + list.length);
      this.kid0[p] = this.K;
      this.K += list.length;
    }
    for (let i = 0; i < list.length; i++) this.kids[this.kid0[p] + i] = list[i];
    this.kidN[p] = list.length;
    this.names.delete(p);
  }

  /**
   * Takes a batch of scanner records, [id, pid, name, mtime, err, files],
   * parents before children. A record whose parent is unknown is skipped,
   * as Model.ingest skips it; a second root is ignored.
   */
  add(batch) {
    for (const rec of batch) {
      const [sid, spid, name, mtime, err, files] = rec;
      let p = -1;
      if (spid === -1) {
        if (this.F) continue;
      } else {
        p = this.#srcGet(spid);
        if (p < 0) continue;
      }
      const id = this.#newFolder(p, p < 0 && this.rootName ? this.rootName : name, mtime, err);
      this.#srcSet(sid, id);
      if (files?.length) this.#writeFiles(id, files, this.N);
      if (p >= 0) this.#appendKid(p, id);
    }
  }

  /**
   * Works out every folder's figures in reverse arrival order, so each
   * child is counted into its parent before the parent into its own, then
   * every age row from `anchor`. Ingest semantics: a folder's own mtime
   * enters its newest change only when it holds files.
   */
  finish({ anchor = Date.now() } = {}) {
    this.src = new Int32Array(0);
    this.srcMap = null;
    this.anchor = anchor;
    this.T = ladder(anchor);
    const { parent, s, fc, mm, dc, cn, h, ks, ab, af } = this;
    for (let id = 0; id < this.F; id++) {
      if (parent[id] === REMOVED) continue;
      s[id] = 0;
      fc[id] = 0;
      mm[id] = 0;
      dc[id] = 0;
      h[id] = 0;
    }
    ks.fill(0, 0, this.F * KINDS);
    ab.fill(0, 0, this.F * W);
    af.fill(0, 0, this.F * W);
    for (let id = this.F - 1; id >= 0; id--) {
      const p = parent[id];
      if (p === REMOVED) continue;
      this.#ownInto(id, true);
      cn[id] = this.kidN[id] + this.fileN[id];
      if (p >= 0) this.#addInto(p, id, true);
    }
    for (let id = 0; id < this.F; id++) if (parent[id] !== REMOVED) this.#cumulate(id);
    this.finished = true;
    return this;
  }

  /**
   * Adds folder id's own files into its figures and its raw age bins.
   * ingest: its mtime counts toward mm only when it holds files.
   */
  #ownInto(id, ingest) {
    const n = this.fileN[id];
    const f0 = this.file0[id];
    const ko = id * KINDS;
    const ao = id * W;
    let bytes = 0;
    let newest = ingest ? (n ? this.mtime[id] : 0) : this.mtime[id];
    for (let j = f0; j < f0 + n; j++) {
      const size = this.fsize[j];
      const m = this.fmtime[j];
      bytes += size;
      this.ks[ko + this.fkind[j]] += size;
      if (m > newest) newest = m;
      const k = firstStep(this.T, m);
      this.ab[ao + k] += size || 0;
      this.af[ao + k]++;
    }
    this.s[id] += bytes;
    this.fc[id] += n;
    if (newest > this.mm[id]) this.mm[id] = newest;
  }

  /** Adds child c's totals (raw bins when raw) into p. */
  #addInto(p, c, raw) {
    this.s[p] += this.s[c];
    this.fc[p] += this.fc[c];
    this.dc[p] += this.dc[c] + 1;
    if (this.h[c] + 1 > this.h[p]) this.h[p] = this.h[c] + 1;
    if (this.mm[c] > this.mm[p]) this.mm[p] = this.mm[c];
    const po = p * KINDS;
    const co = c * KINDS;
    for (let k = 0; k < KINDS; k++) this.ks[po + k] += this.ks[co + k];
    if (raw) {
      const pa = p * W;
      const ca = c * W;
      for (let k = 0; k < W; k++) {
        this.ab[pa + k] += this.ab[ca + k];
        this.af[pa + k] += this.af[ca + k];
      }
    }
  }

  /** Turns id's raw bins into "changed after T[k]" and finds its median step, as buildAgeTable does. */
  #cumulate(id) {
    const o = id * W;
    for (let k = 1; k < W; k++) {
      this.ab[o + k] += this.ab[o + k - 1];
      this.af[o + k] += this.af[o + k - 1];
    }
    this.#median(id);
  }

  #median(id) {
    const o = id * W;
    const tf = this.af[o + STEPS];
    if (!tf) {
      this.md[id] = -1;
      return;
    }
    const tb = this.ab[o + STEPS];
    const row = tb > 0 ? this.ab : this.af;
    const need = (tb > 0 ? tb : tf) * 0.5;
    let k = 0;
    while (k < STEPS - 1 && row[o + k] < need) k++;
    this.md[id] = k;
  }

  /**
   * Recomputes one folder from its own files and its children, as
   * Model.recompute does (its own mtime always counts toward mm), and
   * its age row and median from theirs.
   */
  #recomputeOne(id) {
    this.s[id] = 0;
    this.fc[id] = 0;
    this.mm[id] = 0;
    this.dc[id] = 0;
    this.h[id] = 0;
    this.ks.fill(0, id * KINDS, id * KINDS + KINDS);
    this.ab.fill(0, id * W, id * W + W);
    this.af.fill(0, id * W, id * W + W);
    this.#ownInto(id, false);
    const o = id * W;
    for (let k = 1; k < W; k++) {
      this.ab[o + k] += this.ab[o + k - 1];
      this.af[o + k] += this.af[o + k - 1];
    }
    const k0 = this.kid0[id];
    for (let i = 0; i < this.kidN[id]; i++) {
      const c = this.kids[k0 + i];
      this.#addInto(id, c, false);
      const ca = c * W;
      for (let k = 0; k < W; k++) {
        this.ab[o + k] += this.ab[ca + k];
        this.af[o + k] += this.af[ca + k];
      }
    }
    this.cn[id] = this.kidN[id] + this.fileN[id];
    this.#median(id);
  }

  /** Recomputes id and every ancestor, and forgets what was cached for them. */
  #recomputeChain(id) {
    for (let a = id; a >= 0; a = this.parent[a]) {
      this.#recomputeOne(a);
      this.held.delete(a);
    }
  }

  /** Marks id and everything under it removed; returns the entries removed. */
  #drop(id) {
    let gone = 0;
    const stack = [id];
    while (stack.length) {
      const x = stack.pop();
      const k0 = this.kid0[x];
      for (let i = 0; i < this.kidN[x]; i++) stack.push(this.kids[k0 + i]);
      const f0 = this.file0[x];
      for (let j = f0; j < f0 + this.fileN[x]; j++) this.fdir[j] = -1;
      gone += 1 + this.fileN[x];
      this.parent[x] = REMOVED;
      this.names.delete(x);
      this.held.delete(x);
    }
    return gone;
  }

  #live(id) {
    if (!Number.isInteger(id) || id < 0 || id >= this.F || this.parent[id] === REMOVED) {
      throw failure('EBADREQ', 400, `There is no folder ${id} in this tree.`);
    }
    return id;
  }

  /* ---------- mutations ---------- */

  /**
   * Lists folder id again from depth-1 records (its own record, then a
   * STUB record per child folder). Files and child folders are matched
   * by name; a new child folder is added as a stub, to be filled by
   * graft(); one that is gone is removed with everything under it. The
   * folder and every ancestor are recomputed as Model.reconcile and
   * Model.recompute leave them. Returns { added: [{ id, rel }], removed,
   * changed, addedFiles }: stubs, entries gone, files whose size or date
   * changed, files new.
   */
  replace(id, records) {
    this.#live(id);
    const top = records.find((r) => r[1] === -1);
    if (!top) throw failure('EBADREQ', 400, 'A folder read again needs its own record.');
    const [topSid, , , mtime, err, packed] = top;
    this.mtime[id] = mtime || 0;
    this.err[id] = this.#code(err === STUB ? 0 : err);
    // Files: compared by name for what changed, then written in place
    // when they fit, else at the end; the slots they leave are dead.
    const before = new Map();
    const f0 = this.file0[id];
    const n0 = this.fileN[id];
    for (let j = f0; j < f0 + n0; j++) before.set(this.fname[j], j);
    let changed = 0;
    let addedFiles = 0;
    const files = packed || [];
    for (let i = 0; i < files.length; i += 4) {
      const j = before.get(files[i]);
      if (j === undefined) addedFiles++;
      else {
        if (this.fsize[j] !== files[i + 1] || this.fmtime[j] !== files[i + 2]) changed++;
        before.delete(files[i]);
      }
    }
    let removed = before.size;
    const n = files.length / 4;
    const at = n <= n0 ? f0 : this.N;
    for (let j = f0; j < f0 + n0; j++) this.fdir[j] = -1;
    this.#writeFiles(id, files, at);
    // Child folders, in the order listed.
    const had = new Map();
    const k0 = this.kid0[id];
    for (let i = 0; i < this.kidN[id]; i++) had.set(this.name[this.kids[k0 + i]], this.kids[k0 + i]);
    const list = [];
    const added = [];
    for (const rec of records) {
      if (rec === top || rec[1] !== topSid) continue;
      const kept = had.get(rec[2]);
      if (kept !== undefined) {
        had.delete(rec[2]);
        list.push(kept);
      } else {
        const stub = this.#newFolder(id, rec[2], rec[3], STUB);
        list.push(stub);
        added.push({ id: stub, rel: this.relOf(stub) });
      }
    }
    for (const gone of had.values()) removed += this.#drop(gone);
    this.#setKids(id, list);
    this.#recomputeChain(id);
    return { added, removed, changed, addedFiles };
  }

  /**
   * Fills stub id from a deep read of it: its own record, then its
   * subtree, parents first. The subtree's figures are worked out as a
   * build works them out, and every ancestor takes the difference: sizes,
   * counts, kinds and age rows added, height and newest change raised, as
   * Model.ingest raises them.
   */
  graft(id, records) {
    this.#live(id);
    if (this.codes[this.err[id]] !== STUB || this.kidN[id] || this.fileN[id]) {
      throw failure('EBADREQ', 400, 'Only a folder listed but not yet read can be filled.');
    }
    const top = records.find((r) => r[1] === -1);
    if (!top) throw failure('EBADREQ', 400, 'A folder filled needs its own record.');
    const local = new Map([[top[0], id]]);
    this.mtime[id] = top[3] || 0;
    this.err[id] = this.#code(top[4] === STUB ? 0 : top[4]);
    if (top[5]?.length) this.#writeFiles(id, top[5], this.N);
    const made = [];
    for (const rec of records) {
      if (rec === top) continue;
      const p = local.get(rec[1]);
      if (p === undefined) continue;
      const c = this.#newFolder(p, rec[2], rec[3], rec[4]);
      local.set(rec[0], c);
      if (rec[5]?.length) this.#writeFiles(c, rec[5], this.N);
      this.#appendKid(p, c);
      made.push(c);
    }
    // The subtree, children before parents, raw bins first.
    this.ab.fill(0, id * W, id * W + W);
    this.af.fill(0, id * W, id * W + W);
    for (let i = made.length - 1; i >= -1; i--) {
      const x = i < 0 ? id : made[i];
      this.#ownInto(x, true);
      this.cn[x] = this.kidN[x] + this.fileN[x];
      if (x !== id) this.#addInto(this.parent[x], x, true);
    }
    for (const x of [id, ...made]) this.#cumulate(x);
    // The ancestors take the difference; the stub itself was counted already.
    const o = id * W;
    let lvl = 1;
    for (let a = this.parent[id]; a >= 0; a = this.parent[a], lvl++) {
      this.s[a] += this.s[id];
      this.fc[a] += this.fc[id];
      this.dc[a] += this.dc[id];
      if (this.h[id] + lvl > this.h[a]) this.h[a] = this.h[id] + lvl;
      if (this.mm[id] > this.mm[a]) this.mm[a] = this.mm[id];
      for (let k = 0; k < KINDS; k++) this.ks[a * KINDS + k] += this.ks[id * KINDS + k];
      const ao = a * W;
      for (let k = 0; k < W; k++) {
        this.ab[ao + k] += this.ab[o + k];
        this.af[ao + k] += this.af[o + k];
      }
      this.#median(a);
      this.held.delete(a);
    }
    this.held.delete(id);
    return { folders: made.length + 1, files: this.fc[id] };
  }

  /** Removes folder id and everything under it; its parent and every ancestor are recomputed. */
  remove(id) {
    this.#live(id);
    if (id === 0) throw failure('EBADREQ', 400, 'The root cannot be removed.');
    const p = this.parent[id];
    const k0 = this.kid0[p];
    const list = [];
    for (let i = 0; i < this.kidN[p]; i++) if (this.kids[k0 + i] !== id) list.push(this.kids[k0 + i]);
    this.#setKids(p, list);
    const removed = this.#drop(id);
    this.#recomputeChain(p);
    return { removed };
  }

  /* ---------- reading ---------- */

  /** True when id names a folder of this tree that was not removed. */
  has(id) {
    return Number.isInteger(id) && id >= 0 && id < this.F && this.parent[id] !== REMOVED;
  }

  parentOf(id) {
    return this.parent[this.#live(id)];
  }

  /** id's child folder called name, or -1. */
  kidByName(id, name) {
    const n = this.kidN[id];
    const k0 = this.kid0[id];
    if (n > NAME_MAP_AT) {
      let map = this.names.get(id);
      if (!map) {
        map = new Map();
        for (let i = 0; i < n; i++) map.set(this.name[this.kids[k0 + i]], this.kids[k0 + i]);
        this.names.set(id, map);
      }
      return map.get(name) ?? -1;
    }
    for (let i = 0; i < n; i++) if (this.name[this.kids[k0 + i]] === name) return this.kids[k0 + i];
    return -1;
  }

  /** The file slot of id's file called name, or -1. */
  fileByName(id, name) {
    const f0 = this.file0[id];
    for (let j = f0; j < f0 + this.fileN[id]; j++) if (this.fname[j] === name) return j;
    return -1;
  }

  /** The folder at a root-relative path, or -1. */
  idOf(rel) {
    if (!this.F) return -1;
    let cur = 0;
    for (const part of String(rel).split('/')) {
      if (!part) continue;
      cur = this.kidByName(cur, part);
      if (cur < 0) return -1;
    }
    return cur;
  }

  /** The deepest folder of the tree on a root-relative path. */
  nearest(rel) {
    let cur = 0;
    for (const part of String(rel).split('/')) {
      if (!part) continue;
      const k = this.kidByName(cur, part);
      if (k < 0) break;
      cur = k;
    }
    return cur;
  }

  /** The folders from the root down to id. */
  chainOf(id) {
    this.#live(id);
    const out = [];
    for (let a = id; a >= 0; a = this.parent[a]) out.push(a);
    return out.reverse();
  }

  relOf(id) {
    return this.chainOf(id).slice(1).map((a) => this.name[a]).join('/');
  }

  /** Folder id as a record D: D_LEN values, read with the D_ indices. */
  encodeD(id) {
    const out = new Array(D_LEN);
    out[D_ID] = id;
    out[D_NAME] = this.name[id];
    out[D_MTIME] = this.mtime[id];
    const code = this.codes[this.err[id]];
    out[D_ERR] = code === STUB ? 0 : code;
    out[D_S] = this.s[id];
    out[D_FC] = this.fc[id];
    out[D_DC] = this.dc[id];
    out[D_H] = this.h[id];
    out[D_MM] = this.mm[id];
    out[D_CN] = this.cn[id];
    for (let k = 0; k < KINDS; k++) out[D_KS + k] = this.ks[id * KINDS + k];
    for (let k = 0; k < W; k++) {
      out[D_AB + k] = this.ab[id * W + k];
      out[D_AF + k] = this.af[id * W + k];
    }
    out[D_MD] = this.md[id];
    return out;
  }

  /**
   * Which of id's children a region holds when it has more than max: a
   * mask over its children in scan order (files, then folders), set for
   * the max largest by size, ties to the earlier. A min-heap of size max
   * keeps them; the mask is cached until the folder or its subtree changes.
   */
  #heldOf(id, max) {
    const hit = this.held.get(id);
    if (hit && hit.max === max) return hit.mask;
    const nf = this.fileN[id];
    const f0 = this.file0[id];
    const k0 = this.kid0[id];
    const cn = nf + this.kidN[id];
    const sizeOf = (i) => (i < nf ? this.fsize[f0 + i] : this.s[this.kids[k0 + i - nf]]);
    // worse(a, b): a is the smaller, or as large and later in scan order.
    const heap = new Int32Array(max);
    const hs = new Float64Array(max);
    let n = 0;
    const worse = (i, j) => hs[i] < hs[j] || (hs[i] === hs[j] && heap[i] > heap[j]);
    const swap = (i, j) => {
      const a = heap[i];
      heap[i] = heap[j];
      heap[j] = a;
      const b = hs[i];
      hs[i] = hs[j];
      hs[j] = b;
    };
    const down = (i) => {
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < n && worse(l, m)) m = l;
        if (r < n && worse(r, m)) m = r;
        if (m === i) return;
        swap(i, m);
        i = m;
      }
    };
    for (let i = 0; i < cn; i++) {
      const sz = sizeOf(i);
      if (n < max) {
        heap[n] = i;
        hs[n] = sz;
        for (let c = n++; c > 0;) {
          const p = (c - 1) >> 1;
          if (!worse(c, p)) break;
          swap(c, p);
          c = p;
        }
      } else if (sz > hs[0] || (sz === hs[0] && i < heap[0])) {
        heap[0] = i;
        hs[0] = sz;
        down(0);
      }
    }
    const mask = new Uint8Array(cn);
    for (let i = 0; i < n; i++) mask[heap[i]] = 1;
    if (this.held.size >= HELD_CACHE) this.held.delete(this.held.keys().next().value);
    this.held.set(id, { max, mask });
    return mask;
  }

  /**
   * Folder id's region: { id, self: D, n, d: [D...], f: [name, size,
   * mtime, flags, ...], tail: [count, bytes] | null }. Every child when
   * it has max or fewer, else the max largest plus any named in `with`;
   * children in scan order, files then folders, never sorted again.
   */
  region(id, { with: names = null, max = REGION_MAX } = {}) {
    this.#live(id);
    const nf = this.fileN[id];
    const nk = this.kidN[id];
    const f0 = this.file0[id];
    const k0 = this.kid0[id];
    let mask = null;
    if (nf + nk > max) {
      mask = this.#heldOf(id, max);
      const wanted = names ? [...names] : [];
      if (wanted.length) {
        mask = mask.slice();
        for (const nm of wanted) {
          const k = this.kidByName(id, nm);
          if (k >= 0) {
            for (let i = 0; i < nk; i++) if (this.kids[k0 + i] === k) mask[nf + i] = 1;
          } else {
            const j = this.fileByName(id, nm);
            if (j >= 0) mask[j - f0] = 1;
          }
        }
      }
    }
    const f = [];
    const d = [];
    let tailN = 0;
    let tailB = 0;
    for (let i = 0; i < nf; i++) {
      const j = f0 + i;
      if (!mask || mask[i]) f.push(this.fname[j], this.fsize[j], this.fmtime[j], this.fflags[j]);
      else {
        tailN++;
        tailB += this.fsize[j];
      }
    }
    for (let i = 0; i < nk; i++) {
      const c = this.kids[k0 + i];
      if (!mask || mask[nf + i]) d.push(this.encodeD(c));
      else {
        tailN++;
        tailB += this.s[c];
      }
    }
    return { id, self: this.encodeD(id), n: nf + nk, d, f, tail: tailN ? [tailN, tailB] : null };
  }

  /**
   * Regions of several folders, in the order asked, until the next would
   * pass maxEntries held entries or about maxBytes of JSON; the rest are
   * listed in more. The first is always sent. with maps an id to names.
   */
  regionsFor(ids, { with: withMap = null, maxEntries = REGION_ENTRIES_MAX, maxBytes = REGION_BYTES_MAX } = {}) {
    for (const id of ids) this.#live(id);
    const regions = [];
    const more = [];
    let entries = 0;
    let bytes = 0;
    for (const id of ids) {
      if (more.length) {
        more.push(id);
        continue;
      }
      const r = this.region(id, { with: withMap?.get(id) || null });
      const e = 1 + r.d.length + r.f.length / 4;
      let b = 700 + r.self[D_NAME].length;
      for (const x of r.d) b += 700 + x[D_NAME].length;
      for (let i = 0; i < r.f.length; i += 4) b += 48 + r.f[i].length;
      if (regions.length && (entries + e > maxEntries || bytes + b > maxBytes)) {
        more.push(id);
        continue;
      }
      regions.push(r);
      entries += e;
      bytes += b;
    }
    return { regions, more };
  }

  /**
   * The chain of regions from the root to the folder at rel, or to the
   * folder holding the file at rel; each holds the next link, and the
   * last the named file, wherever they rank. The first skip folders are
   * left out. A path not in the tree is ENOENT, naming the deepest folder
   * found.
   */
  pathRegions(rel, skip = 0) {
    const parts = String(rel).split('/').filter(Boolean);
    const chain = [0];
    let cur = 0;
    let file = null;
    for (let i = 0; i < parts.length; i++) {
      const k = this.kidByName(cur, parts[i]);
      if (k >= 0) {
        cur = k;
        chain.push(k);
      } else if (i === parts.length - 1 && this.fileByName(cur, parts[i]) >= 0) file = parts[i];
      else {
        const deepest = this.relOf(cur);
        throw failure('ENOENT', 404, `"${parts[i]}" is not in the tree; the deepest folder found is ${deepest ? `"${deepest}"` : 'the root'}.`, { deepest });
      }
    }
    const regions = [];
    for (let j = Math.max(0, skip | 0); j < chain.length; j++) {
      const next = j + 1 < chain.length ? this.name[chain[j + 1]] : file;
      regions.push(this.region(chain[j], { with: next === null ? null : [next] }));
    }
    const target = file === null ? { id: cur, name: this.name[cur], dir: true } : { id: cur, name: file, dir: false };
    return { regions, target, chain };
  }

  /**
   * The tree as scanner batches of at most `size` records, breadth first,
   * with fresh ids: the stream a scan of it would give, so the warm cache
   * is written from it and a tree built from it is this one again.
   */
  * records(size = 200) {
    if (!this.F) return;
    const q = [0];
    const up = [-1];
    let out = [];
    for (let i = 0; i < q.length; i++) {
      const x = q[i];
      const files = [];
      const f0 = this.file0[x];
      for (let j = f0; j < f0 + this.fileN[x]; j++) files.push(this.fname[j], this.fsize[j], this.fmtime[j], this.fflags[j]);
      out.push([i, up[i], this.name[x], this.mtime[x], this.codes[this.err[x]], files]);
      const k0 = this.kid0[x];
      for (let k = 0; k < this.kidN[x]; k++) {
        q.push(this.kids[k0 + k]);
        up.push(i);
      }
      if (out.length >= size) {
        yield out;
        out = [];
      }
    }
    if (out.length) yield out;
  }
}

/** A finished tree from an iterable of scanner batches. */
export function treeFrom(batches, { name = '', anchor = Date.now(), expect = null } = {}) {
  const tree = new ColumnTree({ name, expect });
  for (const batch of batches) tree.add(batch);
  return tree.finish({ anchor });
}

/**
 * Reads folder rel again and applies it: readDepth1(rel) and readDeep(rel)
 * resolve to scanner records, and reject with code ENOENT for a folder
 * that is gone. A path not in the tree is reported in gone and its
 * nearest folder read instead; a folder gone on disk is reported and its
 * parent read instead, as the page's refresh does. A new child folder is
 * read whole and grafted before anything is answered. Returns { id,
 * regions, up, gone }: the region of the folder read and the records of
 * every ancestor, whose figures changed with it.
 */
export async function refreshFrom(tree, rel, readDepth1, readDeep) {
  const gone = [];
  let id = tree.idOf(rel);
  if (id < 0) {
    gone.push(rel);
    id = tree.nearest(rel);
  }
  for (;;) {
    const at = tree.relOf(id);
    let records;
    try {
      records = await readDepth1(at);
    } catch (err) {
      if (err?.code === 'ENOENT' && id !== 0) {
        if (!gone.includes(at)) gone.push(at);
        id = tree.parentOf(id);
        continue;
      }
      throw err;
    }
    const { added } = tree.replace(id, records);
    for (const a of added) {
      let deep;
      try {
        deep = await readDeep(a.rel);
      } catch (err) {
        if (err?.code !== 'ENOENT') throw err;
        tree.remove(a.id);
        continue;
      }
      tree.graft(a.id, deep);
    }
    return { id, regions: [tree.region(id)], up: tree.chainOf(id).slice(0, -1).map((x) => tree.encodeD(x)), gone };
  }
}

/** get and getAll over URLSearchParams or a plain object. */
function reader(params) {
  if (params && typeof params.get === 'function' && typeof params.getAll === 'function') return params;
  const o = params || {};
  return {
    get: (k) => (o[k] === undefined || o[k] === null ? null : String([o[k]].flat()[0])),
    getAll: (k) => (o[k] === undefined || o[k] === null ? [] : [o[k]].flat().map(String)),
    has: (k) => o[k] !== undefined && o[k] !== null,
  };
}

const NOT_READY = 'The directory\'s tree is still being read; regions follow once it is in.';
const STALE = 'The directory was surveyed again; its regions are read afresh.';

/** What GET /api/tree answers. */
function treeInfo(tree, ctx) {
  return {
    v: ctx.v ?? 1,
    state: ctx.state ?? (tree ? 'ready' : 'none'),
    threshold: ctx.threshold ?? REGION_THRESHOLD,
    entries: tree ? tree.entries : ctx.entries ?? null,
    folders: tree ? tree.folders : null,
    files: tree ? tree.files : null,
    bytes: tree ? tree.bytes : null,
    anchor: tree ? tree.anchor : null,
    root: tree ? tree.encodeD(0) : null,
    progress: ctx.progress ?? null,
    loadMs: ctx.loadMs ?? null,
    warm: ctx.warm ?? null,
    mem: ctx.mem ?? null,
    error: ctx.error ?? null,
  };
}

/** Folder ids from a comma list: decimal, at most REGION_IDS_MAX, each in the tree. */
function idList(text, tree) {
  const raw = String(text).split(',');
  if (raw.length > REGION_IDS_MAX) throw failure('ETOOMANY', 413, `At most ${REGION_IDS_MAX} regions can be asked for at once; ${raw.length} were.`);
  return raw.map((x) => {
    if (!/^\d{1,10}$/.test(x)) throw failure('EBADREQ', 400, 'A region id is a whole number.');
    const id = Number(x);
    if (!tree.has(id)) throw failure('EBADREQ', 400, `There is no folder ${id} in this tree.`);
    return id;
  });
}

/**
 * The route logic of GET /api/tree and GET /api/region, for the service,
 * the demo and the checks. ctx: { threshold, state, v, progress, loadMs,
 * mem, warm, entries, error, relParts (a path's segments, refused as the
 * guard refuses them), readers: { depth1(rel), deep(rel) } for a fresh
 * read, or none to answer fresh from the tree }. Resolves to { status,
 * json }; an error carries code, status and a sentence.
 */
export async function answer(tree, route, params = {}, ctx = {}) {
  const q = reader(params);
  if (route === 'tree') return { status: 200, json: treeInfo(tree, ctx) };
  if (route !== 'region') throw failure('EROUTE', 404, 'No such endpoint.');
  if (!tree) throw failure('ENOTREADY', 503, NOT_READY, { progress: ctx.progress ?? null });
  const vt = q.get('v');
  if (vt === null || !/^\d{1,10}$/.test(vt)) throw failure('EBADREQ', 400, 'A region request names the generation of the tree it reads, v.');
  const v = ctx.v ?? 1;
  if (Number(vt) !== v) throw failure('ESTALE', 409, STALE, { v });
  const parts = ctx.relParts || defaultParts;
  const anchor = tree.anchor;

  if (q.get('fresh') === '1') {
    let rels;
    try {
      rels = JSON.parse(q.get('paths') ?? '');
    } catch {
      rels = null;
    }
    if (!Array.isArray(rels) || !rels.length || !rels.every((r) => typeof r === 'string')) {
      throw failure('EBADREQ', 400, 'A fresh read names its folders as a list of paths.');
    }
    if (rels.length > REGION_FRESH_MAX) throw failure('ETOOMANY', 413, `At most ${REGION_FRESH_MAX} folders can be read again at once; ${rels.length} were.`);
    const clean = rels.map((r) => parts(r).join('/'));
    const gone = [];
    const ids = [];
    for (const rel of clean) {
      let res;
      if (ctx.readers) res = await refreshFrom(tree, rel, ctx.readers.depth1, ctx.readers.deep);
      else {
        // Nothing is read: the tree answers for itself.
        const at = tree.idOf(rel);
        res = { id: at >= 0 ? at : tree.nearest(rel), gone: at >= 0 ? [] : [rel] };
      }
      for (const g of res.gone) if (!gone.includes(g)) gone.push(g);
      if (!ids.includes(res.id)) ids.push(res.id);
    }
    const live = ids.filter((id) => tree.has(id));
    const up = new Map();
    for (const id of live) for (const a of tree.chainOf(id).slice(0, -1)) if (!live.includes(a)) up.set(a, true);
    return {
      status: 200,
      json: { v, anchor: tree.anchor, regions: live.map((id) => tree.region(id)), up: [...up.keys()].map((a) => tree.encodeD(a)), gone },
    };
  }

  if (q.get('ids') !== null) {
    const ids = idList(q.get('ids'), tree);
    const withs = q.getAll('with');
    if (withs.length > REGION_WITH_MAX) throw failure('ETOOMANY', 413, `At most ${REGION_WITH_MAX} names can be asked for at once; ${withs.length} were.`);
    const withMap = new Map();
    for (const w of withs) {
      const m = /^(\d{1,10}):([^]+)$/.exec(w);
      if (!m || m[2].includes('/') || m[2].includes('\0')) throw failure('EBADREQ', 400, 'A name asked for is written <folder id>:<name>.');
      const id = Number(m[1]);
      if (!withMap.has(id)) withMap.set(id, []);
      withMap.get(id).push(m[2]);
    }
    const { regions, more } = tree.regionsFor(ids, { with: withMap });
    return { status: 200, json: { v, anchor, regions, more } };
  }

  if (q.get('path') !== null) {
    const rel = parts(q.get('path')).join('/');
    const st = q.get('skip') ?? '0';
    if (!/^\d{1,4}$/.test(st)) throw failure('EBADREQ', 400, 'skip is a whole number of folders.');
    const { regions, target } = tree.pathRegions(rel, Number(st));
    return { status: 200, json: { v, anchor, regions, target } };
  }

  throw failure('EBADREQ', 400, 'A region request names ids, a path, or fresh=1 with paths.');
}
