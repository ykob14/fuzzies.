/**
 * 3D models for Fuzzies Land: houses, workshops, fields with growing crops, decorations, the Town Hall
 * and the Crossing Gate. 1 unit = 1 tile. Every model stands on the ground (y = 0), centred on its footprint.
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import * as T from './textures';
import * as GT from '../game/textures3d';
import * as M from '../game/models3d';
import * as ENV from './environment';

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

/** Fuzzies Land building palette (ART.md). */
export const PAL = {
  cream: '#fff4e3', blush: '#ffe3ea', mint: '#e2f5ea', butter: '#fff0c6', trim: '#fffaf2',
  stone: '#e6ddd0', stoneDark: '#b9ad9c', wood: '#c98b55', woodDark: '#9c6638', gold: '#ffc94a',
  raspberry: '#e45a78', coral: '#f2785c', teal: '#33ab9b', sky: '#5aa2e6', butterRoof: '#f5c84c',
};
const warmGlass = () => mat('warmglass', () => new THREE.MeshPhysicalMaterial({ color: 0xbfe4ff, roughness: 0.08, clearcoat: 1, envMapIntensity: 1.4, emissive: 0x3b2a10, emissiveIntensity: 0.25 }));

/** The stone base every building stands on. */
function plinth(g: THREE.Group, w: number, d: number, h = 0.15): void {
  add(g, rbox(w, h, d, 0.05), textured('plinth', T.stoneBlocks(), [Math.max(1, w), 0.5], 0.9, PAL.stone), 0, h / 2, 0);
}

/** Rounded corner trims on a box of walls (w × d, from y0 up h). */
function cornerTrims(g: THREE.Group, w: number, d: number, y0: number, h: number, color = PAL.trim): void {
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(g, rbox(0.08, h, 0.08, 0.025), std(color, 0.7), sx * (w / 2), y0 + h / 2, sz * (d / 2));
}

/** A window: framed glass with cross bars, a sill and (optionally) painted shutters, on the +z face at (x, y). */
function windowOn(g: THREE.Group, x: number, y: number, z: number, w = 0.26, h = 0.3, ry = 0, shutter = ''): void {
  const win = new THREE.Group();
  add(win, rbox(w + 0.08, h + 0.08, 0.05, 0.02), std(PAL.trim, 0.6));
  add(win, new THREE.BoxGeometry(w, h, 0.03), warmGlass(), 0, 0, 0.014, false);
  add(win, new THREE.BoxGeometry(0.022, h, 0.04), std(PAL.trim, 0.6), 0, 0, 0.018, false);
  add(win, new THREE.BoxGeometry(w, 0.022, 0.04), std(PAL.trim, 0.6), 0, 0, 0.018, false);
  add(win, rbox(w + 0.14, 0.045, 0.1, 0.015), std(PAL.trim, 0.6), 0, -h / 2 - 0.04, 0.035);
  if (shutter) for (const sx of [-1, 1]) add(win, rbox(w * 0.48, h + 0.06, 0.03, 0.012), textured('shut' + shutter, T.planks(shutter), [0.5, 1], 0.7), sx * (w / 2 + w * 0.3), 0, 0.01);
  win.position.set(x, y, z);
  win.rotation.y = ry;
  g.add(win);
}

/** A round-topped wooden door with a step and (optionally) a little canopy, on the +z face. */
function doorOn(g: THREE.Group, x: number, z: number, w = 0.28, h = 0.42, color = '#8a5a34', ry = 0, canopy = ''): void {
  const d = new THREE.Group();
  const wood = textured('door' + color, T.planks(color), [1, 1], 0.7);
  add(d, rbox(w + 0.08, h + 0.04, 0.04, 0.02), std(PAL.trim, 0.6), 0, (h + 0.04) / 2 - 0.02, -0.005);
  // a dark doorway behind, and the door leaf on a hinge so it can swing open when a Fuzzy goes in
  add(d, new THREE.BoxGeometry(w, h - 0.02, 0.02), std('#3b2a20', 0.9), 0, (h - 0.02) / 2, 0.012, false);
  const leaf = new THREE.Group();
  leaf.name = 'doorleaf';
  leaf.position.set(-w / 2, 0, 0.02);
  add(leaf, new THREE.BoxGeometry(w, h - w / 2, 0.05), wood, w / 2, (h - w / 2) / 2, 0);
  add(leaf, new THREE.CylinderGeometry(w / 2, w / 2, 0.05, 20, 1, false, -Math.PI / 2, Math.PI).rotateX(Math.PI / 2), wood, w / 2, h - w / 2, 0);
  add(leaf, new THREE.SphereGeometry(0.02, 8, 6), gold(), w * 0.8, (h - w / 2) * 0.55, 0.03, false);
  add(leaf, new THREE.BoxGeometry(w * 0.55, 0.012, 0.012), std(T.shade(color, -0.15), 0.7), w / 2, (h - w / 2) * 0.8, 0.028, false);
  d.add(leaf);
  add(d, rbox(w + 0.16, 0.05, 0.2, 0.02), std(PAL.stoneDark, 0.9), 0, 0.025, 0.08);
  if (canopy) {
    const c = add(d, rbox(w + 0.22, 0.05, 0.22, 0.02), std(canopy, 0.7), 0, h + 0.1, 0.1);
    c.rotation.x = 0.35;
    for (const sx of [-1, 1]) add(d, new THREE.BoxGeometry(0.025, 0.12, 0.025), std(PAL.woodDark), sx * (w / 2 + 0.06), h + 0.02, 0.12, false);
  }
  d.position.set(x, 0, z);
  d.rotation.y = ry;
  g.add(d);
  if (!g.userData.door && ry === 0) g.userData.door = new THREE.Vector3(x, 0, z + 0.06);
}

/** A chunky gable roof over a w × d block whose walls end at height y; the ridge runs along x. */
function gableRoof(g: THREE.Group, w: number, d: number, y: number, rise: number, color: string, overhang = 0.14, gableColor = PAL.trim): void {
  const half = d / 2 + overhang;
  const slope = Math.hypot(half, rise);
  const ang = Math.atan2(rise, half);
  const roofMat = textured('roof' + color, T.roofTiles(color), [Math.max(1, Math.round(w * 1.4)), Math.max(1, Math.round(slope * 1.4))], 0.75);
  const rim = std(T.shade(color, -0.12), 0.7);
  for (const s of [-1, 1]) {
    const m = add(g, rbox(w + overhang * 2, 0.1, slope, 0.04), roofMat, 0, y + rise / 2 + 0.03, (s * half) / 2);
    m.rotation.x = s * ang;
    // a soft rounded rim along the eaves
    add(g, new THREE.CylinderGeometry(0.055, 0.055, w + overhang * 2, 10).rotateZ(Math.PI / 2), rim, 0, y + 0.02, s * (half - 0.02));
  }
  add(g, new THREE.CylinderGeometry(0.075, 0.075, w + overhang * 2 + 0.04, 12).rotateZ(Math.PI / 2), rim, 0, y + rise + 0.07, 0);
  const tri = new THREE.Shape();
  tri.moveTo(-d / 2, 0); tri.lineTo(d / 2, 0); tri.lineTo(0, rise - 0.02); tri.closePath();
  const gableGeo = new THREE.ExtrudeGeometry(tri, { depth: w - 0.02, bevelEnabled: false }).rotateY(Math.PI / 2).translate(-(w - 0.02) / 2, 0, 0);
  add(g, gableGeo, std(gableColor, 0.85), 0, y, 0);
}

function chimney(g: THREE.Group, x: number, y: number, z: number, h = 0.38): void {
  add(g, rbox(0.18, h, 0.18, 0.03), textured('chim', T.bricks('#c06a48'), [1, 1]), x, y + h / 2, z);
  add(g, rbox(0.24, 0.06, 0.24, 0.02), std('#7a6a62', 0.8), x, y + h, z);
  add(g, new THREE.CylinderGeometry(0.05, 0.05, 0.02, 12), std('#2a2220', 1), x, y + h + 0.03, z, false);
  if (!g.userData.chimney) g.userData.chimney = new THREE.Vector3(x, y + h + 0.08, z);
}

/** A little white picket fence from (x0, z) to (x1, z) on the +z side (rotate the group for other sides). */
function picket(g: THREE.Group, x0: number, x1: number, z: number, h = 0.16, color = '#fffaf2'): void {
  const n = Math.max(2, Math.round((x1 - x0) / 0.09));
  const m = std(color, 0.7);
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n;
    add(g, new THREE.BoxGeometry(0.028, h, 0.02), m, x, h / 2, z, false);
    add(g, new THREE.ConeGeometry(0.02, 0.035, 4).rotateY(Math.PI / 4), m, x, h + 0.015, z, false);
  }
  for (const y of [h * 0.35, h * 0.75]) add(g, new THREE.BoxGeometry(x1 - x0, 0.018, 0.012), m, (x0 + x1) / 2, y, z - 0.014, false);
}

/** A warm lantern on a wall (glows a little). */
function lantern(g: THREE.Group, x: number, y: number, z: number): void {
  add(g, new THREE.BoxGeometry(0.02, 0.02, 0.06), std('#3b3a40', 0.5, 0.6), x, y + 0.06, z + 0.03, false);
  add(g, new THREE.CylinderGeometry(0.035, 0.028, 0.08, 8), mat('lanternglass', () => new THREE.MeshStandardMaterial({ color: '#fff1c2', emissive: '#ffcc66', emissiveIntensity: 0.9, roughness: 0.3 })), x, y, z + 0.07, false);
  add(g, new THREE.ConeGeometry(0.045, 0.04, 8), std('#3b3a40', 0.5, 0.6), x, y + 0.06, z + 0.07, false);
}

/** Stepping stones from (x, z0) to (x, z1). */
function steppingStones(g: THREE.Group, x: number, z0: number, z1: number): void {
  const n = Math.max(1, Math.round(Math.abs(z1 - z0) / 0.14));
  for (let i = 0; i <= n; i++) {
    const z = z0 + ((z1 - z0) * i) / n;
    const st = add(g, new THREE.CylinderGeometry(0.07 + (i % 2) * 0.012, 0.075, 0.025, 10), std(i % 2 ? '#e6ddd0' : '#d9cfc0', 0.9), x + (i % 2 ? 0.02 : -0.02), 0.012, z, false);
    st.scale.z = 0.8;
  }
}

/** A tiny round mailbox on a post. */
function mailbox(g: THREE.Group, x: number, z: number, color: string): void {
  add(g, new THREE.BoxGeometry(0.025, 0.2, 0.025), std(PAL.woodDark, 0.8), x, 0.1, z, false);
  add(g, new THREE.CapsuleGeometry(0.045, 0.08, 4, 10).rotateX(Math.PI / 2), std(color, 0.5), x, 0.23, z);
  add(g, new THREE.BoxGeometry(0.008, 0.06, 0.03), std('#e03131', 0.5), x + 0.05, 0.27, z - 0.02, false);
}

/** Fuzzies' outfits for the residents of Fuzzies Land (sits on the body so it squashes along). */
export function fuzzyOutfit(kind: string, seed: number): THREE.Group | null {
  const cols = [PAL.raspberry, PAL.teal, PAL.sky, PAL.butterRoof, PAL.coral, '#ffffff'];
  const c = cols[seed % cols.length];
  const g = new THREE.Group();
  if (kind === 'bow') {
    for (const s of [-1, 1]) add(g, new THREE.ConeGeometry(0.06, 0.1, 10).rotateZ(s * Math.PI / 2), std(c, 0.5), s * 0.055, 0, 0, false);
    add(g, new THREE.SphereGeometry(0.03, 10, 8), std(T.shade(c, -0.1), 0.5), 0, 0, 0, false);
    g.position.set(0.1, 0.22, 0.04); g.rotation.z = -0.4;
  } else if (kind === 'beanie') {
    add(g, new THREE.SphereGeometry(0.17, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), std(c, 0.9), 0, 0, 0, false).scale.y = 0.75;
    add(g, new THREE.TorusGeometry(0.165, 0.025, 8, 24).rotateX(Math.PI / 2), std(T.shade(c, 0.12), 0.9), 0, 0.01, 0, false);
    add(g, new THREE.IcosahedronGeometry(0.05, 1), std('#ffffff', 0.95), 0, 0.14, 0, false);
    g.position.set(0, 0.15, -0.01);
  } else if (kind === 'straw') {
    add(g, new THREE.CylinderGeometry(0.23, 0.23, 0.014, 24), std('#f1d38a', 0.85), 0, 0, 0, false);
    add(g, new THREE.CylinderGeometry(0.12, 0.13, 0.1, 18), std('#f1d38a', 0.85), 0, 0.05, 0, false);
    add(g, new THREE.CylinderGeometry(0.132, 0.132, 0.03, 18), std(c, 0.6), 0, 0.02, 0, false);
    g.position.set(0, 0.2, 0); g.rotation.z = 0.12;
  } else if (kind === 'flower') {
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; add(g, new THREE.SphereGeometry(0.035, 8, 6), std(c === '#ffffff' ? '#ff9fc8' : c, 0.5), Math.cos(a) * 0.045, Math.sin(a) * 0.045, 0, false).scale.z = 0.5; }
    add(g, new THREE.SphereGeometry(0.03, 8, 6), std(PAL.gold, 0.5), 0, 0, 0.01, false);
    g.position.set(-0.12, 0.2, 0.08); g.rotation.set(-0.3, -0.5, 0.3);
  } else if (kind === 'scarf') {
    add(g, new THREE.TorusGeometry(0.17, 0.04, 8, 28).rotateX(Math.PI / 2), std(c, 0.9), 0, 0, 0, false);
    const tail = add(g, rbox(0.07, 0.14, 0.03, 0.012), std(c, 0.9), 0.09, -0.07, 0.15, false);
    tail.rotation.z = 0.2;
    g.position.set(0, -0.12, 0);
  } else return null;
  return g;
}

const bush = (g: THREE.Group, x: number, z: number, r = 0.16) => { const b = new THREE.Mesh(M.bushGeometry(Math.round(x * 31 + z * 17), r * 2.2), baseMats().leaves); b.position.set(x, 0, z); b.castShadow = true; g.add(b); };

// ---------- houses ----------
const COTTAGE_LOOKS: { wall: string; roof: string; door: string; shutter: string }[] = [
  { wall: PAL.cream, roof: PAL.raspberry, door: '#8a5a34', shutter: '#e0527f' },
  { wall: PAL.mint, roof: PAL.teal, door: '#6d4c3d', shutter: '#33ab9b' },
  { wall: PAL.butter, roof: PAL.coral, door: '#7b4a2a', shutter: '#f2785c' },
  { wall: PAL.blush, roof: PAL.sky, door: '#8a5a34', shutter: '#5aa2e6' },
];

export function cottage(seed: number): THREE.Group {
  const look = COTTAGE_LOOKS[seed % COTTAGE_LOOKS.length];
  const g = new THREE.Group();
  plinth(g, 1.66, 1.46);
  add(g, rbox(1.4, 0.8, 1.16, 0.05), textured('plaster' + look.wall, T.plaster(look.wall), [2, 1]), 0, 0.55, 0);
  cornerTrims(g, 1.4, 1.16, 0.15, 0.8);
  gableRoof(g, 1.4, 1.16, 0.95, 0.6, look.roof, 0.14, look.wall);
  chimney(g, 0.42, 1.08, -0.22);
  doorOn(g, -0.28, 0.6, 0.28, 0.46, look.door, 0, look.roof);
  windowOn(g, 0.3, 0.62, 0.59, 0.26, 0.28, 0, look.shutter);
  windowOn(g, 0.71, 0.58, 0, 0.24, 0.26, Math.PI / 2, look.shutter);
  windowOn(g, -0.71, 0.58, 0, 0.24, 0.26, -Math.PI / 2, look.shutter);
  // a flower box and a couple of shrubs by the door
  add(g, rbox(0.38, 0.08, 0.1, 0.02), textured('box', T.planks('#a47148'), [1, 1]), 0.3, 0.42, 0.65);
  for (let i = 0; i < 6; i++) add(g, new THREE.IcosahedronGeometry(0.035, 1), std(['#ff6b9a', '#ffd43b', '#ffffff'][i % 3], 0.6), 0.16 + i * 0.055, 0.48, 0.65, false);
  bush(g, -0.7, 0.72, 0.12);
  bush(g, 0.74, -0.7, 0.12);
  // a front garden: picket fence with a gap for the walk, stepping stones, a mailbox and a lantern by the door
  picket(g, -0.93, -0.42, 0.9);
  picket(g, -0.14, 0.93, 0.9);
  steppingStones(g, -0.28, 0.72, 0.92);
  mailbox(g, -0.5, 0.82, look.roof);
  lantern(g, -0.06, 0.62, 0.58);
  for (let i = 0; i < 5; i++) add(g, new THREE.IcosahedronGeometry(0.03, 1), std(['#ff6b9a', '#ffd43b', '#ffffff', '#ff9fc8', '#ff922b'][(i + seed) % 5], 0.6), 0.1 + i * 0.16, 0.05, 0.8 + (i % 2) * 0.05, false);
  for (let i = 0; i < 4; i++) bush(g, 0.12 + i * 0.22, 0.78, 0.06);
  return g;
}

export function mushroomHouse(): THREE.Group {
  const g = new THREE.Group();
  add(g, new THREE.CylinderGeometry(0.88, 0.92, 0.14, 32), textured('plinthr', T.stoneBlocks(), [3, 0.5], 0.9, PAL.stone), 0, 0.07, 0);
  const stalk = add(g, new THREE.CylinderGeometry(0.5, 0.6, 0.95, 28), textured('stalk', T.plaster('#fbf1dd'), [3, 1]), 0, 0.6, 0);
  stalk.scale.z = 0.95;
  const cap = add(g, new THREE.SphereGeometry(0.9, 36, 20, 0, Math.PI * 2, 0, Math.PI / 2), mat('cap', () => new THREE.MeshStandardMaterial({ map: T.mushroomCap(), roughness: 0.45 })), 0, 1.0, 0);
  cap.scale.set(1, 0.74, 1);
  add(g, new THREE.TorusGeometry(0.82, 0.07, 10, 40).rotateX(Math.PI / 2), std('#f6e3c8', 0.85), 0, 1.0, 0);
  doorOn(g, 0, 0.53, 0.26, 0.48, '#8a5a34', 0, '');
  windowOn(g, 0.36, 0.74, 0.4, 0.18, 0.2, 0.75);
  windowOn(g, -0.36, 0.74, 0.4, 0.18, 0.2, -0.75);
  bush(g, 0.62, 0.62, 0.12);
  bush(g, -0.7, 0.4, 0.1);
  steppingStones(g, 0, 0.62, 0.92);
  lantern(g, 0.2, 0.62, 0.48);
  mailbox(g, -0.55, 0.78, PAL.raspberry);
  // little toadstools and flowers around the garden
  for (const [x, z, k] of [[0.72, -0.5, 1], [-0.75, -0.45, 0.8], [0.45, 0.82, 0.7]]) {
    add(g, new THREE.CylinderGeometry(0.025 * k, 0.03 * k, 0.08 * k, 8), std('#fbf1dd', 0.8), x, 0.04 * k, z, false);
    add(g, new THREE.SphereGeometry(0.07 * k, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), std('#ff5a5f', 0.5), x, 0.075 * k, z, true);
  }
  return g;
}

export function treehouse(): THREE.Group {
  const g = new THREE.Group();
  const m = baseMats();
  add(g, new THREE.CylinderGeometry(0.2, 0.32, 1.2, 12), m.bark, 0, 0.6, 0);
  add(g, rbox(1.5, 0.08, 1.3, 0.03), textured('deck', T.planks('#a0703f'), [2, 2]), 0, 1.2, 0);
  add(g, rbox(0.95, 0.6, 0.8, 0.04), textured('thwall', T.planks('#c98b4e'), [1, 1]), 0, 1.54, 0);
  gableRoof(g, 0.95, 0.8, 1.84, 0.4, PAL.teal, 0.12, '#c98b4e');
  doorOn(g, -0.15, 0.405, 0.2, 0.34, '#6d4c3d');
  g.children[g.children.length - 1].position.y = 1.24;
  g.userData.door = new THREE.Vector3(0.45, 0, 0.8); // up the ladder
  windowOn(g, 0.22, 1.56, 0.405, 0.18, 0.2, 0, PAL.teal);
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
  plinth(g, 2.7, 2.5, 0.16);
  add(g, rbox(2.1, 1.5, 1.6, 0.06), wall, 0, 0.9, -0.1);
  cornerTrims(g, 2.1, 1.6, 0.16, 1.5);
  gableRoof(g, 2.1, 1.6, 1.65, 0.62, PAL.sky, 0.14, '#f1f6ff');
  for (const s of [-1, 1]) {
    add(g, new THREE.CylinderGeometry(0.34, 0.36, 1.9, 24), wall, s * 1.0, 1.07, 0.55);
    add(g, new THREE.ConeGeometry(0.44, 0.72, 24), textured('vroof', T.roofTiles(PAL.sky), [3, 1], 0.6), s * 1.0, 2.38, 0.55);
    add(g, new THREE.SphereGeometry(0.06, 10, 8), gold(), s * 1.0, 2.78, 0.55);
    windowOn(g, s * 1.0, 1.45, 0.9, 0.18, 0.26);
  }
  doorOn(g, 0, 0.71, 0.36, 0.6, '#5a6fa8', 0, PAL.sky);
  for (const x of [-0.55, 0.55]) { windowOn(g, x, 0.62, 0.71, 0.3, 0.32, 0, PAL.sky); windowOn(g, x, 1.27, 0.71, 0.3, 0.32, 0, PAL.sky); }
  windowOn(g, 0, 1.27, 0.71, 0.3, 0.32, 0, PAL.sky);
  add(g, rbox(0.9, 0.05, 0.2, 0.02), std(PAL.trim, 0.6), 0, 1.0, 0.82);
  for (let i = 0; i < 7; i++) add(g, new THREE.CylinderGeometry(0.014, 0.014, 0.16, 6), std(PAL.trim, 0.6), -0.42 + i * 0.14, 1.1, 0.9, false);
  add(g, new THREE.BoxGeometry(0.9, 0.025, 0.025), std(PAL.trim, 0.6), 0, 1.18, 0.9, false);
  for (const sx of [-1, 1]) lantern(g, sx * 0.3, 0.68, 0.71);
  steppingStones(g, 0, 0.8, 1.38);
  chimney(g, -0.6, 1.9, -0.35, 0.34);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    add(g, new THREE.IcosahedronGeometry(0.16 + (i % 3) * 0.04, 2), std('#ffffff', 0.9), Math.cos(a) * 1.25, 0.14, Math.sin(a) * 1.15, false);
  }
  return g;
}

// ---------- special ----------
/** The Town Hall: a cream civic building with a raspberry roof, a columned porch and a golden clock tower. */
export function townHall(): THREE.Group {
  const g = new THREE.Group();
  const white = std(PAL.trim, 0.55);
  const stoneMat = textured('hallbase', T.stoneBlocks(), [3, 1], 0.9, PAL.stone);
  add(g, rbox(2.94, 0.2, 2.94, 0.06), stoneMat, 0, 0.1, 0);
  for (let i = 0; i < 3; i++) add(g, rbox(1.5 - i * 0.06, 0.07, 0.34 - i * 0.09, 0.025), stoneMat, 0, 0.235 + i * 0.07, 1.36 - i * 0.09);
  // main hall
  add(g, rbox(2.4, 1.15, 1.8, 0.06), textured('hallwall', T.plaster(PAL.cream), [3, 2]), 0, 0.8, -0.3);
  cornerTrims(g, 2.4, 1.8, 0.22, 1.15, PAL.stone);
  add(g, rbox(2.48, 0.08, 1.88, 0.03), white, 0, 1.4, -0.3);
  gableRoof(g, 2.4, 1.8, 1.42, 0.55, PAL.raspberry, 0.16, PAL.cream);
  // porch: columns, beam and a pediment with a golden Fuzzy medallion
  for (let i = 0; i < 4; i++) {
    const x = -0.75 + i * 0.5;
    add(g, new THREE.CylinderGeometry(0.075, 0.085, 0.98, 16), white, x, 0.74, 0.92);
    add(g, rbox(0.2, 0.06, 0.2, 0.02), white, x, 0.25, 0.92);
    add(g, rbox(0.2, 0.06, 0.2, 0.02), white, x, 1.23, 0.92);
  }
  add(g, rbox(2.0, 0.14, 0.5, 0.03), white, 0, 1.33, 0.82);
  const tri = new THREE.Shape(); tri.moveTo(-1.05, 0); tri.lineTo(1.05, 0); tri.lineTo(0, 0.42); tri.closePath();
  add(g, new THREE.ExtrudeGeometry(tri, { depth: 0.12, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 3 }), std(T.shade(PAL.raspberry, -0.06), 0.7), 0, 1.4, 0.92);
  add(g, new THREE.CylinderGeometry(0.13, 0.13, 0.04, 24).rotateX(Math.PI / 2), gold(), 0, 1.56, 1.08);
  for (const sx of [-1, 1]) add(g, new THREE.SphereGeometry(0.02, 8, 6), std('#3b2a20', 0.4), sx * 0.045, 1.58, 1.1, false);
  // clock tower with a golden dome
  add(g, rbox(0.8, 0.62, 0.8, 0.05), textured('tower', T.plaster(PAL.cream), [1, 1]), 0, 2.15, -0.35);
  cornerTrims(g, 0.8, 0.8, 1.84, 0.62, PAL.stone);
  add(g, new THREE.CylinderGeometry(0.2, 0.2, 0.03, 32).rotateX(Math.PI / 2), white, 0, 2.2, 0.06);
  add(g, new THREE.TorusGeometry(0.2, 0.02, 8, 32), gold(), 0, 2.2, 0.075, false);
  add(g, new THREE.BoxGeometry(0.02, 0.13, 0.01), std('#3b2a20'), 0, 2.25, 0.08, false);
  const hand = add(g, new THREE.BoxGeometry(0.1, 0.02, 0.01), std('#3b2a20'), 0.04, 2.2, 0.08, false);
  hand.name = 'clockhand';
  add(g, rbox(0.9, 0.08, 0.9, 0.03), white, 0, 2.5, -0.35);
  add(g, new THREE.SphereGeometry(0.4, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), gold(), 0, 2.54, -0.35);
  add(g, new THREE.CylinderGeometry(0.012, 0.012, 0.55, 6), std('#888', 0.4, 0.8), 0, 3.15, -0.35);
  const flag = add(g, new THREE.PlaneGeometry(0.3, 0.19), mat('flag', () => new THREE.MeshStandardMaterial({ color: PAL.raspberry, side: THREE.DoubleSide, roughness: 0.7 })), 0.15, 3.3, -0.35, false);
  flag.name = 'flag';
  // big double door, tall windows with shutters
  doorOn(g, 0, 0.6, 0.44, 0.72, '#7b4a2a');
  g.children[g.children.length - 1].position.y = 0.22;
  for (const x of [-0.85, 0.85]) windowOn(g, x, 0.85, 0.61, 0.26, 0.4, 0, PAL.raspberry);
  for (const x of [-1.21]) windowOn(g, x, 0.85, -0.3, 0.26, 0.36, -Math.PI / 2, PAL.raspberry);
  windowOn(g, 1.21, 0.85, -0.3, 0.26, 0.36, Math.PI / 2, PAL.raspberry);
  // planters and lamps by the steps, hedges along the sides, banners on the walls
  for (const sx of [-1, 1]) {
    add(g, rbox(0.26, 0.2, 0.26, 0.04), stoneMat, sx * 1.15, 0.3, 1.2);
    bush(g, sx * 1.15, 1.2, 0.13);
    g.children[g.children.length - 1].position.y = 0.38;
    lantern(g, sx * 0.35, 0.95, 0.6);
    for (let i = 0; i < 4; i++) { bush(g, sx * 1.32, -1.15 + i * 0.42, 0.11); g.children[g.children.length - 1].position.y = 0.2; }
    const banner = add(g, new THREE.PlaneGeometry(0.2, 0.42), mat('banner', () => new THREE.MeshStandardMaterial({ color: PAL.raspberry, roughness: 0.7, side: THREE.DoubleSide })), sx * 0.5, 0.98, 0.615, false);
    banner.name = 'banner';
    add(g, new THREE.CircleGeometry(0.05, 16), gold(), sx * 0.5, 1.02, 0.62, false);
  }
  for (let i = 0; i < 6; i++) add(g, new THREE.IcosahedronGeometry(0.03, 1), std(['#ff6b9a', '#ffd43b', '#ffffff'][i % 3], 0.6), (i % 2 ? 1 : -1) * (1.08 + (i % 3) * 0.06), 0.44, 1.12 + (i % 3) * 0.05, false);
  return g;
}

/**
 * The Crossing Gate: stone pillars with a flowering hedge arch and a shimmering portal, a stepping-stone walk
 * through it, and a little natural pond tucked inside the plot (irregular shore, pebbles, reeds, lily pads),
 * well away from the edges so it never meets a road.
 */
export function crossingGate(): THREE.Group {
  const g = new THREE.Group();
  const stoneMat = textured('gatestone', T.stoneBlocks(), [1, 2], 0.9, PAL.stone);
  for (const s of [-1, 1]) {
    add(g, rbox(0.34, 1.45, 0.38, 0.06), stoneMat, s * 0.6, 0.72, -0.35);
    add(g, rbox(0.44, 0.1, 0.48, 0.03), std(PAL.stone, 0.85), s * 0.6, 1.48, -0.35);
    add(g, new THREE.SphereGeometry(0.17, 18, 12), baseMats().leaves, s * 0.6, 1.68, -0.35);
  }
  // hedge arch dotted with flowers
  const arch = add(g, new THREE.TorusGeometry(0.6, 0.17, 12, 36, Math.PI), baseMats().leaves, 0, 1.45, -0.35);
  arch.scale.set(1, 0.6, 1);
  for (let i = 0; i < 9; i++) { const a = (i / 8) * Math.PI; add(g, new THREE.IcosahedronGeometry(0.045, 1), std(['#ff9fc8', '#ffffff', '#ffd43b'][i % 3], 0.5), Math.cos(a) * 0.6, 1.45 + Math.sin(a) * 0.36 + 0.08, -0.2, false); }
  const signMat = mat('gatesign2', () => new THREE.MeshStandardMaterial({ map: T.sign('Fuzzy Crossing', PAL.raspberry), roughness: 0.6, transparent: true }));
  add(g, rbox(1.16, 0.38, 0.06, 0.03), textured('signwood', T.planks(PAL.wood), [1, 1]), 0, 1.66, -0.13);
  add(g, new THREE.PlaneGeometry(1.08, 0.32), signMat, 0, 1.66, -0.095, false);
  const portal = add(g, new THREE.PlaneGeometry(0.86, 1.36), mat('portal', () => new THREE.MeshBasicMaterial({ map: GT.glow('rgba(255,190,225,0.95)', 'rgba(255,120,180,0)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })), 0, 0.72, -0.35, false);
  portal.name = 'portal';
  steppingStones(g, 0, -0.1, 0.9);
  // the pond: an irregular shoreline (wobbly circle), a grassy rim, pebbles, reeds and lily pads
  const P = 26, cx = 0.56, cz = 0.46;
  const outline = (k: number) => {
    const sh = new THREE.Shape();
    for (let i = 0; i <= P; i++) {
      const a = (i / P) * Math.PI * 2, rr = (0.27 + Math.sin(a * 3 + 1) * 0.035 + Math.sin(a * 5) * 0.022) * k;
      const px = cx + Math.cos(a) * rr * 1.1, pz = cz + Math.sin(a) * rr;
      if (i === 0) sh.moveTo(px, pz); else sh.lineTo(px, pz);
    }
    return sh;
  };
  // a sandy, muddy rim, then the water a touch above it
  add(g, new THREE.ShapeGeometry(outline(1.2), 2).rotateX(Math.PI / 2).translate(0, 0.012, 0), mat('pondrim', () => new THREE.MeshStandardMaterial({ color: '#cdb795', roughness: 1, side: THREE.DoubleSide })), 0, 0, 0, false);
  const water = new THREE.ShapeGeometry(outline(1), 2).rotateX(Math.PI / 2).translate(0, 0.022, 0);
  add(g, water, mat('pond2', () => new THREE.MeshPhysicalMaterial({ color: 0x3fbcc4, roughness: 0.06, clearcoat: 1, envMapIntensity: 1.5, side: THREE.DoubleSide })), 0, 0, 0, false);
  const r = GT.rng(17);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + r() * 0.3, rr = 0.31 + r() * 0.04;
    const rock = add(g, new THREE.IcosahedronGeometry(0.035 + r() * 0.03, 1), std(i % 3 ? '#cfc3b2' : '#a99b88', 0.95), cx + Math.cos(a) * rr * 1.1, 0.04, cz + Math.sin(a) * rr, true);
    rock.scale.y = 0.6;
  }
  for (const [x, z] of [[0.42, 0.38], [0.62, 0.52], [0.5, 0.56]]) add(g, new THREE.CylinderGeometry(0.06, 0.06, 0.008, 14, 1, false, 0.3, 5.6), std('#5cb547', 0.6), x, 0.028, z, false);
  add(g, new THREE.SphereGeometry(0.022, 8, 6), std('#ff9fc8', 0.5), 0.62, 0.042, 0.52, false);
  for (let i = 0; i < 7; i++) { const reed = add(g, new THREE.CylinderGeometry(0.006, 0.009, 0.22 + r() * 0.1, 4), std('#5f9e3a', 0.8), cx + 0.26 + r() * 0.05, 0.13, cz - 0.15 + i * 0.05, false); reed.rotation.z = (r() - 0.5) * 0.3; }
  for (let i = 0; i < 3; i++) add(g, new THREE.CapsuleGeometry(0.012, 0.04, 3, 6), std('#7a4a2a', 0.8), cx + 0.27 + r() * 0.04, 0.26, cz - 0.1 + i * 0.1, false);
  bush(g, -0.72, 0.6, 0.12);
  bush(g, -0.6, 0.82, 0.08);
  return g;
}

// ---------- workshops ----------
export function bakery(): THREE.Group {
  const g = new THREE.Group();
  plinth(g, 1.8, 1.8);
  add(g, rbox(1.5, 0.9, 1.3, 0.05), textured('bakery', T.plaster(PAL.butter), [2, 1]), 0, 0.6, -0.05);
  cornerTrims(g, 1.5, 1.3, 0.15, 0.9, PAL.trim);
  add(g, rbox(1.56, 0.22, 1.36, 0.04), textured('bakebase', T.bricks('#d98a62'), [2, 0.4]), 0, 0.26, -0.05);
  gableRoof(g, 1.5, 1.3, 1.05, 0.56, PAL.coral, 0.15, PAL.butter);
  chimney(g, -0.45, 1.2, -0.3, 0.44);
  // striped awning over the shop window, a wooden sign and a giant pretzel
  const awn = add(g, rbox(1.36, 0.05, 0.44, 0.02), textured('awnr', T.stripes(PAL.raspberry, '#fff4e3', 10), [1, 1], 0.7), 0.12, 0.98, 0.78);
  awn.rotation.x = 0.38;
  for (let i = 0; i < 9; i++) add(g, new THREE.SphereGeometry(0.075, 12, 8).scale(1, 0.6, 1), std(i % 2 ? '#fff4e3' : PAL.raspberry, 0.7), -0.52 + i * 0.155, 0.89, 0.98, false);
  add(g, rbox(0.86, 0.26, 0.05, 0.03), textured('wood', T.planks(PAL.wood), [1, 1]), 0.12, 1.24, 0.64);
  add(g, new THREE.PlaneGeometry(0.78, 0.2), mat('bakesign', () => new THREE.MeshStandardMaterial({ map: T.sign('Bakery', PAL.woodDark), roughness: 0.6, transparent: true })), 0.12, 1.24, 0.668, false);
  doorOn(g, -0.48, 0.61, 0.28, 0.48, '#8a5a34');
  // display window with loaves
  add(g, rbox(0.66, 0.42, 0.05, 0.02), std(PAL.trim, 0.6), 0.25, 0.6, 0.6);
  add(g, new THREE.BoxGeometry(0.58, 0.34, 0.03), warmGlass(), 0.25, 0.6, 0.625, false);
  for (let i = 0; i < 3; i++) { const b = add(g, new THREE.CapsuleGeometry(0.05, 0.12, 4, 8).rotateZ(Math.PI / 2), std('#d9a05b', 0.6), 0.08 + i * 0.17, 0.47, 0.6, false); b.scale.y = 0.8; }
  const pretzel = add(g, new THREE.TorusKnotGeometry(0.1, 0.03, 48, 8, 2, 3), std('#c98b55', 0.55), 0.82, 0.95, 0.38);
  pretzel.scale.set(1, 1, 0.5);
  bush(g, -0.78, 0.82, 0.12);
  // flour sacks and a bread rack by the door
  for (const [x, z] of [[-0.82, 0.55], [-0.72, 0.62]]) { const sack = add(g, new THREE.SphereGeometry(0.09, 12, 10), std('#f3e6cf', 0.95), x, 0.22, z); sack.scale.set(1, 1.2, 0.9); }
  add(g, rbox(0.3, 0.05, 0.14, 0.015), textured('wood', T.planks(PAL.wood), [1, 1]), 0.72, 0.3, 0.75);
  for (let i = 0; i < 3; i++) { const b = add(g, new THREE.CapsuleGeometry(0.035, 0.08, 4, 8).rotateZ(Math.PI / 2), std('#d9a05b', 0.6), 0.64 + i * 0.08, 0.35, 0.75, false); b.scale.y = 0.8; }
  lantern(g, -0.2, 0.62, 0.6);
  g.userData.smoke = new THREE.Vector3(-0.45, 1.75, -0.3);
  return g;
}

export function popcornStand(): THREE.Group {
  const g = new THREE.Group();
  plinth(g, 1.7, 1.7);
  const stripe = textured('popr', T.stripes(PAL.raspberry, '#fff4e3', 12), [2, 1], 0.6);
  add(g, rbox(1.3, 0.75, 1.1, 0.07), stripe, 0, 0.53, 0);
  add(g, rbox(1.4, 0.06, 1.2, 0.04), std(PAL.trim, 0.6), 0, 0.93, 0);
  add(g, rbox(1.42, 0.09, 0.36, 0.035), textured('wood', T.planks(PAL.wood), [1, 1]), 0, 0.66, 0.66);
  add(g, rbox(1.06, 0.36, 0.04, 0.02), std(PAL.trim, 0.6), 0, 0.5, 0.56);
  add(g, new THREE.BoxGeometry(0.98, 0.3, 0.03), warmGlass(), 0, 0.5, 0.58, false);
  // big popcorn bucket on the roof
  add(g, new THREE.CylinderGeometry(0.42, 0.3, 0.6, 28, 1, true), mat('bucketr', () => { const m = textured('bkr', T.stripes(PAL.raspberry, '#fff4e3', 16), [1, 1], 0.6).clone() as THREE.MeshStandardMaterial; m.side = THREE.DoubleSide; return m; }), 0, 1.26, 0);
  add(g, new THREE.TorusGeometry(0.42, 0.03, 8, 32).rotateX(Math.PI / 2), std(PAL.trim, 0.6), 0, 1.56, 0, false);
  const pr = GT.rng(5);
  for (let i = 0; i < 30; i++) add(g, new THREE.IcosahedronGeometry(0.07 + pr() * 0.04, 1), std(pr() < 0.8 ? '#fff6dc' : PAL.gold, 0.8), (pr() - 0.5) * 0.66, 1.56 + pr() * 0.2, (pr() - 0.5) * 0.66, false);
  add(g, rbox(1.0, 0.26, 0.05, 0.03), textured('wood', T.planks(PAL.wood), [1, 1]), 0, 1.08, 0.58);
  add(g, new THREE.PlaneGeometry(0.92, 0.2), mat('popsignr', () => new THREE.MeshStandardMaterial({ map: T.sign('Popcorn', PAL.raspberry), roughness: 0.6, transparent: true })), 0, 1.08, 0.607, false);
  bush(g, -0.72, 0.72, 0.12);
  bush(g, 0.72, 0.72, 0.1);
  // baskets of fresh corn by the counter
  for (const [x, z] of [[0.6, 0.82], [0.78, 0.66]]) {
    add(g, new THREE.CylinderGeometry(0.09, 0.07, 0.1, 12), textured('basket', T.planks('#c9925b'), [1, 0.3]), x, 0.2, z);
    for (let i = 0; i < 3; i++) add(g, new THREE.CapsuleGeometry(0.022, 0.07, 3, 6), std('#ffd43b', 0.6), x + (i - 1) * 0.04, 0.27, z, false).rotation.z = (i - 1) * 0.4;
  }
  return g;
}

export function weaver(): THREE.Group {
  const g = new THREE.Group();
  plinth(g, 1.8, 1.8);
  add(g, rbox(1.5, 0.95, 1.3, 0.05), textured('weave', T.plaster(PAL.mint), [2, 1]), 0, 0.63, -0.05);
  cornerTrims(g, 1.5, 1.3, 0.15, 0.95, PAL.trim);
  gableRoof(g, 1.5, 1.3, 1.1, 0.58, PAL.teal, 0.15, PAL.mint);
  doorOn(g, 0, 0.61, 0.4, 0.58, '#6d4c3d', 0, PAL.teal);
  windowOn(g, -0.5, 0.68, 0.61, 0.24, 0.28, 0, PAL.teal);
  windowOn(g, 0.5, 0.68, 0.61, 0.24, 0.28, 0, PAL.teal);
  windowOn(g, 0.76, 0.66, -0.05, 0.24, 0.28, Math.PI / 2, PAL.teal);
  // yarn ball on the roof, and a few balls by the door
  const yarn = new THREE.Group();
  add(yarn, new THREE.SphereGeometry(0.28, 24, 16), std('#ff8fb5', 0.9), 0, 0, 0);
  for (let i = 0; i < 6; i++) { const t = add(yarn, new THREE.TorusGeometry(0.28, 0.016, 6, 36), std(PAL.raspberry, 0.9), 0, 0, 0, false); t.rotation.set(i * 0.55, i * 1.1, 0); }
  yarn.position.set(0.3, 1.86, 0.1);
  yarn.name = 'yarn';
  g.add(yarn);
  for (const [x, c] of [[-0.62, PAL.sky], [0.6, PAL.butterRoof]] as const) add(g, new THREE.SphereGeometry(0.1, 16, 10), std(c, 0.9), x, 0.25, 0.78);
  // a striped awning and a wool-drying line
  const awn = add(g, rbox(0.66, 0.04, 0.3, 0.02), textured('awnt', T.stripes(PAL.teal, '#fff4e3', 8), [1, 1], 0.7), 0, 1.02, 0.74);
  awn.rotation.x = 0.35;
  chimney(g, -0.45, 1.25, -0.3, 0.36);
  lantern(g, 0.3, 0.62, 0.6);
  return g;
}

// ---------- fields & crops ----------
export function field(): THREE.Group {
  const g = new THREE.Group();
  const soilMat = mat('soil', () => new THREE.MeshStandardMaterial({ map: T.soil(), roughness: 1 }));
  add(g, rbox(0.86, 0.1, 0.86, 0.03), soilMat, 0, 0.05, 0);
  // raised furrows
  const ridge = std('#7a4e30', 1);
  for (let i = 0; i < 4; i++) add(g, new THREE.CapsuleGeometry(0.055, 0.66, 4, 8).rotateZ(Math.PI / 2), ridge, 0, 0.1, -0.3 + i * 0.2, false).scale.set(1, 0.6, 1);
  // a neat wooden edging around each plot
  const wood = textured('edge', T.planks('#b07745'), [1, 0.25], 0.8);
  for (const [w, d, x, z] of [[0.98, 0.07, 0, 0.46], [0.98, 0.07, 0, -0.46], [0.07, 0.86, 0.46, 0], [0.07, 0.86, -0.46, 0]] as [number, number, number, number][]) add(g, rbox(w, 0.13, d, 0.02), wood, x, 0.065, z);
  return g;
}

/** A straight piece of street (used for the shop picture and while placing; the town draws joined-up streets itself). */
export function roadTile(): THREE.Group {
  const g = new THREE.Group();
  add(g, new THREE.BoxGeometry(1, 0.035, 0.66), std('#a39d96', 0.92), 0, 0.0175, 0, false);
  for (const s of [-1, 1]) add(g, new THREE.BoxGeometry(1, 0.07, 0.17), std('#efe6d6', 0.85), 0, 0.035, s * 0.415);
  for (const x of [-0.25, 0.25]) add(g, new THREE.BoxGeometry(0.24, 0.006, 0.035), std('#fff6e0', 0.7), x, 0.038, 0, false);
  return g;
}

/** A construction site for something still being built: foundation, scaffolding, crates and a little crane arm. */
export function constructionSite(w: number, d: number, seed: number): THREE.Group {
  const g = new THREE.Group();
  const r = GT.rng(seed + 11);
  add(g, rbox(w - 0.1, 0.1, d - 0.1, 0.03), textured('found', GT.concrete(false), [w, d], 0.9, '#d9d2c7'), 0, 0.05, 0);
  const wood = textured('scaf', T.planks('#c08a52'), [1, 1], 0.8);
  const h = 0.8 + Math.min(w, d) * 0.25;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(g, new THREE.BoxGeometry(0.06, h, 0.06), wood, sx * (w / 2 - 0.2), h / 2 + 0.1, sz * (d / 2 - 0.2));
  for (const y of [h * 0.45, h * 0.9]) {
    add(g, new THREE.BoxGeometry(w - 0.34, 0.05, 0.05), wood, 0, y, d / 2 - 0.2);
    add(g, new THREE.BoxGeometry(w - 0.34, 0.05, 0.05), wood, 0, y, -(d / 2 - 0.2));
    add(g, new THREE.BoxGeometry(0.05, 0.05, d - 0.34), wood, w / 2 - 0.2, y, 0);
    add(g, new THREE.BoxGeometry(0.05, 0.05, d - 0.34), wood, -(w / 2 - 0.2), y, 0);
  }
  // half-built walls inside
  add(g, rbox(w - 0.6, h * 0.45, d - 0.6, 0.02), textured('brickhalf', T.bricks('#c8734f'), [w, 0.5]), 0, 0.1 + h * 0.225, 0);
  // crates and a striped barrier
  for (let i = 0; i < 3; i++) add(g, rbox(0.18, 0.18, 0.18, 0.02), textured('crate', T.planks('#9c6b43'), [1, 1]), -w / 2 + 0.25 + r() * 0.3, 0.19 + (i === 2 ? 0.18 : 0), d / 2 - 0.05 - (i % 2) * 0.22);
  const bar = add(g, new THREE.BoxGeometry(0.6, 0.08, 0.04), textured('barrier', T.stripes('#ffd43b', '#18171c', 8), [1, 1], 0.6), w / 2 - 0.45, 0.32, d / 2 + 0.02);
  bar.name = 'barrier';
  for (const x of [w / 2 - 0.7, w / 2 - 0.2]) add(g, new THREE.BoxGeometry(0.04, 0.3, 0.04), std('#495057'), x, 0.15, d / 2 + 0.02);
  // a little crane arm that swings while work goes on
  const crane = new THREE.Group();
  add(crane, new THREE.BoxGeometry(0.06, h + 0.5, 0.06), std('#ffa94d', 0.5, 0.2), 0, (h + 0.5) / 2, 0);
  const arm = new THREE.Group();
  add(arm, new THREE.BoxGeometry(Math.max(w, 1.2) * 0.8, 0.05, 0.05), std('#ffa94d', 0.5, 0.2), Math.max(w, 1.2) * 0.3, 0, 0);
  add(arm, new THREE.CylinderGeometry(0.006, 0.006, 0.4, 4), std('#333'), Math.max(w, 1.2) * 0.6, -0.2, 0, false);
  add(arm, rbox(0.12, 0.08, 0.12, 0.01), textured('crate', T.planks('#9c6b43'), [1, 1]), Math.max(w, 1.2) * 0.6, -0.42, 0);
  arm.position.y = h + 0.45;
  arm.name = 'arm';
  crane.add(arm);
  crane.position.set(-(w / 2 - 0.2), 0.1, -(d / 2 - 0.2));
  g.add(crane);
  return g;
}

/** A soft dark patch under a building so it sits on the ground (a cheap stand-in for ambient occlusion). */
export function contactShadow(w: number, d: number): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w + 0.5, d + 0.5).rotateX(-Math.PI / 2), mat('ao', () => new THREE.MeshBasicMaterial({ map: GT.glow('rgba(0,0,0,0.55)', 'rgba(0,0,0,0)'), transparent: true, depthWrite: false, color: 0xffffff })));
  m.position.y = 0.008;
  m.renderOrder = -1;
  return m;
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
  return ENV.treeModel(seed, treeTime, 0.55);
}
/** Time for the decoration trees' sway (the view advances it). */
export const treeTime = { value: 0 };

export function flowerBed(seed: number): THREE.Group {
  const g = new THREE.Group();
  add(g, rbox(0.86, 0.18, 0.86, 0.05), textured('planter', T.planks(PAL.wood), [1, 0.4], 0.8), 0, 0.09, 0);
  add(g, new THREE.BoxGeometry(0.74, 0.02, 0.74), mat('soil', () => new THREE.MeshStandardMaterial({ map: T.soil(), roughness: 1 })), 0, 0.18, 0);
  const r = GT.rng(seed + 3);
  const cols = ['#ff6b9a', '#ffd43b', '#ffffff', '#ff9fc8', '#ff922b'];
  for (let i = 0; i < 9; i++) {
    const x = (r() - 0.5) * 0.56, z = (r() - 0.5) * 0.56;
    const leaf = new THREE.Mesh(M.bushGeometry(seed * 5 + i, 0.18), baseMats().leaves);
    leaf.position.set(x, 0.17, z); leaf.castShadow = true; g.add(leaf);
    const c = cols[Math.floor(r() * cols.length)];
    for (let k = 0; k < 4; k++) add(g, new THREE.IcosahedronGeometry(0.035, 1), std(c, 0.5), x + (r() - 0.5) * 0.1, 0.27 + r() * 0.05, z + (r() - 0.5) * 0.1, false);
  }
  return g;
}

/** A garden path: soft round stepping stones set into the grass (neighbouring tiles read as one walk). */
export function pathTile(): THREE.Group {
  const g = new THREE.Group();
  const r = GT.rng(23);
  const cols = ['#d8cbb4', '#cfc0a6', '#e0d4bf'];
  for (const [x, z] of [[-0.2, -0.24], [0.18, 0.02], [-0.12, 0.26]] as const) {
    const st = add(g, new THREE.CylinderGeometry(0.12 + r() * 0.03, 0.13 + r() * 0.03, 0.03, 12), std(cols[Math.floor(r() * 3)], 0.95), x + (r() - 0.5) * 0.06, 0.015, z + (r() - 0.5) * 0.06, false);
    st.scale.z = 0.8 + r() * 0.2;
    st.rotation.y = r() * 3;
  }
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
  const stoneMat = textured('fstone', T.stoneBlocks(), [3, 1], 0.85, '#efe9df');
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
  add(g, rbox(0.6, 0.35, 0.6, 0.04), textured('ped', T.stoneBlocks(), [1, 1], 0.8, '#f2ece2'), 0, 0.175, 0);
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
    case 'road': return roadTile();
    case 'bench': return bench();
    case 'lamp': return lampPost();
    case 'fountain': return fountain();
    case 'statue': return goldenStatue();
    case 'rainbow': return rainbowArch();
    default: return new THREE.Group();
  }
}
