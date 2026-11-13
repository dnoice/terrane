#!/usr/bin/env node
/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Interface Check (Terrane Edition - v1.0)
 *     - File Name: ui-check.mjs
 *     - Relative Path: tools/ui-check.mjs
 *     - Artifact Type: test
 *     - Version: 1.0.0
 *     - Date: 11/11/2026
 *     - Update: Wednesday, November 11, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Description:
 *     Drives the real Terrane page in a headless Edge or Chrome over the
 *     DevTools protocol and checks what a person can do with the keyboard:
 *     the ledger, the inspector, search, lenses, dialogs and changes on
 *     disk. Scenarios run twice by default, once with WebGL and once with
 *     WebGL disabled, and the WebGL pass measures draw calls in fixed
 *     states so later work can prove it adds none.
 *
 * ✒ Key Features:
 *     - Zero dependencies: the browser is driven through Node's built-in
 *       WebSocket; no Puppeteer, no Playwright
 *     - Per-feature scenario files in tools/ui-scenarios/, each a module
 *       whose default export is one scenario or a list of them
 *     - Keyboard-only steps: real key events (Tab, Enter, Escape, arrows,
 *       letters, punctuation, Ctrl and Shift chords) through the browser's
 *       input pipeline, so focus order and default actions are exercised
 *     - Two passes: WebGL on, then the browser started with 3D APIs off,
 *       where the ledger and inspector must carry every route
 *     - Draw-call baseline: renderer.info.render.calls in four fixed states
 *       (overview, a selection, a search, duplicate ties), compared with
 *       tools/ui-scenarios/baseline.json (more calls than recorded fails)
 *       and offered to every scenario as t.baseline
 *     - Data: a fresh fixture from tools/make-fixture.mjs in the OS temp
 *       folder (default), an existing fixture, or a structure snapshot;
 *       the fixture's manifest gives scenarios exact paths and times
 *     - Scenarios that change files each get their own fresh fixture and a
 *       writable service; everything else runs against a read-only one
 *     - Network log, page errors and screenshots per scenario; uncaught
 *       page errors fail the scenario
 *     - Starts and stops every process it uses and removes its temp data
 *
 * ✒ Usage Instructions:
 *     node tools/ui-check.mjs [scenario...] [options]
 *     npm run ui-check
 *     A scenario module looks like this:
 *         export default {
 *           name: 'time', title: 'Date scrub', data: 'fixture',
 *           async run(t) {
 *             await t.tabTo('#view');
 *             await t.key('T');
 *             await t.waitFor((T) => T.S.time);
 *             t.check('the date shows', /\d\d\/\d\d\/\d{4}/.test(await t.text('#time-val')));
 *           },
 *         };
 *     Fields: name, title, data ('any' or 'fixture'), write (true for a
 *     writable service on a fresh fixture), passes (['webgl', 'nogl']),
 *     timeout (ms). The context t offers: pass, gl, data, manifest, root,
 *     abs(rel), baseline, recorded, check, skip, note, key, keys, type,
 *     tabTo, focused, eval, app, waitFor, until, poll, settle, text,
 *     live, notices, mark, requests, shot, drawCalls, sleep, url.
 *     t.app(fn) and t.waitFor(fn) call fn(window.__terrane) in the page,
 *     so fn must be self-contained and return plain JSON values.
 *
 * ✒ Examples:
 *     node tools/ui-check.mjs
 *     node tools/ui-check.mjs core --pass webgl
 *     node tools/ui-check.mjs --snapshot "%LOCALAPPDATA%\terrane\datasets\projects"
 *     node tools/ui-check.mjs --fixture C:\temp\terrane-fixture core
 *     node tools/ui-check.mjs --record-baseline --by "dendogg"
 *     node tools/ui-check.mjs --list
 *
 * ✒ Command-Line Arguments:
 *     Input:
 *         [scenario...]          Names or file names to run (default all).
 *         --snapshot <dataset>   Serve a structure snapshot (read-only).
 *         --fixture <dir>        Reuse a fixture made by make-fixture.mjs.
 *         --files <n>            Random files in a new fixture (3000).
 *         --seed <n>             Seed of a new fixture (7).
 *     Processing:
 *         --pass <webgl|nogl>    Run one pass only (default both).
 *         --browser <path>       Edge or Chrome executable (or set
 *                                TERRANE_BROWSER).
 *         --software             SwiftShader instead of the GPU.
 *         --headed               Show the browser window.
 *         --port <n>             First port to serve on (4710); write
 *                                scenarios use the next one, the browser's
 *                                DevTools endpoint the ninth after it.
 *     Output:
 *         --shots <dir>          Where screenshots go (a new folder under
 *                                the OS temp folder by default).
 *         --no-shots             Take no screenshots.
 *         --record-baseline      Write the measured draw calls to
 *                                tools/ui-scenarios/baseline.json.
 *         --by <tag>             Changelog tag for that recording
 *                                (default dendogg).
 *         --keep                 Keep the temp fixtures.
 *         --list                 List the scenarios and stop.
 *
 * ✒ Other Important Information:
 *     - Dependencies: Node.js 22.5+ (global WebSocket); Microsoft Edge or
 *       Google Chrome; server/terrane.mjs, tools/make-fixture.mjs
 *     - Compatible platforms: Windows, macOS, Linux
 *     - Safety: the services it starts are read-only, except for scenarios
 *       marked write, which get a throwaway fixture of their own
 *     - Exit code 0 means every check passed
 * ----------------------------------------------------------------------------
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { makeFixture, readManifest, unseal } from './make-fixture.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SERVER = path.join(HERE, '..', 'server', 'terrane.mjs');
const SCENARIO_DIR = path.join(HERE, 'ui-scenarios');
const BASELINE_FILE = path.join(SCENARIO_DIR, 'baseline.json');
const VIEWPORT = { width: 1600, height: 1000 };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------- arguments ---------- */

const argv = process.argv.slice(2);
const VALUED = new Set(['--snapshot', '--fixture', '--files', '--seed', '--pass', '--browser', '--port', '--shots', '--by']);
const opt = {};
const names = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (VALUED.has(a)) opt[a.slice(2)] = argv[++i];
  else if (a.startsWith('--')) opt[a.slice(2)] = true;
  else names.push(a);
}
const PORT = Number(opt.port || 4710);
const FILES = Number(opt.files || 3000);
const SEED = Number(opt.seed || 7);
const PASSES = opt.pass ? [opt.pass === 'no-webgl' ? 'nogl' : opt.pass] : ['webgl', 'nogl'];
if (PASSES.some((p) => p !== 'webgl' && p !== 'nogl')) {
  console.error('  --pass takes webgl or nogl.');
  process.exit(2);
}

/* ---------- results ---------- */

let passed = 0;
let failed = 0;
let skipped = 0;
const failures = [];
const print = (s) => console.log(s);

/* ---------- processes ---------- */

const cleanups = [];
async function cleanup() {
  while (cleanups.length) {
    try {
      await cleanups.pop()();
    } catch { /* best effort */ }
  }
}
process.on('SIGINT', () => cleanup().then(() => process.exit(130)));

function removeDir(dir) {
  // A fixture's unreadable folder (POSIX) must be opened again to be removed.
  unseal(dir);
  try {
    for (const d of fs.readdirSync(dir)) unseal(path.join(dir, d));
  } catch { /* not a folder of fixtures */ }
  try {
    fs.rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  } catch (err) {
    print(`  note  could not remove ${dir}: ${err.message}`);
  }
}

async function startService(args, port) {
  const child = spawn(process.execPath, [SERVER, ...args, '--no-open', '--port', String(port)], { stdio: ['ignore', 'pipe', 'pipe'] });
  let out = '';
  const actual = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`The service did not start: ${out.trim()}`)), 30000);
    const take = (c) => {
      out += c;
      const m = out.match(/127\.0\.0\.1:(\d+)/);
      if (m) {
        clearTimeout(timer);
        resolve(Number(m[1]));
      }
    };
    child.stdout.on('data', take);
    child.stderr.on('data', (c) => { out += c; });
    child.once('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`The service exited (${code}): ${out.trim()}`));
    });
  });
  const stop = () => new Promise((resolve) => {
    if (child.exitCode !== null || child.signalCode) return resolve();
    child.once('exit', resolve);
    child.kill();
    return undefined;
  });
  cleanups.push(stop);
  return { port: actual, url: `http://127.0.0.1:${actual}/`, stop };
}

function findBrowser() {
  const given = opt.browser || process.env.TERRANE_BROWSER;
  if (given) return fs.existsSync(given) ? given : null;
  const env = process.env;
  const candidates = process.platform === 'win32' ? [
    path.join(env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    path.join(env.ProgramFiles || 'C:\\Program Files', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    path.join(env.ProgramFiles || 'C:\\Program Files', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(env.LOCALAPPDATA || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
  ] : process.platform === 'darwin' ? [
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ] : (env.PATH || '').split(':').flatMap((d) => ['microsoft-edge', 'microsoft-edge-stable', 'google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser'].map((n) => path.join(d, n)));
  return candidates.find((c) => c && fs.existsSync(c)) || null;
}

/* ---------- DevTools protocol ---------- */

class CDP {
  static async connect(url) {
    const ws = new WebSocket(url);
    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = () => reject(new Error(`Could not connect to ${url}`));
    });
    return new CDP(ws);
  }

  constructor(ws) {
    this.ws = ws;
    this.seq = 0;
    this.pending = new Map();
    this.listeners = new Set();
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.id && this.pending.has(msg.id)) {
        const p = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        clearTimeout(p.timer);
        if (msg.error) p.reject(new Error(`${p.method}: ${msg.error.message}`));
        else p.resolve(msg.result);
      } else if (msg.method) for (const fn of this.listeners) fn(msg);
    };
    ws.onclose = () => {
      for (const p of this.pending.values()) p.reject(new Error('The browser closed the connection.'));
      this.pending.clear();
    };
  }

  send(method, params = {}, sessionId, ms = 60000) {
    const id = ++this.seq;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`${method} got no answer in ${ms} ms`));
      }, ms);
      this.pending.set(id, { resolve, reject, timer, method });
      try {
        this.ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
      } catch (err) {
        clearTimeout(timer);
        this.pending.delete(id);
        reject(err);
      }
    });
  }

  on(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
}

/**
 * The browser's DevTools WebSocket address, from whichever answers first:
 * the "DevTools listening on" line on stderr, the profile's
 * DevToolsActivePort file, or /json/version on the debugging port. Edge
 * 157.0.4341.46 can relaunch itself in a separate process and let the
 * launcher exit with 0 at once; the relaunched browser writes neither the
 * stderr line nor the file, but it does answer on the port it was given.
 */
async function devToolsEndpoint(profile, port, child, stderr) {
  const file = path.join(profile, 'DevToolsActivePort');
  const until = Date.now() + 20000;
  for (;;) {
    const m = stderr().match(/DevTools listening on (ws:\/\/\S+)/);
    if (m) return m[1];
    try {
      const [p, route] = fs.readFileSync(file, 'utf8').split(/\r?\n/);
      if (Number(p) > 0 && route) return `ws://127.0.0.1:${Number(p)}${route}`;
    } catch { /* not written yet */ }
    try {
      const r = await fetch(`http://127.0.0.1:${port}/json/version`, { signal: AbortSignal.timeout(500) });
      const url = r.ok ? (await r.json()).webSocketDebuggerUrl : null;
      if (url) return url;
    } catch { /* not listening yet */ }
    if (child.exitCode !== null && child.exitCode !== 0) {
      throw new Error(`The browser exited (${child.exitCode}): ${stderr().trim().slice(-400)}`);
    }
    if (Date.now() > until) throw new Error(`The browser did not open its DevTools endpoint: ${stderr().trim().slice(-400)}`);
    await wait(100);
  }
}

async function launchBrowser(exe, pass) {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'terrane-ui-profile-'));
  const flags = [
    ...(opt.headed ? [] : ['--headless=new']),
    `--remote-debugging-port=${PORT + 9}`, `--user-data-dir=${profile}`,
    '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--disable-sync',
    '--disable-background-networking', '--disable-component-update', '--disable-default-apps',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows',
    '--no-pings', '--mute-audio', '--hide-scrollbars', '--force-color-profile=srgb',
    // Edge otherwise relaunches itself through its compatibility layer and
    // the process started here exits at once; Chrome ignores the flag.
    '--edge-skip-compat-layer-relaunch',
    `--window-size=${VIEWPORT.width},${VIEWPORT.height}`,
    ...(pass === 'nogl' ? ['--disable-3d-apis'] : opt.software ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : []),
    'about:blank',
  ];
  const child = spawn(exe, flags, { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = '';
  child.stderr.on('data', (c) => { err += c; });
  const wsUrl = await devToolsEndpoint(profile, PORT + 9, child, () => err);
  const cdp = await CDP.connect(wsUrl);
  const version = await cdp.send('Browser.getVersion');
  // The browser's own process id, for the case where the launcher handed it
  // off and exited: then killing the child would stop nothing.
  const browserPid = await cdp.send('SystemInfo.getProcessInfo', {}, undefined, 5000)
    .then((r) => r.processInfo?.find((p) => p.type === 'browser')?.id).catch(() => undefined);
  let closed = false;
  const close = async () => {
    if (closed) return;
    closed = true;
    let asked = false;
    try {
      await cdp.send('Browser.close', {}, undefined, 5000);
      asked = true;
    } catch { /* already gone, or not answering */ }
    if (child.exitCode === null && !child.signalCode) {
      await Promise.race([new Promise((r) => child.once('exit', r)), wait(5000)]);
      if (child.exitCode === null && !child.signalCode) child.kill();
    }
    if (!asked && browserPid) {
      try { process.kill(browserPid); } catch { /* already gone */ }
    }
    // A browser that was handed off still holds its profile for a moment.
    for (let i = 0; i < 20 && fs.existsSync(profile); i++) {
      removeDir(profile);
      if (fs.existsSync(profile)) await wait(150);
    }
  };
  cleanups.push(close);
  return { cdp, version, close };
}

class Page {
  static async open(cdp, url) {
    const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
    const page = new Page(cdp, targetId, sessionId);
    for (const d of ['Page', 'Runtime', 'Network', 'Log']) await page.send(`${d}.enable`);
    await page.send('Emulation.setDeviceMetricsOverride', { ...VIEWPORT, deviceScaleFactor: 1, mobile: false });
    await page.send('Emulation.setFocusEmulationEnabled', { enabled: true });
    await page.send('Page.navigate', { url });
    return page;
  }

  constructor(cdp, targetId, sessionId) {
    this.cdp = cdp;
    this.targetId = targetId;
    this.sessionId = sessionId;
    this.errors = [];
    this.log = [];
    this.requests = [];
    const byId = new Map();
    this.off = cdp.on((msg) => {
      if (msg.sessionId !== sessionId) return;
      const p = msg.params;
      if (msg.method === 'Runtime.exceptionThrown') this.errors.push(p.exceptionDetails.exception?.description || p.exceptionDetails.text);
      else if (msg.method === 'Runtime.consoleAPICalled' && (p.type === 'error' || p.type === 'assert')) {
        this.errors.push(`console.${p.type}: ${p.args.map((a) => a.value ?? a.description ?? '').join(' ')}`);
      } else if (msg.method === 'Log.entryAdded') this.log.push(`${p.entry.level}: ${p.entry.text}`);
      else if (msg.method === 'Network.requestWillBeSent') {
        const r = { method: p.request.method, url: p.request.url, status: 0 };
        byId.set(p.requestId, r);
        this.requests.push(r);
      } else if (msg.method === 'Network.responseReceived' && byId.has(p.requestId)) byId.get(p.requestId).status = p.response.status;
    });
  }

  send(method, params = {}, ms) {
    return this.cdp.send(method, params, this.sessionId, ms);
  }

  async close() {
    this.off();
    try {
      await this.cdp.send('Target.closeTarget', { targetId: this.targetId }, undefined, 5000);
    } catch { /* gone */ }
  }
}

/* ---------- keys ---------- */

const MODS = { alt: 1, ctrl: 2, control: 2, meta: 4, cmd: 4, shift: 8 };
const NAMED = {
  Enter: [13, '\r'], Tab: [9], Escape: [27], Backspace: [8], Delete: [46], Insert: [45], Home: [36], End: [35],
  PageUp: [33], PageDown: [34], ArrowLeft: [37], ArrowUp: [38], ArrowRight: [39], ArrowDown: [40], ContextMenu: [93],
};
const PUNCT = {
  ' ': ['Space', 32], ',': ['Comma', 188], '<': ['Comma', 188, 1], '.': ['Period', 190], '>': ['Period', 190, 1],
  '/': ['Slash', 191], '?': ['Slash', 191, 1], ';': ['Semicolon', 186], ':': ['Semicolon', 186, 1], "'": ['Quote', 222],
  '"': ['Quote', 222, 1], '[': ['BracketLeft', 219], '{': ['BracketLeft', 219, 1], ']': ['BracketRight', 221],
  '}': ['BracketRight', 221, 1], '\\': ['Backslash', 220], '|': ['Backslash', 220, 1], '-': ['Minus', 189],
  '_': ['Minus', 189, 1], '=': ['Equal', 187], '+': ['Equal', 187, 1], '`': ['Backquote', 192], '~': ['Backquote', 192, 1],
};
')!@#$%^&*('.split('').forEach((c, d) => { PUNCT[c] = [`Digit${d}`, 48 + d, 1]; });
for (let d = 0; d <= 9; d++) PUNCT[String(d)] = [`Digit${d}`, 48 + d];

/** Turns 'Ctrl+Z', 'Shift+Tab', 'T', ',' or 'Space' into a key event description. */
function keyOf(spec) {
  let mods = 0;
  let rest = spec;
  for (let m = /^(ctrl|control|alt|shift|meta|cmd)\+(.+)$/i.exec(rest); m; m = /^(ctrl|control|alt|shift|meta|cmd)\+(.+)$/i.exec(rest)) {
    mods |= MODS[m[1].toLowerCase()];
    rest = m[2];
  }
  if (rest === 'Esc') rest = 'Escape';
  if (rest === 'Space') rest = ' ';
  const command = mods & 7;
  if (NAMED[rest]) {
    const [vk, text] = NAMED[rest];
    return { key: rest, code: rest, vk, text: command ? undefined : text, mods };
  }
  const f = /^F([1-9]|1[0-2])$/.exec(rest);
  if (f) return { key: rest, code: rest, vk: 111 + Number(f[1]), mods };
  if (/^[a-z]$/i.test(rest)) {
    if (rest !== rest.toLowerCase()) mods |= 8;
    const key = mods & 8 ? rest.toUpperCase() : rest.toLowerCase();
    return { key, code: `Key${rest.toUpperCase()}`, vk: rest.toUpperCase().charCodeAt(0), text: command ? undefined : key, mods };
  }
  if (PUNCT[rest]) {
    const [code, vk, shifted] = PUNCT[rest];
    if (shifted) mods |= 8;
    return { key: rest, code, vk, text: command ? undefined : rest, mods };
  }
  if ([...rest].length === 1) return { insert: rest };
  throw new Error(`Unknown key: ${spec}`);
}

/* ---------- the scenario context ---------- */

const KEY_GAP = `new Promise((resolve) => {
  let done = false;
  const finish = () => { if (!done) { done = true; resolve(true); } };
  requestAnimationFrame(() => setTimeout(finish, 0));
  setTimeout(finish, 100);
})`;

const SETTLED = `(() => {
  const T = window.__terrane;
  if (!T || T.S.scanning || T.S.layoutTimer) return false;
  if (T.S.noGL) return true;
  const v = T.S.view;
  return !v.flight && !v.transition && !v.raf && !v.climbing && v.keys.size === 0;
})()`;

function context(page, env) {
  const { pass, prefix } = env;
  const t = {
    pass,
    gl: pass === 'webgl',
    data: env.data.kind,
    manifest: env.data.manifest,
    root: env.root,
    url: env.url,
    baseline: env.baseline,
    recorded: env.recorded,
    page,
    abs: (rel) => (env.root ? path.join(env.root, ...rel.split('/')) : null),

    check(name, cond, detail = '') {
      const ok = !!cond;
      if (ok) passed++;
      else {
        failed++;
        failures.push(`[${prefix}] ${name}`);
      }
      print(`${ok ? '  ok  ' : ' FAIL '} ${name}${ok || !detail ? '' : ` — ${detail}`}`);
      return ok;
    },
    skip(name, why) {
      skipped++;
      print(`  skip  ${name} — ${why}`);
    },
    note(text) {
      print(`  note  ${text}`);
    },
    sleep: wait,

    async eval(fn, ...args) {
      const expression = typeof fn === 'function' ? `(${fn})(...${JSON.stringify(args)})` : String(fn);
      const r = await page.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) throw new Error(`In the page: ${r.exceptionDetails.exception?.description?.split('\n')[0] || r.exceptionDetails.text}`);
      return r.result.value;
    },
    app(fn, ...args) {
      return t.eval(`((f, a) => f(window.__terrane, ...a))(${fn}, ${JSON.stringify(args)})`);
    },
    async until(fn, { timeout = 5000, interval = 40, args = [] } = {}) {
      const end = Date.now() + timeout;
      for (;;) {
        const v = await t.app(fn, ...args).catch(() => undefined);
        if (v) return v;
        if (Date.now() > end) return v;
        await wait(interval);
      }
    },
    async waitFor(fn, { timeout = 5000, interval = 40, args = [], what } = {}) {
      const v = await t.until(fn, { timeout, interval, args });
      if (!v) throw new Error(`Timed out after ${timeout} ms waiting for ${what || String(fn).replace(/\s+/g, ' ').slice(0, 140)}`);
      return v;
    },
    /** Polls a predicate that runs in Node, for example on the disk. */
    async poll(fn, { timeout = 5000, interval = 40 } = {}) {
      const end = Date.now() + timeout;
      for (;;) {
        const v = await fn();
        if (v || Date.now() > end) return v;
        await wait(interval);
      }
    },
    /** Waits until no flight, transition, frame or layout is pending for `quiet` ms. */
    async settle({ quiet = 350, timeout = 20000 } = {}) {
      const end = Date.now() + timeout;
      let since = 0;
      for (;;) {
        const ok = await t.eval(SETTLED).catch(() => false);
        if (!ok) since = 0;
        else if (!since) since = Date.now();
        else if (Date.now() - since >= quiet) return true;
        if (Date.now() > end) throw new Error(`The view did not settle within ${timeout} ms`);
        await wait(40);
      }
    },

    async key(spec) {
      const k = keyOf(spec);
      if (k.insert) return page.send('Input.insertText', { text: k.insert });
      const base = { key: k.key, code: k.code, windowsVirtualKeyCode: k.vk, nativeVirtualKeyCode: k.vk, modifiers: k.mods };
      await page.send('Input.dispatchKeyEvent', k.text ? { type: 'keyDown', ...base, text: k.text, unmodifiedText: k.text } : { type: 'rawKeyDown', ...base });
      await page.send('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
      // A person never presses two keys in the same instant. Waiting one
      // frame lets tasks the key queued (a dialog's close event, a
      // debounce) run before the next key, as they would for a person.
      await t.eval(KEY_GAP);
      return undefined;
    },
    async keys(...specs) {
      for (const s of specs.flat()) await t.key(s);
    },
    async type(text) {
      for (const ch of text) await t.key(ch === ' ' ? 'Space' : ch);
    },
    focused() {
      return t.eval(() => {
        const a = document.activeElement;
        if (!a || a === document.body) return 'body';
        const id = a.id ? `#${a.id}` : '';
        const tab = a.dataset?.tab ? `[data-tab=${a.dataset.tab}]` : '';
        const cls = !id && a.className && typeof a.className === 'string' ? `.${a.className.trim().split(/\s+/).join('.')}` : '';
        return `${a.tagName.toLowerCase()}${id}${tab}${cls}${a.textContent ? ` "${a.textContent.trim().slice(0, 30)}"` : ''}`;
      });
    },
    /** Presses Tab (or Shift+Tab) until the focused element matches the selector. */
    async tabTo(selector, { back = false, max = 80 } = {}) {
      for (let i = 0; i <= max; i++) {
        if (await t.eval((s) => !!document.activeElement?.matches?.(s), selector)) return true;
        await t.key(back ? 'Shift+Tab' : 'Tab');
      }
      throw new Error(`${back ? 'Shift+Tab' : 'Tab'} never reached ${selector}; focus ended on ${await t.focused()}`);
    },

    text(selector) {
      return t.eval((s) => document.querySelector(s)?.textContent ?? '', selector);
    },
    live() {
      return t.text('#live');
    },
    notices() {
      return t.eval(() => [...document.querySelectorAll('#notices .notice-text')].map((n) => n.textContent));
    },
    mark() {
      return page.requests.length;
    },
    requests(since = 0) {
      return page.requests.slice(since).map((r) => ({ ...r, path: new URL(r.url).pathname }));
    },

    async shot(name) {
      if (!env.shots) return null;
      const { data } = await page.send('Page.captureScreenshot', { format: 'png' });
      const file = path.join(env.shots, `${pass}-${env.scenario}-${String(++env.shotSeq).padStart(2, '0')}-${name.replace(/[^\w.-]+/g, '-')}.png`);
      fs.writeFileSync(file, Buffer.from(data, 'base64'));
      return file;
    },

    /** Renders one clean frame and returns renderer.info.render with a list of what was drawn. */
    async drawCalls() {
      if (!t.gl) return null;
      return t.app(async (T) => {
        const v = T.S.view;
        if (T.S.noGL) return null;
        const frame = () => new Promise((r) => requestAnimationFrame(() => r()));
        await frame();
        await frame();
        v.invalidate();
        await frame();
        const info = v.renderer.info.render;
        const drawn = [];
        // The same skips three.js makes: an instanced mesh with no
        // instances and a geometry with no vertices at all are not drawn,
        // but a geometry with an empty vertex buffer still costs a call.
        v.scene.traverseVisible((o) => {
          if (!(o.isMesh || o.isLine || o.isPoints || o.isSprite) || o.material?.visible === false) return;
          const g = o.geometry;
          if ((o.isInstancedMesh && !o.count) || (!g.index && !g.attributes.position)) return;
          const count = Math.min(g.drawRange.count, g.index ? g.index.count : g.attributes.position.count);
          drawn.push(`${o.type} ${o.material.type}${o.isInstancedMesh ? ` x${o.count}` : ''}${count ? '' : ' (empty)'}`);
        });
        return { calls: info.calls, triangles: info.triangles, lines: info.lines, points: info.points, drawn };
      });
    },
  };
  return t;
}

/* ---------- running ---------- */

async function openApp(browser, env) {
  const page = await Page.open(browser.cdp, env.url);
  const end = Date.now() + 120000;
  for (;;) {
    const r = await page.send('Runtime.evaluate', {
      expression: '(() => { const T = window.__terrane; if (T && !T.S.scanning) return "ready"; const v = document.getElementById("veil"); return v && !v.hidden ? v.textContent : ""; })()',
      returnByValue: true,
    }).catch(() => ({ result: { value: '' } }));
    if (r.result?.value === 'ready') break;
    if (/Not connected|survey stopped/i.test(r.result?.value || '')) throw new Error(`The page could not start: ${r.result.value}`);
    if (Date.now() > end) throw new Error(`The page did not finish its survey in 120 s (${r.result?.value || 'no message'})`);
    await wait(100);
  }
  await page.send('Runtime.evaluate', { expression: 'document.fonts.ready.then(() => true)', awaitPromise: true });
  return page;
}

async function runScenario(browser, scenario, env) {
  print(`\n[${env.prefix}] ${scenario.title || scenario.name}`);
  let page;
  try {
    page = await openApp(browser, env);
    const t = context(page, env);
    await Promise.race([
      scenario.run(t),
      wait(scenario.timeout || 180000).then(() => { throw new Error(`Timed out after ${scenario.timeout || 180000} ms`); }),
    ]);
  } catch (err) {
    failed++;
    failures.push(`[${env.prefix}] stopped: ${err.message}`);
    print(` FAIL  the scenario stopped — ${err.message}`);
  }
  if (page) {
    // Without WebGL, three.js reports the context it could not create.
    const errs = page.errors.filter((e) => !(env.pass === 'nogl' && /WebGL context|creating WebGL/.test(e)));
    const ok = errs.length === 0;
    if (ok) passed++;
    else {
      failed++;
      failures.push(`[${env.prefix}] errors in the page`);
    }
    print(`${ok ? '  ok  ' : ' FAIL '} no uncaught errors or console errors in the page${ok ? '' : ` — ${errs.slice(0, 3).join(' | ')}`}`);
    await page.close();
  }
}

/* ---------- the draw-call baseline ---------- */

const STATES = [
  {
    name: 'overview', what: 'the home view after the survey, nothing selected, Kind lens',
    async enter() {},
  },
  {
    name: 'selected', what: 'the first item of the focus selected with ArrowDown on the canvas (selection frames)',
    async enter(t) {
      await t.tabTo('#view');
      await t.key('ArrowDown');
      await t.waitFor((T) => !!T.S.primary);
    },
  },
  {
    name: 'search', what: 'Find "copy-" with matches, nothing selected (search pins)', fixture: true,
    async enter(t) {
      await t.key('/');
      await t.type('copy-');
      await t.waitFor((T) => T.S.search?.list.length > 0);
    },
  },
  {
    name: 'dupTies', what: 'copy-a.dat revealed from Findings, Find cleared, Duplicates lens (garnet ties)', fixture: true,
    async enter(t) {
      await t.key('/');
      await t.type('copy-a.dat');
      await t.waitFor((T) => T.S.search?.list.length > 0);
      await t.keys('Enter', 'Enter');
      await t.waitFor((T) => T.S.primary?.n === 'copy-a.dat');
      await t.key('Escape');
      await t.waitFor((T) => !T.S.search);
      await t.key('4');
      await t.waitFor((T) => T.S.lens === 'dup');
    },
  },
];

const today = () => {
  const d = new Date();
  const p = (x) => String(x).padStart(2, '0');
  return {
    date: `${p(d.getMonth() + 1)}/${p(d.getDate())}/${d.getFullYear()}`,
    update: d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
  };
};

function readRecorded() {
  try {
    return JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8'));
  } catch {
    return null;
  }
}

function writeRecorded(prev, params, states) {
  const { date, update } = today();
  const by = opt.by || 'dendogg';
  const oldMeta = prev?._meta;
  let version = '1.0.0';
  if (oldMeta?.version) {
    const [major, minor] = oldMeta.version.split('.').map(Number);
    version = `${major}.${minor + 1}.0`;
  }
  const summary = Object.entries(states).map(([k, v]) => `${k} ${v.calls}`).join(', ');
  const entry = `${version} (${date}) [${by}] — ${oldMeta ? 'Re-recorded' : 'Initial recording'} with tools/ui-check.mjs --record-baseline: ${summary} draw calls.`;
  const ai = by.includes(' + ') ? by.split(' + ')[1] : oldMeta?.ai_acknowledgement || 'None';
  const doc = {
    _meta: {
      title: `Draw-Call Baseline (Terrane Edition - v${version.split('.').slice(0, 2).join('.')})`,
      file_name: 'baseline.json',
      relative_path: 'tools/ui-scenarios/baseline.json',
      artifact_type: 'data',
      version,
      date,
      update,
      author: "Dennis 'dendogg' Smaltz",
      ai_acknowledgement: ai,
      signature: '︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!',
      description: 'renderer.info.render.calls measured by tools/ui-check.mjs in four fixed states of the page. Features compare their own states against these numbers to show they add no draw call. Written by the tool; re-record only when a draw call is added on purpose.',
      changelog: [entry, ...(oldMeta?.changelog || [])],
      key_features: [
        'One entry per state: what the state is, the draw calls, and the list of objects drawn',
        'The parameters it was measured with: data, fixture size and seed, viewport',
        'Compared on every WebGL pass whose parameters match',
      ],
      dependencies: 'tools/ui-check.mjs writes and reads it',
    },
    recordedAt: new Date().toISOString(),
    params,
    states,
  };
  fs.writeFileSync(BASELINE_FILE, `${JSON.stringify(doc, null, 2)}\n`);
  return version;
}

async function measureBaseline(browser, env) {
  print(`\n[${env.prefix}] Draw-call baseline`);
  const states = {};
  for (const s of STATES) {
    if (s.fixture && !env.data.manifest) {
      skipped++;
      print(`  skip  ${s.name} — needs the fixture`);
      continue;
    }
    let page;
    try {
      page = await openApp(browser, env);
      const t = context(page, { ...env, scenario: 'baseline' });
      await s.enter(t);
      await t.settle();
      const m = await t.drawCalls();
      states[s.name] = { what: s.what, calls: m.calls, drawn: m.drawn };
      if (s.name === 'overview') await t.shot('overview');
    } catch (err) {
      failed++;
      failures.push(`[${env.prefix}] baseline ${s.name}: ${err.message}`);
      print(` FAIL  ${s.name} could not be measured — ${err.message}`);
    } finally {
      await page?.close();
    }
  }
  const params = { data: env.data.kind, files: env.data.files ?? null, seed: env.data.seed ?? null, viewport: `${VIEWPORT.width}x${VIEWPORT.height}` };
  const recorded = readRecorded();
  const comparable = recorded && JSON.stringify(recorded.params) === JSON.stringify(params);
  for (const [name, m] of Object.entries(states)) {
    const want = comparable ? recorded.states[name]?.calls : undefined;
    const detail = `${m.calls} now, ${want} recorded; drawn now: ${m.drawn.join(', ')}; recorded: ${(recorded?.states[name]?.drawn || []).join(', ')}`;
    if (opt['record-baseline'] || want === undefined) {
      passed++;
      print(`  ok   ${name}: ${m.calls} draw calls (${m.drawn.join(', ')})`);
    } else {
      // More calls than recorded is a regression; fewer is an improvement
      // that a new recording should lock in.
      const ok = m.calls <= want;
      if (ok) passed++;
      else {
        failed++;
        failures.push(`[${env.prefix}] baseline ${name}`);
      }
      print(`${ok ? '  ok  ' : ' FAIL '} ${name}: ${m.calls} draw calls, ${m.calls === want ? 'as recorded' : m.calls < want ? `${want - m.calls} fewer than recorded` : `recorded ${want}`}${ok ? '' : ` — ${detail}`}`);
      if (m.calls < want) print(`  note  ${name} needs fewer draw calls than recorded; run --record-baseline to keep the gain`);
    }
  }
  if (opt['record-baseline'] && Object.keys(states).length === STATES.length) {
    const v = writeRecorded(recorded, params, states);
    print(`  note  recorded as ${path.relative(process.cwd(), BASELINE_FILE)} ${v}`);
  } else if (opt['record-baseline']) print('  note  nothing recorded: a baseline needs every state, so run it on the fixture');
  else if (!recorded) print('  note  no recorded baseline yet: run with --record-baseline');
  else if (!comparable) print(`  note  recorded with ${JSON.stringify(recorded.params)}; this run is not comparable`);
  return { states, recorded: comparable ? recorded.states : null };
}

/* ---------- main ---------- */

async function loadScenarios() {
  const files = fs.existsSync(SCENARIO_DIR) ? fs.readdirSync(SCENARIO_DIR).filter((f) => f.endsWith('.mjs')).sort() : [];
  const all = [];
  for (const f of files) {
    const mod = await import(pathToFileURL(path.join(SCENARIO_DIR, f)).href);
    for (const s of [mod.default].flat().filter(Boolean)) all.push({ data: 'any', write: false, passes: ['webgl', 'nogl'], ...s, file: f });
  }
  return all;
}

async function main() {
  const all = await loadScenarios();
  if (opt.list) {
    for (const s of all) print(`  ${s.name.padEnd(16)} ${s.file.padEnd(16)} ${s.data === 'fixture' ? 'fixture' : 'any data'}${s.write ? ', writes' : ''}, ${s.passes.join(' + ')}  ${s.title || ''}`);
    return 0;
  }
  const chosen = names.length ? all.filter((s) => names.includes(s.name) || names.includes(s.file) || names.includes(s.file.replace(/\.mjs$/, ''))) : all;
  if (!chosen.length) {
    console.error(`  No scenario matches ${names.join(', ')}. Use --list.`);
    return 2;
  }
  const exe = findBrowser();
  if (!exe) {
    console.error('  No Edge or Chrome found. Pass --browser <path> or set TERRANE_BROWSER.');
    return 2;
  }

  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'terrane-ui-'));
  cleanups.push(async () => (opt.keep ? print(`  note  kept ${work}`) : removeDir(work)));
  let shots = null;
  if (!opt['no-shots']) {
    shots = opt.shots ? path.resolve(opt.shots) : path.join(os.tmpdir(), 'terrane-ui-check', `shots-${new Date().toISOString().replace(/[:.]/g, '-')}`);
    fs.mkdirSync(shots, { recursive: true });
  }

  let data;
  if (opt.snapshot) {
    data = { kind: 'snapshot', args: ['--snapshot', path.resolve(opt.snapshot)], manifest: null, root: null };
  } else if (opt.fixture) {
    const root = path.resolve(opt.fixture);
    const manifest = readManifest(root);
    if (!manifest) throw new Error(`${root} has no fixture manifest; make one with tools/make-fixture.mjs`);
    data = { kind: 'fixture', args: [root, '--read-only'], manifest, root, files: manifest.requestedFiles, seed: manifest.seed };
  } else {
    const root = path.join(work, 'fixture');
    const t0 = Date.now();
    const manifest = await makeFixture(root, { files: FILES, seed: SEED });
    data = { kind: 'fixture', args: [root, '--read-only'], manifest, root, files: FILES, seed: SEED, madeIn: Date.now() - t0 };
  }

  const service = await startService(data.args, PORT);
  print('\nTerrane interface check');
  print(`  Browser   : ${exe}`);
  print(`  Data      : ${data.kind === 'snapshot' ? `snapshot ${opt.snapshot}` : `fixture, ${data.manifest.files.toLocaleString('en-US')} files, seed ${data.seed} (${data.root}${data.madeIn ? `, made in ${(data.madeIn / 1000).toFixed(1)} s` : ''})`}`);
  print(`  Service   : ${service.url} (read-only)`);
  print(`  Passes    : ${PASSES.join(', ')}`);
  print(`  Shots     : ${shots || 'off'}`);

  for (const pass of PASSES) {
    const browser = await launchBrowser(exe, pass);
    const probe = await Page.open(browser.cdp, 'about:blank');
    const gl = await probe.send('Runtime.evaluate', {
      expression: '(() => { const g = document.createElement("canvas").getContext("webgl2"); if (!g) return "no WebGL2"; const d = g.getExtension("WEBGL_debug_renderer_info"); return g.getParameter(d ? d.UNMASKED_RENDERER_WEBGL : g.RENDERER); })()',
      returnByValue: true,
    });
    await probe.close();
    print(`\n=== Pass: ${pass === 'webgl' ? 'WebGL' : 'WebGL disabled'} — ${browser.version.product}, ${gl.result.value}`);
    if ((pass === 'webgl') === (gl.result.value === 'no WebGL2')) {
      failed++;
      failures.push(`[${pass}] the browser did not ${pass === 'webgl' ? 'provide' : 'withhold'} WebGL`);
      print(` FAIL  the browser did not ${pass === 'webgl' ? 'provide' : 'withhold'} WebGL2`);
      await browser.close();
      continue;
    }
    const env = { pass, data, root: data.root, url: service.url, shots, shotSeq: 0, baseline: null, recorded: null, prefix: pass };
    if (pass === 'webgl') {
      const b = await measureBaseline(browser, { ...env, prefix: `${pass} baseline` });
      env.baseline = b.states;
      env.recorded = b.recorded;
    }
    for (const s of chosen) {
      const prefix = `${pass} ${s.name}`;
      if (!s.passes.includes(pass)) continue;
      if (s.data === 'fixture' && data.kind !== 'fixture') {
        skipped++;
        print(`\n[${prefix}] ${s.title || s.name}\n  skip  needs the fixture`);
        continue;
      }
      if (s.write) {
        if (data.kind !== 'fixture') {
          skipped++;
          print(`\n[${prefix}] ${s.title || s.name}\n  skip  changes files, so it needs a fixture`);
          continue;
        }
        const root = path.join(work, `write-${pass}-${s.name}`);
        const manifest = await makeFixture(root, { files: data.files || FILES, seed: data.seed || SEED });
        const svc = await startService([root], PORT + 1);
        await runScenario(browser, s, { ...env, scenario: s.name, prefix, root, url: svc.url, data: { ...data, manifest, root } });
        await svc.stop();
        removeDir(root);
      } else await runScenario(browser, s, { ...env, scenario: s.name, prefix });
    }
    await browser.close();
  }
  return failed ? 1 : 0;
}

let code = 1;
try {
  code = await main();
} catch (err) {
  console.error(`\n  ui-check stopped: ${err.stack || err.message}`);
  failed++;
}
await cleanup();
if (passed || failed) {
  if (failures.length) print(`\nFailed:\n${failures.map((f) => `  - ${f}`).join('\n')}`);
  print(`\n${passed} passed, ${failed} failed${skipped ? `, ${skipped} skipped` : ''}\n`);
}
process.exit(failed ? 1 : code);
