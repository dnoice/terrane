/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Preview Scenarios (Terrane Edition - v1.0)
 *     - File Name: preview.mjs
 *     - Relative Path: tools/ui-scenarios/preview.mjs
 *     - Artifact Type: test
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
 *     Drives panel B's tab strip and its Preview tab in the real page, by
 *     keyboard where a person would, in both passes: what it reads and
 *     asks the service for, what it says when there is nothing to show,
 *     how it steps, and that it does no work while it cannot be seen.
 *
 * ✒ Key Features:
 *     - preview (read-only fixture): the strip, Inspector first and drawn,
 *       no raw read before Preview is chosen; the strip's arrows, Home and
 *       End, Home leaving the eye where it was; the tab kept over a
 *       reload; a text file's numbered lines (one read, 256 KB at most);
 *       the cut line, Wrap lines kept, a long line scrolled first; a held
 *       arrow over 15 rows read once or twice; steps in the pane; Quick
 *       look from it and back, Preview asking nothing while the sheet is
 *       open; a picture with no raw read; sound and film in byte ranges,
 *       emptied by a step; zip listings, a damaged zip's sentence, a 7z
 *       asked for nothing; Look inside and I; a link's target; a folder's
 *       summary, its rows and the way back up; four selected, one read and
 *       back; snapshot mode for a moment; ] hiding panel B; the palette's
 *       Show Preview with panel B hidden; the Guide's rows; no POST
 *     - preview-regions (threshold 0): a folder not held shows its figures
 *       and then its largest rows; a file reads; Findings' refs step
 *     - preview-disk (writes): a text of 6,500 lines cut at 256 KB,
 *       numbered 1 to its last line read, built in one short task
 *       (terrane:preview-text), and one End reaching its end; a file and
 *       a folder deleted from outside; a file grown on disk read again
 *
 * ✒ Usage Instructions:
 *     node tools/ui-check.mjs preview preview-regions preview-disk --no-shots --port 5300
 *
 * ✒ Other Important Information:
 *     - Dependencies: tools/ui-check.mjs (the context t); the fixture's
 *       archives (site, hazards, truncated, packed.7z), edge cases
 *       (copy-a.dat, its link when links can be made), bulk-write and its
 *       random pictures, sound and film
 *     - Compatible platforms: Node.js 22.5+
 * ----------------------------------------------------------------------------
 */

import fs from 'node:fs';

/** Preview as it stands, read in the page. */
const pv = () => {
  const P = document.getElementById('b-panel-preview');
  const q = (s) => P?.querySelector(s);
  const all = (s) => [...(P?.querySelectorAll(s) || [])];
  const a = document.activeElement;
  return {
    shown: !!P && !P.hidden && getComputedStyle(document.getElementById('inspector')).visibility === 'visible',
    kind: q('.pv-kind-words')?.textContent ?? null,
    name: q('.insp-name')?.textContent ?? null,
    facts: q('.pv-facts')?.textContent ?? null,
    cut: q('.pv-cut:not([hidden])')?.textContent ?? null,
    where: q('.pv-where:not([hidden])')?.textContent ?? null,
    lines: all('.pv-line').length,
    // The numbers the lines carry (the first 50), and whether the first is
    // drawn: its ::before takes room beside the text.
    nums: all('.pv-line').slice(0, 50).map((l) => l.dataset.n),
    lastNum: all('.pv-line').at(-1)?.dataset.n ?? null,
    chunks: all('.pv-chunk').length,
    numbersDrawn: (() => {
      const l = q('.pv-line');
      if (!l) return false;
      const cs = getComputedStyle(l, '::before');
      // The computed content is the attribute's value, or attr() itself.
      return (cs.content.startsWith(`"${l.dataset.n}"`) || /attr\(data-n\)/.test(cs.content)) && cs.display !== 'none' && `${cs.content}`;
    })(),
    notes: all('.pv-note:not([hidden])').map((n) => n.textContent),
    heads: all('.section-title .t').map((n) => n.textContent),
    rows: all('.pv-rows .item .nm').map((n) => n.textContent),
    tools: all('.pv-tools .btn:not([hidden])').map((b) => b.textContent.trim()),
    peek: q('.pv-peek:not([hidden]) .pv-peek-text')?.textContent ?? null,
    busy: q('.pv-pane')?.getAttribute('aria-busy') ?? null,
    done: q('.pv-pane')?.dataset.shown ?? null,
    nowrap: !!q('.pv-text.is-nowrap'),
    img: q('.pv-picture img')?.getAttribute('src') ?? null,
    player: q('.pv-player audio, .pv-player video')?.tagName.toLowerCase() ?? null,
    playerAttrs: q('.pv-player audio, .pv-player video') ? { autoplay: q('.pv-player audio, .pv-player video').autoplay, preload: q('.pv-player audio, .pv-player video').getAttribute('preload') } : null,
    focus: a === q('.pv-pane') ? 'pane' : P?.contains(a) ? (a.dataset?.k || a.className || a.tagName) : (a?.id || a?.className || a?.tagName || 'body'),
  };
};

/** The /api/raw requests made since mark: { path, max, status, range }. */
const raws = (t, since) => t.requests(since).filter((r) => r.path === '/api/raw').map((r) => {
  const q = new URL(r.url).searchParams;
  return { path: q.get('path'), max: Number(q.get('max')), status: r.status, range: r.headers?.Range || r.headers?.range || null };
});
const asked = (t, since, route) => t.requests(since).filter((r) => r.path === `/api/${route}`).map((r) => new URL(r.url).searchParams.get('path'));

/** Lines in a text as the gutter numbers them: a final newline ends the last one. */
const countLines = (text) => (text ? text.split(/\r\n|\n|\r/).length - (/[\r\n]$/.test(text) ? 1 : 0) : 0);

/** Shows Contents of rel's folder with rel selected, the list's cursor on it and the list focused. */
async function goTo(t, rel) {
  const ok = await t.app((T, r) => {
    const node = T.S.model.find(r);
    if (!node) return false;
    T.api.setFocus(node.p || node);
    return true;
  }, rel);
  if (!ok) return false;
  await t.until((T, r) => T.S.focus === T.S.model.find(r).p, { args: [rel], timeout: 15000 });
  await t.settle();
  return t.app((T, r) => {
    const node = T.S.model.find(r);
    T.S.tab = 'contents';
    T.api.drawLedger();
    T.api.select(node);
    T.api.cursorTo(node);
    document.getElementById('ledger-list').focus();
    return true;
  }, rel);
}

/**
 * Waits until Preview has drawn the item named name, its read done, and
 * fn(state) holds. The test is put together here as source, since the
 * page runs no eval.
 */
const until = (t, name, fn = () => true, what = '') => t.waitFor(
  `(_T, n) => { const st = (${pv})(); return st.name === n && st.done === n && st.busy === null && (${fn})(st) && st; }`,
  { args: [name], timeout: 8000, what: what || `Preview of ${name}` },
);

/** The first file under the root whose extension is one of exts, by size within [min, max]. */
const findFile = (t, exts, min = 1024, max = 4 * 1024 * 1024) => t.app((T, list, lo, hi) => {
  let best = null;
  const stack = [T.S.model.root];
  while (stack.length) {
    for (const c of stack.pop().c) {
      if (c.d) {
        if (!c.n.startsWith('.')) stack.push(c);
      } else {
        const ext = c.n.includes('.') ? c.n.slice(c.n.lastIndexOf('.') + 1).toLowerCase() : '';
        if (list.includes(ext) && c.s >= lo && c.s <= hi && !(c.f & 1) && (!best || c.s < best.s)) best = c;
      }
    }
  }
  return best && { rel: T.api.relPath(best), name: best.n, size: best.s };
}, exts, min, max);

const preview = {
  name: 'preview',
  title: 'Preview: panel B\'s strip and its Preview tab, by keyboard',
  data: 'fixture',
  timeout: 300000,
  async run(t) {
    await t.settle();

    /* ---- the strip, the Inspector first ---- */
    const s0 = await t.app((T) => ({
      tabs: [...document.querySelectorAll('#b-tabs [role=tab]')].map((b) => `${b.dataset.btab}:${b.textContent}:${b.getAttribute('aria-selected')}`),
      bTab: T.S.bTab, insp: !document.getElementById('inspector-body').hidden && document.getElementById('inspector-body').children.length > 0,
      panel: document.getElementById('b-panel-preview')?.hidden, label: document.getElementById('b-tabs').getAttribute('aria-label'),
      icons: [...document.querySelectorAll('#b-tabs [role=tab] use')].map((u) => u.getAttribute('href').split('#')[1]),
    }));
    const rawsAtStart = raws(t, 0);
    t.check('panel B\'s strip reads Inspector, Preview, the Inspector chosen and drawn, each with its icon',
      JSON.stringify(s0.tabs) === JSON.stringify(['inspector:Inspector:true', 'preview:Preview:false']) && s0.bTab === 'inspector' && s0.insp && s0.panel === true
      && s0.label === 'Inspector views' && JSON.stringify(s0.icons) === JSON.stringify(['info', 'eye']), JSON.stringify(s0));
    t.check('nothing is read from a file before Preview is chosen', rawsAtStart.length === 0, JSON.stringify(rawsAtStart));

    // Tab to the strip; the arrows choose and move focus; Home leaves the eye where it was.
    await t.tabTo('#b-tabs [data-btab=inspector]', { max: 120 });
    await t.key('ArrowRight');
    const r1 = await t.waitFor((T) => T.S.bTab === 'preview' && {
      focus: document.activeElement?.dataset?.btab, panel: !document.getElementById('b-panel-preview').hidden, insp: document.getElementById('inspector-body').hidden,
      kept: localStorage.getItem('terrane.panel-b-tab'),
    }, { what: 'Preview chosen by ArrowRight' });
    t.check('ArrowRight on the strip chooses Preview: its panel shows, the Inspector\'s hides, focus on its tab, the choice kept',
      r1.focus === 'preview' && r1.panel && r1.insp && r1.kept === 'preview', JSON.stringify(r1));
    const eye0 = await t.app((T) => ({ focus: T.api.relPath(T.S.focus), cam: T.S.noGL ? null : JSON.stringify([T.S.view.cam?.x, T.S.view.cam?.y, T.S.view.cam?.z]) }));
    await t.key('Home');
    const r2 = await t.waitFor((T) => T.S.bTab === 'inspector' && { focus: document.activeElement?.dataset?.btab, flight: T.S.noGL ? null : !!T.S.view.flight, at: T.api.relPath(T.S.focus) }, { what: 'Home to the Inspector' });
    await t.sleep(250);
    const eye1 = await t.app((T) => ({ focus: T.api.relPath(T.S.focus), cam: T.S.noGL ? null : JSON.stringify([T.S.view.cam?.x, T.S.view.cam?.y, T.S.view.cam?.z]), flight: T.S.noGL ? null : !!T.S.view.flight }));
    t.check('Home on the strip chooses the first tab and leaves the eye where it was (no flight to the overview)',
      r2.focus === 'inspector' && !r2.flight && !eye1.flight && eye1.focus === eye0.focus && eye1.cam === eye0.cam, JSON.stringify({ r2, eye0, eye1 }));
    await t.key('End');
    const r3 = await t.waitFor((T) => T.S.bTab === 'preview' && document.activeElement?.dataset?.btab === 'preview', { what: 'End to Preview' }).catch(() => false);
    await t.key('ArrowRight');
    const r4 = await t.waitFor((T) => T.S.bTab === 'inspector' && document.activeElement?.dataset?.btab === 'inspector', { what: 'ArrowRight wrapping' }).catch(() => false);
    await t.key('ArrowLeft');
    const r5 = await t.waitFor((T) => T.S.bTab === 'preview', { what: 'ArrowLeft wrapping' }).catch(() => false);
    t.check('End chooses the last tab, and ArrowRight and ArrowLeft wrap', !!r3 && !!r4 && !!r5);

    // A reload keeps Preview.
    await t.reload();
    const kept = await t.app((T) => ({ bTab: T.S.bTab, panel: !document.getElementById('b-panel-preview').hidden, insp: document.getElementById('inspector-body').hidden, selected: document.getElementById('b-tab-preview').getAttribute('aria-selected') }));
    t.check('a reload opens on Preview, the choice kept in this browser', kept.bTab === 'preview' && kept.panel && kept.insp && kept.selected === 'true', JSON.stringify(kept));
    await t.settle();

    /* ---- a text file ---- */
    const README = 'archives/site/README.md';
    let mark = t.mark();
    t.check('the fixture holds archives/site/README.md', await goTo(t, README));
    const readme = await until(t, 'README.md', (s) => s.lines > 0);
    const want = countLines(fs.readFileSync(t.abs(README), 'utf8'));
    const rr = raws(t, mark);
    t.check(`README.md reads as Markdown text, its ${want} lines numbered 1 to ${want}, each number drawn beside its line`,
      readme.kind === 'Markdown text · .md' && readme.lines === want && JSON.stringify(readme.nums) === JSON.stringify(Array.from({ length: want }, (_, i) => String(i + 1)))
      && readme.numbersDrawn && readme.tools.includes('Wrap lines') && readme.tools.includes('Quick look'), JSON.stringify(readme));
    t.check(`the head says the facts and the folder it is in (${readme.facts}; ${readme.where})`,
      new RegExp(`^\\d+ B · ${want} lines · LF · changed \\d\\d/\\d\\d/\\d{4}$`).test(readme.facts) && readme.where === 'in site', JSON.stringify(readme));
    t.check('one raw read, of README.md, at most 256 KB', rr.length === 1 && rr[0].path === README && rr[0].max === 262144, JSON.stringify(rr));

    /* ---- a long text: cut, wrap, a long line ---- */
    mark = t.mark();
    await goTo(t, 'edge cases/copy-a.dat');
    const copyA = await until(t, 'copy-a.dat', (s) => s.lines > 0);
    t.check(`a text over 256 KB says it was cut (${copyA.cut})`, copyA.cut === 'First 256 KB of 293 KB. The rest is not read.' && /\+ line/.test(copyA.facts), JSON.stringify(copyA));
    await t.eval(() => { document.querySelector('#b-panel-preview [data-k=wrap]').click(); return true; });
    const unwrapped = await t.app(() => ({ nowrap: !!document.querySelector('#b-panel-preview .pv-text.is-nowrap'), pressed: document.querySelector('#b-panel-preview [data-k=wrap]').getAttribute('aria-pressed'), kept: localStorage.getItem('terrane.preview-wrap'), live: document.getElementById('live').textContent }));
    t.check('Wrap lines toggles off: lines run on, the button not pressed, the choice kept, and said',
      unwrapped.nowrap && unwrapped.pressed === 'false' && unwrapped.kept === 'off' && /run on/.test(unwrapped.live), JSON.stringify(unwrapped));
    const rawsWrap = raws(t, mark);
    t.check('the toggle reads nothing again', rawsWrap.length === 1, JSON.stringify(rawsWrap));
    await t.eval(() => { document.querySelector('#b-panel-preview .pv-pane').focus(); return true; });
    await t.key('ArrowRight');
    const scrolled = await t.until(() => {
      const p = document.querySelector('#b-panel-preview .pv-pane');
      return p.scrollLeft > 0 && { left: p.scrollLeft, name: document.querySelector('#b-panel-preview .insp-name').textContent };
    }, { timeout: 2000 });
    const stillA = await t.app((T) => T.S.primary?.n);
    t.check(`unwrapped, ArrowRight scrolls the long line first (${scrolled?.left} px) and stays on copy-a.dat`, !!scrolled && stillA === 'copy-a.dat', JSON.stringify({ scrolled, stillA }));
    await t.eval(() => {
      const p = document.querySelector('#b-panel-preview .pv-pane');
      p.scrollLeft = p.scrollWidth;
      p.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', code: 'ArrowRight', repeat: true, bubbles: true, cancelable: true }));
      return true;
    });
    await t.sleep(300);
    t.check('a key held from scrolling stops at the edge: still copy-a.dat', (await t.app((T) => T.S.primary?.n)) === 'copy-a.dat');
    await t.reload();
    await goTo(t, 'edge cases/copy-a.dat');
    const afterReload = await until(t, 'copy-a.dat', (s) => s.lines > 0);
    t.check('Wrap lines off is kept over a reload', afterReload.nowrap === true, JSON.stringify(afterReload));
    await t.eval(() => { document.querySelector('#b-panel-preview [data-k=wrap]').click(); return true; });
    t.check('and on again wraps', !(await t.eval(pv)).nowrap);

    /* ---- arrowing fast through the list ---- */
    const bulk = t.manifest.bulk;
    await goTo(t, bulk.files[0]);
    // The rows in the order the list shows them, from its first.
    const order = await t.app((T) => {
      const items = T.api.listItems();
      T.api.select(items[0]);
      T.api.cursorTo(items[0]);
      document.getElementById('ledger-list').focus();
      return items.map((n) => n.n);
    });
    await until(t, order[0]);
    mark = t.mark();
    for (let i = 0; i < 15; i++) await t.key('ArrowDown');
    const last = order[15];
    const held = await until(t, last, (s) => s.lines > 0, 'the 16th row after a held arrow');
    await t.sleep(300);
    const heldRaws = raws(t, mark);
    t.check(`↓ held over 15 rows reads at most twice (${heldRaws.length}) and ends on the last row, ${last}`,
      heldRaws.length >= 1 && heldRaws.length <= 2 && heldRaws.at(-1).path === `${bulk.dir}/${last}` && held.name === last, JSON.stringify(heldRaws));

    /* ---- steps in the pane ---- */
    await t.eval(() => { document.querySelector('#b-panel-preview .pv-pane').focus(); return true; });
    await t.key('ArrowRight');
    const stepped = await t.waitFor((T, n) => T.S.primary?.n === n && { primary: T.S.primary.n, cursor: T.list.items[T.list.cursor]?.n, sel: T.S.sel.size, live: document.getElementById('live').textContent, focus: document.activeElement?.className },
      { args: [order[16]], what: 'the next row from the pane' });
    t.check(`→ in the pane selects the next row, moves the list's cursor and says it (${stepped.primary})`,
      stepped.cursor === stepped.primary && stepped.sel === 1 && stepped.live.startsWith(stepped.primary) && /pv-pane/.test(stepped.focus), JSON.stringify(stepped));
    await t.key('End');
    await t.waitFor((T, n) => T.S.primary?.n === n, { args: [order.at(-1)], what: 'End to the last row' });
    await t.key('ArrowRight');
    t.check('End goes to the last row, and → there says Last item', (await t.live()) === 'Last item', await t.live());

    /* ---- Quick look from the pane ---- */
    await until(t, order.at(-1));
    await t.key('p');
    await t.waitFor(() => document.getElementById('dialog').open && !!document.querySelector('#dialog .look-name'), { what: 'Quick look' });
    const lookName = await t.text('#dialog .look-name');
    mark = t.mark();
    await t.key('ArrowLeft');
    const prevFile = `${bulk.dir}/${order.at(-2)}`;
    await t.waitFor((T, n) => T.S.primary?.n === n, { args: [prevFile.split('/').pop()], what: 'Quick look stepping' });
    await t.sleep(400);
    const inSheet = raws(t, mark).filter((r) => r.path === prevFile);
    t.check(`P in the pane opens Quick look on its item (${lookName}); while the sheet is open Preview asks nothing (${inSheet.length} read, Quick look's)`,
      lookName === order.at(-1) && inSheet.length === 1, JSON.stringify(inSheet));
    await t.key('Escape');
    await t.waitFor(() => !document.getElementById('dialog').open);
    const back = await until(t, prevFile.split('/').pop(), (s) => s.lines > 0, 'Preview after Quick look');
    t.check('Escape closes it, focus back in the pane, and Preview reads the item Quick look ended on', back.focus === 'pane', JSON.stringify(back));

    /* ---- a picture, sound and film ---- */
    const pic = await findFile(t, ['png', 'jpg', 'jpeg', 'gif', 'webp'], 1024, 2 * 1024 * 1024);
    if (pic) {
      mark = t.mark();
      await goTo(t, pic.rel);
      const p = await until(t, pic.name, (s) => s.notes.length > 0 || !!s.img);
      await t.sleep(300);
      const pr = raws(t, mark);
      t.check(`a picture asks no raw read (${pic.name}); with no thumbnail it says why and names Quick look`,
        pr.length === 0 && (p.img ? /\/api\/thumb/.test(p.img) : /^No thumbnail yet: pictures are shown from their thumbnails only/.test(p.notes[0]) && /Quick look \(P\)/.test(p.notes[0])), JSON.stringify({ p, pr }));
    } else t.skip('a picture in Preview', 'the fixture holds no picture of 1 KB to 2 MB');
    for (const [what, exts] of [['sound', ['mp3', 'wav', 'flac', 'ogg', 'm4a']], ['film', ['mp4', 'webm', 'mov']]]) {
      const clip = await findFile(t, exts, 1024, 64 * 1024 * 1024);
      if (!clip) {
        t.skip(`a ${what} in Preview`, 'the fixture holds none');
        continue;
      }
      mark = t.mark();
      await goTo(t, clip.rel);
      const m = await until(t, clip.name, (s) => !!s.player || s.notes.length > 0);
      const ranged = await t.poll(() => raws(t, mark).find((r) => r.path === clip.rel && r.status === 206), { timeout: 8000 });
      const attrs = m.playerAttrs;
      t.check(`a ${what} gets the browser's player, nothing playing by itself, its requests in byte ranges answered 206 (${clip.name}; ${m.player || m.notes.at(-1)})`,
        (m.player ? attrs?.autoplay === false && attrs.preload === 'metadata' : /could not be played here/.test(m.notes.at(-1))) && !!ranged && (ranged.range === null || /^bytes=/.test(ranged.range)), JSON.stringify({ m, attrs, ranged }));
      await t.eval(() => { document.querySelector('#b-panel-preview .pv-pane').focus(); return true; });
      await t.key('ArrowRight');
      await t.sleep(250);
      const holding = await t.eval(() => [...document.querySelectorAll('audio, video')].filter((x) => x.getAttribute('src') || !x.paused).length);
      t.check(`a step empties the ${what}'s player`, holding === 0, String(holding));
    }

    /* ---- archives ---- */
    const A = t.manifest.archives;
    mark = t.mark();
    await goTo(t, A.site.path);
    const site = await until(t, 'site.zip', (s) => s.rows.length > 0);
    t.check(`site.zip lists what it holds and its top level (${site.rows.join(', ')}), with Look inside`,
      JSON.stringify(site.rows) === JSON.stringify(['site']) && site.heads.includes('Top level') && site.tools.includes('Look inside') && asked(t, mark, 'inside').length === 1, JSON.stringify(site));
    await goTo(t, A.hazards.path);
    const hz = await until(t, 'hazards.zip', (s) => s.rows.length > 0);
    const hzMarks = await t.eval(() => ({ locked: document.querySelectorAll('#b-panel-preview .swatch.is-locked').length, escape: document.querySelectorAll('#b-panel-preview .swatch.is-escape').length, facts: [...document.querySelectorAll('#b-panel-preview .pv-body .facts dt')].map((d) => d.textContent) }));
    t.check('hazards.zip names one locked entry and one whose name escapes',
      hzMarks.locked === 1 && hzMarks.escape === 1 && hzMarks.facts.includes('Locked') && hzMarks.facts.includes('Escapes'), JSON.stringify({ hz, hzMarks }));
    await goTo(t, A.truncated.path);
    const tr = await until(t, 'truncated.zip', (s) => s.notes.length > 0);
    t.check(`truncated.zip shows the service's sentence (${tr.notes[0]})`, /looks damaged/.test(tr.notes[0] || ''), JSON.stringify(tr));
    mark = t.mark();
    await goTo(t, A.sevenZip.path);
    const seven = await until(t, 'packed.7z', (s) => s.notes.length > 0);
    t.check('packed.7z asks the service nothing and names zip', asked(t, mark, 'inside').length === 0 && /zip archives/.test(seven.notes[0]), JSON.stringify(seven));
    // Look inside opens the interior; I closes it.
    await goTo(t, A.site.path);
    await until(t, 'site.zip', (s) => s.rows.length > 0);
    await t.eval(() => { [...document.querySelectorAll('#b-panel-preview .pv-tools .btn')].find((b) => /Look inside/.test(b.textContent)).click(); return true; });
    const opened = await t.waitFor((T) => !!T.S.interior && T.S.interior.host.n === 'site.zip', { what: 'the interior', timeout: 10000 }).catch(() => false);
    const closeBtn = await t.until(() => [...document.querySelectorAll('#b-panel-preview .pv-tools .btn')].find((b) => /^Close site\.zip/.test(b.textContent.trim()))?.textContent.trim(), { timeout: 3000 });
    await t.key('i');
    const closed = await t.waitFor((T) => !T.S.interior, { what: 'I to close it' }).catch(() => false);
    t.check('Look inside opens the archive in the world, the tool then reads Close site.zip, and I closes it', !!opened && !!closeBtn && !!closed, JSON.stringify({ opened, closeBtn, closed }));

    /* ---- a link ---- */
    if (t.manifest.links) {
      await goTo(t, 'edge cases/link-to-copy-a');
      const ln = await until(t, 'link-to-copy-a', (s) => s.notes.length > 0);
      t.check(`a link says where it points and that it is not followed (${ln.notes[0]})`,
        /^A symbolic link, shown and never followed\. It points to .*copy-a\.dat, which is edge cases\/copy-a\.dat in this directory\.$/.test(ln.notes[0]), JSON.stringify(ln));
      await t.eval(() => { document.querySelector('#b-panel-preview .pv-actions .btn').click(); return true; });
      const sel = await t.waitFor((T) => T.S.primary?.n === 'copy-a.dat', { what: 'the link\'s target selected' }).catch(() => false);
      t.check('Select edge cases/copy-a.dat selects it', !!sel);
    } else t.skip('a link in Preview', 'the fixture could not make symbolic links here');

    /* ---- a folder ---- */
    await goTo(t, 'archives');
    const folder = await until(t, 'archives', (s) => s.rows.length > 0);
    t.check(`a folder shows By kind, By age and Largest, its rows largest first (${folder.rows.slice(0, 3).join(', ')})`,
      ['By kind', 'By age', 'Largest'].every((h) => folder.heads.includes(h)) && folder.kind === 'Folder' && folder.where !== null, JSON.stringify(folder));
    await t.eval(() => { document.querySelector('#b-panel-preview .pv-rows .item').focus(); return true; });
    const firstRow = await t.eval(() => document.activeElement.querySelector('.nm').textContent);
    await t.key('ArrowDown');
    const second = await t.eval(() => document.activeElement.querySelector('.nm')?.textContent);
    await t.key('ArrowUp');
    await t.key('Enter');
    const picked = await t.waitFor((T, n) => T.S.primary?.n === n && { focus: document.getElementById('b-panel-preview').contains(document.activeElement) }, { args: [firstRow], what: 'the row selected' });
    await until(t, firstRow);
    t.check(`↑ ↓ move between rows (${second}), and Enter on a row selects it with focus kept in Preview`, !!second && second !== firstRow && picked.focus, JSON.stringify({ firstRow, second, picked }));
    await t.eval(() => { document.querySelector('#b-panel-preview .pv-where').click(); return true; });
    const upAgain = await t.waitFor((T) => T.S.primary?.n === 'archives', { what: 'the where button' }).catch(() => false);
    t.check('the "in <folder>" button selects the folder it is in', !!upAgain);

    /* ---- several selected ---- */
    const four = await t.app((T) => {
      const dir = T.S.model.find('archives');
      const nodes = dir.c.filter((c) => !c.d).slice(0, 4);
      T.api.setFocus(dir);
      T.api.selectAll(nodes, nodes[0]);
      return { names: nodes.map((n) => n.n) };
    });
    await t.settle();
    const many = await until(t, '4 items', (s) => s.rows.length === 4);
    const total = await t.app((T) => {
      let bytes = 0;
      for (const n of T.S.sel) bytes += n.s;
      return bytes;
    });
    const fmt = await t.app((T, b) => {
      const UNITS = ['B', 'KB', 'MB', 'GB'];
      let u = 0;
      let v = b;
      while (v >= 1024 && u < 3) { v /= 1024; u++; }
      return `${v >= 100 || u === 0 ? Math.round(v) : v >= 10 ? v.toFixed(1) : v.toFixed(2)} ${UNITS[u]}`;
    }, total);
    t.check(`four selected show the list and their total (${many.facts})`, many.kind === 'Selection' && many.facts.startsWith(`${fmt} · 4 files`), JSON.stringify({ many, fmt }));
    await t.eval(() => { document.querySelector('#b-panel-preview .pv-rows .item').focus(); return true; });
    const firstSel = await t.eval(() => document.activeElement.querySelector('.nm').textContent);
    await t.key('Enter');
    const peek = await until(t, firstSel, (s) => s.peek !== null, 'one of the four read');
    const selNow = await t.app((T) => T.S.sel.size);
    t.check(`Enter on a row reads it while the selection stays whole (${peek.peek})`, peek.peek === '1 of 4 selected' && selNow === 4, JSON.stringify({ peek, selNow }));
    await t.key('ArrowRight');
    const peek2 = await t.waitFor(() => document.querySelector('#b-panel-preview .pv-peek-text')?.textContent === '2 of 4 selected' && document.getElementById('live').textContent, { what: '→ within the selection' }).catch(() => false);
    t.check(`→ steps within the selection and says where (${peek2})`, !!peek2 && / 2 of 4 selected$/.test(peek2) && (await t.app((T) => T.S.sel.size)) === 4);
    await t.key('Escape');
    const listBack = await t.waitFor(() => !document.querySelector('#b-panel-preview .pv-peek:not([hidden])') && document.querySelectorAll('#b-panel-preview .pv-rows .item').length === 4 && {
      focus: document.activeElement?.dataset?.k, live: document.getElementById('live').textContent,
    }, { what: 'Escape back to the list' }).catch(() => false);
    const selAfter = await t.app((T) => T.S.sel.size);
    t.check(`Escape returns to the list, on the row read, the selection unchanged (${listBack?.live})`, !!listBack && selAfter === 4 && /\/?[^/]+$/.test(listBack.focus || '') && /Back to the 4 selected/.test(listBack.live), JSON.stringify({ listBack, selAfter }));

    /* ---- nothing selected ---- */
    await t.app((T) => { T.api.select(null); return true; });
    const here = await until(t, 'archives', (s) => s.kind === 'You are in');
    t.check('with nothing selected Preview shows the folder you are in', here.kind === 'You are in' && here.where === null && here.heads.includes('Largest'), JSON.stringify(here));

    /* ---- snapshot mode, for a moment ---- */
    mark = t.mark();
    await t.app((T) => { T.S.info.snapshot = true; return true; });
    await goTo(t, README);
    const snap = await until(t, 'README.md', (s) => s.notes.length > 0);
    await t.app((T) => { T.S.info.snapshot = false; return true; });
    t.check('in snapshot mode a file says no contents are read, with its facts, and nothing is read',
      snap.notes[0] === 'Snapshot mode holds names, sizes and dates, not contents, so nothing is read from this file. Its facts are above.' && raws(t, mark).length === 0, JSON.stringify(snap));

    /* ---- ] hides panel B ---- */
    await t.eval(() => { document.getElementById('ledger-list').focus(); return true; });
    await t.key(']');
    await t.waitFor(() => document.body.classList.contains('no-inspector'));
    mark = t.mark();
    await goTo(t, 'edge cases/copy-a.dat');
    await t.sleep(500);
    const hiddenReads = raws(t, mark);
    const said = await t.live();
    t.check('] hides panel B, and a selection change then asks nothing', hiddenReads.length === 0, JSON.stringify(hiddenReads));
    await t.key(']');
    const shownAgain = await until(t, 'copy-a.dat', (s) => s.lines > 0, 'Preview after ]');
    t.check(`] shows it again and Preview reads what is selected now (${said})`, shownAgain.shown && raws(t, mark).length <= 1, JSON.stringify(raws(t, mark)));

    /* ---- the palette ---- */
    await t.eval(() => { document.getElementById('ledger-list').focus(); return true; });
    await t.key(']');
    await t.waitFor(() => document.body.classList.contains('no-inspector'));
    await t.key('Ctrl+K');
    await t.waitFor(() => document.getElementById('dialog').open && !!document.querySelector('.palette-input'), { what: 'the palette' });
    await t.type('preview');
    // Ranked: only what matches "preview" is listed, Show Preview among it.
    const options = await t.waitFor(() => {
      const o = [...document.querySelectorAll('.palette-option')].map((x) => `${x.querySelector('.pal-label')?.textContent}|${x.querySelector('.pal-detail')?.textContent}`);
      return o.length < 20 && o.some((x) => x.startsWith('Show Preview|')) && o;
    }, { what: 'Show Preview' });
    for (let i = 0; i < options.findIndex((x) => x.startsWith('Show Preview|')); i++) await t.key('ArrowDown');
    await t.key('Enter');
    const viaPalette = await t.waitFor((T) => !document.getElementById('dialog').open && !document.body.classList.contains('no-inspector') && T.S.bTab === 'preview'
      && document.activeElement === document.querySelector('#b-panel-preview .pv-pane') && /^Preview: /.test(document.getElementById('live').textContent) && { live: document.getElementById('live').textContent }, { what: 'Preview from the palette' })
      .catch(() => t.app((T) => ({ failed: true, dialog: document.getElementById('dialog').open, hidden: document.body.classList.contains('no-inspector'), bTab: T.S.bTab, focus: document.activeElement?.className || document.activeElement?.id, live: document.getElementById('live').textContent })));
    t.check(`Ctrl+K "preview" offers Show Preview (Panel B) and the wrap command; it opens panel B and puts focus in the pane (${viaPalette?.live})`,
      options.some((x) => x === 'Show Preview|Panel B') && options.some((x) => /^Preview: (wrap long lines|let long lines run on)\|Panel B$/.test(x)) && !viaPalette.failed && /^Preview: copy-a\.dat/.test(viaPalette.live),
      JSON.stringify({ options: options.filter((x) => /Panel B/.test(x)), viaPalette }));

    /* ---- the Guide ---- */
    await t.eval(() => { document.getElementById('ledger-list').focus(); return true; });
    await t.key('?');
    await t.waitFor(() => document.getElementById('dialog').open && !!document.querySelector('#dialog .guide'), { what: 'the Guide' });
    const guide = await t.eval(() => [...document.querySelectorAll('#dialog .guide > div')].map((d) => [d.querySelector('h3').textContent, [...d.querySelectorAll('dt')].map((dt) => `${dt.textContent}|${dt.nextElementSibling.textContent}`)]));
    await t.key('Escape');
    await t.waitFor(() => !document.getElementById('dialog').open);
    const closer = guide.find(([h]) => h === 'Looking closer')?.[1] || [];
    const selecting = guide.find(([h]) => h === 'Selecting and going places')?.[1] || [];
    t.check('the Guide lists Preview\'s keys under Looking closer, after Quick look\'s P, and the strips\' arrows under Selecting',
      JSON.stringify(closer.slice(closer.indexOf('P|Quick look at the selected file'))) === JSON.stringify(['P|Quick look at the selected file', '← →|In Preview: previous / next item',
        'Home  End|In Preview: first / last item, once the text is at its top / end', 'P|In Preview: Quick look at it', 'Esc|In Preview, reading one of several: back to the list'])
      && selecting.includes('← → on tabs|Previous / next tab (Home, End: first, last)'), JSON.stringify({ closer, selecting }));

    /* ---- the end: nothing posted, back on the Inspector ---- */
    const posts = t.requests(0).filter((r) => r.method === 'POST' && r.path.startsWith('/api/'));
    t.check('Preview never posts anything', posts.length === 0, JSON.stringify(posts.map((r) => r.path)));
    await t.app((T) => {
      document.getElementById('b-tab-inspector').click();
      T.api.select(null);
      return true;
    });
    t.check('it ends on the Inspector', (await t.app((T) => T.S.bTab)) === 'inspector');
  },
};

/** In region mode: a folder the page does not hold yet, a file, and Findings' refs. */
const previewRegions = {
  name: 'preview-regions',
  title: 'Preview in region mode: a folder not held, a file, Findings\' refs',
  data: 'fixture',
  regions: 0,
  timeout: 180000,
  async run(t) {
    await t.settle();
    const start = await t.app((T) => {
      T.api.showBTab('preview');
      // A folder at the root whose own children are not held yet.
      const dir = T.S.model.root.c.filter((c) => c.d && c.u && T.api.kids(c) > 3).sort((a, b) => T.api.kids(b) - T.api.kids(a))[0];
      return { regions: !!T.S.regions, bTab: T.S.bTab, dir: dir ? { n: dir.n, kids: T.api.kids(dir), fc: dir.fc } : null };
    });
    t.check('the page draws in regions, Preview chosen', start.regions && start.bTab === 'preview', JSON.stringify(start));
    if (!start.dir) {
      t.skip('a folder not held in Preview', 'every folder at the root is held already');
    } else {
      await t.app((T, n) => {
        T.api.select(T.S.model.root.c.find((c) => c.n === n));
        return true;
      }, start.dir.n);
      // The figures come from the region record at once; the rows once the region lands.
      const head = await t.waitFor((_T, n) => document.querySelector('#b-panel-preview .insp-name')?.textContent === n
        && document.querySelector('#b-panel-preview .pv-facts')?.textContent, { args: [start.dir.n], what: 'the folder\'s head' });
      const done = await until(t, start.dir.n, (s) => s.rows.length > 0, 'the folder\'s largest rows').catch(() => null);
      const held = await t.app((T, n) => !T.S.model.root.c.find((c) => c.n === n).u, start.dir.n);
      t.check(`a folder not held shows its figures at once (${head}), then its largest rows once its region lands (${done?.rows.length})`,
        head.includes(`${start.dir.fc.toLocaleString('en-US')} file`) && !!done && done.rows.length === Math.min(10, start.dir.kids) && held
        && ['By kind', 'By age', 'Largest'].every((h) => done.heads.includes(h)), JSON.stringify({ head, done, held }));
    }
    // A file, its path resolved first.
    await t.app((T) => {
      T.api.resolve('archives/site/README.md').then((n) => {
        T.api.setFocus(n.p);
        T.api.select(n);
      });
      return true;
    });
    const readme = await until(t, 'README.md', (s) => s.lines > 0).catch(() => null);
    t.check(`a file reads its text in region mode (${readme?.lines} lines)`, readme?.lines === countLines(fs.readFileSync(t.abs('archives/site/README.md'), 'utf8')), JSON.stringify(readme));
    // Findings lists refs; the pane steps through them, each made a node.
    await t.app((T) => {
      T.api.select(null);
      T.api.setQuery('part-0');
      return true;
    });
    const found = await t.waitFor((T) => T.S.search?.regions && T.S.tab === 'findings' && T.list.items.length > 3 && { refs: T.list.items.filter((x) => x.ref).length, names: T.list.items.slice(0, 3).map((x) => x.n) },
      { timeout: 15000, what: 'Findings in regions' });
    await t.app((T) => {
      const first = T.list.items[0];
      T.api.select(first);
      T.api.cursorTo(first);
      return true;
    });
    await t.waitFor((T, n) => T.S.primary?.n === n && !T.S.primary.ref, { args: [found.names[0]], timeout: 10000, what: 'the first match selected' });
    await until(t, found.names[0]);
    await t.eval(() => { document.querySelector('#b-panel-preview .pv-pane').focus(); return true; });
    await t.key('ArrowRight');
    const stepped = await t.waitFor((T, n) => T.S.primary?.n === n && { ref: !!T.S.primary.ref, attached: T.api.isAttached(T.S.primary), cursor: T.list.items[T.list.cursor]?.n },
      { args: [found.names[1]], timeout: 10000, what: 'the next match' }).catch(() => null);
    t.check(`Findings' refs step from the pane: the next match (${found.names[1]}) made a node, selected, the list's cursor on it (${found.refs} refs listed)`,
      !!stepped && !stepped.ref && stepped.attached && stepped.cursor === found.names[1], JSON.stringify({ found, stepped }));
    await t.app((T) => {
      T.api.setQuery('');
      T.api.select(null);
      document.getElementById('b-tab-inspector').click();
      return true;
    });
  },
};

/** On disk: a file and a folder deleted from outside, a file grown, and a long text measured. */
const previewDisk = {
  name: 'preview-disk',
  title: 'Preview on disk: an item deleted from outside, a file grown, a long text',
  data: 'fixture',
  write: true,
  timeout: 240000,
  async run(t) {
    await t.settle();
    await t.waitFor((T) => T.S.watch === 'live', { timeout: 10000, what: 'the watcher' });
    // Files of the scenario's own.
    // 6,500 lines of 49 bytes: 318,500 bytes, so the read is cut at 256 KB.
    const LONG = 6500;
    const text = (i) => `${String(i + 1).padStart(5, '0')} the quick brown fox jumps over the lazy dog`;
    const LINE = text(0).length + 1;
    fs.mkdirSync(t.abs('preview-disk'), { recursive: true });
    fs.writeFileSync(t.abs('preview-disk/grow.txt'), 'one\ntwo\nthree\n');
    fs.writeFileSync(t.abs('preview-disk/gone.md'), '# Gone soon\n');
    fs.mkdirSync(t.abs('preview-disk/folder-gone'), { recursive: true });
    fs.writeFileSync(t.abs('preview-disk/folder-gone/a.txt'), 'a\n');
    fs.writeFileSync(t.abs('preview-disk/long.log'), Array.from({ length: LONG }, (_, i) => text(i)).join('\n') + '\n');
    await t.app((T) => { T.api.showBTab('preview'); return true; });
    const arrived = await t.until((T) => !!T.S.model.find('preview-disk/long.log') && !!T.S.model.find('preview-disk/folder-gone/a.txt'), { timeout: 8000 });
    if (!arrived) {
      await t.app((T) => { T.api.refreshDirs(['', 'preview-disk']); return true; });
      await t.waitFor((T) => !!T.S.model.find('preview-disk/long.log') && !!T.S.model.find('preview-disk/folder-gone/a.txt'), { timeout: 10000, what: 'the files read' });
    }
    await t.settle();

    // A long text: 6,500 lines, cut at 256 KB, measured.
    await goTo(t, 'preview-disk/long.log');
    const long = await until(t, 'long.log', (s) => s.lines > 0, 'the long text');
    const ms = await t.eval(() => Math.round(performance.getEntriesByName('terrane:preview-text').at(-1)?.duration ?? -1));
    const read = Math.ceil(262144 / LINE);
    t.note(`a text of ${LONG.toLocaleString('en-US')} lines, 256 KB of it read: ${long.lines.toLocaleString('en-US')} lines built in ${ms} ms (terrane:preview-text)`);
    t.check(`and built in one short task (${ms} ms)`, ms >= 0 && ms < 400, String(ms));
    t.check(`the long text is cut at 256 KB and numbered in chunks of 200 (${long.lines} lines, ${long.chunks} chunks, numbered 1 to ${long.lastNum})`,
      !!long.cut && long.lines === read && long.chunks === Math.ceil(long.lines / 200) && long.nums[0] === '1' && long.lastNum === String(read) && long.numbersDrawn,
      JSON.stringify({ lines: long.lines, read, chunks: long.chunks, first: long.nums[0], last: long.lastNum, cut: long.cut }));
    // End in the pane scrolls to the end in one press: the chunks not drawn
    // yet hold the room their lines will take.
    await t.eval(() => { document.querySelector('#b-panel-preview .pv-pane').focus(); return true; });
    await t.key('End');
    // The browser scrolls smoothly: read once the pane has stood still for
    // six frames (three seconds at most).
    const visible = await t.eval(() => new Promise((r) => {
      const p = document.querySelector('#b-panel-preview .pv-pane');
      const until = performance.now() + 3000;
      let was = -1;
      let still = 0;
      const look = () => requestAnimationFrame(() => {
        still = p.scrollTop === was ? still + 1 : 0;
        was = p.scrollTop;
        if (still < 6 && performance.now() < until) return look();
        const box = p.getBoundingClientRect();
        const seen = [...document.querySelectorAll('#b-panel-preview .pv-line')].filter((l) => { const b = l.getBoundingClientRect(); return b.height > 0 && b.bottom > box.top && b.top < box.bottom; });
        const chunks = [...document.querySelectorAll('#b-panel-preview .pv-chunk')];
        return r({
          last: seen.at(-1)?.dataset.n ?? null, text: seen.at(-1)?.textContent.slice(0, 5) ?? null, atEnd: p.scrollTop + p.clientHeight >= p.scrollHeight - 1, primary: window.__terrane.S.primary?.n,
          sizes: chunks.slice(0, 2).concat(chunks.slice(-2)).map((c) => `${c.style.containIntrinsicHeight}/${Math.round(c.getBoundingClientRect().height)}`),
        });
      });
      look();
    }));
    t.check(`one End in the pane reaches the end of the text, line ${read} (${visible.last}), and stays on long.log`,
      visible.last === String(read) && Number(visible.text) === read && visible.atEnd && visible.primary === 'long.log', JSON.stringify(visible));

    // A file grown on disk is read again.
    await goTo(t, 'preview-disk/grow.txt');
    const g1 = await until(t, 'grow.txt', (s) => s.lines === 3, 'grow.txt, three lines');
    let mark = t.mark();
    fs.appendFileSync(t.abs('preview-disk/grow.txt'), 'four\nfive\n');
    let g2 = await until(t, 'grow.txt', (s) => s.lines === 5, 'grow.txt grown').catch(() => null);
    if (!g2) {
      await t.eval(() => { document.getElementById('ledger-list').focus(); return true; });
      await t.key('F5');
      g2 = await until(t, 'grow.txt', (s) => s.lines === 5, 'grow.txt after F5');
    }
    const reread = raws(t, mark).filter((r) => r.path === 'preview-disk/grow.txt');
    t.check(`a file grown on disk is read again (${g1.lines} lines, then ${g2.lines}; ${reread.length} read)`, g2.lines === 5 && reread.length === 1, JSON.stringify(reread));

    // A file shown, deleted from outside.
    const goneNote = (T) => {
      const P = document.getElementById('b-panel-preview');
      const note = P.querySelector('.pv-note.is-gone')?.textContent;
      return note && P.querySelector('.pv-pane').dataset.shown && { note, kind: P.querySelector('.pv-kind-words').textContent, name: P.querySelector('.insp-name').textContent, at: T.S.focus.n, sel: T.S.sel.size };
    };
    await goTo(t, 'preview-disk/gone.md');
    await until(t, 'gone.md', (s) => s.lines > 0);
    fs.rmSync(t.abs('preview-disk/gone.md'));
    let fileGone = await t.until(goneNote, { timeout: 8000 });
    if (!fileGone) {
      await t.eval(() => { document.getElementById('ledger-list').focus(); return true; });
      await t.key('F5');
      fileGone = await t.waitFor(goneNote, { timeout: 10000, what: 'the note after F5' });
    }
    t.check(`a file deleted from outside: the note, then the folder you are in (${fileGone.note})`,
      fileGone.note === '“gone.md” is no longer there: it was removed or renamed outside Terrane.' && fileGone.kind === 'You are in' && fileGone.name === fileGone.at && fileGone.sel === 0, JSON.stringify(fileGone));

    // A folder shown, deleted from outside, then F5.
    await goTo(t, 'preview-disk/folder-gone');
    await until(t, 'folder-gone', (s) => s.rows.length > 0);
    fs.rmSync(t.abs('preview-disk/folder-gone'), { recursive: true, force: true });
    await t.eval(() => { document.getElementById('ledger-list').focus(); return true; });
    await t.key('F5');
    const dirGone = await t.until(goneNote, { timeout: 10000 });
    t.check(`a folder deleted from outside, F5: the note, then the folder you are in (${dirGone?.note})`,
      dirGone?.note === '“folder-gone” is no longer there: it was removed or renamed outside Terrane.' && dirGone.kind === 'You are in', JSON.stringify(dirGone));
    const posts = t.requests(0).filter((r) => r.method === 'POST' && r.path.startsWith('/api/'));
    t.check('Preview posted nothing', posts.length === 0, JSON.stringify(posts.map((r) => r.path)));
    await t.app(() => { document.getElementById('b-tab-inspector').click(); return true; });
  },
};

export default [preview, previewRegions, previewDisk];
