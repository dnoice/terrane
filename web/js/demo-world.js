/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Demo World (Terrane Edition - v1.0)
 *     - File Name: demo-world.js
 *     - Relative Path: web/js/demo-world.js
 *     - Artifact Type: javascript
 *     - Version: 1.0.0
 *     - Date: 11/13/2026
 *     - Update: Friday, November 13, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Description:
 *     Builds the demonstration directory: a made-up creative studio's
 *     drive of about fifteen thousand files, from one seed, in a few
 *     milliseconds and with no download. The page runs on it when no
 *     Terrane service served it, and tools/demo.mjs writes the same tree
 *     to disk for the real service.
 *
 * ✒ Key Features:
 *     - Deterministic: one seed and one moment give the same tree, names,
 *       sizes, dates and contents every time; times are relative to that
 *       moment, so the world always looks current
 *     - A whole drive: code projects with node_modules, .git and a Python
 *       virtual environment, a photo library by year, film footage and
 *       renders, a music library and production sessions, design work,
 *       documents, a stale archive of an old laptop, and downloads
 *     - Working sessions to find: edits under way in the last hour, a
 *       photo export last night, a coding session three days ago, an
 *       install's bulk write, older sessions back through the years
 *     - Survey material: true duplicates and same-size decoys, empty
 *       folders, a sealed folder, hidden files, symbolic links (one
 *       dangling) and a special file
 *     - Archives with interiors: zip files list their entries, other
 *       formats are refused as the service refuses them
 *     - Contents on demand: textOf() writes a file's text to its exact
 *       size, by kind (READMEs, posts, notes, TypeScript, Python, CSS,
 *       JSON, CSV, logs, notebooks, SVG); binary kinds read as binary
 *     - Pictures on demand: every image carries a style, a pixel size and
 *       an average colour, which the page paints from and draws a
 *       thumbnail with
 *     - No DOM: Node imports the same module for tests and for writing
 *       the tree to disk
 *
 * ✒ Usage Instructions:
 *     import { buildWorld, textOf, insideOf } from './demo-world.js';
 *     const world = buildWorld({ now: Date.now() });
 *     world.root.kids.get('Projects');   // a folder: { dir: true, kids }
 *     textOf(file, 16384, rel);          // the first 16 KB of a text file
 *     insideOf(zipFile);                 // the entries of an archive
 *
 * ✒ Examples:
 *     const w = buildWorld({ now: 1794500000000 });
 *     w.stats                -> { files, folders, bytes }
 *     walk(w.root, (node, rel) => console.log(rel));
 *     find(w.root, 'Projects/tidepool-web/README.md')
 *     textOf(find(w.root, 'Projects/lumen-cli/lumen/cli.py'), 4096)
 *     insideOf(find(w.root, 'Archive/Backups/old-site-2019.zip'))
 *
 * ✒ Other Important Information:
 *     - Dependencies: none
 *     - Compatible platforms: current evergreen browsers; Node.js 20+
 *     - Content: every name, project, artist, place and figure here is
 *       invented for the demonstration; package names in node_modules
 *       and site-packages are real open-source package names, as any
 *       real project folder would hold
 *     - Performance: building takes about 20 ms and holds the tree only;
 *       text and pictures are made when something asks for them
 * ----------------------------------------------------------------------------
 */

export const DEMO_SEED = 20261113;
export const DEMO_NAME = 'Studio';
export const FLAG_LINK = 1;
export const FLAG_HIDDEN = 2;
export const FLAG_SPECIAL = 4;

const MIN = 60e3;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const YEAR = 365.25 * DAY;
const KB = 1024;
const MB = 1024 * KB;
const GB = 1024 * MB;

/* ---------- randomness ---------- */

/** A small, fast seeded generator (mulberry32): the same seed, the same sequence. */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A 32-bit hash of a string (FNV-1a), for seeds derived from names. */
export function hash32(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

const pad = (n, w = 2) => String(n).padStart(w, '0');
export const extOf = (name) => {
  const i = name.lastIndexOf('.');
  return i > 0 && i < name.length - 1 ? name.slice(i + 1).toLowerCase() : '';
};

/* ---------- the tree ---------- */

function mkDir(name) {
  return { name, dir: true, kids: new Map(), mtime: 0, birth: 0, err: null };
}

/** Walks the tree depth first, calling fn(node, rel, parent). */
export function walk(root, fn) {
  const stack = [[root, '', null]];
  while (stack.length) {
    const [node, rel, parent] = stack.pop();
    fn(node, rel, parent);
    if (node.dir) for (const k of node.kids.values()) stack.push([k, rel ? `${rel}/${k.name}` : k.name, node]);
  }
}

/** The node at a root-relative path ('' is the root), or null. */
export function find(root, rel) {
  let node = root;
  if (!rel) return node;
  for (const part of rel.split('/')) {
    if (!node?.dir) return null;
    node = node.kids.get(part);
  }
  return node || null;
}

/* ---------- word banks ---------- */

const EVENTS = [
  ['Coast trip', 'sea'], ['Desert road trip', 'desert'], ['Mountain cabin', 'mountain'], ['City lights', 'city'],
  ['Winter market', 'snow'], ['Harbor sunrise', 'sea'], ['Botanical garden', 'forest'], ['Night sky', 'night'],
  ['Rainy streets', 'city'], ['Lake weekend', 'mountain'], ['Autumn hike', 'autumn'], ['Studio portraits', 'portrait'],
  ['Food market', 'food'], ['Train journey', 'desert'], ['Island ferry', 'sea'], ['Snow day', 'snow'],
  ['Spring blossoms', 'forest'], ['Canyon overlook', 'desert'], ['Old town walk', 'autumn'], ['Birthday dinner', 'food'],
  ['Lighthouse', 'sea'], ['Fog over the bay', 'sea'], ['Meteor shower', 'night'], ['Pine forest', 'forest'],
];
const ARTISTS = [
  'Velvet Cartographers', 'Low Tide Orchestra', 'Saffron Static', 'Kite and Anchor Club', 'Copper Moth Quartet',
  'Neon Fjord', 'Paper Lantern Society', 'Glass Harbor Radio', 'Marigold Machines', 'The Slow Satellites',
  'Juniper Signal', 'Halcyon Drift', 'Orchard Frequency', 'The Weather Inside', 'Sable and Sound',
];
const ADJ = ['Silver', 'Distant', 'Quiet', 'Golden', 'Hollow', 'Electric', 'Paper', 'Velvet', 'Midnight', 'Northern',
  'Slow', 'Bright', 'Salt', 'Amber', 'Glass', 'Lucky', 'Faded', 'Open', 'Late', 'Small'];
const NOUN = ['Rivers', 'Signals', 'Gardens', 'Satellites', 'Harbors', 'Lanterns', 'Weather', 'Machines', 'Tides',
  'Mountains', 'Letters', 'Static', 'Engines', 'Islands', 'Orchards', 'Comets', 'Windows', 'Bridges', 'Echoes', 'Maps'];
const NPM = [
  'express', 'lodash', 'chalk', 'debug', 'ms', 'commander', 'semver', 'uuid', 'dotenv', 'zod', 'pino', 'ajv', 'yaml',
  'glob', 'minimatch', 'rimraf', 'typescript', 'esbuild', 'vitest', 'eslint', 'prettier', 'tslib', 'date-fns', 'axios',
  'follow-redirects', 'form-data', 'mime-types', 'mime-db', 'cookie', 'body-parser', 'qs', 'raw-body', 'iconv-lite',
  'safer-buffer', 'http-errors', 'statuses', 'depd', 'on-finished', 'ee-first', 'finalhandler', 'send', 'serve-static',
  'encodeurl', 'escape-html', 'etag', 'fresh', 'range-parser', 'vary', 'accepts', 'negotiator', 'content-type',
  'content-disposition', 'type-is', 'media-typer', 'merge-descriptors', 'methods', 'path-to-regexp', 'proxy-addr',
  'forwarded', 'ipaddr.js', 'setprototypeof', 'toidentifier', 'inherits', 'supertest', 'superagent', 'pretty-format',
  'ansi-styles', 'ansi-regex', 'strip-ansi', 'string-width', 'wrap-ansi', 'cliui', 'yargs', 'yargs-parser', 'y18n',
  'escalade', 'emoji-regex', 'color-convert', 'color-name', 'has-flag', 'supports-color', 'signal-exit', 'cross-spawn',
  'which', 'isexe', 'path-key', 'fast-glob', 'micromatch', 'braces', 'fill-range', 'to-regex-range', 'is-number',
  'picomatch', 'merge2', 'fastq', 'reusify', 'queue-microtask', 'run-parallel', 'glob-parent', 'is-glob', 'is-extglob',
  'acorn', 'browserslist', 'caniuse-lite', 'postcss', 'nanoid', 'picocolors', 'source-map', 'source-map-js', 'rollup',
];
const NPM_WEB = ['react', 'react-dom', 'scheduler', 'loose-envify', 'js-tokens', 'prop-types', 'csstype', 'vite',
  'd3-scale', 'd3-array', 'd3-shape', 'd3-path', 'd3-time', 'd3-format', 'd3-interpolate', 'd3-color', 'leaflet',
  'clsx', 'zustand', 'immer', 'use-sync-external-store', '@types/react', '@types/react-dom', '@types/node',
  '@babel/core', '@babel/parser', '@babel/types', '@babel/traverse', '@babel/generator', '@vitejs/plugin-react',
  'react-refresh', 'electron-to-chromium', 'node-releases', 'update-browserslist-db', 'gensync', 'json5', 'jsesc'];
const PIP = ['requests', 'urllib3', 'idna', 'certifi', 'charset_normalizer', 'click', 'rich', 'pygments', 'markdown_it',
  'mdurl', 'typer', 'pydantic', 'pydantic_core', 'typing_extensions', 'annotated_types', 'httpx', 'httpcore', 'anyio',
  'sniffio', 'h11', 'pytest', 'pluggy', 'iniconfig', 'packaging', 'tomli', 'colorama', 'pip', 'setuptools', 'wheel',
  'pillow', 'piexif', 'dateutil', 'six', 'tzdata', 'shellingham', 'watchdog'];
const COMPONENTS = ['App', 'Header', 'Sidebar', 'TideChart', 'StationMap', 'StationCard', 'Forecast', 'AlertBanner',
  'SearchBox', 'Settings', 'Footer', 'Legend', 'Timeline', 'UnitToggle', 'ThemeSwitch', 'Spinner', 'ErrorBoundary',
  'Modal', 'Tooltip', 'Sparkline', 'WaveHeight', 'MoonPhase', 'WindRose', 'Favorites', 'ShareButton', 'TideTable',
  'StationList', 'DatePicker', 'Banner', 'EmptyState'];
const ROUTES = ['stations', 'tides', 'forecasts', 'alerts', 'users', 'auth', 'health', 'webhooks', 'exports', 'admin',
  'buoys', 'currents'];
const PY_MODULES = ['cli', 'catalog', 'exif', 'index', 'scan', 'thumbs', 'search', 'dedupe', 'export', 'config',
  'tags', 'albums', 'storage', 'report', 'utils', 'log', 'watch', 'hashing', 'paths', 'version'];
const POSTS = ['reading-the-tide-tables', 'a-week-at-the-lighthouse', 'notes-on-fog', 'building-a-buoy-logger',
  'the-quiet-harbor', 'mapping-the-shoreline', 'winter-swims', 'salt-and-solder', 'charts-i-love', 'field-recording-gulls',
  'kelp-forests', 'night-fishing-boats', 'tidepool-launch', 'what-the-buoys-said', 'printing-sea-charts',
  'on-small-tools', 'a-year-of-field-notes', 'rain-on-the-pier', 'the-orbit-prototype', 'learning-to-sail',
  'ferry-timetables', 'a-map-of-sounds', 'repairing-an-old-barometer', 'sunrise-at-low-tide', 'coastal-paths'];
const SENTENCES = [
  'The tide turned an hour earlier than the table said, which is the whole reason for this project.',
  'Every station reports water level every six minutes, and most of the work is deciding what to ignore.',
  'We kept the first version small: one map, one chart, and a list of the stations nearest to you.',
  'Fog came in over the breakwater by noon and stayed until the ferries stopped running.',
  'The buoy logger runs on a solar cell the size of a postcard and a very patient microcontroller.',
  'Most of the interesting bugs were about time zones, as they always are near a coastline.',
  'A good chart tells you where the water is shallow before it tells you anything else.',
  'The archive goes back eleven years, though the early readings need a correction for drift.',
  'I wrote this down so that next winter I remember which cable goes where.',
  'Low water at the harbor mouth uncovers a shelf of rock that is easy to miss in the dark.',
  'The second prototype used half the power and twice the solder of the first.',
  'Photos from the morning walk are in the library under the date, the raw files beside them.',
  'There is a quiet hour after the last boat leaves when the whole bay sounds like breathing.',
  'Each release is tagged, built, and copied to the shared drive before anything else happens.',
  'We measured the swell with a ruler, a stopwatch and a great deal of optimism.',
  'The forecast service caches each response for ten minutes and refreshes it in the background.',
  'If a reading arrives late, it is kept but marked, never silently dropped.',
  'Gulls are louder than you would think, and they own the microphone by noon.',
  'The map tiles are drawn once a night and served from disk the rest of the day.',
  'This note is mostly a list of things that went right, which is unusual for a field log.',
];

/* ---------- building ---------- */

/**
 * Builds the demonstration tree. now anchors every date; seed picks every
 * choice. Returns { root, now, seed, name, stats, held }.
 */
export function buildWorld({ now = Date.now(), seed = DEMO_SEED } = {}) {
  const R = rng(seed);
  const int = (a, b) => a + Math.floor(R() * (b - a + 1));
  const pick = (arr) => arr[Math.floor(R() * arr.length)];
  const chance = (p) => R() < p;
  /** A size between lo and hi, log-uniform: many small, a few large. */
  const sz = (lo, hi) => Math.round(Math.exp(Math.log(lo) + R() * (Math.log(hi) - Math.log(lo))));
  const ago = (ms) => Math.round(now - ms);
  const within = (fromAgo, toAgo) => ago(fromAgo + R() * (toAgo - fromAgo));
  const seedOf = () => Math.floor(R() * 4294967296) >>> 0;

  const root = mkDir(DEMO_NAME);
  root.birth = ago(6.5 * YEAR);

  /** The folder at a path under base, created as needed. */
  const D = (base, rel, birth) => {
    let at = base;
    for (const part of rel.split('/')) {
      let next = at.kids.get(part);
      if (!next) {
        next = mkDir(part);
        next.birth = birth || 0;
        at.kids.set(part, next);
      }
      at = next;
    }
    return at;
  };
  /** A file; a name already taken in the folder is left as it was. */
  const F = (dir, name, size, mtime, extra = {}) => {
    if (dir.kids.has(name)) return dir.kids.get(name);
    const birth = extra.birth ?? Math.min(mtime, Math.round(mtime - R() * R() * 40 * DAY));
    const node = {
      name, dir: false, size: Math.max(0, Math.round(size)), mtime, birth,
      flags: name.startsWith('.') ? FLAG_HIDDEN : 0, s: extra.s ?? seedOf(),
    };
    if (extra.img) node.img = extra.img;
    if (extra.arc) node.arc = extra.arc;
    if (extra.link !== undefined) {
      node.link = extra.link;
      node.flags |= FLAG_LINK;
      node.size = 0;
    }
    if (extra.special) node.flags |= FLAG_SPECIAL;
    dir.kids.set(name, node);
    return node;
  };
  const dateName = (t) => {
    const d = new Date(t);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
  };
  const dayName = (t) => {
    const d = new Date(t);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };
  const PALETTES = {
    sea: ['#4f86a6', '#7fb3c8', '#2f5d78'], desert: ['#c99a62', '#e0b57e', '#9c6b3f'], mountain: ['#6d8a7c', '#9db3a6', '#3f5a52'],
    city: ['#3a3f58', '#5a5f7d', '#d9a441'], snow: ['#cfd8de', '#eef2f4', '#9fb0bb'], forest: ['#4c7a4a', '#7ba56e', '#2f4d33'],
    night: ['#1d2340', '#2c3561', '#c9c6a3'], autumn: ['#b0633a', '#d69a4e', '#7a3f2a'], portrait: ['#a88b7a', '#d4bfb0', '#5c4a42'],
    food: ['#b5523b', '#e2a35b', '#6f8f3f'], screen: ['#e9edf1', '#3d6fb6', '#1f2933'], texture: ['#7c6a58', '#a8927b', '#4d4136'],
    ui: ['#f4f5f7', '#5b6cff', '#1d2433'], icon: ['#18201e', '#f4c430', '#f1f4f0'], model: ['#5d6d7e', '#aab7c4', '#2c3e50'],
  };
  const image = (style, w, h) => {
    const p = PALETTES[style] || PALETTES.screen;
    return { style, w, h, color: p[Math.floor(R() * 2)] };
  };
  const photo = (portrait = chance(0.25)) => (portrait ? [4000, 6000] : [6000, 4000]);

  /* ---- Projects ---- */
  const projects = D(root, 'Projects', ago(5 * YEAR));

  /** A node_modules folder: packages installed in one bulk write. */
  const nodeModules = (proj, names, at) => {
    const nm = D(proj, 'node_modules', at);
    const bin = D(nm, '.bin', at);
    for (const pkg of names) {
      const t = at + int(0, 40000);
      const dir = D(nm, pkg, t);
      F(dir, 'package.json', sz(600, 3200), t, { birth: t });
      if (chance(0.85)) F(dir, 'README.md', sz(900, 24 * KB), t, { birth: t });
      if (chance(0.9)) F(dir, 'LICENSE', 1077 + int(0, 40), t, { birth: t });
      F(dir, 'index.js', sz(200, 12 * KB), t, { birth: t });
      const libName = chance(0.5) ? 'lib' : 'dist';
      const lib = D(dir, libName, t);
      const n = int(0, chance(0.15) ? 40 : 12);
      for (let i = 0; i < n; i++) {
        const stem = `${pick(['parse', 'format', 'util', 'core', 'index', 'node', 'browser', 'types', 'stream', 'compat', 'errors', 'helpers'])}${i ? `-${i}` : ''}`;
        F(lib, `${stem}.js`, sz(300, 48 * KB), t, { birth: t });
        if (chance(0.4)) F(lib, `${stem}.d.ts`, sz(200, 9 * KB), t, { birth: t });
        if (chance(0.25)) F(lib, `${stem}.js.map`, sz(2 * KB, 160 * KB), t, { birth: t });
      }
      if (chance(0.2)) F(bin, pkg.replace(/^@.*\//, ''), 0, t, { birth: t, link: `../${pkg}/bin/${pkg.replace(/^@.*\//, '')}.js` });
    }
    return nm;
  };
  /** A .git folder: commits spread over the project's life. */
  const gitDir = (proj, from, to, objects) => {
    const g = D(proj, '.git', from);
    F(g, 'HEAD', 23, from);
    F(g, 'config', sz(250, 600), within(now - to, now - to + 2 * DAY));
    F(g, 'description', 73, from);
    F(g, 'index', sz(4 * KB, 90 * KB), to);
    F(g, 'COMMIT_EDITMSG', sz(20, 120), to);
    const hooks = D(g, 'hooks', from);
    for (const h of ['applypatch-msg', 'commit-msg', 'fsmonitor-watchman', 'post-update', 'pre-applypatch', 'pre-commit',
      'pre-merge-commit', 'pre-push', 'pre-rebase', 'pre-receive', 'prepare-commit-msg', 'push-to-checkout', 'update']) {
      F(hooks, `${h}.sample`, sz(400, 4900), from, { birth: from });
    }
    F(D(g, 'refs/heads', from), 'main', 41, to);
    D(g, 'refs/tags', from);
    F(D(g, 'logs', from), 'HEAD', sz(2 * KB, 60 * KB), to);
    const obj = D(g, 'objects', from);
    for (let i = 0; i < objects; i++) {
      const t = Math.round(from + R() * (to - from));
      const sub = D(obj, (seedOf() & 0xff).toString(16).padStart(2, '0'), t);
      F(sub, (seedOf().toString(16) + seedOf().toString(16) + seedOf().toString(16)).slice(0, 38).padEnd(38, '0'), sz(90, 28 * KB), t, { birth: t });
    }
    const packs = D(obj, 'pack', from);
    const pt = Math.round(from + (to - from) * 0.6);
    const id = (seedOf().toString(16) + seedOf().toString(16) + seedOf().toString(16) + seedOf().toString(16) + seedOf().toString(16)).slice(0, 40).padEnd(40, '0');
    F(packs, `pack-${id}.pack`, sz(4 * MB, 70 * MB), pt, { birth: pt });
    F(packs, `pack-${id}.idx`, sz(40 * KB, 900 * KB), pt, { birth: pt });
    return g;
  };

  // harbor-api: a TypeScript service, worked on three days ago.
  {
    const p = D(projects, 'harbor-api', ago(3.2 * YEAR));
    const start = ago(3.2 * YEAR);
    const session = ago(3 * DAY + 5 * HOUR);
    for (const sub of ['routes', 'services', 'models', 'lib', 'middleware']) {
      const d = D(p, `src/${sub}`, start);
      for (const r of ROUTES) {
        if (sub === 'middleware' && !['auth', 'health', 'admin'].includes(r)) continue;
        if (sub === 'lib' && !chance(0.4)) continue;
        F(d, `${r}.ts`, sz(1.2 * KB, 22 * KB), within(30 * DAY, 2.5 * YEAR));
      }
    }
    F(D(p, 'src'), 'server.ts', sz(3 * KB, 8 * KB), within(20 * DAY, 200 * DAY));
    F(D(p, 'src'), 'config.ts', sz(1 * KB, 4 * KB), within(20 * DAY, 300 * DAY));
    const tests = D(p, 'test', start);
    for (const r of ROUTES) F(tests, `${r}.test.ts`, sz(1.5 * KB, 14 * KB), within(10 * DAY, 2 * YEAR));
    // The session three days ago: eighteen files over about two hours.
    const touched = ['src/routes/tides.ts', 'src/routes/stations.ts', 'src/services/tides.ts', 'src/services/stations.ts',
      'src/models/tides.ts', 'src/lib/tides.ts', 'test/tides.test.ts', 'test/stations.test.ts', 'src/server.ts',
      'src/routes/buoys.ts', 'src/services/buoys.ts', 'src/models/buoys.ts', 'test/buoys.test.ts', 'docs/api.md',
      'docs/changelog.md', 'src/middleware/auth.ts', 'src/config.ts', 'README.md'];
    touched.forEach((rel, i) => {
      const cut = rel.lastIndexOf('/');
      const dir = cut < 0 ? p : D(p, rel.slice(0, cut), start);
      const t = session + Math.round((i / touched.length) * 2 * HOUR) + int(0, 4 * MIN);
      const prior = dir.kids.get(rel.slice(cut + 1));
      if (prior) prior.mtime = t;
      else F(dir, rel.slice(cut + 1), sz(1.2 * KB, 16 * KB), t);
    });
    const docs = D(p, 'docs', start);
    for (const n of ['architecture.md', 'deploy.md', 'data-sources.md', 'runbook.md']) F(docs, n, sz(2 * KB, 18 * KB), within(30 * DAY, 2 * YEAR));
    F(D(p, 'scripts', start), 'deploy.sh', sz(900, 3 * KB), within(40 * DAY, YEAR));
    F(D(p, 'scripts', start), 'seed-stations.ts', sz(2 * KB, 6 * KB), within(90 * DAY, 2 * YEAR));
    const dist = D(p, 'dist', ago(3 * DAY));
    for (const r of ROUTES) {
      const t = session + 2 * HOUR + int(0, 20000);
      F(dist, `${r}.js`, sz(2 * KB, 30 * KB), t, { birth: t });
      F(dist, `${r}.js.map`, sz(4 * KB, 60 * KB), t, { birth: t });
    }
    F(p, 'package.json', sz(1.4 * KB, 2.4 * KB), within(10 * DAY, 60 * DAY));
    F(p, 'package-lock.json', sz(180 * KB, 420 * KB), ago(40 * DAY));
    F(p, 'tsconfig.json', sz(500, 1200), within(200 * DAY, 3 * YEAR));
    F(p, 'Dockerfile', sz(400, 1100), within(60 * DAY, 2 * YEAR));
    F(p, 'docker-compose.yml', sz(500, 1600), within(60 * DAY, 2 * YEAR));
    F(p, '.env.example', sz(200, 600), within(100 * DAY, 3 * YEAR));
    F(p, '.gitignore', sz(80, 300), within(1 * YEAR, 3 * YEAR));
    nodeModules(p, NPM, ago(40 * DAY));
    gitDir(p, start, session + 2 * HOUR, 260);
  }

  // tidepool-web: the front end, edited in the last hour.
  {
    const p = D(projects, 'tidepool-web', ago(2.1 * YEAR));
    const start = ago(2.1 * YEAR);
    const comps = D(p, 'src/components', start);
    for (const c of COMPONENTS) {
      F(comps, `${c}.tsx`, sz(900, 14 * KB), within(4 * DAY, 2 * YEAR));
      if (chance(0.4)) F(comps, `${c}.module.css`, sz(200, 4 * KB), within(4 * DAY, 2 * YEAR));
    }
    const hooks = D(p, 'src/hooks', start);
    for (const h of ['useTides', 'useStations', 'useGeolocation', 'useUnits', 'useTheme', 'useInterval']) F(hooks, `${h}.ts`, sz(500, 4 * KB), within(10 * DAY, 2 * YEAR));
    const styles = D(p, 'src/styles', start);
    for (const s of ['global.css', 'tokens.css', 'charts.css', 'print.css']) F(styles, s, sz(1 * KB, 12 * KB), within(10 * DAY, 2 * YEAR));
    F(D(p, 'src'), 'main.tsx', sz(400, 1200), within(100 * DAY, 2 * YEAR));
    F(D(p, 'src'), 'api.ts', sz(2 * KB, 7 * KB), within(10 * DAY, 300 * DAY));
    const pub = D(p, 'public', start);
    F(pub, 'favicon.svg', sz(400, 1800), within(1 * YEAR, 2 * YEAR), { img: image('icon', 64, 64) });
    F(pub, 'index.html', sz(600, 1400), within(100 * DAY, 2 * YEAR));
    const assets = D(pub, 'assets', start);
    for (let i = 1; i <= 14; i++) F(assets, `station-${pad(i)}.jpg`, sz(80 * KB, 420 * KB), within(200 * DAY, 2 * YEAR), { img: image('sea', 1600, 1066) });
    for (const n of ['wave', 'wind', 'moon', 'tide-high', 'tide-low', 'buoy', 'anchor', 'compass']) F(assets, `${n}.svg`, sz(500, 3 * KB), within(300 * DAY, 2 * YEAR), { img: image('icon', 24, 24) });
    // The session under way: twelve files in the last 75 minutes, plus
    // one in harbor-api, the service this page talks to.
    const live = ['src/components/TideChart.tsx', 'src/components/TideChart.module.css', 'src/components/Legend.tsx',
      'src/components/Sparkline.tsx', 'src/hooks/useTides.ts', 'src/api.ts', 'src/styles/charts.css',
      'src/components/StationCard.tsx', 'src/components/Timeline.tsx', 'src/components/TideTable.tsx', 'README.md',
      'src/components/TideTable.module.css'];
    live.forEach((rel, i) => {
      const cut = rel.lastIndexOf('/');
      const dir = cut < 0 ? p : D(p, rel.slice(0, cut), start);
      const t = ago(75 * MIN) + Math.round((i / live.length) * 62 * MIN) + int(0, 2 * MIN);
      const prior = dir.kids.get(rel.slice(cut + 1));
      if (prior) prior.mtime = t;
      else F(dir, rel.slice(cut + 1), sz(800, 9 * KB), t, { birth: t });
    });
    F(p, 'package.json', sz(1.2 * KB, 2 * KB), ago(9 * DAY));
    F(p, 'package-lock.json', sz(200 * KB, 520 * KB), ago(9 * DAY));
    F(p, 'vite.config.ts', sz(300, 900), within(100 * DAY, 2 * YEAR));
    F(p, 'tsconfig.json', sz(500, 1100), within(200 * DAY, 2 * YEAR));
    F(p, '.gitignore', sz(60, 240), within(1 * YEAR, 2 * YEAR));
    nodeModules(p, [...NPM_WEB, ...NPM.slice(0, 60)], ago(9 * DAY));
    const build = D(p, 'build', ago(4 * DAY));
    const bt = ago(4 * DAY);
    F(build, 'index.html', sz(700, 1400), bt, { birth: bt });
    const js = D(build, 'assets', bt);
    for (let i = 0; i < 9; i++) {
      const h = seedOf().toString(16).slice(0, 8);
      F(js, `index-${h}.js`, sz(8 * KB, 380 * KB), bt, { birth: bt });
      F(js, `index-${h}.js.map`, sz(30 * KB, 1.2 * MB), bt, { birth: bt });
    }
    F(js, `index-${seedOf().toString(16).slice(0, 8)}.css`, sz(12 * KB, 40 * KB), bt, { birth: bt });
    gitDir(p, start, ago(80 * MIN), 180);
  }

  // lumen-cli: a Python tool, with its virtual environment.
  {
    const p = D(projects, 'lumen-cli', ago(1.4 * YEAR));
    const start = ago(1.4 * YEAR);
    const pkg = D(p, 'lumen', start);
    F(pkg, '__init__.py', sz(60, 400), within(30 * DAY, YEAR));
    for (const m of PY_MODULES) F(pkg, `${m}.py`, sz(1 * KB, 18 * KB), within(12 * DAY, 1.3 * YEAR));
    const cache = D(pkg, '__pycache__', ago(12 * DAY));
    for (const m of PY_MODULES) F(cache, `${m}.cpython-312.pyc`, sz(800, 14 * KB), within(12 * DAY, 13 * DAY));
    const tests = D(p, 'tests', start);
    for (const m of PY_MODULES.slice(0, 14)) F(tests, `test_${m}.py`, sz(800, 9 * KB), within(12 * DAY, YEAR));
    F(p, 'pyproject.toml', sz(700, 1800), within(12 * DAY, 200 * DAY));
    F(p, 'README.md', sz(3 * KB, 9 * KB), within(12 * DAY, 100 * DAY));
    F(p, 'CHANGELOG.md', sz(2 * KB, 8 * KB), within(12 * DAY, 40 * DAY));
    F(p, 'LICENSE', 1077, start);
    F(p, '.gitignore', sz(100, 400), start);
    const venvAt = ago(70 * DAY);
    const sp = D(p, '.venv/lib/python3.12/site-packages', venvAt);
    F(D(p, '.venv', venvAt), 'pyvenv.cfg', sz(100, 300), venvAt, { birth: venvAt });
    const vbin = D(p, '.venv/bin', venvAt);
    for (const b of ['python', 'python3', 'python3.12']) F(vbin, b, 0, venvAt, { birth: venvAt, link: '/usr/bin/python3.12' });
    for (const b of ['activate', 'pip', 'pytest', 'lumen']) F(vbin, b, sz(200, 2400), venvAt, { birth: venvAt });
    for (const name of PIP) {
      const t = venvAt + int(0, 30000);
      const d = D(sp, name, t);
      const big = name === 'pillow' || name === 'pydantic_core' || name === 'rich';
      const n = big ? int(30, 70) : int(3, 18);
      for (let i = 0; i < n; i++) F(d, `${pick(['__init__', 'core', 'api', 'utils', 'models', 'compat', 'exceptions', 'types', 'main', 'parser'])}${i ? `_${i}` : ''}.py`, sz(300, 40 * KB), t, { birth: t });
      if (name === 'pillow' || name === 'pydantic_core') F(d, `_core.cpython-312-x86_64-linux-gnu.so`, sz(2 * MB, 9 * MB), t, { birth: t });
      const dist = D(sp, `${name}-${int(0, 9)}.${int(0, 30)}.${int(0, 9)}.dist-info`, t);
      for (const m of ['METADATA', 'RECORD', 'WHEEL', 'INSTALLER']) F(dist, m, sz(100, 9 * KB), t, { birth: t });
    }
    gitDir(p, start, ago(12 * DAY), 120);
  }

  // orbit-game: a game prototype with heavy assets and builds.
  {
    const p = D(projects, 'orbit-game', ago(2.6 * YEAR));
    const start = ago(2.6 * YEAR);
    const tex = D(p, 'assets/textures', start);
    for (let i = 1; i <= 48; i++) F(tex, `${pick(['rock', 'ice', 'metal', 'nebula', 'hull', 'panel', 'crater', 'dust'])}_${pad(i)}_${pick(['albedo', 'normal', 'rough'])}.png`, sz(3 * MB, 22 * MB), within(60 * DAY, 2.4 * YEAR), { img: image('texture', 2048, 2048) });
    const models = D(p, 'assets/models', start);
    for (const m of ['ship', 'station', 'asteroid-a', 'asteroid-b', 'asteroid-c', 'probe', 'satellite', 'debris', 'dock', 'beacon', 'moon', 'cargo-pod']) {
      F(models, `${m}.glb`, sz(4 * MB, 90 * MB), within(60 * DAY, 2 * YEAR), { img: image('model', 1024, 1024) });
      if (chance(0.5)) F(models, `${m}.blend`, sz(20 * MB, 260 * MB), within(60 * DAY, 2 * YEAR), { img: image('model', 1024, 1024) });
    }
    const sfx = D(p, 'assets/audio/sfx', start);
    for (let i = 1; i <= 36; i++) F(sfx, `${pick(['thrust', 'dock', 'alarm', 'ping', 'impact', 'beep', 'hum', 'click'])}_${pad(i)}.wav`, sz(60 * KB, 3 * MB), within(100 * DAY, 2 * YEAR));
    const music = D(p, 'assets/audio/music', start);
    for (const m of ['menu', 'drift', 'approach', 'docking', 'deep-field', 'credits']) F(music, `${m}.ogg`, sz(3 * MB, 9 * MB), within(100 * DAY, 2 * YEAR));
    const scripts = D(p, 'scripts', start);
    for (const s of ['main', 'ship', 'orbit', 'camera', 'input', 'hud', 'audio', 'save', 'menu', 'physics', 'docking', 'asteroids', 'ui', 'config', 'debug']) F(scripts, `${s}.lua`, sz(1 * KB, 24 * KB), within(30 * DAY, 2.5 * YEAR));
    const docs = D(p, 'design', start);
    for (const n of ['pitch.md', 'controls.md', 'level-ideas.md', 'art-direction.md']) F(docs, n, sz(2 * KB, 12 * KB), within(60 * DAY, 2.5 * YEAR));
    F(docs, 'concept-sheet.png', sz(4 * MB, 12 * MB), within(1 * YEAR, 2.5 * YEAR), { img: image('night', 3000, 2000) });
    const builds = D(p, 'builds', start);
    const versions = [['0.1.0', 2.2 * YEAR], ['0.2.0', 1.6 * YEAR], ['0.3.0', 1 * YEAR], ['0.4.0', 0.4 * YEAR]];
    for (const [v, a] of versions) {
      F(builds, `orbit-${v}-win.zip`, sz(500 * MB, 1.2 * GB), ago(a), { arc: { kind: 'build', v } });
      if (v >= '0.3.0') F(builds, `orbit-${v}-mac.dmg`, sz(280 * MB, 560 * MB), ago(a - 2 * HOUR));
    }
    const caps = D(p, 'captures', start);
    for (let i = 1; i <= 10; i++) {
      const t = within(30 * DAY, 2 * YEAR);
      F(caps, `playtest-${dayName(t)}-${pad(i)}.mp4`, sz(200 * MB, 1.5 * GB), t, { birth: t });
    }
    F(p, 'README.md', sz(2 * KB, 6 * KB), within(30 * DAY, 200 * DAY));
    F(p, 'project.toml', sz(300, 1200), within(30 * DAY, 300 * DAY));
    gitDir(p, start, ago(30 * DAY), 140);
  }

  // field-notes-site: a static site with a post six days ago.
  {
    const p = D(projects, 'field-notes-site', ago(4.4 * YEAR));
    const start = ago(4.4 * YEAR);
    const posts = D(p, 'content/posts', start);
    const img = D(p, 'static/img', start);
    POSTS.forEach((slug, i) => {
      const t = i === POSTS.length - 1 ? ago(6 * DAY + 3 * HOUR) : within(20 * DAY, 4.3 * YEAR);
      F(posts, `${dayName(t)}-${slug}.md`, sz(2 * KB, 14 * KB), t);
      for (let k = 0; k < int(1, 4); k++) {
        const it = t - int(0, 2 * HOUR);
        F(img, `${slug}-${k + 1}.jpg`, sz(200 * KB, 1.4 * MB), it, { img: image(pick(['sea', 'mountain', 'night', 'forest', 'sea']), 2000, 1333) });
      }
    });
    const layouts = D(p, 'layouts', start);
    for (const n of ['base.html', 'post.html', 'list.html', 'home.html', 'rss.xml']) F(layouts, n, sz(600, 6 * KB), within(100 * DAY, 4 * YEAR));
    F(D(p, 'static/css', start), 'site.css', sz(4 * KB, 16 * KB), within(60 * DAY, 2 * YEAR));
    F(p, 'config.toml', sz(500, 1600), within(60 * DAY, 2 * YEAR));
    F(p, 'README.md', sz(1 * KB, 3 * KB), within(1 * YEAR, 4 * YEAR));
    const pub = D(p, 'public', ago(6 * DAY));
    const pt = ago(6 * DAY + 2 * HOUR);
    for (const slug of POSTS) F(D(pub, `posts/${slug}`, pt), 'index.html', sz(5 * KB, 22 * KB), pt, { birth: pt });
    F(pub, 'index.html', sz(8 * KB, 20 * KB), pt, { birth: pt });
    F(pub, 'feed.xml', sz(20 * KB, 60 * KB), pt, { birth: pt });
    gitDir(p, start, ago(6 * DAY), 220);
  }

  // data-pipeline: notebooks and large data files.
  {
    const p = D(projects, 'data-pipeline', ago(1.8 * YEAR));
    const start = ago(1.8 * YEAR);
    const nb = D(p, 'notebooks', start);
    for (const n of ['01-explore-buoys', '02-clean-readings', '03-seasonal-swell', '04-tide-residuals', '05-storm-events', '06-forecast-skill', '07-station-gaps', '08-report-figures']) {
      F(nb, `${n}.ipynb`, sz(40 * KB, 3 * MB), within(14 * DAY, 1.7 * YEAR));
    }
    const raw = D(p, 'data/raw', start);
    for (let y = 2018; y <= 2025; y++) F(raw, `buoy-readings-${y}.csv`, sz(400 * MB, 2.4 * GB), within(1.5 * YEAR, 1.8 * YEAR));
    const processed = D(p, 'data/processed', start);
    for (const n of ['readings', 'stations', 'storms', 'residuals', 'daily-means', 'monthly-means']) F(processed, `${n}.parquet`, sz(12 * MB, 420 * MB), within(14 * DAY, 300 * DAY));
    F(D(p, 'models', start), 'swell-forecast-v3.pkl', sz(180 * MB, 360 * MB), ago(40 * DAY));
    F(D(p, 'models', start), 'swell-forecast-v2.pkl', sz(160 * MB, 300 * MB), ago(220 * DAY));
    const src = D(p, 'src', start);
    for (const n of ['load', 'clean', 'features', 'train', 'evaluate', 'plots', 'io']) F(src, `${n}.py`, sz(1 * KB, 12 * KB), within(14 * DAY, 1.7 * YEAR));
    const reports = D(p, 'reports', start);
    for (const n of ['2025-q1', '2025-q2', '2025-q3', '2025-q4']) F(reports, `swell-report-${n}.html`, sz(200 * KB, 2 * MB), within(30 * DAY, YEAR));
    F(reports, 'figures.svg', sz(40 * KB, 180 * KB), within(30 * DAY, YEAR), { img: image('ui', 1200, 800) });
    F(p, 'README.md', sz(2 * KB, 5 * KB), within(30 * DAY, 300 * DAY));
    F(p, 'requirements.txt', sz(200, 700), within(30 * DAY, 300 * DAY));
  }

  // sandbox: small experiments, some abandoned empty.
  {
    const s = D(projects, 'sandbox', ago(4 * YEAR));
    const ideas = ['shader-toy', 'wave-sim', 'qr-poster', 'tiny-synth', 'map-tiles', 'pixel-font', 'cron-bot', 'rss-digest',
      'barometer-log', 'gif-maker', 'tide-clock', 'sun-angles', 'sketch-pad', 'json-diff', 'color-picker', 'port-scan-notes',
      'markdown-slides', 'kite-calc', 'star-chart', 'sound-meter'];
    for (const idea of ideas) {
      const t = within(30 * DAY, 3.8 * YEAR);
      const d = D(s, idea, t);
      const n = int(1, 7);
      for (let i = 0; i < n; i++) F(d, pick(['index.html', 'main.js', 'notes.md', 'style.css', 'app.py', 'data.json', 'sketch.js', 'README.md', 'test.js', 'run.sh']), sz(200, 9 * KB), t + int(0, 3 * HOUR));
    }
    for (const empty of ['untitled', 'untitled 2', 'new-idea', 'scratch-old']) D(s, empty, within(60 * DAY, 3 * YEAR));
  }
  F(projects, 'current', 0, ago(80 * MIN), { link: 'tidepool-web' });

  /* ---- Photos ---- */
  const photos = D(root, 'Photos', ago(6.4 * YEAR));
  const photoEvents = [];
  const thisYear = new Date(now).getFullYear();
  for (let y = thisYear - 6; y <= thisYear; y++) {
    const yd = D(photos, String(y), new Date(y, 0, 1).getTime());
    const count = y === thisYear ? 6 : int(4, 6);
    for (let e = 0; e < count; e++) {
      const [label, style] = pick(EVENTS);
      let t = new Date(y, int(0, 11), int(1, 28), int(7, 19), int(0, 59)).getTime();
      if (t > now - 3 * DAY) t = now - int(4, 60) * DAY;
      if (new Date(t).getFullYear() !== y) continue;
      const folder = `${dateName(t)} ${label}`;
      if (yd.kids.has(folder)) continue;
      const ed = D(yd, folder, t);
      const n = int(24, 80);
      const raw = chance(0.6);
      let num = int(1000, 8000);
      const shots = [];
      for (let i = 0; i < n; i++) {
        const st = t + i * int(20e3, 600e3);
        const [w, h] = photo();
        num += int(1, 3);
        const name = `IMG_${pad(num, 4)}`;
        const f = F(ed, `${name}.JPG`, sz(3.2 * MB, 9.5 * MB), st, { img: image(style, w, h), birth: st });
        shots.push(f);
        if (raw) F(ed, `${name}.CR3`, sz(22 * MB, 31 * MB), st, { birth: st, img: image(style, w, h) });
      }
      if (chance(0.4)) {
        const edits = D(ed, 'Edits', t + 2 * DAY);
        for (let i = 0; i < int(1, 4); i++) {
          const et = t + int(2, 30) * DAY;
          F(edits, `${pick(shots).name.replace('.JPG', '')}-edit.tif`, sz(70 * MB, 190 * MB), Math.min(et, now - DAY), { img: image(style, 6000, 4000) });
        }
      }
      if (chance(0.15)) F(ed, '.DS_Store', sz(6 * KB, 18 * KB), t + DAY);
      photoEvents.push({ dir: ed, rel: `Photos/${y}/${folder}`, t, style, shots });
    }
  }
  // Screenshots, many and small.
  const shots = D(photos, 'Screenshots', ago(3 * YEAR));
  for (let i = 0; i < 240; i++) {
    const t = within(1 * HOUR, 3 * YEAR);
    F(shots, `Screenshot ${dayName(t)} at ${pad(new Date(t).getHours())}.${pad(new Date(t).getMinutes())}.${pad(new Date(t).getSeconds())}.png`, sz(180 * KB, 3.2 * MB), t, { img: image('screen', 2560, 1600), birth: t });
  }
  // Last night's export: forty files in six minutes.
  {
    const ev = photoEvents.filter((e) => e.shots.length >= 20).at(-1) || photoEvents.at(-1);
    const out = D(photos, `Exports/${ev.dir.name}`, ago(26 * HOUR));
    const t0 = ago(26 * HOUR);
    ev.shots.slice(0, 40).forEach((f, i) => {
      const t = t0 + Math.round((i / 40) * 6 * MIN);
      F(out, f.name.replace('.JPG', '.jpg'), sz(1.1 * MB, 2.6 * MB), t, { img: { ...f.img, w: 2400, h: Math.round((2400 * f.img.h) / f.img.w) }, birth: t });
    });
  }
  const albums = D(photos, 'Albums', ago(2 * YEAR));
  for (const a of ['Best of the coast', 'Prints to order', 'Family', 'Portfolio']) D(albums, a, within(30 * DAY, 2 * YEAR));
  for (const e of photoEvents.slice(0, 6)) {
    const target = albums.kids.get('Best of the coast');
    const f = e.shots[0];
    F(target, `${e.dir.name} - ${f.name}`, 0, e.t + DAY, { link: `../../${e.rel.replace('Photos/', '')}/${f.name}` });
  }

  /* ---- Video ---- */
  const video = D(root, 'Video', ago(5 * YEAR));
  {
    const film = D(video, 'Projects/Tidelines (short film)', ago(160 * DAY));
    const shoot = ago(150 * DAY);
    for (const [cam, n] of [['A-cam', 24], ['B-cam', 12]]) {
      const d = D(film, `Footage/${cam}`, shoot);
      for (let i = 1; i <= n; i++) {
        const t = shoot + i * int(4, 20) * MIN + (i > n / 2 ? DAY : 0);
        F(d, `${cam[0]}001_C${pad(i, 3)}.mov`, sz(0.4 * GB, 2.2 * GB), t, { birth: t });
      }
    }
    const audio = D(film, 'Footage/Sound', shoot);
    for (let i = 1; i <= 22; i++) F(audio, `T${pad(i, 3)}.WAV`, sz(120 * MB, 480 * MB), shoot + i * 9 * MIN);
    const prox = D(film, 'Proxies', ago(140 * DAY));
    for (let i = 1; i <= 24; i++) F(prox, `A001_C${pad(i, 3)}_proxy.mp4`, sz(80 * MB, 300 * MB), ago(140 * DAY) + i * 40e3);
    const renders = D(film, 'Renders', ago(90 * DAY));
    for (let v = 1; v <= 6; v++) F(renders, `Tidelines_v${v}${v === 6 ? '_final' : ''}.mp4`, sz(0.8 * GB, 2.4 * GB), ago((90 - v * 12) * DAY));
    F(renders, 'Tidelines_v6_final_FINAL.mp4', 0, ago(17 * DAY), { s: 0 });
    renders.kids.get('Tidelines_v6_final_FINAL.mp4').size = renders.kids.get('Tidelines_v6_final.mp4').size;
    renders.kids.get('Tidelines_v6_final_FINAL.mp4').s = renders.kids.get('Tidelines_v6_final.mp4').s;
    const proj = D(film, 'Project', ago(160 * DAY));
    F(proj, 'Tidelines.prproj', sz(40 * MB, 140 * MB), ago(18 * DAY));
    const auto = D(proj, 'Auto-Save', ago(150 * DAY));
    for (let i = 1; i <= 20; i++) F(auto, `Tidelines-${pad(i)}.prproj`, sz(30 * MB, 130 * MB), ago((150 - i * 6.5) * DAY));
    F(film, 'shot-list.xlsx', sz(30 * KB, 120 * KB), ago(158 * DAY));
    F(film, 'script.pdf', sz(200 * KB, 900 * KB), ago(170 * DAY));
  }
  {
    const rec = D(video, 'Screen recordings', ago(2 * YEAR));
    for (let i = 0; i < 28; i++) {
      const t = within(2 * DAY, 2 * YEAR);
      F(rec, `Recording ${dayName(t)} ${pad(new Date(t).getHours())}${pad(new Date(t).getMinutes())}.mp4`, sz(30 * MB, 900 * MB), t, { birth: t });
    }
    const fam = D(video, 'Family', ago(5 * YEAR));
    for (let i = 0; i < 30; i++) {
      const t = within(30 * DAY, 5 * YEAR);
      F(fam, `VID_${dayName(t).replace(/-/g, '')}_${pad(int(0, 23))}${pad(int(0, 59))}${pad(int(0, 59))}.mp4`, sz(30 * MB, 700 * MB), t, { birth: t });
    }
  }

  /* ---- Music ---- */
  const music = D(root, 'Music', ago(6 * YEAR));
  {
    const lib = D(music, 'Library', ago(6 * YEAR));
    for (const artist of ARTISTS) {
      const albumsN = int(1, 3);
      for (let a = 0; a < albumsN; a++) {
        const title = `${pick(ADJ)} ${pick(NOUN)}`;
        const t = within(60 * DAY, 6 * YEAR);
        const ad = D(lib, `${artist}/${title}`, t);
        const tracks = int(7, 13);
        const flac = chance(0.6);
        for (let i = 1; i <= tracks; i++) {
          F(ad, `${pad(i)} ${pick(ADJ)} ${pick(NOUN)}.${flac ? 'flac' : 'mp3'}`, flac ? sz(18 * MB, 55 * MB) : sz(4 * MB, 12 * MB), t + i * 1000, { birth: t });
        }
        F(ad, 'cover.jpg', sz(200 * KB, 1.4 * MB), t, { img: image(pick(['night', 'autumn', 'sea', 'desert', 'forest']), 1400, 1400), birth: t });
      }
    }
    const prod = D(music, 'Production', ago(3 * YEAR));
    const songs = D(prod, 'Projects', ago(3 * YEAR));
    for (let i = 0; i < 12; i++) {
      const name = `${pick(ADJ)} ${pick(NOUN)}`;
      const t = i === 11 ? ago(14 * DAY) : within(30 * DAY, 3 * YEAR);
      const d = D(songs, `${name} Project`, t);
      F(d, `${name}.als`, sz(300 * KB, 3 * MB), t + int(1, 6) * HOUR);
      const bounces = D(d, 'Bounces', t);
      for (let v = 1; v <= int(1, 5); v++) F(bounces, `${name} v${v}.wav`, sz(40 * MB, 120 * MB), t + v * HOUR);
      const samples = D(d, 'Samples/Processed', t);
      for (let k = 0; k < int(3, 16); k++) F(samples, `${pick(['Kick', 'Snare', 'Hat', 'Pad', 'Bass', 'Vox', 'FX'])} ${pad(k)}.wav`, sz(80 * KB, 6 * MB), t + int(0, 3 * HOUR));
    }
    const kits = D(prod, 'Samples', ago(3 * YEAR));
    for (const kit of ['Drums - Tape Room', 'Drums - Field Kit', 'Textures - Harbor', 'Foley - Kitchen', 'Synth One-shots']) {
      const t = within(1 * YEAR, 3 * YEAR);
      const k = D(kits, kit, t);
      for (let i = 1; i <= int(30, 90); i++) F(k, `${kit.split(' - ').pop().toLowerCase().replace(/\s+/g, '-')}-${pad(i, 3)}.wav`, sz(20 * KB, 2.4 * MB), t, { birth: t });
    }
    const pods = D(music, 'Podcasts', ago(2 * YEAR));
    for (let i = 1; i <= 36; i++) F(pods, `Harbor Hours - Episode ${pad(i, 3)}.mp3`, sz(30 * MB, 90 * MB), within(3 * DAY, 2 * YEAR));
  }

  /* ---- Design ---- */
  const design = D(root, 'Design', ago(5 * YEAR));
  {
    const brand = D(design, 'Brand/Tidepool', ago(2 * YEAR));
    for (const v of ['logo', 'logo-mono', 'logo-reverse', 'wordmark', 'mark']) {
      F(brand, `${v}.svg`, sz(1.5 * KB, 9 * KB), within(100 * DAY, 2 * YEAR), { img: image('icon', 512, 512) });
      F(brand, `${v}.png`, sz(40 * KB, 400 * KB), within(100 * DAY, 2 * YEAR), { img: image('icon', 2048, 2048) });
    }
    F(brand, 'Tidepool brand.ai', sz(8 * MB, 40 * MB), ago(300 * DAY));
    F(brand, 'Brand guidelines.pdf', sz(18 * MB, 46 * MB), ago(280 * DAY));
    const ui = D(design, 'UI', ago(2 * YEAR));
    for (const f of ['Tidepool app', 'Harbor admin', 'Field Notes site', 'Orbit HUD']) F(ui, `${f}.fig`, sz(30 * MB, 260 * MB), within(5 * DAY, 300 * DAY), { img: image('ui', 1600, 1000) });
    const mock = D(design, 'Mockups', ago(2 * YEAR));
    for (let i = 1; i <= 9; i++) F(mock, `${pick(['Poster', 'Billboard', 'Phone', 'Laptop', 'Tote bag', 'Mug', 'Sign'])} mockup ${pad(i)}.psd`, sz(140 * MB, 1.4 * GB), within(40 * DAY, 2 * YEAR), { img: image(pick(['ui', 'portrait', 'city']), 4000, 3000) });
    const icons = D(design, 'Icons/line', ago(1.5 * YEAR));
    const it = ago(1.5 * YEAR) + 3 * DAY;
    for (let i = 0; i < 160; i++) F(icons, `${pick(['arrow', 'wave', 'anchor', 'compass', 'sun', 'moon', 'cloud', 'rain', 'wind', 'map', 'pin', 'boat', 'fish', 'star', 'flag'])}-${pick(['up', 'down', 'left', 'right', 'filled', 'outline', 'small', 'large'])}-${i}.svg`, sz(300, 2400), it + i * 9000, { img: image('icon', 24, 24), birth: it + i * 9000 });
    const fonts = D(design, 'Fonts', ago(4 * YEAR));
    for (const fam of ['Harbor Grotesk', 'Tide Mono', 'Lantern Serif']) {
      const t = within(1 * YEAR, 4 * YEAR);
      const d = D(fonts, fam, t);
      for (const w of ['Light', 'Regular', 'Medium', 'Bold', 'Black']) {
        F(d, `${fam.replace(/\s/g, '')}-${w}.otf`, sz(60 * KB, 260 * KB), t, { birth: t });
        F(d, `${fam.replace(/\s/g, '')}-${w}.woff2`, sz(20 * KB, 90 * KB), t, { birth: t });
      }
      F(d, 'OFL.txt', 4400, t, { birth: t });
    }
    const print = D(design, 'Print', ago(3 * YEAR));
    for (const n of ['Tide calendar 2025', 'Tide calendar 2026', 'Gallery flyer', 'Business cards']) {
      F(print, `${n}.indd`, sz(4 * MB, 60 * MB), within(30 * DAY, 2 * YEAR));
      F(print, `${n} (print).pdf`, sz(8 * MB, 120 * MB), within(30 * DAY, 2 * YEAR));
    }
    D(design, 'Archive', ago(1 * YEAR));
  }

  /* ---- Documents ---- */
  const docs = D(root, 'Documents', ago(6.4 * YEAR));
  {
    const fin = D(docs, 'Finance', ago(4 * YEAR));
    for (let y = thisYear - 3; y <= thisYear; y++) {
      const yd = D(fin, String(y), new Date(y, 0, 2).getTime());
      const rec = D(yd, 'Receipts', new Date(y, 0, 2).getTime());
      for (let i = 0; i < int(20, 45); i++) {
        let t = new Date(y, int(0, 11), int(1, 28)).getTime();
        if (t > now) t = now - int(2, 200) * DAY;
        F(rec, `receipt-${dayName(t)}-${pick(['hardware', 'software', 'travel', 'print', 'studio-rent', 'equipment', 'hosting', 'books'])}.pdf`, sz(40 * KB, 900 * KB), t, { birth: t });
      }
      F(yd, 'budget.xlsx', sz(30 * KB, 400 * KB), Math.min(new Date(y, 11, 20).getTime(), now - 2 * DAY));
      F(yd, 'expenses.csv', sz(8 * KB, 120 * KB), Math.min(new Date(y, 11, 28).getTime(), now - 2 * DAY));
      if (y < thisYear) F(yd, `tax-return-${y}.pdf`, sz(300 * KB, 2 * MB), new Date(y + 1, 3, 10).getTime() > now ? now - 20 * DAY : new Date(y + 1, 3, 10).getTime());
    }
    const writing = D(docs, 'Writing', ago(4 * YEAR));
    for (const n of ['On small tools', 'Letter to the harbor board', 'Grant proposal - buoy network', 'Talk notes - mapping the tide', 'Essay draft - fog']) {
      F(writing, `${n}.md`, sz(3 * KB, 30 * KB), within(10 * DAY, 3 * YEAR));
      if (chance(0.5)) F(writing, `${n}.docx`, sz(20 * KB, 400 * KB), within(10 * DAY, 3 * YEAR));
    }
    // A daily-notes habit: one small file a day for most of a year.
    const notes = D(docs, 'Notes/Daily', ago(320 * DAY));
    for (let d = 1; d <= 320; d++) {
      if (chance(0.22)) continue;
      const t = ago(d * DAY) + int(-2, 2) * HOUR;
      F(notes, `${dayName(t)}.md`, sz(200, 4 * KB), t, { birth: t });
    }
    const ideas = D(docs, 'Notes', ago(2 * YEAR));
    for (const n of ['ideas', 'reading-list', 'packing-list', 'gear', 'contacts-to-follow-up', 'someday']) F(ideas, `${n}.md`, sz(400, 8 * KB), within(4 * DAY, 2 * YEAR));
    const manuals = D(docs, 'Manuals', ago(5 * YEAR));
    for (const n of ['Camera body', 'Field recorder', 'Drone', 'Sewing machine', 'Kayak', 'Barometer', 'Studio monitors', 'Printer']) F(manuals, `${n} manual.pdf`, sz(1 * MB, 28 * MB), within(1 * YEAR, 5 * YEAR));
    const travel = D(docs, 'Travel', ago(3 * YEAR));
    for (const n of ['Island ferry tickets', 'Cabin booking', 'Rail pass', 'Itinerary - coast', 'Itinerary - desert']) F(travel, `${n}.pdf`, sz(60 * KB, 600 * KB), within(30 * DAY, 3 * YEAR));
    const recipes = D(docs, 'Recipes', ago(4 * YEAR));
    for (const n of ['fish-stew', 'sourdough', 'lemon-cake', 'chili-oil', 'pickled-onions', 'miso-soup', 'flatbread', 'granola']) F(recipes, `${n}.md`, sz(600, 4 * KB), within(20 * DAY, 4 * YEAR));
    const cv = D(docs, 'Resume', ago(2 * YEAR));
    F(cv, 'resume.pdf', sz(80 * KB, 300 * KB), ago(45 * DAY));
    F(cv, 'resume.docx', sz(40 * KB, 120 * KB), ago(45 * DAY));
    F(cv, 'portfolio.pdf', sz(12 * MB, 38 * MB), ago(44 * DAY));
  }

  /* ---- Archive: stale, with copies of things kept elsewhere ---- */
  const archive = D(root, 'Archive', ago(5.8 * YEAR));
  {
    const laptop = D(archive, 'Old laptop (2019)', ago(5.8 * YEAR));
    const lt = ago(5.8 * YEAR);
    // Copies of the oldest photo events: true duplicates, same name and size.
    const pics = D(laptop, 'Pictures', lt);
    for (const e of photoEvents.slice(0, 3)) {
      const d = D(pics, e.dir.name, e.t);
      for (const f of e.shots.slice(0, 24)) F(d, f.name, f.size, f.mtime, { s: f.s, img: f.img, birth: lt + int(0, DAY) });
    }
    const desk = D(laptop, 'Desktop', lt);
    for (let i = 0; i < 40; i++) {
      const t = within(5.8 * YEAR, 6.4 * YEAR);
      F(desk, `${pick(['untitled', 'notes', 'todo', 'scan', 'invoice', 'draft', 'screenshot', 'export'])}${chance(0.5) ? ` ${int(2, 9)}` : ''}.${pick(['txt', 'pdf', 'png', 'docx', 'md', 'jpg'])}`, sz(2 * KB, 6 * MB), t, { img: image('screen', 1440, 900) });
    }
    const oldcode = D(laptop, 'Code/weather-widget', lt);
    for (const n of ['index.js', 'widget.js', 'style.css', 'README.md', 'package.json']) F(oldcode, n, sz(400, 9 * KB), within(5.9 * YEAR, 6.3 * YEAR));
    nodeModules(oldcode, NPM.slice(20, 75), ago(6.2 * YEAR));
    const backups = D(archive, 'Backups', ago(5 * YEAR));
    F(backups, 'old-site-2019.zip', sz(40 * MB, 90 * MB), ago(5.5 * YEAR), { arc: { kind: 'site' } });
    F(backups, 'full-backup-2021-03.zip', sz(14 * GB, 21 * GB), ago(4.6 * YEAR), { arc: { kind: 'backup' } });
    F(backups, 'phone-backup-2022.tar.gz', sz(6 * GB, 11 * GB), ago(3.8 * YEAR));
    F(backups, 'mail-export-2020.7z', sz(1.2 * GB, 3 * GB), ago(5.2 * YEAR));
    const discs = D(archive, 'Discs', ago(5.5 * YEAR));
    for (const n of ['Install disc 2015', 'Wedding video DVD', 'Photo backup disc 1', 'Photo backup disc 2']) F(discs, `${n}.iso`, sz(700 * MB, 8.4 * GB), within(5 * YEAR, 5.5 * YEAR));
    F(archive, 'README.txt', sz(400, 1200), ago(5.8 * YEAR));
  }

  /* ---- Downloads ---- */
  const dl = D(root, 'Downloads', ago(6 * YEAR));
  {
    const installers = ['Synth Studio Setup 4.2.exe', 'PhotoDesk-2026.dmg', 'TideViewer-installer.msi', 'video-editor-11.2.dmg',
      'node-v22-x64.msi', 'Font Manager 3.exe', 'drone-firmware-1.8.bin', 'printer-driver.pkg', 'map-maker-0.9.AppImage'];
    for (const n of installers) F(dl, n, sz(25 * MB, 950 * MB), within(3 * DAY, 2 * YEAR));
    for (let i = 0; i < 30; i++) {
      F(dl, `${pick(['tide-tables', 'harbor-notice', 'boat-registration', 'gallery-invite', 'workshop-slides', 'sea-chart', 'paper', 'ticket', 'manual', 'statement'])}-${int(100, 999)}.pdf`, sz(80 * KB, 14 * MB), within(1 * DAY, 2 * YEAR));
    }
    for (let i = 0; i < 22; i++) F(dl, `${pick(['IMG', 'photo', 'image', 'download', 'unnamed'])}${chance(0.5) ? `_${int(1, 999)}` : ''}.${pick(['jpg', 'png', 'webp', 'gif'])}`, sz(60 * KB, 6 * MB), within(1 * DAY, 1.5 * YEAR), { img: image(pick(['sea', 'city', 'food', 'screen', 'portrait']), 1600, 1200) });
    // The same invoice downloaded three times: true duplicates.
    const inv = F(dl, 'invoice-2026-02.pdf', sz(180 * KB, 260 * KB), ago(270 * DAY));
    F(dl, 'invoice-2026-02 (1).pdf', inv.size, ago(240 * DAY), { s: inv.s });
    F(dl, 'invoice-2026-02 (2).pdf', inv.size, ago(200 * DAY), { s: inv.s });
    // Same size, different content: a decoy the Verify step tells apart.
    F(dl, 'statement-march.pdf', inv.size, ago(230 * DAY));
    F(dl, 'fonts-pack.zip', sz(18 * MB, 40 * MB), ago(330 * DAY), { arc: { kind: 'fonts' } });
    F(dl, 'sample-pack-vol2.rar', sz(300 * MB, 800 * MB), ago(400 * DAY));
    F(dl, 'latest-build', 0, ago(12 * DAY), { link: '../Projects/orbit-game/builds/orbit-0.5.0-win.zip' });
    F(dl, 'tidelines-v6-share.mp4', 0, ago(17 * DAY));
    const share = dl.kids.get('tidelines-v6-share.mp4');
    const fin = find(root, 'Video/Projects/Tidelines (short film)/Renders/Tidelines_v6_final.mp4');
    share.size = fin.size;
    share.s = fin.s;
    D(dl, 'New folder', ago(150 * DAY));
  }

  /* ---- Hidden and odd ---- */
  {
    const cfg = D(root, '.config', ago(6 * YEAR));
    for (const app of ['editor', 'terminal', 'git', 'photo-desk', 'synth-studio', 'map-maker']) {
      const d = D(cfg, app, within(1 * YEAR, 6 * YEAR));
      for (const n of ['settings.json', 'keybindings.json', 'state.ini', 'recent.toml']) if (chance(0.7)) F(d, n, sz(100, 12 * KB), within(1 * DAY, 2 * YEAR));
    }
    const cache = D(root, '.cache', ago(3 * YEAR));
    for (let i = 0; i < 48; i++) {
      const t = within(1 * HOUR, 300 * DAY);
      const d = D(cache, `thumbnails/${(seedOf() & 0xfff).toString(16).padStart(3, '0')}`, t);
      for (let k = 0; k < int(4, 22); k++) F(d, `${seedOf().toString(16)}.png`, sz(4 * KB, 60 * KB), t + k * 1000, { birth: t });
    }
    F(cache, 'agent.sock', 0, ago(2 * HOUR), { special: true });
    F(root, '.DS_Store', sz(8 * KB, 14 * KB), ago(3 * DAY));
    F(root, '.hidden-notes.txt', sz(300, 1200), ago(40 * DAY));
    const priv = D(root, 'Private', ago(4 * YEAR));
    priv.err = 'EACCES';
    priv.mtime = ago(30 * DAY);
    F(root, 'Shared', 0, ago(200 * DAY), { link: 'Projects' });
  }

  /* ---- folder dates, from what they hold ---- */
  const settle = (dir) => {
    let newest = 0;
    let oldest = Infinity;
    for (const k of dir.kids.values()) {
      if (k.dir) settle(k);
      const t = k.dir ? k.birth : k.mtime;
      if (t > newest) newest = t;
      if (k.birth < oldest) oldest = k.birth;
    }
    if (!dir.birth) dir.birth = Number.isFinite(oldest) ? oldest : ago(30 * DAY);
    if (!dir.mtime) dir.mtime = Math.max(newest, dir.birth);
    if (dir.birth > dir.mtime) dir.birth = dir.mtime;
  };
  settle(root);

  /* ---- the holding area, from an earlier session yesterday ---- */
  const held = [];
  {
    const at = ago(28 * HOUR);
    const a = F(mkDir('x'), 'setup-old.exe', sz(60 * MB, 120 * MB), ago(2 * YEAR));
    const b = F(mkDir('x'), 'draft-ideas.md', sz(800, 3 * KB), ago(300 * DAY));
    held.push({ node: a, origin: 'Downloads/setup-old.exe', at }, { node: b, origin: 'Documents/Notes/draft-ideas.md', at: at + 4000 });
  }

  const stats = { files: 0, folders: 0, bytes: 0 };
  walk(root, (n) => {
    if (n.dir) stats.folders++;
    else {
      stats.files++;
      stats.bytes += n.size;
    }
  });
  return { root, now, seed, name: DEMO_NAME, stats, held };
}

/* ---------- contents ---------- */

const BINARY = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'avif', 'ico', 'tif', 'tiff', 'heic', 'psd', 'ai',
  'cr3', 'cr2', 'dng', 'nef', 'arw', 'raw', 'fig', 'sketch', 'blend', 'glb', 'gltf', 'fbx', 'indd', 'pdf', 'docx', 'xlsx',
  'mov', 'mp4', 'mkv', 'webm', 'prproj', 'aep', 'wav', 'flac', 'mp3', 'ogg', 'aiff', 'als', 'zip', 'gz', 'tgz', '7z',
  'rar', 'iso', 'dmg', 'msi', 'exe', 'pkg', 'appimage', 'bin', 'so', 'pyc', 'otf', 'woff2', 'ttf', 'pkl', 'parquet', 'db',
  'sqlite', 'pack', 'idx', 'sock']);

/** Whether a file reads as binary: its contents would carry NUL bytes. */
export function isBinary(name) {
  const ext = extOf(name);
  if (BINARY.has(ext)) return true;
  // Git's loose objects and index are zlib streams and binary records.
  return /^[0-9a-f]{38}$/.test(name) || name === 'index' || name === '.DS_Store';
}

const title = (s) => s.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const stemOf = (name) => (name.includes('.') ? name.slice(0, name.lastIndexOf('.')) : name);

/** An endless supply of lines for a text file, by its name. */
function* linesFor(name, R, rel = '') {
  const ext = extOf(name);
  const pick = (a) => a[Math.floor(R() * a.length)];
  const int = (a, b) => a + Math.floor(R() * (b - a + 1));
  const stem = stemOf(name);
  const prose = function* () {
    for (;;) {
      const n = int(2, 5);
      const parts = [];
      for (let i = 0; i < n; i++) parts.push(pick(SENTENCES));
      yield parts.join(' ');
      yield '';
    }
  };
  if (name === 'LICENSE') {
    yield 'MIT License';
    yield '';
    yield 'Copyright (c) the authors';
    yield '';
    yield 'Permission is hereby granted, free of charge, to any person obtaining a copy of this software';
    yield 'and associated documentation files, to deal in the Software without restriction.';
    yield '';
    yield* prose();
  }
  if (name === '.gitignore') {
    for (const l of ['node_modules/', 'dist/', 'build/', '.env', '.venv/', '__pycache__/', '*.log', '.DS_Store', 'coverage/']) yield l;
    for (;;) yield `# ${pick(SENTENCES)}`;
  }
  if (name === 'config') {
    yield '[core]';
    yield '	repositoryformatversion = 0';
    yield '	filemode = true';
    yield '	bare = false';
    yield '[remote "origin"]';
    yield '	url = git@example.com:studio/project.git';
    yield '	fetch = +refs/heads/*:refs/remotes/origin/*';
    for (;;) yield `# ${pick(SENTENCES)}`;
  }
  if (name === 'OFL.txt') {
    yield 'SIL Open Font License, Version 1.1';
    yield '';
    yield* prose();
  }
  if (ext === 'md' || ext === 'txt' || name === 'README') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(stem)) {
      yield `# ${stem}`;
      yield '';
      for (;;) {
        yield `- ${pick(SENTENCES)}`;
        if (R() < 0.2) yield `- [ ] ${pick(['Charge the recorder', 'Back up the card', 'Email the harbor office', 'Order cable', 'Sketch the new chart', 'Check the buoy logger', 'Edit the coast photos'])}`;
      }
    }
    if (/^\d{4}-\d{2}-\d{2}-/.test(stem)) {
      yield '---';
      yield `title: "${title(stem.slice(11))}"`;
      yield `date: ${stem.slice(0, 10)}`;
      yield `tags: [${pick(['harbor', 'tides', 'tools', 'photos', 'notes'])}, ${pick(['field', 'maps', 'sound', 'weather'])}]`;
      yield '---';
      yield '';
      yield* prose();
    }
    yield `# ${stem === 'README' ? 'Read me' : title(stem)}`;
    yield '';
    if (stem === 'README') {
      yield pick(SENTENCES);
      yield '';
      yield '## Getting started';
      yield '';
      const py = /lumen|data-pipeline/.test(rel);
      yield '```sh';
      yield py ? 'pip install -e .' : pick(['npm install', 'npm ci']);
      yield /lumen/.test(rel) ? 'lumen --help' : py ? 'python -m src.train' : /field-notes/.test(rel) ? 'make serve' : pick(['npm run dev', 'npm test']);
      yield '```';
      yield '';
      yield '## Notes';
      yield '';
    }
    yield* prose();
  }
  if (ext === 'ts' || ext === 'tsx' || ext === 'js' || ext === 'mjs' || ext === 'lua') {
    const lua = ext === 'lua';
    const cmt = lua ? '--' : '//';
    const fn = stem.replace(/[^a-zA-Z0-9]/g, '_').replace(/^\d/, '_$&');
    if (ext === 'tsx') {
      yield `import { useMemo } from 'react';`;
      yield `import styles from './${stem}.module.css';`;
      yield '';
      yield `type Props = { stations: Station[]; units: 'm' | 'ft' };`;
      yield '';
      yield `/** ${pick(SENTENCES)} */`;
      yield `export function ${fn}({ stations, units }: Props) {`;
      yield '  const rows = useMemo(() => stations.filter((s) => s.active), [stations]);';
      yield '  return (';
      yield `    <section className={styles.root} aria-label="${title(stem)}">`;
      yield '      {rows.map((s) => <Row key={s.id} station={s} units={units} />)}';
      yield '    </section>';
      yield '  );';
      yield '}';
      yield '';
    } else if (!lua) {
      yield `import { ${pick(['readings', 'stations', 'config', 'log', 'cache'])} } from '${pick(['../lib', './db', '../config', './util'])}';`;
      yield '';
    } else {
      yield `local ${fn} = {}`;
      yield '';
    }
    let i = 0;
    for (;;) {
      i++;
      yield `${cmt} ${pick(SENTENCES)}`;
      if (lua) {
        yield `function ${fn}.${pick(['update', 'draw', 'load', 'reset', 'step', 'spawn'])}${i}(dt)`;
        yield `  local v = ${int(1, 99)} * dt`;
        yield `  return v + ${fn}.${pick(['speed', 'mass', 'drag'])}`;
        yield 'end';
      } else {
        yield `export ${pick(['async ', ''])}function ${pick(['load', 'parse', 'format', 'fetch', 'build', 'check', 'merge'])}${title(fn).replace(/\s/g, '')}${i}(input${ext === 'js' || ext === 'mjs' ? '' : ': Reading[]'}) {`;
        yield `  const out = input.filter((r) => r.level > ${int(0, 9)}.${int(0, 9)});`;
        yield `  if (!out.length) throw new Error('No readings for ${stem}.');`;
        yield '  return out.map((r) => ({ ...r, level: Math.round(r.level * 100) / 100 }));';
        yield '}';
      }
      yield '';
    }
  }
  if (ext === 'py') {
    yield `"""${title(stem)}: ${pick(SENTENCES)}"""`;
    yield '';
    yield 'from __future__ import annotations';
    yield '';
    yield `import ${pick(['json', 'pathlib', 'datetime', 'hashlib', 'csv'])}`;
    yield '';
    let i = 0;
    for (;;) {
      i++;
      yield '';
      yield `def ${pick(['load', 'scan', 'parse', 'export', 'check', 'index'])}_${stem.replace(/\W/g, '_')}_${i}(path, *, limit=${int(10, 500)}):`;
      yield `    """${pick(SENTENCES)}"""`;
      yield '    items = []';
      yield '    for entry in sorted(path.iterdir()):';
      yield '        if len(items) >= limit:';
      yield '            break';
      yield '        items.append(entry.name)';
      yield '    return items';
      yield '';
    }
  }
  if (ext === 'css' || ext === 'scss') {
    yield ':root {';
    yield `  --sea: ${pick(['#4f86a6', '#2f5d78', '#7fb3c8'])};`;
    yield `  --sand: ${pick(['#e0b57e', '#c99a62'])};`;
    yield '}';
    yield '';
    for (;;) {
      yield `.${pick(['chart', 'legend', 'row', 'card', 'title', 'axis', 'tooltip', 'grid'])}-${int(1, 99)} {`;
      yield `  display: ${pick(['grid', 'flex', 'block'])};`;
      yield `  gap: ${int(2, 24)}px;`;
      yield `  color: var(--${pick(['sea', 'sand'])});`;
      yield '}';
      yield '';
    }
  }
  if (ext === 'html' || ext === 'xml') {
    yield ext === 'xml' ? '<?xml version="1.0" encoding="utf-8"?>' : '<!doctype html>';
    yield ext === 'xml' ? '<rss version="2.0"><channel>' : '<html lang="en"><head><meta charset="utf-8">';
    yield `<title>${title(stem)}</title>`;
    for (;;) yield `  <p>${pick(SENTENCES)}</p>`;
  }
  if (name === 'package.json') {
    yield '{';
    yield `  "name": "${pick(['harbor-api', 'tidepool-web', 'weather-widget', 'tide-clock'])}",`;
    yield `  "version": "${int(0, 3)}.${int(0, 12)}.${int(0, 9)}",`;
    yield '  "private": true,';
    yield '  "scripts": { "dev": "vite", "build": "tsc && vite build", "test": "vitest run" },';
    yield '  "dependencies": {';
    for (;;) yield `    "${pick(NPM)}": "^${int(1, 9)}.${int(0, 20)}.${int(0, 9)}",`;
  }
  if (ext === 'json' || ext === 'ipynb' || ext === 'map') {
    yield '{';
    if (ext === 'ipynb') {
      yield '  "cells": [';
      for (;;) {
        yield `    { "cell_type": "${pick(['markdown', 'code'])}", "source": ["${pick(SENTENCES).replace(/"/g, "'")}"] },`;
      }
    }
    for (;;) yield `  "${pick(['theme', 'fontSize', 'tabSize', 'autosave', 'recent', 'zoom', 'units', 'station'])}${int(1, 99)}": ${pick(['true', 'false', String(int(1, 400)), `"${pick(NOUN).toLowerCase()}"`])},`;
  }
  if (ext === 'csv') {
    const money = /expenses|budget/.test(stem);
    yield money ? 'date,category,amount,note' : 'time,station,level_m,temp_c,swell_m';
    const t0 = Date.UTC(2018, 0, 1);
    let k = 0;
    for (;;) {
      k++;
      if (money) {
        const d = new Date(t0 + k * 3 * DAY).toISOString().slice(0, 10);
        yield `${d},${pick(['hardware', 'software', 'travel', 'print', 'rent', 'hosting', 'books'])},${(5 + R() * 400).toFixed(2)},${pick(['', 'receipt kept', 'shared cost', 'reimbursed'])}`;
      } else {
        const d = new Date(t0 + k * 6 * MIN).toISOString().slice(0, 16).replace('T', ' ');
        yield `${d},${pick(['harbor-mouth', 'north-pier', 'buoy-7', 'outer-bank'])},${(R() * 4).toFixed(2)},${(8 + R() * 10).toFixed(1)},${(R() * 3).toFixed(2)}`;
      }
    }
  }
  if (ext === 'yml' || ext === 'yaml' || ext === 'toml' || ext === 'ini' || ext === 'cfg' || name.startsWith('.env') || name === 'requirements.txt') {
    for (;;) {
      const k = `${pick(['port', 'host', 'cache_ttl', 'log_level', 'region', 'workers', 'timeout', 'retries'])}${int(1, 9)}`;
      const v = pick(['8080', 'true', 'info', '"harbor"', '30', '600']);
      yield ext === 'yml' || ext === 'yaml' ? `${k}: ${v}` : `${k} = ${v}`;
    }
  }
  if (ext === 'sh' || name === 'Dockerfile' || ext === 'sample' || name === 'activate' || name === 'pip' || name === 'pytest' || name === 'lumen' || name === 'deploy.sh') {
    yield name === 'Dockerfile' ? 'FROM node:22-alpine' : '#!/bin/sh';
    for (;;) yield name === 'Dockerfile' ? `RUN ${pick(['npm ci', 'npm run build', 'apk add --no-cache tini'])}` : `echo "${pick(SENTENCES).replace(/"/g, "'")}"`;
  }
  if (ext === 'svg') {
    yield '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">';
    for (;;) yield `  <path d="M${int(2, 22)} ${int(2, 22)} L${int(2, 22)} ${int(2, 22)} Q${int(2, 22)} ${int(2, 22)} ${int(2, 22)} ${int(2, 22)}"/>`;
  }
  if (ext === 'log') {
    let t = Date.UTC(2026, 0, 1);
    for (;;) {
      t += 37000;
      yield `${new Date(t).toISOString()} ${pick(['INFO', 'INFO', 'INFO', 'WARN', 'DEBUG'])} ${pick(SENTENCES)}`;
    }
  }
  // Anything else that is text: notes, configuration, git's text files.
  if (name === 'HEAD') yield 'ref: refs/heads/main';
  for (;;) yield pick(SENTENCES);
}

/**
 * The text of a file, at most max bytes: exactly its size when that is
 * smaller. Binary kinds come back as a short run carrying NUL bytes, as a
 * raw read of them would.
 */
export function textOf(node, max = 16384, rel = '') {
  const want = Math.max(0, Math.min(node.size, max));
  if (!want) return '';
  if (isBinary(node.name)) {
    const head = `${extOf(node.name).toUpperCase() || 'DATA'}\u0000\u0001\u0002`;
    return head.repeat(Math.ceil(want / head.length)).slice(0, want);
  }
  const R = rng(node.s || hash32(node.name));
  let out = '';
  for (const line of linesFor(node.name, R, rel)) {
    out += `${line}\n`;
    if (out.length >= want) break;
  }
  return out.slice(0, want);
}

/* ---------- archives ---------- */

/**
 * The entries of a zip in the world, as the service's archive reader
 * lists them: { name, dir, size, packed, mtime, locked, link, special }.
 * Only files whose arc says so have entries; others are not zips.
 */
export function entriesOf(node) {
  const arc = node.arc;
  if (!arc || extOf(node.name) !== 'zip') return null;
  const R = rng(node.s);
  const pick = (a) => a[Math.floor(R() * a.length)];
  const int = (a, b) => a + Math.floor(R() * (b - a + 1));
  const t = node.mtime;
  const out = [];
  const add = (name, size) => out.push({ name, dir: false, size, packed: Math.round(size * (0.35 + R() * 0.6)), mtime: t - int(0, 30) * DAY, locked: false, link: false, special: false });
  if (arc.kind === 'site') {
    add('index.html', int(3000, 9000));
    add('about.html', int(2000, 6000));
    for (const p of POSTS.slice(0, 14)) add(`posts/${p}.html`, int(4000, 20000));
    for (let i = 1; i <= 40; i++) add(`img/photo-${pad(i)}.jpg`, int(80e3, 900e3));
    add('css/site.css', int(4000, 12000));
    add('js/menu.js', int(800, 3000));
  } else if (arc.kind === 'fonts') {
    for (const fam of ['Harbor Grotesk', 'Tide Mono', 'Lantern Serif', 'Quay Sans']) {
      for (const w of ['Light', 'Regular', 'Medium', 'Bold']) add(`${fam}/${fam.replace(/\s/g, '')}-${w}.otf`, int(60e3, 260e3));
      add(`${fam}/OFL.txt`, 4400);
    }
    add('README.txt', 900);
  } else if (arc.kind === 'build') {
    add('Orbit.exe', int(40e6, 90e6));
    add('Orbit.pck', int(200e6, 420e6));
    for (const d of ['libgcc_s_seh-1.dll', 'libstdc++-6.dll', 'libwinpthread-1.dll']) add(d, int(80e3, 2e6));
    add('README.txt', int(600, 2000));
    add(`changelog-${arc.v}.md`, int(1000, 6000));
  } else {
    for (const top of ['Documents', 'Pictures', 'Music', 'Projects']) {
      for (let i = 0; i < int(30, 80); i++) {
        add(`${top}/${pick(['2018', '2019', '2020'])}/${pick(['notes', 'scan', 'IMG', 'track', 'draft', 'backup'])}-${int(100, 999)}.${pick(['txt', 'jpg', 'mp3', 'pdf', 'md', 'zip'])}`, int(2e3, 40e6));
      }
    }
  }
  return out;
}

/**
 * The service's GET /api/inside answer for an archive in the world:
 * scanner-shaped records, parents before children, and the totals.
 */
export function insideOf(node) {
  const entries = entriesOf(node);
  if (!entries) return null;
  const root = { id: 0, pid: -1, name: node.name, mtime: 0, files: [], sub: new Map() };
  const order = [root];
  let files = 0;
  let unpacked = 0;
  let packed = 0;
  for (const e of entries) {
    const segs = e.name.split('/');
    let at = root;
    for (const s of segs.slice(0, -1)) {
      let next = at.sub.get(s);
      if (!next) {
        next = { id: order.length, pid: at.id, name: s, mtime: 0, files: [], sub: new Map() };
        at.sub.set(s, next);
        order.push(next);
      }
      if (e.mtime > next.mtime) next.mtime = e.mtime;
      at = next;
    }
    const leaf = segs[segs.length - 1];
    at.files.push(leaf, e.size, e.mtime, leaf.startsWith('.') ? FLAG_HIDDEN : 0);
    files++;
    unpacked += e.size;
    packed += e.packed;
  }
  return {
    format: 'zip', name: node.name, size: node.size, mtime: node.mtime, declared: entries.length, read: entries.length,
    files, folders: order.length - 1, unpacked, packed, locked: 0, links: 0, escapes: 0, escaped: [], renamed: 0,
    partial: null, ms: 3, records: order.map((d) => [d.id, d.pid, d.name, d.mtime, 0, d.files]),
  };
}
