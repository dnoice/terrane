#!/usr/bin/env node
/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Demo Test (Terrane Edition - v1.1)
 *     - File Name: demo-test.mjs
 *     - Relative Path: tools/demo-test.mjs
 *     - Artifact Type: test
 *     - Version: 1.1.0
 *     - Date: 11/14/2026
 *     - Update: Saturday, November 14, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Changelog:
 *     - 1.1.0 (11/14/2026) [dendogg + Anthropic - Claude Opus 5.5] — The
 *       region routes: info.regions; the root region equals a column tree
 *       built from the demo's own records; every folder's record equals
 *       the browser model's node and the age table's row; a path's chain
 *       with skip; a fresh read after a new folder shows it, with the
 *       parent's new count in up; a stale generation and too many ids
 *       refused in the service's words. The whole-tree questions: with
 *       regions: true the threshold is 0; find equals runSearch for 14
 *       queries on one clock, the survey model.survey(), the sessions
 *       relations.sessions; places and marks answer; check is refused with
 *       its sentence; a wrong generation is ESTALE. An arrival read into
 *       the tree and said kept; a kept fresh read; with= on a fresh read;
 *       a with= name that climbs refused; find's second page continues the
 *       first.
 *     - 1.0.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] —
 *       Initial release.
 *
 * ✒ Description:
 *     Checks the demo world and the demo service in Node, without a page:
 *     that the world is whole, deterministic and full of what the
 *     interface shows off, and that the service answers each route and
 *     operation the way the real service does, down to its records, its
 *     names for copies and its refusals.
 *
 * ✒ Key Features:
 *     - The world: the same seed and moment give the same tree; at least
 *       ten thousand files; built in well under a frame budget
 *     - Showcase material present: the session under way, last night's
 *       export, true duplicates and a decoy, empty and sealed folders,
 *       hidden files, links (one dangling), a special file, archives
 *     - Scan parity: a written subtree read by the real scanner
 *       (server/scan.mjs) gives the same names, sizes, flags and depth
 *       stubs as the demo's scan of it
 *     - The browser's own model (web/js/model.js) takes the demo's
 *       records: totals match the world, and the Survey finds the
 *       duplicates, empty folders, the sealed folder and the links
 *     - Contents: exact sizes, truncation, text without NUL bytes,
 *       binary kinds with them, zip interiors in the reader's shape,
 *       other archives refused in the service's words
 *     - Operations and undo: new folder, rename, move, copy, removal,
 *       restore, purge; "keep both" names as the service picks them;
 *       loops, same-folder moves, reserved names and collisions refused;
 *       undo refused when the tree changed underneath
 *     - Jobs: a large copy reports queued, counting, copying and end, and
 *       a cancel part way keeps what it finished and says so
 *     - Hashes: duplicates match, the decoy does not, large files sampled
 *     - Regions: GET tree and region answered by columns.js over the
 *       demo's own tree, figure for figure with the browser's model, and
 *       a fresh read that takes a change on
 *
 * ✒ Usage Instructions:
 *     node tools/demo-test.mjs
 *     npm test runs it after the interiors test.
 *
 * ✒ Other Important Information:
 *     - Dependencies: Node.js 22+; web/js/demo-world.js,
 *       web/js/demo-service.js, web/js/model.js, web/js/columns.js,
 *       web/js/timeline.js, server/scan.mjs
 *     - Compatible platforms: Windows, macOS, Linux
 *     - Writes a small throwaway folder in the OS temp folder for the
 *       scan parity check and removes it
 *     - Exit code 0 means every check passed
 * ----------------------------------------------------------------------------
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const W = await import(new URL('../web/js/demo-world.js', import.meta.url).href);
const { createDemoService } = await import(new URL('../web/js/demo-service.js', import.meta.url).href);
const { Model, relPath, parseQuery, runSearch, isAncestor } = await import(new URL('../web/js/model.js', import.meta.url).href);
const R = await import(new URL('../web/js/relations.js', import.meta.url).href);
const C = await import(new URL('../web/js/columns.js', import.meta.url).href);
const { buildAgeTable, STEPS } = await import(new URL('../web/js/timeline.js', import.meta.url).href);
const { scan } = await import(new URL('../server/scan.mjs', import.meta.url).href);

let passed = 0;
let failed = 0;
const check = (name, cond, detail = '') => {
  if (cond) passed++;
  else {
    failed++;
    console.log(`  FAIL ${name}${detail ? `\n       ${String(detail).slice(0, 400)}` : ''}`);
  }
};
const section = (title) => console.log(`\n${title}`);
const MIN = 60e3;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const NOW = 1794500000000;

/* ---------- the world ---------- */
section('The world');
const t0 = performance.now();
const world = W.buildWorld({ now: NOW });
const ms = performance.now() - t0;
const again = W.buildWorld({ now: NOW });
const sig = (w) => {
  const out = [];
  W.walk(w.root, (n, rel) => out.push(`${rel}|${n.dir ? 'd' : n.size}|${n.mtime}|${n.flags || 0}|${n.s || 0}`));
  return out.sort().join('\n');
};
check('the same seed and moment give the same tree', sig(world) === sig(again));
check('another seed gives another tree', sig(world) !== sig(W.buildWorld({ now: NOW, seed: 7 })));
check(`at least 10,000 files and 1,000 folders (${world.stats.files}, ${world.stats.folders})`, world.stats.files >= 10000 && world.stats.folders >= 1000);
check(`built in under 250 ms (${ms.toFixed(1)} ms)`, ms < 250);
const all = [];
W.walk(world.root, (n, rel) => all.push([n, rel]));
const files = all.filter(([n]) => !n.dir);
check('every date lies before the moment it was built for', all.every(([n]) => n.mtime <= NOW && (n.birth ?? 0) <= NOW), all.find(([n]) => n.mtime > NOW)?.[1]);
check('every folder is dated', all.filter(([n]) => n.dir).every(([n]) => n.mtime > 0));
const recent = files.filter(([n]) => n.mtime > NOW - 80 * MIN);
check(`a session under way: files changed in the last 80 minutes (${recent.length})`, recent.length >= 12 && recent.some(([, r]) => r.startsWith('Projects/tidepool-web/src/')));
const exportsDir = W.find(world.root, 'Photos/Exports');
const exported = exportsDir ? [...[...exportsDir.kids.values()][0].kids.values()] : [];
check(`last night's export: about forty photos within six minutes (${exported.length})`, exported.length >= 18
  && Math.max(...exported.map((n) => n.mtime)) - Math.min(...exported.map((n) => n.mtime)) <= 6 * MIN);
const inv = W.find(world.root, 'Downloads/invoice-2026-02.pdf');
const inv1 = W.find(world.root, 'Downloads/invoice-2026-02 (1).pdf');
const decoy = W.find(world.root, 'Downloads/statement-march.pdf');
check('true duplicates share size and content', inv.size === inv1.size && inv.s === inv1.s);
check('a decoy shares the size but not the content', decoy.size === inv.size && decoy.s !== inv.s);
check('the old laptop holds copies of photos kept in the library', files.some(([n, r]) => r.startsWith('Archive/Old laptop (2019)/Pictures/') && n.size > 3e6));
const empties = all.filter(([n]) => n.dir && !n.kids.size && !n.err);
check(`empty folders (${empties.length})`, empties.length >= 5);
check('a sealed folder', W.find(world.root, 'Private')?.err === 'EACCES');
const links = files.filter(([n]) => n.flags & W.FLAG_LINK);
check(`links, folders and files among them (${links.length})`, links.length >= 10 && links.every(([n]) => n.size === 0 && typeof n.link === 'string'));
check('a special file', files.some(([n]) => n.flags & W.FLAG_SPECIAL));
check('hidden files carry the hidden flag', files.filter(([n]) => n.name.startsWith('.')).every(([n]) => n.flags & W.FLAG_HIDDEN));
check('images carry a style, a size and a colour', files.filter(([n]) => n.img).every(([n]) => n.img.w > 0 && n.img.h > 0 && /^#[0-9a-f]{6}$/.test(n.img.color)));
check('zip files with interiors', files.filter(([n]) => n.arc && W.extOf(n.name) === 'zip').length >= 5);

/* ---------- contents ---------- */
section('Contents');
const readme = W.find(world.root, 'Projects/harbor-api/README.md');
check('a text file comes back at exactly its size', W.textOf(readme, 1e9).length === readme.size);
check('and cut to the limit asked for', W.textOf(readme, 100).length === Math.min(100, readme.size));
const texts = files.filter(([n]) => !W.isBinary(n.name) && !(n.flags & W.FLAG_LINK) && n.size > 0 && n.size < 64 * 1024).slice(0, 400);
check(`text kinds carry no NUL byte (${texts.length} files)`, texts.every(([n, r]) => !W.textOf(n, 4096, r).includes('\u0000')));
check('binary kinds read as binary', W.textOf(W.find(world.root, 'Downloads/fonts-pack.zip'), 64).includes('\u0000'));
check('the same file reads the same every time', W.textOf(readme, 4000) === W.textOf(readme, 4000));
const pkg = W.find(world.root, 'Projects/harbor-api/package.json');
check('package.json reads as one', W.textOf(pkg, 200).startsWith('{\n  "name": '));
const zip = W.find(world.root, 'Archive/Backups/old-site-2019.zip');
const inside = W.insideOf(zip);
const ids = new Set();
const parentsFirst = inside.records.every(([id, pid]) => {
  const ok = pid === -1 || ids.has(pid);
  ids.add(id);
  return ok;
});
check('a zip lists its entries, parents before children', inside.records[0][1] === -1 && parentsFirst && inside.records[0][2] === zip.name);
check('and its totals add up', inside.files === inside.records.reduce((a, r) => a + r[5].length / 4, 0) && inside.folders === inside.records.length - 1);

/* ---------- scan parity with the real scanner ---------- */
section('Scan parity');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'terrane-demo-test-'));
try {
  const sub = W.find(world.root, 'Projects/sandbox');
  const put = (node, abs, rel) => {
    if (node.dir) {
      fs.mkdirSync(abs, { recursive: true });
      for (const k of node.kids.values()) put(k, path.join(abs, k.name), `${rel}/${k.name}`);
      return;
    }
    fs.writeFileSync(abs, W.textOf(node, node.size, rel), 'latin1');
    fs.utimesSync(abs, node.mtime / 1000, node.mtime / 1000);
  };
  put(sub, path.join(tmp, 'sandbox'), 'Projects/sandbox');
  const svc = createDemoService({ now: NOW });
  const flat = (batches) => {
    const out = new Map();
    const names = new Map();
    for (const [id, pid, name, , err, packed] of batches.flat()) {
      const rel = pid === -1 ? '' : `${names.get(pid)}/${name}`.replace(/^\//, '');
      names.set(id, rel);
      const fl = [];
      for (let i = 0; i < packed.length; i += 4) fl.push(`${packed[i]}:${packed[i + 1]}:${packed[i + 3]}`);
      out.set(rel, `${err}|${fl.sort().join(',')}`);
    }
    return out;
  };
  for (const depth of [Infinity, 1]) {
    const real = [];
    for await (const b of scan(path.join(tmp, 'sandbox'), { depth })) real.push(b);
    const demo = (await svc.handle('GET', 'scan', { path: 'Projects/sandbox', ...(depth === 1 ? { depth: 1 } : {}) })).batches;
    const a = flat(real);
    const b = flat(demo);
    const same = a.size === b.size && [...a].every(([k, v]) => b.get(k) === v);
    check(`depth ${depth === 1 ? '1 (children stubbed)' : 'unlimited'}: the same folders, files, sizes and flags as server/scan.mjs (${a.size} folders)`, same,
      [...a].filter(([k, v]) => b.get(k) !== v).slice(0, 2).map(([k, v]) => `${k}: real ${v} demo ${b.get(k)}`).join(' | '));
  }
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

/* ---------- the browser's model on the demo's records ---------- */
section('The model');
{
  const svc = createDemoService({ now: NOW });
  const model = new Model(svc.world.root.name);
  const idMap = [];
  for (const batch of (await svc.handle('GET', 'scan', { path: '' })).batches) model.ingest(batch, idMap, model.root);
  check(`the model counts every file and byte (${model.root.fc} files)`, model.root.fc === world.stats.files && model.root.s === world.stats.bytes, `${model.root.fc} ${model.root.s}`);
  const survey = model.survey();
  const invoice = survey.dupGroups.find((g) => g.files.some((f) => f.n === 'invoice-2026-02.pdf'));
  check('the Survey groups the invoices and the decoy by size', invoice && invoice.files.length === 4);
  check(`empty folders (${survey.empty.length}), the sealed folder and links are surveyed`, survey.empty.length >= 5
    && survey.sealed.some((d) => d.n === 'Private') && survey.links.length === links.length);
  check(`the largest files are footage (${survey.largest[0]?.n})`, /\.(mov|zip|iso)$/i.test(survey.largest[0]?.n || ''));
}

/* ---------- the service ---------- */
section('Routes');
const events = [];
const svc = createDemoService({ now: NOW, emit: (m) => events.push(m) });
const h = (m, r, q, b) => svc.handle(m, r, q, b);
const info = (await h('GET', 'info')).json;
check('info names the world and says it is the demo', info.name === 'Studio' && info.watch === 'demo' && info.readOnly === false && info.sep === '/' && info.demo.files === world.stats.files);
let r = await h('GET', 'scan', { path: 'Nowhere' });
check('scanning a folder that is not there is ENOENT 404, as refreshDirs expects', r.status === 404 && r.json.code === 'ENOENT');
r = await h('GET', 'scan', { path: '../x' });
check('a path that climbs out is refused', r.status === 403 && r.json.code === 'EPATH');
r = await h('GET', 'scan', { path: '.terrane-trash' });
check('the holding area is not reachable by path', r.status === 403);
r = await h('GET', 'stat', { path: 'Projects/current' });
check('stat gives a link its text', r.json.link === 'tidepool-web' && r.json.abs === '/demo/Studio/Projects/current');
r = await h('GET', 'raw', { path: 'Projects/harbor-api/README.md', max: 64 });
check('raw cuts to max and says so', r.text.length === 64 && r.truncated === true);
r = await h('GET', 'raw', { path: 'Downloads/latest-build' });
check('raw through a dangling link is ENOENT', r.status === 404);
r = await h('GET', 'raw', { path: 'Photos/Albums/Best of the coast/' + [...W.find(svc.world.root, 'Photos/Albums/Best of the coast').kids.keys()][0] });
check('raw through a link to a photo gives the photo', r.status === 200 && !!r.image);
r = await h('GET', 'inside', { path: 'Downloads/fonts-pack.zip' });
check('inside lists a zip', r.status === 200 && r.json.format === 'zip' && r.json.files > 10);
r = await h('GET', 'inside', { path: 'Archive/Backups/mail-export-2020.7z' });
check('inside refuses a 7z in the service\'s words', r.status === 415 && r.json.code === 'EFORMAT' && r.json.format === '7z'
  && r.json.message === 'mail-export-2020.7z is a 7z archive. Terrane lists the contents of zip archives only.');
r = await h('GET', 'inside', { path: 'Archive/Discs/Install disc 2015.iso' });
check('and an iso as no archive it recognizes', r.status === 415 && r.json.code === 'ENOTARCHIVE');
r = await h('GET', 'journal');
check('the journal holds yesterday\'s removal, from an earlier session, with two held items', r.json.journal.length === 1 && r.json.journal[0].earlier && r.json.holding.length === 2);
r = await h('GET', 'thumbs');
check('the thumbnail index has a row per image', r.json.rows.length === files.filter(([n]) => n.img).length && r.json.rows.every((x) => x.length === 8 && x[3] === 'ok'));
r = await h('GET', 'nope');
check('an unknown route is EROUTE 404', r.status === 404 && r.json.code === 'EROUTE');

section('Operations');
const op = async (body) => (await h('POST', 'op', {}, body));
r = await op({ type: 'mkdir', parent: 'Documents', name: 'Plans' });
check('mkdir creates and names the folder', r.json.ok && r.json.created === 'Documents/Plans' && W.find(svc.world.root, 'Documents/Plans')?.dir);
r = await op({ type: 'mkdir', parent: 'Documents', name: 'Plans' });
check('mkdir refuses a name already there', r.status === 409 && r.json.code === 'EEXIST');
for (const bad of ['', '.', '..', '.terrane-trash', '.Terrane-Trash', 'a/b', 'a\\b']) {
  r = await op({ type: 'mkdir', parent: '', name: bad });
  check(`the name ${JSON.stringify(bad)} is refused`, r.status === 400 && r.json.code === 'ENAME');
}
r = await op({ type: 'rename', path: 'Documents/Plans', name: 'Plans 2027' });
check('rename', r.json.renamed === 'Documents/Plans 2027');
r = await op({ type: 'rename', path: 'Documents/Plans 2027', name: 'Plans 2027' });
check('renaming to the same name changes nothing and is not journaled', r.json.label === 'Name unchanged' && r.json.undoable === false);
r = await op({ type: 'move', paths: ['Downloads/fonts-pack.zip'], dest: 'Downloads' });
check('a move into the folder it is in is ESAME', r.json.code === 'ESAME');
r = await op({ type: 'move', paths: ['Projects'], dest: 'Projects/sandbox' });
check('a folder into itself is ELOOP', r.json.code === 'ELOOP');
r = await op({ type: 'copy', paths: ['Downloads/invoice-2026-02.pdf'], dest: 'Downloads' });
check('a copy beside itself is named as the service names it', r.json.results?.[0] === 'Downloads/invoice-2026-02 copy.pdf');
r = await op({ type: 'copy', paths: ['Downloads/invoice-2026-02.pdf'], dest: 'Downloads' });
check('and the next one "copy 2"', r.json.results?.[0] === 'Downloads/invoice-2026-02 copy 2.pdf');
r = await op({ type: 'copy', paths: ['Downloads/invoice-2026-02.pdf'], dest: 'Documents/Plans 2027' });
r = await op({ type: 'move', paths: ['Downloads/invoice-2026-02.pdf'], dest: 'Documents/Plans 2027' });
check('a move onto a taken name is EEXIST 409 and changes nothing', r.status === 409 && W.find(svc.world.root, 'Downloads/invoice-2026-02.pdf'));
r = await op({ type: 'move', paths: ['Downloads/invoice-2026-02.pdf'], dest: 'Documents/Plans 2027', onConflict: 'keepBoth' });
check('"keep both" moves it under a free name', r.json.results?.[0] === 'Documents/Plans 2027/invoice-2026-02 copy.pdf');
r = await op({ type: 'trash', paths: ['Documents/Plans 2027', 'Documents/Plans 2027/invoice-2026-02.pdf'] });
check('a removal of a folder and something inside it holds the folder once', r.json.ok && /1 item/.test(r.json.label));
r = await h('GET', 'journal');
check('the holding area shows it', r.json.holding.some((x) => x.origin === 'Documents/Plans 2027'));
r = await h('POST', 'undo');
check('undo restores the removal', r.json.ok && W.find(svc.world.root, 'Documents/Plans 2027'));
r = await h('POST', 'undo');
check('undo carries a move back and says where', r.json.moved?.[0]?.[1] === 'Downloads/invoice-2026-02.pdf' && W.find(svc.world.root, 'Downloads/invoice-2026-02.pdf'));
// The tree changes underneath, outside Terrane: undo refuses.
await op({ type: 'mkdir', parent: 'Archive', name: 'Spare' });
await op({ type: 'move', paths: ['Archive/Spare'], dest: 'Documents' });
const outside = (name) => ({ name, dir: true, kids: new Map(), mtime: NOW, birth: NOW, err: null });
svc.lookup('Archive').kids.set('Spare', outside('Spare'));
r = await h('POST', 'undo');
check('undo of a move refuses when the original place is taken again', r.status === 409 && r.json.code === 'EEXIST', JSON.stringify(r.json));
svc.lookup('Archive').kids.delete('Spare');
r = await h('POST', 'undo');
check('and carries it back once the place is free', r.json.ok && W.find(svc.world.root, 'Archive/Spare') && !W.find(svc.world.root, 'Documents/Spare'));
await op({ type: 'mkdir', parent: 'Archive', name: 'Empty' });
svc.lookup('Archive/Empty').kids.set('note.txt', { name: 'note.txt', dir: false, size: 3, mtime: NOW, birth: NOW, flags: 0, s: 1 });
r = await h('POST', 'undo');
check('undo of a created folder that has since filled up leaves it in place', r.status === 409 && r.json.code === 'ENOTEMPTY' && W.find(svc.world.root, 'Archive/Empty'));
r = await h('POST', 'restore', {}, { ids: ['nope'] });
check('restore of an unknown id is ENOENT 404', r.status === 404);
const held = (await h('GET', 'journal')).json.holding;
r = await h('POST', 'restore', {}, { ids: [held[0].id] });
check('restore puts a held item back', r.json.ok && W.find(svc.world.root, held[0].origin));
r = await h('POST', 'purge');
check('purge deletes what is still held', r.json.ok && (await h('GET', 'journal')).json.holding.length === 0);
r = await op({ type: 'open', path: 'Downloads/invoice-2026-02.pdf' });
check('Open refuses with an explanation', r.status === 501 && /demo world/.test(r.json.message));
r = await op({ type: 'reveal', path: 'Downloads' });
check('Reveal refuses with an explanation', r.status === 501 && /file manager/.test(r.json.message));
r = await op({ type: 'renames', items: [{ path: 'Downloads/fonts-pack.zip', name: 'fonts.zip' }, { path: 'Downloads/sample-pack-vol2.rar', name: 'samples.rar' }] });
check('a batch rename is one journal entry and names its pairs', r.json.ok && r.json.label === 'Renamed 2 items' && r.json.renamed.length === 2 && W.find(svc.world.root, 'Downloads/fonts.zip'));
r = await h('POST', 'undo');
check('and one undo puts both names back', r.json.ok && W.find(svc.world.root, 'Downloads/fonts-pack.zip') && W.find(svc.world.root, 'Downloads/sample-pack-vol2.rar'));
r = await op({ type: 'renames', items: [{ path: 'Downloads/fonts-pack.zip', name: 'a.zip' }, { path: 'Downloads/sample-pack-vol2.rar', name: 'a.zip' }] });
check('two items given one name are refused', r.status === 409 && /would both be named/.test(r.json.message));
r = await op({ type: 'renames', items: [{ path: 'Downloads/fonts-pack.zip', name: 'sample-pack-vol2.rar' }, { path: 'Downloads/sample-pack-vol2.rar', name: 'fonts-pack.zip' }] });
check('a swap is refused', r.status === 409 && /another item in this batch/.test(r.json.message));
r = await op({ type: 'renames', items: [{ path: 'Documents', name: 'Docs' }, { path: 'Documents/Recipes', name: 'Food' }] });
check('an item inside another renamed item is ENEST', r.json.code === 'ENEST');
r = await op({ type: 'renames', items: [{ path: 'Downloads/fonts-pack.zip', name: 'fonts-pack.zip' }] });
check('a batch with nothing to change says so', r.json.label === 'Names unchanged' && r.json.undoable === false);
r = await h('POST', 'terminal', {}, { path: 'Projects' });
check('a terminal refuses with an explanation', r.status === 501 && /terminal/.test(r.json.message));
r = await h('GET', 'warm');
check('there is no warm start in the demo', r.status === 404 && r.json.code === 'ENOWARM');
r = await op({ type: 'format-disk' });
check('an unknown operation is EOP', r.json.code === 'EOP');

section('Jobs');
events.length = 0;
r = await op({ type: 'copy', paths: ['Video/Projects/Tidelines (short film)/Footage'], dest: 'Archive', job: 'cp1' });
const phases = events.filter((e) => e.id === 'cp1').map((e) => e.phase);
check(`a large copy reports queued, counting, copying and end (${[...new Set(phases)].join(', ')})`,
  phases[0] === 'queued' && phases.includes('counting') && phases.includes('copying') && phases.at(-1) === 'end');
const last = events.filter((e) => e.id === 'cp1').at(-1);
check('and finishes with every byte and item counted', last.outcome === 'done' && last.bytes[0] === last.bytes[1] && last.items[0] === 1);
events.length = 0;
const pending = op({ type: 'copy', paths: ['Video/Projects/Tidelines (short film)/Footage/A-cam', 'Video/Projects/Tidelines (short film)/Footage/B-cam', 'Video/Family'], dest: 'Documents', job: 'cp2' });
await new Promise((res) => {
  const t = setInterval(() => {
    const e = events.filter((x) => x.id === 'cp2').at(-1);
    if (e && e.items[0] >= 1) {
      clearInterval(t);
      res();
    }
  }, 20);
});
await h('POST', 'cancel', {}, { job: 'cp2' });
r = await pending;
check('a copy cancelled part way keeps what it finished and says so', r.json.cancelled && /^Cancelled after copying 1 of 3 items/.test(r.json.label)
  && W.find(svc.world.root, 'Documents/A-cam') && !W.find(svc.world.root, 'Documents/Family'), r.json.label);
r = await h('POST', 'cancel', {}, { job: 'cp2' });
check('cancelling a finished job is ENOJOB', r.json.code === 'ENOJOB');

section('Hashes and arrivals');
r = await h('POST', 'hash', {}, { paths: ['Downloads/invoice-2026-02.pdf', 'Downloads/invoice-2026-02 (1).pdf', 'Downloads/statement-march.pdf', 'Video', 'nope'] });
const [a, b, c, d, e] = r.json.results;
check('true duplicates hash alike, the decoy does not', a.hash === b.hash && a.hash !== c.hash && a.mode === 'full');
check('a folder and a missing path report errors', d.error === 'EISDIR' && e.error === 'ENOENT');
const big = (await h('POST', 'hash', {}, { paths: ['Video/Projects/Tidelines (short film)/Renders/Tidelines_v6_final.mp4', 'Downloads/tidelines-v6-share.mp4'] })).json.results;
check('large files are sampled, and a shared copy of a render matches it', big[0].mode === 'sampled' && big[0].hash === big[1].hash);
events.length = 0;
check('a download arrives and the change is announced', svc.arrive() && events.at(-1)?.type === 'change' && events.at(-1).dirs[0] === 'Downloads');
check('only once', svc.arrive() === false);

section('Regions');
{
  const told = [];
  const rs = createDemoService({ now: NOW, clock: () => NOW, emit: (m) => told.push(m) });
  const rh = (r, q) => rs.handle('GET', r, q);
  const q = (o) => new URLSearchParams(o);
  const info = (await rh('info')).json;
  check('info carries regions: the threshold, the entries, generation 1, ready', info.regions.threshold === C.REGION_THRESHOLD
    && info.regions.entries === world.stats.folders + world.stats.files && info.regions.v === 1 && info.regions.state === 'ready', JSON.stringify(info.regions));
  check('a demo made with threshold 0 says so', createDemoService({ now: NOW, threshold: 0 }).info().regions.threshold === 0);
  const tree = (await rh('tree')).json;
  check('GET tree: ready, the world\'s entries, the root record', tree.state === 'ready' && tree.entries === info.regions.entries
    && tree.root.length === C.D_LEN && tree.root[C.D_FC] === world.stats.files);
  const batches = (await rs.handle('GET', 'scan', { path: '' })).batches;
  const local = C.treeFrom(batches, { name: rs.world.root.name, anchor: tree.anchor });
  let r = await rh('region', q({ v: 1, ids: '0' }));
  check('the root region equals a column tree built from the demo\'s records', r.status === 200 && JSON.stringify(r.json.regions[0]) === JSON.stringify(local.region(0)));
  const model = new Model(rs.world.root.name);
  const idMap = [];
  for (const b of batches) model.ingest(b, idMap, model.root);
  const ages = buildAgeTable(model.root, tree.anchor);
  const nodes = [];
  const stack = [model.root];
  while (stack.length) {
    const n = stack.pop();
    nodes.push(n);
    for (const c of n.c) if (c.d) stack.push(c);
  }
  const ids = nodes.map((n) => local.idOf(relPath(n)));
  const got = new Map();
  for (let i = 0; i < ids.length; i += 64) {
    const part = ids.slice(i, i + 64);
    const a = await rh('region', q({ v: 1, ids: part.join(',') }));
    for (const reg of a.json.regions) got.set(reg.id, reg.self);
    for (const id of a.json.more) got.set(id, (await rh('region', q({ v: 1, ids: String(id) }))).json.regions[0].self);
  }
  const bad = [];
  nodes.forEach((n, i) => {
    const D = got.get(ids[i]);
    const want = [n.s, n.fc, n.dc, n.h, n.mm, n.c.length, n.e || 0, ...n.ks];
    const have = D && [D[C.D_S], D[C.D_FC], D[C.D_DC], D[C.D_H], D[C.D_MM], D[C.D_CN], D[C.D_ERR], ...D.slice(C.D_KS, C.D_KS + 9)];
    let ok = !!D && JSON.stringify(want) === JSON.stringify(have) && D[C.D_MD] === ages.medianStep(n);
    for (let k = 0; ok && k < STEPS; k++) ok = D[C.D_AB + k] === ages.changedBytes(n, k) && D[C.D_AF + k] === ages.changedFiles(n, k);
    if (!ok) bad.push(relPath(n) || '(root)');
  });
  check(`every folder's record equals the browser model's node and its age row (${nodes.length} folders)`, bad.length === 0, bad.slice(0, 3).join(', '));
  r = await rh('region', q({ v: 1, path: 'Projects/harbor-api/README.md', skip: 1 }));
  check('a path\'s chain with skip leaves out the root and ends at the file\'s folder', r.status === 200 && r.json.regions.length === 2
    && r.json.regions[0].self[C.D_NAME] === 'Projects' && r.json.regions[1].f.includes('README.md') && r.json.target.name === 'README.md' && r.json.target.dir === false);
  const dcBefore = local.encodeD(local.idOf('Documents'))[C.D_DC];
  await rs.handle('POST', 'op', {}, { type: 'mkdir', parent: 'Documents', name: 'Plans' });
  r = await rh('region', q({ v: 1, fresh: 1, paths: JSON.stringify(['Documents']) }));
  check('a fresh read after a new folder shows it', r.status === 200 && r.json.regions[0].d.some((d) => d[C.D_NAME] === 'Plans') && r.json.regions[0].self[C.D_DC] === dcBefore + 1);
  check('and up carries the parent\'s new count', r.json.up.length === 1 && r.json.up[0][C.D_DC] === tree.root[C.D_DC] + 1);
  await rs.arrive();
  check('once the tree in columns is built, an arrival is read into it and the change says so (kept)', told.at(-1)?.type === 'change' && told.at(-1).kept === true && told.at(-1).dirs[0] === 'Downloads');
  r = await rh('region', q({ v: 1, fresh: 1, kept: 1, paths: JSON.stringify(['Downloads']) }));
  check('a kept fresh read answers it from the tree', r.status === 200 && r.json.regions[0].f.includes('tide-tables-2027.pdf'));
  r = await rh('region', q({ v: 1, fresh: 1, paths: JSON.stringify(['Downloads', 'Gone/away']) }));
  check('an arrival is read in, and a path not in the tree is reported gone', r.json.regions[0].f.includes('tide-tables-2027.pdf') && JSON.stringify(r.json.gone) === '["Gone/away"]');
  const dl = local.idOf('Downloads');
  r = await rh('region', q([['v', '1'], ['fresh', '1'], ['kept', '1'], ['paths', '["Downloads"]'], ['with', `${dl}:tide-tables-2027.pdf`]]));
  check('a fresh read takes with= names, as the service does', r.status === 200 && r.json.regions[0].f.includes('tide-tables-2027.pdf'));
  r = await rh('region', q([['v', '1'], ['ids', `0,${dl}`], ['with', `${dl}:..`]]));
  check('a with= name that climbs is EBADREQ 400', r.status === 400 && r.json.code === 'EBADREQ');
  r = await rh('region', q({ v: 2, ids: '0' }));
  check('a stale generation is ESTALE 409 in the service\'s words', r.status === 409 && r.json.code === 'ESTALE' && r.json.message === 'The directory was surveyed again; its regions are read afresh.');
  r = await rh('region', q({ v: 1, ids: Array.from({ length: 65 }, (_, i) => i).join(',') }));
  check('more than 64 ids are ETOOMANY 413', r.status === 413 && r.json.code === 'ETOOMANY');
  r = await rh('region', q({ v: 1, path: 'Projects/nope' }));
  check('a path not in the tree is ENOENT 404, naming the deepest folder found', r.status === 404 && r.json.code === 'ENOENT' && r.json.deepest === 'Projects');
  r = await rh('region', q([['v', '1'], ['ids', '0'], ['with', '0:a/b']]));
  check('a name with a slash is EBADREQ 400', r.status === 400 && r.json.code === 'EBADREQ');
}

section('The whole-tree questions');
{
  const rs = createDemoService({ now: NOW, clock: () => NOW, regions: true });
  check('createDemoService({ regions: true }) draws every tree in regions: threshold 0', rs.info().regions.threshold === 0);
  const ask = async (route, o) => rs.handle('GET', route, new URLSearchParams({ v: '1', ...o }));
  const model = new Model(rs.world.root.name);
  const idMap = [];
  for (const b of (await rs.handle('GET', 'scan', { path: '' })).batches) model.ingest(b, idMap, model.root);
  const realNow = Date.now;
  Date.now = () => NOW;
  try {
    const sv = model.survey();
    const sess = R.sessions(model.root);
    const ext = {
      is: { benchmark: () => false },
      prefix: { session: (v) => R.sessionPredicate(sess, /^\d+$/.test(v) ? Number(v) : 0), in: (_v, raw) => {
        const dir = model.find(raw.trim().replace(/^\/+/, ''));
        return dir?.d ? (n) => n !== dir && isAncestor(dir, n) : () => false;
      } },
    };
    const queries = ['invoice', '*.jpg', 'kind:video,audio', 'ext:pdf >100kb', 'is:empty', 'is:hidden', 'is:link', 'is:sealed', 'is:dup', 'newer:30d', 'older:1y', 'in:Projects', 'session:1', '"harbor"'];
    const bad = [];
    for (const text of queries) {
      const s = runSearch(model, parseQuery(text, ext));
      const a = (await ask('find', { q: text })).json;
      const b = (await ask('find', { q: text, sort: 'date', dir: '1' })).json;
      const bySize = s.list.slice(0, 5000).map(relPath);
      const byDate = [...s.list].sort((x, y) => ((x.d ? x.mm : x.m) - (y.d ? y.mm : y.m))).slice(0, 5000).map(relPath);
      if (a.total !== s.set.size || a.bytes !== s.bytes || JSON.stringify(a.hits.map((h) => h[0])) !== JSON.stringify(bySize) || JSON.stringify(b.hits.map((h) => h[0])) !== JSON.stringify(byDate)) bad.push(`${text}: ${a.total}/${s.set.size}`);
    }
    check(`find over the demo world equals the page's runSearch for ${queries.length} queries: totals, bytes and the order by size and by date`, bad.length === 0, bad.join(' | '));
    // Pages of a search: from, as the service answers it.
    const every = runSearch(model, parseQuery('*', ext)).list.map(relPath);
    const p1 = (await ask('find', { q: '*', limit: '3000' })).json;
    const p2 = (await ask('find', { q: '*', limit: '3000', from: '3000', qid: p1.qid })).json;
    check(`find turns page by page (from): the second page of ${p2.total} continues the first, in the page's own order`,
      p2.from === 3000 && p2.total === every.length && JSON.stringify(p1.hits.concat(p2.hits).map((h) => h[0])) === JSON.stringify(every.slice(0, 6000)));
    const a = (await ask('survey', {})).json;
    check(`survey equals model.survey(): largest, empty, sealed, links and ${a.dupGroups.length} candidate groups`,
      JSON.stringify(a.largest.map((r) => r[0])) === JSON.stringify(sv.largest.map(relPath))
      && a.empty.count === sv.empty.length && a.sealed.count === sv.sealed.length && a.links.count === sv.links.length
      && JSON.stringify(a.dupGroups.map((g) => [g.size, g.count, g.waste])) === JSON.stringify(sv.dupGroups.map((g) => [g.size, g.files.length, g.waste])));
    const se = (await ask('sessions', {})).json;
    check(`sessions equal relations.sessions (${se.count} sessions, ${se.considered} files considered)`, se.count === sess.length && se.considered === sess.considered && se.skipped === sess.skipped
      && se.list.every((r, i) => r.start === sess[i].start && r.end === sess[i].end && r.count === sess[i].count && r.bytes === sess[i].bytes && r.bulk === sess[i].bulk));
    const pl = (await ask('places', { q: 'harbor', limit: '5' })).json;
    check(`places ranks the demo's names (${pl.places.map((p) => p[0]).join(', ')})`, pl.places.length > 0 && /harbor/i.test(pl.places[0][0]));
    const f = (await ask('find', { q: 'invoice' })).json;
    const mk = (await ask('marks', { q: f.qid, ids: '0' })).json;
    check('marks answer for a search the demo keeps', mk.marks.length === 1 && mk.marks[0].w === f.total);
  } finally {
    Date.now = realNow;
  }
  const c = await rs.handle('GET', 'check', {});
  check('GET check is refused: ENOWARM, with the demo\'s sentence', c.status === 404 && c.json.code === 'ENOWARM'
    && c.json.message === 'The demo world is built afresh on every visit, so there is no tree kept from an earlier session to check.', JSON.stringify(c.json));
  const st = await rs.handle('GET', 'find', new URLSearchParams({ v: '2', q: 'x' }));
  check('a question for a wrong generation is ESTALE 409', st.status === 409 && st.json.code === 'ESTALE');
}

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
