#!/usr/bin/env node
/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Places Store Test (Terrane Edition - v1.0)
 *     - File Name: places-test.mjs
 *     - Relative Path: tools/places-test.mjs
 *     - Artifact Type: test
 *     - Version: 1.0.0
 *     - Date: 11/13/2026
 *     - Update: Friday, November 13, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Description:
 *     Runs the browser's places store (web/js/places.js) in Node against
 *     model trees built with the browser's own model, and checks the
 *     memory behind benchmarks and the return point without a page or a
 *     service. It proves the store needs no DOM.
 *
 * ✒ Key Features:
 *     - Summary: the figures a benchmark reports from the folder's own
 *       totals, and the words for them ("+1 file, +12 B", never "added")
 *     - Detail: entries gone, here now, grown and shrunk, and the "not
 *       among the 64 largest then" case past 64 entries
 *     - Cache reuse: the same answer object until the folder changes
 *     - Persistence round trip through a storage object, saves debounced
 *       to 1 s, malformed and foreign entries refused on load
 *     - Rebase after a rename or move, nested paths and the return point
 *       included, a sibling with a common prefix left alone
 *     - Missing on detach: a folder that leaves the tree makes its
 *       benchmark missing, kept, and found again when it comes back
 *     - A storage object that throws: one report, everything in memory
 *     - Two tabs on one storage: a save keeps the other tab's benchmarks,
 *       sync() takes them in, forgetting and Forget all reach the other,
 *       a change made here wins, one folder set twice keeps the later,
 *       and the return point follows the same rule
 *     - A snapshot's own key, and its measurements dated when it was taken
 *     - At most 64 benchmarks; the return point's offset arithmetic
 *
 * ✒ Usage Instructions:
 *     node tools/places-test.mjs
 *     npm test runs it after the service smoke test.
 *
 * ✒ Other Important Information:
 *     - Dependencies: Node.js 22+; web/js/places.js and web/js/model.js
 *     - Compatible platforms: Windows, macOS, Linux
 *     - Exit code 0 means every check passed
 * ----------------------------------------------------------------------------
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.join(HERE, '..', 'web', 'js');
const { Model } = await import(new URL('../web/js/model.js', import.meta.url).href);
const P = await import(new URL('../web/js/places.js', import.meta.url).href);
const { Places, storageKey, MAX_BENCHMARKS, KEEP_ENTRIES, SAVE_MS, deltaText, anchorOf, poseRelative, vantage, rebased } = P;

let passed = 0;
let failed = 0;
const check = (name, cond, detail = '') => {
  if (cond) passed++;
  else failed++;
  console.log(`${cond ? '  ok  ' : ' FAIL '} ${name}${cond || !detail ? '' : ' — ' + detail}`);
};
const section = (title) => console.log(`\n${title}`);
const DAY = 86400000;
const T0 = Date.UTC(2026, 10, 1, 12, 0, 0);

/**
 * A model from a plain description: { name: [files...] | { sub } }, where a
 * file is [name, size, mtime]. Built through Model.ingest, as the page does.
 */
function build(spec, rootName = 'root') {
  const model = new Model(rootName);
  const records = [];
  let id = 0;
  const walk = (obj, pid, name, myId) => {
    const files = [];
    const dirs = [];
    for (const [k, v] of Object.entries(obj)) {
      if (Array.isArray(v) && typeof v[0] === 'number') files.push(k, v[0], v[1] ?? T0, 0);
      else dirs.push([k, v]);
    }
    records.push([myId, pid, name, T0 - 30 * DAY, 0, files]);
    for (const [k, v] of dirs) walk(v, myId, k, ++id);
  };
  walk(spec, -1, rootName, 0);
  model.ingest(records, [], model.root);
  return model;
}

/** A depth-1 re-read of dir as the service would answer it, applied through reconcile. */
function reread(model, dir, spec, dirMtime = T0) {
  const files = [];
  const recs = [];
  let id = 1;
  for (const [k, v] of Object.entries(spec)) {
    if (Array.isArray(v) && typeof v[0] === 'number') files.push(k, v[0], v[1] ?? T0, 0);
    else recs.push([id++, 0, k, T0, 'STUB', []]);
  }
  const { added } = model.reconcile(dir, [[0, -1, dir.n, dirMtime, 0, files], ...recs]);
  // A new folder would be scanned deeply by the page; here it stays empty.
  for (const a of added) a.stub = false;
}

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

/** Timers the test advances by hand. */
function manualTimers() {
  let seq = 0;
  const pending = new Map();
  return {
    set: (fn, ms) => { pending.set(++seq, { fn, ms }); return seq; },
    clear: (id) => { pending.delete(id); },
    run() { const all = [...pending.values()]; pending.clear(); for (const p of all) p.fn(); return all.length; },
    get size() { return pending.size; },
    last: () => [...pending.values()].at(-1),
  };
}

const KEY = storageKey('C:\\data\\root');

/* ---------- summary ---------- */

section('Summary');
{
  const model = build({ photos: { 'a.jpg': [1000], 'b.jpg': [3000], trips: { 'c.jpg': [500] } }, 'notes.txt': [10] });
  const photos = model.find('photos');
  const store = new Places({ key: KEY, timers: manualTimers(), now: () => T0 });
  check('a new store has nothing and is not resolved', store.benchmarks.length === 0 && store.summary({ m: {}, node: null }) === null);
  const { b, created } = store.set(photos, T0);
  store.resolve(model);
  check('set() keeps a benchmark on the folder, by its path', created && b.rel === 'photos' && b.name === 'photos' && store.find(photos) === b);
  check('the measurement holds bytes, files, folders, entries and the newest change',
    b.m.s === 4500 && b.m.fc === 3 && b.m.dc === 1 && b.m.items === 3 && b.m.mm === photos.mm && b.m.at === T0, JSON.stringify(b.m));
  check('its largest entries come first, by name, with sizes and file counts',
    JSON.stringify(b.m.top) === JSON.stringify([['b.jpg', 0, 3000, 1], ['a.jpg', 0, 1000, 1], ['trips', 1, 500, 1]]) && b.m.rest.n === 0, JSON.stringify(b.m.top));
  const same = store.summary(b);
  check('unchanged: no figure differs and the words say "no change"', !same.changed && !same.missing && deltaText(same) === 'no change', JSON.stringify(same));
  reread(model, photos, { 'a.jpg': [1000], 'b.jpg': [3000], 'new.jpg': [12, T0 + DAY], trips: {} }, T0 + DAY);
  const after = store.summary(b);
  check('one more file: +1 file and its bytes, in constant time from the totals', after.changed && after.df === 1 && after.ds === 12 && after.di === 1 && after.later, JSON.stringify(after));
  check('the words: "+1 file, +12 B", and "+1 file" for a tag', deltaText(after) === '+1 file, +12 B' && deltaText(after, { short: true }) === '+1 file', deltaText(after));
  reread(model, photos, { 'b.jpg': [3000], 'new.jpg': [12, T0 + DAY], trips: {} }, T0 + 2 * DAY);
  const less = store.summary(b);
  check('fewer bytes read as a minus sign', deltaText(less) === '\u2212988 B' && less.df === 0, deltaText(less));
  const touched = P.summarize({ ...b.m, s: photos.s, fc: photos.fc, dc: photos.dc, items: photos.c.length, mm: photos.mm - 1 }, photos);
  check('a later change with the same figures reads "changed inside"', deltaText(touched) === 'changed inside' && touched.changed, JSON.stringify(touched));
  const folders = P.summarize({ ...b.m, s: photos.s, fc: photos.fc, dc: photos.dc + 2, items: photos.c.length, mm: photos.mm }, photos);
  check('folders are counted too ("−2 folders")', deltaText(folders) === '\u22122 folders', deltaText(folders));
  const words = [same, after, less, touched, folders, { missing: true }].map((s) => deltaText(s)).join(' ');
  check('no wording says created, arrived or added', !/creat|arriv|\badded\b/i.test(words), words);
}

/* ---------- detail ---------- */

section('Detail and cache');
{
  const model = build({ work: { 'keep.txt': [100], 'gone.txt': [50], 'grow.bin': [1000], 'shrink.bin': [800], sub: { 'x.txt': [5] } } });
  const work = model.find('work');
  const store = new Places({ key: KEY, timers: manualTimers() });
  const { b } = store.set(work, T0);
  store.resolve(model);
  const d0 = store.detail(b);
  check('nothing changed: every list is empty', !d0.gone.length && !d0.here.length && !d0.grown.length && !d0.shrunk.length && !d0.partial, JSON.stringify(d0));
  check('the cache returns the same answer while the folder is unchanged', store.detail(b) === d0);
  reread(model, work, { 'keep.txt': [100], 'grow.bin': [1600], 'shrink.bin': [300], 'fresh.md': [70], sub: {} }, T0 + DAY);
  const d1 = store.detail(b);
  check('a changed folder is compared again, not served from the cache', d1 !== d0);
  check('gone: the entry no longer here', d1.gone.map((e) => e.name).join() === 'gone.txt', JSON.stringify(d1.gone));
  check('here now, not then: the new entry', d1.here.map((e) => e.name).join() === 'fresh.md' && d1.here[0].node === work.c.find((c) => c.n === 'fresh.md'));
  check('grown and shrunk, with their differences', d1.grown.length === 1 && d1.grown[0].name === 'grow.bin' && d1.grown[0].ds === 600
    && d1.shrunk.length === 1 && d1.shrunk[0].name === 'shrink.bin' && d1.shrunk[0].ds === -500, JSON.stringify([d1.grown, d1.shrunk].map((l) => l.map((e) => [e.name, e.ds, e.df]))));
  check('the same folder unchanged again: the cached answer', store.detail(b) === d1);
  store.set(work, T0 + 2 * DAY);
  check('measuring again drops the cached answer', store.detail(b) !== d1 && !store.detail(b).gone.length);

  // More than KEEP_ENTRIES direct entries: the rest are summed, and a
  // newcomer can only be said not to have been among the largest.
  const spec = {};
  for (let k = 0; k < KEEP_ENTRIES + 6; k++) spec[`f${String(k).padStart(3, '0')}.dat`] = [10000 - k];
  const big = build({ many: spec });
  const many = big.find('many');
  const s2 = new Places({ key: KEY, timers: manualTimers() });
  const b2 = s2.set(many, T0).b;
  s2.resolve(big);
  check(`a folder of ${KEEP_ENTRIES + 6} entries keeps its ${KEEP_ENTRIES} largest by name and sums the rest`,
    b2.m.top.length === KEEP_ENTRIES && b2.m.rest.n === 6 && b2.m.rest.f === 6 && b2.m.rest.s === [64, 65, 66, 67, 68, 69].reduce((a, k) => a + 10000 - k, 0), JSON.stringify(b2.m.rest));
  check('its detail says it is partial', s2.detail(b2).partial === true);
}

/* ---------- persistence ---------- */

section('Persistence');
{
  const model = build({ a: { 'x.txt': [10] }, b: { c: { 'y.txt': [20] } } });
  const storage = memoryStorage();
  const timers = manualTimers();
  let fails = 0;
  const store = new Places({ key: KEY, storage: () => storage, onFail: () => fails++, timers, now: () => T0 });
  check('an empty storage loads nothing', store.load() === 0 && storage.writes === 0);
  store.set(model.find('a'), T0);
  store.set(model.find('b/c'), T0 + 1000);
  store.setReturn({ rel: 'b/c', name: 'c', at: T0, off: [0.1, 0.4, 1.2], yaw: -0.5, pitch: -0.6 });
  check('changes wait for the debounce instead of writing at once', storage.writes === 0 && timers.size === 1 && timers.last().ms === SAVE_MS && SAVE_MS === 1000);
  timers.run();
  check('the debounce writes once, under terrane.places.v1|<root>', storage.writes === 1 && storage.map.has('terrane.places.v1|C:\\data\\root'));
  check('flush with nothing waiting writes nothing', store.flush() === false && storage.writes === 1);
  const again = new Places({ key: KEY, storage: () => storage, timers: manualTimers() });
  const n = again.load();
  again.resolve(model);
  const same = (x, y) => JSON.stringify(x) === JSON.stringify(y);
  check('a second store reads both benchmarks back, field for field', n === 2 && same(again.toJSON(), store.toJSON()), `${n}`);
  check('they resolve to the folders by path', again.benchmarks[0].node === model.find('a') && again.benchmarks[1].node === model.find('b/c'));
  check('the return point comes back with its offset and heading', same(again.ret, { rel: 'b/c', name: 'c', at: T0, off: [0.1, 0.4, 1.2], yaw: -0.5, pitch: -0.6 }));
  check('new ids continue after the ones read', again.set(model.find('b'), T0).b.id === 'b3');
  check('nothing is written onto a node', !Object.keys(model.find('a')).some((k) => !['n', 'p', 'd', 's', 'm', 'f', 'c', 'fc', 'dc', 'ks', 'mm', 'h', 'e', 'dirty', 'stub'].includes(k)));

  storage.setItem(KEY, JSON.stringify({
    format: 1,
    benchmarks: [
      { id: 'b1', rel: '../outside', name: 'x', set: 1, m: again.benchmarks[0].m },
      { id: 'b2', rel: 'a', name: 'a', set: 1, m: { s: 'big' } },
      { id: 'b3', rel: 'a', name: 'a', set: 1, m: again.benchmarks[0].m },
      { id: 'b4', rel: 'a', name: 'a again', set: 1, m: again.benchmarks[0].m },
      null,
    ],
    ret: { rel: '/abs', name: 'x', at: 1, off: null },
  }));
  const picky = new Places({ key: KEY, storage: () => storage, timers: manualTimers() });
  check('on load, a path leaving the root, a malformed measurement, a second entry for one path and a bad return point are refused',
    picky.load() === 1 && picky.benchmarks[0].id === 'b3' && picky.ret === null, JSON.stringify(picky.toJSON()).slice(0, 200));
  storage.setItem(KEY, '{not json');
  check('unreadable text loads nothing and reports nothing', new Places({ key: KEY, storage: () => storage, timers: manualTimers(), onFail: () => fails++ }).load() === 0 && fails === 0);
  const empty = new Places({ key: KEY, storage: () => storage, timers: manualTimers() });
  empty.set(model.find('a'));
  empty.clear();
  empty.flush();
  check('forgetting everything removes the key', !storage.map.has(KEY));
}

/* ---------- rebase ---------- */

section('Rebase');
{
  check('rebased(): the path itself, a path under it, and a sibling sharing a prefix',
    rebased('a/b', 'a/b', 'a/c') === 'a/c' && rebased('a/b/d/e', 'a/b', 'x/b') === 'x/b/d/e' && rebased('a/bc', 'a/b', 'a/z') === 'a/bc' && rebased('', 'a', 'b') === '');
  const model = build({ src: { lib: { 'x.js': [10] }, 'y.js': [5] }, srcmap: { 'm.txt': [1] }, dest: {} });
  const store = new Places({ key: KEY, timers: manualTimers() });
  const top = store.set(model.find('src')).b;
  const lib = store.set(model.find('src/lib')).b;
  const sib = store.set(model.find('srcmap')).b;
  store.setReturn({ rel: 'src/lib', name: 'lib', at: T0, off: null });
  store.resolve(model);
  // Terrane renames src to code: the model learns it by re-reading the root.
  const moved = store.rebase('src', 'code');
  check('a rename carries the folder and everything under it, and the return point', moved.length === 3 && top.rel === 'code' && top.name === 'code' && lib.rel === 'code/lib' && lib.name === 'lib' && store.ret.rel === 'code/lib');
  check('a sibling whose name starts the same is left alone', sib.rel === 'srcmap' && sib.node === model.find('srcmap'));
  const srcNode = model.find('src');
  srcNode.n = 'code';
  const { lost } = store.resolve(model);
  check('the next resolve finds them at their new paths, and nothing is reported lost', top.node === srcNode && lib.node === model.find('code/lib') && lost.length === 0);
  // Moved into dest, then the move undone.
  store.rebase('code', 'dest/code');
  model.root.c.splice(model.root.c.indexOf(srcNode), 1);
  model.find('dest').c.push(srcNode);
  srcNode.p = model.find('dest');
  store.resolve(model);
  check('a move rebases the same way', top.rel === 'dest/code' && top.node === srcNode && lib.rel === 'dest/code/lib');
  store.rebase('dest/code', 'code');
  check('and back again when the move is undone', top.rel === 'code' && lib.rel === 'code/lib' && store.ret.rel === 'code/lib');
  check('the root is never rebased, nor a path onto itself', store.rebase('', 'x').length === 0 && store.rebase('code', 'code').length === 0);
}

/* ---------- missing on detach ---------- */

section('Missing on detach');
{
  const model = build({ keep: { 'a.txt': [1] }, temp: { 'b.txt': [2], inner: { 'c.txt': [3] } } });
  const store = new Places({ key: KEY, timers: manualTimers() });
  const temp = store.set(model.find('temp')).b;
  const inner = store.set(model.find('temp/inner')).b;
  const keep = store.set(model.find('keep')).b;
  const first = store.resolve(model);
  check('the first resolve reports nothing as lost or found', first.lost.length === 0 && first.found.length === 0);
  // Renamed outside Terrane: the root is re-read and temp is not there.
  reread(model, model.root, { keep: {}, elsewhere: {} });
  const { lost } = store.resolve(model, new Set([model.root]));
  check('a folder that left the tree makes its benchmark, and those under it, missing', lost.length === 2 && lost.includes(temp) && lost.includes(inner) && temp.node === null && inner.node === null);
  check('missing benchmarks are kept, never dropped', store.benchmarks.length === 3 && store.findRel('temp') === temp);
  const sm = store.summary(temp);
  check('their summary says missing', sm.missing && sm.changed && deltaText(sm) === 'missing' && store.detail(temp) === null);
  check('a benchmark elsewhere still resolves', keep.node === model.find('keep') && !store.summary(keep).missing);
  check('the side map forgets the old node', store.find(model.find('keep')) === keep && [...store.byNode.values()].every((b) => b.node));
  reread(model, model.root, { keep: {}, temp: {} });
  const back = store.resolve(model, new Set([model.root]));
  check('when the path holds a folder again, it is found again', back.found.includes(temp) && temp.node === model.find('temp'));
  const unrelated = store.resolve(model, new Set([model.find('keep')]));
  check('a refresh elsewhere looks only at what could have moved', unrelated.lost.length === 0 && temp.node === model.find('temp'));
}

/* ---------- storage that throws ---------- */

section('Storage that throws');
{
  const model = build({ a: { 'x.txt': [1] }, b: {} });
  const reasons = [];
  const timers = manualTimers();
  const store = new Places({ key: KEY, storage: () => { throw new Error('SecurityError: access denied'); }, onFail: (why) => reasons.push(why), timers });
  check('load reports the refusal once and reads nothing', store.load() === 0 && reasons.length === 1 && /could not be read/.test(reasons[0]), JSON.stringify(reasons));
  const r = store.set(model.find('a'));
  store.resolve(model);
  timers.run();
  store.setReturn({ rel: 'a', name: 'a', at: T0, off: null });
  timers.run();
  store.set(model.find('b'));
  store.flush();
  check('every action still works in memory', r.created && store.benchmarks.length === 2 && store.ret.rel === 'a' && store.find(model.find('a')) === r.b);
  check('the refusal is reported once, not at every save', reasons.length === 1 && store.failed === reasons[0]);
  const full = { getItem: () => null, setItem: () => { const e = new Error('quota'); e.name = 'QuotaExceededError'; throw e; }, removeItem: () => {} };
  const why = [];
  const s2 = new Places({ key: KEY, storage: () => full, onFail: (w) => why.push(w), timers: manualTimers() });
  s2.set(model.find('a'));
  s2.flush();
  check('a full storage is named as such', why.length === 1 && /storage is full/.test(why[0]), JSON.stringify(why));
}

/* ---------- limits and the return point ---------- */

section('Limits and the return point');
{
  const spec = {};
  for (let k = 0; k <= MAX_BENCHMARKS; k++) spec[`d${k}`] = { 'f.txt': [k + 1] };
  const model = build(spec);
  const store = new Places({ key: KEY, timers: manualTimers() });
  for (let k = 0; k < MAX_BENCHMARKS; k++) store.set(model.find(`d${k}`));
  const over = store.set(model.find(`d${MAX_BENCHMARKS}`));
  check(`at most ${MAX_BENCHMARKS} benchmarks: the next is refused`, MAX_BENCHMARKS === 64 && over.full === true && store.benchmarks.length === 64 && store.full);
  const again = store.set(model.find('d3'));
  check('measuring a kept one again is still allowed, with the earlier measurement for undo', again.b && !again.created && again.prev && store.restore(again.b, again.prev) && again.b.m === again.prev);
  const gone = store.benchmarks[5];
  store.remove(gone);
  check('a forgotten one can be put back where it was', store.reinstate(gone, 5) && store.benchmarks[5] === gone && store.find(gone.node) === gone);

  const L = { geo: new Float64Array([10, 2, -4, 40, 4, 30]) };
  const a = anchorOf(L, 0);
  check('a box anchor is the centre of its base and its wider side', a.x === 10 && a.y === 0 && a.z === -4 && a.w === 40);
  const cam = { x: 37.5, y: 61.25, z: 80, yaw: -0.56, pitch: -0.62 };
  const p = poseRelative(cam, a);
  const v = vantage(p, a);
  check('an eye kept relative to a box comes back exactly', Math.hypot(v.x - cam.x, v.y - cam.y, v.z - cam.z) < 1e-12 && v.yaw === cam.yaw && v.pitch === cam.pitch, JSON.stringify(v));
  const moved = vantage(p, anchorOf({ geo: new Float64Array([110, 2, -4, 80, 4, 30]) }, 0));
  check('and follows the box when it moves and grows', Math.abs(moved.x - (110 + p.off[0] * 80)) < 1e-12 && Math.abs(moved.y - p.off[1] * 80) < 1e-12);
}

/* ---------- two tabs ---------- */

section('Two tabs on one directory');
{
  const model = build({ a: { 'x.txt': [10] }, b: { 'y.txt': [20] }, c: { 'z.txt': [30] }, d: { 'w.txt': [40] } });
  const storage = memoryStorage();
  let syncs = 0;
  const tab = (now) => {
    const s = new Places({ key: KEY, storage: () => storage, timers: manualTimers(), now: () => now, onSync: () => syncs++ });
    s.load();
    s.resolve(model);
    return s;
  };
  const rels = (s) => s.benchmarks.map((b) => b.rel).sort().join(',');
  const stored = () => (P.Places.parse(storage.map.get(KEY) || 'null')?.benchmarks || []).map((b) => b.rel).sort().join(',');
  const A = tab(T0);
  const B = tab(T0);
  A.set(model.find('a'));
  A.flush();
  B.set(model.find('b'));
  B.flush();
  check('a tab opened earlier keeps the other tab\'s benchmark when it saves its own', stored() === 'a,b' && rels(B) === 'a,b', `${stored()} / ${rels(B)}`);
  check('and the ids stay apart, though both tabs counted from the same number', new Set(B.benchmarks.map((b) => b.id)).size === 2, B.benchmarks.map((b) => b.id).join());
  check('the tab that merged is told, so the page can redraw', syncs === 1, `${syncs}`);
  syncs = 0;
  check('sync() takes in the other tab\'s save, and says it changed', A.sync() === true && rels(A) === 'a,b' && syncs === 1 && A.dirty === false, `${rels(A)} ${syncs}`);
  check('sync() with nothing new changes nothing and calls nobody', A.sync() === false && syncs === 1);
  A.resolve(model);
  check('a merged benchmark is found by the next resolve', A.find(model.find('b'))?.rel === 'b');

  // Forgotten in one tab: gone from the other, which had not changed it.
  const ab = A.findRel('a');
  A.remove(ab);
  A.flush();
  B.sync();
  check('a benchmark forgotten in one tab is forgotten in the other', rels(B) === 'b' && stored() === 'b', `${rels(B)} / ${stored()}`);

  // Changed in both: the one changed here wins when it saves.
  const bA = A.findRel('b');
  const bB = B.findRel('b');
  B.set(model.find('b'), T0 + 5000);
  A.set(model.find('b'), T0 + 9000);
  A.flush();
  const before = bB.m.at;
  B.sync();
  check('a benchmark changed in this tab is kept over the other tab\'s change, and written', bB.m.at === before && before === T0 + 5000 && B.dirty === true, `${bB.m.at}`);
  B.flush();
  A.sync();
  check('the other tab then takes it, on the same object', bA.m.at === T0 + 5000 && A.findRel('b') === bA, `${bA.m.at}`);

  // One folder benchmarked in both tabs at once: one benchmark, the later.
  A.set(model.find('c'), T0 + 1000);
  B.set(model.find('c'), T0 + 2000);
  A.flush();
  B.flush();
  A.sync();
  check('one folder benchmarked in both tabs at once leaves one benchmark, the later measurement',
    A.benchmarks.filter((b) => b.rel === 'c').length === 1 && A.findRel('c').m.at === T0 + 2000 && stored() === 'b,c', `${rels(A)} ${A.findRel('c')?.m.at}`);

  // The return point: this tab's when it changed here, else the other's.
  A.setReturn({ rel: 'b', name: 'b', at: T0, off: null });
  A.flush();
  B.sync();
  check('a return point marked in one tab reaches the other', B.ret?.rel === 'b');
  B.setReturn({ rel: 'c', name: 'c', at: T0 + 1, off: null });
  A.setReturn({ rel: 'd', name: 'd', at: T0 + 2, off: null });
  A.flush();
  B.sync();
  check('a return point changed in this tab is kept over the other\'s', B.ret?.rel === 'c' && B.dirty === true);

  // Forget all in one tab while the other set a new one.
  B.flush();
  A.sync();
  A.set(model.find('d'));
  B.clear();
  A.flush();
  B.flush();
  A.sync();
  check('Forget all forgets what this tab knew; a benchmark set meanwhile in another tab survives', rels(B) === 'd' && rels(A) === 'd' && stored() === 'd', `${rels(B)} / ${rels(A)} / ${stored()}`);
  storage.setItem(KEY, '{not json');
  B.set(model.find('a'));
  check('unreadable text from elsewhere is replaced by the next save, as after a load', B.flush() === true && stored() === 'a,d', stored());
}

/* ---------- a snapshot ---------- */

section('A snapshot of the directory');
{
  check('a snapshot keeps its places under its own key, apart from the live directory',
    storageKey('C:\\data\\root', 'snapshot') === 'terrane.places.v1|C:\\data\\root|snapshot' && storageKey('C:\\data\\root') === KEY && storageKey('C:\\data\\root', '') === KEY);
  const taken = T0 - 3 * DAY;
  const model = build({ a: { 'x.txt': [10] } });
  const store = new Places({ key: storageKey('C:\\data\\root', 'snapshot'), timers: manualTimers(), now: () => taken });
  const { b } = store.set(model.find('a'));
  check('a measurement is dated by the clock it is given: a snapshot\'s, when it was taken', b.m.at === taken && b.set === taken, `${b.m.at}`);
}

/* ---------- no DOM ---------- */

section('No DOM');
{
  const src = fs.readFileSync(path.join(WEB, 'places.js'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  const uses = ['document', 'window', 'localStorage', 'navigator', 'HTMLElement', 'requestAnimationFrame'].filter((w) => new RegExp(`\\b${w}\\b`).test(src));
  check('places.js names no browser global: storage and timers are handed to it', uses.length === 0, uses.join(', '));
  const imports = [...src.matchAll(/from '([^']+)'/g)].map((m) => m[1]);
  check('it imports only model.js', JSON.stringify(imports) === JSON.stringify(['./model.js']), JSON.stringify(imports));
}

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
