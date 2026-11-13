/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Layout Safety Scenario (Terrane Edition - v1.1)
 *     - File Name: layout.mjs
 *     - Relative Path: tools/ui-scenarios/layout.mjs
 *     - Artifact Type: test
 *     - Version: 1.1.0
 *     - Date: 11/12/2026
 *     - Update: Thursday, November 12, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Changelog:
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
