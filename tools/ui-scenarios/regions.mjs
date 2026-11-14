/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Regions Scenario (Terrane Edition - v1.0)
 *     - File Name: regions.mjs
 *     - Relative Path: tools/ui-scenarios/regions.mjs
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
 *     Drives the page in region mode on the fixture: a service told to
 *     draw every tree in regions (--region-threshold 0), so the page holds
 *     only the folders it asked for, and a second service whose threshold
 *     a whole survey passes, so the page switches to regions part way.
 *     Both run with and without WebGL.
 *
 * ✒ Key Features:
 *     - regions (write, threshold 0): no whole survey asked for; the
 *       overview drawn; the root's Contents equal the disk's top level;
 *       three folders down the fixture's chain by the ledger and Enter,
 *       each region asked for and listed, the inspector's figures equal
 *       to the whole tree's on the read-only service, the location
 *       counted as reached when it settles in or below a folder
 *     - Bytes by last change, the Age lens's typical-age line and the time
 *       scrub's Since section of one folder, equal in both modes
 *     - B then a reload: the benchmark is found again and reads "no change"
 *     - F2 renames a file: listed again under its name, still selected,
 *       the sizes above unchanged; Ctrl+Z puts it back; N makes a folder
 *     - A budget of 400 entries: six folders visited, the entries held
 *       kept near it, the folder you are in still held
 *     - Rescan all: a new generation, the folder you are in kept by path
 *     - Search on the service: Findings holds every match of notes (the
 *       disk's count) as refs; Enter reveals the deepest as a node in its
 *       ref's place; the Changed key asks again; Select all selects them
 *       and says its sentence; Export CSV says its row count
 *     - session:1 and, with WebGL, its traverse; Changed with it for one
 *       of its files; Ctrl+K finds a folder among the service's places
 *     - The Survey from the service: Largest files reveals; the quick
 *       searches carry its counts; Verify confirms the fixture's three
 *       copies; Keep newest moves two and Ctrl+Z puts them back
 *     - regions-switch (read-only, threshold 1,000): the whole survey
 *       begun, stopped, the tree asked for with build=1, the page drawn in
 *       regions and the status line saying so
 *
 * ✒ Usage Instructions:
 *     node tools/ui-check.mjs regions regions-switch --no-shots --port 5230
 *     The write scenario gets its own fixture and service (PORT+1); the
 *     read-only one a service of its own on the shared fixture (PORT+2).
 *
 * ✒ Other Important Information:
 *     - Dependencies: tools/ui-check.mjs (the context t, the regions field);
 *       the fixture's manifest (chain, strata)
 *     - Compatible platforms: Node.js 22.5+
 * ----------------------------------------------------------------------------
 */

import fs from 'node:fs';

/** Folders and files under root, the root counted, links not followed, the holding area left out. */
function entriesOnDisk(root) {
  let n = 1;
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
      if (dir === root && d.name === '.terrane-trash') continue;
      n++;
      if (d.isDirectory()) stack.push(`${dir}/${d.name}`);
    }
  }
  return n;
}

/** Folders and files under root whose names hold term, in any case: what a search for it matches. */
function matchesOnDisk(root, term) {
  let n = 0;
  const low = term.toLowerCase();
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
      if (dir === root && d.name === '.terrane-trash') continue;
      if (d.name.toLowerCase().includes(low)) n++;
      if (d.isDirectory()) stack.push(`${dir}/${d.name}`);
    }
  }
  return n;
}

/** Verify by content from the Survey tab, by keyboard (as many.mjs's dupes does); resolves once the copies with rel are verified. */
async function verifyIn(t, rel) {
  const open = await t.eval(() => {
    const s = document.querySelector('#ledger-rich details:has(.group-head) > summary');
    s.focus();
    return s.parentElement.open;
  });
  if (!open) await t.key('Enter');
  await t.waitFor(() => document.querySelector('#ledger-rich details:has(.group-head)')?.open, { what: 'Duplicate candidates open' });
  await t.eval(() => {
    const d = document.querySelector('#ledger-rich details:has(.group-head)');
    if (!d.contains(document.activeElement)) d.querySelector('summary').focus();
    return true;
  });
  await t.tabTo('#ledger-rich details:has(.group-head) .actions button:first-child', { max: 6 });
  await t.key('Enter');
  return t.waitFor((T, r) => {
    const g = T.S.survey.dupGroups.find((x) => x.files.some((f) => T.api.relPath(f) === r));
    return g?.verified && { mode: g.mode, n: g.files.length, waste: g.waste, hash: typeof g.hash === 'string' };
  }, { args: [rel], timeout: 20000, what: 'the copies verified' });
}

/**
 * What the inspector shows now: a selected folder's Size, Contains and
 * Levels (its dates are each fixture's own), its strata section and its
 * Since section.
 */
function inspectorText() {
  const body = document.getElementById('inspector-body');
  const pick = (sel) => [...body.querySelectorAll(sel)].map((e) => e.textContent.replace(/\s+/g, ' ').trim()).join(' | ');
  const facts = [...body.querySelectorAll('dl.facts:not(.since) > div')]
    .filter((d) => ['Size', 'Contains', 'Levels'].includes(d.querySelector('dt')?.textContent))
    .map((d) => d.textContent.replace(/\s+/g, ' ').trim()).join(' | ');
  return { facts, strata: pick('section.strata'), since: pick('.section-title, dl.since, .since-where, .since-none') };
}

/** Selects the node at a path, found first when the page holds regions. */
function selectAt(T, rel) {
  T.api.resolve(rel).then((n) => T.api.select(n));
  return true;
}

/** The hover lines of a folder as a closed mass, under the Age lens. */
function ageLines(T, rel) {
  T.api.setLens('age');
  const node = T.S.model.find(rel);
  const out = [];
  for (const p of T.api.TIP_LINES) {
    const r = p.lines(node, { i: -1, type: 2, L: T.S.layout });
    if (r) out.push(...[r].flat().filter(Boolean));
  }
  T.api.setLens('kind');
  return out;
}

/**
 * The same figures in whichever mode the page is in: the chain's three
 * folders selected, and one folder's strata, age line and Since section
 * at a fixed step of the time scrub.
 */
async function figuresOf(t, chain, strataRel) {
  const out = { chain: [], strata: null, age: null, since: null };
  for (const rel of chain) {
    await t.app(selectAt, rel);
    await t.waitFor((T, r) => T.S.primary && T.api.relPath(T.S.primary) === r && !T.S.primary.u, { args: [rel], timeout: 20000, what: `${rel} selected` });
    await t.settle();
    out.chain.push((await t.eval(inspectorText)).facts);
  }
  await t.app(selectAt, strataRel);
  await t.waitFor((T, r) => T.S.primary && T.api.relPath(T.S.primary) === r, { args: [strataRel], timeout: 20000, what: `${strataRel} selected` });
  await t.settle();
  out.strata = (await t.eval(inspectorText)).strata;
  out.age = await t.app(ageLines, strataRel);
  // The time scrub at a fixed step: the earliest date, then four later.
  await t.eval(() => document.getElementById('view').focus());
  await t.key('t');
  await t.waitFor((T) => !!T.S.time, { what: 'the time view' });
  await t.key('<');
  for (let i = 0; i < 4; i++) await t.key('.');
  await t.settle();
  out.step = await t.app((T) => T.S.time?.k ?? null);
  out.since = (await t.eval(inspectorText)).since;
  await t.key('Escape');
  await t.waitFor((T) => !T.S.time, { what: 'the present again' });
  return out;
}

export default [
  {
    name: 'regions',
    title: 'Regions: the page holds the parts of the tree the service sends',
    data: 'fixture',
    write: true,
    regions: 0,
    timeout: 360000,
    async run(t) {
      const m = t.manifest;
      const first = await t.app((T) => ({
        regions: !!T.S.regions, model: !!T.S.model.regions, v: T.S.regions?.v ?? null, entries: T.S.regions?.entries ?? null,
        boxes: T.S.layout?.n ?? 0, rootHeld: T.S.model.root.u === false, ages: T.S.ages === T.S.regions?.ages,
      }));
      t.check('the page draws in regions: the client is set, the model holds regions, the age table is the regions\'', first.regions && first.model && first.rootHeld && first.ages, JSON.stringify(first));
      const scans = t.requests().filter((r) => {
        if (r.path !== '/api/scan') return false;
        const q = new URL(r.url).searchParams;
        return (q.get('path') || '') === '' && !q.get('depth');
      });
      t.check('no whole survey was asked for: no /api/scan of the root without a depth', scans.length === 0, `${scans.length} asked`);
      t.check(`the tree's entries are the fixture's on disk, the root counted (${first.entries})`, first.entries === entriesOnDisk(t.root), `${entriesOnDisk(t.root)} on disk`);
      if (t.gl) t.check(`the overview drew boxes (${first.boxes})`, first.boxes > 10);

      // The root's Contents are the disk's top level.
      const disk = fs.readdirSync(t.root).filter((n) => n !== '.terrane-trash').sort();
      const listed = await t.app((T) => T.list.items.map((n) => n.n).sort());
      t.check(`the root's Contents equal the disk's top level (${disk.length} entries)`, JSON.stringify(listed) === JSON.stringify(disk), `${listed.length} listed`);

      // Three folders down the fixture's chain, by the ledger and Enter.
      // With WebGL the location follows the eye, which can settle a level
      // further in (each link of the chain is almost all of its parent):
      // a folder is reached when you are in it or below it.
      const chain = m.chain.dirs.slice(0, 3);
      const requests0 = await t.app((T) => T.S.regions.stats.requests);
      await t.eval(() => document.getElementById('ledger-list').focus());
      let walked = true;
      const within = (T, r) => {
        const f = T.api.relPath(T.S.focus);
        return f === r || f.startsWith(`${r}/`);
      };
      for (const rel of chain) {
        if (!(await t.app(within, rel))) {
          const ok = await t.app((T, r) => T.api.cursorTo(T.S.focus.c.find((c) => c.d && T.api.relPath(c) === r)), rel);
          if (!ok) {
            walked = false;
            break;
          }
          await t.key('Enter');
        }
        await t.waitFor((T, r) => {
          const f = T.api.relPath(T.S.focus);
          return (f === r || f.startsWith(`${r}/`)) && !T.S.focus.u && T.list.items.length === T.api.kids(T.S.focus);
        }, { args: [rel], timeout: 20000, what: `the folder ${rel} listed` });
        if (!(await t.app((T, r) => T.S.model.find(r)?.u === false, rel))) walked = false;
        await t.settle();
        await t.eval(() => document.getElementById('ledger-list').focus());
      }
      const requests1 = await t.app((T) => T.S.regions.stats.requests);
      t.check(`Enter goes three folders down the chain, each region asked for, held and listed (${chain.join(' > ')}, ${requests1 - requests0} requests)`, walked && requests1 > requests0);

      // B, then a reload: the benchmark is found again in region mode.
      await t.app(selectAt, chain[2]);
      await t.waitFor((T, r) => T.S.primary && T.api.relPath(T.S.primary) === r, { args: [chain[2]], what: `${chain[2]} selected` });
      await t.eval(() => document.getElementById('view').focus());
      await t.key('b');
      await t.waitFor((T) => T.places?.benchmarks.length === 1 && !!T.places.benchmarks[0].node, { timeout: 15000, what: 'the benchmark set' });
      await t.reload();
      await t.waitFor((T) => T.places?.resolved && T.places.benchmarks.length === 1 && !!T.places.benchmarks[0].node, { timeout: 20000, what: 'the benchmark found after the reload' });
      const bench = await t.app((T) => {
        const b = T.places.benchmarks[0];
        T.S.tab = 'places';
        T.api.drawLedger();
        return { rel: b.rel, held: b.node.u === false, changed: T.places.summary(b).changed, tab: document.getElementById('ledger-rich').textContent };
      });
      t.check(`after a reload the benchmark's folder is found and held (${bench.rel})`, bench.rel === chain[2] && bench.held, JSON.stringify(bench).slice(0, 200));
      t.check('the Places tab says nothing changed', bench.changed === false && /no change/.test(bench.tab), bench.tab.slice(0, 200));
      await t.app((T) => {
        T.places.clear();
        T.places.flush();
        T.S.tab = 'contents';
        T.api.drawLedger();
        return true;
      });

      // The figures in region mode, then the same on the read-only service.
      const here = await figuresOf(t, chain, m.strata.old);
      await t.goto(t.readOnlyUrl);
      const whole = await figuresOf(t, chain, m.strata.old);
      const wholeMode = await t.app((T) => !T.S.regions);
      t.check('the read-only service draws the whole tree', wholeMode);
      t.check('the inspector\'s size and counts of the chain\'s three folders equal the whole tree\'s', JSON.stringify(here.chain) === JSON.stringify(whole.chain) && here.chain.every((x) => /\d/.test(x)), JSON.stringify([here.chain, whole.chain]).slice(0, 400));
      t.check('Bytes by last change of a folder is the same in both modes', here.strata && here.strata === whole.strata, JSON.stringify([here.strata, whole.strata]).slice(0, 400));
      t.check('the Age lens\'s typical-age hover line is the same in both modes', here.age.length > 0 && JSON.stringify(here.age) === JSON.stringify(whole.age), JSON.stringify([here.age, whole.age]).slice(0, 400));
      t.check(`the time scrub's Since section is the same in both modes (step ${here.step})`, here.step === whole.step && /Since/.test(here.since) && here.since === whole.since, JSON.stringify([here.since, whole.since]).slice(0, 500));
      await t.goto(t.url);

      // F2 renames a file in the deepest folder walked; Undo puts it back.
      const dir = chain[2];
      const file = `${dir}/notes-03.txt`;
      await t.app(selectAt, file);
      await t.waitFor((T, f) => T.S.primary && T.api.relPath(T.S.primary) === f, { args: [file], timeout: 20000, what: `${file} selected` });
      await t.settle();
      // The folder that holds it and every folder above, by path, in both readings.
      const chainSizes = (T, d) => { const out = []; for (let a = T.S.model.find(d); a; a = a.p) out.push(a.s); return out; };
      const sizesBefore = await t.app(chainSizes, dir);
      await t.eval(() => document.getElementById('view').focus());
      await t.key('F2');
      await t.waitFor(() => document.getElementById('dialog').open && document.activeElement?.name === 'name', { what: 'the rename dialog' });
      await t.type('renamed-03');
      await t.key('Enter');
      const renamed = `${dir}/renamed-03.txt`;
      await t.waitFor((T, r) => T.S.primary && T.api.relPath(T.S.primary) === r, { args: [renamed], timeout: 20000, what: 'the renamed file selected' });
      const afterRename = await t.app((T, d) => {
        const folder = T.S.model.find(d);
        const out = [];
        for (let a = folder; a; a = a.p) out.push(a.s);
        return { names: folder.c.map((c) => c.n), held: folder.u === false, sizes: out };
      }, dir);
      t.check('F2: the region is read again and lists the new name, not the old, and the file stays selected', afterRename.held && afterRename.names.includes('renamed-03.txt') && !afterRename.names.includes('notes-03.txt'));
      t.check('F2: the sizes of the folder and every folder above it are unchanged', JSON.stringify(afterRename.sizes) === JSON.stringify(sizesBefore), JSON.stringify([sizesBefore, afterRename.sizes]));
      t.check('the file is renamed on disk', fs.existsSync(t.abs(renamed)) && !fs.existsSync(t.abs(file)));
      await t.key('Ctrl+Z');
      await t.waitFor((T, d) => T.S.model.find(d)?.c.some((c) => c.n === 'notes-03.txt'), { args: [dir], timeout: 20000, what: 'the old name back' });
      t.check('Ctrl+Z puts the old name back, on disk and in the region', fs.existsSync(t.abs(file)) && !fs.existsSync(t.abs(renamed)));
      // N makes a folder inside the folder selected.
      await t.app(selectAt, dir);
      await t.waitFor((T, d) => T.S.primary && T.api.relPath(T.S.primary) === d, { args: [dir], what: `${dir} selected` });
      await t.eval(() => document.getElementById('view').focus());
      await t.key('n');
      await t.waitFor(() => document.getElementById('dialog').open && document.activeElement?.name === 'name', { what: 'the new folder dialog' });
      await t.type('made-in-regions');
      await t.key('Enter');
      const made = `${dir}/made-in-regions`;
      await t.waitFor((T, r) => T.S.primary && T.api.relPath(T.S.primary) === r, { args: [made], timeout: 20000, what: 'the new folder selected' });
      t.check('N makes a folder: on disk, in the region and selected', fs.existsSync(t.abs(made)) && (await t.app((T, d) => T.S.primary.d && T.S.primary.p === T.S.model.find(d), dir)));

      // A small budget: six folders visited, the entries held kept near it.
      const budget = await t.app((T) => {
        T.S.regions.budget = 400;
        T.S.regions.floor = 300;
        T.api.select(null);
        return T.S.model.root.c.filter((c) => c.d && T.api.kids(c) > 0).sort((a, b) => T.api.kids(b) - T.api.kids(a)).slice(0, 6).map((c) => T.api.relPath(c));
      });
      // With WebGL the location follows the eye and may settle inside the folder.
      for (const rel of budget) {
        await t.app((T, r) => { T.api.resolve(r).then((n) => T.api.setFocus(n, { remember: false })); return true; }, rel);
        await t.waitFor((T, r) => {
          const f = T.api.relPath(T.S.focus);
          return (f === r || f.startsWith(`${r}/`)) && !T.S.focus.u;
        }, { args: [rel], timeout: 20000, what: `the folder ${rel}` });
        await t.settle();
      }
      await t.waitFor((T) => T.S.regions.stats.idle && !T.S.layoutTimer, { timeout: 20000, what: 'the regions to settle' });
      await t.sleep(800);
      await t.settle();
      const held = await t.app((T) => {
        let biggest = 0;
        const stack = [T.S.model.root];
        while (stack.length) {
          const d = stack.pop();
          if (d.u) continue;
          biggest = Math.max(biggest, d.c.length);
          for (const c of d.c) if (c.d) stack.push(c);
        }
        // What may not be let go: folders standing open in the layout, and
        // the folder you are in, the trail and the forced chain with every
        // ancestor. Every folder still held must be one of them.
        const keep = new Set();
        const L = T.S.layout;
        for (let i = 0; i < L.n; i++) if (L.type[i] === 0) keep.add(L.node[i]);
        for (const n of [T.S.focus, ...T.S.trail, ...(T.S.force || [])]) for (let a = n; a; a = a.p) keep.add(a);
        let loose = 0;
        const walk = [T.S.model.root];
        while (walk.length) {
          const d = walk.pop();
          if (d.u) continue;
          if (!keep.has(d)) loose++;
          for (const c of d.c) if (c.d) walk.push(c);
        }
        return { held: T.S.regions.held, dropped: T.S.regions.stats.dropped, biggest, loose, focusHeld: T.S.focus.u === false, focus: T.api.relPath(T.S.focus) };
      });
      t.check(`with a budget of 400, regions are let go until the entries held are within 400 and one region, or all still held stand open or are pinned (${held.held} held, ${held.dropped} regions let go)`,
        held.dropped > 0 && (held.held <= 400 + held.biggest || held.loose === 0), JSON.stringify(held));
      t.check('the folder you are in is still held', held.focusHeld && (held.focus === budget.at(-1) || held.focus.startsWith(`${budget.at(-1)}/`)), JSON.stringify(held));
      await t.app((T) => {
        T.S.regions.budget = 200000;
        T.S.regions.floor = 150000;
        return true;
      });

      // Rescan all: a new generation, the folder you are in kept by path.
      const was = await t.app((T) => ({ v: T.S.regions.v, rel: T.api.relPath(T.S.focus) }));
      await t.app((T) => { T.api.rescan(); return true; });
      // With WebGL the eye flies back to it, and the location may settle inside it.
      await t.waitFor((T, w) => {
        const f = T.api.relPath(T.S.focus);
        return T.S.regions && T.S.regions.v > w.v && (f === w.rel || f.startsWith(`${w.rel}/`));
      }, { args: [was], timeout: 60000, what: 'the folder kept after Rescan all' });
      await t.settle();
      const now = await t.app((T, w) => ({ v: T.S.regions.v, rel: T.api.relPath(T.S.focus), held: T.S.model.find(w)?.u === false }), was.rel);
      t.check(`Rescan all: the generation rises (${was.v} to ${now.v}) and the folder you are in is kept by its path (${was.rel})`, now.v > was.v && (now.rel === was.rel || now.rel.startsWith(`${was.rel}/`)) && now.held, JSON.stringify(now));
      await t.settle();

      // Search, answered by the service over the whole tree.
      const wantNotes = matchesOnDisk(t.root, 'notes');
      await t.eval(() => document.getElementById('q').focus());
      await t.type('notes');
      await t.waitFor((T) => T.S.query === 'notes' && T.S.search?.regions && T.S.tab === 'findings', { timeout: 20000, what: 'Findings for notes' });
      const found = await t.app((T) => ({
        total: T.S.search.total, listed: T.S.search.list.length, refs: T.S.search.list.filter((x) => x.ref).length,
        count: document.getElementById('q-count').textContent, finds: T.asked.find,
      }));
      t.check(`Find runs on the service: ${found.total} matches, every one on disk (${wantNotes}), listed as refs, and the count says so`,
        found.total === wantNotes && found.listed === wantNotes && found.refs > 0 && found.count === `${wantNotes.toLocaleString('en-US')} found` && found.finds > 0, JSON.stringify(found));
      // Enter on the deepest match reveals it: a node, attached, selected.
      const deep = await t.app((T) => {
        const items = T.list.items;
        let best = 0;
        items.forEach((n, i) => { if (T.api.relPath(n).split('/').length > T.api.relPath(items[best]).split('/').length) best = i; });
        T.list.setCursor(best, true);
        return T.api.relPath(items[best]);
      });
      await t.eval(() => document.getElementById('ledger-list').focus());
      await t.key('Enter');
      const revealed = await t.waitFor((T, r) => T.S.primary && !T.S.primary.ref && T.api.relPath(T.S.primary) === r && T.api.isAttached(T.S.primary)
        && { inList: T.list.items.includes(T.S.primary) }, { args: [deep], timeout: 20000, what: `${deep} revealed` });
      t.check(`Enter on the deepest match (${deep}) reveals it: S.primary is its node, attached, and stands in the list in the ref's place`, revealed.inList, JSON.stringify(revealed));
      // The Changed sort key asks the service again, and the list comes back in date order.
      const finds0 = await t.app((T) => T.asked.find);
      await t.eval(() => [...document.querySelectorAll('#ledger-sub .sorts .sort')].find((b) => /Changed/.test(b.textContent)).click());
      const resorted = await t.waitFor((T) => T.S.search.order.key === 'date' && T.S.search.order.dir === 1 && {
        finds: T.asked.find, dates: T.list.items.map((n) => (n.d ? n.mm : n.m)),
      }, { timeout: 20000, what: 'Findings by date' });
      t.check('the Changed sort key asks the service again, and Findings lists the matches oldest first',
        resorted.finds > finds0 && resorted.dates.every((d, i, a) => i === 0 || a[i - 1] <= d), JSON.stringify(resorted).slice(0, 200));
      // Select all takes the first 1,000, and says so.
      await t.eval(() => document.querySelector('#ledger-sub .sub-select').click());
      const all = await t.waitFor((T) => T.S.sel.size === T.S.search.total && [...T.S.sel].every((n) => !n.ref && T.api.isAttached(n)) && T.S.sel.size, { timeout: 30000, what: 'every match selected' });
      const said2 = await t.live();
      t.check(`Select all selects every match as nodes (${all}) and says "${said2}"`, all === wantNotes && said2 === 'Select all takes the first 1,000 matches at this size.', said2);
      // Export CSV, Findings: the notice's row count is the list's.
      // The file itself is not saved here (the export scenario reads files back): only the click on its link is skipped.
      const exported = await t.app(async () => {
        const was = HTMLAnchorElement.prototype.click;
        HTMLAnchorElement.prototype.click = function () {};
        try {
          document.querySelector('#ledger-sub [data-k="export-csv"]').click();
        } finally {
          HTMLAnchorElement.prototype.click = was;
        }
        return [...document.querySelectorAll('#notices .notice-text')].map((n) => n.textContent).reverse().find((x) => /^Exported /.test(x)) || null;
      });
      t.check(`Export CSV of Findings says "${exported}"`, exported?.startsWith(`Exported ${wantNotes.toLocaleString('en-US')} rows to terrane-`), exported);
      await t.app((T) => { T.api.select(null); return true; });
      await t.eval(() => document.getElementById('q').focus());
      await t.key('Escape');
      await t.waitFor((T) => !T.S.query && !T.S.search, { what: 'Find cleared' });

      // Working sessions: session:1 is answered by the service; with WebGL the traverse is drawn.
      await t.app((T) => { T.api.setQuery('session:1'); return true; });
      const sess = await t.waitFor((T) => T.S.search?.regions && T.S.query === 'session:1' && T.S.search.total > 0 && (!T.S.noGL ? (T.S.sessions?.route?.count ?? -1) >= 0 && T.S.sessions.route : true) && {
        total: T.S.search.total, note: T.S.search.note, order: T.S.search.order, route: T.S.sessions?.route ?? null,
      }, { timeout: 30000, what: 'session:1 and its traverse' });
      t.check(`session:1 finds the newest working session on the service (${sess.total} files), in time order, its note from the service's facts`,
        sess.total > 0 && sess.order.key === 'date' && sess.order.dir === 1 && /^Session 1: /.test(sess.note), JSON.stringify(sess).slice(0, 300));
      if (t.gl) t.check(`with WebGL the traverse is drawn (${sess.route?.count} legs)`, sess.route?.count > 0, JSON.stringify(sess.route));
      // Changed with it, for a file of that session.
      const mate = await t.app((T) => T.api.relPath(T.S.search.list[0]));
      await t.app(selectAt, mate);
      const changed = await t.waitFor((T, f) => T.S.primary && T.api.relPath(T.S.primary) === f
        && [...document.querySelectorAll('#inspector-body .section-title')].some((h) => /Changed with it/.test(h.textContent) && /session 1/.test(h.textContent))
        && document.querySelector('#inspector-body .session-near')?.textContent, { args: [mate], timeout: 20000, what: 'Changed with it' });
      t.check(`Changed with it is listed for ${mate}: session 1 and its nearest files`, !!changed, String(changed).slice(0, 200));
      await t.app((T) => { T.api.select(null); T.api.setQuery(''); return true; });
      await t.waitFor((T) => !T.S.search, { what: 'Find cleared' });

      // The palette finds a folder by name and goes there.
      const target = chain[1];
      const leaf = target.split('/').at(-1);
      await t.eval(() => document.getElementById('view').focus());
      await t.key('Ctrl+K');
      await t.waitFor(() => document.activeElement?.classList.contains('palette-input'), { what: 'the palette' });
      await t.type(leaf);
      const opt = await t.until((_T, l) => {
        const rows = [...document.querySelectorAll('.palette-option.is-place')];
        return rows.length && rows[0].querySelector('.pal-label').textContent === l && rows.map((r) => r.querySelector('.pal-label').textContent);
      }, { args: [leaf], timeout: 20000 });
      if (!opt) {
        const why = await t.eval(() => ({ input: document.querySelector('.palette-input')?.value, list: document.getElementById('palette-list')?.textContent.slice(0, 300), notices: [...document.querySelectorAll('#notices .notice-text')].map((n) => n.textContent) }));
        throw new Error(`the folder never came first among the places: ${JSON.stringify(why)}`);
      }
      await t.key('Enter');
      await t.waitFor((T, r) => {
        const f = T.api.relPath(T.S.focus);
        return (f === r || f.startsWith(`${r}/`)) && !T.S.focus.u;
      }, { args: [target], timeout: 20000, what: `the palette's place ${target}` });
      t.check(`Ctrl+K finds ${leaf} among the places the service ranks and Enter goes there`, opt[0] === leaf, JSON.stringify(opt));
      await t.settle();

      // The Survey: answered by the service; Largest files reveals.
      await t.tabTo('.tabs [data-tab=survey]', { max: 80 });
      await t.key('Enter');
      await t.waitFor((T) => T.S.tab === 'survey' && T.S.survey && !T.S.survey.pending && T.S.survey.regions, { timeout: 20000, what: 'the service\'s survey' });
      const sv = await t.app((T) => ({ largest: T.S.survey.largest.map((f) => T.api.relPath(f)), groups: T.S.survey.dupGroups.length, surveys: T.asked.survey }));
      t.check(`the Survey tab lists the service's survey (${sv.largest.length} largest files, ${sv.groups} candidate groups)`, sv.largest.length > 0 && sv.groups > 0, JSON.stringify(sv).slice(0, 200));
      await t.tabTo('#ledger-rich .item');
      await t.key('Enter');
      const big = await t.waitFor((T, r) => T.S.primary && !T.S.primary.ref && T.api.relPath(T.S.primary) === r && T.api.isAttached(T.S.primary), { args: [sv.largest[0]], timeout: 20000, what: 'the largest file revealed' });
      t.check(`Largest files, Enter reveals ${sv.largest[0]}`, !!big);
      // The quick searches are counted by the service.
      const preset = await t.app(async (T) => {
        const d = [...document.querySelectorAll('#ledger-rich details')].find((x) => x.querySelector('.preset-row'));
        d.open = true;
        d.dispatchEvent(new Event('toggle'));
        return true;
      });
      const figs = await t.waitFor(() => {
        const f = [...document.querySelectorAll('#ledger-rich .preset-row .fig')].map((x) => x.textContent);
        return f.length === 4 && f.every((x) => /^[\d,]+ · /.test(x)) && f;
      }, { timeout: 20000, what: 'the quick searches counted' });
      const presetWant = await t.app(async (T) => (await T.api.ask('find', { q: 'is:empty is:folder', limit: '0' })).total);
      t.check(`the quick searches show the service's counts (${figs.join(' | ')})`, preset && figs[3].startsWith(`${presetWant.toLocaleString('en-US')} · `), JSON.stringify(figs));

      // Verify by content confirms the fixture's copies; Keep newest moves two and Undo restores them.
      const [a, b, c] = m.duplicates;
      const v = await verifyIn(t, a);
      t.check(`Verify by content confirms the fixture's ${v.n} copies (${v.mode}) by path`, v.n === 3 && v.mode === 'full', JSON.stringify(v));
      const on = (rel) => fs.existsSync(t.abs(rel));
      // The group's own Keep newest: other groups may be confirmed too.
      const at = await t.app((T, r) => T.S.survey.dupGroups.findIndex((x) => x.files.some((f) => T.api.relPath(f) === r)), a);
      await t.tabTo(`#ledger-rich .dup-clean [data-k="dup:survey:${at}:newest"]`, { max: 300 });
      await t.key('Enter');
      const asked = await t.waitFor(() => document.getElementById('dialog').open && document.querySelector('#dialog .dup-confirm')?.textContent, { what: 'the confirmation' });
      t.check('Keep newest asks to keep one copy of the group and move the other two',/^Keeps /.test(asked) && [a, b, c].filter((x) => asked.includes(x)).length === 3, asked);
      await t.tabTo('#dialog button[type=submit]');
      await t.key('Enter');
      const moved = await t.poll(() => [a, b, c].filter(on).length === 1, { timeout: 15000 });
      t.check('Keep newest moves the two other copies to the holding area', moved, JSON.stringify([[a, b, c].map(on), await t.notices()]));
      await t.waitFor((T) => !document.getElementById('dialog').open, { what: 'the dialog closed' });
      await t.eval(() => document.getElementById('view').focus());
      await t.key('Ctrl+Z');
      t.check('Ctrl+Z puts them back', await t.poll(() => [a, b, c].every(on), { timeout: 15000 }));
      await t.waitFor((T, r) => r.every((x) => !!T.S.model.find(x) || !T.S.model.find(x.slice(0, x.lastIndexOf('/')))?.c.length), { args: [[a, b, c]], timeout: 20000, what: 'the copies back in the regions' });
    },
  },
  {
    name: 'regions-switch',
    title: 'Regions: a whole survey passes the threshold and the page reads the tree in regions',
    data: 'fixture',
    regions: 1000,
    timeout: 180000,
    async run(t) {
      const reqs = t.requests();
      const scan = reqs.find((r) => {
        if (r.path !== '/api/scan') return false;
        const q = new URL(r.url).searchParams;
        return (q.get('path') || '') === '' && !q.get('depth');
      });
      const build = reqs.find((r) => r.path === '/api/tree' && new URL(r.url).searchParams.get('build') === '1');
      t.check('the page began a whole survey (/api/scan of the root)', !!scan);
      t.check('then asked the service to read the tree (/api/tree?build=1)', !!build && reqs.indexOf(build) > reqs.indexOf(scan));
      const st = await t.app((T) => ({ regions: !!T.S.regions, model: !!T.S.model.regions, entries: T.S.regions?.entries, held: T.S.regions?.held, status: document.getElementById('status').textContent }));
      t.check(`it draws in regions: ${st.held} of ${st.entries} entries held`, st.regions && st.model && st.entries > 1000 && st.held > 0 && st.held <= st.entries, JSON.stringify(st));
      t.check('the status line says Regions', /Regions · [\d,]+ of [\d,]+ entries held/.test(st.status), st.status);
    },
  },
];
