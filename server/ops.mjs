/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Filesystem Operations (Terrane Edition - v1.2)
 *     - File Name: ops.mjs
 *     - Relative Path: server/ops.mjs
 *     - Artifact Type: javascript
 *     - Version: 1.2.0
 *     - Date: 11/13/2026
 *     - Update: Friday, November 13, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Changelog:
 *     - 1.2.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] — Undo
 *       of a rename or move answers with moved, the paths it carried back
 *       as [where it was, where it is now] pairs, so the page can follow
 *       them by path, after a reload too. A move, copy or removal that
 *       stops part way throws an error carrying results, the paths it
 *       finished, which are journaled as before.
 *     - 1.1.0 (11/11/2026) [dendogg + Anthropic - Claude Opus 5.5] — The
 *       undo journal persists in the holding area with root-relative paths
 *       that the guard re-checks on undo. Copy, move and remove run as jobs
 *       that report progress and can be cancelled; a cancelled copy removes
 *       only its own partial output. Purge keeps the journal. Partial
 *       removals are journaled. Holding index writes are atomic.
 *     - 1.0.0 (11/09/2026) [dendogg + Anthropic - Claude Fable 5.2] —
 *       Initial release.
 *
 * ✒ Description:
 *     Performs the real changes Terrane makes on disk: create folder, rename,
 *     move, copy, remove to the holding area, restore, open and reveal. Each
 *     change is validated through the path guard, never overwrites existing
 *     data, and is written to a persistent journal with the exact inverse
 *     needed to undo it, including after the service restarts.
 *
 * ✒ Key Features:
 *     - No overwrite, ever: a name collision is refused with a 409 unless
 *       the caller asks for "keep both", which picks a free "name copy" name
 *     - No direct delete: remove moves items into .terrane-trash inside the
 *       root (same volume, so the move is atomic and instantly reversible)
 *     - Persistent undo journal in .terrane-trash/journal.json, written
 *       atomically after every change. Paths are stored root-relative and
 *       pass through the guard again on undo, so an edited journal cannot
 *       reach outside the root. Undo refuses, with a reason, if the disk has
 *       changed underneath
 *     - Jobs: copy, move and remove report phase, bytes, files and items
 *       through a callback, throttled, and can be cancelled while queued,
 *       while counting, or between chunks of a copy
 *     - A cancelled or failed copy removes exactly the paths it created;
 *       items finished before the cancel stay and are journaled, so Undo
 *       returns the directory to where it started
 *     - Batches are validated in full before the first item is touched
 *     - Guards against moving a folder into itself or its own descendants
 *     - Case-only renames work on case-insensitive volumes without being
 *       mistaken for a collision
 *     - Cross-volume moves fall back to a measured copy, verify presence,
 *       then remove the source
 *     - One mutation at a time through a queue, so operations cannot
 *       interleave
 *     - Open and reveal hand the path to the operating system's own
 *       handler, detached and without a console window
 *     - Read-only mode refuses every mutation with an explanation
 *
 * ✒ Usage Instructions:
 *     const ops = makeOps(guard, { readOnly: false, onJob: (view) => {} });
 *     await ops.run({ type: 'mkdir', parent: 'docs', name: 'Drafts' });
 *     await ops.run({ type: 'rename', path: 'docs/a.txt', name: 'b.txt' });
 *     await ops.run({ type: 'move', paths: ['a', 'b'], dest: 'archive' });
 *     await ops.run({ type: 'copy', paths: ['big'], dest: '', job: 'k3x9q2' });
 *     ops.cancel('k3x9q2');
 *     await ops.run({ type: 'trash', paths: ['old.log'] });
 *     await ops.undo();
 *     Each call resolves to { ok, label, affected: [dir rel paths], ... };
 *     a cancelled job resolves with cancelled: true and says what was done.
 *     A job that stops part way rejects with an error whose results lists
 *     the paths it finished; undo() of a rename or move also gives moved.
 *
 * ✒ Other Important Information:
 *     - Dependencies: Node.js built-ins only; guard.mjs, transfer.mjs
 *     - Compatible platforms: Node.js 20+ on Windows, macOS, Linux
 *     - Limitations: the existence check and the rename are two system
 *       calls, so another program creating the same name in the few
 *       microseconds between them is not defended against. The journal
 *       keeps the latest 500 entries. Undo of a cross-volume move copies
 *       back without progress or cancellation. A same-volume move is one
 *       rename per item and cannot be interrupted partway through an item
 *     - Security: purge is the only permanent deletion of user data and
 *       only ever acts inside .terrane-trash. Cleanup after a cancelled
 *       copy deletes only paths that copy created, newest first, and
 *       removes folders only when empty
 * ----------------------------------------------------------------------------
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { GuardError, HOLD_DIR } from './guard.mjs';
import { measure, copyTree, removeCreated, isCancel } from './transfer.mjs';

const JOURNAL_MAX = 500;
const JOURNAL_FORMAT = 1;
const JOB_ID = /^[A-Za-z0-9_-]{6,64}$/;
const JOBBED = new Set(['move', 'copy', 'trash']);
const PROGRESS_MS = 150;

const exists = async (abs) => {
  try {
    await fs.lstat(abs);
    return true;
  } catch {
    return false;
  }
};

const sameEntry = async (a, b) => {
  try {
    const [sa, sb] = await Promise.all([fs.lstat(a, { bigint: true }), fs.lstat(b, { bigint: true })]);
    return sa.ino === sb.ino && sa.dev === sb.dev && sa.ino !== 0n;
  } catch {
    return false;
  }
};

async function freeName(dir, name) {
  const ext = path.extname(name);
  const stem = ext ? name.slice(0, -ext.length) : name;
  for (let i = 1; i < 10000; i++) {
    const candidate = `${stem} copy${i === 1 ? '' : ' ' + i}${ext}`;
    if (!(await exists(path.join(dir, candidate)))) return candidate;
  }
  throw new GuardError('EEXIST', 'Could not find a free name.', 409);
}

/** Writes a sibling file and renames it over the target. */
async function writeAtomic(file, text) {
  const tmp = `${file}.${process.pid}.tmp`;
  await fs.writeFile(tmp, text);
  for (let attempt = 0; ; attempt++) {
    try {
      await fs.rename(tmp, file);
      return;
    } catch (err) {
      // Windows refuses the swap while a sync client or scanner holds the
      // target open; it clears within milliseconds.
      if (attempt >= 6 || !['EPERM', 'EBUSY', 'EACCES'].includes(err.code)) {
        await fs.rm(tmp, { force: true });
        throw err;
      }
      await new Promise((r) => setTimeout(r, 40 * (attempt + 1)));
    }
  }
}

/** Copies with progress; on any failure removes what it created. */
async function copyOwned(from, to, job) {
  const created = [];
  try {
    await copyTree(from, to, { signal: job?.signal, created, onBytes: job?.addBytes, onFile: job?.addFile });
  } catch (err) {
    err.leftover = await removeCreated(created);
    throw err;
  }
}

async function moveEntry(from, to, job) {
  try {
    await fs.rename(from, to);
    return;
  } catch (err) {
    if (err.code !== 'EXDEV') throw err;
  }
  if (job) {
    const m = await measure(from, { signal: job.signal });
    job.bytes[1] += m.bytes;
    job.files[1] += m.files;
  }
  await copyOwned(from, to, job);
  await fs.lstat(to);
  await fs.rm(from, { recursive: true, force: false });
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

function makeJob(id, type, onJob) {
  const ac = new AbortController();
  const job = {
    id, type, phase: 'queued', bytes: [0, 0], files: [0, 0], items: [0, 0], current: '', last: 0,
    signal: ac.signal,
  };
  job.abort = () => ac.abort();
  job.view = () => ({
    id, op: type, phase: job.phase, bytes: [...job.bytes], files: [...job.files], items: [...job.items],
    current: job.current, cancelling: ac.signal.aborted,
  });
  job.emit = (force = false) => {
    const now = Date.now();
    if (!force && now - job.last < PROGRESS_MS) return;
    job.last = now;
    onJob?.(job.view());
  };
  job.set = (phase) => {
    job.phase = phase;
    job.emit(true);
  };
  job.addBytes = (n) => {
    job.bytes[0] += n;
    job.emit();
  };
  job.addFile = () => {
    job.files[0] += 1;
    job.emit();
  };
  return job;
}

export function makeOps(guard, { readOnly = false, onJob } = {}) {
  const SESSION = Date.now().toString(36);
  const journal = [];
  const jobs = new Map();
  let seq = 0;
  let warned = false;
  const holdRoot = path.join(guard.root, HOLD_DIR);
  const holdIndexPath = path.join(holdRoot, 'index.json');
  const journalPath = path.join(holdRoot, 'journal.json');

  const readHold = async () => {
    try {
      return JSON.parse(await fs.readFile(holdIndexPath, 'utf8'));
    } catch {
      return [];
    }
  };
  const writeHold = async (items) => {
    await fs.mkdir(holdRoot, { recursive: true });
    await writeAtomic(holdIndexPath, JSON.stringify(items, null, 1));
  };

  const parentRel = (abs) => guard.rel(path.dirname(abs));

  /** A journal path back to an absolute one, through the same guard as a request. */
  const fromJournal = async (rel) => {
    const abs = guard.resolve(rel, { allowRoot: false });
    await guard.assertParentInside(abs);
    return abs;
  };

  const target = async (rel) => {
    const abs = guard.resolve(rel, { allowRoot: false });
    await guard.assertParentInside(abs);
    if (!(await exists(abs))) throw new GuardError('ENOENT', `"${path.basename(abs)}" no longer exists.`, 404);
    return abs;
  };

  const destDir = async (rel) => {
    const abs = guard.resolve(rel);
    await guard.assertDirInside(abs);
    const st = await fs.stat(abs);
    if (!st.isDirectory()) throw new GuardError('ENOTDIR', 'The destination is not a folder.');
    return abs;
  };

  /* ---------- journal ---------- */

  const saveJournal = async () => {
    if (readOnly) return;
    while (journal.length > JOURNAL_MAX) journal.shift();
    try {
      await fs.mkdir(holdRoot, { recursive: true });
      await writeAtomic(journalPath, JSON.stringify({ format: JOURNAL_FORMAT, entries: journal }));
    } catch (err) {
      // The change itself succeeded; only its persistence did not.
      if (!warned) console.warn(`  Journal could not be saved (${err.code || err.message}); undo still works until the service stops.`);
      warned = true;
    }
  };

  const record = async (type, label, undo, affected) => {
    const entry = { id: ++seq, type, label, at: Date.now(), session: SESSION, undo, undone: false };
    journal.push(entry);
    await saveJournal();
    return { ok: true, id: entry.id, label, affected, undoable: true };
  };

  /* ---------- holding area ---------- */

  /** Moves entries into the holding area; stops early when the job is cancelled. */
  const hold = async (absList, job) => {
    const items = await readHold();
    const added = [];
    for (const abs of absList) {
      if (job?.signal.aborted) break;
      const id = `${Date.now().toString(36)}-${(seq++).toString(36)}`;
      const slot = path.join(holdRoot, 'items', id);
      await fs.mkdir(slot, { recursive: true });
      const held = path.join(slot, path.basename(abs));
      if (job) job.current = guard.rel(abs);
      try {
        await moveEntry(abs, held, job);
      } catch (err) {
        await fs.rmdir(slot).catch(() => {});
        if (isCancel(err)) break;
        err.added = added;
        throw err;
      }
      const rec = { id, name: path.basename(abs), origin: guard.rel(abs), at: Date.now() };
      items.push(rec);
      added.push({ ...rec, held, abs });
      await writeHold(items);
      if (job) {
        job.items[0] = added.length;
        job.emit(true);
      }
    }
    return added;
  };

  const restore = async (ids, { skipMissing = false } = {}) => {
    const items = await readHold();
    const affected = new Set();
    const names = [];
    for (const id of ids) {
      const rec = items.find((r) => r.id === id);
      if (!rec && skipMissing) continue;
      if (!rec) throw new GuardError('ENOENT', 'That item is no longer in the holding area.', 404);
      const to = guard.resolve(rec.origin, { allowRoot: false });
      await guard.assertParentInside(to);
      if (await exists(to)) {
        throw new GuardError('EEXIST', `Cannot restore "${rec.name}": something else now has that name.`, 409);
      }
      const slot = path.join(holdRoot, 'items', id);
      await moveEntry(path.join(slot, rec.name), to);
      await fs.rm(slot, { recursive: true, force: true });
      items.splice(items.indexOf(rec), 1);
      await writeHold(items);
      affected.add(parentRel(to));
      names.push(rec.name);
    }
    return { affected: [...affected], names };
  };

  /* ---------- operations ---------- */

  const handlers = {
    async mkdir({ parent, name }) {
      guard.checkName(name);
      const dir = await destDir(parent);
      const abs = path.join(dir, name);
      if (await exists(abs)) throw new GuardError('EEXIST', `"${name}" already exists here.`, 409);
      await fs.mkdir(abs);
      const res = await record('mkdir', `Created folder "${name}"`, { kind: 'rmdir', rel: guard.rel(abs) }, [guard.rel(dir)]);
      return { ...res, created: guard.rel(abs) };
    },

    async rename({ path: rel, name }) {
      guard.checkName(name);
      const from = await target(rel);
      const to = path.join(path.dirname(from), name);
      if (from === to) return { ok: true, label: 'Name unchanged', affected: [], undoable: false };
      if ((await exists(to)) && !(await sameEntry(from, to))) {
        throw new GuardError('EEXIST', `"${name}" already exists in this folder.`, 409);
      }
      await fs.rename(from, to);
      const res = await record('rename', `Renamed "${path.basename(from)}" to "${name}"`,
        { kind: 'moves', pairs: [[guard.rel(from), guard.rel(to)]] }, [parentRel(from)]);
      return { ...res, renamed: guard.rel(to) };
    },

    async transfer({ type, paths, dest, onConflict = 'fail' }, job) {
      if (!Array.isArray(paths) || paths.length === 0) throw new GuardError('EARGS', 'Nothing was selected.');
      const dir = await destDir(dest);
      const realDir = await fs.realpath(dir);
      const plan = [];
      const taken = new Set();
      for (const rel of paths) {
        const from = await target(rel);
        const st = await fs.lstat(from);
        if (st.isDirectory()) {
          const realFrom = await fs.realpath(from);
          if (realDir === realFrom || realDir.startsWith(realFrom + path.sep)) {
            throw new GuardError('ELOOP', `"${path.basename(from)}" cannot be placed inside itself.`);
          }
        }
        if (type === 'move' && path.dirname(from) === dir) {
          throw new GuardError('ESAME', `"${path.basename(from)}" is already in that folder.`);
        }
        let name = path.basename(from);
        if ((await exists(path.join(dir, name))) || taken.has(name)) {
          if (onConflict !== 'keepBoth' && !(type === 'copy' && path.dirname(from) === dir)) {
            throw new GuardError('EEXIST', `"${name}" already exists in the destination. Nothing was changed.`, 409);
          }
          name = await freeName(dir, name);
        }
        taken.add(name);
        plan.push([from, path.join(dir, name)]);
      }

      const Verb = type === 'move' ? 'Move' : 'Copy';
      const verbed = type === 'move' ? 'moving' : 'copying';
      const where = guard.rel(dir) || path.basename(guard.root);
      const affected = new Set([guard.rel(dir)]);
      job.items[1] = plan.length;

      if (type === 'copy') {
        job.set('counting');
        try {
          for (const [from] of plan) {
            const base = [job.bytes[1], job.files[1]];
            const m = await measure(from, {
              signal: job.signal,
              onCount: (files, bytes) => {
                job.files[1] = base[1] + files;
                job.bytes[1] = base[0] + bytes;
                job.emit();
              },
            });
            job.bytes[1] = base[0] + m.bytes;
            job.files[1] = base[1] + m.files;
          }
        } catch (err) {
          if (isCancel(err)) return { ok: true, cancelled: true, label: 'Copy cancelled. Nothing was changed.', affected: [], undoable: false };
          throw err;
        }
      }

      job.set(verbed);
      const done = [];
      let stop = null;
      let leftover = 0;
      for (const [from, to] of plan) {
        if (job.signal.aborted) {
          stop = 'cancel';
          break;
        }
        job.current = guard.rel(from);
        job.emit(true);
        try {
          if (type === 'move') {
            await moveEntry(from, to, job);
            affected.add(parentRel(from));
          } else {
            await copyOwned(from, to, job);
          }
        } catch (err) {
          leftover += err.leftover || 0;
          stop = isCancel(err) ? 'cancel' : err;
          break;
        }
        done.push([from, to]);
        job.items[0] = done.length;
        job.emit(true);
      }

      const pairs = done.map(([f, t]) => [guard.rel(f), guard.rel(t)]);
      const undo = type === 'move' ? { kind: 'moves', pairs } : { kind: 'holdCopies', rels: pairs.map((p) => p[1]) };
      const results = pairs.map((p) => p[1]);
      const residue = leftover
        ? ' Part of the unfinished item was left in place because something else was written into it meanwhile.'
        : '';

      if (stop === 'cancel') {
        if (!done.length) return { ok: true, cancelled: true, label: `${Verb} cancelled. Nothing was changed.${residue}`, affected: [...affected], undoable: false };
        const rest = plan.length - done.length;
        const res = await record(type, `${Verb} cancelled after ${done.length} of ${plural(plan.length, 'item')}`, undo, [...affected]);
        return {
          ...res, cancelled: true, results,
          label: `Cancelled after ${verbed} ${done.length} of ${plural(plan.length, 'item')} to "${where}". `
            + `The other ${rest} ${type === 'move' ? 'stayed where they were' : 'were not copied'}.${residue}`,
        };
      }
      if (stop) {
        if (done.length) await record(type, `Partial ${type} (${done.length} of ${plan.length})`, undo, [...affected]);
        const e = new GuardError(stop.code || 'EIO', `${Verb} stopped after ${done.length} of ${plan.length}: ${stop.message}${residue}`, 500);
        e.affected = [...affected];
        // What was finished stays and is journaled; the page follows it as
        // it follows a whole move.
        if (done.length) e.results = results;
        throw e;
      }
      const label = type === 'move' ? `Moved ${plural(done.length, 'item')} to "${where}"` : `Copied ${plural(done.length, 'item')} to "${where}"`;
      return { ...(await record(type, label, undo, [...affected])), results };
    },

    move(args, job) {
      return handlers.transfer({ ...args, type: 'move' }, job);
    },

    copy(args, job) {
      return handlers.transfer({ ...args, type: 'copy' }, job);
    },

    async trash({ paths }, job) {
      if (!Array.isArray(paths) || paths.length === 0) throw new GuardError('EARGS', 'Nothing was selected.');
      const absList = [];
      for (const rel of paths) absList.push(await target(rel));
      // Drop anything nested inside another selected folder.
      const tops = absList.filter((a) => !absList.some((b) => b !== a && a.startsWith(b + path.sep)));
      job.items[1] = tops.length;
      job.set('removing');
      let added;
      let failure = null;
      try {
        added = await hold(tops, job);
      } catch (err) {
        added = err.added || [];
        failure = err;
      }
      const affected = [...new Set(added.map((a) => parentRel(a.abs)))];
      const undo = { kind: 'restore', ids: added.map((a) => a.id) };
      if (failure) {
        if (added.length) await record('trash', `Partial removal (${added.length} of ${tops.length})`, undo, affected);
        const e = new GuardError(failure.code || 'EIO', `Removal stopped after ${added.length} of ${tops.length}: ${failure.message}`, 500);
        e.affected = [...new Set([...affected, ...tops.map(parentRel)])];
        if (added.length) e.results = added.map((a) => a.origin);
        throw e;
      }
      if (added.length < tops.length) {
        if (!added.length) return { ok: true, cancelled: true, label: 'Removal cancelled. Nothing was changed.', affected: [], undoable: false };
        const res = await record('trash', `Removal cancelled after ${added.length} of ${plural(tops.length, 'item')}`, undo, affected);
        return {
          ...res, cancelled: true,
          label: `Cancelled after removing ${added.length} of ${plural(tops.length, 'item')} to the holding area. The other ${tops.length - added.length} stayed where they were.`,
        };
      }
      return record('trash', `Removed ${plural(added.length, 'item')} to the holding area`, undo, affected);
    },
  };

  /* ---------- undo ---------- */

  const undoHandlers = {
    async rmdir({ rel }) {
      let abs;
      try {
        abs = await fromJournal(rel);
      } catch (err) {
        if (err.code === 'ENOENT') return [];
        throw err;
      }
      try {
        await fs.rmdir(abs);
      } catch (err) {
        if (err.code === 'ENOTEMPTY' || err.code === 'EEXIST') {
          throw new GuardError('ENOTEMPTY', 'That folder now has contents, so it was left in place.', 409);
        }
        if (err.code !== 'ENOENT') throw err;
      }
      return [parentRel(abs)];
    },
    async moves({ pairs }) {
      const resolved = [];
      for (const [fromRel, toRel] of pairs) {
        let from;
        let to;
        try {
          [from, to] = [await fromJournal(fromRel), await fromJournal(toRel)];
        } catch (err) {
          if (err.code !== 'ENOENT') throw err;
          throw new GuardError('ENOENT', `Cannot undo: the folder "${String(fromRel).split('/').pop()}" came from, or went to, no longer exists.`, 409);
        }
        if (!(await exists(to))) throw new GuardError('ENOENT', `"${path.basename(to)}" is no longer where the operation left it.`, 409);
        if ((await exists(from)) && !(await sameEntry(from, to))) {
          throw new GuardError('EEXIST', `Cannot undo: "${path.basename(from)}" exists again at the original location.`, 409);
        }
        resolved.push([from, to]);
      }
      const affected = new Set();
      for (const [from, to] of resolved.reverse()) {
        await moveEntry(to, from);
        affected.add(parentRel(from));
        affected.add(parentRel(to));
      }
      return [...affected];
    },
    async holdCopies({ rels }) {
      const present = [];
      for (const rel of rels) {
        try {
          const abs = await fromJournal(rel);
          if (await exists(abs)) present.push(abs);
        } catch (err) {
          if (err.code !== 'ENOENT') throw err;
        }
      }
      await hold(present);
      return [...new Set(present.map(parentRel))];
    },
    async restore({ ids }) {
      // Items already restored by hand from the Journal are simply skipped.
      return (await restore(ids, { skipMissing: true })).affected;
    },
  };

  const validEntry = (e) => e && Number.isInteger(e.id) && typeof e.label === 'string' && typeof e.type === 'string'
    && e.undo && typeof e.undo.kind === 'string' && Object.hasOwn(undoHandlers, e.undo.kind);

  const loadJournal = async () => {
    let text;
    try {
      text = await fs.readFile(journalPath, 'utf8');
    } catch {
      return;
    }
    try {
      const data = JSON.parse(text);
      if (!Array.isArray(data.entries)) throw new Error('no entries');
      for (const e of data.entries) if (validEntry(e)) journal.push(e);
      for (const e of journal) seq = Math.max(seq, e.id);
    } catch {
      // Keep an unreadable journal for inspection rather than overwrite it.
      console.warn('  The saved journal could not be read; starting a new one.');
      if (!readOnly) await fs.rename(journalPath, path.join(holdRoot, `journal.unreadable-${Date.now()}.json`)).catch(() => {});
    }
  };

  const ready = loadJournal();
  let queue = ready.catch(() => {});

  const serial = (fn) => {
    const next = queue.then(fn, fn);
    queue = next.catch(() => {});
    return next;
  };

  const launch = (cmd, args) => new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { detached: true, stdio: 'ignore', windowsHide: true });
    child.once('error', (err) => reject(new GuardError('ELAUNCH', `The system handler could not be started (${cmd}: ${err.code || err.message}).`, 501)));
    child.once('spawn', () => {
      child.unref();
      resolve();
    });
  });

  const openJob = (op) => {
    const id = typeof op.job === 'string' && JOB_ID.test(op.job) && !jobs.has(op.job)
      ? op.job : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    const job = makeJob(id, op.type, onJob);
    jobs.set(id, job);
    job.emit(true);
    return job;
  };

  const closeJob = (job, outcome) => {
    job.phase = 'end';
    job.outcome = outcome;
    onJob?.({ ...job.view(), outcome });
    jobs.delete(job.id);
  };

  return {
    async journal() {
      await ready;
      return journal.map(({ id, type, label, at, undone, purged, session }) => ({
        id, type, label, at, undone, purged: !!purged, earlier: session !== SESSION,
      }));
    },

    jobs: () => [...jobs.values()].map((j) => j.view()),

    run(op) {
      if (op.type === 'open' || op.type === 'reveal') {
        return (async () => {
          const abs = op.path === '' ? guard.root : await target(op.path);
          const reveal = op.type === 'reveal';
          if (process.platform === 'win32') await launch('explorer.exe', reveal ? [`/select,${abs}`] : [abs]);
          else if (process.platform === 'darwin') await launch('open', reveal ? ['-R', abs] : [abs]);
          else await launch('xdg-open', [reveal ? path.dirname(abs) : abs]);
          return { ok: true, label: reveal ? 'Revealed in the system file manager' : 'Opened with the system default application', affected: [], undoable: false };
        })();
      }
      const handler = Object.hasOwn(handlers, op.type) && op.type !== 'transfer' ? handlers[op.type] : null;
      if (!handler) return Promise.reject(new GuardError('EOP', `Unknown operation "${op.type}".`));
      if (readOnly) return Promise.reject(new GuardError('EREADONLY', 'Terrane was started in read-only mode, so nothing on disk can be changed.', 403));
      const job = JOBBED.has(op.type) ? openJob(op) : null;
      return serial(async () => {
        let outcome = 'failed';
        try {
          if (job?.signal.aborted) {
            outcome = 'cancelled';
            return { ok: true, cancelled: true, label: 'Cancelled before it started. Nothing was changed.', affected: [], undoable: false };
          }
          const res = await handler(op, job);
          outcome = res.cancelled ? 'cancelled' : 'done';
          return job ? { ...res, job: job.id } : res;
        } finally {
          if (job) closeJob(job, outcome);
        }
      });
    },

    cancel(id) {
      const job = jobs.get(id);
      if (!job) throw new GuardError('ENOJOB', 'That operation had already finished.', 404);
      job.abort();
      job.emit(true);
      return { ok: true, label: 'Cancelling…' };
    },

    /** Cancels every job and resolves when the queue is idle or the wait runs out. */
    async shutdown(ms = 3000) {
      for (const job of jobs.values()) job.abort();
      await Promise.race([queue, new Promise((r) => setTimeout(r, ms))]);
    },

    undo() {
      if (readOnly) return Promise.reject(new GuardError('EREADONLY', 'Read-only mode.', 403));
      return serial(async () => {
        const entry = [...journal].reverse().find((e) => !e.undone);
        if (!entry) throw new GuardError('ENOUNDO', 'There is nothing to undo.', 409);
        const affected = await undoHandlers[entry.undo.kind](entry.undo);
        entry.undone = true;
        await saveJournal();
        const when = entry.session === SESSION ? '' : ' (from an earlier session)';
        const res = { ok: true, label: `Undid: ${entry.label}${when}`, affected, undoable: false };
        // The paths carried back, in the order they moved, each as [where
        // it was, where it is now]: the page follows them by path, not by
        // matching labels, which a reload or a cancel would defeat.
        if (entry.undo.kind === 'moves') res.moved = entry.undo.pairs.map(([from, to]) => [to, from]).reverse();
        return res;
      });
    },

    async holding() {
      return readHold();
    },

    restore(ids) {
      if (readOnly) return Promise.reject(new GuardError('EREADONLY', 'Read-only mode.', 403));
      return serial(async () => {
        const r = await restore(ids);
        return { ok: true, label: `Restored ${r.names.map((n) => `"${n}"`).join(', ')}`, affected: r.affected, undoable: false };
      });
    },

    purge() {
      if (readOnly) return Promise.reject(new GuardError('EREADONLY', 'Read-only mode.', 403));
      return serial(async () => {
        const items = await readHold();
        await fs.rm(path.join(holdRoot, 'items'), { recursive: true, force: true });
        await fs.rm(holdIndexPath, { force: true });
        for (const e of journal) {
          if (e.undo.kind === 'restore' && !e.undone) {
            e.undone = true;
            e.purged = true;
          }
        }
        await saveJournal();
        return { ok: true, label: `Permanently deleted ${plural(items.length, 'held item')}`, affected: [], undoable: false };
      });
    },
  };
}
