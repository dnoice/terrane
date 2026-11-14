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
 *     Drives Quick look in the real page, by keyboard where a person
 *     would, in both passes, on the default fixture: the sheet over a text
 *     file, a cut text file, a picture, a sound or film, stepping through
 *     the list and closing back to it.
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
 *
 * ✒ Usage Instructions:
 *     node tools/ui-check.mjs quicklook --no-shots --port 5020
 *
 * ✒ Other Important Information:
 *     - Dependencies: tools/ui-check.mjs (the context t); the fixture's
 *       archives/site/README.md, edge cases/copy-a.dat (300,000 bytes of
 *       text) and its random pictures and sound and film files
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

export default [quicklook];
