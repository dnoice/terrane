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
 *       to the whole tree's on the read-only service
 *     - Bytes by last change, the Age lens's typical-age line and the time
 *       scrub's Since section of one folder, equal in both modes
 *     - B then a reload: the benchmark is found again and reads "no change"
 *     - F2 renames a file: listed again under its name, still selected,
 *       the sizes above unchanged; Ctrl+Z puts it back; N makes a folder
 *     - Rescan all: a new generation, the folder you are in kept by path
 *     - Find and the Survey tab say they are not available at this size
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

      // The questions that walk the whole tree say they are not available.
      await t.eval(() => document.getElementById('q').focus());
      await t.type('notes');
      await t.waitFor((T) => T.S.query === 'notes', { timeout: 5000, what: 'the query' });
      await t.sleep(200);
      const said = await t.live();
      const searched = await t.app((T) => ({ search: T.S.search, tab: T.S.tab }));
      t.check('typing in Find says that search is not available at this size', said === 'Search is not available at this size.' && searched.search === null, said);
      await t.key('Escape');
      await t.waitFor((T) => !T.S.query, { what: 'Find cleared' });
      await t.tabTo('.tabs [data-tab=survey]', { max: 80 });
      await t.key('Enter');
      await t.waitFor((T) => T.S.tab === 'survey', { what: 'the Survey tab' });
      const survey = await t.text('#ledger-rich');
      t.check('the Survey tab says the survey of the whole directory is not available at this size', /The survey of the whole directory is not available at this size\./.test(survey), survey.slice(0, 200));
      await t.tabTo('.tabs [data-tab=findings]', { back: true, max: 20 });
      await t.key('Enter');
      const findings = await t.text('#ledger-sub');
      t.check('Findings says that search is not available at this size', /Search is not available at this size\./.test(findings), findings);
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
