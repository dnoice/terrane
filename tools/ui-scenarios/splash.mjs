/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Loading Sheet Scenario (Terrane Edition - v1.1)
 *     - File Name: splash.mjs
 *     - Relative Path: tools/ui-scenarios/splash.mjs
 *     - Artifact Type: test
 *     - Version: 1.1.0
 *     - Date: 11/13/2026
 *     - Update: Friday, November 13, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Changelog:
 *     - 1.1.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] —
 *       The reduced-motion reload no longer times out. With reduced
 *       motion the sheet leaves the moment the survey is done, and on
 *       the fixture that can be before the first look, so the check
 *       waited for a sheet that had already been and gone. A recorder
 *       installed for the new document notes the sheet from its first
 *       frame, and the reduced-motion checks read that record when the
 *       sheet has gone, with a note saying how long it was up.
 *     - 1.0.0 (11/12/2026) [dendogg + Anthropic - Claude Opus 5.5] —
 *       Initial release.
 *
 * ✒ Description:
 *     Checks the loading sheet (#splash, web/js/splash.js) in the real
 *     page, in both passes. The page is reloaded so the sheet can be seen
 *     from its first frame: it must cover the page and keep the keyboard
 *     out of it, say what is happening, leave once the first survey is
 *     drawn, and give the page back exactly as it found it. A second
 *     reload asks for reduced motion, where the sheet must not move.
 *
 * ✒ Key Features:
 *     - After openApp: the host is a polite status region, hidden and
 *       empty, and no region of the page is inert
 *     - While the sheet is up: the skip link, location bar, main area and
 *       title block are inert, the status line says what is happening,
 *       the phase is intro or loading, and Tab cannot reach the page
 *     - Once the survey is done: a key skips the rest of the intro and the
 *       sheet is gone within 3 s (skipped with a note when the survey took
 *       longer than the intro)
 *     - After the sheet: hidden, empty, phase done, no effect left on the
 *       host, every region usable again
 *     - Reduced motion: the whole T is shown at once, nothing on the sheet
 *       is running, and the sheet leaves with no exit motion; a sheet that
 *       comes and goes between two looks is read from a record the page
 *       keeps from its first frame
 *
 * ✒ Usage Instructions:
 *     node tools/ui-check.mjs splash
 *     node tools/ui-check.mjs splash --pass nogl
 *
 * ✒ Other Important Information:
 *     - Dependencies: tools/ui-check.mjs (the context t)
 *     - Compatible platforms: Node.js 22.5+
 * ----------------------------------------------------------------------------
 */

/** Everything about the sheet and the regions it covers, read in one go. */
const SHEET = () => {
  const s = document.getElementById('splash');
  const regions = [document.querySelector('.skip'), document.getElementById('bar'), document.querySelector('main'), document.getElementById('block')];
  const a = document.activeElement;
  return {
    present: !!s,
    up: !!s && !s.hidden,
    children: s ? s.childElementCount : 0,
    phase: s?.dataset.phase || '',
    role: s?.getAttribute('role') || '',
    live: s?.getAttribute('aria-live') || '',
    status: s?.querySelector('.splash-status')?.textContent?.replace(/\s+/g, ' ').trim() || '',
    whole: !!s?.querySelector('.tsp-whole:not([data-off])'),
    inert: regions.map((r) => !!r?.inert),
    effects: s ? s.getAnimations({ subtree: true }).length : 0,
    running: s ? s.getAnimations({ subtree: true }).filter((x) => x.playState === 'running').length : 0,
    focusInPage: !!a && a !== document.body && regions.some((r) => r?.contains(a)),
    ready: !!window.__terrane && !window.__terrane.S.scanning,
  };
};

/**
 * A page-side predicate over SHEET, as source text: t.app sends a function
 * to the page as text, and the page's content security policy forbids
 * eval, so SHEET is spliced in here rather than passed as an argument.
 */
const when = (test) => `() => { const s = (${SHEET})(); return (${test}) && s; }`;

/**
 * Installed for the next document before a reload: keeps a record of the
 * sheet from its first frame, so a sheet that comes and goes between two
 * looks is still seen. It notes when the sheet was first up, whether the
 * whole T was showing, whether it was ever up with nothing running, and
 * when it went.
 */
const RECORDER = `(() => {
  const look = () => {
    const s = document.getElementById('splash');
    const r = window.__sheetSeen;
    if (!s || s.hidden || !s.children.length) {
      if (r && !r.goneAt) r.goneAt = performance.now();
      return;
    }
    const seen = r || (window.__sheetSeen = { at: performance.now(), whole: false, still: false, goneAt: 0 });
    const running = s.getAnimations({ subtree: true }).filter((x) => x.playState === 'running').length;
    seen.whole = seen.whole || !!s.querySelector('.tsp-whole:not([data-off])');
    if (running === 0) seen.still = true;
  };
  new MutationObserver(look).observe(document, { childList: true, subtree: true, attributes: true });
})();`;

/**
 * Reloads the page and waits until the new sheet is up. With orSeen, a new
 * page that is already ready, its sheet already gone, also ends the wait,
 * provided the recorder saw the sheet: the old page never has a record.
 */
async function reloadToSheet(t, { orSeen = false } = {}) {
  await t.eval(() => { setTimeout(() => location.reload(), 0); return true; });
  await t.sleep(200);
  const test = orSeen ? '(s.up && s.children > 0) || (s.ready && !!window.__sheetSeen)' : 's.up && s.children > 0';
  return t.waitFor(when(test), { timeout: 20000, what: 'the loading sheet after a reload' });
}

/** Waits until the survey of the reloaded page is done; returns the sheet then. */
function untilReady(t) {
  return t.waitFor(when('s.ready'), { timeout: 120000, interval: 25, what: 'the survey after a reload' });
}

/** Waits until the sheet has gone; returns the sheet then. */
function untilGone(t, timeout) {
  return t.until(when('!s.up'), { timeout, interval: 25 });
}

/** The checks that hold once the sheet has gone. */
function checkGone(t, label, s) {
  t.check(`${label}: the sheet is hidden and empty`, s && !s.up && s.children === 0, JSON.stringify(s));
  t.check(`${label}: its phase is done and no effect is left on it`, s && s.phase === 'done' && s.effects === 0, JSON.stringify(s && { phase: s.phase, effects: s.effects }));
  t.check(`${label}: every region of the page is usable again`, s && s.inert.every((x) => !x), JSON.stringify(s?.inert));
}

const splash = {
  name: 'splash',
  title: 'The loading sheet',
  timeout: 300000,
  async run(t) {
    // The page openApp gave us: the sheet has been and gone.
    const after = await t.eval(SHEET);
    t.check('the page has a loading sheet host', after.present, JSON.stringify(after));
    t.check('the host is a polite status region', after.role === 'status' && after.live === 'polite', `${after.role} ${after.live}`);
    t.check('on a ready page the sheet is hidden and empty', !after.up && after.children === 0, JSON.stringify(after));
    t.check('on a ready page no region is inert', after.inert.every((x) => !x), JSON.stringify(after.inert));

    // A reload shows the sheet from its first frame.
    const up = await reloadToSheet(t);
    await t.shot('sheet-up');
    t.check('while the sheet is up, the skip link, bar, main area and title block are inert', up.inert.every(Boolean), JSON.stringify(up.inert));
    t.check('the status line says what is happening', up.status.length > 0 && up.status !== 'Terrane is ready', up.status);
    t.check('the sheet starts in its intro or loading phase', up.phase === 'intro' || up.phase === 'loading', up.phase);
    t.check('the sheet is moving', up.running > 0, `${up.running} running`);
    if (!up.ready) {
      await t.key('Tab');
      const tabbed = await t.eval(SHEET);
      t.check('Tab cannot reach the page beneath the sheet', !tabbed.focusInPage, await t.focused());
    } else t.skip('Tab cannot reach the page beneath the sheet', 'the survey was done before the first look');

    // The survey finishes; a key skips what is left of the intro.
    const ready = await untilReady(t);
    if (ready.up && ready.phase === 'intro') {
      const t0 = Date.now();
      await t.key('Escape');
      const gone = await untilGone(t, 6000);
      const ms = Date.now() - t0;
      t.check('once the survey is done, a key skips the intro and the sheet leaves within 3 s', gone && ms <= 3000, `${ms} ms`);
      checkGone(t, 'after a skip', gone || await t.eval(SHEET));
    } else {
      t.note(`the sheet was already ${ready.up ? ready.phase : 'gone'} when the survey finished`);
      t.skip('a key skips the intro', 'the survey took longer than the intro');
      checkGone(t, 'after the sheet', await untilGone(t, 15000) || await t.eval(SHEET));
    }

    // Reduced motion: the sheet shows the whole T and does not move. It
    // leaves the moment the survey is done, which on the fixture can be
    // before the first look, so the page keeps its own record of the sheet.
    await t.page.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    const { identifier } = await t.page.send('Page.addScriptToEvaluateOnNewDocument', { source: RECORDER });
    try {
      await reloadToSheet(t, { orSeen: true });
      const still = await t.until(when('!s.up || s.running === 0'), { timeout: 2000, interval: 25 });
      const seen = await t.eval(() => window.__sheetSeen || null);
      if (still?.up) {
        t.check('with reduced motion the whole T is shown at once', still.whole, JSON.stringify(still));
        t.check('with reduced motion nothing on the sheet is running', still.running === 0, `${still.running} running`);
      } else if (seen) {
        const ms = seen.goneAt ? Math.round(seen.goneAt - seen.at) : null;
        t.note(`with reduced motion the sheet was up for ${ms ?? '?'} ms, gone before the first look; read from the page's record`);
        t.check('with reduced motion the whole T is shown at once', seen.whole, JSON.stringify(seen));
        t.check('with reduced motion nothing on the sheet is running', seen.still, JSON.stringify(seen));
      } else t.skip('with reduced motion the sheet does not move', 'the sheet had gone before it could be read');
      const readyRm = await untilReady(t);
      const t0 = Date.now();
      const goneRm = readyRm.up ? await untilGone(t, 5000) : readyRm;
      const ms = Date.now() - t0;
      t.check('with reduced motion the sheet leaves with no exit motion', goneRm && ms <= 800, `${ms} ms`);
      checkGone(t, 'with reduced motion', goneRm || await t.eval(SHEET));
    } finally {
      await t.page.send('Page.removeScriptToEvaluateOnNewDocument', { identifier });
      await t.page.send('Emulation.setEmulatedMedia', { features: [] });
    }
  },
};

export default splash;
