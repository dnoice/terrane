#!/usr/bin/env node
/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Service Smoke Test (Terrane Edition - v1.6)
 *     - File Name: smoke-test.mjs
 *     - Relative Path: tools/smoke-test.mjs
 *     - Artifact Type: test
 *     - Version: 1.6.0
 *     - Date: 11/13/2026
 *     - Update: Friday, November 13, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Changelog:
 *     - 1.6.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] — The
 *       search-token section checks double quotes: a quoted term keeps
 *       its space, a quoted prefix value reaches its maker whole (in:"My
 *       Folder"), a token that begins with a quote is a literal name, an
 *       open quote runs to the end and empty quotes add nothing. A
 *       previews section asks GET /api/raw for byte ranges: bytes=10-19
 *       exactly, bytes=0- on the 24 MB file cut at 8 MiB, an end past the
 *       file, a suffix, 416 past the end with the size, several ranges, a
 *       reversed one or another unit served whole as before, every answer
 *       guarded (nosniff, sandbox, no-store, Accept-Ranges), the media
 *       types, and the token, the holding area, a climbing path and a
 *       link that leads outside refused; snapshot mode refuses a range.
 *       The search tokens: ext: and kind: take comma lists, any of them;
 *       a word that names no kind adds nothing, and a list combines with
 *       other tokens. A batch rename section on the first service:
 *       renames moves three files across two folders, answers its pairs,
 *       adds exactly one journal entry, and one Undo restores every name
 *       by content hash; an existing sibling, two new names alike (and
 *       alike but for case where case does not matter), a chain, a swap,
 *       an item inside another, an invalid name, the holding area's name
 *       in any case, a path twice, more than 5,000 items, no list,
 *       traversal, the holding area and a missing path are each refused
 *       with nothing changed and nothing journaled; a case-only rename
 *       works and is undone; an unchanged batch is answered and not
 *       journaled. In-process, a batch rename whose second file is in
 *       use throws with results and affected, is journaled as a partial
 *       rename, and its Undo carries the finished name back. The
 *       read-only and snapshot services refuse it. A terminal section
 *       boots on 5045 with TERRANE_LAUNCH_LOG and on 5046 read-only: 401
 *       without the token, 415 for another content type; the root and a
 *       folder named "term dir & ; %" each log one launch whose working
 *       directory is the real path and whose arguments never hold it; a
 *       file is ENOTDIR, traversal 400, the holding area 403, a junction
 *       outside EOUTSIDE, none logged; Open is logged and starts nothing;
 *       read-only is EREADONLY with its sentence and nothing logged; the
 *       snapshot service answers ESNAPSHOT. terminalPlan for Windows,
 *       macOS and Linux; in-process, a stand-in spawn proves the next
 *       terminal is tried after ENOENT, the 501 when none is there, and a
 *       stop on any other error. A source check: no exec( (a RegExp's
 *       .exec( aside), no shell: true and nothing but spawn imported from
 *       child_process in ops.mjs or terrane.mjs. Every service it boots is
 *       given TERRANE_DATA, a temporary folder of its own removed at the
 *       end, so the warm start's cache of its surveys never reaches the
 *       real dataset home. In-process, an Undo that stops part way: one
 *       whose first item cannot go back says nothing was changed; one
 *       that stops after the first says how many went back and how many
 *       are left, answers moved and affected, and the journal on disk
 *       keeps only the pairs still out; after a restart the next Undo
 *       resumes, and the entry before it is undone after that. On
 *       Windows, through the service, a folder held open as a child
 *       process's working directory stops an Undo with 500 EBUSY and
 *       that sentence whole, and once let go the next Undo finishes.
 *       A source check: every entry a tracked web/ header held at the
 *       last commit, or where the branch left main (git show, when git
 *       is there), and holds no longer opens its CHANGELOG.md entry word
 *       for word, whitespace aside.
 *     - 1.5.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] — The
 *       hardening checks. Through the service: the holding area refused
 *       under every other spelling (case, a trailing dot, NTFS stream
 *       names), its 8.3 short name, a junction that leads into it, as a
 *       rename and as a parent; its name reserved in any case; hashing
 *       and Open refusing a link that leads outside; the thumbnail cookie
 *       named for the port, holding no session token and opening
 *       thumbnails only. In-process: planted holding records (an id that
 *       climbs out, a name with separators) neither listed, restored nor
 *       undone, with the folder outside untouched; a holding area that is
 *       a link left unused; relative links refused where a copy or move
 *       would aim them outside the root, and copied where they still
 *       point inside; and the scan writer settling when the page goes
 *       away while it waits for drain. A source section: one MM/DD/YYYY
 *       formatter, no unused export in icons.js or model.js, every
 *       sprite icon drawn, no raw colour in a component stylesheet and
 *       no !important among the utilities.
 *     - 1.4.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] — A
 *       static-files section: interface files carry a weak ETag with
 *       no-cache and answer 304 to it, the page is no-store with no ETag,
 *       and malformed or escaping static paths are 404. guard.contains()
 *       is checked against a drive or filesystem root.
 *     - 1.3.0 (11/12/2026) [dendogg + Anthropic - Claude Opus 5.5] — A
 *       time-view section lays out the age-table tree from four eyes at
 *       every ladder step: the present's box count, key order and
 *       footprints; changed files and empty folders as crossed slabs no
 *       taller than their slab; closed masses lowered by what they kept;
 *       no box rising as the date goes back; the time module's crossed
 *       rule agreeing with the layout; and no asOf giving the present
 *       layout exactly. An archive section (11/13/2026) lists a fresh
 *       fixture's archives through GET /api/inside on a read-only
 *       service: the stored zip's exact names and sizes (and the loose
 *       copy and the copy 13 levels down agreeing), ZIP64, the locked
 *       flag and the escape count, 415 naming 7z and the format a
 *       misnamed .tar.gz suggests, the damaged sentence for the truncated
 *       zip, ENOTFILE, 401, 400 for '..', 403 through links that leave
 *       the root, the 100,000-entry bound in a sentence, and the tree
 *       identical afterwards; snapshot mode answers ESNAPSHOT. A reader
 *       section builds zips by hand for names, dates, flags, escapes, the
 *       depth, folder, byte and time bounds, damage, split and encrypted
 *       directories, and sniffing, and checks the reader never writes;
 *       later (11/13/2026) also a stub or launcher before a zip whose
 *       first bytes are no zip, a short digital signature record, and
 *       names repeated in a folder numbered, counted and stated. A section
 *       runs the operations in-process: Undo answers with the paths it
 *       moved back, after a restart too, and a move or removal that stops
 *       part way throws with the paths it finished.
 *     - 1.2.0 (11/11/2026) [dendogg + Anthropic - Claude Opus 5.5] — A
 *       layout section runs the browser's layout module in Node: a tree
 *       shaped to overflow the old folder-entry check stays within the
 *       box budget, an unfittable tree stops at exactly the budget, the
 *       aux bytes, index aliases and code tables, and the viewport's
 *       capacity above the budget. A relation-line section builds the
 *       viewport's line vertices in Node: duplicate ties identical to the
 *       old arcs, dash distances and chevrons, a leg 13 levels down kept
 *       in shape around a nearby origin, room shared between sets, bad
 *       legs skipped, and the three.js expression the dash replaces. A
 *       search-token section checks the is: words and name:value tokens
 *       a caller adds, that built-in ones cannot be replaced, and that
 *       is:constructor and is:__proto__ match nothing. An age-table
 *       section checks the shared table against a brute-force walk of a
 *       2,400-folder tree at every step, its six strata, median and last
 *       steps, the edges of a step, files of no size, a folder newer than
 *       the table, and that no field is written onto a node.
 *     - 1.1.0 (11/11/2026) [dendogg + Anthropic - Claude Opus 5.5] — The
 *       undo chain now runs in a second service process, proving the
 *       journal survives a restart. Adds progress and cancellation checks
 *       (mid-file, while queued, after finishing), a full streamed copy
 *       verified by hash and modification time, a tampered journal that
 *       tries to leave the root, and an unreadable journal set aside.
 *       Snapshot mode is checked against a live scan record for record.
 *     - 1.0.0 (11/09/2026) [dendogg + Anthropic - Claude Fable 5.2] —
 *       Initial release.
 *
 * ✒ Description:
 *     Starts the real Terrane service against a throwaway directory it
 *     creates in the system temp folder, performs every operation through
 *     the HTTP API, and checks the result on disk with the filesystem
 *     itself. It proves the operations are real, that refusals refuse, that
 *     long operations can be watched and cancelled, and that undo, run by a
 *     restarted service, returns the directory to its exact starting state.
 *
 * ✒ Key Features:
 *     - Boundary checks: missing token, foreign Host header, traversal,
 *       holding-area access, and a write through an escaping symbolic link
 *     - The holding area by any name (case, stream names, 8.3, a
 *       junction), links that lead outside refused for hashing and Open,
 *       and a thumbnail cookie that is not the token
 *     - Planted holding-area records and a holding area that is a link,
 *       in-process; relative links refused where a move or copy would aim
 *       them outside the root; the scan writer when the page goes away
 *     - Every mutation verified on disk: mkdir, rename, a batch rename,
 *       move, copy, duplicate, remove to holding, restore
 *     - Collision checks: nothing is overwritten and nothing moves when a
 *       batch is refused; "keep both" picks a free name
 *     - Persistence: the service is stopped and started again, and the
 *       second process sees the first one's journal as an earlier session
 *     - Progress events on the change stream: counting, totals, rising
 *       byte counts, and a closing event with the outcome
 *     - Cancellation mid-file leaves the finished items, removes the
 *       partial one, and is undoable; a queued job cancels before it starts
 *     - Full undo chain across the restart compared against a snapshot of
 *       names, sizes and content hashes taken before the first change
 *     - A journal edited to point outside the root is refused on undo
 *     - Snapshot mode: written outside the tree it records, replays a live
 *       scan exactly, refuses every change and every content read
 *     - Read-only mode refuses mutations
 *     - A terminal in a folder, with every launch written to a log
 *       instead of started: the folder only as the working directory,
 *       every refusal before a launch, the plan for three platforms, and
 *       its order through a stand-in spawn
 *     - Archive interiors: the fixture's archives listed through the
 *       service, every refusal by status and sentence, the bounds, and a
 *       tree unchanged by listing; snapshot mode refuses listing
 *     - The archive reader, without the service: hand-built zips for
 *       names, dates, flags, escaping names, bounds and damage
 *     - Undo answers and partial changes, in-process: the paths moved
 *       back, and the paths finished before a simulated failure, a batch
 *       rename's included; an Undo that stops part way resumes, after a
 *       restart too, and on Windows a folder held open stops one
 *     - The batch rename: one journal entry undone whole, and every
 *       refusal (taken names, chains and swaps, nesting, invalid and
 *       reserved names, the bound, traversal) before anything changes
 *     - Duplicate hashing distinguishes true copies from same-size files
 *     - Previews: one byte range per answer, at most 8 MiB, 416 past the
 *       end, the whole-file answer for anything else, media types, and
 *       every refusal kept
 *     - Layout safety, without the service: the box budget holds at every
 *       box, so no layout can pass the viewport's capacity
 *     - Relation lines, without the service or a browser: the vertices the
 *       viewport writes for ties, routes and chevrons
 *     - Search tokens, without the service: the grammar answers as before,
 *       takes is: words and name:value tokens from its caller, and keeps
 *       spaces inside double quotes
 *     - The age table, without the service: changed bytes and files per
 *       folder and step equal a brute-force walk, and the strata add up
 *     - The time view, without the service: the layout looked back to
 *       every ladder step keeps the present's boxes and lowers only what
 *       changed after the date
 *     - The source, read as text: one date formatter, no dead export in
 *       the shared modules, no idle icon, colours only from tokens.css,
 *       no shell anywhere the service launches a program, and every
 *       entry a web/ header rolled out kept word for word in CHANGELOG.md
 *
 * ✒ Usage Instructions:
 *     node tools/smoke-test.mjs
 *     Exit code 0 means every check passed. The temp directory is removed
 *     afterwards.
 *
 * ✒ Other Important Information:
 *     - Dependencies: Node.js built-ins only; server/terrane.mjs,
 *       server/snapshot.mjs, server/archive.mjs, tools/make-fixture.mjs,
 *       web/js/layout.js, web/js/model.js, web/js/timeline.js,
 *       web/js/time.js, and web/js/viewport.js with the vendored three.js;
 *       git, when present, for the rolled-out header entries
 *     - Compatible platforms: Node.js 22.5+; the symbolic-link checks are
 *       skipped where links cannot be created, the held-folder Undo
 *       everywhere but Windows, and the rolled-out entries without git
 *     - Performance: about 10 seconds; the second service runs with
 *       TERRANE_SLOW_COPY_MS so a 24 MB copy takes long enough to cancel
 * ----------------------------------------------------------------------------
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SERVER = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'server', 'terrane.mjs');
const BIG = 24 * 1024 * 1024;
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'terrane-smoke-'));
// The dataset home every service here is given (TERRANE_DATA): a warm
// start's cache and any thumbnail lookup land here, never in the real one.
const dataHome = fs.mkdtempSync(path.join(os.tmpdir(), 'terrane-smoke-data-'));
const root = path.join(work, 'root');
const outside = path.join(work, 'outside');
fs.mkdirSync(path.join(root, 'docs', 'drafts'), { recursive: true });
fs.mkdirSync(path.join(root, 'media'));
fs.mkdirSync(path.join(root, 'big'));
fs.mkdirSync(outside);
fs.writeFileSync(path.join(root, 'docs', 'a.txt'), 'alpha');
fs.writeFileSync(path.join(root, 'docs', 'b.txt'), 'bravo');
fs.writeFileSync(path.join(root, 'docs', 'drafts', 'c.txt'), 'charlie');
fs.writeFileSync(path.join(root, 'media', 'a.txt'), 'media-alpha');
fs.writeFileSync(path.join(root, 'media', 'x.bin'), Buffer.alloc(9000, 'q'));
fs.writeFileSync(path.join(root, 'media', 'y.bin'), Buffer.alloc(9000, 'q'));
fs.writeFileSync(path.join(root, 'media', 'z.bin'), Buffer.alloc(9000, 'r'));
fs.writeFileSync(path.join(root, 'big', 'movie.bin'), crypto.randomBytes(BIG));
fs.writeFileSync(path.join(root, 'big', 'notes.txt'), 'notes');
const OLD = new Date('2021-03-04T05:06:07Z');
fs.utimesSync(path.join(root, 'big', 'movie.bin'), OLD, OLD);
fs.writeFileSync(path.join(outside, 'keep.txt'), 'outside');
let linked = false;
try {
  fs.symlinkSync(outside, path.join(root, 'escape'), 'dir');
  linked = true;
} catch { /* no link privilege */ }

let passed = 0;
let failed = 0;
const check = (name, cond, detail = '') => {
  if (cond) passed++;
  else failed++;
  console.log(`${cond ? '  ok  ' : ' FAIL '} ${name}${cond || !detail ? '' : ' — ' + detail}`);
};
const has = (...p) => fs.existsSync(path.join(root, ...p));
const read = (...p) => fs.readFileSync(path.join(root, ...p), 'utf8');
const sha = (...p) => crypto.createHash('sha1').update(fs.readFileSync(path.join(root, ...p))).digest('hex');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function snapshot(dir = root, rel = '') {
  const out = [];
  for (const d of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (d.name === '.terrane-trash') continue;
    const r = rel ? `${rel}/${d.name}` : d.name;
    if (d.isDirectory()) out.push(`${r}/`, ...snapshot(path.join(dir, d.name), r));
    else if (d.isSymbolicLink()) out.push(`${r}@`);
    else out.push(`${r}:${crypto.createHash('sha1').update(fs.readFileSync(path.join(dir, d.name))).digest('hex')}`);
  }
  return out;
}

/**
 * Names, sizes, modification times and, up to 4 MB, content hashes of
 * everything under dir, folders included; links are recorded, not
 * followed. Large sparse files are compared by size and time only.
 */
function treeState(dir, rel = '') {
  let list;
  try {
    list = fs.readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    return [`${rel}/!${err.code}`];
  }
  const out = [];
  for (const d of list.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))) {
    if (!rel && d.name === '.terrane-trash') continue;
    const abs = path.join(dir, d.name);
    const r = rel ? `${rel}/${d.name}` : d.name;
    const st = fs.lstatSync(abs);
    if (st.isSymbolicLink()) out.push(`${r}@${fs.readlinkSync(abs)}`);
    else if (st.isDirectory()) out.push(`${r}/${st.mtimeMs}`, ...treeState(abs, r));
    else out.push(`${r}:${st.size}:${st.mtimeMs}:${st.size <= 4 * 1024 * 1024 ? crypto.createHash('sha1').update(fs.readFileSync(abs)).digest('hex') : '-'}`);
  }
  return out;
}

/**
 * A zip for the archive reader's checks: stored entries, with any
 * central-directory field set by hand. Entry: { name (string or bytes),
 * data, flags, made, attrs, date, time, size, packed, extra }. cdTail is
 * appended inside the directory (a digital signature record).
 */
function zipOf(list, { comment = Buffer.alloc(0), prefix = Buffer.alloc(0), declared = list.length, disk = 0, cdTail = Buffer.alloc(0) } = {}) {
  const locals = [];
  const central = [];
  let offset = 0;
  for (const e of list) {
    const name = Buffer.isBuffer(e.name) ? e.name : Buffer.from(e.name, 'utf8');
    const data = e.data || Buffer.alloc(0);
    const extra = e.extra || Buffer.alloc(0);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(e.flags || 0, 6);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    locals.push(local, name, data);
    const head = Buffer.alloc(46);
    head.writeUInt32LE(0x02014b50, 0);
    head.writeUInt16LE(e.made ?? 20, 4);
    head.writeUInt16LE(20, 6);
    head.writeUInt16LE(e.flags || 0, 8);
    head.writeUInt16LE(e.time ?? 0, 12);
    head.writeUInt16LE(e.date ?? 0, 14);
    head.writeUInt32LE(e.packed ?? data.length, 20);
    head.writeUInt32LE(e.size ?? data.length, 24);
    head.writeUInt16LE(name.length, 28);
    head.writeUInt16LE(extra.length, 30);
    head.writeUInt32LE((e.attrs ?? 0) >>> 0, 38);
    head.writeUInt32LE(offset, 42);
    central.push(head, name, extra);
    offset += 30 + name.length + data.length;
  }
  const cd = Buffer.concat([...central, cdTail]);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(disk, 4);
  end.writeUInt16LE(disk, 6);
  end.writeUInt16LE(declared & 0xffff, 8);
  end.writeUInt16LE(declared & 0xffff, 10);
  end.writeUInt32LE(cd.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(comment.length, 20);
  return Buffer.concat([prefix, ...locals, cd, end, comment]);
}

/** A ZIP64 archive whose directory lists n one-byte files under many/, all sharing one local entry. */
function manyZip(n) {
  const name = (i) => `many/f${String(i).padStart(6, '0')}.txt`;
  const local = Buffer.alloc(47);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(45, 4);
  local.writeUInt32LE(1, 18);
  local.writeUInt32LE(1, 22);
  local.writeUInt16LE(16, 26);
  local.write(name(0), 30, 'latin1');
  local.write('x', 46, 'latin1');
  const cd = Buffer.alloc(n * 62);
  for (let i = 0; i < n; i++) {
    const p = i * 62;
    cd.writeUInt32LE(0x02014b50, p);
    cd.writeUInt16LE(45, p + 4);
    cd.writeUInt16LE(45, p + 6);
    cd.writeUInt32LE(1, p + 20);
    cd.writeUInt32LE(1, p + 24);
    cd.writeUInt16LE(16, p + 28);
    cd.write(name(i), p + 46, 'latin1');
  }
  const rec = Buffer.alloc(56);
  rec.writeUInt32LE(0x06064b50, 0);
  rec.writeBigUInt64LE(44n, 4);
  rec.writeUInt16LE(45, 12);
  rec.writeUInt16LE(45, 14);
  rec.writeBigUInt64LE(BigInt(n), 24);
  rec.writeBigUInt64LE(BigInt(n), 32);
  rec.writeBigUInt64LE(BigInt(cd.length), 40);
  rec.writeBigUInt64LE(BigInt(local.length), 48);
  const loc = Buffer.alloc(20);
  loc.writeUInt32LE(0x07064b50, 0);
  loc.writeBigUInt64LE(BigInt(local.length + cd.length), 8);
  loc.writeUInt32LE(1, 16);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0xffff, 8);
  end.writeUInt16LE(0xffff, 10);
  end.writeUInt32LE(0xffffffff, 12);
  end.writeUInt32LE(0xffffffff, 16);
  return Buffer.concat([local, cd, rec, loc, end]);
}

/** Folder and file paths with sizes from scanner records: 'a/' and 'a/b.txt:5'. */
function recordPaths(records) {
  const where = new Map();
  const out = [];
  for (const [id, pid, name, , , files] of records) {
    const at = pid === -1 ? '' : where.get(pid) ? `${where.get(pid)}/${name}` : name;
    where.set(id, at);
    if (pid !== -1) out.push(`${at}/`);
    for (let i = 0; i < files.length; i += 4) out.push(`${at ? `${at}/` : ''}${files[i]}:${files[i + 1]}`);
  }
  return out.sort();
}

async function boot(extra, port, env = {}, { withRoot = true } = {}) {
  const child = spawn(process.execPath, [SERVER, ...(withRoot ? [root] : []), '--no-open', '--no-watch', '--port', String(port), ...extra], {
    stdio: ['ignore', 'pipe', 'inherit'], env: { ...process.env, TERRANE_DATA: dataHome, ...env },
  });
  const actual = await new Promise((resolve, reject) => {
    let buf = '';
    child.stdout.on('data', (c) => {
      buf += c;
      const m = buf.match(/127\.0\.0\.1:(\d+)/);
      if (m) resolve(Number(m[1]));
    });
    child.on('exit', () => reject(new Error('service exited')));
  });
  const request = (method, route, { body, token, host, headers = {} } = {}) => new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({ host: '127.0.0.1', port: actual, path: route, method, headers: {
      ...headers, ...(host ? { Host: host } : {}), ...(token ? { 'X-Terrane-Token': token } : {}),
      ...(data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {}),
    } }, (res) => {
      let text = '';
      res.on('data', (c) => { text += c; });
      res.on('end', () => {
        let parsed = text;
        try {
          parsed = JSON.parse(text);
        } catch { /* ndjson or html */ }
        resolve({ status: res.statusCode, body: parsed, text, headers: res.headers });
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
  const page = await request('GET', '/');
  const token = page.text.match(/terrane-token" content="([^"]+)"/)[1];
  /** Subscribes to the event stream; returns the collected messages and a closer. */
  const events = () => new Promise((resolve) => {
    const seen = [];
    const req = http.get({ host: '127.0.0.1', port: actual, path: `/api/events?t=${token}` }, (res) => {
      res.on('error', () => {});
      let buf = '';
      res.on('data', (c) => {
        buf += c;
        let i;
        while ((i = buf.indexOf('\n\n')) >= 0) {
          const block = buf.slice(0, i);
          buf = buf.slice(i + 2);
          if (block.startsWith('data: ')) seen.push(JSON.parse(block.slice(6)));
        }
      });
      resolve({ seen, close: () => req.destroy() });
    });
    req.on('error', () => {});
  });
  const stop = () => new Promise((resolve) => {
    child.once('exit', resolve);
    child.kill();
  });
  return {
    child, token, request, events, stop, port: actual,
    get: (route) => request('GET', route, { token }),
    op: (body) => request('POST', '/api/op', { token, body }),
    post: (route, body = {}) => request('POST', route, { token, body }),
  };
}

/** Polls until pred() is true or the time runs out. */
async function until(pred, ms = 8000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (pred()) return true;
    await wait(15);
  }
  return false;
}

const before = snapshot();
const s = await boot([], 4390);

console.log('\nBoundary');
check('API refuses a request without the token', (await s.request('GET', '/api/info')).status === 401);
check('API refuses a foreign Host header', (await s.request('GET', '/api/info', { token: s.token, host: 'evil.example:80' })).status === 403);
check('traversal segments are refused', (await s.get('/api/scan?path=' + encodeURIComponent('../outside'))).status === 400);
check('the holding area cannot be addressed', (await s.get('/api/scan?path=.terrane-trash')).status === 403);
if (linked) {
  const r = await s.op({ type: 'mkdir', parent: 'escape', name: 'planted' });
  check('write through an escaping symbolic link is refused', r.status === 403 && !fs.existsSync(path.join(outside, 'planted')), JSON.stringify(r.body));
  check('scan through an escaping symbolic link is refused', (await s.get('/api/scan?path=escape')).status === 403);
}
check('invalid names are refused', (await s.op({ type: 'mkdir', parent: '', name: 'a/b' })).status === 400 && (await s.op({ type: 'mkdir', parent: '', name: '..' })).status === 400);
check('the root itself cannot be renamed or removed', (await s.op({ type: 'rename', path: '', name: 'x' })).status === 403 && (await s.op({ type: 'trash', paths: [''] })).status === 403);

console.log('\nStatic files');
{
  const page = await s.request('GET', '/');
  check('the page is never stored and carries no ETag',
    page.headers['cache-control'] === 'no-store' && !page.headers.etag, JSON.stringify(page.headers));
  const css = await s.request('GET', '/css/terrane.css');
  const tag = css.headers.etag;
  check('an interface file is revalidated: no-cache with a weak ETag',
    css.status === 200 && css.headers['cache-control'] === 'no-cache' && /^W\/"[0-9a-z]+-[0-9a-z]+"$/.test(tag || ''), JSON.stringify(css.headers));
  const again = await s.request('GET', '/css/terrane.css', { headers: { 'If-None-Match': tag } });
  check('asking with that ETag answers 304 with no body', again.status === 304 && again.text === '' && again.headers.etag === tag, `${again.status}`);
  const other = await s.request('GET', '/css/terrane.css', { headers: { 'If-None-Match': 'W/"0-0"' } });
  check('a different ETag gets the file again', other.status === 200 && other.text === css.text);
  const page304 = await s.request('GET', '/', { headers: { 'If-None-Match': tag } });
  check('the page is sent whole whatever ETag is offered', page304.status === 200 && /terrane-token/.test(page304.text));
  check('a malformed static path is 404, not an error', (await s.request('GET', '/%E0%A4%A')).status === 404);
  check('a null byte in a static path is 404', (await s.request('GET', '/index.html%00.js')).status === 404);
  check('an escaping static path is 404', (await s.request('GET', '/..%2f..%2fpackage.json')).status === 404);
  check('a static folder is 404', (await s.request('GET', '/css')).status === 404);
}
{
  const { makeGuard } = await import('../server/guard.mjs');
  const top = path.parse(root).root;
  const g = await makeGuard(top);
  check(`guard.contains() works when the root is a drive or filesystem root (${top})`,
    g.root === top && g.contains(g.root) && g.contains(path.join(top, 'a', 'b.txt')) && g.contains(root), g.root);
}

console.log('\nScan');
const scan = await s.get('/api/scan?path=');
const records = scan.text.trim().split('\n').flatMap((l) => JSON.parse(l));
check('scan streams one record per folder', records.length === 5 && records[0][1] === -1, `${records.length} records`);
check('symbolic link is reported as a link, not followed', !linked || records[0][5].includes('escape'));
const shallow = (await s.get('/api/scan?path=docs&depth=1')).text.trim().split('\n').flatMap((l) => JSON.parse(l));
check('depth=1 stubs child folders', shallow.length === 2 && shallow[1][4] === 'STUB');

console.log('\nOperations');
let r = await s.op({ type: 'mkdir', parent: 'docs', name: 'New folder' });
check('mkdir creates the folder on disk', r.status === 200 && has('docs', 'New folder'));
check('mkdir refuses an existing name', (await s.op({ type: 'mkdir', parent: 'docs', name: 'New folder' })).status === 409);
r = await s.op({ type: 'rename', path: 'docs/a.txt', name: 'alpha.txt' });
check('rename changes the name on disk', r.status === 200 && has('docs', 'alpha.txt') && !has('docs', 'a.txt') && read('docs', 'alpha.txt') === 'alpha');
r = await s.op({ type: 'rename', path: 'docs/alpha.txt', name: 'b.txt' });
check('rename onto an existing file is refused and both survive', r.status === 409 && read('docs', 'alpha.txt') === 'alpha' && read('docs', 'b.txt') === 'bravo');
r = await s.op({ type: 'rename', path: 'docs/alpha.txt', name: 'a.txt' });
r = await s.op({ type: 'move', paths: ['docs/b.txt', 'docs/a.txt'], dest: 'media' });
check('a batch with a collision is refused whole', r.status === 409 && has('docs', 'b.txt') && has('docs', 'a.txt') && read('media', 'a.txt') === 'media-alpha', JSON.stringify(r.body));
r = await s.op({ type: 'move', paths: ['docs/b.txt', 'docs/a.txt'], dest: 'media', onConflict: 'keepBoth' });
check('keep both moves under a free name without overwriting', r.status === 200 && has('media', 'b.txt') && read('media', 'a copy.txt') === 'alpha' && read('media', 'a.txt') === 'media-alpha' && !has('docs', 'a.txt'));
r = await s.op({ type: 'move', paths: ['docs'], dest: 'docs/drafts' });
check('a folder cannot be moved into itself', r.status === 400 && has('docs', 'drafts', 'c.txt'));
r = await s.op({ type: 'copy', paths: ['docs/drafts'], dest: 'media' });
check('copy duplicates a folder with its contents', r.status === 200 && read('media', 'drafts', 'c.txt') === 'charlie' && has('docs', 'drafts', 'c.txt'));
r = await s.op({ type: 'copy', paths: ['media/x.bin'], dest: 'media' });
check('duplicate in place picks a "copy" name', r.status === 200 && has('media', 'x copy.bin') && has('media', 'x.bin'));
r = await s.op({ type: 'trash', paths: ['media/drafts', 'media/drafts/c.txt', 'media/z.bin'] });
check('remove takes items off disk into the holding area', r.status === 200 && !has('media', 'drafts') && !has('media', 'z.bin'));
let j = (await s.get('/api/journal')).body;
check('holding area lists what was removed', j.holding.length === 2 && j.holding.some((h) => h.origin === 'media/z.bin'), JSON.stringify(j.holding));
r = await s.post('/api/restore', { ids: [j.holding.find((h) => h.name === 'z.bin').id] });
check('restore puts a held item back', r.status === 200 && has('media', 'z.bin') && fs.readFileSync(path.join(root, 'media', 'z.bin'))[0] === 0x72);

console.log('\nDuplicates');
r = await s.post('/api/hash', { paths: ['media/x.bin', 'media/y.bin', 'media/z.bin'] });
check('hashing separates true copies from same-size files', r.body.results[0].hash === r.body.results[1].hash && r.body.results[0].hash !== r.body.results[2].hash);

console.log('\nBatch rename');
{
  // Files of its own, removed at the end of the section. Every change it
  // makes is undone here, so the undo chain further down finds each one
  // already undone and the tree as it began.
  const rn = path.join(root, 'rn');
  fs.mkdirSync(path.join(rn, 'one'), { recursive: true });
  fs.mkdirSync(path.join(rn, 'two'));
  for (const [rel, text] of [['one/a.txt', 'alpha'], ['one/b.txt', 'bravo'], ['one/keep.txt', 'keep'], ['two/c.txt', 'charlie']]) fs.writeFileSync(path.join(rn, ...rel.split('/')), text);
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const start = snapshot(rn);
  const entries = async () => (await s.get('/api/journal')).body.journal;
  const j0 = (await entries()).length;
  r = await s.op({ type: 'renames', items: [{ path: 'rn/one/a.txt', name: 'A1.txt' }, { path: 'rn/one/b.txt', name: 'B1.txt' }, { path: 'rn/two/c.txt', name: 'C1.txt' }] });
  check('renames moves three files across two folders to their new names, contents intact',
    r.status === 200 && read('rn', 'one', 'A1.txt') === 'alpha' && read('rn', 'one', 'B1.txt') === 'bravo' && read('rn', 'two', 'C1.txt') === 'charlie'
    && same(fs.readdirSync(path.join(rn, 'one')).sort(), ['A1.txt', 'B1.txt', 'keep.txt']) && same(fs.readdirSync(path.join(rn, 'two')), ['C1.txt']), JSON.stringify(r.body));
  check('it answers renamed, the [from, to] pairs in item order, and the two folders as affected',
    same(r.body.renamed, [['rn/one/a.txt', 'rn/one/A1.txt'], ['rn/one/b.txt', 'rn/one/B1.txt'], ['rn/two/c.txt', 'rn/two/C1.txt']]) && same([...r.body.affected].sort(), ['rn/one', 'rn/two']) && r.body.undoable,
    JSON.stringify(r.body));
  const j1 = await entries();
  check('the journal gains exactly one entry for the batch', j1.length === j0 + 1 && j1.at(-1).label === 'Renamed 3 items', JSON.stringify(j1.slice(j0)));
  r = await s.post('/api/undo');
  check('one Undo restores every name, by content hash, and says what it moved back',
    r.status === 200 && same(snapshot(rn), start) && r.body.label === 'Undid: Renamed 3 items' && r.body.moved?.length === 3, JSON.stringify(r.body));

  /** The batch is refused with this status and sentence, and nothing under rn changed. */
  const refused = async (items, status, sentence) => {
    const res = await s.op({ type: 'renames', items });
    const ok = res.status === status && sentence.test(res.body.message || '') && same(snapshot(rn), start);
    return ok || `${res.status} ${JSON.stringify(res.body)}`;
  };
  const verdict = (x) => (x === true ? '' : x);
  let v = await refused([{ path: 'rn/two/c.txt', name: 'c2.txt' }, { path: 'rn/one/a.txt', name: 'keep.txt' }], 409, /^"keep\.txt" already exists in the folder of "a\.txt"\. Nothing was changed\.$/);
  check('a new name an existing sibling has refuses the whole batch, and nothing changes', v === true, verdict(v));
  v = await refused([{ path: 'rn/one/a.txt', name: 'same.txt' }, { path: 'rn/one/b.txt', name: 'same.txt' }], 409, /would both be named "same\.txt"/);
  check('two items given one new name are refused before anything changes', v === true, verdict(v));
  if (process.platform === 'win32' || process.platform === 'darwin') {
    v = await refused([{ path: 'rn/one/a.txt', name: 'Same.txt' }, { path: 'rn/one/b.txt', name: 'same.TXT' }], 409, /would both be named/);
    check('and two new names alike but for case, where case does not matter', v === true, verdict(v));
  }
  v = await refused([{ path: 'rn/one/a.txt', name: 'b.txt' }, { path: 'rn/one/b.txt', name: 'c.txt' }], 409, /is the name of another item in this batch now.*two steps/);
  const swap = await refused([{ path: 'rn/one/a.txt', name: 'b.txt' }, { path: 'rn/one/b.txt', name: 'a.txt' }], 409, /two steps/);
  check('a chain and a swap are refused: Undo could not reverse them', v === true && swap === true, `${verdict(v)} ${verdict(swap)}`);
  v = await refused([{ path: 'rn/one', name: 'uno' }, { path: 'rn/one/a.txt', name: 'x.txt' }], 400, /^"a\.txt" is inside "one", which is renamed in the same batch\. Rename them in two steps\./);
  check('an item inside another item of the batch is refused', v === true, verdict(v));
  v = await refused([{ path: 'rn/one/a.txt', name: 'x/y.txt' }], 400, /slashes/);
  const blank = await refused([{ path: 'rn/one/a.txt', name: '' }], 400, /name is required/);
  check('an invalid name is refused', v === true && blank === true, `${verdict(v)} ${verdict(blank)}`);
  v = await refused([{ path: 'rn/one/a.txt', name: 'fine.txt' }, { path: 'rn/one/b.txt', name: '.terrane-trash' }], 400, /reserved by Terrane/);
  const upper = await refused([{ path: 'rn/one/b.txt', name: '.TERRANE-TRASH' }], 400, /reserved by Terrane/);
  check('the holding area\'s name is refused, in any case, and the good item before it is not renamed', v === true && upper === true, `${verdict(v)} ${verdict(upper)}`);
  v = await refused([{ path: 'rn/one/a.txt', name: 'x.txt' }, { path: 'rn/one/a.txt', name: 'y.txt' }], 400, /listed twice/);
  check('the same path twice is refused', v === true, verdict(v));
  v = await refused(Array.from({ length: 5001 }, (_, i) => ({ path: 'rn/one/a.txt', name: `n${i}.txt` })), 400, /^At most 5,000 items can be renamed at once; 5,001 were sent\.$/);
  const none = await refused([], 400, /Nothing was selected/);
  const notList = await refused('rn/one/a.txt', 400, /Nothing was selected/);
  check('more than 5,000 items, none, or no list are refused', v === true && none === true && notList === true, `${verdict(v)} ${verdict(none)} ${verdict(notList)}`);
  v = await refused([{ path: '../outside/keep.txt', name: 'x.txt' }], 400, /Relative segments/);
  const held = await refused([{ path: '.terrane-trash', name: 'x' }], 403, /holding area/i);
  const gone = await refused([{ path: 'rn/one/nothing.txt', name: 'x.txt' }], 404, /no longer exists/);
  check('traversal, the holding area and a path that is not there are refused, and nothing outside changes',
    v === true && held === true && gone === true && fs.readFileSync(path.join(outside, 'keep.txt'), 'utf8') === 'outside', `${verdict(v)} ${verdict(held)} ${verdict(gone)}`);
  check('none of the refusals reached the journal', (await entries()).length === j0 + 1);
  r = await s.op({ type: 'renames', items: [{ path: 'rn/one/a.txt', name: 'A.txt' }] });
  check('a case-only rename works', r.status === 200 && fs.readdirSync(path.join(rn, 'one')).includes('A.txt') && !fs.readdirSync(path.join(rn, 'one')).includes('a.txt'), JSON.stringify(r.body));
  r = await s.post('/api/undo');
  check('and its Undo gives the old case back', r.status === 200 && same(snapshot(rn), start), JSON.stringify(r.body));
  r = await s.op({ type: 'renames', items: [{ path: 'rn/one/a.txt', name: 'a.txt' }] });
  check('a batch where nothing changes is answered, and not journaled', r.status === 200 && r.body.label === 'Names unchanged' && !r.body.undoable && (await entries()).length === j0 + 2,
    JSON.stringify(r.body));
  // Windows refuses to rename a folder a program holds as its working
  // directory, as a terminal opened there does: an Undo that meets one
  // stops part way, and the next Undo finishes once it is free.
  if (process.platform === 'win32') {
    const held = path.join(rn, 'held');
    for (const n of ['h1', 'h2', 'h3']) fs.mkdirSync(path.join(held, n), { recursive: true });
    const names = () => fs.readdirSync(held).sort();
    r = await s.op({ type: 'renames', items: ['h1', 'h2', 'h3'].map((n, i) => ({ path: `rn/held/${n}`, name: `g${i + 1}` })) });
    const holder = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { cwd: path.join(held, 'g2'), stdio: 'ignore' });
    const exited = new Promise((res) => holder.once('exit', res));
    await wait(300);
    r = await s.post('/api/undo');
    check('an Undo that meets a folder held open stops part way: 500 EBUSY, a sentence of how many went back, moved and affected',
      r.status === 500 && r.body.code === 'EBUSY'
      && r.body.message === 'Undo stopped at "g2" after putting back 1 of 3 items: it is in use by another program. Undo again to put back the other 2.'
      && same(r.body.moved, [['rn/held/g3', 'rn/held/h3']]) && r.body.affected.includes('rn/held') && same(names(), ['g1', 'g2', 'h3']),
      JSON.stringify({ body: r.body, names: names() }));
    holder.kill();
    await exited;
    r = await s.post('/api/undo');
    check('let go, the next Undo puts the other two back and says so; the entries before it stay in reach',
      r.status === 200 && r.body.label === 'Undid: Renamed 3 items' && same(r.body.moved, [['rn/held/g2', 'rn/held/h2'], ['rn/held/g1', 'rn/held/h1']]) && same(names(), ['h1', 'h2', 'h3'])
      && (await entries()).at(-1).undone, JSON.stringify({ body: r.body, names: names() }));
  } else console.log('  skip  an Undo that meets a folder held open (Windows only: elsewhere a working directory can be renamed)');
  fs.rmSync(rn, { recursive: true, force: true });
}

console.log('\nPreviews and byte ranges');
{
  // Files of known content, removed again at the end of the section.
  const ALPHA = '0123456789abcdefghijklmnopqrstuvwxyz';
  const made = [['range.txt', ALPHA], ['clip.mp4', Buffer.alloc(64, 1)], ['song.mp3', Buffer.alloc(64, 2)], ['empty.txt', '']];
  for (const [n, body] of made) fs.writeFileSync(path.join(root, 'media', n), body);
  /** GET /api/raw with the body as bytes; token null sends none. */
  const raw = (rel, headers = {}, token = s.token, max = null) => new Promise((resolve, reject) => {
    const q = new URLSearchParams({ path: rel, ...(max !== null ? { max: String(max) } : {}) });
    const req = http.get({ host: '127.0.0.1', port: s.port, path: `/api/raw?${q}`, headers: { ...headers, ...(token ? { 'X-Terrane-Token': token } : {}) } }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
    });
    req.on('error', reject);
  });
  const SANDBOX = "sandbox; default-src 'none'; style-src 'unsafe-inline'";
  const guarded = (h) => h['x-content-type-options'] === 'nosniff' && h['content-security-policy'] === SANDBOX && h['cache-control'] === 'no-store' && h['accept-ranges'] === 'bytes';

  const mid = await raw('media/range.txt', { Range: 'bytes=10-19' });
  check('bytes=10-19 answers 206 with exactly those ten bytes, Content-Range and Content-Length',
    mid.status === 206 && mid.body.toString() === 'abcdefghij' && mid.headers['content-range'] === 'bytes 10-19/36' && mid.headers['content-length'] === '10',
    `${mid.status} ${mid.headers['content-range']} ${mid.body}`);
  check('a 206 keeps nosniff, the CSP sandbox and no-store, says Accept-Ranges, and carries no X-Terrane-Truncated',
    guarded(mid.headers) && !('x-terrane-truncated' in mid.headers), JSON.stringify(mid.headers));
  const movie = path.join(root, 'big', 'movie.bin');
  const head8 = fs.readFileSync(movie).subarray(0, 8 * 1024 * 1024);
  const open = await raw('big/movie.bin', { Range: 'bytes=0-' });
  check(`bytes=0- on a ${(BIG / 1024 / 1024).toFixed(0)} MB file is capped at 8 MiB, the first 8 MiB exactly, and says the whole size`,
    open.status === 206 && open.body.length === 8 * 1024 * 1024 && open.body.equals(head8) && open.headers['content-range'] === `bytes 0-8388607/${BIG}` && open.headers['content-length'] === '8388608',
    `${open.status} ${open.headers['content-range']} ${open.body.length}`);
  const later = await raw('big/movie.bin', { Range: `bytes=${BIG - 1000}-${BIG + 5000}` });
  check('an end past the file is cut at its last byte',
    later.status === 206 && later.body.length === 1000 && later.headers['content-range'] === `bytes ${BIG - 1000}-${BIG - 1}/${BIG}` && later.body.equals(fs.readFileSync(movie).subarray(BIG - 1000)),
    `${later.status} ${later.headers['content-range']}`);
  const tail = await raw('media/range.txt', { Range: 'bytes=-5' });
  check('the suffix bytes=-5 gives the last five bytes', tail.status === 206 && tail.body.toString() === 'vwxyz' && tail.headers['content-range'] === 'bytes 31-35/36', `${tail.status} ${tail.headers['content-range']} ${tail.body}`);
  const longTail = await raw('media/range.txt', { Range: 'bytes=-500' });
  check('a suffix longer than the file gives the whole file', longTail.status === 206 && longTail.body.toString() === ALPHA && longTail.headers['content-range'] === 'bytes 0-35/36');
  const past = await raw('media/range.txt', { Range: 'bytes=36-' });
  const far = await raw('media/range.txt', { Range: 'bytes=100-200' });
  const none = await raw('media/range.txt', { Range: 'bytes=-0' });
  const empty = await raw('media/empty.txt', { Range: 'bytes=0-' });
  check('a range that starts at or past the end, a suffix of 0, or any range of an empty file answers 416 with bytes */size and no body',
    [past, far, none].every((r) => r.status === 416 && r.headers['content-range'] === 'bytes */36' && r.body.length === 0) && empty.status === 416 && empty.headers['content-range'] === 'bytes */0'
    && guarded(past.headers), [past, far, none, empty].map((r) => `${r.status} ${r.headers['content-range']}`).join(', '));
  const multi = await raw('media/range.txt', { Range: 'bytes=0-1,4-5' });
  const reversed = await raw('media/range.txt', { Range: 'bytes=5-2' });
  const unit = await raw('media/range.txt', { Range: 'items=0-1' });
  const plain = await raw('media/range.txt');
  check('several ranges, a reversed range or another unit are ignored: the whole-file answer, 200, as without a Range',
    [multi, reversed, unit, plain].every((r) => r.status === 200 && r.body.toString() === ALPHA && r.headers['x-terrane-truncated'] === '0' && !r.headers['content-range']),
    [multi, reversed, unit, plain].map((r) => r.status).join(' '));
  check('the 200 says Accept-Ranges too, and keeps nosniff, the sandbox and no-store', guarded(plain.headers), JSON.stringify(plain.headers));
  const capped = await raw('big/movie.bin', {}, s.token, 4096);
  check('without a Range the cap still holds and says it cut', capped.status === 200 && capped.body.length === 4096 && capped.headers['x-terrane-truncated'] === '1');
  const mp4 = await raw('media/clip.mp4', { Range: 'bytes=0-' });
  const mp3 = await raw('media/song.mp3');
  check('.mp4 and .mp3 carry their media types, ranged or not',
    mp4.status === 206 && mp4.headers['content-type'] === 'video/mp4' && mp4.body.length === 64 && mp3.status === 200 && mp3.headers['content-type'] === 'audio/mpeg',
    `${mp4.headers['content-type']} ${mp3.headers['content-type']}`);
  check('a text file stays text/plain', plain.headers['content-type'] === 'text/plain; charset=utf-8');
  // A refusal is the service's JSON error, never bytes of the file.
  const refused = (r, status, code) => r.status === status && !r.headers['content-range'] && JSON.parse(r.body.toString() || '{}').code === code;
  const noToken = await raw('media/range.txt', { Range: 'bytes=0-3' }, null);
  check('a range without the token is refused with 401 and no bytes', refused(noToken, 401, 'ETOKEN'), `${noToken.status} ${noToken.body}`);
  const held = await raw('.terrane-trash/journal.json', { Range: 'bytes=0-10' });
  check('a range in the holding area is refused with 403', held.status === 403 && !held.headers['content-range'], `${held.status} ${held.body}`);
  const climb = await raw('../outside/keep.txt', { Range: 'bytes=0-3' });
  check('a range of a path that climbs out is refused', climb.status === 400 && !climb.headers['content-range'], `${climb.status} ${climb.body}`);
  // A link that leads outside: the root's own link where links can be made,
  // else a junction, which Windows lets anyone make.
  let outLink = linked ? 'escape/keep.txt' : null;
  const junction = path.join(root, 'media', 'out-j');
  if (!outLink) {
    try {
      fs.symlinkSync(outside, junction, 'junction');
      outLink = 'media/out-j/keep.txt';
    } catch { /* no links here at all */ }
  }
  if (outLink) {
    const through = await raw(outLink, { Range: 'bytes=0-3' });
    check(`a range through a link that leads outside is refused with 403 (${outLink})`, refused(through, 403, 'EOUTSIDE'), `${through.status} ${through.body}`);
  } else console.log('  note  no link or junction can be made here; the link check is left out');
  fs.rmSync(junction, { force: true });
  for (const [n] of made) fs.rmSync(path.join(root, 'media', n), { force: true });
}

console.log('\nThe holding area by any name, links and the thumbnail cookie');
{
  const hold = path.join(root, '.terrane-trash');
  const folds = process.platform === 'win32' || process.platform === 'darwin';
  check('the holding area exists after a removal (the case these checks need)', fs.existsSync(path.join(hold, 'journal.json')));
  const refusedAll = [];
  for (const spelling of ['.TERRANE-TRASH', '.Terrane-Trash', ...(process.platform === 'win32' ? ['.terrane-trash.', '.terrane-trash::$INDEX_ALLOCATION', '.terrane-trash:$I30:$INDEX_ALLOCATION'] : [])]) {
    const raw = await s.get(`/api/raw?path=${encodeURIComponent(`${spelling}/journal.json`)}`);
    const sc = await s.get(`/api/scan?path=${encodeURIComponent(spelling)}`);
    refusedAll.push(`${spelling}: raw ${raw.status}, scan ${sc.status}`);
    if (raw.status === 200 || sc.status === 200) refusedAll.push('LEAK');
  }
  check(`no other spelling reaches the holding area (${folds ? 'case folded here' : 'case sensitive here'})`, !refusedAll.includes('LEAK'), refusedAll.join('; '));
  // An 8.3 short name, where the volume makes them: found with dir /x.
  if (process.platform === 'win32') {
    const { spawnSync } = await import('node:child_process');
    const listing = spawnSync('cmd.exe', ['/d', '/c', 'dir', '/x', '/a:d', root], { encoding: 'utf8' }).stdout || '';
    const short = listing.split(/\r?\n/).map((l) => l.match(/\s(\S+~\d+)\s+\.terrane-trash\s*$/i)?.[1]).find(Boolean);
    if (short) {
      const viaShort = await s.get(`/api/raw?path=${encodeURIComponent(`${short}/journal.json`)}`);
      const renameShort = await s.op({ type: 'rename', path: short, name: 'not-held-anymore' });
      check(`its 8.3 short name ${short} is refused for reading and renaming`, viaShort.status === 403 && renameShort.status === 403 && fs.existsSync(hold) && !has('not-held-anymore'),
        `${viaShort.status} ${renameShort.status}`);
    } else console.log('  note  this volume makes no 8.3 short names; that check is left out');
  }
  const renamed = await s.op({ type: 'rename', path: '.TERRANE-TRASH', name: 'not-held-anymore' });
  check('the holding area cannot be renamed away under another spelling', renamed.status >= 400 && fs.existsSync(hold) && !has('not-held-anymore'), JSON.stringify(renamed.body));
  const planted = await s.op({ type: 'mkdir', parent: '.TERRANE-TRASH/items', name: 'planted' });
  check('nothing can be created in it under another spelling', planted.status >= 400 && !fs.existsSync(path.join(hold, 'items', 'planted')), JSON.stringify(planted.body));
  const named = await s.op({ type: 'mkdir', parent: '', name: '.Terrane-Trash' });
  check('its name is reserved in any case', named.status === 400 && named.body.code === 'ENAME', JSON.stringify(named.body));
  if (linked) {
    // A link (a junction on Windows) inside the root that leads into it.
    const hj = path.join(root, 'media', 'hj');
    fs.symlinkSync(hold, hj, 'junction');
    const viaLink = await s.get('/api/raw?path=media/hj/journal.json');
    const scanLink = await s.get('/api/scan?path=media/hj');
    const intoLink = await s.op({ type: 'move', paths: ['media/x copy.bin'], dest: 'media/hj' });
    check('a link that leads into the holding area is refused for reading, scanning and as a destination',
      viaLink.status === 403 && scanLink.status === 403 && intoLink.status === 403 && has('media', 'x copy.bin'), `${viaLink.status} ${scanLink.status} ${intoLink.status}`);
    fs.rmSync(hj, { force: true });
    fs.writeFileSync(path.join(outside, 'secret.txt'), 'OUTSIDE SECRET');
    fs.symlinkSync(path.join(outside, 'secret.txt'), path.join(root, 'media', 'ln.txt'), 'file');
    const hashed = await s.post('/api/hash', { paths: ['media/ln.txt', 'media/x.bin'] });
    const outsideSha = crypto.createHash('sha1').update('OUTSIDE SECRET').digest('hex');
    check('hashing refuses a link that leads outside, as a preview does, and still hashes the rest',
      hashed.body.results[0].error === 'EOUTSIDE' && !JSON.stringify(hashed.body).includes(outsideSha) && hashed.body.results[1].hash === sha('media', 'x.bin'), JSON.stringify(hashed.body));
    const opened = await s.op({ type: 'open', path: 'media/ln.txt' });
    check('open refuses a link that leads outside before anything is launched', opened.status === 403 && opened.body.code === 'EOUTSIDE', JSON.stringify(opened.body));
    fs.unlinkSync(path.join(root, 'media', 'ln.txt'));
  }
  const page = await s.request('GET', '/');
  const set = String(page.headers['set-cookie'] || '');
  const m = set.match(/^terrane-(\d+)=([^;]+);/);
  check('the thumbnail cookie is named for the port and does not hold the session token',
    !!m && m[1] === String(s.port) && m[2] !== s.token && !set.includes(s.token), set);
  const jar = m ? `terrane-${m[1]}=${m[2]}` : '';
  const asToken = await s.request('POST', '/api/op', { token: m?.[2], body: { type: 'mkdir', parent: '', name: 'by-cookie' } });
  const cookieOnly = await s.request('GET', '/api/info', { headers: { Cookie: jar } });
  const thumbsByCookie = await s.request('GET', '/api/thumbs', { headers: { Cookie: jar } });
  const otherPort = await s.request('GET', '/api/thumbs', { headers: { Cookie: `terrane-1=${m?.[2]}` } });
  check('the cookie opens the thumbnail index and nothing else: not as the token, not alone, not under another port\'s name',
    asToken.status === 401 && !has('by-cookie') && cookieOnly.status === 401 && thumbsByCookie.status === 200 && otherPort.status === 401,
    `${asToken.status} ${cookieOnly.status} ${thumbsByCookie.status} ${otherPort.status}`);
}

const firstJournal = (await s.get('/api/journal')).body.journal;
await s.stop();

console.log('\nPersistence');
check('the journal is written to the holding area', fs.existsSync(path.join(root, '.terrane-trash', 'journal.json')));
const s2 = await boot([], 4400, { TERRANE_SLOW_COPY_MS: '40' });
j = (await s2.get('/api/journal')).body;
check(`a restarted service reads the journal back (${firstJournal.length} entries)`,
  j.journal.length === firstJournal.length && j.journal.every((e, i) => e.label === firstJournal[i].label), JSON.stringify(j.journal.map((e) => e.label)));
check('entries from before the restart are marked as an earlier session', j.journal.length > 0 && j.journal.every((e) => e.earlier));

console.log('\nProgress and cancellation');
const ev = await s2.events();
const jobEvents = (id) => ev.seen.filter((m) => m.type === 'job' && m.id === id);
const pending = s2.op({ type: 'copy', paths: ['big/notes.txt', 'big/movie.bin'], dest: 'docs', job: 'smoke-cancel-1' });
const midFile = await until(() => jobEvents('smoke-cancel-1').some((m) => m.phase === 'copying' && m.current === 'big/movie.bin' && m.bytes[0] > 6 * 1024 * 1024));
r = await s2.post('/api/cancel', { job: 'smoke-cancel-1' });
check('cancel is accepted while a copy is running', midFile && r.status === 200, JSON.stringify(r.body));
r = await pending;
// The closing event travels on the event stream, which can trail the reply.
await until(() => jobEvents('smoke-cancel-1').at(-1)?.phase === 'end', 3000);
const seen1 = jobEvents('smoke-cancel-1');
check('progress counts first, with the true total', seen1.some((m) => m.phase === 'counting') && seen1.some((m) => m.bytes[1] === BIG + 5 && m.files[1] === 2),
  JSON.stringify(seen1.slice(0, 3)));
const rising = seen1.filter((m) => m.phase === 'copying').map((m) => m.bytes[0]);
check('progress reports rising byte counts', rising.length >= 3 && rising.every((b, i) => i === 0 || b >= rising[i - 1]) && rising.at(-1) > 0, rising.join(','));
check('the cancelled copy says what it did', r.status === 200 && r.body.cancelled === true && /1 of 2 items/.test(r.body.label) && r.body.undoable === true, JSON.stringify(r.body));
check('finished items stay and the partial one is removed', read('docs', 'notes.txt') === 'notes' && !has('docs', 'movie.bin'));
check('the job closes with its outcome', seen1.at(-1)?.phase === 'end' && seen1.at(-1)?.outcome === 'cancelled');
check('cancelling a finished job is refused plainly', (await s2.post('/api/cancel', { job: 'smoke-cancel-1' })).status === 404);

const slow = s2.op({ type: 'copy', paths: ['big/movie.bin'], dest: 'media', job: 'smoke-full-1' });
const queued = s2.op({ type: 'copy', paths: ['big/notes.txt'], dest: 'media', job: 'smoke-queued-1' });
await until(() => jobEvents('smoke-queued-1').length > 0);
r = await s2.post('/api/cancel', { job: 'smoke-queued-1' });
const q = await queued;
r = await slow;
check('a full streamed copy completes and matches by content', r.status === 200 && !r.body.cancelled && sha('media', 'movie.bin') === sha('big', 'movie.bin'));
check('a copy keeps the modification time', Math.abs(fs.statSync(path.join(root, 'media', 'movie.bin')).mtimeMs - OLD.getTime()) < 2000);
check('a queued job cancels before it starts and changes nothing', q.status === 200 && q.body.cancelled && /before it started/.test(q.body.label) && !has('media', 'notes.txt'),
  JSON.stringify(q.body));
check('job ids sent by the page are used for its events', jobEvents('smoke-full-1').some((m) => m.phase === 'copying'));
ev.close();

console.log('\nUndo across the restart');
let steps = 0;
let labels = [];
for (;;) {
  r = await s2.post('/api/undo');
  if (r.status !== 200) break;
  labels.push(r.body.label);
  steps++;
}
check('undo stops with a clear message when the journal is empty', r.status === 409 && /nothing to undo/i.test(r.body.message));
check('undo names entries from the earlier session', labels.some((l) => /earlier session/.test(l)) && labels.some((l) => !/earlier session/.test(l)), labels.join(' | '));
// The one restore above was not an undo of its trash entry, so replaying
// that entry's undo restores the remaining held item only.
const after = snapshot();
check(`undo chain (${steps} steps, two processes) returns the directory to its starting state`, JSON.stringify(after) === JSON.stringify(before),
  `\n   before: ${before.join(' ')}\n   after:  ${after.join(' ')}`);
j = (await s2.get('/api/journal')).body;
check('the journal records every entry as undone', j.journal.length > 0 && j.journal.every((e) => e.undone));
await s2.stop();

console.log('\nJournal integrity');
const journalFile = path.join(root, '.terrane-trash', 'journal.json');
fs.writeFileSync(journalFile, JSON.stringify({ format: 1, entries: [
  { id: 1, type: 'move', label: 'Planted', at: Date.now(), session: 'x', undone: false, undo: { kind: 'moves', pairs: [['../outside/keep.txt', 'docs/b.txt']] } },
] }));
const s3 = await boot([], 4405);
r = await s3.post('/api/undo');
check('an edited journal that points outside the root is refused', r.status === 400 && fs.readFileSync(path.join(outside, 'keep.txt'), 'utf8') === 'outside' && read('docs', 'b.txt') === 'bravo',
  JSON.stringify(r.body));
await s3.stop();
fs.writeFileSync(journalFile, '{ not json');
const s4 = await boot([], 4410);
j = (await s4.get('/api/journal')).body;
const setAside = fs.readdirSync(path.join(root, '.terrane-trash')).some((n) => n.startsWith('journal.unreadable-'));
check('an unreadable journal is set aside, not overwritten', j.journal.length === 0 && setAside);
await s4.stop();

console.log('\nUndo answers and changes that stop part way (no service)');
{
  const { makeGuard } = await import('../server/guard.mjs');
  const { makeOps } = await import('../server/ops.mjs');
  const fsp = (await import('node:fs/promises')).default;
  const opsRoot = path.join(work, 'ops-root');
  for (const d of ['one', 'two', 'three', 'four', 'dest']) fs.mkdirSync(path.join(opsRoot, d), { recursive: true });
  fs.writeFileSync(path.join(opsRoot, 'one', 'f.txt'), '1');
  const g = await makeGuard(opsRoot);
  const at = (...p) => fs.existsSync(path.join(opsRoot, ...p));
  let o = makeOps(g, {});
  await o.run({ type: 'rename', path: 'one', name: 'uno' });
  await o.run({ type: 'move', paths: ['uno', 'two'], dest: 'dest' });
  let u = await o.undo();
  check('undo of a move answers with the paths it carried back, last moved first, each [where it was, where it is now]',
    JSON.stringify(u.moved) === JSON.stringify([['dest/two', 'two'], ['dest/uno', 'uno']]) && at('uno', 'f.txt') && at('two'), JSON.stringify(u));
  // Another process reads the journal: the answer holds after a restart, as after a page reload.
  await new Promise((r) => setTimeout(r, 5));
  o = makeOps(g, {});
  u = await o.undo();
  check('undo of a rename from an earlier session answers the same way', JSON.stringify(u.moved) === JSON.stringify([['uno', 'one']]) && /earlier session/.test(u.label) && at('one', 'f.txt'), JSON.stringify(u));
  // The second item's rename fails, so the move stops after the first.
  const rename = fsp.rename;
  const failOn = (name) => {
    fsp.rename = async (from, to) => {
      if (path.basename(from) === name) throw Object.assign(new Error('simulated: the item is in use'), { code: 'EBUSY' });
      return rename(from, to);
    };
  };
  let err = null;
  failOn('three');
  try {
    await o.run({ type: 'move', paths: ['two', 'three'], dest: 'dest' });
  } catch (e) {
    err = e;
  } finally {
    fsp.rename = rename;
  }
  check('a move that stops part way throws an error carrying results, the paths it finished',
    err?.status === 500 && JSON.stringify(err.results) === JSON.stringify(['dest/two']) && err.affected.includes('dest') && at('dest', 'two') && at('three'),
    JSON.stringify(err && { code: err.code, results: err.results, affected: err.affected, message: err.message }));
  u = await o.undo();
  check('its undo carries the finished path back and says so', JSON.stringify(u.moved) === JSON.stringify([['dest/two', 'two']]) && at('two') && !at('dest', 'two'), JSON.stringify(u));
  err = null;
  failOn('four');
  try {
    await o.run({ type: 'trash', paths: ['three', 'four'] });
  } catch (e) {
    err = e;
  } finally {
    fsp.rename = rename;
  }
  check('a removal that stops part way carries results too: the paths it removed to the holding area',
    err?.status === 500 && JSON.stringify(err.results) === JSON.stringify(['three']) && !at('three') && at('four'), JSON.stringify(err && { results: err.results, message: err.message }));
  u = await o.undo();
  check('an undo that moved nothing by path answers without moved', u.moved === undefined && at('three'), JSON.stringify(u));
  // A batch rename whose second file is in use (EBUSY on Windows).
  for (const n of ['r1.txt', 'r2.txt', 'r3.txt']) fs.writeFileSync(path.join(opsRoot, 'four', n), n);
  err = null;
  failOn('r2.txt');
  try {
    await o.run({ type: 'renames', items: [{ path: 'four/r1.txt', name: 's1.txt' }, { path: 'four/r2.txt', name: 's2.txt' }, { path: 'four/r3.txt', name: 's3.txt' }] });
  } catch (e) {
    err = e;
  } finally {
    fsp.rename = rename;
  }
  check('a batch rename that stops part way throws with results, where each item before it now is, and affected; what it finished stays',
    err?.status === 500 && JSON.stringify(err.results) === JSON.stringify(['four/s1.txt']) && JSON.stringify(err.affected) === JSON.stringify(['four'])
    && at('four', 's1.txt') && !at('four', 'r1.txt') && at('four', 'r2.txt') && at('four', 'r3.txt') && /^Renaming stopped at "r2\.txt" after 1 of 3 items: /.test(err.message),
    JSON.stringify(err && { results: err.results, affected: err.affected, message: err.message }));
  check('and it is journaled as a partial rename', (await o.journal()).at(-1)?.label === 'Partial rename (1 of 3)', JSON.stringify((await o.journal()).at(-1)));
  u = await o.undo();
  check('whose Undo carries the one finished name back', JSON.stringify(u.moved) === JSON.stringify([['four/s1.txt', 'four/r1.txt']]) && at('four', 'r1.txt') && !at('four', 's1.txt'), JSON.stringify(u));
  // An Undo that stops part way: what went back stays back, the entry
  // keeps the rest, and the next Undo resumes, after a restart too.
  fs.mkdirSync(path.join(opsRoot, 'five'));
  for (const n of ['u1', 'u2', 'u3']) fs.writeFileSync(path.join(opsRoot, 'five', n), n);
  await o.run({ type: 'mkdir', parent: 'five', name: 'earlier' });
  await o.run({ type: 'renames', items: ['u1', 'u2', 'u3'].map((n, i) => ({ path: `five/${n}`, name: `v${i + 1}` })) });
  const undoFailing = async (name) => {
    failOn(name);
    try {
      await o.undo();
      return null;
    } catch (e) {
      return e;
    } finally {
      fsp.rename = rename;
    }
  };
  const lastSaved = () => JSON.parse(fs.readFileSync(path.join(opsRoot, '.terrane-trash', 'journal.json'), 'utf8')).entries.at(-1);
  err = await undoFailing('v3');
  check('an Undo whose first item cannot go back says nothing was changed, and leaves its entry whole',
    err?.status === 500 && err.worded && /^Undo could not put "v3" back: it is in use by another program\. Nothing was changed\.$/.test(err.message) && !err.moved
    && at('five', 'v1') && at('five', 'v2') && at('five', 'v3') && lastSaved().undo.pairs.length === 3, JSON.stringify(err && { message: err.message, moved: err.moved }));
  err = await undoFailing('v2');
  check('an Undo that stops part way says how many went back and how many are left, with moved and affected',
    err?.status === 500 && err.code === 'EBUSY' && err.worded
    && /^Undo stopped at "v2" after putting back 1 of 3 items: it is in use by another program\. Undo again to put back the other 2\.$/.test(err.message)
    && JSON.stringify(err.moved) === JSON.stringify([['five/v3', 'five/u3']]) && JSON.stringify(err.affected) === JSON.stringify(['five'])
    && at('five', 'u3') && !at('five', 'v3') && at('five', 'v1') && at('five', 'v2'),
    JSON.stringify(err && { code: err.code, message: err.message, moved: err.moved, affected: err.affected }));
  check('the journal on disk keeps the entry, not undone, with only the two pairs still out',
    lastSaved().undone === false && JSON.stringify(lastSaved().undo.pairs) === JSON.stringify([['five/u1', 'five/v1'], ['five/u2', 'five/v2']]), JSON.stringify(lastSaved()));
  o = makeOps(g, {});
  u = await o.undo();
  check('after a restart the next Undo resumes: the other two go back, and moved names only them',
    JSON.stringify(u.moved) === JSON.stringify([['five/v2', 'five/u2'], ['five/v1', 'five/u1']]) && /^Undid: Renamed 3 items/.test(u.label)
    && at('five', 'u1') && at('five', 'u2') && at('five', 'u3') && !at('five', 'v1') && !at('five', 'v2'), JSON.stringify(u));
  u = await o.undo();
  check('and the entry before it is within reach of Undo again', u.ok && !at('five', 'earlier'), JSON.stringify(u));
}

console.log('\nHolding-area records, the holding area itself and links that move (no service)');
{
  const { makeGuard, relParts } = await import('../server/guard.mjs');
  const { makeOps, validHold } = await import('../server/ops.mjs');
  const base = path.join(work, 'hold-probe');
  const hroot = path.join(base, 'root');
  const away = path.join(base, 'outside');
  const victim = path.join(away, 'victim');
  fs.mkdirSync(path.join(hroot, 'pkg'), { recursive: true });
  fs.mkdirSync(victim, { recursive: true });
  fs.writeFileSync(path.join(victim, 'keep.txt'), 'OUTSIDE FILE');
  fs.writeFileSync(path.join(victim, 'other.txt'), 'another outside file');
  const hold = path.join(hroot, '.terrane-trash');
  fs.mkdirSync(path.join(hold, 'items'), { recursive: true });
  // An index and a journal planted by whatever wrote the directory: the
  // record's id climbs out of the items folder to a folder outside.
  const planted = [
    { id: '../../../outside/victim', name: 'keep.txt', origin: 'notes.txt', at: 1 },
    { id: 'abc-1', name: '../../../outside/victim/keep.txt', origin: 'pulled-in.txt', at: 1 },
    { id: 'abc-2', name: '..', origin: 'up.txt', at: 1 },
  ];
  fs.writeFileSync(path.join(hold, 'index.json'), JSON.stringify(planted));
  fs.writeFileSync(path.join(hold, 'journal.json'), JSON.stringify({ format: 1, entries: [
    { id: 1, type: 'trash', label: 'Removed 1 item to the holding area', at: 1, session: 'x', undone: false, undo: { kind: 'restore', ids: planted.map((p) => p.id) } },
  ] }));
  const g = await makeGuard(hroot);
  const o = makeOps(g, {});
  check('validHold keeps only ids hold() could mint and single entry names',
    !planted.some(validHold) && validHold({ id: 'mjx3k2-1a', name: 'a.txt', origin: 'a.txt' }) && !validHold({ id: 'mjx3k2-1a', name: 'a/b', origin: 'x' }), '');
  check('the Journal never lists a planted record', (await o.holding()).length === 0);
  let threw = null;
  try {
    await o.restore(['../../../outside/victim']);
  } catch (e) {
    threw = e;
  }
  const intact = () => fs.existsSync(path.join(victim, 'keep.txt')) && fs.existsSync(path.join(victim, 'other.txt'));
  check('restore of a planted id is refused and moves or deletes nothing outside', threw?.status === 404 && intact() && !fs.existsSync(path.join(hroot, 'notes.txt')), threw?.message);
  const u = await o.undo();
  check('Undo of a planted journal entry restores nothing and deletes nothing outside',
    u.ok && intact() && !fs.existsSync(path.join(hroot, 'notes.txt')) && !fs.existsSync(path.join(hroot, 'pulled-in.txt')), JSON.stringify(u));
  // A real removal and its restore still work beside the planted records.
  fs.writeFileSync(path.join(hroot, 'pkg', 'real.txt'), 'real');
  await o.run({ type: 'trash', paths: ['pkg/real.txt'] });
  const held = await o.holding();
  const back = await o.restore([held[0]?.id]);
  check('an ordinary removal is still held and restored', held.length === 1 && back.ok && fs.readFileSync(path.join(hroot, 'pkg', 'real.txt'), 'utf8') === 'real', JSON.stringify(held));
  check('relParts refuses the holding area in any case where case does not matter, and stream names on Windows', (() => {
    const refused = (p) => { try { relParts(p); return false; } catch { return true; } };
    const folds = process.platform === 'win32' || process.platform === 'darwin';
    return refused('.terrane-trash/x') && refused('.TERRANE-TRASH/x') === folds && refused('a/.Terrane-Trash') === folds
      && refused('x:y') === (process.platform === 'win32') && !refused('docs/a.txt');
  })());
  // The holding area as a link to a folder outside: nothing is held there.
  if (linked) {
    fs.rmSync(hold, { recursive: true, force: true });
    const elsewhere = path.join(away, 'catch');
    fs.mkdirSync(elsewhere);
    fs.symlinkSync(elsewhere, hold, 'junction');
    fs.writeFileSync(path.join(hroot, 'pkg', 'b.txt'), 'b');
    const o2 = makeOps(g, {});
    let refused = null;
    try {
      await o2.run({ type: 'trash', paths: ['pkg/b.txt'] });
    } catch (e) {
      refused = e;
    }
    check('a holding area that is a link is not used: the removal is refused and nothing lands outside',
      refused?.code === 'EHOLD' && fs.existsSync(path.join(hroot, 'pkg', 'b.txt')) && fs.readdirSync(elsewhere).length === 0, refused?.message);
    fs.rmSync(hold, { force: true });
    // A relative link that resolves inside the root from where it is, and
    // outside it from the root.
    fs.mkdirSync(path.join(hroot, 'd1', 'd2'), { recursive: true });
    fs.mkdirSync(path.join(hroot, 'deep', 'er'), { recursive: true });
    fs.writeFileSync(path.join(hroot, 'fx-target.txt'), 'inside');
    fs.symlinkSync(path.join('..', '..', 'fx-target.txt'), path.join(hroot, 'd1', 'd2', 'rl'), 'file');
    const o3 = makeOps(g, {});
    const attempt = async (op) => {
      try {
        return await o3.run(op);
      } catch (e) {
        return { error: e };
      }
    };
    const copied = await attempt({ type: 'copy', paths: ['d1/d2/rl'], dest: '' });
    const moved = await attempt({ type: 'move', paths: ['d1/d2/rl'], dest: '' });
    check('a relative link is not copied or moved to where it would point outside the root',
      copied.error?.code === 'ELINK' && moved.error?.code === 'ELINK' && !fs.existsSync(path.join(hroot, 'rl')) && fs.lstatSync(path.join(hroot, 'd1', 'd2', 'rl')).isSymbolicLink(),
      `${copied.error?.message} | ${moved.error?.message}`);
    const folder = await attempt({ type: 'copy', paths: ['d1/d2'], dest: '' });
    check('a folder whose copy would carry such a link stops with the reason and leaves nothing of itself', !!folder.error && /relative link/.test(folder.error.message) && !fs.existsSync(path.join(hroot, 'd2')), folder.error?.message);
    const deeper = await attempt({ type: 'copy', paths: ['d1'], dest: 'deep/er' });
    check('a link whose copy still points inside the root is copied as before', deeper.ok && fs.lstatSync(path.join(hroot, 'deep', 'er', 'd1', 'd2', 'rl')).isSymbolicLink(), JSON.stringify(deeper.error?.message || ''));
  }
}

console.log('\nA survey the page drops while the socket is full (no service)');
{
  const { EventEmitter } = await import('node:events');
  const { pump } = await import('../server/scan.mjs');
  // A response whose buffer stays full: write() answers false and 'drain'
  // never comes. The page then goes away, which emits 'close' only.
  const res = new EventEmitter();
  res.destroyed = false;
  res.writableEnded = false;
  res.writes = 0;
  res.write = () => { res.writes++; return false; };
  res.end = () => { res.writableEnded = true; };
  let finished = false;
  let produced = 0;
  async function* source() {
    try {
      for (;;) {
        produced++;
        yield [produced];
      }
    } finally {
      finished = true;
    }
  }
  const ac = new AbortController();
  const done = pump(res, source(), ac.signal).then(() => 'settled');
  await wait(20);
  res.destroyed = true;
  ac.abort();
  res.emit('close');
  const outcome = await Promise.race([done, wait(2000).then(() => 'stuck')]);
  check('the writer stops when the page goes away while it waits for drain, and the source\'s finally runs', outcome === 'settled' && finished && res.writes === 1 && res.writableEnded, `${outcome}, ${res.writes} writes, finally ${finished}`);
}

console.log('\nSnapshot mode');
const { takeSnapshot } = await import('../server/snapshot.mjs');
const snapDir = path.join(work, 'snaps');
const snapMeta = await takeSnapshot(root, snapDir);
check('a snapshot is written outside the directory it records, which is left unchanged',
  fs.existsSync(snapMeta.file) && !snapMeta.file.startsWith(root + path.sep) && JSON.stringify(snapshot()) === JSON.stringify(before));
const flat = (text) => {
  const where = new Map();
  const out = new Map();
  for (const [id, pid, name, , err, files] of text.trim().split('\n').flatMap((l) => JSON.parse(l))) {
    const p = pid === -1 ? '' : where.get(pid) ? `${where.get(pid)}/${name}` : name;
    where.set(id, p);
    const rows = [];
    for (let i = 0; i < files.length; i += 4) rows.push(files.slice(i, i + 4).join('|'));
    out.set(p, `${err}:${rows.sort().join(',')}`);
  }
  return JSON.stringify([...out].sort());
};
const liveRo = await boot(['--read-only'], 4415);
const liveScan = flat((await liveRo.get('/api/scan?path=')).text);
const liveShallow = flat((await liveRo.get('/api/scan?path=docs&depth=1')).text);
await liveRo.stop();
const sm = await boot(['--snapshot', snapDir], 4420, {}, { withRoot: false });
check('snapshot replay matches a live scan record for record', flat((await sm.get('/api/scan?path=')).text) === liveScan);
check('a depth-limited replay matches too', flat((await sm.get('/api/scan?path=docs&depth=1')).text) === liveShallow);
const info = (await sm.get('/api/info')).body;
check('the service says which snapshot it is showing', info.snapshot?.takenAt === snapMeta.takenAt && info.readOnly === true && info.root === snapMeta.root);
r = await sm.op({ type: 'mkdir', parent: '', name: 'from-snapshot' });
const u = await sm.post('/api/undo');
check('snapshot mode refuses every change', r.status === 403 && u.status === 403 && /snapshot/i.test(r.body.message) && !has('from-snapshot'));
r = await sm.op({ type: 'renames', items: [{ path: 'docs/b.txt', name: 'z.txt' }] });
check('a batch rename too', r.status === 403 && r.body.code === 'ESNAPSHOT' && has('docs', 'b.txt') && !has('docs', 'z.txt'), JSON.stringify(r.body));
r = await sm.post('/api/terminal', { path: '' });
check('a terminal too, with ESNAPSHOT and a sentence of its own', r.status === 403 && r.body.code === 'ESNAPSHOT' && /opens no terminal/.test(r.body.message), JSON.stringify(r.body));
check('snapshot mode never reads file contents', (await sm.get('/api/raw?path=docs/b.txt')).status === 403);
r = await sm.request('GET', '/api/raw?path=docs/b.txt', { token: sm.token, headers: { Range: 'bytes=0-2' } });
check('nor a byte range of one: ESNAPSHOT, no bytes', r.status === 403 && r.body.code === 'ESNAPSHOT' && !r.headers['content-range'], `${r.status} ${JSON.stringify(r.body)}`);
r = await sm.get('/api/inside?path=docs/b.txt');
check('snapshot mode refuses to look inside an archive, with ESNAPSHOT and a sentence',
  r.status === 403 && r.body.code === 'ESNAPSHOT' && /snapshot mode/i.test(r.body.message) && !r.body.records, JSON.stringify(r.body));
check('snapshot mode keeps the path rules', (await sm.get('/api/scan?path=' + encodeURIComponent('../outside'))).status === 400);
check('without a thumbnail dataset the index says so', (await sm.get('/api/thumbs')).body.available === false);
await sm.stop();

console.log('\nRead-only mode');
const ro = await boot(['--read-only'], 4395);
r = await ro.op({ type: 'mkdir', parent: '', name: 'nope' });
check('read-only refuses mutations with an explanation', r.status === 403 && /read-only/i.test(r.body.message) && !has('nope'));
r = await ro.op({ type: 'renames', items: [{ path: 'docs/b.txt', name: 'z.txt' }] });
check('a batch rename too', r.status === 403 && /read-only/i.test(r.body.message) && has('docs', 'b.txt') && !has('docs', 'z.txt'), JSON.stringify(r.body));
check('read-only still scans', (await ro.get('/api/scan?path=')).status === 200);
await ro.stop();

console.log('\nOpen a terminal (TERRANE_LAUNCH_LOG: nothing is started)');
{
  const { makeGuard } = await import('../server/guard.mjs');
  const { makeOps, terminalPlan } = await import('../server/ops.mjs');
  const { EventEmitter } = await import('node:events');
  const log = path.join(work, 'launch.log');
  const roLog = path.join(work, 'launch-read-only.log');
  const lines = (f) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);
  const odd = 'term dir & ; %';
  fs.mkdirSync(path.join(root, odd));
  let termLink = false;
  try {
    fs.symlinkSync(outside, path.join(root, 'term-escape'), 'junction');
    termLink = true;
  } catch { /* no link here */ }
  const real = (...p) => fs.realpathSync.native(path.join(root, ...p));
  /** A POST with any content type, for the JSON rule. */
  const rawPost = (port, route, text, type, token) => new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path: route, method: 'POST', headers: { 'Content-Type': type, 'Content-Length': Buffer.byteLength(text), ...(token ? { 'X-Terrane-Token': token } : {}) } }, (res) => {
      let t = '';
      res.on('data', (c) => { t += c; });
      res.on('end', () => resolve({ status: res.statusCode, text: t }));
    });
    req.on('error', reject);
    req.end(text);
  });

  const tw = await boot([], 5045, { TERRANE_LAUNCH_LOG: log });
  const term = (body) => tw.request('POST', '/api/terminal', { token: tw.token, body });
  r = await tw.request('POST', '/api/terminal', { body: { path: '' } });
  check('POST /api/terminal without the token is 401', r.status === 401 && r.body.code === 'ETOKEN', JSON.stringify(r.body));
  r = await rawPost(tw.port, '/api/terminal', JSON.stringify({ path: '' }), 'text/plain', tw.token);
  check('with another content type it is 415', r.status === 415, `${r.status} ${r.text}`);
  check('neither reached a launch', lines(log).length === 0);

  const plan = terminalPlan(process.platform, process.env);
  r = await term({ path: '' });
  let got = lines(log);
  check('the root opens a terminal: one launch, the plan\'s first, whose working directory is the root\'s real path',
    r.status === 200 && r.body.ok && got.length === 1 && got[0].cmd === plan[0].cmd && JSON.stringify(got[0].args) === JSON.stringify(plan[0].args) && got[0].cwd === fs.realpathSync.native(root),
    `${r.status} ${JSON.stringify(r.body)} ${JSON.stringify(got)}`);
  r = await term({ path: odd });
  got = lines(log);
  check(`a folder named "${odd}" opens in its real path, and no argument holds the path`,
    r.status === 200 && got.length === 2 && got[1].cwd === real(odd) && got.every((l) => l.args.every((a) => !a.includes(odd) && !a.includes(root) && !a.includes(work))),
    `${r.status} ${JSON.stringify(got[1])}`);
  r = await term({ path: 'docs/b.txt' });
  check('a file is refused: ENOTDIR, 400, "b.txt is not a folder."', r.status === 400 && r.body.code === 'ENOTDIR' && r.body.message === 'b.txt is not a folder.', JSON.stringify(r.body));
  r = await term({ path: '../outside' });
  const climb = r.status;
  r = await term({ path: '.terrane-trash' });
  const held = r.status;
  r = await term({ path: 'no such folder' });
  const missing = r.status;
  r = await term({});
  check('traversal is 400, the holding area 403, a folder that is not there 404, and no path 400', climb === 400 && held === 403 && missing === 404 && r.status === 400, `${climb} ${held} ${missing} ${r.status}`);
  if (termLink) {
    r = await term({ path: 'term-escape' });
    check('a link that leads outside the root is refused with EOUTSIDE before anything is launched', r.status === 403 && r.body.code === 'EOUTSIDE', JSON.stringify(r.body));
  }
  check('none of the refusals reached a launch', lines(log).length === 2, JSON.stringify(lines(log).slice(2)));
  r = await tw.op({ type: 'open', path: 'docs/b.txt' });
  const opened = lines(log)[2];
  check('Open goes to the launch log too, and starts nothing', r.status === 200 && lines(log).length === 3 && opened?.args.some((a) => a.endsWith('b.txt')) && opened.cwd === null, JSON.stringify(opened));
  await tw.stop();

  const tr = await boot(['--read-only'], 5046, { TERRANE_LAUNCH_LOG: roLog });
  r = await tr.request('POST', '/api/terminal', { token: tr.token, body: { path: '' } });
  check('read-only mode refuses a terminal with EREADONLY and its sentence, and launches nothing',
    r.status === 403 && r.body.code === 'EREADONLY' && r.body.message === 'Terrane was started in read-only mode, so it does not open a terminal, from which anything on disk could be changed.' && lines(roLog).length === 0,
    JSON.stringify(r.body));
  await tr.stop();

  // The plan, for every platform.
  const win = terminalPlan('win32', { ComSpec: 'C:\\Windows\\system32\\cmd.exe' });
  check('Windows: Windows Terminal in ".", then ComSpec asked to start a console of its own, both detached and shown',
    JSON.stringify(win) === JSON.stringify([
      { cmd: 'wt.exe', args: ['-d', '.'], detached: true, windowsHide: false },
      { cmd: 'C:\\Windows\\system32\\cmd.exe', args: ['/d', '/c', 'start', 'cmd.exe'], detached: true, windowsHide: false },
    ]) && terminalPlan('win32', {})[1].cmd === 'cmd.exe', JSON.stringify(win));
  check('macOS: open -a Terminal .', JSON.stringify(terminalPlan('darwin', {}).map((x) => [x.cmd, x.args])) === JSON.stringify([['open', ['-a', 'Terminal', '.']]]));
  check('Linux: x-terminal-emulator, then gnome-terminal, with no arguments',
    JSON.stringify(terminalPlan('linux', {}).map((x) => [x.cmd, x.args])) === JSON.stringify([['x-terminal-emulator', []], ['gnome-terminal', []]]));

  // In-process, with a stand-in for spawn: the plan's order, nothing started.
  const g = await makeGuard(root);
  const fake = (codes) => {
    const calls = [];
    const fn = (cmd, args, opts) => {
      calls.push({ cmd, args, opts });
      const child = new EventEmitter();
      child.unref = () => {};
      setImmediate(() => (codes[cmd] ? child.emit('error', Object.assign(new Error(`spawn ${cmd} ${codes[cmd]}`), { code: codes[cmd] })) : child.emit('spawn')));
      return child;
    };
    return { calls, fn };
  };
  if (plan.length > 1) {
    const f = fake({ [plan[0].cmd]: 'ENOENT' });
    const res = await makeOps(g, { spawn: f.fn }).terminal(odd);
    check(`when ${plan[0].cmd} is not there the next terminal is tried, with the folder as its working directory, no shell, detached`,
      res.ok && f.calls.length === 2 && f.calls[1].cmd === plan[1].cmd && f.calls.every((c) => c.opts.cwd === real(odd) && c.opts.shell === false && c.opts.detached === true && c.opts.stdio === 'ignore'),
      JSON.stringify(f.calls.map((c) => [c.cmd, c.opts.cwd, c.opts.shell])));
  }
  const none = fake(Object.fromEntries(plan.map((x) => [x.cmd, 'ENOENT'])));
  let threw = null;
  try {
    await makeOps(g, { spawn: none.fn }).terminal('');
  } catch (e) {
    threw = e;
  }
  check(`when no terminal is there: ELAUNCH, 501, "No terminal was found: tried ${plan.map((x) => x.cmd).join(', ')}."`,
    threw?.code === 'ELAUNCH' && threw.status === 501 && threw.message === `No terminal was found: tried ${plan.map((x) => x.cmd).join(', ')}.` && none.calls.length === plan.length, threw?.message);
  const denied = fake({ [plan[0].cmd]: 'EACCES' });
  threw = null;
  try {
    await makeOps(g, { spawn: denied.fn }).terminal('');
  } catch (e) {
    threw = e;
  }
  check('any other failure stops there, with the system\'s code', threw?.code === 'ELAUNCH' && /EACCES/.test(threw.message) && denied.calls.length === 1, threw?.message);
  threw = null;
  try {
    await makeOps(g, { readOnly: true, spawn: none.fn }).terminal('');
  } catch (e) {
    threw = e;
  }
  check('a read-only ops refuses before trying anything', threw?.code === 'EREADONLY' && none.calls.length === plan.length);
  fs.rmSync(path.join(root, odd), { recursive: true, force: true });
  if (termLink) fs.rmSync(path.join(root, 'term-escape'), { force: true, recursive: false });
}

console.log('\nArchive interiors (the fixture\'s archives, through the service)');
const { makeFixture, unseal } = await import('./make-fixture.mjs');
const { Model: TreeModel } = await import(new URL('../web/js/model.js', import.meta.url));
{
  const fx = path.join(work, 'fixture');
  const away = path.join(work, 'away');
  const fm = await makeFixture(fx, { files: 120, seed: 7 });
  const AR = fm.archives;
  const fxPath = (rel) => path.join(fx, ...rel.split('/'));
  fs.mkdirSync(away);
  fs.copyFileSync(fxPath(AR.site.path), path.join(away, 'away.zip'));
  let fxLinked = false;
  try {
    fs.symlinkSync(path.join(away, 'away.zip'), fxPath('archives/away-link.zip'), 'file');
    fs.symlinkSync(away, fxPath('archives/away-dir'), process.platform === 'win32' ? 'junction' : 'dir');
    fxLinked = true;
  } catch { /* no link privilege */ }
  fs.writeFileSync(fxPath('archives/many.zip'), manyZip(100001));
  const fxBefore = treeState(fx);

  // Read-only: looking inside is reading, so a read-only service allows it.
  const z = await boot([fx, '--read-only'], 4930, {}, { withRoot: false });
  const inside = (rel, opts) => (opts?.token === false
    ? z.request('GET', `/api/inside?path=${encodeURIComponent(rel)}`)
    : z.get(`/api/inside?path=${encodeURIComponent(rel)}`));
  const listed = (entries) => entries.map((e) => (e.folder ? e.name : `${e.name}:${e.size}`)).sort();

  let x = await inside(AR.site.path);
  check(`the stored zip lists exactly the fixture's names and sizes, the UTF-8 name included (${x.body.files} files, ${x.body.folders} folders)`,
    x.status === 200 && JSON.stringify(recordPaths(x.body.records)) === JSON.stringify(listed(AR.site.entries))
    && recordPaths(x.body.records).includes('site/notes/café.md:29') && x.body.partial === null && x.body.format === 'zip',
    JSON.stringify(x.body).slice(0, 400));
  const site = x.body;
  check('the listing states the archive\'s own size and time, and its totals add up',
    site.size === fs.statSync(fxPath(AR.site.path)).size && site.mtime === Math.round(fs.statSync(fxPath(AR.site.path)).mtimeMs)
    && site.declared === AR.site.entries.length && site.read === AR.site.entries.length
    && site.unpacked === AR.site.entries.reduce((a, e) => a + e.size, 0) && site.locked === 0 && site.escapes === 0);
  const tm = new TreeModel('site.zip');
  tm.ingest(site.records, [], tm.root);
  check('the records are the scanner\'s shape, parents first, and the browser\'s model takes them as they are',
    site.records.every(([id, pid], i) => id === i && pid < id) && tm.root.fc === site.files && tm.root.dc === site.folders && tm.root.s === site.unpacked);
  const mirror = (await z.get(`/api/scan?path=${encodeURIComponent(AR.mirror)}`)).text.trim().split('\n').flatMap((l) => JSON.parse(l));
  const mirrored = recordPaths(mirror.map((rec) => (rec[1] === -1 ? [rec[0], -1, '', 0, 0, rec[5]] : rec))).map((p) => `site/${p}`);
  check('the archive lists what the loose copy beside it holds, name for name and size for size',
    JSON.stringify(['site/', ...mirrored].sort()) === JSON.stringify(recordPaths(site.records)), mirrored.join(' '));
  x = await inside(fm.chain.host);
  check('the copy 13 levels down lists the same entries', x.status === 200 && JSON.stringify(recordPaths(x.body.records)) === JSON.stringify(recordPaths(site.records)));

  x = await inside(AR.zip64.path);
  check('a ZIP64 archive lists its entries from the ZIP64 end records',
    x.status === 200 && JSON.stringify(recordPaths(x.body.records)) === JSON.stringify(listed(AR.zip64.entries)));

  x = await inside(AR.hazards.path);
  const hz = x.body.records?.[0]?.[5] || [];
  const flagOf = (n) => hz[hz.indexOf(n) + 3];
  check('the encrypted entry carries the LOCKED flag (8) and is counted; the others do not',
    x.status === 200 && x.body.locked === AR.hazards.locked && (flagOf('secret.txt') & 8) === 8 && (flagOf('readme.txt') & 8) === 0 && (flagOf('escape.txt') & 8) === 0,
    JSON.stringify(x.body));
  check('the ../ name is counted as an escape, flagged (16), kept verbatim, and listed inside the archive',
    x.body.escapes === AR.hazards.escapes && (flagOf('escape.txt') & 16) === 16 && (flagOf('readme.txt') & 16) === 0
    && JSON.stringify(x.body.escaped) === '[{"name":"../escape.txt","at":"escape.txt"}]' && x.body.records.length === 1);

  x = await inside(AR.truncated.path);
  check('a truncated zip is refused with the damaged sentence (422)',
    x.status === 422 && x.body.code === 'EDAMAGED' && /^truncated\.zip looks damaged: .*cut short.*cannot be listed\.$/.test(x.body.message), JSON.stringify(x.body));
  x = await inside(AR.sevenZip.path);
  check('a 7z archive is refused with 415 naming the format',
    x.status === 415 && x.body.code === 'EFORMAT' && x.body.format === '7z' && /packed\.7z is a 7z archive\. Terrane lists the contents of zip archives only\./.test(x.body.message), JSON.stringify(x.body));
  x = await inside(AR.notAnArchive);
  check('a file named .tar.gz that is not one is refused with 415 naming the format its name suggests',
    x.status === 415 && x.body.code === 'ENOTARCHIVE' && x.body.format === null && x.body.claimed === 'tar.gz' && /is not an archive: .*\(tar\.gz\)/.test(x.body.message), JSON.stringify(x.body));
  x = await inside('archives/site');
  check('a folder is refused with ENOTFILE (400)', x.status === 400 && x.body.code === 'ENOTFILE', JSON.stringify(x.body));

  x = await inside('archives/many.zip');
  check('a 100,001-entry archive stops at the 100,000-entry bound and says so in a sentence',
    x.status === 200 && x.body.read === 100000 && x.body.files === 100000 && x.body.declared === 100001
    && x.body.partial === 'Only part of many.zip is listed, the first 100,000 of 100,001 entries: Terrane reads at most 100,000 entries from one archive.',
    `${x.body.read} read, ${x.body.partial}, ${x.body.ms} ms`);

  check('the API refuses a listing without the token (401)', (await inside(AR.site.path, { token: false })).status === 401);
  check('a path with .. is refused (400)', (await inside(`archives/../${AR.site.path}`)).status === 400);
  check('the root, the holding area and a missing file are refused (403, 403, 404)',
    (await inside('')).status === 403 && (await inside('.terrane-trash/x.zip')).status === 403 && (await inside('archives/nowhere.zip')).status === 404);
  if (fxLinked) {
    x = await inside('archives/away-link.zip');
    check('a link to an archive outside the root is refused (403)', x.status === 403 && x.body.code === 'EOUTSIDE' && !x.body.records, JSON.stringify(x.body));
    x = await inside('archives/away-dir/away.zip');
    check('an archive reached through a linked folder outside the root is refused (403)', x.status === 403 && x.body.code === 'EOUTSIDE', JSON.stringify(x.body));
  } else console.log('  skip  links to archives outside the root (links cannot be created here)');
  await z.stop();
  const fxAfter = treeState(fx);
  check(`listing changed nothing on disk: names, sizes, times and bytes are identical (${fxBefore.length} items)`,
    fxBefore.length > 100 && JSON.stringify(fxAfter) === JSON.stringify(fxBefore), fxAfter.filter((l, i) => l !== fxBefore[i]).slice(0, 4).join(' | '));
  unseal(fx);
}

console.log('\nArchive reader (no service)');
{
  const AX = await import('../server/archive.mjs');
  const zips = path.join(work, 'zips');
  fs.mkdirSync(zips);
  let seq = 0;
  /** Writes bytes as a zip file and reads it back, as the service would. */
  const look = async (bytes, opts = {}) => {
    const file = path.join(zips, `z${++seq}.zip`);
    fs.writeFileSync(file, bytes);
    try {
      return await AX.inspect(file, { name: opts.name || 'test.zip', ...opts });
    } catch (err) {
      return { error: err.code, status: err.status, message: err.message, format: err.format };
    }
  };
  const filesOf = (out, dir = '') => {
    const rec = dir ? out.records.find((rc) => rc[1] !== -1 && rc[2] === dir) : out.records[0];
    const f = rec?.[5] || [];
    const m = {};
    for (let i = 0; i < f.length; i += 4) m[f[i]] = { size: f[i + 1], m: f[i + 2], flags: f[i + 3] };
    return m;
  };
  const ext = (id, body) => {
    const b = Buffer.alloc(4 + body.length);
    b.writeUInt16LE(id, 0);
    b.writeUInt16LE(body.length, 2);
    body.copy(b, 4);
    return b;
  };
  const u32 = (v) => {
    const b = Buffer.alloc(4);
    b.writeUInt32LE(v >>> 0);
    return b;
  };

  // Names.
  const stale = Buffer.from('old-name.txt');
  let out = await look(zipOf([
    { name: Buffer.from([0x63, 0x61, 0x66, 0x82, 0x2e, 0x74, 0x78, 0x74]) },
    { name: Buffer.from('naïve.txt', 'utf8') },
    { name: 'plain.txt', flags: 0x0800 },
    { name: stale, extra: ext(0x7075, Buffer.concat([Buffer.from([1]), u32(zlib.crc32(stale)), Buffer.from('日本.txt', 'utf8')])) },
    { name: 'kept.txt', extra: ext(0x7075, Buffer.concat([Buffer.from([1]), u32(zlib.crc32(stale)), Buffer.from('ignored.txt', 'utf8')])) },
  ]));
  check('names: code page 437 without the UTF-8 flag, unflagged valid UTF-8, the Unicode Path field when its CRC matches the stored name, and not otherwise',
    JSON.stringify(Object.keys(filesOf(out))) === JSON.stringify(['café.txt', 'naïve.txt', 'plain.txt', '日本.txt', 'kept.txt']), JSON.stringify(Object.keys(filesOf(out))));

  // Dates.
  const ntfs = Buffer.alloc(32);
  ntfs.writeUInt16LE(1, 4);
  ntfs.writeUInt16LE(24, 6);
  ntfs.writeBigUInt64LE((BigInt(Date.UTC(2020, 0, 2, 3, 4, 5)) + 11644473600000n) * 10000n, 8);
  const ut = Buffer.alloc(5);
  ut[0] = 1;
  ut.writeInt32LE(1600000000, 1);
  const dosDate = ((2019 - 1980) << 9) | (3 << 5) | 4;
  const dosClock = (5 << 11) | (6 << 5) | 4;
  out = await look(zipOf([
    { name: 'dos.txt', date: dosDate, time: dosClock },
    { name: 'ut.txt', date: dosDate, time: dosClock, extra: ext(0x5455, ut) },
    { name: 'ntfs.txt', date: dosDate, time: dosClock, extra: ext(0x000a, ntfs) },
    { name: 'undated.txt' },
    { name: 'bad-day.txt', date: (40 << 9) | (13 << 5) | 1 },
  ]));
  let fo = filesOf(out);
  check('dates: DOS fields as local time, the extended timestamp and NTFS fields as UTC, and 0 for none or an impossible date',
    fo['dos.txt'].m === new Date(2019, 2, 4, 5, 6, 8).getTime() && fo['ut.txt'].m === 1600000000000 && fo['ntfs.txt'].m === Date.UTC(2020, 0, 2, 3, 4, 5)
    && fo['undated.txt'].m === 0 && fo['bad-day.txt'].m === 0, JSON.stringify(fo));

  // Kinds and flags.
  const unix = (3 << 8) | 30;
  const z64 = Buffer.alloc(16);
  z64.writeBigUInt64LE(5000000000n, 0);
  z64.writeBigUInt64LE(4900000000n, 8);
  out = await look(zipOf([
    { name: 'link', made: unix, attrs: (0o120777 << 16) >>> 0, data: Buffer.from('../../etc/passwd') },
    { name: 'pipe', made: unix, attrs: (0o010644 << 16) >>> 0 },
    { name: 'bin', made: unix, attrs: (0o040755 << 16) >>> 0 },
    { name: 'bin/tool', made: unix, attrs: (0o100755 << 16) >>> 0, data: Buffer.from('#!') },
    { name: '.env', data: Buffer.from('A=1') },
    { name: 'dosdir', attrs: 0x10 },
    { name: 'huge.bin', size: 0xffffffff, packed: 0xffffffff, extra: ext(0x0001, z64) },
  ]));
  fo = filesOf(out);
  check('flags: a Unix symbolic link (1, size 0), hidden (2), special (4); folders by Unix mode or DOS attribute; ZIP64 sizes per entry',
    fo.link.flags === 1 && fo.link.size === 0 && out.links === 1 && fo['.env'].flags === 2 && fo.pipe.flags === 4
    && !fo.bin && !fo.dosdir && out.folders === 2 && fo['huge.bin'].size === 5000000000 && out.packed === 4900000000 + 2 + 3 + 16,
    JSON.stringify({ fo, folders: out.folders, packed: out.packed }));

  // Names that would land outside the folder.
  out = await look(zipOf(['/abs.txt', 'C:\\win.txt', 'a:b.txt', '..\\back.txt', 'x/../../up.txt', 'ok/../fine.txt', 'deep/./er/../in.txt', '../'].map((name) => ({ name }))));
  fo = filesOf(out);
  check('escapes: absolute, drive-lettered and climbing names are kept at the top, flagged 16, counted, and given back verbatim; .. that stays inside is resolved',
    out.escapes === 6 && ['abs.txt', 'win.txt', 'a:b.txt', 'back.txt', 'up.txt'].every((n) => fo[n]?.flags === 16) && fo['fine.txt']?.flags === 0
    && filesOf(out, 'deep')['in.txt']?.flags === 0 && out.escaped.map((e) => e.name).join('|') === '/abs.txt|C:\\win.txt|a:b.txt|..\\back.txt|x/../../up.txt|../'
    && out.partial === null, JSON.stringify({ fo, escaped: out.escaped, partial: out.partial }));

  // Depth, folders and unnamed entries.
  out = await look(zipOf([
    { name: `${'d/'.repeat(128)}kept.txt` },
    { name: `${'d/'.repeat(129)}deep.txt` },
    { name: `${'d/'.repeat(140)}` },
    { name: '..' },
    { name: 'fine.txt' },
  ]));
  check('an entry more than 128 folders deep, or with no usable name, is left out, and the sentence says how many and why',
    out.files === 2 && out.folders === 128
    && out.partial === 'test.zip is listed without 3 of its 5 entries: 2 entries are nested more than 128 folders deep; 1 entry has no usable name.', out.partial);
  out = await look(zipOf(['a/1.txt', 'b/2.txt', 'c/3.txt', 'top.txt'].map((name) => ({ name }))), { limits: { ...AX.LIMITS, folders: 2 } });
  check('past the folder bound, entries that need another folder are left out and counted',
    out.files === 3 && out.folders === 2 && /1 entry needs more than 2 folders/.test(out.partial), out.partial);

  // Bounds on entries, directory bytes and time.
  const ten = zipOf(Array.from({ length: 10 }, (_, i) => ({ name: `file-${i}.txt`, data: Buffer.from('x') })));
  out = await look(ten, { limits: { ...AX.LIMITS, entries: 5 } });
  check('the entry bound stops reading and names itself',
    out.read === 5 && out.declared === 10 && out.partial === 'Only part of test.zip is listed, the first 5 of 10 entries: Terrane reads at most 5 entries from one archive.', out.partial);
  out = await look(ten, { limits: { ...AX.LIMITS, directoryBytes: 200 } });
  check('the directory-size bound reads only that many bytes of directory and says so',
    out.read === 3 && /^Only part of test\.zip is listed, the first 3 of 10 entries: its directory is .* MB and Terrane reads at most the first/.test(out.partial), `${out.read}: ${out.partial}`);
  out = await look(manyZip(5000), { name: 'many.zip', limits: { ...AX.LIMITS, ms: 0 } });
  check('the time bound stops between entries and says so', out.read === 1023 && /^Only part of many\.zip is listed, the first 1,023 of 5,000 entries: reading stopped after 0 seconds\.$/.test(out.partial), out.partial);
  const placed = AX.toRecords(Array.from({ length: 3000 }, (_, i) => ({ name: `p/${i}.txt`, dir: false, size: 1, packed: 1, mtime: 0 })), { deadline: 0 });
  check('placing entries shares the deadline and reports how far it got', placed.processed === 1023 && placed.files === 1023, `${placed.processed}`);
  const ac = new AbortController();
  ac.abort();
  out = await look(ten, { signal: ac.signal });
  check('a cancelled request reads nothing', out.error === 'EABORT');

  // Damage and refusals.
  const four = zipOf(['a.txt', 'b.txt', 'c.txt', 'd.txt'].map((name) => ({ name, data: Buffer.from(name) })));
  const cdAt = four.length - 22 - 4 * (46 + 5);
  const broken = Buffer.from(four);
  broken.writeUInt32LE(0xdeadbeef, cdAt + 2 * 51);
  out = await look(broken);
  check('a directory that breaks off part way lists what came before and says the rest looks damaged',
    out.read === 2 && out.partial === 'Only part of test.zip is listed, the first 2 of 4 entries: its directory looks damaged after that point.', out.partial);
  const headless = Buffer.from(four);
  headless.writeUInt32LE(0xdeadbeef, cdAt);
  out = await look(headless);
  check('a directory that is not where the end record says is damaged (422)', out.status === 422 && /looks damaged: its directory is not where/.test(out.message), out.message);
  const hidden = Buffer.from(four);
  hidden.writeUInt32LE(0x08064b50, cdAt);
  out = await look(hidden);
  check('an encrypted directory is refused (415) naming zip', out.status === 415 && out.format === 'zip' && /directory is encrypted/.test(out.message), out.message);
  out = await look(zipOf([{ name: 'a.txt' }], { disk: 1 }));
  check('a split archive is refused (415)', out.status === 415 && /split across several files/.test(out.message), out.message);
  out = await look(zipOf([{ name: 'a.txt', data: Buffer.from('a') }], { comment: Buffer.concat([Buffer.from([0x50, 0x4b, 5, 6]), Buffer.alloc(30, 0x20)]) }));
  check('a comment holding a false end record does not mislead the reader', out.read === 1 && filesOf(out)['a.txt']?.size === 1, JSON.stringify(out));
  const stub = Buffer.alloc(64);
  stub.writeUInt32LE(0x04034b50, 0);
  out = await look(zipOf(['a.txt', 'b/c.txt'].map((name) => ({ name, data: Buffer.from('ab') })), { prefix: stub }));
  check('data before the archive shifts its offsets and the directory is still found', out.read === 2 && out.files === 2 && out.partial === null, JSON.stringify(out));
  const exeStub = Buffer.concat([Buffer.from('MZ'), Buffer.alloc(100, 0x90)]);
  out = await look(zipOf(['a.txt', 'b/c.txt'].map((name) => ({ name, data: Buffer.from('ab') })), { prefix: exeStub }), { name: 'setup.exe' });
  const sfxOk = out.format === 'zip' && out.read === 2 && out.files === 2 && out.partial === null;
  out = await look(zipOf([{ name: 'Main.class', data: Buffer.from('cafe') }], { prefix: Buffer.from('#!/bin/sh\nexec java -jar "$0" "$@"\n') }), { name: 'tool.jar' });
  check('a self-extracting stub or a launcher before the archive, first bytes no zip, is listed from the directory at its end',
    sfxOk && out.format === 'zip' && out.read === 1 && filesOf(out)['Main.class']?.size === 4, JSON.stringify(out));
  out = await look(Buffer.from('MZ and nothing like a zip after it, not even at the end.'), { name: 'plain.zip' });
  const plainRefused = out.status === 415 && out.error === 'ENOTARCHIVE' && /first bytes do not match one/.test(out.message);
  const hollow = Buffer.alloc(22);
  hollow.writeUInt32LE(0x06054b50, 0);
  out = await look(Buffer.concat([Buffer.from('MZ'), Buffer.alloc(200), hollow]), { name: 'hollow.exe' });
  check('first bytes that match nothing, and an end that holds no entry, are still refused as no archive (415)',
    plainRefused && out.status === 415 && out.error === 'ENOTARCHIVE', JSON.stringify(out));
  const sigRecord = (data) => {
    const b = Buffer.alloc(6 + data.length);
    b.writeUInt32LE(0x05054b50, 0);
    b.writeUInt16LE(data.length, 4);
    data.copy(b, 6);
    return b;
  };
  out = await look(zipOf([{ name: 'a.txt', data: Buffer.from('a') }], { cdTail: sigRecord(Buffer.alloc(0)) }));
  const sigBare = out.read === 1 && out.partial === null;
  out = await look(zipOf([{ name: 'a.txt' }, { name: 'b.txt' }], { cdTail: sigRecord(Buffer.from('sig')) }));
  const sigShort = out.read === 2 && out.partial === null;
  out = await look(zipOf([{ name: 'a.txt' }], { cdTail: Buffer.concat([sigRecord(Buffer.from('x')), Buffer.from('junk')]) }));
  check('a digital signature record closing the directory, shorter than an entry header, is accepted; one that does not reach the end is damage',
    sigBare && sigShort && out.read === 1 && /its directory looks damaged after that point/.test(out.partial), out.partial);
  out = await look(zipOf(['a', 'a/', 'a/b.txt', 'r.txt', 'r.txt', 'r (2).txt', 'notes', 'notes/'].map((name) => ({ name }))));
  const { Model: ArchModel } = await import('../web/js/model.js');
  const mdl = new ArchModel('test.zip');
  mdl.ingest(out.records, [], mdl.root);
  const dupNames = [];
  (function walk(d) {
    const seen = new Set();
    for (const ch of d.c) {
      if (seen.has(ch.n)) dupNames.push(ch.n);
      seen.add(ch.n);
      if (ch.d) walk(ch);
    }
  })(mdl.root);
  check('two entries with one name in a folder (a file and a folder "a", an entry repeated) are shown as "a (2)", counted, and stated, so a path finds one',
    dupNames.length === 0 && out.renamed === 4 && mdl.find('a') && !mdl.find('a').d && mdl.find('a (2)/b.txt') && !mdl.find('a (2)/b.txt').d && mdl.find('r.txt') && mdl.find('r (2).txt')
    && mdl.find('r (2) (2).txt') && mdl.find('notes (2)')?.d === true && out.files === 6 && out.folders === 2
    && out.partial === 'In test.zip, 4 entries have the same name as an earlier one in their folder, so they are shown with a number after the name, as in "name (2)".',
    JSON.stringify({ dupNames, renamed: out.renamed, partial: out.partial, names: mdl.root.c.map((c) => c.n) }));
  const many = AX.toRecords(Array.from({ length: 20000 }, () => ({ name: 'same.txt', dir: false, size: 1, packed: 1, mtime: 0 })));
  const last = many.records[0][5].at(-4);
  check('a name repeated 20,000 times is numbered in one pass', many.renamed === 19999 && last === 'same (20000).txt', `${many.renamed} ${last}`);
  out = await look(zipOf(['x/1.txt', 'x/1.txt', `${'d/'.repeat(129)}deep.txt`].map((name) => ({ name }))));
  check('a renamed entry beside one left out: both are said, one sentence each',
    out.partial === 'test.zip is listed without 1 of its 3 entries: 1 entry is nested more than 128 folders deep. In test.zip, 1 entry has the same name as an earlier one in its folder, so it is shown with a number after the name, as in "name (2)".', out.partial);
  out = await look(zipOf(['a.txt', 'b.txt', 'c.txt'].map((name) => ({ name })), { declared: 1 }));
  check('an end record that counts too few (a wrapped count) does not hide entries', out.read === 3 && out.declared === 3 && out.partial === null);
  const empty = Buffer.alloc(22);
  empty.writeUInt32LE(0x06054b50, 0);
  out = await look(empty);
  check('an empty zip lists nothing, without complaint', out.read === 0 && out.records.length === 1 && out.records[0][5].length === 0 && out.partial === null, JSON.stringify(out));
  out = await look(Buffer.alloc(0));
  check('an empty file is not an archive (415)', out.status === 415 && /is empty/.test(out.message));

  // Sniffing and claims.
  const head = (...bytes) => Buffer.from(bytes);
  const tarHead = Buffer.alloc(512);
  tarHead.write('ustar', 257, 'latin1');
  const sniffed = [
    [head(0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x01, 0x00), 'x.rar'], [head(0x1f, 0x8b, 8), 'x.tgz'], [head(0x1f, 0x8b, 8), 'x.gz'],
    [head(0x42, 0x5a, 0x68, 0x39), 'x.bz2'], [head(0xfd, 0x37, 0x7a, 0x58, 0x5a, 0x00), 'x.tar.xz'], [head(0x28, 0xb5, 0x2f, 0xfd), 'x.zst'],
    [head(0x4d, 0x53, 0x43, 0x46), 'x.cab'], [Buffer.from('!<arch>\n'), 'x.deb'], [tarHead, 'x.tar'], [head(0x50, 0x4b, 3, 4), 'x.docx'], [Buffer.from('hello'), 'x.zip'],
  ].map(([b, n]) => AX.sniff(b, n)?.format ?? null);
  check('the first bytes name the format, and a compressed stream named as a tar is called one',
    JSON.stringify(sniffed) === JSON.stringify(['rar', 'tar.gz', 'gzip', 'bzip2', 'tar.xz', 'zstd', 'cab', 'ar', 'tar', 'zip', null]), JSON.stringify(sniffed));
  check('a name suggests a format, compressed tars first', JSON.stringify(['a.tar.gz', 'a.TGZ', 'a.gz', 'a.jar', 'a.epub', 'a.txt'].map((n) => AX.claimed(n)?.format ?? null))
    === JSON.stringify(['tar.gz', 'tar.gz', 'gzip', 'zip', 'zip', null]));

  // The reader is not a writer.
  const src = fs.readFileSync(new URL('../server/archive.mjs', import.meta.url), 'utf8');
  const imports = [...src.matchAll(/^import .* from '([^']+)';$/gm)].map((mm) => mm[1]);
  check('the reader imports only fs, zlib and the guard\'s errors, and never writes, links, renames or removes',
    JSON.stringify(imports) === JSON.stringify(['node:fs/promises', 'node:fs', 'node:zlib', './guard.mjs'])
    && !/\b(write|append|mkdir|rename|unlink|rm|rmdir|symlink|link|copyFile|cp|truncate|chmod|utimes)(Sync)?\(/.test(src.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '')),
    imports.join(', '));
  check('the bounds are frozen at 100,000 entries, a 64 MB directory and 4 seconds', Object.isFrozen(AX.LIMITS) && AX.LIMITS.entries === 100000
    && AX.LIMITS.directoryBytes === 64 * 1024 * 1024 && AX.LIMITS.ms === 4000 && AX.FLAG_LOCKED === 8 && AX.FLAG_ESCAPE === 16);
}

console.log('\nLayout (no service)');
const { buildLayout, BOX, STYLE, MAX_BOXES } = await import(new URL('../web/js/layout.js', import.meta.url));
const { Model } = await import(new URL('../web/js/model.js', import.meta.url));
const NOW = Date.UTC(2026, 10, 11);
// The shape the old folder-entry check let through: a folder whose 14
// subfolders of 5,000 files each are entered under the budget, then 4,999
// files beside it, about 75,000 boxes from close up at a fine grain.
const overflowTree = () => {
  const m = new Model('root');
  const files = (count, prefix) => Array.from({ length: count }, (_, i) => [`${prefix}${i}.dat`, 1000, NOW - 86400000, 0]).flat();
  const recs = [[0, -1, 'root', NOW, 0, files(4999, 'r')], [1, 0, 'X', NOW, 0, []]];
  for (let k = 0; k < 14; k++) recs.push([2 + k, 1, `sub${k}`, NOW, 0, files(5000, `s${k}-`)]);
  m.ingest(recs, [], m.root);
  return m;
};
const near = { x: 0, y: 50, z: 0 };
let tree = overflowTree();
let lay = buildLayout(tree.root, { cam: near, grain: 0.0024, now: NOW });
check(`a tree that overflowed the old check fits by coarsening (${lay.n} boxes)`, lay.n <= MAX_BOXES && lay.coarsened && !lay.over, `${lay.n} boxes`);
check('every box carries an aux byte, zero when no feature marks it', lay.aux instanceof Uint8Array && lay.aux.length === lay.n && lay.aux.every((v) => v === 0));
tree = overflowTree();
lay = buildLayout(tree.root, { cam: near, grain: 1e-9, now: NOW });
check('a tree that cannot fit at any grain stops at exactly the budget and says so',
  lay.n === MAX_BOXES && lay.over && lay.index.size === lay.n && lay.geo.length === lay.n * 6 && [...lay.scree.keys()].every((i) => i < lay.n), `${lay.n} boxes, over ${lay.over}`);
const X = tree.root.c.find((c) => c.n === 'X');
const ghost = {};
lay = buildLayout(tree.root, { cam: { x: 0, y: 900, z: 1200 }, now: NOW, aliases: [[ghost, X], [X, tree.root], [{}, {}]] });
check('an index alias resolves to its key\'s box and never displaces a real key',
  lay.index.get(ghost) === lay.index.get(X) && lay.index.get(X) !== lay.index.get(tree.root) && lay.index.size === lay.n + 1);
check('box and style codes are frozen and unique, with WALL 4 and CROSSED 6 reserved',
  Object.isFrozen(BOX) && Object.isFrozen(STYLE) && BOX.WALL === 4 && STYLE.CROSSED === 6
  && new Set(Object.values(BOX)).size === Object.keys(BOX).length && new Set(Object.values(STYLE)).size === Object.keys(STYLE).length
  && !Object.values(STYLE).includes(7));
const capacity = Number(fs.readFileSync(new URL('../web/js/viewport.js', import.meta.url), 'utf8').match(/const CAPACITY = (\d+);/)?.[1]);
check(`the viewport holds more boxes (${capacity}) than a layout may (${MAX_BOXES})`, capacity >= MAX_BOXES);

console.log('\nRelation lines (no service)');
const THREE = await import(new URL('../web/vendor/three/three.module.js', import.meta.url));
const { relationVertices } = await import(new URL('../web/js/viewport.js', import.meta.url));
const REL = Number(fs.readFileSync(new URL('../web/js/viewport.js', import.meta.url), 'utf8').match(/const REL_CAPACITY = (\d+);/)?.[1]);
const relBuf = (cap = REL) => ({ pos: new Float32Array(cap * 3), col: new Float32Array(cap * 3), dist: new Float32Array(cap) });
const relRun = (sets, origin, cap = REL) => {
  const b = relBuf(cap);
  return { ...b, ...relationVertices(sets, origin, b.pos, b.col, b.dist, cap) };
};
const GARNET = 0x9b1c3a;
// Two ties from one box top, as the old setTies drew them: a 28-point
// quadratic curve built in origin-relative 32-bit vectors.
const tieLegs = [10, 5, -20, 300, 12, 40, 10, 5, -20, -150, 2, 90];
const tieOrigin = { x: 1, y: 2, z: 3 };
let rel = relRun([{ color: GARNET, dashed: false, lift: 0.3, arrows: false, segments: 28, legs: tieLegs }], tieOrigin);
const oldTies = [];
for (let o = 0; o < tieLegs.length; o += 6) {
  const a = new THREE.Vector3(tieLegs[o] - 1, tieLegs[o + 1] - 2, tieLegs[o + 2] - 3);
  const b = new THREE.Vector3(tieLegs[o + 3] - 1, tieLegs[o + 4] - 2, tieLegs[o + 5] - 3);
  const mid = new THREE.Vector3((a.x + b.x) / 2, Math.max(a.y, b.y) + a.distanceTo(b) * 0.3, (a.z + b.z) / 2);
  const curve = new THREE.QuadraticBezierCurve3(a, mid, b).getPoints(28);
  for (let k = 0; k < curve.length - 1; k++) oldTies.push(curve[k].x, curve[k].y, curve[k].z, curve[k + 1].x, curve[k + 1].y, curve[k + 1].z);
}
check('duplicate ties from the relation layer are the arcs the old ties drew, identical in 32 bits',
  rel.count * 3 === oldTies.length && oldTies.every((x, i) => Math.fround(x) === rel.pos[i]), `${rel.count} vertices`);
const garnetLinear = new THREE.Color().setHex(GARNET);
check('a solid set is breakless (-1 on every vertex) and coloured in linear garnet, as the old material',
  rel.dist.subarray(0, rel.count).every((d) => d === -1)
  && [0, 1, 2].every((c) => rel.col[c] === Math.fround([garnetLinear.r, garnetLinear.g, garnetLinear.b][c])));

// A dashed, arched route with chevrons.
const routeLegs = [0, 0, 0, 100, 0, 0, 100, 0, 0, 100, 20, 60];
rel = relRun([{ color: 0x18201e, dashed: true, lift: 0.12, arrows: true, segments: 16, legs: routeLegs }], { x: 0, y: 0, z: 0 });
const perLeg = (16 + 2) * 2;
const leg0 = rel.dist.subarray(0, perLeg);
let joined = true;
for (let k = 1; k < 16; k++) if (leg0[2 * k - 1] !== leg0[2 * k]) joined = false;
let arc = 0;
const P = (t) => {
  const u = 1 - t;
  const my = 0 + 100 * 0.12;
  return [u * u * 0 + 2 * u * t * 50 + t * t * 100, 2 * u * t * my, 0];
};
for (let k = 0, prev = P(0); k < 4096; k++) {
  const q = P((k + 1) / 4096);
  arc += Math.hypot(q[0] - prev[0], q[1] - prev[1], q[2] - prev[2]);
  prev = q;
}
check('a dashed leg measures from 0 at its first end, unbroken at every joint, to its arc length',
  rel.count === 2 * perLeg && leg0[0] === 0 && joined && Math.abs(leg0[31] - arc) / arc < 0.002, `ends at ${leg0[31]}, arc ${arc.toFixed(4)}`);
const tip = [rel.pos[32 * 3], rel.pos[32 * 3 + 1], rel.pos[32 * 3 + 2]];
const armA = [rel.pos[33 * 3], rel.pos[33 * 3 + 1], rel.pos[33 * 3 + 2]];
const armB = [rel.pos[35 * 3], rel.pos[35 * 3 + 1], rel.pos[35 * 3 + 2]];
const sameTip = [0, 1, 2].every((c) => rel.pos[34 * 3 + c] === tip[c]);
const lenA = Math.hypot(armA[0] - tip[0], armA[1] - tip[1], armA[2] - tip[2]);
const lenB = Math.hypot(armB[0] - tip[0], armB[1] - tip[1], armB[2] - tip[2]);
check('each leg carries a solid chevron at its middle, pointing from its first end to its second',
  sameTip && rel.dist.subarray(32, 36).every((d) => d === -1) && Math.abs(lenA - 6) < 1e-4 && Math.abs(lenB - 6) < 1e-4
  && Math.abs(tip[0] - 53) < 1e-4 && Math.abs(tip[1] - 6) < 1e-4 && armA[0] < tip[0] && armB[0] < tip[0] && Math.abs(armA[2] + armB[2]) < 1e-4 && armA[2] !== 0,
  `tip ${tip.map((x) => x.toFixed(3))}, arms ${lenA.toFixed(4)} ${lenB.toFixed(4)}`);

// Thirteen levels down: a leg a ten-thousandth of a unit long, far from
// the world's centre. Around a nearby origin it keeps its shape in 32 bits;
// around the world's centre it would not, which is why every layout
// writes the lines again around the new origin.
const deep = [123.456789, 7.891234, -301.234567, 123.456789 + 1e-4, 7.891234, -301.234567 + 0.5e-4];
const deepErr = (origin) => {
  const r = relRun([{ color: 0x18201e, dashed: false, lift: 0, legs: deep }], origin);
  const want = [deep[3] - deep[0], 0, deep[5] - deep[2]];
  const got = [r.pos[3] - r.pos[0], r.pos[4] - r.pos[1], r.pos[5] - r.pos[2]];
  return Math.hypot(got[0] - want[0], got[1] - want[1], got[2] - want[2]) / Math.hypot(...want);
};
const nearErr = deepErr({ x: 123.4567, y: 7.8912, z: -301.2345 });
const farErr = deepErr({ x: 0, y: 0, z: 0 });
check(`a leg 13 levels down keeps its shape around a nearby origin (error ${nearErr.toExponential(1)} of its length; ${farErr.toExponential(1)} around the centre)`,
  nearErr < 1e-5 && farErr > 1e-2);

// Room: a 1,000-leg route and 40 ties fit, the ties whole.
const many = (count, len) => {
  const out = [];
  for (let i = 0; i < count; i++) out.push(i, 0, 0, i + len, 0, len);
  return out;
};
const tiesSet = { color: GARNET, dashed: false, lift: 0.3, arrows: false, segments: 28, legs: many(40, 10) };
rel = relRun([{ color: 0x18201e, dashed: true, lift: 0.12, arrows: true, segments: 28, legs: many(1000, 50) }, tiesSet], { x: 0, y: 0, z: 0 });
const tieStart = rel.count - 40 * 56;
check(`a 1,000-leg route and 40 ties fit in ${REL.toLocaleString('en-US')} vertices, the ties whole and drawn last (${rel.count.toLocaleString('en-US')} used)`,
  rel.count <= REL && rel.legs === 1040 && rel.leftOut === 0 && rel.dist.subarray(tieStart, rel.count).every((d) => d === -1)
  && rel.col[tieStart * 3] === Math.fround(garnetLinear.r), `${rel.legs} legs, ${rel.leftOut} left out`);
rel = relRun([{ color: 0x18201e, dashed: false, lift: 0, legs: many(30000, 5) }, tiesSet], { x: 0, y: 0, z: 0 });
check('sets that cannot fit leave their last legs out, count them, and keep the small sets whole',
  rel.count <= REL && rel.leftOut > 0 && rel.legs + rel.leftOut === 30040 && rel.dist.subarray(rel.count - 40 * 56, rel.count).every((d) => d === -1),
  `${rel.legs} drawn, ${rel.leftOut} left out`);
rel = relRun([{ color: GARNET, lift: 0.3, legs: [1, 1, 1, 1, 1, 1, NaN, 0, 0, 1, 1, 1, 0, 0, 0, Infinity, 0, 0, 0, 0, 0, 3, 0, 4] }], { x: 0, y: 0, z: 0 });
check('legs of no length or with coordinates that are not numbers draw nothing', rel.legs === 1 && rel.count === 56, `${rel.legs} legs`);
check('the vendored three.js still has the dash expression the relation material replaces',
  THREE.ShaderChunk.linedashed_frag.includes('mod( vLineDistance, totalSize ) > dashSize'));

console.log('\nSearch tokens (no service)');
const { parseQuery, runSearch } = await import(new URL('../web/js/model.js', import.meta.url));
const qm = new Model('root');
qm.ingest([
  [0, -1, 'root', NOW, 0, ['Report-2026.pdf', 5000, NOW - 86400000, 0, 'notes.md', 300, NOW, 0, 'empty.txt', 0, NOW, 0]],
  [1, 0, 'Session', NOW, 0, ['a.js', 100, NOW - 1000, 0, 'b.js', 200, NOW - 500, 0]],
], [], qm.root);
const hits = (q, ext) => {
  const pred = parseQuery(q, ext);
  return pred ? runSearch(qm, pred).list.map((x) => x.n).sort() : null;
};
const plain = ['report', 'ext:js', 'is:empty', '>1kb', 'older:1h', 'kind:code', '*.md', 'foo:bar'].map((q) => JSON.stringify(hits(q)));
check('without feature tokens every query answers as before', JSON.stringify(plain)
  === JSON.stringify([['Report-2026.pdf'], ['a.js', 'b.js'], ['empty.txt'], ['Report-2026.pdf'], ['Report-2026.pdf', 'Session', 'a.js', 'b.js', 'empty.txt', 'notes.md'], ['a.js', 'b.js'], ['notes.md'], []].map((x) => JSON.stringify(x))), plain.join(' '));
{
  const lists = {
    ext: hits('ext:js,md'), dotted: hits('ext:.pdf,.md'), kinds: hits('kind:code,document'), media: hits('kind:video,audio,image'),
    unknown: hits('kind:code,nonsense'), bare: hits('ext:,'), sized: hits('kind:code,document >1kb'), one: hits('kind:doc'),
  };
  check('ext: and kind: take a comma list, any of them: ext:js,md, ext:.pdf,.md, kind:code,document',
    JSON.stringify(lists.ext) === '["a.js","b.js","notes.md"]' && JSON.stringify(lists.dotted) === '["Report-2026.pdf","notes.md"]'
    && JSON.stringify(lists.kinds) === '["Report-2026.pdf","a.js","b.js","empty.txt","notes.md"]' && JSON.stringify(lists.one) === '["Report-2026.pdf","empty.txt","notes.md"]',
    JSON.stringify(lists));
  check('a listed word that names no kind adds nothing, a list of nothing matches nothing, and a list combines with other tokens',
    JSON.stringify(lists.media) === '[]' && JSON.stringify(lists.unknown) === '["a.js","b.js"]' && JSON.stringify(lists.bare) === '[]' && JSON.stringify(lists.sized) === '["Report-2026.pdf"]',
    JSON.stringify(lists));
}
const marked = new Set();
let seenRaw = null;
const ext = {
  is: { marked: (n) => marked.has(n), dup: () => true },
  prefix: {
    within: (v, raw) => { seenRaw = raw; return (n) => n.p?.n.toLowerCase() === v; },
    ext: () => () => true,
    broken: () => 'not a function',
  },
};
marked.add(qm.find('notes.md'));
check('an is: word from the caller finds what it names, combined with built-in tokens',
  JSON.stringify(hits('is:marked', ext)) === '["notes.md"]' && JSON.stringify(hits('is:marked >1kb', ext)) === '[]');
check('a name:value token from the caller gets the value lower-cased and as typed',
  JSON.stringify(hits('within:SESSION', ext)) === '["a.js","b.js"]' && seenRaw === 'SESSION' && JSON.stringify(hits('within:session b', ext)) === '["b.js"]');
check('built-in words and prefixes cannot be replaced by the caller',
  JSON.stringify(hits('is:dup', ext)) === '[]' && JSON.stringify(hits('ext:js', ext)) === '["a.js","b.js"]');
check('a maker that returns no predicate matches nothing; unknown prefixes stay plain words',
  JSON.stringify(hits('broken:x', ext)) === '[]' && JSON.stringify(hits('nothere:x', ext)) === '[]' && hits('nothere:x', ext) !== null);
let protoErr = null;
let protoHits = null;
try {
  protoHits = [hits('is:constructor'), hits('is:__proto__'), hits('is:tostring', ext), hits('within:', ext)];
} catch (err) {
  protoErr = err.message;
}
check('is: and prefix lookups use real words only: is:constructor and is:__proto__ match nothing and do not throw',
  !protoErr && JSON.stringify(protoHits.slice(0, 3)) === '[[],[],[]]', protoErr || JSON.stringify(protoHits));
// Double quotes: whitespace splits only outside them, and they are dropped.
const qq = new Model('root');
qq.ingest([
  [0, -1, 'root', NOW, 0, ['two words.txt', 10, NOW, 0, 'two.txt', 10, NOW, 0, 'words two.md', 10, NOW, 0, 'a*b.txt', 10, NOW, 0]],
  [1, 0, 'My Folder', NOW, 0, ['inner.txt', 5, NOW, 0]],
], [], qq.root);
const qhits = (q, ext) => {
  const pred = parseQuery(q, ext);
  return pred ? JSON.stringify(runSearch(qq, pred).list.map((x) => x.n).sort()) : null;
};
check('a quoted term keeps its space: "two words" finds the one name with both words in that order, unquoted both names with both words',
  qhits('"two words"') === '["two words.txt"]' && qhits('two words') === '["two words.txt","words two.md"]', `${qhits('"two words"')} ${qhits('two words')}`);
let inSeen = null;
const inExt = { prefix: { in: (v, raw) => { inSeen = [v, raw]; return (n) => n.p?.n.toLowerCase() === v; } } };
check('a quoted prefix value reaches its maker whole, lower-cased and as typed, without the quotes',
  qhits('in:"My Folder"', inExt) === '["inner.txt"]' && JSON.stringify(inSeen) === '["my folder","My Folder"]', `${qhits('in:"My Folder"', inExt)} ${JSON.stringify(inSeen)}`);
check('a token that begins with a quote is a literal name term, never a prefix or a glob: "ext:md" finds nothing, "a*b" finds a*b.txt only',
  qhits('"ext:md"') === '[]' && qhits('"a*b"') === '["a*b.txt"]' && qhits('a*b') === '[]', `${qhits('"ext:md"')} ${qhits('"a*b"')} ${qhits('a*b')}`);
check('a quote left open runs to the end, and empty quotes add nothing',
  qhits('"two wo') === '["two words.txt"]' && qhits('two ""') === qhits('two') && qhits('""') === null, `${qhits('"two wo')} ${qhits('two ""')} ${qhits('""')}`);

console.log('\nAge table (no service)');
const { buildAgeTable, LADDER_DAYS, STEPS, BAND_STEPS, BANDS, DAY } = await import(new URL('../web/js/timeline.js', import.meta.url));
const ladderRises = LADDER_DAYS.every((d, i) => i === 0 || d > LADDER_DAYS[i - 1]);
check('the ladder has 20 steps from now back to 30 years and holds exactly 1, 7, 30, 365 and 1,095 days',
  STEPS === 20 && LADDER_DAYS[0] === 0 && LADDER_DAYS.at(-1) === 10950 && ladderRises && Object.isFrozen(LADDER_DAYS) && Object.isFrozen(BAND_STEPS)
  && BANDS === 6 && JSON.stringify(BAND_STEPS.map((k) => LADDER_DAYS[k])) === '[1,7,30,365,1095]', JSON.stringify(LADDER_DAYS));

// A random tree 13 levels deep: times over 40 years, undated files,
// files dated in the future, files exactly on a step and a millisecond
// after it, and files of no size.
const AT = Date.UTC(2026, 10, 12, 8, 0, 0);
const stepTimes = LADDER_DAYS.map((d) => AT - d * DAY);
let ageSeed = 11;
const ageRnd = () => {
  ageSeed = (ageSeed + 0x6d2b79f5) >>> 0;
  let x = ageSeed;
  x = Math.imul(x ^ (x >>> 15), x | 1);
  x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
  return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
};
const ageTime = () => {
  const r = ageRnd();
  if (r < 0.02) return 0;
  if (r < 0.03) return AT + Math.floor(ageRnd() * DAY);
  if (r < 0.08) return stepTimes[1 + Math.floor(ageRnd() * (STEPS - 1))] + (ageRnd() < 0.5 ? 0 : 1);
  return AT - Math.floor(ageRnd() ** 2.5 * 40 * 365 * DAY);
};
const am = new Model('root');
const adirs = [{ id: 0, depth: 0 }];
while (adirs.length < 2400) {
  const parent = ageRnd() < 0.3 ? adirs[adirs.length - 1 - Math.floor(ageRnd() * Math.min(adirs.length, 30))] : adirs[Math.floor(ageRnd() * adirs.length)];
  if (parent.depth < 13) adirs.push({ id: adirs.length, pid: parent.id, depth: parent.depth + 1 });
}
const afiles = adirs.map(() => []);
for (let i = 0; i < 34000; i++) {
  const at = Math.floor(ageRnd() ** 1.7 * adirs.length);
  afiles[at].push(`f${i}.dat`, ageRnd() < 0.04 ? 0 : Math.floor(Math.exp(ageRnd() * 20)), ageTime(), 0);
}
am.ingest(adirs.map((d) => [d.id, d.id ? d.pid : -1, d.id ? `d${d.id}` : 'root', AT - DAY, 0, afiles[d.id]]), [], am.root);
const allDirs = [];
(function collect(dir) { allDirs.push(dir); for (const c of dir.c) if (c.d) collect(c); }(am.root));
const shapeOf = (n) => `${Object.keys(n).join()}|${Object.getOwnPropertySymbols(n).length}`;
const shapes = allDirs.flatMap((d) => [d, ...d.c]).map(shapeOf);
const ages = buildAgeTable(am.root, AT);
const subtreeFiles = (dir) => {
  const out = [];
  (function walk(d) { for (const c of d.c) { if (c.d) walk(c); else out.push(c); } }(dir));
  return out;
};
let stepMiss = 0;
let bandMiss = 0;
let sumMiss = 0;
let defMiss = 0;
for (const dir of allDirs) {
  const fl = subtreeFiles(dir);
  const cb = new Array(STEPS).fill(0);
  const cf = new Array(STEPS).fill(0);
  const bb = new Array(6).fill(0);
  const bf = new Array(6).fill(0);
  for (const f of fl) {
    for (let k = 0; k < STEPS; k++) if (f.m > stepTimes[k]) { cb[k] += f.s; cf[k]++; }
    const days = (AT - f.m) / DAY;
    const band = !f.m ? 5 : [1, 7, 30, 365, 1095].findIndex((d) => days < d);
    bb[band < 0 ? 5 : band] += f.s;
    bf[band < 0 ? 5 : band]++;
  }
  for (let k = 0; k < STEPS; k++) if (ages.changedBytes(dir, k) !== cb[k] || ages.changedFiles(dir, k) !== cf[k]) stepMiss++;
  const b = ages.bands(dir);
  if (JSON.stringify(b.bytes) !== JSON.stringify(bb) || JSON.stringify(b.files) !== JSON.stringify(bf)) bandMiss++;
  if (b.bytes.reduce((x, y) => x + y, 0) !== dir.s || b.files.reduce((x, y) => x + y, 0) !== dir.fc) sumMiss++;
  const tb = fl.reduce((x, f) => x + f.s, 0);
  const firstAt = (w, need) => { const k = w.findIndex((v) => v >= need); return k < 0 ? STEPS - 1 : k; };
  const median = fl.length ? firstAt(tb > 0 ? cb : cf, (tb > 0 ? tb : fl.length) / 2) : -1;
  const last = fl.length ? firstAt(cf, fl.length) : -1;
  const keptOk = cb.every((c, k) => ages.kept(dir, k) === (tb > 0 ? 1 - c / tb : fl.length ? 1 - cf[k] / fl.length : dir.mm > stepTimes[k] ? 0 : 1));
  if (ages.medianStep(dir) !== median || ages.lastStep(dir) !== last || !keptOk || ages.totalBytes(dir) !== dir.s || ages.totalFiles(dir) !== dir.fc) defMiss++;
}
check(`changed bytes and files equal a brute-force walk in every folder at all 20 steps (${allDirs.length.toLocaleString('en-US')} folders, ${am.root.fc.toLocaleString('en-US')} files, built in ${ages.ms.toFixed(1)} ms)`,
  stepMiss === 0 && ages.folders === allDirs.length, `${stepMiss} mismatches`);
check('the six strata are the ladder\'s differences: each holds the files its ages put there, and they add up to dir.s and dir.fc', bandMiss === 0 && sumMiss === 0, `${bandMiss} strata, ${sumMiss} sums`);
check('kept, the median step, the last step and the totals agree with their definitions in every folder', defMiss === 0, `${defMiss} folders`);
check('nothing is written onto the model\'s nodes', allDirs.flatMap((d) => [d, ...d.c]).every((n, i) => shapeOf(n) === shapes[i]));

// The edges, one file each.
const em = new Model('root');
em.ingest([
  [0, -1, 'root', AT, 0, ['future.txt', 10, AT + 1000, 0, 'on-a-day.txt', 100, AT - DAY, 0, 'after-a-day.txt', 1000, AT - DAY + 1, 0, 'undated.txt', 10000, 0, 0, 'ancient.txt', 5, AT - 11000 * DAY, 0]],
  [1, 0, 'zeros', AT, 0, ['a', 0, AT - 2 * DAY, 0, 'b', 0, AT - 400 * DAY, 0]],
  [2, 0, 'empty', AT, 0, []],
], [], em.root);
const et = buildAgeTable(em.root, AT);
const ef = (n) => em.find(n);
const zeros = ef('zeros');
const empty = ef('empty');
check('a time exactly on a step is not after it, a millisecond later is, and undated or older files never count',
  JSON.stringify(['future.txt', 'after-a-day.txt', 'on-a-day.txt', 'undated.txt', 'ancient.txt'].map((n) => et.stepOf(ef(n).m))) === '[0,1,2,20,20]'
  && et.changedBytes(em.root, 0) === 10 && et.changedBytes(em.root, 1) === 1010 && et.changedBytes(em.root, 2) === 1110 && et.changedFiles(em.root, 2) === 4
  && JSON.stringify(et.bands(em.root)) === JSON.stringify({ bytes: [1010, 100, 0, 0, 0, 10005], files: [2, 2, 0, 0, 1, 2] })
  && et.medianStep(em.root) === STEPS - 1 && et.lastStep(em.root) === STEPS - 1);
check('files of no size are weighed by count, and a folder with no files by its own date',
  et.kept(zeros, 1) === 1 && et.kept(zeros, 2) === 0.5 && et.kept(zeros, 10) === 0 && et.medianStep(zeros) === 2 && et.lastStep(zeros) === 10
  && et.medianStep(empty) === -1 && et.lastStep(empty) === -1 && et.kept(empty, 19) === 1 && et.bands(empty).files.every((x) => x === 0));
em.ingest([[1, 0, 'late', AT - 5 * DAY, 0, ['n.txt', 77, AT - 3 * DAY, 0]]], [em.root], em.root);
const late = ef('late');
check('a folder newer than the table counts as wholly changed at its newest change; the folders it holds keep their figures until the next build',
  !et.has(late) && et.has(em.root) && LADDER_DAYS.every((_, k) => et.kept(late, k) === (late.mm > stepTimes[k] ? 0 : 1))
  && et.changedBytes(late, 1) === 0 && et.changedBytes(late, 2) === 77 && et.changedFiles(late, 2) === 1 && et.medianStep(late) === 2
  && JSON.stringify(et.bands(late).bytes) === '[0,77,0,0,0,0]' && et.totalBytes(em.root) === 11115 && em.root.s === 11192);
const file = ef('after-a-day.txt');
let refused = 0;
for (const k of [-1, 20, 1.5, NaN, '2']) {
  try {
    et.kept(em.root, k);
  } catch (err) {
    if (err instanceof RangeError) refused++;
  }
}
check('a file answers from its own date and size; steps off the ladder are refused; the table is frozen',
  et.changedBytes(file, 0) === 0 && et.changedBytes(file, 1) === 1000 && et.kept(file, 1) === 0 && et.medianStep(file) === 1 && !et.has(file)
  && JSON.stringify(et.bands(file).bytes) === '[1000,0,0,0,0,0]' && refused === 5 && Object.isFrozen(et) && Object.isFrozen(et.T) && et.T[1] === AT - DAY);

console.log('\nTime view (no service)');
const { AUX } = await import(new URL('../web/js/layout.js', import.meta.url));
const { crossedAt, fmtDay } = await import(new URL('../web/js/time.js', import.meta.url));
check('AUX names the time view\'s marks, frozen: NONE 0, SUNK 1, CROSSED 2', Object.isFrozen(AUX) && JSON.stringify(AUX) === '{"NONE":0,"SUNK":1,"CROSSED":2}');
check('dates are written MM/DD/YYYY', fmtDay(new Date(2026, 8, 28, 23, 59).getTime()) === '09/28/2026' && fmtDay(new Date(1996, 0, 2).getTime()) === '01/02/1996');
const timeEyes = [
  ['overview', { x: 0, y: 900, z: 1200 }, 0.0062],
  ['close', { x: -40, y: 25, z: 60 }, 0.0024],
  ['low', { x: 120, y: 4, z: -90 }, 0.0024],
  ['forced', { x: 0, y: 900, z: 1200 }, 1e-7, new Set(allDirs.filter((d) => { let n = 0; for (let x = d; x.p; x = x.p) n++; return n <= 4; }))],
];
const sameLayout = (a, b) => a.n === b.n && a.key.every((k, i) => k === b.key[i]) && a.geo.every((x, i) => Object.is(x, b.geo[i]))
  && a.aux.every((x, i) => x === b.aux[i]) && a.type.every((x, i) => x === b.type[i]);
let timeProblems = [];
const presentProblems = [];
let timeCounts = { crossed: 0, sunk: 0, steps: 0, boxes: 0 };
for (const [label, cam, grain, force] of timeEyes) {
  const opts = { cam, grain, now: AT, force: force || null };
  const present = buildLayout(am.root, opts);
  const again = buildLayout(am.root, { ...opts, asOf: undefined });
  const nulled = buildLayout(am.root, { ...opts, asOf: null });
  if (!sameLayout(present, again) || !sameLayout(present, nulled)) presentProblems.push(`${label}: no asOf is not the present layout`);
  if (present.aux.some((x) => x !== 0)) presentProblems.push(`${label}: the present marks boxes`);
  let prev = present;
  for (let k = 1; k < STEPS; k++) {
    const t = ages.T[k];
    const L = buildLayout(am.root, { ...opts, asOf: { t, kept: (d) => ages.kept(d, k) } });
    timeCounts.steps++;
    timeCounts.boxes += L.n;
    const bad = (why) => { if (timeProblems.length < 6) timeProblems.push(`${label} step ${k}: ${why}`); };
    if (L.n !== present.n || L.key.some((x, i) => x !== present.key[i])) { bad('box count or key order'); continue; }
    const riser = new Map();
    for (let i = 0; i < L.n; i++) if (L.type[i] === BOX.DIR) riser.set(L.node[i], L.geo[i * 6 + 4]);
    for (let i = 0; i < L.n; i++) {
      const o = i * 6;
      const node = L.node[i];
      const h = L.geo[o + 4];
      const side = Math.min(L.geo[o + 3], L.geo[o + 5]);
      if ([0, 2, 3, 5].some((q) => !Object.is(L.geo[o + q], present.geo[o + q]))) bad(`footprint of ${node.n}`);
      if (h > prev.geo[o + 4]) bad(`${node.n} rose`);
      if (Math.abs(L.geo[o + 1] - h / 2 - (present.geo[o + 1] - present.geo[o + 4] / 2)) > 1e-9 * Math.max(1, Math.abs(present.geo[o + 1]))) bad(`${node.n} left its plateau`);
      const slab = Math.min(riser.get(node.p) * 0.08, side * 0.05);
      const ax = L.aux[i];
      if (ax === AUX.CROSSED) timeCounts.crossed++;
      if (ax === AUX.SUNK) timeCounts.sunk++;
      if (L.type[i] === BOX.FILE) {
        if (node.m > t ? ax !== AUX.CROSSED || h > slab : ax !== AUX.NONE || !Object.is(h, present.geo[o + 4])) bad(`file ${node.n}`);
      } else if (L.type[i] === BOX.CAP) {
        const kept = ages.kept(node, k);
        const want = node.e ? AUX.NONE : !node.c.length ? (node.m > t ? AUX.CROSSED : AUX.NONE) : node.mm > t ? (kept > 0 ? AUX.SUNK : AUX.CROSSED) : AUX.NONE;
        if (ax !== want) bad(`mass ${node.n}: aux ${ax}, want ${want}`);
        if (want === AUX.CROSSED && h > slab) bad(`mass ${node.n} above its slab`);
        if (want === AUX.SUNK && Math.abs(h - Math.max(slab, present.geo[o + 4] * kept)) > 1e-12 * present.geo[o + 4]) bad(`mass ${node.n} not lowered to what it kept`);
        if (want === AUX.NONE && !Object.is(h, present.geo[o + 4])) bad(`unchanged mass ${node.n} moved`);
      } else if (ax !== AUX.NONE) bad(`a ${L.type[i] === BOX.DIR ? 'plateau' : 'scree tile'} is marked`);
      if ((L.type[i] === BOX.FILE || L.type[i] === BOX.CAP) && crossedAt(ages, k, node) !== (ax === AUX.CROSSED)) bad(`time.js and the layout disagree on ${node.n}`);
    }
    prev = L;
  }
}
check(`looked back to each of the 19 steps from four eyes, every layout keeps the present's boxes, keys and footprints; changed files and empty folders are crossed slabs, closed masses are lowered by what they kept, nothing rises going back, and time.js agrees (${timeCounts.boxes.toLocaleString('en-US')} boxes: ${timeCounts.crossed.toLocaleString('en-US')} crossed, ${timeCounts.sunk.toLocaleString('en-US')} lowered)`,
  timeProblems.length === 0 && timeCounts.crossed > 0 && timeCounts.sunk > 0, timeProblems.join(' | '));
check('without asOf, or with asOf null or undefined, the layout is the present one and marks nothing', presentProblems.length === 0, presentProblems.join(' | '));

console.log('\nSource (no service)');
{
  const TOOLS = path.dirname(fileURLToPath(import.meta.url));
  const WEBDIR = path.join(TOOLS, '..', 'web');
  const js = (f) => fs.readFileSync(path.join(WEBDIR, 'js', f), 'utf8');
  const mods = fs.readdirSync(path.join(WEBDIR, 'js')).filter((f) => f.endsWith('.js'));
  const writers = mods.filter((f) => js(f).includes('getMonth() + 1'));
  check(`the house date (MM/DD/YYYY) is written by one formatter, model.js's (${writers.join(', ')})`, JSON.stringify(writers) === '["model.js"]', writers.join(', '));
  // Every export of the shared modules icons.js and model.js is used,
  // by another file or by its own; a constant in capitals documents a
  // format (the scanner's flag bits) and is left out.
  const users = [...mods.map((f) => js(f)), ...fs.readdirSync(TOOLS).filter((f) => f.endsWith('.mjs')).map((f) => fs.readFileSync(path.join(TOOLS, f), 'utf8'))];
  const dead = [];
  for (const f of ['icons.js', 'model.js']) {
    const own = js(f);
    for (const [, name] of own.matchAll(/^export (?:const|function|class) (\w+)/gm)) {
      if (/^[A-Z][A-Z0-9_]*$/.test(name)) continue;
      const word = new RegExp(`\\b${name}\\b`, 'g');
      const inOwn = (own.match(word) || []).length > 1;
      if (!inOwn && !users.some((src) => src !== own && new RegExp(`\\b${name}\\b`).test(src))) dead.push(`${f} ${name}`);
    }
  }
  check('icons.js and model.js export nothing that no module or check uses', dead.length === 0, dead.join(', '));
  // What the page draws: index.html by Lucide name, and every name the
  // scripts hand to icon(), through ICON when it is one of its keys.
  const sprite = [...fs.readFileSync(path.join(WEBDIR, 'vendor', 'lucide', 'icons.svg'), 'utf8').matchAll(/<symbol id="([\w-]+)"/g)].map((m) => m[1]);
  const page = fs.readFileSync(path.join(WEBDIR, 'index.html'), 'utf8');
  const ICONMAP = Object.fromEntries([...js('icons.js').matchAll(/^ {2}(\w+): '([\w-]+)',$/gm)].map((m) => [m[1], m[2]]));
  const drawn = new Set([...page.matchAll(/icons\.svg#([\w-]+)/g)].map((m) => m[1]));
  for (const f of mods.filter((x) => x !== 'icons.js')) {
    for (const [, call] of js(f).matchAll(/icon\(([^)]*)\)|(?:icon|\w+): '[\w-]+'/g)) {
      for (const [, n] of (call ?? '').matchAll(/'([\w-]+)'/g)) drawn.add(ICONMAP[n] || n);
    }
    for (const [, n] of js(f).matchAll(/(?:icon|\w+): '([\w-]+)'/g)) drawn.add(ICONMAP[n] || n);
  }
  const idle = sprite.filter((id) => !drawn.has(id));
  check(`every one of the sprite's ${sprite.length} icons is drawn by the page`, idle.length === 0, idle.join(', '));
  const raw = [];
  for (const f of fs.readdirSync(path.join(WEBDIR, 'css', 'components'))) {
    // The loading sheet's palette is artwork, scoped to the sheet; a mask reads only alpha.
    if (f === 'splash.css') continue;
    fs.readFileSync(path.join(WEBDIR, 'css', 'components', f), 'utf8').split('\n').forEach((l, i) => {
      if (/#[0-9a-fA-F]{3,8}\b/.test(l.replace(/\/\*.*?\*\//g, '')) && !/mask-image/.test(l)) raw.push(`${f}:${i + 1}`);
    });
  }
  check('component stylesheets read their colours from tokens.css, never a raw colour', raw.length === 0, raw.join(', '));
  const utilities = fs.readFileSync(path.join(WEBDIR, 'css', 'utilities.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  check('utilities outrank components by layer, without !important', !/!important/.test(utilities));
  const launchers = ['ops.mjs', 'terrane.mjs'].filter((f) => {
    const src = fs.readFileSync(path.join(TOOLS, '..', 'server', f), 'utf8');
    // child_process's exec runs a shell; a RegExp's .exec( launches nothing.
    const imported = [...src.matchAll(/import\s*\{([^}]*)\}\s*from\s*'node:child_process'/g)].flatMap((m) => m[1].split(',').map((x) => x.trim()));
    return /(?<![.\w$])exec(?:Sync)?\(/.test(src) || /shell:\s*true/.test(src) || imported.some((x) => /^exec(?:Sync)?\b/.test(x));
  });
  check('the service never runs a shell: no exec( or shell: true in ops.mjs or terrane.mjs, and nothing but spawn from child_process',
    launchers.length === 0, launchers.join(', '));

  // A shipped header keeps three entries, and one it rolls out must reach
  // CHANGELOG.md word for word. Every entry a tracked web/ header held at
  // the last commit, or where this branch left main, and holds no longer
  // must open its CHANGELOG.md entry, whitespace aside.
  const REPO = path.join(TOOLS, '..');
  const flat = (t) => t.replace(/\s+/g, ' ').trim();
  const headerEntries = (text) => {
    const out = new Map();
    const lines = text.replace(/\r/g, '').split('\n');
    let cur = null;
    for (const l of lines.slice(lines.findIndex((x) => x.includes('✒ Changelog')) + 1)) {
      if (l.includes('✒ ')) break;
      const t = l.replace(/^\s*\*?\s?/, '').trim();
      const m = t.match(/^- (\d+\.\d+\.\d+) \(/);
      if (!t || t.startsWith('Earlier entries')) cur = null;
      else if (m) out.set(cur = m[1], t);
      else if (cur) out.set(cur, `${out.get(cur)} ${t}`);
    }
    return out;
  };
  const kept = new Map();
  let file = null;
  let cur = null;
  for (const l of fs.readFileSync(path.join(REPO, 'CHANGELOG.md'), 'utf8').replace(/\r/g, '').split('\n')) {
    const h = l.match(/^## (\S+)/);
    const m = l.match(/^- (\d+\.\d+\.\d+) \(/);
    if (h) kept.set(file = h[1], new Map());
    else if (file && m) kept.get(file).set(cur = m[1], l);
    else if (file && cur && l.trim()) kept.get(file).set(cur, `${kept.get(file).get(cur)} ${l}`);
    else cur = null;
  }
  const git = (...a) => {
    try {
      return execFileSync('git', a, { cwd: REPO, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    } catch {
      return null;
    }
  };
  const bases = [git('rev-parse', 'HEAD'), git('merge-base', 'HEAD', 'main')].map((x) => x?.trim()).filter(Boolean);
  if (bases.length) {
    const lost = [];
    let rolled = 0;
    for (const [rel, entries] of kept) {
      const now = headerEntries(fs.readFileSync(path.join(REPO, rel), 'utf8'));
      for (const base of new Set(bases)) {
        const then = git('show', `${base}:${rel}`);
        if (!then) continue;
        for (const [v, text] of headerEntries(then)) {
          if (now.has(v)) continue;
          rolled++;
          if (!flat(entries.get(v) || '').startsWith(flat(text))) lost.push(`${rel} ${v} (since ${base.slice(0, 7)})`);
        }
      }
    }
    check(`every entry a web/ header rolled out since the last commit or main (${rolled}) opens its CHANGELOG.md entry word for word`, lost.length === 0, [...new Set(lost)].join(', '));
  } else console.log('  skip  rolled-out header entries against CHANGELOG.md (no git history here)');
}

fs.rmSync(work, { recursive: true, force: true });
fs.rmSync(dataHome, { recursive: true, force: true });
console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
