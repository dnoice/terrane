/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Feature Modules (Terrane Edition - v1.8)
 *     - File Name: features.js
 *     - Relative Path: web/js/features.js
 *     - Artifact Type: javascript
 *     - Version: 1.8.0
 *     - Date: 11/15/2026
 *     - Update: Sunday, November 15, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Changelog:
 *     - 1.8.0 (11/15/2026) [dendogg + Anthropic - Claude Opus 5.5] —
 *       Compare, a right-panel tab (compare.js) between Preview and
 *       Cleanup, after the Shelf; C is Compare's.
 *     - 1.7.0 (11/15/2026) [dendogg + Anthropic - Claude Opus 5.5] — The
 *       Shelf, the right panel's fourth tab (shelf.js), after Cleanup; K
 *       is the Shelf's.
 *     - 1.6.0 (11/15/2026) [dendogg + Anthropic - Claude Opus 5.5] —
 *       Cleanup, the right panel's third tab (cleanup.js), after duplicate
 *       cleanup.
 *     Earlier entries: see CHANGELOG.md
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
 *       ESCAPE, PIN_SOURCES, TIP_LINES, INSPECTOR.focus, .node and
 *       .many, READING, TABS, B_TABS, LAYOUT_OPTS, MENU, AFTER_LAYOUT,
 *       AFTER_REFRESH, AFTER_SURVEY, AFTER_OP, AFTER_QUERY, SURVEY,
 *       COMMANDS, LEDGER_SUB, AFTER_FOCUS, AFTER_SELECT, TAB_SECTIONS,
 *       RENAME_MANY, DUP_GROUP, and the QUERY.is and QUERY.prefix
 *       search tokens
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
 *     - Dependencies: the feature modules it lists: time.js, landmarks.js,
 *       traverse.js, strata.js, interior.js, palette.js, resume.js,
 *       searches.js, quicklook.js, presets.js, preview.js, batch.js,
 *       dupes.js, cleanup.js, shelf.js, compare.js, copyas.js, exports.js,
 *       terminal.js, flavors.js
 *     - B_TABS: the Inspector (the controller's) 0, Preview 20, Compare
 *       25, Cleanup 30, Shelf 40
 *     - Registry entries a feature adds carry owner: '<feature>', so a
 *       check can tell them from the controller's own
 *     - Compatible platforms: any browser with ES2022 modules
 *     - Key allocation: I is Interiors; T , . < > are Time; B H J are
 *       Landmarks; P is Quick look's; K is the Shelf's (the selection on
 *       or off the shelf); C is Compare's (the selection's folder with
 *       another); Ctrl+K is the command palette's; Preview binds
 *       none (its keys act inside its pane, K there the Shelf's entry);
 *       Cleanup binds none (its keys act inside its tab);
 *       F2 with several selected is the batch rename's, through the
 *       controller's own F2; Session, Strata, the remembered view,
 *       searches, duplicate cleanup, copy as, the exports and the
 *       terminal have no keys.
 *       app.js refuses a reserved key to any other owner (KEY_OWNERS)
 * ----------------------------------------------------------------------------
 */

import * as time from './time.js';
import * as landmarks from './landmarks.js';
import * as traverse from './traverse.js';
import * as strata from './strata.js';
import * as interior from './interior.js';
import * as palette from './palette.js';
import * as resume from './resume.js';
import * as searches from './searches.js';
import * as quicklook from './quicklook.js';
import * as presets from './presets.js';
import * as preview from './preview.js';
import * as batch from './batch.js';
import * as dupes from './dupes.js';
import * as cleanup from './cleanup.js';
import * as shelf from './shelf.js';
import * as compare from './compare.js';
import * as copyas from './copyas.js';
import * as exportLists from './exports.js';
import * as terminal from './terminal.js';
import * as flavors from './flavors.js';

/** Feature modules in install order. */
export const FEATURES = [time, landmarks, traverse, strata, interior, palette, resume, searches, quicklook, presets, preview, batch, dupes, cleanup, shelf, compare, copyas, exportLists, terminal, flavors];
