#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
✒ Metadata
    - Title: Terrane Framed Wordmark Builder (Terrane Edition - v1.0)
    - File Name: build_terrane_wordmark.py
    - Relative Path: tools/build_terrane_wordmark.py
    - Artifact Type: python
    - Version: 1.0.0
    - Date: 11/12/2026
    - Update: Thursday, November 12, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 1.0.0 (11/12/2026) [dendogg + Anthropic - Claude Opus 5.5] — Builds
      the framed TERRANE wordmark from Dennis's TER.svg (his T, E and R in
      the framed style) and his N from R-N.svg, with a drafted A, at his
      direction to finish all of TERRANE in that style with near-white
      faces.

✒ Description:
    Writes web/assets/logos/TERRANE-wordmark-framed.svg: every letter is
    a near-white face inside a frame of colour strips, over a soft shadow,
    the way Dennis drew the T in TER.svg. His T, E and R keep their own
    geometry and positions; their strips are coloured by one rule (below)
    read off his T. His N from R-N.svg is scaled to the same cap height
    and framed by the same construction; the A is drafted in the language
    of his R. The second R and E are copies.

✒ Key Features:
    - The colour rule, read off Dennis's T, which it reproduces exactly:
        Vertical strips carry the colour. A strip on a left-facing side
        is warm, a right-facing one cool. It is light (tan, light blue)
        when its top meets an up-facing edge, and dark (brown, dark blue)
        when it hangs under a down-facing one, the way the T's stem sides
        hang under the crossbar. Stacked verticals take the colour of the
        top one.
        Horizontal strips blend between the two verticals they join: a
        run of horizontal-class edges gets one linear gradient from the
        colour of the vertical before it to the colour of the vertical
        after it, along the chord between the run's outer corners.
        An edge is horizontal-class when it runs more across than down
        (the chamfers and both diagonals of the N count as horizontal).
    - Frame construction for the new letters (N, A), matching how Dennis
      cut his: the strips are 18.5 units wide (his 5.5155 at his scale).
      At each corner the more horizontal strip owns the corner square:
      at an outer corner it is cut square through the mitre point, at an
      inner corner it runs to the other strip's body line (square through
      the vertex when the corner is square); the other strip takes what
      is left. Where a notch is narrower than two strips, the more
      horizontal strip keeps the overlap. Counters (R, A) are not framed,
      as in his R.
    - Faces are near-white #f1f4f0 (his T face) on every letter
    - Shadows: each letter's silhouette (face and frame, counters left
      open) in black, blurred with Dennis's T shadow: stdDeviation 17.29
      in document units and his filter region
    - Self-checks: every generated frame tiles its band (mitre offset of
      the body less the body) within 0.1% with no overlaps, and every one
      of his pieces is matched to a body edge
    - Output to the SVG house standard: one flat drawing (no Inkscape
      layers), stock namedview, RDF/Dublin Core, and grouped, labelled
      elements: wordmark-framed > letter-N-x > shadow, face, frame >
      strips named for their side (letter-1-t-frame-underside-left)

✒ Usage Instructions:
    Run from the project root after changing TER.svg or R-N.svg:
        $ python tools/build_terrane_wordmark.py
        $ uv run tools/build_terrane_wordmark.py
    Then run npm run mark, which reads the framed wordmark for the
    loading sheet.

✒ Command-Line Arguments:
    Sources:
        --ter PATH    Dennis's framed T, E, R (default:
                      web/assets/temp/TER.svg)
        --rn PATH     Dennis's R and N (default: web/assets/temp/R-N.svg)
    Output:
        --out PATH    Default: web/assets/logos/TERRANE-wordmark-framed.svg

✒ Other Important Information:
    - Dependencies:
        Required: shapely >= 2.0, svgelements >= 1.9
        Standard library: argparse, math, datetime, pathlib
    - Compatible platforms: Linux, Windows, macOS (Python 3.10+)
    - The A is a draft; T, E, R and N are Dennis's drawings
---------
"""
# /// script
# requires-python = ">=3.10"
# dependencies = ["shapely>=2.0", "svgelements>=1.9"]
# ///

from __future__ import annotations

import argparse
import math
from pathlib import Path as FsPath

from shapely.geometry import LineString, Point, Polygon
from shapely.ops import unary_union
from svgelements import SVG, Close, Line, Matrix, Move, Path, Shape

# ── palette (Dennis's four pigments and the face) ──────────────────────────
TAN, BROWN, LB, DB = '#d3b981', '#9d621e', '#78b2cd', '#34749a'
FACE = '#f1f4f0'
SHADOW = '#000000'
PIGMENT_VAR = {TAN: '--t-tan', BROWN: '--t-brown', LB: '--t-light-blue', DB: '--t-dark-blue'}

# ── geometry of TER.svg in document units ──────────────────────────────────
FRAME = 18.4999                      # 5.5155 at his 3.3542 scale
CAP_TOP, CAP_BOTTOM = 59.99, 379.90  # body top and baseline of his letters
BLUR = 0.71313018 * 7.2269074 * 3.3541909   # his T shadow, in document units
GAP = 80.0                           # frame-to-frame gap after his R

# His pieces, by id, with the name each strip takes in the wordmark.
T_IDS = {'face': 'rect5', 'strips': {
    'rect3': 'top', 'rect6': 'right-cap', 'rect1': 'underside-right', 'rect9': 'stem-right',
    'rect2': 'bottom', 'rect8': 'stem-left', 'rect11': 'underside-left', 'rect7': 'left-cap'}}
E_IDS = {'face': 'path127', 'strips': {
    'path119': 'top', 'path120': 'top-arm-end', 'path121': 'top-arm-underside',
    'path130': 'spine-upper', 'path122': 'middle-arm-top', 'path123': 'middle-arm-end',
    'path124': 'middle-arm-underside', 'path131': 'spine-lower', 'path125': 'bottom-arm-top',
    'path126': 'bottom-arm-end', 'path129': 'bottom', 'path128': 'left'}}
R_IDS = {'face': 'path216', 'strips': {
    'path225': 'top', 'path226': 'chamfer', 'path227': 'bowl-upper', 'path217': 'bowl-lower',
    'path218': 'leg-outer', 'path221': 'leg-bottom', 'path220': 'leg-inner',
    'path219': 'crotch', 'path222': 'stem-inner', 'path223': 'stem-bottom', 'path224': 'left'}}


# ── small helpers ──────────────────────────────────────────────────────────

def fmt(v: float) -> str:
    s = f'{v:.3f}'.rstrip('0').rstrip('.')
    return '0' if s in ('-0', '') else s


def sub(a, b):
    return (a[0] - b[0], a[1] - b[1])


def add(a, b):
    return (a[0] + b[0], a[1] + b[1])


def mul(a, k):
    return (a[0] * k, a[1] * k)


def unit(v):
    n = math.hypot(*v) or 1.0
    return (v[0] / n, v[1] / n)


def intersect(p, d, q, e):
    """Intersection of lines p + t·d and q + s·e."""
    den = d[0] * e[1] - d[1] * e[0]
    if abs(den) < 1e-12:
        return None
    t = ((q[0] - p[0]) * e[1] - (q[1] - p[1]) * e[0]) / den
    return (p[0] + t * d[0], p[1] + t * d[1])


def mix(a: str, b: str, t: float) -> str:
    A = [int(a[i:i + 2], 16) for i in (1, 3, 5)]
    B = [int(b[i:i + 2], 16) for i in (1, 3, 5)]
    return '#' + ''.join(f'{round(x + (y - x) * t):02x}' for x, y in zip(A, B))


def path_d(el_or_d, matrix: Matrix | None = None) -> Path:
    p = Path(el_or_d)
    if matrix is not None:
        p = p * matrix
    p.reify()
    return p


def rings_of(p: Path, step: float = 1.5):
    """Sample a path into rings of points (one per subpath)."""
    rings, cur = [], []
    for seg in p:
        if isinstance(seg, Move):
            if len(cur) > 2:
                rings.append(cur)
            cur = [(seg.end.x, seg.end.y)]
        elif isinstance(seg, Close):
            if len(cur) > 2:
                rings.append(cur)
            cur = []
        elif isinstance(seg, Line):
            cur.append((seg.end.x, seg.end.y))
        else:
            n = max(2, int(seg.length() / step))
            for i in range(1, n + 1):
                q = seg.point(i / n)
                cur.append((q.x, q.y))
    if len(cur) > 2:
        rings.append(cur)
    return rings


def polygon_of(p: Path) -> Polygon:
    rings = [Polygon(r).buffer(0) for r in rings_of(p)]
    rings.sort(key=lambda g: -g.area)
    shape = rings[0]
    for r in rings[1:]:
        shape = shape.symmetric_difference(r)       # counters are holes
    return shape.buffer(0)


def outer_vertices(p: Path):
    """Vertices of the first subpath, which must be straight lines."""
    pts = []
    for seg in p:
        if isinstance(seg, Move):
            if pts:
                break
            pts.append((seg.end.x, seg.end.y))
        elif isinstance(seg, Line):
            pts.append((seg.end.x, seg.end.y))
        elif isinstance(seg, Close):
            break
        else:
            raise ValueError('the outer contour of a letter must be straight lines')
    if math.dist(pts[0], pts[-1]) < 1e-6:
        pts.pop()
    # Drop jogs shorter than half a unit (Dennis's R has a 0.05-unit step
    # in its stem) and points on a straight run, until nothing changes.
    changed = True
    while changed and len(pts) > 3:
        changed = False
        n = len(pts)
        for i in range(n):
            a, b, c = pts[i - 1], pts[i], pts[(i + 1) % n]
            short = math.dist(a, b) < 0.5
            cross = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0])
            straight = abs(cross) < 0.01 * (math.dist(a, b) * math.dist(b, c) or 1)
            if short or straight:
                pts.pop(i)
                changed = True
                break
    return pts


def poly_d(geom) -> str:
    """SVG path data for a (multi)polygon, holes included."""
    parts = []
    polys = getattr(geom, 'geoms', [geom])
    for g in polys:
        for ring in [g.exterior, *g.interiors]:
            xs = list(ring.coords)[:-1]
            parts.append('M ' + ' L '.join(f'{fmt(x)},{fmt(y)}' for x, y in xs) + ' Z')
    return ' '.join(parts)


# ── edges, colours and frames ──────────────────────────────────────────────

class Edge:
    def __init__(self, a, b, body: Polygon):
        self.a, self.b = a, b
        self.dir = unit(sub(b, a))
        n = (self.dir[1], -self.dir[0])
        mid = mul(add(a, b), 0.5)
        if body.contains(Point(add(mid, mul(n, 0.05)))):
            n = (-n[0], -n[1])
        self.n = n
        self.horizontal = abs(self.dir[0]) >= abs(self.dir[1])
        self.up = n[1] < 0
        self.left = n[0] < 0
        self.colour = None          # verticals: a hex
        self.run = None             # horizontals: index of their run
        self.name = None

    def outer(self):
        return add(self.a, mul(self.n, FRAME)), self.dir


def edges_of(verts, body: Polygon):
    return [Edge(verts[i], verts[(i + 1) % len(verts)], body) for i in range(len(verts))]


def colour_edges(edges):
    """Apply the colour rule; returns the runs as (edge indices, start, end)."""
    n = len(edges)

    def top_neighbour(i):
        e = edges[i]
        # The top end of a vertical edge is the end with the smaller y.
        return (i - 1) % n if e.a[1] < e.b[1] else (i + 1) % n

    def vertical_colour(i, seen=()):
        e = edges[i]
        j = top_neighbour(i)
        nb = edges[j]
        if not nb.horizontal and j not in seen:
            lit = vertical_colour(j, seen + (i,)) in (TAN, LB)
        else:
            lit = nb.up
        if e.left:
            return TAN if lit else BROWN
        return LB if lit else DB

    for i, e in enumerate(edges):
        if not e.horizontal:
            e.colour = vertical_colour(i)
    runs = []
    start = next(i for i, e in enumerate(edges) if not e.horizontal)
    cur = []
    for k in range(1, n + 1):           # ends on the starting vertical
        i = (start + k) % n
        if edges[i].horizontal:
            cur.append(i)
        elif cur:
            before = edges[(cur[0] - 1) % n].colour
            after = edges[i].colour
            for m in cur:
                edges[m].run = len(runs)
            runs.append((cur, before, after))
            cur = []
    return runs


def mitre(e1: Edge, e2: Edge):
    p1, d1 = e1.outer()
    p2, d2 = e2.outer()
    return intersect(p1, d1, p2, d2)


def run_chord(edges, members):
    first, last = edges[members[0]], edges[members[-1]]
    prev = edges[(members[0] - 1) % len(edges)]
    nxt = edges[(members[-1] + 1) % len(edges)]
    return mitre(prev, first), mitre(last, nxt)


def frame_pieces(edges, body: Polygon):
    """Strip polygons for each edge, cut the way Dennis cuts his frames."""
    n = len(edges)

    turn = sum(e.a[0] * e.b[1] - e.b[0] * e.a[1] for e in edges)    # orientation of the contour

    def convex(i, j):           # vertex between edge i and edge j = i + 1
        d1, d2 = edges[i].dir, edges[j].dir
        return (d1[0] * d2[1] - d1[1] * d2[0]) * turn > 0

    def owner(i, j):
        return i if abs(edges[i].dir[0]) >= abs(edges[j].dir[0]) else j

    ends = {}
    for i in range(n):
        j = (i + 1) % n
        V = edges[i].b
        o = owner(i, j)
        cvx = convex(i, j)
        M = mitre(edges[i], edges[j])
        for k, other in ((i, j), (j, i)):
            e = edges[k]
            po, d = e.outer()
            eo = edges[other]
            po_o, d_o = eo.outer()
            if k == o:
                perp = (-d[1], d[0])
                if cvx:
                    # Outer corner: cut square through the mitre point.
                    pts = [intersect(e.a, d, M, perp), M]
                else:
                    # Inner corner: run to the other strip's body line
                    # (square through the vertex when the corner is square).
                    pts = [V, intersect(eo.a, d_o, po, d)]
            else:
                if cvx:
                    perp_o = (-d_o[1], d_o[0])
                    pts = [V, intersect(eo.a, d_o, M, perp_o), M]
                else:
                    pts = [intersect(e.a, d, po_o, d_o), intersect(po, d, po_o, d_o)]
            ends[(k, 'end' if k == i else 'start')] = pts
    pieces = []
    for k in range(n):
        start = ends[(k, 'start')]
        end = ends[(k, 'end')]
        poly = Polygon(start + list(reversed(end))).buffer(0)
        pieces.append(poly)
    # Where a notch is narrower than two strips (the N's, where the
    # diagonal meets a stem), neighbouring strips overlap: the more
    # horizontal strip keeps the overlap, as it keeps the corners.
    taken = None
    for k in sorted(range(n), key=lambda k: -abs(edges[k].dir[0])):
        if taken is not None:
            pieces[k] = pieces[k].difference(taken).buffer(0)
        taken = pieces[k] if taken is None else unary_union([taken, pieces[k]])
    band = body.buffer(FRAME, join_style=2, mitre_limit=10).difference(body)
    total = unary_union(pieces)
    overlap = sum(p.area for p in pieces) - total.area
    miss = band.symmetric_difference(total).area
    assert overlap < band.area * 1e-3 and miss < band.area * 1e-3, \
        f'frame does not tile its band (overlap {overlap:.2f}, miss {miss:.2f} of {band.area:.0f})'
    return pieces


# ── letters ────────────────────────────────────────────────────────────────

class Letter:
    def __init__(self, ch, face_d, face_poly, strips):
        self.ch = ch
        self.face_d = face_d          # svgelements Path (exact, arcs kept)
        self.face_poly = face_poly
        self.strips = strips          # [{name, d (Path), poly, paint}]
        self.grads = {}               # run key -> (x1, y1, x2, y2, c1, c2)

    def silhouette(self):
        # Blurred into a shadow, so a third of a unit of simplification
        # is invisible and keeps the counters' sampled arcs short.
        shape = unary_union([self.face_poly, *[s['poly'] for s in self.strips]]).buffer(0.01).buffer(-0.01)
        return shape.simplify(0.3, preserve_topology=True)

    def bounds(self):
        return self.silhouette().bounds

    def moved(self, dx):
        m = Matrix(f'translate({dx},0)')
        strips = [{**s, 'd': path_d(s['d'], m), 'poly': _shift(s['poly'], dx)} for s in self.strips]
        out = Letter(self.ch, path_d(self.face_d, m), _shift(self.face_poly, dx), strips)
        out.grads = {k: (None if g is None else (g[0] + dx, g[1], g[2] + dx, g[3], g[4], g[5])) for k, g in self.grads.items()}
        return out


def _shift(geom, dx):
    from shapely.affinity import translate
    return translate(geom, xoff=dx)


def paint_letter(letter: Letter, outer_verts, piece_edges=None, bends=()):
    """Colour a letter's strips by the rule.

    piece_edges gives each strip's body edge when the strips were built
    here; for Dennis's own pieces the edge is found by overlap. A piece
    named in bends turns a corner from a horizontal run onto a vertical
    (his R's leg piece takes in the notch under the bowl): it takes that
    run's gradient, which ends in the vertical's colour.
    """
    body = Polygon(outer_verts)
    edges = edges_of(outer_verts, body)
    runs = colour_edges(edges)
    for r, (members, c1, c2) in enumerate(runs):
        a, b = run_chord(edges, members)
        letter.grads[r] = (a[0], a[1], b[0], b[1], c1, c2)
    raw = []
    for e in edges:
        po, _ = e.outer()
        pb = add(e.b, mul(e.n, FRAME))
        raw.append(Polygon([e.a, e.b, pb, po]).buffer(0))
    for k, s in enumerate(letter.strips):
        if piece_edges is not None:
            e = edges[piece_edges[k]]
        else:
            hits = sorted(((s['poly'].intersection(q).area, i) for i, q in enumerate(raw)), reverse=True)
            if not hits or hits[0][0] < 0.2 * s['poly'].area:
                raise AssertionError(f'{letter.ch}: piece {s["name"]} matches no edge')
            e = edges[hits[0][1]]
            if s['name'] in bends:
                h = max((i for i, ed in enumerate(edges) if ed.horizontal),
                        key=lambda i: s['poly'].intersection(raw[i]).area)
                e = edges[h]
        if e.horizontal:
            _, c1, c2 = runs[e.run]
            s['paint'] = ('solid', c1) if c1 == c2 else ('grad', e.run)
        else:
            s['paint'] = ('solid', e.colour)
    return edges


def his_letter(ch, svg_ids, ids_map, bends=()):
    face_el = svg_ids[ids_map['face']]
    face = path_d(face_el)
    strips = []
    for pid, name in ids_map['strips'].items():
        p = path_d(svg_ids[pid])
        strips.append({'name': name, 'd': p, 'poly': polygon_of(p)})
    letter = Letter(ch, face, polygon_of(face), strips)
    paint_letter(letter, outer_vertices(face), bends=bends)
    return letter


def built_letter(ch, verts, counters, names):
    """A letter framed by the construction: verts clockwise from top-left."""
    body_outer = Polygon(verts)
    body = body_outer
    face_d = 'M ' + ' L '.join(f'{fmt(x)},{fmt(y)}' for x, y in verts) + ' Z'
    for c in counters:
        face_d += ' ' + c
    face = path_d(face_d)
    face_poly = polygon_of(face)
    edges = edges_of(verts, body)
    polys = frame_pieces(edges, body)
    strips = []
    for k, poly in enumerate(polys):
        strips.append({'name': names[k], 'd': path_d(poly_d(poly)), 'poly': poly})
    letter = Letter(ch, face, face_poly, strips)
    paint_letter(letter, verts, piece_edges=list(range(len(strips))))
    return letter


def letter_a(x0):
    """Drafted A in the language of Dennis's TER R (document units)."""
    w, stem = 340.0, 75.56
    top, base = CAP_TOP, CAP_BOTTOM
    cham_x, cham_y = 40.81, 32.52            # his R's top-right chamfer
    bar_top, bar_bottom = 215.9, 276.52      # his R's middle bar
    counter_top = 124.88                     # his R's top bar
    r = 24.33                                # his R's counter radius
    verts = [(x0 + cham_x, top), (x0 + w - cham_x, top), (x0 + w, top + cham_y), (x0 + w, base),
             (x0 + w - stem, base), (x0 + w - stem, bar_bottom), (x0 + stem, bar_bottom),
             (x0 + stem, base), (x0, base), (x0, top + cham_y)]
    cl, cr = x0 + stem, x0 + w - stem
    counter = (f'M {fmt(cl)},{fmt(bar_top)} L {fmt(cl)},{fmt(counter_top + r)} '
               f'A {fmt(r)},{fmt(r)} 0 0 1 {fmt(cl + r)},{fmt(counter_top)} L {fmt(cr - r)},{fmt(counter_top)} '
               f'A {fmt(r)},{fmt(r)} 0 0 1 {fmt(cr)},{fmt(counter_top + r)} L {fmt(cr)},{fmt(bar_top)} Z')
    names = ['top', 'chamfer-right', 'right', 'right-leg-bottom', 'right-leg-inner', 'crossbar-underside',
             'left-leg-inner', 'left-leg-bottom', 'left', 'chamfer-left']
    return built_letter('A', verts, [counter], names)


def letter_n(rn_path: FsPath, x0):
    """Dennis's N from R-N.svg, scaled to the cap height of his TER letters."""
    svg = SVG.parse(str(rn_path), reify=True)
    src = next(el for el in svg.elements() if isinstance(el, Shape) and el.id == 'path134')
    p = path_d(src)
    bx0, by0, bx1, by1 = p.bbox()
    s = (CAP_BOTTOM - CAP_TOP) / (by1 - by0)
    m = Matrix(f'translate({-bx0},{-by0})') * Matrix(f'scale({s})') * Matrix(f'translate({x0},{CAP_TOP})')
    q = path_d(p, m)
    verts = outer_vertices(q)
    # Start at the top-left corner and run clockwise, as the names expect.
    k = min(range(len(verts)), key=lambda i: (round(verts[i][1], 3), verts[i][0]))
    verts = verts[k:] + verts[:k]
    if Polygon(verts).exterior.is_ccw:       # y down: ccw in shapely is clockwise on screen
        pass
    else:
        verts = [verts[0]] + list(reversed(verts[1:]))
    names = ['left-stem-top', 'diagonal-upper', 'ledge-upper', 'right-stem-inner', 'right-stem-top',
             'right', 'right-foot', 'diagonal-lower', 'ledge-lower', 'left-stem-inner', 'left-stem-bottom', 'left']
    if len(verts) != len(names):
        raise AssertionError(f'N: expected {len(names)} edges, found {len(verts)}')
    return built_letter('N', verts, [], names), s


# ── output ─────────────────────────────────────────────────────────────────

HEADER = '''<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<!--
✒ Metadata
    - Title: TERRANE Framed Wordmark (Terrane Edition - v1.0)
    - File Name: TERRANE-wordmark-framed.svg
    - Relative Path: web/assets/logos/TERRANE-wordmark-framed.svg
    - Artifact Type: illustration
    - Version: 1.0.0
    - Date: 11/12/2026
    - Update: Thursday, November 12, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 1.0.0 (11/12/2026) [dendogg + Anthropic - Claude Opus 5.5] — TERRANE
      in the framed style Dennis set in TER.svg, finished at his direction
      with near-white faces: his T, E and R, his N from R-N.svg, a drafted
      A, and copies for the second R and E.

✒ Description:
    The TERRANE wordmark with every letter built like Dennis's T mark: a
    near-white face inside a frame of colour strips, over a soft shadow.
    Generated by tools/build_terrane_wordmark.py; edit TER.svg or R-N.svg
    and run it again rather than editing this file by hand.

✒ Key Features:
    - Letters: T, E and R are Dennis's (TER.svg, his geometry and
      positions); N is his (R-N.svg) scaled to the same cap height and
      framed by the same cut; A is a draft in the language of his R
      (chamfered top corners, his R's bar heights and counter radius);
      the second R and E are copies
    - Colour rule, read off his T: vertical strips carry the colour, warm
      on left-facing sides and cool on right-facing ones, light where
      their top meets an up-facing edge and dark where they hang under a
      down-facing one; horizontal strips blend between the verticals they
      join, one gradient per run
    - Frames are 18.5 units wide; at each corner the more horizontal
      strip owns the corner square
    - Shadows: each letter's silhouette in black under his T's blur
    - Naming: wordmark-framed holds letter-N-x (numbered in reading
      order); each letter holds letter-N-x-shadow, letter-N-x-face and
      letter-N-x-frame, and the frame holds its strips named for their
      side, such as letter-1-t-frame-underside-left; gradients are
      letter-N-x-grad-K, the blur is wordmark-shadow-blur
    - One flat drawing: no Inkscape layers, groups for every unit

✒ Other Important Information:
    - Dependencies: none to display; generated from
      web/assets/temp/TER.svg and web/assets/temp/R-N.svg
    - Compatible platforms: any SVG 1.1 renderer; Inkscape 1.x to edit
    - The flat single-colour wordmark stays in TERRANE-wordmark.svg
-->
'''


def build_svg(letters, width, height, out: FsPath):
    from datetime import date
    L = []
    L.append(HEADER)
    L.append(f'''<svg
   width="{fmt(width)}"
   height="{fmt(height)}"
   viewBox="0 0 {fmt(width)} {fmt(height)}"
   version="1.1"
   id="terrane-wordmark-framed"
   inkscape:version="1.4.4 (dcaf3e7, 2026-05-05)"
   sodipodi:docname="TERRANE-wordmark-framed.svg"
   xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"
   xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd"
   xmlns:xlink="http://www.w3.org/1999/xlink"
   xmlns="http://www.w3.org/2000/svg"
   xmlns:svg="http://www.w3.org/2000/svg"
   xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
   xmlns:cc="http://creativecommons.org/ns#"
   xmlns:dc="http://purl.org/dc/elements/1.1/">
  <title
     id="title-terrane-wordmark-framed">TERRANE Framed Wordmark</title>
  <sodipodi:namedview
     id="namedview-terrane-wordmark-framed"
     pagecolor="#ffffff"
     bordercolor="#000000"
     borderopacity="0.25"
     inkscape:showpageshadow="2"
     inkscape:pageopacity="0.0"
     inkscape:pagecheckerboard="0"
     inkscape:deskcolor="#d1d1d1"
     inkscape:document-units="px"
     showborder="false" />
  <defs
     id="defs-terrane-wordmark-framed">
    <filter
       id="wordmark-shadow-blur"
       style="color-interpolation-filters:sRGB"
       x="-0.10341571"
       y="-0.11624234"
       width="1.2068314"
       height="1.2324847">
      <feGaussianBlur
         id="wordmark-shadow-blur-gaussian"
         stdDeviation="{fmt(BLUR)}" />
    </filter>''')
    for n, (lid, lt) in enumerate(letters, 1):
        for key, g in lt.grads.items():
            if g is None:
                continue
            x1, y1, x2, y2, c1, c2 = g
            gid = f'{lid}-grad-{key}'
            L.append(f'''    <linearGradient
       id="{gid}"
       gradientUnits="userSpaceOnUse"
       x1="{fmt(x1)}"
       y1="{fmt(y1)}"
       x2="{fmt(x2)}"
       y2="{fmt(y2)}">
      <stop
         id="{gid}-stop-1"
         offset="0"
         style="stop-color:{c1};stop-opacity:1" />
      <stop
         id="{gid}-stop-2"
         offset="1"
         style="stop-color:{c2};stop-opacity:1" />
    </linearGradient>''')
    L.append('  </defs>')
    L.append('''  <g
     id="wordmark-framed"
     inkscape:label="wordmark-framed">''')
    for lid, lt in letters:
        L.append(f'''    <g
       id="{lid}"
       inkscape:label="{lid}">
      <path
         id="{lid}-shadow"
         inkscape:label="{lid}-shadow"
         style="fill:{SHADOW};fill-opacity:1;fill-rule:evenodd;stroke:none;filter:url(#wordmark-shadow-blur)"
         d="{poly_d(lt.silhouette())}" />
      <path
         id="{lid}-face"
         inkscape:label="{lid}-face"
         style="fill:{FACE};fill-opacity:1;fill-rule:evenodd;stroke:none"
         d="{_d(lt.face_d)}" />
      <g
         id="{lid}-frame"
         inkscape:label="{lid}-frame">''')
        for s in lt.strips:
            kind, val = s['paint']
            fill = val if kind == 'solid' else f'url(#{lid}-grad-{val})'
            sid = f'{lid}-frame-{s["name"]}'
            L.append(f'''        <path
           id="{sid}"
           inkscape:label="{sid}"
           style="fill:{fill};fill-opacity:1;fill-rule:evenodd;stroke:none"
           d="{_d(s['d'])}" />''')
        L.append('      </g>\n    </g>')
    L.append('  </g>')
    L.append(f'''  <metadata
     id="metadata-terrane-wordmark-framed">
    <rdf:RDF>
      <cc:Work
         rdf:about="">
        <dc:format>image/svg+xml</dc:format>
        <dc:type
           rdf:resource="http://purl.org/dc/dcmitype/StillImage" />
        <dc:title>TERRANE Framed Wordmark</dc:title>
        <dc:date>{date(2026, 11, 12).isoformat()}</dc:date>
        <dc:creator>
          <cc:Agent>
            <dc:title>Dennis Smaltz</dc:title>
          </cc:Agent>
        </dc:creator>
        <dc:contributor>
          <cc:Agent>
            <dc:title>Anthropic - Claude Opus 5.5</dc:title>
          </cc:Agent>
        </dc:contributor>
        <dc:language>en</dc:language>
        <dc:description>The TERRANE wordmark in the framed style of Dennis's T mark: near-white faces inside frames of tan, brown, light-blue and dark-blue strips, over soft shadows. T, E, R and N are Dennis's; A is a draft.</dc:description>
        <dc:subject>
          <rdf:Bag>
            <rdf:li>Terrane</rdf:li>
            <rdf:li>wordmark</rdf:li>
            <rdf:li>logo</rdf:li>
            <rdf:li>framed letters</rdf:li>
          </rdf:Bag>
        </dc:subject>
        <dc:source>web/assets/temp/TER.svg; web/assets/temp/R-N.svg</dc:source>
      </cc:Work>
    </rdf:RDF>
  </metadata>
</svg>
''')
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text('\n'.join(L), encoding='utf-8')


def _d(p: Path) -> str:
    d = p.d()
    return ' '.join(_round_tokens(d))


def _round_tokens(d: str):
    import re
    for tok in re.split(r'(\s+)', d):
        if tok.strip():
            yield re.sub(r'-?\d+\.\d+(?:e-?\d+)?', lambda m: fmt(float(m.group())), tok)


# ── main ───────────────────────────────────────────────────────────────────

def main():
    ap = argparse.ArgumentParser(description='Build the framed TERRANE wordmark')
    ap.add_argument('--ter', type=FsPath, default=FsPath('web/assets/temp/TER.svg'))
    ap.add_argument('--rn', type=FsPath, default=FsPath('web/assets/temp/R-N.svg'))
    ap.add_argument('--out', type=FsPath, default=FsPath('web/assets/logos/TERRANE-wordmark-framed.svg'))
    args = ap.parse_args()

    svg = SVG.parse(str(args.ter), reify=True)
    ids = {el.id: el for el in svg.elements() if isinstance(el, Shape) and el.id}
    t = his_letter('T', ids, T_IDS)
    e = his_letter('E', ids, E_IDS)
    r = his_letter('R', ids, R_IDS, bends=('leg-outer',))

    margin = t.bounds()[0]                      # his left margin, kept on both sides
    r2 = r.moved(r.bounds()[2] + GAP - r.bounds()[0])
    a = letter_a(r2.bounds()[2] + GAP + FRAME)
    n, n_scale = letter_n(args.rn, a.bounds()[2] + GAP + FRAME)
    e2 = e.moved(n.bounds()[2] + GAP - e.bounds()[0])
    order = [('letter-1-t', t), ('letter-2-e', e), ('letter-3-r', r), ('letter-4-r', r2),
             ('letter-5-a', a), ('letter-6-n', n), ('letter-7-e', e2)]
    width = e2.bounds()[2] + margin
    height = 439.88336                          # his TER.svg page height
    build_svg(order, width, height, args.out)
    print(f'wrote {args.out}: 7 letters, {width:.1f} x {height:.1f}, N scaled {n_scale:.4f}')
    for lid, lt in order:
        x0, y0, x1, y1 = lt.bounds()
        paints = sorted({s["paint"][0] for s in lt.strips})
        print(f'  {lid}: x {x0:.1f}..{x1:.1f}, {len(lt.strips)} strips, {paints}')


if __name__ == '__main__':
    main()
