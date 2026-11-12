/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Filesystem Operations (Terrane Edition - v1.0)
 *     - File Name: ops.mjs
 *     - Relative Path: server/ops.mjs
 *     - Artifact Type: javascript
 *     - Version: 1.0.0
 *     - Date: 11/09/2026
 *     - Update: Monday, November 9, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Fable 5.2
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Description:
 *     Performs the real changes Terrane makes on disk: create folder, rename,
 *     move, copy, remove to the holding area, restore, open and reveal. Each
 *     change is validated through the path guard, never overwrites existing
 *     data, and is written to a journal with the exact inverse needed to
 *     undo it.
 *
 * ✒ Key Features:
 *     - No overwrite, ever: a name collision is refused with a 409 unless
 *       the caller asks for "keep both", which picks a free "name copy" name
 *     - No direct delete: remove moves items into .terrane-trash inside the
 *       root (same volume, so the move is atomic and instantly reversible)
 *     - Undo journal: every mutation records its inverse; undo replays it
 *       and refuses, with a reason, if the disk has changed underneath
 *     - Batches are validated in full before the first item is touched
 *     - Guards against moving a folder into itself or its own descendants
 *     - Case-only renames work on case-insensitive volumes without being
 *       mistaken for a collision
 *     - Cross-volume moves fall back to copy, verify presence, then remove
 *     - One mutation at a time through a queue, so operations cannot
 *       interleave
 *     - Open and reveal hand the path to the operating system's own
 *       handler, detached and without a console window
 *     - Read-only mode refuses every mutation with an explanation
 *
 * ✒ Usage Instructions:
 *     const ops = makeOps(guard, { readOnly: false });
 *     await ops.run({ type: 'mkdir', parent: 'docs', name: 'Drafts' });
 *     await ops.run({ type: 'rename', path: 'docs/a.txt', name: 'b.txt' });
 *     await ops.run({ type: 'move', paths: ['a', 'b'], dest: 'archive' });
 *     await ops.run({ type: 'copy', paths: ['a.txt'], dest: '' });
 *     await ops.run({ type: 'trash', paths: ['old.log'] });
 *     await ops.undo();
 *     Each call resolves to { ok, label, affected: [dir rel paths], ... }.
 *
 * ✒ Other Important Information:
 *     - Dependencies: Node.js built-ins only
 *     - Compatible platforms: Node.js 20+ on Windows, macOS, Linux
 *     - Limitations: the existence check and the rename are two system
 *       calls, so another program creating the same name in the few
 *       microseconds between them is not defended against. The journal
 *       lives in memory for the session; the holding area and its index
 *       persist on disk and survive a restart.
 *     - Security: purge is the only permanent deletion and only ever acts
 *       inside .terrane-trash
 * ----------------------------------------------------------------------------
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { GuardError, HOLD_DIR } from './guard.mjs';

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

async function moveEntry(from, to) {
  try {
    await fs.rename(from, to);
  } catch (err) {
    if (err.code !== 'EXDEV') throw err;
    await fs.cp(from, to, { recursive: true, errorOnExist: true, force: false, verbatimSymlinks: true });
    await fs.lstat(to);
    await fs.rm(from, { recursive: true, force: false });
  }
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

export function makeOps(guard, { readOnly = false } = {}) {
  const journal = [];
  let seq = 0;
  let queue = Promise.resolve();
  const holdRoot = path.join(guard.root, HOLD_DIR);
  const holdIndexPath = path.join(holdRoot, 'index.json');

  const readHold = async () => {
    try {
      return JSON.parse(await fs.readFile(holdIndexPath, 'utf8'));
    } catch {
      return [];
    }
  };
  const writeHold = async (items) => {
    await fs.mkdir(holdRoot, { recursive: true });
    await fs.writeFile(holdIndexPath, JSON.stringify(items, null, 1));
  };

  const parentRel = (abs) => guard.rel(path.dirname(abs));

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

  /** Moves a set of entries into the holding area; returns index records. */
  const hold = async (absList) => {
    const items = await readHold();
    const added = [];
    for (const abs of absList) {
      const id = `${Date.now().toString(36)}-${(seq++).toString(36)}`;
      const slot = path.join(holdRoot, 'items', id);
      await fs.mkdir(slot, { recursive: true });
      const held = path.join(slot, path.basename(abs));
      await moveEntry(abs, held);
      const rec = { id, name: path.basename(abs), origin: guard.rel(abs), at: Date.now() };
      items.push(rec);
      added.push({ ...rec, held, abs });
      await writeHold(items);
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

  const record = (type, label, undo, affected) => {
    const entry = { id: ++seq, type, label, at: Date.now(), undo, undone: false };
    journal.push(entry);
    return { ok: true, id: entry.id, label, affected, undoable: true };
  };

  const handlers = {
    async mkdir({ parent, name }) {
      guard.checkName(name);
      const dir = await destDir(parent);
      const abs = path.join(dir, name);
      if (await exists(abs)) throw new GuardError('EEXIST', `"${name}" already exists here.`, 409);
      await fs.mkdir(abs);
      return { ...record('mkdir', `Created folder "${name}"`, { kind: 'rmdir', abs }, [guard.rel(dir)]), created: guard.rel(abs) };
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
      const res = record('rename', `Renamed "${path.basename(from)}" to "${name}"`, { kind: 'moves', pairs: [[from, to]] }, [parentRel(from)]);
      return { ...res, renamed: guard.rel(to) };
    },

    async transfer({ type, paths, dest, onConflict = 'fail' }) {
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
      const done = [];
      const affected = new Set([guard.rel(dir)]);
      try {
        for (const [from, to] of plan) {
          if (type === 'move') {
            await moveEntry(from, to);
            affected.add(parentRel(from));
          } else {
            await fs.cp(from, to, { recursive: true, errorOnExist: true, force: false, verbatimSymlinks: true });
          }
          done.push([from, to]);
        }
      } catch (err) {
        if (done.length) {
          record(type, `Partial ${type} (${done.length} of ${plan.length})`,
            type === 'move' ? { kind: 'moves', pairs: done } : { kind: 'holdCopies', abs: done.map((p) => p[1]) }, [...affected]);
        }
        const e = new GuardError(err.code || 'EIO', `${type === 'move' ? 'Move' : 'Copy'} stopped after ${done.length} of ${plan.length}: ${err.message}`, 500);
        e.affected = [...affected];
        throw e;
      }
      const where = guard.rel(dir) || path.basename(guard.root);
      const res = type === 'move'
        ? record('move', `Moved ${plural(done.length, 'item')} to "${where}"`, { kind: 'moves', pairs: done }, [...affected])
        : record('copy', `Copied ${plural(done.length, 'item')} to "${where}"`, { kind: 'holdCopies', abs: done.map((p) => p[1]) }, [...affected]);
      return { ...res, results: done.map((p) => guard.rel(p[1])) };
    },

    move(args) {
      return handlers.transfer({ ...args, type: 'move' });
    },

    copy(args) {
      return handlers.transfer({ ...args, type: 'copy' });
    },

    async trash({ paths }) {
      if (!Array.isArray(paths) || paths.length === 0) throw new GuardError('EARGS', 'Nothing was selected.');
      const absList = [];
      for (const rel of paths) absList.push(await target(rel));
      // Drop anything nested inside another selected folder.
      const tops = absList.filter((a) => !absList.some((b) => b !== a && a.startsWith(b + path.sep)));
      const added = await hold(tops);
      const affected = [...new Set(tops.map(parentRel))];
      return record('trash', `Removed ${plural(added.length, 'item')} to the holding area`, { kind: 'restore', ids: added.map((a) => a.id) }, affected);
    },
  };

  const undoHandlers = {
    async rmdir({ abs }) {
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
      const affected = new Set();
      for (const [from, to] of pairs) {
        if (!(await exists(to))) throw new GuardError('ENOENT', `"${path.basename(to)}" is no longer where the operation left it.`, 409);
        if ((await exists(from)) && !(await sameEntry(from, to))) {
          throw new GuardError('EEXIST', `Cannot undo: "${path.basename(from)}" exists again at the original location.`, 409);
        }
      }
      for (const [from, to] of [...pairs].reverse()) {
        await moveEntry(to, from);
        affected.add(parentRel(from));
        affected.add(parentRel(to));
      }
      return [...affected];
    },
    async holdCopies({ abs }) {
      const present = [];
      for (const a of abs) if (await exists(a)) present.push(a);
      await hold(present);
      return [...new Set(abs.map(parentRel))];
    },
    async restore({ ids }) {
      // Items already restored by hand from the Journal are simply skipped.
      return (await restore(ids, { skipMissing: true })).affected;
    },
  };

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

  return {
    journal: () => journal.map(({ id, type, label, at, undone }) => ({ id, type, label, at, undone })),

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
      return serial(() => handler(op));
    },

    undo() {
      if (readOnly) return Promise.reject(new GuardError('EREADONLY', 'Read-only mode.', 403));
      return serial(async () => {
        const entry = [...journal].reverse().find((e) => !e.undone);
        if (!entry) throw new GuardError('ENOUNDO', 'There is nothing to undo.', 409);
        const affected = await undoHandlers[entry.undo.kind](entry.undo);
        entry.undone = true;
        return { ok: true, label: `Undid: ${entry.label}`, affected, undoable: false };
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
        await fs.rm(holdRoot, { recursive: true, force: true });
        for (const e of journal) if (e.undo.kind === 'restore') e.undone = true;
        return { ok: true, label: `Permanently deleted ${plural(items.length, 'held item')}`, affected: [], undoable: false };
      });
    },
  };
}
