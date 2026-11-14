/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Hardening Scenarios (Terrane Edition - v1.3)
 *     - File Name: hardening.mjs
 *     - Relative Path: tools/ui-scenarios/hardening.mjs
 *     - Artifact Type: test
 *     - Version: 1.3.0
 *     - Date: 11/13/2026
 *     - Update: Friday, November 13, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Changelog:
 *     - 1.3.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] — A
 *       page opened from another server now runs the demo world: the
 *       check asks that it surveys the world and sends nothing to /api/,
 *       and the message about starting the service is checked from disk.
 *     - 1.2.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] — The
 *       on-disk scenario checks that the address and the kept view leave
 *       a folder deleted from outside while you were in it: both name
 *       where the location went, and after a reload no notice names the
 *       folder that went and the address names where the page is
 *       (without WebGL, exactly the kept folder).
 *     - 1.1.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] — The
 *       single-key check follows the new default: cleared to what a
 *       first visit gets, T on a toolbar button starts nothing while T
 *       in the world looks back; turned on in the guide, T on the button
 *       acts too, and the choice is kept in this browser.
 *     - 1.0.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] —
 *       Initial release: the page-side checks of the hardening pass.
 *
 * ✒ Description:
 *     The checks that would have caught the page-side findings of the
 *     hardening audit, in a real browser with WebGL on and off: focus that
 *     stays where a redraw put it, panels and a narrow window, contrast,
 *     live regions, menus, the single-key setting, the forced unfold, the
 *     search after a benchmark, and a page the service did not serve. A
 *     second scenario changes the disk: a folder deleted from outside, a
 *     list reordered under its cursor, and Rescan all with a search.
 *
 * ✒ Key Features:
 *     - Keyboard first: Tab, Enter, Space, the arrows, [ ], ?, B, H, J, 0
 *     - A narrow window (800 by 500, as 200% zoom on 1600 by 1000): the
 *       inspector opens as a drawer, the title block and the tabs fit
 *     - The forced unfold that J leaves ends at the overview and when the
 *       location settles off its branch (WebGL pass)
 *     - The page opened from disk says how to start the service; opened
 *       from another server it runs the demo world; neither asks a
 *       service for anything
 *     - Frames redrawn only for a hover place no labels (WebGL pass)
 *     - On disk: the refresh chain survives a folder deleted from outside,
 *       and the address and the kept view leave it, after a reload too;
 *       the time view's Since section follows the table a change rebuilt,
 *       the cursor follows its item, Rescan all leaves no old node behind
 *       and the sessions are found only when read
 *
 * ✒ Usage Instructions:
 *     node tools/ui-check.mjs hardening hardening-disk [--pass webgl|nogl]
 *
 * ✒ Other Important Information:
 *     - Dependencies: tools/ui-check.mjs (the context t); node:http for the
 *       stand-in other server, on the ui-check port plus five
 *     - Compatible platforms: Node.js 22.5+
 * ----------------------------------------------------------------------------
 */

import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const WEB = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'web');

/** In the page: contrast of a colour on a background, both CSS colours. */
const CONTRAST = `(() => {
  const probe = document.createElement('i');
  document.body.append(probe);
  const rgb = (c) => { probe.style.color = c; return getComputedStyle(probe).color.match(/[\\d.]+/g).slice(0, 3).map(Number); };
  const lum = (c) => rgb(c).map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)).reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0);
  window.__contrast = (fg, bg) => { const a = lum(fg), b = lum(bg); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); };
  return true;
})()`;

/** Where focus is, as tag#id.class "text". */
const where = (t) => t.focused();

async function narrow(t, on) {
  await t.page.send('Emulation.setDeviceMetricsOverride', on ? { width: 800, height: 500, deviceScaleFactor: 1, mobile: false } : { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false });
  await t.sleep(400);
}

const hardening = {
  name: 'hardening',
  title: 'Hardening: focus, panels, a narrow window, contrast, live regions, menus, the forced unfold',
  data: 'fixture',
  timeout: 240000,
  async run(t) {
    await t.eval(CONTRAST);

    /* ---- contrast of the text roles ---- */
    const c = await t.eval(() => {
      const v = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
      const f = window.__contrast;
      return {
        text3: ['--chalk', '--bone', '--paper', '--white'].map((b) => +f(v('--text-3'), v(b)).toFixed(2)),
        onMark: +f(v('--text-2'), v('--mark')).toFixed(2),
        search: ['--chalk', '--bone', '--paper'].map((b) => +f(v('--search-text'), v(b)).toFixed(2)),
      };
    });
    t.check(`--text-3 reads at 4.5:1 or more on every surface (${c.text3.join(', ')}), --text-2 on the highlighter (${c.onMark}), and the search's text colour (${c.search.join(', ')})`,
      c.text3.every((x) => x >= 4.5) && c.onMark >= 4.5 && c.search.every((x) => x >= 4.5), JSON.stringify(c));

    /* ---- live regions ---- */
    const live = await t.eval(() => ({
      alt: document.getElementById('alt-val').getAttribute('aria-live'),
      statusRole: document.getElementById('status').getAttribute('role'),
      labelRole: document.getElementById('status-label').getAttribute('role'),
    }));
    t.check('the altitude readout is not a live region, and the status cell announces its state, not its counting figures',
      live.alt === 'off' && live.statusRole === null && live.labelRole === 'status', JSON.stringify(live));
    await t.eval(() => {
      window.__mut = { label: 0, alt: 0 };
      const watch = (id, k) => new MutationObserver((m) => { window.__mut[k] += m.length; }).observe(document.getElementById(id), { childList: true, characterData: true, subtree: true });
      watch('status-label', 'label');
      watch('alt-val', 'alt');
      return true;
    });
    await t.tabTo('#ledger-list');
    await t.key('Home');
    const firstDir = await t.app((T) => T.list.items[T.list.cursor]?.d === true);
    if (firstDir) {
      await t.key('Enter');
      await t.settle();
      await t.key('Backspace');
      await t.settle();
    }
    const muts = await t.eval(() => window.__mut);
    t.check(`going into a folder and back writes nothing to the status label (${muts.label} changes)`, muts.label === 0, JSON.stringify(muts));

    /* ---- the ledger list is named and many can be chosen ---- */
    const lb = await t.eval(() => ({ label: document.getElementById('ledger-list').getAttribute('aria-label'), multi: document.getElementById('ledger-list').getAttribute('aria-multiselectable') }));
    t.check(`the ledger list has a name ("${lb.label}") and says several rows can be selected`, /^Contents of /.test(lb.label || '') && lb.multi === 'true', JSON.stringify(lb));

    /* ---- Find's clear button is out of the tab order while Find is empty ---- */
    await t.key('/');
    await t.key('Tab');
    const afterFind = await where(t);
    t.check(`Tab from an empty Find does not land on the hidden clear button (it went to ${afterFind})`, !/q-clear/.test(afterFind), afterFind);

    /* ---- focus stays where the control was rebuilt ---- */
    await t.tabTo('#lens [aria-checked=true]', { max: 120 });
    await t.tabTo('#legend .chip');
    const chip = await t.eval(() => document.activeElement.textContent.trim());
    await t.key('Enter');
    const afterChip = await t.eval(() => ({ text: document.activeElement?.textContent.trim(), tag: document.activeElement?.tagName, pressed: document.activeElement?.getAttribute('aria-pressed') }));
    t.check(`Enter on the kind chip ${chip} isolates it and focus stays on it`, afterChip.text === chip && afterChip.pressed === 'true', JSON.stringify(afterChip));
    await t.key('Escape');
    await t.tabTo('#ledger-sub .sort', { max: 120 });
    await t.tabTo('#ledger-sub .sort[aria-pressed=false]', { max: 6 });
    const sortName = await t.eval(() => document.activeElement.textContent.trim());
    await t.key('Enter');
    const afterSort = await t.eval(() => ({ text: document.activeElement?.textContent.trim(), pressed: document.activeElement?.getAttribute('aria-pressed'), cls: document.activeElement?.className }));
    t.check(`Enter on the ${sortName} sort key sorts by it and focus stays on it`, afterSort.text === sortName && afterSort.pressed === 'true' && afterSort.cls === 'sort', JSON.stringify(afterSort));
    // The Survey tab: Enter on a largest file reveals it, and focus stays on that row.
    await t.tabTo('.tabs [data-tab=survey]', { back: true, max: 40 });
    await t.key('Enter');
    await t.waitFor(() => !!document.querySelector('#ledger-rich details'));
    await t.tabTo('#ledger-rich .item', { max: 40 });
    const item = await t.eval(() => document.activeElement.querySelector('.nm')?.textContent);
    await t.key('Enter');
    await t.settle();
    const afterItem = await t.eval(() => ({ nm: document.activeElement?.querySelector?.('.nm')?.textContent ?? null, tag: document.activeElement?.tagName }));
    t.check(`Enter on "${item}" in the Survey tab reveals it, and focus stays on its row`, afterItem.nm === item, JSON.stringify(afterItem));
    await t.key('Tab');
    const next = await where(t);
    t.check(`the next Tab goes on from there (${next}), not from the top of the page`, next !== 'body' && !/^summary/.test(next), next);
    await t.tabTo('.tabs [data-tab=contents]', { back: true, max: 80 });
    await t.key('Enter');

    /* ---- hiding a panel that holds focus ---- */
    await t.tabTo('#ledger-list', { max: 40 });
    await t.key('[');
    const hid = await t.eval(() => ({ cls: document.body.classList.contains('no-ledger'), active: document.activeElement?.id || document.activeElement?.tagName, live: document.getElementById('live').textContent }));
    t.check(`[ with focus in the ledger hides it and hands focus to its toggle (${hid.active}), and says so`, hid.cls && hid.active === 'v-ledger' && /Ledger hidden/.test(hid.live), JSON.stringify(hid));
    await t.key('[');
    await t.waitFor(() => !document.body.classList.contains('no-ledger'));

    /* ---- menus: an unavailable item is reached and says why ---- */
    await t.tabTo('#view', { max: 80 });
    await t.app((T) => { T.api.select(null); return true; });
    await t.key('ContextMenu');
    await t.waitFor(() => !document.getElementById('menu').hidden);
    const seen = [];
    for (let i = 0; i < 12; i++) {
      const it = await t.eval(() => ({ label: document.activeElement?.querySelector('.menu-label')?.textContent, off: document.activeElement?.getAttribute('aria-disabled'), desc: document.getElementById(document.activeElement?.getAttribute('aria-describedby') || '-')?.textContent || '' }));
      seen.push(it);
      await t.key('ArrowDown');
    }
    const offSeen = seen.filter((x) => x.off === 'true');
    const outline = await t.eval(() => getComputedStyle(document.activeElement).outlineStyle);
    t.check(`the arrows reach an unavailable item, whose reason is its description (${offSeen.map((x) => `${x.label}: ${x.desc}`).join('; ')})`,
      offSeen.length > 0 && offSeen.every((x) => x.desc), JSON.stringify(seen));
    t.check(`the keyboard's menu item is edged in ink, not only highlighted (outline ${outline})`, outline === 'solid', outline);
    await t.key('Escape');

    /* ---- the guide's setting for single-key shortcuts ---- */
    // Off by default. The harness turns it on for every page; clear that to
    // see what a first visit gets.
    await t.eval(() => { localStorage.removeItem('terrane.single-keys'); return true; });
    await t.tabTo('#b-help', { max: 120 });
    await t.key('T');
    const offButton = await t.app((T) => T.S.time === null);
    await t.tabTo('#view', { max: 80 });
    await t.key('T');
    const onCanvas = await t.until((T) => !!T.S.time);
    t.check('by default, T on a toolbar button starts nothing, and T in the world still looks back', offButton && !!onCanvas);
    await t.key('Escape');
    await t.waitFor((T) => T.S.time === null);
    // Turned on in the guide.
    await t.tabTo('#b-help', { max: 120 });
    await t.key('Enter');
    await t.waitFor(() => document.getElementById('dialog').open);
    const g = await t.eval(() => {
      const box = document.getElementById('pref-single-keys');
      return { box: !!box, checked: !!box?.checked, focus: document.activeElement?.textContent?.trim() };
    });
    t.check('the guide opens on its Close button and offers the setting for single-key shortcuts, off', g.box && !g.checked && g.focus === 'Close', JSON.stringify(g));
    await t.tabTo('#pref-single-keys', { back: true, max: 4 });
    await t.key('Space');
    await t.key('Escape');
    await t.waitFor(() => !document.getElementById('dialog').open);
    await t.tabTo('#b-help', { max: 120 });
    await t.key('T');
    const onButton = await t.until((T) => !!T.S.time);
    const kept = await t.eval(() => localStorage.getItem('terrane.single-keys'));
    t.check('turned on in the guide, T on a toolbar button looks back too, and the choice is kept in this browser', !!onButton && kept === 'everywhere', String(kept));
    await t.key('Escape');
    await t.waitFor((T) => T.S.time === null);

    /* ---- is:benchmark follows the store ---- */
    await t.key('/');
    await t.type('is:benchmark');
    await t.waitFor((T) => T.S.query === 'is:benchmark' && !!T.S.search);
    const bench = await t.app((T) => {
      const d = T.S.model.root.c.find((c) => c.d && !c.e && c.c.length && !T.places.find(c));
      if (d) T.api.select(d);
      return d?.n;
    });
    await t.tabTo('#view', { max: 80 });
    await t.key('B');
    const found = await t.until((T) => T.places.benchmarks.length > 0 && T.S.search?.list.length > 0 && { n: T.S.search.list.length, q: document.getElementById('q-count').textContent });
    t.check(`with is:benchmark in Find, setting a benchmark on ${bench} finds it at once (${found && found.q})`, !!found && found.n === 1 && found.q === '1 found', JSON.stringify(found));
    await t.app((T) => { T.places.clear(); T.places.flush(); T.api.setQuery(''); return true; });

    /* ---- without WebGL ---- */
    if (!t.gl) {
      const ng = await t.eval(() => ({
        travel: ['v-in', 'v-out', 'v-left', 'v-right', 'v-down', 'v-over'].map((id) => document.getElementById(id).checkVisibility()),
        kept: ['v-go', 'v-ledger', 'v-inspector'].map((id) => document.getElementById(id).checkVisibility()),
        label: document.getElementById('view').getAttribute('aria-label'),
      }));
      t.check('without WebGL the travel tools are gone, Go to selection and the panel toggles stay, and the canvas says the world is unavailable',
        ng.travel.every((x) => !x) && ng.kept.every(Boolean) && /unavailable/.test(ng.label), JSON.stringify(ng));
    }

    /* ---- reduced motion covers the backdrop ---- */
    await t.page.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    await t.tabTo('#view', { max: 80 });
    await t.key('?');
    await t.waitFor(() => document.getElementById('dialog').open);
    const bd = await t.eval(() => getComputedStyle(document.getElementById('dialog'), '::backdrop').transitionDuration);
    t.check(`under reduced motion the dialog's backdrop does not fade (${bd})`, bd.split(',').every((d) => parseFloat(d) <= 0.001), bd);
    await t.key('Escape');
    await t.page.send('Emulation.setEmulatedMedia', { features: [] });

    /* ---- the forced unfold J leaves (WebGL) ---- */
    if (t.gl) {
      const deep = t.manifest.chain.dirs[5];
      await t.app((T, r) => { T.api.setFocus(T.S.model.find(r)); return true; }, deep);
      await t.settle();
      await t.tabTo('#view', { max: 80 });
      await t.key('H');
      await t.key('0');
      await t.settle();
      const atOverview = await t.app((T, r) => ({ force: T.S.force, drawn: T.S.layout.index.has(T.S.model.find(r)) }), deep);
      t.check('0 rises to the overview and lets the forced unfold go: the deep folder folds as distance says', atOverview.force === null && !atOverview.drawn, JSON.stringify(atOverview));
      await t.key('J');
      await t.settle();
      await t.sleep(900);
      await t.settle();
      const after = await t.app((T, r) => ({ forced: !!T.S.force?.has(T.S.model.find(r)), focus: T.api.relPath(T.S.focus) }), deep);
      await t.key('0');
      await t.settle();
      const back = await t.app((T, r) => ({ force: T.S.force, drawn: T.S.layout.index.has(T.S.model.find(r)) }), deep);
      t.check(`J opens the way to ${deep}, and the overview ends that unfold`, after.forced && back.force === null && !back.drawn, JSON.stringify({ after, back }));
      // Going there opens the way the same way (setFocus, as J does).
      await t.app((T, r) => { T.api.setFocus(T.S.model.find(r)); return true; }, deep);
      await t.settle();
      const again = await t.app((T, r) => !!T.S.force?.has(T.S.model.find(r)), deep);
      // The camera goes to another top-level folder without setFocus: once
      // the location settles there, off the branch, the unfold ends.
      await t.app((T, r) => {
        const top = r.split('/')[0];
        const other = T.S.model.root.c.filter((c) => c.d && c.n !== top && T.S.layout.index.has(c)).sort((a, b) => b.s - a.s)[0];
        T.S.view.frame(T.S.layout.index.get(other));
        return true;
      }, deep);
      await t.settle();
      await t.sleep(600);
      await t.settle();
      const off = await t.app((T, r) => ({ force: T.S.force, focus: T.api.relPath(T.S.focus), under: T.api.relPath(T.S.focus).startsWith(r.split('/')[0]) }), deep);
      t.check(`and when the location settles off that branch (${off.focus}) the unfold ends too`, again && off.force === null && !off.under, JSON.stringify(off));
      await t.key('0');
      await t.settle();
    }

    /* ---- labels are not placed again for a hover (WebGL) ---- */
    if (t.gl) {
      await t.settle();
      const lp = await t.app(async (T) => {
        const v = T.S.view;
        const frame = () => new Promise((r) => requestAnimationFrame(() => r()));
        await frame();
        await frame();
        const before = v.labelPasses;
        for (let i = 0; i < 6; i++) {
          v.setHover(i % 2 ? 3 : 4);
          await frame();
        }
        v.setHover(-1);
        await frame();
        const hovered = v.labelPasses;
        v.turn(0.05);
        await new Promise((r) => setTimeout(r, 500));
        return { before, hovered, turned: v.labelPasses };
      });
      t.check(`frames redrawn only for a hover place no labels (${lp.hovered - lp.before} passes over 7 frames); a turn does (${lp.turned - lp.hovered})`,
        lp.hovered === lp.before && lp.turned > lp.hovered, JSON.stringify(lp));
      await t.key('0');
      await t.settle();
    }

    /* ---- a narrow window: 800 by 500, as 200% zoom ---- */
    await narrow(t, true);
    const n0 = await t.eval(() => {
      const r = (s) => document.querySelector(s)?.getBoundingClientRect();
      const tabs = [...document.querySelectorAll('.tabs [role=tab]')].map((b) => b.getBoundingClientRect().right);
      return {
        insp: getComputedStyle(document.getElementById('inspector')).visibility,
        pressed: document.getElementById('v-inspector').getAttribute('aria-pressed'),
        status: r('.cell-status').right, legend: r('.cell-grow').width, width: innerWidth,
        tabsFit: Math.max(...tabs) <= r('#ledger').right + 0.5,
      };
    });
    t.check(`at 800 px the inspector is folded away and its toggle says so (pressed ${n0.pressed})`, n0.insp === 'hidden' && n0.pressed === 'false', JSON.stringify(n0));
    t.check(`the title block fits: the status cell ends at ${Math.round(n0.status)} of ${n0.width} px, the legend keeps ${Math.round(n0.legend)} px; every tab fits the ledger`,
      n0.status <= n0.width + 0.5 && n0.legend >= 80 && n0.tabsFit, JSON.stringify(n0));
    await t.tabTo('#view', { max: 80 });
    await t.key(']');
    await t.sleep(400);
    const n1 = await t.eval(() => ({ vis: getComputedStyle(document.getElementById('inspector')).visibility, w: document.getElementById('inspector').getBoundingClientRect().width, pressed: document.getElementById('v-inspector').getAttribute('aria-pressed') }));
    t.check(`] opens the inspector as a drawer (${Math.round(n1.w)} px wide) and its toggle says pressed`, n1.vis === 'visible' && n1.w > 150 && n1.pressed === 'true', JSON.stringify(n1));
    await t.key(']');
    await t.sleep(400);
    const n2 = await t.eval(() => ({ vis: getComputedStyle(document.getElementById('inspector')).visibility, pressed: document.getElementById('v-inspector').getAttribute('aria-pressed') }));
    t.check('] again closes it', n2.vis === 'hidden' && n2.pressed === 'false', JSON.stringify(n2));
    await narrow(t, false);
    const wide = await t.eval(() => ({ vis: getComputedStyle(document.getElementById('inspector')).visibility, pressed: document.getElementById('v-inspector').getAttribute('aria-pressed') }));
    t.check('back at full width the inspector is shown and its toggle follows', wide.vis === 'visible' && wide.pressed === 'true', JSON.stringify(wide));

    /* ---- a page the service did not serve ---- */
    const port = Number(new URL(t.url).port) + 5;
    const server = http.createServer((req, res) => {
      const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      const file = path.join(WEB, rel === '/' ? 'index.html' : rel);
      if (!file.startsWith(WEB) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404);
        res.end('not here');
        return;
      }
      const type = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' }[path.extname(file)] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': type });
      res.end(fs.readFileSync(file));
    });
    await new Promise((r) => server.listen(port, '127.0.0.1', r));
    try {
      {
        const mark = t.mark();
        await t.page.send('Page.navigate', { url: `http://127.0.0.1:${port}/?still` });
        const demo = await t.until(() => {
          const T = window.__terrane;
          return !!T && !T.S.scanning && !!T.S.info?.demo && document.getElementById('splash').hidden && {
            files: T.S.model.root.fc, want: T.S.info.demo.files, status: document.getElementById('status-label')?.textContent,
          };
        }, { timeout: 20000 });
        const asked = t.requests(mark).filter((r) => /\/api\//.test(r.url));
        t.check(`opened from another server, the page runs the demo world (${demo?.files} files) and says so`,
          !!demo && demo.files === demo.want && /Demo world/.test(demo.status), JSON.stringify(demo));
        t.check(`and sends nothing to /api/ (${asked.length} requests)`, asked.length === 0, JSON.stringify(asked));
      }
      for (const [what, url] of [['a file on disk', pathToFileURL(path.join(WEB, 'index.html')).href]]) {
        const mark = t.mark();
        await t.page.send('Page.navigate', { url });
        const shown = await t.until(() => {
          const v = document.getElementById('veil');
          return !!v && !v.hidden && /runs from its local service/.test(v.textContent) && {
            splash: document.getElementById('splash').hidden,
            text: v.textContent,
            link: v.querySelector('a')?.href,
            inert: document.getElementById('bar').inert,
          };
        }, { timeout: 8000 });
        const asked = t.requests(mark).filter((r) => /\/api\//.test(r.url));
        t.check(`opened from ${what}, the page says Terrane runs from its local service, with the command and the repository, and the loading sheet has left`,
          !!shown && shown.splash && /npm start/.test(shown.text) && shown.link === 'https://github.com/dnoice/terrane' && shown.inert && !/answered 404/.test(shown.text), JSON.stringify(shown));
        t.check(`and it asks the service for nothing (${asked.length} requests to /api/)`, asked.length === 0, JSON.stringify(asked));
      }
    } finally {
      await new Promise((r) => server.close(r));
    }
    // Back to the service, for the end-of-scenario checks.
    await t.page.send('Page.navigate', { url: t.url });
    await t.until((T) => !!T && !T.S.scanning && document.getElementById('splash').hidden, { timeout: 30000 });
  },
};

const disk = {
  name: 'hardening-disk',
  title: 'Hardening on disk: a folder deleted from outside, a list reordered under its cursor, Rescan all with a search',
  data: 'fixture',
  write: true,
  timeout: 240000,
  async run(t) {
    await t.page.send('Page.addScriptToEvaluateOnNewDocument', {
      source: '(() => { const ES = window.EventSource; window.EventSource = class extends ES { constructor(...a) { super(...a); window.__events = this; } }; })();',
    });
    await t.reload();
    await t.waitFor((T) => T.S.watch === 'live', { timeout: 10000, what: 'the watcher' });

    /* ---- a folder deleted from outside, then F5 on it ---- */
    const gone = 'hz-gone';
    fs.mkdirSync(t.abs(`${gone}/inner/deeper`), { recursive: true });
    for (let k = 0; k < 5; k++) fs.writeFileSync(t.abs(`${gone}/inner/f${k}.txt`), `file ${k}`);
    fs.writeFileSync(t.abs(`${gone}/inner/deeper/x.txt`), 'x');
    await t.waitFor((T, r) => !!T.S.model.find(r), { args: [`${gone}/inner/deeper/x.txt`], timeout: 10000, what: 'the new folder in the model' });
    await t.app((T, r) => { T.api.setFocus(T.S.model.find(r)); return true; }, `${gone}/inner`);
    await t.settle();
    fs.rmSync(t.abs(gone), { recursive: true, force: true });
    await t.tabTo('#view', { max: 80 });
    await t.key('F5');
    await t.sleep(500);
    fs.writeFileSync(t.abs('hz-after-delete.txt'), 'after');
    const after = await t.until((T, a) => !!T.S.model.find('hz-after-delete.txt') && !T.S.model.find(a) && { focus: T.api.relPath(T.S.focus) }, { args: [gone], timeout: 10000 });
    t.check('after a folder is deleted from outside and F5 re-reads it, it leaves the model and a later change still arrives', !!after, JSON.stringify(after));
    const chain = await t.app(async (T) => {
      const r = await Promise.race([T.api.refreshDirs(['']).then(() => 'settled'), new Promise((res) => setTimeout(() => res('stuck'), 4000))]);
      return r;
    });
    t.check(`the refresh chain still settles (${chain})`, chain === 'settled');

    /* ---- the address and the kept view leave the folder that went ---- */
    const viewKey = await t.app((T) => `terrane.view.v1|${T.S.info.root}`);
    const followed = await t.until((T, k, g) => {
      let kept = null;
      try {
        kept = JSON.parse(localStorage.getItem(k) || 'null');
      } catch { /* not kept */ }
      const here = T.api.relPath(T.S.focus);
      const hash = here ? `#/${here.split('/').map(encodeURIComponent).join('/')}` : '#/';
      return kept && kept.focus === here && location.hash === hash && !here.startsWith(g) && { hash: location.hash, kept: kept.focus, focus: here };
    }, { args: [viewKey, gone], timeout: 5000 });
    const stale = await t.app((T, k) => ({ hash: location.hash, kept: JSON.parse(localStorage.getItem(k) || 'null')?.focus, focus: T.api.relPath(T.S.focus) }), viewKey);
    t.check(`with the folder you were in gone from disk, the address and the kept view follow the location (${followed ? followed.hash : stale.hash})`, !!followed, JSON.stringify(stale));
    await t.reload();
    await t.waitFor((T) => T.S.watch === 'live', { timeout: 10000, what: 'the watcher after the reload' });
    await t.sleep(600);
    const reopened = await t.app((T, g) => ({
      notices: [...document.querySelectorAll('#notices .notice-text')].map((x) => x.textContent).filter((x) => x.includes(g) || x.startsWith('Nothing at')),
      focus: T.api.relPath(T.S.focus), hash: location.hash,
    }), gone);
    const hashOf = (rel) => (rel ? `#/${rel.split('/').map(encodeURIComponent).join('/')}` : '#/');
    // Without WebGL the location is set, not derived from the eye, so it is exactly the kept folder.
    t.check('after a reload nothing names the folder that went, and the address names where the page is',
      reopened.notices.length === 0 && reopened.hash === hashOf(reopened.focus) && !reopened.focus.startsWith(gone)
      && (t.gl || (!!followed && reopened.focus === followed.focus)), JSON.stringify({ reopened, followed }));

    /* ---- the time view follows the age table a change rebuilt ---- */
    const bulk = t.manifest.bulk.dir;
    await t.app((T, r) => { T.api.setFocus(T.S.model.find(r).p || T.S.model.root); T.api.select(T.S.model.find(r)); return true; }, bulk);
    await t.settle();
    await t.tabTo('#view', { max: 120 });
    await t.key('T');
    await t.waitFor((T) => !!T.S.time && !!document.querySelector('#inspector-body .facts.since'), { what: 'the Since section' });
    const since = () => t.app((T, r) => {
      const node = T.S.model.find(r);
      const cf = T.S.ages.changedFiles(node, T.S.time.k);
      return { cf, anchor: T.S.ages.anchor, text: document.querySelector('#inspector-body .facts.since dd')?.textContent || '' };
    }, bulk);
    const s0 = await since();
    for (let k = 0; k < 3; k++) fs.writeFileSync(t.abs(`${bulk}/hz-since-${k}.txt`), `since ${k}`);
    // The survey that counts the new files rebuilds the table; then the inspector must follow it.
    await t.waitFor((T, r, n) => T.S.ages.changedFiles(T.S.model.find(r), T.S.time.k) === n, { args: [bulk, s0.cf + 3], timeout: 10000, what: 'the survey that counts the new files' });
    await t.sleep(300);
    const s1 = await since();
    const files = (n) => `${n.toLocaleString('en-US')} file${n === 1 ? '' : 's'}`;
    t.check(`after a change and the survey it brings, the Since section reads the new table: ${files(s1.cf)} changed (it said ${files(s0.cf)})`,
      s1.cf === s0.cf + 3 && s1.text.includes(files(s1.cf)), JSON.stringify({ s0, s1 }));
    await t.key('Escape');
    await t.waitFor((T) => !T.S.time);

    /* ---- the cursor stays on its item when the list reorders ---- */
    await t.app((T) => { T.api.setFocus(T.S.model.root); return true; });
    await t.settle();
    await t.tabTo('#ledger-sub .sort', { max: 120 });
    await t.tabTo('#ledger-sub .sort[aria-pressed=false]', { max: 6 });
    while (!(await t.eval(() => /Changed/.test(document.activeElement.textContent)))) await t.key('Tab');
    await t.key('Enter');
    await t.tabTo('#ledger-list', { max: 10 });
    await t.keys('Home', 'ArrowDown', 'ArrowDown');
    const before = await t.app((T) => ({ cursor: T.list.cursor, on: T.list.items[T.list.cursor]?.n, primary: T.S.primary?.n ?? null }));
    fs.writeFileSync(t.abs('aaa-newest-probe.txt'), 'newest');
    await t.waitFor((T) => !!T.S.model.find('aaa-newest-probe.txt') && T.list.items.some((n) => n.n === 'aaa-newest-probe.txt'), { timeout: 10000, what: 'the new file in Contents' });
    const moved = await t.app((T) => ({ cursor: T.list.cursor, on: T.list.items[T.list.cursor]?.n, primary: T.S.primary?.n, dom: document.querySelector('#ledger-list .row.is-cursor .row-name')?.firstChild?.textContent }));
    t.check(`a new file reorders Contents and the cursor stays on ${before.on} (row ${before.cursor} → ${moved.cursor})`,
      before.cursor === 2 && before.on === before.primary && moved.cursor === 3 && moved.on === before.on && moved.on === moved.primary && moved.dom === before.on, JSON.stringify({ before, moved }));

    /* ---- Rescan all with a search showing ---- */
    await t.key('/');
    await t.type('ext:csv');
    await t.waitFor((T) => T.S.search?.list.length > 0);
    const n = await t.app((T) => T.S.search.list.length);
    await t.app(() => { window.__events.onmessage({ data: JSON.stringify({ type: 'bulk', count: 400 }) }); return true; });
    await t.waitFor(() => [...document.querySelectorAll('#notices .notice')].some((x) => /folders changed on disk/.test(x.textContent)));
    await t.app(() => { [...document.querySelectorAll('#notices .notice')].find((x) => /folders changed on disk/.test(x.textContent))?.setAttribute('data-check', 'rescan'); return true; });
    await t.tabTo('[data-check="rescan"] .btn', { max: 200 });
    await t.key('Enter');
    await t.waitFor((T) => T.S.scanning, { what: 'Rescan all to begin' });
    await t.waitFor((T) => !T.S.scanning && !!T.S.survey, { timeout: 30000, what: 'Rescan all to finish' });
    await t.settle();
    const r = await t.app((T) => {
      const S = T.S;
      return {
        found: S.search?.list.length ?? null,
        attached: S.search ? S.search.list.filter((x) => T.api.isAttached(x)).length : null,
        rows: T.list.items.length,
        rowsAttached: T.list.items.filter((x) => T.api.isAttached(x)).length,
        q: document.getElementById('q-count').textContent,
        force: S.force,
        sessions: !!S.sessions && S.sessions.found === false,
      };
    });
    t.check(`after Rescan all the search is of the new tree: ${r.found} found, all attached, as Findings and the count say (${r.q})`,
      r.found === n && r.attached === n && r.rows === n && r.rowsAttached === n && r.q === `${n} found`, JSON.stringify(r));
    t.check('and nothing else holds the old tree: no forced unfold, sessions found only when read', r.force === null && r.sessions, JSON.stringify(r));
  },
};

export default [hardening, disk];
