/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Archive Interiors Scenario (Terrane Edition - v1.1)
 *     - File Name: interiors.mjs
 *     - Relative Path: tools/ui-scenarios/interiors.mjs
 *     - Artifact Type: test
 *     - Version: 1.1.0
 *     - Date: 11/13/2026
 *     - Update: Friday, November 13, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Changelog:
 *     - 1.1.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] — Two
 *       scenarios for the client half: 'interior', the walled floor from
 *       the keyboard in both passes (the route, Contents, the lock, the
 *       menu and inspector, twins, the canvas steps, Escape, hazards.zip,
 *       packed.7z and the copy 13 levels down), and 'interior-disk', a
 *       touched archive closing its interior and I reading it again.
 *     - 1.0.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] —
 *       Initial release: the service half from inside the page.
 *
 * ✒ Description:
 *     Checks archive interiors from inside the real page. The service
 *     half: with the page's own token, GET /api/inside lists the
 *     fixture's archives exactly as its manifest describes them, and the
 *     page does not call it or change while it does. The client half: I
 *     walls a zip in and Contents lists it, nothing inside can be
 *     changed, and a change on disk closes it, all from the keyboard.
 *
 * ✒ Key Features:
 *     - Any data, both passes: listing needs no 3D view
 *     - The stored zip and its copy 13 levels down list the manifest's
 *       names and sizes, the UTF-8 name included, with no partial sentence
 *     - The hazards archive counts one locked entry and one escape
 *     - 7z is refused with 415 naming the format, the truncated zip with
 *       422 and the damaged sentence
 *     - The page's thumbnail cookie does not stand in for the token: a
 *       listing without the header is refused with 401
 *     - Snapshot data: the endpoint answers ESNAPSHOT with a sentence
 *     - The page made no listing request of its own, and its model,
 *       layout and notices are the same afterwards
 *     - 'interior' (fixture, both passes): search site.zip, Enter, I; the
 *       notice, crumbs ending in site.zip, Contents listing the top level
 *       after the flight too, four walls, unchanged totals; Enter on the
 *       inner folder lists it, also without WebGL
 *     - An entry: the inspector's path through the archive and twin,
 *       every change unavailable (inside an archive); F2, Delete, M, N,
 *       Ctrl+D, Enter and runOp itself refused in one sentence, with no
 *       POST /api/op; the menu says the same
 *     - Twins tied as relation set 'twins' at no extra draw call; a
 *       refresh of the archive's folder from inside it; ArrowUp from the
 *       archive's root selects its file; Escape closes it, leaving no
 *       WALL and the file out of S.force
 *     - hazards.zip's locked entry hatched and listed, its escaping name
 *       in the inspector; packed.7z refused without asking the service;
 *       the copy 13 levels down opens the same way
 *     - 'interior-disk' (writes): touching site.zip closes its interior
 *       with "site.zip changed on disk, so its interior was closed. Press
 *       I to read it again.", and I reads it at its new time
 *
 * ✒ Usage Instructions:
 *     node tools/ui-check.mjs interiors
 *     node tools/ui-check.mjs interior interior-disk
 *
 * ✒ Other Important Information:
 *     - Dependencies: tools/ui-check.mjs (the context t); node:fs
 *     - Compatible platforms: Node.js 22.5+
 * ----------------------------------------------------------------------------
 */

import fs from 'node:fs';

/** In the page: lists each path with the page's own token, or without it. */
async function listInPage(paths, withToken) {
  const token = document.querySelector('meta[name="terrane-token"]').content;
  const out = [];
  for (const p of paths) {
    const r = await fetch(`/api/inside?path=${encodeURIComponent(p)}`, { headers: withToken ? { 'X-Terrane-Token': token } : {} });
    out.push({ status: r.status, body: await r.json() });
  }
  return out;
}

/** Folder and file paths with sizes from scanner records: 'a/' and 'a/b.txt:5'. */
function recordPaths(records) {
  const where = new Map();
  const out = [];
  for (const [id, pid, name, , , files] of records || []) {
    const at = pid === -1 ? '' : where.get(pid) ? `${where.get(pid)}/${name}` : name;
    where.set(id, at);
    if (pid !== -1) out.push(`${at}/`);
    for (let i = 0; i < files.length; i += 4) out.push(`${at ? `${at}/` : ''}${files[i]}:${files[i + 1]}`);
  }
  return out.sort();
}

const pageState = (T) => ({
  files: T.S.model.root.fc,
  bytes: T.S.model.root.s,
  boxes: T.S.layout?.n ?? null,
  notices: [...document.querySelectorAll('#notices .notice-text')].map((n) => n.textContent),
});

const service = {
  name: 'interiors',
  title: 'Archive interiors: the listing service, from the page',
  data: 'any',
  async run(t) {
    await t.settle();
    const own = t.requests().filter((r) => r.path === '/api/inside').length;
    t.check('the page asks for no archive listing on its own', own === 0, `${own} requests`);
    const before = await t.app(pageState);
    const mark = t.mark();

    if (t.data !== 'fixture') {
      const [snap] = await t.eval(listInPage, ['any.zip'], true);
      t.check('snapshot data: the listing is refused with ESNAPSHOT and a sentence',
        snap.status === 403 && snap.body.code === 'ESNAPSHOT' && /snapshot mode/i.test(snap.body.message), JSON.stringify(snap.body));
    } else {
      const A = t.manifest.archives;
      const paths = [A.site.path, t.manifest.chain.host, A.hazards.path, A.sevenZip.path, A.truncated.path];
      const [site, deep, hazards, seven, truncated] = await t.eval(listInPage, paths, true);
      const want = A.site.entries.map((e) => (e.folder ? e.name : `${e.name}:${e.size}`)).sort();
      const got = recordPaths(site.body.records);
      t.check(`site.zip lists the manifest's ${A.site.entries.length} entries exactly, café.md included`,
        site.status === 200 && JSON.stringify(got) === JSON.stringify(want) && site.body.partial === null && got.some((p) => p.startsWith('site/notes/café.md:')),
        `${site.status} ${got.join(' ')}`);
      t.check('the copy 13 levels down lists the same entries',
        deep.status === 200 && JSON.stringify(recordPaths(deep.body.records)) === JSON.stringify(want));
      t.check('hazards.zip counts one locked entry and one escape',
        hazards.status === 200 && hazards.body.locked === A.hazards.locked && hazards.body.escapes === A.hazards.escapes
        && hazards.body.escaped?.[0]?.name === '../escape.txt', JSON.stringify(hazards.body));
      t.check('packed.7z is refused with 415 naming 7z', seven.status === 415 && seven.body.format === '7z' && /7z archive/.test(seven.body.message), JSON.stringify(seven.body));
      t.check('truncated.zip is refused with 422 and the damaged sentence',
        truncated.status === 422 && truncated.body.code === 'EDAMAGED' && /^truncated\.zip looks damaged: /.test(truncated.body.message), JSON.stringify(truncated.body));
      const [bare] = await t.eval(listInPage, [A.site.path], false);
      t.check('without the token header the listing is refused (401): the thumbnail cookie does not stand in', bare.status === 401, JSON.stringify(bare.body));
      // A response's status can reach the log just after the page has read it.
      const listings = () => t.requests(mark).filter((r) => r.path === '/api/inside');
      await t.poll(() => listings().length === paths.length + 1 && listings().every((r) => r.status), { timeout: 3000 });
      const logged = listings();
      t.check('the network log shows exactly the listings asked for, each with its status',
        logged.length === paths.length + 1 && logged.every((r) => r.method === 'GET')
        && JSON.stringify(logged.map((r) => r.status)) === JSON.stringify([200, 200, 200, 415, 422, 401]), JSON.stringify(logged.map((r) => r.status)));
    }
    const after = await t.app(pageState);
    t.check('the page\'s model, layout and notices are unchanged', JSON.stringify(after) === JSON.stringify(before),
      `${JSON.stringify(before)} -> ${JSON.stringify(after)}`);
  },
};

/* ====================================================================== */
/* the client half: the walled floor                                      */
/* ====================================================================== */

const WORDS = /creat|arriv|\badded\b/i;
const LOCK = /^Nothing inside site\.zip can be changed, opened or revealed: Terrane reads an archive's directory without unpacking it\.$/;

/** In the page: records every sentence the live region carries and every notice shown. */
function listen() {
  const live = document.getElementById('live');
  const notices = document.getElementById('notices');
  window.__lives = [];
  window.__notes = [];
  window.__liveObs?.disconnect();
  window.__noteObs?.disconnect();
  window.__liveObs = new MutationObserver(() => window.__lives.push(live.textContent));
  window.__liveObs.observe(live, { childList: true, characterData: true, subtree: true });
  window.__noteObs = new MutationObserver((list) => {
    for (const m of list) for (const n of m.addedNodes) if (n.querySelector) window.__notes.push(n.querySelector('.notice-text')?.textContent || '');
  });
  window.__noteObs.observe(notices, { childList: true });
  return true;
}

/** Types a query into an empty Find, waits for its matches, and moves to the list with Enter. */
async function findAndEnter(t, text) {
  await t.key('/');
  await t.waitFor(() => document.activeElement?.id === 'q');
  if (await t.eval(() => document.getElementById('q').value)) {
    await t.key('Escape');
    await t.waitFor((T) => !T.S.search && T.S.query === '');
    await t.key('/');
    await t.waitFor(() => document.activeElement?.id === 'q');
  }
  await t.type(text);
  await t.waitFor((T, q) => T.S.query === q && T.S.search?.list.length > 0, { args: [text], what: `matches for ${text}` });
  await t.key('Enter');
  await t.waitFor(() => document.activeElement?.id === 'ledger-list');
}

/** In the page: what the open archive shows, in the ledger, the crumbs and the layout. */
function opened(T) {
  const S = T.S;
  const I = S.interior;
  const crumbs = [...document.querySelectorAll('#crumbs .crumb')];
  const types = [...S.layout.type];
  return {
    open: !!I, host: I?.host.n ?? null, atRoot: !!I && S.focus === I.root, focus: S.focus.n, tab: S.tab,
    crumb: crumbs.at(-1)?.textContent, archiveCrumb: !!crumbs.at(-1)?.classList.contains('is-archive'), crumbs: crumbs.length,
    list: T.list.items.map((n) => n.n).sort(), top: I ? I.root.c.map((n) => n.n).sort() : [],
    walls: types.filter((x) => x === 4).length, chamber: S.layout.chamber, focusKids: S.focus.c.map((n) => n.n).sort(),
    hostForced: !!I && !!S.force?.has(I.host), totals: { s: S.model.root.s, fc: S.model.root.fc, dc: S.model.root.dc, h: S.model.root.h },
  };
}

/** In the page: the inspector's section titles, action buttons and path. */
function inspector() {
  const body = document.getElementById('inspector-body');
  return {
    titles: [...body.querySelectorAll('.section-title')].map((x) => x.textContent),
    path: body.querySelector('.insp-path code')?.textContent ?? null,
    buttons: Object.fromEntries([...body.querySelectorAll('button.btn')].map((b) => [b.textContent.trim(), b.disabled ? b.title : 'on'])),
    names: [...body.querySelectorAll('.interior-names li')].map((x) => x.textContent),
    twins: [...body.querySelectorAll('.interior-twins .nm')].map((x) => x.textContent),
    reading: [...body.querySelectorAll('.reading b')].map((x) => x.textContent),
    created: [...body.querySelectorAll('.facts dt')].find((d) => d.textContent === 'Created')?.nextSibling?.textContent ?? null,
  };
}

/** In the page: the open menu's items, label to reason ('on' when available). */
function menuItems() {
  return Object.fromEntries([...document.querySelectorAll('.menu-item')].map((m) => [m.querySelector('.menu-label')?.textContent, m.getAttribute('aria-disabled') ? m.querySelector('.menu-why')?.textContent || 'off' : 'on']));
}

const notesSince = (t, k) => t.app((T, n) => window.__notes.slice(n), k);
const noteCount = (t) => t.app(() => window.__notes.length);

const chamber = {
  name: 'interior',
  title: 'Archive interiors: I walls a zip in, Contents lists it, nothing inside changes',
  data: 'fixture',
  async run(t) {
    await t.settle();
    await t.app(listen);
    const before = await t.app((T) => ({ s: T.S.model.root.s, fc: T.S.model.root.fc, dc: T.S.model.root.dc, h: T.S.model.root.h }));
    const mark = t.mark();

    // Keyboard only: search 'site.zip', Enter, I.
    await findAndEnter(t, 'site.zip');
    await t.key('i');
    await t.waitFor((T) => !!T.S.interior, { timeout: 8000, what: 'the interior of site.zip' });
    const first = await t.app(opened);
    const said = (await t.notices()).find((n) => /holds .* files .* already in this directory/.test(n));
    t.check(`I opens site.zip: "${said}"`, first.host === 'site.zip' && !!said && /^site\.zip holds 8 files in 6 folders, .* unpacked; 8 of them are already in this directory, by name and size\.$/.test(said), JSON.stringify(await t.notices()));
    t.check('the breadcrumbs end in site.zip, marked as the archive, and the location is the archive\'s root',
      first.crumb === 'site.zip' && first.archiveCrumb && first.atRoot, JSON.stringify(first));
    t.check(`Contents lists the archive's top level (${first.top.join(', ')})`, first.tab === 'contents' && JSON.stringify(first.list) === JSON.stringify(first.top) && first.top.join() === 'site', JSON.stringify(first.list));
    t.check('the layout walls it in: exactly 4 WALL boxes and a floor, the file\'s chain held open',
      first.walls === 4 && first.chamber && first.chamber.floor === first.chamber.from + 4 && first.hostForced, JSON.stringify(first.chamber));
    t.check('the tree\'s totals are unchanged by the listing', JSON.stringify(first.totals) === JSON.stringify(before), `${JSON.stringify(before)} -> ${JSON.stringify(first.totals)}`);
    if (t.gl) {
      await t.settle();
      const landed = await t.app(opened);
      t.check('after the flight settles Contents still lists the top level, and the crumbs still end in site.zip',
        landed.atRoot && JSON.stringify(landed.list) === JSON.stringify(landed.top) && landed.crumb === 'site.zip', JSON.stringify(landed));
      await t.shot('site-zip-open');
    }

    // Escape clears the search first; the archive stays open.
    await t.key('Escape');
    await t.waitFor((T) => !T.S.search);
    t.check('Escape with the search on clears the search and leaves the archive open', await t.app((T) => !!T.S.interior && T.S.focus === T.S.interior.root));

    // Enter on the inner folder lists it, with or without the 3D view.
    await t.key('Enter');
    await t.waitFor((T) => T.S.focus.n === 'site' && T.list.items.length > 1, { what: 'the inner folder site' });
    if (t.gl) await t.settle();
    const inner = await t.app(opened);
    t.check(`Enter on the inner folder lists it in Contents (${inner.list.length} items)${t.gl ? ', still after the flight' : ', WebGL disabled'}`,
      inner.focus === 'site' && JSON.stringify(inner.list) === JSON.stringify(inner.focusKids) && inner.list.includes('index.html') && inner.crumb === 'site' && inner.open, JSON.stringify(inner));

    // Down the list to a file with a twin outside.
    let twin = null;
    for (let k = 0; k < 9 && !twin; k++) {
      await t.key('ArrowDown');
      twin = await t.app((T) => {
        const p = T.S.primary;
        return p && !p.d && T.S.interior.twins.has(p) ? p.n : null;
      });
    }
    t.check(`ArrowDown reaches ${twin}, an entry with a twin in this directory`, !!twin);
    const ins = await t.app(inspector);
    t.check(`its inspector: the path through the archive (${ins.path}), In site.zip, the twin, and no stat`,
      /site\.zip!\/site\//.test(ins.path || '') && ins.titles.includes('In site.zip') && ins.titles.includes('Already in this directory')
      && ins.twins.includes(twin) && ins.created === 'not recorded in the archive', JSON.stringify(ins));
    t.check('its actions say why they are unavailable: inside an archive',
      ['Open', 'Reveal', 'Rename…', 'Move to…', 'Copy to…', 'Duplicate', 'Remove…'].every((b) => ins.buttons[b] === 'Unavailable: inside an archive') && ins.buttons['Copy'] === 'on',
      JSON.stringify(ins.buttons));
    const rows = await t.app((T) => [...document.querySelectorAll('#ledger-list .row')].map((r) => r.getAttribute('draggable')));
    t.check('no Contents row inside the archive can be dragged', rows.length > 0 && rows.every((d) => d !== 'true'), JSON.stringify(rows));

    if (t.gl) {
      const ties = await t.waitFor((T) => {
        const v = T.S.view;
        const s = v.relationSets.get('twins');
        return s && !v.relationsStale && v.relations.geometry.drawRange.count > 0 && { legs: s.legs.length / 6, count: v.relations.geometry.drawRange.count, color: s.color };
      }, { what: 'the twins relation drawn' });
      t.check(`the twin is tied in the archive kind's colour: relation set 'twins', ${ties.legs} leg, draw range ${ties.count}`, ties.legs >= 1 && ties.count > 0 && ties.color === 0x7b5a41, JSON.stringify(ties));
      // The Duplicates lens pins no heavyweight files, so the frame holds
      // what the selection baseline holds, the relation layer included.
      await t.key('4');
      await t.waitFor((T) => T.S.lens === 'dup' && T.S.view.relationSets.has('twins'));
      const withTies = await t.drawCalls();
      await t.app((T) => { T.api.select(T.S.focus); return true; });
      await t.waitFor((T) => !T.S.view.relationSets.has('twins'));
      const without = await t.drawCalls();
      const want = t.recorded?.selected?.calls ?? t.baseline?.selected?.calls;
      t.check(`renderer.info.render.calls with the twin tied equals the selection baseline: ${withTies.calls} with the ties, ${without.calls} without, baseline ${want}`,
        withTies.calls === want && without.calls === want, JSON.stringify([withTies.drawn, without.drawn]));
      await t.app((T, n) => { T.api.select(T.S.focus.c.find((x) => x.n === n)); return true; }, twin);
      await t.key('1');
      await t.waitFor((T) => T.S.lens === 'kind' && T.S.view.relationSets.has('twins'));
      await t.shot('twin-tied');
    }
    await t.eval(() => document.getElementById('ledger-list').focus());

    // F2, Delete, M, N and Ctrl+D: each refused in words, nothing sent.
    const opMark = t.mark();
    const refused = {};
    for (const k of ['F2', 'Delete', 'M', 'N', 'Ctrl+D']) {
      const n = await noteCount(t);
      await t.key(k);
      const got = await t.until((T, c) => window.__notes.length > c && window.__notes.slice(c), { args: [n], timeout: 3000 });
      refused[k] = got ? got.at(-1) : null;
    }
    const dialog = await t.eval(() => document.getElementById('dialog').open);
    t.check('on an entry, F2, Delete, M, N and Ctrl+D each say nothing inside can be changed, and no dialog opens',
      Object.values(refused).every((x) => LOCK.test(x || '')) && !dialog, JSON.stringify(refused));
    const n0 = await noteCount(t);
    const direct = await t.app(async (T) => {
      const p = T.S.primary;
      return { rename: await T.api.runOp({ type: 'rename', path: T.api.relPath(p), name: 'x.txt' }), move: await T.api.runOp({ type: 'move', paths: ['docs'], dest: T.api.relPath(p.p) }) };
    });
    const directNotes = await notesSince(t, n0);
    await t.key('Enter');
    const opened2 = await t.until((T, c) => window.__notes.length > c && window.__notes.at(-1), { args: [n0 + 2], timeout: 3000 });
    t.check('runOp with an entry\'s path, or an entry folder as the destination, is refused before anything is sent; so is Enter (open) on an entry',
      direct.rename === null && direct.move === null && directNotes.length === 2 && directNotes.every((x) => LOCK.test(x)) && LOCK.test(opened2 || ''), JSON.stringify([direct, directNotes, opened2]));
    const posts = t.requests(opMark).filter((r) => r.method === 'POST' && r.path === '/api/op');
    t.check('the network log shows no POST /api/op', posts.length === 0, JSON.stringify(posts));

    // The menu on an entry.
    await t.key('ContextMenu');
    await t.waitFor(() => document.querySelectorAll('.menu-item').length > 0);
    const menu = await t.eval(menuItems);
    await t.key('Escape');
    await t.waitFor(() => !document.querySelector('.menu-item'));
    t.check('the menu on an entry: changes, Open and Reveal unavailable (inside an archive); Copy path and Close site.zip available',
      ['Rename…', 'Move to…', 'Copy to…', 'Duplicate in place', 'Remove…', 'Open', 'Reveal in file manager'].every((l) => menu[l] === 'inside an archive')
      && menu['Copy path'] === 'on' && menu['Close site.zip'] === 'on', JSON.stringify(menu));

    // A refresh of the archive's folder while you are inside it.
    const refresh = await t.app(async (T) => {
      await T.api.refreshDirs([T.api.relPath(T.S.interior.host.p)]);
      return { open: !!T.S.interior, focus: T.S.focus.n, primary: T.S.primary?.n ?? null };
    });
    t.check('refreshDirs on the archive\'s folder with the location inside it completes; the archive stays open and so does the selection',
      refresh.open && refresh.focus === 'site' && refresh.primary === twin, JSON.stringify(refresh));

    // Up from the archive's root, on the canvas.
    await t.tabTo('#view');
    await t.key('Backspace');
    await t.waitFor((T) => T.S.focus === T.S.interior.root, { what: 'Backspace to the archive\'s root' });
    for (let k = 0; k < 3 && !(await t.app((T) => T.S.primary === T.S.interior.root)); k++) await t.key('ArrowUp');
    const atRoot = await t.app((T) => T.S.primary === T.S.interior.root);
    await t.key('ArrowUp');
    const up = await t.app((T) => ({ host: T.S.primary === T.S.interior.host, n: T.S.primary?.n }));
    await t.key('ArrowDown');
    const down = await t.app((T) => T.S.primary === T.S.interior.root);
    t.check('ArrowUp from the archive\'s root selects its file, and ArrowDown from the file goes back in', atRoot && up.host && down, JSON.stringify({ atRoot, up, down }));
    await t.key('ArrowUp');
    await t.waitFor((T) => T.S.primary === T.S.interior.host);
    const hostIns = await t.app(inspector);
    t.check('the open archive\'s file in the inspector: Inside site.zip, with Close', hostIns.titles.includes('Inside site.zip') && hostIns.buttons['Close site.zip'] === 'on', JSON.stringify(hostIns));

    // Escape: the selection first, then the archive.
    await t.key('Escape');
    await t.waitFor((T) => !T.S.primary);
    const root = await t.app(inspector);
    t.check('with nothing selected inside it, the inspector sums the archive and Reading the world has the walled floor',
      root.titles.includes('Inside site.zip') && root.reading.includes('Walled floor'), JSON.stringify(root.titles));
    await t.key('Escape');
    await t.waitFor((T) => !T.S.interior, { what: 'Escape to close the archive' });
    const shut = await t.app((T) => ({
      walls: [...T.S.layout.type].filter((x) => x === 4).length, forced: !!T.S.force && [...T.S.force].some((n) => n.n === 'site.zip' && !n.d),
      chamber: T.S.layout.chamber, focus: T.S.focus.n, crumb: document.querySelector('#crumbs .crumb:last-child')?.textContent,
    }));
    const lives = await t.app(() => window.__lives.slice());
    t.check('Escape with nothing selected closes it: no WALL in the layout, the file not in S.force, and it is said',
      shut.walls === 0 && !shut.forced && shut.chamber === null && shut.focus === 'archives' && lives.includes('site.zip is closed.'), JSON.stringify(shut));

    // Look inside, from the menu and the inspector, on the closed file.
    await findAndEnter(t, 'site.zip');
    await t.key('Enter');
    await t.waitFor((T) => T.S.primary?.n === 'site.zip');
    const closedIns = await t.app(inspector);
    await t.key('ContextMenu');
    await t.waitFor(() => document.querySelectorAll('.menu-item').length > 0);
    const closedMenu = await t.eval(menuItems);
    await t.key('Escape');
    await t.waitFor(() => !document.querySelector('.menu-item'));
    t.check('a closed zip offers Look inside, in the inspector and the menu', closedIns.titles.includes('Archive') && closedIns.buttons['Look inside'] === 'on' && closedMenu['Look inside'] === 'on',
      JSON.stringify([closedIns.buttons, closedMenu]));

    // hazards.zip, with site.zip still selected: I acts on the row the
    // cursor is on. A locked entry and a name that climbs out.
    await findAndEnter(t, 'hazards.zip');
    await t.key('i');
    await t.waitFor((T) => T.S.interior?.host.n === 'hazards.zip', { timeout: 8000 });
    const hz = (await t.notices()).find((n) => n.startsWith('hazards.zip holds'));
    t.check(`hazards.zip says what is locked and what climbs out: "${hz}"`,
      /1 entry is locked \(encrypted\)\./.test(hz || '') && /\.\.\/escape\.txt \(shown as escape\.txt\)/.test(hz || ''), hz);
    await t.key('Escape');
    await t.waitFor((T) => !T.S.search);
    await t.key('Escape');
    await t.waitFor((T) => !T.S.primary);
    const hzIns = await t.app(inspector);
    const hzRows = await t.app((T) => [...document.querySelectorAll('#ledger-list .row')].map((r) => `${r.querySelector('.row-name').firstChild.textContent}:${r.querySelector('.swatch').className}:${r.querySelector('.sr')?.textContent || ''}`));
    t.check('the inspector lists the escaping name as written; Contents marks the locked entry and says so',
      hzIns.names.some((x) => x.startsWith('../escape.txt') && x.endsWith('shown as escape.txt')) && hzRows.some((r) => r.startsWith('secret.txt:') && r.includes('is-locked') && r.endsWith(', locked')),
      JSON.stringify([hzIns.names, hzRows]));
    if (t.gl) {
      await t.settle();
      const hatch = await t.app((T) => {
        const L = T.S.layout;
        const n = T.S.interior.root.c.find((x) => x.n === 'secret.txt');
        const i = L.index.get(n);
        return i === undefined ? -1 : T.S.view.aStyle.array[i];
      });
      t.check(`the locked entry is hatched in the world (style ${hatch})`, hatch === 1);
    }
    await t.key('Escape');
    await t.waitFor((T) => !T.S.interior);

    // packed.7z: not looked inside, and the service is not asked.
    const sevenMark = t.mark();
    await findAndEnter(t, 'packed.7z');
    const n7 = await noteCount(t);
    await t.key('i');
    const seven = await t.until((T, c) => window.__notes.length > c && window.__notes.at(-1), { args: [n7] });
    t.check(`I on packed.7z: "${seven}"`, /^Terrane looks inside zip archives .*; packed\.7z is not one\.$/.test(seven || '')
      && !t.requests(sevenMark).some((r) => r.path === '/api/inside') && await t.app((T) => !T.S.interior), seven);
    await t.key('Escape');
    await t.waitFor((T) => !T.S.search);

    // The copy thirteen levels down.
    await findAndEnter(t, 'site-copy.zip');
    await t.key('i');
    await t.waitFor((T) => T.S.interior?.host.n === 'site-copy.zip', { timeout: 8000 });
    if (t.gl) await t.settle();
    const deep = await t.app(opened);
    t.check(`the copy at depth 13 opens the same way: ${deep.crumbs} crumbs ending in site-copy.zip, 4 walls, Contents the top level`,
      deep.crumbs === 14 && deep.crumb === 'site-copy.zip' && deep.walls === 4 && deep.atRoot && JSON.stringify(deep.list) === JSON.stringify(deep.top), JSON.stringify(deep));
    await t.shot('depth-13');
    await t.key('Escape');
    await t.waitFor((T) => !T.S.search);
    await t.key('Escape');
    await t.waitFor((T) => !T.S.interior);

    // Nothing was fetched through an archive, and the wording.
    const through = t.requests(mark).filter((r) => /^\/api\/(stat|raw|thumb)$/.test(r.path) && /\.zip%2F|\.zip\//.test(r.url));
    t.check('no stat, preview or thumbnail was asked for a path through an archive', through.length === 0, JSON.stringify(through));
    const words = await t.app(() => [...window.__lives, ...window.__notes]);
    t.check(`what it said uses "changed", never "created", "arrived" or "added" (${words.length} sentences)`, !words.some((s) => WORDS.test(s)), words.filter((s) => WORDS.test(s)).join(' | '));
    await t.app(() => { window.__liveObs?.disconnect(); window.__noteObs?.disconnect(); return true; });
  },
};

const disk = {
  name: 'interior-disk',
  title: 'Archive interiors: touching the archive on disk closes its interior, and I reads it again',
  data: 'fixture',
  write: true,
  async run(t) {
    const rel = t.manifest.archives.site.path;
    await t.settle();
    await t.waitFor((T) => T.S.watch === 'live', { timeout: 10000, what: 'the watcher' });
    await t.app(listen);
    const mark = t.mark();
    await findAndEnter(t, 'site.zip');
    await t.key('i');
    await t.waitFor((T) => !!T.S.interior, { timeout: 8000 });
    const was = await t.app((T) => T.S.interior.mtime);
    await t.key('Escape');
    await t.waitFor((T) => !T.S.search);
    // Touch: the same bytes, a new time.
    const at = new Date(Math.floor(Date.now() / 1000) * 1000 + 5000);
    fs.utimesSync(t.abs(rel), at, at);
    await t.waitFor((T) => !T.S.interior, { timeout: 15000, what: 'the interior to close after the touch' });
    const notes = await t.app(() => window.__notes.slice());
    const text = 'site.zip changed on disk, so its interior was closed. Press I to read it again.';
    const after = await t.app((T) => ({ primary: T.S.primary?.n ?? null, walls: [...T.S.layout.type].filter((x) => x === 4).length, live: document.getElementById('live').textContent }));
    t.check('touching site.zip on disk closes its interior, and the notice says so', notes.includes(text) && after.walls === 0 && after.live === text, JSON.stringify({ notes, after }));
    t.check('the file is selected, so I reads it again from here', after.primary === 'site.zip');
    await t.key('i');
    const again = await t.waitFor((T) => T.S.interior && { mtime: T.S.interior.mtime, m: T.S.interior.host.m }, { timeout: 8000 });
    t.check(`I reads it again: listed at its new time (${new Date(again.mtime).toISOString()}), the tree's time too`, again.mtime === at.getTime() && again.m === at.getTime() && again.mtime !== was, JSON.stringify({ was, again }));
    await t.key('Escape');
    await t.waitFor((T) => !T.S.primary);
    await t.key('Escape');
    await t.waitFor((T) => !T.S.interior);
    const posts = t.requests(mark).filter((r) => r.method === 'POST');
    t.check('nothing was sent to change anything', posts.length === 0, JSON.stringify(posts));
    await t.app(() => { window.__liveObs?.disconnect(); window.__noteObs?.disconnect(); return true; });
  },
};

export default [service, chamber, disk];
