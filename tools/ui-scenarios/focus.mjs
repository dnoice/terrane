/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Location Scenario (Terrane Edition - v1.1)
 *     - File Name: focus.mjs
 *     - Relative Path: tools/ui-scenarios/focus.mjs
 *     - Artifact Type: test
 *     - Version: 1.1.0
 *     - Date: 11/13/2026
 *     - Update: Friday, November 13, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Changelog:
 *     - 1.1.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] — The
 *       ledger's count is read as the page now writes it: "1 item" for
 *       a folder holding one entry, "N items" otherwise.
 *     - 1.0.0 (11/12/2026) [dendogg + Anthropic - Claude Opus 5.5] —
 *       Initial release.
 *
 * ✒ Description:
 *     Checks "where you are" in both passes. Without WebGL there is no
 *     camera, so going to a folder must move the location there and a
 *     relayout must leave it alone; with WebGL the camera still decides,
 *     and a flight that starts from a view of the sky moves the location
 *     once, when the folder comes into view.
 *
 * ✒ Key Features:
 *     - Every step a person takes is a key: Tab, Home, arrow keys, Enter,
 *       Escape, Backspace, Alt+Left and Enter on a breadcrumb; only the
 *       view of the sky is set through the viewport
 *     - Without WebGL, every place that shows the location is checked at
 *       each step: focus, breadcrumbs and aria-current, the Contents list
 *       and its count, the inspector's "You are in", the kind legend and
 *       the up button
 *     - Without WebGL, grain changes (each a full relayout) keep the
 *       location
 *     - On the fixture without WebGL, the 13-level chain is walked from
 *       the root to depth-13 through the Contents ledger and back up
 *     - With WebGL, the location after a flight is the folder or a folder
 *       inside it, and a view of the sky reads as the root
 *     - With WebGL, the location during a flight from the sky is sampled
 *       on every frame: it must not show the folder, fall back to the
 *       root and show the folder again
 *
 * ✒ Usage Instructions:
 *     node tools/ui-check.mjs focus
 *     node tools/ui-check.mjs --pass nogl focus
 *
 * ✒ Other Important Information:
 *     - Dependencies: tools/ui-check.mjs (the context t)
 *     - Compatible platforms: Node.js 22.5+
 * ----------------------------------------------------------------------------
 */

/** Everything on the page that shows the location, read in one go. */
const WHERE = (T) => {
  const f = T.S.focus;
  let depth = 0;
  const parts = [];
  for (let a = f; a.p; a = a.p) {
    depth++;
    parts.unshift(a.n);
  }
  const insp = document.getElementById('inspector-body');
  return {
    name: f.n,
    path: parts.join('/'),
    depth,
    items: f.c.length,
    crumbs: [...document.querySelectorAll('#crumbs .crumb')].map((b) => b.textContent),
    current: [...document.querySelectorAll('#crumbs [aria-current=location]')].map((b) => b.textContent),
    sub: document.getElementById('ledger-sub').textContent,
    listed: T.S.tab === 'contents' && T.list.items.length === f.c.length && T.list.items.every((n) => n.p === f),
    youAreIn: insp.querySelector('.insp-kind')?.textContent === 'You are in' ? insp.querySelector('.insp-name')?.textContent : null,
    chips: document.querySelectorAll('#legend .chip').length,
    kinds: T.S.lens === 'kind' ? f.ks.filter((b) => b > 0).length : -1,
    up: !document.getElementById('b-up').disabled,
    primary: T.S.primary?.n ?? null,
  };
};

/** Index of the first folder in the Contents list that holds a folder, or of the named folder. */
const ROW = (T, name) => T.list.items.findIndex((n) => n.d && (name ? n.n === name : n.c.some((c) => c.d)));

/** Selects Contents row i from the keyboard (the list must have focus). */
async function goToRow(t, i) {
  await t.key('Home');
  for (let k = 0; k < i; k++) await t.key('ArrowDown');
  return t.waitFor((T, n) => T.list.cursor === n && T.S.primary === T.list.items[n] && T.S.primary.n, { args: [i] });
}

/** Checks that every place showing the location shows w.name. */
function shows(t, label, w, { inspector = false } = {}) {
  const fmt = w.items.toLocaleString('en-US');
  const ok = w.crumbs.length === w.depth + 1 && w.crumbs.at(-1) === w.name
    && w.current.length === 1 && w.current[0] === w.name
    && w.sub.startsWith(`${fmt} item${w.items === 1 ? '' : 's'}`) && w.listed
    && w.chips === w.kinds && w.up === w.depth > 0
    && (!inspector || w.youAreIn === w.name);
  return t.check(label, ok, JSON.stringify({ ...w, sub: w.sub.slice(0, 40) }));
}

const focus = {
  name: 'focus',
  title: 'Where you are, with and without a camera',
  timeout: 240000,
  async run(t) {
    const start = await t.app(WHERE);
    t.check('the location starts at the root', start.depth === 0 && start.crumbs.length === 1, JSON.stringify(start));
    await t.tabTo('#ledger-list');
    const i = await t.app(ROW);
    if (i < 0) {
      t.skip('going into folders', 'no folder at the root holds a folder');
      return;
    }
    const first = await goToRow(t, i);

    if (t.gl) {
      // The camera decides: after the flight the location is the folder,
      // or a folder inside it that fills the view.
      await t.key('Enter');
      await t.settle();
      const at = await t.app(WHERE);
      t.check(`with WebGL the location follows the flight into ${first}`, at.path === first || at.path.startsWith(`${first}/`), at.path);
      shows(t, 'the breadcrumbs, ledger, legend and up button show it', at);

      // A view of the sky has no point under the centre and reads as the root.
      await t.app((T) => { T.S.view.flyTo({ pitch: 0.35 }, 0); return true; });
      await t.settle();
      const sky = await t.app((T) => ({ point: !!T.S.view.look().point, focus: T.S.focus.p ? T.S.focus.n : '' }));
      t.check('with WebGL a view of the sky reads as the root', !sky.point && sky.focus === '', JSON.stringify(sky));

      // From the sky, Enter on the same folder: the location moves once,
      // when the camera finds it, and never jumps there and back.
      await t.tabTo('#ledger-list');
      const again = await goToRow(t, i);
      await t.eval(() => {
        const T = window.__terrane;
        const seen = [];
        window.__where = seen;
        const t0 = performance.now();
        const step = () => {
          const n = T.S.focus;
          if (seen.at(-1)?.node !== n) seen.push({ node: n, at: Math.round(performance.now() - t0) });
          if (performance.now() - t0 < 4000) requestAnimationFrame(step);
        };
        step();
        return true;
      });
      await t.key('Enter');
      await t.sleep(600);
      await t.settle();
      const path = await t.eval(() => {
        const rel = (n) => { const p = []; for (let a = n; a.p; a = a.p) p.unshift(a.n); return p.join('/'); };
        return window.__where.map((s) => `${rel(s.node) || '/'}@${s.at}`);
      });
      const names = path.map((s) => s.slice(0, s.lastIndexOf('@')));
      const landed = names.at(-1);
      t.check(`from the sky the location moves without flicker (${path.join(' → ')})`, new Set(names).size === names.length && (landed === again || landed.startsWith(`${again}/`)), path.join(' '));
      return;
    }

    // ---- without WebGL: setFocus owns the location ----
    await t.key('Enter');
    await t.until((T, n) => T.S.focus.n === n, { args: [first], timeout: 1500 });
    const one = await t.app(WHERE);
    t.check(`without WebGL Enter on ${first} moves the location there`, one.path === first, one.path || '(root)');
    shows(t, 'the breadcrumbs, ledger, legend and up button show it', one);
    t.check('the spoken sentence names it', (await t.live()).startsWith(`Travelling to ${first}`), await t.live());

    const j = await t.app(ROW);
    const second = j >= 0 ? await goToRow(t, j) : null;
    let two = one;
    if (second) {
      await t.key('Enter');
      two = await t.app(WHERE);
      t.check(`a second Enter goes one level further, to ${second}`, two.path === `${first}/${second}`, two.path);
      shows(t, 'every place shows the second level', two);
    } else {
      const k = await t.app((T) => T.list.items.findIndex((n) => n.d));
      if (k >= 0) {
        const name = await goToRow(t, k);
        await t.key('Enter');
        two = await t.app(WHERE);
        t.check(`a second Enter goes one level further, to ${name}`, two.path === `${first}/${name}`, two.path);
        shows(t, 'every place shows the second level', two);
      } else t.skip('a second level', `${first} holds no folder`);
    }

    // A relayout (grain + and −) keeps the location.
    const grain = await t.app((T) => { window.__layoutBefore = T.S.layout; return T.S.grain; });
    await t.tabTo('#grain-more');
    await t.key('Enter');
    const finer = await t.app((T) => T.S.grain);
    await t.tabTo('#grain-less', { back: true });
    await t.key('Enter');
    const kept = await t.app(WHERE);
    const after = await t.app((T) => ({ grain: T.S.grain, rebuilt: T.S.layout !== window.__layoutBefore }));
    t.check('two grain changes (two relayouts) keep the location',
      kept.path === two.path && finer === grain + 1 && after.grain === grain && after.rebuilt,
      `${kept.path || '(root)'}, grain ${grain} → ${finer} → ${after.grain}, rebuilt ${after.rebuilt}`);
    shows(t, 'and every place still shows it', kept);

    // Up with nothing selected redraws the inspector's "You are in". Back
    // to the list with Shift+Tab: a Tab past the end of the page leaves
    // through the browser's own controls, and headless Edge then stops
    // sending Home, End and the up and down arrows to the page.
    await t.tabTo('#ledger-list', { back: true });
    await t.key('Escape');
    await t.waitFor((T) => !T.S.primary);
    const here = await t.app(WHERE);
    t.check('with nothing selected the inspector says where you are', here.youAreIn === two.name, here.youAreIn);
    await t.key('Backspace');
    const up = await t.app(WHERE);
    t.check('Backspace goes up one level', up.path === one.path, up.path);
    shows(t, 'every place shows the level above, the inspector too', up, { inspector: true });

    // Back through the trail. In the ledger an arrow key also selects the
    // row under the list cursor, so the inspector shows that row here.
    await t.key('Alt+ArrowLeft');
    const back = await t.app(WHERE);
    t.check('Alt+Left goes back to where you were', back.path === two.path, back.path);
    shows(t, 'every place shows it again', back);

    // The root breadcrumb, from the keyboard, with nothing selected.
    await t.key('Escape');
    await t.waitFor((T) => !T.S.primary);
    await t.tabTo('#crumbs .crumb:first-child', { back: true });
    await t.key('Enter');
    const root = await t.app(WHERE);
    t.check('Enter on the root breadcrumb goes to the root', root.depth === 0, root.path);
    shows(t, 'every place shows the root, and the up button is off', root, { inspector: true });

    // The 13-level chain, through the Contents ledger only.
    if (!t.manifest) {
      t.skip('the 13-level chain', 'needs the fixture');
      return;
    }
    await t.tabTo('#ledger-list');
    const dirs = t.manifest.chain.dirs;
    let deepest = root;
    let walked = 0;
    for (const rel of dirs) {
      const name = rel.slice(rel.lastIndexOf('/') + 1);
      const row = await t.app(ROW, name);
      if (row < 0) break;
      await goToRow(t, row);
      await t.key('Enter');
      deepest = await t.app(WHERE);
      if (deepest.path !== rel) break;
      walked++;
    }
    t.check(`Enter thirteen times walks the chain to ${t.manifest.chain.deepest} (${walked} levels)`, walked === 13 && deepest.path === t.manifest.chain.deepest, deepest.path);
    shows(t, 'fourteen breadcrumbs, and the ledger lists depth-13', deepest);
    const lists = await t.app((T) => T.list.items.map((n) => n.n));
    t.check('the ledger at depth-13 holds bedrock.bin and its session files', lists.includes('bedrock.bin') && lists.filter((n) => /^deep-\d\.txt$/.test(n)).length === 6, lists.join(', '));
    for (let k = 0; k < 13; k++) await t.key('Backspace');
    const top = await t.app(WHERE);
    t.check('Backspace thirteen times returns to the root', top.depth === 0, top.path);
    shows(t, 'every place shows the root again', top);
  },
};

export default focus;
