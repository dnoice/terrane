/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Remembered View and Links (Terrane Edition - v1.0)
 *     - File Name: resume.js
 *     - Relative Path: web/js/resume.js
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
 *     A reload comes back where you were: the folder, the lens, the tab,
 *     the selection and, with WebGL, where the eye stood. The address bar
 *     names the folder you are in, so a link or a bookmark opens Terrane
 *     there, and Copy link puts that address on the clipboard.
 *
 * ✒ Key Features:
 *     - Kept per directory in this browser (terrane.view.v1|<root>, a
 *       snapshot apart), saved a second after the folder or the selection
 *       changes, and when the page is hidden or left; the lens and the
 *       tab are read as it is saved
 *     - Inside an open archive the folder kept is the one that holds it,
 *       and no entry of the archive is kept in the selection; at most 500
 *       selected paths are kept
 *     - Put back once, after the first whole survey: the lens, the tab
 *       (not Findings, whose search is not kept), the folder and the
 *       selection, with a sentence saying so; with WebGL the eye returns
 *       to the same place relative to the folder's box, re-anchored once
 *       as the layout settles around it
 *     - The address: #/<folder>, percent-encoded, follows the folder you
 *       are in without adding history entries; a page opened at an
 *       address goes there instead of the kept folder, keeping only the
 *       lens when the two differ
 *     - Changing the address goes there: a folder is gone to, a file's
 *       folder is gone to and the file selected, and an address that
 *       names nothing says so and is put back
 *     - Copy link in the context menu (this folder, or a file's folder)
 *       and in the command palette (Copy link to here); the sentence names
 *       the folder and the address it works at
 *     - The address never reaches the service: the fragment is not sent,
 *       so no token or request is involved
 *     - A browser that refuses storage is said once; the address still
 *       follows the folder
 *
 * ✒ Usage Instructions:
 *     Listed in features.js and installed by app.js. Open
 *     http://127.0.0.1:4173/#/docs/2024 to start in docs/2024.
 *
 * ✒ Examples:
 *     a reload        Back where you were: 2024, 2 selected
 *     #/docs/x.md     goes to docs and selects x.md
 *     #/nowhere       Nothing at nowhere in projects.
 *     Copy link       Link copied. It opens 2024 while Terrane serves this
 *                     directory at 127.0.0.1:4173.
 *
 * ✒ Other Important Information:
 *     - Dependencies: memory.js (keys, the kept view, links), places.js
 *       (anchorOf, poseRelative, vantage); app.js's api: S, AFTER_SURVEY,
 *       AFTER_FOCUS, AFTER_SELECT, AFTER_LAYOUT, MENU, COMMANDS, TABS,
 *       setLens, setFocus, select, selectAll, forceOpen, relayout,
 *       drawLedger, hostOf, relPath, copyText, say, notice
 *     - Compatible platforms: any browser with ES2022 modules
 *     - Limitations: two tabs on one directory keep the view saved last;
 *       the address works only while Terrane serves this directory at
 *       this host and port; a file named in the address is selected, not
 *       opened
 * ----------------------------------------------------------------------------
 */

import { viewKey, readView, viewRecord, hashFor, relOfHash, MAX_SEL } from './memory.js';
import { anchorOf, poseRelative, vantage } from './places.js';

export const name = 'Remembered view';

const OWNER = 'resume';
const SAVE_MS = 1000;

/** The text of a hash for a sentence, decoded where it can be. */
const shown = (hash) => {
  const body = String(hash || '').replace(/^#\/?/, '');
  try {
    return decodeURIComponent(body) || '/';
  } catch {
    return body || '/';
  }
};

export function install(api) {
  const { S } = api;
  const key = viewKey(S.info.root, S.info.snapshot ? 'snapshot' : '');
  // The address the page was opened at, read before anything replaces it.
  let startHash = location.hash;
  let scheduled = false;
  let restored = false;
  let failed = false;
  let timer = 0;
  // The eye put back with WebGL, re-anchored once on the next layout.
  let reanchor = null;

  const store = () => window.localStorage;
  function fail(err) {
    if (failed) return;
    failed = true;
    const why = err?.name === 'QuotaExceededError' ? 'the storage is full' : err?.message || String(err);
    api.notice(`The view cannot be kept in this browser (${why}). A reload will start at the overview; the address still names the folder you are in.`, { kind: 'info', ms: 12000 });
  }

  /** The folder on disk for dir: inside an open archive, the folder that holds it. */
  const onDisk = (dir) => {
    const host = api.hostOf(dir);
    return host ? host.p : dir;
  };
  const find = (rel) => (rel === null || rel === undefined ? null : S.model.find(rel));
  const folderName = (d) => (d.p ? d.n : `${d.n} (the root)`);

  /* ---------- keeping the view ---------- */

  function record() {
    const dir = onDisk(S.focus);
    const sel = [];
    for (const n of S.sel) {
      if (sel.length >= MAX_SEL) break;
      if (!api.hostOf(n)) sel.push(api.relPath(n));
    }
    const primary = S.primary && !api.hostOf(S.primary) ? api.relPath(S.primary) : null;
    let pose = null;
    if (!S.noGL && S.layout) {
      const i = S.layout.index.get(dir);
      if (i !== undefined && i < S.view.n) pose = poseRelative(S.view.pose(), anchorOf(S.layout, i));
    }
    return viewRecord({ focus: api.relPath(dir), lens: S.lens, tab: S.tab, sel, primary, pose });
  }

  function save() {
    clearTimeout(timer);
    timer = 0;
    // Nothing is kept before the kept view has been put back: the page's
    // first moments would overwrite it.
    if (!restored || failed || !S.model || S.scanning) return;
    try {
      store().setItem(key, JSON.stringify(record()));
    } catch (err) {
      fail(err);
    }
  }

  function queueSave() {
    if (!restored) return;
    clearTimeout(timer);
    timer = setTimeout(save, SAVE_MS);
  }

  /** The address follows the folder you are in, replacing the entry (no history). */
  function setHash(dir) {
    if (!restored || !dir) return;
    const h = hashFor(api.relPath(onDisk(dir)));
    if (location.hash === h) return;
    try {
      history.replaceState(history.state, '', h);
    } catch { /* a sandboxed page keeps its address */ }
  }

  /* ---------- putting it back ---------- */

  /** Goes to dir; with WebGL and a pose, puts the eye back where it stood relative to the folder's box. */
  function goTo(dir, pose) {
    if (!S.noGL && pose && S.layout) {
      if (dir.p) api.forceOpen(dir);
      api.relayout({ animate: false });
      const i = S.layout.index.get(dir);
      if (i !== undefined && i < S.view.n) {
        S.view.flyTo(vantage(pose, anchorOf(S.layout, i)), 0);
        reanchor = { dir, pose };
        return;
      }
    }
    if (dir !== S.focus) api.setFocus(dir, { remember: false });
  }

  /** Goes where an address points: a folder, or a file's folder with the file selected. */
  function follow(node) {
    if (node.d) {
      if (node !== S.focus) api.setFocus(node);
      return;
    }
    if (node.p !== S.focus) api.setFocus(node.p);
    api.select(node);
  }

  function restore() {
    if (restored) return;
    restored = true;
    let view = null;
    try {
      view = readView(store().getItem(key));
    } catch (err) {
      fail(err);
    }
    const hash = startHash && startHash !== '#' ? startHash : '';
    const rel = hash ? relOfHash(hash) : null;
    const named = hash ? find(rel) : null;
    if (hash && !named) api.notice(`Nothing at ${rel ?? shown(hash)} in ${S.model.root.n}.`, { kind: 'info' });
    const kept = view ? find(view.focus) : null;
    const dir = kept?.d ? kept : null;
    // An address that names another place wins; only the lens comes back.
    if (named && !(named.d && named === dir)) {
      if (view) api.setLens(view.lens);
      follow(named);
      setHash(S.focus);
      return;
    }
    if (!view) {
      setHash(S.focus);
      return;
    }
    api.setLens(view.lens);
    if (view.tab !== 'findings' && api.TABS.get(view.tab)) S.tab = view.tab;
    if (dir) goTo(dir, view.pose);
    const sel = view.sel.map(find).filter(Boolean);
    const primary = view.primary ? find(view.primary) : null;
    if (sel.length) api.selectAll(sel, primary);
    else api.drawLedger();
    setHash(dir || S.focus);
    api.say(`Back where you were: ${folderName(dir || S.model.root)}, ${sel.length} selected`);
  }

  /* ---------- registry entries and listeners ---------- */

  // Once, after the first whole survey (and after the page has laid it
  // out and drawn it): the kept view, or the address, is put back.
  api.AFTER_SURVEY.add({
    id: 'resume', order: 80, owner: OWNER,
    run: (_sv, { full }) => {
      if (!full || scheduled) return;
      scheduled = true;
      setTimeout(restore, 0);
    },
  });

  api.AFTER_FOCUS.add({
    id: 'resume', owner: OWNER,
    run: (dir) => {
      setHash(dir);
      queueSave();
    },
  });
  api.AFTER_SELECT.add({ id: 'resume', owner: OWNER, run: () => queueSave() });

  // The layout settles around the eye put back: one re-anchor onto where
  // the folder's box is now.
  api.AFTER_LAYOUT.add({
    id: 'resume', owner: OWNER,
    run: (L) => {
      if (!reanchor) return;
      const { dir, pose } = reanchor;
      reanchor = null;
      if (S.view.flight || S.view.keys?.size) return;
      const i = L.index.get(dir);
      if (i !== undefined && i < S.view.n) S.view.flyTo(vantage(pose, anchorOf(L, i)), 0);
    },
  });

  window.addEventListener('pagehide', save);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') save();
  });

  window.addEventListener('hashchange', () => {
    // Before the survey is done the address is read when it is.
    if (!restored) {
      startHash = location.hash;
      return;
    }
    const rel = relOfHash(location.hash);
    const node = find(rel);
    if (!node) {
      api.notice(`Nothing at ${rel ?? shown(location.hash)} in ${S.model.root.n}.`, { kind: 'info' });
      setHash(S.focus);
      return;
    }
    follow(node);
  });

  /* ---------- Copy link ---------- */

  const linkTo = (dir) => `${location.origin}${location.pathname}${hashFor(api.relPath(dir))}`;
  function copyLink(from) {
    const dir = onDisk(from);
    const link = linkTo(dir);
    api.copyText(link, `Link copied. It opens ${folderName(dir)} while Terrane serves this directory at ${location.host}.`, `The link is ${link}`);
  }

  api.MENU.add({
    id: 'resume', owner: OWNER,
    items: (node) => {
      if (!node || node.d) return [{ label: 'Copy link to this folder', icon: 'copyPath', run: () => copyLink(node || S.focus) }];
      return [{ label: 'Copy link to its folder', icon: 'copyPath', run: () => copyLink(node.p?.d ? node.p : S.focus) }];
    },
  });

  api.COMMANDS.add({
    id: 'resume', owner: OWNER, section: 'Links',
    items: () => [{ label: 'Copy link to here', detail: api.relPath(onDisk(S.focus)) || '/', run: () => copyLink(S.focus) }],
  });
}
