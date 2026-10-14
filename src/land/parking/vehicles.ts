/**
 * Fuzzies Parking Escape — the VEHICLES: glossy toy cars, taxis, jeeps, sports cars, open-top tour buses, flatbed trucks, fire
 * engines and ice-cream vans, each with the owner's Fuzzies at the wheel (and in the bus seats). Built from rounded boxes in code
 * (no model files), sharing geometry and materials; every vehicle is built along +x (front = +x) one cell = one unit long and is
 * turned into place by the scene. The drivers are the owner's own art (public/art/drivers, cut from their Fuzzies sheet) shown as
 * sprites, so they always face you from their seats.
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

export type VehicleKind = 'hero' | 'hero2' | 'car' | 'taxi' | 'jeep' | 'sport' | 'bus' | 'truck' | 'fire' | 'icecream';
export const SHORT_KINDS: VehicleKind[] = ['car', 'taxi', 'jeep', 'sport', 'car', 'jeep'];
export const LONG_KINDS: VehicleKind[] = ['bus', 'truck', 'fire', 'icecream', 'truck', 'bus'];
/** body colours for ordinary cars (never the hero's raspberry) */
export const PAINTS = ['#2fb7b0', '#3d8bfd', '#ff8a3d', '#7cc84a', '#b18cf0', '#e8483f', '#f4f1ea', '#2c4f8a', '#20c997', '#ffb3c7', '#5bc0eb', '#9a6b4f'];
export const HERO = '#d6336c', HERO2 = '#14b8a6';

/** the 15 Fuzzies from the owner's sheet: d01 pink … d15 rainbow */
export const DRIVERS = 15;
export const driverUrl = (n: number): string => `${import.meta.env.BASE_URL ?? '/'}art/drivers/d${String(((n % DRIVERS) + DRIVERS) % DRIVERS + 1).padStart(2, '0')}.webp`;
const driverTex = new Map<number, THREE.Texture>();
export function driverTexture(n: number): THREE.Texture {
  const k = ((n % DRIVERS) + DRIVERS) % DRIVERS;
  let t = driverTex.get(k);
  if (!t) { t = new THREE.TextureLoader().load(driverUrl(k)); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; driverTex.set(k, t); }
  return t;
}
/** start loading every driver picture (call once when the game opens) */
export const preloadDrivers = (): Promise<void> => Promise.all(Array.from({ length: DRIVERS }, (_, n) => new Promise<void>((res) => { const t = driverTexture(n); if (t.image) res(); else { const img = new Image(); img.onload = img.onerror = () => res(); img.src = driverUrl(n); } }))).then(() => undefined);

const geoCache = new Map<string, THREE.BufferGeometry>();
const geo = (k: string, make: () => THREE.BufferGeometry) => { let g = geoCache.get(k); if (!g) { g = make(); geoCache.set(k, g); } return g; };
const matCache = new Map<string, THREE.Material>();
const mat = (k: string, make: () => THREE.Material) => { let m = matCache.get(k); if (!m) { m = make(); matCache.set(k, m); } return m; };
const paint = (c: string) => mat(`paint${c}`, () => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.32, metalness: 0.05, clearcoat: 0.8, clearcoatRoughness: 0.18 }));
const plain = (c: string, rough = 0.6, metal = 0) => mat(`p${c}${rough}${metal}`, () => new THREE.MeshStandardMaterial({ color: c, roughness: rough, metalness: metal }));
const glow = (c: string, i = 1.2) => mat(`g${c}${i}`, () => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: i, roughness: 0.3 }));
const glass = () => mat('glass', () => new THREE.MeshPhysicalMaterial({ color: '#cfe9ff', roughness: 0.05, metalness: 0, transparent: true, opacity: 0.38, clearcoat: 1 }));
const rbox = (w: number, h: number, d: number, r = 0.08) => geo(`rb${w.toFixed(3)},${h.toFixed(3)},${d.toFixed(3)},${r}`, () => new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001)));
const mesh = (g: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0, shadow = true) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = shadow; o.receiveShadow = true; return o; };

const canvasTex = (w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')!); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
const checkerTex = () => mat('checker', () => new THREE.MeshStandardMaterial({ roughness: 0.5, map: canvasTex(128, 16, (g) => { for (let i = 0; i < 16; i++) for (let j = 0; j < 2; j++) { g.fillStyle = (i + j) % 2 ? '#1d1d22' : '#ffffff'; g.fillRect(i * 8, j * 8, 8, 8); } }) }));
const starDecal = () => mat('star', () => new THREE.MeshStandardMaterial({ transparent: true, roughness: 0.4, metalness: 0.3, map: canvasTex(128, 128, (g) => { g.translate(64, 64); g.fillStyle = '#ffd34a'; g.strokeStyle = '#fff6cf'; g.lineWidth = 6; g.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 24 : 54, a = (i / 10) * Math.PI * 2 - Math.PI / 2; if (i) g.lineTo(Math.cos(a) * r, Math.sin(a) * r); else g.moveTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill(); g.stroke(); }) }));
const taxiSign = () => mat('taxisign', () => new THREE.MeshStandardMaterial({ roughness: 0.4, emissive: '#fff3b0', emissiveIntensity: 0.25, map: canvasTex(128, 48, (g) => { g.fillStyle = '#ffd34a'; g.fillRect(0, 0, 128, 48); g.fillStyle = '#1d1d22'; g.font = 'bold 34px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('TAXI', 64, 26); }) }));
const ladderMat = () => plain('#dfe3ea', 0.35, 0.6);

export interface Driver { sprite: THREE.Sprite; base: THREE.Vector3; size: number; phase: number }
export interface VehicleModel {
  group: THREE.Group;
  /** the body that lifts / tilts / squashes (wheels stay on the ground) */
  body: THREE.Group;
  wheels: THREE.Mesh[]; wheelR: number;
  drivers: Driver[];
  length: number; kind: VehicleKind;
}

/** Wheels with tyres, hubs and a hub cap. */
function wheel(r: number, w: number): THREE.Group {
  const g = new THREE.Group();
  const tyre = mesh(geo(`tyre${r}${w}`, () => new THREE.CylinderGeometry(r, r, w, 18).rotateX(Math.PI / 2)), plain('#26262c', 0.85));
  const hub = mesh(geo(`hub${r}${w}`, () => new THREE.CylinderGeometry(r * 0.55, r * 0.55, w + 0.012, 14).rotateX(Math.PI / 2)), plain('#d9dde3', 0.3, 0.7), 0, 0, 0, false);
  const cap = mesh(geo(`cap${r}${w}`, () => new THREE.CylinderGeometry(r * 0.18, r * 0.18, w + 0.03, 8).rotateX(Math.PI / 2)), plain('#9aa1ab', 0.3, 0.6), 0, 0, 0, false);
  g.add(tyre, hub, cap);
  return g;
}

function driver(tex: number, size: number, x: number, y: number, z: number): Driver {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: driverTexture(tex), transparent: true, depthWrite: true, alphaTest: 0.12 }));
  s.center.set(0.5, 0.04); s.scale.set(size, size, 1); s.position.set(x, y, z); s.castShadow = false;
  return { sprite: s, base: new THREE.Vector3(x, y, z), size, phase: Math.random() * 6.28 };
}

/**
 * One vehicle `len` cells long. `drivers` lists the Fuzzy pictures (the first is the driver; buses fill seats with the rest).
 */
export function buildVehicle(kind: VehicleKind, len: number, color: string, drivers: number[]): VehicleModel {
  const group = new THREE.Group(), body = new THREE.Group(); group.add(body);
  const L = len - 0.14, W = 0.76;
  const wheelR = len === 3 ? 0.15 : 0.13;
  const out: Driver[] = [];
  const add = (o: THREE.Object3D) => { body.add(o); return o; };
  const lights = (front: number, y: number, back: number) => {
    for (const s of [-1, 1]) {
      add(mesh(geo('hl', () => new THREE.SphereGeometry(0.055, 12, 8).scale(0.6, 1, 1)), glow('#fff4c2', 0.9), front, y, s * (W / 2 - 0.12), false));
      add(mesh(geo('tl', () => new THREE.BoxGeometry(0.03, 0.05, 0.12)), glow('#ff4d5e', 0.8), back, y, s * (W / 2 - 0.12), false));
    }
  };
  const bumpers = (y: number) => { add(mesh(rbox(0.07, 0.09, W * 0.92, 0.03), plain('#3a3d45', 0.5), L / 2 - 0.02, y, 0)); add(mesh(rbox(0.07, 0.09, W * 0.92, 0.03), plain('#3a3d45', 0.5), -L / 2 + 0.02, y, 0)); };
  /**
   * An open cockpit from x0 (back) to x1 (front): a carpet, low doors on both sides in the body colour, soft cream seats with low
   * backs, a dashboard with a little steering wheel and a short glass windscreen. The Fuzzies sit IN it — the doors hide their
   * bottoms, nothing ever crosses their faces.
   */
  const cockpit = (x0: number, x1: number, floor: number, wall: number, seats: number[], wheel = true) => {
    const len = x1 - x0, cx = (x0 + x1) / 2, inner = W * 0.84;
    add(mesh(rbox(len, 0.04, inner, 0.02), plain('#5b4a46', 0.85), cx, floor - 0.02, 0, false));
    for (const sd of [-1, 1]) add(mesh(rbox(len + 0.06, wall - floor + 0.08, 0.07, 0.03), paint(color), cx, (floor + wall) / 2 - 0.04, sd * (W / 2 - 0.035)));
    add(mesh(rbox(0.06, wall - floor + 0.08, inner, 0.03), paint(color), x0 - 0.01, (floor + wall) / 2 - 0.04, 0)); // the back wall
    // a soft seat-back behind each Fuzzy (never in front of it: the Fuzzy itself fills the seat)
    for (const x of seats) add(mesh(rbox(0.05, wall - floor - 0.02, inner * 0.7, 0.025), plain('#f6dfc8', 0.7), x - 0.2, floor + (wall - floor) / 2 - 0.02, 0, false));
    add(mesh(rbox(0.08, wall - floor + 0.04, inner, 0.03), plain('#3d3a40', 0.6), x1 - 0.04, (floor + wall) / 2, 0)); // dashboard
    if (wheel) { const sw = mesh(geo('steer', () => new THREE.TorusGeometry(0.06, 0.014, 8, 20)), plain('#2b2d33', 0.4), x1 - 0.1, wall - 0.02, 0, false); sw.rotation.set(0, Math.PI / 2, 0.5); sw.rotation.order = 'YZX'; add(sw); }
    const ws = mesh(geo(`ws${inner}`, () => new THREE.BoxGeometry(0.018, 0.13, inner)), glass(), x1 + 0.01, wall + 0.05, 0, false); ws.rotation.z = -0.55; add(ws);
    add(mesh(geo(`wsr${inner}`, () => new THREE.CylinderGeometry(0.012, 0.012, inner, 8).rotateX(Math.PI / 2)), plain('#e9ecef', 0.25, 0.8), x1 - 0.025, wall + 0.105, 0, false));
  };
  /** a Fuzzy sitting on the seat at x (its picture's bottom sinks below the doors) */
  const sit = (tex: number, size: number, x: number, floor: number, z = 0) => out.push(driver(tex, size, x + 0.02, floor - 0.02, z));

  if (len === 2) {
    const low = kind === 'sport', ch = 0.2;
    const ct = 0.1 + wheelR * 0.55 + ch; // top of the chassis
    add(mesh(rbox(L, ch, W, 0.09), paint(color), 0, ct - ch / 2, 0));
    const hoodL = L * 0.33, trunkL = L * (kind === 'jeep' ? 0.16 : 0.2);
    const hoodH = low ? 0.08 : kind === 'jeep' ? 0.16 : 0.12;
    add(mesh(rbox(hoodL, hoodH, W, 0.06), paint(color), L / 2 - hoodL / 2, ct + hoodH / 2 - 0.02, 0));
    add(mesh(rbox(trunkL, hoodH - 0.02, W, 0.05), paint(color), -L / 2 + trunkL / 2, ct + (hoodH - 0.02) / 2 - 0.02, 0));
    const x0 = -L / 2 + trunkL, x1 = L / 2 - hoodL;
    const wall = ct + (low ? 0.1 : kind === 'jeep' ? 0.16 : 0.13);
    cockpit(x0, x1, ct, wall, [(x0 + x1) / 2 - 0.02]);
    lights(L / 2 - 0.01, ct - 0.05, -L / 2 + 0.01);
    bumpers(ct - ch + 0.05);
    if (kind === 'taxi') {
      add(mesh(geo('taxiband', () => new THREE.BoxGeometry(L * 0.98, 0.05, W + 0.005)), checkerTex(), 0, ct - 0.06, 0, false));
      add(mesh(geo('taxisign', () => new THREE.BoxGeometry(0.1, 0.1, 0.32)), taxiSign(), -L / 2 + trunkL / 2, ct + hoodH + 0.03, 0, false));
    }
    if (kind === 'jeep') {
      const bar = mesh(geo('rollbar', () => new THREE.TorusGeometry(W * 0.4, 0.025, 8, 20, Math.PI)), plain('#2b2d33', 0.4, 0.5), x0 - 0.02, wall - 0.02, 0); bar.rotation.y = Math.PI / 2; add(bar);
      add(mesh(geo('spare', () => new THREE.CylinderGeometry(0.12, 0.12, 0.07, 16).rotateZ(Math.PI / 2)), plain('#26262c', 0.85), -L / 2 - 0.03, ct - 0.02, 0));
    }
    if (low) for (const s of [-1, 1]) add(mesh(geo('stripe', () => new THREE.BoxGeometry(hoodL, 0.012, 0.07)), plain('#ffffff', 0.4), L / 2 - hoodL / 2, ct + hoodH - 0.015, s * 0.09, false));
    if (kind === 'hero' || kind === 'hero2') {
      add(mesh(geo('stardecal', () => new THREE.PlaneGeometry(0.28, 0.28).rotateX(-Math.PI / 2)), starDecal(), L / 2 - hoodL / 2, ct + hoodH - 0.012, 0, false));
      const flag = new THREE.Group(); flag.position.set(-L / 2 + 0.1, ct + hoodH - 0.03, W / 2 - 0.1);
      flag.add(mesh(geo('pole', () => new THREE.CylinderGeometry(0.01, 0.01, 0.42, 6).translate(0, 0.21, 0)), plain('#e9ecef', 0.4, 0.5), 0, 0, 0, false));
      flag.add(mesh(geo('flag', () => new THREE.ConeGeometry(0.07, 0.16, 3).rotateZ(-Math.PI / 2).translate(0.08, 0.36, 0)), plain('#ffd34a', 0.5), 0, 0, 0, false));
      add(flag);
    }
    sit(drivers[0], low ? 0.62 : 0.66, (x0 + x1) / 2 - 0.02, ct);
  } else {
    const ch = 0.22, ct = 0.1 + wheelR * 0.6 + ch;
    add(mesh(rbox(L, ch, W, 0.1), paint(kind === 'truck' ? '#5b6070' : color), 0, ct - ch / 2, 0));
    if (kind === 'bus') {
      // an open-top tour bus: a short bonnet, then rows of seats with a Fuzzy on each
      const hoodL = 0.32, x0 = -L / 2 + 0.06, x1 = L / 2 - hoodL, wall = ct + 0.14;
      add(mesh(rbox(hoodL, 0.14, W, 0.06), paint(color), L / 2 - hoodL / 2, ct + 0.05, 0));
      const rows = [x1 - 0.22, (x0 + x1) / 2 - 0.05, x0 + 0.24];
      cockpit(x0, x1, ct, wall, rows);
      for (const sd of [-1, 1]) add(mesh(geo(`busband${L}`, () => new THREE.BoxGeometry(L * 0.96, 0.035, 0.01)), plain('#ffffff', 0.4), 0, ct - 0.04, sd * (W / 2 + 0.003), false));
      lights(L / 2, ct - 0.05, -L / 2);
      bumpers(ct - ch + 0.05);
      sit(drivers[0], 0.62, rows[0], ct);
      sit(drivers[1] ?? drivers[0] + 3, 0.58, rows[1], ct);
      sit(drivers[2] ?? drivers[0] + 7, 0.58, rows[2], ct);
    } else {
      // an open cab at the front, then the back: a flatbed with crates, the fire engine's ladder, or the ice-cream counter
      const hoodL = 0.3, cabL = 0.62, x1 = L / 2 - hoodL, x0 = x1 - cabL, wall = ct + 0.14;
      add(mesh(rbox(hoodL, 0.16, W, 0.06), paint(color), L / 2 - hoodL / 2, ct + 0.06, 0));
      cockpit(x0, x1, ct, wall, [(x0 + x1) / 2 - 0.02]);
      const backL = x0 - 0.06 + L / 2, bx = -L / 2 + backL / 2;
      if (kind === 'icecream') {
        add(mesh(rbox(backL, 0.42, W, 0.1), paint('#fff4f8'), bx, ct + 0.2, 0));
        for (let k = 0; k < 6; k++) add(mesh(geo(`awn${backL.toFixed(2)}`, () => new THREE.BoxGeometry(backL / 6 - 0.005, 0.03, W + 0.06)), plain(k % 2 ? '#ff8fb4' : '#ffffff', 0.5), bx - backL / 2 + (k + 0.5) * (backL / 6), ct + 0.43, 0, false));
        const cone = new THREE.Group(); cone.position.set(bx, ct + 0.44, 0);
        cone.add(mesh(geo('cone', () => new THREE.ConeGeometry(0.13, 0.32, 14).rotateX(Math.PI).translate(0, 0.16, 0)), plain('#e8b56a', 0.7)));
        cone.add(mesh(geo('scoop', () => new THREE.SphereGeometry(0.15, 16, 12)), plain('#ff9cc2', 0.5), 0, 0.36, 0));
        cone.add(mesh(geo('cherry', () => new THREE.SphereGeometry(0.045, 10, 8)), plain('#e8483f', 0.3), 0, 0.52, 0));
        add(cone);
      } else if (kind === 'fire') {
        add(mesh(rbox(backL, 0.2, W * 0.96, 0.06), paint(color), bx, ct + 0.09, 0));
        add(mesh(geo(`firestripe${backL.toFixed(2)}`, () => new THREE.BoxGeometry(backL + 0.005, 0.04, W * 0.97)), plain('#ffffff', 0.4), bx, ct + 0.07, 0, false));
        const lad = new THREE.Group(); lad.position.set(bx, ct + 0.23, 0);
        for (const sd of [-1, 1]) lad.add(mesh(geo(`rail${backL.toFixed(2)}`, () => new THREE.BoxGeometry(backL - 0.06, 0.03, 0.03)), ladderMat(), 0, 0, sd * 0.14, false));
        for (let k = 0; k < 7; k++) lad.add(mesh(geo('rung', () => new THREE.BoxGeometry(0.025, 0.025, 0.28)), ladderMat(), -backL / 2 + 0.08 + k * ((backL - 0.16) / 6), 0, 0, false));
        add(lad);
        add(mesh(geo('siren', () => new THREE.BoxGeometry(0.06, 0.06, 0.3)), glow('#ff3b3b', 1.4), L / 2 - hoodL / 2, ct + 0.17, 0, false));
      } else {
        const crate = rbox(0.3, 0.26, 0.3, 0.03), cm = plain('#c08a4b', 0.8);
        add(mesh(crate, cm, bx - 0.24, ct + 0.13, -0.17)); add(mesh(crate, cm, bx + 0.1, ct + 0.13, 0.16)); add(mesh(crate, cm, bx - 0.22, ct + 0.13, 0.17)); add(mesh(crate, plain('#d9a35f', 0.8), bx - 0.18, ct + 0.39, 0));
        for (const sd of [-1, 1]) add(mesh(geo(`rail2${backL.toFixed(2)}`, () => new THREE.BoxGeometry(backL, 0.08, 0.03)), plain('#3a3d45', 0.5), bx, ct + 0.04, sd * (W / 2 - 0.015), false));
      }
      lights(L / 2, ct - 0.04, -L / 2);
      bumpers(ct - ch + 0.05);
      sit(drivers[0], 0.64, (x0 + x1) / 2 - 0.02, ct);
      if (kind === 'icecream') out.push(driver(drivers[1] ?? drivers[0] + 5, 0.4, bx, ct + 0.43, W * 0.22));
    }
  }
  for (const d of out) body.add(d.sprite);
  // wheels
  const wheels: THREE.Mesh[] = [];
  const axles = len === 3 ? [L / 2 - 0.3, -L / 2 + 0.55, -L / 2 + 0.25] : [L / 2 - 0.26, -L / 2 + 0.26];
  for (const x of axles) for (const s of [-1, 1]) { const w = wheel(wheelR, 0.11); w.position.set(x, wheelR, s * (W / 2 - 0.02)); group.add(w); wheels.push(w as unknown as THREE.Mesh); }
  // a soft contact shadow under the whole vehicle (cheap and always there, even on phones)
  const sh = mesh(geo(`csh${len}`, () => new THREE.PlaneGeometry(L + 0.2, W + 0.22).rotateX(-Math.PI / 2)), mat('csh', () => new THREE.MeshBasicMaterial({ map: softShadow(), transparent: true, depthWrite: false, opacity: 0.55 })), 0, 0.012, 0, false);
  sh.receiveShadow = false; group.add(sh);
  return { group, body, wheels, wheelR, drivers: out, length: len, kind };
}
let softTex: THREE.Texture | null = null;
function softShadow(): THREE.Texture {
  if (softTex) return softTex;
  softTex = canvasTex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 6, 64, 64, 64); gr.addColorStop(0, 'rgba(0,0,0,0.7)'); gr.addColorStop(0.55, 'rgba(0,0,0,0.38)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
  return softTex;
}
