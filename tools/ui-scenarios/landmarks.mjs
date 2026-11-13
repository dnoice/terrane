/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Landmarks Scenario (Terrane Edition - v1.0)
 *     - File Name: landmarks.mjs
 *     - Relative Path: tools/ui-scenarios/landmarks.mjs
 *     - Artifact Type: test
 *     - Version: 1.0.0
 *     - Date: 11/12/2026
 *     - Update: Thursday, November 12, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Description:
 *     Checks benchmarks and the return point in the real page, by
 *     keyboard: B on the folder you are in and on a selection, the Places
 *     tab, Fly there, H and J, the persistence across a reload, and what
 *     happens on disk: a file written into a benchmarked folder, a rename,
 *     a move and a removal through Terrane (and their undo), and a rename
 *     outside it.
 *
 * ✒ Key Features:
 *     - landmarks (read-only fixture, both passes): B reads the folder from
 *       disk before its notice; the store, the storage key, the verdigris
 *       pin standing upright on the peak and the .tag-bench tag; the
 *       inspector section, hover line, menu items and guide rows; B again
 *       with Undo; Find is:benchmark; Tab, Enter, Tab, Enter from the
 *       Places tab to Fly there;
 *       H, 0, J and J again (the folder, without WebGL); a reload that
 *       resolves every benchmark and folds a deep one into its mass's pin;
 *       draw calls and frame time with 64 benchmarks, and the 65th refused;
 *       a storage object that throws
 *     - landmarks-disk (a writable fixture, both passes): "+1 file" in the
 *       Places tab after the watcher's refresh, the change notice after a
 *       reload, a rename and a move kept attached and carried back by
 *       Undo, a removal to the holding area said as such and found again
 *       by Undo, and a rename outside Terrane marked missing with a
 *       sentence and Forget, then forgotten from the keyboard
 *     - Every benchmark and the storage key are removed when a scenario
 *       ends, so later scenarios on the same address see none
 *
 * ✒ Usage Instructions:
 *     node tools/ui-check.mjs landmarks
 *     node tools/ui-check.mjs landmarks landmarks-disk --pass nogl
 *
 * ✒ Other Important Information:
 *     - Dependencies: tools/ui-check.mjs (the context t), the fixture's
 *       manifest (the 13-level chain and the bulk-write folder); the
 *       page's js/places.js, imported in the page for the vantage
 *     - Compatible platforms: Node.js 22.5+
 * ----------------------------------------------------------------------------
 */

import fs from 'node:fs';

const VERDIGRIS = 0x1f7f73;
const DATE_TIME = /\d\d\/\d\d\/\d{4} \d\d:\d\d/;
const WORDS = /creat|arriv|\badded\b/i;

/* ---------- helpers that run in the page ---------- */

/** Records every notice with the moment it appeared, starting with those already shown. */
function listenNotices() {
  window.__notices = [];
  window.__noticeObs?.disconnect();
  const host = document.getElementById('notices');
  for (const n of host.querySelectorAll('.notice')) {
    window.__notices.push({ text: n.querySelector('.notice-text')?.textContent, at: 0, action: n.querySelector('.btn')?.textContent || null });
  }
  window.__noticeObs = new MutationObserver((list) => {
    for (const m of list) {
      for (const n of m.addedNodes) {
        const text = n.querySelector?.('.notice-text')?.textContent;
        if (text) window.__notices.push({ text, at: performance.now(), action: n.querySelector('.btn')?.textContent || null });
      }
    }
  });
  window.__noticeObs.observe(host, { childList: true });
  return true;
}

/** Forgets every benchmark and the return point and removes the storage key. */
function cleanup(T) {
  if (window.__storageDesc) {
    Object.defineProperty(window, 'localStorage', window.__storageDesc);
    delete window.__storageDesc;
  }
  const P = T.places;
  if (!P) return false;
  P.clear();
  P.flush();
  try {
    localStorage.removeItem(P.key);
  } catch { /* the check that needs storage reports it */ }
  T.api.relayout({ animate: false });
  T.api.drawLedger();
  return true;
}

/** The store, summarised for checks. */
function state(T) {
  const P = T.places;
  return {
    n: P.benchmarks.length,
    list: P.benchmarks.map((b) => ({ id: b.id, rel: b.rel, name: b.name, at: b.m.at, found: !!b.node, nodeName: b.node?.n ?? null, sum: P.summary(b) })),
    ret: P.ret,
    failed: P.failed,
    stored: (() => { try { return localStorage.getItem(P.key); } catch { return 'unreadable'; } })(),
  };
}

/** Reloads the page and waits for its survey. */
async function reload(t) {
  await t.eval(() => { window.__oldPage = true; return true; });
  await t.page.send('Page.reload', {});
  await t.waitFor((T) => !window.__oldPage && T && !T.S.scanning && !!T.S.survey && !!T.S.ages, { timeout: 120000, what: 'the page after a reload' });
  await t.eval('document.fonts.ready.then(() => true)');
  await t.settle();
  await t.app(listenNotices);
}

/** Finds a folder by name with Find and reveals it from Findings, then clears Find. */
async function pick(t, term, rel) {
  await t.key('/');
  await t.type(term);
  await t.waitFor((T, r) => T.S.search?.list.some((n) => n === T.S.model.find(r)), { args: [rel], what: `Find to list ${rel}` });
  await t.key('Enter');
  // Findings is sorted by size; the cursor walks to the folder.
  const at = await t.app((T, r) => T.list.items.indexOf(T.S.model.find(r)), rel);
  for (let k = 0; k < at; k++) await t.key('ArrowDown');
  await t.key('Enter');
  await t.waitFor((T, r) => T.S.primary === T.S.model.find(r), { args: [rel], what: `${rel} selected` });
  await t.key('Escape');
  await t.waitFor((T) => !T.S.search);
  await t.settle();
}

/** The notices seen since listenNotices, matching re. */
const noticed = (t, re) => t.waitFor((_T, src) => window.__notices.find((n) => new RegExp(src).test(n.text)), { args: [re.source], what: `a notice matching ${re}`, timeout: 12000 });

/** Opens the Places tab from the keyboard. */
async function placesTab(t) {
  await t.tabTo('[role=tab][data-tab=places]', { back: true, max: 120 });
  await t.key('Enter');
  await t.waitFor((T) => T.S.tab === 'places' && !document.getElementById('ledger-rich').hidden);
}

/** Opens a benchmark's row in the Places tab and presses one of its buttons, all by keyboard. */
async function rowButton(t, id, cls) {
  await t.tabTo(`details.bench[data-id="${id}"] > summary`, { max: 120 });
  const open = await t.eval((i) => document.querySelector(`details.bench[data-id="${i}"]`).open, id);
  if (!open) await t.key('Enter');
  await t.waitFor((_T, i) => document.querySelector(`details.bench[data-id="${i}"]`)?.open, { args: [id] });
  await t.tabTo(`details.bench[data-id="${id}"] button.${cls}`, { max: 40 });
  await t.key('Enter');
}

/** Waits for a J or a flight to land, and for the return point's settling to finish. */
async function landed(t) {
  await t.settle();
  await t.sleep(700);
  await t.settle();
}

/** How far the eye is from a point's vantage over its folder's box where the layout puts it now. */
async function offVantage(t, point) {
  return t.app(async (T, p) => {
    const P = await import(new URL('js/places.js', document.baseURI).href);
    const node = T.S.model.find(p.rel);
    const i = T.S.layout.index.get(node);
    if (i === undefined) return { i: -1 };
    const a = P.anchorOf(T.S.layout, i);
    const v = P.vantage(p, a);
    const e = T.S.view.eye;
    return { i, w: a.w, d: Math.hypot(e.x - v.x, e.y - v.y, e.z - v.z), focus: T.S.focus.n };
  }, point);
}

/** Median script time per animation frame while W is held for ms, from the home view. */
function travelTime(T, ms) {
  return new Promise((resolve) => {
    const v = T.S.view;
    v.flyTo(v.homeView(), 0);
    const raf = window.requestAnimationFrame;
    const times = [];
    setTimeout(() => {
      window.requestAnimationFrame = (cb) => raf.call(window, (ts) => {
        const s = performance.now();
        cb(ts);
        times.push(performance.now() - s);
      });
      v.canvas.focus();
      v.canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'w', bubbles: true }));
      setTimeout(() => {
        v.canvas.dispatchEvent(new KeyboardEvent('keyup', { key: 'w', bubbles: true }));
        window.requestAnimationFrame = raf;
        const sorted = times.slice(5).sort((a, b) => a - b);
        resolve({ frames: times.length, median: sorted[sorted.length >> 1] ?? 0 });
      }, ms);
    }, 300);
  });
}

/** Sets benchmarks on the n largest folders below the root, through the store. */
function benchMany(T, n) {
  const P = T.places;
  const dirs = [];
  const stack = [T.S.model.root];
  while (stack.length) for (const c of stack.pop().c) if (c.d) { dirs.push(c); stack.push(c); }
  dirs.sort((a, b) => b.s - a.s);
  P.clear();
  for (const d of dirs.slice(0, n)) P.set(d);
  T.api.relayout({ animate: false });
  T.api.drawLedger();
  return P.benchmarks.length;
}

/* ---------- read-only: the keyboard routes ---------- */

const landmarks = {
  name: 'landmarks',
  title: 'Landmarks: benchmarks and the return point, by keyboard',
  data: 'fixture',
  timeout: 360000,
  async run(t) {
    try {
      await routes(t);
    } finally {
      await t.app(cleanup).catch(() => {});
    }
  },
};

async function routes(t) {
  const m = t.manifest;
  await t.settle();
  await t.app(listenNotices);
  const s0 = await t.app((T) => ({
    has: !!T.places && T.places === T.S.places, n: T.places?.benchmarks.length, key: T.places?.key, root: T.S.info.root, rootName: T.S.model.root.n,
    tabs: [...document.querySelectorAll('.tabs [role=tab]')].map((b) => b.dataset.tab), noGL: !!T.S.noGL,
  }));
  t.check('window.__terrane.places is the landmarks store, empty at the start', s0.has && s0.n === 0, JSON.stringify(s0));
  t.check('its storage key is terrane.places.v1|<root>', s0.key === `terrane.places.v1|${s0.root}`, s0.key);
  t.check('the Places tab is the fifth tab', JSON.stringify(s0.tabs) === JSON.stringify(['contents', 'findings', 'survey', 'journal', 'places']), JSON.stringify(s0.tabs));

  // The guide lists B, H and J under Landmarks.
  await t.key('?');
  await t.waitFor(() => document.getElementById('dialog').open);
  const guide = await t.eval(() => [...document.querySelectorAll('#dialog .guide > div')].map((d) => [d.querySelector('h3').textContent, [...d.querySelectorAll('dt')].map((x) => x.textContent)]));
  await t.key('Escape');
  await t.waitFor(() => !document.getElementById('dialog').open);
  t.check('the guide has a Landmarks section with B, H and J', guide.some(([h, keys]) => h === 'Landmarks' && JSON.stringify(keys) === JSON.stringify(['B', 'H', 'J'])), JSON.stringify(guide.at(-1)));

  // B with nothing selected: the folder you are in, read from disk first.
  await t.tabTo('#view');
  const mark = t.mark();
  await t.eval(() => { performance.clearResourceTimings(); return true; });
  await t.key('B');
  const note = await noticed(t, /^Benchmark set on /);
  const scans = t.requests(mark).filter((r) => r.path === '/api/scan');
  const timing = await t.eval(() => performance.getEntriesByType('resource').filter((e) => /\/api\/scan\?path=&depth=1$/.test(e.name)).map((e) => ({ start: e.startTime, end: e.responseEnd })));
  t.check('B with nothing selected issues GET /api/scan?path=<focus>&depth=1', scans.some((r) => r.method === 'GET' && /\?path=&depth=1$/.test(r.url) && r.status === 200), JSON.stringify(scans));
  t.check('and that read finishes before the notice appears', timing.length > 0 && timing[0].end <= note.at, JSON.stringify({ timing, at: note.at }));
  const sentence = new RegExp(`^Benchmark set on "${s0.rootName}" \\(the root\\): [\\d.]+ (B|KB|MB|GB|TB), [\\d,]+ files?, at ${DATE_TIME.source}\\.$`);
  t.check(`the notice names the folder, its size, its file count and a MM/DD/YYYY HH:MM date (${note.text})`, sentence.test(note.text) && note.action === 'Undo', note.text);
  const st1 = await t.app(state);
  t.check('window.__terrane.places.benchmarks.length === 1, on the root', st1.n === 1 && st1.list[0].rel === '' && st1.list[0].found, JSON.stringify(st1.list));
  const stored = await t.until((T) => { try { return !!localStorage.getItem(T.places.key); } catch { return false; } }, { timeout: 3000 });
  t.check('the localStorage key exists once the 1 s debounce has passed', stored === true);
  const insp = await t.app(() => {
    const host = document.getElementById('inspector-body');
    return { titles: [...host.querySelectorAll('.section-title')].map((x) => x.textContent), facts: [...host.querySelectorAll('.bench-facts dt')].map((x) => x.textContent) };
  });
  t.check('the "You are in" summary has a Benchmark section dated MM/DD/YYYY HH:MM with Then, Now and Change',
    insp.titles.some((x) => new RegExp(`^Benchmark · ${DATE_TIME.source}$`).test(x)) && JSON.stringify(insp.facts) === JSON.stringify(['Then', 'Now', 'Change']), JSON.stringify(insp));
  t.check('the Places tab carries the count', (await t.text('[role=tab][data-tab=places]')) === 'Places1');

  if (t.gl) {
    await t.settle();
    const pin = await t.app((T, c) => {
      const v = T.S.view;
      const p = v.pinList.find((x) => x.color === c);
      return p && { i: p.i, peak: !!p.peak, upright: !!p.upright, rootIndex: T.api.visibleIndexOf(T.S.model.root), count: v.pins.count };
    }, VERDIGRIS);
    t.check('S.view.pinList holds an entry in THEME.verdigris, standing upright on the peak of the root', !!pin && pin.i === pin.rootIndex && pin.peak && pin.upright, JSON.stringify(pin));
    // The upright mark's apex is above its anchor: the pin stands on the peak.
    const geo = await t.app((T) => {
      const v = T.S.view;
      const L = T.S.layout;
      const k = v.pinList.findIndex((x) => x.upright);
      const a = new Float32Array(16);
      for (let j = 0; j < 16; j++) a[j] = v.pins.instanceMatrix.array[k * 16 + j];
      return { yAxis: a[5], ty: a[13] + v.pins.position.y, peak: L.top[v.pinList[k].i] };
    });
    t.check('its instance is turned point up (a negative y axis) and its base stands above the layout\'s peak', geo.yAxis < 0 && geo.ty > geo.peak, JSON.stringify(geo));
    const tag = await t.waitFor((_T, n) => [...document.querySelectorAll('#tags .tag-bench')].find((e) => !e.hidden && e.textContent.startsWith(n))?.textContent, { args: [s0.rootName] });
    t.check(`a .tag-bench is visible in #tags (${tag})`, !!tag);
    const tip = await t.app((T) => {
      T.S.view.on.hover(0, { clientX: 300, clientY: 300 });
      const lines = [...document.querySelectorAll('#tip > div')].map((d) => d.textContent);
      T.S.view.on.hover(-1, {});
      return lines;
    });
    t.check('the hover tip over the root says when it was measured and what changed', tip.some((l) => new RegExp(`^Benchmark of ${DATE_TIME.source} · no change since$`).test(l)), JSON.stringify(tip));
    await t.shot('benchmark-root');
  }

  // The context menu for the folder you are in.
  await t.tabTo('#view');
  await t.key('Shift+F10');
  await t.waitFor(() => !document.getElementById('menu').hidden);
  const menu = await t.eval(() => [...document.querySelectorAll('#menu .menu-label')].map((x) => x.textContent));
  await t.key('Escape');
  t.check('the menu offers Measure benchmark again, Forget benchmark and Mark return point here', ['Measure benchmark again', 'Forget benchmark', 'Mark return point here'].every((x) => menu.includes(x)), JSON.stringify(menu));

  // B again measures again, with Undo.
  await t.tabTo('#view');
  await t.key('B');
  const again = await noticed(t, /^Benchmark on .* measured again: /);
  t.check(`B on a benchmark measures it again and says what it was (${again.text})`, new RegExp(`at ${DATE_TIME.source}\\. It was .* at ${DATE_TIME.source}\\.$`).test(again.text) && again.action === 'Undo', again.text);
  const before = st1.list[0].at;
  await t.waitFor((T, at) => T.places.benchmarks[0].m.at > at, { args: [before] });
  await t.tabTo('#notices .notice:last-child .btn', { max: 160 });
  await t.key('Enter');
  t.check('Undo puts the earlier measurement back', await t.until((T, at) => T.places.benchmarks[0].m.at === at, { args: [before] }) === true);

  // A benchmark on a selection: the deepest folder of the chain.
  const deep = m.chain.deepest;
  await pick(t, 'depth-13', deep);
  await t.key('B');
  await noticed(t, /^Benchmark set on "depth-13": /);
  const st2 = await t.app(state);
  t.check('B on a selected folder sets a benchmark on it', st2.n === 2 && st2.list[1].rel === deep && st2.list[1].found, JSON.stringify(st2.list.map((b) => b.rel)));
  await t.key('/');
  await t.type('is:benchmark');
  const found = await t.waitFor((T) => T.S.query === 'is:benchmark' && T.S.search && T.S.search.list.map((n) => n.n).sort());
  await t.key('Escape');
  await t.waitFor((T) => !T.S.search);
  t.check(`Find is:benchmark lists the benchmarked folders below the root (${found.join(', ')})`, JSON.stringify(found) === JSON.stringify(['depth-13']), JSON.stringify(found));
  // Escape in Find hands the keyboard to the world; the list is just before it.
  await t.tabTo('#ledger-list', { back: true });
  await t.waitFor((T, r) => T.S.primary === T.S.model.find(r), { args: [deep] });

  // Keyboard only: the Places tab, a summary, Fly there.
  await t.key('Escape');
  await t.waitFor((T) => !T.S.primary);
  await placesTab(t);
  const tabText = await t.text('#ledger-rich');
  t.check('the Places tab says where places are kept', tabText.includes('Kept in this browser for this directory at this address'), tabText.slice(0, 160));
  t.check('nothing in it says created, arrived or added', !WORDS.test(tabText), tabText.match(WORDS)?.[0]);
  await rowButton(t, st2.list[1].id, 'fly');
  const flown = await t.waitFor((T, r) => T.S.primary === T.S.model.find(r) && T.S.primary.n, { args: [deep], what: 'Fly there to select the folder' });
  t.check(`Tab to Places, Enter on a benchmark summary, Tab to Fly there, Enter: S.primary is ${flown}`, flown === 'depth-13');
  t.check('the focus stays on Fly there through the redraw', await t.eval(() => document.activeElement?.classList.contains('fly')));
  await t.shot('places-tab');

  // H, 0, J; J again.
  if (t.gl) {
    await t.settle();
    await t.tabTo('#view', { max: 160 });
    await t.key('Escape');
    await t.key('H');
    const h = await t.waitFor((T) => T.places.ret && { ret: T.places.ret, eye: T.S.view.eye, focus: T.S.focus.n });
    t.check(`H marks a return point relative to the folder you are in (${h.focus})`, h.ret.rel !== undefined && Array.isArray(h.ret.off) && h.ret.name === h.focus, JSON.stringify(h.ret));
    await t.key('0');
    await landed(t);
    const start = await t.app((T) => ({ eye: T.S.view.eye, focus: T.S.focus.n }));
    await t.key('J');
    await landed(t);
    const at = await offVantage(t, h.ret);
    t.check(`J lands within 1% of the anchor box width of the recomputed vantage (${at.d?.toPrecision(3)} of ${at.w?.toPrecision(3)})`, at.i >= 0 && at.d <= at.w * 0.01, JSON.stringify(at));
    const swapped = await t.app((T) => T.places.ret);
    t.check('the return point is now where J was pressed', swapped.name === start.focus, JSON.stringify(swapped));
    await t.key('J');
    await landed(t);
    const back = await offVantage(t, swapped);
    const eye = await t.app((T) => T.S.view.eye);
    const dStart = Math.hypot(eye.x - start.eye.x, eye.y - start.eye.y, eye.z - start.eye.z);
    t.check(`a second J returns to the start (${dStart.toPrecision(3)} from it, box width ${back.w?.toPrecision(3)})`, back.i >= 0 && dStart <= back.w * 0.01 && back.d <= back.w * 0.01, JSON.stringify({ back, dStart }));
  } else {
    const dirs = m.chain.dirs;
    await t.app((T, r) => { T.api.select(null); T.api.setFocus(T.S.model.find(r)); return true; }, dirs[1]);
    await t.tabTo('#view', { max: 160 });
    await t.key('H');
    await t.waitFor((T) => !!T.places.ret);
    await t.key('Backspace');
    await t.waitFor((T, r) => T.S.focus === T.S.model.find(r), { args: [dirs[0]] });
    await t.key('J');
    const j1 = await t.waitFor((T, r) => T.S.focus === T.S.model.find(r) && T.S.focus.n, { args: [dirs[1]], what: 'J to go to the marked folder' });
    await t.key('J');
    const j2 = await t.waitFor((T, r) => T.S.focus === T.S.model.find(r) && T.S.focus.n, { args: [dirs[0]], what: 'a second J to come back' });
    t.check(`without WebGL, H marks the folder you are in and J goes there (${j1}); a second J comes back (${j2})`, j1 === 'depth-02' && j2 === 'depth-01');
  }

  // A reload: the benchmarks resolve again; folded at the overview, the
  // deep one's pin stands on the mass that holds it.
  await reload(t);
  const st3 = await t.app(state);
  t.check('after a reload both benchmarks resolve again and the return point is kept', st3.n === 2 && st3.list.every((b) => b.found) && st3.list[1].rel === deep && !!st3.ret, JSON.stringify(st3.list));
  t.check('nothing changed, so no change notice', !(await t.app(() => window.__notices.some((n) => /benchmark/i.test(n.text)))));
  if (t.gl) {
    await t.settle();
    const fold = await t.app((T, r, c) => {
      const L = T.S.layout;
      const node = T.S.model.find(r);
      const i = T.api.visibleIndexOf(node);
      let anc = false;
      for (let a = node.p; a; a = a.p) if (a === L.node[i]) anc = true;
      return { i, own: L.index.has(node), type: L.type[i], name: L.node[i]?.n, anc, pin: T.S.view.pinList.some((p) => p.i === i && p.color === c), force: T.S.force };
    }, deep, VERDIGRIS);
    t.check(`at the overview depth-13 is folded into ${fold.name}, and its verdigris pin sits on that mass`, !fold.own && (fold.type === 2 || fold.type === 3) && fold.anc && fold.pin, JSON.stringify(fold));
    const tip = await t.app((T, i) => {
      T.S.view.on.hover(i, { clientX: 300, clientY: 300 });
      const lines = [...document.querySelectorAll('#tip > div')].map((d) => d.textContent);
      T.S.view.on.hover(-1, {});
      return lines;
    }, fold.i);
    t.check('the mass\'s hover tip names the benchmark it holds', fold.type !== 2 || tip.includes('Holds a benchmark: depth-13'), JSON.stringify(tip));
    await t.shot('benchmark-folded');

    // Draw calls: the benchmark pins share the pin mesh.
    // Compared with this run's own measurement of the same state, and the
    // recorded figure: the overview draws no pin of its own, so the shared
    // pin mesh is the one call the benchmarks' marks cost there.
    const two = await t.drawCalls();
    const base = t.baseline;
    const rec = t.recorded || t.baseline;
    const pinsDrawn = two.drawn.filter((x) => /^Mesh MeshBasicMaterial x\d+$/.test(x));
    const rest = two.drawn.filter((x) => !/^Mesh MeshBasicMaterial x\d+$/.test(x));
    t.check(`at the overview the benchmarks add only the shared pin mesh to what is drawn (${two.calls} calls, baseline ${base.overview.calls}, recorded ${rec.overview.calls})`,
      pinsDrawn.length === 1 && two.calls === base.overview.calls + 1 && base.overview.calls === rec.overview.calls && JSON.stringify(rest) === JSON.stringify(base.overview.drawn), JSON.stringify(two.drawn));
    await t.key('/');
    await t.type('copy-');
    await t.waitFor((T) => T.S.search?.list.length > 0);
    await t.settle();
    const withSearch = await t.drawCalls();
    t.check(`with a search showing, the draw calls equal the search baseline's (${withSearch.calls}, baseline ${base.search.calls}, recorded ${rec.search.calls})`, withSearch.calls === base.search.calls && withSearch.calls === rec.search.calls, withSearch.drawn.join(', '));
    await t.key('Escape');
    await t.waitFor((T) => !T.S.search);
    await t.settle();

    // 64 benchmarks: the same draw calls; frame time while travelling.
    const n64 = await t.app(benchMany, 64);
    await t.settle();
    const many = await t.drawCalls();
    t.check(`with ${n64} benchmarks the draw calls are those with 2 (${many.calls})`, n64 === 64 && many.calls === two.calls, many.drawn.join(', '));
    const marks = await t.app((T) => ({
      marks: T.S.view.marks.length, tags: [...document.querySelectorAll('#tags .tag-bench')].filter((e) => !e.hidden).length,
      boxes: new Set(T.places.benchmarks.map((b) => T.api.visibleIndexOf(b.node)).filter((i) => i >= 0)).size,
    }));
    t.check(`tags are capped at 12 (${marks.boxes} boxes carry benchmarks: ${marks.marks} marks, ${marks.tags} shown)`,
      marks.marks === Math.min(12, marks.boxes) && marks.boxes > 12 && marks.tags <= 12 && marks.tags > 0, JSON.stringify(marks));
    await t.shot('benchmarks-64');
    const runs = { base: [], bench: [] };
    for (let round = 0; round < 3; round++) {
      await t.app((T) => { T.places.clear(); T.api.relayout({ animate: false }); return true; });
      await t.settle();
      runs.base.push(await t.app(travelTime, 1200));
      await t.settle();
      await t.app(benchMany, 64);
      await t.settle();
      runs.bench.push(await t.app(travelTime, 1200));
      await t.settle();
    }
    const mean = (xs) => xs.reduce((a, x) => a + x.median, 0) / xs.length;
    const dt = mean(runs.bench) - mean(runs.base);
    t.check(`frame script time during W travel with 64 benchmarks is within 0.2 ms of none (${mean(runs.bench).toFixed(3)} vs ${mean(runs.base).toFixed(3)} ms, ${dt >= 0 ? '+' : ''}${dt.toFixed(3)})`,
      dt <= 0.2 && runs.bench.every((r) => r.frames > 20), JSON.stringify(runs));
  } else {
    await t.app(benchMany, 64);
  }

  // The 65th is refused.
  const other = await t.app((T) => {
    const free = (function find(d) {
      for (const c of d.c) if (c.d && !T.places.find(c) && !c.e) return c;
      for (const c of d.c) if (c.d) { const f = find(c); if (f) return f; }
      return null;
    })(T.S.model.root);
    T.api.select(free);
    return free && T.api.relPath(free);
  });
  await t.tabTo('#view', { max: 160 });
  await t.key('B');
  const refused = await noticed(t, /^64 benchmarks is the most Terrane keeps/);
  t.check(`with 64 kept, B on another folder (${other}) is refused in words`, !!refused && (await t.app((T) => T.places.benchmarks.length)) === 64, refused?.text);

  // A storage object that throws: everything works in memory, and it is said.
  await t.app((T) => {
    T.places.clear();
    T.places.flush();
    T.api.select(null);
    window.__storageDesc = Object.getOwnPropertyDescriptor(window, 'localStorage') || Object.getOwnPropertyDescriptor(Window.prototype, 'localStorage');
    Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new DOMException('The operation is insecure.', 'SecurityError'); } });
    return true;
  });
  await t.tabTo('#view', { max: 160 });
  await t.key('B');
  await noticed(t, /^Benchmark set on /);
  const failed = await noticed(t, /will last only until this tab closes\.$/);
  await t.key('H');
  await t.key('J');
  const mem = await t.app(state);
  t.check(`with a storage that throws, B, H and J still work in memory (${mem.n} benchmark, return point ${mem.ret ? 'kept' : 'missing'})`, mem.n === 1 && !!mem.ret && !!mem.failed && mem.stored === 'unreadable', JSON.stringify({ n: mem.n, failed: mem.failed }));
  t.check(`and a notice says places last only until the tab closes (${failed.text})`, /^Places cannot be kept in this browser \(.+\)\. Benchmarks and the return point will last only until this tab closes\.$/.test(failed.text), failed.text);
  await placesTab(t);
  t.check('the Places tab says so too', (await t.text('#ledger-rich')).includes('so they last only until this tab closes'));
  const all = await t.app(() => window.__notices.map((n) => n.text).filter((x) => /benchmark|Return point|Places/i.test(x)));
  t.check(`no landmark sentence says created, arrived or added (${all.length} notices)`, all.length > 0 && !all.some((x) => WORDS.test(x)), all.filter((x) => WORDS.test(x)).join(' | '));
  await t.app(() => { window.__noticeObs?.disconnect(); return true; });
}

/* ---------- a writable fixture: changes on disk ---------- */

const disk = {
  name: 'landmarks-disk',
  title: 'Landmarks: a change on disk, a reload, renames and moves',
  data: 'fixture',
  write: true,
  timeout: 300000,
  async run(t) {
    try {
      await onDisk(t);
    } finally {
      await t.app(cleanup).catch(() => {});
    }
  },
};

async function onDisk(t) {
  const dir = t.manifest.bulk.dir;
  await t.settle();
  await t.app(listenNotices);
  await t.waitFor((T) => T.S.watch === 'live', { timeout: 10000, what: 'the watcher' });
  await pick(t, dir, dir);
  await t.key('B');
  await noticed(t, new RegExp(`^Benchmark set on "${dir}": `));
  const id = await t.app((T) => T.places.benchmarks[0].id);
  await placesTab(t);

  // A file written into the folder outside Terrane.
  fs.writeFileSync(t.abs(`${dir}/ui-check-new.csv`), 'id,value\n1,2\n');
  const plus = await t.until(() => {
    const row = document.querySelector('details.bench > summary .fig');
    return row && row.textContent === '+1 file' && document.getElementById('ledger-rich').textContent;
  }, { timeout: 12000 });
  t.check('after a file is created on disk inside it, the Places tab shows "+1 file" after the watcher\'s refresh', !!plus, await t.text('#ledger-rich'));
  await rowButton(t, id, 'fly');
  const detail = await t.text(`details.bench[data-id="${id}"]`);
  t.check('its row lists the file under Here now, not then', detail.includes('Here now, not then') && detail.includes('ui-check-new.csv'), detail.slice(0, 300));

  // A reload: resolved again, and the change notice lists it.
  await reload(t);
  const after = await noticed(t, /^A benchmark changed since measured: /);
  const st = await t.app(state);
  t.check(`after a reload the benchmark resolves again (${st.list[0]?.rel}, ${st.list[0]?.sum && st.list[0].sum.df} file more)`, st.n === 1 && st.list[0].found && st.list[0].sum.df === 1, JSON.stringify(st.list));
  t.check(`and the change notice lists it (${after.text})`, after.text === `A benchmark changed since measured: ${dir} (+1 file).` && after.action === 'Show', after.text);

  // A rename through Terrane keeps it attached; Undo carries it back.
  await pick(t, dir, dir);
  await t.key('F2');
  await t.waitFor(() => document.getElementById('dialog').open && document.activeElement?.name === 'name');
  await t.type('bulk-renamed');
  await t.key('Enter');
  const renamed = await t.waitFor((T) => {
    const b = T.places.benchmarks[0];
    return b.rel === 'bulk-renamed' && b.node?.n === 'bulk-renamed' && b.node === T.S.model.find('bulk-renamed') && { rel: b.rel, name: b.name };
  }, { timeout: 10000, what: 'the benchmark to follow the rename' });
  t.check('renaming the folder through Terrane keeps the benchmark attached', renamed.name === 'bulk-renamed' && fs.existsSync(t.abs('bulk-renamed')));
  if (t.gl) t.check('its pin follows it', await t.app((T, c) => T.S.view.pinList.some((p) => p.color === c && p.i === T.api.visibleIndexOf(T.S.model.find('bulk-renamed'))), VERDIGRIS));
  await t.tabTo('#view', { max: 160 });
  await t.key('Ctrl+Z');
  const undone = await t.waitFor((T, d) => {
    const b = T.places.benchmarks[0];
    return b.rel === d && b.node === T.S.model.find(d) && b.name;
  }, { args: [dir], timeout: 10000, what: 'Undo to carry the benchmark back' });
  t.check(`Undo of the rename carries it back (${undone})`, undone === dir);
  await t.app((T, d) => { T.api.runOp({ type: 'move', paths: [d], dest: 'edge cases' }); return true; }, dir);
  const movedTo = await t.waitFor((T, d) => {
    const b = T.places.benchmarks[0];
    return b.rel === `edge cases/${d}` && b.node === T.S.model.find(`edge cases/${d}`) && b.rel;
  }, { args: [dir], timeout: 10000, what: 'the benchmark to follow the move' });
  t.check(`a move through Terrane carries it too (${movedTo})`, !!movedTo);
  await t.key('Ctrl+Z');
  await t.waitFor((T, d) => T.places.benchmarks[0].rel === d && !!T.places.benchmarks[0].node, { args: [dir], timeout: 10000, what: 'Undo of the move' });
  await t.sleep(2200);
  t.check('none of that was reported as missing', !(await t.app(() => window.__notices.some((n) => /is missing/.test(n.text)))));

  // Removed to the holding area through Terrane: missing, said as such;
  // Undo restores it and it is found again.
  await t.app((T, d) => { T.api.runOp({ type: 'trash', paths: [d] }); return true; }, dir);
  const held = await noticed(t, /is missing: /);
  t.check(`removed to the holding area through Terrane, it is missing and the sentence says where it went (${held.text})`,
    held.text === `The benchmark on "${dir}" is missing: ${dir} was removed to the holding area. Restore it from the Journal, or Undo, and it is found again.` && held.action === 'Forget', held.text);
  await t.key('Ctrl+Z');
  const again = await noticed(t, /^The benchmark on ".*" is found again at /);
  t.check(`Undo restores it and it is found again (${again.text})`, again.text === `The benchmark on "${dir}" is found again at ${dir}.`
    && await t.until((T) => !!T.places.benchmarks[0].node, { timeout: 8000 }) === true, again.text);

  // A rename outside Terrane: missing, said, kept, and Forget.
  fs.renameSync(t.abs(dir), t.abs('bulk-outside'));
  const lost = await noticed(t, /is missing: nothing is at /);
  const st2 = await t.app(state);
  t.check(`renaming it outside Terrane marks it missing with a sentence and a Forget action (${lost.text})`,
    lost.text === `The benchmark on "${dir}" is missing: nothing is at ${dir} now. It may have been renamed, moved or removed outside Terrane.` && lost.action === 'Forget', lost.text);
  t.check('it is never silently dropped', st2.n === 1 && !st2.list[0].found && st2.list[0].sum.missing);
  await placesTab(t);
  const row = await t.waitFor(() => document.querySelector('details.bench.is-missing > summary .fig')?.textContent);
  t.check('the Places tab marks it missing', row === 'missing');
  await rowButton(t, id, 'forget');
  const text = await t.text(`details.bench[data-id="${id}"]`).catch(() => '');
  t.check('Forget, from the keyboard, forgets it', (await t.until((T) => T.places.benchmarks.length === 0)) === true, text);
  const said = await t.app(() => window.__notices.map((n) => n.text));
  t.check('no sentence says created, arrived or added', !said.some((x) => WORDS.test(x)), said.filter((x) => WORDS.test(x)).join(' | '));
  await t.app(() => { window.__noticeObs?.disconnect(); return true; });
}

export default [landmarks, disk];
