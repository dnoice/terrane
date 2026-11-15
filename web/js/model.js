/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Tree Model (Terrane Edition - v1.7)
 *     - File Name: model.js
 *     - Relative Path: web/js/model.js
 *     - Artifact Type: javascript
 *     - Version: 1.7.0
 *     - Date: 11/14/2026
 *     - Update: Saturday, November 14, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Changelog:
 *     - 1.7.0 (11/14/2026) [dendogg + Anthropic - Claude Opus 5.5] —
 *       The kinds in mineral tones: oxidised teal, steel blue, mineral
 *       coral, plum, ochre, bronze, sage, graphite and stone.
 *     - 1.6.0 (11/14/2026) [dendogg + Anthropic - Claude Opus 5.5] —
 *       Region mode: a Model made with { regions: true } holds only the
 *       regions the page asked for, through fillRegion, refillRegion
 *       (children kept by name and kind), dropRegion and setFigures, every
 *       figure the service's. dirFrom makes a folder from a record D, whose
 *       layout (D_ID to D_LEN) is defined here; kids(n) is a folder's count,
 *       the service's when it has one; relPath gives a ref its own path, and
 *       refFrom makes a ref from the service's tuple for the lists. After
 *       the review, refillRegion keeps a child a region with a tail does not
 *       list when keep(child) says so, and names the held folders whose
 *       name now stands for another id (renewed).
 *     - 1.5.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] —
 *       Camera RAW files are images: cr3, nrw, srf, sr2, raf, rw2, orf,
 *       pef, srw, 3fr, erf, kdc, mrw, x3f and iiq join cr2, nef, arw and
 *       dng. Canon's CR3 had counted as Other.
 *     Earlier entries: see CHANGELOG.md
 *
 * ✒ Description:
 *     The in-browser copy of the scanned directory tree. It ingests scan
 *     records as they stream in, keeps every folder's totals current while
 *     the scan is still running, reconciles a single folder after a change
 *     on disk, and answers the questions the interface asks: search, kind
 *     classification, formatting, and the survey of noteworthy conditions.
 *
 * ✒ Key Features:
 *     - Incremental aggregation: size, file count, folder count, per-kind
 *       bytes, newest modification and subtree height roll up the ancestor
 *       chain as each record arrives, so no full-tree pass is ever needed
 *       during a scan
 *     - Reconcile: re-reads one folder, preserves the identity of entries
 *       that still exist (selection survives), and reports which new child
 *       folders need a deep scan
 *     - Adopt: takes on a whole fresh model of the same directory, keeping
 *       the identity of every entry still there, so a tree drawn from the
 *       last session can be brought up to date without losing the
 *       selection, the focus or anything else that holds a node
 *     - Region mode: a partial tree filled region by region from the
 *       service's records (fillRegion, refillRegion keeping nodes,
 *       dropRegion, setFigures); a folder not held yet knows its figures,
 *       its direct count (cn), its age row (g) and its tail
 *     - kids(n), the one answer to "how many entries does this folder
 *       hold", in both modes; the record D's layout for every module
 *     - Nine content kinds derived from the extension, and the one list
 *       of extensions a preview shows as a picture or reads as text
 *     - Search grammar: free text, glob, ext:, kind:, is:, size and age
 *       comparisons, all combinable; ext: and kind: take a comma list of
 *       any of them; double quotes keep spaces in one term or one prefix
 *       value
 *     - Extensible search: callers add is: words and name:value tokens
 *       without changing the grammar here; built-in ones cannot be replaced
 *     - Survey: largest files, heavyweight files, empty folders, unreadable
 *       folders, symbolic links and duplicate candidates grouped by size
 *     - Formatting helpers for bytes, counts, dates and ages
 *
 * ✒ Usage Instructions:
 *     const model = new Model('projects');
 *     model.ingest(records, idMap, model.root);   // streaming scan
 *     const { added } = model.reconcile(dir, records);  // after a change
 *     const { changed, added: here, removed } = model.adopt(freshModel);
 *     const hits = runSearch(model, parseQuery('ext:psd >50mb older:1y'));
 *     const part = new Model('projects', { regions: true });
 *     part.fillRegion(dir, region);                 // regions.js decode()
 *     kids(dir)                                     // its count, held or not
 *     parseQuery('is:benchmark', { is: { benchmark: (n) => marked.has(n) } });
 *     parseQuery('session:2', { prefix: { session: (v) => inWindow(v) } });
 *
 * ✒ Examples:
 *     report            name contains "report"
 *     *.test.js         glob on the name
 *     ext:mp4 >1gb      video files over a gigabyte
 *     kind:image newer:30d
 *     kind:video,audio  either kind            ext:jpg,png  either extension
 *     is:empty          empty folders          is:dup   duplicate candidates
 *     is:hidden         dot-named entries      is:link  symbolic links
 *     is:sealed         folders that could not be read
 *     "two words"       a name containing the two words with their space
 *
 * ✒ Other Important Information:
 *     - Dependencies: none
 *     - Compatible platforms: any browser with ES2022 modules
 *     - Performance: nodes are plain objects with one-letter keys; one
 *       million entries is roughly 150 MB of browser memory
 *     - Limitations: duplicate candidates are grouped by identical size
 *       only until the service verifies them by content hash
 * ----------------------------------------------------------------------------
 */

export const FLAG_LINK = 1;
export const FLAG_HIDDEN = 2;
export const FLAG_SPECIAL = 4;

/**
 * A folder as the region routes send it (record D): an array of D_LEN
 * values, [id, name, mtime, err, s, fc, dc, h, mm, cn, k0..k8, b0..b20,
 * f0..f20, md]. b and f are its age row (timeline.js): bytes and files
 * changed after each ladder step, then the totals; md is the median step.
 * columns.js writes it and re-exports these indices.
 */
export const D_ID = 0;
export const D_NAME = 1;
export const D_MTIME = 2;
export const D_ERR = 3;
export const D_S = 4;
export const D_FC = 5;
export const D_DC = 6;
export const D_H = 7;
export const D_MM = 8;
export const D_CN = 9;
export const D_KS = 10;
export const D_AB = 19;
export const D_AF = 40;
export const D_MD = 61;
export const D_LEN = 62;
/** Width of a folder's age row: 21 bytes, 21 files, the median step. */
export const AGE_ROW = D_LEN - D_AB;

export const KINDS = [
  { key: 'code', label: 'Code', color: 0x2e8377 },
  { key: 'document', label: 'Documents', color: 0x4a6593 },
  { key: 'image', label: 'Images', color: 0xbb6466 },
  { key: 'video', label: 'Video', color: 0x654480 },
  { key: 'audio', label: 'Audio', color: 0xbf8243 },
  { key: 'archive', label: 'Archives', color: 0x8c6b47 },
  { key: 'data', label: 'Data', color: 0x6c8851 },
  { key: 'binary', label: 'Binaries', color: 0x4b5150 },
  { key: 'other', label: 'Other', color: 0xa19e96 },
];

const EXT = {};
const reg = (kind, list) => list.split(' ').forEach((e) => { EXT[e] = kind; });
reg(0, 'js mjs cjs ts tsx jsx py rb go rs c h cpp hpp cc cs java kt kts swift php pl lua sh bash zsh fish ps1 bat cmd html htm css scss sass less vue svelte sql r m mm dart ex exs erl hs clj scala groovy gradle cmake make mk asm s vb fs zig nim pyscript glsl wgsl vert frag ipynb');
reg(1, 'txt md markdown rst pdf doc docx odt rtf tex pages epub mobi ppt pptx key odp xls xlsx ods numbers log nfo readme license');
reg(2, 'png jpg jpeg gif webp svg bmp tif tiff ico avif heic heif psd ai xcf kra raw cr2 cr3 nef nrw arw srf sr2 dng raf rw2 orf pef srw 3fr erf kdc mrw x3f iiq eps indd sketch fig blend obj fbx stl glb gltf 3ds dae usd usdz');
reg(3, 'mp4 mkv mov avi webm wmv flv m4v mpg mpeg 3gp vob prproj aep');
reg(4, 'mp3 wav flac ogg oga m4a aac wma aiff aif opus mid midi flp als ptx sf2');
reg(5, 'zip tar gz tgz bz2 xz 7z rar zst lz lz4 cab iso dmg img jar war apk aab deb rpm pkg msi whl');
reg(6, 'json jsonl ndjson yaml yml toml xml csv tsv ini cfg conf env db sqlite sqlite3 parquet avro lock plist properties npy npz pkl h5 hdf5 arrow feather dat map');
reg(7, 'exe dll so dylib bin o a lib class pyc pyd wasm node sys elf out ttf otf woff woff2 pdb');

export function extOf(name) {
  const i = name.lastIndexOf('.');
  return i > 0 && i < name.length - 1 ? name.slice(i + 1).toLowerCase() : '';
}

export function kindOf(name) {
  const k = EXT[extOf(name)];
  if (k !== undefined) return k;
  const lower = name.toLowerCase();
  if (/\.so(\.\d+)+$/.test(lower)) return 7;
  if (lower === 'makefile' || lower === 'dockerfile') return 0;
  if (lower === 'readme' || lower === 'license' || lower === 'changelog') return 1;
  return 8;
}

/** Extensions a preview shows as a picture: the inspector's and Quick look's one list. */
export const IMAGE_EXT = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'avif', 'ico']);
/** Extensions a preview reads as text besides the code and data kinds; an svg is shown as a picture first. */
export const TEXT_EXT = new Set(['txt', 'md', 'markdown', 'rst', 'log', 'nfo', 'tex', 'svg']);

/* ---------- formatting ---------- */

const UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
export function fmtBytes(n) {
  if (!n) return '0 B';
  let u = 0;
  let v = n;
  while (v >= 1024 && u < UNITS.length - 1) {
    v /= 1024;
    u++;
  }
  return `${v >= 100 || u === 0 ? Math.round(v) : v >= 10 ? v.toFixed(1) : v.toFixed(2)} ${UNITS[u]}`;
}
export const fmtCount = (n) => n.toLocaleString('en-US');
const p2 = (x) => String(x).padStart(2, '0');
/** A date as the house writes it: MM/DD/YYYY. The one formatter every module uses. */
export const fmtDay = (ms) => {
  const d = new Date(ms);
  return `${p2(d.getMonth() + 1)}/${p2(d.getDate())}/${d.getFullYear()}`;
};
/** The same with the time of day: MM/DD/YYYY HH:MM, or "unknown" without one. */
export function fmtDate(ms) {
  if (!ms) return 'unknown';
  const d = new Date(ms);
  return `${fmtDay(ms)} ${p2(d.getHours())}:${p2(d.getMinutes())}`;
}
/** A count and its noun: "1 file", "3 files", "2 entries"; a negative count reads as its size. */
export const plural = (n, one, many = `${one}s`) => `${fmtCount(Math.abs(n))} ${Math.abs(n) === 1 ? one : many}`;
export function fmtAge(ms, now = Date.now()) {
  if (!ms) return 'unknown';
  const days = (now - ms) / 86400000;
  if (days < 0) return 'in the future';
  if (days < 1 / 24) return 'minutes ago';
  if (days < 1) return `${Math.round(days * 24)} h ago`;
  if (days < 45) return `${Math.round(days)} d ago`;
  if (days < 540) return `${Math.round(days / 30.4)} mo ago`;
  return `${(days / 365.25).toFixed(1)} y ago`;
}
/** 1 = modified just now, 0 = ten or more years untouched (log scale). */
export function freshness(ms, now) {
  if (!ms) return 0;
  const days = Math.max(0, (now - ms) / 86400000);
  return 1 - Math.min(1, Math.log1p(days) / Math.log1p(3650));
}

/* ---------- nodes ---------- */

function newDir(name, parent) {
  return {
    n: name, p: parent, d: true, s: 0, m: 0, f: name.startsWith('.') && parent ? FLAG_HIDDEN : 0,
    c: [], fc: 0, dc: 0, ks: new Float64Array(9), mm: 0, h: 0, e: 0, dirty: true, stub: false,
  };
}

/**
 * How many entries a folder holds directly: in region mode its count from
 * the service (cn), which a folder whose children are not held still
 * knows; otherwise its children. Every "how many, or is it empty" read
 * goes through it, so both modes answer alike.
 */
export const kids = (n) => n.cn ?? n.c.length;

/**
 * A folder from a region record D (an array, or a Float64Array view whose
 * name and error travel beside it): a node as newDir makes one, with the
 * service's figures, its id (x), its direct count (cn), its age row (g)
 * and u set, since its own children are not held yet.
 */
export function dirFrom(D, parent, name = D[D_NAME], err = D[D_ERR]) {
  const ks = new Float64Array(9);
  for (let k = 0; k < 9; k++) ks[k] = D[D_KS + k];
  const g = new Float64Array(AGE_ROW);
  for (let k = 0; k < AGE_ROW; k++) g[k] = D[D_AB + k];
  return {
    n: name, p: parent, d: true, s: D[D_S], m: D[D_MTIME], f: name.startsWith('.') && parent ? FLAG_HIDDEN : 0,
    c: [], fc: D[D_FC], dc: D[D_DC], ks, mm: D[D_MM], h: D[D_H], e: err || 0, dirty: true, stub: false,
    x: D[D_ID], cn: D[D_CN], u: true, tail: null, g,
  };
}

export function depthOf(node) {
  let d = 0;
  for (let a = node.p; a; a = a.p) d++;
  return d;
}

/** A node's path below the root, joined with '/'; a ref (a list's stand-in for a node not held) carries its own. */
export function relPath(node) {
  if (node.rel !== undefined) return node.rel;
  const parts = [];
  for (let a = node; a && a.p; a = a.p) parts.push(a.n);
  return parts.reverse().join('/');
}

/**
 * A ref from the service's tuple [rel, d, s, m (mm for a folder), k, f,
 * fc, cn, e, x or -1, pid]: what a list shows of an entry the page may not
 * hold, drawn as a node is (name, path, kind, size, date, counts) and made
 * a node by resolving its path. Its parent is a ref of the folder's path.
 */
export function refFrom(t) {
  const rel = String(t[0]);
  const cut = rel.lastIndexOf('/');
  const up = cut < 0 ? '' : rel.slice(0, cut);
  const d = !!t[1];
  return {
    ref: true, n: cut < 0 ? rel : rel.slice(cut + 1), d, s: t[2], m: t[3], mm: t[3], k: d ? undefined : t[4], f: t[5], fc: t[6], cn: d ? t[7] : undefined,
    e: t[8] || 0, rel, pid: t[10], x: t[9] >= 0 ? t[9] : undefined,
    p: { ref: true, d: true, n: up.slice(up.lastIndexOf('/') + 1), rel: up, p: null },
  };
}

export function isAncestor(anc, node) {
  for (let a = node; a; a = a.p) if (a === anc) return true;
  return false;
}

export class Model {
  /**
   * regions: true for a model that holds only the regions the page asked
   * the service for (fillRegion and the rest below); its figures are the
   * service's and are never recomputed here.
   */
  constructor(rootName, { regions = false } = {}) {
    this.root = newDir(rootName, null);
    this.now = Date.now();
    this.dupGroups = [];
    this.regions = regions;
  }

  /* ---------- region mode: a partial tree ---------- */

  /**
   * Writes a folder's figures from a record: the record's own D (an array
   * or a view), or a folder of a decoded region (figs at offset o, with
   * name and error beside it). Its parent sorts its children again when
   * its size changed.
   */
  setFigures(node, D, o = 0, err = D[o + D_ERR]) {
    const s = D[o + D_S];
    if (node.s !== s && node.p?.d) node.p.dirty = true;
    node.s = s;
    node.m = D[o + D_MTIME];
    node.e = err || 0;
    node.fc = D[o + D_FC];
    node.dc = D[o + D_DC];
    node.h = D[o + D_H];
    node.mm = D[o + D_MM];
    node.cn = D[o + D_CN];
    for (let k = 0; k < 9; k++) node.ks[k] = D[o + D_KS + k];
    if (!node.g) node.g = new Float64Array(AGE_ROW);
    for (let k = 0; k < AGE_ROW; k++) node.g[k] = D[o + D_AB + k];
    node.dirty = true;
  }

  /**
   * Fills a folder from its decoded region R (regions.js decode): its own
   * figures, then its children in the order sent, files as #addFiles makes
   * them and folders through dirFrom, each still closed (u). The folder
   * then holds its children (u false) and the count and bytes of those it
   * does not hold (tail).
   */
  fillRegion(dir, R) {
    const { dirs, files } = R;
    this.setFigures(dir, dirs.figs, 0, dirs.errs[0]);
    const c = new Array(files.names.length + dirs.names.length - 1);
    let i = 0;
    for (let j = 0; j < files.names.length; j++) {
      const name = files.names[j];
      c[i++] = { n: name, p: dir, s: files.size[j], m: files.mtime[j], f: files.flags[j], k: kindOf(name) };
    }
    for (let j = 1; j < dirs.names.length; j++) c[i++] = dirFrom(dirs.figs.subarray(j * D_LEN, (j + 1) * D_LEN), dir, dirs.names[j], dirs.errs[j]);
    dir.c = c;
    dir.cn = R.n;
    dir.u = false;
    dir.tail = R.tail ? { n: R.tail[0], s: R.tail[1] } : null;
    dir.dirty = true;
  }

  /**
   * Fills a held folder again from a newer region of it, as reconcile
   * does: children are matched by name and kind and keep their nodes, so
   * whatever holds one holds it still. A kept file takes its size, date
   * and flags; a kept folder its figures, and keeps its own held region.
   * New children are made and gone ones dropped. When the region holds
   * only part of the folder (R.tail), a child it does not list may lie in
   * the tail rather than be gone: keep(child) true keeps it, after the
   * region's own children, and the tail no longer counts it. Returns {
   * added, removed, kept, renewed }: the nodes made, dropped and kept so,
   * and the held folders whose name now stands for another folder (a new
   * id), whose regions the caller lets go.
   */
  refillRegion(dir, R, keep = null) {
    const { dirs, files } = R;
    const oldDirs = new Map();
    const oldFiles = new Map();
    for (const ch of dir.c) (ch.d ? oldDirs : oldFiles).set(ch.n, ch);
    const next = [];
    const added = [];
    const renewed = [];
    for (let j = 0; j < files.names.length; j++) {
      const name = files.names[j];
      let file = oldFiles.get(name);
      if (file) oldFiles.delete(name);
      else {
        file = { n: name, p: dir, k: kindOf(name) };
        added.push(file);
      }
      file.s = files.size[j];
      file.m = files.mtime[j];
      file.f = files.flags[j];
      next.push(file);
    }
    for (let j = 1; j < dirs.names.length; j++) {
      const name = dirs.names[j];
      let child = oldDirs.get(name);
      if (child) {
        oldDirs.delete(name);
        this.setFigures(child, dirs.figs, j * D_LEN, dirs.errs[j]);
        // A folder of the same name under a new id is another folder: what
        // it held belongs to the one that went.
        const x = dirs.figs[j * D_LEN + D_ID];
        if (child.x !== undefined && child.x !== x && !child.u) renewed.push(child);
        child.x = x;
      } else {
        child = dirFrom(dirs.figs.subarray(j * D_LEN, (j + 1) * D_LEN), dir, name, dirs.errs[j]);
        added.push(child);
      }
      next.push(child);
    }
    this.setFigures(dir, dirs.figs, 0, dirs.errs[0]);
    const removed = [];
    const kept = [];
    let tn = R.tail ? R.tail[0] : 0;
    let ts = R.tail ? R.tail[1] : 0;
    for (const ch of [...oldFiles.values(), ...oldDirs.values()]) {
      if (tn > 0 && keep && keep(ch)) {
        kept.push(ch);
        next.push(ch);
        tn--;
        ts -= ch.s || 0;
      } else removed.push(ch);
    }
    dir.c = next;
    dir.cn = R.n;
    dir.u = false;
    dir.tail = tn > 0 ? { n: tn, s: Math.max(0, ts) } : null;
    dir.dirty = true;
    return { added, removed, kept, renewed };
  }

  /**
   * Lets a folder's children go: it is a closed folder again, with its
   * figures. Returns the folders beneath it that held their own children,
   * deepest last, so whoever keeps a registry of them can forget them.
   */
  dropRegion(dir) {
    const held = [];
    const stack = [dir];
    while (stack.length) {
      const d = stack.pop();
      for (const ch of d.c) {
        if (!ch.d || ch.u) continue;
        held.push(ch);
        stack.push(ch);
      }
    }
    dir.c = [];
    dir.u = true;
    dir.tail = null;
    dir._scree = undefined;
    return held;
  }

  /** Streaming ingest. idMap maps the scan's ids to nodes; id 0 is `attach`. */
  ingest(records, idMap, attach) {
    for (const rec of records) {
      const [id, pid, name, mtime, err, files] = rec;
      let node;
      if (pid === -1) {
        node = attach;
        node.stub = false;
      } else {
        const parent = idMap[pid];
        if (!parent) continue;
        node = newDir(name, parent);
        parent.c.push(node);
        for (let a = parent, lvl = 1; a; a = a.p, lvl++) {
          a.dc++;
          if (a.h < lvl) a.h = lvl;
          a.dirty = true;
        }
      }
      idMap[id] = node;
      node.m = mtime;
      node.e = err === 'STUB' ? 0 : err;
      node.stub = err === 'STUB';
      if (files.length) this.#addFiles(node, files);
    }
  }

  #addFiles(node, files) {
    let ds = 0;
    let mm = node.m;
    const dk = new Float64Array(9);
    const count = files.length / 4;
    for (let i = 0; i < files.length; i += 4) {
      const name = files[i];
      const k = kindOf(name);
      const file = { n: name, p: node, s: files[i + 1], m: files[i + 2], f: files[i + 3], k };
      node.c.push(file);
      ds += file.s;
      dk[k] += file.s;
      if (file.m > mm) mm = file.m;
    }
    for (let a = node; a; a = a.p) {
      a.s += ds;
      a.fc += count;
      for (let k = 0; k < 9; k++) a.ks[k] += dk[k];
      if (mm > a.mm) a.mm = mm;
      a.dirty = true;
    }
  }

  /** Recomputes one folder's totals from its children, then every ancestor. */
  recompute(dir) {
    for (let a = dir; a; a = a.p) {
      let s = 0;
      let fc = 0;
      let dc = 0;
      let h = 0;
      let mm = a.m;
      a.ks.fill(0);
      for (const ch of a.c) {
        s += ch.s;
        if (ch.d) {
          fc += ch.fc;
          dc += ch.dc + 1;
          if (ch.h + 1 > h) h = ch.h + 1;
          if (ch.mm > mm) mm = ch.mm;
          for (let k = 0; k < 9; k++) a.ks[k] += ch.ks[k];
        } else {
          fc++;
          a.ks[ch.k] += ch.s;
          if (ch.m > mm) mm = ch.m;
        }
      }
      Object.assign(a, { s, fc, dc, h, mm, dirty: true });
    }
  }

  /**
   * Applies a depth-1 scan to an existing folder. Entries that still exist
   * keep their node objects. Returns new child folders needing a deep scan
   * and the nodes that vanished.
   */
  reconcile(dir, records) {
    const oldDirs = new Map();
    const oldFiles = new Map();
    for (const ch of dir.c) (ch.d ? oldDirs : oldFiles).set(ch.n, ch);
    const next = [];
    const added = [];
    for (const rec of records) {
      const [, pid, name, mtime, err, files] = rec;
      if (pid === -1) {
        dir.m = mtime;
        dir.e = err === 'STUB' ? 0 : err;
        for (let i = 0; i < files.length; i += 4) {
          const existing = oldFiles.get(files[i]);
          const file = existing || { n: files[i], p: dir, k: kindOf(files[i]) };
          file.s = files[i + 1];
          file.m = files[i + 2];
          file.f = files[i + 3];
          oldFiles.delete(files[i]);
          next.push(file);
        }
      } else {
        let child = oldDirs.get(name);
        if (child) oldDirs.delete(name);
        else {
          child = newDir(name, dir);
          child.stub = true;
          added.push(child);
        }
        next.push(child);
      }
    }
    dir.c = next;
    this.recompute(dir);
    return { added, removed: [...oldDirs.values(), ...oldFiles.values()] };
  }

  /**
   * Takes on a fresh model of the same directory and keeps every node
   * that is still there, so whatever holds one (the selection, the
   * focus, a benchmark, a box in transition) holds it still. Both trees
   * are walked from their roots; a folder's children are matched by name
   * and kind (folder or file). A matched file keeps its node and takes
   * size, date and flags from fresh; a matched folder keeps its node and
   * is walked in turn; a new one is fresh's node, hung from the old
   * folder; one that is gone is dropped. Every old folder takes its
   * totals from fresh and is marked dirty, so the layout sorts it again.
   * Returns { kept, added, removed, changed }: entries kept, entries here
   * now and gone (a folder with all it holds), and files whose size or
   * date changed. fresh is spent: its new nodes now belong here.
   */
  adopt(fresh) {
    let kept = 0;
    let added = 0;
    let removed = 0;
    let changed = 0;
    const stack = [this.root, fresh.root];
    while (stack.length) {
      const neu = stack.pop();
      const old = stack.pop();
      const had = new Map();
      for (const ch of old.c) had.set(ch.n, ch);
      const next = new Array(neu.c.length);
      for (let i = 0; i < neu.c.length; i++) {
        const nc = neu.c[i];
        const oc = had.get(nc.n);
        if (oc && !oc.d === !nc.d) {
          had.delete(nc.n);
          kept++;
          if (nc.d) stack.push(oc, nc);
          else {
            if (oc.s !== nc.s || oc.m !== nc.m) changed++;
            oc.s = nc.s;
            oc.m = nc.m;
            oc.f = nc.f;
          }
          next[i] = oc;
        } else {
          nc.p = old;
          added += nc.d ? 1 + nc.dc + nc.fc : 1;
          next[i] = nc;
        }
      }
      // What is left was not matched: gone, or now of the other kind.
      for (const gone of had.values()) removed += gone.d ? 1 + gone.dc + gone.fc : 1;
      old.c = next;
      Object.assign(old, {
        s: neu.s, m: neu.m, e: neu.e, stub: neu.stub, fc: neu.fc, dc: neu.dc, h: neu.h, mm: neu.mm, ks: neu.ks.slice(), dirty: true,
      });
    }
    return { kept, added, removed, changed };
  }

  find(rel) {
    if (!rel) return this.root;
    let node = this.root;
    for (const part of rel.split('/')) {
      if (!node.d) return null;
      node = node.c.find((ch) => ch.n === part);
      if (!node) return null;
    }
    return node;
  }

  /** Walks the tree and gathers the noteworthy conditions. */
  survey() {
    const files = [];
    const empty = [];
    const sealed = [];
    const links = [];
    const bySize = new Map();
    const stack = [this.root];
    while (stack.length) {
      const dir = stack.pop();
      if (dir.e) sealed.push(dir);
      else if (dir.c.length === 0 && dir.p && !dir.stub) empty.push(dir);
      for (const ch of dir.c) {
        if (ch.d) stack.push(ch);
        else {
          ch.dup = 0;
          if (ch.f & FLAG_LINK) links.push(ch);
          else {
            files.push(ch);
            if (ch.s >= 4096) {
              const g = bySize.get(ch.s);
              if (g) g.push(ch);
              else bySize.set(ch.s, [ch]);
            }
          }
        }
      }
    }
    files.sort((a, b) => b.s - a.s);
    const heavyFloor = Math.max(this.root.s * 0.02, 1);
    const heavy = files.filter((f, i) => i < 24 && f.s >= heavyFloor);
    const groups = [];
    for (const [size, list] of bySize) if (list.length > 1) groups.push({ size, files: list, waste: size * (list.length - 1), verified: false });
    groups.sort((a, b) => b.waste - a.waste);
    const dupGroups = groups.slice(0, 400);
    dupGroups.forEach((g, i) => g.files.forEach((f) => { f.dup = i + 1; }));
    this.dupGroups = dupGroups;
    return { largest: files.slice(0, 80), heavy: new Set(heavy), empty, sealed, links, dupGroups };
  }
}

/* ---------- search ---------- */

const SIZE_UNIT = { b: 1, k: 1024, kb: 1024, m: 1024 ** 2, mb: 1024 ** 2, g: 1024 ** 3, gb: 1024 ** 3, t: 1024 ** 4, tb: 1024 ** 4 };
const AGE_UNIT = { h: 1 / 24, d: 1, w: 7, mo: 30.4, m: 30.4, y: 365.25 };

/**
 * Splits a query into tokens. Whitespace splits only outside double
 * quotes, and the quotes are dropped: '"two words"' is one token, and so
 * is 'in:"My Folder"' ('in:My Folder'). A quote left open runs to the end.
 * quoted is true for a token that begins with a quote: it is a literal
 * name term, never a prefix, a glob or a size.
 */
function tokenize(text) {
  const out = [];
  let cur = '';
  let open = false;
  let quoted = false;
  let started = false;
  const end = () => {
    if (started && cur) out.push({ raw: cur, quoted });
    cur = '';
    quoted = false;
    started = false;
  };
  for (const ch of text) {
    if (ch === '"') {
      if (!started) quoted = true;
      started = true;
      open = !open;
    } else if (!open && /\s/.test(ch)) end();
    else {
      cur += ch;
      started = true;
    }
  }
  end();
  return out;
}

/**
 * Turns a query into a predicate over nodes, or null when it is empty.
 * ext.is adds is:<word> tests ({ word: (node) => boolean }); ext.prefix
 * adds name:value tokens ({ name: (value, raw) => predicate }), where
 * value is lower-cased and raw keeps its case. A predicate that is not a
 * function matches nothing. Built-in words and prefixes (ext, kind, is,
 * older, newer) cannot be replaced. Double quotes keep spaces in one
 * token: "two words" is a name term, in:"My Folder" a value.
 */
export function parseQuery(text, ext = {}) {
  const isExt = ext?.is || {};
  const prefixExt = ext?.prefix || {};
  const tests = [];
  const terms = [];
  for (const { raw, quoted } of tokenize(text)) {
    const tok = raw.toLowerCase();
    let m;
    if (quoted) terms.push(tok);
    else if ((m = tok.match(/^ext:\.?(.+)$/))) {
      // A comma list is any of them: ext:jpg,png,.gif.
      const exts = new Set(m[1].split(',').map((e) => e.replace(/^\./, '')).filter(Boolean));
      tests.push((n) => !n.d && exts.has(extOf(n.n)));
    } else if ((m = tok.match(/^kind:(.+)$/))) {
      // kind:video,audio is either kind; a word that names no kind matches nothing.
      const kinds = new Set(m[1].split(',').filter(Boolean).map((w) => KINDS.findIndex((x) => x.key.startsWith(w) || x.label.toLowerCase().startsWith(w))));
      tests.push((n) => !n.d && kinds.has(n.k));
    } else if ((m = tok.match(/^is:(.+)$/))) {
      const what = m[1];
      const table = {
        empty: (n) => (n.d ? n.c.length === 0 && !n.e : n.s === 0 && !(n.f & FLAG_LINK)),
        hidden: (n) => !!(n.f & FLAG_HIDDEN),
        link: (n) => !!(n.f & FLAG_LINK),
        dup: (n) => !n.d && n.dup > 0,
        dir: (n) => !!n.d, folder: (n) => !!n.d, file: (n) => !n.d,
        sealed: (n) => !!n.d && !!n.e,
      };
      // Own keys only: "is:constructor" is not a test.
      const test = Object.hasOwn(table, what) ? table[what] : Object.hasOwn(isExt, what) ? isExt[what] : null;
      tests.push(typeof test === 'function' ? test : () => false);
    } else if ((m = tok.match(/^([<>])(=?)(\d+(?:\.\d+)?)(b|kb?|mb?|gb?|tb?)?$/))) {
      const bytes = Number(m[3]) * (SIZE_UNIT[m[4] || 'b']);
      tests.push(m[1] === '>' ? (n) => n.s > bytes : (n) => n.s < bytes);
    } else if ((m = tok.match(/^(older|newer):(\d+(?:\.\d+)?)(h|d|w|mo|m|y)$/))) {
      const cutoff = Date.now() - Number(m[2]) * AGE_UNIT[m[3]] * 86400000;
      tests.push(m[1] === 'older' ? (n) => (n.d ? n.mm : n.m) < cutoff : (n) => (n.d ? n.mm : n.m) > cutoff);
    } else if ((m = tok.match(/^([a-z][\w-]*):(.+)$/)) && Object.hasOwn(prefixExt, m[1])) {
      const test = prefixExt[m[1]](m[2], raw.slice(m[1].length + 1));
      tests.push(typeof test === 'function' ? test : () => false);
    } else if (tok.includes('*') || tok.includes('?')) {
      const re = new RegExp('^' + tok.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$', 'i');
      tests.push((n) => re.test(n.n));
    } else terms.push(tok);
  }
  if (!tests.length && !terms.length) return null;
  return (node) => {
    if (terms.length) {
      const name = node.n.toLowerCase();
      for (const t of terms) if (!name.includes(t)) return false;
    }
    for (const t of tests) if (!t(node)) return false;
    return true;
  };
}

/** Returns matching nodes, plus per-folder counts of matches beneath it. */
export function runSearch(model, predicate) {
  const set = new Set();
  const within = new Map();
  let bytes = 0;
  const stack = [model.root];
  while (stack.length) {
    const dir = stack.pop();
    for (const ch of dir.c) {
      if (ch.d) stack.push(ch);
      if (predicate(ch)) {
        set.add(ch);
        if (!ch.d) bytes += ch.s;
        for (let a = ch.p; a; a = a.p) within.set(a, (within.get(a) || 0) + 1);
      }
    }
  }
  const list = [...set].sort((a, b) => b.s - a.s);
  return { set, within, list, bytes };
}
