/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Landmarks (Terrane Edition - v1.0)
 *     - File Name: landmarks.js
 *     - Relative Path: web/js/landmarks.js
 *     - Artifact Type: javascript
 *     - Version: 1.0.0
 *     - Date: 11/13/2026
 *     - Update: Friday, November 13, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Description:
 *     Benchmarks and the return point. A benchmark measures a folder at a
 *     moment (bytes, files, folders and its largest entries), so later
 *     the world, the ledger and the inspector can say what changed in it,
 *     including what left it, which nothing else in Terrane remembers. The
 *     return point keeps where you stand, relative to the folder you are
 *     in, and J flies back to it.
 *
 * ✒ Key Features:
 *     - B measures the selection's folder, or the folder you are in, after
 *       re-reading it from disk; B on a benchmark measures it again; both
 *       are said in a notice with Undo. While a survey runs (the first, or
 *       a Rescan all) B is refused in words, and the Places, inspector and
 *       menu actions wait for it
 *     - Verdigris survey marks standing upright on the peak of the box that
 *       shows the folder, or on the mass or scree hiding it, in the shared
 *       pin mesh; up to 12 name-and-change tags outrank every other label
 *     - A Places tab: every benchmark with its change, missing ones with a
 *       sentence and Forget, entries gone, here now, grown and shrunk, Fly
 *       there, Measure again, Forget all, and the return point
 *     - An inspector Benchmark section for a folder (or Set benchmark),
 *       menu items, hover lines and an is:benchmark search word
 *     - One notice after the first scan names the benchmarks that changed
 *     - H marks a return point relative to the box of the folder you are
 *       in; J flies back to where that box is now, and swaps the two
 *       points so J again comes back; without WebGL, J goes to the folder
 *     - Terrane's own renames and moves carry benchmarks along, and so
 *       does what one finished before it stopped; Undo carries them back
 *       by the paths the service says it moved, after a reload too; a
 *       folder gone from outside is marked missing, with a notice and
 *       Forget, and never silently dropped; one Terrane removed to the
 *       holding area says so, and is found again when restored
 *     - Kept in this browser for this directory at this address; when the
 *       browser refuses, everything works until the tab closes, and a
 *       notice says so. Another tab's saves are merged in, not overwritten
 *     - In snapshot mode a measurement is of the snapshot, dated when it
 *       was taken, and kept apart from the live directory's benchmarks
 *
 * ✒ Usage Instructions:
 *     Listed in features.js and installed by app.js. S.places (also
 *     window.__terrane.places) is the store from places.js: benchmarks,
 *     ret (the return point), summary(b), detail(b).
 *
 * ✒ Examples:
 *     B        Benchmark set on "photos": 4.21 GB, 1,234 files, at 11/12/2026 14:03.
 *     B again  Benchmark on "photos" measured again: ... It was ...
 *     H        Return point marked in "photos". J returns to it; J again comes back.
 *     0, J     back over "photos", where its box is now
 *
 * ✒ Other Important Information:
 *     - Dependencies: places.js (the store), model.js (formatting),
 *       layout.js (BOX), theme.js (verdigris), ui.js (ask), icons.js;
 *       app.js's api: S, the registries, refreshDirs, relayout, reveal,
 *       setFocus, visibleIndexOf, drawPins, drawLedger, drawInspector,
 *       say, notice, el, fact, itemButton, actionButton
 *     - Compatible platforms: any browser with ES2022 modules
 *     - Wording: a measurement says what "changed"; an entry that was not
 *       there is "here now, not then", never "created" or "added"
 *     - Limitations: places live in this browser's storage for this
 *       directory, source (live or snapshot) and address; another port,
 *       browser or profile has its own. Two tabs that change the same
 *       benchmark within a second keep the one saved last. The station
 *       trail, coverage and export are not part of it
 * ----------------------------------------------------------------------------
 */

import { fmtBytes, fmtCount, fmtDate, isAncestor } from './model.js';
import { BOX } from './layout.js';
import { THEME } from './theme.js';
import { ask } from './ui.js';
import { icon } from './icons.js';
import { Places, storageKey, MAX_BENCHMARKS, KEEP_ENTRIES, deltaText, anchorOf, poseRelative, vantage } from './places.js';

export const name = 'Landmarks';

const OWNER = 'landmarks';
const MARKS_MAX = 12;
// A benchmark that goes missing is announced after this long, so a rename
// Terrane itself is carrying out is not reported on its way through.
const LOST_GRACE = 1500;
const FLY_MS = 900;
const DETAIL_ROWS = 8;

const files = (n) => `${fmtCount(n)} file${n === 1 ? '' : 's'}`;
const folders = (n) => `${fmtCount(n)} folder${n === 1 ? '' : 's'}`;
const measureText = (m) => `${fmtBytes(m.s)} · ${files(m.fc)} · ${folders(m.dc)}`;
const MINUS = '−';
const signedBytes = (v) => `${v < 0 ? MINUS : '+'}${fmtBytes(Math.abs(v))}`;

export function install(api) {
  const { S, el, fact } = api;
  // A snapshot is a recorded copy of the directory: what B measures there
  // is the snapshot as it was when taken, so that is the measurement's
  // moment, and its benchmarks are kept apart from the live directory's.
  const snapshot = !!S.info.snapshot;
  const store = new Places({
    key: storageKey(S.info.root, snapshot ? 'snapshot' : ''),
    storage: () => window.localStorage,
    now: () => (S.info.snapshot ? S.info.snapshot.takenAt : Date.now()),
    onFail: (why) => api.notice(`Places cannot be kept in this browser (${why}). Benchmarks and the return point will last only until this tab closes.`, { kind: 'info', ms: 15000 }),
    onSync: () => synced(),
  });
  S.places = store;
  store.load();
  // A reload inside the save debounce must not lose the last change.
  window.addEventListener('pagehide', () => store.flush());
  // Another tab on this directory and address saved its places: they are
  // merged in, so neither tab's next save wipes the other's.
  window.addEventListener('storage', (e) => {
    if (e.key === null || e.key === store.key) store.sync();
  });

  /** Benchmark ids whose rows are open in the Places tab. */
  const open = new Set();
  let announced = false;
  let lostTimer = 0;
  let measuring = false;

  const rel = (node) => api.relPath(node);
  const named = (node) => (node.p ? `"${node.n}"` : `"${node.n}" (the root)`);
  const target = () => (S.primary ? (S.primary.d ? S.primary : S.primary.p) : S.focus);
  // Benchmarks are found in the tree only once a survey has finished: the
  // first, and every Rescan all, which streams a new tree in place of the old.
  const ready = () => store.resolved && !S.scanning;
  const WAIT = 'Benchmarks can be set once the survey has finished.';
  // When a measurement is of: a snapshot's is when it was taken.
  const when = (at) => (snapshot ? `in the snapshot taken ${fmtDate(at)}` : `at ${fmtDate(at)}`);

  function redraw() {
    api.drawPins();
    drawMarks();
    api.drawLedger(true);
    api.drawInspector();
  }

  function showPlaces(b) {
    if (b) open.add(b.id);
    S.tab = 'places';
    api.drawLedger();
  }

  /* ---------- benchmarks ---------- */

  /** B: measures a folder now, after reading its entries from disk. */
  async function bench(dir = target()) {
    if (!dir || measuring) return;
    if (!ready()) {
      api.say(WAIT);
      return;
    }
    if (dir.e) {
      api.notice(`Cannot set a benchmark on ${named(dir)}: it could not be read (${dir.e}).`, { kind: 'info' });
      return;
    }
    const path = rel(dir);
    if (!store.find(dir) && !store.findRel(path) && store.full) {
      api.notice(`${MAX_BENCHMARKS} benchmarks is the most Terrane keeps for one directory. Forget one in the Places tab to set another.`,
        { kind: 'info', action: { label: 'Show', run: () => showPlaces() } });
      return;
    }
    measuring = true;
    try {
      // The folder's own entries are read again first, so the measurement
      // is of the folder as it is on disk now.
      await api.refreshDirs([path]);
    } finally {
      measuring = false;
    }
    // A Rescan all begun meanwhile replaces the tree being measured.
    if (!ready()) {
      api.say(WAIT);
      return;
    }
    const node = S.model.find(path);
    if (!node || !node.d) {
      api.notice(`${named(dir)} is no longer there, so no benchmark was set.`, { kind: 'error' });
      return;
    }
    const r = store.set(node);
    if (r.full) return;
    const { b, prev } = r;
    const now = `${fmtBytes(b.m.s)}, ${files(b.m.fc)}, ${when(b.m.at)}`;
    if (r.created) {
      api.notice(`Benchmark set on ${named(node)}: ${now}.`, {
        action: { label: 'Undo', run: () => { if (store.remove(b)) { open.delete(b.id); redraw(); api.say(`The benchmark on ${named(node)} is removed.`); } } },
      });
    } else {
      api.notice(`Benchmark on ${named(node)} measured again: ${now}. It was ${fmtBytes(prev.s)}, ${files(prev.fc)} ${when(prev.at)}.`, {
        action: { label: 'Undo', run: () => { if (store.restore(b, prev)) { redraw(); api.say(`The benchmark on ${named(node)} is back to its measurement of ${fmtDate(prev.at)}.`); } } },
      });
    }
    redraw();
  }

  function forget(b) {
    const at = store.benchmarks.indexOf(b);
    if (!store.remove(b)) return;
    open.delete(b.id);
    redraw();
    api.notice(`The benchmark on "${b.name}" is forgotten.`, {
      kind: 'info',
      action: { label: 'Undo', run: () => { if (store.reinstate(b, at)) { store.resolve(S.model); redraw(); } } },
    });
  }

  async function forgetAll() {
    const n = store.benchmarks.length;
    if (!n && !store.ret) return;
    const ok = await ask({
      title: 'Forget every benchmark?', danger: true, confirm: 'Forget all', confirmIcon: 'clear',
      body: `${n === 1 ? 'One benchmark' : `${fmtCount(n)} benchmarks`}${store.ret ? ' and the return point' : ''}, kept in this browser for this directory, will be forgotten. Nothing on disk changes.`,
    });
    if (!ok) return;
    store.clear();
    open.clear();
    redraw();
    api.notice('Every benchmark and the return point are forgotten.', { kind: 'info' });
  }

  /** Why a benchmark has no folder, as the rest of a sentence. */
  const whyMissing = (b) => (b.held
    ? `${b.rel} was removed to the holding area. Restore it from the Journal, or Undo, and it is found again.`
    : `nothing is at ${b.rel || 'the root'} now. It may have been renamed, moved or removed outside Terrane.`);

  /** Missing benchmarks are announced once, after a grace for Terrane's own renames. */
  function queueLost() {
    clearTimeout(lostTimer);
    lostTimer = setTimeout(() => {
      lostTimer = 0;
      const now = Date.now();
      let wait = 0;
      for (const b of store.benchmarks) {
        if (b.node || b.noticed) continue;
        if ((b.quiet || 0) > now) {
          wait = Math.max(wait, b.quiet - now);
          continue;
        }
        b.noticed = true;
        api.notice(`The benchmark on "${b.name}" is missing: ${whyMissing(b)}`, { kind: 'info', ms: 20000, action: { label: 'Forget', run: () => forget(b) } });
      }
      if (wait) lostTimer = setTimeout(queueLost, wait);
    }, LOST_GRACE);
  }

  function noteFound(found) {
    for (const b of found) {
      b.held = false;
      if (!b.noticed) continue;
      b.noticed = false;
      api.notice(`The benchmark on "${b.name}" is found again at ${b.rel || 'the root'}.`, { kind: 'info' });
    }
  }

  /** Another tab's places were merged in: their folders are found, and every view redrawn. */
  function synced() {
    if (ready()) {
      store.resolve(S.model);
      if (store.benchmarks.some((b) => !b.node && !b.noticed)) queueLost();
    }
    redraw();
  }

  /** After the first scan: one notice naming every benchmark that changed. */
  function announce() {
    const changed = [];
    for (const b of store.benchmarks) {
      const sm = store.summary(b);
      if (sm?.changed) changed.push([b, sm]);
      if (sm?.missing) b.noticed = true;
    }
    if (!changed.length) return;
    const parts = changed.slice(0, 6).map(([b, sm]) => `${b.name} (${deltaText(sm, { short: true })})`);
    const more = changed.length > 6 ? `, and ${changed.length - 6} more` : '';
    api.notice(`${changed.length === 1 ? 'A benchmark' : `${changed.length} benchmarks`} changed since measured: ${parts.join(', ')}${more}.`,
      { kind: 'info', ms: 20000, action: { label: 'Show', run: () => showPlaces(changed.length === 1 ? changed[0][0] : null) } });
  }

  /* ---------- the world: pins and tags ---------- */

  function pins() {
    if (!store.benchmarks.length) return null;
    const out = [];
    const seen = new Set();
    for (const b of store.benchmarks) {
      if (!b.node) continue;
      const i = api.visibleIndexOf(b.node);
      if (i < 0 || seen.has(i)) continue;
      seen.add(i);
      out.push({ i, color: THEME.verdigris, peak: true, upright: true });
    }
    return out;
  }

  /** Name and change tags over the boxes the benchmarks stand on, changed ones first. */
  function drawMarks() {
    if (S.noGL || !S.layout) return;
    const L = S.layout;
    const boxes = new Map();
    for (const b of store.benchmarks) {
      if (!b.node) continue;
      const i = api.visibleIndexOf(b.node);
      if (i < 0) continue;
      if (!boxes.has(i)) boxes.set(i, []);
      boxes.get(i).push(b);
    }
    const marks = [];
    for (const [i, list] of boxes) {
      const own = list.find((b) => b.node === L.node[i]) || list[0];
      const sm = store.summary(own);
      const changed = list.some((b) => store.summary(b)?.changed);
      let text = own.name;
      if (list.length > 1) text += ` +${list.length - 1} more`;
      if (sm?.changed) text += ` · ${deltaText(sm, { short: true })}`;
      marks.push({ i, text, cls: changed ? 'tag-bench is-changed' : 'tag-bench', changed, area: L.geo[i * 6 + 3] * L.geo[i * 6 + 5] });
    }
    marks.sort((a, b) => b.changed - a.changed || b.area - a.area);
    S.view.setMarks(marks.slice(0, MARKS_MAX).map(({ i, text, cls }) => ({ i, text, cls })));
  }

  /* ---------- the return point ---------- */

  /** Where you stand, relative to the box of the folder f; only the folder without WebGL. */
  function here(f) {
    const base = { rel: rel(f), name: f.n, at: Date.now(), off: null, yaw: 0, pitch: 0 };
    if (S.noGL || !S.layout) return base;
    const i = S.layout.index.get(f);
    if (i === undefined || i >= S.view.n) return base;
    return { ...base, ...poseRelative(S.view.pose(), anchorOf(S.layout, i)) };
  }

  function markReturn() {
    if (!S.focus) return;
    store.setReturn(here(S.focus));
    if (S.tab === 'places') api.drawLedger(true);
    api.say(`Return point marked in ${named(S.focus)}. J returns to it; J again comes back.`);
  }

  function forgetReturn() {
    store.forgetReturn();
    if (S.tab === 'places') api.drawLedger(true);
    api.say('The return point is forgotten.');
  }

  /** J: goes to the return point, which becomes where you were, so J again comes back. */
  function goBack() {
    const to = store.ret;
    if (!to) {
      api.say('No return point yet. H marks one where you are.');
      return;
    }
    const node = S.model.find(to.rel);
    if (!node || !node.d) {
      api.say(`The return point's folder, ${to.rel || 'the root'}, is no longer there. H marks a new one.`);
      return;
    }
    store.setReturn(here(S.focus));
    if (S.tab === 'places') api.drawLedger(true);
    travel(to, node);
    api.say(`Returning to ${named(node)}. J again comes back.`);
  }

  let settleTimer = 0;
  function travel(point, node) {
    clearTimeout(settleTimer);
    if (S.noGL || !point.off) {
      api.setFocus(node);
      return;
    }
    let i = S.layout.index.get(node);
    if (i === undefined || i >= S.view.n) {
      // Open the way to the folder, as going there does, so its box exists.
      S.force = new Set();
      for (let a = node; a; a = a.p) S.force.add(a);
      api.relayout();
      i = S.layout.index.get(node);
    }
    if (i === undefined || i >= S.view.n) {
      api.setFocus(node);
      return;
    }
    fly(point, node, vantage(point, anchorOf(S.layout, i)), FLY_MS, 0, performance.now());
  }

  /** Flies to goal, then keeps the eye on the point's offset as the layout settles. */
  function fly(point, node, goal, ms, tries, started) {
    const v = S.view;
    v.flyTo(goal, ms);
    // What was asked of the camera; anything else moving it is the viewer.
    const asked = v.flight ? { ...v.flight.to } : v.pose();
    settle(point, node, v.flight, asked, tries, started);
  }

  /**
   * The layout is rebuilt around the eye as it lands, and a box shifts when
   * neighbours open or fold around the new eye, deep boxes most. Once the
   * view is still, the eye is carried onto the offset from where the box is
   * now, up to five times. Another flight, travel keys, or the eye moved by
   * the viewer (a drag, the wheel) ends this.
   */
  function settle(point, node, mine, asked, tries, started) {
    settleTimer = setTimeout(() => {
      const v = S.view;
      if (v.keys.size || performance.now() - started > 10000) return;
      if (v.flight && v.flight !== mine) return;
      if (v.flight || v.transition || S.layoutTimer) {
        settle(point, node, mine, asked, tries, started);
        return;
      }
      const c = v.cam;
      const same = (x, y) => Math.abs(x - y) <= 1e-6 * Math.max(1, Math.abs(y));
      if (!same(c.x, asked.x) || !same(c.z, asked.z) || !same(c.yaw, asked.yaw) || !same(c.pitch, asked.pitch)) return;
      const i = S.layout.index.get(node);
      if (i === undefined || tries >= 5) return;
      const a = anchorOf(S.layout, i);
      const goal = vantage(point, a);
      if (Math.hypot(c.x - goal.x, c.y - goal.y, c.z - goal.z) <= a.w * 0.002) return;
      fly(point, node, goal, 240, tries + 1, started);
    }, 120);
  }

  /* ---------- Terrane's own renames and moves ---------- */

  const pathPair = (x) => Array.isArray(x) && typeof x[0] === 'string' && typeof x[1] === 'string';

  /**
   * After a change Terrane made (a whole one, or what one finished before
   * it stopped): renames and moves carry benchmarks along by path. The
   * service's answer to Undo names the paths it carried back, from its
   * journal, so this holds after a reload or a cancel too.
   */
  function follow(body, res) {
    let pairs = [];
    if (body.type === 'rename' && res.renamed && typeof body.path === 'string') pairs = [[body.path, res.renamed]];
    else if (body.type === 'move' && Array.isArray(body.paths) && Array.isArray(res.results)) {
      pairs = res.results.map((to, k) => [body.paths[k], to]).filter(pathPair);
    } else if (body.type === 'trash' && Array.isArray(body.paths)) {
      // Removed by Terrane to its holding area: when the folder goes
      // missing, the sentence says where it went.
      const paths = body.paths.filter((p) => typeof p === 'string' && p);
      for (const b of store.benchmarks) if (paths.some((p) => b.rel === p || b.rel.startsWith(`${p}/`))) b.held = true;
      return;
    } else if (body.type === 'undo' && Array.isArray(res.moved)) {
      pairs = res.moved.filter(pathPair);
    }
    if (pairs.length) carry(pairs);
  }

  function carry(pairs) {
    const quiet = Date.now() + 4000;
    for (const [from, to] of pairs) {
      for (const x of store.rebase(from, to)) {
        x.quiet = quiet;
        x.noticed = false;
      }
    }
  }

  /* ---------- the Places tab ---------- */

  const btn = (label, run, { icon: name, k, cls = '', title, danger, off = false } = {}) => el('button', {
    class: `btn btn-small${danger ? ' btn-danger' : ''}${cls ? ` ${cls}` : ''}`, type: 'button', 'data-k': k, title, disabled: off, onclick: run,
  }, name ? icon(name) : null, label);

  function changes(b) {
    const d = store.detail(b);
    if (!d) return [];
    const groups = [
      ['No longer here', d.gone, (e) => `${fmtBytes(e.s)}${e.d ? ` · ${files(e.f)}` : ''}`],
      [d.partial ? `Here now, not among the ${KEEP_ENTRIES} largest then` : 'Here now, not then', d.here, (e) => `${fmtBytes(e.s)}${e.d ? ` · ${files(e.f)}` : ''}`],
      ['Grown', d.grown, (e) => `${signedBytes(e.ds)}${e.d && e.df ? ` · ${e.df > 0 ? '+' : MINUS}${files(Math.abs(e.df))}` : ''}`],
      ['Shrunk', d.shrunk, (e) => `${signedBytes(e.ds)}${e.d && e.df ? ` · ${e.df > 0 ? '+' : MINUS}${files(Math.abs(e.df))}` : ''}`],
    ].filter(([, list]) => list.length);
    if (!groups.length) {
      const sm = store.summary(b);
      return sm?.changed ? [el('p', { class: 'note', text: 'Its own entries are as they were; the change is further inside.' })] : [];
    }
    const out = [];
    for (const [title, list, fig] of groups) {
      out.push(el('div', { class: 'bench-head', text: list.length > DETAIL_ROWS ? `${title} · ${DETAIL_ROWS} of ${fmtCount(list.length)}` : title }));
      for (const e of list.slice(0, DETAIL_ROWS)) {
        if (e.node) out.push(api.itemButton(e.node, fig(e)));
        else {
          out.push(el('div', { class: 'item is-static' }, el('span', { class: e.d ? 'swatch is-dir' : 'swatch is-empty' }),
            el('span', {}, el('span', { class: 'nm', text: e.name }), el('span', { class: 'path', text: e.d ? 'folder' : 'file' })), el('span', { class: 'fig', text: fig(e) })));
        }
      }
    }
    return out;
  }

  function rowBody(b, sm) {
    const node = b.node;
    if (!sm) return [el('p', { class: 'note', text: 'Found once the survey has finished.' })];
    const out = [];
    if (sm.missing) {
      out.push(el('p', {
        class: 'bench-missing',
        text: b.held ? `Missing: ${b.rel} was removed to the holding area. Restore it from the Journal, or Undo, and it is found again; or forget the benchmark.`
          : `Missing: nothing is at ${b.rel || 'the root'} now. The folder was renamed, moved or removed outside Terrane, or can no longer be read. Forget the benchmark, or put the folder back and it is found again.`,
      }));
    }
    out.push(el('dl', { class: 'facts bench-facts' },
      fact('Measured', snapshot ? `${fmtDate(b.m.at)}, when the snapshot was taken` : fmtDate(b.m.at)),
      fact('Then', measureText(b.m)),
      node ? fact('Now', measureText(node)) : null,
      node ? fact('Change', el('b', { text: sm.changed ? deltaText(sm) : 'none' })) : null));
    out.push(el('div', { class: 'actions' },
      node ? btn('Fly there', () => api.reveal(node), { icon: 'fly', k: `${b.id}:fly`, cls: 'fly' }) : null,
      node ? btn('Measure again', () => bench(node), { icon: 'remeasure', k: `${b.id}:again`, title: 'B' }) : null,
      btn('Forget', () => forget(b), { icon: 'clear', k: `${b.id}:forget`, cls: 'forget' })));
    if (node) out.push(...changes(b));
    return out;
  }

  function row(b, sm) {
    const status = !sm ? 'not yet found' : sm.missing ? 'missing' : sm.changed ? deltaText(sm, { short: true }) : 'no change';
    // The open state is kept when the summary is pressed, not when the
    // details reports it: a redraw in between (a refresh) would lose it.
    const keep = () => {
      if (d.open) open.delete(b.id);
      else open.add(b.id);
    };
    const d = el('details', { class: `bench${sm?.missing ? ' is-missing' : ''}${sm?.changed ? ' is-changed' : ''}`, 'data-id': b.id, open: open.has(b.id) },
      el('summary', { 'data-k': `${b.id}:sum`, onclick: keep },
        el('span', { class: 'bench-mark', 'aria-hidden': 'true' }),
        el('span', { class: 'bench-name' }, el('span', { class: 'nm', text: b.name }), el('span', { class: 'path', text: b.rel || '/' })),
        el('span', { class: 'fig', text: status })));
    const fill = () => {
      if (d.dataset.built) return;
      d.dataset.built = '1';
      d.append(...rowBody(b, sm));
    };
    if (d.open) fill();
    d.addEventListener('toggle', () => {
      if (d.open) {
        open.add(b.id);
        fill();
      } else open.delete(b.id);
    });
    return d;
  }

  function drawPlaces(sub, host) {
    // A redraw (a refresh, a selection) keeps the reader's place.
    const had = host.contains(document.activeElement) ? document.activeElement.dataset?.k : null;
    const list = store.benchmarks;
    // During a survey the rows wait to be found again: the tree they were
    // found in is being replaced.
    const live = ready();
    const sums = list.map((b) => (live ? store.summary(b) : null));
    const changed = sums.filter((s) => s?.changed && !s.missing).length;
    const missing = sums.filter((s) => s?.missing).length;
    sub.replaceChildren(el('span', {
      class: 'grow',
      text: list.length ? `${fmtCount(list.length)} benchmark${list.length === 1 ? '' : 's'} · ${fmtCount(changed)} changed${missing ? ` · ${fmtCount(missing)} missing` : ''}` : 'Benchmarks and the return point',
    }));
    const t = target();
    const has = t && (store.find(t) || store.findRel(rel(t)));
    host.replaceChildren(
      el('details', { open: true, class: 'places-bench' },
        el('summary', {}, 'Benchmarks', el('span', { class: 'n', text: fmtCount(list.length) })),
        el('p', {
          class: 'note places-scope',
          text: snapshot
            ? `Measured from the snapshot, as it was when taken, and kept in this browser for this directory's snapshots at this address (${location.host}), apart from benchmarks of the live directory.`
            : `Kept in this browser for this directory at this address (${location.host}). Another browser, profile or address keeps its own.`,
        }),
        store.failed ? el('p', { class: 'note places-failed', text: `This browser refused to keep them (${store.failed}), so they last only until this tab closes.` }) : null,
        list.length ? list.map((b, k) => row(b, sums[k]))
          : el('p', { class: 'note', text: 'None yet. B measures the selected folder, or the folder you are in, so you can see later what changed in it.' }),
        el('div', { class: 'actions' },
          t && !t.e ? btn(has ? `Measure "${t.n}" again` : `Set benchmark on "${t.n}"`, () => bench(t), { icon: has ? 'remeasure' : 'bench', k: 'set', title: live ? 'B' : WAIT, off: !live }) : null,
          list.length || store.ret ? btn('Forget all…', forgetAll, { icon: 'remove', k: 'forget-all', danger: true }) : null)),
      returnSection());
    if (had) host.querySelector(`[data-k="${CSS.escape(had)}"]`)?.focus({ preventScroll: true });
  }

  function returnSection() {
    const r = store.ret;
    return el('details', { open: true, class: 'places-return' },
      el('summary', {}, 'Return point', el('span', { class: 'n', text: r ? '1' : '0' })),
      r ? [
        el('div', { class: 'item is-static' }, el('span', { class: 'bench-mark is-return', 'aria-hidden': 'true' }),
          el('span', {}, el('span', { class: 'nm', text: r.name }), el('span', { class: 'path', text: `${r.rel || '/'} · marked ${fmtDate(r.at)}` })), el('span')),
        el('p', { class: 'note', text: 'J returns there, and J again comes back.' }),
        el('div', { class: 'actions' },
          btn('Return', goBack, { icon: 'returnTo', k: 'ret:go', title: 'J' }),
          btn('Mark here instead', markReturn, { icon: 'markReturn', k: 'ret:mark', title: 'H' }),
          btn('Forget', forgetReturn, { icon: 'clear', k: 'ret:forget' })),
      ] : [
        el('p', { class: 'note', text: 'None. H marks where you are, kept relative to the folder you are in; J returns to it, and J again comes back.' }),
        el('div', { class: 'actions' }, btn('Mark here', markReturn, { icon: 'markReturn', k: 'ret:mark', title: 'H' })),
      ]);
  }

  /* ---------- the inspector ---------- */

  function section(node) {
    if (!node?.d || !ready()) return null;
    const b = store.find(node);
    if (!b) {
      return [
        el('div', { class: 'section-title', text: 'Benchmark' }),
        el('div', { class: 'bench-none' },
          el('p', { text: node.e ? 'This folder could not be read, so it cannot be measured.' : 'None. A benchmark keeps this folder\'s size and contents as they are now, so you can see later what changed.' }),
          node.e ? null : api.actionButton('Set benchmark', () => bench(node), { icon: 'bench', title: 'B' })),
      ];
    }
    const sm = store.summary(b);
    return [
      el('div', { class: 'section-title', text: `Benchmark · ${fmtDate(b.m.at)}` }),
      el('dl', { class: 'facts bench-facts' },
        fact('Then', measureText(b.m)),
        fact('Now', measureText(node)),
        fact('Change', el('b', { text: sm.changed ? deltaText(sm) : 'none' }))),
      el('div', { class: 'actions-grid' },
        api.actionButton('Measure again', () => bench(node), { icon: 'remeasure', title: 'B' }),
        api.actionButton('Forget', () => forget(b), { icon: 'clear' }),
        api.actionButton('Show in Places', () => showPlaces(b), { icon: 'places', wide: true })),
    ];
  }

  /* ---------- registry entries ---------- */

  api.KEYS.add({ id: 'places-bench', owner: OWNER, keys: ['b'], run: () => { bench(); }, guide: ['Landmarks', 'B', 'Set a benchmark / measure it again'] });
  api.KEYS.add({ id: 'places-mark', owner: OWNER, keys: ['h'], run: () => { markReturn(); }, guide: ['Landmarks', 'H', 'Mark a return point'] });
  api.KEYS.add({ id: 'places-return', owner: OWNER, keys: ['j'], run: () => { goBack(); }, guide: ['Landmarks', 'J', 'Return to it / come back'] });

  api.PIN_SOURCES.add({ id: 'places', order: 10, owner: OWNER, pins });

  api.TABS.add({ id: 'places', order: 50, owner: OWNER, label: 'Places', icon: 'places', draw: drawPlaces, count: () => store.benchmarks.length || null });

  api.INSPECTOR.focus.add({ id: 'places', order: 28, owner: OWNER, build: (f) => section(f) });
  api.INSPECTOR.node.add({ id: 'places', order: 35, owner: OWNER, build: (node) => section(node) });

  api.TIP_LINES.add({
    id: 'places', order: 45, owner: OWNER,
    lines: (node, c) => {
      if (!store.benchmarks.length || !ready() || c.type === BOX.SCREE || !node.d) return null;
      const out = [];
      const b = store.find(node);
      if (b) {
        const sm = store.summary(b);
        out.push(`Benchmark of ${fmtDate(b.m.at)} · ${sm.changed ? `${deltaText(sm)} since` : 'no change since'}`);
      }
      if (c.type === BOX.CAP) {
        const inside = store.benchmarks.filter((x) => x.node && x.node !== node && isAncestor(node, x.node));
        if (inside.length) out.push(`Holds ${inside.length === 1 ? 'a benchmark' : `${inside.length} benchmarks`}: ${inside.slice(0, 3).map((x) => x.name).join(', ')}${inside.length > 3 ? ', …' : ''}`);
      }
      return out;
    },
  });

  api.MENU.add({
    id: 'places', owner: OWNER,
    items: (node) => {
      const dir = node ? (node.d ? node : null) : S.focus;
      const out = [];
      if (dir && store.resolved && S.scanning) {
        // A Rescan all: benchmarks are found again once it has finished.
        out.push({ label: node ? 'Set benchmark' : 'Set benchmark on this folder', icon: 'bench', hint: 'B', run: () => bench(dir), disabled: true, reason: 'once the survey has finished' });
      } else if (dir && store.resolved) {
        const b = store.find(dir);
        if (b) {
          out.push({ label: 'Measure benchmark again', icon: 'remeasure', hint: 'B', run: () => bench(dir) });
          out.push({ label: 'Forget benchmark', icon: 'clear', run: () => forget(b) });
        } else {
          out.push({ label: node ? 'Set benchmark' : 'Set benchmark on this folder', icon: 'bench', hint: 'B', run: () => bench(dir), disabled: !!dir.e, reason: dir.e ? 'cannot be read' : undefined });
        }
      }
      if (!node) {
        out.push({ label: 'Mark return point here', icon: 'markReturn', hint: 'H', run: markReturn });
        if (store.ret) out.push({ label: `Return to "${store.ret.name}"`, icon: 'returnTo', hint: 'J', run: goBack });
      }
      return out;
    },
  });

  api.READING.add({
    id: 'places', order: 85, owner: OWNER, glyph: 'g-bench', title: 'Benchmark',
    text: 'A verdigris survey mark standing on a folder: its size and contents measured at a moment. Its tag says what changed since. B sets one.',
  });

  api.QUERY.is.benchmark = Object.assign((n) => !!n.d && store.byNode.has(n), { owner: OWNER });

  api.AFTER_LAYOUT.add({ id: 'places', owner: OWNER, run: () => drawMarks() });

  api.AFTER_REFRESH.add({
    id: 'places', owner: OWNER,
    run: (dirs) => {
      // During a survey the tree is still arriving; the survey's end finds
      // every benchmark again.
      if (!ready() || !store.benchmarks.length) return;
      const { lost, found } = store.resolve(S.model, dirs);
      noteFound(found);
      // A removal that was cancelled leaves its folder where it was.
      for (const b of store.benchmarks) if (b.node) b.held = false;
      if (lost.length || store.benchmarks.some((b) => !b.node && !b.noticed)) queueLost();
    },
  });

  // Every full survey is a new model: every benchmark is found again by
  // its path. The first one also says which benchmarks changed.
  api.AFTER_SURVEY.add({
    id: 'places', order: 30, owner: OWNER,
    run: (_sv, { full }) => {
      if (!full) return;
      store.resolve(S.model);
      if (!announced) {
        announced = true;
        announce();
      } else if (store.benchmarks.some((b) => !b.node && !b.noticed)) queueLost();
    },
  });

  api.AFTER_OP.add({ id: 'places', owner: OWNER, run: follow });
}
