#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
✒ Metadata
    - Title: Thumbnail Dataset Builder (Terrane Edition - v1.0)
    - File Name: thumbs.py
    - Relative Path: tools/thumbs.py
    - Artifact Type: CLI
    - Version: 1.0.0
    - Date: 11/11/2026
    - Update: Wednesday, November 11, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Description:
    Builds and keeps current a thumbnail dataset (thumbs.db) beside a
    Terrane structure snapshot: for every image the snapshot lists, a
    progressive ladder from average colour to a 4x4 colour grid to 160 and
    480 pixel WebP thumbnails. The interface then shows images without ever
    loading an original. Runs incrementally: only new or changed images are
    read, removed ones are dropped, and an interrupted run resumes.

✒ Key Features:
    - Driven by the structure snapshot; joins to it on the root-relative
      path (entries.path in the structure database)
    - Incremental and resumable: an image is re-read only when its size or
      modification time changed; results commit in small batches
    - Cheapest first: light SVGs, then rasters smallest to largest, so
      most of the tree is covered in the first minutes
    - Reads originals only, never writes near them; OneDrive cloud-only
      files are detected from their attributes and skipped, never
      downloaded
    - Bounded memory: images over the pixel ceiling are recorded as "huge"
      with their dimensions and left for an explicit --huge pass that runs
      one at a time with a higher ceiling
    - JPEGs decode at reduced scale in the codec (draft mode); EXIF
      orientation is applied; animated images use their first frame
    - Light SVGs (512 KB and under) are stored as their own source,
      compressed, for the browser to draw; heavy SVGs are rendered through
      Inkscape in an opt-in slow lane, up to four at a time at below-normal
      priority, with no console window
    - Vendored trees (node_modules, .venv, site-packages, .git) are left out
      unless asked for
    - The average colour is taken over the image as composited on the
      world's paper colour, so transparent artwork tints sensibly

✒ Usage Instructions:
    python tools/thumbs.py [--data <dataset folder>] [options]
    The dataset folder holds structure-*.db snapshots (see
    tools/snapshot.mjs); thumbs.db is written beside them. Without --data
    the single dataset under %LOCALAPPDATA%\\terrane\\datasets is used.

✒ Examples:
    python tools/thumbs.py
    python tools/thumbs.py --data "%LOCALAPPDATA%\\terrane\\datasets\\projects"
    python tools/thumbs.py --limit 200
    python tools/thumbs.py --huge
    python tools/thumbs.py --heavy-svg
    python tools/thumbs.py --stats

✒ Command-Line Arguments:
    Input:
        --data <folder>     Dataset folder with structure snapshots.
        --vendored          Include node_modules, .venv, site-packages, .git.
    Processing:
        --workers <n>       Raster processes (default: 6, at most CPUs - 2).
        --limit <n>         Stop after n images (for trials).
        --huge              Also process images over the normal pixel
                            ceiling, one at a time.
        --heavy-svg         Also render SVGs over 512 KB through Inkscape.
        --only <lane>       raster or svg: run one lane (for trials).
    Output:
        --stats             Print what the dataset holds and exit.

✒ Other Important Information:
    - Dependencies: Python 3.10+, Pillow (WebP support); Inkscape 1.x only
      for --heavy-svg
    - Compatible platforms: Windows (primary), macOS, Linux
    - Performance: about 11,000 rasters and 8,000 SVGs from a 35 GB image
      tree; the first pass is CPU-bound and takes tens of minutes, later
      passes take seconds
    - Security: reads files only through the paths the snapshot recorded
      under its root, and refuses any path that resolves outside it
"""

from __future__ import annotations

import argparse
import gzip
import io
import os
import re
import shutil
import sqlite3
import subprocess
import sys
import tempfile
import time
from concurrent.futures import ProcessPoolExecutor, as_completed
from pathlib import Path

RASTER = {'jpg', 'jpeg', 'png', 'webp', 'avif', 'gif', 'bmp', 'ico', 'tif', 'tiff'}
SVG = {'svg'}
VENDORED = {'node_modules', '.venv', 'venv', 'site-packages', '.git', '__pycache__', 'bower_components', '.tox'}
LADDER = (160, 480)
LIGHT_SVG = 512 * 1024
PIXELS_NORMAL = 80_000_000
PIXELS_HUGE = 600_000_000
PAPER = (250, 251, 248)
WEBP_QUALITY = 74
RECALL = 0x00400000   # FILE_ATTRIBUTE_RECALL_ON_DATA_ACCESS
OFFLINE = 0x00001000
NO_WINDOW = getattr(subprocess, 'CREATE_NO_WINDOW', 0)
# Renders yield to whatever runs in the foreground.
BACKGROUND = getattr(subprocess, 'BELOW_NORMAL_PRIORITY_CLASS', 0)
HEAVY_WORKERS = min(4, max(1, (os.cpu_count() or 4) // 4))

SCHEMA = """
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS images (
  path TEXT PRIMARY KEY,
  size INTEGER NOT NULL,
  mtime INTEGER NOT NULL,
  kind TEXT NOT NULL,
  status TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  color TEXT,
  grid BLOB,
  alpha INTEGER,
  t160 BLOB,
  t480 BLOB,
  svg BLOB,
  error TEXT,
  made_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS images_status ON images(status);
"""

BORROW_HOPS = 2   # same folder, parent or child, or a sibling folder


def tree_hops(a: str, b: str) -> int:
    """Folder moves from directory a to directory b (up then down)."""
    A, B = a.split('/') if a else [], b.split('/') if b else []
    k = 0
    while k < min(len(A), len(B)) and A[k] == B[k]:
        k += 1
    return (len(A) - k) + (len(B) - k)


def borrow_exports(db: sqlite3.Connection) -> int:
    """Gives a heavy SVG the thumbnail of its own raster export, when one
    with the same name sits within BORROW_HOPS folders (traces/x.svg and
    x.png, svg/x.svg and png/x.png). A same-named file further away is a
    different artwork, such as a generated frame around a photo, and is
    never used."""
    near: dict[str, list[str]] = {}
    for (p,) in db.execute("SELECT path FROM images WHERE kind = 'raster' AND status = 'ok'"):
        stem = p.rsplit('/', 1)[-1].rsplit('.', 1)[0].lower()
        near.setdefault(stem, []).append(p)
    lent = 0
    rows = db.execute("SELECT path FROM images WHERE kind = 'svg' AND (status = 'heavy-svg' OR via IS NOT NULL)").fetchall()
    for (svg,) in rows:
        d, name = svg.rsplit('/', 1) if '/' in svg else ('', svg)
        stem = name.rsplit('.', 1)[0].lower()
        cands = [(tree_hops(d, r.rsplit('/', 1)[0] if '/' in r else ''), r) for r in near.get(stem, [])]
        cands = [c for c in cands if c[0] <= BORROW_HOPS]
        if not cands:
            continue
        src = min(cands)[1]
        db.execute("""UPDATE images SET status = 'ok', via = ?,
                        (width, height, color, grid, alpha, t160, t480) =
                        (SELECT width, height, color, grid, alpha, t160, t480 FROM images WHERE path = ?)
                      WHERE path = ?""", (src, src, svg))
        lent += 1
    db.commit()
    return lent


def dataset_home() -> Path:
    base = os.environ.get('TERRANE_DATA')
    if base:
        return Path(base)
    if os.name == 'nt' and os.environ.get('LOCALAPPDATA'):
        return Path(os.environ['LOCALAPPDATA']) / 'terrane' / 'datasets'
    return Path.home() / '.cache' / 'terrane' / 'datasets'


def newest_snapshot(folder: Path) -> Path | None:
    snaps = sorted(folder.glob('structure-*.db'), reverse=True)
    return snaps[0] if snaps else None


# ---------------------------------------------------------------- workers

def _encode(im) -> bytes:
    buf = io.BytesIO()
    im.save(buf, 'WEBP', quality=WEBP_QUALITY, method=4)
    return buf.getvalue()


def _ladder(im) -> dict:
    """Thumbnails, colour and grid from an opened, oriented image."""
    from PIL import Image
    alpha = im.mode in ('RGBA', 'LA', 'PA') or (im.mode == 'P' and 'transparency' in im.info)
    im = im.convert('RGBA' if alpha else 'RGB')
    big = im.copy()
    big.thumbnail((LADDER[1], LADDER[1]), Image.Resampling.LANCZOS, reducing_gap=3.0)
    small = big.copy()
    small.thumbnail((LADDER[0], LADDER[0]), Image.Resampling.LANCZOS)
    flat = small
    if alpha:
        flat = Image.new('RGB', small.size, PAPER)
        flat.paste(small, mask=small.getchannel('A'))
    color = flat.resize((1, 1), Image.Resampling.BOX).getpixel((0, 0))
    grid = flat.resize((4, 4), Image.Resampling.BOX).tobytes()
    out = {
        'alpha': int(alpha), 'color': '#%02x%02x%02x' % color[:3], 'grid': grid,
        't160': _encode(small),
        # A source no larger than the small rung has nothing more to give.
        't480': _encode(big) if max(big.size) > LADDER[0] else None,
    }
    return out


def raster_job(abs_path: str, max_pixels: int) -> dict:
    from PIL import Image, ImageOps
    Image.MAX_IMAGE_PIXELS = None   # the ceiling below is ours
    try:
        with Image.open(abs_path) as im:
            w, h = im.size
            exif = im.getexif() if hasattr(im, 'getexif') else {}
            if exif and exif.get(0x0112) in (5, 6, 7, 8):
                w, h = h, w
            if w * h > max_pixels:
                return {'status': 'huge', 'width': w, 'height': h}
            if getattr(im, 'is_animated', False):
                im.seek(0)
            if im.format == 'JPEG':
                im.draft('RGB', (LADDER[1] * 2, LADDER[1] * 2))
            im = ImageOps.exif_transpose(im)
            return {'status': 'ok', 'width': w, 'height': h, **_ladder(im)}
    except Exception as err:   # one bad file never stops the run
        return {'status': 'error', 'error': f'{type(err).__name__}: {err}'[:300]}


SVG_DIMS = re.compile(rb'<svg\b[^>]*>', re.S)
ATTR = lambda name: re.compile(rb'\s' + name + rb'\s*=\s*["\']([^"\']+)["\']')
NUM = re.compile(rb'^\s*([\d.]+)')


def svg_dims(head: bytes) -> tuple[int | None, int | None]:
    m = SVG_DIMS.search(head)
    if not m:
        return None, None
    tag = m.group(0)
    vb = ATTR(rb'viewBox').search(tag)
    if vb:
        parts = re.split(rb'[\s,]+', vb.group(1).strip())
        if len(parts) == 4:
            try:
                return round(float(parts[2])), round(float(parts[3]))
            except ValueError:
                pass
    dims = []
    for name in (rb'width', rb'height'):
        a = ATTR(name).search(tag)
        n = NUM.match(a.group(1)) if a else None
        dims.append(round(float(n.group(1))) if n else None)
    return dims[0], dims[1]


def light_svg_job(abs_path: str) -> dict:
    try:
        data = Path(abs_path).read_bytes()
        w, h = svg_dims(data[:8192])
        return {'status': 'ok', 'width': w, 'height': h, 'svg': gzip.compress(data, 6)}
    except Exception as err:
        return {'status': 'error', 'error': f'{type(err).__name__}: {err}'[:300]}


def heavy_svg_job(abs_path: str, inkscape: str) -> dict:
    from PIL import Image
    tmp = Path(tempfile.mkdtemp(prefix='terrane-svg-'))
    try:
        png = tmp / 'render.png'
        subprocess.run([inkscape, abs_path, '--export-type=png', f'--export-width={LADDER[1]}',
                        f'--export-filename={png}'], capture_output=True, timeout=240, creationflags=NO_WINDOW | BACKGROUND)
        if not png.is_file() or png.stat().st_size == 0:
            return {'status': 'error', 'error': 'Inkscape produced no image'}
        with Image.open(png) as im:
            with open(abs_path, 'rb') as f:
                w, h = svg_dims(f.read(8192))
            return {'status': 'ok', 'width': w or im.size[0], 'height': h or im.size[1], **_ladder(im)}
    except subprocess.TimeoutExpired:
        return {'status': 'error', 'error': 'Inkscape timed out'}
    except Exception as err:
        return {'status': 'error', 'error': f'{type(err).__name__}: {err}'[:300]}
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


# ---------------------------------------------------------------- driver

def human(n: float) -> str:
    for unit in ('B', 'KB', 'MB', 'GB'):
        if n < 1024:
            return f'{n:,.0f} {unit}' if unit == 'B' else f'{n:,.1f} {unit}'
        n /= 1024
    return f'{n:,.1f} TB'


def find_inkscape() -> str | None:
    found = shutil.which('inkscape')
    if found:
        return found
    for p in (r'C:\Program Files\Inkscape\bin\inkscape.exe', '/Applications/Inkscape.app/Contents/MacOS/inkscape'):
        if Path(p).is_file():
            return p
    return None


def print_stats(db: sqlite3.Connection) -> None:
    rows = db.execute("""SELECT kind, status, COUNT(*), COALESCE(SUM(LENGTH(t160)),0), COALESCE(SUM(LENGTH(t480)),0),
                                COALESCE(SUM(LENGTH(svg)),0) FROM images GROUP BY kind, status ORDER BY kind, status""").fetchall()
    total = 0
    print(f"  {'kind':<8}{'status':<11}{'images':>9}{'160 px':>11}{'480 px':>11}{'svg src':>11}")
    for kind, status, n, a, b, c in rows:
        total += a + b + c
        print(f'  {kind:<8}{status:<11}{n:>9,}{human(a):>11}{human(b):>11}{human(c):>11}')
    print(f'  stored: {human(total)}')


def main() -> int:
    ap = argparse.ArgumentParser(description='Build the Terrane thumbnail dataset.')
    ap.add_argument('--data')
    ap.add_argument('--vendored', action='store_true')
    ap.add_argument('--workers', type=int, default=min(6, max(1, (os.cpu_count() or 4) - 2)))
    ap.add_argument('--limit', type=int, default=0)
    ap.add_argument('--huge', action='store_true')
    ap.add_argument('--heavy-svg', action='store_true')
    ap.add_argument('--stats', action='store_true')
    ap.add_argument('--only', choices=('raster', 'svg'))
    a = ap.parse_args()
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')

    if a.data:
        folder = Path(os.path.expandvars(a.data))
    else:
        candidates = [p for p in dataset_home().glob('*') if newest_snapshot(p)]
        if len(candidates) != 1:
            print(f'  Name the dataset with --data. Found: {", ".join(p.name for p in candidates) or "none"}', file=sys.stderr)
            return 2
        folder = candidates[0]
    snap = newest_snapshot(folder)
    if not snap:
        print(f'  No structure snapshot in {folder}. Take one with: npm run snapshot -- <directory>', file=sys.stderr)
        return 2

    db = sqlite3.connect(folder / 'thumbs.db')
    db.execute('PRAGMA journal_mode = WAL')
    db.executescript(SCHEMA)
    if 'via' not in {r[1] for r in db.execute('PRAGMA table_info(images)')}:
        db.execute('ALTER TABLE images ADD COLUMN via TEXT')
    if a.stats:
        print_stats(db)
        return 0

    src = sqlite3.connect(f'file:{snap}?mode=ro', uri=True)
    meta = dict(src.execute('SELECT key, value FROM meta').fetchall())
    root = Path(meta['root']).resolve()
    listed = []
    for rel, size, mtime, flags in src.execute('SELECT path, size, mtime, flags FROM entries'):
        if flags & 5:   # links and special files
            continue
        ext = rel.rsplit('.', 1)[-1].lower() if '.' in rel.rsplit('/', 1)[-1] else ''
        if ext not in RASTER and ext not in SVG:
            continue
        if not a.vendored and VENDORED.intersection(rel.split('/')[:-1]):
            continue
        listed.append((rel, size, 'svg' if ext in SVG else 'raster'))
    src.close()

    have = {r[0]: (r[1], r[2], r[3]) for r in db.execute('SELECT path, size, mtime, status FROM images')}
    keep = {r[0] for r in listed}
    gone = [p for p in have if p not in keep]
    db.executemany('DELETE FROM images WHERE path = ?', [(p,) for p in gone])
    db.commit()

    # Work out what needs doing, against the file as it is on disk now.
    todo = {'svg-light': [], 'raster': [], 'svg-heavy': [], 'huge': []}
    skipped_cloud = 0
    for rel, snap_size, kind in listed:
        abs_path = (root / rel).resolve()
        if root not in abs_path.parents:
            continue
        try:
            st = os.stat(abs_path)
        except OSError:
            continue
        if getattr(st, 'st_file_attributes', 0) & (RECALL | OFFLINE):
            skipped_cloud += 1
            continue
        size, mtime = st.st_size, round(st.st_mtime * 1000)
        prev = have.get(rel)
        fresh = prev and prev[0] == size and prev[1] == mtime
        if fresh and prev[2] in ('ok', 'error'):
            continue
        if fresh and prev[2] == 'huge' and not a.huge:
            continue
        if fresh and prev[2] == 'heavy-svg' and not a.heavy_svg:
            continue
        item = (rel, str(abs_path), size, mtime)
        if kind == 'svg':
            todo['svg-light' if size <= LIGHT_SVG else 'svg-heavy'].append(item)
        elif fresh and prev[2] == 'huge':
            todo['huge'].append(item)
        else:
            todo['raster'].append(item)
    todo['raster'].sort(key=lambda t: t[2])
    todo['svg-heavy'].sort(key=lambda t: t[2])

    print(f'  Snapshot  : {snap.name} ({meta["root"]})')
    print(f'  Dataset   : {folder / "thumbs.db"}')
    print(f'  Images    : {len(listed):,} listed, {len(gone):,} dropped as gone, {skipped_cloud:,} cloud-only skipped')
    huge_note = f", {len(todo['huge']):,} huge" if a.huge else ''
    heavy_note = '' if a.heavy_svg else ' (recorded; render with --heavy-svg)'
    print(f"  To do     : {len(todo['svg-light']):,} light SVG, {len(todo['raster']):,} raster{huge_note}"
          f", {len(todo['svg-heavy']):,} heavy SVG{heavy_note}")

    put = """INSERT OR REPLACE INTO images (path, size, mtime, kind, status, width, height, color, grid, alpha, t160, t480, svg, error, made_at)
             VALUES (:path, :size, :mtime, :kind, :status, :width, :height, :color, :grid, :alpha, :t160, :t480, :svg, :error, :made_at)"""
    done = 0
    written = 0
    pending = []
    t0 = time.time()
    last = 0.0
    budget = a.limit or float('inf')

    def lane(name):
        return a.only in (None, name)

    def store(item, kind, res, count=True):
        nonlocal done, written, last
        rel, _abs, size, mtime = item
        row = {'path': rel, 'size': size, 'mtime': mtime, 'kind': kind, 'status': res.get('status', 'error'),
               'width': res.get('width'), 'height': res.get('height'), 'color': res.get('color'),
               'grid': res.get('grid'), 'alpha': res.get('alpha'), 't160': res.get('t160'), 't480': res.get('t480'),
               'svg': res.get('svg'), 'error': res.get('error'), 'made_at': int(time.time() * 1000)}
        written += sum(len(row[k] or b'') for k in ('t160', 't480', 'svg'))
        pending.append(row)
        if count:
            done += 1
        if len(pending) >= 50:
            db.executemany(put, pending)
            db.commit()
            pending.clear()
        now = time.time()
        tty = sys.stdout.isatty()
        if count and now - last > (0.5 if tty else 15):
            last = now
            rate = done / max(0.001, now - t0)
            line = f'  {done:,} done · {rate:,.1f}/s · {human(written)} stored'
            sys.stdout.write(f'\r{line}   ' if tty else f'{line}\n')
            sys.stdout.flush()

    def flush():
        if pending:
            db.executemany(put, pending)
            db.commit()
            pending.clear()

    try:
        for item in todo['svg-light'] if lane('svg') else []:
            if done >= budget:
                break
            store(item, 'svg', light_svg_job(item[1]))
        # Heavy SVGs are recorded so the interface knows they exist, without
        # opening them: on Windows every open of a large file is scanned in
        # full by the antivirus, which made even an 8 KB header read cost
        # seconds apiece.
        if not a.heavy_svg and lane('svg'):
            for item in todo['svg-heavy']:
                store(item, 'svg', {'status': 'heavy-svg'}, count=False)
        rasters = (todo['raster'][: max(0, a.limit - done)] if a.limit else todo['raster']) if lane('raster') else []
        with ProcessPoolExecutor(max_workers=a.workers) as pool:
            futures = {pool.submit(raster_job, it[1], PIXELS_NORMAL): it for it in rasters}
            for fut in as_completed(futures):
                store(futures[fut], 'raster', fut.result())
        if a.huge:
            for item in todo['huge']:
                if done >= budget:
                    break
                store(item, 'raster', raster_job(item[1], PIXELS_HUGE))
        flush()
        lent = borrow_exports(db)
        if lent:
            print(f'\n  {lent:,} heavy SVGs use the thumbnail of their own raster export')
        if a.heavy_svg:
            todo['svg-heavy'] = [it for it in todo['svg-heavy']
                                 if db.execute('SELECT via FROM images WHERE path = ?', (it[0],)).fetchone() in (None, (None,))]
            ink = find_inkscape()
            if not ink:
                print('\n  Inkscape not found; heavy SVGs stay recorded without thumbnails.')
            else:
                with ProcessPoolExecutor(max_workers=HEAVY_WORKERS) as pool:
                    futures = {pool.submit(heavy_svg_job, it[1], ink): it for it in todo['svg-heavy'][: int(min(len(todo['svg-heavy']), budget - done))]}
                    for fut in as_completed(futures):
                        store(futures[fut], 'svg', fut.result())
    except KeyboardInterrupt:
        flush()
        print(f'\n  Stopped after {done:,}. Run again to continue where it left off.')
        return 130
    flush()
    db.execute("INSERT OR REPLACE INTO meta (key, value) VALUES ('snapshot', ?), ('root', ?), ('updatedAt', ?)",
               (snap.name, meta['root'], str(int(time.time() * 1000))))
    db.commit()
    elapsed = time.time() - t0
    print(f'\r  {done:,} images in {elapsed:,.0f} s · {human(written)} stored' + ' ' * 20)
    print_stats(db)
    db.close()
    return 0


if __name__ == '__main__':
    sys.exit(main())
