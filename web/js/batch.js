/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Batch Rename (Terrane Edition - v1.0)
 *     - File Name: batch.js
 *     - Relative Path: web/js/batch.js
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
 *     Renames several items at once, with every new name shown before
 *     anything changes. F2 with more than one item selected opens a sheet
 *     of rules (find and replace, case, a counter, the extension) over a
 *     preview of what each item becomes and why any cannot; Apply sends
 *     one batch the service checks again and journals as one change, so
 *     one Undo puts every name back.
 *
 * ✒ Key Features:
 *     - F2 with several selected (through app.js's RENAME_MANY), the
 *       menu's "Rename N items…", the inspector's Rename… under a
 *       selection, and the command palette; F2 with one item is the
 *       single rename as before
 *     - Refused before the sheet opens, in a sentence: read-only mode,
 *       snapshot mode, anything inside an open archive, more than 5,000
 *       items; the authorized root is left out of the batch
 *     - The rules: Find, Replace, Regular expression, Match case, Include
 *       the extension; Case (keep, lower, upper, title); Number (none,
 *       before, after) with its start, digits and separator; Extension
 *       (keep, lower, upper, set to)
 *     - The preview, a table of Now, Becomes and Note, worked out by
 *       rename.js 120 ms after the last change: rows with a problem
 *       first, then the ones that change, then the unchanged, 300 rows at
 *       most and a line for the rest
 *     - The counter follows the order shown in the ledger list, then
 *       name order for items not listed there
 *     - A summary line, said through the live region once typing pauses:
 *       "12 to rename, 3 unchanged, 2 clash, 1 invalid name"
 *     - Apply stays in the tab order, marked unavailable with its reason
 *       beside it, while a row has a problem other than unchanged or
 *       nothing changes; Enter applies, Escape cancels
 *     - Apply sends { type: 'renames', items } through runOp: the notice
 *       offers Undo, and the renamed items are selected again
 *
 * ✒ Usage Instructions:
 *     Listed in features.js and installed by app.js. Select two or more
 *     items (Ctrl+click, Space in the list, Select all in Findings) and
 *     press F2.
 *
 * ✒ Examples:
 *     F2 on 40 photos, Find IMG_, Replace trip-     40 to rename
 *     Number after, start 1, digits 3, separator -  report-001.pdf, ...
 *     Find (\d+)-(\d+), Replace $2-$1, regular expression
 *     F2 on a.txt and b.txt, Find a, Replace b      1 to rename, 1 unchanged,
 *                                                   then a clash: a.txt
 *                                                   would take b.txt's name
 *
 * ✒ Other Important Information:
 *     - Dependencies: rename.js (plan, summary, noteFor, kindOf, blocker),
 *       ui.js (openSheet), icons.js, model.js (formatting); app.js's api:
 *       S, KEYS, MENU, INSPECTOR.many, RENAME_MANY, COMMANDS, runOp,
 *       writable, hostOf, relPath, listItems, selectAll, notice, say, el,
 *       actionButton
 *     - Compatible platforms: any browser with ES2022 modules and the
 *       dialog element
 *     - Performance: the preview draws at most 300 rows; the plan is one
 *       pass over the batch with one folded set of names per folder
 * ----------------------------------------------------------------------------
 */

import { openSheet } from './ui.js';
import { icon } from './icons.js';
import { plan, summary, noteFor, kindOf, blocker, DEFAULT_RULES, RENAME_MAX } from './rename.js';
import { fmtCount } from './model.js';

export const name = 'Batch rename';

const OWNER = 'batch';
const SECTION = 'Acting on many';
/** Rows the preview draws at most; a line says how many more there are. */
const PREVIEW_MAX = 300;
/** The preview is worked out this long after the last change to a rule. */
const INPUT_MS = 120;
/** The summary is said this long after the last change, so typing is not talked over. */
const SAY_MS = 700;

const byName = (a, b) => a.n.localeCompare(b.n, undefined, { numeric: true, sensitivity: 'base' });

export function install(api) {
  const { S, el } = api;
  const $ = (id) => document.getElementById(id);

  /** Why these items cannot be renamed here, in a sentence, or null. */
  function refusal(nodes) {
    if (S.interior && nodes.some((n) => api.hostOf(n))) return S.interior.lock;
    const ro = api.writable();
    if (ro) return `${ro[0].toUpperCase()}${ro.slice(1)}: nothing can be renamed.`;
    if (nodes.length > RENAME_MAX) return `At most ${fmtCount(RENAME_MAX)} items can be renamed at once; ${fmtCount(nodes.length)} are selected.`;
    return null;
  }

  /** The reason as a menu or button says it: short, in small letters. */
  function offReason(nodes) {
    if (S.interior && nodes.some((n) => api.hostOf(n))) return 'inside an archive';
    const ro = api.writable();
    if (ro) return ro;
    if (nodes.length > RENAME_MAX) return `more than ${fmtCount(RENAME_MAX)} items`;
    return null;
  }

  /** The items in the order shown in the ledger list, then the rest by name: the counter's order. */
  function ordered(nodes) {
    const set = new Set(nodes);
    const shown = api.listItems().filter((n) => set.has(n));
    const seen = new Set(shown);
    return [...shown, ...nodes.filter((n) => !seen.has(n)).sort(byName)];
  }

  /** The planner's entries: one names list per folder, shared by the items in it. */
  function entries(nodes) {
    const names = new Map();
    return nodes.map((n) => {
      let sib = names.get(n.p);
      if (!sib) names.set(n.p, (sib = n.p.c.map((c) => c.n)));
      return { path: api.relPath(n), name: n.n, isDir: !!n.d, siblings: sib };
    });
  }

  /* ---------- the sheet ---------- */

  function open(selected) {
    const nodes = ordered(selected.filter((n) => n.p));
    if (!nodes.length) {
      api.notice('The authorized root cannot be renamed.', { kind: 'info' });
      return;
    }
    const why = refusal(nodes);
    if (why) {
      api.notice(why, { kind: 'info' });
      return;
    }
    const list = entries(nodes);
    const platform = S.info.platform || 'linux';
    const folders = new Set(nodes.map((n) => n.p)).size;
    const what = `${fmtCount(nodes.length)} item${nodes.length === 1 ? '' : 's'}`;

    const text = (nm, label, value = '', more = {}) => el('label', { class: 'field' }, el('span', { text: label }),
      el('input', { type: 'text', name: nm, value, autocomplete: 'off', spellcheck: 'false', ...more }));
    const number = (nm, label, value, min, max) => el('label', { class: 'field is-number' }, el('span', { text: label }),
      el('input', { type: 'number', name: nm, value: String(value), min: String(min), max: String(max), step: '1', inputmode: 'numeric' }));
    const check = (nm, label) => el('label', { class: 'rename-check' }, el('input', { type: 'checkbox', name: nm }), el('span', { text: label }));
    const choice = (nm, label, options) => el('label', { class: 'field is-choice' }, el('span', { text: label }),
      el('select', { name: nm }, options.map(([v, t]) => el('option', { value: v, text: t }))));

    const form = el('form', { class: 'dialog-form rename-form', novalidate: true });
    const sum = el('p', { class: 'rename-summary' });
    const tbody = el('tbody');
    const more = el('p', { class: 'rename-more', hidden: true });
    const preview = el('div', { class: 'rename-preview', tabindex: '0', role: 'region', 'aria-label': 'Preview of the new names' },
      el('table', {},
        el('thead', {}, el('tr', {}, el('th', { scope: 'col', text: 'Now' }), el('th', { scope: 'col', text: 'Becomes' }), el('th', { scope: 'col', text: 'Note' }))),
        tbody),
      more);
    const whyLine = el('p', { class: 'rename-why', id: 'rename-why' });
    const apply = el('button', { type: 'submit', class: 'btn btn-raised btn-primary', 'aria-describedby': 'rename-why' }, icon('rename'), 'Apply');
    const cancel = el('button', { type: 'button', class: 'btn', text: 'Cancel' });

    form.append(
      el('h2', { text: `Rename ${what}` }),
      el('p', { class: 'dialog-body', text: `${folders === 1 ? 'In one folder' : `In ${fmtCount(folders)} folders`}. The new names are checked as you type; nothing changes until Apply, and one Undo puts every name back.` }),
      el('div', { class: 'rename-rules' },
        el('fieldset', { class: 'rename-set is-find' }, el('legend', { text: 'Find and replace' }),
          text('find', 'Find'), text('replace', 'Replace with'),
          el('div', { class: 'rename-checks' }, check('regex', 'Regular expression ($1 to $9 and $& in Replace)'), check('matchCase', 'Match case'), check('wholeName', 'Include the extension'))),
        el('fieldset', { class: 'rename-set' }, el('legend', { text: 'Case and number' }),
          choice('caseMode', 'Case', [['keep', 'Keep'], ['lower', 'lower case'], ['upper', 'UPPER CASE'], ['title', 'Title Case']]),
          choice('counter', 'Number', [['none', 'None'], ['before', 'Before the name'], ['after', 'After the name']]),
          el('div', { class: 'rename-row' }, number('start', 'Start', 1, 0, 999999999), number('pad', 'Digits', 1, 1, 6), text('sep', 'Separator', ' '))),
        el('fieldset', { class: 'rename-set' }, el('legend', { text: 'Extension' }),
          choice('ext', 'Extension', [['keep', 'Keep'], ['lower', 'lower case'], ['upper', 'UPPER CASE'], ['set', 'Set to']]),
          text('extText', 'New extension', '', { placeholder: 'txt' }),
          el('p', { class: 'rename-hint', text: 'Folders take Find, Case and Number on their whole name, and no extension.' }))),
      sum, preview, whyLine,
      el('div', { class: 'dialog-actions' }, cancel, apply));

    const field = (nm) => form.elements.namedItem(nm);
    const rules = () => ({
      ...DEFAULT_RULES,
      find: field('find').value, replace: field('replace').value,
      regex: field('regex').checked, matchCase: field('matchCase').checked, wholeName: field('wholeName').checked,
      caseMode: field('caseMode').value, counter: field('counter').value,
      start: field('start').value, pad: field('pad').value, sep: field('sep').value,
      ext: field('ext').value, extText: field('extText').value,
    });

    let current = { rows: [], error: null };
    let timer = 0;
    let sayTimer = 0;

    /** The fields that mean nothing under the current choices are off. */
    function enable() {
      const numbered = field('counter').value !== 'none';
      for (const nm of ['start', 'pad', 'sep']) field(nm).disabled = !numbered;
      field('extText').disabled = field('ext').value !== 'set';
    }

    function row(x) {
      const kind = kindOf(x);
      return el('tr', { class: `is-${kind}` },
        el('td', { class: 'rename-now' }, el('code', { text: x.from }), x.isDir ? el('span', { class: 'rename-dir', text: ' (folder)' }) : null),
        el('td', { class: 'rename-to' }, kind === 'unchanged' ? el('span', { class: 'rename-same', text: '—' }) : el('code', { text: x.to })),
        el('td', { class: 'rename-note', text: noteFor(x) }));
    }

    /** Works the plan out again and draws it; says the summary once typing pauses. */
    function refresh({ speak = true } = {}) {
      clearTimeout(timer);
      timer = 0;
      enable();
      current = plan(list, rules(), { platform });
      const { rows, error } = current;
      if (error) {
        sum.textContent = error;
        tbody.replaceChildren(el('tr', { class: 'is-invalid' }, el('td', { colspan: '3', class: 'rename-note', text: error })));
        more.hidden = true;
      } else {
        sum.textContent = summary(rows);
        // Problems first, then what changes, then what stays.
        const rank = (x) => (x.problem && x.problem !== 'unchanged' ? 0 : !x.problem ? 1 : 2);
        const sorted = rows.map((x, i) => [x, i]).sort((a, b) => rank(a[0]) - rank(b[0]) || a[1] - b[1]).map(([x]) => x);
        tbody.replaceChildren(...sorted.slice(0, PREVIEW_MAX).map(row));
        const rest = sorted.length - PREVIEW_MAX;
        more.hidden = rest <= 0;
        more.textContent = rest > 0 ? `and ${fmtCount(rest)} more not shown` : '';
      }
      const stop = blocker(current);
      whyLine.textContent = stop || '';
      // Nothing to change yet is no fault: said quietly, not in garnet.
      whyLine.classList.toggle('is-idle', !!stop && !error && !rows.some((x) => x.problem && x.problem !== 'unchanged'));
      if (stop) apply.setAttribute('aria-disabled', 'true');
      else apply.removeAttribute('aria-disabled');
      apply.title = stop ? `Unavailable: ${stop}` : 'Rename them (Enter)';
      if (speak) {
        clearTimeout(sayTimer);
        sayTimer = setTimeout(() => {
          if ($('dialog').open && form.isConnected) api.say(error || summary(current.rows));
        }, SAY_MS);
      }
    }

    function later() {
      clearTimeout(timer);
      timer = setTimeout(refresh, INPUT_MS);
    }

    form.addEventListener('input', later);
    form.addEventListener('change', later);
    cancel.addEventListener('click', () => sheet.close());
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (timer) refresh({ speak: false });
      const stop = blocker(current);
      if (stop) {
        api.say(`Apply is unavailable. ${stop}`);
        whyLine.classList.remove('is-nudged');
        void whyLine.offsetWidth;
        whyLine.classList.add('is-nudged');
        return;
      }
      const items = current.rows.filter((x) => !x.problem).map((x) => ({ path: x.path, name: x.to }));
      clearTimeout(sayTimer);
      sheet.close(() => send(items));
    });

    const sheet = openSheet((body) => body.append(form), {
      className: 'is-rename', label: `Rename ${what}`,
      onKey: (e) => {
        // Enter applies from any field, a choice or a box included; on a
        // button it presses that button, as a button does.
        if (e.key !== 'Enter' || e.ctrlKey || e.metaKey || e.altKey) return;
        const t = e.target;
        if (t.closest?.('button') || t.tagName === 'TEXTAREA') return;
        e.preventDefault();
        e.stopPropagation();
        form.requestSubmit();
      },
    });
    $('dialog').addEventListener('close', () => {
      clearTimeout(timer);
      clearTimeout(sayTimer);
    }, { once: true });
    refresh({ speak: false });
    field('find').focus();
    api.say(`Rename ${what} together. ${summary(current.rows)}. Enter applies, Escape cancels.`);
  }

  /** Sends the batch; once done, the renamed items are selected again. */
  async function send(items) {
    const res = await api.runOp({ type: 'renames', items });
    if (!res?.renamed?.length) return;
    const nodes = res.renamed.map(([, to]) => S.model.find(to)).filter(Boolean);
    if (nodes.length) api.selectAll(nodes);
  }

  /* ---------- registry entries ---------- */

  api.RENAME_MANY.add({ id: 'batch', owner: OWNER, run: (nodes) => open(nodes) });

  // F2 itself is the controller's key; this row says what it does with several.
  api.KEYS.add({ id: 'batch-guide', owner: OWNER, guide: [SECTION, 'F2 (several selected)', 'Rename them together, with a preview'] });

  api.MENU.add({
    id: 'batch', owner: OWNER, order: 60,
    many: (nodes, ctx) => {
      const off = ctx.off || offReason(nodes);
      return [{ label: `Rename ${fmtCount(nodes.length)} items…`, icon: 'rename', hint: 'F2', run: () => open(nodes), disabled: !!off, reason: off || undefined }];
    },
  });

  api.INSPECTOR.many.add({
    id: 'batch', owner: OWNER, order: 10,
    build: (nodes, ctx) => el('div', { class: 'actions-grid batch-action' },
      api.actionButton('Rename…', () => open(nodes), { off: ctx.off || offReason(nodes), icon: 'rename', title: `Rename the ${fmtCount(nodes.length)} items together (F2)`, wide: true })),
  });

  api.COMMANDS.add({
    id: 'batch', owner: OWNER, section: SECTION,
    items: () => {
      const nodes = [...S.sel];
      const n = nodes.length;
      return [{
        label: n > 1 ? `Rename the ${fmtCount(n)} selected items together…` : 'Rename several items together…', hint: 'F2',
        off: n < 2 ? 'select two or more items first' : offReason(nodes), run: () => open(nodes),
      }];
    },
  });
}
