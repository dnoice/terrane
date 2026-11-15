/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Cleanup Rules Test (Terrane Edition - v1.0)
 *     - File Name: cleanup-test.mjs
 *     - Relative Path: tools/cleanup-test.mjs
 *     - Artifact Type: test
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
 *     Checks the Cleanup tab's rules (web/js/reclaim.js) in Node, with no
 *     browser: which folders count as caches and build output, what a walk
 *     lists and leaves alone, which copy a duplicate set keeps and that it
 *     is never moved, the ranking and the totals, and that the page's walk
 *     and the service's cleanup question give the same answer.
 *
 * ✒ Key Features:
 *     - Every one of the 18 names matches in any case; dist, build, target
 *       and coverage only beside their project file; a link or a sealed
 *       folder never
 *     - Nothing inside a matched cache, or inside .git, is listed again
 *     - Duplicates: keepOf newest and oldest with ties to the first; the
 *       kept copy in no group; a copy inside a cache left to it and the
 *       keep chosen among the rest; sets outside the folder, a kept copy
 *       outside it, sampled sets and unverified ones counted as pending
 *     - Big and stale: the quick search's query, its two thresholds as
 *       runSearch reads them, files only, never a copy a set keeps
 *     - Empty folders: truly empty listed; hidden-only counted, not listed;
 *       sealed folders, the folder walked and the root never
 *     - Ranking by bytes, ties in a fixed order, Empty folders last; items
 *       by size then path; totals without what is left out, the whole the
 *       plain sum of the groups; MOVE_MAX caps one press
 *     - Parity: reclaim.walk over a model.js Model equals questions.js's
 *       cleanup over a ColumnTree of the same 20,000 entries, for the root
 *       and a folder; bad input refused with ENOFOLDER; 100,000 entries
 *       walked in under 50 ms
 *
 * ✒ Usage Instructions:
 *     node tools/cleanup-test.mjs
 *     npm test runs it after the preview readers test.
 *
 * ✒ Other Important Information:
 *     - Dependencies: Node.js 22.5+; web/js/reclaim.js, web/js/model.js,
 *       web/js/presets.js, web/js/columns.js, web/js/questions.js,
 *       tools/make-synthetic.mjs
 *     - Compatible platforms: Windows, macOS, Linux
 *     - Exit code 0 means every check passed
 * ----------------------------------------------------------------------------
 */

import fs from 'node:fs';

const RC = await import(new URL('../web/js/reclaim.js', import.meta.url).href);
const { Model, parseQuery, runSearch, relPath, FLAG_LINK, FLAG_HIDDEN } = await import(new URL('../web/js/model.js', import.meta.url).href);
const { PRESETS } = await import(new URL('../web/js/presets.js', import.meta.url).href);
const C = await import(new URL('../web/js/columns.js', import.meta.url).href);
const Q = await import(new URL('../web/js/questions.js', import.meta.url).href);
const G = await import(new URL('./make-synthetic.mjs', import.meta.url).href);

let passed = 0;
let failed = 0;
const check = (name, ok, detail = '') => {
  if (ok) passed++;
  else failed++;
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${name}${ok || !detail ? '' : ` — ${String(detail).slice(0, 500)}`}`);
};
const section = (title) => console.log(`\n${title}`);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const NOW = 1794744000000;
const DAY = 86400000;
const MB = 1024 * 1024;
const realNow = Date.now;
Date.now = () => NOW;

/**
 * Scan records from a nested spec: a key ending in "/" is a folder (its
 * value a spec, or { $err: 'EACCES' } for one that cannot be read), any
 * other a file: [size, ageDays, flags].
 */
function recordsOf(spec, name = 'root') {
  const recs = [];
  let next = 0;
  const visit = (node, pid, nm) => {
    const id = next++;
    const files = [];
    const subs = [];
    for (const [k, v] of Object.entries(node)) {
      if (k === '$err') continue;
      if (k.endsWith('/')) subs.push([k.slice(0, -1), v]);
      else files.push(k, v[0], NOW - v[1] * DAY, v[2] ?? (k.startsWith('.') ? FLAG_HIDDEN : 0));
    }
    recs.push([id, pid, nm, NOW - DAY, node.$err || 0, files]);
    for (const [k, v] of subs) visit(v, id, k);
  };
  visit(spec, -1, name);
  return [recs];
}
function modelOf(spec) {
  const model = new Model('root');
  const idMap = [];
  for (const b of recordsOf(spec)) model.ingest(b, idMap, model.root);
  return model;
}
const rels = (list) => list.items.map((i) => i.rel);
const walkAt = (model, rel = '') => RC.walk(rel ? model.find(rel) : model.root, RC.modelAccess);

/* ---------- 1. the names ---------- */

section('1. Caches and build output by name');
{
  const all = new Set(RC.CACHE_RULES.flatMap((r) => r.beside || []).map((b) => b.toLowerCase()));
  const misses = RC.CACHE_RULES.filter((r) => !RC.cacheRule(r.id.toUpperCase(), all) || !RC.cacheRule(r.id, all));
  check(`every one of the ${RC.CACHE_RULES.length} names matches, in any case`, RC.CACHE_RULES.length === 18 && misses.length === 0, misses.map((r) => r.id).join(', '));
  const gated = ['dist', 'build', 'target', 'coverage'];
  const bare = gated.filter((n) => RC.cacheRule(n, new Set(['readme.md', 'plans.pdf'])));
  check('dist, build, target and coverage do not match without their project file beside them', bare.length === 0, bare.join(', '));
  const withIt = { dist: 'package.json', build: 'CMakeLists.txt', target: 'Cargo.toml', coverage: 'package.json' };
  const hits = gated.map((n) => RC.cacheRule(n, new Set([withIt[n].toLowerCase()])));
  check('and match beside it, giving their words', hits.every(Boolean) && hits[1].words === 'build output, made again by the build' && hits[3].words === 'test coverage, made again by the tests');
  check('names never listed: .venv, venv, .git and out', ['.venv', 'venv', '.git', 'out'].every((n) => !RC.cacheRule(n, all)));

  const m = modelOf({
    'node_modules': [10, 1, FLAG_LINK],
    'p/': { 'node_modules/': { $err: 'EACCES' }, 'package.json': [100, 1], 'build/': { 'a.js': [1000, 1] } },
    'q/': { 'build/': { 'plans.pdf': [5000, 1] } },
  });
  const w = walkAt(m);
  check('a link named node_modules and a sealed node_modules are not caches; build beside package.json is, by its words',
    same(rels(w.caches), ['p/build']) && w.caches.items[0].why === 'build beside package.json' && w.sealedCaches === 1, JSON.stringify(w.caches.items.map((i) => [i.rel, i.why])));
  check('a build folder of plans with no project file is not a cache', !rels(w.caches).includes('q/build'));
}

/* ---------- 2. nesting ---------- */

section('2. Nothing listed twice');
{
  const m = modelOf({
    'app/': {
      'package.json': [200, 10],
      'node_modules/': { '.cache/': { 'x.bin': [5000, 3] }, 'huge.bin': [300 * MB, 800], 'hollow/': {}, 'build/': { 'o.js': [10, 1] } },
      '.git/': { 'objects/': { 'pack.pack': [200 * MB, 900] }, 'refs/': { 'tags/': {} } },
    },
  });
  const w = walkAt(m);
  check('.cache, build and an empty folder inside node_modules are not listed; node_modules is, once', same(rels(w.caches), ['app/node_modules']) && w.empty.total === 0, JSON.stringify([rels(w.caches), rels(w.empty)]));
  check('a 300 MB stale file inside node_modules is not big and stale', w.stale.total === 0);
  check('nothing inside .git is listed: not its 200 MB pack, not its empty refs/tags', w.vcs === 1 && w.stale.total === 0 && w.empty.total === 0);
  check('claimed names the cache\'s path', same(w.claimed, ['app/node_modules']));
}

/* ---------- 3. duplicates ---------- */

section('3. Duplicates');
{
  const f = (rel, m, s = 1000) => ({ rel, n: rel.split('/').pop(), s, m });
  const g = (files, extra = {}) => ({ verified: true, files, ...extra });
  const a = f('x/a', 1);
  const b = f('x/b', 3);
  const c = f('x/c', 3);
  check('keepOf newest keeps the latest change, the first listed on a tie', RC.keepOf({ files: [a, b, c] }, 'newest') === b);
  check('keepOf oldest keeps the earliest change', RC.keepOf({ files: [b, a, c] }, 'oldest') === a);
  const dupesSrc = fs.readFileSync(new URL('../web/js/dupes.js', import.meta.url), 'utf8');
  check('duplicate cleanup keeps by the same rule: dupes.js re-exports reclaim.js\'s keepOf and uses it', /export \{ keepOf \} from '\.\/reclaim\.js'/.test(dupesSrc) && /keepBy\(group, how\)/.test(dupesSrc));

  const d1 = RC.dupSuggestions([g([a, b, c])], '', [], 'newest');
  const s1 = d1.sets[0];
  check('a set keeps one copy, shown apart, and suggests the others', d1.sets.length === 1 && s1.keep === b && same(s1.copies.map((x) => x.rel), ['x/a', 'x/c']) && s1.waste === 2000);
  const groups = RC.combine({ caches: { total: 0, bytes: 0, items: [] }, stale: { total: 0, bytes: 0, items: [] }, empty: { total: 0, bytes: 0, items: [] }, claimed: [] }, d1);
  check('the kept copy is in no group', groups.every((gr) => gr.items.every((it) => it.rel !== 'x/b')));

  // A copy inside a suggested cache is left to it; the keep is chosen among the rest.
  const inCache = f('p/node_modules/lib/a', 9);
  const d2 = RC.dupSuggestions([g([f('p/a', 1), f('p/b', 2), inCache])], 'p', ['p/node_modules'], 'newest');
  check('a copy under a claimed cache is dropped and the keep chosen among the rest',
    d2.sets.length === 1 && d2.sets[0].keep.rel === 'p/b' && same(d2.sets[0].copies.map((x) => x.rel), ['p/a']), JSON.stringify(d2.sets.map((s) => [s.keep.rel, s.copies.map((x) => x.rel)])));
  const d2b = RC.dupSuggestions([g([f('p/a', 1), inCache])], 'p', ['p/node_modules'], 'newest');
  check('a set left with one copy outside the cache is not listed, so moving the cache never takes the last copy', d2b.sets.length === 0);
  const d2c = RC.dupSuggestions([g([f('p/a', 1), f('elsewhere/node_modules/z/a', 9)])], 'p', [], 'newest');
  check('a copy outside the folder inside a folder named as a cache is never the keep', d2c.sets.length === 0);

  const d3 = RC.dupSuggestions([g([f('in/a', 1), f('out/b', 2), f('out/c', 3)])], 'in', [], 'oldest');
  check('a set whose copies other than the keep are all outside the folder is not listed', d3.sets.length === 0);
  const d4 = RC.dupSuggestions([g([f('in/a', 1), f('out/b', 5)])], 'in', [], 'newest');
  check('a kept copy outside the folder is shown, and the copy inside suggested', d4.sets.length === 1 && d4.sets[0].keep.rel === 'out/b' && same(d4.sets[0].copies.map((x) => x.rel), ['in/a']));
  const d5 = RC.dupSuggestions([g([f('s/a', 1, 9e8), f('s/b', 2, 9e8)], { mode: 'sampled' }), { verified: false, files: [f('s/u', 1), f('s/v', 1)] }, { verified: false, files: [f('o/u', 1), f('o/v', 1)] }], 's', [], 'newest');
  check('a sampled set is flagged; unverified sets are counted as pending, only those with a member here', d5.sets.length === 1 && d5.sets[0].sampled && d5.pending === 1);
  const d6 = RC.dupSuggestions([g([f('r/.git/objects/a', 1), f('r/a', 2), f('r/b', 3)])], '', [], 'oldest');
  check('a copy inside .git is never kept or suggested', d6.sets.length === 1 && d6.sets[0].keep.rel === 'r/a' && same(d6.sets[0].copies.map((x) => x.rel), ['r/b']));
}

/* ---------- 4. big and stale ---------- */

section('4. Big and stale');
{
  const big = PRESETS.find((p) => p.id === 'big-stale');
  check(`the quick search's query is BIG_STALE.query (${RC.BIG_STALE.query})`, big?.query === RC.BIG_STALE.query && RC.BIG_STALE.query === '>100mb older:1y');
  const m = modelOf({
    'at-100mb.bin': [100 * MB, 800],
    'over-100mb.bin': [100 * MB + 1, 800],
    'year-less-a-day.bin': [200 * MB, 364],
    'year-and-a-day.bin': [200 * MB, 367],
    'old-folder/': { 'small.txt': [10, 3000] },
    'link.bin': [0, 3000, FLAG_LINK],
  });
  const w = walkAt(m);
  const want = runSearch(m, parseQuery(`${RC.BIG_STALE.query} is:file`)).list.map(relPath).sort();
  check(`the 100 MB and one-year boundaries agree with runSearch (${rels(w.stale).join(', ')})`, same(rels(w.stale).sort(), want) && same(want, ['over-100mb.bin', 'year-and-a-day.bin']), JSON.stringify([rels(w.stale), want]));
  check('folders are never listed as big and stale', w.stale.items.every((i) => !i.d));
  const keepStale = RC.dupSuggestions([{ verified: true, files: [{ rel: 'over-100mb.bin', n: 'over-100mb.bin', s: 100 * MB + 1, m: 9 }, { rel: 'x/copy.bin', n: 'copy.bin', s: 100 * MB + 1, m: 1 }] }], '', [], 'newest');
  const gs = RC.combine(w, keepStale);
  check('a file a duplicate set keeps is not listed as big and stale as well', !gs.find((x) => x.id === 'stale').items.some((i) => i.rel === 'over-100mb.bin'));
}

/* ---------- 5. empty folders ---------- */

section('5. Empty folders');
{
  const m = modelOf({
    'scope/': {
      'empty/': {},
      'deep/': { 'emptier/': {} },
      'only-hidden/': { '.DS_Store': [6148, 30] },
      'sealed/': { $err: 'EACCES' },
      'full/': { 'a.txt': [5, 1] },
    },
    'top-empty/': {},
  });
  const w = walkAt(m, 'scope');
  check('truly empty folders are listed', same(rels(w.empty).sort(), ['scope/deep/emptier', 'scope/empty']), JSON.stringify(rels(w.empty)));
  check('a folder holding only hidden files is counted, not listed', w.hiddenOnly === 1 && !rels(w.empty).includes('scope/only-hidden'));
  check('a sealed folder, the folder walked and folders outside it are not listed', !rels(w.empty).some((r) => r === 'scope/sealed' || r === 'scope' || r === 'top-empty'));
  const e = modelOf({});
  check('the root, empty, is not listed', walkAt(e).empty.total === 0);
}

/* ---------- 6. ranking and totals ---------- */

section('6. Ranking and totals');
{
  const list = (items) => ({ total: items.length, bytes: items.reduce((a, i) => a + i.s, 0), items });
  const it = (rel, s, d = false) => ({ rel, name: rel, s, m: 0, d });
  const w = { caches: list([it('c/b', 50, true), it('c/a', 50, true), it('c/z', 70, true)]), stale: list([it('s/x', 400)]), empty: list([it('e/1', 0, true), it('e/2', 0, true)]), claimed: [] };
  const d = { sets: [{ keep: { rel: 'k' }, copies: [{ rel: 'd/1', n: '1', s: 30, m: 0 }], waste: 30 }], pending: 0 };
  const gs = RC.combine(w, d);
  check(`groups by the bytes they free: ${gs.map((x) => x.id).join(', ')}`, same(gs.map((x) => x.id), ['stale', 'caches', 'dups', 'empty']));
  const ties = RC.combine({ caches: list([]), stale: list([]), empty: list([it('e', 0, true)]), claimed: [] }, { sets: [], pending: 0 });
  check(`ties fall in the fixed order, Empty folders last: ${ties.map((x) => x.id).join(', ')}`, same(ties.map((x) => x.id), ['dups', 'stale', 'caches', 'empty']));
  const m = modelOf({ 'p/': { 'node_modules/': { 'a': [10, 1] }, 'package.json': [5, 1], 'build/': { 'b': [10, 1] }, 'dist/': { 'c': [99, 1] } } });
  const ww = walkAt(m);
  check('items by size, then by path', same(rels(ww.caches), ['p/dist', 'p/build', 'p/node_modules']), JSON.stringify(rels(ww.caches)));
  const out = new Set(['c/z', 'd/1']);
  const t = RC.totals(gs, out);
  const sum = [...t.by.values()].reduce((a, x) => ({ count: a.count + x.count, bytes: a.bytes + x.bytes }), { count: 0, bytes: 0 });
  check(`totals leave out what is left out (${t.count} items, ${t.bytes} bytes)`, t.count === 5 && t.bytes === 500 && t.by.get('caches').count === 2 && t.by.get('dups').count === 0);
  check('the whole is the plain sum of the groups, which share no item', sum.count === t.count && sum.bytes === t.bytes
    && new Set(gs.flatMap((x) => x.items.map((i) => i.rel))).size === gs.reduce((a, x) => a + x.items.length, 0));
  const many = Array.from({ length: 6200 }, (_, i) => it(`m/${i}`, 1));
  const mp = RC.movePaths(many, new Set(['m/0']));
  check(`MOVE_MAX caps one press (${mp.paths.length} of ${mp.all})`, RC.MOVE_MAX === 5000 && mp.paths.length === 5000 && mp.cut && mp.all === 6199 && mp.paths[0] === 'm/1');
}

/* ---------- 7. parity with the service ---------- */

section('7. The page\'s walk and the service\'s question agree');
const ctx = { v: 1, parts: (r) => String(r).split('/').filter(Boolean) };
{
  const batches = [];
  for (const b of G.generate({ entries: 20000, seed: 7, now: NOW })) batches.push(b);
  const model = new Model('synthetic');
  const idMap = [];
  for (const b of batches) model.ingest(b, idMap, model.root);
  const tree = C.treeFrom(batches, { name: 'synthetic', anchor: NOW });
  // A folder with something in each list, else the largest first-level one.
  const firsts = model.root.c.filter((c) => c.d).sort((x, y) => y.s - x.s);
  const sub = firsts.find((x) => RC.walk(x, RC.modelAccess).caches.total > 0) || firsts[0];
  for (const rel of ['', relPath(sub)]) {
    const w = RC.walk(rel ? model.find(rel) : model.root, RC.modelAccess, { keepCap: 1000 });
    const a = Q.ask(tree, 'cleanup', { under: rel, limit: '1000' }, ctx);
    const pick = (l) => ({ total: l.total, bytes: l.bytes, rels: l.items.map((i) => i.rel) });
    const fromQ = (l) => ({ total: l.total, bytes: l.bytes, rels: l.items.map((t) => t[0]) });
    const bad = ['caches', 'stale', 'empty'].filter((k) => !same(pick(w[k]), fromQ(a[k])));
    const whys = same(w.caches.items.map((i) => i.why), a.caches.items.map((t) => t[12]));
    check(`${rel || 'the root'}: caches ${w.caches.total}, big and stale ${w.stale.total}, empty ${w.empty.total}, hidden-only ${w.hiddenOnly}: the same lists, totals, rules and claimed paths`,
      bad.length === 0 && whys && w.hiddenOnly === a.hiddenOnly && w.sealedCaches === a.sealedCaches && w.vcs === a.vcs && same(w.claimed.slice(0, 1000), a.claimed) && a.under === rel,
      `${bad.join(', ')} ${JSON.stringify([w.hiddenOnly, a.hiddenOnly, w.vcs, a.vcs])}`);
  }
  check('the synthetic tree holds caches to compare', RC.walk(model.root, RC.modelAccess).caches.total > 0);

  const refused = (under, extra = {}) => {
    try {
      Q.ask(tree, 'cleanup', { under, ...extra }, ctx);
      return null;
    } catch (err) {
      return `${err.code} ${err.status}`;
    }
  };
  const aFile = relPath(model.root.c.find((c) => !c.d) || firsts[0].c.find((c) => !c.d));
  const bads = ['../x', 'nope/not-there', aFile, 'a/../b'].map((u) => [u, refused(u)]);
  check(`a climbing path, a missing folder and a file are 404 ENOFOLDER (${bads.map((b) => b[1]).join('; ')})`, bads.every(([, r]) => r === 'ENOFOLDER 404'), JSON.stringify(bads));
  const big = Q.ask(tree, 'cleanup', { under: '', limit: '99999' }, ctx);
  const none = Q.ask(tree, 'cleanup', { under: '', limit: '-4' }, ctx);
  check('limit is clamped to 0 .. 1,000', big.stale.items.length <= 1000 && none.stale.items.length === 0 && none.stale.total === big.stale.total);
  check('a limit that is not a number is EBADREQ 400', refused('', { limit: 'lots' }) === 'EBADREQ 400');
  check('cleanup is one of the routes the service, the demo and the worker answer', Q.QUESTION_ROUTES.includes('cleanup') && C.ROUTES.includes('cleanup'));
  const viaAnswer = await C.answer(tree, 'cleanup', { v: '1', under: '' }, { v: 1 });
  check('columns.js answer() passes it through, behind the generation check', viaAnswer.status === 200 && viaAnswer.json.v === 1
    && (await C.answer(tree, 'cleanup', { v: '2', under: '' }, { v: 1 }).then(() => null, (e) => e.code)) === 'ESTALE');
}

/* ---------- 8. time ---------- */

section('8. Time');
{
  const batches = [];
  for (const b of G.generate({ entries: 100000, seed: 3, now: NOW })) batches.push(b);
  const model = new Model('synthetic');
  const idMap = [];
  for (const b of batches) model.ingest(b, idMap, model.root);
  RC.walk(model.root, RC.modelAccess);
  let best = Infinity;
  for (let i = 0; i < 3; i++) {
    const t0 = performance.now();
    RC.walk(model.root, RC.modelAccess);
    best = Math.min(best, performance.now() - t0);
  }
  check(`100,000 entries walked in under 50 ms (${best.toFixed(1)} ms)`, best < 50);
}

Date.now = realNow;
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
