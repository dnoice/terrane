#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
✒ Metadata
    - Title: Terrane Mark Builder (Terrane Edition - v1.1)
    - File Name: build_terrane_mark.py
    - Relative Path: tools/build_terrane_mark.py
    - Artifact Type: python
    - Version: 1.1.0
    - Date: 11/12/2026
    - Update: Thursday, November 12, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 1.1.0 (11/12/2026) [dendogg + Anthropic - Claude Opus 5.5] — Reads
      the framed wordmark (TERRANE-wordmark-framed.svg) that Dennis set
      the style for in TER.svg: per letter a shadow, a face and its frame
      strips with their paints, plus the wordmark's gradients and blur.
      Artifact Type corrected from CLI to python.
    - 1.0.0 (11/12/2026) [dendogg + Anthropic - Claude Opus 5.5] —
      Initial release: the finished T, its cell grid, the solid wordmark
      and the 230 T-madness pieces.

✒ Description:
    Reads Dennis's three source drawings and writes web/js/terrane-mark.js,
    the one module the splash sheet and the T-madness animations draw
    from. The drawings stay the source of truth: change one in Inkscape,
    run this, and both animations follow.

✒ Key Features:
    - Finished T (T-for-animation-sequences-only.svg, the left T): face,
      the eight edge strips with their inlay pills, and the four
      gradients, taken by Dennis's element ids and kept verbatim
    - Cell grid: the nine crossbar columns and six stem rows, read from
      the invisible construction lines inside the finished T
    - Wordmark (TERRANE-wordmark-framed.svg, built by
      tools/build_terrane_wordmark.py): for each letter-N-x group its
      shadow, face and frame strips, each strip's paint as a palette
      variable or one of the wordmark's gradients, the gradients with
      their stops as palette variables, the face colour and the shadow
      blur
    - T-madness (T-madness-just-for-fun.svg): all 230 pieces moved onto
      the finished T's frame and classified for animation:
        ring   depth band inside the silhouette, 0 to 6 (outer frame,
               inlay, inner frame, then face rings A to D at the ridge)
        edge   for rings 0 to 2, the outline strip it belongs to, so it
               takes that strip's colour
        t      position clockwise around the T from the top-left, 0 to 1
        cx, cy centre of the piece, for radial and burst effects
    - Face or outline is read from the finished T: a piece inside its
      face takes a face ring (3 to 6), any other an outline ring (0 to
      2), and depth picks the ring within that side; depth alone would
      put the two inner-corner pieces in the face
    - Self-checks before writing: 230 pieces, every ring populated, no
      piece straddling the face edge, every outline piece matched to a
      strip, the pieces tile the finished T's silhouette to within 0.5%
      of its area

✒ Usage Instructions:
    Run from the project root after changing any of the three drawings;
    the defaults point at where they live in the repository:
        $ npm run mark
        $ python tools/build_terrane_mark.py
    Requires shapely and svgelements (uv installs them from the inline
    script metadata: uv run tools/build_terrane_mark.py). The generated
    module is committed, so the page itself still has no build step.

✒ Examples:
    $ python tools/build_terrane_mark.py
    $ python tools/build_terrane_mark.py --out web/js/terrane-mark.js
    $ uv run tools/build_terrane_mark.py --madness web/assets/temp/T-madness-just-for-fun.svg

✒ Command-Line Arguments:
    Sources:
        --finished PATH   Finished-T drawing (default:
                          web/assets/temp/T-for-animation-sequences-only.svg)
        --madness PATH    T-madness drawing (default:
                          web/assets/temp/T-madness-just-for-fun.svg)
        --wordmark PATH   Framed wordmark (default:
                          web/assets/logos/TERRANE-wordmark-framed.svg)

    Output:
        --out PATH        Module to write (default: web/js/terrane-mark.js)

✒ Other Important Information:
    - Dependencies:
        Required: shapely >= 2.0, svgelements >= 1.9
        Standard library: argparse, json, math, re, pathlib,
        xml.etree.ElementTree
    - Compatible platforms: Linux, Windows, macOS (Python 3.10+)
    - The generated module carries its own ✒ header and says it is
      generated; edit the drawings or this tool, never the module
---------
"""
# /// script
# requires-python = ">=3.10"
# dependencies = ["shapely>=2.0", "svgelements>=1.9"]
# ///

from __future__ import annotations

import argparse
import json
import math
import re
import xml.etree.ElementTree as ET
from pathlib import Path as FsPath

from shapely.geometry import Point, Polygon
from shapely.ops import unary_union
from svgelements import Arc, CubicBezier, Line, Matrix, Move, Path, QuadraticBezier

SVG_NS = '{http://www.w3.org/2000/svg}'
XLINK = '{http://www.w3.org/1999/xlink}href'

# The finished T's frame: its layer translate puts the outer bounds at 0,0.
LAYER_DX, LAYER_DY = 32.899379, -153.51176
VIEW_W, VIEW_H = 404.356, 367.266
# The T-madness T is the template's right-hand T; this moves it onto the
# finished T's frame (outer left edge 381.02054, top 153.51176 in its layer).
MADNESS_DX, MADNESS_DY = -381.02054, -153.51176

# Dennis's ids for the finished T, clockwise from the top.
EDGE_IDS = [
    ('top', 'rect3', 'path71', 'right', 385.707),
    ('right-cap', 'rect6', 'path64', 'down', 85.262),
    ('underside-right', 'rect1', 'path69', 'left', 150.219),
    ('stem-right', 'rect9', 'path67', 'down', 263.356),
    ('bottom', 'rect2', 'path70', 'left', 85.266),
    ('stem-left', 'rect8', 'path66', 'up', 263.356),
    ('underside-left', 'rect11', 'path68', 'left', 150.222),
    ('left-cap', 'rect7', 'path65', 'up', 85.262),
]
PALETTE = {'#d3b981': '--t-tan', '#9d621e': '--t-brown',
           '#78b2cd': '--t-light-blue', '#34749a': '--t-dark-blue'}

# Ring boundaries: depth inside the silhouette (outline 18.647 = frame
# 3.633 + inlay 11.383 + frame 3.633; face rings 9.66, 9.67, 9.67, 4.30).
RING_EDGES = [3.633, 15.016, 18.647, 28.31, 37.98, 47.65]

WORDMARK_IDS = ['letter-1-t', 'letter-2-e', 'letter-3-r', 'letter-4-r', 'letter-5-a',
                'letter-6-n', 'letter-7-e']
SVG_NS = '{http://www.w3.org/2000/svg}'


def num(d: str, places: int = 3) -> str:
    """Round every decimal in a path string."""
    def r(m):
        s = f'{float(m.group()):.{places}f}'.rstrip('0').rstrip('.')
        return '0' if s in ('-0', '') else s
    return re.sub(r'-?\d*\.\d+(?:e-?\d+)?', r, d)


def polygon_of(d: str, matrix: Matrix | None = None) -> Polygon:
    """Sample a path (lines exact, curves at 16 steps) into a polygon."""
    path = Path(d)
    if matrix is not None:
        path = path * matrix
    path.reify()            # apply the transform to the segments themselves
    rings, current = [], []
    for seg in path:
        if isinstance(seg, Move):
            if len(current) > 2:
                rings.append(current)
            current = [(seg.end.x, seg.end.y)]
        elif isinstance(seg, Line):
            current.append((seg.end.x, seg.end.y))
        elif isinstance(seg, (Arc, CubicBezier, QuadraticBezier)):
            for k in range(1, 17):
                p = seg.point(k / 16)
                current.append((p.x, p.y))
        else:  # Close
            if seg.end is not None:
                current.append((seg.end.x, seg.end.y))
    if len(current) > 2:
        rings.append(current)
    polys = [Polygon(r).buffer(0) for r in rings]
    # evenodd: holes are rings inside the first
    shape = polys[0]
    for p in polys[1:]:
        shape = shape.symmetric_difference(p)
    return shape


def by_id(root):
    return {e.get('id'): e for e in root.iter() if e.get('id')}


def style_fill(el) -> str:
    m = re.search(r'fill:([^;]+)', el.get('style', ''))
    return m.group(1).strip() if m else ''


def read_finished(path: FsPath):
    root = ET.parse(path).getroot()
    ids = by_id(root)
    face = ids['path369'].get('d')
    edges, gradients = [], {}
    for name, strip_id, pill_id, reveal, length in EDGE_IDS:
        fill = style_fill(ids[strip_id])
        if fill.startswith('url('):
            gid = fill[5:-1]
            g = ids[gid]
            swatch = ids[g.get(XLINK)[1:]]
            stops = [re.search(r'stop-color:([^;]+)', s.get('style')).group(1)
                     for s in swatch.iter(SVG_NS + 'stop')]
            gradients[name] = {
                'stops': [PALETTE[s.lower()] for s in stops],
                'x1': float(g.get('x1')), 'y1': float(g.get('y1')),
                'x2': float(g.get('x2')), 'y2': float(g.get('y2')),
                'gt': g.get('gradientTransform'),
            }
            paint = f'url(#{{prefix}}-grad-{name})'
        else:
            paint = f'var({PALETTE[fill.lower()]})'
        edges.append({'id': name, 'paint': paint, 'reveal': reveal, 'len': length,
                      'strip': ids[strip_id].get('d'), 'pill': ids[pill_id].get('d')})
    return face, edges, gradients


def style_value(el, prop: str) -> str:
    m = re.search(rf'{prop}:([^;]+)', el.get('style', ''))
    return m.group(1).strip() if m else (el.get(prop) or '')


def read_wordmark(path: FsPath):
    root = ET.parse(path).getroot()
    ids = by_id(root)
    grads = {}
    for lg in root.iter(SVG_NS + 'linearGradient'):
        stops = [style_value(st, 'stop-color').lower() for st in lg.findall(SVG_NS + 'stop')]
        assert all(c in PALETTE for c in stops), f'{lg.get("id")}: a stop outside the T palette'
        grads[lg.get('id')] = {**{k: round(float(lg.get(k)), 3) for k in ('x1', 'y1', 'x2', 'y2')},
                               'stops': [PALETTE[c] for c in stops]}
    blur = float(next(root.iter(SVG_NS + 'feGaussianBlur')).get('stdDeviation'))
    letters = []
    face_colour = None
    for lid in WORDMARK_IDS:
        face = ids[f'{lid}-face']
        face_colour = face_colour or style_fill(face).lower()
        strips = []
        x0, x1 = math.inf, -math.inf
        for el in ids[f'{lid}-frame']:
            fill = style_fill(el)
            m = re.match(r'url\(#(.+)\)', fill)
            if m:
                assert m.group(1) in grads, f'{el.get("id")}: unknown gradient'
                paint = {'grad': m.group(1)}
            else:
                assert fill.lower() in PALETTE, f'{el.get("id")}: fill {fill} outside the T palette'
                paint = {'var': PALETTE[fill.lower()]}
            d = el.get('d')
            bx0, _, bx1, _ = Path(d).bbox()
            x0, x1 = min(x0, bx0), max(x1, bx1)
            strips.append({'d': num(d), **paint})
        letters.append({'id': lid, 'ch': lid[-1].upper(), 'x0': round(x0, 3), 'x1': round(x1, 3),
                        'shadow': num(ids[f'{lid}-shadow'].get('d'), 2), 'face': num(face.get('d')),
                        'strips': strips})
    vb = [float(v) for v in root.get('viewBox').split()]
    return {'width': round(vb[2], 3), 'height': round(vb[3], 3), 'face': face_colour,
            'blur': round(blur, 3), 'gradients': grads, 'letters': letters}


def read_madness(path: FsPath, edges, face_d: str):
    root = ET.parse(path).getroot()
    move = Matrix(f'translate({MADNESS_DX},{MADNESS_DY})')
    pieces = []
    for el in root.iter(SVG_NS + 'path'):
        d = el.get('d')
        if not d:
            continue
        moved = Path(d) * move
        moved.reify()
        pieces.append({'d': moved.d(), 'shape': polygon_of(d, move)})
    silhouette = unary_union([p['shape'].buffer(0.05) for p in pieces]).buffer(-0.05)
    if silhouette.geom_type != 'Polygon':
        silhouette = max(silhouette.geoms, key=lambda g: g.area)
    layer = Matrix(f'translate({LAYER_DX},{LAYER_DY})')
    strips = {e['id']: polygon_of(e['strip'], layer) for e in edges}
    face = polygon_of(face_d, layer)
    ring_line = silhouette.exterior

    # clockwise from the top-left corner: decide direction on the top edge
    def proj(x, y):
        return ring_line.project(Point(x, y), normalized=True)
    t_ref = proj(10, 0.2)
    direction = 1 if (proj(200, 0.2) - t_ref) % 1 < 0.5 else -1

    out = []
    for p in pieces:
        shape = p['shape']
        c = shape.centroid
        probe = c if shape.contains(c) else shape.representative_point()
        depth = ring_line.distance(probe)
        # Face or outline is decided by the finished T itself: depth alone
        # misreads the pieces at the two inner corners, whose probe points
        # sit more than an outline's width from the reflex corner. Depth
        # then picks the ring within the side the piece is on.
        inside = shape.intersection(face).area / shape.area
        assert inside > 0.95 or inside < 0.05, f'a piece straddles the face edge ({inside:.0%} inside)'
        ring = sum(depth > edge for edge in RING_EDGES)
        ring = max(ring, 3) if inside > 0.5 else min(ring, 2)
        edge = None
        if ring <= 2:
            hits = [k for k, s in strips.items() if s.buffer(0.3).contains(probe)]
            edge = hits[0] if hits else min(strips, key=lambda k: strips[k].distance(probe))
            near = strips[edge].distance(probe)
            assert near < 2, f'outline piece {near:.1f} units from any strip: frames disagree'
        t = ((ring_line.project(probe, normalized=True) - t_ref) * direction) % 1
        out.append({'d': num(p['d']), 'ring': ring, 'edge': edge, 't': round(t, 4),
                    'cx': round(c.x, 2), 'cy': round(c.y, 2), 'area': shape.area})
    covered = unary_union([p['shape'] for p in pieces]).area
    return out, silhouette.area, covered


HEADER = '''/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Terrane Mark Data (Terrane Edition - v1.1)
 *     - File Name: terrane-mark.js
 *     - Relative Path: web/js/terrane-mark.js
 *     - Artifact Type: javascript
 *     - Version: 1.1.0
 *     - Date: 11/12/2026
 *     - Update: Thursday, November 12, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Changelog:
 *     - 1.1.0 (11/12/2026) [dendogg + Anthropic - Claude Opus 5.5] — The
 *       wordmark is the framed TERRANE in the style Dennis set in TER.svg:
 *       shadow, face and coloured frame strips per letter, with gradients.
 *     - 1.0.0 (11/12/2026) [dendogg + Anthropic - Claude Opus 5.5] —
 *       Initial release.
 *
 * ✒ Description:
 *     GENERATED by tools/build_terrane_mark.py from Dennis's drawings; do
 *     not edit by hand. Holds the finished T, its cell grid, the framed
 *     wordmark and the 230 T-madness pieces, so the splash sheet and the
 *     T-madness animations draw from one copy of the artwork.
 *
 * ✒ Key Features:
 *     - T: the finished T path for path (face, eight strips, eight inlay
 *       pills, four gradients) in Dennis's layer coordinates, plus the
 *       translate that puts its outer bounds at 0,0 to 404.356,367.266
 *     - GRID: crossbar column lines, junction and stem row lines
 *     - WORDMARK: seven letters, each a shadow, a face and frame strips
 *       (paint: a palette variable or a gradient id), with the gradients,
 *       the face colour, the shadow blur and each letter's extent
 *     - MADNESS: one entry per piece, [d, ring, edge, t, cx, cy], already
 *       on the finished T's frame; ring 0 to 6 from the outer frame to
 *       the ridge, edge only for the outline rings
 *     - EDGE_IDS and RING_NAMES name the vocabulary both animations use
 *     - addGradients() writes the T's four gradients into an SVG <defs>;
 *       addWordmarkGradients() and wordmarkPaint() do the same for the
 *       wordmark
 *
 * ✒ Other Important Information:
 *     - Dependencies: none
 *     - Compatible platforms: any ES2020 module host
 *     - Sources: web/assets/temp/T-for-animation-sequences-only.svg (the
 *       finished T, left), web/assets/logos/TERRANE-wordmark-framed.svg and
 *       web/assets/temp/T-madness-just-for-fun.svg
 *     - Regenerate with npm run mark (tools/build_terrane_mark.py)
 * ----------------------------------------------------------------------------
 */
'''

FOOTER = '''
const SVG_NS = 'http://www.w3.org/2000/svg';

/** Write the T's four gradients into `defs` as `${prefix}-grad-${edge}`.
 *  `offset` moves them from the layer frame to the caller's frame:
 *  pass true when the artwork is drawn without the layer translate. */
export function addGradients(defs, prefix, offset = false) {
  for (const [id, g] of Object.entries(T.gradients)) {
    const lg = document.createElementNS(SVG_NS, 'linearGradient');
    lg.setAttribute('id', `${prefix}-grad-${id}`);
    for (const k of ['x1', 'y1', 'x2', 'y2']) lg.setAttribute(k, String(g[k]));
    lg.setAttribute('gradientUnits', 'userSpaceOnUse');
    lg.setAttribute('gradientTransform', offset ? `${T.layer} ${g.gt}` : g.gt);
    g.stops.forEach((v, i) => {
      const s = document.createElementNS(SVG_NS, 'stop');
      s.setAttribute('offset', String(i));
      s.style.setProperty('stop-color', `var(${v})`);
      lg.append(s);
    });
    defs.append(lg);
  }
}

/** An edge's paint for a given gradient prefix. */
export const edgePaint = (edge, prefix) => edge.paint.replace('{prefix}', prefix);

/** Write the wordmark's gradients into `defs` as `${prefix}-${id}`. */
export function addWordmarkGradients(defs, prefix) {
  for (const [id, g] of Object.entries(WORDMARK.gradients)) {
    const lg = document.createElementNS(SVG_NS, 'linearGradient');
    lg.setAttribute('id', `${prefix}-${id}`);
    lg.setAttribute('gradientUnits', 'userSpaceOnUse');
    for (const k of ['x1', 'y1', 'x2', 'y2']) lg.setAttribute(k, String(g[k]));
    g.stops.forEach((v, i) => {
      const s = document.createElementNS(SVG_NS, 'stop');
      s.setAttribute('offset', String(i));
      s.style.setProperty('stop-color', `var(${v})`);
      lg.append(s);
    });
    defs.append(lg);
  }
}

/** A wordmark strip's paint for a given gradient prefix. */
export const wordmarkPaint = (strip, prefix) => (strip.grad ? `url(#${prefix}-${strip.grad})` : `var(${strip.var})`);
'''


def main():
    ap = argparse.ArgumentParser(description='Build web/js/terrane-mark.js')
    ap.add_argument('--finished', type=FsPath, default=FsPath('web/assets/temp/T-for-animation-sequences-only.svg'))
    ap.add_argument('--madness', type=FsPath, default=FsPath('web/assets/temp/T-madness-just-for-fun.svg'))
    ap.add_argument('--wordmark', type=FsPath, default=FsPath('web/assets/logos/TERRANE-wordmark-framed.svg'))
    ap.add_argument('--out', type=FsPath, default=FsPath('web/js/terrane-mark.js'))
    args = ap.parse_args()

    face, edges, gradients = read_finished(args.finished)
    wordmark = read_wordmark(args.wordmark)
    pieces, sil_area, covered = read_madness(args.madness, edges, face)

    # self-checks
    assert len(pieces) == 230, f'expected 230 T-madness pieces, found {len(pieces)}'
    rings = {r: sum(p['ring'] == r for p in pieces) for r in range(7)}
    assert all(rings.values()), f'empty ring: {rings}'
    assert all(p['edge'] for p in pieces if p['ring'] <= 2), 'unmatched outline piece'
    assert abs(covered - sil_area) / sil_area < 0.005, f'pieces cover {covered:.0f} of {sil_area:.0f}'

    grid = {
        'cols': [18.646881, 59.431565, 100.216249, 141.000929, 181.785619, 222.570299,
                 263.354989, 304.139669, 344.924349, 385.709039],
        'junction': 103.91111,
        'rows': [103.91111, 144.695573, 185.48025, 226.26493, 267.049616, 307.834296, 348.618972],
        'faceTop': 18.64648, 'faceBottom': 85.2645,
        'stemX': [150.2224, 254.1333], 'stemFaceX': [168.86942, 235.48645],
    }
    t = {'view': [VIEW_W, VIEW_H], 'layer': f'translate({LAYER_DX},{LAYER_DY})',
         'face': face, 'edges': edges, 'gradients': gradients,
         'channel': 'M 9.3236,9.3235 H 395.0306 V 94.5857 H 244.8116 V 357.9419 H 159.5459 V 94.5857 H 9.3236 Z',
         'channelLength': round(sum(e['len'] for e in edges), 3)}
    madness = [[p['d'], p['ring'], p['edge'], p['t'], p['cx'], p['cy']] for p in pieces]

    js = [HEADER,
          'export const EDGE_IDS = ' + json.dumps([e['id'] for e in edges]) + ';\n',
          "export const RING_NAMES = ['outer frame', 'inlay', 'inner frame', 'ring A', 'ring B', 'ring C', 'ridge'];\n",
          'export const T = ' + json.dumps(t, indent=2) + ';\n',
          'export const GRID = ' + json.dumps(grid) + ';\n',
          'export const WORDMARK = ' + json.dumps(wordmark, indent=2) + ';\n',
          '// [d, ring, edge, t, cx, cy]\nexport const MADNESS = [\n' +
          ',\n'.join('  ' + json.dumps(m, separators=(',', ':')) for m in madness) + '\n];\n',
          FOOTER]
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(''.join(js), encoding='utf-8')
    print(f'wrote {args.out}: {len(pieces)} pieces, rings {rings}, '
          f'coverage {covered / sil_area:.4f}, wordmark {len(wordmark["letters"])} letters')


if __name__ == '__main__':
    main()
