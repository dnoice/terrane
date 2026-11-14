/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Looking Before You Act Scenarios (Terrane Edition - v1.0)
 *     - File Name: looking.mjs
 *     - Relative Path: tools/ui-scenarios/looking.mjs
 *     - Artifact Type: test
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
 *     Drives looking before you act in the real page, by keyboard where a
 *     person would, in both passes, on the default fixture: Quick look over
 *     a text file, a cut text file, a picture, a sound or film, stepping
 *     through the list and closing back to it; the selection's total, the
 *     quick searches and the Untouched order; and Changed with it, a
 *     file's working session in the inspector, the menu and the palette.
 *
 * ✒ Key Features:
 *     - quicklook: P on a text file in the list opens the sheet with focus
 *       in its body, the gutter numbering exactly the file's lines and the
 *       head saying where the file stands; ArrowRight moves the selection
 *       and the list's cursor together; a text file over 256 KB says it
 *       was cut; a picture shows a thumbnail or the file itself asked for
 *       at 2 MB at most, with no other file fetched; a sound or film is
 *       answered 206 in byte ranges; Escape gives focus back to the list;
 *       P on a folder says why nothing opened; the inspector's button
 *       opens it too; no raw request ever asks for more than 2 MB
 *     - presets: Quick searches stands after Working sessions, closed;
 *       opened, each count and size equals runSearch on its query; Enter
 *       runs one into Findings and says what it found; Ctrl+ArrowDown and
 *       Space select two rows and the count row shows their total, which
 *       a single selection hides; Untouched equals the medianStep order,
 *       reverses on Enter, and four keys fit a 252 px ledger on one line
 *     - changed-with: a file of the fixture's stamped session shows
 *       session 1 in the inspector, its sentence, its 8 sessionmates
 *       nearest in time with their times and itself marked in its place;
 *       Show all puts session:1 in Find; the menu (Shift+F10) and the
 *       palette offer it; a file under a dot-folder and the oldest file,
 *       changed alone, say why they are in none, the menu item unavailable
 *       with the reason "changed alone"
 *
 * ✒ Usage Instructions:
 *     node tools/ui-check.mjs quicklook presets changed-with --no-shots --port 5020
 *
 * ✒ Other Important Information:
 *     - Dependencies: tools/ui-check.mjs (the context t); the fixture's
 *       archives/site/README.md, edge cases/copy-a.dat (300,000 bytes of
 *       text), its random pictures and sound and film files, and its
 *       stamped working session with the file under .cache beside it;
 *       the page's js/model.js and js/relations.js for reference values
 *     - Compatible platforms: Node.js 22.5+
 * ----------------------------------------------------------------------------
 */

import fs from 'node:fs';

const RAW_IMAGE_MAX = 2 * 1024 * 1024;

/** Quick look as it stands: open, its head, its body and where focus is. */
const lookState = () => {
  const dlg = document.getElementById('dialog');
  const a = document.activeElement;
  return {
    open: dlg.open && dlg.classList.contains('is-look'),
    label: dlg.getAttribute('aria-label'),
    name: dlg.querySelector('.look-name')?.textContent ?? null,
    where: dlg.querySelector('.look-where:not([hidden])')?.textContent ?? null,
    cut: dlg.querySelector('.look-cut:not([hidden])')?.textContent ?? null,
    gutter: dlg.querySelector('.look-gutter')?.textContent ?? null,
    text: dlg.querySelector('.look-text')?.textContent ?? null,
    img: dlg.querySelector('.look-body img')?.getAttribute('src') ?? null,
    media: dlg.querySelector('.look-body audio, .look-body video')?.tagName.toLowerCase() ?? null,
    note: dlg.querySelector('.look-note')?.textContent ?? null,
    focus: a?.id || (typeof a?.className === 'string' ? a.className : a?.tagName) || 'body',
  };
};

/**
 * Goes to the file rel the way the palette does: flies to it (without
 * WebGL, goes to its folder), waits for the location to be its folder,
 * then shows Contents with the file selected, the list's cursor on it and
 * the list focused.
 */
async function goTo(t, rel) {
  // From the overview, as a person arriving from elsewhere would: a flight
  // from deep in another branch can frame the file without its folder
  // filling the view, and the location then stops a level above it.
  if (t.gl) {
    await t.app((T) => { T.api.overview(); return true; });
    await t.settle();
  }
  const ok = await t.app((T, r) => {
    const node = T.S.model.find(r);
    if (!node) return false;
    if (T.S.noGL) {
      T.api.setFocus(node.p);
      T.api.select(node);
    } else T.api.reveal(node);
    return true;
  }, rel);
  if (!ok) return false;
  const there = await t.until((T, r) => T.S.focus === T.S.model.find(r).p, { args: [rel], timeout: 15000 });
  if (!there) {
    const at = await t.app((T) => ({ focus: T.api.relPath(T.S.focus), primary: T.S.primary && T.api.relPath(T.S.primary), flight: !!T.S.view.flight, force: T.S.force ? [...T.S.force].map((n) => n.n) : null }));
    throw new Error(`the location never reached the folder of ${rel}: ${JSON.stringify(at)}`);
  }
  await t.settle();
  return pick(t, rel.slice(rel.lastIndexOf('/') + 1));
}

/** Shows Contents, selects the entry named n there, puts the list's cursor on it and focuses the list. */
function pick(t, n) {
  return t.app((T, name) => {
    T.S.tab = 'contents';
    T.api.drawLedger();
    const node = T.S.focus.c.find((c) => c.n === name);
    if (!node) return false;
    T.api.select(node);
    T.api.cursorTo(node);
    document.getElementById('ledger-list').focus();
    return true;
  }, n);
}

/** The /api/raw requests made since mark: { path, max, status }. */
const raws = (t, since) => t.requests(since).filter((r) => r.path === '/api/raw').map((r) => {
  const q = new URL(r.url).searchParams;
  return { path: q.get('path'), max: Number(q.get('max')), status: r.status };
});

/** Lines in a text, a final newline ending the last one rather than starting another. */
const countLines = (text) => (text ? text.split('\n').length - (text.endsWith('\n') ? 1 : 0) : 0);

/** A file by extension and size from the page's tree: the smallest above 1 KB, under limit. */
function findFile(t, exts, limit) {
  return t.app((T, list, lim) => {
    let best = null;
    const stack = [T.S.model.root];
    while (stack.length) {
      for (const c of stack.pop().c) {
        if (c.d) {
          if (!c.n.startsWith('.')) stack.push(c);
        } else {
          const ext = c.n.includes('.') ? c.n.slice(c.n.lastIndexOf('.') + 1).toLowerCase() : '';
          if (list.includes(ext) && c.s > 1024 && c.s <= lim && !(c.f & 1) && (!best || c.s < best.s)) best = c;
        }
      }
    }
    return best && { rel: T.api.relPath(best), dir: T.api.relPath(best.p), name: best.n, size: best.s };
  }, exts, limit);
}

/* ---------- quicklook ---------- */

const quicklook = {
  name: 'quicklook',
  title: 'Quick look: P shows the selected file, the arrows step through the list',
  data: 'fixture',
  async run(t) {
    await t.settle();
    const start = t.mark();

    // A text file of known lines.
    const README = 'archives/site/README.md';
    t.check('the fixture holds archives/site/README.md', await goTo(t, README));
    await t.key('p');
    await t.waitFor(() => {
      const dlg = document.getElementById('dialog');
      return dlg.open && !!dlg.querySelector('.look-gutter');
    }, { what: 'the README in Quick look' });
    const first = await t.eval(lookState);
    await t.shot('quicklook-text');
    const want = countLines(fs.readFileSync(t.abs(README), 'utf8'));
    const files = await t.app((T) => T.S.focus.c.filter((c) => !c.d).length);
    const gutter = first.gutter.split('\n');
    t.check(`P on a text file in the list opens Quick look, named for it, with focus in its body (${first.focus})`,
      first.open && first.name === 'README.md' && first.label === 'Quick look: README.md' && /look-body/.test(first.focus), JSON.stringify(first).slice(0, 300));
    t.check(`the gutter numbers exactly the file's ${want} lines, beside the text`,
      gutter.length === want && gutter.at(-1) === String(want) && first.text === fs.readFileSync(t.abs(README), 'utf8'), JSON.stringify(gutter));
    t.check(`the head says where the file stands (${first.where})`, new RegExp(`^\\d+ of ${files} files? in Contents$`).test(first.where || ''), first.where);
    t.check('a short file says nothing was cut', first.cut === null, first.cut);

    // ArrowRight: the next file, selected, with the list's cursor on it.
    const order = await t.app((T) => T.api.listItems().filter((n) => !n.d).map((n) => n.n));
    const at = order.indexOf('README.md');
    await t.key('ArrowRight');
    const moved = await t.waitFor((T, n) => T.S.primary?.n === n && {
      primary: T.S.primary.n, cursor: T.list.items[T.list.cursor]?.n, sel: T.S.sel.size,
      name: document.querySelector('#dialog .look-name')?.textContent, live: document.getElementById('live').textContent,
    }, { args: [order[(at + 1) % order.length]], what: 'the next file' }).catch(async () => t.app((T) => ({ primary: T.S.primary?.n, cursor: T.list.items[T.list.cursor]?.n })));
    if (at < order.length - 1) {
      t.check(`ArrowRight moves the selection and the list's cursor to the next file, ${order[at + 1]}, and says it`,
        moved.primary === order[at + 1] && moved.cursor === order[at + 1] && moved.sel === 1 && moved.name === order[at + 1] && moved.live?.startsWith(order[at + 1]), JSON.stringify(moved));
      await t.key('ArrowLeft');
      await t.waitFor((T) => T.S.primary?.n === 'README.md', { what: 'README.md again' });
    } else t.skip('ArrowRight steps to the next file', 'README.md is the last file listed');
    await t.key('Home');
    const home = await t.waitFor((T, n) => T.S.primary?.n === n && document.querySelector('#dialog .look-name')?.textContent === n, { args: [order[0]], what: 'the first file' }).catch(() => false);
    await t.key('ArrowLeft');
    const said = await t.live();
    t.check('Home goes to the first file, and ArrowLeft there says First file', !!home && said === 'First file', said);
    await t.key('End');
    await t.waitFor((T, n) => T.S.primary?.n === n, { args: [order.at(-1)], what: 'the last file' });
    await t.key('ArrowRight');
    t.check('End goes to the last file, and ArrowRight there says Last file', (await t.live()) === 'Last file', await t.live());

    // Escape gives focus back to the list.
    await t.key('Escape');
    const shut = await t.waitFor(() => !document.getElementById('dialog').open && { focus: document.activeElement?.id || 'body' }, { what: 'Quick look to close' });
    t.check(`Escape closes it and focus goes back to the list (${shut.focus})`, shut.focus === 'ledger-list', JSON.stringify(shut));

    // A text file over 256 KB is cut, and says so.
    await goTo(t, 'edge cases/copy-a.dat');
    await t.key('p');
    const cut = await t.waitFor(() => {
      const dlg = document.getElementById('dialog');
      return dlg.open && dlg.querySelector('.look-gutter') && { cut: dlg.querySelector('.look-cut:not([hidden])')?.textContent ?? null, len: dlg.querySelector('.look-text').textContent.length };
    }, { what: 'copy-a.dat in Quick look' });
    await t.shot('quicklook-cut');
    t.check(`a text file over 256 KB says only its first 256 KB is shown (${cut.cut})`, cut.cut === 'First 256 KB of 293 KB' && cut.len <= 262144 && cut.len > 200000, JSON.stringify(cut));
    await t.key('p');
    await t.waitFor(() => !document.getElementById('dialog').open, { what: 'P to close it' });
    t.check('P closes it again, focus on the list', (await t.eval(() => document.activeElement?.id)) === 'ledger-list');

    // P on a folder says why nothing opened.
    await pick(t, 'strata-old');
    await t.key('p');
    await t.sleep(150);
    const folder = { open: await t.eval(() => document.getElementById('dialog').open), live: await t.live() };
    t.check('P on a folder opens nothing and says why', !folder.open && folder.live === 'Quick look shows files. strata-old is a folder.', JSON.stringify(folder));

    // A picture: a thumbnail, or the file itself at 2 MB at most, and nothing else.
    const pic = await findFile(t, ['png', 'jpg', 'jpeg', 'gif', 'webp'], RAW_IMAGE_MAX);
    if (pic) {
      await goTo(t, pic.rel);
      const before = t.mark();
      await t.key('p');
      const shown = await t.waitFor(() => {
        const dlg = document.getElementById('dialog');
        const img = dlg.open && dlg.querySelector('.look-body img');
        const note = dlg.querySelector('.look-note')?.textContent;
        return (img || note) && { src: img ? img.getAttribute('src') : null, note: note ?? null };
      }, { what: 'the picture in Quick look' });
      await t.sleep(400);
      const asked = raws(t, before);
      const thumbs = t.requests(before).filter((r) => r.path === '/api/thumb').map((r) => new URL(r.url).searchParams.get('path'));
      // The fixture's pictures are zeros, so the file itself fails to
      // decode and the sheet says so; what counts is what was asked for.
      t.check(`a picture shows its thumbnail, or the file itself asked for at 2 MB at most (${pic.name}, ${pic.size} B; ${shown.note || 'shown'})`,
        thumbs.includes(pic.rel) || asked.some((r) => r.path === pic.rel && r.max > 0 && r.max <= RAW_IMAGE_MAX), JSON.stringify({ shown, asked, thumbs }));
      t.check('and nothing but that file is fetched: no neighbour ahead of time',
        asked.every((r) => r.path === pic.rel) && thumbs.every((p) => p === pic.rel), JSON.stringify({ asked, thumbs }));
      await t.key('Escape');
      await t.waitFor(() => !document.getElementById('dialog').open);
    } else t.skip('a picture in Quick look', 'the fixture holds no picture of 1 KB to 2 MB');

    // A sound or a film: the player asks in byte ranges and gets 206.
    const clip = await findFile(t, ['mp3', 'wav', 'flac', 'ogg', 'm4a', 'mp4', 'webm', 'mov'], 4 * 1024 * 1024);
    if (clip) {
      await goTo(t, clip.rel);
      const before = t.mark();
      await t.key('p');
      const player = await t.waitFor(() => {
        const dlg = document.getElementById('dialog');
        const m = dlg.open && dlg.querySelector('.look-body audio, .look-body video');
        const note = dlg.querySelector('.look-note')?.textContent;
        return (m || note) && { tag: m ? m.tagName.toLowerCase() : null, autoplay: m ? m.autoplay : null, preload: m?.getAttribute('preload') ?? null, note: note ?? null };
      }, { what: 'the player in Quick look' });
      const ranged = await t.poll(() => raws(t, before).find((r) => r.path === clip.rel && r.status === 206), { timeout: 8000 });
      t.check(`a sound or film gets the browser's player, preload metadata and no autoplay (${clip.name})`,
        player.tag ? player.preload === 'metadata' && player.autoplay === false : player.note === 'This file could not be played here.', JSON.stringify(player));
      t.check('its request was answered 206, a byte range', !!ranged, JSON.stringify(raws(t, before)));
      const after = await t.until(() => document.querySelector('#dialog .look-note')?.textContent ?? document.querySelector('#dialog .look-body audio, #dialog .look-body video')?.tagName, { timeout: 3000 });
      t.note(`the fixture's ${clip.name} holds no sound, so the player ends at: ${after}`);
      await t.key('Escape');
      await t.waitFor(() => !document.getElementById('dialog').open);
      const playing = await t.eval(() => [...document.querySelectorAll('audio, video')].filter((m) => m.getAttribute('src') || !m.paused).length);
      t.check('closing leaves no player holding a stream', playing === 0, String(playing));
    } else t.skip('a sound or film in Quick look', 'the fixture holds no sound or film of 1 KB to 4 MB');

    // The inspector's button opens it too.
    await goTo(t, README);
    const button = await t.eval(() => [...document.querySelectorAll('#inspector-body .look-action button')].map((b) => `${b.textContent.trim()}|${b.title}`));
    t.check('the inspector offers Quick look for a file, with its key as its title', button.length === 1 && button[0] === 'Quick look|P', JSON.stringify(button));
    await t.eval(() => document.querySelector('#inspector-body .look-action button').click());
    await t.waitFor(() => document.getElementById('dialog').open && document.querySelector('#dialog .look-name')?.textContent === 'README.md', { what: 'the sheet from the inspector' });
    await t.key('Escape');
    await t.waitFor(() => !document.getElementById('dialog').open);

    const all = raws(t, start);
    t.check(`no raw request asked for more than 2 MB (${all.length} requests)`, all.every((r) => r.max <= RAW_IMAGE_MAX), JSON.stringify(all.filter((r) => r.max > RAW_IMAGE_MAX)));
    await t.app((T) => {
      T.api.select(null);
      T.api.setFocus(T.S.model.root);
      return true;
    });
    await t.settle();
  },
};

/* ---------- presets ---------- */

/** The selection's total on the count row: its text, or null while it is hidden or absent. */
const totalShown = () => {
  const s = document.querySelector('#ledger-sub [data-k="sel-total"]');
  return s && !s.hidden && s.checkVisibility() ? s.textContent : null;
};

const presets = {
  name: 'presets',
  title: 'Totals, quick searches and the Untouched order',
  data: 'fixture',
  async run(t) {
    await t.settle();

    // Quick searches: counted once opened, each as Find would count it.
    await t.app((T) => {
      T.S.tab = 'survey';
      T.api.drawLedger();
      return true;
    });
    await t.tabTo('#ledger-rich summary', { max: 120 });
    const summaries = await t.eval(() => [...document.querySelectorAll('#ledger-rich > details > summary')].map((s) => s.firstChild.textContent));
    t.check('Quick searches stands after Working sessions and before Largest files, closed',
      summaries.indexOf('Quick searches') === summaries.indexOf('Working sessions') + 1 && summaries.indexOf('Largest files') === summaries.indexOf('Quick searches') + 1
      && (await t.eval(() => [...document.querySelectorAll('#ledger-rich > details')].find((d) => d.querySelector('summary').firstChild.textContent === 'Quick searches').open)) === false,
      JSON.stringify(summaries));
    await t.tabTo('#ledger-rich details:has([data-k^="preset:"]) > summary', { max: 6 });
    await t.key('Enter');
    const rows = await t.waitFor(() => {
      const r = [...document.querySelectorAll('#ledger-rich [data-k^="preset:"]')].map((b) => ({ k: b.dataset.k, name: b.querySelector('.nm').textContent, query: b.querySelector('.path').textContent, fig: b.querySelector('.fig').textContent }));
      return r.length === 4 && r.every((x) => x.fig !== '…') && r;
    }, { what: 'the four quick searches counted' });
    await t.shot('quick-searches');
    const want = await t.app(async (T, qs) => {
      const M = await import(new URL('js/model.js', document.baseURI).href);
      return qs.map((q) => {
        const s = M.runSearch(T.S.model, M.parseQuery(q, T.api.QUERY));
        return `${M.fmtCount(s.list.length)} · ${M.fmtBytes(s.bytes)}`;
      });
    }, rows.map((r) => r.query));
    t.check(`the four rows are Big and stale, Large media, Changed this week and Empty folders, each with its query (${rows.map((r) => r.fig).join(', ')})`,
      JSON.stringify(rows.map((r) => `${r.name}|${r.query}`)) === JSON.stringify(['Big and stale|>100mb older:1y', 'Large media|kind:video,audio,image >50mb', 'Changed this week|newer:7d', 'Empty folders|is:empty is:folder']),
      JSON.stringify(rows));
    t.check('each count and size equals the search itself run in Find', JSON.stringify(rows.map((r) => r.fig)) === JSON.stringify(want), `${JSON.stringify(rows.map((r) => r.fig))} vs ${JSON.stringify(want)}`);
    await t.tabTo('#ledger-rich [data-k="preset:this-week"]', { max: 8 });
    await t.key('Enter');
    const ran = await t.waitFor((T) => T.S.query === 'newer:7d' && T.S.search && {
      tab: T.S.tab, focus: document.activeElement?.id, n: T.S.search.list.length, live: document.getElementById('live').textContent,
    }, { what: 'Changed this week in Find' });
    t.check(`Enter on Changed this week runs it into Findings, the list focused, and says what it found (${ran.live})`,
      ran.tab === 'findings' && ran.focus === 'ledger-list' && ran.n > 0 && ran.live.startsWith(`Quick search Changed this week: ${ran.n.toLocaleString('en-US')} matches, `), JSON.stringify(ran));
    const cmd = await t.app((T) => T.api.COMMANDS.get('presets').items().map((i) => i.label));
    t.check('the command palette offers each one', JSON.stringify(cmd) === JSON.stringify(['Quick search: Big and stale', 'Quick search: Large media', 'Quick search: Changed this week', 'Quick search: Empty folders']), JSON.stringify(cmd));

    // The selection's total, in Findings: Ctrl moves the cursor, Space adds.
    await t.key('Home');
    await t.key('Ctrl+ArrowDown');
    await t.key('Space');
    const two = await t.waitFor((T) => T.S.sel.size === 2 && {
      shown: (() => { const s = document.querySelector('#ledger-sub [data-k="sel-total"]'); return s && !s.hidden ? s.textContent : null; })(),
      // An item inside another selected one is counted with it (the rows of
      // a search can be a folder and a file in it).
      bytes: [...T.S.sel].filter((n) => ![...T.S.sel].some((o) => o !== n && T.api.relPath(n).startsWith(`${T.api.relPath(o)}/`))).reduce((a, n) => a + n.s, 0),
      nested: [...T.S.sel].some((n) => [...T.S.sel].some((o) => o !== n && T.api.relPath(n).startsWith(`${T.api.relPath(o)}/`))),
      live: document.getElementById('live').textContent,
    }, { what: 'two rows selected' });
    const twoWant = await t.app(async (T, b) => (await import(new URL('js/model.js', document.baseURI).href)).fmtBytes(b), two.bytes);
    t.check(`Home, Ctrl+ArrowDown and Space select two rows, and the count row shows their total (${two.shown}${two.nested ? ', one inside the other, counted once' : ''})`,
      two.shown === `2 selected · ${twoWant}` && two.live === `2 items selected, ${twoWant}`, JSON.stringify(two));
    await t.key('ArrowDown');
    await t.waitFor((T) => T.S.sel.size === 1, { what: 'one row selected' });
    t.check('a single selection hides it again', (await t.eval(totalShown)) === null);
    await t.key('Escape');

    // Contents: the total, and the Untouched order.
    await goTo(t, 'edge cases/copy-a.dat');
    await t.key('Ctrl+ArrowDown');
    await t.key('Space');
    await t.key('Ctrl+ArrowDown');
    await t.key('Space');
    const three = await t.waitFor((T) => T.S.sel.size === 3 && { shown: document.querySelector('#ledger-sub [data-k="sel-total"]')?.textContent, sel: [...T.S.sel].map((n) => n.n) }, { what: 'three rows selected' });
    await t.shot('selection-total');
    t.check(`in Contents too (${three.shown})`, /^3 selected · /.test(three.shown || ''), JSON.stringify(three));
    await t.key('Escape');
    await t.waitFor((T) => T.S.sel.size === 0);
    t.check('none selected, none shown', (await t.eval(totalShown)) === null);

    await t.tabTo('#ledger-sub .sort[title^="Longest untouched"]', { max: 120 });
    await t.key('Enter');
    const order = (T, flip) => {
      const ages = T.S.ages;
      const at = (n) => (n.d ? n.mm : n.m);
      const byName = (a, b) => a.n.localeCompare(b.n, undefined, { numeric: true, sensitivity: 'base' });
      const want = [...T.S.focus.c].sort((a, b) => (ages.medianStep(b) - ages.medianStep(a) || at(a) - at(b) || byName(a, b)) * flip).map((n) => n.n);
      const steps = [...T.S.focus.c].map((n) => ages.medianStep(n));
      return {
        sort: `${T.S.sort.key}:${T.S.sort.dir}`, got: T.list.items.map((n) => n.n), want, kinds: new Set(steps).size,
        byDate: [...T.S.focus.c].sort((a, b) => at(a) - at(b)).map((n) => n.n),
        key: (() => { const b = document.querySelector('#ledger-sub .sort[aria-pressed=true]'); return b && `${b.textContent}|${b.title}`; })(),
        focus: document.activeElement?.textContent,
      };
    };
    await t.waitFor((T) => T.S.sort.key === 'untouched', { what: 'the Untouched order' });
    const untouched = await t.app(order, 1);
    t.check(`Untouched lists the folder by typical age, longest untouched first, then the older change, then the name (${untouched.kinds} different steps)`,
      untouched.sort === 'untouched:1' && JSON.stringify(untouched.got) === JSON.stringify(untouched.want), JSON.stringify({ got: untouched.got.slice(0, 8), want: untouched.want.slice(0, 8) }));
    t.check(`its key is pressed, says its order, and keeps focus (${untouched.key})`, untouched.key === 'Untouched|Sorted longest untouched first (typical age); click to reverse' && untouched.focus === 'Untouched', JSON.stringify(untouched));
    t.note(`by Changed instead, the order would ${JSON.stringify(untouched.byDate) === JSON.stringify(untouched.got) ? 'be the same here' : 'differ'}`);
    await t.key('Enter');
    await t.waitFor((T) => T.S.sort.dir === -1, { what: 'the Untouched order reversed' });
    const back = await t.app(order, -1);
    t.check('Enter again reverses it, most recently touched first', back.sort === 'untouched:-1' && JSON.stringify(back.got) === JSON.stringify(back.want), JSON.stringify(back.got.slice(0, 8)));

    // Four sort keys still fit the narrow ledger on one line.
    const fit = await t.eval(async () => {
      const main = document.querySelector('main');
      main.style.setProperty('--ledger-w', '252px');
      // The columns ease to their new width; measure once they are there.
      await new Promise((r) => setTimeout(r, 700));
      const keys = [...document.querySelectorAll('#ledger-sub .sorts .sort')];
      const sub = document.getElementById('ledger-sub').getBoundingClientRect();
      const out = {
        n: keys.length, tops: new Set(keys.map((k) => Math.round(k.getBoundingClientRect().top))).size,
        right: Math.round(Math.max(...keys.map((k) => k.getBoundingClientRect().right))), edge: Math.round(sub.right),
        width: Math.round(document.getElementById('ledger').getBoundingClientRect().width),
      };
      main.style.removeProperty('--ledger-w');
      await new Promise((r) => setTimeout(r, 700));
      return out;
    });
    t.check(`at ${fit.width} px the four sort keys stand on one line inside the ledger`, fit.n === 4 && fit.tops === 1 && fit.right <= fit.edge, JSON.stringify(fit));
    await t.app((T) => {
      T.S.sort = { key: 'size', dir: -1 };
      T.api.select(null);
      T.api.setFocus(T.S.model.root);
      T.api.drawLedger();
      return true;
    });
    await t.settle();
  },
};

/* ---------- changed-with ---------- */

/** The inspector's Changed with it, as it stands, or null when it is not shown. */
const changedState = () => {
  const body = document.getElementById('inspector-body');
  const title = [...body.querySelectorAll('.section-title')].find((x) => x.textContent.startsWith('Changed with it'));
  if (!title) return null;
  return {
    title: title.textContent,
    note: body.querySelector('.session-note')?.textContent ?? null,
    rows: [...body.querySelectorAll('.session-near .item')].map((r) => ({
      name: r.querySelector('.nm').textContent, fig: r.querySelector('.fig').textContent, self: r.classList.contains('is-self'), button: r.tagName === 'BUTTON',
    })),
    show: [...body.querySelectorAll('.actions-grid button')].find((b) => /^Show all as session:/.test(b.textContent))?.textContent ?? null,
  };
};

/** The open context menu's items: label, and the reason when unavailable. */
const menuItems = () => [...document.querySelectorAll('#menu .menu-item')].map((b) => ({
  label: b.querySelector('.menu-label').textContent, off: b.getAttribute('aria-disabled') === 'true', why: b.querySelector('.menu-why')?.textContent ?? null,
}));

/**
 * Selects the file rel and shows it in the inspector, flying to it with
 * WebGL; the location may stop a level or two above a deep file, which
 * the inspector, the menu and the palette do not need. The list takes
 * focus, so single keys and Shift+F10 act.
 */
async function selectFile(t, rel) {
  await t.app((T, r) => {
    const node = T.S.model.find(r);
    if (T.S.noGL) {
      T.api.setFocus(node.p);
      T.api.select(node);
    } else T.api.reveal(node);
    return true;
  }, rel);
  await t.waitFor((T, r) => T.S.primary === T.S.model.find(r), { args: [rel], what: `${rel} selected` });
  await t.settle();
  await t.eval(() => document.getElementById('ledger-list').focus());
}

/** Opens the context menu for the selection from the keyboard (Shift+F10), reads it and closes it. */
async function readMenu(t) {
  await t.key('Shift+F10');
  await t.waitFor(() => !document.getElementById('menu').hidden && document.querySelectorAll('#menu .menu-item').length > 0, { what: 'the context menu' });
  const items = await t.eval(menuItems);
  await t.key('Escape');
  await t.waitFor(() => document.getElementById('menu').hidden, { what: 'the menu to close' });
  return items;
}

const changedWith = {
  name: 'changed-with',
  title: 'Changed with it: a file\'s working session in the inspector, the menu and the palette',
  data: 'fixture',
  async run(t) {
    await t.settle();
    const stamped = t.manifest.session.files;
    const mid = stamped[5];
    const name = mid.slice(mid.lastIndexOf('/') + 1);
    await selectFile(t, mid);
    const shown = await t.waitFor(changedState, { what: 'Changed with it in the inspector' });
    await t.shot('changed-with');
    const want = await t.app((T, n) => {
      const s = T.S.sessions.list[0];
      const file = s.files.find((f) => f.n === n);
      const p2 = (x) => String(x).padStart(2, '0');
      const hm = (ms) => `${p2(new Date(ms).getHours())}:${p2(new Date(ms).getMinutes())}`;
      const places = new Set(s.files.map((f) => f.p)).size;
      return {
        count: s.count, places, inFirst: !!file,
        mates: s.files.filter((f) => f !== file).map((f) => ({ n: f.n, d: Math.abs(f.m - file.m), at: hm(f.m) })),
        order: s.files.map((f) => f.n), self: hm(file.m),
      };
    }, name);
    t.check(`a file of the fixture's stamped session is in session 1 (${name}, ${want.count} files in ${want.places} places)`, want.inFirst && shown.title === 'Changed with it · session 1', JSON.stringify(shown.title));
    t.check(`the section says how many files in how many places changed when (${shown.note})`,
      (shown.note || '').startsWith(`${want.count} files in ${want.places} places changed between `), shown.note);
    const listed = shown.rows.filter((r) => !r.self);
    const self = shown.rows.filter((r) => r.self);
    const far = Math.max(...listed.map((r) => want.mates.find((m) => m.n === r.name)?.d ?? Infinity));
    const nearestLeft = Math.min(...want.mates.filter((m) => !listed.some((r) => r.name === m.n)).map((m) => m.d));
    t.check(`it lists its ${Math.min(8, want.count - 1)} sessionmates nearest in time, as buttons with their HH:MM`,
      listed.length === Math.min(8, want.count - 1) && listed.every((r) => r.button && want.mates.some((m) => m.n === r.name && m.at === r.fig)) && far <= nearestLeft,
      JSON.stringify({ listed, far, nearestLeft }));
    const order = shown.rows.map((r) => r.name);
    t.check('in the order they changed, the file itself marked in its place and not a button',
      self.length === 1 && self[0].name === name && !self[0].button && self[0].fig === want.self
      && JSON.stringify(order) === JSON.stringify(want.order.filter((n) => order.includes(n))), JSON.stringify(order));
    t.check('the context menu offers its working session', (await readMenu(t)).some((i) => i.label === 'Show its working session (session:1)' && !i.off));
    const cmd = await t.app((T) => T.api.COMMANDS.get('traverse').items()[0]);
    t.check('and so does the command palette, for the selection', cmd.label === `Show the working session of ${name}` && cmd.detail === 'session:1' && !cmd.off, JSON.stringify(cmd));

    // Show all puts session:1 in Find.
    await t.eval(() => [...document.querySelectorAll('#inspector-body .actions-grid button')].find((b) => /^Show all as session:/.test(b.textContent)).focus());
    await t.key('Enter');
    const all = await t.waitFor((T) => T.S.query === 'session:1' && T.S.search && { tab: T.S.tab, n: T.S.search.list.length, focus: document.activeElement?.id, find: document.getElementById('q').value }, { what: 'session:1 in Find' });
    t.check(`Show all as session:1 puts session:1 in Find, lists its ${all.n} files in Findings and moves to the list`,
      all.find === 'session:1' && all.tab === 'findings' && all.n === want.count && all.focus === 'ledger-list', JSON.stringify(all));
    await t.key('Escape');
    await t.waitFor((T) => !T.S.search, { what: 'the search cleared' });

    // A file under a dot-folder in the same window, and one changed alone.
    await selectFile(t, t.manifest.session.hidden);
    const dot = await t.waitFor(changedState, { what: 'Changed with it for the dot-folder file' });
    t.check(`a file under a dot-folder inside the window is in none, and says why (${dot.note})`,
      dot.title === 'Changed with it' && /folders whose names start with a dot/.test(dot.note || '') && dot.rows.length === 0 && dot.show === null, JSON.stringify(dot));
    const lone = await t.app(async (T) => {
      const R = await import(new URL('js/relations.js', document.baseURI).href);
      const list = T.S.sessions.list;
      let best = null;
      const stack = [T.S.model.root];
      while (stack.length) {
        for (const c of stack.pop().c) {
          if (c.d) { if (!(c.f & 2)) stack.push(c); } else if (c.m > 0 && !(c.f & 1) && R.sessionOf(list, c) === 0 && (!best || c.m < best.m)) best = c;
        }
      }
      return best && T.api.relPath(best);
    });
    await selectFile(t, lone);
    const alone = await t.waitFor(changedState, { what: 'Changed with it for a lone file' });
    t.check(`the oldest file changed alone says so (${lone})`,
      alone.title === 'Changed with it' && alone.note === 'Changed alone: no other file changed within 30 minutes of it.' && alone.show === null, JSON.stringify(alone));
    const offItem = (await readMenu(t)).find((i) => i.label === 'Show its working session');
    t.check('its menu item is there, unavailable, with the reason "changed alone"', !!offItem && offItem.off && offItem.why === 'changed alone', JSON.stringify(offItem));
    const offCmd = await t.app((T) => T.api.COMMANDS.get('traverse').items()[0]);
    t.check('and the palette\'s says the same', offCmd.off === 'changed alone', JSON.stringify(offCmd));
    await t.app((T) => {
      T.api.select(null);
      T.api.setFocus(T.S.model.root);
      return true;
    });
    await t.settle();
  },
};

export default [quicklook, presets, changedWith];
