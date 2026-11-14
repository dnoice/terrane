/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Lettering (Terrane Edition - v1.0)
 *     - File Name: lettering.js
 *     - Relative Path: web/js/lettering.js
 *     - Artifact Type: javascript
 *     - Version: 1.0.0
 *     - Date: 11/14/2026
 *     - Update: Saturday, November 14, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Description:
 *     The names the world wears on its blocks. Each name is set once in the
 *     interface's own type, turned into a signed distance field and kept in
 *     one slot of a single-channel atlas on the GPU, where the boxes'
 *     shader reads it and prints the name onto a lid or a riser.
 *
 * ✒ Key Features:
 *     - One 2048 x 4096 single-channel atlas: 128 slots of 1024 x 64 pixels,
 *       about 11 MB on the GPU with its mipmaps and nothing on the CPU
 *     - Signed distance fields (an exact Euclidean distance transform of
 *       the set type), so letters stay sharp from six pixels tall to six
 *       hundred, at any angle
 *     - Two faces: file names in DM Mono as they are written, folder names
 *       in Archivo expanded capitals with open spacing
 *     - measure() answers at once from the type's metrics, so a name can be
 *       fitted to its box before it has a slot
 *     - Slots are cached by face and text and reused least recently used
 *       first; a slot in use this frame is never taken
 *     - A budget of new names set per frame, so flying into a dense folder
 *       never stalls a frame; the largest names are set first
 *     - Each new slot reaches the GPU as one 64 KB sub-upload, and mipmaps
 *       are regenerated once per batch
 *     - A name too long for a slot keeps its start and its extension around
 *       an ellipsis
 *
 * ✒ Usage Instructions:
 *     const letters = new Lettering(renderer);
 *     await letters.ready;                     // the two faces are loaded
 *     const m = letters.measure(name, FACE.FILE);  // { text, tw, chars }
 *     const slot = letters.slot(m, FACE.FILE, frame); // -1 until it is set
 *     letters.flush();                          // sets the queue's next names
 *     material uniform: letters.texture; constants: SLOT, ATLAS, PAD, CAP
 *
 * ✒ Other Important Information:
 *     - Dependencies: three.js r187 (vendored at web/vendor/three), the
 *       Archivo and DM Mono faces declared in web/css/fonts.css
 *     - Compatible platforms: browsers with WebGL2 and canvas letterSpacing
 *       and fontStretch (Chromium 99 and later, Firefox 115 and later)
 *     - Performance: setting one name costs about half a millisecond; at
 *       most BUDGET names are set per frame
 * ----------------------------------------------------------------------------
 */

import * as THREE from '../vendor/three/three.module.js';

/** The atlas, in pixels: 2 columns by 64 rows of slots. */
export const ATLAS = Object.freeze({ w: 2048, h: 4096 });
/** One slot, in pixels. */
export const SLOT = Object.freeze({ w: 1024, h: 64 });
const COLS = ATLAS.w / SLOT.w;
const SLOTS = COLS * (ATLAS.h / SLOT.h);
/** The distance field's reach, in pixels, and the margin left of each name. */
export const PAD = 8;
const FONT_PX = 40;
/** Names set per flush. */
const BUDGET = 6;

/** The two faces. */
export const FACE = Object.freeze({ FILE: 0, DIR: 1 });
const FACES = [
  { font: `500 ${FONT_PX}px "DM Mono", "Cascadia Mono", Consolas, monospace`, stretch: 'normal', spacing: '0px', upper: false },
  { font: `700 ${FONT_PX}px Archivo, "Segoe UI", sans-serif`, stretch: 'expanded', spacing: `${Math.round(FONT_PX * 0.12)}px`, upper: true },
];

const INF = 1e20;

/**
 * One row or column of the squared Euclidean distance transform, in place
 * (Felzenszwalb and Huttenlocher): the lower envelope of the parabolas
 * rooted at every sample.
 */
function edt1d(grid, offset, stride, length, f, v, z) {
  v[0] = 0;
  z[0] = -INF;
  z[1] = INF;
  f[0] = grid[offset];
  for (let q = 1, k = 0, s = 0; q < length; q++) {
    f[q] = grid[offset + q * stride];
    const q2 = q * q;
    do {
      const r = v[k];
      s = (f[q] - f[r] + q2 - r * r) / (q - r) / 2;
    } while (s <= z[k] && --k > -1);
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = INF;
  }
  for (let q = 0, k = 0; q < length; q++) {
    while (z[k + 1] < q) k++;
    const r = v[k];
    const qr = q - r;
    grid[offset + q * stride] = f[r] + qr * qr;
  }
}

function edt(grid, width, height, f, v, z) {
  for (let x = 0; x < width; x++) edt1d(grid, x, width, height, f, v, z);
  for (let y = 0; y < height; y++) edt1d(grid, y * width, 1, width, f, v, z);
}

export class Lettering {
  constructor(renderer) {
    this.renderer = renderer;
    const tex = new THREE.DataTexture(null, ATLAS.w, ATLAS.h, THREE.RedFormat, THREE.UnsignedByteType);
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = true;
    tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    // Allocated on the GPU, zeroed, with no pixels sent: slots arrive one
    // by one as sub-uploads.
    tex.source.dataReady = false;
    tex.needsUpdate = true;
    renderer.initTexture(tex);
    this.texture = tex;
    this.staging = new THREE.DataTexture(new Uint8Array(SLOT.w * SLOT.h), SLOT.w, SLOT.h, THREE.RedFormat, THREE.UnsignedByteType);
    this.at = new THREE.Vector2();

    const canvas = document.createElement('canvas');
    canvas.width = SLOT.w;
    canvas.height = SLOT.h;
    this.ctx = canvas.getContext('2d', { willReadFrequently: true });
    const n = SLOT.w * SLOT.h;
    this.outer = new Float64Array(n);
    this.inner = new Float64Array(n);
    const m = Math.max(SLOT.w, SLOT.h);
    this.f = new Float64Array(m);
    this.v = new Uint16Array(m);
    this.z = new Float64Array(m + 1);

    // Slots by key (face and text): { slot, used }; free slots; the queue
    // of names waiting to be set, in the order they were asked for.
    this.cache = new Map();
    this.free = Array.from({ length: SLOTS }, (_, i) => SLOTS - 1 - i);
    this.queue = new Map();
    this.metrics = new Map();
    this.cap = [0, 0];
    this.set = 0;
    this.ready = Promise.all(FACES.map((fc) => document.fonts.load(fc.font, 'Ag'))).catch(() => null).then(() => {
      // Cap heights, as set: the shader centres a slot's capitals on its
      // middle line and sizes them from these.
      FACES.forEach((fc, i) => {
        this.#face(i);
        this.cap[i] = this.ctx.measureText('H').actualBoundingBoxAscent || FONT_PX * 0.7;
      });
      this.metrics.clear();
      this.isReady = true;
      return true;
    });
  }

  #face(face) {
    const fc = FACES[face];
    const ctx = this.ctx;
    ctx.font = fc.font;
    ctx.fontStretch = fc.stretch;
    ctx.letterSpacing = fc.spacing;
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
  }

  /**
   * A name as it will be set: its text (capitals for a folder; shortened
   * around an ellipsis when it would not fit a slot), its width in slot
   * pixels and its length in characters. Cached; the cache is cleared when
   * it grows past 8,000 names.
   */
  measure(name, face) {
    const key = `${face}\u0000${name}`;
    let m = this.metrics.get(key);
    if (m) return m;
    if (this.metrics.size > 8000) this.metrics.clear();
    this.#face(face);
    let text = FACES[face].upper ? name.toUpperCase() : name;
    const room = SLOT.w - PAD * 3;
    let tw = this.ctx.measureText(text).width;
    if (tw > room) {
      const dot = text.lastIndexOf('.');
      const tail = dot > 0 && text.length - dot <= 8 ? text.slice(dot) : '';
      let head = text.slice(0, text.length - tail.length);
      while (head.length > 4 && tw > room) {
        head = head.slice(0, -1);
        text = `${head}…${tail}`;
        tw = this.ctx.measureText(text).width;
      }
    }
    m = { text, tw, chars: Math.max(1, text.length), key, face };
    this.metrics.set(key, m);
    return m;
  }

  /**
   * The slot that holds a measured name, or -1 while it waits to be set.
   * frame marks the slot as in use this frame, so it is not reused before
   * the frame is drawn.
   */
  slot(m, frame) {
    const hit = this.cache.get(m.key);
    if (hit) {
      hit.used = frame;
      return hit.slot;
    }
    if (!this.queue.has(m.key)) this.queue.set(m.key, m);
    return -1;
  }

  get pending() {
    return this.queue.size;
  }

  /**
   * Sets up to BUDGET waiting names, in the order they were asked for, and
   * returns how many it set. Each placement pass begins with drop(), so the
   * queue holds only what the last pass asked for, largest first.
   */
  flush(frame) {
    if (!this.isReady || !this.queue.size) return 0;
    let done = 0;
    const tex = this.texture;
    for (const [key, m] of this.queue) {
      if (done >= BUDGET) break;
      this.queue.delete(key);
      let slot = this.free.pop();
      if (slot === undefined) {
        // The least recently used slot not needed this frame.
        let old = null;
        for (const e of this.cache.values()) if (e.used < frame && (!old || e.used < old.used)) old = e;
        if (!old) {
          this.queue.clear();
          break;
        }
        this.cache.delete(old.key);
        slot = old.slot;
      }
      this.#set(m);
      done++;
      // Mipmaps once, after the last slot of the batch.
      tex.mipmapsAutoUpdate = done >= BUDGET || this.queue.size === 0;
      this.at.set((slot % COLS) * SLOT.w, Math.floor(slot / COLS) * SLOT.h);
      this.renderer.copyTextureToTexture(this.staging, tex, null, this.at);
      this.cache.set(key, { key, slot, used: frame });
      this.set++;
    }
    tex.mipmapsAutoUpdate = true;
    return done;
  }

  /** Forgets every waiting name (a new layout asks again for what it needs). */
  drop() {
    this.queue.clear();
  }

  /** Sets one name into the staging slot as a distance field. */
  #set(m) {
    const ctx = this.ctx;
    const face = m.face;
    const { w, h } = SLOT;
    this.#face(face);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#fff';
    // Capitals centred on the slot's middle line.
    const base = Math.round(h / 2 + this.cap[face] / 2);
    ctx.fillText(m.text, PAD, base);
    const rw = Math.min(w, Math.ceil(m.tw) + PAD * 2 + 2);
    const px = ctx.getImageData(0, 0, rw, h).data;
    const outer = this.outer;
    const inner = this.inner;
    for (let i = 0, n = rw * h; i < n; i++) {
      const a = px[i * 4 + 3] / 255;
      if (a >= 1) {
        outer[i] = 0;
        inner[i] = INF;
      } else if (a <= 0) {
        outer[i] = INF;
        inner[i] = 0;
      } else {
        const d = 0.5 - a;
        outer[i] = d > 0 ? d * d : 0;
        inner[i] = d < 0 ? d * d : 0;
      }
    }
    edt(outer, rw, h, this.f, this.v, this.z);
    edt(inner, rw, h, this.f, this.v, this.z);
    const out = this.staging.image.data;
    out.fill(0);
    // 0.5 on the outline, rising inward; PAD pixels out reaches 0.
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < rw; x++) {
        const i = y * rw + x;
        const d = Math.sqrt(outer[i]) - Math.sqrt(inner[i]);
        const val = 0.5 - d / (2 * PAD);
        out[y * w + x] = val <= 0 ? 0 : val >= 1 ? 255 : Math.round(val * 255);
      }
    }
  }
}
