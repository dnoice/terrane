#!/usr/bin/env node
/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Demo Test (Terrane Edition - v1.0)
 *     - File Name: demo-test.mjs
 *     - Relative Path: tools/demo-test.mjs
 *     - Artifact Type: test
 *     - Version: 1.0.0
 *     - Date: 11/13/2026
 *     - Update: Friday, November 13, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
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
 *
 * ✒ Usage Instructions:
 *     node tools/demo-test.mjs
 *     npm test runs it after the interiors test.
 *
 * ✒ Other Important Information:
 *     - Dependencies: Node.js 22+; web/js/demo-world.js,
 *       web/js/demo-service.js, web/js/model.js, server/scan.mjs
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
const { Model } = await import(new URL('../web/js/model.js', import.meta.url).href);
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

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
