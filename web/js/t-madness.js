/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: T Madness (Terrane Edition - v2.0)
 *     - File Name: t-madness.js
 *     - Relative Path: web/js/t-madness.js
 *     - Artifact Type: javascript
 *     - Version: 2.0.0
 *     - Date: 11/12/2026
 *     - Update: Thursday, November 12, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Changelog:
 *     - 2.0.0 (11/12/2026) [dendogg + Anthropic - Claude Opus 5.5] — Depth
 *       and the pointer, at Dennis's direction after Magnet: the T becomes
 *       a slab on a tilting plate, with a ground shadow, lifted pieces that
 *       cast their own shadows and a sheen that follows the light. Magnet
 *       is rebuilt on a shared pointer engine (hold to gather, release to
 *       blast) and joined by Lantern, Ripple, Flip, Quarry and Velvet.
 *     - 1.0.0 (11/12/2026) [dendogg + Anthropic - Claude Opus 5.5] — Five
 *       variants: Flood, Heartbeat, Light Cycles, Shatter and Magnet.
 *
 * ✒ Description:
 *     Ten animations for Dennis's T-madness drawing: the T cut into 230
 *     pieces along contour rings, from the outer frame in to the ridge
 *     line down its middle. The pieces are treated as terrain: rings are
 *     elevation, the outline is the shore. Four variants play on their
 *     own; six are played with the pointer and fall back to an autopilot
 *     when nobody is pointing. Every variant stands on the same stage,
 *     which gives the T its thickness and turns it toward the pointer.
 *
 * ✒ Key Features:
 *     - Stage (every variant)
 *         Slab        ten stacked copies of the silhouette make the T a
 *                     12-unit-thick tile, dark at the base; the top copy
 *                     is hatched bedrock, which is what a hole in the
 *                     surface shows. The top surface is offset along the
 *                     view, so the side away from the light shows
 *         Plate tilt  the drawing turns up to 7 degrees toward the pointer
 *                     (a perspective rotate on the <svg>) and rests at a
 *                     three-quarter view lit from the upper left
 *         Ground      a soft shadow of the slab falls away from the
 *                     light; painted once into a canvas under the drawing
 *                     and moved by the compositor, never redrawn per frame
 *         Lift        a piece raised off the surface grows slightly,
 *                     shifts with the view and drops its own shadow away
 *                     from the light; a sunk piece shrinks
 *         Sheen       a soft highlight on the top surface tracks the light
 *     - Plays on its own (timed, Web Animations)
 *         Flood       tide water climbs from the shore rings to the ridge,
 *                     lower ground first, a foam line on the front; 7.2 s
 *         Heartbeat   a lub-dub pulse leaves the ridge and travels out ring
 *                     by ring with a red flush; 1.5 s
 *         Light Cycles  racers run every contour ring at its own lap time,
 *                     alternate rings in opposite directions
 *         Shatter     a rumble, a seeded burst of confetti-tinted debris,
 *                     a hang and a spring back from the outline inward;
 *                     the slab and its shadow vanish with the burst; 5.6 s
 *     - Plays with the pointer (per-frame engine)
 *         Magnet      pieces flee the pointer and spring home; hold to
 *                     gather them into a heap under the pointer, release
 *                     to blast them out
 *         Lantern     the T goes dark and the pointer carries a warm lamp;
 *                     the terrain rises under it, highest at the ridge;
 *                     hold to flare. Unattended, the lamp walks the inlay
 *         Ripple      a click drops a stone: a wave packet runs out through
 *                     the pieces, crests light and troughs dark, rings
 *                     spreading on the ground; a fast pointer leaves a wake
 *         Flip        the pointer turns pieces over like tiles, showing a
 *                     coloured negative of the T on their backs; a click
 *                     turns the whole board in a wave from that point
 *         Quarry      a click knocks a chunk loose: it pops, tumbles, falls
 *                     to the floor, settles flat and flies home; the hole
 *                     shows the slab beneath
 *         Velvet      brushing lays the pile of the pieces the way the
 *                     pointer moves, light one way and dark the other, and
 *                     it relaxes over seconds; hold to smooth it flat
 *     - Rest state is the finished T: outline pieces in their strip's
 *       colour or gradient, face pieces white, each stroked in its own
 *       paint so the 230 joins show no hairline seams
 *     - Each piece is a group of a base path (rest colour) and an overlay
 *       path (effect colour through currentColor), plus a shadow path in a
 *       layer of its own, so motion, colour and shadow never fight
 *     - The pointer is honest: the cursor names what a press does (grab,
 *       crosshair, pointer over pieces that can be knocked loose); Lantern
 *       hides it because the lamp is the cursor
 *     - setRate() scales every variant, physics included; reduced motion
 *       shows the slab at rest with no tilt, no loop and no listeners
 *
 * ✒ Usage Instructions:
 *     Give it an empty element (an aspect ratio of VIEW_BOX[2] / VIEW_BOX[3]
 *     fits it best), then pick a variant:
 *         import { startMadness } from './t-madness.js';
 *         const toy = startMadness({ host: el, variant: 'quarry' });
 *         toy.setRate(0.5);
 *         toy.cancel();
 *
 * ✒ Examples:
 *     startMadness({ host, variant: 'flood' });
 *     startMadness({ host, variant: 'lantern', rate: 0.5 });
 *     startMadness({ host, variant: 'ripple', reducedMotion: false });
 *     PLAYS_ALONE  // ['flood', 'heartbeat', 'lightcycles', 'shatter']
 *     PLAYS_WITH_POINTER  // ['magnet', 'lantern', 'ripple', 'flip', ...]
 *
 * ✒ Other Important Information:
 *     - Dependencies: web/js/terrane-mark.js (generated artwork: the
 *       finished T for the silhouette, 230 pieces with ring, edge,
 *       clockwise position and centre)
 *     - Compatible platforms: current Chrome, Edge, Firefox, Safari
 *     - Colours come from the T palette variables when the host sits
 *       inside .splash or anything else that defines them, with the
 *       drawing's own hex values as fallbacks
 *     - Ids: one instance per page (defs use the tmd- prefix)
 *     - Frame cost: the engine writes SVG transform attributes about each
 *       piece's own centre and puts alpha on the paint, not the element;
 *       measured at 51 to 61 frames a second in headless Chrome with
 *       software rendering (11/12/2026)
 *     - Touch: the host takes touch-action none while a pointer variant
 *       runs, so a drag on it plays rather than scrolls the page
 *     - Security: DOM through createElementNS, styles through CSSOM only
 * ----------------------------------------------------------------------------
 */

import { T, MADNESS, addGradients, edgePaint } from './terrane-mark.js';

export const PLAYS_ALONE = ['flood', 'heartbeat', 'lightcycles', 'shatter'];
export const PLAYS_WITH_POINTER = ['magnet', 'lantern', 'ripple', 'flip', 'quarry', 'velvet'];
export const VARIANTS = [...PLAYS_ALONE, ...PLAYS_WITH_POINTER];

const NS = 'http://www.w3.org/2000/svg';
const [W, H] = T.view;
const EDGES = Object.fromEntries(T.edges.map((e) => [e.id, e]));

/* ── stage geometry ───────────────────────────────────────────────────────── */

const SLAB = 12;            // thickness of the T, view units
const COPIES = 10;          // silhouettes stacked to draw that thickness
const TILT = 7;             // degrees the plate turns at full pose
const LEAN = 0.5;           // view-units of offset per unit of height at full pose
const PAD = { x: 36, top: 30, bottom: 78 };
export const VIEW_BOX = [-PAD.x, -PAD.top, W + 2 * PAD.x, H + PAD.top + PAD.bottom];
const [VX, VY, VW, VH] = VIEW_BOX;
const FLOOR = H + 50;       // where Quarry's pieces land
const CX = W / 2;
const CY = H * 0.42;
const REST = { u: -0.46, v: -0.56 };   // three-quarter view, light from the upper left

/* ── helpers ──────────────────────────────────────────────────────────────── */

function svgEl(tag, attrs = {}, parent = null) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null) continue;
    if (k === 'style') {
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

function rng(seed) {             // mulberry32: same burst every run
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hex(c) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(c).trim());
  const n = parseInt(m ? m[1] : 'ffffff', 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Mixes two #rrggbb colours; returns #rrggbb, so results mix again. */
function mix(a, b, t) {
  const A = hex(a);
  const B = hex(b);
  const k = Math.min(1, Math.max(0, t));
  return `#${A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join('')}`;
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const ease = (dt, tau) => 1 - Math.exp(-dt / tau);
const smooth = (x) => x * x * (3 - 2 * x);

function palette(host) {
  const css = getComputedStyle(host);
  const get = (name, fallback) => {
    const v = css.getPropertyValue(name).trim();
    return /^#[0-9a-f]{6}$/i.test(v) ? v : fallback;
  };
  return {
    tan: get('--t-tan', '#d3b981'), brown: get('--t-brown', '#9d621e'),
    lb: get('--t-light-blue', '#78b2cd'), db: get('--t-dark-blue', '#34749a'),
    mid: get('--t-wordmark', '#5a97b7'), face: get('--t-face', '#ffffff'),
    paper: get('--paper', '#fafbf8'), mark: get('--mark', '#f4c430'),
    signal: get('--signal', '#e5482d'), ink: get('--ink', '#18201e'),
    spring: (() => {
      const ok = typeof CSS !== 'undefined' && CSS.supports('transition-timing-function', 'linear(0, 1)');
      const v = getComputedStyle(document.documentElement).getPropertyValue('--ease-spring').replace(/\s+/g, ' ').trim();
      return ok && v ? v : 'cubic-bezier(0.16, 1, 0.3, 1)';
    })(),
  };
}

const EXPO = 'cubic-bezier(0.16, 1, 0.3, 1)';

/** The inlay channel as a walkable polyline: dist → {x, y}. */
function channelWalker() {
  const tok = T.channel.trim().split(/\s+/);
  const pts = [];
  let x = 0;
  let y = 0;
  for (let i = 0; i < tok.length; i++) {
    const c = tok[i];
    if (c === 'M') { [x, y] = tok[++i].split(',').map(Number); pts.push([x, y]); }
    else if (c === 'H') { x = Number(tok[++i]); pts.push([x, y]); }
    else if (c === 'V') { y = Number(tok[++i]); pts.push([x, y]); }
    else if (c === 'Z') pts.push([...pts[0]]);
  }
  const seg = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const len = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    seg.push({ a: pts[i - 1], b: pts[i], at: total, len });
    total += len;
  }
  return (dist) => {
    let d = ((dist % total) + total) % total;
    for (const s of seg) {
      if (d <= s.len) {
        const k = s.len ? d / s.len : 0;
        return { x: s.a[0] + (s.b[0] - s.a[0]) * k, y: s.a[1] + (s.b[1] - s.a[1]) * k };
      }
      d -= s.len;
    }
    return { x: pts[0][0], y: pts[0][1] };
  };
}

/* ── build: stage and pieces ──────────────────────────────────────────────── */

function build(host, pal) {
  host.replaceChildren();
  const placed = getComputedStyle(host).position === 'static';
  if (placed) host.style.setProperty('position', 'relative');
  // The ground shadow is blurred, and a blur is costly to redraw every
  // frame: it is painted once into a canvas under the drawing and moved
  // with a CSS transform, which the compositor does without repainting.
  const groundSvg = document.createElement('canvas');
  groundSvg.dataset.layer = 'ground-shadow';
  groundSvg.setAttribute('aria-hidden', 'true');
  for (const [k, v] of Object.entries({ position: 'absolute', left: '0', top: '0', width: '100%', height: '100%', 'object-fit': 'contain', 'pointer-events': 'none', 'will-change': 'transform' })) {
    groundSvg.style.setProperty(k, v);
  }
  host.append(groundSvg);
  const svg = svgEl('svg', {
    viewBox: VIEW_BOX.join(' '), 'aria-hidden': 'true', focusable: 'false',
    style: 'position:relative;display:block;width:100%;height:100%;overflow:visible;transform-origin:50% 46%',
  }, host);
  const defs = svgEl('defs', {}, svg);
  addGradients(defs, 'tmd', true);

  // The silhouette of the finished T (face and eight strips), reused by
  // the slab and the sheen's clip.
  const sil = svgEl('g', { id: 'tmd-silhouette', transform: T.layer }, defs);
  svgEl('path', { d: T.face }, sil);
  for (const e of T.edges) svgEl('path', { d: e.strip }, sil);
  const clip = svgEl('clipPath', { id: 'tmd-clip' }, defs);
  svgEl('use', { href: '#tmd-silhouette' }, clip);
  // Bedrock: what a hole in the top surface shows, hatched like the
  // sediment on the loading sheet.
  const bed = svgEl('pattern', { id: 'tmd-bedrock', width: 6, height: 6, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, defs);
  svgEl('rect', { width: 6, height: 6, style: `fill:${mix(pal.paper, pal.ink, 0.16)}` }, bed);
  svgEl('rect', { width: 1.4, height: 6, style: `fill:${mix(pal.paper, pal.ink, 0.42)}` }, bed);
  const glint = svgEl('radialGradient', { id: 'tmd-sheen' }, defs);
  svgEl('stop', { offset: 0, 'stop-color': '#ffffff', 'stop-opacity': 0.42 }, glint);
  svgEl('stop', { offset: 0.5, 'stop-color': '#ffffff', 'stop-opacity': 0.1 }, glint);
  svgEl('stop', { offset: 1, 'stop-color': '#ffffff', 'stop-opacity': 0 }, glint);

  const under = svgEl('g', { 'data-layer': 'ground-level', style: 'pointer-events:none' }, svg);
  const slabWrap = svgEl('g', { 'data-layer': 'slab', style: 'pointer-events:none' }, svg);
  const sideDark = mix(pal.ink, pal.db, 0.22);
  const sideLight = mix(pal.ink, pal.paper, 0.5);
  const copies = [];
  for (let k = 0; k < COPIES; k++) {
    const fill = k === COPIES - 1 ? 'url(#tmd-bedrock)' : mix(sideDark, sideLight, k / (COPIES - 2));
    copies.push(svgEl('use', { href: '#tmd-silhouette', style: `fill:${fill}` }, slabWrap));
  }
  const top = svgEl('g', { 'data-layer': 'top-surface' }, svg);
  const shadows = svgEl('g', { 'data-layer': 'piece-shadows', style: 'pointer-events:none' }, top);
  const layer = svgEl('g', { 'data-layer': 'pieces' }, top);
  const sheen = svgEl('g', { 'data-layer': 'sheen', 'clip-path': 'url(#tmd-clip)', style: 'pointer-events:none' }, top);
  const sheenDot = svgEl('circle', { r: 170, fill: 'url(#tmd-sheen)' }, sheen);
  const above = svgEl('g', { 'data-layer': 'markers', style: 'pointer-events:none' }, svg);

  const pieces = MADNESS.map(([d, ring, edge, t, cx, cy], i) => {
    const paint = edge ? edgePaint(EDGES[edge], 'tmd') : pal.face;
    const g = svgEl('g', { 'data-i': i, 'data-ring': ring, style: 'transform-box:fill-box;transform-origin:center' }, layer);
    const base = svgEl('path', { d, style: `fill:${paint};stroke:${paint};stroke-width:0.7;stroke-linejoin:round` }, g);
    const over = svgEl('path', { d, style: 'fill:currentColor;stroke:currentColor;stroke-width:0.7;stroke-linejoin:round;opacity:0;color:#ffffff' }, g);
    const shadow = svgEl('path', { d, style: `fill:${pal.ink};opacity:0;transform-box:fill-box;transform-origin:center` }, shadows);
    return { g, base, over, shadow, ring, edge, t, cx, cy, i, w: 1, h: 1 };
  });
  return { svg, defs, under, groundSvg, groundWrap: groundSvg, slabWrap, copies, top, shadows, layer, sheen, sheenDot, above, pieces, placed };
}

/** Paints the slab's soft ground shadow into the canvas at `scale` px/unit. */
function paintGround(canvas, pal, scale) {
  const s = Math.max(0.5, scale);
  canvas.width = Math.ceil(VW * s);
  canvas.height = Math.ceil(VH * s);
  const g = canvas.getContext('2d');
  if (!g) return;
  const [lx, ly] = T.layer.match(/-?[\d.]+/g).map(Number);
  // Shadow-offset trick: the shape is drawn far off the canvas and only
  // its blurred shadow lands on it, which every browser supports.
  const far = canvas.width + 200;
  g.setTransform(s, 0, 0, s, -VX * s - far, -VY * s);
  g.translate(lx, ly);
  g.shadowColor = pal.ink;
  g.shadowBlur = 12 * s;
  g.shadowOffsetX = far;
  g.globalAlpha = 0.2;
  g.fillStyle = pal.ink;
  for (const d of [T.face, ...T.edges.map((e) => e.strip)]) g.fill(new Path2D(d));
}

/* ── stage: pose, light and the slab ──────────────────────────────────────── */

function makeStage(ctx) {
  const st = { u: REST.u, v: REST.v, ex: 0, ey: 0, lx: 0, ly: 0, last: '', px: 1 };
  // Pixels per view unit, for the ground layer's CSS offset; kept current
  // by a ResizeObserver so no frame has to measure the page.
  const measure = () => {
    const r = ctx.host.getBoundingClientRect();
    st.px = r.width && r.height ? Math.min(r.width / VW, r.height / VH) : 1;
    paintGround(ctx.groundSvg, ctx.pal, st.px * Math.min(2, window.devicePixelRatio || 1));
    st.last = '';
  };
  measure();
  st.ro = typeof ResizeObserver === 'function' ? new ResizeObserver(() => { measure(); st.apply(); }) : null;
  st.ro?.observe(ctx.host);
  st.apply = () => {
    const key = `${st.u.toFixed(3)},${st.v.toFixed(3)}`;
    if (key === st.last) return false;
    st.last = key;
    ctx.svg.style.setProperty('transform', `perspective(1400px) rotateX(${(-st.v * TILT).toFixed(2)}deg) rotateY(${(st.u * TILT).toFixed(2)}deg)`);
    st.ex = st.u * LEAN;
    st.ey = st.v * LEAN;
    st.lx = CX + st.u * VW * 0.55;
    st.ly = CY + st.v * VH * 0.55;
    ctx.top.setAttribute('transform', `translate(${(st.ex * SLAB).toFixed(2)} ${(st.ey * SLAB).toFixed(2)})`);
    ctx.copies.forEach((el, k) => {
      const h = (SLAB * k) / COPIES;
      el.setAttribute('transform', `translate(${(st.ex * h).toFixed(2)} ${(st.ey * h).toFixed(2)})`);
    });
    const g = (SLAB * 0.7 + 5) * st.px;
    ctx.groundSvg.style.setProperty('transform', `translate(${(-st.u * g).toFixed(1)}px, ${(-st.v * g).toFixed(1)}px)`);
    ctx.sheenDot.setAttribute('cx', (st.lx - st.ex * SLAB).toFixed(1));
    ctx.sheenDot.setAttribute('cy', (st.ly - st.ey * SLAB).toFixed(1));
    return true;
  };
  /** Eases the pose toward the pointer, or toward rest with a slow sway. */
  st.update = (dt, t, ptr) => {
    let tu;
    let tv;
    if (ptr) {
      tu = clamp(REST.u * 0.25 + 0.85 * (ptr.x - CX) / (VW * 0.5), -1, 1);
      tv = clamp(REST.v * 0.25 + 0.85 * (ptr.y - CY) / (VH * 0.5), -1, 1);
    } else {
      tu = REST.u + 0.07 * Math.sin(t * 0.37);
      tv = REST.v + 0.05 * Math.sin(t * 0.29 + 1.3);
    }
    const k = ease(dt, ptr ? 0.16 : 0.6);
    st.u += (tu - st.u) * k;
    st.v += (tv - st.v) * k;
    return st.apply();
  };
  st.apply();
  return st;
}

/* ── variants that play on their own ──────────────────────────────────────── */

function flood(ctx) {
  const { pal, pieces, play } = ctx;
  const period = 7200;
  for (const p of pieces) {
    // Elevation: ring depth, plus a tilt so the stem's foot is lowest.
    const e = 0.62 * (p.ring / 6) + 0.38 * (1 - p.cy / H);
    const rise = 0.05 + e * 0.36;
    const drain = 0.56 + (1 - e) * 0.3;
    const water = mix(pal.db, pal.lb, Math.min(1, e * 1.15));
    play(p.over, [
      { offset: 0, opacity: 0, color: water },
      { offset: rise, opacity: 0, color: pal.paper },
      { offset: rise + 0.012, opacity: 0.95, color: pal.paper },
      { offset: rise + 0.05, opacity: 0.86, color: water },
      { offset: drain, opacity: 0.86, color: water },
      { offset: drain + 0.06, opacity: 0, color: water },
      { offset: 1, opacity: 0, color: water },
    ], { duration: period, iterations: Infinity, easing: 'linear' });
  }
}

function heartbeat(ctx) {
  const { pal, pieces, play } = ctx;
  const period = 1500;
  for (const p of pieces) {
    const delay = (6 - p.ring) * 32;
    play(p.g, [
      { offset: 0, transform: 'scale(1)', easing: 'cubic-bezier(0.3, 0, 0.2, 1)' },
      { offset: 0.08, transform: 'scale(0.84)', easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' },
      { offset: 0.18, transform: 'scale(1.03)', easing: 'cubic-bezier(0.3, 0, 0.2, 1)' },
      { offset: 0.26, transform: 'scale(0.92)', easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' },
      { offset: 0.38, transform: 'scale(1)' },
      { offset: 1, transform: 'scale(1)' },
    ], { duration: period, delay, iterations: Infinity });
    const face = p.ring >= 3;
    const peak = face ? 0.25 + 0.4 * ((p.ring - 3) / 3) : 0.3;
    p.over.style.setProperty('color', face ? pal.signal : pal.paper);
    play(p.over, [
      { offset: 0, opacity: 0 }, { offset: 0.07, opacity: peak }, { offset: 0.2, opacity: 0 },
      { offset: 0.25, opacity: peak * 0.6 }, { offset: 0.4, opacity: 0 }, { offset: 1, opacity: 0 },
    ], { duration: period, delay, iterations: Infinity });
  }
}

function lightcycles(ctx) {
  const { pal, pieces, play } = ctx;
  const laps = [2600, 2000, 3000, 3400, 2800, 2300, 1700];
  const colours = [pal.paper, pal.paper, pal.paper, pal.tan, pal.lb, pal.brown, pal.mark];
  const one = [{ offset: 0, opacity: 0.95 }, { offset: 0.16, opacity: 0 }, { offset: 1, opacity: 0 }];
  const two = [{ offset: 0, opacity: 0.95 }, { offset: 0.14, opacity: 0 }, { offset: 0.4999, opacity: 0 },
    { offset: 0.5, opacity: 0.95 }, { offset: 0.64, opacity: 0 }, { offset: 1, opacity: 0 }];
  for (const p of pieces) {
    const lap = laps[p.ring];
    const clockwise = p.ring % 2 === 0;
    p.over.style.setProperty('color', colours[p.ring]);
    // Negative delay places each piece on the lap: the head reaches a piece
    // at its clockwise position (or the mirror of it, for reversed rings).
    const delay = clockwise ? -(1 - p.t) * lap : -p.t * lap;
    play(p.over, p.ring >= 3 && p.ring <= 5 ? two : one, { duration: lap, delay, iterations: Infinity, easing: 'linear' });
  }
}

function shatter(ctx) {
  const { pal, pieces, play } = ctx;
  const period = 5600;
  const rand = rng(0x7e44a9e);
  const confetti = [pal.tan, pal.lb, pal.brown, pal.db, pal.mark, pal.mid];
  const cx0 = W / 2;
  const cy0 = 150;
  for (const p of pieces) {
    let dx = p.cx - cx0;
    let dy = p.cy - cy0;
    const len = Math.hypot(dx, dy) || 1;
    const ang = Math.atan2(dy, dx) + (rand() - 0.5) * 0.9;
    const dist = 140 + rand() * 260 + len * 0.25;
    dx = Math.cos(ang) * dist;
    dy = Math.sin(ang) * dist;
    const rot = (rand() * 2 - 1) * 300;
    const s = 0.7 + rand() * 0.5;
    const jx = (rand() - 0.5) * 3;
    const jy = (rand() - 0.5) * 3;
    const back = 0.42 + (p.ring / 6) * 0.1 + rand() * 0.04;
    const tf = (x, y, r, k) => `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${r.toFixed(1)}deg) scale(${k.toFixed(3)})`;
    play(p.g, [
      { offset: 0, transform: tf(0, 0, 0, 1) },
      { offset: 0.03, transform: tf(jx, jy, 0, 1) },
      { offset: 0.05, transform: tf(-jx, -jy, 0, 1) },
      { offset: 0.07, transform: tf(0, 0, 0, 1), easing: EXPO },
      { offset: 0.22, transform: tf(dx, dy, rot, s), easing: 'linear' },
      { offset: back, transform: tf(dx * 1.15, dy * 1.15, rot * 1.15, s), easing: pal.spring },
      { offset: back + 0.26, transform: tf(0, 0, 0, 1) },
      { offset: 1, transform: tf(0, 0, 0, 1) },
    ], { duration: period, iterations: Infinity });
    const tint = p.ring >= 3 ? confetti[Math.floor(rand() * confetti.length)] : pal.paper;
    p.over.style.setProperty('color', tint);
    const peak = p.ring >= 3 ? 0.92 : 0.35;
    play(p.over, [
      { offset: 0, opacity: 0 }, { offset: 0.07, opacity: 0 }, { offset: 0.12, opacity: peak },
      { offset: back, opacity: peak }, { offset: back + 0.2, opacity: 0 }, { offset: 1, opacity: 0 },
    ], { duration: period, iterations: Infinity, easing: 'linear' });
  }
  // The slab, its shadow and the sheen leave with the pieces and come
  // back as the last of them lands, so no empty tile hangs in the air.
  for (const el of [ctx.slabWrap, ctx.groundWrap, ctx.sheen]) {
    play(el, [
      { offset: 0, opacity: 1 }, { offset: 0.08, opacity: 1 }, { offset: 0.15, opacity: 0 },
      { offset: 0.66, opacity: 0 }, { offset: 0.76, opacity: 1 }, { offset: 1, opacity: 1 },
    ], { duration: period, iterations: Infinity, easing: 'linear' });
  }
}

const TIMED = { flood, heartbeat, lightcycles, shatter };

/* ── variants played with the pointer ─────────────────────────────────────── */
/*
 * Each takes the engine's api and returns { step(dt, t, now), down?, up?,
 * cursor, cursorDown?, stop? }. step() writes into S[i] (x, y planar
 * offset; z lift above the top surface, negative to sink; r rotation in
 * degrees; sx, sy scale; c, a overlay colour and alpha) and the engine
 * renders it. ptr is in view units: { x, y, live, down, vx, vy }.
 */

const wander = (t) => ({ x: CX + 175 * Math.sin(t * 0.55), y: 170 + 150 * Math.sin(t * 0.83 + 1.1) });

function magnet(api) {
  const { pieces, S, ptr, pal } = api;
  const glow = [pal.paper, pal.paper, pal.paper, pal.tan, pal.lb, pal.brown, pal.mark];
  const R = 95;
  const PUSH = 5200;
  const K = 34;
  const DAMP = 7.5;
  const GATHER_R = 150;
  const GATHER = 70;
  const BLAST_R = 190;
  const BLAST = 1250;
  const field = svgEl('circle', { r: R, style: `fill:none;stroke:${pal.ink};stroke-width:1.2;stroke-dasharray:3 5;opacity:0.4` }, api.above);
  let fr = R;
  let ax = CX;
  let ay = CY;
  return {
    cursor: 'grab',
    cursorDown: 'grabbing',
    step(dt, t) {
      const live = ptr.live;
      const at = live ? ptr : wander(t);
      ax = at.x;
      ay = at.y;
      const gather = live && ptr.down;
      fr += ((gather ? GATHER_R : R) - fr) * ease(dt, 0.12);
      field.setAttribute('cx', ax.toFixed(1));
      field.setAttribute('cy', ay.toFixed(1));
      field.setAttribute('r', fr.toFixed(1));
      for (let i = 0; i < pieces.length; i++) {
        const p = pieces[i];
        const s = S[i];
        const dx = p.cx + s.x - ax;
        const dy = p.cy + s.y - ay;
        const d = Math.hypot(dx, dy) || 1;
        let fx = -K * s.x;
        let fy = -K * s.y;
        if (gather) {
          if (d < GATHER_R) {
            const w = 1 - d / GATHER_R;
            fx -= dx * GATHER * w;
            fy -= dy * GATHER * w;
          }
        } else if (d < R) {
          const f = PUSH * (1 - d / R) ** 2;
          fx += (dx / d) * f;
          fy += (dy / d) * f;
        }
        const damp = Math.exp(-DAMP * dt);
        s.vx = (s.vx + fx * dt) * damp;
        s.vy = (s.vy + fy * dt) * damp;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        const off = Math.hypot(s.x, s.y);
        s.z = Math.min(34, off * 0.5);
        s.r = s.x * 0.5;
        s.c = glow[p.ring];
        s.a = Math.min(0.85, off / 32);
      }
    },
    up() {
      // Release: whatever was gathered, or a plain click, blasts outward.
      for (let i = 0; i < pieces.length; i++) {
        const p = pieces[i];
        const s = S[i];
        const dx = p.cx + s.x - ax;
        const dy = p.cy + s.y - ay;
        const d = Math.hypot(dx, dy) || 1;
        if (d > BLAST_R) continue;
        const k = BLAST * (1 - d / BLAST_R) ** 1.3;
        s.vx += (dx / d) * k;
        s.vy += (dy / d) * k;
      }
    },
  };
}

function lantern(api) {
  const { pieces, S, ptr, pal, defs, sheen, sheenDot, stage } = api;
  const lampGrad = svgEl('radialGradient', { id: 'tmd-lamp' }, defs);
  svgEl('stop', { offset: 0, 'stop-color': pal.mark, 'stop-opacity': 0.62 }, lampGrad);
  svgEl('stop', { offset: 0.45, 'stop-color': pal.mark, 'stop-opacity': 0.2 }, lampGrad);
  svgEl('stop', { offset: 1, 'stop-color': pal.mark, 'stop-opacity': 0 }, lampGrad);
  const lamp = svgEl('circle', { r: 120, fill: 'url(#tmd-lamp)' }, sheen);
  sheenDot.style.setProperty('opacity', '0');
  const night = mix(pal.ink, pal.db, 0.4);
  const walk = channelWalker();
  let lx = CX;
  let ly = 40;
  let flare = 0;
  return {
    cursor: 'none',
    step(dt, t) {
      const target = ptr.live ? ptr : walk(t * 95);
      const k = ease(dt, ptr.live ? 0.05 : 0.2);
      lx += (target.x - lx) * k;
      ly += (target.y - ly) * k;
      flare += ((ptr.live && ptr.down ? 1 : 0) - flare) * ease(dt, 0.12);
      const R = 62 + flare * 46;
      lamp.setAttribute('cx', (lx - stage.ex * SLAB).toFixed(1));
      lamp.setAttribute('cy', (ly - stage.ey * SLAB).toFixed(1));
      lamp.setAttribute('r', (R * 2).toFixed(1));
      const two = 2 * R * R;
      for (let i = 0; i < pieces.length; i++) {
        const p = pieces[i];
        const s = S[i];
        const lit = Math.exp(-((p.cx - lx) ** 2 + (p.cy - ly) ** 2) / two);
        s.z = lit * (6 + p.ring * 2.4) * (1 + flare * 0.8);
        s.c = night;
        s.a = 0.84 * (1 - lit);
      }
    },
    stop() { sheenDot.style.removeProperty('opacity'); },
  };
}

function ripple(api) {
  const { pieces, S, ptr, pal } = api;
  const C = 150;                 // wave speed, units/s
  const WIDTH = 20;              // packet width
  const KW = (2 * Math.PI) / 50; // wavelength 50 units
  const TAU = 1.8;               // decay
  const LIFE = 4.2;
  const waves = [];
  const rings = svgEl('g', {}, api.under);
  let lastWake = 0;
  let idle = 1.4;
  const drop = (x, y, amp) => {
    const el = svgEl('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: 0, style: `fill:none;stroke:${pal.ink};stroke-width:1.3` }, rings);
    waves.push({ x, y, amp, age: 0, el });
    while (waves.length > 14) waves.shift().el.remove();
  };
  return {
    cursor: 'crosshair',
    down(pt) { drop(pt.x, pt.y, 1); },
    step(dt, t, now) {
      if (ptr.live) {
        idle = 0;
        if (Math.hypot(ptr.vx, ptr.vy) > 240 && now - lastWake > 85) {
          drop(ptr.x, ptr.y, 0.3);
          lastWake = now;
        }
      } else if ((idle += dt) > 2.3) {
        idle = 0;
        const p = pieces[Math.floor(Math.random() * pieces.length)];
        drop(p.cx, p.cy, 0.95);
      }
      for (let k = waves.length - 1; k >= 0; k--) {
        const w = waves[k];
        w.age += dt;
        if (w.age > LIFE) {
          w.el.remove();
          waves.splice(k, 1);
          continue;
        }
        w.decay = w.amp * Math.exp(-w.age / TAU);
        w.front = C * w.age;
        w.el.setAttribute('r', w.front.toFixed(1));
        w.el.style.setProperty('opacity', (0.38 * w.decay).toFixed(3));
      }
      for (let i = 0; i < pieces.length; i++) {
        const p = pieces[i];
        const s = S[i];
        let h = 0;
        let dx = 0;
        let dy = 0;
        for (const w of waves) {
          const rx = p.cx - w.x;
          const ry = p.cy - w.y;
          const d = Math.hypot(rx, ry) || 1;
          const off = d - w.front;
          if (off > 3 * WIDTH || off < -3 * WIDTH) continue;
          const v = w.decay * Math.exp(-(off * off) / (2 * WIDTH * WIDTH)) * Math.cos(KW * off);
          h += v;
          dx += (rx / d) * v;
          dy += (ry / d) * v;
        }
        s.z = clamp(h * 18, -10, 28);
        s.x = dx * 3.5;
        s.y = dy * 3.5;
        if (h >= 0) { s.c = pal.paper; s.a = Math.min(0.8, h * 0.9); }
        else { s.c = pal.db; s.a = Math.min(0.55, -h * 0.7); }
      }
    },
    stop() { rings.remove(); },
  };
}

function flip(api) {
  const { pieces, S, ptr, pal } = api;
  const n = pieces.length;
  const pig = [pal.tan, pal.lb, pal.db, pal.brown];
  const band = (t) => {
    const x = t * 4;
    const i = Math.floor(x) % 4;
    return mix(pig[i], pig[(i + 1) % 4], x - Math.floor(x));
  };
  // The back of each tile: a coloured negative of the T.
  const back = pieces.map((p) => (p.ring >= 3 ? band(p.t) : pal.paper));
  // Wide tiles flip over a horizontal hinge, tall ones over a vertical one.
  const wide = pieces.map((p) => p.w >= p.h);
  const th = new Float32Array(n);
  const om = new Float32Array(n);
  const goal = new Float32Array(n);
  const hold = new Float64Array(n);
  const due = new Float64Array(n);
  const RAD = 30;
  return {
    cursor: 'default',
    down(pt, now) {
      for (let i = 0; i < n; i++) {
        const d = Math.hypot(pieces[i].cx - pt.x, pieces[i].cy - pt.y);
        due[i] = now + d * 2.4;
      }
    },
    step(dt, t, now) {
      const b = ptr.live ? ptr : { x: CX + 170 * Math.sin(t * 0.7), y: 165 + 145 * Math.sin(t * 1.3) * Math.cos(t * 0.45) };
      for (let i = 0; i < n; i++) {
        const p = pieces[i];
        const s = S[i];
        if (due[i] && now >= due[i]) { goal[i] = Math.PI; hold[i] = now + 900; due[i] = 0; }
        if (Math.hypot(p.cx - b.x, p.cy - b.y) < RAD) { goal[i] = Math.PI; hold[i] = now + 1500; }
        if (goal[i] && now > hold[i]) goal[i] = 0;
        const acc = 160 * (goal[i] - th[i]) - 22 * om[i];
        om[i] += acc * dt;
        th[i] += om[i] * dt;
        const c = Math.cos(th[i]);
        const thin = Math.max(0.03, Math.abs(c));
        s.sx = wide[i] ? 1 : thin;
        s.sy = wide[i] ? thin : 1;
        s.z = Math.max(0, Math.sin(th[i])) * 10;
        if (c < 0) { s.c = mix(back[i], pal.ink, (1 + c) * 0.5); s.a = 1; }
        else { s.c = pal.ink; s.a = (1 - c) * 0.4; }
      }
    },
  };
}

function quarry(api) {
  const { pieces, S, ptr, pal, layer } = api;
  const n = pieces.length;
  const G = 900;                 // gravity, units/s²
  const HOME_AFTER = 2.9;
  const RETURN = 0.95;
  const CHUNK = 26;
  const mode = new Uint8Array(n);   // 0 home, 1 flying, 2 resting, 3 returning
  const age = new Float32Array(n);
  const from = pieces.map(() => ({ x: 0, y: 0, r: 0, z: 0 }));
  svgEl('rect', { x: VX, y: FLOOR, width: VW, height: 1.4, style: `fill:${pal.ink};opacity:0.28` }, api.under);
  let hover = -1;
  let idle = 1;
  layer.style.setProperty('cursor', 'pointer');
  const pick = (e) => {
    const g = e.target instanceof Element ? e.target.closest('[data-i]') : null;
    return g ? Number(g.dataset.i) : -1;
  };
  const onOver = (e) => { hover = pick(e); };
  const onOut = () => { hover = -1; };
  layer.addEventListener('pointerover', onOver);
  layer.addEventListener('pointerout', onOut);
  const extent = (p, r) => {
    const a = (r * Math.PI) / 180;
    return { hx: Math.abs(p.w / 2 * Math.cos(a)) + Math.abs(p.h / 2 * Math.sin(a)), hy: Math.abs(p.w / 2 * Math.sin(a)) + Math.abs(p.h / 2 * Math.cos(a)) };
  };
  const knock = (x, y) => {
    for (let i = 0; i < n; i++) {
      if (mode[i] !== 0) continue;
      const p = pieces[i];
      const d = Math.hypot(p.cx - x, p.cy - y);
      if (d > CHUNK) continue;
      const s = S[i];
      const dir = d > 0.5 ? (p.cx - x) / d : (Math.random() - 0.5);
      mode[i] = 1;
      age[i] = 0;
      s.vx = dir * (60 + Math.random() * 90) + (Math.random() - 0.5) * 40;
      s.vy = -(220 + Math.random() * 140);
      s.vr = (Math.random() < 0.5 ? -1 : 1) * (200 + Math.random() * 320);
      layer.append(p.g);            // lifted pieces draw over the rest
    }
  };
  const settle = (r) => Math.round(r / 90) * 90;
  return {
    cursor: 'default',
    down(pt, now, e) {
      if (pick(e) < 0) return;
      knock(pt.x, pt.y);
    },
    step(dt) {
      if (!ptr.live && (idle += dt) > 3) {
        idle = 0;
        const homes = [];
        for (let i = 0; i < n; i++) if (mode[i] === 0) homes.push(i);
        if (homes.length) {
          const p = pieces[homes[Math.floor(Math.random() * homes.length)]];
          knock(p.cx, p.cy);
        }
      }
      if (ptr.live) idle = 0;
      for (let i = 0; i < n; i++) {
        const p = pieces[i];
        const s = S[i];
        const m = mode[i];
        if (m === 0) {
          const want = hover === i ? 5 : 0;
          s.z += (want - s.z) * ease(dt, 0.07);
          s.c = pal.paper;
          s.a = s.z / 5 * 0.3;
          continue;
        }
        age[i] += dt;
        if (m === 1 || m === 2) {
          if (m === 1) {
            s.vy += G * dt;
            s.r += s.vr * dt;
          } else {
            s.vx *= Math.exp(-5 * dt);
            s.r += (settle(s.r) - s.r) * ease(dt, 0.12);
          }
          s.x += s.vx * dt;
          s.y += s.vy * dt;
          s.z = 20 * Math.exp(-age[i] * 3) - SLAB * (1 - Math.exp(-age[i] * 2.4));
          const { hx, hy } = extent(p, s.r);
          const px = p.cx + s.x;
          if (px - hx < VX + 2) { s.x = VX + 2 + hx - p.cx; s.vx = Math.abs(s.vx) * 0.5; }
          if (px + hx > VX + VW - 2) { s.x = VX + VW - 2 - hx - p.cx; s.vx = -Math.abs(s.vx) * 0.5; }
          if (p.cy + s.y + hy >= FLOOR) {
            s.y = FLOOR - p.cy - hy;
            if (m === 1 && s.vy > 0) {
              s.vy = -s.vy * 0.34;
              s.vx *= 0.75;
              s.vr *= 0.55;
              if (Math.abs(s.vy) < 55) { mode[i] = 2; s.vy = 0; }
            }
          }
          s.c = pal.paper;
          s.a = 0;
          if (age[i] > HOME_AFTER) {
            mode[i] = 3;
            age[i] = 0;
            Object.assign(from[i], { x: s.x, y: s.y, r: s.r, z: s.z });
          }
          continue;
        }
        // m === 3: flying home on an arc.
        const e = smooth(Math.min(1, age[i] / RETURN));
        const f = from[i];
        s.x = f.x * (1 - e);
        s.y = f.y * (1 - e);
        s.r = f.r * (1 - e);
        s.z = f.z * (1 - e) + 22 * Math.sin(Math.PI * e);
        if (e >= 1) {
          mode[i] = 0;
          Object.assign(s, { x: 0, y: 0, r: 0, z: 0, vx: 0, vy: 0, vr: 0 });
        }
      }
    },
    stop() {
      layer.removeEventListener('pointerover', onOver);
      layer.removeEventListener('pointerout', onOut);
      layer.style.removeProperty('cursor');
    },
  };
}

function velvet(api) {
  const { pieces, S, ptr, pal } = api;
  const n = pieces.length;
  const nx = new Float32Array(n);
  const ny = new Float32Array(n);
  const LX = -0.6;
  const LY = -0.8;
  const R = 44;
  const brush = svgEl('circle', { r: R, style: `fill:none;stroke:${pal.ink};stroke-width:1;stroke-dasharray:2 4;opacity:0` }, api.above);
  let px = null;
  let py = null;
  let bvx = 0;
  let bvy = 0;
  return {
    cursor: 'default',
    step(dt, t) {
      const auto = !ptr.live;
      const b = auto ? { x: CX + 185 * Math.sin(t * 0.9), y: 175 + 150 * Math.sin(t * 0.53 + 0.7) } : ptr;
      if (auto) {
        if (px !== null && dt > 0) {
          bvx += ((b.x - px) / dt - bvx) * ease(dt, 0.05);
          bvy += ((b.y - py) / dt - bvy) * ease(dt, 0.05);
        }
        px = b.x;
        py = b.y;
      } else {
        bvx = ptr.vx;
        bvy = ptr.vy;
        px = null;
      }
      brush.setAttribute('cx', b.x.toFixed(1));
      brush.setAttribute('cy', b.y.toFixed(1));
      brush.style.setProperty('opacity', auto ? '0.35' : '0');
      const speed = Math.hypot(bvx, bvy);
      const press = ptr.live && ptr.down;
      const relax = Math.exp(-dt / 5.5);
      for (let i = 0; i < n; i++) {
        const p = pieces[i];
        const s = S[i];
        nx[i] *= relax;
        ny[i] *= relax;
        const d = Math.hypot(p.cx - b.x, p.cy - b.y);
        if (press && d < 70) {
          const k = Math.exp(-dt * 7);
          nx[i] *= k;
          ny[i] *= k;
        } else if (speed > 25 && d < R) {
          const w = (1 - d / R) ** 1.5 * Math.min(1, speed / 320) * dt * 10;
          nx[i] += (bvx / speed) * w;
          ny[i] += (bvy / speed) * w;
          const m = Math.hypot(nx[i], ny[i]);
          if (m > 1) { nx[i] /= m; ny[i] /= m; }
        }
        s.x = nx[i] * 1.8;
        s.y = ny[i] * 1.8;
        s.r = nx[i] * 6 - ny[i] * 2;
        s.z = Math.hypot(nx[i], ny[i]) * 5;
        const dot = nx[i] * LX + ny[i] * LY;
        if (dot >= 0) { s.c = pal.paper; s.a = 0.78 * dot; }
        else { s.c = pal.ink; s.a = 0.46 * -dot; }
      }
    },
  };
}

const TOUCH = { magnet, lantern, ripple, flip, quarry, velvet };

/* ── the engine: pointer, pose and per-frame rendering ────────────────────── */

function engine(ctx, def) {
  const { host, pieces, stage } = ctx;
  const S = pieces.map(() => ({ x: 0, y: 0, z: 0, r: 0, sx: 1, sy: 1, vx: 0, vy: 0, vr: 0, c: '#ffffff', a: 0 }));
  const ptr = { x: CX, y: CY, live: false, down: false, vx: 0, vy: 0, at: 0 };
  const toView = (e) => {
    const r = host.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    const k = Math.min(r.width / VW, r.height / VH);
    return {
      x: VX + (e.clientX - (r.left + (r.width - VW * k) / 2)) / k,
      y: VY + (e.clientY - (r.top + (r.height - VH * k) / 2)) / k,
    };
  };
  if (def) {
    for (const p of pieces) {
      try {
        const b = p.base.getBBox();
        p.w = b.width || 1;
        p.h = b.height || 1;
        p.ox = b.x + b.width / 2;
        p.oy = b.y + b.height / 2;
      } catch { /* not rendered: keep 1 × 1 */ }
      p.ox ??= p.cx;
      p.oy ??= p.cy;
      // The engine writes SVG transform attributes about each piece's own
      // centre: cheaper per frame than CSS transforms on fill-box, which
      // re-measure every piece on every write.
      for (const el of [p.g, p.shadow]) {
        el.style.removeProperty('transform-box');
        el.style.removeProperty('transform-origin');
      }
      // Alpha goes on the paint, not the element: element opacity costs an
      // offscreen pass per piece on every frame it changes.
      for (const el of [p.over, p.shadow]) {
        el.style.setProperty('opacity', '1');
        el.style.setProperty('fill-opacity', '0');
      }
      p.over.style.setProperty('stroke-opacity', '0');
    }
  }
  const api = { ...ctx, S, ptr };
  const v = def ? def(api) : null;
  const setCursor = () => {
    const c = v ? (ptr.down && v.cursorDown) || v.cursor : '';
    if (c) host.style.setProperty('cursor', c);
    else host.style.removeProperty('cursor');
  };
  const onMove = (e) => {
    const pt = toView(e);
    if (!pt) return;
    const dtm = Math.max(0.008, (e.timeStamp - ptr.at) / 1000);
    if (ptr.live && dtm < 0.25) {
      ptr.vx += ((pt.x - ptr.x) / dtm - ptr.vx) * 0.5;
      ptr.vy += ((pt.y - ptr.y) / dtm - ptr.vy) * 0.5;
    }
    ptr.x = pt.x;
    ptr.y = pt.y;
    ptr.at = e.timeStamp;
    ptr.live = true;
  };
  const onDown = (e) => {
    onMove(e);
    ptr.down = true;
    try { host.setPointerCapture(e.pointerId); } catch { /* capture is a nicety */ }
    setCursor();
    v?.down?.({ x: ptr.x, y: ptr.y }, performance.now(), e);
  };
  const onUp = (e) => {
    if (!ptr.down) return;
    ptr.down = false;
    setCursor();
    v?.up?.({ x: ptr.x, y: ptr.y }, performance.now(), e);
    if (e.pointerType !== 'mouse') ptr.live = false;
  };
  const onLeave = () => { if (!ptr.down) ptr.live = false; };
  host.addEventListener('pointermove', onMove);
  host.addEventListener('pointerdown', onDown);
  host.addEventListener('pointerup', onUp);
  host.addEventListener('pointercancel', onUp);
  host.addEventListener('pointerleave', onLeave);
  if (v) host.style.setProperty('touch-action', 'none');
  setCursor();

  const render = () => {
    const { ex, ey, lx, ly } = stage;
    for (let i = 0; i < pieces.length; i++) {
      const p = pieces[i];
      const s = S[i];
      const z = s.z;
      const k = 1 + z * 0.0075;
      const about = `translate(${(-p.ox).toFixed(2)} ${(-p.oy).toFixed(2)})`;
      const tf = `translate(${(p.ox + s.x + ex * z).toFixed(2)} ${(p.oy + s.y + ey * z).toFixed(2)}) rotate(${s.r.toFixed(2)}) scale(${(k * s.sx).toFixed(4)} ${(k * s.sy).toFixed(4)}) ${about}`;
      if (tf !== p.tf) { p.g.setAttribute('transform', tf); p.tf = tf; }
      let so = '0';
      if (z > 0.25) {
        const dx = p.cx + s.x - lx;
        const dy = p.cy + s.y - ly;
        const d = Math.hypot(dx, dy) || 1;
        const reach = z * (0.55 + Math.min(1.2, d / 220));
        const st = `translate(${(p.ox + s.x + (dx / d) * reach).toFixed(2)} ${(p.oy + s.y + (dy / d) * reach).toFixed(2)}) rotate(${s.r.toFixed(2)}) scale(${s.sx.toFixed(4)} ${s.sy.toFixed(4)}) ${about}`;
        if (st !== p.st) { p.shadow.setAttribute('transform', st); p.st = st; }
        so = (Math.min(0.34, 0.06 + z * 0.012) * Math.exp(-z / 90)).toFixed(3);
      }
      if (so !== p.so) { p.shadow.style.setProperty('fill-opacity', so); p.so = so; }
      const a = s.a.toFixed(3);
      if (a !== p.a) {
        p.over.style.setProperty('fill-opacity', a);
        p.over.style.setProperty('stroke-opacity', a);
        p.a = a;
      }
      if (s.a > 0 && s.c !== p.c) { p.over.style.setProperty('color', s.c); p.c = s.c; }
    }
  };

  let raf = 0;
  let last = performance.now();
  let t = 0;
  const frame = (now) => {
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)) * ctx.rate;
    last = now;
    t += dt;
    const decay = Math.exp(-dt * 6);
    ptr.vx *= decay;
    ptr.vy *= decay;
    stage.update(dt, t, ptr.live ? ptr : null);
    if (v) {
      v.step(dt, t, now);
      render();
    }
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  return {
    stop() {
      cancelAnimationFrame(raf);
      v?.stop?.();
      host.removeEventListener('pointermove', onMove);
      host.removeEventListener('pointerdown', onDown);
      host.removeEventListener('pointerup', onUp);
      host.removeEventListener('pointercancel', onUp);
      host.removeEventListener('pointerleave', onLeave);
      host.style.removeProperty('touch-action');
      host.style.removeProperty('cursor');
    },
  };
}

/* ── controller ───────────────────────────────────────────────────────────── */

export function startMadness(options = {}) {
  const host = options.host;
  if (!host) throw new Error('startMadness: no host element');
  const variant = VARIANTS.includes(options.variant) ? options.variant : 'flood';
  const reduced = options.reducedMotion ?? matchMedia('(prefers-reduced-motion: reduce)').matches;
  for (const a of host.getAnimations({ subtree: true })) a.cancel();
  const pal = palette(host);
  const ctx = { ...build(host, pal), pal, host, rate: options.rate ?? 1, anims: [] };
  ctx.stage = makeStage(ctx);
  ctx.play = (el, keyframes, opts) => {
    const a = el.animate(keyframes, { fill: 'none', ...opts });
    a.playbackRate = ctx.rate;
    ctx.anims.push(a);
    return a;
  };
  let loop = null;
  if (!reduced) {
    if (TIMED[variant]) {
      TIMED[variant](ctx);
      loop = engine(ctx, null);        // the plate still turns to the pointer
    } else {
      loop = engine(ctx, TOUCH[variant]);
    }
  }
  host.dataset.variant = variant;
  return {
    get variant() { return variant; },
    get running() { return !reduced; },
    get interactive() { return !reduced && PLAYS_WITH_POINTER.includes(variant); },
    setRate(r) {
      ctx.rate = r;
      for (const a of ctx.anims) a.updatePlaybackRate(r);
    },
    cancel() {
      if (loop) loop.stop();
      ctx.stage.ro?.disconnect();
      for (const a of ctx.anims) a.cancel();
      ctx.anims.length = 0;
      host.replaceChildren();
      if (ctx.placed) host.style.removeProperty('position');
      delete host.dataset.variant;
    },
  };
}
