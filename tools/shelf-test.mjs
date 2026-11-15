/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Shelf Store Test (Terrane Edition - v1.0)
 *     - File Name: shelf-test.mjs
 *     - Relative Path: tools/shelf-test.mjs
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
 *     Checks the Shelf's store (web/js/shelf-store.js) in Node, with no
 *     browser: its key, the paths it accepts, adding, taking off,
 *     clearing and putting back, following renames and moves, reading
 *     what was kept, two tabs on one storage, storage that refuses, the
 *     pure helpers and how fast it is at its cap.
 *
 * ✒ Key Features:
 *     - shelfKey with and without a snapshot
 *     - normRel: unicode, spaces, # and % accepted; the root, a leading
 *       or trailing slash, an empty, '.' or '..' segment, a NUL, a number
 *       and 4,097 characters refused
 *     - add: an exact duplicate already there, case kept apart, newest
 *       first, refused counted, 1,200 cut to 1,000
 *     - remove, has, clear and restore: order kept, items added since
 *       skipped, the cap held
 *     - follow: a rename, a folder with what is inside it, move pairs,
 *       Undo's pairs back, a collapse keeping one, bad pairs ignored
 *     - parse: bad JSON, another format, malformed and repeated entries,
 *       more than 1,000 items, figures that are not finite
 *     - Two stores on one storage merge their additions and a removal
 *       holds; getItem and setItem that throw report once and the store
 *       goes on in memory
 *     - tops, commonFolder and summary, nested items counted once
 *     - follow and parse of 1,000 items under 50 ms
 *
 * ✒ Usage Instructions:
 *     node tools/shelf-test.mjs
 *     npm test runs it after the cleanup rules test.
 *
 * ✒ Other Important Information:
 *     - Dependencies: Node.js 22.5+; web/js/shelf-store.js, web/js/memory.js
 *     - Compatible platforms: Windows, macOS, Linux
 *     - Exit code 0 means every check passed
 * ----------------------------------------------------------------------------
 */

const SH = await import(new URL('../web/js/shelf-store.js', import.meta.url).href);
const { Shelf, shelfKey, normRel, tops, commonFolder, summary, parentOf, SHELF_MAX, REL_MAX } = SH;

let passed = 0;
let failed = 0;
const check = (name, ok, detail = '') => {
  if (ok) passed++;
  else failed++;
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${name}${ok || !detail ? '' : ` — ${String(detail).slice(0, 500)}`}`);
};
const section = (title) => console.log(`\n${title}`);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** A Storage stand-in: a Map, with getItem and setItem that may be made to throw. */
function fakeStorage() {
  const m = new Map();
  return {
    m, throwGet: false, throwSet: false,
    getItem(k) {
      if (this.throwGet) throw new Error('reading is blocked');
      return m.has(k) ? m.get(k) : null;
    },
    setItem(k, v) {
      if (this.throwSet) {
        const e = new Error('full');
        e.name = 'QuotaExceededError';
        throw e;
      }
      m.set(k, String(v));
    },
    removeItem(k) {
      m.delete(k);
    },
  };
}

let clock = 1794744000000;
const now = () => ++clock;
const KEY = shelfKey('C:\\data');
const make = (st, extra = {}) => new Shelf({ key: KEY, storage: () => st, now, ...extra }).load();
const rels = (s) => s.items.map((it) => it.rel);
const e = (rel, d = 0, s = 100, m = 1794700000000) => ({ rel, d, s, m });

/* ---------- 1. keys and paths ---------- */

section('1. Keys and paths');
check('shelfKey names the directory', shelfKey('C:\\data') === 'terrane.shelf.v1|C:\\data');
check('a snapshot of it is kept apart', shelfKey('C:\\data', 'snapshot') === 'terrane.shelf.v1|C:\\data|snapshot');
{
  const good = ['Пример/файл.txt', 'with space/a b.txt', 'a#b/c%20d.md', 'x', 'a/b/c/d/e'];
  check(`normRel accepts unicode, spaces, # and % (${good.length})`, good.every((r) => normRel(r) === r), JSON.stringify(good.map(normRel)));
  const bad = ['', '/a', 'a/', 'a//b', '.', '..', 'a/../b', 'a/./b', 'a\u0000b', 42, null, undefined, {}, 'x'.repeat(REL_MAX + 1)];
  check(`normRel refuses the root, slashes at the ends, empty, '.' and '..' segments, a NUL, non-strings and ${REL_MAX + 1} characters`,
    bad.every((r) => normRel(r) === null), JSON.stringify(bad.map((r) => normRel(r)).map((x) => (x && x.length > 40 ? `${x.length} chars` : x))));
  check(`normRel accepts exactly ${REL_MAX} characters`, normRel('y'.repeat(REL_MAX)) !== null);
}

/* ---------- 2. adding ---------- */

section('2. Adding');
{
  const st = fakeStorage();
  const s = make(st);
  const r1 = s.add([e('a/one.txt'), e('a/two.txt')]);
  check('two added, in the order given, at the top', r1.added.length === 2 && same(rels(s), ['a/one.txt', 'a/two.txt']));
  const r2 = s.add([e('b/three.txt')]);
  check('newest first: the next one goes above them', same(rels(s), ['b/three.txt', 'a/one.txt', 'a/two.txt']) && r2.added.length === 1);
  const r3 = s.add([e('a/one.txt'), e('A/ONE.txt')]);
  check('an exact duplicate is already there and keeps its place; a path in another case is kept apart',
    r3.already === 1 && r3.added.length === 1 && same(rels(s), ['A/ONE.txt', 'b/three.txt', 'a/one.txt', 'a/two.txt']), JSON.stringify([r3, rels(s)]));
  const r4 = s.add([e(''), e('/x'), e('a/../b'), null, e('c/four.txt'), e('c/four.txt')]);
  check(`a bad path is refused and counted (${r4.refused}); a repeat within one add is already there`, r4.refused === 4 && r4.added.length === 1 && r4.already === 1, JSON.stringify(r4));
  check('has and get by path; size', s.has('c/four.txt') && !s.has('nope') && s.get('b/three.txt')?.s === 100 && s.size === 5);
  const kept = JSON.parse(st.m.get(KEY));
  check('written at once, in format 1, with rel, d, s, m and at only', kept.format === 1 && kept.items.length === 5
    && same(Object.keys(kept.items[0]).sort(), ['at', 'd', 'm', 'rel', 's']));
  const fig = s.add([{ rel: 'f/bad.bin', d: true, s: -5, m: Infinity }]);
  check('a figure that is not a finite number of at least 0 is kept as 0; d as 0 or 1', fig.added[0].s === 0 && fig.added[0].m === 0 && fig.added[0].d === 1);
}
{
  const s = make(fakeStorage());
  const many = Array.from({ length: 1200 }, (_, i) => e(`bulk/f${i}.txt`));
  const r = s.add(many);
  check(`adding 1,200 keeps ${SHELF_MAX} and cuts 200`, s.size === SHELF_MAX && r.added.length === SHELF_MAX && r.cut === 200, JSON.stringify({ size: s.size, cut: r.cut }));
  const more = s.add([e('late/x.txt')]);
  check('a full shelf cuts what comes after', more.cut === 1 && !s.has('late/x.txt'));
}

/* ---------- 3. taking off, clearing, putting back ---------- */

section('3. Taking off, clearing and putting back');
{
  const st = fakeStorage();
  const s = make(st);
  s.add([e('c'), e('b'), e('a')].reverse());
  check('three on the shelf, newest first', same(rels(s), ['a', 'b', 'c']));
  check('remove takes one off and returns the count', s.remove(['b', 'nope']) === 1 && !s.has('b') && same(rels(s), ['a', 'c']));
  check('removing what is not there changes nothing', s.remove(['zzz']) === 0);
  const list = s.clear();
  check('clear empties it, returns the list newest first, and removes the key', s.size === 0 && same(list.map((x) => x.rel), ['a', 'c']) && !st.m.has(KEY));
  s.add([e('meanwhile')]);
  const back = s.restore([...list, { rel: 'meanwhile', d: 0, s: 1, m: 1, at: 1 }]);
  check('restore puts the list back in its order, after what was added meanwhile, skipping what is there',
    back === 2 && same(rels(s), ['meanwhile', 'a', 'c']), JSON.stringify(rels(s)));
}
{
  const s = make(fakeStorage());
  const list = (s.add(Array.from({ length: 10 }, (_, i) => e(`p/${i}`))), s.clear());
  s.add(Array.from({ length: SHELF_MAX - 4 }, (_, i) => e(`q/${i}`)));
  const n = s.restore(list);
  check(`restore respects the cap: 4 of 10 put back (${n})`, n === 4 && s.size === SHELF_MAX);
}

/* ---------- 4. following ---------- */

section('4. Following renames and moves');
{
  const s = make(fakeStorage());
  s.add([e('docs/report.pdf'), e('Projects/tidelines', 1), e('Projects/tidelines/frame-1.exr'), e('Projects/tidelines/sub/frame-2.exr'), e('Projects/tidelines-old/x.txt')]);
  const n1 = s.follow([['docs/report.pdf', 'docs/report-final.pdf']]);
  check('an item renamed is carried', n1 === 1 && s.has('docs/report-final.pdf') && !s.has('docs/report.pdf'));
  const n2 = s.follow([['Projects/tidelines', 'Archive/tidelines']]);
  check(`a folder renamed or moved carries what is inside it, never a sibling that only starts with its name (${n2})`,
    n2 === 3 && s.has('Archive/tidelines') && s.has('Archive/tidelines/frame-1.exr') && s.has('Archive/tidelines/sub/frame-2.exr') && s.has('Projects/tidelines-old/x.txt'), JSON.stringify(rels(s)));
  const order = rels(s);
  check('following keeps the order', same(order, ['docs/report-final.pdf', 'Archive/tidelines', 'Archive/tidelines/frame-1.exr', 'Archive/tidelines/sub/frame-2.exr', 'Projects/tidelines-old/x.txt']), JSON.stringify(order));
  // A move of two from different folders: results are the new paths.
  s.follow([['docs/report-final.pdf', 'dest/report-final.pdf'], ['Projects/tidelines-old/x.txt', 'dest/x.txt']]);
  check('move pairs carry each item', s.has('dest/report-final.pdf') && s.has('dest/x.txt'));
  // Undo: the moved pairs, from the new path back to the old.
  s.follow([['dest/report-final.pdf', 'docs/report-final.pdf'], ['dest/x.txt', 'Projects/tidelines-old/x.txt'], ['Archive/tidelines', 'Projects/tidelines']]);
  check('Undo\'s pairs carry them back', s.has('docs/report-final.pdf') && s.has('Projects/tidelines-old/x.txt') && s.has('Projects/tidelines/sub/frame-2.exr') && !s.has('dest/x.txt'), JSON.stringify(rels(s)));
  const bad = s.follow([['', 'x'], ['a', 'a'], ['a'], 'ab', null, [1, 2], ['/x', 'y'], ['x', '../y']]);
  check('pairs that are not two distinct valid paths are ignored', bad === 0);
}
{
  const s = make(fakeStorage());
  s.add([e('y/f'), e('x/f')]);
  const n = s.follow([['x', 'y']]);
  check(`two items that land on one path keep the earlier one (${rels(s)})`, n === 1 && same(rels(s), ['y/f']) && s.size === 1);
  const t = make(fakeStorage());
  t.add([e('y/f')]);
  t.add([e('x/f')]);
  t.follow([['x', 'y']]);
  check('the earlier is the one higher on the list, newest first', t.size === 1 && t.items[0].rel === 'y/f');
}
{
  const s = make(fakeStorage());
  s.add([e('a/f.txt', 0, 5)]);
  check('refresh updates figures in memory only', s.refresh('a/f.txt', { s: 9, m: 7 }) && s.get('a/f.txt').s === 9 && !s.refresh('nope', { s: 1 }));
}

/* ---------- 5. reading what was kept ---------- */

section('5. Reading what was kept');
{
  check('bad JSON reads as nothing', Shelf.parse('{oops') === null && Shelf.parse(null) === null && Shelf.parse(42) === null);
  check('another format reads as nothing', Shelf.parse(JSON.stringify({ format: 2, items: [] })) === null && Shelf.parse(JSON.stringify({ items: [] })) === null);
  const mixed = Shelf.parse(JSON.stringify({
    format: 1,
    items: [
      { rel: 'ok/a.txt', d: 0, s: 1, m: 2, at: 3 },
      { rel: 'ok/a.txt', d: 0, s: 9, m: 9, at: 9 },
      { rel: '../up', d: 0, s: 1, m: 2, at: 3 },
      { rel: 'ok/b', d: 2, s: 1, m: 2, at: 3 },
      { rel: 'ok/c', d: 1, s: null, m: 2, at: 3 },
      { rel: 'ok/d', d: 1, s: 1, m: -1, at: 3 },
      { rel: 'ok/e', d: 1, s: 1, m: 2 },
      'junk', null, 7,
      { rel: 'ok/f', d: true, s: 0, m: 0, at: 0, extra: 'dropped' },
    ],
  }));
  check(`malformed and repeated entries are left out, the first of a repeat kept (${mixed?.map((x) => x.rel)})`,
    same(mixed, [{ rel: 'ok/a.txt', d: 0, s: 1, m: 2, at: 3 }, { rel: 'ok/f', d: 1, s: 0, m: 0, at: 0 }]), JSON.stringify(mixed));
  const big = Shelf.parse(JSON.stringify({ format: 1, items: Array.from({ length: 1500 }, (_, i) => ({ rel: `b/${i}`, d: 0, s: 1, m: 1, at: 1500 - i })) }));
  check(`more than ${SHELF_MAX} items are cut to ${SHELF_MAX}`, big.length === SHELF_MAX && big[0].rel === 'b/0');
  const inf = Shelf.parse('{"format":1,"items":[{"rel":"a","d":0,"s":1e999,"m":1,"at":1}]}');
  check('a figure that is not finite leaves its entry out', same(inf, []));
  const st = fakeStorage();
  st.m.set(KEY, '<<junk>>');
  const s = make(st);
  check('junk under the key loads as an empty shelf, no error', s.size === 0);
}

/* ---------- 6. two tabs, and storage that refuses ---------- */

section('6. Two tabs on one storage, and storage that refuses');
{
  const st = fakeStorage();
  const changes = [];
  const a = make(st, { onChange: () => changes.push('a') });
  const b = make(st, { onChange: () => changes.push('b') });
  a.add([e('from-a/1')]);
  b.add([e('from-b/1')]);
  check('a write in one tab keeps the other\'s addition', same(rels(b).sort(), ['from-a/1', 'from-b/1']));
  check('the other tab learns of it on sync, which says it changed', a.sync() && same(rels(a).sort(), ['from-a/1', 'from-b/1']) && changes.includes('a'));
  a.remove(['from-b/1']);
  check('a removal in one tab holds in the other after sync', b.sync() && same(rels(b), ['from-a/1']));
  b.add([e('from-b/2')]);
  check('and holds when the other writes next', !rels(b).includes('from-b/1') && JSON.parse(st.m.get(KEY)).items.length === 2);
  a.sync();
  a.add([e('from-b/1')]);
  b.sync();
  check('a path taken off and put on again comes back in both tabs', a.has('from-b/1') && b.has('from-b/1'));
  a.clear();
  check('a clear in one tab empties the other on sync', b.sync() && b.size === 0 && !st.m.has(KEY));
  check('sync with nothing new says nothing changed', !b.sync());
}
{
  const st = fakeStorage();
  const fails = [];
  const s = make(st, { onFail: (why) => fails.push(why) });
  st.throwSet = true;
  s.add([e('a')]);
  s.add([e('b')]);
  s.remove(['a']);
  check(`setItem that throws reports once (${fails[0]}) and the store goes on in memory`, fails.length === 1 && /full/.test(fails[0]) && same(rels(s), ['b']));
  const st2 = fakeStorage();
  st2.throwGet = true;
  const fails2 = [];
  const s2 = make(st2, { onFail: (why) => fails2.push(why) });
  s2.add([e('x')]);
  s2.add([e('y')]);
  check(`getItem that throws reports once (${fails2[0]}) and the store goes on in memory`, fails2.length === 1 && /could not be read/.test(fails2[0]) && same(rels(s2), ['y', 'x']) && !s2.sync());
  const s3 = new Shelf({ key: KEY, storage: () => { throw new Error('no storage here'); }, onFail: (w) => fails2.push(w) }).load();
  s3.add([e('z')]);
  check('storage that cannot even be reached works the same', s3.has('z') && fails2.length === 2);
}

/* ---------- 7. the helpers ---------- */

section('7. The helpers');
check('parentOf: the folder a path lies in, the root as \'\'', parentOf('a/b/c') === 'a/b' && parentOf('a') === '');
check('tops leaves out anything inside another listed folder, in order', same(tops(['a/b/c', 'a', 'x/y', 'a/z', 'ab']), ['a', 'x/y', 'ab']));
check('commonFolder: the deepest folder holding every item\'s folder',
  commonFolder(['a/b/x', 'a/b/y']) === 'a/b' && commonFolder(['a/b/x', 'a/c/y']) === 'a' && commonFolder(['a/x', 'b/y']) === '' && commonFolder(['a/b/x']) === 'a/b'
  && commonFolder(['top.txt', 'a/b']) === '' && commonFolder([]) === '' && commonFolder(['ab/x', 'a/y']) === '');
{
  const items = [
    { rel: 'P/t', d: 1, s: 1000, m: 0, at: 1 },
    { rel: 'P/t/f1', d: 0, s: 400, m: 0, at: 2 },
    { rel: 'D/r.pdf', d: 0, s: 50, m: 0, at: 3 },
    { rel: 'top.txt', d: 0, s: 5, m: 0, at: 4 },
  ];
  const sum = summary(items);
  check(`summary counts files and folders, bytes of the tops only, and distinct folders (${JSON.stringify(sum)})`, same(sum, { files: 3, folders: 1, bytes: 1055, from: 4 }));
  const live = summary(items, (it) => (it.rel === 'P/t' ? { s: 2000 } : null));
  check('summary takes a live figure over the stored one', live.bytes === 2055);
}

/* ---------- 8. time ---------- */

section('8. Time');
{
  const s = make(fakeStorage());
  s.add(Array.from({ length: SHELF_MAX }, (_, i) => e(`Projects/tidelines/renders/${i % 10}/frame-${String(i).padStart(4, '0')}.exr`)));
  let best = Infinity;
  for (let i = 0; i < 3; i++) {
    const t0 = performance.now();
    s.follow([['Projects/tidelines', `Archive/tidelines-${i}`]]);
    best = Math.min(best, performance.now() - t0);
    s.follow([[`Archive/tidelines-${i}`, 'Projects/tidelines']]);
  }
  check(`follow of ${SHELF_MAX} items, written, under 50 ms (${best.toFixed(1)} ms)`, best < 50 && s.size === SHELF_MAX);
  const text = JSON.stringify({ format: 1, items: s.items });
  let bestP = Infinity;
  for (let i = 0; i < 3; i++) {
    const t0 = performance.now();
    Shelf.parse(text);
    bestP = Math.min(bestP, performance.now() - t0);
  }
  check(`parse of ${SHELF_MAX} items under 50 ms (${bestP.toFixed(1)} ms)`, bestP < 50);
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
