/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Controller Seams Scenario (Terrane Edition - v1.14)
 *     - File Name: seams.mjs
 *     - Relative Path: tools/ui-scenarios/seams.mjs
 *     - Artifact Type: test
 *     - Version: 1.14.0
 *     - Date: 11/15/2026
 *     - Update: Sunday, November 15, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Changelog:
 *     - 1.14.0 (11/15/2026) [dendogg + Anthropic - Claude Opus 5.5] — C
 *       is Compare's in the key allocation and among the owned keys. The
 *       api offers pick, picking and stopPick: a pick shows the banner
 *       with its words, Enter on the world and the banner's here button
 *       take a folder, Escape cancels, and placing's ESCAPE and TIP_LINES
 *       ids stay as they were. With WebGL the here button waits for the
 *       flight to make the folder where you are, and the location goes
 *       back to the root before AFTER_FOCUS is listened to.
 *     - 1.13.0 (11/15/2026) [dendogg + Anthropic - Claude Opus 5.5] — K
 *       is the Shelf's in the key allocation. A registered B tab with a
 *       count draws it on its label, and drawBTabCounts changes it in
 *       place with focus kept on the tab's button; one with a drop is a
 *       drop target that refuses what refuse() names; api.place exists.
 *       The Key Features name the right panel without a letter. K is
 *       among the owned keys, and the dispatch tests use the free keys
 *       L, Y and U.
 *     - 1.12.0 (11/14/2026) [dendogg + Anthropic - Claude Opus 5.5] —
 *       The Guide row for [ and ] reads "Hide ledger / right panel".
 *     - 1.11.0 (11/14/2026) [dendogg + Anthropic - Claude Opus 5.5] —
 *       Panel B's tabs: B_TABS is frozen and holds the controller's
 *       Inspector; a registered tab gets its button after the Inspector's,
 *       Enter shows its panel and calls show once, the Inspector's panel
 *       hides, ArrowRight moves on, and a tab removed leaves panel B on the
 *       Inspector. The ledger's strip is read by its id (#ledger-tabs), and
 *       ArrowRight on a ledger tab chooses the next one. The guide's
 *       Selecting rows gain "← → on tabs" after "[  ]", which now reads
 *       "Hide ledger / panel B".
 *     - 1.10.0 (11/14/2026) [dendogg + Anthropic - Claude Opus 5.5] — A
 *       LEDGER_SUB control stands on the count row after the count, where the
 *       polished head puts a feature's tools.
 *       Duplicate candidates are opened before the DUP_GROUP rows are
 *       counted: the section builds its rows the first time it is open.
 *     - 1.9.0 (11/14/2026) [dendogg + Anthropic - Claude Opus 5.5] — Reading the
 *       world is read from the Guide's tab, where it moved; the inspector's
 *       own sections end with Composition.
 *     - 1.8.0 (11/14/2026) [dendogg + Anthropic - Claude Opus 5.5] — The drags
 *       leave the key table for the guide's Mouse section, which lists
 *       the flavor in use; the Travelling rows keep the wheel
 *       and the keys.
 *     - 1.7.0 (11/14/2026) [dendogg + Anthropic - Claude Opus 5.5] — The guide's
 *       Travelling rows add Blender's middle-button drags and numpad views.
 *     - 1.6.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] — The core's
 *       Closed mass row says that a mass's sides show its strata.
 *     - 1.5.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] — The
 *       registries the palette, the remembered view and saved searches
 *       use (COMMANDS, LEDGER_SUB, AFTER_FOCUS, AFTER_SELECT,
 *       TAB_SECTIONS) are frozen, hold no controller entry, and are
 *       compared at the end with the rest; S.searches may hold the store
 *       that feature keeps there. New checks: AFTER_FOCUS hears the
 *       folder you are in, AFTER_SELECT hears select() and selectAll(),
 *       a LEDGER_SUB control stands after the sort keys, cursorTo moves
 *       the list's cursor, a TAB_SECTIONS section is drawn in the Places
 *       tab, copyText says what happened, and the key table carries the
 *       palette's labels, palette: false and gl fields. P is allocated to
 *       Quick look, and quicklook may bind it. Acting on many: RENAME_MANY,
 *       DUP_GROUP and INSPECTOR.many are frozen, hold no controller entry
 *       and are compared at the end; F2 with two selected runs the first
 *       RENAME_MANY entry and with one opens the single rename; a MENU
 *       entry needs items() or many(), and many()'s items follow Copy
 *       paths; an INSPECTOR.many section follows the Actions grid; a
 *       DUP_GROUP entry adds to the inspector's copies and to every group
 *       the Survey lists; each one that throws is left out; relLabel.
 *     - 1.4.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] — The
 *       S.sessions slot may hold what the Session traverse feature fills
 *       it with after the survey (a list of working sessions), as
 *       S.places may hold the landmarks store. The SURVEY and AFTER_QUERY
 *       registries are frozen and compared with the rest: the Survey
 *       tab's own sections in their old order, a registered section in
 *       its place and one that throws left out, and AFTER_QUERY empty at
 *       the start, then hearing each search and its clearing.
 *     - 1.3.0 (11/12/2026) [dendogg + Anthropic - Claude Opus 5.5] — With
 *       features installed: the controller's own entries are told from a
 *       feature's by owner and compared as before, the guide and Reading
 *       rows are compared without the features' sections and rows, an
 *       owner's reserved key may already be held by its own feature, and
 *       the dispatch tests use the free keys K, Y and U. The tab buttons,
 *       the S slots and the search tokens are compared without a
 *       feature's too: its tabs (Places), the slot it fills (S.places)
 *       and the is: words it adds. The AFTER_OP hooks and MENU items are
 *       frozen with the rest and hold no controller entry.
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
 *     - The right panel's strip from B_TABS: a tab registered, chosen by
 *       Enter, shown once, stepped past with ArrowRight and removed
 *     - The fixed key allocation: reserved and taken keys are refused,
 *       owners may bind theirs (or already hold them through their
 *       feature), inList is honoured, and a run() that returns false
 *       leaves the key to the browser
 *     - Entries a feature module adds carry its owner and are left out of
 *       the comparisons with the controller's own
 *     - Escape order (a date-scrub slot between kind filter and search),
 *       and typing: false entries stay out of text fields
 *     - Pins add up in source order and stop at 3,000; hover lines,
 *       inspector sections, tabs, Survey sections, layout options and the
 *       after-layout, refresh, survey and query hooks each take effect
 *     - The focus and selection hooks, controls on the ledger's count
 *       row, sections in another feature's tab, selectAll, cursorTo,
 *       copyText and the key table's palette fields
 *     - F2's dispatch to RENAME_MANY with several selected, the menu of
 *       several (many()), the inspector's sections for several, DUP_GROUP
 *       in the inspector and the Survey, and relLabel
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
  ['Travelling', [['Wheel', 'Fly toward what is under the cursor'], ['W A S D', 'Move (Shift: faster)'], ['Q  E', 'Turn'], ['R  F', 'Rise / descend'], ['Numpad 1 3 7', 'Front, right, top (Ctrl: the far side)'], ['Numpad 2 4 6 8', 'Orbit in steps'], ['Numpad .', 'Frame the selection'], ['V', 'Drop to eye level'], ['0', 'Rise to the overview'], ['G', 'Fly to the selection'], ['Double-click', 'Fly to folder / open file']]],
  ['Selecting and going places', [['Click', 'Select'], ['Ctrl+click', 'Add to selection'], ['← →', 'Previous / next sibling'], ['↑ ↓', 'Parent / first child'], ['Enter', 'Go to folder / open file'], ['Backspace', 'Up one level'], ['Alt+←', 'Back'], ['/', 'Find'], ['Esc', 'Cancel, clear'], ['[  ]', 'Hide ledger / right panel'], ['← → on tabs', 'Previous / next tab (Home, End: first, last)'], ['1 – 4', 'Lens']]],
  ['Changing things', [['N', 'New folder'], ['F2', 'Rename'], ['M', 'Move to…'], ['Ctrl+D', 'Duplicate'], ['Del', 'Remove to holding area'], ['Ctrl+Z', 'Undo'], ['Ctrl+C', 'Copy path'], ['Drag a row', 'Drop on a folder, breadcrumb or plateau'], ['Menu key', 'Context menu'], ['F5', 'Re-read folder']]],
];

/** The Reading rows as drawInspector listed them. */
const READING = [
  ['glyph g-foot', 'Footprint is storage', 'Ground area is share of the parent folder.'],
  ['glyph g-elev', 'Elevation is nesting', 'Each level stands one step up, one tone lighter, and one scale smaller.'],
  ['glyph g-height', 'Height is recency', 'Fresh files stand tall; untouched ones wear down flat.'],
  ['glyph g-mass', 'Closed mass', 'A folder seen from afar. Its sides show its strata: what it holds by kind, the largest at the foot. Taller means more levels inside. Approach and it opens.'],
  ['glyph g-scree', 'Scree', 'Items too small to see from here, gathered into one tile. Go closer.'],
  ['glyph g-seal', 'Hatched', 'Sealed: the folder could not be read.'],
  ['glyph g-empty', 'Hollow', 'An empty folder.'],
  ['glyph g-pin', 'Pin', 'Vermilion marks a search match; ink marks a heavyweight file.'],
];

const OWNERS = {
  w: 'viewport', a: 'viewport', s: 'viewport', d: 'viewport', q: 'viewport', e: 'viewport', r: 'viewport', f: 'viewport',
  i: 'interiors', t: 'time', ',': 'time', '.': 'time', '<': 'time', '>': 'time', b: 'landmarks', h: 'landmarks', j: 'landmarks',
  p: 'quicklook', k: 'shelf', c: 'compare',
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
      const regs = ['KEYS', 'ESCAPE', 'PIN_SOURCES', 'TIP_LINES', 'READING', 'TABS', 'B_TABS', 'LAYOUT_OPTS', 'AFTER_LAYOUT', 'AFTER_REFRESH', 'AFTER_SURVEY', 'AFTER_OP', 'MENU', 'AFTER_QUERY', 'SURVEY',
        'COMMANDS', 'LEDGER_SUB', 'AFTER_FOCUS', 'AFTER_SELECT', 'TAB_SECTIONS', 'RENAME_MANY', 'DUP_GROUP'];
      const mod = await import(new URL('js/features.js', document.baseURI).href);
      // A feature's entries carry its owner; the controller's carry none, or 'core'.
      const own = (reg) => [...reg].filter((x) => !x.owner || x.owner === 'core').map((x) => x.id);
      const byFeature = (reg) => [...reg].filter((x) => x.owner && x.owner !== 'core');
      return {
        frozen: Object.isFrozen(a) && regs.every((n) => Object.isFrozen(a[n])) && Object.isFrozen(a.INSPECTOR) && ['focus', 'node', 'many'].every((n) => Object.isFrozen(a.INSPECTOR[n])) && Object.isFrozen(a.QUERY),
        // places is null, or the store the Landmarks feature keeps there;
        // sessions is null, or the working sessions the Session traverse found.
        slots: ['time', 'interior', 'places', 'sessions', 'searches'].every((k) => k in T.S) && ['time', 'interior'].every((k) => T.S[k] === null)
          && (T.S.places === null || Array.isArray(T.S.places.benchmarks)) && (T.S.sessions === null || Array.isArray(T.S.sessions.list))
          && (T.S.searches === null || (Array.isArray(T.S.searches.history) && Array.isArray(T.S.searches.saved)))
          && 'ages' in T.S && typeof T.S.ages?.kept === 'function' && T.S.ages.folders === T.S.model.root.dc + 1,
        ids: Object.fromEntries([...regs.map((n) => [n, own(a[n])]), ['focus', own(a.INSPECTOR.focus)], ['node', own(a.INSPECTOR.node)], ['many', own(a.INSPECTOR.many)]]),
        all: Object.fromEntries([...regs.map((n) => [n, a[n].ids()]), ['focus', a.INSPECTOR.focus.ids()], ['node', a.INSPECTOR.node.ids()], ['many', a.INSPECTOR.many.ids()]]),
        featureSections: [...new Set(byFeature(a.KEYS).filter((x) => x.guide).map((x) => x.guide[0]))],
        featureReading: byFeature(a.READING).map((x) => x.title),
        // A feature's search words carry its owner, as its entries do.
        tokens: [...Object.values(a.QUERY.is), ...Object.values(a.QUERY.prefix)].filter((f) => !f.owner).length,
        owners: { ...a.KEY_OWNERS },
        ownersFrozen: Object.isFrozen(a.KEY_OWNERS),
        features: Array.isArray(mod.FEATURES),
        tabs: [...document.querySelectorAll('#ledger-tabs [role=tab]')].filter((b) => !a.TABS.get(b.dataset.tab)?.owner).map((b) => `${b.dataset.tab}:${b.textContent}:${b.getAttribute('aria-selected')}`),
        bTabs: [...document.querySelectorAll('#b-tabs [role=tab]')].filter((b) => !a.B_TABS.get(b.dataset.btab)?.owner).map((b) => `${b.dataset.btab}:${b.textContent}:${b.getAttribute('aria-selected')}`),
        bTab: T.S.bTab,
      };
    });
    const ids = start.ids;
    const ownGuide = (g) => g.filter(([title]) => !start.featureSections.includes(title));
    const featureIds = Object.entries(start.all).map(([n, list]) => [n, list.filter((id) => !ids[n].includes(id))]).filter(([, l]) => l.length);
    t.note(`feature entries left out of the comparisons: ${featureIds.map(([n, l]) => `${n} ${l.join(' ')}`).join('; ') || 'none'}`);
    t.check('the api and every registry are frozen', start.frozen);
    t.check('S declares time, interior, places, sessions and searches as null; ages holds the age table the survey built', start.slots);
    t.check('features.js exports the FEATURES list', start.features);
    t.check('Escape, pins and hover lines hold the controller entries in order',
      same(ids.ESCAPE, ['floating', 'placing', 'kind-filter', 'search', 'selection']) && same(ids.PIN_SOURCES, ['search', 'heavy'])
      && same(ids.TIP_LINES, ['levels', 'matches', 'placing', 'copies', 'pixels']), JSON.stringify([ids.ESCAPE, ids.PIN_SOURCES, ids.TIP_LINES]));
    t.check('the inspector, Reading and tab registries hold the controller entries in order',
      same(ids.focus, ['title', 'facts', 'composition']) && same(ids.node, ['title', 'path', 'facts', 'composition', 'copies', 'actions', 'preview'])
      && ids.READING.length === 8 && same(ids.TABS, ['contents', 'findings', 'survey', 'journal']) && same(ids.B_TABS, ['inspector']), JSON.stringify([ids.focus, ids.node, ids.TABS, ids.B_TABS]));
    t.check('layout options, hooks, menu items and search tokens start empty, apart from the age table\'s survey hook',
      !ids.LAYOUT_OPTS.length && !ids.AFTER_LAYOUT.length && !ids.AFTER_REFRESH.length && !ids.AFTER_OP.length && !ids.MENU.length && !ids.AFTER_QUERY.length
      && same(ids.AFTER_SURVEY, ['ages']) && start.tokens === 0, JSON.stringify(ids.AFTER_SURVEY));
    t.check('the Survey tab\'s own sections are a registry, in the order drawSurvey drew them',
      same(ids.SURVEY, ['largest', 'duplicates', 'empty', 'sealed', 'links']), JSON.stringify(ids.SURVEY));
    const g1regs = ['COMMANDS', 'LEDGER_SUB', 'AFTER_FOCUS', 'AFTER_SELECT', 'TAB_SECTIONS'];
    t.check('the palette commands, ledger sub-line controls, focus and selection hooks and tab sections hold no controller entry',
      g1regs.every((n) => ids[n].length === 0), JSON.stringify(g1regs.map((n) => ids[n])));
    t.check('the batch rename, the inspector\'s sections for several and the duplicate groups\' additions hold no controller entry',
      !ids.RENAME_MANY.length && !ids.DUP_GROUP.length && !ids.many.length, JSON.stringify([ids.RENAME_MANY, ids.DUP_GROUP, ids.many]));
    t.check('the key allocation is fixed: I Interiors, T , . < > Time, B H J Landmarks, P Quick look, K the Shelf, the canvas keeps W A S D Q E R F',
      same(start.owners, OWNERS) && start.ownersFrozen, JSON.stringify(start.owners));
    t.check('the tab buttons are made from TABS, Contents selected', same(start.tabs, ['contents:Contents:true', 'findings:Findings:false', 'survey:Survey:false', 'journal:Journal:false']), JSON.stringify(start.tabs));
    t.check('panel B\'s strip is made from B_TABS, the Inspector first and chosen', same(start.bTabs, ['inspector:Inspector:true']) && start.bTab === 'inspector', JSON.stringify([start.bTabs, start.bTab]));

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
        sameId: tryAdd({ id: 'undo', keys: ['l'], run }),
        noRun: tryAdd({ id: 'seam-norun', keys: ['l'] }),
        nothing: tryAdd({ id: 'seam-nothing' }),
        badMod: tryAdd({ id: 'seam-mod', mod: 'shift', keys: ['l'], run }),
        ctrlB: tryAdd({ id: 'seam-ctrl-b', mod: 'ctrl', keys: ['b'], run }),
        // A reserved key is either free for its owner or already held by
        // an entry of that owner (its feature is installed).
        owned: ['i:interiors', 't:time', ',:time', '.:time', '<:time', '>:time', 'b:landmarks', 'h:landmarks', 'j:landmarks', 'p:quicklook', 'k:shelf', 'c:compare']
          .map((s) => {
            const [k, owner] = [s.slice(0, s.indexOf(':')), s.slice(s.indexOf(':') + 1)];
            const held = [...K].find((x) => !x.mod && x.keys?.some((z) => (z.length === 1 ? z.toLowerCase() : z) === k));
            if (held) return held.owner === owner ? 'ok' : `held by ${held.owner}`;
            return tryAdd({ id: `seam-own-${owner}`, owner, keys: [k], run });
          }),
        // K is the Shelf's now; L, Y and U are free.
        free: tryAdd({ id: 'seam-free', owner: 'anyone', keys: ['l'], run }),
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
      K.add({ id: 'seam-t', owner: 'seams', keys: ['l'], run: () => { window.__seam.t.push(where()); }, guide: ['Seams', 'L', 'A test row'] });
      K.add({ id: 'seam-h', owner: 'seams', keys: ['y'], inList: false, run: () => { window.__seam.h++; } });
      K.add({ id: 'seam-j', owner: 'seams', keys: ['u'], run: () => false });
      window.__seamListen = (e) => { if ('lyuLYU'.includes(e.key)) window.__seam.prevented.push(`${e.key}:${e.defaultPrevented}`); };
      window.addEventListener('keydown', window.__seamListen);
    });
    await t.tabTo('#view');
    await t.keys('l', 'y', 'u');
    await t.tabTo('#ledger-list', { back: true });
    await t.keys('L', 'y');
    const disp = await t.app(() => window.__seam);
    t.check('a registered key runs from the canvas and, with inList, from the ledger list, in either case', same(disp.t, ['view', 'ledger-list']), JSON.stringify(disp.t));
    t.check('inList: false keeps a key from acting while the ledger list has focus', disp.h === 1, `h ran ${disp.h} times`);
    t.check('a used key is kept from the browser; run() returning false leaves it to the browser',
      same(disp.prevented, ['l:true', 'y:true', 'u:false', 'L:true', 'y:false']), JSON.stringify(disp.prevented));
    await t.key('?');
    await t.waitFor(() => document.getElementById('dialog').open);
    const guide2 = await t.eval(readGuide);
    const own2 = ownGuide(guide2);
    t.check('a feature row appears in the guide under its own section', same(own2.slice(0, 3), GUIDE) && same(own2[3], ['Seams', [['L', 'A test row']]]) && own2.length === 4, JSON.stringify(guide2.slice(3)));
    await t.key('Escape');
    await t.waitFor(() => !document.getElementById('dialog').open);
    await t.app((T) => {
      for (const id of ['seam-t', 'seam-h', 'seam-j']) T.api.KEYS.remove(id);
      window.removeEventListener('keydown', window.__seamListen);
    });
    await t.tabTo('#view');
    await t.key('l');
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
      const file = (function find(d) {
        for (const c of d.c) if (!c.d && c.s > 0) return c;
        for (const c of d.c) if (c.d) { const f = find(c); if (f) return f; }
        return null;
      })(T.S.model.root);
      a.select(file);
      return { focus, node: titles(), nested: !!document.querySelector('#inspector-body .seam-p'), name: file.n };
    });
    // Reading the world lives in the Guide's tab of that name.
    await t.key('?');
    await t.waitFor(() => document.getElementById('dialog').open && !!document.getElementById('guide-tab-reading'), { what: 'the Guide' });
    insp.rows = await t.eval(() => {
      document.getElementById('guide-tab-reading').click();
      return [...document.querySelectorAll('#dialog .reading li')].map((li) => [li.firstChild.className, li.querySelector('b').textContent, li.lastChild.lastChild.textContent]);
    });
    await t.key('Escape');
    await t.waitFor(() => !document.getElementById('dialog').open);
    const created = await t.waitFor(() => {
      const dt = [...document.querySelectorAll('#inspector-body dt')].find((x) => x.textContent === 'Created');
      const v = dt?.nextElementSibling?.textContent;
      return v && v !== '…' && v;
    });
    const ierrs = await t.eval(muteErrors, false);
    const ownRows = insp.rows.filter((r) => !start.featureReading.includes(r[1]));
    t.check('the Reading rows in the Guide are the ones the inspector listed before, then registered rows in order',
      same(ownRows.slice(0, 8), READING) && same(ownRows.slice(8).map((r) => r[1]), ['Seam', 'Installed']), JSON.stringify(insp.rows.slice(6)));
    t.check('a focus section takes its place after Composition and the features\' sections, and Reading the world is no longer in the inspector',
      insp.focus.at(-1) === `Seam focus ${(await t.app((T) => T.S.focus.n))}` && insp.focus.indexOf('Composition') >= 0 && insp.focus.indexOf('Composition') < insp.focus.length - 1
      && !insp.focus.includes('Reading the world'), JSON.stringify(insp.focus));
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
    const tabs = await t.app((T) => [...document.querySelectorAll('#ledger-tabs [role=tab]')].filter((b) => !T.api.TABS.get(b.dataset.tab)?.owner).map((b) => `${b.dataset.tab}:${b.textContent}`));
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
      return { tab: T.S.tab, n: [...document.querySelectorAll('#ledger-tabs [role=tab]')].filter((b) => !T.api.TABS.get(b.dataset.tab)?.owner).length, list: !document.getElementById('ledger-list').hidden };
    });
    t.check('a tab that goes away leaves the ledger on Contents', gone.tab === 'contents' && gone.n === 4 && gone.list, JSON.stringify(gone));

    // The ledger's strip takes the arrows: ArrowRight chooses the next tab.
    await t.tabTo('#ledger-tabs [data-tab=contents]', { back: true });
    await t.key('ArrowRight');
    const ledgerNext = await t.waitFor((T) => T.S.tab === 'findings' && {
      tab: T.S.tab, focus: document.activeElement?.dataset?.tab, selected: document.querySelector('#ledger-tabs [data-tab=findings]').getAttribute('aria-selected'),
    }, { what: 'Findings chosen by ArrowRight' }).catch(async () => t.app((T) => ({ tab: T.S.tab, focus: document.activeElement?.dataset?.tab })));
    t.check('ArrowRight on a ledger tab chooses the next one and moves focus with it',
      ledgerNext.tab === 'findings' && ledgerNext.focus === 'findings' && ledgerNext.selected === 'true', JSON.stringify(ledgerNext));
    await t.app((T) => {
      T.S.tab = 'contents';
      T.api.drawLedger();
      return true;
    });

    // Panel B's strip from B_TABS: a tab registered by a feature.
    await t.app((T) => {
      const a = T.api;
      window.__seamB = { shown: 0, hidden: 0, mounted: 0, focus: [] };
      window.__seamB.count = 3;
      window.__seamB.took = [];
      a.B_TABS.add({
        id: 'seam-b', owner: 'seams', order: 10, label: 'Seam B', icon: 'eye',
        count: () => window.__seamB.count,
        drop: { refuse: (nodes) => (nodes.some((n) => n.d) ? 'no folders here' : null), take: (nodes) => { window.__seamB.took.push(nodes.map((n) => n.n)); } },
        mount: (host) => { window.__seamB.mounted++; host.append(a.el('p', { class: 'note seam-b-note', text: 'Drawn by a registered panel B tab.' })); },
        show: (host, { focus }) => { window.__seamB.shown++; window.__seamB.focus.push(!!focus); },
        hide: () => { window.__seamB.hidden++; },
      });
      a.drawBTabs();
      return true;
    });
    const bReg = await t.app((T) => ({
      ids: [...document.querySelectorAll('#b-tabs [role=tab]')].map((b) => b.dataset.btab),
      panel: !!document.getElementById('b-panel-seam-b'), hidden: document.getElementById('b-panel-seam-b')?.hidden,
      labelled: document.getElementById('b-panel-seam-b')?.getAttribute('aria-labelledby'), controls: document.getElementById('b-tab-seam-b')?.getAttribute('aria-controls'),
      shown: window.__seamB.shown,
    }));
    t.check('a registered B tab gets its button right after the Inspector\'s, and a hidden panel of its own',
      bReg.ids[0] === 'inspector' && bReg.ids[1] === 'seam-b' && bReg.panel && bReg.hidden && bReg.labelled === 'b-tab-seam-b' && bReg.controls === 'b-panel-seam-b' && bReg.shown === 0, JSON.stringify(bReg));
    // A count on its label, changed in place with focus kept; a drop that refuses folders.
    const bCount = await t.app((T) => {
      const a = T.api;
      const b = document.getElementById('b-tab-seam-b');
      const first = b.querySelector('.count')?.textContent ?? null;
      b.focus();
      window.__seamB.count = 1234;
      a.drawBTabCounts();
      const same = document.getElementById('b-tab-seam-b') === b;
      const changed = b.querySelector('.count')?.textContent ?? null;
      window.__seamB.count = 0;
      a.drawBTabCounts();
      const gone = !b.querySelector('.count');
      window.__seamB.count = 3;
      a.drawBTabCounts();
      const drag = (nodes) => {
        T.S.drag = nodes;
        const dt = new DataTransfer();
        const over = new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt });
        b.dispatchEvent(over);
        const marked = b.classList.contains('is-drop');
        b.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));
        T.S.drag = null;
        return { taken: over.defaultPrevented, marked };
      };
      const file = T.S.model.root.c.find((c) => !c.d);
      const dir = T.S.model.root.c.find((c) => c.d);
      return {
        first, changed, same, gone, focus: document.activeElement === b, place: typeof a.place, counts: typeof a.drawBTabCounts,
        file: drag([file]), dir: drag([dir]), took: window.__seamB.took,
      };
    });
    t.check(`a B tab's count() is drawn on its label (${bCount.first}); drawBTabCounts changes it in place (${bCount.changed}) and removes it at 0, focus kept on the tab`,
      bCount.first === '3' && bCount.changed === '1,234' && bCount.same && bCount.gone && bCount.focus, JSON.stringify(bCount));
    t.check('a B tab with a drop takes the rows its refuse() allows, marked while they are over it, and refuses the rest',
      bCount.file.taken && bCount.file.marked && !bCount.dir.taken && !bCount.dir.marked && bCount.took.length === 1, JSON.stringify(bCount));
    t.check('the api offers place() and drawBTabCounts()', bCount.place === 'function' && bCount.counts === 'function');

    // A feature's pick: the banner with its words, Enter and the banner's
    // here button take a folder, Escape cancels; placing's ids unchanged.
    const pick = await t.app((T) => {
      const a = T.api;
      const log = [];
      const spec = (name) => ({
        owner: 'seam', text: `Seam: choose (${name})`, here: 'Seam here', say: 'Seam choosing.',
        ok: (n) => (n === T.S.model.root ? 'not the root' : null),
        take: (n) => log.push(`${name} took ${n.n}`), cancel: () => log.push(`${name} cancelled`),
      });
      const fns = [typeof a.pick, typeof a.picking, typeof a.stopPick];
      const dir = T.S.model.root.c.find((c) => c.d && !c.e);
      a.select(dir);
      a.pick(spec('enter'));
      const shown = { banner: !document.getElementById('placing').hidden, text: document.getElementById('placing-text').textContent, here: document.getElementById('placing-here-words').textContent, picking: a.picking() };
      return { fns, shown, dir: dir.n, log, start: true, rootRefused: null, ...(window.__seamPick = { log, spec }, {}) };
    });
    await t.tabTo('#view', { max: 80 });
    await t.key('Enter');
    const p1 = await t.waitFor((T) => !T.api.picking() && window.__seamPick.log.slice(), { what: 'Enter taking the pick' });
    // With WebGL the location follows the flight, so the here button waits
    // until the folder is where you are.
    const hereDir = await t.app((T) => {
      const d = T.S.model.root.c.find((c) => c.d && !c.e);
      T.api.setFocus(d);
      return d.n;
    });
    await t.waitFor((T, n) => T.S.focus?.n === n && T.S.focus.p === T.S.model.root, { args: [hereDir], what: 'the location on the folder' });
    await t.app((T) => {
      T.api.pick(window.__seamPick.spec('here'));
      document.getElementById('placing-here').click();
      return true;
    });
    const p2 = await t.waitFor((T) => !T.api.picking() && window.__seamPick.log.slice(), { what: 'the here button taking the pick' });
    await t.app((T) => { T.api.pick(window.__seamPick.spec('esc')); return true; });
    await t.tabTo('#view', { max: 80 });
    await t.key('Escape');
    const p3 = await t.waitFor((T) => !T.api.picking() && {
      log: window.__seamPick.log.slice(), banner: document.getElementById('placing').hidden, here: document.getElementById('placing-here-words').textContent,
      esc: [...T.api.ESCAPE].map((x) => x.id), tips: [...T.api.TIP_LINES].map((x) => x.id),
    }, { what: 'Escape cancelling the pick' });
    t.check('the api offers pick(), picking() and stopPick(); a pick shows the banner with its words', same(pick.fns, ['function', 'function', 'function']) && pick.shown.banner && pick.shown.text === 'Seam: choose (enter)' && pick.shown.here === 'Seam here' && pick.shown.picking, JSON.stringify(pick));
    t.check(`Enter on the world and the banner's here button take the folder; Escape cancels (${p3.log.join('; ')})`,
      p1.includes(`enter took ${pick.dir}`) && p2.some((x) => x.startsWith('here took')) && p3.log.includes('esc cancelled') && p3.banner && p3.here === 'Place where I am', JSON.stringify([p1, p2, p3]));
    t.check('placing and picking share the ESCAPE and TIP_LINES entries, their ids unchanged', p3.esc.includes('placing') && p3.tips.includes('placing') && !p3.esc.some((x) => /pick/.test(x)), JSON.stringify([p3.esc, p3.tips]));
    // Back to the root, so the AFTER_FOCUS check below sees the location change.
    await t.app((T) => { T.api.select(null); delete window.__seamPick; T.api.setFocus(T.S.model.root); return true; });
    await t.waitFor((T) => T.S.focus === T.S.model.root, { timeout: 8000, what: 'the location back at the root' });
    await t.tabTo('#b-tabs [data-btab=seam-b]', { max: 120 });
    await t.key('Enter');
    const bShown = await t.waitFor((T) => T.S.bTab === 'seam-b' && {
      shown: window.__seamB.shown, mounted: window.__seamB.mounted, insp: document.getElementById('inspector-body').hidden,
      panel: !document.getElementById('b-panel-seam-b').hidden && document.getElementById('b-panel-seam-b').textContent,
      selected: document.getElementById('b-tab-seam-b').getAttribute('aria-selected'), kept: localStorage.getItem('terrane.panel-b-tab'),
    }, { what: 'the seam tab chosen' });
    t.check('Enter on it shows its panel, mounts it and calls show once, and the Inspector\'s panel hides',
      bShown.shown === 1 && bShown.mounted === 1 && bShown.insp === true && bShown.panel === 'Drawn by a registered panel B tab.' && bShown.selected === 'true' && bShown.kept === 'seam-b', JSON.stringify(bShown));
    await t.key('ArrowRight');
    const bNext = await t.waitFor((T) => T.S.bTab !== 'seam-b' && {
      bTab: T.S.bTab, focus: document.activeElement?.dataset?.btab, hidden: window.__seamB.hidden,
    }, { what: 'ArrowRight past the seam tab' });
    const want = await t.app((T) => T.api.B_TABS.ids()[2] || 'inspector');
    t.check(`ArrowRight moves on to the next tab (${want}), focus with it, and the seam tab hears hide()`,
      bNext.bTab === want && bNext.focus === want && bNext.hidden === 1, JSON.stringify(bNext));
    await t.app((T) => {
      T.api.showBTab('seam-b');
      return true;
    });
    const bGone = await t.app((T) => {
      T.api.B_TABS.remove('seam-b');
      T.api.drawBTabs();
      return {
        bTab: T.S.bTab, panel: !!document.getElementById('b-panel-seam-b'), insp: document.getElementById('inspector-body').hidden,
        ids: [...document.querySelectorAll('#b-tabs [role=tab]')].map((b) => b.dataset.btab), kept: localStorage.getItem('terrane.panel-b-tab'),
      };
    });
    t.check('a B tab removed leaves panel B on the Inspector, its panel gone, the choice kept in storage untouched',
      bGone.bTab === 'inspector' && !bGone.panel && bGone.insp === false && !bGone.ids.includes('seam-b') && bGone.kept === 'seam-b', JSON.stringify(bGone));
    await t.eval(() => {
      try {
        localStorage.removeItem('terrane.panel-b-tab');
      } catch { /* not kept */ }
      return true;
    });

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

    // A Survey section from the registry, in its place, past one that throws.
    await t.eval(muteErrors, true);
    const sv = await t.app((T) => {
      const a = T.api;
      a.SURVEY.add({ id: 'seam-survey', order: 35, build: () => a.section('Seam section', '1', false, a.el('p', { class: 'note', text: 'Drawn by a registered section.' })) });
      a.SURVEY.add({ id: 'seam-survey-broken', order: 36, build: () => { throw new Error('survey section on purpose'); } });
      T.S.tab = 'survey';
      a.drawLedger();
      const titles = [...document.querySelectorAll('#ledger-rich > details > summary')].map((s) => s.firstChild.textContent);
      a.SURVEY.remove('seam-survey');
      a.SURVEY.remove('seam-survey-broken');
      T.S.tab = 'contents';
      a.drawLedger();
      return titles;
    });
    const serrs = await t.eval(muteErrors, false);
    const ownSv = sv.filter((s) => ['Largest files', 'Duplicate candidates', 'Empty folders', 'Seam section', 'Sealed folders', 'Symbolic links'].includes(s));
    t.check('a registered Survey section takes its place by order, and one that throws is reported and left out',
      same(ownSv, ['Largest files', 'Duplicate candidates', 'Empty folders', 'Seam section', 'Sealed folders', 'Symbolic links']) && serrs.some((e) => /SURVEY "seam-survey-broken" failed/.test(e)),
      JSON.stringify({ sv, serrs }));

    // AFTER_QUERY hears every run of the search: typed, and cleared.
    await t.app((T) => {
      window.__seam.queries = [];
      T.api.AFTER_QUERY.add({ id: 'seam-query', run: (search, q) => { window.__seam.queries.push([q, search === T.S.search, search ? search.list.length : null]); } });
    });

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
    const heard = await t.app((T) => {
      T.api.AFTER_QUERY.remove('seam-query');
      return window.__seam.queries;
    });
    // Typing runs the search once per pause; clearing it runs it once more, with no search.
    const typed = heard.filter(([q]) => q === 'is:seam');
    t.check('AFTER_QUERY hears each search as it is run, with S.search, and its clearing with null',
      typed.length >= 1 && typed.every(([, isS, n]) => isS && n === 1) && heard.some(([q, isS, n]) => q === '' && isS && n === null) && heard.every(([, isS]) => isS),
      JSON.stringify(heard));
    await t.app((T) => {
      for (const k of ['seam']) delete T.api.QUERY.is[k];
      for (const k of ['seam', 'never']) delete T.api.QUERY.prefix[k];
    });

    // The seams the palette, the remembered view and saved searches use:
    // the focus and selection hooks, controls on the ledger's count row,
    // sections in another feature's tab, selectAll, cursorTo, copyText,
    // and the palette's fields in the key table.
    await t.eval(muteErrors, true);
    await t.app((T) => {
      const a = T.api;
      const S = T.S;
      window.__seam.focusHeard = [];
      window.__seam.selHeard = [];
      a.select(null);
      a.AFTER_FOCUS.add({ id: 'seam-focus', run: (dir) => { window.__seam.focusHeard.push(dir === S.focus ? dir.n : `not the focus: ${dir.n}`); } });
      a.AFTER_SELECT.add({ id: 'seam-select', run: (sel, p) => { window.__seam.selHeard.push([sel === S.sel, sel.size, p ? p.n : null]); } });
      a.LEDGER_SUB.add({ id: 'seam-sub', tab: 'contents', build: (ctx) => a.el('button', { class: 'sort', type: 'button', 'data-k': 'seam-sub', text: `Seam ${ctx.items.length} ${ctx.focus === S.focus}` }) });
      a.LEDGER_SUB.add({ id: 'seam-sub-broken', tab: 'contents', order: 60, build: () => { throw new Error('sub on purpose'); } });
      a.TAB_SECTIONS.add({ id: 'seam-tab', tab: 'places', build: () => a.el('details', { class: 'seam-tab' }, a.el('summary', {}, 'Seam section')) });
      a.TAB_SECTIONS.add({ id: 'seam-tab-broken', tab: 'places', order: 60, build: () => { throw new Error('tab section on purpose'); } });
      return true;
    });
    const dirName = await t.app((T) => {
      const d = T.S.model.root.c.find((c) => c.d && !c.e && c.c.length > 2);
      T.api.setFocus(d);
      return d.n;
    });
    await t.waitFor((T, n) => T.S.focus.n === n, { args: [dirName], timeout: 8000 });
    await t.settle();
    const g1 = await t.app((T) => {
      const a = T.api;
      const S = T.S;
      S.tab = 'contents';
      a.drawLedger();
      const tool = document.querySelector('#ledger-sub .sub-tools [data-k="seam-sub"]');
      const toolText = tool?.textContent ?? null;
      const before = tool?.parentElement?.previousElementSibling?.className ?? null;
      const items = a.listItems();
      const two = items.slice(1, 3);
      a.select(items[0]);
      a.selectAll(two, two[1]);
      const rows = [...document.querySelectorAll('#ledger-list .row[aria-selected="true"]')].length;
      const moved = a.cursorTo(items[items.length - 1]);
      const cursor = T.list.cursor === items.length - 1;
      const notThere = a.cursorTo(S.model.root);
      S.tab = 'places';
      a.drawLedger();
      const placed = [...document.querySelectorAll('#ledger-rich > details')].map((d) => d.className || d.querySelector('summary')?.firstChild?.textContent);
      S.tab = 'contents';
      a.drawLedger();
      return {
        tool: toolText, before, n: items.length,
        sel: [S.sel.size, S.primary?.n === two[1].n], rows, moved, cursor, notThere,
        built: a.tabSections('places').map((e) => e.className), placed, heard: { focus: window.__seam.focusHeard, sel: window.__seam.selHeard },
        keys: {
          lens: a.KEYS.get('lens').labels?.['2'], panels: Object.keys(a.KEYS.get('panels').labels || {}),
          off: ['sibling', 'parent-child', 'activate', 'menu'].map((id) => a.KEYS.get(id).palette),
          gl: ['descend', 'overview'].map((id) => a.KEYS.get(id).gl),
        },
      };
    });
    const g1errs = await t.eval(muteErrors, false);
    t.check(`AFTER_FOCUS hears the folder you are in once it changes (${g1.heard.focus.join(', ')})`, g1.heard.focus.at(-1) === dirName, JSON.stringify(g1.heard.focus));
    t.check('AFTER_SELECT hears select() and selectAll() with S.sel and the primary',
      same(g1.heard.sel.slice(-2).map((x) => x.slice(0, 2)), [[true, 1], [true, 2]]) && g1.sel[0] === 2 && g1.sel[1] && g1.rows === 2, JSON.stringify({ heard: g1.heard.sel, sel: g1.sel, rows: g1.rows }));
    t.check('a LEDGER_SUB control stands on the count row after the count, told the rows shown and the folder; one that throws is reported and left out',
      g1.tool === `Seam ${g1.n} true` && g1.before === 'sub-count' && g1errs.some((e) => /LEDGER_SUB "seam-sub-broken" failed/.test(e)), JSON.stringify({ tool: g1.tool, before: g1.before, g1errs }));
    t.check('cursorTo moves the list\'s cursor to a listed node, and answers false for one not listed', g1.moved && g1.cursor && g1.notThere === false);
    t.check('a TAB_SECTIONS section is drawn in its tab, after the tab\'s own; one that throws is reported and left out',
      g1.built.includes('seam-tab') && g1.placed.at(-1) === 'seam-tab' && g1.placed.includes('places-return') && g1errs.some((e) => /TAB_SECTIONS "seam-tab-broken" failed/.test(e)), JSON.stringify(g1.placed));
    t.check('the key table carries the palette\'s fields: labels on the lens and panels, palette: false on the arrows, Enter and the menu, gl on V and 0',
      g1.keys.lens === 'Lens: age' && same(g1.keys.panels, ['[', ']']) && g1.keys.off.every((x) => x === false) && g1.keys.gl.every((x) => x === true), JSON.stringify(g1.keys));
    const copied = await t.app(async (T) => {
      const said = [];
      navigator.clipboard.writeText = async (text) => { said.push(text); };
      await T.api.copyText('seam text', 'Seam copied.');
      navigator.clipboard.writeText = async () => { throw new Error('denied'); };
      await T.api.copyText('seam text', 'Seam copied.', 'Seam fallback.');
      delete navigator.clipboard.writeText;
      return { said, notices: [...document.querySelectorAll('#notices .notice-text')].map((n) => n.textContent).slice(-2) };
    });
    t.check('copyText writes to the clipboard and says so; refused, it says that with its fallback',
      same(copied.said, ['seam text']) && same(copied.notices, ['Seam copied.', 'The browser did not allow clipboard access. Seam fallback.']), JSON.stringify(copied));
    await t.app((T) => {
      const a = T.api;
      for (const [reg, id] of [['AFTER_FOCUS', 'seam-focus'], ['AFTER_SELECT', 'seam-select'], ['LEDGER_SUB', 'seam-sub'], ['LEDGER_SUB', 'seam-sub-broken'], ['TAB_SECTIONS', 'seam-tab'], ['TAB_SECTIONS', 'seam-tab-broken']]) a[reg].remove(id);
      a.select(null);
      a.setFocus(T.S.model.root);
      a.drawLedger();
      return true;
    });
    await t.settle();

    // The seams acting on many uses: F2 through RENAME_MANY, MENU's
    // many(), INSPECTOR.many, DUP_GROUP and relLabel.
    await t.eval(muteErrors, true);
    const g3 = await t.app((T) => {
      const a = T.api;
      window.__seam.renamed = [];
      let neither = 'ok';
      try {
        a.MENU.add({ id: 'seam-neither' });
        a.MENU.remove('seam-neither');
      } catch (err) {
        neither = err.message;
      }
      // First, so it wins over a feature's: the first entry runs.
      a.RENAME_MANY.add({ id: 'seam-rename', order: 1, run: (nodes) => { window.__seam.renamed.push(nodes.map((n) => n.n).sort()); } });
      a.MENU.add({ id: 'seam-many', order: 1, many: (nodes, ctx) => [{ label: `Seam ${nodes.length} ${ctx.off ?? 'on'}`, run: () => {} }] });
      a.MENU.add({ id: 'seam-many-broken', order: 2, many: () => { throw new Error('many on purpose'); } });
      a.INSPECTOR.many.add({ id: 'seam-many', build: (nodes, ctx) => a.el('p', { class: 'seam-many', text: `Seam many ${nodes.length} ${ctx.off ?? 'on'} ${ctx.ro ?? 'on'}` }) });
      a.INSPECTOR.many.add({ id: 'seam-many-broken', order: 60, build: () => { throw new Error('many section on purpose'); } });
      a.DUP_GROUP.add({ id: 'seam-dup', order: 1, build: (g, ctx) => a.el('p', { class: 'seam-dup', text: `${ctx.where} ${g.files.length} ${ctx.node ? ctx.node.n : 'none'} ${ctx.ro ?? 'on'}` }) });
      a.DUP_GROUP.add({ id: 'seam-dup-broken', order: 2, build: () => { throw new Error('dup on purpose'); } });
      const dir = T.S.model.root.c.find((c) => c.d && !c.e && c.c.filter((x) => !x.d).length >= 2) || T.S.model.root;
      const files = dir.c.filter((x) => !x.d).slice(0, 2);
      a.setFocus(dir);
      const deep = (function find(d) {
        for (const c of d.c) if (c.d && c.c.length) { const f = c.c.find((x) => !x.d); if (f) return f; }
        return null;
      })(T.S.model.root);
      return {
        neither, dir: dir.n, files: files.map((f) => f.n).sort(), ro: a.writable(),
        rel: { root: a.relLabel(T.S.model.root), deep: deep && a.relLabel(deep), want: deep && a.relPath(deep) },
      };
    });
    await t.waitFor((T, n) => T.S.focus.n === n || !T.S.focus.p, { args: [g3.dir], timeout: 8000 });
    await t.settle();
    t.check('a MENU entry needs items() or many()', /needs items\(\) or many\(\)/.test(g3.neither), g3.neither);
    t.check(`relLabel: the root reads ".", and a file its path from the root joined with / (${g3.rel.deep})`, g3.rel.root === '.' && g3.rel.deep === g3.rel.want && !!g3.rel.deep, JSON.stringify(g3.rel));
    await t.app((T, names) => {
      const nodes = T.S.focus.c.filter((c) => names.includes(c.n));
      T.api.selectAll(nodes);
      document.getElementById('ledger-list').focus();
      return true;
    }, g3.files);
    await t.key('F2');
    const two = await t.waitFor(() => window.__seam.renamed.length === 1 && { names: window.__seam.renamed[0], dialog: document.getElementById('dialog').open });
    t.check('F2 with two selected runs the first RENAME_MANY entry with them, and opens no rename of its own', same(two.names, g3.files) && !two.dialog, JSON.stringify(two));
    await t.key('Shift+F10');
    await t.waitFor(() => !document.getElementById('menu').hidden && document.querySelectorAll('#menu .menu-item').length > 0, { what: 'the menu of several' });
    const manyMenu = await t.eval(() => [...document.querySelectorAll('#menu .menu-item .menu-label')].map((l) => l.textContent));
    await t.key('Escape');
    await t.waitFor(() => document.getElementById('menu').hidden);
    const wantSeam = `Seam 2 ${g3.ro ?? 'on'}`;
    t.check(`a MENU entry's many() items follow Copy paths in the menu of several ("${wantSeam}"); one that throws is left out`,
      manyMenu[manyMenu.indexOf('Copy paths') + 1] === wantSeam, JSON.stringify(manyMenu));
    const manyInsp = await t.eval(() => {
      const body = document.getElementById('inspector-body');
      const grid = body.querySelector('.actions-grid');
      const seam = body.querySelector('.seam-many');
      return { text: seam?.textContent ?? null, after: !!grid && !!seam && !!(grid.compareDocumentPosition(seam) & Node.DOCUMENT_POSITION_FOLLOWING) };
    });
    t.check(`an INSPECTOR.many section follows the Actions grid of a selection of several, told why changes are off (${manyInsp.text})`,
      manyInsp.text === `Seam many 2 ${g3.ro ?? 'on'} ${g3.ro ?? 'on'}` && manyInsp.after, JSON.stringify(manyInsp));
    await t.app((T, n) => {
      T.api.select(T.S.focus.c.find((c) => c.n === n));
      document.getElementById('ledger-list').focus();
      return true;
    }, g3.files[0]);
    await t.key('F2');
    const one = await t.waitFor(() => document.getElementById('dialog').open && { input: document.activeElement?.name, h2: document.querySelector('#dialog h2')?.textContent });
    t.check('F2 with one selected is the single rename, and RENAME_MANY is not asked', one.input === 'name' && one.h2 === 'Rename' && (await t.app(() => window.__seam.renamed.length)) === 1, JSON.stringify(one));
    await t.key('Escape');
    await t.waitFor(() => !document.getElementById('dialog').open);
    const dup = await t.app((T) => {
      const a = T.api;
      const g = T.S.survey?.dupGroups?.[0];
      if (!g) return null;
      const f = g.files[0];
      a.select(f);
      const inInspector = document.querySelector('#inspector-body .seam-dup')?.textContent ?? null;
      T.S.tab = 'survey';
      a.drawLedger();
      // Duplicate candidates build their rows when the section is first open.
      const dd = [...document.querySelectorAll('#ledger-rich > details')].find((x) => x.querySelector(':scope > summary .t')?.textContent === 'Duplicate candidates');
      if (dd && !dd.open) {
        dd.open = true;
        dd.dispatchEvent(new Event('toggle'));
      }
      const inSurvey = [...document.querySelectorAll('#ledger-rich .seam-dup')].map((p) => p.textContent);
      const first = document.querySelector('#ledger-rich .group-head');
      const firstDup = document.querySelector('#ledger-rich .seam-dup');
      T.S.tab = 'contents';
      a.drawLedger();
      return {
        inInspector, want: `inspector ${g.files.length} ${f.n} ${a.writable() ?? 'on'}`, n: inSurvey.length, groups: Math.min(60, T.S.survey.dupGroups.length),
        first: inSurvey[0], wantFirst: `survey ${g.files.length} none ${a.writable() ?? 'on'}`,
        order: !!first && !!firstDup && !!(first.compareDocumentPosition(firstDup) & Node.DOCUMENT_POSITION_FOLLOWING),
      };
    });
    if (dup) {
      t.check(`a DUP_GROUP entry adds to the inspector's copies, told the group, the file and the mode (${dup.inInspector})`, dup.inInspector === dup.want, JSON.stringify(dup));
      t.check(`and to every group the Survey lists, after its rows (${dup.n} of ${dup.groups})`, dup.n === dup.groups && dup.first === dup.wantFirst && dup.order, JSON.stringify(dup));
    } else t.skip('a DUP_GROUP entry adds to the inspector and the Survey', 'no duplicate candidates in this data');
    const g3errs = await t.eval(muteErrors, false);
    t.check('a many() item, an INSPECTOR.many section and a DUP_GROUP entry that throw are reported and left out',
      g3errs.some((e) => /MENU "seam-many-broken" failed/.test(e)) && g3errs.some((e) => /INSPECTOR.many "seam-many-broken" failed/.test(e)) && (!dup || g3errs.some((e) => /DUP_GROUP "seam-dup-broken" failed/.test(e))),
      JSON.stringify(g3errs));
    await t.app((T) => {
      const a = T.api;
      for (const [reg, id] of [['RENAME_MANY', 'seam-rename'], ['MENU', 'seam-many'], ['MENU', 'seam-many-broken'], ['DUP_GROUP', 'seam-dup'], ['DUP_GROUP', 'seam-dup-broken']]) a[reg].remove(id);
      a.INSPECTOR.many.remove('seam-many');
      a.INSPECTOR.many.remove('seam-many-broken');
      a.select(null);
      a.setFocus(T.S.model.root);
      a.drawLedger();
      return true;
    });
    await t.settle();

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
      return Object.fromEntries([...['KEYS', 'ESCAPE', 'PIN_SOURCES', 'TIP_LINES', 'READING', 'TABS', 'B_TABS', 'LAYOUT_OPTS', 'AFTER_LAYOUT', 'AFTER_REFRESH', 'AFTER_SURVEY', 'AFTER_OP', 'MENU', 'AFTER_QUERY', 'SURVEY',
        'COMMANDS', 'LEDGER_SUB', 'AFTER_FOCUS', 'AFTER_SELECT', 'TAB_SECTIONS', 'RENAME_MANY', 'DUP_GROUP'].map((n) => [n, a[n].ids()]),
        ['focus', a.INSPECTOR.focus.ids()], ['node', a.INSPECTOR.node.ids()], ['many', a.INSPECTOR.many.ids()]]);
    });
    t.check('every test entry is gone again', same(end, start.all), JSON.stringify(end).slice(0, 300));
  },
};
