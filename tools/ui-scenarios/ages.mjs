/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Age Table Scenario (Terrane Edition - v1.1)
 *     - File Name: ages.mjs
 *     - Relative Path: tools/ui-scenarios/ages.mjs
 *     - Artifact Type: test
 *     - Version: 1.1.0
 *     - Date: 11/12/2026
 *     - Update: Thursday, November 12, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Changelog:
 *     - 1.1.0 (11/12/2026) [dendogg + Anthropic - Claude Opus 5.5] — With
 *       feature modules installed, the table is checked to be the first of
 *       all survey hooks, and the probe's removal against the controller's
 *       own hooks, leaving out entries a feature owns.
 *     - 1.0.0 (11/12/2026) [dendogg + Anthropic - Claude Opus 5.5] —
 *       Initial release.
 *
 * ✒ Description:
 *     Checks the shared age table in the real page: the survey builds it
 *     before any feature hook runs, its figures equal a brute-force walk of
 *     the model the page holds, nothing is written onto the nodes, and a
 *     refresh pressed from the keyboard, or a change on disk, rebuilds it.
 *
 * ✒ Key Features:
 *     - Any data, both passes: the table needs no 3D view
 *     - Every folder against a brute-force walk at all 20 steps, every
 *       folder's strata against its size and file count
 *     - Fixture: strata-old and strata-live share their newest change but
 *       not their median step, strata, or share kept for a year
 *     - F5 from the keyboard rebuilds the table at survey order 10, so a
 *       feature's survey hook already reads the new one
 *     - Write scenario: a folder made on disk is answered from its newest
 *       change until the survey, then from its own files
 *
 * ✒ Usage Instructions:
 *     node tools/ui-check.mjs ages ages-write
 *
 * ✒ Other Important Information:
 *     - Dependencies: tools/ui-check.mjs (the context t), Node.js fs
 *     - Compatible platforms: Node.js 22.5+
 * ----------------------------------------------------------------------------
 */

import fs from 'node:fs';
import path from 'node:path';

/** In the page: the table against a brute-force walk of the model, every folder, every step. */
function audit(T) {
  const A = T.S.ages;
  const root = T.S.model.root;
  if (!A) return null;
  const steps = A.T.length;
  const all = [];
  const stack = [root];
  while (stack.length) {
    const d = stack.pop();
    all.push(d);
    for (const c of d.c) if (c.d) stack.push(c);
  }
  // Brute force: each file adds itself to every ancestor at every step it is newer than.
  const cb = new Map(all.map((d) => [d, new Array(steps).fill(0)]));
  const cf = new Map(all.map((d) => [d, new Array(steps).fill(0)]));
  for (const d of all) {
    for (const f of d.c) {
      if (f.d) continue;
      for (let a = d; a; a = a.p) {
        const b = cb.get(a);
        const n = cf.get(a);
        for (let k = 0; k < steps; k++) {
          if (f.m > A.T[k]) {
            b[k] += f.s;
            n[k]++;
          }
        }
      }
    }
  }
  const KNOWN = new Set(['n', 'p', 'd', 's', 'm', 'f', 'c', 'fc', 'dc', 'ks', 'mm', 'h', 'e', 'dirty', 'stub', '_open', '_scree']);
  const foreign = new Set();
  let miss = 0;
  let sums = 0;
  const missed = [];
  for (const d of all) {
    const b = cb.get(d);
    const n = cf.get(d);
    for (let k = 0; k < steps; k++) {
      if (A.changedBytes(d, k) !== b[k] || A.changedFiles(d, k) !== n[k]) {
        miss++;
        if (missed.length < 3) missed.push(`${d.n}@${k}`);
      }
    }
    const s = A.bands(d);
    if (s.bytes.reduce((x, y) => x + y, 0) !== d.s || s.files.reduce((x, y) => x + y, 0) !== d.fc) sums++;
    for (const k of Object.keys(d)) if (!KNOWN.has(k)) foreign.add(k);
    if (Object.getOwnPropertySymbols(d).length) foreign.add('a symbol');
  }
  return {
    folders: all.length, held: A.folders, files: root.fc, miss, missed, sums, foreign: [...foreign],
    anchor: A.anchor, T0: A.T[0], steps, ms: A.ms, frozen: Object.isFrozen(A),
    rootTotals: A.totalBytes(root) === root.s && A.totalFiles(root) === root.fc,
    // Every survey hook, and the controller's own (a feature's carry its owner).
    hooks: T.api.AFTER_SURVEY.ids(),
    ownHooks: [...T.api.AFTER_SURVEY].filter((x) => !x.owner || x.owner === 'core').map((x) => x.id),
  };
}

const ages = {
  name: 'ages',
  title: 'The shared age table: built with the survey, true to the model, rebuilt by a refresh',
  async run(t) {
    await t.settle();
    const opened = await t.eval(() => performance.timeOrigin);
    const a = await t.app(audit);
    t.check('the survey built the age table', !!a && a.frozen, JSON.stringify(a)?.slice(0, 200));
    if (!a) return;
    t.check(`it is the first survey hook and holds every folder (${a.held.toLocaleString('en-US')})`, a.hooks[0] === 'ages' && a.held === a.folders, JSON.stringify(a.hooks));
    t.check('its ladder looks back from the moment it was built, in this session', a.steps === 20 && a.T0 === a.anchor && a.anchor >= opened && a.anchor <= Date.now() + 1000);
    t.check(`every folder's changed bytes and files equal a brute-force walk at all 20 steps (${a.files.toLocaleString('en-US')} files; built in ${a.ms.toFixed(1)} ms)`,
      a.miss === 0, `${a.miss} mismatches, first ${a.missed.join(' ')}`);
    t.check('every folder\'s six strata add up to its size and file count, and the root\'s totals are the root\'s', a.sums === 0 && a.rootTotals, `${a.sums} folders`);
    t.check('no field was written onto a folder', a.foreign.length === 0, a.foreign.join(', '));

    if (t.manifest) {
      const m = t.manifest;
      const pair = await t.app(async (T, oldRel, liveRel, oldDate) => {
        const { LADDER_DAYS } = await import(new URL('js/timeline.js', document.baseURI).href);
        const A = T.S.ages;
        const year = LADDER_DAYS.indexOf(365);
        const one = (rel) => {
          const d = T.S.model.find(rel);
          return d && { mm: d.mm, median: A.medianStep(d), bands: A.bands(d).bytes, keptYear: A.kept(d, year) };
        };
        // A time first counts as changed at its step, so it is older than the step before.
        return { old: one(oldRel), live: one(liveRel), oldStep: A.stepOf(oldDate), olderThan: LADDER_DAYS[A.stepOf(oldDate) - 1] };
      }, m.strata.old, m.strata.live, m.strata.oldDate);
      const MiB64 = 64 * 1024 * 1024;
      t.check('strata-old and strata-live have the same newest change', pair.old && pair.live && pair.old.mm === pair.live.mm && pair.old.mm === m.strata.newest, JSON.stringify(pair));
      if (m.sparse.leftEmpty) t.skip('the strata pair differs by age', 'the 64 MB files could not be made on this volume');
      else {
        t.check(`yet strata-old's median step is ${pair.old.median} (older than ${pair.olderThan?.toLocaleString('en-US')} days) and strata-live's is 1 (under a day)`,
          pair.old.median === pair.oldStep && pair.olderThan >= 1095 && pair.live.median === 1, JSON.stringify(pair));
        t.check('their strata: strata-old 1 KB under a day and 64 MB older than three years; strata-live 64 MB under a day',
          JSON.stringify(pair.old.bands) === JSON.stringify([1024, 0, 0, 0, 0, MiB64]) && JSON.stringify(pair.live.bands) === JSON.stringify([MiB64, 0, 0, 0, 0, 0]), JSON.stringify(pair));
        t.check('kept for a year: strata-old all but its 1 KB, strata-live nothing',
          Math.abs(pair.old.keptYear - MiB64 / (MiB64 + 1024)) < 1e-12 && pair.live.keptYear === 0, JSON.stringify(pair));
      }
    } else t.skip('the strata pair', 'needs the fixture');

    // F5 re-reads the folder you are in; the survey that follows rebuilds
    // the table before any feature's survey hook runs.
    await t.app((T) => {
      window.__ages = { prev: T.S.ages, survey: T.S.survey, seen: [] };
      T.api.AFTER_SURVEY.add({ id: 'ages-probe', run: (sv) => { window.__ages.seen.push([T.S.ages !== window.__ages.prev, sv === T.S.survey, T.S.ages.anchor]); } });
    });
    await t.tabTo('#view');
    const mark = t.mark();
    await t.key('F5');
    // Reading window.__ages back also proves F5 did not reload the page.
    const after = await t.waitFor(() => window.__ages?.seen.length && { seen: window.__ages.seen, prevAnchor: window.__ages.prev.anchor }, { timeout: 10000 });
    await t.app((T) => { T.api.AFTER_SURVEY.remove('ages-probe'); });
    const scans = t.requests(mark).filter((r) => r.path === '/api/scan');
    t.check('F5 re-read the folder you are in without reloading the page', scans.length >= 1, JSON.stringify(t.requests(mark)));
    t.check('the survey that followed rebuilt the table before a feature\'s survey hook ran', after.seen[0][0] === true && after.seen[0][1] === true && after.seen[0][2] > after.prevAnchor, JSON.stringify(after));
    const b = await t.app(audit);
    t.check('the rebuilt table still equals a brute-force walk, and holds every folder', b.miss === 0 && b.sums === 0 && b.held === b.folders && b.ownHooks.join() === 'ages' && b.hooks[0] === 'ages', JSON.stringify({ miss: b.miss, sums: b.sums, held: b.held, folders: b.folders, hooks: b.hooks }));
  },
};

const write = {
  name: 'ages-write',
  title: 'A folder made on disk: answered from its newest change, then from its own files',
  data: 'fixture',
  write: true,
  async run(t) {
    await t.settle();
    const DAY = 86400000;
    const fresh = Date.now() - 2 * 60 * 1000;
    const old = new Date(2015, 5, 1, 12, 0, 0).getTime();
    const before = await t.app((T) => ({ bytes: T.S.ages.totalBytes(T.S.model.root), files: T.S.ages.totalFiles(T.S.model.root), anchor: T.S.ages.anchor }));
    // What the table says about the folder when the refresh has brought it
    // into the model but the survey has not run yet.
    await t.app(() => {
      const T = window.__terrane;
      window.__agesWrite = null;
      T.api.AFTER_REFRESH.add({
        id: 'ages-write-probe',
        run: () => {
          const d = T.S.model.find('ages-check');
          if (!d || window.__agesWrite || !d.c.length) return;
          const A = T.S.ages;
          window.__agesWrite = {
            has: A.has(d), mm: d.mm, s: d.s,
            kept: A.T.map((_, k) => A.kept(d, k)), rule: A.T.map((tk) => (d.mm > tk ? 0 : 1)),
            changed: A.T.map((_, k) => A.changedBytes(d, k)), median: A.medianStep(d), mmStep: A.stepOf(d.mm), bands: A.bands(d).bytes,
          };
        },
      });
    });
    // Made beside the fixture and renamed in, so the watcher never sees the
    // folder without its files.
    const staging = path.join(path.dirname(t.root), `ages-check-${process.pid}-${Date.now()}`);
    fs.mkdirSync(staging);
    const put = (name, size, ms) => {
      fs.writeFileSync(path.join(staging, name), Buffer.alloc(size, 'a'));
      fs.utimesSync(path.join(staging, name), ms / 1000, ms / 1000);
    };
    put('fresh.bin', 5000, fresh);
    put('old.bin', 7000, old);
    fs.renameSync(staging, t.abs('ages-check'));
    await t.tabTo('#view');
    await t.key('F5');
    const probe = await t.waitFor(() => window.__agesWrite, { timeout: 15000 });
    const rebuilt = await t.waitFor((T) => {
      const d = T.S.model.find('ages-check');
      const A = T.S.ages;
      return d && A.has(d) && {
        anchor: A.anchor, bytes: A.totalBytes(T.S.model.root), files: A.totalFiles(T.S.model.root),
        bands: A.bands(d), median: A.medianStep(d), oldStep: A.stepOf(d.c.find((f) => f.n === 'old.bin').m), last: A.lastStep(d),
        freshStep: A.stepOf(d.c.find((f) => f.n === 'fresh.bin').m),
      };
    }, { timeout: 15000 });
    await t.app((T) => { T.api.AFTER_REFRESH.remove('ages-write-probe'); });
    t.check('before the survey, the table does not hold the new folder and answers from its newest change (mm > T ? 0 : 1)',
      !probe.has && JSON.stringify(probe.kept) === JSON.stringify(probe.rule) && probe.changed.every((c, k) => c === (probe.rule[k] ? 0 : probe.s))
      && probe.median === Math.min(probe.mmStep, 19) && probe.bands.reduce((x, y) => x + y, 0) === 12000, JSON.stringify(probe));
    t.check('after the survey it holds the folder, rebuilt from a later moment', rebuilt.anchor > before.anchor, JSON.stringify(rebuilt));
    t.check('the root\'s totals grew by exactly the two files', rebuilt.bytes === before.bytes + 12000 && rebuilt.files === before.files + 2, JSON.stringify({ before, rebuilt }));
    t.check('its strata: 5,000 bytes under a day, 7,000 older than three years',
      JSON.stringify(rebuilt.bands) === JSON.stringify({ bytes: [5000, 0, 0, 0, 0, 7000], files: [1, 0, 0, 0, 0, 1] }) && rebuilt.freshStep === 1, JSON.stringify(rebuilt));
    t.check(`half its bytes changed only by the old file's step (${rebuilt.oldStep}), and so did all of its files`,
      rebuilt.median === rebuilt.oldStep && rebuilt.last === rebuilt.oldStep && rebuilt.oldStep > 12 && Date.now() - old > 3 * 365 * DAY, JSON.stringify(rebuilt));
  },
};

export default [ages, write];
