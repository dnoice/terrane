/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Floating Placement (Terrane Edition - v1.0)
 *     - File Name: float.js
 *     - Relative Path: web/js/float.js
 *     - Artifact Type: javascript
 *     - Version: 1.0.0
 *     - Date: 11/12/2026
 *     - Update: Thursday, November 12, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Description:
 *     Places the menu and the hover tip next to a point on screen and keeps
 *     them there: flipped to the other side when there is no room, shifted
 *     back inside the window near its edges. The geometry comes from the
 *     vendored Floating UI; this module only adapts it to a point instead
 *     of an element.
 *
 * ✒ Key Features:
 *     - placeAt(el, x, y, options): positions a fixed element against a
 *       virtual zero-size reference at the point
 *     - Flip and shift with a padding from the window edge
 *     - Writes the side it ended on into --origin, so the menu unfolds
 *       from the corner nearest the pointer
 *     - Synchronous first placement (clamped to the window), refined by
 *       Floating UI in the same frame, so nothing paints in the wrong place
 *     - A placement request superseded by a newer one is discarded
 *
 * ✒ Usage Instructions:
 *     import { placeAt } from './float.js';
 *     placeAt(menu, e.clientX, e.clientY, { placement: 'bottom-start', gap: 2 });
 *     placeAt(tip, e.clientX, e.clientY, { placement: 'bottom-start', gap: 18, cross: 16 });
 *
 * ✒ Other Important Information:
 *     - Dependencies: web/vendor/floating-ui (MIT), loaded on first use
 *     - Compatible platforms: current evergreen browsers
 * ----------------------------------------------------------------------------
 */

let fui = null;
const load = () => (fui ||= import('../vendor/floating-ui/floating-ui.dom.browser.min.mjs').catch(() => null));
const seq = new WeakMap();
const ORIGIN = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' };

/** A clamp that is right at once; Floating UI refines it before paint. */
function clampNow(el, x, y, gap, cross) {
  const r = el.getBoundingClientRect();
  const left = Math.max(8, Math.min(x + cross, window.innerWidth - r.width - 8));
  const top = Math.max(8, Math.min(y + gap, window.innerHeight - r.height - 8));
  el.style.left = `${left}px`;
  el.style.top = `${top}px`;
}

/**
 * Positions a fixed element beside a point. Returns a promise that settles
 * once the refined position is applied (or immediately without Floating UI).
 */
export async function placeAt(el, x, y, { placement = 'bottom-start', gap = 4, cross = 0, padding = 8 } = {}) {
  if (!el) return;
  const ticket = (seq.get(el) || 0) + 1;
  seq.set(el, ticket);
  clampNow(el, x, y, gap, cross);
  const lib = await load();
  if (!lib || seq.get(el) !== ticket || el.hidden) return;
  const reference = {
    getBoundingClientRect: () => ({ x, y, left: x, top: y, right: x, bottom: y, width: 0, height: 0 }),
  };
  const { x: left, y: top, placement: side } = await lib.computePosition(reference, el, {
    strategy: 'fixed',
    placement,
    middleware: [lib.offset({ mainAxis: gap, crossAxis: cross }), lib.flip({ padding }), lib.shift({ padding })],
  });
  if (seq.get(el) !== ticket) return;
  el.style.left = `${Math.round(left)}px`;
  el.style.top = `${Math.round(top)}px`;
  const [main, align = 'start'] = side.split('-');
  const h = align === 'end' ? 'right' : 'left';
  el.style.setProperty('--origin', main === 'top' || main === 'bottom' ? `${ORIGIN[main]} ${h}` : `${ORIGIN[main]} top`);
}

/** Starts loading Floating UI ahead of the first menu. */
export const preloadFloat = () => { load(); };
