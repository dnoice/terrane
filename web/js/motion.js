/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Motion Helpers (Terrane Edition - v1.0)
 *     - File Name: motion.js
 *     - Relative Path: web/js/motion.js
 *     - Artifact Type: javascript
 *     - Version: 1.0.0
 *     - Date: 11/12/2026
 *     - Update: Thursday, November 12, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Description:
 *     Script-driven motion for the few cases CSS cannot express on its
 *     own: counting a figure up to its new value, moving siblings out of
 *     the way when a notice arrives or leaves (FLIP), and a spring on an
 *     element. Uses the vendored Motion library when it has loaded and the
 *     browser's Web Animations API when it has not, and does nothing at all
 *     under prefers-reduced-motion.
 *
 * ✒ Key Features:
 *     - reduced(): the live prefers-reduced-motion answer
 *     - countTo(el, to, format): tweens a number in an element's text,
 *       spring-eased, and always ends on the exact final text
 *     - flip(container, mutate): records sibling positions, applies the
 *       change, then animates every sibling from where it was
 *     - spring(el, keyframes): a physical spring through Motion, or the
 *       --ease-spring curve through WAAPI
 *     - Every helper is safe without Motion, without WAAPI and without a
 *       layout (no-WebGL pass, headless tests)
 *
 * ✒ Usage Instructions:
 *     import { countTo, flip, spring, reduced } from './motion.js';
 *     countTo($('count'), 2840, fmtCount);
 *     flip(host, () => host.append(item));
 *
 * ✒ Other Important Information:
 *     - Dependencies: optional window.Motion (web/vendor/motion/motion.js,
 *       MIT), loaded as a classic deferred script before app.js
 *     - Compatible platforms: current evergreen browsers
 * ----------------------------------------------------------------------------
 */

const query = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
const M = () => globalThis.Motion || null;
const SPRING_CSS = 'linear(0, 0.009, 0.035 2.1%, 0.141 4.4%, 0.723 12.9%, 0.938 16.7%, 1.017 19.4%, 1.067, 1.099 24.3%, 1.108 26%, 1.1, 1.078 30.1%, 1.049 32.5%, 0.985 38.3%, 0.973, 0.968 43.4%, 0.969 45.7%, 0.991 54.6%, 0.999 58.6%, 1.003 64.4%, 1.001 79.3%, 1)';

/** True when the reader has asked for less motion. */
export const reduced = () => !!query?.matches;

const running = new WeakMap();

/**
 * Counts the number shown in an element up (or down) to a new value. The
 * element's final text is always exactly format(to).
 */
export function countTo(el, to, format = String, { duration = 0.5 } = {}) {
  if (!el) return;
  const from = Number(el.dataset.value);
  el.dataset.value = String(to);
  running.get(el)?.stop?.();
  running.delete(el);
  const done = () => { el.textContent = format(to); };
  if (reduced() || !Number.isFinite(from) || from === to || !M()?.animate) return done();
  const controls = M().animate(from, to, {
    duration,
    ease: [0.16, 1, 0.3, 1],
    onUpdate: (v) => { el.textContent = format(Math.round(v)); },
    onComplete: done,
  });
  running.set(el, controls);
  return undefined;
}

/**
 * Animates a container's children from their old positions after mutate()
 * changes the container: arrivals and departures push siblings smoothly.
 */
export function flip(container, mutate) {
  if (!container || reduced() || typeof Element.prototype.animate !== 'function') return mutate();
  const before = new Map([...container.children].map((c) => [c, c.getBoundingClientRect()]));
  const result = mutate();
  for (const c of container.children) {
    const a = before.get(c);
    if (!a) continue;
    const b = c.getBoundingClientRect();
    const dx = a.left - b.left;
    const dy = a.top - b.top;
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) continue;
    c.animate([{ translate: `${dx}px ${dy}px` }, { translate: '0 0' }], { duration: 260, easing: SPRING_CSS });
  }
  return result;
}

/** A spring on an element: Motion's physical spring, or the CSS curve. */
export function spring(el, keyframes, { stiffness = 420, damping = 26, duration = 0.42 } = {}) {
  if (!el || reduced()) return null;
  if (M()?.animate) return M().animate(el, keyframes, { type: 'spring', stiffness, damping });
  if (typeof el.animate !== 'function') return null;
  const frames = Object.entries(keyframes).reduce((acc, [prop, vals]) => {
    [vals].flat().forEach((v, i) => { (acc[i] ||= {})[prop] = v; });
    return acc;
  }, []);
  return el.animate(frames, { duration: duration * 1000, easing: SPRING_CSS });
}
