/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Shelf Scenarios (Terrane Edition - v1.0)
 *     - File Name: shelf.mjs
 *     - Relative Path: tools/ui-scenarios/shelf.mjs
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
 *     Walks the right panel's Shelf tab end to end in the real page, by
 *     keyboard where a person would, in both passes: finding it, what it
 *     says first, gathering from the ledger, the world's menu, a drag,
 *     Findings and Preview, looking at what was gathered, leaving and
 *     coming back, acting on it all at once with one Undo, and the hard
 *     cases (read-only, snapshot, junk kept in the browser, storage that
 *     refuses, the cap, region mode, a folder deleted from outside, a
 *     narrow window).
 *
 * ✒ Key Features:
 *     - shelf (writes): the strip reads Inspector, Preview, Cleanup, Shelf
 *       with no count; Ctrl+K "shelf" with the reasons; the empty state's
 *       words and buttons, focus on the head; K in the list and K again,
 *       the world's Add to shelf (hint K), a drag onto the tab, Add all
 *       from Findings, K in Preview; the count on the label; no live
 *       region inside the tab; rows newest first; ↓ ↓ Enter, Space, Del;
 *       the Inspector, ] twice and a reload; Move to… placed with Enter on
 *       dest as one change, the rows following and back on Ctrl+Z; Rename…
 *       and its Undo; Copy to…; Export; Show; a folder deleted from
 *       outside; Clear and Put back
 *     - shelf-modes (read-only): Move, Copy and Rename unavailable with
 *       the reason, everything else working, no POST; snapshot mode; junk
 *       kept in the browser; storage that refuses; Add all over the
 *       3,000-file fixture cut at 1,000; the Guide's rows and K on the
 *       menu; the drawer at 800 × 500
 *     - shelf-regions (threshold 0, read-only): Add all keeps refs by
 *       path, a row not held shows its figures unmarked; Show resolves the
 *       items and selects them; a stored path that is nowhere is marked
 *       no longer there; moves unavailable
 *
 * ✒ Usage Instructions:
 *     node tools/ui-check.mjs shelf --no-shots --port 5300
 *     node tools/ui-check.mjs shelf-modes --no-shots --port 5300
 *     node tools/ui-check.mjs shelf-regions --no-shots --port 5300
 *
 * ✒ Other Important Information:
 *     - Dependencies: tools/ui-check.mjs (the context t); the fixture's
 *       3,000 random files
 *     - Compatible platforms: Node.js 22.5+
 * ----------------------------------------------------------------------------
 */

import fs from 'node:fs';
import path from 'node:path';

const LAB = 'shelf-lab';
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** The tab as it stands, read in the page. */
const sh = () => {
  const P = document.getElementById('b-panel-shelf');
  const q = (s) => P?.querySelector(s);
  const vis = (e) => !!e && !e.closest('[hidden]');
  const a = document.activeElement;
  const btn = (b) => (b ? { text: b.textContent.trim(), off: b.getAttribute('aria-disabled') === 'true', title: b.title } : null);
  const tab = document.getElementById('b-tab-shelf');
  return {
    shown: !!P && !P.hidden && getComputedStyle(document.getElementById('inspector')).visibility === 'visible',
    count: P?.dataset.count ?? null,
    label: tab?.querySelector('.count')?.textContent ?? null,
    kind: q('.insp-kind')?.textContent ?? null,
    name: q('.insp-name')?.textContent ?? null,
    facts: vis(q('.sh-facts')) ? q('.sh-facts').textContent : null,
    kept: vis(q('.sh-kept')) ? q('.sh-kept').textContent : null,
    empty: vis(q('.sh-empty')) ? q('.sh-empty .sh-note').textContent : null,
    ways: [...(P?.querySelectorAll('.sh-ways li') || [])].map((l) => l.textContent),
    adds: [...(P?.querySelectorAll('.sh-adds .btn') || [])].filter(vis).map((b) => b.textContent),
    grid: [...(P?.querySelectorAll('.sh-actions .btn') || [])].filter(vis).map(btn),
    why: vis(q('.actions-why')) ? q('.actions-why').textContent : null,
    state: vis(q('.sh-state')) ? q('.sh-state-text').textContent : null,
    more: vis(q('.sh-more')) ? q('.sh-more .btn').textContent : null,
    rows: [...(P?.querySelectorAll('.sh-row') || [])].map((r) => ({
      rel: r.dataset.rel, name: r.querySelector('.nm').textContent, path: r.querySelector('.path').textContent, fig: r.querySelector('.fig').textContent,
      gone: r.classList.contains('is-gone'), sel: r.classList.contains('is-selected'), tab: r.querySelector('.sh-item').tabIndex, title: r.querySelector('.sh-item').title,
    })),
    live: [...(P?.querySelectorAll('[aria-live], [role=status], [role=alert]') || [])].length,
    focus: a === q('.insp-name') ? 'name' : a?.closest?.('.sh-row') ? `row:${a.closest('.sh-row').dataset.rel}` : P?.contains(a) ? (a.dataset?.k || a.className || a.tagName) : (a?.id || a?.dataset?.btab || a?.className || 'body'),
  };
};

/**
 * Waits until the tab is shown and fn(state) holds; resolves to the state.
 * fn runs in the page from its source, so it closes over nothing: a value
 * from here is written into it (new Function).
 */
async function drawn(t, fn = () => true, what = 'the Shelf') {
  try {
    return await t.waitFor(`() => { const st = (${sh})(); return st.shown && (${fn})(st) && st; }`, { timeout: 15000, what });
  } catch (err) {
    const st = await t.eval(`(${sh})()`).catch(() => null);
    throw new Error(`${err.message}; the tab: ${JSON.stringify(st && { ...st, rows: st.rows.slice(0, 4), n: st.rows.length })}`.slice(0, 1600));
  }
}
/** The tab's state now, shown or not. */
const now = (t) => t.eval(`(${sh})()`);
/** The live region, once it says something matching re. */
const said = (t, re, what = String(re)) => t.waitFor(`() => { const l = document.getElementById('live').textContent; return ${re}.test(l) && l; }`, { timeout: 10000, what });

/** Opens the palette and types query; resolves to its options as "label|detail|why". */
async function palette(t, query, fn = (o) => o.length > 0) {
  await t.key('Ctrl+K');
  await t.waitFor(() => document.getElementById('dialog').open && !!document.querySelector('.palette-input'), { what: 'the palette' });
  await t.type(query);
  return t.waitFor(`() => { const o = [...document.querySelectorAll('.palette-option')].map((x) => [x.querySelector('.pal-label')?.textContent, x.querySelector('.pal-detail')?.textContent, x.querySelector('.pal-why')?.textContent ?? ''].join('|')); return (${fn})(o) && o; }`,
    { what: `the palette's options for "${query}"` });
}

/** Selects rel in the world, focus on the world, and opens its menu with Shift+F10; chooses an item or closes it. */
async function worldMenu(t, rel, choose = null) {
  await t.app((T, r) => {
    const n = r ? T.S.model.find(r) : null;
    T.api.select(n);
    document.getElementById('view').focus();
    return true;
  }, rel);
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

/** Selects nodes by path in the ledger (Contents of the first one's folder), focus on the list. */
async function selectRels(t, rels) {
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
  await t.settle({ quiet: 200 });
  await t.app((T, rs) => {
    const nodes = rs.map((r) => T.S.model.find(r));
    T.S.tab = 'contents';
    T.api.drawLedger();
    T.api.selectAll(nodes, nodes[0]);
    T.api.cursorTo(nodes[0]);
    document.getElementById('ledger-list').focus();
    return true;
  }, rels);
}

/** While placing: Findings lists shelf-lab/dest, the cursor on it, focus on the list (Enter then places there). */
async function toDest(t) {
  await t.app((T) => {
    T.api.setQuery('in:shelf-lab dest');
    T.S.tab = 'findings';
    T.api.drawLedger();
    return true;
  });
  await t.waitFor((T) => T.S.search?.list.some((n) => T.api.relPath(n) === 'shelf-lab/dest'), { timeout: 10000, what: 'dest in Findings' });
  await t.app((T) => {
    T.S.tab = 'findings';
    T.api.drawLedger();
    T.api.cursorTo(T.S.search.list.find((n) => T.api.relPath(n) === 'shelf-lab/dest'));
    document.getElementById('ledger-list').focus();
    return true;
  });
}

const showShelf = (t) => t.app((T) => { T.api.showBTab('shelf'); return true; });
const journal = (t) => t.app(async (T) => (await T.api.get('journal')).journal.length);
const noticeText = (t, re) => t.waitFor(`() => [...document.querySelectorAll('#notices .notice-text')].map((n) => n.textContent).find((x) => ${re}.test(x)) || false`, { timeout: 10000, what: `a notice like ${re}` });
const clickNotice = (t, re, label) => t.eval(`(() => {
  const n = [...document.querySelectorAll('#notices .notice')].reverse().find((x) => ${re}.test(x.textContent));
  const b = n && [...n.querySelectorAll('.btn')].find((x) => x.textContent === ${JSON.stringify(label)});
  if (b) b.click();
  return !!b;
})()`);

/** Lines an element's visible text takes: a screen reader's words (.sr) are not drawn, so not counted. */
const LINES = `(e) => {
  const tops = new Set();
  const w = document.createTreeWalker(e, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    if (!n.nodeValue.trim() || n.parentElement.closest('.sr')) continue;
    const r = document.createRange();
    r.selectNodeContents(n);
    for (const x of r.getClientRects()) if (x.width > 0) tops.add(Math.round(x.top));
  }
  return tops.size;
}`;

/** The lab: three files in a, one folder c, three files under b, and dest. */
function buildLab(root) {
  const at = (...p) => path.join(root, LAB, ...p);
  const put = (rel, data) => {
    const f = at(...rel.split('/'));
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, data);
  };
  put('a/alpha.txt', 'alpha\n'.repeat(400));
  put('a/beta.md', '# beta\n');
  put('a/gamma.json', '{"gamma":1}\n');
  put('c/inside.md', 'inside c\n');
  put('b/other.txt', 'other\n'.repeat(20));
  put('b/deep/delta.txt', 'delta\n'.repeat(30));
  put('b/deep/epsilon.log', 'epsilon\n');
  put('dest/placeholder.md', 'here\n');
  return at;
}

/* ====================================================================== */

const shelf = {
  name: 'shelf',
  title: 'Shelf: the right panel\'s fourth tab, gathered into, kept, acted on with one Undo, and left (writes)',
  data: 'fixture',
  write: true,
  timeout: 300000,
  async run(t) {
    await t.settle();
    const at = buildLab(t.root);
    const exists = (rel) => fs.existsSync(at(...rel.split('/')));
    await t.app((T) => { T.api.refreshDirs(['']); return true; });
    await t.waitFor((T) => !!T.S.model.find('shelf-lab/b/deep/epsilon.log') && !!T.S.model.find('shelf-lab/dest') && !T.S.surveyTimer && !!T.S.survey, { timeout: 20000, what: 'the lab read in' });
    await t.settle();

    /* ---- finding it ---- */
    const s0 = await t.app(() => ({
      tabs: [...document.querySelectorAll('#b-tabs [role=tab]')].map((b) => `${b.dataset.btab}:${b.textContent}`),
      icon: document.querySelector('#b-tab-shelf use')?.getAttribute('href').split('#')[1],
      title: document.getElementById('b-tab-shelf')?.title,
      mounted: 'mounted' in (document.getElementById('b-panel-shelf')?.dataset || {}),
    }));
    t.check('the right panel\'s strip reads Inspector, Preview, Cleanup, Shelf, with no count, the inbox icon and its title',
      same(s0.tabs, ['inspector:Inspector', 'preview:Preview', 'cleanup:Cleanup', 'shelf:Shelf']) && s0.icon === 'inbox' && /^Shelf: files and folders gathered from anywhere/.test(s0.title || '') && !s0.mounted, JSON.stringify(s0));
    await t.eval(() => { document.getElementById('ledger-list').focus(); return true; });
    const opts = await palette(t, 'shelf', (o) => o.some((x) => x.startsWith('Show Shelf|')) && o.some((x) => x.startsWith('Clear the shelf|')) && !o.some((x) => x.startsWith('Drop to eye level|')));
    const opt = (label) => opts.find((x) => x.startsWith(`${label}|`)) || '';
    t.check(`Ctrl+K "shelf" lists Show Shelf first and the Shelf's commands, each unavailable with its reason while the shelf is empty (${opt('Move the shelf\'s items to…')})`,
      opts[0] === 'Show Shelf|Right panel|' && /Unavailable: the shelf is empty$/.test(opt('Move the shelf\'s items to…')) && /Unavailable: the shelf is empty$/.test(opt('Clear the shelf')), JSON.stringify(opts));
    await t.key('Escape');
    await t.waitFor(() => !document.getElementById('dialog').open);
    const adds = await palette(t, 'to the shelf', (o) => o.some((x) => x.startsWith('Add all results to the shelf|')) && o.some((x) => x.startsWith('Add the selection to the shelf|')) && !o.some((x) => x.startsWith('Drop to eye level|')));
    const addOpt = (label) => adds.find((x) => x.startsWith(`${label}|`)) || '';
    t.check(`and its ways of adding say why not yet (${addOpt('Add all results to the shelf')}; ${addOpt('Add the selection to the shelf')})`,
      /Unavailable: there is no search in Find$/.test(addOpt('Add all results to the shelf')) && /Unavailable: nothing is selected$/.test(addOpt('Add the selection to the shelf')), JSON.stringify(adds));
    await t.key('Escape');
    await t.waitFor(() => !document.getElementById('dialog').open);
    await palette(t, 'show shelf', (o) => o[0]?.startsWith('Show Shelf|'));
    await t.key('Enter');
    const e0 = await drawn(t, (s) => s.focus === 'name', 'the Shelf, focus on its head');
    t.check(`Show Shelf opens the tab with focus on its head, "${e0.name}"`, e0.name === 'Nothing on the shelf yet' && e0.kind === 'Shelf', JSON.stringify(e0));
    t.check('the empty state says what the shelf is and lists the four ways to add things, K among them',
      /^Gather files and folders here from anywhere/.test(e0.empty || '') && /kept in this browser for this directory/.test(e0.empty) && e0.ways.length === 4 && /press K/.test(e0.ways[0]) && /Shelf tab/.test(e0.ways[1]) && /Add all to the shelf/.test(e0.ways[2]) && /K in Preview/.test(e0.ways[3])
      && e0.grid.length === 0 && e0.rows.length === 0 && e0.adds.length === 0, JSON.stringify(e0));
    await t.app((T) => {
      T.api.setFocus(T.S.model.find('shelf-lab/a'));
      const a = T.S.model.find('shelf-lab/a');
      T.api.selectAll(a.c.filter((c) => !c.d).slice(0, 3));
      return true;
    });
    await t.settle();
    const here = await t.app((T) => T.S.focus.n);
    const e1 = await drawn(t, new Function('s', `return s.adds.length === 2 && s.adds[1] === ${JSON.stringify(`Add ${here}`)};`), 'the empty state\'s buttons');
    t.check(`with three selected and the location in ${here}, the empty state offers ${e1.adds.join(' and ')}`, same(e1.adds, ['Add the selection (3 items)', `Add ${here}`]), JSON.stringify(e1.adds));

    /* ---- gathering: K in the list, and K again ---- */
    await selectRels(t, ['shelf-lab/a/alpha.txt']);
    await t.key('k');
    const k1 = await said(t, /^alpha\.txt is on the shelf \(1 item\)\. K again takes it off\.$/, 'K said');
    const c1 = await drawn(t, (s) => s.label === '1');
    t.check(`K on the selection puts it on the shelf and says so (${k1}); the strip reads SHELF 1`, c1.rows.length === 1 && c1.rows[0].name === 'alpha.txt', JSON.stringify(c1.rows));
    await t.key('k');
    const k2 = await said(t, /^Took alpha\.txt off the shelf \(0 items\)\. It stays where it is on disk\.$/, 'K again said');
    const c2 = await now(t);
    t.check(`K again takes it off (${k2}), the count goes from the label, and the file is still on disk`, c2.label === null && exists('a/alpha.txt'), JSON.stringify(c2.label));
    await t.key('k');
    await said(t, /^alpha\.txt is on the shelf \(1 item\)/);
    const inspOn = await t.app(() => {
      document.getElementById('b-tab-inspector').click();
      return [...document.querySelectorAll('#inspector-body .shelf-action .btn')].map((b) => `${b.textContent}|${b.title}`);
    });
    t.check(`while on the Inspector the count stays (${(await now(t)).label}), and the Inspector offers ${inspOn[0]}`, (await now(t)).label === '1' && same(inspOn, ['Take off the shelf|Take off the shelf (K)']), JSON.stringify(inspOn));

    /* ---- the world's menu ---- */
    const menu = await worldMenu(t, 'shelf-lab/c', 'Add to shelf');
    const add = menu.find((m) => m.label === 'Add to shelf');
    const m1 = await said(t, /^c is on the shelf \(2 items\)/, 'the menu said');
    t.check(`the world's menu offers Add to shelf with K as its hint, and choosing it says so (${m1})`, add && add.hint === 'K' && !add.off, JSON.stringify(menu));
    const menu2 = await worldMenu(t, 'shelf-lab/c');
    t.check('its menu now says Take off the shelf', menu2.some((m) => m.label === 'Take off the shelf' && m.hint === 'K'), JSON.stringify(menu2.map((m) => m.label)));
    await t.app((T) => { T.api.setFocus(T.S.model.root); return true; });
    await t.settle();
    const rootMenu = await worldMenu(t, null);
    const rootItem = rootMenu.find((m) => /folder to the shelf|folder off the shelf/.test(m.label));
    t.check(`at the root the ground's menu offers Add this folder to the shelf, unavailable: ${rootItem?.why}`, rootItem?.off && rootItem.why === 'the authorized root', JSON.stringify(rootItem));

    /* ---- a drag from the ledger onto the tab ---- */
    await selectRels(t, ['shelf-lab/a/beta.md', 'shelf-lab/a/gamma.json']);
    const drag = await t.eval(() => {
      const row = [...document.querySelectorAll('#ledger-list .row')].find((r) => r.title === 'beta.md');
      if (!row) return { row: false };
      const dt = new DataTransfer();
      row.dispatchEvent(new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer: dt }));
      const tab = document.getElementById('b-tab-shelf');
      const over = new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt });
      tab.dispatchEvent(over);
      const marked = tab.classList.contains('is-drop');
      tab.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));
      row.dispatchEvent(new DragEvent('dragend', { bubbles: true, dataTransfer: dt }));
      return { row: true, draggable: row.draggable, prevented: over.defaultPrevented, marked, after: tab.classList.contains('is-drop'), bTab: window.__terrane.S.bTab };
    });
    const d1 = await said(t, /^Put 2 items on the shelf \(4 items\)\.$/, 'the drop said');
    t.check(`two ledger rows dragged onto the Shelf tab: it is a drop target while they are over it, and the panel stays where it was (${d1})`,
      drag.row && drag.draggable && drag.prevented && drag.marked && !drag.after && drag.bTab === 'inspector' && (await now(t)).label === '4', JSON.stringify(drag));

    /* ---- Add all from Findings ---- */
    await t.app((T) => {
      T.api.setQuery('in:shelf-lab ext:txt');
      T.S.tab = 'findings';
      T.api.drawLedger();
      return true;
    });
    await t.waitFor((T) => T.S.search?.list.length === 3 && !!document.querySelector('#ledger-sub [data-k=shelf-all]'), { timeout: 10000, what: 'Findings with the Shelf tool' });
    const tool = await t.eval(() => {
      const b = document.querySelector('#ledger-sub [data-k=shelf-all]');
      return { label: b.getAttribute('aria-label'), title: b.title, icon: b.querySelector('use')?.getAttribute('href').split('#')[1] };
    });
    await press(t, '#ledger-sub [data-k=shelf-all]');
    const f1 = await said(t, /^Put 2 items on the shelf \(6 items\); 1 was already on it\.$/, 'Add all said');
    t.check(`Add all to the shelf on the Findings count row adds every match and says which were there already (${f1})`,
      tool.label === 'Add all to the shelf' && /up to 1,000/.test(tool.title) && tool.icon === 'inbox', JSON.stringify(tool));
    await t.app((T) => {
      T.api.setQuery('');
      return true;
    });

    /* ---- K in Preview ---- */
    await t.app((T) => {
      T.api.select(T.S.model.find('shelf-lab/b/deep/epsilon.log'));
      T.api.showBTab('preview');
      return true;
    });
    await t.waitFor(() => document.querySelector('#b-panel-preview .pv-pane')?.dataset.shown === 'epsilon.log', { timeout: 10000, what: 'Preview of epsilon.log' });
    await press(t, '#b-panel-preview .pv-pane', 'k');
    const p1 = await said(t, /^epsilon\.log is on the shelf \(7 items\)/, 'K in Preview said');
    t.check(`K in Preview's pane puts its item on the shelf (${p1})`, (await now(t)).label === '7');

    /* ---- looking at it ---- */
    await showShelf(t);
    const v = await drawn(t, (s) => s.rows.length === 7);
    t.check(`the head reads ${v.kind} / ${v.name}, with its facts (${v.facts}) and the note that it is kept here`,
      v.kind === 'On the shelf' && v.name === '7 items' && /^[\d.,]+ [KMG]?B · 6 files · 1 folder · from 4 folders$/.test(v.facts || '') && /^Kept in this browser for .+\. Taking items off the shelf never changes the disk\.$/.test(v.kept || ''), JSON.stringify(v));
    t.check('rows are newest first: epsilon.log at the top, alpha.txt at the foot', v.rows[0].name === 'epsilon.log' && v.rows.at(-1).name === 'alpha.txt', JSON.stringify(v.rows.map((r) => r.name)));
    const ep = v.rows[0];
    t.check(`each row shows its name, its folder and kind, and its size (${ep.path}, ${ep.fig}); c reads "shelf-lab · Folder"`,
      ep.path === 'shelf-lab/b/deep · Documents' && /B$/.test(ep.fig) && v.rows.find((r) => r.name === 'c')?.path === 'shelf-lab · Folder', JSON.stringify(v.rows));
    t.check('the list is one Tab stop, nothing in the tab is a live region', v.rows.filter((r) => r.tab === 0).length === 1 && v.live === 0, JSON.stringify(v.rows.map((r) => r.tab)));
    t.check('the actions sit in the grid: Show in the world, Copy paths, Move to…, Copy to…, Rename…, Export CSV, none unavailable',
      same(v.grid.map((b) => b.text), ['Show in the world', 'Copy paths', 'Move to…', 'Copy to…', 'Rename…', 'Export CSV']) && v.grid.every((b) => !b.off) && v.why === null, JSON.stringify(v.grid));

    // ↓ ↓ Enter: the third row selected and framed.
    await press(t, '#b-panel-shelf .sh-item[tabindex="0"]', 'End');
    const end = await t.eval(() => document.activeElement?.closest('.sh-row')?.dataset.rel);
    await t.key('Home');
    await t.key('ArrowDown');
    await t.key('ArrowDown');
    const third = v.rows[2].rel;
    const f3 = await t.eval(() => document.activeElement?.closest('.sh-row')?.dataset.rel);
    t.check(`the list's one Tab stop is its first row; End reaches the last, Home the first, ↓ ↓ the third (${f3})`, f3 === third && end === v.rows.at(-1).rel, JSON.stringify({ f3, third, end }));
    await t.key('Enter');
    const framed = await t.waitFor((T, r) => T.S.primary && T.api.relPath(T.S.primary) === r && { focus: T.api.relPath(T.S.focus), flight: !!T.S.view.flight, sel: T.S.sel.size }, { args: [third], timeout: 10000, what: 'the third row selected' });
    if (!t.gl) await t.waitFor((T, r) => T.api.relPath(T.S.focus) === r.slice(0, r.lastIndexOf('/')), { args: [third], timeout: 10000, what: 'the location at its folder' });
    t.check(`↓ ↓ reach the third row (${f3}) and Enter selects it and frames it in the world${t.gl ? '' : ', the location moving to its folder'}`, f3 === third && framed.sel === 1, JSON.stringify(framed));
    await t.settle();
    // Space: the item added to the selection.
    await t.eval(() => { (document.activeElement?.closest('#b-panel-shelf') ? document.activeElement : document.querySelector('#b-panel-shelf .sh-item[tabindex="0"]')).focus(); return true; });
    await t.key('ArrowDown');
    const fourth = v.rows[3].rel;
    await t.key('Space');
    const sp = await said(t, /added to the selection \(2 selected\)\.$/, 'Space said');
    const selRow = await drawn(t, new Function('s', `return !!s.rows.find((r) => r.rel === ${JSON.stringify(fourth)})?.sel;`));
    t.check(`Space adds the item to the selection (${sp}), and its row is marked`, !!selRow, JSON.stringify(sp));
    // Del: off the shelf, focus on the next row.
    const fifth = v.rows[4].rel;
    await t.key('Delete');
    const del = await said(t, /^Took .+ off the shelf \(6 items\)\. It stays where it is on disk\.$/, 'Del said');
    const afterDel = await drawn(t, (s) => s.rows.length === 6);
    t.check(`Del takes it off the shelf (${del}), focus moves to the next row, and the file stays on disk`,
      afterDel.focus === `row:${fifth}` && exists(fourth.slice(LAB.length + 1)) && (await t.app((T) => T.S.bTab)) === 'shelf', JSON.stringify({ focus: afterDel.focus, fifth }));
    // Back on, by K on the selection.
    await t.app((T, r) => {
      T.api.select(T.S.model.find(r));
      document.getElementById('ledger-list').focus();
      return true;
    }, fourth);
    await t.key('k');
    await drawn(t, (s) => s.rows.length === 7);
    const order = (await now(t)).rows.map((r) => r.rel);

    /* ---- leaving and coming back ---- */
    await t.app(() => { document.getElementById('b-tab-inspector').click(); return true; });
    t.check('on the Inspector the strip still reads SHELF 7', (await now(t)).label === '7');
    await t.eval(() => { document.getElementById('ledger-list').focus(); return true; });
    await t.key(']');
    await t.key(']');
    await t.reload();
    const back = await t.app(() => document.querySelector('#b-tab-shelf .count')?.textContent ?? null);
    await showShelf(t);
    const r1 = await drawn(t, (s) => s.rows.length === 7);
    t.check(`after ] twice and a reload the strip reads SHELF ${back} and the tab lists the same items in the same order`, back === '7' && same(r1.rows.map((r) => r.rel), order), JSON.stringify({ back, rows: r1.rows.map((r) => r.rel), order }));

    /* ---- Move to…, one change, followed, and back on Ctrl+Z ---- */
    const j0 = await journal(t);
    await press(t, '#b-panel-shelf [data-k=move]');
    const placing = await t.waitFor((T) => T.S.placing && { n: T.S.sel.size, text: document.getElementById('placing-text').textContent }, { timeout: 10000, what: 'the placing bar' });
    const moveSaid = await said(t, /^Moving 7 items: click a folder in the world/, 'Move said');
    t.check(`Move to… selects the items and starts placing: "${placing.text}"`, placing.n === 7 && /^Move 7 items: click a folder in the world, or travel to one and place it there\.$/.test(placing.text), JSON.stringify({ placing, moveSaid }));
    await toDest(t);
    await t.key('Enter');
    await t.poll(() => exists('dest/alpha.txt') && exists('dest/epsilon.log') && exists('dest/c/inside.md'), { timeout: 20000 });
    await t.app((T) => { T.api.setQuery(''); return true; });
    const moved = ['alpha.txt', 'beta.md', 'gamma.json', 'c', 'other.txt', 'delta.txt', 'epsilon.log'];
    const j1 = await journal(t);
    t.check(`Enter on dest moves every item, checked on disk, as one journal entry (${j1 - j0})`, moved.every((n) => exists(`dest/${n}`)) && !exists('a/alpha.txt') && !exists('b/deep/delta.txt') && j1 === j0 + 1, JSON.stringify({ j0, j1 }));
    const fol = await drawn(t, (s) => s.rows.length === 7 && s.rows.filter((r) => r.rel.startsWith('shelf-lab/dest/')).length === 7 && s.rows.every((r) => !r.gone), 'the rows following to dest');
    t.check(`the rows follow by path: "${fol.rows.find((r) => r.name === 'alpha.txt')?.path}", none marked gone`, fol.rows.find((r) => r.name === 'alpha.txt')?.path === 'shelf-lab/dest · Documents', JSON.stringify(fol.rows.map((r) => r.path)));
    await t.eval(() => { document.getElementById('ledger-list').focus(); return true; });
    await t.key('Ctrl+Z');
    await t.poll(() => exists('a/alpha.txt') && exists('b/deep/delta.txt') && exists('c/inside.md') && !exists('dest/alpha.txt'), { timeout: 20000 });
    const unm = await drawn(t, (s) => s.rows.length === 7 && s.rows.every((r) => !r.rel.startsWith('shelf-lab/dest/')) && s.rows.every((r) => !r.gone), 'the rows following back');
    t.check('Ctrl+Z puts everything back on disk, and the rows follow back', same(unm.rows.map((r) => r.rel).sort(), [...order].sort()), JSON.stringify(unm.rows.map((r) => r.rel)));

    /* ---- Rename…, one change, followed, Undo ---- */
    const j2 = await journal(t);
    await press(t, '#b-panel-shelf [data-k=rename]');
    const sheet = await t.waitFor(() => {
      const d = document.getElementById('dialog');
      return d.open && d.classList.contains('is-rename') && { h2: d.querySelector('h2')?.textContent, focus: document.activeElement?.name };
    }, { timeout: 10000, what: 'the batch rename' });
    t.check(`Rename… opens the batch rename on the 7 items (${sheet.h2})`, sheet.h2 === 'Rename 7 items' && sheet.focus === 'find', JSON.stringify(sheet));
    await t.type('alpha');
    await t.key('Tab');
    await t.type('alpha2');
    await t.waitFor(() => /^1 to rename/.test(document.querySelector('#dialog .rename-summary')?.textContent || ''), { what: 'one to rename' });
    await t.key('Enter');
    await t.poll(() => exists('a/alpha2.txt'), { timeout: 10000 });
    const ren = await drawn(t, (s) => s.rows.some((r) => r.rel === 'shelf-lab/a/alpha2.txt') && !s.rows.some((r) => r.rel === 'shelf-lab/a/alpha.txt'), 'the shelf following the rename');
    const j3 = await journal(t);
    t.check('applied, it is one change, and the shelf follows the new name', j3 === j2 + 1 && ren.rows.length === 7 && !ren.rows.some((r) => r.gone), JSON.stringify({ j2, j3 }));
    await t.eval(() => { document.getElementById('ledger-list').focus(); return true; });
    await t.key('Ctrl+Z');
    await t.poll(() => exists('a/alpha.txt'), { timeout: 10000 });
    await drawn(t, (s) => s.rows.some((r) => r.rel === 'shelf-lab/a/alpha.txt'), 'the old name back');
    t.check('Ctrl+Z gives the old name back, and the shelf follows it', exists('a/alpha.txt') && !exists('a/alpha2.txt'));

    /* ---- Copy to… keeps the originals on the shelf ---- */
    const j4 = await journal(t);
    await press(t, '#b-panel-shelf [data-k=copy]');
    await t.waitFor((T) => T.S.placing?.type === 'copy', { timeout: 10000, what: 'placing a copy' });
    await toDest(t);
    await t.key('Enter');
    await t.poll(() => exists('dest/alpha.txt') && exists('a/alpha.txt'), { timeout: 20000 });
    await t.app((T) => { T.api.setQuery(''); return true; });
    await t.sleep(400);
    const cp = await drawn(t, (s) => s.rows.length === 7);
    t.check('Copy to… copies every item as one change, and the shelf keeps the originals', (await journal(t)) === j4 + 1 && same(cp.rows.map((r) => r.rel).sort(), [...order].sort()), JSON.stringify(cp.rows.map((r) => r.rel)));

    /* ---- Export, and Show ---- */
    await press(t, '#b-panel-shelf [data-k=export]');
    const ex = await noticeText(t, /^Exported 7 rows to /);
    t.check(`Export CSV saves the list and says so (${ex})`, /^Exported 7 rows to terrane-.*-shelf-\d{4}-\d\d-\d\d\.csv\.$/.test(ex));
    await press(t, '#b-panel-shelf [data-k=show]');
    const shown = await t.waitFor((T) => T.S.sel.size === 7 && { sel: [...T.S.sel].map((n) => T.api.relPath(n)).sort() }, { timeout: 10000, what: 'every item selected' });
    const showSaid = await said(t, /^Showing the 7 shelf items, selected, in shelf-lab\.$/, 'Show said');
    // Without WebGL the location moves there at once; with it, a flight lands there or in one of its folders.
    await t.waitFor((T) => /^shelf-lab(\/|$)/.test(T.api.relPath(T.S.focus)), { timeout: 15000, what: 'the location at shelf-lab' });
    t.check(`Show in the world selects every item and moves to the folder that holds them (${showSaid})`, same(shown.sel, [...order].sort()), JSON.stringify(shown));
    await t.settle();

    /* ---- a folder deleted from outside ---- */
    fs.rmSync(at('b', 'deep'), { recursive: true, force: true });
    await t.sleep(500);
    await t.app((T) => { T.api.refreshDirs(['shelf-lab/b']); return true; });
    await showShelf(t);
    const g1 = await drawn(t, (s) => s.rows.filter((r) => r.gone).length === 2, 'two rows no longer there');
    const goneRows = g1.rows.filter((r) => r.gone);
    t.check(`the rows of b/deep stay, dimmed and tagged (${goneRows[0].path}), and a line says "${g1.state}"`,
      goneRows.every((r) => /^no longer there/.test(r.path)) && g1.state === '2 items are no longer there.' && g1.rows.length === 7, JSON.stringify(g1.rows));
    await press(t, '#b-panel-shelf [data-k=move]');
    const gm = await said(t, /^Moving 5 items; 2 no longer there stay on the shelf/, 'Move with two gone said');
    t.check(`Move says what is skipped (${gm})`, !!gm);
    await t.key('Escape');
    await t.waitFor((T) => !T.S.placing, { what: 'placing cancelled' });
    await press(t, '#b-panel-shelf [data-k=gone-off]');
    const g2 = await drawn(t, (s) => s.rows.length === 5 && !s.state);
    t.check('Take them off the shelf takes the two off; the line goes', g2.rows.every((r) => !r.gone) && g2.label === '5', JSON.stringify(g2.label));

    /* ---- Clear, and Put back ---- */
    await press(t, '#b-panel-shelf [data-k=clear]');
    const cl = await noticeText(t, /^Cleared the shelf: 5 items\.$/);
    const c0 = await drawn(t, (s) => s.name === 'Nothing on the shelf yet');
    t.check(`Clear the shelf empties it with a notice (${cl}) and focus on the head`, c0.label === null && c0.focus === 'name', JSON.stringify({ label: c0.label, focus: c0.focus }));
    t.check('its Put back puts the five back', await clickNotice(t, /^Cleared the shelf/, 'Put back') && !!(await drawn(t, (s) => s.rows.length === 5 && s.label === '5')));

    await t.app((T) => {
      document.getElementById('b-tab-inspector').click();
      T.api.select(null);
      return true;
    });
    t.check('it ends on the Inspector', (await t.app((T) => T.S.bTab)) === 'inspector');
  },
};

/* ====================================================================== */

const shelfModes = {
  name: 'shelf-modes',
  title: 'Shelf in read-only and snapshot modes, with junk kept, storage refused, the cap, the Guide and a narrow window',
  data: 'fixture',
  timeout: 300000,
  async run(t) {
    await t.settle();
    const KEY = await t.app((T) => `terrane.shelf.v1|${T.S.info.root}`);
    const files = await t.app((T) => {
      const out = [];
      const walk = (d) => {
        for (const c of d.c) {
          if (out.length >= 3) return;
          if (c.d) walk(c);
          else out.push(T.api.relPath(c));
        }
      };
      walk(T.S.model.root);
      return out;
    });
    const mark = t.mark();
    await selectRels(t, files);
    await t.key('k');
    await said(t, /^Put 3 items on the shelf \(3 items\)\.$/, 'three put on');
    await showShelf(t);
    const s1 = await drawn(t, (s) => s.rows.length === 3);
    const g = (label) => s1.grid.find((b) => b.text.startsWith(label));
    t.check('in read-only mode Move to…, Copy to… and Rename… stay in the grid, unavailable with the reason in their title and under the grid',
      ['Move to…', 'Copy to…', 'Rename…'].every((l) => g(l)?.off && g(l).title === 'Unavailable: read-only mode') && s1.why === 'Unavailable here: read-only mode.'
      && ['Show in the world', 'Copy paths', 'Export CSV'].every((l) => g(l) && !g(l).off), JSON.stringify(s1.grid));
    await press(t, '#b-panel-shelf [data-k=export]');
    const ex = await noticeText(t, /^Exported 3 rows to /);
    await press(t, '#b-panel-shelf [data-k=copy-paths]');
    const cpN = await noticeText(t, /3 paths copied to the clipboard|did not allow clipboard access/);
    await press(t, '#b-panel-shelf [data-k=show]');
    await t.waitFor((T) => T.S.sel.size === 3, { timeout: 10000, what: 'the three selected' });
    await showShelf(t);
    await press(t, '#b-panel-shelf [data-k=move]');
    await t.sleep(300);
    const moveName = await t.eval(() => document.querySelector('#b-panel-shelf [data-k=move]').textContent);
    t.check(`gathering, Export (${ex}), Copy paths (${cpN}) and Show work; Move to… starts nothing and names why in its own name (${moveName})`,
      !(await t.app((T) => !!T.S.placing)) && /, unavailable: read-only mode$/.test(moveName));
    await press(t, '#b-panel-shelf [data-k=clear]');
    await noticeText(t, /^Cleared the shelf: 3 items\.$/);
    await clickNotice(t, /^Cleared the shelf/, 'Put back');
    await drawn(t, (s) => s.rows.length === 3);
    t.check('Clear and Put back work, and no change was sent to the service', t.requests(mark).every((r) => !(r.method === 'POST' && r.path === '/api/op')));

    /* ---- snapshot mode ---- */
    await t.app((T) => {
      T.S.info.snapshot = true;
      document.getElementById('b-tab-inspector').click();
      document.getElementById('b-tab-shelf').click();
      return true;
    });
    const snap = await drawn(t, (s) => s.why === 'Unavailable here: snapshot mode.');
    await t.app((T) => {
      T.S.info.snapshot = false;
      return true;
    });
    t.check('in snapshot mode the writes are unavailable with the snapshot reason', snap.grid.filter((b) => b.off).length === 3, JSON.stringify(snap.grid));

    /* ---- the Guide's rows, K on the menu ---- */
    await t.eval(() => { document.getElementById('ledger-list').focus(); return true; });
    await t.key('?');
    await t.waitFor(() => document.getElementById('dialog').open && !!document.querySelector('#dialog .guide'), { what: 'the Guide' });
    const guide = await t.eval(() => [...document.querySelectorAll('#dialog .guide > div')].map((d) => [d.querySelector('h3').textContent, [...d.querySelectorAll('dt')].map((dt) => `${dt.textContent}|${dt.nextElementSibling.textContent}`)]));
    await t.key('Escape');
    const many = (guide.find(([h]) => h === 'Acting on many') || [null, []])[1];
    const want = ['K|Put the selection on the shelf, or take it off', 'K|In Preview, or on a Cleanup row: put that item on the shelf', 'Drag|Ledger rows onto the Shelf tab: put them on the shelf',
      '↑ ↓  Home  End|In the Shelf: the previous / next item, the first / last', 'Enter|In the Shelf: select the item and frame it in the world', 'Space|In the Shelf: add the item to the selection, or drop it',
      'Del|In the Shelf: take the item off the shelf (it stays on disk)'];
    t.check('the Guide holds the Shelf\'s seven rows under Acting on many', want.every((w) => many.includes(w)), JSON.stringify(many));
    const menu = await worldMenu(t, files[0]);
    t.check('the world\'s menu says Take off the shelf, with K, in read-only mode too', menu.some((m) => m.label === 'Take off the shelf' && m.hint === 'K' && !m.off), JSON.stringify(menu.map((m) => `${m.label}|${m.hint}`)));

    /* ---- junk kept in the browser ---- */
    await t.eval((k) => { localStorage.setItem(k, '<<junk>>'); return true; }, KEY);
    await t.reload();
    await showShelf(t);
    const j = await drawn(t, (s) => s.name === 'Nothing on the shelf yet');
    t.check('junk under the shelf\'s key reads as an empty shelf, with no error', j.rows.length === 0 && j.label === null);
    await t.eval(({ k, ok }) => {
      localStorage.setItem(k, JSON.stringify({ format: 1, items: [{ rel: ok, d: 0, s: 5, m: 1, at: 2 }, { rel: '../escape', d: 0, s: 1, m: 1, at: 1 }, 'junk', { rel: ok, d: 0, s: 9, m: 9, at: 9 }, { rel: 'x', d: 7, s: 1, m: 1, at: 1 }] }));
      return true;
    }, { k: KEY, ok: files[0] });
    await t.reload();
    await showShelf(t);
    const mix = await drawn(t, (s) => s.rows.length > 0);
    t.check(`a mix of valid and junk entries lists only the valid one (${mix.rows.map((r) => r.rel)})`, same(mix.rows.map((r) => r.rel), [files[0]]), JSON.stringify(mix.rows));

    /* ---- storage that refuses ---- */
    await t.eval(() => {
      window.__realSet = Storage.prototype.setItem;
      Storage.prototype.setItem = function setItem(k, v) {
        if (String(k).startsWith('terrane.shelf.')) {
          const e = new Error('full');
          e.name = 'QuotaExceededError';
          throw e;
        }
        return window.__realSet.call(this, k, v);
      };
      return true;
    });
    await selectRels(t, [files[1]]);
    await t.key('k');
    await said(t, /is on the shelf \(2 items\)/, 'the second put on');
    await selectRels(t, [files[2]]);
    await t.key('k');
    await said(t, /is on the shelf \(3 items\)/, 'the third put on');
    const refused = await t.eval(() => [...document.querySelectorAll('#notices .notice-text')].map((n) => n.textContent).filter((x) => /^The shelf cannot be kept in this browser/.test(x)));
    await t.eval(() => { Storage.prototype.setItem = window.__realSet; return true; });
    t.check(`a storage that refuses is said once (${refused[0]}), and the shelf keeps working`, refused.length === 1 && /the storage is full\); it lasts until this page closes\.$/.test(refused[0]) && (await now(t)).label === '3', JSON.stringify(refused));
    await t.reload();

    /* ---- the cap: Add all over the fixture ---- */
    await showShelf(t);
    await drawn(t);
    await press(t, '#b-panel-shelf [data-k=clear]').catch(() => {});
    await t.app((T) => {
      T.api.setQuery('is:file');
      T.S.tab = 'findings';
      T.api.drawLedger();
      return true;
    });
    const total = await t.waitFor((T) => T.S.search?.list.length > 1000 && !!document.querySelector('#ledger-sub [data-k=shelf-all]') && T.S.search.list.length, { timeout: 15000, what: 'every file in Findings' });
    await press(t, '#ledger-sub [data-k=shelf-all]');
    const cap = await said(t, /^The shelf holds at most 1,000 items: put 1,000 of [\d,]+ on it\. Take some off to add more\.$/, 'the cap said');
    await showShelf(t);
    const big = await drawn(t, (s) => s.label === '1,000' && s.rows.length === 100);
    t.check(`Add all over ${total} files keeps 1,000 and says so (${cap}); 100 rows drawn, then "${big.more}"`, big.more === 'Show 100 more (1,000 in all)', JSON.stringify(big.more));
    await t.app((T) => { T.api.setQuery(''); return true; });

    /* ---- 800 × 500, in the drawer ---- */
    await t.page.send('Emulation.setDeviceMetricsOverride', { width: 800, height: 500, deviceScaleFactor: 1, mobile: false });
    try {
      await t.sleep(400);
      await t.app((T) => { T.api.showBTab('shelf'); return true; });
      await t.waitFor(() => getComputedStyle(document.getElementById('inspector')).visibility === 'visible', { what: 'the drawer' });
      await t.sleep(300);
      const narrow = await t.eval(`(() => {
        const lines = ${LINES};
        const P = document.getElementById('b-panel-shelf');
        const body = P.querySelector('.sh-body');
        const btns = [...P.querySelectorAll('.btn')].filter((b) => b.offsetParent && b.textContent.trim());
        const over = [...P.querySelectorAll('*')].filter((e) => e.offsetParent && e.getBoundingClientRect().right > P.getBoundingClientRect().right + 0.5);
        const tab = document.getElementById('b-tab-shelf');
        const c = tab.querySelector('.count');
        const ic = tab.querySelector('.icon');
        const vis = (e) => !!e && e.getBoundingClientRect().width > 0 && getComputedStyle(e).visibility !== 'hidden';
        return { page: document.documentElement.scrollWidth <= innerWidth, body: body.scrollWidth <= body.clientWidth + 0.5, wrapped: btns.filter((b) => lines(b) > 1).map((b) => b.textContent.trim()),
          over: over.map((e) => e.className).slice(0, 5), crowded: 'crowded' in document.getElementById('b-tabs').dataset, count: vis(c) && c.textContent, icon: vis(ic),
          inStrip: tab.getBoundingClientRect().right <= document.getElementById('b-tabs').getBoundingClientRect().right + 0.5 };
      })()`);
      t.check(`at 800 × 500, in the drawer: no overflow, every button on one line, the Shelf's icon and count on its tab${narrow.crowded ? ' in the crowded strip' : ''}`,
        narrow.page && narrow.body && narrow.wrapped.length === 0 && narrow.over.length === 0 && narrow.count === '1,000' && narrow.icon && narrow.inStrip, JSON.stringify(narrow));
    } finally {
      await t.page.send('Emulation.clearDeviceMetricsOverride', {});
      await t.sleep(300);
    }
    await press(t, '#b-panel-shelf [data-k=clear]');
    await noticeText(t, /^Cleared the shelf: 1,000 items\.$/);
    await t.app((T) => {
      document.getElementById('b-tab-inspector').click();
      T.api.select(null);
      return true;
    });
    t.check('it ends on the Inspector, the shelf cleared', (await t.app((T) => T.S.bTab)) === 'inspector' && (await now(t)).label === null);
  },
};

/* ====================================================================== */

const shelfRegions = {
  name: 'shelf-regions',
  title: 'Shelf in region mode: refs kept by path, items found before they are shown, a path that is nowhere marked',
  data: 'fixture',
  regions: 0,
  timeout: 240000,
  async run(t) {
    await t.settle();
    const regions = await t.app((T) => !!T.S.regions);
    t.check('the page draws in regions', regions);
    if (!regions) return;
    await t.waitFor((T) => T.S.survey && !T.S.survey.pending, { timeout: 30000, what: 'the service\'s survey' });
    const KEY = await t.app((T) => `terrane.shelf.v1|${T.S.info.root}`);
    await t.app((T) => {
      T.api.setQuery('ext:dat');
      T.S.tab = 'findings';
      T.api.drawLedger();
      return true;
    });
    const found = await t.waitFor((T) => T.S.search?.list.length > 0 && !!document.querySelector('#ledger-sub [data-k=shelf-all]') && {
      n: T.S.search.list.length, refs: T.S.search.list.filter((x) => x.ref).length, rels: T.S.search.list.slice(0, 30).map((x) => T.api.relPath(x)),
    }, { timeout: 20000, what: 'Findings for ext:dat' });
    await press(t, '#ledger-sub [data-k=shelf-all]');
    await said(t, /on the shelf/, 'Add all said');
    const kept = await t.eval((k) => JSON.parse(localStorage.getItem(k)).items.map((x) => x.rel), KEY);
    t.check(`Add all from Findings keeps every match by path, refs included (${found.n} matches, ${found.refs} refs)`, kept.length === Math.min(found.n, 1000) && found.rels.every((r) => kept.includes(r)), JSON.stringify({ kept: kept.slice(0, 5), found }));
    await t.app((T) => { T.api.setQuery(''); return true; });
    await showShelf(t);
    const s1 = await drawn(t, new Function('s', `return s.rows.length === ${Math.min(found.n, 100)};`));
    const unheld = await t.app((T, rels) => rels.filter((r) => !T.S.model.find(r)), s1.rows.map((r) => r.rel));
    const row = s1.rows.find((r) => unheld.includes(r.rel));
    t.check(`a row not held shows its stored figures and no gone mark${row ? ` (${row.name}, ${row.fig}: "${row.title}")` : ' (every row was held)'}`,
      s1.rows.every((r) => !r.gone) && (!row || (/B$/.test(row.fig) && /figures as when it was added/.test(row.title))), JSON.stringify(row));
    t.check('moves are unavailable in read-only mode', ['Move to…', 'Copy to…', 'Rename…'].every((l) => s1.grid.find((b) => b.text.startsWith(l))?.off));

    // A stored path that is nowhere: marked no longer there once Show looks for it.
    await t.eval((k) => {
      const v = JSON.parse(localStorage.getItem(k));
      v.items.unshift({ rel: 'nope/missing.txt', d: 0, s: 12, m: 1, at: Date.now() });
      localStorage.setItem(k, JSON.stringify(v));
      return true;
    }, KEY);
    await t.reload();
    await t.waitFor((T) => T.S.survey && !T.S.survey.pending, { timeout: 30000, what: 'the service\'s survey again' });
    await showShelf(t);
    await drawn(t, (s) => s.rows[0]?.rel === 'nope/missing.txt');
    await press(t, '#b-panel-shelf [data-k=show]');
    const sel = await t.waitFor((T, n) => T.S.sel.size === n && [...T.S.sel].map((x) => T.api.relPath(x)), { args: [kept.length], timeout: 60000, what: 'every item there selected' });
    t.check(`Show finds the items across the tree and selects them: the selection's paths are the shelf's (${sel.length})`, same([...sel].sort(), [...kept].sort()), JSON.stringify(sel.slice(0, 5)));
    await showShelf(t);
    const g = await drawn(t, (s) => s.rows[0]?.rel === 'nope/missing.txt' && s.rows[0].gone, 'nope/missing.txt marked');
    t.check(`the path that is nowhere is marked no longer there (${g.rows[0].path}), on the live client's answer`, /^no longer there/.test(g.rows[0].path) && g.state === '1 item is no longer there.', JSON.stringify(g.rows[0]));
    await press(t, '#b-panel-shelf [data-k=clear]');
    await t.app((T) => {
      document.getElementById('b-tab-inspector').click();
      T.api.select(null);
      return true;
    });
  },
};

export default [shelf, shelfModes, shelfRegions];
