/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Polish Scenario (Terrane Edition - v1.5)
 *     - File Name: polish.mjs
 *     - Relative Path: tools/ui-scenarios/polish.mjs
 *     - Artifact Type: test
 *     - Version: 1.5.0
 *     - Date: 11/15/2026
 *     - Update: Sunday, November 15, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Changelog:
 *     - 1.5.0 (11/15/2026) [dendogg + Anthropic - Claude Opus 5.5] —
 *       Compare's poses: the node_modules pair at 1600 and 1280 (P26),
 *       choosing a folder to compare with, the banner's buttons measured
 *       (P27), and the drawer on Compare at 800 (P18f); C8 measures its
 *       kind words, name, sentence, notes and the figures' first column at
 *       A, the sides' marks, the rows' and the keys' swatches in the A slot
 *       and their words at B, and its group heads at B. The comments name
 *       Cleanup and the Shelf the fourth and fifth tabs.
 *     - 1.4.0 (11/15/2026) [dendogg + Anthropic - Claude Opus 5.5] — The
 *       Shelf's poses: five items, one no longer there, at 1600 and 1280,
 *       and the drawer at 800; C8 measures its kind words, name, facts,
 *       notes and lines at A, each row's swatch in the A slot and its
 *       text at B.
 *     - 1.3.0 (11/15/2026) [dendogg + Anthropic - Claude Opus 5.5] —
 *       Cleanup's poses: the demo root with Big and stale open at 1600 and
 *       1280, and the drawer at 800; C8 measures its kind words, name,
 *       facts, summary and notes at A, its group heads and row text at B,
 *       and each row's box or kept mark in the A slot.
 *     - 1.2.0 (11/14/2026) [dendogg + Anthropic - Claude Opus 5.5] —
 *       The uppercase-voice check no longer skips .ref: the panel letters
 *       are gone.
 *     - 1.1.0 (11/14/2026) [dendogg + Anthropic - Claude Opus 5.5] — Panel
 *       B's tab strip shares the class .tabs: C2 reads both strips' labels
 *       by id, and at 800 px checks each strip's tabs inside their own
 *       panel; clear() puts panel B back on the Inspector by its tab.
 *       Preview's poses: README.md, a photo, Projects, six files and an
 *       archive at 1600 and 1280, and the drawer on README.md at 800; C8
 *       measures its kind words, name, facts, heads, notes and rows.
 *     - 1.0.0 (11/14/2026) [dendogg + Anthropic - Claude Opus 5.5] —
 *       Initial release: the interface's alignment, wrapping and
 *       clipping invariants, measured in the demo world at three window
 *       sizes, with and without WebGL.
 *
 * ✒ Description:
 *     Measures the sheet around the world in the page itself and checks
 *     the rules it is drawn by: heads on one line, labels and values on
 *     one baseline, figures in one column, nothing cut off without an
 *     ellipsis, controls in a row at one height, text on the panels'
 *     three columns, three uppercase voices, icons centred on their
 *     words, cells that keep their place, and values that break only
 *     at their separators. It runs on the demo world served as GitHub
 *     Pages serves it, so it reads no file on disk.
 *
 * ✒ Key Features:
 *     - Twenty-four poses: the root, a folder and a file selected, six
 *       files, Findings with and without a note, the Survey opened, the
 *       Journal, Places, the three other lenses, the time view, the
 *       context menu, the guide, the palette, both rename sheets,
 *       notices, placing, Preview on a text, a photo, a folder, six files
 *       and an archive, and, in a narrow window, the inspector drawer and
 *       Preview in it;
 *       grouped by the folder they stand in, so the eye travels only
 *       when the place changes
 *     - Twelve invariants (C1 to C12): page overflow, one-line heads and
 *       labels, shared baselines, figure columns, clipping, equal
 *       heights, buttons on one line, the A, B and C columns, the three
 *       uppercase voices, icon centring, cells that keep their place,
 *       values that break only at their separators
 *     - Three window sizes: 1600 by 1000 and 1280 by 800 for every
 *       invariant, 800 by 500 (200% zoom) for clipping, overflow, the
 *       one-line rules and the drawer
 *     - One evaluation per pose returns its offenders, so a pass takes
 *       well under a minute and a half
 *     - Probes: a text's baseline from a zero-size inline-block, its
 *       lines from the bottoms of its glyph boxes, cap and x-height
 *       centres from the canvas's measure of its font
 *     - Each check names its pose and window size and lists its first
 *       five offenders with selector, text and figures
 *     - Restores the 1600 by 1000 window and the page it started on,
 *       whatever happens
 *
 * ✒ Usage Instructions:
 *     node tools/ui-check.mjs polish [--pass webgl|nogl] [--no-shots]
 *     With --shots, every pose is also saved as a screenshot; with the
 *     environment variable POLISH_TIMING set, each pose notes how long
 *     its travel, its setup and its measurement took.
 *
 * ✒ Other Important Information:
 *     - Dependencies: tools/ui-check.mjs (the context t), pages() from
 *       demo.mjs: the repository served as Pages on the ui-check port
 *       plus eight
 *     - Compatible platforms: Node.js 22.5+, Edge or Chrome
 * ----------------------------------------------------------------------------
 */

import { pages } from './demo.mjs';

const SIZES = [
  { id: 'big', w: 1600, h: 1000 },
  { id: 'mid', w: 1280, h: 800 },
  { id: 'small', w: 800, h: 500 },
];

/* ---------- the probes, installed in the page once ---------- */

/**
 * In the page: window.__polish.measure(opts), which returns, per
 * invariant, how many things it measured and the offenders.
 */
function INSTALL() {
  const R = (e) => e.getBoundingClientRect();
  const r2 = (x) => Math.round(x * 100) / 100;
  let seen = new Map();
  const shown = (e) => {
    if (!e || !e.isConnected || e.nodeType !== 1) return false;
    if (seen.has(e)) return seen.get(e);
    let ok = !e.closest('[hidden], .sr');
    if (ok) {
      const r = R(e);
      ok = r.width >= 1 && r.height >= 1;
    }
    for (let x = e; ok && x && x !== document.documentElement; x = x.parentElement) {
      const cs = getComputedStyle(x);
      if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0 || cs.clipPath === 'inset(50%)') ok = false;
    }
    seen.set(e, ok);
    return ok;
  };
  const sel = (e) => {
    const parts = [];
    for (let x = e; x && x !== document.body && parts.length < 3; x = x.parentElement) {
      const cls = typeof x.className === 'string' && x.className.trim() ? `.${x.className.trim().split(/\s+/).slice(0, 2).join('.')}` : '';
      parts.unshift(`${x.tagName.toLowerCase()}${x.id ? `#${x.id}` : ''}${cls}`);
      if (x.id) break;
    }
    return parts.join('>');
  };
  const txt = (e) => (e?.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 48);
  // Visible text nodes inside e, in document order.
  const textNodes = (e) => {
    const out = [];
    const w = document.createTreeWalker(e, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) if (n.nodeValue.trim() && shown(n.parentElement)) out.push(n);
    return out;
  };
  const ownText = (e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.nodeValue.trim());
  // Lines: the text nodes' glyph-box bottoms, grouped within 0.55 em.
  const lines = (e) => {
    const fs = parseFloat(getComputedStyle(e).fontSize) || 12;
    const bottoms = [];
    for (const n of textNodes(e)) {
      const rg = document.createRange();
      rg.selectNodeContents(n);
      for (const q of rg.getClientRects()) {
        if (q.width <= 0.5 || q.height <= 0.5) continue;
        if (!bottoms.some((b) => Math.abs(b - q.bottom) < fs * 0.55)) bottoms.push(q.bottom);
      }
    }
    return bottoms.length;
  };
  // The right edge of the text inside e.
  const textRight = (e) => {
    let right = null;
    for (const n of textNodes(e)) {
      const rg = document.createRange();
      rg.selectNodeContents(n);
      for (const q of rg.getClientRects()) if (q.width > 0.5) right = Math.max(right ?? -Infinity, q.right);
    }
    return right;
  };
  const textLeft = (e) => {
    const n = textNodes(e)[0];
    if (!n) return null;
    const rg = document.createRange();
    rg.selectNodeContents(n);
    const q = [...rg.getClientRects()].find((x) => x.width > 0.5);
    return q ? q.left : null;
  };
  // The baseline of e's first visible text: a zero-size inline-block probe
  // at its start, inside a wrapper, read and taken out again.
  const baseline = (e) => {
    const n = textNodes(e)[0];
    if (!n) return null;
    const wrap = document.createElement('span');
    const probe = document.createElement('span');
    probe.style.cssText = 'display:inline-block;width:0;height:0;padding:0;margin:0;border:0;vertical-align:baseline';
    n.parentNode.insertBefore(wrap, n);
    wrap.append(probe, n);
    const y = R(probe).top;
    wrap.parentNode.insertBefore(n, wrap);
    wrap.remove();
    return y;
  };
  const ctx = document.createElement('canvas').getContext('2d');
  const glyphTop = (e, ch) => {
    const n = textNodes(e)[0];
    const cs = getComputedStyle(n ? n.parentElement : e);
    ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    return ctx.measureText(ch).actualBoundingBoxAscent;
  };
  const capCentre = (e) => {
    const b = baseline(e);
    return b == null ? null : b - glyphTop(e, 'H') / 2;
  };
  const xCentre = (e) => {
    const b = baseline(e);
    return b == null ? null : b - glyphTop(e, 'x') / 2;
  };
  const $ = (s, root = document) => [...root.querySelectorAll(s)].filter(shown);
  const one = (s) => document.querySelector(s);
  const spread = (xs) => (xs.length ? Math.max(...xs) - Math.min(...xs) : 0);

  const REGIONS = ['#bar', '#ledger', '#inspector', '#block', '.view-tools', '.hud-scale', '#placing', '#dialog[open]', '#menu', '#notices'];
  const TRUNCATE = '.row-name, .item .nm, .item .path, .crumb, .pal-label, .pal-detail, .sub-count, .sub-note, .look-name, .menu-title, .menu-label, .job-cur, #status > :last-child, .readout, .cell-label .text, .tab-label, .sub-caption, .panel-sub > .grow, .section-title .t, .rich summary .t, .bench-name .nm, .bench-name .path';
  const VOICES = { LABEL: [10, 700, 122, 0.13], KEY: [10, 600, 108, 0.06], 'KEY-narrow': [10, 600, 100, 0.02], TIGHT: [9.5, 700, 100, 0.04] };

  function measure(opts) {
    seen = new Map();
    const out = {};
    const bucket = (id) => (out[id] ||= { n: 0, bad: [] });
    const ok = (id) => { bucket(id).n++; };
    const bad = (id, item) => {
      const b = bucket(id);
      b.n++;
      b.bad.push(item);
    };
    const test = (id, pass, item) => (pass ? ok(id) : bad(id, item));
    const full = opts.size !== 'small';
    const regions = REGIONS.map((s) => one(s)).filter(shown);
    const inRegions = regions.flatMap((r) => [r, ...r.querySelectorAll('*')]).filter((e) => !(e instanceof SVGElement) && shown(e));

    /* C1: no page overflow */
    const d = document.documentElement;
    test('C1', d.scrollWidth <= d.clientWidth && d.scrollHeight <= d.clientHeight, { sw: d.scrollWidth, cw: d.clientWidth, sh: d.scrollHeight, ch: d.clientHeight });

    /* C2: heads and labels on one line */
    const sub = one('#ledger-sub');
    if (shown(sub) && (opts.heads || opts.size === 'small')) {
      for (const row of [...sub.children].filter((c) => c.matches('.sub-row') && !c.matches('.sub-note') && shown(c))) {
        const h = R(row).height;
        test('C2', lines(row) <= 1 && h <= 30.5, { el: sel(row), text: txt(row), lines: lines(row), h: r2(h) });
      }
      for (const cap of $(':scope > .grow, :scope > .sub-row > .grow, :scope > .sub-caption', sub)) test('C2', lines(cap) <= 1, { el: sel(cap), text: txt(cap), lines: lines(cap) });
      if (opts.heads) {
        const note = sub.querySelector('.sub-note');
        const h = R(sub).height;
        const max = note && shown(note) ? 91 : 61;
        test('C2', h <= max, { el: '#ledger-sub', h: r2(h), max });
        const keys = $('.sorts .sort', sub);
        if (keys.length) test('C2', spread(keys.map((k) => R(k).top)) <= 0.5, { el: '.sorts .sort', tops: keys.map((k) => r2(R(k).top)) });
      }
    }
    // Both strips (the ledger's and panel B's share the class .tabs): no
    // label shown is cut, and in a small window every tab fits its panel.
    for (const l of $('#ledger-tabs .tab-label, #b-tabs .tab-label')) test('C2', l.scrollWidth <= l.clientWidth, { el: sel(l), text: txt(l), sw: l.scrollWidth, cw: l.clientWidth });
    if (opts.size === 'small') {
      for (const [strip, side] of [['#ledger-tabs', '#ledger'], ['#b-tabs', '#inspector']]) {
        const p = one(side);
        if (shown(p)) for (const b of $(`${strip} [role=tab]`)) test('C2', R(b).right <= R(p).right + 0.5 && R(b).left >= R(p).left - 0.5, { el: sel(b), text: txt(b), right: r2(R(b).right), edge: r2(R(p).right) });
      }
    }
    for (const e of $('#block .cell-label, .section-title, .rich summary:not(.bench > summary), .panel-head h2, .menu-title, .facts dt')) {
      test('C2', lines(e) <= 1, { el: sel(e), text: txt(e), lines: lines(e) });
    }
    // The drawer stacks its facts, label over value.
    if (opts.drawer) {
      for (const row of $('#inspector .facts > div')) {
        const dt = row.querySelector(':scope > dt');
        const dd = row.querySelector(':scope > dd');
        if (shown(dt) && shown(dd)) test('C2', R(dd).top >= R(dt).bottom - 0.5, { el: sel(row), text: txt(dt), dt: r2(R(dt).bottom), dd: r2(R(dd).top) });
      }
    }

    if (full) {
      /* C3: labels and values share a baseline */
      const pair = (row, a, b) => {
        if (!a || !b || !shown(a) || !shown(b)) return;
        const ya = baseline(a);
        const yb = baseline(b);
        if (ya == null || yb == null) return;
        test('C3', Math.abs(ya - yb) <= 0.5, { el: sel(row), a: txt(a).slice(0, 24), b: txt(b).slice(0, 24), d: r2(yb - ya) });
      };
      for (const row of $('.facts > div')) {
        const dt = row.querySelector(':scope > dt');
        const dd = row.querySelector(':scope > dd');
        if (dt && dd && shown(dt) && shown(dd) && R(dd).left >= R(dt).right - 1) pair(row, dt, dd);
      }
      for (const row of $('#ledger-list .row')) pair(row, row.querySelector('.row-name'), row.querySelector('.row-size'));
      for (const row of $('.item')) {
        const fig = row.querySelector('.fig');
        if (fig && fig.textContent.trim()) pair(row, row.querySelector('.nm'), fig);
      }
      for (const s of $('.rich summary:not(.bench > summary)')) {
        const n = s.querySelector('.n');
        if (n && n.textContent.trim()) pair(s, s.querySelector('.t') || s, n);
      }
      for (const s of $('.section-title')) {
        const n = s.querySelector('.n');
        if (n && n.textContent.trim()) pair(s, s.querySelector('.t') || s, n);
      }
      for (const li of $('.comp-key li')) pair(li, li.querySelector('span:nth-child(2)'), li.querySelector('span:last-child'));
      for (const tr of $('.strata-rows tbody tr')) for (const td of tr.querySelectorAll('td')) pair(tr, tr.querySelector('th'), td);
      for (const m of $('.menu-item')) pair(m, m.querySelector('.menu-label'), m.querySelector('kbd, .menu-why'));
      for (const o of $('.palette-option')) pair(o, o.querySelector('.pal-label'), o.querySelector('kbd, .pal-fig'));
      for (const p of $('.insp-path')) pair(p, p.querySelector('code'), p.querySelector('.btn'));
      for (const dl of $('.guide dl')) for (const dt of dl.querySelectorAll('dt')) pair(dl, dt, dt.nextElementSibling);
      for (const row of $('#ledger-sub .sub-row.is-count')) {
        const count = row.querySelector('.sub-count');
        for (const tool of $('.sub-sel, .sub-tools button, .sub-tools > span', row)) if (tool.textContent.trim() && shown(count)) pair(row, count, tool);
      }
      const labels = $('#block .cell-label');
      const ys = labels.map((l) => baseline(l)).filter((y) => y != null);
      if (ys.length > 1) test('C3', spread(ys) <= 0.5, { el: '#block .cell-label', baselines: ys.map(r2), text: labels.map(txt) });

      /* C4: figure columns */
      const column = (name, els) => {
        const rights = els.map((e) => ({ e, x: textRight(e) })).filter((x) => x.x != null);
        if (rights.length < 2) return;
        const s = spread(rights.map((x) => x.x));
        test('C4', s <= 0.5, { col: name, spread: r2(s), rights: [...new Set(rights.map((x) => r2(x.x)))].slice(0, 6) });
        for (const { e } of rights) {
          const cs = getComputedStyle(e);
          test('C4', /DM Mono/.test(cs.fontFamily.split(',')[0]) || /tabular-nums/.test(cs.fontVariantNumeric), { col: name, el: sel(e), text: txt(e), font: cs.fontFamily.split(',')[0] });
        }
      };
      column('#ledger-list .row-size', $('#ledger-list .row-size'));
      const byParent = new Map();
      for (const f of $('.item .fig')) {
        if (!f.textContent.trim()) continue;
        const k = f.closest('.item').parentElement;
        if (!byParent.has(k)) byParent.set(k, []);
        byParent.get(k).push(f);
      }
      for (const [k, fs] of byParent) column(`.item .fig in ${sel(k)}`, fs);
      column('.rich summary .n', $('.rich summary:not(.bench > summary) .n').filter((n) => n.textContent.trim()));
      const comp = new Map();
      for (const p of $('.comp-key li span:last-child')) {
        const k = Math.round(R(p.parentElement).left);
        if (!comp.has(k)) comp.set(k, []);
        comp.get(k).push(p);
      }
      for (const [k, ps] of comp) column(`.comp-key column at ${k}`, ps);
      for (let i = 2; i <= 4; i++) column(`.strata-rows td:nth-child(${i})`, $(`.strata-rows tbody td:nth-child(${i})`));
      column('.palette-option .pal-fig', $('.palette-option .pal-fig'));
    }

    /* C5: nothing cut off without an ellipsis */
    const whitelist = (e) => e.matches(TRUNCATE);
    for (const e of inRegions) {
      if (!textNodes(e).length) continue;
      if (e.closest('#crumbs, .look-body')) continue;
      const cs = getComputedStyle(e);
      if (/auto|scroll/.test(cs.overflowX)) continue;
      const over = e.scrollWidth - e.clientWidth;
      if (!(over > 0.5 && e.clientWidth > 0)) continue;
      const fine = cs.textOverflow === 'ellipsis' && /^(block|inline-block|list-item|table-cell)$/.test(cs.display) && whitelist(e);
      test('C5', fine, { el: sel(e), text: txt(e), sw: e.scrollWidth, cw: e.clientWidth, to: cs.textOverflow, display: cs.display });
    }
    const legend = one('#legend');
    if (shown(legend)) {
      const lr = R(legend);
      for (const c of [...legend.children].filter(shown)) {
        const r = R(c);
        test('C5', r.left >= lr.left - 0.5 && r.right <= lr.right + 0.5 && r.top >= lr.top - 0.5 && r.bottom <= lr.bottom + 0.5, { el: sel(c), text: txt(c), r: [r2(r.left), r2(r.right)], legend: [r2(lr.left), r2(lr.right)] });
      }
    }
    for (const e of $('.rename-set, .rename-row')) test('C5', e.scrollWidth <= e.clientWidth, { el: sel(e), sw: e.scrollWidth, cw: e.clientWidth });
    for (const root of regions) {
      const rr = R(root);
      for (const e of root.querySelectorAll('*')) {
        if (e instanceof SVGElement || !shown(e) || e.closest('#crumbs, .look-body')) continue;
        // A descendant of an element that clips is that element's to show
        // or cut (its own text-overflow is checked above); inside a
        // scroller, what lies beyond its edge is scrolled, not cut.
        let clip = null;
        let scroller = null;
        for (let x = e.parentElement; x && x !== root.parentElement; x = x.parentElement) {
          const ov = getComputedStyle(x).overflowX;
          if (/auto|scroll/.test(ov) || /auto|scroll/.test(getComputedStyle(x).overflowY)) { scroller = x; break; }
          if (x !== root && ov !== 'visible') { clip = x; break; }
        }
        if (clip) continue;
        const box = scroller ? R(scroller) : rr;
        const r = R(e);
        const xOut = r.left < box.left - 0.5 || r.right > box.right + 0.5;
        const yOut = !scroller && (r.top < rr.top - 0.5 || r.bottom > rr.bottom + 0.5);
        if (xOut || yOut) bad('C5', { el: sel(e), text: txt(e), r: [r2(r.left), r2(r.top), r2(r.right), r2(r.bottom)], region: root.id || root.className, box: [r2(box.left), r2(box.top), r2(box.right), r2(box.bottom)] });
      }
    }

    if (full) {
      /* C6: controls in a row share a height */
      const heights = (name, els, { tops = false, bottoms = false } = {}) => {
        if (els.length < 2) return;
        const rs = els.map(R);
        const h = spread(rs.map((r) => r.height));
        const t = tops ? spread(rs.map((r) => r.top)) : 0;
        const b = bottoms ? spread(rs.map((r) => r.bottom)) : 0;
        test('C6', h <= 0.5 && t <= 0.5 && b <= 0.5, { group: name, h: rs.map((r) => r2(r.height)), top: tops ? rs.map((r) => r2(r.top)) : undefined, els: els.map((e) => sel(e).split('>').pop()).slice(0, 8) });
      };
      heights('#block controls', $('#block .seg, #block .stepper .btn, #block .stepper output, #block .chip, #block .readout, #status'), { tops: true });
      heights('#q with the bar tools', [one('#q'), ...$('.bar-tools .btn')].filter(shown));
      heights('#ledger-sub tools', $('#ledger-sub .sub-tool, #ledger-sub .sub-sel'));
      for (const dlg of $('#dialog[open]')) {
        const f = $('.dialog-form .field input', dlg);
        if (f.length) heights('dialog buttons and fields', [...$('.dialog-actions .btn', dlg), ...f]);
      }
      for (const n of $('.notice')) heights('a notice\'s button and close', $('.btn, .notice-close', n));
      heights('#placing buttons', $('#placing .btn'));
      heights('menu rows', $('.menu-item'));
      if (opts.gl) {
        const vt = one('.view-tools');
        const sc = one('.scale');
        if (shown(vt) && shown(sc)) heights('.view-tools and .scale', [vt, sc], { tops: true, bottoms: true });
      }
    }

    /* C7: a button with a fixed label keeps it on one line */
    if (opts.buttons) for (const b of $('.btn:not([data-named])')) if (b.textContent.trim()) test('C7', lines(b) <= 1, { el: sel(b), text: txt(b), lines: lines(b), w: r2(R(b).width) });

    if (full) {
      /* C8: the panels' columns */
      const panel = (id) => {
        const p = one(`#${id}`);
        if (!shown(p)) return null;
        const r = R(p);
        const cs = getComputedStyle(p);
        return { p, left: r.left + parseFloat(cs.borderLeftWidth), right: r.right - parseFloat(cs.borderRightWidth) };
      };
      const at = (name, x, want, P, e) => test('C8', x != null && Math.abs(x - P.left - want) <= 0.5, { at: name, el: sel(e), text: txt(e).slice(0, 24), x: x == null ? null : r2(x - P.left), want });
      const mark = (name, sw, want, P) => at(name, (R(sw).left + R(sw).right) / 2, want + 7, P, sw);
      const L = panel('ledger');
      if (L) {
        for (const row of $('#ledger-list .row').slice(0, 12)) {
          const sw = row.querySelector('.swatch');
          if (sw && shown(sw)) mark('row mark (A slot)', sw, 12, L);
          at('row name (B)', textLeft(row.querySelector('.row-name')), 32, L, row);
        }
        for (const s of $('#ledger-rich summary:not(.bench > summary)').slice(0, 20)) at('summary text (B)', textLeft(s.querySelector('.t') || s), 32, L, s);
        for (const s of $('#ledger-rich .bench > summary').slice(0, 8)) {
          mark('benchmark mark (B slot)', s.querySelector('.bench-mark'), 32, L);
          at('benchmark name (C)', textLeft(s.querySelector('.bench-name')), 52, L, s);
        }
        for (const n of $('#ledger-rich .note').filter((x) => !x.closest('.bench')).slice(0, 10)) at('note (B)', textLeft(n), 32, L, n);
        for (const it of $('#ledger-rich details .item:not(.preset-row, .saved-search)').slice(0, 20)) {
          const sw = it.querySelector(':scope > .swatch, :scope > .bench-mark');
          if (sw && shown(sw)) mark('nested item mark (B slot)', sw, 32, L);
          at('nested item text (C)', textLeft(it.querySelector('.nm') || it), 52, L, it);
        }
        for (const it of $('#ledger-rich .preset-row, #ledger-rich .saved-search').slice(0, 8)) at('preset text (B)', textLeft(it.querySelector('.nm') || it), 32, L, it);
        const sorts = $('#ledger-sub .sorts .sort');
        const name = sorts.find((s) => /^name$/i.test(s.textContent.trim()));
        if (name) at('NAME key (B)', textLeft(name), 32, L, name);
      }
      const I = panel('inspector');
      if (I && one('#inspector').getBoundingClientRect().left < innerWidth - 10) {
        for (const k of $('#inspector-body .insp-kind')) at(k.querySelector('.swatch') ? 'kind words after a mark (B)' : 'kind words (A)', textLeft(k), k.querySelector('.swatch') ? 32 : 12, I, k);
        for (const e of $('#inspector-body .insp-name, #inspector-body .insp-path code, #inspector-body .facts dt, #inspector-body .section-title, #inspector-body .strata-say, #inspector-body .session-note, #inspector-body .since-none, #inspector-body .interior-note, #inspector-body .bench-none p').slice(0, 30)) {
          at('inspector text (A)', textLeft(e), 12, I, e);
        }
        for (const it of $('#inspector-body .item').slice(0, 12)) {
          const sw = it.querySelector('.swatch');
          if (sw && shown(sw)) mark('inspector item mark (A slot)', sw, 12, I);
          at('inspector item text (B)', textLeft(it.querySelector('.nm') || it), 32, I, it);
        }
      }
      // Preview (panel B's tab): the same grid as the inspector's.
      const PV = one('#b-panel-preview');
      if (I && shown(PV) && one('#inspector').getBoundingClientRect().left < innerWidth - 10) {
        for (const k of $('#b-panel-preview .insp-kind')) {
          const marked = [...k.querySelectorAll('.swatch')].some(shown);
          at(marked ? 'Preview kind words after a mark (B)' : 'Preview kind words (A)', textLeft(k.querySelector('.pv-kind-words') || k), marked ? 32 : 12, I, k);
        }
        for (const e of $('#b-panel-preview .insp-name, #b-panel-preview .pv-facts, #b-panel-preview .pv-cut, #b-panel-preview .section-title, #b-panel-preview .pv-body .facts dt, #b-panel-preview .pv-note, #b-panel-preview .pv-caption').slice(0, 30)) {
          at('Preview text (A)', textLeft(e), 12, I, e);
        }
        for (const w of $('#b-panel-preview .pv-where')) at('Preview "in <folder>" words (B)', textLeft(w.querySelector('.pv-where-words')), 32, I, w);
        for (const it of $('#b-panel-preview .item').slice(0, 12)) {
          const sw = it.querySelector('.swatch');
          if (sw && shown(sw)) mark('Preview item mark (A slot)', sw, 12, I);
          at('Preview item text (B)', textLeft(it.querySelector('.nm') || it), 32, I, it);
        }
      }
      // Cleanup (the right panel's fourth tab): the inspector's grid. Its
      // group heads are disclosures as the ledger's are: the triangle in the
      // mark slot at A, the title at B.
      const CL = one('#b-panel-cleanup');
      if (I && shown(CL) && one('#inspector').getBoundingClientRect().left < innerWidth - 10) {
        for (const k of $('#b-panel-cleanup .insp-kind')) at('Cleanup kind words (A)', textLeft(k), 12, I, k);
        for (const e of $('#b-panel-cleanup .insp-name, #b-panel-cleanup .cl-facts, #b-panel-cleanup .cl-state, #b-panel-cleanup .cl-sum, #b-panel-cleanup .cl-purge, #b-panel-cleanup .cl-under, #b-panel-cleanup .cl-note').filter(shown).slice(0, 30)) {
          at('Cleanup text and notes (A)', textLeft(e), 12, I, e);
        }
        for (const w of $('#b-panel-cleanup .pv-where').filter(shown)) at('Cleanup "in <folder>" words (B)', textLeft(w.querySelector('.pv-where-words')), 32, I, w);
        for (const s of $('#b-panel-cleanup .cl-group > summary').filter(shown).slice(0, 8)) at('Cleanup group head (B)', textLeft(s.querySelector('.t')), 32, I, s);
        for (const r of $('#b-panel-cleanup .cl-row').filter(shown).slice(0, 12)) {
          const box = r.querySelector('.cl-box') || r.querySelector('.cl-mark .icon');
          if (box && shown(box)) mark('Cleanup box or kept mark (A slot)', box, 12, I);
          at('Cleanup row text (B)', textLeft(r.querySelector('.nm')), 32, I, r);
        }
      }
      // The Shelf (the right panel's fifth tab): the inspector's grid, its
      // rows as the inspector's items, the swatch in the mark slot at A.
      const SH = one('#b-panel-shelf');
      if (I && shown(SH) && one('#inspector').getBoundingClientRect().left < innerWidth - 10) {
        for (const k of $('#b-panel-shelf .insp-kind')) at('Shelf kind words (A)', textLeft(k), 12, I, k);
        for (const e of $('#b-panel-shelf .insp-name, #b-panel-shelf .sh-facts, #b-panel-shelf .sh-kept, #b-panel-shelf .sh-state-text, #b-panel-shelf .actions-why, #b-panel-shelf .sh-note').filter(shown).slice(0, 30)) {
          at('Shelf text and notes (A)', textLeft(e), 12, I, e);
        }
        for (const r of $('#b-panel-shelf .sh-row').filter(shown).slice(0, 12)) {
          const sw = r.querySelector('.swatch');
          if (sw && shown(sw)) mark('Shelf row swatch (A slot)', sw, 12, I);
          at('Shelf row text (B)', textLeft(r.querySelector('.nm')), 32, I, r);
        }
      }
      // Compare (the right panel's tab between Preview and Cleanup): the
      // inspector's grid; the sides' marks and the rows' and keys' swatches
      // in the mark slot at A, their words at B.
      const CM = one('#b-panel-compare');
      if (I && shown(CM) && one('#inspector').getBoundingClientRect().left < innerWidth - 10) {
        for (const k of $('#b-panel-compare .insp-kind')) at('Compare kind words (A)', textLeft(k), 12, I, k);
        for (const e of $('#b-panel-compare .insp-name, #b-panel-compare .cmp-say, #b-panel-compare .cmp-note, #b-panel-compare .cmp-state').filter(shown).slice(0, 30)) {
          at('Compare text and notes (A)', textLeft(e), 12, I, e);
        }
        for (const th of $('#b-panel-compare .cmp-facts tbody th').filter(shown).slice(0, 6)) at('Compare figures, first column (A)', textLeft(th), 12, I, th);
        for (const b of $('#b-panel-compare .cmp-side').filter(shown)) {
          mark('Compare side mark (A slot)', b.querySelector('.cmp-mark'), 12, I);
          at('Compare side name (B)', textLeft(b.querySelector('.nm')), 32, I, b);
        }
        for (const sm of $('#b-panel-compare .cmp-group > summary').filter(shown).slice(0, 4)) at('Compare group head (B)', textLeft(sm.querySelector('.t')), 32, I, sm);
        for (const r of $('#b-panel-compare .cmp-row').filter(shown).slice(0, 12)) {
          const sw = r.querySelector('.swatch');
          if (sw && shown(sw)) mark('Compare row swatch (A slot)', sw, 12, I);
          at('Compare row text (B)', textLeft(r.querySelector('.nm')), 32, I, r);
        }
        for (const th of $('#b-panel-compare .cmp-key tbody th').filter(shown).slice(0, 8)) {
          mark('Compare key swatch (A slot)', th.querySelector('.swatch'), 12, I);
          at('Compare key label (B)', textLeft(th.querySelector('.cmp-key-t')), 32, I, th);
        }
      }
      const first = one('#block .cell');
      if (L && innerWidth >= 1101 && shown(first)) test('C8', Math.abs(R(first).right - R(one('#ledger')).right) <= 0.5, { at: 'first cell = ledger', cell: r2(R(first).right), ledger: r2(R(one('#ledger')).right) });
      const status = one('#status-label');
      const insp = one('#inspector');
      if (shown(status) && shown(insp) && innerWidth >= 1101) {
        const want = R(insp).left + parseFloat(getComputedStyle(insp).borderLeftWidth) + 12;
        const x = R(status).left;
        test('C8', Math.abs(x - want) <= 0.5, { at: 'status label = inspector A', x: r2(x), want: r2(want) });
      }

      /* C9: three uppercase voices */
      for (const e of inRegions) {
        const cs = getComputedStyle(e);
        if (cs.textTransform !== 'uppercase' || !ownText(e) || !/[A-Za-z]/.test([...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.nodeValue).join(''))) continue;
        if (e.closest('.wordmark')) continue;
        const fs = parseFloat(cs.fontSize);
        const fw = Number(cs.fontWeight);
        const st = parseFloat(cs.fontStretch) || 100;
        const ls = Math.round(((cs.letterSpacing === 'normal' ? 0 : parseFloat(cs.letterSpacing)) / fs) * 100) / 100;
        const hits = Object.entries(VOICES).filter(([, v]) => Math.abs(fs - v[0]) < 0.01 && fw === v[1] && Math.abs(st - v[2]) < 0.5 && Math.abs(ls - v[3]) < 0.005).map(([k]) => k);
        test('C9', hits.length === 1, { el: sel(e), text: txt(e).slice(0, 20), voice: `${fs}px ${fw} ${st}% ${ls}em`, hits });
      }

      /* C10: icons on their words */
      const iconOf = (host) => [...host.children].find((c) => c instanceof SVGElement && c.classList.contains('icon') && shown(c));
      const words = (host) => {
        if (ownText(host)) return host;
        return [...host.children].find((c) => !(c instanceof SVGElement) && shown(c) && c.textContent.trim() && !c.classList.contains('sr')) || null;
      };
      const centred = (name, hosts, fn, max) => {
        for (const host of hosts) {
          const ic = iconOf(host);
          const w = words(host);
          if (!ic || !w) continue;
          const c = fn(w);
          if (c == null) continue;
          const r = R(ic);
          const dIcon = (r.top + r.bottom) / 2 - c;
          test('C10', Math.abs(dIcon) <= max, { at: name, el: sel(host), text: txt(host).slice(0, 20), d: r2(dIcon) });
        }
      };
      centred('beside capitals', $('.sort, .tabs button, .cell-label, .sub-tool'), capCentre, 0.75);
      centred('beside mixed case', $('.btn, .menu-item'), xCentre, 1);
      for (const o of $('.palette-option')) {
        const ic = [...o.children].find((c) => c instanceof SVGElement && shown(c));
        const lab = o.querySelector('.pal-label');
        if (!ic || !lab || !shown(lab)) continue;
        const c = xCentre(lab);
        const r = R(ic);
        test('C10', Math.abs((r.top + r.bottom) / 2 - c) <= 1, { at: 'palette option', el: sel(o), text: txt(lab), d: r2((r.top + r.bottom) / 2 - c) });
      }
    }

    /* C12: a value breaks only at its separators */
    for (const p of $('.facts dd .part')) test('C12', lines(p) <= 1, { el: sel(p), text: txt(p), lines: lines(p) });

    out.cells = [...document.querySelectorAll('#block .cell')].filter(shown).map((c) => ({ cls: c.className, left: r2(R(c).left) }));
    for (const v of Object.values(out)) if (v.bad) v.bad = v.bad.slice(0, 5).concat(v.bad.length > 5 ? [`… ${v.bad.length - 5} more`] : []);
    return out;
  }

  window.__polish = { measure };
  return true;
}

/* ---------- poses ---------- */

const NAMES = {
  C1: 'no page overflow',
  C2: 'heads and labels on one line',
  C3: 'labels and values share a baseline',
  C4: 'figures stand in one column',
  C5: 'nothing cut off without an ellipsis',
  C6: 'controls in a row share a height',
  C7: 'fixed-label buttons keep one line',
  C8: 'text on the panels\' columns',
  C9: 'three uppercase voices',
  C10: 'icons centred on their words',
  C12: 'values break only at separators',
};

const README = 'Projects/harbor-api/README.md';
const COMPONENTS = 'Projects/tidepool-web/src/components';

/** Closes what floats (a dialog, the menu, placing) with Escape. */
async function unfloat(t) {
  for (let i = 0; i < 4; i++) {
    const open = await t.eval(() => document.getElementById('dialog').open || !document.getElementById('menu').hidden || !document.getElementById('placing').hidden);
    if (!open) return;
    await t.key('Escape');
    await t.sleep(120);
  }
}

/**
 * Clears a pose away: nothing floating, nothing selected, Contents, the
 * Kind lens, no search, no time view, no notices. The place stays.
 */
async function clear(t) {
  await unfloat(t);
  await t.eval(() => document.getElementById('ledger-list').focus());
  for (let i = 0; i < 6; i++) {
    const busy = await t.app((T) => !!(T.S.time || T.S.query || T.S.sel.size || T.S.kindFilter >= 0));
    if (!busy) break;
    await t.key('Escape');
  }
  await t.app((T) => {
    const S = T.S;
    if (S.lens !== 'kind') T.api.setLens('kind');
    S.tab = 'contents';
    T.api.drawLedger();
    // Panel B back on the Inspector, as a pose expects it, by its tab
    // (which leaves a closed drawer closed).
    if (S.bTab !== 'inspector') document.getElementById('b-tab-inspector').click();
    document.querySelectorAll('#notices .notice').forEach((n) => n.remove());
    return true;
  });
}

/**
 * Travels to a folder ('' for the root) unless the eye is there. With
 * WebGL the location follows the camera, which may settle on a small
 * folder's parent; the pose is measured wherever it lands.
 */
async function into(t, rel) {
  const went = await t.app((T, r) => {
    const n = r ? T.S.model.find(r) : T.S.model.root;
    if (window.__polishAt === r) return false;
    window.__polishAt = r;
    T.api.setFocus(n);
    return true;
  }, rel);
  if (!went) return;
  await t.settle({ quiet: 250 });
  await t.app(() => {
    const T = window.__terrane;
    T.S.tab = 'contents';
    T.api.drawLedger();
    return true;
  });
}

async function selectRel(t, rel) {
  await t.app((T, r) => {
    const n = T.S.model.find(r);
    T.api.select(n);
    T.api.cursorTo(n);
    return true;
  }, rel);
}

async function six(t) {
  await t.app((T, r) => {
    const files = T.S.model.find(r).c.filter((c) => !c.d).slice(0, 6);
    T.api.selectAll(files, files[0]);
    return files.length;
  }, COMPONENTS);
}

async function listKey(t, key) {
  await t.eval(() => document.getElementById('ledger-list').focus());
  await t.key(key);
}

const drawerOpen = (t) => t.waitFor(() => getComputedStyle(document.getElementById('inspector')).visibility === 'visible', { what: 'the drawer' });

/**
 * The right panel on Cleanup for the folder you are in (the root), drawn
 * whole, with Big and stale open (showing it opens the drawer at 800 px).
 */
async function inCleanup(t) {
  await t.app((T) => { T.api.showBTab('cleanup'); return true; });
  await t.waitFor(() => document.getElementById('b-panel-cleanup')?.dataset.shown === '', { timeout: 10000, what: 'Cleanup on the root' });
  await t.app(() => {
    for (const d of document.querySelectorAll('#b-panel-cleanup .cl-group')) d.open = d.dataset.group === 'stale';
    return true;
  });
}

/** The demo's node_modules pair, compared on the right panel's Compare tab (showing it opens the drawer at 800 px). */
const NM_PAIR = ['Projects/harbor-api/node_modules', 'Projects/tidepool-web/node_modules'];
async function inCompare(t) {
  await t.app((T, rs) => {
    T.api.selectAll(rs.map((r) => T.S.model.find(r)));
    T.api.showBTab('compare');
    return true;
  }, NM_PAIR);
  await t.waitFor(() => document.querySelectorAll('#b-panel-compare .cmp-group').length === 4, { timeout: 10000, what: 'the node_modules pair compared' });
}

/** The demo's paths the Shelf's poses hold, one of them nowhere. */
const SHELF_RELS = [['Projects/harbor-api/README.md', 0], [COMPONENTS, 1], ['Downloads/invoice-2026-02.pdf', 0], ['Documents/Recipes', 1], ['Projects/harbor-api/gone-since.txt', 0]];

/**
 * The right panel on the Shelf with five items, one no longer there,
 * written to its storage and merged in as another tab's would be
 * (showing it opens the drawer at 800 px).
 */
async function inShelf(t) {
  await t.app((T, rels) => {
    const key = `terrane.shelf.v1|${T.S.info.root}`;
    const now = Date.now();
    localStorage.setItem(key, JSON.stringify({ format: 1, items: rels.map(([rel, d], i) => ({ rel, d, s: 1000 * (i + 1) ** 3, m: now - i * 86400000, at: now - i })) }));
    window.dispatchEvent(new StorageEvent('storage', { key }));
    T.api.showBTab('shelf');
    return true;
  }, SHELF_RELS);
  await t.waitFor(() => document.querySelectorAll('#b-panel-shelf .sh-row').length === 5 && !!document.querySelector('#b-panel-shelf .sh-row.is-gone'), { what: 'the Shelf with five items' });
}

/** The Shelf emptied again, as another tab's clear would, so no other pose carries its count. */
async function leaveShelf(t) {
  await t.app((T) => {
    const key = `terrane.shelf.v1|${T.S.info.root}`;
    localStorage.removeItem(key);
    window.dispatchEvent(new StorageEvent('storage', { key }));
    return true;
  });
  await t.waitFor(() => !document.querySelector('#b-tab-shelf .count'), { what: 'the Shelf emptied' });
}

/** Panel B on Preview, drawn whole for name (showing it opens the drawer at 800 px). */
async function inPreview(t, name) {
  await t.app((T) => { T.api.showBTab('preview'); return true; });
  await t.waitFor((_T, n) => document.querySelector('#b-panel-preview .pv-pane')?.dataset.shown === n, { args: [name], what: `Preview of ${name}` });
}

/** The first JPG under Photos: a picture drawn from its thumbnail. */
const PHOTO = (t) => t.app((T) => {
  let found = null;
  const walk = (d) => {
    for (const c of d.c) {
      if (found) return;
      if (c.d) walk(c);
      else if (/\.JPG$/.test(c.n)) found = c;
    }
  };
  walk(T.S.model.find('Photos'));
  return found ? T.api.relPath(found) : null;
});

/*
 * The poses, grouped by the folder they stand in so the eye travels only
 * when the place changes. heads: the ledger head's checks (C2); buttons:
 * the fixed-label buttons (C7); drawer: the narrow inspector's facts.
 */
const POSES = [
  { id: 'P1', name: 'root', at: '', heads: true, buttons: true, setup: async () => {} },
  { id: 'P2', name: 'Projects selected', at: '', heads: true, buttons: true, setup: (t) => selectRel(t, 'Projects') },
  {
    id: 'P20', name: 'Projects in Preview', at: '', small: 'skip', buttons: true, setup: async (t) => {
      await selectRel(t, 'Projects');
      await inPreview(t, 'Projects');
    },
  },
  {
    id: 'P21', name: 'a photo in Preview', at: '', small: 'skip', buttons: true, setup: async (t) => {
      const rel = await PHOTO(t);
      await t.app((T, r) => { T.api.select(T.S.model.find(r)); return true; }, rel);
      await inPreview(t, rel.slice(rel.lastIndexOf('/') + 1));
      await t.waitFor(() => {
        const img = document.querySelector('#b-panel-preview .pv-picture img');
        return !!img && img.complete && img.naturalWidth > 0;
      }, { what: 'the photo drawn' });
    },
  },
  {
    id: 'P23', name: 'an archive in Preview', at: '', small: 'skip', buttons: true, setup: async (t) => {
      await t.app((T) => { T.api.select(T.S.model.find('Downloads/fonts-pack.zip')); return true; });
      await inPreview(t, 'fonts-pack.zip');
    },
  },
  { id: 'P24', name: 'Cleanup on the root, Big and stale open', at: '', small: 'skip', buttons: true, setup: inCleanup },
  { id: 'P25', name: 'the Shelf, five items, one no longer there', at: '', small: 'skip', buttons: true, setup: inShelf, after: leaveShelf },
  { id: 'P26', name: 'Compare node_modules pair', at: '', small: 'skip', buttons: true, setup: inCompare },
  {
    id: 'P27', name: 'choosing a folder to compare with', at: '', buttons: true, setup: async (t) => {
      await selectRel(t, 'Projects/harbor-api');
      await listKey(t, 'c');
      await t.waitFor(() => !document.getElementById('placing').hidden && document.getElementById('placing-here-words').textContent === 'Compare with where I am', { what: 'the banner while choosing' });
    },
  },
  {
    id: 'P18e', name: 'drawer on the Shelf', at: '', small: 'only', buttons: true, drawer: true, setup: async (t) => {
      await inShelf(t);
      await drawerOpen(t);
    },
    after: async (t) => {
      await leaveShelf(t);
      await listKey(t, ']');
    },
  },
  {
    id: 'P18f', name: 'drawer on Compare', at: '', small: 'only', buttons: true, drawer: true, setup: async (t) => {
      await inCompare(t);
      await drawerOpen(t);
    },
    after: (t) => listKey(t, ']'),
  },
  {
    id: 'P18d', name: 'drawer on Cleanup', at: '', small: 'only', buttons: true, drawer: true, setup: async (t) => {
      await inCleanup(t);
      await drawerOpen(t);
    },
    after: (t) => listKey(t, ']'),
  },
  { id: 'P5a', name: 'Findings "tide"', at: '', heads: true, setup: (t) => t.app((T) => { T.api.setQuery('tide'); return true; }) },
  { id: 'P5b', name: 'Findings "in:Projects >1mb"', at: '', heads: true, setup: (t) => t.app((T) => { T.api.setQuery('in:Projects >1mb'); return true; }) },
  {
    id: 'P6', name: 'Survey opened', at: '', heads: true, setup: (t) => t.app((T) => {
      T.S.tab = 'survey';
      T.api.drawLedger();
      document.querySelectorAll('#ledger-rich details').forEach((d) => { d.open = true; });
      return true;
    }),
  },
  {
    id: 'P7', name: 'Journal', at: '', heads: true, setup: async (t) => {
      await t.app((T) => {
        T.S.tab = 'journal';
        T.api.drawLedger();
        return true;
      });
      await t.waitFor(() => document.querySelectorAll('#ledger-rich details').length > 0, { what: 'the Journal' });
    },
  },
  {
    id: 'P8', name: 'Places after B on Projects', at: '', heads: true, buttons: true, setup: async (t) => {
      await selectRel(t, 'Projects');
      await listKey(t, 'b');
      await t.sleep(250);
      await t.app((T) => {
        T.S.tab = 'places';
        T.api.drawLedger();
        return true;
      });
    },
  },
  { id: 'P9a', name: 'Age lens', at: '', setup: (t) => t.app((T) => { T.api.setLens('age'); return true; }) },
  { id: 'P9b', name: 'Size lens', at: '', setup: (t) => t.app((T) => { T.api.setLens('size'); return true; }) },
  { id: 'P9c', name: 'Duplicates lens', at: '', setup: (t) => t.app((T) => { T.api.setLens('dup'); return true; }) },
  {
    id: 'P11', name: 'row context menu', at: '', setup: async (t) => {
      await t.app((T) => {
        T.api.cursorTo(T.S.model.find('Projects'));
        document.getElementById('ledger-list').focus();
        return true;
      });
      await t.key('Shift+F10');
      await t.waitFor(() => !document.getElementById('menu').hidden && document.querySelectorAll('#menu .menu-item').length > 0, { what: 'the context menu' });
    },
  },
  {
    id: 'P12', name: 'guide', at: '', setup: async (t) => {
      await listKey(t, '?');
      await t.waitFor(() => document.getElementById('dialog').open && !!document.querySelector('#dialog .guide'), { what: 'the guide' });
    },
  },
  {
    id: 'P13', name: 'palette "tide"', at: '', setup: async (t) => {
      await listKey(t, 'Ctrl+K');
      await t.waitFor(() => document.getElementById('dialog').open && !!document.querySelector('.palette-input'), { what: 'the palette' });
      await t.type('tide');
      await t.waitFor(() => document.querySelectorAll('.palette-option').length > 3, { what: 'palette options' });
    },
  },
  {
    id: 'P16', name: 'three notices', at: '', setup: (t) => t.app((T) => {
      const a = T.api;
      a.notice('Moved 2 items to "Archive/2025 photo backups", with their benchmarks.', { action: { label: 'Undo', run() {} }, ms: 60000 });
      a.notice('"Tidelines_v6_final.mp4" is already in "Archive", so nothing was moved.', { kind: 'error', ms: 60000 });
      a.notice('Single-key shortcuts act only in the world and the ledger list.', { kind: 'info', ms: 60000 });
      return true;
    }),
  },
  {
    id: 'P18a', name: 'drawer on Projects', at: '', small: 'only', buttons: true, drawer: true, setup: async (t) => {
      await selectRel(t, 'Projects');
      await listKey(t, ']');
      await drawerOpen(t);
    },
    after: (t) => listKey(t, ']'),
  },
  {
    id: 'P10', name: 'time view in Projects', at: 'Projects', setup: async (t) => {
      await listKey(t, 't');
      await t.waitFor((T) => !!T.S.time, { what: 'the time view' });
    },
  },
  { id: 'P3', name: 'README.md selected', at: 'Projects/harbor-api', heads: true, buttons: true, setup: (t) => selectRel(t, README) },
  {
    id: 'P19', name: 'README.md in Preview', at: 'Projects/harbor-api', small: 'skip', buttons: true, setup: async (t) => {
      await selectRel(t, README);
      await inPreview(t, 'README.md');
    },
  },
  {
    id: 'P18c', name: 'drawer on README.md in Preview', at: 'Projects/harbor-api', small: 'only', buttons: true, drawer: true, setup: async (t) => {
      await selectRel(t, README);
      await inPreview(t, 'README.md');
      await drawerOpen(t);
    },
    after: (t) => listKey(t, ']'),
  },
  {
    id: 'P15', name: 'rename dialog', at: 'Projects/harbor-api', setup: async (t) => {
      await selectRel(t, README);
      await listKey(t, 'F2');
      await t.waitFor(() => document.getElementById('dialog').open && !!document.querySelector('#dialog .field input'), { what: 'the rename dialog' });
    },
  },
  {
    id: 'P17', name: 'placing', at: 'Projects/harbor-api', setup: async (t) => {
      await selectRel(t, README);
      await listKey(t, 'm');
      await t.waitFor(() => !document.getElementById('placing').hidden, { what: 'placing' });
    },
  },
  {
    id: 'P18b', name: 'drawer on README.md', at: 'Projects/harbor-api', small: 'only', buttons: true, drawer: true, setup: async (t) => {
      await selectRel(t, README);
      await listKey(t, ']');
      await drawerOpen(t);
    },
    after: (t) => listKey(t, ']'),
  },
  { id: 'P4', name: 'six files selected', at: COMPONENTS, heads: true, buttons: true, setup: six },
  {
    id: 'P22', name: 'six files in Preview', at: COMPONENTS, small: 'skip', buttons: true, setup: async (t) => {
      await six(t);
      await inPreview(t, '6 items');
    },
  },
  {
    id: 'P14', name: 'batch rename of six files', at: COMPONENTS, setup: async (t) => {
      await six(t);
      await listKey(t, 'F2');
      await t.waitFor(() => document.getElementById('dialog').open && !!document.querySelector('.rename-rules'), { what: 'the batch rename' });
    },
  },
];

const polish = {
  name: 'polish',
  title: 'Polish: alignment, wrapping and clipping invariants',
  data: 'any',
  passes: ['webgl', 'nogl'],
  timeout: 300000,
  async run(t) {
    const port = Number(new URL(t.url).port) + 8;
    const server = await pages(port);
    const metrics = (s) => t.page.send('Emulation.setDeviceMetricsOverride', { width: s.w, height: s.h, deviceScaleFactor: 1, mobile: false });
    try {
      await t.page.send('Page.navigate', { url: `http://127.0.0.1:${port}/web/?still` });
      const ready = await t.until(() => {
        const T = window.__terrane;
        return !!T && !T.S.scanning && !!T.S.info?.demo && document.getElementById('splash').hidden && !!T.S.survey;
      }, { timeout: 30000 });
      t.check('the demo world is up, served as Pages', !!ready);
      if (!ready) return;
      await t.eval(INSTALL);
      await t.app(() => { window.__polishAt = ''; return true; });
      await t.settle();
      const cells = {};
      for (const size of SIZES) {
        await metrics(size);
        await t.sleep(450);
        await t.settle({ quiet: 250 });
        for (const p of POSES) {
          if (p.small === 'only' && size.id !== 'small') continue;
          if (p.small === 'skip' && size.id === 'small') continue;
          const t0 = Date.now();
          await clear(t);
          await into(t, p.at);
          const t1 = Date.now();
          await p.setup(t);
          await t.sleep(260);
          await t.settle({ quiet: 250 });
          const t2 = Date.now();
          const at = `${p.id} ${p.name} at ${size.w}x${size.h}`;
          const res = await t.eval((o) => window.__polish.measure(o), {
            size: size.id, gl: t.gl, heads: !!p.heads && size.id !== 'small', buttons: !!p.buttons, drawer: !!p.drawer,
          });
          await t.shot(`${size.w}x${size.h}-${p.id}-${p.name}`);
          if (process.env.POLISH_TIMING) t.note(`${p.id} ${size.id}: travel ${t1 - t0} setup ${t2 - t1} measure ${Date.now() - t2} ms`);
          for (const [id, r] of Object.entries(res)) {
            if (id === 'cells' || !r.n) continue;
            t.check(`${id} ${NAMES[id]} (${r.n}) — ${at}`, r.bad.length === 0, JSON.stringify(r.bad));
          }
          if (size.id !== 'small') cells[`${size.id}:${p.id}`] = res.cells;
          // C11: fly once to the selection and see the cells hold.
          if (p.id === 'P3' && t.gl && size.id !== 'small') {
            await listKey(t, 'g');
            await t.settle({ quiet: 300 });
            cells[`${size.id}:fly`] = (await t.eval((o) => window.__polish.measure(o), { size: 'small' })).cells;
            await t.app(() => { window.__polishAt = null; return true; });
          }
          if (p.after) await p.after(t);
        }
        if (size.id !== 'small') {
          const lefts = (k) => (cells[k] || []).map((c) => c.left);
          for (const other of ['P3', 'P10', ...(t.gl ? ['fly'] : [])]) {
            const a = lefts(`${size.id}:P1`);
            const b = lefts(`${size.id}:${other}`);
            const d = a.length === b.length ? Math.max(0, ...a.map((x, i) => Math.abs(x - b[i]))) : Infinity;
            t.check(`C11 the title block's cells keep their place, P1 against ${other} at ${size.w}x${size.h}`, d <= 0.5, JSON.stringify({ P1: a, [other]: b }));
          }
        }
      }
      await clear(t);
      await into(t, '');
    } finally {
      await metrics(SIZES[0]).catch(() => {});
      await new Promise((r) => server.close(r));
    }
    await t.page.send('Page.navigate', { url: t.url });
    await t.until((T) => !!T && !T.S.scanning && document.getElementById('splash').hidden, { timeout: 30000 });
  },
};

export default polish;
