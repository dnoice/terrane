/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Getting Things In and Out Scenarios (Terrane Edition - v1.0)
 *     - File Name: exchange.mjs
 *     - Relative Path: tools/ui-scenarios/exchange.mjs
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
 *     Checks what Terrane lets out of the page and back in, in a real
 *     browser, keyboard first, with WebGL on and off: lists saved as CSV
 *     files and read back against the rows the ledger listed, and places
 *     saved as a file and taken in again.
 *
 * ✒ Key Features:
 *     - 'export' (read-only fixture, both passes): downloads are allowed
 *       into a temporary folder with Browser.setDownloadBehavior
 *       (allowAndName) and followed by their events; Export CSV on the
 *       Contents count row of edge cases, reached with Shift+Tab from the
 *       list and pressed with Enter, saves a file whose name, byte order
 *       mark, CRLF records and cells equal the rows listed, in their
 *       order, names that begin with a dash written with an apostrophe;
 *       the same from Findings for copy-; the Survey's Export as CSV
 *       opened with Enter on its summary and Largest files pressed; Empty
 *       folders from the command palette; an empty folder says "Nothing
 *       to export: this folder is empty." and saves nothing
 *     - 'places-file' (read-only fixture, both passes): B and H in edge
 *       cases and a saved search; Export places, reached with Tab, saves
 *       terrane-places-fixture-<day>.json holding all three for this root
 *       and the live directory; Forget all and the search forgotten;
 *       Import places… answered through the file picker
 *       (Page.setInterceptFileChooserDialog, DOM.setFileInputFiles) says
 *       "3 added, 0 updated, 0 skipped." and puts all three back, the
 *       benchmark found in the tree; a file for another root, one of the
 *       snapshot and one that is not a places file are each refused with
 *       their sentence and change nothing; the same file twice skips all
 *
 * ✒ Usage Instructions:
 *     node tools/ui-check.mjs export --port 5040 --no-shots
 *     node tools/ui-check.mjs exchange --pass nogl
 *
 * ✒ Other Important Information:
 *     - Dependencies: tools/ui-check.mjs (the context t and its page's
 *       DevTools connection); node:fs, node:os, node:path; the fixture's
 *       edge cases
 *     - Compatible platforms: Node.js 22.5+; Edge or Chrome
 * ----------------------------------------------------------------------------
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const pad = (v) => String(v).padStart(2, '0');
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/**
 * Lets the browser save downloads into a new temporary folder and follows
 * them by their events: next() resolves to the next one finished, with
 * the name the page gave it and its text; close() puts the default back.
 */
async function downloads(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'terrane-dl-'));
  const cdp = t.page.cdp;
  const named = new Map();
  const done = [];
  const off = cdp.on((msg) => {
    if (msg.method === 'Browser.downloadWillBegin') named.set(msg.params.guid, msg.params.suggestedFilename);
    else if (msg.method === 'Browser.downloadProgress' && msg.params.state === 'completed') done.push(msg.params.guid);
  });
  await cdp.send('Browser.setDownloadBehavior', { behavior: 'allowAndName', downloadPath: dir, eventsEnabled: true });
  let taken = 0;
  return {
    dir,
    /** How many have finished so far. */
    get count() { return done.length; },
    async next(timeout = 10000) {
      const end = Date.now() + timeout;
      while (done.length <= taken) {
        if (Date.now() > end) throw new Error('No download finished');
        await t.sleep(40);
      }
      const guid = done[taken++];
      return { name: named.get(guid), text: fs.readFileSync(path.join(dir, guid), 'utf8') };
    },
    async close() {
      off();
      await cdp.send('Browser.setDownloadBehavior', { behavior: 'default' }).catch(() => {});
      fs.rmSync(dir, { recursive: true, force: true });
    },
  };
}

/**
 * A strict RFC 4180 reader: { rows, bom, problems }. Outside quotes a CR
 * must be followed by an LF and no LF may stand alone; a quote may only
 * open a cell; every record must end in CRLF.
 */
function parseCSV(text) {
  const problems = [];
  const bom = text.startsWith('﻿');
  const s = bom ? text.slice(1) : text;
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  let fresh = true;
  for (let i = 0; i < s.length;) {
    const ch = s[i];
    if (quoted) {
      if (ch === '"' && s[i + 1] === '"') {
        cell += '"';
        i += 2;
      } else if (ch === '"') {
        quoted = false;
        i++;
        if (i < s.length && s[i] !== ',' && s[i] !== '\r') problems.push(`text after a closing quote at ${i}`);
      } else {
        cell += ch;
        i++;
      }
    } else if (ch === '"') {
      if (!fresh) problems.push(`a quote inside an unquoted cell at ${i}`);
      quoted = true;
      fresh = false;
      i++;
    } else if (ch === ',') {
      row.push(cell);
      cell = '';
      fresh = true;
      i++;
    } else if (ch === '\r') {
      if (s[i + 1] !== '\n') problems.push(`a CR without an LF at ${i}`);
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      fresh = true;
      i += 2;
    } else if (ch === '\n') {
      problems.push(`a bare LF at ${i}`);
      i++;
    } else {
      cell += ch;
      fresh = false;
      i++;
    }
  }
  if (quoted) problems.push('a quote left open');
  if (cell !== '' || row.length) problems.push('the last record does not end in CRLF');
  return { rows, bom, problems };
}

/** A text cell as the file must hold it: an apostrophe before = + - @, a tab or a CR. */
const guarded = (c) => (/^[=+\-@\t\r]/.test(c) ? `'${c}` : c);

/**
 * The rows the page lists now (or the nodes list() gives), as the CSV must
 * hold them: name, path, kind, size in bytes, modified.
 */
function listed(t, which = 'list') {
  return t.eval(async (w) => {
    const T = window.__terrane;
    const { KINDS } = await import(new URL('js/model.js', document.baseURI).href);
    const nodes = w === 'list' ? T.api.listItems() : w === 'largest' ? T.S.survey.largest : T.S.survey.empty;
    return nodes.map((n) => [n.n, T.api.relLabel(n), n.d ? 'folder' : KINDS[n.k].label, String(n.s > 0 ? Math.round(n.s) : 0), n.m ? new Date(n.m).toISOString() : '']);
  }, which).then((rows) => rows.map((r) => r.map((c, i) => (i === 3 ? c : guarded(c)))));
}

const HEADER = ['name', 'path', 'kind', 'size_bytes', 'modified'];

/** Goes into the folder rel, as Contents or a breadcrumb does, and waits until it is the folder you are in. */
async function goInto(t, rel) {
  const ok = await t.app((T, r) => {
    const node = T.S.model.find(r);
    if (!node?.d) return false;
    T.api.setFocus(node);
    return true;
  }, rel);
  if (!ok) throw new Error(`${rel} is not a folder in the tree`);
  const there = await t.until((T, r) => T.S.focus === T.S.model.find(r), { args: [rel], timeout: 15000 });
  if (!there) throw new Error(`the location never reached ${rel}`);
  await t.settle();
}

/** The latest notice, once one reads like want (a RegExp). */
const noticeLike = (t, want) => t.until((_T, src) => {
  const re = new RegExp(src);
  return [...document.querySelectorAll('#notices .notice-text')].map((n) => n.textContent).reverse().find((x) => re.test(x)) || null;
}, { args: [want.source], timeout: 6000 });

/* ---------- export ---------- */

const exportLists = {
  name: 'export',
  title: 'Export CSV: Contents, Findings and Survey lists saved, read back as the rows listed',
  data: 'fixture',
  async run(t) {
    await t.settle();
    const dl = await downloads(t);
    const day = today();
    try {
      // Contents of edge cases, in name order.
      await t.app((T) => {
        T.S.sort = { key: 'name', dir: 1 };
        T.S.tab = 'contents';
        T.api.drawLedger();
        return true;
      });
      await goInto(t, 'edge cases');
      await t.eval(() => document.getElementById('ledger-list').focus());
      await t.tabTo('#ledger-sub [data-k="export-csv"]', { back: true });
      const want = await listed(t);
      await t.key('Enter');
      const got = await dl.next();
      const back = parseCSV(got.text);
      t.check(`Export CSV on the Contents count row, reached with Shift+Tab and Enter, saves ${got.name}`,
        got.name === `terrane-fixture-contents-edge-cases-${day}.csv`, got.name);
      t.check('the file starts with the byte order mark, and every record ends in CRLF', back.bom && back.problems.length === 0, back.problems.join('; '));
      t.check(`its ${want.length} rows are the rows listed, in their order, cell for cell`, same(back.rows, [HEADER, ...want]),
        JSON.stringify(back.rows.slice(0, 3)));
      t.check('-leading-dash.txt is written with an apostrophe before it', back.rows.some((r) => r[0] === "'-leading-dash.txt" && r[1] === 'edge cases/-leading-dash.txt'));
      const said = await noticeLike(t, /^Exported [\d,]+ rows? to /);
      t.check(`and it says "${said}"`, said === `Exported ${want.length.toLocaleString('en-US')} rows to ${got.name}.`, said);

      // An empty folder has nothing to export.
      await goInto(t, 'edge cases/empty one');
      await t.eval(() => document.getElementById('ledger-list').focus());
      await t.tabTo('#ledger-sub [data-k="export-csv"]', { back: true });
      const before = dl.count;
      await t.key('Enter');
      const empty = await noticeLike(t, /^Nothing to export/);
      await t.sleep(600);
      t.check(`an empty folder says "${empty}" and saves nothing`, empty === 'Nothing to export: this folder is empty.' && dl.count === before, `${empty} | ${dl.count - before} saved`);

      // Findings of copy-, as listed.
      await t.key('/');
      await t.type('copy-');
      await t.waitFor((T) => T.S.search?.list.length > 0 && T.S.tab === 'findings', { what: 'the Findings of copy-' });
      await t.eval(() => document.getElementById('ledger-list').focus());
      await t.tabTo('#ledger-sub [data-k="export-csv"]', { back: true });
      const wantF = await listed(t);
      await t.key('Enter');
      const gotF = await dl.next();
      const backF = parseCSV(gotF.text);
      t.check(`Export CSV on the Findings count row saves ${gotF.name}`, gotF.name === `terrane-fixture-findings-copy-${day}.csv`, gotF.name);
      t.check(`its ${wantF.length} rows are the matches listed, in their order, their paths from the directory`,
        backF.bom && backF.problems.length === 0 && same(backF.rows, [HEADER, ...wantF]), JSON.stringify(backF.rows.slice(0, 3)));

      // The Survey: Export as CSV opened with Enter, then Largest files.
      await t.app((T) => {
        T.api.setQuery('');
        T.S.tab = 'survey';
        T.api.drawLedger();
        const ds = [...document.querySelectorAll('#ledger-rich > details')];
        const at = ds.findIndex((d) => d.classList.contains('survey-export'));
        ds[at - 1]?.querySelector('summary')?.focus();
        return true;
      });
      await t.tabTo('#ledger-rich details.survey-export > summary');
      t.check('Export as CSV is the Survey\'s last section, closed until opened', await t.eval(() => {
        const ds = [...document.querySelectorAll('#ledger-rich > details')];
        return ds.at(-1)?.classList.contains('survey-export') && !ds.at(-1).open;
      }));
      await t.key('Enter');
      await t.tabTo('#ledger-rich [data-k="export:largest"]');
      const labels = await t.eval(() => [...document.querySelectorAll('#ledger-rich .survey-export [data-k^="export:"]')].map((b) => b.textContent.replace(/ · [\d,]+$/, '')));
      t.check('it offers Largest files, Duplicate candidates, Empty folders, Sealed folders and Symbolic links',
        same(labels, ['Largest files', 'Duplicate candidates', 'Empty folders', 'Sealed folders', 'Symbolic links']), JSON.stringify(labels));
      const wantL = await listed(t, 'largest');
      await t.key('Enter');
      const gotL = await dl.next();
      const backL = parseCSV(gotL.text);
      t.check(`Largest files saves ${gotL.name} with the survey's ${wantL.length} largest files, largest first`,
        gotL.name === `terrane-fixture-largest-files-${day}.csv` && backL.problems.length === 0 && same(backL.rows, [HEADER, ...wantL]), JSON.stringify(backL.rows.slice(0, 2)));

      // The palette: Empty folders.
      await t.key('Ctrl+K');
      await t.waitFor(() => document.getElementById('dialog').open && document.activeElement?.classList.contains('palette-input'), { what: 'the palette' });
      await t.type('export empty folders');
      const top = await t.until((_T, w) => {
        const l = document.querySelector('#palette-list [aria-selected="true"] .pal-label')?.textContent;
        return l === w && l;
      }, { args: ['Export empty folders as CSV'], timeout: 3000 });
      t.check('the palette offers "Export empty folders as CSV"', top === 'Export empty folders as CSV',
        await t.eval(() => document.querySelector('#palette-list [aria-selected="true"] .pal-label')?.textContent ?? null));
      const wantE = await listed(t, 'empty');
      await t.key('Enter');
      const gotE = await dl.next();
      const backE = parseCSV(gotE.text);
      t.check(`and Enter saves ${gotE.name} with the ${wantE.length} empty folders, kind "folder"`,
        gotE.name === `terrane-fixture-empty-folders-${day}.csv` && same(backE.rows, [HEADER, ...wantE]) && wantE.every((r) => r[2] === 'folder'), JSON.stringify(backE.rows.slice(0, 2)));
    } finally {
      await dl.close();
      await t.app((T) => {
        T.api.setQuery('');
        T.S.sort = { key: 'size', dir: -1 };
        T.S.tab = 'contents';
        T.api.select(null);
        T.api.setFocus(T.S.model.root);
        return true;
      });
      await t.settle();
    }
  },
};

/* ---------- places-file ---------- */

/**
 * Presses Enter on the focused control, which opens a file picker, and
 * answers the picker with file through DevTools (Page.fileChooserOpened,
 * then DOM.setFileInputFiles), as a person choosing the file would.
 */
async function chooseFile(t, file) {
  const page = t.page;
  let opened = null;
  const off = page.cdp.on((msg) => {
    if (msg.sessionId === page.sessionId && msg.method === 'Page.fileChooserOpened') opened = msg.params;
  });
  try {
    await t.key('Enter');
    const end = Date.now() + 6000;
    while (!opened) {
      if (Date.now() > end) throw new Error('No file picker opened');
      await t.sleep(40);
    }
    await page.send('DOM.setFileInputFiles', { files: [file], backendNodeId: opened.backendNodeId });
  } finally {
    off();
  }
}

/** The places store and the saved searches as plain values. */
const placesState = (t) => t.app((T) => ({
  benchmarks: T.S.places.benchmarks.map((b) => ({ rel: b.rel, at: b.m.at, found: !!b.node })),
  ret: T.S.places.ret ? T.S.places.ret.rel : null,
  saved: T.S.searches.saved.map((x) => `${x.name}=${x.query}`),
}));

/** Forgets every benchmark, the return point and every saved search, without asking. */
const forgetEverything = (t) => t.app((T) => {
  T.S.places.clear();
  T.S.places.flush();
  for (const x of [...T.S.searches.saved]) T.S.searches.forget(x.id);
  return true;
});

/** Shows the Places tab and focuses the summary of its Export and import section. */
const toFileSection = (t) => t.app((T) => {
  T.S.tab = 'places';
  T.api.drawLedger();
  document.querySelector('#ledger-rich details.places-file > summary')?.focus();
  return document.activeElement?.matches('details.places-file > summary') ?? false;
});

const placesFile = {
  name: 'places-file',
  title: 'Places file: a benchmark, the return point and a saved search exported, forgotten, imported back; foreign files refused',
  data: 'fixture',
  async run(t) {
    await t.settle();
    await forgetEverything(t);
    const dl = await downloads(t);
    const work = fs.mkdtempSync(path.join(os.tmpdir(), 'terrane-places-'));
    await t.page.send('DOM.enable').catch(() => {});
    await t.page.send('Page.setInterceptFileChooserDialog', { enabled: true });
    try {
      // A benchmark and a return point in edge cases, and a saved search.
      await goInto(t, 'edge cases');
      await t.app((T) => {
        T.api.select(null);
        T.S.tab = 'contents';
        T.api.drawLedger();
        document.getElementById('ledger-list').focus();
        return true;
      });
      await t.key('b');
      await t.waitFor((T) => T.S.places.benchmarks.some((b) => b.rel === 'edge cases' && b.node), { what: 'the benchmark on edge cases', timeout: 8000 });
      await t.key('h');
      await t.waitFor((T) => T.S.places.ret?.rel === 'edge cases', { what: 'the return point' });
      await t.app((T) => !!T.S.searches.save('Markdown here', 'ext:md in:"edge cases"').entry);
      const start = await placesState(t);

      // Export places, reached with Tab and pressed with Enter.
      t.check('the Places tab ends with Export and import', await toFileSection(t)
        && await t.eval(() => [...document.querySelectorAll('#ledger-rich > details')].at(-1)?.classList.contains('places-file')));
      await t.tabTo('#ledger-rich [data-k="places-export"]');
      await t.key('Enter');
      const got = await dl.next();
      const root = await t.app((T) => T.S.info.root);
      let doc = null;
      try {
        doc = JSON.parse(got.text);
      } catch { /* checked below */ }
      t.check(`Export places saves ${got.name}`, got.name === `terrane-places-fixture-${today()}.json`, got.name);
      t.check('it is a places file of format 1, for this root and the live directory, dated now',
        doc?.terrane === 'places' && doc.format === 1 && doc.root === root && doc.source === 'live' && Math.abs(Date.parse(doc.exportedAt) - Date.now()) < 120000, JSON.stringify(doc && { ...doc, benchmarks: doc.benchmarks?.length }));
      t.check('with the benchmark, the return point and the saved search',
        doc?.benchmarks?.length === 1 && doc.benchmarks[0].rel === 'edge cases' && doc.ret?.rel === 'edge cases'
        && doc.searches?.length === 1 && doc.searches[0].name === 'Markdown here' && doc.searches[0].query === 'ext:md in:"edge cases"', JSON.stringify(doc?.searches));
      const saidOut = await noticeLike(t, /^Exported .* to terrane-places-/);
      t.check(`and it says "${saidOut}"`, saidOut === `Exported 1 benchmark, the return point and 1 saved search to ${got.name}.`, saidOut);
      const file = path.join(work, got.name);
      fs.writeFileSync(file, got.text);

      // Forget all, then the saved search too.
      await t.tabTo('#ledger-rich [data-k="forget-all"]', { back: true });
      await t.key('Enter');
      await t.waitFor(() => document.getElementById('dialog').open, { what: 'the Forget all question' });
      await t.tabTo('#dialog button[type=submit]');
      await t.key('Enter');
      await t.waitFor((T) => !T.S.places.benchmarks.length && !T.S.places.ret, { what: 'everything forgotten' });
      await t.app((T) => { for (const x of [...T.S.searches.saved]) T.S.searches.forget(x.id); return true; });
      const gone = await placesState(t);
      t.check('Forget all leaves no benchmark and no return point, and the saved search is forgotten', !gone.benchmarks.length && !gone.ret && !gone.saved.length, JSON.stringify(gone));

      // Import places… through the file picker.
      await toFileSection(t);
      await t.tabTo('#ledger-rich [data-k="places-import"]');
      await chooseFile(t, file);
      const saidIn = await noticeLike(t, /^Imported from /);
      t.check(`Import places… with that file says "${saidIn}"`, saidIn === `Imported from ${got.name}: 3 added, 0 updated, 0 skipped.`, saidIn);
      const back = await t.until((T) => T.S.places.benchmarks.length === 1 && T.S.places.benchmarks[0].node && T.S.places.ret && T.S.searches.saved.length === 1, { timeout: 4000 });
      const now = await placesState(t);
      t.check('the benchmark (found in the tree), the return point and the saved search are back as they were',
        !!back && same(now, start), `${JSON.stringify(now)} vs ${JSON.stringify(start)}`);
      t.check('the Places tab lists the benchmark again', await t.eval(() => [...document.querySelectorAll('#ledger-rich details.bench .nm')].some((n) => n.textContent === 'edge cases')));
      t.check('focus stays on Import places…', await t.eval(() => document.activeElement?.dataset?.k === 'places-import'));

      // Files that are not for here.
      const variant = (name, change) => {
        const f = path.join(work, name);
        fs.writeFileSync(f, JSON.stringify(change(JSON.parse(got.text))));
        return f;
      };
      const elsewhere = path.join(path.dirname(root), 'elsewhere');
      const refusals = [
        [variant('other-root.json', (d) => ({ ...d, root: elsewhere })), `This file holds places for ${elsewhere}, not ${root}. Nothing was imported.`],
        [variant('snapshot.json', (d) => ({ ...d, source: 'snapshot' })), "This file holds the snapshot's places, and these places are the live directory's: a benchmark is only compared with what it was measured from. Nothing was imported."],
        [variant('not-places.json', (d) => ({ ...d, terrane: 'view' })), 'This is not a Terrane places file.'],
      ];
      await t.app((T) => { T.S.places.clear(); T.S.places.flush(); return true; });
      for (const [f, want] of refusals) {
        await t.eval(() => document.querySelector('[data-k="places-import"]')?.focus());
        await chooseFile(t, f);
        const said = await noticeLike(t, new RegExp(`^${want.slice(0, 18).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
        const after = await placesState(t);
        t.check(`${path.basename(f)} is refused: "${said}", and nothing changes`, said === want && !after.benchmarks.length && !after.ret && after.saved.length === 1, `${said} | ${JSON.stringify(after)}`);
      }

      // The same file twice: the second time everything is skipped.
      await t.eval(() => document.querySelector('[data-k="places-import"]')?.focus());
      await chooseFile(t, file);
      await t.waitFor((T) => T.S.places.benchmarks.length === 1, { what: 'the first import of the file' });
      await t.eval(() => document.querySelector('[data-k="places-import"]')?.focus());
      await chooseFile(t, file);
      const twice = await t.until((_T, n) => [...document.querySelectorAll('#notices .notice-text')].map((x) => x.textContent).find((x) => x === `Imported from ${n}: 0 added, 0 updated, 3 skipped.`) || null, { args: [got.name], timeout: 6000 });
      const end = await placesState(t);
      t.check('importing the same file again skips all three and changes nothing', !!twice && end.benchmarks.length === 1 && end.ret === 'edge cases' && end.saved.length === 1, `${twice} | ${JSON.stringify(end)}`);
    } finally {
      await t.page.send('Page.setInterceptFileChooserDialog', { enabled: false }).catch(() => {});
      await dl.close();
      fs.rmSync(work, { recursive: true, force: true });
      await forgetEverything(t);
      await t.app((T) => {
        T.S.tab = 'contents';
        T.api.select(null);
        T.api.setFocus(T.S.model.root);
        return true;
      });
      await t.settle();
    }
  },
};

export default [exportLists, placesFile];
