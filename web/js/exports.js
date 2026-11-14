/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Export Lists (Terrane Edition - v1.1)
 *     - File Name: exports.js
 *     - Relative Path: web/js/exports.js
 *     - Artifact Type: javascript
 *     - Version: 1.1.0
 *     - Date: 11/14/2026
 *     - Update: Saturday, November 14, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Changelog:
 *     - 1.1.0 (11/14/2026) [dendogg + Anthropic - Claude Opus 5.5] — Export
 *       CSV on the Contents and Findings count rows is a 24 px icon tool
 *       (download), named Export CSV, its title saying what it saves. In
 *       region mode Findings and the Survey's lists export what the page
 *       holds and say "Exported the first N of M" when the service counted
 *       more, and a folder held in part exports its largest items and says
 *       so.
 *     - 1.0.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] —
 *       Initial release.
 *
 * ✒ Description:
 *     Saves what Terrane lists as a CSV file a spreadsheet opens: the
 *     Contents of a folder or the Findings of a search in the order
 *     shown, and the Survey's lists. The file is made in the page and
 *     handed to the browser to save, so it works in every mode, snapshot
 *     and read-only included.
 *
 * ✒ Key Features:
 *     - Export CSV on the Contents and Findings count rows: the rows
 *       listed, in the order shown (api.listItems), one per row
 *     - Survey, Export as CSV (last, closed until opened): Largest files,
 *       Duplicate candidates (with each file's group and whether it was
 *       confirmed by content), Empty folders, Sealed folders (with the
 *       error) and Symbolic links, each with its row count
 *     - The command palette offers every one of them; Contents and
 *       Findings switch the ledger to that tab first
 *     - Columns name, path, kind, size_bytes and modified (ISO 8601, UTC);
 *       paths are relative to the directory, '/' between names, and an
 *       archive entry's reads x.zip!/inner/file (csv.js)
 *     - Files named terrane-<directory>-<list>-YYYY-MM-DD.csv
 *     - One sentence for each: "Exported 1,234 rows to <file>.", or
 *       "Nothing to export: <why>." for an empty list
 *
 * ✒ Usage Instructions:
 *     Listed in features.js and installed by app.js. Press Export CSV on
 *     the count row of Contents or Findings, open Survey, Export as CSV,
 *     or Ctrl+K and "export".
 *
 * ✒ Examples:
 *     Contents of docs      terrane-projects-contents-docs-2026-11-13.csv
 *     Findings of ext:md    terrane-projects-findings-ext-md-2026-11-13.csv
 *     Survey, Largest files terrane-projects-largest-files-2026-11-13.csv
 *
 * ✒ Other Important Information:
 *     - Dependencies: csv.js, ui.js (download), model.js (fmtCount);
 *       app.js's api: S, LEDGER_SUB, SURVEY, COMMANDS, listItems,
 *       relLabel, drawLedger, section, notice, el
 *     - Compatible platforms: browsers that save a[download] links
 *     - Security: a name that begins with = + - or @ gets a leading
 *       apostrophe in the file, so a spreadsheet reads it as text
 * ----------------------------------------------------------------------------
 */

import { toCSV, nodeRows, dupRows, sealedRows, fileName, slug } from './csv.js';
import { download } from './ui.js';
import { icon } from './icons.js';
import { fmtCount } from './model.js';

export const name = 'Export lists';

const OWNER = 'exports';

/** The Survey's lists: what each holds, its file name part and why it may be empty. */
/** How many a list holds in the whole tree: in region mode the service's counts, which the lists may stop short of. */
const counted = (sv, key) => sv.counts?.[key] ?? sv[key].length;
const LISTS = Object.freeze([
  { id: 'largest', label: 'Largest files', what: 'largest-files', why: 'the survey found no files', table: (sv, o) => nodeRows(sv.largest, o), count: (sv) => sv.largest.length, total: (sv) => sv.largest.length },
  {
    id: 'duplicates', label: 'Duplicate candidates', what: 'duplicate-candidates', why: 'no files of 4 KB or more share a size', table: (sv, o) => dupRows(sv.dupGroups, o),
    count: (sv) => sv.dupGroups.reduce((a, g) => a + g.files.length, 0), total: (sv) => sv.dupGroups.reduce((a, g) => a + (g.count ?? g.files.length), 0),
  },
  { id: 'empty', label: 'Empty folders', what: 'empty-folders', why: 'every folder holds something', table: (sv, o) => nodeRows(sv.empty, o), count: (sv) => counted(sv, 'empty'), total: (sv) => counted(sv, 'empty') },
  { id: 'sealed', label: 'Sealed folders', what: 'sealed-folders', why: 'every folder was readable', table: (sv, o) => sealedRows(sv.sealed, o), count: (sv) => counted(sv, 'sealed'), total: (sv) => counted(sv, 'sealed') },
  { id: 'links', label: 'Symbolic links', what: 'symbolic-links', why: 'there are no symbolic links', table: (sv, o) => nodeRows(sv.links, o), count: (sv) => counted(sv, 'links'), total: (sv) => counted(sv, 'links') },
].map(Object.freeze));

export function install(api) {
  const { S, el } = api;
  const opts = { relLabel: (n) => api.relLabel(n) };
  const base = () => slug(S.info.name) || 'directory';

  /** Saves a table as a CSV file and says so (said(n, file) words it instead); an empty one says why there is nothing. */
  function save(what, table, why, said = null) {
    const n = table.rows.length;
    if (!n) {
      api.notice(`Nothing to export: ${why}.`, { kind: 'info' });
      return null;
    }
    const file = fileName([base(), ...what], 'csv');
    download(file, toCSV(table.header, table.rows), 'text/csv;charset=utf-8');
    api.notice(said ? said(n, file) : `Exported ${fmtCount(n)} row${n === 1 ? '' : 's'} to ${file}.`);
    return file;
  }

  /**
   * The Contents of the folder you are in, in the order shown. In region
   * mode a folder of more than 5,000 lists its largest, and the notice
   * says that is what was saved.
   */
  function exportContents() {
    const f = S.focus;
    const why = f.e ? 'this folder could not be read' : f.u ? 'this folder is still being read' : f.stub ? 'this folder has not been read yet' : 'this folder is empty';
    const said = f.tail ? (n, file) => `Exported the largest ${fmtCount(n)} of ${fmtCount(api.kids(f))} items to ${file}.` : null;
    return save(['contents', slug(api.relLabel(f))], nodeRows(api.listItems(), opts), why, said);
  }

  /**
   * The Findings of the search in Find, in the order shown. In region mode
   * the list holds the first 5,000 the service sent; when there are more,
   * the notice says how many of how many were saved.
   */
  function exportFindings() {
    if (!S.search) {
      api.notice('Nothing to export: there is no search in Find.', { kind: 'info' });
      return null;
    }
    const total = S.search.total ?? S.search.list.length;
    const said = S.search.regions ? (n, file) => (total > n
      ? `Exported the first ${fmtCount(n)} of ${fmtCount(total)} matches to ${file}; the page does not hold the rest at this size.`
      : `Exported ${fmtCount(n)} row${n === 1 ? '' : 's'} to ${file}.`) : null;
    return save(['findings', slug(S.query, 32)], nodeRows(api.listItems(), opts), 'nothing matches this search', said);
  }

  /**
   * A Survey list. In region mode the service sent the first 1,000 of each
   * (every file of a candidate group up to 12); when there are more, the
   * notice says how many of how many were saved.
   */
  function exportList(list) {
    const sv = S.survey;
    if (!sv || S.scanning || sv.pending) {
      api.notice('Nothing to export: the survey has not finished.', { kind: 'info' });
      return null;
    }
    const all = list.total(sv);
    const said = sv.regions ? (n, file) => (all > n
      ? `Exported the first ${fmtCount(n)} of ${fmtCount(all)} ${list.label.toLowerCase()}; the page does not hold the rest at this size. Saved to ${file}.`
      : `Exported ${fmtCount(n)} row${n === 1 ? '' : 's'} to ${file}.`) : null;
    return save([list.what], list.table(sv, opts), list.why, said);
  }

  /** Shows a list tab, so its rows are the ones listed, then exports them. */
  function fromTab(tab, run) {
    if (S.tab !== tab) {
      S.tab = tab;
      api.drawLedger();
    }
    return run();
  }

  // A 24 px icon tool at the count row's end; its name is Export CSV.
  const button = (run, title) => el('button', {
    class: 'btn btn-icon sub-tool', type: 'button', 'data-k': 'export-csv', 'aria-label': 'Export CSV', title: `Export CSV: ${title.charAt(0).toLowerCase()}${title.slice(1)}`, onclick: () => { run(); },
  }, icon('exportCsv'));

  // After the selection's total and Save search.
  api.LEDGER_SUB.add({
    id: 'export-contents', owner: OWNER, order: 60, tab: 'contents',
    build: () => button(exportContents, 'Save the rows listed, in this order, as a CSV file'),
  });
  api.LEDGER_SUB.add({
    id: 'export-findings', owner: OWNER, order: 60, tab: 'findings',
    build: ({ search }) => (search ? button(exportFindings, 'Save the matches listed, in this order, as a CSV file') : null),
  });

  function surveySection(sv) {
    const d = api.section('Export as CSV', '', false,
      el('p', { class: 'note', text: 'Each list as a CSV file for a spreadsheet, in UTF-8. A name that begins with = + - or @ is written with an apostrophe before it, so the spreadsheet reads it as text.' }),
      el('div', { class: 'actions export-lists' }, LISTS.map((list) => el('button', {
        class: 'btn btn-small', type: 'button', 'data-k': `export:${list.id}`, title: `Save ${list.label.toLowerCase()} as a CSV file`, onclick: () => { exportList(list); },
      }, `${list.label} · ${fmtCount(list.count(sv))}`))));
    d.classList.add('survey-export');
    return d;
  }

  // Last, after Symbolic links (50) and anything a feature adds.
  api.SURVEY.add({ id: 'export', order: 95, owner: OWNER, build: surveySection });

  api.COMMANDS.add({
    id: 'exports', owner: OWNER, section: 'Export',
    items: () => [
      { label: `Export the Contents of ${S.focus.n} as CSV`, detail: 'Export', run: () => fromTab('contents', exportContents) },
      { label: 'Export the Findings as CSV', detail: S.query.trim() || 'Export', off: S.search ? null : 'there is no search in Find', run: () => fromTab('findings', exportFindings) },
      ...LISTS.map((list) => ({
        label: `Export ${list.label.toLowerCase()} as CSV`, detail: 'Survey', off: S.survey && !S.scanning && !S.survey.pending ? null : 'once the survey has finished', run: () => exportList(list),
      })),
    ],
  });
}
