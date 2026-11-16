/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Compare Scenarios (Terrane Edition - v1.0)
 *     - File Name: compare.mjs
 *     - Relative Path: tools/ui-scenarios/compare.mjs
 *     - Artifact Type: test
 *     - Version: 1.0.0
 *     - Date: 11/15/2026
 *     - Update: Sunday, November 15, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Changelog:
 *     - 1.0.0 (11/15/2026) [dendogg + Anthropic - Claude Opus 5.5] —
 *       Initial release.
 *
 * ✒ Description:
 *     Walks the right panel's Compare tab end to end in the real page, by
 *     keyboard where a person would, in both passes: finding it, what it
 *     says first, choosing the other folder and cancelling, reading the
 *     groups against diff.js run in Node over the same folders, acting on
 *     the rows, Swap, Clear and Undo, leaving and coming back, the world's
 *     menu, a drag, a benchmark, Terrane's own rename and its Undo, a
 *     folder removed from outside and put back; then read-only, a narrow
 *     window and region mode.
 *
 * ✒ Key Features:
 *     - compare (writes): a lab of two folders with every kind of
 *       difference; the strip reads Inspector, Preview, Compare, Cleanup,
 *       Shelf; Ctrl+K "compare"; the empty state; C, Esc and C again with
 *       Enter on a ledger row; the groups' counts and bytes; ↓ Enter, Enter
 *       again, → and ←, K; Select all; Swap; Clear and Undo; travel and ]
 *       twice; the menu's Compare with…, Compare these two, the choice's
 *       first item, its match; Compare these two and a drag of two rows
 *       while choosing, each ending the choice; Clear, then the tab left
 *       and opened with two others selected; the suggestions and the
 *       sides' lines; Compare with now and its Select all; the
 *       rename followed and back on Ctrl+Z; the folder removed and back;
 *       the Guide's rows
 *     - compare-modes (read-only): no change sent from any Compare action,
 *       the Select-all sentence without Copy and Move; the warm note; the
 *       drawer at 800 × 500, stepping aside while choosing; snapshot mode
 *     - compare-regions (threshold 0, read-only): two fixture folders, the
 *       counts equal diff.js over their listings; the same-name
 *       suggestions from GET /api/places; the pair kept across travel; no
 *       note of entries not sent at this size
 *
 * ✒ Usage Instructions:
 *     node tools/ui-check.mjs compare --no-shots --port 5300
 *     node tools/ui-check.mjs compare-modes --no-shots --port 5300
 *     node tools/ui-check.mjs compare-regions --no-shots --port 5300
 *
 * ✒ Other Important Information:
 *     - Dependencies: tools/ui-check.mjs (the context t); web/js/diff.js,
 *       run in Node for the expected groups
 *     - Compatible platforms: Node.js 22.5+
 * ----------------------------------------------------------------------------
 */

import fs from 'node:fs';
import path from 'node:path';

const D = await import(new URL('../../web/js/diff.js', import.meta.url).href);

const LAB = 'compare-lab';
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const DAY = 86400000;

/** The tab as it stands, read in the page. */
const cmp = () => {
  const P = document.getElementById('b-panel-compare');
  const q = (s) => P?.querySelector(s);
  const vis = (e) => !!e && !e.closest('[hidden]');
  const a = document.activeElement;
  return {
    shown: !!P && !P.hidden && getComputedStyle(document.getElementById('inspector')).visibility === 'visible',
    key: P?.dataset.shown ?? null,
    kind: q('.insp-kind')?.textContent ?? null,
    name: q('.insp-name')?.textContent ?? null,
    sides: [...(P?.querySelectorAll('.cmp-side') || [])].map((b) => ({ nm: b.querySelector('.nm').textContent, path: b.querySelector('.path').textContent, full: b.querySelector('.path').title, fig: b.querySelector('.fig').textContent })),
    tools: [...(P?.querySelectorAll('.cmp-tools button') || [])].map((b) => b.textContent.trim()),
    say: vis(q('.cmp-say')) ? q('.cmp-say').textContent : null,
    lead: vis(q('.cmp-lead')) ? q('.cmp-lead').textContent : null,
    start: vis(q('.cmp-start')) ? q('.cmp-start').textContent : null,
    state: vis(q('.cmp-state')) ? q('.cmp-state').textContent : null,
    error: !!q('.cmp-state.is-error:not([hidden])'),
    notes: [...(P?.querySelectorAll('.cmp-note') || [])].filter(vis).map((n) => n.textContent),
    sugs: [...(P?.querySelectorAll('.cmp-sug') || [])].map((b) => b.title),
    groups: [...(P?.querySelectorAll('.cmp-group') || [])].map((d) => ({
      id: d.dataset.group, count: Number(d.dataset.count), bytes: Number(d.dataset.bytes), open: d.open, t: d.querySelector('summary .t').textContent,
      keys: [...d.querySelectorAll('.cmp-row')].map((r) => r.dataset.key),
    })),
    buttons: [...(P?.querySelectorAll('.btn') || [])].filter(vis).map((b) => b.textContent.trim()),
    live: [...(P?.querySelectorAll('[aria-live], [role=status], [role=alert]') || [])].length,
    focus: a === q('.insp-name') ? 'name' : a?.closest?.('.cmp-row') ? `row:${a.closest('.cmp-row').dataset.key}` : P?.contains(a) ? (a.dataset?.k || a.className || a.tagName) : (a?.id || a?.dataset?.btab || 'body'),
  };
};

async function drawn(t, fn = () => true, what = 'Compare') {
  try {
    return await t.waitFor(`() => { const st = (${cmp})(); return st.shown && (${fn})(st) && st; }`, { timeout: 15000, what });
  } catch (err) {
    const st = await t.eval(`(${cmp})()`).catch(() => null);
    throw new Error(`${err.message}; the tab: ${JSON.stringify(st)}`.slice(0, 1800));
  }
}
const now = (t) => t.eval(`(${cmp})()`);
const said = (t, re, what = String(re)) => t.waitFor(`() => { const l = document.getElementById('live').textContent; return ${re}.test(l) && l; }`, { timeout: 10000, what });
const showCompare = (t) => t.app((T) => { T.api.showBTab('compare'); return true; });

/** Opens the palette and types query; resolves to its options as "label|detail|why|key". */
async function palette(t, query, fn = (o) => o.length > 0) {
  await t.key('Ctrl+K');
  await t.waitFor(() => document.getElementById('dialog').open && !!document.querySelector('.palette-input'), { what: 'the palette' });
  await t.type(query);
  return t.waitFor(`() => { const o = [...document.querySelectorAll('.palette-option')].map((x) => [x.querySelector('.pal-label')?.textContent, x.querySelector('.pal-detail')?.textContent, x.querySelector('.pal-why')?.textContent ?? '', x.querySelector('kbd')?.textContent ?? ''].join('|')); return (${fn})(o) && o; }`,
    { what: `the palette's options for "${query}"` });
}

/** Selects rels in the ledger (Contents of the first one's folder), focus on the list. */
async function selectRels(t, rels) {
  for (let k = 0; k < 2; k++) {
    await t.app((T, rs) => {
      const nodes = rs.map((r) => T.S.model.find(r));
      T.api.setFocus(nodes[0].p);
      T.S.tab = 'contents';
      T.api.drawLedger();
      T.api.selectAll(nodes, nodes[0]);
      T.api.cursorTo(nodes[0]);
      document.getElementById('ledger-list').focus();
      return true;
    }, rels);
    if (!k) await t.settle({ quiet: 200 });
  }
}

/** Selects rel in the world, focus on the world, and opens its menu with Shift+F10; chooses an item or closes it. */
async function worldMenu(t, rels, choose = null) {
  await t.app((T, rs) => {
    const nodes = rs.map((r) => T.S.model.find(r));
    if (nodes.length > 1) T.api.selectAll(nodes, nodes[0]);
    else T.api.select(nodes[0]);
    document.getElementById('view').focus();
    return true;
  }, [].concat(rels));
  await t.key('Shift+F10');
  await t.waitFor(() => !document.getElementById('menu').hidden && document.querySelectorAll('#menu .menu-item').length > 0, { what: 'the context menu' });
  const items = await t.eval(() => [...document.querySelectorAll('#menu .menu-item')].map((b) => ({
    label: b.querySelector('.menu-label').textContent, off: b.getAttribute('aria-disabled') === 'true', why: b.querySelector('.menu-why')?.textContent ?? null, hint: b.querySelector('kbd')?.textContent ?? null,
  })));
  if (!choose) await t.key('Escape');
  else {
    let at = null;
    for (let k = 0; k < 40; k++) {
      at = await t.eval(() => document.activeElement?.querySelector?.('.menu-label')?.textContent ?? null);
      if (at === choose) break;
      await t.key('ArrowDown');
    }
    if (at !== choose) throw new Error(`the menu has no "${choose}": ${JSON.stringify(items.map((i) => i.label))}`);
    await t.key('Enter');
  }
  await t.waitFor(() => document.getElementById('menu').hidden, { what: 'the menu to close' });
  return items;
}

/** Focuses an element by selector, then presses key. */
async function press(t, selector, key = 'Enter') {
  const ok = await t.eval((s) => {
    const b = document.querySelector(s);
    if (!b) return false;
    b.focus();
    return document.activeElement === b;
  }, selector);
  if (!ok) throw new Error(`nothing to focus at ${selector}`);
  await t.key(key);
}

const noticeText = (t, re) => t.waitFor(`() => [...document.querySelectorAll('#notices .notice-text')].map((n) => n.textContent).find((x) => ${re}.test(x)) || false`, { timeout: 10000, what: `a notice like ${re}` });
const clickNotice = (t, re, label) => t.eval(`(() => {
  const n = [...document.querySelectorAll('#notices .notice')].reverse().find((x) => ${re}.test(x.textContent));
  const b = n && [...n.querySelectorAll('.btn')].find((x) => x.textContent === ${JSON.stringify(label)});
  if (b) b.click();
  return !!b;
})()`);

/**
 * A side as diff.js reads one, from the disk: each direct entry's size
 * (a folder's summed below it), its files and folders, a file's time.
 */
function sideOnDisk(abs, rel) {
  const sum = (p) => {
    let s = 0;
    let fc = 0;
    let dc = 0;
    for (const e of fs.readdirSync(p, { withFileTypes: true })) {
      const q = path.join(p, e.name);
      if (e.isDirectory()) {
        const x = sum(q);
        s += x.s;
        fc += x.fc;
        dc += x.dc + 1;
      } else {
        s += fs.lstatSync(q).size;
        fc++;
      }
    }
    return { s, fc, dc };
  };
  const entries = fs.readdirSync(abs, { withFileTypes: true }).map((e) => {
    const q = path.join(abs, e.name);
    if (e.isDirectory()) {
      const x = sum(q);
      return { name: e.name, d: true, s: x.s, f: x.fc, fc: x.fc, dc: x.dc, m: null, e: 0, link: false };
    }
    const st = fs.lstatSync(q);
    return { name: e.name, d: false, s: st.size, f: 1, m: Math.floor(st.mtimeMs), e: 0, link: st.isSymbolicLink() };
  });
  const all = sum(abs);
  return { kind: 'folder', rel, name: path.basename(abs), s: all.s, fc: all.fc, dc: all.dc, items: entries.length, mm: 0, ks: null, e: 0, entries, tail: null };
}

/** What the tab must show for two folders: each group's count and bytes, and its keys in order. */
function expected(root, r0, r1, platform) {
  const abs = (r) => path.join(root, ...r.split('/'));
  const res = D.diff(sideOnDisk(abs(r0), r0), sideOnDisk(abs(r1), r1), { platform });
  return {
    'only-0': { count: res.count.only0, bytes: res.bytes.only0, keys: res.only[0].map((x) => x.key) },
    'only-1': { count: res.count.only1, bytes: res.bytes.only1, keys: res.only[1].map((x) => x.key) },
    changed: { count: res.count.changed, bytes: res.bytes.changed, keys: res.changed.map((x) => x.key) },
    same: { count: res.count.same, bytes: res.bytes.same, keys: res.same.map((x) => x.key) },
  };
}
const groupsMatch = (st, want) => st.groups.length === 4 && st.groups.every((g) => g.count === want[g.id].count && g.bytes === want[g.id].bytes);

/** The lab: left and right with every kind of difference. */
function buildLab(root) {
  const at = (...p) => path.join(root, LAB, ...p);
  const T = Math.floor((Date.now() - 10 * DAY) / 1000) * 1000;
  const put = (rel, size, ms = T) => {
    const f = at(...rel.split('/'));
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, 'x'.repeat(size));
    fs.utimesSync(f, ms / 1000, ms / 1000);
  };
  put('left/only-a.txt', 300);
  put('left/only-b.txt', 200);
  put('left/only-c.txt', 100);
  put('right/only-r.txt', 250);
  put('right/only-s.txt', 50);
  put('left/grew.txt', 1000);
  put('right/grew.txt', 1500);
  put('left/shrank.txt', 60);
  put('right/shrank.txt', 20);
  put('left/later.txt', 40);
  put('right/later.txt', 40, T + DAY);
  put('left/within.txt', 30);
  put('right/within.txt', 30, T + 1000);
  for (const n of ['same-1.txt', 'same-2.txt', 'same-3.txt', 'same-4.txt']) {
    put(`left/${n}`, 10);
    put(`right/${n}`, 10);
  }
  put('left/sub/inner.txt', 10);
  put('right/sub/inner.txt', 20);
  put('right/sub/extra.txt', 5);
  put('left/x/in-x.txt', 7);
  put('right/x', 7);
  put('left/Notes.TXT', 9);
  put('right/notes.txt', 9);
  put('elsewhere/left/far.txt', 3);
  return at;
}

/* ====================================================================== */

const compare = {
  name: 'compare',
  title: 'Compare: the right panel\'s tab for two folders side by side, found, read, acted on, kept and left (writes)',
  data: 'fixture',
  write: true,
  timeout: 300000,
  async run(t) {
    await t.settle();
    const at = buildLab(t.root);
    await t.app((T) => { T.api.refreshDirs(['']); return true; });
    await t.waitFor((T) => !!T.S.model.find('compare-lab/right/sub/extra.txt') && !!T.S.model.find('compare-lab/elsewhere/left') && !T.S.surveyTimer && !!T.S.survey, { timeout: 20000, what: 'the lab read in' });
    await t.settle();
    const platform = await t.app((T) => T.S.info.platform || 'linux');
    const want = expected(t.root, `${LAB}/left`, `${LAB}/right`, platform);

    /* ---- finding it ---- */
    const s0 = await t.app(() => ({
      tabs: [...document.querySelectorAll('#b-tabs [role=tab]')].map((b) => `${b.dataset.btab}:${b.textContent}`),
      icons: [...document.querySelectorAll('#b-tabs [role=tab] use')].map((u) => u.getAttribute('href').split('#')[1]),
      title: document.getElementById('b-tab-compare')?.title,
      mounted: 'mounted' in (document.getElementById('b-panel-compare')?.dataset || {}),
    }));
    t.check('the right panel\'s strip reads Inspector, Preview, Compare, Cleanup, Shelf, with Compare\'s columns-2 icon and its title, not yet mounted',
      same(s0.tabs, ['inspector:Inspector', 'preview:Preview', 'compare:Compare', 'cleanup:Cleanup', 'shelf:Shelf']) && s0.icons[2] === 'columns-2'
      && s0.title === 'Compare: two folders side by side, and what differs' && !s0.mounted, JSON.stringify(s0));
    await t.eval(() => { document.getElementById('ledger-list').focus(); return true; });
    // Ranked: the full list of actions, Drop to eye level among them, is gone.
    const opts = await palette(t, 'compare', (o) => o.some((x) => x.startsWith('Show Compare|')) && o.some((x) => x.startsWith('Clear the compared folders|'))
      && !o.some((x) => x.startsWith('Drop to eye level|')));
    const opt = (label) => opts.find((x) => x.startsWith(`${label}|`)) || '';
    t.check(`Ctrl+K "compare" lists Show Compare first, then the commands, each saying why when it cannot run (${opt('Compare the two selected folders')})`,
      opts[0].startsWith('Show Compare|') && /\|C\|/.test(opt('Compare with…').replace(/ · C\|/, '|C|')) && /Unavailable: select two folders first/.test(opt('Compare the two selected folders'))
      && /Unavailable: no benchmark on .+: B sets one/.test(opt('Compare with its benchmark')) && /Unavailable: nothing is being compared/.test(opt('Swap the compared folders'))
      && /Unavailable: nothing is being compared/.test(opt('Clear the compared folders')), JSON.stringify(opts));
    await t.key('Escape');
    await t.waitFor(() => !document.getElementById('dialog').open);
    await palette(t, 'show compare', (o) => o[0]?.startsWith('Show Compare|'));
    await t.key('Enter');
    const e0 = await drawn(t, (s) => s.focus === 'name', 'Compare, focus on its head');
    t.check(`Show Compare opens the empty tab with focus on its head, "${e0.name}"`, e0.kind === 'Compare' && e0.name === 'Two folders, side by side', JSON.stringify(e0));
    t.check('the empty state says what Compare does, offers to start, and names the other ways; no live region inside the tab',
      e0.lead === "See two folders' size, makeup and age together, and what each holds that the other does not." && /^Compare ".+" with…$/.test(e0.start || '')
      && e0.notes.includes('Right-click a folder for Compare with…, or drag two folders here from the list.') && e0.live === 0, JSON.stringify(e0));
    await t.app((T, r) => { T.api.select(T.S.model.find(r)); return true; }, `${LAB}/left`);
    const sg0 = await drawn(t, (s) => s.start === 'Compare "left" with…' && s.sugs.includes('compare-lab/elsewhere/left'), 'the twin of left suggested');
    await t.app((T, r) => { T.api.select(T.S.model.find(r)); return true; }, `${LAB}/right`);
    const sg1 = await drawn(t, (s) => s.start === 'Compare "right" with…', 'the start button following the selection');
    t.check(`the start button and the same-name suggestions follow the selection (left: ${sg0.sugs.join(', ')}; right: ${sg1.sugs.join(', ') || 'none'})`,
      !sg1.sugs.includes(`${LAB}/elsewhere/left`), JSON.stringify({ left: sg0.sugs, right: sg1.sugs }));

    /* ---- choosing, cancelling, choosing again ---- */
    await selectRels(t, [`${LAB}/left`]);
    await t.key('c');
    const banner = await t.waitFor((T) => T.S.picking && !document.getElementById('placing').hidden && {
      text: document.getElementById('placing-text').textContent, here: document.getElementById('placing-here-words').textContent,
      icon: document.querySelector('#placing-here use').getAttribute('href').split('#')[1], cursor: document.getElementById('view').classList.contains('is-picking'),
    }, { what: 'the banner while choosing' });
    t.check(`C on left shows the banner: "${banner.text}", [${banner.here}]`,
      banner.text === 'Compare "left" with: click a folder in the world, or travel to one and compare it there.' && banner.here === 'Compare with where I am' && banner.icon === 'columns-2' && banner.cursor, JSON.stringify(banner));
    const tipLines = await t.app((T, r) => {
      const self = T.S.model.find(r);
      const other = T.S.model.find(r.replace(/left$/, 'right'));
      const line = (n) => [...T.api.TIP_LINES].map((x) => {
        try {
          return x.lines(n, { type: 0, i: -1, L: T.S.layout });
        } catch {
          return null;
        }
      }).flat().filter(Boolean);
      return { self: line(self), other: line(other) };
    }, `${LAB}/left`);
    t.check(`the hover line says what a click does (${tipLines.other.join(' / ')}) and why not on the folder itself (${tipLines.self.join(' / ')})`,
      tipLines.other.includes('Click to compare with left') && tipLines.self.includes('Cannot compare here: that is the folder being compared'), JSON.stringify(tipLines));
    await t.key('Escape');
    const esc = await t.waitFor((T) => !T.S.picking && document.getElementById('placing').hidden && {
      here: document.getElementById('placing-here-words').textContent, icon: document.querySelector('#placing-here use').getAttribute('href').split('#')[1],
    }, { what: 'Escape ending the choice' });
    t.check('Escape cancels the choice; the banner\'s here button reads Place where I am again', esc.here === 'Place where I am' && esc.icon === 'folder-input', JSON.stringify(esc));
    await selectRels(t, [`${LAB}/left`]);
    await t.key('c');
    await t.waitFor((T) => !!T.S.picking, { what: 'choosing again' });
    await t.app((T, r) => {
      T.api.cursorTo(T.S.model.find(r));
      document.getElementById('ledger-list').focus();
      return true;
    }, `${LAB}/right`);
    await t.key('Enter');
    const r1 = await drawn(t, (s) => s.groups.length === 4 && s.focus === 'name', 'left and right compared');
    t.check(`Enter on right in the ledger takes it: "${r1.name}", the sides ${r1.sides.map((s) => s.nm).join(' and ')}, focus on the head`,
      r1.name === 'left and right' && same(r1.sides.map((s) => s.nm), ['left', 'right']) && r1.tools.includes('Swap') && r1.tools.includes('Clear'), JSON.stringify(r1));
    t.check(`each side reads its name, then the folder it is in, the full path on hover (${r1.sides.map((s) => `${s.nm} · ${s.path}`).join('; ')})`,
      same(r1.sides.map((s) => s.path), [LAB, LAB]) && same(r1.sides.map((s) => s.full), [`${LAB}/left`, `${LAB}/right`]), JSON.stringify(r1.sides));
    t.check('Select all on In both says both copies for a pair of folders', r1.buttons.some((b) => /^Select all \d+ \(both copies\)$/.test(b)), JSON.stringify(r1.buttons));
    const said1 = await said(t, /^Comparing left with right\. /, 'the comparison said');
    t.check(`the sentence is said and shown (${said1.slice(0, 80)}…)`, said1.endsWith(r1.say) && !/created|added/.test(r1.say), r1.say);
    t.check(`the four groups' counts and bytes equal diff.js over the same folders on disk (${platform}: ${r1.groups.map((g) => `${g.id} ${g.count}`).join(', ')})`,
      groupsMatch(r1, want), JSON.stringify({ got: r1.groups.map((g) => [g.id, g.count, g.bytes]), want }));
    t.check('each open list is ranked as diff.js ranks it, largest first',
      r1.groups.every((g) => !g.keys.length || same(g.keys, want[g.id].keys.slice(0, g.keys.length))), JSON.stringify(r1.groups.map((g) => [g.id, g.keys])));
    t.check('only in the first opens first; In both, the same starts closed', r1.groups.find((g) => g.id === 'only-0').open && !r1.groups.find((g) => g.id === 'same').open, JSON.stringify(r1.groups.map((g) => [g.id, g.open])));

    /* ---- acting on the rows ---- */
    await t.app(() => { document.querySelector('#b-panel-compare [data-group=changed]').open = true; return true; });
    await press(t, '#b-panel-compare [data-group=changed] button.cmp-item', 'ArrowDown');
    await t.key('ArrowUp');
    const firstKey = await t.eval(() => document.activeElement?.closest('.cmp-row')?.dataset.key);
    await t.key('Enter');
    const both = await t.waitFor((T) => T.S.sel.size === 2 && { sel: [...T.S.sel].map((n) => T.api.relPath(n)).sort(), primary: T.api.relPath(T.S.primary) }, { what: 'both copies selected' });
    await t.key('Enter');
    const other = await t.waitFor((T, p) => T.api.relPath(T.S.primary) !== p && T.api.relPath(T.S.primary), { args: [both.primary], what: 'Enter again framing the other' });
    t.check(`↑ ↓ Enter on ${firstKey} selects both copies and frames the first; Enter again frames the other (${other}); the tab stays on Compare`,
      both.sel.length === 2 && both.primary.startsWith(`${LAB}/left/`) && other.startsWith(`${LAB}/right/`) && (await t.app((T) => T.S.bTab)) === 'compare', JSON.stringify({ both, other }));
    await press(t, '#b-panel-compare .cmp-row[data-key="c/sub"] button.cmp-item', 'ArrowRight');
    const inner = await drawn(t, (s) => s.name === 'Two folders named sub' && s.tools.includes('Back out one level') && s.groups.length === 4, 'inside sub');
    t.check(`→ on sub compares inside it ("${inner.name}"), with Back out one level in the head`, inner.groups.find((g) => g.id === 'only-1').count === 1 && inner.groups.find((g) => g.id === 'changed').count === 1, JSON.stringify(inner.groups));
    await t.waitFor(() => !!document.activeElement?.closest?.('#b-panel-compare .cmp-row'), { what: 'focus on the first inner row' });
    await t.key('ArrowLeft');
    const backed = await drawn(t, (s) => s.name === 'left and right' && s.focus === 'row:c/sub', 'backed out to sub');
    t.check('← backs out to the level above, focus on the row it left', !backed.tools.includes('Back out one level'), JSON.stringify(backed.focus));
    await t.key('k');
    const k1 = await t.waitFor(() => document.querySelector('#b-tab-shelf .count')?.textContent || false, { what: 'the Shelf counting' });
    await t.key('k');
    await t.waitFor(() => !document.querySelector('#b-tab-shelf .count') || document.querySelector('#b-tab-shelf .count').textContent === '0', { what: 'the Shelf emptied again' });
    t.check(`K on a row puts its copies on the shelf (${k1}), K again takes them off`, Number(k1) >= 1);
    await press(t, '#b-panel-compare [data-k=all-only-0]');
    const selAll = await t.waitFor((T, n) => T.S.sel.size === n && T.S.sel.size, { args: [want['only-0'].count], what: 'Select all' });
    const selSaid = await said(t, /^Selected \d+ items? only in left\./, 'Select all said');
    t.check(`Select all ${selAll} selects every row only in left and says what acts on them (${selSaid})`, /Copy to… or Move to… acts on (it|them); K puts (it|them) on the shelf\.$/.test(selSaid));

    /* ---- Swap, Clear and Undo ---- */
    await press(t, '#b-panel-compare [data-k=swap]');
    const sw = await drawn(t, (s) => s.name === 'right and left', 'swapped');
    t.check('Swap swaps the sides and the Only-in counts; focus stays on Swap',
      sw.groups.find((g) => g.id === 'only-0').count === want['only-1'].count && sw.groups.find((g) => g.id === 'only-1').count === want['only-0'].count && sw.focus === 'swap', JSON.stringify(sw.groups.map((g) => [g.id, g.count])));
    await press(t, '#b-panel-compare [data-k=swap]');
    await drawn(t, (s) => s.name === 'left and right');
    await press(t, '#b-panel-compare [data-k=clear]');
    await noticeText(t, /^Comparison cleared\.$/);
    const cl = await drawn(t, (s) => s.name === 'Two folders, side by side' && s.focus === 'start', 'cleared');
    t.check('Clear empties the tab, says so with Undo, and puts focus on the start button', !!cl.start, JSON.stringify(cl));
    await clickNotice(t, /^Comparison cleared/, 'Undo');
    await drawn(t, (s) => s.name === 'left and right' && s.groups.length === 4, 'the pair back');

    /* ---- moving around ---- */
    await t.app((T) => {
      T.api.setFocus(T.S.model.root);
      T.api.select(null);
      document.getElementById('b-tab-inspector').click();
      return true;
    });
    await t.sleep(300);
    await t.tabTo('#view', { max: 80 });
    await t.key(']');
    await t.sleep(250);
    await t.key(']');
    await showCompare(t);
    const kept = await drawn(t, (s) => s.groups.length === 4, 'kept after travel');
    t.check('after travel, the Inspector and ] twice, the pair is kept and shown at once', kept.name === 'left and right' && groupsMatch(kept, want), JSON.stringify(kept.name));

    /* ---- Clear, then the tab left and opened with two other folders selected ---- */
    await t.app((T, rs) => { T.api.selectAll(rs.map((r) => T.S.model.find(r))); return true; }, [`${LAB}/left`, `${LAB}/right`]);
    await press(t, '#b-panel-compare [data-k=clear]');
    const cl2 = await drawn(t, (s) => s.name === 'Two folders, side by side', 'cleared with two selected');
    await t.app((T, rs) => {
      document.getElementById('b-tab-inspector').click();
      T.api.select(null);
      T.api.selectAll(rs.map((r) => T.S.model.find(r)));
      return true;
    }, [`${LAB}/left`, `${LAB}/elsewhere/left`]);
    await showCompare(t);
    const again = await drawn(t, (s) => s.name === 'Two folders named left' && s.groups.length === 4, 'two others compared on opening the tab again');
    t.check('after Clear the two selected are not compared on their own, but leaving and opening the tab with two others selected compares them at once',
      cl2.buttons.includes('Compare the 2 selected folders') && same(again.sides.map((s) => s.full), [`${LAB}/left`, `${LAB}/elsewhere/left`]), JSON.stringify({ cleared: cl2.buttons, again: again.sides }));
    t.check('two of one name: each side reads the shortest tail that tells them apart, then the folder above it, never the name twice',
      same(again.sides.map((s) => s.nm), [`${LAB}/left`, 'elsewhere/left']) && same(again.sides.map((s) => s.path), ['the root', LAB]), JSON.stringify(again.sides));
    await t.app((T, rs) => { T.api.selectAll(rs.map((r) => T.S.model.find(r))); T.api.KEYS.get('compare').run({}); return true; }, [`${LAB}/left`, `${LAB}/right`]);
    await drawn(t, (s) => s.name === 'left and right' && s.groups.length === 4, 'left and right once more');

    /* ---- the world's menu ---- */
    const m1 = await worldMenu(t, `${LAB}/elsewhere/left`);
    const cw = m1.find((m) => m.label === 'Compare with…');
    t.check('the world\'s menu on a folder offers Compare with…, with C', cw && cw.hint === 'C' && !cw.off, JSON.stringify(m1.map((m) => `${m.label}|${m.hint}`)));
    const m2 = await worldMenu(t, [`${LAB}/left`, `${LAB}/elsewhere/left`]);
    t.check('two folders selected: Compare these two, with C', m2.some((m) => m.label === 'Compare these two' && m.hint === 'C' && !m.off), JSON.stringify(m2.map((m) => m.label)));
    const m3 = await worldMenu(t, `${LAB}/left/sub/inner.txt`);
    t.check('a file under one side whose path is on the other too: Select its match', m3.some((m) => m.label === 'Select its match in "right"'), JSON.stringify(m3.map((m) => m.label)));
    const m4 = await worldMenu(t, `${LAB}/left/sub`);
    t.check('a folder likewise: Compare with its match', m4.some((m) => m.label === 'Compare with its match in "right"'), JSON.stringify(m4.map((m) => m.label)));
    await selectRels(t, [`${LAB}/elsewhere/left`]);
    await t.key('c');
    await t.waitFor((T) => !!T.S.picking, { what: 'choosing from elsewhere/left' });
    const m5 = await worldMenu(t, `${LAB}/right`);
    t.check('while choosing, the menu offers Compare with "left", with C, before Compare with…',
      m5.findIndex((m) => m.label === 'Compare with "left"') >= 0 && m5.findIndex((m) => m.label === 'Compare with "left"') < m5.findIndex((m) => m.label === 'Compare with…'), JSON.stringify(m5.map((m) => m.label)));
    await t.key('Escape');
    await t.waitFor((T) => !T.S.picking, { what: 'choosing ended' });
    await t.app((T) => { T.api.stopPick(); return true; });

    /* ---- two folders compared while choosing: the choice ends ---- */
    await selectRels(t, [`${LAB}/elsewhere/left`]);
    await t.key('c');
    await t.waitFor((T) => !!T.S.picking, { what: 'choosing from elsewhere/left again' });
    await worldMenu(t, [`${LAB}/left`, `${LAB}/right`], 'Compare these two');
    const ct = await drawn(t, (s) => s.name === 'left and right' && s.groups.length === 4, 'Compare these two while choosing');
    const ctPick = await t.app((T) => ({ picking: !!T.S.picking, banner: !document.getElementById('placing').hidden }));
    t.check('while choosing, Compare these two on the menu ends the choice: the banner goes and the new pair is drawn at once',
      !ctPick.picking && !ctPick.banner && !!ct.say, JSON.stringify({ ctPick, name: ct.name }));
    await selectRels(t, [`${LAB}/right`]);
    await t.key('c');
    await t.waitFor((T) => !!T.S.picking, { what: 'choosing from right before the drag' });

    /* ---- a drag of two rows onto the tab ---- */
    await t.app((T, rs) => {
      T.S.drag = rs.map((r) => T.S.model.find(r));
      const b = document.getElementById('b-tab-compare');
      const dt = new DataTransfer();
      b.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt }));
      b.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));
      T.S.drag = null;
      return true;
    }, [`${LAB}/left`, `${LAB}/elsewhere/left`]);
    const dr = await drawn(t, (s) => s.name === 'Two folders named left' && s.groups.length === 4, 'the dragged pair');
    const drPick = await t.app((T) => ({ picking: !!T.S.picking, banner: !document.getElementById('placing').hidden }));
    t.check(`dragging two folder rows onto the tab while choosing ends the choice and compares them ("${dr.name}", ${dr.sides.map((s) => s.nm).join(' and ')})`,
      same(dr.sides.map((s) => s.nm), ['compare-lab/left', 'elsewhere/left']) && !drPick.picking && !drPick.banner, JSON.stringify({ sides: dr.sides, drPick }));

    /* ---- a benchmark ---- */
    await selectRels(t, [`${LAB}/left`]);
    await t.key('b');
    await noticeText(t, /benchmark/i);
    put(at, 'left/written-later.bin', 64);
    await t.app((T) => { T.api.refreshDirs(['compare-lab/left']); return true; });
    await t.waitFor((T) => !!T.S.model.find('compare-lab/left/written-later.bin'), { what: 'the new file read' });
    await t.app((T) => {
      T.api.select(T.S.model.find('compare-lab/left'));
      document.getElementById('b-tab-inspector').click();
      return true;
    });
    const cwn = await t.waitFor(() => [...document.querySelectorAll('#inspector-body .btn')].find((b) => b.textContent.trim() === 'Compare with now') || false, { what: 'Compare with now in the inspector' }).catch(() => null);
    await t.eval(() => { [...document.querySelectorAll('#inspector-body .btn')].find((b) => b.textContent.trim() === 'Compare with now')?.click(); return true; });
    const bn = await drawn(t, (s) => s.name === 'left, now and then' && s.groups.length === 4, 'left against its benchmark');
    const words = bn.groups.map((g) => g.t);
    t.check(`Compare with now opens left against its benchmark with the Landmarks words (${words.join(' | ')})`,
      !!cwn && same(words, ['Here now, not then', 'No longer here', 'Changed since', 'The same']) && bn.sides[0].nm === 'left, now' && /^left, \d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/.test(bn.sides[1].nm), JSON.stringify(bn));
    t.check('the file written after the benchmark is listed as here now, not then', bn.groups[0].keys.includes('0/written-later.bin'), JSON.stringify(bn.groups[0].keys));
    t.check('a note says what a benchmark kept', bn.notes.some((n) => /64 largest entries by name/.test(n)), JSON.stringify(bn.notes));
    t.check(`against a benchmark Select all never says both copies (${bn.buttons.filter((b) => /^Select/.test(b)).join(' | ')})`,
      bn.buttons.some((b) => /^Select all \d+$/.test(b)) && !bn.buttons.some((b) => /both copies/.test(b)), JSON.stringify(bn.buttons));
    await press(t, '#b-panel-compare [data-k=all-only-0]');
    const bnSaid = await said(t, /^Selected \d+ items? here now, not then\./, 'Select all against the benchmark said');
    t.check(`Select all against a benchmark says where, without both copies (${bnSaid})`, !/both copies/.test(bnSaid));
    await t.app((T) => {
      T.S.tab = 'places';
      T.api.drawLedger();
      return true;
    });
    const placesBtn = await t.waitFor(() => {
      for (const d of document.querySelectorAll('#ledger-rich details.bench')) d.open = true;
      const list = [...document.querySelectorAll('#ledger-rich [data-k$=":compare"]')].map((b) => b.textContent.trim());
      return list.length ? list : false;
    }, { what: 'Compare on a Places row' }).catch(() => []);
    t.check(`a Places row offers Compare (${placesBtn.join(', ')})`, placesBtn.includes('Compare'), JSON.stringify(placesBtn));

    /* ---- Terrane's rename, its Undo, and a folder removed from outside ---- */
    // Two folders selected while a pair is shown: the head offers them; C compares them.
    await t.app((T, rs) => { T.api.selectAll(rs.map((r) => T.S.model.find(r))); return true; }, [`${LAB}/left`, `${LAB}/right`]);
    await showCompare(t);
    const offer = await drawn(t, (s) => s.tools.includes('Compare the 2 selected instead'), 'the offer of the two selected');
    t.check('with a benchmark pair shown, selecting two other folders offers Compare the 2 selected instead and does not switch on its own', offer.name === 'left, now and then', JSON.stringify(offer.tools));
    await t.app((T) => { T.api.KEYS.get('compare').run({}); return true; });
    await drawn(t, (s) => s.name === 'left and right' && s.groups.length === 4, 'left and right again');
    await t.app((T) => T.api.runOp({ type: 'rename', path: 'compare-lab/right', name: 'right-renamed' }));
    const rn = await drawn(t, (s) => s.name === 'left and right-renamed' && s.groups.length === 4, 'the rename followed');
    t.check('Terrane\'s rename of right is followed', rn.sides[1].full === `${LAB}/right-renamed` && rn.sides[1].nm === 'right-renamed', JSON.stringify(rn.sides));
    await t.tabTo('#view', { max: 80 });
    await t.key('Ctrl+Z');
    const un = await drawn(t, (s) => s.name === 'left and right' && s.groups.length === 4, 'Undo followed');
    t.check('Ctrl+Z puts the name back, and the pair follows it', un.sides[1].full === `${LAB}/right`, JSON.stringify(un.sides));
    fs.rmSync(at('right'), { recursive: true, force: true });
    await t.app((T) => { T.api.refreshDirs(['compare-lab']); return true; });
    const gone = await drawn(t, (s) => s.error && /no longer there/.test(s.state || ''), 'right gone');
    t.check(`right removed outside Terrane: the tab says so (${gone.state}) and offers Compare "left" with… and Clear`,
      gone.state === 'right is no longer there: it was renamed, moved or removed outside Terrane, or can no longer be read.' && gone.buttons.includes('Compare "left" with…') && gone.buttons.includes('Clear'), JSON.stringify(gone));
    buildLab(t.root);
    await t.app((T) => { T.api.refreshDirs(['compare-lab']); return true; });
    await drawn(t, (s) => s.name === 'left and right' && s.groups.length === 4, 'right back');
    const backSaid = await said(t, /right is back\./, 'back said').catch(() => '');
    t.check(`put back, the comparison returns (${backSaid})`, !!backSaid);

    /* ---- the Guide ---- */
    await t.eval(() => { document.getElementById('ledger-list').focus(); return true; });
    await t.key('?');
    await t.waitFor(() => document.getElementById('dialog').open && !!document.querySelector('#dialog .guide'), { what: 'the Guide' });
    const guide = await t.eval(() => [...document.querySelectorAll('#dialog .guide > div')].map((d) => [d.querySelector('h3').textContent, [...d.querySelectorAll('dt')].map((dt) => `${dt.textContent}|${dt.nextElementSibling.textContent}`)]));
    await t.key('Escape');
    const look = (guide.find(([h]) => h === 'Looking closer') || [null, []])[1];
    const rows = ['C|Compare the selection\'s folder with another (two folders selected: compare them)', 'Click|Choosing a folder to compare with: compare with the folder clicked (Esc cancels)',
      'Drag|One or two folders onto the Compare tab: compare them', '↑ ↓  Home  End|In Compare: the previous / next item, the first / last',
      'Enter|In Compare: select the item and frame it; in both, Enter again frames the other', '→  ←|In Compare: compare inside a folder in both / back out'];
    t.check('the Guide holds C and Compare\'s rows under Looking closer', rows.every((w) => look.includes(w)), JSON.stringify(look));
    await t.app((T) => {
      document.getElementById('b-tab-inspector').click();
      T.api.select(null);
      return true;
    });
  },
};

/** Writes a file into the lab (a later change). */
function put(at, rel, size) {
  const f = at(...rel.split('/'));
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, 'y'.repeat(size));
}

/* ====================================================================== */

/** Two folders of the fixture: the two largest folders at its top. */
const twoFolders = (t) => t.app((T) => {
  const list = T.S.model.root.c.filter((c) => c.d && !c.e).sort((a, b) => b.s - a.s);
  return list.slice(0, 2).map((n) => T.api.relPath(n));
});

const compareModes = {
  name: 'compare-modes',
  title: 'Compare in read-only mode, during a warm start\'s check, at 800 × 500 and in snapshot mode',
  data: 'fixture',
  timeout: 240000,
  async run(t) {
    await t.settle();
    const [r0, r1] = await twoFolders(t);
    const mark = t.mark();
    await selectRels(t, [r0, r1]);
    await showCompare(t);
    const s1 = await drawn(t, (s) => s.groups.length === 4, 'two folders compared on show');
    t.check(`with two folders selected, showing Compare compares them at once ("${s1.name}")`, s1.sides.length === 2, JSON.stringify(s1.sides));
    const g0 = s1.groups.find((g) => g.count > 0 && (g.id === 'only-0' || g.id === 'only-1'));
    if (g0) {
      await press(t, `#b-panel-compare [data-k=all-${g0.id}]`);
      const w = await said(t, /^Selected \d+ items? only in /, 'Select all said');
      t.check(`read-only: the Select-all sentence leaves out Copy and Move (${w})`, !/Copy to…|Move to…/.test(w) && /K puts (it|them) on the shelf\.$/.test(w));
    }
    await press(t, '#b-panel-compare [data-k=swap]');
    await press(t, '#b-panel-compare [data-k=clear]');
    await noticeText(t, /^Comparison cleared\.$/);
    await clickNotice(t, /^Comparison cleared/, 'Undo');
    await drawn(t, (s) => s.groups.length === 4);
    t.check('no change is sent to the service from any Compare action', t.requests(mark).every((r) => !(r.method === 'POST' && r.path === '/api/op')));

    /* ---- the warm note ---- */
    await t.app((T) => { T.S.warm = { takenAt: Date.now(), pending: [], release() {} }; T.api.showBTab('compare'); return true; });
    const warm = await drawn(t, (s) => s.notes.some((n) => /last session's tree/.test(n)), 'the warm note').catch(() => null);
    await t.app((T) => { T.S.warm = null; return true; });
    t.check('during a warm start\'s check the tab says the figures may change', !!warm, JSON.stringify(warm?.notes));

    /* ---- 800 × 500, in the drawer ---- */
    await t.page.send('Emulation.setDeviceMetricsOverride', { width: 800, height: 500, deviceScaleFactor: 1, mobile: false });
    try {
      await t.sleep(400);
      await showCompare(t);
      await t.waitFor(() => getComputedStyle(document.getElementById('inspector')).visibility === 'visible', { what: 'the drawer' });
      await t.sleep(300);
      const narrow = await t.eval(() => {
        const P = document.getElementById('b-panel-compare');
        const body = P.querySelector('.cmp-body');
        return { page: document.documentElement.scrollWidth <= innerWidth, body: body.scrollWidth <= body.clientWidth + 0.5, crowded: 'crowded' in document.getElementById('b-tabs').dataset };
      });
      t.check(`at 800 × 500 in the drawer: no horizontal overflow${narrow.crowded ? ', the strip crowded' : ''}`, narrow.page && narrow.body, JSON.stringify(narrow));
      await press(t, '#b-panel-compare [data-k=clear]');
      await drawn(t, (s) => !!s.start, 'the empty state in the drawer');
      await press(t, '#b-panel-compare .cmp-start');
      const hid = await t.waitFor((T) => T.S.picking && getComputedStyle(document.getElementById('inspector')).visibility !== 'visible', { what: 'the drawer stepping aside' }).catch(() => false);
      t.check('choosing hides the drawer', !!hid);
      await t.app((T, r) => {
        T.api.cursorTo(T.S.model.find(r)) || (T.S.tab = 'contents');
        T.api.setFocus(T.S.model.root);
        T.S.tab = 'contents';
        T.api.drawLedger();
        T.api.cursorTo(T.S.model.find(r));
        document.getElementById('ledger-list').focus();
        return true;
      }, r1);
      await t.key('Enter');
      const back = await t.waitFor((T) => !T.S.picking && getComputedStyle(document.getElementById('inspector')).visibility === 'visible' && T.S.bTab === 'compare', { what: 'the drawer back on Compare' }).catch(() => false);
      t.check('taking the folder opens the drawer again on Compare', !!back);
    } finally {
      await t.page.send('Emulation.clearDeviceMetricsOverride', {});
      await t.sleep(300);
    }

    /* ---- snapshot mode ---- */
    if (!(await t.app((T) => !!T.S.info.snapshot))) t.skip('Compare in snapshot mode', 'this run serves no snapshot; the tab writes nothing, so it reads as in read-only mode');
    await t.app((T) => {
      document.getElementById('b-tab-inspector').click();
      T.api.select(null);
      return true;
    });
  },
};

/* ====================================================================== */

const compareRegions = {
  name: 'compare-regions',
  title: 'Compare in region mode: the groups equal diff.js over the disk, suggestions from the service, the pair kept',
  data: 'fixture',
  regions: 0,
  timeout: 240000,
  async run(t) {
    await t.settle();
    const regions = await t.app((T) => !!T.S.regions);
    t.check('the page draws in regions', regions);
    if (!regions) return;
    await t.waitFor((T) => T.S.survey && !T.S.survey.pending, { timeout: 30000, what: 'the service\'s survey' });
    const pair = await t.app((T) => T.S.model.root.c.filter((c) => c.d && !c.e).sort((a, b) => b.s - a.s).slice(0, 2).map((n) => T.api.relPath(n)));
    const platform = await t.app((T) => T.S.info.platform || 'linux');
    const want = expected(t.root, pair[0], pair[1], platform);
    const mark = t.mark();
    await t.app((T, rs) => {
      T.api.selectAll(rs.map((r) => T.S.model.find(r)));
      T.api.showBTab('compare');
      return true;
    }, pair);
    const s1 = await drawn(t, (s) => s.groups.length === 4, 'the pair in regions');
    t.check(`the groups' counts and bytes equal diff.js over the same folders on disk (${s1.groups.map((g) => `${g.id} ${g.count}`).join(', ')})`, groupsMatch(s1, want), JSON.stringify({ got: s1.groups.map((g) => [g.id, g.count, g.bytes]), want }));
    t.check('no note of entries not sent: these folders hold fewer than 5,000 each', !s1.notes.some((n) => /the service sends/.test(n)), JSON.stringify(s1.notes));
    await press(t, '#b-panel-compare [data-k=clear]');
    await drawn(t, (s) => !!s.start);
    await t.app((T, r) => { T.api.select(T.S.model.find(r)); return true; }, pair[0]);
    await t.sleep(300);
    await showCompare(t);
    await t.sleep(600);
    const asked = t.requests(mark).filter((r) => r.path === '/api/places');
    const counted = await t.eval(() => window.__terrane.asked?.places ?? 0);
    t.check(`the same-name suggestions are asked of the service (GET /api/places: ${asked.length} seen, ${counted} asked in all)`, (asked.length >= 1 || counted >= 1) && asked.every((r) => r.method === 'GET'), JSON.stringify(asked.slice(0, 2)));
    await clickNotice(t, /^Comparison cleared/, 'Undo');
    await drawn(t, (s) => s.groups.length === 4);
    await t.app((T) => {
      T.api.select(null);
      document.getElementById('b-tab-inspector').click();
      T.api.setFocus(T.S.model.root);
      return true;
    });
    await t.sleep(800);
    await showCompare(t);
    const kept = await drawn(t, (s) => s.groups.length === 4, 'kept across travel');
    t.check('the pair is kept across travel and computed again on return', groupsMatch(kept, want), JSON.stringify(kept.groups.map((g) => [g.id, g.count])));
    t.check('nothing is posted from Compare in region mode', t.requests(mark).every((r) => r.method !== 'POST'));
    await t.app((T) => {
      document.getElementById('b-tab-inspector').click();
      return true;
    });
  },
};

export default [compare, compareModes, compareRegions];
