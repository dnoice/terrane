/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Batch Rename Planner (Terrane Edition - v1.0)
 *     - File Name: rename.js
 *     - Relative Path: web/js/rename.js
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
 *     Works out what a batch rename would do before anything is sent:
 *     each item's new name under a set of rules, and every reason one of
 *     them cannot be renamed. It holds no DOM and no state, so the
 *     dialog (batch.js) and the Node check (tools/rename-test.mjs) run
 *     the same code, and the service refuses what it refuses.
 *
 * ✒ Key Features:
 *     - applyRules(name, { isDir, index }, rules): Find and replace
 *       (literal or a regular expression, with or without case, on the
 *       name without its extension or with it), the case (keep, lower,
 *       upper, title), a counter (before or after, start, 1 to 6 digits,
 *       separator) and the extension (keep, lower, upper, or set);
 *       folders take whole-name rules only
 *     - A regular expression that does not compile gives { error } with
 *       the sentence the dialog shows; $1 to $9 and $& work in Replace
 *       with a regular expression, and Replace is literal text otherwise
 *     - plan(entries, rules, { platform }) gives one row per item, { path,
 *       from, to, problem, isDir }, with problem null, 'unchanged',
 *       'invalid: <why>', 'clash: <other>', 'exists', 'chain' or 'inside'
 *     - The name check mirrors the service's (guard.checkName) for the
 *       service's platform: empty, '.' and '..', over 255 UTF-8 bytes,
 *       the holding area's name in any case, separators and control
 *       characters, and on Windows < > : " | ? *, a trailing dot or space
 *       and the device names
 *     - Names are compared as the service's filesystem compares them:
 *       without case on Windows and macOS, and on Windows without
 *       trailing dots and spaces (foldFor, as guard.foldName)
 *     - A case-only rename of an item is allowed; two new names alike in
 *       one folder clash; a new name that another item has now is a
 *       chain (a swap is one), refused because Undo could not reverse it;
 *       an item inside a folder renamed in the same batch is refused,
 *       because its path changes first
 *     - noteFor(row) and summary(rows) put a row and the whole preview in
 *       words: "12 to rename, 3 unchanged, 2 clash, 1 invalid name"
 *
 * ✒ Usage Instructions:
 *     import { applyRules, plan, summary, noteFor, DEFAULT_RULES } from './rename.js';
 *     const rules = { ...DEFAULT_RULES, find: 'IMG_', replace: 'trip-' };
 *     const { rows, error } = plan(entries, rules, { platform: 'win32' });
 *     entries: [{ path: 'photos/IMG_01.jpg', name: 'IMG_01.jpg', isDir:
 *     false, siblings: ['IMG_01.jpg', 'IMG_02.jpg'] }], in the order shown
 *     (the counter follows it); siblings are every name in the item's
 *     folder, the batch's included.
 *
 * ✒ Examples:
 *     applyRules('IMG_0042.JPG', { isDir: false, index: 0 }, { find: 'IMG_', replace: 'trip-', ext: 'lower' })
 *         -> 'trip-0042.jpg'
 *     applyRules('a.txt', { index: 2 }, { counter: 'before', start: 1, pad: 3, sep: ' ' })
 *         -> '003 a.txt'
 *     applyRules('Old Folder', { isDir: true, index: 0 }, { caseMode: 'lower', ext: 'set', extText: 'x' })
 *         -> 'old folder'
 *     applyRules('x', { index: 0 }, { find: '(', regex: true })
 *         -> { error: 'The expression is not valid: ...' }
 *     summary(rows) -> '12 to rename, 3 unchanged, 2 clash, 1 invalid name'
 *
 * ✒ Other Important Information:
 *     - Dependencies: none (TextEncoder for the byte count)
 *     - Compatible platforms: any browser with ES2022 modules; Node.js
 *       22.5+ (tools/rename-test.mjs)
 *     - Limitations: the plan is made from the tree as last read; the
 *       service checks the disk again before the first rename and
 *       refuses the whole batch if anything has changed in the way
 * ----------------------------------------------------------------------------
 */

/** The most items one batch may rename; the service refuses more. */
export const RENAME_MAX = 5000;

/** The holding area's name, reserved in any case. */
const HOLD_DIR = '.terrane-trash';

/** Rules that change nothing: the dialog's starting values. */
export const DEFAULT_RULES = Object.freeze({
  find: '', replace: '', regex: false, matchCase: false, wholeName: false,
  caseMode: 'keep',
  counter: 'none', start: 1, pad: 1, sep: ' ',
  ext: 'keep', extText: '',
});

const WIN_RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i;
const utf8 = new TextEncoder();

/**
 * A name as the platform's filesystem compares it, the service's
 * guard.foldName: without case on Windows and macOS, and on Windows
 * without the trailing dots and spaces the system drops.
 */
export function foldFor(platform) {
  const folds = platform === 'win32' || platform === 'darwin';
  const win = platform === 'win32';
  return (name) => {
    let s = folds ? name.toLowerCase() : name;
    if (win) s = s.replace(/[. ]+$/, '');
    return s;
  };
}

/**
 * Why the service would refuse name on platform (guard.checkName), in a
 * few words, or null when it is a good name.
 */
export function nameProblem(name, platform) {
  if (typeof name !== 'string' || name.length === 0) return 'a name is required';
  if (name === '.' || name === '..') return 'that name is reserved';
  if (utf8.encode(name).length > 255) return 'longer than 255 bytes';
  if (name.toLowerCase() === HOLD_DIR || foldFor(platform)(name) === HOLD_DIR) return 'reserved by Terrane for its holding area';
  // eslint-disable-next-line no-control-regex
  if (/[/\\\u0000-\u001f]/.test(name)) return 'a name cannot hold a slash or a control character';
  if (platform === 'win32') {
    if (/[<>:"|?*]/.test(name)) return 'Windows does not allow < > : " | ? * in names';
    if (/[. ]$/.test(name)) return 'Windows names cannot end with a dot or a space';
    if (WIN_RESERVED.test(name)) return 'a reserved Windows device name';
  }
  return null;
}

/** A file name split at its last dot: a leading dot starts no extension, nor does a trailing one. */
export function splitName(name) {
  const dot = name.lastIndexOf('.');
  if (dot <= 0 || dot === name.length - 1) return { stem: name, ext: '' };
  return { stem: name.slice(0, dot), ext: name.slice(dot + 1) };
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * The Find rule as one expression: { re, literal } when there is a Find,
 * null when there is none, { error } when a regular expression does not
 * compile.
 */
export function compileFind(rules) {
  const find = rules.find ?? '';
  if (!find) return null;
  const flags = rules.matchCase ? 'g' : 'gi';
  if (!rules.regex) return { re: new RegExp(escapeRe(find), flags), literal: true };
  try {
    return { re: new RegExp(find, flags), literal: false };
  } catch (err) {
    // "Invalid regular expression: /(/gi: Unterminated group" -> "Unterminated group"
    return { error: `The expression is not valid: ${String(err.message).replace(/^Invalid regular expression: \/.*\/[a-z]*: /s, '').replace(/^Invalid regular expression: /, '')}` };
  }
}

/** Title case: each word's first letter in capitals, the rest in small letters. */
function titleCase(s) {
  return s.toLowerCase().replace(/(^|[\s\-_.([{])(\p{L})/gu, (_, before, letter) => before + letter.toUpperCase());
}

function caseOf(s, mode) {
  if (mode === 'lower') return s.toLowerCase();
  if (mode === 'upper') return s.toUpperCase();
  if (mode === 'title') return titleCase(s);
  return s;
}

const clampInt = (v, lo, hi, dflt) => {
  const n = Math.trunc(Number(v));
  return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : dflt;
};

/** The counter's text for the item at index: start + index, padded with zeros. */
export function counterText(rules, index) {
  const start = clampInt(rules.start, 0, 1e9, 1);
  const pad = clampInt(rules.pad, 1, 6, 1);
  return String(start + index).padStart(pad, '0');
}

/**
 * The new name of one item under rules, or { error } when the Find
 * expression does not compile. index is the item's place in the batch
 * (the counter's), isDir keeps a folder to whole-name rules. compiled may
 * hand in compileFind(rules) made once for many names.
 */
export function applyRules(name, { isDir = false, index = 0 } = {}, rules = {}, compiled = undefined) {
  const r = { ...DEFAULT_RULES, ...rules };
  const find = compiled === undefined ? compileFind(r) : compiled;
  if (find?.error) return { error: find.error };
  const swap = (s) => {
    if (!find) return s;
    find.re.lastIndex = 0;
    return find.literal ? s.replace(find.re, () => r.replace ?? '') : s.replace(find.re, r.replace ?? '');
  };
  let stem;
  let ext = '';
  if (isDir) stem = swap(name);
  else if (r.wholeName) ({ stem, ext } = splitName(swap(name)));
  else {
    ({ stem, ext } = splitName(name));
    stem = swap(stem);
  }
  stem = caseOf(stem, r.caseMode);
  if (r.counter === 'before' || r.counter === 'after') {
    const n = counterText(r, index);
    const sep = r.sep ?? '';
    stem = r.counter === 'before' ? `${n}${sep}${stem}` : `${stem}${sep}${n}`;
  }
  if (isDir) return stem;
  if (r.ext === 'lower') ext = ext.toLowerCase();
  else if (r.ext === 'upper') ext = ext.toUpperCase();
  else if (r.ext === 'set') ext = String(r.extText ?? '').replace(/^\.+/, '');
  return ext ? `${stem}.${ext}` : stem;
}

const parentOf = (p) => (p.includes('/') ? p.slice(0, p.lastIndexOf('/')) : '');

/**
 * What a batch would do: one row per entry, in the entries' order, { path,
 * from, to, problem, isDir }. entries: [{ path, name, isDir, siblings }], where
 * siblings are every name in the entry's folder, the batch's included.
 * Returns { rows, error }: error is the sentence for a Find expression
 * that does not compile, and rows is then empty.
 *
 * Problems, in the order they are looked for:
 *   'unchanged'      the new name is the old one
 *   'invalid: <why>' the service would refuse the name
 *   'inside'         the item is inside a folder renamed in this batch
 *   'clash: <other>' another item in the same folder gets the same name
 *   'chain'          another item in the batch has the new name now
 *   'exists'         an item outside the batch has the new name
 * A case-only rename of the item itself is no clash where case does not
 * matter. A name an unchanged item of the batch keeps is 'exists'.
 */
export function plan(entries, rules, { platform = 'linux' } = {}) {
  const r = { ...DEFAULT_RULES, ...rules };
  const find = compileFind(r);
  if (find?.error) return { rows: [], error: find.error };
  const fold = foldFor(platform);
  const rows = entries.map((e, index) => {
    const to = applyRules(e.name, { isDir: !!e.isDir, index }, r, find);
    return { path: e.path, from: e.name, to, problem: to === e.name ? 'unchanged' : null, isDir: !!e.isDir, parent: parentOf(e.path), siblings: e.siblings };
  });
  // Folders of the batch that change, by path: what is inside one moves with it.
  const renamedDirs = new Set(rows.filter((x) => x.isDir && x.problem === null).map((x) => x.path));
  // Per folder: the batch's current names (folded), the rows that change,
  // and every name there now (folded once per sibling list handed in).
  const byParent = new Map();
  for (const x of rows) {
    let g = byParent.get(x.parent);
    if (!g) byParent.set(x.parent, (g = { now: new Map(), targets: new Map(), all: new Set(), lists: new Set() }));
    g.now.set(fold(x.from), x);
    if (Array.isArray(x.siblings) && !g.lists.has(x.siblings)) {
      g.lists.add(x.siblings);
      for (const n of x.siblings) g.all.add(fold(n));
    }
  }
  for (const x of rows) {
    if (x.problem) continue;
    const why = nameProblem(x.to, platform);
    if (why) {
      x.problem = `invalid: ${why}`;
      continue;
    }
    let inside = false;
    for (let p = x.parent; p && !inside; p = parentOf(p)) inside = renamedDirs.has(p);
    if (inside) {
      x.problem = 'inside';
      continue;
    }
    const g = byParent.get(x.parent);
    const key = fold(x.to);
    const twin = g.targets.get(key);
    if (twin) {
      x.problem = `clash: ${twin.from}`;
      if (!twin.problem) twin.problem = `clash: ${x.from}`;
      continue;
    }
    g.targets.set(key, x);
  }
  // Against what is in each folder now: the batch's own names, then the
  // rest (no item of the batch holds key, so a name there that folds to
  // it is outside the batch).
  for (const x of rows) {
    if (x.problem) continue;
    const g = byParent.get(x.parent);
    const key = fold(x.to);
    const holder = g.now.get(key);
    if (holder === x) continue;   // a case-only rename of the item itself
    if (holder) x.problem = holder.problem === 'unchanged' ? 'exists' : 'chain';
    else if (g.all.has(key)) x.problem = 'exists';
  }
  return { rows: rows.map(({ path, from, to, problem, isDir }) => ({ path, from, to, problem, isDir })), error: null };
}

/** A row's problem in words for the preview's Note column; '' for a row that renames. */
export function noteFor(row) {
  const p = row.problem;
  if (!p) return '';
  if (p === 'unchanged') return 'unchanged';
  if (p.startsWith('invalid: ')) return p.slice(9);
  if (p.startsWith('clash: ')) return `same new name as ${p.slice(7)}`;
  if (p === 'exists') return 'already in this folder';
  if (p === 'chain') return 'another item has this name now: rename in two steps';
  if (p === 'inside') return 'inside a folder renamed here: rename in two steps';
  return p;
}

/** The kind of a row's problem: 'rename', 'unchanged', 'clash', 'exists', 'steps' or 'invalid'. */
export function kindOf(row) {
  const p = row.problem;
  if (!p) return 'rename';
  if (p === 'unchanged') return 'unchanged';
  if (p.startsWith('invalid: ')) return 'invalid';
  if (p.startsWith('clash: ')) return 'clash';
  if (p === 'exists') return 'exists';
  return 'steps';
}

const count = (n, one, many = `${one}s`) => `${n.toLocaleString('en-US')} ${n === 1 ? one : many}`;

/** The preview in one sentence: "12 to rename, 3 unchanged, 2 clash, 1 invalid name". */
export function summary(rows) {
  const k = { rename: 0, unchanged: 0, clash: 0, exists: 0, steps: 0, invalid: 0 };
  for (const x of rows) k[kindOf(x)]++;
  const parts = [`${k.rename.toLocaleString('en-US')} to rename`];
  if (k.unchanged) parts.push(`${k.unchanged.toLocaleString('en-US')} unchanged`);
  if (k.clash) parts.push(`${k.clash.toLocaleString('en-US')} clash`);
  if (k.exists) parts.push(`${count(k.exists, 'name', 'names')} taken`);
  if (k.steps) parts.push(`${k.steps.toLocaleString('en-US')} need${k.steps === 1 ? 's' : ''} two steps`);
  if (k.invalid) parts.push(count(k.invalid, 'invalid name'));
  return parts.join(', ');
}

/**
 * Why a batch cannot be applied as it stands, or null when it can: a Find
 * that does not compile, nothing that changes, or a row with a problem
 * other than unchanged (the first one is named).
 */
export function blocker({ rows, error }) {
  if (error) return error;
  const bad = rows.find((x) => x.problem && x.problem !== 'unchanged');
  if (bad) {
    const n = rows.filter((x) => x.problem && x.problem !== 'unchanged').length;
    return `${n === 1 ? 'One name has' : `${n.toLocaleString('en-US')} names have`} a problem. ${bad.from}: ${noteFor(bad)}.`;
  }
  if (!rows.some((x) => !x.problem)) return 'Nothing changes yet: give a Find, a case, a number or an extension.';
  return null;
}
