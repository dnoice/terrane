/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: View Controls Scenario (Terrane Edition - v1.1)
 *     - File Name: views.mjs
 *     - Relative Path: tools/ui-scenarios/views.mjs
 *     - Artifact Type: test
 *     - Version: 1.1.0
 *     - Date: 11/14/2026
 *     - Update: Saturday, November 14, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Changelog:
 *     - 1.1.0 (11/14/2026) [dendogg + Anthropic - Claude Opus 5.5] —
 *       Flavors: every drag of every flavor is made with the mouse and
 *       judged by what the eye did; AutoCAD's middle double click rises;
 *       the guide's Flavor setting and the palette's commands choose a
 *       flavor, kept in this browser.
 *     - 1.0.0 (11/14/2026) [dendogg + Anthropic - Claude Opus 5.5] —
 *       Initial release.
 *
 * ✒ Description:
 *     Checks that the drawing conventions stay put and that the world takes
 *     Blender's view controls. Hatching and bands are drawn once with the
 *     floating origin at the eye and once with it moved, and the two
 *     pictures must match; the middle button orbits, grabs and moves, and
 *     flies in and out; the numpad views land where the guide says.
 *
 * ✒ Key Features:
 *     - Steady conventions: the largest box on screen is drawn banded and
 *       hatched, the floating origin is moved and moved back under the
 *       same eye, and the pictures are compared pixel for pixel
 *     - Terrane's own middle button: middle-drag keeps the grabbed point
 *       under the cursor and leaves the heading; Shift+middle-drag keeps
 *       the eye's distance to it and turns the heading; Ctrl+middle-drag
 *       up flies in
 *     - The middle button's mousedown is taken by the world, so the
 *       browser starts no autoscroll
 *     - Numpad 7, 1, 3 and Ctrl+Numpad 3 land on the top, front, right
 *       and left views, and Numpad 1 and 3 leave the lens as it was
 *     - Every drag every flavor names, and Terrane's own, is
 *       made with the mouse and judged from the eye before and after:
 *       orbit, slide, look, dolly or walk
 *     - AutoCAD's middle double click rises to the overview; the guide's
 *       Flavor list and the palette choose a flavor, the choice is kept,
 *       and the guide lists the chosen flavor's drags
 *
 * ✒ Usage Instructions:
 *     node tools/ui-check.mjs views --pass webgl --no-shots
 *
 * ✒ Other Important Information:
 *     - Dependencies: tools/ui-check.mjs (the context t), WebGL,
 *       web/js/flavors.js
 *     - Compatible platforms: Node.js 22.5+, Chromium or Edge headless
 * ----------------------------------------------------------------------------
 */

import { FLAVORS, flavorById, rowsFor } from '../../web/js/flavors.js';

const STYLE_BANDS = 4;
const STYLE_HATCH = 1;

/**
 * Draws the box nearest the middle of the view with a convention, under
 * the same eye with the floating origin where it is and then moved, and
 * returns how many pixels differ by more than 6 levels in any channel.
 */
async function steady(T, style) {
  const v = T.S.view;
  const r = v.renderer;
  const gl = r.getContext();
  const frame = () => new Promise((res) => requestAnimationFrame(() => res()));
  // The file or closed mass that stands largest on screen, well inside it.
  const L = v.layout;
  const g = L.geo;
  const per = v.h / (2 * Math.tan((44 * Math.PI) / 360));
  let i = -1;
  let best = 0;
  for (let k = 1; k < v.n; k++) {
    if (L.type[k] !== 1 && L.type[k] !== 2) continue;
    const o = k * 6;
    const c = v.camera.position;
    const d = Math.hypot(g[o] - c.x, g[o + 1] - c.y, g[o + 2] - c.z);
    const size = Math.max(g[o + 3], g[o + 5]) * per / Math.max(d, 1e-9);
    if (size <= best) continue;
    const q = v.camera.position.clone().set(g[o], g[o + 1] + g[o + 4] / 2, g[o + 2]).project(v.camera);
    if (Math.abs(q.x) > 0.7 || Math.abs(q.y) > 0.7 || q.z > 1) continue;
    best = size;
    i = k;
  }
  const orig = v.paintNow;
  const paint = { ...orig, style: Uint8Array.from(orig.style) };
  paint.style[i] = style;
  const pose = v.pose();
  const w = gl.drawingBufferWidth;
  const h = gl.drawingBufferHeight;
  const grab = () => {
    v.contact.visible = false;
    r.render(v.scene, v.camera);
    const px = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
    v.contact.visible = true;
    return px;
  };
  v.setLayout(v.layout, paint, { animate: false });
  await frame();
  await frame();
  const a = grab();
  const origin0 = { ...v.origin };
  // The floating origin moves to the eye at every layout: lay out from
  // somewhere else, then come back without a new layout.
  const shift = Math.max(v.alt * 0.37, 1e-6);
  v.cam = { ...pose, x: pose.x + shift, z: pose.z - shift * 0.61 };
  v.setLayout(v.layout, paint, { animate: false });
  const origin1 = { ...v.origin };
  v.cam = { ...pose };
  v.invalidate();
  await frame();
  await frame();
  const b = grab();
  let diff = 0;
  for (let k = 0; k < a.length; k += 4) {
    if (Math.abs(a[k] - b[k]) > 6 || Math.abs(a[k + 1] - b[k + 1]) > 6 || Math.abs(a[k + 2] - b[k + 2]) > 6) diff++;
  }
  // The box's width on screen, so a check on a box out of sight cannot pass.
  const s = best;
  v.setLayout(v.layout, orig, { animate: false });
  return { index: i, diff, of: w * h, share: diff / (w * h), moved: Math.hypot(origin1.x - origin0.x, origin1.z - origin0.z), px: Math.round(s) };
}

/** Sends a real mouse drag through the browser: down, eight moves, up. */
async function drag(t, from, to, button, modifiers = 0) {
  const buttons = { left: 1, right: 2, middle: 4 }[button];
  await t.page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: from.x, y: from.y, modifiers });
  await t.page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: from.x, y: from.y, button, buttons, clickCount: 1, modifiers });
  for (let k = 1; k <= 8; k++) {
    const x = from.x + ((to.x - from.x) * k) / 8;
    const y = from.y + ((to.y - from.y) * k) / 8;
    await t.page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button, buttons, modifiers });
  }
  await t.page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: to.x, y: to.y, button, buttons: 0, clickCount: 1, modifiers });
}

/** Presses a numpad key on the canvas: key, code and Windows key code. */
async function numpad(t, n, modifiers = 0) {
  const key = String(n);
  const code = n === '.' ? 'NumpadDecimal' : `Numpad${n}`;
  const vk = n === '.' ? 110 : 96 + Number(n);
  const base = { key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, location: 3, modifiers };
  await t.page.send('Input.dispatchKeyEvent', { type: 'keyDown', ...base, text: modifiers ? undefined : key });
  await t.page.send('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
}

const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

/** Judges a drag from the eye before and after it, and the grabbed point. */
function judge(before, after, anchor) {
  const d = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
  const a0 = d(before, anchor);
  const a1 = d(after, anchor);
  const turned = Math.abs(wrap(after.yaw - before.yaw)) > 0.02 || Math.abs(after.pitch - before.pitch) > 0.02;
  const moved = d(before, after) > a0 * 0.01;
  const rose = Math.abs(after.y - before.y) > a0 * 0.01;
  if (!moved) return turned ? 'look' : 'none';
  if (turned && Math.abs(a1 - a0) / a0 < 0.03) return 'orbit';
  if (turned) return 'walk';
  return rose ? 'dolly' : 'slide';
}

export default {
  name: 'views',
  title: 'The view: steady conventions, Blender\'s middle button and numpad views',
  data: 'any',
  passes: ['webgl'],
  async run(t) {
    await t.settle();
    await t.key('0');
    await t.settle();

    /* ---- the conventions stay put when the floating origin moves ---- */
    for (const [name, style] of [['bands', STYLE_BANDS], ['hatching', STYLE_HATCH]]) {
      const r = await t.app(steady, style);
      t.check(`${name} on a box about ${r.px} px wide stay put when the floating origin moves ${r.moved.toFixed(1)} units (${r.diff} of ${r.of} pixels differ)`,
        r.moved > 0 && r.px > 40 && r.share < 0.002, JSON.stringify(r));
    }
    await t.settle();

    /* ---- the middle button belongs to the world ---- */
    const taken = await t.eval(() => {
      const ev = new MouseEvent('mousedown', { button: 1, buttons: 4, bubbles: true, cancelable: true });
      document.getElementById('view').dispatchEvent(ev);
      return ev.defaultPrevented;
    });
    t.check('a middle-button press on the world starts no autoscroll', taken === true, String(taken));

    const centre = await t.eval(() => {
      const r = document.getElementById('view').getBoundingClientRect();
      return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
    });
    const look = (T, x, y) => {
      const v = T.S.view;
      const p = v.probe(x, y);
      return { cam: v.pose(), point: p.point ? { x: p.point.x, y: p.point.y, z: p.point.z } : null };
    };
    const dist = (c, p) => Math.hypot(c.x - p.x, c.y - p.y, c.z - p.z);

    // Terrane's own middle button. Middle-drag: the grabbed point stays
    // under the cursor.
    let before = await t.app(look, centre.x, centre.y);
    const to = { x: centre.x - 90, y: centre.y + 40 };
    await drag(t, centre, to, 'middle');
    await t.settle();
    let after = await t.app(look, to.x, to.y);
    const slip = before.point && after.point ? dist(before.point, after.point) / Math.max(dist(before.cam, before.point), 1e-9) : Infinity;
    t.check(`middle-drag grabs the ground and moves it: the heading stays, the grabbed point ends under the cursor (off by ${(slip * 100).toFixed(2)} % of the distance)`,
      Math.abs(wrap(after.cam.yaw - before.cam.yaw)) < 1e-6 && slip < 0.03, JSON.stringify({ before, after }));

    // Shift+middle-drag: an orbit about the grabbed point.
    before = await t.app(look, centre.x, centre.y);
    await drag(t, centre, { x: centre.x + 120, y: centre.y + 10 }, 'middle', 8);
    await t.settle();
    after = await t.app(look, centre.x, centre.y);
    const d0 = dist(before.cam, before.point);
    const d1 = dist(after.cam, before.point);
    t.check(`Shift+middle-drag orbits the grabbed point: the heading turns ${(wrap(after.cam.yaw - before.cam.yaw) * 180 / Math.PI).toFixed(1)}°, the distance to it keeps within 3 % (${d0.toFixed(1)} to ${d1.toFixed(1)})`,
      !!before.point && Math.abs(wrap(after.cam.yaw - before.cam.yaw)) > 0.2 && Math.abs(d1 - d0) / d0 < 0.03, JSON.stringify({ before, after }));

    // Ctrl+middle-drag up: closer to the grabbed point.
    before = await t.app(look, centre.x, centre.y);
    await drag(t, centre, { x: centre.x, y: centre.y - 80 }, 'middle', 2);
    await t.settle();
    after = await t.app(look, centre.x, centre.y);
    const c0 = dist(before.cam, before.point);
    const c1 = dist(after.cam, before.point);
    t.check(`Ctrl+middle-drag up flies in toward the grabbed point (${c0.toFixed(1)} to ${c1.toFixed(1)})`,
      !!before.point && c1 < c0 * 0.8, JSON.stringify({ c0, c1 }));

    /* ---- the numpad views ---- */
    await t.eval(() => { document.getElementById('view').focus(); return true; });
    const lens = await t.app((T) => T.S.lens);
    const views = [['7', 0, 'top', (c) => Math.abs(c.pitch + 1.52) < 0.02],
      ['1', 0, 'front, facing north', (c) => Math.abs(wrap(c.yaw)) < 0.02 && Math.abs(c.pitch + 0.18) < 0.02],
      ['3', 0, 'right, facing west', (c) => Math.abs(wrap(c.yaw + Math.PI / 2)) < 0.02],
      ['3', 2, 'left, with Ctrl', (c) => Math.abs(wrap(c.yaw - Math.PI / 2)) < 0.02]];
    for (const [n, mods, what, ok] of views) {
      await numpad(t, n, mods);
      await t.settle();
      const cam = await t.app((T) => T.S.view.pose());
      t.check(`Numpad ${mods ? 'Ctrl+' : ''}${n} lands on the ${what} view (heading ${(wrap(cam.yaw) * 180 / Math.PI).toFixed(1)}°, pitch ${cam.pitch.toFixed(2)})`, ok(cam), JSON.stringify(cam));
    }
    const lensAfter = await t.app((T) => T.S.lens);
    t.check(`Numpad 1 and 3 leave the lens as it was (${lensAfter})`, lensAfter === lens, `${lens} -> ${lensAfter}`);

    /* ---- flavors: every drag, made with the mouse ---- */
    await t.key('0');
    await t.settle();
    await t.app((T) => { T.S.view.zoomAt(0.55); return true; });
    await t.settle();
    const pose0 = await t.app((T) => T.S.view.pose());
    const MOD = { alt: 1, ctrl: 2, shift: 8 };
    const terraneDrags = { left: 'slide', right: 'orbit', middle: 'slide', 'shift+middle': 'orbit', 'ctrl+middle': 'dolly', 'alt+left': 'look' };
    for (const p of FLAVORS) {
      const drags = p.id === 'terrane' ? terraneDrags : p.drags;
      await t.app((T, id) => { T.api.flavor.set(id); return true; }, p.id);
      const wrong = [];
      for (const [key, want] of Object.entries(drags)) {
        const parts = key.split('+');
        const button = parts.pop();
        const mods = parts.reduce((m, x) => m | MOD[x], 0);
        await t.app((T, pose) => { T.S.view.flyTo(pose, 0); return true; }, pose0);
        await t.settle({ quiet: 150 });
        const before = await t.app(look, centre.x, centre.y);
        await drag(t, centre, { x: centre.x + 60, y: centre.y - 60 }, button, mods);
        await t.settle({ quiet: 150 });
        const after = await t.app((T) => T.S.view.pose());
        const got = before.point ? judge(before.cam, after, before.point) : 'no point';
        if (got !== want) wrong.push(`${key}: ${got}, not ${want}`);
      }
      t.check(`${p.name}: every drag it names does what it says (${Object.keys(drags).length})`, wrong.length === 0, wrong.join('; '));
    }

    // AutoCAD: a middle double click rises to the overview.
    await t.app((T) => { T.api.flavor.set('autocad'); T.S.view.zoomAt(0.3); return true; });
    await t.settle();
    const low = await t.app((T) => T.S.view.pose());
    for (const clickCount of [1, 2]) {
      await t.page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: centre.x, y: centre.y, button: 'middle', buttons: 4, clickCount });
      await t.page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: centre.x, y: centre.y, button: 'middle', buttons: 0, clickCount });
    }
    await t.settle();
    const high = await t.app((T) => T.S.view.pose());
    t.check(`AutoCAD: a middle double click rises to the overview (${low.y.toFixed(0)} to ${high.y.toFixed(0)})`, high.y > low.y * 1.5, JSON.stringify({ low, high }));

    // The guide: the setting, the chosen flavor's drags, and a new choice kept.
    await t.key('?');
    await t.waitFor(() => document.getElementById('dialog').open && !!document.getElementById('pref-flavor'), { what: 'the guide with its Flavor setting' });
    const rowsNow = (id) => rowsFor(flavorById(id)).map(([k, d]) => `${k}|${d}`).join(';');
    const shown = () => [...document.querySelectorAll('#dialog .guide-flavor dt')].map((dt) => `${dt.textContent}|${dt.nextElementSibling.textContent}`).join(';');
    const g1 = await t.eval(() => ({ value: document.getElementById('pref-flavor').value, options: document.getElementById('pref-flavor').options.length }));
    const r1 = await t.eval(shown);
    t.check(`the guide's Mouse section shows the flavor in use (${g1.value}, ${g1.options} to choose from) and its drags`, g1.value === 'autocad' && g1.options === FLAVORS.length && r1 === rowsNow('autocad'), r1);
    await t.eval(() => {
      const sel = document.getElementById('pref-flavor');
      sel.value = 'blender';
      sel.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    });
    const r2 = await t.eval(shown);
    const kept = await t.app(() => ({ stored: localStorage.getItem('terrane.flavor'), live: document.getElementById('live').textContent }));
    const now = await t.app((T) => T.api.flavor.get());
    t.check(`choosing Blender in the guide takes effect, is kept in this browser and is said (${kept.live.slice(0, 60)}...)`,
      now === 'blender' && kept.stored === 'blender' && r2 === rowsNow('blender') && kept.live.startsWith('The Blender flavor'), JSON.stringify({ now, ...kept }));
    await t.key('Escape');
    await t.waitFor(() => !document.getElementById('dialog').open);

    // The palette: Flavor: Maya.
    await t.key('Ctrl+k');
    await t.waitFor(() => document.getElementById('dialog').open && document.getElementById('dialog').classList.contains('is-palette'), { what: 'the palette' });
    await t.type('flavor maya');
    await t.waitFor(() => document.querySelector('#palette-list [role=option] .pal-label')?.textContent.startsWith('Flavor: Maya'), { what: 'Flavor: Maya first' });
    await t.key('Enter');
    await t.waitFor(() => !document.getElementById('dialog').open);
    const viaPalette = await t.app((T) => T.api.flavor.get());
    t.check(`the palette's Flavor: Maya chooses Maya (${viaPalette})`, viaPalette === 'maya', viaPalette);

    // Back to Terrane's own, for whatever runs next in this browser.
    await t.app((T) => { T.api.flavor.set('terrane'); return true; });

    await t.key('0');
    await t.settle();
  },
};
