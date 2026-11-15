/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Folder Diff (Terrane Edition - v1.0)
 *     - File Name: diff.js
 *     - Relative Path: web/js/diff.js
 *     - Artifact Type: javascript
 *     - Version: 1.0.0
 *     - Date: 11/15/2026
 *     - Update: Sunday, November 15, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Changelog:
 *     - 1.0.0 (11/15/2026) [dendogg + Anthropic - Claude Opus 5.5] —
 *       Initial release: two folders' direct entries matched by name, what
 *       is only in one, in both but changed, and the same, ranked by size;
 *       the labels, the sentence and the row lines Compare speaks.
 *
 * ✒ Description:
 *     The logic of the right panel's Compare tab, without the DOM, so the
 *     page and compare-test read the same rules. A side is what Compare
 *     keeps of a folder (sideOfFolder) or of a benchmark (sideOfBench):
 *     figures and direct entries, never nodes, so a pair outlives a region
 *     let go. diff() matches the entries of two sides by name and sorts
 *     them into four groups.
 *
 * ✒ Key Features:
 *     - Exact names first; on Windows and macOS (foldFor) the rest by
 *       their folded names, one to one, and a name two entries of one side
 *       fold to is matched exactly only
 *     - A row's why: kind (a folder on one side, a file on the other),
 *       unread, size, files, folders (a folder by its counts), time (a
 *       file whose last change differs by more than 2 seconds) and link;
 *       a folder's own time is never compared; none means the same
 *     - Every list ranked by size, largest first, ties by name in
 *       codepoint order
 *     - A benchmark pair matches as places.compare does (kind and name,
 *       never folded), so the Landmarks and Compare never disagree
 *     - What a region did not send (a folder's tail) and what a benchmark
 *       summed (its rest) are carried, and said by unsentText and
 *       partialText
 *     - Sentences say "changed", never "created" or "added", and dates
 *       read MM/DD/YYYY
 *
 * ✒ Usage Instructions:
 *     import { sideOfFolder, diff, labels, sentence } from './diff.js';
 *     const a = sideOfFolder(nodeA, 'Projects/harbor-api/node_modules');
 *     const b = sideOfFolder(nodeB, 'Projects/tidepool-web/node_modules');
 *     const res = diff(a, b, { platform: 'win32' });
 *     const lab = labels(a.rel, b.rel, 'Studio');
 *     sentence(res, lab, a, b);
 *
 * ✒ Examples:
 *     labels('a/x/node_modules', 'b/x/node_modules', 'r')  ->  ['a/x/node_modules', 'b/x/node_modules']
 *     labels('Photos/2019/Coast', 'Archive/Pictures/Coast', 'r')  ->  ['2019/Coast', 'Pictures/Coast']
 *     sentence(...)  ->  'The second is 44.0 MB smaller, with 1,192 fewer files. Of 377 names, …'
 *
 * ✒ Other Important Information:
 *     - Dependencies: model.js (formatting, kids, FLAG_LINK), rename.js
 *       (foldFor)
 *     - Compatible platforms: any browser with ES2022 modules; Node.js 22
 *     - Performance: two Maps and three sorts; 2 × 100,000 entries in
 *       well under 400 ms (compare-test measures it)
 * ----------------------------------------------------------------------------
 */

import { fmtBytes, fmtCount, fmtDay, fmtDate, plural, kids, FLAG_LINK } from './model.js';
import { foldFor } from './rename.js';

/** Two files whose last changes differ by no more than this are the same (FAT keeps 2 s). */
export const TOLERANCE_MS = 2000;
/** Rows a group draws before "Show 100 more". */
export const ROWS = 100;

/** Names in codepoint order (an astral character after every BMP one), not UTF-16 unit order. */
export function cmpName(a, b) {
  if (a === b) return 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const x = a.charCodeAt(i);
    const y = b.charCodeAt(i);
    if (x === y) continue;
    const sx = x >= 0xd800 && x <= 0xdfff;
    const sy = y >= 0xd800 && y <= 0xdfff;
    if (sx !== sy) return sx ? 1 : -1;
    return x - y;
  }
  return a.length - b.length;
}

const lastSeg = (rel) => (rel ? rel.slice(rel.lastIndexOf('/') + 1) : '');

/**
 * What Compare keeps of a folder: its own figures (the whole subtree's)
 * and its held direct entries. tail is what a region did not send.
 */
export function sideOfFolder(node, rel) {
  const entries = node.c.map((c) => ({
    name: c.n, d: !!c.d, s: c.s, f: c.d ? c.fc : 1, fc: c.d ? c.fc : undefined, dc: c.d ? c.dc : undefined,
    m: c.d ? null : c.m, e: c.e || 0, link: !!(c.f & FLAG_LINK), k: c.d ? undefined : c.k,
  }));
  return {
    kind: 'folder', rel, name: node.n, s: node.s, fc: node.fc, dc: node.dc, items: kids(node), mm: node.mm,
    ks: node.ks ? Array.from(node.ks) : null, e: node.e || 0, entries,
    tail: node.tail ? { n: node.tail.n, s: node.tail.s } : null,
  };
}

/**
 * What Compare keeps of a benchmark: the figures measured then and its 64
 * largest entries by name (places.measure). No kinds, no ages, no times.
 */
export function sideOfBench(b) {
  const m = b.m;
  return {
    kind: 'bench', rel: b.rel, name: b.name, at: m.at, s: m.s, fc: m.fc, dc: m.dc, items: m.items, mm: m.mm, ks: null, e: 0,
    kept: m.top.length, rest: m.rest,
    entries: m.top.map(([n, d, s, f]) => ({ name: n, d: !!d, s, f, fc: d ? f : undefined, dc: undefined, m: null, e: 0, link: false })),
    tail: null,
  };
}

/** Whether rel lies inside base (base '' is the root, which holds every other path). */
const inside = (rel, base) => rel !== base && (base === '' || rel.startsWith(`${base}/`));

/**
 * Why two matched entries differ: [] when they are the same. A benchmark
 * pair is judged as places.compare judges it: by size and file count.
 */
function whyOf(x, y, tolerance, bench = false) {
  if (bench) return [x.s !== y.s ? 'size' : null, (x.fc ?? x.f) !== (y.fc ?? y.f) ? 'files' : null].filter(Boolean);
  if (x.d !== y.d) return ['kind'];
  if (x.e || y.e) return ['unread'];
  const why = [];
  if (x.s !== y.s) why.push('size');
  if (x.d) {
    if ((x.fc ?? x.f) !== (y.fc ?? y.f)) why.push('files');
    if (x.dc !== undefined && y.dc !== undefined && x.dc !== y.dc) why.push('folders');
  } else if (x.m != null && y.m != null && Math.abs(x.m - y.m) > tolerance) why.push('time');
  if (x.link !== y.link) why.push('link');
  return why;
}

const rowOf = (x, y) => ({
  key: '', name: [x?.name ?? null, y?.name ?? null], d: [x ? x.d : null, y ? y.d : null], s: [x ? x.s : null, y ? y.s : null],
  f: [x ? x.f : null, y ? y.f : null], m: [x ? x.m : null, y ? y.m : null], x: [x || null, y || null], why: [],
});

/** The row's own name: the first side's, else the second's. */
export const rowName = (r) => r.name[0] ?? r.name[1];
/** A row's size for ranking: the larger side. */
export const rowSize = (r) => Math.max(r.s[0] ?? 0, r.s[1] ?? 0);
const byBoth = (a, b) => rowSize(b) - rowSize(a) || cmpName(rowName(a), rowName(b));

/**
 * The difference of two sides' direct entries, matched by name.
 * Benchmark pairs match by kind and name, unfolded, as places.compare.
 */
export function diff(a, b, { platform = 'linux', tolerance = TOLERANCE_MS } = {}) {
  const bench = a.kind === 'bench' || b.kind === 'bench';
  const keyOf = bench ? (e) => `${e.d ? 1 : 0}|${e.name}` : (e) => e.name;
  const B = new Map();
  for (const e of b.entries) B.set(keyOf(e), e);
  const pairs = [];
  const rest0 = [];
  const used = new Set();
  for (const e of a.entries) {
    const k = keyOf(e);
    const o = B.get(k);
    if (o && !used.has(k)) {
      used.add(k);
      pairs.push([e, o]);
    } else rest0.push(e);
  }
  let rest1 = b.entries.filter((e) => !used.has(keyOf(e)));
  const folds = !bench && (platform === 'win32' || platform === 'darwin');
  if (folds && rest0.length && rest1.length) {
    const fold = foldFor(platform);
    const count = (list) => {
      const m = new Map();
      for (const e of list) {
        const k = fold(e.name);
        m.set(k, (m.get(k) || 0) + 1);
      }
      return m;
    };
    // A name two entries of one side fold to is matched exactly only.
    const c0 = count(a.entries);
    const c1 = count(b.entries);
    const by1 = new Map();
    for (const e of rest1) {
      const k = fold(e.name);
      if (c1.get(k) === 1) by1.set(k, e);
    }
    const left = [];
    const took = new Set();
    for (const e of rest0.slice().sort((x, y) => cmpName(x.name, y.name))) {
      const k = fold(e.name);
      const o = c0.get(k) === 1 ? by1.get(k) : undefined;
      if (o && !took.has(o)) {
        took.add(o);
        pairs.push([e, o]);
      } else left.push(e);
    }
    rest0.length = 0;
    rest0.push(...left);
    rest1 = rest1.filter((e) => !took.has(e));
  }
  const only0 = rest0.map((e) => rowOf(e, null));
  const only1 = rest1.map((e) => rowOf(null, e));
  const changed = [];
  const same = [];
  for (const [x, y] of pairs) {
    const r = rowOf(x, y);
    r.why = whyOf(x, y, tolerance, bench);
    (r.why.length ? changed : same).push(r);
  }
  only0.sort((p, q) => (q.s[0] - p.s[0]) || cmpName(p.name[0], q.name[0]));
  only1.sort((p, q) => (q.s[1] - p.s[1]) || cmpName(p.name[1], q.name[1]));
  changed.sort(byBoth);
  same.sort(byBoth);
  for (const r of only0) r.key = `0/${r.name[0]}`;
  for (const r of only1) r.key = `1/${r.name[1]}`;
  for (const r of changed) r.key = `c/${r.name[0]}`;
  for (const r of same) r.key = `s/${r.name[0]}`;
  const sum = (list, i) => list.reduce((t, r) => t + (r.s[i] ?? 0), 0);
  const restOf = (x) => (x.kind === 'bench' && x.rest?.n > 0 ? { n: x.rest.n, s: x.rest.s, f: x.rest.f } : null);
  let nest = null;
  if (a.kind === 'folder' && b.kind === 'folder') nest = inside(a.rel, b.rel) ? 'a-in-b' : inside(b.rel, a.rel) ? 'b-in-a' : null;
  return {
    only: [only0, only1], changed, same,
    count: { only0: only0.length, only1: only1.length, changed: changed.length, same: same.length, names: only0.length + only1.length + changed.length + same.length },
    bytes: { only0: sum(only0, 0), only1: sum(only1, 1), changed: changed.reduce((t, r) => t + rowSize(r), 0), same: sum(same, 0) },
    unsent: [a.tail || null, b.tail || null],
    partial: [restOf(a), restOf(b)],
    nest,
    bench,
  };
}

/**
 * The words that tell two sides apart: the shortest '/'-joined path tails
 * that differ ('' is the root, named rootName); one inside the other, and
 * named differently, by their own names. at, for a benchmark pair, holds
 * each side's moment of measuring (null for the side measured now):
 * "harbor-api, now" and "harbor-api, 11/12/2026 14:03".
 */
export function labels(rel0, rel1, rootName, at = [null, null]) {
  if (at[0] != null || at[1] != null) {
    const name = lastSeg(rel0 || rel1) || rootName;
    return [0, 1].map((i) => (at[i] == null ? `${name}, now` : `${name}, ${fmtDate(at[i])}`));
  }
  if (rel0 === '' || rel1 === '') return [lastSeg(rel0) || rootName, lastSeg(rel1) || rootName];
  const n0 = lastSeg(rel0);
  const n1 = lastSeg(rel1);
  if ((inside(rel0, rel1) || inside(rel1, rel0)) && n0 !== n1) return [n0, n1];
  const s0 = rel0.split('/');
  const s1 = rel1.split('/');
  const max = Math.max(s0.length, s1.length);
  for (let k = 1; k <= max; k++) {
    const t0 = s0.slice(-k).join('/');
    const t1 = s1.slice(-k).join('/');
    if (t0 !== t1) return [t0, t1];
  }
  return [rel0, rel1];
}

/** "48 only in a and 17 only in b", with none for a zero. */
const onlyWords = (n, lab) => `${n ? fmtCount(n) : 'none'} only in ${lab}`;

/**
 * One sentence about a comparison, in plain words. lab is labels();
 * a and b the two sides.
 */
export function sentence(res, lab, a, b) {
  const { count } = res;
  if (res.bench) {
    const nowI = a.kind === 'bench' ? 1 : 0;
    const now = nowI ? b : a;
    const then = nowI ? a : b;
    const name = now.name;
    const ds = now.s - then.s;
    const when = fmtDate(then.at);
    const size = ds > 0 ? `${fmtBytes(ds)} larger than` : ds < 0 ? `${fmtBytes(-ds)} smaller than` : 'the same size as';
    const gone = count[nowI ? 'only0' : 'only1'];
    const here = count[nowI ? 'only1' : 'only0'];
    const parts = [];
    if (gone) parts.push(`${plural(gone, 'entry', 'entries')} no longer here`);
    if (here) parts.push(`${fmtCount(here)} here now`);
    if (count.changed) parts.push(`${fmtCount(count.changed)} changed`);
    const list = parts.length ? `: ${parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}` : parts[0]}` : ': its own entries are as they were';
    return `${name} is ${size} when measured on ${when}${list}.`;
  }
  const lead = [];
  if (res.nest) {
    const [inner, outer] = res.nest === 'a-in-b' ? [lab[0], lab[1]] : [lab[1], lab[0]];
    lead.push(`${inner} lies inside ${outer}, so its bytes are part of ${outer}'s.`);
  }
  for (const [x, l] of [[a, lab[0]], [b, lab[1]]]) if (x.e) lead.push(`${l} could not be read, so its entries are not compared.`);
  const unsent = res.unsent.some(Boolean);
  if (!count.names && !unsent) return [...lead, a.e || b.e ? '' : 'Both folders are empty.'].filter(Boolean).join(' ');
  if (!count.only0 && !count.only1 && !count.changed && !unsent) {
    return [...lead, `The two hold the same ${plural(count.same, 'entry', 'entries')}, each the same size and last change.`].join(' ');
  }
  const ds = b.s - a.s;
  const df = b.fc - a.fc;
  const size = ds > 0 ? `The second is ${fmtBytes(ds)} larger` : ds < 0 ? `The second is ${fmtBytes(-ds)} smaller` : 'The two are the same size';
  const files = df > 0 ? `with ${plural(df, 'more file', 'more files')}` : df < 0 ? `with ${plural(-df, 'fewer file', 'fewer files')}` : 'with as many files';
  const both = count.changed + count.same;
  const bothWords = !both ? 'none is in both'
    : !count.changed ? `${fmtCount(both)} ${both === 1 ? 'is' : 'are'} in both and the same`
      : !count.same ? `${fmtCount(both)} ${both === 1 ? 'is' : 'are'} in both, ${both === 1 ? 'changed' : 'all changed'}`
        : `${fmtCount(both)} are in both (${fmtCount(count.changed)} changed, ${fmtCount(count.same)} the same)`;
  const names = `Of ${plural(count.names, 'name')}, ${bothWords}, ${onlyWords(count.only0, lab[0])} and ${onlyWords(count.only1, lab[1])}.`;
  return [...lead, `${size}, ${files}.`, names].join(' ');
}

/** "Inside x in both: …": the sentence's counts alone, for a drill. */
export function shortSentence(res, lab) {
  const { count } = res;
  if (!count.names) return 'both are empty.';
  const parts = [];
  if (count.changed) parts.push(`${fmtCount(count.changed)} changed`);
  if (count.same) parts.push(`${fmtCount(count.same)} the same`);
  parts.push(onlyWords(count.only0, lab[0]));
  parts.push(onlyWords(count.only1, lab[1]));
  return `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}.`;
}

/**
 * The second line of a row that differs, as parts: strings, and
 * { mark, text } for a side's mark with a figure after it (text may be
 * absent: the mark alone). partsText() reads them as plain text.
 *   [{ mark: 0, text: '1.2 MB' }, ' · ', { mark: 1, text: '980 KB' }, ' · larger in ', { mark: 0 }]
 */
export function whyText(row) {
  const w = row.why;
  if (w.includes('kind')) {
    const fi = row.d[0] ? 0 : 1;
    return ['a folder in ', { mark: fi }, ', a file in ', { mark: 1 - fi }];
  }
  if (w.includes('unread')) {
    const e0 = row.x[0]?.e;
    const e1 = row.x[1]?.e;
    return e0 && e1 ? ['cannot be read in either'] : ['cannot be read in ', { mark: e0 ? 0 : 1 }];
  }
  const out = [];
  const more = (n, one, many, i) => out.push(`${plural(n, one, many)} in `, { mark: i });
  if (w.includes('size')) {
    out.push({ mark: 0, text: fmtBytes(row.s[0]) }, ' · ', { mark: 1, text: fmtBytes(row.s[1]) }, ' · larger in ', { mark: row.s[0] > row.s[1] ? 0 : 1 });
  } else out.push('same size');
  const f0 = row.x[0]?.fc ?? row.f[0];
  const f1 = row.x[1]?.fc ?? row.f[1];
  if (w.includes('files')) {
    out.push(w.includes('size') ? ' · ' : '; ');
    more(Math.abs(f0 - f1), 'more file', 'more files', f0 > f1 ? 0 : 1);
  }
  if (w.includes('folders')) {
    const d0 = row.x[0].dc;
    const d1 = row.x[1].dc;
    out.push(w.includes('size') || w.includes('files') ? ' · ' : '; ');
    more(Math.abs(d0 - d1), 'more folder', 'more folders', d0 > d1 ? 0 : 1);
  }
  if (w.includes('time')) {
    out.push(w.includes('size') ? ' · changed later in ' : '; changed later in ', { mark: row.m[0] > row.m[1] ? 0 : 1 }, ` (${fmtDay(row.m[0])}, ${fmtDay(row.m[1])})`);
  }
  if (w.includes('link')) out.push(' · a link in ', { mark: row.x[0].link ? 0 : 1 }, ' only');
  return out;
}

/** Parts as plain text: a mark as ● or ○, then its figure. */
export function partsText(parts) {
  return parts.map((p) => (typeof p === 'string' ? p : `${p.mark ? '○' : '●'}${p.text ? ` ${p.text}` : ''}`)).join('');
}

/**
 * What a region did not send of a side, and what that means for the
 * other side's Only-in list.
 */
export function unsentText(side, label, other) {
  const t = side.tail;
  if (!t?.n) return '';
  const sent = Math.max(0, side.items - t.n);
  return `${label} holds ${plural(side.items, 'entry', 'entries')}; the service sends a folder's ${fmtCount(sent)} largest, so its ${fmtCount(t.n)} smallest (${fmtBytes(t.s)}) are not compared. An entry listed as only in ${other} may be among them.`;
}

/** What a benchmark summed instead of keeping by name. */
export function partialText(bench) {
  const r = bench.rest;
  if (!r?.n) return '';
  const all = bench.kept + r.n;
  return `The benchmark kept the ${fmtCount(bench.kept)} largest of its ${fmtCount(all)} entries by name; the other ${fmtCount(r.n)} (${fmtBytes(r.s)}) were summed, so an entry not among them then is listed as here now, not among the ${fmtCount(bench.kept)} largest then.`;
}

