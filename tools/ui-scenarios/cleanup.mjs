/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Cleanup Scenarios (Terrane Edition - v1.0)
 *     - File Name: cleanup.mjs
 *     - Relative Path: tools/ui-scenarios/cleanup.mjs
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
 *       Initial release. After the review: Whole world only two levels
 *       down; no live region but say(); Verify's focus on what it found,
 *       and a redraw keeping focus on a group's head, its Move and the
 *       names; a folder Terrane renames followed, and back on Undo; "no
 *       longer there"; in region mode the new folder's head at once with
 *       nothing to move while it counts, and the folder kept while the
 *       tree is read again.
 *
 * ✒ Description:
 *     Walks the right panel's Cleanup tab end to end in the real page, by
 *     keyboard where a person would, in both passes: finding it, what it
 *     says first, inspecting and leaving one out, the move to the holding
 *     area and its Undo, and the hard cases (read-only, snapshot, region
 *     mode, a folder removed from outside, a narrow window).
 *
 * ✒ Key Features:
 *     - cleanup (read-only fixture): the strip reads Inspector, Preview,
 *       Cleanup, nothing counted before it is chosen; Ctrl+K "cleanup" and
 *       Suggest cleanup for this folder naming the folder; the head, the
 *       widen buttons and back by the menu; the groups by bytes with their
 *       rules; snapshot mode's Verify unavailable; Verify, the kept copy
 *       first; ↓ ↓ Space Enter and Home in the list; the offer bar; the
 *       world's menu; every Move unavailable in read-only mode; the Guide;
 *       no POST but hash; the drawer at 800 × 500
 *     - cleanup-disk (writes): a lab of caches, a decoy, stale and recent
 *       big files, empty and hidden-only folders and two copies; leave one
 *       out, move, one journal entry, the disk checked, Ctrl+Z, a group's
 *       own Move and the toast's Undo, a copy rewritten since verified, the
 *       folder deleted from outside
 *     - cleanup-regions (threshold 0): the service counts, once per count
 *       (T.asked: its questions go through the region worker), equal to
 *       the route's own answer; a row not held resolved and
 *       selected; moves unavailable; a late answer dropped
 *
 * ✒ Usage Instructions:
 *     node tools/ui-check.mjs cleanup --no-shots --port 5300
 *     node tools/ui-check.mjs cleanup-disk --no-shots --port 5300
 *     node tools/ui-check.mjs cleanup-regions --no-shots --port 5300
 *
 * ✒ Other Important Information:
 *     - Dependencies: tools/ui-check.mjs (the context t); the fixture's
 *       edge cases (copy-a, b and c, empty one and two) and archives/site
 *     - Compatible platforms: Node.js 22.5+
 * ----------------------------------------------------------------------------
 */

import fs from 'node:fs';
import path from 'node:path';

/** The tab as it stands, read in the page. */
const cl = () => {
  const P = document.getElementById('b-panel-cleanup');
  const q = (s) => P?.querySelector(s);
  const all = (s) => [...(P?.querySelectorAll(s) || [])];
  const a = document.activeElement;
  const btn = (b) => (b ? { text: b.textContent.trim(), off: b.getAttribute('aria-disabled') === 'true' } : null);
  return {
    shown: !!P && !P.hidden && getComputedStyle(document.getElementById('inspector')).visibility === 'visible',
    at: P?.dataset.shown ?? null,
    name: q('.insp-name')?.textContent ?? null,
    where: q('.cl-where:not([hidden])')?.textContent ?? null,
    whole: !!q('.cl-whole:not([hidden])'),
    facts: q('.cl-facts')?.textContent ?? null,
    state: q('.cl-state:not([hidden])')?.textContent ?? null,
    sum: q('.cl-sum')?.textContent ?? null,
    move: btn(q('.cl-move .btn')),
    offer: q('.cl-offer:not([hidden]) .cl-offer-text')?.textContent ?? null,
    clean: q('.cl-clean')?.textContent ?? null,
    roles: [q('.cl-offer')?.getAttribute('role') ?? null, q('.cl-state')?.getAttribute('role') ?? null],
    groups: all('.cl-group').map((g) => ({
      id: g.dataset.group, bytes: Number(g.dataset.bytes), count: Number(g.dataset.count), t: g.querySelector('summary .t').textContent, n: g.querySelector('summary .n').textContent, open: g.open,
      notes: [...g.querySelectorAll(':scope > .cl-note, :scope > .cl-pending .cl-note')].map((n) => n.textContent),
      rows: [...g.querySelectorAll('.cl-row')].map((r) => ({
        rel: r.dataset.rel, name: r.querySelector('.nm').textContent, path: r.querySelector('.path').textContent,
        out: r.classList.contains('is-out'), kept: r.classList.contains('is-kept'), box: r.querySelector('.cl-box')?.checked ?? null,
      })),
      btn: btn(g.querySelector('[data-move] .btn')),
      verify: btn([...g.querySelectorAll('.cl-pending .btn')][0] || null),
    })),
    focus: a === q('.insp-name') ? 'name' : a === q('.cl-sum') ? 'sum' : a?.closest?.('.cl-item') ? `row:${a.dataset.rel}` : P?.contains(a) ? (a.dataset?.k || a.className || a.tagName) : (a?.id || a?.className || 'body'),
  };
};

/** Waits until the tab has drawn rel's count and fn(state) holds. */
const drawn = (t, rel, fn = () => true, what = '') => t.waitFor(
  `(_T, r) => { const st = (${cl})(); return st.shown && st.at === r && (${fn})(st) && st; }`,
  { args: [rel], timeout: 15000, what: what || `Cleanup of "${rel}"` },
);
const grp = (st, id) => st.groups.find((g) => g.id === id);
const asked = (t, since) => t.requests(since).filter((r) => r.path === '/api/cleanup').map((r) => new URL(r.url).searchParams.get('under'));

/** Opens the palette and types query; resolves to its options as "label|detail". */
async function palette(t, query, fn = (o) => o.length > 0) {
  await t.key('Ctrl+K');
  await t.waitFor(() => document.getElementById('dialog').open && !!document.querySelector('.palette-input'), { what: 'the palette' });
  await t.type(query);
  return t.waitFor(`() => { const o = [...document.querySelectorAll('.palette-option')].map((x) => \`\${x.querySelector('.pal-label')?.textContent}|\${x.querySelector('.pal-detail')?.textContent}\`); return (${fn})(o) && o; }`,
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
    label: b.querySelector('.menu-label').textContent, off: b.getAttribute('aria-disabled') === 'true', why: b.querySelector('.menu-why')?.textContent ?? null,
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

/** Focuses an element in the tab by selector, then presses key. */
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

/** Confirms the shared dialog: its danger button. */
async function confirm(t) {
  const d = await t.waitFor(() => document.getElementById('dialog').open && {
    title: document.querySelector('#dialog h2')?.textContent, body: document.querySelector('#dialog .cl-confirm')?.textContent ?? '',
  }, { what: 'the confirmation' });
  await t.eval(() => { document.querySelector('#dialog .btn-danger').click(); return true; });
  await t.waitFor(() => !document.getElementById('dialog').open, { what: 'the dialog to close' });
  return d;
}

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

/* ====================================================================== */

const cleanup = {
  name: 'cleanup',
  title: 'Cleanup: the right panel\'s third tab, found, read and used by keyboard (read-only)',
  data: 'fixture',
  timeout: 300000,
  async run(t) {
    await t.settle();
    const ROOT = await t.app((T) => T.S.info.name);

    /* ---- the strip, nothing counted before the tab is chosen ---- */
    const s0 = await t.app(() => ({
      tabs: [...document.querySelectorAll('#b-tabs [role=tab]')].map((b) => `${b.dataset.btab}:${b.textContent}`),
      icons: [...document.querySelectorAll('#b-tabs [role=tab] use')].map((u) => u.getAttribute('href').split('#')[1]),
      mounted: 'mounted' in (document.getElementById('b-panel-cleanup')?.dataset || {}),
      title: document.getElementById('b-tab-cleanup')?.title,
    }));
    t.check('the right panel\'s strip reads Inspector, Preview, Cleanup, with its list-checks icon and its title',
      JSON.stringify(s0.tabs) === JSON.stringify(['inspector:Inspector', 'preview:Preview', 'cleanup:Cleanup']) && s0.icons[2] === 'list-checks'
      && s0.title === 'Cleanup: ranked suggestions for reclaiming space', JSON.stringify(s0));
    t.check('nothing is counted before Cleanup is chosen: no cleanup question, the tab not mounted', !s0.mounted && asked(t, 0).length === 0);

    /* ---- the palette: Show Cleanup first; Suggest… names the folder ---- */
    await t.app((T) => {
      T.api.setFocus(T.S.model.root);
      return true;
    });
    await t.settle();
    await t.app((T) => {
      const n = T.S.model.find('edge cases');
      T.S.tab = 'contents';
      T.api.drawLedger();
      T.api.select(n);
      T.api.cursorTo(n);
      document.getElementById('ledger-list').focus();
      return true;
    });
    // The list filtered: Drop to eye level, which holds no c, is gone from it.
    const opts = await palette(t, 'cleanup', (o) => o.some((x) => x.startsWith('Suggest cleanup')) && !o.some((x) => x.startsWith('Drop to eye level')));
    await t.key('Escape');
    await t.waitFor(() => !document.getElementById('dialog').open);
    t.check(`Ctrl+K "cleanup": Show Cleanup first, and Suggest cleanup for this folder names it (${opts.slice(0, 2).join(' / ')})`,
      opts[0] === 'Show Cleanup|Right panel' && opts.includes('Suggest cleanup for this folder|edge cases · right panel'), JSON.stringify(opts));

    /* ---- snapshot mode, for a moment: Verify unavailable, with the reason ---- */
    await t.app((T) => { T.S.info.snapshot = true; return true; });
    await palette(t, 'suggest cleanup', (o) => o[0]?.startsWith('Suggest cleanup for this folder|edge cases'));
    await t.key('Enter');
    const snap = await drawn(t, 'edge cases', (s) => s.groups.length > 0);
    await t.app((T) => { T.S.info.snapshot = false; return true; });
    const pendingSnap = grp(snap, 'dups');
    t.check(`in snapshot mode Verify by content is unavailable, with the reason, and the state line says so (${snap.state})`,
      pendingSnap?.verify?.off && /a snapshot holds no contents/.test(pendingSnap.verify.text) && /^Snapshot mode: nothing can be moved; these are suggestions only\./.test(snap.state || ''),
      JSON.stringify({ verify: pendingSnap?.verify, state: snap.state }));

    /* ---- what it says first ---- */
    await t.app(() => {
      document.getElementById('b-tab-inspector').click();
      document.getElementById('b-tab-cleanup').click();
      return true;
    });
    const s1 = await drawn(t, 'edge cases', (s) => s.groups.length > 0 && /^Read-only/.test(s.state || ''));
    const focus1 = await t.eval(() => document.activeElement?.dataset?.btab ?? document.activeElement?.className);
    t.check(`the head names the folder, its way up and its facts, with no Whole world beside "in ${ROOT}", which already widens to it (${s1.name}; ${s1.where}; ${s1.facts})`,
      s1.name === 'edge cases' && s1.where === `in ${ROOT}` && !s1.whole && /files · .* folders?$/.test(s1.facts || ''), JSON.stringify(s1));
    t.check('the state line and the offer bar are not live regions: the tab speaks through say()', s1.roles.every((r) => r === null), JSON.stringify(s1.roles));
    t.check(`the summary says what could be freed, and the button what it moves (${s1.sum}; ${s1.move?.text})`,
      /^Could free /.test(s1.sum || '') && /^Move |^Nothing to move/.test(s1.move?.text || ''), JSON.stringify({ sum: s1.sum, move: s1.move, focus1 }));
    const bytes = s1.groups.map((g) => g.bytes);
    t.check(`the groups come by the space they free (${s1.groups.map((g) => `${g.id} ${g.bytes}`).join(', ')}), each with its rule`,
      bytes.every((b, i) => i === 0 || bytes[i - 1] >= b) && s1.groups.length === 4 && s1.groups.every((g) => g.notes[0]?.length > 20), JSON.stringify(s1.groups.map((g) => [g.id, g.bytes, g.notes[0]])));
    const staleNote = grp(s1, 'stale')?.notes[0] || '';
    t.check(`the Big and stale note names both thresholds (${staleNote})`, /over 100 MB/.test(staleNote) && /not changed in a year/.test(staleNote));
    const empty = grp(s1, 'empty');
    const emptyRels = empty.rows.map((r) => r.name);
    t.check(`Empty folders lists "empty one" and "empty two", never a folder holding a hidden file (${emptyRels.join(', ')})`,
      emptyRels.includes('empty one') && emptyRels.includes('empty two') && empty.rows.every((r) => r.rel !== 'edge cases'), JSON.stringify(empty.rows));
    const dups0 = grp(s1, 'dups');
    t.check(`before Verify the duplicates group lists nothing and offers Verify by content (${dups0.notes.join(' / ')})`,
      dups0.rows.length === 0 && dups0.verify && !dups0.verify.off && dups0.notes.some((n) => /share a size but (is|are) not verified/.test(n)), JSON.stringify(dups0));
    t.check('read-only mode: the state line says so, and every Move button is unavailable with "read-only mode" in its name',
      /^Read-only mode: nothing can be moved; these are suggestions only\./.test(s1.state) && s1.move.off && /unavailable: read-only mode|nothing is checked/.test(s1.move.text)
      && s1.groups.every((g) => !g.btn || (g.btn.off && /unavailable: (read-only mode|nothing is checked)/.test(g.btn.text))), JSON.stringify([s1.move, s1.groups.map((g) => g.btn)]));

    /* ---- Verify: the copy kept first, named ---- */
    let mark = t.mark();
    // Its head says how many sets wait to be verified; opened, Verify is in it.
    const dupHead = await t.eval(() => {
      const d = document.querySelector('#b-panel-cleanup [data-group=dups]');
      d.open = true;
      return d.querySelector('summary .n').textContent;
    });
    t.check(`the Duplicates head says how many sets wait to be verified (${dupHead})`, /^\d+ sets? to verify$/.test(dupHead), dupHead);
    await press(t, '#b-panel-cleanup [data-group=dups] .cl-pending .btn');
    const s2 = await drawn(t, 'edge cases', (s) => (s.groups.find((g) => g.id === 'dups')?.rows.length || 0) >= 3, 'the verified set');
    const d2 = grp(s2, 'dups');
    // Two sets: the strata files (large, so compared by samples), then copy-a/b/c.
    const at = d2.rows.findIndex((r) => r.name === 'copy-c.dat');
    const abc = at >= 0 ? d2.rows.slice(at, at + 3) : [];
    t.check(`Verify gives the copy-a/b/c set, the copy kept (newest) first and named (${d2.rows.map((r) => `${r.name}${r.kept ? ' kept' : ''}`).join(', ')})`,
      abc[0]?.kept && /^keeps · newest · changed \d\d\/\d\d\/\d{4}$/.test(abc[0].path)
      && JSON.stringify(abc.slice(1).map((r) => r.name)) === JSON.stringify(['copy-a.dat', 'copy-b.dat']) && s2.groups[0].id === 'dups', JSON.stringify(d2));
    const live0 = d2.rows.find((r) => r.name === 'live.bin');
    const old0 = d2.rows.find((r) => r.name === 'archive-2019.bin');
    t.check(`the strata set, compared by samples, is probable: its kept row (${live0?.path}), its copy (${old0?.path}) and the note say so; copy-a/b/c is not`,
      live0?.kept && / · probable$/.test(live0.path) && / · a probable copy, changed /.test(old0?.path || '') && /marked probable/.test(d2.notes[0] || '')
      && abc.every((r) => !/probable/.test(r.path)), JSON.stringify({ live0, old0, note: d2.notes[0] }));
    const posts = t.requests(mark).filter((r) => r.method === 'POST' && r.path.startsWith('/api/')).map((r) => r.path);
    t.check('Verify posts only /api/hash', posts.length > 0 && posts.every((p) => p === '/api/hash'), JSON.stringify(posts));
    const afterVerify = await t.waitFor(`() => { const s = (${cl})(); return s.focus.startsWith('row:') && s.focus; }`, { timeout: 5000, what: 'focus after Verify' }).catch(() => null);
    t.check(`Verify's button goes once it has run, and focus goes on to what it found, the group's first row (${afterVerify})`, afterVerify === `row:${d2.rows[0].rel}`, String(afterVerify));

    /* ---- the keyboard: into the list, ↓ to copy-b.dat, Space, Enter, Home ---- */
    await t.eval(() => {
      const d = document.querySelector('#b-panel-cleanup [data-group=dups]');
      d.open = true;
      document.querySelector('#b-panel-cleanup .insp-name').focus();
      return true;
    });
    await t.tabTo('#b-panel-cleanup [data-group=dups] .cl-list button.cl-item', { max: 40 });
    const before = await t.eval(cl);
    const steps = grp(before, 'dups').rows.findIndex((r) => r.name === 'copy-b.dat');
    for (let k = 0; k < steps; k++) await t.key('ArrowDown');
    const onB = await t.eval(cl);
    await t.key('Space');
    const left = await drawn(t, 'edge cases', (s) => s.groups.find((g) => g.id === 'dups').rows.some((r) => r.out));
    const live = await t.live();
    const figure = (text) => text?.match(/Move (\d+) (?:items?|cop(?:y|ies)), ([\d.]+ \w+)/)?.slice(1) ?? null;
    const bAll = figure(before.move.text);
    const aAll = figure(left.move.text);
    const bD = figure(grp(before, 'dups').btn.text);
    const aD = figure(grp(left, 'dups').btn.text);
    t.check(`↓ (${steps}) reaches copy-b.dat; Space leaves it out: its box cleared, the row muted, both buttons one less (${bAll} → ${aAll}; ${bD} → ${aD}), said (${live})`,
      onB.focus === 'row:edge cases/copy-b.dat' && grp(left, 'dups').rows.find((r) => r.name === 'copy-b.dat').out && grp(left, 'dups').rows.find((r) => r.name === 'copy-b.dat').box === false
      && Number(aAll[0]) === Number(bAll[0]) - 1 && Number(aD[0]) === Number(bD[0]) - 1 && /^Left out copy-b\.dat; the move now takes /.test(live)
      && JSON.stringify(grp(left, 'dups').rows.map((r) => r.name)) === JSON.stringify(grp(before, 'dups').rows.map((r) => r.name)), JSON.stringify({ onB: onB.focus, bAll, aAll, bD, aD, live }));
    const here0 = await t.app((T) => T.api.relPath(T.S.focus));
    await t.key('Enter');
    const sel = await t.waitFor((T) => T.S.primary?.n === 'copy-b.dat' && {
      primary: T.api.relPath(T.S.primary), cursor: T.api.listCursor()?.n ?? null, listed: T.api.listItems().includes(T.S.primary), live: document.getElementById('live').textContent,
    }, { what: 'copy-b.dat selected' });
    await t.settle();
    const after = await t.eval(cl);
    t.check(`Enter selects and frames it (${sel.primary}), the ledger's cursor following where it is listed, its name said; the tab keeps its folder, with no offer`,
      sel.primary === 'edge cases/copy-b.dat' && (!sel.listed || sel.cursor === 'copy-b.dat') && /copy-b\.dat/.test(sel.live) && after.at === 'edge cases' && after.offer === null, JSON.stringify({ sel, at: after.at, offer: after.offer }));
    // Enter has framed copy-b.dat (with WebGL the eye flew there): Home from where that left you.
    const here1 = await t.app((T) => T.api.relPath(T.S.focus));
    await press(t, '#b-panel-cleanup [data-group=dups] button.cl-item[data-rel="edge cases/copy-b.dat"]', 'Home');
    await t.sleep(250);
    const home = await t.app((T) => ({ here: T.api.relPath(T.S.focus), flight: T.S.noGL ? null : !!T.S.view.flight, focus: document.activeElement?.dataset?.rel ?? null }));
    t.check('Home on the list goes to its first row and never rises to the overview', home.focus === d2.rows[0].rel && home.here === here1 && !home.flight, JSON.stringify({ home, here0, here1 }));

    /* ---- a redraw keeps focus: a group's head, a group's Move, the names ---- */
    const redrawn = async (sel) => {
      const k0 = await t.eval((s) => {
        const e = document.querySelector(s);
        e.closest('.cl-group').open = true;
        e.focus();
        document.querySelector('#b-panel-cleanup .cl-groups > *').dataset.old = '1';
        return document.activeElement === e ? e.dataset.k : null;
      }, sel);
      await t.app((T) => { T.api.refreshDirs(['edge cases']); return true; });
      await t.waitFor(() => !document.querySelector('#b-panel-cleanup [data-old]'), { what: 'the groups drawn again' });
      await t.sleep(100);
      return [k0, await t.eval(() => document.activeElement?.dataset?.k ?? document.activeElement?.tagName ?? null)];
    };
    const kept = [
      await redrawn('#b-panel-cleanup [data-group=stale] > summary'),
      await redrawn('#b-panel-cleanup [data-move=empty] .btn'),
      await redrawn('#b-panel-cleanup .cl-names > summary'),
    ];
    t.check(`a redraw keeps focus on a group's head, a group's Move and Which folders count (${kept.map((k) => k.join(' → ')).join('; ')})`,
      JSON.stringify(kept) === JSON.stringify([['group-stale', 'group-stale'], ['move-empty', 'move-empty'], ['names', 'names']]), JSON.stringify(kept));

    /* ---- another folder selected: the offer bar ---- */
    await t.app((T) => { T.api.select(T.S.model.find('archives')); return true; });
    const offered = await t.waitFor(`() => { const s = (${cl})(); return s.offer && s; }`, { what: 'the offer bar' });
    await press(t, '#b-panel-cleanup .cl-offer .btn');
    const reScoped = await drawn(t, 'archives', (s) => s.name === 'archives');
    t.check(`selecting another folder offers it (${offered.offer}), and Suggest for it moves the tab there`, offered.offer === 'Selected: archives' && reScoped.at === 'archives', JSON.stringify(offered.offer));

    /* ---- the world's menu, widening, and back ---- */
    const items = await worldMenu(t, 'archives/site', 'Suggest cleanup here');
    const site = await drawn(t, 'archives/site');
    const onName = await t.eval(() => document.activeElement === document.querySelector('#b-panel-cleanup .insp-name'));
    t.check('the world\'s menu on a folder offers Suggest cleanup here, which opens the tab on it with focus on its heading',
      items.some((i) => i.label === 'Suggest cleanup here' && !i.off) && site.name === 'site' && onName, JSON.stringify({ items: items.map((i) => i.label), onName }));
    const fileItems = await worldMenu(t, 'edge cases/copy-a.dat');
    t.check('on a file the menu says Suggest cleanup in its folder; on empty ground, for this folder',
      fileItems.some((i) => i.label === 'Suggest cleanup in its folder') && (await worldMenu(t, null)).some((i) => i.label === 'Suggest cleanup for this folder'));
    await press(t, '#b-panel-cleanup .cl-whole');
    const whole = await drawn(t, '');
    await worldMenu(t, 'archives/site', 'Suggest cleanup here');
    await drawn(t, 'archives/site');
    await press(t, '#b-panel-cleanup .cl-where');
    const up = await drawn(t, 'archives');
    t.check(`two levels down Whole world widens to the root, where neither shows; "in archives" to archives, where only "in ${ROOT}" does (${site.whole}; ${whole.name}; ${up.name} ${up.where} ${up.whole})`,
      site.whole && site.where === 'in archives' && up.name === 'archives' && up.where === `in ${ROOT}` && !up.whole && whole.name === ROOT && whole.where === null && !whole.whole);
    await worldMenu(t, 'edge cases', 'Suggest cleanup here');
    const back = await drawn(t, 'edge cases');
    t.check('and back by the menu, copy-b.dat still left out', back.name === 'edge cases' && grp(back, 'dups').rows.find((r) => r.name === 'copy-b.dat')?.out === true);

    /* ---- the Guide; nothing posted but hash ---- */
    await t.eval(() => { document.getElementById('ledger-list').focus(); return true; });
    await t.key('?');
    await t.waitFor(() => document.getElementById('dialog').open && !!document.querySelector('#dialog .guide'), { what: 'the Guide' });
    const guide = await t.eval(() => [...document.querySelectorAll('#dialog .guide > div')].map((d) => [d.querySelector('h3').textContent, [...d.querySelectorAll('dt')].map((dt) => `${dt.textContent}|${dt.nextElementSibling.textContent}`)]));
    await t.key('Escape');
    await t.waitFor(() => !document.getElementById('dialog').open);
    const many = guide.find(([h]) => h === 'Acting on many')?.[1] || [];
    const want = ['↑ ↓|In Cleanup: the previous / next suggestion', 'Home  End|In Cleanup: the first / last suggestion of the group',
      'Space|In Cleanup: leave the suggestion out, or put it back', 'Enter|In Cleanup: select it and frame it in the world'];
    t.check('the Guide lists Cleanup\'s four keys under Acting on many', want.every((w) => many.includes(w)), JSON.stringify(many));
    const allPosts = t.requests(0).filter((r) => r.method === 'POST' && r.path.startsWith('/api/') && r.path !== '/api/hash');
    t.check('Cleanup posts nothing but /api/hash', allPosts.length === 0, JSON.stringify(allPosts.map((r) => r.path)));
    t.check('in whole-tree mode Cleanup never asks the service', asked(t, 0).length === 0);

    /* ---- 800 × 500, in the drawer ---- */
    await t.page.send('Emulation.setDeviceMetricsOverride', { width: 800, height: 500, deviceScaleFactor: 1, mobile: false });
    try {
      await t.sleep(400);
      await t.app((T) => { T.api.showBTab('cleanup'); return true; });
      await t.waitFor(() => getComputedStyle(document.getElementById('inspector')).visibility === 'visible', { what: 'the drawer' });
      await drawn(t, 'edge cases');
      await t.sleep(300);
      const narrow = await t.eval(`(() => {
        const lines = ${LINES};
        const P = document.getElementById('b-panel-cleanup');
        const body = P.querySelector('.cl-body');
        const btns = [...P.querySelectorAll('.btn')].filter((b) => b.offsetParent && b.textContent.trim());
        const over = [...P.querySelectorAll('*')].filter((e) => e.offsetParent && e.getBoundingClientRect().right > P.getBoundingClientRect().right + 0.5 && !e.closest('.cl-list .nm'));
        return { page: document.documentElement.scrollWidth <= innerWidth, body: body.scrollWidth <= body.clientWidth + 0.5, wrapped: btns.filter((b) => lines(b) > 1).map((b) => b.textContent.trim()), over: over.map((e) => e.className).slice(0, 5), crowded: 'crowded' in document.getElementById('b-tabs').dataset };
      })()`);
      t.check(`at 800 × 500, in the drawer: no overflow, every button on one line${narrow.crowded ? ', the strip crowded' : ''}`,
        narrow.page && narrow.body && narrow.wrapped.length === 0 && narrow.over.length === 0, JSON.stringify(narrow));
    } finally {
      await t.page.send('Emulation.clearDeviceMetricsOverride', {});
      await t.sleep(300);
    }
    await t.app((T) => {
      document.getElementById('b-tab-inspector').click();
      T.api.select(null);
      return true;
    });
    t.check('it ends on the Inspector', (await t.app((T) => T.S.bTab)) === 'inspector');
  },
};

/* ====================================================================== */

const MB = 1024 * 1024;
const LAB = 'cleanup-lab';

/** The lab: caches, a decoy, stale and recent big files, empty and hidden-only folders, two copies. */
function buildLab(root) {
  const at = (...p) => path.join(root, LAB, ...p);
  const put = (rel, data, mtime = null) => {
    const f = at(...rel.split('/'));
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, data);
    if (mtime) fs.utimesSync(f, mtime / 1000, mtime / 1000);
    return f;
  };
  const big = (rel, size, mtime) => {
    const f = at(...rel.split('/'));
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, '');
    fs.truncateSync(f, size);
    fs.utimesSync(f, mtime / 1000, mtime / 1000);
  };
  const now = Date.now();
  for (const p of ['left-pad', 'is-even', 'tiny-glob']) put(`node_modules/${p}/index.js`, `module.exports = '${p}';\n`);
  put('node_modules/.cache/state.bin', Buffer.alloc(5000, 1));
  fs.mkdirSync(at('node_modules', 'empty-in-nm'), { recursive: true });
  put('py/app.py', 'print("hi")\n');
  put('py/__pycache__/app.cpython-312.pyc', Buffer.alloc(900, 2));
  put('web/package.json', '{"name":"web"}\n');
  put('web/build/main.js', 'console.log(1);\n'.repeat(200));
  put('docs/build/plans.pdf', Buffer.alloc(20000, 3));
  put('rust/Cargo.toml', '[package]\nname = "lab"\n');
  put('rust/target/debug/lab.exe', Buffer.alloc(40000, 4));
  big('old-disk.img', 101 * MB, now - 3 * 365 * 86400000);
  big('recent-big.bin', 150 * MB, now - 2 * 86400000);
  fs.mkdirSync(at('empty-a'), { recursive: true });
  fs.mkdirSync(at('nested', 'empty-b'), { recursive: true });
  put('only-hidden/.DS_Store', Buffer.alloc(6148, 5));
  const payload = Buffer.alloc(307200, 'cleanup lab payload ');
  put('dup-1.bin', payload, now - 40 * 86400000);
  put('dup-2.bin', payload, now - 10 * 86400000);
  return at;
}

const cleanupDisk = {
  name: 'cleanup-disk',
  title: 'Cleanup on disk: leave one out, move, Undo, a copy rewritten, a folder deleted from outside',
  data: 'fixture',
  write: true,
  timeout: 300000,
  async run(t) {
    await t.settle();
    const at = buildLab(t.root);
    const exists = (rel) => fs.existsSync(at(...rel.split('/')));
    await t.app((T) => { T.api.refreshDirs(['']); return true; });
    await t.waitFor((T) => !!T.S.model.find('cleanup-lab/nested/empty-b') && !!T.S.model.find('cleanup-lab/dup-2.bin') && !T.S.surveyTimer && !!T.S.survey, { timeout: 20000, what: 'the lab read in' });
    await t.settle();

    /* ---- find it: the world's menu ---- */
    await worldMenu(t, LAB, 'Suggest cleanup here');
    const s0 = await drawn(t, LAB, (s) => s.groups.length === 4);
    const caches = grp(s0, 'caches');
    const paths = caches.rows.map((r) => `${r.rel}: ${r.path}`);
    t.check(`the rules are named: npm packages, build beside package.json, target beside Cargo.toml (${caches.rows.map((r) => r.rel.slice(LAB.length + 1)).join(', ')})`,
      paths.some((p) => /node_modules: .*npm packages/.test(p)) && paths.some((p) => /web\/build: .*build beside package\.json/.test(p)) && paths.some((p) => /rust\/target: .*target beside Cargo\.toml/.test(p))
      && paths.some((p) => /__pycache__/.test(p)), JSON.stringify(paths));
    const listed = s0.groups.flatMap((g) => g.rows.map((r) => r.rel));
    t.check('the decoy docs/build, the .cache and the empty folder inside node_modules, and the recent big file are not listed',
      !listed.some((r) => /docs\/build|node_modules\/\.cache|empty-in-nm|recent-big/.test(r)), JSON.stringify(listed));
    t.check('old-disk.img is big and stale; empty-a and nested/empty-b are empty folders', grp(s0, 'stale').rows.some((r) => r.name === 'old-disk.img')
      && ['empty-a', 'empty-b'].every((n) => grp(s0, 'empty').rows.some((r) => r.name === n)));
    t.check(`the Empty folders note counts the one folder holding only a hidden file (${grp(s0, 'empty').notes[0]})`, /1 folder here holds only hidden files/.test(grp(s0, 'empty').notes[0]));
    await t.eval(() => { document.querySelector('#b-panel-cleanup [data-group=dups]').open = true; return true; });
    await press(t, '#b-panel-cleanup [data-group=dups] .cl-pending .btn');
    const s1 = await drawn(t, LAB, (s) => s.groups.find((g) => g.id === 'dups').rows.length >= 2, 'the dup set verified');
    t.check('Verify gives the dup set, keeping the newest, dup-2.bin', grp(s1, 'dups').rows[0].kept && grp(s1, 'dups').rows[0].name === 'dup-2.bin' && grp(s1, 'dups').rows[1].name === 'dup-1.bin');

    /* ---- leave out empty-a ---- */
    await t.eval(() => { document.querySelector('#b-panel-cleanup [data-group=empty]').open = true; return true; });
    await press(t, `#b-panel-cleanup [data-group=empty] button.cl-item[data-rel="${LAB}/empty-a"]`, 'Space');
    const s2 = await drawn(t, LAB, (s) => s.groups.find((g) => g.id === 'empty').rows.find((r) => r.name === 'empty-a')?.out);
    const counts = (s) => Object.fromEntries(s.groups.map((g) => [g.id, g.n]));
    const before = counts(s2);

    /* ---- move everything checked ---- */
    const j0 = (await t.app((T) => T.api.get('journal'))).journal.length;
    await press(t, '#b-panel-cleanup .cl-move .btn');
    const dlg = await confirm(t);
    await t.waitFor(async (T) => !T.S.model.find('cleanup-lab/old-disk.img'), { timeout: 20000, what: 'the move' }).catch(() => null);
    const j1 = (await t.app((T) => T.api.get('journal'))).journal;
    const moved = ['node_modules', 'py/__pycache__', 'web/build', 'rust/target', 'old-disk.img', 'nested/empty-b', 'dup-1.bin'];
    const kept = ['empty-a', 'docs/build', 'dup-2.bin', 'recent-big.bin', 'node_modules'.replace('node_modules', 'py/app.py')];
    t.check(`one confirmation listing the groups and the kept copy (${dlg.title}), and one journal entry (${j1.at(-1)?.label})`,
      /^Move \d+ items to the holding area\?$/.test(dlg.title) && /Big and stale: 1 file/.test(dlg.body) && /Keeps 1 verified copy/.test(dlg.body) && /Undo \(Ctrl\+Z\)/.test(dlg.body) && /purged/.test(dlg.body)
      && j1.length === j0 + 1, JSON.stringify({ dlg, j0, j1: j1.length }));
    t.check(`every moved path is gone from disk, and empty-a, the decoy, the kept copy and the recent big file remain`,
      moved.every((r) => !exists(r)) && kept.every((r) => exists(r)), JSON.stringify({ stillThere: moved.filter(exists), gone: kept.filter((r) => !exists(r)) }));
    const s3 = await drawn(t, LAB, (s) => s.groups.find((g) => g.id === 'caches').count === 0);
    const focusAfter = await t.eval(() => document.activeElement?.className);
    t.check(`the totals refresh (${s3.sum}), empty-a still listed and left out, focus on the summary`,
      grp(s3, 'empty').rows.find((r) => r.name === 'empty-a')?.out && focusAfter === 'cl-sum', JSON.stringify({ sum: s3.sum, focusAfter }));

    /* ---- Ctrl+Z puts every item back ---- */
    await t.eval(() => { document.getElementById('ledger-list').focus(); return true; });
    await t.key('Ctrl+Z');
    await t.poll(() => moved.every(exists), { timeout: 20000 });
    const s4 = await drawn(t, LAB, (s) => s.groups.find((g) => g.id === 'caches').count > 0 && s.groups.find((g) => g.id === 'dups').rows.length >= 2, 'the suggestions back');
    t.check(`Ctrl+Z puts every item back on disk; the groups' counts as before (${JSON.stringify(counts(s4))}), the dup set still verified, empty-a still left out`,
      moved.every(exists) && JSON.stringify(counts(s4)) === JSON.stringify(before) && grp(s4, 'dups').rows[0].kept && grp(s4, 'empty').rows.find((r) => r.name === 'empty-a')?.out,
      JSON.stringify({ before, after: counts(s4) }));

    /* ---- a group's own Move, and the toast's Undo ---- */
    await t.eval(() => { document.querySelector('#b-panel-cleanup [data-group=caches]').open = true; return true; });
    const j2 = (await t.app((T) => T.api.get('journal'))).journal.length;
    await press(t, '#b-panel-cleanup [data-move=caches] .btn');
    const dlg2 = await confirm(t);
    await t.poll(() => !exists('node_modules') && !exists('rust/target'), { timeout: 20000 });
    const j3 = (await t.app((T) => T.api.get('journal'))).journal.length;
    const undoBtn = await t.waitFor(() => [...document.querySelectorAll('#notices .notice')].some((n) => /Removed \d+ items to the holding area/.test(n.textContent) && n.querySelector('.btn')), { what: 'the toast' });
    await t.eval(() => {
      const n = [...document.querySelectorAll('#notices .notice')].reverse().find((x) => /Removed \d+ items to the holding area/.test(x.textContent));
      [...n.querySelectorAll('.btn')].find((b) => /Undo/.test(b.textContent)).click();
      return true;
    });
    await t.poll(() => exists('node_modules') && exists('rust/target') && exists('web/build'), { timeout: 20000 });
    t.check(`a group's own Move moves only its items as one entry (${dlg2.title}); the toast's Undo puts them all back`,
      /^Move 4 items/.test(dlg2.title) && j3 === j2 + 1 && !!undoBtn && exists('old-disk.img') && exists('node_modules') && exists('py/__pycache__'), JSON.stringify({ dlg2, j2, j3 }));
    await drawn(t, LAB, (s) => s.groups.find((g) => g.id === 'caches').count === 4 && s.groups.find((g) => g.id === 'dups').rows.length >= 2, 'the caches back');

    /* ---- a copy rewritten since it was verified ---- */
    const dup2 = at('dup-2.bin');
    const st = fs.statSync(dup2);
    fs.writeFileSync(dup2, Buffer.alloc(307200, 'a different payload!'));
    fs.utimesSync(dup2, st.atime, st.mtime);
    await t.sleep(1200);
    await t.eval(() => { document.querySelector('#b-panel-cleanup [data-group=dups]').open = true; return true; });
    await drawn(t, LAB, (s) => s.groups.find((g) => g.id === 'dups').rows.length >= 2);
    const j4 = (await t.app((T) => T.api.get('journal'))).journal.length;
    await press(t, '#b-panel-cleanup [data-move=dups] .btn');
    await confirm(t);
    const stopped = await t.waitFor(() => /dup-2\.bin changed since it was verified, so nothing was moved/.test(document.getElementById('live').textContent + [...document.querySelectorAll('#notices .notice')].map((n) => n.textContent).join(' ')), { timeout: 10000, what: 'the stop' }).catch(() => false);
    const j5 = (await t.app((T) => T.api.get('journal'))).journal.length;
    t.check('a copy rewritten since it was verified stops the move: dup-2.bin named, nothing moved', stopped && exists('dup-1.bin') && exists('dup-2.bin') && j5 === j4);

    /* ---- the folder renamed by Terrane: followed, and back on Undo ---- */
    await worldMenu(t, `${LAB}/nested`, 'Suggest cleanup here');
    await drawn(t, `${LAB}/nested`);
    let liveMark = await t.live();
    await t.app((T) => { T.api.runOp({ type: 'rename', path: 'cleanup-lab/nested', name: 'nested-2' }); return true; });
    const renamed = await drawn(t, `${LAB}/nested-2`, () => true, 'the renamed folder');
    const renamedLive = await t.live();
    await t.eval(() => { document.getElementById('ledger-list').focus(); return true; });
    await t.key('Ctrl+Z');
    await t.poll(() => exists('nested'), { timeout: 20000 });
    const unrenamed = await drawn(t, `${LAB}/nested`, () => true, 'the folder back under its name');
    t.check(`a folder Terrane renames is followed (${renamed.name}), and back on Undo (${unrenamed.name}), never "no longer there"`,
      renamed.name === 'nested-2' && unrenamed.name === 'nested' && !/no longer there/.test(`${renamedLive} ${await t.live()}`), JSON.stringify({ liveMark, renamedLive }));

    /* ---- the folder deleted from outside ---- */
    fs.rmSync(at('nested'), { recursive: true, force: true });
    await t.sleep(600);
    await t.app((T) => { T.api.refreshDirs(['cleanup-lab']); return true; });
    const goneSt = await drawn(t, LAB, () => true, 'the parent after the folder went');
    const goneLive = await t.live();
    t.check(`a folder deleted from outside: the tab shows its parent and says so (${goneSt.state || goneLive})`,
      goneSt.name === LAB && /nested is no longer there; showing cleanup-lab\./.test(`${goneSt.state} ${goneLive}`), JSON.stringify({ state: goneSt.state, goneLive }));
    await t.app((T) => {
      document.getElementById('b-tab-inspector').click();
      T.api.select(null);
      return true;
    });
  },
};

/* ====================================================================== */

const cleanupRegions = {
  name: 'cleanup-regions',
  title: 'Cleanup in region mode: the service counts, a row not held, a late answer dropped',
  data: 'fixture',
  regions: 0,
  timeout: 240000,
  async run(t) {
    await t.settle();
    const regions = await t.app((T) => !!T.S.regions);
    t.check('the page draws in regions', regions);
    if (!regions) return;
    await t.waitFor((T) => T.S.survey && !T.S.survey.pending, { timeout: 30000, what: 'the service\'s survey' });
    // The service's questions go through the region worker, out of the
    // page's network log: the page counts them (T.asked).
    const asks = () => t.app((T) => T.asked.cleanup || 0);
    const c0 = await asks();
    await t.app(() => { document.getElementById('b-tab-cleanup').click(); return true; });
    const s0 = await drawn(t, '', (s) => s.groups.length === 4);
    await t.sleep(400);
    const q0 = (await asks()) - c0;
    t.check(`choosing the tab asks the service once (${q0}), for the root, and says it counted across every level (${s0.state})`,
      q0 === 1 && s0.at === '' && /Counted by the service across every level\./.test(s0.state || ''), JSON.stringify({ q0, state: s0.state }));
    const direct = await t.app((T) => T.api.ask('cleanup', { under: '', limit: '1000' }));
    t.check('the counts equal the route\'s own answer', ['caches', 'stale', 'empty'].every((k) => grp(s0, k).count === direct[k].total && grp(s0, k).bytes === (k === 'empty' ? 0 : direct[k].bytes)),
      JSON.stringify({ page: s0.groups.map((g) => [g.id, g.count, g.bytes]), direct: ['caches', 'stale', 'empty'].map((k) => [k, direct[k].total, direct[k].bytes]) }));
    t.check('moves are unavailable in read-only mode', s0.move.off && s0.groups.every((g) => !g.btn || g.btn.off));

    // A row whose node is not held: resolved, then selected.
    const g = s0.groups.find((x) => x.rows.length && x.id !== 'dups');
    await t.eval((id) => { document.querySelector(`#b-panel-cleanup [data-group=${id}]`).open = true; return true; }, g.id);
    const row = g.rows.find((r) => r.rel.split('/').length >= 2) || g.rows[0];
    const heldBefore = await t.app((T, r) => !!T.S.model.find(r), row.rel);
    await press(t, `#b-panel-cleanup button.cl-item[data-rel="${row.rel.replace(/"/g, '\\"')}"]`);
    const got = await t.waitFor((T, r) => T.S.primary && T.api.relPath(T.S.primary) === r && T.api.relPath(T.S.primary), { args: [row.rel], timeout: 15000, what: 'the row selected' });
    t.check(`a row ${heldBefore ? 'held' : 'not held'} before is resolved and selected (${got})`, got === row.rel);

    // While the service counts: the new folder's head at once, never the
    // last folder's groups under it; a recount of the same folder dims
    // them and nothing can be moved.
    await t.app(() => {
      window.__clSeen = [];
      const P = document.getElementById('b-panel-cleanup');
      const mo = new MutationObserver(() => {
        const st = P.querySelector('.cl-state');
        if (!st || st.hidden || !/^Counting across every level/.test(st.textContent)) return;
        const b = P.querySelector('.cl-move .btn');
        window.__clSeen.push({
          name: P.querySelector('.insp-name').textContent, summary: !P.querySelector('.cl-summary').hidden, groups: P.querySelectorAll('.cl-group').length,
          waiting: P.querySelector('.cl-body').classList.contains('is-waiting'), move: b ? b.textContent : null,
        });
      });
      mo.observe(P, { subtree: true, childList: true, characterData: true, attributes: true });
      window.__clStop = () => { mo.disconnect(); return window.__clSeen; };
      return true;
    });

    // Two re-scopes in quick succession: only the last renders.
    const c1 = await asks();
    await t.app((T) => {
      const run = () => T.api.COMMANDS.get('cleanup').items()[0].run();
      T.api.select(T.S.model.find('edge cases'));
      run();
      T.api.select(T.S.model.find('archives'));
      run();
      return true;
    });
    const last = await drawn(t, 'archives', () => true, 'the last re-scope');
    await t.sleep(600);
    const final = await t.eval(cl);
    const q1 = (await asks()) - c1;
    t.check(`re-scoped twice quickly, the service is asked once (${q1}) and only the last renders (${final.at})`, last.name === 'archives' && final.at === 'archives' && q1 === 1, String(q1));
    // Back to the root, whose groups hold something to move, and counted again there.
    await press(t, '#b-panel-cleanup .cl-where');
    await drawn(t, '', (s) => s.groups.length === 4, 'the root');
    const c2 = await asks();
    await t.app((T) => { T.api.refreshDirs(['']); return true; });
    await t.waitFor((T, k) => (T.asked.cleanup || 0) > k, { args: [c2], timeout: 15000, what: 'the recount asked' }).catch(() => null);
    await drawn(t, '', (s) => s.groups.length === 4, 'the recount');
    const ROOT = await t.app((T) => T.S.info.name);
    const seen = await t.app(() => window.__clStop());
    const fresh = seen.filter((x) => x.name === 'archives' && !x.summary && x.groups === 0);
    const recount = seen.filter((x) => x.name === ROOT && x.summary && x.waiting && /unavailable: still counting/.test(x.move || ''));
    t.check(`while the service counts a new folder its head shows at once, with nothing of the last folder's (${fresh.length}); a recount dims the same folder's and nothing can be moved (${recount.length})`,
      fresh.length > 0 && recount.length > 0, JSON.stringify(seen.slice(-6)));

    // The tree read again: a client being replaced answers null for every
    // path, which is not the folder gone.
    await t.app((T) => {
      T.api.select(T.S.model.find('archives'));
      T.api.COMMANDS.get('cleanup').items()[0].run();
      return true;
    });
    await drawn(t, 'archives', () => true, 'archives again');
    const before = await t.live();
    const closed = await t.app((T) => {
      window.__oldRegions = T.S.regions;
      T.S.regions.close();
      T.api.COMMANDS.get('cleanup').items()[0].run();
      return T.S.regions.stale;
    });
    await t.sleep(800);
    const keptSt = await t.eval(cl);
    const keptLive = await t.live();
    await t.app((T) => { T.api.rescan(); return true; });
    const reread = await drawn(t, 'archives', () => true, 'the folder once the tree is open again');
    const swapped = await t.app((T) => T.S.regions !== window.__oldRegions && !T.S.regions.stale);
    t.check(`while the tree is read again the folder is kept (${keptSt.name}; ${keptSt.state}), never "no longer there", and counted again once it is open`,
      closed && keptSt.name === 'archives' && /^Reading the tree again/.test(keptSt.state || '') && !/no longer there/.test(`${keptLive} ${await t.live()}`) && reread.name === 'archives' && swapped,
      JSON.stringify({ closed, name: keptSt.name, state: keptSt.state, before, keptLive, swapped }));
    await t.app((T) => {
      document.getElementById('b-tab-inspector').click();
      T.api.select(null);
      return true;
    });
  },
};

export default [cleanup, cleanupDisk, cleanupRegions];
