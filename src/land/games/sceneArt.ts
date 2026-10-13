/**
 * Scene art kit — the shared, hand-built 3D props every mini-game scene draws from (the orchard pieces live in orchardArt.ts and
 * are re-used here). Same rules as the orchard: smooth welded shapes instead of raw primitives, shading baked into vertex
 * colours, textures painted on canvases at load time (no image files), everything shared or instanced so phones stay smooth.
 *
 *   groundTex(kind)         painted grass / sand / dirt / snow / cobbles for the kit's ground
 *   treeRing(spots, kind)   a whole background tree line (leafy, pine or snowy pine) in ~9 instanced draws
 *   leafyTree / pineTree    single trees for props
 *   rock(seed, size, tone)  smooth boulders with crevice shading and moss / sand / frost on top
 *   cottage(opts)           plastered cottage: timber trims, shingled gable roof, chimney, framed windows with flower boxes, door
 *   palm(seed, h)           curved ringed trunk, drooping feathered fronds, coconuts
 *   water(w, d, opts, time) a gently waving surface with a shallow-to-deep tint and sky reflections
 *   hedgeMaterial()         leafy hedge texture for walls (the maze)
 *   soilTex()               tilled furrows for beds and fields
 *   crop(kind)              cabbage / lettuce / carrot top / sprout / flower / weed models for farm games
 */
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { rng, C, noise3, canvas, tex, once, paint, SUN, taperTube, barkTex, leafCardTex, grassTex, woodTex } from './orchardArt';

// ---------- smooth blob helper (welded so normals are soft) ----------
export function blob(r: number, detail = 2, bump = 0.12, seed = 0): THREE.BufferGeometry {
  const ico = new THREE.IcosahedronGeometry(r, detail); ico.deleteAttribute('normal'); ico.deleteAttribute('uv');
  const g = mergeVertices(ico); const p = g.attributes.position; const v = new THREE.Vector3();
  for (let k = 0; k < p.count; k++) { v.fromBufferAttribute(p, k); v.multiplyScalar(1 + noise3(v.x * 2.4 / r + seed, v.y * 2.4 / r, v.z * 2.4 / r) * bump); p.setXYZ(k, v.x, v.y, v.z); }
  g.computeVertexNormals(); return g;
}

// ---------- ground ----------
export type GroundKind = 'grass' | 'sand' | 'dirt' | 'snow' | 'cobble' | 'gravel';
const groundCache = new Map<GroundKind, THREE.CanvasTexture>();
/** a painted ground texture (tiles every few metres); `repeat` is set by the caller */
export function groundTex(kind: GroundKind): THREE.CanvasTexture {
  const hit = groundCache.get(kind); if (hit) return hit;
  let t: THREE.CanvasTexture;
  if (kind === 'grass') t = grassTex().clone();
  else {
    const { c, g } = canvas(512, 512); const r = rng(kind.length * 17 + 3);
    const blotch = (n: number, cols: string[], min: number, max: number) => { for (let i = 0; i < n; i++) { const x = r() * 512, y = r() * 512, rad = min + r() * (max - min); const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, cols[(r() * cols.length) | 0]); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); } };
    const pebbles = (n: number, cols: string[], smin: number, smax: number) => { for (let i = 0; i < n; i++) { const x = r() * 512, y = r() * 512, w = smin + r() * (smax - smin), h = w * (0.6 + r() * 0.35); g.fillStyle = cols[(r() * cols.length) | 0]; g.beginPath(); g.ellipse(x, y, w, h, r() * 3, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,0.3)'; g.beginPath(); g.ellipse(x - w * 0.3, y - h * 0.3, w * 0.35, h * 0.3, 0, 0, 7); g.fill(); } };
    if (kind === 'sand') {
      g.fillStyle = '#ecd3a0'; g.fillRect(0, 0, 512, 512);
      blotch(60, ['rgba(255,236,190,0.45)', 'rgba(205,170,110,0.35)'], 30, 90);
      for (let y = 0; y < 512; y += 9) { g.strokeStyle = y % 18 ? 'rgba(190,150,90,0.18)' : 'rgba(255,244,214,0.35)'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= 512; x += 16) g.lineTo(x, y + Math.sin(x * 0.03 + y * 0.2) * 3); g.stroke(); }
      for (let i = 0; i < 2500; i++) { g.fillStyle = r() < 0.5 ? 'rgba(160,120,70,0.35)' : 'rgba(255,250,235,0.6)'; g.fillRect(r() * 512, r() * 512, 1.4, 1.4); }
      pebbles(40, ['#f6efe4', '#e9c9b0', '#d9b8a8'], 2, 4);
    } else if (kind === 'dirt') {
      g.fillStyle = '#86715b'; g.fillRect(0, 0, 512, 512);
      blotch(70, ['rgba(110,90,70,0.5)', 'rgba(160,138,110,0.4)', 'rgba(70,58,46,0.35)'], 30, 100);
      for (let i = 0; i < 4000; i++) { g.fillStyle = r() < 0.5 ? 'rgba(60,48,36,0.4)' : 'rgba(190,170,140,0.35)'; g.fillRect(r() * 512, r() * 512, 1.5, 1.5); }
      pebbles(160, ['#9c9182', '#7d7468', '#b4a998', '#6e655b'], 2.5, 7);
      g.strokeStyle = 'rgba(50,40,30,0.35)'; g.lineWidth = 1.2; for (let i = 0; i < 18; i++) { let x = r() * 512, y = r() * 512; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (r() - 0.5) * 40; y += (r() - 0.5) * 40; g.lineTo(x, y); } g.stroke(); }
    } else if (kind === 'snow') {
      g.fillStyle = '#f2f6fb'; g.fillRect(0, 0, 512, 512);
      blotch(50, ['rgba(200,215,235,0.45)', 'rgba(255,255,255,0.7)'], 40, 120);
      for (let i = 0; i < 1800; i++) { g.fillStyle = r() < 0.8 ? 'rgba(255,255,255,0.95)' : 'rgba(170,200,235,0.6)'; const s = r() < 0.9 ? 1.2 : 2.2; g.fillRect(r() * 512, r() * 512, s, s); }
      for (let i = 0; i < 30; i++) { const x = r() * 512, y = r() * 512; g.strokeStyle = 'rgba(180,200,225,0.35)'; g.lineWidth = 3; g.beginPath(); g.arc(x, y, 18 + r() * 30, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
    } else if (kind === 'gravel') {
      g.fillStyle = '#d6c7a2'; g.fillRect(0, 0, 512, 512);
      blotch(50, ['rgba(190,172,132,0.45)', 'rgba(236,226,200,0.5)'], 30, 80);
      pebbles(1400, ['#c9bb98', '#e3d7b9', '#b6a684', '#efe6cf', '#a99877'], 1.5, 4);
    } else {
      // cobbles: rounded stones in rows with mortar between
      g.fillStyle = '#9d9282'; g.fillRect(0, 0, 512, 512);
      const rows = 16, rh = 512 / rows;
      for (let y = 0; y < rows; y++) { let x = (y % 2) * 14 - 14; while (x < 512) { const w = 24 + r() * 16; const tone = ['#cfc4b2', '#d9cfbd', '#c2b7a4', '#bdb2a0', '#d4c9b6'][(r() * 5) | 0]; const gx = x + 2, gy = y * rh + 2, gw = w - 4, gh = rh - 4; const gr = g.createLinearGradient(0, gy, 0, gy + gh); gr.addColorStop(0, tone); gr.addColorStop(1, 'rgba(120,108,92,1)'); g.fillStyle = gr; g.beginPath(); g.roundRect(gx, gy, gw, gh, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,0.18)'; g.beginPath(); g.roundRect(gx + 3, gy + 2, gw - 6, gh * 0.35, 5); g.fill(); x += w; } }
    }
    t = tex(c);
  }
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.needsUpdate = true;
  groundCache.set(kind, t); return t;
}

// ---------- trees ----------
type Parts = { trunk: THREE.BufferGeometry; crown: THREE.BufferGeometry; leaves: { m: THREE.Matrix4; c: THREE.Color }[] };
const partsCache = new Map<string, Parts>();
/** a leafy broadleaf tree's parts in its own space (cached per variant) */
function leafyParts(variant: number, nLeaves: number, autumn = false): Parts {
  const key = `leafy${variant}/${nLeaves}/${autumn}`; const hit = partsCache.get(key); if (hit) return hit;
  const r = rng(variant * 31 + 7);
  const lean = (r() - 0.5) * 0.4;
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(lean * 0.3, 1.0, 0.04), new THREE.Vector3(lean * 0.7, 1.9, -0.04), new THREE.Vector3(lean, 2.6, 0)]);
  const wood = [taperTube(curve, 0.22, 0.13, 10, 8)]; const top = curve.getPoint(1); const blobs: { c: THREE.Vector3; r: number }[] = [];
  for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2 + r(), from = curve.getPoint(0.75), end = new THREE.Vector3(top.x + Math.cos(a) * 0.8, top.y + 0.6 + r() * 0.4, top.z + Math.sin(a) * 0.7); wood.push(taperTube(new THREE.CatmullRomCurve3([from, from.clone().lerp(end, 0.5).add(new THREE.Vector3(0, 0.2, 0)), end]), 0.1, 0.04, 6, 6)); blobs.push({ c: end.clone().add(new THREE.Vector3(0, 0.3, 0)), r: 0.85 + r() * 0.3 }); }
  blobs.push({ c: top.clone().add(new THREE.Vector3(0, 1.1, 0)), r: 1.1 });
  for (let i = 0; i < 4; i++) { const a = r() * Math.PI * 2; blobs.push({ c: top.clone().add(new THREE.Vector3(Math.cos(a) * 0.7, 0.6 + r() * 1.0, Math.sin(a) * 0.6)), r: 0.65 + r() * 0.3 }); }
  const trunk = mergeGeometries(wood)!; paint(trunk, (p, _n, c) => { c.setScalar(0.55 + Math.min(1, p.y / 1.2) * 0.45); if (p.y < 0.4) c.lerp(C('#6f9a4a'), (0.4 - p.y)); });
  const centre = blobs.reduce((s, b) => s.add(b.c), new THREE.Vector3()).multiplyScalar(1 / blobs.length);
  const crown = mergeGeometries(blobs.map((b, i) => blob(b.r, 2, 0.12, i).translate(b.c.x, b.c.y, b.c.z)))!;
  let maxD = 0; { const p = crown.attributes.position; const v = new THREE.Vector3(); for (let k = 0; k < p.count; k++) maxD = Math.max(maxD, v.fromBufferAttribute(p, k).distanceTo(centre)); }
  const yMin = top.y - 0.2, yMax = centre.y + 1.6;
  const [dk, md, lt] = autumn ? ['#7a3a12', '#c9671e', '#f2b14a'] : ['#2c5f2a', '#4e9a3d', '#8ccf5e'];
  paint(crown, (p, n, c) => { const h = THREE.MathUtils.clamp((p.y - yMin) / (yMax - yMin), 0, 1), ao = THREE.MathUtils.clamp(p.distanceTo(centre) / maxD, 0, 1); c.set(dk).lerp(C(md), h * 0.8).lerp(C(lt), Math.pow(Math.max(0, n.dot(SUN)), 1.5) * 0.6 * (0.4 + h * 0.6)); c.multiplyScalar(0.55 + ao * 0.5); });
  const leaves: Parts['leaves'] = [];
  for (let i = 0; i < nLeaves; i++) {
    const b = blobs[(r() * blobs.length) | 0]; const th = r() * Math.PI * 2, u = r() * 1.6 - 0.6, s = Math.sqrt(Math.max(0, 1 - u * u)); const dir = new THREE.Vector3(Math.cos(th) * s, u, Math.sin(th) * s).normalize();
    const pv = b.c.clone().addScaledVector(dir, b.r * (0.93 + r() * 0.1)); if (pv.distanceTo(centre) < maxD * 0.55) continue;
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler((r() - 0.5) * 0.9, (r() - 0.5) * 0.9, r() * 6.28)));
    const h = THREE.MathUtils.clamp((pv.y - yMin) / (yMax - yMin), 0, 1);
    leaves.push({ m: new THREE.Matrix4().compose(pv, q, new THREE.Vector3().setScalar(0.65 + r() * 0.5)), c: new THREE.Color(autumn ? '#c97a32' : '#5e8f4a').lerp(C(autumn ? '#ffd27a' : '#c8f0a0'), Math.max(0, dir.dot(SUN)) * 0.6 * (0.5 + h * 0.5)).multiplyScalar(0.75 + h * 0.4) });
  }
  const parts = { trunk, crown, leaves }; partsCache.set(key, parts); return parts;
}
/** a pine: short trunk, five jagged drooping skirts, darker inside; with `snow` the upward faces carry snow */
function pineParts(variant: number, snow: boolean): Parts {
  const key = `pine${variant}/${snow}`; const hit = partsCache.get(key); if (hit) return hit;
  const r = rng(variant * 13 + 5);
  const trunk = taperTube(new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1.0, 0)]), 0.18, 0.12, 4, 7);
  paint(trunk, (_p, _n, c) => c.setScalar(0.7));
  const tiers: THREE.BufferGeometry[] = []; const H = 3.6 + r() * 0.6;
  for (let i = 0; i < 5; i++) {
    const t = i / 5, base = 0.7 + t * (H - 1.1), rad = (1.45 - t * 1.0) * (0.95 + r() * 0.1), hgt = 1.15 - t * 0.25;
    const prof = [new THREE.Vector2(0.0001, base + hgt), new THREE.Vector2(rad * 0.35, base + hgt * 0.62), new THREE.Vector2(rad * 0.8, base + hgt * 0.18), new THREE.Vector2(rad, base - 0.05), new THREE.Vector2(rad * 0.82, base + 0.02), new THREE.Vector2(0.0001, base + 0.2)];
    const lg = new THREE.LatheGeometry(prof, 18); lg.deleteAttribute('normal'); lg.deleteAttribute('uv');
    const g = mergeVertices(lg); const p = g.attributes.position; const v = new THREE.Vector3();
    for (let k = 0; k < p.count; k++) { v.fromBufferAttribute(p, k); const rr = Math.hypot(v.x, v.z); if (rr > rad * 0.6) { const a = Math.atan2(v.z, v.x); const jag = Math.sin(a * 9 + i) * 0.1 + noise3(v.x * 3, v.y, v.z * 3) * 0.06; v.x *= 1 + jag; v.z *= 1 + jag; v.y -= Math.max(0, Math.sin(a * 9 + i)) * 0.08; } p.setXYZ(k, v.x, v.y, v.z); }
    g.computeVertexNormals(); tiers.push(g);
  }
  const crown = mergeGeometries(tiers)!;
  paint(crown, (p, n, c) => { const rr = Math.hypot(p.x, p.z); c.set('#1f4d33').lerp(C('#3f7f4e'), THREE.MathUtils.clamp(rr / 1.3, 0, 1)).lerp(C('#7fb77a'), Math.pow(Math.max(0, n.dot(SUN)), 2) * 0.45); if (snow && n.y > 0.35 + noise3(p.x * 4, p.y * 4, p.z * 4) * 0.2) c.set('#f4f8fd').lerp(C('#c9d9ec'), Math.max(0, 0.7 - n.y)); });
  const parts = { trunk, crown, leaves: [] }; partsCache.set(key, parts); return parts;
}
const trunkMat = once(() => new THREE.MeshStandardMaterial({ map: barkTex(), vertexColors: true, roughness: 0.92 }));
const crownMat = once(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82 }));
const leafMat = once(() => new THREE.MeshStandardMaterial({ map: leafCardTex(), alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.7 }));
export type TreeKind = 'leafy' | 'pine' | 'snowpine' | 'autumn';
/**
 * A background tree line: every tree of a variant shares one instanced trunk, crown and leaf-card mesh, so 40 trees cost ~9 draws.
 * `spots` are ground positions with a scale and turn.
 */
export function treeRing(spots: { x: number; z: number; s: number; rot?: number }[], kind: TreeKind = 'leafy', opts: { leaves?: number; shadow?: boolean } = {}): THREE.Group {
  const g = new THREE.Group(); const V = 3; const shadow = opts.shadow ?? true;
  for (let v = 0; v < V; v++) {
    const list = spots.filter((_, i) => i % V === v); if (!list.length) continue;
    const parts = kind === 'pine' || kind === 'snowpine' ? pineParts(v, kind === 'snowpine') : leafyParts(v, opts.leaves ?? 60, kind === 'autumn');
    const mk = (geo: THREE.BufferGeometry, mat: THREE.Material, cast: boolean) => { const m = new THREE.InstancedMesh(geo, mat, list.length); m.castShadow = cast && shadow; m.receiveShadow = true; g.add(m); return m; };
    const tr = mk(parts.trunk, trunkMat(), true), cr = mk(parts.crown, crownMat(), true);
    const lv = parts.leaves.length ? new THREE.InstancedMesh(new THREE.PlaneGeometry(0.95, 0.95), leafMat(), list.length * parts.leaves.length) : null;
    const m4 = new THREE.Matrix4(), w = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
    list.forEach((s, i) => {
      w.compose(new THREE.Vector3(s.x, 0, s.z), q.setFromAxisAngle(up, s.rot ?? (s.x * 1.7 + s.z)), new THREE.Vector3().setScalar(s.s)); tr.setMatrixAt(i, w); cr.setMatrixAt(i, w);
      if (lv) parts.leaves.forEach((l, k) => { m4.multiplyMatrices(w, l.m); lv.setMatrixAt(i * parts.leaves.length + k, m4); lv.setColorAt(i * parts.leaves.length + k, l.c); });
    });
    if (lv) { lv.instanceMatrix.needsUpdate = true; if (lv.instanceColor) lv.instanceColor.needsUpdate = true; g.add(lv); }
  }
  return g;
}
/** one tree as a prop (shares geometry with the ring of the same kind) */
export function tree(kind: TreeKind = 'leafy', seed = 0, scale = 1, shadow = true): THREE.Group {
  return treeRing([{ x: 0, z: 0, s: scale, rot: seed * 1.3 }], kind, { shadow, leaves: 80 });
}

// ---------- rocks ----------
export type RockTone = 'grey' | 'sand' | 'cave' | 'snow';
export const rockMat = once(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }));
/** a smooth boulder: welded lumpy shape, flattened, crevices darker, moss / sand / frost on top */
export function rockGeo(seed: number, size = 1, tone: RockTone = 'grey'): THREE.BufferGeometry {
  const g = blob(size, 2, 0.28, seed * 3.1); g.scale(1, 0.62, 0.9); g.computeVertexNormals();
  const base = { grey: ['#8d8a84', '#b9b5ad'], sand: ['#b39a7a', '#dcc8a6'], cave: ['#4e4540', '#7a6c62'], snow: ['#8e98a6', '#c3cbd6'] }[tone];
  const top = { grey: '#7f9a5a', sand: '#efe0bf', cave: '#8a7a6a', snow: '#f6f9fd' }[tone];
  return paint(g, (p, n, c) => { const k = noise3(p.x * 5 / size + seed, p.y * 5 / size, p.z * 5 / size); c.set(base[0]).lerp(C(base[1]), THREE.MathUtils.clamp(0.5 + k * 0.6 + Math.max(0, n.dot(SUN)) * 0.35, 0, 1)); if (n.y > 0.55 + k * 0.2) c.lerp(C(top), tone === 'snow' ? 0.9 : 0.45); c.multiplyScalar(p.y < -size * 0.25 ? 0.75 : 1); });
}
export function rock(seed: number, size = 1, tone: RockTone = 'grey', shadow = true): THREE.Mesh {
  const m = new THREE.Mesh(rockGeo(seed, size, tone), rockMat()); m.castShadow = shadow; m.receiveShadow = true; m.position.y = size * 0.32; m.rotation.y = seed; return m;
}

// ---------- cottages ----------
const plasterTex = once(() => { const { c, g } = canvas(256, 256); const r = rng(61); g.fillStyle = '#ffffff'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 1500; i++) { g.fillStyle = r() < 0.5 ? 'rgba(0,0,0,0.035)' : 'rgba(255,255,255,0.5)'; g.fillRect(r() * 256, r() * 256, 2 + r() * 3, 2 + r() * 3); } for (let i = 0; i < 6; i++) { const x = r() * 256, y = r() * 256; g.fillStyle = 'rgba(160,140,120,0.08)'; g.beginPath(); g.ellipse(x, y, 30, 18, 0, 0, 7); g.fill(); } g.fillStyle = 'rgba(120,110,100,0.35)'; g.fillRect(0, 226, 256, 30); for (let x = 0; x < 256; x += 22) { g.fillStyle = 'rgba(90,80,70,0.35)'; g.fillRect(x, 226, 2, 30); } return tex(c); });
const shingleTex = once(() => { const { c, g } = canvas(256, 256); g.fillStyle = '#ffffff'; g.fillRect(0, 0, 256, 256); const r = rng(71); for (let row = 0; row < 12; row++) { const y = row * 22; for (let x = (row % 2) * -14; x < 256; x += 28) { const k = 0.82 + r() * 0.18; g.fillStyle = `rgba(${255 * k | 0},${255 * k | 0},${255 * k | 0},1)`; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 26, y); g.lineTo(x + 26, y + 16); g.quadraticCurveTo(x + 13, y + 26, x, y + 16); g.closePath(); g.fill(); g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 1.5; g.stroke(); } } return tex(c); });
const glassMat = once(() => new THREE.MeshStandardMaterial({ color: '#bfe3ff', roughness: 0.08, metalness: 0.35, emissive: '#ffd99a', emissiveIntensity: 0.12 }));
export interface CottageOpts { w?: number; d?: number; h?: number; wall?: string; roof?: string; trim?: string; door?: string; seed?: number; shadow?: boolean; chimney?: boolean }
/** a cottage facing +z, footprint w × d centred on the origin */
export function cottage(o: CottageOpts = {}): THREE.Group {
  const w = o.w ?? 3.4, d = o.d ?? 3, h = o.h ?? 2.4, r = rng(o.seed ?? 1); const shadow = o.shadow ?? true;
  const g = new THREE.Group();
  const wallMat = new THREE.MeshStandardMaterial({ map: plasterTex(), color: o.wall ?? '#f4e6cf', roughness: 0.92 });
  const trimMat = new THREE.MeshStandardMaterial({ color: o.trim ?? '#8a5a34', roughness: 0.8 });
  const roofMat = new THREE.MeshStandardMaterial({ map: shingleTex(), color: o.roof ?? '#c4524c', roughness: 0.85 });
  const box = (bw: number, bh: number, bd: number, mat: THREE.Material, x: number, y: number, z: number, cast = true) => { const m = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), mat); m.position.set(x, y, z); m.castShadow = cast && shadow; m.receiveShadow = true; g.add(m); return m; };
  box(w, h, d, wallMat, 0, h / 2, 0);
  // gable ends
  const gs = new THREE.Shape(); gs.moveTo(-w / 2, 0); gs.lineTo(0, h * 0.62); gs.lineTo(w / 2, 0); gs.lineTo(-w / 2, 0);
  for (const sz of [-1, 1]) { const gm = new THREE.Mesh(new THREE.ShapeGeometry(gs), wallMat); gm.position.set(0, h, sz * (d / 2 + 0.001)); if (sz < 0) gm.rotation.y = Math.PI; gm.receiveShadow = true; g.add(gm); }
  // roof: two shingled slabs with an overhang, ridge beam
  const slope = Math.atan2(h * 0.62, w / 2), len = Math.hypot(w / 2, h * 0.62) + 0.35;
  for (const sx of [-1, 1]) { const s = box(len, 0.12, d + 0.5, roofMat, sx * (w / 4 + 0.08), h + h * 0.31 + 0.06, 0); s.rotation.z = -sx * slope; (s.material as THREE.MeshStandardMaterial).map!.repeat.set(len / 1.2, (d + 0.5) / 1.2); }
  box(0.16, 0.16, d + 0.55, trimMat, 0, h + h * 0.62 + 0.08, 0);
  // timber trims: corners and a sill beam
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(0.14, h, 0.14, trimMat, sx * w / 2, h / 2, sz * d / 2, false);
  box(w + 0.1, 0.12, 0.1, trimMat, 0, h - 0.06, d / 2 + 0.03, false);
  // door with frame, knob and a step
  const doorMat = new THREE.MeshStandardMaterial({ color: o.door ?? '#7a4a2a', roughness: 0.75 });
  box(0.84, 1.36, 0.08, doorMat, 0, 0.68, d / 2 + 0.03, false); box(1.0, 0.1, 0.1, trimMat, 0, 1.4, d / 2 + 0.05, false);
  for (const sx of [-1, 1]) box(0.08, 1.4, 0.1, trimMat, sx * 0.46, 0.7, d / 2 + 0.05, false);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), new THREE.MeshStandardMaterial({ color: '#e8c25a', metalness: 0.8, roughness: 0.3 })); knob.position.set(0.28, 0.7, d / 2 + 0.09); g.add(knob);
  box(1.1, 0.12, 0.45, new THREE.MeshStandardMaterial({ color: '#b9b4a6', roughness: 0.9 }), 0, 0.06, d / 2 + 0.25, false);
  // windows: frame, glass, cross, flower box
  const flowerCols = ['#ff7aa2', '#ffd447', '#ff5a4a', '#ffffff'];
  for (const sx of [-1, 1]) {
    const x = sx * w * 0.3; box(0.78, 0.78, 0.06, trimMat, x, h * 0.58, d / 2 + 0.02, false);
    const pane = box(0.62, 0.62, 0.07, glassMat(), x, h * 0.58, d / 2 + 0.03, false); (g.userData.windows ??= []).push(pane);
    box(0.62, 0.05, 0.09, trimMat, x, h * 0.58, d / 2 + 0.05, false); box(0.05, 0.62, 0.09, trimMat, x, h * 0.58, d / 2 + 0.05, false);
    box(0.84, 0.16, 0.2, trimMat, x, h * 0.58 - 0.48, d / 2 + 0.1, false);
    for (let k = 0; k < 5; k++) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), new THREE.MeshStandardMaterial({ color: flowerCols[(k + (sx > 0 ? 1 : 0)) % 4], roughness: 0.6 })); f.position.set(x - 0.3 + k * 0.15, h * 0.58 - 0.36 + (k % 2) * 0.04, d / 2 + 0.12); g.add(f); const lf = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 5), new THREE.MeshStandardMaterial({ color: '#4f9a3c', roughness: 0.8 })); lf.position.set(x - 0.26 + k * 0.15, h * 0.58 - 0.4, d / 2 + 0.16); g.add(lf); }
  }
  if (o.chimney !== false) { const cx = (r() < 0.5 ? -1 : 1) * w * 0.28; box(0.42, 1.1, 0.42, new THREE.MeshStandardMaterial({ color: '#a79c8e', roughness: 0.95 }), cx, h + 0.85, -d * 0.2); box(0.52, 0.1, 0.52, trimMat, cx, h + 1.42, -d * 0.2, false); }
  return g;
}

// ---------- palms ----------
const frondTex = once(() => {
  const { c, g } = canvas(512, 128);
  const grd = (x: number) => { const t = x / 512; return `rgb(${(70 + t * 60) | 0},${(140 + t * 50) | 0},${(60 + t * 20) | 0})`; };
  for (let x = 10; x < 500; x += 9) { const t = x / 512, len = 52 * Math.sin(Math.min(1, t * 1.15) * Math.PI) + 6; for (const sy of [-1, 1]) { g.strokeStyle = grd(x); g.lineWidth = 5 - t * 2; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, 64); g.quadraticCurveTo(x + 10, 64 + sy * len * 0.5, x + 18, 64 + sy * len); g.stroke(); } }
  g.strokeStyle = '#c9d98a'; g.lineWidth = 4; g.beginPath(); g.moveTo(0, 64); g.lineTo(512, 64); g.stroke();
  return tex(c);
});
const palmRingTex = once(() => { const { c, g } = canvas(64, 256); g.fillStyle = '#9b7a52'; g.fillRect(0, 0, 64, 256); for (let y = 0; y < 256; y += 16) { g.fillStyle = 'rgba(70,50,30,0.55)'; g.fillRect(0, y, 64, 4); g.fillStyle = 'rgba(200,170,120,0.45)'; g.fillRect(0, y + 4, 64, 3); } return tex(c, [1, 6]); });
/** a coconut palm `h` metres tall with a curved, ringed trunk and drooping fronds */
export function palm(seed = 1, h = 5, shadow = true): THREE.Group {
  const r = rng(seed * 11 + 2); const g = new THREE.Group(); const bend = 0.6 + r() * 0.8, dir = r() * Math.PI * 2;
  const pts = [0, 0.33, 0.66, 1].map((t) => new THREE.Vector3(Math.cos(dir) * bend * t * t, t * h, Math.sin(dir) * bend * t * t));
  const trunk = new THREE.Mesh(taperTube(new THREE.CatmullRomCurve3(pts), 0.22, 0.13, 14, 9), new THREE.MeshStandardMaterial({ map: palmRingTex(), roughness: 0.9 })); trunk.castShadow = shadow; g.add(trunk);
  const top = pts[3];
  const frondMat = new THREE.MeshStandardMaterial({ map: frondTex(), alphaTest: 0.35, side: THREE.DoubleSide, roughness: 0.75 });
  const n = 8;
  for (let i = 0; i < n; i++) {
    // a frond: a strip along +x (leaflets across), drooping as it goes out, laid flat and turned round the crown
    const L = 2.4 + r() * 0.6; const geo = new THREE.PlaneGeometry(L, 0.9, 10, 2); const p = geo.attributes.position;
    for (let k = 0; k < p.count; k++) { const x = p.getX(k) + L / 2, t = x / L; p.setX(k, x); p.setY(k, p.getY(k) * (1 - 0.2 * t)); p.setZ(k, -t * t * 1.5); }
    geo.rotateX(-Math.PI / 2); geo.computeVertexNormals();
    const f = new THREE.Mesh(geo, frondMat); f.castShadow = shadow; f.rotation.z = 0.35 + r() * 0.25;
    const holder = new THREE.Group(); holder.position.copy(top); holder.rotation.y = (i / n) * Math.PI * 2 + r() * 0.3; holder.add(f); g.add(holder);
  }
  const nutMat = new THREE.MeshStandardMaterial({ color: '#6b4a2a', roughness: 0.8 });
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2; const nut = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), nutMat); nut.position.set(top.x + Math.cos(a) * 0.18, top.y - 0.2, top.z + Math.sin(a) * 0.18); nut.castShadow = shadow; g.add(nut); }
  return g;
}

// ---------- water ----------
export interface WaterOpts { shallow?: string; deep?: string; opacity?: number; waves?: number; depth?: (x: number, z: number) => number }
/** a waving water surface (w × d, centred) with a shallow→deep tint from `depth(x,z)` (0 shallow … 1 deep) and sky reflections */
export function water(w: number, d: number, o: WaterOpts, time: { value: number }): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(w, d, Math.max(8, Math.round(w * 2)), Math.max(8, Math.round(d * 2))).rotateX(-Math.PI / 2);
  const sh = C(o.shallow ?? '#7fd6d0'), dp = C(o.deep ?? '#2a86c4'); const depth = o.depth ?? (() => 1);
  paint(geo, (p, _n, c) => c.copy(sh).lerp(dp, THREE.MathUtils.clamp(depth(p.x, p.z), 0, 1)));
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.12, metalness: 0.15, transparent: true, opacity: o.opacity ?? 0.9 });
  const amp = o.waves ?? 0.06;
  mat.onBeforeCompile = (s) => {
    s.uniforms.uTime = time;
    s.vertexShader = 'uniform float uTime;\n' + s.vertexShader
      .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
        float wx = position.x, wz = position.z;
        float dx = ${amp.toFixed(3)} * (0.9 * cos(wx * 0.9 + uTime * 1.3) + 0.6 * cos((wx + wz) * 1.7 + uTime * 2.1) * 1.7);
        float dz = ${amp.toFixed(3)} * (0.7 * -sin(wz * 1.1 - uTime * 1.1) * 1.1 + 0.6 * cos((wx + wz) * 1.7 + uTime * 2.1) * 1.7);
        objectNormal = normalize(vec3(-dx, 1.0, -dz));`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        transformed.y += ${amp.toFixed(3)} * (0.9 * sin(wx * 0.9 + uTime * 1.3) + 0.7 * cos(wz * 1.1 - uTime * 1.1) + 0.6 * sin((wx + wz) * 1.7 + uTime * 2.1));`);
  };
  const m = new THREE.Mesh(geo, mat); m.receiveShadow = true; return m;
}

// ---------- hedges, soil, crops ----------
/** a dense leafy hedge texture (for hedge walls) */
export const hedgeTex = once(() => {
  const { c, g } = canvas(256, 256); const r = rng(81); g.fillStyle = '#2f6a2c'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 900; i++) { const x = r() * 256, y = r() * 256, l = 7 + r() * 8; g.save(); g.translate(x, y); g.rotate(r() * 6.28); const gr = g.createLinearGradient(-l, 0, l, 0); const k = r(); gr.addColorStop(0, k < 0.4 ? '#255a26' : '#3e8236'); gr.addColorStop(1, k < 0.3 ? '#5fae45' : '#8ccf5e'); g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, l, l * 0.45, 0, 0, 7); g.fill(); g.restore(); }
  return tex(c, [1, 1]);
});
export function hedgeMaterial(): THREE.MeshStandardMaterial { return new THREE.MeshStandardMaterial({ map: hedgeTex(), roughness: 0.85, vertexColors: true }); }
/** tilled soil with furrows running along x */
export const soilTex = once(() => {
  const { c, g } = canvas(256, 256); const r = rng(91); g.fillStyle = '#6b4a2f'; g.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 32) { const gr = g.createLinearGradient(0, y, 0, y + 32); gr.addColorStop(0, '#5a3d26'); gr.addColorStop(0.45, '#8a6440'); gr.addColorStop(0.55, '#7a5636'); gr.addColorStop(1, '#4e3420'); g.fillStyle = gr; g.fillRect(0, y, 256, 32); }
  for (let i = 0; i < 3000; i++) { g.fillStyle = r() < 0.5 ? 'rgba(40,26,14,0.45)' : 'rgba(160,125,85,0.4)'; g.fillRect(r() * 256, r() * 256, 1.6, 1.6); }
  for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(150,140,125,0.7)'; g.beginPath(); g.ellipse(r() * 256, r() * 256, 2.5, 1.8, r() * 3, 0, 7); g.fill(); }
  return tex(c);
});
export type CropKind = 'cabbage' | 'lettuce' | 'carrot' | 'sprout' | 'weed' | 'weedBig' | 'tulip' | 'daisy';
const cropCache = new Map<string, THREE.BufferGeometry>();
/** a crop / garden plant geometry with baked vertex colours (shared per kind; use with cropMaterial()) */
export function cropGeo(kind: CropKind, tint = '#5fae45'): THREE.BufferGeometry {
  const key = kind + tint; const hit = cropCache.get(key); if (hit) return hit;
  const parts: THREE.BufferGeometry[] = []; const r = rng(kind.length * 7 + 1);
  const leaf = (len: number, wid: number, col: string, tip: string, a: number, tilt: number, y = 0, curl = 0.3) => {
    const s = new THREE.Shape(); s.moveTo(0, 0); s.bezierCurveTo(wid, len * 0.3, wid * 0.8, len * 0.8, 0, len); s.bezierCurveTo(-wid * 0.8, len * 0.8, -wid, len * 0.3, 0, 0);
    const lg = new THREE.ShapeGeometry(s, 6); const p = lg.attributes.position; for (let k = 0; k < p.count; k++) { const yy = p.getY(k), xx = p.getX(k); p.setZ(k, -Math.pow(yy / len, 2) * len * curl + Math.abs(xx) * 0.3); } lg.computeVertexNormals();
    paint(lg, (q, _n, c) => c.set(col).lerp(C(tip), q.y / len).multiplyScalar(Math.abs(q.x) < wid * 0.08 ? 1.2 : 1));
    lg.rotateX(-Math.PI / 2 + tilt).rotateY(a).translate(0, y, 0); parts.push(lg.toNonIndexed());
  };
  if (kind === 'cabbage' || kind === 'lettuce') {
    const head = blob(0.22, 2, 0.08, 3).scale(1, 0.85, 1).translate(0, 0.2, 0); paint(head, (p, n, c) => c.set(kind === 'cabbage' ? '#a9d27a' : '#8fd06a').lerp(C('#e2f5b8'), Math.max(0, n.y) * 0.5)); parts.push(head.toNonIndexed());
    for (let i = 0; i < 7; i++) leaf(0.42, 0.24, kind === 'cabbage' ? '#3f8f3e' : '#4fae45', kind === 'cabbage' ? '#9ed27a' : '#b9ec84', (i / 7) * Math.PI * 2 + r() * 0.3, 0.9 + r() * 0.3, 0.02, 0.5);
  } else if (kind === 'carrot') {
    const root = new THREE.ConeGeometry(0.07, 0.12, 10).rotateX(Math.PI).translate(0, 0.04, 0); paint(root, (_p, _n, c) => c.set('#ff8c2a')); parts.push(root.toNonIndexed());
    for (let i = 0; i < 6; i++) leaf(0.42, 0.06, '#2f7a2c', '#7fcf55', (i / 6) * Math.PI * 2, 0.25 + r() * 0.25, 0.08, 0.15);
  } else if (kind === 'sprout') {
    for (let i = 0; i < 3; i++) leaf(0.22, 0.08, '#4f9a3c', '#a8e07a', (i / 3) * Math.PI * 2, 0.5, 0, 0.3);
  } else if (kind === 'weed' || kind === 'weedBig') {
    const big = kind === 'weedBig'; for (let i = 0; i < (big ? 9 : 6); i++) leaf((big ? 0.5 : 0.32) * (0.8 + r() * 0.4), big ? 0.09 : 0.06, '#5a6e22', '#a9b84a', r() * 6.28, 0.2 + r() * 0.5, 0, 0.35);
    if (big) { const sb = blob(0.06, 1, 0.1, 2).translate(0, 0.42, 0); paint(sb, (_p, _n, c) => c.set('#f2d84a')); parts.push(sb.toNonIndexed()); }
  } else {
    const stem = new THREE.CylinderGeometry(0.012, 0.016, 0.42, 5).translate(0, 0.21, 0); paint(stem, (_p, _n, c) => c.set('#4f8f36')); parts.push(stem.toNonIndexed());
    leaf(0.2, 0.06, '#3f8f36', '#8fd06a', 0.4, 0.6, 0.05); leaf(0.18, 0.06, '#3f8f36', '#8fd06a', 3.2, 0.6, 0.1);
    if (kind === 'tulip') { const cup = new THREE.LatheGeometry([new THREE.Vector2(0.0001, 0), new THREE.Vector2(0.06, 0.02), new THREE.Vector2(0.075, 0.08), new THREE.Vector2(0.05, 0.14)], 10).translate(0, 0.42, 0); paint(cup, (p, _n, c) => c.set(tint).lerp(C('#ffffff'), Math.max(0, (p.y - 0.5) * 3))); parts.push(cup.toNonIndexed()); }
    else { for (let i = 0; i < 9; i++) { const pt = new THREE.SphereGeometry(0.035, 6, 4).scale(1.8, 0.35, 0.7).translate(0.06, 0, 0).rotateY((i / 9) * Math.PI * 2).translate(0, 0.42, 0); paint(pt, (_p, _n, c) => c.set('#ffffff')); parts.push(pt.toNonIndexed()); } const ctr = new THREE.SphereGeometry(0.035, 8, 6).scale(1, 0.6, 1).translate(0, 0.43, 0); paint(ctr, (_p, _n, c) => c.set('#ffc93a')); parts.push(ctr.toNonIndexed()); }
  }
  const geo = mergeGeometries(parts.map((p) => { if (p.attributes.uv) p.deleteAttribute('uv'); return p; }))!;
  cropCache.set(key, geo); return geo;
}
export const cropMaterial = once(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, side: THREE.DoubleSide }));
/** a crop mesh ready to place */
export function crop(kind: CropKind, tint?: string, shadow = true): THREE.Mesh { const m = new THREE.Mesh(cropGeo(kind, tint), cropMaterial()); m.castShadow = shadow; return m; }

/**
 * Hedge walls: rounded boxes with a leafy texture mapped in world space (no stretching on long walls), darker at the roots and
 * lighter on the clipped tops, slight colour variation per wall — all merged into one mesh.
 */
export function hedgeWalls(boxes: { x: number; z: number; w: number; d: number }[], H: number, shadow = true): THREE.Mesh {
  const parts = boxes.map((b, i) => {
    const g = new RoundedBoxGeometry(b.w, H, b.d, 2, Math.min(0.14, b.w / 2 - 0.01, b.d / 2 - 0.01)); g.translate(b.x, H / 2, b.z);
    const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
    for (let k = 0; k < p.count; k++) { const x = p.getX(k), y = p.getY(k), z = p.getZ(k), nx = Math.abs(n.getX(k)), ny = Math.abs(n.getY(k)); if (ny > 0.6) uv.setXY(k, x / 1.3, z / 1.3); else if (nx > 0.6) uv.setXY(k, z / 1.3, y / 1.3); else uv.setXY(k, x / 1.3, y / 1.3); }
    const k0 = 0.92 + ((i * 7) % 6) * 0.025;
    return paint(g, (q, nn, c) => { c.setScalar(k0 * (0.62 + Math.min(1, q.y / H) * 0.45)); if (nn.y > 0.6) c.multiplyScalar(1.18); c.lerp(C('#fff2c8'), Math.max(0, nn.dot(SUN)) * 0.12); });
  });
  const m = new THREE.Mesh(mergeGeometries(parts)!, hedgeMaterial()); m.castShadow = shadow; m.receiveShadow = true; return m;
}

/** a wooden rowing boat pulled up on the sand: planked half-shell hull with a painted rim, two seats and an oar (len along x) */
export function rowboat(len = 2.6, wid = 1.2, shadow = true): THREE.Group {
  const g = new THREE.Group();
  const hullGeo = new THREE.SphereGeometry(1, 28, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2); hullGeo.scale(len / 2, 0.55, wid / 2);
  const p = hullGeo.attributes.position; for (let k = 0; k < p.count; k++) { const x = p.getX(k); p.setX(k, x * (x > 0 ? 1.08 : 1)); }
  hullGeo.computeVertexNormals();
  const plank = woodTexRot(); const hull = new THREE.Mesh(hullGeo, new THREE.MeshStandardMaterial({ map: plank, color: '#c98a52', roughness: 0.8, side: THREE.DoubleSide }));
  hull.position.y = 0.55; hull.rotation.x = Math.PI; hull.castShadow = shadow; hull.receiveShadow = true; g.add(hull);
  const rimG = new THREE.TorusGeometry(1, 0.05, 8, 40); rimG.rotateX(Math.PI / 2); rimG.scale(len / 2 * 1.02, 1, wid / 2 * 1.02);
  const rimM = new THREE.Mesh(rimG, new THREE.MeshStandardMaterial({ color: '#f3efe4', roughness: 0.6 })); rimM.position.y = 0.55; g.add(rimM);
  const seat = new THREE.MeshStandardMaterial({ color: '#8a5a30', roughness: 0.8 });
  for (const sx of [-0.35, 0.35]) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.05, wid * 0.86), seat); m.position.set(sx * len / 2, 0.42, 0); m.castShadow = shadow; g.add(m); }
  const oar = new THREE.Group(); const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.2, 6), seat); shaft.rotation.z = Math.PI / 2; oar.add(shaft);
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.03, 0.18), seat); blade.position.x = 1.2; oar.add(blade); oar.position.set(0, 0.6, wid * 0.2); oar.rotation.y = 0.3; oar.rotation.z = -0.15; g.add(oar);
  return g;
}
const woodTexRot = once(() => { const t = woodTex().clone(); t.needsUpdate = true; t.rotation = Math.PI / 2; t.repeat.set(2, 2); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; });

/** a dirt trail running along v (tiles along its length) with soft ragged grass edges left and right — for long scrolling paths */
export const trailTex = once(() => {
  const { c, g } = canvas(256, 512); const r = rng(97);
  g.fillStyle = '#c9a46c'; g.fillRect(0, 0, 256, 512);
  for (let i = 0; i < 70; i++) { const x = r() * 256, y = r() * 512, rad = 14 + r() * 40; const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, r() < 0.5 ? 'rgba(150,110,62,0.35)' : 'rgba(226,196,146,0.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); }
  for (const x of [84, 172]) { g.strokeStyle = 'rgba(120,85,45,0.16)'; g.lineWidth = 16; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 512); g.stroke(); }
  for (let i = 0; i < 260; i++) { const x = 20 + r() * 216, y = r() * 512, w = 2 + r() * 4, h = w * 0.7; g.fillStyle = ['#a99a86', '#bdb09a', '#8d7f6c', '#d8ccb6'][(r() * 4) | 0]; g.beginPath(); g.ellipse(x, y, w, h, r() * 3, 0, 7); g.fill(); }
  const mk = canvas(256, 512);
  for (let y = 0; y < 512; y += 2) { const e1 = 14 + Math.sin(y * 0.05) * 6 + r() * 4, e2 = 242 - (Math.sin(y * 0.043 + 2) * 6 + r() * 4); const gr = mk.g.createLinearGradient(0, 0, 256, 0); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(Math.max(0.01, (e1 - 10) / 256), 'rgba(0,0,0,0)'); gr.addColorStop(e1 / 256, 'rgba(0,0,0,1)'); gr.addColorStop(e2 / 256, 'rgba(0,0,0,1)'); gr.addColorStop(Math.min(0.99, (e2 + 10) / 256), 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); mk.g.fillStyle = gr; mk.g.fillRect(0, y, 256, 2); }
  g.globalCompositeOperation = 'destination-in'; g.drawImage(mk.c, 0, 0); g.globalCompositeOperation = 'source-over';
  const t = tex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
});
