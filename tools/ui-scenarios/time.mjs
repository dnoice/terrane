/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Time Scenario (Terrane Edition - v1.0)
 *     - File Name: time.mjs
 *     - Relative Path: tools/ui-scenarios/time.mjs
 *     - Artifact Type: test
 *     - Version: 1.0.0
 *     - Date: 11/12/2026
 *     - Update: Thursday, November 12, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Description:
 *     Checks the date scrub in the real page, by keyboard: T from the
 *     canvas and from the ledger list, comma and period, < and >, Escape
 *     and the As of stepper reached by Tab. It proves that the layout, the
 *     paint, the ledger, the inspector, the hover tip and the live region
 *     all show the same date and the same changes, that the present comes
 *     back exactly, and that the crossed convention holds its shape and
 *     costs no draw call.
 *
 * ✒ Key Features:
 *     - Any data, both passes; the paint, pixel, hover and draw-call checks
 *       need WebGL; the 13-level chain needs the fixture
 *     - Layout against the rules: a file changed after the date is a
 *       crossed slab, a closed mass is lowered by what it kept, n and key
 *       order are the present's, nothing rises stepping back
 *     - Paint: style 6 exactly where aux is 2, washed once (60% toward
 *       paper), the shader's crossed branch draws ink and no wash, and a
 *       selected crossed block is highlighter yellow with its diagonals
 *       visible on screen
 *     - The present again ('>' and Escape): no crossed box, geometry equal
 *       to a fresh layout, "Back to the present."; while a rescan has no
 *       age table yet, Escape still returns and T says it is not ready
 *     - Sentences start "As of", come once per burst of keys (250 ms), and
 *       say "changed", never "created" or "arrived"
 *     - Inspector: Since MM/DD/YYYY with the table's figures and up to
 *       eight Where the change is rows that reveal, also without WebGL
 *     - Twelve levels down: the slab-to-riser ratio equals the root's, and
 *       a re-based origin moves no pixel of the cross
 *
 * ✒ Usage Instructions:
 *     node tools/ui-check.mjs time
 *     node tools/ui-check.mjs time --pass nogl
 *
 * ✒ Other Important Information:
 *     - Dependencies: tools/ui-check.mjs (the context t); the page's
 *       js/layout.js, js/model.js, js/theme.js and the vendored three.js,
 *       imported in the page for the reference values
 *     - Compatible platforms: Node.js 22.5+
 * ----------------------------------------------------------------------------
 */

const DATE = /^\d\d\/\d\d\/\d{4}$/;
const MARK = 0xf4c430;
// app.js GRAINS, by index (S.grain), for a reference layout built in the page.
const GRAINS = [0.0105, 0.0062, 0.0038, 0.0024];
const WORDS = /creat|arriv|\badded\b/i;

/** In the page: the layout, the paint and the cell against the time view's rules. */
async function audit(T) {
  const S = T.S;
  const L = S.layout;
  const st = S.time;
  const A = S.ages;
  const v = S.view;
  const out = {
    k: st?.k ?? 0, date: st?.date ?? null, t: st?.t ?? null, val: document.getElementById('time-val').textContent,
    on: document.getElementById('time-cell').classList.contains('is-on'), n: L.n, crossed: 0, sunk: 0, bad: [], styleOk: null, washOk: null, washed: 0,
  };
  for (let i = 0; i < L.n; i++) {
    const node = L.node[i];
    const ax = L.aux[i];
    if (ax === 2) out.crossed++;
    if (ax === 1) out.sunk++;
    // The rules: a file or an empty folder changed after the date is
    // crossed; a closed mass with changes is lowered, or crossed when it
    // kept nothing; a sealed folder, a plateau and scree are left alone.
    let want = 0;
    if (st && A && (L.type[i] === 1 || L.type[i] === 2)) {
      if (!node.d) want = node.m > st.t ? 2 : 0;
      else if (node.e) want = 0;
      else if (!node.c.length) want = node.m > st.t ? 2 : 0;
      else want = node.mm > st.t ? (Math.min(1, A.kept(node, st.k)) > 0 ? 1 : 2) : 0;
      if ((want === 2) !== st.crossed(node) && out.bad.length < 5) out.bad.push(`crossed() disagrees on ${node.n}`);
    }
    if (ax !== want && out.bad.length < 5) out.bad.push(`${node.n} type ${L.type[i]} aux ${ax} want ${want}`);
  }
  if (!S.noGL) {
    const { mixHex } = await import(new URL('js/theme.js', document.baseURI).href);
    const { KINDS, FLAG_HIDDEN, FLAG_LINK } = await import(new URL('js/model.js', document.baseURI).href);
    const THREE = await import(new URL('vendor/three/three.module.js', document.baseURI).href);
    const lin = (hex) => { const c = new THREE.Color().setHex(hex); return [c.r, c.g, c.b]; };
    const style = v.aStyle.array;
    const col = v.mesh.instanceColor.array;
    out.styleOk = true;
    out.washOk = true;
    for (let i = 0; i < Math.min(L.n, v.n); i++) {
      if ((style[i] === 6) !== (L.aux[i] === 2)) out.styleOk = false;
      // A crossed file under the Kind lens: its kind colour, washed once.
      const node = L.node[i];
      if (L.aux[i] === 2 && L.type[i] === 1 && S.lens === 'kind' && !(node.f & (FLAG_HIDDEN | FLAG_LINK)) && !S.sel.has(node) && out.washed < 40) {
        out.washed++;
        const want = lin(mixHex(KINDS[node.k].color, 0xf6f8f4, 0.6));
        if (want.some((x, c) => Math.abs(x - col[i * 3 + c]) > 1e-6)) out.washOk = false;
      }
    }
  }
  return out;
}

/** In the page: the present layout rebuilt from the same options, for an exact comparison. */
async function fresh(T, grains) {
  const S = T.S;
  const { buildLayout } = await import(new URL('js/layout.js', document.baseURI).href);
  const L = S.layout;
  const eye = S.lastEye;
  const R = buildLayout(S.model.root, { cam: { x: eye.x, y: eye.y, z: eye.z }, grain: grains[S.grain], now: S.model.now, force: S.force });
  let geoSame = R.n === L.n && R.geo.length === L.geo.length;
  for (let k = 0; geoSame && k < L.geo.length; k++) if (!Object.is(L.geo[k], R.geo[k])) geoSame = false;
  let keysSame = R.n === L.n;
  for (let i = 0; keysSame && i < L.n; i++) if (R.key[i] !== L.key[i]) keysSame = false;
  return { geoSame, keysSame, n: L.n, aux2: L.aux.some((x) => x === 2), aux1: L.aux.some((x) => x === 1), time: S.time };
}

/** In the page: heights and keys of the current layout, kept for a later comparison. */
function keep(T) {
  const L = T.S.layout;
  window.__timeKeep = window.__timeKeep || [];
  window.__timeKeep.push({ L, k: T.S.time?.k ?? 0 });
  return window.__timeKeep.length;
}

/** In the page: every kept layout has the present's n and keys, and no height rises from one step back to the next. */
function compareKept() {
  const list = window.__timeKeep || [];
  const present = list.find((x) => x.k === 0);
  const out = { steps: list.map((x) => x.k), sameKeys: true, rises: 0 };
  if (!present) return out;
  for (const { L } of list) {
    if (L.n !== present.L.n) out.sameKeys = false;
    for (let i = 0; out.sameKeys && i < L.n; i++) if (L.key[i] !== present.L.key[i]) out.sameKeys = false;
  }
  const back = [...list].sort((a, b) => a.k - b.k);
  for (let s = 1; s < back.length; s++) {
    const a = back[s - 1].L;
    const b = back[s].L;
    // Heights are compared box by box. Layouts made seconds apart differ in
    // "now", which ages a fresh file's height by about a part in 10,000;
    // a box the time view raised would differ by a whole slab or more.
    for (let i = 0; i < b.n; i++) if (b.geo[i * 6 + 4] > a.geo[i * 6 + 4] * (1 + 1e-3) + 1e-12) out.rises++;
  }
  return out;
}

/** In the page: what the inspector's Since section says, against the table. */
async function since(T) {
  const S = T.S;
  const A = S.ages;
  const st = S.time;
  const { fmtBytes, fmtCount } = await import(new URL('js/model.js', document.baseURI).href);
  const host = document.getElementById('inspector-body');
  const titles = [...host.querySelectorAll('.section-title')].map((x) => x.textContent);
  const facts = [...host.querySelectorAll('.facts.since > div')].map((d) => d.textContent);
  const rows = [...host.querySelectorAll('.since-where .item')];
  const subject = S.primary || S.focus;
  const out = { titles, facts, rows: rows.map((r) => r.querySelector('.nm').textContent), subject: subject.n, bars: host.querySelectorAll('.facts.since .share').length };
  if (!st || !A) return out;
  const k = st.k;
  out.cb = fmtBytes(A.changedBytes(subject, k));
  out.cf = fmtCount(A.changedFiles(subject, k));
  if (subject.d) {
    const want = subject.c
      .map((ch) => ({ n: ch.n, b: A.changedBytes(ch, k), f: ch.d ? A.changedFiles(ch, k) : ch.m > st.t ? 1 : 0, empty: ch.d && !ch.e && !ch.c.length && ch.m > st.t }))
      .filter((x) => x.f || x.empty).sort((a, b) => b.b - a.b || b.f - a.f || a.n.localeCompare(b.n));
    out.want = want.slice(0, 8).map((x) => x.n);
    out.whereCount = want.length;
  }
  out.text = host.textContent;
  return out;
}

/** In the page: records every sentence the live region carries. */
function listen() {
  const live = document.getElementById('live');
  window.__lives = [];
  window.__liveObs?.disconnect();
  window.__liveObs = new MutationObserver(() => window.__lives.push(live.textContent));
  window.__liveObs.observe(live, { childList: true, characterData: true, subtree: true });
  return true;
}

/** Waits until a relayout has run since `mark` and nothing is pending. */
async function laidOut(t, extra = '') {
  await t.waitFor((T) => T.S.layout !== window.__timeMark && !T.S.layoutTimer, { what: `a new layout ${extra}` });
  await t.settle();
}
const markLayout = (t) => t.app((T) => { window.__timeMark = T.S.layout; return true; });

/** Empties the live region, so the next sentence is known to be new. */
const quiet = (t) => t.eval(() => { document.getElementById('live').textContent = ''; return true; });

/** Waits for the live region to say something matching re, and returns it. */
async function said(t, re) {
  return t.waitFor((_T, src) => {
    const s = document.getElementById('live').textContent;
    return new RegExp(src).test(s) && s;
  }, { args: [re.source], what: `the live region to say ${re}` });
}

export default {
  name: 'time',
  title: 'Time as a dimension: the date scrub, by keyboard',
  timeout: 240000,
  async run(t) {
    await t.settle();
    await t.app(listen);
    const start = await t.app((T) => ({
      time: T.S.time, val: document.getElementById('time-val').textContent, later: document.getElementById('time-later').getAttribute('aria-disabled'),
      median: T.S.ages.medianStep(T.S.focus), rootMedian: T.S.ages.medianStep(T.S.model.root), dates: T.S.ages.T,
    }));
    t.check('at the present S.time is null, As of reads Now, and Later is marked unavailable', start.time === null && start.val === 'Now' && start.later === 'true', JSON.stringify(start).slice(0, 200));
    const entry = Math.max(1, start.median >= 1 ? start.median : start.rootMedian);

    // T from the canvas.
    await t.app(keep);
    await t.tabTo('#view');
    await markLayout(t);
    await quiet(t);
    await t.key('T');
    await laidOut(t, 'after T');
    const a = await t.app(audit);
    const live1 = await said(t, /^As of /);
    t.check(`T looks back to the median step of the folder you are in (step ${a.k}, ${a.date})`, a.k === entry && DATE.test(a.date), JSON.stringify({ k: a.k, entry }));
    t.check('#time-val shows that date as MM/DD/YYYY and the cell is marked on', a.val === a.date && DATE.test(a.val) && a.on, JSON.stringify(a.val));
    t.check(`#live begins "As of" (${live1})`, live1.startsWith(`As of ${a.date}: `) && !WORDS.test(live1));
    t.check(`the layout follows the rules: ${a.crossed} crossed and ${a.sunk} lowered of ${a.n} boxes`, a.bad.length === 0 && a.crossed + a.sunk > 0, a.bad.join(' | '));
    if (t.gl) {
      t.check('S.view.aStyle.array holds 6 at exactly the indices where S.layout.aux === 2', a.styleOk);
      t.check(`a crossed file's colour is its kind washed once, 60% toward paper (${a.washed} checked)`, a.washOk && a.washed > 0);
      const shader = await t.app((T) => {
        const r = T.S.view.renderer;
        const gl = r.getContext();
        for (const p of r.info.programs || []) {
          const src = p.fragmentShader && gl.getShaderSource(p.fragmentShader);
          if (!src || !src.includes('vStyle')) continue;
          const at = src.indexOf('vStyle > 5.5 && vStyle < 6.5');
          const body = at < 0 ? '' : src.slice(at, src.indexOf('float haze', at));
          return { found: at >= 0, paper: /uPaper/.test(body), local: /vBoxLocal/.test(body) && /fwidth/.test(body) };
        }
        return null;
      });
      t.check('the shader\'s crossed branch draws the diagonals from box-local coordinates and washes nothing', shader?.found && !shader.paper && shader.local, JSON.stringify(shader));
      const calls = await t.drawCalls();
      const want = t.recorded?.overview?.calls ?? t.baseline?.overview?.calls;
      t.check(`with the time view on, the overview costs the baseline's draw calls (${calls.calls}, baseline ${want})`, want !== undefined && calls.calls === want, calls.drawn.join(', '));
      await t.shot('time-on');
    }
    if (t.gl) {
      // Hover lines, at the median step: some files changed, some did not.
      const tip = await t.app((T) => {
        const L = T.S.layout;
        let file = -1;
        let plain = -1;
        let cap = -1;
        for (let i = 0; i < L.n; i++) {
          if (file < 0 && L.type[i] === 1 && L.aux[i] === 2) file = i;
          if (plain < 0 && L.type[i] === 1 && L.aux[i] === 0) plain = i;
          if (cap < 0 && L.type[i] === 2 && L.node[i].c.length && !L.node[i].e) cap = i;
        }
        const read = (i) => {
          if (i < 0) return null;
          T.S.view.on.hover(i, { clientX: 300, clientY: 300 });
          return [...document.querySelectorAll('#tip > div')].map((x) => x.textContent);
        };
        const out = { file: read(file), plain: read(plain), cap: read(cap), date: T.S.time.date };
        T.S.view.on.hover(-1, {});
        return out;
      });
      t.check('a crossed file\'s hover tip says it changed since the date and is drawn flat and crossed', tip.file?.at(-1) === `Changed since ${tip.date} · flat and crossed`, JSON.stringify(tip.file));
      if (tip.plain) t.check('an unchanged file\'s says so', tip.plain.includes(`Unchanged since ${tip.date}`), JSON.stringify(tip.plain));
      else t.skip('an unchanged file\'s hover tip', 'every file in view changed since that date');
      if (tip.cap) t.check('a closed mass\'s gives files and bytes changed since the date', tip.cap.some((l) => new RegExp(`files changed since ${tip.date.replace(/\//g, '\\/')}|^Unchanged since`).test(l)), JSON.stringify(tip.cap));
    }

    await t.app(keep);

    // Comma, period, < and the debounce.
    await t.app(() => { window.__lives.length = 0; return true; });
    await markLayout(t);
    await t.keys(',', ',', ',');
    await laidOut(t, 'after three commas');
    const b = await t.app(audit);
    await said(t, new RegExp(`^As of ${b.date.replace(/\//g, '\\/')}`));
    await t.sleep(400);
    const burst = await t.app(() => window.__lives.filter((s) => s.startsWith('As of')));
    t.check(`three commas step three rungs back (${a.k} to ${b.k}) and say one sentence for the burst`, b.k === Math.min(19, a.k + 3) && burst.length === 1 && burst[0].startsWith(`As of ${b.date}`), JSON.stringify(burst));
    t.check('the layout still follows the rules', b.bad.length === 0, b.bad.join(' | '));
    await t.app(keep);
    await markLayout(t);
    await quiet(t);
    await t.key('.');
    await laidOut(t, 'after a period');
    const c = await t.app(audit);
    const livePeriod = await said(t, /^As of /);
    t.check(`a period steps one rung later (${c.k}) and says so (${livePeriod})`, c.k === b.k - 1 && c.val === c.date && c.bad.length === 0 && livePeriod.startsWith(`As of ${c.date}: `),
      JSON.stringify({ k: c.k, bad: c.bad, livePeriod }));
    await t.app(keep);
    await markLayout(t);
    await quiet(t);
    await t.key('<');
    await laidOut(t, 'after <');
    const d = await t.app(audit);
    const live2 = await said(t, /This is the earliest date\.$/);
    t.check(`< goes to the earliest rung (${d.date}) and says so`, d.k === 19 && live2.startsWith(`As of ${d.date}`), live2);
    await t.app(keep);
    const kept = await t.app(compareKept);
    t.check(`at steps ${kept.steps.join(', ')} the layout has the present's n and key order`, kept.sameKeys && kept.steps.includes(0), JSON.stringify(kept));
    t.check('no box\'s height increases when stepping backward', kept.rises === 0, `${kept.rises} rises`);
    await quiet(t);
    await t.key(',');
    const early = await said(t, /This is the earliest date\.$/);
    t.check('a comma at the earliest rung stays there and says so', (await t.app((T) => T.S.time.k)) === 19 && /^As of /.test(early));

    // The inspector, with nothing selected: Since and Where the change is.
    await t.app((T) => { T.api.select(null); return true; });
    const s1 = await t.app(since);
    t.check(`the "You are in" summary has a Since ${d.date} section with the table's figures`,
      s1.titles.includes(`Since ${d.date}`) && s1.facts[0]?.startsWith('Changed') && s1.facts[0].includes(s1.cb) && s1.facts[0].includes(`${s1.cf} file`)
      && s1.facts[1]?.startsWith('Not changed') && s1.bars === 2, JSON.stringify(s1).slice(0, 400));
    t.check(`Where the change is lists the ${Math.min(8, s1.whereCount)} entries holding the most changed bytes`, s1.titles.some((x) => x.startsWith('Where the change is')) && JSON.stringify(s1.rows) === JSON.stringify(s1.want), JSON.stringify([s1.rows, s1.want]));
    t.check('the Reading rows name the convention: Crossed', await t.eval(() => [...document.querySelectorAll('#inspector-body .reading li')].some((li) => li.querySelector('.glyph.g-crossed') && li.querySelector('b').textContent === 'Crossed')));
    t.check('nothing the inspector says for the time view uses "created", "arrived" or "added"', !WORDS.test(s1.text.slice(s1.text.indexOf('Since'), s1.text.indexOf('Reading the world'))));

    // Crossed swatches in Contents, by the layout's rules.
    const rows = await t.app((T) => {
      const L = T.S.layout;
      const list = T.list;
      const shown = [...document.querySelectorAll('#ledger-list .vl-rows .row')];
      let mismatch = 0;
      let crossed = 0;
      let agree = 0;
      shown.forEach((row) => {
        const i = Math.round(parseFloat(row.style.transform.replace(/[^\d.]/g, '')) / list.rowHeight);
        const node = list.items[i];
        const has = row.querySelector('.swatch').classList.contains('is-crossed');
        const sr = row.querySelector('.row-name .sr')?.textContent || '';
        if (has !== T.S.time.crossed(node) || (has && sr !== `, changed since ${T.S.time.date}`)) mismatch++;
        if (has) crossed++;
        const j = L.index.get(node);
        if (j !== undefined && (L.type[j] === 1 || L.type[j] === 2) && (L.aux[j] === 2) === has) agree++;
      });
      return { shown: shown.length, crossed, mismatch, agree };
    });
    t.check(`Contents rows carry the crossed swatch and its words exactly where the layout crosses (${rows.crossed} of ${rows.shown} rows)`, rows.mismatch === 0 && rows.shown > 0 && rows.crossed > 0, JSON.stringify(rows));

    // Reveal from Where the change is, by Tab and Enter.
    if (s1.rows.length) {
      await t.tabTo('.since-where .item');
      await t.key('Enter');
      const got = await t.waitFor((T, n) => T.S.primary?.n === n && { n: T.S.primary.n, d: !!T.S.primary.d }, { args: [s1.rows[0]] });
      t.check(`Enter on the first Where row reveals and selects ${got.n}`, got.n === s1.rows[0]);
      await t.settle();
      const s2 = await t.app(since);
      t.check(`its own inspector carries the Since ${d.date} section`, s2.titles.includes(`Since ${d.date}`) && s2.subject === got.n && (got.d ? s2.facts[0]?.includes(s2.cb) : /^Changed/.test(s2.facts[0] || '')), JSON.stringify(s2).slice(0, 300));
      // Escape would end the time view first (it comes before the selection).
      await t.app((T) => { T.api.select(null); return true; });
    } else t.skip('a Where row reveals', 'nothing in the folder you are in changed since the earliest date');

    // '>' returns to the present.
    await t.tabTo('#view');
    await markLayout(t);
    await quiet(t);
    await t.key('>');
    await laidOut(t, 'after >');
    const p1 = await t.app(fresh, GRAINS);
    const live3 = await said(t, /^Back to the present\.$/);
    t.check('> returns to the present: S.time null, no crossed or lowered box, geometry equal to a fresh layout', p1.time === null && !p1.aux2 && !p1.aux1 && p1.geoSame && p1.keysSame, JSON.stringify(p1));
    t.check(`#live reads "${live3}" and As of reads Now`, live3 === 'Back to the present.' && (await t.text('#time-val')) === 'Now');
    await quiet(t);
    await t.key('>');
    t.check('> at the present only says so', /^Already at the present\./.test(await said(t, /^Already at the present/)) && (await t.app((T) => T.S.time)) === null);

    // T from the ledger list, Escape back.
    await t.tabTo('#ledger-list', { back: true });
    // The folder you are in may have moved with the reveal above.
    const entry2 = await t.app((T) => {
      const A = T.S.ages;
      const k = A.medianStep(T.S.focus);
      return Math.max(1, k >= 1 ? k : A.medianStep(T.S.model.root));
    });
    await markLayout(t);
    await quiet(t);
    await t.key('t');
    await laidOut(t, 'after T in the list');
    const e = await t.app(audit);
    const live4 = await said(t, /^As of /);
    t.check(`T from the ledger list looks back too (${e.date})`, e.k === entry2 && e.val === e.date && live4.startsWith(`As of ${e.date}`) && e.bad.length === 0 && (e.styleOk !== false), JSON.stringify({ k: e.k, styleOk: e.styleOk }));
    t.check('focus stays in the ledger list', (await t.eval(() => document.activeElement?.id)) === 'ledger-list');
    await markLayout(t);
    await quiet(t);
    await t.key('Escape');
    await laidOut(t, 'after Escape');
    const p2 = await t.app(fresh, GRAINS);
    const live5 = await said(t, /^Back to the present\.$/);
    t.check('Escape returns to the present: no crossed box, geometry equal to a fresh layout, "Back to the present."', p2.time === null && !p2.aux2 && p2.geoSame && live5 === 'Back to the present.', JSON.stringify(p2));

    // While a rescan rebuilds the age table: T cannot look back, and Escape
    // still returns to the present instead of sticking on the time view.
    await t.tabTo('#view');
    await t.key('T');
    await t.waitFor((T) => !!T.S.time);
    await t.app((T) => { window.__timeAges = T.S.ages; T.S.ages = null; return true; });
    await quiet(t);
    await t.key('Escape');
    const rescanEsc = await said(t, /^Back to the present\.$/);
    const afterEsc = await t.app((T) => ({ time: T.S.time, val: document.getElementById('time-val').textContent }));
    await quiet(t);
    await t.key('T');
    const rescanT = await said(t, /^Time is not ready/);
    const afterT = await t.app((T) => { const out = T.S.time; T.S.ages = window.__timeAges; delete window.__timeAges; return out; });
    t.check('without the age table (a rescan), Escape still returns to the present and T says Time is not ready',
      afterEsc.time === null && afterEsc.val === 'Now' && rescanEsc === 'Back to the present.' && afterT === null && /^Time is not ready/.test(rescanT), JSON.stringify({ afterEsc, rescanT }));
    await t.settle();

    // Escape order: the kind filter, then the time view, then search.
    await t.app((T) => { T.S.kindFilter = 0; T.api.repaint(); return true; });
    await t.tabTo('#view');
    await t.key('T');
    await t.waitFor((T) => !!T.S.time);
    await t.key('/');
    await t.type(t.manifest ? 'copy-' : 'ext:md');
    await t.waitFor((T) => !!T.S.search);
    await t.key('Enter');
    const steps = [];
    for (let k = 0; k < 3; k++) {
      await t.key('Escape');
      await t.sleep(240);
      steps.push(await t.app((T) => `${T.S.kindFilter}|${!!T.S.time}|${!!T.S.search}`));
    }
    t.check('Escape clears the kind filter, then the time view, then the search', JSON.stringify(steps) === JSON.stringify(['-1|true|true', '-1|false|true', '-1|false|false']), JSON.stringify(steps));
    await t.settle();

    // The As of stepper, by Tab.
    await t.tabTo('#time-earlier');
    await quiet(t);
    await t.key('Enter');
    const f1 = await t.waitFor((T) => T.S.time && { k: T.S.time.k, date: T.S.time.date, val: document.getElementById('time-val').textContent, later: document.getElementById('time-later').getAttribute('aria-disabled') });
    const live6 = await said(t, /^As of /);
    t.check(`Tab reaches Earlier and Enter looks back one rung (${f1.date})`, f1.k === 1 && f1.val === f1.date && f1.later === 'false' && live6.startsWith(`As of ${f1.date}`), JSON.stringify(f1));
    await t.tabTo('#time-later');
    await quiet(t);
    await t.key('Enter');
    await t.waitFor((T) => T.S.time === null);
    t.check('Tab reaches Later and Enter returns to the present', (await said(t, /^Back to the present\.$/)) === 'Back to the present.' && (await t.text('#time-val')) === 'Now');
    await t.settle();

    // Twelve levels down: the chain's deepest files, crossed.
    if (!t.manifest) {
      t.skip('twelve levels down', 'needs the fixture and its 13-level chain');
    } else {
      await t.key('/');
      await t.type('deep-1.txt');
      await t.waitFor((T) => T.S.search?.list.length > 0);
      await t.keys('Enter', 'Enter');
      await t.waitFor((T) => T.S.primary?.n === 'deep-1.txt');
      await t.settle();
      await t.key('Escape');
      await t.waitFor((T) => !T.S.search);
      await markLayout(t);
      await t.key('<');
      await laidOut(t, 'after < twelve levels down');
      const deep = await t.app(async (T, grains) => {
        const S = T.S;
        const L = S.layout;
        const { buildLayout } = await import(new URL('js/layout.js', document.baseURI).href);
        const depth = (n) => { let x = 0; for (let a = n; a.p; a = a.p) x++; return x; };
        const k = S.time.k;
        const A = S.ages;
        const ratios = (lay, minDepth, maxDepth) => {
          const out = [];
          for (let i = 0; i < lay.n; i++) {
            if ((lay.type[i] !== 1 && lay.type[i] !== 2) || lay.aux[i] !== 2) continue;
            const f = lay.node[i];
            const dd = depth(f);
            if (dd < minDepth || dd > maxDepth) continue;
            const pi = lay.index.get(f.p);
            if (pi === undefined) continue;
            const riser = lay.geo[pi * 6 + 4];
            const side = Math.min(lay.geo[i * 6 + 3], lay.geo[i * 6 + 5]);
            // Where the riser term binds, the slab is a fixed share of it.
            if (side * 0.05 >= riser * 0.08) out.push({ n: f.n, depth: dd, r: lay.geo[i * 6 + 4] / riser });
          }
          return out;
        };
        // The overview layout, made aside; the folders' open-or-closed memory
        // is put back so the page's next layout is not disturbed.
        const opened = [];
        (function walk(d) { opened.push([d, d._open]); for (const c of d.c) if (c.d) walk(c); }(S.model.root));
        const over = buildLayout(S.model.root, { cam: { x: 0, y: 900, z: 1200 }, grain: grains[S.grain], now: S.model.now, asOf: { t: A.T[k], kept: (d) => A.kept(d, k) } });
        for (const [d, o] of opened) d._open = o;
        const top = ratios(over, 1, 1);
        const low = ratios(L, 13, 99);
        const p = S.primary;
        const i = L.index.get(p);
        return { top, low, primary: p.n, depth: depth(p), aux: L.aux[i], noGL: !!S.noGL };
      }, GRAINS);
      const rootR = deep.top[0]?.r;
      const worst = deep.low.reduce((m, x) => Math.max(m, Math.abs(x.r - rootR)), 0);
      t.check(`twelve levels down, ${deep.primary} (depth ${deep.depth}) is a crossed slab`, deep.depth >= 13 && deep.aux === 2, JSON.stringify(deep).slice(0, 300));
      t.check(`its slab-to-riser ratio equals the root level's within 1e-9 (${deep.low.length} deep and ${deep.top.length} root-level slabs; root ${rootR}, worst difference ${worst.toExponential(1)})`,
        deep.top.length > 0 && deep.low.length > 0 && worst <= 1e-9, JSON.stringify({ top: deep.top.slice(0, 3), low: deep.low.slice(0, 3) }));

      if (t.gl) {
        // The selected crossed block: highlighter yellow with its diagonals on screen.
        const pick = await t.app(async (T, mark) => {
          const v = T.S.view;
          const L = T.S.layout;
          const i = L.index.get(T.S.primary);
          const THREE = await import(new URL('vendor/three/three.module.js', document.baseURI).href);
          const c = new THREE.Color().setHex(mark);
          const col = v.mesh.instanceColor.array;
          return { i, style: v.aStyle.array[i], yellow: [c.r, c.g, c.b].every((x, k) => Math.abs(x - col[i * 3 + k]) < 1e-6), sel: v.selIndex === i };
        }, MARK);
        t.check('the selected crossed block is highlighter yellow (#f4c430 in instanceColor) in style 6', pick.yellow && pick.style === 6 && pick.sel, JSON.stringify(pick));
        // Look straight at it so its top face fills the view.
        await t.app((T) => {
          const v = T.S.view;
          const L = T.S.layout;
          const o = L.index.get(T.S.primary) * 6;
          const g = L.geo;
          const span = Math.max(g[o + 3], g[o + 5]);
          v.flyTo(v.constructor.vantage(g[o], g[o + 1] + g[o + 4] / 2, g[o + 2], span * 2.2, v.cam.yaw, -1.2), 0);
          return true;
        });
        await t.settle();
        const px = await t.app(async (T) => {
          const v = T.S.view;
          const L = T.S.layout;
          const r = v.renderer;
          const gl = r.getContext();
          const THREE = await import(new URL('vendor/three/three.module.js', document.baseURI).href);
          const i = L.index.get(T.S.primary);
          const o = i * 6;
          const g = L.geo;
          const W = gl.drawingBufferWidth;
          const H = gl.drawingBufferHeight;
          const top = g[o + 1] + g[o + 4] / 2;
          const P = (lx, lz) => {
            const p = new THREE.Vector3(g[o] + lx * g[o + 3], top, g[o + 2] + lz * g[o + 5]).project(v.camera);
            return [(p.x * 0.5 + 0.5) * W, (p.y * 0.5 + 0.5) * H];
          };
          const grab = () => {
            r.render(v.scene, v.camera);
            const buf = new Uint8Array(W * H * 4);
            gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, buf);
            return buf;
          };
          const shot = grab();
          const rgb = (buf, x, y) => { const k = (Math.round(y) * W + Math.round(x)) * 4; return [buf[k], buf[k + 1], buf[k + 2]]; };
          const luma = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
          const darkest = (x, y) => { let m = 255; for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) m = Math.min(m, luma(rgb(shot, x + dx, y + dy))); return m; };
          const off = [[0, -0.3], [0, 0.3], [-0.3, 0], [0.3, 0]].map(([x, z]) => rgb(shot, ...P(x, z)));
          // Both diagonals, densely, away from the corners and the middle
          // (where a pin may stand): a dashed line would leave gaps.
          const offMed = [...off.map(luma)].sort((p, q) => p - q)[2];
          const diag = [];
          for (let j = 0; j <= 160; j++) {
            const s = 0.12 + (0.3 * j) / 160;
            for (const u of [s, 1 - s]) {
              diag.push(darkest(...P(-0.5 + u, -0.5 + u)));
              diag.push(darkest(...P(-0.5 + u, 0.5 - u)));
            }
          }
          const inkedShare = diag.filter((x) => x < offMed * 0.6).length / diag.length;
          const a = P(-0.5, -0.5);
          const b = P(0.5, 0.5);
          const median = (xs) => [...xs].sort((p, q) => p - q)[xs.length >> 1];
          // The origin moves to a point beside the eye, while the eye stays:
          // the cross must not move a pixel. Compared over the inner 84% of
          // the top face, sampled in the box's own coordinates.
          const face = new Set();
          for (let a1 = 0; a1 <= 240; a1++) {
            for (let a2 = 0; a2 <= 240; a2++) {
              const [x, y] = P(-0.42 + (0.84 * a1) / 240, -0.42 + (0.84 * a2) / 240);
              const xi = Math.round(x);
              const yi = Math.round(y);
              if (xi >= 0 && xi < W && yi >= 0 && yi < H) face.add(yi * W + xi);
            }
          }
          const keepPaint = { color: new Uint32Array(L.n), style: v.aStyle.array.slice(0, L.n), dim: v.aDim.array.slice(0, L.n) };
          const before = { ...v.origin };
          const cam = { ...v.cam };
          const nudge = Math.max(g[o + 3], g[o + 5]) * 3;
          v.cam.x += nudge;
          v.cam.z -= nudge;
          v.setLayout(L, keepPaint, { animate: false });
          T.api.repaint();
          const moved = { ...v.origin };
          Object.assign(v.cam, cam);
          const frame = () => new Promise((res) => requestAnimationFrame(() => res()));
          v.invalidate();
          await frame();
          await frame();
          const again = grab();
          let diff = 0;
          let inked = 0;
          let area = 0;
          for (const q of face) {
            const k = q * 4;
            area++;
            if (Math.abs(shot[k] - again[k]) + Math.abs(shot[k + 1] - again[k + 1]) + Math.abs(shot[k + 2] - again[k + 2]) > 24) diff++;
            if (luma([shot[k], shot[k + 1], shot[k + 2]]) < 90) inked++;
          }
          return {
            diag: median(diag), inkedShare, samples: diag.length, off: off.map(luma), offRgb: off, size: Math.hypot(b[0] - a[0], b[1] - a[1]),
            moved: Math.hypot(moved.x - before.x, moved.z - before.z), back: Math.hypot(v.origin.x - moved.x, v.origin.z - moved.z), area, diff, inked,
          };
        });
        const offMed = [...px.off].sort((p, q) => p - q)[2];
        t.check(`its diagonals are visible and unbroken: ink along them (luma ${px.diag.toFixed(0)}, ${(px.inkedShare * 100).toFixed(1)}% of ${px.samples} samples) against yellow beside them (luma ${offMed.toFixed(0)}), ${px.size.toFixed(0)} px corner to corner`,
          px.size > 120 && px.diag < offMed * 0.6 && px.inkedShare >= 0.98 && px.offRgb.every((c) => c[0] > c[2] + 60 && c[1] > c[2] + 30), JSON.stringify(px));
        t.check(`a re-based origin (moved ${px.moved.toPrecision(3)} units) moves no pixel of the cross: ${px.diff} of ${px.area} pixels differ, ${px.inked} inked`,
          px.moved > 0 && px.back === 0 && px.inked > 0 && px.diff <= px.area * 0.002, JSON.stringify(px));
        await t.shot('deep-crossed');
      }
      await t.key('>');
      await t.waitFor((T) => T.S.time === null);
    }

    const lives = await t.app(() => window.__lives.filter((s) => /^(As of|Back to|Already|Time is)/.test(s)));
    t.check(`every sentence the time view said uses "changed", never "created", "arrived" or "added" (${lives.length} sentences)`, lives.length > 0 && !lives.some((s) => WORDS.test(s)), lives.filter((s) => WORDS.test(s)).join(' | '));
    await t.app(() => { window.__liveObs?.disconnect(); delete window.__timeKeep; return true; });
  },
};
