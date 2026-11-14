/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Search History, Saved Searches and in: (Terrane Edition - v1.0)
 *     - File Name: searches.js
 *     - Relative Path: web/js/searches.js
 *     - Artifact Type: javascript
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
 *     Find remembers. ArrowUp in the Find field brings back earlier
 *     searches, a search worth keeping is saved under a name and run again
 *     from the Places tab or the command palette, and in: keeps a search
 *     to one folder and what lies inside it.
 *
 * ✒ Key Features:
 *     - History: the last 20 searches, newest first, a repeat moved to
 *       the front; a search enters it on Enter or ArrowDown in Find, when
 *       Find loses focus with a search that has matches, and when a search
 *       is run from elsewhere (the palette, a saved search, a session row)
 *     - ArrowUp in Find loads an earlier search and ArrowDown a later one,
 *       back to what was being typed; at that point ArrowDown moves to the
 *       list, as before. Each step runs the search and is said
 *     - Save search… on the Findings count row asks a name (the query by
 *       default, at most 80 characters); the same name takes the new query
 *       and says it was updated; a 51st is refused in a sentence
 *     - The Places tab's Saved searches: each with its name and query, Run
 *       (into Find, the list takes focus) and Forget (with Undo); the
 *       command palette runs them too, and saves the search in Find
 *     - in:<folder> keeps a search to what lies inside that folder at any
 *       depth: in:. is the folder you are in, in:./x a folder under it,
 *       anything else is from the root; the name is matched exactly, then
 *       segment by segment in any case; only folders count; spaces need
 *       quotes, in:"My Folder"; Findings says which folder, or that there
 *       is none
 *     - Kept in this browser for this directory (terrane.searches.v1|<root>,
 *       a snapshot apart); what another tab saved is merged in before every
 *       write and when it writes; a refusal is said once and everything
 *       keeps working until the tab closes
 *
 * ✒ Usage Instructions:
 *     Listed in features.js and installed by app.js. S.searches is the
 *     store from memory.js: history, saved, save(name, query),
 *     forget(id), mergeSaved(list) -> { added, updated, skipped }.
 *
 * ✒ Examples:
 *     ext:md in:docs              Markdown anywhere under docs
 *     >10mb in:.                  large files under the folder you are in
 *     kind:image in:"My Photos"   a folder name with a space
 *     ↑ in Find                   Earlier search 1 of 7: ext:md in:docs
 *
 * ✒ Other Important Information:
 *     - Dependencies: memory.js (Searches, HistoryWalk, searchKey),
 *       model.js (isAncestor, fmtCount), ui.js (ask), icons.js; app.js's
 *       api: S, QUERY, AFTER_QUERY, LEDGER_SUB, TAB_SECTIONS, COMMANDS,
 *       KEYS, setQuery, drawLedger, relPath, hostOf, say, notice, el
 *     - Compatible platforms: any browser with ES2022 modules
 *     - Limitations: in: resolves its folder when the search runs; a
 *       later move of the folder you are in does not change an in:.
 *       search until it runs again
 * ----------------------------------------------------------------------------
 */

import { Searches, HistoryWalk, searchKey, SAVED_MAX, NAME_MAX } from './memory.js';
import { isAncestor, fmtCount } from './model.js';
import { ask } from './ui.js';
import { icon } from './icons.js';

export const name = 'Searches';

const OWNER = 'searches';

export function install(api) {
  const { S, el } = api;
  const store = new Searches({
    key: searchKey(S.info.root, S.info.snapshot ? 'snapshot' : ''),
    storage: () => window.localStorage,
    onFail: (why) => api.notice(`Searches cannot be kept in this browser (${why}). The history and saved searches will last only until this tab closes.`, { kind: 'info', ms: 15000 }),
    onChange: () => redraw(),
  });
  store.load();
  S.searches = store;
  window.addEventListener('storage', (e) => {
    if (e.key === null || e.key === store.key) store.sync();
  });

  const q = document.getElementById('q');
  const walk = new HistoryWalk();
  let stepping = false;
  let sectionOpen = true;

  function redraw() {
    if (S.tab === 'places' || S.tab === 'findings') api.drawLedger(true);
  }

  /* ---------- history ---------- */

  const record = (text) => store.push(text);

  /** Shows a step of the history in Find and runs it, as typing it would. */
  function show(text) {
    stepping = true;
    q.value = text;
    q.dispatchEvent(new Event('input', { bubbles: true }));
    stepping = false;
    q.setSelectionRange(text.length, text.length);
  }

  const claim = (e) => {
    e.preventDefault();
    e.stopImmediatePropagation();
  };

  // Installed before app.js wires Find, so this listener hears its keys
  // first and claims the arrows it steps with.
  q.addEventListener('keydown', (e) => {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    const list = store.history;
    if (e.key === 'ArrowUp') {
      const was = walk.index;
      const text = walk.older(list, q.value);
      if (text === null) return;
      claim(e);
      if (walk.index !== was) show(text);
      api.say(walk.index === was ? `The oldest search: ${text}` : `Earlier search ${walk.index + 1} of ${list.length}: ${text}`);
    } else if (e.key === 'ArrowDown' && walk.stepping) {
      claim(e);
      const text = walk.newer(list);
      show(text);
      api.say(walk.stepping ? `Later search ${walk.index + 1} of ${list.length}: ${text}` : `Back to what you typed${text ? `: ${text}` : ''}`);
    } else if (e.key === 'Enter' || e.key === 'ArrowDown') {
      // Not claimed: the app moves to the list as before.
      record(q.value);
      walk.reset();
    } else if (e.key === 'Escape') walk.reset();
  });
  q.addEventListener('input', () => {
    if (!stepping) walk.reset();
  });
  q.addEventListener('blur', () => {
    if (q.value.trim() && S.search?.list.length && S.query === q.value) record(q.value);
  });

  /* ---------- in: ---------- */

  // What the latest in: token resolved to, read (and let go) by the
  // AFTER_QUERY hook that runs right after the search it belongs to.
  let lastIn = null;
  const inArchive = (raw) => {
    const host = api.hostOf(S.focus);
    return { raw, dir: null, why: `${raw === '.' ? 'in:.' : `in:${raw}`} matches nothing inside ${host.n}: search does not reach inside an archive.` };
  };

  /** The folder under base named by rel: exactly, else segment by segment in any case. */
  function folderAt(base, rel) {
    const parts = rel.split('/').filter(Boolean);
    if (parts.some((p) => p === '..' || p === '.')) return null;
    const full = [api.relPath(base), ...parts].filter(Boolean).join('/');
    const exact = S.model.find(full);
    if (exact?.d) return exact;
    let dir = base;
    for (const p of parts) {
      const low = p.toLowerCase();
      dir = dir.c.find((c) => c.d && c.n === p) || dir.c.find((c) => c.d && c.n.toLowerCase() === low);
      if (!dir) return null;
    }
    return dir;
  }

  function resolveIn(raw) {
    const text = raw.trim();
    if (text === '.' || text === './') return api.hostOf(S.focus) ? inArchive(text) : { raw: text, dir: S.focus };
    if (text.startsWith('./')) {
      if (api.hostOf(S.focus)) return inArchive(text);
      return { raw: text, dir: folderAt(S.focus, text.slice(2)) };
    }
    return { raw: text, dir: folderAt(S.model.root, text.replace(/^\/+/, '')) };
  }

  api.QUERY.prefix.in = Object.assign((_value, raw) => {
    const r = resolveIn(raw);
    lastIn = r;
    const dir = r.dir;
    if (!dir) return () => false;
    return (n) => n !== dir && isAncestor(dir, n);
  }, { owner: OWNER });

  api.AFTER_QUERY.add({
    id: 'searches-in', order: 60, owner: OWNER,
    run: (search) => {
      const r = lastIn;
      lastIn = null;
      if (!search || !r) return;
      if (!r.dir) {
        search.note = r.why || `No folder ${r.raw} in this directory.`;
        return;
      }
      const where = api.relPath(r.dir) || `${r.dir.n}, the root`;
      search.note = `In ${where}: ${search.note || 'what lies inside it, at any depth.'}`;
    },
  });

  // A search run from elsewhere (the palette, a saved search, a session
  // row, a preset) enters the history too; one typed in Find enters it
  // when Find is left.
  api.AFTER_QUERY.add({
    id: 'searches-history', order: 70, owner: OWNER,
    run: (search, query) => {
      if (search && query.trim() && document.activeElement !== q) record(query);
    },
  });

  /* ---------- saved searches ---------- */

  const named = (s) => `"${s.name}"`;

  function run(s) {
    api.setQuery(s.query);
    document.getElementById('ledger-list')?.focus();
    const n = S.search ? S.search.list.length : 0;
    api.say(`Saved search ${named(s)}: ${fmtCount(n)} match${n === 1 ? '' : 'es'}.`);
  }

  function forget(s) {
    const f = store.forget(s.id);
    if (!f) return;
    redraw();
    api.notice(`The saved search ${named(s)} is forgotten.`, {
      kind: 'info',
      action: { label: 'Undo', run: () => { if (store.reinstate(f.entry, f.at)) { redraw(); api.say(`The saved search ${named(s)} is back.`); } } },
    });
  }

  async function saveSearch() {
    const query = S.query.trim();
    if (!query) {
      api.say('Type a search in Find first, then save it.');
      return;
    }
    const v = await ask({
      title: 'Save search', confirm: 'Save', confirmIcon: 'bookmark',
      body: `Keeps ${query} under a name, in the Places tab and the command palette, for this directory in this browser.`,
      fields: [{ name: 'name', label: 'Name', value: query.slice(0, NAME_MAX) }],
      validate: ({ name: n }) => {
        const t = n.trim();
        if (!t) return 'Enter a name.';
        if (t.length > NAME_MAX) return `A name holds at most ${NAME_MAX} characters.`;
        if (!store.find(t) && store.saved.length >= SAVED_MAX) return `${SAVED_MAX} saved searches is the most Terrane keeps for one directory. Forget one in the Places tab, or use the name of one to replace it.`;
        return null;
      },
    });
    if (!v) return;
    const r = store.save(v.name, query);
    if (r.full) api.notice(`${SAVED_MAX} saved searches is the most Terrane keeps for one directory. Forget one in the Places tab to save another.`, { kind: 'info' });
    else if (r.error) api.notice(r.error, { kind: 'info' });
    else if (r.updated) api.notice(`Saved search ${named(r.entry)} updated: ${query}.`);
    else api.notice(`Search saved as ${named(r.entry)}. Run it from the Places tab or the command palette.`);
    redraw();
  }

  const btn = (label, onclick, { k, name: ic, title } = {}) => el('button', { class: 'btn btn-small', type: 'button', 'data-k': k, title, onclick }, ic ? icon(ic) : null, label);

  function savedSection() {
    const list = store.saved;
    const d = el('details', { class: 'places-searches', open: sectionOpen },
      el('summary', {}, 'Saved searches', el('span', { class: 'n', text: fmtCount(list.length) })),
      list.length ? list.map((s) => el('div', { class: 'item is-static saved-search' },
        el('span', { class: 'saved-mark', 'aria-hidden': 'true' }, icon('bookmark')),
        el('span', {}, el('span', { class: 'nm', text: s.name }), el('code', { class: 'path', text: s.query })),
        el('span', { class: 'saved-actions' },
          btn('Run', () => run(s), { k: `ss:${s.id}:run`, name: 'search', title: `Run ${s.query}` }),
          btn('Forget', () => forget(s), { k: `ss:${s.id}:forget`, name: 'clear' }))))
        : el('p', { class: 'note', text: 'None yet. Save search… on the Findings count row keeps a search under a name, here and in the command palette (Ctrl+K).' }),
      store.failed ? el('p', { class: 'note', text: `This browser refused to keep them (${store.failed}), so they last only until this tab closes.` }) : null);
    d.addEventListener('toggle', () => { sectionOpen = d.open; });
    return d;
  }

  api.LEDGER_SUB.add({
    id: 'save-search', owner: OWNER, tab: 'findings',
    build: ({ search }) => (search ? el('button', {
      class: 'sort', type: 'button', 'data-k': 'save-search', title: 'Keep this search under a name, in the Places tab and the command palette', onclick: saveSearch,
    }, icon('bookmark'), 'Save search…') : null),
  });

  api.TAB_SECTIONS.add({ id: 'saved-searches', order: 30, owner: OWNER, tab: 'places', build: savedSection });

  api.COMMANDS.add({
    id: 'searches', owner: OWNER, section: 'Searches',
    items: () => [
      ...store.saved.map((s) => ({ label: `Run saved search: ${s.name}`, detail: s.query, run: () => run(s) })),
      { label: 'Save this search', detail: S.query.trim() || 'Searches', off: S.search ? null : 'there is no search in Find', run: () => { saveSearch(); } },
    ],
  });

  api.KEYS.add({ id: 'search-history', owner: OWNER, guide: ['Finding your way', '↑ ↓ in Find', 'Earlier / later searches'] });
}
