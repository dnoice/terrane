/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Demo Scenario (Terrane Edition - v1.5)
 *     - File Name: demo.mjs
 *     - Relative Path: tools/ui-scenarios/demo.mjs
 *     - Artifact Type: test
 *     - Version: 1.5.0
 *     - Date: 11/15/2026
 *     - Update: Sunday, November 15, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Changelog:
 *     - 1.5.0 (11/15/2026) [dendogg + Anthropic - Claude Opus 5.5] — The
 *       Shelf in the demo world: K on two items and Add to shelf on a
 *       folder, Move to… Archive as one change answered in the page, the
 *       shelf following, Undo following it back, and a reload keeping the
 *       shelf while the world starts afresh. The move's check and its
 *       Undo's wait for the world as well as the shelf, which follows
 *       before the folders are read again.
 *     - 1.4.0 (11/15/2026) [dendogg + Anthropic - Claude Opus 5.5] — The
 *       right panel's Cleanup tab on the demo's root, answered in the page:
 *       all four groups, the hidden-only folder counted, the decoy build
 *       not listed. After the review: Verify by content in the page, the
 *       Tidelines renders marked probable on their rows, in the note and in
 *       the confirmation.
 *     - 1.3.0 (11/14/2026) [dendogg + Anthropic - Claude Opus 5.5] — Panel
 *       B's Preview tab in the demo world: a README's numbered lines, an
 *       arrow held over 12 rows of its fullest folder read at most twice, a
 *       photo drawn from the 480 px rung (never the file's own picture),
 *       Projects/current's target selected by its button, a zip listed and
 *       a sound's player; demo-regions reads a folder's summary once its
 *       region has landed. Both end on the Inspector. Shared names its
 *       target once, Private's contents are unknown rather than counted,
 *       and the zip's packed bytes fit its size.
 *     - 1.2.0 (11/14/2026) [dendogg + Anthropic - Claude Opus 5.5] —
 *       pages(port), the stand-in GitHub Pages, is exported, so the
 *       polish scenario serves the demo world the same way. demo-regions
 *       opens it with ?regions: the world drawn from regions answered in
 *       the page, a folder's region read, a rename and its Undo read again
 *       through fresh regions, a search answered in the page whose first
 *       match Enter reveals, the Survey listed, and still no request to
 *       /api/ leaving it.
 *     - 1.1.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] —
 *       Quick look in the demo world: a README's text, a photo drawn in
 *       the page, a sound for an audio file and the film recorded in the
 *       page, each opened with P from the list.
 *     - 1.0.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] —
 *       Initial release.
 *
 * ✒ Description:
 *     Opens the repository the way GitHub Pages serves it and checks that
 *     the page runs the demo world end to end, with WebGL on and off: the
 *     survey, previews and pictures, a rename and its undo, a copy with
 *     its progress panel, a search, an archive's interior, a refusal and
 *     a download arriving, all without one request to /api/ leaving the
 *     page.
 *
 * ✒ Key Features:
 *     - A stand-in GitHub Pages: the repository root on its own port, the
 *       root page forwarding to web/ with the query kept
 *     - The world surveyed in full: the model's counts equal the world's,
 *       the status says Demo world, and the welcome notice is shown
 *     - Previews: a README's text, a photo's drawn picture, and the same
 *       picture after the photo is renamed
 *     - Operations: rename and undo, a large copy whose progress panel
 *       appears and whose result lands in the tree, Open refused with the
 *       demo's explanation
 *     - Search (is:dup), an archive's interior, and a download arriving
 *       by the event stream
 *     - Quick look on a text file, a photo, an audio file and a film
 *     - Preview on a README, a photo (from its 480 px rung), a link, a
 *       link written as its path, a sealed folder, a zip whose facts fit
 *       its size, and a sound; and, in regions, a folder's summary
 *     - Not one request to /api/ reaches the network
 *     - demo-regions: the same world in regions (?regions), with the
 *       status saying so, a folder read by its path, a rename and Undo
 *       read again, and not one request to /api/ leaving the page
 *
 * ✒ Usage Instructions:
 *     node tools/ui-check.mjs demo demo-regions [--pass webgl|nogl]
 *
 * ✒ Other Important Information:
 *     - Dependencies: tools/ui-check.mjs (the context t); node:http for the
 *       stand-in GitHub Pages, on the ui-check port plus six
 *     - Compatible platforms: Node.js 22.5+
 * ----------------------------------------------------------------------------
 */

import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };

/** The repository served as GitHub Pages serves it (the polish scenario serves it too). */
export function pages(port) {
  const server = http.createServer((req, res) => {
    let rel = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (rel.endsWith('/')) rel += 'index.html';
    const file = path.join(REPO, rel);
    if (!file.startsWith(REPO) || rel.split('/').some((p) => p.startsWith('.')) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404);
      res.end('not here');
      return;
    }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    res.end(fs.readFileSync(file));
  });
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve(server)));
}

const demo = {
  name: 'demo',
  title: 'The demo world, as GitHub Pages serves it',
  data: 'any',
  timeout: 120000,
  async run(t) {
    const port = Number(new URL(t.url).port) + 6;
    const server = await pages(port);
    try {
      const mark = t.mark();
      await t.page.send('Page.navigate', { url: `http://127.0.0.1:${port}/?still` });
      const ready = await t.until(() => {
        const T = window.__terrane;
        return !!T && !T.S.scanning && !!T.S.info?.demo && document.getElementById('splash').hidden && {
          href: location.pathname + location.search, files: T.S.model.root.fc, want: T.S.info.demo.files,
          bytes: T.S.model.root.s, wantBytes: T.S.info.demo.bytes, status: document.getElementById('status-label')?.textContent,
        };
      }, { timeout: 30000 });
      t.check(`the root page forwards to web/ with the query kept (${ready?.href})`, ready?.href === '/web/?still', JSON.stringify(ready));
      t.check(`the whole world is surveyed: ${ready?.files} files, as the world holds`, !!ready && ready.files === ready.want && ready.bytes === ready.wantBytes, JSON.stringify(ready));
      t.check('the status line says Demo world', /Demo world/.test(ready?.status || ''), ready?.status);
      await t.settle();
      await t.shot('demo-world');
      const welcome = await t.until(() => [...document.querySelectorAll('#notices .notice-text')].map((n) => n.textContent).find((x) => /demo/.test(x)) || null, { timeout: 4000 });
      t.check('a notice says this is the demo and that changes last until a reload', /made-up studio drive/.test(welcome || '') && /reload/.test(welcome || ''), welcome);

      // A README's text in the inspector.
      await t.app(() => {
        const T = window.__terrane;
        T.api.select(T.S.model.find('Projects/harbor-api/README.md'));
        return true;
      });
      const text = await t.until(() => {
        const pre = document.querySelector('#inspector-body .preview pre');
        return pre && pre.textContent !== '…' ? pre.textContent.slice(0, 120) : null;
      }, { timeout: 5000 });
      t.check('a README previews as text', /^# Read me/.test(text || ''), text);

      // A photo's picture, drawn in the page.
      const photo = await t.app(() => {
        const T = window.__terrane;
        let found = null;
        const walk = (d) => {
          for (const c of d.c) {
            if (found) return;
            if (c.d) walk(c);
            else if (/\.JPG$/.test(c.n)) found = c;
          }
        };
        walk(T.S.model.find('Photos'));
        T.api.select(found);
        return T.api.relPath(found);
      });
      const pic = await t.until(() => {
        const img = document.querySelector('#inspector-body .preview img');
        return img && img.complete && img.naturalWidth > 0 ? { src: img.src.slice(0, 22), w: img.naturalWidth } : null;
      }, { timeout: 5000 });
      await t.shot('demo-photo');
      t.check(`a photo shows a picture drawn in the page (${photo})`, /^data:image\/jpeg/.test(pic?.src || '') && pic.w >= 160, JSON.stringify(pic));

      // Rename it, see the picture follow, and undo.
      const renamed = await t.app(async (_T, rel) => {
        const T = window.__terrane;
        const res = await T.api.runOp({ type: 'rename', path: rel, name: 'renamed-in-the-demo.jpg' });
        return res?.renamed || null;
      }, photo);
      t.check('a rename goes through and the tree follows', !!renamed && await t.app((_T, rel) => !!window.__terrane.S.model.find(rel), renamed), renamed);
      await t.app((_T, rel) => {
        const T = window.__terrane;
        T.api.select(T.S.model.find(rel));
        return true;
      }, renamed);
      const pic2 = await t.until(() => {
        const img = document.querySelector('#inspector-body .preview img');
        return img && img.complete && img.naturalWidth > 0 ? img.src.slice(0, 22) : null;
      }, { timeout: 5000 });
      t.check('the renamed photo keeps its picture', /^data:image\/jpeg/.test(pic2 || ''), pic2);
      const undone = await t.app(async (_T, rel) => {
        const T = window.__terrane;
        const res = await T.api.post('undo');
        await T.api.refreshDirs(res.affected);
        return !!T.S.model.find(rel) && !T.S.model.find('Photos/renamed-in-the-demo.jpg');
      }, photo);
      t.check('undo puts the old name back', undone);

      // The Shelf: K on two items, Add to shelf on a folder, Move to… Archive, Undo, a reload.
      const SHELF = await t.app((T) => `terrane.shelf.v1|${T.S.info.root}`);
      const kept = () => t.eval((k) => (JSON.parse(localStorage.getItem(k) || '{"items":[]}').items || []).map((x) => x.rel).sort(), SHELF);
      await t.app(() => {
        const T = window.__terrane;
        T.api.selectAll(['Projects/harbor-api/README.md', 'Downloads/invoice-2026-02.pdf'].map((r) => T.S.model.find(r)));
        document.getElementById('ledger-list').focus();
        return true;
      });
      await t.key('k');
      await t.waitFor(() => /^Put 2 items on the shelf \(2 items\)\.$/.test(document.getElementById('live').textContent), { what: 'K on two items' });
      await t.app(() => {
        const T = window.__terrane;
        T.api.select(T.S.model.find('Documents/Recipes'));
        document.getElementById('view').focus();
        return true;
      });
      await t.key('Shift+F10');
      await t.waitFor(() => !document.getElementById('menu').hidden, { what: 'the menu' });
      for (let k = 0; k < 30; k++) {
        if (await t.eval(() => document.activeElement?.querySelector?.('.menu-label')?.textContent === 'Add to shelf')) break;
        await t.key('ArrowDown');
      }
      await t.key('Enter');
      await t.waitFor(() => /^Recipes is on the shelf \(3 items\)/.test(document.getElementById('live').textContent), { what: 'Add to shelf on Recipes' });
      const want = ['Documents/Recipes', 'Downloads/invoice-2026-02.pdf', 'Projects/harbor-api/README.md'];
      t.check('the Shelf gathers two items by K and a folder by Add to shelf', JSON.stringify(await kept()) === JSON.stringify(want), JSON.stringify(await kept()));
      await t.app(() => { window.__terrane.api.showBTab('shelf'); return true; });
      await t.waitFor(() => document.querySelectorAll('#b-panel-shelf .sh-row').length === 3, { what: 'the Shelf\'s rows' });
      await t.eval(() => { document.querySelector('#b-panel-shelf [data-k=move]').click(); return true; });
      await t.waitFor(() => window.__terrane.S.placing?.nodes.length === 3, { timeout: 8000, what: 'placing the three' });
      await t.app(() => {
        const T = window.__terrane;
        T.api.setQuery('Archive');
        T.S.tab = 'findings';
        T.api.drawLedger();
        return true;
      });
      await t.waitFor(() => window.__terrane.S.search?.list.some((n) => window.__terrane.api.relPath(n) === 'Archive'), { what: 'Archive in Findings' });
      await t.app(() => {
        const T = window.__terrane;
        T.api.drawLedger();
        T.api.cursorTo(T.S.search.list.find((n) => T.api.relPath(n) === 'Archive'));
        document.getElementById('ledger-list').focus();
        return true;
      });
      await t.key('Enter');
      const movedTo = await t.poll(async () => {
        const k = await kept();
        return k.every((r) => r.startsWith('Archive/')) && k;
      }, { timeout: 10000 });
      // The shelf follows the move's answer (AFTER_OP) before the folders are read again, so the world is waited for.
      const inWorld = await t.poll(() => t.app(() => !!window.__terrane.S.model.find('Archive/Recipes') && !window.__terrane.S.model.find('Documents/Recipes')), { timeout: 10000 });
      t.check(`Move to… Archive moves the three in the page, and the shelf follows them (${movedTo})`, !!movedTo && movedTo.length === 3 && inWorld, JSON.stringify(movedTo));
      await t.app((T) => { T.api.setQuery(''); return true; });
      await t.eval(() => { document.getElementById('ledger-list').focus(); return true; });
      await t.key('Ctrl+Z');
      const movedBack = await t.poll(async () => JSON.stringify(await kept()) === JSON.stringify(want), { timeout: 10000 });
      const backInWorld = await t.poll(() => t.app(() => !!window.__terrane.S.model.find('Documents/Recipes') && !window.__terrane.S.model.find('Archive/Recipes')), { timeout: 10000 });
      t.check('Undo puts them back, and the shelf follows them back', movedBack && backInWorld, JSON.stringify(await kept()));
      await t.reload();
      await t.app(() => { window.__terrane.api.showBTab('shelf'); return true; });
      const reloaded = await t.waitFor(() => {
        const rows = [...document.querySelectorAll('#b-panel-shelf .sh-row')];
        return rows.length === 3 && { rows: rows.map((r) => r.dataset.rel).sort(), gone: rows.filter((r) => r.classList.contains('is-gone')).length, count: document.querySelector('#b-tab-shelf .count')?.textContent };
      }, { timeout: 15000, what: 'the Shelf after a reload' });
      t.check(`a reload keeps the shelf, every item there in the world started afresh (${reloaded.count})`, JSON.stringify(reloaded.rows) === JSON.stringify(want) && reloaded.gone === 0 && reloaded.count === '3', JSON.stringify(reloaded));
      await t.app(() => { document.getElementById('b-tab-inspector').click(); return true; });

      // A large copy, with its progress panel.
      await t.app(() => {
        const T = window.__terrane;
        window.__copy = T.api.runOp({ type: 'copy', paths: ['Video/Projects/Tidelines (short film)/Footage'], dest: 'Archive' }).then((r) => r?.label || null);
        return true;
      });
      const panel = await t.until(() => document.getElementById('jobs')?.children.length > 0 && document.getElementById('jobs').textContent, { timeout: 5000 });
      t.check('a large copy shows its progress panel', /Copying/.test(panel || ''), panel);
      const copied = await t.until(async () => {
        const label = await window.__copy;
        return label && { label, there: !!window.__terrane.S.model.find('Archive/Footage') };
      }, { timeout: 10000 });
      t.check('and lands in the tree', /^Copied 1 item to "Archive"/.test(copied?.label || '') && copied.there, JSON.stringify(copied));

      // Search, an archive's interior, a refusal and an arrival.
      const dups = await t.app(() => {
        const T = window.__terrane;
        T.api.setQuery('is:dup');
        return T.S.search?.list.length || 0;
      });
      t.check(`is:dup finds duplicate candidates (${dups})`, dups >= 4);
      const inside = await t.app(async () => (await window.__terrane.api.get('inside', { path: 'Downloads/fonts-pack.zip' })).records.length);
      t.check(`an archive's interior is listed (${inside} folders)`, inside >= 4);
      const refused = await t.app(async () => {
        const T = window.__terrane;
        await T.api.runOp({ type: 'open', path: 'Downloads/fonts-pack.zip' });
        return [...document.querySelectorAll('#notices .notice-text')].map((n) => n.textContent).find((x) => /no file on disk/.test(x)) || null;
      });
      t.check('Open says why it cannot in the demo', !!refused, refused);
      await t.app(() => window.__terrane.demo.service.arrive());
      const arrived = await t.until(() => !!window.__terrane.S.model.find('Downloads/tide-tables-2027.pdf'), { timeout: 5000 });
      t.check('a download arriving shows up through the event stream', arrived);

      // Quick look: text, a picture, a sound and a film, all from the world.
      const look = async (rel) => {
        await t.app((T, r) => {
          const n = T.S.model.find(r);
          T.api.setFocus(n.p);
          T.S.tab = 'contents';
          T.api.drawLedger();
          T.api.select(n);
          T.api.cursorTo(n);
          document.getElementById('ledger-list').focus();
          return true;
        }, rel);
        await t.settle();
        await t.key('p');
        const seen = await t.until(() => {
          const d = document.getElementById('dialog');
          if (!d.open) return null;
          const m = d.querySelector('audio, video');
          const note = d.querySelector('.look-note')?.textContent ?? null;
          if (m && m.readyState < 1 && !note) return null;
          if (!m && !note && !d.querySelector('.look-text') && !d.querySelector('img')?.complete) return null;
          return {
            text: d.querySelector('.look-text')?.textContent.slice(0, 40) ?? null, note,
            media: m ? { tag: m.tagName.toLowerCase(), src: m.src.slice(0, 5), ready: m.readyState, duration: Math.round(m.duration || 0) } : null,
            img: d.querySelector('img')?.src.slice(0, 15) ?? null,
          };
        }, { timeout: 8000 });
        await t.key('Escape');
        await t.until(() => !document.getElementById('dialog').open, { timeout: 3000 });
        return seen;
      };
      const qText = await look('Projects/harbor-api/README.md');
      t.check('Quick look reads a text file of the world', /^# Read me/.test(qText?.text || ''), JSON.stringify(qText));
      const qPic = await look(photo);
      t.check('Quick look shows a photo drawn in the page', /^data:image\//.test(qPic?.img || ''), JSON.stringify(qPic));
      const song = await t.app((T) => {
        const pods = T.S.model.find('Music/Podcasts');
        return T.api.relPath(pods.c.find((c) => /\.mp3$/.test(c.n)));
      });
      const qSound = await look(song);
      t.check(`Quick look plays a sound for an audio file (${qSound?.media?.duration} s)`, qSound?.media?.tag === 'audio' && qSound.media.src === 'blob:' && qSound.media.ready >= 1 && !qSound.note, JSON.stringify(qSound));
      const filmReady = await t.until(() => /^blob:/.test(window.__terrane.demo.rawUrl('Video/Projects/Tidelines (short film)/Renders/Tidelines_v6_final.mp4') || ''), { timeout: 15000 });
      const qFilm = filmReady ? await look('Video/Projects/Tidelines (short film)/Renders/Tidelines_v6_final.mp4') : null;
      if (filmReady) t.check(`Quick look plays the film recorded in the page (${qFilm?.media?.tag})`, qFilm?.media?.tag === 'video' && qFilm.media.src === 'blob:' && qFilm.media.ready >= 1 && !qFilm.note, JSON.stringify(qFilm));
      else t.skip('the film in Quick look', 'this browser could not record one from a canvas');

      // Panel B's Preview tab, answered in the page.
      await previewIn(t, photo);
      // The right panel's Cleanup tab on the demo's root: all four groups.
      await cleanupIn(t);

      const asked = t.requests(mark).filter((r) => /\/api\//.test(r.url));
      t.check(`not one request to /api/ left the page (${asked.length})`, asked.length === 0, JSON.stringify(asked.slice(0, 3)));
    } finally {
      await new Promise((r) => server.close(r));
    }
    await t.page.send('Page.navigate', { url: t.url });
    await t.until((T) => !!T && !T.S.scanning && document.getElementById('splash').hidden, { timeout: 30000 });
  },
};

/** Preview's state in the page: the name its body shows once drawn whole, and what it holds. */
const pvState = () => {
  const P = document.getElementById('b-panel-preview');
  const img = P?.querySelector('.pv-picture img');
  return {
    done: P?.querySelector('.pv-pane')?.dataset.shown ?? null,
    kind: P?.querySelector('.pv-kind-words')?.textContent ?? null,
    facts: P?.querySelector('.pv-facts')?.textContent ?? null,
    lines: P?.querySelectorAll('.pv-line').length ?? 0,
    first: P?.querySelector('.pv-line')?.textContent ?? null,
    img: img ? { src: img.getAttribute('src').slice(0, 22), natural: img.naturalWidth, complete: img.complete } : null,
    caption: P?.querySelector('.pv-caption')?.textContent ?? null,
    notes: [...(P?.querySelectorAll('.pv-note') || [])].map((n) => n.textContent),
    rows: [...(P?.querySelectorAll('.pv-rows .item .nm') || [])].map((n) => n.textContent),
    heads: [...(P?.querySelectorAll('.section-title .t') || [])].map((n) => n.textContent),
    player: P?.querySelector('.pv-player audio, .pv-player video')?.tagName.toLowerCase() ?? null,
  };
};

/** Selects rel (a path) and waits until Preview has drawn it and fn(state) holds. */
async function previewOf(t, rel, fn = () => true) {
  await t.app((T, r) => {
    const n = T.S.model.find(r);
    T.api.setFocus(n.p);
    T.S.tab = 'contents';
    T.api.drawLedger();
    T.api.select(n);
    T.api.cursorTo(n);
    return true;
  }, rel);
  const name = rel.slice(rel.lastIndexOf('/') + 1);
  return t.until(`(_T, n) => { const st = (${pvState})(); return st.done === n && (${fn})(st) && st; }`, { args: [name], timeout: 8000 });
}

/** The demo's Cleanup on its root: every group seeded, the decoy build left out. */
async function cleanupIn(t) {
  await t.app((T) => {
    T.api.select(null);
    T.api.setFocus(T.S.model.root);
    return true;
  });
  await t.settle();
  await t.app((T) => { T.api.showBTab('cleanup'); return true; });
  const st = await t.waitFor(() => {
    const P = document.getElementById('b-panel-cleanup');
    if (P?.dataset.shown !== '') return false;
    return {
      groups: [...P.querySelectorAll('.cl-group')].map((g) => [g.dataset.group, Number(g.dataset.count)]),
      rows: [...P.querySelectorAll('.cl-row')].map((r) => r.dataset.rel), sum: P.querySelector('.cl-sum').textContent,
      empty: P.querySelector('[data-group=empty] .cl-note')?.textContent ?? '',
    };
  }, { timeout: 10000, what: 'Cleanup on the demo root' });
  t.check(`on the demo world Cleanup shows all four groups (${st.groups.map((g) => g.join(' ')).join(', ')}; ${st.sum})`,
    st.groups.length === 4 && st.groups.filter(([id]) => id !== 'dups').every(([, n]) => n > 0) && /^Could free /.test(st.sum)
    && !st.rows.includes('Documents/Notes/build') && /holds only hidden files/.test(st.empty), JSON.stringify(st));
  // Verify by content, answered in the page: the Tidelines renders are too
  // large to read whole, so they are probable, and said so.
  await t.app(() => { document.querySelector('#b-panel-cleanup [data-group=dups] .cl-pending .btn')?.click(); return true; });
  const dup = await t.waitFor(() => {
    const P = document.getElementById('b-panel-cleanup');
    const rows = [...P.querySelectorAll('[data-group=dups] .cl-row')].map((r) => ({ rel: r.dataset.rel, kept: r.classList.contains('is-kept'), path: r.querySelector('.path').textContent }));
    // A render suggested, and its set's kept copy: the kept row before it.
    const i = rows.findIndex((r) => !r.kept && /Tidelines_v6_final/.test(r.rel));
    let k = i;
    while (k > 0 && !rows[k].kept) k--;
    return i > 0 && rows[k].kept && { kept: rows[k], copy: rows[i], note: P.querySelector('[data-group=dups] > .cl-note')?.textContent ?? '' };
  }, { timeout: 15000, what: 'the Tidelines set verified' });
  await t.app(() => { document.querySelector('#b-panel-cleanup [data-move=dups] .btn').click(); return true; });
  const body = await t.waitFor(() => document.getElementById('dialog').open && document.querySelector('#dialog .cl-confirm')?.textContent, { timeout: 5000, what: 'the confirmation' });
  await t.key('Escape');
  await t.waitFor(() => !document.getElementById('dialog').open, { what: 'the confirmation left' });
  const keptRow = dup.kept;
  const copyRow = dup.copy;
  t.check(`the Tidelines renders, compared by samples, are probable: the kept row (${keptRow?.path}), the copy (${copyRow?.path}), the note and the confirmation say so`,
    / · probable$/.test(keptRow?.path || '') && / · a probable copy, changed /.test(copyRow?.path || '') && /probable/i.test(dup.note) && /probably, not certainly, the same/.test(body || ''),
    JSON.stringify({ dup, body }));
  await t.app((T) => {
    document.getElementById('b-tab-inspector').click();
    return true;
  });
}

/** The demo's Preview: a README, a photo from its 480 px rung, a link, a zip and a sound. */
async function previewIn(t, photo) {
  const raw = await t.app((T) => {
    window.__rawAsked = [];
    const real = T.demo.rawUrl;
    T.demo.rawUrl = (...a) => {
      window.__rawAsked.push(a[0]);
      return real(...a);
    };
    T.api.showBTab('preview');
    return T.S.bTab;
  });
  t.check('Preview is chosen in the demo world', raw === 'preview');
  const readme = await previewOf(t, 'Projects/harbor-api/README.md', (s) => s.lines > 0);
  t.check(`Preview reads the README, its lines numbered (${readme?.lines})`, readme?.kind === 'Markdown text · .md' && /^# Read me/.test(readme?.first || ''), JSON.stringify(readme));
  // An arrow held through the fullest folder of the world: the body waits
  // for the arrows to rest, so the files passed are read once or twice.
  const fullest = await t.app((T) => {
    let best = null;
    const walk = (d) => {
      for (const c of d.c) {
        if (!c.d) continue;
        const n = c.c.filter((x) => !x.d).length;
        if (!best || n > best.n) best = { rel: T.api.relPath(c), n };
        walk(c);
      }
    };
    walk(T.S.model.root);
    return best;
  });
  // From the overview the eye flies to a file of it, so the location
  // settles in the folder (without WebGL, going there sets it).
  if (t.gl) {
    await t.app((T) => { T.api.overview(); return true; });
    await t.settle();
  }
  await t.app((T, r) => {
    const dir = T.S.model.find(r);
    if (T.S.noGL) T.api.setFocus(dir);
    else T.api.reveal(dir.c.find((x) => !x.d));
    return true;
  }, fullest.rel);
  await t.until((T, r) => T.api.relPath(T.S.focus) === r, { args: [fullest.rel], timeout: 15000 });
  await t.settle();
  const rows = await t.app((T) => {
    T.S.tab = 'contents';
    T.api.drawLedger();
    const items = T.api.listItems();
    T.api.select(items[0]);
    T.api.cursorTo(items[0]);
    document.getElementById('ledger-list').focus();
    return items.map((n) => n.n);
  });
  const steps = Math.min(12, rows.length - 1);
  await t.until(`(_T, n) => (${pvState})().done === n`, { args: [rows[0]], timeout: 8000 });
  const before = await t.app(() => window.__rawAsked.length);
  for (let i = 0; i < steps; i++) await t.key('ArrowDown');
  const rested = await t.until(`(_T, n) => (${pvState})().done === n`, { args: [rows[steps]], timeout: 8000 });
  await t.sleep(300);
  const heldReads = await t.app((_T, b) => window.__rawAsked.length - b, before);
  t.note(`the demo world (${fullest.rel}, ${fullest.n} files): ↓ held over ${steps} rows, ${heldReads} read${heldReads === 1 ? '' : 's'}`);
  t.check(`an arrow held over ${steps} rows of the demo world reads at most twice (${heldReads}) and rests on the last`, !!rested && heldReads <= 2, String(heldReads));
  const pic = await previewOf(t, photo, (s) => !!s.img && s.img.complete && s.img.natural > 0);
  const viaRaw = await t.app(() => window.__rawAsked.slice());
  t.check(`a photo is drawn from its 480 px rung, never the file's own picture (${pic?.img?.natural} px wide; ${pic?.caption})`,
    /^data:image\//.test(pic?.img?.src || '') && pic.img.natural <= 480 && /^[\d,]+ × [\d,]+ px · colour #[0-9a-f]{6} · from the 480 px thumbnail$/.test(pic.caption || '') && !viaRaw.includes(photo), JSON.stringify({ pic, viaRaw }));
  const link = await previewOf(t, 'Projects/current', (s) => s.notes.length > 0);
  t.check(`Projects/current says where it points (${link?.notes[0]})`, /It points to tidepool-web, which is Projects\/tidepool-web in this directory\.$/.test(link?.notes[0] || ''), JSON.stringify(link));
  await t.eval(() => { document.querySelector('#b-panel-preview .pv-actions .btn').click(); return true; });
  const target = await t.until((T) => T.S.primary && T.api.relPath(T.S.primary) === 'Projects/tidepool-web', { timeout: 5000 });
  t.check('and its button selects Projects/tidepool-web', !!target);
  // A link whose target is written as its path names the place once.
  const shared = await previewOf(t, 'Shared', (s) => s.notes.length > 0);
  t.check(`Shared, a link at the root, names where it points once (${shared?.notes[0]})`, shared?.notes[0] === 'A symbolic link, shown and never followed. It points to Projects in this directory.', JSON.stringify(shared));
  // A sealed folder's contents are unknown, not empty: no counts.
  const sealed = await previewOf(t, 'Private', (s) => s.notes.length > 0);
  t.check(`Private, a sealed folder, says its contents are unknown rather than counting nothing (${sealed?.kind}; ${sealed?.facts})`,
    /^Sealed folder · E[A-Z]+$/.test(sealed?.kind || '') && sealed.facts === 'contents unknown' && /could not be read/.test(sealed.notes[0] || ''), JSON.stringify(sealed));
  const zip = await previewOf(t, 'Downloads/fonts-pack.zip', (s) => s.rows.length > 0);
  t.check(`a zip is listed: what it holds and its top level (${zip?.rows.slice(0, 3).join(', ')})`, zip?.heads.includes('Top level') && zip.rows.length > 0, JSON.stringify(zip));
  // Its facts agree with its size: its entries packed into the file.
  const fit = await t.app(async (T) => {
    const node = T.S.model.find('Downloads/fonts-pack.zip');
    const ins = await T.api.get('inside', { path: 'Downloads/fonts-pack.zip' });
    return { size: node.s, packed: ins.packed, unpacked: ins.unpacked, files: ins.files, shown: document.querySelector('#b-panel-preview .pv-body .facts')?.textContent ?? '' };
  });
  t.check(`and its packed bytes fit its size (${fit.shown})`, fit.packed <= fit.size && fit.size <= fit.packed + 1024 + fit.files * 512, JSON.stringify(fit));
  const song = await t.app((T) => T.api.relPath(T.S.model.find('Music/Podcasts').c.find((c) => /\.mp3$/.test(c.n))));
  const sound = await previewOf(t, song, (s) => !!s.player);
  t.check(`a sound gets the browser's player, with the demo's note (${sound?.notes.at(-1)})`, sound?.player === 'audio' && /tone made in the page/.test(sound.notes.at(-1) || ''), JSON.stringify(sound));
  await t.app((T) => {
    document.getElementById('b-tab-inspector').click();
    T.api.select(null);
    return true;
  });
}

/**
 * The demo world drawn in regions (?regions): the demo service answers the
 * region routes in the page from its own world, so the region path runs
 * with no service, decoded on the main thread, and still asks nothing of
 * the network.
 */
const demoRegions = {
  name: 'demo-regions',
  title: 'The demo world in regions (?regions), with no service',
  data: 'any',
  timeout: 120000,
  async run(t) {
    const port = Number(new URL(t.url).port) + 6;
    const server = await pages(port);
    try {
      const mark = t.mark();
      await t.page.send('Page.navigate', { url: `http://127.0.0.1:${port}/?still&regions` });
      const ready = await t.until(() => {
        const T = window.__terrane;
        return !!T && !T.S.scanning && !!T.S.regions && document.getElementById('splash').hidden && {
          href: location.pathname + location.search, entries: T.S.regions.entries, held: T.S.regions.held, files: T.S.model.root.fc, want: T.S.info.demo.files,
          rootHeld: T.S.model.root.u === false, boxes: T.S.layout?.n ?? 0, status: document.getElementById('status').textContent, label: document.getElementById('status-label').textContent,
        };
      }, { timeout: 30000 });
      t.check(`?regions draws the demo world in regions: the root's region held, ${ready?.held} of ${ready?.entries} entries`, !!ready && ready.rootHeld && ready.held < ready.entries && ready.files === ready.want, JSON.stringify(ready));
      t.check('the status line says Demo world and Regions', /Demo world/.test(ready?.label || '') && /Regions/.test(ready?.status || ''), JSON.stringify(ready));
      if (t.gl) t.check(`the overview drew boxes (${ready?.boxes})`, ready?.boxes > 10);
      await t.settle();

      // A folder by its path, its region asked for and listed.
      await t.app((T) => { T.api.resolve('Projects/harbor-api').then((n) => T.api.setFocus(n, { remember: false })); return true; });
      const there = await t.until((T) => {
        const f = T.api.relPath(T.S.focus);
        return (f === 'Projects/harbor-api' || f.startsWith('Projects/harbor-api/')) && T.S.focus.u === false && T.list.items.length === T.api.kids(T.S.focus) && { f, n: T.list.items.length };
      }, { timeout: 15000 });
      t.check(`going to Projects/harbor-api reads its region and lists it (${there?.f}, ${there?.n} items)`, !!there);

      // A rename and its undo, read again through the region routes.
      const renamed = await t.app(async (T) => {
        const res = await T.api.runOp({ type: 'rename', path: 'Projects/harbor-api/README.md', name: 'README-renamed.md' });
        const dir = T.S.model.find('Projects/harbor-api');
        return { ok: !!res, names: dir ? dir.c.map((c) => c.n) : [] };
      });
      t.check('a rename is read again in its region: the new name, not the old', renamed.ok && renamed.names.includes('README-renamed.md') && !renamed.names.includes('README.md'), JSON.stringify(renamed).slice(0, 300));
      const undone = await t.app(async (T) => {
        const res = await T.api.post('undo');
        await T.api.refreshDirs(res.affected);
        return T.S.model.find('Projects/harbor-api').c.map((c) => c.n);
      });
      t.check('Undo puts the old name back in the region', undone.includes('README.md') && !undone.includes('README-renamed.md'));

      // Preview's summary of a folder whose region is not held yet.
      const unheld = await t.app((T) => {
        T.api.showBTab('preview');
        const dir = T.S.model.find('Music');
        return dir ? { u: !!dir.u, n: T.api.kids(dir) } : null;
      });
      const summary = await t.app((T) => {
        const dir = T.S.model.find('Music');
        T.api.select(dir);
        return true;
      }).then(() => t.until(`(_T) => { const st = (${pvState})(); return st.done === 'Music' && st.rows.length > 0 && st; }`, { timeout: 15000 }));
      t.check(`in regions Preview summarizes a folder once its region lands (${summary?.rows.length} largest of ${unheld?.n}${unheld?.u ? ', not held at first' : ''})`,
        !!summary && ['By kind', 'By age', 'Largest'].every((h) => summary.heads.includes(h)) && summary.rows.length === Math.min(10, unheld.n), JSON.stringify({ unheld, summary }));
      await t.app((T) => {
        document.getElementById('b-tab-inspector').click();
        T.api.select(null);
        return true;
      });

      // A search, answered in the page by the demo's own column tree, and Enter reveals.
      await t.eval(() => document.getElementById('q').focus());
      await t.type('invoice');
      const found = await t.until((T) => T.S.query === 'invoice' && T.S.search?.regions && T.S.tab === 'findings' && T.list.items.length > 0
        && { total: T.S.search.total, first: T.api.relPath(T.list.items[0]) }, { timeout: 15000 });
      t.check(`Find answers in regions: ${found?.total} matches for invoice`, found?.total >= 4, JSON.stringify(found));
      await t.eval(() => document.getElementById('ledger-list').focus());
      await t.key('Enter');
      const shown = await t.until((T, r) => T.S.primary && !T.S.primary.ref && T.api.relPath(T.S.primary) === r && T.api.isAttached(T.S.primary), { args: [found?.first], timeout: 15000 });
      t.check(`and Enter reveals the first, ${found?.first}`, !!shown);
      await t.app((T) => { T.api.setQuery(''); return true; });
      // The Survey lists, from the same tree.
      await t.app((T) => { T.S.tab = 'survey'; T.api.drawLedger(); return true; });
      const listed = await t.until((T) => T.S.survey && !T.S.survey.pending && document.querySelectorAll('#ledger-rich .item').length > 0
        && { largest: T.S.survey.largest.length, groups: T.S.survey.dupGroups.length, items: document.querySelectorAll('#ledger-rich .item').length }, { timeout: 15000 });
      t.check(`the Survey lists in regions: ${listed?.largest} largest files, ${listed?.groups} candidate groups`, listed?.largest > 0 && listed.groups > 0, JSON.stringify(listed));

      const asked = t.requests(mark).filter((r) => /\/api\//.test(r.url));
      t.check(`not one request to /api/ left the page (${asked.length})`, asked.length === 0, JSON.stringify(asked.slice(0, 3)));
    } finally {
      await new Promise((r) => server.close(r));
    }
    await t.page.send('Page.navigate', { url: t.url });
    await t.until((T) => !!T && !T.S.scanning && document.getElementById('splash').hidden, { timeout: 30000 });
  },
};

export default [demo, demoRegions];
