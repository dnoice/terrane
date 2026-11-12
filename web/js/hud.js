/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Survey Instruments (Terrane Edition - v1.0)
 *     - File Name: hud.js
 *     - Relative Path: web/js/hud.js
 *     - Artifact Type: javascript
 *     - Version: 1.0.0
 *     - Date: 11/12/2026
 *     - Update: Thursday, November 12, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Description:
 *     Drives the instruments drawn over the world: the north arrow, which
 *     turns with the camera and turns the camera back to north when
 *     clicked, and the storage scale, which states how much storage a
 *     fixed square of screen stands for at the current height. Also takes
 *     the picture of the world that the print sheet shows.
 *
 * ✒ Key Features:
 *     - heading(yaw): writes the camera heading into --yaw; the arrow's
 *       rotation is pure CSS, so it costs no layout per frame
 *     - scale(view, rootBytes): the square's side in world units from the
 *       view width at the look distance, its area as a share of the root,
 *       and that share in bytes; the text changes only when it differs
 *     - North button: the shortest turn back to heading zero
 *     - beforeprint: renders one frame and keeps it as an image, because a
 *       WebGL canvas is cleared after compositing and would print blank
 *
 * ✒ Usage Instructions:
 *     import { createHud } from './hud.js';
 *     const hud = createHud({ onNorth: (yaw) => view.turn(-yaw) });
 *     hud.heading(view.cam.yaw);
 *     hud.scale(view, model.root.s);
 *     hud.printWith(() => view);
 *
 * ✒ Other Important Information:
 *     - Dependencies: model.js (fmtBytes); elements #north, #scale-val,
 *       #stage in web/index.html
 *     - Compatible platforms: current evergreen browsers
 *     - Limitations: the scale is a plan-view approximation; on a steep
 *       oblique view the far edge of the screen covers more ground
 * ----------------------------------------------------------------------------
 */

import { fmtBytes } from './model.js';

const SQUARE_PX = 24;
const GROUND = 1e6; // the world's ground area, in world units squared, stands for the root

const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

export function createHud({ onNorth } = {}) {
  const stage = document.getElementById('stage');
  const north = document.getElementById('north');
  const label = document.getElementById('scale-val');
  let yaw = 0;
  let lastText = '';

  north?.addEventListener('click', () => onNorth?.(wrap(yaw)));

  return {
    heading(next) {
      if (!Number.isFinite(next)) return;
      yaw = next;
      // Turning right swings north to the left on screen.
      stage?.style.setProperty('--yaw', `${(-wrap(next) * 180) / Math.PI}deg`);
      north?.setAttribute('aria-label', `Turn to face north (heading ${Math.round(((wrap(next) * 180) / Math.PI + 360) % 360)}°)`);
    },

    scale(view, rootBytes) {
      if (!label) return;
      const p = view?.look?.();
      let text;
      if (!p?.point) text = 'Horizon';
      else {
        const across = p.dist * 0.82 * (view.w / view.h);
        const side = (SQUARE_PX * across) / Math.max(1, view.w);
        const share = Math.min(1, (side * side) / GROUND);
        text = share >= 1 ? 'Everything' : `≈ ${fmtBytes(rootBytes * share)}`;
      }
      if (text === lastText) return;
      lastText = text;
      label.textContent = text;
    },

    /** Keeps a rendered frame for the print sheet. */
    printWith(getView) {
      const shot = document.createElement('img');
      shot.id = 'print-shot';
      shot.alt = '';
      shot.hidden = true;
      stage?.append(shot);
      addEventListener('beforeprint', () => {
        const v = getView();
        try {
          v.renderer.render(v.scene, v.camera);
          shot.src = v.renderer.domElement.toDataURL('image/png');
          shot.hidden = false;
        } catch {
          shot.hidden = true;
        }
      });
      addEventListener('afterprint', () => {
        shot.hidden = true;
        shot.removeAttribute('src');
      });
    },
  };
}
