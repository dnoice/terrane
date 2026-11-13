/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Icons (Terrane Edition - v1.2)
 *     - File Name: icons.js
 *     - Relative Path: web/js/icons.js
 *     - Artifact Type: javascript
 *     - Version: 1.2.0
 *     - Date: 11/13/2026
 *     - Update: Friday, November 13, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Changelog:
 *     - 1.2.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] —
 *       withIcon, which nothing called, is gone, and so are the names keys,
 *       root, status, north, folder and file, which named icons nothing
 *       draws (the north arrow is drawn inline). ICON also names
 *       the icons web/index.html draws by their Lucide names, so the same
 *       action has one icon wherever it appears.
 *     - 1.1.0 (11/12/2026) [dendogg + Anthropic - Claude Opus 5.5] — Names
 *       for the As of stepper: time (calendar-clock), earlier and later
 *       (the left and right chevrons). Names for landmarks: places (the
 *       tab, map-pinned), bench (set a benchmark, flag), remeasure
 *       (ruler), markReturn (bookmark) and returnTo (arrow-left-right).
 *     - 1.0.0 (11/12/2026) [dendogg + Anthropic - Claude Opus 5.5] —
 *       Initial release.
 *
 * ✒ Description:
 *     The one way the page draws an icon: an <svg> that uses a symbol from
 *     the vendored Lucide sprite, drawn in the current text colour at the
 *     size and stroke the stylesheet gives .icon. Icons name actions; the
 *     data in the world keeps its drawing conventions (hatch, stipple,
 *     bands), which no icon replaces.
 *
 * ✒ Key Features:
 *     - icon(name) returns a decorative, aria-hidden SVG element
 *     - ICON maps the interface's actions to Lucide names in one table, so
 *       the same action has the same icon in the bar, the menu and the
 *       inspector; it also names the icons web/index.html draws by their
 *       Lucide names (the view tools, the altitude), for the same reason
 *     - Any Lucide name in the sprite may be passed directly as well
 *
 * ✒ Usage Instructions:
 *     import { icon, ICON } from './icons.js';
 *     button.prepend(icon(ICON.rename));
 *     el('button', { class: 'btn' }, icon('trash-2'), 'Remove…');
 *
 * ✒ Other Important Information:
 *     - Dependencies: web/vendor/lucide/icons.svg (built by tools/vendor.mjs;
 *       a name must be in that tool's ICONS list to exist)
 *     - Compatible platforms: current evergreen browsers
 * ----------------------------------------------------------------------------
 */

const SPRITE = new URL('../vendor/lucide/icons.svg', import.meta.url).pathname;
const NS = 'http://www.w3.org/2000/svg';

/** Interface actions and states to Lucide names. */
export const ICON = Object.freeze({
  up: 'corner-left-up',
  newFolder: 'folder-plus',
  undo: 'undo-2',
  refresh: 'refresh-cw',
  guide: 'book-open',
  search: 'search',
  close: 'x',
  zoomIn: 'zoom-in',
  zoomOut: 'zoom-out',
  turnLeft: 'rotate-ccw',
  turnRight: 'rotate-cw',
  descend: 'person-standing',
  goTo: 'locate-fixed',
  overview: 'scan',
  ledger: 'panel-left',
  inspector: 'panel-right',
  altitude: 'mountain',
  goThere: 'corner-down-right',
  open: 'square-arrow-out-up-right',
  reveal: 'folder-search',
  copyPath: 'clipboard-copy',
  rename: 'pencil-line',
  move: 'folder-input',
  copy: 'copy',
  duplicate: 'copy-plus',
  remove: 'trash-2',
  cancel: 'circle-stop',
  ok: 'check',
  error: 'triangle-alert',
  info: 'info',
  busy: 'loader-circle',
  fly: 'locate-fixed',
  contents: 'list-tree',
  findings: 'list-filter',
  survey: 'binoculars',
  journal: 'scroll-text',
  kind: 'shapes',
  age: 'history',
  size: 'ruler-dimension-line',
  dup: 'layers',
  sortDown: 'arrow-down-wide-narrow',
  sortUp: 'arrow-up-narrow-wide',
  less: 'minus',
  more: 'plus',
  grain: 'scale',
  verify: 'sparkles',
  restore: 'history',
  selectAll: 'list-filter',
  clear: 'x',
  time: 'calendar-clock',
  earlier: 'chevron-left',
  later: 'chevron-right',
  places: 'map-pinned',
  bench: 'flag',
  remeasure: 'ruler',
  markReturn: 'bookmark',
  returnTo: 'arrow-left-right',
});

/**
 * An icon element. Decorative by default; pass a label to make it the
 * accessible name of an otherwise empty control.
 */
export function icon(name, { label, className = '' } = {}) {
  const id = ICON[name] || String(name);
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', `icon${className ? ` ${className}` : ''}`);
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('focusable', 'false');
  if (label) {
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', label);
  } else svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS(NS, 'use');
  use.setAttribute('href', `${SPRITE}#${id}`);
  svg.append(use);
  return svg;
}
