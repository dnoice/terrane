/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Readers (Terrane Edition - v1.0)
 *     - File Name: readers.js
 *     - Relative Path: web/js/readers.js
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
 *       Initial release: the readers Quick look and Preview share, moved
 *       out of quicklook.js with its sentences kept word for word.
 *
 * ✒ Description:
 *     What a preview of a file needs to decide and to say, without the
 *     page: which kind of body a file gets, the sentence for every case
 *     that has nothing to show, a text read from the service, what kind of
 *     text it is, and the small orderings a preview lists. Quick look and
 *     Preview read through it, so the two never disagree.
 *
 * ✒ Key Features:
 *     - classify(node, { snapshot, entryOf, archive }): folder, archive
 *       entry, link, empty, image, snapshot, video, audio, archive, another
 *       archive format, binary data, text or other, in that order
 *     - sentence(as, node, { surface, host, info }): the words for each
 *       case with nothing to show, Quick look's exactly as they were, and
 *       Preview's own; thumbSentence for a picture with no thumbnail
 *     - readText(url, { signal }): the text, whether the service cut it,
 *       a NUL as binary content, a UTF-8 byte order mark; a refusal throws
 *       the service's sentence; an abort rethrows its AbortError
 *     - textKind(name, text): "Markdown", "JSON", "Python" and the rest,
 *       the line count, the line endings, the byte order mark and the
 *       count of bytes that were not UTF-8
 *     - topBySize(nodes, k): the k largest, size then name, in one pass
 *       with a small sorted buffer, never a sort of a large folder
 *     - linkTarget(rel, target, { root, sep }): where a symbolic link
 *       points, root-relative, outside, or unknown, read lexically
 *     - STEPS, canScroll, stepIndex: the content-first stepping both
 *       surfaces share; stopPlayer empties a media element
 *     - selectionRows(nodes, cap): a selection largest first, with what
 *       lies past the cap
 *     - DOM-free, so the same module runs in the browser and in Node tests
 *
 * ✒ Usage Instructions:
 *     import { classify, sentence, readText, textKind } from './readers.js';
 *     const c = classify(node, { snapshot: S.info.snapshot, entryOf: api.hostOf });
 *     if (c.as === 'text') {
 *       const { text, cut, binary, bom } = await readText(url, { signal });
 *       const kind = textKind(node.n, text, { bom, cut });
 *     } else note(sentence(c.as, node, { surface: 'preview', host: c.host }));
 *
 * ✒ Examples:
 *     classify({ n: 'a.zip', k: 5, s: 9, f: 0 }, { archive: isZipFamily }) -> { as: 'archive' }
 *     classify({ n: 'a.7z', k: 5, s: 9, f: 0 })            -> { as: 'other-archive' }
 *     textKind('notes.md', 'a\r\nb\r\n')                   -> { label: 'Markdown', lines: 2, endings: 'CRLF', ... }
 *     linkTarget('a/b', '../c', { root: '/r', sep: '/' })  -> { rel: 'c' }
 *     linkTarget('a/b', '/etc', { root: '/r', sep: '/' })  -> { outside: true }
 *     stepIndex(5, 4, 1)                                   -> { edge: 'last' }
 *     topBySize(folder.c, 10)                              -> the ten largest children
 *
 * ✒ Other Important Information:
 *     - Dependencies: model.js (KINDS, FLAG_LINK, IMAGE_EXT, TEXT_EXT,
 *       extOf, kindOf, fmtBytes)
 *     - Compatible platforms: any browser with ES2022 modules; Node.js
 *       22.5+ for its tests (tools/preview-test.mjs)
 *     - Limitations: a link's target is resolved from its text alone, so
 *       a chain of links may end somewhere else; a text's endings and
 *       invalid bytes are counted in what was read, not the whole file
 * ----------------------------------------------------------------------------
 */

import { KINDS, FLAG_LINK, IMAGE_EXT, TEXT_EXT, extOf, kindOf, fmtBytes } from './model.js';

/** The most of a text file a preview reads: the service's own default. */
export const TEXT_MAX = 262144;
/** A picture with no thumbnail is shown from the file only up to this size, and only by Quick look. */
export const RAW_IMAGE_MAX = 2 * 1024 * 1024;
export const AUDIO_EXT = new Set(['mp3', 'm4a', 'aac', 'wav', 'flac', 'ogg', 'oga', 'opus']);
export const VIDEO_EXT = new Set(['mp4', 'm4v', 'webm', 'mov', 'ogv']);
/** Data formats that are never text, though their kind is Data. */
export const BINARY_DATA_EXT = new Set(['db', 'sqlite', 'sqlite3', 'parquet', 'avro', 'npy', 'npz', 'pkl', 'h5', 'hdf5', 'arrow', 'feather']);

/** Lines in a text, a final newline ending the last one rather than starting another. */
export const countLines = (text) => (text ? text.split('\n').length - (text.endsWith('\n') ? 1 : 0) : 0);

/* ---------- what a file is shown as ---------- */

/**
 * The body a preview gives node, as { as } (with host for an archive's
 * entry): 'folder', 'entry', 'link', 'empty', 'image', 'snapshot',
 * 'video', 'audio', 'archive', 'other-archive', 'binary-data', 'text' or
 * 'other', the first that applies in that order. A picture comes before
 * snapshot mode because thumbnails are not contents. entryOf(node) is the
 * open archive holding node (api.hostOf); archive(node) says whether a
 * file can be listed (interior.js's isZipFamily). Without archive no file
 * is 'archive', and every archive kind is 'other-archive'.
 */
export function classify(node, { snapshot = false, entryOf = null, archive = null } = {}) {
  if (node.d) return { as: 'folder' };
  const host = entryOf?.(node);
  if (host) return { as: 'entry', host };
  if (node.f & FLAG_LINK) return { as: 'link' };
  if (node.s <= 0) return { as: 'empty' };
  const ext = extOf(node.n);
  if (IMAGE_EXT.has(ext)) return { as: 'image' };
  if (snapshot) return { as: 'snapshot' };
  if (VIDEO_EXT.has(ext)) return { as: 'video' };
  if (AUDIO_EXT.has(ext)) return { as: 'audio' };
  if (archive?.(node)) return { as: 'archive' };
  const k = node.k ?? kindOf(node.n);
  if (k === 5) return { as: 'other-archive' };
  if (BINARY_DATA_EXT.has(ext)) return { as: 'binary-data' };
  if (k === 0 || k === 6 || TEXT_EXT.has(ext) || /^(makefile|dockerfile)$/i.test(node.n)) return { as: 'text' };
  return { as: 'other' };
}

/**
 * The body Quick look gives a classification, as it always has: an
 * archive of any format is 'other', and a binary data format is read as
 * text, whose NUL then reads as binary content.
 */
export function lookAs(as) {
  if (as === 'archive' || as === 'other-archive') return 'other';
  if (as === 'binary-data') return 'text';
  return as;
}

const kindLabel = (node) => KINDS[node.k ?? kindOf(node.n)]?.label ?? 'Other';

/**
 * The words for a case with nothing (or something wrong) to show. surface
 * 'quicklook' keeps Quick look's sentences exactly; 'preview' gives
 * Preview's. host is the open archive for 'entry'; info carries what a
 * case needs: for 'link' in Preview { target, rel, outside, unknown,
 * missing, snapshot }, for 'read-error' { message }.
 */
export function sentence(as, node, { surface = 'preview', host = null, info = {} } = {}) {
  const ext = extOf(node.n);
  if (surface === 'quicklook') {
    switch (as) {
      case 'entry': return `An entry of ${host.n}. Quick look does not read inside an archive, so nothing in it is fetched.`;
      case 'link': return 'A symbolic link. Quick look does not follow it; the inspector says where it points.';
      case 'empty': return 'An empty file: there is nothing to show.';
      case 'snapshot': return 'Snapshot mode holds names, sizes and dates, not contents.';
      case 'binary': return 'Binary content: no text preview.';
      case 'media-error': return 'This file could not be played here.';
      case 'image-error': return 'This file could not be read as an image.';
      case 'read-error': return `This file could not be read: ${info.message}.`;
      case 'cut': return `First 256 KB of ${fmtBytes(node.s)}`;
      default: return `${kindLabel(node)}: Quick look shows text, pictures, sound and film. Open hands this file to its own application.`;
    }
  }
  switch (as) {
    case 'entry': return `An entry of ${host.n}. Nothing inside an archive is read, so Preview shows what its directory lists.`;
    case 'link': {
      if (info.snapshot) return 'The snapshot records that this is a symbolic link, not where it points.';
      if (info.unknown) return 'A symbolic link, shown and never followed. Where it points could not be read.';
      if (info.outside) return `It points to ${info.target}, outside this directory, so Terrane does not follow it.`;
      if (info.missing) return `It points to ${info.rel}, which is not in this directory now.`;
      return `A symbolic link, shown and never followed. It points to ${info.target}, which is ${info.rel || 'the root folder'} in this directory.`;
    }
    case 'empty': return 'An empty file: there is nothing to show.';
    case 'snapshot': return 'Snapshot mode holds names, sizes and dates, not contents, so nothing is read from this file. Its facts are above.';
    case 'other-archive': return `A ${ext ? `.${ext} ` : ''}archive. Preview lists what zip archives hold, and the formats built on them (jar, war, apk and more); Open hands this one to its own application.`;
    case 'binary': return 'Binary content, or text in UTF-16, which Preview does not read. Its facts are above.';
    case 'invalid': return 'Some bytes are not UTF-8 and show as \uFFFD.';
    case 'media-error': return 'This file could not be played here: the browser does not play its format, or it is not what its name says.';
    case 'image-error': return 'This thumbnail could not be shown.';
    case 'read-error': return `This file could not be read: ${info.message}.`;
    case 'cut': return `First 256 KB of ${fmtBytes(node.s)}. The rest is not read.`;
    case 'sealed': return `This folder could not be read (${node.e}), so there is nothing in it to summarize.`;
    case 'empty-folder': return 'An empty folder: nothing in it to summarize.';
    case 'gone': return `“${node.n}” is no longer there: it was removed or renamed outside Terrane.`;
    default: return `${kindLabel(node)}${ext ? `, .${ext}` : ''}: Preview shows text, pictures, sound, film and what a zip archive holds. Open hands this file to its own application.`;
  }
}

/**
 * Why a picture has no thumbnail to show, from its thumbs.js info (null
 * when the index does not list it). Preview adds that Quick look shows
 * the file itself, which it does for a small raster outside a snapshot.
 */
export function thumbSentence(info, node, { snapshot = false, surface = 'preview' } = {}) {
  const status = info?.status;
  if (surface === 'quicklook') {
    return status === 'huge' ? 'Too large to thumbnail in the normal pass. npm run thumbs -- --huge makes one.'
      : status === 'heavy-svg' ? 'Heavy vector art. npm run thumbs -- --heavy-svg renders it.'
        : status === 'error' ? 'This file could not be read as an image.'
          : 'No thumbnail yet. npm run thumbs makes one.';
  }
  const why = status === 'huge' ? 'Too large to thumbnail in the normal pass: pictures are shown from their thumbnails only, and npm run thumbs -- --huge makes one.'
    : status === 'heavy-svg' ? 'Heavy vector art: pictures are shown from their thumbnails only, and npm run thumbs -- --heavy-svg renders one.'
      : status === 'error' ? 'This file could not be read as an image, so it has no thumbnail.'
        : 'No thumbnail yet: pictures are shown from their thumbnails only, and npm run thumbs makes them.';
  const small = !snapshot && node.s <= RAW_IMAGE_MAX && extOf(node.n) !== 'svg' && status !== 'error';
  return small ? `${why} Quick look (P) shows the file itself.` : why;
}

/* ---------- reading text ---------- */

/**
 * Reads a text from url (api.rawUrl). Resolves to { text, cut, binary,
 * bom }: cut when the service sent only the first part
 * (X-Terrane-Truncated: 1), binary when a NUL came back, bom when the
 * bytes began with UTF-8's byte order mark (which text leaves out, as the
 * browser's own decoding does). A refusal throws an Error with the
 * service's sentence (or "the service answered <status>") and its status;
 * an abort rethrows its AbortError for the caller to ignore.
 */
export async function readText(url, { signal, fetchFn = fetch } = {}) {
  const r = await fetchFn(url, { signal });
  if (!r.ok) {
    let why = `the service answered ${r.status}`;
    try {
      why = (await r.json()).message || why;
    } catch { /* not json */ }
    const err = new Error(why);
    err.status = r.status;
    throw err;
  }
  const cut = r.headers.get('X-Terrane-Truncated') === '1';
  let text = new TextDecoder('utf-8', { ignoreBOM: true }).decode(await r.arrayBuffer());
  const bom = text.startsWith('\uFEFF');
  if (bom) text = text.slice(1);
  return { text, cut, binary: text.includes('\u0000'), bom };
}

const TEXT_LABELS = (() => {
  const out = {};
  const put = (label, list) => list.split(' ').forEach((e) => { out[e] = label; });
  put('Markdown', 'md markdown');
  put('Plain text', 'txt nfo');
  put('Log', 'log');
  put('reStructuredText', 'rst');
  put('TeX', 'tex');
  put('JSON', 'json');
  put('JSON lines', 'jsonl ndjson');
  put('YAML', 'yaml yml');
  put('TOML', 'toml');
  put('XML', 'xml');
  put('CSV', 'csv');
  put('TSV', 'tsv');
  put('Settings', 'ini cfg conf env properties');
  put('Property list', 'plist');
  put('Lock file', 'lock');
  put('Source map', 'map');
  put('JavaScript', 'js mjs cjs');
  put('TypeScript', 'ts');
  put('TSX', 'tsx');
  put('JSX', 'jsx');
  put('Python', 'py');
  put('Ruby', 'rb');
  put('Go', 'go');
  put('Rust', 'rs');
  put('C', 'c h');
  put('C++', 'cpp hpp cc');
  put('C#', 'cs');
  put('Java', 'java');
  put('Kotlin', 'kt kts');
  put('Swift', 'swift');
  put('PHP', 'php');
  put('Shell', 'sh bash zsh fish');
  put('PowerShell', 'ps1');
  put('Batch', 'bat cmd');
  put('HTML', 'html htm');
  put('CSS', 'css');
  put('SCSS', 'scss sass');
  put('Less', 'less');
  put('Vue', 'vue');
  put('Svelte', 'svelte');
  put('SQL', 'sql');
  put('Lua', 'lua');
  put('Perl', 'pl');
  put('R', 'r');
  put('Dart', 'dart');
  put('Elixir', 'ex exs');
  put('Erlang', 'erl');
  put('Haskell', 'hs');
  put('Clojure', 'clj');
  put('Scala', 'scala');
  put('Groovy', 'groovy');
  put('Gradle', 'gradle');
  put('CMake', 'cmake');
  put('Makefile', 'make mk');
  put('Assembly', 'asm s');
  put('Zig', 'zig');
  put('Nim', 'nim');
  put('Shader', 'glsl wgsl vert frag');
  put('Jupyter notebook', 'ipynb');
  put('SVG source', 'svg');
  return Object.freeze(out);
})();

/** A kind's word before "text" when the extension names no format. */
const KIND_TEXT = { 0: 'Code', 1: 'Document', 6: 'Data' };

/**
 * What kind of text it is: { label, lines, endings, bom, invalid }. label
 * names the format from the extension ("Markdown", "Python"), or the
 * file's name for a Makefile or Dockerfile, else "<kind> text"; endings
 * is 'LF', 'CRLF', 'CR', 'mixed' or null (one line, no ending); invalid
 * counts U+FFFD, the bytes that were not UTF-8, leaving out one at the
 * end of a cut text, which the cut may have split.
 */
export function textKind(name, text, { bom, cut = false } = {}) {
  const lower = name.toLowerCase();
  const ext = extOf(name);
  const label = lower === 'makefile' ? 'Makefile' : lower === 'dockerfile' ? 'Dockerfile'
    : TEXT_LABELS[ext] || `${KIND_TEXT[kindOf(name)] || 'Plain'} text`;
  let lf = 0;
  let crlf = 0;
  let cr = 0;
  let invalid = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c === 10) lf++;
    else if (c === 13) {
      if (text.charCodeAt(i + 1) === 10) {
        crlf++;
        i++;
      } else cr++;
    } else if (c === 0xfffd) invalid++;
  }
  if (cut && invalid && text.endsWith('\uFFFD')) invalid--;
  const kinds = (lf > 0) + (crlf > 0) + (cr > 0);
  const endings = kinds === 0 ? null : kinds > 1 ? 'mixed' : lf ? 'LF' : crlf ? 'CRLF' : 'CR';
  // Lines as the view shows them: an ending of any kind ends one, and a
  // last line without an ending is a line too.
  const last = text.charCodeAt(text.length - 1);
  const lines = lf + crlf + cr + (text && last !== 10 && last !== 13 ? 1 : 0);
  return { label, lines, endings, bom: bom ?? text.startsWith('\uFEFF'), invalid };
}

/* ---------- orderings ---------- */

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
/** Larger first, then by name as the ledger orders names. */
export const bySizeThenName = (a, b) => b.s - a.s || collator.compare(a.n, b.n);

/**
 * The k largest of nodes, larger first and then by name, as a full sort
 * would give them (equal ones in the order they came): one pass that
 * keeps a sorted buffer of k, so a folder of 100,000 is never sorted.
 */
export function topBySize(nodes, k) {
  const out = [];
  if (k <= 0) return out;
  for (const n of nodes) {
    if (out.length === k && bySizeThenName(n, out[k - 1]) >= 0) continue;
    // The first place where n sorts strictly before the item there.
    let lo = 0;
    let hi = out.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (bySizeThenName(n, out[mid]) < 0) hi = mid;
      else lo = mid + 1;
    }
    out.splice(lo, 0, n);
    if (out.length > k) out.pop();
  }
  return out;
}

/**
 * A selection as rows, largest first: { rows (at most cap), more (how
 * many lie past the cap), moreBytes (what they hold together) }.
 */
export function selectionRows(nodes, cap) {
  const list = [...nodes];
  const rows = topBySize(list, cap);
  let all = 0;
  for (const n of list) all += n.s;
  let shown = 0;
  for (const n of rows) shown += n.s;
  return { rows, more: list.length - rows.length, moreBytes: all - shown };
}

/* ---------- links ---------- */

/** Path segments with '.' dropped and '..' taken back; null when '..' climbs above the start. */
function normal(segments) {
  const out = [];
  for (const s of segments) {
    if (!s || s === '.') continue;
    if (s === '..') {
      if (!out.length) return null;
      out.pop();
    } else out.push(s);
  }
  return out;
}

/**
 * Where a symbolic link points, from its text alone (it is never
 * followed): linkRel is the link's root-relative path ('/'-joined),
 * target what readlink gave, root and sep the directory's (S.info).
 * Returns { rel } (root-relative, '/'-joined; '' for the root itself),
 * { outside: true }, or { unknown: true } for no target.
 */
export function linkTarget(linkRel, target, { root, sep = '/' } = {}) {
  if (target == null || target === '') return { unknown: true };
  const win = sep === '\\';
  let t = String(target);
  if (win) t = t.replace(/^\\\\\?\\/, '').replace(/\\/g, '/');
  const absolute = t.startsWith('/') || (win && /^[A-Za-z]:\//.test(t));
  if (!absolute) {
    const base = String(linkRel).split('/').slice(0, -1);
    const parts = normal([...base, ...t.split('/')]);
    return parts ? { rel: parts.join('/') } : { outside: true };
  }
  if (!root) return { outside: true };
  const r = (win ? String(root).replace(/\\/g, '/') : String(root)).replace(/\/+$/, '');
  const same = (a, b) => (win ? a.toLowerCase() === b.toLowerCase() : a === b);
  // The target as segments, '.' and '..' taken back, against the root's.
  const lead = win && /^[A-Za-z]:/.test(t) ? t.slice(0, 2) : '';
  const tParts = normal(t.slice(lead.length).split('/'));
  const rLead = win && /^[A-Za-z]:/.test(r) ? r.slice(0, 2) : '';
  const rParts = normal(r.slice(rLead.length).split('/'));
  if (!tParts || !rParts || !same(lead, rLead) || tParts.length < rParts.length) return { outside: true };
  for (let i = 0; i < rParts.length; i++) if (!same(tParts[i], rParts[i])) return { outside: true };
  return { rel: tParts.slice(rParts.length).join('/') };
}

/* ---------- stepping ---------- */

/** The keys that step through a list, and where each goes. */
export const STEPS = Object.freeze({ ArrowLeft: -1, ArrowRight: 1, Home: 'first', End: 'last' });

/**
 * Whether a pane can still scroll the way a key scrolls it: the arrows
 * sideways, Home and End up and down, as a focused scroll region does.
 */
export function canScroll(pane, key) {
  if (key === 'ArrowLeft') return pane.scrollLeft > 0;
  if (key === 'ArrowRight') return pane.scrollLeft + pane.clientWidth < pane.scrollWidth - 1;
  if (key === 'Home') return pane.scrollTop > 0;
  if (key === 'End') return pane.scrollTop + pane.clientHeight < pane.scrollHeight - 1;
  return false;
}

/**
 * Where a step goes in a list of len from index i (-1 when the item is
 * not in it): to is -1, 1, 'first' or 'last'. { j }, or { edge: 'first'
 * | 'last' } at an end (or Home and End where it already is), or
 * { missing: true } for an arrow from an item the list does not hold.
 */
export function stepIndex(len, i, to) {
  let j;
  if (to === 'first') j = 0;
  else if (to === 'last') j = len - 1;
  else if (i < 0) return { missing: true };
  else j = i + to;
  if (j < 0 || j >= len || j === i) return { edge: j < 0 || to === 'first' || (to !== 'last' && to < 0) ? 'first' : 'last' };
  return { j };
}

/** Empties a media element: it stops, and lets its stream go. */
export function stopPlayer(m) {
  if (!m) return;
  m.pause();
  m.removeAttribute('src');
  m.load();
}
