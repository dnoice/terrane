/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Theme Constants (Terrane Edition - v1.2)
 *     - File Name: theme.js
 *     - Relative Path: web/js/theme.js
 *     - Artifact Type: javascript
 *     - Version: 1.2.0
 *     - Date: 11/14/2026
 *     - Update: Saturday, November 14, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Changelog:
 *     - 1.2.0 (11/14/2026) [dendogg + Anthropic - Claude Opus 5.5] — The
 *       plaster ramp is quieter: each level a tone lighter at half the old
 *       step (0xcdd4cf to 0xe6ebe6, was to 0xf8faf7), so the innermost
 *       plateau is no longer near white and every plateau sits a little
 *       more neutral than what stands on it. TONE_STEPS, the extensions'
 *       steps within a kind, lives here, frozen; app.js imports it.
 *     - 1.1.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] —
 *       The header points at web/css/tokens.css, where the twins of
 *       these colours live since the layered stylesheet, and names the
 *       benchmarks among what verdigris marks.
 *     - 1.0.0 (11/09/2026) [dendogg + Anthropic - Claude Fable 5.2] —
 *       Initial release.
 *
 * ✒ Description:
 *     The colours the 3D viewport needs as numbers. They mirror the custom
 *     properties in web/css/tokens.css (the age ramp's twins are
 *     --ramp-age-0 to -5; plaster's and clay's, --plaster-0, -2, -5 and
 *     --clay) so the world and the sheet around it are drawn from one
 *     palette. Change a value here and its twin there together.
 *
 * ✒ Key Features:
 *     - Ground, ink and paper values shared with the stylesheet
 *     - Semantic colours: mark (selection), signal (search), garnet
 *       (duplicates and destructive), verdigris (destination, live and
 *       benchmarks)
 *     - Plaster ramp for plateaus, a quiet half step lighter with each
 *       level of elevation (luminance 0.65 to 0.82)
 *     - TONE_STEPS: the five steps an extension takes within its kind
 *     - Sequential ramps for the Age and Size lenses
 *
 * ✒ Other Important Information:
 *     - Dependencies: none
 *     - Compatible platforms: any browser with ES2022 modules
 * ----------------------------------------------------------------------------
 */

export const THEME = {
  chalk: 0xe2e7e3,
  paper: 0xf6f8f4,
  ink: 0x18201e,
  mark: 0xf4c430,
  signal: 0xe5482d,
  garnet: 0x9b1c3a,
  verdigris: 0x1f7f73,
  clay: 0xb4bcb7,
  plaster: [0xcdd4cf, 0xd3d9d4, 0xd8ded9, 0xdde3de, 0xe2e7e2, 0xe6ebe6],
  ageRamp: [0xd9ddd6, 0xb9cfc4, 0x86b8a8, 0x4f9c8b, 0x1f7f73, 0x0f5a52],
  sizeRamp: [0xdcdfd8, 0xd9c9a8, 0xd9a877, 0xd17f4d, 0xc2552f, 0x9b2a1d],
};

/**
 * The steps a kind's colour takes for its extensions, as shares toward
 * black (negative) or white (positive): a folder of .tsx and .css reads
 * as two tones of one kind.
 */
export const TONE_STEPS = Object.freeze([-0.12, -0.06, 0, 0.07, 0.14]);

export function mixHex(a, b, t) {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  return (Math.round(ar + (br - ar) * t) << 16) | (Math.round(ag + (bg - ag) * t) << 8) | Math.round(ab + (bb - ab) * t);
}

export function ramp(stops, t) {
  const x = Math.min(0.9999, Math.max(0, t)) * (stops.length - 1);
  const i = Math.floor(x);
  return mixHex(stops[i], stops[i + 1], x - i);
}

export const cssHex = (n) => '#' + n.toString(16).padStart(6, '0');
