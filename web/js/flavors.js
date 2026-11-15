/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Flavors (Terrane Edition - v1.1)
 *     - File Name: flavors.js
 *     - Relative Path: web/js/flavors.js
 *     - Artifact Type: javascript
 *     - Version: 1.1.0
 *     - Date: 11/14/2026
 *     - Update: Saturday, November 14, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Changelog:
 *     - 1.1.0 (11/14/2026) [dendogg + Anthropic - Claude Opus 5.5] —
 *       Blender's left and right buttons never move the view, as in
 *       Blender: a click selects and a right click opens the menu. The
 *       guide's rows say what such a click does.
 *     - 1.0.0 (11/14/2026) [dendogg + Anthropic - Claude Opus 5.5] —
 *       Initial release.
 *
 * ✒ Description:
 *     Flavors: the ways a person can steer the world with the mouse, named after the
 *     tools whose hands they come from: Terrane's own, Blender, AutoCAD,
 *     SketchUp, Maya, 3ds Max, Rhino, SolidWorks, Unity, Unreal Engine and
 *     Google Earth. Each flavor maps a button and its modifiers to one of
 *     the view's motions; this module holds the table and answers which
 *     motion a press means. It touches no page and no view.
 *
 * ✒ Key Features:
 *     - Eleven flavors, each with the drags its tool's users reach for
 *       first, and the tools that share them named beside it (AutoCAD
 *       with Fusion 360 and Revit, Maya with Cinema 4D)
 *     - Six motions: slide (grab the ground and move it), orbit (about the
 *       grabbed point), look (turn in place), dolly (fly in and out),
 *       walk (Unreal's left drag: forward and back, and turn) and none
 *     - motionFor(flavor, button, mods) resolves the most specific match:
 *       Ctrl and Alt together, then Shift and Alt, Alt with that button,
 *       Alt with any, Ctrl, Shift, then the bare button, the flavor's own
 *       before Terrane's at each step; a press a flavor leaves alone keeps
 *       Terrane's meaning, so nothing a person knows stops working
 *     - A flavor can give a button no drag at all (none): Blender's left
 *       and right buttons only click, selecting and opening the menu
 *     - A double click of the middle button can rise to the overview, as
 *       zoom extents does in AutoCAD and SketchUp
 *     - rowsFor(flavor) gives the guide's rows for a flavor, in the order
 *       its users would look for them
 *     - DOM-free and deterministic, so Node checks every flavor
 *     - install(api) adds the palette's Flavor commands, one per
 *       flavor, the one in use marked; the guide holds the setting
 *
 * ✒ Usage Instructions:
 *     import { FLAVORS, flavorById, motionFor, rowsFor } from './flavors.js';
 *     const p = flavorById('blender');
 *     motionFor(p, 'middle', { shift: true });   // 'slide'
 *     rowsFor(p);   // [['Middle-drag', 'Orbit the point you grabbed'], ...]
 *     Listed in features.js; the controller keeps the choice (api.flavor).
 *
 * ✒ Other Important Information:
 *     - Dependencies: none (install reads api.COMMANDS and api.flavor)
 *     - Compatible platforms: any ES2022 runtime
 *     - Limitations: the keyboard is the same in every flavor (W A S D,
 *       Q E, R F, the numpad views, G to fly to the selection), since a
 *       letter one tool uses to frame the selection is one Terrane already
 *       gives to travel
 * ----------------------------------------------------------------------------
 */

/** What a drag can do to the view, in the guide's words. */
export const MOTIONS = Object.freeze({
  slide: 'Grab the ground and move it',
  orbit: 'Orbit the point you grabbed',
  look: 'Look around in place',
  dolly: 'Fly in and out',
  walk: 'Walk forward and back, and turn',
  none: 'Nothing',
});

/**
 * Terrane's own meaning of every press, which any flavor may override: the
 * middle button grabs the ground and moves it, Shift with it orbits and
 * Ctrl with it flies in and out.
 */
const BASE = Object.freeze({
  left: 'slide',
  right: 'orbit',
  middle: 'slide',
  'shift+middle': 'orbit',
  'ctrl+middle': 'dolly',
  'alt+*': 'look',
});

/**
 * The flavors, in the order the setting lists them. `drags` overrides
 * BASE; `also` names tools that share the hands; `overview` is the button
 * whose double click rises to the overview; `note` is a sentence the
 * guide shows under the rows.
 */
export const FLAVORS = Object.freeze([
  {
    id: 'terrane', name: 'Terrane', also: [],
    drags: {},
    note: 'Right-click without moving opens the menu in every flavor.',
  },
  {
    id: 'blender', name: 'Blender', also: [],
    drags: { left: 'none', right: 'none', middle: 'orbit', 'shift+middle': 'slide', 'ctrl+middle': 'dolly', 'alt+left': 'orbit', 'shift+alt+left': 'slide', 'ctrl+alt+left': 'dolly' },
    note: 'As in Blender, the left and right buttons never move the view: a click selects and a right click opens the menu. Alt with the left button stands in for the middle one, as Emulate 3 Button Mouse does. The numpad views work in every flavor.',
  },
  {
    id: 'autocad', name: 'AutoCAD', also: ['Fusion 360', 'Revit'],
    drags: { middle: 'slide', 'shift+middle': 'orbit', 'ctrl+middle': 'dolly' },
    overview: 'middle',
    note: 'Double-click the middle button to see everything, as zoom extents does.',
  },
  {
    id: 'sketchup', name: 'SketchUp', also: [],
    drags: { middle: 'orbit', 'shift+middle': 'slide', 'ctrl+middle': 'dolly' },
    overview: 'middle',
    note: 'Double-click the middle button to see everything.',
  },
  {
    id: 'maya', name: 'Maya', also: ['Cinema 4D'],
    drags: { 'alt+left': 'orbit', 'alt+middle': 'slide', 'alt+right': 'dolly' },
    note: 'Without Alt the buttons keep Terrane\'s meaning.',
  },
  {
    id: '3dsmax', name: '3ds Max', also: [],
    drags: { middle: 'slide', 'alt+middle': 'orbit', 'ctrl+alt+middle': 'dolly' },
  },
  {
    id: 'rhino', name: 'Rhino', also: [],
    drags: { right: 'orbit', 'shift+right': 'slide', 'ctrl+right': 'dolly', middle: 'slide' },
  },
  {
    id: 'solidworks', name: 'SolidWorks', also: [],
    drags: { middle: 'orbit', 'ctrl+middle': 'slide', 'shift+middle': 'dolly' },
  },
  {
    id: 'unity', name: 'Unity', also: [],
    drags: { right: 'look', middle: 'slide', 'alt+left': 'orbit', 'alt+right': 'dolly' },
    note: 'Hold the right button and use W A S D to fly, Q E to turn and R F to rise and descend.',
  },
  {
    id: 'unreal', name: 'Unreal Engine', also: [],
    drags: { left: 'walk', right: 'look', middle: 'slide', 'alt+left': 'orbit', 'alt+right': 'dolly' },
    note: 'Hold the right button and use W A S D to fly, Q E to turn and R F to rise and descend.',
  },
  {
    id: 'earth', name: 'Google Earth', also: ['maps'],
    drags: { left: 'slide', 'shift+left': 'orbit', 'ctrl+left': 'look', right: 'dolly', middle: 'orbit' },
  },
]);

export const DEFAULT_FLAVOR = 'terrane';

/** A flavor by id; an unknown id is Terrane's, never undefined. */
export function flavorById(id) {
  return FLAVORS.find((p) => p.id === id) || FLAVORS[0];
}

/** The label the setting shows: "AutoCAD (also Fusion 360, Revit)". */
export function labelOf(flavor) {
  return flavor.also.length ? `${flavor.name} (also ${flavor.also.join(', ')})` : flavor.name;
}

const BUTTONS = ['left', 'middle', 'right'];

/** The keys to look up for a press, most specific first; alt+* is Alt with any button. */
function chain(button, { shift = false, ctrl = false, alt = false } = {}) {
  const out = [];
  if (ctrl && alt) out.push(`ctrl+alt+${button}`);
  if (shift && alt) out.push(`shift+alt+${button}`);
  if (alt) out.push(`alt+${button}`, 'alt+*');
  if (ctrl) out.push(`ctrl+${button}`);
  if (shift) out.push(`shift+${button}`);
  out.push(button);
  return out;
}

/**
 * The motion a drag means under a flavor: button is 'left', 'middle' or
 * 'right' (or 0, 1, 2 as a PointerEvent gives it); mods holds shift, ctrl
 * (Meta counts as Ctrl) and alt. The most specific match wins, the
 * flavor's own before Terrane's at each step, so a modifier the flavor
 * leaves alone keeps Terrane's meaning.
 */
export function motionFor(flavor, button, mods = {}) {
  const b = typeof button === 'number' ? BUTTONS[button === 1 ? 1 : button === 2 ? 2 : 0] : button;
  const m = { shift: !!mods.shift, ctrl: !!(mods.ctrl || mods.meta), alt: !!mods.alt };
  const keys = chain(b, m);
  const own = flavor?.drags || {};
  for (const k of keys) {
    if (own[k]) return own[k];
    if (BASE[k]) return BASE[k];
  }
  return 'slide';
}

const PRESS = { left: 'Drag', middle: 'Middle-drag', right: 'Right-drag' };

/**
 * What a button with no drag still does when clicked, so the guide's row
 * says more than "Nothing" for the buttons Blender keeps for clicking.
 */
const CLICK = { left: 'a click selects', right: 'a click opens the menu' };
const MOD_WORD = { shift: 'Shift', ctrl: 'Ctrl', alt: 'Alt' };

function pressLabel(key, own) {
  if (key === 'alt+*') return Object.keys(own).some((k) => /^alt\+(left|middle|right)$/.test(k)) ? 'Alt+other drags' : 'Alt+any drag';
  const parts = key.split('+');
  const button = parts.pop();
  const mods = parts.map((p) => MOD_WORD[p]);
  const base = PRESS[button];
  if (!mods.length) return base;
  return `${mods.join('+')}+${button === 'left' ? 'drag' : base.toLowerCase()}`;
}

/**
 * The guide's rows for a flavor: every press it gives a meaning, then the
 * ones Terrane gives that it leaves alone, as [press, what it does].
 */
export function rowsFor(flavor) {
  const own = flavor?.drags || {};
  const rows = [];
  const seen = new Set();
  const add = (key) => {
    if (seen.has(key)) return;
    seen.add(key);
    const motion = own[key] || BASE[key];
    const click = motion === 'none' && CLICK[key];
    rows.push([pressLabel(key, own), click ? `${MOTIONS.none} (${click})` : MOTIONS[motion]]);
  };
  for (const k of Object.keys(own)) add(k);
  for (const k of Object.keys(BASE)) add(k);
  if (flavor?.overview) rows.push([`${flavor.overview[0].toUpperCase()}${flavor.overview.slice(1)} double-click`, 'Rise to the overview']);
  return rows;
}

/** The palette's commands: one Flavor item for each flavor. */
export function install(api) {
  api.COMMANDS.add({
    id: 'flavors', owner: 'flavors', section: 'Flavor',
    items: () => {
      const now = api.flavor.get();
      return FLAVORS.map((p) => ({
        label: `Flavor: ${labelOf(p)}`,
        detail: p.id === now ? 'In use' : 'Mouse',
        run: () => api.flavor.set(p.id),
      }));
    },
  });
}
