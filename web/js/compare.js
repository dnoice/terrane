/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Compare (Terrane Edition - v1.0)
 *     - File Name: compare.js
 *     - Relative Path: web/js/compare.js
 *     - Artifact Type: javascript
 *     - Version: 1.0.0
 *     - Date: 11/15/2026
 *     - Update: Sunday, November 15, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Changelog:
 *     - 1.0.0 (11/15/2026) [dendogg + Anthropic - Claude Opus 5.5] —
 *       Initial release.
 *
 * ✒ Description:
 *     The right panel's Compare tab: two folders side by side, or a folder
 *     and its benchmark. Their names and sizes, their makeup by kind and
 *     by last change as two bars on one scale, their counts, and what
 *     differs: what is only in one, what is in both but changed, and what
 *     is the same, each ranked by size, each item a way into the world.
 *     It never writes; the logic is the DOM-free diff.js.
 *
 * ✒ Key Features:
 *     - Four ways in: Compare with… on the world's menu (C), C itself,
 *       the palette, and the tab's own start button; two folders selected
 *       are compared at once; a benchmark from the inspector or Places;
 *       two folder rows dragged onto the tab
 *     - Choosing the other folder borrows the placing banner (api.pick):
 *       a click in the world, Enter on a row, or Compare with where I am;
 *       Esc cancels and the earlier pair comes back
 *     - The sides marked ● and ○, never letters; names told apart by the
 *       shortest path tails that differ
 *     - The four groups as disclosures, 100 rows at a time; one Tab stop
 *       per list; ↑ ↓ Home End, Enter selects and frames (in both: Enter
 *       again frames the other copy), → compares inside a folder in both,
 *       ← backs out, K puts the item on the Shelf
 *     - Swap and Clear, each one click; Clear has Undo
 *     - The pair is kept by path while a person travels, follows
 *       Terrane's renames and moves and their Undo (AFTER_OP), says so
 *       when a folder is no longer there and when it is back
 *     - Region mode: the head figures are the service's; above a
 *       folder's 5,000 largest entries the tab says what was not compared
 *     - A tab not shown does no work: it only notes that it is out of date
 *
 * ✒ Usage Instructions:
 *     Listed in features.js and installed by app.js. Select a folder and
 *     press C, then click the other; or choose COMPARE on the right
 *     panel's strip, or Ctrl+K "compare".
 *
 * ✒ Examples:
 *     C on 2019-03-14 Coast    Compare "2019-03-14 Coast" with: click a folder in the world…
 *     the result               The second is 260 MB smaller, with 44 fewer files. Of 68 names, …
 *     Clear                    Comparison cleared. [Undo]
 *
 * ✒ Other Important Information:
 *     - Dependencies: diff.js, ui.js (el), icons.js, model.js
 *       (formatting, KINDS, kindOf, refFrom), theme.js (cssHex),
 *       strata.js (strataOf, typicalAge, STRATA, shareFigure), rename.js
 *       (foldFor); app.js's api: S, B_TABS, KEYS, MENU, COMMANDS,
 *       AFTER_SELECT, AFTER_FOCUS, AFTER_REFRESH, AFTER_SURVEY, AFTER_OP,
 *       pick, picking, stopPick, showBTab, bTabShown, resolve, resolveAll,
 *       ensure, nearest, ask, regionMode, reveal, selectAll, relPath,
 *       hostOf, writable, kindTone, listCursor, sectionTitle,
 *       actionButton, notice, say
 *     - Storage: none; the pair lasts as long as the page
 *     - Compatible platforms: any browser with ES2022 modules
 *     - Performance: one diff per change, above 50,000 entries painted
 *       first as "Comparing…"; 100 rows drawn per group
 * ----------------------------------------------------------------------------
 */

import { el } from './ui.js';
import { icon } from './icons.js';
import { fmtBytes, fmtCount, fmtDay, fmtDate, plural, KINDS, kindOf, refFrom } from './model.js';
import { cssHex } from './theme.js';
import { strataOf, typicalAge, STRATA, shareFigure } from './strata.js';
import { foldFor } from './rename.js';
import { sideOfFolder, sideOfBench, diff, labels, sentence, shortSentence, whyText, unsentText, partialText, rowName, rowSize, ROWS } from './diff.js';

export const name = 'Compare';

const OWNER = 'compare';
const LOOK = 'Looking closer';
const ICON = 'compare';
const EXPLAIN = "See two folders' size, makeup and age together, and what each holds that the other does not.";
const WAYS = 'Right-click a folder for Compare with…, or drag two folders here from the list.';
const NO_TREE = 'Compared once the tree has been read.';
const WARM = "From the last session's tree, being checked against the disk; the figures may change.";
const STALE = 'The tree is being read again; the comparison comes back when it is.';
const MARKS = ['●', '○'];
/** Entries in both sides above which the tab paints "Comparing…" before it compares. */
const BIG = 50000;
/** After a change, a path not found may only not have been read again yet. */
const OP_WAIT = 8000;
const SUGGEST = 6;

const lastSeg = (rel) => (rel ? rel.slice(rel.lastIndexOf('/') + 1) : '');
const parentOf = (rel) => (rel.includes('/') ? rel.slice(0, rel.lastIndexOf('/')) : '');
const joinRel = (base, n) => (base ? `${base}/${n}` : n);
/** rel carried from one path to another: itself or inside it, else null. */
const carried = (rel, from, to) => (rel === from ? to : rel.startsWith(`${from}/`) ? `${to}${rel.slice(from.length)}` : null);
const under = (rel, base) => rel === base || base === '' || rel.startsWith(`${base}/`);
const pathPair = (x) => Array.isArray(x) && typeof x[0] === 'string' && x[0] !== '' && typeof x[1] === 'string' && x[1] !== '' && x[0] !== x[1];

export function install(api) {
  const { S } = api;

  /** The parts mount made. */
  let ui = null;
  /** The pair: { sides: [side, side] }, a side { type: 'folder', rel } or { type: 'bench', id, rel, name, at }. */
  let pair = null;
  /** Parent pairs, one per level compared inside: { pair, key } (the row it was entered from). */
  let trail = [];
  /** Choosing the other folder: { first, name }. */
  let picking = null;
  let taking = false;
  /** The last comparison drawn: { key, datas, res, lab }. */
  let result = null;
  let dirty = true;
  let seq = 0;
  let frame = 0;
  /** Each side no longer there, and whether Terrane removed it to the holding area. */
  let gone = [false, false];
  let held = [false, false];
  /** Groups opened or closed, and rows shown, by group id. */
  const open = new Map();
  const shown = new Map();
  /** What Clear took, for Undo; and that Clear was the last thing, so show() does not compare the selection at once. */
  let lastCleared = null;
  let justCleared = false;
  /** What the next draw says, and where it puts focus. */
  let pendingSay = null;
  let focusNext = null;
  /** A change was made: until its folders are read again, a path not found is not yet gone. */
  let opPending = false;
  let opTimer = 0;
  /** Same-name suggestions: whole-tree folders by folded name, kept per survey; region mode's latest ask. */
  let sugCache = new Map();
  let sugSeq = 0;
  let sugRegion = { name: null, list: null };
  /** The gone words last said, so a redraw does not say them again. */
  let saidGone = '';

  /* ---------- small readings ---------- */

  const rootName = () => S.info?.name || S.model?.root.n || 'the root';
  const nameAt = (rel) => lastSeg(rel) || rootName();
  const fold = () => foldFor(S.info?.platform || 'linux');
  const folderOf = (n) => (n ? (n.d ? n : n.p) : null);
  const benchOf = (id) => S.places?.benchmarks.find((b) => b.id === id) || null;
  const sideRel = (s) => s.rel;
  const writableNow = () => !api.writable();

  /** Why a folder cannot be compared, or null. */
  function refusal(n) {
    if (!n) return 'the tree is still being read';
    if (!n.ref && api.hostOf(n)) return 'inside an archive';
    if (n.e) return 'it cannot be read';
    if (!n.d) return 'not a folder';
    return null;
  }

  /** Why n cannot be the second folder while choosing, or null. */
  function pickWhy(n) {
    const why = refusal(n);
    if (why) return why;
    if (picking && api.relPath(n) === picking.first) return 'that is the folder being compared';
    return null;
  }

  /** The folder Compare means now: the selection's, else the folder you are in. */
  const candidate = () => (S.model ? folderOf(S.primary) || S.focus : null);

  /** Exactly two folders selected, as nodes, else null. */
  function twoSelected() {
    if (S.sel.size !== 2) return null;
    const two = [...S.sel];
    return two.every((n) => n.d) ? two : null;
  }

  const pairKey = (p) => (p ? JSON.stringify(p.sides.map((s) => (s.type === 'bench' ? `b:${s.id}` : `f:${s.rel}`))) : '');
  const isBench = (p) => !!p && p.sides.some((s) => s.type === 'bench');
  function labOf(p) {
    const at = p.sides.map((s) => (s.type === 'bench' ? benchOf(s.id)?.m.at ?? s.at ?? 0 : null));
    return labels(sideRel(p.sides[0]), sideRel(p.sides[1]), rootName(), at);
  }

  /* ---------- making a pair ---------- */

  /**
   * Compares two sides: the tab on them, focus on its head, and the
   * comparison said once it is drawn. note is said before it.
   */
  function setPair(sides, { note = '', keepTrail = false } = {}) {
    pair = { sides };
    if (!keepTrail) trail = [];
    result = null;
    gone = [false, false];
    held = [false, false];
    open.clear();
    shown.clear();
    justCleared = false;
    pendingSay = { kind: 'made', note };
    focusNext = 'name';
    reveal();
  }

  const folderSide = (n) => ({ type: 'folder', rel: typeof n === 'string' ? n : api.relPath(n) });

  /** Shows the tab with focus in it, or draws it again where it is. */
  function reveal() {
    if (api.bTabShown('compare')) {
      queue();
      ui?.name.focus({ preventScroll: true });
    } else api.showBTab('compare', { focus: true });
  }

  /** Two folders (nodes or refs) compared, refused in words when either cannot be. */
  function compareTwo(a, b) {
    for (const n of [a, b]) {
      const why = refusal(n);
      if (why) {
        api.say(`Cannot compare "${n?.n ?? 'that'}": ${why}.`);
        return;
      }
    }
    if (api.relPath(a) === api.relPath(b)) {
      api.say(`"${a.n}" is one folder: choose another to compare it with.`);
      return;
    }
    setPair([folderSide(a), folderSide(b)]);
  }

  /** A folder against its benchmark: now first, then. */
  function compareBench(node) {
    const n = folderOf(node);
    const b = n && S.places ? S.places.find(n) || S.places.findRel(api.relPath(n)) : null;
    if (!b) {
      api.say(`No benchmark on ${n?.n ?? 'this folder'}: B sets one.`);
      return;
    }
    setPair([{ type: 'folder', rel: b.rel }, { type: 'bench', id: b.id, rel: b.rel, name: b.name, at: b.m.at }]);
  }

  /** Starts choosing the folder to compare n (or n's folder) with. */
  function beginPick(n) {
    const f = folderOf(n);
    const why = refusal(f);
    if (why) {
      api.say(`Cannot compare "${f?.n ?? 'that'}": ${why}.`);
      return;
    }
    if (picking && api.picking()) {
      taking = true;
      api.stopPick();
      taking = false;
    }
    const rel = api.relPath(f);
    picking = { first: rel, name: f.n };
    justCleared = false;
    api.pick({
      owner: OWNER,
      text: `Compare "${f.n}" with: click a folder in the world, or travel to one and compare it there.`,
      say: `Choose the folder to compare "${f.n}" with: click it in the world, press Enter on it in the list, or go to it and choose Compare with where I am. Escape cancels.`,
      here: 'Compare with where I am',
      ok: (x) => pickWhy(x),
      tip: (_t, w) => (w ? `Cannot compare here: ${w}` : `Click to compare with ${f.n}`),
      refused: (x, w) => `Cannot compare with "${x.n}": ${w}.`,
      take: (x, from) => take(x, from),
      cancel: () => cancelPick(),
    });
    if (!api.picking()) {
      picking = null;
      return;
    }
    if (api.bTabShown('compare')) draw();
  }

  /** The second folder chosen (from: a file clicked inside it). */
  function take(n, from = n) {
    const p = picking;
    picking = null;
    if (!p) return;
    const note = from && from !== n && !from.d ? `${from.n} is a file, so its folder, ${n.n}, is compared.` : '';
    setPair([{ type: 'folder', rel: p.first }, folderSide(n)], { note });
  }

  /** Choosing ended without a folder: the earlier comparison, if any, is drawn again. */
  function cancelPick() {
    if (taking) return;
    const had = picking;
    picking = null;
    if (!had) return;
    api.say(pair ? 'Choosing cancelled; the earlier comparison is back.' : 'Choosing cancelled.');
    if (api.bTabShown('compare')) {
      draw();
      if (ui.panel.contains(document.activeElement) || document.activeElement === document.body) ui.name.focus({ preventScroll: true });
    }
  }

  /** A folder chosen while choosing, by key, menu, drop or a suggestion. */
  async function choose(n) {
    let x = n;
    if (x?.ref) x = await api.resolve(x.rel).catch(() => null);
    if (!x) {
      api.say('That folder is no longer there.');
      return;
    }
    const why = pickWhy(x);
    if (why) {
      api.say(`Cannot compare with "${x.n}": ${why}.`);
      return;
    }
    const p = picking;
    if (api.picking()) {
      taking = true;
      api.stopPick();
      taking = false;
    }
    picking = p;
    take(x);
  }

  function swap() {
    if (!pair) {
      api.say('Nothing is being compared.');
      return;
    }
    pair = { sides: [pair.sides[1], pair.sides[0]] };
    trail = trail.map((t) => ({ ...t, pair: { sides: [t.pair.sides[1], t.pair.sides[0]] } }));
    gone = [gone[1], gone[0]];
    held = [held[1], held[0]];
    const o0 = open.get('only-0');
    const o1 = open.get('only-1');
    open.delete('only-0');
    open.delete('only-1');
    if (o1 !== undefined) open.set('only-0', o1);
    if (o0 !== undefined) open.set('only-1', o0);
    if (result?.res) {
      result = { ...result, key: pairKey(pair), datas: [result.datas[1], result.datas[0]] };
      rediff();
    } else result = null;
    const lab = labOf(pair);
    api.say(`Swapped: ${MARKS[0]} is now ${lab[0]}, ${MARKS[1]} ${lab[1]}.`);
    if (api.bTabShown('compare')) draw();
    else dirty = true;
  }

  function clear() {
    if (!pair) {
      api.say('Nothing is being compared.');
      return;
    }
    lastCleared = { pair, trail };
    pair = null;
    trail = [];
    result = null;
    gone = [false, false];
    justCleared = true;
    api.notice('Comparison cleared.', {
      kind: 'info',
      action: {
        label: 'Undo',
        run: () => {
          if (!lastCleared) return;
          const c = lastCleared;
          lastCleared = null;
          setPair(c.pair.sides);
          trail = c.trail;
        },
      },
    });
    api.say('Comparison cleared. Undo, in the notice, brings it back.');
    if (api.bTabShown('compare')) {
      draw();
      (ui.start.closest('[hidden]') ? ui.name : ui.start).focus({ preventScroll: true });
    }
  }

  /** In both: the two copies' paths compared, one level down. */
  function drill(row) {
    if (!result || isBench(pair) || !row.d[0] || !row.d[1]) return;
    trail.push({ pair, key: row.key });
    const [r0, r1] = pair.sides.map((s, i) => joinRel(s.rel, row.name[i]));
    pair = { sides: [folderSide(r0), folderSide(r1)] };
    result = null;
    open.clear();
    shown.clear();
    pendingSay = { kind: 'drill', name: rowName(row) };
    focusNext = 'first-row';
    queue();
  }

  function back() {
    const t = trail.pop();
    if (!t) return;
    pair = t.pair;
    result = null;
    open.clear();
    shown.clear();
    pendingSay = { kind: 'back' };
    focusNext = { key: t.key };
    queue();
  }

  /* ---------- working it out ---------- */

  function queue() {
    if (!ui || !api.bTabShown('compare')) {
      dirty = true;
      return;
    }
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      compute();
    });
  }

  /** One side's data: { data, st, ta } held; { wait } while the tree is read; { gone }. */
  async function sideData(side) {
    if (side.type === 'bench') {
      const b = benchOf(side.id);
      if (!b) return { gone: 'forgotten' };
      return { data: sideOfBench(b), st: null, ta: null };
    }
    if (!S.model || !S.survey || S.survey.pending) return { wait: 'tree' };
    const client = S.regions;
    let n = await api.resolve(side.rel).catch(() => null);
    if (n && n.d) n = await api.ensure(n).catch(() => null);
    if (!n || !n.d) {
      if (client && (client.stale || S.regions !== client)) return { wait: 'stale' };
      if (opPending) return { wait: 'op' };
      return { gone: 'folder' };
    }
    const st = S.ages ? strataOf(S.ages, n) : null;
    return { data: sideOfFolder(n, side.rel), st: st && st.held !== false ? st : null, ta: S.ages ? typicalAge(S.ages, n) : null };
  }

  /** The diff of the data held, without reading again (Swap). */
  function rediff() {
    const [d0, d1] = result.datas;
    result.res = diff(d0.data, d1.data, { platform: S.info?.platform || 'linux' });
    result.lab = labOf(pair);
  }

  async function compute() {
    if (!ui || !api.bTabShown('compare')) {
      dirty = true;
      return;
    }
    dirty = false;
    if (!pair || picking) {
      draw();
      return;
    }
    const my = ++seq;
    const key = pairKey(pair);
    if (!result || result.key !== key) drawLoading();
    const datas = await Promise.all(pair.sides.map((s) => sideData(s)));
    if (my !== seq || pairKey(pair) !== key) return;
    const wait = datas.find((d) => d.wait);
    if (wait) {
      drawWaiting(wait.wait === 'tree' ? NO_TREE : STALE);
      return;
    }
    const now = datas.map((d) => !!d.gone);
    if (now.some(Boolean) && trail.length) {
      // A level compared inside, whose folder is gone: back to its parent level.
      const lab = labOf(pair);
      const t = trail.pop();
      const nm = nameAt(pair.sides[now[0] ? 0 : 1].rel);
      pair = t.pair;
      result = null;
      pendingSay = { kind: 'say', text: `${nm} is no longer in ${now[0] ? lab[0] : lab[1]}; back to the level above.` };
      focusNext = { key: t.key };
      queue();
      return;
    }
    const back = gone.map((g, i) => g && !now[i]);
    gone = now;
    if (now.some(Boolean)) {
      result = { key, datas, res: null, lab: labOf(pair) };
      drawGone(datas);
      return;
    }
    if (back.some(Boolean)) {
      const lab = labOf(pair);
      held = [false, false];
      pendingSay = pendingSay || { kind: 'say', text: `${back[0] ? lab[0] : lab[1]} is back.` };
    }
    const n = datas[0].data.entries.length + datas[1].data.entries.length;
    if (n > BIG) {
      drawWaiting(`Comparing ${fmtCount(n)} entries…`, { busy: true });
      await new Promise((r) => requestAnimationFrame(() => r()));
      if (my !== seq || pairKey(pair) !== key) return;
    }
    performance.mark('terrane:compare:start');
    const res = diff(datas[0].data, datas[1].data, { platform: S.info?.platform || 'linux' });
    try {
      performance.measure('terrane:compare', 'terrane:compare:start');
    } catch { /* a mark cleared by another measurement */ }
    result = { key, datas, res, lab: labOf(pair) };
    draw();
  }

  /* ---------- suggestions: the same name elsewhere ---------- */

  /** Folders named as f is (folded as the platform folds), largest first; a promise in region mode. */
  function sameName(f) {
    if (!f) return [];
    const k = fold()(f.n);
    const rel = api.relPath(f);
    if (!api.regionMode()) {
      let all = sugCache.get(k);
      if (!all) {
        all = [];
        const stack = [S.model.root];
        const fk = fold();
        while (stack.length) {
          const d = stack.pop();
          for (const c of d.c) {
            if (!c.d) continue;
            if (fk(c.n) === k) all.push(c);
            stack.push(c);
          }
        }
        all.sort((a, b) => b.s - a.s);
        sugCache.set(k, all);
      }
      return all.filter((x) => api.relPath(x) !== rel && !x.e).slice(0, SUGGEST);
    }
    if (sugRegion.name === k && sugRegion.list) return sugRegion.list.filter((x) => x.rel !== rel).slice(0, SUGGEST);
    if (sugRegion.name !== k) {
      sugRegion = { name: k, list: null };
      const my = ++sugSeq;
      api.ask('places', { q: f.n, limit: '200' }).then((ans) => {
        if (my !== sugSeq) return;
        const fk = fold();
        const list = (ans?.places || []).map(refFrom).filter((r) => r.d && !r.e && fk(r.n) === k).sort((a, b) => b.s - a.s);
        sugRegion = { name: k, list };
        if (api.bTabShown('compare') && (!pair || picking)) draw();
      }, () => {
        if (my === sugSeq) sugRegion = { name: k, list: [] };
      });
    }
    return [];
  }

  /* ---------- drawing ---------- */

  const keyed = (e, k) => {
    e.dataset.k = k;
    return e;
  };

  /** A side's mark: a filled circle (●) or a ring (○), never a letter; its words for a screen reader beside it. */
  function mark(i, { inline = false, sr = null } = {}) {
    const m = el('span', { class: `cmp-mark is-${i}${inline ? ' is-inline' : ''}`, 'aria-hidden': 'true' });
    return sr ? [m, el('span', { class: 'sr', text: sr })] : m;
  }

  /** Parts from diff.js's whyText, a mark carrying its side's label for a screen reader. */
  function partsEl(parts, lab) {
    // el() flattens one level only: the parts are flattened here.
    return parts.map((p) => (typeof p === 'string' ? p : [mark(p.mark, { inline: true, sr: `${lab[p.mark]}${p.text ? ',' : ''}` }), p.text ? ` ${p.text}` : null])).flat(Infinity);
  }

  /** The head: its kind words, its name for the state, the sides and the tools. */
  function drawHead() {
    const lab = pair ? labOf(pair) : null;
    let nameText = 'Two folders, side by side';
    if (picking) nameText = `"${picking.name}" with…`;
    else if (pair) {
      const n0 = nameAt(pair.sides[0].rel);
      const n1 = nameAt(pair.sides[1].rel);
      nameText = isBench(pair) ? `${n0}, now and then` : n0 === n1 ? `Two folders named ${n0}` : `${lab[0]} and ${lab[1]}`;
    }
    ui.name.textContent = nameText;
    // A side or a tool with focus keeps it through the redraw (a selection redraws the head).
    const a = document.activeElement;
    const had = (ui.sides.contains(a) || ui.tools.contains(a)) ? a.dataset.k : null;
    const showSides = !!pair && !picking;
    ui.sides.hidden = !showSides;
    ui.tools.hidden = !showSides;
    if (!showSides) {
      ui.sides.replaceChildren();
      ui.tools.replaceChildren();
      return;
    }
    const datas = result?.key === pairKey(pair) ? result.datas : null;
    ui.sides.replaceChildren(...pair.sides.map((s, i) => {
      const d = datas?.[i]?.data;
      const path = s.type === 'bench' ? `measured ${fmtDate(benchOf(s.id)?.m.at ?? s.at)}` : s.rel || 'the root';
      const b = el('button', {
        class: 'cmp-side', type: 'button', 'data-side': String(i), 'data-k': `side-${i}`, title: `Select and frame ${s.rel || rootName()}`,
        onclick: () => frameSide(i),
      }, mark(i), el('span', { class: 'sr', text: `${i ? 'Second' : 'First'}, ${MARKS[i]}: ` }),
      el('span', { class: 'cmp-side-text' }, el('span', { class: 'nm', text: lab[i], title: lab[i] }), el('span', { class: 'path', text: path, title: path })),
      el('span', { class: 'fig', text: d ? fmtBytes(d.s) : '' }));
      return el('li', {}, b);
    }));
    const tools = [
      keyed(el('button', { class: 'btn btn-small', type: 'button', title: 'Swap the two sides', onclick: swap }, icon('swap'), 'Swap'), 'swap'),
      keyed(el('button', { class: 'btn btn-small', type: 'button', title: 'Stop comparing; Undo in the notice brings it back', onclick: clear }, icon('clear'), 'Clear'), 'clear'),
    ];
    if (trail.length) {
      const up = labOf(trail.at(-1).pair);
      tools.push(keyed(el('button', { class: 'pv-where cmp-back', type: 'button', title: `Back to ${up[0]} and ${up[1]} (←)`, onclick: back }, icon('up'), el('span', { class: 'pv-where-words', text: 'Back out one level' })), 'back'));
    }
    const two = twoSelected();
    if (two && pairKey({ sides: two.map(folderSide) }) !== pairKey(pair) && pairKey({ sides: [two[1], two[0]].map(folderSide) }) !== pairKey(pair) && !two.some((n) => refusal(n))) {
      tools.push(keyed(el('button', { class: 'btn btn-small', type: 'button', title: `Compare ${two[0].n} and ${two[1].n}`, onclick: () => compareTwo(two[0], two[1]) }, 'Compare the 2 selected instead'), 'selected'));
    }
    ui.tools.replaceChildren(...tools);
    if (had) (ui.sides.querySelector(`[data-k="${CSS.escape(had)}"]`) || ui.tools.querySelector(`[data-k="${CSS.escape(had)}"]`) || ui.name).focus({ preventScroll: true });
  }

  /** The empty and choosing states' buttons and suggestions. */
  function drawStart() {
    const f = candidate();
    const off = !S.model ? 'the tree is still being read' : refusal(f);
    const nm = f?.n ?? 'this folder';
    ui.start.replaceChildren(icon(ICON), `Compare "${nm}" with…`);
    ui.start.dataset.named = '';
    ui.start.title = off ? `Unavailable: ${off}` : 'Then click the other folder (C)';
    ui.start.setAttribute('aria-disabled', off ? 'true' : 'false');
    const extra = [];
    const two = twoSelected();
    if (two) extra.push(keyed(api.actionButton('Compare the 2 selected folders', () => compareTwo(two[0], two[1]), { icon: ICON, wide: true }), 'two'));
    const b = f && S.places && !off ? S.places.find(f) : null;
    if (b) extra.push(keyed(api.actionButton(`Compare "${nm}" with its benchmark`, () => compareBench(f), { icon: 'bench', named: true, wide: true }), 'bench'));
    ui.startExtra.replaceChildren(...extra);
    ui.startExtra.hidden = !extra.length;
  }

  function suggestionsEl(f) {
    if (!f || refusal(f)) return [];
    const list = sameName(f);
    if (!list.length) return [];
    const rows = list.map((x) => {
      const rel = api.relPath(x);
      return el('li', { class: 'cmp-row' }, el('button', {
        class: 'item cmp-item cmp-sug', type: 'button', 'data-k': `sug:${rel}`, title: rel,
        onclick: () => (picking ? choose(x) : compareTwo(f, x)),
      }, el('span', { class: 'swatch is-dir' }),
      el('span', { class: 'cmp-text' }, el('span', { class: 'nm', text: x.n }), el('span', { class: 'path', text: parentOf(rel) || 'the root' })),
      el('span', { class: 'fig', text: fmtBytes(x.s) })));
    });
    return [api.sectionTitle('Same name elsewhere', fmtCount(list.length)), el('ul', { class: 'cmp-list cmp-sugs', role: 'list', 'aria-label': 'Same name elsewhere' }, rows)];
  }

  function drawLoading() {
    drawHead();
    clearBody();
    state('Reading both folders…', { busy: true });
  }

  function drawWaiting(words, { busy = false } = {}) {
    drawHead();
    clearBody();
    state(words, { busy: true });
    if (!busy) ui.groups.setAttribute('aria-busy', 'false');
    speak();
  }

  function clearBody() {
    ui.empty.hidden = true;
    ui.sayEl.hidden = true;
    ui.notes.replaceChildren();
    ui.figures.replaceChildren();
    ui.groups.replaceChildren();
    state('');
  }

  function state(text, { error = false, busy = false } = {}) {
    ui.state.textContent = text || '';
    ui.state.hidden = !text;
    ui.state.classList.toggle('is-error', error);
    ui.groups.setAttribute('aria-busy', busy ? 'true' : 'false');
  }

  function note(text, k = null) {
    const p = el('p', { class: 'cmp-note', text });
    if (k) p.dataset.note = k;
    return p;
  }

  /** A side no longer there: said in words, the other side's facts kept, a way on from it. */
  function drawGone(datas) {
    drawHead();
    clearBody();
    const lab = labOf(pair);
    const i = datas[0].gone ? 0 : 1;
    const s = pair.sides[i];
    const words = datas[i].gone === 'forgotten' ? `The benchmark of ${s.name} was forgotten.`
      : held[i] ? `${lab[i]} was removed to the holding area. Restore it from the Journal, or Undo, and the comparison comes back.`
        : `${lab[i]} is no longer there: it was renamed, moved or removed outside Terrane, or can no longer be read.`;
    state(words, { error: true });
    if (saidGone !== `${pairKey(pair)}|${words}`) {
      saidGone = `${pairKey(pair)}|${words}`;
      pendingSay = { kind: 'say', text: words };
    }
    const other = pair.sides[1 - i];
    const od = datas[1 - i].data;
    const kids = [];
    if (od) kids.push(factsTable([1 - i === 0 ? od : null, 1 - i === 1 ? od : null], [null, null], lab));
    const actions = [];
    if (other.type === 'folder' && !datas[1 - i].gone) {
      actions.push(keyed(api.actionButton(`Compare "${nameAt(other.rel)}" with…`, async () => {
        const n = await api.resolve(other.rel).catch(() => null);
        if (n) beginPick(n);
        else api.say(`${nameAt(other.rel)} is no longer there either.`);
      }, { icon: ICON, named: true }), 'gone-pick'));
    }
    actions.push(keyed(api.actionButton('Clear', clear, { icon: 'clear' }), 'gone-clear'));
    ui.figures.replaceChildren(...kids, el('div', { class: 'actions-grid cmp-gone' }, actions));
    speak();
    restoreFocus(null);
  }

  /** The figures table: Size, Files, Folders, Entries, Newest change, Half unchanged since. */
  function factsTable(ds, tas, lab) {
    const fig = (d, f) => (d ? f(d) : '—');
    const half = (ta, d) => {
      if (!d) return '—';
      if (d.kind === 'bench' || !ta) return [el('span', { 'aria-hidden': 'true', text: '—' }), el('span', { class: 'sr', text: 'not measured' })];
      if (ta.k === 1 && !ta.after) return 'changed in the last day';
      return fmtDay(ta.t);
    };
    const rows = [
      ['Size', (d) => fmtBytes(d.s)],
      ['Files', (d) => fmtCount(d.fc)],
      ['Folders', (d) => fmtCount(d.dc)],
      ['Entries', (d) => fmtCount(d.items)],
      ['Newest change', (d) => (d.mm ? fmtDay(d.mm) : '—')],
    ];
    return el('table', { class: 'cmp-facts' },
      el('thead', {}, el('tr', {}, el('th', { scope: 'col' }, el('span', { class: 'sr', text: 'Figure' })),
        [0, 1].map((i) => el('th', { scope: 'col' }, mark(i, { sr: lab[i] }))))),
      el('tbody', {}, rows.map(([t, f]) => el('tr', {}, el('th', { scope: 'row', text: t }), ds.map((d) => el('td', { text: fig(d, f) })))),
      el('tr', {}, el('th', { scope: 'row', text: 'Half unchanged since' }), ds.map((d, i) => el('td', {}, half(tas[i], d))))));
  }

  /** Two bars on one scale: rows of [mark, track] with segments, or words in the track. */
  function barPair(widths, segs, words, aria) {
    return el('div', { class: 'cmp-bars' }, [0, 1].map((i) => el('div', { class: 'cmp-bar' }, mark(i),
      el('div', { class: 'cmp-track' }, words[i]
        ? el('p', { class: 'cmp-none', text: words[i] })
        : el('div', { class: 'comp', role: 'img', 'aria-label': aria[i], style: { width: `${widths[i]}%` } },
          segs[i].map((g) => el('i', { style: { width: `${g.w}%`, background: g.color }, title: g.title })))))));
  }

  function kindsEl(d0, d1, lab) {
    const ds = [d0, d1];
    const max = Math.max(d0.s, d1.s);
    const sum = (i) => (ds[0].ks?.[i] ?? 0) + (ds[1].ks?.[i] ?? 0);
    const order = KINDS.map((k, i) => i).filter((i) => sum(i) > 0).sort((a, b) => sum(b) - sum(a));
    const words = ds.map((d) => (d.kind === 'bench' ? 'Not measured then' : !d.s ? 'Empty' : null));
    const widths = ds.map((d) => (max ? (d.s / max) * 100 : 0));
    const segs = ds.map((d) => order.filter((k) => d.ks?.[k] > 0).map((k) => ({ w: (d.ks[k] / d.s) * 100, color: cssHex(KINDS[k].color), title: `${KINDS[k].label} ${fmtBytes(d.ks[k])}` })));
    const aria = ds.map((d, i) => `${lab[i]}: ${order.filter((k) => d.ks?.[k] > 0).slice(0, 3).map((k) => `${KINDS[k].label} ${fmtBytes(d.ks[k])}`).join(', ') || 'nothing'}`);
    const top = order.slice(0, 6);
    const rest = order.slice(6);
    const key = el('table', { class: 'cmp-key' },
      el('thead', {}, el('tr', {}, el('th', { class: 'sr', scope: 'col', text: 'Kind' }), [0, 1].map((i) => el('th', { class: 'sr', scope: 'col', text: lab[i] })))),
      el('tbody', {}, top.map((k) => el('tr', {},
        el('th', { scope: 'row' }, el('span', { class: 'swatch', style: { background: cssHex(KINDS[k].color) } }), el('span', { class: 'cmp-key-t', text: KINDS[k].label })),
        ds.map((d) => el('td', { text: d.ks ? fmtBytes(d.ks[k]) : '—' })))),
      rest.length ? el('tr', {}, el('th', { scope: 'row' }, el('span', { class: 'swatch is-empty' }), el('span', { class: 'cmp-key-t', text: 'Other kinds' })),
        ds.map((d) => el('td', { text: d.ks ? fmtBytes(rest.reduce((t, k) => t + d.ks[k], 0)) : '—' }))) : null));
    return [api.sectionTitle('By kind', 'same scale'), barPair(widths, segs, words, aria), order.length ? key : null];
  }

  function agesEl(datas, lab) {
    const head = api.sectionTitle('By last change', 'same scale');
    const ds = datas.map((x) => x.data);
    const sts = datas.map((x) => x.st);
    const folders = ds.map((d) => d.kind === 'folder');
    if (!S.ages || folders.some((f, i) => f && !sts[i])) return [head, note('Counted once the survey has finished.', 'ages')];
    const byBytes = sts.some((st) => st && st.tb > 0);
    const tot = sts.map((st) => (!st ? 0 : byBytes ? st.tb : st.tf));
    const max = Math.max(...tot);
    const oldest = STRATA.map((x, j) => j).reverse();
    const words = ds.map((d, i) => (d.kind === 'bench' ? 'Not measured then' : !tot[i] ? 'Empty' : null));
    const widths = tot.map((t) => (max ? (t / max) * 100 : 0));
    const vals = (st, j) => (byBytes ? st.bytes[j] : st.files[j]);
    const segs = sts.map((st, i) => (!st || !tot[i] ? [] : oldest.filter((j) => vals(st, j) > 0).map((j) => ({ w: (vals(st, j) / tot[i]) * 100, color: cssHex(STRATA[j].color), title: `${STRATA[j].label} ${byBytes ? fmtBytes(vals(st, j)) : plural(vals(st, j), 'file')}` }))));
    const aria = sts.map((st, i) => `${lab[i]}: ${st ? oldest.filter((j) => st.share[j] > 0).map((j) => `${STRATA[j].label} ${shareFigure(st.share[j])}`).join(', ') : 'not measured'}`);
    const key = el('table', { class: 'cmp-key cmp-age-key' },
      el('thead', {}, el('tr', {}, el('th', { class: 'sr', scope: 'col', text: 'Last change' }), [0, 1].map((i) => el('th', { class: 'sr', scope: 'col', text: lab[i] })))),
      el('tbody', {}, oldest.map((j) => {
        const none = sts.every((st) => !st || !(st.share[j] > 0));
        return el('tr', { class: none ? 'is-none' : null },
          el('th', { scope: 'row' }, el('span', { class: 'swatch', style: { background: cssHex(STRATA[j].color) } }), el('span', { class: 'cmp-key-t', text: STRATA[j].label })),
          sts.map((st) => el('td', { text: st ? shareFigure(st.share[j]) : '—' })));
      })));
    return [head, barPair(widths, segs, words, aria), key, byBytes ? null : note('By files: neither folder holds any bytes.', 'ages-files')];
  }

  /** The words of a group's head and its id, for a pair (a benchmark pair uses the Landmarks words). */
  function groupsOf(R, lab) {
    const res = R.res;
    const bench = res.bench;
    const nowI = bench ? (pair.sides[0].type === 'bench' ? 1 : 0) : -1;
    const benchI = 1 - nowI;
    const partial = bench ? res.partial[benchI] : null;
    const only = (i) => {
      if (!bench) return ['Only in ', mark(i, { inline: true }), ` ${lab[i]}`];
      if (i === nowI) return [partial ? `Here now, not among the ${fmtCount(R.datas[benchI].data.kept)} largest then` : 'Here now, not then'];
      return ['No longer here'];
    };
    return [
      { id: 'only-0', i: 0, t: only(0), rows: res.only[0], bytes: res.bytes.only0 },
      { id: 'only-1', i: 1, t: only(1), rows: res.only[1], bytes: res.bytes.only1 },
      { id: 'changed', t: [bench ? 'Changed since' : 'In both, changed'], rows: res.changed, bytes: res.bytes.changed },
      { id: 'same', t: [bench ? 'The same' : 'In both, the same'], rows: res.same, bytes: res.bytes.same },
    ];
  }

  /** A row's second line. */
  function lineOf(row, g, lab) {
    if (g.id === 'changed') return partsEl(whyText(row), lab);
    const i = g.i ?? 0;
    const x = row.x[i] || row.x[1 - i];
    if (x.d) return `folder · ${plural(x.fc ?? x.f ?? 0, 'file')}`;
    const kind = KINDS[x.k ?? kindOf(x.name)]?.label ?? 'File';
    return x.m != null ? `${kind} · changed ${fmtDay(x.m)}` : kind;
  }

  function rowEl(row, g, lab) {
    const i = g.i ?? (row.x[0] ? 0 : 1);
    const x = row.x[i] || row.x[1 - i];
    const nm = rowName(row);
    const both = !!row.x[0] && !!row.x[1];
    const inside = both && row.d[0] && row.d[1] && !result.res.bench;
    const swatch = x.d ? el('span', { class: 'swatch is-dir' }) : el('span', { class: 'swatch', style: { background: cssHex(api.kindTone({ n: x.name, k: x.k ?? kindOf(x.name) })) } });
    const names = both && row.name[0] !== row.name[1] ? `${row.name[0]} · ${row.name[1]}` : nm;
    const btn = el('button', {
      class: 'item cmp-item', type: 'button', tabindex: '-1', 'data-key': row.key,
      title: inside ? `${names}: Enter selects both; → compares inside` : names,
    }, swatch,
    el('span', { class: 'cmp-text' }, el('span', { class: 'nm', text: names }), el('span', { class: 'path' }, lineOf(row, g, lab))),
    el('span', { class: 'fig', text: fmtBytes(g.id === 'changed' || g.id === 'same' ? rowSize(row) : row.s[i]) }),
    inside ? el('span', { class: 'cmp-in', 'aria-hidden': 'true' }, icon('later')) : null);
    const li = el('li', { class: 'cmp-row', 'data-key': row.key }, btn);
    li.cmp = { row, g };
    return li;
  }

  function groupEl(g, first, lab) {
    const n = g.rows.length;
    const isOpen = open.has(g.id) ? open.get(g.id) : g.id !== 'same' && first;
    const count = shown.get(g.id) ?? ROWS;
    const list = el('ul', { class: 'cmp-list', role: 'list', 'aria-label': g.t.filter((x) => typeof x === 'string').join('').trim() || g.id });
    list.append(...g.rows.slice(0, count).map((r) => rowEl(r, g, lab)));
    roving(list);
    const parts = [];
    if (g.id === 'changed') parts.push(note(result.res.bench ? 'Entries whose size or file count changed since the benchmark; its times were not kept.' : 'Files differ in size, or in their last change by more than 2 seconds; folders in size or in how many files or folders they hold. → compares inside a folder.'));
    if (g.id === 'same') parts.push(note(result.res.bench ? 'The same size and file count as when measured.' : 'Files match by name, size and last change within 2 seconds. Folders here match in size and counts; → compares their files.'));
    if (n) {
      const label = g.id === 'changed' || g.id === 'same' ? `Select all ${fmtCount(n)} (both copies)` : `Select all ${fmtCount(n)}`;
      const off = result.res.bench && g.i === (pair.sides[0].type === 'bench' ? 0 : 1) ? 'they are no longer here' : null;
      parts.push(el('div', { class: 'cmp-actions' }, keyed(api.actionButton(label, () => selectGroup(g, lab), { icon: 'selectAll', off }), `all-${g.id}`)));
      parts.push(list);
    } else parts.push(note('None.', 'none'));
    if (n > count) {
      parts.push(el('div', { class: 'cmp-actions' }, keyed(el('button', {
        class: 'btn btn-small', type: 'button',
        onclick: () => {
          shown.set(g.id, count + ROWS);
          draw();
          const l = ui.groups.querySelector(`[data-group="${g.id}"] .cmp-list`);
          const next = l?.querySelectorAll('button.cmp-item')[count];
          if (next) {
            roving(l, next);
            next.focus();
          }
        },
      }, `Show ${fmtCount(Math.min(ROWS, n - count))} more (${fmtCount(n)} in all)`), `more-${g.id}`)));
    }
    const d = el('details', { class: 'cmp-group', 'data-group': g.id, 'data-count': String(n), 'data-bytes': String(g.bytes), open: isOpen },
      el('summary', { 'data-k': `group-${g.id}` }, el('span', { class: 't' }, g.t), el('span', { class: 'sr', text: ' · ' }),
        el('span', { class: 'n', text: n ? `${fmtCount(n)} · ${fmtBytes(g.bytes)}` : 'none' })),
      parts);
    d.addEventListener('toggle', () => open.set(g.id, d.open));
    return d;
  }

  /** One Tab stop per list: the row last reached, else the first. */
  function roving(list, at = null) {
    const btns = [...list.querySelectorAll('button.cmp-item')];
    const keep = at || btns.find((b) => b.tabIndex === 0) || btns[0];
    for (const b of btns) b.tabIndex = b === keep ? 0 : -1;
  }

  /** Everything below the head, from the state. */
  function draw() {
    if (!ui) return;
    const a = document.activeElement;
    const inBody = !!a && a !== document.body && ui.body.contains(a);
    const was = inBody ? { key: a.closest('.cmp-row')?.dataset.key ?? null, group: a.closest('[data-group]')?.dataset.group ?? null, k: a.dataset?.k ?? null, name: a === ui.name } : null;
    drawHead();
    if (!S.model || !pair || picking) {
      clearBody();
      drawEmpty();
      restoreFocus(was);
      speak();
      return;
    }
    const R = result;
    if (!R || R.key !== pairKey(pair)) {
      queue();
      return;
    }
    if (!R.res) {
      drawGone(R.datas);
      return;
    }
    const lab = R.lab;
    const [d0, d1] = R.datas.map((x) => x.data);
    ui.empty.hidden = true;
    state('');
    ui.sayEl.hidden = false;
    ui.sayEl.textContent = sentence(R.res, lab, d0, d1);
    const notes = [];
    if (S.warm) notes.push(note(WARM, 'warm'));
    R.res.unsent.forEach((t, i) => {
      if (t?.n) notes.push(note(unsentText(R.datas[i].data, lab[i], lab[1 - i]), `unsent-${i}`));
    });
    R.datas.forEach((x) => {
      if (x.data.kind === 'bench') {
        const pt = partialText(x.data);
        if (pt) notes.push(note(pt, 'partial'));
        notes.push(note('Kinds and ages were not measured when the benchmark was set; a benchmark keeps its 64 largest entries by name.', 'bench'));
      }
    });
    ui.notes.replaceChildren(...notes);
    // replaceChildren writes a null as the text "null": the parts left out are dropped first.
    ui.figures.replaceChildren(...[
      factsTable([d0, d1], R.datas.map((x) => x.ta), lab),
      ...kindsEl(d0, d1, lab),
      ...agesEl(R.datas, lab),
      api.sectionTitle('What differs', plural(R.res.count.names, 'name')),
    ].filter(Boolean));
    const gs = groupsOf(R, lab);
    const first = gs.find((g) => g.id !== 'same' && g.rows.length);
    ui.groups.replaceChildren(...gs.map((g) => groupEl(g, g === first, lab)));
    ui.panel.dataset.shown = R.key;
    restoreFocus(was);
    speak();
  }

  /** The empty, waiting-for-a-tree and choosing states. */
  function drawEmpty() {
    ui.empty.hidden = false;
    const f = picking ? null : candidate();
    drawStart();
    ui.start.hidden = !!picking;
    ui.startExtra.hidden = ui.startExtra.hidden || !!picking;
    ui.cancel.hidden = !picking;
    ui.lead.textContent = !S.model ? NO_TREE : picking
      ? (S.noGL ? 'Press Enter on the other folder in the list, or go to it and choose Compare with where I am. Esc cancels.'
        : 'Click the other folder in the world, or press Enter on it in the list. Esc cancels.')
      : EXPLAIN;
    ui.ways.hidden = !!picking || !S.model;
    let sugs = [];
    if (S.model && S.survey) {
      const target = picking ? (S.model.find(picking.first) || null) : f;
      if (!api.regionMode() || target) {
        const subject = picking ? target : f;
        sugs = subject ? suggestionsEl(subject) : [];
      }
    }
    ui.sugs.replaceChildren(...sugs);
  }

  /** Puts focus where the next draw asked, or back where it was. */
  function restoreFocus(was) {
    const q = (s) => ui.body.querySelector(s);
    let to = null;
    const want = focusNext;
    focusNext = null;
    if (want === 'name') to = ui.name;
    else if (want === 'first-row') {
      const g = [...ui.groups.querySelectorAll('details.cmp-group')].find((d) => d.querySelector('button.cmp-item'));
      if (g) {
        g.open = true;
        open.set(g.dataset.group, true);
        to = g.querySelector('button.cmp-item');
      } else to = ui.name;
    } else if (want?.key) {
      to = [...ui.groups.querySelectorAll('button.cmp-item')].find((b) => b.dataset.key === want.key) || ui.name;
      const d = to.closest('details');
      if (d && !d.open) {
        d.open = true;
        open.set(d.dataset.group, true);
      }
    } else if (was) {
      if (was.name) to = ui.name;
      else if (was.key) to = [...ui.groups.querySelectorAll('button.cmp-item')].find((b) => b.dataset.key === was.key) || (was.group ? q(`[data-group="${was.group}"] > summary`) : null);
      else if (was.k) to = q(`[data-k="${CSS.escape(was.k)}"]`);
      if (to && to.closest('details:not([open])') && to.tagName !== 'SUMMARY') to = null;
      if (!to || to.closest('[hidden]')) to = ui.name;
    }
    if (!to) return;
    if (to.classList.contains('cmp-item')) roving(to.closest('.cmp-list'), to);
    if (document.activeElement !== to) to.focus({ preventScroll: true });
    if (to.classList.contains('cmp-item')) to.scrollIntoView?.({ block: 'nearest' });
  }

  /** What the draw says, once. */
  function speak() {
    const p = pendingSay;
    if (!p) return;
    if ((p.kind === 'made' || p.kind === 'drill' || p.kind === 'back') && !(result?.res && result.key === pairKey(pair))) return;
    pendingSay = null;
    const lab = result?.lab || (pair ? labOf(pair) : ['', '']);
    const R = result;
    if (p.kind === 'made') {
      const [d0, d1] = R.datas.map((x) => x.data);
      api.say(`${p.note ? `${p.note} ` : ''}Comparing ${lab[0]} with ${lab[1]}. ${sentence(R.res, lab, d0, d1)}`);
    } else if (p.kind === 'drill') api.say(`Inside ${p.name} in both: ${shortSentence(R.res, lab)}`);
    else if (p.kind === 'back') api.say(`Back to ${lab[0]} and ${lab[1]}.`);
    else if (p.text) api.say(p.text);
  }

  /* ---------- rows: acting ---------- */

  /** A side's path for an entry of a row; null for a benchmark side (it was there then, not now). */
  function pathOf(row, i) {
    const s = pair.sides[i];
    if (s.type !== 'folder' || row.name[i] == null) return null;
    return joinRel(s.rel, row.name[i]);
  }

  async function frameSide(i) {
    const s = pair?.sides[i];
    if (!s) return;
    const n = await api.resolve(s.rel).catch(() => null);
    if (!n) {
      api.say(`${labOf(pair)[i]} is no longer there.`);
      return;
    }
    frameOne(n);
  }

  /**
   * Frames one copy and selects both. reveal() selects what it frames, at
   * once or, in region mode, in a later task, so both are selected after
   * it, and again once that task has run.
   */
  function frameBoth(nodes, primary) {
    frameOne(primary);
    api.selectAll(nodes, primary);
    setTimeout(() => {
      const held = S.sel.size === nodes.length && nodes.every((n) => S.sel.has(n)) && S.primary === primary;
      if (!held && S.primary === primary) api.selectAll(nodes, primary);
    }, 60);
  }

  /** Frames a node; without WebGL there is no flight, so the location moves to its folder. */
  function frameOne(n) {
    api.reveal(n);
    const dir = n.d ? n : n.p;
    if (S.noGL && dir) api.setFocus(dir.d ? dir : dir.p);
  }

  async function frameRow(row, g) {
    const lab = result.lab;
    const nm = rowName(row);
    const both = !!row.x[0] && !!row.x[1];
    const p0 = both || g.i === 0 ? pathOf(row, 0) : null;
    const p1 = both || g.i === 1 ? pathOf(row, 1) : null;
    if (!p0 && !p1) {
      api.say(`${nm} was there when the benchmark was set and is no longer here.`);
      return;
    }
    const [c0, c1] = await Promise.all([p0, p1].map((p) => (p == null ? null : api.resolve(p).catch(() => null))));
    const copies = [c0, c1].filter(Boolean);
    if (!copies.length) {
      api.say(`${nm} is no longer there.`);
      queue();
      return;
    }
    if (copies.length === 1) {
      frameOne(copies[0]);
      if (both && p0 && p1) api.say(`${nm} is no longer in ${c0 ? lab[1] : lab[0]}; selected the one in ${c0 ? lab[0] : lab[1]}.`);
      return;
    }
    const again = S.sel.size === 2 && S.sel.has(c0) && S.sel.has(c1);
    if (again && S.primary === c0) {
      frameBoth([c0, c1], c1);
      api.say(`Framed the one in ${lab[1]}.`);
      return;
    }
    frameBoth([c0, c1], c0);
    api.say(`Selected ${nm} in both folders; framed the one in ${lab[0]}. Enter again frames the other.`);
  }

  async function shelfRow(row) {
    const shelf = api.KEYS.get('shelf');
    if (!shelf) return;
    const paths = [pathOf(row, 0), pathOf(row, 1)].filter(Boolean);
    const nodes = (await api.resolveAll(paths).catch(() => [])).filter(Boolean);
    if (!nodes.length) {
      api.say(`${rowName(row)} is no longer there.`);
      return;
    }
    for (const n of nodes) shelf.run({ node: n });
  }

  async function selectGroup(g, lab) {
    const paths = [];
    for (const r of g.rows) {
      if (g.i !== undefined) paths.push(pathOf(r, g.i));
      else paths.push(pathOf(r, 0), pathOf(r, 1));
    }
    const nodes = (await api.resolveAll(paths.filter(Boolean)).catch(() => [])).filter(Boolean);
    if (!nodes.length) {
      api.say('None of these is there now.');
      return;
    }
    api.selectAll(nodes, nodes[0]);
    const where = g.id === 'only-0' || g.id === 'only-1' ? `only in ${lab[g.i]}` : g.id === 'changed' ? 'in both and changed, both copies' : 'in both and the same, both copies';
    const w = writableNow();
    api.say(`Selected ${plural(nodes.length, 'item')} ${where}. ${w ? 'Copy to… or Move to… acts on them; ' : ''}K puts them on the shelf.`);
  }

  function onListKey(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const btn = e.target.closest?.('button.cmp-item');
    if (!btn || btn.classList.contains('cmp-sug')) return;
    const list = btn.closest('.cmp-list');
    const li = btn.closest('li');
    const btns = [...list.querySelectorAll('button.cmp-item')];
    const i = btns.indexOf(btn);
    let to = null;
    if (e.key === 'ArrowDown') to = btns[Math.min(btns.length - 1, i + 1)];
    else if (e.key === 'ArrowUp') to = btns[Math.max(0, i - 1)];
    else if (e.key === 'Home') to = btns[0];
    else if (e.key === 'End') to = btns.at(-1);
    else if (e.key === 'Enter') frameRow(li.cmp.row, li.cmp.g);
    else if (e.key === 'ArrowRight') {
      const r = li.cmp.row;
      if (r.x[0] && r.x[1] && r.d[0] && r.d[1] && !result.res.bench) drill(r);
      else api.say(`${rowName(r)} is not a folder in both, so there is nothing inside to compare.`);
    } else if (e.key === 'ArrowLeft') {
      if (trail.length) back();
      else api.say('This is the level you chose; there is no level above it to back out to.');
    } else if (e.key === 'k' || e.key === 'K') shelfRow(li.cmp.row);
    else return;
    e.preventDefault();
    e.stopPropagation();
    if (to) {
      roving(list, to);
      to.focus();
    }
  }

  function onListClick(e) {
    const btn = e.target.closest?.('button.cmp-item');
    if (!btn || btn.classList.contains('cmp-sug')) return;
    const li = btn.closest('li');
    roving(btn.closest('.cmp-list'), btn);
    frameRow(li.cmp.row, li.cmp.g);
  }

  function onListDbl(e) {
    const btn = e.target.closest?.('button.cmp-item');
    if (!btn || btn.classList.contains('cmp-sug')) return;
    const r = btn.closest('li').cmp.row;
    if (r.x[0] && r.x[1] && r.d[0] && r.d[1] && !result.res.bench) drill(r);
  }

  /* ---------- the tab ---------- */

  function mount(host) {
    const nameEl = el('h3', { class: 'insp-name', tabindex: '-1' });
    const sides = el('ul', { class: 'cmp-sides', hidden: true });
    const tools = el('div', { class: 'cmp-tools actions', hidden: true });
    const lead = el('p', { class: 'cmp-note cmp-lead' });
    const start = el('button', {
      class: 'btn wide cmp-start', type: 'button', 'data-k': 'start',
      onclick: () => {
        if (start.getAttribute('aria-disabled') === 'true') {
          api.say(`Compare with… is unavailable: ${start.title.replace(/^Unavailable: /, '')}.`);
          return;
        }
        beginPick(candidate());
      },
    });
    const startExtra = el('div', { class: 'actions-grid cmp-start-extra', hidden: true });
    const cancel = keyed(el('button', { class: 'btn btn-small', type: 'button', hidden: true, onclick: () => api.stopPick() }, icon('clear'), 'Cancel'), 'cancel');
    const sugs = el('div', { class: 'cmp-sug-host' });
    const ways = el('p', { class: 'cmp-note cmp-ways', text: WAYS });
    const empty = el('div', { class: 'cmp-empty', hidden: true }, lead, el('div', { class: 'actions-grid cmp-start-grid' }, start), startExtra,
      el('div', { class: 'cmp-actions' }, cancel), sugs, ways);
    const sayEl = el('p', { class: 'cmp-say', hidden: true });
    const notes = el('div', { class: 'cmp-notes' });
    const stateEl = el('p', { class: 'cmp-state', hidden: true });
    const figures = el('div', { class: 'cmp-figures' });
    const groups = el('div', { class: 'cmp-groups rich', 'aria-busy': 'false' });
    const body = el('div', { class: 'cmp-body' },
      el('div', { class: 'insp-title cmp-head' }, el('div', { class: 'insp-kind' }, el('span', { text: 'Compare' })), nameEl, sides, tools),
      empty, stateEl, sayEl, notes, figures, groups);
    host.append(body);
    groups.addEventListener('keydown', onListKey);
    groups.addEventListener('click', onListClick);
    groups.addEventListener('dblclick', onListDbl);
    groups.addEventListener('focusin', (e) => {
      const b = e.target.closest?.('button.cmp-item');
      if (b) roving(b.closest('.cmp-list'), b);
    });
    ui = { panel: host, body, name: nameEl, sides, tools, empty, lead, start, startExtra, cancel, sugs, ways, sayEl, notes, state: stateEl, figures, groups };
  }

  function show() {
    if (!ui) return;
    // Two folders selected, nothing compared yet: compared at once.
    if (!pair && !picking && !justCleared && S.model) {
      const two = twoSelected();
      if (two && !two.some((n) => refusal(n))) {
        setPair([folderSide(two[0]), folderSide(two[1])]);
        return;
      }
    }
    if (pair && !picking && result?.key === pairKey(pair) && !dirty && !api.regionMode()) {
      draw();
      return;
    }
    if (pair && !picking && !(result?.key === pairKey(pair))) drawLoading();
    else draw();
    dirty = false;
    queue();
  }

  function hide() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    // A comparison under way is dropped; one already drawn is kept as it
    // is, and only a change while hidden (queue) makes it out of date.
    seq++;
    if (pair && !(result?.res && result.key === pairKey(pair))) dirty = true;
  }

  /* ---------- following ---------- */

  function pairsOf(body, res) {
    if (!body || !res) return [];
    let pairs = [];
    if (body.type === 'rename' && typeof body.path === 'string') pairs = [[body.path, res.renamed]];
    else if (body.type === 'renames' && Array.isArray(body.items)) {
      if (Array.isArray(res.renamed)) pairs = res.renamed;
      else if (Array.isArray(res.results)) pairs = res.results.map((to, k) => [body.items[k]?.path, to]);
    } else if (body.type === 'move' && Array.isArray(body.paths) && Array.isArray(res.results)) pairs = res.results.map((to, k) => [body.paths[k], to]);
    else if (body.type === 'undo' && Array.isArray(res.moved)) pairs = res.moved;
    return pairs.filter(pathPair);
  }

  /** Every side of p carried along the change's pairs. */
  function carryPair(p, pairs) {
    if (!p) return p;
    return {
      sides: p.sides.map((s) => {
        let rel = s.rel;
        for (const [from, to] of pairs) {
          const next = carried(rel, from, to);
          if (next !== null) rel = next;
        }
        return rel === s.rel ? s : { ...s, rel };
      }),
    };
  }

  /* ---------- registry entries ---------- */

  api.B_TABS.add({
    id: 'compare', owner: OWNER, order: 25, label: 'Compare', icon: ICON, title: 'Compare: two folders side by side, and what differs',
    mount, show, hide, focusTarget: () => ui?.name,
    drop: {
      refuse: (nodes) => {
        const folders = (nodes || []).filter((n) => n?.d);
        if (!folders.length) return 'only folders can be compared';
        if (folders.length > 2 || folders.length !== nodes.length) return folders.length > 2 ? 'drop one or two folders' : 'only folders can be compared';
        if (folders.some((n) => !n.ref && api.hostOf(n))) return 'inside an archive';
        return null;
      },
      take: (nodes) => {
        const folders = nodes.filter((n) => n.d);
        if (folders.length === 2) compareTwo(folders[0], folders[1]);
        else if (picking && api.picking()) choose(folders[0]);
        else if (folders[0]?.ref) api.resolve(folders[0].rel).then((n) => (n ? beginPick(n) : api.say('That folder is no longer there.')), () => {});
        else beginPick(folders[0]);
      },
    },
  });

  api.KEYS.add({
    id: 'compare', owner: OWNER, keys: ['c'], palette: false,
    guide: [LOOK, 'C', 'Compare the selection\'s folder with another (two folders selected: compare them)'],
    run: (c = {}) => {
      if (c.node && c.bench) {
        compareBench(c.node);
        return undefined;
      }
      if (c.node) {
        beginPick(c.node);
        return undefined;
      }
      if (!S.model) {
        api.say('Compare waits for the tree to be read.');
        return undefined;
      }
      const cur = c.inList ? api.listCursor() : null;
      if (picking && api.picking()) {
        const tries = [folderOf(S.primary), cur && !cur.ref ? folderOf(cur) : null, S.focus].filter(Boolean);
        const ok = tries.find((n) => !pickWhy(n));
        if (ok) choose(ok);
        else api.say(`Cannot compare with "${tries[0]?.n ?? 'that'}": ${pickWhy(tries[0]) || 'nothing is chosen'}.`);
        return undefined;
      }
      const two = twoSelected();
      if (two) {
        compareTwo(two[0], two[1]);
        return undefined;
      }
      beginPick(folderOf(S.primary) || (cur && !cur.ref ? folderOf(cur) : null) || S.focus);
      return undefined;
    },
  });
  api.KEYS.add({ id: 'compare-click', owner: OWNER, guide: [LOOK, 'Click', 'Choosing a folder to compare with: compare with the folder clicked (Esc cancels)'] });
  api.KEYS.add({ id: 'compare-drag', owner: OWNER, guide: [LOOK, 'Drag', 'One or two folders onto the Compare tab: compare them'] });
  api.KEYS.add({ id: 'compare-step', owner: OWNER, guide: [LOOK, '↑ ↓  Home  End', 'In Compare: the previous / next item, the first / last'] });
  api.KEYS.add({ id: 'compare-frame', owner: OWNER, guide: [LOOK, 'Enter', 'In Compare: select the item and frame it; in both, Enter again frames the other'] });
  api.KEYS.add({ id: 'compare-inside', owner: OWNER, guide: [LOOK, '→  ←', 'In Compare: compare inside a folder in both / back out'] });

  /** A node under one side whose path is held on the other side too: { i, otherRel, label }. */
  function matchOf(n) {
    if (!pair || !n || isBench(pair)) return null;
    const rel = api.relPath(n);
    for (let i = 0; i < 2; i++) {
      const base = pair.sides[i].rel;
      if (rel === base || !under(rel, base)) continue;
      const sub = base ? rel.slice(base.length + 1) : rel;
      const otherRel = joinRel(pair.sides[1 - i].rel, sub);
      const o = api.nearest(otherRel);
      if (o && api.relPath(o) === otherRel && !!o.d === !!n.d) return { i, otherRel, other: o, label: labOf(pair)[1 - i] };
    }
    return null;
  }

  api.MENU.add({
    id: 'compare', owner: OWNER, order: 26,
    items: (node) => {
      const target = node ? (node.d ? node : node.p) : S.focus;
      if (!target) return [];
      const off = api.hostOf(target) ? 'inside an archive' : target.e ? 'cannot be read' : !S.model ? 'the tree is still being read' : null;
      const out = [];
      if (picking && api.picking() && api.relPath(target) !== picking.first) {
        const why = pickWhy(target);
        out.push({ label: `Compare with "${picking.name}"`, icon: ICON, hint: 'C', run: () => choose(target), disabled: !!why, reason: why || undefined });
      }
      const label = node ? (node.d ? 'Compare with…' : 'Compare its folder with…') : 'Compare this folder with…';
      out.push({ label, icon: ICON, hint: 'C', run: () => beginPick(target), disabled: !!off, reason: off || undefined });
      if (!off && S.places?.find(target)) out.push({ label: 'Compare with its benchmark', icon: ICON, run: () => compareBench(target) });
      const m = node ? matchOf(node) : null;
      if (m && node.d) {
        out.push({
          label: `Compare with its match in "${m.label}"`, icon: ICON,
          run: () => {
            if (pair) trail.push({ pair, key: null });
            const rel = api.relPath(node);
            const sides = m.i === 0 ? [rel, m.otherRel] : [m.otherRel, rel];
            setPair(sides.map(folderSide), { keepTrail: true });
          },
        });
      } else if (m) {
        out.push({
          label: `Select its match in "${m.label}"`, icon: ICON,
          run: () => {
            frameOne(m.other);
            api.say(`Selected ${m.other.n} in ${m.label}.`);
          },
        });
      }
      return out;
    },
    many: (nodes) => {
      if (nodes.length !== 2) return [];
      const inside = nodes.some((n) => api.hostOf(n));
      const folders = nodes.every((n) => n.d);
      const off = inside ? 'inside an archive' : !folders ? 'both must be folders' : null;
      return [{ label: 'Compare these two', icon: ICON, hint: 'C', run: () => compareTwo(nodes[0], nodes[1]), disabled: !!off, reason: off || undefined }];
    },
  });

  api.COMMANDS.add({
    id: 'compare', owner: OWNER, section: 'Compare',
    items: () => {
      const f = candidate();
      const nm = f?.n || 'this folder';
      const two = twoSelected();
      const b = f && S.places ? S.places.find(f) : null;
      const none = pair ? null : 'nothing is being compared';
      return [
        { label: 'Compare with…', detail: `${nm} · C`, off: !S.model ? 'the tree is still being read' : refusal(f), run: () => beginPick(f) },
        { label: 'Compare the two selected folders', detail: two ? `${two[0].n} and ${two[1].n}` : 'Compare', off: two ? null : 'select two folders first', run: () => compareTwo(two[0], two[1]) },
        { label: 'Compare with its benchmark', detail: nm, off: b ? null : `no benchmark on ${nm}: B sets one`, run: () => compareBench(f) },
        { label: 'Swap the compared folders', detail: 'Compare', off: none, run: swap },
        // "Compare" in each label, so Ctrl+K "compare" lists all five.
        { label: 'Clear the compared folders', detail: 'Compare', off: none, run: clear },
      ];
    },
  });

  // Cheap: the start button's words and the offer of the two selected, only while shown.
  const light = () => {
    if (!ui || !api.bTabShown('compare')) return;
    if (!pair || picking) drawStart();
    else drawHead();
  };
  api.AFTER_SELECT.add({ id: 'compare', owner: OWNER, run: () => light() });
  api.AFTER_FOCUS.add({ id: 'compare', owner: OWNER, run: () => light() });
  api.AFTER_REFRESH.add({
    id: 'compare', owner: OWNER,
    run: (dirs) => {
      opPending = false;
      clearTimeout(opTimer);
      sugCache = new Map();
      if (!pair) return;
      if (!dirs) {
        queue();
        return;
      }
      // The folders read again: a Set of nodes (or paths), any of them on a side's path.
      const rels = [...pair.sides.map((s) => s.rel), ...trail.flatMap((t) => t.pair.sides.map((s) => s.rel))];
      const read = [...dirs].map((d) => (typeof d === 'string' ? d : d ? api.relPath(d) : null)).filter((d) => d != null);
      if (read.some((d) => rels.some((r) => under(r, d) || under(d, r)))) queue();
    },
  });
  api.AFTER_SURVEY.add({
    id: 'compare', owner: OWNER,
    run: (_sv, how = {}) => {
      sugCache = new Map();
      sugRegion = { name: null, list: null };
      if (S.warm && !how.settled) return;
      queue();
    },
  });
  api.AFTER_OP.add({
    id: 'compare', owner: OWNER,
    run: (body, res) => {
      opPending = true;
      clearTimeout(opTimer);
      opTimer = setTimeout(() => {
        opPending = false;
        queue();
      }, OP_WAIT);
      if (body?.type === 'trash' && Array.isArray(body.paths) && pair) {
        const paths = body.paths.filter((x) => typeof x === 'string' && x);
        pair.sides.forEach((s, i) => {
          if (s.type === 'folder' && paths.some((x) => under(s.rel, x))) held[i] = true;
        });
      }
      const pairs = pairsOf(body, res);
      if (pairs.length) {
        pair = carryPair(pair, pairs);
        trail = trail.map((t) => ({ ...t, pair: carryPair(t.pair, pairs) }));
        if (lastCleared) lastCleared = { ...lastCleared, pair: carryPair(lastCleared.pair, pairs) };
        if (picking) {
          for (const [from, to] of pairs) {
            const next = carried(picking.first, from, to);
            if (next !== null) picking = { ...picking, first: next, name: lastSeg(next) };
          }
        }
        if (result) result = { ...result, key: pairKey(pair) };
      }
      queue();
    },
  });
}
