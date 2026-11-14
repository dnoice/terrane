/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Duplicate Cleanup (Terrane Edition - v1.0)
 *     - File Name: dupes.js
 *     - Relative Path: web/js/dupes.js
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
 *       Initial release.
 *
 * ✒ Description:
 *     Turns a group of verified copies into space: keep one, and move the
 *     others to the holding area in one change that one Undo reverses.
 *     The files are read again just before, so a copy that changed since
 *     it was verified stops the whole move, and nothing is ever deleted
 *     until the holding area is purged.
 *
 * ✒ Key Features:
 *     - Under every group of duplicate candidates, in the Survey and in
 *       the inspector's copies (app.js's DUP_GROUP): a verified group
 *       says "Reclaimable 600 KB (2 copies)" and offers Keep newest and
 *       Keep oldest, and in the inspector Keep this one; an unverified
 *       group says "Verify by content first: size alone is only a hint."
 *     - Keep newest and Keep oldest keep the file with the latest or
 *       earliest last change (on a tie, the first listed); Keep this one
 *       keeps the file the inspector shows
 *     - A confirmation names what is kept (its path and last change) and
 *       what moves (up to 12 paths, then how many more), the total size,
 *       and that nothing is deleted; a sampled group's says it was
 *       compared by three sampled megabytes and its size, not every byte
 *     - The group is hashed again before anything moves (POST /api/hash);
 *       a file that differs from what was verified stops it with a
 *       sentence that names the file
 *     - One removal to the holding area (runOp, type trash): one journal
 *       entry, its notice offers Undo, and the kept file is selected
 *     - Read-only and snapshot mode show the actions unavailable with
 *       the reason; the command palette offers the three keeps for the
 *       selected file
 *
 * ✒ Usage Instructions:
 *     Listed in features.js and installed by app.js. Survey, Duplicate
 *     candidates, Verify by content; then Keep newest or Keep oldest
 *     under a group, or select one copy and Keep this one in the
 *     inspector.
 *
 * ✒ Examples:
 *     Survey · 3 × 293 KB · identical   Reclaimable 586 KB (2 copies)
 *     Keep newest                       Move 2 copies to the holding area?
 *     a copy rewritten since            copy-b.dat changed since it was
 *                                       verified, so nothing was moved.
 *
 * ✒ Other Important Information:
 *     - Dependencies: ui.js (ask), model.js (formatting); app.js's api: S,
 *       DUP_GROUP, COMMANDS, post, runOp, writable, hostOf, isAttached,
 *       relPath, relLabel, select, notice, el; the hash kept with a
 *       verified group (app.js's verifyDuplicates)
 *     - Compatible platforms: any browser with ES2022 modules
 *     - Limitations: hard links are not detected, so moving one name of a
 *       file with another frees nothing until the last name goes; the
 *       space comes back only when the holding area is purged
 * ----------------------------------------------------------------------------
 */

import { ask } from './ui.js';
import { fmtBytes, fmtCount, fmtDate } from './model.js';

export const name = 'Duplicate cleanup';

const OWNER = 'dupes';
/** Paths the confirmation names before "and N more". */
const NAMES_MAX = 12;

const copies = (n) => `${fmtCount(n)} cop${n === 1 ? 'y' : 'ies'}`;
const capital = (s) => `${s[0].toUpperCase()}${s.slice(1)}`;

export function install(api) {
  const { S, el } = api;

  /**
   * The file a keep leaves in place: the latest or earliest last change
   * (on a tie, the first listed), or the inspected node for 'this'.
   */
  function keepOf(group, how, node) {
    if (how === 'this') return node;
    let best = group.files[0];
    for (const f of group.files) if (how === 'newest' ? f.m > best.m : f.m < best.m) best = f;
    return best;
  }

  /** Why the group cannot be cleaned here (short, for a button), or null. */
  function offFor(group, ctx) {
    if (!group.verified) return 'verify by content first';
    if (S.interior && group.files.some((f) => api.hostOf(f))) return 'inside an archive';
    return ctx?.ro ?? api.writable();
  }

  async function clean(group, how, node = null) {
    const keep = keepOf(group, how, node);
    const others = group.files.filter((f) => f !== keep);
    if (!keep || !others.length) return;
    if (!group.verified) {
      api.notice('Verify by content first: size alone is only a hint.', { kind: 'info' });
      return;
    }
    if (S.interior && group.files.some((f) => api.hostOf(f))) {
      api.notice(S.interior.lock, { kind: 'info' });
      return;
    }
    const ro = api.writable();
    if (ro) {
      api.notice(`${capital(ro)}: nothing can be moved to the holding area.`, { kind: 'info' });
      return;
    }
    if (group.files.some((f) => !api.isAttached(f))) {
      api.notice('These copies changed on disk since the survey, so nothing was moved. Verify by content again.', { kind: 'info' });
      return;
    }
    const size = others.reduce((a, f) => a + f.s, 0);
    const sampled = group.mode === 'sampled';
    const listed = others.slice(0, NAMES_MAX).map((f) => el('li', {}, el('code', { text: api.relLabel(f) })));
    const rest = others.length - NAMES_MAX;
    const ok = await ask({
      title: `Move ${copies(others.length)} to the holding area?`, confirm: 'Move to the holding area', danger: true,
      body: el('div', { class: 'dup-confirm' },
        el('p', { class: 'dialog-body' }, 'Keeps ', el('code', { text: api.relLabel(keep) }), `, changed ${fmtDate(keep.m)}.`),
        el('p', { class: 'dialog-body', text: 'Moves:' }),
        el('ul', { class: 'dup-moves' }, listed, rest > 0 ? el('li', { text: `and ${fmtCount(rest)} more` }) : null),
        el('p', { class: 'dialog-body', text: `${fmtBytes(size)} in all.${sampled
          ? ` These files are large, so they were compared by three sampled megabytes and their size, not every byte: they are probably, not certainly, the same.`
          : ''}` }),
        el('p', { class: 'dialog-body', text: 'Nothing is deleted: Undo, or the Journal tab, puts them back. The space comes back when the holding area is purged.' })),
    });
    if (!ok) return;
    // Read again just before: a copy rewritten since it was verified
    // stops the whole move.
    let results;
    try {
      ({ results } = await api.post('hash', { paths: group.files.map(api.relPath) }));
    } catch (err) {
      api.notice(err.message, { kind: 'error' });
      return;
    }
    const want = group.hash ?? results[0]?.hash;
    const changed = group.files.find((f, i) => !results[i] || results[i].error || results[i].hash !== want);
    if (changed) {
      api.notice(`${changed.n} changed since it was verified, so nothing was moved. Verify by content again.`, { kind: 'error' });
      return;
    }
    const keepRel = api.relPath(keep);
    const res = await api.runOp({ type: 'trash', paths: others.map(api.relPath) });
    if (!res) return;
    const kept = S.model.find(keepRel);
    if (kept) api.select(kept);
  }

  /** A small button that stays in the tab order when it cannot act, with its reason in its name. */
  const button = (label, run, { off, k, title }) => el('button', {
    class: 'btn btn-small', type: 'button', 'data-k': k, 'aria-disabled': off ? 'true' : null,
    title: off ? `Unavailable: ${off}` : title, onclick: () => { if (!off) run(); },
  }, label, off ? el('span', { class: 'sr', text: `, unavailable: ${off}` }) : null);

  function build(group, ctx) {
    if (!group.verified) {
      return el('div', { class: `dup-clean${ctx.where === 'inspector' ? ' insp-dup' : ''}` },
        el('p', { class: 'dup-why', text: 'Verify by content first: size alone is only a hint.' }));
    }
    const at = S.survey?.dupGroups.indexOf(group) ?? -1;
    const k = (what) => `dup:${ctx.where}:${at}:${what}`;
    const off = offFor(group, ctx);
    const n = group.files.length - 1;
    const parts = [
      el('span', { class: 'dup-waste', text: `Reclaimable ${fmtBytes(group.waste)} (${copies(n)})` }),
      button('Keep newest', () => clean(group, 'newest'), { off, k: k('newest'), title: 'Keep the copy changed last; move the others to the holding area' }),
      button('Keep oldest', () => clean(group, 'oldest'), { off, k: k('oldest'), title: 'Keep the copy changed first; move the others to the holding area' }),
      ctx.where === 'inspector' && ctx.node
        ? button('Keep this one', () => clean(group, 'this', ctx.node), { off, k: k('this'), title: `Keep ${ctx.node.n}; move the others to the holding area` }) : null,
    ];
    if (group.mode === 'sampled') parts.push(el('p', { class: 'dup-note', text: 'Probable: compared by three sampled megabytes and the size, not every byte.' }));
    if (off) parts.push(el('p', { class: 'dup-why', text: `Unavailable here: ${off}.` }));
    return el('div', { class: `dup-clean${ctx.where === 'inspector' ? ' insp-dup' : ''}`, role: 'group', 'aria-label': `Clean up ${copies(n)}` }, parts);
  }

  api.DUP_GROUP.add({ id: 'dupes', owner: OWNER, build });

  api.COMMANDS.add({
    id: 'dupes', owner: OWNER, section: 'Duplicates',
    items: () => {
      const node = S.primary;
      const g = node && !node.d && node.dup ? S.survey?.dupGroups[node.dup - 1] : null;
      if (!g) return [{ label: 'Keep one copy of the selected file, move the others to the holding area', off: 'select a file that has copies first', run: () => {} }];
      const off = offFor(g, null);
      return [
        { label: `Keep this copy of ${node.n}, move the others to the holding area`, detail: 'Duplicates', off, run: () => clean(g, 'this', node) },
        { label: `Keep the newest copy of ${node.n}, move the others to the holding area`, detail: 'Duplicates', off, run: () => clean(g, 'newest') },
        { label: `Keep the oldest copy of ${node.n}, move the others to the holding area`, detail: 'Duplicates', off, run: () => clean(g, 'oldest') },
      ];
    },
  });
}
