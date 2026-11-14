/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Feature Modules (Terrane Edition - v1.3)
 *     - File Name: features.js
 *     - Relative Path: web/js/features.js
 *     - Artifact Type: javascript
 *     - Version: 1.3.0
 *     - Date: 11/13/2026
 *     - Update: Friday, November 13, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Changelog:
 *     - 1.3.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] — The
 *       sixth to eighth, finding your way: the command palette, Ctrl+K
 *       (palette.js); the remembered view and links, a reload and an
 *       address coming back to a folder (resume.js); and the search
 *       history, saved searches and in: (searches.js). Then, looking
 *       before you act: Quick look, P (quicklook.js); the selection's
 *       total and the Survey's Quick searches (presets.js). Then, acting
 *       on many: the batch rename, F2 with several selected (batch.js);
 *       duplicate cleanup (dupes.js); and copy as (copyas.js). Then,
 *       getting things in and out: lists saved as CSV (exports.js).
 *     - 1.2.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] — The
 *       third: Session traverse, working sessions as a search and a route
 *       (traverse.js). The fourth: Strata, bytes by last change and the
 *       Age lens's typical age for closed masses (strata.js). The fifth:
 *       Interiors, a zip archive looked inside as a walled floor
 *       (interior.js).
 *     - 1.1.0 (11/12/2026) [dendogg + Anthropic - Claude Opus 5.5] — The
 *       first feature: Time, the date scrub (time.js). The second:
 *       Landmarks, benchmarks and the return point (landmarks.js).
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
 *       .many, READING, TABS, LAYOUT_OPTS, MENU, AFTER_LAYOUT,
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
 *       searches.js, quicklook.js, presets.js, batch.js, dupes.js,
 *       copyas.js, exports.js
 *     - Registry entries a feature adds carry owner: '<feature>', so a
 *       check can tell them from the controller's own
 *     - Compatible platforms: any browser with ES2022 modules
 *     - Key allocation: I is Interiors; T , . < > are Time; B H J are
 *       Landmarks; P is Quick look's; Ctrl+K is the command palette's;
 *       F2 with several selected is the batch rename's, through the
 *       controller's own F2; Session, Strata, the remembered view,
 *       searches, duplicate cleanup, copy as and the exports have no
 *       keys.
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
import * as batch from './batch.js';
import * as dupes from './dupes.js';
import * as copyas from './copyas.js';
import * as exportLists from './exports.js';

/** Feature modules in install order. */
export const FEATURES = [time, landmarks, traverse, strata, interior, palette, resume, searches, quicklook, presets, batch, dupes, copyas, exportLists];
