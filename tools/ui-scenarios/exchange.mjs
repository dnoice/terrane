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
 *     files and read back against the rows the ledger listed.
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

export default [exportLists];
