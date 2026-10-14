/**
 * Fuzzies Parking Escape — the WORLD around the lot: ten neighbourhoods, each with its own ground, sky, trees and a backdrop of
 * smooth cartoon props built in code (no image assets, no leaf cards): round and pine trees, palms, bushes, cottages, shops, a mall,
 * an airport tower with a little plane, festival tents and a Ferris wheel, mountains, an indoor luxury garage, city towers.
 *
 * Everything is smooth-shaded with baked vertex-colour gradients (light on top, deeper below) so it reads as one soft toy world next
 * to the cars. Geometry is cached per shape and shared; the scene only places it. Props stand BEHIND and BESIDE the lot — never
 * between the camera and the cars — and never on an exit road (the scene passes `near()` to keep those clear).
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export type Ground = 'lawn' | 'sand' | 'snow' | 'plaza' | 'concrete' | 'garage';
export type TreeStyle = 'round' | 'autumn' | 'pine' | 'snowpine' | 'palm' | 'blossom' | 'cypress' | 'none';
export type Backdrop = 'cottages' | 'downtown' | 'mall' | 'beach' | 'winter' | 'airport' | 'festival' | 'mountain' | 'garage' | 'city';
export interface Env {
  id: string; name: string; blurb: string;
  ground: Ground; lawn: string; sky: string; fog: [number, number];
  tree: TreeStyle; backdrop: Backdrop;
  /** colour of the lot's pavement ring */
  pave: string;
  /** the map tile's colour (the progression map) */
  tile: string;
  /** an emoji-free little label for the map: one short word */
  icon: string;
  /** flowers in the beds (false on snow / indoors) */
  flowers: boolean;
}

/** the ten neighbourhoods, in the order they unlock (50 levels each) */
export const ENVS: Env[] = [
  { id: 'sunny', name: 'Sunny Street', blurb: 'Cottages, round trees and a lazy Sunday.', ground: 'lawn', lawn: '#8fd16a', sky: '#cfeaf7', fog: [26, 60], tree: 'round', backdrop: 'cottages', pave: '#ece6d8', tile: '#8fd16a', icon: 'house', flowers: true },
  { id: 'downtown', name: 'Downtown Fuzzies', blurb: 'Little shops with stripy awnings.', ground: 'plaza', lawn: '#d9d2c3', sky: '#d4e8f5', fog: [26, 62], tree: 'cypress', backdrop: 'downtown', pave: '#e6e0d2', tile: '#f2a65a', icon: 'shop', flowers: true },
  { id: 'mall', name: 'Shopping Mall', blurb: 'The big car park by the Fuzzies Mall.', ground: 'concrete', lawn: '#cfd4d8', sky: '#d8ecf6', fog: [28, 64], tree: 'round', backdrop: 'mall', pave: '#e4e6e8', tile: '#5fb3d9', icon: 'bag', flowers: true },
  { id: 'beach', name: 'Beach Parking', blurb: 'Sand, palms and the sea right there.', ground: 'sand', lawn: '#ecdca8', sky: '#c9eefa', fog: [28, 66], tree: 'palm', backdrop: 'beach', pave: '#f3ead2', tile: '#f3d27a', icon: 'sun', flowers: false },
  { id: 'winter', name: 'Winter Village', blurb: 'Snowy roofs and a jolly snowman.', ground: 'snow', lawn: '#eef4f8', sky: '#dde8f1', fog: [24, 58], tree: 'snowpine', backdrop: 'winter', pave: '#f2f5f8', tile: '#bcd8ee', icon: 'snow', flowers: false },
  { id: 'airport', name: 'Airport Parking', blurb: 'Planes taking off over the lot.', ground: 'concrete', lawn: '#cdd3d6', sky: '#cfe7f7', fog: [30, 70], tree: 'cypress', backdrop: 'airport', pave: '#e2e5e7', tile: '#7aa7e0', icon: 'plane', flowers: false },
  { id: 'festival', name: 'Fuzzies Festival', blurb: 'Tents, bunting and a Ferris wheel.', ground: 'lawn', lawn: '#97d46e', sky: '#d6ecf8', fog: [26, 62], tree: 'blossom', backdrop: 'festival', pave: '#efe7d6', tile: '#ff8fb4', icon: 'star', flowers: true },
  { id: 'mountain', name: 'Mountain Resort', blurb: 'Pine woods under snowy peaks.', ground: 'lawn', lawn: '#88c26c', sky: '#cfe4f0', fog: [30, 72], tree: 'pine', backdrop: 'mountain', pave: '#e9e4d8', tile: '#6fae6b', icon: 'peak', flowers: true },
  { id: 'garage', name: 'Luxury Garage', blurb: 'Shiny floors under soft spotlights.', ground: 'garage', lawn: '#5b6068', sky: '#3a3f47', fog: [20, 44], tree: 'none', backdrop: 'garage', pave: '#8a8f97', tile: '#3d424a', icon: 'key', flowers: false },
  { id: 'city', name: 'Fuzzies City Centre', blurb: 'Tall towers and the big fountain.', ground: 'plaza', lawn: '#d8d0c0', sky: '#cbe3f4', fog: [30, 70], tree: 'round', backdrop: 'city', pave: '#e8e2d4', tile: '#d6336c', icon: 'crown', flowers: true },
];
/** which neighbourhood a level is in (50 levels each); endless lots rotate through all of them */
export const LEVELS_PER_ENV = 50;
export const envIndexOf = (level: number): number => Math.min(ENVS.length - 1, Math.floor((Math.max(1, level) - 1) / LEVELS_PER_ENV));
export const envOf = (level: number): Env => ENVS[envIndexOf(level)];

// ---------- shared building blocks ----------
function mulberry(seed: number): () => number { let t = seed >>> 0; return () => { t += 0x6d2b79f5; let r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; }
const C = (c: string) => new THREE.Color(c);
const SUN = new THREE.Vector3(-0.5, 0.8, 0.35).normalize();
const cache = new Map<string, THREE.BufferGeometry>();
const cached = (k: string, make: () => THREE.BufferGeometry) => { let g = cache.get(k); if (!g) { g = make(); cache.set(k, g); } return g; };
const matCache = new Map<string, THREE.Material>();
const VMAT = () => { let m = matCache.get('v'); if (!m) { m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82 }); matCache.set('v', m); } return m; };
const solid = (c: string, rough = 0.7, metal = 0, emissive?: string) => { const k = `${c}|${rough}|${metal}|${emissive}`; let m = matCache.get(k); if (!m) { m = new THREE.MeshStandardMaterial({ color: c, roughness: rough, metalness: metal, emissive: emissive ?? '#000000', emissiveIntensity: emissive ? 0.9 : 0 }); matCache.set(k, m); } return m; };

/** strip to position + normal, non-indexed — so differently made pieces merge */
const norm = (g: THREE.BufferGeometry) => { const n = g.index ? g.toNonIndexed() : g; for (const a of Object.keys(n.attributes)) if (a !== 'position' && a !== 'normal') n.deleteAttribute(a); if (!n.attributes.normal) n.computeVertexNormals(); return n; };
/** a smooth ball, welded so the shading is soft */
function ball(r: number, detail = 3): THREE.BufferGeometry {
  const g = new THREE.IcosahedronGeometry(r, detail); g.deleteAttribute('normal'); g.deleteAttribute('uv');
  const w = mergeVertices(g); w.computeVertexNormals(); return w;
}
/** colour a geometry: `f(position, normal, colour)` */
function paint(g: THREE.BufferGeometry, f: (p: THREE.Vector3, n: THREE.Vector3, c: THREE.Color) => void): THREE.BufferGeometry {
  const p = g.attributes.position, n = g.attributes.normal; const col = new Float32Array(p.count * 3);
  const v = new THREE.Vector3(), nn = new THREE.Vector3(), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); nn.fromBufferAttribute(n, i); f(v, nn, c); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); return g;
}
/** the house style for foliage: deep at the bottom, bright on top, a warm glow where the sun hits */
const foliage = (lo: string, hi: string, y0: number, y1: number) => (p: THREE.Vector3, n: THREE.Vector3, c: THREE.Color) => {
  c.set(lo).lerp(C(hi), THREE.MathUtils.clamp((p.y - y0) / (y1 - y0), 0, 1));
  c.lerp(C('#fff6c8'), Math.pow(Math.max(0, n.dot(SUN)), 3) * 0.22);
  c.multiplyScalar(0.82 + Math.max(0, n.y) * 0.22);
};
const flat = (col: string) => (_p: THREE.Vector3, n: THREE.Vector3, c: THREE.Color) => { c.set(col).multiplyScalar(0.86 + Math.max(0, n.dot(SUN)) * 0.2); };
const vmesh = (g: THREE.BufferGeometry, shadow = true) => { const m = new THREE.Mesh(g, VMAT()); m.castShadow = shadow; m.receiveShadow = true; return m; };
const smesh = (g: THREE.BufferGeometry, mat: THREE.Material, shadow = true) => { const m = new THREE.Mesh(g, mat); m.castShadow = shadow; m.receiveShadow = true; return m; };

// ---------- trees ----------
const TREE_COLS: Record<string, [string, string]> = { round: ['#2f7d3a', '#8fd65a'], autumn: ['#c2531f', '#ffb347'], blossom: ['#e07aa6', '#ffd3e6'], cypress: ['#2b6a3a', '#76c25e'], pine: ['#1f5a3a', '#5fae5a'], snowpine: ['#2a5f48', '#6aa77a'] };
function trunkGeo(h: number, r: number): THREE.BufferGeometry {
  return paint(norm(new THREE.CylinderGeometry(r * 0.75, r, h, 10, 1).translate(0, h / 2, 0)), flat('#8a5a3a'));
}
/** one tree's whole geometry (trunk + crown, merged), cached per style + variant */
function treeGeo(style: TreeStyle, v: number): THREE.BufferGeometry {
  return cached(`tree-${style}-${v}`, () => {
    const r = mulberry(v * 97 + style.length * 13);
    const parts: THREE.BufferGeometry[] = [];
    if (style === 'round' || style === 'autumn' || style === 'blossom') {
      const [lo, hi] = TREE_COLS[style];
      parts.push(trunkGeo(0.75, 0.09));
      const blobs: [number, number, number, number][] = [[0, 1.12, 0, 0.5], [0.28, 0.92, 0.12, 0.36], [-0.27, 0.95, -0.08, 0.36], [0.05, 0.9, -0.3, 0.34], [-0.04, 1.42, 0.06, 0.32]];
      for (const [x, y, z, s] of blobs) { const b = ball(s * (0.9 + r() * 0.2)).translate(x * (0.9 + r() * 0.2), y, z); parts.push(paint(b, foliage(lo, hi, 0.6, 1.75))); }
      if (style === 'blossom') for (let k = 0; k < 10; k++) { const a = r() * Math.PI * 2, e = 0.3 + r() * 0.9; parts.push(paint(ball(0.045, 1).translate(Math.cos(a) * 0.5 * Math.sin(e + 0.4), 0.95 + Math.cos(e) * 0.45, Math.sin(a) * 0.5 * Math.sin(e + 0.4)), flat('#ffffff'))); }
    } else if (style === 'cypress') {
      const [lo, hi] = TREE_COLS.cypress;
      parts.push(trunkGeo(0.35, 0.07));
      const g = ball(0.36, 3); g.scale(1, 2.3, 1).translate(0, 1.05, 0); g.computeVertexNormals();
      parts.push(paint(g, foliage(lo, hi, 0.3, 1.9)));
    } else if (style === 'pine' || style === 'snowpine') {
      const [lo, hi] = TREE_COLS[style];
      parts.push(trunkGeo(0.4, 0.08));
      // three soft tiers: lathed so each has a rounded skirt (no sharp cone edges)
      for (let i = 0; i < 3; i++) {
        const w = 0.62 - i * 0.16, y = 0.3 + i * 0.42, hgt = 0.62 - i * 0.06;
        const pts = [new THREE.Vector2(0.001, hgt), new THREE.Vector2(w * 0.35, hgt * 0.62), new THREE.Vector2(w * 0.85, hgt * 0.16), new THREE.Vector2(w, hgt * 0.06), new THREE.Vector2(w * 0.92, 0), new THREE.Vector2(0.001, 0.02)];
        const lg = new THREE.LatheGeometry(pts, 16).translate(0, y, 0); lg.deleteAttribute('uv'); const wv = mergeVertices(lg); wv.computeVertexNormals();
        parts.push(paint(wv, style === 'snowpine'
          ? (p, n, c) => { foliage(lo, hi, 0.3, 1.8)(p, n, c); if (n.y > 0.55) c.lerp(C('#f7fbff'), THREE.MathUtils.smoothstep(n.y, 0.55, 0.8)); }
          : foliage(lo, hi, 0.25, 1.9)));
      }
    } else if (style === 'palm') {
      // a curved trunk of rings, then six drooping fronds
      const segs = 7; let x = 0, y = 0;
      for (let i = 0; i < segs; i++) { const g = new THREE.CylinderGeometry(0.075 - i * 0.004, 0.085 - i * 0.004, 0.24, 9).translate(x, y + 0.12, 0); parts.push(paint(norm(g), flat(i % 2 ? '#a77a4c' : '#b98a5a'))); x += 0.035 + i * 0.006; y += 0.22; }
      const tx = x, ty = y;
      for (let k = 0; k < 7; k++) {
        const a = (k / 7) * Math.PI * 2 + r() * 0.3;
        const frond = new THREE.SphereGeometry(0.5, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(0.95, 0.16, 0.3).translate(0.45, -0.02, 0).rotateZ(-0.35 - r() * 0.2).rotateY(a).translate(tx, ty, 0);
        frond.deleteAttribute('uv'); const wv = mergeVertices(frond); wv.computeVertexNormals();
        parts.push(paint(wv, foliage('#2d7a35', '#7cc84f', ty - 0.4, ty + 0.15)));
      }
      for (let k = 0; k < 3; k++) parts.push(paint(ball(0.07, 1).translate(tx + Math.cos(k * 2.1) * 0.08, ty - 0.08, Math.sin(k * 2.1) * 0.08), flat('#7a5130')));
    }
    return mergeGeometries(parts.map((p) => (p.index ? p.toNonIndexed() : p)))!;
  });
}
export function smoothTree(style: TreeStyle, seed: number, scale = 1): THREE.Object3D {
  const m = vmesh(treeGeo(style, Math.abs(seed) % 3));
  m.scale.setScalar(scale); m.rotation.y = (seed % 17) * 0.37;
  return m;
}
/** a smooth bush (3–4 soft balls) */
export function smoothBush(seed: number, size = 0.5, col: [string, string] = ['#2f7d3a', '#86cf57']): THREE.Object3D {
  const v = Math.abs(seed) % 3;
  const g = cached(`bush-${v}-${col[0]}`, () => {
    const r = mulberry(v * 31 + 5); const parts: THREE.BufferGeometry[] = [];
    for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI * 2 + r(); const s = 0.42 + r() * 0.18; parts.push(paint(ball(s).translate(Math.cos(a) * 0.32, s * 0.75, Math.sin(a) * 0.28), foliage(col[0], col[1], 0, 1))); }
    parts.push(paint(ball(0.5).translate(0, 0.55, 0), foliage(col[0], col[1], 0, 1)));
    return mergeGeometries(parts.map((p) => p.toNonIndexed()))!;
  });
  const m = vmesh(g); m.scale.setScalar(size); m.rotation.y = seed * 0.7; return m;
}

// ---------- ground textures ----------
const texCache = new Map<string, THREE.Texture>();
const canvasTex = (k: string, w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) => {
  let t = texCache.get(k); if (t) return t;
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')!);
  t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; texCache.set(k, t); return t;
};
const speckle = (g: CanvasRenderingContext2D, w: number, h: number, n: number, col: (r: () => number) => string, seed: number, size = 2) => { const r = mulberry(seed); for (let k = 0; k < n; k++) { g.fillStyle = col(r); const s = size * (0.5 + r()); g.fillRect(r() * w, r() * h, s, s); } };
/** the ground texture (white-ish so the material's colour tints it), and how many times it repeats over 60 m */
export function groundTexture(kind: Ground): { map: THREE.Texture; repeat: number } {
  if (kind === 'lawn') return { repeat: 12, map: canvasTex('lawn', 256, 256, (g) => {
    // mown stripes, very soft, with a fine grain
    for (let k = 0; k < 4; k++) { g.fillStyle = k % 2 ? '#f2f2f2' : '#ffffff'; g.fillRect(0, k * 64, 256, 64); }
    speckle(g, 256, 256, 2600, (r) => `rgba(${r() < 0.5 ? '70,110,40' : '255,255,230'},${0.05 + r() * 0.08})`, 3, 2.2);
  }) };
  if (kind === 'sand') return { repeat: 14, map: canvasTex('sand', 256, 256, (g) => { g.fillStyle = '#fff'; g.fillRect(0, 0, 256, 256); speckle(g, 256, 256, 3000, (r) => `rgba(${r() < 0.5 ? '170,140,90' : '255,250,235'},${0.06 + r() * 0.1})`, 7, 1.6); }) };
  if (kind === 'snow') return { repeat: 10, map: canvasTex('snow', 256, 256, (g) => { g.fillStyle = '#fff'; g.fillRect(0, 0, 256, 256); speckle(g, 256, 256, 900, (r) => `rgba(170,195,220,${0.05 + r() * 0.08})`, 11, 5); }) };
  if (kind === 'plaza') return { repeat: 24, map: canvasTex('plaza', 128, 128, (g) => {
    g.fillStyle = '#fff'; g.fillRect(0, 0, 128, 128);
    g.strokeStyle = 'rgba(120,105,85,0.28)'; g.lineWidth = 2; for (const o of [0, 64]) { g.strokeRect(o + 1, 1, 62, 62); g.strokeRect(o - 31, 65, 62, 62); g.strokeRect(o + 33, 65, 62, 62); }
    speckle(g, 128, 128, 500, (r) => `rgba(120,105,85,${r() * 0.1})`, 13, 2);
  }) };
  if (kind === 'concrete') return { repeat: 10, map: canvasTex('concrete', 256, 256, (g) => {
    g.fillStyle = '#fff'; g.fillRect(0, 0, 256, 256); speckle(g, 256, 256, 2400, (r) => `rgba(110,115,120,${r() * 0.12})`, 17, 2);
    g.strokeStyle = 'rgba(110,115,125,0.3)'; g.lineWidth = 2; g.strokeRect(1, 1, 254, 254);
  }) };
  return { repeat: 8, map: canvasTex('garage', 256, 256, (g) => {
    // polished resin floor: soft reflections and seams
    const gr = g.createLinearGradient(0, 0, 256, 256); gr.addColorStop(0, '#f4f4f4'); gr.addColorStop(0.5, '#ffffff'); gr.addColorStop(1, '#ececec'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
    g.strokeStyle = 'rgba(60,64,70,0.35)'; g.lineWidth = 2; g.strokeRect(1, 1, 254, 254);
  }) };
}

// ---------- buildings ----------
/** a window grid painted on a canvas: `cols` × `rows` windows, a lit one here and there */
const windowsTex = (cols: number, rows: number, glass: string, frame: string, seed: number) => canvasTex(`win-${cols}-${rows}-${glass}-${frame}-${seed % 4}`, 128, 128, (g) => {
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 128, 128);
  const r = mulberry(seed); const cw = 128 / cols, rh = 128 / rows;
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const px = x * cw + cw * 0.2, py = y * rh + rh * 0.22, w = cw * 0.6, h = rh * 0.58;
    g.fillStyle = frame; g.beginPath(); g.roundRect(px - 2, py - 2, w + 4, h + 4, 4); g.fill();
    g.fillStyle = r() < 0.18 ? '#ffe9a8' : glass; g.beginPath(); g.roundRect(px, py, w, h, 3); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.45)'; g.fillRect(px + 2, py + 2, w * 0.3, h * 0.35);
  }
});
/** a rounded block with painted windows on its sides (top left plain) */
function block(w: number, h: number, d: number, wall: string, cols: number, rows: number, seed: number, glass = '#8ec9ee', frame = '#ffffff'): THREE.Mesh {
  const g = cached(`blk-${w}-${h}-${d}`, () => new RoundedBoxGeometry(w, h, d, 3, Math.min(0.08, w * 0.1)).translate(0, h / 2, 0));
  const side = new THREE.MeshStandardMaterial({ color: wall, roughness: 0.75, map: windowsTex(cols, rows, glass, frame, seed) });
  const top = solid(new THREE.Color(wall).multiplyScalar(0.9).getStyle(), 0.8);
  return smesh(g, [side, side, top, top, side, side] as unknown as THREE.Material);
}
const roofGable = (w: number, d: number, h: number) => cached(`gable-${w}-${d}-${h}`, () => { const s = new THREE.Shape(); s.moveTo(-w / 2 - 0.08, 0); s.lineTo(0, h); s.lineTo(w / 2 + 0.08, 0); s.lineTo(-w / 2 - 0.08, 0); const g = new THREE.ExtrudeGeometry(s, { depth: d + 0.12, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2 }).translate(0, 0, -(d + 0.12) / 2); return g; });
function cottage(seed: number, snowy = false): THREE.Group {
  const r = mulberry(seed); const g = new THREE.Group();
  const walls = ['#fff1dc', '#ffe1e6', '#e3f1ff', '#e9f6df', '#fff6c9'], roofs = ['#d6336c', '#e8683f', '#3f7bd6', '#2fa36b', '#8c5a3c'];
  const w = 1.3 + r() * 0.4, d = 1.1, h = 0.85 + r() * 0.25;
  g.add(block(w, h, d, walls[Math.floor(r() * walls.length)], 2, 1, seed, '#9fd3f2', '#ffffff'));
  const roof = smesh(roofGable(w, d, 0.6), solid(snowy ? '#f6f9fc' : roofs[Math.floor(r() * roofs.length)], 0.6)); roof.position.y = h; g.add(roof);
  const door = smesh(cached('door', () => new RoundedBoxGeometry(0.26, 0.42, 0.05, 2, 0.03)), solid('#8a5a3a', 0.6)); door.position.set(0, 0.21, d / 2 + 0.01); g.add(door);
  const chim = smesh(cached('chim', () => new RoundedBoxGeometry(0.18, 0.4, 0.18, 2, 0.03)), solid('#b0695a', 0.7)); chim.position.set(w * 0.25, h + 0.42, -0.15); g.add(chim);
  return g;
}
function shop(seed: number): THREE.Group {
  const r = mulberry(seed); const g = new THREE.Group();
  const walls = ['#ffe8d2', '#e6f1ff', '#ffeef4', '#eef7e6'], aw = ['#e8483f', '#2f8fd6', '#2fa36b', '#ff9f1c', '#d6336c'];
  const w = 1.5 + r() * 0.5, h = 1.4 + r() * 0.8, d = 1.1;
  g.add(block(w, h, d, walls[Math.floor(r() * walls.length)], 3, Math.round(h * 1.6), seed));
  // a striped awning over the shop window
  const col = aw[Math.floor(r() * aw.length)];
  const awning = smesh(cached(`awn-${w.toFixed(1)}`, () => new THREE.CylinderGeometry(0.18, 0.18, w * 0.9, 12, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).rotateX(-Math.PI / 2)), new THREE.MeshStandardMaterial({ map: stripes(col), roughness: 0.6, side: THREE.DoubleSide }));
  awning.position.set(0, 0.62, d / 2 + 0.02); g.add(awning);
  return g;
}
const stripes = (col: string) => canvasTex(`stripe-${col}`, 64, 16, (g) => { for (let k = 0; k < 8; k++) { g.fillStyle = k % 2 ? '#ffffff' : col; g.fillRect(k * 8, 0, 8, 16); } });
const signTex = (text: string, bg: string, fg: string) => canvasTex(`sign-${text}`, 512, 96, (g) => { g.fillStyle = bg; g.beginPath(); g.roundRect(0, 0, 512, 96, 28); g.fill(); g.fillStyle = fg; g.font = 'bold 54px Fredoka, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 256, 52); });
function sign(text: string, w: number, bg = '#d6336c', fg = '#ffffff'): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 96 / 512), new THREE.MeshStandardMaterial({ map: signTex(text, bg, fg), transparent: true, roughness: 0.5, emissive: '#ffffff', emissiveIntensity: 0.12, emissiveMap: signTex(text, bg, fg) }));
  return m;
}

// ---------- backdrops ----------
export interface BackdropCtx { W: number; H: number; near: (x: number, z: number) => boolean; mobile: boolean }
/**
 * Everything around the lot for one neighbourhood. The lot is centred on the origin, the camera looks from +z (the front), so
 * "behind" = −z. Returns the group to add plus an optional `tick(t)` for the bits that move (plane, Ferris wheel, flags).
 */
export function backdrop(env: Env, ctx: BackdropCtx, seed: number): { group: THREE.Group; tick?: (t: number) => void } {
  const g = new THREE.Group(); const r = mulberry(seed * 7 + 3);
  const hw = ctx.W / 2, hh = ctx.H / 2;
  const back = -hh - 2.6; // first row behind the lot
  const ticks: ((t: number) => void)[] = [];
  const put = (o: THREE.Object3D, x: number, z: number, ry = 0) => { if (ctx.near(x, z)) return; o.position.set(x, -0.1, z); o.rotation.y = ry; g.add(o); };
  // trees: a loose row behind, a few at the sides (never in front)
  const trees = (style: TreeStyle, scale = 0.62, backRow = true) => {
    if (style === 'none') return;
    if (backRow) for (let x = -hw - 3.4; x <= hw + 3.4; x += 1.5) put(smoothTree(style, Math.round(x * 13 + seed), scale * (0.9 + r() * 0.3)), x + (r() - 0.5) * 0.5, -hh - 1.9 - r() * 0.6);
    for (let z = -hh - 0.6; z <= hh + 0.4; z += 1.6) for (const s of [-1, 1]) put(smoothTree(style, Math.round(z * 11 + s * 5 + seed), scale * (0.85 + r() * 0.3)), s * (hw + 2.0 + r() * 0.9), z);
  };
  const bushes = (col?: [string, string]) => { for (const [x, z, s] of [[-hw - 1.4, hh + 1.2, 0.42], [hw + 1.4, hh + 1.1, 0.38], [-hw - 1.5, -hh - 1.1, 0.45], [hw + 1.6, -hh - 1.2, 0.45]] as [number, number, number][]) put(smoothBush(Math.round(x * 5 + z), s, col), x, z); };
  const rowOf = (make: (k: number) => THREE.Object3D, z: number, step: number, from = -hw - 4, to = hw + 4) => { let k = 0; for (let x = from; x <= to; x += step) put(make(k++), x, z); };

  switch (env.backdrop) {
    case 'cottages': {
      trees('round', 0.62, false); bushes();
      rowOf((k) => cottage(seed + k * 7), back - 0.9, 2.2);
      break;
    }
    case 'downtown': {
      trees('cypress', 0.55, false); bushes();
      rowOf((k) => shop(seed + k * 5), back - 0.8, 2.1);
      break;
    }
    case 'mall': {
      trees('round', 0.55, false); bushes();
      const mall = new THREE.Group();
      const body = block(ctx.W + 6, 1.7, 2.2, '#f4f1ea', 12, 2, seed, '#9fd3f2', '#d9dee3'); mall.add(body);
      const glass = smesh(new RoundedBoxGeometry(3.2, 1.3, 0.12, 2, 0.04).translate(0, 0.65, 0), new THREE.MeshStandardMaterial({ color: '#9fd3f2', roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.85 })); glass.position.z = 1.12; mall.add(glass);
      const canopy = smesh(new RoundedBoxGeometry(3.8, 0.12, 0.9, 2, 0.04), solid('#d6336c', 0.5)); canopy.position.set(0, 1.4, 1.45); mall.add(canopy);
      const s = sign('FUZZIES MALL', 3.2); s.position.set(0, 2.05, 1.13); mall.add(s);
      put(mall, 0, back - 0.6);
      for (const x of [-hw - 1.2, hw + 1.2]) { const cartBay = smesh(new RoundedBoxGeometry(0.9, 0.5, 0.4, 2, 0.06).translate(0, 0.25, 0), solid('#5fb3d9', 0.5)); put(cartBay, x, hh + 0.8); }
      break;
    }
    case 'beach': {
      // the sea along the back, a foam line, palms, umbrellas
      const sea = new THREE.Mesh(new THREE.PlaneGeometry(60, 30).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#3fb6d9', roughness: 0.25, metalness: 0.1 }));
      sea.position.set(0, -0.08, back - 16.5); g.add(sea);
      const foam = new THREE.Mesh(new THREE.PlaneGeometry(60, 0.35).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.75 }));
      foam.position.set(0, -0.07, back - 1.55); g.add(foam);
      ticks.push((t) => { foam.position.z = back - 1.55 + Math.sin(t * 0.8) * 0.12; (foam.material as THREE.MeshBasicMaterial).opacity = 0.55 + Math.sin(t * 0.8) * 0.2; });
      trees('palm', 0.75);
      for (let k = 0; k < 6; k++) { const x = -hw - 3 + k * ((ctx.W + 6) / 5); const u = umbrella(['#e8483f', '#ffc21a', '#2f8fd6', '#d6336c', '#2fa36b', '#ff9f1c'][k]); put(u, x + (r() - 0.5), back + 0.4 + r() * 0.3); }
      break;
    }
    case 'winter': {
      trees('snowpine', 0.65, false);
      rowOf((k) => cottage(seed + k * 9, true), back - 0.9, 2.3);
      put(snowman(), -hw - 1.3, hh + 0.9); put(snowman(), hw + 1.4, -hh - 0.9);
      break;
    }
    case 'airport': {
      trees('cypress', 0.5);
      // runway strip with dashes, a control tower and a little plane that takes off now and then
      const run = new THREE.Mesh(new THREE.PlaneGeometry(60, 3).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: runwayTex(), roughness: 0.85 }));
      run.position.set(0, -0.09, back - 3.4); g.add(run);
      const tower = new THREE.Group();
      tower.add(smesh(new THREE.CylinderGeometry(0.28, 0.36, 2.6, 16).translate(0, 1.3, 0), solid('#f4f1ea', 0.6)));
      tower.add(smesh(new THREE.CylinderGeometry(0.62, 0.48, 0.55, 16).translate(0, 2.85, 0), new THREE.MeshStandardMaterial({ color: '#7fc4ec', roughness: 0.1, metalness: 0.3 })));
      tower.add(smesh(new THREE.CylinderGeometry(0.68, 0.68, 0.1, 16).translate(0, 3.17, 0), solid('#d6336c', 0.5)));
      put(tower, hw + 2.6, back - 0.9);
      const plane = airplane(); g.add(plane);
      ticks.push((t) => { const c = (t % 14) / 14; const x = -18 + c * 36; plane.position.set(x, -0.05 + Math.max(0, c - 0.45) * 7, back - 3.4); plane.rotation.z = c > 0.45 ? 0.12 : 0; plane.visible = c < 0.95; });
      break;
    }
    case 'festival': {
      trees('blossom', 0.6); bushes(['#d0578a', '#ffb3cf']);
      for (let k = 0; k < 4; k++) put(tent(['#d6336c', '#ffc21a', '#2f8fd6', '#2fa36b'][k]), -hw - 2.5 + k * ((ctx.W + 5) / 3), back - 0.6);
      const wheel = ferris(); put(wheel.group, -hw - 3.4, back - 2.6); ticks.push(wheel.tick);
      // bunting between two poles over the back row
      g.add(bunting(-hw - 3, hw + 3, back + 0.3, 1.5));
      break;
    }
    case 'mountain': {
      trees('pine', 0.68); bushes(['#2a6a3a', '#7cc26a']);
      for (const [x, z, s] of [[-hw - 7, back - 9, 6.5], [hw + 5, back - 10, 7.5], [0, back - 13, 9]] as [number, number, number][]) { const m = mountain(s); m.position.set(x, -0.12, z); g.add(m); }
      put(cottage(seed + 3), hw + 2.8, back - 0.8, -0.4);
      break;
    }
    case 'garage': {
      // indoors: walls, pillars and soft ceiling light strips; no trees
      const wallM = solid('#4a4f58', 0.85);
      const wall = smesh(new THREE.BoxGeometry(ctx.W + 9, 2.4, 0.3).translate(0, 1.2, 0), wallM); wall.position.set(0, -0.1, back - 0.6); g.add(wall);
      for (const s of [-1, 1]) { const sw = smesh(new THREE.BoxGeometry(0.3, 2.4, ctx.H + 9).translate(0, 1.2, 0), wallM); sw.position.set(s * (hw + 3.6), -0.1, 0); g.add(sw); }
      const stripe = smesh(new THREE.BoxGeometry(ctx.W + 9, 0.12, 0.02), solid('#d6336c', 0.4, 0, '#d6336c')); stripe.position.set(0, 0.9, back - 0.44); g.add(stripe);
      const s = sign('LUXURY GARAGE', 3, '#1d1f24', '#ffd77a'); s.position.set(0, 1.6, back - 0.44); g.add(s);
      for (let k = 0; k < 4; k++) for (const sd of [-1, 1]) { const p = smesh(new RoundedBoxGeometry(0.42, 2.4, 0.42, 2, 0.05).translate(0, 1.2, 0), solid('#e6e2da', 0.6)); put(p, sd * (hw + 1.4), -hh + k * (ctx.H / 3)); const band = smesh(new THREE.BoxGeometry(0.44, 0.24, 0.44), solid('#ffc21a', 0.5)); band.position.set(sd * (hw + 1.4), 0.25, -hh + k * (ctx.H / 3)); g.add(band); }
      for (let k = 0; k < 3; k++) { const l = smesh(new THREE.BoxGeometry(ctx.W + 4, 0.04, 0.18), solid('#ffffff', 0.3, 0, '#fff4dc'), false); l.position.set(0, 2.3, back + 1.2 + k * 1.2); g.add(l); }
      break;
    }
    case 'city': {
      trees('round', 0.55, false); bushes();
      rowOf((k) => { const h = 2.4 + ((seed + k * 3) % 4) * 0.7; return block(1.7, h, 1.5, ['#e6eef7', '#f4ece2', '#e2f0ec', '#f3e6ee'][k % 4], 3, Math.round(h * 1.8), seed + k, '#86c3ea', '#f8fafc'); }, back - 1.1, 2.2);
      put(fountain(), -hw - 2.4, hh + 0.4);
      break;
    }
  }
  return { group: g, tick: ticks.length ? (t) => { for (const f of ticks) f(t); } : undefined };
}

// ---------- small props ----------
function umbrella(col: string): THREE.Group {
  const g = new THREE.Group();
  g.add(smesh(new THREE.CylinderGeometry(0.02, 0.02, 1, 6).translate(0, 0.5, 0), solid('#f4f1ea', 0.5)));
  g.add(smesh(new THREE.ConeGeometry(0.55, 0.28, 16, 1, true).translate(0, 1.05, 0), new THREE.MeshStandardMaterial({ map: stripes(col), roughness: 0.6, side: THREE.DoubleSide })));
  g.add(smesh(new RoundedBoxGeometry(0.4, 0.04, 0.8, 2, 0.02).translate(0.35, 0.05, 0), solid(col, 0.6)));
  return g;
}
function snowman(): THREE.Group {
  const g = new THREE.Group(); const w = solid('#ffffff', 0.9);
  g.add(smesh(ball(0.32).translate(0, 0.3, 0), w)); g.add(smesh(ball(0.23).translate(0, 0.78, 0), w)); g.add(smesh(ball(0.16).translate(0, 1.12, 0), w));
  g.add(smesh(new THREE.ConeGeometry(0.035, 0.18, 8).rotateX(Math.PI / 2).translate(0, 1.12, 0.22), solid('#ff8a1a', 0.5)));
  g.add(smesh(new THREE.TorusGeometry(0.17, 0.045, 8, 16).rotateX(Math.PI / 2).translate(0, 0.97, 0), solid('#d6336c', 0.6)));
  return g;
}
function tent(col: string): THREE.Group {
  const g = new THREE.Group();
  g.add(smesh(new THREE.CylinderGeometry(0.62, 0.62, 0.7, 16, 1, true).translate(0, 0.35, 0), new THREE.MeshStandardMaterial({ map: stripes(col), roughness: 0.6, side: THREE.DoubleSide })));
  g.add(smesh(new THREE.ConeGeometry(0.75, 0.6, 16).translate(0, 1.0, 0), solid(col, 0.6)));
  g.add(smesh(ball(0.06, 1).translate(0, 1.33, 0), solid('#ffd34a', 0.4)));
  return g;
}
function ferris(): { group: THREE.Group; tick: (t: number) => void } {
  const g = new THREE.Group(); const wheel = new THREE.Group(); wheel.position.y = 2.1; g.add(wheel);
  const metal = solid('#f4f1ea', 0.4, 0.3);
  wheel.add(smesh(new THREE.TorusGeometry(1.6, 0.05, 8, 40), metal));
  for (let k = 0; k < 8; k++) { const sp = smesh(new THREE.CylinderGeometry(0.025, 0.025, 3.2, 6).rotateZ((k / 8) * Math.PI), metal); wheel.add(sp); }
  const cars: THREE.Object3D[] = [];
  for (let k = 0; k < 8; k++) { const c = smesh(new RoundedBoxGeometry(0.3, 0.26, 0.3, 2, 0.06), solid(['#d6336c', '#ffc21a', '#2f8fd6', '#2fa36b'][k % 4], 0.5)); g.add(c); cars.push(c); }
  for (const s of [-1, 1]) g.add(smesh(new THREE.CylinderGeometry(0.06, 0.08, 2.3, 8).translate(0, 1.15, 0).rotateZ(s * 0.35).translate(s * 0.4, 0, -0.1), metal));
  return { group: g, tick: (t) => { const a = t * 0.25; wheel.rotation.z = a; cars.forEach((c, k) => { const b = a + (k / 8) * Math.PI * 2; c.position.set(Math.cos(b) * 1.6, 2.1 + Math.sin(b) * 1.6 - 0.18, 0); }); } };
}
function bunting(x0: number, x1: number, z: number, h: number): THREE.Group {
  const g = new THREE.Group(); const n = Math.round((x1 - x0) / 0.35);
  const cols = ['#d6336c', '#ffc21a', '#2f8fd6', '#2fa36b', '#ff9f1c'];
  for (let k = 0; k < n; k++) { const x = x0 + (k + 0.5) * ((x1 - x0) / n); const sag = Math.sin(((k + 0.5) / n) * Math.PI) * 0.35; const f = new THREE.Mesh(cached('flag', () => new THREE.ConeGeometry(0.09, 0.2, 3).rotateX(Math.PI)), solid(cols[k % cols.length], 0.6)); f.position.set(x, h - sag, z); g.add(f); }
  for (const x of [x0, x1]) { const p = smesh(new THREE.CylinderGeometry(0.03, 0.03, h + 0.1, 6).translate(0, (h + 0.1) / 2 - 0.1, 0), solid('#f4f1ea', 0.5)); p.position.set(x, 0, z); g.add(p); }
  return g;
}
function mountain(s: number): THREE.Object3D {
  const g = cached(`mtn-${s}`, () => {
    const pts: THREE.Vector2[] = []; for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push(new THREE.Vector2(s * (1 - t) * (1 - t * 0.15), s * 0.7 * Math.pow(t, 0.8))); }
    const lg = new THREE.LatheGeometry(pts, 24); lg.deleteAttribute('uv'); const w = mergeVertices(lg); w.computeVertexNormals();
    return paint(w, (p, n, c) => { c.set('#7d9bb0').lerp(C('#a9c3d4'), p.y / (s * 0.7)); if (p.y > s * 0.42) c.lerp(C('#ffffff'), THREE.MathUtils.smoothstep(p.y, s * 0.42, s * 0.5)); c.multiplyScalar(0.85 + Math.max(0, n.dot(SUN)) * 0.25); });
  });
  return vmesh(g, false);
}
function fountain(): THREE.Group {
  const g = new THREE.Group(); const stone = solid('#e8e2d6', 0.7);
  g.add(smesh(new THREE.CylinderGeometry(0.75, 0.8, 0.28, 24).translate(0, 0.14, 0), stone));
  g.add(smesh(new THREE.CylinderGeometry(0.66, 0.66, 0.04, 24).translate(0, 0.27, 0), new THREE.MeshStandardMaterial({ color: '#5cc3e8', roughness: 0.1, metalness: 0.2 })));
  g.add(smesh(new THREE.CylinderGeometry(0.1, 0.14, 0.7, 12).translate(0, 0.5, 0), stone));
  g.add(smesh(new THREE.CylinderGeometry(0.34, 0.2, 0.12, 16).translate(0, 0.86, 0), stone));
  g.add(smesh(ball(0.12, 2).translate(0, 1.0, 0), new THREE.MeshStandardMaterial({ color: '#bfeaff', roughness: 0.1, transparent: true, opacity: 0.8 })));
  return g;
}
function airplane(): THREE.Group {
  const g = new THREE.Group(); const w = solid('#ffffff', 0.4);
  g.add(smesh(new THREE.CapsuleGeometry(0.22, 1.6, 6, 12).rotateZ(Math.PI / 2).translate(0, 0.45, 0), w));
  g.add(smesh(new RoundedBoxGeometry(0.5, 0.05, 2.1, 2, 0.02).translate(0.05, 0.4, 0), w));
  g.add(smesh(new RoundedBoxGeometry(0.3, 0.45, 0.05, 2, 0.02).translate(-0.85, 0.72, 0), solid('#d6336c', 0.5)));
  g.add(smesh(new RoundedBoxGeometry(0.25, 0.04, 0.8, 2, 0.02).translate(-0.85, 0.5, 0), w));
  g.add(smesh(new RoundedBoxGeometry(1.4, 0.06, 0.02, 2, 0.01).translate(0.1, 0.5, 0.215), solid('#2f8fd6', 0.5)));
  return g;
}
const runwayTex = () => canvasTex('runway', 512, 64, (g) => { g.fillStyle = '#5a6068'; g.fillRect(0, 0, 512, 64); g.fillStyle = 'rgba(255,255,255,0.9)'; for (let x = 8; x < 512; x += 64) g.fillRect(x, 29, 34, 6); g.fillRect(0, 3, 512, 3); g.fillRect(0, 58, 512, 3); });

// ---------- holiday decorations (Fuzzies Land's seasonal events) ----------
export type Atmo = 'leaves' | 'snow' | 'petals' | 'hearts' | 'lanterns' | 'sparks' | 'fireflies' | 'none';
/** the star car's holiday paint for an event key (`halloween-2026`) */
const HOLIDAY_PAINT: Record<string, string> = { halloween: '#ff7a1a', 'thanks-ca': '#c2531f', 'thanks-us': '#c2531f', hanukkah: '#2f6fd8', christmas: '#2fa36b', newyear: '#ffc21a', winter: '#5fb3d9', lunar: '#e03131', valentine: '#ff6b9a', ramadan: '#14a3a3', eid: '#14a3a3', stpat: '#2fa84f', passover: '#3f7bd6', easter: '#b9dd6a', mother: '#ff8fb4', father: '#1f4fa8', canada: '#e03131', july4: '#2f6fd8', summer: '#00a7d9', harvest: '#ff9f1c', diwali: '#ff9f1c' };
export const holidayPaint = (event: string): string => HOLIDAY_PAINT[event.replace(/-\d{4}$/, '')] ?? '#ffc21a';
/** a few holiday pieces at the lot's corners (pumpkins, gifts and a snowman, lanterns, heart balloons, flower pots, stars) plus bunting in the holiday's colours */
export function eventProps(atmo: Atmo, colors: string[], ctx: BackdropCtx): THREE.Group {
  const g = new THREE.Group(); const hw = ctx.W / 2, hh = ctx.H / 2;
  const cols = colors.length ? colors : ['#d6336c', '#ffc21a', '#2f8fd6'];
  const spots: [number, number][] = [[-hw - 1.1, hh + 0.7], [hw + 1.1, hh + 0.7], [-hw - 1.0, -hh - 0.8], [hw + 1.0, -hh - 0.8], [-hw - 1.3, 0], [hw + 1.3, 0]];
  const put = (o: THREE.Object3D, x: number, z: number) => { if (ctx.near(x, z)) return; o.position.set(x, -0.1, z); g.add(o); };
  spots.forEach(([x, z], k) => {
    const o = new THREE.Group();
    if (atmo === 'leaves') { const p = smesh(ball(0.26, 2).scale(1.2, 0.85, 1.2), solid('#ff7a1a', 0.6)); p.position.y = 0.22; o.add(p); const st = smesh(new THREE.CylinderGeometry(0.03, 0.04, 0.12, 6), solid('#5a7a2a', 0.7)); st.position.y = 0.46; o.add(st); }
    else if (atmo === 'snow') { if (k % 2) o.add(snowman()); else for (let j = 0; j < 3; j++) { const b = smesh(new RoundedBoxGeometry(0.28, 0.24, 0.28, 2, 0.04), solid(cols[j % cols.length], 0.5)); b.position.set(j * 0.22 - 0.2, 0.12 + (j === 1 ? 0.2 : 0), j === 1 ? 0 : 0.1); o.add(b); } }
    else if (atmo === 'lanterns') { o.add(smesh(new THREE.CylinderGeometry(0.025, 0.025, 1.2, 6).translate(0, 0.6, 0), solid('#5a4636', 0.6))); const l = smesh(ball(0.16, 2).scale(1, 1.25, 1), solid(cols[k % cols.length], 0.4, 0, cols[k % cols.length])); l.position.y = 1.2; o.add(l); }
    else if (atmo === 'hearts') { for (let j = 0; j < 3; j++) { const b = smesh(ball(0.15, 2).scale(1, 1.15, 1), solid(j % 2 ? '#ff6b9a' : '#ffffff', 0.35)); b.position.set(j * 0.18 - 0.18, 1.0 + j * 0.12, 0); o.add(b); } o.add(smesh(new THREE.CylinderGeometry(0.005, 0.005, 1.0, 4).translate(0, 0.5, 0), solid('#ffffff', 0.5))); }
    else if (atmo === 'petals') { const pot = smesh(new THREE.CylinderGeometry(0.2, 0.15, 0.26, 14).translate(0, 0.13, 0), solid('#c96a3a', 0.7)); o.add(pot); o.add(smoothBush(k, 0.32, ['#e07aa6', '#ffd3e6'])); o.children[1].position.y = 0.2; }
    else { const s = smesh(new THREE.OctahedronGeometry(0.16, 0), solid(cols[k % cols.length], 0.4, 0.2, cols[k % cols.length])); s.position.y = 0.9; o.add(s); o.add(smesh(new THREE.CylinderGeometry(0.02, 0.02, 0.9, 6).translate(0, 0.45, 0), solid('#e9ecef', 0.5))); }
    put(o, x, z);
  });
  g.add(bunting(-hw - 1.6, hw + 1.6, -hh - 0.9, 1.25));
  g.children[g.children.length - 1].traverse((o) => { const me = o as THREE.Mesh; if (me.isMesh && me.geometry === cache.get('flag')) me.material = solid(cols[Math.abs(Math.round(me.position.x * 3)) % cols.length], 0.6); });
  return g;
}
