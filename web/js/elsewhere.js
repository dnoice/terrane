/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Not Served Here (Terrane Edition - v1.1)
 *     - File Name: elsewhere.js
 *     - Relative Path: web/js/elsewhere.js
 *     - Artifact Type: javascript
 *     - Version: 1.1.0
 *     - Date: 11/13/2026
 *     - Update: Friday, November 13, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Changelog:
 *     - 1.1.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] — A
 *       page opened over http or https without the service, as on GitHub
 *       Pages, runs the demo world (demo.js) instead, so this script now
 *       speaks only for a page opened from disk.
 *     - 1.0.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] —
 *       Initial release: a page the service did not serve says that
 *       Terrane runs from its local service and how to start it, instead
 *       of "The service answered 404.", and the loading sheet leaves.
 *
 * ✒ Description:
 *     Tells a page opened from disk what it is looking at. Such a page
 *     still holds the token placeholder the service fills in, and the
 *     browser will not load its modules, so nothing can run; this script
 *     sees the placeholder before anything else and says plainly how to
 *     start Terrane. Over http or https (GitHub Pages, another server)
 *     the page runs the demo world instead and this script stands aside.
 *
 * ✒ Key Features:
 *     - A classic script, so it runs from disk too, where browsers refuse
 *       to load the page's modules
 *     - Sends the loading sheet away at once, so the sentence can be read
 *     - Names where the page was opened from, the command that starts the
 *       service, the address it prints, and the repository
 *     - Marks the page (html[data-elsewhere]) so app.js makes no request
 *     - Leaves only the explanation in the tab order
 *     - Does nothing at all on a page the service served, or on one
 *       opened over http or https, where the demo world runs
 *
 * ✒ Usage Instructions:
 *     Loaded by web/index.html with defer, before js/app.js. app.js reads
 *     the same placeholder: over http or https it starts the demo world,
 *     and should the demo fail to start it says the same thing here.
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
  // Over http or https the demo world runs in the page (app.js, demo.js).
  if (location.protocol === 'http:' || location.protocol === 'https:') return;
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
