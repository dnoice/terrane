/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Shelf (Terrane Edition - v1.0)
 *     - File Name: shelf.js
 *     - Relative Path: web/js/shelf.js
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
 *       Initial release. After the review: the palette's gathering
 *       commands use the menu's words (Add to shelf, Take off the shelf,
 *       Add this folder to shelf, Add all results to shelf) and the acting
 *       ones say "everything on the shelf", so Ctrl+K "shelf" lists the K
 *       entry among its eight; K and the menus say what was on the shelf
 *       already; the line about items no longer there names them (past
 *       the rows drawn too) and its button says it or them.
 *
 * ✒ Description:
 *     The right panel's Shelf tab: a tray that collects files and folders
 *     from anywhere (the world, the ledger, Findings, Preview, Cleanup),
 *     keeps them by path across travel and reloads, and acts on them
 *     together with the batch operations Terrane already has. Gathering
 *     never touches the disk; every action that writes is one change with
 *     one Undo.
 *
 * ✒ Key Features:
 *     - K puts the selection on the shelf, or takes it off when all of it
 *       is there; Add to shelf on the world's menu and in the palette; rows
 *       dragged from the ledger onto the Shelf tab; Add all to the shelf on
 *       the Findings count row; K in Preview's pane and on a Cleanup row
 *     - Each item: its kind's swatch, its name, its folder and kind, its
 *       size; newest first; one Tab stop, ↑ ↓ Home End, Enter frames it,
 *       Space adds it to the selection or drops it, Del takes it off
 *     - Show in the world, Copy paths, Move to…, Copy to…, Rename…, Export
 *       CSV, and Clear the shelf with Put back; the writes start the
 *       controller's own placing and the batch rename, so each is one
 *       change, one journal entry and one Undo
 *     - Follows Terrane's renames and moves and their Undo by path
 *       (AFTER_OP); an item gone from disk is marked "no longer there" and
 *       offered for removal, never dropped silently
 *     - Region mode: items not held keep the figures they had when added
 *       and are found by path (resolveAll) before an action, the tree
 *       read again waited for; read-only, snapshot and a warm start keep
 *       the writes unavailable with the reason
 *     - The count on the tab's label (drawBTabCounts), and the tab is a
 *       drop target (B_TABS drop)
 *     - A tab not shown does no work: the status of the items is worked
 *       out at most once a frame, and only while it is shown
 *
 * ✒ Usage Instructions:
 *     Listed in features.js and installed by app.js. Select something and
 *     press K; choose SHELF on the right panel's strip, or Ctrl+K "shelf".
 *
 * ✒ Examples:
 *     K on frame-0412.exr     frame-0412.exr is on the shelf (1 item). K again takes it off.
 *     Add all from Findings   Put 7 items on the shelf (14 items); 1 was already on it.
 *     Move to…                Move 14 items: click a folder in the world, or travel to one…
 *     Clear the shelf         Cleared the shelf: 14 items. [Put back]
 *
 * ✒ Other Important Information:
 *     - Dependencies: shelf-store.js (the store), ui.js (el, download),
 *       icons.js, model.js (formatting, kindOf), csv.js (the export),
 *       layout.js (BOX), theme.js (cssHex); app.js's api: S, B_TABS, KEYS,
 *       MENU, COMMANDS, LEDGER_SUB, TIP_LINES, INSPECTOR, AFTER_OP,
 *       AFTER_SELECT, AFTER_FOCUS, AFTER_REFRESH, AFTER_SURVEY,
 *       RENAME_MANY, place, drawBTabCounts, resolve, resolveAll, nearest,
 *       reveal, selectAll, setFocus, relPath, absPath, hostOf, writable,
 *       copyText, listCursor, kindTone, parts, actionButton, notice, say
 *     - Storage: terrane.shelf.v1|<root> in this browser, |snapshot for
 *       a snapshot; a refusal is said once and the shelf lasts until the
 *       page closes
 *     - Compatible platforms: any browser with ES2022 modules
 *     - Performance: at most 1,000 items, 100 rows drawn at a time,
 *       look-ups by a Map
 * ----------------------------------------------------------------------------
 */

import { Shelf, shelfKey, SHELF_MAX, parentOf, nameOf, commonFolder, summary } from './shelf-store.js';
import { el, download } from './ui.js';
import { icon } from './icons.js';
import { fmtBytes, fmtCount, plural, kindOf } from './model.js';
import { NODE_COLUMNS, nodeRow, toCSV, fileName, slug, kindLabel } from './csv.js';
import { BOX } from './layout.js';
import { cssHex } from './theme.js';

export const name = 'Shelf';

const OWNER = 'shelf';
/** Rows the list draws before "Show 100 more". */
const ROWS = 100;
const ICON = 'shelf';
const MANY = 'Acting on many';
const ROOT_WHY = 'The authorized root cannot go on the shelf: it is the whole directory.';
const ARCHIVE_WHY = 'Entries inside an archive cannot go on the shelf; the archive itself can.';
const NOTHING = 'Nothing is selected: select files or folders, then K puts them on the shelf.';
const EXPLAIN = 'Gather files and folders here from anywhere, then move, copy, rename or export them together. It is kept in this browser for this directory.';
const WAYS = [
  'Select files or folders and press K, or right-click one and choose Add to shelf.',
  'Drag rows from the ledger onto the Shelf tab.',
  'Search in Find, then choose Add all to the shelf beside the Findings count.',
  'Press K in Preview, or on a Cleanup row.',
];

const capital = (s) => (s ? `${s[0].toUpperCase()}${s.slice(1)}` : s);
/**
 * The items no longer there, by name, so a person knows which even when
 * their rows are past the ones drawn: "Recipes is no longer there.", "a
 * and b are…", "5 items are no longer there: a, b and 3 more." A name
 * two of them share is given by its path.
 */
function goneWords(rels) {
  const g = rels.length;
  if (!g) return '';
  const head = rels.slice(0, g <= 3 ? 3 : 2);
  const names = head.map(nameOf);
  const shown = head.map((r, i) => (names.indexOf(names[i]) !== names.lastIndexOf(names[i]) ? r : names[i]));
  if (g === 1) return `${shown[0]} is no longer there.`;
  if (g <= 3) return `${shown.slice(0, -1).join(', ')} and ${shown.at(-1)} are no longer there.`;
  return `${fmtCount(g)} items are no longer there: ${shown.join(', ')} and ${fmtCount(g - 2)} more.`;
}
/** "; 2 no longer there stay on the shelf", or nothing. */
const goneTail = (g) => (g ? `; ${fmtCount(g)} no longer there ${g === 1 ? 'stays' : 'stay'} on the shelf` : '');

export function install(api) {
  const { S } = api;

  const store = new Shelf({
    key: shelfKey(S.info.root, S.info.snapshot ? 'snapshot' : ''),
    storage: () => window.localStorage,
    onFail: (why) => api.notice(`The shelf cannot be kept in this browser (${why}); it lasts until this page closes.`, { kind: 'info', ms: 15000 }),
    onChange: () => {
      api.drawBTabCounts();
      api.drawInspector();
      queue();
    },
  });
  store.load();
  window.addEventListener('storage', (e) => {
    if (e.key === null || e.key === store.key) store.sync();
  });

  /** The parts mount made. */
  let ui = null;
  /** Each item's status by path: { st: 'here' | 'gone' | 'unknown', node }. */
  let status = new Map();
  /** Region mode: paths a live client resolved to nothing, until the tree changes. */
  const goneSeen = new Set();
  /** A change was made: until its folders are read again, a path not found is not gone. */
  let opPending = false;
  let opTimer = 0;
  let frame = 0;
  let seq = 0;
  let busy = false;
  let shownRows = ROWS;
  /** The row last reached: the list's one Tab stop. */
  let cursorRel = null;

  /* ---------- gathering ---------- */

  /** Why a node cannot go on the shelf, or null. */
  function refusal(n) {
    if (!n) return NOTHING;
    if (!n.p || api.relPath(n) === '') return ROOT_WHY;
    if (api.hostOf(n)) return ARCHIVE_WHY;
    return null;
  }
  const relOf = (n) => api.relPath(n);
  const onShelf = (n) => !refusal(n) && store.has(relOf(n));
  const entryOf = (n) => ({ rel: relOf(n), d: n.d ? 1 : 0, s: n.s, m: n.m });

  /** The count on the tab's label flashes once (motion.css; none under reduced motion). */
  function bump() {
    const c = document.querySelector('#b-tab-shelf > .count');
    if (!c) return;
    c.classList.remove('is-bumped');
    void c.offsetWidth;
    c.classList.add('is-bumped');
    setTimeout(() => c.classList.remove('is-bumped'), 320);
  }

  /**
   * Puts nodes or refs on the shelf and says what happened, in one
   * sentence: what was added, what was there already, what the cap cut.
   * total: how many there were in all (a search's true count); k: put
   * by K or a menu that K mirrors, so "K again takes it off" holds.
   */
  function put(targets, { total = null, k = false } = {}) {
    const list = (targets || []).filter(Boolean);
    let why = null;
    const entries = [];
    for (const n of list) {
      const r = refusal(n);
      if (r) why = why || r;
      else entries.push(entryOf(n));
    }
    if (!entries.length) {
      api.say(why || NOTHING);
      return null;
    }
    const res = store.add(entries);
    const a = res.added.length;
    const N = store.size;
    const after = why ? ` ${why}` : '';
    let words;
    if (res.cut) {
      words = `The shelf holds at most ${fmtCount(SHELF_MAX)} items: put ${fmtCount(a)} of ${fmtCount(Math.max(total ?? 0, entries.length))} on it. Take some off to add more.`;
    } else if (entries.length === 1 && a === 1) {
      words = `${nameOf(res.added[0].rel)} is on the shelf (${plural(N, 'item')}).${k ? ' K again takes it off.' : ''}`;
    } else if (!a) {
      words = entries.length === 1 ? `${nameOf(entries[0].rel)} is already on the shelf (${plural(N, 'item')}).` : `All ${fmtCount(entries.length)} are already on the shelf (${plural(N, 'item')}).`;
    } else {
      const b = res.already;
      words = `Put ${plural(a, 'item')} on the shelf (${plural(N, 'item')})${b ? `; ${fmtCount(b)} ${b === 1 ? 'was' : 'were'} already on it` : ''}.`;
    }
    api.drawBTabCounts();
    if (a) bump();
    api.say(`${words}${after}`);
    queue();
    return res;
  }

  /** Takes paths off the shelf and says so; the disk is never touched. */
  function takeOff(rels) {
    const there = rels.filter((r) => store.has(r));
    const n = store.remove(there);
    if (!n) return 0;
    for (const r of there) {
      status.delete(r);
      goneSeen.delete(r);
    }
    api.drawBTabCounts();
    const N = store.size;
    api.say(n === 1
      ? `Took ${nameOf(there[0])} off the shelf (${plural(N, 'item')}). It stays where it is on disk.`
      : `Took ${plural(n, 'item')} off the shelf (${plural(N, 'item')}). They stay where they are on disk.`);
    return n;
  }

  /** K and the menus: every target already on the shelf comes off; otherwise those not on it go on. */
  function toggle(targets) {
    const list = (targets || []).filter(Boolean);
    if (!list.length) {
      api.say(NOTHING);
      return;
    }
    const ok = list.filter((n) => !refusal(n));
    if (!ok.length) {
      api.say(refusal(list[0]));
      return;
    }
    // The whole list goes to put(), so what was on the shelf already is
    // counted and said, as Add all in Findings says it.
    if (ok.every((n) => store.has(relOf(n)))) takeOff(ok.map(relOf));
    else put(list, { k: true });
  }

  /** Every match Findings lists, refs kept by path. */
  function addAll() {
    if (!S.search) {
      api.say('There is no search in Find: search first, then add its matches to the shelf.');
      return;
    }
    const list = S.search.list;
    if (!list.length) {
      api.say('Nothing matches this search, so nothing was put on the shelf.');
      return;
    }
    put(list, { total: Math.max(S.search.total ?? list.length, list.length) });
  }

  /* ---------- the status of each item ---------- */

  /** Works out which items are here, gone or not known now (cheap: look-ups by path). */
  function check() {
    const waiting = !S.survey || S.survey.pending || S.scanning || !!S.warm;
    const client = S.regions;
    const live = !client || (!client.stale && S.regions === client);
    const next = new Map();
    for (const it of store.items) {
      let st = 'unknown';
      let node = null;
      if (!waiting) {
        if (!client) {
          node = S.model.find(it.rel);
          st = node ? 'here' : opPending ? 'unknown' : 'gone';
        } else {
          const n = api.nearest(it.rel);
          if (n && api.relPath(n) === it.rel) {
            st = 'here';
            node = n;
          } else if (live && !opPending && (goneSeen.has(it.rel) || (n && n.d && !n.u && !n.tail))) st = 'gone';
        }
      }
      next.set(it.rel, node ? { st, node } : { st });
      if (node) store.refresh(it.rel, { s: node.s, m: node.m, d: node.d });
    }
    status = next;
  }

  const stOf = (rel) => status.get(rel)?.st || 'unknown';

  /** Schedules a draw once a frame, only while the tab is shown. */
  function queue() {
    // A tab not shown does no work: show() draws it afresh.
    if (!ui || !api.bTabShown('shelf') || frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      drawNow();
    });
  }

  function drawNow() {
    if (!ui) return;
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    check();
    draw();
  }

  /* ---------- acting ---------- */

  /** Why an action cannot run now, or null: kind 'paths' (by path), 'nodes', 'write' or 'rename'. */
  function whyOff(kind) {
    if (!store.size) return 'the shelf is empty';
    if (kind === 'paths') return null;
    if (busy) return 'still finding the items';
    if (!S.survey || S.survey.pending || S.scanning) return 'the tree is still being read';
    if (kind === 'write' || kind === 'rename') {
      const w = api.writable();
      if (w) return w;
    }
    if (kind === 'rename' && !api.RENAME_MANY.size) return 'the batch rename is not available';
    return null;
  }

  function setBusy(on) {
    busy = on;
    if (!ui) return;
    ui.body.classList.toggle('is-waiting', on);
    ui.list.setAttribute('aria-busy', on ? 'true' : 'false');
    if (api.bTabShown('shelf')) drawGrid();
  }

  /**
   * The items there now, as nodes, and the paths no longer there. In
   * region mode each path is found first (resolveAll); a null from a live
   * client is gone, and a tree being read again is waited for (null).
   */
  async function present() {
    const rels = store.items.map((it) => it.rel);
    const nodes = [];
    const gone = [];
    if (!api.regionMode()) {
      for (const r of rels) {
        const n = S.model.find(r);
        if (n) nodes.push(n);
        else {
          gone.push(r);
          status.set(r, { st: 'gone' });
        }
      }
      queue();
      return { nodes, gone };
    }
    const my = ++seq;
    const client = S.regions;
    setBusy(true);
    api.say(`Finding the shelf's ${plural(rels.length, 'item')} across the tree…`);
    let found;
    try {
      found = await api.resolveAll(rels);
    } catch (err) {
      if (my === seq) {
        setBusy(false);
        api.notice(err?.message || String(err), { kind: 'error' });
      }
      return null;
    }
    if (my !== seq) return null;
    setBusy(false);
    if (S.regions !== client || client?.stale) {
      api.say('The tree is being read again; try again in a moment.');
      return null;
    }
    found.forEach((n, i) => {
      if (n) nodes.push(n);
      else {
        gone.push(rels[i]);
        goneSeen.add(rels[i]);
        status.set(rels[i], { st: 'gone' });
      }
    });
    queue();
    return { nodes, gone };
  }

  /** Says why an action is unavailable and returns true, or false when it can run. */
  function refuse(what, kind) {
    const off = whyOff(kind);
    if (!off) return false;
    api.say(`${what} is unavailable: ${off}.`);
    return true;
  }

  /** Nothing on the shelf is there now: said, and false. */
  function anyThere(p) {
    if (p.nodes.length) return true;
    const g = p.gone.length;
    api.say(`Nothing on the shelf is there now: ${goneWords(p.gone)} ${g === 1 ? 'Take it' : 'Take them'} off the shelf with the button above the list.`);
    return false;
  }

  async function showAll() {
    if (refuse('Show in the world', 'nodes')) return;
    const p = await present();
    if (!p || !anyThere(p)) return;
    const { nodes, gone } = p;
    if (nodes.length === 1) {
      api.reveal(nodes[0]);
      if (S.noGL) moveTo(nodes[0]);
      if (gone.length) api.say(`Showing ${nodes[0].n}, the one shelf item still there${goneTail(gone.length)}.`);
      return;
    }
    api.selectAll(nodes, nodes[0]);
    const rel = commonFolder(nodes.map(relOf));
    const dir = await api.resolve(rel).catch(() => null);
    if (dir) api.setFocus(dir);
    api.say(`Showing the ${fmtCount(nodes.length)} shelf items, selected, in ${rel ? nameOf(rel) : S.info.name}${goneTail(gone.length)}.`);
  }

  /** Without WebGL there is no flight: the location moves to the folder that holds node. */
  function moveTo(node) {
    const dir = node.p && node.p.d ? node.p : null;
    if (dir) api.setFocus(dir);
  }

  async function placeAll(type) {
    const verb = type === 'move' ? 'Move' : 'Copy';
    if (refuse(`${verb} to…`, 'write')) return;
    const p = await present();
    if (!p || !anyThere(p)) return;
    api.selectAll(p.nodes, p.nodes[0]);
    api.place(type, p.nodes);
    if (S.placing) {
      const n = S.placing.nodes.length;
      api.say(`${type === 'move' ? 'Moving' : 'Copying'} ${plural(n, 'item')}${goneTail(p.gone.length)}: click a folder in the world, or travel to one and place it there. Escape cancels.`);
    }
  }

  async function renameAll() {
    if (refuse('Rename…', 'rename')) return;
    const p = await present();
    if (!p || !anyThere(p)) return;
    const batch = [...api.RENAME_MANY][0];
    batch.run(p.nodes);
    if (p.gone.length) api.notice(`Renaming ${plural(p.nodes.length, 'item')}${goneTail(p.gone.length)}.`, { kind: 'info' });
  }

  /** A row as csv.js reads a node: the live node's figures when held, else those kept. */
  function pseudo(it) {
    const s = status.get(it.rel);
    const n = s?.st === 'here' ? s.node : null;
    const nm = nameOf(it.rel);
    const d = n ? !!n.d : !!it.d;
    return { rel: it.rel, n: nm, d, s: n ? n.s : it.s, m: n ? n.m : it.m, k: d ? undefined : n?.k ?? kindOf(nm) };
  }

  function exportCsv() {
    if (!store.size) {
      api.notice('Nothing to export: the shelf is empty.', { kind: 'info' });
      return;
    }
    check();
    const rows = store.items.map((it) => [...nodeRow(pseudo(it), (x) => x.rel), stOf(it.rel) === 'gone' ? 'yes' : '']);
    const file = fileName([slug(S.info.name) || 'directory', 'shelf'], 'csv');
    download(file, toCSV([...NODE_COLUMNS, 'missing'], rows), 'text/csv;charset=utf-8');
    api.notice(`Exported ${plural(rows.length, 'row')} to ${file}.`);
  }

  function copyPaths() {
    if (!store.size) {
      api.say('Nothing to copy: the shelf is empty.');
      return;
    }
    check();
    const there = store.items.filter((it) => stOf(it.rel) !== 'gone');
    const g = store.size - there.length;
    if (!there.length) {
      api.say(`Nothing to copy: ${plural(g, 'item')} on the shelf ${g === 1 ? 'is' : 'are'} no longer there.`);
      return;
    }
    api.copyText(there.map((it) => api.absPath({ rel: it.rel })).join('\n'), `${plural(there.length, 'path')} copied to the clipboard${goneTail(g)}`);
  }

  function clearAll() {
    const n = store.size;
    if (!n) {
      api.say('The shelf is already empty.');
      return;
    }
    const list = store.clear();
    status.clear();
    goneSeen.clear();
    shownRows = ROWS;
    api.drawBTabCounts();
    api.notice(`Cleared the shelf: ${plural(n, 'item')}.`, {
      action: {
        label: 'Put back',
        run: () => {
          const k = store.restore(list);
          api.drawBTabCounts();
          api.say(k ? `Put ${plural(k, 'item')} back on the shelf (${plural(store.size, 'item')}).` : 'Nothing was put back: the shelf is full.');
        },
      },
    });
    api.say(`Cleared the shelf: ${plural(n, 'item')}. Nothing on disk changed; Put back, in the notice, restores the list.`);
    if (ui && api.bTabShown('shelf')) {
      drawNow();
      ui.name.focus({ preventScroll: true });
    }
  }

  /** The gone items off the shelf, from the state line. */
  function takeGone() {
    const gone = store.items.filter((it) => stOf(it.rel) === 'gone').map((it) => it.rel);
    if (!gone.length) return;
    takeOff(gone);
    drawNow();
    (rowButton(cursorRel) || firstRow() || ui.name).focus({ preventScroll: true });
  }

  /* ---------- rows ---------- */

  /** The node of a path, held or found; null when it is not there (and marked so). */
  async function nodeOf(rel) {
    const s = status.get(rel);
    if (s?.st === 'here' && s.node && (!api.regionMode() || api.nearest(rel) === s.node)) return s.node;
    const client = S.regions;
    const n = await api.resolve(rel).catch(() => null);
    if (n) return n;
    if (client && (client.stale || S.regions !== client)) {
      api.say('The tree is being read again; try again in a moment.');
      return undefined;
    }
    if (client) goneSeen.add(rel);
    status.set(rel, { st: 'gone' });
    queue();
    return null;
  }

  async function frameRel(rel) {
    if (!store.has(rel)) return;
    const nm = nameOf(rel);
    if (stOf(rel) === 'gone') {
      api.say(`${nm} is no longer there. Del takes it off the shelf.`);
      return;
    }
    const node = await nodeOf(rel);
    if (node === undefined) return;
    if (!node) {
      api.say(`${nm} is no longer there. Del takes it off the shelf.`);
      return;
    }
    cursorRel = rel;
    api.reveal(node);
    if (S.noGL) moveTo(node);
  }

  async function selToggle(rel) {
    if (!store.has(rel)) return;
    const nm = nameOf(rel);
    if (stOf(rel) === 'gone') {
      api.say(`${nm} is no longer there, so it cannot be selected. Del takes it off the shelf.`);
      return;
    }
    const node = await nodeOf(rel);
    if (node === undefined) return;
    if (!node) {
      api.say(`${nm} is no longer there, so it cannot be selected. Del takes it off the shelf.`);
      return;
    }
    const sel = [...S.sel];
    if (S.sel.has(node)) {
      const rest = sel.filter((x) => x !== node);
      api.selectAll(rest, S.primary === node ? rest.at(-1) ?? null : S.primary);
      api.say(`${node.n} dropped from the selection (${fmtCount(S.sel.size)} selected).`);
    } else {
      api.selectAll([...sel, node], node);
      api.say(`${node.n} added to the selection (${fmtCount(S.sel.size)} selected).`);
    }
  }

  /** Takes a row off from inside the list: focus goes to the next row, else the previous, else the head. */
  function offRow(rel) {
    const rows = [...ui.list.children];
    const i = rows.findIndex((li) => li.dataset.rel === rel);
    const next = rows[i + 1]?.dataset.rel ?? rows[i - 1]?.dataset.rel ?? null;
    if (!takeOff([rel])) return;
    if (next) cursorRel = next;
    drawNow();
    const to = next ? rowButton(next) : null;
    if (to) {
      roving(to);
      to.focus({ preventScroll: true });
    } else ui.name.focus({ preventScroll: true });
  }

  const rowButton = (rel) => (rel === null ? null : [...ui.list.querySelectorAll('button.sh-item')].find((b) => b.closest('li').dataset.rel === rel) || null);
  const firstRow = () => ui.list.querySelector('button.sh-item');

  /** One Tab stop in the list: the row a person reached last (at, or cursorRel), else the first. */
  function roving(at = null) {
    const btns = [...ui.list.querySelectorAll('button.sh-item')];
    if (at) cursorRel = at.closest('li').dataset.rel;
    const keep = at || rowButton(cursorRel) || btns[0];
    for (const b of btns) b.tabIndex = b === keep ? 0 : -1;
  }

  function onListKey(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const btn = e.target.closest?.('button.sh-item, button.sh-off');
    if (!btn) return;
    const rel = btn.closest('li').dataset.rel;
    const btns = [...ui.list.querySelectorAll('button.sh-item')];
    const i = btns.indexOf(btn.closest('li').querySelector('button.sh-item'));
    let to = null;
    if (e.key === 'ArrowDown') to = btns[Math.min(btns.length - 1, i + 1)];
    else if (e.key === 'ArrowUp') to = btns[Math.max(0, i - 1)];
    else if (e.key === 'Home') to = btns[0];
    else if (e.key === 'End') to = btns.at(-1);
    else if (e.key === 'Enter') {
      if (btn.classList.contains('sh-off')) offRow(rel);
      else frameRel(rel);
    } else if (e.key === ' ' || e.key === 'Spacebar') {
      if (btn.classList.contains('sh-off')) offRow(rel);
      else selToggle(rel);
    } else if (e.key === 'Delete' || e.key === 'k' || e.key === 'K') offRow(rel);
    else return;
    e.preventDefault();
    e.stopPropagation();
    if (to) {
      roving(to);
      to.focus();
    }
  }

  function onListClick(e) {
    const btn = e.target.closest?.('button.sh-item, button.sh-off');
    if (!btn) return;
    const rel = btn.closest('li').dataset.rel;
    if (btn.classList.contains('sh-off')) {
      offRow(rel);
      return;
    }
    roving(btn);
    if (e.ctrlKey || e.metaKey) selToggle(rel);
    else frameRel(rel);
  }

  /* ---------- drawing ---------- */

  /** A row: the swatch in the mark slot, the name over its folder and kind, the size at the right, and its x. */
  function rowEl(it) {
    const s = status.get(it.rel) || { st: 'unknown' };
    const node = s.node || null;
    const gone = s.st === 'gone';
    const nm = nameOf(it.rel);
    const d = node ? !!node.d : !!it.d;
    const k = d ? undefined : node?.k ?? kindOf(nm);
    const swatch = el('span', {
      class: gone ? 'swatch is-gone' : d ? 'swatch is-dir' : 'swatch',
      style: !gone && !d ? { background: cssHex(api.kindTone({ n: nm, k })) } : null,
    });
    const selected = !!node && S.sel.has(node);
    const where = `${parentOf(it.rel) || '/'} · ${capital(kindLabel({ d, k }))}`;
    const title = s.st === 'unknown' && store.size
      ? (!S.survey || S.survey.pending || S.scanning || S.warm ? 'The tree is still being read; figures as when it was added.' : 'Its folder is not loaded now; figures as when it was added.')
      : it.rel;
    const btn = el('button', { class: 'item sh-item', type: 'button', tabindex: '-1', title },
      swatch,
      el('span', { class: 'sh-text' },
        el('span', { class: 'nm', text: nm }),
        el('span', { class: 'path' }, gone ? el('span', { class: 'sh-tag caps-tight', text: 'no longer there' }) : null, gone ? el('span', { class: 'sr', text: ', ' }) : null, where),
        selected ? el('span', { class: 'sr sh-sel', text: ', selected' }) : null),
      el('span', { class: 'fig', text: fmtBytes(node ? node.s : it.s) }));
    const off = el('button', { class: 'btn btn-icon sh-off', type: 'button', tabindex: '-1', 'aria-label': `Take ${nm} off the shelf`, title: 'Take off the shelf' }, icon('clear'));
    return el('li', { class: `sh-row${gone ? ' is-gone' : ''}${selected ? ' is-selected' : ''}`, 'data-rel': it.rel }, btn, off);
  }

  const keyed = (e, k) => {
    e.dataset.k = k;
    return e;
  };

  /** The actions grid and its line of reasons. */
  function drawGrid() {
    if (!ui || !store.size) return;
    const had = ui.grid.contains(document.activeElement) ? document.activeElement.dataset.k : null;
    const nodes = whyOff('nodes');
    const write = whyOff('write');
    const rename = whyOff('rename');
    ui.grid.replaceChildren(
      keyed(api.actionButton('Show in the world', showAll, { icon: 'fly', off: nodes, title: 'Select every item and fly to the folder that holds them' }), 'show'),
      keyed(api.actionButton('Copy paths', copyPaths, { icon: 'copyPath', title: 'Every item\'s full path, one per line' }), 'copy-paths'),
      keyed(api.actionButton('Move to…', () => placeAll('move'), { icon: 'move', off: write, title: 'Move every item to a folder you choose: one change, one Undo' }), 'move'),
      keyed(api.actionButton('Copy to…', () => placeAll('copy'), { icon: 'copy', off: write, title: 'Copy every item to a folder you choose; the shelf keeps the originals' }), 'copy'),
      keyed(api.actionButton('Rename…', renameAll, { icon: 'rename', off: rename, title: 'Rename every item together, with a preview: one change, one Undo' }), 'rename'),
      keyed(api.actionButton('Export CSV', exportCsv, { icon: 'exportCsv', title: 'Save the list as a CSV file' }), 'export'));
    const why = [...new Set([nodes, write, rename].filter(Boolean))];
    ui.why.textContent = why.length ? `Unavailable here: ${why.join('; ')}.` : '';
    ui.why.hidden = !why.length;
    if (had) ui.grid.querySelector(`[data-k="${CSS.escape(had)}"]`)?.focus({ preventScroll: true });
  }

  /** The empty state's two buttons: the selection, and the folder you are in. */
  function emptyButtons() {
    if (!ui) return;
    const sel = [...S.sel].filter((n) => !refusal(n));
    ui.addSel.hidden = !sel.length;
    ui.addSel.textContent = `Add the selection (${plural(sel.length, 'item')})`;
    const here = S.focus;
    const ok = !!here && !refusal(here);
    ui.addHere.hidden = !ok;
    ui.addHere.textContent = ok ? `Add ${here.n}` : '';
    ui.addHere.title = ok ? `Add ${here.n} to the shelf` : '';
    ui.adds.hidden = ui.addSel.hidden && ui.addHere.hidden;
  }

  function draw() {
    if (!ui) return;
    const a = document.activeElement;
    const inBody = !!a && a !== document.body && ui.body.contains(a);
    const focusRel = inBody ? a.closest('.sh-row')?.dataset.rel ?? null : null;
    const focusK = inBody && focusRel === null ? a.dataset?.k ?? null : null;
    const n = store.size;
    const empty = !n;
    ui.kindWords.textContent = empty ? 'Shelf' : 'On the shelf';
    ui.name.textContent = empty ? 'Nothing on the shelf yet' : plural(n, 'item');
    const sum = summary(store.items, (it) => status.get(it.rel)?.node || null);
    ui.facts.hidden = empty;
    ui.facts.replaceChildren(...(empty ? [] : api.parts(fmtBytes(sum.bytes), sum.files ? plural(sum.files, 'file') : null,
      sum.folders ? plural(sum.folders, 'folder') : null, `from ${plural(sum.from, 'folder')}`)));
    ui.kept.hidden = empty;
    ui.kept.textContent = store.failed
      ? 'This browser refused to keep the shelf, so it lasts until this page closes. Taking items off the shelf never changes the disk.'
      : `Kept in this browser for ${S.info.name}. Taking items off the shelf never changes the disk.`;
    ui.empty.hidden = !empty;
    for (const x of [ui.grid, ui.list, ui.foot]) x.hidden = empty;
    if (empty) {
      emptyButtons();
      ui.why.hidden = true;
      ui.state.hidden = true;
      ui.more.hidden = true;
      ui.list.replaceChildren();
    } else {
      drawGrid();
      const goneRels = store.items.filter((it) => stOf(it.rel) === 'gone').map((it) => it.rel);
      const gone = goneRels.length;
      ui.state.hidden = !gone;
      ui.stateText.textContent = goneWords(goneRels);
      ui.stateText.title = gone ? goneRels.slice(0, 20).join('\n') + (gone > 20 ? `\n…and ${fmtCount(gone - 20)} more` : '') : '';
      ui.stateBtn.textContent = gone === 1 ? 'Take it off the shelf' : 'Take them off the shelf';
      const shown = store.items.slice(0, Math.max(ROWS, shownRows));
      ui.list.replaceChildren(...shown.map(rowEl));
      const more = n - shown.length;
      ui.more.hidden = more <= 0;
      ui.moreBtn.textContent = more > 0 ? `Show ${fmtCount(Math.min(ROWS, more))} more (${fmtCount(n)} in all)` : '';
      if (cursorRel !== null && !store.has(cursorRel)) cursorRel = null;
      roving(focusRel !== null ? rowButton(focusRel) : null);
    }
    ui.panel.dataset.count = String(n);
    if (!inBody) return;
    let to = null;
    if (focusRel !== null) to = rowButton(focusRel);
    else if (focusK) to = ui.body.querySelector(`[data-k="${CSS.escape(focusK)}"]`);
    else if (a === ui.name || a === ui.body) to = a;
    if (!to || to.closest('[hidden]')) to = ui.name;
    if (document.activeElement !== to) to.focus({ preventScroll: true });
  }

  /** Cheap, on every selection change: the rows' selected marks and the empty state's buttons. */
  function marks() {
    if (!ui || !api.bTabShown('shelf')) return;
    for (const li of ui.list.children) {
      const node = status.get(li.dataset.rel)?.node;
      const on = !!node && S.sel.has(node);
      if (li.classList.contains('is-selected') === on) continue;
      li.classList.toggle('is-selected', on);
      const text = li.querySelector('.sh-text');
      if (on) text.append(el('span', { class: 'sr sh-sel', text: ', selected' }));
      else text.querySelector('.sh-sel')?.remove();
    }
    if (!store.size) emptyButtons();
  }

  /* ---------- the tab ---------- */

  function mount(host) {
    const kindWords = el('span', { class: 'sh-kind-words', text: 'Shelf' });
    const nameEl = el('h3', { class: 'insp-name', tabindex: '-1' });
    const facts = el('p', { class: 'sh-facts' });
    const kept = el('p', { class: 'sh-kept' });
    const addSel = el('button', { class: 'btn btn-small', type: 'button', 'data-k': 'add-sel', onclick: () => put([...S.sel]) });
    const addHere = el('button', { class: 'btn btn-small', type: 'button', 'data-k': 'add-here', onclick: () => put([S.focus]) });
    const adds = el('div', { class: 'sh-adds' }, addSel, addHere);
    const empty = el('div', { class: 'sh-empty', hidden: true },
      el('p', { class: 'sh-note', text: EXPLAIN }),
      el('ul', { class: 'sh-ways' }, WAYS.map((w) => el('li', { text: w }))),
      adds);
    const grid = el('div', { class: 'actions-grid sh-actions', hidden: true });
    const why = el('p', { class: 'actions-why', hidden: true });
    const stateText = el('span', { class: 'sh-state-text' });
    const stateBtn = el('button', { class: 'btn btn-small', type: 'button', 'data-k': 'gone-off', onclick: takeGone }, 'Take them off the shelf');
    const state = el('div', { class: 'sh-state', hidden: true }, stateText, stateBtn);
    const list = el('ul', { class: 'sh-list', role: 'list', 'aria-label': 'On the shelf', 'aria-busy': 'false', hidden: true });
    const moreBtn = el('button', {
      class: 'btn btn-small', type: 'button', 'data-k': 'more',
      onclick: () => {
        const before = Math.max(ROWS, shownRows);
        shownRows = before + ROWS;
        drawNow();
        const next = ui.list.querySelectorAll('button.sh-item')[before];
        if (next) {
          roving(next);
          next.focus();
        }
      },
    });
    const more = el('div', { class: 'sh-more', hidden: true }, moreBtn);
    const foot = el('div', { class: 'sh-foot', hidden: true },
      el('button', { class: 'btn btn-small', type: 'button', 'data-k': 'clear', title: 'Take everything off the shelf; nothing on disk changes', onclick: clearAll }, 'Clear the shelf'));
    const body = el('div', { class: 'sh-body' },
      el('div', { class: 'insp-title sh-head' }, el('div', { class: 'insp-kind' }, kindWords), nameEl, facts, kept),
      empty, grid, why, state, list, more, foot);
    host.append(body);
    list.addEventListener('keydown', onListKey);
    list.addEventListener('click', onListClick);
    // The row a person reaches is the list's Tab stop from then on.
    list.addEventListener('focusin', (e) => {
      const b = e.target.closest?.('button.sh-item');
      if (b) roving(b);
    });
    // Del anywhere else in the tab never reaches the window's Del (remove
    // to the holding area): here it means taking off the shelf, from a row.
    body.addEventListener('keydown', (e) => {
      if (e.key !== 'Delete' || e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return;
      e.preventDefault();
      e.stopPropagation();
      api.say(store.size
        ? 'Del takes the item you are on off the shelf: reach a row of the list first. Nothing on disk is removed from the Shelf.'
        : 'The shelf is empty. Nothing on disk is removed from the Shelf.');
    });
    ui = { panel: host, body, kindWords, name: nameEl, facts, kept, empty, adds, addSel, addHere, grid, why, state, stateText, stateBtn, list, more, moreBtn, foot };
  }

  function show() {
    if (!ui) return;
    drawNow();
  }

  function hide() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
  }

  /* ---------- following ---------- */

  const pathPair = (x) => Array.isArray(x) && typeof x[0] === 'string' && x[0] !== '' && typeof x[1] === 'string' && x[1] !== '' && x[0] !== x[1];

  /** The [from, to] pairs of a change Terrane made: renames, moves and Undo's; never a copy or a removal. */
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

  /* ---------- registry entries ---------- */

  api.B_TABS.add({
    id: 'shelf', owner: OWNER, order: 40, label: 'Shelf', icon: ICON, title: 'Shelf: files and folders gathered from anywhere, to act on together',
    mount, show, hide, focusTarget: () => ui?.name,
    count: () => store.size || null,
    drop: {
      refuse: (nodes) => {
        const list = (nodes || []).filter(Boolean);
        if (!list.length) return 'nothing is being dragged';
        return list.some((n) => !refusal(n)) ? null : refusal(list[0]);
      },
      take: (nodes) => put(nodes),
    },
  });

  api.KEYS.add({
    id: 'shelf', owner: OWNER, keys: ['k'], palette: false,
    guide: [MANY, 'K', 'Put the selection on the shelf, or take it off'],
    run: (c = {}) => {
      if (c.node) {
        toggle([c.node]);
        return undefined;
      }
      if (S.sel.size) {
        toggle([...S.sel]);
        return undefined;
      }
      const cur = c.inList ? api.listCursor() : null;
      if (cur) toggle([cur]);
      else api.say(NOTHING);
      return undefined;
    },
  });
  // Guide rows: K elsewhere, the drag, and the list's own keys, which act inside the tab.
  api.KEYS.add({ id: 'shelf-k-elsewhere', owner: OWNER, guide: [MANY, 'K', 'In Preview, or on a Cleanup row: put that item on the shelf'] });
  api.KEYS.add({ id: 'shelf-drag', owner: OWNER, guide: [MANY, 'Drag', 'Ledger rows onto the Shelf tab: put them on the shelf'] });
  api.KEYS.add({ id: 'shelf-step', owner: OWNER, guide: [MANY, '↑ ↓  Home  End', 'In the Shelf: the previous / next item, the first / last'] });
  api.KEYS.add({ id: 'shelf-frame', owner: OWNER, guide: [MANY, 'Enter', 'In the Shelf: select the item and frame it in the world'] });
  api.KEYS.add({ id: 'shelf-space', owner: OWNER, guide: [MANY, 'Space', 'In the Shelf: add the item to the selection, or drop it'] });
  api.KEYS.add({ id: 'shelf-off', owner: OWNER, guide: [MANY, 'Del', 'In the Shelf: take the item off the shelf (it stays on disk)'] });

  api.MENU.add({
    id: 'shelf', owner: OWNER, order: 24,
    items: (node) => {
      const target = node || S.focus;
      const off = !target?.p ? 'the authorized root' : api.hostOf(target) ? 'inside an archive' : null;
      const on = !off && store.has(relOf(target));
      // The palette's words: Add to shelf, Add this folder to shelf.
      const label = node ? (on ? 'Take off the shelf' : 'Add to shelf') : (on ? 'Take this folder off the shelf' : 'Add this folder to shelf');
      return [{ label, icon: ICON, hint: 'K', run: () => toggle([target]), disabled: !!off, reason: off || undefined }];
    },
    // Gathering is not a change to the disk: ctx.ro does not stop it.
    many: (nodes) => {
      const inside = nodes.some((n) => api.hostOf(n));
      const ok = nodes.filter((n) => !refusal(n));
      const all = ok.length > 0 && ok.every((n) => store.has(relOf(n)));
      const label = all ? `Take ${fmtCount(nodes.length)} items off the shelf` : `Add ${fmtCount(nodes.length)} items to the shelf`;
      return [{ label, icon: ICON, hint: 'K', run: () => toggle(nodes), disabled: inside, reason: inside ? 'inside an archive' : undefined }];
    },
  });

  api.COMMANDS.add({
    id: 'shelf', owner: OWNER, section: 'Shelf',
    items: () => {
      const sel = [...S.sel];
      const ok = sel.filter((n) => !refusal(n));
      const selOn = ok.length > 0 && ok.every((n) => store.has(relOf(n)));
      const here = S.focus;
      const hereOff = !here ? 'the tree is still being read' : !here.p ? 'you are at the root, the whole directory' : api.hostOf(here) ? 'inside an archive'
        : store.has(relOf(here)) ? 'it is on the shelf already' : null;
      // The palette shows eight actions, ranked by how early the query
      // falls in each label. The gathering commands use the menu's own
      // words, with "shelf" early, and the acting ones say "everything on
      // the shelf", with it late, so Ctrl+K "shelf" lists Show Shelf, the
      // K entry (Add to shelf, or Take off the shelf), Add this folder and
      // Add all results first; a verb ("move", "export") finds the rest.
      return [
        {
          label: selOn ? 'Take off the shelf' : 'Add to shelf', hint: 'K',
          detail: sel.length ? `${plural(sel.length, 'item')} selected · Shelf` : 'The selection · Shelf',
          off: !sel.length ? 'nothing is selected' : !ok.length ? (refusal(sel[0]) === ROOT_WHY ? 'the authorized root' : 'inside an archive') : null,
          run: () => toggle(sel),
        },
        { label: 'Add this folder to shelf', detail: here?.n || 'This folder', off: hereOff, run: () => put([here]) },
        {
          label: 'Add all results to shelf', detail: S.query.trim() || 'Findings',
          off: !S.search ? 'there is no search in Find' : !S.search.list.length ? 'nothing matches' : null, run: addAll,
        },
        { label: 'Show everything on the shelf in the world', detail: 'Shelf', off: whyOff('nodes'), run: showAll },
        { label: 'Move everything on the shelf to…', detail: 'Shelf', off: whyOff('write'), run: () => placeAll('move') },
        { label: 'Copy everything on the shelf to…', detail: 'Shelf', off: whyOff('write'), run: () => placeAll('copy') },
        { label: 'Rename everything on the shelf together…', detail: 'Shelf', off: whyOff('rename'), run: renameAll },
        { label: 'Export everything on the shelf as CSV', detail: 'Shelf', off: whyOff('paths'), run: exportCsv },
        { label: 'Copy the paths of everything on the shelf', detail: 'Shelf', off: whyOff('paths'), run: copyPaths },
        { label: 'Clear the shelf', detail: 'Shelf', off: store.size ? null : 'the shelf is empty', run: clearAll },
      ];
    },
  });

  // After the selection's total and Save search…, before Export CSV.
  api.LEDGER_SUB.add({
    id: 'shelf-findings', owner: OWNER, order: 55, tab: 'findings',
    build: ({ search }) => (search ? el('button', {
      class: 'btn btn-icon sub-tool', type: 'button', 'data-k': 'shelf-all', 'aria-label': 'Add all to the shelf',
      title: `Add all to the shelf: every match listed, up to ${fmtCount(SHELF_MAX)}`, onclick: () => addAll(),
    }, icon(ICON)) : null),
  });

  api.TIP_LINES.add({
    id: 'shelf', owner: OWNER, order: 65,
    lines: (node, { type } = {}) => (type === BOX.SCREE || !node?.p || !store.size || !store.has(relOf(node)) ? null : 'On the shelf'),
  });

  api.INSPECTOR.node.add({
    id: 'shelf', owner: OWNER, order: 52,
    build: (node) => {
      const off = !node.p ? 'the authorized root' : api.hostOf(node) ? 'inside an archive' : null;
      const label = !off && store.has(relOf(node)) ? 'Take off the shelf' : 'Add to shelf';
      return el('div', { class: 'actions-grid shelf-action' }, keyed(api.actionButton(label, () => toggle([node]), { icon: ICON, wide: true, title: `${label} (K)`, off }), 'shelf-toggle'));
    },
  });
  api.INSPECTOR.many.add({
    id: 'shelf', owner: OWNER, order: 20,
    build: (nodes) => {
      const inside = nodes.some((n) => api.hostOf(n));
      const ok = nodes.filter((n) => !refusal(n));
      const all = ok.length > 0 && ok.every((n) => store.has(relOf(n)));
      const label = all ? `Take ${fmtCount(nodes.length)} items off the shelf` : `Add ${fmtCount(nodes.length)} items to the shelf`;
      return el('div', { class: 'actions-grid shelf-action' }, keyed(api.actionButton(label, () => toggle(nodes), { icon: ICON, wide: true, title: `${label} (K)`, off: inside ? 'inside an archive' : null }), 'shelf-toggle'));
    },
  });

  // Cheap: the rows' selected marks and the empty state's buttons, only while shown.
  api.AFTER_SELECT.add({ id: 'shelf', owner: OWNER, run: () => marks() });
  api.AFTER_FOCUS.add({ id: 'shelf', owner: OWNER, run: () => marks() });
  api.AFTER_REFRESH.add({
    id: 'shelf', owner: OWNER,
    run: () => {
      opPending = false;
      clearTimeout(opTimer);
      goneSeen.clear();
      queue();
    },
  });
  api.AFTER_SURVEY.add({
    id: 'shelf', owner: OWNER,
    run: (_sv, how = {}) => {
      if (S.warm && !how.settled) return;
      goneSeen.clear();
      queue();
    },
  });
  api.AFTER_OP.add({
    id: 'shelf', owner: OWNER,
    run: (body, res) => {
      // Until the folders are read again, a path not found is not yet gone.
      opPending = true;
      clearTimeout(opTimer);
      opTimer = setTimeout(() => {
        opPending = false;
        queue();
      }, 8000);
      goneSeen.clear();
      const pairs = pairsOf(body, res);
      if (pairs.length && store.follow(pairs)) status = new Map();
      queue();
    },
  });
}
