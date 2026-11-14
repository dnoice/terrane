/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Time as a Dimension (Terrane Edition - v1.2)
 *     - File Name: time.js
 *     - Relative Path: web/js/time.js
 *     - Artifact Type: javascript
 *     - Version: 1.2.0
 *     - Date: 11/13/2026
 *     - Update: Friday, November 13, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Changelog:
 *     - 1.2.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] —
 *       , . < > carry one label each for the command palette: one date
 *       earlier or later, the earliest date, the present.
 *     - 1.1.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] —
 *       Inside an open archive a folder is counted from its own
 *       entries, in a table built from its listing on the same ladder
 *       (tableOf), for the Since section, the hover line, the sentence,
 *       T and the layout's lowering; a rebuilt table redraws the
 *       inspector and Contents. fmtDay comes from model.js.
 *     - 1.0.0 (11/12/2026) [dendogg + Anthropic - Claude Opus 5.5] —
 *       Initial release.
 *
 * ✒ Description:
 *     The date scrub. It looks the world back to a date on the age table's
 *     ladder: whatever changed after that date lies flat, crossed corner
 *     to corner, and a closed mass is lowered to the share of its bytes
 *     that it kept unchanged. Footprints and positions stay as they are
 *     now, so the eye can compare a place with itself. Everything the
 *     world shows is also said, listed in the ledger and summed in the
 *     inspector, so the route works without the 3D view.
 *
 * ✒ Key Features:
 *     - T looks back to the byte-weighted median step of the folder you
 *       are in (half of it changed since) and returns; , and . step one
 *       rung earlier or later; < goes to the earliest rung, > to the
 *       present; Escape returns, after the kind filter and before search
 *     - An As of stepper in the title block, reachable by Tab, showing
 *       the date as MM/DD/YYYY or Now
 *     - The layout reads one option, asOf { t, kept }, through
 *       LAYOUT_OPTS; nothing else in the controller learns about time
 *     - Sentences in the live region, 250 ms after the last step, with
 *       the folder you are in: files and bytes changed since the date
 *     - Inspector, in the "You are in" summary and for a selection: Since
 *       MM/DD/YYYY with changed and unchanged bytes and files, share bars,
 *       and Where the change is (up to eight entries that reveal)
 *     - Crossed swatches on Contents rows, a hover line for every block,
 *       and a Reading the world row for the convention
 *     - Uses the shared age table (S.ages); inside an open archive,
 *       which that table does not hold, a folder is counted from the
 *       archive's own entries, in a table built once per archive
 *
 * ✒ Usage Instructions:
 *     Listed in features.js and installed by app.js. S.time is null at
 *     the present, otherwise a frozen { k, t, date, crossed(node) }: the
 *     ladder step, its date (ms), that date as MM/DD/YYYY, and whether a
 *     node is drawn crossed (rowFor reads it for the swatch).
 *
 * ✒ Examples:
 *     T            look back to where half of this folder changed since
 *     , , ,        three rungs further back
 *     >            back to the present ("Back to the present.")
 *
 * ✒ Other Important Information:
 *     - Dependencies: model.js (formatting), timeline.js (the ladder),
 *       layout.js (BOX, AUX); app.js's api: S, the registries, say,
 *       queueLayout, drawLedger, drawInspector, el, fact, shareBar, pct,
 *       itemButton
 *     - Compatible platforms: any browser with ES2022 modules
 *     - Semantics: "changed" means a modification time after the date:
 *       the last change, never a creation or an arrival. A copy or a
 *       checkout restamps files, and those count as changed
 *     - Limitations: scree tiles do not take part yet; steps follow the
 *       ladder, not the calendar
 * ----------------------------------------------------------------------------
 */

import { fmtBytes, fmtCount, fmtAge, fmtDay } from './model.js';
import { STEPS, buildAgeTable } from './timeline.js';
import { BOX, AUX } from './layout.js';

export const name = 'Time';

const OWNER = 'time';
const SAY_MS = 250;
const WHERE_MAX = 8;
const EARLIEST = STEPS - 1;

/** A date as the house writes it, MM/DD/YYYY: model.js's, offered here too. */
export { fmtDay };

/**
 * Whether a node is drawn crossed at step k of the age table A, by the
 * rules layout.js draws with: a file or an empty folder changed after the
 * date, or a folder that kept none of its bytes unchanged. A sealed
 * folder never is: nothing is known of its contents.
 */
export function crossedAt(A, k, node) {
  const t = A.T[k];
  if (!node.d) return node.m > t;
  if (node.e) return false;
  if (!node.c.length) return node.m > t;
  return node.mm > t && A.kept(node, k) <= 0;
}

/**
 * The age table that counts node: B, an open archive's own table, for a
 * folder B holds and A (the shared table of the tree on disk) does not;
 * A for everything else. A file needs no row, so A answers for it.
 */
export const tableOf = (A, B, node) => (!A || !node?.d || A.has(node) || !B?.has(node) ? A : B);

/** Changed and total figures for a node at step k; shares by bytes, or by files when it holds none. */
export function figures(A, k, node) {
  const tb = A.totalBytes(node);
  const tf = A.totalFiles(node);
  const cb = A.changedBytes(node, k);
  const cf = A.changedFiles(node, k);
  const share = tb > 0 ? cb / tb : tf > 0 ? cf / tf : 0;
  return { tb, tf, cb, cf, share };
}

const pctOf = (x) => `${(x * 100).toFixed(x > 0 && x < 0.1 ? 1 : 0)}%`;

export function install(api) {
  const { S, el, fact, shareBar } = api;
  const $ = (id) => document.getElementById(id);
  const cell = $('time-cell');
  const val = $('time-val');
  const earlierBtn = $('time-earlier');
  const laterBtn = $('time-later');

  /**
   * The open archive's own table: S.ages holds only the tree on disk, so
   * an archive's folders are counted from its listing, on the same ladder
   * (the same anchor). Built once per archive and table.
   */
  let inner = null;
  const archiveTable = () => {
    const I = S.interior;
    const A = S.ages;
    if (!I || !A) {
      inner = null;
      return null;
    }
    if (!inner || inner.root !== I.root || inner.anchor !== A.anchor) inner = { root: I.root, anchor: A.anchor, table: buildAgeTable(I.root, A.anchor) };
    return inner.table;
  };

  /** The table that counts node: the archive's for a folder inside it, S.ages otherwise. */
  const tableFor = (node) => {
    const A = S.ages;
    if (!A || !node?.d || A.has(node)) return A;
    return tableOf(A, archiveTable(), node);
  };

  /** S.time for step k of the current table; null at the present. */
  const stateFor = (k) => {
    if (!k || !S.ages) return null;
    const t = S.ages.T[k];
    return Object.freeze({ k, t, date: fmtDay(t), crossed: (node) => !!S.ages && !!node && crossedAt(tableFor(node), k, node) });
  };

  /* ---------- what is said ---------- */

  let sayTimer = 0;
  let pending = null;
  /** Speaks 250 ms after the last call, so a held key says only where it stopped. */
  const speak = (how) => {
    pending = how;
    clearTimeout(sayTimer);
    sayTimer = setTimeout(() => {
      sayTimer = 0;
      api.say(sentence(pending));
    }, SAY_MS);
  };

  function sentence(how) {
    if (how === 'present') return 'Back to the present.';
    if (how === 'at-present') return 'Already at the present. Press T or comma to look back.';
    if (how === 'not-ready') return 'Time is not ready: the survey has not finished.';
    const st = S.time;
    if (!st || !S.ages) return 'Back to the present.';
    const f = S.focus;
    const { tb, tf, cb, cf, share } = figures(tableFor(f), st.k, f);
    const where = f.p ? f.n : `${f.n} (the root)`;
    let text = `As of ${st.date}: `;
    if (!tf) text += `${where} holds no files.`;
    else if (!cf) text += `nothing in ${where} changed since then.`;
    else text += `${fmtCount(cf)} of ${fmtCount(tf)} files in ${where} changed since then: ${fmtBytes(cb)}, ${pctOf(share)} of its ${tb > 0 ? 'bytes' : 'files'}.`;
    if (how === 'enter') text += ' What changed since lies flat and crossed. Escape returns to the present.';
    if (how === 'earliest' || (how === 'step' && st.k === EARLIEST)) text += ' This is the earliest date.';
    return text;
  }

  /* ---------- the title block cell ---------- */

  function drawCell() {
    if (!val) return;
    const st = S.time;
    val.textContent = st ? st.date : 'Now';
    cell?.classList.toggle('is-on', !!st);
    laterBtn?.setAttribute('aria-disabled', String(!st));
    earlierBtn?.setAttribute('aria-disabled', String(!!st && st.k >= EARLIEST));
  }

  /* ---------- moving through time ---------- */

  /**
   * Goes to ladder step k (0 is the present) and redraws everything that
   * shows it. Looking back needs the age table; the present never does, so
   * Escape cannot stick on the time view while a rescan rebuilds it.
   */
  function go(k, how) {
    k = Math.max(0, Math.min(EARLIEST, k | 0));
    if (k && !S.ages) {
      speak('not-ready');
      return;
    }
    const was = S.time?.k ?? 0;
    S.time = stateFor(k);
    drawCell();
    if (k !== was) {
      // Coalesced: a held key while a layout is pending does not stack them.
      api.queueLayout(0);
      api.drawLedger(true);
      api.drawInspector();
    }
    speak(how || (k ? 'step' : 'present'));
  }

  const now = () => S.time?.k ?? 0;

  function toggle() {
    if (S.time) return go(0, 'present');
    if (!S.ages) return speak('not-ready');
    // Half of the folder you are in changed since this step; a folder
    // with no files looks to the root's.
    let k = tableFor(S.focus).medianStep(S.focus);
    if (k < 1) k = S.ages.medianStep(S.model.root);
    return go(Math.max(1, k), 'enter');
  }

  function step(dir) {
    const k = now();
    if (dir < 0 && !k) return speak('at-present');
    if (dir > 0 && k >= EARLIEST) return speak('earliest');
    return go(k + dir, k ? undefined : 'enter');
  }

  const earliest = () => go(EARLIEST, now() ? 'earliest' : 'enter');
  const present = () => (now() ? go(0, 'present') : speak('at-present'));

  earlierBtn?.addEventListener('click', () => step(1));
  laterBtn?.addEventListener('click', () => step(-1));

  /* ---------- the inspector ---------- */

  /** "Since MM/DD/YYYY": what changed after the date, what did not, and where. */
  function since(node) {
    const st = S.time;
    if (!st || !S.ages) return null;
    const A = tableFor(node);
    const k = st.k;
    const title = el('div', { class: 'section-title', text: `Since ${st.date}` });
    if (!node.d) {
      const changed = node.m > st.t;
      return [title, el('dl', { class: 'facts since' },
        fact(changed ? 'Changed' : 'Not changed', changed ? `after this date, ${fmtAge(node.m)}` : 'since this date'),
        changed ? fact('In the world', 'lies flat, crossed corner to corner') : null)];
    }
    const { tb, tf, cb, cf, share } = figures(A, k, node);
    const facts = el('dl', { class: 'facts since' },
      fact('Changed', el('b', { text: fmtBytes(cb) }), ` · ${fmtCount(cf)} file${cf === 1 ? '' : 's'} · ${pctOf(share)}`, shareBar(share, 1)),
      fact('Not changed', `${fmtBytes(tb - cb)} · ${fmtCount(tf - cf)} file${tf - cf === 1 ? '' : 's'} · ${pctOf(tf ? 1 - share : 0)}`, shareBar(tf ? 1 - share : 0, 1)));
    // Where the change is: the entries here holding the most changed bytes.
    const where = [];
    for (const ch of node.c) {
      const C = tableFor(ch);
      const f = ch.d ? C.changedFiles(ch, k) : ch.m > st.t ? 1 : 0;
      const empty = ch.d && !ch.e && !ch.c.length && ch.m > st.t;
      if (f || empty) where.push({ ch, b: C.changedBytes(ch, k), f });
    }
    where.sort((a, b) => b.b - a.b || b.f - a.f || a.ch.n.localeCompare(b.ch.n));
    const rows = where.slice(0, WHERE_MAX).map(({ ch, b, f }) => {
      const row = api.itemButton(ch, ch.d ? `${fmtBytes(b)} · ${fmtCount(f)}` : fmtBytes(b));
      if (crossedAt(tableFor(ch), k, ch)) row.querySelector('.swatch')?.classList.add('is-crossed');
      row.setAttribute('aria-label', `${ch.n}: ${ch.d ? `${fmtCount(f)} file${f === 1 ? '' : 's'}, ${fmtBytes(b)}` : fmtBytes(b)} changed since ${st.date}. Reveal it.`);
      return row;
    });
    return [
      title, facts,
      el('div', { class: 'section-title', text: where.length > WHERE_MAX ? `Where the change is · ${WHERE_MAX} of ${fmtCount(where.length)}` : 'Where the change is' }),
      rows.length ? el('div', { class: 'since-where' }, rows)
        : el('p', { class: 'since-none', text: tf ? 'Nothing here changed since then.' : 'No files here.' }),
    ];
  }

  /* ---------- registry entries ---------- */

  api.KEYS.add({ id: 'time-toggle', owner: OWNER, keys: ['t'], run: () => { toggle(); }, guide: ['Time', 'T', 'Look back to a date / return to now'] });
  api.KEYS.add({
    id: 'time-step', owner: OWNER, keys: [',', '.'], labels: { ',': 'Look back one date earlier', '.': 'Look back one date later' },
    run: (c) => { step(c.k === ',' ? 1 : -1); }, guide: ['Time', ',  .', 'Earlier / later date'],
  });
  api.KEYS.add({
    id: 'time-ends', owner: OWNER, keys: ['<', '>'], labels: { '<': 'Look back to the earliest date', '>': 'Return to the present' },
    run: (c) => { if (c.k === '<') earliest(); else present(); }, guide: ['Time', '<  >', 'Earliest date / the present'],
  });

  api.ESCAPE.add({ id: 'time', order: 40, owner: OWNER, active: () => !!S.time, clear: () => go(0, 'present') });

  api.LAYOUT_OPTS.add({
    id: 'time', owner: OWNER,
    options: () => {
      const A = S.ages;
      const k = S.time?.k;
      if (!k || !A) return null;
      // A folder inside an open archive keeps what its own entries kept.
      return { asOf: { t: A.T[k], kept: (dir) => tableFor(dir).kept(dir, k) } };
    },
  });

  // A rebuilt table moves the ladder with the moment it was built: the
  // date shown follows it, and the layout, the inspector's Since section
  // and the Contents swatches are drawn again from its figures.
  api.AFTER_SURVEY.add({
    id: 'time', order: 20, owner: OWNER,
    run: () => {
      if (!S.time) return;
      S.time = stateFor(S.time.k);
      drawCell();
      api.queueLayout(0);
      api.drawInspector();
      api.drawLedger(true);
    },
  });

  api.TIP_LINES.add({
    id: 'time', order: 60, owner: OWNER,
    lines: (node, c) => {
      const st = S.time;
      const A = S.ages;
      if (!st || !A || c.type === BOX.SCREE || node.e) return null;
      const mark = c.L.aux[c.i] === AUX.CROSSED ? ' · flat and crossed' : c.L.aux[c.i] === AUX.SUNK ? ' · lowered to what it kept' : '';
      if (!node.d) return node.m > st.t ? `Changed since ${st.date}${mark}` : `Unchanged since ${st.date}`;
      const { tf, cb, cf, share } = figures(tableFor(node), st.k, node);
      if (!tf) return node.m > st.t ? `Changed since ${st.date}${mark}` : `Unchanged since ${st.date}`;
      if (!cf) return `Unchanged since ${st.date}`;
      return `${fmtCount(cf)} of ${fmtCount(tf)} files changed since ${st.date} · ${fmtBytes(cb)}, ${pctOf(share)}${mark}`;
    },
  });

  api.INSPECTOR.focus.add({ id: 'time', order: 25, owner: OWNER, build: (f) => since(f) });
  api.INSPECTOR.node.add({ id: 'time', order: 25, owner: OWNER, build: (node) => since(node) });

  api.READING.add({
    id: 'time', order: 75, owner: OWNER, glyph: 'g-crossed', title: 'Crossed',
    text: 'Changed after the As of date: it lies flat, crossed corner to corner. T looks back; Escape returns.',
  });

  drawCell();
}
