#!/usr/bin/env node
/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Vendor Fetcher (Terrane Edition - v1.2)
 *     - File Name: vendor.mjs
 *     - Relative Path: tools/vendor.mjs
 *     - Artifact Type: CLI
 *     - Version: 1.2.0
 *     - Date: 11/13/2026
 *     - Update: Friday, November 13, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Changelog:
 *     - 1.2.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] — The
 *       icon list holds only what the interface draws: command, compass,
 *       chevron-down, chevron-up, map, grip-vertical, circle-help,
 *       keyboard, hard-drive, radar, move, navigation-2, folder and file
 *       are gone (Move draws folder-input, the north arrow is drawn
 *       inline), and the sprite was written again from the same pinned
 *       Lucide (55 icons).
 *     - 1.1.0 (11/12/2026) [dendogg + Anthropic - Claude Opus 5.5] — The
 *       icon list gains calendar-clock, chevron-left and chevron-right for
 *       the As of stepper in the title block, and map-pinned, flag,
 *       bookmark and arrow-left-right for the Places tab, benchmarks and
 *       the return point.
 *     - 1.0.0 (11/12/2026) [dendogg + Anthropic - Claude Opus 5.5] —
 *       Initial release.
 *
 * ✒ Description:
 *     Fetches the pinned third-party browser libraries from the jsDelivr
 *     CDN once, at development time, and writes them into web/vendor/ with
 *     their licences and a manifest of SHA-256 digests. The page then loads
 *     them from its own origin: it keeps working offline, keeps its
 *     default-src 'self' policy, and never runs code fetched live from a
 *     third party while it holds a token that can move and remove files.
 *
 * ✒ Key Features:
 *     - Exact pins in one table; nothing resolves "latest"
 *     - Lucide icons reduced to the subset the interface uses, written as
 *       one sprite of <symbol> elements styled entirely from CSS
 *     - Floating UI's two browser modules, with the bare import between
 *       them rewritten to a relative path so no import map is needed
 *     - Motion's UMD build, loaded as a classic deferred script
 *     - web/vendor/manifest.json records source URL, size and SHA-256 of
 *       every written file; --check verifies them offline
 *     - Refuses to write a file whose download is empty or not what the
 *       package listing says
 *
 * ✒ Usage Instructions:
 *     Run after changing a pin or the icon list, then review the diff of
 *     web/vendor/ and commit it with the manifest.
 *
 * ✒ Examples:
 *     node tools/vendor.mjs            fetch every pinned item and rewrite
 *     node tools/vendor.mjs --check    verify web/vendor/ against the manifest
 *     node tools/vendor.mjs --icons    rebuild only the icon sprite
 *     npm run vendor
 *     npm run vendor -- --check
 *
 * ✒ Command-Line Arguments:
 *     Mode:
 *         --check     verify the files on disk against manifest.json; no
 *                     network access; exits 1 on any mismatch
 *         --icons     fetch and write only the Lucide sprite
 *
 * ✒ Other Important Information:
 *     - Dependencies: Node.js 22.5 or newer (global fetch, crypto); network
 *       access to cdn.jsdelivr.net and data.jsdelivr.com except with --check
 *     - Compatible platforms: Windows, macOS, Linux
 *     - Security: only the pinned versions below are ever fetched; the
 *       digests in the manifest let a reviewer see exactly what changed
 * ----------------------------------------------------------------------------
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const VENDOR = path.join(ROOT, 'web', 'vendor');
const CDN = 'https://cdn.jsdelivr.net/npm';
const MANIFEST = path.join(VENDOR, 'manifest.json');

/** Every icon the interface draws, by Lucide name. Add here, then rerun. */
export const ICONS = [
  // bar and navigation
  'corner-left-up', 'folder-plus', 'undo-2', 'refresh-cw', 'book-open', 'search', 'x',
  // view tools and the stage
  'zoom-in', 'zoom-out', 'rotate-ccw', 'rotate-cw', 'person-standing', 'locate-fixed', 'scan', 'panel-left',
  'panel-right', 'mountain', 'ruler',
  // operations
  'corner-down-right', 'square-arrow-out-up-right', 'folder-search', 'clipboard-copy', 'pencil-line', 'folder-input',
  'copy', 'copy-plus', 'trash-2', 'circle-stop',
  // state and notices
  'check', 'triangle-alert', 'info', 'loader-circle', 'eye', 'history',
  // ledger, lenses and inspector
  'list-tree', 'list-filter', 'scroll-text', 'shapes', 'ruler-dimension-line', 'layers',
  'arrow-down-wide-narrow', 'arrow-up-narrow-wide', 'folder-open', 'minus', 'plus',
  'sparkles', 'scale', 'binoculars',
  // the title block's As of stepper (time)
  'calendar-clock', 'chevron-left', 'chevron-right',
  // landmarks: the Places tab, benchmarks and the return point
  'map-pinned', 'flag', 'bookmark', 'arrow-left-right',
];

const PINS = [
  {
    name: 'lucide-static', version: '1.72.0', licence: 'ISC',
    dir: 'lucide', files: [{ from: 'LICENSE', to: 'LICENSE' }], sprite: 'icons.svg',
  },
  {
    name: '@floating-ui/core', version: '1.8.0', licence: 'MIT',
    dir: 'floating-ui', files: [{ from: 'dist/floating-ui.core.browser.min.mjs', to: 'floating-ui.core.browser.min.mjs' }, { from: 'LICENSE', to: 'LICENSE' }],
  },
  {
    name: '@floating-ui/dom', version: '1.8.0', licence: 'MIT',
    dir: 'floating-ui',
    files: [{
      from: 'dist/floating-ui.dom.browser.min.mjs', to: 'floating-ui.dom.browser.min.mjs',
      // The browser build imports its core by package name; the page has no
      // import map, so the specifier becomes the vendored sibling file.
      rewrite: (s) => s.replace(/from\s*["']@floating-ui\/core["']/g, 'from"./floating-ui.core.browser.min.mjs"'),
    }],
  },
  {
    name: 'motion', version: '14.12.0', licence: 'MIT',
    dir: 'motion', files: [{ from: 'dist/motion.js', to: 'motion.js' }, { from: 'LICENSE.md', to: 'LICENSE.md' }],
  },
];

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const rel = (abs) => path.relative(ROOT, abs).split(path.sep).join('/');

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  const text = await res.text();
  if (!text.trim()) throw new Error(`${url}: empty response`);
  return text;
}

async function listing(pin) {
  const url = `https://data.jsdelivr.com/v1/packages/npm/${pin.name}@${pin.version}?structure=flat`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return new Map((await res.json()).files.map((f) => [f.name.replace(/^\//, ''), f.size]));
}

/** One Lucide icon file to a <symbol>: its children, with the outer attributes left to CSS. */
function toSymbol(name, svg) {
  const inner = svg.replace(/<!--[\s\S]*?-->/g, '').match(/<svg[^>]*>([\s\S]*?)<\/svg>/);
  if (!inner) throw new Error(`icon ${name}: no <svg> element`);
  const body = inner[1].split('\n').map((l) => l.trim()).filter(Boolean).join('');
  return `  <symbol id="${name}" viewBox="0 0 24 24">${body}</symbol>`;
}

async function writeFile(abs, data, record, source) {
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, data);
  const buf = Buffer.from(data);
  record.push({ path: rel(abs), source, bytes: buf.length, sha256: sha256(buf) });
  console.log(`  ${rel(abs).padEnd(58)} ${String(buf.length).padStart(8)} B`);
}

async function vendorPin(pin, record) {
  const have = await listing(pin);
  for (const f of pin.files) {
    if (!have.has(f.from)) throw new Error(`${pin.name}@${pin.version} has no ${f.from}`);
    const url = `${CDN}/${pin.name}@${pin.version}/${f.from}`;
    let text = await fetchText(url);
    if (f.rewrite) {
      const before = text;
      text = f.rewrite(text);
      if (text === before) throw new Error(`${url}: the import rewrite matched nothing; check the build`);
    }
    await writeFile(path.join(VENDOR, pin.dir, f.to), text, record, url);
  }
  if (pin.sprite) {
    const have2 = new Set([...have.keys()].filter((k) => k.startsWith('icons/')).map((k) => k.slice(6, -4)));
    const missing = ICONS.filter((n) => !have2.has(n));
    if (missing.length) throw new Error(`lucide-static@${pin.version} lacks: ${missing.join(', ')}`);
    const symbols = [];
    for (const name of [...new Set(ICONS)].sort()) {
      symbols.push(toSymbol(name, await fetchText(`${CDN}/${pin.name}@${pin.version}/icons/${name}.svg`)));
    }
    const sprite = [
      '<svg xmlns="http://www.w3.org/2000/svg">',
      `  <!-- Lucide ${pin.version} (lucide-static), ISC licence: see LICENSE beside this file. -->`,
      '  <!-- Generated by tools/vendor.mjs from the icon list there; do not edit by hand. -->',
      ...symbols,
      '</svg>',
      '',
    ].join('\n');
    await writeFile(path.join(VENDOR, pin.dir, pin.sprite), sprite, record, `${CDN}/${pin.name}@${pin.version}/icons/*.svg (${symbols.length} icons)`);
  }
}

async function check() {
  const manifest = JSON.parse(await fs.readFile(MANIFEST, 'utf8'));
  let bad = 0;
  for (const item of manifest.items) {
    for (const f of item.files) {
      let ok = false;
      try {
        ok = sha256(await fs.readFile(path.join(ROOT, f.path))) === f.sha256;
      } catch { /* missing counts as a mismatch */ }
      if (!ok) bad++;
      console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${f.path}`);
    }
  }
  console.log(bad ? `\n${bad} vendored file(s) differ from the manifest.` : '\nEvery vendored file matches the manifest.');
  process.exit(bad ? 1 : 0);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--check')) return check();
  const only = args.includes('--icons') ? PINS.filter((p) => p.sprite) : PINS;
  let prev = { items: [] };
  try {
    prev = JSON.parse(await fs.readFile(MANIFEST, 'utf8'));
  } catch { /* first run */ }
  const items = new Map(prev.items.map((i) => [i.name, i]));
  for (const pin of only) {
    console.log(`${pin.name}@${pin.version}`);
    const record = [];
    await vendorPin(pin, record);
    items.set(pin.name, { name: pin.name, version: pin.version, licence: pin.licence, files: record });
  }
  const manifest = {
    _meta: {
      title: 'Vendored Files Manifest (Terrane Edition - v1.0)',
      file: 'web/vendor/manifest.json',
      artifactType: 'data',
      description: 'Written by tools/vendor.mjs: the source, size and SHA-256 of every vendored browser file. Verify with node tools/vendor.mjs --check.',
      author: "Dennis 'dendogg' Smaltz",
      aiAcknowledgement: 'Anthropic - Claude Opus 5.5',
      signature: '︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!',
    },
    items: [...items.values()].sort((a, b) => a.name.localeCompare(b.name)),
  };
  await fs.writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`\nWrote ${rel(MANIFEST)}.`);
}

main().catch((err) => {
  console.error(`vendor: ${err.message}`);
  process.exit(1);
});
