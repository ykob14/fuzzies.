/** 3D models for Fuzzy Crossing: vehicles, logs, lily pads, nests, plants, lamps and the furry Fuzzies. 1 unit = 1 board cell. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import * as T from './textures3d';

const merge = (geos: THREE.BufferGeometry[]): THREE.BufferGeometry => {
  const g = mergeGeometries(geos.map((x) => {
    const n = x.index ? x.toNonIndexed() : x;
    for (const k of Object.keys(n.attributes)) if (!['position', 'normal', 'uv'].includes(k)) n.deleteAttribute(k);
    return n;
  }), false)!;
  return g;
};
const at = (g: THREE.BufferGeometry, x: number, y: number, z: number) => g.translate(x, y, z);

// ---------- shared materials ----------
export interface Mats {
  glass: THREE.MeshPhysicalMaterial;
  tire: THREE.MeshStandardMaterial;
  rim: THREE.MeshStandardMaterial;
  trim: THREE.MeshStandardMaterial;
  head: THREE.MeshStandardMaterial;
  tail: THREE.MeshStandardMaterial;
  bark: THREE.MeshStandardMaterial;
  rings: THREE.MeshStandardMaterial;
  pad: THREE.MeshStandardMaterial;
  petal: THREE.MeshStandardMaterial;
  pollen: THREE.MeshStandardMaterial;
  straw: THREE.MeshStandardMaterial;
  leaves: THREE.MeshStandardMaterial;
  darkLeaves: THREE.MeshStandardMaterial;
  metal: THREE.MeshStandardMaterial;
  bulb: THREE.MeshStandardMaterial;
  beam: THREE.MeshBasicMaterial;
  fur: THREE.Texture;
  paint: (color: string) => THREE.MeshPhysicalMaterial;
}

export function makeMaterials(): Mats {
  const paints = new Map<string, THREE.MeshPhysicalMaterial>();
  const bark = T.bark();
  return {
    glass: new THREE.MeshPhysicalMaterial({ color: 0x0b1118, metalness: 0.2, roughness: 0.04, clearcoat: 1, envMapIntensity: 1.6 }),
    tire: new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.92 }),
    rim: new THREE.MeshStandardMaterial({ color: 0xc8ccd2, metalness: 1, roughness: 0.25 }),
    trim: new THREE.MeshStandardMaterial({ color: 0x1d1f23, roughness: 0.6, metalness: 0.2 }),
    head: new THREE.MeshStandardMaterial({ color: 0xfff6dc, emissive: 0xfff1c8, emissiveIntensity: 0.8 }),
    tail: new THREE.MeshStandardMaterial({ color: 0x8a0000, emissive: 0xff1a1a, emissiveIntensity: 0.6 }),
    bark: new THREE.MeshStandardMaterial({ map: bark, roughness: 0.95 }),
    rings: new THREE.MeshStandardMaterial({ map: T.rings(), roughness: 0.85 }),
    pad: new THREE.MeshStandardMaterial({ map: T.lilyPad(), roughness: 0.45, side: THREE.DoubleSide }),
    petal: new THREE.MeshStandardMaterial({ color: 0xffc2dc, roughness: 0.5, emissive: 0x401020, emissiveIntensity: 0.2 }),
    pollen: new THREE.MeshStandardMaterial({ color: 0xffd23f, roughness: 0.6 }),
    straw: new THREE.MeshStandardMaterial({ map: T.straw(), roughness: 1 }),
    leaves: new THREE.MeshStandardMaterial({ map: T.leaves(), roughness: 0.9 }),
    darkLeaves: new THREE.MeshStandardMaterial({ map: T.leaves(), color: 0x9ab08a, roughness: 0.9 }),
    metal: new THREE.MeshStandardMaterial({ color: 0x2a2d33, metalness: 0.8, roughness: 0.4 }),
    bulb: new THREE.MeshStandardMaterial({ color: 0xfff3d0, emissive: 0xffd28a, emissiveIntensity: 0.2 }),
    beam: new THREE.MeshBasicMaterial({ map: T.glow('rgba(255,236,180,0.55)', 'rgba(255,236,180,0)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }),
    fur: T.furStrands(),
    paint(color) {
      let m = paints.get(color);
      if (!m) {
        m = new THREE.MeshPhysicalMaterial({ color, metalness: 0.55, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.06 });
        paints.set(color, m);
      }
      return m;
    },
  };
}

function mesh(g: THREE.BufferGeometry, m: THREE.Material, shadow = true): THREE.Mesh {
  const x = new THREE.Mesh(g, m);
  x.castShadow = shadow;
  x.receiveShadow = true;
  return x;
}

// ---------- vehicles ----------
interface VehicleParts { paint: THREE.BufferGeometry; glass: THREE.BufferGeometry; tire: THREE.BufferGeometry; rim: THREE.BufferGeometry; trim: THREE.BufferGeometry; head: THREE.BufferGeometry; tail: THREE.BufferGeometry; second?: THREE.BufferGeometry }
const vehicleCache = new Map<string, VehicleParts>();

function wheels(xs: number[], halfW: number, r = 0.105): { tire: THREE.BufferGeometry; rim: THREE.BufferGeometry } {
  const tire: THREE.BufferGeometry[] = [], rim: THREE.BufferGeometry[] = [];
  for (const x of xs) for (const z of [-halfW, halfW]) {
    tire.push(at(new THREE.CylinderGeometry(r, r, 0.08, 20).rotateX(Math.PI / 2), x, r, z));
    rim.push(at(new THREE.CylinderGeometry(r * 0.58, r * 0.58, 0.084, 12).rotateX(Math.PI / 2), x, r, z));
  }
  return { tire: merge(tire), rim: merge(rim) };
}

function lights(frontX: number, backX: number, y: number, z: number, h = 0.045): { head: THREE.BufferGeometry; tail: THREE.BufferGeometry } {
  return {
    head: merge([-z, z].map((zz) => at(new RoundedBoxGeometry(0.03, h, 0.1, 2, 0.01), frontX, y, zz))),
    tail: merge([-z, z].map((zz) => at(new RoundedBoxGeometry(0.03, h, 0.09, 2, 0.01), backX, y + 0.03, zz))),
  };
}

function carParts(): VehicleParts {
  const L = 0.9, W = 0.52;
  const s = new THREE.Shape();
  s.moveTo(-L / 2, 0.1);
  s.lineTo(L / 2 - 0.05, 0.1);
  s.quadraticCurveTo(L / 2, 0.1, L / 2, 0.16);
  s.lineTo(L / 2, 0.25);
  s.quadraticCurveTo(L / 2 - 0.01, 0.31, L / 2 - 0.09, 0.32);
  s.lineTo(-L / 2 + 0.07, 0.34);
  s.quadraticCurveTo(-L / 2, 0.34, -L / 2, 0.28);
  s.closePath();
  const body = new THREE.ExtrudeGeometry(s, { depth: W, bevelEnabled: true, bevelSize: 0.025, bevelThickness: 0.03, bevelSegments: 3, curveSegments: 8 }).translate(0, 0, -W / 2);
  const c = new THREE.Shape();
  c.moveTo(-0.33, 0.31); c.lineTo(0.18, 0.31); c.quadraticCurveTo(0.08, 0.44, 0.03, 0.5); c.lineTo(-0.24, 0.51); c.quadraticCurveTo(-0.3, 0.45, -0.33, 0.36); c.closePath();
  const cabin = new THREE.ExtrudeGeometry(c, { depth: W - 0.08, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.015, bevelSegments: 2 }).translate(0, 0, -(W - 0.08) / 2);
  const roof = at(new RoundedBoxGeometry(0.29, 0.03, W - 0.04, 2, 0.012), -0.105, 0.515, 0);
  const pillar = at(new THREE.BoxGeometry(0.035, 0.2, W - 0.05), -0.1, 0.41, 0);
  const w = wheels([-0.28, 0.28], W / 2 - 0.02);
  const trim = merge([
    at(new RoundedBoxGeometry(0.05, 0.07, W + 0.03, 2, 0.02), L / 2 + 0.01, 0.13, 0),
    at(new RoundedBoxGeometry(0.05, 0.07, W + 0.03, 2, 0.02), -L / 2 - 0.01, 0.13, 0),
    at(new THREE.BoxGeometry(0.02, 0.05, 0.2), L / 2 + 0.03, 0.22, 0),
  ]);
  return { paint: merge([body, roof, pillar]), glass: cabin, ...w, trim, ...lights(L / 2 + 0.02, -L / 2 - 0.02, 0.24, 0.17) };
}

function truckParts(): VehicleParts {
  const L = 1.9, W = 0.6;
  const cab = at(new RoundedBoxGeometry(0.5, 0.44, W, 3, 0.06), L / 2 - 0.27, 0.36, 0);
  const hood = at(new RoundedBoxGeometry(0.2, 0.2, W - 0.04, 2, 0.04), L / 2 - 0.02, 0.24, 0);
  const glass = merge([
    at(new THREE.BoxGeometry(0.02, 0.17, W - 0.12), L / 2 - 0.015, 0.48, 0),
    at(new THREE.BoxGeometry(0.24, 0.15, W + 0.006), L / 2 - 0.25, 0.48, 0),
  ]);
  const trailer = at(new RoundedBoxGeometry(L - 0.6, 0.62, W, 3, 0.04), -0.3, 0.53, 0);
  const w = wheels([L / 2 - 0.25, -L / 2 + 0.25, -L / 2 + 0.5], W / 2 - 0.02, 0.11);
  const trim = merge([
    at(new RoundedBoxGeometry(0.05, 0.07, W + 0.02, 2, 0.02), L / 2 + 0.09, 0.14, 0),
    at(new THREE.BoxGeometry(L - 0.62, 0.04, W - 0.04), -0.3, 0.2, 0),
    at(new THREE.BoxGeometry(0.06, 0.03, 0.08), L / 2 - 0.12, 0.6, W / 2 - 0.05),
  ]);
  return { paint: merge([cab, hood]), second: trailer, glass, ...w, trim, ...lights(L / 2 + 0.085, -L / 2 + 0.02, 0.22, 0.2, 0.05) };
}

function busParts(): VehicleParts {
  const L = 1.42, W = 0.6;
  const body = at(new RoundedBoxGeometry(L, 0.6, W, 3, 0.08), 0, 0.44, 0);
  const glass = merge([
    at(new THREE.BoxGeometry(L - 0.2, 0.19, W + 0.006), -0.04, 0.55, 0),
    at(new THREE.BoxGeometry(0.02, 0.3, W - 0.1), L / 2 + 0.002, 0.52, 0),
  ]);
  const w = wheels([L / 2 - 0.26, -L / 2 + 0.28], W / 2 - 0.02, 0.11);
  const trim = merge([
    at(new THREE.BoxGeometry(L + 0.01, 0.06, W + 0.01), 0, 0.2, 0),
    at(new THREE.BoxGeometry(0.03, 0.06, 0.34), L / 2 + 0.02, 0.73, 0),
  ]);
  return { paint: body, glass, ...w, trim, ...lights(L / 2 + 0.02, -L / 2 - 0.02, 0.25, 0.2) };
}

export function makeVehicle(m: Mats, kind: 'car' | 'truck' | 'bus', color: string, second = '#e9ecef'): THREE.Group {
  let p = vehicleCache.get(kind);
  if (!p) { p = kind === 'car' ? carParts() : kind === 'truck' ? truckParts() : busParts(); vehicleCache.set(kind, p); }
  const g = new THREE.Group();
  g.add(mesh(p.paint, m.paint(color)), mesh(p.glass, m.glass), mesh(p.tire, m.tire), mesh(p.rim, m.rim, false), mesh(p.trim, m.trim), mesh(p.head, m.head, false), mesh(p.tail, m.tail, false));
  if (p.second) g.add(mesh(p.second, m.paint(second)));
  // headlight pools on the road (only visible at dusk)
  const front = kind === 'car' ? 0.45 : kind === 'truck' ? 0.95 : 0.71;
  const beam = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.75).rotateX(-Math.PI / 2), m.beam);
  beam.position.set(front + 0.7, 0.012, 0);
  beam.renderOrder = 2;
  g.add(beam);
  return g;
}

// ---------- river ----------
const logGeo = new Map<number, THREE.CylinderGeometry>();
export function makeLog(m: Mats, len: number): THREE.Group {
  const L = len * 0.96;
  let geo = logGeo.get(len);
  if (!geo) { geo = new THREE.CylinderGeometry(0.29, 0.31, L, 22, 1); geo.rotateZ(Math.PI / 2); logGeo.set(len, geo); }
  const bark = m.bark.clone();
  bark.map = m.bark.map!.clone();
  bark.map.repeat.set(1, len * 0.8);
  bark.map.needsUpdate = true;
  const g = new THREE.Group();
  g.add(mesh(geo, [bark, m.rings, m.rings] as unknown as THREE.Material));
  const stub = mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.22, 8), m.bark);
  stub.position.set(L * 0.18, 0.25, 0.08);
  stub.rotation.z = -0.5;
  g.add(stub);
  return g;
}

let padGeo: THREE.BufferGeometry | null = null;
let flowerGeo: { petals: THREE.BufferGeometry; pollen: THREE.BufferGeometry } | null = null;
export function makePads(m: Mats, len: number, flower: boolean, seed: number): { group: THREE.Group; mats: THREE.Material[] } {
  padGeo ??= new THREE.CircleGeometry(0.43, 32, 0.4, Math.PI * 2 - 0.55).rotateX(-Math.PI / 2);
  if (!flowerGeo) {
    const petals: THREE.BufferGeometry[] = [];
    for (let ring = 0; ring < 2; ring++) for (let i = 0; i < 8; i++) {
      const p = new THREE.SphereGeometry(0.05, 10, 8).scale(0.8, 0.45, 2.1);
      p.translate(0, 0, 0.09 - ring * 0.02);
      p.rotateX(-0.5 - ring * 0.45);
      p.rotateY((i / 8) * Math.PI * 2 + ring * 0.4);
      petals.push(p);
    }
    flowerGeo = { petals: merge(petals), pollen: new THREE.SphereGeometry(0.045, 12, 8).scale(1, 0.6, 1) };
  }
  const g = new THREE.Group();
  const pad = m.pad.clone();
  pad.transparent = true;
  const petal = m.petal.clone();
  petal.transparent = true;
  const r = T.rng(seed);
  for (let i = 0; i < len; i++) {
    const p = mesh(padGeo, pad, false);
    p.position.set(i - (len - 1) / 2, 0, (r() - 0.5) * 0.1);
    p.rotation.y = r() * Math.PI * 2;
    g.add(p);
  }
  if (flower) {
    const f = new THREE.Group();
    f.add(mesh(flowerGeo.petals, petal), mesh(flowerGeo.pollen, m.pollen, false));
    f.position.set(-(len - 1) / 2 - 0.12, 0.04, -0.1);
    g.add(f);
  }
  return { group: g, mats: [pad, petal] };
}

// ---------- fuzzies (shell-rendered fur) ----------
const shellMats = new Map<string, THREE.MeshStandardMaterial>();
const furGeos = new Map<string, THREE.SphereGeometry>();

function furGeometry(r: number, colors: [string, string]): THREE.SphereGeometry {
  const key = `${r}|${colors.join()}`;
  let g = furGeos.get(key);
  if (g) return g;
  g = new THREE.SphereGeometry(r, 40, 28);
  const top = new THREE.Color(colors[0]), bottom = new THREE.Color(colors[1]);
  const pos = g.attributes.position;
  const col = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const t = Math.min(1, Math.max(0, 0.5 - pos.getY(i) / (2 * r) + pos.getX(i) / (5 * r)));
    c.copy(top).lerp(bottom, t);
    col.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  furGeos.set(key, g);
  return g;
}

export interface FuzzyModel {
  group: THREE.Group; // position this
  body: THREE.Group; // squash & stretch this
  face: THREE.Group;
  pupils: THREE.Object3D[];
  shells: THREE.Mesh[];
  radius: number;
}

export function makeFuzzy(m: Mats, colors: [string, string], r: number, fur: number, shells: number, opts: { mouth?: boolean; metallic?: boolean } = {}): FuzzyModel {
  const geo = furGeometry(r, colors);
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);
  const core = mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, color: 0x9a9a9a, metalness: opts.metallic ? 0.5 : 0 }));
  body.add(core);
  const list: THREE.Mesh[] = [];
  for (let i = 1; i <= shells; i++) {
    const k = i / shells;
    const key = `${shells}:${i}:${opts.metallic ? 1 : 0}`;
    let mat = shellMats.get(key);
    if (!mat) {
      mat = new THREE.MeshStandardMaterial({ vertexColors: true, alphaMap: m.fur, alphaTest: 0.08 + 0.85 * k, roughness: opts.metallic ? 0.35 : 0.85, metalness: opts.metallic ? 0.55 : 0 });
      mat.color.setScalar(0.62 + 0.55 * k);
      shellMats.set(key, mat);
    }
    const s = new THREE.Mesh(geo, mat);
    s.scale.setScalar(1 + (fur / r) * k);
    s.castShadow = false;
    s.receiveShadow = true;
    body.add(s);
    list.push(s);
  }
  // face: eyes, pupils with a wet highlight, smile and blush
  const face = new THREE.Group();
  body.add(face);
  const R = r + fur * 0.7;
  const white = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.15, clearcoat: 1 });
  const black = new THREE.MeshPhysicalMaterial({ color: 0x0d0b14, roughness: 0.1, clearcoat: 1 });
  const shine = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const pupils: THREE.Object3D[] = [];
  for (const sx of [-1, 1]) {
    const ex = sx * 0.36 * R, ey = 0.14 * R, ez = Math.sqrt(Math.max(0, R * R - ex * ex - ey * ey)) * 0.93;
    const eye = new THREE.Mesh(new THREE.SphereGeometry(r * 0.27, 20, 14), white);
    eye.scale.set(1, 1.18, 0.75);
    eye.position.set(ex, ey, ez);
    face.add(eye);
    const pupilHolder = new THREE.Group();
    pupilHolder.position.set(ex, ey, ez + r * 0.14);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(r * 0.15, 16, 12), black);
    pupil.scale.set(1, 1.15, 0.6);
    const hl = new THREE.Mesh(new THREE.SphereGeometry(r * 0.045, 8, 6), shine);
    hl.position.set(-r * 0.05, r * 0.07, r * 0.08);
    pupilHolder.add(pupil, hl);
    face.add(pupilHolder);
    pupils.push(pupilHolder);
  }
  if (opts.mouth !== false) {
    const mouth = new THREE.Mesh(new THREE.TorusGeometry(r * 0.15, r * 0.035, 8, 18, Math.PI), black);
    mouth.rotation.z = Math.PI;
    mouth.position.set(0, -0.16 * R, R * 0.97);
    face.add(mouth);
    const blush = new THREE.MeshBasicMaterial({ color: 0xff8fb8, transparent: true, opacity: 0.45, depthWrite: false });
    for (const sx of [-1, 1]) {
      const b = new THREE.Mesh(new THREE.CircleGeometry(r * 0.13, 16), blush);
      b.position.set(sx * 0.58 * R, -0.1 * R, R * 0.83);
      b.rotation.y = sx * 0.6;
      face.add(b);
    }
  }
  return { group, body, face, pupils, shells: list, radius: r + fur };
}

// ---------- scenery ----------
export function makeNest(m: Mats): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.TorusGeometry(0.33, 0.12, 12, 28).rotateX(Math.PI / 2), m.straw));
  const inner = mesh(new THREE.CircleGeometry(0.32, 24).rotateX(-Math.PI / 2), m.straw, false);
  inner.position.y = -0.03;
  g.add(inner);
  const r = T.rng(4);
  const twigs: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 10; i++) {
    const a = r() * Math.PI * 2;
    twigs.push(new THREE.CylinderGeometry(0.008, 0.008, 0.35, 4).rotateZ(Math.PI / 2 + (r() - 0.5) * 0.4).rotateY(a).translate(Math.cos(a) * 0.36, 0.08 + r() * 0.05, Math.sin(a) * 0.36));
  }
  g.add(mesh(merge(twigs), m.straw));
  return g;
}

export function bushGeometry(seed: number, size = 1): THREE.BufferGeometry {
  const r = T.rng(seed);
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 6; i++) {
    const rad = (0.22 + r() * 0.2) * size;
    parts.push(new THREE.IcosahedronGeometry(rad, 2).translate((r() - 0.5) * 0.6 * size, rad * 0.8 + r() * 0.15 * size, (r() - 0.5) * 0.45 * size));
  }
  return merge(parts);
}

export function makeTree(m: Mats, seed: number, scale = 1): THREE.Group {
  const r = T.rng(seed);
  const g = new THREE.Group();
  const h = 1.1 + r() * 0.6;
  const trunk = mesh(new THREE.CylinderGeometry(0.08, 0.14, h, 10).translate(0, h / 2, 0), m.bark);
  g.add(trunk);
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 5; i++) {
    const rad = 0.45 + r() * 0.35;
    parts.push(new THREE.IcosahedronGeometry(rad, 2).translate((r() - 0.5) * 0.7, h + (r() - 0.2) * 0.6, (r() - 0.5) * 0.7));
  }
  g.add(mesh(merge(parts), r() < 0.5 ? m.leaves : m.darkLeaves));
  g.scale.setScalar(scale);
  return g;
}

export function makeLamp(m: Mats, facing: 1 | -1): { group: THREE.Group; head: THREE.Vector3 } {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.035, 0.05, 2.1, 10).translate(0, 1.05, 0), m.metal));
  g.add(mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.12, 10).translate(0, 0.06, 0), m.metal));
  g.add(mesh(new THREE.BoxGeometry(0.5, 0.04, 0.04).translate(facing * 0.23, 2.05, 0), m.metal));
  g.add(mesh(new RoundedBoxGeometry(0.26, 0.07, 0.16, 2, 0.02).translate(facing * 0.45, 2.02, 0), m.metal));
  const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.02, 0.11).translate(facing * 0.45, 1.98, 0), m.bulb);
  g.add(bulb);
  return { group: g, head: new THREE.Vector3(facing * 0.45, 1.95, 0) };
}

/** A field of instanced grass blades that sway in the wind. */
export function makeGrass(count: number, areas: { x0: number; x1: number; z0: number; z1: number }[], seed: number, time: { value: number }): THREE.InstancedMesh {
  const blade = new THREE.BufferGeometry();
  blade.setAttribute('position', new THREE.Float32BufferAttribute([-0.018, 0, 0, 0.018, 0, 0, -0.01, 0.09, 0, 0.01, 0.09, 0, 0, 0.17, 0], 3));
  blade.setAttribute('normal', new THREE.Float32BufferAttribute([0, 0.4, 1, 0, 0.4, 1, 0, 0.6, 1, 0, 0.6, 1, 0, 1, 0.4], 3));
  blade.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 0.5, 1, 0.5, 0.5, 1], 2));
  blade.setIndex([0, 1, 2, 1, 3, 2, 2, 3, 4]);
  const mat = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.85 });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = time;
    shader.vertexShader = 'uniform float uTime;\n' + shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      vec4 ip = instanceMatrix[3];
      float sway = sin(uTime * 1.7 + ip.x * 0.9 + ip.z * 1.3) * 0.5 + sin(uTime * 3.1 + ip.x * 2.1) * 0.2;
      transformed.x += sway * uv.y * uv.y * 0.06;`);
  };
  const im = new THREE.InstancedMesh(blade, mat, count);
  im.receiveShadow = true;
  const r = T.rng(seed);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), e = new THREE.Euler();
  const greens = ['#3f6f22', '#4f8a2c', '#5f9a36', '#6fa83f', '#3a5f1d', '#7aa846'].map((c) => new THREE.Color(c));
  const total = areas.reduce((a, b) => a + (b.x1 - b.x0) * (b.z1 - b.z0), 0);
  let i = 0;
  for (const a of areas) {
    const n = Math.round((count * (a.x1 - a.x0) * (a.z1 - a.z0)) / total);
    for (let k = 0; k < n && i < count; k++, i++) {
      p.set(a.x0 + r() * (a.x1 - a.x0), 0, a.z0 + r() * (a.z1 - a.z0));
      e.set((r() - 0.5) * 0.4, r() * Math.PI, (r() - 0.5) * 0.4);
      q.setFromEuler(e);
      const hgt = 0.6 + r() * 0.9;
      s.set(1, hgt, 1);
      im.setMatrixAt(i, m4.compose(p, q, s));
      im.setColorAt(i, greens[Math.floor(r() * greens.length)]);
    }
  }
  im.count = i;
  return im;
}
