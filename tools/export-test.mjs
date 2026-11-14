#!/usr/bin/env node
/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Export Test (Terrane Edition - v1.0)
 *     - File Name: export-test.mjs
 *     - Relative Path: tools/export-test.mjs
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
 *     Runs the browser's CSV module (web/js/csv.js) in Node and reads what
 *     it writes back with a strict RFC 4180 parser, so a list exported
 *     from Terrane is proved to open in a spreadsheet as the rows it
 *     listed. The names come from a fresh fixture, scanned by the
 *     service's own scanner, and from a set of names made to break CSV.
 *
 * ✒ Key Features:
 *     - Quoting: a comma, a double quote, a CR or an LF quotes the cell
 *       and doubles its quotes; every other cell is written bare
 *     - Formula injection: = + - @, a tab or a CR at the start of a text
 *       cell gets an apostrophe; a number never does
 *     - The text starts with the UTF-8 byte order mark, every record
 *       ends in CRLF, and no LF or CR stands outside a quoted cell
 *     - Every file and folder of a fresh fixture (Unicode, emoji, quotes,
 *       a leading dash, a 200-character name) round-trips through toCSV
 *       and the parser cell for cell
 *     - The columns: kind labels ('folder' or the kind's label), sizes as
 *       integers, modified as ISO 8601 in UTC or empty, paths as relLabel
 *       gives them, an archive entry's x.zip!/inner/file included
 *     - Duplicate rows carry group and confirmed; sealed rows the error
 *     - File names: slugs of any script, an ISO date, and the parts in
 *       order; csv.js touches no DOM; exports.js installs as a feature
 *
 * ✒ Usage Instructions:
 *     node tools/export-test.mjs
 *     npm test runs it after the batch rename test.
 *
 * ✒ Other Important Information:
 *     - Dependencies: Node.js 22.5+; web/js/csv.js, web/js/model.js,
 *       web/js/exports.js, server/scan.mjs, tools/make-fixture.mjs
 *     - Compatible platforms: Windows, macOS, Linux
 *     - Performance: a 120-file fixture in the OS temp folder, removed
 *       afterwards; a few seconds
 *     - Exit code 0 means every check passed
 * ----------------------------------------------------------------------------
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.join(HERE, '..', 'web', 'js');
const C = await import(new URL('../web/js/csv.js', import.meta.url).href);
const { Model, KINDS } = await import(new URL('../web/js/model.js', import.meta.url).href);
const { scan } = await import(new URL('../server/scan.mjs', import.meta.url).href);
const { makeFixture, unseal } = await import(new URL('./make-fixture.mjs', import.meta.url).href);

let passed = 0;
let failed = 0;
const check = (name, cond, detail = '') => {
  if (cond) passed++;
  else failed++;
  console.log(`${cond ? '  ok  ' : ' FAIL '} ${name}${cond || !detail ? '' : ' — ' + detail}`);
};
const section = (title) => console.log(`\n${title}`);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/**
 * A strict RFC 4180 reader: { rows, bom, problems }. Outside quotes a CR
 * must be followed by an LF and an LF must follow a CR; a quote may only
 * open a cell, and inside one only a doubled quote or the closing quote
 * before a comma or the end of the record. Every record must end in CRLF.
 */
function parseCSV(text) {
  const problems = [];
  const bom = text.startsWith('\uFEFF');
  const s = bom ? text.slice(1) : text;
  const rows = [];
  let row = [];
  let cell = '';
  let i = 0;
  let quoted = false;
  let fresh = true;
  while (i < s.length) {
    const ch = s[i];
    if (quoted) {
      if (ch === '"') {
        if (s[i + 1] === '"') {
          cell += '"';
          i += 2;
          continue;
        }
        quoted = false;
        i++;
        if (i < s.length && s[i] !== ',' && s[i] !== '\r') problems.push(`text after a closing quote at ${i}`);
        continue;
      }
      cell += ch;
      i++;
      continue;
    }
    if (ch === '"') {
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
  if (quoted) problems.push('a quote left open at the end');
  if (cell !== '' || row.length) problems.push('the last record does not end in CRLF');
  return { rows, bom, problems };
}

/** A cell as toCSV must write it, read back: the text, with an apostrophe before a risky start. */
const expected = (v) => (typeof v === 'number' ? String(v) : /^[=+\-@\t\r]/.test(String(v)) ? `'${v}` : String(v));

/* ---------- cells ---------- */

section('Cells and quoting');
{
  const cases = [
    ['plain.txt', 'plain.txt'],
    ['a, b.txt', '"a, b.txt"'],
    ['say "hi".txt', '"say ""hi"".txt"'],
    ['line\nbreak.txt', '"line\nbreak.txt"'],
    ['carriage\rreturn', '"carriage\rreturn"'],
    ["quote's name.txt", "quote's name.txt"],
    ['', ''],
  ];
  const wrong = cases.filter(([v, want]) => C.cell(v) !== want).map(([v]) => JSON.stringify(v));
  check('a comma, a double quote, a CR or an LF quotes the cell and doubles its quotes; nothing else is quoted', wrong.length === 0, wrong.join(', '));
  const risky = [['=SUM(A1:A9).csv', "'=SUM(A1:A9).csv"], ['+1 plus.txt', "'+1 plus.txt"], ['-leading-dash.txt', "'-leading-dash.txt"], ['@home', "'@home"], ['\ttabbed', "'\ttabbed"],
    ['\rreturn', `"'\rreturn"`], ['=HYPERLINK("http://x","y")', `"'=HYPERLINK(""http://x"",""y"")"`], ['a=b', 'a=b'], ['x-y', 'x-y']];
  const bad = risky.filter(([v, want]) => C.cell(v) !== want).map(([v]) => `${JSON.stringify(v)} -> ${JSON.stringify(C.cell(v))}`);
  check('a text cell beginning with = + - @, a tab or a CR gets an apostrophe, and is quoted when it must be; one with them inside does not', bad.length === 0, bad.join(', '));
  check('numbers are written as they are, a negative one with no apostrophe; null, undefined and non-finite numbers are empty',
    C.cell(4096) === '4096' && C.cell(0) === '0' && C.cell(-5) === '-5' && C.cell(null) === '' && C.cell(undefined) === '' && C.cell(Infinity) === '' && C.cell(Number.NaN) === '');
}

/* ---------- the text ---------- */

section('The text: byte order mark, CRLF, round trip');
{
  const names = ['a, b.txt', 'say "hi".txt', 'line\nbreak.txt', '=SUM(A1).csv', '-leading-dash.txt', '+plus', '@at', 'plain', 'ünïcødé — naïve café.md', '日本語のファイル.txt', 'emoji 🗻 file.txt'];
  const rows = names.map((n, i) => [n, i, `path/${n}`]);
  const text = C.toCSV(['name', 'n', 'path'], rows);
  const back = parseCSV(text);
  check('the text starts with the UTF-8 byte order mark, once', text.startsWith('\uFEFF') && !text.slice(1).includes('\uFEFF') && back.bom);
  check('every record ends in CRLF and no CR or LF stands outside a quoted cell', back.problems.length === 0 && text.endsWith('\r\n'), back.problems.join('; '));
  check('the parser reads back the header and every row, cell for cell, with the apostrophes', same(back.rows, [['name', 'n', 'path'], ...rows.map((r) => r.map(expected))]),
    JSON.stringify(back.rows.slice(1, 4)));
  check('a header and no rows is one record', C.toCSV(['a', 'b'], []) === '\uFEFFa,b\r\n');
  const bytes = Buffer.from(text, 'utf8');
  check('as UTF-8 the file begins EF BB BF', bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf);
}

/* ---------- rows ---------- */

section('Rows: columns, kinds, sizes, dates, paths');
const T = Date.UTC(2026, 10, 13, 18, 30, 0, 123);
{
  const model = new Model('root');
  model.ingest([
    [0, -1, 'root', T, 0, ['report.pdf', 1234, T, 0, 'photo.JPG', 99.6, T - 1000, 0, 'tool.py', 0, 0, 0, 'mystery', 7, 1e20, 0]],
    [1, 0, 'docs, old', T - 5000, 0, ['=cmd.txt', 10, T, 0]],
    [2, 0, 'sealed', 0, 'EACCES', []],
  ], [], model.root);
  const R = model.root;
  const rel = (n) => {
    const parts = [];
    for (let a = n; a && a.p; a = a.p) parts.push(a.n);
    return parts.reverse().join('/') || '.';
  };
  const find = (n) => [...R.c, ...R.c.flatMap((c) => c.c || [])].find((x) => x.n === n);
  const { header, rows } = C.nodeRows([R, ...R.c, find('=cmd.txt')], { relLabel: rel });
  check('the columns are name, path, kind, size_bytes and modified', same(header, ['name', 'path', 'kind', 'size_bytes', 'modified']) && same(C.NODE_COLUMNS, header));
  const by = Object.fromEntries(rows.map((r) => [r[0], r]));
  check('kind is "folder" for a folder and the kind\'s label for a file', by['docs, old'][2] === 'folder' && by.root[2] === 'folder'
    && by['report.pdf'][2] === KINDS.find((k) => k.key === 'document').label && by['photo.JPG'][2] === KINDS.find((k) => k.key === 'image').label
    && by['tool.py'][2] === KINDS.find((k) => k.key === 'code').label && by.mystery[2] === 'Other', JSON.stringify(rows.map((r) => r[2])));
  check('size_bytes is an integer: a folder\'s total, a fraction rounded, an empty file 0',
    by.root[3] === Math.round(R.s) && Number.isInteger(by['photo.JPG'][3]) && by['photo.JPG'][3] === 100 && by['tool.py'][3] === 0 && by['docs, old'][3] === 10, JSON.stringify(rows.map((r) => r[3])));
  check('modified is ISO 8601 in UTC with milliseconds; 0, or a time no date can hold, is empty',
    by['report.pdf'][4] === '2026-11-13T18:30:00.123Z' && by['tool.py'][4] === '' && by.mystery[4] === '' && by.sealed[4] === '', JSON.stringify(rows.map((r) => r[4])));
  check('path is what relLabel gives: the root ".", a folder with a comma, a file below it', by.root[1] === '.' && by['docs, old'][1] === 'docs, old' && by['=cmd.txt'][1] === 'docs, old/=cmd.txt');
  const text = C.toCSV(header, rows);
  const back = parseCSV(text).rows;
  check('written and read back, the comma path stays one cell and =cmd.txt gains its apostrophe', back.find((r) => r[0] === "'=cmd.txt")?.[1] === 'docs, old/=cmd.txt' && back.find((r) => r[0] === 'docs, old')?.length === 5);

  // An open archive's entries, as api.relLabel reads them.
  const host = { n: 'site.zip', p: { n: 'archives', p: R, d: true } };
  const inner = new Model('site.zip');
  inner.ingest([[0, -1, 'site.zip', T, 0, []], [1, 0, 'site', T, 0, ['a, b.html', 5, T, 0, '"q".txt', 3, T, 0]]], [], inner.root);
  const label = (n) => {
    const parts = [];
    for (let a = n; a && a !== inner.root; a = a.p) parts.push(a.n);
    return `archives/${host.n}!/${parts.reverse().join('/')}`;
  };
  const entries = inner.root.c[0].c;
  const arch = C.nodeRows(entries, { relLabel: label });
  const archBack = parseCSV(C.toCSV(arch.header, arch.rows)).rows.slice(1);
  check('an archive entry\'s path reads x.zip!/inner/file, and a comma or a quote in it survives the round trip',
    same(archBack.map((r) => r[1]), ['archives/site.zip!/site/a, b.html', 'archives/site.zip!/site/"q".txt']), JSON.stringify(archBack));

  const groups = [
    { size: 10, files: [by['report.pdf'] && find('report.pdf'), find('tool.py')], verified: true, mode: 'full' },
    { size: 7, files: [find('mystery'), find('photo.JPG')], verified: true, mode: 'sampled' },
    { size: 5, files: [find('=cmd.txt'), find('report.pdf')], verified: false },
  ];
  const d = C.dupRows(groups, { relLabel: rel });
  check('duplicate rows add group (from 1, in the order given) and confirmed (yes, probable for samples, no)',
    same(d.header, [...C.NODE_COLUMNS, 'group', 'confirmed']) && same(d.rows.map((r) => r.slice(5)), [[1, 'yes'], [1, 'yes'], [2, 'probable'], [2, 'probable'], [3, 'no'], [3, 'no']]), JSON.stringify(d.rows.map((r) => r.slice(5))));
  const sd = C.sealedRows([find('sealed')], { relLabel: rel });
  check('sealed rows add error, the code the folder could not be read with', same(sd.header, [...C.NODE_COLUMNS, 'error']) && sd.rows[0][5] === 'EACCES' && sd.rows[0][2] === 'folder', JSON.stringify(sd.rows));
}

/* ---------- a fixture ---------- */

section('Every name of a fresh fixture, through the service\'s scanner');
{
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'terrane-export-'));
  const fx = path.join(work, 'fixture');
  try {
    await makeFixture(fx, { files: 120, seed: 7 });
    const model = new Model(path.basename(fx));
    const idMap = [];
    for await (const batch of scan(fx, { isRoot: true })) model.ingest(batch, idMap, model.root);
    const all = [];
    const stack = [model.root];
    while (stack.length) {
      const dir = stack.pop();
      for (const ch of dir.c) {
        all.push(ch);
        if (ch.d) stack.push(ch);
      }
    }
    const rel = (n) => {
      const parts = [];
      for (let a = n; a && a.p; a = a.p) parts.push(a.n);
      return parts.reverse().join('/') || '.';
    };
    const { header, rows } = C.nodeRows(all, { relLabel: rel });
    const text = C.toCSV(header, rows);
    const back = parseCSV(text);
    const unusual = ['name with  spaces.txt', 'ünïcødé — naïve café.md', '日本語のファイル.txt', 'emoji 🗻 file.txt', '-leading-dash.txt', 'x'.repeat(200) + '.txt']
      .filter((n) => all.some((x) => x.n === n));
    check(`the fixture's unusual names are in the list (${unusual.length} of 6) and its quote's name too`, unusual.length === 6 && all.some((x) => x.n.startsWith("quote's ")));
    check(`all ${rows.length} rows of the fixture are read back cell for cell`, back.problems.length === 0 && same(back.rows, [header, ...rows.map((r) => r.map(expected))]),
      back.problems.slice(0, 3).join('; '));
    const dash = back.rows.find((r) => r[0] === "'-leading-dash.txt");
    check('-leading-dash.txt is written with its apostrophe, its path untouched after the folder', !!dash && dash[1] === 'edge cases/-leading-dash.txt', JSON.stringify(dash));
    const iso = back.rows.slice(1).every((r) => r[4] === '' || (/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(r[4]) && !Number.isNaN(Date.parse(r[4]))));
    check('every modified cell is empty or an ISO 8601 time in UTC', iso);
    const kinds = new Set(back.rows.slice(1).map((r) => r[2]));
    check('every kind cell is "folder" or a kind\'s label', [...kinds].every((k) => k === 'folder' || KINDS.some((x) => x.label === k)), [...kinds].join(', '));
    check('every size cell is a whole number of bytes', back.rows.slice(1).every((r) => /^\d+$/.test(r[3])));
  } finally {
    unseal(fx);
    fs.rmSync(work, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  }
}

/* ---------- file names ---------- */

section('File names');
{
  const day = new Date(2026, 10, 3, 23, 59);
  check('a slug keeps letters and digits of any script, in lower case, one hyphen between runs',
    C.slug('My Projects (2026)') === 'my-projects-2026' && C.slug('日本語 フォルダ') === '日本語-フォルダ' && C.slug('Ünïcødé — Café') === 'ünïcødé-café' && C.slug('C:\\') === 'c' && C.slug('...') === '' && C.slug(null) === '',
    [C.slug('My Projects (2026)'), C.slug('日本語 フォルダ'), C.slug('Ünïcødé — Café')].join(' | '));
  check('a slug is at most its limit, without a hyphen at either end', C.slug('a'.repeat(60)).length === 48 && C.slug('ab cd ef', 3) === 'ab' && !C.slug(' -x- ').startsWith('-'));
  check('fileName joins its parts and the local day as YYYY-MM-DD, leaving out empty parts',
    C.fileName(['projects', 'contents', '', 'docs'], 'csv', day) === 'terrane-projects-contents-docs-2026-11-03.csv' && C.fileName(['places', 'x'], 'json', day) === 'terrane-places-x-2026-11-03.json'
    && C.isoDay(day) === '2026-11-03', C.fileName(['projects', 'contents', '', 'docs'], 'csv', day));
  check('no character Windows refuses in a name survives a slug', !/[<>:"/\\|?*]/.test(C.fileName([C.slug('a<b>c:d"e/f\\g|h?i*j')], 'csv', day)));
}

/* ---------- the modules ---------- */

section('The modules');
{
  const src = fs.readFileSync(path.join(WEB, 'csv.js'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  const uses = ['document', 'window', 'localStorage', 'navigator', 'Blob', 'URL'].filter((w) => new RegExp(`\\b${w}\\b`).test(src));
  check('csv.js names no browser global', uses.length === 0, uses.join(', '));
  const imports = [...src.matchAll(/from '([^']+)'/g)].map((m) => m[1]);
  check('it imports only model.js', same(imports, ['./model.js']), JSON.stringify(imports));
  const X = await import(new URL('../web/js/exports.js', import.meta.url).href);
  check('exports.js exports a name and install(api) for features.js', X.name === 'Export lists' && typeof X.install === 'function');
  const features = fs.readFileSync(path.join(WEB, 'features.js'), 'utf8');
  check('features.js lists it', /import \* as \w+ from '\.\/exports\.js';/.test(features));
}

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
