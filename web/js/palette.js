/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Command Palette (Terrane Edition - v1.0)
 *     - File Name: palette.js
 *     - Relative Path: web/js/palette.js
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
 *     Ctrl+K opens one field that reaches every action Terrane has and
 *     every folder and file in the directory by a few typed letters. The
 *     actions come from the key table and from the commands features
 *     offer, so the palette lists what the guide lists and more; places
 *     are ranked by fuzzy match over every name in the tree.
 *
 * ✒ Key Features:
 *     - Ctrl+K from the world, the ledger or a button; not from a text
 *       field (Find keeps the browser's own Ctrl+K), nor while a dialog
 *       or menu is open
 *     - A combobox over a listbox: ArrowUp, ArrowDown, Home and End move
 *       the active option (aria-activedescendant), Enter runs it, Escape
 *       closes and focus goes back where it was; a click runs an option.
 *       Home and End belong to the list, not to the caret in the field
 *     - Actions: every key with a guide row (one item per key where the
 *       entry gives labels, such as Lens: age), then the COMMANDS that
 *       have no key (saved searches, Copy link); the hint is the key
 *     - An action that cannot run here stays listed, marked unavailable
 *       with its reason, and Enter says the reason; the keys that need
 *       the 3D view (gl: true) are unavailable without WebGL
 *     - Places: every folder and file in the tree, ranked by fuzzy match
 *       on the name, or on the path when the query holds a '/'; folders
 *       before files on an equal score; built when the palette opens and
 *       kept until the next survey or refresh. Archive entries are not
 *       listed: they hang from a file, not from the tree
 *     - An empty query lists every action; typed, the best 8 actions come
 *       first, then the best 40 places, ranked 60 ms after the last key
 *     - Going to a place: a folder is flown to (or gone to without
 *       WebGL); a file is revealed and selected; either way Contents
 *       shows it and the ledger list takes focus, its cursor on the file
 *     - The live region says how many actions and places match, and
 *       describes a place as the arrows reach it
 *     - An action runs after the sheet has closed and focus is back, so
 *       one that moves focus keeps it where it put it
 *
 * ✒ Usage Instructions:
 *     Listed in features.js and installed by app.js. A feature offers a
 *     command without a key through the COMMANDS registry:
 *         api.COMMANDS.add({ id: 'link', owner: 'resume', section: 'Links',
 *           items: () => [{ label: 'Copy link to here', run: copyLink }] });
 *     A key entry takes part through its guide row; labels gives one
 *     item per key, palette: false leaves it out, gl: true marks it as
 *     needing the 3D view.
 *
 * ✒ Examples:
 *     Ctrl+K, "age", Enter        the Age lens
 *     Ctrl+K, "bulk", Enter       to the folder bulk-write; Contents shows it
 *     Ctrl+K, "docs/raw", Enter   to the best path through docs and raw
 *     Ctrl+K, "copy li", Enter    Copy link to here
 *
 * ✒ Other Important Information:
 *     - Dependencies: ui.js (openSheet, el), fuzzy.js (rank), icons.js,
 *       model.js (KINDS, fmtBytes, fmtCount), theme.js (cssHex); app.js's
 *       api: S, KEYS, COMMANDS, AFTER_SURVEY, AFTER_REFRESH, setFocus,
 *       select, reveal, drawLedger, cursorTo, relPath, describe, say,
 *       notice
 *     - Compatible platforms: any browser with ES2022 modules and the
 *       dialog element
 *     - Performance: the list of places costs one walk of the tree and one
 *       lower-cased name per entry, made on the first open after a survey;
 *       paths are made only when a query first holds a '/'
 *     - Limitations: Ctrl+K inside the Find field is the browser's; press
 *       Escape or Tab out of it first
 * ----------------------------------------------------------------------------
 */

import { openSheet, el } from './ui.js';
import { rank } from './fuzzy.js';
import { icon } from './icons.js';
import { KINDS, fmtBytes, fmtCount } from './model.js';
import { cssHex } from './theme.js';

export const name = 'Command palette';

const OWNER = 'palette';
const SECTION = 'Finding your way';
const ACTIONS_MAX = 8;
const PLACES_MAX = 40;
const RANK_MS = 60;
const NO_GL = 'needs the 3D view, which this browser could not start';

/** A key as the palette shows it: letters in capitals, with its chord. */
const keyLabel = (k, mod) => {
  const base = k.length === 1 ? k.toUpperCase() : k === 'Delete' ? 'Del' : k;
  return mod === 'ctrl' ? `Ctrl+${base}` : mod === 'alt' ? `Alt+${base}` : base;
};

export function install(api) {
  const { S } = api;
  const $ = (id) => document.getElementById(id);

  /* ---------- places: every folder and file, folders first ---------- */

  // nodes[k] and lower[k] side by side; paths (and their lower-cased form)
  // only once a query asks for them.
  let places = null;
  const forget = () => { places = null; };

  function placeList() {
    if (places) return places;
    const dirs = [];
    const files = [];
    const stack = [S.model.root];
    while (stack.length) {
      const d = stack.pop();
      for (const ch of d.c) {
        if (ch.d) {
          dirs.push(ch);
          stack.push(ch);
        } else files.push(ch);
      }
    }
    const nodes = dirs.concat(files);
    places = { nodes, lower: nodes.map((n) => n.n.toLowerCase()), paths: null, lowerPaths: null, index: Array.from(nodes.keys()) };
    return places;
  }

  function withPaths(P) {
    if (!P.paths) {
      P.paths = P.nodes.map((n) => api.relPath(n));
      P.lowerPaths = P.paths.map((p) => p.toLowerCase());
    }
    return P;
  }

  /* ---------- actions: the key table, then COMMANDS ---------- */

  function runKey(x, k, label) {
    const mod = x.mod || '';
    const c = {
      e: { key: k, shiftKey: false, preventDefault() {} }, k, t: $('view'),
      ctrl: mod === 'ctrl', alt: mod === 'alt', inList: false, onCanvas: true, palette: true,
    };
    try {
      if (x.when && !x.when(c)) {
        api.say(`${label} does not apply here.`);
        return;
      }
      x.run(c);
    } catch (err) {
      console.error(`The palette could not run "${x.id}":`, err);
      api.notice(`${label} could not run: ${err?.message || err}`, { kind: 'error' });
    }
  }

  function actions() {
    const out = [];
    for (const x of api.KEYS) {
      if (!x.keys?.length || !x.guide || x.palette === false || typeof x.run !== 'function') continue;
      const [section, keys, text] = x.guide;
      const off = x.gl && S.noGL ? NO_GL : null;
      const mod = x.mod || '';
      if (x.labels) {
        for (const k of x.keys) {
          if (!Object.hasOwn(x.labels, k)) continue;
          const label = x.labels[k];
          out.push({ label, detail: section, hint: keyLabel(k, mod), off, run: () => runKey(x, k, label) });
        }
      } else out.push({ label: text, detail: section, hint: keys, off, run: () => runKey(x, x.keys[0], text) });
    }
    for (const c of api.COMMANDS) {
      let items = [];
      try {
        items = c.items() || [];
      } catch (err) {
        console.error(`COMMANDS "${c.id}" failed:`, err);
      }
      for (const it of items) {
        if (it && typeof it.label === 'string' && typeof it.run === 'function') {
          out.push({ label: it.label, detail: it.detail || c.section || '', hint: it.hint || '', off: it.off || null, run: it.run });
        }
      }
    }
    return out;
  }

  /* ---------- the sheet ---------- */

  function open() {
    const all = actions();
    const input = el('input', {
      type: 'text', class: 'palette-input', role: 'combobox', autocomplete: 'off', spellcheck: 'false',
      'aria-expanded': 'true', 'aria-controls': 'palette-list', 'aria-autocomplete': 'list',
      'aria-label': 'Command palette: an action, a folder or a file', placeholder: 'An action, a folder or a file…',
    });
    const listbox = el('div', { id: 'palette-list', class: 'palette-list', role: 'listbox', 'aria-label': 'Actions and places' });
    const foot = el('p', { class: 'palette-foot', 'aria-hidden': 'true' }, el('kbd', { text: '↑' }), el('kbd', { text: '↓' }), ' choose · ',
      el('kbd', { text: 'Enter' }), ' runs · ', el('kbd', { text: 'Esc' }), ' closes · a / in the query matches paths');
    let shown = [];
    let active = 0;
    let timer = 0;
    let sayTimer = 0;
    let done = false;

    const option = (item, k) => {
      const id = `palette-opt-${k}`;
      const node = item.node;
      const body = node
        ? [el('span', { class: node.d ? 'swatch is-dir' : 'swatch', style: node.d ? null : { background: cssHex(KINDS[node.k].color) } }),
          el('span', { class: 'pal-text' }, el('span', { class: 'pal-label', text: node.n }), el('span', { class: 'pal-detail', text: api.relPath(node.p) || '/' })),
          el('span', { class: 'pal-fig', text: node.d ? `${fmtCount(node.fc)} files` : fmtBytes(node.s) })]
        : [icon(item.off ? 'info' : 'goThere'),
          el('span', { class: 'pal-text' }, el('span', { class: 'pal-label', text: item.label }), item.detail ? el('span', { class: 'pal-detail', text: item.detail }) : null,
            item.off ? el('span', { class: 'pal-why', text: `Unavailable: ${item.off}` }) : null),
          item.hint ? el('kbd', { text: item.hint }) : el('span')];
      const row = el('div', {
        id, class: `palette-option${node ? ' is-place' : ''}`, role: 'option', 'aria-selected': 'false', 'aria-disabled': item.off ? 'true' : null,
        onpointerdown: (e) => e.preventDefault(),
        onclick: () => { setActive(k); choose(); },
      }, ...body);
      return row;
    };

    function setActive(k, { speak = false } = {}) {
      if (!shown.length) {
        input.removeAttribute('aria-activedescendant');
        return;
      }
      active = Math.max(0, Math.min(shown.length - 1, k));
      for (const r of listbox.querySelectorAll('[aria-selected="true"]')) r.setAttribute('aria-selected', 'false');
      const row = $(`palette-opt-${active}`);
      if (row) {
        row.setAttribute('aria-selected', 'true');
        input.setAttribute('aria-activedescendant', row.id);
        row.scrollIntoView({ block: 'nearest' });
      }
      const item = shown[active];
      if (speak && item?.node) api.say(api.describe(item.node));
    }

    function draw(acts, spots) {
      shown = [...acts, ...spots.map((node) => ({ node }))];
      const parts = [];
      if (acts.length) parts.push(el('div', { class: 'palette-group', role: 'presentation', text: 'Actions' }));
      acts.forEach((a, k) => parts.push(option(a, k)));
      if (spots.length) parts.push(el('div', { class: 'palette-group', role: 'presentation', text: 'Places' }));
      spots.forEach((n, k) => parts.push(option({ node: n }, acts.length + k)));
      if (!shown.length) parts.push(el('p', { class: 'palette-empty', role: 'presentation', text: 'Nothing matches. Try fewer letters, or a / to search paths.' }));
      listbox.replaceChildren(...parts);
      setActive(0);
      clearTimeout(sayTimer);
      sayTimer = setTimeout(() => {
        if (done) return;
        const a = `${fmtCount(acts.length)} action${acts.length === 1 ? '' : 's'}`;
        api.say(input.value.trim() ? `${a}, ${fmtCount(spots.length)} place${spots.length === 1 ? '' : 's'}` : a);
      }, 250);
    }

    function search() {
      timer = 0;
      const q = input.value.trim();
      if (!q) {
        draw(all, []);
        return;
      }
      const acts = rank(q, all, { limit: ACTIONS_MAX, key: (a) => a.label }).map((r) => r.item);
      const P = placeList();
      const byPath = q.includes('/');
      if (byPath) withPaths(P);
      const spots = rank(q, P.index, {
        limit: PLACES_MAX,
        key: byPath ? (k) => P.paths[k] : (k) => P.nodes[k].n,
        lower: byPath ? (k) => P.lowerPaths[k] : (k) => P.lower[k],
      }).map((r) => P.nodes[r.item]);
      draw(acts, spots);
    }

    function goPlace(node) {
      if (node.d) api.setFocus(node);
      else if (S.noGL) {
        api.setFocus(node.p);
        api.select(node);
      } else api.reveal(node);
      S.tab = 'contents';
      api.drawLedger();
      if (!node.d) api.cursorTo(node);
      $('ledger-list').focus();
    }

    function choose() {
      if (timer) {
        clearTimeout(timer);
        search();
      }
      const item = shown[active];
      if (!item) return;
      if (item.off) {
        api.say(`${item.label} is unavailable: ${item.off}.`);
        return;
      }
      done = true;
      clearTimeout(sayTimer);
      sheet.close(() => (item.node ? goPlace(item.node) : item.run()));
    }

    const sheet = openSheet((body) => {
      body.append(el('div', { class: 'palette-head' }, icon('search'), input), listbox, foot);
    }, {
      className: 'is-palette', label: 'Command palette',
      onKey: (e) => {
        if (e.target !== input) return;
        const n = shown.length;
        if (e.key === 'ArrowDown') setActive((active + 1) % Math.max(1, n), { speak: true });
        else if (e.key === 'ArrowUp') setActive((active - 1 + n) % Math.max(1, n), { speak: true });
        else if (e.key === 'Home') setActive(0, { speak: true });
        else if (e.key === 'End') setActive(n - 1, { speak: true });
        else if (e.key === 'Enter') choose();
        else if (e.key === 'Escape') {
          done = true;
          clearTimeout(sayTimer);
          sheet.close();
        } else return;
        e.preventDefault();
        e.stopPropagation();
      },
    });
    input.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(search, input.value.trim() ? RANK_MS : 0);
    });
    draw(all, []);
    input.focus();
  }

  /* ---------- registry entries ---------- */

  api.KEYS.add({
    id: 'palette', owner: OWNER, mod: 'ctrl', keys: ['k'], inList: true, palette: false,
    run: () => { open(); }, guide: [SECTION, 'Ctrl+K', 'Command palette: every action, folder and file'],
  });

  // The guide has no row of its own for ?, so the palette names it here.
  api.COMMANDS.add({
    id: 'palette-guide', owner: OWNER, order: 90, section: 'Help',
    items: () => [{ label: 'Show the keys and the guide', hint: '?', run: () => api.KEYS.get('guide')?.run({ k: '?' }) }],
  });

  // The places are of the tree as it was surveyed; a survey or a refresh
  // makes them again on the next open.
  api.AFTER_SURVEY.add({ id: 'palette', owner: OWNER, run: forget });
  api.AFTER_REFRESH.add({ id: 'palette', owner: OWNER, run: forget });
}
