#!/usr/bin/env node
/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Strata Test (Terrane Edition - v1.0)
 *     - File Name: strata-test.mjs
 *     - Relative Path: tools/strata-test.mjs
 *     - Artifact Type: test
 *     - Version: 1.0.0
 *     - Date: 11/13/2026
 *     - Update: Friday, November 13, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Description:
 *     Runs the browser's strata module (web/js/strata.js) in Node against
 *     model trees built with the browser's own model, age tables built
 *     with its own timeline and layouts built with its own layout, and
 *     checks bytes by last change, the sentence, the typical age and the
 *     closed-mass colours of the Age lens without a page or a service.
 *
 * ✒ Key Features:
 *     - The six strata: edges at exactly 1, 7, 30, 365 and 1,095 days,
 *       middle ages on the ramp's log scale, colours from the age ramp
 *     - A file on an edge and a millisecond inside it, an undated file and
 *       one dated in the future each land in the stratum the table says
 *     - 400,000 files in 30,000 folders: for every folder the six byte
 *       sums equal dir.s and the six counts equal dir.fc
 *     - The typical age is always true: more than half the bytes are
 *       unchanged since its date, and at most half since the next rung
 *     - The fixture's strata pair: the same newest change, so the old
 *       colouring gives them one colour; the new one puts strata-old at
 *       the ramp's old end and strata-live at its fresh end
 *     - The sentence and the hover line, in the house's words: "changed",
 *       never "created", "arrived" or "added"
 *     - paint()'s closed-mass branch under the Age lens at about 10,000
 *       boxes: the new colouring against the old, at most 0.2 ms more
 *     - The module names no browser global
 *
 * ✒ Usage Instructions:
 *     node tools/strata-test.mjs
 *     npm test runs it after the working sessions test.
 *
 * ✒ Other Important Information:
 *     - Dependencies: Node.js 22+; web/js/strata.js, web/js/timeline.js,
 *       web/js/model.js, web/js/theme.js and web/js/layout.js
 *     - Compatible platforms: Windows, macOS, Linux
 *     - Memory: the 400,000-file tree is held once, about 200 MB
 *     - Exit code 0 means every check passed
 * ----------------------------------------------------------------------------
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.join(HERE, '..', 'web', 'js');
const { Model, freshness } = await import(new URL('../web/js/model.js', import.meta.url).href);
const { THEME, mixHex, ramp } = await import(new URL('../web/js/theme.js', import.meta.url).href);
const { buildLayout, BOX } = await import(new URL('../web/js/layout.js', import.meta.url).href);
const { buildAgeTable, LADDER_DAYS, STEPS, BANDS, DAY } = await import(new URL('../web/js/timeline.js', import.meta.url).href);
const X = await import(new URL('../web/js/strata.js', import.meta.url).href);
const { STRATA, strataOf, strataSentence, typicalAge, typicalLine, massTones, stepAgeDays, freshOfDays, shareText, shareFigure, midDays } = X;

let passed = 0;
let failed = 0;
const check = (name, cond, detail = '') => {
  if (cond) passed++;
  else failed++;
  console.log(`${cond ? '  ok  ' : ' FAIL '} ${name}${cond || !detail ? '' : ' — ' + detail}`);
};
const section = (title) => console.log(`\n${title}`);
const HOUR = 3600000;
const MIB = 1024 * 1024;
const AT = Date.UTC(2026, 10, 13, 17, 0, 0);
const WORDS = /creat|arriv|\badded\b/i;
const p2 = (x) => String(x).padStart(2, '0');
const day = (ms) => { const d = new Date(ms); return `${p2(d.getMonth() + 1)}/${p2(d.getDate())}/${d.getFullYear()}`; };

/**
 * A model from a plain description: { name: [files...] | { sub } }, where a
 * file is [size, mtime]. Built through Model.ingest, as the page does.
 */
function build(spec, rootName = 'root') {
  const model = new Model(rootName);
  const records = [];
  let id = 0;
  const walk = (obj, pid, name, myId) => {
    const files = [];
    const dirs = [];
    for (const [k, v] of Object.entries(obj)) {
      if (Array.isArray(v) && typeof v[0] === 'number') files.push(k, v[0], v[1] ?? AT, 0);
      else dirs.push([k, v]);
    }
    records.push([myId, pid, name, AT - 30 * DAY, 0, files]);
    for (const [k, v] of dirs) walk(v, myId, k, ++id);
  };
  walk(spec, -1, rootName, 0);
  model.ingest(records, [], model.root);
  return model;
}
const find = (model, rel) => rel.split('/').reduce((d, n) => d?.c.find((c) => c.n === n), model.root);

/* ---------- the six strata ---------- */

section('The six strata');
{
  const edges = STRATA.map((s) => s.from);
  check('six strata, newest first, from 0, 1, 7, 30, 365 and 1,095 days, the last running on',
    STRATA.length === BANDS && BANDS === 6 && JSON.stringify(edges) === '[0,1,7,30,365,1095]' && STRATA.at(-1).to === Infinity
    && STRATA.every((s, j) => j === 5 || s.to === STRATA[j + 1].from) && Object.isFrozen(STRATA) && STRATA.every(Object.isFrozen), JSON.stringify(edges));
  check('their labels', JSON.stringify(STRATA.map((s) => s.label)) === JSON.stringify(['Under a day', 'A day to a week', 'A week to a month', 'A month to a year', 'One to three years', 'Over three years']));
  const mids = STRATA.map((s) => s.mid);
  check(`each middle age lies inside its stratum on the log scale (${mids.map((m) => m.toFixed(1)).join(', ')} days)`,
    STRATA.every((s) => s.mid > s.from && s.mid < Math.min(s.to, 3650))
    && Math.abs(STRATA[1].mid - 3) < 1e-9 && Math.abs(midDays(0, 1) - (Math.SQRT2 - 1)) < 1e-12, JSON.stringify(mids));
  check('their colours are the age ramp at those ages, fresher to older',
    STRATA.every((s) => s.color === ramp(THEME.ageRamp, s.fresh) && Math.abs(s.fresh - freshness(AT - s.mid * DAY, AT)) < 1e-12)
    && STRATA.every((s, j) => !j || s.fresh < STRATA[j - 1].fresh), JSON.stringify(STRATA.map((s) => s.color.toString(16))));
  check('shares are never shown as 0% or 100% unless they are',
    shareText(0) === '0%' && shareText(1) === '100%' && shareText(1024 / (64 * MIB + 1024)) === 'under 0.1%' && shareText(64 * MIB / (64 * MIB + 1024)) === 'over 99.9%'
    && shareText(0.81) === '81%' && shareText(0.034) === '3.4%' && shareText(0.996) === '99.6%' && shareText(NaN) === '0%',
    [0, 1, 0.81, 0.034, 0.996].map(shareText).join(' '));
  check('…and as figures for the table: <0.1% and >99.9%', shareFigure(1024 / (64 * MIB + 1024)) === '<0.1%' && shareFigure(64 * MIB / (64 * MIB + 1024)) === '>99.9%' && shareFigure(0.81) === '81%');
}

/* ---------- edges ---------- */

section('Edges of a stratum');
{
  // One file exactly on each edge (not changed after it, so the older
  // stratum) and one a millisecond inside it (the newer one), plus an
  // undated file and one dated in the future.
  const spec = { e: {} };
  const want = new Array(BANDS).fill(0);
  [1, 7, 30, 365, 1095].forEach((d, j) => {
    spec.e[`on-${d}`] = [10 ** j, AT - d * DAY];
    want[j + 1] += 10 ** j;
    spec.e[`in-${d}`] = [2 * 10 ** j, AT - d * DAY + 1];
    want[j] += 2 * 10 ** j;
  });
  spec.e.undated = [7, 0];
  want[5] += 7;
  spec.e.future = [3, AT + HOUR];
  want[0] += 3;
  const m = build(spec);
  const A = buildAgeTable(m.root, AT);
  const st = strataOf(A, find(m, 'e'));
  check('a file on an edge is in the older stratum, a millisecond inside it the newer; undated is oldest, the future newest',
    JSON.stringify(st.bytes) === JSON.stringify(want) && st.tb === find(m, 'e').s && st.tf === 12 && st.by === 'bytes' && st.held, JSON.stringify([st.bytes, want]));
  check('a file, a sealed folder and no table have no strata', strataOf(A, find(m, 'e/undated')) === null && strataOf(null, m.root) === null
    && strataOf(A, { ...find(m, 'e'), e: 'EACCES' }) === null);
  const zeros = build({ z: { a: [0, AT - 2 * DAY], b: [0, AT - 400 * DAY], c: [0, AT - 500 * DAY] } });
  const Z = buildAgeTable(zeros.root, AT);
  const zs = strataOf(Z, find(zeros, 'z'));
  check('files of no size are weighed by count', zs.by === 'files' && Math.abs(zs.share[1] - 1 / 3) < 1e-12 && Math.abs(zs.share[4] - 2 / 3) < 1e-12, JSON.stringify(zs));
  check('…and the sentence and hover line speak of files', strataSentence(zs, find(zeros, 'z'), AT).startsWith('67% of these files have not changed in over a year')
    && /^Half its files unchanged since \d\d\/\d\d\/\d{4}$/.test(typicalLine(Z, find(zeros, 'z'))), `${strataSentence(zs, find(zeros, 'z'), AT)} | ${typicalLine(Z, find(zeros, 'z'))}`);
  const fut = build({ f: { a: [100, AT + DAY], b: [1, AT - 900 * DAY] } });
  const F = buildAgeTable(fut.root, AT);
  check('half its bytes dated after the table: "changed after" its moment, coloured fresh', typicalLine(F, find(fut, 'f')) === `Half its bytes changed after ${day(AT)}`
    && typicalAge(F, find(fut, 'f')).k === 0, typicalLine(F, find(fut, 'f')));
  check('a folder with no files has no typical age', typicalAge(A, build({ x: { y: {} } }).root) === null);
}

/* ---------- 400,000 files ---------- */

section('400,000 files');
let big;
{
  let seed = 7;
  const rnd = () => ((seed = (Math.imul(seed, 1103515245) + 12345) >>> 0) / 2 ** 32);
  const N = 400000;
  const DIRS = 30000;
  const model = new Model('big');
  const records = [[0, -1, 'big', AT, 0, []]];
  for (let d = 1; d < DIRS; d++) records.push([d, Math.floor(rnd() * d), `d${d}`, AT, 0, []]);
  for (let i = 0; i < N; i++) {
    const r = rnd();
    // Twenty years back, some undated, some in the future, some of no size.
    const m = r < 0.01 ? 0 : r < 0.015 ? AT + Math.floor(rnd() * DAY) : AT - Math.floor(rnd() ** 2.4 * 20 * 365 * DAY);
    records[Math.floor(rnd() * DIRS)][5].push(`f${i}.dat`, rnd() < 0.03 ? 0 : Math.floor(Math.exp(rnd() * 18)), m, 0);
  }
  model.ingest(records, [], model.root);
  const t0 = performance.now();
  const A = buildAgeTable(model.root, AT);
  const built = performance.now() - t0;
  const dirs = [];
  const stack = [model.root];
  while (stack.length) {
    const d = stack.pop();
    dirs.push(d);
    for (const c of d.c) if (c.d) stack.push(c);
  }
  let byteMiss = 0;
  let fileMiss = 0;
  let shareMiss = 0;
  let typicalMiss = 0;
  let medianMiss = 0;
  let wordMiss = 0;
  const firstMiss = [];
  const t1 = performance.now();
  for (const d of dirs) {
    const st = strataOf(A, d);
    let b = 0;
    let f = 0;
    for (let j = 0; j < BANDS; j++) {
      b += st.bytes[j];
      f += st.files[j];
    }
    if (b !== d.s) byteMiss++;
    if (f !== d.fc) fileMiss++;
    if ((byteMiss || fileMiss) && firstMiss.length < 3) firstMiss.push(`${d.n}: ${b}/${d.s} ${f}/${d.fc}`);
    if (d.fc && Math.abs(st.share.reduce((x, y) => x + y, 0) - 1) > 1e-9) shareMiss++;
    // The typical age is true: more than half unchanged since its date,
    // at most half since the next rung (unless it is the last).
    // The median kept with the table equals one found from its steps.
    const tb = A.totalBytes(d);
    const need = (tb > 0 ? tb : d.fc) * 0.5;
    let k = 0;
    while (k < STEPS - 1 && (tb > 0 ? A.changedBytes(d, k) : A.changedFiles(d, k)) < need) k++;
    if (A.medianStep(d) !== (d.fc ? k : -1)) medianMiss++;
    const ta = typicalAge(A, d);
    if (d.fc) {
      if (!ta || (!ta.after && !(A.kept(d, ta.k - 1) > 0.5)) || !(A.kept(d, ta.k) <= 0.5 || ta.k === STEPS - 1)) typicalMiss++;
    } else if (ta) typicalMiss++;
    if (d.fc && WORDS.test(strataSentence(st, d, AT) + (typicalLine(A, d) || ''))) wordMiss++;
  }
  const walked = performance.now() - t1;
  check(`for every one of ${dirs.length.toLocaleString('en-US')} folders the six byte sums equal dir.s (table built in ${built.toFixed(1)} ms)`, byteMiss === 0 && dirs.length === DIRS, `${byteMiss} folders; ${firstMiss.join(' | ')}`);
  check('…and the six file counts equal dir.fc', fileMiss === 0 && model.root.fc === N, `${fileMiss} folders`);
  check('…and the shares of every folder with files add up to 1', shareMiss === 0, `${shareMiss} folders`);
  check('…and the median step kept with the table is the one its steps give', medianMiss === 0, `${medianMiss} folders`);
  check('…and every typical age is true: over half unchanged since its date, at most half since the next rung', typicalMiss === 0, `${typicalMiss} folders`);
  check(`…and no sentence or hover line says "created", "arrived" or "added" (all folders read in ${walked.toFixed(0)} ms)`, wordMiss === 0, `${wordMiss} folders`);
  big = { model, A, dirs };
}

/* ---------- the fixture's strata pair ---------- */

section('The strata pair');
{
  // As tools/make-fixture.mjs makes them: the same newest change, two
  // hours back; strata-old holds a 64 MB file of 01/01/2019 as well.
  const now = AT;
  const newest = now - 2 * HOUR;
  const oldDate = new Date(2019, 0, 1, 12, 0, 0).getTime();
  const m = build({ edge: { 'strata-old': { 'archive-2019.bin': [64 * MIB, oldDate], 'touched.txt': [1024, newest] }, 'strata-live': { 'live.bin': [64 * MIB, newest] } } });
  const A = buildAgeTable(m.root, now);
  const old = find(m, 'edge/strata-old');
  const live = find(m, 'edge/strata-live');
  const before = (d) => mixHex(THEME.clay, ramp(THEME.ageRamp, freshness(d.mm, now)), 0.7);
  check('they have the same newest change, so the old colouring (by mm) gave them one colour', old.mm === live.mm && old.mm === newest && before(old) === before(live));
  const tones = massTones(A, now);
  const ko = A.medianStep(old);
  const kl = A.medianStep(live);
  const fo = freshOfDays(stepAgeDays(ko));
  const fl = freshOfDays(stepAgeDays(kl));
  check(`now they differ: strata-old at step ${ko}, the ramp's old end (${fo.toFixed(3)}); strata-live at step ${kl}, its fresh end (${fl.toFixed(3)})`,
    tones[ko] !== tones[kl] && fo < 0.1 && fl > 0.9 && tones[ko] === mixHex(THEME.clay, ramp(THEME.ageRamp, fo), 0.7) && tones[kl] === mixHex(THEME.clay, ramp(THEME.ageRamp, fl), 0.7),
    JSON.stringify({ ko, kl, fo, fl }));
  const so = strataSentence(strataOf(A, old), old, now);
  const sl = strataSentence(strataOf(A, live), live, now);
  check(`strata-old: "${so}"`, so === 'Over 99.9% of these bytes have not changed in over a year; under 0.1% changed in the last month. The newest change inside was 2 h ago.');
  check(`strata-live: "${sl}"`, sl === 'All of these bytes changed in the last month. The newest change inside was 2 h ago.');
  const lo = typicalLine(A, old);
  const ta = typicalAge(A, old);
  check(`strata-old's hover line: "${lo}", a date its 64 MB file has not changed since`, lo === `Half its bytes unchanged since ${day(ta.t)}` && ta.t >= oldDate && ta.t < now - 3 * 365 * DAY && A.kept(old, ta.k - 1) > 0.5);
  check(`strata-live's: "${typicalLine(A, live)}", not "unchanged since" the table's own day`, typicalLine(A, live) === 'Half its bytes changed in the last day' && typicalAge(A, live).k === 1);
  const rows = strataOf(A, old);
  check('strata-old\'s rows: 1 KB under a day, 64 MB over three years', JSON.stringify(rows.bytes) === JSON.stringify([1024, 0, 0, 0, 0, 64 * MIB]) && JSON.stringify(rows.files) === '[1,0,0,0,0,1]');
}

/* ---------- the closed-mass colours ---------- */

section('Closed-mass colours');
{
  const A = big.A;
  const tones = massTones(A, AT);
  const fresh = Array.from({ length: STEPS }, (_, k) => freshOfDays(stepAgeDays(k)));
  check('one colour per ladder step, fresh to old, each the ramp mixed 70% into clay as paint mixes a mass',
    tones.length === STEPS && fresh.every((f, k) => !k || f <= fresh[k - 1]) && fresh[0] === 1 && fresh.at(-1) === 0
    && tones.every((c, k) => c === mixHex(THEME.clay, ramp(THEME.ageRamp, fresh[k]), 0.7)), fresh.map((f) => f.toFixed(2)).join(' '));
  const later = massTones(A, AT + 30 * DAY);
  check('seen a month after the table was built, every step looks a month older', later.every((c, k) => c === mixHex(THEME.clay, ramp(THEME.ageRamp, freshOfDays(stepAgeDays(k) + 30)), 0.7)) && later[1] !== tones[1]);
  check('step k\'s age is the middle of the rung between steps k - 1 and k', stepAgeDays(0) === 0
    && LADDER_DAYS.every((d, k) => !k || (stepAgeDays(k) > LADDER_DAYS[k - 1] && stepAgeDays(k) < d)));
}

/* ---------- the cost in paint ---------- */

section('Paint at about 10,000 boxes');
{
  const { model, A, dirs } = big;
  // The overview with every folder down to five levels opened, and the
  // grain chosen so the layout holds about 10,000 boxes.
  const depthOf = (d) => {
    let k = 0;
    for (let a = d; a.p; a = a.p) k++;
    return k;
  };
  const force = new Set(dirs.filter((d) => depthOf(d) <= 5));
  let lo = 0.0003;
  let hi = 0.006;
  let L = null;
  for (let i = 0; i < 30; i++) {
    const g = Math.sqrt(lo * hi);
    L = buildLayout(model.root, { cam: { x: 0, y: 900, z: 1200 }, grain: g, now: AT, force });
    if (L.n > 10500) lo = g;
    else if (L.n < 9500) hi = g;
    else break;
  }
  const now = AT;
  // paint()'s closed-mass branch under the Age lens, before and after,
  // over a list of boxes; the rest of paint() is the same in both, so the
  // difference is what the change costs.
  const oldBranch = (nodes, isCap) => {
    const color = new Uint32Array(nodes.length);
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (!isCap(i) || node.e || !node.c.length) continue;
      color[i] = mixHex(THEME.clay, ramp(THEME.ageRamp, freshness(node.mm, now)), 0.7);
    }
    return color;
  };
  const newBranch = (nodes, isCap) => {
    const color = new Uint32Array(nodes.length);
    const ages = A;
    const tones = ages ? massTones(ages, now) : null;
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (!isCap(i) || node.e || !node.c.length) continue;
      const k = ages ? ages.medianStep(node) : -1;
      color[i] = k >= 0 ? tones[k] : mixHex(THEME.clay, ramp(THEME.ageRamp, freshness(node.mm, now)), 0.7);
    }
    return color;
  };
  /** Median times of the old and new branch, interleaved so both see the same machine. */
  const race = (nodes, isCap) => {
    const time = (fn) => {
      const t0 = performance.now();
      fn(nodes, isCap);
      return performance.now() - t0;
    };
    for (let i = 0; i < 200; i++) { oldBranch(nodes, isCap); newBranch(nodes, isCap); }
    const a = [];
    const b = [];
    for (let i = 0; i < 400; i++) {
      a.push(time(oldBranch));
      b.push(time(newBranch));
    }
    a.sort((x, y) => x - y);
    b.sort((x, y) => x - y);
    return { ma: a[a.length >> 1], mb: b[b.length >> 1] };
  };
  let caps = 0;
  for (let i = 0; i < L.n; i++) if (L.type[i] === BOX.CAP) caps++;
  const diff = (r) => (r.mb >= r.ma ? `${(r.mb - r.ma).toFixed(3)} ms more` : `${(r.ma - r.mb).toFixed(3)} ms less`);
  const r1 = race(L.node, (i) => L.type[i] === BOX.CAP);
  check(`a layout of ${L.n.toLocaleString('en-US')} boxes (${caps.toLocaleString('en-US')} closed masses): the new colouring costs ${diff(r1)} than the old (median ${r1.mb.toFixed(3)} against ${r1.ma.toFixed(3)} ms; at most 0.2 more)`,
    L.n >= 9500 && L.n <= 10500 && caps > 1000 && r1.mb - r1.ma <= 0.2, JSON.stringify({ n: L.n, caps, ...r1 }));
  // The worst case: 10,000 boxes that are all closed masses.
  const many = dirs.filter((d) => d.p && d.c.length).slice(0, 10000);
  const r2 = race(many, () => true);
  check(`10,000 boxes all closed masses: ${diff(r2)} (median ${r2.mb.toFixed(3)} against ${r2.ma.toFixed(3)} ms; at most 0.2 more)`,
    many.length === 10000 && r2.mb - r2.ma <= 0.2, JSON.stringify(r2));
}

/* ---------- no DOM ---------- */

section('No DOM');
{
  const src = fs.readFileSync(path.join(WEB, 'strata.js'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  const uses = ['document', 'window', 'localStorage', 'navigator', 'HTMLElement', 'requestAnimationFrame'].filter((w) => new RegExp(`\\b${w}\\b`).test(src));
  check('strata.js names no browser global: install(api) builds its elements with api.el', uses.length === 0, uses.join(', '));
  const imports = [...src.matchAll(/from '([^']+)'/g)].map((m) => m[1]);
  check('it imports only model.js, theme.js, timeline.js and layout.js', JSON.stringify(imports) === JSON.stringify(['./model.js', './theme.js', './timeline.js', './layout.js']), JSON.stringify(imports));
  check('it exports a name and install(api) for features.js', X.name === 'Strata' && typeof X.install === 'function');
}

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
