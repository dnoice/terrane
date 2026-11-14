/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Region Worker (Terrane Edition - v1.0)
 *     - File Name: region-worker.js
 *     - Relative Path: web/js/region-worker.js
 *     - Artifact Type: javascript
 *     - Version: 1.0.0
 *     - Date: 11/14/2026
 *     - Update: Saturday, November 14, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Changelog:
 *     - 1.0.0 (11/14/2026) [dendogg + Anthropic - Claude Opus 5.5] —
 *       Initial release.
 *
 * ✒ Description:
 *     A module worker that fetches region answers from the service and
 *     decodes them into columns, so the page's main thread never parses a
 *     region's JSON. A 5,000-folder region is about 2.5 MB of it; here it
 *     is read, parsed and decoded, and only typed arrays and name lists
 *     cross back, their buffers transferred.
 *
 * ✒ Key Features:
 *     - { type: 'init', token } once, then { id, url } per request, or
 *       { id, url, json: true } for an answer that is not a region's (a
 *       search, the survey, marks, sessions, places): it is parsed here and
 *       crosses back as { id, ok: true, bytes, json }
 *     - Fetches with X-Terrane-Token, reads the text (its length is the
 *       answer's size), parses it and runs regions.js decode()
 *     - Answers { id, ok: true, bytes, v, anchor, regions, more, target,
 *       up, gone } with every typed array's buffer transferred
 *     - An error answers { id, ok: false, status, code, message } with
 *       the service's code and sentence, ESTALE and ENOENT included
 *     - No DOM; from the page's own origin, so default-src 'self' allows it
 *
 * ✒ Usage Instructions:
 *     const w = new Worker(new URL('./region-worker.js', import.meta.url), { type: 'module' });
 *     w.postMessage({ type: 'init', token });
 *     w.postMessage({ id: 1, url: '/api/region?v=1&ids=0' });
 *     w.onmessage = (e) => e.data;   // { id, ok, ... }
 *
 * ✒ Examples:
 *     { id: 4, ok: true, bytes: 210334, v: 1, regions: [...], more: [] }
 *     { id: 5, ok: false, status: 409, code: 'ESTALE', message: '...' }
 *     { id: 6, ok: false, status: 0, code: 'EFETCH', message: '...' }
 *
 * ✒ Other Important Information:
 *     - Dependencies: regions.js (decode, transferables)
 *     - Compatible platforms: browsers with module workers
 *     - Limitations: the demo world answers /api/ inside the page, which a
 *       worker's fetch never reaches, so the demo decodes on the main thread
 * ----------------------------------------------------------------------------
 */

import { decode, transferables } from './regions.js';

let token = '';

self.onmessage = async (e) => {
  const m = e.data || {};
  if (m.type === 'init') {
    token = String(m.token || '');
    return;
  }
  const { id, url, json } = m;
  try {
    const res = await fetch(url, { headers: { 'X-Terrane-Token': token } });
    const text = await res.text();
    if (!res.ok) {
      let body = {};
      try {
        body = JSON.parse(text);
      } catch { /* not JSON */ }
      self.postMessage({
        id, ok: false, status: res.status, code: body.code || String(res.status), message: body.message || `The service answered ${res.status}.`,
        v: body.v ?? null, deepest: body.deepest ?? null,
      });
      return;
    }
    if (json) {
      self.postMessage({ id, ok: true, bytes: text.length, json: JSON.parse(text) });
      return;
    }
    const out = decode(JSON.parse(text));
    self.postMessage({ id, ok: true, bytes: text.length, ...out }, transferables(out));
  } catch (err) {
    self.postMessage({ id, ok: false, status: 0, code: 'EFETCH', message: err?.message || String(err) });
  }
};
