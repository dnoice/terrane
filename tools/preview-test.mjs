/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Preview Readers Test (Terrane Edition - v1.0)
 *     - File Name: preview-test.mjs
 *     - Relative Path: tools/preview-test.mjs
 *     - Artifact Type: test
 *     - Version: 1.0.0
 *     - Date: 11/14/2026
 *     - Update: Saturday, November 14, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Description:
 *     Checks the readers Quick look and Preview share (web/js/readers.js)
 *     in Node: what each kind of file is shown as, Quick look's sentences
 *     word for word as they were before the readers moved, the text read
 *     through a fake fetch, what kind of text it is, the orderings, where
 *     a link points, and the steps.
 *
 * ✒ Key Features:
 *     - classify across every case, in snapshot mode too, with and without
 *       the archive predicate
 *     - Quick look's behaviour and sentences against a copy of what
 *       quicklook.js decided and said at 855e4de, as a golden list, a
 *       link's sentence the one changed on purpose; lookShows true only
 *       where the sheet shows text, a picture, sound or film
 *     - Preview's link sentences, a target written as its path named once
 *     - readText: cut, a NUL, a byte order mark, a JSON refusal, a refusal
 *       that is not JSON, an abort
 *     - countLines and textKind: labels, line endings, the byte order
 *       mark and bytes that were not UTF-8
 *     - topBySize equal to a full sort's first k over 1,000 random
 *       folders, ties by name, k beyond n
 *     - linkTarget: relative inside and climbing out, absolute inside and
 *       outside with '/' and '\\' roots, a drive root, '.', empty, null
 *     - stepIndex, canScroll and stopPlayer with fake objects;
 *       selectionRows; presets.js's selectionBytes counting an item inside
 *       a selected folder once
 *
 * ✒ Usage Instructions:
 *     node tools/preview-test.mjs     (part of npm test)
 *
 * ✒ Other Important Information:
 *     - Dependencies: web/js/readers.js, web/js/model.js, web/js/presets.js
 *     - Compatible platforms: Node.js 22.5+
 * ----------------------------------------------------------------------------
 */

import {
  TEXT_MAX, RAW_IMAGE_MAX, BINARY_DATA_EXT, countLines, classify, lookAs, lookShows, sentence, thumbSentence, readText, textKind,
  topBySize, bySizeThenName, selectionRows, linkTarget, STEPS, canScroll, stepIndex, stopPlayer,
} from '../web/js/readers.js';
import { KINDS, FLAG_LINK, IMAGE_EXT, TEXT_EXT, extOf, kindOf } from '../web/js/model.js';
import { selectionBytes } from '../web/js/presets.js';

let passed = 0;
let failed = 0;
const check = (name, ok, detail = '') => {
  if (ok) passed++;
  else failed++;
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${name}${ok || !detail ? '' : ` — ${detail}`}`);
};
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

console.log('Preview readers');

const file = (n, s = 100, f = 0) => ({ n, s, f, k: kindOf(n), m: 0 });
const isZip = (node) => /\.(zip|jar|war|ear|apk|aab|whl|xpi|nupkg|vsix|ipa)$/i.test(node.n) && !node.d;

check('the limits are the service\'s 256 KB and the 2 MB raster rule', TEXT_MAX === 262144 && RAW_IMAGE_MAX === 2097152);

/* ---------- classify ---------- */

const archive = { n: 'site.zip' };
const entry = file('inner.md');
const cases = [
  ['a folder', { n: 'docs', d: true, s: 0, f: 0 }, 'folder', 'folder'],
  ['an archive entry', entry, 'entry', 'entry'],
  ['a link', file('link-to-copy-a', 0, FLAG_LINK), 'link', 'link'],
  ['an empty file', file('empty.md', 0), 'empty', 'empty'],
  ['a photo', file('photo.jpg'), 'image', 'image'],
  ['an svg', file('art.svg'), 'image', 'image'],
  ['a film', file('clip.mp4'), 'video', 'snapshot'],
  ['a sound', file('tone.wav'), 'audio', 'snapshot'],
  ['a zip', file('site.zip'), 'archive', 'snapshot'],
  ['a jar', file('lib.jar'), 'archive', 'snapshot'],
  ['a 7z', file('packed.7z'), 'other-archive', 'snapshot'],
  ['a sqlite database', file('app.sqlite'), 'binary-data', 'snapshot'],
  ['a parquet table', file('t.parquet'), 'binary-data', 'snapshot'],
  ['a psd', file('layered.psd'), 'other', 'snapshot'],
  ['a pdf', file('report.pdf'), 'other', 'snapshot'],
  ['a Markdown file', file('README.md'), 'text', 'snapshot'],
  ['a JSON file', file('package.json'), 'text', 'snapshot'],
  ['a Makefile', file('Makefile'), 'text', 'snapshot'],
  ['a Dockerfile', file('Dockerfile'), 'text', 'snapshot'],
  ['a copy-a.dat', file('copy-a.dat'), 'text', 'snapshot'],
];
const entryOf = (n) => (n === entry ? archive : null);
for (const [what, node, want, wantSnap] of cases) {
  const c = classify(node, { entryOf, archive: isZip });
  const s = classify(node, { snapshot: true, entryOf, archive: isZip });
  check(`${what} is ${want}, and ${wantSnap} in snapshot mode`, c.as === want && s.as === wantSnap, `${c.as} / ${s.as}`);
}
check('an archive entry names its archive', classify(entry, { entryOf }).host === archive);
check('without the archive predicate a zip is another archive format, as Quick look sees it',
  classify(file('site.zip')).as === 'other-archive' && classify(file('lib.jar')).as === 'other-archive');
check('the binary data formats are a data kind that is never text',
  [...BINARY_DATA_EXT].every((e) => kindOf(`x.${e}`) === 6 && classify(file(`x.${e}`)).as === 'binary-data'), [...BINARY_DATA_EXT].join(' '));

/* ---------- Quick look as it was (quicklook.js at 855e4de) ---------- */

const AUDIO_OLD = new Set(['mp3', 'm4a', 'aac', 'wav', 'flac', 'ogg', 'oga', 'opus']);
const VIDEO_OLD = new Set(['mp4', 'm4v', 'webm', 'mov', 'ogv']);
/** quicklook.js's kindOf at 855e4de, word for word but for S and api. */
function oldKindOf(node, { snapshot, hostOf }) {
  const ext = extOf(node.n);
  const host = hostOf(node);
  if (host) return { as: 'facts', why: `An entry of ${host.n}. Quick look does not read inside an archive, so nothing in it is fetched.` };
  // The one sentence changed on purpose: a link's names Preview beside the Inspector.
  if (node.f & FLAG_LINK) return { as: 'facts', why: 'A symbolic link. Quick look does not follow it; the Inspector and Preview say where it points.' };
  if (node.s <= 0) return { as: 'facts', why: 'An empty file: there is nothing to show.' };
  if (IMAGE_EXT.has(ext)) return { as: 'image' };
  if (snapshot) return { as: 'facts', why: 'Snapshot mode holds names, sizes and dates, not contents.' };
  if (VIDEO_OLD.has(ext)) return { as: 'video' };
  if (AUDIO_OLD.has(ext)) return { as: 'audio' };
  if (node.k === 0 || node.k === 6 || TEXT_EXT.has(ext)) return { as: 'text' };
  return { as: 'facts', why: `${KINDS[node.k].label}: Quick look shows text, pictures, sound and film. Open hands this file to its own application.` };
}
/** quicklook.js's kindOf now: classify, lookAs and the quicklook sentences. */
function newKindOf(node, { snapshot, hostOf }) {
  const c = classify(node, { snapshot, entryOf: hostOf });
  const as = lookAs(c.as);
  if (as === 'text' || as === 'image' || as === 'audio' || as === 'video') return { as };
  return { as: 'facts', why: sentence(as, node, { surface: 'quicklook', host: c.host }) };
}
const EXTS = [...new Set(['', ...Object.keys(Object.fromEntries([...TEXT_EXT, ...IMAGE_EXT, ...AUDIO_OLD, ...VIDEO_OLD, ...BINARY_DATA_EXT].map((e) => [e, 1]))),
  'zip', 'jar', '7z', 'rar', 'psd', 'pdf', 'exe', 'json', 'js', 'py', 'csv', 'dat', 'bin', 'ttf', 'blend', 'xyz'])];
const nodes = [];
for (const e of EXTS) {
  const n = e ? `name.${e}` : 'Makefile';
  nodes.push(file(n), file(n, 0), file(n, 50, FLAG_LINK));
}
nodes.push(entry, file('README'), file('Dockerfile'), file('LICENSE'));
const drift = [];
for (const snapshot of [false, true]) {
  for (const node of nodes) {
    const a = oldKindOf(node, { snapshot, hostOf: entryOf });
    const b = newKindOf(node, { snapshot, hostOf: entryOf });
    if (!same(a, b)) drift.push(`${node.n}${node.s ? '' : ' (empty)'}${node.f & FLAG_LINK ? ' (link)' : ''}${snapshot ? ' snapshot' : ''}: ${JSON.stringify(a)} vs ${JSON.stringify(b)}`);
  }
}
check(`Quick look shows every one of ${nodes.length * 2} files and modes as it did, with the same sentence`, drift.length === 0, drift.slice(0, 4).join(' | '));

const GOLDEN = [
  [sentence('entry', entry, { surface: 'quicklook', host: archive }), 'An entry of site.zip. Quick look does not read inside an archive, so nothing in it is fetched.'],
  [sentence('link', file('l', 0, FLAG_LINK), { surface: 'quicklook' }), 'A symbolic link. Quick look does not follow it; the Inspector and Preview say where it points.'],
  [sentence('empty', file('e.md', 0), { surface: 'quicklook' }), 'An empty file: there is nothing to show.'],
  [sentence('snapshot', file('a.md'), { surface: 'quicklook' }), 'Snapshot mode holds names, sizes and dates, not contents.'],
  [sentence('other', file('report.pdf'), { surface: 'quicklook' }), 'Documents: Quick look shows text, pictures, sound and film. Open hands this file to its own application.'],
  [sentence(lookAs('other-archive'), file('packed.7z'), { surface: 'quicklook' }), 'Archives: Quick look shows text, pictures, sound and film. Open hands this file to its own application.'],
  [sentence('binary', file('a.md'), { surface: 'quicklook' }), 'Binary content: no text preview.'],
  [sentence('media-error', file('a.mp4'), { surface: 'quicklook' }), 'This file could not be played here.'],
  [sentence('image-error', file('a.png'), { surface: 'quicklook' }), 'This file could not be read as an image.'],
  [sentence('read-error', file('a.md'), { surface: 'quicklook', info: { message: 'the service answered 500' } }), 'This file could not be read: the service answered 500.'],
  [sentence('cut', file('copy-a.dat', 300000), { surface: 'quicklook' }), 'First 256 KB of 293 KB'],
  [thumbSentence({ status: 'huge' }, file('a.png'), { surface: 'quicklook' }), 'Too large to thumbnail in the normal pass. npm run thumbs -- --huge makes one.'],
  [thumbSentence({ status: 'heavy-svg' }, file('a.svg'), { surface: 'quicklook' }), 'Heavy vector art. npm run thumbs -- --heavy-svg renders it.'],
  [thumbSentence({ status: 'error' }, file('a.png'), { surface: 'quicklook' }), 'This file could not be read as an image.'],
  [thumbSentence(null, file('a.png'), { surface: 'quicklook' }), 'No thumbnail yet. npm run thumbs makes one.'],
];
// Preview offers Quick look only where its sheet shows more than the facts.
const shows = cases.filter(([, node]) => lookShows(classify(node, { entryOf, archive: isZip }).as)).map(([what]) => what);
const showsSnap = cases.filter(([, node]) => lookShows(classify(node, { snapshot: true, entryOf, archive: isZip }).as)).map(([what]) => what);
// A binary data format is read as text by the sheet, which then finds binary content.
const binaryData = (node) => BINARY_DATA_EXT.has(extOf(node.n));
check(`Quick look shows more only for text, a picture, sound and film (${shows.length} of ${cases.length}; in snapshot mode the pictures)`,
  same(shows, ['a photo', 'an svg', 'a film', 'a sound', 'a Markdown file', 'a JSON file', 'a Makefile', 'a Dockerfile', 'a copy-a.dat'])
  && same(showsSnap, ['a photo', 'an svg'])
  && nodes.every((node) => [false, true].every((snapshot) => lookShows(classify(node, { snapshot, entryOf }).as)
    === (newKindOf(node, { snapshot, hostOf: entryOf }).as !== 'facts' && !(binaryData(node) && !snapshot && node.s > 0 && !(node.f & FLAG_LINK))))),
  `${shows.join(', ')} | ${showsSnap.join(', ')}`);
const off = GOLDEN.filter(([a, b]) => a !== b);
check(`Quick look's ${GOLDEN.length} sentences are word for word what quicklook.js said, a link's naming Preview`, off.length === 0, JSON.stringify(off[0] || ''));

/* ---------- Preview's sentences ---------- */

check('Preview names the kind and extension of a file it does not read, and what it does read',
  sentence('other', file('layered.psd')) === 'Images, .psd: Preview shows text, pictures, sound, film and what a zip archive holds. Open hands this file to its own application.'
  && sentence('binary-data', file('app.sqlite')) === 'Data, .sqlite: Preview shows text, pictures, sound, film and what a zip archive holds. Open hands this file to its own application.',
  sentence('other', file('layered.psd')));
check('another archive format names zip and the formats built on it',
  sentence('other-archive', file('packed.7z')) === 'A .7z archive. Preview lists what zip archives hold, and the formats built on them (jar, war, apk and more); Open hands this one to its own application.');
check('a link\'s sentences: inside, outside, missing, snapshot',
  sentence('link', file('l', 0, FLAG_LINK), { info: { target: '../tidepool-web', rel: 'Projects/tidepool-web' } }) === 'A symbolic link, shown and never followed. It points to ../tidepool-web, which is Projects/tidepool-web in this directory.'
  && sentence('link', file('l', 0, FLAG_LINK), { info: { target: '/etc', outside: true } }) === 'It points to /etc, outside this directory, so Terrane does not follow it.'
  && sentence('link', file('l', 0, FLAG_LINK), { info: { rel: 'gone/x', missing: true } }) === 'It points to gone/x, which is not in this directory now.'
  && sentence('link', file('l', 0, FLAG_LINK), { info: { snapshot: true } }) === 'The snapshot records that this is a symbolic link, not where it points.');
check('a link whose target is written as its path in the directory names it once',
  sentence('link', file('Shared', 0, FLAG_LINK), { info: { target: 'Projects', rel: 'Projects' } }) === 'A symbolic link, shown and never followed. It points to Projects in this directory.'
  && sentence('link', file('l', 0, FLAG_LINK), { info: { target: './Projects', rel: 'Projects' } }) === 'A symbolic link, shown and never followed. It points to ./Projects, which is Projects in this directory.'
  && sentence('link', file('l', 0, FLAG_LINK), { info: { target: '..', rel: '' } }) === 'A symbolic link, shown and never followed. It points to .., which is the root folder in this directory.');
check('the cut, the snapshot and a file that went say so plainly',
  sentence('cut', file('copy-a.dat', 2516582)) === 'First 256 KB of 2.40 MB. The rest is not read.'
  && sentence('snapshot', file('a.md')) === 'Snapshot mode holds names, sizes and dates, not contents, so nothing is read from this file. Its facts are above.'
  && sentence('gone', file('notes.md')) === '\u201Cnotes.md\u201D is no longer there: it was removed or renamed outside Terrane.');
check('a picture without a thumbnail: thumbnails only, and Quick look for a small raster outside a snapshot',
  thumbSentence(null, file('a.png', 5000)) === 'No thumbnail yet: pictures are shown from their thumbnails only, and npm run thumbs makes them. Quick look (P) shows the file itself.'
  && thumbSentence(null, file('a.png', 5000), { snapshot: true }) === 'No thumbnail yet: pictures are shown from their thumbnails only, and npm run thumbs makes them.'
  && !thumbSentence(null, file('a.svg', 5000)).includes('Quick look') && !thumbSentence(null, file('a.png', RAW_IMAGE_MAX + 1)).includes('Quick look'));

/* ---------- readText ---------- */

const enc = new TextEncoder();
const fakeFetch = (status, body, headers = {}) => async (url, { signal } = {}) => {
  if (signal?.aborted) throw new DOMException('The operation was aborted.', 'AbortError');
  return new Response(body, { status, headers });
};
{
  const r = await readText('/x', { fetchFn: fakeFetch(200, 'hello\nworld\n', { 'X-Terrane-Truncated': '1' }) });
  check('readText gives the text and the cut', r.text === 'hello\nworld\n' && r.cut === true && r.binary === false && r.bom === false, JSON.stringify(r));
  const b = await readText('/x', { fetchFn: fakeFetch(200, 'a\u0000b', { 'X-Terrane-Truncated': '0' }) });
  check('a NUL reads as binary content, and an uncut text is not cut', b.binary === true && b.cut === false);
  const bom = await readText('/x', { fetchFn: fakeFetch(200, new Uint8Array([0xef, 0xbb, 0xbf, ...enc.encode('x\n')])) });
  check('a UTF-8 byte order mark is noted and left out of the text', bom.bom === true && bom.text === 'x\n', JSON.stringify(bom));
  const bad = await readText('/x', { fetchFn: fakeFetch(200, new Uint8Array([0x61, 0xff, 0x62])) });
  check('bytes that are not UTF-8 show as U+FFFD', bad.text === 'a\uFFFDb');
  let msg = null;
  try {
    await readText('/x', { fetchFn: fakeFetch(404, JSON.stringify({ message: 'notes.md is no longer there.' }), { 'Content-Type': 'application/json' }) });
  } catch (err) {
    msg = [err.message, err.status];
  }
  check('a refusal throws the service\'s sentence and status', same(msg, ['notes.md is no longer there.', 404]), JSON.stringify(msg));
  try {
    await readText('/x', { fetchFn: fakeFetch(500, 'oops') });
  } catch (err) {
    msg = err.message;
  }
  check('a refusal that is not JSON says what the service answered', msg === 'the service answered 500', msg);
  const ac = new AbortController();
  ac.abort();
  try {
    await readText('/x', { signal: ac.signal, fetchFn: fakeFetch(200, 'x') });
    msg = 'resolved';
  } catch (err) {
    msg = err.name;
  }
  check('an abort rethrows its AbortError', msg === 'AbortError', msg);
}

/* ---------- countLines, textKind ---------- */

check('countLines: none, one, a final newline, two, and blank lines',
  same(['', 'a', 'a\n', 'a\nb', '\n\n'].map(countLines), [0, 1, 1, 2, 2]), JSON.stringify(['', 'a', 'a\n', 'a\nb', '\n\n'].map(countLines)));
const tk = (n, t, o) => textKind(n, t, o);
check('textKind names formats by extension and name',
  same([tk('a.md', '').label, tk('a.json', '').label, tk('a.py', '').label, tk('a.jsonl', '').label, tk('a.yml', '').label, tk('a.ini', '').label, tk('a.ipynb', '').label,
    tk('a.svg', '').label, tk('Makefile', '').label, tk('Dockerfile', '').label, tk('a.txt', '').label, tk('a.cpp', '').label, tk('a.ps1', '').label],
  ['Markdown', 'JSON', 'Python', 'JSON lines', 'YAML', 'Settings', 'Jupyter notebook', 'SVG source', 'Makefile', 'Dockerfile', 'Plain text', 'C++', 'PowerShell']));
check('else by its kind: code, document or data text', tk('a.vb', '').label === 'Code text' && tk('a.dat', '').label === 'Data text' && tk('README', '').label === 'Document text',
  [tk('a.vb', '').label, tk('a.dat', '').label, tk('README', '').label].join(', '));
check('line endings: LF, CRLF, CR, mixed and none',
  same(['a\nb\n', 'a\r\nb\r\n', 'a\rb\r', 'a\r\nb\n', 'a'].map((t) => tk('a.txt', t).endings), ['LF', 'CRLF', 'CR', 'mixed', null]));
check('lines are counted as the view numbers them, an ending of any kind ending one',
  same(['a\r\nb\r\n', 'x\ny', 'a\rb\r', 'a\rb', 'a\r\nb\nc\r', '', 'x'].map((t) => tk('a.txt', t).lines), [2, 2, 2, 2, 3, 0, 1]),
  JSON.stringify(['a\r\nb\r\n', 'x\ny', 'a\rb\r', 'a\rb', 'a\r\nb\nc\r', '', 'x'].map((t) => tk('a.txt', t).lines)));
check('a byte order mark, given or in the text', tk('a.txt', 'x', { bom: true }).bom === true && tk('a.txt', '\uFEFFx').bom === true && tk('a.txt', 'x').bom === false);
check('U+FFFD counted, and the one a cut may have split at the end left out',
  tk('a.txt', 'a\uFFFDb\uFFFD').invalid === 2 && tk('a.txt', 'a\uFFFDb\uFFFD', { cut: true }).invalid === 1);

/* ---------- topBySize, selectionRows ---------- */

let seed = 42;
const rnd = () => {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
};
let mismatch = 0;
for (let f = 0; f < 1000; f++) {
  const n = Math.floor(rnd() * 60);
  const kids = Array.from({ length: n }, (_, i) => ({ n: `f${Math.floor(rnd() * 20)}${rnd() < 0.2 ? 'A' : 'a'}`, s: Math.floor(rnd() * 8) * 100, i }));
  const k = 1 + Math.floor(rnd() * 12);
  const want = [...kids].sort(bySizeThenName).slice(0, k).map((x) => x.i);
  const got = topBySize(kids, k).map((x) => x.i);
  if (!same(want, got)) mismatch++;
}
check('topBySize equals a full sort\'s first k over 1,000 random folders, ties by name and then as they came', mismatch === 0, `${mismatch} differ`);
const few = [{ n: 'b', s: 5 }, { n: 'a', s: 5 }, { n: 'c', s: 9 }];
check('ties by name, and k beyond n gives them all', same(topBySize(few, 10).map((x) => x.n), ['c', 'a', 'b']) && topBySize(few, 0).length === 0);
check('names in numeric order on a tie', same(topBySize([{ n: 'f10', s: 1 }, { n: 'f9', s: 1 }, { n: 'F2', s: 1 }], 3).map((x) => x.n), ['F2', 'f9', 'f10']));
const sel = [{ n: 'small', s: 10 }, { n: 'big', s: 900 }, { n: 'mid', s: 90 }, { n: 'mid2', s: 90 }];
const sr = selectionRows(sel, 2);
check('selectionRows: largest first, cut at the cap, with what lies past it',
  same(sr.rows.map((x) => x.n), ['big', 'mid']) && sr.more === 2 && sr.moreBytes === 100, JSON.stringify({ rows: sr.rows.map((x) => x.n), more: sr.more, moreBytes: sr.moreBytes }));
const all = selectionRows(new Set(sel), 100);
check('a Set is taken as well, and nothing past a cap it never reaches', all.rows.length === 4 && all.more === 0 && all.moreBytes === 0);
const dir = { n: 'dir', s: 1000, d: true, p: null };
const inner = { n: 'inner', s: 400, p: dir };
const outer = { n: 'outer', s: 30, p: null };
check('selectionBytes counts an item inside a selected folder once', selectionBytes(new Set([dir, inner, outer])) === 1030 && selectionBytes(new Set([inner, outer])) === 430);

/* ---------- linkTarget ---------- */

const L = [
  ['relative, inside', linkTarget('edge cases/link-to-copy-a', 'copy-a.dat', { root: '/r', sep: '/' }), { rel: 'edge cases/copy-a.dat' }],
  ['relative, up and over', linkTarget('Projects/current', '../Projects/tidepool-web', { root: '/r', sep: '/' }), { rel: 'Projects/tidepool-web' }],
  ['relative, climbing out', linkTarget('a/link', '../../etc/passwd', { root: '/r', sep: '/' }), { outside: true }],
  ['relative at the root, climbing out', linkTarget('link', '..', { root: '/r', sep: '/' }), { outside: true }],
  ['.', linkTarget('a/b/link', '.', { root: '/r', sep: '/' }), { rel: 'a/b' }],
  ['absolute inside, /', linkTarget('x', '/home/me/data/edge cases/copy-a.dat', { root: '/home/me/data', sep: '/' }), { rel: 'edge cases/copy-a.dat' }],
  ['absolute, the root itself', linkTarget('x', '/home/me/data', { root: '/home/me/data', sep: '/' }), { rel: '' }],
  ['absolute outside, /', linkTarget('x', '/home/me/database', { root: '/home/me/data', sep: '/' }), { outside: true }],
  ['absolute inside, \\', linkTarget('x', 'C:\\Users\\me\\data\\edge cases\\copy-a.dat', { root: 'C:\\Users\\me\\data', sep: '\\' }), { rel: 'edge cases/copy-a.dat' }],
  ['absolute inside, \\, another case', linkTarget('x', 'c:\\users\\ME\\Data\\a.txt', { root: 'C:\\Users\\me\\data', sep: '\\' }), { rel: 'a.txt' }],
  ['absolute inside, a \\\\?\\ prefix', linkTarget('x', '\\\\?\\C:\\Users\\me\\data\\a.txt', { root: 'C:\\Users\\me\\data', sep: '\\' }), { rel: 'a.txt' }],
  ['absolute outside, \\', linkTarget('x', 'C:\\Users\\me\\other\\a.txt', { root: 'C:\\Users\\me\\data', sep: '\\' }), { outside: true }],
  ['another drive', linkTarget('x', 'D:\\Users\\me\\data\\a.txt', { root: 'C:\\Users\\me\\data', sep: '\\' }), { outside: true }],
  ['a drive root', linkTarget('x', 'C:\\Windows\\a.txt', { root: 'C:\\', sep: '\\' }), { rel: 'Windows/a.txt' }],
  ['relative, \\', linkTarget('a/b', '..\\c\\d.txt', { root: 'C:\\r', sep: '\\' }), { rel: 'c/d.txt' }],
  ['empty', linkTarget('x', '', { root: '/r', sep: '/' }), { unknown: true }],
  ['null', linkTarget('x', null, { root: '/r', sep: '/' }), { unknown: true }],
];
const lbad = L.filter(([, got, want]) => !same(got, want));
check(`linkTarget reads ${L.length} links lexically`, lbad.length === 0, lbad.map(([w, g]) => `${w}: ${JSON.stringify(g)}`).join(' | '));

/* ---------- stepping ---------- */

check('STEPS: the arrows, Home and End', same(STEPS, { ArrowLeft: -1, ArrowRight: 1, Home: 'first', End: 'last' }) && Object.isFrozen(STEPS));
const S5 = [stepIndex(5, 2, 1), stepIndex(5, 4, 1), stepIndex(5, 0, -1), stepIndex(5, 3, 'first'), stepIndex(5, 0, 'first'), stepIndex(5, 4, 'last'), stepIndex(5, -1, 1), stepIndex(5, -1, 'last')];
check('stepIndex: next, the ends, Home and End, and an item the list does not hold',
  same(S5, [{ j: 3 }, { edge: 'last' }, { edge: 'first' }, { j: 0 }, { edge: 'first' }, { edge: 'last' }, { missing: true }, { j: 4 }]), JSON.stringify(S5));
const pane = { scrollLeft: 0, scrollTop: 0, clientWidth: 100, scrollWidth: 300, clientHeight: 100, scrollHeight: 100 };
const before = ['ArrowLeft', 'ArrowRight', 'Home', 'End'].map((k) => canScroll(pane, k));
pane.scrollLeft = 200;
const after = ['ArrowLeft', 'ArrowRight'].map((k) => canScroll(pane, k));
check('canScroll: sideways for the arrows, up and down for Home and End, and nothing at an edge',
  same(before, [false, true, false, false]) && same(after, [true, false]) && canScroll(pane, 'x') === false);
const calls = [];
const media = { pause: () => calls.push('pause'), removeAttribute: (a) => calls.push(`remove ${a}`), load: () => calls.push('load') };
stopPlayer(media);
stopPlayer(null);
check('stopPlayer pauses, lets the source go and loads nothing', same(calls, ['pause', 'remove src', 'load']));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
