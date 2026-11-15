/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Preview (Terrane Edition - v1.0)
 *     - File Name: preview.js
 *     - Relative Path: web/js/preview.js
 *     - Artifact Type: javascript
 *     - Version: 1.0.0
 *     - Date: 11/14/2026
 *     - Update: Saturday, November 14, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Changelog:
 *     - 1.0.0 (11/14/2026) [dendogg + Anthropic - Claude Opus 5.5] —
 *       Initial release.
 *
 * ✒ Description:
 *     Panel B's Preview tab: a quick look docked beside the world that
 *     follows the selection, so a folder can be read through file by file
 *     without opening anything and without losing the place in the ledger
 *     or the world. Every case with nothing to show says why in one plain
 *     sentence, with its facts and the next step.
 *
 * ✒ Key Features:
 *     - Follows the selection: the head (kind, name, the folder it is in,
 *       facts) at once, the body once the arrows rest (140 ms), every read
 *       a newer subject supersedes aborted and a late answer dropped
 *     - Text: the first 256 KB with line numbers (each line's own, drawn
 *       by CSS; chunks of 200 lines under content-visibility, each sized
 *       from its lines), what kind of text it is, its lines, endings and
 *       byte order mark; Wrap lines kept in this browser, and from the
 *       palette even before Preview was chosen; chunks sized again when
 *       the pane's width changes
 *     - Pictures only through thumbs.js, the largest rung that fits, with
 *       the picture's size and colour; never the original
 *     - Sound and film in the browser's player, in byte ranges, nothing
 *       playing by itself, the player emptied on every change
 *     - A zip's listing (GET /api/inside, with a signal): what it holds,
 *       locked and escaping entries, its top level; Look inside opens it
 *     - A link's target, read lexically and never followed, with Select
 *     - A folder's summary: by kind, by age, its ten largest entries as
 *       rows that select; in region mode its region is held first; a
 *       sealed folder's contents unknown, not counted
 *     - Several selected: the list largest first with a total; Enter
 *       reads one (on the pane, the first) while the selection stays
 *       whole, Escape goes back; what would replace the selection there
 *       (a folder's rows, a link's Select) only lists or says why
 *     - Keys in its pane: ← → step to the previous and next item of the
 *       list the ledger shows (or the item's folder), Home and End to the
 *       ends, content first and kept from the window's keys; ↑ ↓ reach
 *       the rows; P opens Quick look where it shows more (text, a
 *       picture, a player), else says why; Enter opens
 *     - A tab not shown, or a sheet open, does no work: no read, no
 *       player; it is drawn again when it can be seen
 *
 * ✒ Usage Instructions:
 *     Listed in features.js and installed by app.js. Choose PREVIEW on
 *     panel B's tab strip, or Ctrl+K "preview", Enter; select something
 *     in the world or the ledger, or arrow through the list.
 *
 * ✒ Examples:
 *     README.md selected      Markdown text · .md, its numbered lines
 *     → in the pane           the next item of the list, selected
 *     site.zip selected       what it holds, its top level, Look inside
 *     Projects/current        A symbolic link, shown and never followed...
 *     six selected, Enter     reads the first, "1 of 6 selected", Esc back
 *     P on site.zip           Quick look shows no more than Preview for an archive.
 *
 * ✒ Other Important Information:
 *     - Dependencies: readers.js, thumbs.js, ui.js (el), icons.js,
 *       model.js, theme.js (cssHex), interior.js (isZipFamily, the entry
 *       flags), strata.js (strataOf, strataSentence, typicalLine),
 *       presets.js (selectionBytes); app.js's api: S, B_TABS, KEYS,
 *       ESCAPE, COMMANDS, AFTER_SELECT, AFTER_FOCUS, AFTER_REFRESH,
 *       AFTER_SURVEY, get, rawUrl, listItems, cursorTo, contentsOrder,
 *       composition, select, activate, ensure, resolve, resolveRow,
 *       hostOf, isAttached, relPath, relLabel, describe, say, parts,
 *       sectionTitle, fact, bTabShown, kids
 *     - Compatible platforms: any browser with ES2022 modules; whether a
 *       film plays depends on the browser's codecs, and Preview says so
 *       when it does not
 *     - Security: names and paths reach the page as text only; it reads
 *       and never posts, so read-only and snapshot modes refuse nothing
 * ----------------------------------------------------------------------------
 */

import {
  TEXT_MAX, classify, lookAs, lookShows, sentence, thumbSentence, readText, textKind, topBySize, selectionRows, linkTarget, STEPS, canScroll, stepIndex, stopPlayer,
} from './readers.js';
import { thumbs } from './thumbs.js';
import { el } from './ui.js';
import { icon } from './icons.js';
import { KINDS, FLAG_LINK, extOf, fmtBytes, fmtCount, fmtDay, fmtAge, relPath, kids, plural, Model } from './model.js';
import { cssHex } from './theme.js';
import { isZipFamily, FLAG_LOCKED, FLAG_ESCAPE } from './interior.js';
import { strataOf, strataSentence, typicalLine } from './strata.js';
import { selectionBytes } from './presets.js';

export const name = 'Preview';

const OWNER = 'preview';
/** How long the arrows must rest before the body is read. */
const DEBOUNCE_MS = 140;
/** How long a read may take before the old body dims and "Reading…" shows. */
const BUSY_MS = 120;
const LARGEST = 10;
const SELECTION_ROWS = 100;
const ARCHIVE_ROWS = 200;
const CHUNK_LINES = 200;
/** Wrap lines, kept in this browser for every directory: 'on' (the default) or 'off'. */
const WRAP_KEY = 'terrane.preview-wrap';

const nextTask = () => new Promise((r) => { setTimeout(r, 0); });

export function install(api) {
  const { S } = api;
  const $ = (id) => document.getElementById(id);

  /** The panel and its parts, made once by mount. */
  let panelEl = null;
  let ui = null;
  /** Reading one of several: { node, rows }, or null. */
  let peek = null;
  let timer = 0;
  let busyTimer = 0;
  let seq = 0;
  let ac = null;
  let player = null;
  /** The text view shown, for the wrap toggle. */
  let textView = null;
  /** Whether what is shown may be out of date (a read stopped, a change while hidden). */
  let stale = true;
  /** The body shown and whether it finished: a re-render of the same reads nothing. */
  let lastKey = null;
  let complete = false;
  /** The node the body was drawn for, and the name of one a refresh found gone. */
  let shownNode = null;
  let goneName = null;
  /** Counts surveys, so a folder's summary is drawn again after each. */
  let surveys = 0;
  /** The step key last left to the pane to scroll with, while it is held. */
  let held = null;
  /** The last text and the last archive listing, by path, size and time. */
  const cache = { text: null, archive: null };
  /** What a text's read added to the head (its lines, its cut), by path, size and time. */
  let headText = null;

  let wrap = true;
  try {
    wrap = localStorage.getItem(WRAP_KEY) !== 'off';
  } catch { /* the default */ }

  const note = (text, cls = '') => el('p', { class: `pv-note${cls ? ` ${cls}` : ''}`, text });
  const keyOf = (node) => `${relPath(node)}|${node.s}|${node.m}`;
  const dialogOpen = () => !!$('dialog')?.open;
  const opts = () => ({ snapshot: !!S.info.snapshot, entryOf: api.hostOf, archive: isZipFamily });
  const quicklook = () => api.KEYS.get('quicklook');
  const interior = () => api.KEYS.get('interior');

  /* ---------- the subject ---------- */

  function subject() {
    // Reading one of several lasts while it is one of several selected.
    if (peek && (S.sel.size < 2 || !S.sel.has(peek.node))) peek = null;
    if (peek) return { kind: 'peek', node: peek.node, among: peek.rows };
    if (S.sel.size > 1) return { kind: 'several', nodes: [...S.sel] };
    return { kind: 'one', node: S.primary || S.focus, here: !S.primary };
  }

  /** The node Quick look, Enter and the steps act on, or null for the list of several. */
  const shown = (sub = subject()) => (sub.kind === 'several' ? null : sub.node);

  /**
   * What Quick look would add for node: null when its sheet shows the
   * text, the picture or the player (as quicklook.js decides, through
   * lookAs), else the words for why it would show no more than Preview.
   */
  function lookWhy(node) {
    if (!node || node.d) return 'a folder';
    const { as } = classify(node, { snapshot: !!S.info.snapshot, entryOf: api.hostOf });
    if (lookAs(as) === 'text' && headText?.key === keyOf(node) && headText.binary) return 'binary content';
    if (lookShows(as)) return null;
    return { link: 'a link', entry: 'an archive\'s entry', empty: 'an empty file', snapshot: 'a file in snapshot mode' }[as]
      || (as === 'archive' || as === 'other-archive' || isZipFamily(node) ? 'an archive' : 'this kind of file');
  }

  /* ---------- the head ---------- */

  function kindLine(node, as) {
    if (node.d) return node.e ? `Sealed folder · ${node.e}` : kids(node) ? 'Folder' : 'Empty folder';
    const ext = extOf(node.n);
    // "Markdown text", "JSON text"; a label that names its own kind stays as it is.
    const named = textKind(node.n, '').label;
    const label = as !== 'text' ? KINDS[node.k].label
      : /(text|source|notebook|file|list|map)$/i.test(named) || /^(Makefile|Dockerfile)$/.test(named) ? named : `${named} text`;
    return `${label}${ext ? ` · .${ext}` : ''}${node.f & FLAG_LINK ? ' · symbolic link' : ''}`;
  }

  // A sealed folder's contents are unknown, not empty: no counts for it.
  const factsOf = (node, extra = []) => (node.d
    ? api.parts(...(node.e ? ['contents unknown'] : [fmtBytes(node.s), plural(node.fc, 'file'), plural(node.dc, 'folder')]))
    : api.parts(fmtBytes(node.s), ...extra, node.m ? `changed ${fmtDay(node.m)}` : null));

  function setFoot(...groups) {
    const kbd = (text) => el('kbd', { text });
    const out = [];
    for (const g of groups) {
      // A separator of its own, so the drawer can keep only the first
      // hints; it holds to the hint before it, so a line may end on its
      // dot and never begins with one.
      if (out.length) out.push(el('span', { class: 'sep', text: ' ·' }), ' ');
      out.push(el('span', { class: 'hint' }, ...g.map((x) => (typeof x === 'string' && x.startsWith('#') ? kbd(x.slice(1)) : x))));
    }
    ui.foot.replaceChildren(...out);
  }

  function drawFoot(sub, as) {
    const look = !lookWhy(shown(sub)) && !!quicklook();
    if (sub.kind === 'several') setFoot(['#↑', '#↓', ' rows'], ['#Enter', ' reads one here'], ['#←', '#→', ' step through them']);
    else if (sub.kind === 'peek') setFoot(['#←', '#→', ' previous / next selected'], ['#Esc', ' back to the list'], ...(look ? [['#P', ' Quick look']] : []));
    else if (sub.here) setFoot(['Select a file to read it here'], ['#←', '#→', ' step through the list']);
    else {
      // Three hints, two lines docked: the steps, the ends, and the next
      // thing to do (Quick look where it shows more, else Enter opens).
      const groups = [['#←', '#→', ' previous / next'], ['#Home', '#End', ' first / last'], look ? ['#P', ' Quick look'] : ['#Enter', ' opens']];
      // Only while lines run on: the Guide and the pane's description say it always.
      const binary = headText?.key === keyOf(sub.node) && headText.binary;
      if (as === 'text' && !wrap && !binary) groups.push(['a long line scrolls to its edge first']);
      setFoot(...groups);
    }
  }

  /** The head, drawn at once from what the node already says. */
  function drawHead(sub) {
    const { swatch, kindWords, name: nameEl, where, whereWords, facts, cut, peekBar, peekText, pane } = ui;
    cut.hidden = true;
    cut.textContent = '';
    peekBar.hidden = sub.kind !== 'peek';
    if (sub.kind === 'several') {
      const n = sub.nodes.length;
      swatch.hidden = true;
      kindWords.textContent = 'Selection';
      nameEl.textContent = `${fmtCount(n)} items`;
      where.hidden = true;
      const files = sub.nodes.filter((x) => !x.d).length;
      facts.replaceChildren(...api.parts(fmtBytes(selectionBytes(S.sel)), files ? plural(files, 'file') : null, n - files ? plural(n - files, 'folder') : null));
      pane.setAttribute('aria-label', `Preview of ${fmtCount(n)} selected items`);
      drawFoot(sub);
      return null;
    }
    const node = sub.node;
    const { as } = classify(node, opts());
    if (sub.here) {
      swatch.hidden = true;
      kindWords.textContent = 'You are in';
    } else {
      swatch.hidden = false;
      swatch.className = node.d ? (node.e ? 'swatch is-sealed' : 'swatch is-dir') : 'swatch';
      swatch.style.background = node.d ? '' : cssHex(KINDS[node.k].color);
      kindWords.textContent = kindLine(node, as);
    }
    nameEl.textContent = node.n;
    // The way back up: the folder it is in, or the summary of where you are.
    const up = node.p;
    where.hidden = sub.here || sub.kind === 'peek' || !up;
    if (!where.hidden) {
      whereWords.textContent = `in ${up.n}`;
      where.title = up === S.focus ? `Back to ${up.n}, where you are` : `Select ${api.relLabel(up)}`;
    }
    // A text read already says its lines and whether it was cut.
    const read = headText?.key === keyOf(node) ? headText : null;
    facts.replaceChildren(...factsOf(node, read?.extra || []));
    if (read?.cut) {
      cut.textContent = read.cut;
      cut.hidden = false;
    }
    if (sub.kind === 'peek') {
      const i = sub.among.indexOf(node);
      peekText.textContent = `${fmtCount(i + 1)} of ${fmtCount(sub.among.length)} selected`;
    }
    pane.setAttribute('aria-label', `Preview of ${node.n}`);
    drawFoot(sub, as);
    return as;
  }

  function goWhere() {
    const node = shown();
    const up = node?.p;
    if (!up) return;
    if (up === S.focus) {
      // Where you are: clearing the selection brings its summary back.
      api.select(null);
      api.say(`Back to ${up.n}, where you are.`);
    } else {
      api.select(up);
      api.cursorTo(up);
    }
  }

  /* ---------- the tools ---------- */

  function drawTools(sub, as) {
    const { wrapBtn, lookBtn, insideBtn, tools } = ui;
    const node = shown(sub);
    wrapBtn.hidden = as !== 'text' || (headText?.key === keyOf(node) && headText.binary);
    wrapBtn.setAttribute('aria-pressed', String(wrap));
    // Offered only where Quick look shows more: the text, the picture, the player.
    lookBtn.hidden = !quicklook() || !!lookWhy(node);
    const zip = as === 'archive' && !!interior();
    insideBtn.hidden = !zip;
    if (zip) {
      const open = S.interior?.host === node;
      const off = sub.kind === 'peek' ? 'select it alone first' : null;
      insideBtn.replaceChildren(icon('folder-open'), open ? `Close ${node.n}` : 'Look inside', off ? el('span', { class: 'sr', text: `, unavailable: ${off}` }) : '');
      insideBtn.toggleAttribute('data-named', open);
      insideBtn.setAttribute('aria-disabled', off ? 'true' : 'false');
      insideBtn.title = off ? `Unavailable: ${off}` : 'I';
    }
    tools.hidden = [wrapBtn, lookBtn, insideBtn].every((b) => b.hidden);
  }

  /**
   * Wrap lines on or off, kept in this browser. From the palette it may
   * run before Preview was ever chosen (no panel yet), or while it is not
   * on screen: the choice is kept and said, and applies when it shows.
   */
  function toggleWrap() {
    wrap = !wrap;
    try {
      localStorage.setItem(WRAP_KEY, wrap ? 'on' : 'off');
    } catch { /* not kept: the choice lasts until the page closes */ }
    if (ui) {
      ui.wrapBtn.setAttribute('aria-pressed', String(wrap));
      textView?.classList.toggle('is-nowrap', !wrap);
    }
    if (!ui || !api.bTabShown('preview')) {
      // Its text is drawn again, from what was read, when it shows.
      lastKey = null;
      api.say(wrap ? 'Preview will wrap long lines.' : 'Preview will let long lines run on.');
      return;
    }
    sizeChunks();
    redrawHead();
    api.say(wrap ? 'Long lines wrap.' : 'Long lines run on; ← → scroll them first.');
  }

  /** Quick look on node (Preview's item by default), or why it would show no more. */
  function openLook(node = shown()) {
    const k = quicklook();
    if (!k) return;
    if (!node) {
      api.say('Quick look shows one file: Down reaches the rows, and P on a row opens it.');
      return;
    }
    const why = lookWhy(node);
    if (why) {
      api.say(`Quick look shows no more than Preview for ${why}.`);
      return;
    }
    k.run({ node });
  }

  function lookInside() {
    if (ui.insideBtn.getAttribute('aria-disabled') === 'true') {
      api.say('Look inside acts on the selection: select the archive alone first.');
      return;
    }
    interior()?.run({ inList: false });
  }

  /* ---------- reading ---------- */

  /** Stops whatever the body left running: its read and its player. */
  function stopReads() {
    ac?.abort();
    ac = null;
    if (player) {
      stopPlayer(player);
      player = null;
    }
  }

  function unbusy() {
    clearTimeout(busyTimer);
    busyTimer = 0;
    ui.pane.removeAttribute('aria-busy');
    ui.pane.classList.remove('is-waiting');
  }

  /** Stops reading and marks what is shown as stale: the tab is hidden, or a sheet opened. */
  function pause() {
    clearTimeout(timer);
    timer = 0;
    if (ac || player || !complete) lastKey = null;
    stopReads();
    if (ui) unbusy();
    stale = true;
  }

  /**
   * The selection or the folder changed: the head follows at once, the
   * body once the arrows have rested, and whatever was being read stops.
   */
  function queue() {
    if (!ui) return;
    if (!api.bTabShown('preview') || dialogOpen()) {
      pause();
      return;
    }
    const sub = subject();
    const as = drawHead(sub);
    drawTools(sub, as);
    clearTimeout(timer);
    timer = setTimeout(() => render(), DEBOUNCE_MS);
    if (!busyTimer) {
      busyTimer = setTimeout(() => {
        ui.pane.setAttribute('aria-busy', 'true');
        ui.pane.classList.add('is-waiting');
      }, BUSY_MS);
    }
  }

  /** The head and the tools again, the body as it is (cheap). */
  function redrawHead() {
    if (!ui || !api.bTabShown('preview') || dialogOpen()) return;
    const sub = subject();
    drawTools(sub, drawHead(sub));
  }

  /** What identifies a body: drawn again only when this changes (or forced). */
  function bodyKey(sub, as) {
    if (sub.kind === 'several') return null;
    const node = sub.node;
    const base = `${sub.kind}|${sub.here ? 'here' : ''}|${keyOf(node)}|${as}|${S.info.snapshot ? 's' : ''}`;
    if (as === 'folder') {
      return `${base}|${surveys}|${S.scanning ? 1 : 0}|${node.fc}|${node.dc}|${node.mm}|${kids(node)}|${node.u ? 1 : 0}|${node.e}|${S.interior?.host ? relPath(S.interior.host) : ''}|${S.ages ? 1 : 0}`;
    }
    if (as === 'image') return `${base}|${thumbs.info(relPath(node))?.v ?? ''}`;
    if (as === 'archive') return `${base}|${S.interior?.host === node ? 'open' : ''}|${sub.kind}`;
    return base;
  }

  /**
   * Draws the body now. Each render counts (seq): an answer for an older
   * subject is dropped. Errors never escape: a failed part is replaced by
   * its sentence and reported on the console.
   */
  async function render({ force = false } = {}) {
    clearTimeout(timer);
    timer = 0;
    if (!ui) return;
    if (!api.bTabShown('preview') || dialogOpen()) {
      pause();
      return;
    }
    stale = false;
    const sub = subject();
    const as = drawHead(sub);
    drawTools(sub, as);
    const key = bodyKey(sub, as);
    const gone = goneName;
    if (!force && !gone && key !== null && key === lastKey && complete) {
      unbusy();
      return;
    }
    goneName = null;
    stopReads();
    const my = ++seq;
    lastKey = key;
    complete = false;
    textView = null;
    const { pane } = ui;
    // Focus on a row of the old body moves to the pane, and to the row
    // with the same data-k in the new one; the same subject keeps its scroll.
    const at = document.activeElement;
    const focusKey = at && at !== pane && pane.contains(at) ? at.dataset?.k ?? null : null;
    if (at && at !== pane && pane.contains(at)) pane.focus({ preventScroll: true });
    const sameNode = sub.kind !== 'several' && sub.node === shownNode;
    const scroll = sameNode ? [pane.scrollTop, pane.scrollLeft] : [0, 0];
    shownNode = sub.kind === 'several' ? null : sub.node;
    delete pane.dataset.shown;
    const out = el('div', { class: `pv-body${sameNode ? '' : ' is-new'}` });
    if (gone) out.append(note(`“${gone}” is no longer there: it was removed or renamed outside Terrane.`, 'is-gone'));
    pane.replaceChildren(out);
    // A new subject starts at the top; the same one gets its place back
    // once its body is whole (below).
    if (!sameNode) {
      pane.scrollTop = 0;
      pane.scrollLeft = 0;
    }
    const ctl = new AbortController();
    ac = ctl;
    const ctx = { my, signal: ctl.signal, alive: () => my === seq && !ctl.signal.aborted, sub };
    // "Reading…" only when a read takes longer than a moment.
    const waitNote = note('Reading…', 'is-wait');
    waitNote.hidden = true;
    const waiting = setTimeout(() => { if (ctx.alive()) waitNote.hidden = false; }, BUSY_MS);
    out.append(waitNote);
    try {
      if (sub.kind === 'several') severalBody(sub.nodes, out);
      else await bodyFor(sub.node, as, out, ctx);
    } catch (err) {
      if (!ctx.alive()) return;
      if (err?.name !== 'AbortError') {
        console.error('Preview could not draw this item:', err);
        out.append(note(sentence('read-error', sub.node || { n: '', s: 0 }, { info: { message: err?.message || String(err) } })), tryAgain());
      }
    } finally {
      clearTimeout(waiting);
      waitNote.remove();
    }
    if (my !== seq) return;
    if (ac === ctl) ac = null;
    complete = true;
    // What the body shows, once drawn whole (read by the checks).
    pane.dataset.shown = sub.kind === 'several' ? `${sub.nodes.length} items` : sub.node.n;
    if (sameNode) {
      pane.scrollTop = scroll[0];
      pane.scrollLeft = scroll[1];
    }
    unbusy();
    if (focusKey) [...out.querySelectorAll('[data-k]')].find((x) => x.dataset.k === focusKey)?.focus({ preventScroll: true });
  }

  const tryAgain = () => el('button', {
    class: 'btn btn-small pv-again', type: 'button',
    onclick: () => {
      cache.text = null;
      cache.archive = null;
      render({ force: true });
    },
  }, icon('refresh'), 'Try again');

  /** The service's refusal or a network failure, in words. */
  const why = (err) => (err instanceof TypeError ? 'the Terrane service is not reachable. Is it still running?' : err.message.replace(/\.$/, ''));

  async function bodyFor(node, as, out, ctx) {
    const host = api.hostOf(node);
    if (as === 'folder') return folderBody(node, out, ctx);
    if (as === 'text') return textBody(node, out, ctx);
    if (as === 'image') return imageBody(node, out, ctx);
    if (as === 'audio' || as === 'video') return mediaBody(node, out, as);
    if (as === 'archive') return archiveBody(node, out, ctx);
    if (as === 'link') return linkBody(node, out, ctx);
    out.append(note(sentence(as, node, { host })));
    return undefined;
  }

  /* ---------- text ---------- */

  async function textBody(node, out, ctx) {
    const k = keyOf(node);
    let res = cache.text?.key === k ? cache.text.res : null;
    if (!res) {
      try {
        res = await readText(api.rawUrl(node, TEXT_MAX), { signal: ctx.signal });
      } catch (err) {
        if (!ctx.alive() || err?.name === 'AbortError') return;
        out.append(note(sentence('read-error', node, { info: { message: why(err) } })), tryAgain());
        return;
      }
      if (!ctx.alive()) return;
      cache.text = { key: k, res };
    }
    if (res.binary) {
      headText = { key: k, extra: [], cut: null, binary: true };
      // Neither Wrap lines nor Quick look has anything to add.
      ui.wrapBtn.hidden = true;
      ui.lookBtn.hidden = true;
      ui.tools.hidden = [ui.wrapBtn, ui.lookBtn, ui.insideBtn].every((b) => b.hidden);
      drawFoot(ctx.sub, null);
      out.append(note(sentence('binary', node)));
      return;
    }
    const tk = textKind(node.n, res.text, { bom: res.bom, cut: res.cut });
    headText = {
      key: k, binary: false, cut: res.cut ? sentence('cut', node) : null,
      extra: [`${fmtCount(tk.lines)}${res.cut ? '+' : ''} line${tk.lines === 1 && !res.cut ? '' : 's'}`, tk.endings, tk.bom ? 'UTF-8 with BOM' : null],
    };
    ui.facts.replaceChildren(...factsOf(node, headText.extra));
    if (res.cut) {
      ui.cut.textContent = headText.cut;
      ui.cut.hidden = false;
    }
    if (tk.invalid) out.append(note(sentence('invalid', node)));
    // Measured, for a trace and the checks: up to about 6,500 lines a read.
    const t0 = performance.now();
    out.append(buildText(res.text));
    sizeChunks();
    performance.measure('terrane:preview-text', { start: t0 });
  }

  /**
   * The text as numbered lines in chunks of 200. Each line carries its
   * number (data-n), which CSS draws: a counter reset per chunk counted
   * from 1 on every line in Edge 157, since content-visibility's style
   * containment scopes counters to the chunk.
   */
  function buildText(text) {
    const rows = text.split(/\r\n|\n|\r/);
    if (rows.length > 1 && rows.at(-1) === '') rows.pop();
    const view = document.createElement('div');
    view.className = `pv-text${wrap ? '' : ' is-nowrap'}`;
    view.style.setProperty('--ln-w', `${String(rows.length).length}ch`);
    for (let i = 0; i < rows.length; i += CHUNK_LINES) {
      const chunk = document.createElement('div');
      chunk.className = 'pv-chunk';
      const end = Math.min(rows.length, i + CHUNK_LINES);
      // Each line's length in characters (a tab as four), for sizeChunks.
      const lens = [];
      const frag = document.createDocumentFragment();
      for (let j = i; j < end; j++) {
        const line = document.createElement('div');
        line.className = 'pv-line';
        line.dataset.n = String(j + 1);
        line.textContent = rows[j];
        frag.append(line);
        let n = rows[j].length;
        for (let k = rows[j].indexOf('\t'); k >= 0; k = rows[j].indexOf('\t', k + 1)) n += 3;
        lens.push(n);
      }
      chunk.lens = lens;
      chunk.append(frag);
      view.append(chunk);
    }
    textView = view;
    return view;
  }

  /**
   * Gives each chunk the size it will take, from its lines' lengths in
   * this mono face, so a chunk not drawn yet (content-visibility) holds
   * its true room: End reaches the end at once, and the scroll bar does
   * not jump as chunks are drawn. Wrapped, a line takes as many rows as
   * the pane's width allows; running on, one row, and the chunk is as
   * wide as its longest line.
   */
  function sizeChunks() {
    const view = textView;
    if (!view?.isConnected) return;
    const probe = el('span', { class: 'pv-probe', 'aria-hidden': 'true', text: '0'.repeat(64) });
    view.append(probe);
    const ch = probe.getBoundingClientRect().width / 64 || 6.3;
    probe.remove();
    const cs = getComputedStyle(view);
    const lh = parseFloat(cs.lineHeight) || 15.75;
    const line = view.querySelector('.pv-line');
    const ls = line ? getComputedStyle(line) : null;
    const pad = ls ? parseFloat(ls.paddingLeft) + parseFloat(ls.paddingRight) + parseFloat(ls.columnGap || 0) : 36;
    const digits = String(view.querySelectorAll('.pv-line').length).length;
    const lead = pad + digits * ch;
    const per = wrap ? Math.max(1, Math.floor((view.clientWidth - lead) / ch)) : 0;
    for (const chunk of view.children) {
      const lens = chunk.lens || [];
      let rows = 0;
      let widest = 0;
      for (const n of lens) {
        rows += per ? Math.max(1, Math.ceil(n / per)) : 1;
        if (n > widest) widest = n;
      }
      // Plain lengths, not auto: a size remembered before Wrap lines
      // changed would be wrong after it.
      chunk.style.containIntrinsicWidth = per ? 'none' : `${Math.ceil(lead + widest * ch)}px`;
      chunk.style.containIntrinsicHeight = `${Math.ceil(rows * lh)}px`;
    }
  }

  /* ---------- pictures, sound and film ---------- */

  async function imageBody(node, out, ctx) {
    if (thumbs.pending) await thumbs.pending;
    if (!ctx.alive()) return;
    const rel = relPath(node);
    const t = thumbs.info(rel);
    const room = Math.max(120, ui.pane.clientWidth - 24);
    const px = Math.round(room * (window.devicePixelRatio || 1));
    const img = t ? thumbs.img(rel, px, node.n) : null;
    if (!img) {
      out.append(note(thumbSentence(t, node, { snapshot: !!S.info.snapshot })));
      return;
    }
    // It is in view: no lazy wait.
    img.removeAttribute('loading');
    const fig = el('figure', { class: 'pv-picture' }, img);
    img.addEventListener('error', () => {
      if (fig.isConnected) fig.replaceWith(note(sentence('image-error', node)));
    });
    const rung = t.rungs & 4 ? 'svg' : px > 200 && t.rungs & 2 ? 480 : 160;
    // One part, so the swatch stays with its words.
    const colour = t.color ? el('span', {}, el('span', { class: 'swatch', style: { background: t.color } }), `colour ${t.color}`) : null;
    fig.append(el('figcaption', { class: 'pv-caption' },
      ...api.parts(t.w ? `${fmtCount(t.w)} × ${fmtCount(t.h)} px` : null, colour, rung === 'svg' ? 'from its vector source' : `from the ${rung} px thumbnail`)));
    out.append(fig);
  }

  function mediaBody(node, out, tag) {
    const m = el(tag, { controls: true, preload: 'metadata', src: api.rawUrl(node, 0), 'aria-label': node.n });
    m.addEventListener('error', () => {
      if (player !== m) return;
      stopPlayer(m);
      player = null;
      m.closest('.pv-player')?.replaceWith(note(sentence('media-error', node)));
    });
    player = m;
    out.append(el('div', { class: 'pv-player' }, m));
    if (S.info.demo) out.append(note(tag === 'video' ? 'The demo world plays one recorded film for every video.' : 'The demo world plays a tone made in the page for every sound.'));
  }

  /* ---------- archives and links ---------- */

  async function archiveBody(node, out, ctx) {
    const k = keyOf(node);
    let entry = cache.archive?.key === k ? cache.archive : null;
    if (!entry) {
      let res;
      try {
        res = await api.get('inside', { path: relPath(node) }, { signal: ctx.signal });
      } catch (err) {
        if (!ctx.alive() || err?.name === 'AbortError') return;
        out.append(note(why(err).endsWith('?') ? `This archive could not be listed: ${why(err)}` : `${why(err)}.`), tryAgain());
        return;
      }
      if (!ctx.alive()) return;
      // The listing in a throwaway model, never grafted, in a task of its own.
      await nextTask();
      if (!ctx.alive()) return;
      const model = new Model(node.n);
      model.ingest(res.records, [], model.root);
      entry = { key: k, res, root: model.root };
      cache.archive = entry;
    }
    const { res, root } = entry;
    out.append(el('dl', { class: 'facts' },
      api.fact('Holds', api.parts(plural(res.files, 'file'), plural(res.folders, 'folder'))),
      api.fact('Unpacked', api.parts(el('b', { text: fmtBytes(res.unpacked) }), `${fmtBytes(res.packed)} packed`)),
      res.locked ? api.fact('Locked', `${plural(res.locked, 'entry', 'entries')}, encrypted`) : null,
      res.escapes ? api.fact('Escapes', `${plural(res.escapes, 'name')} would land outside the folder if unpacked`) : null));
    if (res.partial) out.append(note(res.partial));
    if (!root.c.length) {
      out.append(note('It holds nothing: its directory lists no entries.'));
      return;
    }
    const top = topBySize(root.c, ARCHIVE_ROWS);
    out.append(api.sectionTitle('Top level', top.length < root.c.length ? `${fmtCount(top.length)} of ${fmtCount(root.c.length)}` : fmtCount(root.c.length)));
    out.append(el('div', { class: 'pv-rows' }, top.map((x) => {
      const mark = x.f & FLAG_LOCKED ? ' is-locked' : x.f & FLAG_ESCAPE ? ' is-escape' : '';
      const sw = x.d ? el('span', { class: `swatch is-dir${mark}` }) : el('span', { class: `swatch${mark}`, style: { background: cssHex(KINDS[x.k].color) } });
      return el('div', { class: 'item is-static' }, sw,
        el('span', {}, el('span', { class: 'nm', text: x.n }), el('span', { class: 'path', text: x.d ? `folder · ${plural(x.fc, 'file')}` : `changed ${fmtAge(x.m)}` }),
          x.f & FLAG_LOCKED ? el('span', { class: 'sr', text: ', locked' }) : null, x.f & FLAG_ESCAPE ? el('span', { class: 'sr', text: ', its name climbs out of the folder' }) : null),
        el('span', { class: 'fig', text: fmtBytes(x.s) }));
    })));
    if (root.c.length > top.length) out.append(note(`and ${fmtCount(root.c.length - top.length)} more`));
  }

  async function linkBody(node, out, ctx) {
    if (S.info.snapshot) {
      out.append(note(sentence('link', node, { info: { snapshot: true } })));
      return;
    }
    let st;
    try {
      st = await api.get('stat', { path: relPath(node) }, { signal: ctx.signal });
    } catch (err) {
      if (!ctx.alive() || err?.name === 'AbortError') return;
      out.append(note(`${why(err)}.`), tryAgain());
      return;
    }
    if (!ctx.alive()) return;
    const lt = linkTarget(relPath(node), st.link, { root: S.info.root, sep: S.info.sep });
    if (lt.unknown || lt.outside) {
      out.append(note(sentence('link', node, { info: { target: st.link, ...lt } })));
      return;
    }
    const target = await api.resolve(lt.rel).catch(() => null);
    if (!ctx.alive()) return;
    if (!target) {
      out.append(note(sentence('link', node, { info: { rel: lt.rel, missing: true } })));
      return;
    }
    const label = lt.rel || target.n;
    // Reading one of several, selecting the target would throw away the
    // selection gathered: offered, unavailable, with the reason (as Look inside).
    const off = ctx.sub.kind === 'peek' ? `it would replace the ${fmtCount(S.sel.size)} selected` : null;
    out.append(note(sentence('link', node, { info: { target: st.link, rel: lt.rel } })),
      el('div', { class: 'pv-actions' }, el('button', {
        class: 'btn btn-small', type: 'button', 'data-named': '', 'data-k': `link:${label}`, title: off ? `Unavailable: ${off}` : `Select ${label}`,
        'aria-disabled': off ? 'true' : 'false',
        onclick: () => {
          if (off) {
            api.say(`Select ${label} is unavailable: ${off}. Esc goes back to the list.`);
            return;
          }
          api.select(target);
          api.cursorTo(target);
          ui.pane.focus({ preventScroll: true });
        },
      }, icon('goThere'), `Select ${label}`, off ? el('span', { class: 'sr', text: `, unavailable: ${off}` }) : '')));
  }

  /* ---------- folders ---------- */

  /** The age section: one sentence of the strata and the typical age. */
  function ageSection(node) {
    let text;
    if (api.hostOf(node)) text = 'Inside an archive the age table is not kept.';
    else if (!S.ages) text = 'Found once the survey has finished.';
    else {
      const st = strataOf(S.ages, node);
      const said = st ? strataSentence(st, node) : '';
      const typical = typicalLine(S.ages, node);
      text = said ? `${said}${typical ? ` ${typical}.` : ''}` : 'Found once the survey has finished.';
    }
    return [api.sectionTitle('By age'), note(text)];
  }

  /**
   * A row that acts on its node (onPick) and keeps focus in the pane; with
   * no onPick, a row that only says (an entry of a folder read while
   * reading one of several, which choosing would replace).
   */
  function pickRow(node, second, onPick) {
    const sw = node.d ? el('span', { class: node.e ? 'swatch is-sealed' : 'swatch is-dir' }) : el('span', { class: 'swatch', style: { background: cssHex(KINDS[node.k].color) } });
    const parts = [sw, el('span', {}, el('span', { class: 'nm', text: node.n }), el('span', { class: 'path', text: second })), el('span', { class: 'fig', text: fmtBytes(node.s) })];
    if (!onPick) return el('div', { class: 'item is-static', 'data-k': relPath(node), title: api.relLabel(node) }, ...parts);
    return el('button', { class: 'item', type: 'button', 'data-k': relPath(node), title: api.relLabel(node), onclick: () => onPick(node) }, ...parts);
  }

  const ofRow = (node) => (node.d ? `folder · ${plural(node.fc, 'file')}` : `changed ${fmtAge(node.m)}`);

  function chooseRow(node) {
    api.select(node);
    api.cursorTo(node);
    ui.pane.focus({ preventScroll: true });
  }

  async function folderBody(node, out, ctx) {
    const surveying = S.scanning || (!S.survey && !api.regionMode());
    if (node.e) {
      out.append(note(sentence('sealed', node)));
      return;
    }
    const n = kids(node);
    if (!n) {
      out.append(note(surveying ? 'The survey is still running: these figures grow as folders are read.' : sentence('empty-folder', node)));
      return;
    }
    if (surveying) out.append(note('The survey is still running: these figures grow as folders are read.'));
    out.append(...api.composition(node, 'By kind'), ...ageSection(node));
    out.append(api.sectionTitle('Largest', `${fmtCount(Math.min(LARGEST, n))} of ${fmtCount(n)}`));
    const rows = el('div', { class: 'pv-rows' });
    out.append(rows);
    let dir = node;
    if (node.u) {
      rows.append(note('Reading its largest entries…'));
      try {
        dir = await api.ensure(node);
      } catch (err) {
        if (!ctx.alive()) return;
        rows.replaceChildren(note(`Its entries could not be read: ${why(err)}.`), tryAgain());
        return;
      }
      if (!ctx.alive() || !dir) return;
    }
    // Reading one of several, a row would replace the selection: it only says.
    const peeking = ctx.sub.kind === 'peek';
    rows.replaceChildren(...topBySize(dir.c, LARGEST).map((c) => pickRow(c, ofRow(c), peeking ? null : chooseRow)));
    if (dir.tail) out.append(note(`Its ${fmtCount(dir.c.length)} largest are held; the other ${fmtCount(dir.tail.n)}, ${fmtBytes(dir.tail.s)}, lie in its scree.`));
    if (peeking) out.append(note(`These rows only list while you read one of the ${fmtCount(S.sel.size)} selected, so the selection stays whole.`));
  }

  /* ---------- several ---------- */

  function severalBody(nodes, out) {
    const { rows, more, moreBytes } = selectionRows(nodes, SELECTION_ROWS);
    // The folder each is in, by name (the whole path is the row's title):
    // a path cut at its end would hide the part that tells them apart.
    out.append(el('div', { class: 'pv-rows' }, rows.map((x) => pickRow(x, x.p ? `in ${x.p.n}` : '/', (n) => startPeek(n, rows)))));
    if (more) out.append(note(`and ${fmtCount(more)} more, ${fmtBytes(moreBytes)}`));
  }

  /** Reads one of several while the selection stays whole. */
  function startPeek(node, rows) {
    peek = { node, rows };
    render();
    ui.pane.focus({ preventScroll: true });
    api.say(`${api.describe(node)}, ${fmtCount(rows.indexOf(node) + 1)} of ${fmtCount(rows.length)} selected`);
  }

  /** Back from one of several to the list, on the row read. */
  function back() {
    if (!peek) return;
    const node = peek.node;
    peek = null;
    render().then(() => {
      [...ui.pane.querySelectorAll('[data-k]')].find((x) => x.dataset.k === relPath(node))?.focus({ preventScroll: true });
    });
    api.say(`Back to the ${fmtCount(S.sel.size)} selected.`);
  }

  /* ---------- keys in the pane ---------- */

  /**
   * Steps to the previous or next item: of the selection while reading
   * one of several; else of the list the ledger shows, when it holds the
   * item (with nothing selected, the list itself); else of the item's
   * folder, in Contents' order.
   */
  async function step(to) {
    const sub = subject();
    if (sub.kind === 'peek') {
      const go = stepIndex(sub.among.length, sub.among.indexOf(sub.node), to);
      if (go.edge || go.missing) {
        api.say(go.edge === 'first' ? 'First item' : 'Last item');
        return;
      }
      const next = sub.among[go.j];
      peek = { node: next, rows: sub.among };
      queue();
      // Each step says what it is, as the first did (startPeek).
      api.say(`${api.describe(next)}, ${fmtCount(go.j + 1)} of ${fmtCount(sub.among.length)} selected`);
      return;
    }
    if (sub.kind === 'several') {
      const { rows } = selectionRows(sub.nodes, SELECTION_ROWS);
      if (rows.length) startPeek(to === -1 || to === 'last' ? rows.at(-1) : rows[0], rows);
      return;
    }
    const node = sub.node;
    const listShown = !$('ledger-list').hidden;
    const listed = listShown ? api.listItems() : [];
    const rel = relPath(node);
    const same = (x) => x === node || (x.ref && x.rel === rel);
    let items = null;
    if (sub.here) items = listShown ? listed : api.contentsOrder(S.focus);
    else if (listShown && listed.some(same)) items = listed;
    else if (node.p?.d) items = api.contentsOrder(node.p);
    if (!items) {
      api.say('Preview steps through the list the ledger shows, or the item\'s folder.');
      return;
    }
    if (!items.length) {
      api.say('Nothing is listed to step to.');
      return;
    }
    let j;
    if (sub.here) j = to === -1 || to === 'last' ? items.length - 1 : 0;
    else {
      const go = stepIndex(items.length, items.findIndex(same), to);
      if (go.edge || go.missing) {
        api.say(go.edge === 'first' ? 'First item' : go.edge === 'last' ? 'Last item' : `${node.n} is not in the list shown.`);
        return;
      }
      ({ j } = go);
    }
    let next = items[j];
    if (next?.ref) next = await api.resolveRow(next);
    if (!next) return;
    // From the list shown, the list keeps its place and only its cursor
    // moves; from a folder the ledger does not show, the ledger follows.
    api.select(next, { quiet: items === listed });
    api.cursorTo(next);
  }

  /** Whether row is wholly in the pane's view. */
  function inView(row) {
    const a = row.getBoundingClientRect();
    const b = ui.pane.getBoundingClientRect();
    return a.top >= b.top - 1 && a.bottom <= b.bottom + 1;
  }

  function onKey(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target;
    if (t instanceof Element && t.closest('audio, video')) return;
    const { pane } = ui;
    const to = STEPS[e.key];
    if (to !== undefined) {
      // The content's keys first: the pane scrolls while it can go further,
      // and the window's keys never hear it (Home would rise to the overview
      // and cancel the scroll).
      if (!e.repeat) held = null;
      if (t === pane && canScroll(pane, e.key)) {
        held = e.key;
        e.stopPropagation();
        return;
      }
      // A key held to scroll stops at the edge; pressed again, it steps.
      if (!(e.repeat && held === e.key)) step(to);
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      const down = e.key === 'ArrowDown';
      const rows = [...pane.querySelectorAll('.pv-rows button.item')];
      const row = t instanceof Element ? t.closest('.pv-rows button.item') : null;
      if (row) {
        // Between the rows; ↑ from the first goes back to the pane.
        const next = rows[rows.indexOf(row) + (down ? 1 : -1)];
        if (next) next.focus();
        else if (!down) pane.focus({ preventScroll: true });
      } else if (t === pane) {
        // From the pane to the first (↓) or last (↑) row once it is in view,
        // or once the pane cannot scroll that way; until then it scrolls.
        const target = down ? rows[0] : rows.at(-1);
        if (!target || (!inView(target) && canScroll(pane, down ? 'End' : 'Home'))) {
          e.stopPropagation();
          return;
        }
        target.focus();
      } else return;
    } else if (e.key === 'Enter') {
      if (t !== pane) return;
      const sub = subject();
      const node = shown(sub);
      // The folder you are in is where Enter would go: say what does work.
      if (sub.here) api.say(`You are in ${node.n}: ← → select its items one by one.`);
      else if (node) api.activate(node);
      else {
        // Several: Enter reads the first of them, the selection kept whole.
        const { rows } = selectionRows(sub.nodes, SELECTION_ROWS);
        if (rows.length) startPeek(rows[0], rows);
      }
    } else if (e.key === 'p' || e.key === 'P') {
      if (t instanceof Element && t.closest('.pv-rows button.item') && subject().kind === 'several') {
        const node = [...S.sel].find((x) => relPath(x) === t.closest('.item').dataset.k);
        if (node) openLook(node);
      } else openLook();
    } else return;
    e.preventDefault();
    e.stopPropagation();
  }

  /* ---------- the tab ---------- */

  function mount(host) {
    panelEl = host;
    const swatch = el('span', { class: 'swatch' });
    const kindWords = el('span', { class: 'pv-kind-words' });
    const nameEl = el('h3', { class: 'insp-name' });
    const whereWords = el('span', { class: 'pv-where-words' });
    const where = el('button', { class: 'pv-where', type: 'button', hidden: true, onclick: goWhere }, icon('up'), whereWords);
    const facts = el('p', { class: 'pv-facts' });
    const cut = el('p', { class: 'pv-cut', hidden: true });
    const peekText = el('span', { class: 'pv-peek-text' });
    const peekBar = el('div', { class: 'pv-peek', hidden: true }, peekText,
      el('button', { class: 'btn btn-small', type: 'button', title: 'Esc', onclick: back }, icon('up'), 'Back'));
    const wrapBtn = el('button', { class: 'btn btn-small', type: 'button', 'data-k': 'wrap', 'aria-pressed': String(wrap), onclick: toggleWrap }, 'Wrap lines');
    const lookBtn = el('button', { class: 'btn btn-small', type: 'button', 'data-k': 'look', title: 'P', onclick: () => openLook() }, icon('eye'), 'Quick look');
    const insideBtn = el('button', { class: 'btn btn-small', type: 'button', 'data-k': 'inside', title: 'I', onclick: lookInside }, icon('folder-open'), 'Look inside');
    const tools = el('div', { class: 'pv-tools', role: 'toolbar', 'aria-label': 'Preview tools', hidden: true }, wrapBtn, lookBtn, insideBtn);
    const help = el('p', { class: 'sr', id: 'pv-help', text: 'Left and Right arrows step to the previous and next item, Home and End to the first and last, once a long text is at its edge; Up and Down reach the rows; P opens Quick look; Enter opens it.' });
    const pane = el('div', { class: 'pv-pane', tabindex: '0', role: 'region', 'aria-label': 'Preview', 'aria-describedby': 'pv-help' });
    const foot = el('p', { class: 'pv-foot', 'aria-hidden': 'true' });
    ui = { swatch, kindWords, name: nameEl, where, whereWords, facts, cut, peekBar, peekText, tools, wrapBtn, lookBtn, insideBtn, pane, foot };
    host.append(
      el('div', { class: 'insp-title pv-head' }, el('div', { class: 'insp-kind' }, swatch, kindWords), nameEl, where, facts, cut),
      peekBar, tools, pane, help, foot);
    pane.addEventListener('keydown', onKey);
    // A wrapped text's chunks are sized for the pane's width: when it
    // changes (a breakpoint, the drawer), they are sized again, so End
    // still reaches the end and the scroll bar holds still.
    let width = 0;
    new ResizeObserver(() => {
      const w = pane.clientWidth;
      if (!w || w === width) return;
      width = w;
      if (wrap && textView?.isConnected && api.bTabShown('preview')) sizeChunks();
    }).observe(pane);
  }

  function show(_host, { focus = false } = {}) {
    if (!ui) return;
    render().then(() => {
      if (!focus) return;
      const sub = subject();
      api.say(sub.kind === 'several' ? `Preview: ${fmtCount(sub.nodes.length)} selected, ${fmtBytes(selectionBytes(S.sel))}` : `Preview: ${api.describe(sub.node)}`);
    });
    if (focus) ui.pane.focus({ preventScroll: true });
  }

  function hide() {
    pause();
  }

  /* ---------- registry entries ---------- */

  api.B_TABS.add({ id: 'preview', owner: OWNER, order: 20, label: 'Preview', icon: 'eye', mount, show, hide, focusTarget: () => ui?.pane });

  // Guide rows: Preview's keys act inside its pane, so they bind no key.
  const LOOK = 'Looking closer';
  api.KEYS.add({ id: 'preview-step', owner: OWNER, guide: [LOOK, '← →', 'In Preview: previous / next item'] });
  api.KEYS.add({ id: 'preview-ends', owner: OWNER, guide: [LOOK, 'Home  End', 'In Preview: first / last item, once the text is at its top / end'] });
  // P is Quick look's own row: "Quick look at the selected file, or at Preview's item".
  api.KEYS.add({ id: 'preview-back', owner: OWNER, guide: [LOOK, 'Esc', 'In Preview, reading one of several: back to the list'] });

  // Only while reading one of several with focus in Preview, so it never
  // takes Escape from anything else.
  api.ESCAPE.add({ id: 'preview-peek', order: 45, owner: OWNER, active: () => !!panelEl?.contains(document.activeElement) && subject().kind === 'peek', clear: back });

  api.COMMANDS.add({
    id: 'preview', owner: OWNER, section: 'Preview',
    // Worded so that "preview" finds Show Preview first; it runs whether
    // or not Preview is on screen (toggleWrap keeps the choice and says it).
    items: () => [{ label: wrap ? 'Stop wrapping long lines (Preview)' : 'Wrap long lines (Preview)', detail: 'Panel B', run: toggleWrap }],
  });

  // Each hook only schedules: the work happens once the arrows rest.
  api.AFTER_SELECT.add({
    id: 'preview', owner: OWNER,
    run: () => {
      peek = null;
      queue();
    },
  });
  // With nothing selected the summary follows the folder you are in; with
  // a selection only the head (its way back up) does.
  api.AFTER_FOCUS.add({
    id: 'preview', owner: OWNER,
    run: () => {
      if (!S.primary && S.sel.size <= 1) queue();
      else redrawHead();
    },
  });
  // An archive opened or closed changes Look inside's words; nothing else
  // here follows a layout, so this is one comparison per layout.
  let interiorHost = null;
  api.AFTER_LAYOUT.add({
    id: 'preview', owner: OWNER,
    run: () => {
      const host = S.interior?.host ?? null;
      if (host === interiorHost) return;
      interiorHost = host;
      redrawHead();
    },
  });
  api.AFTER_REFRESH.add({
    id: 'preview', owner: OWNER,
    run: () => {
      if (shownNode && !api.isAttached(shownNode)) {
        goneName = shownNode.n;
        shownNode = null;
        if (peek && !api.isAttached(peek.node)) peek = null;
      }
      queue();
    },
  });
  api.AFTER_SURVEY.add({
    id: 'preview', owner: OWNER,
    run: () => {
      surveys++;
      queue();
    },
  });

  // A sheet over the page (Quick look, the palette, a dialog) pauses
  // Preview: one reader at a time. Closing it draws what changed.
  const dlg = $('dialog');
  if (dlg) {
    new MutationObserver(() => {
      if (dlg.open) pause();
      else if (stale && api.bTabShown('preview')) queue();
    }).observe(dlg, { attributes: true, attributeFilter: ['open'] });
  }
}
