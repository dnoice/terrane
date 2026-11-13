/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Strata (Terrane Edition - v1.1)
 *     - File Name: strata.js
 *     - Relative Path: web/js/strata.js
 *     - Artifact Type: javascript
 *     - Version: 1.1.0
 *     - Date: 11/13/2026
 *     - Update: Friday, November 13, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Changelog:
 *     - 1.1.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] —
 *       fmtDay comes from model.js, the one MM/DD/YYYY formatter.
 *     - 1.0.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] —
 *       Initial release.
 *
 * ✒ Description:
 *     Bytes by last change. A folder's bytes fall into six strata by when
 *     they last changed, read from the shared age table, so the inspector
 *     can say how much of a place has lain untouched and how much is
 *     live. Under the Age lens a closed mass takes its typical age (the
 *     date half its bytes have not changed since) instead of its newest
 *     change, so a folder of old bytes with one fresh file no longer
 *     looks as fresh as a folder that changed throughout.
 *
 * ✒ Key Features:
 *     - Six strata, newest first: under a day, a day to a week, a week to
 *       a month, a month to a year, one to three years, over three years;
 *       each is a difference between ladder steps of the age table, so
 *       they add up to the folder's size and file count
 *     - Inspector section "Bytes by last change", in the "You are in"
 *       summary and for a selected folder: a bar in the age ramp's
 *       colours (oldest at the left, as on the legend), a sentence, a row
 *       per stratum with its bytes, share and files, and the typical age
 *     - Under the Age lens, a closed mass is coloured by its byte-weighted
 *       median step, and its hover tip says "Half its bytes unchanged
 *       since MM/DD/YYYY" (or, for the freshest, that half changed in the
 *       last day)
 *     - A Reading the world row for the convention; the legend says it too
 *     - Uses the shared age table (S.ages); it walks nothing of its own
 *     - No keys of its own
 *
 * ✒ Usage Instructions:
 *     Listed in features.js and installed by app.js. app.js's paint()
 *     colours closed masses with massTones(); the rest is registry
 *     entries:
 *         const st = strataOf(S.ages, dir);  // { bytes, files, share, ... }
 *         strataSentence(st, dir);           // "81% of these bytes ..."
 *         typicalLine(S.ages, dir);          // "Half its bytes unchanged
 *                                            //  since 11/14/2019"
 *         const tones = massTones(S.ages, Date.now());
 *         tones[S.ages.medianStep(dir)];     // the mass's colour
 *
 * ✒ Other Important Information:
 *     - Dependencies: timeline.js (the ladder and its strata), model.js
 *       (formatting, freshness), theme.js (the age ramp), layout.js (BOX);
 *       app.js's api: S, INSPECTOR, TIP_LINES, READING, AFTER_SURVEY,
 *       isAttached, hostOf, el
 *     - Compatible platforms: any browser with ES2022 modules; the pure
 *       exports also run in Node 22.5+ (tools/strata-test.mjs)
 *     - Semantics: "changed" is a modification time, the last change,
 *       never a creation or an arrival. A copy or a checkout restamps the
 *       files it writes, and they count as changed then
 *     - Dates follow the age table's ladder: the typical age is the step
 *       before the one where half the bytes have changed, so it is always
 *       true and at most one rung early
 *     - Limitations: no 3D staffs, no leaders to the largest descendant,
 *       and no "Untouched" Contents sort yet. Nothing inside an open
 *       archive: the age table holds the tree on disk, so an archive's
 *       folders have no section and no typical-age line
 * ----------------------------------------------------------------------------
 */

import { fmtBytes, fmtCount, fmtAge, fmtDay, freshness } from './model.js';
import { THEME, mixHex, ramp, cssHex } from './theme.js';
import { LADDER_DAYS, BAND_STEPS, BANDS, STEPS, DAY } from './timeline.js';
import { BOX } from './layout.js';

export const name = 'Strata';

const OWNER = 'strata';
/** Where the age ramp ends: ten years and more is its old end (freshness 0). */
const RAMP_DAYS = 3650;
// Any moment but 0, which freshness() reads as undated.
const REF = Date.UTC(2000, 0, 1);

/** Where an age in days sits on the age ramp: 1 fresh, 0 ten years or more (model.js freshness). */
export const freshOfDays = (days) => freshness(REF - Math.max(0, days) * DAY, REF);

/** The middle of [a, b] days on the ramp's log scale: halfway in freshness. */
export const midDays = (a, b) => Math.expm1((Math.log1p(a) + Math.log1p(b)) / 2);

const LABELS = ['Under a day', 'A day to a week', 'A week to a month', 'A month to a year', 'One to three years', 'Over three years'];
const EDGES = [0, ...BAND_STEPS.map((k) => LADDER_DAYS[k])];

/**
 * The six strata, newest first: { label, from, to (days; the last runs
 * on), mid (its middle age, days), fresh, color }. The colour is the age
 * ramp sampled at the middle age; the oldest stratum's middle is taken up
 * to the ramp's end at ten years.
 */
export const STRATA = Object.freeze(LABELS.map((label, j) => {
  const from = EDGES[j];
  const to = j + 1 < EDGES.length ? EDGES[j + 1] : Infinity;
  const mid = midDays(from, Number.isFinite(to) ? to : Math.max(RAMP_DAYS, from));
  const fresh = freshOfDays(mid);
  return Object.freeze({ label, from, to, mid, fresh, color: ramp(THEME.ageRamp, fresh) });
}));

/**
 * A share as a sentence says it: never 0% or 100% unless it is exactly
 * that, so a single fresh kilobyte beside 64 MB still shows.
 */
export function shareText(x) {
  if (!(x > 0)) return '0%';
  if (x >= 1) return '100%';
  const p = x * 100;
  if (p < 0.1) return 'under 0.1%';
  if (p > 99.9) return 'over 99.9%';
  return `${p.toFixed(p < 10 || p >= 99.5 ? 1 : 0)}%`;
}

/** The same share as a figure for a narrow column: "<0.1%" and ">99.9%" for the words. */
export const shareFigure = (x) => shareText(x).replace(/^under /, '<').replace(/^over /, '>');

/**
 * A folder's six strata from age table A: { bytes, files, tb, tf, by,
 * share, held }, newest first. Shares are by bytes, or by files when the
 * files hold none (by says which). held is false when the table does not
 * know the folder (it changed after the table was built). Null for a
 * file, a sealed folder or no table.
 */
export function strataOf(A, node) {
  if (!A || !node?.d || node.e) return null;
  const { bytes, files } = A.bands(node);
  let tb = 0;
  let tf = 0;
  for (let j = 0; j < BANDS; j++) {
    tb += bytes[j];
    tf += files[j];
  }
  const w = tb > 0 ? bytes : files;
  const total = tb > 0 ? tb : tf;
  return { bytes, files, tb, tf, by: tb > 0 ? 'bytes' : 'files', share: w.map((x) => (total ? x / total : 0)), held: A.has(node) };
}

/**
 * One sentence about a folder's strata: how much has not changed in over
 * a year, how much changed in the last month, and when the newest change
 * inside was. '' when it holds no files.
 *   "81% of these bytes have not changed in over a year; 3% changed in
 *    the last month. The newest change inside was 2 h ago."
 */
export function strataSentence(st, node, now = Date.now()) {
  if (!st || !st.tf) return '';
  const unit = st.by;
  const old = st.share[4] + st.share[5];
  const recent = st.share[0] + st.share[1] + st.share[2];
  let text;
  if (old >= 1) text = `None of these ${unit} changed in the last year.`;
  else if (old > 0) {
    const lead = shareText(old);
    text = `${lead[0].toUpperCase()}${lead.slice(1)} of these ${unit} have not changed in over a year; ${recent > 0 ? `${shareText(recent)} changed in the last month` : 'none changed in the last month'}.`;
  } else if (recent >= 1) text = `All of these ${unit} changed in the last month.`;
  else text = `All of these ${unit} changed in the last year; ${recent > 0 ? `${shareText(recent)} in the last month` : 'none in the last month'}.`;
  const mm = node?.mm;
  if (mm > now) text += ' The newest change inside is dated in the future.';
  else if (mm) text += ` The newest change inside was ${fmtAge(mm, now)}.`;
  return text;
}

/**
 * The typical age of a folder from age table A: the date half its bytes
 * (half its files, when they hold none) have not changed since. That is
 * the ladder step before its byte-weighted median step, so more than half
 * is unchanged since then. { k, t, after }: k is the median step, t the
 * date; after is true when half changed after the table's own moment
 * (files dated in the future), and t is then that moment. Null for a
 * file, a sealed folder, a folder with no files, or no table.
 */
export function typicalAge(A, node) {
  if (!A || !node?.d || node.e) return null;
  const k = A.medianStep(node);
  if (k < 0) return null;
  return k === 0 ? { k, t: A.T[0], after: true } : { k, t: A.T[k - 1], after: false };
}

/**
 * The hover line for a closed mass under the Age lens: "Half its bytes
 * unchanged since MM/DD/YYYY". When half changed within the last day the
 * date would be the table's own day, so it says that instead: "Half its
 * bytes changed in the last day".
 */
export function typicalLine(A, node) {
  const ta = typicalAge(A, node);
  if (!ta) return null;
  const unit = A.totalBytes(node) > 0 ? 'bytes' : 'files';
  if (ta.after) return `Half its ${unit} changed after ${fmtDay(ta.t)}`;
  if (ta.k === 1) return `Half its ${unit} changed in the last day`;
  return `Half its ${unit} unchanged since ${fmtDay(ta.t)}`;
}

/**
 * The age, in days at the table's own moment, that the Age lens gives a
 * closed mass whose median step is k: the middle of the rung it fell in
 * (between steps k - 1 and k), on the ramp's log scale; 0 for step 0.
 */
export const stepAgeDays = (k) => (k <= 0 ? 0 : midDays(LADDER_DAYS[k - 1], LADDER_DAYS[k]));

/**
 * The closed-mass colour for every median step of table A, seen at `now`
 * (ms): the age ramp at the step's age, mixed 70% into clay as paint()
 * mixes every lens colour of a mass. Made once per paint, so colouring a
 * mass is one median lookup and an index.
 */
export function massTones(A, now) {
  const late = Math.max(0, (now - A.anchor) / DAY);
  const tones = new Uint32Array(STEPS);
  for (let k = 0; k < STEPS; k++) tones[k] = mixHex(THEME.clay, ramp(THEME.ageRamp, freshOfDays(stepAgeDays(k) + late)), 0.7);
  return tones;
}

export function install(api) {
  const { S, el } = api;
  // The section last drawn: { box, node }, so a new table can refill it in
  // place without redrawing (and scrolling) the whole inspector.
  let shown = null;

  const note = (text) => el('p', { class: 'strata-note', text });

  /** Fills the section's box for a folder from the current table. */
  function fill(box, node) {
    const A = S.ages;
    const title = el('div', { class: 'section-title', text: 'Bytes by last change' });
    if (!A) return box.replaceChildren(title, note('Counted once the survey has finished.'));
    if (!A.has(node)) return box.replaceChildren(title, note('This folder changed after the last count; its strata are counted again in a moment.'));
    const st = strataOf(A, node);
    if (!st.tf) return box.replaceChildren(title, note('No files here.'));
    const unit = st.by;
    const w = st.by === 'bytes' ? st.bytes : st.files;
    // Oldest at the left, as on the Age lens legend.
    const segs = [];
    for (let j = BANDS - 1; j >= 0; j--) {
      if (!(w[j] > 0)) continue;
      const s = STRATA[j];
      segs.push(el('i', { style: { width: `${st.share[j] * 100}%`, background: cssHex(s.color) }, title: `${s.label}: ${fmtBytes(st.bytes[j])}, ${shareText(st.share[j])}` }));
    }
    const said = STRATA.map((s, j) => `${s.label.toLowerCase()} ${shareText(st.share[j])}`).join(', ');
    const rows = STRATA.map((s, j) => el('tr', { class: w[j] > 0 ? null : 'is-none' },
      el('th', { scope: 'row' }, el('span', { class: 'strata-label' }, el('span', { class: 'swatch', style: { background: cssHex(s.color) } }), el('span', { text: s.label }))),
      el('td', { text: fmtBytes(st.bytes[j]) }),
      el('td', { text: shareFigure(st.share[j]) }),
      el('td', { text: fmtCount(st.files[j]) })));
    const line = typicalLine(A, node);
    return box.replaceChildren(
      title,
      el('div', { class: 'comp strata-bar', role: 'img', 'aria-label': `Its ${unit} by last change, newest first: ${said}.` }, segs),
      el('p', { class: 'strata-say', text: strataSentence(st, node) }),
      el('table', { class: 'strata-rows' },
        el('thead', {}, el('tr', {}, el('th', { scope: 'col', text: 'Last change' }), el('th', { scope: 'col', text: 'Size' }),
          el('th', { scope: 'col', text: 'Share' }), el('th', { scope: 'col', text: 'Files' }))),
        el('tbody', {}, rows)),
      line ? el('p', { class: 'strata-typical', text: `${line}. Under the Age lens a closed mass shows this typical age.` }) : null,
    );
  }

  /**
   * The section for a folder; nothing for a file, a sealed folder, a
   * counted folder with no files, or a folder inside an open archive,
   * which the age table does not hold.
   */
  function section(node) {
    if (!node?.d || node.e || api.hostOf(node)) return null;
    if (S.ages?.has(node) && !S.ages.totalFiles(node)) return null;
    const box = el('section', { class: 'strata', 'aria-label': 'Bytes by last change' });
    fill(box, node);
    shown = { box, node };
    return box;
  }

  // In the focus summary after Composition, and for a selected folder
  // between Composition and the time view's section.
  api.INSPECTOR.focus.add({ id: 'strata', order: 22, owner: OWNER, build: (f) => section(f) });
  api.INSPECTOR.node.add({ id: 'strata', order: 22, owner: OWNER, build: (node) => section(node) });

  // A new table after a change on disk: the section showing is counted
  // again where it stands, without moving the inspector's scroll.
  api.AFTER_SURVEY.add({
    id: 'strata', order: 40, owner: OWNER,
    run: () => {
      if (!shown || !shown.box.isConnected) return;
      if (!api.isAttached(shown.node)) return;
      fill(shown.box, shown.node);
    },
  });

  api.TIP_LINES.add({
    id: 'strata', order: 15, owner: OWNER,
    lines: (node, c) => (S.lens === 'age' && c.type === BOX.CAP && node.d && !node.e && node.c.length && !api.hostOf(node) ? typicalLine(S.ages, node) : null),
  });

  api.READING.add({
    id: 'strata', order: 45, owner: OWNER, glyph: 'g-strata', title: 'Typical age',
    text: 'Under the Age lens a closed mass shows its typical age: half its bytes have not changed since then. Bytes by last change, in the inspector, gives all six strata.',
  });
}
