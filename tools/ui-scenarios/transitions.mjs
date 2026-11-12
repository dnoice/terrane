/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Transition Cost Scenario (Terrane Edition - v1.0)
 *     - File Name: transitions.mjs
 *     - Relative Path: tools/ui-scenarios/transitions.mjs
 *     - Artifact Type: test
 *     - Version: 1.0.0
 *     - Date: 11/11/2026
 *     - Update: Wednesday, November 11, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Description:
 *     Measures what a layout transition costs the GPU in the real page.
 *     Every frame is logged with the bytes it sent to each buffer and
 *     whether it redrew the shadow map. A transition must send only the
 *     boxes and pins drawn, never a whole instance array, and must redraw
 *     the 4096 x 4096 shadow map on every fourth frame and on the frame the
 *     boxes arrive; what is on the GPU must still match what was drawn.
 *
 * ✒ Key Features:
 *     - WebGL pass only, any data
 *     - Three transitions: every box of the real layout raised in place,
 *       the grain buttons reached with Tab and pressed with Enter, and a
 *       flight into the first ledger row, which rebuilds the layout while
 *       the eye moves
 *     - Wraps bindBuffer, bufferData and bufferSubData on the page's own
 *       context, and render() on its renderer, and restores them after
 *     - Upload bounds per frame: box matrices at most 64 bytes per box
 *       drawn, colour, style and dim at most 20, pins at most 76 per pin
 *     - Shadow cadence per run of transition frames: passes exactly four
 *       frames apart, and a pass on the frame the boxes arrive
 *     - Reads each instance buffer back with getBufferSubData and compares
 *       it with the array it was uploaded from, then compares the picture
 *       with one drawn after a full upload
 *
 * ✒ Usage Instructions:
 *     node tools/ui-check.mjs transitions --pass webgl
 *
 * ✒ Other Important Information:
 *     - Dependencies: tools/ui-check.mjs (the context t)
 *     - Compatible platforms: Node.js 22.5+
 * ----------------------------------------------------------------------------
 */

const SHADOW_EVERY = 4;
const WHOLE = 72000 * 16 * 4; // the whole box-matrix array, in bytes
const MB = (b) => `${(b / 1048576).toFixed(1)} MB`;

/** Logs every frame the page renders: bytes per buffer kind and shadow passes. */
function install(T) {
  if (window.__gpuLog) return true;
  const v = T.S.view;
  const r = v.renderer;
  const gl = r.getContext();
  const kind = new Map([
    [v.mesh.instanceMatrix.array, 'mat'], [v.mesh.instanceColor.array, 'paint'], [v.aStyle.array, 'paint'],
    [v.aDim.array, 'paint'], [v.pins.instanceMatrix.array, 'pin'], [v.pins.instanceColor.array, 'pin'],
  ]);
  const log = { frames: [], bound: new Map(), owner: new Map(), nMax: v.n, pMax: v.pins.count };
  const fresh = () => ({ mat: 0, paint: 0, pin: 0, other: 0, biggest: 0 });
  log.acc = fresh();
  const count = (target, src, bytes) => {
    const k = kind.get(src) || 'other';
    log.acc[k] += bytes;
    log.acc.biggest = Math.max(log.acc.biggest, bytes);
    if (src && typeof src === 'object') log.owner.set(src, log.bound.get(target));
  };
  const orig = { bindBuffer: gl.bindBuffer, bufferData: gl.bufferData, bufferSubData: gl.bufferSubData, render: r.render, setLayout: v.setLayout, setPins: v.setPins };
  gl.bindBuffer = function (target, buffer) {
    log.bound.set(target, buffer);
    return orig.bindBuffer.apply(this, arguments);
  };
  gl.bufferData = function (target, src) {
    count(target, src, typeof src === 'number' ? src : src.byteLength);
    return orig.bufferData.apply(this, arguments);
  };
  gl.bufferSubData = function (target, offset, src, srcOffset = 0, length = 0) {
    // WebGL2 reads a length of 0 as "to the end of the array".
    const elements = length || (src.BYTES_PER_ELEMENT ? src.length : src.byteLength) - srcOffset;
    count(target, src, elements * (src.BYTES_PER_ELEMENT || 1));
    return orig.bufferSubData.apply(this, arguments);
  };
  // The largest box and pin counts since the last frame bound what it may send.
  v.setLayout = function (layout, ...rest) {
    log.nMax = Math.max(log.nMax, Math.min(layout.n, 72000));
    return orig.setLayout.call(this, layout, ...rest);
  };
  v.setPins = function (list) {
    log.pMax = Math.max(log.pMax, Math.min(list.length, 3000));
    return orig.setPins.call(this, list);
  };
  r.render = function (...args) {
    const f = { tr: !!v.transition, shadow: r.shadowMap.needsUpdate };
    const out = orig.render.apply(this, args);
    Object.assign(f, log.acc, { n: Math.max(log.nMax, v.n), pins: Math.max(log.pMax, v.pins.count) });
    log.acc = fresh();
    log.nMax = v.n;
    log.pMax = v.pins.count;
    log.frames.push(f);
    return out;
  };
  log.restore = () => {
    delete gl.bindBuffer;
    delete gl.bufferData;
    delete gl.bufferSubData;
    r.render = orig.render;
    delete v.setLayout;
    delete v.setPins;
    delete window.__gpuLog;
  };
  window.__gpuLog = log;
  return true;
}

/** Reads every instance buffer back from the GPU and compares it with its array. */
function readBack(T) {
  const v = T.S.view;
  const gl = v.renderer.getContext();
  const log = window.__gpuLog;
  const out = [];
  const attrs = [
    ['box matrices', v.mesh.instanceMatrix, v.n], ['box colours', v.mesh.instanceColor, v.n], ['styles', v.aStyle, v.n],
    ['dims', v.aDim, v.n], ['pin matrices', v.pins.instanceMatrix, v.pins.count], ['pin colours', v.pins.instanceColor, v.pins.count],
  ];
  for (const [name, attr, items] of attrs) {
    const buf = log.owner.get(attr.array);
    const n = items * attr.itemSize;
    if (!buf || !n) {
      out.push({ name, seen: !!buf, n, bad: 0 });
      continue;
    }
    const gpu = new Float32Array(n);
    gl.bindBuffer(gl.COPY_READ_BUFFER, buf);
    gl.getBufferSubData(gl.COPY_READ_BUFFER, 0, gpu);
    gl.bindBuffer(gl.COPY_READ_BUFFER, null);
    let bad = 0;
    for (let i = 0; i < n; i++) if (!Object.is(gpu[i], attr.array[i])) bad++;
    out.push({ name, seen: true, n, bad });
  }
  return out;
}

/** Draws the view as it is, then again after a full upload, and counts differing bytes. */
function samePicture(T) {
  const v = T.S.view;
  const r = v.renderer;
  const gl = r.getContext();
  const w = gl.drawingBufferWidth;
  const h = gl.drawingBufferHeight;
  const grab = () => {
    r.render(v.scene, v.camera);
    const px = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
    return px;
  };
  const a = grab();
  for (const attr of [v.mesh.instanceMatrix, v.mesh.instanceColor, v.aStyle, v.aDim, v.pins.instanceMatrix, v.pins.instanceColor]) {
    attr.clearUpdateRanges();
    attr.needsUpdate = true;
  }
  const b = grab();
  let diff = 0;
  let ink = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) diff++;
    if (i % 4 === 0 && a[i] < 120) ink++;
  }
  return { diff, ink, w, h };
}

/** Frame statistics: uploads on transition frames and the shadow cadence within each run. */
function analyse(frames) {
  const s = { frames: frames.length, tr: 0, runs: 0, passes: 0, arrivals: 0, fresh: 0, minGap: Infinity, maxGap: 0, firstAt: 0, bytes: 0, overMat: [], overPaint: [], overPin: [], whole: 0 };
  let runStart = -1;
  let last = -1;
  frames.forEach((f, i) => {
    if (f.tr) {
      if (runStart < 0) {
        runStart = i;
        last = -1;
        s.runs++;
      }
      s.tr++;
      s.bytes += f.mat + f.paint + f.pin + f.other;
      if (f.shadow) {
        s.passes++;
        if (last >= 0) {
          s.minGap = Math.min(s.minGap, i - last);
          s.maxGap = Math.max(s.maxGap, i - last);
        } else s.firstAt = Math.max(s.firstAt, i - runStart);
        last = i;
      }
    } else if (runStart >= 0) {
      s.arrivals++;
      if (f.shadow) s.fresh++;
      if (last >= 0) s.maxGap = Math.max(s.maxGap, i - last);
      runStart = -1;
    }
    if (f.tr || (i > 0 && frames[i - 1].tr)) {
      if (f.mat > f.n * 64) s.overMat.push(`${f.mat} for ${f.n}`);
      if (f.paint > f.n * 20) s.overPaint.push(`${f.paint} for ${f.n}`);
      if (f.pin > f.pins * 76) s.overPin.push(`${f.pin} for ${f.pins}`);
      if (f.n < 72000 && f.biggest >= WHOLE) s.whole++;
    }
  });
  return s;
}

async function measure(t, label, act) {
  await t.settle();
  await t.app(() => { window.__gpuLog.frames = []; return true; });
  const ran = await act();
  if (ran === false) return null;
  await t.settle();
  const frames = await t.app(() => window.__gpuLog.frames);
  const s = analyse(frames);
  if (!s.tr) {
    t.skip(`${label}: transition costs`, 'no transition ran');
    return s;
  }
  const n = Math.max(...frames.map((f) => f.n));
  t.note(`${label}: ${s.tr} transition frames in ${s.runs} run(s), up to ${n} boxes; ${MB(s.bytes)} sent to buffers (the whole box-matrix array every frame would be ${MB(s.tr * WHOLE)}); ${s.passes} shadow passes on those frames (one per frame before)`);
  t.check(`${label}: no transition frame sends a whole instance array`, s.whole === 0, `${s.whole} frames did`);
  t.check(`${label}: box matrices sent cover only the boxes drawn`, s.overMat.length === 0, s.overMat.slice(0, 3).join('; '));
  t.check(`${label}: colour, style and dim sent cover only the boxes drawn`, s.overPaint.length === 0, s.overPaint.slice(0, 3).join('; '));
  t.check(`${label}: pin buffers sent cover only the pins drawn`, s.overPin.length === 0, s.overPin.slice(0, 3).join('; '));
  const gaps = `passes ${s.minGap === Infinity ? '-' : s.minGap} to ${s.maxGap} frames apart, first ${s.firstAt} frames into a run`;
  t.check(`${label}: while boxes travel the shadow map is redrawn at most every ${SHADOW_EVERY}th frame`, s.minGap >= SHADOW_EVERY, gaps);
  t.check(`${label}: and still keeps up, every ${SHADOW_EVERY}th frame and no fewer`, s.passes > 0 && s.maxGap <= SHADOW_EVERY && s.firstAt < SHADOW_EVERY, gaps);
  t.check(`${label}: the shadow map is redrawn on the frame the boxes arrive`, s.arrivals > 0 && s.fresh === s.arrivals, `${s.fresh} of ${s.arrivals}`);
  const back = await t.app(readBack);
  t.check(`${label}: the GPU buffers hold what is drawn`,
    back.find((b) => b.name === 'box matrices').seen && back.every((b) => b.bad === 0), JSON.stringify(back.filter((b) => b.bad || !b.seen)));
  return s;
}

export default {
  name: 'transitions',
  title: 'GPU cost of layout transitions',
  passes: ['webgl'],
  async run(t) {
    await t.settle();
    t.check('the frame log is installed on the page', await t.app(install));

    // Every box of the real layout raised in place: one transition, all boxes travel.
    await measure(t, 'raise', () => t.app((T) => {
      const v = T.S.view;
      const L = T.S.layout;
      const n = Math.min(L.n, 72000);
      const geo = Float64Array.from(L.geo);
      for (let o = 0; o < L.n * 6; o += 6) {
        geo[o + 1] += geo[o + 4] * 0.25;
        geo[o + 4] *= 1.5;
      }
      const paint = { color: new Uint32Array(n).fill(0xd3d9d4), style: v.aStyle.array.slice(0, n), dim: v.aDim.array.slice(0, n) };
      v.setLayout({ ...L, geo }, paint);
      return true;
    }));
    const pic = await t.app(samePicture);
    t.check('the picture matches one drawn after a full upload', pic.diff === 0 && pic.ink > 0, JSON.stringify(pic));

    // The grain buttons, by keyboard: the page's own relayout and paint.
    await measure(t, 'grain', async () => {
      await t.tabTo('#grain-more');
      await t.key('Enter');
      await t.settle();
      await t.tabTo('#grain-less', { back: true });
      await t.key('Enter');
      return true;
    });
    t.check('the grain is back where it started', (await t.text('#grain-val')) === 'Medium', await t.text('#grain-val'));

    // A flight into the first ledger row, rebuilding the layout on the way.
    await measure(t, 'flight', async () => {
      // Backwards from the grain buttons: a forward Tab that wraps past the
      // end of the page leaves arrows and Home undelivered in headless Edge.
      await t.tabTo('#ledger-list', { back: true });
      await t.key('Home');
      const first = await t.waitFor((T) => T.S.primary && { n: T.S.primary.n, d: !!T.S.primary.d });
      if (!first.d) {
        t.skip('flight: transition costs', `the first row (${first.n}) is a file`);
        return false;
      }
      await t.key('Enter');
      await t.settle();
      await t.key('Backspace');
      return true;
    });

    const end = await t.app(samePicture);
    t.check('after every route the picture still matches a full upload', end.diff === 0 && end.ink > 0, JSON.stringify(end));
    await t.app(() => { window.__gpuLog.restore(); return true; });
    await t.shot('after-transitions');
  },
};
