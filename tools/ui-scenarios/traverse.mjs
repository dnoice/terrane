/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Session Traverse Scenario (Terrane Edition - v1.2)
 *     - File Name: traverse.mjs
 *     - Relative Path: tools/ui-scenarios/traverse.mjs
 *     - Artifact Type: test
 *     - Version: 1.2.0
 *     - Date: 11/13/2026
 *     - Update: Friday, November 13, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Changelog:
 *     - 1.2.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] —
 *       Closed sections a feature adds, such as Quick searches, may stand
 *       between Working sessions and Largest files in the Survey tab:
 *       Working sessions is still first and closed, Largest files open.
 *     - 1.1.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] —
 *       The traverse costs the search baseline and the one shared
 *       relation layer, which is drawn only while it holds a line.
 *     - 1.0.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] —
 *       Initial release.
 *
 * ✒ Description:
 *     Checks working sessions and the traverse in the real page. The
 *     fixture's stamped session is reached by keyboard from the Survey
 *     tab, searched as session:1 and listed in the order it changed; the
 *     world draws its route in the relation set 'session', hides it while
 *     boxes travel, resolves it again after every layout and keeps its
 *     dashes about 11 px long at the root and thirteen levels down. A
 *     second scenario writes a file on disk and watches session:1 take it
 *     in within one survey.
 *
 * ✒ Key Features:
 *     - Fixture data, both passes; the world checks need WebGL
 *     - Keyboard only: Survey tab, Tab to Working sessions, Enter, Tab to
 *       the first row, Enter; Find reads session:1, Findings is chosen,
 *       the list has focus and the live region says the files and places
 *     - S.search.set equals the newest session's files, the hidden folder's
 *       file inside the same window left out; the sixty-file bulk write is
 *       written at once
 *     - Findings in ascending last change, the Size and Changed keys, Select
 *       all in the order shown, and ArrowDown then Enter stepping on
 *     - The route against relations.route over the live layout: dashed
 *       ink, lift 0.12, chevrons, leg ends on box tops, the search's draw
 *       calls exactly
 *     - Every frame logged while the eye moves in: the layer is hidden on
 *       every frame boxes travel, and the route is written again about
 *       150 ms after the layout
 *     - Dash periods measured along the route's own arcs in pixels read
 *       back from the drawing buffer, at the root and at depth 13, where
 *       every leg end lies on the deepest plateau
 *     - A copy chosen under lens 4 inside a session search: the garnet ties
 *       stay solid and lifted 0.3 beside the dashed traverse
 *     - A session of every file: 1,000 legs drawn and the cut stated in the
 *       Findings sub-line; Escape empties the set
 *     - On disk (its own fixture): a file written now joins session:1 at
 *       the first survey that holds it
 *
 * ✒ Usage Instructions:
 *     node tools/ui-check.mjs traverse traverse-disk
 *     node tools/ui-check.mjs traverse --pass nogl
 *
 * ✒ Other Important Information:
 *     - Dependencies: tools/ui-check.mjs (the context t); the page's
 *       js/relations.js and the vendored three.js, imported in the page
 *       for the reference values
 *     - Compatible platforms: Node.js 22.5+
 *     - The fixture's sessions, newest first: the stamped session (12
 *       files in three branches, 40 to 12 minutes before it was made, and
 *       the two symbolic links, whose own times are the moment the fixture
 *       was made, where links can be made), the strata pair, the bulk
 *       write, then the 13-level chain's six files three days back among
 *       the random files
 * ----------------------------------------------------------------------------
 */

import fs from 'node:fs';

const INK = 0x18201e;
const GARNET = 0x9b1c3a;
const PROBE = 0xff00ff; // a colour nothing else in the world uses
// make-fixture.mjs makes these two links last, so their own times fall a
// few minutes after the stamped session; the manifest says whether it could.
const LINKS = ['edge cases/link-to-copy-a', 'edge cases/link-loop'];

/** The stamped session as the page should find it: { links, files, places }. */
const expected = (m) => {
  const links = m.links ? LINKS : [];
  return { links, files: m.session.files.length + links.length, places: m.session.places.length + (links.length ? 1 : 0) };
};
const WORDS = /creat|arriv|\badded\b/i;

/** In the page: records every sentence the live region carries. */
function listen() {
  const live = document.getElementById('live');
  window.__lives = [];
  window.__liveObs?.disconnect();
  window.__liveObs = new MutationObserver(() => window.__lives.push(live.textContent));
  window.__liveObs.observe(live, { childList: true, characterData: true, subtree: true });
  return true;
}

/** In the page: the sessions the survey found, against the fixture's deliberate sets. */
function sessionsInfo(T, m) {
  const S = T.S;
  if (!S.sessions) return false;
  const list = S.sessions.list;
  const find = (rel) => {
    const node = S.model.find(rel);
    return list.findIndex((s) => s.files.includes(node)) + 1;
  };
  const bulkK = find(m.bulk.files[0]);
  const bulk = list[bulkK - 1];
  return {
    n: list.length, ms: S.sessions?.ms, considered: S.sessions?.considered, skipped: S.sessions?.skipped,
    newestFirst: list.every((s, i) => !i || s.end < list[i - 1].start),
    first: list[0]?.files.length, bulkK, bulkCount: bulk?.count, bulkFlag: bulk?.bulk, bulkSpan: bulk ? bulk.end - bulk.start : null,
    edgeK: find(m.duplicates[0]), chainK: find(m.chain.session.files[0]), firstBulk: list[0]?.bulk,
  };
}

/** In the page: S.search.set against a fresh sessions() and the manifest. */
async function searchAudit(T, session, links) {
  const R = await import(new URL('js/relations.js', document.baseURI).href);
  const S = T.S;
  const list = R.sessions(S.model.root);
  const want = list[0].files.filter((f) => !R.underHidden(f));
  const set = S.search.set;
  const hidden = S.model.find(session.hidden);
  return {
    query: S.query, size: set.size, want: want.length,
    same: want.length === set.size && want.every((f) => set.has(f)),
    cached: S.sessions.list[0].files.length === list[0].files.length && S.sessions.list[0].files.every((f, i) => f === list[0].files[i]),
    manifest: set.size === session.files.length + links.length && [...session.files, ...links].every((r) => set.has(S.model.find(r))),
    hiddenInWindow: !!hidden && hidden.m >= list[0].start && hidden.m <= list[0].end,
    hiddenOut: !!hidden && !set.has(hidden),
  };
}

/** In the page: the Findings list, its order and its sub-line. */
function findings(T) {
  const S = T.S;
  const items = T.list.items;
  const ms = items.map((n) => n.m);
  const ss = items.map((n) => n.s);
  return {
    tab: S.tab, n: items.length, matches: S.search?.list.length,
    asc: ms.every((x, i) => !i || x >= ms[i - 1]), desc: ms.every((x, i) => !i || x <= ms[i - 1]),
    bySize: ss.every((x, i) => !i || x <= ss[i - 1]),
    same: !!S.search && items.length === S.search.list.length && items.every((x) => S.search.set.has(x)),
    pressed: [...document.querySelectorAll('#ledger-sub .sort[aria-pressed]')].map((b) => `${b.textContent.trim()}:${b.getAttribute('aria-pressed')}`),
    sub: document.getElementById('ledger-sub').textContent,
    note: S.search?.note || '',
    tabSelected: document.querySelector('.tabs [data-tab=findings]')?.getAttribute('aria-selected'),
    first: items[0]?.n, second: items[1]?.n,
  };
}

/** In the page: presses a sort key of the Findings sub-line, as a click would. */
function press(T, label) {
  const b = [...document.querySelectorAll('#ledger-sub .sort')].find((x) => x.textContent.trim() === label);
  b?.click();
  return !!b;
}

/** In the page: the drawn route against relations.route over the live layout. */
async function routeAudit(T) {
  const R = await import(new URL('js/relations.js', document.baseURI).href);
  const S = T.S;
  const v = S.view;
  const L = S.layout;
  const set = v.relationSets.get('session');
  const k = Number((/session:(\d+)/i.exec(S.query) || [])[1]);
  const s = S.sessions.list[k - 1];
  const files = s && S.search ? s.files.filter((f) => S.search.set.has(f)) : [];
  const r = R.route(L, files);
  const legs = set ? set.legs.length / 6 : 0;
  let same = !!set && set.legs.length === r.legs.length;
  for (let i = 0; same && i < r.legs.length; i++) if (set.legs[i] !== r.legs[i]) same = false;
  const top = (i) => [L.geo[i * 6], L.geo[i * 6 + 1] + L.geo[i * 6 + 4] / 2, L.geo[i * 6 + 2]];
  let tops = !!set;
  for (let j = 0; set && j < legs; j++) {
    const a = top(r.stops[j]);
    const b = top(r.stops[j + 1]);
    for (let c = 0; c < 3; c++) if (set.legs[j * 6 + c] !== a[c] || set.legs[j * 6 + 3 + c] !== b[c]) tops = false;
  }
  return {
    k, legs, want: r.count, total: r.total, stops: r.stops.length, same, tops,
    color: set?.color, dashed: set?.dashed, lift: set?.lift, arrows: set?.arrows,
    count: v.relations.geometry.drawRange.count, visible: v.relations.visible, leftOut: v.relationsLeftOut,
    route: S.sessions.route, dup: v.relationSets.has('dup'),
  };
}

/** In the page: logs every frame and every route written, and every layout. */
function spy(T) {
  const v = T.S.view;
  const r = v.renderer;
  const log = { frames: [], layouts: [], sets: [] };
  const render = r.render;
  const setRelation = v.setRelation;
  r.render = function (...a) {
    log.frames.push({ tr: !!v.transition, vis: v.relations.visible, count: v.relations.geometry.drawRange.count });
    return render.apply(this, a);
  };
  v.setRelation = function (key, ...a) {
    if (key === 'session') log.sets.push(performance.now());
    return setRelation.call(this, key, ...a);
  };
  T.api.AFTER_LAYOUT.add({ id: 'traverse-probe', order: 99, run: () => log.layouts.push(performance.now()) });
  log.restore = () => {
    r.render = render;
    delete v.setRelation;
    T.api.AFTER_LAYOUT.remove('traverse-probe');
  };
  window.__trv = log;
  return true;
}

/**
 * In the page: the route drawn once in a probe colour and once not at all,
 * read back from the drawing buffer, then walked along each leg's own arc
 * on screen in half-pixel steps. The middle of a leg (its solid chevron)
 * and its very ends are skipped; the distance between the starts of two
 * inked runs is one dash period.
 */
async function dashes(T, probe) {
  const v = T.S.view;
  const r = v.renderer;
  const gl = r.getContext();
  const THREE = await import(new URL('vendor/three/three.module.js', document.baseURI).href);
  const frame = () => new Promise((res) => requestAnimationFrame(() => res()));
  const set = v.relationSets.get('session');
  if (!set) return { legs: 0, periods: 0 };
  const keep = { color: set.color, dashed: set.dashed, lift: set.lift, arrows: set.arrows, segments: set.segments, legs: set.legs };
  v.setRelation('session', { ...keep, color: probe });
  await frame();
  await frame();
  const W = gl.drawingBufferWidth;
  const H = gl.drawingBufferHeight;
  const grab = (vis) => {
    v.relations.visible = vis;
    r.render(v.scene, v.camera);
    v.relations.visible = true;
    const px = new Uint8Array(W * H * 4);
    gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px);
    return px;
  };
  const withLine = grab(true);
  const without = grab(false);
  v.setRelation('session', keep);
  await frame();
  await frame();
  const hit = (x, y) => {
    const xi = Math.round(x);
    const yi = Math.round(y);
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const X = xi + dx;
        const Y = yi + dy;
        if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
        const k = (Y * W + X) * 4;
        if (Math.abs(withLine[k] - without[k]) + Math.abs(withLine[k + 1] - without[k + 1]) + Math.abs(withLine[k + 2] - without[k + 2]) > 60) return true;
      }
    }
    return false;
  };
  const P = new THREE.Vector3();
  const screen = (x, y, z) => {
    P.set(x, y, z).project(v.camera);
    if (!(P.z > -1 && P.z < 1)) return null;
    const sx = (P.x * 0.5 + 0.5) * W;
    const sy = (P.y * 0.5 + 0.5) * H;
    return sx < 4 || sy < 4 || sx > W - 5 || sy > H - 5 ? null : [sx, sy];
  };
  const L = keep.legs;
  const m = L.length / 6;
  const periods = [];
  let on = 0;
  let samples = 0;
  let measured = 0;
  let pxLength = 0;
  for (let j = 0; j < m && measured < 80; j++) {
    const ax = L[j * 6], ay = L[j * 6 + 1], az = L[j * 6 + 2], bx = L[j * 6 + 3], by = L[j * 6 + 4], bz = L[j * 6 + 5];
    const chord = Math.hypot(bx - ax, by - ay, bz - az);
    const mx = (ax + bx) / 2, my = Math.max(ay, by) + chord * keep.lift, mz = (az + bz) / 2;
    const N = 240;
    let prev = null;
    let run = null; // the previous sample of an unbroken stretch
    let lastStart = null;
    let legPx = 0;
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const u = 1 - t;
      const p = screen(u * u * ax + 2 * u * t * mx + t * t * bx, u * u * ay + 2 * u * t * my + t * t * by, u * u * az + 2 * u * t * mz + t * t * bz);
      if (!p) {
        prev = null;
        run = null;
        lastStart = null;
        continue;
      }
      if (prev) {
        const d = Math.hypot(p[0] - prev[0], p[1] - prev[1]);
        const steps = Math.max(1, Math.ceil(d / 0.5));
        for (let q = 1; q <= steps; q++) {
          const f = q / steps;
          const tt = prev[2] + (t - prev[2]) * f;
          const s = legPx + d * f;
          if (tt < 0.03 || tt > 0.97 || (tt > 0.35 && tt < 0.65)) {
            run = null;
            lastStart = null;
            continue;
          }
          const h = hit(prev[0] + (p[0] - prev[0]) * f, prev[1] + (p[1] - prev[1]) * f);
          samples++;
          if (h) on++;
          if (h && run && !run.h) {
            if (lastStart !== null) periods.push(s - lastStart);
            lastStart = s;
          }
          run = { h };
        }
        legPx += d;
      }
      prev = [p[0], p[1], t];
    }
    if (legPx > 0) {
      measured++;
      pxLength += legPx;
    }
  }
  periods.sort((a, b) => a - b);
  const median = periods.length ? periods[periods.length >> 1] : 0;
  return {
    legs: m, measured, px: Math.round(pxLength), periods: periods.length, median: Math.round(median * 10) / 10,
    min: Math.round((periods[0] ?? 0) * 10) / 10, max: Math.round((periods.at(-1) ?? 0) * 10) / 10,
    share: samples ? on / samples : 0, ratio: r.getPixelRatio(), alt: v.alt, restored: v.relationSets.get('session')?.color === keep.color,
  };
}

/** Types a query into Find by keyboard and waits for its search. */
async function find(t, text) {
  await t.key('/');
  await t.type(text);
  return t.waitFor((T, q) => T.S.query === q && T.S.search && { n: T.S.search.list.length }, { args: [text], what: `the search for ${text}` });
}

/**
 * Waits until the view rests and the route of the current session search
 * is the one relations.route gives over the current layout, written into
 * the layer.
 */
async function routed(t) {
  await t.settle();
  return t.waitFor(async (T) => {
    const S = T.S;
    if (S.layoutTimer || S.view.transition || !S.search) return false;
    const set = S.view.relationSets.get('session');
    if (!set || S.view.relationsStale || !S.view.relations.geometry.drawRange.count) return false;
    const R = await import(new URL('js/relations.js', document.baseURI).href);
    const k = Number((/session:(\d+)/i.exec(S.query) || [])[1]);
    const s = S.sessions?.list[k - 1];
    if (!s) return false;
    const r = R.route(S.layout, s.files.filter((f) => S.search.set.has(f)));
    if (r.legs.length !== set.legs.length) return false;
    for (let i = 0; i < r.legs.length; i++) if (r.legs[i] !== set.legs[i]) return false;
    return { legs: r.count };
  }, { timeout: 8000, what: 'the traverse over the current layout' });
}

const traverse = {
  name: 'traverse',
  title: 'Session traverse: working sessions as a search and a route',
  data: 'fixture',
  timeout: 300000,
  async run(t) {
    const m = t.manifest;
    const want = expected(m);
    await t.settle();
    await t.app(listen);
    const info = await t.waitFor(sessionsInfo, { args: [m], what: 'the working sessions' });
    t.note(`${info.n} working sessions in ${info.considered} files (${info.skipped} under dot-folders) in ${info.ms?.toFixed(1)} ms; bulk is session ${info.bulkK}, the copies' session ${info.edgeK}, the chain's ${info.chainK}`);
    t.check(`the survey found working sessions, newest first, the stamped one first (${info.first} files)`, info.n >= 4 && info.newestFirst && info.first === want.files && !info.firstBulk, JSON.stringify(info));
    t.check(`the sixty files of the bulk write are one session, written at once (${info.bulkCount} files in ${info.bulkSpan} ms)`, info.bulkCount === 60 && info.bulkFlag && info.bulkSpan < 1000, JSON.stringify(info));

    // Keyboard only: Survey tab, Working sessions, the first row.
    await t.tabTo('[data-tab=survey]');
    await t.key('Enter');
    await t.waitFor((T) => T.S.tab === 'survey' && !!document.querySelector('#ledger-rich details.sessions'));
    const order = await t.eval(() => [...document.querySelectorAll('#ledger-rich > details')].map((d) => `${d.firstChild.firstChild.textContent}:${d.open}`));
    // Closed sections a feature adds (Quick searches) may stand between.
    const largest = order.findIndex((x) => x.startsWith('Largest files:'));
    t.check('Working sessions is the Survey tab\'s first section, closed, Largest files open after it',
      order[0] === 'Working sessions:false' && largest > 0 && order[largest] === 'Largest files:true' && order.slice(1, largest).every((x) => x.endsWith(':false')), JSON.stringify(order));
    await t.tabTo('details.sessions > summary', { max: 20 });
    await t.key('Enter');
    await t.waitFor(() => document.querySelector('details.sessions')?.open);
    await t.shot('working-sessions');
    const rows = await t.eval(() => [...document.querySelectorAll('.session-row')].map((b) => {
      // A bulk label must show whole: inside its line, never cut by it.
      const lab = b.querySelector('.bulk');
      const nm = b.querySelector('.nm').getBoundingClientRect();
      const r = lab?.getBoundingClientRect();
      const fits = !lab || (r.left >= nm.left - 0.5 && r.right <= nm.right + 0.5 && r.bottom <= nm.bottom + 0.5 && lab.scrollWidth <= Math.ceil(r.width) + 1);
      return { k: b.dataset.session, text: b.textContent, label: b.getAttribute('aria-label'), fits };
    }));
    const DATE_ROW = /^\d\d\/\d\d\/\d{4} \d\d:\d\d(–\d\d:\d\d| – \d\d\/\d\d\/\d{4} \d\d:\d\d)?/;
    const bulkRow = rows[info.bulkK - 1];
    t.check(`its rows (${rows.length}) read MM/DD/YYYY HH:MM–HH:MM, places and the folder holding them, and the file count`,
      rows.length === Math.min(40, info.n) && DATE_ROW.test(rows[0].text) && rows[0].text.endsWith(`${want.files} files`) && rows[0].text.includes(`${want.places} places · `), JSON.stringify(rows.slice(0, 2)));
    t.check('the bulk write\'s row is labelled Written at once, whole, and only bulk rows are', !!bulkRow && bulkRow.text.includes('Written at once') && rows.every((r) => r.fits)
      && rows.filter((r) => r.text.includes('Written at once')).every((r) => /written at once/.test(r.label)), JSON.stringify(bulkRow));
    await t.tabTo('.session-row[data-session="1"]', { max: 5 });
    await t.key('Enter');
    const chosen = await t.waitFor((T) => T.S.query === 'session:1' && T.S.search && T.S.tab === 'findings' && {
      q: document.getElementById('q').value, tab: T.S.tab, live: document.getElementById('live').textContent,
      focus: document.activeElement?.id, selected: document.querySelector('.tabs [data-tab=findings]')?.getAttribute('aria-selected'),
    }, { what: 'session:1 in Find' });
    t.check(`Enter on the first row: Find reads session:1, Findings is chosen and its list has focus${t.gl ? '' : ' (WebGL disabled)'}`,
      chosen.q === 'session:1' && chosen.selected === 'true' && chosen.focus === 'ledger-list', JSON.stringify(chosen));
    t.check(`and the live region says it: "${chosen.live}"`, /files in \d+ places/.test(chosen.live) && chosen.live.startsWith(`Session 1, the newest: ${want.files} files in ${want.places} places changed `)
      && /Findings lists them in the order they changed\./.test(chosen.live) && /The traverse joins them in the world\./.test(chosen.live) === t.gl, chosen.live);

    const audit = await t.app(searchAudit, m.session, want.links);
    t.check(`S.search.set equals the newest session's files as a set (${audit.size} of ${audit.want}), the fixture's ${m.session.files.length}${want.links.length ? ' and its two links' : ''}`,
      audit.same && audit.manifest && audit.cached, JSON.stringify(audit));
    t.check('the file under the hidden folder changed inside the same window and is left out', audit.hiddenInWindow && audit.hiddenOut, JSON.stringify(audit));

    let f = await t.app(findings);
    t.check(`Findings lists the session's files in ascending last change, Changed pressed (${f.first} first)`,
      f.same && f.asc && f.n === want.files && f.pressed.join() === 'Size:false,Changed:true', JSON.stringify(f));
    t.check(`its sub-line names the session: "${f.note}"`,
      /^Session 1: \d\d\/\d\d\/\d{4} \d\d:\d\d(–\d\d:\d\d| – \d\d\/\d\d\/\d{4} \d\d:\d\d), \d+ files in \d+ places\.$/.test(f.note)
      && f.note.endsWith(`, ${want.files} files in ${want.places} places.`) && f.sub.includes(f.note), f.sub);

    if (t.gl) {
      const first = await routed(t);
      const r = await t.app(routeAudit);
      t.check(`the world draws the relation set 'session': ${r.legs} legs through ${r.stops} stops`, r.legs > 0 && r.legs === r.want && r.same && r.count > 0 && r.visible, JSON.stringify(r));
      t.check('dashed ink, lifted 0.12 of each chord, a chevron on each leg', r.color === INK && r.dashed && r.lift === 0.12 && r.arrows && r.leftOut === 0, JSON.stringify(r));
      t.check('each leg runs from the top of one stop to the top of the next, at most 1,000', r.tops && r.legs <= 1000 && !r.route.truncated && first.legs === r.legs, JSON.stringify(r));
      const calls = await t.drawCalls();
      const want = t.recorded?.search?.calls ?? t.baseline?.search?.calls;
      t.check(`the traverse costs only the shared relation layer, which is drawn only while it holds a line: ${calls.calls}, the search baseline (${want}) and one`,
        calls.calls === want + 1 && calls.drawn.filter((d) => d.startsWith('LineSegments LineDashedMaterial')).length === 1, calls.drawn.join(', '));
      await t.shot('session-1');

      // The eye moves in: boxes travel, the layer hides, the route follows.
      await t.app(spy);
      await t.keys('+', '+', '+');
      await t.settle();
      await routed(t);
      const run = await t.app(() => {
        const g = window.__trv;
        const last = g.layouts.at(-1);
        const after = g.sets.filter((x) => x >= last);
        const f2 = g.frames;
        return {
          frames: f2.length, travelling: f2.filter((x) => x.tr).length, shownWhileTravelling: f2.filter((x) => x.tr && x.vis).length,
          hiddenAtRest: f2.filter((x) => !x.tr && !x.vis).length, last: f2.at(-1), layouts: g.layouts.length, delay: after.length ? after[0] - last : null,
        };
      });
      await t.app(() => { window.__trv.restore(); return true; });
      const moved = await t.app(routeAudit);
      t.check(`while boxes travel the layer is hidden on every frame (${run.travelling} of ${run.frames} frames travelling)`,
        run.travelling > 0 && run.shownWhileTravelling === 0 && run.hiddenAtRest === 0 && run.last?.vis && run.last?.count > 0, JSON.stringify(run));
      t.check(`the route is written again ${run.delay?.toFixed(0)} ms after the last of ${run.layouts} layouts, over the new one`,
        run.layouts > 0 && run.delay >= 140 && run.delay < 1000 && moved.same && moved.tops && moved.legs > 0, JSON.stringify({ run, moved }));

      // Back at the root, the dashes measured along the route itself.
      await t.key('0');
      await routed(t);
      const root = await t.app(dashes, PROBE);
      t.note(`root: altitude ${root.alt.toPrecision(3)}, ${root.legs} legs over ${root.px} px, dash periods ${root.min} to ${root.max} px (median ${root.median}) from ${root.periods} periods, ${(root.share * 100).toFixed(0)}% inked`);
      t.check(`at the root the traverse's dashes repeat about every 11 px (median ${root.median} px, between ${10 * root.ratio} and ${32 * root.ratio})`,
        root.periods >= 6 && root.median >= 10 * root.ratio && root.median <= 32 * root.ratio && root.share > 0.2 && root.share < 0.85 && root.restored, JSON.stringify(root));
      await t.shot('traverse-root');
    }

    // The Size and Changed keys, and Select all in the order shown.
    await t.app(press, 'Changed');
    f = await t.app(findings);
    t.check('Changed again lists the newest change first', f.desc && !f.asc && f.pressed.join() === 'Size:false,Changed:true', JSON.stringify(f));
    await t.app(press, 'Size');
    f = await t.app(findings);
    t.check('Size lists the largest first', f.bySize && f.pressed.join() === 'Size:true,Changed:false', JSON.stringify(f));
    await t.app(press, 'Changed');
    f = await t.app(findings);
    t.check('Changed from Size lists the oldest change first again', f.asc && f.pressed.join() === 'Size:false,Changed:true', JSON.stringify(f));

    // Stepping: ArrowDown then Enter in the time-ordered list reveals the next file.
    await t.app(() => { document.getElementById('ledger-list').focus(); return true; });
    await t.key('ArrowDown');
    await t.key('Enter');
    const step = await t.waitFor((T) => T.S.primary && T.S.primary === T.list.items[1] && { n: T.S.primary.n, cursor: T.list.cursor, live: document.getElementById('live').textContent });
    t.check(`ArrowDown then Enter reveals the session's second file (${step.n})`, step.cursor === 1 && step.live.startsWith(step.n), JSON.stringify(step));
    await t.settle();
    await t.app(press, 'Select all');
    const all = await t.app((T) => ({ sel: T.S.sel.size, primary: T.S.primary === T.list.items[0], n: T.list.items.length }));
    t.check('Select all selects every match, the first in the order shown first', all.sel === all.n && all.primary, JSON.stringify(all));

    // Escape clears the query, and the set 'session' with it.
    await t.app(() => { document.getElementById('ledger-list').focus(); return true; });
    await t.key('Escape');
    await t.waitFor((T) => !T.S.search && !T.S.query);
    if (t.gl) await t.settle();
    const gone = await t.app((T) => ({
      has: T.S.noGL ? false : T.S.view.relationSets.has('session'), count: T.S.noGL ? 0 : T.S.view.relations.geometry.drawRange.count,
      route: T.S.sessions.route, tab: T.S.tab, q: document.getElementById('q').value,
    }));
    t.check('Escape clears the query, and the relation set \'session\' is empty afterwards', !gone.has && gone.count === 0 && gone.route === null && gone.q === '' && gone.tab === 'contents', JSON.stringify(gone));
    await t.key('Escape');
    await t.waitFor((T) => !T.S.primary && T.S.sel.size === 0);

    if (!t.gl) {
      t.skip('lens 4 beside the traverse, the 1,000-leg cut and depth 13', 'they are drawn in the world');
    } else {
      // A copy chosen under lens 4 inside a session search: both sets drawn.
      await find(t, `session:${info.edgeK}`);
      await t.key('Enter');
      await t.keys('PageUp', 'PageUp', 'PageUp');
      for (let i = 0; i < 20; i++) {
        if (await t.app((T) => T.S.primary?.n === 'copy-a.dat')) break;
        await t.key('ArrowDown');
      }
      await t.key('Enter');
      await t.waitFor((T) => T.S.primary?.n === 'copy-a.dat');
      await t.key('4');
      await t.waitFor((T) => T.S.lens === 'dup');
      await routed(t);
      const both = await t.app((T) => {
        const v = T.S.view;
        const d = v.relationSets.get('dup');
        const s = v.relationSets.get('session');
        const pick = (x) => x && { color: x.color, lift: x.lift, dashed: x.dashed, arrows: x.arrows, legs: x.legs.length / 6 };
        return { dup: pick(d), session: pick(s), count: v.relations.geometry.drawRange.count, visible: v.relations.visible, left: v.relationsLeftOut };
      });
      t.check(`under lens 4 the copy's ties are still solid garnet arcs lifted 0.3 (${both.dup?.legs} ties)`,
        !!both.dup && both.dup.color === GARNET && both.dup.lift === 0.3 && !both.dup.dashed && !both.dup.arrows && both.dup.legs >= 1, JSON.stringify(both));
      t.check(`beside the dashed ink traverse of session ${info.edgeK} (${both.session?.legs} legs), in one layer`,
        !!both.session && both.session.color === INK && both.session.dashed && both.session.lift === 0.12 && both.session.arrows && both.visible && both.left === 0, JSON.stringify(both));
      await t.shot('ties-and-traverse');
      await t.key('1');
      await t.key('Escape');
      await t.waitFor((T) => !T.S.search);
      await t.key('Escape');
      await t.waitFor((T) => !T.S.primary);

      // A session of every file (found with a gap of centuries): the route
      // is cut at 1,000 legs, and Findings says so.
      const cut = await t.app(async (T) => {
        const R = await import(new URL('js/relations.js', document.baseURI).href);
        const big = R.sessions(T.S.model.root, { gapMs: 1e13 })[0];
        T.S.sessions.list.unshift(big);
        T.api.setQuery('session:1');
        return { files: big.count };
      });
      await routed(t);
      const capped = await t.app((T) => ({
        legs: T.S.view.relationSets.get('session')?.legs.length / 6, route: T.S.sessions.route, note: T.S.search.note,
        sub: document.getElementById('ledger-sub').textContent, left: T.S.view.relationsLeftOut,
      }));
      t.check(`a session of all ${cut.files} files draws 1,000 legs of its ${capped.route?.total} (${capped.left} left out of the layer)`,
        capped.legs === 1000 && capped.route?.count === 1000 && capped.route.truncated && capped.route.total > 1000 && capped.left === 0, JSON.stringify(capped));
      t.check(`and the Findings sub-line states the cut: "${capped.note}"`,
        capped.note.endsWith(`Route: the first 1,000 of ${capped.route?.total.toLocaleString('en-US')} legs.`) && capped.sub.includes(capped.note), capped.sub);
      await t.app((T) => { T.S.sessions.list.shift(); T.api.setQuery(''); return true; });
      await t.waitFor((T) => !T.S.search && !T.S.view.relationSets.has('session'));

      // Thirteen levels down: the chain's own session, narrowed to its files.
      const deepQuery = `session:${info.chainK} deep-`;
      const deepFind = await find(t, deepQuery);
      t.check(`${deepQuery} finds the six files at the bottom of the 13-level chain`, deepFind.n === 6, JSON.stringify(deepFind));
      await t.key('Enter');
      await t.key('Enter');
      await t.waitFor((T) => T.S.primary?.n.startsWith('deep-'));
      await routed(t);
      // Straight above the six files, so every leg is on screen.
      await t.app((T) => {
        const v = T.S.view;
        const L = T.S.layout;
        let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity, y = 0;
        for (const f of T.S.search.list) {
          const i = L.index.get(f);
          if (i === undefined) continue;
          const g = L.geo;
          x0 = Math.min(x0, g[i * 6] - g[i * 6 + 3] / 2); x1 = Math.max(x1, g[i * 6] + g[i * 6 + 3] / 2);
          z0 = Math.min(z0, g[i * 6 + 2] - g[i * 6 + 5] / 2); z1 = Math.max(z1, g[i * 6 + 2] + g[i * 6 + 5] / 2);
          y = Math.max(y, g[i * 6 + 1] + g[i * 6 + 4] / 2);
        }
        v.flyTo(v.constructor.vantage((x0 + x1) / 2, y, (z0 + z1) / 2, Math.max(x1 - x0, z1 - z0) * 1.6, v.cam.yaw, -1.45), 0);
        return true;
      });
      await routed(t);
      const deep = await t.app((T, rel) => {
        const S = T.S;
        const L = S.layout;
        const dir = S.model.find(rel);
        const pi = L.index.get(dir);
        const set = S.view.relationSets.get('session');
        const g = L.geo;
        const out = { depth: rel.split('/').length, plateau: pi !== undefined && L.type[pi] === 0, legs: set ? set.legs.length / 6 : 0, outside: 0, stops: S.sessions.route?.stops };
        if (pi === undefined || !set) return out;
        const cx = g[pi * 6], cz = g[pi * 6 + 2], hx = g[pi * 6 + 3] / 2, hz = g[pi * 6 + 5] / 2;
        for (let j = 0; j < set.legs.length; j += 3) {
          if (Math.abs(set.legs[j] - cx) > hx * (1 + 1e-9) || Math.abs(set.legs[j + 2] - cz) > hz * (1 + 1e-9)) out.outside++;
        }
        return out;
      }, m.chain.deepest);
      t.check(`at depth ${deep.depth} the route runs ${deep.legs} legs through the ${deep.stops} files, every leg end on the deepest plateau's footprint`,
        deep.depth === 13 && deep.plateau && deep.legs === 5 && deep.stops === 6 && deep.outside === 0, JSON.stringify(deep));
      const low = await t.app(dashes, PROBE);
      t.note(`depth 13: altitude ${low.alt.toPrecision(3)}, ${low.legs} legs over ${low.px} px, dash periods ${low.min} to ${low.max} px (median ${low.median}) from ${low.periods} periods, ${(low.share * 100).toFixed(0)}% inked`);
      t.check(`thirteen levels down the dashes still repeat about every 11 px (median ${low.median} px, between ${10 * low.ratio} and ${32 * low.ratio})`,
        low.periods >= 3 && low.median >= 10 * low.ratio && low.median <= 32 * low.ratio && low.share > 0.2 && low.share < 0.85 && low.restored, JSON.stringify(low));
      await t.shot('traverse-depth-13');
      await t.key('Escape');
      await t.waitFor((T) => !T.S.search && !T.S.view.relationSets.has('session'));
      await t.key('Escape');
    }

    const lives = await t.app(() => window.__lives.filter((s) => /^Session /.test(s)));
    t.check(`what it said uses "changed", never "created", "arrived" or "added" (${lives.length} sentences)`, lives.length > 0 && !lives.some((s) => WORDS.test(s)), lives.join(' | '));
    await t.app(() => { window.__liveObs?.disconnect(); return true; });
  },
};

const disk = {
  name: 'traverse-disk',
  title: 'Session traverse: a file written now joins session:1 within one survey',
  data: 'fixture',
  write: true,
  async run(t) {
    const place = t.manifest.session.places[1];
    const want = expected(t.manifest);
    const name = 'ui-check-session.txt';
    const rel = `${place}/${name}`;
    await t.settle();
    await t.waitFor((T) => T.S.watch === 'live' && !!T.S.sessions, { timeout: 10000, what: 'the watcher and the sessions' });
    const before = await find(t, 'session:1');
    t.check(`session:1 holds the stamped session's ${want.files} files`, before.n === want.files, JSON.stringify(before));
    // What the search holds after each refresh and each survey, until the file is in.
    await t.app((T, r) => {
      const has = () => { const n = T.S.model.find(r); return { model: !!n, search: !!n && !!T.S.search?.set.has(n) }; };
      window.__trvDisk = { refresh: [], survey: [] };
      T.api.AFTER_REFRESH.add({ id: 'traverse-disk-refresh', order: 99, run: () => window.__trvDisk.refresh.push(has()) });
      T.api.AFTER_SURVEY.add({ id: 'traverse-disk-survey', order: 99, run: () => window.__trvDisk.survey.push({ ...has(), session: !!T.S.sessions.list[0]?.files.includes(T.S.model.find(r)) }) });
      return true;
    }, rel);
    fs.writeFileSync(t.abs(rel), 'Written by the interface check.\n');
    const got = await t.waitFor((T, r) => {
      const n = T.S.model.find(r);
      return n && T.S.search?.set.has(n) && { n: T.S.search.list.length, last: T.list.items.at(-1)?.n, log: window.__trvDisk, note: T.S.search.note };
    }, { args: [rel], timeout: 15000, what: 'the new file in session:1' });
    await t.app((T) => { T.api.AFTER_REFRESH.remove('traverse-disk-refresh'); T.api.AFTER_SURVEY.remove('traverse-disk-survey'); return true; });
    const firstSurvey = got.log.survey.find((x) => x.model);
    t.note(`after each refresh (model, search): ${JSON.stringify(got.log.refresh)}; after each survey: ${JSON.stringify(got.log.survey)}`);
    t.check(`a file written now joins session:1 at the first survey that holds it (${got.n} files, the newest last: ${got.last})`,
      got.n === want.files + 1 && got.last === name && !!firstSurvey && firstSurvey.search && firstSurvey.session, JSON.stringify(got));
    t.check(`and the sub-line counts it: "${got.note}"`, got.note.endsWith(`, ${want.files + 1} files in ${want.places} places.`), got.note);
    await t.key('Escape');
    await t.waitFor((T) => !T.S.search);
  },
};

export default [traverse, disk];
