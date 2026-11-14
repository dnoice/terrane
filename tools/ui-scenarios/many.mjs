/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Acting on Many Scenarios (Terrane Edition - v1.0)
 *     - File Name: many.mjs
 *     - Relative Path: tools/ui-scenarios/many.mjs
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
 *     Checks acting on many items at once in a real browser, keyboard
 *     only, with WebGL on and off: the batch rename from F2 to the disk
 *     and back with Undo, the duplicate cleanup from Verify by content to
 *     the holding area and back, and the forms Copy as puts on the
 *     clipboard. Each change is confirmed on disk, on a fixture of its
 *     own.
 *
 * ✒ Key Features:
 *     - 'batch-rename' (writes): Space on three rows, then F2, opens the
 *       batch sheet and not the single rename; Find and Replace update
 *       the preview; a clash turns Apply off, says why, and Enter applies
 *       nothing; fixed, Enter renames the three files on disk, the
 *       Journal holds one entry, the renamed items stay selected, and
 *       Ctrl+Z restores them by content hash; a benchmark on a folder of
 *       a batch follows it and Undo carries it back; F2 with one item still
 *       opens the single rename; on the read-only service F2 with several
 *       says read-only and the menu's item says why it is unavailable
 *     - 'dupes' (writes): an unverified group says to verify first and
 *       offers nothing; Verify by content from the Survey; the fixture's
 *       true copies show Reclaimable and Keep newest and Keep oldest in
 *       the Survey, and Keep this one too in the inspector; a sampled
 *       group's note and confirmation say how it was compared; the
 *       confirmation names what is kept and what moves; afterwards the
 *       others are in .terrane-trash and out of the tree, the kept one is
 *       selected, and Ctrl+Z restores them; a copy rewritten after
 *       verification stops the move with a sentence that names it; on
 *       the read-only service the keeps are unavailable with the reason
 *     - 'copy-as' (read-only fixture, both passes): navigator.clipboard
 *       is spied on; the menu of one file (Copy name, Copy relative path,
 *       after Copy path), of three (Copy names, Copy relative paths, after
 *       Copy paths and before Rename 3 items…), of the folder you are in,
 *       the palette's commands, the root as '.', and an entry of an open
 *       archive as x.zip!/inner/file; each copy said in one sentence
 *
 * ✒ Usage Instructions:
 *     node tools/ui-check.mjs batch-rename dupes copy-as
 *     node tools/ui-check.mjs many --pass nogl
 *
 * ✒ Other Important Information:
 *     - Dependencies: tools/ui-check.mjs (the context t, t.readOnlyUrl,
 *       t.goto); node:fs, node:crypto; the fixture's edge cases (the
 *       three true copies) and archives/site.zip
 *     - Compatible platforms: Node.js 22.5+
 * ----------------------------------------------------------------------------
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** Shows Contents, selects the entry named n there, puts the list's cursor on it and focuses the list. */
function pick(t, n) {
  return t.app((T, name) => {
    T.S.tab = 'contents';
    T.api.drawLedger();
    const node = T.S.focus.c.find((c) => c.n === name);
    if (!node) return false;
    T.api.select(node);
    T.api.cursorTo(node);
    document.getElementById('ledger-list').focus();
    return true;
  }, n);
}

/**
 * Goes to the file rel as the palette does (flies to it, or without WebGL
 * goes to its folder), waits for the location to be its folder, then
 * selects it in Contents with the list focused.
 */
async function goTo(t, rel) {
  if (t.gl) {
    await t.app((T) => { T.api.overview(); return true; });
    await t.settle();
  }
  const ok = await t.app((T, r) => {
    const node = T.S.model.find(r);
    if (!node) return false;
    if (T.S.noGL) {
      T.api.setFocus(node.p);
      T.api.select(node);
    } else T.api.reveal(node);
    return true;
  }, rel);
  if (!ok) throw new Error(`${rel} is not in the tree`);
  const there = await t.until((T, r) => T.S.focus === T.S.model.find(r).p, { args: [rel], timeout: 15000 });
  if (!there) throw new Error(`the location never reached the folder of ${rel}`);
  await t.settle();
  if (!(await pick(t, rel.slice(rel.lastIndexOf('/') + 1)))) throw new Error(`${rel} is not listed in Contents`);
}

/** The open context menu's items: label, and the reason when unavailable. */
const menuItems = () => [...document.querySelectorAll('#menu .menu-item')].map((b) => ({
  label: b.querySelector('.menu-label').textContent, off: b.getAttribute('aria-disabled') === 'true', why: b.querySelector('.menu-why')?.textContent ?? null,
}));

/** Opens the context menu from the keyboard (Shift+F10) and reads it; Escape closes it unless pick names an item to press. */
async function menu(t, pick = null) {
  await t.key('Shift+F10');
  await t.waitFor(() => !document.getElementById('menu').hidden && document.querySelectorAll('#menu .menu-item').length > 0, { what: 'the context menu' });
  const items = await t.eval(menuItems);
  if (!pick) {
    await t.key('Escape');
  } else {
    let at = null;
    for (let k = 0; k < 40; k++) {
      at = await t.eval(() => document.activeElement?.querySelector?.('.menu-label')?.textContent ?? null);
      if (at === pick) break;
      await t.key('ArrowDown');
    }
    if (at !== pick) throw new Error(`the menu has no "${pick}": ${JSON.stringify(items.map((i) => i.label))}`);
    await t.key('Enter');
  }
  await t.waitFor(() => document.getElementById('menu').hidden, { what: 'the menu to close' });
  return items;
}

/** The batch rename sheet as it stands. */
const sheetState = () => {
  const d = document.getElementById('dialog');
  const apply = d.querySelector('.rename-form button[type=submit]');
  return {
    open: d.open && d.classList.contains('is-rename'),
    rows: [...d.querySelectorAll('.rename-preview tbody tr')].map((tr) => [...tr.cells].map((c) => c.textContent)),
    summary: d.querySelector('.rename-summary')?.textContent ?? null,
    why: d.querySelector('.rename-why')?.textContent ?? null,
    off: apply?.getAttribute('aria-disabled') === 'true',
    focus: document.activeElement?.name || document.activeElement?.tagName,
  };
};

/* ---------- batch-rename ---------- */

const batchRename = {
  name: 'batch-rename',
  title: 'Batch rename: F2 on several, a preview, a clash refused, applied on disk, undone',
  data: 'fixture',
  write: true,
  async run(t) {
    await t.settle();
    const dir = 'edge cases';
    const names = ['copy-a.dat', 'copy-b.dat', 'copy-c.dat'];
    const kept = names.map((n) => n.replace('copy-', 'kept-'));
    const sha = (rel) => crypto.createHash('sha1').update(fs.readFileSync(t.abs(rel))).digest('hex');
    const listing = () => fs.readdirSync(t.abs(dir)).filter((n) => /^(copy-|kept-|same\.)/.test(n)).sort();
    const hashes = names.map((n) => sha(`${dir}/${n}`));
    const disk0 = listing();

    // Name order, so the rows after copy-a.dat are copy-b and copy-c.
    await t.app((T) => { T.S.sort = { key: 'name', dir: 1 }; return true; });
    await goTo(t, `${dir}/copy-a.dat`);
    await t.keys('Ctrl+ArrowDown', 'Space', 'Ctrl+ArrowDown', 'Space');
    const sel = await t.waitFor((T) => T.S.sel.size === 3 && [...T.S.sel].map((n) => n.n).sort(), { what: 'three rows selected' });
    t.check('Space on three rows selects copy-a, copy-b and copy-c', same(sel, names), JSON.stringify(sel));
    const insp3 = await t.eval(() => {
      const body = document.getElementById('inspector-body');
      return { rename: [...body.querySelectorAll('.batch-action button')].map((x) => x.textContent), stray: [...body.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim() === 'null') };
    });
    t.check('the inspector of several offers Rename…, and shows no stray "null" where no reason is due', same(insp3.rename, ['Rename…']) && !insp3.stray, JSON.stringify(insp3));

    await t.key('F2');
    const opened = await t.waitFor(() => {
      const d = document.getElementById('dialog');
      return d.open && { batch: d.classList.contains('is-rename'), single: !!d.querySelector('input[name=name]'), h2: d.querySelector('h2')?.textContent, focus: document.activeElement?.name, live: document.getElementById('live').textContent };
    }, { what: 'a dialog after F2' });
    t.check('F2 with three selected opens the batch rename, not the single rename, with Find focused',
      opened.batch && !opened.single && opened.h2 === 'Rename 3 items' && opened.focus === 'find', JSON.stringify(opened));
    t.check(`and says what it is (${opened.live})`, /^Rename 3 items together\. 0 to rename, 3 unchanged\. Enter applies, Escape cancels\.$/.test(opened.live), opened.live);
    await t.shot('batch-open');

    // A clash: every name becomes same.dat.
    await t.type('copy-.');
    await t.key('Tab');
    await t.type('same');
    await t.key('Tab');
    t.check('Tab reaches Regular expression after Replace', (await t.eval(() => document.activeElement?.name)) === 'regex');
    await t.key('Space');
    const clash = await t.waitFor(() => {
      const d = document.getElementById('dialog');
      const rows = [...d.querySelectorAll('.rename-preview tbody tr')];
      return rows.length === 3 && rows.every((tr) => tr.cells[1].textContent === 'same.dat') && rows.every((tr) => /^same new name as /.test(tr.cells[2].textContent)) && true;
    }, { what: 'the preview to show the clash' });
    const s1 = await t.eval(sheetState);
    t.check(`typing Find and Replace updates the preview: a regular expression makes every name same.dat, and each row says it clashes (${s1.summary})`,
      clash && s1.summary === '0 to rename, 3 clash', JSON.stringify(s1));
    t.check(`a clash turns Apply off and says why ("${s1.why}")`, s1.off && /^3 names have a problem\. copy-a\.dat: same new name as copy-b\.dat\.$/.test(s1.why), JSON.stringify(s1));
    await t.shot('batch-clash');
    const mark = t.mark();
    await t.key('Enter');
    const refused = await t.waitFor(() => /^Apply is unavailable\./.test(document.getElementById('live').textContent) && document.getElementById('live').textContent);
    t.check('Enter while Apply is off applies nothing and says why; the sheet stays open',
      !!refused && (await t.eval(sheetState)).open && t.requests(mark).every((r) => r.path !== '/api/op') && same(listing(), disk0), refused);

    // Fixed: a literal Find, kept- for copy-.
    await t.key('Space');
    await t.tabTo('#dialog input[name=find]', { back: true });
    await t.type('copy-');
    await t.key('Tab');
    await t.type('kept-');
    const fixed = await t.waitFor(() => {
      const rows = [...document.querySelectorAll('#dialog .rename-preview tbody tr')].map((tr) => [...tr.cells].map((c) => c.textContent));
      return rows.length === 3 && rows.every((r) => /^kept-[abc]\.dat$/.test(r[1])) && rows;
    }, { what: 'the preview to show kept-a.dat to kept-c.dat' });
    const s2 = await t.eval(sheetState);
    t.check('a literal Find and Replace: the preview lists Now, Becomes and an empty Note for each',
      same(fixed, names.map((n, i) => [n, kept[i], ''])) && s2.summary === '3 to rename' && !s2.off && s2.why === '', JSON.stringify(s2));
    const said = await t.waitFor(() => document.getElementById('live').textContent === '3 to rename' && '3 to rename', { what: 'the summary said' });
    t.check('the summary is said once typing pauses', !!said);

    const before = t.mark();
    await t.key('Enter');
    const onDisk = await t.poll(() => same(listing(), [...kept]), { timeout: 8000 });
    t.check(`Enter applies: the three files are renamed on disk (${listing().join(', ')})`, onDisk);
    const ops = t.requests(before).filter((r) => r.method === 'POST' && r.path === '/api/op');
    t.check('in one request to the service', ops.length === 1 && ops[0].status === 200, JSON.stringify(ops));
    t.check('the renamed files keep their contents', same(kept.map((n) => sha(`${dir}/${n}`)), hashes));
    const after = await t.waitFor((T) => T.S.sel.size === 3 && [...T.S.sel].every((n) => /^kept-/.test(n.n)) && {
      sel: [...T.S.sel].map((n) => n.n).sort(), dialog: document.getElementById('dialog').open,
      notice: [...document.querySelectorAll('#notices .notice')].map((n) => ({ text: n.querySelector('.notice-text').textContent, undo: !!n.querySelector('button.btn') })).find((n) => n.text === 'Renamed 3 items'),
    }, { timeout: 8000, what: 'the renamed items selected' });
    t.check('the renamed items are selected again, and the notice offers Undo', same(after.sel, kept) && !after.dialog && after.notice?.undo, JSON.stringify(after));
    const journal = await t.app(async (T) => (await T.api.get('journal')).journal.map((e) => e.label));
    t.check('the Journal holds one entry for the batch', same(journal, ['Renamed 3 items']), JSON.stringify(journal));

    await t.key('Ctrl+Z');
    const undone = await t.poll(() => same(listing(), names), { timeout: 8000 });
    t.check('Ctrl+Z puts every name back', undone, listing().join(', '));
    t.check('with the same contents (content hashes)', same(names.map((n) => sha(`${dir}/${n}`)), hashes));
    t.check('and the tree has them again', await t.until((T, r) => r.every((x) => !!T.S.model.find(x)), { args: [names.map((n) => `${dir}/${n}`)], timeout: 8000 }));

    // A benchmark on a folder of the batch follows it, and Undo carries it back.
    const folders = ['empty one', 'empty two'].map((n) => `${dir}/${n}`);
    await pick(t, 'empty one');
    await t.key('B');
    await t.waitFor((T, r) => T.places?.benchmarks.some((b) => b.rel === r), { args: [folders[0]], what: 'the benchmark set' });
    await t.app((T, r) => {
      T.api.selectAll(r.map((x) => T.S.model.find(x)));
      document.getElementById('ledger-list').focus();
      return true;
    }, folders);
    await t.key('F2');
    await t.waitFor(() => document.getElementById('dialog').open && document.activeElement?.name === 'find', { what: 'the batch sheet for two folders' });
    await t.type('empty');
    await t.key('Tab');
    await t.type('vacant');
    await t.waitFor(() => document.querySelector('#dialog .rename-summary')?.textContent === '2 to rename', { what: 'two folders to rename' });
    await t.key('Enter');
    const carried = await t.waitFor((T) => {
      const b = T.places.benchmarks[0];
      return b?.rel === 'edge cases/vacant one' && b.node === T.S.model.find('edge cases/vacant one') && b.rel;
    }, { timeout: 10000, what: 'the benchmark to follow the batch rename' });
    t.check(`a benchmark on a folder of the batch follows it (${carried})`, !!carried && fs.existsSync(t.abs('edge cases/vacant two')));
    await t.key('Ctrl+Z');
    const back = await t.waitFor((T, r) => {
      const b = T.places.benchmarks[0];
      return b?.rel === r && b.node === T.S.model.find(r) && b.rel;
    }, { args: [folders[0]], timeout: 10000, what: 'Undo to carry the benchmark back' });
    t.check(`and Undo carries it back (${back})`, back === folders[0] && fs.existsSync(t.abs(folders[1])));
    await t.app((T) => {
      T.places.clear();
      T.places.flush();
      try {
        localStorage.removeItem(T.places.key);
      } catch { /* not kept */ }
      T.api.relayout({ animate: false });
      return true;
    });

    // F2 with one item is the single rename.
    await t.app((T, r) => {
      T.api.select(T.S.model.find(r));
      document.getElementById('ledger-list').focus();
      return true;
    }, `${dir}/copy-a.dat`);
    await t.key('F2');
    const single = await t.waitFor(() => {
      const d = document.getElementById('dialog');
      return d.open && { batch: d.classList.contains('is-rename'), input: document.activeElement?.name, h2: d.querySelector('h2')?.textContent, value: d.querySelector('input[name=name]')?.value };
    }, { what: 'the single rename' });
    t.check('F2 with one item still opens the single rename', !single.batch && single.input === 'name' && single.h2 === 'Rename' && single.value === 'copy-a.dat', JSON.stringify(single));
    await t.key('Escape');
    await t.waitFor(() => !document.getElementById('dialog').open);

    // On the read-only service, F2 with several says read-only.
    await t.goto(t.readOnlyUrl);
    await t.app((T, r) => {
      const nodes = r.map((x) => T.S.model.find(x));
      T.api.setFocus(nodes[0].p);
      T.api.selectAll(nodes);
      document.getElementById('ledger-list').focus();
      return true;
    }, names.slice(0, 2).map((n) => `${dir}/${n}`));
    const roMark = t.mark();
    await t.key('F2');
    const ro = await t.waitFor(() => {
      const said = [...document.querySelectorAll('#notices .notice-text')].map((n) => n.textContent);
      return said.includes('Read-only mode: nothing can be renamed.') && { dialog: document.getElementById('dialog').open };
    }, { what: 'the read-only sentence' });
    t.check('on the read-only service, F2 with several says read-only and opens nothing', !ro.dialog && t.requests(roMark).every((r) => r.path !== '/api/op'), JSON.stringify(ro));
    const roMenu = await menu(t);
    const item = roMenu.find((i) => /^Rename 2 items/.test(i.label));
    t.check(`its menu item says why it is unavailable (${item?.why})`, item?.off && item.why === 'read-only mode', JSON.stringify(roMenu));
    await t.goto(t.url);
  },
};

/* ---------- dupes ---------- */

/** The duplicate cleanup line under a group, in the inspector or the Survey. */
const cleanState = (where) => {
  const host = document.getElementById(where === 'inspector' ? 'inspector-body' : 'ledger-rich');
  return [...host.querySelectorAll('.dup-clean')].map((d) => ({
    waste: d.querySelector('.dup-waste')?.textContent ?? null,
    buttons: [...d.querySelectorAll('button')].map((b) => ({ label: b.firstChild.textContent, off: b.getAttribute('aria-disabled') === 'true', title: b.title })),
    why: d.querySelector('.dup-why')?.textContent ?? null,
    note: d.querySelector('.dup-note')?.textContent ?? null,
  }));
};

/** Verify by content from the Survey tab, by keyboard; resolves once the fixture's copies are verified. */
async function verify(t, rel) {
  await t.app((T) => {
    T.S.tab = 'survey';
    T.api.drawLedger();
    return true;
  });
  // Focus starts on the section's heading (setup); Enter and Tab from there.
  const open = await t.eval(() => {
    const s = document.querySelector('#ledger-rich details:has(.group-head) > summary');
    s.focus();
    return s.parentElement.open;
  });
  if (!open) await t.key('Enter');
  await t.waitFor(() => document.querySelector('#ledger-rich details:has(.group-head)')?.open, { what: 'Duplicate candidates open' });
  // A survey that lands meanwhile redraws the tab; start again from the heading.
  await t.eval(() => {
    const d = document.querySelector('#ledger-rich details:has(.group-head)');
    if (!d.contains(document.activeElement)) d.querySelector('summary').focus();
    return true;
  });
  await t.tabTo('#ledger-rich details:has(.group-head) .actions button:first-child', { max: 6 });
  await t.key('Enter');
  return t.waitFor((T, r) => {
    const g = T.S.survey.dupGroups.find((x) => x.files.some((f) => T.api.relPath(f) === r));
    return g?.verified && { mode: g.mode, n: g.files.length, waste: g.waste, hash: typeof g.hash === 'string' };
  }, { args: [rel], timeout: 15000, what: 'the copies verified' });
}

const dupes = {
  name: 'dupes',
  title: 'Duplicate cleanup: keep one verified copy, hold the others, undo; a changed copy stops it',
  data: 'fixture',
  write: true,
  async run(t) {
    await t.settle();
    const [a, b, c] = t.manifest.duplicates;
    const on = (rel) => fs.existsSync(t.abs(rel));
    const held = (name) => {
      const items = path.join(t.root, '.terrane-trash', 'items');
      return fs.existsSync(items) && fs.readdirSync(items).some((slot) => fs.existsSync(path.join(items, slot, name)));
    };

    // Before verification: a sentence and no action.
    await goTo(t, b);
    const unverified = await t.eval(cleanState, 'inspector');
    t.check('an unverified group offers no action, only "Verify by content first: size alone is only a hint."',
      unverified.length === 1 && unverified[0].why === 'Verify by content first: size alone is only a hint.' && unverified[0].buttons.length === 0, JSON.stringify(unverified));

    const v = await verify(t, a);
    t.check(`Verify by content confirms the fixture's ${v.n} copies (${v.mode}), and keeps their hash with the group`, v.n === 3 && v.mode === 'full' && v.hash, JSON.stringify(v));
    const survey = await t.app(async (T, rel) => {
      const M = await import(new URL('js/model.js', document.baseURI).href);
      const groups = T.S.survey.dupGroups;
      const g = groups.find((x) => x.files.some((f) => T.api.relPath(f) === rel));
      const confirmed = groups.filter((x) => x.verified);
      return {
        want: `Reclaimable ${M.fmtBytes(g.waste)} (2 copies)`,
        note: [...document.querySelectorAll('#ledger-rich details:has(.group-head) .note')].map((n) => n.textContent)[0],
        noteWant: `${M.fmtCount(confirmed.length)} group${confirmed.length === 1 ? '' : 's'} confirmed identical by content, ${M.fmtBytes(confirmed.reduce((s, x) => s + x.waste, 0))} reclaimable. Unconfirmed groups share only their size.`,
      };
    }, a);
    const inSurvey = (await t.eval(cleanState, 'survey')).find((x) => x.waste === survey.want);
    t.check(`the Survey shows "${survey.want}" with Keep newest and Keep oldest under the group`,
      !!inSurvey && same(inSurvey.buttons.map((x) => x.label), ['Keep newest', 'Keep oldest']) && inSurvey.buttons.every((x) => !x.off), JSON.stringify(inSurvey));
    t.check(`and its note gives the reclaimable size of confirmed groups ("${survey.note}")`, survey.note === survey.noteWant, `${survey.note} vs ${survey.noteWant}`);
    await t.shot('dupes-survey');

    await goTo(t, b);
    const insp = (await t.eval(cleanState, 'inspector'))[0];
    t.check(`the inspector's copies show "${insp?.waste}" with Keep newest, Keep oldest and Keep this one`,
      insp?.waste === survey.want && same(insp.buttons.map((x) => x.label), ['Keep newest', 'Keep oldest', 'Keep this one']), JSON.stringify(insp));

    // A sampled group: its note and its confirmation say how it was compared.
    await t.app((T, rel) => {
      const g = T.S.survey.dupGroups.find((x) => x.files.some((f) => T.api.relPath(f) === rel));
      g.mode = 'sampled';
      T.api.drawInspector();
      return true;
    }, a);
    const sampled = (await t.eval(cleanState, 'inspector'))[0];
    await t.tabTo('#inspector-body .dup-clean [data-k$=":newest"]', { max: 150 });
    await t.key('Enter');
    const askSampled = await t.waitFor(() => document.getElementById('dialog').open && document.querySelector('#dialog .dup-confirm')?.textContent);
    t.check('a sampled group says it is probable, and its confirmation that it was compared by three sampled megabytes and size, not every byte',
      /^Probable: compared by three sampled megabytes and the size, not every byte\.$/.test(sampled?.note || '') && /compared by three sampled megabytes and their size, not every byte/.test(askSampled), `${sampled?.note} | ${askSampled}`);
    await t.key('Escape');
    await t.waitFor(() => !document.getElementById('dialog').open);
    t.check('Escape cancels it and nothing moves', on(a) && on(b) && on(c));
    await t.app((T, rel) => {
      const g = T.S.survey.dupGroups.find((x) => x.files.some((f) => T.api.relPath(f) === rel));
      g.mode = 'full';
      T.api.drawInspector();
      return true;
    }, a);

    // Keep this one: the confirmation names the paths.
    await t.tabTo('#inspector-body .dup-clean [data-k$=":this"]', { max: 150 });
    await t.key('Enter');
    const conf = await t.waitFor(() => document.getElementById('dialog').open && {
      title: document.querySelector('#dialog h2').textContent,
      body: document.querySelector('#dialog .dup-confirm')?.textContent,
      moves: [...document.querySelectorAll('#dialog .dup-moves li')].map((li) => li.textContent),
    }, { what: 'the confirmation' });
    t.check(`the confirmation asks "${conf.title}", keeps ${b} and names the copies that move`,
      conf.title === 'Move 2 copies to the holding area?' && conf.body.startsWith(`Keeps ${b}, changed `) && same([...conf.moves].sort(), [a, c])
      && /Nothing is deleted: Undo, or the Journal tab, puts them back\. The space comes back when the holding area is purged\.$/.test(conf.body), JSON.stringify(conf));
    await t.shot('dupes-confirm');
    await t.tabTo('#dialog button[type=submit]');
    await t.key('Enter');
    const moved = await t.poll(() => !on(a) && !on(c) && on(b) && held('copy-a.dat') && held('copy-c.dat'), { timeout: 10000 });
    t.check('afterwards the other two are in .terrane-trash and the kept one stays', moved);
    const tree = await t.waitFor((T, r) => !T.S.model.find(r[0]) && !T.S.model.find(r[2]) && T.S.primary === T.S.model.find(r[1]) && {
      notice: [...document.querySelectorAll('#notices .notice')].some((n) => /^Removed 2 items to the holding area$/.test(n.querySelector('.notice-text').textContent) && !!n.querySelector('button.btn')),
    }, { args: [[a, b, c]], timeout: 10000, what: 'the tree without the two copies' });
    t.check('they are out of the tree, the kept copy is selected, and the notice offers Undo', tree.notice, JSON.stringify(tree));
    const journal = await t.app(async (T) => (await T.api.get('journal')).journal.map((e) => e.label));
    t.check('one journal entry for the two', same(journal, ['Removed 2 items to the holding area']), JSON.stringify(journal));

    await t.key('Ctrl+Z');
    t.check('Ctrl+Z restores them', await t.poll(() => on(a) && on(c), { timeout: 10000 }));
    t.check('and the tree has them again', await t.until((T, r) => r.every((x) => !!T.S.model.find(x)), { args: [[a, b, c]], timeout: 10000 }));

    // A survey after a refresh keeps what was proved for files that have
    // not changed since.
    await t.settle();
    await verify(t, a);
    await t.app((T) => { window.__surveyBefore = T.S.survey; T.api.refreshDirs(['edge cases']); return true; });
    const kept = await t.until((T, r) => {
      const g = T.S.survey.dupGroups.find((x) => x.files.some((f) => T.api.relPath(f) === r));
      return T.S.survey !== window.__surveyBefore && g?.verified && g.files.length === 3 && g.files.map((f) => f.n).sort().join();
    }, { args: [a], timeout: 8000 });
    const why = kept ? '' : JSON.stringify(await t.app((T, r) => {
      const g = T.S.survey.dupGroups.find((x) => x.files.some((f) => T.api.relPath(f) === r));
      return { newSurvey: T.S.survey !== window.__surveyBefore, g: g && { verified: g.verified, files: g.files.map((f) => [f.n, f.m, T.api.isAttached(f)]) } };
    }, a));
    t.check(`a survey after a refresh keeps the copies verified, the same-size file that matched none still out (${kept})`, kept === 'copy-a.dat,copy-b.dat,copy-c.dat', why);

    // A copy rewritten after verification, its size and time kept, stops the move.
    await goTo(t, b);
    await t.tabTo('#inspector-body .dup-clean [data-k$=":newest"]', { max: 150 });
    await t.key('Enter');
    await t.waitFor(() => document.getElementById('dialog').open && !!document.querySelector('#dialog .dup-confirm'));
    const st = fs.statSync(t.abs(c));
    fs.writeFileSync(t.abs(c), Buffer.alloc(st.size, 'z'));
    fs.utimesSync(t.abs(c), st.atime, st.mtime);
    await t.tabTo('#dialog button[type=submit]');
    const before = t.mark();
    await t.key('Enter');
    const stopped = await t.waitFor(() => [...document.querySelectorAll('#notices .notice-text')].map((n) => n.textContent)
      .find((x) => x === 'copy-c.dat changed since it was verified, so nothing was moved. Verify by content again.'), { timeout: 10000, what: 'the refusal' });
    const ops = t.requests(before).filter((r) => r.path === '/api/op');
    t.check(`a file rewritten after verification is refused ("${stopped}") and nothing moves`, !!stopped && ops.length === 0 && on(a) && on(b) && on(c), JSON.stringify(ops));

    // On the read-only service the keeps are unavailable, with the reason.
    await t.goto(t.readOnlyUrl);
    await verify(t, a);
    await goTo(t, b);
    const ro = (await t.eval(cleanState, 'inspector'))[0];
    t.check(`on the read-only service the keeps are unavailable with the reason (${ro?.why})`,
      ro?.buttons.length === 3 && ro.buttons.every((x) => x.off && x.title === 'Unavailable: read-only mode') && ro.why === 'Unavailable here: read-only mode.', JSON.stringify(ro));
    await t.goto(t.url);
  },
};

/* ---------- copy-as ---------- */

const copyAs = {
  name: 'copy-as',
  title: 'Copy as: names and relative paths from the menus and the palette',
  data: 'fixture',
  async run(t) {
    await t.settle();
    await t.eval(() => {
      window.__copied = [];
      navigator.clipboard.writeText = async (text) => { window.__copied.push(text); };
      return true;
    });
    const copied = () => t.eval(() => window.__copied.at(-1) ?? null);
    const lastNotice = async () => (await t.notices()).at(-1);
    const dir = 'edge cases';
    await t.app((T) => { T.S.sort = { key: 'name', dir: 1 }; return true; });
    await goTo(t, `${dir}/copy-a.dat`);

    // One file.
    const one = await menu(t, 'Copy name');
    const labels = one.map((i) => i.label);
    t.check('the menu of one file offers Copy name and Copy relative path, first after Copy path',
      labels.indexOf('Copy name') === labels.indexOf('Copy path') + 1 && labels.indexOf('Copy relative path') === labels.indexOf('Copy name') + 1, JSON.stringify(labels));
    t.check('Copy name copies the name and says so', (await t.poll(async () => (await copied()) === 'copy-a.dat' && (await lastNotice()) === '1 name copied to the clipboard.')),
      `${await copied()} | ${await lastNotice()}`);
    await menu(t, 'Copy relative path');
    t.check('Copy relative path copies the path from the directory, joined with /', (await copied()) === `${dir}/copy-a.dat`
      && (await t.waitFor(() => [...document.querySelectorAll('#notices .notice-text')].some((n) => n.textContent === '1 relative path copied to the clipboard.'))), await copied());

    // Three files.
    await t.keys('Ctrl+ArrowDown', 'Space', 'Ctrl+ArrowDown', 'Space');
    const sel = await t.waitFor((T) => T.S.sel.size === 3 && [...T.S.sel].map((n) => n.n), { what: 'three selected' });
    const many = await menu(t, 'Copy names');
    const ml = many.map((i) => i.label);
    t.check('the menu of three offers Copy names and Copy relative paths after Copy paths, then Rename 3 items…',
      same(ml.slice(ml.indexOf('Copy paths'), ml.indexOf('Copy paths') + 4), ['Copy paths', 'Copy names', 'Copy relative paths', 'Rename 3 items…']), JSON.stringify(ml));
    t.check('Copy names copies them one per line', (await copied()) === sel.join('\n'), JSON.stringify(await copied()));
    await menu(t, 'Copy relative paths');
    t.check('Copy relative paths copies theirs, and says "3 relative paths copied to the clipboard."',
      (await copied()) === sel.map((n) => `${dir}/${n}`).join('\n') && (await t.waitFor(() => [...document.querySelectorAll('#notices .notice-text')].some((n) => n.textContent === '3 relative paths copied to the clipboard.'))),
      JSON.stringify(await copied()));

    // The palette: the selection's names.
    await t.key('Ctrl+K');
    await t.waitFor(() => document.getElementById('dialog').open && document.activeElement?.classList.contains('palette-input'));
    await t.type('copy the names');
    const active = () => document.querySelector('#palette-list [aria-selected="true"] .pal-label')?.textContent ?? null;
    const top = (await t.until((want) => {
      const l = document.querySelector('#palette-list [aria-selected="true"] .pal-label')?.textContent;
      return l === want && l;
    }, { args: ['Copy the names of the 3 selected items'], timeout: 3000 })) || (await t.eval(active));
    t.check(`the palette offers "${top}" first`, top === 'Copy the names of the 3 selected items', top);
    await t.key('Enter');
    await t.waitFor(() => !document.getElementById('dialog').open);
    t.check('and Enter copies them', await t.poll(async () => (await copied()) === sel.join('\n')), JSON.stringify(await copied()));

    // The folder you are in.
    await t.key('Escape');
    await t.waitFor((T) => T.S.sel.size === 0);
    await t.eval(() => document.getElementById('ledger-list').focus());
    const folder = await menu(t, 'Copy relative path of this folder');
    t.check('the menu of the folder you are in offers Copy relative path of this folder', folder.some((i) => i.label === 'Copy relative path of this folder'));
    t.check('which copies its path from the directory', (await copied()) === dir, JSON.stringify(await copied()));
    await t.key('Ctrl+K');
    await t.waitFor(() => document.getElementById('dialog').open && document.activeElement?.classList.contains('palette-input'));
    await t.type('copy the path of this folder');
    const top2 = (await t.until((want) => {
      const l = document.querySelector('#palette-list [aria-selected="true"] .pal-label')?.textContent;
      return l === want && l;
    }, { args: ['Copy the path of this folder (edge cases)'], timeout: 3000 })) || (await t.eval(active));
    await t.key('Enter');
    await t.waitFor(() => !document.getElementById('dialog').open);
    const abs = await t.app((T) => T.api.absPath(T.S.focus));
    t.check(`with nothing selected the palette's "${top2}" copies the folder's absolute path`,
      top2 === 'Copy the path of this folder (edge cases)' && (await t.poll(async () => (await copied()) === abs)), `${top2} | ${await copied()}`);
    const rootLabel = await t.app((T) => T.api.relLabel(T.S.model.root));
    t.check('the directory itself reads "."', rootLabel === '.', rootLabel);

    // An entry of an open archive.
    const zip = t.manifest.archives.site.path;
    await goTo(t, zip);
    await t.key('i');
    await t.waitFor((T) => !!T.S.interior, { timeout: 8000, what: 'the interior of site.zip' });
    const entry = await t.app((T) => {
      const stack = [T.S.interior.root];
      while (stack.length) {
        const d = stack.pop();
        for (const ch of d.c) {
          if (!ch.d) {
            T.api.select(ch);
            document.getElementById('ledger-list').focus();
            const inner = [];
            for (let x = ch; x !== T.S.interior.root; x = x.p) inner.unshift(x.n);
            return inner.join('/');
          }
          stack.push(ch);
        }
      }
      return null;
    });
    await menu(t, 'Copy relative path');
    t.check(`inside an open archive the relative path goes through it (${await copied()})`, (await copied()) === `${zip}!/${entry}`, JSON.stringify(await copied()));
    await t.keys('Escape', 'Escape');
    await t.waitFor((T) => !T.S.interior, { what: 'the archive closed' });

    await t.app((T) => {
      delete navigator.clipboard.writeText;
      T.S.sort = { key: 'size', dir: -1 };
      T.api.select(null);
      T.api.setFocus(T.S.model.root);
      return true;
    });
    await t.settle();
  },
};

export default [batchRename, dupes, copyAs];
