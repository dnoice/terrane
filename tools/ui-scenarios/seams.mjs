/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Controller Seams Scenario (Terrane Edition - v1.3)
 *     - File Name: seams.mjs
 *     - Relative Path: tools/ui-scenarios/seams.mjs
 *     - Artifact Type: test
 *     - Version: 1.3.0
 *     - Date: 11/12/2026
 *     - Update: Thursday, November 12, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Changelog:
 *     - 1.3.0 (11/12/2026) [dendogg + Anthropic - Claude Opus 5.5] — With
 *       features installed: the controller's own entries are told from a
 *       feature's by owner and compared as before, the guide and Reading
 *       rows are compared without the features' sections and rows, an
 *       owner's reserved key may already be held by its own feature, and
 *       the dispatch tests use the free keys K, Y and U.
 *     - 1.2.0 (11/12/2026) [dendogg + Anthropic - Claude Opus 5.5] — The
 *       survey hooks start with the controller's own age-table hook, and
 *       S.ages holds that table once the first survey is done.
 *     - 1.0.0 (11/12/2026) [dendogg + Anthropic - Claude Opus 5.5] —
 *       Initial release.
 *
 * ✒ Description:
 *     Checks the registries app.js hands to feature modules, in the real
 *     page: the controller's own entries reproduce what the hard-coded
 *     chains did, and an entry added the way a feature would add it takes
 *     effect where it should, in order, by keyboard where a person would
 *     use it. Every test entry is removed again before the scenario ends.
 *
 * ✒ Key Features:
 *     - Any data, both passes; pins and hover lines need WebGL
 *     - The guide, the Reading rows and the tab buttons are compared with
 *       the text the hard-coded versions produced
 *     - The fixed key allocation: reserved and taken keys are refused,
 *       owners may bind theirs (or already hold them through their
 *       feature), inList is honoured, and a run() that returns false
 *       leaves the key to the browser
 *     - Entries a feature module adds carry its owner and are left out of
 *       the comparisons with the controller's own
 *     - Escape order (a date-scrub slot between kind filter and search),
 *       and typing: false entries stay out of text fields
 *     - Pins add up in source order and stop at 3,000; hover lines,
 *       inspector sections, tabs, layout options and the after-layout,
 *       refresh and survey hooks each take effect
 *     - The only hook the controller registers itself is the survey hook
 *       that rebuilds the shared age table
 *     - Feature search tokens through parseQuery's is: and prefix tables
 *     - install(api) reports a module that fails and starts the rest
 *
 * ✒ Usage Instructions:
 *     node tools/ui-check.mjs seams
 *
 * ✒ Other Important Information:
 *     - Dependencies: tools/ui-check.mjs (the context t)
 *     - Compatible platforms: Node.js 22.5+
 * ----------------------------------------------------------------------------
 */

/** The guide as the hard-coded showGuide drew it before the key table. */
const GUIDE = [
  ['Travelling', [['Wheel', 'Fly toward what is under the cursor'], ['Drag', 'Slide the ground'], ['Right-drag', 'Orbit the point you grabbed'], ['Alt+drag', 'Look around'], ['W A S D', 'Move (Shift: faster)'], ['Q  E', 'Turn'], ['R  F', 'Rise / descend'], ['V', 'Drop to eye level'], ['0', 'Rise to the overview'], ['G', 'Fly to the selection'], ['Double-click', 'Fly to folder / open file']]],
  ['Selecting and going places', [['Click', 'Select'], ['Ctrl+click', 'Add to selection'], ['← →', 'Previous / next sibling'], ['↑ ↓', 'Parent / first child'], ['Enter', 'Go to folder / open file'], ['Backspace', 'Up one level'], ['Alt+←', 'Back'], ['/', 'Find'], ['Esc', 'Cancel, clear'], ['[  ]', 'Hide ledger / inspector'], ['1 – 4', 'Lens']]],
  ['Changing things', [['N', 'New folder'], ['F2', 'Rename'], ['M', 'Move to…'], ['Ctrl+D', 'Duplicate'], ['Del', 'Remove to holding area'], ['Ctrl+Z', 'Undo'], ['Ctrl+C', 'Copy path'], ['Drag a row', 'Drop on a folder, breadcrumb or plateau'], ['Menu key', 'Context menu'], ['F5', 'Re-read folder']]],
];

/** The Reading rows as drawInspector listed them. */
const READING = [
  ['glyph g-foot', 'Footprint is storage', 'Ground area is share of the parent folder.'],
  ['glyph g-elev', 'Elevation is nesting', 'Each level stands one step up, one tone lighter, and one scale smaller.'],
  ['glyph g-height', 'Height is recency', 'Fresh files stand tall; untouched ones wear down flat.'],
  ['glyph g-mass', 'Closed mass', 'A folder seen from afar. Taller means more levels inside. Approach and it opens.'],
  ['glyph g-scree', 'Scree', 'Items too small to see from here, gathered into one tile. Go closer.'],
  ['glyph g-seal', 'Hatched', 'Sealed: the folder could not be read.'],
  ['glyph g-empty', 'Hollow', 'An empty folder.'],
  ['glyph g-pin', 'Pin', 'Vermilion marks a search match; ink marks a heavyweight file.'],
];

const OWNERS = {
  w: 'viewport', a: 'viewport', s: 'viewport', d: 'viewport', q: 'viewport', e: 'viewport', r: 'viewport', f: 'viewport',
  i: 'interiors', t: 'time', ',': 'time', '.': 'time', '<': 'time', '>': 'time', b: 'landmarks', h: 'landmarks', j: 'landmarks',
};

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** Reads the open guide dialog: [[title, [[keys, text], ...]], ...]. */
const readGuide = () => [...document.querySelectorAll('#dialog .guide > div')].map((d) => [
  d.querySelector('h3').textContent,
  [...d.querySelectorAll('dt')].map((dt) => [dt.textContent, dt.nextElementSibling.textContent]),
]);

/** Silences console.error in the page and records it, for checks that make errors on purpose. */
const muteErrors = (on) => {
  if (on) {
    window.__seamErrors = [];
    window.__seamConsole = console.error;
    console.error = (...a) => window.__seamErrors.push(a.map((x) => (x instanceof Error ? x.message : String(x))).join(' '));
  } else if (window.__seamConsole) {
    console.error = window.__seamConsole;
    delete window.__seamConsole;
  }
  return window.__seamErrors;
};

async function query(t, text) {
  await t.key('/');
  await t.type(text);
  const got = await t.waitFor((T, q) => T.S.query === q && T.S.search && { n: T.S.search.list.length, names: T.S.search.list.slice(0, 50).map((x) => x.n) }, { args: [text] });
  await t.key('Escape');
  await t.waitFor((T) => !T.S.search);
  return got;
}

export default {
  name: 'seams',
  title: 'Controller seams: registries, the key table and install(api)',
  async run(t) {
    await t.settle();
    const start = await t.app(async (T) => {
      const a = T.api;
      const regs = ['KEYS', 'ESCAPE', 'PIN_SOURCES', 'TIP_LINES', 'READING', 'TABS', 'LAYOUT_OPTS', 'AFTER_LAYOUT', 'AFTER_REFRESH', 'AFTER_SURVEY'];
      const mod = await import(new URL('js/features.js', document.baseURI).href);
      // A feature's entries carry its owner; the controller's carry none, or 'core'.
      const own = (reg) => [...reg].filter((x) => !x.owner || x.owner === 'core').map((x) => x.id);
      const byFeature = (reg) => [...reg].filter((x) => x.owner && x.owner !== 'core');
      return {
        frozen: Object.isFrozen(a) && regs.every((n) => Object.isFrozen(a[n])) && Object.isFrozen(a.INSPECTOR) && Object.isFrozen(a.QUERY),
        slots: ['time', 'interior', 'places', 'sessions'].every((k) => k in T.S && T.S[k] === null)
          && 'ages' in T.S && typeof T.S.ages?.kept === 'function' && T.S.ages.folders === T.S.model.root.dc + 1,
        ids: Object.fromEntries([...regs.map((n) => [n, own(a[n])]), ['focus', own(a.INSPECTOR.focus)], ['node', own(a.INSPECTOR.node)]]),
        all: Object.fromEntries([...regs.map((n) => [n, a[n].ids()]), ['focus', a.INSPECTOR.focus.ids()], ['node', a.INSPECTOR.node.ids()]]),
        featureSections: [...new Set(byFeature(a.KEYS).filter((x) => x.guide).map((x) => x.guide[0]))],
        featureReading: byFeature(a.READING).map((x) => x.title),
        tokens: Object.keys(a.QUERY.is).length + Object.keys(a.QUERY.prefix).length,
        owners: { ...a.KEY_OWNERS },
        ownersFrozen: Object.isFrozen(a.KEY_OWNERS),
        features: Array.isArray(mod.FEATURES),
        tabs: [...document.querySelectorAll('.tabs [role=tab]')].map((b) => `${b.dataset.tab}:${b.textContent}:${b.getAttribute('aria-selected')}`),
      };
    });
    const ids = start.ids;
    const ownGuide = (g) => g.filter(([title]) => !start.featureSections.includes(title));
    const featureIds = Object.entries(start.all).map(([n, list]) => [n, list.filter((id) => !ids[n].includes(id))]).filter(([, l]) => l.length);
    t.note(`feature entries left out of the comparisons: ${featureIds.map(([n, l]) => `${n} ${l.join(' ')}`).join('; ') || 'none'}`);
    t.check('the api and every registry are frozen', start.frozen);
    t.check('S declares time, interior, places and sessions as null; ages holds the age table the survey built', start.slots);
    t.check('features.js exports the FEATURES list', start.features);
    t.check('Escape, pins and hover lines hold the controller entries in order',
      same(ids.ESCAPE, ['floating', 'placing', 'kind-filter', 'search', 'selection']) && same(ids.PIN_SOURCES, ['search', 'heavy'])
      && same(ids.TIP_LINES, ['levels', 'matches', 'placing', 'copies', 'pixels']), JSON.stringify([ids.ESCAPE, ids.PIN_SOURCES, ids.TIP_LINES]));
    t.check('the inspector, Reading and tab registries hold the controller entries in order',
      same(ids.focus, ['title', 'facts', 'composition', 'reading']) && same(ids.node, ['title', 'path', 'facts', 'composition', 'copies', 'actions', 'preview'])
      && ids.READING.length === 8 && same(ids.TABS, ['contents', 'findings', 'survey', 'journal']), JSON.stringify([ids.focus, ids.node, ids.TABS]));
    t.check('layout options, hooks and search tokens start empty, apart from the age table\'s survey hook',
      !ids.LAYOUT_OPTS.length && !ids.AFTER_LAYOUT.length && !ids.AFTER_REFRESH.length && same(ids.AFTER_SURVEY, ['ages']) && start.tokens === 0, JSON.stringify(ids.AFTER_SURVEY));
    t.check('the key allocation is fixed: I Interiors, T , . < > Time, B H J Landmarks, the canvas keeps W A S D Q E R F',
      same(start.owners, OWNERS) && start.ownersFrozen, JSON.stringify(start.owners));
    t.check('the tab buttons are made from TABS, Contents selected', same(start.tabs, ['contents:Contents:true', 'findings:Findings:false', 'survey:Survey:false', 'journal:Journal:false']), JSON.stringify(start.tabs));

    // The guide, made from the key table, says what it said before.
    await t.key('?');
    await t.waitFor(() => document.getElementById('dialog').open);
    const guide = await t.eval(readGuide);
    t.check('the guide made from KEYS lists the same sections and rows as before, any feature sections after them',
      same(ownGuide(guide), GUIDE) && same(guide.slice(0, GUIDE.length), GUIDE), JSON.stringify(guide).slice(0, 400));
    await t.key('Escape');
    await t.waitFor(() => !document.getElementById('dialog').open);

    // install(api): a module that throws is reported; the others start.
    await t.eval(muteErrors, true);
    await t.app((T) => {
      window.__seam = { t: [], h: 0, prevented: [], esc: false, after: [], refresh: [], survey: [], seen: [] };
      T.install([
        { name: 'Seam one', install(api) { window.__seam.api = api === T.api; api.READING.add({ id: 'seam-installed', order: 86, glyph: 'g-pin', title: 'Installed', text: 'By install(api).' }); } },
        { name: 'Seam broken', install() { throw new Error('on purpose'); } },
        { name: 'Seam late', async install() { throw new Error('later'); } },
        { name: 'Seam three', install() { window.__seam.three = true; } },
      ]);
    });
    const inst = await t.waitFor(() => {
      const said = [...document.querySelectorAll('#notices .notice-text')].map((n) => n.textContent);
      return said.some((s) => s === 'Seam late could not start: later') && { said, seam: window.__seam };
    });
    const errs = await t.eval(muteErrors, false);
    t.check('install(api) hands every module the same api, and the modules after a failure still start', inst.seam.api && inst.seam.three);
    t.check('a module that fails to start is named in a notice, thrown or rejected',
      inst.said.includes('Seam broken could not start: on purpose') && inst.said.includes('Seam late could not start: later'), JSON.stringify(inst.said));
    t.check('and reported on the console', errs.length === 2 && errs.every((e) => /could not start/.test(e)), JSON.stringify(errs));

    // The key table: allocation, collisions and the rules for an entry.
    const rules = await t.app((T) => {
      const K = T.api.KEYS;
      const tryAdd = (x) => {
        try {
          K.add(x);
          K.remove(x.id);
          return 'ok';
        } catch (err) {
          return err.message;
        }
      };
      const run = () => {};
      return {
        stolen: tryAdd({ id: 'seam-steal', owner: 'landmarks', keys: ['t'], run }),
        unowned: tryAdd({ id: 'seam-anon', keys: [','], run }),
        canvas: tryAdd({ id: 'seam-canvas', owner: 'time', keys: ['W'], run }),
        taken: tryAdd({ id: 'seam-taken', owner: 'core', keys: ['N'], run }),
        sameId: tryAdd({ id: 'undo', keys: ['k'], run }),
        noRun: tryAdd({ id: 'seam-norun', keys: ['k'] }),
        nothing: tryAdd({ id: 'seam-nothing' }),
        badMod: tryAdd({ id: 'seam-mod', mod: 'shift', keys: ['k'], run }),
        ctrlB: tryAdd({ id: 'seam-ctrl-b', mod: 'ctrl', keys: ['b'], run }),
        // A reserved key is either free for its owner or already held by
        // an entry of that owner (its feature is installed).
        owned: ['i:interiors', 't:time', ',:time', '.:time', '<:time', '>:time', 'b:landmarks', 'h:landmarks', 'j:landmarks']
          .map((s) => {
            const [k, owner] = [s.slice(0, s.indexOf(':')), s.slice(s.indexOf(':') + 1)];
            const held = [...K].find((x) => !x.mod && x.keys?.some((z) => (z.length === 1 ? z.toLowerCase() : z) === k));
            if (held) return held.owner === owner ? 'ok' : `held by ${held.owner}`;
            return tryAdd({ id: `seam-own-${owner}`, owner, keys: [k], run });
          }),
        free: tryAdd({ id: 'seam-free', owner: 'anyone', keys: ['k'], run }),
      };
    });
    t.check('a reserved key is refused to another owner', /belongs to time/.test(rules.stolen) && /belongs to time/.test(rules.unowned), `${rules.stolen} | ${rules.unowned}`);
    t.check('the canvas travel keys are refused, in either case', /belongs to viewport/.test(rules.canvas), rules.canvas);
    t.check('a key already bound is refused, and so is a second entry with one id', /already bound to "new-folder"/.test(rules.taken) && /already registered/.test(rules.sameId), `${rules.taken} | ${rules.sameId}`);
    t.check('an entry needs run() with keys, keys or a guide row, and a known mod',
      /needs run/.test(rules.noRun) && /neither keys nor a guide row/.test(rules.nothing) && /unknown mod/.test(rules.badMod), `${rules.noRun} | ${rules.nothing} | ${rules.badMod}`);
    t.check('owners bind their reserved keys, Ctrl chords are outside the allocation, and free keys are free',
      rules.owned.every((r) => r === 'ok') && rules.ctrlB === 'ok' && rules.free === 'ok', JSON.stringify([rules.owned, rules.ctrlB, rules.free]));

    await t.app((T) => {
      const K = T.api.KEYS;
      const where = () => (document.activeElement?.id || document.activeElement?.className || 'body');
      K.add({ id: 'seam-t', owner: 'seams', keys: ['k'], run: () => { window.__seam.t.push(where()); }, guide: ['Seams', 'K', 'A test row'] });
      K.add({ id: 'seam-h', owner: 'seams', keys: ['y'], inList: false, run: () => { window.__seam.h++; } });
      K.add({ id: 'seam-j', owner: 'seams', keys: ['u'], run: () => false });
      window.__seamListen = (e) => { if ('kyuKYU'.includes(e.key)) window.__seam.prevented.push(`${e.key}:${e.defaultPrevented}`); };
      window.addEventListener('keydown', window.__seamListen);
    });
    await t.tabTo('#view');
    await t.keys('k', 'y', 'u');
    await t.tabTo('#ledger-list', { back: true });
    await t.keys('K', 'y');
    const disp = await t.app(() => window.__seam);
    t.check('a registered key runs from the canvas and, with inList, from the ledger list, in either case', same(disp.t, ['view', 'ledger-list']), JSON.stringify(disp.t));
    t.check('inList: false keeps a key from acting while the ledger list has focus', disp.h === 1, `h ran ${disp.h} times`);
    t.check('a used key is kept from the browser; run() returning false leaves it to the browser',
      same(disp.prevented, ['k:true', 'y:true', 'u:false', 'K:true', 'y:false']), JSON.stringify(disp.prevented));
    await t.key('?');
    await t.waitFor(() => document.getElementById('dialog').open);
    const guide2 = await t.eval(readGuide);
    const own2 = ownGuide(guide2);
    t.check('a feature row appears in the guide under its own section', same(own2.slice(0, 3), GUIDE) && same(own2[3], ['Seams', [['K', 'A test row']]]) && own2.length === 4, JSON.stringify(guide2.slice(3)));
    await t.key('Escape');
    await t.waitFor(() => !document.getElementById('dialog').open);
    await t.app((T) => {
      for (const id of ['seam-t', 'seam-h', 'seam-j']) T.api.KEYS.remove(id);
      window.removeEventListener('keydown', window.__seamListen);
    });
    await t.tabTo('#view');
    await t.key('k');
    t.check('a removed key does nothing', (await t.app(() => window.__seam.t.length)) === 2);

    // Escape: a slot between the kind filter and search, and text fields.
    await t.app((T) => {
      T.api.ESCAPE.add({ id: 'seam-escape', order: 40, active: () => window.__seam.esc, clear: () => { window.__seam.esc = false; } });
      T.S.kindFilter = 0;
      window.__seam.esc = true;
      T.api.repaint();
    });
    const term = t.manifest ? 'copy-a.dat' : 'ext:md';
    await t.key('/');
    await t.type(term);
    await t.waitFor((T) => !!T.S.search);
    await t.key('Enter');
    const state = (T) => ({ kind: T.S.kindFilter, seam: window.__seam.esc, search: !!T.S.search });
    const steps = [];
    for (let k = 0; k < 3; k++) {
      await t.key('Escape');
      await t.sleep(220);
      steps.push(await t.app(state));
    }
    t.check('Escape clears the kind filter, then an entry at order 40, then the search',
      same(steps, [{ kind: -1, seam: true, search: true }, { kind: -1, seam: false, search: true }, { kind: -1, seam: false, search: false }]), JSON.stringify(steps));
    await t.app(() => { window.__seam.esc = true; });
    await t.key('/');
    await t.key('Escape');
    t.check('an entry without typing: true does not act from the Find field', (await t.app(() => window.__seam.esc)) === true);
    await t.app((T) => { T.api.ESCAPE.remove('seam-escape'); window.__seam.esc = false; });

    // Inspector sections and Reading rows.
    await t.eval(muteErrors, true);
    const insp = await t.app((T) => {
      const a = T.api;
      a.INSPECTOR.focus.add({ id: 'seam-focus', order: 30, build: (f) => a.el('div', { class: 'section-title', text: `Seam focus ${f.n}` }) });
      a.INSPECTOR.node.add({ id: 'seam-node', order: 40, build: () => [a.el('div', { class: 'section-title', text: 'Seam node' }), null, [a.el('p', { class: 'seam-p', text: 'nested' })]] });
      a.INSPECTOR.node.add({ id: 'seam-broken', order: 45, build: () => { throw new Error('section on purpose'); } });
      a.READING.add({ id: 'seam-reading', order: 85, glyph: 'g-pin', title: 'Seam', text: 'A test row.' });
      a.select(null);
      const titles = () => [...document.querySelectorAll('#inspector-body .section-title')].map((x) => x.textContent);
      const focus = titles();
      const rows = [...document.querySelectorAll('#inspector-body .reading li')].map((li) => [li.firstChild.className, li.querySelector('b').textContent, li.lastChild.lastChild.textContent]);
      const file = (function find(d) {
        for (const c of d.c) if (!c.d && c.s > 0) return c;
        for (const c of d.c) if (c.d) { const f = find(c); if (f) return f; }
        return null;
      })(T.S.model.root);
      a.select(file);
      return { focus, rows, node: titles(), nested: !!document.querySelector('#inspector-body .seam-p'), name: file.n };
    });
    const created = await t.waitFor(() => {
      const dt = [...document.querySelectorAll('#inspector-body dt')].find((x) => x.textContent === 'Created');
      const v = dt?.nextElementSibling?.textContent;
      return v && v !== '…' && v;
    });
    const ierrs = await t.eval(muteErrors, false);
    const ownRows = insp.rows.filter((r) => !start.featureReading.includes(r[1]));
    t.check('the Reading rows are the ones the inspector listed before, then registered rows in order',
      same(ownRows.slice(0, 8), READING) && same(ownRows.slice(8).map((r) => r[1]), ['Seam', 'Installed']), JSON.stringify(insp.rows.slice(6)));
    t.check('a focus section takes its place between Composition and Reading the world',
      insp.focus.at(-2) === `Seam focus ${(await t.app((T) => T.S.focus.n))}` && insp.focus.at(-1) === 'Reading the world', JSON.stringify(insp.focus));
    t.check('a node section takes its place before Actions, nested arrays flattened', insp.node.indexOf('Seam node') === insp.node.indexOf('Actions') - 1 && insp.nested, JSON.stringify(insp.node));
    t.check('a section that throws is reported and the rest of the inspector is drawn', ierrs.some((e) => /INSPECTOR.node "seam-broken" failed/.test(e)) && insp.node.includes('Actions'), JSON.stringify(ierrs));
    t.check(`the Created fact is still filled in from the service (${created})`, !!created);
    await t.app((T) => {
      const a = T.api;
      a.INSPECTOR.focus.remove('seam-focus');
      a.INSPECTOR.node.remove('seam-node');
      a.INSPECTOR.node.remove('seam-broken');
      a.READING.remove('seam-reading');
      a.READING.remove('seam-installed');
      a.select(null);
    });

    // A tab from the registry, reached by keyboard.
    await t.app((T) => {
      const a = T.api;
      a.TABS.add({
        id: 'seam', order: 35, label: 'Seam', count: () => 7,
        draw: (sub, host) => {
          sub.replaceChildren(a.el('span', { class: 'grow', text: 'Seam tab' }));
          host.replaceChildren(a.el('p', { class: 'note', text: 'Drawn by a registered tab.' }));
        },
      });
      a.drawTabs();
      a.drawLedger();
    });
    const tabs = await t.eval(() => [...document.querySelectorAll('.tabs [role=tab]')].map((b) => `${b.dataset.tab}:${b.textContent}`));
    t.check('a registered tab gets a button in order, with its figure', same(tabs, ['contents:Contents', 'findings:Findings', 'survey:Survey', 'seam:Seam7', 'journal:Journal']), JSON.stringify(tabs));
    await t.tabTo('[role=tab][data-tab=seam]', { back: true });
    await t.key('Enter');
    const shown = await t.waitFor((T) => T.S.tab === 'seam' && {
      rich: !document.getElementById('ledger-rich').hidden && document.getElementById('ledger-rich').textContent,
      list: document.getElementById('ledger-list').hidden,
      sub: document.getElementById('ledger-sub').textContent,
      selected: document.querySelector('[data-tab=seam]').getAttribute('aria-selected'),
    });
    t.check('Enter on it draws it in the rich panel and marks it selected',
      shown.rich === 'Drawn by a registered tab.' && shown.list && shown.sub === 'Seam tab' && shown.selected === 'true', JSON.stringify(shown));
    const gone = await t.app((T) => {
      T.api.TABS.remove('seam');
      T.api.drawTabs();
      T.api.drawLedger();
      return { tab: T.S.tab, n: document.querySelectorAll('.tabs [role=tab]').length, list: !document.getElementById('ledger-list').hidden };
    });
    t.check('a tab that goes away leaves the ledger on Contents', gone.tab === 'contents' && gone.n === 4 && gone.list, JSON.stringify(gone));

    // Layout options and the hooks.
    await t.settle();
    await t.eval(muteErrors, true);
    const lay = await t.app((T) => {
      const a = T.api;
      a.relayout({ animate: false });
      const n0 = T.S.layout.n;
      const probe = {};
      window.__seamProbe = probe;
      a.LAYOUT_OPTS.add({ id: 'seam-alias', options: (o) => { window.__seam.seen.push(Object.keys(o).sort().join(',')); return { aliases: [[probe, T.S.model.root]] }; } });
      a.LAYOUT_OPTS.add({ id: 'seam-throws', order: 60, options: () => { throw new Error('options on purpose'); } });
      a.AFTER_LAYOUT.add({ id: 'seam-throws', order: 10, run: () => { throw new Error('hook on purpose'); } });
      a.AFTER_LAYOUT.add({ id: 'seam-after', run: (L) => { window.__seam.after.push(L === T.S.layout ? L.n : -1); } });
      a.relayout({ animate: false });
      const n1 = T.S.layout.n;
      const alias = T.S.layout.index.get(probe);
      a.LAYOUT_OPTS.remove('seam-alias');
      a.LAYOUT_OPTS.remove('seam-throws');
      a.AFTER_LAYOUT.remove('seam-throws');
      a.relayout({ animate: false });
      a.AFTER_LAYOUT.remove('seam-after');
      return { n0, n1, n2: T.S.layout.n, alias, aliasAfter: T.S.layout.index.has(probe) ? 'kept' : 'gone', seen: window.__seam.seen, after: window.__seam.after };
    });
    const lerrs = await t.eval(muteErrors, false);
    t.check(`layout options are merged into buildLayout's options (an alias resolves to the root box; ${lay.n0} boxes each time)`,
      lay.alias === 0 && lay.aliasAfter === 'gone' && lay.n1 === lay.n0 && lay.n2 === lay.n0 && same(lay.seen, ['cam,force,grain,now']), JSON.stringify(lay));
    t.check('AFTER_LAYOUT runs after every relayout with the new layout, past a hook that throws',
      same(lay.after, [lay.n1, lay.n2]) && lerrs.some((e) => /AFTER_LAYOUT "seam-throws" failed/.test(e)) && lerrs.some((e) => /LAYOUT_OPTS "seam-throws" failed/.test(e)), JSON.stringify(lerrs));
    await t.settle();

    await t.app((T) => {
      const a = T.api;
      a.AFTER_REFRESH.add({ id: 'seam-refresh', run: (dirs) => { window.__seam.refresh.push([...dirs].map((d) => d === T.S.model.root)); } });
      a.AFTER_SURVEY.add({ id: 'seam-survey', run: (sv, how) => { window.__seam.survey.push([sv === T.S.survey, how.full]); } });
      a.refreshDirs(['']);
    });
    const hooks = await t.waitFor(() => window.__seam.survey.length && { refresh: window.__seam.refresh, survey: window.__seam.survey }, { timeout: 8000 });
    t.check('AFTER_REFRESH runs once per refresh with the folders re-read', same(hooks.refresh, [[true]]), JSON.stringify(hooks.refresh));
    t.check('AFTER_SURVEY runs with the new survey after a refresh, full: false', same(hooks.survey, [[true, false]]), JSON.stringify(hooks.survey));
    await t.app((T) => { T.api.AFTER_REFRESH.remove('seam-refresh'); T.api.AFTER_SURVEY.remove('seam-survey'); });

    // Feature search tokens.
    const first = await t.app((T) => {
      const a = T.api;
      const pick = T.S.model.root.c.find((c) => /^[a-z][a-z0-9]{2}/i.test(c.n)) || T.S.model.root.c.find((c) => /^[a-z]/i.test(c.n));
      a.QUERY.is.seam = (n) => n === pick;
      a.QUERY.prefix.seam = (v, raw) => { window.__seam.raw = raw; return (n) => n.n.toLowerCase().startsWith(v); };
      a.QUERY.prefix.never = () => null;
      return { n: pick.n, head: (/^[a-z][a-z0-9]{2}/i.test(pick.n) ? pick.n.slice(0, 3) : pick.n[0]).toUpperCase() };
    });
    const byIs = await query(t, 'is:seam');
    t.check('an is: word from QUERY.is finds what it names', byIs.n === 1 && byIs.names[0] === first.n, JSON.stringify(byIs));
    const byPrefix = await query(t, `seam:${first.head}`);
    const raw = await t.app(() => window.__seam.raw);
    t.check(`a prefix token from QUERY.prefix gets its value, lower-cased and as typed (${first.head})`,
      byPrefix.n > 0 && byPrefix.names.every((n) => n.toLowerCase().startsWith(first.head.toLowerCase())) && raw === first.head, JSON.stringify({ byPrefix, raw }));
    const none = await query(t, 'never:x');
    const proto = await query(t, 'is:constructor');
    t.check('a token whose maker returns no predicate matches nothing, and is:constructor is not a word', none.n === 0 && proto.n === 0, JSON.stringify([none, proto]));
    await t.app((T) => {
      for (const k of ['seam']) delete T.api.QUERY.is[k];
      for (const k of ['seam', 'never']) delete T.api.QUERY.prefix[k];
    });

    if (t.gl) {
      // Pins add up in source order and stop at the capacity.
      await t.settle();
      const pins = await t.app((T) => {
        const a = T.api;
        const v = T.S.view;
        const take = () => v.pinList.map((p) => p.color);
        const before = v.pinList.map((p) => `${p.i}:${p.color}`);
        a.PIN_SOURCES.add({ id: 'seam-places', order: 10, pins: () => [{ i: 0, color: 0x1f7f73 }] });
        a.PIN_SOURCES.add({ id: 'seam-flood', order: 40, pins: (L, room) => { window.__seam.room = room; return Array.from({ length: 5000 }, (_, k) => ({ i: k % L.n, color: 0x123456 })); } });
        a.repaint();
        const all = take();
        const heavy = all.filter((c) => c === 0x18201e).length;
        const out = { before, n: all.length, first: all[0], heavy, room: window.__seam.room, order: all.slice(0, 1 + heavy + 1) };
        a.PIN_SOURCES.remove('seam-flood');
        return out;
      });
      t.check(`pins add up in source order: places, then heavyweights (${pins.heavy}), then later sources`,
        pins.first === 0x1f7f73 && pins.order.slice(1, 1 + pins.heavy).every((c) => c === 0x18201e) && pins.order.at(-1) === 0x123456, JSON.stringify(pins.order));
      t.check('the total stops at 3,000 and each source is told the room left', pins.n === 3000 && pins.room === 3000 - 1 - pins.heavy, `${pins.n} pins, room ${pins.room}`);
      await t.key('/');
      await t.type(term);
      await t.waitFor((T) => !!T.S.search);
      const withSearch = await t.app((T) => {
        T.api.repaint();
        const c = T.S.view.pinList.map((p) => p.color);
        return { first: c[0], rest: [...new Set(c.slice(1))] };
      });
      t.check('with a search, places come first and vermilion matches follow, without heavyweights', withSearch.first === 0x1f7f73 && same(withSearch.rest, [0xe5482d]), JSON.stringify(withSearch));
      await t.key('Escape');
      await t.waitFor((T) => !T.S.search);
      const restored = await t.app((T) => {
        T.api.PIN_SOURCES.remove('seam-places');
        T.api.repaint();
        return T.S.view.pinList.map((p) => `${p.i}:${p.color}`);
      });
      t.check('without the test sources the pins are what they were', same(restored, pins.before), `${restored.length} vs ${pins.before.length}`);

      // Hover lines.
      const tip = await t.app((T) => {
        const a = T.api;
        const L = T.S.layout;
        let file = -1;
        let cap = -1;
        for (let i = 0; i < L.n; i++) {
          if (file < 0 && L.type[i] === 1) file = i;
          if (cap < 0 && L.type[i] === 2 && !L.node[i].e && L.node[i].c.length) cap = i;
        }
        a.TIP_LINES.add({ id: 'seam-tip', order: 99, lines: (node, c) => ['seam line', `type ${c.type}`] });
        a.TIP_LINES.add({ id: 'seam-none', order: 98, lines: () => null });
        const read = (i) => {
          T.S.view.on.hover(i, { clientX: 300, clientY: 300 });
          return [...document.querySelectorAll('#tip > div')].map((d) => d.textContent);
        };
        const out = { file: read(file), name: L.node[file].n, cap: cap >= 0 ? read(cap) : null };
        T.S.view.on.hover(-1, {});
        a.TIP_LINES.remove('seam-tip');
        a.TIP_LINES.remove('seam-none');
        out.after = read(file);
        T.S.view.on.hover(-1, {});
        out.hidden = document.getElementById('tip').hidden;
        return out;
      });
      t.check('hover lines follow the name and summary, in TIP_LINES order', tip.file[0] === tip.name && same(tip.file.slice(-2), ['seam line', 'type 1']), JSON.stringify(tip.file));
      if (tip.cap) t.check('a closed mass keeps its "levels inside" line', tip.cap.some((l) => /inside · opens as you approach/.test(l)) && tip.cap.at(-1) === 'type 2', JSON.stringify(tip.cap));
      else t.skip('a closed mass keeps its "levels inside" line', 'no closed mass with contents in this view');
      t.check('without the provider the tip is as before, and it hides', !tip.after.includes('seam line') && tip.hidden, JSON.stringify(tip.after));
    }

    const end = await t.app((T) => {
      const a = T.api;
      return Object.fromEntries([...['KEYS', 'ESCAPE', 'PIN_SOURCES', 'TIP_LINES', 'READING', 'TABS', 'LAYOUT_OPTS', 'AFTER_LAYOUT', 'AFTER_REFRESH', 'AFTER_SURVEY'].map((n) => [n, a[n].ids()]),
        ['focus', a.INSPECTOR.focus.ids()], ['node', a.INSPECTOR.node.ids()]]);
    });
    t.check('every test entry is gone again', same(end, start.all), JSON.stringify(end).slice(0, 300));
  },
};
