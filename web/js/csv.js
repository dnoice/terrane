/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: CSV Tables (Terrane Edition - v1.0)
 *     - File Name: csv.js
 *     - Relative Path: web/js/csv.js
 *     - Artifact Type: javascript
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
 *     Turns lists of folders and files into CSV text a spreadsheet opens
 *     as it is, and names the file it is saved as. It touches no DOM, so
 *     the export feature and its Node check share one implementation.
 *
 * ✒ Key Features:
 *     - toCSV(header, rows): RFC 4180; a cell holding a comma, a double
 *       quote, a CR or an LF is quoted, its quotes doubled; records end
 *       in CRLF, and the text starts with a UTF-8 byte order mark so a
 *       spreadsheet reads names in any script
 *     - The OWASP rule against formula injection: a text cell that begins
 *       with = + - @, a tab or a CR gets a leading apostrophe, so a
 *       spreadsheet shows it as text instead of running it; numbers are
 *       left as they are
 *     - nodeRows: name, path (as the caller's relLabel gives it, so an
 *       archive entry reads x.zip!/inner/file), kind ('folder' or the
 *       kind's label), size_bytes (an integer) and modified (ISO 8601 in
 *       UTC, empty when unknown)
 *     - dupRows adds group (1, 2, ... in the Survey's order) and
 *       confirmed (yes, probable for a sampled comparison, or no);
 *       sealedRows adds error, the code the folder could not be read with
 *     - fileName: terrane-<parts>-YYYY-MM-DD.<ext>, from slugs that keep
 *       letters and digits of any script
 *
 * ✒ Usage Instructions:
 *     import { toCSV, nodeRows, fileName, slug } from './csv.js';
 *     const { header, rows } = nodeRows(nodes, { relLabel });
 *     const text = toCSV(header, rows);
 *     const name = fileName([slug(rootName), 'findings'], 'csv');
 *
 * ✒ Examples:
 *     cell('a, b')         ->  "a, b"
 *     cell('say "hi"')     ->  "say ""hi"""
 *     cell('=SUM(A1)')     ->  '=SUM(A1)
 *     cell('-dash.txt')    ->  '-dash.txt
 *     cell(4096)           ->  4096
 *     fileName(['projects', 'largest-files'], 'csv')
 *                          ->  terrane-projects-largest-files-2026-11-13.csv
 *
 * ✒ Other Important Information:
 *     - Dependencies: model.js (KINDS)
 *     - Compatible platforms: any browser with ES2022 modules; Node.js 22
 *     - Limitations: the apostrophe changes a name that begins with = + -
 *       or @ for a program that reads the file as data; it is the price of
 *       a file that is safe to open in a spreadsheet
 * ----------------------------------------------------------------------------
 */

import { KINDS } from './model.js';

/** The UTF-8 byte order mark the text starts with. */
export const BOM = '﻿';
const EOL = '\r\n';
/** What a spreadsheet would read as the start of a formula. */
const RISKY = /^[=+\-@\t\r]/;
const NEEDS_QUOTES = /[",\r\n]/;

/**
 * One cell as CSV. A string that begins with = + - @, a tab or a CR is
 * prefixed with an apostrophe; then a cell holding a comma, a quote, a CR
 * or an LF is quoted with its quotes doubled. A number is written as it
 * is (a non-finite one as empty), null and undefined as empty.
 */
export function cell(v) {
  if (v == null) return '';
  let s;
  if (typeof v === 'number') s = Number.isFinite(v) ? String(v) : '';
  else {
    s = String(v);
    if (RISKY.test(s)) s = `'${s}`;
  }
  return NEEDS_QUOTES.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** The CSV text of a header and rows: BOM first, every record ending in CRLF. */
export function toCSV(header, rows) {
  let out = BOM + header.map(cell).join(',') + EOL;
  for (const r of rows) out += r.map(cell).join(',') + EOL;
  return out;
}

/** The columns every list of folders and files has. */
export const NODE_COLUMNS = Object.freeze(['name', 'path', 'kind', 'size_bytes', 'modified']);

/** 'folder', or the label of a file's kind. */
export const kindLabel = (n) => (n.d ? 'folder' : KINDS[n.k]?.label ?? KINDS[KINDS.length - 1].label);

/** A modification time as ISO 8601 in UTC; empty when it is 0 or not a date. */
export function isoTime(ms) {
  if (!ms) return '';
  const d = new Date(ms);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString();
}

/** One node's row: name, path, kind, size in bytes, modified. */
export function nodeRow(n, relLabel) {
  const size = Number(n.s);
  return [n.n, relLabel(n), kindLabel(n), Number.isFinite(size) && size > 0 ? Math.round(size) : 0, isoTime(n.m)];
}

/** A list of nodes as { header, rows }, in the order given. */
export function nodeRows(nodes, { relLabel }) {
  return { header: [...NODE_COLUMNS], rows: nodes.map((n) => nodeRow(n, relLabel)) };
}

/**
 * Duplicate candidates as { header, rows }: every file of every group, the
 * group's number in the order given (from 1) and whether its copies were
 * confirmed by content: yes, probable (compared by samples), or no.
 */
export function dupRows(groups, { relLabel }) {
  const rows = [];
  groups.forEach((g, i) => {
    const confirmed = g.verified ? (g.mode === 'sampled' ? 'probable' : 'yes') : 'no';
    for (const f of g.files) rows.push([...nodeRow(f, relLabel), i + 1, confirmed]);
  });
  return { header: [...NODE_COLUMNS, 'group', 'confirmed'], rows };
}

/** Sealed folders as { header, rows }, with the error each could not be read with. */
export function sealedRows(dirs, { relLabel }) {
  return { header: [...NODE_COLUMNS, 'error'], rows: dirs.map((d) => [...nodeRow(d, relLabel), d.e ? String(d.e) : '']) };
}

/**
 * Text as a piece of a file name: lower case, letters and digits of any
 * script kept, every other run of characters one hyphen, at most max
 * characters; empty when nothing is left.
 */
export function slug(text, max = 48) {
  return String(text ?? '').normalize('NFC').toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+/, '').slice(0, max).replace(/-+$/, '');
}

/**
 * A day as YYYY-MM-DD in local time, the form a file name sorts by (never
 * the house date a person reads, which model.js's fmtDay writes).
 */
export const isoDay = (d = new Date()) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

/** terrane-<parts>-YYYY-MM-DD.<ext>; empty parts are left out. */
export function fileName(parts, ext, date = new Date()) {
  return `terrane-${[...parts.filter(Boolean), isoDay(date)].join('-')}.${ext}`;
}
