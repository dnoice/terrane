/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Archive Interiors (Terrane Edition - v1.1)
 *     - File Name: interior.js
 *     - Relative Path: web/js/interior.js
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
 *       Twins after a refresh are worked out from the folders read
 *       again and any new since (twinIndex, addTwins), not the whole
 *       tree; a whole walk only when a capped list loses a file. A
 *       Rescan all also forgets the file a change closed. plural comes
 *       from model.js.
 *     - 1.0.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] —
 *       Initial release.
 *
 * ✒ Description:
 *     Looks inside a zip archive without unpacking it. I reads the
 *     archive's directory through the service (GET /api/inside), hangs
 *     what it lists from the archive's file, and walls it in on the
 *     file's footprint: the folders and files it holds stand on the
 *     floor, read like any others, and nothing among them can be changed.
 *     Everything the chamber shows is also listed in Contents, summed in
 *     the inspector and said, so the route works without the 3D view.
 *
 * ✒ Key Features:
 *     - I opens a zip (or a jar, apk, whl and their kin): in the ledger
 *       list, the row the cursor is on; elsewhere, the selection. I
 *       again, or Escape once nothing is selected, closes it
 *     - The listing is read into a model of its own and only then hung
 *       from the archive's file, so no total in the tree changes
 *     - The chamber: four walls in the archive's lens colour around a
 *       floor that opens by distance like any folder (layout.js, through
 *       the inside layout option and an alias for the archive's root)
 *     - Twins: files in this directory with an entry's name and size;
 *       both sides are half-banded while it is open, and a selected twin
 *       is tied to the others in the archive kind's colour (relation set
 *       'twins', drawn by app.js). They are worked out again after every
 *       refresh, so a file that leaves stops being one and a copy that
 *       comes becomes one
 *     - Locked (encrypted) entries are hatched; names that would land
 *       outside the folder if unpacked are listed by their own name
 *     - Under the Age lens a closed mass inside keeps its newest change
 *       (app.js's paint) and its hover tip says so: the age table holds
 *       only the tree on disk
 *     - One lock: app.js's runOp refuses any change under the archive's
 *       path (S.interior.refuse) before anything reaches the service; the
 *       menu and the inspector show each change as unavailable, inside an
 *       archive
 *     - The archive changed on disk (its size or time differs from what
 *       was listed) or is gone: the interior closes and says so
 *     - "Look inside" in the menu and the inspector, unavailable in
 *       snapshot mode, and a Reading the world row for the walled floor
 *
 * ✒ Usage Instructions:
 *     Listed in features.js and installed by app.js. S.interior is null
 *     until an archive is open, then a frozen object: host (the file),
 *     root (what it lists; root.p is host), size and mtime (as listed),
 *     listing (the service's figures and sentences), twins and twinOf
 *     (Maps both ways), lock (the refusal sentence), chamber (the layout
 *     option), and refuse(body), twinsOf(node), styleOf(node) and
 *     rowMark(node), which app.js asks. A refresh the archive outlives
 *     replaces it with a new frozen object whose twins, twinOf, twin
 *     count, twinsOf and styleOf are worked out again; the rest is kept.
 *
 * ✒ Examples:
 *     I            look inside the selected zip; I again closes it
 *     graft(host, res.records)          -> the archive's root, hung from host
 *     findTwins(S.model.root, root)     -> { twins, twinOf }
 *     addTwins(dir, twinIndex(root), maps, { known, onlyNew: true })
 *     lockedBody({ type: 'rename', path: 'a/x.zip/x.zip/b' }, 'a/x.zip')
 *                                       -> true
 *
 * ✒ Other Important Information:
 *     - Dependencies: model.js (the model, flags, formatting), layout.js
 *       (BOX, STYLE); app.js's api: S, the registries, get, setFocus,
 *       relayout, refreshDirs, isAttached, hostOf, listCursor, el, fact,
 *       notice, say, itemButton, actionButton
 *     - Compatible platforms: any browser with ES2022 modules; the pure
 *       exports also run in Node 22.5+ (tools/interior-test.mjs)
 *     - Security: entry names are only ever data; nothing joins one to a
 *       path on disk, and no thumbnail, preview or stat is asked for one
 *     - Limitations: the zip family only; one archive open at a time; the
 *       search does not reach inside it; entry contents are not read
 * ----------------------------------------------------------------------------
 */

import { Model, FLAG_LINK, extOf, fmtBytes, fmtCount, plural, relPath } from './model.js';
import { BOX, STYLE } from './layout.js';

export const name = 'Interiors';

const OWNER = 'interiors';
/** Twins tied to one entry, at most; the duplicate ties keep the same bound. */
const TWIN_CAP = 40;
/** Rows of twins or escaping names an inspector section lists. */
const LIST_MAX = 8;

/** Entry flags from the archive reader (server/archive.mjs), above the scanner's 1, 2 and 4. */
export const FLAG_LOCKED = 8;
export const FLAG_ESCAPE = 16;

/** Name endings of the formats Terrane looks inside: zip and those built on it. */
export const ZIP_FAMILY = Object.freeze(['zip', 'jar', 'war', 'ear', 'apk', 'aab', 'whl', 'xpi', 'nupkg', 'vsix', 'ipa']);
const ZIP = new Set(ZIP_FAMILY);

/** A file Terrane can look inside, by its name. */
export const isZipFamily = (node) => !!node && !node.d && ZIP.has(extOf(node.n));


/**
 * Reads listing records (the scanner's shape) into a model of their own,
 * then hangs its root from host. Every total is summed before the graft,
 * so nothing rolls up into the file or the tree around it.
 */
export function graft(host, records) {
  const model = new Model(host.n);
  model.ingest(records, [], model.root);
  model.root.p = host;
  return model.root;
}

/**
 * Twins by name and size: for every file the archive lists, the files
 * anywhere in the tree under main with the same name and the same size.
 * An empty file or a link is no one's twin. The walk follows folders only,
 * so it never enters the archive itself. Returns { twins: Map(entry ->
 * files, at most cap each), twinOf: Map(file -> entries) }.
 */
export function findTwins(main, root, { cap = TWIN_CAP } = {}) {
  const index = twinIndex(root);
  const maps = { twins: new Map(), twinOf: new Map() };
  if (index.size) addTwins(main, index, maps, { cap });
  return maps;
}

/**
 * The archive's files by size, then by name: Map(size -> Map(name ->
 * entries)). Made once when it opens, since a listing never changes.
 */
export function twinIndex(root) {
  const bySize = new Map();
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    for (const ch of dir.c) {
      if (ch.d) stack.push(ch);
      else if (ch.s > 0 && !(ch.f & FLAG_LINK)) {
        let names = bySize.get(ch.s);
        if (!names) bySize.set(ch.s, (names = new Map()));
        const list = names.get(ch.n);
        if (list) list.push(ch);
        else names.set(ch.n, [ch]);
      }
    }
  }
  return bySize;
}

/**
 * Adds the twins of the files under start to maps ({ twins, twinOf }).
 * With known (a WeakSet), every folder walked is added to it, and with
 * onlyNew a child folder already in it is passed over: after a refresh
 * only the folders read again and the ones that came with them are
 * walked, not the whole tree.
 */
export function addTwins(start, index, maps, { cap = TWIN_CAP, known = null, onlyNew = false } = {}) {
  const { twins, twinOf } = maps;
  const walk = [start];
  known?.add(start);
  while (walk.length) {
    const dir = walk.pop();
    for (const ch of dir.c) {
      if (ch.d) {
        if (onlyNew && known?.has(ch)) continue;
        known?.add(ch);
        walk.push(ch);
        continue;
      }
      const entries = index.get(ch.s)?.get(ch.n);
      if (!entries || ch.f & FLAG_LINK) continue;
      twinOf.set(ch, entries);
      for (const e of entries) {
        const list = twins.get(e);
        if (!list) twins.set(e, [ch]);
        else if (list.length < cap) list.push(ch);
      }
    }
  }
  return maps;
}

/**
 * Whether an operation's body names a path inside the archive at hostRel:
 * path, parent, dest or any of paths under hostRel + '/'. The archive's
 * own file is not inside it.
 */
export function lockedBody(body, hostRel) {
  if (!body || typeof body !== 'object' || !hostRel) return false;
  const under = `${hostRel}/`;
  const paths = [body.path, body.parent, body.dest, ...(Array.isArray(body.paths) ? body.paths : [])];
  return paths.some((p) => typeof p === 'string' && p.startsWith(under));
}

/** The one sentence that refuses a change inside an archive. */
export const lockSentence = (archive) => `Nothing inside ${archive} can be changed, opened or revealed: Terrane reads an archive's directory without unpacking it.`;

/** Said when the archive's size or time is no longer what was listed. */
export const changedSentence = (archive) => `${archive} changed on disk, so its interior was closed. Press I to read it again.`;

/**
 * What opening an archive found, in sentences: what it holds, how much of
 * it is already in this directory, and what is locked or would escape.
 * listing is { name, files, folders, unpacked, twins, locked, escapes,
 * escaped }.
 */
export function openSentence(listing) {
  const { name: archive, files, folders, unpacked, twins = 0, locked = 0, escapes = 0, escaped = [] } = listing;
  let s;
  if (!files) s = `${archive} holds no files${folders ? `, only ${plural(folders, 'folder', 'folders')}` : ''}.`;
  else {
    s = `${archive} holds ${plural(files, 'file', 'files')}${folders ? ` in ${plural(folders, 'folder', 'folders')}` : ''}, ${fmtBytes(unpacked)} unpacked; `;
    s += twins ? `${fmtCount(twins)} of them ${twins === 1 ? 'is' : 'are'} already in this directory, by name and size.`
      : 'none of them is already in this directory by name and size.';
  }
  if (locked) s += ` ${plural(locked, 'entry is', 'entries are')} locked (encrypted).`;
  if (escapes) {
    const shown = escaped.map((e) => (e.at ? `${e.name} (shown as ${e.at})` : e.name));
    s += ` ${plural(escapes, 'entry has a name', 'entries have names')} that would land outside the folder if unpacked: ${shown.join(', ')}${escapes > shown.length ? ', and more' : ''}.`;
  }
  return s;
}

/* ====================================================================== */
/* the feature                                                            */
/* ====================================================================== */

export function install(api) {
  const { S, el, fact } = api;
  /** { host } while a listing is being read; Escape forgets it. */
  let opening = null;
  /** The file a change on disk closed, which I reads again while it is selected. */
  let again = null;

  const under = (node, root) => {
    for (let a = node; a; a = a.p) if (a === root) return true;
    return false;
  };

  /** Why host cannot be looked inside, as a sentence; null when it can. */
  function refusal(host) {
    if (S.info.snapshot) return 'Looking inside an archive is not available in snapshot mode: a snapshot holds names, sizes and dates, not what a file contains.';
    if (api.hostOf(host)) return `${host.n} is inside ${S.interior.host.n}, and Terrane does not look inside an archive within an archive.`;
    if (host.f & FLAG_LINK) return `${host.n} is a symbolic link, and Terrane shows links without following them.`;
    if (!isZipFamily(host)) return `Terrane looks inside zip archives and the formats built on them (${ZIP_FAMILY.slice(1, 7).join(', ')} and more); ${host.n} is not one.`;
    return null;
  }

  /** Why "Look inside" is unavailable, in a few words; null when it is not. */
  const unavailable = (host) => (S.info.snapshot ? 'snapshot mode' : host.f & FLAG_LINK ? 'a symbolic link' : null);

  /* ---------- opening and closing ---------- */

  /**
   * Twins against the whole tree: the archive's index is made once and
   * kept with the open archive (work.index), with the folders walked
   * (work.known).
   */
  function allTwins(I) {
    const { index } = I.work;
    const maps = { twins: new Map(), twinOf: new Map() };
    const known = new WeakSet();
    if (index.size) addTwins(S.model.root, index, maps, { known });
    // work is a holder the frozen copies share: the index never changes,
    // and the folders walked are those of the latest whole walk.
    I.work.known = known;
    return maps;
  }

  /**
   * Twins after a refresh that read dirs again: a twin no longer in the
   * tree, or among those folders' own files, is dropped, and those
   * folders' files and any folder new since are matched again. The rest
   * of the tree is not walked. When a list at its cap loses a file, one
   * past the cap may now belong, so the tree is walked whole.
   */
  function againAfter(I, dirs) {
    const { index, known } = I.work;
    const twins = new Map([...I.twins].map(([e, list]) => [e, [...list]]));
    const twinOf = new Map(I.twinOf);
    let capped = false;
    for (const [file, entries] of twinOf) {
      if (!dirs.has(file.p) && api.isAttached(file)) continue;
      twinOf.delete(file);
      for (const e of entries) {
        const list = twins.get(e);
        const at = list ? list.indexOf(file) : -1;
        if (at < 0) continue;
        if (list.length >= TWIN_CAP) capped = true;
        list.splice(at, 1);
        if (!list.length) twins.delete(e);
      }
    }
    if (capped) return allTwins(I);
    const maps = { twins, twinOf };
    if (index.size) for (const dir of dirs) if (dir.d && api.isAttached(dir) && !api.hostOf(dir)) addTwins(dir, index, maps, { known, onlyNew: true });
    return maps;
  }

  /**
   * The open archive as S.interior holds it, frozen, with its twins worked
   * out against the tree as it is now: twins, twinOf, the listing's twin
   * count, twinsOf and styleOf. Everything else in I is kept as it is,
   * the chamber's wall keys included, so the layout does not see a new
   * archive. Called on opening and after every refresh it outlives.
   */
  function withTwins(I, dirs = null) {
    const { twins, twinOf } = dirs ? againAfter(I, dirs) : allTwins(I);
    const { root } = I;
    return Object.freeze({
      ...I,
      listing: Object.freeze({ ...I.listing, twins: twins.size }),
      twins, twinOf,
      twinsOf: (node) => twins.get(node) || twinOf.get(node) || null,
      // Locked entries are hatched; twins, inside and out, half-banded.
      styleOf: (node) => {
        if (node.f & FLAG_LOCKED && under(node, root)) return STYLE.HATCH;
        return twins.has(node) || twinOf.has(node) ? STYLE.HALF_BANDS : null;
      },
    });
  }

  async function open(host) {
    const why = refusal(host);
    if (why) {
      api.notice(why, { kind: 'info' });
      return;
    }
    if (S.interior?.host === host) {
      api.setFocus(S.interior.root);
      return;
    }
    if (opening) {
      api.say(`Still reading ${opening.host.n}.`);
      return;
    }
    const mine = { host };
    opening = mine;
    again = null;
    api.say(`Reading ${host.n}…`);
    let res;
    try {
      res = await api.get('inside', { path: relPath(host) });
    } catch (err) {
      if (opening === mine) {
        opening = null;
        api.notice(err.message, { kind: 'error' });
      }
      return;
    }
    // Escape stopped it, or a Rescan all began meanwhile.
    if (opening !== mine) return;
    opening = null;
    if (S.scanning || !api.isAttached(host)) {
      api.notice(`${host.n} is no longer where it was, so it was not opened.`, { kind: 'info' });
      return;
    }
    if (S.interior) close('replaced');
    const root = graft(host, res.records);
    const lock = lockSentence(host.n);
    S.interior = withTwins({
      host, root, size: res.size, mtime: res.mtime, lock, work: { index: twinIndex(root), known: null },
      listing: {
        name: host.n, files: res.files, folders: res.folders, unpacked: res.unpacked, packed: res.packed,
        locked: res.locked, escapes: res.escapes, escaped: res.escaped || [], renamed: res.renamed, partial: res.partial || null,
      },
      chamber: Object.freeze({ host, root, walls: Object.freeze(['north', 'south', 'west', 'east'].map((wall) => ({ wall }))) }),
      refuse: (body) => (lockedBody(body, relPath(host)) ? lock : null),
      rowMark: (node) => {
        if (!(node.f & (FLAG_LOCKED | FLAG_ESCAPE)) || !under(node, root)) return null;
        return node.f & FLAG_LOCKED ? { cls: 'is-locked', sr: ', locked' } : { cls: 'is-escape', sr: ', its name climbs out of the folder' };
      },
    });
    const { listing } = S.interior;
    S.tab = 'contents';
    api.setFocus(root);
    api.drawLedger();
    const said = openSentence(listing);
    api.notice(said, { kind: 'info', ms: 12000 });
    if (listing.partial) api.notice(listing.partial, { kind: 'info', ms: 15000 });
    api.say(`${said}${listing.partial ? ` ${listing.partial}` : ''} I again closes it.`);
    // The tree's copy of the file is older or newer than what was read:
    // its folder is read again, and the hook below compares once more.
    if (res.size !== host.s || res.mtime !== host.m) api.refreshDirs([relPath(host.p)]);
  }

  /**
   * Closes the open archive. how: 'closed' (I or Escape), 'changed' (its
   * size or time changed on disk), 'gone' (it is no longer where it was),
   * 'rescan' (Rescan all read a new tree), 'replaced' (another opens).
   */
  function close(how = 'closed') {
    const I = S.interior;
    if (!I) return;
    S.interior = null;
    const inI = (n) => !!n && under(n, I.root);
    for (const n of [...S.sel]) if (inI(n)) S.sel.delete(n);
    if (inI(S.primary)) S.primary = [...S.sel].at(-1) || null;
    S.trail = S.trail.filter((n) => !inI(n));
    const there = api.isAttached(I.host);
    if (inI(S.focus)) S.focus = there ? I.host.p : S.model.root;
    // The chain that held the archive open is let go.
    S.force = null;
    if (how === 'replaced') return;
    if (how === 'changed' && there) {
      // Selected, so I reads it again from where you are.
      if (!S.sel.size) {
        S.sel.add(I.host);
        S.primary = I.host;
      }
      if (S.primary === I.host) again = I.host;
    }
    api.relayout();
    api.drawAll();
    const archive = I.host.n;
    if (how === 'changed') {
      const text = changedSentence(archive);
      api.notice(text, { kind: 'info', ms: 12000 });
      api.say(text);
    } else if (how === 'gone') {
      const text = `${archive} is no longer where it was, so its interior was closed.`;
      api.notice(text, { kind: 'info' });
      api.say(text);
    } else if (how === 'rescan') api.say(`${archive} was closed: Rescan all read the directory again.`);
    else api.say(`${archive} is closed.`);
  }

  /**
   * I: opens the archive you are on, or closes the open one. In the
   * ledger you are on the row the cursor is on (Enter from Find puts it
   * on the first match); elsewhere, on the selection. After a change on
   * disk closed an archive, I reads it again while it is still selected.
   */
  function toggle(c) {
    const I = S.interior;
    if (!I && again && S.primary === again) {
      const host = again;
      again = null;
      return open(host);
    }
    const at = (c.inList ? api.listCursor() : null) || S.primary;
    if (I && (!at || at === I.host || api.hostOf(at))) return close('closed');
    if (at && !at.d) return open(at);
    if (I) return close('closed');
    api.notice('Select a zip archive, then press I to look inside it.', { kind: 'info' });
    return undefined;
  }

  /* ---------- the inspector ---------- */

  const note = (text) => el('p', { class: 'interior-note', text });
  const closeButton = (I) => api.actionButton(`Close ${I.host.n}`, () => close('closed'), { icon: 'x', wide: true, title: 'I, or Escape with nothing selected' });

  /** The open archive: what it holds, what is already here, what is locked or escapes. */
  function archiveSection(I, title) {
    const L = I.listing;
    const out = [
      el('div', { class: 'section-title', text: title }),
      el('dl', { class: 'facts interior-facts' },
        fact('Holds', `${plural(L.files, 'file', 'files')} · ${plural(L.folders, 'folder', 'folders')}`),
        fact('Unpacked', el('b', { text: fmtBytes(L.unpacked) }), ` · ${fmtBytes(L.packed)} packed`),
        fact('Already here', L.files ? `${fmtCount(L.twins)} of its files, by name and size` : 'no files to compare'),
        L.locked ? fact('Locked', `${plural(L.locked, 'entry', 'entries')}, encrypted`) : null,
        L.escapes ? fact('Escapes', `${plural(L.escapes, 'name', 'names')} would land outside the folder if unpacked`) : null),
    ];
    if (L.escaped.length) {
      out.push(el('ul', { class: 'interior-names', 'aria-label': 'Names that would land outside the folder' },
        L.escaped.slice(0, LIST_MAX).map((e) => el('li', {}, el('code', { text: e.name }), e.at ? ` shown as ${e.at}` : ''))));
    }
    if (L.partial) out.push(note(L.partial));
    out.push(note('What its directory lists, read without unpacking it. Nothing inside can be changed.'), el('div', { class: 'actions-grid' }, closeButton(I)));
    return out;
  }

  /** An entry: where it is in the archive, whether it is locked or escapes, and its twins here. */
  function entrySection(I, node) {
    const inner = [];
    for (let a = node; a && a !== I.root; a = a.p) inner.unshift(a.n);
    const out = [
      el('div', { class: 'section-title', text: `In ${I.host.n}` }),
      el('dl', { class: 'facts interior-facts' },
        fact('In the archive', el('code', { text: inner.join('/') || '/' })),
        node.f & FLAG_LOCKED ? fact('Locked', 'encrypted in the archive') : null,
        node.f & FLAG_ESCAPE ? fact('Its name', 'would land outside the folder if unpacked') : null),
    ];
    const tw = I.twins.get(node);
    if (tw) {
      out.push(el('div', { class: 'section-title', text: tw.length > LIST_MAX ? `Already in this directory · ${LIST_MAX} of ${fmtCount(tw.length)}` : 'Already in this directory' }),
        el('div', { class: 'interior-twins' }, tw.slice(0, LIST_MAX).map((f) => api.itemButton(f, fmtBytes(f.s)))));
    }
    out.push(note('An entry of the archive, as its directory lists it. Nothing here can be changed.'));
    return out;
  }

  /** A file in this directory with twins in the open archive. */
  function alsoInSection(I, node) {
    const entries = I.twinOf.get(node);
    return [
      el('div', { class: 'section-title', text: entries.length > LIST_MAX ? `Also in ${I.host.n} · ${LIST_MAX} of ${fmtCount(entries.length)}` : `Also in ${I.host.n}` }),
      el('div', { class: 'interior-twins' }, entries.slice(0, LIST_MAX).map((e) => api.itemButton(e, fmtBytes(e.s)))),
    ];
  }

  /** A zip that is not open: what Look inside does. */
  function closedSection(node) {
    return [
      el('div', { class: 'section-title', text: 'Archive' }),
      note('Look inside lists what its directory holds, as folders and files, without unpacking it.'),
      el('div', { class: 'actions-grid' }, api.actionButton('Look inside', () => open(node), { off: unavailable(node), icon: 'folder-open', wide: true, title: 'I' })),
    ];
  }

  /* ---------- registry entries ---------- */

  api.KEYS.add({ id: 'interior', owner: OWNER, keys: ['i'], run: (c) => { toggle(c); }, guide: ['Archives', 'I', 'Look inside a zip archive / close it'] });

  // After the selection (70): the first Escape clears it, the next closes.
  api.ESCAPE.add({
    id: 'interior', order: 80, owner: OWNER,
    active: () => !!S.interior || !!opening,
    clear: () => {
      if (opening) {
        api.say(`Stopped reading ${opening.host.n}.`);
        opening = null;
      } else close('closed');
    },
  });

  api.LAYOUT_OPTS.add({
    id: 'interior', order: 60, owner: OWNER,
    options: (o) => {
      const I = S.interior;
      if (!I) return null;
      return { inside: I.chamber, aliases: [...(o.aliases || []), [I.root, I.host]] };
    },
  });

  // The archive changed on disk, or is gone: what was listed no longer is.
  // Otherwise files in the tree may have come, gone or changed size, so
  // its twins are worked out again; app.js repaints after every refresh.
  api.AFTER_REFRESH.add({
    id: 'interior', owner: OWNER,
    run: (dirs) => {
      const I = S.interior;
      if (!I) return;
      if (!api.isAttached(I.host)) close('gone');
      else if (I.host.s !== I.size || I.host.m !== I.mtime) close('changed');
      else S.interior = withTwins(I, dirs instanceof Set ? dirs : null);
    },
  });

  // A Rescan all reads a new tree: the open archive closes, and the file a
  // change closed is of the old tree, so I no longer reads it again.
  api.AFTER_SURVEY.add({
    id: 'interior', order: 60, owner: OWNER,
    run: (_sv, { full } = {}) => {
      if (!full) return;
      again = null;
      if (S.interior) close('rescan');
    },
  });

  api.MENU.add({
    id: 'interior', order: 20, owner: OWNER,
    items: (node) => {
      const I = S.interior;
      const here = node || S.focus;
      if (I && (here === I.host || api.hostOf(here))) return [{ label: `Close ${I.host.n}`, icon: 'x', hint: 'I', run: () => close('closed') }];
      if (!node || !isZipFamily(node)) return null;
      const off = unavailable(node);
      return [{ label: 'Look inside', icon: 'folder-open', hint: 'I', run: () => open(node), disabled: !!off, reason: off || undefined }];
    },
  });

  api.INSPECTOR.node.add({
    id: 'interior', order: 15, owner: OWNER,
    build: (node) => {
      const I = S.interior;
      if (I && (node === I.host || node === I.root)) return archiveSection(I, `Inside ${I.host.n}`);
      if (I && api.hostOf(node)) return entrySection(I, node);
      if (I && I.twinOf.has(node)) return alsoInSection(I, node);
      return isZipFamily(node) ? closedSection(node) : null;
    },
  });
  api.INSPECTOR.focus.add({
    id: 'interior', order: 15, owner: OWNER,
    build: (f) => (S.interior && api.hostOf(f) ? archiveSection(S.interior, `Inside ${S.interior.host.n}`) : null),
  });

  api.TIP_LINES.add({
    id: 'interior', order: 70, owner: OWNER,
    lines: (node, c) => {
      const I = S.interior;
      if (!I || c.type === BOX.SCREE) return null;
      if (c.type === BOX.WALL) return [`The walls of ${I.host.n}: what its directory lists stands inside`, 'I, or Escape with nothing selected, closes it'];
      // The age table holds only the tree on disk (strata.js), so under the
      // Age lens a closed mass in here keeps its newest change (app.js).
      const aged = S.lens === 'age' && c.type === BOX.CAP && node.d && !node.e && node.c.length > 0;
      const AGE = 'Coloured by its newest change: typical ages are for folders on disk';
      if (node === I.root) return [`Inside ${I.host.n} · nothing here can be changed`, aged ? AGE : null];
      if (api.hostOf(node)) {
        const out = [];
        if (aged) out.push(AGE);
        if (node.f & FLAG_LOCKED) out.push('Locked: encrypted in the archive');
        if (node.f & FLAG_ESCAPE) out.push('Its name would land outside the folder if unpacked');
        const tw = I.twins.get(node);
        if (tw) out.push(`Already in this directory, by name and size${tw.length > 1 ? ` (${fmtCount(tw.length)} files)` : ''}`);
        return out;
      }
      return I.twinOf.has(node) ? `Also in ${I.host.n}, by name and size` : null;
    },
  });

  api.READING.add({
    id: 'interior', order: 65, owner: OWNER, glyph: 'g-chamber', title: 'Walled floor',
    text: 'A zip archive opened with I: what its directory lists, inside walls of the archive\'s colour. Hatched entries are locked; half-banded ones are already in this directory. Nothing inside can be changed.',
  });
}
