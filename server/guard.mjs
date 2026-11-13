/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Path Guard (Terrane Edition - v1.3)
 *     - File Name: guard.mjs
 *     - Relative Path: server/guard.mjs
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
 *       holding area is refused by where it really is, not only by its
 *       spelling. A segment is compared without case on Windows and macOS,
 *       and on Windows without trailing dots or spaces and with ':' refused,
 *       so .TERRANE-TRASH and the NTFS stream forms no longer reach it.
 *       assertParentInside and assertDirInside refuse a real location in
 *       or under it (its 8.3 short name and links or junctions that lead
 *       there included), and an entry that is the holding area itself.
 *       realInside(abs) gives an entry's own real location once it is
 *       proved inside the root and outside the holding area, for the
 *       routes that read or launch what a link points to. checkName
 *       refuses the reserved name in any case.
 *     - 1.2.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] —
 *       guard.contains(abs) exposes the containment test the guard uses
 *       itself, so routes that check a real path no longer build their
 *       own prefix, which doubled the separator at a drive root.
 *     - 1.1.0 (11/11/2026) [dendogg + Anthropic - Claude Opus 5.5] — Path
 *       validation is exported as relParts(), so snapshot mode refuses
 *       exactly what the live guard refuses.
 *     - 1.0.0 (11/09/2026) [dendogg + Anthropic - Claude Fable 5.2] —
 *       Initial release.
 *
 * ✒ Description:
 *     The permission boundary of the Terrane service. Every path the browser
 *     sends is a root-relative string; this module turns it into an absolute
 *     path and proves that path is inside the one authorized directory before
 *     any other module is allowed to touch the disk.
 *
 * ✒ Key Features:
 *     - Root-relative addressing: the client never sends an absolute path, so
 *       there is no absolute path to smuggle past the boundary
 *     - Lexical containment check, then a realpath check on the parent so a
 *       symbolic link inside the root cannot redirect a write outside it
 *     - The holding-area folder (.terrane-trash) is unreachable through the
 *       public addressing scheme: refused by name in any case (and on
 *       Windows in its stream forms), and by its real location, so a short
 *       name, a link or a junction that leads there is refused too
 *     - realInside(abs): an entry's own real location, proved inside the
 *       root, for anything that reads or launches what a link points to
 *     - Name validation for create and rename: separators, control
 *       characters, dot names, and on Windows the reserved characters,
 *       device names and trailing dot or space
 *     - Typed errors (code + HTTP status) so the interface can explain a
 *       refusal instead of showing a generic failure
 *
 * ✒ Usage Instructions:
 *     import { makeGuard, GuardError } from './guard.mjs';
 *     const guard = await makeGuard('/data/projects');
 *     const abs = guard.resolve('music/demos');      // lexical check
 *     await guard.assertParentInside(abs);            // symlink check
 *     const real = await guard.realInside(abs);       // before reading it
 *     guard.checkName('New folder');                  // throws GuardError
 *
 * ✒ Other Important Information:
 *     - Dependencies: Node.js built-ins only (node:path, node:fs)
 *     - Compatible platforms: Node.js 20+ on Windows, macOS, Linux
 *     - Security: resolve() is lexical only; any operation that writes must
 *       also call assertParentInside(), and anything that follows a link to
 *       read or launch it must use realInside()
 * ----------------------------------------------------------------------------
 */

import path from 'node:path';
import fs from 'node:fs/promises';

export const HOLD_DIR = '.terrane-trash';

export class GuardError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

const WIN_RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i;
const WIN = process.platform === 'win32';
/** Whether names that differ only in case are the same entry here (Windows, default macOS). */
const FOLDS = WIN || process.platform === 'darwin';
const HELD = 'The holding area is managed by Terrane.';

/**
 * A segment as the filesystem resolves it, for comparing with a reserved
 * name: without case where case does not matter, and on Windows without
 * the trailing dots and spaces the system drops.
 */
const folded = (seg) => {
  let s = FOLDS ? seg.toLowerCase() : seg;
  if (WIN) s = s.replace(/[. ]+$/, '');
  return s;
};

/**
 * Validates a root-relative posix-style path and returns its segments.
 * Shared by the live guard and by snapshot mode, so both refuse the same
 * inputs.
 */
export function relParts(rel) {
  if (typeof rel !== 'string') throw new GuardError('EPATH', 'Path must be a string.');
  if (rel.includes('\0')) throw new GuardError('EPATH', 'Path contains a null byte.');
  const parts = rel.split('/').filter((p) => p !== '');
  for (const p of parts) {
    if (p === '.' || p === '..') throw new GuardError('EPATH', 'Relative segments are not allowed.');
    if (folded(p) === HOLD_DIR) throw new GuardError('EPATH', HELD, 403);
    // A colon on Windows names a drive or an NTFS stream, never a file:
    // ".terrane-trash::$INDEX_ALLOCATION" is the holding area itself.
    if (WIN && (p.includes('\\') || p.includes(':'))) throw new GuardError('EPATH', 'Invalid path segment.');
  }
  return parts;
}

export async function makeGuard(rootInput) {
  const root = await fs.realpath(path.resolve(rootInput));
  const stat = await fs.stat(root);
  if (!stat.isDirectory()) throw new GuardError('ENOTDIR', `Not a directory: ${root}`);
  const prefix = root.endsWith(path.sep) ? root : root + path.sep;
  const inside = (abs) => abs === root || abs.startsWith(prefix);
  // The holding area, where it really is: the root is already real, so
  // this is the one place any spelling, short name or link resolves to.
  const holdRoot = path.join(root, HOLD_DIR);
  const holdKey = FOLDS ? holdRoot.toLowerCase() : holdRoot;
  /** True when a real path is the holding area or lies under it. */
  const held = (real) => {
    const r = FOLDS ? real.toLowerCase() : real;
    return r === holdKey || r.startsWith(holdKey + path.sep);
  };
  /** True when abs names the holding area's own entry, by any name (8.3 included). */
  const isHoldEntry = async (abs) => {
    try {
      const [a, h] = await Promise.all([fs.lstat(abs, { bigint: true }), fs.lstat(holdRoot, { bigint: true })]);
      return a.ino !== 0n && a.ino === h.ino && a.dev === h.dev;
    } catch {
      return false;
    }
  };

  return {
    root,
    holdRoot,

    /**
     * True when an absolute path is the root or lies under it. Safe when the
     * root is a drive or filesystem root, whose path already ends in a separator.
     */
    contains: inside,

    /** True when a real (resolved) path is the holding area or lies under it. */
    held,

    /** Root-relative posix-style string -> absolute path inside the root. */
    resolve(rel, { allowRoot = true } = {}) {
      const abs = path.join(root, ...relParts(rel));
      if (!inside(abs)) throw new GuardError('EOUTSIDE', 'Path is outside the authorized directory.', 403);
      if (!allowRoot && abs === root) {
        throw new GuardError('EROOT', 'The authorized root itself cannot be changed from here.', 403);
      }
      return abs;
    },

    /**
     * Proves the real location of abs's parent is inside the root and
     * outside the holding area, and that abs itself is not the holding
     * area under another name.
     */
    async assertParentInside(abs) {
      let real;
      try {
        real = await fs.realpath(path.dirname(abs));
      } catch (err) {
        throw new GuardError(err.code || 'ENOENT', `Parent folder is not reachable: ${err.message}`, 404);
      }
      if (!inside(real)) {
        throw new GuardError('EOUTSIDE', 'A symbolic link leads outside the authorized directory.', 403);
      }
      if (held(real) || (await isHoldEntry(abs))) throw new GuardError('EPATH', HELD, 403);
    },

    /** Proves a directory's own real location is inside the root and outside the holding area. */
    async assertDirInside(abs) {
      let real;
      try {
        real = await fs.realpath(abs);
      } catch (err) {
        throw new GuardError(err.code || 'ENOENT', `Folder is not reachable: ${err.message}`, 404);
      }
      if (!inside(real)) {
        throw new GuardError('EOUTSIDE', 'A symbolic link leads outside the authorized directory.', 403);
      }
      if (held(real)) throw new GuardError('EPATH', HELD, 403);
    },

    /**
     * The real location of abs itself (a link followed to its end), once
     * it is proved inside the root and outside the holding area. For
     * anything that reads or launches what abs leads to.
     */
    async realInside(abs, { gone = null } = {}) {
      let real;
      try {
        real = await fs.realpath(abs);
      } catch (err) {
        throw new GuardError(err.code || 'ENOENT', gone || `"${path.basename(abs)}" cannot be reached: ${err.message}`, 404);
      }
      if (!inside(real)) throw new GuardError('EOUTSIDE', 'This link points outside the authorized directory.', 403);
      if (held(real)) throw new GuardError('EPATH', HELD, 403);
      return real;
    },

    rel(abs) {
      return path.relative(root, abs).split(path.sep).join('/');
    },

    checkName(name) {
      if (typeof name !== 'string' || name.length === 0) throw new GuardError('ENAME', 'A name is required.');
      if (Buffer.byteLength(name) > 255) throw new GuardError('ENAME', 'That name is longer than 255 bytes.');
      if (name === '.' || name === '..') throw new GuardError('ENAME', 'That name is reserved.');
      // In any case: on a volume that ignores case, .Terrane-Trash would
      // become the holding area.
      if (name.toLowerCase() === HOLD_DIR || folded(name) === HOLD_DIR) throw new GuardError('ENAME', 'That name is reserved by Terrane.');
      // eslint-disable-next-line no-control-regex
      if (/[\/\\\u0000-\u001f]/.test(name)) {
        throw new GuardError('ENAME', 'Names cannot contain slashes or control characters.');
      }
      if (WIN) {
        if (/[<>:"|?*]/.test(name)) throw new GuardError('ENAME', 'Windows does not allow < > : " | ? * in names.');
        if (/[. ]$/.test(name)) throw new GuardError('ENAME', 'Windows names cannot end with a dot or a space.');
        if (WIN_RESERVED.test(name)) throw new GuardError('ENAME', 'That is a reserved Windows device name.');
      }
      return name;
    },
  };
}
