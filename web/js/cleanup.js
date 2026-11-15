/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Cleanup (Terrane Edition - v1.1)
 *     - File Name: cleanup.js
 *     - Relative Path: web/js/cleanup.js
 *     - Artifact Type: javascript
 *     - Version: 1.1.0
 *     - Date: 11/15/2026
 *     - Update: Sunday, November 15, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Changelog:
 *     - 1.1.0 (11/15/2026) [dendogg + Anthropic - Claude Opus 5.5] — K on
 *       a row puts its item on the Shelf, or takes it off, through the
 *       Shelf's own key entry.
 *     - 1.0.0 (11/15/2026) [dendogg + Anthropic - Claude Opus 5.5] —
 *       Initial release. After the review: a sampled set says probable on
 *       its rows, its note and the confirmation; in region mode the folder
 *       is kept while the tree is read again, and is gone only on the
 *       service's word or a live client's miss, said as "no longer there";
 *       focus survives every redraw and Verify's lands on what it found;
 *       a new folder's head shows at once and nothing moves while the
 *       service counts or after it failed; Whole world only when it is not
 *       the parent; the offer bar and state line speak through say(); a
 *       folder renamed or moved by Terrane is followed; no copy is offered
 *       inside a cache the folder is or lies in, nor in .git or
 *       site-packages, which are never suggested from; a set of thousands
 *       of copies draws a page of rows, not all of them; the Duplicates
 *       head names the sets waiting to be verified, never "none".
 *
 * ✒ Description:
 *     The right panel's Cleanup tab: ranked, sized suggestions for
 *     reclaiming space in one folder, each with the rule that found it, a
 *     box to leave it out, and one button that moves what is checked to the
 *     holding area as one change that one Undo reverses. Nothing is ever
 *     deleted from here; the space comes back when the holding area is
 *     purged.
 *
 * ✒ Key Features:
 *     - The folder: the selection if it is a folder, else its folder, else
 *       the folder you are in; kept by path, set only by a person (the
 *       tab, the menu, the palette, the offer bar, the widen buttons), so
 *       the tab's own selections never move it; "in <parent>" and Whole
 *       world widen it
 *     - Four groups ranked by the space they free, each with its rule in
 *       words: verified duplicates (the copy kept shown first, newest or
 *       oldest), big and stale files, caches and build output from the
 *       fixed list, empty folders with the hidden-file rule stated
 *     - Rows select and frame their item in the world and the ledger;
 *       ↑ ↓ Home End move, Space leaves out or puts back, Enter frames,
 *       K puts the item on the Shelf; every total updates in place and nothing reorders until a refresh
 *     - One confirmation, the copies read again first, then one removal to
 *       the holding area (runOp, type trash) with its Undo; the totals
 *       refresh and what was left out stays left out
 *     - Region mode asks the service (GET /api/cleanup), the latest answer
 *       only, the new folder's head shown at once and the moves held while
 *       it counts; the folder is kept while the tree is read again (a new
 *       generation, Rescan all); a service without the route is said
 *       plainly and the held folders are walked
 *     - Read-only and snapshot modes show every suggestion with the moves
 *       unavailable and the reason; a warm start waits until the tree is
 *       checked; a folder removed under the tab gives way to the nearest
 *       one still there, and one Terrane renames or moves is followed; a
 *       folder that looks clean says so and why
 *     - A duplicate set compared by samples is marked probable on its
 *       rows, in its note and in the confirmation, as duplicate cleanup
 *       says it
 *     - A tab not shown does no work: no walk and no question
 *
 * ✒ Usage Instructions:
 *     Listed in features.js and installed by app.js. Right-click a folder,
 *     Suggest cleanup here; or choose CLEANUP on the right panel's strip;
 *     or Ctrl+K "cleanup".
 *
 * ✒ Examples:
 *     Projects selected, menu    Suggest cleanup here
 *     the head                   Could free 4.2 GB · 34% · 63 items
 *     Space on orbit-game/build  Left out build; the move now takes 62 items, 3.1 GB.
 *     Move 62 items, 3.1 GB      one confirmation, one journal entry, Undo
 *
 * ✒ Other Important Information:
 *     - Dependencies: reclaim.js (the rules), dupes.js (recheck), ui.js
 *       (ask, el), icons.js, model.js (formatting, refFrom); app.js's api:
 *       S, B_TABS, KEYS, MENU, COMMANDS, AFTER_SELECT, AFTER_FOCUS,
 *       AFTER_REFRESH, AFTER_SURVEY, AFTER_OP, ask, resolve, nearest,
 *       reveal, cursorTo, runOp, post, writable, hostOf, isAttached,
 *       relPath, verifyDuplicates, showBTab, bTabShown, parts, notice, say,
 *       actionButton
 *     - Compatible platforms: any browser with ES2022 modules
 *     - Performance: a whole tree is walked at most once a frame and only
 *       while the tab is shown; rows are drawn 100 at a time; a toggle
 *       changes the figures in place; one press moves at most 5,000 paths
 * ----------------------------------------------------------------------------
 */

import {
  walk, modelAccess, dupSuggestions, dupPage, combine, totals, movePaths, folderRule, inVcs, inPackages, CACHE_RULES, ENV_RULE, BIG_STALE, MOVE_MAX,
} from './reclaim.js';
import { recheck } from './dupes.js';
import { ask, el } from './ui.js';
import { icon } from './icons.js';
import { fmtBytes, fmtCount, fmtDay, plural, refFrom } from './model.js';

export const name = 'Cleanup';

const OWNER = 'cleanup';
/** Rows a group draws before "Show 100 more". */
const ROWS = 100;
/** How many of each list the service sends. */
const LIMIT = '1000';
const ICON = 'list-checks';
const PURGE = 'Moved items wait in the holding area inside this directory; the space comes back when it is purged.';
const SNAPSHOT_VERIFY = 'a snapshot holds no contents, so copies cannot be verified';
const SAMPLED = 'compared by three sampled megabytes and their size, not every byte';
/** A walk that found nothing: the answer for a folder nothing is ever suggested from. */
const NONE = () => {
  const l = () => ({ total: 0, bytes: 0, items: [] });
  return { caches: l(), stale: l(), empty: l(), hiddenOnly: 0, sealedCaches: 0, vcs: 0, pkgs: 0, claimed: [] };
};

const capital = (s) => `${s[0].toUpperCase()}${s.slice(1)}`;
const pct = (part, whole) => (whole > 0 ? `${Math.round((part / whole) * 100)}%` : '0%');
const nounOf = (g, n) => plural(n, g.noun[0], g.noun[1]);

export function install(api) {
  const { S } = api;

  /** The parts mount made. */
  let ui = null;
  /** The folder, by path ('' is the root), and whether a person chose it. */
  let scopeRel = null;
  let chosen = false;
  /** What a person left out, by path: kept for the page's life, across folders. */
  const leftOut = new Set();
  let keepHow = 'newest';
  /** Which groups a person opened or closed, and how many rows each shows. */
  const open = new Map();
  const shown = new Map();
  /** The last answer drawn, and whether a change came while hidden. */
  let result = null;
  let dirty = true;
  let seq = 0;
  let frame = 0;
  /** The node the tab itself selected last: its selections never re-scope it. */
  let picked = null;
  /** A move or an Undo happened: the next settled count says the remainder once. */
  let after = null;
  let moving = false;
  /** A sentence the next draw says (the folder gone, a widen). */
  let pendingSay = null;
  let sayOnDraw = false;
  /** Why nothing can be moved for now (the service counting, the tree read again), or null. */
  let waitWhy = null;
  /** Verify finished: the next draw puts focus on what it found. */
  let afterVerify = false;
  /** The state line's words last said, and the folder the offer bar last named. */
  let saidState = '';
  let offerSaid = null;

  /* ---------- the folder ---------- */

  /** The folder a node stands for: itself, or its folder; inside an open archive, the folder holding the archive. */
  function folderOf(node) {
    let n = node;
    const host = n ? api.hostOf(n) : null;
    if (host) n = host;
    if (n && !n.d) n = n.p;
    return n || S.model.root;
  }

  /** The folder Suggest… means now: the selection, its folder, or the folder you are in. */
  const candidate = () => folderOf(S.primary || S.focus);
  const nameAt = (rel) => (rel ? rel.slice(rel.lastIndexOf('/') + 1) : S.info?.name || S.model.root.n);
  const parentOf = (rel) => (rel.includes('/') ? rel.slice(0, rel.lastIndexOf('/')) : '');

  /** Points the tab at a folder (by node or path), keeps it, and draws it. */
  function scopeTo(target, { person = true } = {}) {
    const rel = typeof target === 'string' ? target : api.relPath(folderOf(target));
    if (person) chosen = true;
    if (rel !== scopeRel) {
      scopeRel = rel;
      result = null;
      shown.clear();
    }
  }

  /** Suggest… from the menu, the palette or the offer bar: the tab on that folder, focus on its head. */
  function openOn(node, { focus = true } = {}) {
    scopeTo(node);
    sayOnDraw = true;
    if (api.bTabShown('cleanup')) {
      queue();
      if (focus) ui?.name.focus({ preventScroll: true });
    } else api.showBTab('cleanup', { focus });
  }

  /* ---------- working it out ---------- */

  /** Schedules a recompute once a frame; a tab not shown only remembers it is out of date. */
  function queue() {
    if (!ui || !api.bTabShown('cleanup')) {
      dirty = true;
      return;
    }
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      compute();
    });
  }

  /** The survey's duplicate groups as reclaim.js reads them, nodes no longer in the tree dropped. */
  function dupGroups() {
    const groups = S.survey?.dupGroups || [];
    return groups.map((g) => ({
      src: g, verified: !!g.verified, mode: g.mode,
      files: g.files.filter((f) => f.ref || api.isAttached(f)).map((f) => ({ rel: api.relPath(f), n: f.n, name: f.n, s: f.s, m: f.m, node: f })),
    }));
  }

  /** A walk's answer from the service, as items. */
  function fromAnswer(ans) {
    const list = (l) => ({
      total: l.total, bytes: l.bytes,
      items: l.items.map((t) => {
        const r = refFrom(t);
        return { rel: r.rel, name: r.n, d: r.d, s: r.s, m: r.m, rule: t[11] ?? undefined, why: t[12], words: t[13] ?? undefined, node: r };
      }),
    });
    return {
      caches: list(ans.caches), stale: list(ans.stale), empty: list(ans.empty), hiddenOnly: ans.hiddenOnly, sealedCaches: ans.sealedCaches, vcs: ans.vcs ?? 0, pkgs: ans.pkgs ?? 0,
      claimed: ans.claimed, claimedCut: ans.claimedTotal > ans.claimed.length,
    };
  }

  /** Held folders under node (region mode, the service without the route). */
  function heldFolders(node) {
    let n = 0;
    const stack = [node];
    while (stack.length) {
      const d = stack.pop();
      if (d.u) continue;
      n++;
      for (const c of d.c) if (c.d) stack.push(c);
    }
    return n;
  }

  async function compute() {
    if (!ui || !api.bTabShown('cleanup')) {
      dirty = true;
      return;
    }
    dirty = false;
    const my = ++seq;
    if (scopeRel === null) scopeTo(candidate(), { person: false });
    if (!S.survey || S.survey.pending || S.scanning) {
      drawWaiting('Suggestions follow once the survey has finished.');
      return;
    }
    if (S.warm) {
      drawWaiting('Checking the tree from your last session; suggestions follow once it is settled.');
      return;
    }
    // In region mode a client being replaced (a new generation, Rescan
    // all) answers null for every path: that is not the folder gone.
    const client = S.regions;
    const replaced = () => !!client && (client.stale || S.regions !== client);
    let node = await api.resolve(scopeRel).catch(() => null);
    if (my !== seq) return;
    if (!node || !node.d) {
      if (replaced()) reading();
      else gone();
      return;
    }
    // A repository's records or installed packages: nothing in them is ever suggested.
    const records = inVcs(`${scopeRel}/-`) ? 'vcs' : inPackages(`${scopeRel}/-`) ? 'pkgs' : null;
    let w;
    let mode = 'whole';
    let held = 0;
    if (records) w = NONE();
    else if (api.regionMode()) {
      // The new folder's head at once, never the last folder's groups under
      // it; the same folder's stay, dimmed, and nothing moves meanwhile.
      waitWhy = 'still counting';
      drawHead(node);
      if (result && result.rel === scopeRel) drawFigures();
      else blank();
      busy(true, 'Counting across every level…');
      try {
        w = fromAnswer(await api.ask('cleanup', { under: scopeRel, limit: LIMIT }));
        mode = 'service';
      } catch (err) {
        if (my !== seq) return;
        if (err?.code === 'EROUTE') {
          w = walk(node, modelAccess);
          mode = 'held';
          held = heldFolders(node);
        } else if (err?.code === 'ESTALE' || replaced()) {
          reading();
          return;
        } else if (err?.code === 'ENOFOLDER') {
          busy(false);
          gone();
          return;
        } else {
          busy(false);
          drawError(err?.message || String(err));
          return;
        }
      }
      if (my !== seq) return;
      // The node may have been let go while the service counted.
      node = (await api.resolve(scopeRel).catch(() => null)) || node;
      if (my !== seq) return;
    } else w = walk(node, modelAccess);
    waitWhy = null;
    const cached = cacheAbove(node);
    const d = dupSuggestions(dupGroups(), scopeRel, w.claimed, keepHow, { claimedCut: !!w.claimedCut, scopeCached: !!cached });
    const groups = combine(w, d);
    result = { rel: scopeRel, node, groups, pending: d.pending, w, mode, held, regions: api.regionMode(), cached, records };
    busy(false);
    draw();
  }

  /** The cache the folder is or lies in (itself or its nearest ancestor), with its rule, or null. */
  function cacheAbove(node) {
    for (let n = node; n?.p; n = n.p) {
      const sib = new Set((n.p.c || []).filter((c) => !c.d).map((c) => c.n.toLowerCase()));
      const own = n.u ? [] : (n.c || []).filter((c) => !c.d).map((c) => c.n);
      const r = folderRule(n.n, sib, own);
      if (r) return { node: n, r };
    }
    return null;
  }

  /**
   * Region mode, the tree being read again: the folder kept, what is shown
   * dimmed and unmovable, until the new tree's survey (AFTER_SURVEY) asks
   * again.
   */
  function reading() {
    waitWhy = 'the tree is being read again';
    if (result && result.rel === scopeRel) drawFigures();
    else {
      drawHead(null);
      blank();
    }
    busy(true, 'Reading the tree again; the suggestions follow.');
  }

  /** The folder is no longer there: the nearest one still there, said once. */
  function gone() {
    if (scopeRel === '') {
      drawError('the root could not be read');
      return;
    }
    const was = nameAt(scopeRel);
    const near = api.nearest(scopeRel);
    let rel = near ? api.relPath(folderOf(near)) : '';
    // nearest() still holding the folder itself is no answer: its parent.
    if (rel === scopeRel) rel = parentOf(scopeRel);
    scopeRel = rel;
    result = null;
    waitWhy = null;
    shown.clear();
    pendingSay = `${was} is no longer there; showing ${nameAt(scopeRel)}.`;
    queue();
  }

  /* ---------- drawing ---------- */

  function busy(on, words = '') {
    if (!ui) return;
    // What is drawn names its folder once its count is in (the checks wait on it).
    if (on) delete ui.panel.dataset.shown;
    ui.groups.setAttribute('aria-busy', on ? 'true' : 'false');
    // What is still drawn is dimmed: the same folder's last count.
    ui.body.classList.toggle('is-waiting', on && ui.groups.childElementCount > 0);
    if (on) state(words);
  }

  /**
   * The state line. It is not a live region: with say, its words are said
   * through say() once, when they change (a draw says its own with the
   * rest of what it says).
   */
  function state(text, { error = false, say = false } = {}) {
    ui.state.textContent = text || '';
    ui.state.hidden = !text;
    ui.state.classList.toggle('is-error', error);
    if (say) {
      if (text && text !== saidState) api.say(text);
      saidState = text || '';
    }
  }

  /** Nothing shown under the head: a new folder being counted. */
  function blank() {
    ui.summary.hidden = true;
    ui.groups.replaceChildren();
  }

  /** The head: the folder's name, the way up, its facts. */
  function drawHead(node) {
    const rel = scopeRel ?? '';
    ui.name.textContent = nameAt(rel);
    const root = rel === '';
    ui.where.hidden = root;
    // Under the root, "in <root>" already widens to the whole world.
    ui.whole.hidden = root || parentOf(rel) === '';
    if (!root) {
      const up = parentOf(rel);
      ui.whereWords.textContent = `in ${nameAt(up)}`;
      ui.where.setAttribute('aria-label', `Widen to ${nameAt(up)}`);
      ui.where.title = `Widen to ${nameAt(up)}`;
    }
    ui.facts.replaceChildren(...(node ? (node.e
      ? api.parts('could not be read')
      : api.parts(fmtBytes(node.s), plural(node.fc ?? 0, 'file'), plural(node.dc ?? 0, 'folder'))) : []));
  }

  function drawWaiting(words) {
    delete ui.panel.dataset.shown;
    drawHead(null);
    state(words, { say: true });
    blank();
    ui.offer.hidden = true;
  }

  /** The suggestions could not be counted: none shown, so nothing can be moved, and a way to ask again. */
  function drawError(message) {
    const had = ui.groups.contains(document.activeElement);
    delete ui.panel.dataset.shown;
    drawHead(result?.rel === scopeRel ? result.node : null);
    result = null;
    waitWhy = null;
    blank();
    state(`The suggestions could not be counted: ${message}.`.replace(/\.\.$/, '.'), { error: true, say: true });
    const again = el('button', { class: 'btn btn-small', type: 'button', 'data-k': 'again', onclick: () => queue() }, 'Try again');
    ui.groups.replaceChildren(el('div', { class: 'cl-again' }, again));
    if (had) again.focus({ preventScroll: true });
  }

  /** Why a move cannot run here, or null. */
  const moveOff = () => (moving ? 'a move is under way' : waitWhy || api.writable());

  /** A group's figure on its head: its count and the space it frees; Duplicates with none verified yet, the sets waiting. */
  const headFig = (g) => (g.count ? `${fmtCount(g.count)} · ${g.id === 'empty' ? 'no space' : fmtBytes(g.bytes)}`
    : g.id === 'dups' && result?.pending ? `${plural(result.pending, 'set')} to verify` : 'none');

  /** The label of a group's Move button. */
  function groupLabel(g, t) {
    if (!t.count) return 'Nothing to move';
    const n = Math.min(t.count, MOVE_MAX);
    const what = nounOf(g, n);
    if (t.count > MOVE_MAX) return `Move ${fmtCount(MOVE_MAX)} of ${fmtCount(t.count)}`;
    return g.id === 'empty' ? `Move ${what}` : `Move ${what}, ${fmtBytes(t.bytes)}`;
  }

  /** The row's muted line: where it is under the folder, and the rule that found it. */
  function pathLine(it, g) {
    const base = scopeRel ? `${scopeRel}/` : '';
    const inside = it.rel.startsWith(base) ? it.rel.slice(base.length) : it.rel;
    const where = inside.includes('/') ? inside.slice(0, inside.lastIndexOf('/')) : '.';
    if (g.id === 'caches') return `${where} · ${it.why} · ${it.words}`;
    if (g.id === 'stale') return `${where} · changed ${fmtDay(it.m)}`;
    if (g.id === 'empty') return `${where} · holds nothing`;
    return `${where} · ${g.sets?.[it.set]?.sampled ? 'a probable copy' : 'a copy'}, changed ${fmtDay(it.m)}`;
  }

  /** A row: the box in the mark slot, the name over its path and rule, the size at the right. */
  function rowEl(it, g) {
    const out = leftOut.has(it.rel);
    const box = el('input', { type: 'checkbox', class: 'cl-box', tabindex: '-1', 'aria-label': `Include ${it.name}`, checked: !out });
    const tag = el('span', { class: 'cl-tag caps-tight', text: 'left out', hidden: !out });
    const btn = el('button', { class: 'item cl-item', type: 'button', tabindex: '-1', 'data-rel': it.rel, onclick: () => frameItem(it) },
      el('span', { class: 'cl-mark', 'aria-hidden': 'true' }),
      el('span', { class: 'cl-text' }, el('span', { class: 'nm', text: it.name }), el('span', { class: 'path' }, tag, pathLine(it, g))),
      el('span', { class: 'fig', text: g.id === 'empty' ? '' : fmtBytes(it.s) }));
    const li = el('li', { class: `cl-row${out ? ' is-out' : ''}`, 'data-rel': it.rel }, box, btn);
    box.addEventListener('change', () => toggle(it, g, li));
    li.cl = { it, g, box, tag };
    return li;
  }

  /** A duplicate set's kept copy: a check in the mark slot, never a box. */
  function keptEl(s) {
    const k = s.keep;
    const base = scopeRel ? `${scopeRel}/` : '';
    const inScope = !scopeRel || k.rel.startsWith(base);
    const where = inScope ? '' : ` · ${k.rel}`;
    const it = { rel: k.rel, name: k.name ?? k.n, node: k.node, s: k.s, m: k.m };
    const btn = el('button', { class: 'item cl-item', type: 'button', tabindex: '-1', 'data-rel': k.rel, onclick: () => frameItem(it) },
      el('span', { class: 'cl-mark' }, icon('ok'), el('span', { class: 'sr', text: 'kept, ' })),
      el('span', { class: 'cl-text' }, el('span', { class: 'nm', text: it.name }), el('span', { class: 'path', text: `keeps · ${keepHow} · changed ${fmtDay(k.m)}${s.sampled ? ' · probable' : ''}${where}` })),
      el('span', { class: 'fig', text: fmtBytes(k.s) }));
    const li = el('li', { class: 'cl-row is-kept', 'data-rel': k.rel }, btn);
    li.cl = { it, kept: true };
    return li;
  }

  /** A group's rows, up to n: a duplicate set's kept copy first, then its copies. */
  function rowsOf(g, n) {
    const out = [];
    if (g.id === 'dups') {
      // n copies in all, a set cut part way when it is large; its kept copy first.
      const byRel = new Map(g.items.map((x) => [x.rel, x]));
      const { page, more } = dupPage(g.sets, n);
      for (const { set, copies } of page) {
        out.push(keptEl(set));
        for (const c of copies) out.push(rowEl(byRel.get(c.rel) || c, g));
      }
      return { rows: out, more };
    }
    for (const it of g.items.slice(0, n)) out.push(rowEl(it, g));
    return { rows: out, more: Math.max(0, g.items.length - n) };
  }

  /** The note that states a group's rule. */
  function noteOf(g) {
    const R = result;
    const left = [R.w.vcs ? "a repository's .git, .hg or .svn folder" : null, R.w.pkgs ? 'an installed site-packages folder' : null].filter(Boolean);
    const vcs = left.length ? ` Nothing inside ${left.join(' or ')} is listed.` : '';
    if (g.id === 'stale') return `Files ${BIG_STALE.words}: the Big and stale quick search's thresholds.${vcs}`;
    if (g.id === 'caches') {
      const sealed = R.w.sealedCaches ? ` ${plural(R.w.sealedCaches, 'folder')} of these names could not be read and ${R.w.sealedCaches === 1 ? 'is' : 'are'} left alone.` : '';
      return `Folders a tool makes and makes again, by name from a fixed list, and any folder holding ${ENV_RULE.marker} (a Python environment); dist, build, target and coverage only beside the project file that makes them. Nothing inside a listed folder is listed again.${sealed}`;
    }
    if (g.id === 'dups') {
      const from = R.regions ? ' From the 400 largest sets the survey found.' : '';
      const k = g.sets.filter((x) => x.sampled).length;
      const how = !k ? 'Files verified identical by content.'
        : k === g.sets.length ? `Files compared by content. Probable: ${k === 1 ? 'these are large, so they were' : 'these sets are large, so they were'} ${SAMPLED}.`
          : `Files verified identical by content, but for ${plural(k, 'set')} marked probable: large, so ${SAMPLED}.`;
      return `${how} Each set keeps its ${keepHow} copy, shown first; the others are suggested.${from}`;
    }
    const h = R.w.hiddenOnly;
    const hid = h ? ` ${plural(h, 'folder')} here ${h === 1 ? 'holds' : 'hold'} only hidden files (such as .DS_Store) and ${h === 1 ? 'is' : 'are'} left alone.` : '';
    return `Holds nothing at all, hidden files included.${hid} Moving these frees no space; it clears clutter.${vcs}`;
  }

  /** "3 more sets share a size but are not verified" and Verify by content, or null. */
  function pendingEl() {
    const n = result.pending;
    if (!n) return null;
    const off = S.info?.snapshot ? SNAPSHOT_VERIFY : null;
    return el('div', { class: 'cl-pending' },
      el('p', { class: 'cl-note', text: `${plural(n, 'more set', 'more sets')} share${n === 1 ? 's' : ''} a size but ${n === 1 ? 'is' : 'are'} not verified.` }),
      el('div', { class: 'cl-actions' }, keyed(api.actionButton('Verify by content', verify, { off, icon: 'verify' }), 'verify')));
  }

  /** An element given its data-k: what a redraw finds again to put focus back on. */
  function keyed(e, k) {
    e.dataset.k = k;
    return e;
  }

  async function verify() {
    state('Reading the candidates to compare their contents…');
    try {
      await api.verifyDuplicates();
    } catch (err) {
      api.notice(err?.message || String(err), { kind: 'error' });
    }
    // Focus goes on to what it found: the Duplicates group's first row, else its head.
    afterVerify = true;
    queue();
  }

  /** Keep newest / Keep oldest: duplicate cleanup's two rules. */
  function keepSwitch() {
    const b = (how, label) => el('button', {
      class: 'btn btn-small', type: 'button', 'aria-pressed': String(keepHow === how), 'data-k': `keep-${how}`,
      onclick: () => {
        if (keepHow === how) return;
        keepHow = how;
        api.say(`Each set now keeps its ${how} copy.`);
        compute();
      },
    }, label);
    return el('div', { class: 'cl-switch', role: 'group', 'aria-label': 'Which copy each set keeps' }, b('newest', 'Keep newest'), b('oldest', 'Keep oldest'));
  }

  /** The 18 names and the Python environment, and what each makes. */
  function namesEl() {
    const d = el('details', { class: 'cl-names' }, el('summary', { 'data-k': 'names' }, el('span', { class: 't', text: `Which folders count (${CACHE_RULES.length + 1})` })),
      el('ul', { class: 'cl-rules' }, CACHE_RULES.map((r) => el('li', {}, el('code', { text: r.id }),
        ` ${r.beside ? `beside ${r.beside.join(' or ')}: ` : ''}${r.words}`)),
      el('li', {}, 'any name holding ', el('code', { text: ENV_RULE.marker }), `: ${ENV_RULE.words}`)));
    return d;
  }

  function groupEl(g, first) {
    const isOpen = open.has(g.id) ? open.get(g.id) : first && g.count > 0;
    const list = el('ul', { class: 'cl-list', role: 'list', 'aria-label': g.label });
    const n = shown.get(g.id) ?? ROWS;
    const { rows, more } = rowsOf(g, n);
    list.append(...rows);
    roving(list);
    list.addEventListener('keydown', onListKey);
    const parts = [el('p', { class: 'cl-note', text: noteOf(g) })];
    if (g.id === 'caches') parts.push(namesEl());
    if (g.id === 'dups') {
      if (g.sets.length) parts.push(keepSwitch());
      parts.push(pendingEl());
    }
    if (result.mode === 'service' && g.count > g.listed && g.id !== 'dups') {
      parts.push(el('p', { class: 'cl-note', text: `The ${fmtCount(g.listed)} largest of ${fmtCount(g.count)} are listed; the rest come up after a move.` }));
    }
    if (rows.length) parts.push(list);
    else parts.push(el('p', { class: 'cl-note cl-none', text: 'None here.' }));
    if (more > 0) {
      parts.push(el('div', { class: 'cl-actions' }, el('button', {
        class: 'btn btn-small', type: 'button', 'data-k': `more-${g.id}`,
        onclick: () => {
          shown.set(g.id, n + ROWS);
          draw();
          // Focus on the first row the press brought in.
          const list = ui.groups.querySelector(`[data-group=${g.id}] .cl-list`);
          const next = list?.querySelectorAll('button.cl-item')[rows.length];
          if (next) {
            roving(list, next);
            next.focus();
          }
        },
      }, `Show ${fmtCount(Math.min(ROWS, more))} more (${fmtCount(g.items.length)} in all)`)));
    }
    const btnHost = el('div', { class: 'cl-actions cl-group-move', 'data-move': g.id });
    if (g.items.length) parts.push(btnHost);
    const d = el('details', { class: 'cl-group', 'data-group': g.id, 'data-bytes': String(g.bytes), 'data-count': String(g.count), open: isOpen },
      el('summary', { 'data-k': `group-${g.id}` }, el('span', { class: 't', text: g.label }), el('span', { class: 'sr', text: ' · ' }), el('span', { class: 'n', text: headFig(g) })),
      parts);
    d.addEventListener('toggle', () => open.set(g.id, d.open));
    return d;
  }

  /** One tab stop per list: the row last reached, else the first. */
  function roving(list, at = null) {
    const btns = [...list.querySelectorAll('button.cl-item')];
    const keep = at || btns.find((b) => b.tabIndex === 0) || btns[0];
    for (const b of btns) b.tabIndex = b === keep ? 0 : -1;
  }

  /** The figures: the summary, the wide button, each group's button. */
  function drawFigures() {
    const R = result;
    const t = totals(R.groups, leftOut);
    R.t = t;
    const off = moveOff();
    const node = R.node;
    ui.sum.textContent = t.count
      ? `Could free ${fmtBytes(t.bytes)} · ${pct(t.bytes, node?.s || 0)} · ${plural(t.count, 'item')}`
      : `Could free 0 B · ${R.groups.some((g) => g.items.length) ? 'nothing checked' : 'nothing to suggest'}`;
    const wide = t.count > MOVE_MAX ? `Move ${fmtCount(MOVE_MAX)} of ${fmtCount(t.count)}` : t.count ? `Move ${plural(t.count, 'item')}, ${fmtBytes(t.bytes)}` : 'Nothing to move';
    setButton(ui.moveHost, keyed(api.actionButton(wide, () => move(null), { icon: 'remove', wide: true, off: t.count ? off : 'nothing is checked' }), 'move-all'));
    ui.under.textContent = t.count > MOVE_MAX ? `the ${fmtCount(MOVE_MAX)} largest first · to the holding area · Undo puts them back` : 'to the holding area · Undo puts them back';
    for (const g of R.groups) {
      const host = ui.groups.querySelector(`[data-move=${g.id}]`);
      if (!host) continue;
      const gt = t.by.get(g.id);
      setButton(host, keyed(api.actionButton(groupLabel(g, gt), () => move(g.id), { off: gt.count ? off : 'nothing is checked' }), `move-${g.id}`));
    }
  }

  /** Puts a new button in place, keeping focus on it if the old one had it. */
  function setButton(host, b) {
    const had = host.contains(document.activeElement);
    host.replaceChildren(b);
    if (had) b.focus({ preventScroll: true });
  }

  /** The state line for the mode and what stands in the way. */
  function stateWords() {
    const R = result;
    const words = [];
    const ro = api.writable();
    if (ro) words.push(`${capital(ro)}: nothing can be moved; these are suggestions only.`);
    if (R.mode === 'service') words.push('Counted by the service across every level.');
    if (R.mode === 'held') words.push(`Covers only the ${plural(R.held, 'folder')} loaded so far, not every level: this service does not count Cleanup at this size.`);
    if (R.node.e) words.push(`${nameAt(R.rel)} could not be read, so nothing in it can be suggested.`);
    else if (R.cached) {
      const c = R.cached;
      words.push(c.node === R.node
        ? `${R.node.n} is itself a cache (${c.r.words}): no copy in it is offered as a duplicate; widen to its parent to see it suggested.`
        : `${R.node.n} lies inside ${c.node.n}, a cache (${c.r.words}): no copy in it is offered as a duplicate.`);
    }
    return words.join(' ');
  }

  function draw() {
    const R = result;
    if (!ui || !R) return;
    // Everything under the groups is drawn again: where focus was is found
    // again by its row's path, its data-k, else its group's head.
    const a = document.activeElement;
    const inGroups = !!a && ui.groups.contains(a);
    const toFound = afterVerify && (!a || a === document.body || ui.panel.contains(a));
    afterVerify = false;
    const focusRel = inGroups ? a.closest('.cl-item')?.dataset.rel ?? null : null;
    const focusGroup = inGroups ? a.closest('[data-group]')?.dataset.group ?? null : null;
    const focusK = inGroups ? a.dataset?.k ?? null : null;
    drawHead(R.node);
    const any = R.groups.some((g) => g.count > 0);
    const words = stateWords();
    state(words);
    const news = words && words !== saidState ? words : '';
    saidState = words;
    ui.summary.hidden = false;
    if (R.records) {
      const what = R.records === 'vcs' ? "a repository's own records" : 'installed packages';
      ui.groups.replaceChildren(el('div', { class: 'cl-clean' },
        el('p', { class: 'cl-note', text: `${nameAt(R.rel)} holds ${what}: nothing in it is suggested, since moving any of it breaks ${R.records === 'vcs' ? 'the repository' : 'the packages'}.` }),
        el('p', { class: 'cl-note', text: 'Widen to its parent or the whole world to look further.' })));
    } else if (!any && !R.node.e) {
      ui.groups.replaceChildren(el('div', { class: 'cl-clean' },
        el('p', { class: 'cl-note', text: `${nameAt(R.rel)} looks clean: no verified duplicates, no files ${BIG_STALE.words}, no caches or build output from the named list, and no empty folders.` }),
        R.w.hiddenOnly ? el('p', { class: 'cl-note', text: `${plural(R.w.hiddenOnly, 'folder')} here ${R.w.hiddenOnly === 1 ? 'holds' : 'hold'} only hidden files (such as .DS_Store) and ${R.w.hiddenOnly === 1 ? 'is' : 'are'} left alone.` }) : null,
        pendingEl(),
        R.rel ? el('p', { class: 'cl-note', text: 'Widen to its parent or the whole world to look further.' }) : null));
    } else if (R.node.e) ui.groups.replaceChildren();
    else {
      const first = R.groups.find((g) => g.count > 0);
      ui.groups.replaceChildren(...R.groups.map((g) => groupEl(g, g === first)));
    }
    drawFigures();
    if (toFound) focusFound();
    else if (inGroups) refocus(focusRel, focusGroup, focusK);
    ui.panel.dataset.shown = R.rel;
    speak(news);
  }

  /** Puts focus back after a redraw: the same row, else the element of the same data-k, else the group's head, else the summary. */
  function refocus(rel, group, k) {
    const q = (sel) => ui.groups.querySelector(sel);
    let to = null;
    if (rel !== null) {
      to = [...ui.groups.querySelectorAll('button.cl-item')].find((x) => x.dataset.rel === rel) || q(`[data-group=${group}] button.cl-item[tabindex="0"]`);
      if (to) roving(to.closest('.cl-list'), to);
    } else if (k) to = q(`[data-k="${CSS.escape(k)}"]`);
    // Inside a closed group nothing takes focus but its head.
    if (to && to.closest('details:not([open])') && to.tagName !== 'SUMMARY') to = null;
    to = to || (group ? q(`[data-group=${group}] > summary`) : null) || ui.sum;
    to.focus({ preventScroll: true });
  }

  /** After Verify: the Duplicates group's first row (opened), else its head, else the summary. */
  function focusFound() {
    const d = ui.groups.querySelector('[data-group=dups]');
    const row = d?.querySelector('button.cl-item');
    if (row) {
      d.open = true;
      open.set('dups', true);
      roving(row.closest('.cl-list'), row);
      row.focus({ preventScroll: true });
    } else (d?.querySelector(':scope > summary') || ui.sum).focus({ preventScroll: true });
  }

  /** What the draw says: a pending sentence, the remainder after a move, or the summary when asked; news, the state line's new words, after it. */
  function speak(news = '') {
    const R = result;
    const t = R.t;
    const tail = news ? ` ${news}` : '';
    if (pendingSay) {
      api.say(`${pendingSay}${tail}`);
      pendingSay = null;
      sayOnDraw = false;
      return;
    }
    if (after && !S.surveyTimer) {
      after = null;
      api.say(`${nameAt(R.rel)}: ${fmtBytes(t.bytes)} left to suggest in ${plural(t.count, 'item')}.${tail}`);
      return;
    }
    if (sayOnDraw) {
      sayOnDraw = false;
      const top = R.groups.find((g) => g.count > 0);
      const largest = top ? ` Largest: ${top.label}, ${nounOf(top, top.count)}${top.id === 'empty' ? '' : `, ${fmtBytes(top.bytes)}`}.` : '';
      api.say(`${t.count ? `Cleanup for ${nameAt(R.rel)}: could free ${fmtBytes(t.bytes)} in ${plural(t.count, 'item')}.${largest}` : `Cleanup for ${nameAt(R.rel)}: ${R.groups.some((g) => g.count) ? 'nothing checked.' : 'it looks clean.'}`}${tail}`);
      return;
    }
    if (news) api.say(news);
  }

  /* ---------- rows ---------- */

  /** Leaves an item out or puts it back: the row, the group's button, the wide button and the summary in place. */
  function toggle(it, g, li) {
    const out = !leftOut.has(it.rel);
    if (out) leftOut.add(it.rel);
    else leftOut.delete(it.rel);
    li.classList.toggle('is-out', out);
    li.cl.box.checked = !out;
    li.cl.tag.hidden = !out;
    drawFigures();
    const t = result.t;
    api.say(`${out ? 'Left out' : 'Put back'} ${it.name}; the move now takes ${plural(t.count, 'item')}${t.count ? `, ${fmtBytes(t.bytes)}` : ''}.`);
  }

  /** Selects an item and frames it in the world; the ledger's cursor follows when it is listed. */
  async function frameItem(it) {
    // A walk's item carries its node (x); the service's, a ref (node).
    const held = it.node || (typeof it.x === 'object' ? it.x : null);
    let node = held && !held.ref && api.isAttached(held) ? held : null;
    if (!node) node = await api.resolve(it.rel).catch(() => null);
    if (!node) {
      api.say(`${it.name} is no longer there.`);
      state(`${it.name} is no longer there.`);
      queue();
      return;
    }
    picked = node;
    ui.offer.hidden = true;
    api.reveal(node);
    api.cursorTo(node);
  }

  function onListKey(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const list = e.currentTarget;
    const btn = e.target.closest?.('button.cl-item');
    if (!btn) return;
    const btns = [...list.querySelectorAll('button.cl-item')];
    const i = btns.indexOf(btn);
    let to = null;
    if (e.key === 'ArrowDown') to = btns[Math.min(btns.length - 1, i + 1)];
    else if (e.key === 'ArrowUp') to = btns[Math.max(0, i - 1)];
    else if (e.key === 'Home') to = btns[0];
    else if (e.key === 'End') to = btns.at(-1);
    else if (e.key === ' ' || e.key === 'Spacebar') {
      const li = btn.closest('li');
      if (li.cl?.kept) api.say(`${li.cl.it.name} is the copy kept; it is never moved.`);
      else if (li.cl) toggle(li.cl.it, li.cl.g, li);
    } else if (e.key === 'Enter') {
      const li = btn.closest('li');
      if (li.cl) frameItem(li.cl.it);
    } else if (e.key === 'k' || e.key === 'K') {
      // The Shelf's K, run on the row's item: its node, or a ref by its path.
      const it = btn.closest('li').cl?.it;
      const shelf = api.KEYS.get('shelf');
      if (!it || !shelf) return;
      const held = it.node || (typeof it.x === 'object' ? it.x : null);
      shelf.run({ node: held || { ref: true, rel: it.rel, n: it.name, d: !!it.d, s: it.s, m: it.m, p: { ref: true, d: true, rel: '', p: null } } });
    } else return;
    e.preventDefault();
    e.stopPropagation();
    if (to) {
      roving(list, to);
      to.focus();
    }
  }

  /* ---------- moving ---------- */

  async function move(groupId) {
    const R = result;
    if (!R || moving || waitWhy) return;
    const ro = api.writable();
    if (ro) {
      api.say(`${capital(ro)}: nothing can be moved; these are suggestions only.`);
      return;
    }
    const gs = groupId ? R.groups.filter((g) => g.id === groupId) : R.groups;
    const { paths, cut, all } = movePaths(gs.flatMap((g) => g.items), leftOut);
    if (!paths.length) return;
    const moving$ = new Set(paths);
    const lines = [];
    for (const g of gs) {
      const its = g.items.filter((it) => moving$.has(it.rel));
      if (!its.length) continue;
      const b = its.reduce((a, it) => a + it.s, 0);
      lines.push(`${g.label}: ${nounOf(g, its.length)}${g.id === 'empty' ? '' : `, ${fmtBytes(b)}`}`);
    }
    const dupG = gs.find((g) => g.id === 'dups');
    const sets = dupG ? dupG.sets.filter((s) => s.copies.some((c) => moving$.has(c.rel))) : [];
    // Sets compared by samples, said as duplicate cleanup says it.
    const probable = sets.filter((s) => s.sampled).length;
    const sampledWords = !probable ? null
      : probable === sets.length ? `These files are large, so they were ${SAMPLED}: they are probably, not certainly, the same.`
        : `${plural(probable, 'set')} of ${fmtCount(sets.length)} ${probable === 1 ? 'holds' : 'hold'} large files, ${SAMPLED}: probably, not certainly, the same.`;
    const ok = await ask({
      title: `Move ${plural(paths.length, 'item')} to the holding area?`, confirm: 'Move to the holding area', danger: true,
      body: el('div', { class: 'cl-confirm' },
        el('ul', { class: 'cl-confirm-list' }, lines.map((l) => el('li', { text: l }))),
        sets.length ? el('p', { class: 'dialog-body', text: `Keeps ${plural(sets.length, 'verified copy', 'verified copies')}, one of each duplicate set (its ${keepHow}).` }) : null,
        sampledWords ? el('p', { class: 'dialog-body cl-probable', text: sampledWords }) : null,
        cut ? el('p', { class: 'dialog-body', text: `One press moves at most ${fmtCount(MOVE_MAX)}: the first ${fmtCount(paths.length)} of ${fmtCount(all)} go now, the rest stay suggested.` }) : null,
        el('p', { class: 'dialog-body', text: 'Nothing is deleted: Undo (Ctrl+Z), or the Journal tab, puts every item back where it was. The space comes back when the holding area is purged.' })),
    });
    if (!ok) return;
    moving = true;
    drawFigures();
    try {
      if (sets.length) {
        // Read again just before: a copy rewritten since it was verified stops the whole move.
        const files = (s) => [s.keep, ...s.copies].map((f) => f.node);
        let changed;
        try {
          changed = await recheck(api, sets.map((s) => ({ files: files(s), hash: s.group.src?.hash })));
        } catch (err) {
          api.notice(err?.message || String(err), { kind: 'error' });
          return;
        }
        if (changed) {
          const words = `${changed.n} changed since it was verified, so nothing was moved. Verify by content again.`;
          api.notice(words, { kind: 'error' });
          pendingSay = words;
          queue();
          return;
        }
      }
      const res = await api.runOp({ type: 'trash', paths });
      if (res) after = 'move';
    } finally {
      moving = false;
      if (result) drawFigures();
    }
    ui.sum.focus({ preventScroll: true });
    queue();
  }

  /* ---------- the tab ---------- */

  function mount(host) {
    const name = el('h3', { class: 'insp-name', tabindex: '-1' });
    const whereWords = el('span', { class: 'pv-where-words' });
    const where = el('button', { class: 'pv-where cl-where', type: 'button', hidden: true, onclick: () => widen(parentOf(scopeRel ?? '')) }, icon('up'), whereWords);
    const whole = el('button', { class: 'btn btn-small cl-whole', type: 'button', hidden: true, onclick: () => widen('') }, 'Whole world');
    const facts = el('p', { class: 'cl-facts' });
    const offerText = el('span', { class: 'cl-offer-text' });
    const offer = el('div', { class: 'cl-offer', hidden: true }, offerText,
      el('button', { class: 'btn btn-small', type: 'button', 'data-k': 'offer', onclick: () => { ui.offer.hidden = true; openOn(candidate()); } }, 'Suggest for it'));
    const stateEl = el('p', { class: 'cl-state', hidden: true });
    const sum = el('p', { class: 'cl-sum', tabindex: '-1' });
    const moveHost = el('div', { class: 'cl-move' });
    const under = el('p', { class: 'cl-under' });
    const summary = el('div', { class: 'cl-summary', hidden: true }, sum, el('p', { class: 'cl-purge', text: PURGE }), moveHost, under);
    const groups = el('div', { class: 'cl-groups rich', 'aria-busy': 'false' });
    const body = el('div', { class: 'cl-body' },
      el('div', { class: 'insp-title cl-head' }, el('div', { class: 'insp-kind' }, el('span', { text: 'Suggestions for' })), name,
        el('div', { class: 'cl-widen' }, where, whole), facts),
      offer, stateEl, summary, groups);
    host.append(body);
    ui = { panel: host, body, name, where, whereWords, whole, facts, offer, offerText, state: stateEl, summary, sum, moveHost, under, groups };
  }

  function widen(rel) {
    scopeTo(rel);
    pendingSay = `Cleanup for ${nameAt(rel)}…`;
    sayOnDraw = true;
    queue();
    ui.name.focus({ preventScroll: true });
  }

  function show(_host, { focus = false } = {}) {
    if (!ui) return;
    // Chosen from the strip or the palette: the folder follows the selection
    // until a person chooses one, never after the tab's own selection.
    if (scopeRel === null || (!chosen && S.primary !== picked)) scopeTo(candidate(), { person: false });
    if (focus) sayOnDraw = true;
    if (result && result.rel === scopeRel && !dirty) draw();
    else if (!result) drawHead(null);
    dirty = false;
    queue();
    offerBar();
  }

  function hide() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    // A count under way is dropped, and done again when the tab is seen.
    seq++;
    dirty = true;
    afterVerify = false;
  }

  /** The offer bar: another folder selected, or travelled to, while the tab shows one. */
  function offerBar() {
    if (!ui || !api.bTabShown('cleanup') || scopeRel === null) return;
    if (S.primary && S.primary === picked) return;
    const c = candidate();
    const rel = api.relPath(c);
    if (rel === scopeRel) {
      ui.offer.hidden = true;
      return;
    }
    const p = S.primary;
    const text = p ? (p.d && folderOf(p) === p ? `Selected: ${p.n}` : `${p.n} is in ${nameAt(rel)}`) : `You are in ${nameAt(rel)}`;
    ui.offerText.textContent = text;
    ui.offer.hidden = false;
    // Not a live region: select() and travel say the node. Said here once
    // per folder, and only while you work in the tab.
    if (rel !== offerSaid && ui.panel.contains(document.activeElement)) api.say(`${text}. Suggest for it, at the top of Cleanup.`);
    offerSaid = rel;
  }

  const pathPair = (x) => Array.isArray(x) && typeof x[0] === 'string' && x[0] !== '' && typeof x[1] === 'string' && x[1] !== '' && x[0] !== x[1];
  /** rel carried from one path to another: itself or inside it, else null. */
  const carried = (rel, from, to) => (rel === from ? to : rel.startsWith(`${from}/`) ? `${to}${rel.slice(from.length)}` : null);

  /**
   * Terrane's own renames and moves, and their Undo, before the folders are
   * read again: the folder and what is left out follow by path.
   */
  function follow(body, res) {
    if (!body || !res) return;
    let pairs = [];
    if (body.type === 'rename' && typeof body.path === 'string') pairs = [[body.path, res.renamed]];
    else if (body.type === 'renames' && Array.isArray(body.items)) {
      if (Array.isArray(res.renamed)) pairs = res.renamed;
      else if (Array.isArray(res.results)) pairs = res.results.map((to, k) => [body.items[k]?.path, to]);
    } else if (body.type === 'move' && Array.isArray(body.paths) && Array.isArray(res.results)) pairs = res.results.map((to, k) => [body.paths[k], to]);
    else if (body.type === 'undo' && Array.isArray(res.moved)) pairs = res.moved;
    for (const [from, to] of pairs.filter(pathPair)) {
      const next = scopeRel ? carried(scopeRel, from, to) : null;
      if (next !== null) {
        scopeRel = next;
        result = null;
        shown.clear();
      }
      for (const rel of [...leftOut]) {
        const moved = carried(rel, from, to);
        if (moved !== null) {
          leftOut.delete(rel);
          leftOut.add(moved);
        }
      }
    }
  }

  /* ---------- registry entries ---------- */

  api.B_TABS.add({
    id: 'cleanup', owner: OWNER, order: 30, label: 'Cleanup', icon: ICON, title: 'Cleanup: ranked suggestions for reclaiming space',
    mount, show, hide, focusTarget: () => ui?.name,
  });

  // Guide rows: the keys act inside the tab's lists, so they bind no key.
  const MANY = 'Acting on many';
  api.KEYS.add({ id: 'cleanup-step', owner: OWNER, guide: [MANY, '↑ ↓', 'In Cleanup: the previous / next suggestion'] });
  api.KEYS.add({ id: 'cleanup-ends', owner: OWNER, guide: [MANY, 'Home  End', 'In Cleanup: the first / last suggestion of the group'] });
  api.KEYS.add({ id: 'cleanup-leave', owner: OWNER, guide: [MANY, 'Space', 'In Cleanup: leave the suggestion out, or put it back'] });
  api.KEYS.add({ id: 'cleanup-frame', owner: OWNER, guide: [MANY, 'Enter', 'In Cleanup: select it and frame it in the world'] });

  api.COMMANDS.add({
    id: 'cleanup', owner: OWNER, section: 'Cleanup',
    items: () => {
      const c = S.model ? candidate() : null;
      return [{
        label: 'Suggest cleanup for this folder', detail: `${c ? nameAt(api.relPath(c)) : 'This folder'} · right panel`,
        off: !S.survey ? 'the tree is still being read' : null, run: () => openOn(candidate()),
      }];
    },
  });

  api.MENU.add({
    id: 'cleanup', owner: OWNER, order: 25,
    items: (node) => {
      const target = node || S.focus;
      const inside = !!api.hostOf(target);
      const off = inside ? 'inside an archive' : target.d && target.e ? 'cannot be read' : null;
      const label = !node ? 'Suggest cleanup for this folder' : node.d ? 'Suggest cleanup here' : 'Suggest cleanup in its folder';
      return [{ label, icon: ICON, run: () => openOn(target), disabled: !!off, reason: off || undefined }];
    },
  });

  // Cheap: only the offer bar, and never for the tab's own selection.
  api.AFTER_SELECT.add({ id: 'cleanup', owner: OWNER, run: () => offerBar() });
  api.AFTER_FOCUS.add({ id: 'cleanup', owner: OWNER, run: () => offerBar() });
  api.AFTER_REFRESH.add({
    id: 'cleanup', owner: OWNER,
    run: () => {
      if (scopeRel === null) return;
      if (!api.regionMode() && !S.model.find(scopeRel)?.d) {
        gone();
        return;
      }
      queue();
    },
  });
  api.AFTER_SURVEY.add({
    id: 'cleanup', owner: OWNER,
    run: (_sv, how = {}) => {
      if (S.warm && !how.settled) return;
      queue();
    },
  });
  api.AFTER_OP.add({
    id: 'cleanup', owner: OWNER,
    run: (body, res) => {
      if (body?.type === 'undo' || (body?.type === 'trash' && moving)) after = body.type;
      follow(body, res);
    },
  });
}
