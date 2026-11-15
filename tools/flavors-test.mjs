/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Flavors Test (Terrane Edition - v1.2)
 *     - File Name: flavors-test.mjs
 *     - Relative Path: tools/flavors-test.mjs
 *     - Artifact Type: test
 *     - Version: 1.2.0
 *     - Date: 11/14/2026
 *     - Update: Saturday, November 14, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Changelog:
 *     - 1.2.0 (11/14/2026) [dendogg + Anthropic - Claude Opus 5.5] —
 *       startingFlavor: a launch flavor is taken once and a later choice
 *       holds; the service refuses a --flavor that names no flavor.
 *     - 1.1.0 (11/14/2026) [dendogg + Anthropic - Claude Opus 5.5] —
 *       Blender's left and right buttons, with and without Shift and
 *       Ctrl, move nothing; the guide's rows for such a button say what
 *       its click does.
 *     - 1.0.0 (11/14/2026) [dendogg + Anthropic - Claude Opus 5.5] —
 *       Initial release.
 *
 * ✒ Description:
 *     Checks the flavors in Node: every flavor's drags name a
 *     motion the view knows, Terrane's flavor means what the guide says
 *     (the middle button grabs and moves, Shift with it orbits), each
 *     tool's signature drags mean what its users expect, the most specific press wins, and the guide's rows say
 *     the same as the resolver.
 *
 * ✒ Key Features:
 *     - Terrane's own eleven presses, checked one by one
 *     - The signature drags of Blender, AutoCAD, SketchUp, Maya, 3ds Max,
 *       Rhino, SolidWorks, Unity, Unreal Engine and Google Earth
 *     - Specificity: a modifier a flavor leaves alone keeps Terrane's
 *       meaning; Meta counts as Ctrl; buttons by number or by name agree
 *     - Every guide row for every flavor agrees with motionFor
 *     - install(api) adds one palette item per flavor and marks the one
 *       in use; running one chooses it
 *
 * ✒ Usage Instructions:
 *     node tools/flavors-test.mjs     (part of npm test)
 *
 * ✒ Other Important Information:
 *     - Dependencies: web/js/flavors.js
 *     - Compatible platforms: Node.js 22.5+
 * ----------------------------------------------------------------------------
 */

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { FLAVORS, MOTIONS, flavorById, motionFor, rowsFor, labelOf, install, DEFAULT_FLAVOR, startingFlavor, isFlavor } from '../web/js/flavors.js';

let passed = 0;
let failed = 0;
const check = (name, ok, detail = '') => {
  if (ok) passed++;
  else failed++;
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${name}${ok || !detail ? '' : ` — ${detail}`}`);
};

console.log('Flavors');

// Every flavor names known motions only, with a unique id.
const ids = FLAVORS.map((p) => p.id);
check(`${FLAVORS.length} flavors, each id unique`, FLAVORS.length >= 11 && new Set(ids).size === ids.length, ids.join(' '));
for (const p of FLAVORS) {
  const bad = Object.entries(p.drags).filter(([k, m]) => !MOTIONS[m] || !/^((ctrl|shift)\+)?(alt\+)?(left|middle|right)$/.test(k));
  check(`${p.name}: every drag is a known press and motion`, bad.length === 0, JSON.stringify(bad));
}
check('an unknown id is Terrane, never undefined', flavorById('nope').id === 'terrane' && flavorById(undefined).id === 'terrane' && DEFAULT_FLAVOR === 'terrane');
check('a label names the tools that share a flavor', labelOf(flavorById('autocad')) === 'AutoCAD (also Fusion 360, Revit)' && labelOf(flavorById('blender')) === 'Blender');

// Terrane's own: the middle button grabs and moves, Shift with it orbits.
const T = flavorById('terrane');
const before = [
  [0, {}, 'slide'], [2, {}, 'orbit'], [1, {}, 'slide'], [1, { shift: true }, 'orbit'], [1, { ctrl: true }, 'dolly'],
  [0, { alt: true }, 'look'], [1, { alt: true }, 'look'], [2, { alt: true }, 'look'], [1, { meta: true }, 'dolly'],
  [0, { shift: true }, 'slide'], [2, { ctrl: true }, 'orbit'],
];
for (const [b, mods, want] of before) {
  const got = motionFor(T, b, mods);
  check(`Terrane: button ${b} ${JSON.stringify(mods)} is ${want}`, got === want, got);
}

// Each tool's signature drags.
const sig = [
  ['blender', 'middle', {}, 'orbit'], ['blender', 'middle', { shift: true }, 'slide'], ['blender', 'middle', { ctrl: true }, 'dolly'],
  ['blender', 'left', {}, 'none'], ['blender', 'right', {}, 'none'], ['blender', 'left', { shift: true }, 'none'],
  ['blender', 'left', { ctrl: true }, 'none'], ['blender', 'right', { shift: true }, 'none'], ['blender', 'right', { ctrl: true }, 'none'],
  ['blender', 'left', { alt: true }, 'orbit'], ['blender', 'left', { alt: true, shift: true }, 'slide'], ['blender', 'left', { alt: true, ctrl: true }, 'dolly'],
  ['autocad', 'middle', {}, 'slide'], ['autocad', 'middle', { shift: true }, 'orbit'],
  ['sketchup', 'middle', {}, 'orbit'], ['sketchup', 'middle', { shift: true }, 'slide'],
  ['maya', 'left', { alt: true }, 'orbit'], ['maya', 'middle', { alt: true }, 'slide'], ['maya', 'right', { alt: true }, 'dolly'],
  ['3dsmax', 'middle', {}, 'slide'], ['3dsmax', 'middle', { alt: true }, 'orbit'], ['3dsmax', 'middle', { alt: true, ctrl: true }, 'dolly'],
  ['rhino', 'right', {}, 'orbit'], ['rhino', 'right', { shift: true }, 'slide'], ['rhino', 'right', { ctrl: true }, 'dolly'],
  ['solidworks', 'middle', {}, 'orbit'], ['solidworks', 'middle', { ctrl: true }, 'slide'], ['solidworks', 'middle', { shift: true }, 'dolly'],
  ['unity', 'right', {}, 'look'], ['unity', 'middle', {}, 'slide'], ['unity', 'left', { alt: true }, 'orbit'], ['unity', 'right', { alt: true }, 'dolly'],
  ['unreal', 'left', {}, 'walk'], ['unreal', 'right', {}, 'look'], ['unreal', 'middle', {}, 'slide'],
  ['earth', 'left', {}, 'slide'], ['earth', 'left', { shift: true }, 'orbit'], ['earth', 'left', { ctrl: true }, 'look'], ['earth', 'right', {}, 'dolly'],
];
for (const [id, b, mods, want] of sig) {
  const got = motionFor(flavorById(id), b, mods);
  check(`${flavorById(id).name}: ${Object.keys(mods).join('+') || 'plain'} ${b} drag is ${want}`, got === want, got);
}

// Specificity and spelling.
check('a modifier a flavor leaves alone keeps Terrane\'s meaning (3ds Max Ctrl+middle flies in and out)', motionFor(flavorById('3dsmax'), 'middle', { ctrl: true }) === 'dolly');
check('Alt with a button a flavor does not name looks around (AutoCAD Alt+middle)', motionFor(flavorById('autocad'), 'middle', { alt: true }) === 'look');
check('Blender keeps Blender\'s middle button though Terrane\'s pans: middle orbits, Shift+middle grabs', motionFor(flavorById('blender'), 'middle', {}) === 'orbit' && motionFor(flavorById('blender'), 'middle', { shift: true }) === 'slide');
check('buttons by number and by name agree in every flavor', FLAVORS.every((p) => [[0, 'left'], [1, 'middle'], [2, 'right']].every(([n, s]) =>
  [{}, { shift: true }, { ctrl: true }, { alt: true }, { alt: true, ctrl: true }].every((m) => motionFor(p, n, m) === motionFor(p, s, m)))));
check('AutoCAD and SketchUp rise to the overview on a middle double click; Terrane does not', flavorById('autocad').overview === 'middle' && flavorById('sketchup').overview === 'middle' && !T.overview);

// The guide's rows agree with the resolver.
const parse = (label) => {
  const m = /^(?:(Shift|Ctrl|Alt)\+)?(?:(Shift|Ctrl|Alt)\+)?(Drag|drag|Middle-drag|middle-drag|Right-drag|right-drag)$/.exec(label);
  if (!m) return null;
  const mods = {};
  for (const x of [m[1], m[2]]) if (x) mods[x.toLowerCase()] = true;
  const b = /middle/i.test(m[3]) ? 'middle' : /right/i.test(m[3]) ? 'right' : 'left';
  return [b, mods];
};
for (const p of FLAVORS) {
  const rows = rowsFor(p);
  const wrong = rows.filter(([k, d]) => {
    if (/double-click|any drag|other drags/.test(k)) return false;
    const pr = parse(k);
    if (!pr) return true;
    const m = motionFor(p, pr[0], pr[1]);
    // A button with no drag says what its click does after "Nothing".
    return m === 'none' ? !d.startsWith(`${MOTIONS.none} (a click `) : MOTIONS[m] !== d;
  });
  check(`${p.name}: the guide's ${rows.length} rows say what each drag does`, rows.length >= 4 && wrong.length === 0, JSON.stringify(wrong));
}

const blenderRows = Object.fromEntries(rowsFor(flavorById('blender')));
check('Blender\'s guide says its left and right buttons only click: a click selects, a right click opens the menu',
  blenderRows.Drag === 'Nothing (a click selects)' && blenderRows['Right-drag'] === 'Nothing (a click opens the menu)', JSON.stringify(blenderRows));

// The flavor a page starts with.
const sf = (o) => JSON.stringify(startingFlavor(o));
check('no launch flavor: the kept choice, else Terrane', sf({ kept: 'maya' }) === sf({ kept: 'maya', launch: null }) && startingFlavor({ kept: 'maya' }).id === 'maya' && startingFlavor({}).id === 'terrane' && startingFlavor({}).took === null);
check('a launch flavor not yet taken wins once, and asks to be kept', sf({ launch: 'blender', taken: null, kept: 'terrane' }) === JSON.stringify({ id: 'blender', took: 'blender' }));
check('once taken, a choice made since holds', sf({ launch: 'blender', taken: 'blender', kept: 'maya' }) === JSON.stringify({ id: 'maya', took: null }));
check('a different launch flavor is taken again', startingFlavor({ launch: 'autocad', taken: 'blender', kept: 'maya' }).id === 'autocad');
check('a launch id that names no flavor is ignored', startingFlavor({ launch: 'nope', kept: 'maya' }).id === 'maya' && !isFlavor('nope') && isFlavor('blender'));
{
  const run = (...a) => spawnSync(process.execPath, [fileURLToPath(new URL('../server/terrane.mjs', import.meta.url)), ...a], { encoding: 'utf8' });
  const bad = run('--snapshot', 'nowhere', '--flavor', 'nope');
  check('the service refuses a --flavor that names no flavor, and lists them', bad.status === 1 && /"nope" is not a flavor/.test(bad.stderr) && /blender/.test(bad.stderr), bad.stderr.slice(-200));
  const help = run('--snapshot', 'nowhere', '--flavor', 'blender', '--help');
  check('a --flavor that names one passes the usage check', help.status === 0 && /--flavor id/.test(help.stderr), help.stderr.slice(-200));
}

// The palette's commands.
const added = [];
let current = 'terrane';
install({ COMMANDS: { add: (x) => added.push(x) }, flavor: { get: () => current, set: (id) => { current = id; } } });
const items = added[0]?.items() || [];
check(`install adds one palette item per flavor under Flavor (${items.length})`, added.length === 1 && added[0].section === 'Flavor' && items.length === FLAVORS.length);
check('the flavor in use is marked In use', items.filter((i) => i.detail === 'In use').length === 1 && items[0].detail === 'In use');
items.find((i) => i.label.startsWith('Flavor: Maya'))?.run();
check('running an item chooses its flavor', current === 'maya', current);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
