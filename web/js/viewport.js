/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: 3D Viewport (Terrane Edition - v1.5)
 *     - File Name: viewport.js
 *     - Relative Path: web/js/viewport.js
 *     - Artifact Type: javascript
 *     - Version: 1.5.0
 *     - Date: 11/13/2026
 *     - Update: Friday, November 13, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Changelog:
 *     - 1.5.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] —
 *       The relation layer is drawn only while it holds a line
 *       (three.js draws an empty range), and labels are placed again
 *       only when the eye, the layout, the marks or the canvas change,
 *       not on a frame redrawn for a hover. A label's overlap test
 *       measures the tag as drawn (LABEL_BOX: a folder's expanded
 *       capitals and its leader line, a mark's pin), so no tag stands
 *       across another or over another's line.
 *     - 1.4.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] — The
 *       walls of an open archive's chamber (BOX.WALL) carry no label; its
 *       floor is labelled with the archive's name, as a folder is. The
 *       header no longer calls the labels readable by assistive
 *       technology: their layer is hidden from it.
 *     - 1.3.0 (11/12/2026) [dendogg + Anthropic - Claude Opus 5.5] — The
 *       crossed convention (STYLE.CROSSED, the time view): the two
 *       diagonals of a box's footprint in ink on its top and bottom faces,
 *       measured in the box's own coordinates so a re-based origin cannot
 *       move them, thin at any distance, and faded with the haze and as
 *       the box shrinks on screen. The colour is washed once, by paint.
 *       A pin can stand on the peak of everything on its box and point up
 *       (benchmarks' survey marks, in the same pin mesh); up to 12 mark
 *       tags are placed before every other label (setMarks); pose()
 *       returns the eye and its heading.
 *     Earlier entries: see CHANGELOG.md
 *
 * ✒ Description:
 *     Draws a layout as a world you travel through and handles everything
 *     spatial: the free camera, flight, picking, transitions between
 *     layouts, labels, pins, relation lines and selection frames. It
 *     knows nothing about the filesystem; it is handed boxes and paint and
 *     reports pointer events as box indices.
 *
 * ✒ Key Features:
 *     - One instanced mesh for every box: a single draw call regardless of
 *       how many thousand entries are in view
 *     - Ink edges, hatching, stipple, banding and the crossed footprint
 *       are computed in the fragment shader from each box's own
 *       dimensions, so drawing conventions cost no extra geometry
 *     - A place, not a diagram: perspective camera inside the scene, with
 *       sky, horizon, haze, a surveyed ground plane and sun shadows that
 *       follow the eye down to any scale
 *     - Travel by pointer: the wheel flies toward whatever is under the
 *       cursor, drag slides the ground, right-drag orbits the point you
 *       grabbed, Alt-drag looks around
 *     - Travel by keys: W A S D to move, Q E to turn, R F to rise and
 *       descend; speed is proportional to height above the surface, so
 *       the same keys cross the whole world or step between two files
 *     - The eye cannot pass through the terrain; it is lifted onto it
 *     - Layout transitions: boxes that exist in both layouts travel, new
 *       ones rise out of their parent plateau
 *     - Render on demand: nothing is drawn while nothing changes
 *     - Picking by direct ray/box tests over the layout arrays, no scene
 *       graph traversal
 *     - HTML labels placed by projected size with collision rejection, so
 *       text is real text, selectable and crisp; the label layer is hidden
 *       from assistive technology, which reads the same names in the
 *       ledger and the inspector
 *     - Honors prefers-reduced-motion by cutting flights and transitions
 *     - A layout with more boxes than the buffers hold draws as many as
 *       fit and states how many were left out; it never throws
 *     - Relation lines in named sets (duplicate ties first) share one
 *       draw call: straight or arched, solid or dashed at a constant size
 *       on screen at any depth, with optional direction chevrons
 *     - Pins share one draw call too: pointing down at a box, or upright
 *       on the peak of everything standing on it; mark tags (at most 12)
 *       outrank every other label
 *
 * ✒ Usage Instructions:
 *     const view = new Viewport({ canvas, labelLayer });
 *     view.on = { hover, click, dblclick, context };   // (index, event)
 *     view.on.notice = (sentence) => ...;  // something the viewer should know
 *     view.setLayout(layout, paint);       // animated when keys overlap
 *     view.setPaint(paint);                // recolour only
 *     view.setRelation(key, { color, dashed, lift, arrows, legs });
 *     view.clearRelation(key);             // legs: ax ay az bx by bz, world
 *     view.setTies(from, toIndices);       // the set 'dup', garnet arcs
 *     view.setPins([{ i, color, peak, upright }]);
 *     view.setMarks([{ i, text, cls }]);   // tags first in line, up to 12
 *     view.frame(index);  view.overview();  view.eye;  view.look();
 *     view.flyTo(view.pose());             // the eye and heading, and back
 *
 * ✒ Other Important Information:
 *     - Dependencies: three.js r187 (vendored at web/vendor/three),
 *       layout.js, theme.js
 *     - Compatible platforms: browsers with WebGL2
 *     - Performance: 70,000 boxes is the layout budget; transitions write
 *       matrices directly into the instance buffer, and every buffer
 *       upload covers only the boxes, pins and line vertices drawn; the
 *       4096 x 4096 shadow map is redrawn on every fourth frame of a
 *       transition; relation lines hold 40,000 vertices in all
 *     - Limitations: touch gestures are limited to one-finger slide and
 *       tap; shadows soften at very small scales
 * ----------------------------------------------------------------------------
 */

import * as THREE from '../vendor/three/three.module.js';
import { BOX, STYLE, WORLD } from './layout.js';

const FOV = 44;
const HORIZON = 0xe9eeea;
const ZENITH = 0xc3d2d1;
import { THEME } from './theme.js';

// Instance buffer size. buildLayout keeps every layout within MAX_BOXES,
// which is below this.
const CAPACITY = 72000;
const PIN_CAPACITY = 3000;
// Mark tags placed before every other label, so they win every collision.
const MARKS_MAX = 12;
/**
 * How much room a label takes on screen, from its text, for the overlap
 * test (stage.css and places.css draw them): a width per character and the
 * padding and borders around it, and how far it reaches above and below
 * its anchor. A folder's tag is expanded capitals with a leader line 9 px
 * long under it; a file's is mono, close to its anchor; a mark's is a
 * bordered sentence over its upright pin, which no other tag may cover.
 * LABEL_GAP keeps a hair of paper between two tags.
 */
const LABEL_BOX = {
  dir: { ch: 8.8, pad: 14, up: 19, down: 11 },
  file: { ch: 6.3, pad: 8, up: 15, down: 1 },
  mark: { ch: 6.6, pad: 14, up: 19, down: 24 },
};
const LABEL_GAP = 2;
// The sun's 4096 x 4096 shadow map costs more to draw than the view does.
// While boxes travel it is redrawn on every fourth frame at most, and again
// on the frame where they arrive.
const SHADOW_EVERY = 4;
const fmtCount = (n) => n.toLocaleString('en-US');

/**
 * Marks the first `count` elements of a buffer attribute for the next
 * upload. With no range set, three.js sends the whole array, 4.6 MB for the
 * box matrices, however few boxes are drawn. Every write here starts at
 * element 0, so each attribute keeps one range and widens it. A count of 0
 * marks nothing: WebGL2 reads a zero length as "to the end of the array",
 * and nothing past the count is drawn.
 */
function upload(attr, count) {
  if (count <= 0) return;
  const r = attr.updateRanges;
  if (r.length === 1 && r[0].start === 0) r[0].count = Math.max(r[0].count, count);
  else attr.addUpdateRange(0, count);
  attr.needsUpdate = true;
}

// Relation lines: every named set (duplicate ties, routes, twins) shares one
// preallocated LineSegments, so the layer is one draw call whatever is in it.
const REL_CAPACITY = 40000; // vertices, two per segment
const ARC_SEGMENTS = 28; // segments in a lifted leg, as the duplicate ties always had
const MIN_ARC = 4; // the fewest an arc keeps when the sets need more room than there is
const MAX_ARC = 64; // the most a set may ask for, so one set cannot take the shared buffer
// Any value a caller passes becomes a whole count in [1, MAX_ARC]; junk gets the default.
const arcSegments = (v) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) ? Math.min(MAX_ARC, Math.max(1, n)) : ARC_SEGMENTS;
};
const ARROW = 0.06; // chevron arm, as a share of its leg's chord
const ARROW_COS = Math.cos((28 * Math.PI) / 180); // arms open 28 degrees either side
const ARROW_SIN = Math.sin((28 * Math.PI) / 180);
const DASH_PX = 11; // dash period on screen, in pixels, up to twice that

/**
 * Writes every relation set as line segments into flat vertex arrays,
 * relative to an origin. A set is { color, dashed, lift, arrows, segments,
 * legs }, where legs holds six world coordinates per leg: ax ay az bx by bz.
 * A lifted leg is a quadratic arc whose control point rises `lift` times
 * the chord above the higher end, which is how the duplicate ties were
 * always drawn; an unlifted leg is one straight segment. Distance along a
 * dashed leg starts at 0 at its first end; a solid leg and every chevron
 * carry -1, which the shader never breaks. When the sets need more room
 * than `capacity` vertices, the smallest sets are drawn whole and the rest
 * share what is left, first with fewer arc segments, then by leaving their
 * last legs out.
 *
 * @returns {{ count: number, legs: number, leftOut: number }} vertices
 *   written, legs drawn, legs left out
 */
export function relationVertices(sets, origin, pos, col, dist, capacity) {
  const plan = [];
  for (const s of sets) {
    const m = Math.floor(s.legs.length / 6);
    if (!m) continue;
    const lifted = s.lift > 0;
    const seg = lifted ? arcSegments(s.segments) : 1;
    const extra = s.arrows ? 2 : 0;
    plan.push({ s, m, lifted, seg, extra, need: m * (seg + extra), take: 0 });
  }
  plan.sort((a, b) => a.need - b.need);
  let room = Math.floor(capacity / 2);
  plan.forEach((p, i) => {
    const budget = Math.min(p.need, Math.floor(room / (plan.length - i)));
    if (p.need > budget && p.lifted) p.seg = Math.max(MIN_ARC, Math.min(p.seg, Math.floor(budget / p.m) - p.extra));
    p.take = Math.min(p.m, Math.floor(budget / (p.seg + p.extra)));
    room -= p.take * (p.seg + p.extra);
  });

  const { x: ox, y: oy, z: oz } = origin;
  let v = 0;
  let legs = 0;
  let leftOut = 0;
  let r = 0, g = 0, b = 0;
  const put = (x, y, z, d) => {
    pos[v * 3] = x - ox; pos[v * 3 + 1] = y - oy; pos[v * 3 + 2] = z - oz;
    col[v * 3] = r; col[v * 3 + 1] = g; col[v * 3 + 2] = b;
    dist[v++] = d;
  };
  // Largest first, so the small sets (a selection's ties) draw on top.
  for (let k = plan.length - 1; k >= 0; k--) {
    const { s, m, seg, extra, take } = plan[k];
    leftOut += m - take;
    [r, g, b] = linear(s.color);
    const L = s.legs;
    const lift = s.lift > 0 ? s.lift : 0;
    for (let i = 0, o = 0; i < take; i++, o += 6) {
      const ax = L[o], ay = L[o + 1], az = L[o + 2], bx = L[o + 3], by = L[o + 4], bz = L[o + 5];
      const chord = Math.hypot(bx - ax, by - ay, bz - az);
      if (!(chord > 0 && chord < Infinity)) continue;
      const mx = (ax + bx) / 2, my = Math.max(ay, by) + chord * lift, mz = (az + bz) / 2;
      let px = ax, py = ay, pz = az, d = 0;
      for (let j = 1; j <= seg; j++) {
        const t = j / seg, u = 1 - t;
        const qx = u * u * ax + 2 * u * t * mx + t * t * bx;
        const qy = u * u * ay + 2 * u * t * my + t * t * by;
        const qz = u * u * az + 2 * u * t * mz + t * t * bz;
        const nd = d + Math.hypot(qx - px, qy - py, qz - pz);
        put(px, py, pz, s.dashed ? d : -1);
        put(qx, qy, qz, s.dashed ? nd : -1);
        px = qx; py = qy; pz = qz; d = nd;
      }
      if (extra) {
        // A chevron at the middle of the leg, pointing from a to b, flat to
        // the ground so it reads from above.
        const cx = mx, cz = mz;
        const cy = seg > 1 ? 0.25 * ay + 0.5 * my + 0.25 * by : (ay + by) / 2;
        const ux = (bx - ax) / chord, uy = (by - ay) / chord, uz = (bz - az) / chord;
        let sx = -uz, sz = ux;
        const sl = Math.hypot(sx, sz);
        if (sl > 1e-9) { sx /= sl; sz /= sl; } else { sx = 1; sz = 0; }
        const h = chord * ARROW;
        const tx = cx + ux * h * 0.5, ty = cy + uy * h * 0.5, tz = cz + uz * h * 0.5;
        const back = h * ARROW_COS, wide = h * ARROW_SIN;
        for (const side of [1, -1]) {
          put(tx, ty, tz, -1);
          put(tx - ux * back + sx * wide * side, ty - uy * back, tz - uz * back + sz * wide * side, -1);
        }
      }
      legs++;
    }
  }
  return { count: v, legs, leftOut };
}

/**
 * The relation lines' material: LineDashedMaterial with vertex colours,
 * its world-unit dash replaced by one of a constant size on screen. The
 * period is the world length of DASH_PX pixels where the fragment is,
 * rounded up to a power of two, so it changes by octaves instead of
 * crawling while the eye moves, and keeps its phase at each leg's start.
 * A negative distance is a solid line. If the expression it replaces is
 * ever missing, the dash defaults below make every line solid.
 */
function relationMaterial() {
  const mat = new THREE.LineDashedMaterial({
    color: 0xffffff, vertexColors: true, dashSize: 1e30, gapSize: 0,
    transparent: true, opacity: 0.9, depthTest: false, fog: false,
  });
  mat.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        bool relationGap( float d ) {
          float fw = fwidth( d );
          float per = exp2( ceil( log2( max( fw, 1e-30 ) * ${DASH_PX.toFixed(1)} ) ) );
          return d >= 0.0 && fw > 0.0 && fract( d / per ) > 0.5;
        }`)
      .replace('mod( vLineDistance, totalSize ) > dashSize', 'relationGap( vLineDistance )');
  };
  return mat;
}

const sameRelation = (a, b) => a && a.color === b.color && a.dashed === b.dashed && a.lift === b.lift
  && a.arrows === b.arrows && a.segments === b.segments && a.legs.length === b.legs.length
  && a.legs.every((x, i) => x === b.legs[i]);

// GLSL test for one STYLE code. aStyle is a whole number per box; bounding
// each branch on both sides means a code with no branch draws plain
// instead of borrowing another convention.
const styleIs = (code) => `(vStyle > ${code - 0.5} && vStyle < ${code + 0.5})`;
const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const srgb = (hex) => new THREE.Vector3(((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255);

const linearCache = new Map();
const tmpColor = new THREE.Color();
function linear(hex) {
  let v = linearCache.get(hex);
  if (!v) {
    tmpColor.setHex(hex);
    v = [tmpColor.r, tmpColor.g, tmpColor.b];
    linearCache.set(hex, v);
  }
  return v;
}

function boxMaterial() {
  const mat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uInk = { value: srgb(THEME.ink) };
    shader.uniforms.uPaper = { value: srgb(THEME.chalk) };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        attribute float aStyle;
        attribute float aDim;
        varying vec3 vBoxLocal;
        varying vec3 vBoxScale;
        varying vec3 vWorldP;
        varying float vStyle;
        varying float vDim;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vBoxLocal = position;
        vBoxScale = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
        vWorldP = (instanceMatrix * vec4(position, 1.0)).xyz;
        vStyle = aStyle;
        vDim = aDim;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform vec3 uInk;
        uniform vec3 uPaper;
        varying vec3 vBoxLocal;
        varying vec3 vBoxScale;
        varying vec3 vWorldP;
        varying float vStyle;
        varying float vDim;`)
      .replace('#include <dithering_fragment>', `#include <dithering_fragment>
        {
          vec3 dd = (0.5 - abs(vBoxLocal)) * vBoxScale;
          float mn = min(dd.x, min(dd.y, dd.z));
          float mx = max(dd.x, max(dd.y, dd.z));
          float mid = dd.x + dd.y + dd.z - mn - mx;
          float fw = max(fwidth(mid), 1e-5);
          float smn = min(vBoxScale.x, min(vBoxScale.y, vBoxScale.z));
          float smx = max(vBoxScale.x, max(vBoxScale.y, vBoxScale.z));
          float smid = vBoxScale.x + vBoxScale.y + vBoxScale.z - smn - smx;
          vec3 col = gl_FragColor.rgb;
          float hc = vWorldP.x + vWorldP.z + vWorldP.y;
          float hw = max(fwidth(hc), 1e-5);
          float per = exp2(ceil(log2(hw * 7.0)));
          float edgeW = 1.0;
          float crossInk = 0.0;
          if ${styleIs(STYLE.HATCH)} {
            float t = abs(fract(hc / per) - 0.5);
            col = mix(col, uInk, (1.0 - smoothstep(0.09, 0.09 + hw / per, t)) * 0.7);
          } else if ${styleIs(STYLE.HOLLOW)} {
            col = mix(uPaper, col, 0.1);
            edgeW = 2.0;
          } else if ${styleIs(STYLE.STIPPLE)} {
            vec2 cell = fract(vWorldP.xz / per) - 0.5;
            col = mix(col, uInk, (1.0 - smoothstep(0.14, 0.14 + hw / per, length(cell))) * 0.5);
          } else if ${styleIs(STYLE.BANDS)} {
            float h2 = vWorldP.x - vWorldP.z + vWorldP.y;
            float t = abs(fract(h2 / (per * 2.0)) - 0.5);
            col = mix(col, uPaper, (1.0 - smoothstep(0.12, 0.12 + hw / per, t)) * 0.85);
          } else if ${styleIs(STYLE.HALF_BANDS)} {
            float t = fract(hc / (per * 2.0));
            col = mix(col, uPaper, smoothstep(0.5 - hw / per, 0.5, t) * (1.0 - smoothstep(1.0 - hw / per, 1.0, t)) * 0.6);
          } else if ${styleIs(STYLE.CROSSED)} {
            // The footprint's two diagonals on the top and bottom faces, in
            // the box's own coordinates: the floating origin never moves
            // them. Distances are in world units, so the line keeps about
            // a pixel's width at any depth. No wash here: paint has done it.
            vec2 q = vBoxLocal.xz;
            vec2 sz = vBoxScale.xz;
            float k = sz.x * sz.y / max(length(sz), 1e-30);
            // Signed distances: their screen rate is exact, where the rate
            // of an abs() halves across the line and breaks it into dashes.
            float s1 = (q.x - q.y) * k;
            float s2 = (q.x + q.y) * k;
            float c1 = 1.0 - smoothstep(0.55, 1.45, abs(s1) / max(fwidth(s1), 1e-30));
            float c2 = 1.0 - smoothstep(0.55, 1.45, abs(s2) / max(fwidth(s2), 1e-30));
            crossInk = max(c1, c2) * step(0.499, abs(vBoxLocal.y));
          }
          float haze = 0.0;
          #ifdef USE_FOG
            haze = smoothstep(fogNear, fogFar, vFogDepth);
          #endif
          col = mix(col, uPaper, vDim * 0.88 * (1.0 - haze));
          crossInk *= smoothstep(3.0, 16.0, smid / fw) * (1.0 - 0.8 * vDim) * (1.0 - haze);
          col = mix(col, uInk, crossInk * 0.85);
          float edge = 1.0 - smoothstep(fw * 0.7 * edgeW, fw * (0.7 * edgeW + 1.0), mid);
          edge *= smoothstep(3.0, 16.0, smid / fw) * 0.74 + 0.06;
          col = mix(col, uInk, edge * (1.0 - 0.8 * vDim) * (1.0 - haze));
          gl_FragColor.rgb = col;
        }`);
  };
  return mat;
}

export class Viewport {
  constructor({ canvas, labelLayer }) {
    this.canvas = canvas;
    this.labelLayer = labelLayer;
    this.on = {};
    this.layout = null;
    this.n = 0;
    this.leftOut = 0;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', logarithmicDepthBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.shadowMap.autoUpdate = false;
    this.renderer = renderer;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(HORIZON);
    scene.fog = new THREE.Fog(HORIZON, 1100, 6400);
    this.scene = scene;

    // Sky: pale at the horizon, cooler overhead. Travels with the eye.
    const sky = new THREE.Mesh(new THREE.SphereGeometry(9000, 32, 16), new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false,
      uniforms: { uHorizon: { value: srgb(HORIZON) }, uZenith: { value: srgb(ZENITH) } },
      vertexShader: 'varying vec3 vDir; void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform vec3 uHorizon; uniform vec3 uZenith; varying vec3 vDir; void main() { float t = pow(clamp(normalize(vDir).y, 0.0, 1.0), 0.55); gl_FragColor = vec4(mix(uHorizon, uZenith, t), 1.0); }',
    }));
    sky.renderOrder = -10;
    sky.frustumCulled = false;
    scene.add(sky);
    this.sky = sky;

    scene.add(new THREE.HemisphereLight(0xffffff, 0xdfe6e2, 1.95));
    const sun = new THREE.DirectionalLight(0xffffff, 1.75);
    sun.castShadow = true;
    sun.shadow.mapSize.set(4096, 4096);
    sun.shadow.intensity = 0.45;
    sun.shadow.radius = 2.5;
    scene.add(sun);
    scene.add(sun.target);
    this.sun = sun;

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(40000, 40000), new THREE.MeshBasicMaterial({ color: THEME.chalk }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.05;
    scene.add(ground);
    const shade = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), new THREE.ShadowMaterial({ opacity: 0.16 }));
    shade.rotation.x = -Math.PI / 2;
    shade.position.y = -0.02;
    shade.receiveShadow = true;
    scene.add(shade);

    // Surveyed ground: sheet border, tick marks, and a graticule that
    // runs out to the horizon and dissolves in the haze.
    const lines = [];
    const half = WORLD / 2 + 26;
    const corners = [[-half, -half], [half, -half], [half, half], [-half, half]];
    for (let i = 0; i < 4; i++) lines.push(corners[i][0], 0, corners[i][1], corners[(i + 1) % 4][0], 0, corners[(i + 1) % 4][1]);
    for (let i = 0; i <= 10; i++) {
      const p = -WORLD / 2 + (WORLD / 10) * i;
      lines.push(p, 0, half, p, 0, half + (i % 5 === 0 ? 16 : 8), -half, 0, p, -half - (i % 5 === 0 ? 16 : 8), 0, p);
    }
    const sheetGeo = new THREE.BufferGeometry();
    sheetGeo.setAttribute('position', new THREE.Float32BufferAttribute(lines, 3));
    scene.add(new THREE.LineSegments(sheetGeo, new THREE.LineBasicMaterial({ color: THEME.ink, transparent: true, opacity: 0.45 })));
    const grid = [];
    for (let p = -7000; p <= 7000; p += 250) {
      if (Math.abs(p) <= WORLD / 2) {
        grid.push(p, 0, -7000, p, 0, -half, p, 0, half, p, 0, 7000, -7000, 0, p, -half, 0, p, half, 0, p, 7000, 0, p);
      } else grid.push(p, 0, -7000, p, 0, 7000, -7000, 0, p, 7000, 0, p);
    }
    const gridGeo = new THREE.BufferGeometry();
    gridGeo.setAttribute('position', new THREE.Float32BufferAttribute(grid, 3));
    scene.add(new THREE.LineSegments(gridGeo, new THREE.LineBasicMaterial({ color: THEME.ink, transparent: true, opacity: 0.11 })));

    const geo = new THREE.BoxGeometry(1, 1, 1);
    this.aStyle = new THREE.InstancedBufferAttribute(new Float32Array(CAPACITY), 1);
    this.aDim = new THREE.InstancedBufferAttribute(new Float32Array(CAPACITY), 1);
    geo.setAttribute('aStyle', this.aStyle);
    geo.setAttribute('aDim', this.aDim);
    const mesh = new THREE.InstancedMesh(geo, boxMaterial(), CAPACITY);
    mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(CAPACITY * 3).fill(1), 3);
    mesh.count = 0;
    mesh.frustumCulled = false;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    this.mesh = mesh;
    this.cur = new Float64Array(CAPACITY * 6);
    this.from = new Float64Array(CAPACITY * 6);
    // Floating origin: instance positions are stored relative to this
    // point, which is moved to the eye at every layout. Deep levels are
    // many orders of magnitude smaller than the world, and 32-bit GPU
    // floats cannot hold both scales in absolute coordinates.
    this.origin = { x: 0, y: 0, z: 0 };

    const pinGeo = new THREE.ConeGeometry(0.5, 1.5, 4);
    pinGeo.rotateX(Math.PI);
    pinGeo.translate(0, 0.75, 0);
    const pins = new THREE.InstancedMesh(pinGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false }), PIN_CAPACITY);
    pins.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(PIN_CAPACITY * 3).fill(1), 3);
    pins.count = 0;
    pins.frustumCulled = false;
    scene.add(pins);
    this.pins = pins;
    this.pinList = [];
    this.pinMatrix = new THREE.Matrix4();
    this.pinScale = new THREE.Vector3();
    // Tags that outrank every other label (benchmarks), at most MARKS_MAX.
    this.marks = [];
    // three.js makes each buffer from the whole array on first use but
    // leaves a range marked before then in place; clearing it there keeps
    // the next upload to what changed since.
    for (const a of [mesh.instanceMatrix, mesh.instanceColor, this.aStyle, this.aDim, pins.instanceMatrix, pins.instanceColor]) {
      a.onUpload(() => a.clearUpdateRanges());
    }

    const frameGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1));
    const mkFrame = (color, opacity, depthTest = true) => {
      const f = new THREE.LineSegments(frameGeo, new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthTest, fog: false }));
      f.visible = false;
      f.renderOrder = 10;
      scene.add(f);
      return f;
    };
    this.selFrame = mkFrame(THEME.ink, 1);
    // The outer frame ignores depth, so a selection behind a rise still
    // shows where it is.
    this.selFrame2 = mkFrame(THEME.ink, 0.3, false);
    this.hoverFrame = mkFrame(THEME.ink, 0.55);
    this.selIndex = -1;
    this.hoverIndex = -1;

    // One layer for every set of relation lines. Its buffers are made once
    // and uploaded by range; endpoints are kept per set in 64-bit world
    // coordinates and written relative to the floating origin.
    const relGeo = new THREE.BufferGeometry();
    for (const [name, size] of [['position', 3], ['color', 3], ['lineDistance', 1]]) {
      const a = new THREE.BufferAttribute(new Float32Array(REL_CAPACITY * size), size).setUsage(THREE.DynamicDrawUsage);
      a.onUpload(() => a.clearUpdateRanges());
      relGeo.setAttribute(name, a);
    }
    relGeo.setDrawRange(0, 0);
    this.relations = new THREE.LineSegments(relGeo, relationMaterial());
    this.relations.renderOrder = 9;
    this.relations.frustumCulled = false;
    scene.add(this.relations);
    this.relationSets = new Map();
    this.relationsLeftOut = 0;
    this.relationsStale = false;

    this.camera = new THREE.PerspectiveCamera(FOV, 1, 0.01, 30000);
    this.cam = { x: 0, y: 900, z: 1200, yaw: 0, pitch: -0.6 };
    this.alt = 900;
    this.step = 9;
    this.flight = null;
    this.transition = null;
    // Frames drawn since the shadow map was last rendered, counted up to
    // SHADOW_EVERY.
    this.shadowAge = SHADOW_EVERY;
    this.keys = new Set();
    this.lastTick = 0;
    this.raf = 0;
    this.raycaster = new THREE.Raycaster();
    this.labelPool = [];

    this.#bindPointer();
    this.#bindKeys();
    new ResizeObserver(() => this.resize()).observe(canvas.parentElement);
    this.resize();
    this.cam = this.homeView();
  }

  /* ---------- camera ---------- */

  static forward(yaw, pitch) {
    const c = Math.cos(pitch);
    return [Math.sin(yaw) * c, Math.sin(pitch), -Math.cos(yaw) * c];
  }

  /** A vantage that looks at a point from a distance, at a heading. */
  static vantage(tx, ty, tz, dist, yaw, pitch) {
    const f = Viewport.forward(yaw, pitch);
    return { x: tx - f[0] * dist, y: ty - f[1] * dist, z: tz - f[2] * dist, yaw, pitch };
  }

  homeView() {
    const aspect = this.w / this.h;
    return Viewport.vantage(0, 0, 40, WORLD * 1.3 * Math.max(1, 1.5 / aspect), -0.56, -0.62);
  }

  get eye() {
    return { x: this.cam.x, y: this.cam.y, z: this.cam.z };
  }

  /** The eye and its heading, a copy that flyTo takes back. */
  pose() {
    const { x, y, z, yaw, pitch } = this.cam;
    return { x, y, z, yaw, pitch };
  }

  /** Pixels per world unit at a given distance from the eye. */
  #scaleAt(dist) {
    return this.h / (2 * Math.tan((FOV * Math.PI) / 360)) / Math.max(dist, 1e-6);
  }

  #distTo(x, y, z) {
    return Math.hypot(x - this.cam.x, y - this.cam.y, z - this.cam.z);
  }

  /** Height of the terrain under a point. */
  surface(x, z) {
    let top = 0;
    this.step = 9;
    if (!this.layout || Math.abs(x) > WORLD / 2 || Math.abs(z) > WORLD / 2) return 0;
    const g = this.layout.geo;
    for (let i = 0, o = 0; i < this.n; i++, o += 6) {
      if (Math.abs(x - g[o]) <= g[o + 3] / 2 && Math.abs(z - g[o + 2]) <= g[o + 5] / 2) {
        const t = g[o + 1] + g[o + 4] / 2;
        if (t > top) {
          top = t;
          // Local step height: the scale a visitor standing here has.
          this.step = Math.min(g[o + 3], g[o + 5]) * 0.045;
        }
      }
    }
    return top;
  }

  #settle() {
    const c = this.cam;
    c.pitch = Math.max(-1.52, Math.min(0.6, c.pitch));
    c.x = Math.max(-5000, Math.min(5000, c.x));
    c.z = Math.max(-5000, Math.min(5000, c.z));
    const ground = this.surface(c.x, c.z);
    // Eye height: a little under half a local step, so standing on any
    // plateau puts its contents at about chest height.
    const clear = this.step * 0.4;
    const floor = ground + clear;
    if (c.y < floor) {
      // Walking into a rise carries the eye up its face instead of
      // snapping to the top; flights and drags land directly.
      if (this.keys.size && floor - c.y > clear * 0.5) {
        c.y += (floor - c.y) * 0.22;
        this.climbing = true;
      } else {
        c.y = floor;
        this.climbing = false;
      }
    } else this.climbing = false;
    c.y = Math.min(4200, c.y);
    this.alt = Math.max(1e-7, c.y - ground);
  }

  #applyCamera() {
    this.#settle();
    const { x, y, z, yaw, pitch } = this.cam;
    const f = Viewport.forward(yaw, pitch);
    const cam = this.camera;
    cam.aspect = this.w / this.h;
    cam.near = Math.max(1e-8, this.alt * 0.02);
    cam.position.set(x, y, z);
    cam.up.set(0, 1, 0);
    cam.lookAt(x + f[0], y + f[1], z + f[2]);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
    this.sky.position.set(x, 0, z);
    // Haze closes in as you descend: nearby things are crisp, the rest of
    // the world recedes, and the horizon is always a horizon.
    const far = Math.min(6400, this.alt * 170 + 2);
    this.scene.fog.far = far;
    this.scene.fog.near = far * 0.17;
  }

  #ray(clientX, clientY) {
    const r = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    return this.raycaster.ray;
  }

  /** What is under a screen point: box index, world point, distance. */
  probe(clientX, clientY) {
    const ray = this.#ray(clientX, clientY);
    const hit = this.#cast(ray);
    let t = hit.t;
    if (hit.index < 0) t = ray.direction.y < -1e-6 ? -ray.origin.y / ray.direction.y : Infinity;
    if (!Number.isFinite(t) || t > 20000) return { index: -1, point: null, dist: Infinity };
    return { index: hit.index, dist: t, point: new THREE.Vector3(ray.origin.x + ray.direction.x * t, ray.origin.y + ray.direction.y * t, ray.origin.z + ray.direction.z * t) };
  }

  /** The point at the centre of the view, and how far away it is. */
  look() {
    const r = this.canvas.getBoundingClientRect();
    return this.probe(r.left + r.width / 2, r.top + r.height / 2);
  }

  /** Flies toward (factor < 1) or away from the point under the cursor. */
  zoomAt(factor, clientX, clientY) {
    this.flight = null;
    const r = this.canvas.getBoundingClientRect();
    const p = this.probe(clientX ?? r.left + r.width / 2, clientY ?? r.top + r.height / 2);
    const c = this.cam;
    if (p.point) {
      c.x = p.point.x + (c.x - p.point.x) * factor;
      c.y = p.point.y + (c.y - p.point.y) * factor;
      c.z = p.point.z + (c.z - p.point.z) * factor;
    } else {
      const f = Viewport.forward(c.yaw, c.pitch);
      const step = this.alt * (1 - factor) * 2;
      c.x += f[0] * step; c.y += f[1] * step; c.z += f[2] * step;
    }
    this.invalidate();
  }

  flyTo(goal, ms = 900) {
    const to = { ...this.cam, ...goal };
    while (to.yaw - this.cam.yaw > Math.PI) to.yaw -= Math.PI * 2;
    while (to.yaw - this.cam.yaw < -Math.PI) to.yaw += Math.PI * 2;
    if (reduceMotion() || ms === 0) {
      this.cam = to;
      this.flight = null;
    } else this.flight = { from: { ...this.cam }, to, start: performance.now(), ms };
    this.invalidate();
  }

  overview() {
    this.flyTo(this.homeView(), 1100);
  }

  /** Turns the eye in place. */
  turn(delta) {
    this.flyTo({ yaw: this.cam.yaw + delta }, 260);
  }

  /** Flies to a vantage in front of a box, keeping the current heading. */
  frame(index) {
    // Bounded by what is drawn: a clamped layout holds boxes that are not on screen.
    if (index < 0 || !this.layout || index >= this.n) return this.overview();
    const g = this.layout.geo;
    const o = index * 6;
    const topY = Math.max(this.layout.top[index], g[o + 1] + g[o + 4] / 2);
    const baseY = g[o + 1] - g[o + 4] / 2;
    const span = Math.max(g[o + 3], g[o + 5], (topY - baseY) * 1.6);
    const pitch = Math.max(-0.95, Math.min(-0.5, this.cam.pitch));
    const aspect = this.w / this.h;
    return this.flyTo(Viewport.vantage(g[o], baseY + (topY - baseY) * 0.4, g[o + 2], span * 1.7 * Math.max(1, 1.3 / aspect), this.cam.yaw, pitch));
  }

  /** Drops to just above the surface at the centre of the view. */
  descend() {
    const p = this.look();
    if (!p.point) return;
    const yaw = this.cam.yaw;
    this.flyTo(Viewport.vantage(p.point.x, p.point.y, p.point.z, p.dist * 0.22, yaw, -0.2));
  }

  /* ---------- content ---------- */

  setLayout(layout, paint, { animate = true } = {}) {
    const prev = this.layout;
    const prevN = this.n;
    // The buffers hold CAPACITY boxes. A larger layout draws the first
    // CAPACITY and says so, rather than throwing from a typed-array copy.
    const n = Math.min(layout.n, CAPACITY);
    const left = layout.n - n;
    const g = layout.geo;
    const from = this.from;
    const doAnim = animate && prev && !reduceMotion();
    this.origin = { x: this.cam.x, y: this.cam.y, z: this.cam.z };
    // A box index from the previous layout, if that box was drawn.
    const drawnBefore = (k) => {
      const j = prev.index.get(k);
      return j < prevN ? j : undefined;
    };
    if (doAnim) {
      // Where each box is right now (mid-transition included).
      const prevCur = this.cur.slice(0, prevN * 6);
      let moved = false;
      for (let i = 0; i < n; i++) {
        const o = i * 6;
        let j = drawnBefore(layout.key[i]);
        if (j !== undefined) {
          for (let k = 0; k < 6; k++) {
            from[o + k] = prevCur[j * 6 + k];
            if (!moved && Math.abs(from[o + k] - g[o + k]) > 1e-5) moved = true;
          }
          continue;
        }
        moved = true;
        // New box: rise out of the nearest ancestor that was already there.
        const nd = layout.node[i];
        let anc = layout.type[i] === BOX.SCREE ? nd : nd.p;
        j = undefined;
        let a = -1;
        while (anc && j === undefined) {
          j = drawnBefore(anc);
          a = layout.index.get(anc) ?? -1;
          anc = anc.p;
        }
        if (j !== undefined && a >= 0) {
          const p = j * 6;
          const q = a * 6;
          const fx = prevCur[p + 3] / g[q + 3];
          const fz = prevCur[p + 5] / g[q + 5];
          from[o] = prevCur[p] + (g[o] - g[q]) * fx;
          from[o + 1] = prevCur[p + 1] + prevCur[p + 4] / 2;
          from[o + 2] = prevCur[p + 2] + (g[o + 2] - g[q + 2]) * fz;
          from[o + 3] = g[o + 3] * fx;
          from[o + 4] = g[o + 4] * 0.001;
          from[o + 5] = g[o + 5] * fz;
        } else {
          from[o] = g[o]; from[o + 1] = g[o + 1] - g[o + 4] / 2; from[o + 2] = g[o + 2];
          from[o + 3] = g[o + 3]; from[o + 4] = g[o + 4] * 0.001; from[o + 5] = g[o + 5];
        }
      }
      if (moved || prevN !== n) {
        // Starting from rest, the first frame redraws the shadow map, so
        // the shadows of boxes that left go with them; a transition that
        // replaces a running one keeps the running one's cadence.
        if (!this.transition) this.shadowAge = SHADOW_EVERY;
        this.transition = { start: performance.now(), ms: 460 };
      } else {
        this.transition = null;
        this.cur.set(g.subarray(0, n * 6));
        this.#writeMatrices(n);
      }
    } else {
      this.transition = null;
      this.cur.set(g.subarray(0, n * 6));
      this.#writeMatrices(n);
    }
    this.shadowStale = true;
    // The origin moved, so the relation lines are written again around it.
    this.relationsStale = true;
    this.layout = layout;
    this.n = n;
    this.mesh.count = n;
    this.selIndex = -1;
    this.hoverIndex = -1;
    this.setPaint(paint);
    // Said once when it starts, not at every rebuild while it lasts.
    if (left > 0 && !this.leftOut) {
      this.on.notice?.(`Only ${fmtCount(CAPACITY)} of the ${fmtCount(layout.n)} blocks in this view can be drawn, so ${fmtCount(left)} are left out. A coarser grain or a higher view draws them all.`);
    }
    this.leftOut = left;
  }

  #writeMatrices(n) {
    const m = this.mesh.instanceMatrix.array;
    const c = this.cur;
    const { x: ox, y: oy, z: oz } = this.origin;
    for (let i = 0; i < n; i++) {
      const o = i * 6;
      const q = i * 16;
      m[q] = c[o + 3]; m[q + 1] = 0; m[q + 2] = 0; m[q + 3] = 0;
      m[q + 4] = 0; m[q + 5] = c[o + 4]; m[q + 6] = 0; m[q + 7] = 0;
      m[q + 8] = 0; m[q + 9] = 0; m[q + 10] = c[o + 5]; m[q + 11] = 0;
      m[q + 12] = c[o] - ox; m[q + 13] = c[o + 1] - oy; m[q + 14] = c[o + 2] - oz; m[q + 15] = 1;
    }
    this.mesh.position.set(ox, oy, oz);
    this.mesh.updateMatrixWorld();
    upload(this.mesh.instanceMatrix, n * 16);
  }

  setPaint({ color, style, dim }) {
    const n = this.n;
    const col = this.mesh.instanceColor.array;
    for (let i = 0; i < n; i++) {
      const v = linear(color[i]);
      col[i * 3] = v[0]; col[i * 3 + 1] = v[1]; col[i * 3 + 2] = v[2];
    }
    this.aStyle.array.set(style.subarray(0, n));
    this.aDim.array.set(dim.subarray(0, n));
    upload(this.mesh.instanceColor, n * 3);
    upload(this.aStyle, n);
    upload(this.aDim, n);
    this.invalidate();
  }

  /**
   * Pins over boxes, all in one instanced mesh: [{ i, color, peak, upright }].
   * A pin points down at the top of its box. peak stands it on the highest
   * point of everything standing on the box instead (a plateau's contents
   * included); upright turns it point up, a survey mark rather than a pin,
   * so it reads by its shape as well as its colour.
   */
  setPins(list) {
    const drawn = this.leftOut ? list.filter((p) => p.i < this.n) : list;
    this.pinList = drawn.slice(0, PIN_CAPACITY);
    const col = this.pins.instanceColor.array;
    this.pinList.forEach((p, k) => {
      const v = linear(p.color);
      col[k * 3] = v[0]; col[k * 3 + 1] = v[1]; col[k * 3 + 2] = v[2];
    });
    upload(this.pins.instanceColor, this.pinList.length * 3);
    this.pins.count = this.pinList.length;
    this.invalidate();
  }

  #placePins() {
    if (!this.pinList.length) return;
    const m = this.pinMatrix;
    const g = this.cur;
    const L = this.layout;
    const { x: ox, y: oy, z: oz } = this.origin;
    this.pinList.forEach((p, k) => {
      const o = p.i * 6;
      let topY = g[o + 1] + g[o + 4] / 2;
      // The layout's peak above the box's top, carried onto where the box
      // is now, so a peak pin travels with its box in a transition.
      if (p.peak) topY += Math.max(0, L.top[p.i] - (L.geo[o + 1] + L.geo[o + 4] / 2));
      const s = 13 / this.#scaleAt(this.#distTo(g[o], topY, g[o + 2]));
      if (p.upright) {
        // Half a turn about x: the base sits just above the anchor, the
        // apex points up. A rotation, not a negative scale, so the faces
        // keep their winding.
        m.makeRotationX(Math.PI).scale(this.pinScale.set(s, s, s));
        m.setPosition(g[o] - ox, topY + s * 1.65 - oy, g[o + 2] - oz);
      } else {
        m.makeScale(s, s, s);
        m.setPosition(g[o] - ox, topY + s * 0.15 - oy, g[o + 2] - oz);
      }
      this.pins.setMatrixAt(k, m);
    });
    this.pins.position.set(this.origin.x, this.origin.y, this.origin.z);
    upload(this.pins.instanceMatrix, this.pinList.length * 16);
  }

  /**
   * Draws a named set of relation lines, replacing what the set held.
   * `legs` holds six world coordinates per leg (ax ay az bx by bz); `lift`
   * raises each leg into an arc by that share of its chord; `dashed` breaks
   * it into dashes of a constant size on screen; `arrows` puts a chevron at
   * its middle pointing from a to b. Every set shares one draw call. The
   * layer is hidden while boxes travel, because endpoints are where boxes
   * end up, not where they are mid-way.
   */
  setRelation(key, { color = THEME.ink, dashed = false, lift = 0, arrows = false, segments = ARC_SEGMENTS, legs = [] } = {}) {
    const m = Math.floor(legs.length / 6);
    if (!m) return this.clearRelation(key);
    const flat = Float64Array.from(legs);
    const h = Number(lift);
    const set = { color, dashed: !!dashed, lift: Number.isFinite(h) ? h : 0, arrows: !!arrows, segments: arcSegments(segments), legs: flat.length === m * 6 ? flat : flat.slice(0, m * 6) };
    // A repaint hands the same set again; nothing is rewritten for it.
    if (sameRelation(this.relationSets.get(key), set)) return m;
    this.relationSets.set(key, set);
    this.relationsStale = true;
    this.invalidate();
    return m;
  }

  clearRelation(key) {
    if (this.relationSets.delete(key)) {
      this.relationsStale = true;
      this.invalidate();
    }
    return 0;
  }

  #writeRelations() {
    const geo = this.relations.geometry;
    const { position, color, lineDistance } = geo.attributes;
    const r = relationVertices(this.relationSets.values(), this.origin, position.array, color.array, lineDistance.array, REL_CAPACITY);
    geo.setDrawRange(0, r.count);
    upload(position, r.count * 3);
    upload(color, r.count * 3);
    upload(lineDistance, r.count);
    this.relations.position.set(this.origin.x, this.origin.y, this.origin.z);
    this.relationsLeftOut = r.leftOut;
    this.relationsStale = false;
  }

  /** Top centre of a box where the layout puts it, in world coordinates. */
  #topOf(i) {
    const g = this.layout.geo;
    const o = i * 6;
    return [g[o], g[o + 1] + g[o + 4] / 2, g[o + 2]];
  }

  /** Duplicate ties: garnet arcs from one box to others, the relation set 'dup'. */
  setTies(fromIndex, toIndices) {
    if (!this.layout || fromIndex < 0 || fromIndex >= this.n) return this.clearRelation('dup');
    const a = this.#topOf(fromIndex);
    const legs = [];
    for (const j of toIndices) if (j >= 0 && j < this.n && j !== fromIndex) legs.push(...a, ...this.#topOf(j));
    return this.setRelation('dup', { color: THEME.garnet, lift: 0.3, legs });
  }

  setSelected(index) {
    this.selIndex = index;
    this.invalidate();
  }

  setHover(index) {
    if (index === this.hoverIndex) return;
    this.hoverIndex = index;
    this.invalidate();
  }

  #placeFrame(frame, index, px) {
    if (index < 0 || index >= this.n) {
      frame.visible = false;
      return;
    }
    const c = this.cur;
    const o = index * 6;
    const pad = px / this.#scaleAt(this.#distTo(c[o], c[o + 1], c[o + 2]));
    frame.position.set(c[o], c[o + 1], c[o + 2]);
    frame.scale.set(c[o + 3] + pad, c[o + 4] + pad, c[o + 5] + pad);
    frame.visible = true;
  }

  /* ---------- picking ---------- */

  #cast(ray) {
    if (!this.layout) return { index: -1, t: Infinity };
    const ox = ray.origin.x, oy = ray.origin.y, oz = ray.origin.z;
    const ix = 1 / ray.direction.x, iy = 1 / ray.direction.y, iz = 1 / ray.direction.z;
    const g = this.layout.geo;
    let best = -1;
    let bestT = Infinity;
    for (let i = 0; i < this.n; i++) {
      const o = i * 6;
      const hx = g[o + 3] / 2, hy = g[o + 4] / 2, hz = g[o + 5] / 2;
      let t1 = (g[o] - hx - ox) * ix, t2 = (g[o] + hx - ox) * ix;
      let tmin = Math.min(t1, t2), tmax = Math.max(t1, t2);
      t1 = (g[o + 1] - hy - oy) * iy; t2 = (g[o + 1] + hy - oy) * iy;
      tmin = Math.max(tmin, Math.min(t1, t2)); tmax = Math.min(tmax, Math.max(t1, t2));
      if (tmax < tmin) continue;
      t1 = (g[o + 2] - hz - oz) * iz; t2 = (g[o + 2] + hz - oz) * iz;
      tmin = Math.max(tmin, Math.min(t1, t2)); tmax = Math.min(tmax, Math.max(t1, t2));
      if (tmax >= tmin && tmax > 0 && tmin < bestT) {
        bestT = Math.max(tmin, 0);
        best = i;
      }
    }
    return { index: best, t: bestT };
  }

  pick(clientX, clientY) {
    return this.#cast(this.#ray(clientX, clientY)).index;
  }

  #bindPointer() {
    const el = this.canvas;
    let down = null;
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    el.addEventListener('pointerdown', (e) => {
      el.setPointerCapture(e.pointerId);
      el.focus({ preventScroll: true });
      const mode = e.altKey || e.button === 1 ? 'look' : e.button === 2 ? 'orbit' : 'slide';
      const p = this.probe(e.clientX, e.clientY);
      down = { x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, button: e.button, moved: false, mode, anchor: p.point };
    });
    el.addEventListener('pointermove', (e) => {
      if (!down) {
        this.on.hover?.(this.pick(e.clientX, e.clientY), e);
        return;
      }
      if (!down.moved && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 5) return;
      if (!down.moved) {
        down.moved = true;
        this.flight = null;
        this.on.hover?.(-1, e);
        el.classList.add('is-dragging');
      }
      const dx = e.clientX - down.lx;
      const dy = e.clientY - down.ly;
      down.lx = e.clientX;
      down.ly = e.clientY;
      const c = this.cam;
      if (down.mode === 'look' || !down.anchor) {
        c.yaw += dx * 0.004;
        c.pitch -= dy * 0.004;
      } else if (down.mode === 'orbit') {
        const a = down.anchor;
        const dyaw = dx * 0.006;
        let dpitch = -dy * 0.005;
        if (c.pitch + dpitch < -1.5 || c.pitch + dpitch > 0.1) dpitch = 0;
        let ox = c.x - a.x, oy = c.y - a.y, oz = c.z - a.z;
        // Yaw about the vertical through the anchor.
        let cs = Math.cos(dyaw), sn = Math.sin(dyaw);
        [ox, oz] = [ox * cs - oz * sn, ox * sn + oz * cs];
        // Pitch about the eye's right-hand axis.
        const yaw = c.yaw + dyaw;
        const rx = Math.cos(yaw), rz = Math.sin(yaw);
        cs = Math.cos(dpitch); sn = Math.sin(dpitch);
        const dot = ox * rx + oz * rz;
        const cxp = -rz * oy, cyp = rz * ox - rx * oz, czp = rx * oy;
        ox = ox * cs + cxp * sn + rx * dot * (1 - cs);
        oy = oy * cs + cyp * sn;
        oz = oz * cs + czp * sn + rz * dot * (1 - cs);
        c.x = a.x + ox; c.y = a.y + oy; c.z = a.z + oz;
        c.yaw = yaw;
        c.pitch += dpitch;
      } else {
        // Slide: keep the grabbed point under the cursor, at its height.
        const ray = this.#ray(e.clientX, e.clientY);
        if (ray.direction.y < -0.02) {
          const t = (down.anchor.y - ray.origin.y) / ray.direction.y;
          c.x += down.anchor.x - (ray.origin.x + ray.direction.x * t);
          c.z += down.anchor.z - (ray.origin.z + ray.direction.z * t);
        }
      }
      this.#applyCamera();
      this.invalidate();
    });
    const up = (e) => {
      if (!down) return;
      const d = down;
      down = null;
      el.classList.remove('is-dragging');
      if (d.moved) return;
      const i = this.pick(e.clientX, e.clientY);
      if (d.button === 2) this.on.context?.(i, e);
      else if (d.button === 0) this.on.click?.(i, e);
    };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', () => { down = null; });
    el.addEventListener('pointerleave', (e) => { if (!down) this.on.hover?.(-1, e); });
    el.addEventListener('dblclick', (e) => this.on.dblclick?.(this.pick(e.clientX, e.clientY), e));
    el.addEventListener('wheel', (e) => {
      e.preventDefault();
      const step = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      this.zoomAt(Math.exp(Math.max(-240, Math.min(240, step)) * 0.0019), e.clientX, e.clientY);
    }, { passive: false });
  }

  #bindKeys() {
    const el = this.canvas;
    const MOVE = new Set(['w', 'a', 's', 'd', 'q', 'e', 'r', 'f']);
    el.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      if (e.ctrlKey || e.metaKey || e.altKey || !MOVE.has(k)) return;
      e.preventDefault();
      e.stopPropagation();
      this.keys.add(k);
      this.fast = e.shiftKey;
      this.flight = null;
      this.invalidate();
    });
    el.addEventListener('keyup', (e) => {
      this.keys.delete(e.key.toLowerCase());
      this.fast = e.shiftKey;
    });
    el.addEventListener('blur', () => this.keys.clear());
  }

  #travel(dt) {
    const k = this.keys;
    const c = this.cam;
    const speed = Math.max(1e-6, Math.min(900, this.alt * 1.25)) * (this.fast ? 3.2 : 1) * dt;
    const f = Viewport.forward(c.yaw, c.pitch);
    const rx = Math.cos(c.yaw), rz = Math.sin(c.yaw);
    const fwd = (k.has('w') ? 1 : 0) - (k.has('s') ? 1 : 0);
    const side = (k.has('d') ? 1 : 0) - (k.has('a') ? 1 : 0);
    const lift = (k.has('r') ? 1 : 0) - (k.has('f') ? 1 : 0);
    c.x += (f[0] * fwd + rx * side) * speed;
    c.y += (f[1] * fwd + lift * 0.8) * speed;
    c.z += (f[2] * fwd + rz * side) * speed;
    c.yaw += ((k.has('e') ? 1 : 0) - (k.has('q') ? 1 : 0)) * 1.3 * dt;
  }

  /* ---------- labels ---------- */

  /**
   * Tags that outrank every other label: [{ i, text, cls }], at most
   * MARKS_MAX, in priority order. Each stands above the peak of box i (a
   * peak pin's anchor), is placed before the folder and file labels so it
   * wins any overlap, and is never left out for being wider than its box.
   * cls adds classes to the tag. An empty list removes them.
   */
  setMarks(list) {
    this.marks = (list || []).slice(0, MARKS_MAX);
    this.invalidate();
  }

  #updateLabels() {
    const L = this.layout;
    // Labels stand where the eye, the layout, the marks and the canvas put
    // them: a frame redrawn only for a hover changes none of those, so the
    // labels placed last stay as they are.
    const c = this.cam;
    const state = this.labelState;
    if (state && state.layout === L && state.n === this.n && state.marks === this.marks && state.transition === !!this.transition
      && state.w === this.w && state.h === this.h && state.x === c.x && state.y === c.y && state.z === c.z && state.yaw === c.yaw && state.pitch === c.pitch) return;
    this.labelState = { layout: L, n: this.n, marks: this.marks, transition: !!this.transition, w: this.w, h: this.h, x: c.x, y: c.y, z: c.z, yaw: c.yaw, pitch: c.pitch };
    this.labelPasses = (this.labelPasses || 0) + 1;
    const pool = this.labelPool;
    let used = 0;
    if (L && !this.transition) {
      const g = L.geo;
      const dirs = [];
      const files = [];
      const limit = this.w * 1.6;
      const hazeLimit = this.scene.fog.far * 0.55;
      for (let i = 1, o = 6; i < this.n; i++, o += 6) {
        // Scree has no name, and a chamber's walls would repeat the name
        // its floor already carries.
        if (L.type[i] === BOX.SCREE || L.type[i] === BOX.WALL) continue;
        const dist = this.#distTo(g[o], g[o + 1], g[o + 2]);
        if (dist > hazeLimit) continue;
        const px = Math.max(g[o + 3], g[o + 5]) * this.#scaleAt(dist);
        if (L.type[i] === BOX.FILE) {
          if (px > 64) files.push([px, i]);
        } else if (px > 86 && px < limit) dirs.push([px, i]);
      }
      dirs.sort((a, b) => b[0] - a[0]);
      files.sort((a, b) => b[0] - a[0]);
      const v = new THREE.Vector3();
      const taken = [];
      const tryPlace = (i, px, cls, text, y, lift) => {
        const o = i * 6;
        const box = cls === 'tag-file' ? LABEL_BOX.file : cls.startsWith('tag-dir') ? LABEL_BOX.dir : LABEL_BOX.mark;
        const width = text.length * box.ch + box.pad;
        if (width > px * 1.2 + 24) return false;
        v.set(g[o], y, g[o + 2]).project(this.camera);
        if (v.z < -1 || v.z > 1) return false;
        const sx = (v.x * 0.5 + 0.5) * this.w;
        const sy = (-v.y * 0.5 + 0.5) * this.h - lift;
        if (sx < 20 || sx > this.w - 20 || sy < 14 || sy > this.h - 8) return false;
        // The whole tag, its shadow and a folder's leader line included,
        // so no tag is drawn across another or over another's line.
        const rect = [sx - width / 2 - LABEL_GAP, sy - box.up - LABEL_GAP, sx + width / 2 + LABEL_GAP, sy + box.down + LABEL_GAP];
        for (const t of taken) if (rect[0] < t[2] && rect[2] > t[0] && rect[1] < t[3] && rect[3] > t[1]) return false;
        taken.push(rect);
        let el = pool[used];
        if (!el) {
          el = document.createElement('div');
          this.labelLayer.appendChild(el);
          pool.push(el);
        }
        used++;
        el.className = `tag ${cls}`;
        if (el.textContent !== text) el.textContent = text;
        el.style.transform = `translate(${Math.round(sx)}px, ${Math.round(sy)}px) translate(-50%, -100%)`;
        el.hidden = false;
        return true;
      };
      // Marks first, above their peak and its upright pin (about 22 px).
      for (const mk of this.marks) {
        if (!(mk.i >= 0 && mk.i < this.n)) continue;
        const o = mk.i * 6;
        tryPlace(mk.i, Infinity, `tag-mark${mk.cls ? ` ${mk.cls}` : ''}`, mk.text, Math.max(L.top[mk.i], g[o + 1] + g[o + 4] / 2), 26);
      }
      let count = 0;
      for (const [px, i] of dirs) {
        if (count >= 24) break;
        if (tryPlace(i, px, L.type[i] === BOX.CAP ? 'tag-dir tag-cap' : 'tag-dir', L.node[i].n, L.top[i], 9)) count++;
      }
      count = 0;
      for (const [px, i] of files) {
        if (count >= 28) break;
        if (tryPlace(i, px, 'tag-file', L.node[i].n, g[i * 6 + 1] + g[i * 6 + 4] / 2, 2)) count++;
      }
    }
    for (let k = used; k < pool.length; k++) pool[k].hidden = true;
  }

  /** Screen position of the top of a box, for anchoring menus. */
  screenOf(index) {
    const r0 = this.canvas.getBoundingClientRect();
    if (index < 0 || !this.layout || index >= this.n) return { x: r0.left + r0.width / 2, y: r0.top + r0.height / 2 };
    const g = this.layout.geo;
    const o = index * 6;
    const v = new THREE.Vector3(g[o], g[o + 1] + g[o + 4] / 2, g[o + 2]).project(this.camera);
    return { x: r0.left + (v.x * 0.5 + 0.5) * r0.width, y: r0.top + (-v.y * 0.5 + 0.5) * r0.height };
  }

  /* ---------- loop ---------- */

  resize() {
    const p = this.canvas.parentElement;
    this.w = Math.max(50, p.clientWidth);
    this.h = Math.max(50, p.clientHeight);
    this.renderer.setSize(this.w, this.h, false);
    this.invalidate();
  }

  invalidate() {
    if (!this.raf) this.raf = requestAnimationFrame((t) => this.#tick(t));
  }

  #sunFollow() {
    // The shadow frustum follows the eye and shrinks with altitude, so
    // shadows stay crisp from the overview down to a single folder.
    const c = this.cam;
    const f = Viewport.forward(c.yaw, Math.min(c.pitch, -0.25));
    const reach = Math.max(1e-6, Math.min(820, this.alt * 2.6));
    const tx = Math.max(-500, Math.min(500, c.x + f[0] * reach * 0.6));
    const tz = Math.max(-500, Math.min(500, c.z + f[2] * reach * 0.6));
    const key = `${Math.round(tx / (reach * 0.15))}|${Math.round(tz / (reach * 0.15))}|${Math.round(Math.log2(reach) * 3)}`;
    if (key === this.sunKey && !this.shadowStale) return;
    // While boxes travel, the sun and its shadow map wait their turn. The
    // frame they arrive on has no transition left, so it always redraws.
    if (this.transition && this.shadowAge < SHADOW_EVERY) return;
    this.sunKey = key;
    this.shadowStale = false;
    this.shadowAge = 0;
    const sun = this.sun;
    const half = reach * 1.25;
    sun.target.position.set(tx, c.y - this.alt, tz);
    sun.position.set(tx - half * 0.62, c.y - this.alt + half * 1.1, tz + half * 0.46);
    const sc = sun.shadow.camera;
    sc.left = -half; sc.right = half; sc.top = half; sc.bottom = -half;
    sc.near = half * 0.05; sc.far = half * 4;
    sc.updateProjectionMatrix();
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = half * 0.0009;
    sun.target.updateMatrixWorld();
    this.renderer.shadowMap.needsUpdate = true;
  }

  #tick(now) {
    this.raf = 0;
    const dt = Math.min(0.05, (now - (this.lastTick || now)) / 1000);
    this.lastTick = now;
    let again = false;
    if (this.keys.size) {
      this.#travel(dt || 0.016);
      again = true;
    } else this.lastTick = 0;
    if (this.climbing) again = true;
    if (this.flight) {
      const f = this.flight;
      const t = Math.min(1, (now - f.start) / f.ms);
      const e = ease(t);
      for (const k of ['x', 'y', 'z', 'yaw', 'pitch']) this.cam[k] = f.from[k] + (f.to[k] - f.from[k]) * e;
      if (t >= 1) this.flight = null;
      else again = true;
    }
    if (this.transition) {
      const tr = this.transition;
      const t = Math.min(1, (now - tr.start) / tr.ms);
      const e = ease(t);
      const g = this.layout.geo;
      const from = this.from;
      const cur = this.cur;
      for (let k = 0, end = this.n * 6; k < end; k++) cur[k] = from[k] + (g[k] - from[k]) * e;
      this.#writeMatrices(this.n);
      this.shadowStale = true;
      if (t >= 1) this.transition = null;
      else again = true;
    }
    this.#applyCamera();
    this.#sunFollow();
    this.#placePins();
    this.#placeFrame(this.selFrame, this.selIndex, 3);
    this.#placeFrame(this.selFrame2, this.selIndex, 8);
    this.#placeFrame(this.hoverFrame, this.hoverIndex === this.selIndex ? -1 : this.hoverIndex, 2);
    if (this.relationsStale) this.#writeRelations();
    // An empty draw range is still a draw call in three.js (only a negative
    // count is skipped), so the layer is drawn only when it holds a line.
    this.relations.visible = !this.transition && this.relations.geometry.drawRange.count > 0;
    this.renderer.render(this.scene, this.camera);
    if (this.shadowAge < SHADOW_EVERY) this.shadowAge++;
    this.#updateLabels();
    this.on.moved?.(!again);
    if (again) this.invalidate();
  }
}
