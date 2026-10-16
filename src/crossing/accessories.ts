/**
 * Fuzzy Crossing accessories — the outfits that make the 50 Fuzzies different characters. The body is ALWAYS the owner's round fur
 * ball (no arms, feet, eyebrows or new faces); everything here is something it wears or something that floats with it: hats, crowns,
 * ears, horns, glasses (see-through, or pushed up on the forehead), capes, wings, tails, halos, orbiting stars…
 *
 * Every part is built in UNIT space — the Fuzzy's radius is 1, its centre is the origin, its face looks down +Z, the top of the head
 * is at (0, 0.92, 0), the eyes are big and sit at (−0.35, 0.15) and (0.41, 0.19) on the front, the mouth at (0.03, −0.19) — and the
 * rig scales the result to the real radius. Everything is procedural (lathe / tube / extrude / ellipsoid), smooth-shaded, lightly
 * shaded with baked vertex colours, low in triangles, with shared materials. Moving parts carry `userData.tick(t, dt)`.
 */
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { CharacterDef } from './characters';

export interface PartCtx { c0: string; c1: string; def?: CharacterDef }
type Builder = (ctx: PartCtx) => THREE.Object3D;
type Tick = (t: number, dt: number) => void;

// ---------- small maths ----------
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const PI = Math.PI;
const col = (h: string | number) => new THREE.Color(h);
const mixHex = (a: string, b: string, k: number) => '#' + col(a).lerp(col(b), k).getHexString();
const rng = (seed: number) => { let s = (Math.abs(Math.round(seed * 9301 + 49297)) % 233280) || 1; return () => (s = (s * 9301 + 49297) % 233280) / 233280; };

/** a point on the body's surface in direction d (the ball is a touch flatter on top and at the back) */
export function surf(d: THREE.Vector3, lift = 0): THREE.Vector3 {
  const n = d.clone().normalize();
  const ax = 1, ay = n.y > 0 ? 0.92 : 1, az = n.z > 0 ? 1 : 0.92;
  const t = 1 / Math.sqrt((n.x / ax) ** 2 + (n.y / ay) ** 2 + (n.z / az) ** 2);
  return n.multiplyScalar(t + lift);
}
/** stand an object on the surface: its +Y along the surface normal, +Z roughly forward */
function onSurf<T extends THREE.Object3D>(o: T, d: THREE.Vector3, lift = 0, spin = 0): T {
  const p = surf(d, lift); const n = d.clone().normalize();
  o.position.copy(p);
  o.quaternion.setFromUnitVectors(V(0, 1, 0), n);
  if (spin) o.rotateY(spin);
  return o;
}

// ---------- materials (shared, cached by look) ----------
interface MatOpts { r?: number; m?: number; e?: string; ei?: number; op?: number; side?: 'double'; flat?: boolean; glass?: boolean }
const mats = new Map<string, THREE.Material>();
function mat(color: string, o: MatOpts = {}): THREE.MeshStandardMaterial {
  const key = color + JSON.stringify(o);
  let m = mats.get(key) as THREE.MeshStandardMaterial | undefined;
  if (m) return m;
  m = new THREE.MeshStandardMaterial({
    color, roughness: o.r ?? 0.6, metalness: o.m ?? 0, vertexColors: true, flatShading: !!o.flat,
    emissive: o.e ? col(o.e) : col(0), emissiveIntensity: o.ei ?? (o.e ? 1 : 0),
    transparent: o.op !== undefined, opacity: o.op ?? 1, depthWrite: o.op === undefined || o.op > 0.6,
    side: o.side === 'double' ? THREE.DoubleSide : THREE.FrontSide,
  });
  if (o.glass) { m.envMapIntensity = 1.6; }
  mats.set(key, m);
  return m;
}
const gloss = (c: string) => mat(c, { r: 0.28 });
const metal = (c: string, r = 0.3) => mat(c, { r, m: 0.85 });
const GOLD = () => metal('#e8b84a', 0.26);
const SILVER = () => metal('#d7dde4', 0.24);
const glow = (c: string, ei = 1.6) => mat(c, { r: 0.4, e: c, ei });
const glass = (c: string, op = 0.3) => mat(c, { r: 0.05, m: 0.1, op, glass: true });

// ---------- geometry helpers ----------
/** baked shading: soft occlusion towards the bottom of the piece, optional colour gradient (top → bottom) */
function shade(g: THREE.BufferGeometry, ao = 0.22, top?: string, bottom?: string): THREE.BufferGeometry {
  g.computeBoundingBox();
  const b = g.boundingBox!, pos = g.attributes.position, n = pos.count;
  const c = new Float32Array(n * 3), ct = top ? col(top) : null, cb = bottom ? col(bottom) : null, tmp = new THREE.Color();
  const h = Math.max(1e-6, b.max.y - b.min.y);
  for (let i = 0; i < n; i++) {
    const k = (pos.getY(i) - b.min.y) / h;
    const a = 1 - ao * (1 - Math.min(1, k * 1.6));
    if (ct && cb) tmp.copy(cb).lerp(ct, k); else tmp.setRGB(1, 1, 1);
    c[i * 3] = tmp.r * a; c[i * 3 + 1] = tmp.g * a; c[i * 3 + 2] = tmp.b * a;
  }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return g;
}
const prep = (g: THREE.BufferGeometry, ao = 0.22): THREE.BufferGeometry => (g.attributes.color ? g : shade(g, ao));
function mesh(g: THREE.BufferGeometry, m: THREE.Material, ao = 0.22): THREE.Mesh {
  const x = new THREE.Mesh(prep(g, ao), m);
  x.castShadow = true; x.receiveShadow = true;
  return x;
}
/** smooth lathe from (radius, height) points */
function lathe(pts: [number, number][], seg = 28): THREE.BufferGeometry {
  const g = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(Math.max(0.0001, r), y)), seg);
  return g;
}
/** a smooth tube along points, tapering from r0 to r1 */
function tube(pts: THREE.Vector3[], r0: number, r1 = r0, segs = 18, radial = 8, cap = true): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const fr = curve.computeFrenetFrames(segs, false);
  const P: number[] = [], N: number[] = [], I: number[] = [];
  for (let i = 0; i <= segs; i++) {
    const u = i / segs, c = curve.getPointAt(u), r = r0 + (r1 - r0) * u;
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * PI * 2, nx = fr.normals[i].clone().multiplyScalar(Math.cos(a)).add(fr.binormals[i].clone().multiplyScalar(Math.sin(a)));
      P.push(c.x + nx.x * r, c.y + nx.y * r, c.z + nx.z * r); N.push(nx.x, nx.y, nx.z);
    }
  }
  for (let i = 0; i < segs; i++) for (let j = 0; j < radial; j++) { const a = i * (radial + 1) + j, b = a + radial + 1; I.push(a, b, a + 1, b, b + 1, a + 1); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); g.setIndex(I);
  if (!cap) return g;
  const parts = [g];
  for (const [u, r] of [[0, r0], [1, r1]] as [number, number][]) if (r > 0.004) { const s = new THREE.SphereGeometry(r, radial, 6); const p = curve.getPointAt(u); s.translate(p.x, p.y, p.z); s.deleteAttribute('uv'); parts.push(s); }
  return merge(parts);
}
const ell = (rx: number, ry: number, rz: number, w = 18, h = 12): THREE.BufferGeometry => new THREE.SphereGeometry(1, w, h).scale(rx, ry, rz);
function ext(shape: THREE.Shape, depth: number, bevel = depth * 0.35, seg = 10): THREE.BufferGeometry {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel * 0.8, bevelSegments: 2, curveSegments: seg });
  g.translate(0, 0, -depth / 2);
  return g;
}
function merge(gs: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const list = gs.map((g) => { const x = g.index ? g : g; for (const k of Object.keys(x.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'color') x.deleteAttribute(k); return x.index ? x.toNonIndexed() : x; });
  const hasCol = list.some((g) => g.attributes.color);
  if (hasCol) for (const g of list) if (!g.attributes.color) shade(g, 0);
  return mergeGeometries(list, false)!;
}
/** weld + smooth normals (for lumpy merged blobs) */
const smooth = (g: THREE.BufferGeometry) => { g.deleteAttribute('normal'); const w = mergeVertices(g, 1e-3); w.computeVertexNormals(); return w; };
function star2d(n: number, ro: number, ri: number): THREE.Shape {
  const s = new THREE.Shape();
  for (let i = 0; i <= n * 2; i++) { const a = PI / 2 + (i / (n * 2)) * PI * 2, r = i % 2 ? ri : ro; const x = Math.cos(a) * r, y = Math.sin(a) * r; i ? s.lineTo(x, y) : s.moveTo(x, y); }
  return s;
}
function leaf2d(w: number, h: number, tip = 0.5): THREE.Shape {
  const s = new THREE.Shape(); s.moveTo(0, 0);
  s.bezierCurveTo(w, h * 0.2, w * 0.9, h * tip, 0, h); s.bezierCurveTo(-w * 0.9, h * tip, -w, h * 0.2, 0, 0);
  return s;
}
/** a thin bent leaf / feather / petal: extruded leaf, bent along its length */
function bentLeaf(w: number, h: number, bend = 0.3, thick = 0.012): THREE.BufferGeometry {
  const g = ext(leaf2d(w, h), thick, thick * 0.6, 8);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i) / h; p.setZ(i, p.getZ(i) + bend * y * y * h + Math.abs(p.getX(i)) * -0.25 * (w / h)); }
  g.computeVertexNormals();
  return g;
}
let glowTex: THREE.Texture | null = null;
function haloSprite(color: string, size: number, opacity = 0.8): THREE.Sprite {
  if (!glowTex) {
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d')!;
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64); glowTex = new THREE.CanvasTexture(c); glowTex.colorSpace = THREE.SRGBColorSpace;
  }
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending }));
  s.scale.setScalar(size);
  s.userData.ownMaterial = true;
  return s;
}
const tick = <T extends THREE.Object3D>(o: T, f: Tick): T => { o.userData.tick = f; return o; };
const group = (...xs: (THREE.Object3D | null | undefined)[]): THREE.Group => { const g = new THREE.Group(); for (const x of xs) if (x) g.add(x); return g; };
const at = <T extends THREE.Object3D>(o: T, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0): T => { o.position.set(x, y, z); o.rotation.set(rx, ry, rz); return o; };

// ---------- shared pieces ----------
/** a band that hugs the body at height y (scarves, collars, necklaces): a tilted torus that follows the ball's width there */
function band(y: number, tubeR: number, m: THREE.Material, tilt = 0.18, arc = PI * 2, extra = 0): THREE.Mesh {
  const R = Math.sqrt(Math.max(0.05, 1 - (y / (y > 0 ? 0.92 : 1)) ** 2)) * 1.0 + tubeR * 0.55 + extra;
  const g = new THREE.TorusGeometry(R, tubeR, 10, 48, arc).rotateX(PI / 2);
  const x = mesh(g, m, 0.1); x.position.y = y; x.rotation.x = tilt;
  return x;
}
/** round lenses around the eyes (see-through) — glasses never hide the owner's eyes */
const EYE_L = V(-0.35, 0.16, 0.9), EYE_R = V(0.41, 0.19, 0.9);
function spectacles(frame: THREE.Material, lens: THREE.Material | null, opts: { r?: number; thick?: number; shape?: 'round' | 'star' | 'heart'; temples?: boolean } = {}): THREE.Group {
  const r = opts.r ?? 0.33, th = opts.thick ?? 0.035;
  const g = new THREE.Group();
  for (const e of [EYE_L, EYE_R]) {
    const z = surf(V(e.x, e.y, 0.9)).z + 0.1;
    let rim: THREE.BufferGeometry, glassG: THREE.BufferGeometry;
    if (opts.shape === 'star') {
      const s = star2d(5, r * 1.18, r * 0.62); rim = ext(s, th * 1.4, th * 0.4, 6);
      const hole = star2d(5, r * 0.98, r * 0.5); glassG = new THREE.ShapeGeometry(hole);
      const ring = new THREE.Shape(); ring.add(s); s.holes.push(new THREE.Path(hole.getPoints().reverse()));
      rim = ext(s, th * 1.4, th * 0.3, 6);
    } else {
      rim = new THREE.TorusGeometry(r, th, 8, 36);
      glassG = new THREE.CircleGeometry(r, 28);
    }
    const f = mesh(rim, frame, 0.05); f.position.set(e.x, e.y, z); f.rotation.y = e.x * 0.35;
    g.add(f);
    if (lens) { const l = new THREE.Mesh(shade(glassG, 0), lens); l.position.set(e.x, e.y, z - 0.005); l.rotation.y = e.x * 0.35; l.renderOrder = 2; g.add(l); }
  }
  // the bridge between the lenses, and arms running back over the ears
  g.add(mesh(tube([V(EYE_L.x + r * 0.96, 0.2, 1.0), V(0.03, 0.27, 1.06), V(EYE_R.x - r * 0.96, 0.22, 1.0)], th * 0.75), frame, 0));
  if (opts.temples !== false) for (const s of [-1, 1]) {
    const e = s < 0 ? EYE_L : EYE_R;
    g.add(mesh(tube([V(e.x + s * r, e.y + 0.04, 0.95), surf(V(s * 0.98, e.y + 0.08, 0.35), 0.05), surf(V(s * 0.95, e.y + 0.1, -0.2), 0.02)], th * 0.6, th * 0.5, 10, 6), frame, 0));
  }
  return g;
}
/** a cape hanging from the back: a curved sheet that ripples in the wind (vertex wave each frame) */
function cape(color: string, inner: string, opts: { top?: number; len?: number; width?: number; flare?: number; m?: THREE.Material; im?: THREE.Material; wave?: number } = {}): THREE.Group {
  const top = opts.top ?? 0.4, len = opts.len ?? 1.3, w = opts.width ?? 1.15, flare = opts.flare ?? 0.32;
  const cols = 12, rows = 10;
  const base: number[] = [];
  const P: number[] = [], I: number[] = [], C: number[] = [];
  for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) {
    const u = (i / cols) * 2 - 1, v = j / rows, a = u * w, R = 1.04 + v * flare;
    const x = Math.sin(a) * R, z = -Math.cos(a) * R * 0.95, y = top - v * len;
    P.push(x, y, z); base.push(x, y, z);
    const shadeK = 0.82 + 0.18 * (1 - v) ;
    C.push(shadeK, shadeK, shadeK);
  }
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const a = j * (cols + 1) + i, b = a + cols + 1; I.push(a, b, a + 1, b, b + 1, a + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); g.setIndex(I); g.computeVertexNormals();
  const outer = new THREE.Mesh(g, opts.m ?? mat(color, { r: 0.7 })); outer.castShadow = true;
  const g2 = g.clone(); g2.setIndex(I.slice().reverse() as number[]); // inside faces (the lining colour)
  const lining = new THREE.Mesh(g2, opts.im ?? mat(inner, { r: 0.8 }));
  const out = group(outer, lining);
  const pos = g.attributes.position as THREE.BufferAttribute, pos2 = g2.attributes.position as THREE.BufferAttribute;
  const wave = opts.wave ?? 1;
  let acc = 0;
  return tick(out, (t, dt) => {
    acc += dt; if (acc < 1 / 40) return; acc = 0; // ~40 updates a second is plenty for cloth
    for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) {
      const k = j * (cols + 1) + i, v = j / rows, u = (i / cols) * 2 - 1;
      const s = Math.sin(t * 2.6 - v * 3.2 + u * 1.4) * 0.07 * v * v * wave, s2 = Math.sin(t * 1.7 + u * 3) * 0.03 * v * wave;
      const x = base[k * 3], y = base[k * 3 + 1], z = base[k * 3 + 2];
      pos.setXYZ(k, x + s2 * 0.5, y + s * 0.3, z - Math.abs(s) * 0.6 - s2);
      pos2.setXYZ(k, x + s2 * 0.5, y + s * 0.3, z - Math.abs(s) * 0.6 - s2 + 0.006);
    }
    pos.needsUpdate = true; pos2.needsUpdate = true;
    g.computeVertexNormals(); g2.computeVertexNormals();
  });
}
/** a pair of wings on the back (left and right pivots) that flap */
function wings(make: (side: number) => THREE.Object3D, opts: { y?: number; spread?: number; speed?: number; amp?: number; back?: number } = {}): THREE.Group {
  const g = new THREE.Group();
  const y = opts.y ?? 0.25, sp = opts.spread ?? 0.55, speed = opts.speed ?? 3, amp = opts.amp ?? 0.35, back = opts.back ?? -0.72;
  const pivots: THREE.Group[] = [];
  for (const s of [-1, 1]) {
    const p = new THREE.Group(); p.position.set(s * sp, y, back); p.add(make(s)); g.add(p); pivots.push(p);
  }
  return tick(g, (t) => { const f = Math.sin(t * speed) * amp; pivots[0].rotation.y = -0.35 - f; pivots[1].rotation.y = 0.35 + f; pivots[0].rotation.z = 0.12 + f * 0.25; pivots[1].rotation.z = -0.12 - f * 0.25; });
}
function feather(len: number, w: number, c0: string, c1: string, emissive = false): THREE.Mesh {
  const g = shade(bentLeaf(w, len, -0.18, 0.012), 0.1, c1, c0);
  return mesh(g, emissive ? mat('#ffffff', { r: 0.5, e: c1, ei: 0.55, side: 'double' }) : mat('#ffffff', { r: 0.7, side: 'double' }), 0);
}
/** cloud puff blob (lumpy merged spheres, welded so it shades smoothly) */
function puff(n: number, seed: number, r = 0.18, spread = 0.22): THREE.BufferGeometry {
  const rnd = rng(seed); const gs: THREE.BufferGeometry[] = [];
  for (let i = 0; i < n; i++) { const s = new THREE.SphereGeometry(r * (0.7 + rnd() * 0.5), 12, 9); s.translate((rnd() - 0.5) * spread * 2, (rnd() - 0.3) * spread, (rnd() - 0.5) * spread); s.deleteAttribute('uv'); gs.push(s); }
  return mergeGeometries(gs.map((g) => g.toNonIndexed()), false)!;
}
/** a small upward-pointing 3D star */
const star3d = (ro: number, ri: number, depth = 0.05) => ext(star2d(5, ro, ri), depth, depth * 0.45, 4);
/** spiral / curl along a helix */
function helix(r0: number, r1: number, turns: number, h: number, n = 40): THREE.Vector3[] {
  const out: THREE.Vector3[] = [];
  for (let i = 0; i <= n; i++) { const u = i / n, a = u * turns * PI * 2, r = r0 + (r1 - r0) * u; out.push(V(Math.cos(a) * r, u * h, Math.sin(a) * r)); }
  return out;
}
/** a flame (teardrop lathe) that flickers */
function flame(size: number, c0 = '#ffd166', c1 = '#ff5a1f'): THREE.Mesh {
  const g = shade(lathe([[0, 0], [0.45, 0.12], [0.5, 0.35], [0.35, 0.65], [0.12, 0.9], [0, 1.05]], 14), 0, c0, c1);
  g.scale(size, size, size);
  const m = mesh(g, mat('#ffffff', { r: 1, e: c0, ei: 1.3, op: 0.92 }), 0);
  m.castShadow = false;
  const ph = Math.random() * 9;
  return tick(m, (t) => { const f = 1 + Math.sin(t * 17 + ph) * 0.08 + Math.sin(t * 29 + ph) * 0.05; m.scale.set(1 / f, f, 1 / f); });
}


/** the head's radius (with its fur) at height y — hats are made to fit it */
const headR = (y: number) => Math.sqrt(Math.max(0.04, 1 - (y / 0.95) ** 2)) * 1.08;
/** put a hat on: its base at height y0, tilted back a little so the face stays clear */
function wear<T extends THREE.Object3D>(o: T, y0: number, tilt = -0.16, z = -0.04): T { o.position.set(0, y0, z); o.rotation.x = tilt; return o; }
/**
 * A hood / helmet shell over the head with an opening for the face (the owner's face always shows): a sphere of radius R with the
 * front window (half-width w, from yBot to yTop) and everything below `bottom` cut away, plus a soft rolled rim round the window.
 */
function hood(m: THREE.Material, rimM: THREE.Material | null, o: { R?: number; w?: number; yTop?: number; yBot?: number; bottom?: number; rim?: number } = {}): THREE.Group {
  const R = o.R ?? 1.12, w = o.w ?? 0.82, yTop = o.yTop ?? 0.6, yBot = o.yBot ?? -0.62, bottom = o.bottom ?? -0.55;
  const yc = (yTop + yBot) / 2, hh = (yTop - yBot) / 2;
  const inWin = (d: THREE.Vector3) => d.z > 0.05 && (d.x / w) ** 2 + ((d.y - yc) / hh) ** 2 < 1;
  const sp = new THREE.SphereGeometry(R, 48, 32).toNonIndexed();
  const pos = sp.attributes.position, nor = sp.attributes.normal;
  const P: number[] = [], N: number[] = [];
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += 3) {
    a.fromBufferAttribute(pos, i); b.fromBufferAttribute(pos, i + 1); c.fromBufferAttribute(pos, i + 2);
    const d = a.clone().add(b).add(c).divideScalar(3 * R);
    if (d.y < bottom || inWin(d)) continue;
    for (let k = 0; k < 3; k++) { P.push(pos.getX(i + k), pos.getY(i + k) * 0.96, pos.getZ(i + k)); N.push(nor.getX(i + k), nor.getY(i + k), nor.getZ(i + k)); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  const out = group(mesh(shade(g, 0.18), m, 0));
  if (rimM) {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 48; i++) { const t = (i / 48) * PI * 2; const x = Math.cos(t) * w, y = yc + Math.sin(t) * hh; const z = Math.sqrt(Math.max(0.02, 1 - x * x - y * y)); pts.push(V(x, y, z).normalize().multiplyScalar(R).multiply(V(1, 0.96, 1))); }
    out.add(mesh(tube(pts, o.rim ?? 0.06, o.rim ?? 0.06, 64, 8, false), rimM, 0));
  }
  return out;
}

// ---------- the parts ----------
const P: Record<string, Builder> = {
  // ===== common =====
  mintLeaf: () => {
    const g = new THREE.Group();
    const leafM = mat('#ffffff', { r: 0.55, side: 'double' });
    for (const [s, ry, rz, sc] of [[-1, 0.5, 0.62, 1], [1, -0.55, -0.66, 0.9], [0, 0.1, 0.05, 0.7]] as [number, number, number, number][]) {
      const l = mesh(shade(bentLeaf(0.3 * sc, 0.8 * sc, 0.28), 0.15, '#9ff0c0', '#1f8a5b'), leafM, 0);
      const rib = mesh(tube([V(0, 0.02, 0.018), V(0, 0.4 * sc, 0.05 * sc), V(0, 0.72 * sc, 0.17 * sc)], 0.016, 0.004, 8, 5), mat('#d8fbe6', { r: 0.6 }), 0);
      const holder = group(l, rib); holder.rotation.set(-0.25, ry, rz); holder.position.x = s * 0.06;
      g.add(holder);
    }
    g.add(mesh(tube([V(0, -0.08, 0), V(0, 0.1, 0)], 0.045), mat('#3c9a5f', { r: 0.6 })));
    g.position.set(0.05, 0.98, 0.05);
    return tick(g, (t) => { g.rotation.z = Math.sin(t * 1.6) * 0.07; });
  },
  sunRays: () => {
    const g = new THREE.Group();
    const rayM = mat('#ffd23f', { r: 0.4, e: '#ffb300', ei: 0.55 });
    const n = 12;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * PI * 2, long = i % 2 === 0;
      const s = new THREE.Shape(); s.moveTo(-0.11, 0); s.quadraticCurveTo(0, long ? 0.5 : 0.36, 0, long ? 0.55 : 0.38); s.quadraticCurveTo(0, long ? 0.5 : 0.36, 0.11, 0); s.lineTo(-0.11, 0);
      const r = mesh(shade(ext(s, 0.05, 0.02, 6), 0, '#fff3a0', '#ffb703'), rayM, 0);
      r.position.set(Math.cos(a) * 1.08, Math.sin(a) * 1.04, -0.35); r.rotation.z = a - PI / 2;
      g.add(r);
    }
    g.add(at(haloSprite('#ffcf3f', 3.6, 0.35), 0, 0, -0.5));
    return tick(g, (t) => { g.rotation.z = t * 0.25; });
  },
  waveCrest: () => {
    const g = new THREE.Group();
    const water = mat('#ffffff', { r: 0.15, m: 0.05 });
    const pts = [V(-0.75, -0.05, -0.1), V(-0.35, 0.22, -0.05), V(0.1, 0.55, 0.0), V(0.45, 0.68, 0), V(0.7, 0.5, 0), V(0.58, 0.32, 0), V(0.44, 0.42, 0)];
    g.add(mesh(shade(tube(pts, 0.26, 0.07, 36, 14), 0.1, '#c9f6ff', '#2f6dff'), water, 0));
    const foamM = mat('#ffffff', { r: 0.7 });
    const rnd = rng(4);
    for (let i = 0; i < 12; i++) { const u = i / 11; const f = mesh(ell(0.09, 0.07, 0.09, 10, 8), foamM, 0); f.position.set(-0.45 + u * 1.05 + (rnd() - 0.5) * 0.06, 0.38 + Math.sin(u * PI) * 0.32, 0.12 + (rnd() - 0.5) * 0.1); g.add(f); }
    g.position.set(-0.05, 0.86, -0.12); g.rotation.set(-0.15, 0.35, 0);
    return tick(g, (t) => { g.position.y = 0.86 + Math.sin(t * 2) * 0.025; g.rotation.z = Math.sin(t * 1.3) * 0.05; });
  },
  berryStem: () => {
    const g = new THREE.Group();
    const leafM = mat('#ffffff', { r: 0.6, side: 'double' });
    for (let i = 0; i < 7; i++) {
      const l = mesh(shade(bentLeaf(0.2, 0.62, -0.3, 0.012), 0.1, '#86e05f', '#2e8b3c'), leafM, 0);
      const holder = group(l); holder.rotation.set(1.15, (i / 7) * PI * 2, 0, 'YXZ'); g.add(holder);
    }
    g.add(mesh(tube([V(0, 0, 0), V(0.03, 0.25, 0), V(0.14, 0.4, 0)], 0.055, 0.035, 10, 7), mat('#4f9a3c', { r: 0.6 })));
    g.position.set(0, 0.97, 0.02);
    // little golden seeds dotted over the fur (never on the face)
    const seeds = new THREE.Group();
    const seedM = gloss('#ffe08a');
    const rnd = rng(9);
    for (let i = 0; i < 60; i++) {
      const d = V(rnd() * 2 - 1, rnd() * 1.6 - 0.9, rnd() * 2 - 1).normalize();
      if (d.z > 0.3 && d.y > -0.62 && Math.abs(d.x) < 0.85) continue; // keep the face clear
      if (d.y > 0.78) continue;
      seeds.add(onSurf(mesh(ell(0.03, 0.055, 0.025, 6, 5), seedM, 0), d, 0.06));
    }
    return group(g, seeds);
  },
  beeAntennae: () => {
    const g = new THREE.Group();
    const stalk = mat('#2a2320', { r: 0.5 }), tip = gloss('#2a2320');
    for (const s of [-1, 1]) {
      const a = group(mesh(tube([V(0, 0, 0), V(s * 0.05, 0.25, 0.04), V(s * 0.18, 0.45, 0.08), V(s * 0.26, 0.5, 0.12)], 0.026, 0.018, 14, 6), stalk), at(mesh(ell(0.075, 0.075, 0.075), tip), s * 0.27, 0.51, 0.13));
      a.position.copy(surf(V(s * 0.28, 1, 0.15), -0.06));
      const ph = s;
      g.add(tick(a, (t) => { a.rotation.z = Math.sin(t * 3 + ph) * 0.12; a.rotation.x = Math.sin(t * 2.3 + ph) * 0.08; }));
    }
    return g;
  },
  beeWings: () => wings((s) => {
    const w = new THREE.Group();
    const m = mat('#eefaff', { r: 0.08, op: 0.5, side: 'double', e: '#cdeeff', ei: 0.15 });
    const vein = mat('#9fc6d8', { r: 0.4 });
    for (const [sc, ry, y] of [[1.35, 0, 0.05], [0.95, 0.35, -0.14]] as [number, number, number][]) {
      const sh = leaf2d(0.26 * sc, 0.62 * sc, 0.55);
      const f = new THREE.Mesh(shade(new THREE.ShapeGeometry(sh, 10), 0), m); f.rotation.set(0, 0, s * -1.1 - ry * s); f.position.y = y;
      const rib = mesh(tube([V(0, 0, 0.002), V(0, 0.5 * sc, 0.002)], 0.01, 0.004, 4, 4, false), vein, 0); rib.rotation.z = f.rotation.z; rib.position.y = y;
      w.add(f, rib);
    }
    w.rotation.y = s * 0.5;
    return w;
  }, { y: 0.38, spread: 0.45, speed: 22, amp: 0.25, back: -0.7 }),
  sproutLeaves: () => {
    const g = new THREE.Group();
    const stem = mat('#5fb236', { r: 0.6 });
    g.add(mesh(tube([V(0, -0.08, 0), V(0.03, 0.22, 0.01), V(-0.01, 0.42, 0)], 0.045, 0.034, 10, 7), stem));
    const lm = mat('#ffffff', { r: 0.55, side: 'double' });
    for (const s of [-1, 1]) {
      const l = mesh(shade(bentLeaf(0.3, 0.5, 0.2), 0.12, '#c6f58a', '#3f9b2f'), lm, 0);
      const h = group(l); h.position.set(0, 0.4, 0); h.rotation.set(0.15, 0, s * -1.05); g.add(h);
    }
    g.position.set(0, 0.98, 0.02);
    return tick(g, (t) => { g.rotation.z = Math.sin(t * 1.8) * 0.1; });
  },
  chefHat: () => {
    const g = new THREE.Group();
    const white = mat('#fbfbf8', { r: 0.85 });
    const R = headR(0.55) + 0.03;
    g.add(mesh(lathe([[R, 0], [R + 0.03, 0.08], [R + 0.03, 0.34], [R - 0.02, 0.4], [0.0, 0.4]], 40), white, 0.3));
    // pleats on the band
    for (let i = 0; i < 16; i++) { const a = (i / 16) * PI * 2; g.add(at(mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.3, 5), mat('#ecebe6', { r: 0.9 }), 0), Math.cos(a) * (R + 0.035), 0.2, Math.sin(a) * (R + 0.035))); }
    const top = smooth(puff(9, 3, 0.42, 0.42)); top.scale(1.1, 0.85, 1.1); top.translate(0, 0.72, 0);
    g.add(mesh(top, white, 0.15));
    return wear(g, 0.55, -0.2);
  },
  moustache: () => {
    // the chef's neckerchief, knotted at the front (a moustache would cover the owner's smile)
    const g = new THREE.Group();
    const red = mat('#e63946', { r: 0.75, side: 'double' });
    g.add(band(-0.5, 0.075, red, 0.12));
    const knot = mesh(ell(0.11, 0.09, 0.08), red, 0.1); knot.position.copy(surf(V(0.03, -0.55, 0.85), 0.1));
    g.add(knot);
    for (const s of [-1, 1]) {
      const tail = new THREE.Shape(); tail.moveTo(0, 0); tail.quadraticCurveTo(s * 0.12, -0.14, s * 0.1, -0.3); tail.lineTo(s * 0.02, -0.26); tail.quadraticCurveTo(s * 0.03, -0.12, 0, 0);
      const t = mesh(ext(tail, 0.02, 0.01, 8), red, 0.1); t.position.copy(knot.position).add(V(s * 0.04, -0.04, 0.03)); t.rotation.x = 0.35;
      g.add(t);
    }
    return g;
  },
  cowboyHat: () => {
    const g = new THREE.Group();
    const leather = mat('#b0733a', { r: 0.75 });
    const W = 1.2;
    const brim = new THREE.CylinderGeometry(W, W, 0.06, 48, 1);
    const p = brim.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), r = Math.hypot(x, z); p.setY(i, p.getY(i) + Math.pow(Math.abs(x) / W, 3) * 0.36 * (r / W) - Math.pow(Math.max(0, z) / W, 2) * 0.06); }
    brim.computeVertexNormals();
    g.add(mesh(brim, leather, 0.1));
    const R = headR(0.62) * 0.92;
    const crown = lathe([[R, 0], [R * 1.03, 0.2], [R * 0.95, 0.42], [R * 0.7, 0.52], [R * 0.3, 0.47], [0, 0.49]], 36);
    const cp = crown.attributes.position; for (let i = 0; i < cp.count; i++) { const x = cp.getX(i); if (cp.getY(i) > 0.35) cp.setY(i, cp.getY(i) - Math.max(0, 0.1 - Math.abs(x) * 0.25)); }
    crown.computeVertexNormals();
    g.add(mesh(crown, leather, 0.3));
    const bandM = mesh(new THREE.TorusGeometry(R * 1.02, 0.045, 8, 40).rotateX(PI / 2), mat('#5a2e12', { r: 0.6 }), 0); bandM.position.y = 0.08; g.add(bandM);
    g.add(at(mesh(star3d(0.09, 0.04, 0.025), GOLD(), 0), 0, 0.1, R * 1.06));
    return wear(g, 0.62, -0.2);
  },
  bandana: () => {
    const g = new THREE.Group();
    const red = mat('#d62828', { r: 0.75, side: 'double' });
    g.add(band(-0.5, 0.06, red, 0.1));
    const tri = new THREE.Shape(); tri.moveTo(-0.42, 0); tri.quadraticCurveTo(0, -0.1, 0.42, 0); tri.quadraticCurveTo(0.08, -0.32, 0, -0.42); tri.quadraticCurveTo(-0.08, -0.32, -0.42, 0);
    const t = mesh(ext(tri, 0.02, 0.01, 8), red, 0.1); t.position.set(0, -0.5, 0.88); t.rotation.x = 0.35;
    g.add(t);
    const dotM = mat('#ffffff', { r: 0.7 });
    for (const [x, y] of [[-0.2, -0.08], [0.18, -0.06], [0, -0.2], [-0.07, -0.32], [0.09, -0.3], [0.28, -0.03], [-0.29, -0.04]]) { const d = mesh(new THREE.CircleGeometry(0.025, 10), dotM, 0); d.position.set(x, y, 0.024); t.add(d); }
    g.add(at(mesh(ell(0.09, 0.07, 0.07), red), 0, -0.48, -0.95));
    return g;
  },
  headphones: (c) => {
    const g = new THREE.Group();
    const dark = mat('#26262e', { r: 0.4 }), pad = mat('#3a3a46', { r: 0.9 });
    const accent = glow(c.c0, 0.9);
    const bandPts: THREE.Vector3[] = []; for (let i = 0; i <= 12; i++) { const a = PI * (i / 12); bandPts.push(V(-Math.cos(a) * 1.02, 0.25 + Math.sin(a) * 0.78, -0.05)); }
    g.add(mesh(tube(bandPts, 0.06, 0.06, 26, 8), dark));
    for (const s of [-1, 1]) {
      const cup = group(mesh(new THREE.CylinderGeometry(0.27, 0.29, 0.16, 28).rotateZ(PI / 2), dark), at(mesh(new THREE.TorusGeometry(0.2, 0.07, 10, 28).rotateY(PI / 2), pad), -s * 0.09, 0, 0), at(mesh(new THREE.TorusGeometry(0.16, 0.022, 8, 28).rotateY(PI / 2), accent, 0), s * 0.085, 0, 0));
      cup.position.set(s * 1.0, 0.2, -0.05);
      g.add(cup);
    }
    return tick(g, (t) => { accent.emissiveIntensity = 0.7 + Math.sin(t * 6) * 0.35; });
  },
  scholarGlasses: () => spectacles(metal('#c9a227', 0.3), glass('#e8f6ff', 0.18), { r: 0.32, thick: 0.03 }),
  mortarboard: () => {
    const g = new THREE.Group();
    const black = mat('#1e1e26', { r: 0.6 });
    g.add(mesh(lathe([[0.5, 0], [0.52, 0.18], [0.0, 0.2]], 28), black, 0.25));
    const board = new THREE.BoxGeometry(1.25, 0.05, 1.25); g.add(at(mesh(board, black, 0.05), 0, 0.22, 0, 0, PI / 4, 0));
    g.add(at(mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.04, 12), gloss('#d6336c')), 0, 0.27, 0));
    const tas = new THREE.Group();
    tas.add(mesh(tube([V(0, 0, 0), V(0.45, 0.0, 0.0), V(0.62, -0.05, 0)], 0.012, 0.012, 8, 5, false), gloss('#d6336c')));
    const pend = new THREE.Group(); pend.position.set(0.62, -0.05, 0);
    pend.add(mesh(tube([V(0, 0, 0), V(0, -0.28, 0)], 0.012, 0.012, 4, 5, false), gloss('#d6336c')));
    pend.add(at(mesh(lathe([[0, 0], [0.06, -0.04], [0.05, -0.2], [0, -0.22]], 12), mat('#ffcf3f', { r: 0.5 })), 0, -0.28, 0));
    tas.add(pend); tas.position.y = 0.27; tas.rotation.y = -0.6;
    g.add(tas);
    onSurf(g, V(0, 1, -0.05), -0.12);
    g.rotation.x -= 0.1;
    return tick(g, (t) => { pend.rotation.x = Math.sin(t * 2.2) * 0.25; pend.rotation.z = Math.sin(t * 1.7) * 0.15; });
  },
  bunnyEars: (c) => {
    const g = new THREE.Group();
    const fur = mat(c.c0, { r: 0.9 }), inner = mat('#ffb3cf', { r: 0.7 });
    for (const s of [-1, 1]) {
      const e = new THREE.Group();
      const outer = lathe([[0, 0], [0.16, 0.05], [0.2, 0.35], [0.17, 0.7], [0.09, 0.95], [0, 1.0]], 18); outer.scale(1, 1, 0.45);
      e.add(mesh(outer, fur, 0.35));
      const inn = lathe([[0, 0.05], [0.1, 0.12], [0.13, 0.4], [0.1, 0.72], [0.04, 0.88], [0, 0.9]], 14); inn.scale(1, 1, 0.2); inn.translate(0, 0, 0.06);
      e.add(mesh(inn, inner, 0.1));
      e.position.copy(surf(V(s * 0.38, 1, 0.0), -0.1));
      e.rotation.set(-0.15, 0, s * -0.22);
      const ph = s * 1.3, flop = s > 0;
      g.add(tick(e, (t) => { e.rotation.z = s * -0.22 + Math.sin(t * 2.4 + ph) * 0.06; e.rotation.x = -0.15 + (flop ? 0.35 + Math.sin(t * 3 + ph) * 0.08 : 0); }));
    }
    return g;
  },
  bunnyTail: () => onSurf(mesh(smooth(puff(6, 7, 0.14, 0.1)), mat('#fff7fb', { r: 0.95 }), 0.1), V(0, -0.35, -1), -0.02),
  pumpkinStem: () => {
    const g = new THREE.Group();
    const stemM = mat('#6b5a2b', { r: 0.85 });
    const stem = lathe([[0.22, 0], [0.17, 0.15], [0.14, 0.33], [0.17, 0.42], [0, 0.43]], 12);
    const p = stem.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setX(i, p.getX(i) + y * y * 0.7); }
    stem.computeVertexNormals();
    g.add(mesh(stem, stemM, 0.3));
    g.add(at(mesh(shade(bentLeaf(0.3, 0.5, 0.2), 0.1, '#86d256', '#2f7a2a'), mat('#ffffff', { r: 0.6, side: 'double' }), 0), -0.06, 0.06, 0, 0.4, 0.4, 1.1));
    const vine = helix(0.07, 0.15, 2.2, 0.2, 30).map((v) => v.add(V(0.2, 0.06, 0.07)));
    g.add(mesh(tube(vine, 0.018, 0.011, 30, 5), mat('#4b8f2b', { r: 0.6 })));
    g.position.set(0, 0.93, 0.0);
    return g;
  },
  pumpkinGrin: () => {
    // a little jack-o'-lantern buddy floating beside the Fuzzy, grinning and glowing (the Fuzzy keeps its own face)
    const g = new THREE.Group();
    const body = lathe([[0, -0.3], [0.2, -0.28], [0.33, -0.15], [0.36, 0.02], [0.3, 0.2], [0.15, 0.28], [0, 0.27]], 40);
    const p = body.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); const a = Math.atan2(z, x); const k = 1 + Math.cos(a * 8) * 0.045; p.setX(i, x * k); p.setZ(i, z * k); }
    body.computeVertexNormals();
    g.add(mesh(shade(body, 0.25, '#ffa94d', '#e8590c'), mat('#ffffff', { r: 0.55 }), 0));
    const glowM = mat('#ffcf5a', { r: 0.9, e: '#ffb02e', ei: 1.6 });
    const eye = new THREE.Shape(); eye.moveTo(-0.06, -0.04); eye.lineTo(0.06, -0.04); eye.lineTo(0, 0.06); eye.lineTo(-0.06, -0.04);
    for (const s of [-1, 1]) { const e = mesh(new THREE.ShapeGeometry(eye), glowM, 0); e.position.set(s * 0.12, 0.06, 0.345); g.add(e); }
    const mouth = new THREE.Shape(); mouth.moveTo(-0.17, 0); mouth.quadraticCurveTo(0, -0.14, 0.17, 0); mouth.lineTo(0.1, -0.02); mouth.lineTo(0.07, -0.06); mouth.lineTo(0.03, -0.03); mouth.lineTo(-0.03, -0.05); mouth.lineTo(-0.08, -0.02); mouth.lineTo(-0.17, 0);
    const mm = mesh(new THREE.ShapeGeometry(mouth), glowM, 0); mm.position.set(0, -0.06, 0.352); g.add(mm);
    g.add(at(mesh(tube([V(0, 0.24, 0), V(0.03, 0.36, 0), V(0.09, 0.42, 0)], 0.035, 0.025, 8, 6), mat('#4b6b2b', { r: 0.8 })), 0, 0, 0));
    g.add(at(haloSprite('#ffb347', 0.9, 0.35), 0, 0, 0.2));
    g.position.set(1.25, 0.1, 0.35); g.rotation.y = -0.45;
    return tick(g, (t) => { g.position.y = 0.1 + Math.sin(t * 2) * 0.07; g.rotation.z = Math.sin(t * 1.4) * 0.12; glowM.emissiveIntensity = 1.3 + Math.sin(t * 9) * 0.25 + Math.sin(t * 23) * 0.15; });
  },
  scarf: () => knitScarf('#e63946', '#fff5e6'),
  carrotNose: () => {
    const m = mesh(shade(lathe([[0.1, 0], [0.095, 0.1], [0.07, 0.25], [0.02, 0.4], [0, 0.42]], 14), 0, '#ff7a1a', '#ff9f43'), mat('#ffffff', { r: 0.6 }), 0);
    m.rotation.x = PI / 2 - 0.18; m.position.set(0.03, -0.02, 0.97);
    for (let i = 0; i < 3; i++) m.add(at(mesh(new THREE.TorusGeometry(0.075 - i * 0.015, 0.006, 4, 16).rotateX(PI / 2), mat('#d9590f', { r: 0.7 }), 0), 0, 0.08 + i * 0.09, 0));
    return m;
  },
  earmuffs: () => {
    const g = new THREE.Group();
    const bandPts: THREE.Vector3[] = []; for (let i = 0; i <= 12; i++) { const a = PI * (i / 12); bandPts.push(V(-Math.cos(a) * 0.98, 0.32 + Math.sin(a) * 0.72, -0.12)); }
    g.add(mesh(tube(bandPts, 0.04, 0.04, 24, 8), metal('#c5cbd3', 0.35)));
    const fluff = mat('#ff8fb8', { r: 0.95 });
    for (const s of [-1, 1]) g.add(at(mesh(smooth(puff(8, 11 + s, 0.17, 0.12)), fluff, 0.15), s * 1.0, 0.28, -0.1));
    return g;
  },
  wheatCrown: () => {
    const g = new THREE.Group();
    const straw = mat('#e9b949', { r: 0.7 });
    g.add(band(0.55, 0.05, mat('#b77a2a', { r: 0.8 }), -0.25, PI * 2, 0.06));
    const grainM = mat('#f6c95a', { r: 0.55 });
    const n = 13;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * PI * 2, d = V(Math.cos(a) * 0.8, 0.6, Math.sin(a) * 0.8);
      if (Math.sin(a) > 0.86) continue;
      const ear = new THREE.Group();
      ear.add(mesh(tube([V(0, 0, 0), V(0, 0.34, 0.03)], 0.016, 0.012, 4, 5, false), straw, 0));
      for (let k = 0; k < 6; k++) for (const s of [-1, 1]) ear.add(at(mesh(ell(0.04, 0.08, 0.035, 8, 6), grainM, 0), s * 0.036, 0.26 + k * 0.06, 0, 0, 0, s * -0.4));
      onSurf(ear, d, 0.02);
      g.add(ear);
    }
    // a little ribbon bow at the side
    const bowM = mat('#c1121f', { r: 0.7 });
    const bow = group(at(mesh(ell(0.12, 0.07, 0.05), bowM, 0), -0.1, 0, 0, 0, 0, 0.5), at(mesh(ell(0.12, 0.07, 0.05), bowM, 0), 0.1, 0, 0, 0, 0, -0.5), mesh(ell(0.05, 0.05, 0.05), bowM, 0));
    onSurf(bow, V(0.82, 0.58, 0.45), 0.1); bow.rotateX(-PI / 2);
    g.add(bow);
    return g;
  },
  leafScarf: () => {
    const g = new THREE.Group();
    g.add(band(-0.52, 0.045, mat('#8a4b0f', { r: 0.8 }), 0.12));
    const colors = ['#e85d04', '#f48c06', '#dc2f02', '#faa307', '#9d0208'];
    const n = 18, rnd = rng(5);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * PI * 2;
      const c = colors[i % colors.length];
      const l = mesh(shade(bentLeaf(0.11, 0.24, 0.12, 0.008), 0.1, mixHex(c, '#ffffff', 0.15), mixHex(c, '#000000', 0.2)), mat('#ffffff', { r: 0.65, side: 'double' }), 0);
      const d = V(Math.cos(a), -0.52, Math.sin(a));
      onSurf(l, d, 0.05, rnd() * 6);
      l.rotateX(1.2);
      g.add(l);
    }
    return g;
  },
  // ===== rare =====
  starHalo: () => {
    const g = new THREE.Group();
    const sm = mat('#ffe066', { r: 0.35, m: 0.5, e: '#ffcf3f', ei: 0.6 });
    for (let i = 0; i < 7; i++) { const a = (i / 7) * PI * 2; const s = mesh(star3d(0.1, 0.045), sm, 0); s.position.set(Math.cos(a) * 0.62, Math.sin(a * 2) * 0.03, Math.sin(a) * 0.62); g.add(s); }
    g.position.y = 1.18;
    g.add(at(haloSprite('#ffe9a0', 1.8, 0.25), 0, 0, 0));
    return tick(g, (t) => { g.rotation.y = t * 0.8; g.position.y = 1.18 + Math.sin(t * 2) * 0.04; for (const ch of g.children) if (ch instanceof THREE.Mesh) ch.rotation.y = -t * 0.8 + t * 2; });
  },
  pirateHat: () => {
    const g = new THREE.Group();
    const black = mat('#1d1b22', { r: 0.7 });
    const R = headR(0.55);
    g.add(mesh(lathe([[R, 0], [R * 1.01, 0.22], [R * 0.82, 0.44], [R * 0.4, 0.55], [0, 0.56]], 36), black, 0.3));
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * PI * 2 + PI / 2;
      const W = R * 1.05;
      const s = new THREE.Shape(); s.moveTo(-W, 0); s.quadraticCurveTo(0, 0.14, W, 0); s.quadraticCurveTo(W * 0.72, 0.5, 0, 0.44); s.quadraticCurveTo(-W * 0.72, 0.5, -W, 0);
      const lobe = mesh(ext(s, 0.05, 0.02, 12), black, 0.1);
      lobe.position.set(Math.cos(a) * R * 0.9, 0.02, Math.sin(a) * R * 0.9); lobe.lookAt(Math.cos(a) * 3, 0.02, Math.sin(a) * 3); lobe.rotateX(-0.3);
      g.add(lobe);
      const trim = mesh(tube([V(-W * 0.97, 0.03, 0), V(-W * 0.5, 0.4, 0), V(0, 0.46, 0), V(W * 0.5, 0.4, 0), V(W * 0.97, 0.03, 0)], 0.024, 0.024, 20, 6, false), GOLD(), 0);
      lobe.add(at(trim, 0, 0, 0.032));
    }
    const bone = mat('#f5f1e6', { r: 0.6 });
    const skull = group(mesh(ell(0.15, 0.14, 0.06), bone, 0), at(mesh(new THREE.BoxGeometry(0.15, 0.07, 0.07), bone, 0), 0, -0.12, 0));
    for (const s of [-1, 1]) skull.add(at(mesh(ell(0.038, 0.045, 0.03), mat('#1d1b22', { r: 0.6 }), 0), s * 0.06, 0.015, 0.05));
    for (const s of [-1, 1]) skull.add(at(mesh(tube([V(-0.2, -0.17, 0), V(0.2, 0.0, 0)], 0.022, 0.022, 3, 5), bone, 0), 0, -0.05, -0.02, 0, 0, s > 0 ? 0 : PI - 0.84));
    skull.position.set(0, 0.32, R * 1.08 + 0.02); skull.rotation.x = -0.28;
    g.add(skull);
    return wear(g, 0.55, -0.2);
  },
  eyePatch: () => {
    // pushed up on the forehead (the eyes stay the owner's)
    const g = new THREE.Group();
    const black = mat('#1d1b22', { r: 0.6 });
    const strap: THREE.Vector3[] = []; for (let i = 0; i <= 14; i++) { const a = -0.5 + (i / 14) * (PI + 1.0); strap.push(surf(V(Math.cos(a) * 1, 0.5 + Math.sin(a) * 0.12, Math.sin(a)), 0.04)); }
    g.add(mesh(tube(strap, 0.022, 0.022, 30, 5, false), black, 0));
    const patch = new THREE.Shape(); patch.absellipse(0, 0, 0.17, 0.13, 0, PI * 2, false, 0);
    const p = mesh(ext(patch, 0.03, 0.015, 16), black, 0.1);
    onSurf(p, V(-0.32, 0.72, 0.62), 0.04);
    p.rotateX(-PI / 2);
    g.add(p);
    return g;
  },
  ninjaHeadband: (c) => {
    const g = new THREE.Group();
    const cloth = mat(mixHex(c.c1, '#c1121f', 0.55), { r: 0.8, side: 'double' });
    g.add(band(0.5, 0.075, cloth, -0.32, PI * 2, 0.2));
    const plate = mesh(new THREE.BoxGeometry(0.46, 0.18, 0.05), SILVER(), 0.05);
    plate.position.copy(surf(V(0, 0.66, 0.75), 0.18)); plate.lookAt(plate.position.clone().multiplyScalar(2));
    g.add(plate);
    plate.add(at(mesh(new THREE.TorusGeometry(0.045, 0.01, 6, 16), metal('#8b939c', 0.4), 0), 0, 0, 0.028));
    const tails = new THREE.Group(); tails.position.copy(surf(V(0, 0.42, -1), 0.2));
    for (const s of [-1, 1]) {
      const t = new THREE.Group();
      const len = s > 0 ? 0.75 : 0.6;
      const sh = new THREE.Shape(); sh.moveTo(0, -0.06); sh.lineTo(len, -0.07); sh.lineTo(len - 0.07, 0); sh.lineTo(len, 0.07); sh.lineTo(0, 0.06);
      t.add(mesh(ext(sh, 0.015, 0.006, 4), cloth, 0)); t.rotation.set(0, PI / 2 + s * 0.35, -0.6);
      tails.add(t);
    }
    g.add(tails);
    return tick(g, (t) => { tails.children.forEach((x, i) => { x.rotation.x = Math.sin(t * 5 + i * 2) * 0.35; }); });
  },
  ninjaMask: (c) => hood(mat(mixHex(c.c1, '#16161e', 0.75), { r: 0.85, side: 'double' }), mat(mixHex(c.c1, '#16161e', 0.6), { r: 0.85 }), { R: 1.13, w: 0.86, yTop: 0.62, yBot: -0.62, bottom: -0.5, rim: 0.07 }),
  vikingHelmet: () => {
    const g = new THREE.Group();
    const steel = metal('#a9b1ba', 0.38);
    g.add(mesh(lathe([[0.72, 0], [0.73, 0.1], [0.66, 0.28], [0.46, 0.44], [0.2, 0.52], [0, 0.53]], 32), steel, 0.25));
    g.add(at(band(0, 0.05, metal('#c58b3c', 0.35), 0), 0, 0.04, 0));
    (g.children[1] as THREE.Mesh).scale.set(0.72 / 1.03, 1, 0.72 / 1.03);
    // a ridge over the top + rivets
    const ridge: THREE.Vector3[] = []; for (let i = 0; i <= 10; i++) { const a = PI * (i / 10); ridge.push(V(0, Math.sin(a) * 0.53 + 0.01, Math.cos(a) * 0.71)); }
    g.add(mesh(tube(ridge, 0.035, 0.035, 20, 6, false), metal('#c58b3c', 0.35)));
    const horn = mat('#f3ead6', { r: 0.5 });
    for (const s of [-1, 1]) {
      const h = shade(tube([V(s * 0.62, 0.18, 0), V(s * 0.92, 0.28, 0.02), V(s * 1.08, 0.52, 0.04), V(s * 1.05, 0.78, 0.0)], 0.12, 0.015, 22, 10), 0.15, '#fffaf0', '#cdbf9f');
      g.add(mesh(h, horn, 0));
    }
    onSurf(g, V(0, 1, -0.06), -0.24);
    g.rotation.x -= 0.1;
    return g;
  },
  beard: () => braidBeard('#d97a2b', '#a24d14', 0.95),
  detectiveHat: () => {
    const g = new THREE.Group();
    const tweed = mat('#9a7b55', { r: 0.95 });
    const R = headR(0.5);
    g.add(mesh(lathe([[R, 0], [R, 0.18], [R * 0.8, 0.4], [R * 0.4, 0.53], [0, 0.55]], 36), tweed, 0.3));
    for (const s of [1, -1]) {
      const bill = new THREE.Shape(); bill.moveTo(-0.5, 0); bill.quadraticCurveTo(0, 0.55, 0.5, 0); bill.lineTo(-0.5, 0);
      const b = mesh(ext(bill, 0.035, 0.012, 12), tweed, 0.1); b.rotation.x = PI / 2 - s * 0.3; b.position.set(0, 0.03, s * R * 0.93); if (s < 0) b.rotation.y = PI;
      g.add(b);
    }
    for (const s of [-1, 1]) g.add(at(mesh(ell(0.07, 0.26, 0.22), tweed, 0.1), s * R * 0.98, 0.25, 0, 0, 0, s * 0.55));
    const bowM = mat('#5c4630', { r: 0.8 });
    const bow = group(at(mesh(ell(0.1, 0.05, 0.06), bowM), -0.08, 0, 0, 0, 0, 0.4), at(mesh(ell(0.1, 0.05, 0.06), bowM), 0.08, 0, 0, 0, 0, -0.4), mesh(ell(0.04, 0.04, 0.04), bowM));
    bow.position.y = 0.56; g.add(bow);
    const lineM = mat('#6d5536', { r: 0.95 });
    for (let i = -3; i <= 3; i++) { const x = i * 0.17, k = Math.sqrt(Math.max(0, 1 - (x / R) ** 2)); const pts: THREE.Vector3[] = []; for (let j = 0; j <= 8; j++) { const a = PI * (j / 8); pts.push(V(x, Math.sin(a) * 0.5 * k + 0.03, Math.cos(a) * R * k * 1.01)); } g.add(mesh(tube(pts, 0.009, 0.009, 16, 4, false), lineM, 0)); }
    return wear(g, 0.5, -0.12);
  },
  magnifier: () => {
    const g = new THREE.Group();
    g.add(mesh(new THREE.TorusGeometry(0.22, 0.035, 10, 32), GOLD(), 0));
    g.add(new THREE.Mesh(shade(new THREE.CircleGeometry(0.22, 28), 0), glass('#dff6ff', 0.32)));
    g.add(at(mesh(tube([V(0, -0.25, 0), V(0, -0.62, 0)], 0.045, 0.05, 6, 10), mat('#5c3a1e', { r: 0.6 })), 0, 0, 0));
    g.position.set(1.15, 0.05, 0.35); g.rotation.set(0, -0.6, -0.4);
    const base = g.position.clone();
    return tick(g, (t) => { g.position.y = base.y + Math.sin(t * 1.8) * 0.06; g.rotation.z = -0.4 + Math.sin(t * 1.2) * 0.08; });
  },
  catEars: (c) => {
    const g = new THREE.Group();
    const fur = mat(c.c0, { r: 0.92 }), pink = mat('#ffb0c8', { r: 0.7 });
    for (const s of [-1, 1]) {
      const e = new THREE.Group();
      const outer = new THREE.ConeGeometry(0.24, 0.42, 4, 1); outer.rotateY(PI / 4); outer.scale(1, 1, 0.45); outer.translate(0, 0.21, 0);
      e.add(mesh(smooth(outer), fur, 0.3));
      const inner = new THREE.ConeGeometry(0.15, 0.3, 4, 1); inner.rotateY(PI / 4); inner.scale(1, 1, 0.2); inner.translate(0, 0.17, 0.06);
      e.add(mesh(smooth(inner), pink, 0.1));
      onSurf(e, V(s * 0.55, 0.85, 0.15), -0.06);
      e.rotateZ(s * 0.05);
      const ph = s * 2.1;
      g.add(tick(e, (t) => { const tw = Math.max(0, Math.sin(t * 0.9 + ph) - 0.93) * 6; e.scale.y = 1 - tw * 0.08; }));
    }
    return g;
  },
  whiskers: () => {
    const g = new THREE.Group();
    const m = mat('#ffffff', { r: 0.4 });
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
      const y = -0.06 - i * 0.06;
      g.add(mesh(tube([V(s * 0.5, y, 0.86), V(s * 0.75, y + 0.02 - i * 0.03, 0.82), V(s * 0.98, y - i * 0.07, 0.72)], 0.008, 0.004, 8, 4, false), m, 0));
    }
    return g;
  },
  catTail: (c) => {
    const g = new THREE.Group();
    const pts = [V(0, -0.6, -0.9), V(0.1, -0.7, -1.25), V(0.35, -0.3, -1.4), V(0.4, 0.15, -1.3), V(0.25, 0.32, -1.18)];
    const m = mesh(shade(tube(pts, 0.11, 0.07, 26, 10), 0.15, c.c0, c.c1), mat('#ffffff', { r: 0.95 }), 0);
    g.add(m);
    return tick(g, (t) => { g.rotation.z = Math.sin(t * 1.6) * 0.12; g.rotation.y = Math.sin(t * 1.1) * 0.15; });
  },
  antlers: () => {
    const g = new THREE.Group();
    const m = mat('#8a5a2b', { r: 0.75 });
    for (const s of [-1, 1]) {
      const a = new THREE.Group();
      a.add(mesh(tube([V(0, 0, 0), V(s * 0.08, 0.25, 0), V(s * 0.25, 0.48, -0.05), V(s * 0.3, 0.7, -0.08)], 0.05, 0.025, 16, 8), m));
      a.add(mesh(tube([V(s * 0.06, 0.2, 0), V(s * -0.04, 0.42, 0.04), V(s * -0.02, 0.52, 0.05)], 0.035, 0.02, 10, 6), m));
      a.add(mesh(tube([V(s * 0.2, 0.42, -0.04), V(s * 0.4, 0.5, -0.02), V(s * 0.48, 0.62, 0)], 0.032, 0.018, 10, 6), m));
      onSurf(a, V(s * 0.42, 0.95, 0.0), -0.06);
      g.add(a);
    }
    return g;
  },
  redNose: () => {
    const g = new THREE.Group();
    const m = mesh(ell(0.11, 0.1, 0.1, 18, 14), mat('#ff2a2a', { r: 0.25, e: '#ff1a1a', ei: 0.5 }), 0);
    g.add(m, at(haloSprite('#ff4040', 0.55, 0.55), 0, 0, 0.05));
    g.position.set(0.03, 0.03, 1.01);
    return tick(g, (t) => { (m.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.45 + Math.max(0, Math.sin(t * 2.5)) * 0.8; });
  },
  jingleBells: () => {
    const g = new THREE.Group();
    g.add(band(-0.5, 0.06, mat('#c1121f', { r: 0.8 }), 0.12));
    for (const x of [-0.42, 0, 0.42]) {
      const b = group(mesh(ell(0.1, 0.1, 0.1, 16, 12), GOLD(), 0.05), at(mesh(new THREE.BoxGeometry(0.14, 0.012, 0.02), metal('#8a6a1a', 0.4), 0), 0, -0.03, 0.08));
      const p = new THREE.Group(); p.add(at(b, 0, -0.1, 0));
      p.position.copy(surf(V(x, -0.52, 0.85), 0.07));
      const ph = x * 9;
      g.add(tick(p, (t) => { p.rotation.z = Math.sin(t * 4 + ph) * 0.18; }));
    }
    return g;
  },
  lightsCrown: () => {
    const g = new THREE.Group();
    g.add(band(0.6, 0.045, metal('#cfd8e3', 0.3), -0.15, PI * 2, 0.08));
    const n = 9;
    for (let i = 0; i < n; i++) {
      const a = ((i - (n - 1) / 2) / (n - 1)) * 2.5;
      const d = V(Math.sin(a) * 0.78, 0.66, Math.cos(a) * 0.78);
      const raised = i === (n - 1) / 2;
      const h = raised ? 0.46 : 0.32;
      const c = new THREE.Group();
      const wax = shade(new THREE.CylinderGeometry(0.05, 0.055, h, 12).translate(0, h / 2, 0), 0.1, '#e8f1ff', '#6aa6ff');
      c.add(mesh(wax, mat('#ffffff', { r: 0.4 }), 0));
      c.add(at(mesh(new THREE.CylinderGeometry(0.075, 0.06, 0.04, 12), metal('#cfd8e3', 0.3), 0), 0, h, 0));
      const f = flame(0.13, '#fff3c4', '#ffb347'); f.position.y = h + 0.02; c.add(f);
      c.add(at(haloSprite('#ffd27a', 0.45, 0.6), 0, h + 0.09, 0));
      onSurf(c, d, 0.04);
      g.add(c);
    }
    return g;
  },
  sunnies: () => {
    // round sunglasses pushed up on the top of the head
    const g = spectacles(metal('#ffb703', 0.35), mat('#ff7b54', { r: 0.1, m: 0.4, op: 0.8 }), { r: 0.27, thick: 0.035, temples: false });
    g.position.set(0, 0.16, 0.06); g.rotation.x = -0.95;
    return g;
  },
  flowerLei: () => {
    const g = new THREE.Group();
    const colors = ['#ff5d8f', '#ffd166', '#ff8c42', '#f72585', '#fff1f8'];
    const n = 14;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * PI * 2;
      const fl = flower(colors[i % colors.length], 0.12);
      onSurf(fl, V(Math.cos(a), -0.55 + Math.sin(i * 1.7) * 0.03, Math.sin(a)), 0.02, i);
      g.add(fl);
    }
    return g;
  },
  wizardHat: () => {
    const g = new THREE.Group();
    const cloth = mat('#2b2d8c', { r: 0.85 });
    g.add(mesh(new THREE.CylinderGeometry(1.08, 1.1, 0.05, 48), cloth, 0.1));
    const R = headR(0.6);
    const prof: [number, number][] = [[R, 0], [R * 0.88, 0.28], [R * 0.66, 0.6], [R * 0.4, 0.95], [R * 0.18, 1.22], [R * 0.04, 1.38], [0, 1.4]];
    const bend = (y: number) => { const k = Math.max(0, y - 0.65); return { dz: -k * k * 0.75, dy: -k * k * 0.25 }; };
    const cone = lathe(prof, 30);
    const p = cone.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); const b = bend(y); p.setZ(i, p.getZ(i) + b.dz); p.setY(i, y + b.dy); }
    cone.computeVertexNormals();
    g.add(mesh(cone, cloth, 0.3));
    const bnd = mesh(new THREE.TorusGeometry(R * 1.0, 0.05, 8, 40).rotateX(PI / 2), GOLD(), 0); bnd.position.y = 0.07; g.add(bnd);
    const starM = mat('#ffe066', { r: 0.4, e: '#ffcf3f', ei: 0.5 });
    // stars + a moon on the cone's surface
    const rAt = (y: number) => { for (let i = 1; i < prof.length; i++) if (y <= prof[i][1]) { const [r0, y0] = prof[i - 1], [r1, y1] = prof[i]; return r0 + ((y - y0) / (y1 - y0)) * (r1 - r0); } return 0; };
    for (const [a, y, s] of [[0.35, 0.3, 0.1], [-0.55, 0.62, 0.08], [0.15, 0.95, 0.065]] as [number, number, number][]) {
      const rr = rAt(y) + 0.015, b = bend(y);
      const st = mesh(star3d(s, s * 0.45, 0.025), starM, 0); st.position.set(Math.sin(a) * rr, y + b.dy, Math.cos(a) * rr + b.dz); st.lookAt(st.position.clone().add(V(Math.sin(a), 0.25, Math.cos(a)))); g.add(st);
    }
    const moon = mesh(new THREE.TorusGeometry(0.1, 0.035, 6, 16, PI * 1.2), starM, 0); { const a = -0.15, y = 0.22, rr = rAt(y) + 0.03; moon.position.set(Math.sin(a) * rr, y, Math.cos(a) * rr); moon.rotation.z = 0.6; }
    g.add(moon);
    wear(g, 0.6, -0.18);
    return tick(g, (t) => { starM.emissiveIntensity = 0.4 + Math.sin(t * 3) * 0.2; });
  },
  longBeard: () => {
    // a long, fluffy white wizard beard below the smile: one soft lumpy volume, wavy like hair, ending in a little curl
    const g = new THREE.Group();
    const geo = new THREE.SphereGeometry(1, 36, 28);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const v = (y + 1) / 2; // 0 bottom … 1 top
      const w = 0.16 + 0.48 * Math.pow(v, 0.6);
      const ang = Math.atan2(z, x);
      const lump = 1 + 0.07 * Math.sin(ang * 7 + y * 9) + 0.04 * Math.sin(y * 23);
      x = x * w * lump; z = z * 0.26 * lump; y = y * 0.4;
      x += Math.sin(y * 10) * 0.03 * (1 - v);
      p.setXYZ(i, x, y, z);
    }
    geo.computeVertexNormals();
    const m = mesh(shade(geo, 0.25, '#ffffff', '#cdc6b6'), mat('#ffffff', { r: 0.95 }), 0);
    m.position.set(0.03, -0.7, 0.93); m.rotation.x = -0.3;
    g.add(m);
    // strands
    const lineM = mat('#d8d1c2', { r: 0.95 });
    for (const x of [-0.22, -0.08, 0.08, 0.22]) g.add(mesh(tube([V(x, -0.52, 1.0), V(x * 0.8 + 0.02, -0.72, 1.0), V(x * 0.4 + 0.03, -0.98, 0.88)], 0.012, 0.006, 10, 4, false), lineM, 0));
    const curl = mesh(tube(helix(0.06, 0.02, 1.2, 0.08, 20).map((q) => q.add(V(0.03, -1.1, 0.95))), 0.035, 0.012, 20, 6), mat('#efeae0', { r: 0.95 }), 0);
    g.add(curl);
    return g;
  },
  knightHelmet: () => {
    // an open-faced knight's helmet: a steel bowl with a gold crest and band, cheek plates at the sides
    const g = new THREE.Group();
    const steel = mat('#cdd6e0', { r: 0.3, m: 0.75 });
    const R = headR(0.42) + 0.02;
    g.add(mesh(lathe([[R, 0], [R * 1.01, 0.12], [R * 0.92, 0.36], [R * 0.66, 0.56], [R * 0.3, 0.66], [0, 0.68]], 40), steel, 0.25));
    const bnd = mesh(new THREE.TorusGeometry(R * 1.01, 0.05, 8, 48).rotateX(PI / 2), GOLD(), 0); bnd.position.y = 0.04; g.add(bnd);
    const ridge: THREE.Vector3[] = []; for (let i = 0; i <= 12; i++) { const a = 0.15 + (i / 12) * (PI - 0.3); ridge.push(V(0, Math.sin(a) * 0.66 + 0.02, Math.cos(a) * R * 1.0)); }
    g.add(mesh(tube(ridge, 0.055, 0.055, 24, 8, true), GOLD(), 0));
    for (const s of [-1, 1]) {
      const plate = mesh(ell(0.13, 0.42, 0.36), steel, 0.2); plate.position.set(s * R * 0.98, -0.3, 0.08); plate.rotation.z = s * 0.12;
      g.add(plate);
      g.add(at(mesh(ell(0.03, 0.03, 0.03, 8, 6), GOLD(), 0), s * (R * 0.98 + 0.12), -0.3, 0.12));
    }
    for (let i = 0; i < 12; i++) { const a = (i / 12) * PI * 2; g.add(at(mesh(ell(0.026, 0.026, 0.026, 8, 6), metal('#8b939c', 0.4), 0), Math.cos(a) * R * 1.03, 0.16, Math.sin(a) * R * 1.03)); }
    return wear(g, 0.42, -0.12);
  },
  plume: () => {
    const g = new THREE.Group();
    for (let i = 0; i < 7; i++) {
      const f = feather(0.85 - i * 0.05, 0.16, '#ff4d4d', '#b5001f');
      const h = group(f); h.rotation.set(-0.6 - i * 0.13, (i - 3) * 0.12, 0); g.add(h);
    }
    g.add(mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.1, 12), GOLD(), 0));
    g.position.set(0, 1.12, -0.06);
    return tick(g, (t) => { g.rotation.x = Math.sin(t * 2.4) * 0.06; g.rotation.z = Math.sin(t * 1.9) * 0.05; });
  },
  aviatorCap: () => {
    const g = new THREE.Group();
    const leather = mat('#7b4a2a', { r: 0.7, side: 'double' });
    g.add(hood(leather, mat('#f3e6cf', { r: 0.95 }), { R: 1.12, w: 0.84, yTop: 0.56, yBot: -0.7, bottom: -0.35, rim: 0.075 }));
    // ear flaps with a chin strap buckle
    for (const s of [-1, 1]) g.add(at(mesh(ell(0.12, 0.34, 0.3), leather, 0.15), s * 1.06, -0.22, 0.05, 0, 0, s * 0.12));
    for (const s of [-1, 1]) g.add(at(mesh(new THREE.BoxGeometry(0.1, 0.07, 0.04), GOLD(), 0), s * 1.1, -0.48, 0.12));
    return g;
  },
  goggles: () => {
    const g = new THREE.Group();
    const strap = mat('#3a2a20', { r: 0.8 });
    g.add(band(0.62, 0.05, strap, -0.38, PI * 2, 0.2));
    for (const s of [-1, 1]) {
      const lens = group(mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.14, 24).rotateX(PI / 2), metal('#b08d57', 0.35), 0.1), at(new THREE.Mesh(shade(new THREE.CircleGeometry(0.16, 24), 0), glass('#7fd3ff', 0.6)), 0, 0, 0.075));
      lens.position.copy(surf(V(s * 0.27, 0.72, 0.62), 0.2)); lens.lookAt(lens.position.clone().multiplyScalar(2).add(V(0, 0.4, 0)));
      g.add(lens);
    }
    g.add(mesh(tube([surf(V(-0.1, 0.74, 0.66), 0.22), surf(V(0, 0.76, 0.66), 0.25), surf(V(0.1, 0.74, 0.66), 0.22)], 0.03, 0.03, 6, 5), metal('#b08d57', 0.35), 0));
    return g;
  },
  spaceHelmet: () => {
    const g = new THREE.Group();
    const bubble = new THREE.Mesh(new THREE.SphereGeometry(1.3, 40, 28, 0, PI * 2, 0, PI * 0.82), mat('#d8f1ff', { r: 0.02, m: 0.1, op: 0.16, glass: true }));
    bubble.position.y = 0.05; bubble.renderOrder = 3;
    g.add(bubble);
    // a soft reflection streak on the glass
    const streak = new THREE.Mesh(new THREE.TorusGeometry(1.29, 0.02, 6, 30, 0.9), mat('#ffffff', { r: 0.1, op: 0.55 }));
    streak.position.set(0, 0.05, 0); streak.rotation.set(0.5, -0.4, 1.9); g.add(streak);
    const collar = mesh(new THREE.TorusGeometry(0.98, 0.12, 12, 40).rotateX(PI / 2), mat('#eef2f6', { r: 0.4 }), 0.1); collar.position.y = -0.82; g.add(collar);
    g.add(at(mesh(new THREE.TorusGeometry(0.98, 0.04, 8, 40).rotateX(PI / 2), gloss('#ff6b35'), 0), 0, -0.72, 0));
    const ant = group(mesh(tube([V(0, 0, 0), V(0, 0.32, 0)], 0.022, 0.018, 4, 6), SILVER()), at(mesh(ell(0.06, 0.06, 0.06), glow('#ff4d6d', 1.2), 0), 0, 0.35, 0));
    ant.position.set(0.55, 1.15, -0.2); ant.rotation.z = -0.35; g.add(ant);
    return tick(g, (t) => { const m = (ant.children[1] as THREE.Mesh).material as THREE.MeshStandardMaterial; m.emissiveIntensity = Math.sin(t * 5) > 0.3 ? 1.8 : 0.3; });
  },
  jetPack: () => {
    const g = new THREE.Group();
    const body = mat('#e9ecef', { r: 0.35, m: 0.3 });
    for (const s of [-1, 1]) {
      const tank = group(mesh(lathe([[0, -0.32], [0.16, -0.3], [0.18, -0.2], [0.18, 0.22], [0.12, 0.34], [0, 0.36]], 20), body, 0.25), at(mesh(new THREE.TorusGeometry(0.18, 0.025, 8, 24).rotateX(PI / 2), gloss('#ff6b35'), 0), 0, 0.1, 0));
      const noz = mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.12, 16), metal('#6c757d', 0.4)); noz.position.y = -0.38; tank.add(noz);
      const f = flame(0.22, '#fff1a8', '#ff6b1a'); f.rotation.x = PI; f.position.y = -0.42; tank.add(f);
      tank.position.set(s * 0.26, -0.05, -1.05); g.add(tank);
    }
    g.add(at(mesh(new THREE.BoxGeometry(0.34, 0.5, 0.1), body, 0.2), 0, -0.05, -0.97));
    return g;
  },
  robotAntenna: () => {
    const g = new THREE.Group();
    g.add(mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.08, 20), metal('#8a99a8', 0.3)));
    const spring = helix(0.04, 0.04, 4, 0.32, 60);
    g.add(mesh(tube(spring, 0.012, 0.012, 60, 5, false), metal('#c0c9d2', 0.3), 0));
    const ball = mesh(ell(0.08, 0.08, 0.08), glow('#46ffe7', 1.4), 0); ball.position.y = 0.38; g.add(ball, at(haloSprite('#46ffe7', 0.5, 0.7), 0, 0.38, 0));
    onSurf(g, V(0, 1, 0.05), -0.04);
    return tick(g, (t) => { g.rotation.z = Math.sin(t * 3.1) * 0.1; (ball.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.8 + Math.sin(t * 6) * 0.6; });
  },
  robotEars: () => {
    const g = new THREE.Group();
    for (const s of [-1, 1]) {
      const e = group(mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.12, 24).rotateZ(PI / 2), metal('#8a99a8', 0.3), 0.1), at(mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.05, 20).rotateZ(PI / 2), glow('#46ffe7', 0.9), 0), s * 0.07, 0, 0));
      for (let i = 0; i < 4; i++) { const a = (i / 4) * PI * 2 + PI / 4; e.add(at(mesh(ell(0.022, 0.022, 0.022, 6, 4), metal('#5b6672', 0.4), 0), s * 0.065, Math.cos(a) * 0.17, Math.sin(a) * 0.17)); }
      e.position.set(s * 0.98, 0.15, -0.05);
      g.add(e);
      const ph = s;
      tick(e, (t) => { e.rotation.x = t * 1.5 * ph; });
    }
    return g;
  },
  chestLight: () => {
    const g = new THREE.Group();
    const plate = new THREE.Shape(); plate.absarc(0, 0, 0.17, 0, PI * 2, false);
    const p = mesh(ext(plate, 0.04, 0.02, 16), metal('#8a99a8', 0.3), 0.05);
    const l = mesh(new THREE.CircleGeometry(0.11, 24), glow('#ff4d8f', 1.4), 0); l.position.z = 0.04;
    p.add(l);
    const heart = haloSprite('#ff4d8f', 0.6, 0.55); heart.position.z = 0.06; p.add(heart);
    onSurf(p, V(0.03, -0.62, 0.78), 0.02); p.rotateX(-PI / 2);
    g.add(p);
    return tick(g, (t) => { const k = 0.5 + 0.5 * Math.max(0, Math.sin(t * 2.6)) ** 3; (l.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.6 + k * 1.6; heart.material.opacity = 0.25 + k * 0.5; });
  },
  crown: () => crownPart(GOLD(), ['#e63946', '#3d8bfd', '#2ec4b6'], 0.62, 0.36, 5),
  royalCape: () => {
    const g = new THREE.Group();
    g.add(cape('#7b2cbf', '#f2d6ff', { m: mat('#6a1fae', { r: 0.55, side: 'double' }) }));
    // ermine trim along the top
    const trim: THREE.Vector3[] = []; for (let i = 0; i <= 16; i++) { const a = (i / 16) * 2.3 - 1.15; trim.push(V(Math.sin(a) * 1.08, 0.42, -Math.cos(a) * 1.03)); }
    g.add(mesh(tube(trim, 0.09, 0.09, 30, 10, true), mat('#fbf8f2', { r: 0.95 }), 0.1));
    for (let i = 0; i < 7; i++) { const a = (i / 6) * 2.0 - 1.0; g.add(at(mesh(ell(0.018, 0.04, 0.018, 6, 4), mat('#1d1b22', { r: 0.7 }), 0), Math.sin(a) * 1.16, 0.42, -Math.cos(a) * 1.11)); }
    return g;
  },
  unicornHorn: () => {
    const g = new THREE.Group();
    const horn = lathe([[0.18, 0], [0.15, 0.2], [0.11, 0.45], [0.06, 0.72], [0.0, 0.92]], 22);
    const p = horn.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), y = p.getY(i); const a = Math.atan2(z, x); const k = 1 + Math.sin(a * 2 + y * 22) * 0.09; p.setXYZ(i, x * k, y, z * k); }
    horn.computeVertexNormals();
    g.add(mesh(shade(horn, 0.1, '#fff6c2', '#ffc6ea'), mat('#ffffff', { r: 0.25, m: 0.35, e: '#ffe6a8', ei: 0.22 }), 0));
    g.add(at(haloSprite('#fff0c0', 0.8, 0.4), 0, 0.75, 0));
    g.position.copy(surf(V(0.02, 0.86, 0.48), -0.02)); g.rotation.x = 0.45;
    return g;
  },
  unicornMane: () => {
    const g = new THREE.Group();
    const colors = ['#ff8fb8', '#ffb86b', '#ffe66d', '#8de4af', '#7cc6ff', '#c3a6ff'];
    for (let i = 0; i < 12; i++) {
      const u = i / 11;
      const a = -0.2 + u * 2.3;
      const d = V(Math.sin(i * 1.3) * 0.12, Math.cos(a), -Math.sin(a));
      const c = colors[i % colors.length];
      const curl = tube([V(0, 0, 0), V(0.08, 0.18, -0.1), V(0.0, 0.32, -0.26), V(-0.12, 0.24, -0.38), V(-0.06, 0.1, -0.33)], 0.13, 0.03, 18, 10);
      const m = mesh(shade(curl, 0.1, mixHex(c, '#ffffff', 0.25), c), mat('#ffffff', { r: 0.6 }), 0);
      onSurf(m, d, 0.0);
      m.rotateY(i % 2 ? 0.7 : -0.7);
      g.add(m);
    }
    return tick(g, (t) => { g.children.forEach((c, i) => { c.rotation.z = Math.sin(t * 2 + i) * 0.06; }); });
  },
  ribsMark: () => {
    // a skeleton-costume ribcage on the back (the front and the face stay the owner's)
    const g = new THREE.Group();
    const bone = mat('#4a4453', { r: 0.6 });
    for (const s of [-1, 1]) for (let i = 0; i < 4; i++) {
      const y = 0.3 - i * 0.2;
      const pts: THREE.Vector3[] = [];
      for (let k = 0; k <= 5; k++) { const a = (k / 5) * 0.95; pts.push(surf(V(s * Math.sin(a), y - Math.sin((k / 5) * PI) * 0.05, -Math.cos(a)), 0.07)); }
      g.add(mesh(tube(pts, 0.045 - i * 0.004, 0.028, 12, 6), bone, 0));
    }
    const spine: THREE.Vector3[] = []; for (let k = 0; k <= 8; k++) { const y = 0.5 - k * 0.15; spine.push(surf(V(0, y, -Math.sqrt(Math.max(0.05, 1 - y * y))), 0.08)); }
    g.add(mesh(tube(spine, 0.05, 0.04, 16, 6), bone, 0));
    return g;
  },
  skullMask: () => {
    // a bone-white skull helmet worn over the top of the head, its own little skull face on the forehead
    const g = new THREE.Group();
    const bone = mat('#f3eee0', { r: 0.6 });
    const R = headR(0.45);
    const prof: [number, number][] = [[R, 0], [R * 1.02, 0.14], [R * 0.9, 0.38], [R * 0.6, 0.56], [0, 0.62]];
    g.add(mesh(lathe(prof, 36), bone, 0.3));
    const dark = mat('#25202c', { r: 0.7 });
    const onShell = (x: number, y: number, o: THREE.Object3D) => { const rr = y < 0.14 ? R * 1.01 : y < 0.38 ? R * (1.02 - ((y - 0.14) / 0.24) * 0.12) : R * 0.9; const z = Math.sqrt(Math.max(0.01, rr * rr - x * x)); o.position.set(x, y, z); o.lookAt(x * 2, y + 0.3, z * 2); return o; };
    for (const s of [-1, 1]) g.add(onShell(s * 0.26, 0.24, mesh(ell(0.15, 0.17, 0.04), dark, 0)));
    const nose = new THREE.Shape(); nose.moveTo(0, 0.06); nose.lineTo(0.05, -0.04); nose.lineTo(-0.05, -0.04); nose.lineTo(0, 0.06);
    g.add(onShell(0, 0.09, mesh(ext(nose, 0.02, 0.008, 2), dark, 0)));
    for (let i = -3; i <= 3; i++) g.add(onShell(i * 0.09, 0.02, mesh(new THREE.BoxGeometry(0.07, 0.08, 0.04), mat('#ffffff', { r: 0.5 }), 0.05)));
    return wear(g, 0.45, -0.1);
  },
  mohawk: (c) => {
    const g = new THREE.Group();
    const cols = [c.c0, '#ffd23f', c.c0, '#46ffe7', c.c0, '#ffd23f', c.c0, '#46ffe7'];
    for (let i = 0; i < 8; i++) {
      const u = i / 7, a = 0.25 + u * 1.9;
      const d = V(0, Math.sin(a), Math.cos(a));
      const h = 0.62 - Math.abs(u - 0.4) * 0.35;
      const spike = new THREE.ConeGeometry(0.17, h, 14); spike.translate(0, h / 2, 0); spike.scale(0.5, 1, 1);
      const m = mesh(shade(spike, 0.2, mixHex(cols[i], '#ffffff', 0.35), cols[i]), mat('#ffffff', { r: 0.45, e: cols[i], ei: 0.3 }), 0);
      onSurf(m, d, 0.0);
      g.add(m);
    }
    return g;
  },
  starShades: () => spectacles(gloss('#ff2e88'), mat('#ff9ccb', { r: 0.1, m: 0.3, op: 0.22 }), { r: 0.32, thick: 0.035, shape: 'star' }),
  samuraiHelmet: () => {
    const g = new THREE.Group();
    const lacquer = mat('#2a1a1a', { r: 0.35, m: 0.2 });
    const R = headR(0.5);
    g.add(mesh(lathe([[R, 0], [R, 0.1], [R * 0.9, 0.3], [R * 0.62, 0.48], [R * 0.28, 0.56], [0, 0.58]], 36), lacquer, 0.25));
    // ribs on the bowl
    for (let i = 0; i < 12; i++) { const a = (i / 12) * PI * 2; const pts: THREE.Vector3[] = []; for (let k = 0; k <= 6; k++) { const v = k / 6; const rr = R * (1 - v * 0.95) + 0.012; pts.push(V(Math.cos(a) * rr, 0.06 + Math.sin(v * PI * 0.5) * 0.52, Math.sin(a) * rr)); } g.add(mesh(tube(pts, 0.012, 0.01, 10, 4, false), GOLD(), 0)); }
    // the flared neck guard at the back and sides only
    for (let k = 0; k < 3; k++) {
      const r0 = R + 0.04 + k * 0.08, y = -0.04 - k * 0.13;
      const s = new THREE.CylinderGeometry(r0, r0 + 0.08, 0.12, 36, 1, true, PI * 0.32, PI * 1.36);
      g.add(at(mesh(s, mat(k % 2 ? '#7a1712' : '#b3261e', { r: 0.4, m: 0.15, side: 'double' }), 0.1), 0, y, 0));
    }
    // a little brim over the forehead + the golden crescent crest (kuwagata)
    const brim = new THREE.CylinderGeometry(R + 0.12, R + 0.14, 0.04, 36, 1, false, -PI * 0.3, PI * 0.6);
    g.add(at(mesh(brim, lacquer, 0.1), 0, 0.02, 0, 0.12, 0, 0));
    const crest = new THREE.Group();
    for (const s of [-1, 1]) crest.add(mesh(tube([V(0, 0, 0), V(s * 0.24, 0.2, 0.05), V(s * 0.38, 0.55, 0.02), V(s * 0.33, 0.8, -0.06)], 0.06, 0.018, 16, 8), GOLD(), 0));
    crest.add(at(mesh(ell(0.11, 0.11, 0.06), mat('#b3261e', { r: 0.4, m: 0.15 }), 0), 0, 0, 0.03));
    crest.position.set(0, 0.32, R * 0.9); crest.rotation.x = -0.25;
    g.add(crest);
    return wear(g, 0.5, -0.12);
  },
  samuraiMask: () => {
    // a lacquered chin guard below the smile (the face stays in view)
    const g = new THREE.Group();
    const red = mat('#b3261e', { r: 0.4, m: 0.15, side: 'double' });
    const guard = new THREE.SphereGeometry(1.07, 30, 8, PI / 2 - 0.62, 1.24, PI * 0.71, PI * 0.17);
    g.add(mesh(guard, red, 0.15));
    const edge: THREE.Vector3[] = []; for (let i = 0; i <= 14; i++) { const a = -0.62 + (i / 14) * 1.24; edge.push(surf(V(Math.sin(a), -0.6, Math.cos(a)), 0.09)); }
    g.add(mesh(tube(edge, 0.03, 0.03, 24, 6, true), GOLD(), 0));
    return g;
  },
  neonHalo: (c) => {
    const m = glow(c.c0, 1.8);
    const g = group(mesh(new THREE.TorusGeometry(0.55, 0.04, 10, 48).rotateX(PI / 2), m, 0), at(haloSprite(c.c0, 1.6, 0.35), 0, 0, 0));
    g.position.y = 1.2;
    return tick(g, (t) => { g.position.y = 1.2 + Math.sin(t * 2.2) * 0.05; m.emissiveIntensity = 1.4 + Math.sin(t * 8) * 0.25 + (Math.sin(t * 23) > 0.97 ? -1 : 0); });
  },
  neonVisor: (c) => {
    const g = new THREE.Group();
    const curve: THREE.Vector3[] = []; for (let i = 0; i <= 12; i++) { const a = -1.15 + (i / 12) * 2.3; curve.push(V(Math.sin(a) * 1.08, 0.2, Math.cos(a) * 1.04)); }
    // a see-through band across the eyes
    const pos: number[] = [], idx: number[] = [];
    for (let i = 0; i <= 12; i++) for (const y of [-0.12, 0.5]) { const p = curve[i]; pos.push(p.x, y + (p.y - 0.2), p.z); }
    for (let i = 0; i < 12; i++) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); bg.setIndex(idx); bg.computeVertexNormals();
    const vis = new THREE.Mesh(shade(bg, 0), mat(c.c0, { r: 0.05, op: 0.22, side: 'double', e: c.c0, ei: 0.3 })); vis.renderOrder = 2;
    g.add(vis);
    const rim = glow(c.c0, 2);
    g.add(mesh(tube(curve.map((p) => V(p.x, 0.5, p.z)), 0.018, 0.018, 24, 5, false), rim, 0), mesh(tube(curve.map((p) => V(p.x, -0.12, p.z)), 0.018, 0.018, 24, 5, false), rim, 0));
    return tick(g, (t) => { rim.emissiveIntensity = 1.6 + Math.sin(t * 7) * 0.4; });
  },
  lionMane: (c) => {
    const g = new THREE.Group();
    const cols = [c.c0, c.c1, '#ff7b00', c.c0];
    const n = 22, rnd = rng(31);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * PI * 2;
      const tuft = smooth(puff(3, i + 4, 0.17, 0.1));
      const m = mesh(shade(tuft, 0.15, mixHex(cols[i % cols.length], '#ffffff', 0.2), cols[i % cols.length]), mat('#ffffff', { r: 0.95 }), 0);
      m.position.set(Math.cos(a) * (1.02 + rnd() * 0.06), Math.sin(a) * (0.98 + rnd() * 0.05), -0.25);
      g.add(m);
    }
    return tick(g, (t) => { g.children.forEach((m, i) => { m.scale.setScalar(1 + Math.sin(t * 3 + i * 0.7) * 0.05); }); });
  },
  lionBrows: () => {
    // the lion-dance headpiece: a golden forehead band with a round mirror and pom-poms (no eyebrows)
    const g = new THREE.Group();
    const gold = GOLD();
    const pts: THREE.Vector3[] = []; for (let i = 0; i <= 12; i++) { const a = -0.9 + (i / 12) * 1.8; pts.push(surf(V(Math.sin(a), 0.58, Math.cos(a)), 0.04)); }
    g.add(mesh(tube(pts, 0.05, 0.05, 24, 8, true), gold, 0));
    const mirror = group(mesh(new THREE.TorusGeometry(0.11, 0.03, 8, 24), gold, 0), at(mesh(new THREE.CircleGeometry(0.1, 24), metal('#e9f3ff', 0.08), 0), 0, 0, 0.005));
    onSurf(mirror, V(0.02, 0.66, 0.75), 0.06); mirror.rotateX(-PI / 2); g.add(mirror);
    for (const [x, c] of [[-0.42, '#ff3b30'], [0.46, '#ff3b30'], [-0.2, '#ffcc00'], [0.24, '#ffcc00']] as [number, string][]) g.add(onSurf(mesh(smooth(puff(5, x * 10 + 3, 0.08, 0.05)), mat(c, { r: 0.95 }), 0), V(x, 0.72, 0.62), 0.04));
    return g;
  },
  shellCrown: () => {
    const g = new THREE.Group();
    g.add(band(0.6, 0.04, mat('#f7d9c4', { r: 0.5 }), -0.15, PI * 2, 0.06));
    const cols = ['#ffd6e8', '#ffe8cc', '#e0f7ff', '#ffd6e8', '#fff3c4'];
    for (let i = 0; i < 5; i++) {
      const a = -0.85 + i * 0.425;
      const sh = shellGeo(0.27 - Math.abs(i - 2) * 0.035);
      const m = mesh(shade(sh, 0.2, '#ffffff', cols[i]), mat('#ffffff', { r: 0.35, side: 'double' }), 0);
      onSurf(m, V(Math.sin(a) * 0.8, 0.66, Math.cos(a) * 0.8), 0.04);
      m.rotateX(-0.35);
      g.add(m);
    }
    g.add(onSurf(mesh(ell(0.08, 0.08, 0.08), mat('#fffaf0', { r: 0.12, m: 0.2 }), 0), V(0, 0.7, 0.72), 0.3));
    return g;
  },
  seaPearls: () => {
    const g = new THREE.Group();
    const pearl = mat('#fffaf0', { r: 0.12, m: 0.15 });
    const n = 22;
    for (let i = 0; i < n; i++) { const a = (i / n) * PI * 2; const p = mesh(ell(0.07, 0.07, 0.07, 10, 8), pearl, 0); p.position.copy(surf(V(Math.cos(a), -0.5 - Math.max(0, Math.sin(a)) * 0.14, Math.sin(a)), 0.07)); g.add(p); }
    g.add(onSurf(mesh(ell(0.12, 0.12, 0.12, 14, 10), mat('#ffd1e8', { r: 0.1, m: 0.25 }), 0), V(0, -0.68, 0.76), 0.1));
    return g;
  },
  goldHalo: () => {
    const m = mat('#ffd54a', { r: 0.25, m: 0.8, e: '#ffb300', ei: 0.7 });
    const g = group(mesh(new THREE.TorusGeometry(0.5, 0.055, 12, 48).rotateX(PI / 2), m, 0), at(haloSprite('#ffd27a', 1.7, 0.45), 0, 0, 0));
    g.position.y = 1.18;
    return tick(g, (t) => { g.position.y = 1.18 + Math.sin(t * 1.8) * 0.05; g.rotation.z = Math.sin(t * 1.1) * 0.08; m.emissiveIntensity = 0.6 + Math.sin(t * 2.4) * 0.2; });
  },
  ghostWisp: (c) => {
    const g = new THREE.Group();
    const m = mat(c.c0, { r: 0.4, op: 0.6, e: c.c1, ei: 0.45 });
    const tail = tube([V(0.3, -0.62, -0.55), V(0.75, -0.88, -0.6), V(1.05, -0.62, -0.35), V(1.2, -0.25, -0.2), V(1.15, 0.0, -0.1)], 0.4, 0.02, 34, 14);
    const t = new THREE.Mesh(shade(tail, 0), m); t.renderOrder = 1;
    g.add(t);
    g.add(at(haloSprite(c.c1, 3.4, 0.4), 0, 0, -0.7));
    const flames = new THREE.Group();
    for (let i = 0; i < 2; i++) { const f = group(mesh(shade(lathe([[0, 0], [0.1, 0.06], [0.11, 0.16], [0.05, 0.28], [0, 0.34]], 12), 0, '#ffffff', c.c1), mat('#ffffff', { r: 0.4, op: 0.75, e: c.c1, ei: 0.8 }), 0), haloSprite(c.c1, 0.5, 0.5)); flames.add(f); }
    g.add(flames);
    return tick(g, (time) => {
      t.rotation.y = Math.sin(time * 1.3) * 0.18; t.rotation.z = Math.sin(time * 1.7) * 0.08;
      flames.children.forEach((f, i) => { const a = time * 0.8 + i * PI; f.position.set(Math.cos(a) * 1.35, 0.25 + Math.sin(time * 1.6 + i) * 0.2, Math.sin(a) * 1.1); f.rotation.z = Math.sin(time * 4 + i) * 0.2; });
    });
  },
  dragonHorns: () => {
    const g = new THREE.Group();
    const horn = mat('#fff3d6', { r: 0.45 });
    for (const s of [-1, 1]) g.add(onSurf(mesh(shade(tube([V(0, 0, 0), V(s * 0.08, 0.2, -0.08), V(s * 0.1, 0.38, -0.24), V(s * 0.05, 0.48, -0.4)], 0.1, 0.012, 18, 10), 0.15, '#fffaf0', '#c8a46b'), horn, 0), V(s * 0.42, 0.9, 0.1), -0.08));
    // a row of soft spikes down the back
    const spike = mat('#f6b73c', { r: 0.5 });
    for (let i = 0; i < 6; i++) { const a = 0.3 + i * 0.32; const d = V(0, Math.cos(a), -Math.sin(a)); const s = new THREE.ConeGeometry(0.08, 0.2 - i * 0.015, 10); s.translate(0, 0.08, 0); s.scale(0.5, 1, 1); g.add(onSurf(mesh(s, spike, 0.1), d, -0.03)); }
    return g;
  },
  dragonWings: (c) => wings((s) => {
    const w = new THREE.Group();
    const sh = new THREE.Shape();
    sh.moveTo(0, 0); sh.quadraticCurveTo(0.3, 0.45, 0.95, 0.55); sh.quadraticCurveTo(0.88, 0.25, 0.92, 0.05);
    sh.quadraticCurveTo(0.74, 0.12, 0.62, -0.05); sh.quadraticCurveTo(0.48, 0.05, 0.36, -0.12); sh.quadraticCurveTo(0.2, -0.02, 0, 0);
    const memb = new THREE.Mesh(shade(new THREE.ShapeGeometry(sh, 12), 0.1, mixHex(c.c0, '#ffffff', 0.1), c.c1), mat('#ffffff', { r: 0.6, side: 'double' }));
    memb.castShadow = true;
    const bones = mat(mixHex(c.c1, '#000000', 0.25), { r: 0.6 });
    const ribs = [V(0.95, 0.55, 0), V(0.92, 0.05, 0), V(0.62, -0.05, 0), V(0.36, -0.12, 0)].map((tip) => mesh(tube([V(0, 0, 0.004), tip.clone().multiplyScalar(0.5).add(V(0, 0.08, 0.004)), tip.clone().setZ(0.004)], 0.025, 0.008, 10, 5), bones, 0));
    w.add(memb, ...ribs);
    w.scale.set(s, 1, 1);
    w.rotation.set(0, s > 0 ? -0.3 : 0.3, s * 0.2);
    return w;
  }, { y: 0.35, spread: 0.45, speed: 3.2, amp: 0.3, back: -0.75 }),
  dragonTail: (c) => {
    const g = new THREE.Group();
    const pts = [V(0, -0.7, -0.85), V(0.2, -0.9, -1.3), V(0.55, -0.85, -1.55), V(0.85, -0.6, -1.6)];
    g.add(mesh(shade(tube(pts, 0.16, 0.05, 24, 10), 0.15, c.c0, c.c1), mat('#ffffff', { r: 0.7 }), 0));
    const spade = new THREE.Shape(); spade.moveTo(0, 0); spade.quadraticCurveTo(0.16, 0.08, 0.06, 0.24); spade.lineTo(0, 0.18); spade.lineTo(-0.06, 0.24); spade.quadraticCurveTo(-0.16, 0.08, 0, 0);
    const sp = mesh(ext(spade, 0.04, 0.015, 8), mat('#f6b73c', { r: 0.5 }), 0); sp.position.set(0.85, -0.6, -1.6); sp.rotation.set(0, 1.0, -0.7);
    g.add(sp);
    return tick(g, (t) => { g.rotation.y = Math.sin(t * 1.4) * 0.18; });
  },
  rainbowArc: () => {
    const g = new THREE.Group();
    const cols = ['#ff5d5d', '#ffa94d', '#ffe066', '#69db7c', '#4dabf7', '#9775fa'];
    cols.forEach((c, i) => g.add(mesh(new THREE.TorusGeometry(0.95 - i * 0.07, 0.04, 8, 40, PI), mat(c, { r: 0.4, e: c, ei: 0.15 }), 0)));
    const cloudM = mat('#ffffff', { r: 0.9 });
    for (const s of [-1, 1]) g.add(at(mesh(smooth(puff(5, s + 9, 0.14, 0.14)), cloudM, 0.1), s * 0.78, 0.0, 0));
    g.position.set(0, 0.55, -0.4); g.rotation.x = -0.25;
    return tick(g, (t) => { g.position.y = 0.55 + Math.sin(t * 1.5) * 0.03; });
  },
  phoenixCrest: () => {
    const g = new THREE.Group();
    for (let i = 0; i < 7; i++) {
      const f = feather(0.8 - Math.abs(i - 3) * 0.08, 0.15, '#ff3d00', '#ffd54a', true);
      const h = group(f); h.rotation.set(-0.35 - Math.abs(i - 3) * 0.05, 0, (i - 3) * 0.24); g.add(h);
    }
    g.add(at(haloSprite('#ffb347', 1.2, 0.35), 0, 0.4, 0));
    g.position.set(0, 0.98, 0.06);
    return tick(g, (t) => { g.children.forEach((c, i) => { if (c instanceof THREE.Group) c.rotation.x = -0.35 - Math.abs(i - 3) * 0.05 + Math.sin(t * 4 + i) * 0.06; }); });
  },
  phoenixWings: () => wings((s) => {
    const w = new THREE.Group();
    for (let i = 0; i < 8; i++) {
      const f = feather(1.05 - i * 0.07, 0.17, '#ff3d00', '#ffd54a', true);
      const h = group(f); h.rotation.set(0, 0, s * (-0.25 - i * 0.2)); w.add(h);
    }
    w.add(at(haloSprite('#ff8a3d', 1.5, 0.25), s * 0.45, 0.2, 0));
    return w;
  }, { y: 0.3, spread: 0.5, speed: 2.6, amp: 0.3, back: -0.74 }),
  iceCrown: () => {
    const g = new THREE.Group();
    const ice = mat('#8fd8ff', { r: 0.06, m: 0.15, op: 0.88, e: '#5cc8ff', ei: 0.35, flat: true });
    g.add(band(0.6, 0.05, mat('#cfefff', { r: 0.1, m: 0.2 }), -0.15, PI * 2, 0.06));
    for (let i = 0; i < 9; i++) {
      const a = -1.3 + (i / 8) * 2.6;
      const h = 0.5 - Math.abs(i - 4) * 0.06;
      const sp = new THREE.ConeGeometry(0.085, h, 6); sp.translate(0, h / 2, 0);
      g.add(onSurf(mesh(sp, ice, 0), V(Math.sin(a) * 0.82, 0.7, Math.cos(a) * 0.82), 0.04));
    }
    g.add(at(haloSprite('#9fe3ff', 1.4, 0.35), 0, 1.0, 0.4));
    return g;
  },
  iceCape: () => cape('#bfe9ff', '#ffffff', { m: mat('#bfe9ff', { r: 0.12, m: 0.1, op: 0.72, e: '#7fd3ff', ei: 0.18, side: 'double' }), im: mat('#ffffff', { r: 0.2, op: 0.6 }), wave: 0.6 }),
  boltCrest: () => {
    const s = new THREE.Shape(); s.moveTo(0.05, 0.62); s.lineTo(-0.16, 0.24); s.lineTo(0.0, 0.24); s.lineTo(-0.1, -0.02); s.lineTo(0.18, 0.34); s.lineTo(0.02, 0.34); s.lineTo(0.16, 0.62); s.lineTo(0.05, 0.62);
    const m = glow('#ffe94d', 1.0);
    const b = mesh(ext(s, 0.1, 0.03, 4), m, 0); b.scale.setScalar(1.6);
    const g = group(b, at(haloSprite('#fff27a', 1.4, 0.4), 0, 0.5, 0));
    g.position.set(0.05, 0.9, 0.05); g.rotation.z = -0.15;
    return tick(g, (t) => { m.emissiveIntensity = 0.8 + (Math.sin(t * 13) > 0.85 ? 1.5 : 0) + Math.sin(t * 3) * 0.2; });
  },
  cloudCape: () => {
    const g = new THREE.Group();
    const m = mat('#7c86a8', { r: 0.95 });
    const rnd = rng(14);
    for (let i = 0; i < 9; i++) {
      const a = -1.0 + (i % 5) * 0.5, row = i < 5 ? 0 : 1;
      const c = mesh(smooth(puff(4, i + 20, 0.2, 0.12)), m, 0.2);
      c.position.set(Math.sin(a) * (1.05 + row * 0.15), 0.2 - row * 0.45 - rnd() * 0.1, -Math.cos(a) * (1.0 + row * 0.15));
      g.add(c);
    }
    return tick(g, (t) => { g.children.forEach((c, i) => { c.position.y += Math.sin(t * 1.5 + i) * 0.0008; }); });
  },
  titanCrown: () => crownPart(GOLD(), ['#7a4be8', '#e63946', '#7a4be8', '#ffd23f', '#7a4be8'], 0.66, 0.5, 7, true),
  titanShoulders: () => {
    const g = new THREE.Group();
    const gold = GOLD(), gem = gloss('#7a4be8');
    for (const s of [-1, 1]) {
      const p = new THREE.Group();
      p.add(mesh(new THREE.SphereGeometry(0.42, 24, 14, 0, PI * 2, 0, PI * 0.5).scale(1, 0.55, 1), gold, 0.2));
      p.add(at(mesh(new THREE.TorusGeometry(0.42, 0.035, 8, 30).rotateX(PI / 2), metal('#b07d1e', 0.35), 0), 0, 0, 0));
      p.add(at(mesh(ell(0.08, 0.08, 0.05), gem, 0), 0, 0.2, 0.15, -0.6, 0, 0));
      for (let i = 0; i < 3; i++) { const sp = new THREE.ConeGeometry(0.05, 0.18, 8); sp.translate(0, 0.09, 0); p.add(at(mesh(sp, gold, 0.1), (i - 1) * 0.18, 0.2, -0.05, -0.2, 0, -(i - 1) * 0.3)); }
      p.position.copy(surf(V(s, 0.12, -0.05), -0.08)); p.rotation.z = -s * 1.15;
      g.add(p);
    }
    return g;
  },
  // ===== mythic =====
  nebulaRing: (c) => {
    const g = new THREE.Group();
    const ring = new THREE.RingGeometry(1.25, 1.75, 64, 3).rotateX(-PI / 2);
    const p = ring.attributes.position, cc: number[] = [];
    const a = col(c.c0), b = col('#ff7ad9'), tmp = new THREE.Color();
    for (let i = 0; i < p.count; i++) { const r = Math.hypot(p.getX(i), p.getZ(i)); const k = (r - 1.25) / 0.5; tmp.copy(a).lerp(b, k); const fade = Math.sin(k * PI); cc.push(tmp.r * fade, tmp.g * fade, tmp.b * fade); }
    ring.setAttribute('color', new THREE.Float32BufferAttribute(cc, 3));
    const rm = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.75, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false });
    const rmesh = new THREE.Mesh(ring, rm); rmesh.userData.ownMaterial = true;
    g.add(rmesh);
    const dots = new THREE.Group();
    const rnd = rng(77);
    for (let i = 0; i < 18; i++) { const s = haloSprite(i % 3 ? '#ffffff' : c.c0, 0.12 + rnd() * 0.1, 0.9); const ang = rnd() * PI * 2, r = 1.3 + rnd() * 0.4; s.position.set(Math.cos(ang) * r, (rnd() - 0.5) * 0.05, Math.sin(ang) * r); dots.add(s); }
    g.add(dots);
    g.rotation.set(0.35, 0, 0.2);
    return tick(g, (t) => { rmesh.rotation.y = t * 0.3; dots.rotation.y = t * 0.45; });
  },
  orbitStars: (c) => {
    const g = new THREE.Group();
    const cols = ['#ffffff', c.c0, '#ffe066'];
    const stars: THREE.Object3D[] = [];
    for (let i = 0; i < 3; i++) {
      const s = group(mesh(star3d(0.09, 0.04, 0.04), mat(cols[i], { r: 0.3, e: cols[i], ei: 1.1 }), 0), haloSprite(cols[i], 0.45, 0.6));
      g.add(s); stars.push(s);
    }
    return tick(g, (t) => { stars.forEach((s, i) => { const a = t * (0.9 + i * 0.25) + (i * PI * 2) / 3; const r = 1.45 + i * 0.08; s.position.set(Math.cos(a) * r, 0.35 + Math.sin(a * 2 + i) * 0.3, Math.sin(a) * r * 0.85); s.rotation.z = t * 2; }); });
  },
  auroraVeil: (c) => {
    const g = new THREE.Group();
    const cols = 28, rows = 4;
    const P: number[] = [], C: number[] = [], I: number[] = [], base: number[] = [];
    const ca = col(c.c0), cb = col(c.c1), cp = col('#ff7ad9'), tmp = new THREE.Color();
    for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) {
      const u = i / cols, v = j / rows, a = -2.0 + u * 4.0;
      const x = Math.sin(a) * 1.28, z = -Math.cos(a) * 1.1 - 0.1, y = 0.1 + Math.sin(u * PI) * 0.75 + v * 0.55;
      P.push(x, y, z); base.push(x, y, z);
      tmp.copy(ca).lerp(cb, u).lerp(cp, Math.max(0, Math.sin(u * 9)) * 0.35 * v);
      const alpha = Math.sin(v * PI) ** 0.8 * Math.min(1, Math.sin(u * PI) * 2.2) * 0.85;
      C.push(tmp.r, tmp.g, tmp.b, alpha);
    }
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const a = j * (cols + 1) + i, b = a + cols + 1; I.push(a, b, a + 1, b, b + 1, a + 1); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(C, 4)); geo.setIndex(I);
    const m = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, side: THREE.DoubleSide, depthWrite: false });
    const mm = new THREE.Mesh(geo, m); mm.userData.ownMaterial = true; mm.renderOrder = 2;
    g.add(mm);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    return tick(g, (t) => {
      for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) { const k = j * (cols + 1) + i; pos.setY(k, base[k * 3 + 1] + Math.sin(t * 1.4 + i * 0.5) * 0.08 * (j / rows + 0.3)); pos.setZ(k, base[k * 3 + 2] + Math.sin(t * 1.1 + i * 0.35) * 0.06); }
      pos.needsUpdate = true;
    });
  },
  eclipseCorona: (c) => {
    const g = new THREE.Group();
    const light = col(c.c0).getHSL({ h: 0, s: 0, l: 0 }).l > col(c.c1).getHSL({ h: 0, s: 0, l: 0 }).l ? c.c0 : c.c1;
    const disc = new THREE.Mesh(new THREE.CircleGeometry(1.25, 48), new THREE.MeshBasicMaterial({ color: '#0b0812' }));
    disc.position.z = -0.75; disc.userData.ownMaterial = true;
    const rays = new THREE.Group();
    const rm = glow(light, 1.6);
    for (let i = 0; i < 16; i++) { const a = (i / 16) * PI * 2; const s = new THREE.ConeGeometry(0.06, i % 2 ? 0.4 : 0.6, 6); s.translate(0, (i % 2 ? 0.2 : 0.3), 0); const m = mesh(s, rm, 0); m.position.set(Math.cos(a) * 1.3, Math.sin(a) * 1.3, -0.78); m.rotation.z = a - PI / 2; rays.add(m); }
    const ring = mesh(new THREE.TorusGeometry(1.28, 0.05, 10, 64), rm, 0); ring.position.z = -0.76;
    g.add(disc, ring, rays, at(haloSprite(light, 4.2, 0.4), 0, 0, -0.85));
    return tick(g, (t) => { rays.rotation.z = t * 0.2; rm.emissiveIntensity = 1.3 + Math.sin(t * 2.5) * 0.35; });
  },
  prismCrystals: () => {
    const g = new THREE.Group();
    const cols = ['#9fdcff', '#ffb3ec', '#b9f5a0', '#ffe48a', '#b5bcff'];
    const rnd = rng(3);
    for (let i = 0; i < 8; i++) {
      const h = 0.4 + rnd() * 0.35;
      const cr = new THREE.CylinderGeometry(0.09, 0.11, h, 6); cr.translate(0, h / 2, 0);
      const tip = new THREE.ConeGeometry(0.09, 0.18, 6); tip.translate(0, h + 0.09, 0);
      const geo = merge([cr, tip]);
      const m = mesh(shade(geo, 0.1, '#ffffff', cols[i % cols.length]), mat('#ffffff', { r: 0.05, m: 0.3, op: 0.9, e: cols[i % cols.length], ei: 0.3, flat: true }), 0);
      const d = V((rnd() - 0.5) * 1.1, 1, (rnd() - 0.4) * 0.8);
      onSurf(m, d, -0.02); m.rotateZ((rnd() - 0.5) * 0.6); m.rotateX((rnd() - 0.5) * 0.5);
      g.add(m);
    }
    g.add(at(haloSprite('#ffffff', 1.6, 0.3), 0, 1.15, 0));
    return tick(g, (t) => { g.children.forEach((c, i) => { if (c instanceof THREE.Mesh) (c.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.25 + Math.max(0, Math.sin(t * 2 + i * 1.3)) * 0.55; }); });
  },
  omegaSigil: (c) => {
    const g = new THREE.Group();
    const m = glow(c.c0, 1.8);
    const arc = mesh(new THREE.TorusGeometry(0.26, 0.05, 10, 40, PI * 1.55), m, 0); arc.rotation.z = -PI * 0.275; // the gap at the bottom
    const feet = [-1, 1].map((s) => at(mesh(new THREE.BoxGeometry(0.16, 0.05, 0.05), m, 0), s * 0.22, -0.21, 0));
    const runes = new THREE.Group();
    for (let i = 0; i < 6; i++) { const a = (i / 6) * PI * 2; const r = mesh(new THREE.BoxGeometry(0.04, 0.12, 0.02), m, 0); r.position.set(Math.cos(a) * 0.48, Math.sin(a) * 0.48, 0); r.rotation.z = a; runes.add(r); }
    const s = group(arc, ...feet, runes, haloSprite(c.c0, 1.5, 0.45));
    s.position.y = 1.45; s.scale.setScalar(1.35);
    g.add(s);
    return tick(g, (t) => { s.rotation.y = t * 0.9; runes.rotation.z = -t * 0.6; s.position.y = 1.45 + Math.sin(t * 1.7) * 0.06; m.emissiveIntensity = 1.4 + Math.sin(t * 4) * 0.4; });
  },
};

// ---------- pieces shared by several parts ----------
function knitScarf(a: string, b: string): THREE.Group {
  const g = new THREE.Group();
  const R = 0.93, y = -0.46;
  const torus = new THREE.TorusGeometry(R, 0.1, 12, 56).rotateX(PI / 2);
  // knitted stripes: colour by angle
  const pos = torus.attributes.position, c: number[] = [], ca = col(a), cb = col(b);
  for (let i = 0; i < pos.count; i++) { const ang = Math.atan2(pos.getZ(i), pos.getX(i)); const k = Math.sin(ang * 9) > 0 ? ca : cb; const rib = 0.88 + 0.12 * Math.abs(Math.sin(ang * 70)); c.push(k.r * rib, k.g * rib, k.b * rib); }
  torus.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));
  const ring = mesh(torus, mat('#ffffff', { r: 0.95 }), 0); ring.position.y = y; ring.rotation.x = 0.16;
  g.add(ring);
  // two hanging ends with fringe
  for (const [x, len, ph] of [[0.35, 0.42, 0], [0.55, 0.32, 1]] as [number, number, number][]) {
    const end = new THREE.Group();
    const box = new THREE.BoxGeometry(0.2, len, 0.06, 1, 6, 1); box.translate(0, -len / 2, 0);
    const bp = box.attributes.position, bc: number[] = [];
    for (let i = 0; i < bp.count; i++) { const k = Math.sin((bp.getY(i) / len) * PI * 4) > 0 ? ca : cb; bc.push(k.r, k.g, k.b); }
    box.setAttribute('color', new THREE.Float32BufferAttribute(bc, 3));
    end.add(mesh(box, mat('#ffffff', { r: 0.95 }), 0));
    for (let i = 0; i < 4; i++) end.add(at(mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.08, 4), mat(b, { r: 0.95 }), 0), -0.075 + i * 0.05, -len - 0.04, 0));
    end.position.set(x, y - 0.05, 0.82 - x * 0.2); end.rotation.set(0.25, 0, 0.1);
    g.add(tick(end, (t) => { end.rotation.x = 0.25 + Math.sin(t * 2.2 + ph) * 0.06; }));
  }
  return g;
}
function braidBeard(c0: string, c1: string, len: number, wizard = false): THREE.Group {
  const g = new THREE.Group();
  const m = mat('#ffffff', { r: 0.95 });
  // a fluffy mass under the mouth, then a braid (or a long wavy wizard beard)
  const mass = smooth(puff(9, wizard ? 21 : 5, 0.2, 0.32)); mass.scale(1.15, 0.8, 0.55);
  g.add(at(mesh(shade(mass, 0.2, c0, c1), m, 0), 0.03, -0.62, 0.78));
  if (wizard) {
    const pts = [V(0.03, -0.6, 0.86), V(0.06, -0.85, 1.0), V(-0.04, -0.98, 1.12), V(0.08, -0.96, 1.3)];
    g.add(mesh(shade(tube(pts, 0.24, 0.04, 24, 12), 0.1, c0, c1), m, 0));
  } else for (const s of [-1, 1]) {
    const braid = new THREE.Group();
    for (let i = 0; i < 4; i++) braid.add(at(mesh(ell(0.07 - i * 0.008, 0.075, 0.06), mat(c0, { r: 0.9 }), 0.1), 0, -i * 0.11, 0));
    braid.add(at(mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.05, 10), GOLD(), 0), 0, -0.45, 0));
    braid.position.set(0.03 + s * 0.2, -0.72, 0.95); braid.rotation.z = s * 0.15;
    g.add(braid);
  }
  void len;
  return g;
}
function flower(c: string, size: number): THREE.Group {
  const g = new THREE.Group();
  const pm = mat('#ffffff', { r: 0.55, side: 'double' });
  for (let i = 0; i < 5; i++) {
    const p = mesh(shade(bentLeaf(size * 0.55, size, -0.3, 0.006), 0, mixHex(c, '#ffffff', 0.35), c), pm, 0);
    p.rotation.set(-PI / 2 + 0.4, 0, (i / 5) * PI * 2);
    const h = group(p); h.rotation.x = PI / 2; g.add(h);
  }
  g.add(at(mesh(ell(size * 0.25, size * 0.15, size * 0.25, 10, 6), gloss('#ffd23f'), 0), 0, size * 0.05, 0));
  return g;
}
function shellGeo(s: number): THREE.BufferGeometry {
  // a scallop: a fan of ridges
  const g = new THREE.CircleGeometry(s, 24, PI * 0.08, PI * 0.84);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), a = Math.atan2(y, x), r = Math.hypot(x, y); p.setZ(i, Math.cos(a * 18) * 0.012 * (r / s) + (r / s) * (r / s) * 0.05); }
  g.computeVertexNormals();
  return g;
}
function crownPart(gold: THREE.Material, gems: string[], R: number, h: number, points: number, grand = false): THREE.Group {
  const g = new THREE.Group();
  const prof: [number, number][] = [[R, 0], [R * 1.02, 0.03], [R * 1.02, h * 0.35], [R * 1.0, h * 0.4], [R * 0.97, h * 0.38], [R * 0.97, 0.02], [R * 0.95, 0]];
  g.add(mesh(lathe(prof, 40), gold, 0.2));
  for (let i = 0; i < points; i++) {
    const a = (i / points) * PI * 2 + PI / 2;
    const tall = grand && i % 2 === 0 ? 1.35 : 1;
    const sp = new THREE.ConeGeometry(0.1, h * 0.75 * tall, 4); sp.translate(0, h * 0.35 + (h * 0.75 * tall) / 2, 0); sp.rotateY(PI / 4);
    g.add(at(mesh(sp, gold, 0.1), Math.cos(a) * R * 0.98, 0, Math.sin(a) * R * 0.98));
    g.add(at(mesh(ell(0.045, 0.045, 0.045, 10, 8), gloss('#fff6d6'), 0), Math.cos(a) * R * 0.98, h * 0.35 + h * 0.75 * tall + 0.02, Math.sin(a) * R * 0.98));
    const gem = mesh(new THREE.OctahedronGeometry(0.065, 0).scale(1, 1.3, 0.6), mat(gems[i % gems.length], { r: 0.1, m: 0.3, e: gems[i % gems.length], ei: 0.25, flat: true }), 0);
    gem.position.set(Math.cos(a) * R * 1.03, h * 0.2, Math.sin(a) * R * 1.03); gem.lookAt(Math.cos(a) * 3, h * 0.2, Math.sin(a) * 3);
    g.add(gem);
  }
  onSurf(g, V(0, 1, -0.02), grand ? -0.2 : -0.16);
  g.rotation.x -= 0.08;
  return g;
}

// ---------- outfit pieces that fit ANY Fuzzy (cosmetics.ts 'extra' slot) ----------
const EXTRA: Record<string, Builder> = {
  'extra-bowtie': () => {
    const g = new THREE.Group();
    const m = gloss('#d6336c');
    for (const s of [-1, 1]) { const w = new THREE.Shape(); w.moveTo(0, 0); w.lineTo(s * 0.26, 0.13); w.quadraticCurveTo(s * 0.3, 0, s * 0.26, -0.13); w.lineTo(0, 0); g.add(mesh(ext(w, 0.06, 0.03, 8), m, 0.1)); }
    g.add(mesh(ell(0.06, 0.07, 0.06), m, 0.1));
    const dotM = mat('#ffffff', { r: 0.6 });
    for (const [x, y] of [[-0.17, 0.04], [0.17, 0.04], [-0.12, -0.05], [0.12, -0.05]]) g.add(at(mesh(ell(0.018, 0.018, 0.01, 6, 4), dotM, 0), x, y, 0.045));
    g.position.copy(surf(V(0.03, -0.62, 0.78), 0.06)); g.rotation.x = 0.55;
    return g;
  },
  'extra-shades': () => spectacles(mat('#16161c', { r: 0.3 }), mat('#1d1d28', { r: 0.05, m: 0.5, op: 0.55 }), { r: 0.32, thick: 0.045 }),
  'extra-scarf': () => knitScarf('#d6336c', '#fff3ea'),
  'extra-flower': () => { const f = flower('#ff6fa8', 0.2); f.add(at(mesh(shade(bentLeaf(0.07, 0.18, 0.1), 0.1, '#86d25c', '#3a8a2c'), mat('#ffffff', { r: 0.6, side: 'double' }), 0), 0.05, -0.02, -0.12, 1.2, 0, 0.9)); onSurf(f, V(0.62, 0.72, 0.25), 0.02); f.rotateZ(-0.3); return f; },
  'extra-backpack': () => {
    const g = new THREE.Group();
    const bag = smooth(new THREE.BoxGeometry(0.62, 0.66, 0.34, 4, 4, 3)); // rounded by smoothing normals
    const bp = bag.attributes.position; for (let i = 0; i < bp.count; i++) { const v = V(bp.getX(i), bp.getY(i), bp.getZ(i)); const r = v.length(); v.multiplyScalar(0.7 + 0.3 * (0.5 / Math.max(0.3, r))); bp.setXYZ(i, v.x * 1.0, v.y, v.z); }
    bag.computeVertexNormals();
    g.add(mesh(bag, mat('#ffb703', { r: 0.8 }), 0.25));
    g.add(at(mesh(new THREE.BoxGeometry(0.46, 0.24, 0.08), mat('#fb8500', { r: 0.8 }), 0.1), 0, -0.1, -0.2));
    g.add(at(mesh(ell(0.04, 0.04, 0.02), metal('#e9ecef', 0.3), 0), 0, 0.02, -0.25));
    for (const s of [-1, 1]) g.add(mesh(tube([V(s * 0.2, 0.28, 0.12), V(s * 0.25, 0.5, 0.5), V(s * 0.24, 0.42, 0.95)].map((p) => p), 0.03, 0.03, 10, 5), mat('#fb8500', { r: 0.8 }), 0));
    g.position.set(0, -0.05, -0.98);
    return g;
  },
  'extra-cape': () => cape('#e63946', '#ffd166', { m: mat('#d62839', { r: 0.6, side: 'double' }), wave: 1.3 }),
  'extra-wings': () => wings((s) => {
    const w = new THREE.Group();
    for (let i = 0; i < 6; i++) { const f = feather(0.55 - i * 0.06, 0.13, '#ffffff', '#e9f2ff'); const h = group(f); h.rotation.set(0, 0, s * (-0.35 - i * 0.24)); w.add(h); }
    return w;
  }, { y: 0.3, spread: 0.42, speed: 2.4, amp: 0.25, back: -0.78 }),
};

/** every name a character's `parts` (or an outfit piece) can ask for */
export const PART_NAMES = Object.keys(P);
export const hasPart = (name: string): boolean => !!P[name] || !!EXTRA[name];

/** Build one accessory in unit space (radius 1). Unknown names give an empty group (and a console warning). */
export function buildPart(name: string, ctx: PartCtx): THREE.Object3D {
  const b = P[name] ?? EXTRA[name];
  if (!b) { console.warn('unknown Fuzzy part', name); return new THREE.Group(); }
  const o = b(ctx);
  o.name = name;
  return o;
}
/** dispose the GPU buffers of a built part tree (materials are shared and kept, except the few that are made per part) */
export function disposePart(o: THREE.Object3D): void {
  o.traverse((x) => {
    const m = x as THREE.Mesh;
    if (m.geometry) m.geometry.dispose();
    if (x.userData.ownMaterial) { const mm = (m as THREE.Mesh).material as THREE.Material; mm?.dispose(); }
  });
}
