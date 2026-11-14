#!/usr/bin/env node
/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Batch Rename Test (Terrane Edition - v1.0)
 *     - File Name: rename-test.mjs
 *     - Relative Path: tools/rename-test.mjs
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
 *     Runs the batch rename planner (web/js/rename.js) in Node: every
 *     rule, every reason a new name is refused, and the name check
 *     against the service's own (server/guard.mjs) on the platform it
 *     runs on. It proves the dialog's preview says what the service will
 *     do before anything is sent.
 *
 * ✒ Key Features:
 *     - Find and replace: literal, with and without case, on the stem or
 *       the whole name, every match replaced; a regular expression with
 *       groups ($1, $2, $&) and one that does not compile, as a sentence
 *     - Case: lower, upper and title; the counter's start, padding (1 to
 *       6), separator, before and after, in the order of the entries
 *     - The extension: keep, lower, upper, set, and set to nothing;
 *       folders take whole-name rules only and never an extension
 *     - Clashes inside the batch, case-folded on win32 and darwin and
 *       not on linux; an existing sibling; a case-only rename of the item
 *       itself allowed on win32 while a real clash is refused; a chain
 *       and a swap refused; an item inside a folder renamed in the batch
 *       refused, and allowed while that folder keeps its name
 *     - Invalid names for the win32 and linux tables: reserved
 *       characters, a trailing dot or space, device names, separators,
 *       control characters, '.', '..', the 255-byte limit with multibyte
 *       text, and '.terrane-trash' in any case and, on win32, with
 *       trailing dots and spaces
 *     - The planner's name check agrees with guard.checkName for this
 *       platform on every name tried; summary, noteFor and blocker put
 *       the plan in words
 *     - 5,000 entries planned in well under a second
 *
 * ✒ Usage Instructions:
 *     node tools/rename-test.mjs
 *     npm test runs it after the finding test.
 *
 * ✒ Other Important Information:
 *     - Dependencies: Node.js 22+; web/js/rename.js, server/guard.mjs
 *       (checkName), server/ops.mjs (RENAMES_MAX)
 *     - Compatible platforms: Windows, macOS, Linux
 *     - Exit code 0 means every check passed
 * ----------------------------------------------------------------------------
 */

const R = await import(new URL('../web/js/rename.js', import.meta.url).href);
const { makeGuard } = await import(new URL('../server/guard.mjs', import.meta.url).href);
const { RENAMES_MAX } = await import(new URL('../server/ops.mjs', import.meta.url).href);
const os = await import('node:os');
const { applyRules, plan, summary, noteFor, blocker, nameProblem, splitName, foldFor, DEFAULT_RULES, RENAME_MAX } = R;

let passed = 0;
let failed = 0;
const check = (name, cond, detail = '') => {
  if (cond) passed++;
  else failed++;
  console.log(`${cond ? '  ok  ' : ' FAIL '} ${name}${cond || !detail ? '' : ' — ' + detail}`);
};
const section = (title) => console.log(`\n${title}`);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** Entries for one folder: every name a sibling of every other. */
const folder = (dir, names, { dirs = [], more = [] } = {}) => {
  const siblings = [...names, ...more];
  return names.map((n) => ({ path: dir ? `${dir}/${n}` : n, name: n, isDir: dirs.includes(n), siblings }));
};
const tos = (p) => p.rows.map((r) => r.to);
const problems = (p) => p.rows.map((r) => r.problem);

/* ---------- rules ---------- */

section('Rules');
{
  const a = (name, rules, opts = {}) => applyRules(name, { index: 0, ...opts }, rules);
  check('no rule changes nothing', a('Report 2024.PDF', {}) === 'Report 2024.PDF' && a('Report 2024.PDF', DEFAULT_RULES) === 'Report 2024.PDF');
  check('a literal Find replaces every match, without case by default', a('a-A-a.txt', { find: 'a', replace: 'b' }) === 'b-b-b.txt');
  check('Match case keeps to the case given', a('a-A-a.txt', { find: 'a', replace: 'b', matchCase: true }) === 'b-A-b.txt');
  check('Find and replace leave the extension alone', a('data.data', { find: 'data', replace: 'x' }) === 'x.data');
  check('Include the extension reaches it', a('data.data', { find: 'data', replace: 'x', wholeName: true }) === 'x.x');
  check('a literal Find escapes what a regular expression would read', a('a.b(c)[d]*.txt', { find: '(c)[d]*', replace: '!' }) === 'a.b!.txt');
  check('a literal Replace is literal: $1 and $& stay as typed', a('x.txt', { find: 'x', replace: '$1$&' }) === '$1$&.txt');
  check('a regular expression with groups: $2-$1', a('2024-11 notes.md', { find: '(\\d+)-(\\d+)', replace: '$2-$1', regex: true }) === '11-2024 notes.md');
  check('$& is the whole match', a('img7.png', { find: '\\d', replace: '[$&]', regex: true }) === 'img[7].png');
  check('a regular expression is without case by default, with it when asked',
    a('ABC.txt', { find: 'b', replace: '_', regex: true }) === 'A_C.txt' && a('ABC.txt', { find: 'b', replace: '_', regex: true, matchCase: true }) === 'ABC.txt');
  const bad = a('x', { find: '(', regex: true });
  check(`a regular expression that does not compile gives a sentence ("${bad.error}")`, bad && typeof bad.error === 'string' && /^The expression is not valid: .+/.test(bad.error) && !bad.error.includes('/('), JSON.stringify(bad));
  const badPlan = plan(folder('d', ['a.txt']), { find: '(', regex: true });
  check('and plan gives the same sentence and no rows', badPlan.error === bad.error && badPlan.rows.length === 0, JSON.stringify(badPlan));
  check('lower, upper and title case the name, not the extension',
    a('Big File.TXT', { caseMode: 'lower' }) === 'big file.TXT' && a('Big File.txt', { caseMode: 'upper' }) === 'BIG FILE.txt'
    && a('the quick-brown_fox (draft).md', { caseMode: 'title' }) === 'The Quick-Brown_Fox (Draft).md' && a("o'neil.txt", { caseMode: 'title' }) === "O'neil.txt");
  check('title case reaches letters past ASCII', a('élan vital.txt', { caseMode: 'title' }) === 'Élan Vital.txt');
  check('the counter: start, padding, separator, before and after',
    applyRules('a.txt', { index: 0 }, { counter: 'before', start: 1, pad: 3, sep: ' ' }) === '001 a.txt'
    && applyRules('a.txt', { index: 4 }, { counter: 'before', start: 1, pad: 3, sep: ' ' }) === '005 a.txt'
    && applyRules('a.txt', { index: 2 }, { counter: 'after', start: 10, pad: 1, sep: '-' }) === 'a-12.txt'
    && applyRules('a.txt', { index: 0 }, { counter: 'after', start: 0, pad: 6, sep: '_' }) === 'a_000000.txt');
  check('padding is kept between 1 and 6, and a start that is no number is 1',
    applyRules('a', { index: 0 }, { counter: 'before', pad: 9, sep: '' }) === '000001a' && applyRules('a', { index: 0 }, { counter: 'before', pad: 0, start: 'x', sep: '' }) === '1a');
  check('the extension: keep, lower, upper, set, and set to nothing',
    a('a.JPG', { ext: 'keep' }) === 'a.JPG' && a('a.JPG', { ext: 'lower' }) === 'a.jpg' && a('a.jpg', { ext: 'upper' }) === 'a.JPG'
    && a('a.jpeg', { ext: 'set', extText: '.jpg' }) === 'a.jpg' && a('a.jpeg', { ext: 'set', extText: '' }) === 'a' && a('noext', { ext: 'set', extText: 'md' }) === 'noext.md');
  check('folders take whole-name rules and never an extension',
    applyRules('My.Folder', { isDir: true, index: 1 }, { find: 'folder', replace: 'Dir', caseMode: 'lower', counter: 'after', start: 1, pad: 2, sep: ' ', ext: 'set', extText: 'x' }) === 'my.dir 02'
    && applyRules('v1.2', { isDir: true, index: 0 }, { ext: 'upper' }) === 'v1.2');
  check('a leading dot starts no extension, nor does a trailing one',
    same(splitName('.bashrc'), { stem: '.bashrc', ext: '' }) && same(splitName('a.tar.gz'), { stem: 'a.tar', ext: 'gz' }) && same(splitName('end.'), { stem: 'end.', ext: '' }));
  const counted = plan(folder('d', ['b.txt', 'a.txt', 'c.txt']), { counter: 'before', start: 1, pad: 2, sep: ' ' });
  check('the counter follows the order of the entries, as shown', same(tos(counted), ['01 b.txt', '02 a.txt', '03 c.txt']), JSON.stringify(tos(counted)));
}

/* ---------- clashes ---------- */

section('Clashes');
{
  const p1 = plan(folder('d', ['a.txt', 'b.txt']), { find: '[ab]', replace: 'x', regex: true }, { platform: 'linux' });
  check('two new names alike in one folder clash, each naming the other', same(problems(p1), ['clash: b.txt', 'clash: a.txt']) && noteFor(p1.rows[0]) === 'same new name as b.txt', JSON.stringify(p1.rows));
  const both = plan(folder('d', ['ab-1.txt', 'AB-2.txt']), { find: '-\\d', replace: '', regex: true }, { platform: 'darwin' });
  check('two new names alike but for case clash on darwin', same(problems(both), ['clash: AB-2.txt', 'clash: ab-1.txt']), JSON.stringify(both.rows));
  const bothWin = plan(folder('d', ['ab-1.txt', 'AB-2.txt']), { find: '-\\d', replace: '', regex: true }, { platform: 'win32' });
  check('and on win32', same(problems(bothWin), ['clash: AB-2.txt', 'clash: ab-1.txt']), JSON.stringify(bothWin.rows));
  const bothLinux = plan(folder('d', ['ab-1.txt', 'AB-2.txt']), { find: '-\\d', replace: '', regex: true }, { platform: 'linux' });
  check('and not on linux, where AB.txt and ab.txt are two names', same(problems(bothLinux), [null, null]), JSON.stringify(bothLinux.rows));
  check('foldFor: case and trailing dots and spaces on win32, case on darwin, nothing on linux',
    foldFor('win32')('Name.TXT. ') === 'name.txt' && foldFor('darwin')('Name.TXT') === 'name.txt' && foldFor('darwin')('a.') === 'a.' && foldFor('linux')('Name.TXT') === 'Name.TXT');

  const pq = folder('d', ['p.txt', 'q.txt']);
  const upper = plan(pq, { caseMode: 'upper' }, { platform: 'win32' });
  check('a case-only rename of each item is allowed on win32', same(problems(upper), [null, null]) && same(tos(upper), ['P.txt', 'Q.txt']), JSON.stringify(upper.rows));
  const taken = plan(folder('d', ['AB-2.txt'], { more: ['ab.txt'] }), { find: '-2', replace: '' }, { platform: 'win32' });
  check('while a real clash is refused on win32: AB-2.txt to AB.txt beside ab.txt', same(problems(taken), ['exists']), JSON.stringify(taken.rows));
  const takenLinux = plan(folder('d', ['AB-2.txt'], { more: ['ab.txt'] }), { find: '-2', replace: '' }, { platform: 'linux' });
  check('and allowed on linux', same(problems(takenLinux), [null]), JSON.stringify(takenLinux.rows));

  const sib = plan(folder('d', ['a.txt'], { more: ['b.txt', 'keep.txt'] }), { find: 'a', replace: 'keep' }, { platform: 'linux' });
  check('a new name an item outside the batch has is refused: exists', same(problems(sib), ['exists']) && noteFor(sib.rows[0]) === 'already in this folder', JSON.stringify(sib.rows));
  const sibCase = plan(folder('d', ['a.txt'], { more: ['KEEP.txt'] }), { find: 'a', replace: 'keep' }, { platform: 'win32' });
  check('found without case on win32', same(problems(sibCase), ['exists']), JSON.stringify(sibCase.rows));
  const stays = plan(folder('d', ['a.txt', 'b.txt']), { find: '^a', replace: 'b', regex: true }, { platform: 'linux' });
  check('the name an unchanged item of the batch keeps is taken: exists', same(problems(stays), ['exists', 'unchanged']), JSON.stringify(stays.rows));

  // The counter as the rule: 2.txt and 1.txt numbered from 1 swap names.
  const swap = plan(folder('d', ['2.txt', '1.txt']), { find: '^\\d', replace: '', regex: true, counter: 'before', start: 1, pad: 1, sep: '' }, { platform: 'linux' });
  check('a swap (2.txt to 1.txt and 1.txt to 2.txt) is a chain on both sides', same(problems(swap), ['chain', 'chain']) && same(tos(swap), ['1.txt', '2.txt'])
    && noteFor(swap.rows[0]) === 'another item has this name now: rename in two steps', JSON.stringify(swap.rows));
  const chain = plan(folder('d', ['1.txt', '2.txt']), { find: '^\\d', replace: '', regex: true, counter: 'before', start: 2, pad: 1, sep: '' }, { platform: 'linux' });
  check('a chain (1.txt to 2.txt while 2.txt goes to 3.txt) is refused on the first', same(problems(chain), ['chain', null]) && same(tos(chain), ['2.txt', '3.txt']), JSON.stringify(chain.rows));

  const nested = [
    { path: 'd/sub', name: 'sub', isDir: true, siblings: ['sub', 'x.txt'] },
    { path: 'd/sub/in.txt', name: 'in.txt', isDir: false, siblings: ['in.txt'] },
    { path: 'd/sub/deep/far.txt', name: 'far.txt', isDir: false, siblings: ['far.txt'] },
  ];
  const ins = plan(nested, { caseMode: 'upper' }, { platform: 'linux' });
  check('items inside a folder renamed in the batch are refused: inside', same(problems(ins), [null, 'inside', 'inside']) && noteFor(ins.rows[1]) === 'inside a folder renamed here: rename in two steps', JSON.stringify(ins.rows));
  const keepsName = plan(nested, { find: 'in', replace: 'out' }, { platform: 'linux' });
  check('and allowed while that folder keeps its name', same(problems(keepsName), ['unchanged', null, 'unchanged']) && keepsName.rows[1].to === 'out.txt', JSON.stringify(keepsName.rows));
  const apart = plan([...folder('d', ['a.txt']), ...folder('e', ['a.txt'])], { find: 'a', replace: 'z' }, { platform: 'linux' });
  check('the same new name in two folders is no clash', same(problems(apart), [null, null]));
}

/* ---------- names ---------- */

section('Names');
{
  const win = (n) => nameProblem(n, 'win32');
  const lin = (n) => nameProblem(n, 'linux');
  check('win32: < > : " | ? * refused, on linux allowed', ['a<b', 'a>b', 'a:b', 'a"b', 'a|b', 'a?b', 'a*b'].every((n) => win(n) && !lin(n)));
  check('win32: a trailing dot or space refused, on linux allowed', win('a.') && win('a ') && !lin('a.') && !lin('a '));
  check('win32: device names refused, with an extension too; on linux allowed', ['CON', 'prn.txt', 'aux', 'NUL.tar.gz', 'com1', 'LPT9.log'].every((n) => win(n) && !lin(n)) && !win('console') && !win('com10'));
  check('both: separators and control characters refused', ['a/b', 'a\\b', 'a\u0000b', 'tab\there', 'line\nbreak'].every((n) => win(n) && lin(n)));
  check('both: empty, . and .. refused', ['', '.', '..'].every((n) => win(n) && lin(n)) && !lin('...'));
  const at255 = 'é'.repeat(127) + 'a';      // 255 bytes in UTF-8
  const over = 'é'.repeat(128);             // 256 bytes, 128 characters
  check('the 255-byte limit counts UTF-8 bytes, not characters', !lin(at255) && lin(over) === 'longer than 255 bytes' && !lin('a'.repeat(255)) && !!lin('a'.repeat(256)) && !!lin('🗻'.repeat(64)));
  check('.terrane-trash is reserved in any case on every platform', ['.terrane-trash', '.TERRANE-TRASH', '.Terrane-Trash'].every((n) => win(n) && lin(n) && nameProblem(n, 'darwin')));
  check('and on win32 with trailing dots and spaces', !!win('.terrane-trash.') && !!win('.terrane-trash . ') && !!win('.TERRANE-TRASH..'));
  check('names that only look alike are allowed', !lin('terrane-trash') && !lin('.terrane-trash2') && !win('.terrane-trashx'));
  const invalid = plan(folder('d', ['a.txt']), { find: 'a', replace: 'b:c' }, { platform: 'win32' });
  check('an invalid new name is a row problem, said in words', invalid.rows[0].problem === 'invalid: Windows does not allow < > : " | ? * in names' && noteFor(invalid.rows[0]) === 'Windows does not allow < > : " | ? * in names');

  // The planner and the service agree on this platform.
  // checkName reads no file; the guard is made on the temp folder all the same.
  const g = await makeGuard(os.tmpdir());
  const tried = ['ok.txt', 'a:b', 'a.', 'a ', 'CON', 'prn.txt', 'a/b', 'a\\b', 'x\u0001y', '', '.', '..', at255, over, '.terrane-trash', '.TERRANE-TRASH', '.terrane-trash.',
    'a<b', 'a|b', 'com1', 'com10', 'émoji 🗻.txt', '-dash', 'name with  spaces'];
  const disagree = tried.filter((n) => {
    let refused = false;
    try {
      g.checkName(n);
    } catch {
      refused = true;
    }
    return refused !== !!nameProblem(n, process.platform);
  });
  check(`the planner's name check agrees with guard.checkName on ${process.platform} for ${tried.length} names`, disagree.length === 0, JSON.stringify(disagree));
}

/* ---------- words ---------- */

section('Words and speed');
{
  const rows = [
    { from: 'a', to: 'b', problem: null }, { from: 'c', to: 'c', problem: 'unchanged' }, { from: 'd', to: 'e', problem: 'clash: f' },
    { from: 'f', to: 'e', problem: 'clash: d' }, { from: 'g', to: 'h:', problem: 'invalid: Windows does not allow < > : " | ? * in names' },
    { from: 'i', to: 'j', problem: 'exists' }, { from: 'k', to: 'l', problem: 'chain' }, { from: 'm', to: 'n', problem: 'inside' }, { from: 'o', to: 'p', problem: null },
  ];
  check(`summary: "${summary(rows)}"`, summary(rows) === '2 to rename, 1 unchanged, 2 clash, 1 name taken, 2 need two steps, 1 invalid name', summary(rows));
  check('the summary of a plain plan', summary([{ problem: null }, { problem: null }, { problem: 'unchanged' }]) === '2 to rename, 1 unchanged');
  check('blocker names the first problem, and counts them', blocker({ rows, error: null }) === '6 names have a problem. d: same new name as f.', blocker({ rows, error: null }));
  check('blocker with nothing that changes, and with an expression that does not compile',
    /^Nothing changes yet/.test(blocker({ rows: [{ from: 'a', to: 'a', problem: 'unchanged' }], error: null })) && blocker({ rows: [], error: 'The expression is not valid: x' }) === 'The expression is not valid: x');
  check('blocker is null when every changed row is good', blocker({ rows: [{ problem: null }, { problem: 'unchanged' }], error: null }) === null);
  check(`the batch's bound is the service's: ${RENAME_MAX.toLocaleString('en-US')}`, RENAME_MAX === RENAMES_MAX && RENAME_MAX === 5000);

  const names = Array.from({ length: RENAME_MAX }, (_, i) => `IMG_${String(i).padStart(5, '0')}.JPG`);
  const big = names.map((n) => ({ path: `photos/${n}`, name: n, isDir: false, siblings: names }));
  let best = Infinity;
  let out = null;
  for (let k = 0; k < 3; k++) {
    const t0 = performance.now();
    out = plan(big, { find: 'IMG_', replace: 'trip-', ext: 'lower', counter: 'after', start: 1, pad: 4, sep: '-' }, { platform: 'win32' });
    best = Math.min(best, performance.now() - t0);
  }
  check(`${RENAME_MAX.toLocaleString('en-US')} entries in one folder planned in ${best.toFixed(1)} ms, the best of three (under 500 ms)`,
    best < 500 && out.rows.every((r) => r.problem === null) && out.rows[0].to === 'trip-00000-0001.jpg', out.rows[0].to);
}

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
