#!/usr/bin/env node
/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Interior Test (Terrane Edition - v1.2)
 *     - File Name: interior-test.mjs
 *     - Relative Path: tools/interior-test.mjs
 *     - Artifact Type: test
 *     - Version: 1.2.0
 *     - Date: 11/13/2026
 *     - Update: Friday, November 13, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Changelog:
 *     - 1.2.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] — The
 *       lock reads a batch rename's items: one item under the archive
 *       refuses the batch, items outside it (the archive's own file
 *       included) do not, and items with no path or no list are let be.
 *     - 1.1.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] —
 *       Twins after a refresh equal a whole walk and walk only the
 *       folders read again; time inside an open archive is counted from
 *       its own entries (tableOf, figures, crossedAt).
 *     - 1.0.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] —
 *       Initial release.
 *
 * ✒ Description:
 *     Runs the browser's archive interiors module (web/js/interior.js) in
 *     Node against trees built with the browser's own model and layouts
 *     built with its own layout, with listings made by the service's own
 *     archive reader, and checks the graft, the chamber, twins, the lock
 *     and the open-and-close routes without a page or a service.
 *
 * ✒ Key Features:
 *     - Ingest, then graft: the main root's s, fc, dc, ks and h are the
 *       same before and after, and the file itself is untouched
 *     - The chamber: exactly four WALL boxes, every box of the interior
 *       inside the file's footprint, the floor keyed by the file and the
 *       archive's root resolving to it
 *     - Self-similar: the same archive at depth 2 and at depth 13 gives
 *       the same box count and the same geometry relative to the file's
 *       footprint, within 1e-9
 *     - A 300,000-entry archive seen from its floor: the layout keeps
 *       within 70,000 boxes and still walls it in
 *     - Twins by name and size, both ways; empty files and links are no
 *       one's twins, and the walk never enters the archive
 *     - The lock: any body path under the archive's path is refused,
 *       a batch rename's items included; the archive's own file is not
 *     - install(api) with a stand-in api: open reads the listing, says
 *       what it holds in the words the interface check looks for,
 *       refuses changes inside, closes on Escape, and closes with its
 *       sentence when the file's size or time changes or it is gone; a
 *       refresh it outlives works its twins out again, so a twin that
 *       left is no longer one and a copy that came becomes one
 *     - The sentences say "changed", never "created", "arrived" or
 *       "added"; the module names no browser global
 *
 * ✒ Usage Instructions:
 *     node tools/interior-test.mjs
 *     npm test runs it after the strata test.
 *
 * ✒ Other Important Information:
 *     - Dependencies: Node.js 22.5+; web/js/interior.js, web/js/model.js,
 *       web/js/layout.js; server/archive.mjs (toRecords)
 *     - Compatible platforms: Windows, macOS, Linux
 *     - Memory: the 300,000-entry archive is held once, about 60 MB
 *     - Exit code 0 means every check passed
 * ----------------------------------------------------------------------------
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.join(HERE, '..', 'web', 'js');
const { Model, relPath } = await import(new URL('../web/js/model.js', import.meta.url).href);
const { buildLayout, BOX, STYLE, MAX_BOXES } = await import(new URL('../web/js/layout.js', import.meta.url).href);
const { toRecords } = await import(new URL('../server/archive.mjs', import.meta.url).href);
const X = await import(new URL('../web/js/interior.js', import.meta.url).href);
const { graft, findTwins, lockedBody, openSentence, changedSentence, lockSentence, isZipFamily, FLAG_LOCKED, FLAG_ESCAPE, ZIP_FAMILY } = X;

let passed = 0;
let failed = 0;
const check = (name, cond, detail = '') => {
  if (cond) passed++;
  else failed++;
  console.log(`${cond ? '  ok  ' : ' FAIL '} ${name}${cond || !detail ? '' : ' — ' + detail}`);
};
const section = (title) => console.log(`\n${title}`);
const DAY = 86400000;
const NOW = Date.UTC(2026, 10, 13, 17, 0, 0);
const WORDS = /creat|arriv|\badded\b/i;

/**
 * A model from a plain description, through Model.ingest as the page
 * does: { name: [size, mtime] | { ... } }; a file is [size, mtime, flags].
 */
function build(spec, rootName = 'root') {
  const model = new Model(rootName);
  const records = [];
  let id = 0;
  const walk = (obj, pid, name, myId) => {
    const files = [];
    const dirs = [];
    for (const [k, v] of Object.entries(obj)) {
      if (Array.isArray(v)) files.push(k, v[0], v[1] ?? NOW - 30 * DAY, v[2] ?? 0);
      else dirs.push([k, v]);
    }
    records.push([myId, pid, name, NOW - 40 * DAY, 0, files]);
    for (const [k, v] of dirs) walk(v, myId, k, ++id);
  };
  walk(spec, -1, rootName, 0);
  model.ingest(records, [], model.root);
  return model;
}
const find = (model, rel) => rel.split('/').reduce((d, n) => d?.c.find((c) => c.n === n), model.root);

/** Archive entries as the reader's listZip gives them. */
const entry = (name, size, { dir = false, locked = false, mtime = NOW - 60 * DAY } = {}) => ({ name, dir, size, packed: size, mtime, locked, link: false, special: false });

/** The fixture's site.zip, mirrored by a loose folder site/. */
const SITE = [
  ['index.html', 47], ['about.html', 56], ['README.md', 55], ['css/site.css', 51], ['js/app.js', 30],
  ['img/logo.svg', 98], ['data/feed.json', 18], ['notes/café.md', 29],
];
const siteEntries = () => [entry('site/', 0, { dir: true }), ...SITE.map(([n, s]) => entry(`site/${n}`, s))];
const siteListing = (name) => toRecords(siteEntries(), { rootName: name });

/** A main tree where the archive sits beside its unpacked twin folder. */
function mainWithSite() {
  const site = {};
  for (const [n, s] of SITE) {
    const parts = n.split('/');
    let at = site;
    for (const p of parts.slice(0, -1)) at = at[p] ||= {};
    at[parts.at(-1)] = [s, NOW - 60 * DAY];
  }
  return build({
    archives: { 'site.zip': [1708, NOW - 30 * DAY], site, 'packed.7z': [32, NOW - 30 * DAY], 'empty.txt': [0, NOW] },
    docs: { 'index.html': [47, NOW - 2 * DAY], 'README.md': [999, NOW], 'lonely.txt': [12, NOW] },
  });
}

const totals = (d) => JSON.stringify({ s: d.s, fc: d.fc, dc: d.dc, h: d.h, mm: d.mm, ks: [...d.ks] });
const chainOf = (node) => {
  const set = new Set();
  for (let a = node; a; a = a.p) set.add(a);
  return set;
};
const WALLS = () => ['north', 'south', 'west', 'east'].map((wall) => ({ wall }));
const inside = (host, root) => ({ host, root, walls: WALLS() });

/* ---------- pure exports ---------- */

section('Pure exports');
{
  check('the zip family by name: zip, jar, apk, whl; not 7z, tar.gz or a folder',
    isZipFamily({ n: 'a.ZIP' }) && isZipFamily({ n: 'b.jar' }) && isZipFamily({ n: 'c.apk' }) && isZipFamily({ n: 'd.whl' })
    && !isZipFamily({ n: 'e.7z' }) && !isZipFamily({ n: 'f.tar.gz' }) && !isZipFamily({ n: 'g.zip', d: true }) && ZIP_FAMILY.includes('zip'));
  const hostRel = 'archives/site.zip';
  check('the lock refuses a path, parent, dest or any of paths under the archive',
    lockedBody({ type: 'rename', path: `${hostRel}/site.zip/site/a`, name: 'b' }, hostRel)
    && lockedBody({ type: 'mkdir', parent: `${hostRel}/site.zip`, name: 'n' }, hostRel)
    && lockedBody({ type: 'move', paths: ['docs/x'], dest: `${hostRel}/site.zip/site` }, hostRel)
    && lockedBody({ type: 'trash', paths: ['docs/x', `${hostRel}/site.zip/site/index.html`] }, hostRel));
  check('and lets the archive\'s own file, its neighbours and a name that only starts the same go',
    !lockedBody({ type: 'rename', path: hostRel, name: 'x.zip' }, hostRel) && !lockedBody({ type: 'move', paths: ['archives/site'], dest: 'docs' }, hostRel)
    && !lockedBody({ type: 'rename', path: 'archives/site.zip2/x', name: 'y' }, hostRel) && !lockedBody(null, hostRel) && !lockedBody({ type: 'undo' }, hostRel));
  check('a batch rename is refused when any of its items is under the archive, and let go when none is',
    lockedBody({ type: 'renames', items: [{ path: 'docs/x', name: 'y' }, { path: `${hostRel}/site.zip/site/a`, name: 'b' }] }, hostRel)
    && !lockedBody({ type: 'renames', items: [{ path: 'docs/x', name: 'y' }, { path: hostRel, name: 'site2.zip' }] }, hostRel)
    && !lockedBody({ type: 'renames', items: [null, { name: 'no path' }] }, hostRel) && !lockedBody({ type: 'renames', items: 'archives/site.zip/site.zip/a' }, hostRel));
  check('the changed sentence is the one the interface shows',
    changedSentence('x.zip') === 'x.zip changed on disk, so its interior was closed. Press I to read it again.');
  const said = openSentence({ name: 'site.zip', files: 8, folders: 6, unpacked: 384, twins: 8 });
  check(`what opening says: "${said}"`, /holds .* files .* already in this directory/.test(said) && said.startsWith('site.zip holds 8 files in 6 folders, 384 B unpacked; 8 of them are already'));
  const none = openSentence({ name: 'z.zip', files: 1, folders: 0, unpacked: 5, twins: 0 });
  const hazards = openSentence({ name: 'hazards.zip', files: 3, folders: 0, unpacked: 160, twins: 0, locked: 1, escapes: 1, escaped: [{ name: '../escape.txt', at: 'escape.txt' }] });
  const empty = openSentence({ name: 'e.zip', files: 0, folders: 2, unpacked: 0 });
  check(`none here, one locked, one escaping, and nothing: "${hazards}"`,
    none === 'z.zip holds 1 file, 5 B unpacked; none of them is already in this directory by name and size.'
    && /1 entry is locked \(encrypted\)\. 1 entry has a name that would land outside the folder if unpacked: \.\.\/escape\.txt \(shown as escape\.txt\)\.$/.test(hazards)
    && empty === 'e.zip holds no files, only 2 folders.', `${none} | ${empty}`);
  const all = [said, none, hazards, empty, changedSentence('x.zip'), lockSentence('x.zip')];
  check('every sentence says "changed", never "created", "arrived" or "added"', !all.some((s) => WORDS.test(s)));
}

/* ---------- ingest, then graft ---------- */

section('Ingest, then graft');
{
  const model = mainWithSite();
  const host = find(model, 'archives/site.zip');
  const before = totals(model.root);
  const own = (f) => JSON.stringify({ keys: Object.keys(f).sort(), n: f.n, s: f.s, m: f.m, f: f.f, k: f.k });
  const hostBefore = own(host);
  const listing = siteListing('site.zip');
  const root = graft(host, listing.records);
  check('the main root\'s s, fc, dc, ks and h are identical after ingest-then-graft', totals(model.root) === before, `${before} -> ${totals(model.root)}`);
  check('the file is untouched: no children, the same size and time', !('c' in host) && own(host) === hostBefore, `${hostBefore} -> ${own(host)}`);
  check(`the archive's root hangs from its file, named as it is, and sums what it lists (${root.fc} files, ${root.dc} folders, ${root.s} B)`,
    root.p === host && root.d && root.n === 'site.zip' && root.fc === 8 && root.dc === 6 && root.s === SITE.reduce((a, [, s]) => a + s, 0));
  check('relPath goes on through the file, so the lock\'s prefix holds every entry',
    relPath(find({ root }, 'site/notes/café.md')) === 'archives/site.zip/site.zip/site/notes/café.md' && relPath(root) === 'archives/site.zip/site.zip');
  check('the archive\'s root is in no folder\'s children, so a walk of the tree never enters it', !host.p.c.includes(root));
}

/* ---------- twins ---------- */

section('Twins by name and size');
{
  const model = mainWithSite();
  const host = find(model, 'archives/site.zip');
  const root = graft(host, siteListing('site.zip').records);
  const t0 = performance.now();
  const { twins, twinOf } = findTwins(model.root, root);
  const ms = performance.now() - t0;
  const idx = find({ root }, 'site/index.html');
  const outs = twins.get(idx)?.map(relPath).sort();
  check(`all 8 entries have their twin in archives/site (${twins.size}), index.html twice (the docs copy has the same size)`,
    twins.size === 8 && JSON.stringify(outs) === JSON.stringify(['archives/site/index.html', 'docs/index.html']), JSON.stringify(outs));
  check('README.md of another size is no twin; the way back finds the entry from either copy',
    !twinOf.has(find(model, 'docs/README.md')) && twinOf.get(find(model, 'docs/index.html'))?.[0] === idx && twinOf.get(find(model, 'archives/site/README.md'))?.[0] === find({ root }, 'site/README.md'));
  const m2 = build({ a: { 'z.txt': [0, NOW], 'l.txt': [5, NOW, 1], 'k.txt': [5, NOW] }, 'x.zip': [100, NOW] });
  const r2 = graft(find(m2, 'x.zip'), toRecords([entry('z.txt', 0), entry('l.txt', 5), entry('k.txt', 5), entry('dup/k.txt', 5)], { rootName: 'x.zip' }).records);
  const t2 = findTwins(m2.root, r2);
  check('an empty file and a link are no one\'s twins; entries are never twins of each other',
    t2.twins.size === 2 && !t2.twinOf.has(find(m2, 'a/z.txt')) && !t2.twinOf.has(find(m2, 'a/l.txt')) && t2.twinOf.get(find(m2, 'a/k.txt'))?.length === 2
    && [...t2.twinOf.keys()].every((f) => !r2.c.includes(f)), JSON.stringify([t2.twins.size, t2.twinOf.size]));
  // A tree of 200,000 files: one walk, keyed by size first.
  const big = new Model('big');
  const recs = [[0, -1, 'big', NOW, 0, []]];
  for (let d = 1; d <= 2000; d++) {
    const files = [];
    for (let k = 0; k < 100; k++) files.push(`f${k}.bin`, 1000 + ((d * 7 + k) % 5000), NOW - k * DAY, 0);
    recs.push([d, 0, `d${d}`, NOW, 0, files]);
  }
  recs[0][5] = ['site.zip', 1708, NOW, 0];
  big.ingest(recs, [], big.root);
  const bigRoot = graft(find(big, 'site.zip'), siteListing('site.zip').records);
  const t3 = performance.now();
  const t4 = findTwins(big.root, bigRoot);
  const ms2 = performance.now() - t3;
  check(`finding twins walks 200,000 files in ${ms2.toFixed(1)} ms (at most 250), the fixture's tree in ${ms.toFixed(2)} ms`, ms2 < 250 && t4.twins.size === 0, `${ms2} ms`);
}

/* ---------- the chamber ---------- */

/** The file's footprint and base, from the chamber's four walls. */
function footprint(L) {
  const g = L.geo;
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (let i = L.chamber.from; i < L.chamber.from + 4; i++) {
    const o = i * 6;
    x0 = Math.min(x0, g[o] - g[o + 3] / 2); x1 = Math.max(x1, g[o] + g[o + 3] / 2);
    z0 = Math.min(z0, g[o + 2] - g[o + 5] / 2); z1 = Math.max(z1, g[o + 2] + g[o + 5] / 2);
  }
  const o = L.chamber.from * 6;
  return { x0, z0, w: x1 - x0, d: z1 - z0, base: g[o + 1] - g[o + 4] / 2 };
}

/**
 * A layout with the archive at host walled in, the camera placed by
 * place(footprint). Where the file stands depends on what is drawn
 * around it, which depends on the camera, so the camera is placed again
 * on the chamber's own footprint until it no longer moves.
 */
function layoutAround(model, host, root, place) {
  const force = chainOf(root);
  const opts = (cam) => ({ cam, grain: 0.0062, now: NOW, force, inside: inside(host, root), aliases: [[root, host]] });
  let L = buildLayout(model.root, opts({ x: 0, y: 900, z: 1200 }));
  let box = footprint(L);
  let cam = place(box);
  for (let k = 0; k < 6; k++) {
    L = buildLayout(model.root, opts(cam));
    const next = footprint(L);
    const moved = Math.abs(next.x0 - box.x0) + Math.abs(next.z0 - box.z0) + Math.abs(next.w - box.w) + Math.abs(next.base - box.base);
    box = next;
    cam = place(box);
    if (moved <= box.w * 1e-12) break;
  }
  // Folders remember whether they stood open (hysteresis); the last
  // layout starts from none, so it depends on this camera alone.
  for (const top of [model.root, root]) {
    const stack = [top];
    while (stack.length) {
      const d = stack.pop();
      delete d._open;
      for (const c of d.c) if (c.d) stack.push(c);
    }
  }
  L = buildLayout(model.root, opts(cam));
  return { L, box: footprint(L), cam };
}

/**
 * Boxes of the chamber relative to the file's footprint, in the
 * footprint's own frame: along its long side, up, along its short side,
 * then the three sizes, all over the long side. Whether the long side
 * runs along x or z is the parent's choice, and the layout is the same
 * turned a quarter, so the frame follows it.
 */
function relative(L, box) {
  const out = [];
  const { from, to } = L.chamber;
  const alongX = box.w >= box.d;
  const S = Math.max(box.w, box.d);
  for (let i = from; i < to; i++) {
    const o = i * 6;
    const g = L.geo;
    const x = (g[o] - box.x0) / S, z = (g[o + 2] - box.z0) / S, sx = g[o + 3] / S, sz = g[o + 5] / S;
    out.push(alongX ? x : z, (g[o + 1] - box.base) / S, alongX ? z : x, alongX ? sx : sz, g[o + 4] / S, alongX ? sz : sx);
  }
  return out;
}

/** The fixture-sized archive with depth: three levels of folders, 240 files. */
function deepEntries() {
  const out = [];
  for (let a = 0; a < 4; a++) {
    for (let b = 0; b < 5; b++) {
      for (let k = 0; k < 12; k++) out.push(entry(`lib-${a}/part-${b}/file-${k}.dat`, 500 + ((a * 31 + b * 7 + k * 13) % 900) * 40, { mtime: NOW - ((a + b + k) % 40) * 30 * DAY }));
    }
  }
  out.push(entry('README.txt', 4000), entry('secret.bin', 3000, { locked: true }));
  return out;
}

section('The chamber');
{
  const model = mainWithSite();
  const host = find(model, 'archives/site.zip');
  const root = graft(host, siteListing('site.zip').records);
  const { L, box } = layoutAround(model, host, root, (b) => ({ x: b.x0 + b.w / 2, y: b.base + b.w * 1.2, z: b.z0 + b.w * 1.9 }));
  const walls = [];
  for (let i = 0; i < L.n; i++) if (L.type[i] === BOX.WALL) walls.push(i);
  check(`exactly 4 WALL boxes, the file's (${walls.length})`, walls.length === 4 && walls.every((i) => L.node[i] === host));
  const ch = L.chamber;
  const fi = L.index.get(host);
  check('the floor is keyed by the file, is the archive\'s root, and the root resolves to it',
    !!ch && ch.floor === ch.from + 4 && fi === ch.floor && L.node[fi] === root && L.type[fi] === BOX.DIR && L.index.get(root) === fi, JSON.stringify(ch));
  let outside = 0;
  let foreign = 0;
  const eps = box.w * 1e-9;
  for (let i = ch.from; i < ch.to; i++) {
    const o = i * 6;
    const g = L.geo;
    if (g[o] - g[o + 3] / 2 < box.x0 - eps || g[o] + g[o + 3] / 2 > box.x0 + box.w + eps || g[o + 2] - g[o + 5] / 2 < box.z0 - eps || g[o + 2] + g[o + 5] / 2 > box.z0 + box.d + eps) outside++;
    let a = L.node[i];
    while (a && a !== root && a !== host) a = a.p;
    if (!a) foreign++;
  }
  let strays = 0;
  for (let i = 0; i < L.n; i++) {
    if (i >= ch.from && i < ch.to) continue;
    for (let a = L.node[i]; a; a = a.p) if (a === root) strays++;
  }
  check(`every one of the chamber's ${ch.to - ch.from} boxes lies within the file's footprint, and every box of the archive is among them`,
    ch.to - ch.from > 5 && outside === 0 && foreign === 0 && strays === 0, JSON.stringify({ outside, foreign, strays }));
  const tops = walls.map((i) => L.geo[i * 6 + 1] + L.geo[i * 6 + 4] / 2);
  check('the walls stand on the file\'s base, taller than the floor', walls.every((i) => Math.abs(L.geo[i * 6 + 1] - L.geo[i * 6 + 4] / 2 - box.base) < eps)
    && tops.every((t) => t > L.geo[fi * 6 + 1] + L.geo[fi * 6 + 4] / 2));
  const plain = buildLayout(model.root, { cam: { x: 0, y: 900, z: 1200 }, grain: 0.0062, now: NOW, force: chainOf(root) });
  check('without the option the file is a file again: no walls, no chamber', plain.chamber === null && ![...plain.type].includes(BOX.WALL) && plain.type[plain.index.get(host)] === BOX.FILE);
}

section('The same chamber at depth 2 and at depth 13');
{
  // A larger file beside the archive makes its footprint an oblong strip
  // whose short side is under 200 units at depth 2, so no step meets the
  // riser cap, and whose long side is the same one at every depth: an
  // exact square would leave squarify's choice of axis to rounding.
  const folder = () => ({ 'deep.zip': [7000, NOW - 400 * DAY], 'peer.bin': [63000, NOW - 400 * DAY] });
  const shallow = build({ a: folder() });
  let spec = folder();
  for (let k = 12; k >= 1; k--) spec = { [`d${String(k).padStart(2, '0')}`]: spec };
  const deep = build(spec);
  const runs = [];
  for (const model of [shallow, deep]) {
    let host = null;
    const stack = [model.root];
    while (stack.length && !host) {
      const d = stack.pop();
      for (const c of d.c) if (c.d) stack.push(c); else if (c.n === 'deep.zip') host = c;
    }
    const root = graft(host, toRecords(deepEntries(), { rootName: 'deep.zip' }).records);
    let depth = 0;
    for (let a = host.p; a; a = a.p) depth++;
    // Above the middle of the floor, which reads the same either way round.
    const { L, box } = layoutAround(model, host, root, (b) => ({ x: b.x0 + b.w / 2, y: b.base + Math.max(b.w, b.d) * 0.45, z: b.z0 + b.d / 2 }));
    runs.push({ depth, L, box, rel: relative(L, box), n: L.chamber.to - L.chamber.from, w: Math.min(box.w, box.d), long: Math.max(box.w, box.d) });
  }
  const [a, b] = runs;
  // The walls are pushed north, south, west, east: turned a quarter, the
  // long pair is the other pair, so they compare as a set; the floor and
  // everything on it compare box by box.
  const walls = (r) => [0, 1, 2, 3].map((k) => r.rel.slice(k * 6, k * 6 + 6)).sort((p, q) => p[0] - q[0] || p[2] - q[2]).flat();
  const rest = (r) => r.rel.slice(24);
  let worst = 0;
  if (a.rel.length === b.rel.length) {
    for (const [p, q] of [[walls(a), walls(b)], [rest(a), rest(b)]]) for (let i = 0; i < p.length; i++) worst = Math.max(worst, Math.abs(p[i] - q[i]));
  }
  check(`the archive at depth ${a.depth} (footprint ${a.long.toFixed(1)} by ${a.w.toFixed(1)}) and at depth ${b.depth} (${b.long.toFixed(2)} by ${b.w.toFixed(2)}): ${a.n} and ${b.n} boxes`,
    a.depth === 2 && b.depth === 13 && a.w < 200 && a.long > a.w * 1.5 && a.n === b.n && a.n > 20 && !a.L.coarsened && !b.L.coarsened, JSON.stringify({ a: a.n, b: b.n, w: [a.w, b.w] }));
  check(`and the same geometry relative to the footprint, within 1e-9 (worst ${worst.toExponential(2)})`, a.rel.length === b.rel.length && worst <= 1e-9, String(worst));
}

section('A 300,000-entry archive seen from its floor');
{
  const entries = [];
  for (let d = 0; d < 60; d++) for (let k = 0; k < 5000; k++) entries.push(entry(`pkg-${d}/obj-${k}.o`, 100 + ((d * 977 + k * 31) % 9000), { mtime: NOW - (k % 300) * DAY }));
  const t0 = performance.now();
  const listed = toRecords(entries, { rootName: 'huge.zip', limits: { entries: 400000, directoryBytes: Infinity, ms: Infinity, depth: 128, folders: 100000, escaped: 32 } });
  const model = mainWithSite();
  const host = find(model, 'archives/site.zip');
  const before = totals(model.root);
  const root = graft(host, listed.records);
  const ingestMs = performance.now() - t0;
  const t1 = performance.now();
  const { L, box } = layoutAround(model, host, root, (b) => ({ x: b.x0 + b.w * 0.5, y: b.base + b.w * 0.06, z: b.z0 + b.w * 0.55 }));
  const ms = performance.now() - t1;
  let walls = 0;
  for (let i = 0; i < L.n; i++) if (L.type[i] === BOX.WALL) walls++;
  check(`${root.fc.toLocaleString('en-US')} entries listed and grafted in ${ingestMs.toFixed(0)} ms; the main root is unchanged`, root.fc === 300000 && totals(model.root) === before);
  check(`the layout holds ${L.n.toLocaleString('en-US')} boxes (at most ${MAX_BOXES.toLocaleString('en-US')}) in ${ms.toFixed(0)} ms, walls and floor included`,
    L.n <= MAX_BOXES && L.n > 1000 && walls === 4 && !!L.chamber && L.index.get(root) === L.chamber.floor, JSON.stringify({ n: L.n, walls, coarsened: L.coarsened, over: L.over, w: box.w }));
}

/* ---------- install(api) with a stand-in api ---------- */

/** app.js's contract, as far as interior.js uses it, without a page. */
function standIn(model, listingFor) {
  const lists = {};
  const reg = (name) => {
    const list = [];
    lists[name] = list;
    return { add: (e) => { list.push(e); return e; }, get: (id) => list.find((x) => x.id === id) };
  };
  const S = {
    info: { snapshot: null }, model, focus: model.root, sel: new Set(), primary: null, trail: [], force: null,
    tab: 'findings', interior: null, scanning: false, noGL: true, view: { clearRelation() {} },
  };
  const log = { notices: [], said: [], gets: [], refresh: [], relayouts: 0 };
  // The graft-aware isAttached and hostOf, as app.js has them.
  const isAttached = (node) => {
    const I = S.interior;
    let a = node;
    while (a.p) {
      const p = a.p;
      if (p.d ? !p.c.includes(a) : !(I && a === I.root && p === I.host)) return false;
      a = p;
    }
    return a === S.model.root;
  };
  const hostOf = (node) => {
    const I = S.interior;
    if (!I || !node) return null;
    for (let a = node; a; a = a.p) if (a === I.root) return I.host;
    return null;
  };
  const api = {
    S, KEYS: reg('KEYS'), ESCAPE: reg('ESCAPE'), LAYOUT_OPTS: reg('LAYOUT_OPTS'), AFTER_REFRESH: reg('AFTER_REFRESH'), AFTER_SURVEY: reg('AFTER_SURVEY'),
    MENU: reg('MENU'), TIP_LINES: reg('TIP_LINES'), READING: reg('READING'), INSPECTOR: { node: reg('node'), focus: reg('focus') },
    get: async (route, params) => { log.gets.push([route, params.path]); return listingFor(params.path); },
    setFocus: (d) => { S.focus = d; S.force = chainOf(d); },
    relayout: () => { log.relayouts++; }, drawAll() {}, drawLedger() {},
    refreshDirs: async (rels) => { log.refresh.push(rels); },
    isAttached, hostOf, listCursor: () => null,
    notice: (text) => { log.notices.push(text); }, say: (text) => { log.said.push(text); },
    el: (tag, props, ...kids) => ({ tag, props, kids }), fact: (k, ...v) => ({ k, v }), itemButton: (n) => ({ n }), actionButton: (label, run, o) => ({ label, o }),
  };
  return { api, S, log, lists };
}

section('install(api): open, lock, close');
{
  const model = mainWithSite();
  const host = find(model, 'archives/site.zip');
  const listedTime = host.m;
  const listing = (p) => {
    const t = siteListing('site.zip');
    return { format: 'zip', name: 'site.zip', size: host.s, mtime: listedTime, files: t.files, folders: t.folders, unpacked: t.unpacked, packed: t.packed,
      locked: t.locked, escapes: t.escapes, escaped: t.escaped, renamed: t.renamed, partial: null, records: t.records, path: p };
  };
  const { api, S, log, lists } = standIn(model, listing);
  const before = totals(model.root);
  X.install(api);
  const ids = Object.fromEntries(Object.entries(lists).map(([k, v]) => [k, v.map((x) => `${x.id}${x.order !== undefined ? `@${x.order}` : ''}`)]));
  check('its entries: I, Escape after the selection, a layout option, refresh and survey hooks, a menu group, inspector sections, a hover line and a Reading row',
    JSON.stringify(ids) === JSON.stringify({ KEYS: ['interior'], ESCAPE: ['interior@80'], LAYOUT_OPTS: ['interior@60'], AFTER_REFRESH: ['interior'], AFTER_SURVEY: ['interior@60'], MENU: ['interior@20'], TIP_LINES: ['interior@70'], READING: ['interior@65'], node: ['interior@15'], focus: ['interior@15'] })
    && Object.values(lists).flat().every((x) => x.owner === 'interiors') && lists.KEYS[0].keys.join() === 'i', JSON.stringify(ids));
  const key = lists.KEYS[0];
  const esc = lists.ESCAPE[0];

  // I with nothing selected says what to do.
  key.run({ inList: false });
  check('I with nothing selected says to select a zip archive', log.notices.at(-1) === 'Select a zip archive, then press I to look inside it.');
  S.primary = find(model, 'archives/packed.7z');
  key.run({ inList: false });
  check('I on packed.7z says only the zip family is looked inside, and asks the service nothing', /zip archives .*packed\.7z is not one\./.test(log.notices.at(-1)) && !log.gets.length, log.notices.at(-1));
  S.primary = host;
  S.sel = new Set([host]);
  await key.run({ inList: false });
  const I = S.interior;
  check('I on site.zip reads it through GET /api/inside and opens it', !!I && I.host === host && JSON.stringify(log.gets) === '[["inside","archives/site.zip"]]');
  check(`the notice says what it holds: "${log.notices.at(-1)}"`, /holds .* files .* already in this directory/.test(log.notices.at(-1)) && /site\.zip holds 8 files in 6 folders/.test(log.notices.at(-1)));
  check('it goes into the archive\'s root, on the Contents tab, and the main tree\'s totals are unchanged',
    S.focus === I.root && S.tab === 'contents' && S.force.has(host) && totals(model.root) === before);
  check('the size and time it listed match the tree\'s, so nothing is read again', !log.refresh.length);
  const opts = lists.LAYOUT_OPTS[0].options({ aliases: [['a', 'b']] });
  check('the layout option walls it in and keeps any alias already asked for',
    opts.inside === I.chamber && opts.inside.walls.length === 4 && JSON.stringify(opts.aliases.map((p) => p.length)) === '[2,2]' && opts.aliases[1][0] === I.root && opts.aliases[1][1] === host);
  const cafe = find({ root: I.root }, 'site/notes/café.md');
  check('the lock refuses a change under it and lets the file itself be renamed',
    I.refuse({ type: 'rename', path: relPath(cafe), name: 'x' }) === lockSentence('site.zip') && I.refuse({ type: 'rename', path: relPath(host), name: 'y.zip' }) === null);
  check('twins half-band both sides; an entry without one draws as it would', I.styleOf(cafe) === STYLE.HALF_BANDS && I.styleOf(find(model, 'archives/site/notes/café.md')) === STYLE.HALF_BANDS
    && I.styleOf(find(model, 'docs/lonely.txt')) === null && I.twinsOf(cafe)?.[0] === find(model, 'archives/site/notes/café.md'));
  const menu = lists.MENU[0].items(cafe, {});
  check('the menu on an entry offers to close the archive', menu.length === 1 && menu[0].label === 'Close site.zip' && menu[0].hint === 'I');

  // A refresh the archive outlives: a twin leaves its folder, then a copy
  // with its name and size comes into another one.
  const about = find({ root: I.root }, 'site/about.html');
  const aboutHere = find(model, 'archives/site/about.html');
  const loose = aboutHere.p;
  const docs = find(model, 'docs');
  loose.c.splice(loose.c.indexOf(aboutHere), 1);
  model.recompute(loose);
  lists.AFTER_REFRESH[0].run(new Set([loose]));
  const gone = S.interior;
  check('a refresh after a twin left: still open, its twins worked out again (the count, both maps, the styles), the rest kept',
    !!gone && gone !== I && Object.isFrozen(gone) && gone.host === host && gone.root === I.root && gone.chamber === I.chamber && gone.lock === I.lock
    && gone.listing.twins === I.listing.twins - 1 && gone.listing.files === I.listing.files
    && !gone.twins.has(about) && !gone.twinOf.has(aboutHere) && gone.twinsOf(about) === null && gone.styleOf(about) === null
    && gone.styleOf(cafe) === STYLE.HALF_BANDS && lists.LAYOUT_OPTS[0].options({}).inside === I.chamber,
    JSON.stringify({ twins: gone?.listing.twins, was: I.listing.twins }));
  aboutHere.p = docs;
  docs.c.push(aboutHere);
  model.recompute(docs);
  lists.AFTER_REFRESH[0].run(new Set([docs]));
  const back = S.interior;
  check('a copy with its name and size that comes after opening becomes its twin at the next refresh',
    back.listing.twins === I.listing.twins && back.twinsOf(about)?.[0] === aboutHere && back.twinOf.get(aboutHere)?.[0] === about
    && back.styleOf(about) === STYLE.HALF_BANDS && back.styleOf(aboutHere) === STYLE.HALF_BANDS, JSON.stringify({ twins: back.listing.twins }));
  // Put back where it was, for what follows.
  docs.c.splice(docs.c.indexOf(aboutHere), 1);
  aboutHere.p = loose;
  loose.c.push(aboutHere);
  model.recompute(docs);
  model.recompute(loose);
  lists.AFTER_REFRESH[0].run(new Set([docs, loose]));

  // Escape: the selection first (app.js's own entry, at 70), then the archive.
  check('Escape is active while it is open', esc.active());
  S.sel = new Set([cafe]);
  S.primary = cafe;
  S.trail = [model.root, I.root];
  esc.clear();
  check('Escape closes it: the entry leaves the selection and the trail, the location goes to its folder, the forced chain is let go',
    S.interior === null && !S.sel.has(cafe) && S.primary === null && S.trail.length === 1 && S.focus === host.p && S.force === null && log.said.at(-1) === 'site.zip is closed.');

  // Changed on disk: a refresh finds another size or time.
  S.primary = host;
  S.sel = new Set([host]);
  await key.run({ inList: false });
  check('I on the file opens it again, and I on the file while it is open closes it', !!S.interior && S.interior.host === host);
  await key.run({ inList: false });
  const shut = S.interior === null;
  await key.run({ inList: false });
  check('... and opens it once more', shut && !!S.interior);
  S.primary = null;
  S.sel = new Set();
  host.m += 1000;
  lists.AFTER_REFRESH[0].run(new Set([host.p]));
  check('a refresh that finds the file\'s time changed closes it with the sentence, and selects the file so I reads it again',
    S.interior === null && log.notices.at(-1) === changedSentence('site.zip') && S.primary === host);
  await key.run({ inList: false });
  check('the listing is now older than the tree\'s copy (its time differs), so the folder is read again',
    !!S.interior && JSON.stringify(log.refresh.at(-1)) === '["archives"]');
  host.p.c.splice(host.p.c.indexOf(host), 1);
  lists.AFTER_REFRESH[0].run(new Set([host.p]));
  check('a file no longer in its folder closes it: "is no longer where it was"', S.interior === null && /^site\.zip is no longer where it was/.test(log.notices.at(-1)));

  // Snapshot mode refuses before asking the service.
  host.p.c.push(host);
  S.info.snapshot = { takenAt: NOW };
  const gets = log.gets.length;
  S.primary = host;
  await key.run({ inList: false });
  const off = lists.MENU[0].items(host, {});
  check('snapshot mode: I is refused in words and the service is not asked; "Look inside" is unavailable, snapshot mode',
    S.interior === null && log.gets.length === gets && /snapshot mode/.test(log.notices.at(-1)) && off[0].label === 'Look inside' && off[0].disabled && off[0].reason === 'snapshot mode');
  S.info.snapshot = null;
  const said = [...log.notices, ...log.said];
  check(`what it said uses "changed", never "created", "arrived" or "added" (${said.length} sentences)`, !said.some((s) => WORDS.test(s)), said.filter((s) => WORDS.test(s)).join(' | '));
}

/* ---------- twins after a refresh, and time inside an archive ---------- */

section('Twins after a refresh: the folders read again, not the whole tree');
{
  // 200,000 files in 2,000 folders, site.zip at the root, and copies of
  // its files (by name and size) in d3 and d5.
  const big = new Model('big');
  const recs = [[0, -1, 'big', NOW, 0, ['site.zip', 1708, NOW, 0]]];
  for (let d = 1; d <= 2000; d++) {
    const files = [];
    for (let k = 0; k < 100; k++) files.push(`f${k}.bin`, 1000 + ((d * 7 + k) % 5000), NOW - k * DAY, 0);
    if (d === 3 || d === 5) for (const [n, s] of SITE) files.push(n.split('/').pop(), s, NOW, 0);
    recs.push([d, 0, `d${d}`, NOW, 0, files]);
  }
  big.ingest(recs, [], big.root);
  const host = find(big, 'site.zip');
  const listing = (p) => {
    const t = siteListing('site.zip');
    return { format: 'zip', name: 'site.zip', size: host.s, mtime: host.m, files: t.files, folders: t.folders, unpacked: t.unpacked, packed: t.packed,
      locked: 0, escapes: 0, escaped: [], renamed: 0, partial: null, records: t.records, path: p };
  };
  const { api, S, lists } = standIn(big, listing);
  X.install(api);
  S.primary = host;
  S.sel = new Set([host]);
  await lists.KEYS[0].run({ inList: false });
  const I = S.interior;
  const shape = (t) => JSON.stringify([...t.twinOf].map(([f, es]) => [relPath(f), es.map((e) => e.n)]).sort()) + JSON.stringify([...t.twins].map(([e, fs]) => [e.n, fs.map(relPath).sort()]).sort());
  // A twin leaves d5 for d9, and d3 loses one.
  const d3 = find(big, 'd3');
  const d5 = find(big, 'd5');
  const d9 = find(big, 'd9');
  const moving = d5.c.find((c) => c.n === 'about.html');
  d5.c.splice(d5.c.indexOf(moving), 1);
  moving.p = d9;
  d9.c.push(moving);
  const lost = d3.c.find((c) => c.n === 'README.md');
  d3.c.splice(d3.c.indexOf(lost), 1);
  for (const d of [d3, d5, d9]) big.recompute(d);
  const dirs = new Set([d3, d5, d9]);
  let after = null;
  let incr = Infinity;
  for (let i = 0; i < 3; i++) {
    S.interior = I;
    const t0 = performance.now();
    lists.AFTER_REFRESH[0].run(dirs);
    incr = Math.min(incr, performance.now() - t0);
    after = S.interior;
  }
  let whole = Infinity;
  let full = null;
  for (let i = 0; i < 3; i++) {
    const t0 = performance.now();
    full = findTwins(big.root, I.root);
    whole = Math.min(whole, performance.now() - t0);
  }
  check('after a refresh the twins equal a whole walk: the one that moved is found in d9, the one removed is gone',
    shape(after) === shape(full) && after.listing.twins === full.twins.size && after.twinOf.has(moving) && !after.twinOf.has(lost), `${after.twinOf.size} / ${full.twinOf.size}`);
  check(`and only the folders read again were walked: ${incr.toFixed(2)} ms against ${whole.toFixed(1)} ms for the whole tree of 200,000 files (under a quarter)`,
    incr * 4 < whole, `${incr} vs ${whole}`);
  // A new folder that came with the refresh is walked whole.
  const fresh = new Model('fresh');
  fresh.ingest([[0, -1, 'fresh', NOW, 0, []], [1, 0, 'inner', NOW, 0, ['index.html', 47, NOW, 0]]], [], fresh.root);
  const inner = fresh.root.c[0];
  inner.p = d9;
  d9.c.push(inner);
  big.recompute(d9);
  S.interior = after;
  lists.AFTER_REFRESH[0].run(new Set([d9]));
  check('a folder new since the last walk is walked whole: its copy of index.html is a twin',
    S.interior.twinOf.has(inner.c[0]) && shape(S.interior) === shape(findTwins(big.root, I.root)));
}

section('Time inside an open archive: figures from its own entries');
{
  const { buildAgeTable, LADDER_DAYS } = await import(new URL('../web/js/timeline.js', import.meta.url).href);
  const { tableOf, figures, crossedAt } = await import(new URL('../web/js/time.js', import.meta.url).href);
  const model = build({ 'a.zip': [5000, NOW - 2 * DAY], old: { 'x.txt': [10, NOW - 900 * DAY] } });
  const host = find(model, 'a.zip');
  const ents = [entry('inner/', 0, { dir: true })];
  for (let i = 0; i < 9; i++) ents.push(entry(`inner/old${i}.txt`, 1000, { mtime: NOW - 700 * DAY }));
  ents.push(entry('inner/new.txt', 1000, { mtime: NOW - 2 * 3600000 }));
  const root = graft(host, toRecords(ents, { rootName: 'a.zip' }).records);
  const innerDir = root.c.find((c) => c.n === 'inner');
  const A = buildAgeTable(model.root, NOW);
  const B = buildAgeTable(root, NOW);
  const k = LADDER_DAYS.indexOf(30);
  const T = tableOf(A, B, innerDir);
  const f = figures(T, k, innerDir);
  check('an archive folder is counted from its own entries: 1 of 10 files changed in the last month, 10% of its bytes (not all of them)',
    T === B && f.cf === 1 && f.tf === 10 && Math.abs(f.share - 0.1) < 1e-9 && figures(A, k, innerDir).cf === 10, JSON.stringify(f));
  check('so it is not crossed, and it keeps 90% of its height, where the shared table alone would cross it whole',
    !crossedAt(T, k, innerDir) && Math.abs(T.kept(innerDir, k) - 0.9) < 1e-9 && A.kept(innerDir, k) === 0 && crossedAt(A, k, innerDir));
  check('a folder on disk and a file keep the shared table', tableOf(A, B, find(model, 'old')) === A && tableOf(A, B, host) === A && tableOf(A, null, innerDir) === A);
}

/* ---------- no DOM ---------- */

section('No DOM');
{
  const src = fs.readFileSync(path.join(WEB, 'interior.js'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  const uses = ['document', 'window', 'localStorage', 'navigator', 'HTMLElement', 'requestAnimationFrame', 'fetch'].filter((w) => new RegExp(`\\b${w}\\b`).test(src));
  check('interior.js names no browser global: install(api) builds with api.el and asks the service with api.get', uses.length === 0, uses.join(', '));
  const imports = [...src.matchAll(/from '([^']+)'/g)].map((m) => m[1]);
  check('it imports only model.js and layout.js', JSON.stringify(imports) === JSON.stringify(['./model.js', './layout.js']), JSON.stringify(imports));
  check('it exports a name and install(api) for features.js, and the entry flags above the scanner\'s', X.name === 'Interiors' && typeof X.install === 'function' && FLAG_LOCKED === 8 && FLAG_ESCAPE === 16);
}

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
