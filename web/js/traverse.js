/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Session Traverse (Terrane Edition - v1.1)
 *     - File Name: traverse.js
 *     - Relative Path: web/js/traverse.js
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
 *       Working sessions are found when something reads them (Working
 *       sessions, a session: search, the traverse), not after every
 *       survey. The date and plural helpers come from model.js. A row
 *       for a session that crossed midnight puts its second date under
 *       the first in a narrow ledger instead of cutting it off.
 *     - 1.0.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] —
 *       Initial release.
 *
 * ✒ Description:
 *     Working sessions, found and walked. Files whose last changes follow
 *     each other within 30 minutes make a session; the Survey tab lists
 *     the newest, and choosing one searches for it, so the search dims
 *     everything else, pins its files and lists them in the order they
 *     changed. The world draws the traverse: dashed ink arcs from stop to
 *     stop in that order, a chevron on each pointing onward.
 *
 * ✒ Key Features:
 *     - A session:N search token (N = 1 for the newest): the N-th
 *       session's window of time, files under dot-folders left out; the
 *       dimming, the vermilion pins, Findings, Select all, Escape and the
 *       re-run after a refresh are the search's own
 *     - Sessions are found again after every survey (relations.js), and a
 *       session search is run again with them, so a file changed since
 *       joins its session within one survey
 *     - Survey, Working sessions: the first section, closed until opened;
 *       the newest 40, each a row with its date and times, files, places
 *       and the folder holding them; a session written at once is
 *       labelled so. Enter or a click puts session:N in Find, opens
 *       Findings in time order, moves to its list and says what it covers
 *     - The traverse: relation set 'session' in the viewport's one line
 *       layer (dashed ink, arcs lifted 0.12 of their chord, chevrons at
 *       the middle), resolved again 150 ms after every layout, at most
 *       1,000 legs; Findings says when the route was cut short
 *     - A Reading the world row for the convention
 *     - No keys of its own: stepping through a session is ArrowDown and
 *       Enter in the Findings list
 *
 * ✒ Usage Instructions:
 *     Listed in features.js and installed by app.js. S.sessions is null
 *     until the first survey, then { list, gapMs, built, ms, considered,
 *     skipped, found, route }: list is sessions() newest first, found the
 *     first time it is read (found says whether it has been), and route
 *     the last traverse drawn ({ k, count, total, truncated, stops }) or
 *     null.
 *
 * ✒ Examples:
 *     session:1           the newest working session, in Findings
 *     session:3 ext:js    the JavaScript files of the third newest
 *
 * ✒ Other Important Information:
 *     - Dependencies: relations.js (sessions, facts, predicate, route),
 *       model.js (formatting), theme.js (ink); app.js's api: S, QUERY,
 *       SURVEY, READING, AFTER_SURVEY, AFTER_QUERY, AFTER_LAYOUT,
 *       setQuery, runQuery, drawLedger, say, el
 *     - Compatible platforms: any browser with ES2022 modules
 *     - Semantics: a session is made of last changes, never creations or
 *       arrivals; a copy, a checkout or an extraction restamps files and
 *       shows as a session of its own
 *     - Limitations: not yet a gap selector, stop-stepping keys, a way to
 *       include folders whose names start with a dot, or "Changed with
 *       it" in the inspector and the context menu; folders are not stops
 *       of their own
 * ----------------------------------------------------------------------------
 */

import { fmtBytes, fmtCount, fmtDay as day, plural, relPath } from './model.js';
import { sessions, sessionFacts, sessionPredicate, route, GAP_MS, MAX_LEGS } from './relations.js';
import { THEME } from './theme.js';

export const name = 'Session traverse';

const OWNER = 'traverse';
const ROWS = 40;
const ROUTE_MS = 150;
const TOKEN = /(?:^|\s)session:(\S+)/gi;
/** How the traverse is drawn: dashed ink, arcs lifted 0.12 of their chord, chevrons onward. */
export const TRAVERSE = Object.freeze({ color: THEME.ink, dashed: true, lift: 0.12, arrows: true });

const p2 = (x) => String(x).padStart(2, '0');
const hm = (ms) => {
  const d = new Date(ms);
  return `${p2(d.getHours())}:${p2(d.getMinutes())}`;
};

/** A session's time as the house writes it: MM/DD/YYYY HH:MM–HH:MM, a second date when it crossed midnight. */
export function when(start, end) {
  if (day(start) !== day(end)) return `${day(start)} ${hm(start)} – ${day(end)} ${hm(end)}`;
  return hm(start) === hm(end) ? `${day(start)} ${hm(start)}` : `${day(start)} ${hm(start)}–${hm(end)}`;
}

/** The same in words, for the live region. */
const spoken = (start, end) => {
  if (day(start) !== day(end)) return `between ${day(start)} ${hm(start)} and ${day(end)} ${hm(end)}`;
  return hm(start) === hm(end) ? `at ${day(start)} ${hm(start)}` : `between ${day(start)} ${hm(start)} and ${hm(end)}`;
};

/** The session numbers named in a query, in order: 'session:2 ext:js' gives ['2']. */
export const tokensOf = (query) => [...String(query || '').matchAll(TOKEN)].map((m) => m[1]);
const numberOf = (v) => (/^\d+$/.test(v) ? Number(v) : 0);

export function install(api) {
  const { S, el } = api;
  let routeTimer = 0;
  // The session search Findings shows: { search, k, base } or null.
  let active = null;
  // Whether Working sessions is open; it stays open across redraws.
  let open = false;

  const where = (f) => {
    const path = relPath(f.common) || `${S.model.root.n} (the root)`;
    return f.places === 1 ? `in ${path}` : `under ${path}`;
  };

  /** What a session covers, in one sentence. */
  function summary(k) {
    const list = S.sessions?.list;
    const s = list?.[k - 1];
    if (!s) return noteFor(k);
    const f = sessionFacts(s);
    const kind = f.bulk ? ', written at once' : '';
    const world = S.noGL ? '' : ' The traverse joins them in the world.';
    return `Session ${k}${k === 1 ? ', the newest' : ''}: ${plural(f.count, 'file')} in ${plural(f.places, 'place')} changed ${spoken(f.start, f.end)}${kind}, ${fmtBytes(f.bytes)}, ${where(f)}. Findings lists them in the order they changed.${world}`;
  }

  /** The Findings note for session:k, without the route's part. */
  function noteFor(k) {
    const list = S.sessions?.list;
    if (!list) return 'Working sessions are counted once the survey has finished.';
    if (!k) return 'session: takes a number; session:1 is the newest working session.';
    const s = list[k - 1];
    if (!s) return `There is no session ${fmtCount(k)}: ${plural(list.length, 'working session')} ${list.length === 1 ? 'was' : 'were'} found.`;
    const f = sessionFacts(s);
    return `Session ${k}: ${when(f.start, f.end)}, ${plural(f.count, 'file')} in ${plural(f.places, 'place')}${f.bulk ? ', written at once' : ''}.`;
  }

  /* ---------- the traverse ---------- */

  function clearRoute() {
    clearTimeout(routeTimer);
    routeTimer = 0;
    if (S.sessions) S.sessions.route = null;
    if (!S.noGL) S.view.clearRelation('session');
  }

  function queueRoute(ms) {
    clearTimeout(routeTimer);
    routeTimer = setTimeout(drawRoute, ms);
  }

  /** Draws the route of the session search over the current layout, and says in Findings when it was cut short. */
  function drawRoute() {
    routeTimer = 0;
    const search = S.search;
    if (!active || active.search !== search || !search) return clearRoute();
    const s = S.sessions?.list[active.k - 1];
    if (!s || S.noGL || !S.layout) {
      if (!S.noGL) S.view.clearRelation('session');
      return undefined;
    }
    // The session's files in time order, narrowed by the rest of the query.
    const files = s.files.filter((f) => search.set.has(f));
    const r = route(S.layout, files, { maxLegs: MAX_LEGS });
    if (r.count) S.view.setRelation('session', { ...TRAVERSE, legs: r.legs });
    else S.view.clearRelation('session');
    S.sessions.route = { k: active.k, count: r.count, total: r.total, truncated: r.truncated, stops: r.stops.length };
    const note = active.base + (r.truncated ? ` Route: the first ${fmtCount(r.count)} of ${fmtCount(r.total)} legs.` : '');
    if (note !== search.note) {
      search.note = note;
      if (S.tab === 'findings') api.drawLedger(true);
    }
    return undefined;
  }

  /* ---------- Survey: Working sessions ---------- */

  function find(k) {
    api.setQuery(`session:${k}`);
    document.getElementById('ledger-list')?.focus();
    api.say(summary(k));
  }

  function row(s, k) {
    const f = sessionFacts(s);
    // A session that crossed midnight carries two dates: in a narrow ledger
    // the second goes under the first, rather than being cut off.
    const [from, to] = when(f.start, f.end).split(' – ');
    const time = to ? el('span', { class: 'when' }, el('span', { text: `${from} – ` }), el('span', { text: to })) : from;
    const place = `${plural(f.places, 'place')} · ${relPath(f.common) || '/'}`;
    const label = `Session ${k}: ${plural(f.count, 'file')} in ${plural(f.places, 'place')} changed ${spoken(f.start, f.end)}${f.bulk ? ', written at once' : ''}, ${where(f)}. Find them.`;
    return el('button', { class: 'item session-row', type: 'button', 'data-session': String(k), 'aria-label': label, title: `session:${k}`, onclick: () => find(k) },
      el('span', { class: 'swatch is-traverse' }),
      el('span', {}, el('span', { class: 'nm' }, time, f.bulk ? el('span', { class: 'bulk', text: 'Written at once' }) : null), el('span', { class: 'path', text: place })),
      el('span', { class: 'fig', text: plural(f.count, 'file') }));
  }

  function workingSessions() {
    const list = S.sessions?.list;
    const minutes = Math.round((S.sessions?.gapMs ?? GAP_MS) / 60000);
    const body = [];
    if (!list) body.push(el('p', { class: 'note', text: 'Working sessions are counted once the survey has finished.' }));
    else {
      body.push(el('p', { class: 'note', text: `Files changed within ${minutes} minutes of one another, newest first. Folders whose names start with a dot are left out. A copy, a checkout or an extraction changes every file it writes, so it shows as a session too.` }));
      if (!list.length) body.push(el('p', { class: 'note', text: `No two files changed within ${minutes} minutes of one another.` }));
      list.slice(0, ROWS).forEach((s, i) => body.push(row(s, i + 1)));
      if (list.length > ROWS) body.push(el('p', { class: 'note', text: `The ${ROWS} newest of ${fmtCount(list.length)}. Type session:N in Find for an older one.` }));
    }
    const details = el('details', { class: 'sessions', open }, el('summary', {}, 'Working sessions', el('span', { class: 'n', text: list ? fmtCount(list.length) : '…' })), ...body);
    details.addEventListener('toggle', () => { open = details.open; });
    return details;
  }

  /* ---------- registry entries ---------- */

  api.QUERY.prefix.session = Object.assign((value) => {
    const list = S.sessions?.list;
    return list ? sessionPredicate(list, numberOf(value)) : null;
  }, { owner: OWNER });

  /**
   * The sessions of the tree as it is at this survey, found the first time
   * something reads them: the Survey tab's Working sessions, a session:
   * search or the traverse. A survey nobody asks about costs nothing here.
   */
  function lazySessions(root) {
    let list = null;
    let ms = 0;
    const get = () => {
      if (!list) {
        const t0 = performance.now();
        list = sessions(root);
        ms = performance.now() - t0;
      }
      return list;
    };
    return {
      get list() { return get(); },
      get gapMs() { return get().gapMs; },
      get considered() { return get().considered; },
      get skipped() { return get().skipped; },
      get ms() { get(); return ms; },
      /** True once the list has been found. */
      get found() { return list !== null; },
      built: Date.now(),
      route: null,
    };
  }

  // Marked stale after every survey, after the age table, and found again
  // when read; a session search is run again with them, so its window is
  // never the one before.
  api.AFTER_SURVEY.add({
    id: 'traverse', order: 30, owner: OWNER,
    run: () => {
      S.sessions = lazySessions(S.model.root);
      if (tokensOf(S.query).length) {
        api.runQuery();
        // The survey redraws its own tab; any other shows the new matches here.
        if (S.tab !== 'survey') api.drawLedger(true);
      }
    },
  });

  api.AFTER_QUERY.add({
    id: 'traverse', owner: OWNER,
    run: (search, query) => {
      const toks = tokensOf(query);
      if (!search || !toks.length) {
        active = null;
        clearRoute();
        return;
      }
      const k = numberOf(toks[0]);
      active = { search, k, base: noteFor(k) };
      // A session reads in the order it happened.
      search.sort = { key: 'date', dir: 1 };
      search.note = active.base;
      queueRoute(0);
    },
  });

  api.AFTER_LAYOUT.add({
    id: 'traverse', owner: OWNER,
    run: () => {
      if (active) queueRoute(ROUTE_MS);
    },
  });

  // First in the Survey tab and closed until opened, so Tab reaches it
  // straight from the tab and Largest files keeps its place open below.
  api.SURVEY.add({ id: 'sessions', order: 5, owner: OWNER, build: workingSessions });

  api.READING.add({
    id: 'traverse', order: 88, owner: OWNER, glyph: 'g-traverse', title: 'Traverse',
    text: 'A working session: dashed ink arcs from file to file in the order they changed, a chevron pointing on. Survey, Working sessions draws one.',
  });
}
