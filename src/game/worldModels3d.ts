/**
 * 3D models for the Fuzzy Crossing world levels, in the same rounded, glossy, cute style as models3d.ts:
 * sports cars, taxis, ambulances, hover cars, ghost cars, trains, handcars, sleds, deer, rabbits, bats, crabs, turtles, boats,
 * ice floes, drawbridges, plus obstacles (snowmen, tombstones, rocks…) and scenery (buildings, palms, pines…). 1 unit = 1 board cell.
 * Vehicles face +x (the view turns left-movers round), length along x, centred on the origin.
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import * as M from './models3d';
import * as T from './textures3d';
import * as WT from './worldTextures';

const std = (color: string | number, rough = 0.6, metal = 0, extra: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...extra });
const glowMat = (color: string | number, i = 1.5) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: i, roughness: 0.4 });
function mesh(g: THREE.BufferGeometry, m: THREE.Material, shadow = true): THREE.Mesh {
  const x = new THREE.Mesh(g, m);
  x.castShadow = shadow; x.receiveShadow = true;
  return x;
}
const box = (w: number, h: number, d: number, r = 0.04) => new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2, h / 2, d / 2));
function at<T extends THREE.Object3D>(o: T, x: number, y: number, z: number): T { o.position.set(x, y, z); return o; }

const shared = {
  tire: std(0x151515, 0.9), rim: std(0xc8ccd2, 0.25, 1), glass: new THREE.MeshPhysicalMaterial({ color: 0x0b1118, metalness: 0.2, roughness: 0.05, clearcoat: 1 }),
  white: std('#f6f6f2', 0.45), black: std('#14121b', 0.4), wood: std('#9a6a3c', 0.85), darkWood: std('#6b4524', 0.9), metal: std('#55606b', 0.35, 0.8),
  red: glowMat('#ff2a3d', 0.4), blue: glowMat('#2a7bff', 0.4), amber: glowMat('#ffb020', 0.4), green: glowMat('#36e07a', 0.4),
  eyeW: new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.15, clearcoat: 1 }), eyeB: new THREE.MeshPhysicalMaterial({ color: 0x0d0b14, roughness: 0.1, clearcoat: 1 }),
};
const paintCache = new Map<string, THREE.MeshPhysicalMaterial>();
const paint = (c: string) => { let m = paintCache.get(c); if (!m) { m = new THREE.MeshPhysicalMaterial({ color: c, metalness: 0.5, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.06 }); paintCache.set(c, m); } return m; };

function wheels(g: THREE.Group, xs: number[], halfW: number, r = 0.1): void {
  for (const x of xs) for (const z of [-halfW, halfW]) {
    g.add(at(mesh(new THREE.CylinderGeometry(r, r, 0.08, 16).rotateX(Math.PI / 2), shared.tire), x, r, z));
    g.add(at(mesh(new THREE.CylinderGeometry(r * 0.55, r * 0.55, 0.085, 10).rotateX(Math.PI / 2), shared.rim, false), x, r, z));
  }
}
/** two cute eyes on the front of a vehicle/animal (front = +x) */
function eyes(g: THREE.Group, x: number, y: number, spread: number, r = 0.06): void {
  for (const z of [-spread, spread]) {
    const e = at(mesh(new THREE.SphereGeometry(r, 12, 10), shared.eyeW, false), x, y, z);
    e.scale.set(0.6, 1.1, 1);
    const p = at(mesh(new THREE.SphereGeometry(r * 0.55, 10, 8), shared.eyeB, false), x + r * 0.45, y, z);
    g.add(e, p);
  }
}

export interface Built { node: THREE.Group; mats?: THREE.Material[]; flash?: THREE.Material[]; parts?: Record<string, THREE.Object3D> }

// ---------- vehicles ----------
function sportsCar(color: string): Built {
  const g = new THREE.Group();
  g.add(at(mesh(box(0.92, 0.18, 0.52, 0.07), paint(color)), 0, 0.17, 0));
  g.add(at(mesh(box(0.42, 0.13, 0.42, 0.06), shared.glass), -0.05, 0.31, 0));
  g.add(at(mesh(box(0.08, 0.04, 0.5, 0.015), shared.black), -0.44, 0.34, 0));
  g.add(at(mesh(box(0.04, 0.12, 0.04, 0.01), shared.black), -0.42, 0.28, 0.2), at(mesh(box(0.04, 0.12, 0.04, 0.01), shared.black), -0.42, 0.28, -0.2));
  g.add(at(mesh(box(0.02, 0.04, 0.12, 0.01), glowMat('#fff6dc', 1)), 0.46, 0.18, 0.17), at(mesh(box(0.02, 0.04, 0.12, 0.01), glowMat('#fff6dc', 1)), 0.46, 0.18, -0.17));
  g.add(at(mesh(box(0.3, 0.012, 0.06, 0.005), shared.white, false), 0.1, 0.265, 0));
  wheels(g, [-0.28, 0.3], 0.25, 0.095);
  return { node: g };
}
function taxi(mats: M.Mats): Built {
  const g = M.makeVehicle(mats, 'car', '#ffcc1a');
  g.add(at(mesh(box(0.16, 0.08, 0.2, 0.03), glowMat('#fff3b0', 0.6)), -0.1, 0.57, 0));
  return { node: g };
}
function ambulance(): Built {
  const g = new THREE.Group();
  g.add(at(mesh(box(1.38, 0.52, 0.6, 0.08), shared.white), -0.02, 0.4, 0));
  g.add(at(mesh(box(1.4, 0.07, 0.61, 0.02), std('#e63946', 0.5)), -0.02, 0.36, 0));
  g.add(at(mesh(box(0.04, 0.22, 0.5, 0.02), shared.glass), 0.69, 0.48, 0));
  // a red cross on each side
  for (const z of [-0.306, 0.306]) {
    g.add(at(mesh(new THREE.BoxGeometry(0.2, 0.06, 0.005), std('#e63946')), -0.15, 0.5, z), at(mesh(new THREE.BoxGeometry(0.06, 0.2, 0.005), std('#e63946')), -0.15, 0.5, z));
  }
  const red = glowMat('#ff2a3d', 0.4), blue = glowMat('#2a7bff', 0.4);
  g.add(at(mesh(box(0.12, 0.07, 0.18, 0.03), red), 0.45, 0.7, -0.12), at(mesh(box(0.12, 0.07, 0.18, 0.03), blue), 0.45, 0.7, 0.12));
  wheels(g, [-0.45, 0.45], 0.28, 0.11);
  return { node: g, flash: [red, blue] };
}
function hoverCar(color: string): Built {
  const g = new THREE.Group();
  g.add(at(mesh(box(0.94, 0.22, 0.54, 0.1), paint(color)), 0, 0.32, 0));
  g.add(at(mesh(new THREE.SphereGeometry(0.22, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2).scale(1.3, 0.8, 1), shared.glass), -0.05, 0.42, 0));
  const glow = glowMat(color, 2.2);
  g.add(at(mesh(new THREE.CylinderGeometry(0.34, 0.38, 0.03, 24).scale(1.3, 1, 0.85), glow, false), 0, 0.16, 0));
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.9).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: T.glow(color + 'aa', color + '00'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  pool.position.y = 0.02;
  g.add(pool);
  g.userData.hover = true;
  return { node: g };
}
function ghostCar(): Built {
  const g = new THREE.Group();
  const body = new THREE.MeshStandardMaterial({ color: '#cdeeff', emissive: '#7fc8ff', emissiveIntensity: 0.6, transparent: true, opacity: 0.85, roughness: 0.3, depthWrite: false });
  const s = new THREE.Shape();
  s.moveTo(-0.45, 0.08); s.lineTo(0.45, 0.08); s.quadraticCurveTo(0.5, 0.3, 0.3, 0.34); s.lineTo(0.18, 0.52); s.lineTo(-0.3, 0.52); s.quadraticCurveTo(-0.48, 0.5, -0.47, 0.3); s.closePath();
  g.add(mesh(new THREE.ExtrudeGeometry(s, { depth: 0.48, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 3 }).translate(0, 0, -0.24), body, false));
  // wavy ghostly tail instead of wheels
  for (let i = 0; i < 4; i++) g.add(at(mesh(new THREE.SphereGeometry(0.1, 12, 8), body, false), -0.36 + i * 0.24, 0.06, 0));
  const eyeMat = new THREE.MeshBasicMaterial({ color: '#1b2140', transparent: true });
  for (const z of [-0.12, 0.12]) g.add(at(mesh(new THREE.SphereGeometry(0.05, 10, 8).scale(0.4, 1.2, 1), eyeMat, false), 0.47, 0.3, z));
  return { node: g, mats: [body, eyeMat] };
}
function train(len: number, color: string): Built {
  const g = new THREE.Group();
  const L = len * 0.98;
  const front = L / 2;
  const body = paint(color), trim = std('#2b2d42', 0.5, 0.3);
  // locomotive: rounded nose + cab
  g.add(at(mesh(box(1.9, 0.62, 0.7, 0.18), body), front - 0.95, 0.5, 0));
  g.add(at(mesh(new THREE.SphereGeometry(0.34, 20, 14).scale(0.9, 0.9, 1.0), body), front - 0.05, 0.47, 0));
  g.add(at(mesh(box(0.05, 0.22, 0.5, 0.02), shared.glass), front + 0.24, 0.6, 0));
  g.add(at(mesh(box(0.04, 0.08, 0.18, 0.02), glowMat('#fff2c8', 2)), front + 0.28, 0.35, 0));
  // carriages
  let x = front - 2.05;
  while (x - 1.7 > -L / 2 - 0.2) {
    g.add(at(mesh(box(1.75, 0.6, 0.66, 0.1), body), x - 0.88, 0.5, 0));
    for (let i = 0; i < 4; i++) for (const z of [-0.335, 0.335]) g.add(at(mesh(new THREE.BoxGeometry(0.26, 0.16, 0.01), shared.glass), x - 0.25 - i * 0.42, 0.6, z));
    g.add(at(mesh(new THREE.BoxGeometry(1.76, 0.06, 0.67), trim), x - 0.88, 0.32, 0));
    x -= 1.85;
  }
  g.add(at(mesh(new THREE.BoxGeometry(L, 0.08, 0.6), trim), 0, 0.2, 0));
  const xs: number[] = [];
  for (let p = -L / 2 + 0.3; p < L / 2 - 0.3; p += 0.62) xs.push(p);
  wheels(g, xs, 0.27, 0.11);
  return { node: g };
}
function handcar(): Built {
  const g = new THREE.Group();
  g.add(at(mesh(box(0.86, 0.12, 0.55, 0.03), shared.wood), 0, 0.22, 0));
  g.add(at(mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.4, 8), shared.metal), 0, 0.46, 0));
  const bar = at(mesh(box(0.7, 0.05, 0.06, 0.02), shared.metal), 0, 0.66, 0);
  g.add(bar);
  wheels(g, [-0.3, 0.3], 0.26, 0.11);
  return { node: g, parts: { bar } };
}
function sled(color: string): Built {
  const g = new THREE.Group();
  g.add(at(mesh(box(0.78, 0.07, 0.42, 0.03), paint(color)), 0, 0.2, 0));
  for (const z of [-0.18, 0.18]) {
    const run = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.018, 6, 24, Math.PI * 0.55), shared.metal);
    run.rotation.z = Math.PI * 0.72; run.position.set(0.0, 0.47, z);
    g.add(run, at(mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.8, 6).rotateZ(Math.PI / 2), shared.metal), -0.02, 0.06, z));
  }
  // a woolly hat bobble rider
  const rider = at(mesh(new THREE.SphereGeometry(0.17, 16, 12), std('#f2f2f2', 0.9)), -0.1, 0.38, 0);
  g.add(rider, at(mesh(new THREE.SphereGeometry(0.1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), std(color, 0.8)), -0.1, 0.48, 0));
  eyes(g, 0.05, 0.4, 0.06, 0.04);
  return { node: g };
}

// ---------- animals ----------
function deer(n: number): Built {
  const g = new THREE.Group();
  const fur = std('#b07a45', 0.85), belly = std('#f0dcc0', 0.9), dark = std('#5a3b22', 0.8);
  const legs: THREE.Object3D[] = [];
  for (let i = 0; i < n; i++) {
    const d = new THREE.Group();
    d.position.x = (i - (n - 1) / 2) * 0.95;
    d.add(at(mesh(new THREE.SphereGeometry(0.24, 16, 12).scale(1.5, 0.95, 0.9), fur), 0, 0.5, 0));
    d.add(at(mesh(new THREE.SphereGeometry(0.16, 12, 10).scale(1.3, 0.6, 0.8), belly), 0, 0.42, 0));
    d.add(at(mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.3, 8).rotateZ(-0.6), fur), 0.32, 0.72, 0));
    const head = at(mesh(new THREE.SphereGeometry(0.15, 14, 10).scale(1.2, 1, 0.95), fur), 0.44, 0.86, 0);
    d.add(head, at(mesh(new THREE.SphereGeometry(0.04, 8, 6), shared.black), 0.62, 0.84, 0));
    eyes(d, 0.52, 0.9, 0.08, 0.035);
    for (const z of [-0.07, 0.07]) {
      const ear = at(mesh(new THREE.SphereGeometry(0.06, 8, 6).scale(0.5, 1.4, 0.8), fur), 0.36, 0.99, z * 2.2);
      d.add(ear);
      if (i % 2 === 0) { const a = at(mesh(new THREE.CylinderGeometry(0.012, 0.018, 0.22, 5), dark), 0.42, 1.08, z * 1.4); a.rotation.x = z * 4; d.add(a); }
    }
    for (const [lx, lz] of [[-0.22, -0.1], [-0.22, 0.1], [0.22, -0.1], [0.22, 0.1]]) { const lg = at(mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.36, 6).translate(0, -0.18, 0), dark), lx, 0.42, lz); d.add(lg); legs.push(lg); }
    d.add(at(mesh(new THREE.SphereGeometry(0.06, 8, 6), belly), -0.36, 0.58, 0));
    g.add(d);
  }
  g.userData.legs = legs;
  return { node: g };
}
function rabbit(): Built {
  const g = new THREE.Group();
  const fur = std('#f4f1ea', 0.95), pink = std('#ffb3c7', 0.8);
  const body = new THREE.Group();
  body.add(at(mesh(new THREE.SphereGeometry(0.2, 16, 12).scale(1.2, 1, 1), fur), 0, 0.22, 0));
  body.add(at(mesh(new THREE.SphereGeometry(0.14, 14, 10), fur), 0.2, 0.36, 0));
  for (const z of [-0.05, 0.05]) { const e = at(mesh(new THREE.SphereGeometry(0.045, 8, 8).scale(0.6, 2.6, 0.9), fur), 0.16, 0.56, z); e.rotation.x = z * 3; body.add(e, at(mesh(new THREE.SphereGeometry(0.025, 6, 6).scale(0.4, 2.4, 0.6), pink, false), 0.175, 0.56, z * 1.05)); }
  body.add(at(mesh(new THREE.SphereGeometry(0.07, 8, 8), fur), -0.24, 0.26, 0));
  eyes(body, 0.31, 0.39, 0.06, 0.03);
  g.add(body);
  g.userData.hopper = body;
  return { node: g };
}
function bat(): Built {
  const g = new THREE.Group();
  const fur = std('#3a2f4a', 0.8), wingM = new THREE.MeshStandardMaterial({ color: '#4a3a5e', roughness: 0.7, side: THREE.DoubleSide });
  g.add(at(mesh(new THREE.SphereGeometry(0.16, 14, 10), fur), 0, 0.62, 0));
  for (const z of [-0.06, 0.06]) g.add(at(mesh(new THREE.ConeGeometry(0.04, 0.1, 6), fur), 0.02, 0.78, z));
  eyes(g, 0.14, 0.65, 0.05, 0.035);
  const wings: THREE.Object3D[] = [];
  for (const s of [-1, 1]) {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0); shape.quadraticCurveTo(0.25, 0.2, 0.5, 0.1); shape.quadraticCurveTo(0.4, -0.02, 0.33, -0.05); shape.quadraticCurveTo(0.22, 0.04, 0.16, -0.06); shape.quadraticCurveTo(0.08, 0, 0, -0.04);
    const w = new THREE.Mesh(new THREE.ShapeGeometry(shape), wingM);
    w.rotation.x = s * Math.PI / 2; w.scale.z = s;
    const pivot = new THREE.Group(); pivot.position.set(0, 0.64, s * 0.1); pivot.add(w);
    if (s < 0) pivot.rotation.y = Math.PI;
    g.add(pivot); wings.push(pivot);
  }
  g.userData.wings = wings;
  return { node: g };
}
function crab(): Built {
  const g = new THREE.Group();
  const shell = std('#ff6b4a', 0.45, 0.05, { emissive: '#3a0800', emissiveIntensity: 0.2 });
  g.add(at(mesh(new THREE.SphereGeometry(0.25, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.7, 1.25), shell), 0, 0.1, 0));
  for (const z of [-0.33, 0.33]) {
    g.add(at(mesh(new THREE.SphereGeometry(0.1, 10, 8).scale(1.2, 0.8, 0.9), shell), 0.22, 0.16, z));
    for (let k = 0; k < 3; k++) g.add(at(mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.2, 5).rotateX(z > 0 ? -1 : 1), shell), -0.12 + k * 0.1, 0.07, z * 0.95));
  }
  for (const z of [-0.08, 0.08]) { g.add(at(mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.14, 5), shell), 0.12, 0.25, z)); const e = at(mesh(new THREE.SphereGeometry(0.045, 10, 8), shared.eyeW, false), 0.13, 0.33, z); g.add(e, at(mesh(new THREE.SphereGeometry(0.024, 8, 6), shared.eyeB, false), 0.165, 0.335, z)); }
  return { node: g };
}
function turtles(n: number): Built {
  const g = new THREE.Group();
  const shell = new THREE.MeshStandardMaterial({ color: '#3f8f5a', roughness: 0.5, transparent: true }), skin = new THREE.MeshStandardMaterial({ color: '#9bcf6a', roughness: 0.7, transparent: true }), rim = new THREE.MeshStandardMaterial({ color: '#2b6b40', roughness: 0.6, transparent: true });
  for (let i = 0; i < n; i++) {
    const t = new THREE.Group();
    t.position.x = i - (n - 1) / 2;
    t.add(at(mesh(new THREE.SphereGeometry(0.36, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2).scale(1.05, 0.62, 0.95), shell), 0, 0, 0));
    t.add(at(mesh(new THREE.TorusGeometry(0.34, 0.035, 6, 24).rotateX(Math.PI / 2), rim), 0, 0.01, 0));
    for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2; t.add(at(mesh(new THREE.CircleGeometry(0.09, 6).rotateX(-Math.PI / 2), rim, false), Math.cos(a) * 0.17, 0.2, Math.sin(a) * 0.17)); }
    const head = at(mesh(new THREE.SphereGeometry(0.11, 12, 8), skin), 0.4, 0.04, 0);
    t.add(head);
    eyes(t, 0.48, 0.08, 0.05, 0.028);
    g.add(t);
  }
  return { node: g, mats: [shell, skin, rim] };
}
function boat(len: number, color: string): Built {
  const g = new THREE.Group();
  const L = len * 0.94;
  const s = new THREE.Shape();
  s.moveTo(-L / 2, 0.28); s.lineTo(L / 2 - 0.35, 0.28); s.quadraticCurveTo(L / 2 + 0.05, 0.27, L / 2, 0.08); s.quadraticCurveTo(L / 2 - 0.2, -0.08, L / 2 - 0.5, -0.08); s.lineTo(-L / 2 + 0.15, -0.08); s.quadraticCurveTo(-L / 2, -0.05, -L / 2, 0.28);
  g.add(mesh(new THREE.ExtrudeGeometry(s, { depth: 0.72, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 2 }).translate(0, 0, -0.36), paint(color)));
  g.add(at(mesh(box(L - 0.25, 0.04, 0.7, 0.02), shared.wood), -0.05, 0.3, 0));
  g.add(at(mesh(box(0.9, 0.4, 0.5, 0.06), shared.white), -0.4, 0.52, 0));
  g.add(at(mesh(box(0.92, 0.14, 0.52, 0.03), shared.glass), -0.4, 0.6, 0));
  g.add(at(mesh(new THREE.BoxGeometry(L + 0.05, 0.05, 0.74), std('#e63946', 0.5)), -0.05, 0.16, 0));
  return { node: g };
}
function raft(len: number): Built {
  const g = new THREE.Group();
  const m = new THREE.MeshPhysicalMaterial({ color: '#eef8ff', roughness: 0.25, clearcoat: 0.8, transmission: 0, sheen: 0 });
  const s = new THREE.Shape();
  const L = len * 0.92;
  const r = T.rng(Math.round(len * 13));
  const pts: [number, number][] = [];
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; pts.push([Math.cos(a) * (L / 2) * (0.88 + r() * 0.12), Math.sin(a) * 0.4 * (0.85 + r() * 0.15)]); }
  s.moveTo(...pts[0]); for (const p of pts.slice(1)) s.lineTo(...p); s.closePath();
  g.add(mesh(new THREE.ExtrudeGeometry(s, { depth: 0.16, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.04, bevelSegments: 2 }).rotateX(-Math.PI / 2).translate(0, -0.06, 0), m));
  g.add(at(mesh(new THREE.SphereGeometry(0.08, 8, 6), std('#ffffff', 0.9)), L * 0.2, 0.14, 0.1));
  return { node: g };
}
function bridge(len: number): Built {
  const g = new THREE.Group();
  const deck = new THREE.Group();
  deck.position.x = -len / 2; // hinge at the left end
  const plank = std('#b07a45', 0.8);
  for (let i = 0; i < Math.round(len * 4); i++) deck.add(at(mesh(box(0.22, 0.08, 0.82, 0.02), i % 2 ? plank : shared.wood), 0.13 + i * 0.25, 0.06, 0));
  for (const z of [-0.43, 0.43]) deck.add(at(mesh(box(len, 0.06, 0.05, 0.02), shared.darkWood), len / 2, 0.22, z));
  const lamp = glowMat('#ff2a3d', 0.2);
  for (const x of [0.15, len - 0.15]) for (const z of [-0.43, 0.43]) deck.add(at(mesh(new THREE.SphereGeometry(0.05, 8, 6), lamp, false), x, 0.3, z));
  g.add(deck);
  return { node: g, flash: [lamp], parts: { deck } };
}

/** a world-level object model (Classic kinds come from models3d.ts) */
export function makeObject(mats: M.Mats, kind: string, len: number, color: string, seed: number): Built {
  switch (kind) {
    case 'car': return { node: M.makeVehicle(mats, 'car', color) };
    case 'truck': return { node: M.makeVehicle(mats, 'truck', color, ['#eceff2', '#d9dde2', '#f5f1e6'][seed % 3]) };
    case 'bus': return { node: M.makeVehicle(mats, 'bus', color) };
    case 'taxi': return taxi(mats);
    case 'sports': return sportsCar(color);
    case 'ambulance': return ambulance();
    case 'hover': return hoverCar(color);
    case 'ghost': return ghostCar();
    case 'train': return train(len, color);
    case 'handcar': return handcar();
    case 'sled': return sled(color);
    case 'deer': return deer(Math.max(1, Math.round(len)));
    case 'rabbit': return rabbit();
    case 'bat': return bat();
    case 'crab': return crab();
    case 'turtle': return turtles(Math.round(len));
    case 'boat': return boat(len, color);
    case 'raft': return raft(len);
    case 'bridge': return bridge(len);
    case 'log': return { node: M.makeLog(mats, len) };
    case 'pad': { const p = M.makePads(mats, len, seed % 3 !== 0, seed); return { node: p.group, mats: p.mats }; }
    default: return { node: M.makeVehicle(mats, 'car', color) };
  }
}

// ---------- obstacles + scenery ----------
export function snowman(seed: number): THREE.Group {
  const g = new THREE.Group();
  const snow = std('#fbfdff', 0.7);
  g.add(at(mesh(new THREE.SphereGeometry(0.3, 18, 14), snow), 0, 0.27, 0), at(mesh(new THREE.SphereGeometry(0.22, 16, 12), snow), 0, 0.68, 0), at(mesh(new THREE.SphereGeometry(0.16, 14, 10), snow), 0, 0.98, 0));
  g.add(at(mesh(new THREE.ConeGeometry(0.035, 0.18, 8).rotateZ(-Math.PI / 2), std('#ff8c1a', 0.6)), 0, 0.97, 0.2).rotateY(Math.PI / 2));
  for (const x of [-0.06, 0.06]) g.add(at(mesh(new THREE.SphereGeometry(0.022, 6, 6), shared.black), x, 1.03, 0.14));
  const scarf = std(['#e63946', '#1f6fd1', '#2f855a'][seed % 3], 0.8);
  g.add(at(mesh(new THREE.TorusGeometry(0.15, 0.045, 8, 18).rotateX(Math.PI / 2), scarf), 0, 0.86, 0));
  g.add(at(mesh(new THREE.CylinderGeometry(0.12, 0.13, 0.16, 14), shared.black), 0, 1.16, 0), at(mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.02, 16), shared.black), 0, 1.08, 0));
  return g;
}
export function tombstone(seed: number): THREE.Group {
  const g = new THREE.Group();
  const stone = std(['#8d93a0', '#7c818c', '#9aa0aa'][seed % 3], 0.95);
  const s = new THREE.Shape(); s.moveTo(-0.26, 0); s.lineTo(0.26, 0); s.lineTo(0.26, 0.5); s.absarc(0, 0.5, 0.26, 0, Math.PI, false); s.closePath();
  g.add(mesh(new THREE.ExtrudeGeometry(s, { depth: 0.12, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 2 }).translate(0, 0, -0.06), stone));
  g.add(at(mesh(new THREE.BoxGeometry(0.06, 0.24, 0.02), std('#5a5f6a')), 0, 0.48, 0.08), at(mesh(new THREE.BoxGeometry(0.18, 0.06, 0.02), std('#5a5f6a')), 0, 0.53, 0.08));
  g.add(at(mesh(new THREE.SphereGeometry(0.12, 8, 6).scale(1.4, 0.4, 1), std('#4d6146', 1)), 0.18, 0.02, 0.14));
  g.rotation.z = (seed % 5 - 2) * 0.04;
  return g;
}
export function rock(seed: number, color = '#8b8f94', size = 1): THREE.Group {
  const g = new THREE.Group();
  const r = T.rng(seed);
  const geo = new THREE.IcosahedronGeometry(0.32 * size, 1);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const k = 0.82 + r() * 0.3; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.75, p.getZ(i) * k); }
  geo.computeVertexNormals();
  g.add(at(mesh(geo, std(color, 0.95)), 0, 0.2 * size, 0));
  return g;
}
export function palm(seed: number, h = 2.2): THREE.Group {
  const g = new THREE.Group();
  const r = T.rng(seed);
  const trunk = std('#a07a52', 0.9), leaf = new THREE.MeshStandardMaterial({ color: '#3f9a46', roughness: 0.7, side: THREE.DoubleSide });
  const lean = (r() - 0.5) * 0.4;
  for (let i = 0; i < 8; i++) { const seg = at(mesh(new THREE.CylinderGeometry(0.07, 0.09, h / 8 + 0.02, 8), trunk), lean * i * 0.12, h * (i + 0.5) / 8, 0); g.add(seg); }
  const top = new THREE.Vector3(lean * 0.96, h, 0);
  for (let i = 0; i < 7; i++) {
    const s = new THREE.Shape(); s.moveTo(0, 0); s.quadraticCurveTo(0.5, 0.18, 1.0, -0.15); s.quadraticCurveTo(0.5, 0.0, 0, 0);
    const f = new THREE.Mesh(new THREE.ShapeGeometry(s), leaf);
    f.castShadow = true;
    const pivot = new THREE.Group(); pivot.position.copy(top); pivot.rotation.y = (i / 7) * Math.PI * 2 + r() * 0.3; pivot.add(f); f.rotation.x = -Math.PI / 2 + 0.3; f.rotation.z = -0.35;
    g.add(pivot);
  }
  g.add(at(mesh(new THREE.SphereGeometry(0.09, 8, 6), std('#6b4a2a')), top.x + 0.08, h - 0.05, 0.05), at(mesh(new THREE.SphereGeometry(0.09, 8, 6), std('#6b4a2a')), top.x - 0.06, h - 0.07, -0.07));
  return g;
}
export function pine(seed: number, snowy = false, scale = 1): THREE.Group {
  const g = new THREE.Group();
  const r = T.rng(seed);
  const green = std(snowy ? '#3f6b55' : '#2f6b3e', 0.85), snowM = std('#f6fbff', 0.8);
  g.add(at(mesh(new THREE.CylinderGeometry(0.07, 0.1, 0.5, 8), std('#6b4a2a')), 0, 0.25, 0));
  for (let i = 0; i < 3; i++) {
    const rad = 0.62 - i * 0.16, y = 0.5 + i * 0.42;
    g.add(at(mesh(new THREE.ConeGeometry(rad, 0.7, 14), green), 0, y + 0.3, 0));
    if (snowy) g.add(at(mesh(new THREE.ConeGeometry(rad * 0.7, 0.28, 14), snowM), 0, y + 0.55, 0));
  }
  g.scale.setScalar((0.9 + r() * 0.5) * scale);
  return g;
}
export function deadTree(seed: number): THREE.Group {
  const g = new THREE.Group();
  const r = T.rng(seed);
  const bark = std('#3d3340', 0.95);
  g.add(at(mesh(new THREE.CylinderGeometry(0.06, 0.13, 1.6, 7), bark), 0, 0.8, 0));
  for (let i = 0; i < 5; i++) {
    const b = mesh(new THREE.CylinderGeometry(0.02, 0.05, 0.6 + r() * 0.4, 5).translate(0, 0.35, 0), bark);
    b.position.set(0, 0.8 + r() * 0.7, 0); b.rotation.set((r() - 0.5) * 1.6, r() * 6, (r() - 0.5) * 1.8);
    g.add(b);
  }
  return g;
}
export function lampPost(color: string, h = 1.8): THREE.Group {
  const g = new THREE.Group();
  g.add(at(mesh(new THREE.CylinderGeometry(0.035, 0.05, h, 8), shared.metal), 0, h / 2, 0));
  g.add(at(mesh(new THREE.SphereGeometry(0.11, 12, 10), glowMat(color, 1.6), false), 0, h + 0.05, 0));
  return g;
}
export function crystal(seed: number): THREE.Group {
  const g = new THREE.Group();
  const r = T.rng(seed);
  const m = new THREE.MeshPhysicalMaterial({ color: ['#ffd23f', '#ff7ac2', '#7ad7ff'][seed % 3], emissive: ['#a07000', '#a0306a', '#2a6fa0'][seed % 3], emissiveIntensity: 0.5, roughness: 0.1, clearcoat: 1 });
  for (let i = 0; i < 4; i++) { const c = mesh(new THREE.OctahedronGeometry(0.16 + r() * 0.1).scale(0.6, 1.8, 0.6), m); c.position.set((r() - 0.5) * 0.3, 0.25 + r() * 0.1, (r() - 0.5) * 0.3); c.rotation.set((r() - 0.5) * 0.5, r() * 3, (r() - 0.5) * 0.5); g.add(c); }
  return g;
}
export function bollard(color: string): THREE.Group {
  const g = new THREE.Group();
  g.add(at(mesh(box(0.34, 0.5, 0.34, 0.08), std('#22243a', 0.4, 0.4)), 0, 0.25, 0));
  g.add(at(mesh(box(0.36, 0.06, 0.36, 0.02), glowMat(color, 2.2), false), 0, 0.42, 0));
  return g;
}
export function bush(seed: number, mats: M.Mats, size = 1): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(M.bushGeometry(seed, size), seed % 2 ? mats.leaves : mats.darkLeaves));
  return g;
}
/** an obstacle that fills one cell of a grass / ice row */
export function blocker(kind: string, props: string, seed: number, mats: M.Mats): THREE.Group {
  if (kind === 'snowman' || props === 'snow') return snowman(seed);
  switch (props) {
    case 'haunted': return tombstone(seed);
    case 'tropical': return seed % 2 ? palm(seed, 1.6) : rock(seed, '#b9a27a');
    case 'neon': return bollard(['#ff3d81', '#39e6ff', '#b6ff3d'][seed % 3]);
    case 'legend': return crystal(seed);
    case 'storm': return rock(seed, '#6f747b', 1.2);
    case 'city': { const g = new THREE.Group(); g.add(at(mesh(box(0.6, 0.36, 0.6, 0.05), std('#8c8f96', 0.8)), 0, 0.18, 0)); g.add(at(bush(seed, mats, 0.7), 0, 0.3, 0)); return g; }
    case 'forest': { const t = M.makeTree(mats, seed, 0.75); return t; }
    default: return seed % 3 === 0 ? rock(seed) : bush(seed, mats, 0.9);
  }
}
/** a building for the skyline behind the nests */
export function building(seed: number, neon: boolean): THREE.Group {
  const g = new THREE.Group();
  const r = T.rng(seed);
  const w = 1.6 + r() * 1.6, d = 1.4 + r() * 1.2, h = 2.5 + r() * (neon ? 7 : 5);
  const base = neon ? ['#1e2040', '#251c3a', '#1a2a44'][seed % 3] : ['#d9cbb4', '#c7b8a6', '#b9c2cc', '#e2d6c2', '#a9b4bf'][seed % 5];
  const win = WT.windows(neon ? ['#ff3d81', '#39e6ff', '#ffd23f'][seed % 3] : '#fff3c4', base, seed);
  win.repeat.set(Math.max(1, Math.round(w / 1.2)), Math.max(1, Math.round(h / 2.4)));
  const m = new THREE.MeshStandardMaterial({ color: '#ffffff', map: win, roughness: 0.7, emissive: neon ? '#ffffff' : '#000000', emissiveMap: neon ? win : null, emissiveIntensity: neon ? 0.7 : 0 });
  g.add(at(mesh(new THREE.BoxGeometry(w, h, d), m), 0, h / 2, 0));
  g.add(at(mesh(new THREE.BoxGeometry(w + 0.1, 0.12, d + 0.1), std(neon ? '#ff3d81' : '#8a7f72', 0.6, 0, neon ? { emissive: '#ff3d81', emissiveIntensity: 1.2 } : {})), 0, h + 0.06, 0));
  return g;
}

/** a Crossing Coin (gold disc with a little fuzzy face) for world-level coin trails */
const coinGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.06, 28).rotateX(Math.PI / 2);
const coinRim = new THREE.TorusGeometry(0.22, 0.025, 8, 28);
export function coin(gold: boolean): THREE.Group {
  const g = new THREE.Group();
  const face = new THREE.MeshPhysicalMaterial({ color: gold ? '#ffd23f' : '#f5b014', metalness: 0.85, roughness: 0.25, clearcoat: 1, emissive: gold ? '#7a5200' : '#3a2600', emissiveIntensity: gold ? 0.5 : 0.25 });
  g.add(mesh(coinGeo, face), mesh(coinRim, face, false));
  for (const x of [-0.06, 0.06]) for (const z of [-0.035, 0.035]) g.add(at(mesh(new THREE.SphereGeometry(0.022, 6, 6), shared.eyeB, false), x, 0.03, z));
  g.scale.setScalar(gold ? 1.6 : 1.3);
  return g;
}

/** the Titan of world 10: a giant golden-crowned Fuzzy that stomps behind the nests */
export function titan(mats: M.Mats): { group: THREE.Group; body: THREE.Group; model: M.FuzzyModel } {
  const model = M.makeFuzzy(mats, ['#ffd27a', '#c9772a'], 1.6, 0.35, 14);
  const g = new THREE.Group();
  g.add(model.group);
  const crown = new THREE.Group();
  const gold = new THREE.MeshPhysicalMaterial({ color: '#ffd23f', metalness: 1, roughness: 0.2, clearcoat: 1 });
  crown.add(mesh(new THREE.CylinderGeometry(0.75, 0.85, 0.4, 24, 1, true), gold));
  for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; crown.add(at(mesh(new THREE.ConeGeometry(0.16, 0.42, 8), gold), Math.cos(a) * 0.78, 0.38, Math.sin(a) * 0.78), at(mesh(new THREE.SphereGeometry(0.08, 8, 6), glowMat(['#ff3d81', '#39e6ff', '#36e07a'][i % 3], 1)), Math.cos(a) * 0.82, 0.12, Math.sin(a) * 0.82)); }
  crown.position.y = 1.85;
  model.body.add(crown);
  return { group: g, body: model.body, model };
}

/** traffic signal for a lane with a light (shows red / amber / green) */
export function trafficLight(): { group: THREE.Group; red: THREE.MeshStandardMaterial; amber: THREE.MeshStandardMaterial; green: THREE.MeshStandardMaterial } {
  const g = new THREE.Group();
  g.add(at(mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.6, 8), shared.metal), 0, 0.8, 0));
  g.add(at(mesh(box(0.22, 0.6, 0.2, 0.05), std('#22252b', 0.5)), 0, 1.7, 0));
  const red = glowMat('#ff2a3d', 0.1), amber = glowMat('#ffb020', 0.1), green = glowMat('#36e07a', 0.1);
  g.add(at(mesh(new THREE.SphereGeometry(0.06, 10, 8), red, false), 0, 1.88, 0.1), at(mesh(new THREE.SphereGeometry(0.06, 10, 8), amber, false), 0, 1.7, 0.1), at(mesh(new THREE.SphereGeometry(0.06, 10, 8), green, false), 0, 1.52, 0.1));
  return { group: g, red, amber, green };
}
/** level-crossing signal: two red lights that flash in turn + the black and white cross */
export function crossingSignal(): { group: THREE.Group; lights: THREE.MeshStandardMaterial[]; arm: THREE.Object3D } {
  const g = new THREE.Group();
  g.add(at(mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.5, 8), shared.white), 0, 0.75, 0));
  const lights = [glowMat('#ff2a3d', 0.05), glowMat('#ff2a3d', 0.05)];
  g.add(at(mesh(box(0.5, 0.18, 0.08, 0.04), std('#16161a')), 0, 1.2, 0.03));
  g.add(at(mesh(new THREE.SphereGeometry(0.07, 10, 8), lights[0], false), -0.15, 1.2, 0.09), at(mesh(new THREE.SphereGeometry(0.07, 10, 8), lights[1], false), 0.15, 1.2, 0.09));
  for (const s of [-1, 1]) { const x = at(mesh(new THREE.BoxGeometry(0.55, 0.07, 0.02), shared.white), 0, 1.48, 0.04); x.rotation.z = s * 0.6; g.add(x); }
  // the barrier arm (pivots at the post)
  const arm = new THREE.Group();
  arm.position.set(0, 0.62, 0.12);
  for (let i = 0; i < 6; i++) arm.add(at(mesh(new THREE.BoxGeometry(0.3, 0.06, 0.04), i % 2 ? std('#e63946') : shared.white), 0.15 + i * 0.3, 0, 0));
  g.add(arm);
  return { group: g, lights, arm };
}
