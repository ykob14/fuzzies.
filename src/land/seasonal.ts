/**
 * Seasonal collectible decorations for Fuzzies Land (land/events.ts lists them; this file draws them).
 * Same rules as every other building (ART.md): rounded, chunky, warm matte materials, 1 unit = 1 tile, standing on
 * y = 0 and centred on the footprint. Animated pieces put a `tick(T, dt)` on `userData` — the view calls it every frame.
 * Each year's set is new artwork: a 2027 set goes in a new block here, never a recolour of these.
 */
import * as THREE from 'three';
import * as T from './textures';
import * as GT from '../game/textures3d';
import { add, rbox, std, textured, mat, gold, plinth, gableRoof, windowOn, picket, PAL, warmGlass } from './models';

type Tick = (T: number, dt: number) => void;
/** A fresh (uncached) glowing material, so each copy can flicker on its own. */
const ownGlow = (color: string, emissive: string, intensity = 1) => new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: intensity, roughness: 0.35 });
const tick = (g: THREE.Group, fn: Tick) => { g.userData.tick = fn; };
const flicker = (m: THREE.MeshStandardMaterial, base: number, amp: number, speed: number, phase = 0): Tick => (T) => { m.emissiveIntensity = base + Math.sin(T * speed + phase) * amp + Math.sin(T * speed * 2.7 + phase * 3) * amp * 0.4; };
const hay = () => mat('hay', () => new THREE.MeshStandardMaterial({ map: T.stripes('#e4bf6a', '#cfa64f', 14), roughness: 0.95 }));

// ---------- pumpkins (shared by the Halloween and harvest pieces) ----------
function pumpkin(g: THREE.Group, x: number, y: number, z: number, r: number, color = '#f28c28', ribs = 8): THREE.Group {
  const p = new THREE.Group();
  // one plump body with soft dark grooves (rings around it), not a cluster of balls
  const body = add(p, new THREE.SphereGeometry(r, 24, 16), std(color, 0.72));
  body.scale.set(1, 0.78, 1);
  const groove = std(T.shade(color, -0.22), 0.85);
  for (let i = 0; i < ribs / 2; i++) {
    const ring = add(p, new THREE.TorusGeometry(r * 0.985, r * 0.045, 6, 36), groove, 0, 0, 0, false);
    ring.rotation.y = (i / (ribs / 2)) * Math.PI;
    ring.scale.set(1, 0.78, 1);
  }
  add(p, new THREE.CylinderGeometry(r * 0.1, r * 0.15, r * 0.3, 8), std('#5d7a2e', 0.9), 0, r * 0.78, 0);
  const stem = add(p, new THREE.CylinderGeometry(r * 0.08, r * 0.1, r * 0.26, 8), std('#5d7a2e', 0.9), r * 0.09, r * 0.98, 0);
  stem.rotation.z = -0.55;
  p.position.set(x, y + r * 0.78, z);
  g.add(p);
  return p;
}
/** The surface point of a pumpkin of radius r at (x, y): where things stuck on it should sit. */
const onPumpkin = (r: number, x: number, y: number) => Math.sqrt(Math.max(0.05, r * r - x * x - (y / 0.78) * (y / 0.78)));
/** A carved face on the +z side of a pumpkin: eyes, nose and a toothy grin that glow from inside. */
function carve(p: THREE.Group, r: number, m: THREE.Material): void {
  const at = (x: number, y: number) => onPumpkin(r, x, y) * 0.97;
  for (const sx of [-1, 1]) { const e = add(p, new THREE.ConeGeometry(r * 0.17, r * 0.2, 3), m, sx * r * 0.3, r * 0.16, at(sx * r * 0.3, r * 0.16), false); e.rotation.x = Math.PI / 2; e.rotation.z = Math.PI; e.scale.z = 0.5; }
  const n = add(p, new THREE.ConeGeometry(r * 0.09, r * 0.13, 3), m, 0, -r * 0.03, at(0, -r * 0.03), false); n.rotation.x = Math.PI / 2; n.scale.z = 0.5;
  const mouth = add(p, new THREE.TorusGeometry(r * 0.36, r * 0.07, 6, 16, Math.PI), m, 0, -r * 0.14, at(0, -r * 0.3), false); mouth.rotation.z = Math.PI; mouth.scale.z = 0.5;
  for (const tx of [-0.17, 0.12]) add(p, new THREE.BoxGeometry(r * 0.1, r * 0.1, r * 0.08), m, tx * r, -r * 0.2, at(tx * r, -r * 0.2), false);
}

// ---------- Halloween 2026 ----------
function jackOLantern(): THREE.Group {
  const g = new THREE.Group();
  // a ring of fallen leaves and a stone to sit on
  const leaf = new THREE.CircleGeometry(0.07, 6).rotateX(-Math.PI / 2);
  const r = GT.rng(7);
  for (let i = 0; i < 9; i++) add(g, leaf, std(['#e0792f', '#c9512a', '#f2b134'][i % 3], 0.95), (r() - 0.5) * 0.7, 0.012, (r() - 0.5) * 0.7, false).rotation.y = r() * 3;
  add(g, new THREE.CylinderGeometry(0.3, 0.33, 0.06, 18), std(PAL.stoneDark, 0.95), 0, 0.03, 0);
  const face = ownGlow('#ffd23f', '#ff9f1c', 1.6);
  const p = pumpkin(g, 0, 0.06, 0, 0.34);
  carve(p, 0.34, face);
  tick(g, flicker(face, 1.5, 0.45, 9));
  return g;
}
function cauldron(): THREE.Group {
  const g = new THREE.Group();
  const iron = std('#2a2d33', 0.55, 0.5);
  // logs and embers
  for (const a of [0, 1.05, 2.1]) { const l = add(g, new THREE.CylinderGeometry(0.03, 0.03, 0.42, 8), std(PAL.woodDark, 0.9), 0, 0.03, 0); l.rotation.z = Math.PI / 2; l.rotation.y = a; }
  const ember = ownGlow('#ff8c42', '#ff5d1a', 1.2);
  add(g, new THREE.IcosahedronGeometry(0.09, 1), ember, 0, 0.07, 0, false);
  // pot
  for (const a of [0.4, 2.5, 4.6]) add(g, new THREE.CylinderGeometry(0.025, 0.03, 0.22, 8), iron, Math.cos(a) * 0.17, 0.11, Math.sin(a) * 0.17);
  const pot = add(g, new THREE.SphereGeometry(0.27, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.62), iron, 0, 0.38, 0);
  pot.rotation.x = Math.PI;
  add(g, new THREE.TorusGeometry(0.25, 0.035, 8, 24), iron, 0, 0.45, 0);
  const brew = ownGlow('#8be04a', '#4ad12a', 1.1);
  add(g, new THREE.CylinderGeometry(0.235, 0.235, 0.02, 24), brew, 0, 0.45, 0, false);
  const bubbles = [0, 1, 2].map((i) => add(g, new THREE.SphereGeometry(0.03 + i * 0.01, 8, 6), brew, (i - 1) * 0.08, 0.47, (i % 2 ? 0.06 : -0.05), false));
  const handle = add(g, new THREE.TorusGeometry(0.27, 0.015, 6, 20, Math.PI), iron, 0, 0.47, 0); handle.rotation.y = Math.PI / 2;
  const emberT = flicker(ember, 1.1, 0.4, 7, 1);
  tick(g, (T, dt) => {
    emberT(T, dt);
    brew.emissiveIntensity = 1 + Math.sin(T * 3) * 0.25;
    bubbles.forEach((b, i) => { const k = (T * (0.7 + i * 0.2) + i) % 1; b.position.y = 0.46 + k * 0.1; b.scale.setScalar(k < 0.85 ? 0.6 + k * 0.6 : (1 - k) * 8); });
  });
  return g;
}
function ghostTree(): THREE.Group {
  const g = new THREE.Group();
  const bark = std('#4a3a30', 0.95);
  add(g, new THREE.CylinderGeometry(0.07, 0.11, 0.7, 9), bark, 0, 0.35, 0);
  for (const [a, tilt, h] of [[0.4, 0.9, 0.42], [2.4, 0.8, 0.36], [4.3, 1.0, 0.3], [1.5, 0.5, 0.26]] as const) {
    const b = add(g, new THREE.CylinderGeometry(0.02, 0.045, h, 7), bark, Math.cos(a) * 0.12, 0.62 + (h / 2) * 0.6, Math.sin(a) * 0.12);
    b.rotation.set(Math.sin(a) * tilt, 0, -Math.cos(a) * tilt);
  }
  // the shy ghost
  const ghost = new THREE.Group();
  const sheet = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#dfe8ff', emissiveIntensity: 0.25, roughness: 0.5, transparent: true, opacity: 0.88 });
  add(ghost, new THREE.SphereGeometry(0.11, 14, 10), sheet, 0, 0.1, 0, false);
  const body = add(ghost, new THREE.ConeGeometry(0.11, 0.2, 14, 1, true), sheet, 0, 0, 0, false); body.rotation.x = Math.PI;
  for (const sx of [-1, 1]) add(ghost, new THREE.SphereGeometry(0.018, 6, 6), std('#2a2230', 0.6), sx * 0.04, 0.12, 0.095, false);
  add(ghost, new THREE.SphereGeometry(0.014, 6, 6), std('#2a2230', 0.6), 0, 0.07, 0.105, false);
  ghost.position.set(0.28, 0.55, 0.12);
  g.add(ghost);
  tick(g, (T) => { ghost.position.y = 0.55 + Math.sin(T * 1.6) * 0.06; ghost.rotation.y = Math.sin(T * 0.8) * 0.5; ghost.rotation.z = Math.sin(T * 1.1) * 0.08; });
  return g;
}
function spookyFountain(): THREE.Group {
  const g = new THREE.Group();
  const stone = textured('sfstone', T.stoneBlocks(), [3, 1], 0.9, '#8f8699');
  add(g, new THREE.CylinderGeometry(0.85, 0.9, 0.3, 36), stone, 0, 0.15, 0);
  const water = ownGlow('#58e06a', '#2fb84a', 0.9);
  add(g, new THREE.CylinderGeometry(0.76, 0.76, 0.02, 36), water, 0, 0.27, 0, false).name = 'water';
  add(g, new THREE.CylinderGeometry(0.1, 0.16, 0.6, 16), stone, 0, 0.55, 0);
  add(g, new THREE.CylinderGeometry(0.34, 0.22, 0.1, 24), stone, 0, 0.88, 0);
  const skull = add(g, new THREE.SphereGeometry(0.11, 14, 10), std('#f3eee4', 0.6), 0, 1.0, 0);
  for (const sx of [-1, 1]) add(g, new THREE.SphereGeometry(0.025, 6, 6), std('#1d1a22', 0.8), sx * 0.04, 1.02, 0.1, false);
  skull.scale.set(1, 0.9, 0.95);
  // bats perched on the rim
  const wing = new THREE.CircleGeometry(0.07, 8, 0, Math.PI).scale(1, 0.6, 1);
  const bats: THREE.Group[] = [];
  for (const a of [0.6, 2.2, 3.9, 5.3]) {
    const b = new THREE.Group();
    add(b, new THREE.CapsuleGeometry(0.02, 0.05, 2, 6), std('#262330', 0.7), 0, 0, 0, false);
    for (const sx of [-1, 1]) { const w = add(b, wing, std('#262330', 0.7), sx * 0.02, 0.01, 0, false); w.rotation.y = sx * 0.6; w.name = 'w' + (sx > 0 ? 'r' : 'l'); }
    b.position.set(Math.cos(a) * 0.86, 0.35, Math.sin(a) * 0.86);
    b.rotation.y = -a;
    g.add(b); bats.push(b);
  }
  tick(g, (T) => {
    water.emissiveIntensity = 0.8 + Math.sin(T * 2.2) * 0.3;
    bats.forEach((b, i) => { const f = Math.abs(Math.sin(T * 6 + i)) * 0.9; (b.getObjectByName('wl') as THREE.Mesh).rotation.y = -0.4 - f; (b.getObjectByName('wr') as THREE.Mesh).rotation.y = 0.4 + f; });
  });
  return g;
}
function pumpkinCarriage(): THREE.Group {
  const g = new THREE.Group();
  const body = pumpkin(g, 0.05, 0.36, 0, 0.42, '#ff9a3c', 10);
  // door and window outlined in gold, on the +z side
  add(body, new THREE.TorusGeometry(0.14, 0.014, 6, 18), gold(), 0.05, 0.02, 0.4, false);
  add(body, new THREE.CircleGeometry(0.125, 18), warmGlass(), 0.05, 0.02, 0.4, false);
  add(body, new THREE.TorusGeometry(0.08, 0.01, 6, 14), gold(), -0.26, 0.08, 0.33, false).rotation.y = -0.6;
  // chassis, steps and four golden wheels with spokes
  add(g, rbox(1.3, 0.05, 0.5, 0.02), std(PAL.woodDark, 0.8), 0.05, 0.34, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const w = new THREE.Group();
    add(w, new THREE.TorusGeometry(sz > 0 ? 0.2 : 0.16, 0.025, 8, 24), gold(), 0, 0, 0);
    for (let i = 0; i < 6; i++) { const sp = add(w, new THREE.BoxGeometry(0.012, (sz > 0 ? 0.2 : 0.16) * 2 - 0.02, 0.012), gold(), 0, 0, 0, false); sp.rotation.z = (i / 6) * Math.PI; }
    w.rotation.y = Math.PI / 2;
    w.position.set(sx * 0.45, sz > 0 ? 0.2 : 0.16, sz * 0.3);
    g.add(w);
  }
  add(g, rbox(0.2, 0.04, 0.16, 0.01), std(PAL.woodDark, 0.8), 0.05, 0.15, 0.36);
  const lamp = ownGlow('#fff1c2', '#ffcc66', 1);
  for (const sx of [-1, 1]) { add(g, new THREE.BoxGeometry(0.02, 0.1, 0.02), gold(), sx * 0.52, 0.56, 0.22, false); add(g, new THREE.CylinderGeometry(0.035, 0.03, 0.08, 8), lamp, sx * 0.52, 0.64, 0.22, false); }
  tick(g, flicker(lamp, 1, 0.3, 8, 2));
  return g;
}
function pumpkinHouse(): THREE.Group {
  const g = new THREE.Group();
  plinth(g, 1.9, 1.9, 0.12);
  const house = pumpkin(g, 0, 0.1, 0, 0.92, '#f28c28', 10);
  house.position.y = 0.1 + 0.92 * 0.72;
  // windows that glow at odd angles, a round door and a crooked stem chimney
  const win = ownGlow('#ffe08a', '#ffb347', 1.2);
  const R = 0.92;
  for (const [x, y, rz] of [[-0.42, 0.1, -0.2], [0.4, 0.22, 0.25], [-0.05, 0.42, 0.1]] as const) {
    const z = onPumpkin(R, x, y);
    const look = new THREE.Vector3(x, y / 0.78, z).normalize();
    const w = add(house, new THREE.CircleGeometry(0.11, 16), win, x, y, z, false);
    w.lookAt(w.position.clone().add(look)); w.rotation.z += rz;
    const f = add(house, new THREE.TorusGeometry(0.115, 0.018, 6, 16), std('#5d4a3a', 0.8), x, y, z, false);
    f.lookAt(f.position.clone().add(look)); f.position.addScaledVector(look, 0.01);
  }
  const door = new THREE.Group();
  add(door, new THREE.CylinderGeometry(0.17, 0.17, 0.04, 20, 1, false, -Math.PI / 2, Math.PI).rotateX(Math.PI / 2), textured('hwdoor', T.planks('#5d4a3a'), [1, 1], 0.7), 0, 0.2, 0);
  add(door, new THREE.BoxGeometry(0.34, 0.22, 0.04), textured('hwdoor', T.planks('#5d4a3a'), [1, 1], 0.7), 0, 0.09, 0);
  add(door, new THREE.SphereGeometry(0.02, 8, 6), gold(), 0.1, 0.14, 0.03, false);
  door.position.set(-0.05, 0.12, 0.86);
  g.add(door);
  g.userData.door = new THREE.Vector3(-0.05, 0, 0.92);
  add(g, rbox(0.3, 0.05, 0.22, 0.02), std(PAL.stoneDark, 0.9), -0.05, 0.14, 0.95);
  picket(g, -0.9, -0.4, 0.92, 0.14, '#6b5a4a'); picket(g, 0.3, 0.9, 0.92, 0.14, '#6b5a4a');
  const pal = GT.rng(5);
  for (let i = 0; i < 4; i++) pumpkin(g, -0.75 + i * 0.5 + (pal() - 0.5) * 0.1, 0.12, 0.72, 0.09 + pal() * 0.04);
  tick(g, flicker(win, 1.2, 0.25, 5, 1.3));
  return g;
}

// ---------- Thanksgiving 2026 ----------
function hayStack(): THREE.Group {
  const g = new THREE.Group();
  const bale = (x: number, y: number, z: number, ry: number) => { const b = add(g, new THREE.CylinderGeometry(0.17, 0.17, 0.42, 16), hay(), x, y, z); b.rotation.set(0, ry, Math.PI / 2); };
  bale(-0.18, 0.17, 0.1, 0); bale(0.18, 0.17, 0.1, 0); bale(0, 0.17, -0.22, Math.PI / 2); bale(0, 0.48, 0, 0.3);
  pumpkin(g, 0.12, 0.6, 0.12, 0.12); pumpkin(g, -0.3, 0, 0.32, 0.1, '#f2b134');
  return g;
}
function scarecrow(): THREE.Group {
  const g = new THREE.Group();
  add(g, new THREE.CylinderGeometry(0.03, 0.035, 0.9, 8), std(PAL.woodDark, 0.9), 0, 0.45, 0);
  const arms = add(g, new THREE.CylinderGeometry(0.02, 0.02, 0.7, 8), std(PAL.woodDark, 0.9), 0, 0.72, 0); arms.rotation.z = Math.PI / 2;
  add(g, rbox(0.3, 0.34, 0.2, 0.06), mat('plaid', () => new THREE.MeshStandardMaterial({ map: T.stripes('#d94f3d', '#f0b35c', 6), roughness: 0.9 })), 0, 0.62, 0);
  add(g, rbox(0.26, 0.2, 0.18, 0.05), std('#5b7fb3', 0.85), 0, 0.37, 0);
  for (const sx of [-1, 1]) { add(g, new THREE.CylinderGeometry(0.03, 0.05, 0.12, 8), hay(), sx * 0.38, 0.72, 0).rotation.z = Math.PI / 2; add(g, new THREE.CylinderGeometry(0.03, 0.04, 0.1, 8), hay(), sx * 0.08, 0.24, 0); }
  add(g, new THREE.SphereGeometry(0.13, 14, 10), std('#e3c58e', 0.95), 0, 0.93, 0);
  for (const sx of [-1, 1]) add(g, new THREE.SphereGeometry(0.02, 6, 6), std('#2a2220', 0.7), sx * 0.05, 0.95, 0.11, false);
  add(g, new THREE.TorusGeometry(0.04, 0.01, 6, 10, Math.PI), std('#b5533a', 0.6), 0, 0.9, 0.12, false).rotation.z = Math.PI;
  add(g, new THREE.CylinderGeometry(0.19, 0.19, 0.02, 16), std('#8a5a34', 0.9), 0, 1.05, 0);
  add(g, new THREE.CylinderGeometry(0.1, 0.12, 0.14, 12), std('#8a5a34', 0.9), 0, 1.12, 0);
  add(g, new THREE.TorusGeometry(0.11, 0.015, 6, 14), std(PAL.raspberry, 0.6), 0, 1.07, 0, false);
  // a little crow who isn't scared at all
  add(g, new THREE.SphereGeometry(0.045, 10, 8), std('#262330', 0.6), 0.3, 0.77, 0, false);
  add(g, new THREE.ConeGeometry(0.012, 0.03, 6), std('#f2b134', 0.6), 0.33, 0.77, 0.03, false).rotation.x = Math.PI / 2;
  tick(g, (T) => { arms.rotation.y = Math.sin(T * 1.3) * 0.08; });
  return g;
}
function cornucopia(): THREE.Group {
  const g = new THREE.Group();
  add(g, rbox(0.86, 0.05, 0.6, 0.02), textured('tgboard', T.planks(PAL.wood), [1, 0.5], 0.8), 0, 0.025, 0);
  const wicker = mat('wicker', () => new THREE.MeshStandardMaterial({ map: T.stripes('#b8864a', '#9a6a36', 10), roughness: 0.95 }));
  const horn = add(g, new THREE.ConeGeometry(0.2, 0.55, 18, 1, true), wicker, -0.12, 0.2, -0.05);
  horn.rotation.z = Math.PI / 2 + 0.25; horn.rotation.y = 0.3;
  (horn.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
  add(g, new THREE.TorusGeometry(0.19, 0.03, 8, 20), wicker, 0.12, 0.22, -0.02).rotation.y = Math.PI / 2 - 0.25;
  pumpkin(g, 0.26, 0.05, 0.1, 0.1); pumpkin(g, 0.1, 0.05, 0.22, 0.07, '#f2b134');
  for (const [x, z, c] of [[0.3, -0.12, '#e03131'], [0.36, 0.2, '#e03131'], [0.18, 0.1, '#7ac142']] as const) add(g, new THREE.SphereGeometry(0.055, 10, 8), std(c, 0.5), x, 0.1, z);
  for (let i = 0; i < 5; i++) add(g, new THREE.SphereGeometry(0.03, 8, 6), std('#7b4ea3', 0.5), 0.02 + (i % 3) * 0.04, 0.08 + (i > 2 ? 0.04 : 0), 0.02 - Math.floor(i / 3) * 0.04, false);
  add(g, new THREE.CapsuleGeometry(0.03, 0.12, 4, 10), std('#f7d04b', 0.6), 0.22, 0.09, -0.2).rotation.z = Math.PI / 2;
  return g;
}
function marketStall(): THREE.Group {
  const g = new THREE.Group();
  plinth(g, 1.9, 0.9, 0.08);
  const wood = textured('stallwood', T.planks(PAL.wood), [2, 1], 0.8);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(g, new THREE.BoxGeometry(0.06, 1.0, 0.06), std(PAL.woodDark, 0.85), sx * 0.88, 0.58, sz * 0.38);
  add(g, rbox(1.84, 0.4, 0.5, 0.03), wood, 0, 0.28, 0.1);
  add(g, rbox(1.9, 0.05, 0.6, 0.02), std(PAL.trim, 0.7), 0, 0.5, 0.1);
  const awning = add(g, rbox(2.0, 0.05, 1.0, 0.02), mat('tgawning', () => new THREE.MeshStandardMaterial({ map: T.stripes('#e45a78', '#fff4e3', 8), roughness: 0.85 })), 0, 1.12, 0);
  awning.rotation.x = 0.18;
  for (let i = 0; i < 9; i++) add(g, new THREE.ConeGeometry(0.06, 0.1, 4), std(i % 2 ? PAL.raspberry : PAL.trim, 0.8), -0.96 + i * 0.24, 1.02, 0.5, false).rotation.x = Math.PI;
  // pies, apples and a cider jug on the counter
  for (let i = 0; i < 3; i++) { add(g, new THREE.CylinderGeometry(0.11, 0.1, 0.05, 14), std('#c98b55', 0.8), -0.55 + i * 0.3, 0.55, 0.15); add(g, new THREE.TorusGeometry(0.1, 0.02, 6, 14), std('#e2b96a', 0.8), -0.55 + i * 0.3, 0.58, 0.15, false).rotation.x = Math.PI / 2; }
  add(g, rbox(0.3, 0.12, 0.22, 0.02), std(PAL.woodDark, 0.9), 0.5, 0.57, 0.14);
  for (let i = 0; i < 6; i++) add(g, new THREE.SphereGeometry(0.04, 8, 6), std(i % 2 ? '#e03131' : '#7ac142', 0.5), 0.4 + (i % 3) * 0.1, 0.65 + (i > 2 ? 0.05 : 0), 0.1 + (i > 2 ? 0.05 : 0), false);
  add(g, new THREE.CylinderGeometry(0.06, 0.08, 0.2, 12), std('#b07745', 0.7), 0.78, 0.62, 0.18);
  add(g, new THREE.CylinderGeometry(0.03, 0.04, 0.06, 8), std('#b07745', 0.7), 0.78, 0.75, 0.18, false);
  pumpkin(g, -0.75, 0.08, 0.6, 0.12); pumpkin(g, 0.72, 0.08, 0.58, 0.1, '#f2b134');
  return g;
}

// ---------- Hanukkah 2026 ----------
function hanukkahLantern(): THREE.Group {
  const g = new THREE.Group();
  const silver = std('#d9dde6', 0.35, 0.8);
  add(g, new THREE.CylinderGeometry(0.1, 0.13, 0.06, 12), silver, 0, 0.03, 0);
  add(g, new THREE.CylinderGeometry(0.025, 0.03, 0.78, 10), silver, 0, 0.45, 0);
  const glass = ownGlow('#eaf3ff', '#8fc1ff', 1);
  add(g, new THREE.CylinderGeometry(0.11, 0.09, 0.22, 6), glass, 0, 0.95, 0, false);
  add(g, new THREE.CylinderGeometry(0.12, 0.12, 0.03, 6), silver, 0, 0.83, 0);
  add(g, new THREE.ConeGeometry(0.14, 0.1, 6), silver, 0, 1.11, 0);
  add(g, new THREE.TorusGeometry(0.03, 0.008, 6, 10), silver, 0, 1.19, 0);
  for (const rot of [Math.PI / 2, -Math.PI / 2]) {
    const tri = new THREE.Shape(); for (let i = 0; i < 3; i++) { const a = rot + (i / 3) * Math.PI * 2; i ? tri.lineTo(Math.cos(a) * 0.045, Math.sin(a) * 0.045) : tri.moveTo(Math.cos(a) * 0.045, Math.sin(a) * 0.045); }
    add(g, new THREE.ExtrudeGeometry(tri, { depth: 0.01, bevelEnabled: false }), std('#2b5bb3', 0.5), 0, 0.95, 0.105, false);
  }
  tick(g, flicker(glass, 1, 0.2, 2.5, 0.5));
  return g;
}
function dreidel(): THREE.Group {
  const g = new THREE.Group();
  add(g, new THREE.CylinderGeometry(0.25, 0.28, 0.05, 20), textured('drbase', T.planks(PAL.wood), [1, 1], 0.8), 0, 0.025, 0);
  const d = new THREE.Group();
  const wood = textured('dreidel', T.planks('#c98b55'), [1, 1], 0.7);
  add(d, rbox(0.3, 0.3, 0.3, 0.03), wood, 0, 0.33, 0);
  add(d, new THREE.ConeGeometry(0.21, 0.18, 4).rotateY(Math.PI / 4), wood, 0, 0.09, 0).rotation.x = Math.PI;
  add(d, new THREE.CylinderGeometry(0.035, 0.045, 0.16, 10), wood, 0, 0.56, 0);
  add(d, new THREE.SphereGeometry(0.045, 10, 8), wood, 0, 0.65, 0);
  // the four letters, painted on each face
  ['נ', 'ג', 'ה', 'ש'].forEach((ch, i) => {
    const m = mat('dr' + ch, () => new THREE.MeshStandardMaterial({ map: T.letter(ch, '#fff4e3', '#1f3f8f'), roughness: 0.7 }));
    const face = add(d, new THREE.PlaneGeometry(0.22, 0.22), m, 0, 0.33, 0.152, false);
    face.rotation.y = 0;
    const holder = new THREE.Group(); holder.rotation.y = (i / 4) * Math.PI * 2; holder.add(face); d.add(holder);
  });
  d.position.y = 0.05;
  g.add(d);
  tick(g, (T, dt) => { d.rotation.y += dt * 1.6; d.rotation.z = Math.sin(T * 1.6) * 0.06; d.rotation.x = Math.cos(T * 1.6) * 0.06; });
  return g;
}
function hanukkiah(): THREE.Group {
  const g = new THREE.Group();
  plinth(g, 1.9, 0.9, 0.1);
  const silver = std('#d9dde6', 0.35, 0.8);
  add(g, rbox(0.9, 0.08, 0.5, 0.03), silver, 0, 0.14, 0);
  add(g, new THREE.CylinderGeometry(0.05, 0.08, 0.5, 12), silver, 0, 0.43, 0);
  add(g, rbox(1.72, 0.06, 0.08, 0.02), silver, 0, 0.7, 0);
  const flames: THREE.MeshStandardMaterial[] = [];
  const candle = (x: number, y: number, h: number, c: string) => {
    add(g, new THREE.CylinderGeometry(0.03, 0.035, y - 0.7, 10), silver, x, 0.7 + (y - 0.7) / 2, 0);
    add(g, new THREE.CylinderGeometry(0.05, 0.05, 0.04, 12), gold(), x, y, 0);
    add(g, new THREE.CylinderGeometry(0.028, 0.03, h, 10), std(c, 0.6), x, y + h / 2 + 0.02, 0);
    const f = ownGlow('#ffe08a', '#ff9f1c', 1.5);
    add(g, new THREE.ConeGeometry(0.03, 0.09, 8), f, x, y + h + 0.08, 0, false);
    flames.push(f);
  };
  for (let i = 0; i < 8; i++) candle(-0.77 + i * 0.22 + (i >= 4 ? 0.22 : 0), 0.78, 0.26, i % 2 ? '#ffffff' : '#9fc4ff');
  candle(0.11, 0.98, 0.26, '#ffffff'); // the shamash, raised in the middle
  tick(g, (T) => flames.forEach((f, i) => { f.emissiveIntensity = 1.4 + Math.sin(T * 9 + i * 1.7) * 0.35; }));
  return g;
}

// ---------- Christmas 2026 ----------
function snowman(): THREE.Group {
  const g = new THREE.Group();
  const snow = std('#ffffff', 0.9);
  add(g, new THREE.CylinderGeometry(0.34, 0.36, 0.05, 20), std('#eef4ff', 0.95), 0, 0.025, 0);
  add(g, new THREE.SphereGeometry(0.26, 18, 14), snow, 0, 0.28, 0);
  add(g, new THREE.SphereGeometry(0.2, 18, 14), snow, 0, 0.62, 0);
  add(g, new THREE.SphereGeometry(0.15, 18, 14), snow, 0, 0.9, 0);
  const coal = std('#2a2220', 0.7);
  for (const y of [0.56, 0.64, 0.72]) add(g, new THREE.SphereGeometry(0.02, 6, 6), coal, 0, y, 0.19, false);
  for (const sx of [-1, 1]) add(g, new THREE.SphereGeometry(0.02, 6, 6), coal, sx * 0.05, 0.93, 0.13, false);
  add(g, new THREE.ConeGeometry(0.025, 0.14, 8), std('#ff8c42', 0.6), 0, 0.88, 0.2, false).rotation.x = Math.PI / 2;
  for (const sx of [-1, 1]) { const a = add(g, new THREE.CylinderGeometry(0.012, 0.016, 0.3, 6), std(PAL.woodDark, 0.9), sx * 0.3, 0.68, 0); a.rotation.z = sx * 1.1; }
  add(g, new THREE.TorusGeometry(0.15, 0.04, 8, 20), std(PAL.raspberry, 0.7), 0, 0.77, 0);
  add(g, rbox(0.08, 0.2, 0.05, 0.02), std(PAL.raspberry, 0.7), 0.12, 0.66, 0.1);
  add(g, new THREE.CylinderGeometry(0.17, 0.17, 0.02, 16), coal, 0, 1.02, 0);
  add(g, new THREE.CylinderGeometry(0.11, 0.11, 0.16, 16), coal, 0, 1.1, 0);
  add(g, new THREE.TorusGeometry(0.11, 0.012, 6, 16), std(PAL.raspberry, 0.6), 0, 1.05, 0, false);
  return g;
}
function candyLamp(): THREE.Group {
  const g = new THREE.Group();
  const stripes = mat('candy', () => new THREE.MeshStandardMaterial({ map: T.stripes('#e03131', '#ffffff', 10), roughness: 0.5 }));
  add(g, new THREE.CylinderGeometry(0.1, 0.13, 0.05, 12), std('#3b3a40', 0.5, 0.6), 0, 0.025, 0);
  add(g, new THREE.CylinderGeometry(0.03, 0.035, 0.8, 12), stripes, 0, 0.45, 0);
  const hook = add(g, new THREE.TorusGeometry(0.1, 0.03, 8, 16, Math.PI), stripes, 0.1, 0.85, 0); hook.rotation.z = 0;
  const glass = ownGlow('#fff1c2', '#ffcc66', 1);
  add(g, new THREE.CylinderGeometry(0.06, 0.05, 0.12, 8), glass, 0.2, 0.74, 0, false);
  add(g, new THREE.ConeGeometry(0.08, 0.06, 8), std('#3b3a40', 0.5, 0.6), 0.2, 0.83, 0);
  add(g, new THREE.TorusGeometry(0.05, 0.015, 6, 12), std('#2f9e44', 0.6), 0.2, 0.69, 0, false);
  g.userData.light = new THREE.Vector3(0.2, 0.74, 0);
  tick(g, flicker(glass, 1, 0.15, 6, 0.7));
  return g;
}
function giftPile(): THREE.Group {
  const g = new THREE.Group();
  const box = (x: number, y: number, z: number, w: number, h: number, c: string, rib: string, ry = 0) => {
    const b = new THREE.Group();
    add(b, rbox(w, h, w, 0.03), std(c, 0.7), 0, h / 2, 0);
    add(b, new THREE.BoxGeometry(w * 0.16, h + 0.01, w + 0.01), std(rib, 0.5), 0, h / 2, 0);
    add(b, new THREE.BoxGeometry(w + 0.01, h + 0.01, w * 0.16), std(rib, 0.5), 0, h / 2, 0);
    for (const s of [-1, 1]) add(b, new THREE.TorusGeometry(w * 0.12, w * 0.035, 6, 12), std(rib, 0.5), s * w * 0.1, h + w * 0.08, 0, false).rotation.y = s * 0.9;
    b.position.set(x, y, z); b.rotation.y = ry; g.add(b);
  };
  box(-0.15, 0, -0.05, 0.4, 0.3, PAL.sky, '#fff4e3');
  box(0.24, 0, 0.12, 0.28, 0.22, PAL.raspberry, '#ffd43b', 0.4);
  box(-0.12, 0.3, -0.04, 0.24, 0.18, PAL.teal, '#fff4e3', -0.3);
  box(0.1, 0, -0.3, 0.18, 0.16, '#ffd43b', PAL.raspberry, 0.2);
  return g;
}
function holidayTree(): THREE.Group {
  const g = new THREE.Group();
  add(g, new THREE.CylinderGeometry(0.6, 0.65, 0.1, 24), textured('xmpot', T.planks(PAL.wood), [2, 0.5], 0.8), 0, 0.05, 0);
  add(g, new THREE.CylinderGeometry(0.1, 0.13, 0.3, 10), std(PAL.woodDark, 0.9), 0, 0.2, 0);
  const fir = std('#2f8f4e', 0.85);
  const tiers: [number, number, number][] = [[0.3, 0.85, 0.75], [0.85, 0.65, 0.65], [1.3, 0.47, 0.55], [1.68, 0.3, 0.42]];
  for (const [y, r, h] of tiers) add(g, new THREE.ConeGeometry(r, h, 14), fir, 0, y + h / 2, 0);
  add(g, new THREE.TorusGeometry(0.03, 0.012, 6, 10), gold(), 0, 2.1, 0, false);
  const star = new THREE.Shape(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i / 10) * Math.PI * 2, rr = i % 2 ? 0.07 : 0.16; i ? star.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : star.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  add(g, new THREE.ExtrudeGeometry(star, { depth: 0.04, bevelEnabled: false }).translate(0, 0, -0.02), gold(), 0, 2.26, 0);
  // garland of lights, spiralling down
  const lights: THREE.MeshStandardMaterial[] = [];
  const cols = ['#ff4d6d', '#ffd43b', '#4dabf7', '#69db7c', '#ff922b', '#ffffff'];
  for (let i = 0; i < 26; i++) {
    const k = i / 26, a = k * Math.PI * 7, y = 2.0 - k * 1.65;
    const tier = tiers.find(([ty, , h]) => y >= ty && y <= ty + h) ?? tiers[0];
    const r = tier[1] * (1 - (y - tier[0]) / tier[2]) + 0.03;
    const m = ownGlow(cols[i % cols.length], cols[i % cols.length], 1);
    add(g, new THREE.SphereGeometry(0.035, 8, 6), m, Math.cos(a) * r, y, Math.sin(a) * r, false);
    lights.push(m);
  }
  tick(g, (T) => lights.forEach((m, i) => { m.emissiveIntensity = 0.6 + Math.max(0, Math.sin(T * 2.4 + i * 0.9)) * 1.2; }));
  return g;
}
function gingerbreadHouse(): THREE.Group {
  const g = new THREE.Group();
  plinth(g, 1.9, 1.9, 0.12);
  const ginger = textured('ginger', T.plaster('#b5733a'), [2, 1], 0.9);
  add(g, rbox(1.5, 0.78, 1.3, 0.05), ginger, 0, 0.12 + 0.39, 0);
  gableRoof(g, 1.5, 1.3, 0.9, 0.55, '#fff6ea', 0.16, '#b5733a');
  // icing scallops along the eaves and candy buttons on the walls
  for (const s of [-1, 1]) for (let i = 0; i < 8; i++) add(g, new THREE.SphereGeometry(0.075, 10, 8), std('#ffffff', 0.6), -0.74 + i * 0.21, 0.86, s * 0.8, false);
  const candy = ['#e03131', '#ffd43b', '#4dabf7', '#69db7c', '#ff922b'];
  for (let i = 0; i < 10; i++) add(g, new THREE.SphereGeometry(0.05, 10, 8), std(candy[i % 5], 0.45), -0.6 + (i % 5) * 0.3, 0.42 + Math.floor(i / 5) * 0.32, 0.66, false);
  for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) add(g, new THREE.SphereGeometry(0.05, 10, 8), std(candy[(i + sx + 3) % 5], 0.45), sx * 0.76, 0.35 + i * 0.22, -0.3 + i * 0.3, false);
  windowOn(g, -0.4, 0.55, 0.66, 0.26, 0.28); windowOn(g, 0.42, 0.55, 0.66, 0.26, 0.28);
  // peppermint door with a candy-cane frame
  const mint = mat('mintdoor', () => new THREE.MeshStandardMaterial({ map: T.stripes('#e03131', '#ffffff', 12), roughness: 0.5 }));
  add(g, new THREE.CylinderGeometry(0.17, 0.17, 0.05, 20).rotateX(Math.PI / 2), mint, 0, 0.3, 0.67);
  add(g, new THREE.BoxGeometry(0.34, 0.2, 0.05), mint, 0, 0.22, 0.67);
  g.userData.door = new THREE.Vector3(0, 0, 0.72);
  const cane = mat('cane', () => new THREE.MeshStandardMaterial({ map: T.stripes('#e03131', '#ffffff', 8), roughness: 0.5 }));
  for (const sx of [-1, 1]) { add(g, new THREE.CylinderGeometry(0.03, 0.03, 0.5, 10), cane, sx * 0.3, 0.37, 0.72); add(g, new THREE.TorusGeometry(0.06, 0.03, 8, 14, Math.PI), cane, sx * 0.3 - sx * 0.06, 0.62, 0.72).rotation.y = sx > 0 ? Math.PI : 0; }
  add(g, rbox(0.4, 0.05, 0.24, 0.02), std('#ffffff', 0.7), 0, 0.14, 0.78);
  // snow on the ridge and a gumdrop chimney
  add(g, rbox(0.22, 0.26, 0.22, 0.04), std('#69db7c', 0.6), 0.45, 1.5, -0.2);
  add(g, new THREE.SphereGeometry(0.13, 10, 8), std('#ffffff', 0.7), 0.45, 1.64, -0.2);
  g.userData.chimney = new THREE.Vector3(0.45, 1.72, -0.2);
  return g;
}
function iceFountain(): THREE.Group {
  const g = new THREE.Group();
  const ice = mat('ice', () => new THREE.MeshPhysicalMaterial({ color: 0xbfe7ff, roughness: 0.12, clearcoat: 1, transparent: true, opacity: 0.86, emissive: 0x9fd4ff, emissiveIntensity: 0.12 }));
  const snow = std('#ffffff', 0.9);
  add(g, new THREE.CylinderGeometry(0.85, 0.9, 0.3, 36), ice, 0, 0.15, 0);
  add(g, new THREE.TorusGeometry(0.86, 0.06, 8, 36), snow, 0, 0.3, 0);
  add(g, new THREE.CylinderGeometry(0.76, 0.76, 0.02, 36), mat('icewater', () => new THREE.MeshPhysicalMaterial({ color: 0xdff4ff, roughness: 0.05, clearcoat: 1, envMapIntensity: 1.6 })), 0, 0.27, 0, false);
  add(g, new THREE.CylinderGeometry(0.1, 0.16, 0.6, 16), ice, 0, 0.55, 0);
  add(g, new THREE.CylinderGeometry(0.34, 0.22, 0.1, 24), ice, 0, 0.88, 0);
  // the splash, frozen mid-air
  for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; const s = add(g, new THREE.ConeGeometry(0.05, 0.3, 6), ice, Math.cos(a) * 0.14, 1.05, Math.sin(a) * 0.14); s.rotation.set(Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6); }
  add(g, new THREE.IcosahedronGeometry(0.12, 1), ice, 0, 1.12, 0);
  const sparkles = [0, 1, 2, 3].map((i) => add(g, new THREE.OctahedronGeometry(0.03, 0), ownGlow('#ffffff', '#dff4ff', 1.5), Math.cos(i * 1.6) * 0.5, 0.5 + i * 0.15, Math.sin(i * 1.6) * 0.5, false));
  tick(g, (T) => sparkles.forEach((s, i) => { s.rotation.y = T * 2 + i; s.scale.setScalar(0.6 + Math.max(0, Math.sin(T * 3 + i * 1.3)) * 0.8); }));
  return g;
}

/** The model for a seasonal collectible, or null for an id that isn't one. */
export function seasonalModel(id: string): THREE.Group | null {
  switch (id) {
    case 'hw26-jack': return jackOLantern();
    case 'hw26-cauldron': return cauldron();
    case 'hw26-ghosttree': return ghostTree();
    case 'hw26-fountain': return spookyFountain();
    case 'hw26-carriage': return pumpkinCarriage();
    case 'hw26-house': return pumpkinHouse();
    case 'tg26-hay': return hayStack();
    case 'tg26-scarecrow': return scarecrow();
    case 'tg26-cornucopia': return cornucopia();
    case 'tg26-stall': return marketStall();
    case 'hk26-lantern': return hanukkahLantern();
    case 'hk26-dreidel': return dreidel();
    case 'hk26-hanukkiah': return hanukkiah();
    case 'xm26-snowman': return snowman();
    case 'xm26-candylamp': return candyLamp();
    case 'xm26-gifts': return giftPile();
    case 'xm26-tree': return holidayTree();
    case 'xm26-gingerbread': return gingerbreadHouse();
    case 'xm26-icefountain': return iceFountain();
    default: return null;
  }
}
