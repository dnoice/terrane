/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Relation Lines Scenario (Terrane Edition - v1.0)
 *     - File Name: relations.mjs
 *     - Relative Path: tools/ui-scenarios/relations.mjs
 *     - Artifact Type: test
 *     - Version: 1.0.0
 *     - Date: 11/11/2026
 *     - Update: Wednesday, November 11, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Description:
 *     Checks the viewport's relation-line layer in the real page. Duplicate
 *     ties are its set 'dup': reached by keyboard, drawn in the layer's one
 *     draw call, never re-allocated or re-sent by a repaint, hidden while
 *     boxes travel and written again around the new origin when the eye
 *     moves. A dashed probe drawn across the view proves the dash keeps a
 *     constant size on screen from the overview down to the smallest files.
 *
 * ✒ Key Features:
 *     - Reads the compiled line shader back from the GL context
 *     - Duplicate ties by keyboard on the fixture, in both passes; with
 *       WebGL, endpoints, colour, arc lift and draw calls are checked
 *     - Logs every frame during a relayout: the layer is never visible
 *       while a transition runs, and is again on the frame boxes arrive
 *     - Spies on the line buffers: a repaint that hands the same ties
 *       sends nothing to the GPU
 *     - Measures dash periods in pixels read back from the drawing buffer,
 *       at the overview and after descending to the smallest files
 *
 * ✒ Usage Instructions:
 *     node tools/ui-check.mjs relations
 *
 * ✒ Other Important Information:
 *     - Dependencies: tools/ui-check.mjs (the context t)
 *     - Compatible platforms: Node.js 22.5+
 * ----------------------------------------------------------------------------
 */

const GARNET = 0x9b1c3a;
const PROBE = 0xff00ff; // a colour nothing else in the world uses

/**
 * Draws one straight leg across the upper part of the view, at a distance
 * proportional to the eye's altitude, reads the drawing buffer with and
 * without it, and measures the runs of line pixels along its row.
 */
async function probe(T, dashed, color) {
  const v = T.S.view;
  const r = v.renderer;
  const gl = r.getContext();
  const frame = () => new Promise((res) => requestAnimationFrame(() => res()));
  const cam = v.camera;
  const e = cam.matrixWorld.elements;
  const right = [e[0], e[1], e[2]];
  const up = [e[4], e[5], e[6]];
  const fwd = [-e[8], -e[9], -e[10]];
  const th = Math.tan((cam.fov * Math.PI) / 360);
  const dist = v.alt * 3;
  const at = (x, y) => {
    const d = [0, 1, 2].map((k) => fwd[k] + right[k] * x * th * cam.aspect + up[k] * y * th);
    const l = Math.hypot(...d);
    return [cam.position.x + (d[0] / l) * dist, cam.position.y + (d[1] / l) * dist, cam.position.z + (d[2] / l) * dist];
  };
  const X0 = -0.7;
  const X1 = 0.7;
  const Y = 0.35;
  const W = gl.drawingBufferWidth;
  const H = gl.drawingBufferHeight;
  const grab = () => {
    r.render(v.scene, v.camera);
    const px = new Uint8Array(W * H * 4);
    gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px);
    return px;
  };
  v.setRelation('probe', { color, dashed, legs: [...at(X0, Y), ...at(X1, Y)] });
  await frame();
  await frame();
  const vis = v.relations.visible;
  const count = v.relations.geometry.drawRange.count;
  const withLine = grab();
  v.clearRelation('probe');
  await frame();
  await frame();
  const without = grab();
  const row = Math.round((Y * 0.5 + 0.5) * H);
  const from = Math.ceil((X0 * 0.5 + 0.5) * W) + 3;
  const to = Math.floor((X1 * 0.5 + 0.5) * W) - 3;
  const on = [];
  for (let x = from; x <= to; x++) {
    let hit = false;
    for (let y = row - 2; y <= row + 2 && !hit; y++) {
      const i = (y * W + x) * 4;
      hit = Math.abs(withLine[i] - without[i]) + Math.abs(withLine[i + 1] - without[i + 1]) + Math.abs(withLine[i + 2] - without[i + 2]) > 24;
    }
    on.push(hit);
  }
  // Run starts of line pixels; the distance between two is one period.
  const starts = [];
  for (let k = 1; k < on.length; k++) if (on[k] && !on[k - 1]) starts.push(k);
  const periods = starts.slice(1).map((s, k) => s - starts[k]);
  periods.sort((a, b) => a - b);
  const share = on.filter(Boolean).length / on.length;
  return {
    alt: v.alt, dist, vis, count, share, runs: starts.length,
    median: periods.length ? periods[periods.length >> 1] : 0, min: periods[0] ?? 0, max: periods.at(-1) ?? 0,
    ratio: r.getPixelRatio(), left: v.relationSets.has('probe'),
  };
}

/** The tie legs as the page holds them, checked against the layout. */
function ties(T) {
  const v = T.S.view;
  const L = T.S.layout;
  const set = v.relationSets.get('dup');
  const p = T.S.primary;
  if (!set) return { set: false, primary: p?.n };
  const group = T.S.survey.dupGroups[p.dup - 1].files;
  const top = (i) => [L.geo[i * 6], L.geo[i * 6 + 1] + L.geo[i * 6 + 4] / 2, L.geo[i * 6 + 2]];
  const near = (a, b, tol) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) <= tol;
  const legs = set.legs.length / 6;
  const pi = L.index.get(p);
  let fromOk = true;
  let toOk = true;
  let gpuOk = true;
  const pos = v.relations.geometry.attributes.position.array;
  const o = v.relations.position;
  for (let k = 0; k < legs; k++) {
    const a = Array.from(set.legs.subarray(k * 6, k * 6 + 3));
    const b = Array.from(set.legs.subarray(k * 6 + 3, k * 6 + 6));
    const chord = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    if (pi !== undefined && !near(a, top(pi), chord * 1e-9)) fromOk = false;
    // The far end is the top of a box that shows, or holds, another copy.
    let found = false;
    for (let i = 0; i < L.n && !found; i++) {
      if (!near(b, top(i), chord * 1e-9)) continue;
      const nd = L.node[i];
      found = group.some((f) => f !== p && (f === nd || (() => { for (let x = f; x; x = x.p) if (x === nd) return true; return false; })()));
    }
    if (!found) toOk = false;
    // What the GPU holds, plus the layer's origin, is where the leg starts and ends.
    const s = k * 56 * 3;
    const e = (k * 56 + 55) * 3;
    if (!near([pos[s] + o.x, pos[s + 1] + o.y, pos[s + 2] + o.z], a, chord * 1e-5)) gpuOk = false;
    if (!near([pos[e] + o.x, pos[e + 1] + o.y, pos[e + 2] + o.z], b, chord * 1e-5)) gpuOk = false;
  }
  return {
    set: true, primary: p.n, legs, others: group.length - 1, color: set.color, lift: set.lift, dashed: set.dashed, arrows: set.arrows,
    count: v.relations.geometry.drawRange.count, visible: v.relations.visible, fromOk, toOk, gpuOk, shown: pi !== undefined,
    origin: [v.origin.x, v.origin.y, v.origin.z], at: [o.x, o.y, o.z],
  };
}

/** Logs every rendered frame and every upload into the line buffers. */
function spy(T) {
  const v = T.S.view;
  const r = v.renderer;
  const gl = r.getContext();
  const arrays = new Set(Object.values(v.relations.geometry.attributes).map((a) => a.array));
  const log = { frames: [], bytes: 0, created: 0, geometry: v.relations.geometry };
  const orig = { render: r.render, bufferData: gl.bufferData, bufferSubData: gl.bufferSubData };
  gl.bufferData = function (target, src) {
    if (arrays.has(src)) log.created++;
    return orig.bufferData.apply(this, arguments);
  };
  gl.bufferSubData = function (target, offset, src, srcOffset = 0, length = 0) {
    if (arrays.has(src)) log.bytes += (length || src.length - srcOffset) * src.BYTES_PER_ELEMENT;
    return orig.bufferSubData.apply(this, arguments);
  };
  r.render = function (...args) {
    log.frames.push({ tr: !!v.transition, vis: v.relations.visible, count: v.relations.geometry.drawRange.count });
    return orig.render.apply(this, args);
  };
  log.restore = () => {
    delete gl.bufferData;
    delete gl.bufferSubData;
    r.render = orig.render;
    delete window.__relSpy;
  };
  window.__relSpy = log;
  return true;
}

export default {
  name: 'relations',
  title: 'Relation lines: duplicate ties, dashes and the floating origin',
  async run(t) {
    let overviewAlt = 0;
    if (t.gl) {
      const layer = await t.app((T) => {
        const v = T.S.view;
        const gl = v.renderer.getContext();
        let src = '';
        for (const p of v.renderer.info.programs || []) {
          const s = p.fragmentShader && gl.getShaderSource(p.fragmentShader);
          if (s && s.includes('vLineDistance')) src = s;
        }
        let dashed = 0;
        v.scene.traverse((o) => { if (o.isLine && o.material.type === 'LineDashedMaterial') dashed++; });
        const g = v.relations.geometry;
        return {
          mat: v.relations.material.type, vc: v.relations.material.vertexColors, dashed, ties: 'ties' in v,
          cap: g.attributes.position.count, attrs: Object.keys(g.attributes).sort().join(' '),
          gap: src.includes('relationGap( vLineDistance )'), mod: src.includes('mod( vLineDistance, totalSize )'), fw: src.includes('fwidth( d )'),
        };
      });
      t.check('one relation layer, a LineDashedMaterial with vertex colours, replaces the tie lines',
        layer.mat === 'LineDashedMaterial' && layer.vc && layer.dashed === 1 && !layer.ties, JSON.stringify(layer));
      t.check(`its buffers are made once for ${layer.cap.toLocaleString('en-US')} vertices (${layer.attrs})`,
        layer.cap === 40000 && layer.attrs === 'color lineDistance position');
      t.check('the compiled line shader breaks dashes by screen size, not world units',
        layer.gap && layer.fw && !layer.mod, JSON.stringify(layer));

      await t.settle();
      const top = await t.app(probe, true, PROBE);
      overviewAlt = top.alt;
      t.note(`overview: altitude ${top.alt.toPrecision(3)}, dash periods ${top.min} to ${top.max} px (median ${top.median}) over ${top.runs} dashes, ${(top.share * 100).toFixed(0)}% inked`);
      t.check('a dashed probe across the overview is drawn while the view rests', top.vis && top.count === 2 && !top.left, JSON.stringify(top));
      t.check(`its dashes repeat every ${11 * top.ratio} to ${22 * top.ratio} device pixels at the overview (median ${top.median})`,
        top.runs >= 10 && top.median >= 10 * top.ratio && top.median <= 23 * top.ratio && top.share > 0.3 && top.share < 0.7, JSON.stringify(top));
      const solid = await t.app(probe, false, PROBE);
      t.check(`a solid probe is unbroken (${(solid.share * 100).toFixed(1)}% inked)`, solid.share > 0.97 && solid.runs <= 2, JSON.stringify(solid));
      await t.shot('overview');
    }

    if (!t.manifest) {
      t.skip('duplicate ties by keyboard', 'needs the fixture and its copies');
    } else {
      // Duplicate ties, by keyboard: reveal copy-a.dat, clear Find, lens 4.
      await t.key('/');
      await t.type('copy-a.dat');
      await t.waitFor((T) => T.S.search?.list.length > 0);
      await t.keys('Enter', 'Enter');
      await t.waitFor((T) => T.S.primary?.n === 'copy-a.dat');
      await t.key('Escape');
      await t.waitFor((T) => !T.S.search);
      await t.key('4');
      const sel = await t.waitFor((T) => T.S.lens === 'dup' && { n: T.S.primary?.n, dup: !!T.S.primary?.dup, live: document.getElementById('live').textContent });
      t.check('copy-a.dat is selected under the Duplicates lens, by keyboard', sel.n === 'copy-a.dat' && sel.dup, JSON.stringify(sel));
      if (t.gl) {
        await t.settle();
        const tie = await t.app(ties);
        t.check(`selecting a copy fills the set 'dup' (${tie.legs} ties to ${tie.others} other copies)`, tie.set && tie.legs >= 1 && tie.legs <= tie.others, JSON.stringify(tie));
        t.check('the ties are solid garnet arcs lifted 0.3 of their chord, 28 segments each',
          tie.color === GARNET && tie.lift === 0.3 && !tie.dashed && !tie.arrows && tie.count === tie.legs * 56 && tie.visible, JSON.stringify(tie));
        t.check('each tie runs from the top of the selection to the top of a box that shows or holds another copy',
          tie.fromOk && tie.toOk && tie.shown, JSON.stringify(tie));
        t.check('the GPU buffer, plus the layer\'s origin, holds those ends', tie.gpuOk, JSON.stringify(tie));
        const calls = await t.drawCalls();
        const want = t.recorded?.dupTies?.calls ?? t.baseline?.dupTies?.calls;
        t.check(`the ties cost no draw call of their own (${calls.calls}, baseline ${want})`,
          calls.calls === want && calls.drawn.filter((d) => d.startsWith('LineSegments LineDashedMaterial')).length === 1, calls.drawn.join(', '));
        await t.shot('ties');

        // A repaint hands the same ties again: nothing is re-allocated or sent.
        await t.app(spy);
        await t.keys('1', '4');
        await t.settle();
        const quiet = await t.app((T) => {
          const s = window.__relSpy;
          return { bytes: s.bytes, created: s.created, same: s.geometry === T.S.view.relations.geometry, count: T.S.view.relations.geometry.drawRange.count, frames: s.frames.length };
        });
        t.check('repainting with the same ties re-allocates nothing and sends no bytes',
          quiet.bytes === 0 && quiet.created === 0 && quiet.same && quiet.count > 0 && quiet.frames > 0, JSON.stringify(quiet));

        // The eye moves in: the layout is rebuilt around a new origin while boxes travel.
        const before = await t.app((T) => { window.__relSpy.frames = []; return [T.S.view.origin.x, T.S.view.origin.y, T.S.view.origin.z]; });
        await t.keys('+', '+', '+');
        await t.settle();
        const run = await t.app((T) => {
          const f = window.__relSpy.frames;
          return {
            frames: f.length, travelling: f.filter((x) => x.tr).length, shownWhileTravelling: f.filter((x) => x.tr && x.vis).length,
            last: f.at(-1), bytes: window.__relSpy.bytes, hiddenAtRest: f.filter((x) => !x.tr && !x.vis).length,
          };
        });
        const after = await t.app(ties);
        t.check(`the eye moved and the layout was rebuilt with boxes travelling (${run.travelling} of ${run.frames} frames)`,
          run.travelling > 0 && Math.hypot(after.origin[0] - before[0], after.origin[1] - before[1], after.origin[2] - before[2]) > 0, JSON.stringify({ run, before, after: after.origin }));
        t.check('the relation layer is hidden on every frame while boxes travel, and only then',
          run.shownWhileTravelling === 0 && run.hiddenAtRest === 0 && run.last?.vis && run.last?.count > 0, JSON.stringify(run));
        t.check('afterwards the ties are written again around the new origin, ends still on the boxes',
          after.set && after.fromOk && after.toOk && after.gpuOk && after.at.every((x, k) => x === after.origin[k]) && run.bytes > 0,
          JSON.stringify(after));
        await t.app(() => { window.__relSpy.restore(); return true; });

        await t.key('Escape');
        const gone = await t.waitFor((T) => !T.S.primary && { has: T.S.view.relationSets.has('dup'), count: T.S.view.relations.geometry.drawRange.count });
        await t.settle();
        const empty = await t.app((T) => ({ has: T.S.view.relationSets.has('dup'), count: T.S.view.relations.geometry.drawRange.count, vis: T.S.view.relations.visible }));
        t.check('Escape clears the selection and the set \'dup\' with it', !gone.has && !empty.has && empty.count === 0, JSON.stringify(empty));
      } else {
        t.check('without WebGL the same route selects the copy and says so', sel.live.startsWith('copy-a.dat'), sel.live);
      }
    }

    if (!t.gl) return;
    let depth = 0;
    if (t.manifest) {
      // Thirteen levels down: the chain's last notes file, revealed by keyboard.
      await t.key('/');
      await t.type('notes-13.txt');
      await t.waitFor((T) => T.S.search?.list.length > 0);
      await t.keys('Enter', 'Enter');
      await t.waitFor((T) => T.S.primary?.n === 'notes-13.txt');
      await t.settle();
      // Find clears after its debounce, so the second Escape waits for it.
      await t.key('Escape');
      await t.waitFor((T) => !T.S.search);
      await t.key('Escape');
      await t.waitFor((T) => !T.S.primary);
      await t.settle();
      depth = await t.app((T) => { let d = 0; for (let a = T.S.focus; a.p; a = a.p) d++; return d; });
    }
    // Then down to the smallest blocks around: each step stands almost
    // straight above the smallest block in view, so the eye is over it and
    // not over a larger neighbour, and lets the layout open what is there.
    // The layout gives every entry about an eighth of its folder's mean
    // share, so on the fixture this ends near a thousandth of the overview's
    // height; the smoke test covers legs a ten-thousandth of a unit long.
    const steps = [];
    for (let k = 0; k < 14; k++) {
      const s = await t.app((T) => {
        const v = T.S.view;
        const L = T.S.layout;
        let best = -1;
        let bw = Infinity;
        for (let i = 0; i < L.n; i++) {
          if (L.type[i] === 0) continue;
          const w = Math.min(L.geo[i * 6 + 3], L.geo[i * 6 + 5]);
          if (w > 0 && w < bw) { bw = w; best = i; }
        }
        if (best < 0) return null;
        const o = best * 6;
        const g = L.geo;
        v.flyTo(v.constructor.vantage(g[o], g[o + 1] + g[o + 4] / 2, g[o + 2], bw * 1.5, v.cam.yaw, -1.45), 0);
        return bw;
      });
      if (s === null) break;
      await t.settle();
      if (steps.length && s >= steps.at(-1) * 0.98) break;
      steps.push(s);
    }
    const deep = await t.app(probe, true, PROBE);
    const how = `${depth ? `in depth-13 (focus ${depth} levels down), then ` : ''}${steps.length} steps down`;
    t.note(`deep: altitude ${deep.alt.toPrecision(3)} ${how}, ${Math.round(overviewAlt / deep.alt).toLocaleString('en-US')} times lower than the overview; dash periods ${deep.min} to ${deep.max} px (median ${deep.median}) over ${deep.runs} dashes`);
    t.check(`the eye is ${Math.round(overviewAlt / deep.alt).toLocaleString('en-US')} times lower than at the overview, among the smallest blocks`,
      deep.alt < overviewAlt / 300 && (!t.manifest || depth >= 12), JSON.stringify({ depth, steps, alt: deep.alt, overviewAlt }));
    t.check(`down there the dashes still repeat every ${11 * deep.ratio} to ${22 * deep.ratio} device pixels (median ${deep.median})`,
      deep.vis && deep.runs >= 10 && deep.median >= 10 * deep.ratio && deep.median <= 23 * deep.ratio && deep.share > 0.3 && deep.share < 0.7, JSON.stringify(deep));
    await t.shot('deep');
  },
};
