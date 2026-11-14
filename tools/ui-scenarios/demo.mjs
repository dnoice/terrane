/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Demo Scenario (Terrane Edition - v1.0)
 *     - File Name: demo.mjs
 *     - Relative Path: tools/ui-scenarios/demo.mjs
 *     - Artifact Type: test
 *     - Version: 1.0.0
 *     - Date: 11/13/2026
 *     - Update: Friday, November 13, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
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
 *     - Not one request to /api/ reaches the network
 *
 * ✒ Usage Instructions:
 *     node tools/ui-check.mjs demo [--pass webgl|nogl]
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

/** The repository served as GitHub Pages serves it. */
function pages(port) {
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

      const asked = t.requests(mark).filter((r) => /\/api\//.test(r.url));
      t.check(`not one request to /api/ left the page (${asked.length})`, asked.length === 0, JSON.stringify(asked.slice(0, 3)));
    } finally {
      await new Promise((r) => server.close(r));
    }
    await t.page.send('Page.navigate', { url: t.url });
    await t.until((T) => !!T && !T.S.scanning && document.getElementById('splash').hidden, { timeout: 30000 });
  },
};

export default demo;
