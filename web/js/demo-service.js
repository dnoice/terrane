/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Demo Service (Terrane Edition - v1.0)
 *     - File Name: demo-service.js
 *     - Relative Path: web/js/demo-service.js
 *     - Artifact Type: javascript
 *     - Version: 1.0.0
 *     - Date: 11/13/2026
 *     - Update: Friday, November 13, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Description:
 *     The Terrane service's API, answered in the page over the demo world
 *     instead of a disk. It takes the same routes, parameters and bodies
 *     and gives back the same records, answers and refusals, so the
 *     interface runs unchanged; every change happens in memory and lasts
 *     until the page is reloaded.
 *
 * ✒ Key Features:
 *     - Read routes: info, scan (the scanner's records, order, batches
 *       and depth stubs), stat, raw, inside (zip interiors; other formats
 *       refused in the service's words), journal, thumbs
 *     - Every operation: new folder, rename, a batch rename, move, copy,
 *       remove to the holding area, restore, permanent deletion of held
 *       items, undo, cancel, with the service's checks: names, collisions
 *       and "keep both", a folder into itself, nested selections, and a
 *       batch's chains, swaps, twins and nesting
 *     - The same undo journal: moves, created folders, copies and
 *       removals reversed newest first, refusals when the tree has
 *       changed underneath; entries from an earlier session included
 *     - Jobs: copy, move and removal report queued, counting and progress
 *       events through emit(); a copy takes a moment in proportion to its
 *       size and can be cancelled part way, keeping what it finished
 *     - Hashes for duplicate checks follow the content: true duplicates
 *       match, same-size decoys do not, large files are sampled
 *     - Open, Reveal and a terminal refuse with a plain explanation: there
 *       is no file on disk to hand to another program; nor is there a
 *       tree kept from an earlier session for a warm start
 *     - arrive() adds a file as a download would, and emits the change
 *       the service's watcher would send
 *     - No DOM: the same module answers in the page and in Node tests
 *
 * ✒ Usage Instructions:
 *     import { createDemoService } from './demo-service.js';
 *     const svc = createDemoService({ emit: (msg) => {} });
 *     const r = await svc.handle('GET', 'scan', { path: '', depth: 1 });
 *     r -> { status, json } | { status, batches } | { status, text,
 *         truncated } | { status, image: node }
 *     await svc.handle('POST', 'op', {}, { type: 'rename', path, name });
 *
 * ✒ Examples:
 *     svc.handle('GET', 'info')
 *     svc.handle('GET', 'stat', { path: 'Projects/harbor-api' })
 *     svc.handle('POST', 'op', {}, { type: 'mkdir', parent: '', name: 'New' })
 *     svc.handle('POST', 'op', {}, { type: 'copy', paths: ['Video'], dest: 'Archive', job: 'k3x9' })
 *     svc.handle('POST', 'cancel', {}, { job: 'k3x9' })
 *     svc.handle('POST', 'undo')
 *     svc.handle('POST', 'hash', {}, { paths: ['Downloads/invoice-2026-02.pdf'] })
 *
 * ✒ Other Important Information:
 *     - Dependencies: demo-world.js
 *     - Compatible platforms: current evergreen browsers; Node.js 20+
 *     - Limitations: changes live in memory only; a reload starts the
 *       world again from its seed. Paths are case-sensitive, as on Linux.
 *       A relative link carried elsewhere keeps its text, as on disk.
 * ----------------------------------------------------------------------------
 */

import { buildWorld, find, walk, textOf, insideOf, isBinary, extOf, hash32, rng, FLAG_LINK, FLAG_HIDDEN } from './demo-world.js';

export const DEMO_VERSION = '1.4.0';
export const DEMO_ROOT = '/demo/Studio';
const HOLD_DIR = '.terrane-trash';
const JOURNAL_MAX = 500;
const BATCH_MAX = 200;
const FULL_HASH = 16 * 1024 * 1024;
const COPY_RATE = 1.4 * 1024 ** 3;   // bytes a second, for how long a copy seems to take
const COPY_MAX_MS = 4000;
const TICK_MS = 120;
const RENAMES_MAX = 5000;

export class DemoError extends Error {
  constructor(code, message, status = 400, extra = {}) {
    super(message);
    this.code = code;
    this.status = status;
    Object.assign(this, extra);
  }
}

const plural = (n, one, many = `${one}s`) => `${n.toLocaleString('en-US')} ${n === 1 ? one : many}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const parentOf = (rel) => (rel.includes('/') ? rel.slice(0, rel.lastIndexOf('/')) : '');
const baseOf = (rel) => rel.slice(rel.lastIndexOf('/') + 1);
const join = (dir, name) => (dir ? `${dir}/${name}` : name);

/** The parts of a root-relative path, refused as the service's guard refuses them. */
function parts(rel) {
  const s = String(rel ?? '');
  if (s === '') return [];
  if (s.includes('\0') || s.startsWith('/') || s.includes('\\') || /^[a-z]:/i.test(s)) {
    throw new DemoError('EPATH', 'That path is not inside the authorized directory.', 403);
  }
  const out = s.split('/');
  if (out.some((p) => p === '' || p === '.' || p === '..')) {
    throw new DemoError('EPATH', 'That path is not inside the authorized directory.', 403);
  }
  if (out[0] === HOLD_DIR) throw new DemoError('EPATH', 'The holding area is reached through the Journal, not by path.', 403);
  return out;
}

function checkName(name) {
  if (typeof name !== 'string' || name.length === 0) throw new DemoError('ENAME', 'A name is required.');
  if (new TextEncoder().encode(name).length > 255) throw new DemoError('ENAME', 'That name is longer than 255 bytes.');
  if (name === '.' || name === '..') throw new DemoError('ENAME', 'That name is reserved.');
  if (name.toLowerCase() === HOLD_DIR) throw new DemoError('ENAME', 'That name is reserved by Terrane.');
  // eslint-disable-next-line no-control-regex
  if (/[/\\\u0000-\u001f]/.test(name)) throw new DemoError('ENAME', 'Names cannot contain slashes or control characters.');
}

/** A deep copy of a node; a copy keeps dates and content, as the service's copy does. */
function clone(node, birth) {
  if (!node.dir) return { ...node, birth };
  const out = { ...node, kids: new Map(), birth };
  for (const [k, v] of node.kids) out.kids.set(k, clone(v, birth));
  return out;
}

function measure(node) {
  let bytes = 0;
  let files = 0;
  walk(node, (n) => {
    if (!n.dir) {
      files++;
      bytes += n.size;
    }
  });
  return { bytes, files };
}

const ARCHIVE_FOUND = [
  [/\.(tar\.gz|tgz)$/i, 'tar.gz', 'a gzip-compressed tar archive'],
  [/\.7z$/i, '7z', 'a 7z archive'],
  [/\.rar$/i, 'rar', 'a RAR archive'],
];

/**
 * Creates the demo service over a fresh world. emit(msg) receives what
 * the service's event stream would carry: { type: 'job' | 'change' | ... }.
 */
export function createDemoService({ now = Date.now(), seed, emit = () => {}, clock = () => Date.now() } = {}) {
  const world = buildWorld({ now, seed });
  const root = world.root;
  const SESSION = `d${now.toString(36)}`;
  const journal = [];
  const holding = [];
  const jobs = new Map();
  let seq = 0;
  let holdSeq = 0;
  let queue = Promise.resolve();

  // Yesterday's session left two items in the holding area.
  if (world.held.length) {
    const ids = [];
    for (const h of world.held) {
      const id = `${Math.floor(h.at).toString(36)}-${(holdSeq++).toString(36)}`;
      holding.push({ id, name: h.node.name, origin: h.origin, at: h.at, node: h.node });
      ids.push(id);
    }
    journal.push({
      id: ++seq, type: 'trash', label: `Removed ${plural(ids.length, 'item')} to the holding area`,
      at: world.held[0].at, session: 'earlier', undo: { kind: 'restore', ids }, undone: false,
    });
  }

  /* ---------- the tree ---------- */

  const lookup = (rel) => find(root, parts(rel).join('/'));
  const dirAt = (rel) => {
    const node = lookup(rel);
    if (!node) throw new DemoError('ENOENT', 'Folder is not reachable: it is no longer there.', 404);
    if (!node.dir) throw new DemoError('ENOTDIR', 'The destination is not a folder.');
    if (node.err) throw new DemoError(node.err, 'Permission denied by the operating system.', 403);
    return node;
  };
  const target = (rel) => {
    if (parts(rel).length === 0) throw new DemoError('EPATH', 'The root itself cannot be changed.', 403);
    const node = lookup(rel);
    if (!node) throw new DemoError('ENOENT', `"${baseOf(rel)}" no longer exists.`, 404);
    return node;
  };
  const touch = (dir) => {
    dir.mtime = clock();
  };
  /** The file a link leads to, or null when it leads nowhere in the tree. */
  const follow = (rel, node) => {
    let at = rel;
    let n = node;
    for (let hops = 0; n && !n.dir && n.flags & FLAG_LINK && hops < 8; hops++) {
      const segs = parentOf(at) ? parentOf(at).split('/') : [];
      for (const p of String(n.link).split('/')) {
        if (p === '..') {
          if (!segs.length) return null;
          segs.pop();
        } else if (p && p !== '.') segs.push(p);
      }
      if (String(n.link).startsWith('/')) return null;
      at = segs.join('/');
      n = find(root, at);
    }
    return n ? { node: n, rel: at } : null;
  };

  /* ---------- scanning ---------- */

  function scan(rel, depth = Infinity) {
    const top = lookup(rel);
    if (!top) throw new DemoError('ENOENT', 'Folder is not reachable: it is no longer there.', 404);
    if (!top.dir) throw new DemoError('ENOTDIR', 'Not a folder.', 400);
    const batches = [];
    let out = [];
    let nextId = 0;
    let frontier = [[top, nextId++, -1, top === root ? root.name : top.name, 0]];
    while (frontier.length) {
      const level = frontier;
      frontier = [];
      for (const [node, id, pid, name, lvl] of level) {
        if (node.err) {
          out.push([id, pid, name, node.mtime, node.err, []]);
        } else {
          const files = [];
          const dirs = [];
          const names = [...node.kids.keys()].sort();
          for (const k of names) {
            const ch = node.kids.get(k);
            if (ch.dir) dirs.push(ch);
            else files.push(ch.name, ch.flags & FLAG_LINK ? 0 : ch.size, ch.mtime, ch.flags);
          }
          out.push([id, pid, name, node.mtime, 0, files]);
          for (const ch of dirs) {
            const cid = nextId++;
            if (lvl + 1 >= depth) out.push([cid, id, ch.name, 0, 'STUB', []]);
            else frontier.push([ch, cid, id, ch.name, lvl + 1]);
          }
        }
        if (out.length >= BATCH_MAX) {
          batches.push(out);
          out = [];
        }
      }
    }
    if (out.length) batches.push(out);
    return batches;
  }

  /* ---------- journal and holding ---------- */

  const record = (type, label, undo, affected) => {
    const entry = { id: ++seq, type, label, at: clock(), session: SESSION, undo, undone: false };
    journal.push(entry);
    while (journal.length > JOURNAL_MAX) journal.shift();
    return { ok: true, id: entry.id, label, affected, undoable: true };
  };

  /** Moves nodes into the holding area. */
  const hold = (list) => {
    const added = [];
    for (const { node, rel } of list) {
      const parent = find(root, parentOf(rel));
      parent.kids.delete(node.name);
      touch(parent);
      const id = `${clock().toString(36)}-${(holdSeq++).toString(36)}`;
      const rec = { id, name: node.name, origin: rel, at: clock(), node };
      holding.push(rec);
      added.push(rec);
    }
    return added;
  };

  const restore = (ids, { skipMissing = false } = {}) => {
    const affected = new Set();
    const names = [];
    for (const id of Array.isArray(ids) ? ids : []) {
      const rec = holding.find((r) => r.id === id);
      if (!rec && skipMissing) continue;
      if (!rec) throw new DemoError('ENOENT', 'That item is no longer in the holding area.', 404);
      const parentRel = parentOf(rec.origin);
      const parent = find(root, parentRel);
      if (!parent?.dir) throw new DemoError('ENOENT', `Cannot restore "${rec.name}": the folder it came from is no longer there.`, 404);
      if (parent.kids.has(rec.name)) throw new DemoError('EEXIST', `Cannot restore "${rec.name}": something else now has that name.`, 409);
      parent.kids.set(rec.name, rec.node);
      touch(parent);
      holding.splice(holding.indexOf(rec), 1);
      affected.add(parentRel);
      names.push(rec.name);
    }
    return { affected: [...affected], names };
  };

  /* ---------- jobs ---------- */

  const openJob = (op) => {
    const id = typeof op.job === 'string' && /^[a-z0-9]{1,40}$/i.test(op.job) && !jobs.has(op.job) ? op.job : `${clock().toString(36)}${(seq + 7).toString(36)}`;
    const job = {
      id, type: op.type, phase: 'queued', bytes: [0, 0], files: [0, 0], items: [0, 0], current: '', aborted: false,
      view() {
        return {
          id, op: this.type, phase: this.phase, bytes: [...this.bytes], files: [...this.files], items: [...this.items],
          current: this.current, cancelling: this.aborted,
        };
      },
      emit() {
        emit({ type: 'job', ...this.view() });
      },
      set(phase) {
        this.phase = phase;
        this.emit();
      },
    };
    jobs.set(id, job);
    job.emit();
    return job;
  };
  const closeJob = (job, outcome) => {
    job.phase = 'end';
    emit({ type: 'job', ...job.view(), outcome });
    jobs.delete(job.id);
  };

  /* ---------- operations ---------- */

  const handlers = {
    mkdir({ parent, name }) {
      checkName(name);
      const dir = dirAt(parent);
      if (dir.kids.has(name)) throw new DemoError('EEXIST', `"${name}" already exists here.`, 409);
      const t = clock();
      dir.kids.set(name, { name, dir: true, kids: new Map(), mtime: t, birth: t, err: null });
      touch(dir);
      const rel = join(parts(parent).join('/'), name);
      return { ...record('mkdir', `Created folder "${name}"`, { kind: 'rmdir', rel }, [parts(parent).join('/')]), created: rel };
    },

    rename({ path: rel, name }) {
      checkName(name);
      const node = target(rel);
      const pr = parentOf(rel);
      const parent = find(root, pr);
      if (node.name === name) return { ok: true, label: 'Name unchanged', affected: [], undoable: false };
      if (parent.kids.has(name)) throw new DemoError('EEXIST', `"${name}" already exists in this folder.`, 409);
      const from = node.name;
      parent.kids.delete(from);
      node.name = name;
      if (name.startsWith('.')) node.flags = (node.flags || 0) | FLAG_HIDDEN;
      else if (!node.dir) node.flags &= ~FLAG_HIDDEN;
      parent.kids.set(name, node);
      touch(parent);
      const to = join(pr, name);
      return { ...record('rename', `Renamed "${from}" to "${name}"`, { kind: 'moves', pairs: [[rel, to]] }, [pr]), renamed: to };
    },

    renames({ items }) {
      if (!Array.isArray(items) || items.length === 0) throw new DemoError('EARGS', 'Nothing was selected.');
      if (items.length > RENAMES_MAX) throw new DemoError('EARGS', `At most ${RENAMES_MAX.toLocaleString('en-US')} items can be renamed at once; ${items.length.toLocaleString('en-US')} were sent.`);
      const all = [];
      const byPath = new Map();
      for (const item of items) {
        if (!item || typeof item !== 'object' || typeof item.path !== 'string') throw new DemoError('EARGS', 'Each item needs a path and a name.');
        checkName(item.name);
        const node = target(item.path);
        const from = parts(item.path).join('/');
        if (byPath.has(from)) throw new DemoError('EARGS', `"${node.name}" is listed twice. Nothing was changed.`);
        const one = { node, from, to: join(parentOf(from), item.name), name: item.name };
        byPath.set(from, one);
        all.push(one);
      }
      for (const one of all) {
        for (let up = parentOf(one.from); up; up = parentOf(up)) {
          const outer = byPath.get(up);
          if (outer) throw new DemoError('ENEST', `"${one.node.name}" is inside "${outer.node.name}", which is renamed in the same batch. Rename them in two steps. Nothing was changed.`);
        }
      }
      const work = all.filter((one) => one.from !== one.to);
      const targets = new Map();
      for (const one of work) {
        if (find(root, one.to)) {
          const other = byPath.get(one.to);
          throw new DemoError('EEXIST', other
            ? `"${one.name}" is the name of another item in this batch now, so "${one.node.name}" cannot take it. Rename them in two steps. Nothing was changed.`
            : `"${one.name}" already exists in the folder of "${one.node.name}". Nothing was changed.`, 409);
        }
        const twin = targets.get(one.to);
        if (twin) throw new DemoError('EEXIST', `"${twin.node.name}" and "${one.node.name}" would both be named "${one.name}". Nothing was changed.`, 409);
        targets.set(one.to, one);
      }
      if (!work.length) return { ok: true, label: 'Names unchanged', affected: [], undoable: false, renamed: [] };
      const affected = [...new Set(work.map((one) => parentOf(one.from)))];
      for (const one of work) {
        const parent = find(root, parentOf(one.from));
        parent.kids.delete(one.node.name);
        one.node.name = one.name;
        if (one.name.startsWith('.')) one.node.flags = (one.node.flags || 0) | FLAG_HIDDEN;
        else if (!one.node.dir) one.node.flags &= ~FLAG_HIDDEN;
        parent.kids.set(one.name, one.node);
        touch(parent);
      }
      const pairs = work.map((one) => [one.from, one.to]);
      return { ...record('renames', `Renamed ${plural(work.length, 'item')}`, { kind: 'moves', pairs }, affected), renamed: pairs };
    },

    async transfer({ type, paths, dest, onConflict = 'fail' }, job) {
      if (!Array.isArray(paths) || paths.length === 0) throw new DemoError('EARGS', 'Nothing was selected.');
      const destRel = parts(dest).join('/');
      const dir = dirAt(destRel);
      const plan = [];
      const taken = new Set();
      for (const rel of paths) {
        const node = target(rel);
        const r = parts(rel).join('/');
        if (node.dir && (destRel === r || destRel.startsWith(`${r}/`))) {
          throw new DemoError('ELOOP', `"${node.name}" cannot be placed inside itself.`);
        }
        if (type === 'move' && parentOf(r) === destRel) throw new DemoError('ESAME', `"${node.name}" is already in that folder.`);
        let name = node.name;
        if (dir.kids.has(name) || taken.has(name)) {
          if (onConflict !== 'keepBoth' && !(type === 'copy' && parentOf(r) === destRel)) {
            throw new DemoError('EEXIST', `"${name}" already exists in the destination. Nothing was changed.`, 409);
          }
          const dot = name.lastIndexOf('.');
          const ext = dot > 0 && !node.dir ? name.slice(dot) : '';
          const stem = ext ? name.slice(0, -ext.length) : name;
          for (let i = 1; ; i++) {
            const cand = `${stem} copy${i === 1 ? '' : ` ${i}`}${ext}`;
            if (!dir.kids.has(cand) && !taken.has(cand)) {
              name = cand;
              break;
            }
          }
        }
        taken.add(name);
        plan.push({ node, from: r, to: join(destRel, name), name });
      }

      const Verb = type === 'move' ? 'Move' : 'Copy';
      const verbed = type === 'move' ? 'moving' : 'copying';
      const where = destRel || root.name;
      const affected = new Set([destRel]);
      job.items[1] = plan.length;

      // A copy counts first, then takes a moment in proportion to its size.
      let budget = 0;
      if (type === 'copy') {
        job.set('counting');
        for (const p of plan) {
          const m = measure(p.node);
          p.bytes = m.bytes;
          p.files = m.files;
          job.bytes[1] += m.bytes;
          job.files[1] += m.files;
        }
        await sleep(Math.min(300, 40 + job.files[1] / 200));
        job.emit();
        if (job.aborted) return { ok: true, cancelled: true, label: 'Copy cancelled. Nothing was changed.', affected: [], undoable: false };
        budget = Math.min(COPY_MAX_MS, (job.bytes[1] / COPY_RATE) * 1000);
      }
      job.set(verbed);
      const done = [];
      let stopped = false;
      for (const p of plan) {
        if (job.aborted) {
          stopped = true;
          break;
        }
        job.current = p.from;
        job.emit();
        if (type === 'copy' && budget > 0 && job.bytes[1] > 0) {
          const ms = (p.bytes / job.bytes[1]) * budget;
          const start = job.bytes[0];
          for (let spent = 0; spent < ms && !job.aborted; spent += TICK_MS) {
            await sleep(Math.min(TICK_MS, ms - spent));
            job.bytes[0] = Math.round(start + p.bytes * Math.min(1, (spent + TICK_MS) / ms));
            job.emit();
          }
          if (job.aborted) {
            job.bytes[0] = start;
            stopped = true;
            break;
          }
        }
        if (type === 'move') {
          const fromParent = find(root, parentOf(p.from));
          fromParent.kids.delete(p.node.name);
          touch(fromParent);
          p.node.name = p.name;
          dir.kids.set(p.name, p.node);
          affected.add(parentOf(p.from));
        } else {
          const copy = clone(p.node, clock());
          copy.name = p.name;
          dir.kids.set(p.name, copy);
          if (!(budget > 0)) job.bytes[0] += p.bytes || 0;
          job.files[0] += p.files || 0;
        }
        touch(dir);
        done.push([p.from, p.to]);
        job.items[0] = done.length;
        job.emit();
      }
      const undo = type === 'move' ? { kind: 'moves', pairs: done } : { kind: 'holdCopies', rels: done.map((d) => d[1]) };
      const results = done.map((d) => d[1]);
      if (stopped) {
        if (!done.length) return { ok: true, cancelled: true, label: `${Verb} cancelled. Nothing was changed.`, affected: [...affected], undoable: false };
        const rest = plan.length - done.length;
        const res = record(type, `${Verb} cancelled after ${done.length} of ${plural(plan.length, 'item')}`, undo, [...affected]);
        return {
          ...res, cancelled: true, results,
          label: `Cancelled after ${verbed} ${done.length} of ${plural(plan.length, 'item')} to "${where}". `
            + `The other ${rest} ${type === 'move' ? 'stayed where they were' : 'were not copied'}.`,
        };
      }
      const label = type === 'move' ? `Moved ${plural(done.length, 'item')} to "${where}"` : `Copied ${plural(done.length, 'item')} to "${where}"`;
      return { ...record(type, label, undo, [...affected]), results };
    },

    move(args, job) {
      return handlers.transfer({ ...args, type: 'move' }, job);
    },

    copy(args, job) {
      return handlers.transfer({ ...args, type: 'copy' }, job);
    },

    trash({ paths }, job) {
      if (!Array.isArray(paths) || paths.length === 0) throw new DemoError('EARGS', 'Nothing was selected.');
      const list = paths.map((rel) => ({ node: target(rel), rel: parts(rel).join('/') }));
      const tops = list.filter((a) => !list.some((b) => b !== a && a.rel.startsWith(`${b.rel}/`)));
      job.items[1] = tops.length;
      job.set('removing');
      const added = hold(tops);
      job.items[0] = added.length;
      job.emit();
      const affected = [...new Set(added.map((a) => parentOf(a.origin)))];
      return record('trash', `Removed ${plural(added.length, 'item')} to the holding area`, { kind: 'restore', ids: added.map((a) => a.id) }, affected);
    },
  };

  const undoHandlers = {
    rmdir({ rel }) {
      const node = find(root, rel);
      if (!node) return [];
      if (node.dir && node.kids.size) throw new DemoError('ENOTEMPTY', 'That folder now has contents, so it was left in place.', 409);
      const parent = find(root, parentOf(rel));
      parent.kids.delete(node.name);
      touch(parent);
      return [parentOf(rel)];
    },
    moves({ pairs }) {
      const resolved = [];
      for (const [from, to] of pairs) {
        const fromParent = find(root, parentOf(from));
        if (!fromParent?.dir || !find(root, parentOf(to))) {
          throw new DemoError('ENOENT', `Cannot undo: the folder "${baseOf(parentOf(from)) || root.name}" came from, or went to, no longer exists.`, 409);
        }
        const node = find(root, to);
        if (!node) throw new DemoError('ENOENT', `"${baseOf(to)}" is no longer where the operation left it.`, 409);
        if (find(root, from)) throw new DemoError('EEXIST', `Cannot undo: "${baseOf(from)}" exists again at the original location.`, 409);
        resolved.push([from, to, node]);
      }
      const affected = new Set();
      for (const [from, to, node] of resolved.reverse()) {
        const toParent = find(root, parentOf(to));
        const fromParent = find(root, parentOf(from));
        toParent.kids.delete(node.name);
        node.name = baseOf(from);
        fromParent.kids.set(node.name, node);
        touch(toParent);
        touch(fromParent);
        affected.add(parentOf(from));
        affected.add(parentOf(to));
      }
      return [...affected];
    },
    holdCopies({ rels }) {
      const present = [];
      for (const rel of rels) {
        const node = find(root, rel);
        if (node) present.push({ node, rel });
      }
      hold(present);
      return [...new Set(present.map((p) => parentOf(p.rel)))];
    },
    restore({ ids }) {
      return restore(ids, { skipMissing: true }).affected;
    },
  };

  const serial = (fn) => {
    const next = queue.then(fn, fn);
    queue = next.catch(() => {});
    return next;
  };

  function run(op) {
    if (op.type === 'open' || op.type === 'reveal') {
      return Promise.reject(new DemoError('EDEMO', op.type === 'open'
        ? 'This is the demo world, so there is no file on disk to open. On your own computer, Open hands the file to its default application.'
        : 'This is the demo world, so there is no file manager to show it in. On your own computer, Reveal shows the item in Explorer, Finder or your file manager.', 501));
    }
    const handler = Object.hasOwn(handlers, op.type) && op.type !== 'transfer' ? handlers[op.type] : null;
    if (!handler) return Promise.reject(new DemoError('EOP', `Unknown operation "${op.type}".`));
    const job = ['copy', 'move', 'trash'].includes(op.type) ? openJob(op) : null;
    return serial(async () => {
      let outcome = 'failed';
      try {
        if (job?.aborted) {
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
  }

  function undo() {
    return serial(async () => {
      const entry = [...journal].reverse().find((e) => !e.undone);
      if (!entry) throw new DemoError('ENOUNDO', 'There is nothing to undo.', 409);
      const affected = undoHandlers[entry.undo.kind](entry.undo);
      entry.undone = true;
      const when = entry.session === SESSION ? '' : ' (from an earlier session)';
      const res = { ok: true, label: `Undid: ${entry.label}${when}`, affected, undoable: false };
      if (entry.undo.kind === 'moves') res.moved = entry.undo.pairs.map(([from, to]) => [to, from]).reverse();
      return res;
    });
  }

  /* ---------- hashing ---------- */

  const hashOf = (node) => {
    const R = rng(hash32(`${node.s}:${node.size}`));
    let hex = '';
    while (hex.length < 40) hex += Math.floor(R() * 4294967296).toString(16).padStart(8, '0');
    return { hash: hex.slice(0, 40), mode: node.size <= FULL_HASH ? 'full' : 'sampled' };
  };

  /* ---------- thumbnails ---------- */

  /** The thumbnail index the page asks for: [path, v, kind, status, w, h, color, rungs]. */
  const thumbRows = () => {
    const rows = [];
    walk(root, (n, rel) => {
      if (!n.dir && n.img) rows.push([rel, n.s.toString(36), extOf(n.name) === 'svg' ? 'svg' : 'raster', 'ok', n.img.w, n.img.h, n.img.color, 3]);
    });
    return rows;
  };

  /* ---------- the routes ---------- */

  const info = () => ({
    version: DEMO_VERSION, root: DEMO_ROOT, name: root.name, sep: '/', platform: 'demo', readOnly: false, watch: 'demo',
    demo: { seed: world.seed, builtAt: world.now, files: world.stats.files, folders: world.stats.folders, bytes: world.stats.bytes },
  });

  async function handle(method, route, params = {}, body = {}) {
    const q = params instanceof URLSearchParams ? Object.fromEntries(params) : params || {};
    try {
      if (method === 'GET') {
        if (route === 'info') return { status: 200, json: info() };
        if (route === 'scan') {
          const depth = q.depth ? Math.max(1, Number(q.depth)) : Infinity;
          return { status: 200, batches: scan(parts(q.path).join('/'), depth) };
        }
        if (route === 'stat') {
          const rel = parts(q.path).join('/');
          const node = lookup(rel);
          if (!node) throw new DemoError('ENOENT', `"${baseOf(rel)}" no longer exists.`, 404);
          return {
            status: 200,
            json: {
              abs: rel ? `${DEMO_ROOT}/${rel}` : DEMO_ROOT, size: node.dir ? 0 : node.size, mtime: node.mtime, birthtime: node.birth,
              atime: Math.max(node.mtime, node.birth), mode: node.dir ? 0o755 : 0o644, dir: !!node.dir, link: node.link ?? null,
            },
          };
        }
        if (route === 'raw') {
          const rel = parts(q.path).join('/');
          if (!rel) throw new DemoError('EPATH', 'The root itself cannot be read.', 403);
          let node = lookup(rel);
          if (!node) throw new DemoError('ENOENT', `"${baseOf(rel)}" no longer exists.`, 404);
          let at = rel;
          if (!node.dir && node.flags & FLAG_LINK) {
            const end = follow(rel, node);
            if (!end) throw new DemoError('ENOENT', 'This link leads nowhere: its target is not there.', 404);
            ({ node, rel: at } = end);
          }
          if (node.dir) throw new DemoError('ENOTFILE', 'Not a regular file.');
          if (node.flags & 4) throw new DemoError('ENOTFILE', 'Not a regular file.');
          const max = Math.min(Number(q.max) || 262144, 32 * 1024 * 1024);
          if (node.img && !(extOf(node.name) === 'svg' && Number(q.max) <= 65536)) return { status: 200, image: node, rel: at, truncated: node.size > max };
          return { status: 200, text: textOf(node, max, at), truncated: node.size > max, binary: isBinary(node.name) };
        }
        if (route === 'inside') {
          const rel = parts(q.path).join('/');
          const node = target(rel);
          if (node.dir) throw new DemoError('ENOTFILE', `${node.name} is a folder, not an archive file.`);
          const res = insideOf(node);
          if (res) return { status: 200, json: res };
          const found = ARCHIVE_FOUND.find(([re]) => re.test(node.name));
          if (found) throw new DemoError('EFORMAT', `${node.name} is ${found[2]}. Terrane lists the contents of zip archives only.`, 415, { format: found[1] });
          throw new DemoError('ENOTARCHIVE', `${node.name} is not an archive Terrane recognizes.`, 415, { format: null });
        }
        if (route === 'journal') {
          return {
            status: 200,
            json: {
              journal: journal.map(({ id, type, label, at, undone, purged, session }) => ({ id, type, label, at, undone, purged: !!purged, earlier: session !== SESSION })),
              holding: holding.map(({ id, name, origin, at }) => ({ id, name, origin, at })),
            },
          };
        }
        if (route === 'thumbs') return { status: 200, json: { rows: thumbRows() } };
        if (route === 'warm') throw new DemoError('ENOWARM', 'The demo world is built afresh on every visit, so there is no tree kept from an earlier session.', 404);
      }
      if (method === 'POST') {
        if (route === 'op') return { status: 200, json: await run(body || {}) };
        if (route === 'undo') return { status: 200, json: await undo() };
        if (route === 'restore') {
          return {
            status: 200,
            json: await serial(async () => {
              const r = restore(body?.ids || []);
              return { ok: true, label: `Restored ${r.names.map((n) => `"${n}"`).join(', ')}`, affected: r.affected, undoable: false };
            }),
          };
        }
        if (route === 'purge') {
          return {
            status: 200,
            json: await serial(async () => {
              const n = holding.length;
              holding.length = 0;
              for (const e of journal) {
                if (e.undo.kind === 'restore' && !e.undone) {
                  e.undone = true;
                  e.purged = true;
                }
              }
              return { ok: true, label: `Permanently deleted ${plural(n, 'held item')}`, affected: [], undoable: false };
            }),
          };
        }
        if (route === 'cancel') {
          const job = jobs.get(String(body?.job || ''));
          if (!job) throw new DemoError('ENOJOB', 'That operation had already finished.', 404);
          job.aborted = true;
          job.emit();
          return { status: 200, json: { ok: true, label: 'Cancelling…' } };
        }
        if (route === 'terminal') {
          throw new DemoError('EDEMO', 'This is the demo world, so there is no folder on disk to open a terminal in. On your own computer, Terrane opens your terminal in the folder.', 501);
        }
        if (route === 'hash') {
          const results = (body?.paths || []).slice(0, 4000).map((p) => {
            try {
              const rel = parts(p).join('/');
              let node = lookup(rel);
              if (node && !node.dir && node.flags & FLAG_LINK) node = follow(rel, node)?.node || null;
              if (!node) return { error: 'ENOENT' };
              if (node.dir) return { error: 'EISDIR' };
              return hashOf(node);
            } catch (err) {
              return { error: err.code || 'EIO' };
            }
          });
          return { status: 200, json: { results } };
        }
      }
      throw new DemoError('EROUTE', 'No such endpoint.', 404);
    } catch (err) {
      const status = err instanceof DemoError ? err.status : 500;
      return {
        status,
        json: {
          ok: false, code: err.code || 'EIO', message: err.message, affected: err.affected || [],
          ...(err.format !== undefined ? { format: err.format } : {}),
          ...(Array.isArray(err.results) ? { results: err.results } : {}),
        },
      };
    }
  }

  /**
   * A file arrives in a folder as a download would, and the change the
   * service's watcher would report is emitted.
   */
  function arrive(dirRel = 'Downloads', name = 'tide-tables-2027.pdf', size = 1_284_311) {
    const dir = find(root, dirRel);
    if (!dir?.dir || dir.kids.has(name)) return false;
    const t = clock();
    dir.kids.set(name, { name, dir: false, size, mtime: t, birth: t, flags: 0, s: hash32(name) });
    touch(dir);
    emit({ type: 'change', dirs: [dirRel] });
    return true;
  }

  return { handle, arrive, world, info, lookup: (rel) => find(root, rel), follow, thumbRows };
}
