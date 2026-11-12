/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Feature Modules (Terrane Edition - v1.0)
 *     - File Name: features.js
 *     - Relative Path: web/js/features.js
 *     - Artifact Type: javascript
 *     - Version: 1.0.0
 *     - Date: 11/12/2026
 *     - Update: Thursday, November 12, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Description:
 *     The list of feature modules app.js installs at start. A feature
 *     lives in its own file and reaches the controller only through the
 *     api it is handed, so adding one is an import and an entry here.
 *
 * ✒ Key Features:
 *     - One place that says which features a build carries, in install
 *       order
 *     - A feature module exports name (a short label for sentences such
 *       as "Time could not start: ...") and install(api)
 *     - install(api) adds entries to the controller's registries: KEYS,
 *       ESCAPE, PIN_SOURCES, TIP_LINES, INSPECTOR.focus and .node,
 *       READING, TABS, LAYOUT_OPTS, AFTER_LAYOUT, AFTER_REFRESH,
 *       AFTER_SURVEY, and the QUERY.is and QUERY.prefix search tokens
 *     - A module that throws while installing is reported in words and
 *       the others still start
 *
 * ✒ Usage Instructions:
 *     // web/js/time.js
 *     export const name = 'Time';
 *     export function install(api) {
 *       api.KEYS.add({ id: 'time-toggle', owner: 'time', keys: ['t'],
 *         run: () => toggle(api), guide: ['Time', 'T', 'Look back'] });
 *     }
 *     // here
 *     import * as time from './time.js';
 *     export const FEATURES = [time];
 *
 * ✒ Other Important Information:
 *     - Dependencies: the feature modules it lists
 *     - Compatible platforms: any browser with ES2022 modules
 *     - Key allocation: I is Interiors; T , . < > are Time; B H J are
 *       Landmarks; Session and Strata have no keys. app.js refuses a
 *       reserved key to any other owner (KEY_OWNERS)
 * ----------------------------------------------------------------------------
 */

/** Feature modules in install order. */
export const FEATURES = [];
