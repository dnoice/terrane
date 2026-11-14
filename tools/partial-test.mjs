#!/usr/bin/env node
/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Partial Model Test (Terrane Edition - v1.0)
 *     - File Name: partial-test.mjs
 *     - Relative Path: tools/partial-test.mjs
 *     - Artifact Type: test
 *     - Version: 1.0.0
 *     - Date: 11/14/2026
 *     - Update: Saturday, November 14, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Changelog:
 *     - 1.0.0 (11/14/2026) [dendogg + Anthropic - Claude Opus 5.5] —
 *       Initial release.
 *
 * ✒ Description:
 *     Checks the page's region mode without a service or a browser: the
 *     region client (web/js/regions.js) fills a partial Model from a
 *     column tree held in this process, answered through columns.js
 *     answer() as the service answers, and every layout, figure and age it
 *     gives is compared with the whole Model of the same generated tree.
 *
 * ✒ Key Features:
 *     - Layout parity: at six eye positions from the overview down to
 *       street level over a folder of more than 5,000 files, at two
 *       grains, the layout's wants are loaded until none is left, and the
 *       layout then equals the whole tree's box for box (path, type,
 *       level, mark, geometry within 1e-9)
 *     - Every held folder's figures equal the whole Model's, and its
 *       children are the same entries
 *     - RegionAges answers as AgeTable for every held folder at every
 *       step, and for files
 *     - The budget: a small budget kept along a walk, pinned folders kept,
 *       a folder let go and loaded again with the same figures
 *     - resolve: a deep folder, a file in a large folder's tail (its
 *       parent then holds it), a path not in the tree
 *     - refresh: a folder read again keeps its kept nodes, adds and drops
 *       children, and gives its ancestors their new figures
 *     - A new generation calls onStale once and settles what waits
 *     - The batching caps: two requests in flight, 64 ids each
 *     - decode() against the JSON it read; kids() and relPath() of a ref
 *
 * ✒ Usage Instructions:
 *     node tools/partial-test.mjs
 *     npm test runs it after the regions test. It starts no service.
 *
 * ✒ Other Important Information:
 *     - Dependencies: Node.js 22.5+; web/js/regions.js, columns.js,
 *       model.js, layout.js, timeline.js; tools/make-synthetic.mjs
 *     - Compatible platforms: Windows, macOS, Linux
 *     - Safety: nothing is written to disk; every tree is generated in
 *       memory
 *     - Exit code 0 means every check passed
 * ----------------------------------------------------------------------------
 */

const C = await import(new URL('../web/js/columns.js', import.meta.url).href);
const { Model, relPath, kids, isAncestor, D_LEN, D_NAME, D_ERR, D_ID } = await import(new URL('../web/js/model.js', import.meta.url).href);
const { buildLayout, BOX } = await import(new URL('../web/js/layout.js', import.meta.url).href);
const { buildAgeTable, RegionAges, ageRow, STEPS } = await import(new URL('../web/js/timeline.js', import.meta.url).href);
const { createRegions, decode, REGION_BUDGET } = await import(new URL('../web/js/regions.js', import.meta.url).href);
const G = await import(new URL('./make-synthetic.mjs', import.meta.url).href);
const { treeFrom, answer } = C;

let passed = 0;
let failed = 0;
const check = (name, cond, detail = '') => {
  if (cond) passed++;
  else failed++;
  console.log(`${cond ? '  ok  ' : ' FAIL '} ${name}${cond || !detail ? '' : ` — ${String(detail).slice(0, 600)}`}`);
};
const section = (title) => console.log(`\n${title}`);
const NOW = 1794744000000;
const tick = () => new Promise((r) => setImmediate(r));

/* ---------- the tree, the whole model, and the fake service ---------- */

const batches = [...G.generate({ entries: 120000, seed: 11, now: NOW })];
const whole = new Model('synthetic');
{
  const idMap = [];
  for (const b of batches) whole.ingest(b, idMap, whole.root);
}
const tree = treeFrom(batches, { name: 'synthetic', anchor: NOW });

/** A service in this process: columns.js answer() over tree, generation svc.v, fresh reads through svc.readers. */
const svc = { v: 1, readers: null, calls: [], inFlight: 0, maxInFlight: 0, maxIds: 0 };
async function fetchJSON(route, params) {
  svc.calls.push({ route, params });
  if (params.ids) svc.maxIds = Math.max(svc.maxIds, String(params.ids).split(',').length);
  svc.inFlight++;
  svc.maxInFlight = Math.max(svc.maxInFlight, svc.inFlight);
  try {
    await tick();
    const r = await answer(tree, route, params, { v: svc.v, state: 'ready', threshold: 0, readers: params.fresh ? svc.readers : null });
    // Through JSON, as the wire carries it.
    const json = JSON.parse(JSON.stringify(r.json));
    return route === 'region' ? decode(json) : json;
  } finally {
    svc.inFlight--;
  }
}

async function idle(R, limit = 2000) {
  for (let i = 0; i < limit; i++) {
    await tick();
    if (R.stats.idle) return true;
  }
  return false;
}

/** A layout's boxes as comparable rows: [path or scree:path, type, level, aux, geo...]. */
function rows(L) {
  const out = [];
  for (let i = 0; i < L.n; i++) {
    const k = L.key[i];
    const name = k?.scree ? `scree:${relPath(L.node[i])}` : `${relPath(k)}${k.d ? '/' : ''}`;
    out.push({ name, type: L.type[i], level: L.level[i], aux: L.aux[i], geo: Array.from(L.geo.subarray(i * 6, i * 6 + 6)) });
  }
  return out;
}

function sameLayout(a, b) {
  if (a.n !== b.n) return `${a.n} boxes against ${b.n}`;
  const ra = rows(a);
  const rb = rows(b);
  for (let i = 0; i < ra.length; i++) {
    const x = ra[i];
    const y = rb[i];
    if (x.name !== y.name || x.type !== y.type || x.level !== y.level || x.aux !== y.aux) return `box ${i}: ${JSON.stringify([x.name, x.type, x.level, x.aux])} against ${JSON.stringify([y.name, y.type, y.level, y.aux])}`;
    for (let k = 0; k < 6; k++) if (Math.abs(x.geo[k] - y.geo[k]) > 1e-9) return `box ${i} (${x.name}) geo ${k}: ${x.geo[k]} against ${y.geo[k]}`;
  }
  return null;
}

/** The folder with the most direct children, in the whole model. */
let big = whole.root;
{
  const stack = [whole.root];
  while (stack.length) {
    const n = stack.pop();
    if (n.c.length > big.c.length) big = n;
    for (const c of n.c) if (c.d) stack.push(c);
  }
}
const bigRel = relPath(big);

/**
 * Six eyes from the overview down over the big folder: each above the
 * box nearest it on its chain at the eye before. They are planned on a
 * model of their own, so the layouts that plan them leave no folder's
 * open state behind in the models compared.
 */
function eyes(grain) {
  const plan = new Model('synthetic');
  const idMap = [];
  for (const b of batches) plan.ingest(b, idMap, plan.root);
  const target = plan.find(bigRel);
  const chain = [];
  for (let a = target; a; a = a.p) chain.unshift(a);
  const out = [{ x: 0, y: 900, z: 1200 }];
  let cam = out[0];
  for (const hgt of [420, 150, 55, 18, 5]) {
    const L = buildLayout(plan.root, { cam, grain, now: NOW });
    let at = null;
    for (const n of chain) {
      const i = L.index.get(n);
      if (i !== undefined) at = i;
    }
    const g = L.geo;
    cam = { x: g[at * 6], y: g[at * 6 + 1] + hgt, z: g[at * 6 + 2] + hgt * 0.4 };
    out.push(cam);
  }
  return out;
}

/* ---------- 1. layout parity ---------- */

section('1. Layout parity with the whole tree');
check(`the generated tree has a folder of more than 5,000 entries (${big.c.length.toLocaleString('en-US')} in ${bigRel || 'the root'})`, big.c.length > 5000);

const grains = [0.0062, 0.0038];
const plans = grains.map((g) => eyes(g));
const part = new Model('synthetic', { regions: true });
const R = createRegions({ fetchJSON, model: part });
const info = await R.open();
check('open() makes the root from the tree and holds its region', part.root.x === 0 && part.root.u === false && part.root.c.length === whole.root.c.length && info.state === 'ready' && R.v === 1);
check('the root holds the tree\'s counts and RegionAges its anchor', part.root.fc === whole.root.fc && part.root.dc === whole.root.dc && part.root.s === whole.root.s && R.ages instanceof RegionAges && R.ages.anchor === NOW);

// Whole and partial models see the same eyes in the same order, so the
// open folders' hysteresis is the same in both.
const parity = [];
let loops = 0;
let maxLoops = 0;
for (let gi = 0; gi < grains.length; gi++) {
  for (const cam of plans[gi]) {
    const Lw = buildLayout(whole.root, { cam, grain: grains[gi], now: NOW });
    let Lp = null;
    let n = 0;
    for (; n < 60; n++) {
      Lp = buildLayout(part.root, { cam, grain: grains[gi], now: NOW });
      if (!Lp.want.length) break;
      R.want(Lp.want);
      await idle(R);
    }
    loops += n;
    maxLoops = Math.max(maxLoops, n);
    parity.push({ grain: grains[gi], cam, boxes: Lw.n, coarsened: Lw.coarsened, bad: sameLayout(Lp, Lw), converged: !Lp.want.length });
  }
}
for (const p of parity) {
  check(`grain ${p.grain}, eye at height ${p.cam.y.toFixed(1)}: ${p.boxes.toLocaleString('en-US')} boxes${p.coarsened ? ' (coarsened)' : ''}, the wants run dry and the layout equals the whole tree's`, p.converged && !p.bad, p.bad || 'wants left');
}
check(`the eye reached the big folder: its box stands open at street level`, (() => {
  const L = buildLayout(part.root, { cam: plans[1].at(-1), grain: grains[1], now: NOW });
  const node = R.nearest(bigRel);
  return relPath(node) === bigRel && L.type[L.index.get(node)] === BOX.DIR;
})());
console.log(`  note  ${loops} layouts to load the wants over ${parity.length} eyes, at most ${maxLoops} at one; ${R.stats.requests} requests, ${R.stats.regions} regions, ${R.stats.held.toLocaleString('en-US')} entries held`);
check(`at most two requests were in flight and at most 64 ids asked for at once (${svc.maxInFlight}, ${svc.maxIds})`, svc.maxInFlight <= 2 && svc.maxIds <= 64 && svc.maxIds > 1);

/* ---------- 2. figures ---------- */

section('2. Figures of every held folder');
const heldFolders = [];
{
  const stack = [part.root];
  while (stack.length) {
    const n = stack.pop();
    if (!n.d) continue;
    heldFolders.push(n);
    if (!n.u) for (const c of n.c) if (c.d) stack.push(c);
  }
}
{
  const bad = [];
  let withTail = 0;
  for (const n of heldFolders) {
    const w = whole.find(relPath(n));
    if (!w) {
      bad.push(`${relPath(n)} is not in the whole model`);
      continue;
    }
    for (const f of ['s', 'fc', 'dc', 'h', 'mm', 'm']) if (n[f] !== w[f]) bad.push(`${relPath(n)} ${f}: ${n[f]} against ${w[f]}`);
    if ((n.e || 0) !== (w.e || 0)) bad.push(`${relPath(n)} e`);
    if (n.f !== w.f) bad.push(`${relPath(n)} flags`);
    for (let k = 0; k < 9; k++) if (n.ks[k] !== w.ks[k]) bad.push(`${relPath(n)} ks${k}`);
    if (kids(n) !== w.c.length) bad.push(`${relPath(n)} kids ${kids(n)} against ${w.c.length}`);
    if (!n.u) {
      if (n.tail) withTail++;
      const names = new Set(w.c.map((c) => `${c.d ? 'd' : 'f'}:${c.n}`));
      const mine = n.c.map((c) => `${c.d ? 'd' : 'f'}:${c.n}`);
      const held = n.c.length + (n.tail ? n.tail.n : 0);
      if (held !== w.c.length || mine.some((x) => !names.has(x))) bad.push(`${relPath(n)} children`);
      if (n.tail && n.tail.s !== w.c.reduce((a, c) => a + c.s, 0) - n.c.reduce((a, c) => a + c.s, 0)) bad.push(`${relPath(n)} tail bytes`);
      for (const c of n.c) {
        if (c.d) continue;
        const wc = w.c.find((x) => !x.d && x.n === c.n);
        if (!wc || wc.s !== c.s || wc.m !== c.m || wc.f !== c.f || wc.k !== c.k) {
          bad.push(`${relPath(c)} file`);
          break;
        }
      }
    }
  }
  check(`every one of ${heldFolders.length.toLocaleString('en-US')} folders in the partial model has the whole model's figures, flags and children (${withTail} with a tail)`, bad.length === 0, bad.slice(0, 4).join(' | '));
  check('a folder with a tail holds the 5,000 largest and counts the rest', withTail > 0 && heldFolders.filter((n) => n.tail).every((n) => n.c.length === 5000 && n.tail.n === kids(n) - 5000));
}

/* ---------- 3. ages ---------- */

section('3. RegionAges against AgeTable');
{
  const A = buildAgeTable(whole.root, NOW);
  const B = R.ages;
  const bad = [];
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  for (const n of heldFolders) {
    const w = whole.find(relPath(n));
    if (!B.has(n) || !A.has(w)) bad.push(`${relPath(n)} has`);
    for (let k = 0; k < STEPS; k++) {
      if (B.changedBytes(n, k) !== A.changedBytes(w, k) || B.changedFiles(n, k) !== A.changedFiles(w, k) || B.kept(n, k) !== A.kept(w, k)) {
        bad.push(`${relPath(n)} step ${k}`);
        break;
      }
    }
    if (B.totalBytes(n) !== A.totalBytes(w) || B.totalFiles(n) !== A.totalFiles(w)) bad.push(`${relPath(n)} totals`);
    if (B.medianStep(n) !== A.medianStep(w) || B.lastStep(n) !== A.lastStep(w)) bad.push(`${relPath(n)} median ${B.medianStep(n)}/${A.medianStep(w)} last ${B.lastStep(n)}/${A.lastStep(w)}`);
    if (!same(B.bands(n), A.bands(w))) bad.push(`${relPath(n)} bands`);
  }
  check(`every held folder answers alike at every step: changed, kept, totals, median, last step, strata (${heldFolders.length.toLocaleString('en-US')} folders)`, bad.length === 0, bad.slice(0, 4).join(' | '));
  const files = part.root.c.filter((c) => !c.d).slice(0, 50);
  const wf = files.map((f) => whole.root.c.find((x) => x.n === f.n));
  const fileBad = files.filter((f, i) => [0, 3, 9, 16].some((k) => B.changedBytes(f, k) !== A.changedBytes(wf[i], k) || B.kept(f, k) !== A.kept(wf[i], k)) || B.medianStep(f) !== A.medianStep(wf[i]) || !same(B.bands(f), A.bands(wf[i])));
  check(`files answer from their own date and size, as AgeTable answers (${files.length})`, files.length > 0 && fileBad.length === 0);
  check('the ladder is the same', same(B.T, A.T) && B.stepOf(NOW - 3 * 86400000) === A.stepOf(NOW - 3 * 86400000));
  const loose = { d: true, s: 10, fc: 2, mm: NOW - 1000, m: NOW, c: [] };
  check('a folder without a row answers as AgeTable answers one it does not hold', !B.has(loose) && B.changedBytes(loose, 0) === A.changedBytes(loose, 0) && B.kept(loose, 1) === A.kept(loose, 1) && B.medianStep(loose) === A.medianStep(loose));
  const D = tree.encodeD(0);
  check('ageRow(D) is the record\'s 43 values from D_AB', same(Array.from(ageRow(D)), D.slice(19, 62)) && same(Array.from(part.root.g), D.slice(19, 62)));
}

/* ---------- 4. the budget ---------- */

section('4. The budget');
{
  const model = new Model('synthetic', { regions: true });
  const B = createRegions({ fetchJSON, model });
  await B.open();
  B.budget = 5000;
  B.floor = 4000;
  const grain = grains[1];
  let worst = 0;
  let evictions = 0;
  let pinsKept = true;
  for (const cam of plans[1]) {
    for (let n = 0; n < 60; n++) {
      const L = buildLayout(model.root, { cam, grain, now: NOW });
      const open = new Set();
      for (let i = 0; i < L.n; i++) if (L.type[i] === BOX.DIR) open.add(L.node[i]);
      // Pinned: the folder under the eye's chain toward the big folder.
      const at = B.nearest(bigRel);
      const pins = new Set();
      for (let a = at.d ? at : at.p; a; a = a.p) pins.add(a);
      if (B.held > B.budget) {
        const before = [...pins].filter((p) => !p.u);
        B.evict(pins, open);
        evictions++;
        if (!before.every((p) => !p.u && B.live(p))) pinsKept = false;
        const rest = B.held <= B.floor || [...openHeld(model.root)].every((f) => f === model.root || pins.has(f) || open.has(f));
        if (!rest) worst = Math.max(worst, B.held);
      }
      if (!L.want.length) break;
      B.want(L.want);
      await idle(B);
    }
  }
  function* openHeld(root) {
    const stack = [root];
    while (stack.length) {
      const d = stack.pop();
      if (d.u) continue;
      yield d;
      for (const c of d.c) if (c.d && !c.u) stack.push(c);
    }
  }
  check(`after every eviction the entries held are at the floor, or every held folder is pinned or open (${evictions} evictions, ${B.stats.dropped} regions let go)`, evictions > 0 && worst === 0 && B.stats.dropped > 0, `held ${worst}`);
  check('pinned folders stay held', pinsKept);
  // A folder let go is loaded again with the same figures and children.
  const back = (() => {
    const stack = [model.root];
    while (stack.length) {
      const d = stack.pop();
      for (const c of d.c) {
        if (!c.d) continue;
        if (c.u && c.cn > 0 && c.x !== undefined && B.live(c)) return c;
        if (!c.u) stack.push(c);
      }
    }
    return null;
  })();
  const again = back ? await B.ensure(back) : null;
  const w = again ? whole.find(relPath(again)) : null;
  check(`a folder let go (or never held) loads again with the whole model's figures and children (${back ? relPath(back) : 'none'})`, !!again && again === back && !again.u && again.s === w.s && again.fc === w.fc && again.c.length + (again.tail?.n || 0) === w.c.length);
  check(`REGION_BUDGET is 200,000 and a client starts with it (${R.budget}, floor ${R.floor})`, REGION_BUDGET === 200000 && R.budget === 200000 && R.floor === 150000);
}

/* ---------- 5. resolve ---------- */

section('5. resolve');
{
  const model = new Model('synthetic', { regions: true });
  const Q = createRegions({ fetchJSON, model });
  await Q.open();
  let deep = whole.root;
  const stack = [whole.root];
  while (stack.length) {
    const n = stack.pop();
    if (n.h === 0 && relPath(n).split('/').length > relPath(deep).split('/').length) deep = n;
    for (const c of n.c) if (c.d) stack.push(c);
  }
  const before = svc.calls.length;
  const node = await Q.resolve(relPath(deep));
  check(`a folder ${relPath(deep).split('/').length} levels down is found in one request, its whole chain held (${relPath(deep)})`, !!node && relPath(node) === relPath(deep) && node.d && svc.calls.length - before === 1 && (() => {
    for (let a = node.p; a; a = a.p) if (a.u || !a.c.includes(a === node.p ? node : null) && false) return false;
    return true;
  })());
  let attached = true;
  for (let a = node; a.p; a = a.p) if (!a.p.c.includes(a)) attached = false;
  check('every link of that chain is in its parent\'s children', attached);
  const again = svc.calls.length;
  const same = await Q.resolve(relPath(deep));
  check('asked again, it is walked through what is held, with no request', same === node && svc.calls.length === again);
  // The smallest file of the big folder lies in its tail.
  const smallest = big.c.filter((c) => !c.d).reduce((a, c) => (c.s < a.s ? c : a));
  const fileRel = relPath(smallest);
  const file = await Q.resolve(fileRel);
  check(`a file in the tail of a ${big.c.length.toLocaleString('en-US')}-entry folder is found, and its parent then holds it (${fileRel})`, !!file && !file.d && file.n === smallest.n && file.s === smallest.s && file.p.c.includes(file) && file.p.c.length === 5001);
  check('a path not in the tree is null', (await Q.resolve(`${relPath(deep)}/no such folder/at all`)) === null && (await Q.resolve('no-such-top-level')) === null);
  const ref = { ref: true, n: smallest.n, rel: fileRel, d: false, s: smallest.s, p: { ref: true, d: true, rel: bigRel, p: null } };
  check('resolveRef finds the node a ref stands for', (await Q.resolveRef(ref)) === file && (await Q.resolveRef(file)) === file);
  check('nearest() is the deepest node held on a path, without a request', (() => {
    const n0 = svc.calls.length;
    const a = Q.nearest(`${relPath(deep)}/missing`);
    return a === node && svc.calls.length === n0 && Q.nearest('') === model.root;
  })());
  const all = await Q.resolveAll([relPath(deep), null, 'nowhere', fileRel]);
  check('resolveAll keeps the order, null for nothing asked and for a path not there', all[0] === node && all[1] === null && all[2] === null && all[3] === file);
}

/* ---------- 6. refresh ---------- */

section('6. refresh');
{
  const model = new Model('synthetic', { regions: true });
  const F = createRegions({ fetchJSON, model });
  await F.open();
  // A folder with files and child folders, two levels down.
  let target = null;
  const stack = [whole.root];
  while (stack.length && !target) {
    const n = stack.pop();
    if (relPath(n).split('/').length === 2 && n.c.filter((c) => !c.d).length >= 3 && n.c.filter((c) => c.d).length >= 2 && n.c.length < 400) target = n;
    for (const c of n.c) if (c.d) stack.push(c);
  }
  const rel = relPath(target);
  const node = await F.resolve(rel);
  await F.ensure(node);
  const filesBefore = node.c.filter((c) => !c.d);
  const dirsBefore = node.c.filter((c) => c.d);
  const keptFile = filesBefore[1];
  const goneFile = filesBefore[0];
  const keptDir = dirsBefore[1];
  const goneDir = dirsBefore[0];
  const parent = node.p;
  const parentS = parent.s;
  // The disk as it is now: one file gone, one resized, one new; one folder gone, one new.
  const id = tree.idOf(rel);
  const packed = [];
  for (let j = tree.file0[id]; j < tree.file0[id] + tree.fileN[id]; j++) {
    if (tree.fname[j] === goneFile.n) continue;
    packed.push(tree.fname[j], tree.fname[j] === keptFile.n ? tree.fsize[j] + 1000 : tree.fsize[j], tree.fmtime[j], tree.fflags[j]);
  }
  packed.push('new-file.txt', 777, NOW - 1000, 0);
  const depth1 = [[0, -1, target.n, NOW - 500, 0, packed]];
  let k = 1;
  for (let i = 0; i < tree.kidN[id]; i++) {
    const c = tree.kids[tree.kid0[id] + i];
    if (tree.name[c] !== goneDir.n) depth1.push([k++, 0, tree.name[c], tree.mtime[c], 'STUB', []]);
  }
  depth1.push([k, 0, 'new-folder', NOW - 400, 'STUB', []]);
  svc.readers = {
    depth1: async (r) => {
      if (r !== rel) {
        const e = new Error('only the target');
        e.code = 'EIO';
        throw e;
      }
      return depth1;
    },
    deep: async () => [[0, -1, 'new-folder', NOW - 400, 0, ['inner.md', 50, NOW - 400, 0]]],
  };
  const keptChildHeld = await F.ensure(keptDir);
  const { dirs } = await F.refresh([rel]);
  svc.readers = null;
  const names = node.c.map((c) => c.n);
  check('the folder read again is among the folders the refresh returns', dirs.has(node) && dirs.size === 1);
  check('a kept file keeps its node and takes its new size', node.c.includes(keptFile) && keptFile.s === tree.fsize[tree.fileByName(id, keptFile.n)] && keptFile.s > 1000);
  check('a kept folder keeps its node and its own held region', node.c.includes(keptDir) && keptDir === keptChildHeld && !keptDir.u && F.live(keptDir));
  check('the new file and the new folder are there, and the gone ones are not', names.includes('new-file.txt') && names.includes('new-folder') && !names.includes(goneFile.n) && !names.includes(goneDir.n));
  check('the gone folder is forgotten', !F.live(goneDir));
  const nf = node.c.find((c) => c.n === 'new-folder');
  check('the new folder carries its figures: one file of 50 bytes', nf.d && nf.u && nf.fc === 1 && nf.s === 50 && kids(nf) === 1);
  const D0 = tree.encodeD(tree.idOf(relPath(parent)));
  check('the ancestors take their new figures', parent.s === D0[C.D_S] && parent.fc === D0[C.D_FC] && parent.s !== parentS && model.root.s === tree.encodeD(0)[C.D_S]);
  check('the folder\'s own figures are the tree\'s', node.s === tree.encodeD(id)[C.D_S] && kids(node) === tree.encodeD(id)[C.D_CN]);
}

/* ---------- 7. a new generation ---------- */

section('7. A new generation');
{
  const model = new Model('synthetic', { regions: true });
  let staleCalls = 0;
  const S7 = createRegions({ fetchJSON, model, onStale: () => { staleCalls++; } });
  await S7.open();
  const closed = model.root.c.find((c) => c.d && c.u && c.cn > 0);
  svc.v = 2;
  const got = await S7.ensure(closed);
  const got2 = await S7.resolve(`${closed.n}/whatever`);
  svc.v = 1;
  check('a region asked of the old generation calls onStale once, and what waited settles with null', staleCalls === 1 && got === null && got2 === null);
}

/* ---------- 8. decode ---------- */

section('8. decode');
{
  const r = await answer(tree, 'region', { v: '1', ids: `0,${tree.idOf(bigRel)}` }, { v: 1 });
  const json = JSON.parse(JSON.stringify(r.json));
  const out = decode(json);
  const ok = out.regions.every((R0, i) => {
    const J = json.regions[i];
    const D = [J.self, ...J.d];
    if (R0.id !== J.id || R0.n !== J.n || JSON.stringify(R0.tail) !== JSON.stringify(J.tail)) return false;
    for (let j = 0; j < D.length; j++) {
      if (R0.dirs.names[j] !== D[j][D_NAME] || (R0.dirs.errs[j] || 0) !== (D[j][D_ERR] || 0) || R0.dirs.ids[j] !== D[j][D_ID]) return false;
      for (let k = 0; k < D_LEN; k++) if (k !== D_NAME && k !== D_ERR && R0.dirs.figs[j * D_LEN + k] !== D[j][k]) return false;
    }
    for (let j = 0; j < J.f.length / 4; j++) {
      if (R0.files.names[j] !== J.f[j * 4] || R0.files.size[j] !== J.f[j * 4 + 1] || R0.files.mtime[j] !== J.f[j * 4 + 2] || R0.files.flags[j] !== J.f[j * 4 + 3]) return false;
    }
    return true;
  });
  check(`decode() gives the JSON's every name, error, id, figure and file in columns (${out.regions.length} regions)`, ok && out.v === 1 && out.anchor === NOW && out.regions[1].tail !== null);
}

/* ---------- 9. kids and relPath ---------- */

section('9. kids() and relPath()');
{
  const dir = { d: true, c: [{}, {}], n: 'a', p: null };
  check('kids() is the service\'s count when it has one, else the children held', kids(dir) === 2 && kids({ ...dir, cn: 9000, c: [] }) === 9000 && kids({ ...dir, cn: 0 }) === 0);
  check('relPath() of a ref is its own path; of a node, its chain', relPath({ ref: true, rel: 'x/y.txt', n: 'y.txt', p: null }) === 'x/y.txt' && relPath(whole.find(bigRel)) === bigRel);
  check('isAncestor still walks parents', isAncestor(whole.root, whole.find(bigRel)));
}

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
