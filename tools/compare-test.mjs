/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Compare Diff Test (Terrane Edition - v1.0)
 *     - File Name: compare-test.mjs
 *     - Relative Path: tools/compare-test.mjs
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
 *     Checks the Compare tab's logic (web/js/diff.js) in Node, without a
 *     browser or a service: the four groups and their ranking, the time
 *     tolerance, how folders, kinds, unread entries and links are judged,
 *     case folding by platform, a benchmark pair against places.compare,
 *     the labels and sentences, region mode through columns.js and
 *     regions.js against the whole model, the cost at 2 × 100,000 entries,
 *     and the demo world's two pairs.
 *
 * ✒ Key Features:
 *     - diff basics: only in each, changed, the same, counts and bytes;
 *       ranking by size, ties by name in codepoint order
 *     - Tolerance: 2,000 ms apart is the same, 2,001 changed
 *     - Folders by size, files and folders, never by time
 *     - A kind clash, an unread folder, a link
 *     - Folding on win32 and darwin, not on linux or the demo; a fold
 *       collision on one side falls back to exact names
 *     - A benchmark pair equals places.compare (here, gone, grown ∪
 *       shrunk), and the partial sentence
 *     - labels: the root, two of one name, one inside the other
 *     - The sentences hold no "created" or "added" and read MM/DD/YYYY
 *     - Region mode: a 6,000-entry folder against a 5,400 one, the held
 *       diff equal to the whole model's over the held names, unsent equal
 *       to the tail, and unsentText's words
 *     - 2 × 100,000 entries compared in under 400 ms
 *     - The demo world: the two node_modules differ every way; the
 *       laptop's copy of the oldest event holds 24 of its shots, the same
 *
 * ✒ Usage Instructions:
 *     node tools/compare-test.mjs
 *     npm test runs it after the shelf store test.
 *
 * ✒ Other Important Information:
 *     - Dependencies: Node.js 22.5+; web/js/diff.js, model.js, places.js,
 *       columns.js, regions.js, demo-service.js
 *     - Compatible platforms: Windows, macOS, Linux
 *     - Safety: nothing is written to disk; every tree is made in memory
 *     - Exit code 0 means every check passed
 * ----------------------------------------------------------------------------
 */

const D = await import(new URL('../web/js/diff.js', import.meta.url).href);
const { Model } = await import(new URL('../web/js/model.js', import.meta.url).href);
const P = await import(new URL('../web/js/places.js', import.meta.url).href);
const { treeFrom, answer } = await import(new URL('../web/js/columns.js', import.meta.url).href);
const { createRegions, decode } = await import(new URL('../web/js/regions.js', import.meta.url).href);
const { createDemoService } = await import(new URL('../web/js/demo-service.js', import.meta.url).href);
const { sideOfFolder, sideOfBench, diff, labels, sentence, shortSentence, whyText, partsText, unsentText, partialText, TOLERANCE_MS } = D;

let passed = 0;
let failed = 0;
const check = (name, ok, detail = '') => {
  if (ok) passed++;
  else failed++;
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${name}${ok || !detail ? '' : ` — ${String(detail).slice(0, 600)}`}`);
};
const section = (title) => console.log(`\n${title}`);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const DAY = 86400000;
const T0 = Date.UTC(2026, 10, 1, 12, 0, 0);
const tick = () => new Promise((r) => setImmediate(r));

/**
 * A model from a plain description: { name: [size, mtime?] | { sub } }.
 * Built through Model.ingest, as the page does.
 */
function build(spec, rootName = 'root') {
  const model = new Model(rootName);
  const records = [];
  let id = 0;
  const walk = (obj, pid, name, myId) => {
    const files = [];
    const dirs = [];
    for (const [k, v] of Object.entries(obj)) {
      if (Array.isArray(v) && typeof v[0] === 'number') files.push(k, v[0], v[1] ?? T0, v[2] ?? 0);
      else dirs.push([k, v]);
    }
    records.push([myId, pid, name, T0 - 30 * DAY, 0, files]);
    for (const [k, v] of dirs) walk(v, myId, k, ++id);
  };
  walk(spec, -1, rootName, 0);
  model.ingest(records, [], model.root);
  return model;
}
const sides = (model, r0, r1) => [sideOfFolder(model.find(r0), r0), sideOfFolder(model.find(r1), r1)];
const names = (rows, i) => rows.map((r) => r.name[i]);
const wordsOk = (s) => !/\b(created|added)\b/i.test(s) && !/\d{4}-\d{2}-\d{2}/.test(s);

/* ---------- diff basics ---------- */
section('diff: three groups, counts, bytes and ranking');
{
  const m = build({
    left: { 'only-a.txt': [500], 'only-b.txt': [900], 'tie-b.txt': [100], 'tie-a.txt': [100], 'same.txt': [40], 'grew.txt': [10], 'big-same.bin': [7000] },
    right: { 'only-r.txt': [300], 'same.txt': [40], 'grew.txt': [2500], 'big-same.bin': [7000] },
  });
  const [a, b] = sides(m, 'left', 'right');
  const res = diff(a, b);
  check('only in the first, ranked by size, ties by name', same(names(res.only[0], 0), ['only-b.txt', 'only-a.txt', 'tie-a.txt', 'tie-b.txt']), JSON.stringify(names(res.only[0], 0)));
  check('only in the second', same(names(res.only[1], 1), ['only-r.txt']));
  check('changed: grew.txt by size', res.changed.length === 1 && res.changed[0].name[0] === 'grew.txt' && same(res.changed[0].why, ['size']));
  check('the same, ranked by size', same(names(res.same, 0), ['big-same.bin', 'same.txt']));
  check('counts and bytes', same(res.count, { only0: 4, only1: 1, changed: 1, same: 2, names: 8 }) && res.bytes.only0 === 1600 && res.bytes.only1 === 300 && res.bytes.same === 7040 && res.bytes.changed === 2500,
    JSON.stringify([res.count, res.bytes]));
  check('no tail, no benchmark rest, no nesting', same(res.unsent, [null, null]) && same(res.partial, [null, null]) && res.nest === null);
  const lab = labels('left', 'right', 'root');
  const s = sentence(res, lab, a, b);
  check(`the sentence (${s})`, s === 'The second is 1.16 KB larger, with 3 fewer files. Of 8 names, 3 are in both (1 changed, 2 the same), 4 only in left and 1 only in right.', s);
  const keys = [...res.only[0], ...res.only[1], ...res.changed, ...res.same].map((r) => r.key);
  check('every row has its own key', new Set(keys).size === keys.length, JSON.stringify(keys));
  const w = partsText(whyText(res.changed[0]));
  check(`a size change reads "${w}"`, w === '● 10 B · ○ 2.44 KB · larger in ○', w);
}

/* ---------- tolerance ---------- */
section('Time: files within 2 seconds are the same');
{
  const m = build({
    a: { 'x.txt': [5, T0], 'y.txt': [5, T0], 'z.txt': [5, T0 + DAY] },
    b: { 'x.txt': [5, T0 + TOLERANCE_MS], 'y.txt': [5, T0 + TOLERANCE_MS + 1], 'z.txt': [5, T0] },
  });
  const res = diff(...sides(m, 'a', 'b'));
  check('2,000 ms apart is the same', res.same.some((r) => r.name[0] === 'x.txt'));
  check('2,001 ms apart is changed, by time only', res.changed.some((r) => r.name[0] === 'y.txt' && same(r.why, ['time'])));
  const z = res.changed.find((r) => r.name[0] === 'z.txt');
  const w = partsText(whyText(z));
  check(`a time change says which changed later, with both dates as MM/DD/YYYY ("${w}")`, /^same size; changed later in ● \(\d{2}\/\d{2}\/\d{4}, \d{2}\/\d{2}\/\d{4}\)$/.test(w), w);
}

/* ---------- folders ---------- */
section('Folders: by size and counts, never by time');
{
  const m = build({
    a: { same: { 'f.txt': [10, T0] }, more: { 'f.txt': [10], 'g.txt': [0] }, deeper: { 'f.txt': [10], sub: {} }, grew: { 'f.txt': [10] } },
    b: { same: { 'f.txt': [10, T0 + 30 * DAY] }, more: { 'f.txt': [10] }, deeper: { 'f.txt': [10] }, grew: { 'f.txt': [20] } },
  });
  const res = diff(...sides(m, 'a', 'b'));
  const why = (n) => res.changed.find((r) => r.name[0] === n)?.why;
  check('a folder whose file changed a month later but kept its size is the same: a folder\'s time is never compared', res.same.some((r) => r.name[0] === 'same'), JSON.stringify(res.same.map((r) => r.name[0])));
  check('a folder with one more file of 0 bytes differs by files', same(why('more'), ['files']), JSON.stringify(why('more')));
  check('a folder with one more folder differs by folders', same(why('deeper'), ['folders']), JSON.stringify(why('deeper')));
  check('a folder that grew differs by size', same(why('grew'), ['size']));
  const w = partsText(whyText(res.changed.find((r) => r.name[0] === 'more')));
  check(`its line names the side with more ("${w}")`, w === 'same size; 1 more file in ●', w);
}

/* ---------- kind, unread, link ---------- */
section('A kind clash, an unread folder, a link');
{
  const m = build({ a: { x: { 'in.txt': [4] }, l: [0, T0, 1], n: [3] }, b: { x: [4], l: [0, T0, 0], n: [3] } });
  const [a, b] = sides(m, 'a', 'b');
  const res = diff(a, b);
  const x = res.changed.find((r) => r.name[0] === 'x');
  check('x a folder on one side and a file on the other is changed, by kind', same(x?.why, ['kind']));
  check(`and its line says so ("${partsText(whyText(x))}")`, partsText(whyText(x)) === 'a folder in ●, a file in ○');
  check('a link on one side only is changed, by link', same(res.changed.find((r) => r.name[0] === 'l')?.why, ['link']));
  b.entries.find((e) => e.name === 'n').e = 'EACCES';
  const r2 = diff(a, b);
  const n = r2.changed.find((r) => r.name[0] === 'n');
  check('an entry that cannot be read on one side is changed, as unread', same(n?.why, ['unread']) && partsText(whyText(n)) === 'cannot be read in ○');
}

/* ---------- folding ---------- */
section('Folding: by the service\'s platform');
{
  const m = build({ a: { 'Readme.md': [5], 'Photo.JPG': [9], 'same.txt': [1] }, b: { 'README.md': [5], 'photo.jpg': [9], 'same.txt': [1] } });
  const [a, b] = sides(m, 'a', 'b');
  for (const platform of ['win32', 'darwin']) {
    const res = diff(a, b, { platform });
    check(`${platform} folds case: the three are in both`, res.count.same === 3 && !res.count.only0 && !res.count.only1, JSON.stringify(res.count));
  }
  for (const platform of ['linux', 'demo']) {
    const res = diff(a, b, { platform });
    check(`${platform} does not: two only in each`, res.count.same === 1 && res.count.only0 === 2 && res.count.only1 === 2, JSON.stringify(res.count));
  }
  const c = build({ a: { 'Readme.md': [5], 'README.md': [6] }, b: { 'readme.md': [5] } });
  const res = diff(...sides(c, 'a', 'b'), { platform: 'darwin' });
  check('a name two entries of one side fold to falls back to exact names: nothing is matched', res.count.only0 === 2 && res.count.only1 === 1 && res.count.same === 0, JSON.stringify(res.count));
}

/* ---------- a benchmark pair ---------- */
section('A benchmark pair equals places.compare');
{
  const spec = {};
  for (let i = 0; i < 80; i++) spec[`f${String(i).padStart(2, '0')}.dat`] = [1000 + i * 10];
  spec.sub = { 'a.txt': [100] };
  spec.flip = { 'z.txt': [5] };
  const m0 = build({ proj: spec });
  const meas = P.measure(m0.find('proj'), T0);
  // Then: f79 down to f16 kept (64), the rest summed. Now: some gone, some grown, a new one, flip now a file.
  const now = { ...spec };
  delete now['f79.dat'];
  delete now['f78.dat'];
  now['f77.dat'] = [5000];
  now['f70.dat'] = [10];
  now['new.bin'] = [9999];
  now.sub = { 'a.txt': [100], 'b.txt': [0] };
  delete now.flip;
  now.flip = [5];
  const m1 = build({ proj: now });
  const node = m1.find('proj');
  const b = { id: 'b1', rel: 'proj', name: 'proj', m: meas, node };
  const then = sideOfBench(b);
  const here = sideOfFolder(node, 'proj');
  const pc = P.compare(meas, node);
  for (const order of ['now-first', 'then-first']) {
    const [x, y] = order === 'now-first' ? [here, then] : [then, here];
    const res = diff(x, y, { platform: 'win32' });
    const nowI = order === 'now-first' ? 0 : 1;
    const set = (list, i) => list.map((r) => `${r.d[i] ? 1 : 0}|${r.name[i]}`).sort();
    const pcSet = (list) => list.map((e) => `${e.d ? 1 : 0}|${e.name}`).sort();
    check(`${order}: here now equals places.compare's here`, same(set(res.only[nowI], nowI), pcSet(pc.here)), JSON.stringify([set(res.only[nowI], nowI), pcSet(pc.here)]));
    check(`${order}: no longer here equals its gone`, same(set(res.only[1 - nowI], 1 - nowI), pcSet(pc.gone)), JSON.stringify([set(res.only[1 - nowI], 1 - nowI), pcSet(pc.gone)]));
    check(`${order}: changed equals grown and shrunk`, same(set(res.changed, nowI), pcSet([...pc.grown, ...pc.shrunk])), JSON.stringify([set(res.changed, nowI), pcSet([...pc.grown, ...pc.shrunk])]));
    check(`${order}: the summed rest is carried`, (res.partial[1 - nowI]?.n ?? 0) === meas.rest.n && meas.rest.n > 0 && res.partial[nowI] === null);
    const lab = labels(x.rel, y.rel, 'root', [x.kind === 'bench' ? x.at : null, y.kind === 'bench' ? y.at : null]);
    check(`${order}: the labels say now and when (${lab.join(' | ')})`, lab[nowI] === 'proj, now' && /^proj, \d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/.test(lab[1 - nowI]), JSON.stringify(lab));
    const s = sentence(res, lab, x, y);
    check(`${order}: the sentence ("${s}")`, /^proj is [\d.]+ KB larger than when measured on \d{2}\/\d{2}\/\d{4} \d{2}:\d{2}: \d+ entries no longer here, \d+ here now and \d+ changed\.$/.test(s) && wordsOk(s), s);
  }
  const pt = partialText(then);
  check(`the partial sentence ("${pt}")`, /^The benchmark kept the 64 largest of its 82 entries by name; the other 18 \([\d.]+ KB\) were summed, so an entry not among them then is listed as here now, not among the 64 largest then\.$/.test(pt) && wordsOk(pt), pt);
}

/* ---------- labels ---------- */
section('Labels');
{
  check('the root is named by its name', same(labels('', 'a/b', 'Studio'), ['Studio', 'b']));
  check('two folders of one name: the shortest tails that differ', same(labels('Projects/harbor-api/node_modules', 'Projects/tidepool-web/node_modules', 'S'), ['harbor-api/node_modules', 'tidepool-web/node_modules']));
  check('tails of different lengths', same(labels('Photos/2019/2019-03-14 Coast', 'Archive/Old laptop (2019)/Pictures/2019-03-14 Coast', 'S'), ['2019/2019-03-14 Coast', 'Pictures/2019-03-14 Coast']));
  check('a top-level folder against a deeper one of its name', same(labels('a', 'x/a', 'S'), ['a', 'x/a']));
  check('one inside the other, named differently: their own names', same(labels('Projects/harbor-api', 'Projects/harbor-api/src', 'S'), ['harbor-api', 'src']));
  check('one inside the other, named alike: tails', same(labels('nm', 'nm/pkg/nm', 'S'), ['nm', 'pkg/nm']));
  const m = build({ outer: { inner: { 'a.txt': [5] }, 'b.txt': [5] } });
  const res = diff(...sides(m, 'outer', 'outer/inner'));
  const s = sentence(res, labels('outer', 'outer/inner', 'root'), ...sides(m, 'outer', 'outer/inner'));
  check(`nesting is found and said first ("${s.split('. ')[0]}.")`, res.nest === 'b-in-a' && s.startsWith("inner lies inside outer, so its bytes are part of outer's."), s);
}

/* ---------- sentences ---------- */
section('Sentences');
{
  const m = build({ e1: {}, e2: {}, s1: { 'a.txt': [5, T0], 'b.txt': [6, T0] }, s2: { 'a.txt': [5, T0 + 1000], 'b.txt': [6, T0] } });
  const [e1, e2] = sides(m, 'e1', 'e2');
  check('two empty folders', sentence(diff(e1, e2), ['e1', 'e2'], e1, e2) === 'Both folders are empty.');
  const [s1, s2] = sides(m, 's1', 's2');
  const s = sentence(diff(s1, s2), ['s1', 's2'], s1, s2);
  check(`two alike ("${s}")`, s === 'The two hold the same 2 entries, each the same size and last change.', s);
  const r = diff(...sides(build({ a: { x: [1] }, b: { y: [2] } }), 'a', 'b'));
  const ss = shortSentence(r, ['a', 'b']);
  check(`the drill's short sentence ("${ss}")`, ss === '1 only in a and 1 only in b.', ss);
}

/* ---------- region mode ---------- */
section('Region mode: the held diff equals the whole model\'s over the held names');
{
  const files = (prefix, n, size0, step) => {
    const out = [];
    for (let i = 0; i < n; i++) out.push(`${prefix}-${String(i).padStart(4, '0')}.dat`, size0 - i * step, T0 - i * 1000, 0);
    return out;
  };
  // big: 6,000 files; mid: 5,400, sharing the first 5,000 names, every 7th a byte larger.
  const midFiles = files('f', 5400, 1e6, 100);
  for (let j = 0; j < 5400; j += 7) midFiles[j * 4 + 1] += 1;
  for (let j = 5000; j < 5400; j++) midFiles[j * 4] = `m-${j}.dat`;
  const recs = [[0, -1, 'root', T0, 0, []], [1, 0, 'big', T0, 0, files('f', 6000, 1e6, 100)], [2, 0, 'mid', T0, 0, midFiles]];
  const whole = new Model('root');
  whole.ingest(recs, [], whole.root);
  const tree = treeFrom([recs], { name: 'root', anchor: T0 });
  const fetchJSON = async (route, params) => {
    await tick();
    const r = await answer(tree, route, params, { v: 1, state: 'ready', threshold: 0 });
    const json = JSON.parse(JSON.stringify(r.json));
    return route === 'region' ? decode(json) : json;
  };
  const model = new Model('root', { regions: true });
  const R = createRegions({ fetchJSON, model });
  await R.open();
  const big = await R.ensure(await R.resolve('big'));
  const mid = await R.ensure(await R.resolve('mid'));
  const a = sideOfFolder(big, 'big');
  const b = sideOfFolder(mid, 'mid');
  const res = diff(a, b);
  check(`the region holds 5,000 of big's entries and its tail of ${a.tail?.n} (${a.entries.length} held)`, a.entries.length === 5000 && a.tail?.n === 1000 && b.entries.length === 5000 && b.tail?.n === 400, JSON.stringify([a.entries.length, a.tail, b.entries.length, b.tail]));
  const wa = sideOfFolder(whole.find('big'), 'big');
  const wb = sideOfFolder(whole.find('mid'), 'mid');
  const heldA = new Set(a.entries.map((e) => e.name));
  const heldB = new Set(b.entries.map((e) => e.name));
  const wres = diff({ ...wa, entries: wa.entries.filter((e) => heldA.has(e.name)) }, { ...wb, entries: wb.entries.filter((e) => heldB.has(e.name)) });
  const sig = (r) => JSON.stringify([r.only[0].map((x) => x.key), r.only[1].map((x) => x.key), r.changed.map((x) => [x.key, x.why]), r.same.map((x) => x.key), r.count]);
  check(`the held diff equals the whole model's over the held names (${JSON.stringify(res.count)})`, sig(res) === sig(wres) && res.count.changed > 0 && res.count.same > 0, `${sig(res).slice(0, 200)} vs ${sig(wres).slice(0, 200)}`);
  const tailBytes = wa.entries.filter((e) => !heldA.has(e.name)).reduce((t, e) => t + e.s, 0);
  check('unsent equals the tail', same(res.unsent[0], { n: 1000, s: tailBytes }) && res.unsent[1]?.n === 400, JSON.stringify(res.unsent));
  check('the head figures are the whole folder\'s, held or not', a.s === wa.s && a.fc === wa.fc && a.items === 6000 && b.items === 5400);
  const u = unsentText(a, 'big', 'mid');
  check(`unsentText ("${u}")`, /^big holds 6,000 entries; the service sends a folder's 5,000 largest, so its 1,000 smallest \([\d.]+ [KMG]?B\) are not compared\. An entry listed as only in mid may be among them\.$/.test(u), u);
  R.close();
}

/* ---------- performance ---------- */
section('Performance');
{
  const mk = (n, shift) => {
    const entries = [];
    for (let i = 0; i < n; i++) entries.push({ name: `file-${(i + shift).toString(36)}.bin`, d: false, s: (i * 7919) % 100000, f: 1, m: T0 - (i % 5000) * 1000, e: 0, link: false });
    return { kind: 'folder', rel: `p${shift}`, name: `p${shift}`, s: 0, fc: n, dc: 0, items: n, mm: T0, ks: null, e: 0, entries, tail: null };
  };
  const a = mk(100000, 0);
  const b = mk(100000, 20000);
  let best = Infinity;
  let res = null;
  for (let i = 0; i < 3; i++) {
    const t0 = performance.now();
    res = diff(a, b, { platform: 'win32' });
    best = Math.min(best, performance.now() - t0);
  }
  check(`2 × 100,000 entries compared in ${best.toFixed(0)} ms (under 400)`, best < 400 && res.count.names === 120000, JSON.stringify(res.count));
}

/* ---------- the demo world ---------- */
section('The demo world\'s pairs');
{
  const NOW = Date.UTC(2026, 10, 15, 12, 0, 0);
  const svc = createDemoService({ now: NOW });
  const model = new Model(svc.world.root.name);
  const idMap = [];
  for (const batch of (await svc.handle('GET', 'scan', { path: '' })).batches) model.ingest(batch, idMap, model.root);
  const info = (await svc.handle('GET', 'info')).json;
  const nm = diff(...sides(model, 'Projects/harbor-api/node_modules', 'Projects/tidepool-web/node_modules'), { platform: info.platform });
  check(`harbor-api's node_modules against tidepool-web's: only in each and changed (${JSON.stringify(nm.count)})`, nm.count.only0 > 0 && nm.count.only1 > 0 && nm.count.changed > 0, JSON.stringify(nm.count));
  const photos = model.find('Photos');
  const events = [];
  for (const y of photos.c) if (y.d) for (const e of y.c) if (e.d) events.push(e);
  const pics = model.find('Archive/Old laptop (2019)/Pictures');
  const copy = pics.c.find((c) => c.d);
  const ev = events.find((e) => e.n === copy.n);
  const rel = (n) => { const parts = []; for (let x = n; x.p; x = x.p) parts.unshift(x.n); return parts.join('/'); };
  const ph = diff(...sides(model, rel(ev), rel(copy)), { platform: info.platform });
  check(`${rel(ev)} against the laptop's copy: at least 24 the same, nothing only in the copy (${JSON.stringify(ph.count)})`, ph.count.same >= 24 && ph.count.only1 === 0, JSON.stringify(ph.count));
  const lab = labels(rel(ev), rel(copy), model.root.n);
  const s = sentence(ph, lab, ...sides(model, rel(ev), rel(copy)));
  check(`its sentence ("${s}")`, wordsOk(s) && /none only in/.test(s), s);
  check(`the demo's platform (${info.platform}) does not fold`, info.platform !== 'win32' && info.platform !== 'darwin');
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
