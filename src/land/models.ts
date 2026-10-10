/**
 * 3D models for Fuzzies Land: houses, workshops, fields with growing crops, decorations, the Town Hall
 * and the Crossing Gate. 1 unit = 1 tile. Every model stands on the ground (y = 0), centred on its footprint.
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import * as T from './textures';
import * as GT from '../game/textures3d';
import * as M from '../game/models3d';

const mats = new Map<string, THREE.Material>();
let base: M.Mats | null = null;
/** The game's shared materials (bark, leaves, metal, fur…), made once. */
export const baseMats = (): M.Mats => (base ??= M.makeMaterials());
function mat(key: string, make: () => THREE.Material): THREE.Material {
  let m = mats.get(key);
  if (!m) { m = make(); mats.set(key, m); }
  return m;
}
export const std = (color: string, rough = 0.8, metal = 0) => mat(`s${color}${rough}${metal}`, () => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal }));
const textured = (key: string, map: THREE.Texture, repeat: [number, number], rough = 0.85, color = '#ffffff') => mat(`t${key}${repeat}`, () => {
  const t = map.clone();
  t.repeat.set(repeat[0], repeat[1]);
  t.needsUpdate = true;
  return new THREE.MeshStandardMaterial({ map: t, roughness: rough, color });
});
const glassMat = () => mat('glass', () => new THREE.MeshPhysicalMaterial({ color: 0x9fd4ff, roughness: 0.05, metalness: 0, clearcoat: 1, envMapIntensity: 1.6, emissive: 0x1a2a3a, emissiveIntensity: 0.3 }));
const gold = () => mat('gold', () => new THREE.MeshStandardMaterial({ color: 0xffc94a, metalness: 1, roughness: 0.22 }));

function add(g: THREE.Object3D, geo: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0, shadow = true): THREE.Mesh {
  const me = new THREE.Mesh(geo, m);
  me.position.set(x, y, z);
  me.castShadow = shadow;
  me.receiveShadow = true;
  g.add(me);
  return me;
}
const rbox = (w: number, h: number, d: number, r = 0.04) => new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2, h / 2, d / 2));

/** A window: glass pane in a white frame with a sill, on the +z face at (x, y). */
function windowOn(g: THREE.Group, x: number, y: number, z: number, w = 0.26, h = 0.3, ry = 0): void {
  const win = new THREE.Group();
  add(win, rbox(w + 0.06, h + 0.06, 0.04, 0.015), std('#fffaf0', 0.6));
  add(win, new THREE.BoxGeometry(w, h, 0.03), glassMat(), 0, 0, 0.012, false);
  add(win, new THREE.BoxGeometry(0.02, h, 0.035), std('#fffaf0', 0.6), 0, 0, 0.015, false);
  add(win, new THREE.BoxGeometry(w, 0.02, 0.035), std('#fffaf0', 0.6), 0, 0, 0.015, false);
  add(win, rbox(w + 0.1, 0.035, 0.08, 0.012), std('#fffaf0', 0.6), 0, -h / 2 - 0.03, 0.03);
  win.position.set(x, y, z);
  win.rotation.y = ry;
  g.add(win);
}

/** A round-topped wooden door on the +z face. */
function doorOn(g: THREE.Group, x: number, z: number, w = 0.28, h = 0.42, color = '#8a5a34', ry = 0): void {
  const d = new THREE.Group();
  const wood = textured('door' + color, T.planks(color), [1, 1], 0.7);
  add(d, new THREE.BoxGeometry(w, h - w / 2, 0.05), wood, 0, (h - w / 2) / 2, 0);
  add(d, new THREE.CylinderGeometry(w / 2, w / 2, 0.05, 20, 1, false, -Math.PI / 2, Math.PI).rotateX(Math.PI / 2), wood, 0, h - w / 2, 0);
  add(d, new THREE.SphereGeometry(0.018, 8, 6), gold(), w * 0.3, (h - w / 2) * 0.55, 0.03, false);
  add(d, rbox(w + 0.12, 0.04, 0.16, 0.015), std('#cfc6b8', 0.9), 0, 0.02, 0.05);
  d.position.set(x, 0, z);
  d.rotation.y = ry;
  g.add(d);
}

/** Gable roof over a w × d box whose walls end at height y; ridge runs along x. */
function gableRoof(g: THREE.Group, w: number, d: number, y: number, rise: number, color: string, overhang = 0.1): void {
  const half = d / 2 + overhang;
  const slope = Math.hypot(half, rise);
  const ang = Math.atan2(rise, half);
  const roofMat = textured('roof' + color, T.roofTiles(color), [Math.max(1, Math.round(w * 1.6)), Math.max(1, Math.round(slope * 1.6))], 0.7);
  for (const s of [-1, 1]) {
    const m = add(g, new THREE.BoxGeometry(w + overhang * 2, 0.06, slope), roofMat, 0, y + rise / 2, (s * half) / 2);
    m.rotation.x = s * ang;
  }
  add(g, new THREE.CylinderGeometry(0.05, 0.05, w + overhang * 2 + 0.02, 10).rotateZ(Math.PI / 2), std(T.shade(color, -0.2), 0.7), 0, y + rise + 0.02, 0);
  // the triangular gable ends (wall colour comes from the caller's last wall material)
  const tri = new THREE.Shape();
  tri.moveTo(-d / 2, 0); tri.lineTo(d / 2, 0); tri.lineTo(0, rise - 0.02); tri.closePath();
  const gableGeo = new THREE.ExtrudeGeometry(tri, { depth: w - 0.02, bevelEnabled: false }).rotateY(Math.PI / 2).translate(-(w - 0.02) / 2, 0, 0);
  add(g, gableGeo, std('#fff4e6', 0.85), 0, y, 0);
}

function chimney(g: THREE.Group, x: number, y: number, z: number, h = 0.35): void {
  add(g, rbox(0.16, h, 0.16, 0.02), textured('chim', T.bricks('#a4553a'), [1, 1]), x, y + h / 2, z);
  add(g, rbox(0.2, 0.05, 0.2, 0.015), std('#5b4a43', 0.8), x, y + h, z);
}

// ---------- houses ----------
const COTTAGE_LOOKS: { wall: string; roof: string; door: string }[] = [
  { wall: '#fff1e2', roof: '#d6336c', door: '#8a5a34' },
  { wall: '#e7f6ef', roof: '#2f9e8f', door: '#6d4c3d' },
  { wall: '#fff4d6', roof: '#e8590c', door: '#7b4a2a' },
  { wall: '#f3eefe', roof: '#4c6ef5', door: '#8a5a34' },
];

export function cottage(seed: number): THREE.Group {
  const look = COTTAGE_LOOKS[seed % COTTAGE_LOOKS.length];
  const g = new THREE.Group();
  add(g, rbox(1.62, 0.12, 1.42, 0.04), std('#cfc6b8', 0.9), 0, 0.06, 0);
  add(g, rbox(1.4, 0.8, 1.15, 0.05), textured('plaster' + look.wall, T.plaster(look.wall), [2, 1]), 0, 0.52, 0);
  gableRoof(g, 1.4, 1.15, 0.92, 0.55, look.roof);
  chimney(g, 0.42, 1.05, -0.2);
  doorOn(g, -0.25, 0.6, 0.28, 0.46, look.door);
  windowOn(g, 0.3, 0.6, 0.585);
  windowOn(g, 0.72, 0.55, 0, 0.24, 0.28, Math.PI / 2);
  windowOn(g, -0.72, 0.55, 0, 0.24, 0.28, -Math.PI / 2);
  // flower box
  add(g, rbox(0.34, 0.07, 0.08, 0.02), textured('box', T.planks('#9c6b43'), [1, 1]), 0.3, 0.4, 0.64);
  for (let i = 0; i < 5; i++) add(g, new THREE.IcosahedronGeometry(0.035, 1), std(['#ff6b9a', '#ffd43b', '#ffffff'][i % 3], 0.6), 0.18 + i * 0.06, 0.46, 0.64, false);
  return g;
}

export function mushroomHouse(): THREE.Group {
  const g = new THREE.Group();
  add(g, new THREE.CylinderGeometry(0.85, 0.9, 0.1, 32), std('#cfc6b8', 0.9), 0, 0.05, 0);
  const stalk = add(g, new THREE.CylinderGeometry(0.5, 0.58, 0.95, 28), textured('stalk', T.plaster('#fbf1dd'), [3, 1]), 0, 0.57, 0);
  stalk.scale.z = 0.95;
  const cap = add(g, new THREE.SphereGeometry(0.88, 36, 20, 0, Math.PI * 2, 0, Math.PI / 2), mat('cap', () => new THREE.MeshStandardMaterial({ map: T.mushroomCap(), roughness: 0.45 })), 0, 0.98, 0);
  cap.scale.set(1, 0.72, 1);
  add(g, new THREE.CylinderGeometry(0.86, 0.6, 0.08, 32), std('#f2e2c9', 0.9), 0, 0.98, 0);
  doorOn(g, 0, 0.52, 0.26, 0.48, '#8a5a34');
  windowOn(g, 0.36, 0.72, 0.38, 0.18, 0.2, 0.75);
  windowOn(g, -0.36, 0.72, 0.38, 0.18, 0.2, -0.75);
  return g;
}

export function treehouse(): THREE.Group {
  const g = new THREE.Group();
  const m = baseMats();
  add(g, new THREE.CylinderGeometry(0.2, 0.32, 1.2, 12), m.bark, 0, 0.6, 0);
  add(g, rbox(1.5, 0.08, 1.3, 0.03), textured('deck', T.planks('#a0703f'), [2, 2]), 0, 1.2, 0);
  add(g, rbox(0.95, 0.6, 0.8, 0.04), textured('thwall', T.planks('#c98b4e'), [1, 1]), 0, 1.54, 0);
  gableRoof(g, 0.95, 0.8, 1.84, 0.38, '#2f9e44');
  doorOn(g, -0.15, 0.405, 0.2, 0.34, '#6d4c3d');
  g.children[g.children.length - 1].position.y = 1.24;
  windowOn(g, 0.22, 1.56, 0.405, 0.18, 0.2);
  // railing + ladder + leafy crown
  for (let i = 0; i < 7; i++) add(g, new THREE.CylinderGeometry(0.015, 0.015, 0.22, 6), std('#8a5a34'), -0.7 + i * 0.233, 1.35, 0.62, false);
  add(g, new THREE.BoxGeometry(1.45, 0.03, 0.03), std('#8a5a34'), 0, 1.45, 0.62);
  for (let i = 0; i < 6; i++) add(g, new THREE.BoxGeometry(0.3, 0.03, 0.04), std('#8a5a34'), 0.45, 0.15 + i * 0.19, 0.72, false);
  for (const s of [-1, 1]) add(g, new THREE.BoxGeometry(0.03, 1.2, 0.04), std('#8a5a34'), 0.45 + s * 0.14, 0.6, 0.72);
  const crown = new THREE.Mesh(M.bushGeometry(9, 1.5), m.leaves);
  crown.position.set(-0.1, 1.9, -0.45);
  crown.castShadow = true;
  g.add(crown);
  return g;
}

export function villa(): THREE.Group {
  const g = new THREE.Group();
  const wall = textured('villa', T.plaster('#f1f6ff'), [3, 2]);
  add(g, rbox(2.7, 0.14, 2.5, 0.05), std('#d8dee9', 0.9), 0, 0.07, 0);
  add(g, rbox(2.1, 1.5, 1.6, 0.06), wall, 0, 0.88, -0.1);
  gableRoof(g, 2.1, 1.6, 1.63, 0.6, '#5c7cfa');
  for (const s of [-1, 1]) {
    add(g, new THREE.CylinderGeometry(0.34, 0.36, 1.9, 24), wall, s * 1.0, 1.05, 0.55);
    add(g, new THREE.ConeGeometry(0.42, 0.7, 24), textured('vroof', T.roofTiles('#5c7cfa'), [3, 1], 0.6), s * 1.0, 2.35, 0.55);
    add(g, new THREE.SphereGeometry(0.06, 10, 8), gold(), s * 1.0, 2.75, 0.55);
    windowOn(g, s * 1.0, 1.45, 0.9, 0.18, 0.26);
  }
  doorOn(g, 0, 0.71, 0.36, 0.6, '#5a6fa8');
  for (const x of [-0.55, 0.55]) { windowOn(g, x, 0.6, 0.71, 0.3, 0.32); windowOn(g, x, 1.25, 0.71, 0.3, 0.32); }
  windowOn(g, 0, 1.25, 0.71, 0.3, 0.32);
  // little cloud puffs around the base
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    add(g, new THREE.IcosahedronGeometry(0.16 + (i % 3) * 0.04, 2), std('#ffffff', 0.9), Math.cos(a) * 1.25, 0.12, Math.sin(a) * 1.15, false);
  }
  return g;
}

// ---------- special ----------
export function townHall(): THREE.Group {
  const g = new THREE.Group();
  const white = std('#fdf8f0', 0.6);
  add(g, rbox(2.9, 0.18, 2.9, 0.05), textured('hallbase', GT.stone(), [3, 3]), 0, 0.09, 0);
  for (let i = 0; i < 3; i++) add(g, rbox(1.4, 0.06, 0.3 - i * 0.08, 0.02), white, 0, 0.21 + i * 0.06, 1.4 - i * 0.08);
  add(g, rbox(2.4, 1.1, 1.9, 0.06), textured('hallwall', T.plaster('#e5534b'), [3, 2]), 0, 0.73, -0.25);
  // columns + pediment
  for (let i = 0; i < 4; i++) add(g, new THREE.CylinderGeometry(0.08, 0.09, 1.0, 16), white, -0.75 + i * 0.5, 0.7, 0.95);
  add(g, rbox(2.0, 0.12, 0.5, 0.03), white, 0, 1.26, 0.85);
  const tri = new THREE.Shape(); tri.moveTo(-1.05, 0); tri.lineTo(1.05, 0); tri.lineTo(0, 0.45); tri.closePath();
  add(g, new THREE.ExtrudeGeometry(tri, { depth: 0.12, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 2 }), std('#2f9e8f', 0.6), 0, 1.32, 0.95);
  add(g, new THREE.CircleGeometry(0.11, 24), glassMat(), 0, 1.5, 1.09, false);
  gableRoof(g, 2.4, 1.9, 1.28, 0.5, '#2f9e8f');
  // dome tower
  add(g, new THREE.CylinderGeometry(0.42, 0.45, 0.6, 24), white, 0, 2.0, -0.25);
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; add(g, new THREE.BoxGeometry(0.1, 0.32, 0.04), glassMat(), Math.sin(a) * 0.43, 2.02, -0.25 + Math.cos(a) * 0.43).rotation.y = a; }
  add(g, new THREE.SphereGeometry(0.44, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), gold(), 0, 2.3, -0.25);
  add(g, new THREE.CylinderGeometry(0.012, 0.012, 0.6, 6), std('#888', 0.4, 0.8), 0, 2.95, -0.25);
  const flag = add(g, new THREE.PlaneGeometry(0.28, 0.18), mat('flag', () => new THREE.MeshStandardMaterial({ color: '#d6336c', side: THREE.DoubleSide, roughness: 0.7 })), 0.14, 3.15, -0.25, false);
  flag.name = 'flag';
  doorOn(g, 0, 0.71, 0.4, 0.7, '#7b4a2a');
  g.children[g.children.length - 1].position.y = 0.18;
  for (const x of [-0.85, 0.85]) windowOn(g, x, 0.75, 0.71, 0.26, 0.38);
  return g;
}

export function crossingGate(): THREE.Group {
  const g = new THREE.Group();
  const stoneMat = textured('gatestone', GT.stone(), [1, 2]);
  for (const s of [-1, 1]) {
    add(g, rbox(0.36, 1.5, 0.4, 0.05), stoneMat, s * 0.72, 0.75, 0);
    add(g, new THREE.SphereGeometry(0.16, 16, 12), std('#2f9e44', 0.7), s * 0.72, 1.6, 0);
  }
  const arch = add(g, new THREE.TorusGeometry(0.72, 0.16, 12, 32, Math.PI), stoneMat, 0, 1.45, 0);
  arch.scale.set(1, 0.55, 1.2);
  const signMat = mat('gatesign', () => new THREE.MeshStandardMaterial({ map: T.sign('Fuzzy Crossing', '#2f9e44'), roughness: 0.6 }));
  add(g, new THREE.BoxGeometry(1.25, 0.39, 0.04), signMat, 0, 1.62, 0.24);
  // the portal shimmer between the pillars (animated by the view)
  const portal = add(g, new THREE.PlaneGeometry(1.08, 1.4), mat('portal', () => new THREE.MeshBasicMaterial({ map: GT.glow('rgba(140,255,200,0.95)', 'rgba(60,200,255,0)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })), 0, 0.75, 0, false);
  portal.name = 'portal';
  // stepping stones and lily pads in front
  for (let i = 0; i < 3; i++) add(g, new THREE.CylinderGeometry(0.14, 0.16, 0.05, 14), std('#8f9a92', 0.9), (i - 1) * 0.3, 0.025, 0.65);
  return g;
}

// ---------- workshops ----------
export function bakery(): THREE.Group {
  const g = new THREE.Group();
  add(g, rbox(1.75, 0.12, 1.75, 0.04), std('#cfc6b8', 0.9), 0, 0.06, 0);
  add(g, rbox(1.5, 0.9, 1.3, 0.04), textured('bakery', T.bricks('#c8734f'), [2, 1]), 0, 0.57, -0.05);
  gableRoof(g, 1.5, 1.3, 1.02, 0.5, '#8d5524');
  chimney(g, -0.45, 1.15, -0.25, 0.42);
  const awn = add(g, new THREE.BoxGeometry(1.3, 0.04, 0.42), textured('awn', T.stripes('#e03131', '#fff5f5', 10), [1, 1], 0.7), 0, 0.93, 0.78);
  awn.rotation.x = 0.35;
  add(g, new THREE.BoxGeometry(0.9, 0.24, 0.03), mat('bakesign', () => new THREE.MeshStandardMaterial({ map: T.sign('Bakery', '#8d5524'), roughness: 0.6 })), 0, 1.14, 0.62);
  doorOn(g, -0.4, 0.61, 0.28, 0.48, '#7b4a2a');
  // display window with bread
  add(g, new THREE.BoxGeometry(0.6, 0.36, 0.03), glassMat(), 0.25, 0.55, 0.615, false);
  for (let i = 0; i < 3; i++) { const b = add(g, new THREE.CapsuleGeometry(0.05, 0.12, 4, 8).rotateZ(Math.PI / 2), std('#d9a05b', 0.6), 0.08 + i * 0.17, 0.42, 0.58, false); b.scale.y = 0.8; }
  g.userData.smoke = new THREE.Vector3(-0.45, 1.65, -0.25);
  return g;
}

export function popcornStand(): THREE.Group {
  const g = new THREE.Group();
  add(g, rbox(1.7, 0.1, 1.7, 0.04), std('#cfc6b8', 0.9), 0, 0.05, 0);
  const stripe = textured('pop', T.stripes('#e03131', '#ffffff', 12), [2, 1], 0.6);
  add(g, rbox(1.3, 0.75, 1.1, 0.06), stripe, 0, 0.47, 0);
  add(g, rbox(1.4, 0.08, 0.35, 0.03), std('#ffd43b', 0.5), 0, 0.62, 0.62);
  add(g, new THREE.BoxGeometry(1.0, 0.3, 0.03), glassMat(), 0, 0.48, 0.555, false);
  // big popcorn bucket on the roof
  add(g, new THREE.CylinderGeometry(0.42, 0.3, 0.6, 24, 1, true), mat('bucket', () => { const m = textured('bk', T.stripes('#e03131', '#ffffff', 16), [1, 1], 0.6).clone() as THREE.MeshStandardMaterial; m.side = THREE.DoubleSide; return m; }), 0, 1.15, 0);
  const pr = GT.rng(5);
  for (let i = 0; i < 26; i++) add(g, new THREE.IcosahedronGeometry(0.07 + pr() * 0.04, 1), std(pr() < 0.8 ? '#fff6dc' : '#ffd43b', 0.8), (pr() - 0.5) * 0.65, 1.45 + pr() * 0.2, (pr() - 0.5) * 0.65, false);
  add(g, new THREE.BoxGeometry(1.0, 0.24, 0.03), mat('popsign', () => new THREE.MeshStandardMaterial({ map: T.sign('Popcorn', '#e03131'), roughness: 0.6 })), 0, 0.98, 0.58);
  return g;
}

export function weaver(): THREE.Group {
  const g = new THREE.Group();
  add(g, rbox(1.75, 0.12, 1.75, 0.04), std('#cfc6b8', 0.9), 0, 0.06, 0);
  add(g, rbox(1.5, 0.95, 1.3, 0.04), textured('weave', T.planks('#4c8bd6'), [2, 1]), 0, 0.6, -0.05);
  gableRoof(g, 1.5, 1.3, 1.07, 0.55, '#e8590c');
  doorOn(g, 0, 0.61, 0.42, 0.62, '#7b4a2a');
  windowOn(g, -0.5, 0.65, 0.61, 0.22, 0.26);
  windowOn(g, 0.5, 0.65, 0.61, 0.22, 0.26);
  // yarn ball on the roof
  const yarn = new THREE.Group();
  add(yarn, new THREE.SphereGeometry(0.28, 20, 14), std('#f783ac', 0.9), 0, 0, 0);
  for (let i = 0; i < 5; i++) { const t = add(yarn, new THREE.TorusGeometry(0.28, 0.018, 6, 30), std('#e64980', 0.9), 0, 0, 0, false); t.rotation.set(i * 0.6, i * 1.1, 0); }
  yarn.position.set(0.3, 1.78, 0.1);
  yarn.name = 'yarn';
  g.add(yarn);
  return g;
}

// ---------- fields & crops ----------
export function field(): THREE.Group {
  const g = new THREE.Group();
  add(g, rbox(0.94, 0.08, 0.94, 0.03), mat('soil', () => new THREE.MeshStandardMaterial({ map: T.soil(), roughness: 1 })), 0, 0.04, 0);
  return g;
}

const cropCache = new Map<string, THREE.Group>();
/** A patch of plants for one field (scale it 0→1 vertically as it grows). */
export function crop(id: string): THREE.Group {
  const cached = cropCache.get(id);
  if (cached) return cached.clone();
  const g = new THREE.Group();
  const r = GT.rng(id.length * 31);
  const grid = (n: number, fn: (x: number, z: number, i: number) => void) => { for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) fn(-0.33 + (i * 0.66) / (n - 1) + (r() - 0.5) * 0.06, -0.33 + (j * 0.66) / (n - 1) + (r() - 0.5) * 0.06, i * n + j); };
  if (id === 'wheat') {
    grid(5, (x, z) => { for (let k = 0; k < 3; k++) { const h = 0.3 + r() * 0.08; const sx = x + (r() - 0.5) * 0.08, sz = z + (r() - 0.5) * 0.08; add(g, new THREE.CylinderGeometry(0.006, 0.008, h, 4), std('#c9a227', 0.8), sx, 0.08 + h / 2, sz, false); const e = add(g, new THREE.CapsuleGeometry(0.018, 0.07, 3, 6), std('#e8c547', 0.7), sx, 0.1 + h, sz, false); e.rotation.z = (r() - 0.5) * 0.4; } });
  } else if (id === 'corn') {
    grid(3, (x, z) => { add(g, new THREE.CylinderGeometry(0.014, 0.02, 0.6, 6), std('#5c940d', 0.8), x, 0.38, z, false); for (let k = 0; k < 3; k++) { const l = add(g, new THREE.PlaneGeometry(0.06, 0.28), mat('leaf', () => new THREE.MeshStandardMaterial({ color: '#74b816', side: THREE.DoubleSide, roughness: 0.8 })), x, 0.25 + k * 0.12, z, false); l.rotation.set(0.7, k * 2.1, 0.3); } add(g, new THREE.CapsuleGeometry(0.03, 0.1, 4, 8), std('#ffd43b', 0.6), x + 0.04, 0.45, z, false); });
  } else if (id === 'carrot') {
    grid(4, (x, z) => { add(g, new THREE.ConeGeometry(0.035, 0.14, 8).rotateX(Math.PI), std('#f76707', 0.6), x, 0.12, z, false); for (let k = 0; k < 4; k++) { const l = add(g, new THREE.ConeGeometry(0.02, 0.2, 5), std('#40c057', 0.8), x + (r() - 0.5) * 0.04, 0.26, z + (r() - 0.5) * 0.04, false); l.rotation.set((r() - 0.5) * 0.7, 0, (r() - 0.5) * 0.7); } });
  } else if (id === 'candy') {
    const striped = textured('candy', T.stripes('#e03131', '#ffffff', 10), [1, 4], 0.4);
    grid(3, (x, z) => { add(g, new THREE.CylinderGeometry(0.022, 0.022, 0.32, 10), striped, x, 0.24, z, false); const h = add(g, new THREE.TorusGeometry(0.06, 0.022, 8, 16, Math.PI), striped, x + 0.06, 0.4, z, false); h.rotation.y = r() * 3; });
  } else if (id === 'cotton') {
    grid(3, (x, z) => { add(g, new THREE.CylinderGeometry(0.012, 0.016, 0.3, 5), std('#6b4a2f', 0.9), x, 0.23, z, false); for (let k = 0; k < 4; k++) add(g, new THREE.IcosahedronGeometry(0.05 + r() * 0.025, 1), std('#ffffff', 0.95), x + (r() - 0.5) * 0.12, 0.33 + r() * 0.1, z + (r() - 0.5) * 0.12, false); });
  }
  cropCache.set(id, g);
  return g.clone();
}

// ---------- decorations ----------
export function decorTree(seed: number): THREE.Group {
  const t = M.makeTree(baseMats(), seed, 0.5);
  return t;
}

export function flowerBed(seed: number): THREE.Group {
  const g = new THREE.Group();
  add(g, rbox(0.86, 0.12, 0.86, 0.04), textured('bedrim', GT.stone(), [1, 1]), 0, 0.06, 0);
  add(g, new THREE.BoxGeometry(0.72, 0.02, 0.72), mat('soil', () => new THREE.MeshStandardMaterial({ map: T.soil(), roughness: 1 })), 0, 0.12, 0);
  const r = GT.rng(seed + 3);
  const cols = ['#ff6b9a', '#ffd43b', '#ffffff', '#cc5de8', '#ff922b'];
  for (let i = 0; i < 14; i++) {
    const x = (r() - 0.5) * 0.6, z = (r() - 0.5) * 0.6, h = 0.12 + r() * 0.12;
    add(g, new THREE.CylinderGeometry(0.008, 0.008, h, 4), std('#2b8a3e'), x, 0.13 + h / 2, z, false);
    add(g, new THREE.IcosahedronGeometry(0.045, 1), std(cols[Math.floor(r() * cols.length)], 0.5), x, 0.14 + h, z, false);
  }
  return g;
}

export function pathTile(): THREE.Group {
  const g = new THREE.Group();
  add(g, rbox(0.98, 0.05, 0.98, 0.02), textured('path', GT.stone(), [1, 1], 0.9, '#e9e4dc'), 0, 0.025, 0, false);
  return g;
}

export function bench(): THREE.Group {
  const g = new THREE.Group();
  const wood = textured('bench', T.planks('#b07745'), [1, 1], 0.7);
  for (let i = 0; i < 3; i++) add(g, rbox(0.7, 0.03, 0.08, 0.01), wood, 0, 0.3, -0.1 + i * 0.1);
  for (let i = 0; i < 2; i++) { const b = add(g, rbox(0.7, 0.03, 0.08, 0.01), wood, 0, 0.45 + i * 0.1, -0.2); b.rotation.x = -0.2; }
  for (const x of [-0.3, 0.3]) for (const z of [-0.12, 0.12]) add(g, new THREE.BoxGeometry(0.03, 0.3, 0.03), std('#2a2d33', 0.4, 0.8), x, 0.15, z);
  return g;
}

export function lampPost(): THREE.Group {
  const l = M.makeLamp(baseMats(), 1);
  l.group.scale.setScalar(0.55);
  const g = new THREE.Group();
  g.add(l.group);
  g.userData.light = l.head.clone().multiplyScalar(0.55);
  return g;
}

export function fountain(): THREE.Group {
  const g = new THREE.Group();
  const stoneMat = textured('fstone', GT.stone(), [3, 1], 0.85, '#efe9df');
  add(g, new THREE.CylinderGeometry(0.85, 0.9, 0.3, 36), stoneMat, 0, 0.15, 0);
  const water = add(g, new THREE.CylinderGeometry(0.76, 0.76, 0.02, 36), mat('fwater', () => new THREE.MeshPhysicalMaterial({ color: 0x4dabf7, roughness: 0.05, transmission: 0, clearcoat: 1, envMapIntensity: 1.5 })), 0, 0.27, 0, false);
  water.name = 'water';
  add(g, new THREE.CylinderGeometry(0.1, 0.16, 0.6, 16), stoneMat, 0, 0.55, 0);
  add(g, new THREE.CylinderGeometry(0.34, 0.22, 0.1, 24), stoneMat, 0, 0.88, 0);
  add(g, new THREE.SphereGeometry(0.1, 14, 10), stoneMat, 0, 1.0, 0);
  g.userData.spout = new THREE.Vector3(0, 1.05, 0);
  return g;
}

export function goldenStatue(): THREE.Group {
  const g = new THREE.Group();
  add(g, rbox(0.6, 0.35, 0.6, 0.04), textured('ped', GT.stone(), [1, 1], 0.8, '#f2ece2'), 0, 0.175, 0);
  const f = M.makeFuzzy(baseMats(), ['#fff3b0', '#e0a100'], 0.2, 0.06, 8, { metallic: true });
  f.group.position.y = 0.6;
  g.add(f.group);
  return g;
}

export function rainbowArch(): THREE.Group {
  const g = new THREE.Group();
  const cols = ['#ff6b6b', '#ffa94d', '#ffd43b', '#69db7c', '#4dabf7', '#9775fa'];
  cols.forEach((c, i) => add(g, new THREE.TorusGeometry(0.95 - i * 0.07, 0.035, 8, 40, Math.PI), mat('rb' + c, () => new THREE.MeshStandardMaterial({ color: c, roughness: 0.4, emissive: c, emissiveIntensity: 0.15 })), 0, 0.1, 0));
  for (const s of [-1, 1]) for (let i = 0; i < 4; i++) add(g, new THREE.IcosahedronGeometry(0.14 + i * 0.02, 2), std('#ffffff', 0.9), s * (0.75 + (i % 2) * 0.12), 0.1 + i * 0.03, (i - 1.5) * 0.08, false);
  return g;
}

/** Build the model for a placed item. `seed` varies colours between copies (cottages, flower beds). */
export function modelFor(itemId: string, seed: number): THREE.Group {
  switch (itemId) {
    case 'cottage': return cottage(seed);
    case 'mushroom': return mushroomHouse();
    case 'treehouse': return treehouse();
    case 'villa': return villa();
    case 'hall': return townHall();
    case 'gate': return crossingGate();
    case 'bakery': return bakery();
    case 'popcorn': return popcornStand();
    case 'weaver': return weaver();
    case 'field': return field();
    case 'tree': return decorTree(seed);
    case 'flowers': return flowerBed(seed);
    case 'path': return pathTile();
    case 'bench': return bench();
    case 'lamp': return lampPost();
    case 'fountain': return fountain();
    case 'statue': return goldenStatue();
    case 'rainbow': return rainbowArch();
    default: return new THREE.Group();
  }
}
