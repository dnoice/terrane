#!/usr/bin/env node
/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Working Sessions Test (Terrane Edition - v1.1)
 *     - File Name: relations-test.mjs
 *     - Relative Path: tools/relations-test.mjs
 *     - Artifact Type: test
 *     - Version: 1.1.0
 *     - Date: 11/13/2026
 *     - Update: Friday, November 13, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Changelog:
 *     - 1.1.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] — A
 *       section for Changed with it: sessionOf at both ends of the newest,
 *       middle and oldest sessions, 0 between sessions, before the oldest
 *       and after the newest, under a dot-folder, with no time, for a
 *       folder and for no list, and against each session's own files over
 *       3,000 random files; nearest() in time order, the earlier first on
 *       a tie, never the file itself, at either end, asked for too many or
 *       none, and for a file outside the session.
 *     - 1.0.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] —
 *       Initial release.
 *
 * ✒ Description:
 *     Runs the browser's working-session module (web/js/relations.js) in
 *     Node against model trees built with the browser's own model and
 *     layouts built with its own layout, and checks sessions, their facts,
 *     the session:N search predicate and the traverse route without a
 *     page or a service. It proves the module needs no DOM.
 *
 * ✒ Key Features:
 *     - Three bursts more than 30 minutes apart are three sessions, newest
 *       first; a pause of exactly 30 minutes does not split one
 *     - Sixty files within one second are written at once (bulk); a
 *       session worked by hand is not; a file changed alone is no session
 *     - Folders whose names start with a dot are left out, a dot-file in
 *       a plain folder is not, and neither is anything under a root
 *       whose own name starts with a dot
 *     - The packed typed-array sort against a plain sort with a compare
 *       callback, on random trees whose times force a coarse quantum; a
 *       junk date that makes the quantum coarser than the gap
 *     - Facts: places, runs, bytes and the deepest folder holding them
 *     - session:N through parseQuery and runSearch: exactly the session's
 *       files, a file under a dot-folder inside the window left out
 *     - Changed with it: sessionOf finds a file's session at the ends of
 *       every window and gives 0 between them and under dot-folders;
 *       nearest() keeps time order and takes the earlier on a tie
 *     - The route: every stop the box that shows its file or the mass,
 *       scree or plateau hiding it; no stop twice in a row; leg ends on
 *       box tops; at most 1,000 legs, and the total it was cut from
 *     - 400,000 files in under 120 ms, the best of three
 *
 * ✒ Usage Instructions:
 *     node tools/relations-test.mjs
 *     npm test runs it after the places store test.
 *
 * ✒ Other Important Information:
 *     - Dependencies: Node.js 22+; web/js/relations.js, web/js/model.js
 *       and web/js/layout.js
 *     - Compatible platforms: Windows, macOS, Linux
 *     - Exit code 0 means every check passed
 * ----------------------------------------------------------------------------
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.join(HERE, '..', 'web', 'js');
const { Model, parseQuery, runSearch, relPath, FLAG_HIDDEN } = await import(new URL('../web/js/model.js', import.meta.url).href);
const { buildLayout, BOX } = await import(new URL('../web/js/layout.js', import.meta.url).href);
const R = await import(new URL('../web/js/relations.js', import.meta.url).href);
const { sessions, runsOf, sessionFacts, sessionPredicate, route, underHidden, GAP_MS, MAX_LEGS, BULK_FILES } = R;

let passed = 0;
let failed = 0;
const check = (name, cond, detail = '') => {
  if (cond) passed++;
  else failed++;
  console.log(`${cond ? '  ok  ' : ' FAIL '} ${name}${cond || !detail ? '' : ' — ' + detail}`);
};
const section = (title) => console.log(`\n${title}`);
const MIN = 60000;
const T0 = Date.UTC(2026, 10, 13, 9, 0, 0);

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
      if (Array.isArray(v) && typeof v[0] === 'number') files.push(k, v[0], v[1] ?? T0, 0);
      else dirs.push([k, v]);
    }
    records.push([myId, pid, name, T0 - 30 * 86400000, 0, files]);
    for (const [k, v] of dirs) walk(v, myId, k, ++id);
  };
  walk(spec, -1, rootName, 0);
  model.ingest(records, [], model.root);
  return model;
}

const names = (list) => list.map((f) => f.n).join(',');
const setOf = (files) => new Set(files);
const sameSet = (a, b) => a.size === b.size && [...a].every((x) => b.has(x));

/** A plain reference: every file outside dot-folders, sorted with a callback, split at the gap. */
function reference(root, gapMs = GAP_MS) {
  const files = [];
  const stack = [root];
  while (stack.length) {
    for (const ch of stack.pop().c) {
      if (ch.d) { if (!(ch.f & FLAG_HIDDEN)) stack.push(ch); } else if (ch.m > 0) files.push(ch);
    }
  }
  files.sort((a, b) => a.m - b.m);
  const out = [];
  let cur = [];
  for (const f of files) {
    if (cur.length && f.m - cur.at(-1).m > gapMs) { out.push(cur); cur = []; }
    cur.push(f);
  }
  if (cur.length) out.push(cur);
  return out.filter((s) => s.length >= 2).reverse();
}

/* ---------- sessions ---------- */

section('Sessions');
{
  const spec = {
    a: { 'a1.md': [10, T0], 'a2.md': [20, T0 + 5 * MIN], 'a3.md': [30, T0 + 12 * MIN] },
    b: { 'b1.js': [40, T0 + 60 * MIN], 'b2.js': [50, T0 + 70 * MIN] },
    c: { deep: { 'c1.css': [60, T0 + 3 * 60 * MIN] }, 'c2.css': [70, T0 + 3 * 60 * MIN + 20 * MIN] },
    lone: { 'alone.txt': [5, T0 + 10 * 60 * MIN] },
  };
  const model = build(spec);
  const list = sessions(model.root);
  check('three bursts more than 30 minutes apart are three sessions', list.length === 3, `${list.length}: ${list.map((s) => names(s.files)).join(' | ')}`);
  check('newest first, each in time order', names(list[0].files) === 'c1.css,c2.css' && names(list[1].files) === 'b1.js,b2.js' && names(list[2].files) === 'a1.md,a2.md,a3.md',
    list.map((s) => names(s.files)).join(' | '));
  check('a session knows its window, count and bytes', list[2].start === T0 && list[2].end === T0 + 12 * MIN && list[2].count === 3 && list[2].bytes === 60,
    JSON.stringify({ start: list[2].start - T0, end: list[2].end - T0, count: list[2].count, bytes: list[2].bytes }));
  check('a file changed alone, hours from any other, is no session', !list.some((s) => s.files.some((f) => f.n === 'alone.txt')));
  check('the list says how many files it looked at and the gap it used', list.considered === 8 && list.skipped === 0 && list.gapMs === GAP_MS, JSON.stringify({ c: list.considered, s: list.skipped }));

  const edge = build({ x: { 'p.txt': [1, T0], 'q.txt': [1, T0 + 30 * MIN], 'r.txt': [1, T0 + 60 * MIN + 1] } });
  const e = sessions(edge.root);
  check('a pause of exactly 30 minutes stays inside a session; one millisecond more ends it',
    e.length === 1 && names(e[0].files) === 'p.txt,q.txt', e.map((s) => names(s.files)).join(' | '));
  const tighter = sessions(model.root, { gapMs: 6 * MIN });
  check('a tighter gap splits more finely: at 6 minutes only a1 and a2 are close enough', tighter.length === 1 && names(tighter[0].files) === 'a1.md,a2.md', tighter.map((s) => names(s.files)).join(' | '));
  check('an empty tree has none', sessions(build({}).root).length === 0);
}

section('Written at once');
{
  const bulk = {};
  for (let i = 0; i < 60; i++) bulk[`part-${i}.csv`] = [100, T0 + i * 15];
  const hand = {};
  for (let i = 0; i < 12; i++) hand[`s${i}.md`] = [10, T0 + 5 * 60 * MIN + i * 150000];
  const few = {};
  for (let i = 0; i < BULK_FILES - 1; i++) few[`f${i}.bin`] = [1, T0 + 9 * 60 * MIN + i * 10];
  const model = build({ bulk, hand, few });
  const list = sessions(model.root);
  const by = (dir) => list.find((s) => s.files[0].p.n === dir);
  check('sixty files within one second are written at once', by('bulk')?.count === 60 && by('bulk').bulk === true && by('bulk').end - by('bulk').start < 1000);
  check('twelve files over half an hour are worked by hand', by('hand')?.count === 12 && by('hand').bulk === false);
  check(`fewer than ${BULK_FILES} files are not, however fast`, by('few')?.count === BULK_FILES - 1 && by('few').bulk === false);
}

section('Dot-folders');
{
  const model = build({
    work: { 'a.js': [1, T0], '.env': [1, T0 + MIN], '.cache': { 'state.json': [1, T0 + 2 * MIN], inner: { 'x.bin': [1, T0 + 3 * MIN] } } },
    '.git': { 'index': [1, T0 + 4 * MIN] },
  });
  const list = sessions(model.root);
  check('files inside dot-folders, at any depth, are left out; a dot-file in a plain folder is not',
    list.length === 1 && names(list[0].files) === 'a.js,.env', list.map((s) => names(s.files)).join(' | '));
  check('the files left out are counted', list.skipped === 3 && list.considered === 2, JSON.stringify({ skipped: list.skipped, considered: list.considered }));
  const state = model.find('work/.cache/state.json');
  check('underHidden says so for a file at any depth, and not for a dot-file in a plain folder',
    underHidden(state) && underHidden(model.find('work/.cache/inner/x.bin')) && !underHidden(model.find('work/.env')) && !underHidden(model.find('work/a.js')));
  const dotRoot = build({ x: { 'a.txt': [1, T0], 'b.txt': [1, T0 + MIN] } }, '.config');
  check('a root whose own name starts with a dot is still walked', sessions(dotRoot.root).length === 1 && !underHidden(dotRoot.find('x/a.txt')));
  const none = build({ x: { 'a.txt': [1, 0], 'b.txt': [1, 0], 'c.txt': [1, T0] } });
  check('a file with no time is no part of any session', sessions(none.root).length === 0 && sessions(none.root).considered === 1);
}

section('The packed sort against a plain one');
{
  let seed = 11;
  const rnd = () => ((seed = (Math.imul(seed, 1103515245) + 12345) >>> 0) / 2 ** 32);
  let worst = '';
  for (const [files, span, label] of [[3000, 3 * 3600000, 'three hours'], [5000, 40 * 365.25 * 86400000, 'forty years'], [4000, 2 * 86400000, 'two days, many ties']]) {
    const spec = {};
    for (let d = 0; d < 40; d++) spec[`d${d}`] = d % 9 === 0 ? { '.hid': {} } : {};
    const dirs = Object.keys(spec);
    for (let i = 0; i < files; i++) {
      const d = spec[dirs[Math.floor(rnd() * dirs.length)]];
      const t = label.includes('ties') ? T0 + Math.floor(rnd() * 400) * 300000 : T0 - Math.floor(rnd() * span);
      if (rnd() < 0.1 && d['.hid']) d['.hid'][`h${i}`] = [i, t];
      else d[`f${i}`] = [i, t];
    }
    const model = build(spec);
    const got = sessions(model.root);
    const want = reference(model.root);
    const same = got.length === want.length && got.every((s, i) => s.files.length === want[i].length
      && s.files.every((f, j) => f.m === want[i][j].m) && sameSet(setOf(s.files), setOf(want[i]))
      && s.start === want[i][0].m && s.end === want[i].at(-1).m);
    if (!same && !worst) worst = `${label}: ${got.length} vs ${want.length}`;
    check(`${label}: ${got.length} sessions, the same files, times in order, windows exact`, same, worst);
  }
  // A junk date far beyond any calendar makes the quantum coarser than the
  // gap; the plain sort it falls back to still splits two hours apart.
  const JUNK = 1e22;
  const junk = build({ x: { 'a.txt': [1, T0], 'b.txt': [1, T0 + MIN], 'c.txt': [1, T0 + 120 * MIN], 'd.txt': [1, T0 + 121 * MIN], 'far.bin': [1, JUNK], 'farther.bin': [1, JUNK + 1000] } });
  const j = sessions(junk.root);
  check('dates hundreds of millennia apart: the exact order still splits two hours apart (3 sessions)',
    j.length === 3 && names(j[0].files) === 'far.bin,farther.bin' && names(j[1].files) === 'c.txt,d.txt' && names(j[2].files) === 'a.txt,b.txt',
    j.map((s) => names(s.files)).join(' | '));
}

section('Facts and runs');
{
  const model = build({
    proj: { src: { 'a.js': [100, T0], 'b.js': [100, T0 + MIN] }, docs: { 'r.md': [50, T0 + 2 * MIN] }, 'c.js': [10, T0 + 3 * MIN] },
  });
  const [s] = sessions(model.root);
  const f = sessionFacts(s);
  check('places are the folders holding its files; runs the stops in time order', f.places === 3 && f.runs === 3 && f.count === 4, JSON.stringify(f, (k, v) => (k === 'common' ? v?.n : v)));
  check('the deepest folder holding them all', f.common === model.find('proj') && f.bytes === 260 && f.span === 3 * MIN);
  check('facts are worked out once', sessionFacts(s) === f && Object.isFrozen(f));
  const runs = runsOf(s);
  check('runsOf: consecutive files in one folder', runs.map((r) => `${r.dir.n}:${r.from}-${r.to}`).join(' ') === 'src:0-2 docs:2-3 proj:3-4', runs.map((r) => `${r.dir.n}:${r.from}-${r.to}`).join(' '));
  const one = build({ x: { y: { 'a.txt': [1, T0], 'b.txt': [1, T0 + MIN] } } });
  const g = sessionFacts(sessions(one.root)[0]);
  check('one place: its folder is the one holding them all', g.places === 1 && g.common === one.find('x/y') && g.runs === 1);
}

section('session:N as a search');
{
  const model = build({
    a: { 'one.txt': [1, T0], 'two.txt': [2, T0 + 5 * MIN], '.cache': { 'state.json': [3, T0 + 6 * MIN] } },
    b: { 'three.txt': [4, T0 + 9 * MIN], 'old.txt': [5, T0 - 5 * 60 * MIN], 'older.txt': [6, T0 - 5 * 60 * MIN - MIN] },
  });
  const list = sessions(model.root);
  const ext = { prefix: { session: (v) => sessionPredicate(list, /^\d+$/.test(v) ? Number(v) : 0) } };
  const s1 = runSearch(model, parseQuery('session:1', ext));
  check('session:1 finds exactly the newest session\'s files', sameSet(s1.set, setOf(list[0].files)) && s1.list.length === 3, names(s1.list));
  check('a file under a dot-folder inside the window is left out', !s1.set.has(model.find('a/.cache/state.json')));
  const s2 = runSearch(model, parseQuery('session:2', ext));
  check('session:2 the one before it', sameSet(s2.set, setOf(list[1].files)) && s2.list.length === 2, names(s2.list));
  const narrowed = runSearch(model, parseQuery('session:1 three', ext));
  check('other tokens narrow it', narrowed.list.length === 1 && narrowed.list[0].n === 'three.txt');
  const none = ['session:3', 'session:0', 'session:x'].map((q) => runSearch(model, parseQuery(q, ext)).list.length);
  check('a session that does not exist, 0 or a word matches nothing', none.every((n) => n === 0) && sessionPredicate(list, 3) === null && sessionPredicate(list, 0) === null, JSON.stringify(none));
  check('no folder is a match', ![...s1.set].some((n) => n.d));
}

/* ---------- changed with it ---------- */

section('Changed with it: sessionOf and nearest');
{
  const model = build({
    a: { 'a1.md': [10, T0], 'a2.md': [20, T0 + 5 * MIN], 'a3.md': [30, T0 + 12 * MIN], '.cache': { 'state.json': [1, T0 + 6 * MIN] } },
    b: { 'b1.js': [40, T0 + 60 * MIN], 'b2.js': [50, T0 + 70 * MIN] },
    c: { deep: { 'c1.css': [60, T0 + 3 * 60 * MIN] }, 'c2.css': [70, T0 + 3 * 60 * MIN + 20 * MIN] },
    between: { 'gap.txt': [1, T0 + 125 * MIN] },
    early: { 'first.txt': [1, T0 - 5 * 60 * MIN] },
    late: { 'alone.txt': [5, T0 + 10 * 60 * MIN], 'untimed.txt': [5, 0] },
  });
  const list = sessions(model.root);
  const of = (rel) => R.sessionOf(list, model.find(rel));
  check('three sessions to look in, newest first', list.length === 3, `${list.length}`);
  check('the newest session at both its ends: its first and its last file are in session 1', of('c/deep/c1.css') === 1 && of('c/c2.css') === 1);
  check('the middle one, and the oldest at both its ends', of('b/b1.js') === 2 && of('b/b2.js') === 2 && of('a/a1.md') === 3 && of('a/a3.md') === 3 && of('a/a2.md') === 3);
  check('a file changed between two sessions, more than 30 minutes from either, is in none',
    of('between/gap.txt') === 0, `${of('between/gap.txt')}`);
  check('nor is one changed before the oldest session, or after the newest', of('early/first.txt') === 0 && of('late/alone.txt') === 0);
  check('a file under a dot-folder inside a session\'s window is in none, though its time is inside',
    of('a/.cache/state.json') === 0 && list[2].start <= model.find('a/.cache/state.json').m && model.find('a/.cache/state.json').m <= list[2].end);
  check('a file with no time, a folder, no file and no list give 0',
    of('late/untimed.txt') === 0 && of('a') === 0 && R.sessionOf(list, null) === 0 && R.sessionOf([], model.find('a/a1.md')) === 0 && R.sessionOf(null, model.find('a/a1.md')) === 0);

  // Against a plain search on random trees: every file, every answer.
  let seed = 23;
  const rnd = () => ((seed = (Math.imul(seed, 1103515245) + 12345) >>> 0) / 2 ** 32);
  const spec = {};
  for (let d = 0; d < 30; d++) spec[`d${d}`] = d % 7 === 0 ? { '.hid': {} } : {};
  const dirs = Object.keys(spec);
  for (let i = 0; i < 3000; i++) {
    const d = spec[dirs[Math.floor(rnd() * dirs.length)]];
    const tm = rnd() < 0.02 ? 0 : T0 - Math.floor(rnd() * 20 * 86400000);
    if (rnd() < 0.1 && d['.hid']) d['.hid'][`h${i}`] = [i, tm];
    else d[`f${i}`] = [i, tm];
  }
  const big = build(spec);
  const bl = sessions(big.root);
  const owner = new Map();
  bl.forEach((s, k) => s.files.forEach((f) => owner.set(f, k + 1)));
  let wrong = 0;
  let files = 0;
  const stack = [big.root];
  while (stack.length) {
    for (const ch of stack.pop().c) {
      if (ch.d) stack.push(ch);
      else {
        files++;
        if (R.sessionOf(bl, ch) !== (owner.get(ch) || 0)) wrong++;
      }
    }
  }
  check(`over ${files.toLocaleString('en-US')} random files in ${bl.length} sessions, sessionOf agrees with each session's own files`, wrong === 0 && bl.length > 10, `${wrong} wrong`);

  // nearest: a window grown on the nearer side, earlier first on a tie.
  const times = { 't00.md': 0, 't10.md': 10, 't20.md': 20, 't25.md': 25, 't40.md': 40, 't41.md': 41, 't99.md': 99 };
  const nm = build({ x: Object.fromEntries(Object.entries(times).map(([k, v]) => [k, [1, T0 + v * MIN]])) });
  const [s] = sessions(nm.root, { gapMs: 60 * MIN });
  const at = (n) => nm.find(`x/${n}`);
  const near = (n, k) => names(R.nearest(s, at(n), k));
  check('the three nearest to the file at 25 are 10, 20 and 40, in time order: 10 and 40 are equally near, and the earlier is taken first',
    near('t25.md', 3) === 't10.md,t20.md,t40.md', near('t25.md', 3));
  check('the file itself is never among them, and at an end they come from the one side',
    near('t00.md', 2) === 't10.md,t20.md' && near('t99.md', 2) === 't40.md,t41.md' && !near('t41.md', 6).includes('t41.md'), `${near('t00.md', 2)} | ${near('t99.md', 2)}`);
  check('asking for more than there are gives every other file; for none, nothing',
    near('t40.md', 50) === 't00.md,t10.md,t20.md,t25.md,t41.md,t99.md' && near('t40.md', 0) === '' && R.nearest(s, null, 3).length === 0);
  const outside = { n: 'outside', m: T0 + 32 * MIN, p: null };
  check('a file outside the session is placed by its time', names(R.nearest(s, outside, 2)) === 't25.md,t40.md' && names(R.nearest(s.files, outside, 1)) === 't25.md',
    names(R.nearest(s, outside, 2)));
}

/* ---------- the route ---------- */

section('The route');
{
  // Two folders of large files, worked alternately: every file is a stop.
  const spec = { left: {}, right: {}, far: { closed: { 'x1.bin': [5e6, T0 + 5 * 60 * MIN], 'x2.bin': [5e6, T0 + 5 * 60 * MIN + MIN] } } };
  for (let i = 0; i < 1200; i++) {
    spec[i % 2 ? 'right' : 'left'][`f${i}.dat`] = [1e6 + i * 997, T0 + i * 1000];
  }
  const model = build(spec);
  const [closed, s] = sessions(model.root);
  const near = buildLayout(model.root, { cam: { x: 0, y: 300, z: 0 }, grain: 0.0002 });
  const r = route(near, s);
  const top = (i) => [near.geo[i * 6], near.geo[i * 6 + 1] + near.geo[i * 6 + 4] / 2, near.geo[i * 6 + 2]];
  const drawn = s.files.filter((f) => near.index.has(f)).length;
  check(`close up, ${drawn} of ${s.count} files are boxes of their own`, drawn > 1000, `${drawn}`);
  check(`at most ${MAX_LEGS.toLocaleString('en-US')} legs: ${r.count} of ${r.total}, cut short and saying so`,
    r.count === MAX_LEGS && r.total === r.stops.length - 1 && r.total > MAX_LEGS && r.truncated && r.legs.length === MAX_LEGS * 6, JSON.stringify({ count: r.count, total: r.total }));
  let endsOk = true;
  for (let j = 0; j < r.count && endsOk; j++) {
    const a = top(r.stops[j]);
    const b = top(r.stops[j + 1]);
    for (let c = 0; c < 3; c++) if (r.legs[j * 6 + c] !== a[c] || r.legs[j * 6 + 3 + c] !== b[c]) endsOk = false;
  }
  check('each leg runs from the top of one stop\'s box to the top of the next', endsOk);
  let resolved = true;
  let twice = 0;
  for (let k = 0; k < r.stops.length; k++) {
    const f = s.files[r.at[k]];
    const i = r.stops[k];
    const nd = near.node[i];
    // The box shows the file, or holds it: its folder or an ancestor's mass, scree or plateau.
    if (!(nd === f || (near.type[i] !== BOX.FILE && (nd === f.p || relPath(f).startsWith(`${relPath(nd)}/`) || !relPath(nd))))) resolved = false;
    if (k && r.stops[k] === r.stops[k - 1]) twice++;
  }
  check('every stop is the box that shows its file, or the one hiding it', resolved);
  check('no box is a stop twice in a row', twice === 0);
  const all = route(near, s, { maxLegs: Infinity });
  check('without the cap every stop has its leg', all.count === all.total && !all.truncated && all.total === r.total);

  // From far away the folders are closed masses: the route runs between them.
  const farL = buildLayout(model.root, { cam: { x: 0, y: 20000, z: 0 }, grain: 0.0105 });
  const far = route(farL, s);
  const boxes = new Set(far.stops);
  check(`from far away the files resolve to the two closed masses hiding them, worked in turn (${far.stops.length} stops)`,
    boxes.size === 2 && [...boxes].every((i) => farL.type[i] === BOX.CAP && ['left', 'right'].includes(farL.node[i].n)) && far.stops.length === s.count,
    JSON.stringify({ stops: far.stops.length, boxes: [...boxes].map((i) => `${farL.node[i].n}:${farL.type[i]}`) }));
  const memoOk = [...far.stops].every((i, k) => {
    const f = s.files[far.at[k]];
    for (let a = f; a; a = a.p) if (farL.index.get(a) === i || (a._scree && farL.index.get(a._scree) === i)) return true;
    return false;
  });
  check('each of those stops is the file\'s own box or the box, mass or scree of a folder above it', memoOk);
  const cr = route(farL, closed);
  check('two files inside one closed mass are one stop, so no leg', cr.stops.length === 1 && cr.count === 0 && cr.legs.length === 0, JSON.stringify({ stops: cr.stops.length }));
  check('an array of files in time order works as well as a session', route(near, s.files.slice(0, 5)).count === 4);
  check('an empty session has no route', route(near, []).count === 0 && route(near, { files: [] }).total === 0);
}

/* ---------- 400,000 files ---------- */

section('Scale');
{
  let seed = 7;
  const rnd = () => ((seed = (Math.imul(seed, 1103515245) + 12345) >>> 0) / 2 ** 32);
  const N = 400000;
  const DIRS = 30000;
  const model = new Model('big');
  const records = [[0, -1, 'big', T0, 0, []]];
  for (let d = 1; d < DIRS; d++) records.push([d, Math.floor(rnd() * d), `d${d}`, T0, 0, []]);
  for (let i = 0; i < N; i++) records[Math.floor(rnd() * DIRS)][5].push(`f${i}.txt`, Math.floor(rnd() * 1e6), T0 - rnd() ** 2 * 3650 * 86400000, 0);
  model.ingest(records, [], model.root);
  const times = [];
  let list;
  for (let k = 0; k < 3; k++) {
    const t0 = performance.now();
    list = sessions(model.root);
    times.push(performance.now() - t0);
  }
  const best = Math.min(...times);
  check(`sessions() over ${N.toLocaleString('en-US')} files: ${best.toFixed(1)} ms, the best of three (under 120 ms)`, best < 120 && list.considered === N,
    times.map((t) => t.toFixed(1)).join(', '));
}

/* ---------- no DOM ---------- */

section('No DOM');
{
  const src = fs.readFileSync(path.join(WEB, 'relations.js'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  const uses = ['document', 'window', 'localStorage', 'navigator', 'HTMLElement', 'requestAnimationFrame', 'performance'].filter((w) => new RegExp(`\\b${w}\\b`).test(src));
  check('relations.js names no browser global', uses.length === 0, uses.join(', '));
  const imports = [...src.matchAll(/from '([^']+)'/g)].map((m) => m[1]);
  check('it imports only model.js and layout.js', JSON.stringify(imports) === JSON.stringify(['./model.js', './layout.js']), JSON.stringify(imports));
}

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
