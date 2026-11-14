/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Tree Model (Terrane Edition - v1.4)
 *     - File Name: model.js
 *     - Relative Path: web/js/model.js
 *     - Artifact Type: javascript
 *     - Version: 1.4.0
 *     - Date: 11/13/2026
 *     - Update: Friday, November 13, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Changelog:
 *     - 1.4.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] —
 *       Double quotes keep spaces in one search token and are dropped:
 *       "two words" is one name term, and in:"My Folder" reaches its
 *       prefix as the value my folder and the raw My Folder.
 *     - 1.3.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] —
 *       fmtDay (MM/DD/YYYY) and plural are the one date formatter and
 *       count wording every module imports; fmtDate builds on fmtDay.
 *       isDir, which nothing used, is gone.
 *     - 1.2.0 (11/12/2026) [dendogg + Anthropic - Claude Opus 5.5] — The
 *       search grammar takes is: words and name:value tokens from the
 *       caller, so a feature can make itself searchable; is: looks up
 *       only real words, so is:constructor no longer matches everything.
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
 *     - Nine content kinds derived from the extension
 *     - Search grammar: free text, glob, ext:, kind:, is:, size and age
 *       comparisons, all combinable; double quotes keep spaces in one
 *       term or one prefix value
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
 *     const hits = runSearch(model, parseQuery('ext:psd >50mb older:1y'));
 *     parseQuery('is:benchmark', { is: { benchmark: (n) => marked.has(n) } });
 *     parseQuery('session:2', { prefix: { session: (v) => inWindow(v) } });
 *
 * ✒ Examples:
 *     report            name contains "report"
 *     *.test.js         glob on the name
 *     ext:mp4 >1gb      video files over a gigabyte
 *     kind:image newer:30d
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

export const KINDS = [
  { key: 'code', label: 'Code', color: 0x1f8a7d },
  { key: 'document', label: 'Documents', color: 0x3d5fa8 },
  { key: 'image', label: 'Images', color: 0xc9546c },
  { key: 'video', label: 'Video', color: 0x6c4a8f },
  { key: 'audio', label: 'Audio', color: 0xd27a34 },
  { key: 'archive', label: 'Archives', color: 0x7b5a41 },
  { key: 'data', label: 'Data', color: 0x5f8f47 },
  { key: 'binary', label: 'Binaries', color: 0x46504d },
  { key: 'other', label: 'Other', color: 0x9aa39f },
];

const EXT = {};
const reg = (kind, list) => list.split(' ').forEach((e) => { EXT[e] = kind; });
reg(0, 'js mjs cjs ts tsx jsx py rb go rs c h cpp hpp cc cs java kt kts swift php pl lua sh bash zsh fish ps1 bat cmd html htm css scss sass less vue svelte sql r m mm dart ex exs erl hs clj scala groovy gradle cmake make mk asm s vb fs zig nim pyscript glsl wgsl vert frag ipynb');
reg(1, 'txt md markdown rst pdf doc docx odt rtf tex pages epub mobi ppt pptx key odp xls xlsx ods numbers log nfo readme license');
reg(2, 'png jpg jpeg gif webp svg bmp tif tiff ico avif heic heif psd ai xcf kra raw cr2 nef arw dng eps indd sketch fig blend obj fbx stl glb gltf 3ds dae usd usdz');
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

export function depthOf(node) {
  let d = 0;
  for (let a = node.p; a; a = a.p) d++;
  return d;
}

export function relPath(node) {
  const parts = [];
  for (let a = node; a && a.p; a = a.p) parts.push(a.n);
  return parts.reverse().join('/');
}

export function isAncestor(anc, node) {
  for (let a = node; a; a = a.p) if (a === anc) return true;
  return false;
}

export class Model {
  constructor(rootName) {
    this.root = newDir(rootName, null);
    this.now = Date.now();
    this.dupGroups = [];
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
      const e = m[1];
      tests.push((n) => !n.d && extOf(n.n) === e);
    } else if ((m = tok.match(/^kind:(.+)$/))) {
      const k = KINDS.findIndex((x) => x.key.startsWith(m[1]) || x.label.toLowerCase().startsWith(m[1]));
      tests.push((n) => !n.d && n.k === k);
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
