/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Open a Terminal (Terrane Edition - v1.0)
 *     - File Name: terminal.js
 *     - Relative Path: web/js/terminal.js
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
 *     Opens the system's terminal in a folder Terrane shows: the one you
 *     are in, a selected folder, or the folder that holds a selected file.
 *     The service starts it with the folder as its working directory, so
 *     the path is never handed to a shell or put in an argument.
 *
 * ✒ Key Features:
 *     - The context menu: a folder's "Open a terminal here", a file's
 *       "Open a terminal in its folder", and "Open a terminal in this
 *       folder" for the folder you are in
 *     - The inspector: "Terminal here" under a selected folder's actions,
 *       and in the summary of the folder you are in
 *     - The command palette: "Open a terminal in <folder>", for the
 *       selection's folder or the folder you are in
 *     - Unavailable, with the reason, in snapshot or read-only mode (a
 *       terminal can change anything), inside an open archive (there is no
 *       folder on disk) and in a folder that cannot be read
 *     - One sentence either way: "Opened a terminal in "docs"." or the
 *       service's reason, such as "No terminal was found: tried ..."
 *
 * ✒ Usage Instructions:
 *     Listed in features.js and installed by app.js. Open the context menu
 *     on a folder (right click, the Menu key or Shift+F10), or press
 *     Terminal here in the inspector, or Ctrl+K and "terminal".
 *
 * ✒ Examples:
 *     menu on docs            Open a terminal here          (terminal in docs)
 *     menu on docs/a.txt      Open a terminal in its folder (terminal in docs)
 *     read-only service       Open a terminal here          unavailable: read-only mode
 *
 * ✒ Other Important Information:
 *     - Dependencies: app.js's api: S, MENU, INSPECTOR, COMMANDS, post,
 *       writable, hostOf, relPath, notice, el, actionButton; the service's
 *       POST /api/terminal
 *     - Compatible platforms: any browser; the terminal itself is
 *       Windows Terminal or cmd.exe on Windows, Terminal on macOS,
 *       x-terminal-emulator or gnome-terminal on Linux
 *     - Security: the service refuses it in read-only and snapshot mode
 *       and outside the root; the page only asks
 * ----------------------------------------------------------------------------
 */

export const name = 'Open a terminal';

const OWNER = 'terminal';

export function install(api) {
  const { S, el } = api;

  /** The folder a terminal opens in for a node: itself, or a file's folder; the folder you are in for none. */
  const folderOf = (node) => (!node ? S.focus : node.d ? node : node.p);

  /** Why no terminal opens in dir (a short reason, for a menu or a button), or null. */
  function offFor(dir) {
    const ro = api.writable();
    if (ro) return ro;
    if (api.hostOf(dir)) return 'inside an archive';
    if (dir.e) return 'cannot be read';
    return null;
  }

  /** The same reason as a sentence. */
  function refusal(dir, off) {
    if (off === 'snapshot mode') return 'Snapshot mode shows a recorded copy of the directory, so it opens no terminal.';
    if (off === 'read-only mode') return 'Terrane was started in read-only mode, so it does not open a terminal, from which anything on disk could be changed.';
    if (off === 'inside an archive') return `"${dir.n}" is inside ${api.hostOf(dir).n}, which Terrane reads without unpacking: there is no folder on disk to open a terminal in.`;
    return `"${dir.n}" could not be read, so no terminal opens there.`;
  }

  async function open(dir) {
    if (!dir) return;
    const off = offFor(dir);
    if (off) {
      api.notice(refusal(dir, off), { kind: 'info' });
      return;
    }
    try {
      await api.post('terminal', { path: api.relPath(dir) });
      api.notice(`Opened a terminal in "${dir.n}".`);
    } catch (err) {
      api.notice(err.message, { kind: 'error' });
    }
  }

  // The first group after Open, Reveal and Copy path: the system's own tools.
  api.MENU.add({
    id: 'terminal', owner: OWNER, order: 20,
    items: (node) => {
      const dir = folderOf(node);
      if (!dir) return null;
      const off = offFor(dir);
      const label = !node ? 'Open a terminal in this folder' : node.d ? 'Open a terminal here' : 'Open a terminal in its folder';
      return [{ label, icon: 'open', run: () => { open(dir); }, disabled: !!off, reason: off || undefined }];
    },
  });

  /** One wide inspector button, unavailable with its reason, and the reason in words under it. */
  function section(dir) {
    const off = offFor(dir);
    return [
      el('div', { class: 'actions-grid terminal-action' },
        api.actionButton('Terminal here', () => { open(dir); }, { off, wide: true, icon: 'open', title: `Open a terminal in ${dir.n}` })),
      off ? el('p', { class: 'actions-why', text: `Unavailable here: ${off}.` }) : null,
    ];
  }

  // After a folder's Actions (50), before the preview (60).
  api.INSPECTOR.node.add({ id: 'terminal', order: 55, owner: OWNER, build: (node) => (node.d ? section(node) : null) });
  // In the summary of the folder you are in, after its own sections.
  api.INSPECTOR.focus.add({ id: 'terminal', order: 30, owner: OWNER, build: (f) => section(f) });

  api.COMMANDS.add({
    id: 'terminal', owner: OWNER, section: 'System',
    items: () => {
      const dir = S.primary ? folderOf(S.primary) : S.focus;
      if (!dir) return [];
      return [{ label: `Open a terminal in ${dir.n}`, detail: api.relPath(dir) || '/', off: offFor(dir), run: () => { open(dir); } }];
    },
  });
}
