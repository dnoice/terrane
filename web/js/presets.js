/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Totals and Quick Searches (Terrane Edition - v1.1)
 *     - File Name: presets.js
 *     - Relative Path: web/js/presets.js
 *     - Artifact Type: javascript
 *     - Version: 1.1.0
 *     - Date: 11/14/2026
 *     - Update: Saturday, November 14, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Changelog:
 *     - 1.1.0 (11/14/2026) [dendogg + Anthropic - Claude Opus 5.5] — The
 *       guide's row for gathering a selection becomes two, each a key and its
 *       words: Ctrl+↑ ↓ moves in the list without selecting, Space adds or
 *       drops the row. In region mode the service counts the quick searches
 *       (GET /api/find with limit 0), once per survey, and a quick search
 *       says its count once the service has answered it.
 *     - 1.0.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] —
 *       Initial release.
 *
 * ✒ Description:
 *     What a selection weighs, and the searches worth running often. The
 *     ledger's count row says how many items are selected and how many
 *     bytes they hold; the Survey tab's Quick searches counts four common
 *     questions (big and stale, large media, changed this week, empty
 *     folders) and runs one with a key.
 *
 * ✒ Key Features:
 *     - The selection's total on the Contents and Findings count rows:
 *       "3 selected · 1.2 GB" while more than one item is selected, the
 *       bytes of the selected items not already inside another selected
 *       folder; it is updated in place on every selection change, hidden
 *       at one item or none, and said once with the count and the size
 *     - Survey, Quick searches (after Working sessions, closed until
 *       opened): Big and stale (>100mb older:1y), Large media
 *       (kind:video,audio,image >50mb), Changed this week (newer:7d) and
 *       Empty folders (is:empty is:folder), each with its query and what
 *       it would find, "12 · 3.4 GB"
 *     - The counts come from one walk that tests all four queries, as
 *       Find would read them, the first time the section is open after a
 *       survey, and are kept until the next survey
 *     - Enter or a click runs one into Find, opens Findings, moves to its
 *       list and says how much it found; the command palette offers each
 *       as Quick search: <name>
 *
 * ✒ Usage Instructions:
 *     Listed in features.js and installed by app.js. Select two or more
 *     items (Space in the list, Ctrl+click, Select all) to see their
 *     total; open Survey, Quick searches to count and run the presets.
 *
 * ✒ Examples:
 *     Space on two rows        2 selected · 41.7 MB on the count row
 *     Survey, Quick searches   Big and stale   >100mb older:1y   12 · 3.4 GB
 *     Ctrl+K, "large media"    Quick search: Large media
 *
 * ✒ Other Important Information:
 *     - Dependencies: model.js (parseQuery, formatting), icons.js; app.js's
 *       api: S, QUERY, LEDGER_SUB, AFTER_SELECT, SURVEY, COMMANDS,
 *       setQuery, section, say, el
 *     - Compatible platforms: any browser with ES2022 modules
 *     - Performance: the total walks up from each selected item once
 *       (depth per item, not item against item); the four counts are one
 *       pass over the tree, made only when Quick searches is open
 * ----------------------------------------------------------------------------
 */

import { parseQuery, fmtBytes, fmtCount } from './model.js';
import { icon } from './icons.js';

export const name = 'Totals and quick searches';

const OWNER = 'presets';

/** The quick searches, in the order the Survey lists them. */
export const PRESETS = Object.freeze([
  { id: 'big-stale', label: 'Big and stale', query: '>100mb older:1y' },
  { id: 'large-media', label: 'Large media', query: 'kind:video,audio,image >50mb' },
  { id: 'this-week', label: 'Changed this week', query: 'newer:7d' },
  { id: 'empty-folders', label: 'Empty folders', query: 'is:empty is:folder' },
].map(Object.freeze));

/** The bytes of a selection: each item once, an item inside a selected folder counted with it. */
export function selectionBytes(sel) {
  let bytes = 0;
  for (const n of sel) {
    let inside = false;
    for (let a = n.p; a && !inside; a = a.p) inside = sel.has(a);
    if (!inside) bytes += n.s;
  }
  return bytes;
}

const matches = (n) => `${fmtCount(n)} match${n === 1 ? '' : 'es'}`;

export function install(api) {
  const { S, el } = api;

  /* ---------- the selection's total ---------- */

  const totalText = (sel) => `${fmtCount(sel.size)} selected · ${fmtBytes(selectionBytes(sel))}`;

  const total = () => {
    const many = S.sel.size > 1;
    return el('span', { class: 'sub-sel', 'data-k': 'sel-total', hidden: !many, text: many ? totalText(S.sel) : '' });
  };

  // Runs on every selection change, an arrow step in the list included:
  // at one item or none it only hides the figure.
  api.AFTER_SELECT.add({
    id: 'presets-total', owner: OWNER,
    run: (sel) => {
      const many = sel.size > 1;
      const spans = document.querySelectorAll('#ledger-sub [data-k="sel-total"]');
      if (!many) {
        for (const s of spans) s.hidden = true;
        return;
      }
      const bytes = selectionBytes(sel);
      const text = `${fmtCount(sel.size)} selected · ${fmtBytes(bytes)}`;
      for (const s of spans) {
        s.textContent = text;
        s.hidden = false;
      }
      api.say(`${fmtCount(sel.size)} items selected, ${fmtBytes(bytes)}`);
    },
  });

  api.LEDGER_SUB.add({ id: 'presets-total-contents', owner: OWNER, order: 10, tab: 'contents', build: total });
  api.LEDGER_SUB.add({ id: 'presets-total-findings', owner: OWNER, order: 10, tab: 'findings', build: total });
  // The list's own keys for building a selection (app.js): the guide row
  // stands here, beside the total it feeds, so the core guide is unchanged.
  api.KEYS.add({ id: 'list-gather', owner: OWNER, guide: ['Acting on many', 'Ctrl+↑ ↓', 'Move in the list without selecting'] });
  api.KEYS.add({ id: 'list-gather-space', owner: OWNER, guide: ['Acting on many', 'Space', 'Add or drop the row'] });

  /* ---------- quick searches ---------- */

  // The four counts of one survey: { survey, counts: [{ n, bytes }] }.
  let cache = null;

  /** Counts every preset in one walk, as runSearch would: each entry below the root, bytes of files only. */
  function counts(survey) {
    if (cache?.survey === survey) return cache.counts;
    const tests = PRESETS.map((p) => parseQuery(p.query, api.QUERY));
    const out = PRESETS.map(() => ({ n: 0, bytes: 0 }));
    const stack = [S.model.root];
    while (stack.length) {
      for (const ch of stack.pop().c) {
        if (ch.d) stack.push(ch);
        for (let i = 0; i < tests.length; i++) {
          if (!tests[i](ch)) continue;
          out[i].n++;
          if (!ch.d) out[i].bytes += ch.s;
        }
      }
    }
    cache = { survey, counts: out };
    return out;
  }

  /**
   * Region mode: the four counts asked of the service, one GET /api/find
   * with limit 0 each, once per survey. Resolves to the counts.
   */
  function askCounts(survey) {
    if (cache?.survey === survey) return cache.asking ?? Promise.resolve(cache.counts);
    const asking = Promise.all(PRESETS.map((p) => api.ask('find', { q: p.query, limit: '0' }))).then((list) => {
      const out = list.map((a) => ({ n: a.total, bytes: a.bytes }));
      if (cache?.survey === survey) cache = { survey, counts: out };
      return out;
    }, (err) => {
      if (cache?.survey === survey) cache = null;
      throw err;
    });
    cache = { survey, counts: null, asking };
    return asking;
  }

  async function run(p) {
    // Region mode: the service answers, and the count is said once it has.
    await api.setQuery(p.query);
    document.getElementById('ledger-list')?.focus();
    const n = S.search ? S.search.total ?? S.search.list.length : 0;
    api.say(`Quick search ${p.label}: ${matches(n)}, ${fmtBytes(S.search?.bytes || 0)}.`);
  }

  function quickSearches(survey) {
    const rows = PRESETS.map((p) => el('button', { class: 'item preset-row', type: 'button', 'data-k': `preset:${p.id}`, title: `Find ${p.query}`, onclick: () => run(p) },
      el('span', { class: 'preset-mark', 'aria-hidden': 'true' }, icon('search')),
      el('span', {}, el('span', { class: 'nm', text: p.label }), el('code', { class: 'path', text: p.query })),
      el('span', { class: 'fig', text: '…' })));
    const busy = S.scanning || !!S.survey?.pending;
    // Region mode: the service counts them over the whole tree.
    const region = api.regionMode();
    const d = api.section('Quick searches', fmtCount(PRESETS.length), false,
      el('p', { class: 'note', text: busy ? 'Counted once the survey has finished.' : 'Searches worth running often, counted across every level. Enter puts one in Find.' }),
      rows);
    const show = (list) => list.forEach((c, i) => {
      rows[i].querySelector('.fig').textContent = `${fmtCount(c.n)} · ${fmtBytes(c.bytes)}`;
    });
    // Counted the first time the section is open after a survey.
    const fill = () => {
      if (!d.open || busy || !S.survey) return;
      if (region) {
        const sv = S.survey;
        askCounts(sv).then((list) => { if (S.survey === sv && d.isConnected) show(list); }, () => {});
        return;
      }
      show(counts(S.survey));
    };
    d.addEventListener('toggle', fill);
    if (survey === S.survey) fill();
    return d;
  }

  // After Working sessions (5), before Largest files (10).
  api.SURVEY.add({ id: 'presets', order: 7, owner: OWNER, build: quickSearches });

  api.COMMANDS.add({
    id: 'presets', owner: OWNER, section: 'Quick searches',
    items: () => PRESETS.map((p) => ({ label: `Quick search: ${p.label}`, detail: p.query, run: () => run(p) })),
  });
}
