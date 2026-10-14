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
  s.center.set(0.5, 0.18); s.scale.set(size, size, 1); s.position.set(x, y, z); s.castShadow = false;
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
  const seat = (x: number, w = 0.24) => { add(mesh(rbox(w, 0.06, W * 0.62, 0.03), plain('#5a3b2e', 0.7), x, 0.43, 0)); add(mesh(rbox(0.06, 0.16, W * 0.62, 0.03), plain('#5a3b2e', 0.7), x - w / 2, 0.5, 0)); };
  const windshield = (x: number, wid = W * 0.86) => { const ws = mesh(geo(`ws${wid}`, () => new THREE.BoxGeometry(0.02, 0.2, wid)), glass(), x, 0.53, 0, false); ws.rotation.z = -0.35; add(ws); add(mesh(rbox(0.035, 0.035, wid, 0.015), plain('#2b2d33', 0.4, 0.5), x - 0.03, 0.635, 0, false)); };

  if (len === 2) {
    const tall = kind === 'jeep' ? 0.34 : kind === 'sport' ? 0.22 : 0.28;
    const by = 0.1 + wheelR * 0.55 + tall / 2;
    add(mesh(rbox(L, tall, W, 0.11), paint(color), 0, by, 0));
    // hood and trunk bulges, the open cockpit between them
    add(mesh(rbox(L * 0.32, 0.08, W * 0.9, 0.04), paint(color), L * 0.3, by + tall / 2, 0));
    add(mesh(rbox(L * 0.22, 0.07, W * 0.9, 0.035), paint(color), -L * 0.36, by + tall / 2, 0));
    add(mesh(rbox(L * 0.46, 0.03, W * 0.8, 0.015), plain('#3b3434', 0.8), -0.04, by + tall / 2 - 0.005, 0, false));
    seat(-0.08);
    windshield(L * 0.12);
    lights(L / 2 - 0.01, by + 0.02, -L / 2 + 0.01);
    bumpers(by - tall / 2 + 0.05);
    if (kind === 'taxi') {
      const band = mesh(geo('taxiband', () => new THREE.BoxGeometry(L * 0.98, 0.05, W + 0.005)), checkerTex(), 0, by + 0.02, 0, false); add(band);
      add(mesh(geo('taxisign', () => new THREE.BoxGeometry(0.1, 0.1, 0.32)), taxiSign(), L * 0.12 - 0.03, 0.72, 0, false));
    }
    if (kind === 'jeep') {
      const bar = mesh(geo('rollbar', () => new THREE.TorusGeometry(W * 0.36, 0.025, 8, 20, Math.PI)), plain('#2b2d33', 0.4, 0.5), -0.22, by + tall / 2, 0); bar.rotation.y = Math.PI / 2; add(bar);
      const spare = mesh(geo('spare', () => new THREE.CylinderGeometry(0.12, 0.12, 0.07, 16).rotateZ(Math.PI / 2)), plain('#26262c', 0.85), -L / 2 - 0.03, by + 0.05, 0); add(spare);
    }
    if (kind === 'sport') for (const s of [-1, 1]) add(mesh(geo('stripe', () => new THREE.BoxGeometry(L * 0.98, 0.012, 0.07)), plain('#ffffff', 0.4), 0, by + tall / 2 + 0.002, s * 0.09, false));
    if (kind === 'hero' || kind === 'hero2') {
      const st = mesh(geo('stardecal', () => new THREE.PlaneGeometry(0.3, 0.3).rotateX(-Math.PI / 2)), starDecal(), L * 0.3, by + tall / 2 + 0.045, 0, false); add(st);
      const flag = new THREE.Group(); flag.position.set(-L / 2 + 0.12, by + tall / 2, W / 2 - 0.12);
      flag.add(mesh(geo('pole', () => new THREE.CylinderGeometry(0.01, 0.01, 0.42, 6).translate(0, 0.21, 0)), plain('#e9ecef', 0.4, 0.5), 0, 0, 0, false));
      flag.add(mesh(geo('flag', () => new THREE.ConeGeometry(0.07, 0.16, 3).rotateZ(-Math.PI / 2).translate(0.08, 0.36, 0)), plain('#ffd34a', 0.5), 0, 0, 0, false));
      add(flag);
    }
    out.push(driver(drivers[0], kind === 'sport' ? 0.58 : 0.64, -0.08, by + tall / 2 - 0.02, 0));
  } else {
    const by = 0.1 + wheelR * 0.6;
    if (kind === 'bus') {
      const tall = 0.36;
      add(mesh(rbox(L, tall, W, 0.12), paint(color), 0, by + tall / 2, 0));
      add(mesh(rbox(L * 0.98, 0.06, W * 0.98, 0.03), plain('#ffffff', 0.4), 0, by + tall * 0.62, 0, false)); // window band
      add(mesh(rbox(L * 0.9, 0.025, W * 0.84, 0.01), plain('#3b3434', 0.8), 0, by + tall + 0.002, 0, false));
      for (const x of [L * 0.3, -0.05, -L * 0.36]) seat(x, 0.2);
      windshield(L * 0.43, W * 0.9);
      lights(L / 2, by + 0.08, -L / 2);
      bumpers(by + 0.04);
      out.push(driver(drivers[0], 0.56, L * 0.3, by + tall - 0.02, 0));
      out.push(driver(drivers[1] ?? drivers[0] + 3, 0.52, -0.05, by + tall - 0.02, 0.06));
      out.push(driver(drivers[2] ?? drivers[0] + 7, 0.52, -L * 0.36, by + tall - 0.02, -0.06));
    } else {
      // a cab at the front, then the back (flatbed with crates, a ladder, or the ice-cream counter)
      const cabL = 0.86, tall = 0.36;
      add(mesh(rbox(cabL, tall, W, 0.12), paint(color), L / 2 - cabL / 2, by + tall / 2, 0));
      add(mesh(rbox(cabL * 0.5, 0.03, W * 0.8, 0.015), plain('#3b3434', 0.8), L / 2 - cabL / 2 - 0.08, by + tall + 0.001, 0, false));
      windshield(L / 2 - 0.2);
      seat(L / 2 - cabL / 2 - 0.1);
      const backL = L - cabL - 0.04, bx = -L / 2 + backL / 2;
      if (kind === 'icecream') {
        add(mesh(rbox(backL, 0.5, W, 0.1), paint('#fff4f8'), bx, by + 0.25, 0));
        for (let k = 0; k < 6; k++) add(mesh(geo('awn', () => new THREE.BoxGeometry(backL / 6 - 0.005, 0.03, W + 0.06)), plain(k % 2 ? '#ff8fb4' : '#ffffff', 0.5), bx - backL / 2 + (k + 0.5) * (backL / 6), by + 0.52, 0, false));
        const cone = new THREE.Group(); cone.position.set(bx, by + 0.55, 0);
        cone.add(mesh(geo('cone', () => new THREE.ConeGeometry(0.13, 0.32, 14).rotateX(Math.PI).translate(0, 0.16, 0)), plain('#e8b56a', 0.7)));
        cone.add(mesh(geo('scoop', () => new THREE.SphereGeometry(0.15, 16, 12)), plain('#ff9cc2', 0.5), 0, 0.36, 0));
        cone.add(mesh(geo('cherry', () => new THREE.SphereGeometry(0.045, 10, 8)), plain('#e8483f', 0.3), 0, 0.52, 0));
        add(cone);
      } else {
        add(mesh(rbox(backL, 0.12, W, 0.05), plain(kind === 'fire' ? '#c92a2a' : '#6b6f78', 0.5), bx, by + 0.08, 0));
        if (kind === 'fire') {
          add(mesh(rbox(backL, 0.22, W * 0.96, 0.06), paint(color), bx, by + 0.24, 0));
          add(mesh(geo('firestripe', () => new THREE.BoxGeometry(backL + 0.005, 0.04, W * 0.97)), plain('#ffffff', 0.4), bx, by + 0.22, 0, false));
          const lad = new THREE.Group(); lad.position.set(bx + 0.1, by + 0.4, 0);
          for (const s of [-1, 1]) lad.add(mesh(geo('rail', () => new THREE.BoxGeometry(backL + 0.5, 0.03, 0.03)), ladderMat(), 0, 0, s * 0.14, false));
          for (let k = 0; k < 9; k++) lad.add(mesh(geo('rung', () => new THREE.BoxGeometry(0.025, 0.025, 0.28)), ladderMat(), -backL / 2 - 0.2 + k * ((backL + 0.4) / 8), 0, 0, false));
          add(lad);
          add(mesh(geo('siren', () => new THREE.BoxGeometry(0.08, 0.06, 0.3)), glow('#ff3b3b', 1.4), L / 2 - cabL / 2 + 0.12, by + tall + 0.03, 0, false));
        } else {
          // flatbed with a few crates of goodies
          const crate = rbox(0.3, 0.26, 0.3, 0.03);
          const cm = plain('#c08a4b', 0.8);
          add(mesh(crate, cm, bx - 0.28, by + 0.27, -0.17)); add(mesh(crate, cm, bx + 0.08, by + 0.27, 0.16)); add(mesh(crate, cm, bx - 0.25, by + 0.27, 0.17)); add(mesh(crate, plain('#d9a35f', 0.8), bx - 0.2, by + 0.53, 0));
          for (const s of [-1, 1]) add(mesh(geo('rail2', () => new THREE.BoxGeometry(backL, 0.08, 0.03)), plain('#3a3d45', 0.5), bx, by + 0.18, s * (W / 2 - 0.015), false));
        }
      }
      lights(L / 2, by + 0.1, -L / 2);
      bumpers(by + 0.04);
      out.push(driver(drivers[0], 0.6, L / 2 - cabL / 2 - 0.1, by + tall - 0.02, 0));
      if (kind === 'icecream') out.push(driver(drivers[1] ?? drivers[0] + 5, 0.4, bx, by + 0.52, W * 0.22));
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
