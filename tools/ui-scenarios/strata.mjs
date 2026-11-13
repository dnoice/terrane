/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Strata Scenario (Terrane Edition - v1.0)
 *     - File Name: strata.mjs
 *     - Relative Path: tools/ui-scenarios/strata.mjs
 *     - Artifact Type: test
 *     - Version: 1.0.0
 *     - Date: 11/13/2026
 *     - Update: Friday, November 13, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Description:
 *     Checks bytes by last change in the real page. The inspector's
 *     section is read against strata.js run over the page's own age
 *     table, in the "You are in" summary and for the fixture's strata
 *     pair reached by keyboard; under the Age lens the pair's closed
 *     masses, alike by their newest change, take the two ends of the ramp
 *     and say their typical age when hovered.
 *
 * ✒ Key Features:
 *     - Fixture data, both passes; colours, hover and draw calls need
 *       WebGL, the paint timing runs without it
 *     - The section, its bar, sentence, rows and typical age equal what
 *       strata.js gives for the same folder and table, and say "changed",
 *       never "created", "arrived" or "added"
 *     - Without WebGL: Contents, Home and arrow keys to edge cases, Enter,
 *       then to strata-old: "not changed in over a year"; strata-live
 *       next to it; with WebGL the same folders through Find
 *     - A new table after a survey refills the section where it stands
 *     - Lens 2: the legend and the Reading row say closed masses show
 *       their typical age; the layout is the same object, with no new box
 *       types, and the overview's draw calls are the baseline's
 *     - With WebGL: strata-old and strata-live as closed masses, the same
 *       newest change, so the old colouring made them one colour; now the
 *       old end and the fresh end of the ramp, in the paint and in the
 *       instance colours; strata-old's hover tip begins "Half its bytes
 *       unchanged since", and only under the Age lens
 *     - Without WebGL: the real paint() at about 10,000 boxes under the
 *       Age lens, with the table and without it (the old colouring), at
 *       most 0.2 ms apart
 *
 * ✒ Usage Instructions:
 *     node tools/ui-check.mjs strata
 *     node tools/ui-check.mjs strata --pass nogl
 *
 * ✒ Other Important Information:
 *     - Dependencies: tools/ui-check.mjs (the context t); the page's
 *       js/strata.js, js/model.js, js/theme.js, js/layout.js and
 *       js/timeline.js and the vendored three.js, imported in the page for
 *       the reference values
 *     - Compatible platforms: Node.js 22.5+
 * ----------------------------------------------------------------------------
 */

const WORDS = /creat|arriv|\badded\b/i;
const DATE = '\\d\\d/\\d\\d/\\d{4}';
const LABEL = 'Last change · closed masses: typical age';

/** In the page: the inspector's Bytes by last change against strata.js over the same table. */
async function readSection(T) {
  const X = await import(new URL('js/strata.js', document.baseURI).href);
  const M = await import(new URL('js/model.js', document.baseURI).href);
  const S = T.S;
  const subject = S.primary || S.focus;
  const host = document.getElementById('inspector-body');
  const titles = [...host.querySelectorAll('.section-title')].map((x) => x.textContent);
  const box = host.querySelector('section.strata');
  if (!box) return { titles, box: false, subject: subject.n };
  const st = X.strataOf(S.ages, subject);
  const w = st[st.by];
  return {
    titles, box: true, subject: subject.n,
    say: box.querySelector('.strata-say')?.textContent,
    want: X.strataSentence(st, subject),
    rows: [...box.querySelectorAll('tbody tr')].map((tr) => [...[...tr.children].map((c) => c.textContent), tr.classList.contains('is-none')]),
    wantRows: X.STRATA.map((s, j) => [s.label, M.fmtBytes(st.bytes[j]), X.shareFigure(st.share[j]), M.fmtCount(st.files[j]), !(w[j] > 0)]),
    // Every cell inside the inspector: nothing pushed past its right edge.
    fits: (() => {
      const edge = host.getBoundingClientRect().right;
      return [...box.querySelectorAll('th, td')].every((c) => c.getBoundingClientRect().right <= edge + 0.5);
    })(),
    head: [...box.querySelectorAll('thead th')].map((x) => x.textContent),
    segs: box.querySelectorAll('.strata-bar i').length,
    wantSegs: w.filter((x) => x > 0).length,
    barLabel: box.querySelector('.strata-bar')?.getAttribute('aria-label') || '',
    typical: box.querySelector('.strata-typical')?.textContent || null,
    wantTypical: X.typicalLine(S.ages, subject),
    sums: st.tb === subject.s && st.tf === subject.fc,
    text: box.textContent,
  };
}

/** Index of a named entry in the Contents list, or -1. */
const ROW = (T, name) => T.list.items.findIndex((n) => n.n === name);

/** Selects Contents row i from the keyboard (the list must have focus). */
async function goToRow(t, i) {
  await t.key('Home');
  for (let k = 0; k < i; k++) await t.key('ArrowDown');
  return t.waitFor((T, n) => T.list.cursor === n && T.S.primary === T.list.items[n] && T.S.primary.n, { args: [i] });
}

/** Checks what the section shows for the subject against strata.js. */
function same(t, label, s) {
  t.check(`${label}: the sentence is strata.js's ("${s.say}")`, s.box && s.say === s.want && s.say.length > 0, JSON.stringify([s.say, s.want]));
  t.check(`${label}: six rows newest first with size, share and files, an empty stratum quiet, every figure inside the panel`,
    JSON.stringify(s.rows) === JSON.stringify(s.wantRows) && JSON.stringify(s.head) === JSON.stringify(['Last change', 'Size', 'Share', 'Files']) && s.fits, JSON.stringify(s.rows));
  t.check(`${label}: a bar of ${s.wantSegs} ${s.wantSegs === 1 ? 'stratum' : 'strata'} with a spoken label, and its strata add up to the folder`,
    s.segs === s.wantSegs && s.barLabel.startsWith('Its bytes by last change, newest first: under a day ') && s.sums, s.barLabel);
  t.check(`${label}: the typical age "${s.typical}"`, s.typical === `${s.wantTypical}. Under the Age lens a closed mass shows this typical age.`, JSON.stringify([s.typical, s.wantTypical]));
  t.check(`${label}: the section says "changed", never "created", "arrived" or "added"`, !WORDS.test(s.text), s.text);
}

const strata = {
  name: 'strata',
  title: 'Strata: bytes by last change, and the Age lens\'s typical age',
  data: 'fixture',
  timeout: 300000,
  async run(t) {
    const m = t.manifest;
    await t.settle();

    // Seams: entries of its own, after the table, and no new box types.
    const seams = await t.app(async (T) => {
      const L = await import(new URL('js/layout.js', document.baseURI).href);
      const a = T.api;
      const own = (reg, id) => reg.get(id)?.owner === 'strata';
      const types = new Set(T.S.layout.type);
      return {
        own: own(a.INSPECTOR.focus, 'strata') && own(a.INSPECTOR.node, 'strata') && own(a.TIP_LINES, 'strata') && own(a.READING, 'strata') && own(a.AFTER_SURVEY, 'strata'),
        focus: a.INSPECTOR.focus.ids(), node: a.INSPECTOR.node.ids(), survey: a.AFTER_SURVEY.ids(),
        box: JSON.stringify(L.BOX), types: [...types].sort(),
        keys: [...a.KEYS].filter((x) => x.owner === 'strata').length,
      };
    });
    t.check('its entries: a focus and a node section after Composition, a hover line, a Reading row and a survey hook after the age table',
      seams.own && seams.focus.indexOf('strata') === seams.focus.indexOf('composition') + 1 && seams.node.indexOf('strata') === seams.node.indexOf('composition') + 1
      && seams.survey.indexOf('strata') > seams.survey.indexOf('ages') && seams.keys === 0, JSON.stringify(seams));
    t.check(`no new box types: BOX is ${seams.box}, and the layout holds types ${seams.types.join(', ')}`,
      seams.box === '{"DIR":0,"FILE":1,"CAP":2,"SCREE":3,"WALL":4}' && seams.types.every((x) => x >= 0 && x <= 3));

    // The "You are in" summary at the root.
    const root = await t.app(readSection);
    t.check('with nothing selected the inspector shows Bytes by last change between Composition and Reading the world',
      root.box && root.titles.indexOf('Bytes by last change') === root.titles.indexOf('Composition') + 1 && root.titles.at(-1) === 'Reading the world', JSON.stringify(root.titles));
    same(t, 'at the root', root);

    // The Reading row and the legend, under lens 2.
    const reading = await t.eval(() => {
      const li = [...document.querySelectorAll('#inspector-body .reading li')].find((x) => x.querySelector('b')?.textContent === 'Typical age');
      const g = li?.querySelector('.glyph');
      return li && { glyph: g.className, bg: getComputedStyle(g).backgroundImage, text: li.lastChild.lastChild.textContent };
    });
    t.check('a Reading row says a closed mass shows its typical age under the Age lens, with its glyph',
      reading && reading.glyph === 'glyph g-strata' && /gradient/.test(reading.bg) && reading.text.startsWith('Under the Age lens a closed mass shows its typical age: half its bytes have not changed since then.') && !WORDS.test(reading.text),
      JSON.stringify(reading));
    await t.app((T) => { window.__strataLayout = T.S.layout; return true; });
    await t.tabTo('#view');
    await t.key('2');
    const legend = await t.waitFor((T) => T.S.lens === 'age' && {
      label: document.getElementById('legend-label').textContent,
      fits: (() => { const e = document.getElementById('legend-label'); return e.scrollWidth <= e.clientWidth; })(),
      title: document.querySelector('#legend .rampbar')?.title,
      ends: document.querySelector('#legend .rampbar')?.textContent,
      same: T.S.layout === window.__strataLayout,
    });
    t.check(`under lens 2 the legend reads "${legend.label}", whole`, legend.label === LABEL && legend.fits && legend.ends === '10 years +today'
      && legend.title === 'A file shows its last change. A closed mass shows its typical age: half its bytes have not changed since then.', JSON.stringify(legend));
    t.check('the lens is paint only: the layout is the same object', legend.same);
    if (t.gl) {
      await t.settle();
      const calls = await t.drawCalls();
      const want = t.recorded?.overview?.calls ?? t.baseline?.overview?.calls;
      t.check(`under lens 2 the overview costs the baseline's draw calls (${calls.calls}, baseline ${want})`, want !== undefined && calls.calls === want, calls.drawn.join(', '));
    }
    await t.key('1');
    t.check('lens 1 puts the kind legend back', (await t.waitFor((T) => T.S.lens === 'kind' && document.getElementById('legend-label').textContent)) === 'Kind · click to isolate');

    if (!m) {
      t.skip('the strata pair', 'needs the fixture');
      return;
    }
    const empty = !!m.sparse.leftEmpty;
    const oldName = m.strata.old.slice(m.strata.old.lastIndexOf('/') + 1);
    const liveName = m.strata.live.slice(m.strata.live.lastIndexOf('/') + 1);
    const edgeRel = m.strata.old.slice(0, m.strata.old.lastIndexOf('/'));

    // ---- strata-old by keyboard ----
    if (!t.gl) {
      // Without WebGL: Contents, to edge cases, Enter, to strata-old.
      // Back to the list with Shift+Tab: a Tab past the end of the page
      // leaves through the browser's own controls, and headless Edge then
      // stops sending Home and the arrow keys to the page.
      await t.tabTo('#ledger-list', { back: true });
      const e = await t.app(ROW, edgeRel);
      t.check(`Contents at the root lists ${edgeRel}`, e >= 0, String(e));
      if (e < 0) return;
      await goToRow(t, e);
      await t.key('Enter');
      await t.waitFor((T, r) => T.S.focus === T.S.model.find(r), { args: [edgeRel], what: `the location at ${edgeRel}` });
      const o = await t.app(ROW, oldName);
      const got = await goToRow(t, o);
      t.check(`without WebGL, Enter on ${edgeRel} and arrow keys select ${got} from Contents`, got === oldName);
    } else {
      // With WebGL the camera decides where you are after a flight, so
      // the same folder is reached through Find.
      await t.key('/');
      await t.type(oldName);
      await t.waitFor((T, q) => T.S.query === q && T.S.search?.list.length > 0, { args: [oldName] });
      await t.key('Enter');
      await t.key('Enter');
      const got = await t.waitFor((T) => T.S.primary?.n);
      t.check(`with WebGL, Find, Enter and Enter select ${got}`, got === oldName);
      await t.key('Escape');
      await t.waitFor((T) => !T.S.search);
    }
    const old = await t.app(readSection);
    t.check(`with ${oldName} selected the inspector shows its Bytes by last change`, old.box && old.subject === oldName, JSON.stringify(old.titles));
    if (empty) t.skip(`${oldName} reads "not changed in over a year"`, 'the 64 MB files could not be made on this volume');
    else {
      t.check(`the inspector text contains "not changed in over a year" (${old.say})`,
        old.say.includes('not changed in over a year') && (await t.text('#inspector-body')).includes('not changed in over a year'));
      t.check('its rows: 1 KB under a day, 64 MB over three years, nothing between',
        old.rows[0][1] === '1.00 KB' && old.rows[5][1] === '64.0 MB' && old.rows.slice(1, 5).every((r) => r[4] === true) && old.segs === 2, JSON.stringify(old.rows));
      t.check(`its typical age is a date its 64 MB file has not changed since (${old.typical})`, new RegExp(`^Half its bytes unchanged since ${DATE}\\.`).test(old.typical)
        && await t.app(async (T, rel, oldDate) => {
          const X = await import(new URL('js/strata.js', document.baseURI).href);
          const ta = X.typicalAge(T.S.ages, T.S.model.find(rel));
          return ta.t >= oldDate && T.S.ages.kept(T.S.model.find(rel), ta.k - 1) > 0.5;
        }, m.strata.old, m.strata.oldDate));
    }
    same(t, oldName, old);
    await t.shot('strata-old-inspector');

    // strata-live, beside it.
    await t.app((T, rel) => { T.api.select(T.S.model.find(rel)); return true; }, m.strata.live);
    const live = await t.app(readSection);
    if (!empty) {
      t.check(`${liveName}: "${live.say}"`, live.say.startsWith('All of these bytes changed in the last month.') && live.rows[0][1] === '64.0 MB', JSON.stringify(live.rows[0]));
      t.check(`${liveName}'s typical age: "${live.typical}"`, live.typical?.startsWith('Half its bytes changed in the last day.'));
    }
    same(t, liveName, live);

    // A new table (here one built three days later) refills the section
    // where it stands: the same element, the scroll kept.
    const refill = await t.app(async (T, rel) => {
      const TL = await import(new URL('js/timeline.js', document.baseURI).href);
      const S = T.S;
      T.api.select(S.model.find(rel));
      const host = document.getElementById('inspector-body');
      const box = host.querySelector('section.strata');
      const before = [...box.querySelectorAll('tbody tr')].map((r) => r.children[1].textContent);
      host.scrollTop = 40;
      const scroll = host.scrollTop;
      const real = S.ages;
      S.ages = TL.buildAgeTable(S.model.root, Date.now() + 3 * TL.DAY);
      T.api.AFTER_SURVEY.get('strata').run(S.survey, { full: false });
      const after = [...box.querySelectorAll('tbody tr')].map((r) => r.children[1].textContent);
      const same = host.querySelector('section.strata') === box && box.isConnected && host.scrollTop === scroll;
      S.ages = real;
      T.api.AFTER_SURVEY.get('strata').run(S.survey, { full: false });
      const back = [...box.querySelectorAll('tbody tr')].map((r) => r.children[1].textContent);
      return { before, after, back, same };
    }, m.strata.old);
    if (!empty) {
      t.check('a new table refills the section in place: three days on, the fresh 1 KB is a day to a week old, and back',
        refill.same && refill.after[0] === '0 B' && refill.after[1] === '1.00 KB' && JSON.stringify(refill.back) === JSON.stringify(refill.before), JSON.stringify(refill));
    }

    if (t.gl) {
      // ---- the closed masses under the Age lens ----
      await t.app((T, rel) => { T.api.select(null); T.api.setFocus(T.S.model.find(rel)); return true; }, edgeRel);
      await t.settle();
      await t.tabTo('#view');
      const types = (T, a, b) => {
        const L = T.S.layout;
        const ia = L.index.get(T.S.model.find(a));
        const ib = L.index.get(T.S.model.find(b));
        return { ia: ia ?? -1, ib: ib ?? -1, ta: L.type[ia], tb: L.type[ib] };
      };
      let pair = await t.app(types, m.strata.old, m.strata.live);
      let presses = 0;
      while (!(pair.ta === 2 && pair.tb === 2) && presses < 10) {
        await t.key('-');
        presses++;
        await t.settle();
        pair = await t.app(types, m.strata.old, m.strata.live);
      }
      t.check(`after ${presses} presses of - from ${edgeRel}, both are closed masses`, pair.ta === 2 && pair.tb === 2, JSON.stringify(pair));
      await t.app((T) => {
        const v = T.S.view;
        const set = v.setPaint;
        window.__strataPaint = null;
        v.setPaint = function (p) { window.__strataPaint = p.color.slice(); return set.call(this, p); };
        window.__strataRestore = () => { delete v.setPaint; };
        return true;
      });
      await t.key('2');
      const col = await t.waitFor(async (T, a, b) => {
        if (T.S.lens !== 'age' || !window.__strataPaint) return false;
        const X = await import(new URL('js/strata.js', document.baseURI).href);
        const M = await import(new URL('js/model.js', document.baseURI).href);
        const TH = await import(new URL('js/theme.js', document.baseURI).href);
        const THREE = await import(new URL('vendor/three/three.module.js', document.baseURI).href);
        const S = T.S;
        const L = S.layout;
        const A = S.ages;
        const na = S.model.find(a);
        const nb = S.model.find(b);
        const ia = L.index.get(na);
        const ib = L.index.get(nb);
        const now = S.model.now;
        const tones = X.massTones(A, now);
        const before = (n) => TH.mixHex(TH.THEME.clay, TH.ramp(TH.THEME.ageRamp, M.freshness(n.mm, now)), 0.7);
        const inst = (i) => {
          const arr = S.view.mesh.instanceColor.array;
          const c = new THREE.Color().setHex(window.__strataPaint[i]);
          return Math.abs(arr[i * 3] - c.r) < 1e-6 && Math.abs(arr[i * 3 + 1] - c.g) < 1e-6 && Math.abs(arr[i * 3 + 2] - c.b) < 1e-6;
        };
        const ka = A.medianStep(na);
        const kb = A.medianStep(nb);
        return {
          mmSame: na.mm === nb.mm, beforeSame: before(na) === before(nb),
          a: window.__strataPaint[ia], b: window.__strataPaint[ib], wantA: tones[ka], wantB: tones[kb],
          freshA: X.freshOfDays(X.stepAgeDays(ka) + (now - A.anchor) / 86400000), freshB: X.freshOfDays(X.stepAgeDays(kb) + (now - A.anchor) / 86400000),
          drawn: inst(ia) && inst(ib), ia, ib, ka, kb,
          tipA: (() => { S.view.on.hover(ia, { clientX: 300, clientY: 300 }); return [...document.querySelectorAll('#tip > div')].map((x) => x.textContent); })(),
          line: X.typicalLine(A, na),
        };
      }, { args: [m.strata.old, m.strata.live], what: 'the paint under lens 2' });
      await t.app((T) => { T.S.view.on.hover(-1, {}); window.__strataRestore(); return true; });
      t.check('strata-old and strata-live have the same newest change, so the old colouring made them one colour', col.mmSame && col.beforeSame, JSON.stringify(col));
      if (empty) t.skip('their closed masses differ under lens 2', 'the 64 MB files could not be made on this volume');
      else {
        t.check(`under lens 2 they differ: strata-old at the ramp's old end (${col.freshA.toFixed(3)}, step ${col.ka}), strata-live at its fresh end (${col.freshB.toFixed(3)}, step ${col.kb})`,
          col.a !== col.b && col.a === col.wantA && col.b === col.wantB && col.freshA < 0.1 && col.freshB > 0.9, JSON.stringify(col));
      }
      t.check('the instance colours drawn are the ones painted', col.drawn);
      const tipLine = col.tipA.find((l) => l.startsWith('Half its bytes'));
      t.check(`hovering strata-old's closed mass under the Age lens: "${tipLine}"`, !!tipLine && tipLine.startsWith('Half its bytes unchanged since') && tipLine === col.line
        && col.tipA[0] === oldName, JSON.stringify(col.tipA));
      await t.shot('strata-age-lens');
      await t.key('1');
      const kindTip = await t.app((T, i) => {
        T.S.view.on.hover(i, { clientX: 300, clientY: 300 });
        const lines = [...document.querySelectorAll('#tip > div')].map((x) => x.textContent);
        T.S.view.on.hover(-1, {});
        return lines;
      }, col.ia);
      t.check('under lens 1 the same mass has no typical-age line', !kindTip.some((l) => l.startsWith('Half its')), JSON.stringify(kindTip));
      return;
    }

    // ---- without WebGL: the real paint() at about 10,000 boxes ----
    // The view is a no-op here, so paint() can be run over a layout of a
    // tree built in memory; with no table it colours closed masses as it
    // did before, by their newest change.
    const cost = await t.app(async (T) => {
      const M = await import(new URL('js/model.js', document.baseURI).href);
      const LY = await import(new URL('js/layout.js', document.baseURI).href);
      const TL = await import(new URL('js/timeline.js', document.baseURI).href);
      const S = T.S;
      const keep = { layout: S.layout, ages: S.ages, lens: S.lens, primary: S.primary, sel: new Set(S.sel) };
      const now = Date.now();
      let seed = 7;
      const rnd = () => ((seed = (Math.imul(seed, 1103515245) + 12345) >>> 0) / 2 ** 32);
      const DIRS = 12000;
      const model = new M.Model('synthetic');
      const records = [[0, -1, 'synthetic', now, 0, []]];
      for (let d = 1; d < DIRS; d++) records.push([d, Math.floor(rnd() * d), `d${d}`, now, 0, []]);
      for (let i = 0; i < 150000; i++) records[Math.floor(rnd() * DIRS)][5].push(`f${i}.dat`, Math.floor(Math.exp(rnd() * 18)), now - Math.floor(rnd() ** 2.4 * 20 * 365 * 86400000), 0);
      model.ingest(records, [], model.root);
      const dirs = [];
      const stack = [model.root];
      while (stack.length) {
        const d = stack.pop();
        dirs.push(d);
        for (const c of d.c) if (c.d) stack.push(c);
      }
      const depth = (d) => { let k = 0; for (let a = d; a.p; a = a.p) k++; return k; };
      let best = null;
      for (const D of [4, 5, 6]) {
        const force = new Set(dirs.filter((d) => depth(d) <= D));
        let lo = 0.0003;
        let hi = 0.01;
        for (let i = 0; i < 24; i++) {
          const g = Math.sqrt(lo * hi);
          const L = LY.buildLayout(model.root, { cam: { x: 0, y: 900, z: 1200 }, grain: g, now, force });
          if (!best || Math.abs(L.n - 10000) < Math.abs(best.n - 10000)) best = L;
          if (L.n > 10500) lo = g;
          else if (L.n < 9500) hi = g;
          else break;
        }
        if (Math.abs(best.n - 10000) <= 500) break;
      }
      const L = best;
      let caps = 0;
      for (let i = 0; i < L.n; i++) if (L.type[i] === LY.BOX.CAP) caps++;
      const table = TL.buildAgeTable(model.root, now);
      S.sel.clear();
      S.primary = null;
      S.layout = L;
      S.lens = 'age';
      // Ten repaints a sample: the page's clock is too coarse for one.
      const run = (A) => {
        S.ages = A;
        const t0 = performance.now();
        for (let k = 0; k < 10; k++) T.api.repaint();
        return (performance.now() - t0) / 10;
      };
      for (let i = 0; i < 20; i++) { run(null); run(table); }
      const a = [];
      const b = [];
      for (let i = 0; i < 60; i++) {
        a.push(run(null));
        b.push(run(table));
      }
      Object.assign(S, { layout: keep.layout, ages: keep.ages, lens: keep.lens, primary: keep.primary });
      for (const x of keep.sel) S.sel.add(x);
      T.api.repaint();
      a.sort((x, y) => x - y);
      b.sort((x, y) => x - y);
      return { n: L.n, caps, before: a[a.length >> 1], after: b[b.length >> 1] };
    });
    const d = cost.after - cost.before;
    t.check(`paint() over ${cost.n.toLocaleString('en-US')} boxes (${cost.caps.toLocaleString('en-US')} closed masses) under the Age lens: ${d >= 0 ? `${d.toFixed(3)} ms more` : `${(-d).toFixed(3)} ms less`} than the old colouring (median ${cost.after.toFixed(3)} against ${cost.before.toFixed(3)} ms; at most 0.2 more)`,
      Math.abs(cost.n - 10000) <= 1500 && d <= 0.2, JSON.stringify(cost));
    t.check('the page is back as it was', await t.app((T) => T.S.layout === window.__strataLayout || T.S.layout.root === T.S.model.root));
  },
};

export default strata;
