/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Reclaim Rules (Terrane Edition - v1.0)
 *     - File Name: reclaim.js
 *     - Relative Path: web/js/reclaim.js
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
 *       Initial release: the Cleanup tab's rules, shared by the page, the
 *       service's cleanup question, the demo and the Node check. After the
 *       review: a folder holding pyvenv.cfg is a Python environment, listed
 *       whole; site-packages and dist-packages are never walked, and no
 *       copy inside them, or inside a cache the folder lies in, is kept or
 *       suggested; dupPage cuts a large set's rows; on a tie keepOf keeps
 *       the path that sorts first, so a refresh never changes the keep.
 *
 * ✒ Description:
 *     What in one folder could go, and by which rule: verified duplicate
 *     copies, big files left unchanged for a year, caches and build output
 *     from a fixed list of names, and empty folders. One walk under the
 *     folder finds the last three, so the page's whole tree and the
 *     service's column tree answer alike; the groups never overlap.
 *
 * ✒ Key Features:
 *     - BIG_STALE: the Big and stale quick search's query (presets.js reads
 *       it from here), so the two thresholds are written once
 *     - CACHE_RULES: 18 names a tool makes and makes again, each with the
 *       words a row shows; dist, build, target and coverage count only
 *       beside the project file that makes them; names compare in any case
 *     - ENV_RULE: a folder holding pyvenv.cfg, whatever its name, is a
 *       Python environment (python -m venv, virtualenv), listed whole
 *     - walk(root, acc): one stack walk under a folder through an accessor,
 *       never into a matched cache, so nothing inside one is listed twice,
 *       and never into .git, .hg or .svn, whose records are not clutter,
 *       nor site-packages or dist-packages, where moving one file breaks an
 *       installed package; links and sealed folders never match;
 *       hidden-only folders counted
 *     - keepOf: the copy a duplicate set keeps, newest or oldest, and on a
 *       tie the path that sorts first (duplicate cleanup's own rule)
 *     - dupSuggestions: verified sets only; a copy inside a cache is left to
 *       the cache and the keep is chosen among the rest, so no move of any
 *       group ever takes the last copy; a copy inside .git, an installed
 *       package or a Python environment is never kept or suggested
 *     - dupPage: the rows a list draws, n copies in all, a large set cut
 *     - combine: four groups ranked by the space they free, ties in a fixed
 *       order with Empty folders last; a kept or suggested copy is never
 *       listed as big and stale as well
 *     - totals: what is checked, per group and in all; MOVE_MAX caps a press
 *
 * ✒ Usage Instructions:
 *     const w = walk(folder, modelAccess);
 *     const d = dupSuggestions(groups, 'Projects', w.claimed, 'newest');
 *     const groups = combine(w, d);
 *     const t = totals(groups, leftOut);   // { count, bytes, by: Map }
 *
 * ✒ Examples:
 *     cacheRule('node_modules', new Set())           npm packages, ...
 *     cacheRule('build', new Set(['package.json']))   build output, ...
 *     cacheRule('build', new Set(['plans.pdf']))      null
 *     folderRule('.venv', new Set(), ['pyvenv.cfg'])  ENV_RULE
 *     keepOf({ files: [a, b] }, 'oldest')             the earlier change
 *
 * ✒ Other Important Information:
 *     - Dependencies: model.js (parseQuery, relPath, the flags)
 *     - Compatible platforms: any browser with ES2022 modules; Node.js
 *       22.5+
 *     - Performance: one visit per entry; 100,000 entries walk in well
 *       under 50 ms in Node
 *     - Limitations: a cache is known by its name and, for four names, a
 *       project file beside it; a person's own folder of such a name is
 *       listed with the rule that found it, checked, and can be left out
 * ----------------------------------------------------------------------------
 */

import { parseQuery, relPath, FLAG_HIDDEN, FLAG_LINK } from './model.js';

/** The Big and stale quick search, and how a sentence names it. Cleanup adds is:file. */
export const BIG_STALE = Object.freeze({ query: '>100mb older:1y', words: 'over 100 MB, not changed in a year' });

const rule = (id, beside, words) => Object.freeze({ id, names: Object.freeze([id.toLowerCase()]), beside: beside ? Object.freeze(beside) : null, words });
const BUILT = 'build output, made again by the build';

/** Folders a tool makes and makes again, by name; beside: a project file the parent must hold. */
export const CACHE_RULES = Object.freeze([
  rule('node_modules', null, 'npm packages, brought back by npm install'),
  rule('bower_components', null, 'Bower packages, brought back by bower install'),
  rule('__pycache__', null, 'Python bytecode, written again on the next run'),
  rule('.pytest_cache', null, "pytest's cache, written again on the next run"),
  rule('.mypy_cache', null, "mypy's cache, written again on the next check"),
  rule('.ruff_cache', null, "Ruff's cache, written again on the next check"),
  rule('.tox', null, 'tox environments, made again by tox'),
  rule('.cache', null, "a tool's cache"),
  rule('.parcel-cache', null, "Parcel's cache, made again by the next build"),
  rule('.next', null, 'Next.js output, made again by the build'),
  rule('.nuxt', null, 'Nuxt output, made again by the build'),
  rule('.svelte-kit', null, "SvelteKit's generated files, made again by the build"),
  rule('.turbo', null, "Turborepo's cache, made again by the build"),
  rule('.gradle', null, "Gradle's cache, made again by the build"),
  rule('target', ['Cargo.toml', 'pom.xml'], BUILT),
  rule('dist', ['package.json', 'pyproject.toml', 'setup.py'], BUILT),
  rule('build', ['package.json', 'build.gradle', 'build.gradle.kts', 'CMakeLists.txt', 'setup.py', 'pyproject.toml'], BUILT),
  rule('coverage', ['package.json'], 'test coverage, made again by the tests'),
]);

const BY_NAME = new Map(CACHE_RULES.flatMap((r) => r.names.map((n) => [n, r])));

/**
 * A Python environment: any folder holding pyvenv.cfg (python -m venv and
 * virtualenv write it), whatever its name. Listed whole, like a cache, so
 * no file of it is ever offered alone: moving one breaks the environment.
 */
const ENV_MARK = 'pyvenv.cfg';
export const ENV_RULE = Object.freeze({ id: 'venv', marker: ENV_MARK, words: 'a Python environment, made again by pip install' });

/** Installed packages outside an environment (a Python install, conda): never walked, no copy in them kept or suggested. */
export const PACKAGES = Object.freeze(['site-packages', 'dist-packages']);
const PKG_SET = new Set(PACKAGES);
/** The names a Python environment usually has: the conservative test for a copy outside the folder walked. */
const ENV_NAMES = new Set(['.venv', 'venv']);

/** A repository's own records: never walked into, so nothing in them is ever suggested. */
export const VCS = Object.freeze(['.git', '.hg', '.svn']);
const VCS_SET = new Set(VCS);

/**
 * The rule a folder of this name matches, or null. siblings: the lower-cased
 * names of the files its parent holds directly (a Set), read only for the
 * four names that need a project file beside them.
 */
export function cacheRule(name, siblings) {
  const r = BY_NAME.get(String(name).toLowerCase());
  if (!r) return null;
  if (!r.beside) return r;
  return r.beside.some((b) => siblings?.has(b.toLowerCase())) ? r : null;
}

/** The project file beside a match, as the row names it ("build beside package.json"), or the bare name. */
function ruleLabel(r, siblings) {
  if (!r.beside) return r.id;
  const b = r.beside.find((x) => siblings.has(x.toLowerCase()));
  return `${r.id} beside ${b}`;
}

/**
 * The rule a folder matches by its name and its parent's files (cacheRule)
 * or by its own (kidNames, its files' names: a Python environment), or
 * null. The page asks it of the folder it shows and of its ancestors.
 */
export function folderRule(name, siblings, kidNames) {
  const r = cacheRule(name, siblings);
  if (r) return r;
  for (const k of kidNames || []) if (String(k).toLowerCase() === ENV_MARK) return ENV_RULE;
  return null;
}

/** Whether a folder above a path's last segment has a name from set. */
function named(rel, set) {
  const parts = String(rel).split('/');
  for (let i = 0; i < parts.length - 1; i++) if (set.has(parts[i].toLowerCase())) return true;
  return false;
}

/**
 * Whether a path has a folder named by any rule, or named as a Python
 * environment usually is, above its last segment: the conservative test
 * for a copy outside the folder walked.
 */
export const cacheNamed = (rel) => named(rel, BY_NAME) || named(rel, ENV_NAMES);

/** Whether a path lies inside a repository's .git, .hg or .svn folder. */
export const inVcs = (rel) => named(rel, VCS_SET);

/** Whether a path lies inside an installed site-packages or dist-packages folder. */
export const inPackages = (rel) => named(rel, PKG_SET);

/**
 * The accessor over model.js nodes: a folder whose region is not held
 * (region mode) gives null for its children, so it is left unknown.
 */
export const modelAccess = Object.freeze({
  kids: (n) => (n.u ? null : n.c),
  name: (n) => n.n,
  isDir: (n) => !!n.d,
  size: (n) => n.s,
  mtime: (n) => (n.d ? n.mm : n.m),
  flags: (n) => n.f || 0,
  sealed: (n) => !!n.e,
  stub: (n) => !!n.stub,
  rel: (n) => relPath(n),
});

const bySize = (a, b) => b.s - a.s || (a.rel < b.rel ? -1 : a.rel > b.rel ? 1 : 0);

/** A list's items, largest first then by path, cut to cap, with its whole count and bytes. */
function listOf(items, cap) {
  let bytes = 0;
  for (const it of items) bytes += it.s;
  items.sort(bySize);
  return { total: items.length, bytes, items: cap < items.length ? items.slice(0, cap) : items };
}

/**
 * One walk under root through acc ({ kids, name, isDir, size, mtime, flags,
 * sealed, stub, rel }). Returns { caches, stale, empty } (each { total,
 * bytes, items }), hiddenOnly (folders holding only hidden files),
 * sealedCaches (cache names that could not be read), vcs (.git, .hg and
 * .svn folders, never walked into), pkgs (site-packages and dist-packages
 * folders, never walked into) and claimed (every cache's path, which
 * nothing else lists). A folder holding pyvenv.cfg is a cache (ENV_RULE),
 * found when it is visited: what its own files gave is taken back. The
 * folder walked is never one. keepCap cuts each list.
 */
export function walk(root, acc, { keepCap = Infinity } = {}) {
  const isStale = parseQuery(`${BIG_STALE.query} is:file`);
  // The node shape Find tests: a file's size and last change.
  const fw = { n: '', d: false, s: 0, m: 0, mm: 0, f: 0, k: 8, e: 0, c: { length: 0 } };
  const caches = [];
  const stale = [];
  const empty = [];
  const claimed = [];
  let hiddenOnly = 0;
  let sealedCaches = 0;
  let vcs = 0;
  let pkgs = 0;
  const item = (x, d, why) => ({ x, rel: acc.rel(x), name: acc.name(x), d, s: acc.size(x), m: acc.mtime(x), why });
  const stack = [root];
  const subs = [];
  while (stack.length) {
    const dir = stack.pop();
    const kids = acc.kids(dir);
    if (!kids) continue;
    let files = 0;
    let hidden = 0;
    let env = false;
    const staleAt = stale.length;
    subs.length = 0;
    for (const ch of kids) {
      if (acc.isDir(ch)) {
        subs.push(ch);
        continue;
      }
      files++;
      const f = acc.flags(ch);
      const nm = acc.name(ch);
      if (f & FLAG_HIDDEN || nm.charCodeAt(0) === 46) hidden++;
      if (nm.length === ENV_MARK.length && nm.toLowerCase() === ENV_MARK) env = true;
      fw.s = acc.size(ch);
      fw.m = acc.mtime(ch);
      fw.f = f;
      if (isStale(fw)) stale.push(item(ch, false, 'stale'));
    }
    if (env && dir !== root) {
      // A Python environment: listed whole, nothing in it on its own.
      stale.length = staleAt;
      const it = item(dir, true, `${acc.name(dir)} holds ${ENV_MARK}`);
      it.rule = ENV_RULE.id;
      it.words = ENV_RULE.words;
      caches.push(it);
      claimed.push(it.rel);
      continue;
    }
    if (dir !== root) {
      if (!files && !subs.length) {
        if (!acc.sealed(dir) && !acc.stub(dir)) empty.push(item(dir, true, 'empty'));
      } else if (!subs.length && hidden === files) hiddenOnly++;
    }
    let names = null;
    for (const sub of subs) {
      const low = acc.name(sub).toLowerCase();
      if (VCS_SET.has(low)) {
        vcs++;
        continue;
      }
      if (PKG_SET.has(low)) {
        pkgs++;
        continue;
      }
      const r = BY_NAME.get(low);
      if (r && !(acc.flags(sub) & FLAG_LINK)) {
        if (r.beside && !names) {
          names = new Set();
          for (const ch of kids) if (!acc.isDir(ch)) names.add(acc.name(ch).toLowerCase());
        }
        if (!r.beside || r.beside.some((b) => names.has(b.toLowerCase()))) {
          if (acc.sealed(sub)) {
            sealedCaches++;
            continue;
          }
          const it = item(sub, true, ruleLabel(r, names));
          it.rule = r.id;
          it.words = r.words;
          caches.push(it);
          claimed.push(it.rel);
          continue;
        }
      }
      stack.push(sub);
    }
  }
  return { caches: listOf(caches, keepCap), stale: listOf(stale, keepCap), empty: listOf(empty, keepCap), hiddenOnly, sealedCaches, vcs, pkgs, claimed };
}

/**
 * The file a keep leaves in place: the latest or earliest last change; on a
 * tie, the path that sorts first, so the choice holds through a refresh
 * that lists the copies in another order. pathOf gives a file's path
 * (f.rel by default; duplicate cleanup passes api.relPath for nodes).
 */
export function keepOf(group, how, pathOf = (f) => f.rel ?? '') {
  let best = group.files[0];
  let bestPath = null;
  for (const f of group.files) {
    if (f === best) continue;
    const d = how === 'newest' ? f.m - best.m : best.m - f.m;
    if (d < 0) continue;
    if (d === 0) {
      bestPath ??= pathOf(best);
      const p = pathOf(f);
      if (!(p < bestPath)) continue;
      best = f;
      bestPath = p;
      continue;
    }
    best = f;
    bestPath = null;
  }
  return best;
}

const under = (rel, top) => top === '' || rel === top || rel.startsWith(`${top}/`);

/**
 * The duplicate sets a folder's cleanup suggests. groups: { files: [{ rel,
 * n, s, m }], verified, mode }; scopeRel: the folder ('' for the root);
 * claimed: the caches the walk found, complete unless claimedCut;
 * scopeCached: the folder is a cache or lies in one. A copy under a cache
 * is dropped (every copy in the folder when scopeCached; a copy outside
 * the folder whose path names a cache or an environment is too, as a
 * precaution; and any copy inside .git, .hg, .svn, site-packages or
 * dist-packages), the keep is chosen among the rest, the whole set's, and
 * a set is listed when a copy other than the keep lies in the folder.
 * Returns { sets: [{ keep, copies, sampled, waste, group }], pending },
 * pending the unverified groups with a member in the folder.
 */
export function dupSuggestions(groups, scopeRel, claimed, how, { claimedCut = false, scopeCached = false } = {}) {
  const tops = new Set(claimed);
  // Whether a folder above rel (or rel itself) is a cache: each of its prefixes looked up.
  const inCache = (rel) => {
    for (let i = rel.indexOf('/'); i >= 0; i = rel.indexOf('/', i + 1)) if (tops.has(rel.slice(0, i))) return true;
    return tops.has(rel);
  };
  const dropped = (f) => {
    if (inVcs(f.rel) || inPackages(f.rel)) return true;
    const inside = under(f.rel, scopeRel);
    if (inside && (scopeCached || inCache(f.rel))) return true;
    return (!inside || claimedCut) && cacheNamed(f.rel);
  };
  const sets = [];
  let pending = 0;
  for (const g of groups) {
    const left = g.files.filter((f) => !dropped(f));
    if (!g.verified) {
      if (left.some((f) => under(f.rel, scopeRel))) pending++;
      continue;
    }
    if (left.length < 2) continue;
    const keep = keepOf({ files: left }, how);
    const copies = left.filter((f) => f !== keep && f.rel !== keep.rel && under(f.rel, scopeRel));
    if (!copies.length) continue;
    copies.sort(bySizeRel);
    sets.push({ keep, copies, sampled: g.mode === 'sampled', waste: copies.reduce((a, f) => a + f.s, 0), group: g });
  }
  sets.sort((a, b) => b.waste - a.waste || (a.keep.rel < b.keep.rel ? -1 : a.keep.rel > b.keep.rel ? 1 : 0));
  return { sets, pending };
}
const bySizeRel = (a, b) => b.s - a.s || (a.rel < b.rel ? -1 : a.rel > b.rel ? 1 : 0);

/**
 * The duplicate rows a list draws: each set's copies, n in all, the last
 * set reached cut part way, so a set of thousands of copies draws n rows.
 * Returns { page: [{ set, copies }], more }, more the copies not drawn.
 */
export function dupPage(sets, n) {
  const page = [];
  let used = 0;
  let all = 0;
  for (const s of sets) {
    all += s.copies.length;
    if (used >= n) continue;
    const copies = s.copies.length > n - used ? s.copies.slice(0, n - used) : s.copies;
    page.push({ set: s, copies });
    used += copies.length;
  }
  return { page, more: all - used };
}

/** The four groups, their ids in the order ties fall. */
export const GROUPS = Object.freeze([
  Object.freeze({ id: 'dups', label: 'Duplicates', noun: ['copy', 'copies'] }),
  Object.freeze({ id: 'stale', label: 'Big and stale', noun: ['file', 'files'] }),
  Object.freeze({ id: 'caches', label: 'Caches and build output', noun: ['folder', 'folders'] }),
  Object.freeze({ id: 'empty', label: 'Empty folders', noun: ['empty folder', 'empty folders'] }),
]);
const RANK = new Map(GROUPS.map((g, i) => [g.id, i]));

/**
 * The four groups from a walk and the duplicate sets: { id, label, noun,
 * items, count, bytes, listed } (dups add sets), largest first by bytes,
 * ties in GROUPS order. A file a duplicate set keeps or suggests is not
 * listed as big and stale as well. count and bytes are the whole group's;
 * items the listed ones (a service's list may be cut).
 */
export function combine(w, d) {
  const inSets = new Set();
  for (const s of d.sets) {
    inSets.add(s.keep.rel);
    for (const c of s.copies) inSets.add(c.rel);
  }
  const staleItems = w.stale.items.filter((it) => !inSets.has(it.rel));
  const staleGone = w.stale.items.filter((it) => inSets.has(it.rel));
  const dupItems = [];
  d.sets.forEach((s, i) => {
    for (const c of s.copies) dupItems.push({ ...c, name: c.name ?? c.n, d: false, why: 'copy', set: i });
  });
  const made = {
    dups: { items: dupItems, count: dupItems.length, bytes: d.sets.reduce((a, s) => a + s.waste, 0), sets: d.sets },
    stale: { items: staleItems, count: w.stale.total - staleGone.length, bytes: w.stale.bytes - staleGone.reduce((a, it) => a + it.s, 0) },
    caches: { items: w.caches.items, count: w.caches.total, bytes: w.caches.bytes },
    empty: { items: w.empty.items, count: w.empty.total, bytes: 0 },
  };
  return GROUPS.map((g) => ({ ...g, ...made[g.id], listed: made[g.id].items.length }))
    .sort((a, b) => b.bytes - a.bytes || RANK.get(a.id) - RANK.get(b.id));
}

/**
 * What is checked: per group (by, a Map of id to { count, bytes }) and in
 * all. leftOut: a Set of paths. The groups never share an item, so the
 * whole is the plain sum of the groups.
 */
export function totals(groups, leftOut) {
  const by = new Map();
  let count = 0;
  let bytes = 0;
  for (const g of groups) {
    let n = 0;
    let b = 0;
    for (const it of g.items) {
      if (leftOut.has(it.rel)) continue;
      n++;
      b += it.s;
    }
    by.set(g.id, { count: n, bytes: b });
    count += n;
    bytes += b;
  }
  return { by, count, bytes };
}

/** The most paths one press moves: the service's holding area filters nested paths item against item. */
export const MOVE_MAX = 5000;

/** The paths a press moves: the checked items in order, at most MOVE_MAX, and whether that cut it. */
export function movePaths(items, leftOut) {
  const out = [];
  let more = 0;
  for (const it of items) {
    if (leftOut.has(it.rel)) continue;
    if (out.length < MOVE_MAX) out.push(it.rel);
    else more++;
  }
  return { paths: out, cut: more > 0, all: out.length + more };
}
