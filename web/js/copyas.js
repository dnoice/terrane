/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Copy As (Terrane Edition - v1.0)
 *     - File Name: copyas.js
 *     - Relative Path: web/js/copyas.js
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
 *     Puts names and paths on the clipboard in the forms other tools
 *     want: a bare name, a path relative to the directory Terrane was
 *     given, or the absolute path, for one item, a selection, or the
 *     folder you are in. Ctrl+C keeps copying absolute paths; these are
 *     the other forms, from the context menu and the command palette.
 *
 * ✒ Key Features:
 *     - The menu of one item: Copy name and Copy relative path, first
 *       among the features' items after Copy path
 *     - The menu of the folder you are in: Copy relative path of this
 *       folder (the directory itself reads ".")
 *     - The menu of a selection of several: Copy names and Copy relative
 *       paths, after Copy paths, one per line
 *     - The command palette: names, relative paths and paths of the
 *       selection, or of the folder you are in when nothing is selected
 *     - Relative paths are joined with '/' on every platform, and inside
 *       an open archive read dir/x.zip!/inner/file (api.relLabel)
 *     - Every copy is said in one sentence through the notice and the
 *       live region: "1 name copied to the clipboard.", "3 relative
 *       paths copied to the clipboard."; a refused clipboard says so
 *
 * ✒ Usage Instructions:
 *     Listed in features.js and installed by app.js. Open the context
 *     menu (right click, the Menu key or Shift+F10) or the palette
 *     (Ctrl+K, "copy").
 *
 * ✒ Examples:
 *     Copy name              report.pdf
 *     Copy relative path     docs/2024/report.pdf
 *     Copy relative paths    docs/a.txt and media/b.png, one per line
 *     inside an archive      archives/site.zip!/site/index.html
 *
 * ✒ Other Important Information:
 *     - Dependencies: model.js (fmtCount); app.js's api: S, MENU, COMMANDS,
 *       copyText, relLabel, absPath
 *     - Compatible platforms: browsers that grant the asynchronous
 *       clipboard to a page on 127.0.0.1 after a key or a click
 * ----------------------------------------------------------------------------
 */

import { fmtCount } from './model.js';

export const name = 'Copy as';

const OWNER = 'copyas';

/** The three forms: what each copies of a node, and its noun. */
const FORMS = Object.freeze({
  name: { one: 'name', many: 'names' },
  rel: { one: 'relative path', many: 'relative paths' },
  abs: { one: 'path', many: 'paths' },
});

export function install(api) {
  const { S } = api;

  const text = {
    name: (n) => n.n,
    rel: (n) => api.relLabel(n),
    abs: (n) => api.absPath(n),
  };

  /** Copies one form of nodes, one per line, and says how many. */
  function copy(form, nodes) {
    if (!nodes.length) return;
    const f = FORMS[form];
    const n = nodes.length;
    api.copyText(nodes.map(text[form]).join('\n'), `${fmtCount(n)} ${n === 1 ? f.one : f.many} copied to the clipboard.`,
      'The inspector shows the path.');
  }

  api.MENU.add({
    id: 'copyas', owner: OWNER, order: 10,
    items: (node) => (node
      ? [{ label: 'Copy name', icon: 'copyPath', run: () => copy('name', [node]) },
        { label: 'Copy relative path', icon: 'copyPath', run: () => copy('rel', [node]) }]
      : [{ label: 'Copy relative path of this folder', icon: 'copyPath', run: () => copy('rel', [S.focus]) }]),
    many: (nodes) => [
      { label: 'Copy names', icon: 'copyPath', run: () => copy('name', nodes) },
      { label: 'Copy relative paths', icon: 'copyPath', run: () => copy('rel', nodes) },
    ],
  });

  api.COMMANDS.add({
    id: 'copyas', owner: OWNER, section: 'Copy as',
    items: () => {
      const nodes = S.sel.size ? [...S.sel] : [S.focus];
      const n = nodes.length;
      const of = S.sel.size ? (n === 1 ? nodes[0].n : `the ${fmtCount(n)} selected items`) : `this folder (${S.focus.n})`;
      return ['name', 'rel', 'abs'].map((form) => ({
        label: `Copy the ${n === 1 ? FORMS[form].one : FORMS[form].many} of ${of}`,
        detail: 'Copy as', run: () => copy(form, nodes),
      }));
    },
  });
}
