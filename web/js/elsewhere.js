/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Not Served Here (Terrane Edition - v1.0)
 *     - File Name: elsewhere.js
 *     - Relative Path: web/js/elsewhere.js
 *     - Artifact Type: javascript
 *     - Version: 1.0.0
 *     - Date: 11/13/2026
 *     - Update: Friday, November 13, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Changelog:
 *     - 1.0.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] —
 *       Initial release: a page the service did not serve says that
 *       Terrane runs from its local service and how to start it, instead
 *       of "The service answered 404.", and the loading sheet leaves.
 *
 * ✒ Description:
 *     Tells a page that was not served by the Terrane service what it is
 *     looking at. Opened from disk, from another server (a code editor's
 *     live server) or from GitHub Pages, the page still holds the token
 *     placeholder the service fills in, so nothing it asks for can answer.
 *     This script sees the placeholder before any request is made and
 *     says plainly how to start Terrane.
 *
 * ✒ Key Features:
 *     - A classic script, so it runs from disk too, where browsers refuse
 *       to load the page's modules
 *     - Sends the loading sheet away at once, so the sentence can be read
 *     - Names where the page was opened from, the command that starts the
 *       service, the address it prints, and the repository
 *     - Marks the page (html[data-elsewhere]) so app.js makes no request
 *     - Leaves only the explanation in the tab order
 *     - Does nothing at all on a page the service served
 *
 * ✒ Usage Instructions:
 *     Loaded by web/index.html with defer, before js/app.js. app.js reads
 *     the same placeholder and stops before its first request.
 *
 * ✒ Other Important Information:
 *     - Dependencies: none; reads #splash, #veil and the terrane-token meta
 *       tag of web/index.html, styled by #veil.is-elsewhere in stage.css
 *     - Compatible platforms: any browser
 * ----------------------------------------------------------------------------
 */

(() => {
  const meta = document.querySelector('meta[name="terrane-token"]');
  // Split, so the service's one replacement in the page can never land here.
  const PLACEHOLDER = ['__TERRANE', 'TOKEN__'].join('_');
  if (!meta || meta.content !== PLACEHOLDER) return;
  const doc = document.documentElement;
  doc.dataset.elsewhere = '';
  document.title = 'Terrane · start the local service';

  const splash = document.getElementById('splash');
  if (splash) {
    splash.hidden = true;
    splash.replaceChildren();
  }
  // Nothing on the page can work without the service: only the
  // explanation stays in the tab order.
  for (const sel of ['.skip', '#bar', '#ledger', '#inspector', '#block', '.view-tools', '.hud']) {
    for (const el of document.querySelectorAll(sel)) el.inert = true;
  }

  const make = (tag, attrs, ...kids) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) el.setAttribute(k, v);
    el.append(...kids);
    return el;
  };
  const where = location.protocol === 'file:' ? 'from a file on disk' : `from ${location.origin}`;
  const REPO = 'https://github.com/dnoice/terrane';
  const veil = document.getElementById('veil');
  if (!veil) return;
  veil.className = 'is-elsewhere';
  veil.replaceChildren(make('div', { class: 'elsewhere', role: 'alert' },
    make('strong', {}, 'Terrane runs from its local service'),
    make('p', {}, `This page was opened ${where}, not from the Terrane service, so it has no directory to show.`),
    make('p', {}, 'Start the service on the directory you want to explore, then open the address it prints, http://127.0.0.1:4173/ unless that port is taken:'),
    make('code', {}, 'npm start -- <directory>'),
    make('p', {}, 'Terrane, and how to start it: ', make('a', { href: REPO }, 'github.com/dnoice/terrane'))));
  veil.hidden = false;
})();
