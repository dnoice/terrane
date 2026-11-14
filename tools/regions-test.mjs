#!/usr/bin/env node
/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Regions Test (Terrane Edition - v1.0)
 *     - File Name: regions-test.mjs
 *     - Relative Path: tools/regions-test.mjs
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
 *       Initial release. After the review: a folder that keeps growing and
 *       dead slots packed away (4b), a search turned page by page (4c),
 *       the generator's moment as MM/DD/YYYY, and outside changes read
 *       into the kept tree with a page listening or not, the unwatched
 *       recheck, the stale survey and marks never worked out (11).
 *
 * ✒ Description:
 *     Checks the tree the service keeps in columns (web/js/columns.js)
 *     against the page's own model, the regions it answers, the changes
 *     it takes, the generator of synthetic trees, and the two region
 *     routes through a real service in snapshot and live mode. Every tree
 *     is generated or built in the OS temp folder and removed afterwards.
 *
 * ✒ Key Features:
 *     - Parity: at 20,000 and 120,000 generated entries, every folder's
 *       size, files, folders, height, newest change, kinds, direct
 *       children and error equal model.js's, and its age row equals
 *       timeline.js's table at every step, with its totals and median
 *     - Regions: the root's children in order; a folder of more than
 *       5,000 holds exactly the 5,000 largest (ties by scan order) plus
 *       the names asked for, with the rest as its tail; batches stop at
 *       their caps; a path's chain with skip, a file in a tail included;
 *       an unknown or removed id refused
 *     - Changes: a folder listed again (files added, removed and resized,
 *       a folder added and one gone), the new folder filled, another
 *       removed, each compared with a model given the same reconcile,
 *       ingest and recompute
 *     - records(): a tree built again from them is the same tree
 *     - The generator: the same rows for one seed and one moment, exact
 *       counts, its depth, everything a world must show, the meta, the
 *       snapshot read back record for record, and its refusals
 *     - The routes in snapshot mode: info.regions, the tree's load, ids,
 *       a chain, a stale generation, the caps, malformed ids, paths that
 *       climb or name the holding area, the token, the Host, POST refused,
 *       a fresh read answered from the tree
 *     - The routes in live mode: a build, a fresh read after a file is
 *       written and a folder removed, a new folder filled, read-only
 *       mode, a link that leads outside refused, the warm cache written
 *     - Growth: 600 additions to a 20,000-file folder, and two folders
 *       growing in turn, keep the slots bounded and dead slots nameless;
 *       a 100,000-file folder written again at the end is packed away,
 *       and every answer then equals a tree built afresh
 *     - Pages: in:big over a folder of 12,010 in three pages reaches every
 *       entry in each of four orders; from past 200,000 or below 0 refused
 *     - Ceilings: a 300,000-entry tree built, and a 20,000-file folder's
 *       region answered, each timed and printed
 *     - The whole-tree questions against the page's own, on one clock and
 *       one 120,000-entry tree: find against runSearch for 21 queries (the
 *       match set by path, total, bytes, matches beneath every folder, the
 *       first 5,000 by size and by date), marks, the survey, dupfiles,
 *       sessions with sessionOf and nearest, places against fuzzy.rank,
 *       and their ceilings; through the service in snapshot mode, every
 *       route, ESTALE, EQUERY, the caps, the token, the Host and POST
 *     - Live mode with the warm cache on port 5228: the service read again
 *       loads the cache at startup with warm.checking, its check held by a
 *       gate file; released, a file added on disk is in after the change
 *       event and { type: 'checked' }, and a rewrite in place with its
 *       folder's time put back is caught by the sweep, never as bulk
 *     - Live mode with the watcher (ports 5227 and 5228): a change while a
 *       page listens and changes with none listening are read into the
 *       tree and announced as kept; find agrees; a survey right after a
 *       change is answered stale with retry; unwatched, a page's arrival
 *       has the tree checked; a region asked with a search the tree
 *       changed since carries no marks
 *
 * ✒ Usage Instructions:
 *     node tools/regions-test.mjs
 *     npm test runs it after the warm test and before the demo test. It
 *     boots services on ports 5225, 5226, 5227 and 5228.
 *
 * ✒ Other Important Information:
 *     - Dependencies: Node.js 22.5+; web/js/columns.js, model.js,
 *       timeline.js, questions.js, relations.js, fuzzy.js; server/terrane.mjs, scan.mjs, snapshot.mjs;
 *       tools/make-synthetic.mjs
 *     - Compatible platforms: Windows, macOS, Linux (the link check makes
 *       a junction on Windows and a symbolic link elsewhere)
 *     - Safety: every service gets TERRANE_DATA in the test's temp folder;
 *       the generator's refusal of the real projects dataset is checked
 *       by path alone, without reading it
 *     - Exit code 0 means every check passed
 * ----------------------------------------------------------------------------
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SERVER = path.join(HERE, '..', 'server', 'terrane.mjs');
const C = await import(new URL('../web/js/columns.js', import.meta.url).href);
const { Model, relPath, isAncestor, parseQuery, runSearch } = await import(new URL('../web/js/model.js', import.meta.url).href);
const R = await import(new URL('../web/js/relations.js', import.meta.url).href);
const { rank } = await import(new URL('../web/js/fuzzy.js', import.meta.url).href);
const { buildAgeTable, STEPS } = await import(new URL('../web/js/timeline.js', import.meta.url).href);
const { scan } = await import(new URL('../server/scan.mjs', import.meta.url).href);
const { openSnapshots, readMeta, takeSnapshot, datasetHome, listSnapshots } = await import(new URL('../server/snapshot.mjs', import.meta.url).href);
const G = await import(new URL('./make-synthetic.mjs', import.meta.url).href);
const Q = await import(new URL('../web/js/questions.js', import.meta.url).href);
const { ColumnTree, treeFrom, answer, D_NAME, D_S, D_FC, D_DC, D_H, D_MM, D_CN, D_ERR, D_KS, D_AB, D_AF, D_MD, D_LEN } = C;

let passed = 0;
let failed = 0;
const check = (name, cond, detail = '') => {
  if (cond) passed++;
  else failed++;
  console.log(`${cond ? '  ok  ' : ' FAIL '} ${name}${cond || !detail ? '' : ` — ${String(detail).slice(0, 500)}`}`);
};
const section = (title) => console.log(`\n${title}`);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
/** Polls until fn() is truthy, or the time runs out; resolves to its last value. */
async function until(fn, ms = 6000) {
  const end = Date.now() + ms;
  for (;;) {
    const v = await fn();
    if (v || Date.now() > end) return v;
    await wait(40);
  }
}
const NOW = 1794744000000;
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'terrane-regions-'));

/* ---------- helpers ---------- */

const allRecords = (gen) => {
  const out = [];
  for (const b of gen) out.push(b);
  return out;
};

function modelFrom(batches, name) {
  const model = new Model(name);
  const idMap = [];
  for (const b of batches) model.ingest(b, idMap, model.root);
  return model;
}

/** The tree's children of id, by name, in its order: files, then folders. */
function childNames(tree, id) {
  const out = [];
  for (let j = tree.file0[id]; j < tree.file0[id] + tree.fileN[id]; j++) out.push(tree.fname[j]);
  for (let i = 0; i < tree.kidN[id]; i++) out.push(tree.name[tree.kids[tree.kid0[id] + i]]);
  return out;
}

/**
 * Walks the model and the tree together and compares every folder's
 * figures, age row and child order. Returns { folders, bad }.
 */
function compareAll(model, tree, anchor, { mm = true } = {}) {
  const ages = buildAgeTable(model.root, anchor);
  const bad = [];
  let folders = 0;
  const stack = [[model.root, 0]];
  while (stack.length) {
    const [node, id] = stack.pop();
    folders++;
    const D = tree.encodeD(id);
    const f = [['s', node.s, D[D_S]], ['fc', node.fc, D[D_FC]], ['dc', node.dc, D[D_DC]], ['h', node.h, D[D_H]], ['cn', node.c.length, D[D_CN]], ['e', node.e || 0, D[D_ERR]]];
    if (mm) f.push(['mm', node.mm, D[D_MM]]);
    for (let k = 0; k < 9; k++) f.push([`ks${k}`, node.ks[k], D[D_KS + k]]);
    for (let k = 0; k < STEPS; k++) f.push([`bytes@${k}`, ages.changedBytes(node, k), D[D_AB + k]], [`files@${k}`, ages.changedFiles(node, k), D[D_AF + k]]);
    f.push(['totalBytes', ages.totalBytes(node), D[D_AB + STEPS]], ['totalFiles', ages.totalFiles(node), D[D_AF + STEPS]], ['medianStep', ages.medianStep(node), D[D_MD]]);
    const miss = f.find(([, a, b]) => a !== b);
    if (miss) bad.push(`${relPath(node) || '(root)'} ${miss[0]}: model ${miss[1]}, tree ${miss[2]}`);
    if (!same(node.c.map((c) => c.n), childNames(tree, id))) bad.push(`${relPath(node) || '(root)'}: children in another order`);
    for (const ch of node.c) {
      if (!ch.d) continue;
      const cid = tree.kidByName(id, ch.n);
      if (cid < 0) bad.push(`${relPath(ch)} is missing from the tree`);
      else stack.push([ch, cid]);
    }
  }
  return { folders, bad };
}

const digest = (batches) => {
  const h = crypto.createHash('sha256');
  for (const b of batches) for (const r of b) h.update(JSON.stringify(r));
  return h.digest('hex');
};

/* ---------- 1. parity with the page's model ---------- */

section('1. Parity with the page\'s model');
const trees = {};
for (const entries of [20000, 120000]) {
  const batches = allRecords(G.generate({ entries, seed: 11, now: NOW }));
  const model = modelFrom(batches, 'synthetic');
  const tree = treeFrom(batches, { name: 'synthetic', anchor: NOW });
  const { folders, bad } = compareAll(model, tree, NOW);
  check(`${entries.toLocaleString('en-US')} entries: every one of ${folders.toLocaleString('en-US')} folders has the model's figures, age row and child order`, bad.length === 0, bad.slice(0, 3).join(' | '));
  check(`${entries.toLocaleString('en-US')} entries: the counts agree (${tree.folders} folders, ${tree.files} files)`, tree.entries === entries && tree.folders === model.root.dc + 1 && tree.files === model.root.fc && tree.bytes === model.root.s);
  trees[entries] = { batches, model, tree };
}

/* ---------- 2. regions ---------- */

section('2. Regions');
{
  const { model, tree, batches } = trees[120000];
  const root = tree.region(0);
  const names = [];
  for (let i = 0; i < root.f.length; i += 4) names.push(root.f[i]);
  for (const d of root.d) names.push(d[D_NAME]);
  check('the root region holds the model root\'s children, in order', same(names, model.root.c.map((c) => c.n)) && root.tail === null && root.n === model.root.c.length);
  check('a record D has D_LEN values and the root region\'s self is the root', root.self.length === D_LEN && same(root.self, tree.encodeD(0)));
  const fileSizesOk = root.f.every((x, i) => (i % 4 !== 1) || x === model.root.c[i >> 2].s);
  check('files are packed name, size, mtime, flags', fileSizesOk);

  // The biggest folder by its children.
  let big = model.root;
  const stack = [model.root];
  while (stack.length) {
    const n = stack.pop();
    if (n.c.length > big.c.length) big = n;
    for (const c of n.c) if (c.d) stack.push(c);
  }
  const bigId = tree.idOf(relPath(big));
  check(`a folder of more than 5,000 children exists (${big.c.length.toLocaleString('en-US')})`, big.c.length > C.REGION_MAX && bigId > 0);
  const order = big.c.map((c, i) => ({ c, i })).sort((a, b) => b.c.s - a.c.s || a.i - b.i);
  const top = new Set(order.slice(0, C.REGION_MAX).map((x) => x.c.n));
  const outside = order.filter((x) => !x.c.d).at(-1).c;
  const r = tree.region(bigId);
  const heldNames = [];
  for (let i = 0; i < r.f.length; i += 4) heldNames.push(r.f[i]);
  for (const d of r.d) heldNames.push(d[D_NAME]);
  const restBytes = order.slice(C.REGION_MAX).reduce((a, x) => a + x.c.s, 0);
  check('it holds exactly the 5,000 largest, ties by scan order', heldNames.length === C.REGION_MAX && heldNames.every((n) => top.has(n)));
  check('in scan order, never sorted again', same(heldNames, big.c.filter((c) => top.has(c.n)).map((c) => c.n)));
  check('its tail is the rest\'s count and bytes', same(r.tail, [big.c.length - C.REGION_MAX, restBytes]) && r.n === big.c.length, JSON.stringify(r.tail));
  const rw = tree.region(bigId, { with: [outside.n] });
  const withNames = [];
  for (let i = 0; i < rw.f.length; i += 4) withNames.push(rw.f[i]);
  check('a name asked for joins the held set and leaves the tail', withNames.includes(outside.n) && rw.tail[0] === r.tail[0] - 1 && rw.tail[1] === r.tail[1] - outside.s);
  check('the held set is cached, and the answer is the same again', same(tree.region(bigId), r));

  // regionsFor and its caps.
  const many = [];
  for (let id = 0; id < tree.F && many.length < 64; id++) if (tree.has(id)) many.push(id);
  const capped = tree.regionsFor(many, { maxEntries: 300 });
  const held = capped.regions.reduce((a, x) => a + 1 + x.d.length + x.f.length / 4, 0);
  check(`regionsFor stops at its entry cap and lists the rest in more (${capped.regions.length} sent, ${capped.more.length} more)`,
    capped.more.length > 0 && capped.regions.length + capped.more.length === many.length && (held <= 300 || capped.regions.length === 1)
    && same(capped.regions.map((x) => x.id).concat(capped.more), many));
  const byBytes = tree.regionsFor(many, { maxBytes: 20000 });
  check('and at its byte cap', byBytes.more.length > 0 && byBytes.regions.length >= 1);
  const wmap = new Map([[bigId, [outside.n]]]);
  check('with names reach their folder in a batch', tree.regionsFor([0, bigId], { with: wmap }).regions[1].f.includes(outside.n));

  // A chain to a file in the tail.
  const fileRel = relPath(outside);
  const chainLen = relPath(big).split('/').length + 1;
  const pr = tree.pathRegions(fileRel, 1);
  check('the chain to a file in a tail leaves out the folders skipped, and its last region holds the file',
    pr.regions.length === chainLen - 1 && pr.regions.at(-1).f.includes(outside.n) && pr.target.name === outside.n && pr.target.dir === false && pr.target.id === bigId);
  const each = pr.regions.slice(0, -1).every((reg, i) => reg.d.some((d) => d[D_NAME] === pr.regions[i + 1].self[D_NAME]));
  check('each region holds the next link', each);
  check('the whole chain from the root', tree.pathRegions(fileRel, 0).regions.length === chainLen && tree.pathRegions(relPath(big)).target.dir === true);
  let threw = null;
  try {
    tree.pathRegions(`${relPath(big)}/no-such-thing/x`);
  } catch (err) {
    threw = err;
  }
  check('a path not in the tree is ENOENT 404 naming the deepest folder found', threw?.code === 'ENOENT' && threw.status === 404 && threw.deepest === relPath(big));
  const bad = await answer(tree, 'region', { v: '1', ids: String(tree.F + 5) }, { v: 1 }).catch((e) => e);
  check('an unknown id is EBADREQ', bad.code === 'EBADREQ' && bad.status === 400);
  void batches;
}

/* ---------- 3. changes ---------- */

section('3. Changes, against the model');
{
  const batches = allRecords(G.generate({ entries: 20000, seed: 5, now: NOW }));
  const model = modelFrom(batches, 'synthetic');
  const tree = treeFrom(batches, { name: 'synthetic', anchor: NOW });
  // A folder two levels down or more, with files and two child folders.
  let X = null;
  const stack = [model.root];
  while (stack.length && !X) {
    const n = stack.pop();
    const files = n.c.filter((c) => !c.d);
    const dirs = n.c.filter((c) => c.d);
    if (n.p?.p && files.length >= 3 && dirs.length >= 2) X = n;
    for (const c of n.c) if (c.d) stack.push(c);
  }
  const xid = tree.idOf(relPath(X));
  const files = X.c.filter((c) => !c.d);
  const dirs = X.c.filter((c) => c.d);
  const packed = [];
  files.slice(1).forEach((f, i) => packed.push(f.n, i === 0 ? f.s + 12345 : f.s, i === 0 ? NOW - 3600e3 : f.m, f.f));
  packed.push('arrived.txt', 2048, NOW - 60e3, 0);
  const depth1 = [[0, -1, X.n, NOW - 30e3, 0, packed]];
  dirs.slice(1).forEach((d, i) => depth1.push([i + 1, 0, d.n, 0, 'STUB', []]));
  depth1.push([99, 0, 'new-folder', 0, 'STUB', []]);
  const gone = dirs[0];
  const goneEntries = 1 + gone.dc + gone.fc;
  const mres = model.reconcile(X, depth1);
  const tres = tree.replace(xid, depth1);
  check('replace reports the new folder as a stub, with its path', tres.added.length === 1 && tres.added[0].rel === `${relPath(X)}/new-folder`);
  check(`and counts what left (${tres.removed}) and what changed (${tres.changed})`, tres.removed === goneEntries + 1 && tres.changed === 1 && tres.addedFiles === 1);
  let cmp = compareAll(model, tree, NOW);
  check('after replace: every folder as the model leaves it after reconcile', cmp.bad.length === 0, cmp.bad.slice(0, 3).join(' | '));
  const deep = [
    [0, -1, 'new-folder', NOW - 20e3, 0, ['a.psd', 9e6, NOW - 50e3, 0, 'b.mov', 3e8, NOW - 40e3, 0]],
    [1, 0, 'sub', NOW - 10e3, 0, ['c.txt', 10, NOW - 9e9, 0]],
    [2, 1, 'deeper', 5, 0, []],
    [3, 0, 'locked', 0, 'EACCES', []],
  ];
  model.ingest(deep, [], mres.added[0]);
  tree.graft(tres.added[0].id, deep);
  cmp = compareAll(model, tree, NOW);
  check('after graft: the new subtree and every ancestor as the model ingests them', cmp.bad.length === 0, cmp.bad.slice(0, 3).join(' | '));
  // Another folder removed outright.
  // A folder with something in it, apart from X's chain and subtree.
  let Y = null;
  const all = [model.root];
  while (all.length && !Y) {
    const n = all.pop();
    if (n.p && n.dc >= 1 && n.fc >= 1 && !isAncestor(n, X) && !isAncestor(X, n)) Y = n;
    for (const c of n.c) if (c.d) all.push(c);
  }
  const yid = tree.idOf(relPath(Y));
  Y.p.c = Y.p.c.filter((x) => x !== Y);
  model.recompute(Y.p);
  const rr = tree.remove(yid);
  cmp = compareAll(model, tree, NOW);
  check(`after remove (${rr.removed} entries): every folder as the model recomputes it`, cmp.bad.length === 0 && rr.removed === 1 + Y.dc + Y.fc, cmp.bad.slice(0, 3).join(' | '));
  let err = null;
  try {
    tree.region(yid);
  } catch (e) {
    err = e;
  }
  check('a removed id is ENOENT 404, never served from the slots it left', err?.code === 'ENOENT' && err.status === 404 && tree.removed(yid));
  err = null;
  try {
    tree.graft(xid, deep);
  } catch (e) {
    err = e;
  }
  check('graft refuses a folder that was read already', err?.code === 'EBADREQ');
  check('the region of a changed folder is not served from a stale cache', tree.region(xid).f.includes('arrived.txt'));

  section('4. records() round trip');
  const pristine = trees[20000].tree;
  const again = treeFrom(pristine.records(), { name: 'synthetic', anchor: NOW });
  const enc = (t) => {
    const out = [];
    const st = [0];
    while (st.length) {
      const id = st.shift();
      const D = t.encodeD(id);
      D[0] = 0;
      out.push(JSON.stringify(D), childNames(t, id).join('|'));
      for (let i = 0; i < t.kidN[id]; i++) st.push(t.kids[t.kid0[id] + i]);
    }
    return out;
  };
  check('a tree built again from records() is the same tree: figures, names and order', same(enc(again), enc(pristine)));
  check('records() comes in batches of at most 200, parents first', [...pristine.records()].every((b) => b.length <= 200));
  const changed = treeFrom(tree.records(), { name: 'synthetic', anchor: NOW });
  const m2 = modelFrom([...tree.records()], 'synthetic');
  const cmp2 = compareAll(m2, changed, NOW);
  check('and so is a changed tree, as a fresh survey would read it', cmp2.bad.length === 0 && changed.entries === tree.entries, cmp2.bad.slice(0, 2).join(' | '));
}

section('4b. A folder that keeps growing, and dead slots packed away');
{
  const listOf = (prefix, n, size = (i) => 1000 + i) => {
    const out = [];
    for (let i = 0; i < n; i++) out.push(`${prefix}-${String(i).padStart(6, '0')}.dat`, size(i), NOW - i * 1000, 0);
    return out;
  };
  // The review's probe: one 20,000-file folder taking 600 one-file additions.
  {
    const files = listOf('g', 20000);
    const g = treeFrom([[[0, -1, 'root', NOW, 0, []], [1, 0, 'grow', NOW, 0, files]]], { name: 'root', anchor: NOW });
    for (let k = 0; k < 600; k++) {
      files.push(`new-${k}.dat`, 500, NOW, 0);
      g.replace(1, [[0, -1, 'grow', NOW, 0, files]]);
    }
    check(`600 one-file additions to a 20,000-file folder keep its slots where they are (${g.N.toLocaleString('en-US')} slots for ${g.files.toLocaleString('en-US')} files)`, g.files === 20600 && g.N <= 26000, `${g.N} slots`);
  }
  // Two folders growing in turn, each in the other's way.
  {
    const a = listOf('a', 20000);
    const b = listOf('b', 10);
    const g = treeFrom([[[0, -1, 'root', NOW, 0, []], [1, 0, 'a', NOW, 0, a], [2, 0, 'b', NOW, 0, b], [3, 0, 'c', NOW, 0, ['c.txt', 1, NOW, 0]]]], { name: 'root', anchor: NOW });
    for (let k = 0; k < 600; k++) {
      a.push(`more-a-${k}.dat`, 600, NOW, 0);
      g.replace(1, [[0, -1, 'a', NOW, 0, a]]);
      b.push(`more-b-${k}.dat`, 700, NOW, 0);
      g.replace(2, [[0, -1, 'b', NOW, 0, b]]);
    }
    let names = 0;
    for (let j = 0; j < g.N; j++) if (g.fname[j] !== undefined) names++;
    check(`two folders growing in turn keep the slots bounded (${g.N.toLocaleString('en-US')} slots for ${g.files.toLocaleString('en-US')} files)`, g.files === 21211 && g.N <= 3 * g.files, `${g.N} slots`);
    check('and a dead slot holds no name: only live files keep their strings', names === g.files, `${names} names`);
  }
  // A large folder written again at the end: more dead slots than live ones, so they are packed away.
  {
    const big = listOf('p', 100000);
    const recs = [[0, -1, 'root', NOW, 0, []], [1, 0, 'big', NOW, 0, big], [2, 0, 'after', NOW, 0, ['z.txt', 3, NOW, 0]], [3, 1, 'inner', NOW, 0, ['i.txt', 4, NOW, 0]]];
    const g = treeFrom([recs], { name: 'root', anchor: NOW });
    const q0 = (await answer(g, 'find', { v: '1', q: 'p-00' }, { v: 1 })).json;
    big.push('p-extra.dat', 5e9, NOW, 0);
    g.replace(1, [[0, -1, 'big', NOW, 0, big], [1, 0, 'inner', NOW, 'STUB', []]]);
    check(`a folder of 100,000 written again at the end leaves more dead slots than live ones, and they are packed away (${g.compactions} packing, ${g.N.toLocaleString('en-US')} slots)`, g.compactions >= 1 && g.N === g.files, `${g.N} slots for ${g.files}`);
    const again = treeFrom([...g.records()], { name: 'root', anchor: NOW });
    const ask = async (t, route, params) => JSON.stringify((await answer(t, route, { v: '1', ...params }, { v: 1 })).json, (k, v) => (k === 'ms' || k === 'qid' ? undefined : v));
    let same2 = true;
    for (const [route, params] of [['region', { ids: '0,1,2,3' }], ['find', { q: 'p-00' }], ['find', { q: 'p-0001', sort: 'date', dir: '1' }], ['survey', {}], ['places', { q: 'p-0004' }]]) {
      if (await ask(g, route, params) !== await ask(again, route, params)) same2 = false;
    }
    check('after packing, regions, searches, the survey and places answer as a tree built afresh from the same records', same2);
    check('the search kept from before the packing is worked out again, with the new file', q0.total === 10000 + 0 && (await answer(g, 'find', { v: '1', q: 'p-' }, { v: 1 })).json.total === 100001);
  }
}

section('4c. A search turned page by page (from)');
{
  // The review's folder: 12,010 files, its region the 5,000 largest.
  const files = [];
  for (let i = 0; i < 12010; i++) files.push(`t-${String(i).padStart(5, '0')}.dat`, 1e6 - i, NOW - i * 1000, 0);
  const tp = treeFrom([[[0, -1, 'root', NOW, 0, []], [1, 0, 'big', NOW, 0, files]]], { name: 'root', anchor: NOW });
  const region = new Set();
  const R0 = tp.region(1);
  for (let i = 0; i < R0.f.length; i += 4) region.add(R0.f[i]);
  for (const [sort, dir] of [['size', '-1'], ['size', '1'], ['date', '-1'], ['date', '1']]) {
    const seen = [];
    let first = null;
    for (const from of [0, 5000, 10000]) {
      const a = (await answer(tp, 'find', { v: '1', q: 'in:big', sort, dir, from: String(from) }, { v: 1 })).json;
      first ??= a.qid;
      seen.push(...a.hits.map((h) => h[0]));
    }
    const tailSeen = seen.filter((r) => !region.has(r.slice(4))).length;
    check(`in:big ${sort} ${dir === '1' ? 'ascending' : 'descending'}, three pages: every one of 12,010 once, the 7,010 not in its region among them (${tailSeen})`,
      seen.length === 12010 && new Set(seen).size === 12010 && tailSeen === 7010);
  }
  const p2 = (await answer(tp, 'find', { v: '1', q: 'in:big', from: '5000' }, { v: 1 })).json;
  const all = (await answer(tp, 'find', { v: '1', q: 'in:big', limit: '0' }, { v: 1 })).json;
  check('a page says where it starts, and continues the order of the one before', p2.from === 5000 && p2.hits.length === 5000 && p2.hits[0][2] === 1e6 - 5000 && all.total === 12010);
  const past = (await answer(tp, 'find', { v: '1', q: 'in:big', from: '20000' }, { v: 1 })).json;
  check('a page past the last match is empty, with the total', past.hits.length === 0 && past.total === 12010);
  const big = await answer(tp, 'find', { v: '1', q: 'x', from: '200001' }, { v: 1 }).catch((e) => e);
  const neg = await answer(tp, 'find', { v: '1', q: 'x', from: '-1' }, { v: 1 }).catch((e) => e);
  check('from past 200,000 is 413, and below 0 is 400 saying so', big.status === 413 && neg.status === 400 && /at least 0/.test(neg.message), `${big.message} | ${neg.message}`);
}

/* ---------- 5. the generator ---------- */

section('5. The generator');
{
  const a = digest(G.generate({ entries: 30000, seed: 11, now: NOW }));
  const b = digest(G.generate({ entries: 30000, seed: 11, now: NOW }));
  const c = digest(G.generate({ entries: 30000, seed: 12, now: NOW }));
  check('the same seed and moment give the same rows (SHA-256 over every row)', a === b);
  check('another seed gives other rows', a !== c);
  const p = G.plan({ entries: 100000, seed: 11, now: NOW });
  let folders = 0;
  let files = 0;
  let links = 0;
  let specials = 0;
  let hidden = 0;
  let empty = 0;
  let largest = 0;
  let session = false;
  let future = 0;
  const errs = new Set();
  const sizes = new Map();
  let sameSize = 0;
  for (const batch of G.records(p)) {
    for (const r of batch) {
      folders++;
      const n = r[5].length / 4;
      files += n;
      if (r[4]) {
        errs.add(r[4]);
        if (n || p.kids[r[0]]) errs.add('with children');
      }
      if (!n && !p.kids[r[0]] && !r[4]) empty++;
      if (n > largest) largest = n;
      const times = [];
      for (let i = 0; i < r[5].length; i += 4) {
        const fl = r[5][i + 3];
        if (fl & 1) links++;
        if (fl & 4) specials++;
        if (r[5][i].startsWith('.')) hidden++;
        if (r[5][i + 2] > NOW) future++;
        times.push(r[5][i + 2]);
        const s = r[5][i + 1];
        if (s >= 4096) {
          if (sizes.has(s)) sameSize++;
          else sizes.set(s, 1);
        }
      }
      if (!session && times.length >= 20) {
        times.sort((x, y) => x - y);
        for (let i = 0; i + 19 < times.length && !session; i++) if (times[i + 19] - times[i] <= 30 * 60e3) session = true;
      }
    }
  }
  check(`exact counts: ${folders.toLocaleString('en-US')} folders and ${files.toLocaleString('en-US')} files make 100,000`, folders + files === 100000 && folders === p.folders);
  check(`depth at most 12 and at least 10 at 100,000 entries (${p.deepest})`, p.deepest <= 12 && p.deepest >= 10);
  check('folders that could not be read, EACCES and EPERM, with nothing in them', errs.has('EACCES') && errs.has('EPERM') && !errs.has('with children'), [...errs].join(', '));
  check(`links (${links}), hidden names (${hidden}), special files (${specials}) and empty folders (${empty})`, links > 0 && hidden > 0 && specials > 0 && empty > 0);
  check(`a folder of more than 5,000 files (${largest.toLocaleString('en-US')})`, largest > 5000);
  check(`same-size files (${sameSize.toLocaleString('en-US')} share a size of 4 KB or more)`, sameSize > 0);
  check('a working session of 20 files within 30 minutes', session);
  check('no date lies after the moment it was made for', future === 0);

  const dir = path.join(work, 'synthetic-30k');
  const res = await G.writeSynthetic({ entries: 30000, seed: 11, now: NOW, out: dir });
  const meta = readMeta(listSnapshots(dir)[0]);
  check('the snapshot\'s meta says it is synthetic, with its seed, entries, moment and generator',
    meta.synthetic?.seed === 11 && meta.synthetic.entries === 30000 && meta.synthetic.now === NOW && meta.synthetic.generator === G.GENERATOR_VERSION
    && meta.folders + meta.files === 30000 && meta.takenAt === NOW && meta.root === path.join(os.tmpdir(), 'terrane-synthetic', '30k'));
  check('and its root is never created', !fs.existsSync(meta.root));
  const replay = [];
  for await (const batch of openSnapshots(dir).scan('')) replay.push(batch);
  check('the snapshot read back gives the generator\'s records, record for record', digest(replay) === a, `${res.folders} folders`);
  trees.snapDir = dir;
  trees.snapMeta = meta;

  // Refusals: the real projects dataset by path alone, never read.
  check('it refuses the projects dataset and anything inside it',
    /real projects/.test(G.refusal(datasetHome('projects'), 30000) || '') && /real projects/.test(G.refusal(path.join(datasetHome('projects'), 'x'), 30000) || ''));
  const realDir = path.join(work, 'real-snapshot');
  const realRoot = path.join(work, 'real-root');
  fs.mkdirSync(path.join(realRoot, 'a'), { recursive: true });
  fs.writeFileSync(path.join(realRoot, 'a', 'x.txt'), 'x');
  await takeSnapshot(realRoot, realDir);
  check('it refuses a folder holding a snapshot of a real directory', /real directory/.test(G.refusal(realDir, 30000) || ''));
  check('and sizes outside 1,000 to 10,000,000 entries', !!G.refusal(dir, 999) && !!G.refusal(dir, 10_000_001) && G.refusal(dir, 30000) === null);
  const cli = await new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(HERE, 'make-synthetic.mjs'), '--entries', '30k', '--out', realDir], { stdio: ['ignore', 'pipe', 'pipe'] });
    let text = '';
    child.stdout.on('data', (x) => { text += x; });
    child.stderr.on('data', (x) => { text += x; });
    child.on('exit', (code) => resolve({ code, text }));
  });
  check('the command line refuses it with exit code 2 and a sentence', cli.code === 2 && /real directory/.test(cli.text), cli.text);
  // The summary a person reads gives the moment as MM/DD/YYYY, never ISO.
  const said = await new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(HERE, 'make-synthetic.mjs'), '--entries', '1000', '--seed', '3', '--now', String(NOW), '--out', path.join(work, 'synthetic-cli')], { stdio: ['ignore', 'pipe', 'pipe'] });
    let text = '';
    child.stdout.on('data', (x) => { text += x; });
    child.stderr.on('data', (x) => { text += x; });
    child.on('exit', (code) => resolve({ code, text }));
  });
  const nowLine = said.text.split('\n').find((l) => /Seed, now/.test(l)) || '';
  check(`the summary prints its moment as MM/DD/YYYY HH:MM, never ISO (${nowLine.trim()})`, said.code === 0 && nowLine.includes(`3, ${G.dateTime(NOW)}`)
    && /\d\d\/\d\d\/\d{4} \d\d:\d\d$/.test(nowLine.trim()) && !/\d{4}-\d\d-\d\d/.test(nowLine), said.text);
  check('parseEntries and labelOf', G.parseEntries('100k') === 100000 && G.parseEntries('5m') === 5e6 && G.labelOf(2e6) === '2m' && G.labelOf(400000) === '400k');
}

/* ---------- services ---------- */

/** Boots the service; resolves to a client with the token. watch: the service watches the disk (else --no-watch). */
async function boot(args, port, { home = path.join(work, 'data'), node = [], env = {}, watch = false } = {}) {
  fs.mkdirSync(home, { recursive: true });
  const child = spawn(process.execPath, [...node, SERVER, ...args, '--no-open', ...(watch ? [] : ['--no-watch']), '--port', String(port)], {
    stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, TERRANE_DATA: home, TERRANE_REGION_THRESHOLD: undefined, ...env },
  });
  let printed = '';
  child.stderr.on('data', (c) => { printed += c; });
  const actual = await new Promise((resolve, reject) => {
    child.stdout.on('data', (c) => {
      printed += c;
      const m = printed.match(/127\.0\.0\.1:(\d+)/);
      if (m) resolve(Number(m[1]));
    });
    child.on('exit', (code) => reject(new Error(`the service exited (${code}): ${printed}`)));
  });
  const request = (route, { token, method = 'GET', headers = {}, body } = {}) => new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port: actual, path: route, method, headers: { ...headers, ...(token ? { 'X-Terrane-Token': token } : {}) } }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        let json = null;
        try {
          json = JSON.parse(raw);
        } catch { /* not JSON */ }
        resolve({ status: res.statusCode, headers: res.headers, raw, body: json });
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
  const page = await request('/');
  const token = page.raw.match(/terrane-token" content="([^"]+)"/)[1];
  const stop = () => new Promise((resolve) => {
    if (child.exitCode !== null) return resolve();
    child.once('exit', resolve);
    child.kill();
    return undefined;
  });
  const get = (route, opts = {}) => request(route, { token, ...opts });
  /** Polls /api/tree until the tree is ready (or the time runs out). */
  const ready = async (ms = 20000, v = null) => {
    const end = Date.now() + ms;
    for (;;) {
      const t = (await get('/api/tree')).body;
      if (t?.state === 'ready' && (v === null || t.v === v)) return t;
      if (Date.now() > end) return t;
      await wait(50);
    }
  };
  return { port: actual, token, request, get, stop, ready, printed: () => printed };
}

const q = (o) => `?${new URLSearchParams(o)}`;
const freshQ = (paths, v = 1) => `/api/region${q({ v, fresh: 1, paths: JSON.stringify(paths) })}`;

/* ---------- 6. the routes in snapshot mode ---------- */

section('6. The routes in snapshot mode (30,000 synthetic entries)');
{
  const dir = trees.snapDir;
  let s = await boot(['--snapshot', dir], 5225);
  try {
    const info = (await s.get('/api/info')).body;
    check(`info.regions: the default threshold (${C.REGION_THRESHOLD.toLocaleString('en-US')}), the snapshot's entries, generation 1, nothing loaded`, C.REGION_THRESHOLD === 100000 && same(info.regions, { threshold: C.REGION_THRESHOLD, entries: 30000, v: 1, state: 'none' }), JSON.stringify(info.regions));
  } finally {
    await s.stop();
  }
  const usage = await new Promise((resolve) => {
    const child = spawn(process.execPath, [SERVER, '--snapshot', dir, '--no-open', '--region-threshold', '-1'], { stdio: ['ignore', 'pipe', 'pipe'] });
    let text = '';
    child.stderr.on('data', (x) => { text += x; });
    child.on('exit', (code) => resolve({ code, text }));
  });
  check('a threshold that is not a whole number is a usage error', usage.code === 1 && /not a whole number/.test(usage.text));

  s = await boot(['--snapshot', dir, '--region-threshold', '0'], 5226);
  try {
    const info = (await s.get('/api/info')).body;
    check('with --region-threshold 0, info says so', info.regions.threshold === 0 && info.regions.entries === 30000);
    const tr = await s.ready();
    const meta = trees.snapMeta;
    check(`the tree is read once the service listens, and becomes ready (${tr?.loadMs} ms)`, tr?.state === 'ready' && tr.v === 1 && tr.entries === 30000);
    check('its root record agrees with the meta', tr.root[D_FC] === meta.files && tr.root[D_DC] + 1 === meta.folders && tr.root[D_S] === meta.bytes && tr.root.length === D_LEN);
    check('/api/tree says the process\'s memory and the progress', tr.mem?.rss > 0 && tr.progress?.of === 30000 && tr.progress.folders === meta.folders);
    const replay = [];
    for await (const batch of openSnapshots(dir).scan('')) replay.push(batch);
    const local = treeFrom(replay, { name: meta.name, anchor: tr.anchor });
    // The service works its survey out before it serves, so its regions carry the survey's marks.
    Q.prepare(local);
    const ids = [0, 1, 2, local.kidByName(0, 'Photos'), local.kidByName(0, 'Projects')].filter((x) => x >= 0);
    const r = await s.get(`/api/region${q({ v: 1, ids: ids.join(',') })}`);
    const want = await answer(local, 'region', { v: '1', ids: ids.join(',') }, { v: 1 });
    check('/api/region by ids equals the answer in this process', r.status === 200 && same(r.body, want.json) && r.headers['cache-control'] === 'no-store');
    // A chain to a deep file.
    let deep = 0;
    for (let id = 0; id < local.F; id++) if (local.fileN[id] && local.chainOf(id).length > local.chainOf(deep).length) deep = id;
    const fileRel = `${local.relOf(deep)}/${local.fname[local.file0[deep]]}`;
    const ch = await s.get(`/api/region${q({ v: 1, path: fileRel, skip: 2 })}`);
    check(`the chain to a file ${local.chainOf(deep).length - 1} levels down, skipping two`, ch.status === 200 && ch.body.regions.length === local.chainOf(deep).length - 2
      && ch.body.target.name === local.fname[local.file0[deep]] && same(ch.body.regions, (await answer(local, 'region', { v: '1', path: fileRel, skip: '2' }, { v: 1 })).json.regions));
    let e = await s.get(`/api/region${q({ v: 2, ids: '0' })}`);
    check('a wrong generation is 409 ESTALE with a sentence', e.status === 409 && e.body.code === 'ESTALE' && /surveyed again/.test(e.body.message));
    e = await s.get(`/api/region${q({ v: 1, ids: Array.from({ length: 65 }, (_, i) => i).join(',') })}`);
    check('65 ids are 413 ETOOMANY', e.status === 413 && e.body.code === 'ETOOMANY');
    e = await s.get(`/api/region${q({ v: 1, ids: '0,x1' })}`);
    check('a malformed id is 400 EBADREQ', e.status === 400 && e.body.code === 'EBADREQ');
    e = await s.get(`/api/region${q({ v: 1, path: '../outside' })}`);
    check('a path that climbs is 400 EPATH', e.status === 400 && e.body.code === 'EPATH');
    e = await s.get(`/api/region${q({ v: 1, path: 'Photos/.Terrane-Trash/x' })}`);
    check('the holding area\'s name, in any case, is 403', e.status === 403 && e.body.code === 'EPATH');
    e = await s.request(`/api/region${q({ v: 1, ids: '0' })}`);
    check('no token is 401', e.status === 401 && e.body.code === 'ETOKEN');
    e = await s.get(`/api/region${q({ v: 1, ids: '0' })}`, { headers: { Host: `evil.example:${s.port}` } });
    check('a wrong Host is 403', e.status === 403 && e.body.code === 'EHOST');
    e = await s.get(`/api/region${q({ v: 1, ids: '0' })}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    check('POST /api/region is 403 ESNAPSHOT', e.status === 403 && e.body.code === 'ESNAPSHOT');
    e = await s.get(freshQ(['Photos', 'Nowhere/at/all']));
    check('fresh=1 reads nothing in snapshot mode and answers from the tree', e.status === 200 && e.body.regions[0].self[D_NAME] === 'Photos'
      && same(e.body.gone, ['Nowhere/at/all']) && e.body.regions.length === 2 && e.body.up.length === 0, JSON.stringify(e.body).slice(0, 200));
    e = await s.get(`/api/region${q({ v: 1 })}`);
    check('a region request that names nothing is 400 EBADREQ', e.status === 400 && e.body.code === 'EBADREQ');
    e = await s.get(`/api/region${q({ v: 1, path: 'Photos/no-such' })}`);
    check('a path not in the tree is 404 ENOENT', e.status === 404 && e.body.code === 'ENOENT' && e.body.deepest === 'Photos');
    // The whole-tree questions, through the service in snapshot mode.
    let f = await s.get(`/api/find${q({ v: 1, q: 'IMG' })}`);
    const lf = (await answer(local, 'find', { v: '1', q: 'IMG' }, { v: 1 })).json;
    check(`GET /api/find in snapshot mode equals the answer in this process (${f.body?.total} matches), no-store`,
      f.status === 200 && f.body.total === lf.total && f.body.total > 0 && same(f.body.hits, lf.hits) && f.headers['cache-control'] === 'no-store');
    const qid = f.body.qid;
    const statuses = [];
    for (const route of [`/api/marks${q({ v: 1, q: qid, ids: '0,1,2' })}`, `/api/marks${q({ v: 1, dup: 1, ids: '0' })}`, `/api/survey${q({ v: 1 })}`, `/api/survey${q({ v: 1, dupfiles: 4000 })}`,
      `/api/sessions${q({ v: 1 })}`, `/api/sessions${q({ v: 1, k: 1, files: 10 })}`, `/api/places${q({ v: 1, q: 'img', limit: 10 })}`]) statuses.push((await s.get(route)).status);
    check('marks, survey, sessions and places answer in snapshot mode', statuses.every((x) => x === 200), statuses.join(' '));
    e = await s.get(`/api/find${q({ v: 2, q: 'IMG' })}`);
    check('a question for a wrong generation is 409 ESTALE', e.status === 409 && e.body.code === 'ESTALE');
    e = await s.get(`/api/marks${q({ v: 1, q: 'q999', ids: '0' })}`);
    check('marks of a query no longer kept is 404 EQUERY, with a sentence', e.status === 404 && e.body.code === 'EQUERY' && /run again/.test(e.body.message));
    e = await s.get(`/api/find${q({ v: 1, q: 'is:benchmark', bench: JSON.stringify(Array.from({ length: 201 }, (_, i) => `b${i}`)) })}`);
    check('201 benchmarks named are 413', e.status === 413 && e.body.code === 'ETOOMANY');
    e = await s.get(`/api/marks${q({ v: 1, q: qid, ids: Array.from({ length: 1501 }, () => '0').join(',') })}`);
    check('1,501 folders marked are 413', e.status === 413 && e.body.code === 'ETOOMANY');
    e = await s.get(`/api/find${q({ v: 1, q: 'x', limit: 5001 })}`);
    check('a limit over 5,000 is 413', e.status === 413);
    e = await s.get(`/api/find${q({ v: 1, q: 'x', focus: '../up' })}`);
    check('a focus that climbs is 400 EPATH', e.status === 400 && e.body.code === 'EPATH');
    e = await s.get(`/api/sessions${q({ v: 1, path: 'Photos/no-such.jpg' })}`);
    check('a file not in the tree asked of sessions is 404 ENOENT', e.status === 404 && e.body.code === 'ENOENT');
    e = await s.request(`/api/find${q({ v: 1, q: 'IMG' })}`);
    check('a question with no token is 401', e.status === 401 && e.body.code === 'ETOKEN');
    e = await s.get(`/api/survey${q({ v: 1 })}`, { headers: { Host: `evil.example:${s.port}` } });
    check('a question with a wrong Host is 403', e.status === 403 && e.body.code === 'EHOST');
    e = await s.get(`/api/find${q({ v: 1, q: 'x' })}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    check('POST /api/find is 403 ESNAPSHOT', e.status === 403 && e.body.code === 'ESNAPSHOT');
    e = await s.get(`/api/region${q({ v: 1, ids: '0', q: qid })}`);
    check('a region asked with a search\'s qid carries its marks', e.status === 200 && e.body.regions[0].mk?.q === qid);
    // The snapshot read again while regions and questions are in flight:
    // each is answered by the old tree or refused as stale, never failed.
    const flying = [];
    for (let i = 0; i < 30; i++) flying.push(s.get(`/api/region${q({ v: 1, ids: String(i % 10) })}`));
    flying.push(s.get('/api/tree?build=1'));
    for (let i = 0; i < 30; i++) flying.push(s.get(`/api/region${q({ v: 1, ids: String(i % 10) })}`), s.get(`/api/find${q({ v: 1, q: 'IMG' })}`));
    const landed = await Promise.all(flying);
    const codes = {};
    for (const x of landed) codes[x.status] = (codes[x.status] || 0) + 1;
    check(`regions and questions in flight while the snapshot is read again are answered or refused as stale, never failed (${JSON.stringify(codes)})`,
      landed.every((x) => x.status === 200 || (x.status === 409 && x.body?.code === 'ESTALE')));
    const t2 = await s.ready(20000, 2);
    check('build=1 reads the snapshot again, and the generation rises', t2?.v === 2 && t2.state === 'ready');
    e = await s.get(`/api/region${q({ v: 1, ids: '0' })}`);
    check('after which the old generation is stale', e.status === 409 && e.body.code === 'ESTALE' && e.body.v === 2);
  } finally {
    await s.stop();
  }
}

/* ---------- 7. the routes in live mode ---------- */

section('7. The routes in live mode (a small tree in the OS temp folder)');
{
  const root = path.join(work, 'live');
  const outside = path.join(work, 'outside');
  fs.mkdirSync(outside);
  fs.writeFileSync(path.join(outside, 'secret.txt'), 'outside');
  for (const d of ['a/old/deep', 'a/keep', 'b/x', 'c']) fs.mkdirSync(path.join(root, ...d.split('/')), { recursive: true });
  for (const f of ['a/one.txt', 'a/old/deep/two.bin', 'a/keep/three.md', 'b/x/four.csv', 'c/five.json']) fs.writeFileSync(path.join(root, ...f.split('/')), f.repeat(20));
  const scanTree = async (anchor) => {
    const recs = [];
    for await (const b of scan(fs.realpathSync(root), { isRoot: true })) recs.push(b);
    const t = treeFrom(recs, { name: path.basename(root), anchor });
    Q.prepare(t);
    return t;
  };
  let s = await boot([root, '--region-threshold', '0', '--no-warm'], 5227);
  try {
    let t = (await s.get('/api/tree')).body;
    check('live mode waits for build=1 before it walks', t.state === 'none' && t.root === null);
    const e = await s.get(`/api/region${q({ v: 1, ids: '0' })}`);
    check('until then a region is 503 ENOTREADY', e.status === 503 && e.body.code === 'ENOTREADY');
    await s.get('/api/tree?build=1');
    t = await s.ready();
    check('build=1 walks the root and the tree becomes ready', t?.state === 'ready' && t.files === 5 && t.folders === 8);
    const local = await scanTree(t.anchor);
    const all = Array.from({ length: local.F }, (_, i) => i).join(',');
    let r = await s.get(`/api/region${q({ v: 1, ids: all })}`);
    check('every region equals one from a scan of the root', same(r.body, (await answer(local, 'region', { v: '1', ids: all }, { v: 1 })).json));
    // On disk: a file written in a, a folder removed under it.
    fs.writeFileSync(path.join(root, 'a', 'new.txt'), 'n'.repeat(1000));
    fs.rmSync(path.join(root, 'a', 'old'), { recursive: true });
    r = await s.get(freshQ(['a']));
    const reg = r.body.regions?.[0];
    const fnames = [];
    for (let i = 0; i < (reg?.f.length || 0); i += 4) fnames.push(reg.f[i]);
    check('fresh=1 shows a file written and a folder removed', r.status === 200 && fnames.includes('new.txt') && !reg.d.some((d) => d[D_NAME] === 'old'), JSON.stringify(r.body).slice(0, 300));
    check('and up holds the root\'s new figures', r.body.up.length === 1 && r.body.up[0][D_FC] === 5 && r.body.up[0][D_DC] === 5 && r.body.up[0][D_S] === t.root[D_S] - 'a/old/deep/two.bin'.length * 20 + 1000);
    // A new folder with a subtree.
    fs.mkdirSync(path.join(root, 'a', 'fresh', 'inner'), { recursive: true });
    fs.writeFileSync(path.join(root, 'a', 'fresh', 'inner', 'six.txt'), '666666');
    r = await s.get(freshQ(['a']));
    const fresh = r.body.regions[0].d.find((d) => d[D_NAME] === 'fresh');
    check('a new folder is read whole and grafted before the answer', fresh && fresh[D_DC] === 1 && fresh[D_FC] === 1 && fresh[D_S] === 6 && fresh[D_H] === 1);
    const chain = await s.get(`/api/region${q({ v: 1, path: 'a/fresh/inner/six.txt' })}`);
    check('and its contents are in the tree', chain.status === 200 && chain.body.target.name === 'six.txt');
    // A folder gone on disk: its parent is read instead.
    fs.rmSync(path.join(root, 'c'), { recursive: true });
    r = await s.get(freshQ(['c']));
    check('a folder gone on disk is reported in gone and its parent read', r.status === 200 && same(r.body.gone, ['c']) && r.body.regions[0].self[D_NAME] === path.basename(root) && !r.body.regions[0].d.some((d) => d[D_NAME] === 'c'));
    // b/x becomes a link to a folder outside the root.
    fs.rmSync(path.join(root, 'b', 'x'), { recursive: true });
    let linked = true;
    try {
      fs.symlinkSync(outside, path.join(root, 'b', 'x'), process.platform === 'win32' ? 'junction' : 'dir');
    } catch {
      linked = false;
    }
    if (linked) {
      r = await s.get(freshQ(['b/x']));
      check('a link inside the root to a folder outside is refused by the guard (EOUTSIDE)', r.status === 403 && r.body.code === 'EOUTSIDE', JSON.stringify(r.body));
      r = await s.get(freshQ(['b']));
      const fb = r.body.regions?.[0];
      check('and listed as what it is, a link, never followed', r.status === 200 && fb.d.length === 0 && fb.f.includes('x') && fb.f[fb.f.indexOf('x') + 3] & 1);
    } else console.log('  skip  a link that leads outside (no link could be made here)');
    r = await s.get(freshQ(['../up']));
    check('a fresh path that climbs is 400 EPATH', r.status === 400 && r.body.code === 'EPATH');
    r = await s.get(freshQ(Array.from({ length: 51 }, (_, i) => `p${i}`)));
    check('51 fresh paths are 413', r.status === 413 && r.body.code === 'ETOOMANY');
  } finally {
    await s.stop();
  }

  s = await boot([root, '--read-only', '--region-threshold', '0', '--no-warm'], 5227);
  try {
    await s.get('/api/tree?build=1');
    const t = await s.ready();
    fs.writeFileSync(path.join(root, 'b', 'later.txt'), 'later');
    const r = await s.get(freshQ(['b']));
    check('read-only mode answers regions and fresh reads', t?.state === 'ready' && r.status === 200 && r.body.regions[0].f.includes('later.txt'));
  } finally {
    await s.stop();
  }

  const home = path.join(work, 'warm-home');
  s = await boot([root, '--region-threshold', '0'], 5227, { home });
  try {
    await s.get('/api/tree?build=1');
    const t = await s.ready();
    const info = (await s.get('/api/info')).body;
    check(`with warm on, the build writes the warm cache and info.warm shows its counts (${info.warm?.files} files)`,
      t?.state === 'ready' && info.warm?.files === t.files && info.warm.folders === t.folders && info.warm.bytes === t.bytes && info.regions.entries === t.entries);
  } finally {
    await s.stop();
  }
}

/* ---------- 8. ceilings ---------- */

section('8. Ceilings');
{
  const batches = allRecords(G.generate({ entries: 300000, seed: 11, now: NOW }));
  const t0 = performance.now();
  const tree = treeFrom(batches, { name: 'synthetic', anchor: NOW });
  const ms = performance.now() - t0;
  check(`a 300,000-entry tree builds from records in ${ms.toFixed(0)} ms (ceiling 1,500)`, ms <= 1500 && tree.entries === 300000);
  const files = [];
  for (let i = 0; i < 20000; i++) files.push(`IMG_${String(i).padStart(5, '0')}.jpg`, 1000 + ((i * 7919) % 50000) * 97, NOW - i * 60e3, 0);
  const big = treeFrom([[[0, -1, 'root', NOW, 0, []], [1, 0, 'dump', NOW, 0, files]]], { name: 'root', anchor: NOW });
  big.region(0);
  const runs = [];
  for (let i = 0; i < 5; i++) {
    big.held.clear();
    const a = performance.now();
    const r = big.region(1);
    JSON.stringify(r);
    runs.push(performance.now() - a);
    if (r.f.length !== C.REGION_MAX * 4) runs.push(Infinity);
  }
  runs.sort((x, y) => x - y);
  check(`the region of a 20,000-file folder, chosen and written, answers in ${runs[2].toFixed(1)} ms, the median of five (ceiling 50)`, runs[2] <= 50);
  void ColumnTree;
}

/* ---------- 9. the whole-tree questions ---------- */

section('9. The whole-tree questions, against the page\'s own (120,000 entries, one clock)');
{
  const { batches } = trees[120000];
  // A model of the same records, surveyed as the page surveys, and a tree
  // built afresh, so nothing either side worked out earlier is reused.
  const model = modelFrom(batches, 'synthetic');
  const tree = treeFrom(batches, { name: 'synthetic', anchor: NOW });
  const realNow = Date.now;
  Date.now = () => NOW;
  try {
    const sv = model.survey();
    const sess = R.sessions(model.root);
    // The extensions the page's features give parseQuery, over the model.
    const deepDir = (() => {
      const st = [model.root];
      while (st.length) {
        const n = st.pop();
        if (n.d && n.c.length > 8 && relPath(n).split('/').length === 3) return n;
        for (const c of n.c) if (c.d) st.push(c);
      }
      return model.root;
    })();
    const focus = deepDir.p;
    const benchNodes = new Set(model.root.c.filter((c) => c.d).slice(0, 3));
    const folderAt = (base, rel) => {
      const parts = rel.split('/').filter(Boolean);
      const exact = model.find([relPath(base), ...parts].filter(Boolean).join('/'));
      if (exact?.d) return exact;
      let dir = base;
      for (const p of parts) {
        const low = p.toLowerCase();
        dir = dir.c.find((c) => c.d && c.n === p) || dir.c.find((c) => c.d && c.n.toLowerCase() === low);
        if (!dir) return null;
      }
      return dir;
    };
    const ext = {
      is: { benchmark: (n) => !!n.d && benchNodes.has(n) },
      prefix: {
        session: (v) => R.sessionPredicate(sess, /^\d+$/.test(v) ? Number(v) : 0),
        in: (_v, raw) => {
          const t = raw.trim();
          const dir = t === '.' || t === './' ? focus : t.startsWith('./') ? folderAt(focus, t.slice(2)) : folderAt(model.root, t.replace(/^\/+/, ''));
          return dir ? (n) => n !== dir && isAncestor(dir, n) : () => false;
        },
      },
    };
    const changedAt = (n) => (n.d ? n.mm : n.m);
    // A session that holds JavaScript, for session:k ext:js.
    const jsK = sess.findIndex((s) => s.files.some((f) => f.n.endsWith('.js'))) + 1 || 3;
    const queries = ['report', '*.jpg', 'ext:psd >50mb', 'kind:video,audio', 'is:empty', 'is:hidden', 'is:link', 'is:sealed', 'is:dir', 'older:1y', 'newer:30d',
      '"file 1"', '"report-20"', `in:${relPath(deepDir)}`, `in:./${deepDir.n}`, `in:${relPath(deepDir).toUpperCase()}`, 'session:1', 'session:3 ext:js', `session:${jsK} ext:js`, 'is:dup', 'is:benchmark'];
    const benchRels = JSON.stringify([...benchNodes].map(relPath));
    const bad = [];
    let nonEmpty = 0;
    for (const text of queries) {
      const s = runSearch(model, parseQuery(text, ext));
      const ask = (sort, dir) => answer(tree, 'find', { v: '1', q: text, focus: relPath(focus), bench: benchRels, sort, dir, limit: '5000' }, { v: 1 });
      const a = (await ask('size', '-1')).json;
      const b = (await ask('date', '1')).json;
      const bits = Q.queryBits(tree, a.qid);
      // The match set by path, from the hit bits of every entry.
      const got = new Set();
      for (let x = 1; x < tree.F; x++) if (bits.hit[x]) got.add(tree.relOf(x));
      for (let j = 0; j < tree.N; j++) if (bits.hit[tree.F + j]) got.add(`${tree.relOf(tree.fdir[j])}/${tree.fname[j]}`.replace(/^\//, ''));
      const want = new Set([...s.set].map(relPath));
      const setOk = got.size === want.size && [...want].every((r) => got.has(r));
      let withinOk = true;
      const stack = [[model.root, 0]];
      while (stack.length && withinOk) {
        const [node, id] = stack.pop();
        if ((s.within.get(node) || 0) !== bits.within[id]) withinOk = false;
        for (const c of node.c) if (c.d) stack.push([c, tree.kidByName(id, c.n)]);
      }
      const bySize = s.list.slice(0, 5000).map(relPath);
      const byDate = [...s.list].sort((x, y) => changedAt(x) - changedAt(y)).slice(0, 5000).map(relPath);
      const ok = setOk && a.total === s.set.size && a.bytes === s.bytes && withinOk && same(a.hits.map((h) => h[0]), bySize) && same(b.hits.map((h) => h[0]), byDate) && b.total === a.total;
      if (s.set.size) nonEmpty++;
      if (!ok) bad.push(`${text}: set ${setOk} total ${a.total}/${s.set.size} bytes ${a.bytes === s.bytes} within ${withinOk} size ${same(a.hits.map((h) => h[0]), bySize)} date ${same(b.hits.map((h) => h[0]), byDate)}`);
    }
    check(`find equals runSearch for ${queries.length} queries (${nonEmpty} with matches): the match set by path, total, bytes, the matches beneath every folder, and the first 5,000 by size descending and by date ascending`, bad.length === 0, bad.join(' | '));
    const inq = (await answer(tree, 'find', { v: '1', q: `in:./${deepDir.n} report`, focus: relPath(focus) }, { v: 1 })).json;
    check('find says what in: resolved to, by path', same(inq.in, { raw: `./${deepDir.n}`, rel: relPath(deepDir) }));
    const s1 = (await answer(tree, 'find', { v: '1', q: 'session:1' }, { v: 1 })).json;
    const f1 = R.sessionFacts(sess[0]);
    check('find names the session it evaluated, with its facts', s1.sess?.k === 1 && s1.sess.count === sess.length && s1.sess.facts.start === f1.start && s1.sess.facts.count === f1.count && s1.sess.facts.common === relPath(f1.common));
    const again = (await answer(tree, 'find', { v: '1', q: 'report', qid: s1.qid, sort: 'date', dir: '1' }, { v: 1 })).json;
    const kept = (await answer(tree, 'find', { v: '1', q: 'report' }, { v: 1 })).json;
    const reorder = (await answer(tree, 'find', { v: '1', q: 'report', qid: kept.qid, sort: 'date', dir: '-1' }, { v: 1 })).json;
    check('a query asked again in another order by its qid keeps its qid; another query\'s qid is not taken for it', reorder.qid === kept.qid && again.qid !== s1.qid && reorder.total === kept.total);
    const empty = (await answer(tree, 'find', { v: '1', q: '   ' }, { v: 1 })).json;
    check('an empty query answers no qid and nothing', empty.qid === null && empty.total === 0 && empty.hits.length === 0);
    const counted = (await answer(tree, 'find', { v: '1', q: 'report', limit: '0' }, { v: 1 })).json;
    check('limit 0 counts without keeping a query (the quick searches)', counted.qid === null && counted.total === kept.total && counted.hits.length === 0);

    // marks: by name, against runSearch's set and within.
    const rs = runSearch(model, parseQuery('report', ext));
    const ids = [];
    for (let id = 0; id < tree.F && ids.length < 1500; id++) if (tree.has(id)) ids.push(id);
    const mk = (await answer(tree, 'marks', { v: '1', q: kept.qid, ids: ids.join(',') }, { v: 1 })).json;
    let mOk = mk.marks.length === ids.length;
    for (const m of mk.marks) {
      const node = model.find(tree.relOf(m.id));
      if ((rs.within.get(node) || 0) !== m.w) mOk = false;
      if (node.c.length > C.REGION_MAX) continue;
      const wantF = node.c.filter((c) => !c.d && rs.set.has(c)).map((c) => c.n);
      const wantD = node.c.filter((c) => c.d && (rs.set.has(c) || rs.within.has(c))).map((c) => [c.n, rs.within.get(c) || 0, rs.set.has(c) ? 1 : 0]);
      if (!same(wantF, m.f) || !same(wantD, m.d) || m.n !== wantF.length + wantD.length) mOk = false;
    }
    check(`marks of ${ids.length.toLocaleString('en-US')} folders equal runSearch's matches and counts beneath, by name`, mOk);
    const reg = (await answer(tree, 'region', { v: '1', ids: '0', q: kept.qid }, { v: 1 })).json.regions[0];
    const rootKids = model.root.c.filter((c) => c.d);
    check('a region asked with q carries its marks by place', reg.mk?.q === kept.qid && reg.mk.w === rs.within.get(model.root)
      && same(reg.mk.d.map(([i, w]) => [rootKids[i].n, w]), rootKids.filter((c) => rs.within.has(c) || rs.set.has(c)).map((c) => [c.n, rs.within.get(c) || 0])));

    // The survey.
    const t0 = performance.now();
    const asv = (await answer(tree, 'survey', { v: '1' }, { v: 1 })).json;
    const surveyMs = performance.now() - t0;
    check('survey: the largest 80, in order', same(asv.largest.map((r) => r[0]), sv.largest.map(relPath)));
    check(`survey: empty (${asv.empty.count}), sealed (${asv.sealed.count}) and links (${asv.links.count}), each the first 1,000 in the page's order and its count`,
      asv.empty.count === sv.empty.length && same(asv.empty.list.map((r) => r[0]), sv.empty.slice(0, 1000).map(relPath))
      && asv.sealed.count === sv.sealed.length && same(asv.sealed.list.map((r) => r[0]), sv.sealed.slice(0, 1000).map(relPath))
      && asv.links.count === sv.links.length && same(asv.links.list.map((r) => r[0]), sv.links.slice(0, 1000).map(relPath)));
    check(`survey: ${asv.dupGroups.length} duplicate groups, each its size, count and waste, in order, with its first 12 files`,
      same(asv.dupGroups.map((g) => [g.size, g.count, g.waste]), sv.dupGroups.map((g) => [g.size, g.files.length, g.waste]))
      && same(asv.dupGroups.map((g) => g.files.map((r) => r[0])), sv.dupGroups.map((g) => g.files.slice(0, 12).map(relPath))));
    check('survey: heavyweights equal (none at 2% of this root)', same(asv.heavy.map((r) => r[0]), [...sv.heavy].map(relPath)));
    const df = (await answer(tree, 'survey', { v: '1', dupfiles: '4000' }, { v: 1 })).json;
    const dfWant = [];
    for (const g of sv.dupGroups) {
      if (dfWant.length + g.files.length > 4000) break;
      dfWant.push(...g.files);
    }
    check(`dupfiles=4000: the top groups' files whole (${df.files}), as Verify reads them`, df.files === dfWant.length && same(df.groups.flatMap((g) => g.files.map((r) => r[0])), dfWant.map(relPath)));
    const dupq = runSearch(model, parseQuery('is:dup'));
    const dupa = (await answer(tree, 'find', { v: '1', q: 'is:dup' }, { v: 1 })).json;
    check('is:dup reads the survey\'s groups', dupa.total === dupq.set.size && dupa.total > 0);
    // Heavyweights on a tree that has them.
    const hb = [[[0, -1, 'h', NOW, 0, ['big.bin', 9e9, NOW, 0, 'small.txt', 10, NOW, 0, 'mid.iso', 2e9, NOW - 1, 0]], [1, 0, 'in', NOW, 0, ['huge.mkv', 9e9, NOW - 5, 0]]]];
    const hm = modelFrom(hb, 'h');
    const ht = treeFrom(hb, { name: 'h', anchor: NOW });
    const hsv = hm.survey();
    const ha = (await answer(ht, 'survey', { v: '1' }, { v: 1 })).json;
    check('survey: heavyweights equal where there are some (ties by the walk\'s order)', ha.heavy.length === 3 && same(ha.heavy.map((r) => r[0]), [...hsv.heavy].map(relPath)), JSON.stringify(ha.heavy.map((r) => r[0])));
    const hreg = (await answer(ht, 'region', { v: '1', ids: '0' }, { v: 1 })).json.regions[0];
    check('once the survey is worked out, regions carry their heavyweights and candidates by place', same(hreg.hv, [0, 2]));

    // Working sessions.
    const ts = performance.now();
    const as = (await answer(tree, 'sessions', { v: '1' }, { v: 1 })).json;
    const sessionsMs = performance.now() - ts;
    const rows = sess.slice(0, 40).map((x, i) => {
      const f = R.sessionFacts(x);
      return { k: i + 1, start: f.start, end: f.end, count: f.count, bytes: f.bytes, bulk: f.bulk, places: f.places, runs: f.runs, common: relPath(f.common) };
    });
    check(`sessions: ${as.count.toLocaleString('en-US')} found, considered ${as.considered.toLocaleString('en-US')} and skipped ${as.skipped.toLocaleString('en-US')}, as relations.sessions finds them`,
      as.count === sess.length && as.considered === sess.considered && as.skipped === sess.skipped && as.gapMs === sess.gapMs);
    check('sessions: the newest 40 with their facts (start, end, count, bytes, bulk, places, runs, common folder)', same(as.list, rows));
    let every = true;
    for (let k = 1; k <= sess.length && every; k += Math.max(1, Math.floor(sess.length / 120))) {
      const x = sess[k - 1];
      const r = (await answer(tree, 'sessions', { v: '1', k: String(k), files: '1000' }, { v: 1 })).json;
      every = r.facts.start === x.start && r.facts.end === x.end && r.facts.count === x.count && r.facts.bytes === x.bytes && r.facts.bulk === x.bulk
        && r.total === x.count && same(r.files.map((f) => f[0]), x.files.slice(0, 1000).map(relPath));
    }
    check('sessions: a session\'s start, end, count, bytes, bulk and files in time order, across the list', every);
    const files = [];
    const st = [model.root];
    while (st.length) for (const c of st.pop().c) (c.d ? st.push(c) : files.push(c));
    let ofOk = true;
    let inOne = 0;
    for (let i = 0; i < 50; i++) {
      const f = files[(i * 7919) % files.length];
      const k = R.sessionOf(sess, f);
      const r = (await answer(tree, 'sessions', { v: '1', path: relPath(f), near: '8' }, { v: 1 })).json;
      if (r.k !== k) ofOk = false;
      if (k) {
        inOne++;
        const near = R.nearest(sess[k - 1], f, 8);
        const at = sess[k - 1].files.indexOf(f);
        if (!same(r.near.map((x) => x[0]), near.map(relPath)) || r.before !== near.filter((x) => sess[k - 1].files.indexOf(x) < at).length) ofOk = false;
      } else if (!['changed alone', 'in a folder whose name starts with a dot', 'its last change is not recorded'].includes(r.why)) ofOk = false;
    }
    check(`sessions: sessionOf and the 8 nearest for 50 files (${inOne} in a session) equal relations.js's`, ofOk);
    const sq = (await answer(tree, 'find', { v: '1', q: `session:${jsK} ext:js` }, { v: 1 })).json;
    const sf = (await answer(tree, 'sessions', { v: '1', k: String(jsK), files: '1000', q: sq.qid }, { v: 1 })).json;
    check(`a session's files narrowed by a query (session:${jsK} ext:js, ${sf.total})`, sf.total === sq.total && sf.files.every((f) => f[0].endsWith('.js')));

    // Places.
    const dirs = [];
    const fl = [];
    const st2 = [model.root];
    while (st2.length) for (const c of st2.pop().c) (c.d ? (dirs.push(c), st2.push(c)) : fl.push(c));
    const nodes = dirs.concat(fl);
    const lower = nodes.map((n) => n.n.toLowerCase());
    let pOk = true;
    for (const text of ['inv', 'img 48', 'node_mod', 'rep', 'photos/2019']) {
      const byPath = text.includes('/');
      const paths = byPath ? nodes.map(relPath) : null;
      const want = rank(text, Array.from(nodes.keys()), { limit: 50, key: byPath ? (k) => paths[k] : (k) => nodes[k].n, lower: byPath ? (k) => paths[k].toLowerCase() : (k) => lower[k] }).map((r) => relPath(nodes[r.item]));
      const got = (await answer(tree, 'places', { v: '1', q: text, limit: '50' }, { v: 1 })).json.places.map((r) => r[0]);
      if (!same(want, got)) pOk = false;
    }
    check('places equal fuzzy.rank over the same names, folders first, and over paths when the query holds a slash', pOk);

    // Ceilings, on a tree nothing was worked out for.
    const fresh = treeFrom(batches, { name: 'synthetic', anchor: NOW });
    let a = performance.now();
    await answer(fresh, 'find', { v: '1', q: 'report' }, { v: 1 });
    const findMs = performance.now() - a;
    a = performance.now();
    await answer(fresh, 'survey', { v: '1' }, { v: 1 });
    const freshSurveyMs = performance.now() - a;
    a = performance.now();
    await answer(fresh, 'sessions', { v: '1' }, { v: 1 });
    const freshSessionsMs = performance.now() - a;
    check(`ceilings at 120,000 entries: find ${findMs.toFixed(0)} ms (300), survey ${freshSurveyMs.toFixed(0)} ms (600), sessions ${freshSessionsMs.toFixed(0)} ms (400)`,
      findMs <= 300 && freshSurveyMs <= 600 && freshSessionsMs <= 400, `cached: survey ${surveyMs.toFixed(0)}, sessions ${sessionsMs.toFixed(0)}`);
  } finally {
    Date.now = realNow;
  }
}

/* ---------- 10. a live tree read from the warm cache ---------- */

section('10. Live mode, the warm cache read at startup and checked in place (port 5228)');
{
  const root = path.join(work, 'warmlive');
  const put = (rel, text) => {
    fs.mkdirSync(path.dirname(path.join(root, ...rel.split('/'))), { recursive: true });
    fs.writeFileSync(path.join(root, ...rel.split('/')), text);
  };
  for (const [rel, text] of [['docs/a.txt', 'aaa'], ['docs/b.txt', 'bbbb'], ['pics/c.jpg', 'ccccc'], ['pics/old/d.png', 'dd'], ['top.md', 'top']]) put(rel, text);
  // Whole seconds, so a time put back reads back exactly.
  const T = new Date(Math.floor(Date.now() / 1000) * 1000 - 7200e3);
  fs.utimesSync(path.join(root, 'pics'), T, T);
  const home = path.join(work, 'warmlive-home');
  let s = await boot([root, '--region-threshold', '0'], 5228, { home });
  let first;
  try {
    await s.get('/api/tree?build=1');
    first = await s.ready();
    await wait(300);
    const info = (await s.get('/api/info')).body;
    check(`a walk in region mode writes the warm cache (${info.warm?.files} files)`, first?.state === 'ready' && info.warm?.files === first.files && first.warm === null);
  } finally {
    await s.stop();
  }
  // Between the sessions: a file added, and another rewritten in place with its folder's time put back.
  put('docs/new.txt', 'new file');
  put('pics/c.jpg', 'ccccc, rewritten in place and longer');
  fs.utimesSync(path.join(root, 'pics'), T, T);
  const gate = path.join(work, 'check-gate');
  fs.writeFileSync(gate, 'held');
  s = await boot([root, '--region-threshold', '0'], 5228, { home, env: { TERRANE_CHECK_GATE: gate } });
  const said = [];
  const sse = http.get({ host: '127.0.0.1', port: s.port, path: `/api/events?t=${s.token}&dirs=0` }, (res) => {
    let buf = '';
    res.on('data', (chunk) => {
      buf += chunk;
      let at;
      while ((at = buf.indexOf('\n\n')) >= 0) {
        const block = buf.slice(0, at);
        buf = buf.slice(at + 2);
        for (const line of block.split('\n')) if (line.startsWith('data: ')) said.push(JSON.parse(line.slice(6)));
      }
    });
  });
  sse.on('error', () => {});
  try {
    const t = await s.ready();
    check('at startup the tree is read from the cache and served at once, warm.checking true', t?.state === 'ready' && t.warm?.checking === true && t.warm.takenAt > 0 && t.files === first.files, JSON.stringify(t?.warm));
    const before = await s.get(`/api/region${q({ v: 1, path: 'docs' })}`);
    const names = (r) => {
      const R = r.body?.regions?.at(-1);
      const out = [];
      for (let i = 0; i < (R?.f.length || 0); i += 4) out.push(R.f[i]);
      return out;
    };
    check('while it is checked, regions answer from the tree the last session kept', before.status === 200 && !names(before).includes('new.txt'));
    fs.rmSync(gate);
    const checked = await until(() => said.find((m) => m.type === 'checked'), 15000);
    const change = said.find((m) => m.type === 'change');
    check(`the check sends the folders it read again as a change event (${JSON.stringify(change?.dirs)}) and then checked (${checked?.read} read, ${checked?.added} here now)`,
      same(change?.dirs, ['docs']) && checked?.read === 1 && checked.added === 1 && checked.removed === 0 && said.indexOf(change) < said.indexOf(checked), JSON.stringify(said));
    const after = await s.get(`/api/region${q({ v: 1, path: 'docs' })}`);
    const tr = (await s.get('/api/tree')).body;
    check('after it, the file added on disk is in the tree, in the same generation, and warm.checking is false', names(after).includes('new.txt') && tr.v === 1 && tr.warm?.checking === false && same(tr.warm.checked.dirs, ['docs']), JSON.stringify(tr.warm));
    const swept = await until(() => said.find((m) => m.type === 'swept'), 15000);
    const later = said.slice(said.indexOf(checked) + 1).find((m) => m.type === 'change');
    check(`the sweep then finds the file rewritten in place (${JSON.stringify(later?.dirs)}), never as bulk, and ends with swept (${swept?.changed} changed)`,
      same(later?.dirs, ['pics']) && swept?.changed === 1 && said.indexOf(later) < said.indexOf(swept) && said.every((m) => m.type !== 'bulk'), JSON.stringify(said));
    const pics = await s.get(`/api/region${q({ v: 1, path: 'pics/c.jpg' })}`);
    const R = pics.body.regions.at(-1);
    check('and the tree holds its new size', R.f[R.f.indexOf('c.jpg') + 1] === 'ccccc, rewritten in place and longer'.length);
  } finally {
    sse.destroy();
    await s.stop();
  }
}

/* ---------- 11. outside changes, a page listening or not ---------- */

/** Listens to /api/events; resolves to { said, close }. */
function listen(s) {
  const said = [];
  const req = http.get({ host: '127.0.0.1', port: s.port, path: `/api/events?t=${s.token}&dirs=0` }, (res) => {
    let buf = '';
    res.on('data', (chunk) => {
      buf += chunk;
      let at;
      while ((at = buf.indexOf('\n\n')) >= 0) {
        const block = buf.slice(0, at);
        buf = buf.slice(at + 2);
        for (const line of block.split('\n')) if (line.startsWith('data: ')) said.push(JSON.parse(line.slice(6)));
      }
    });
  });
  req.on('error', () => {});
  return { said, close: () => req.destroy() };
}

section('11. Live mode: outside changes read into the kept tree, a page listening or not (ports 5227, 5228)');
{
  const root = path.join(work, 'watched');
  const put = (rel, text) => {
    fs.mkdirSync(path.dirname(path.join(root, ...rel.split('/'))), { recursive: true });
    fs.writeFileSync(path.join(root, ...rel.split('/')), text);
  };
  for (const [rel, text] of [['a/one.txt', 'one'], ['a/two.txt', 'two two'], ['b/three.txt', 'three'], ['b/sub/x.txt', 'x'], ['top.txt', 'top']]) put(rel, text);
  /** The names of a folder's region as the tree answers it now. */
  const namesIn = async (s, rel) => {
    const r = await s.get(`/api/region${q({ v: 1, path: rel })}`);
    const R = r.body?.regions?.at(-1);
    if (!R) return null;
    const out = [];
    for (let i = 0; i < R.f.length; i += 4) out.push(R.f[i]);
    for (const d of R.d) out.push(`${d[D_NAME]}/`);
    return out;
  };
  const total = async (s, text) => (await s.get(`/api/find${q({ v: 1, q: text })}`)).body?.total;
  let s = await boot([root, '--region-threshold', '0', '--no-warm'], 5227, { watch: true });
  try {
    await s.get('/api/tree?build=1');
    const t = await s.ready();
    let page = listen(s);
    const live = await until(() => page.said.find((m) => m.type === 'watch'), 6000);
    check(`a page's change stream starts the watcher (${live?.state})`, live?.state === 'live');
    await wait(300);
    put('a/while-here.txt', 'written while a page listens');
    const ev = await until(() => page.said.find((m) => m.type === 'change' && m.dirs.includes('a')), 8000);
    check('a change while a page listens is read into the tree and announced as kept', ev?.kept === true && (await namesIn(s, 'a'))?.includes('while-here.txt'), JSON.stringify(page.said));
    // The page goes away; the disk changes; nobody asks for a fresh read.
    page.close();
    await wait(400);
    put('added-while-away.txt', 'written with no page listening');
    fs.rmSync(path.join(root, 'b'), { recursive: true });
    const seen = await until(async () => {
      const names = await namesIn(s, '');
      return names && names.includes('added-while-away.txt') && !names.includes('b/') && names;
    }, 8000);
    check('with no page listening, the watcher\'s changes are read into the kept tree: a file at the root is in, a folder gone is gone', !!seen, JSON.stringify(await namesIn(s, '')));
    check('find answers from the tree as it is now: the new file found, the gone folder\'s file not', (await total(s, 'added-while-away')) === 1 && (await total(s, 'three')) === 0);
    const t2 = (await s.get('/api/tree')).body;
    check(`the same generation, its entries the disk's (${t.entries} then ${t2.entries})`, t2.v === t.v && t2.entries === t.entries + 1 + 1 - 4, JSON.stringify([t.entries, t2.entries]));
    // A page that comes back is told nothing it must read: the tree is current.
    page = listen(s);
    await wait(800);
    check('a page that comes back is sent no change it would have to read for itself', !page.said.some((m) => m.type === 'change' && !m.kept));
    // The survey of a tree that changed since it was worked out: the last
    // one, marked stale, until it may be worked out again.
    const sv1 = (await s.get(`/api/survey${q({ v: 1 })}`)).body;
    await s.get(`/api/region${q({ v: 1, fresh: 1, paths: JSON.stringify(['a']) })}`);
    const sv2 = (await s.get(`/api/survey${q({ v: 1 })}`)).body;
    check(`a survey asked right after a change answers the last one, stale, with when to ask again (${sv2.retry} ms)`, !sv1.stale && sv2.stale === true && sv2.retry > 0 && same(sv2.largest, sv1.largest), JSON.stringify({ s1: sv1.stale, s2: sv2.stale, r: sv2.retry }));
    await wait(sv2.retry + 50);
    const sv3 = (await s.get(`/api/survey${q({ v: 1 })}`)).body;
    check('asked again after that, it is worked out afresh', sv3.stale === undefined && Array.isArray(sv3.largest));
    page.close();
  } finally {
    await s.stop();
  }

  // Unwatched (--no-watch): a page's arrival checks the tree by folder times.
  s = await boot([root, '--region-threshold', '0', '--no-warm'], 5228);
  try {
    await s.get('/api/tree?build=1');
    await s.ready();
    put('a/while-unwatched.txt', 'the disk is not watched');
    const page = listen(s);
    const ev = await until(() => page.said.find((m) => m.type === 'change' && m.dirs.includes('a')), 8000);
    check('unwatched, a page that arrives has the tree checked by folder times: the change read in, announced as kept', ev?.kept === true && (await namesIn(s, 'a'))?.includes('while-unwatched.txt'), JSON.stringify(page.said));
    page.close();
    put('a/second.txt', 'too soon to check again');
    const again = listen(s);
    await wait(800);
    check('a second page within ten seconds does not check again', !again.said.some((m) => m.type === 'change') && !(await namesIn(s, 'a')).includes('second.txt'));
    again.close();
  } finally {
    await s.stop();
  }

  // On the region path a search's marks are never worked out again.
  {
    const tt = treeFrom([[[0, -1, 'root', NOW, 0, ['report.txt', 5, NOW, 0]], [1, 0, 'docs', NOW, 0, ['report-2.txt', 6, NOW, 0]]]], { name: 'root', anchor: NOW });
    const f1 = (await answer(tt, 'find', { v: '1', q: 'report' }, { v: 1 })).json;
    const r1 = (await answer(tt, 'region', { v: '1', ids: '0', q: f1.qid }, { v: 1 })).json;
    tt.replace(1, [[0, -1, 'docs', NOW, 0, ['report-2.txt', 6, NOW, 0, 'report-3.txt', 7, NOW, 0]]]);
    const r2 = (await answer(tt, 'region', { v: '1', ids: '0,1', q: f1.qid }, { v: 1 })).json;
    const f2 = (await answer(tt, 'find', { v: '1', q: 'report' }, { v: 1 })).json;
    const r3 = (await answer(tt, 'region', { v: '1', ids: '1', q: f2.qid }, { v: 1 })).json;
    check('a region asked with a search the tree changed since carries no marks, rather than working it out; the search asked again marks it',
      r1.regions[0].mk?.q === f1.qid && r2.regions.every((x) => !x.mk) && f2.total === 3 && r3.regions[0].mk?.f.length === 2);
  }
}

fs.rmSync(work, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
