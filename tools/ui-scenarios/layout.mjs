/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Layout Safety Scenario (Terrane Edition - v1.2)
 *     - File Name: layout.mjs
 *     - Relative Path: tools/ui-scenarios/layout.mjs
 *     - Artifact Type: test
 *     - Version: 1.2.0
 *     - Date: 11/14/2026
 *     - Update: Saturday, November 14, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Changelog:
 *     - 1.2.0 (11/14/2026) [dendogg + Anthropic - Claude Opus 5.5] — The
 *       precise terrain, part two: in both passes, layout.unit holds the
 *       unit of the folder each box stands in, and the files of every
 *       open plateau in the page's layout stand one channel apart.
 *     - 1.1.0 (11/12/2026) [dendogg + Anthropic - Claude Opus 5.5] — The
 *       box shader has six bounded style branches now that CROSSED draws;
 *       the AUX table is read with BOX and STYLE.
 *     - 1.0.0 (11/11/2026) [dendogg + Anthropic - Claude Opus 5.5] —
 *       Initial release.
 *
 * ✒ Description:
 *     Checks the layout's safety limits and extension points in the real
 *     page: the layout the page drew stays within its budget and carries
 *     an aux byte per box, the code tables are the reserved ones, the
 *     compiled box shader bounds every style branch, and a layout larger
 *     than the viewport's buffers is drawn up to capacity with a sentence
 *     instead of a RangeError.
 *
 * ✒ Key Features:
 *     - Any data, both passes; the viewport parts run with WebGL only
 *     - Reads BOX, STYLE and MAX_BOXES from the module the page loaded
 *     - Reads the compiled fragment shader back from the GL context
 *     - The unit of each box's folder (layout.unit), and one channel between
 *       the files of every open plateau
 *     - Feeds the viewport a 73,500-box layout made from the real one and
 *       checks the count drawn, the notice (said once) and recovery
 *
 * ✒ Usage Instructions:
 *     node tools/ui-check.mjs layout
 *
 * ✒ Other Important Information:
 *     - Dependencies: tools/ui-check.mjs (the context t)
 *     - Compatible platforms: Node.js 22.5+
 * ----------------------------------------------------------------------------
 */

export default {
  name: 'layout',
  title: 'Layout budget, code tables and viewport capacity',
  async run(t) {
    const got = await t.app(async (T) => {
      const L = T.S.layout;
      const mod = await import(new URL('js/layout.js', document.baseURI).href);
      return {
        n: L.n,
        max: mod.MAX_BOXES,
        aux: L.aux instanceof Uint8Array && L.aux.length === L.n && L.aux.every((v) => v === 0),
        over: L.over,
        box: { ...mod.BOX },
        style: { ...mod.STYLE },
        auxCodes: { ...mod.AUX },
        frozen: Object.isFrozen(mod.BOX) && Object.isFrozen(mod.STYLE) && Object.isFrozen(mod.AUX),
        status: document.getElementById('status-label').textContent,
      };
    });
    t.check(`the layout is within its budget (${got.n} of ${got.max} boxes)`, got.n > 0 && got.n <= got.max && got.over === false);
    t.check('every box carries an aux byte, all zero with no feature marking', got.aux);
    t.check('BOX reserves WALL = 4', JSON.stringify(got.box) === JSON.stringify({ DIR: 0, FILE: 1, CAP: 2, SCREE: 3, WALL: 4 }), JSON.stringify(got.box));
    t.check('STYLE reserves CROSSED = 6 and leaves 7 free',
      JSON.stringify(got.style) === JSON.stringify({ PLAIN: 0, HATCH: 1, HOLLOW: 2, STIPPLE: 3, BANDS: 4, HALF_BANDS: 5, CROSSED: 6 }), JSON.stringify(got.style));
    t.check('AUX names the time view\'s marks: SUNK 1, CROSSED 2', JSON.stringify(got.auxCodes) === JSON.stringify({ NONE: 0, SUNK: 1, CROSSED: 2 }), JSON.stringify(got.auxCodes));
    t.check('the code tables are frozen', got.frozen);
    t.check('the title block does not report blocks left out', !/left out/.test(got.status), got.status);

    // The precise terrain: every box carries the unit of the folder it
    // stands in, and the files of one folder stand one channel apart.
    const ch = await t.app(async (T) => {
      const L = T.S.layout;
      const LY = await import(new URL('js/layout.js', document.baseURI).href);
      const M = await import(new URL('js/model.js', document.baseURI).href);
      const g = L.geo;
      const unit = L.unit instanceof Float64Array && L.unit.length === L.n && L.unit[0] === LY.unitOf(LY.WORLD, LY.WORLD);
      const kidsOf = new Map();
      for (let i = 1; i < L.n; i++) {
        const pi = L.index.get(L.type[i] === LY.BOX.SCREE ? L.node[i] : L.node[i].p);
        if (pi === undefined) continue;
        if (!kidsOf.has(pi)) kidsOf.set(pi, []);
        kidsOf.get(pi).push(i);
      }
      let plateaus = 0;
      let pairs = 0;
      const odd = [];
      for (const [pi, list] of kidsOf) {
        if (L.type[pi] !== LY.BOX.DIR || list.length > 600) continue;
        const S = Math.min(g[pi * 6 + 3], g[pi * 6 + 5]);
        const fileCh = S * Math.min(0.012, 0.1 / Math.sqrt(Math.max(M.kids(L.node[pi]), 1)));
        const tol = 1e-9 * S;
        // Files only, each grown by half the file channel to its slot.
        const R = list.filter((i) => L.type[i] === LY.BOX.FILE && Math.min(g[i * 6 + 3], g[i * 6 + 5]) >= fileCh).map((i) => {
          const o = i * 6;
          return { x0: g[o] - g[o + 3] / 2, x1: g[o] + g[o + 3] / 2, z0: g[o + 2] - g[o + 5] / 2, z1: g[o + 2] + g[o + 5] / 2 };
        });
        const widths = [];
        for (const a of R) {
          for (const b of R) {
            const ox = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
            const oz = Math.min(a.z1, b.z1) - Math.max(a.z0, b.z0);
            const gx = b.x0 - a.x1;
            const gz = b.z0 - a.z1;
            // Facing: overlapping across a gap no wider than a group's channel.
            if (oz > tol && gx > 0 && gx < fileCh * 2.5) widths.push(gx);
            if (ox > tol && gz > 0 && gz < fileCh * 2.5) widths.push(gz);
          }
        }
        if (!widths.length) continue;
        plateaus++;
        pairs += widths.length;
        const lo = Math.min(...widths);
        const hi = Math.max(...widths);
        if (hi - lo > tol || Math.abs(lo - fileCh) > tol) odd.push(`${L.node[pi].n}: ${lo / S} to ${hi / S} S, want ${fileCh / S}`);
      }
      return { unit, plateaus, pairs, odd: odd.slice(0, 4) };
    });
    t.check('layout.unit holds the unit of the folder each box stands in, the root its own', ch.unit);
    t.check(`the files of every open plateau stand one channel apart (${ch.plateaus} plateaus, ${ch.pairs} facing pairs)`, ch.plateaus > 0 && ch.odd.length === 0, JSON.stringify(ch.odd));
    if (!t.gl) return;

    const shader = await t.app((T) => {
      const r = T.S.view.renderer;
      const gl = r.getContext();
      for (const p of r.info.programs || []) {
        const src = p.fragmentShader && gl.getShaderSource(p.fragmentShader);
        if (src && src.includes('vStyle')) {
          const tests = src.match(/vStyle\s*[<>][^){]*/g) || [];
          return { tests, bounded: tests.every((s) => /vStyle > [\d.]+ && vStyle < [\d.]+/.test(s)) };
        }
      }
      return null;
    });
    t.check('the compiled box shader was found', !!shader);
    t.check(`every style branch is bounded on both sides (${shader?.tests.length} branches)`,
      shader && shader.bounded && shader.tests.length === 6 && shader.tests.some((s) => s.startsWith('vStyle > 4.5 && vStyle < 5.5'))
      && shader.tests.some((s) => s.startsWith('vStyle > 5.5 && vStyle < 6.5')), JSON.stringify(shader?.tests));

    await t.settle();
    // A layout past the buffers: the real one tiled out to 73,500 boxes.
    const big = await t.app((T) => {
      const v = T.S.view;
      const L = T.S.layout;
      const n = 73500;
      const key = new Array(n);
      const node = new Array(n);
      const type = new Uint8Array(n);
      const level = new Uint8Array(n);
      const geo = new Float64Array(n * 6);
      const top = new Float64Array(n);
      const index = new Map();
      for (let i = 0; i < n; i++) {
        const s = i % L.n;
        key[i] = i < L.n ? L.key[i] : { tile: i };
        node[i] = L.node[s];
        // Scree tiles become plain boxes: the fake has no scree table.
        type[i] = L.type[s] === 3 ? 1 : L.type[s];
        level[i] = L.level[s];
        geo.set(L.geo.subarray(s * 6, s * 6 + 6), i * 6);
        top[i] = L.top[s];
        index.set(key[i], i);
      }
      const fake = { n, key, node, type, level, geo, top, index, scree: new Map(), aux: new Uint8Array(n), root: L.root };
      const paint = { color: new Uint32Array(n).fill(0xd3d9d4), style: new Float32Array(n), dim: new Float32Array(n) };
      let error = '';
      try {
        v.setLayout(fake, paint);
        v.setLayout(fake, paint);
      } catch (err) {
        error = `${err.name}: ${err.message}`;
      }
      return { error, drawn: v.n, count: v.mesh.count, left: v.leftOut };
    });
    t.check('a 73,500-box layout does not throw', !big.error, big.error);
    t.check(`the viewport draws its capacity and counts the rest (${big.drawn} drawn, ${big.left} left out)`, big.drawn === 72000 && big.count === 72000 && big.left === 1500);
    const said = (await t.notices()).filter((s) => /^Only 72,000 of the 73,500 blocks in this view can be drawn, so 1,500 are left out\./.test(s));
    t.check('the viewport says so once, in a sentence', said.length === 1, JSON.stringify(await t.notices()));
    await t.settle();
    await t.shot('capacity');
    t.check('frames render while clamped', await t.app(async (T) => {
      const frame = () => new Promise((r) => requestAnimationFrame(() => r()));
      T.S.view.invalidate();
      await frame();
      await frame();
      return T.S.view.renderer.info.render.calls > 0;
    }));

    // Back to the real layout through the page's own relayout.
    await t.eval(() => {
      document.getElementById('grain-more').click();
      document.getElementById('grain-less').click();
    });
    await t.settle();
    const back = await t.app((T) => ({ n: T.S.view.n, real: T.S.layout.n, left: T.S.view.leftOut, grain: document.getElementById('grain-val').textContent }));
    t.check(`a layout within capacity draws whole again (${back.n} boxes)`, back.n === back.real && back.left === 0 && back.grain === 'Medium', JSON.stringify(back));
  },
};
