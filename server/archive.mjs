/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Archive Reader (Terrane Edition - v1.0)
 *     - File Name: archive.mjs
 *     - Relative Path: server/archive.mjs
 *     - Artifact Type: javascript
 *     - Version: 1.0.0
 *     - Date: 11/13/2026
 *     - Update: Friday, November 13, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Description:
 *     Reads what an archive holds without unpacking it. A zip archive's
 *     central directory is read in one pass and turned into the same
 *     per-folder records the scanner produces, so the interface can show
 *     an archive's contents with the machinery it already has. The file is
 *     untrusted input: every count, size and offset is checked, the work is
 *     bounded, and entry names are only ever data.
 *
 * ✒ Key Features:
 *     - Format sniffing from the first bytes: zip, 7z, RAR, gzip, bzip2,
 *       xz, zstd, cabinet, ar and tar are named; only zip is listed
 *     - A name that claims a format the bytes do not have is reported as
 *       not an archive, naming the format the name suggests
 *     - End of central directory found from the file's tail, preferring a
 *       record whose comment runs exactly to the end of the file
 *     - ZIP64 end records and per-entry ZIP64 sizes; data before the
 *       archive (a self-extracting stub) is tolerated
 *     - Names: UTF-8 when flagged, the Unicode Path field when its CRC
 *       matches the stored name, otherwise valid UTF-8 or code page 437
 *     - Dates: the extended timestamp or NTFS field (UTC) over the DOS
 *       date and time (local)
 *     - Flags per entry, matching the scanner's bits: 1 symbolic link
 *       (Unix mode), 2 hidden, 4 special, plus 8 locked (encrypted) and
 *       16 escape (a name that would land outside the folder if extracted)
 *     - Bounds: 100,000 entries, a 64 MB directory, 4 seconds, 128 folders
 *       deep and 100,000 folders; anything left out is stated in one
 *       sentence
 *     - Damage is named: a cut-short file, misplaced records, or a
 *       directory that breaks off part way, which lists what came before
 *     - At most two archives are read at once; a cancelled request stops
 *       between reads
 *
 * ✒ Usage Instructions:
 *     import { inspect } from './archive.mjs';
 *     const inside = await inspect('/data/site.zip', { name: 'site.zip', signal });
 *     inside.records has the scanner's shape, parents before children:
 *         [id, parentId, name, mtimeMs, 0, files]
 *     with files flat as name, size, mtimeMs, flags. Refusals are thrown
 *     as GuardError with a status: 400 ENOTFILE, 415 EFORMAT (a format
 *     other than zip, or a split or encrypted directory) or ENOTARCHIVE,
 *     and 422 EDAMAGED.
 *
 * ✒ Examples:
 *     sniff(Buffer.from([0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c]), 'a.7z')
 *         -> { format: '7z', label: 'a 7z archive' }
 *     claimed('backup.tar.gz') -> { format: 'tar.gz', label: ... }
 *     toRecords([{ name: 'a/b.txt', dir: false, size: 3, packed: 3,
 *         mtime: 0, locked: false, link: false, special: false }])
 *     inspect(file, { name, limits: { ...LIMITS, entries: 50 } })
 *     inside.partial -> 'Only part of many.zip is listed, ...' or null
 *
 * ✒ Other Important Information:
 *     - Dependencies: Node.js built-ins only (node:fs, node:zlib);
 *       ./guard.mjs for typed errors
 *     - Compatible platforms: Node.js 22.5+ on Windows, macOS, Linux
 *     - Security: the reader never writes, never extracts, and never joins
 *       an entry name to a path on disk; a name is split into segments,
 *       '.' and '..' are resolved lexically inside the archive, and an
 *       entry that climbs out or is absolute is kept, flagged and counted
 *     - Limitations: zip only (tar and its compressed forms are named but
 *       not listed); entry contents and CRCs are not read; a symbolic
 *       link's size is reported as 0, as the scanner does
 * ----------------------------------------------------------------------------
 */

import fsp from 'node:fs/promises';
import { constants as FS } from 'node:fs';
import zlib from 'node:zlib';
import { GuardError } from './guard.mjs';

/* ---------- flags and bounds ---------- */

export const FLAG_LINK = 1;
export const FLAG_HIDDEN = 2;
export const FLAG_SPECIAL = 4;
export const FLAG_LOCKED = 8;
export const FLAG_ESCAPE = 16;

export const LIMITS = Object.freeze({
  /** Central-directory entries read from one archive. */
  entries: 100_000,
  /** Bytes of central directory read. */
  directoryBytes: 64 * 1024 * 1024,
  /** Time from opening the file to the last entry parsed. */
  ms: 4000,
  /** Folders deep inside the archive. */
  depth: 128,
  /** Folders, named or implied, in one listing. */
  folders: 100_000,
  /** Escaping names returned verbatim. */
  escaped: 32,
  /** Archives read at the same time. */
  inFlight: 2,
});

const SIG = {
  CENTRAL: 0x02014b50,
  END: 0x06054b50,
  END64: 0x06064b50,
  LOC64: 0x07064b50,
  EXTRA_DATA: 0x08064b50,
  SIGNATURE: 0x05054b50,
};
const HEAD_BYTES = 512;
const END_MIN = 22;
const END_MAX = END_MIN + 0xffff;
const CHUNK = 4 * 1024 * 1024;

/* ---------- sniffing ---------- */

const starts = (b, bytes) => b.length >= bytes.length && bytes.every((x, i) => b[i] === x);

const SIGNATURES = [
  ['zip', 'a zip archive', (b) => b.length >= 4 && b[0] === 0x50 && b[1] === 0x4b
    && ((b[2] === 3 && b[3] === 4) || (b[2] === 5 && b[3] === 6) || (b[2] === 7 && b[3] === 8))],
  ['7z', 'a 7z archive', (b) => starts(b, [0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c])],
  ['rar', 'a RAR archive', (b) => starts(b, [0x52, 0x61, 0x72, 0x21, 0x1a, 0x07])],
  ['gzip', 'gzip-compressed data', (b) => starts(b, [0x1f, 0x8b])],
  ['bzip2', 'bzip2-compressed data', (b) => starts(b, [0x42, 0x5a, 0x68])],
  ['xz', 'xz-compressed data', (b) => starts(b, [0xfd, 0x37, 0x7a, 0x58, 0x5a, 0x00])],
  ['zstd', 'zstd-compressed data', (b) => starts(b, [0x28, 0xb5, 0x2f, 0xfd])],
  ['cab', 'a Windows cabinet archive', (b) => starts(b, [0x4d, 0x53, 0x43, 0x46])],
  ['ar', 'an ar archive', (b) => starts(b, [0x21, 0x3c, 0x61, 0x72, 0x63, 0x68, 0x3e, 0x0a])],
  ['tar', 'a tar archive', (b) => b.length >= 262 && b.toString('latin1', 257, 262) === 'ustar'],
];

/** Compressed tar names: the stream format the bytes show, and the format the name adds. */
const TAR_NAMES = {
  gzip: [/\.(tar\.gz|tgz)$/i, 'tar.gz', 'a gzip-compressed tar archive'],
  bzip2: [/\.(tar\.bz2|tbz2?)$/i, 'tar.bz2', 'a bzip2-compressed tar archive'],
  xz: [/\.(tar\.xz|txz)$/i, 'tar.xz', 'an xz-compressed tar archive'],
  zstd: [/\.(tar\.zst|tzst)$/i, 'tar.zst', 'a zstd-compressed tar archive'],
};

const CLAIMS = [
  ...Object.values(TAR_NAMES),
  [/\.gz$/i, 'gzip', 'gzip-compressed data'],
  [/\.bz2$/i, 'bzip2', 'bzip2-compressed data'],
  [/\.xz$/i, 'xz', 'xz-compressed data'],
  [/\.zst$/i, 'zstd', 'zstd-compressed data'],
  [/\.tar$/i, 'tar', 'a tar archive'],
  [/\.7z$/i, '7z', 'a 7z archive'],
  [/\.rar$/i, 'rar', 'a RAR archive'],
  [/\.cab$/i, 'cab', 'a Windows cabinet archive'],
  [/\.(zip|zipx|jar|war|ear|apk|aar|ipa|xpi|epub|docx|xlsx|pptx|odt|ods|odp|whl|nupkg|vsix|kmz|3mf)$/i, 'zip', 'a zip archive'],
];

/** The archive format the first bytes show, or null. The name refines compressed tars. */
export function sniff(head, name = '') {
  for (const [format, label, test] of SIGNATURES) {
    if (!test(head)) continue;
    const tar = TAR_NAMES[format];
    if (tar && tar[0].test(name)) return { format: tar[1], label: tar[2] };
    return { format, label };
  }
  return null;
}

/** The archive format a file's name suggests, or null. */
export function claimed(name) {
  const hit = CLAIMS.find(([re]) => re.test(name));
  return hit ? { format: hit[1], label: hit[2] } : null;
}

function refusal(name, found, size) {
  if (found) {
    const err = new GuardError('EFORMAT', `${name} is ${found.label}. Terrane lists the contents of zip archives only.`, 415);
    err.format = found.format;
    return err;
  }
  const claim = claimed(name);
  const message = size === 0
    ? `${name} is empty, so there is no archive inside it to list.`
    : claim
      ? `${name} is not an archive: its name suggests ${claim.label} (${claim.format}), but its first bytes do not match one.`
      : `${name} is not an archive Terrane recognizes.`;
  const err = new GuardError('ENOTARCHIVE', message, 415);
  err.format = null;
  if (claim) err.claimed = claim.format;
  return err;
}

/* ---------- names and dates ---------- */

// Code page 437, bytes 0x80 to 0xFF: the encoding zip names have when the
// UTF-8 flag is not set.
const CP437 = [
  'ÇüéâäàåçêëèïîìÄÅ', 'ÉæÆôöòûùÿÖÜ¢£¥₧ƒ', 'áíóúñÑªº¿⌐¬½¼¡«»', '░▒▓│┤╡╢╖╕╣║╗╝╜╛┐',
  '└┴┬├─┼╞╟╚╔╩╦╠═╬╧', '╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀', 'αßΓπΣσµτΦΘΩδ∞φε∩', '≡±≥≤⌠⌡÷≈°∙·√ⁿ²■ ',
].join('');
if (CP437.length !== 128) throw new Error('Code page 437 table must hold 128 characters.');
const STRICT_UTF8 = new TextDecoder('utf-8', { fatal: true });

/** A name without the UTF-8 flag: ASCII, valid UTF-8 (many tools omit the flag), else CP437. */
export function decodeLegacy(raw) {
  let ascii = true;
  for (const b of raw) {
    if (b >= 0x80) {
      ascii = false;
      break;
    }
  }
  if (ascii) return raw.toString('latin1');
  try {
    return STRICT_UTF8.decode(raw);
  } catch {
    let s = '';
    for (const b of raw) s += b < 0x80 ? String.fromCharCode(b) : CP437[b - 0x80];
    return s;
  }
}

/** DOS date and time (local, two-second steps) to epoch ms; 0 when absent or invalid. */
export function dosTime(date, time) {
  if (!date) return 0;
  const mo = (date >> 5) & 15;
  const d = date & 31;
  const h = time >> 11;
  const mi = (time >> 5) & 63;
  const s = (time & 31) * 2;
  if (mo < 1 || mo > 12 || d < 1 || h > 23 || mi > 59 || s > 59) return 0;
  return new Date(1980 + (date >> 9), mo - 1, d, h, mi, s).getTime();
}

const safe = (big) => (big <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(big) : null);

/* ---------- reading ---------- */

const aborted = () => new GuardError('EABORT', 'The request was cancelled.', 499);

/** Reads length bytes at position, in chunks so a cancel or the deadline can stop it. */
async function readFully(fd, buf, length, position, { signal, deadline = Infinity } = {}) {
  let got = 0;
  while (got < length) {
    const { bytesRead } = await fd.read(buf, got, Math.min(CHUNK, length - got), position + got);
    if (bytesRead === 0) break;
    got += bytesRead;
    if (signal?.aborted) throw aborted();
    if (got < length && performance.now() > deadline) break;
  }
  return got;
}

async function readSmall(fd, position, length) {
  const buf = Buffer.alloc(length);
  return buf.subarray(0, await readFully(fd, buf, length, position));
}

/** One central-directory header at p, whose name and extra lengths are known to fit. */
function parseEntry(cd, p, nl, xl) {
  const made = cd.readUInt16LE(p + 4) >> 8;
  const flags = cd.readUInt16LE(p + 8);
  const time = cd.readUInt16LE(p + 12);
  const date = cd.readUInt16LE(p + 14);
  let packed = cd.readUInt32LE(p + 20);
  let size = cd.readUInt32LE(p + 24);
  const attrs = cd.readUInt32LE(p + 38);
  const raw = cd.subarray(p + 46, p + 46 + nl);
  let name = null;
  let mtime = 0;
  for (let x = p + 46 + nl, end = x + xl; x + 4 <= end;) {
    const id = cd.readUInt16LE(x);
    const body = x + 4;
    x = body + cd.readUInt16LE(x + 2);
    if (x > end) break;
    if (id === 0x0001) {
      // ZIP64: only the saturated fields are present, in this order.
      let q = body;
      if (size === 0xffffffff && q + 8 <= x) {
        size = safe(cd.readBigUInt64LE(q)) ?? Number.MAX_SAFE_INTEGER;
        q += 8;
      }
      if (packed === 0xffffffff && q + 8 <= x) packed = safe(cd.readBigUInt64LE(q)) ?? Number.MAX_SAFE_INTEGER;
    } else if (id === 0x7075 && x - body >= 5 && cd[body] === 1) {
      // Unicode Path: trusted only while it still describes the stored name.
      if (cd.readUInt32LE(body + 1) === zlib.crc32(raw) >>> 0) name = cd.toString('utf8', body + 5, x);
    } else if (id === 0x5455 && x - body >= 5 && cd[body] & 1) {
      const sec = cd.readInt32LE(body + 1);
      if (sec > 0) mtime = sec * 1000;
    } else if (id === 0x000a && !mtime) {
      for (let t = body + 4; t + 4 <= x;) {
        const tag = cd.readUInt16LE(t);
        const len = cd.readUInt16LE(t + 2);
        if (tag === 1 && len >= 24 && t + 28 <= x) {
          const ms = Number(cd.readBigUInt64LE(t + 4) / 10000n) - 11644473600000;
          if (ms > 0) mtime = ms;
          break;
        }
        t += 4 + len;
      }
    }
  }
  if (name === null) name = flags & 0x0800 ? raw.toString('utf8') : decodeLegacy(raw);
  const unix = made === 3 || made === 19;
  const type = unix ? (attrs >>> 16) & 0o170000 : 0;
  const link = type === 0o120000;
  return {
    name,
    dir: !link && (/[\\/]$/.test(name) || type === 0o040000 || (!unix && (attrs & 0x10) !== 0 && size === 0)),
    size,
    packed,
    mtime: mtime || dosTime(date, time),
    locked: (flags & 1) !== 0,
    link,
    special: type !== 0 && type !== 0o100000 && type !== 0o040000 && !link,
  };
}

/**
 * Lists a zip archive from its central directory. Returns
 * { declared, entries, cut, directoryBytes } where cut is null or the
 * reason reading stopped early: 'entries', 'bytes', 'time' or 'damaged'.
 */
export async function listZip(fd, size, { name = 'The archive', limits = LIMITS, signal, deadline = Infinity } = {}) {
  const damaged = (why) => new GuardError('EDAMAGED', `${name} looks damaged: ${why}, so its contents cannot be listed.`, 422);
  const unsupported = (why) => {
    const err = new GuardError('EFORMAT', `${name} is a zip archive ${why}, which Terrane cannot list.`, 415);
    err.format = 'zip';
    return err;
  };
  if (size < END_MIN) throw damaged('it is too short to hold a zip directory');

  // The end record: the last one whose comment runs exactly to the end of
  // the file, else the last one that fits (data appended after the archive).
  const tailLen = Math.min(size, END_MAX);
  const tailAt = size - tailLen;
  const tail = await readSmall(fd, tailAt, tailLen);
  if (tail.length < tailLen) throw damaged('it ended while it was being read');
  let e = -1;
  let loose = -1;
  for (let i = tailLen - END_MIN; i >= 0; i--) {
    if (tail.readUInt32LE(i) !== SIG.END) continue;
    const end = i + END_MIN + tail.readUInt16LE(i + 20);
    if (end === tailLen) {
      e = i;
      break;
    }
    if (loose < 0 && end <= tailLen) loose = i;
  }
  if (e < 0) e = loose;
  if (e < 0) throw damaged('the record that ends its directory is missing, as when a file is cut short');
  const endAt = tailAt + e;
  let disk = tail.readUInt16LE(e + 4);
  let cdDisk = tail.readUInt16LE(e + 6);
  let declared = tail.readUInt16LE(e + 10);
  let cdSize = tail.readUInt32LE(e + 12);
  let cdOff = tail.readUInt32LE(e + 16);
  let dirEnd = endAt;
  const wide = cdSize === 0xffffffff || cdOff === 0xffffffff;

  // ZIP64: a locator just before the end record points at a wider record.
  const locAt = endAt - 20;
  const loc = locAt >= 0 ? await readSmall(fd, locAt, 20) : null;
  if (loc?.length === 20 && loc.readUInt32LE(0) === SIG.LOC64) {
    if (loc.readUInt32LE(16) > 1) throw unsupported('split across several files');
    let at = safe(loc.readBigUInt64LE(8));
    let rec = at !== null && at + 56 <= locAt ? await readSmall(fd, at, 56) : null;
    if (rec?.length !== 56 || rec.readUInt32LE(0) !== SIG.END64) {
      // Data before the archive shifts its offsets; the record usually sits
      // right before its locator.
      at = locAt - 56;
      rec = at >= 0 ? await readSmall(fd, at, 56) : null;
    }
    if (rec?.length === 56 && rec.readUInt32LE(0) === SIG.END64) {
      disk = rec.readUInt32LE(16);
      cdDisk = rec.readUInt32LE(20);
      declared = safe(rec.readBigUInt64LE(32));
      cdSize = safe(rec.readBigUInt64LE(40));
      cdOff = safe(rec.readBigUInt64LE(48));
      dirEnd = at;
      if (declared === null || cdSize === null || cdOff === null) throw damaged('its ZIP64 end record gives sizes no file can have');
    } else if (wide || declared === 0xffff) throw damaged('its ZIP64 end records are missing or out of place');
  } else if (wide) throw damaged('its ZIP64 end records are missing');
  if (disk !== 0 || cdDisk !== 0) throw unsupported('split across several files');
  if (cdSize > dirEnd) throw damaged('its directory claims to be larger than the file');
  if (cdSize === 0 && declared > 0) throw damaged(`its directory is empty, yet its end record counts ${count(declared)} entries`);

  // Where the directory starts: as declared, or shifted by data before the archive.
  let cdAt = -1;
  if (cdSize === 0) cdAt = dirEnd;
  else {
    for (const at of new Set([cdOff, dirEnd - cdSize])) {
      if (at < 0 || at + cdSize > dirEnd) continue;
      const sig = await readSmall(fd, at, 4);
      if (sig.length < 4) continue;
      const s = sig.readUInt32LE(0);
      if (s === SIG.EXTRA_DATA) throw unsupported('whose directory is encrypted');
      if (s === SIG.CENTRAL) {
        cdAt = at;
        break;
      }
    }
  }
  if (cdAt < 0) throw damaged('its directory is not where its end record says');

  const want = Math.min(cdSize, limits.directoryBytes);
  const cd = Buffer.alloc(want);
  const got = await readFully(fd, cd, want, cdAt, { signal, deadline });
  const short = got < want ? (performance.now() > deadline ? 'time' : 'damaged') : want < cdSize ? 'bytes' : null;
  const entries = [];
  let cut = null;
  for (let p = 0; p < got;) {
    if (entries.length >= limits.entries) {
      cut = 'entries';
      break;
    }
    if ((entries.length & 1023) === 1023) {
      if (signal?.aborted) throw aborted();
      if (performance.now() > deadline) {
        cut = 'time';
        break;
      }
    }
    if (p + 46 > got) {
      cut = short || 'damaged';
      break;
    }
    const sig = cd.readUInt32LE(p);
    if (sig === SIG.SIGNATURE && !short) break;
    if (sig !== SIG.CENTRAL) {
      cut = 'damaged';
      break;
    }
    const nl = cd.readUInt16LE(p + 28);
    const xl = cd.readUInt16LE(p + 30);
    const next = p + 46 + nl + xl + cd.readUInt16LE(p + 32);
    if (next > got) {
      cut = short || 'damaged';
      break;
    }
    entries.push(parseEntry(cd, p, nl, xl));
    p = next;
  }
  if (!cut && short) cut = short;
  if (cut === 'damaged' && entries.length === 0) throw damaged('its directory does not begin with an entry');
  return { declared, entries, cut, directoryBytes: cdSize };
}

/* ---------- records ---------- */

/**
 * Entry list -> scanner records, parents before children. Names are split
 * into segments and resolved inside the archive; nothing here touches the
 * filesystem. Returns the records with totals, what was left out, and how
 * many entries were processed before the deadline.
 */
export function toRecords(entries, { rootName = '', limits = LIMITS, deadline = Infinity, signal } = {}) {
  const root = { id: 0, pid: -1, name: rootName, mtime: 0, files: [], sub: new Map() };
  const order = [root];
  const left = { deep: 0, folders: 0, unnamed: 0 };
  const escaped = [];
  const totals = { files: 0, unpacked: 0, packed: 0, locked: 0, links: 0, escapes: 0 };

  /** The folder for segs[0..n), created as needed; null past the folder bound. */
  const folderAt = (segs, n) => {
    let at = root;
    for (let i = 0; i < n; i++) {
      let next = at.sub.get(segs[i]);
      if (!next) {
        if (order.length - 1 >= limits.folders) return null;
        next = { id: order.length, pid: at.id, name: segs[i], mtime: 0, files: [], sub: new Map() };
        at.sub.set(segs[i], next);
        order.push(next);
      }
      at = next;
    }
    return at;
  };

  let processed = 0;
  for (; processed < entries.length; processed++) {
    if ((processed & 1023) === 1023) {
      if (signal?.aborted) throw aborted();
      if (performance.now() > deadline) break;
    }
    const e = entries[processed];
    const segs = [];
    // Absolute ('/x', '\\server\x') and drive-lettered ('C:\x', 'C:x')
    // names land outside the folder on some system. A bare drive
    // designator is not a folder name; 'a:b.txt' keeps its name.
    let escape = /^[\\/]/.test(e.name) || /^[a-z]:/i.test(e.name);
    const parts = e.name.split(/[\\/]/);
    if (/^[a-z]:$/i.test(parts[0])) parts[0] = '';
    for (const s of parts) {
      if (s === '' || s === '.') continue;
      if (s === '..') {
        if (segs.length) segs.pop();
        else escape = true;
      } else segs.push(s);
    }
    if (escape) {
      totals.escapes++;
      if (escaped.length < limits.escaped) escaped.push({ name: e.name, at: segs.join('/') });
    }
    if (e.dir) {
      if (!segs.length) continue;
      if (segs.length > limits.depth) {
        left.deep++;
        continue;
      }
      const dir = folderAt(segs, segs.length);
      if (!dir) left.folders++;
      else if (e.mtime > dir.mtime) dir.mtime = e.mtime;
      continue;
    }
    if (!segs.length) {
      left.unnamed++;
      continue;
    }
    if (segs.length - 1 > limits.depth) {
      left.deep++;
      continue;
    }
    const dir = folderAt(segs, segs.length - 1);
    if (!dir) {
      left.folders++;
      continue;
    }
    const leaf = segs[segs.length - 1];
    const size = e.link ? 0 : e.size;
    const flags = (e.link ? FLAG_LINK : 0) | (leaf.startsWith('.') ? FLAG_HIDDEN : 0) | (e.special ? FLAG_SPECIAL : 0)
      | (e.locked ? FLAG_LOCKED : 0) | (escape ? FLAG_ESCAPE : 0);
    dir.files.push(leaf, size, e.mtime, flags);
    totals.files++;
    totals.unpacked += size;
    totals.packed += e.packed;
    if (e.locked) totals.locked++;
    if (e.link) totals.links++;
  }
  return {
    records: order.map((d) => [d.id, d.pid, d.name, d.mtime, 0, d.files]),
    folders: order.length - 1,
    ...totals,
    escaped,
    left,
    processed,
  };
}

/* ---------- the whole read ---------- */

const count = (n) => n.toLocaleString('en-US');
const plural = (n, one, many) => `${count(n)} ${n === 1 ? one : many}`;

/** One sentence saying what a listing leaves out, or null when it is whole. */
export function partialSentence(name, { declared, read, cut, directoryBytes, left, limits = LIMITS }) {
  const lost = [];
  if (left.deep) lost.push(`${plural(left.deep, 'entry is', 'entries are')} nested more than ${limits.depth} folders deep`);
  if (left.folders) lost.push(`${plural(left.folders, 'entry needs', 'entries need')} more than ${count(limits.folders)} folders`);
  if (left.unnamed) lost.push(`${plural(left.unnamed, 'entry has', 'entries have')} no usable name`);
  if (!cut) {
    if (!lost.length) return null;
    const out = left.deep + left.folders + left.unnamed;
    return `${name} is listed without ${count(out)} of its ${count(read)} entries: ${lost.join('; ')}.`;
  }
  const why = {
    entries: `Terrane reads at most ${count(limits.entries)} entries from one archive`,
    bytes: `its directory is ${(directoryBytes / 1048576).toFixed(1)} MB and Terrane reads at most the first ${Math.round(limits.directoryBytes / 1048576)} MB`,
    time: `reading stopped after ${(limits.ms / 1000).toLocaleString('en-US')} seconds`,
    damaged: 'its directory looks damaged after that point',
  }[cut];
  const of = declared > read ? ` of ${count(declared)}` : '';
  return `Only part of ${name} is listed, the first ${count(read)}${of} entries: ${[why, ...lost].join('; ')}.`;
}

let running = 0;
const waiting = [];
async function acquire(limit) {
  if (running < limit) {
    running++;
    return;
  }
  await new Promise((resolve) => waiting.push(resolve));
}
function release() {
  const next = waiting.shift();
  if (next) next();
  else running--;
}

/**
 * Reads what the archive at `file` holds. `file` must already be proven to
 * lie inside the authorized directory; `name` is how sentences refer to it.
 */
export async function inspect(file, { name = 'The archive', signal, limits = LIMITS } = {}) {
  await acquire(limits.inFlight);
  try {
    if (signal?.aborted) throw aborted();
    return await inspectNow(file, { name, signal, limits });
  } finally {
    release();
  }
}

async function inspectNow(file, { name, signal, limits }) {
  const started = performance.now();
  const deadline = started + limits.ms;
  let fd;
  try {
    // Non-blocking, so a pipe swapped in after the caller's checks cannot hang the read.
    fd = await fsp.open(file, FS.O_RDONLY | (FS.O_NONBLOCK || 0));
  } catch (err) {
    if (err.code === 'ENOENT') throw new GuardError('ENOENT', `${name} is no longer there.`, 404);
    if (err.code === 'EISDIR') throw new GuardError('ENOTFILE', `${name} is a folder, not an archive file.`);
    throw err;
  }
  try {
    const st = await fd.stat();
    if (!st.isFile()) throw new GuardError('ENOTFILE', st.isDirectory() ? `${name} is a folder, not an archive file.` : `${name} is not a regular file.`);
    const head = await readSmall(fd, 0, Math.min(HEAD_BYTES, st.size));
    const found = sniff(head, name);
    if (found?.format !== 'zip') throw refusal(name, found, st.size);
    const z = await listZip(fd, st.size, { name, limits, signal, deadline });
    if (signal?.aborted) throw aborted();
    const t = toRecords(z.entries, { rootName: name, limits, deadline, signal });
    // Placing entries shares the deadline; entries it did not reach are not shown.
    const read = t.processed;
    const cut = read < z.entries.length ? 'time' : z.cut;
    const declared = Math.max(z.declared, z.entries.length);
    return {
      format: 'zip',
      name,
      size: st.size,
      mtime: Math.round(st.mtimeMs),
      declared,
      read,
      files: t.files,
      folders: t.folders,
      unpacked: t.unpacked,
      packed: t.packed,
      locked: t.locked,
      links: t.links,
      escapes: t.escapes,
      escaped: t.escaped,
      partial: partialSentence(name, { declared, read, cut, directoryBytes: z.directoryBytes, left: t.left, limits }),
      ms: Math.round(performance.now() - started),
      records: t.records,
    };
  } finally {
    await fd.close();
  }
}
