/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Quick Look (Terrane Edition - v1.0)
 *     - File Name: quicklook.js
 *     - Relative Path: web/js/quicklook.js
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
 *     P opens a large sheet over the page that shows the selected file:
 *     its text with line numbers, its picture, or its sound or film, with
 *     the facts above. The arrows step through the files of the list shown
 *     without closing it, so a folder or a search can be looked through
 *     one file after another before anything is opened or changed.
 *
 * ✒ Key Features:
 *     - P (owner quicklook) while the world or the ledger list has focus,
 *       an inspector button and the command palette open it; P or Escape
 *       closes it and focus goes back to the list or the world
 *     - The head: name, kind, size, the last change and where the file
 *       stands, such as "3 of 41 files in Contents" (or in Findings)
 *     - Text (the code and data kinds and the text extensions): the first
 *       256 KB in one scroll container, a gutter of line numbers beside a
 *       pre; "First 256 KB of 2.4 MB" when the service cut it; a NUL in
 *       what came back reads as binary content
 *     - Pictures by the image discipline: the 480 px thumbnail, else the
 *       file itself only when it is 2 MB or less, not an SVG and not a
 *       snapshot; else the inspector's sentences. Never a larger original,
 *       and no neighbour is fetched ahead
 *     - Audio and video in the browser's own player (preload metadata, no
 *       autoplay), fetched in byte ranges; one that will not play says so
 *     - Snapshot mode, links, an archive's entries and any other kind:
 *       the facts and a sentence; an archive entry is never fetched
 *     - ArrowLeft and ArrowRight step to the previous and next file of the
 *       list shown, Home and End to the first and last; each step aborts
 *       the last read, stops the last player, selects the file, moves the
 *       list's cursor to it and says what it is; at an end it says so
 *     - The content's keys come first: a player seeks with them, and the
 *       body scrolls with them while it can go further that way (the
 *       arrows sideways, Home and End up and down), so a long line or a
 *       long text is read to its edge before the next press steps; a key
 *       held to scroll stops at the edge
 *
 * ✒ Usage Instructions:
 *     Listed in features.js and installed by app.js. Select a file in the
 *     world or the list and press P (single keys act while the world or
 *     the list has focus, or anywhere once the guide's setting says so).
 *
 * ✒ Examples:
 *     P on README.md          the text, its lines numbered
 *     → in the sheet          the next file in Contents, selected
 *     → on a long line        scrolls it; at its right edge, the next file
 *     P on bulk-write         Quick look shows files. bulk-write is a folder.
 *
 * ✒ Other Important Information:
 *     - Dependencies: ui.js (openSheet), thumbs.js, icons.js, model.js
 *       (KINDS, FLAG_LINK, IMAGE_EXT, TEXT_EXT, formatting), theme.js
 *       (cssHex); app.js's api: S, KEYS, INSPECTOR, rawUrl, listItems,
 *       cursorTo, select, hostOf, relPath, absPath, describe, say, el,
 *       actionButton; the service's /api/raw with byte ranges
 *     - Compatible platforms: any browser with ES2022 modules and the
 *       dialog element; whether a film plays depends on the browser's
 *       codecs, and the sheet says so when it does not
 *     - Performance: one request per file shown, aborted on the next step;
 *       a player's stream is emptied before the next file loads
 * ----------------------------------------------------------------------------
 */

import { openSheet } from './ui.js';
import { thumbs } from './thumbs.js';
import { icon } from './icons.js';
import { KINDS, FLAG_LINK, IMAGE_EXT, TEXT_EXT, extOf, fmtAge, fmtBytes, fmtCount, fmtDate } from './model.js';
import { cssHex } from './theme.js';

export const name = 'Quick look';

const OWNER = 'quicklook';
/** The most of a text file the sheet reads: the service's own default. */
const TEXT_MAX = 262144;
/** A picture with no thumbnail is shown from the file only up to this size, as the inspector does. */
const RAW_IMAGE_MAX = 2 * 1024 * 1024;
const AUDIO_EXT = new Set(['mp3', 'm4a', 'aac', 'wav', 'flac', 'ogg', 'oga', 'opus']);
const VIDEO_EXT = new Set(['mp4', 'm4v', 'webm', 'mov', 'ogv']);

/** Lines in a text, a final newline ending the last one rather than starting another. */
const countLines = (text) => (text ? text.split('\n').length - (text.endsWith('\n') ? 1 : 0) : 0);

/** The keys that step through the list, and where each goes. */
const STEPS = { ArrowLeft: -1, ArrowRight: 1, Home: 'first', End: 'last' };

/**
 * Whether the body can still scroll the way a key scrolls it: the arrows
 * sideways, Home and End up and down, as a focused scroll region does.
 */
function canScroll(pane, key) {
  if (key === 'ArrowLeft') return pane.scrollLeft > 0;
  if (key === 'ArrowRight') return pane.scrollLeft + pane.clientWidth < pane.scrollWidth - 1;
  if (key === 'Home') return pane.scrollTop > 0;
  if (key === 'End') return pane.scrollTop + pane.clientHeight < pane.scrollHeight - 1;
  return false;
}

export function install(api) {
  const { S, el } = api;
  const $ = (id) => document.getElementById(id);

  // The open sheet: { sheet, node, pane, parts, abort, media }, or null.
  let look = null;
  // The step key last left to the body to scroll with, while it is held.
  let held = null;

  /* ---------- what is shown, and where it stands ---------- */

  /** The files of the list shown (Contents or Findings), or null while the ledger shows another tab. */
  function listed() {
    if ($('ledger-list').hidden) return null;
    return api.listItems().filter((n) => !n.d);
  }

  function position(node) {
    const files = listed();
    const i = files ? files.indexOf(node) : -1;
    if (i < 0) return '';
    const tab = S.tab === 'findings' ? 'Findings' : 'Contents';
    return `${fmtCount(i + 1)} of ${fmtCount(files.length)} file${files.length === 1 ? '' : 's'} in ${tab}`;
  }

  /** What the sheet shows for a file: text, image, audio, video, or facts with a sentence why. */
  function kindOf(node) {
    const ext = extOf(node.n);
    const host = api.hostOf(node);
    if (host) return { as: 'facts', why: `An entry of ${host.n}. Quick look does not read inside an archive, so nothing in it is fetched.` };
    if (node.f & FLAG_LINK) return { as: 'facts', why: 'A symbolic link. Quick look does not follow it; the inspector says where it points.' };
    if (node.s <= 0) return { as: 'facts', why: 'An empty file: there is nothing to show.' };
    if (IMAGE_EXT.has(ext)) return { as: 'image' };
    if (S.info.snapshot) return { as: 'facts', why: 'Snapshot mode holds names, sizes and dates, not contents.' };
    if (VIDEO_EXT.has(ext)) return { as: 'video' };
    if (AUDIO_EXT.has(ext)) return { as: 'audio' };
    if (node.k === 0 || node.k === 6 || TEXT_EXT.has(ext)) return { as: 'text' };
    return { as: 'facts', why: `${KINDS[node.k].label}: Quick look shows text, pictures, sound and film. Open hands this file to its own application.` };
  }

  const note = (text) => el('p', { class: 'look-note', text });

  /* ---------- bodies ---------- */

  function showText(node, pane) {
    const ac = new AbortController();
    look.abort = ac;
    pane.replaceChildren(note('Reading…'));
    fetch(api.rawUrl(node, TEXT_MAX), { signal: ac.signal })
      .then(async (r) => {
        if (!r.ok) {
          let why = `the service answered ${r.status}`;
          try {
            why = (await r.json()).message || why;
          } catch { /* not json */ }
          throw new Error(why);
        }
        return { cut: r.headers.get('X-Terrane-Truncated') === '1', text: await r.text() };
      })
      .then(({ cut, text }) => {
        if (ac.signal.aborted || look?.node !== node) return;
        if (text.includes('\u0000')) {
          pane.replaceChildren(note('Binary content: no text preview.'));
          return;
        }
        const lines = countLines(text);
        const numbers = [];
        for (let i = 1; i <= lines; i++) numbers.push(i);
        pane.classList.add('is-text');
        pane.replaceChildren(el('div', { class: 'look-gutter', 'aria-hidden': 'true', text: numbers.join('\n') }), el('pre', { class: 'look-text', text }));
        look.parts.cut.textContent = cut ? `First 256 KB of ${fmtBytes(node.s)}` : '';
        look.parts.cut.hidden = !cut;
      })
      .catch((err) => {
        if (ac.signal.aborted || look?.node !== node) return;
        pane.replaceChildren(note(`This file could not be read: ${err.message}.`));
      });
  }

  function showImage(node, pane) {
    const rel = api.relPath(node);
    const t = thumbs.info(rel);
    const ext = extOf(node.n);
    // Thumbnails only, or the file itself when it is small: an original can be hundreds of megabytes.
    let img = thumbs.img(rel, 480, node.n);
    if (!img && !S.info.snapshot && node.s <= RAW_IMAGE_MAX && ext !== 'svg') {
      img = el('img', { src: api.rawUrl(node, RAW_IMAGE_MAX), alt: node.n, decoding: 'async', draggable: 'false' });
    }
    if (img) {
      img.removeAttribute('loading');
      img.addEventListener('error', () => {
        if (look?.node === node) pane.replaceChildren(note('This file could not be read as an image.'));
      });
      pane.classList.add('is-picture');
      pane.replaceChildren(img);
      if (t?.w) look.parts.facts.textContent += ` · ${fmtCount(t.w)} × ${fmtCount(t.h)} px`;
      return;
    }
    const why = t?.status === 'huge' ? 'Too large to thumbnail in the normal pass. npm run thumbs -- --huge makes one.'
      : t?.status === 'heavy-svg' ? 'Heavy vector art. npm run thumbs -- --heavy-svg renders it.'
        : t?.status === 'error' ? 'This file could not be read as an image.'
          : 'No thumbnail yet. npm run thumbs makes one.';
    pane.replaceChildren(note(why));
  }

  function showMedia(node, pane, tag) {
    const m = el(tag, { controls: true, preload: 'metadata', src: api.rawUrl(node, 0), 'aria-label': node.n });
    m.addEventListener('error', () => {
      if (look?.media !== m) return;
      stopMedia();
      pane.replaceChildren(note('This file could not be played here.'));
    });
    look.media = m;
    pane.classList.add('is-media');
    pane.replaceChildren(m);
  }

  function showFacts(node, pane, why) {
    const row = (dt, ...dd) => el('div', {}, el('dt', { text: dt }), el('dd', {}, ...dd));
    pane.classList.add('is-facts');
    pane.replaceChildren(el('div', { class: 'look-about' },
      el('p', { class: 'look-why', text: why }),
      el('dl', { class: 'facts' },
        row('Path', el('code', { text: api.absPath(node) })),
        row('Size', `${fmtBytes(node.s)}${node.s >= 1024 ? ` · ${fmtCount(node.s)} B` : ''}`),
        row('Changed', fmtDate(node.m), el('br'), fmtAge(node.m)))));
  }

  /* ---------- the sheet ---------- */

  function stopMedia() {
    const m = look?.media;
    if (!m) return;
    look.media = null;
    m.pause();
    m.removeAttribute('src');
    m.load();
  }

  /** Stops whatever the last file left running: its read and its player. */
  function stop() {
    look?.abort?.abort();
    if (look) look.abort = null;
    stopMedia();
  }

  /** Shows node in the open sheet. */
  function show(node) {
    stop();
    look.node = node;
    const { parts, pane } = look;
    const ext = extOf(node.n);
    parts.swatch.style.background = cssHex(KINDS[node.k].color);
    parts.name.textContent = node.n;
    parts.facts.textContent = `${KINDS[node.k].label}${ext ? ` · .${ext}` : ''} · ${fmtBytes(node.s)} · changed ${fmtDate(node.m)}`;
    parts.where.textContent = position(node);
    parts.where.hidden = !parts.where.textContent;
    parts.cut.textContent = '';
    parts.cut.hidden = true;
    $('dialog').setAttribute('aria-label', `Quick look: ${node.n}`);
    pane.className = 'look-body';
    pane.setAttribute('aria-label', `Contents of ${node.n}`);
    pane.scrollTop = 0;
    pane.scrollLeft = 0;
    const k = kindOf(node);
    if (k.as === 'text') showText(node, pane);
    else if (k.as === 'image') showImage(node, pane);
    else if (k.as === 'audio' || k.as === 'video') showMedia(node, pane, k.as);
    else showFacts(node, pane, k.why);
  }

  /** Steps to the previous (-1) or next (1) file of the list shown, or to its 'first' or 'last'. */
  function step(to) {
    const files = listed();
    if (!files?.length) {
      api.say('Quick look steps through the files of the list shown, in Contents or Findings.');
      return;
    }
    const i = files.indexOf(look.node);
    let j;
    if (to === 'first') j = 0;
    else if (to === 'last') j = files.length - 1;
    else if (i < 0) {
      api.say(`${look.node.n} is not in the list shown. Home and End go to its first and last file.`);
      return;
    } else j = i + to;
    // At an end, or Home and End where it already is: say which end.
    if (j < 0 || j >= files.length || j === i) {
      api.say(j < 0 || to === 'first' || (to !== 'last' && to < 0) ? 'First file' : 'Last file');
      return;
    }
    const next = files[j];
    api.select(next, { quiet: true });
    api.cursorTo(next);
    show(next);
    api.say(api.describe(next));
  }

  function close() {
    look?.sheet.close();
  }

  /** Opens the sheet on node, the selected file by default; a folder, or nothing, is said. */
  function open(node = S.primary) {
    if (!node || node.d) {
      api.say(`Quick look shows files. ${(node || S.focus).n} is a folder.`);
      return;
    }
    if (look) {
      show(node);
      return;
    }
    const parts = {
      swatch: el('span', { class: 'swatch' }),
      name: el('h2', { class: 'look-name' }),
      facts: el('p', { class: 'look-facts' }),
      where: el('p', { class: 'look-where' }),
      cut: el('p', { class: 'look-cut', hidden: true }),
    };
    const pane = el('div', { class: 'look-body', tabindex: '0', role: 'region' });
    const kbd = (text) => el('kbd', { text });
    look = { node: null, pane, parts, abort: null, media: null, sheet: null };
    look.sheet = openSheet((body) => {
      body.append(
        el('header', { class: 'look-head' },
          el('div', { class: 'look-title' }, parts.swatch, parts.name),
          el('button', { class: 'btn btn-small', type: 'button', title: 'Close (P or Esc)', onclick: close }, icon('close'), 'Close'),
          el('div', { class: 'look-meta' }, parts.facts, parts.where, parts.cut)),
        pane,
        el('p', { class: 'look-foot', 'aria-hidden': 'true' }, kbd('←'), kbd('→'), ' previous / next file · ', kbd('Home'), kbd('End'), ' first / last · ',
          kbd('P'), ' or ', kbd('Esc'), ' closes · a long text scrolls to its edge first; a player keeps its keys'));
    }, {
      className: 'is-look', label: `Quick look: ${node.n}`,
      onKey: (e) => {
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        const to = STEPS[e.key];
        if (to !== undefined) {
          // The content's keys first: a player seeks with them, and the
          // body scrolls with them while it can go further that way.
          if (e.target instanceof Element && e.target.closest('audio, video')) return;
          if (!e.repeat) held = null;
          if (e.target === pane && canScroll(pane, e.key)) {
            held = e.key;
            return;
          }
          // A key held to scroll stops at the edge rather than running on
          // through the files; pressed again, it steps.
          if (!(e.repeat && held === e.key)) step(to);
        } else if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') close();
        else return;
        e.preventDefault();
        e.stopPropagation();
      },
    });
    // However it closes (P, Escape, Close, another sheet taking the
    // dialog), the read and the player stop, and focus lands somewhere a
    // key works: back where it was, else the list or the world.
    $('dialog').addEventListener('close', () => {
      stop();
      look = null;
      const at = document.activeElement;
      if (!at || at === document.body || !at.isConnected) {
        const list = $('ledger-list');
        (list.hidden || !list.checkVisibility?.() ? $('view') : list).focus({ preventScroll: true });
      }
    }, { once: true });
    show(node);
    pane.focus({ preventScroll: true });
    api.say(`Quick look: ${api.describe(node)}`);
  }

  /* ---------- registry entries ---------- */

  api.KEYS.add({ id: 'quicklook', owner: OWNER, keys: ['p'], run: () => { open(); }, guide: ['Looking closer', 'P', 'Quick look at the selected file'] });

  api.INSPECTOR.node.add({
    id: 'quicklook', order: 62, owner: OWNER,
    build: (node) => (node.d ? null : el('div', { class: 'actions-grid look-action' }, api.actionButton('Quick look', () => open(node), { icon: 'eye', title: 'P', wide: true }))),
  });
}
