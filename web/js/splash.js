/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Splash Sequence (Terrane Edition - v2.1)
 *     - File Name: splash.js
 *     - Relative Path: web/js/splash.js
 *     - Artifact Type: javascript
 *     - Version: 2.1.0
 *     - Date: 11/12/2026
 *     - Update: Thursday, November 12, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Changelog:
 *     - 2.1.0 (11/12/2026) [dendogg + Anthropic - Claude Opus 5.5] — The
 *       wordmark is the framed TERRANE in the style Dennis set in TER.svg:
 *       each letter a shadow, a near-white face and its frame strips.
 *     - 2.0.0 (11/12/2026) [dendogg + Anthropic - Claude Opus 5.5] — One
 *       sequence, Survey and Strata merged as Dennis directed; Accretion
 *       removed; the T's assembly lengthened from about 2.5 s to 6.7 s;
 *       the name is now the drawn TERRANE wordmark with Dennis's R and N;
 *       artwork moved to the generated web/js/terrane-mark.js. Wired into
 *       the app: the regions beneath are inert while it shows, a click or
 *       key skips the intro once the page is ready, and reduced motion
 *       shows the finished sheet and removes it without moving.
 *     - 1.0.0 (11/12/2026) [dendogg + Anthropic - Claude Opus 5.5] — Three
 *       sequences (Accretion, Survey, Strata) around the finished T.
 *
 * ✒ Description:
 *     The loading sheet Terrane shows while it starts. The finished T is
 *     surveyed, deposited and inked in one sequence, the TERRANE wordmark
 *     rises under it, then a loading loop holds for as long as the app
 *     needs and an excavation scan hands over to the interface. The app
 *     drives it through stage(), progress() and done(); nothing on the
 *     sheet claims progress the app has not reported.
 *
 * ✒ Key Features:
 *     - Intro, about 6.7 s, in six movements:
 *         1. Survey set-up: frame, origin stake, construction lines on
 *            Dennis's cell grid, the ground line and the depth ticks
 *         2. Strata deposit: the 15 cells settle bottom-up as hatched
 *            sediment, the stem first, then the crossbar spreading out
 *            from the keystone
 *         3. Plotting: each cell turns from hatch to the white face a
 *            beat after it lands
 *         4. Ink: a pen traces the outline clockwise in palette order,
 *            inlays and all
 *         5. Sounding: one band rises through the T past the depth ticks
 *         6. Wordmark: the seven framed letters (shadow, near-white face,
 *            coloured frame strips) rise from their baseline
 *     - Loading loop, 4.4 s per cycle: a sounding pass, then a light lap
 *       around the inlay channel; repeats until done()
 *     - Exit, 1.1 s: a scan line climbs the sheet and wipes it away; each
 *       cell, letter and line of text lifts off just as the line reaches it
 *     - Cutting plan from Dennis's grid: 9 crossbar columns, 6 stem rows.
 *       Cells overlap by 3 units of identical artwork so moving cells never
 *       open cracks; at rest the sheet shows the whole finished T
 *     - done() during the intro plays the rest of it at 2.5 times speed,
 *       then the exit; the promise settles once the sheet is gone. Once
 *       the app is ready, a click on the sheet or any key skips straight
 *       to the exit; a key that skips is consumed, so it does not also
 *       reach the app's shortcuts
 *     - cover: the page regions passed in are made inert while the sheet
 *       shows, so Tab and screen readers cannot wander underneath it
 *     - Honest status: stage text and the progress rule show only what the
 *       app reports; with no figure the rule stays hidden
 *     - Timing and easing read from tokens.css at start
 *     - Reduced motion: the finished T and wordmark appear and leave
 *       without animation and nothing loops, as the visual identity in
 *       docs/ARCHITECTURE.md requires
 *
 * ✒ Usage Instructions:
 *     Wired in already: web/index.html carries the host first in <body>,
 *     web/css/terrane.css imports components/splash.css, and start() in
 *     web/js/app.js drives the sheet:
 *         splash = startSplash({ cover: [skipLink, bar, main, block] });
 *         splash.stage('Connecting to the local service');
 *         splash.progress(0.4);          // only if a real figure exists
 *         splash.done();                 // first survey batch drawn
 *     done() returns a promise that settles once the sheet is gone; it is
 *     safe to call more than once.
 *
 * ✒ Examples:
 *     startSplash();                                 // host #splash
 *     startSplash({ host: el, rate: 0.25 });         // study the motion
 *     startSplash({ cover: [document.querySelector('main')] });
 *     splash.stage('Measuring 1,204 items');
 *     splash.progress(null);                         // back to indeterminate
 *     splash.cancel();                               // drop it immediately
 *
 * ✒ Other Important Information:
 *     - Dependencies: web/js/terrane-mark.js (generated artwork: the T,
 *       its grid and the framed wordmark),
 *       web/css/components/splash.css, web/css/tokens.css. No third-party
 *       code: motion runs on the Web Animations API
 *     - Compatible platforms: current Chrome, Edge, Firefox, Safari. The
 *       spring uses linear() easing where supported, ease-out-expo before
 *     - Security: DOM is built with createElementNS and textContent;
 *       styles go through CSSOM (style.setProperty, Web Animations), never
 *       style attributes, so a strict style-src does not block the sheet
 * ----------------------------------------------------------------------------
 */

import { T, GRID, WORDMARK, addGradients, edgePaint, addWordmarkGradients, wordmarkPaint } from './terrane-mark.js';

const NS = 'http://www.w3.org/2000/svg';
const [VIEW_W, VIEW_H] = T.view;
const CHANNEL_LEN = T.channelLength;

/* ── Cutting plan ─────────────────────────────────────────────────────────── */

const PAD = 4;      // past the T's outer edge
const OV = 3;       // overlap between neighbouring cells (identical artwork)

function buildCells() {
  const { cols, junction, rows, stemX } = GRID;
  const cells = [];
  for (let i = 0; i < 9; i++) {
    const keystone = i >= 3 && i <= 5;
    const x0 = i === 0 ? -PAD : cols[i] - OV;
    const x1 = i === 8 ? VIEW_W + PAD : cols[i + 1] + OV;
    const y1 = keystone ? junction + OV : junction + PAD;
    cells.push({ id: `c${i + 1}`, x: x0, y: -PAD, w: x1 - x0, h: y1 + PAD, bottom: junction, cx: (cols[i] + cols[i + 1]) / 2 });
  }
  for (let r = 0; r < 6; r++) {
    const y0 = rows[r] - OV;
    const y1 = r === 5 ? VIEW_H + PAD : rows[r + 1] + OV;
    cells.push({ id: `s${r + 1}`, x: stemX[0] - PAD, y: y0, w: stemX[1] - stemX[0] + 2 * PAD, h: y1 - y0, bottom: r === 5 ? VIEW_H : rows[r + 1], cx: (stemX[0] + stemX[1]) / 2 });
  }
  return cells;
}
const CELLS = buildCells();

// Deposit order: the stem bottom-up, then the crossbar out from the keystone.
const DEPOSIT = [['s6'], ['s5'], ['s4'], ['s3'], ['s2'], ['s1'], ['c5'], ['c4', 'c6'], ['c3', 'c7'], ['c2', 'c8'], ['c1', 'c9']];

/* ── DOM helpers ──────────────────────────────────────────────────────────── */

function svgEl(tag, attrs = {}, parent = null) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null) continue;
    if (k === 'style') {
      // CSSOM, declaration by declaration: a style attribute would be
      // refused by a strict style-src, CSSOM writes are not.
      for (const decl of String(v).split(';')) {
        const i = decl.indexOf(':');
        if (i > 0) el.style.setProperty(decl.slice(0, i).trim(), decl.slice(i + 1).trim());
      }
    } else {
      el.setAttribute(k, String(v));
    }
  }
  if (parent) parent.append(el);
  return el;
}

function htmlEl(tag, cls, parent = null, text = null) {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (text !== null) el.textContent = text;
  if (parent) parent.append(el);
  return el;
}

const show = (el, on = true) => (on ? el.removeAttribute('data-off') : el.setAttribute('data-off', ''));

/* ── Tokens ───────────────────────────────────────────────────────────────── */

function readTokens() {
  const css = getComputedStyle(document.documentElement);
  const raw = (name, fallback) => (css.getPropertyValue(name) || '').replace(/\s+/g, ' ').trim() || fallback;
  const ms = (name, fallback) => parseFloat(raw(name, `${fallback}ms`)) || fallback;
  const linearOk = typeof CSS !== 'undefined' && CSS.supports('transition-timing-function', 'linear(0, 1)');
  const expo = raw('--ease-out-expo', 'cubic-bezier(0.16, 1, 0.3, 1)');
  return {
    dur: { instant: ms('--dur-instant', 90), fast: ms('--dur-fast', 140), base: ms('--dur-base', 220), slow: ms('--dur-slow', 420) },
    ease: {
      out: raw('--ease-out', 'cubic-bezier(0.2, 0.8, 0.2, 1)'),
      expo,
      inOut: raw('--ease-in-out', 'cubic-bezier(0.65, 0, 0.35, 1)'),
      in: raw('--ease-in', 'cubic-bezier(0.5, 0, 0.75, 0)'),
      spring: linearOk ? raw('--ease-spring', expo) : expo,
    },
  };
}

/* ── The sheet ────────────────────────────────────────────────────────────── */

function buildSheet(host) {
  host.replaceChildren();
  const plate = htmlEl('div', 'splash-plate', host);
  const frame = htmlEl('div', 'splash-frame', plate);
  frame.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 4; i++) htmlEl('i', null, frame);

  /* the mark */
  const svg = svgEl('svg', { class: 'splash-mark', viewBox: `0 0 ${VIEW_W} ${VIEW_H}`, 'aria-hidden': 'true', focusable: 'false' }, plate);
  const defs = svgEl('defs', {}, svg);
  addGradients(defs, 'tsp');
  const faceArt = svgEl('g', { id: 'tsp-face-art', transform: T.layer }, defs);
  svgEl('path', { d: T.face, style: 'fill:var(--t-face)' }, faceArt);
  for (const e of T.edges) {
    const g = svgEl('g', { id: `tsp-edge-${e.id}`, transform: T.layer }, defs);
    svgEl('path', { d: e.strip, style: `fill:${edgePaint(e, 'tsp')}` }, g);
    svgEl('path', { d: e.pill, style: `fill:${edgePaint(e, 'tsp')}` }, g);
  }
  const mark = svgEl('g', { id: 'tsp-mark' }, defs);
  svgEl('use', { href: '#tsp-face-art' }, mark);
  for (const e of T.edges) svgEl('use', { href: `#tsp-edge-${e.id}` }, mark);

  for (const c of CELLS) {
    const cp = svgEl('clipPath', { id: `tsp-cell-${c.id}`, clipPathUnits: 'userSpaceOnUse' }, defs);
    svgEl('rect', { x: c.x, y: c.y, width: c.w, height: c.h }, cp);
  }
  const pills = svgEl('clipPath', { id: 'tsp-pills', clipPathUnits: 'userSpaceOnUse' }, defs);
  for (const e of T.edges) svgEl('path', { d: e.pill, transform: T.layer }, pills);
  const faceClip = svgEl('clipPath', { id: 'tsp-face', clipPathUnits: 'userSpaceOnUse' }, defs);
  svgEl('path', { d: T.face, transform: T.layer }, faceClip);
  const silhouette = svgEl('clipPath', { id: 'tsp-silhouette', clipPathUnits: 'userSpaceOnUse' }, defs);
  svgEl('path', { d: T.face, transform: T.layer }, silhouette);
  for (const e of T.edges) svgEl('path', { d: e.strip, transform: T.layer }, silhouette);
  const pat = svgEl('pattern', { id: 'tsp-hatch', width: 7, height: 7, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, defs);
  svgEl('rect', { width: 1.5, height: 7, style: 'fill:var(--line)' }, pat);
  const sheenGrad = svgEl('linearGradient', { id: 'tsp-sheen', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
  svgEl('stop', { offset: 0, style: 'stop-color:var(--paper);stop-opacity:0' }, sheenGrad);
  svgEl('stop', { offset: 0.5, style: 'stop-color:var(--paper);stop-opacity:0.62' }, sheenGrad);
  svgEl('stop', { offset: 1, style: 'stop-color:var(--paper);stop-opacity:0' }, sheenGrad);

  // Layers, back to front.
  const under = svgEl('g', { class: 'tsp-under' }, svg);
  const lines = svgEl('g', { class: 'tsp-construction', style: 'stroke:var(--line);stroke-width:1.4;fill:none;stroke-dasharray:1;opacity:0.32' }, under);
  const vLines = [];
  const hLines = [];
  for (const x of GRID.cols) vLines.push(svgEl('path', { d: `M ${x},-30 V 134`, pathLength: 1 }, lines));
  for (const x of GRID.stemFaceX) vLines.push(svgEl('path', { d: `M ${x},-30 V ${VIEW_H + 30}`, pathLength: 1 }, lines));
  for (const y of [GRID.faceTop, GRID.faceBottom]) hLines.push(svgEl('path', { d: `M -30,${y} H ${VIEW_W + 30}`, pathLength: 1 }, lines));
  for (const y of GRID.rows) hLines.push(svgEl('path', { d: `M 124,${y} H 280`, pathLength: 1 }, lines));
  const stake = svgEl('g', { style: 'stroke:var(--line);stroke-width:1.6;fill:none' }, under);
  svgEl('circle', { cx: 0, cy: 0, r: 7 }, stake);
  svgEl('path', { d: 'M -13,0 H 13 M 0,-13 V 13' }, stake);
  // Ground: a rule drawn as a filled rect (house standard), under the base.
  const ground = svgEl('rect', { x: 36, y: VIEW_H + 4, width: VIEW_W - 72, height: 1.6, style: `fill:var(--line);transform-box:view-box;transform-origin:${VIEW_W / 2}px ${VIEW_H + 4.8}px` }, under);
  const ticks = svgEl('g', { class: 'tsp-ticks' }, under);
  const tickYs = [...GRID.rows.slice(1), VIEW_H];
  const tickEls = tickYs.map((y) => svgEl('rect', { x: 128, y: y - 0.8, width: 14, height: 1.6, style: 'fill:var(--line);opacity:0.35' }, ticks));

  // Plot cells: hatch and face per cell, deposited as one block.
  const plotLayer = svgEl('g', { class: 'tsp-plot' }, svg);
  const plot = {};
  for (const c of CELLS) {
    const g = svgEl('g', { 'clip-path': `url(#tsp-cell-${c.id})`, style: `transform-box:view-box;transform-origin:${c.cx}px ${c.bottom}px` }, plotLayer);
    const hatch = svgEl('rect', { x: 0, y: 0, width: VIEW_W, height: VIEW_H, style: 'fill:url(#tsp-hatch);opacity:0.9', 'clip-path': 'url(#tsp-face)' }, g);
    const face = svgEl('use', { href: '#tsp-face-art', style: 'opacity:0' }, g);
    plot[c.id] = { g, hatch, face };
  }
  // Edges, inked one by one along the pen's path.
  const edgeLayer = svgEl('g', { class: 'tsp-edges' }, svg);
  const edges = T.edges.map((e) => ({ e, el: svgEl('use', { href: `#tsp-edge-${e.id}` }, edgeLayer) }));
  // The finished T at rest, and full-art cells for the exit.
  const whole = svgEl('g', { class: 'tsp-whole', 'data-off': '' }, svg);
  svgEl('use', { href: '#tsp-mark' }, whole);
  const cellsLayer = svgEl('g', { class: 'tsp-cells', 'data-off': '' }, svg);
  const cellEls = {};
  for (const c of CELLS) {
    const g = svgEl('g', { style: `transform-box:view-box;transform-origin:${c.cx}px ${c.bottom}px` }, cellsLayer);
    svgEl('use', { href: '#tsp-mark', 'clip-path': `url(#tsp-cell-${c.id})` }, g);
    cellEls[c.id] = g;
  }
  const over = svgEl('g', { class: 'tsp-over' }, svg);
  const nibStyle = (w, colour) => `fill:none;stroke:${colour};stroke-width:${w};stroke-linecap:round;stroke-dasharray:0.01 ${CHANNEL_LEN};opacity:0`;
  const nib = svgEl('path', { d: T.channel, style: nibStyle(9, 'var(--line)') }, over);
  const nibCore = svgEl('path', { d: T.channel, style: nibStyle(4.5, 'var(--mark)') }, over);
  const sheenWrap = svgEl('g', { 'clip-path': 'url(#tsp-silhouette)' }, over);
  const sheen = svgEl('rect', { x: -10, y: 0, width: VIEW_W + 20, height: 64, style: `fill:url(#tsp-sheen);transform:translateY(${VIEW_H + 12}px)` }, sheenWrap);
  const channel = svgEl('g', { 'clip-path': 'url(#tsp-pills)' }, over);
  const comet = [[24, 0.95], [70, 0.5], [150, 0.22]].map(([len, op]) => ({
    len,
    el: svgEl('path', { d: T.channel, style: `fill:none;stroke:var(--paper);stroke-width:13;stroke-dasharray:${len} ${CHANNEL_LEN - len};opacity:0`, 'data-op': op }, channel),
  }));

  /* the wordmark: each letter rises from behind its own baseline */
  const wm = svgEl('svg', { class: 'splash-wordmark', viewBox: `0 0 ${WORDMARK.width} ${WORDMARK.height}`, 'aria-hidden': 'true', focusable: 'false' }, plate);
  wm.style.setProperty('--splash-wm-ratio', String(WORDMARK.width / WORDMARK.height));
  const wmDefs = svgEl('defs', {}, wm);
  addWordmarkGradients(wmDefs, 'tsp-wm');
  // Dennis's letter shadow: the silhouette in black under a soft blur,
  // with the filter region he set on the T in TER.svg.
  const wmBlur = svgEl('filter', { id: 'tsp-wm-blur', x: -0.10341571, y: -0.11624234, width: 1.2068314, height: 1.2324847, 'color-interpolation-filters': 'sRGB' }, wmDefs);
  svgEl('feGaussianBlur', { stdDeviation: WORDMARK.blur }, wmBlur);
  const base = svgEl('clipPath', { id: 'tsp-wm-base', clipPathUnits: 'userSpaceOnUse' }, wmDefs);
  svgEl('rect', { x: -40, y: -2 * WORDMARK.height, width: WORDMARK.width + 80, height: 3 * WORDMARK.height + 2 }, base);
  const wmClip = svgEl('g', { 'clip-path': 'url(#tsp-wm-base)' }, wm);
  const letters = WORDMARK.letters.map((l) => {
    const g = svgEl('g', { 'data-letter': l.id }, wmClip);
    svgEl('path', { d: l.shadow, filter: 'url(#tsp-wm-blur)', style: 'fill:#000000;fill-rule:evenodd' }, g);
    svgEl('path', { d: l.face, style: 'fill:var(--t-wordmark-face);fill-rule:evenodd' }, g);
    for (const s of l.strips) {
      // Each strip is stroked in its own paint so the joins between
      // strips show no hairline of the shadow underneath at small sizes.
      const paint = wordmarkPaint(s, 'tsp-wm');
      svgEl('path', { d: s.d, style: `fill:${paint};stroke:${paint};stroke-width:3;stroke-linejoin:miter` }, g);
    }
    return g;
  });

  const status = htmlEl('p', 'splash-status', plate);
  const stageText = htmlEl('span', 'splash-stage', status, 'Opening Terrane');
  const pct = htmlEl('span', 'splash-pct', status);
  pct.setAttribute('aria-hidden', 'true');
  const rule = htmlEl('div', 'splash-rule', plate);
  rule.hidden = true;
  rule.setAttribute('aria-hidden', 'true');
  htmlEl('i', null, rule);

  return {
    host, plate, frame, svg, lines, vLines, hLines, stake, ground, ticks, tickEls, tickYs,
    plotLayer, plot, edgeLayer, edges, whole, cellsLayer, cellEls, nib, nibCore, sheen,
    channel, comet, wm, letters, status, stageText, pct, rule,
  };
}

/* ── The sequence ─────────────────────────────────────────────────────────── */

const INSET = { right: 'inset(0 100% 0 0)', left: 'inset(0 0 0 100%)', down: 'inset(0 0 100% 0)', up: 'inset(100% 0 0 0)' };

function intro(ctx) {
  const v = ctx.v;
  const { dur, ease } = ctx.tok;
  const P = ctx.play;
  const a = [];
  const draw = [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }];
  const fadeOut = (el, at, from = 1) => P(el, [{ opacity: from }, { opacity: 0 }], { duration: 500, delay: at, easing: ease.out, fill: 'forwards' });

  // 1. Survey set-up (0 to 1.5 s)
  a.push(P(v.frame, [{ opacity: 0 }, { opacity: 1 }], { duration: dur.slow, easing: ease.out }));
  a.push(P(v.stake, [{ opacity: 0, transform: 'scale(0.4)' }, { opacity: 1, transform: 'none' }], { duration: dur.slow, delay: 100, easing: ease.expo }));
  v.vLines.forEach((l, i) => a.push(P(l, draw, { duration: 600, delay: 200 + i * 45, easing: ease.out })));
  v.hLines.forEach((l, i) => a.push(P(l, draw, { duration: 600, delay: 520 + i * 45, easing: ease.out })));
  a.push(P(v.ground, [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: dur.slow, delay: 720, easing: ease.expo }));
  a.push(P(v.ticks, [{ opacity: 0 }, { opacity: 1 }], { duration: dur.slow, delay: 900, easing: ease.out }));

  // 2 and 3. Strata deposit, then plotting (1.2 s to 4.8 s)
  DEPOSIT.forEach((ids, k) => ids.forEach((id) => {
    const t0 = 1200 + k * 210;
    const { g, hatch, face } = v.plot[id];
    a.push(P(g, [
      { transform: 'translateY(-110px) scaleY(1)', opacity: 0, easing: ease.in },
      { transform: 'translateY(0px) scaleY(0.86)', opacity: 1, offset: 0.5, easing: ease.out },
      { transform: 'translateY(0px) scaleY(1.04)', offset: 0.72, easing: ease.inOut },
      { transform: 'translateY(0px) scaleY(1)', opacity: 1 },
    ], { duration: 700, delay: t0 }));
    a.push(P(face, [{ opacity: 0 }, { opacity: 1 }], { duration: 380, delay: t0 + 1000, easing: ease.out }));
    a.push(P(hatch, [{ opacity: 0.9 }, { opacity: 0 }], { duration: 420, delay: t0 + 1100, easing: ease.out }));
  }));

  // 4. Ink: one constant-speed pen, clockwise from the top (3.9 s to 5.5 s)
  const traceStart = 3900;
  const traceDur = 1600;
  let run = 0;
  for (const { e, el } of v.edges) {
    const d = (e.len / CHANNEL_LEN) * traceDur;
    a.push(P(el, [{ clipPath: INSET[e.reveal] }, { clipPath: 'inset(0 0 0 0)' }], { duration: d, delay: traceStart + run, easing: 'linear' }));
    run += d;
  }
  for (const n of [v.nib, v.nibCore]) {
    a.push(P(n, [
      { strokeDashoffset: 0, opacity: 0 }, { opacity: 1, offset: 0.03 }, { opacity: 1, offset: 0.97 },
      { strokeDashoffset: -CHANNEL_LEN, opacity: 0 },
    ], { duration: traceDur, delay: traceStart, easing: 'linear' }));
  }

  // 5. Sounding (5.4 s to 6.1 s), the survey lines retract around it
  a.push(P(v.sheen, [{ transform: `translateY(${VIEW_H + 12}px)` }, { transform: 'translateY(-76px)' }], { duration: 700, delay: 5400, easing: ease.inOut }));
  v.tickEls.forEach((t, i) => {
    const f = (VIEW_H + 12 + 32 - v.tickYs[i]) / (VIEW_H + 12 + 76);
    a.push(P(t, [{ opacity: 0.35 }, { opacity: 1, offset: 0.3 }, { opacity: 0.35 }], { duration: 360, delay: 5400 + f * 700 - 100, easing: ease.out }));
  });
  a.push(fadeOut(v.lines, 5500, 0.32), fadeOut(v.stake, 5500), fadeOut(v.ground, 6000));

  // 6. Wordmark and status (5.7 s to 6.7 s)
  const rise = [{ transform: `translateY(${WORDMARK.height + 12}px)` }, { transform: 'none' }];
  v.letters.forEach((g, i) => a.push(P(g, rise, { duration: 620, delay: 5700 + i * 70, easing: ease.expo })));
  const lift = [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }];
  a.push(P(v.status, lift, { duration: dur.slow, delay: 6200, easing: ease.expo }));
  a.push(P(v.rule, [{ opacity: 0 }, { opacity: 1 }], { duration: dur.slow, delay: 6300, easing: ease.out }));
  return a;
}

function rest(ctx) {
  show(ctx.v.whole);
  show(ctx.v.plotLayer, false);
  show(ctx.v.edgeLayer, false);
}

function loop(ctx) {
  // One cycle: a sounding pass (0 to 1.5 s), then a light lap around the
  // inlay channel (1.7 s to 4.3 s).
  const v = ctx.v;
  const { ease } = ctx.tok;
  const period = 4400;
  const from = VIEW_H + 12;
  const to = -76;
  const anims = [ctx.play(v.sheen, [
    { transform: `translateY(${from}px)`, offset: 0, easing: ease.inOut },
    { transform: `translateY(${to}px)`, offset: 1500 / period },
    { transform: `translateY(${to}px)`, offset: 1 },
  ], { duration: period, iterations: Infinity, fill: 'none' })];
  v.tickEls.forEach((t, i) => {
    const f = (from + 32 - v.tickYs[i]) / (from - to);
    const at = Math.max(0, f * 1500 - 120);
    anims.push(ctx.play(t, [
      { opacity: 0.35, offset: 0 }, { opacity: 1, offset: 0.02 }, { opacity: 0.35, offset: 0.08 }, { opacity: 0.35, offset: 1 },
    ], { duration: period, iterations: Infinity, delay: at, fill: 'none' }));
  });
  const a0 = 1700 / period;
  const a1 = 4300 / period;
  for (const { len, el } of v.comet) {
    const op = Number(el.getAttribute('data-op'));
    anims.push(ctx.play(el, [
      { strokeDashoffset: len, opacity: 0, offset: 0 },
      { strokeDashoffset: len, opacity: 0, offset: a0 - 0.01 },
      { strokeDashoffset: len, opacity: op, offset: a0 },
      { strokeDashoffset: len - CHANNEL_LEN, opacity: op, offset: a1 },
      { strokeDashoffset: len - CHANNEL_LEN, opacity: 0, offset: a1 + 0.01 },
      { strokeDashoffset: len - CHANNEL_LEN, opacity: 0, offset: 1 },
    ], { duration: period, iterations: Infinity, easing: 'linear', fill: 'none' }));
  }
  return anims;
}

async function stopLoop(ctx, anims) {
  // Lights out over a beat, then drop the loop.
  const { dur, ease } = ctx.tok;
  await Promise.allSettled([ctx.v.channel, ctx.v.sheen.parentNode].map((el) => ctx.play(el, [{ opacity: 1 }, { opacity: 0 }], { duration: dur.fast, easing: ease.out }).finished));
  anims.forEach((a) => a.cancel());
}

async function outro(ctx) {
  // Excavation scan: a line climbs the sheet and wipes it away; each cell,
  // letter and line of text lifts off as the line reaches its bottom edge.
  const v = ctx.v;
  const { ease } = ctx.tok;
  show(v.cellsLayer);
  show(v.whole, false);
  const scan = htmlEl('div', 'splash-scan', v.host);
  const box = v.host.getBoundingClientRect();
  const D = 1100;
  const at = (bottomPx) => Math.max(0, Math.min(D, ((box.bottom - bottomPx) / box.height) * D));
  const liftOff = (el, bottomPx = el.getBoundingClientRect().bottom) => ctx.play(el,
    [{ transform: 'none', opacity: 1 }, { transform: 'translateY(-46px)', opacity: 0 }],
    { duration: 320, delay: at(bottomPx), easing: ease.in });
  // A clipped <use> reports the whole T's box, so place cells from the grid.
  const mark = v.svg.getBoundingClientRect();
  const scale = mark.height / VIEW_H;
  const moves = [
    ctx.play(v.host, [{ clipPath: 'inset(0 0 0 0)' }, { clipPath: 'inset(0 0 100% 0)' }], { duration: D, easing: 'linear' }),
    ctx.play(scan, [{ transform: 'translateY(0)' }, { transform: `translateY(${-box.height}px)` }], { duration: D, easing: 'linear' }),
    ...CELLS.map((c) => liftOff(v.cellEls[c.id], mark.top + c.bottom * scale)),
    ...v.letters.map(liftOff),
    liftOff(v.status), liftOff(v.rule),
  ];
  await Promise.allSettled(moves.map((m) => m.finished));
}

/* ── Controller ───────────────────────────────────────────────────────────── */

export function startSplash(options = {}) {
  const host = options.host ?? document.getElementById('splash');
  if (!host) throw new Error('startSplash: no host element (#splash)');
  const reduced = options.reducedMotion ?? matchMedia('(prefers-reduced-motion: reduce)').matches;
  const onPhase = typeof options.onPhase === 'function' ? options.onPhase : () => {};
  const cover = (options.cover || []).filter((el) => el && !el.inert);
  for (const el of cover) el.inert = true;

  // A previous run may have left filled effects on the host (an exit's clip
  // or fade): clear them before building, or the new sheet starts clipped.
  for (const a of host.getAnimations({ subtree: true })) a.cancel();
  host.hidden = false;
  for (const p of ['clip-path', 'opacity', 'background']) host.style.removeProperty(p);

  const state = { rate: options.rate ?? 1, anims: new Set(), phase: 'intro', doneRequested: false, cancelled: false, looping: false, loopAnims: [], donePromise: null };
  const ctx = {
    tok: readTokens(),
    v: buildSheet(host),
    play(el, keyframes, opts) {
      const a = el.animate(keyframes, { fill: 'both', ...opts });
      a.playbackRate = state.rate;
      state.anims.add(a);          // tracked until cancel(): a finished effect still holds its fill
      return a;
    },
  };
  const setPhase = (p) => { state.phase = p; host.dataset.phase = p; onPhase(p); };
  setPhase('intro');

  // Once the app is ready, any click on the sheet or any key ends the intro.
  // A key that skips is consumed, so it does not also reach the app's own
  // shortcuts underneath.
  const skip = (event) => {
    if (!state.doneRequested || state.phase !== 'intro') return;
    // A key meant for a control outside the sheet (a page that hosts the
    // sheet in a panel, beside working controls) is left to that control.
    const target = event.target;
    if (event.type === 'keydown' && target instanceof Element && target !== document.body
      && target !== document.documentElement && !host.contains(target)
      && !cover.some((el) => el.contains(target))) return;
    for (const a of introAnims) {
      try { a.finish(); } catch { /* already gone */ }
    }
    if (event.type === 'keydown') { event.preventDefault(); event.stopPropagation(); }
  };
  host.addEventListener('pointerdown', skip);
  window.addEventListener('keydown', skip, true);

  let introAnims;
  if (reduced) {
    show(ctx.v.whole);
    show(ctx.v.plotLayer, false);
    show(ctx.v.edgeLayer, false);
    for (const el of [ctx.v.lines, ctx.v.stake, ctx.v.ground, ctx.v.ticks]) el.style.setProperty('display', 'none');
    introAnims = [ctx.play(ctx.v.plate, [{ opacity: 1 }, { opacity: 1 }], { duration: 0 })];
  } else {
    introAnims = intro(ctx);
  }
  const introDone = Promise.allSettled(introAnims.map((a) => a.finished)).then(() => {
    if (state.cancelled) return;
    // Bake every intro end state into inline style and drop the effects,
    // so later motion starts from what is on screen, not from a fill.
    for (const a of introAnims) {
      try { a.commitStyles(); } catch { /* not rendered: nothing to keep */ }
      a.cancel();
    }
    if (!reduced) rest(ctx);
    if (!state.doneRequested) {
      setPhase('loading');
      if (!reduced) { state.loopAnims = loop(ctx); state.looping = true; }
    }
  });

  const controller = {
    get phase() { return state.phase; },

    stage(label) {
      if (state.cancelled || typeof label !== 'string') return;
      const el = ctx.v.stageText;
      if (el.textContent === label) return;
      if (reduced) { el.textContent = label; return; }
      const out = ctx.play(el, [{ opacity: 1 }, { opacity: 0 }], { duration: ctx.tok.dur.instant, easing: ctx.tok.ease.out });
      out.finished.then(() => {
        el.textContent = label;
        out.cancel();
        ctx.play(el, [{ opacity: 0 }, { opacity: 1 }], { duration: ctx.tok.dur.fast, easing: ctx.tok.ease.out });
      }, () => {});
    },

    progress(p) {
      if (state.cancelled) return;
      const { rule, pct } = ctx.v;
      if (typeof p !== 'number' || Number.isNaN(p)) {
        rule.hidden = true;
        pct.textContent = '';
        return;
      }
      const v = Math.min(1, Math.max(0, p));
      rule.hidden = false;
      rule.style.setProperty('--p', String(v));
      pct.textContent = `${Math.round(v * 100)}%`;
    },

    setRate(r) {
      state.rate = r;
      for (const a of state.anims) a.updatePlaybackRate(r);
    },

    done() {
      if (state.donePromise) return state.donePromise;
      state.doneRequested = true;
      state.donePromise = (async () => {
        if (state.phase === 'intro') {
          for (const a of introAnims) a.updatePlaybackRate(state.rate * 2.5);
        }
        await introDone;
        if (state.cancelled) return;
        if (state.looping) await stopLoop(ctx, state.loopAnims);
        state.looping = false;
        state.loopAnims = [];
        ctx.v.stageText.textContent = 'Terrane is ready';
        setPhase('outro');
        if (!reduced) {
          await outro(ctx);
        }
        controller.cancel();
        setPhase('done');
      })();
      return state.donePromise;
    },

    cancel() {
      state.cancelled = true;
      host.removeEventListener('pointerdown', skip);
      window.removeEventListener('keydown', skip, true);
      for (const el of cover) el.inert = false;
      for (const a of state.anims) a.cancel();
      for (const a of host.getAnimations({ subtree: true })) a.cancel();
      state.anims.clear();
      host.replaceChildren();
      host.hidden = true;
      for (const p of ['clip-path', 'opacity', 'background']) host.style.removeProperty(p);
    },
  };
  return controller;
}
