/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Core Interface Scenarios (Terrane Edition - v1.1)
 *     - File Name: core.mjs
 *     - Relative Path: tools/ui-scenarios/core.mjs
 *     - Artifact Type: test
 *     - Version: 1.1.0
 *     - Date: 11/13/2026
 *     - Update: Friday, November 13, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Changelog:
 *     - 1.1.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] — The
 *       ledger's count is read as the page now writes it: "1 item" for
 *       a folder holding one entry, "N items" otherwise.
 *     - 1.0.0 (11/11/2026) [dendogg + Anthropic - Claude Opus 5.5] —
 *       Initial release.
 *
 * ✒ Description:
 *     The keyboard routes Terrane already has, checked in a real browser
 *     with WebGL on and off: entering and leaving a folder from the ledger,
 *     search and reveal, lenses, ledger tabs, the guide, panel toggles, and
 *     the refusals of a read-only service. A second scenario makes a folder
 *     on disk from the keyboard and undoes it.
 *
 * ✒ Key Features:
 *     - Runs on any data (fixture or snapshot); the search term adapts
 *     - Keyboard only: Tab, Home, Enter, Backspace, Escape, /, ?, [, ],
 *       number keys, M, N and Ctrl+Z
 *     - Asserts on window.__terrane state, the live region, the ledger,
 *       the inspector, notices and the network log
 *     - Camera-derived location is asserted with WebGL only; without
 *       WebGL the spoken sentence is checked instead
 *     - The write scenario verifies the folder on disk and its removal by
 *       undo, against a throwaway fixture
 *
 * ✒ Usage Instructions:
 *     Loaded by tools/ui-check.mjs; run with
 *     node tools/ui-check.mjs core core-write
 *
 * ✒ Other Important Information:
 *     - Dependencies: tools/ui-check.mjs (the context t)
 *     - Compatible platforms: Node.js 22.5+
 * ----------------------------------------------------------------------------
 */

import fs from 'node:fs';

/** Root-relative path of the folder a new folder would go into. */
const newFolderParent = (T) => {
  const n = T.S.primary?.d && T.S.sel.size === 1 ? T.S.primary : T.S.focus;
  const parts = [];
  for (let a = n; a && a.p; a = a.p) parts.unshift(a.n);
  return parts.join('/');
};

const core = {
  name: 'core',
  title: 'Core keyboard routes',
  async run(t) {
    const info = await t.app((T) => ({
      files: T.S.model.root.fc, folders: T.S.model.root.dc, noGL: !!T.S.noGL, n: T.S.layout?.n ?? 0,
      title: document.title, rows: document.querySelectorAll('#ledger-list [role=option]').length,
      veil: document.getElementById('veil').hidden ? '' : document.getElementById('veil').textContent,
    }));
    t.check(`the survey finished (${info.files} files, ${info.folders} folders)`, info.files > 0 && info.folders > 0);
    t.check('the title names the directory', / · Terrane$/.test(info.title), info.title);
    if (t.gl) t.check(`the world is drawn (${info.n} blocks)`, !info.noGL && info.n > 0);
    else t.check('without WebGL the page says so and keeps the ledger', info.noGL && /3D view unavailable/.test(info.veil), info.veil);
    t.check('the Contents ledger lists the root', info.rows > 0, `${info.rows} rows`);
    await t.shot('start');

    // Into the largest item from the ledger, and back up.
    await t.tabTo('#ledger-list');
    await t.key('Home');
    const first = await t.waitFor((T) => T.S.primary && { n: T.S.primary.n, d: T.S.primary.d, items: T.S.primary.c?.length ?? 0, top: T.list.items[0]?.n });
    t.check('Home in the ledger selects its first row', first.n === first.top, `${first.n} vs ${first.top}`);
    t.check('the selection is spoken', (await t.live()).startsWith(first.n), await t.live());
    if (first.d) {
      await t.key('Enter');
      await t.waitFor((T, n) => document.getElementById('live').textContent.startsWith(`Travelling to ${n}`), { args: [first.n] });
      t.check('Enter on a folder row travels there', true);
      if (t.gl) {
        await t.settle();
        const at = await t.app((T) => ({
          focus: T.S.focus.n, crumb: [...document.querySelectorAll('#crumbs .crumb')].at(-1)?.textContent, sub: document.getElementById('ledger-sub').textContent,
        }));
        t.check('the location follows the camera into the folder', at.focus === first.n && at.crumb === first.n, JSON.stringify(at));
        t.check('the ledger lists the folder', at.sub.startsWith(`${first.items.toLocaleString('en-US')} item${first.items === 1 ? '' : 's'}`), at.sub);
        await t.shot('inside-first-folder');
        await t.key('Backspace');
        await t.settle();
        const up = await t.app((T) => ({ root: !T.S.focus.p, crumbs: document.querySelectorAll('#crumbs .crumb').length }));
        t.check('Backspace goes back up to the root', up.root && up.crumbs === 1, JSON.stringify(up));
      }
    } else t.skip('travel into a folder', `the first row (${first.n}) is a file`);

    // Search, reveal from Findings, clear.
    const query = t.manifest ? 'copy-a.dat' : 'ext:md';
    await t.key('/');
    t.check('/ moves to the Find field', (await t.focused()).startsWith('input#q'), await t.focused());
    await t.type(query);
    const found = await t.waitFor((T) => T.S.search && T.S.tab === 'findings' && { count: T.S.search.list.length, top: T.S.search.list[0]?.n });
    t.check(`typing "${query}" finds and switches to Findings (${found.count})`, found.count > 0 && /\d+ found/.test(await t.text('#q-count')));
    await t.key('Enter');
    t.check('Enter moves from Find to the list', (await t.focused()).startsWith('div#ledger-list'), await t.focused());
    await t.key('Enter');
    const shown = await t.waitFor((T) => T.S.primary && { n: T.S.primary.n, inspector: document.getElementById('inspector-body').textContent });
    t.check('Enter on a finding reveals it and the inspector shows it', shown.n === found.top && shown.inspector.includes(shown.n), shown.n);
    if (t.manifest) t.check('the revealed file is the fixture file', shown.n === 'copy-a.dat');
    await t.key('Escape');
    const cleared = await t.waitFor((T) => !T.S.search && { tab: T.S.tab, q: document.getElementById('q').value, primary: T.S.primary?.n });
    t.check('Escape clears the search and returns to Contents, keeping the selection', cleared.tab === 'contents' && cleared.q === '' && cleared.primary === shown.n, JSON.stringify(cleared));
    await t.key('Escape');
    t.check('a second Escape clears the selection', await t.waitFor((T) => !T.S.primary));

    // Lenses from the number keys.
    const lenses = [];
    for (const [k, lens] of [['2', 'age'], ['3', 'size'], ['4', 'dup'], ['1', 'kind']]) {
      await t.key(k);
      lenses.push(await t.app((T, want) => T.S.lens === want && document.querySelector(`#lens [data-lens=${want}]`).getAttribute('aria-checked') === 'true', lens));
    }
    t.check('number keys 1 to 4 switch the lens and its radio', lenses.every(Boolean), JSON.stringify(lenses));

    // Ledger tabs.
    await t.tabTo('[role=tab][data-tab=survey]', { back: true });
    await t.key('Enter');
    t.check('Enter on the Survey tab shows the survey', await t.waitFor((T) => T.S.tab === 'survey' && !document.getElementById('ledger-rich').hidden && document.getElementById('ledger-rich').textContent.length > 0));
    await t.tabTo('[role=tab][data-tab=journal]');
    await t.key('Enter');
    t.check('Enter on the Journal tab shows the journal', await t.waitFor((T) => T.S.tab === 'journal' && document.getElementById('ledger-rich').textContent.length > 0));
    await t.tabTo('[role=tab][data-tab=contents]', { back: true });
    await t.key('Enter');
    t.check('Enter on the Contents tab brings the list back', await t.waitFor((T) => T.S.tab === 'contents' && !document.getElementById('ledger-list').hidden));

    // Guide and panels.
    await t.key('?');
    t.check('? opens the guide', await t.waitFor(() => document.getElementById('dialog').open && document.querySelector('#dialog h2')?.textContent === 'Guide'));
    await t.key('Escape');
    t.check('Escape closes the guide', await t.waitFor(() => !document.getElementById('dialog').open));
    const panels = [];
    for (const [k, cls] of [['[', 'no-ledger'], ['[', ''], [']', 'no-inspector'], [']', '']]) {
      await t.key(k);
      panels.push(await t.eval((c) => (c ? document.body.classList.contains(c) : !document.body.classList.contains('no-ledger') && !document.body.classList.contains('no-inspector')), cls));
    }
    t.check('[ and ] hide and show the ledger and the inspector', panels.every(Boolean), JSON.stringify(panels));

    // Refusals of a read-only service.
    await t.tabTo('#view');
    await t.key('ArrowDown');
    await t.waitFor((T) => !!T.S.primary);
    await t.key('M');
    t.check('M is refused in words', (await t.until(async () => [...document.querySelectorAll('#notices .notice-text')].some((n) => /nothing can be moved/.test(n.textContent)))) === true);
    const parent = await t.app(newFolderParent);
    const mark = t.mark();
    await t.key('N');
    await t.waitFor(() => document.getElementById('dialog').open && document.activeElement?.name === 'name');
    await t.key('Enter');
    const said = await t.waitFor(() => [...document.querySelectorAll('#notices .is-error .notice-text')].map((n) => n.textContent).find((x) => /read-only|snapshot/i.test(x)));
    const ops = t.requests(mark).filter((r) => r.method === 'POST' && r.path === '/api/op');
    t.check('a new folder is refused by the service and the refusal is shown', ops.length === 1 && ops[0].status === 403, `${JSON.stringify(ops)} ${said}`);
    if (t.root) t.check('nothing was created on disk', !fs.existsSync(t.abs(parent ? `${parent}/New folder` : 'New folder')));
    await t.shot('end');
  },
};

const write = {
  name: 'core-write',
  title: 'A folder made from the keyboard reaches the disk, and undo removes it',
  data: 'fixture',
  write: true,
  async run(t) {
    const name = 'ui-check folder';
    await t.tabTo('#view');
    const parent = await t.app(newFolderParent);
    const target = t.abs(parent ? `${parent}/${name}` : name);
    t.check('the fixture does not have the folder yet', !fs.existsSync(target));
    const mark = t.mark();
    await t.key('N');
    await t.waitFor(() => document.getElementById('dialog').open && document.activeElement?.name === 'name');
    await t.type(name);
    await t.key('Enter');
    t.check('Enter in the dialog creates the folder on disk', await t.poll(() => fs.existsSync(target)));
    const rel = parent ? `${parent}/${name}` : name;
    const made = await t.until((T, r) => !!T.S.model.find(r) && T.S.primary === T.S.model.find(r), { args: [rel], timeout: 8000 });
    t.check('the model has it and it is selected', made);
    const ops = t.requests(mark).filter((r) => r.method === 'POST' && r.path === '/api/op');
    t.check('one operation was sent and accepted', ops.length === 1 && ops[0].status === 200, JSON.stringify(ops));
    await t.key('Escape');
    await t.tabTo('#view');
    await t.key('Ctrl+Z');
    t.check('Ctrl+Z removes it from disk', await t.poll(() => !fs.existsSync(target), { timeout: 8000 }));
    t.check('the notice says what was undone', (await t.until(() => [...document.querySelectorAll('#notices .notice-text')].some((n) => /^Undid:/.test(n.textContent)))) === true);
    t.check('the model no longer has it', await t.until((T, r) => T.S.model.find(r) === null, { args: [rel], timeout: 8000 }));
  },
};

export default [core, write];
