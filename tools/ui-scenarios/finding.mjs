/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Finding Your Way Scenarios (Terrane Edition - v1.0)
 *     - File Name: finding.mjs
 *     - Relative Path: tools/ui-scenarios/finding.mjs
 *     - Artifact Type: test
 *     - Version: 1.0.0
 *     - Date: 11/13/2026
 *     - Update: Friday, November 13, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Changelog:
 *     - 1.0.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] —
 *       Initial release.
 *
 * ✒ Description:
 *     Drives the command palette, the remembered view and links, and the
 *     search history, saved searches and in: in the real page, by
 *     keyboard where a person would, in both passes. Three scenarios on
 *     the default fixture: palette, resume and searches.
 *
 * ✒ Key Features:
 *     - palette: Ctrl+K from the world and from the list opens the sheet
 *       with focus in its field; the arrows, Home and End move
 *       aria-activedescendant; "age" puts Lens: age first and Enter sets
 *       it; a folder and a file by name land where they should, with the
 *       list focused and its cursor on the file; Escape gives focus back;
 *       without WebGL an action that needs it says why; Ctrl+K in Find is
 *       left to the browser
 *     - resume: the lens, the Survey tab, a folder and two selected items
 *       come back after a reload, and with WebGL the eye within 2% of the
 *       folder box's width of where it stood; an address opens its folder,
 *       a changed address goes there (a file's selects it), a bogus one
 *       says so; Copy link, from the palette and the menu
 *     - searches: ArrowUp and ArrowDown through the history and back to
 *       the draft, then into the list; storage keeps 20, newest first;
 *       Save search, its Places row, Run, Forget and Undo, the same name
 *       updated; in:. and in:"edge cases" count exactly the folder's
 *       descendants, in any case, and say so; a saved search from the
 *       palette
 *
 * ✒ Usage Instructions:
 *     node tools/ui-check.mjs palette resume searches --port 5010
 *
 * ✒ Other Important Information:
 *     - Dependencies: tools/ui-check.mjs (the context t); the fixture's
 *       folders edge cases, bulk-write and archives and its file copy-a.dat
 *     - Compatible platforms: Node.js 22.5+
 * ----------------------------------------------------------------------------
 */

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** The palette as it stands: open, focus, the options and the active one. */
const sheet = () => {
  const dlg = document.getElementById('dialog');
  const input = dlg.querySelector('[role=combobox]');
  const opts = [...dlg.querySelectorAll('#palette-list [role=option]')];
  const act = input?.getAttribute('aria-activedescendant') || null;
  const activeEl = act ? document.getElementById(act) : null;
  return {
    open: dlg.open && dlg.classList.contains('is-palette'),
    focus: document.activeElement === input,
    n: opts.length,
    places: opts.filter((o) => o.classList.contains('is-place')).length,
    first: opts[0]?.querySelector('.pal-label')?.textContent ?? null,
    firstPlace: opts[0]?.classList.contains('is-place') ?? false,
    firstOff: opts[0]?.getAttribute('aria-disabled') === 'true',
    firstWhy: opts[0]?.querySelector('.pal-why')?.textContent ?? null,
    active: act,
    selected: activeEl?.getAttribute('aria-selected') ?? null,
    last: opts.at(-1)?.id ?? null,
    groups: [...dlg.querySelectorAll('.palette-group')].map((g) => `${g.textContent}:${g.getAttribute('role')}`),
    expanded: input?.getAttribute('aria-expanded'),
    controls: input?.getAttribute('aria-controls'),
  };
};

const focusedId = () => document.activeElement?.id || document.activeElement?.tagName || 'body';

async function openPalette(t) {
  await t.key('Ctrl+k');
  return t.waitFor(sheet, { what: 'the palette' }).then(async () => t.waitFor(() => {
    const dlg = document.getElementById('dialog');
    return dlg.open && dlg.classList.contains('is-palette') && document.activeElement?.getAttribute('role') === 'combobox' && true;
  }, { what: 'the palette open with focus in its field' }));
}

async function closed(t) {
  await t.waitFor(() => !document.getElementById('dialog').open, { what: 'the palette to close' });
}

/* ---------- palette ---------- */

const palette = {
  name: 'palette',
  title: 'Command palette: every action, folder and file by Ctrl+K',
  data: 'fixture',
  async run(t) {
    await t.settle();
    await t.tabTo('#view');
    await openPalette(t);
    const first = await t.eval(sheet);
    const actions = await t.app((T) => [...T.api.KEYS].filter((x) => x.keys?.length && x.guide && x.palette !== false).reduce((n, x) => n + (x.labels ? Object.keys(x.labels).length : 1), 0) + [...T.api.COMMANDS].reduce((n, c) => n + c.items().length, 0));
    t.check('Ctrl+K from the world opens the palette with focus in its field, a combobox that controls the list', first.open && first.focus && first.expanded === 'true' && first.controls === 'palette-list', JSON.stringify(first));
    t.check(`an empty query lists every action and no place (${first.n})`, first.n === actions && first.places === 0 && same(first.groups, ['Actions:presentation']), `${first.n} shown, ${actions} actions, ${JSON.stringify(first.groups)}`);

    // aria-activedescendant follows the arrows, Home and End.
    const trail = [first.active];
    for (const k of ['ArrowDown', 'ArrowDown', 'ArrowUp', 'End', 'Home']) {
      await t.key(k);
      const s = await t.eval(sheet);
      trail.push(s.selected === 'true' ? s.active : `${s.active} not selected`);
    }
    t.check('aria-activedescendant follows ArrowDown, ArrowUp, End and Home, on an option marked selected',
      same(trail, ['palette-opt-0', 'palette-opt-1', 'palette-opt-2', 'palette-opt-1', first.last, 'palette-opt-0']), JSON.stringify(trail));

    await t.type('age');
    const age = await t.waitFor(() => {
      const opts = [...document.querySelectorAll('#palette-list [role=option]')];
      return opts[0]?.querySelector('.pal-label')?.textContent === 'Lens: age' && { n: opts.length };
    }, { what: 'Lens: age first' });
    const said = await t.until(() => /^\d+ actions?, \d+ places?$/.test(document.getElementById('live').textContent) && document.getElementById('live').textContent, { timeout: 2000 });
    t.check(`"age" puts Lens: age first (${age.n} options), and the live region counts them (${said})`, !!age && !!said, String(said));
    await t.key('Enter');
    await closed(t);
    const lens = await t.waitFor((T) => T.S.lens === 'age' && { lens: T.S.lens });
    t.check('Enter runs it: the Age lens', lens.lens === 'age');
    t.check(`the palette closed and focus is back in the world (${await t.eval(focusedId)})`, (await t.eval(focusedId)) === 'view');

    // From the list, and Escape.
    await t.tabTo('#ledger-list', { back: true });
    await openPalette(t);
    t.check('Ctrl+K from the ledger list opens it too', (await t.eval(sheet)).focus);
    await t.key('Escape');
    await closed(t);
    t.check(`Escape closes it and gives focus back to the list (${await t.eval(focusedId)})`, (await t.eval(focusedId)) === 'ledger-list');

    // A folder by name.
    await openPalette(t);
    await t.type('bulk-write');
    const folder = await t.waitFor(() => {
      const o = document.querySelector('#palette-list [role=option]');
      return o?.classList.contains('is-place') && o.querySelector('.pal-label')?.textContent === 'bulk-write' && { groups: [...document.querySelectorAll('.palette-group')].map((g) => g.textContent) };
    }, { what: 'bulk-write as the first place' });
    t.check('a folder\'s name puts it first, under Places', same(folder.groups, ['Places']), JSON.stringify(folder.groups));
    await t.key('Enter');
    await closed(t);
    const landed = await t.waitFor((T) => T.S.focus.n === 'bulk-write' && T.S.tab === 'contents' && {
      focus: document.activeElement?.id, label: document.getElementById('ledger-list').getAttribute('aria-label'),
    }, { timeout: 12000, what: 'the location at bulk-write' });
    t.check(`${t.gl ? 'with WebGL the location lands there' : 'without WebGL Contents shows the folder'}, and the list has focus (${landed.label})`,
      landed.focus === 'ledger-list' && /bulk-write/.test(landed.label), JSON.stringify(landed));
    await t.settle();

    // A file by name, from the list.
    await openPalette(t);
    await t.type('copy-a.dat');
    await t.waitFor(() => document.querySelector('#palette-list [role=option] .pal-label')?.textContent === 'copy-a.dat', { what: 'copy-a.dat first' });
    await t.key('Enter');
    await closed(t);
    const file = await t.waitFor((T) => T.S.primary?.n === 'copy-a.dat' && T.S.focus === T.S.primary.p && T.list.items[T.list.cursor] === T.S.primary && {
      focus: document.activeElement?.id, sel: T.S.sel.size, tab: T.S.tab,
    }, { timeout: 12000, what: 'copy-a.dat selected with the cursor on it' });
    t.check('a file lands selected, in Contents, with the list focused and its cursor on it', file.focus === 'ledger-list' && file.sel === 1 && file.tab === 'contents', JSON.stringify(file));
    await t.settle();

    // A path, with a slash.
    await openPalette(t);
    await t.type('edge/strata-old');
    const byPath = await t.waitFor(() => {
      const o = document.querySelector('#palette-list [role=option].is-place');
      return o && { name: o.querySelector('.pal-label').textContent, path: o.querySelector('.pal-detail').textContent };
    }, { what: 'a place for a path' });
    t.check(`a query with a slash matches paths: edge/strata-old finds ${byPath.path}/${byPath.name}`, byPath.name === 'strata-old' && byPath.path === 'edge cases', JSON.stringify(byPath));
    await t.key('Escape');
    await closed(t);

    // Without WebGL, an action that needs it is listed and says why.
    await openPalette(t);
    await t.type('eye level');
    const off = await t.waitFor(sheet, { what: 'the eye-level action' }).then(() => t.waitFor(() => {
      const o = document.querySelector('#palette-list [role=option]');
      return o?.querySelector('.pal-label')?.textContent === 'Drop to eye level' && { off: o.getAttribute('aria-disabled') === 'true', why: o.querySelector('.pal-why')?.textContent ?? null };
    }, { what: 'Drop to eye level first' }));
    if (!t.gl) {
      await t.key('Enter');
      const live = await t.until(() => /unavailable/.test(document.getElementById('live').textContent) && document.getElementById('live').textContent, { timeout: 2000 });
      const still = await t.eval(sheet);
      t.check('without WebGL Drop to eye level is listed as unavailable with its reason, and Enter says why and keeps the palette open',
        off.off && /3D view/.test(off.why || '') && /^Drop to eye level is unavailable: needs the 3D view/.test(live || '') && still.open, JSON.stringify({ off, live, open: still.open }));
    } else t.check('with WebGL Drop to eye level is available', !off.off && off.why === null, JSON.stringify(off));
    await t.key('Escape');
    await closed(t);

    // Ctrl+K inside a text field is the browser's: the palette stays shut.
    await t.key('/');
    await t.key('Ctrl+k');
    await t.sleep(200);
    const inFind = await t.eval(() => ({ open: document.getElementById('dialog').open, focus: document.activeElement?.id }));
    t.check('Ctrl+K inside the Find field does not open the palette', !inFind.open, JSON.stringify(inFind));
    await t.eval(() => { if (document.getElementById('dialog').open) document.getElementById('dialog').close(); document.getElementById('q').focus(); return true; });
    await t.key('Escape');
    await t.app((T) => { T.api.setLens('kind'); return true; });
  },
};

/* ---------- resume ---------- */

const TARGET = 'edge cases';

const resume = {
  name: 'resume',
  title: 'Remembered view and links: a reload comes back, an address opens its folder',
  data: 'fixture',
  async run(t) {
    await t.settle();
    const key = await t.app((T) => `terrane.view.v1|${T.S.info.root}`);
    t.check('a fresh tab keeps no view yet', (await t.eval((k) => localStorage.getItem(k), key)) === null);
    await t.tabTo('#view');
    await t.key('2');
    await t.waitFor((T) => T.S.lens === 'age');
    await t.app((T, r) => { T.api.setFocus(T.S.model.find(r)); return true; }, TARGET);
    await t.waitFor((T, r) => T.api.relPath(T.S.focus) === r, { args: [TARGET], timeout: 12000, what: 'the location at edge cases' });
    await t.settle();
    const picked = await t.app((T) => {
      const files = T.S.focus.c.filter((c) => !c.d).sort((a, b) => a.n.localeCompare(b.n));
      T.api.select(files[0]);
      T.api.select(files[1], { add: true });
      document.querySelector('[role=tab][data-tab=survey]').click();
      return { names: [files[0].n, files[1].n].sort(), primary: files[1].n, hash: location.hash };
    });
    t.check(`the address follows the folder you are in (${picked.hash})`, picked.hash === '#/edge%20cases', picked.hash);
    const kept = await t.until((T, k) => {
      const v = JSON.parse(localStorage.getItem(k) || 'null');
      return v && v.focus === 'edge cases' && v.sel.length === 2 && v;
    }, { args: [key], timeout: 4000 });
    t.check('a second after the selection changes the view is kept', !!kept && kept.lens === 'age', JSON.stringify(kept));
    let before = null;
    if (t.gl) {
      before = await t.app(async (T, r) => {
        const P = await import(new URL('js/places.js', document.baseURI).href);
        const i = T.S.layout.index.get(T.S.model.find(r));
        return P.poseRelative(T.S.view.pose(), P.anchorOf(T.S.layout, i));
      }, TARGET);
    }

    await t.reload();
    const back = await t.waitFor((T, r) => T.S.lens === 'age' && T.S.tab === 'survey' && T.api.relPath(T.S.focus) === r && T.S.sel.size === 2 && {
      names: [...T.S.sel].map((n) => n.n).sort(), primary: T.S.primary?.n, live: document.getElementById('live').textContent,
      lensButton: document.querySelector('#lens [aria-checked=true]')?.dataset.lens, tabButton: document.querySelector('.tabs [aria-selected=true]')?.dataset.tab,
    }, { args: [TARGET], timeout: 15000, what: 'the view put back after a reload' });
    t.check('after a reload the lens, the Survey tab, the folder and the two selected items are back',
      same(back.names, picked.names) && back.primary === picked.primary && back.lensButton === 'age' && back.tabButton === 'survey', JSON.stringify(back));
    t.check(`and it is said (${back.live})`, back.live === 'Back where you were: edge cases, 2 selected', back.live);
    if (t.gl) {
      await t.settle();
      const eye = await t.app(async (T, r, pose) => {
        const P = await import(new URL('js/places.js', document.baseURI).href);
        const i = T.S.layout.index.get(T.S.model.find(r));
        if (i === undefined) return { i: -1 };
        const a = P.anchorOf(T.S.layout, i);
        const goal = P.vantage(pose, a);
        const e = T.S.view.eye;
        return { i, d: Math.hypot(e.x - goal.x, e.y - goal.y, e.z - goal.z), w: a.w };
      }, TARGET, before);
      t.check(`with WebGL the eye comes back within 2% of the folder box's width (${(eye.d / eye.w * 100).toFixed(3)}%)`, eye.i >= 0 && eye.d <= eye.w * 0.02, JSON.stringify(eye));
    }

    // The address: a changed hash goes there, a file's selects it, a bogus one says so.
    await t.eval(() => { location.hash = '#/archives'; return true; });
    const arch = await t.waitFor((T) => T.api.relPath(T.S.focus) === 'archives' && location.hash, { timeout: 12000, what: 'the location at archives' });
    t.check('a changed address goes to its folder', arch === '#/archives', arch);
    await t.settle();
    await t.eval(() => { location.hash = '#/edge%20cases/copy-a.dat'; return true; });
    const fileHash = await t.waitFor((T) => T.S.primary?.n === 'copy-a.dat' && T.api.relPath(T.S.focus) === 'edge cases' && location.hash, { timeout: 12000, what: 'copy-a.dat selected' });
    t.check(`an address that names a file goes to its folder and selects it; the address then names the folder (${fileHash})`, fileHash === '#/edge%20cases', fileHash);
    await t.settle();
    const name = await t.app((T) => T.S.model.root.n);
    await t.eval(() => { location.hash = '#/no-such-folder/here'; return true; });
    const bogus = await t.waitFor((T, n) => {
      const said = [...document.querySelectorAll('#notices .notice-text')].map((x) => x.textContent);
      return said.includes(`Nothing at no-such-folder/here in ${n}.`) && { hash: location.hash, focus: T.api.relPath(T.S.focus) };
    }, { args: [name], what: 'the bogus address said' });
    t.check('an address that names nothing says so and is put back to the folder you are in', bogus.hash === '#/edge%20cases' && bogus.focus === 'edge cases', JSON.stringify(bogus));

    // A page opened at an address goes there; only the lens comes back.
    await t.eval(() => { history.replaceState(null, '', '#/bulk-write'); return true; });
    await t.reload();
    const opened = await t.waitFor((T) => T.api.relPath(T.S.focus) === 'bulk-write' && { lens: T.S.lens, tab: T.S.tab, sel: T.S.sel.size, hash: location.hash }, { timeout: 15000, what: 'the location at bulk-write' });
    t.check('a page opened at #/bulk-write goes there; the lens comes back, the kept tab and selection do not', opened.lens === 'age' && opened.tab === 'contents' && opened.sel === 0 && opened.hash === '#/bulk-write', JSON.stringify(opened));
    await t.settle();

    // Copy link, from the palette and from the menu.
    await t.eval(() => { window.__clip = []; navigator.clipboard.writeText = async (x) => { window.__clip.push(x); }; return true; });
    await t.tabTo('#view');
    await openPalette(t);
    await t.type('copy link');
    await t.waitFor(() => document.querySelector('#palette-list [role=option] .pal-label')?.textContent === 'Copy link to here', { what: 'Copy link to here first' });
    await t.key('Enter');
    await closed(t);
    const port = await t.eval(() => location.host);
    const link = await t.waitFor((_T, h) => {
      const said = [...document.querySelectorAll('#notices .notice-text')].map((x) => x.textContent);
      return window.__clip.length === 1 && said.includes(`Link copied. It opens bulk-write while Terrane serves this directory at ${h}.`) && window.__clip[0];
    }, { args: [port], what: 'the link copied' });
    t.check(`Copy link to here puts the folder's address on the clipboard and says where it works (${link})`, link === `${await t.eval(() => location.origin + location.pathname)}#/bulk-write`, link);
    await t.tabTo('#view');
    await t.key('ContextMenu');
    const items = await t.waitFor(() => !document.getElementById('menu').hidden && [...document.querySelectorAll('#menu .menu-label')].map((x) => x.textContent), { what: 'the menu' });
    t.check('the menu for the folder you are in offers Copy link to this folder', items.includes('Copy link to this folder'), JSON.stringify(items));
    await t.key('Escape');
    const fileItems = await t.app((T) => {
      const f = T.S.focus.c.find((c) => !c.d);
      T.api.select(f);
      return T.api.MENU.get('resume').items(f).map((x) => x.label);
    });
    t.check('for a file it offers Copy link to its folder', same(fileItems, ['Copy link to its folder']), JSON.stringify(fileItems));
    await t.eval(() => { delete navigator.clipboard.writeText; return true; });
    await t.app((T) => { T.api.select(null); T.api.setLens('kind'); return true; });
  },
};

/* ---------- searches ---------- */

const searches = {
  name: 'searches',
  title: 'Search history, saved searches and in:',
  data: 'fixture',
  async run(t) {
    await t.settle();
    const q = () => document.getElementById('q').value;
    const find = async (text) => {
      await t.key('/');
      await t.type(text);
      await t.waitFor((T, x) => T.S.query === x && !!T.S.search, { args: [text], what: `the search ${text}` });
      await t.key('Enter');
      await t.waitFor(() => document.activeElement?.id === 'ledger-list', { what: 'the list after Enter' });
      await t.key('/');
      await t.key('Escape');
      await t.waitFor((T) => !T.S.search && !T.S.query, { what: 'Find cleared' });
    };
    for (const text of ['copy-', 'ext:md', 'part-0']) await find(text);
    const hist = await t.app((T) => [...T.S.searches.history]);
    t.check('Enter in Find puts each search in the history, newest first', same(hist, ['part-0', 'ext:md', 'copy-']), JSON.stringify(hist));

    await t.key('/');
    await t.type('dra');
    const steps = [];
    const says = [];
    for (const k of ['ArrowUp', 'ArrowUp', 'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowDown']) {
      await t.key(k);
      steps.push(await t.eval(q));
      says.push(await t.live());
    }
    t.check('ArrowUp loads earlier searches and stays on the oldest; ArrowDown comes back to the draft',
      same(steps, ['part-0', 'ext:md', 'copy-', 'copy-', 'ext:md', 'part-0', 'dra']), JSON.stringify(steps));
    t.check(`each step is said (${says[0]})`, says[0] === 'Earlier search 1 of 3: part-0' && says[2] === 'Earlier search 3 of 3: copy-' && says[6] === 'Back to what you typed: dra', JSON.stringify(says));
    const ran = await t.waitFor((T) => T.S.query === 'dra' && T.S.query, { what: 'the draft run again' });
    t.check('each step runs the search, as typing would', ran === 'dra');
    await t.key('ArrowDown');
    await t.waitFor(() => document.activeElement?.id === 'ledger-list', { what: 'the list after ArrowDown at the draft' });
    const after = await t.app((T) => [...T.S.searches.history]);
    t.check('at the draft ArrowDown moves to the list, as before, and the draft enters the history', same(after, ['dra', 'part-0', 'ext:md', 'copy-']), JSON.stringify(after));
    await t.key('/');
    await t.key('Escape');

    // Storage keeps 20, newest first; a search run from elsewhere enters too.
    const stored = await t.app((T) => {
      for (let i = 0; i < 25; i++) T.api.setQuery(`hist-${i}`);
      T.api.setQuery('');
      const v = JSON.parse(localStorage.getItem(`terrane.searches.v1|${T.S.info.root}`));
      return { n: v.history.length, first: v.history[0], last: v.history.at(-1) };
    });
    t.check('a search run from elsewhere enters the history, and storage keeps 20, newest first', same(stored, { n: 20, first: 'hist-24', last: 'hist-5' }), JSON.stringify(stored));

    // Save search.
    await t.app((T) => { T.api.setQuery('ext:md'); return true; });
    await t.waitFor((T) => T.S.tab === 'findings' && !!document.querySelector('[data-k="save-search"]'), { what: 'Save search on the Findings row' });
    await t.tabTo('[data-k="save-search"]', { back: true, max: 160 });
    await t.key('Enter');
    const dlg = await t.waitFor(() => document.getElementById('dialog').open && document.querySelector('#dialog input')?.value, { what: 'the Save search dialog' });
    t.check('Save search… asks a name, the query by default', dlg === 'ext:md', dlg);
    await t.type('Markdown');
    await t.key('Enter');
    const saved = await t.waitFor((T) => T.S.searches.saved.length === 1 && [...document.querySelectorAll('#notices .notice-text')].map((x) => x.textContent).find((x) => /^Search saved as/.test(x)), { what: 'the saved notice' });
    t.check(`it is saved under the name (${saved})`, saved === 'Search saved as "Markdown". Run it from the Places tab or the command palette.', saved);
    t.check('focus is back on the button', (await t.eval(() => document.activeElement?.dataset?.k)) === 'save-search');

    // The Places row: Run, Forget and Undo.
    await t.app(() => { document.querySelector('[role=tab][data-tab=places]').click(); return true; });
    const row = await t.waitFor((T) => {
      const r = document.querySelector('#ledger-rich .places-searches .saved-search');
      return r && { name: r.querySelector('.nm').textContent, query: r.querySelector('code').textContent, id: T.S.searches.saved[0].id };
    }, { what: 'the Saved searches row' });
    t.check('the Places tab lists it with its query', row.name === 'Markdown' && row.query === 'ext:md', JSON.stringify(row));
    await t.app(() => { document.querySelector('[role=tab][data-tab=contents]').click(); return true; });
    await t.app(() => { document.getElementById('q').value = ''; return true; });
    await t.app((T) => { T.api.setQuery(''); document.querySelector('[role=tab][data-tab=places]').click(); return true; });
    await t.eval((id) => { document.querySelector(`[data-k="ss:${id}:run"]`).focus(); return true; }, row.id);
    await t.key('Enter');
    const run = await t.waitFor((T) => T.S.query === 'ext:md' && T.S.tab === 'findings' && document.activeElement?.id === 'ledger-list' && T.S.search.list.length, { what: 'the saved search run' });
    t.check(`Run puts it in Find and the list takes focus (${run} matches)`, run > 0);
    await t.app(() => { document.querySelector('[role=tab][data-tab=places]').click(); return true; });
    await t.eval((id) => { document.querySelector(`[data-k="ss:${id}:forget"]`).focus(); return true; }, row.id);
    await t.key('Enter');
    const gone = await t.waitFor((T) => T.S.searches.saved.length === 0 && [...document.querySelectorAll('#notices .notice')].find((n) => /is forgotten/.test(n.textContent))?.querySelector('.btn')?.textContent, { what: 'the forget notice' });
    t.check('Forget takes it out, with Undo in the notice', gone === 'Undo', gone);
    await t.app(() => { [...document.querySelectorAll('#notices .notice')].find((n) => /is forgotten/.test(n.textContent)).querySelector('.btn').click(); return true; });
    const undone = await t.waitFor((T) => T.S.searches.saved.length === 1 && document.querySelector('#ledger-rich .saved-search .nm')?.textContent, { what: 'Undo' });
    t.check('Undo puts it back, in the Places tab too', undone === 'Markdown');
    const upd = await t.app((T) => T.S.searches.save('markdown', 'ext:md newer:9999d'));
    t.check('the same name in any case takes the new query', upd.updated === true && (await t.app((T) => T.S.searches.saved.length)) === 1);

    // A saved search from the palette.
    await t.app((T) => { T.api.setQuery(''); return true; });
    await t.tabTo('#view');
    await openPalette(t);
    await t.type('run saved');
    await t.waitFor(() => /^Run saved search: /.test(document.querySelector('#palette-list [role=option] .pal-label')?.textContent || ''), { what: 'the saved search in the palette' });
    await t.key('Enter');
    await closed(t);
    const fromPalette = await t.waitFor((T) => T.S.query === 'ext:md newer:9999d' && T.S.query, { what: 'the saved search from the palette' });
    t.check('the palette runs a saved search', fromPalette === 'ext:md newer:9999d');

    // in:
    await t.app((T) => { T.api.setFocus(T.S.model.find('edge cases')); return true; });
    await t.waitFor((T) => T.S.focus.n === 'edge cases', { timeout: 12000, what: 'the location at edge cases' });
    await t.settle();
    const ins = await t.app((T) => {
      const dir = T.S.model.find('edge cases');
      let all = 0;
      let txt = 0;
      const stack = [dir];
      while (stack.length) {
        const d = stack.pop();
        for (const c of d.c) {
          all++;
          if (!c.d && /\.txt$/i.test(c.n)) txt++;
          if (c.d) stack.push(c);
        }
      }
      const run = (query) => {
        T.api.setQuery(query);
        return { n: T.S.search ? T.S.search.list.length : -1, note: T.S.search?.note || '' };
      };
      const out = { all, txt, dot: run('in:.'), quoted: run('in:"edge cases"'), cased: run('in:"Edge Cases"'), ext: run('ext:txt in:"edge cases"'), none: run('in:nowhere'), rel: run('in:./strata-old') };
      T.api.setQuery('');
      return out;
    });
    t.check(`in:. counts exactly the descendants of the folder you are in (${ins.all})`, ins.dot.n === ins.all && ins.all > 0, JSON.stringify(ins.dot));
    t.check('in:"edge cases" counts the same, in any case, and Findings says which folder',
      ins.quoted.n === ins.all && ins.cased.n === ins.all && /^In edge cases: /.test(ins.quoted.note), JSON.stringify([ins.quoted, ins.cased]));
    t.check(`in: combines with other tokens (${ins.txt} .txt files)`, ins.ext.n === ins.txt, JSON.stringify(ins.ext));
    t.check('a folder that is not there matches nothing, and says so', ins.none.n === 0 && ins.none.note === 'No folder nowhere in this directory.', JSON.stringify(ins.none));
    t.check('in:./x is a folder under the one you are in', ins.rel.n === 2 && /^In edge cases\/strata-old: /.test(ins.rel.note), JSON.stringify(ins.rel));
    await t.app((T) => { T.api.setFocus(T.S.model.root); return true; });
    await t.settle();
  },
};

export default [palette, resume, searches];
