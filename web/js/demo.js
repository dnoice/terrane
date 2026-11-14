/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Demo Mode (Terrane Edition - v1.0)
 *     - File Name: demo.js
 *     - Relative Path: web/js/demo.js
 *     - Artifact Type: javascript
 *     - Version: 1.0.0
 *     - Date: 11/13/2026
 *     - Update: Friday, November 13, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Description:
 *     Runs the whole interface on the demo world when the page was not
 *     served by a Terrane service, as on GitHub Pages: requests to /api/
 *     and the event stream are answered in the page by demo-service.js,
 *     and pictures and sounds are drawn from each file's seed. A visitor
 *     travels, searches, inspects, previews and changes a full directory
 *     without installing anything.
 *
 * ✒ Key Features:
 *     - Answers fetch() to /api/ in the page; every other request goes
 *       to the network unchanged, and nothing about the demo is sent
 *       anywhere
 *     - Stands in for EventSource on /api/events: the watch state, job
 *       progress for copies, moves and removals, and folder changes
 *     - Streams a survey in batches, so the world assembles as it does
 *       from the service
 *     - Thumbnails drawn on a canvas from each image's style, size and
 *       colour (sea, desert, city, night, screens, textures, icons and
 *       more), cached per image and size
 *     - rawUrl() hands an image's picture, a short synthesized tone for
 *       audio, or a few seconds of animated sea recorded in the page for
 *       film, where the page would load the original
 *     - One download-style arrival in Downloads after a minute, so the
 *       live refresh shows itself; ?still in the address turns it off
 *     - A notice says this is the demo, that changes last until a reload,
 *       and where to get Terrane for real folders
 *
 * ✒ Usage Instructions:
 *     Imported by app.js only when the page holds the token placeholder
 *     and was opened over http or https:
 *         const demo = await import('./demo.js');
 *         const DEMO = demo.startDemo({ thumbs });
 *         DEMO.rawUrl(rel, max)   -> a URL to use instead of /api/raw
 *         DEMO.welcome(api)       -> shows the demo notice
 *
 * ✒ Examples:
 *     https://dnoice.github.io/terrane/          the demo on GitHub Pages
 *     http://127.0.0.1:4180/web/                 npm run demo
 *     http://127.0.0.1:4180/web/?still           without the arrival
 *
 * ✒ Other Important Information:
 *     - Dependencies: demo-service.js, demo-world.js; a 2D canvas
 *     - Compatible platforms: current Chrome, Edge, Firefox, Safari
 *     - Security: replaces window.fetch and window.EventSource for /api/
 *       URLs on this page only; the page has no service and no token, so
 *       nothing real is reachable through them
 *     - Performance: pictures are drawn only when an image asks for one,
 *       at 160 or 480 pixels, and kept as data URLs
 * ----------------------------------------------------------------------------
 */

import { createDemoService } from './demo-service.js';
import { extOf, rng } from './demo-world.js';

const REPO = 'https://github.com/dnoice/terrane';
const AUDIO = new Set(['wav', 'flac', 'mp3', 'ogg', 'oga', 'm4a', 'aac', 'aiff', 'aif', 'opus']);
const ARRIVAL_MS = 60000;

/* ---------- pictures ---------- */

const PALETTES = {
  sea: [['#9cc7dc', '#e7f0f2'], ['#3f7896', '#2a5670'], '#f6e7b8'],
  desert: [['#f0c58d', '#f7e3c4'], ['#c9935a', '#9c6b3f'], '#fff1c9'],
  mountain: [['#a9c6d6', '#e3edf0'], ['#5f7f72', '#36524a'], '#fdf3d0'],
  city: [['#1f2440', '#3b3f63'], ['#2a2e45', '#14172a'], '#f2c14e'],
  snow: [['#c6d4dc', '#eef3f5'], ['#ffffff', '#d9e3e8'], '#fbfbf6'],
  forest: [['#bcd7c1', '#eef4ea'], ['#4c7a4a', '#24402a'], '#f8efc0'],
  night: [['#0f1430', '#28325e'], ['#1a1f38', '#0b0e1d'], '#f3f0d0'],
  autumn: [['#f2d3a8', '#fbeedd'], ['#b0633a', '#6e3a22'], '#fff0c8'],
  portrait: [['#c9b2a4', '#efe3da'], ['#7a5f53', '#3d2f2a'], '#f7e6da'],
  food: [['#6b4a36', '#8a6346'], ['#efe7dc', '#d8cbbb'], '#e2a35b'],
  screen: [['#eef1f4', '#ffffff'], ['#3d6fb6', '#1f2933'], '#cfd8e3'],
  ui: [['#f4f5f7', '#ffffff'], ['#5b6cff', '#1d2433'], '#ffcf5a'],
  texture: [['#7c6a58', '#a8927b'], ['#4d4136', '#2b241e'], '#cdb89c'],
  icon: [['#f1f4f0', '#f1f4f0'], ['#18201e', '#18201e'], '#f4c430'],
  model: [['#2c3e50', '#5d6d7e'], ['#aab7c4', '#dfe6ec'], '#f4c430'],
};

function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** Two #rrggbb colours mixed: t of the first, the rest of the second. */
function mix(a, b, t) {
  const p = (c, i) => parseInt(c.slice(1 + i * 2, 3 + i * 2), 16);
  const ch = (i) => Math.round(p(a, i) * t + p(b, i) * (1 - t)).toString(16).padStart(2, '0');
  return `#${ch(0)}${ch(1)}${ch(2)}`;
}

/** A ridge line across the width: the silhouette of hills, dunes or mountains. */
function ridge(g, w, h, base, amp, R, jag, color) {
  g.beginPath();
  g.moveTo(0, h);
  const steps = 24;
  let y = base;
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * w;
    y = jag ? base - amp * R() : base - amp * (0.5 + 0.5 * Math.sin(i * 0.7 + R() * 2));
    g.lineTo(x, y);
  }
  g.lineTo(w, h);
  g.closePath();
  g.fillStyle = color;
  g.fill();
}

/** Draws one image's picture on a canvas context, from its style and seed. */
function paint(g, w, h, img, seed) {
  const R = rng(seed);
  const P = PALETTES[img.style] || PALETTES.screen;
  const sky = g.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, P[0][0]);
  sky.addColorStop(1, P[0][1]);
  g.fillStyle = sky;
  g.fillRect(0, 0, w, h);
  const s = img.style;
  if (s === 'sea' || s === 'desert' || s === 'mountain' || s === 'snow' || s === 'forest' || s === 'autumn' || s === 'night') {
    if (s === 'night') {
      g.fillStyle = 'rgba(255,255,240,0.9)';
      for (let i = 0; i < 70; i++) g.fillRect(R() * w, R() * h * 0.6, 1 + R(), 1 + R());
    }
    g.fillStyle = P[2];
    g.beginPath();
    g.arc(w * lerp(0.2, 0.8, R()), h * lerp(0.15, 0.4, R()), Math.min(w, h) * lerp(0.05, 0.1, R()), 0, Math.PI * 2);
    g.fill();
    const layers = s === 'sea' ? 1 : 3;
    for (let i = 0; i < layers; i++) {
      const t = layers === 1 ? 1 : i / (layers - 1);
      const c = mix(P[1][0], P[1][1], 1 - t);
      ridge(g, w, h, h * lerp(0.5, 0.78, t), h * lerp(0.28, 0.12, t), R, s === 'mountain' || s === 'snow', c);
    }
    if (s === 'sea') {
      g.fillStyle = P[1][0];
      g.fillRect(0, h * 0.62, w, h * 0.38);
      g.strokeStyle = 'rgba(255,255,255,0.35)';
      for (let i = 0; i < 14; i++) {
        const y = h * lerp(0.65, 0.98, R());
        g.beginPath();
        g.moveTo(R() * w, y);
        g.lineTo(R() * w, y);
        g.stroke();
      }
    }
    if (s === 'forest' || s === 'snow' || s === 'autumn') {
      for (let i = 0; i < 18; i++) {
        const x = R() * w;
        const y = h * lerp(0.7, 0.95, R());
        const th = h * lerp(0.12, 0.3, R());
        g.fillStyle = s === 'autumn' ? (R() < 0.5 ? '#c4682f' : '#e09a3e') : s === 'snow' ? '#2e3d3a' : '#2f5a33';
        g.beginPath();
        if (s === 'autumn') g.arc(x, y - th * 0.6, th * 0.35, 0, Math.PI * 2);
        else {
          g.moveTo(x, y - th);
          g.lineTo(x - th * 0.3, y);
          g.lineTo(x + th * 0.3, y);
        }
        g.fill();
      }
    }
    return;
  }
  if (s === 'city') {
    for (let i = 0; i < 16; i++) {
      const bw = w * lerp(0.05, 0.12, R());
      const bh = h * lerp(0.25, 0.75, R());
      const x = R() * w;
      g.fillStyle = R() < 0.5 ? P[1][0] : P[1][1];
      g.fillRect(x, h - bh, bw, bh);
      g.fillStyle = P[2];
      for (let wy = h - bh + 6; wy < h - 4; wy += 9) for (let wx = x + 3; wx < x + bw - 3; wx += 7) if (R() < 0.35) g.fillRect(wx, wy, 3, 4);
    }
    return;
  }
  if (s === 'portrait') {
    for (let i = 0; i < 9; i++) {
      g.fillStyle = `rgba(255,255,255,${lerp(0.08, 0.25, R())})`;
      g.beginPath();
      g.arc(R() * w, R() * h, Math.min(w, h) * lerp(0.05, 0.16, R()), 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = P[1][1];
    g.beginPath();
    g.arc(w * 0.5, h * 0.42, Math.min(w, h) * 0.17, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.ellipse(w * 0.5, h * 1.02, w * 0.36, h * 0.38, 0, Math.PI, 0);
    g.fill();
    return;
  }
  if (s === 'food') {
    for (let i = 0; i < 4; i++) {
      const x = w * lerp(0.2, 0.8, R());
      const y = h * lerp(0.25, 0.75, R());
      const r = Math.min(w, h) * lerp(0.14, 0.24, R());
      g.fillStyle = P[1][0];
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
      for (let k = 0; k < 6; k++) {
        g.fillStyle = ['#b5523b', '#e2a35b', '#6f8f3f', '#d9c27a'][Math.floor(R() * 4)];
        g.beginPath();
        g.arc(x + (R() - 0.5) * r, y + (R() - 0.5) * r, r * lerp(0.12, 0.3, R()), 0, Math.PI * 2);
        g.fill();
      }
    }
    return;
  }
  if (s === 'screen' || s === 'ui') {
    g.fillStyle = P[1][1];
    g.fillRect(0, 0, w, h * 0.07);
    g.fillStyle = s === 'ui' ? P[1][0] : '#dde3ea';
    g.fillRect(0, h * 0.07, w * 0.2, h);
    for (let i = 0; i < 6; i++) {
      const x = w * lerp(0.24, 0.62, R());
      const y = h * lerp(0.12, 0.7, R());
      g.fillStyle = '#ffffff';
      g.fillRect(x, y, w * 0.34, h * 0.2);
      g.fillStyle = i % 2 ? P[1][0] : P[2];
      g.fillRect(x + 6, y + 6, w * lerp(0.08, 0.25, R()), 5);
      g.fillStyle = '#c3ccd6';
      for (let l = 0; l < 3; l++) g.fillRect(x + 6, y + 18 + l * 8, w * lerp(0.12, 0.3, R()), 3);
    }
    return;
  }
  if (s === 'texture') {
    const cell = Math.max(4, Math.round(w / 24));
    for (let y = 0; y < h; y += cell) {
      for (let x = 0; x < w; x += cell) {
        const t = R();
        g.fillStyle = mix(P[0][0], P[1][0], t);
        g.fillRect(x, y, cell, cell);
      }
    }
    return;
  }
  if (s === 'model') {
    const cx = w / 2;
    const cy = h / 2;
    const r = Math.min(w, h) * 0.32;
    const n = 5 + Math.floor(R() * 4);
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2;
      const a1 = ((i + 1) / n) * Math.PI * 2;
      g.fillStyle = mix(P[1][0], P[1][1], i / n);
      g.beginPath();
      g.moveTo(cx, cy - r * 0.9);
      g.lineTo(cx + Math.cos(a0) * r, cy + Math.sin(a0) * r * 0.45 + r * 0.2);
      g.lineTo(cx + Math.cos(a1) * r, cy + Math.sin(a1) * r * 0.45 + r * 0.2);
      g.closePath();
      g.fill();
    }
    return;
  }
  // icon: a bold mark on the page colour.
  g.fillStyle = P[1][0];
  const m = Math.min(w, h);
  const k = Math.floor(R() * 4);
  g.beginPath();
  if (k === 0) g.arc(w / 2, h / 2, m * 0.32, 0, Math.PI * 2);
  else if (k === 1) g.rect(w / 2 - m * 0.3, h / 2 - m * 0.3, m * 0.6, m * 0.6);
  else if (k === 2) {
    g.moveTo(w / 2, h / 2 - m * 0.34);
    g.lineTo(w / 2 + m * 0.34, h / 2 + m * 0.28);
    g.lineTo(w / 2 - m * 0.34, h / 2 + m * 0.28);
  } else g.rect(w / 2 - m * 0.34, h / 2 - m * 0.12, m * 0.68, m * 0.24);
  g.fill();
  g.fillStyle = P[2];
  g.fillRect(w / 2 - m * 0.08, h / 2 - m * 0.08, m * 0.16, m * 0.16);
}

const pictures = new Map();

/** A data URL of an image's picture, long side px. */
function picture(node, px) {
  const key = `${node.s}:${px}:${node.img.style}`;
  const hit = pictures.get(key);
  if (hit) return hit;
  const ratio = node.img.w / node.img.h || 1;
  const w = ratio >= 1 ? px : Math.max(1, Math.round(px * ratio));
  const h = ratio >= 1 ? Math.max(1, Math.round(px / ratio)) : px;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  paint(g, w, h, node.img, node.s);
  const icon = node.img.style === 'icon' || node.img.style === 'screen' || node.img.style === 'ui';
  const url = c.toDataURL(icon ? 'image/png' : 'image/jpeg', 0.82);
  pictures.set(key, url);
  return url;
}

/* ---------- sound ---------- */

const sounds = new Map();

/** A few seconds of a soft chord, as a WAV blob URL: the stand-in for an audio file. */
function sound(node) {
  const hit = sounds.get(node.s);
  if (hit) return hit;
  const R = rng(node.s);
  const rate = 22050;
  const secs = 6;
  const n = rate * secs;
  const roots = [196, 220, 246.94, 261.63, 293.66, 329.63];
  const f0 = roots[Math.floor(R() * roots.length)];
  const freqs = [f0, f0 * 1.25, f0 * 1.5, f0 * 2];
  const buf = new ArrayBuffer(44 + n * 2);
  const v = new DataView(buf);
  const str = (o, s) => [...s].forEach((ch, i) => v.setUint8(o + i, ch.charCodeAt(0)));
  str(0, 'RIFF');
  v.setUint32(4, 36 + n * 2, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, 'data');
  v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) {
    const t = i / rate;
    const env = Math.min(1, t * 4) * Math.min(1, (secs - t) * 1.5);
    let x = 0;
    for (const f of freqs) x += Math.sin(2 * Math.PI * f * t);
    v.setInt16(44 + i * 2, Math.round((x / freqs.length) * env * 0.4 * 32767), true);
  }
  const url = URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
  sounds.set(node.s, url);
  return url;
}

/* ---------- film ---------- */

const FILM = new Set(['mp4', 'mov', 'mkv', 'webm', 'm4v', 'avi']);
/** The demo's one film: a blob URL once recorded, undefined while recording, null where it cannot be. */
let film = null;
let filming = false;

/**
 * Records a few seconds of animated sea from a canvas, once, so a film
 * in Quick look plays something. Every film in the world shares it.
 */
function makeFilm() {
  if (filming || typeof MediaRecorder === 'undefined') return;
  const c = document.createElement('canvas');
  if (!c.captureStream) return;
  const type = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'].find((t) => MediaRecorder.isTypeSupported(t));
  if (!type) return;
  filming = true;
  c.width = 640;
  c.height = 360;
  const g = c.getContext('2d');
  let rec;
  try {
    rec = new MediaRecorder(c.captureStream(30), { mimeType: type, videoBitsPerSecond: 900000 });
  } catch {
    return;
  }
  const chunks = [];
  rec.ondataavailable = (e) => {
    if (e.data.size) chunks.push(e.data);
  };
  rec.onstop = () => {
    film = URL.createObjectURL(new Blob(chunks, { type: type.split(';')[0] }));
  };
  const t0 = performance.now();
  const SECS = 5;
  const frame = () => {
    const t = (performance.now() - t0) / 1000;
    const sky = g.createLinearGradient(0, 0, 0, 360);
    sky.addColorStop(0, '#9cc7dc');
    sky.addColorStop(1, '#f6e7b8');
    g.fillStyle = sky;
    g.fillRect(0, 0, 640, 360);
    g.fillStyle = '#f4c430';
    g.beginPath();
    g.arc(470, 120 - t * 6, 34, 0, Math.PI * 2);
    g.fill();
    for (let k = 0; k < 4; k++) {
      g.fillStyle = ['#7fb3c8', '#4f86a6', '#3f7896', '#2a5670'][k];
      g.beginPath();
      g.moveTo(0, 360);
      for (let x = 0; x <= 640; x += 16) g.lineTo(x, 200 + k * 34 + Math.sin(x / (60 + k * 14) + t * (1.4 + k * 0.5)) * (10 + k * 3));
      g.lineTo(640, 360);
      g.fill();
    }
    g.fillStyle = 'rgba(24,32,30,0.75)';
    g.fillRect(16, 16, 168, 30);
    g.fillStyle = '#f1f4f0';
    g.font = '16px ui-monospace, monospace';
    g.fillText(`TERRANE DEMO 00:0${Math.min(SECS - 1, Math.floor(t))}`, 24, 37);
    if (t < SECS) requestAnimationFrame(frame);
    else rec.stop();
  };
  rec.start();
  frame();
}

/* ---------- the stand-ins ---------- */

const apiUrl = (input) => {
  try {
    const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url, location.href);
    return url.origin === location.origin && url.pathname.startsWith('/api/') ? url : null;
  } catch {
    return null;
  }
};

/**
 * Installs the demo: answers /api/ in the page and returns the hooks the
 * page uses for pictures, sounds and the welcome notice.
 */
export function startDemo({ thumbs } = {}) {
  const listeners = new Set();
  const svc = createDemoService({ emit: (msg) => listeners.forEach((fn) => fn(msg)) });
  const realFetch = window.fetch.bind(window);
  const enc = new TextEncoder();

  const respond = (r) => {
    if (r.batches) {
      const batches = r.batches;
      let i = 0;
      const body = new ReadableStream({
        async pull(ctl) {
          if (i >= batches.length) {
            ctl.close();
            return;
          }
          // A few batches at a time, with a breath between, so the world
          // assembles the way it does from the service.
          for (let k = 0; k < 3 && i < batches.length; k++) ctl.enqueue(enc.encode(`${JSON.stringify(batches[i++])}\n`));
          await new Promise((res) => setTimeout(res, 16));
        },
      });
      return new Response(body, { status: 200, headers: { 'Content-Type': 'application/x-ndjson' } });
    }
    if (r.image) {
      const px = 960;
      return fetch(picture(r.image, px)).then((x) => x.blob()).then((b) => new Response(b, { status: 200, headers: { 'Content-Type': b.type, 'X-Terrane-Truncated': '0' } }));
    }
    if (r.text !== undefined) {
      return new Response(r.text, { status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Terrane-Truncated': r.truncated ? '1' : '0' } });
    }
    return new Response(JSON.stringify(r.json), { status: r.status, headers: { 'Content-Type': 'application/json' } });
  };

  window.fetch = async (input, init = {}) => {
    const url = apiUrl(input);
    if (!url) return realFetch(input, init);
    const method = String(init.method || (typeof input === 'object' && input.method) || 'GET').toUpperCase();
    let body = {};
    if (typeof init.body === 'string') {
      try {
        body = JSON.parse(init.body);
      } catch { /* not json */ }
    }
    return respond(await svc.handle(method, url.pathname.slice(5), url.searchParams, body));
  };

  const RealEventSource = window.EventSource;
  class DemoEventSource extends EventTarget {
    constructor(url, opts) {
      super();
      if (!apiUrl(url)) return new RealEventSource(url, opts);
      this.url = String(url);
      this.withCredentials = false;
      this.readyState = 0;
      this.onopen = null;
      this.onmessage = null;
      this.onerror = null;
      this.listener = (msg) => this.deliver(msg);
      setTimeout(() => {
        if (this.readyState === 2) return;
        this.readyState = 1;
        const open = new Event('open');
        this.onopen?.(open);
        this.dispatchEvent(open);
        listeners.add(this.listener);
        this.deliver({ type: 'watch', state: 'demo' });
      }, 0);
    }

    deliver(msg) {
      const e = new MessageEvent('message', { data: JSON.stringify(msg) });
      this.onmessage?.(e);
      this.dispatchEvent(e);
    }

    close() {
      this.readyState = 2;
      listeners.delete(this.listener);
    }
  }
  DemoEventSource.CONNECTING = 0;
  DemoEventSource.OPEN = 1;
  DemoEventSource.CLOSED = 2;
  window.EventSource = DemoEventSource;

  /** An image's thumbnail facts from the live tree, so renames and moves keep their pictures. */
  const thumbInfo = (rel) => {
    const node = svc.lookup(rel);
    const img = node && !node.dir && node.img;
    return img ? { v: node.s.toString(36), kind: extOf(node.name) === 'svg' ? 'svg' : 'raster', status: 'ok', w: img.w, h: img.h, color: img.color, rungs: 3 } : null;
  };
  if (thumbs) {
    thumbs.lookup = thumbInfo;
    thumbs.source = (rel, px) => {
      const node = svc.lookup(rel);
      return node?.img ? picture(node, px) : null;
    };
  }

  if (!new URLSearchParams(location.search).has('still')) setTimeout(() => svc.arrive(), ARRIVAL_MS);

  return {
    service: svc,
    /** A URL for a file's picture or sound in place of /api/raw, or null to use /api/raw. */
    rawUrl(rel) {
      let node = svc.lookup(rel);
      if (node && !node.dir && node.link !== undefined) node = svc.follow(rel, node)?.node || null;
      if (!node || node.dir) return null;
      if (node.img) return picture(node, 960);
      if (AUDIO.has(extOf(node.name))) return sound(node);
      if (FILM.has(extOf(node.name))) return film;
      return null;
    },
    /** Says what the visitor is looking at, once the world is surveyed. */
    welcome(api) {
      setTimeout(makeFilm, 1500);
      const s = svc.world.stats;
      api.notice(`This is Terrane's demo: a made-up studio drive of ${s.files.toLocaleString('en-US')} files. Change anything you like; it lasts until you reload.`, {
        kind: 'info', ms: 20000,
        action: { label: 'Get Terrane', run: () => window.open(REPO, '_blank', 'noopener') },
      });
    },
  };
}
