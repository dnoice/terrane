#!/usr/bin/env node
/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Finding Your Way Test (Terrane Edition - v1.0)
 *     - File Name: finding-test.mjs
 *     - Relative Path: tools/finding-test.mjs
 *     - Artifact Type: test
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
 *     Runs the DOM-free halves of the command palette, the remembered view
 *     and the search memory in Node: the fuzzy ranking (web/js/fuzzy.js)
 *     and the keys, kept views, links, history and saved searches
 *     (web/js/memory.js). It proves neither needs a page.
 *
 * ✒ Key Features:
 *     - Ranking: a prefix and a word start beat a match in mid-word, a
 *       camel hump counts as a word start, a name the query is not a
 *       subsequence of is left out, the limit holds, equal scores keep
 *       the list's order, and a query with '/' matches paths
 *     - Speed: 200,000 names ranked in under 150 ms, the best of three
 *     - Storage keys for the live directory and for a snapshot of it
 *     - readView refuses '..', '.', absolute paths, wrong types, unknown
 *       lenses and a pose that is not finite, and keeps a good view whole
 *     - The history: newest first, a repeat moves up, at most 20, empty
 *       and overlong queries left out; stepping up, down and back to the
 *       draft
 *     - Saved searches: add, replace by name, forget and put back, the
 *       cap of 50, mergeSaved's counts, two tabs merged, and a storage
 *       that throws reported once while the store works in memory
 *     - Links: hashFor and relOfHash round trips for spaces, # % ?,
 *       Unicode, emoji and leading dashes; malformed hashes give null
 *
 * ✒ Usage Instructions:
 *     node tools/finding-test.mjs
 *     npm test runs it after the interior test.
 *
 * ✒ Other Important Information:
 *     - Dependencies: Node.js 22+; web/js/fuzzy.js and web/js/memory.js
 *     - Compatible platforms: Windows, macOS, Linux
 *     - Exit code 0 means every check passed
 * ----------------------------------------------------------------------------
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.join(HERE, '..', 'web', 'js');
const { score, rank } = await import(new URL('../web/js/fuzzy.js', import.meta.url).href);
const M = await import(new URL('../web/js/memory.js', import.meta.url).href);
const { viewKey, searchKey, readView, viewRecord, hashFor, relOfHash, pushHistory, HistoryWalk, Searches, HISTORY_MAX, SAVED_MAX, NAME_MAX, MAX_SEL } = M;

let passed = 0;
let failed = 0;
const check = (name, cond, detail = '') => {
  if (cond) passed++;
  else failed++;
  console.log(`${cond ? '  ok  ' : ' FAIL '} ${name}${cond || !detail ? '' : ' — ' + detail}`);
};
const section = (title) => console.log(`\n${title}`);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** A storage object over a Map, counting writes. */
function memoryStorage() {
  const map = new Map();
  return {
    map, writes: 0,
    getItem(k) { return map.has(k) ? map.get(k) : null; },
    setItem(k, v) { this.writes++; map.set(k, String(v)); },
    removeItem(k) { map.delete(k); },
  };
}

/* ---------- fuzzy ranking ---------- */

section('Fuzzy ranking');
{
  const names = ['prepare.md', 'my-report.txt', 'report.pdf', 'Reports', 'paper.txt', 'zebra.png'];
  const got = rank('rep', names, { limit: 10 }).map((r) => r.item);
  check('a prefix beats a word start, which beats a match in mid-word', got[0] === 'report.pdf' || got[0] === 'Reports', JSON.stringify(got));
  check('both beat the mid-word match', got.indexOf('my-report.txt') < got.indexOf('prepare.md') && got.indexOf('report.pdf') < got.indexOf('my-report.txt'), JSON.stringify(got));
  check('a name the query is not a subsequence of is left out', !got.includes('zebra.png') && !got.includes('paper.txt') && score('rep', 'zebra.png') === -Infinity, JSON.stringify(got));
  check('a camel hump counts as a word start', score('mr', 'MyReport') > score('mr', 'summary'), `${score('mr', 'MyReport')} ${score('mr', 'summary')}`);
  check('after - _ . and a space a letter starts a word', ['a-bc', 'a_bc', 'a.bc', 'a bc'].every((s) => score('b', s) > score('b', 'abc')));
  check('a run of consecutive characters beats the same characters spread out', score('lens', 'Lens: age') > score('lens', 'Look inside a zip archive / close it'));
  check('a shorter name wins on an otherwise equal match', score('abc', 'abc') > score('abc', 'abcdefghij'));
  check('matching ignores case', score('REP', 'report') === score('rep', 'REPORT') || Number.isFinite(score('REP', 'report')));
  const many = Array.from({ length: 300 }, (_, i) => `file-${i}.txt`);
  const top = rank('file', many, { limit: 40 });
  check('the limit holds', top.length === 40 && rank('file', many, { limit: 3 }).length === 3);
  check('equal scores keep the list\'s order', top.slice(0, 10).every((r, i, a) => i === 0 || r.score < a[i - 1].score || many.indexOf(r.item) > many.indexOf(a[i - 1].item)), JSON.stringify(top.slice(0, 4)));
  check('an empty query matches nothing', rank('', many).length === 0);
  const paths = [
    { p: 'docs/2024/raw/notes.md' }, { p: 'archive/docs-raw.zip' }, { p: 'media/raw/clip.mov' },
  ];
  const byPath = rank('docs/raw', paths, { limit: 5, key: (x) => x.p }).map((r) => r.item.p);
  check('a query with a slash matches paths: docs/raw finds the file under docs/…/raw first', byPath[0] === 'docs/2024/raw/notes.md' && !byPath.includes('media/raw/clip.mov'), JSON.stringify(byPath));
  const lowered = rank('notes', paths, { key: (x) => x.p, lower: (x) => x.p.toLowerCase() }).map((r) => r.item.p);
  check('lower() may hand in the lower-cased text', same(lowered, ['docs/2024/raw/notes.md']), JSON.stringify(lowered));

  // Speed: 200,000 names, ranked the way the palette ranks places.
  const WORDS = 'assets archive audio build cache client core data design docs drafts export fonts icons images lib logs media models notes plates raw render scripts server shared src stems tests textures tools vendor video'.split(' ');
  const EXTS = 'js ts py md json css html svg png jpg psd wav flac mp3 mp4 mov zip pdf txt csv yml blend ttf bin log'.split(' ');
  let seed = 7;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) >>> 0;
    return seed / 4294967296;
  };
  const big = Array.from({ length: 200000 }, (_, i) => {
    const n = `${WORDS[Math.floor(rnd() * WORDS.length)]}_${i.toString(36)}.${EXTS[Math.floor(rnd() * EXTS.length)]}`;
    return { n, l: n.toLowerCase() };
  });
  const times = [];
  let found = 0;
  for (let k = 0; k < 3; k++) {
    const t0 = performance.now();
    for (const q of ['ren', 'docs', 'tex_1']) found = rank(q, big, { limit: 40, key: (x) => x.n, lower: (x) => x.l }).length;
    times.push((performance.now() - t0) / 3);
  }
  const best = Math.min(...times);
  check(`200,000 names ranked in under 150 ms, the best of three (${best.toFixed(1)} ms a query; ${times.map((t) => t.toFixed(1)).join(', ')})`, best < 150 && found > 0, `${best} ms`);
}

/* ---------- keys and the kept view ---------- */

section('The kept view');
{
  check('the view and search keys name the directory, and a snapshot keeps its own',
    viewKey('C:\\data') === 'terrane.view.v1|C:\\data' && viewKey('C:\\data', 'snapshot') === 'terrane.view.v1|C:\\data|snapshot'
    && searchKey('/srv/x') === 'terrane.searches.v1|/srv/x' && searchKey('/srv/x', 'snapshot') === 'terrane.searches.v1|/srv/x|snapshot' && viewKey('r', '') === viewKey('r'));
  const good = viewRecord({ focus: 'docs/2024', lens: 'age', tab: 'survey', sel: ['docs/2024/a.md', 'docs/2024/b.md'], primary: 'docs/2024/b.md', pose: { off: [0.1, 0.4, -0.2], yaw: 1, pitch: -0.5 }, at: 5 });
  const back = readView(JSON.stringify(good));
  check('a good view goes in and comes back whole', same(back, good), JSON.stringify(back));
  check('the root and no pose are a good view', !!readView(JSON.stringify(viewRecord({ focus: '', sel: [], pose: null }))));
  const bad = {
    '..': { focus: '../outside' },
    '.. inside': { focus: 'a/../../b' },
    '.': { focus: 'a/./b' },
    absolute: { focus: '/etc' },
    'empty segment': { focus: 'a//b' },
    'trailing slash': { focus: 'a/' },
    'a number': { focus: 5 },
    'a lens': { lens: 'heat' },
    'a tab': { tab: 7 },
    'a selection path': { sel: ['ok', '../x'] },
    'a selection type': { sel: 'ok' },
    'too many selected': { sel: Array.from({ length: MAX_SEL + 1 }, (_, i) => `f${i}`) },
    'a primary': { primary: '/x' },
    'a pose with NaN': { pose: { off: [0, Number.NaN, 0], yaw: 0, pitch: 0 } },
    'a pose short': { pose: { off: [0, 0], yaw: 0, pitch: 0 } },
    'a format': { format: 2 },
    'a time': { at: 'yesterday' },
  };
  const wrongly = Object.entries(bad).filter(([, patch]) => readView(JSON.stringify({ ...good, ...patch })) !== null).map(([k]) => k);
  check(`readView refuses ${Object.keys(bad).length} kinds of bad field, one at a time`, wrongly.length === 0, wrongly.join(', '));
  check('readView refuses text that is not JSON, null and a list', [null, '', '{', '[]', 'null', '42'].every((x) => readView(x) === null));
  const capped = viewRecord({ sel: Array.from({ length: 900 }, (_, i) => `f${i}`) });
  check(`a view to keep holds at most ${MAX_SEL} selected paths`, capped.sel.length === MAX_SEL);
}

/* ---------- links ---------- */

section('Links');
{
  const names = ['name with  spaces.txt', 'a#b', '100%', 'what?', 'ünïcødé — naïve café', '日本語', 'emoji 🗻 file', '-leading-dash', '--', 'x&y=z', "quote's", '.hidden'];
  const trips = names.map((n) => [n, relOfHash(hashFor(`edge cases/${n}`))]).filter(([n, r]) => r !== `edge cases/${n}`);
  check(`hashFor and relOfHash round-trip ${names.length} awkward names`, trips.length === 0, JSON.stringify(trips));
  check('every segment is percent-encoded: no # % ? or space is left bare', !/[#%?\s](?![0-9A-F]{2})/.test(hashFor('a#b/100%/q?/s p').slice(1).replace(/%[0-9A-F]{2}/g, '')), hashFor('a#b/100%/q?/s p'));
  check('the root is #/, and #/ and a trailing slash read back', hashFor('') === '#/' && relOfHash('#/') === '' && relOfHash('#/docs/') === 'docs');
  const malformed = ['', '#', '#docs', 'docs', '#/a//b', '#//a', '#/a/%E0%A4%A', '#/%', '#/..', '#/a/../b', '#/.', '#/a/%2E%2E', '#/a%2Fb', '#/a/%00', null, 7];
  const passedThrough = malformed.filter((h) => relOfHash(h) !== null);
  check(`${malformed.length} malformed hashes give null (bad escapes, empty segments, . and .., an encoded slash or NUL)`, passedThrough.length === 0, JSON.stringify(passedThrough));
}

/* ---------- history ---------- */

section('Search history');
{
  let h = [];
  for (const q of ['a', 'b', 'c']) h = pushHistory(h, q);
  check('newest first', same(h, ['c', 'b', 'a']));
  h = pushHistory(h, 'a');
  check('a repeat moves to the front, once', same(h, ['a', 'c', 'b']));
  check('empty, blank and overlong queries are left out', pushHistory(h, '') === h && pushHistory(h, '   ') === h && pushHistory(h, 'x'.repeat(501)) === h);
  check('a query is kept trimmed', pushHistory([], '  ext:md  ')[0] === 'ext:md');
  for (let i = 0; i < 30; i++) h = pushHistory(h, `q${i}`);
  check(`at most ${HISTORY_MAX}`, h.length === HISTORY_MAX && h[0] === 'q29');

  const list = ['newest', 'middle', 'oldest'];
  const w = new HistoryWalk();
  const steps = [w.older(list, 'typing'), w.older(list, 'x'), w.older(list, 'x'), w.older(list, 'x')];
  check('ArrowUp steps to older entries and stays on the oldest', same(steps, ['newest', 'middle', 'oldest', 'oldest']) && w.index === 2, JSON.stringify(steps));
  const down = [w.newer(list), w.newer(list), w.newer(list), w.newer(list)];
  check('ArrowDown steps to newer ones, then the draft, then is no longer claimed', same(down, ['middle', 'newest', 'typing', null]) && !w.stepping, JSON.stringify(down));
  check('with no history ArrowUp claims nothing', new HistoryWalk().older([], 'x') === null);
  w.older(list, 'draft two');
  w.reset();
  check('typing resets the walk', w.index === -1 && !w.stepping && w.newer(list) === null);
}

/* ---------- saved searches ---------- */

section('Saved searches');
{
  const st = memoryStorage();
  const KEY = searchKey('root');
  let clock = 1000;
  const make = (o = {}) => new Searches({ key: KEY, storage: () => st, now: () => ++clock, ...o }).load();
  const A = make();
  const r1 = A.save('Recent notes', 'ext:md newer:7d');
  check('save adds a search under its name', !r1.updated && A.saved.length === 1 && A.saved[0].name === 'Recent notes' && st.writes === 1);
  const r2 = A.save('recent NOTES', 'ext:md newer:30d');
  check('the same name, in any case, takes the new query and says it was updated', r2.updated && r2.prev.query === 'ext:md newer:7d' && A.saved.length === 1 && A.saved[0].query === 'ext:md newer:30d');
  check('a name is cut to 80 characters; an empty name or query is refused', A.save('n'.repeat(120), 'x').entry.name.length === NAME_MAX && !!A.save('  ', 'x').error && !!A.save('y', ' ').error);
  const f = A.forget(A.saved[0].id);
  check('forget takes it out and hands back what Undo needs', !!f && A.saved.length === 1 && f.at === 0 && f.entry.name === 'recent NOTES');
  check('and Undo puts it back where it was', A.reinstate(f.entry, f.at) && A.saved[0].name === 'recent NOTES' && A.saved.length === 2);
  for (let i = A.saved.length; i < SAVED_MAX; i++) A.save(`s${i}`, `q${i}`);
  const over = A.save('one too many', 'x');
  check(`a ${SAVED_MAX + 1}st is refused, and the list keeps ${SAVED_MAX}`, over.full === true && A.saved.length === SAVED_MAX);
  check('replacing a known name still works when full', A.save('s10', 'changed').updated === true && A.find('s10').query === 'changed');
  const B = make();
  check('what one store writes, another loads', B.saved.length === SAVED_MAX && B.find('s10')?.query === 'changed');

  // mergeSaved: an import's counts.
  const stC = memoryStorage();
  const C = new Searches({ key: 'c', storage: () => stC, now: () => ++clock }).load();
  C.save('keep', 'ext:md');
  C.save('change', 'ext:js');
  const counts = C.mergeSaved([
    { name: 'keep', query: 'ext:md' }, { name: 'CHANGE', query: 'ext:ts' }, { name: 'new one', query: 'is:empty' },
    { name: '', query: 'x' }, { name: 'no query', query: '' }, { name: 'bad', query: 7 }, null,
  ]);
  check('mergeSaved adds the new, updates a known name with another query, and skips the same query and the malformed',
    same(counts, { added: 1, updated: 1, skipped: 5 }) && C.find('change').query === 'ext:ts' && !!C.find('new one'), JSON.stringify(counts));
  const D = new Searches({ key: 'd', now: () => ++clock });
  for (let i = 0; i < SAVED_MAX; i++) D.save(`n${i}`, 'q');
  check('mergeSaved skips what does not fit', same(D.mergeSaved([{ name: 'extra', query: 'q' }]), { added: 0, updated: 0, skipped: 1 }));

  // History in the store, and two tabs on one storage.
  const st2 = memoryStorage();
  const T1 = new Searches({ key: KEY, storage: () => st2, now: () => ++clock }).load();
  const T2 = new Searches({ key: KEY, storage: () => st2, now: () => ++clock }).load();
  T1.push('one');
  T1.save('First', 'one');
  T2.push('two');
  T2.save('Second', 'two');
  const stored = Searches.parse(st2.getItem(KEY));
  check('a tab\'s write keeps the other tab\'s saved searches and history beside its own', same(stored.saved.map((s) => s.name).sort(), ['First', 'Second']) && same(stored.history, ['two', 'one']), JSON.stringify(stored));
  check('the other tab takes them in on sync', T1.sync() === true && T1.saved.length === 2 && T1.history.includes('two'));
  T1.forget(T1.find('Second').id);
  T2.sync();
  check('a search forgotten in one tab is gone from the other after sync', !T2.find('Second') && !!T2.find('First'));
  T2.push('three');
  check('and the other tab\'s next write does not bring it back', !Searches.parse(st2.getItem(KEY)).saved.some((s) => s.name === 'Second'));
  check('a repeat at the front writes nothing', (() => { const w = st2.writes; T2.push('three'); return st2.writes === w; })());

  // A storage that throws.
  const reports = [];
  const E = new Searches({ key: KEY, storage: () => { throw new Error('denied'); }, onFail: (why) => reports.push(why) }).load();
  E.push('a');
  E.save('x', 'a');
  E.push('b');
  check('a storage that throws is reported once, and the store works in memory', reports.length === 1 && /denied/.test(reports[0]) && same(E.history, ['b', 'a']) && E.saved.length === 1, JSON.stringify(reports));
  check('unreadable or foreign text is refused on load', Searches.parse('{') === null && Searches.parse('{"format":9}') === null
    && same(Searches.parse(JSON.stringify({ format: 1, history: ['ok', 5, '', 'ok'], saved: [{ id: 'a', name: 'n', query: 'q', at: 1 }, { id: 'a', name: 'dup', query: 'q', at: 1 }, { id: 'b', name: '', query: 'q', at: 1 }] })),
      { history: ['ok'], saved: [{ id: 'a', name: 'n', query: 'q', at: 1 }] }));
}

/* ---------- no DOM ---------- */

section('No DOM');
{
  for (const f of ['fuzzy.js', 'memory.js']) {
    const src = fs.readFileSync(path.join(WEB, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    const uses = ['document', 'window', 'localStorage', 'location', 'navigator', 'HTMLElement', 'requestAnimationFrame'].filter((w) => new RegExp(`\\b${w}\\b`).test(src));
    const imports = [...src.matchAll(/from '([^']+)'/g)].map((m) => m[1]);
    check(`${f} names no browser global and imports nothing`, uses.length === 0 && imports.length === 0, `${uses.join(', ')} ${imports.join(', ')}`);
  }
}

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
