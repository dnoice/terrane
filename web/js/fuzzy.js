/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Fuzzy Match (Terrane Edition - v1.0)
 *     - File Name: fuzzy.js
 *     - Relative Path: web/js/fuzzy.js
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
 *     Scores how well a typed query matches a name, the way a command
 *     palette does: the query's characters must appear in the name in
 *     order, and the best placement wins. It touches no DOM, so it runs in
 *     Node as in the page, and it ranks a few hundred thousand names
 *     within a keystroke's budget.
 *
 * ✒ Key Features:
 *     - A match is a subsequence, case-insensitive; anything else scores
 *       -Infinity and is left out
 *     - Bonuses for the first character, for a word start (after a space,
 *       - _ . / or \, or at a camel hump) and for runs of consecutive
 *       characters; penalties for gaps, a late start and length
 *     - The best placement is found by one pass per query character over
 *       the name (dynamic programming in preallocated typed arrays), not
 *       by trying every placement
 *     - A cheap subsequence test rejects most names before any scoring
 *     - rank() keeps the best few in a small sorted buffer: no sort of
 *       the whole list, equal scores in list order
 *
 * ✒ Usage Instructions:
 *     import { score, rank } from './fuzzy.js';
 *     score('rep', 'report.pdf');      // a finite score
 *     score('xyz', 'report.pdf');      // -Infinity
 *     rank('lens', actions, { limit: 8, key: (a) => a.label });
 *     rank('docs/ra', places, { limit: 40, key: (p) => p.path, lower: (p) => p.lowerPath });
 *
 * ✒ Examples:
 *     score('rep', 'report.pdf') > score('rep', 'my-report') > score('rep', 'prepare')
 *     score('mr', 'MyReport') > score('mr', 'summary')     // camel hump
 *     rank('age', items, { limit: 8, key })  ->  [{ item, score }, ...]
 *
 * ✒ Other Important Information:
 *     - Dependencies: none
 *     - Compatible platforms: any browser with ES2022 modules; Node.js 22
 *     - Performance: 200,000 names in well under 150 ms in Node on the
 *       development machine (tools/finding-test.mjs holds the ceiling)
 *     - Limitations: a query longer than 64 characters, or a name longer
 *       than 1,024, is matched as a plain substring with no placement
 *       scoring
 * ----------------------------------------------------------------------------
 */

/* Weights. A prefix and a word start must outweigh a run in mid-word. */
const MATCH = 1;
const PREFIX = 10;
const WORD = 7;
const CONSEC = 5;
const GAP_OPEN = 1.5;
const GAP_EXT = 0.3;
const LEAD = 0.15;
const LEAD_MAX = 3;
const LENGTH = 0.02;
const MAX_Q = 64;
const MAX_S = 1024;

const SEPARATOR = new Set([' ', '-', '_', '.', '/', '\\', ':', '(', '[', ',']);

// Scratch rows for the dynamic programme, grown as names need.
let prev = new Float64Array(256);
let cur = new Float64Array(256);
let bonus = new Float64Array(256);

const isLower = (c) => c >= 97 && c <= 122;
const isUpper = (c) => c >= 65 && c <= 90;
const isDigit = (c) => c >= 48 && c <= 57;

/** The bonus for a match at j of s: the first character, or a word start. */
function bonusAt(s, j) {
  if (j === 0) return PREFIX;
  const p = s.charCodeAt(j - 1);
  if (SEPARATOR.has(s[j - 1])) return WORD;
  const c = s.charCodeAt(j);
  if ((isLower(p) || isDigit(p)) && isUpper(c)) return WORD;
  if (!isDigit(p) && isDigit(c)) return WORD / 2;
  return 0;
}

/** True when every character of q appears in s in order (both lower-cased). */
function subsequence(q, s) {
  let at = 0;
  for (let i = 0; i < q.length; i++) {
    at = s.indexOf(q[i], at);
    if (at < 0) return false;
    at++;
  }
  return true;
}

/**
 * The score of q against s, given both lower-cased (ql, sl) and s as
 * written (for camel humps). -Infinity when q is not a subsequence.
 */
function scoreLower(ql, sl, s) {
  const m = ql.length;
  const n = sl.length;
  // A few characters change length when lower-cased; their humps are lost.
  if (s.length !== n) s = sl;
  if (!m) return 0;
  if (m > n || !subsequence(ql, sl)) return -Infinity;
  if (m > MAX_Q || n > MAX_S) return MATCH * m - LENGTH * n;
  if (n > prev.length) {
    const size = Math.max(n, prev.length * 2);
    prev = new Float64Array(size);
    cur = new Float64Array(size);
    bonus = new Float64Array(size);
  }
  for (let j = 0; j < n; j++) bonus[j] = bonusAt(s, j);
  // Row 0: the first query character at j.
  const q0 = ql.charCodeAt(0);
  for (let j = 0; j < n; j++) {
    prev[j] = sl.charCodeAt(j) === q0 ? MATCH + bonus[j] - Math.min(LEAD_MAX, LEAD * j) : -Infinity;
  }
  // Row i: character i at j, after character i - 1 at some k < j. A gap
  // of g >= 1 costs GAP_OPEN + GAP_EXT * (g - 1), which is linear in k,
  // so the best earlier k is kept as a running maximum of prev[k] + GAP_EXT * k.
  for (let i = 1; i < m; i++) {
    const qc = ql.charCodeAt(i);
    let best = -Infinity;
    for (let j = 0; j < n; j++) {
      // k = j - 2 joins the running maximum before j is scored.
      if (j >= 2) {
        const v = prev[j - 2] + GAP_EXT * (j - 2);
        if (v > best) best = v;
      }
      if (sl.charCodeAt(j) !== qc || j < i) {
        cur[j] = -Infinity;
        continue;
      }
      const run = j >= 1 ? prev[j - 1] + CONSEC : -Infinity;
      const gap = best === -Infinity ? -Infinity : best - GAP_EXT * j - GAP_OPEN + 2 * GAP_EXT;
      const from = run > gap ? run : gap;
      cur[j] = from === -Infinity ? -Infinity : from + MATCH + bonus[j];
    }
    const t = prev;
    prev = cur;
    cur = t;
  }
  let top = -Infinity;
  for (let j = m - 1; j < n; j++) if (prev[j] > top) top = prev[j];
  return top === -Infinity ? -Infinity : top - LENGTH * n;
}

/** How well q matches s: higher is better, -Infinity for no match. */
export function score(q, s) {
  return scoreLower(String(q).toLowerCase(), String(s).toLowerCase(), String(s));
}

/**
 * The best matches of q in list, best first: [{ item, score }]. key(item)
 * gives the text to match as written; lower(item), when given, the same
 * text already lower-cased, so a long list is not lower-cased on every
 * keystroke. Equal scores keep the list's order. limit (default 50) caps
 * the answer; an empty query matches nothing.
 */
export function rank(q, list, { limit = 50, key = (x) => String(x), lower } = {}) {
  const ql = String(q).toLowerCase();
  const out = [];
  if (!ql || limit <= 0) return out;
  let floor = -Infinity;
  for (let k = 0; k < list.length; k++) {
    const item = list[k];
    const s = key(item);
    const sl = lower ? lower(item) : s.toLowerCase();
    if (sl.length < ql.length) continue;
    const v = scoreLower(ql, sl, s);
    if (v === -Infinity || (out.length >= limit && v <= floor)) continue;
    // Insert after every entry at least as good: equal scores keep list order.
    let at = out.length;
    while (at > 0 && out[at - 1].score < v) at--;
    out.splice(at, 0, { item, score: v });
    if (out.length > limit) out.pop();
    if (out.length >= limit) floor = out[out.length - 1].score;
  }
  return out;
}
