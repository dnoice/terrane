#!/usr/bin/env node
/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Fixture Generator (Terrane Edition - v1.2)
 *     - File Name: make-fixture.mjs
 *     - Relative Path: tools/make-fixture.mjs
 *     - Artifact Type: CLI
 *     - Version: 1.2.0
 *     - Date: 11/11/2026
 *     - Update: Wednesday, November 11, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Changelog:
 *     - 1.2.0 (11/11/2026) [dendogg + Anthropic - Claude Opus 5.5] — Shared
 *       fixture sets for the Stage 5 checks: every file and folder dated
 *       over ten years, a stamped working session across three branches,
 *       a 60-file bulk write, the strata-old and strata-live pair, a
 *       13-level folder chain, and hand-built archives (a stored zip that
 *       mirrors a loose folder, an encrypted entry, a ../ escape, ZIP64, a
 *       truncated zip, 7z magic). Writes a manifest into the marker file
 *       and exports makeFixture() and readManifest() for test tools.
 *       Files of 1 MB and over are marked sparse on Windows, where
 *       extending a file otherwise allocates its full size on disk.
 *     - 1.0.0 (11/09/2026) [dendogg + Anthropic - Claude Fable 5.2] —
 *       Initial release.
 *
 * ✒ Description:
 *     Builds a synthetic directory tree for testing Terrane at scale and
 *     for exercising write operations somewhere that does not matter. The
 *     output is test data and is labelled as such by a marker file at its
 *     root; it is never a stand-in for a real directory. The marker also
 *     carries a JSON manifest naming every deliberate set, so test tools
 *     can assert against exact paths, times and archive contents.
 *
 * ✒ Key Features:
 *     - Deterministic structure: the same seed produces the same tree;
 *       times are relative to the moment of generation
 *     - Skewed sizes (many small files, a few very large) and skewed
 *       fan-out, like real project folders
 *     - Sparse files, so a tree that reports many gigabytes uses almost no
 *       disk (on Windows through fsutil, for files of 1 MB and over)
 *     - Every file and folder dated: random files from 12 hours to ten
 *       years old, folders at their newest direct file, and the last 12
 *       hours reserved for the deliberate sets below
 *     - A working session: 12 files written in three runs across three
 *       distant branches 40 to 12 minutes before generation, plus one file
 *       under a hidden folder inside the same window
 *     - A bulk write: 60 files in one folder within one second, 5 h earlier
 *     - Strata pair: strata-old (a 64 MB file from 01/01/2019 plus a 1 KB
 *       file) and strata-live (a 64 MB file), with the same newest change
 *     - A 13-level folder chain, depth-01 to depth-13, with a 512 MB file
 *       and a small session at the bottom and a copy of site.zip in
 *       depth-12
 *     - Archives, written byte by byte: site.zip (stored, UTF-8 names)
 *       mirroring the loose folder archives/site, hazards.zip (one
 *       ZipCrypto entry, one ../ name), zip64.zip (ZIP64 records),
 *       truncated.zip and packed.7z
 *     - Edge cases: empty folders (one recent, one old), true duplicates,
 *       same-size non-duplicates, a symbolic link, a link loop, hidden
 *       entries, an unreadable folder, and unusual names (spaces, Unicode,
 *       emoji, quotes, leading dashes, a 200-character name)
 *
 * ✒ Usage Instructions:
 *     node tools/make-fixture.mjs <target-dir> [files] [seed]
 *     The target must not exist yet; the tool refuses to write into an
 *     existing directory. From code:
 *         import { makeFixture, readManifest } from './make-fixture.mjs';
 *         const manifest = await makeFixture(dir, { files: 3000, seed: 7 });
 *
 * ✒ Examples:
 *     node tools/make-fixture.mjs /tmp/terrane-small 2000
 *     node tools/make-fixture.mjs /tmp/terrane-large 250000 7
 *     npm run fixture -- C:\temp\terrane-fixture 50000
 *     node tools/make-fixture.mjs C:\temp\fx 3000 7 --quiet
 *
 * ✒ Command-Line Arguments:
 *     Input:
 *         <target-dir>   Directory to create.
 *     Processing:
 *         [files]        Approximate random file count (default 5000).
 *         [seed]         Integer seed (default 1).
 *     Output:
 *         --quiet        Print only the final summary line.
 *
 * ✒ Other Important Information:
 *     - Dependencies: Node.js built-ins only; fsutil on Windows
 *     - Compatible platforms: Node.js 22.5+; symbolic links and the
 *       unreadable folder are skipped on Windows without privileges
 *     - Limitations: a volume that cannot hold sparse files (FAT32, exFAT)
 *       gets large files left empty, and the summary says how many
 *     - Manifest: TERRANE_TEST_DATA.txt, after the line "Manifest (JSON,
 *       for test tools):"; paths are root-relative with forward slashes,
 *       times are epoch milliseconds
 * ----------------------------------------------------------------------------
 */

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const MARKER = 'TERRANE_TEST_DATA.txt';
const MANIFEST_LINE = 'Manifest (JSON, for test tools):';
const MIN = 60000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const MIB = 1024 * 1024;
/** Files this large or larger are made sparse where the OS needs telling. */
const SPARSE_MIN = MIB;
/** Random files stay older than this, so the newest hours hold only the deliberate sets. */
const RESERVED = 12 * HOUR;
const TEN_YEARS = 3650 * DAY;

const WORDS = 'assets archive audio build cache client core data design docs drafts export fonts icons images lib logs media models notes plates raw render scripts server shared src stems tests textures tools vendor video'.split(' ');
const EXTS = 'js ts py md json css html svg png jpg psd wav flac mp3 mp4 mov zip pdf txt csv yml blend ttf bin log'.split(' ');

/* ---------- zip writing (stored entries only, no dependency) ---------- */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
const crcStep = (crc, byte) => (CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)) >>> 0;

/** Traditional PKWARE (ZipCrypto) encryption: 12-byte header, then the stream. */
function zipCrypto(plain, password, crc, header11) {
  let k0 = 0x12345678;
  let k1 = 0x23456789;
  let k2 = 0x34567890;
  const update = (b) => {
    k0 = crcStep(k0, b);
    k1 = (Math.imul((k1 + (k0 & 0xff)) >>> 0, 134775813) + 1) >>> 0;
    k2 = crcStep(k2, k1 >>> 24);
  };
  const stream = () => {
    const t = (k2 | 2) & 0xffff;
    return ((t * (t ^ 1)) >>> 8) & 0xff;
  };
  for (const ch of Buffer.from(password, 'utf8')) update(ch);
  const head = Buffer.concat([header11, Buffer.from([crc >>> 24])]);
  const out = Buffer.alloc(12 + plain.length);
  let o = 0;
  for (const src of [head, plain]) {
    for (const p of src) {
      out[o++] = p ^ stream();
      update(p);
    }
  }
  return out;
}

function dosStamp(ms) {
  const d = new Date(ms);
  const year = Math.max(1980, d.getFullYear());
  return {
    time: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1),
    date: ((year - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
  };
}

/**
 * Builds a zip archive with stored (uncompressed) entries.
 * entries: [{ name, data?: Buffer (absent for a folder), mtime, password? }]
 * zip64: write ZIP64 extra fields and end records even though nothing needs them.
 */
function buildZip(entries, { zip64 = false, random = () => 0.5 } = {}) {
  const parts = [];
  const central = [];
  let offset = 0;
  const FULL = 0xffffffff;
  for (const e of entries) {
    const name = Buffer.from(e.name, 'utf8');
    const folder = e.name.endsWith('/');
    const plain = e.data || Buffer.alloc(0);
    const crc = zlib.crc32(plain) >>> 0;
    let flags = /[^\x20-\x7e]/.test(e.name) ? 0x0800 : 0;
    let body = plain;
    if (e.password) {
      flags |= 0x0001;
      const head = Buffer.from(Array.from({ length: 11 }, () => Math.floor(random() * 256)));
      body = zipCrypto(plain, e.password, crc, head);
    }
    const { time, date } = dosStamp(e.mtime);
    const need = zip64 ? 45 : 20;
    const localExtra = zip64 ? Buffer.alloc(20) : Buffer.alloc(0);
    if (zip64) {
      localExtra.writeUInt16LE(0x0001, 0);
      localExtra.writeUInt16LE(16, 2);
      localExtra.writeBigUInt64LE(BigInt(plain.length), 4);
      localExtra.writeBigUInt64LE(BigInt(body.length), 12);
    }
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(need, 4);
    local.writeUInt16LE(flags, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(zip64 ? FULL : body.length, 18);
    local.writeUInt32LE(zip64 ? FULL : plain.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(localExtra.length, 28);
    parts.push(local, name, localExtra, body);

    const centralExtra = zip64 ? Buffer.alloc(28) : Buffer.alloc(0);
    if (zip64) {
      centralExtra.writeUInt16LE(0x0001, 0);
      centralExtra.writeUInt16LE(24, 2);
      centralExtra.writeBigUInt64LE(BigInt(plain.length), 4);
      centralExtra.writeBigUInt64LE(BigInt(body.length), 12);
      centralExtra.writeBigUInt64LE(BigInt(offset), 20);
    }
    const head = Buffer.alloc(46);
    head.writeUInt32LE(0x02014b50, 0);
    head.writeUInt16LE(need, 4);
    head.writeUInt16LE(need, 6);
    head.writeUInt16LE(flags, 8);
    head.writeUInt16LE(0, 10);
    head.writeUInt16LE(time, 12);
    head.writeUInt16LE(date, 14);
    head.writeUInt32LE(crc, 16);
    head.writeUInt32LE(zip64 ? FULL : body.length, 20);
    head.writeUInt32LE(zip64 ? FULL : plain.length, 24);
    head.writeUInt16LE(name.length, 28);
    head.writeUInt16LE(centralExtra.length, 30);
    head.writeUInt16LE(0, 32);
    head.writeUInt16LE(0, 34);
    head.writeUInt16LE(0, 36);
    head.writeUInt32LE(folder ? 0x10 : 0x20, 38);
    head.writeUInt32LE(zip64 ? FULL : offset, 42);
    central.push(head, name, centralExtra);
    offset += local.length + name.length + localExtra.length + body.length;
  }
  const cd = Buffer.concat(central);
  const tail = [];
  if (zip64) {
    const rec = Buffer.alloc(56);
    rec.writeUInt32LE(0x06064b50, 0);
    rec.writeBigUInt64LE(44n, 4);
    rec.writeUInt16LE(45, 12);
    rec.writeUInt16LE(45, 14);
    rec.writeUInt32LE(0, 16);
    rec.writeUInt32LE(0, 20);
    rec.writeBigUInt64LE(BigInt(entries.length), 24);
    rec.writeBigUInt64LE(BigInt(entries.length), 32);
    rec.writeBigUInt64LE(BigInt(cd.length), 40);
    rec.writeBigUInt64LE(BigInt(offset), 48);
    const loc = Buffer.alloc(20);
    loc.writeUInt32LE(0x07064b50, 0);
    loc.writeUInt32LE(0, 4);
    loc.writeBigUInt64LE(BigInt(offset + cd.length), 8);
    loc.writeUInt32LE(1, 16);
    tail.push(rec, loc);
  }
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(zip64 ? 0xffff : entries.length, 8);
  end.writeUInt16LE(zip64 ? 0xffff : entries.length, 10);
  end.writeUInt32LE(zip64 ? FULL : cd.length, 12);
  end.writeUInt32LE(zip64 ? FULL : offset, 16);
  return Buffer.concat([...parts, cd, ...tail, end]);
}

/* ---------- sparse files ---------- */

const run = (cmd, argv) => new Promise((resolve) => {
  execFile(cmd, argv, { windowsHide: true }, (err) => resolve(!err));
});

async function inParallel(items, limit, fn) {
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      await fn(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}

/* ---------- the fixture ---------- */

/**
 * Creates the fixture at `target` (which must not exist) and returns its
 * manifest. Options: files (random file count), seed, now (the moment every
 * relative time is measured from), log (progress lines).
 */
export async function makeFixture(target, { files: total = 5000, seed: seedArg = 1, now = Date.now(), log = () => {} } = {}) {
  const root = path.resolve(target);
  if (fs.existsSync(root)) throw new Error(`Refusing to write into an existing path: ${root}`);
  let seed = Number(seedArg) >>> 0;
  const rnd = () => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const rel = (abs) => path.relative(root, abs).split(path.sep).join('/');

  const dirs = [root];
  const newest = new Map();
  const big = [];
  let fileCount = 0;
  const mkdir = (abs) => {
    fs.mkdirSync(abs, { recursive: true });
    for (let d = abs; d.length > root.length && !dirs.includes(d); d = path.dirname(d)) dirs.push(d);
    return abs;
  };
  /** Writes one file: a Buffer or string body, or a size in bytes (sparse when large). */
  const put = (abs, body, mtime) => {
    if (typeof body === 'number' && body >= SPARSE_MIN) {
      fs.closeSync(fs.openSync(abs, 'w'));
      big.push([abs, body, mtime]);
    } else {
      const fd = fs.openSync(abs, 'w');
      if (typeof body === 'number') {
        if (body > 0) fs.ftruncateSync(fd, body);
      } else fs.writeSync(fd, typeof body === 'string' ? Buffer.from(body, 'utf8') : body);
      fs.futimesSync(fd, mtime / 1000, mtime / 1000);
      fs.closeSync(fd);
    }
    fileCount++;
    const dir = path.dirname(abs);
    if (!(newest.get(dir) >= mtime)) newest.set(dir, mtime);
    return rel(abs);
  };

  fs.mkdirSync(root, { recursive: true });

  // Random structure. The order of rnd() calls is that of 1.0.0, so a seed
  // still gives the same folders, names and sizes.
  const dirTarget = Math.max(8, Math.round(total / 14));
  while (dirs.length < dirTarget) {
    const parent = rnd() < 0.3 ? dirs[dirs.length - 1 - Math.floor(rnd() * Math.min(dirs.length, 30))] : pick(dirs);
    if (parent.split(path.sep).length - root.split(path.sep).length > 11) continue;
    const dir = path.join(parent, `${pick(WORDS)}-${dirs.length.toString(36)}`);
    fs.mkdirSync(dir);
    dirs.push(dir);
  }
  const randomDirs = dirs.slice();
  for (let i = 0; i < total; i++) {
    const dir = rnd() < 0.5 ? randomDirs[Math.floor(rnd() ** 2.2 * randomDirs.length)] : pick(randomDirs);
    const r = rnd();
    const size = r < 0.02 ? 0 : r > 0.9995 ? Math.floor(2e9 + rnd() * 6e9) : Math.floor(Math.exp(rnd() * 13 + rnd() * 6));
    const name = `${pick(WORDS)}_${i.toString(36)}.${pick(EXTS)}`;
    put(path.join(dir, name), size, now - RESERVED - rnd() ** 2 * (TEN_YEARS - RESERVED));
  }
  log(`Random tree: ${randomDirs.length} folders, ${total} files`);

  // Edge cases, dated about 400 days back, one second apart.
  const edge = mkdir(path.join(root, 'edge cases'));
  let edgeClock = now - 400 * DAY;
  const edgeTime = () => (edgeClock += 1000);
  for (const n of ['empty one', 'empty two', '.hidden-folder']) mkdir(path.join(edge, n));
  put(path.join(edge, '.hidden-file'), 'hidden\n', edgeTime());
  const body = Buffer.alloc(300000, 'terrane duplicate payload ');
  const duplicates = ['copy-a.dat', 'copy-b.dat', path.join('empty one', '..', 'copy-c.dat')].map((n) => put(path.join(edge, n), body, edgeTime()));
  put(path.join(edge, 'same-size-different.dat'), Buffer.alloc(300000, 'x'), edgeTime());
  for (const n of ['name with  spaces.txt', 'ünïcødé — naïve café.md', '日本語のファイル.txt', 'emoji 🗻 file.txt', "quote's \"name\".txt".replace(/"/g, process.platform === 'win32' ? '' : '"'), '-leading-dash.txt', 'x'.repeat(200) + '.txt', 'no_extension', 'archive.tar.gz']) {
    put(path.join(edge, n), `Test file: ${n}\n`, edgeTime());
  }
  const sealed = mkdir(path.join(edge, 'sealed'));
  put(path.join(sealed, 'secret.txt'), 'x', edgeTime());

  // Strata pair: the same newest change, very different bytes by age.
  const strataNow = now - 2 * HOUR;
  const strataOldDate = new Date(2019, 0, 1, 12, 0, 0).getTime();
  const strataOld = mkdir(path.join(edge, 'strata-old'));
  const strataLive = mkdir(path.join(edge, 'strata-live'));
  put(path.join(strataOld, 'archive-2019.bin'), 64 * MIB, strataOldDate);
  put(path.join(strataOld, 'touched.txt'), Buffer.alloc(1024, 'n'), strataNow);
  put(path.join(strataLive, 'live.bin'), 64 * MIB, strataNow);

  // The working session: three runs in three distant branches.
  const byTop = new Map();
  for (const d of randomDirs.slice(1)) {
    const parts = rel(d).split('/');
    if (parts.length < 2) continue;
    const best = byTop.get(parts[0]);
    if (!best || parts.length > rel(best).split('/').length) byTop.set(parts[0], d);
  }
  let tops = [...byTop.keys()].sort();
  let places;
  if (tops.length >= 3) {
    tops = [tops[0], tops[Math.floor(tops.length / 2)], tops[tops.length - 1]];
    places = tops.map((k) => byTop.get(k));
  } else {
    places = ['branch-a', 'branch-b', 'branch-c'].map((n) => mkdir(path.join(root, n, 'work')));
  }
  const sessionStart = now - 40 * MIN;
  const sessionFiles = [];
  const runs = [];
  const exts = ['md', 'js', 'css'];
  places.forEach((dir, b) => {
    const runFiles = [];
    for (let k = 0; k < 4; k++) {
      const j = b * 4 + k;
      const f = put(path.join(dir, `session-${'abc'[b]}${k + 1}.${exts[k % 3]}`), `Session file ${j + 1}\n`, sessionStart + j * 150000);
      sessionFiles.push(f);
      runFiles.push(f);
    }
    runs.push(runFiles);
  });
  const hiddenSession = put(path.join(mkdir(path.join(places[0], '.cache')), 'session-state.json'), '{"open":3}\n', sessionStart + 5 * MIN);

  // A bulk write: 60 files inside one second.
  const bulkDir = mkdir(path.join(root, 'bulk-write'));
  const bulkStart = now - 5 * HOUR;
  const bulkFiles = [];
  for (let i = 0; i < 60; i++) {
    bulkFiles.push(put(path.join(bulkDir, `part-${String(i + 1).padStart(3, '0')}.csv`), `id,value\n${i},${(i * 37) % 101}\n`, bulkStart + i * 15));
  }

  // Archives.
  const archDir = mkdir(path.join(root, 'archives'));
  const archTime = now - 30 * DAY;
  const siteFiles = [
    ['index.html', '<!doctype html><title>Site</title><p>Home</p>\n'],
    ['about.html', '<!doctype html><title>About</title><p>About this site.</p>\n'],
    ['README.md', '# Site\n\nA small static site used as archive test data.\n'],
    ['css/site.css', 'body { font: 16px/1.5 sans-serif; margin: 2rem; }\n'],
    ['js/app.js', "document.title += ' (loaded)';\n"],
    ['img/logo.svg', '<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8"/></svg>\n'],
    ['data/feed.json', '{"items":[1,2,3]}\n'],
    ['notes/café.md', 'Notes with a non-ASCII name.\n'],
  ];
  const siteDir = mkdir(path.join(archDir, 'site'));
  const zipEntries = [{ name: 'site/', mtime: archTime }];
  const seenFolders = new Set();
  siteFiles.forEach(([name, text], i) => {
    const t = archTime + i * MIN;
    const folder = name.includes('/') ? name.slice(0, name.lastIndexOf('/')) : '';
    if (folder && !seenFolders.has(folder)) {
      seenFolders.add(folder);
      zipEntries.push({ name: `site/${folder}/`, mtime: t });
    }
    put(path.join(mkdir(path.join(siteDir, ...folder.split('/').filter(Boolean))), path.basename(name)), text, t);
    zipEntries.push({ name: `site/${name}`, data: Buffer.from(text, 'utf8'), mtime: t });
  });
  const siteZip = buildZip(zipEntries);
  const listing = (entries) => entries.map((e) => ({ name: e.name, size: e.data ? e.data.length : 0, folder: e.name.endsWith('/') }));
  const sitePath = put(path.join(archDir, 'site.zip'), siteZip, archTime + HOUR);
  const hazardEntries = [
    { name: 'readme.txt', data: Buffer.from('This archive holds one encrypted entry and one entry that escapes.\n'), mtime: archTime },
    { name: 'secret.txt', data: Buffer.from('Encrypted with the password "terrane".\n'), mtime: archTime, password: 'terrane' },
    { name: '../escape.txt', data: Buffer.from('This name would land outside the folder if extracted.\n'), mtime: archTime },
  ];
  const hazardsPath = put(path.join(archDir, 'hazards.zip'), buildZip(hazardEntries, { random: rnd }), archTime + HOUR);
  const zip64Entries = [
    { name: 'zip64/', mtime: archTime },
    { name: 'zip64/a.txt', data: Buffer.from('ZIP64 records, small content.\n'), mtime: archTime },
    { name: 'zip64/b.txt', data: Buffer.from('Second entry.\n'), mtime: archTime },
  ];
  const zip64Path = put(path.join(archDir, 'zip64.zip'), buildZip(zip64Entries, { zip64: true }), archTime + HOUR);
  const truncatedPath = put(path.join(archDir, 'truncated.zip'), siteZip.subarray(0, Math.floor(siteZip.length * 0.6)), archTime + HOUR);
  const sevenPath = put(path.join(archDir, 'packed.7z'), Buffer.concat([Buffer.from([0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c, 0x00, 0x04]), Buffer.alloc(24)]), archTime + HOUR);

  // A 13-level chain: depth-01 at the root down to depth-13.
  const chainDirs = [];
  let at = root;
  for (let level = 1; level <= 13; level++) {
    at = mkdir(path.join(at, `depth-${String(level).padStart(2, '0')}`));
    chainDirs.push(at);
    put(path.join(at, `notes-${String(level).padStart(2, '0')}.txt`), `Level ${level} of the chain.\n`, now - 3 * 365 * DAY + level * MIN);
  }
  const deepest = chainDirs[12];
  put(path.join(deepest, 'bedrock.bin'), 512 * MIB, now - 3 * 365 * DAY);
  const chainSessionStart = now - 3 * DAY;
  const chainSession = [];
  for (let k = 0; k < 6; k++) chainSession.push(put(path.join(deepest, `deep-${k + 1}.txt`), `Deep session file ${k + 1}\n`, chainSessionStart + k * 4 * MIN));
  const hostPath = put(path.join(chainDirs[11], 'site-copy.zip'), siteZip, archTime + HOUR);

  // Large files: sparse where the OS needs telling, then sized and dated.
  let sparseFailed = 0;
  const win = process.platform === 'win32';
  await inParallel(big, win ? 16 : 1, async ([abs, size, mtime]) => {
    const ok = !win || await run('fsutil', ['sparse', 'setflag', abs]);
    const fd = fs.openSync(abs, 'r+');
    if (ok) fs.ftruncateSync(fd, size);
    else sparseFailed++;
    fs.futimesSync(fd, mtime / 1000, mtime / 1000);
    fs.closeSync(fd);
  });
  log(`Large files: ${big.length}${sparseFailed ? `, ${sparseFailed} left empty (no sparse support)` : ''}`);

  let linked = false;
  try {
    fs.symlinkSync(path.join(edge, 'copy-a.dat'), path.join(edge, 'link-to-copy-a'));
    fs.symlinkSync(edge, path.join(edge, 'link-loop'), 'dir');
    linked = true;
  } catch { /* links need privileges on Windows */ }

  const manifest = {
    format: 1,
    generator: 'tools/make-fixture.mjs 1.2.0',
    anchor: now,
    seed: Number(seedArg) >>> 0,
    requestedFiles: total,
    files: fileCount + 1,
    folders: dirs.length,
    sparse: { min: SPARSE_MIN, files: big.length, leftEmpty: sparseFailed },
    ages: { reservedMs: RESERVED, oldestMs: TEN_YEARS },
    session: {
      gapMs: 30 * MIN, start: sessionStart, end: sessionStart + 11 * 150000,
      places: places.map(rel), runs, files: sessionFiles, hidden: hiddenSession,
    },
    bulk: { dir: rel(bulkDir), start: bulkStart, end: bulkStart + 59 * 15, files: bulkFiles },
    strata: { old: rel(strataOld), live: rel(strataLive), newest: strataNow, oldDate: strataOldDate },
    emptyFolders: { recent: rel(path.join(edge, 'empty one')), old: rel(path.join(edge, 'empty two')), hidden: rel(path.join(edge, '.hidden-folder')) },
    chain: {
      dirs: chainDirs.map(rel), deepest: rel(deepest), host: hostPath,
      session: { start: chainSessionStart, end: chainSessionStart + 20 * MIN, files: chainSession },
    },
    archives: {
      mirror: rel(siteDir),
      site: { path: sitePath, format: 'zip', size: siteZip.length, entries: listing(zipEntries) },
      hazards: { path: hazardsPath, format: 'zip', locked: 1, escapes: 1, password: 'terrane', entries: listing(hazardEntries).map((e, i) => ({ ...e, locked: !!hazardEntries[i].password })) },
      zip64: { path: zip64Path, format: 'zip', entries: listing(zip64Entries) },
      truncated: { path: truncatedPath },
      sevenZip: { path: sevenPath, format: '7z' },
      notAnArchive: rel(path.join(edge, 'archive.tar.gz')),
    },
    duplicates,
    links: linked,
    sealed: false,
  };

  // The marker and its manifest, dated as the oldest file in the tree.
  const marker = path.join(root, MARKER);
  fs.writeFileSync(marker, `Synthetic test data generated by tools/make-fixture.mjs. Not a real directory.\n\n${MANIFEST_LINE}\n`);

  // Folders take the time of their newest direct file; empty ones are
  // dated at random, apart from the two deliberate empty folders.
  const fixed = new Map([[path.join(edge, 'empty one'), now - 3 * DAY], [path.join(edge, 'empty two'), now - 6 * 365 * DAY]]);
  const folderTime = (d) => fixed.get(d) ?? newest.get(d) ?? now - 30 * DAY - rnd() * (TEN_YEARS - 30 * DAY);
  const rootTime = now - TEN_YEARS;
  for (const d of dirs) {
    if (d === root) continue;
    const t = folderTime(d);
    fs.utimesSync(d, t / 1000, t / 1000);
  }
  try {
    fs.chmodSync(sealed, 0o000);
    manifest.sealed = process.platform !== 'win32';
  } catch { /* not supported */ }
  fs.appendFileSync(marker, `${JSON.stringify(manifest, null, 1)}\n`);
  fs.utimesSync(marker, rootTime / 1000, rootTime / 1000);
  fs.utimesSync(root, rootTime / 1000, rootTime / 1000);
  return manifest;
}

/** Reads the manifest written into a fixture's marker file, or null. */
export function readManifest(root) {
  try {
    const text = fs.readFileSync(path.join(root, MARKER), 'utf8');
    const at = text.indexOf(MANIFEST_LINE);
    return at < 0 ? null : JSON.parse(text.slice(at + MANIFEST_LINE.length));
  } catch {
    return null;
  }
}

/** Makes the unreadable folder readable again so the fixture can be removed. */
export function unseal(root) {
  try {
    fs.chmodSync(path.join(root, 'edge cases', 'sealed'), 0o755);
  } catch { /* absent */ }
}

const invoked = process.argv[1] && path.resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase();
if (invoked) {
  const args = process.argv.slice(2);
  const quiet = args.includes('--quiet');
  const [target, countArg = '5000', seedArg = '1'] = args.filter((a) => !a.startsWith('--'));
  if (!target) {
    console.error('Usage: node tools/make-fixture.mjs <target-dir> [files] [seed] [--quiet]');
    process.exit(1);
  }
  if (fs.existsSync(target)) {
    console.error(`Refusing to write into an existing path: ${target}`);
    process.exit(1);
  }
  const started = Date.now();
  const m = await makeFixture(target, { files: Number(countArg), seed: Number(seedArg), log: quiet ? () => {} : (s) => console.log(`  ${s}`) });
  const left = m.sparse.leftEmpty ? `; ${m.sparse.leftEmpty} large files could not be made sparse on this volume and were left empty` : '';
  console.log(`Created ${m.folders} folders and ${m.files} files in ${path.resolve(target)} in ${((Date.now() - started) / 1000).toFixed(1)} s${left}`);
}
