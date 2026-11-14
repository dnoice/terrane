/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Warm Start Scenario (Terrane Edition - v1.0)
 *     - File Name: warm.mjs
 *     - Relative Path: tools/ui-scenarios/warm.mjs
 *     - Artifact Type: test
 *     - Version: 1.0.0
 *     - Date: 11/13/2026
 *     - Update: Friday, November 13, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Changelog:
 *     - 1.0.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] —
 *       Initial release.
 *
 * ✒ Description:
 *     The warm start in a real browser, with WebGL on and off: a first
 *     load that surveys from nothing and leaves its tree kept, a reload
 *     that draws that tree at once while the directory is surveyed again,
 *     the changes made on disk in between arriving once it has been, and
 *     a kept tree cut short that the page sets aside and says so.
 *
 * ✒ Key Features:
 *     - The first load is cold: no kept tree, its first box drawn and
 *       timed (firstDrawMs), S.warm never set, and its survey kept
 *     - A folder gone into and a file selected; a file written and
 *       another removed on disk; then a reload, whose catch-up survey is
 *       held at the network (DevTools Fetch) while the warm tree is
 *       checked
 *     - Warm: S.warm set, the tree as the last session surveyed it, the
 *       notice and the status say so, the remembered folder and selection
 *       come back, F2 and N say changes wait and send nothing, and the
 *       inspector shows Rename unavailable with the reason
 *     - Released: S.warm clears, the new file is in and the removed one
 *       gone, the folder and selection are kept by path, the notice says
 *       what changed, and with WebGL the eye stands within 2% of where it
 *       stood relative to the folder's box; the catch-up's survey is kept
 *       for the next launch
 *     - A kept tree cut short (its meta made to agree): the page surveys
 *       afresh and says so
 *     - Both first-draw times are noted
 *
 * ✒ Usage Instructions:
 *     node tools/ui-check.mjs warm [--pass webgl|nogl] [--files 15000]
 *     ui-check gives it a fresh writable fixture service on its port
 *     plus one, the only service started without --no-warm.
 *
 * ✒ Other Important Information:
 *     - Dependencies: tools/ui-check.mjs (the context t, t.dataDir);
 *       server/warm.mjs (warmPaths); the DevTools Fetch domain
 *     - Compatible platforms: Node.js 22.5+; Edge or Chrome
 * ----------------------------------------------------------------------------
 */

import fs from 'node:fs';
import { warmPaths } from '../../server/warm.mjs';

/** In the page: what the service says of its kept tree (GET /api/info's warm). */
const KEPT = async () => {
  const token = document.querySelector('meta[name="terrane-token"]').content;
  const info = await (await fetch('/api/info', { headers: { 'X-Terrane-Token': token } })).json();
  return info.warm;
};

/**
 * In the page, after a reload: 'ready' once the tree from the last
 * session is drawn and the loading sheet has gone (its intro skipped as a
 * click would), 'cold' when the page surveyed from nothing instead.
 */
const WARM_READY = `(() => {
  if (window.__oldPage) return '';
  const T = window.__terrane;
  const s = document.getElementById('splash');
  if (T && !T.S.scanning && (T.S.warm || T.warm.used)) {
    if (!s || s.hidden) return 'ready';
    if (s.dataset.phase === 'intro') s.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    return 'leaving';
  }
  if (T && !T.S.scanning && !T.S.warm) return 'cold';
  return '';
})()`;

/** In the page: the eye as an offset from the box of the folder you are in, in its widths. */
const EYE = (T) => {
  const L = T.S.layout;
  const i = L.index.get(T.S.focus);
  if (i === undefined || i >= T.S.view.n) return null;
  const g = L.geo;
  const o = i * 6;
  const a = { x: g[o], y: g[o + 1] - g[o + 4] / 2, z: g[o + 2], w: Math.max(g[o + 3], g[o + 5], 1e-12) };
  const c = T.S.view.pose();
  return { focus: T.api.relPath(T.S.focus), off: [(c.x - a.x) / a.w, (c.y - a.y) / a.w, (c.z - a.z) / a.w], at: [a.x, a.y, a.z, a.w] };
};

const NOTICES = () => [...document.querySelectorAll('#notices .notice-text')].map((n) => n.textContent);

export default {
  name: 'warm',
  title: 'Warm start: the tree from the last session drawn at once, then checked against the disk',
  data: 'fixture',
  write: true,
  warm: true,
  timeout: 240000,
  async run(t) {
    /* ---- the first load surveys from nothing ---- */
    const cold = await t.app((T) => ({
      first: T.firstDrawMs, used: T.warm.used, settled: T.warm.settledMs, warm: T.S.warm, info: T.S.info.warm,
      folders: T.S.model.root.dc + 1, files: T.S.model.root.fc,
    }));
    t.check(`the first load surveys from nothing: no kept tree, S.warm never set, its first box drawn at ${cold.first} ms`,
      cold.info === null && cold.warm === null && cold.used === false && cold.settled === null && cold.first > 0, JSON.stringify(cold));
    const kept = await t.waitFor(KEPT, { timeout: 15000, what: 'the first survey to be kept' });
    t.check(`its survey is kept for the next launch: ${kept.folders} folders and ${kept.files} files, as the page holds`,
      kept.folders === cold.folders && kept.files === cold.files, JSON.stringify(kept));

    /* ---- a folder and a file; then changes on disk ---- */
    const dir = t.manifest.bulk.dir;
    const picked = await t.app((T, d) => {
      const node = T.S.model.find(d);
      const files = node.c.filter((n) => !n.d).sort((a, b) => a.n.localeCompare(b.n));
      T.api.setFocus(node);
      T.api.select(files[0]);
      return { file: files[0].n, other: files[1].n };
    }, dir);
    await t.settle();
    // With WebGL the location then follows the camera: the folder framed,
    // or the one around it when the framed box fills little of the view.
    await t.sleep(400);
    const { where, primary } = await t.app((T) => ({ where: T.api.relPath(T.S.focus), primary: T.S.primary ? T.api.relPath(T.S.primary) : null }));
    t.check(`going there puts you in ${where || 'the root'}, with the file selected`,
      (where === dir || dir.startsWith(`${where}/`) || where === '') && primary === `${dir}/${picked.file}`, JSON.stringify({ where, primary }));
    fs.writeFileSync(t.abs(`${dir}/warm-here-now.txt`), 'written after the survey that was kept');
    fs.rmSync(t.abs(`${dir}/${picked.other}`));
    // The kept view is saved a second after the selection; give it that.
    await t.sleep(1200);

    /* ---- reload: the tree from the last session, its check held back ---- */
    const held = [];
    let releasing = false;
    const off = t.page.cdp.on((msg) => {
      if (msg.sessionId !== t.page.sessionId || msg.method !== 'Fetch.requestPaused') return;
      if (releasing) t.page.send('Fetch.continueRequest', { requestId: msg.params.requestId }).catch(() => {});
      else held.push(msg.params.requestId);
    });
    await t.page.send('Fetch.enable', { patterns: [{ urlPattern: '*/api/scan?*', requestStage: 'Request' }] });
    const release = async () => {
      releasing = true;
      for (const id of held.splice(0)) await t.page.send('Fetch.continueRequest', { requestId: id }).catch(() => {});
      await t.page.send('Fetch.disable').catch(() => {});
      off();
    };
    try {
      await t.eval('window.__oldPage = true');
      await t.page.send('Page.reload', {});
      const end = Date.now() + 60000;
      let state = '';
      while (Date.now() < end) {
        state = await t.eval(WARM_READY).catch(() => '');
        if (state === 'ready' || state === 'cold') break;
        await t.sleep(80);
      }
      const mark = t.mark();
      const w = await t.app((T, d, o) => ({
        warm: !!T.S.warm, used: T.warm.used, first: T.firstDrawMs, scanning: T.S.scanning,
        status: document.getElementById('status-label').textContent,
        busy: !!document.querySelector('#status .pulse.is-busy'),
        hasNew: !!T.S.model.find(`${d}/warm-here-now.txt`), hasGone: !!T.S.model.find(`${d}/${o}`),
      }), dir, picked.other);
      t.check(`the reload draws the tree from the last session at once: S.warm set, its first box drawn at ${w.first} ms`,
        state === 'ready' && w.warm && w.used && !w.scanning && w.first > 0, JSON.stringify({ state, ...w }));
      t.check('the survey that checks it was asked for at once (held here while these checks run)', held.length >= 1, `${held.length} held`);
      t.check('it is the tree as the last session surveyed it: the file written since is not in it, the one removed since still is', !w.hasNew && w.hasGone, JSON.stringify(w));
      const notes = await t.eval(NOTICES);
      t.check('a notice says it shows the last session\'s tree and that changes wait', notes.some((x) => /as it was when the last session surveyed it, \d\d\/\d\d\/\d{4} \d\d:\d\d\. Surveying it as it is now; changes wait until then\./.test(x)),
        notes.join(' | '));
      t.check(`the status says so, with the busy lamp (${w.status})`, /^Last session · surveying/.test(w.status) && w.busy, w.status);
      const back = await t.until((T, at, d, f) => T.api.relPath(T.S.focus) === at && T.S.primary && T.api.relPath(T.S.primary) === `${d}/${f}` && T.S.sel.size === 1,
        { args: [where, dir, picked.file], timeout: 8000 });
      const seen = await t.app((T) => ({ focus: T.api.relPath(T.S.focus), primary: T.S.primary ? T.api.relPath(T.S.primary) : null, sel: T.S.sel.size }));
      t.check('the remembered folder and selection come back on the tree from the last session', !!back, JSON.stringify({ want: where, ...seen }));
      await t.settle();

      // Changes wait, by key, before any dialog and without a request.
      const before = (await t.eval(NOTICES)).length;
      await t.tabTo('#view', { max: 120 });
      await t.key('F2');
      await t.key('n');
      const waits = await t.until((_T, n) => {
        const all = [...document.querySelectorAll('#notices .notice-text')].map((x) => x.textContent);
        const said = all.filter((x) => /^Changes wait while the tree from the last session is still being checked\./.test(x));
        return said.length >= 2 && !document.getElementById('dialog').open && { said: said.length, all: all.length, before: n };
      }, { args: [before], timeout: 4000 });
      t.check('F2 and N say changes wait while the tree from the last session is checked, and no dialog asks for a name', !!waits, JSON.stringify(waits));
      const sent = t.requests(mark).filter((r) => r.path === '/api/op');
      t.check('and nothing is sent to the service', sent.length === 0, JSON.stringify(sent));
      const rename = await t.eval(() => {
        const b = [...document.querySelectorAll('#inspector-body button')].find((x) => /^Rename/.test(x.textContent.trim()));
        return b ? { off: b.getAttribute('aria-disabled'), title: b.title } : null;
      });
      t.check('the inspector shows Rename unavailable, with the reason', rename?.off === 'true' && /the tree from the last session is still being checked/.test(rename.title), JSON.stringify(rename));
      const eye0 = t.gl ? await t.app(EYE) : null;

      /* ---- released: the directory as it is now ---- */
      await release();
      await t.waitFor((T) => !T.S.warm, { timeout: 60000, what: 'the survey that checks the tree from the last session' });
      await t.settle();
      const a = await t.app((T, d, f, o) => ({
        hasNew: !!T.S.model.find(`${d}/warm-here-now.txt`), hasGone: !!T.S.model.find(`${d}/${o}`),
        focus: T.api.relPath(T.S.focus), primary: T.S.primary ? T.api.relPath(T.S.primary) : null, sel: T.S.sel.size,
        same: T.S.model.find(`${d}/${f}`) === T.S.primary, settled: T.warm.settledMs,
        status: document.getElementById('status-label').textContent,
        rename: [...document.querySelectorAll('#inspector-body button')].find((x) => /^Rename/.test(x.textContent.trim()))?.getAttribute('aria-disabled') ?? 'none',
      }), dir, picked.file, picked.other);
      t.check('once surveyed again, the file written since is in the tree and the one removed since is gone', a.hasNew && !a.hasGone, JSON.stringify(a));
      t.check('the folder you are in and the selection are kept, by path, on the same node', a.focus === where && a.primary === `${dir}/${picked.file}` && a.sel === 1 && a.same, JSON.stringify(a));
      t.check(`S.warm clears, the status no longer says last session (${a.status}), and Rename is available again`, a.settled > 0 && !/Last session/.test(a.status) && a.rename !== 'true', JSON.stringify(a));
      const said = await t.eval(NOTICES);
      t.check('a notice says what changed since the last session, and the one that said changes wait is withdrawn',
        said.some((x) => /^Surveyed again: \d+ files? changed, 1 here now, 1 gone since the last session\.$/.test(x))
        && !said.some((x) => /changes wait until then/.test(x)), said.join(' | '));
      if (t.gl) {
        const eye1 = await t.app(EYE);
        const d = eye0 && eye1 ? Math.max(...eye0.off.map((v, i) => Math.abs(v - eye1.off[i]))) : Infinity;
        const moved = eye0 && eye1 ? eye0.at.some((v, i) => v !== eye1.at[i]) : false;
        t.check(`with WebGL the eye stands where it stood relative to the box of the folder you are in: within ${(d * 100).toFixed(3)}% of its width${moved ? ', the box having moved' : ''}`,
          !!eye0 && eye1?.focus === eye0.focus && d <= 0.02, JSON.stringify({ eye0, eye1 }));
      } else t.skip('the eye relative to the folder\'s box', 'without WebGL there is no camera');
      const fresh = await t.until(async (T, k) => {
        const token = document.querySelector('meta[name="terrane-token"]').content;
        const info = await (await fetch('/api/info', { headers: { 'X-Terrane-Token': token } })).json();
        return info.warm && info.warm.takenAt > k && { ...info.warm, now: T.S.model.root.fc };
      }, { args: [kept.takenAt], timeout: 15000 });
      t.check('the survey that checked it is kept in its place, for the next launch', !!fresh && fresh.files === fresh.now, JSON.stringify(fresh));
    } finally {
      if (!releasing) await release();
    }
    const warmFirst = await t.app((T) => T.firstDrawMs);

    /* ---- a kept tree cut short: surveyed afresh, and said ---- */
    const root = await t.app((T) => T.S.info.root);
    const p = warmPaths(root, t.dataDir);
    const meta = JSON.parse(fs.readFileSync(p.meta, 'utf8'));
    const whole = fs.readFileSync(p.data);
    const cut = whole.subarray(0, Math.floor(whole.length / 2));
    fs.writeFileSync(p.data, cut);
    // The meta made to agree with the size, so the service serves it and
    // the page is the one to find it wanting.
    fs.writeFileSync(p.meta, JSON.stringify({ ...meta, size: cut.length }));
    await t.reload();
    const c = await t.app((T, d) => ({
      used: T.warm.used, warm: T.S.warm, info: !!T.S.info.warm, first: T.firstDrawMs,
      notes: [...document.querySelectorAll('#notices .notice-text')].map((n) => n.textContent),
      hasNew: !!T.S.model.find(`${d}/warm-here-now.txt`), files: T.S.model.root.fc,
    }), dir);
    t.check('a kept tree cut short is set aside: the page surveys the directory afresh and says so',
      c.info && !c.used && c.warm === null && c.hasNew && c.notes.some((x) => x === 'The tree from the last session could not be read, so Terrane surveyed the directory afresh.'),
      JSON.stringify({ ...c, notes: c.notes }));
    t.note(`first box drawn: cold ${cold.first} ms, warm ${warmFirst} ms, after a kept tree cut short ${c.first} ms (${t.manifest.files.toLocaleString('en-US')} files)`);
  },
};
