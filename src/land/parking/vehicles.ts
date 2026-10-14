/**
 * Fuzzies Parking Escape — the VEHICLES: a collection of rounded cartoon cars built in code, all in one style:
 *   two cells long — compact convertible, low sports car, taxi (closed sedan), SUV, pickup and van;
 *   three cells long — city bus, school bus, box truck, fire engine and ice-cream truck.
 * Every vehicle is built along +x (front = +x), one cell = one unit long, `len - 0.14` long and 0.80 wide, so the puzzle footprint is
 * exactly what it always was; the scene turns it into place. Static parts are merged into one mesh per material (≈ 10 draw calls a
 * vehicle); wheels stay separate so they can roll.
 *
 * The DRIVERS are the owner's own Fuzzies (public/art/drivers) shown as sprites. They SIT in the vehicles: the seat is below the
 * belt line, so the doors, dashboard and windscreen frame hide the bottom of the fur ball and only the face and top show, through an
 * open cockpit (convertibles) or tinted glass with a glass roof (closed cabins, buses: one Fuzzy behind each window section). Glass
 * never writes depth, so it can't cut a Fuzzy away. Each driver also has a "blink" picture (closed eyelids painted in its own fur
 * colour) the scene swaps in now and then.
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { makeRider, ridersReady, type Rider } from './rider3d';

export type VehicleKind = 'hero' | 'hero2' | 'car' | 'sport' | 'taxi' | 'suv' | 'pickup' | 'van' | 'jeep' | 'bus' | 'school' | 'truck' | 'fire' | 'icecream';
/** the ordinary two-cell vehicles (picked at random for the lot) */
export const SHORT_KINDS: VehicleKind[] = ['car', 'suv', 'pickup', 'van', 'taxi', 'sport', 'suv', 'car'];
/** the three-cell vehicles */
export const LONG_KINDS: VehicleKind[] = ['bus', 'school', 'truck', 'fire', 'icecream', 'truck'];
/** the shapes a star car can take (the garage): any two-cell style */
export const STAR_STYLES: VehicleKind[] = ['car', 'sport', 'suv', 'van', 'pickup', 'taxi'];
/** rich toy-car paints, all clearly different from each other and from the two star cars */
export const PAINTS = ['#2f6fe0', '#ff7a1a', '#2fa84f', '#ffc21a', '#14a3a3', '#e8483f', '#1f4fa8', '#8cc63f', '#00a7d9', '#c0392b', '#ff9f1c'];
export const HERO = '#d6336c', HERO2 = '#14b8a6';

/** the 15 Fuzzies from the owner's sheet: d01 pink … d15 rainbow */
export const DRIVERS = 15;
const wrap = (n: number) => ((n % DRIVERS) + DRIVERS) % DRIVERS;
export const driverUrl = (n: number): string => `${import.meta.env.BASE_URL ?? '/'}art/drivers/d${String(wrap(n) + 1).padStart(2, '0')}.webp`;
const driverTex = new Map<number, THREE.Texture>();
export function driverTexture(n: number): THREE.Texture {
  const k = wrap(n);
  let t = driverTex.get(k);
  if (!t) { t = new THREE.TextureLoader().load(driverUrl(k)); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; driverTex.set(k, t); }
  return t;
}
/** start loading every driver picture (call once when the game opens) */
export const preloadDrivers = (): Promise<void> => Promise.all(Array.from({ length: DRIVERS }, (_, n) => new Promise<void>((res) => { const t = driverTexture(n); if (t.image) res(); else { const img = new Image(); img.onload = img.onerror = () => res(); img.src = driverUrl(n); } }))).then(() => undefined);
/** the main fur colour of each driver (for the garage swatches and colour matching) */
export const DRIVER_COLORS = ['#e36499', '#d92c32', '#e66f23', '#e9c73c', '#82c942', '#2cc3b2', '#2ca8d6', '#2e4ecf', '#9b31d0', '#b673d5', '#cfcaca', '#7a777b', '#2b2829', '#8b4b2d', '#ff7ab8'];
export const DRIVER_NAMES = ['Rosie', 'Ruby', 'Mango', 'Sunny', 'Kiwi', 'Mint', 'Sky', 'Blue', 'Plum', 'Lilac', 'Snowy', 'Pebble', 'Midnight', 'Cocoa', 'Rainbow'];

/** where the eyes are in every driver picture (256 px; measured on the owner's sheet) */
const EYES: [number, number][] = [[90, 112], [167, 112]];
const blinkTex = new Map<number, THREE.Texture>();
/**
 * The same Fuzzy with its eyes closed: each eye is covered by a soft lid in the fur colour just above it, with a curved lash line.
 * Null until the picture has loaded.
 */
export function driverBlinkTexture(n: number): THREE.Texture | null {
  const k = wrap(n);
  const done = blinkTex.get(k); if (done) return done;
  const img = driverTexture(k).image as HTMLImageElement | undefined;
  if (!img || !img.complete || !img.naturalWidth) return null;
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d', { willReadFrequently: true })!;
  g.drawImage(img, 0, 0, 256, 256);
  for (const [ex, ey] of EYES) {
    const px = g.getImageData(ex - 4, ey - 40, 9, 9).data; let r = 0, gg = 0, b = 0, n2 = 0;
    for (let i = 0; i < px.length; i += 4) if (px[i + 3] > 200) { r += px[i]; gg += px[i + 1]; b += px[i + 2]; n2++; }
    if (!n2) continue;
    r = Math.round(r / n2); gg = Math.round(gg / n2); b = Math.round(b / n2);
    const lum = 0.3 * r + 0.59 * gg + 0.11 * b;
    const gr = g.createRadialGradient(ex, ey - 6, 4, ex, ey, 30);
    gr.addColorStop(0, `rgb(${Math.min(255, r + 14)},${Math.min(255, gg + 14)},${Math.min(255, b + 14)})`); gr.addColorStop(1, `rgb(${r},${gg},${b})`);
    g.fillStyle = gr; g.beginPath(); g.ellipse(ex, ey, 26, 28, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = lum < 70 ? 'rgba(235,228,238,0.9)' : 'rgba(45,25,35,0.9)'; g.lineWidth = 5; g.lineCap = 'round';
    g.beginPath(); g.moveTo(ex - 18, ey + 2); g.quadraticCurveTo(ex, ey + 13, ex + 18, ey + 2); g.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  blinkTex.set(k, t); return t;
}

// ---------- shared geometry + materials ----------
const geoCache = new Map<string, THREE.BufferGeometry>();
/** a cached geometry, normalised for merging (non-indexed, position + normal + uv only) */
const geo = (k: string, make: () => THREE.BufferGeometry) => {
  let g = geoCache.get(k);
  if (!g) {
    let m = make(); if (m.index) m = m.toNonIndexed();
    for (const a of Object.keys(m.attributes)) if (a !== 'position' && a !== 'normal' && a !== 'uv') m.deleteAttribute(a);
    if (!m.attributes.uv) m.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(m.attributes.position.count * 2), 2));
    g = m; geoCache.set(k, g);
  }
  return g;
};
const matCache = new Map<string, THREE.Material>();
const mat = (k: string, make: () => THREE.Material) => { let m = matCache.get(k); if (!m) { m = make(); matCache.set(k, m); } return m; };
const shade = (c: string, k: number) => '#' + new THREE.Color(c).multiplyScalar(k).getHexString();
const paint = (c: string) => mat(`paint${c}`, () => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.28, metalness: 0.08, clearcoat: 1, clearcoatRoughness: 0.12 }));
const plain = (c: string, rough = 0.6, metal = 0) => mat(`p${c}${rough}${metal}`, () => new THREE.MeshStandardMaterial({ color: c, roughness: rough, metalness: metal }));
const glow = (c: string, i = 1.2) => mat(`g${c}${i}`, () => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: i, roughness: 0.25 }));
const GLASS = () => mat('glass', () => new THREE.MeshPhysicalMaterial({ color: '#d8efff', roughness: 0.05, metalness: 0, transparent: true, opacity: 0.13, clearcoat: 0.35, depthWrite: false, side: THREE.DoubleSide }));
const CHROME = () => plain('#e6e9ee', 0.18, 0.85);
const TRIM = () => plain('#2b2e35', 0.55);
const INTERIOR = () => plain('#463e48', 0.85);
const SEAT = () => plain('#7b5545', 0.75);
const TYRE = () => plain('#24252b', 0.92);
const canvasTex = (w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')!); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
const STAR = () => mat('star', () => new THREE.MeshStandardMaterial({ transparent: true, roughness: 0.4, metalness: 0.3, map: canvasTex(128, 128, (g) => { g.translate(64, 64); g.fillStyle = '#ffd34a'; g.strokeStyle = '#fff6cf'; g.lineWidth = 6; g.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 24 : 54, a = (i / 10) * Math.PI * 2 - Math.PI / 2; if (i) g.lineTo(Math.cos(a) * r, Math.sin(a) * r); else g.moveTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill(); g.stroke(); }) }));
const CHECKER = () => mat('checker', () => new THREE.MeshStandardMaterial({ roughness: 0.5, map: canvasTex(128, 16, (g) => { for (let i = 0; i < 16; i++) for (let j = 0; j < 2; j++) { g.fillStyle = (i + j) % 2 ? '#1d1d22' : '#ffffff'; g.fillRect(i * 8, j * 8, 8, 8); } }) }));
const SIGN = (text: string, bg: string, fg: string) => mat(`sign${text}${bg}`, () => new THREE.MeshStandardMaterial({ roughness: 0.45, emissive: '#ffffff', emissiveIntensity: 0.06, map: canvasTex(256, 64, (g) => { g.fillStyle = bg; g.fillRect(0, 0, 256, 64); g.fillStyle = fg; g.font = 'bold 40px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 128, 34); }) }));

const rbox = (w: number, h: number, d: number, r = 0.06) => {
  const rr = Math.max(0.002, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001));
  return geo(`rb${w.toFixed(3)},${h.toFixed(3)},${d.toFixed(3)},${rr.toFixed(3)}`, () => new RoundedBoxGeometry(w, h, d, 3, rr));
};
const box = (w: number, h: number, d: number) => geo(`bx${w.toFixed(3)},${h.toFixed(3)},${d.toFixed(3)}`, () => new THREE.BoxGeometry(w, h, d));

// ---------- the builder: parts collected, then merged into one mesh per material ----------
const tmp = new THREE.Object3D();
class Kit {
  private parts = new Map<THREE.Material, THREE.BufferGeometry[]>();
  add(g: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0, order: THREE.EulerOrder = 'XYZ'): void {
    tmp.position.set(x, y, z); tmp.rotation.set(rx, ry, rz, order); tmp.scale.set(1, 1, 1); tmp.updateMatrix();
    const c = g.clone(); c.applyMatrix4(tmp.matrix);
    let list = this.parts.get(m); if (!list) { list = []; this.parts.set(m, list); } list.push(c);
  }
  /** a rounded block between two corners */
  blk(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, r: number, m: THREE.Material): void {
    this.add(rbox(x1 - x0, y1 - y0, z1 - z0, r), m, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  }
  build(into: THREE.Group): void {
    for (const [m, list] of this.parts) {
      const merged = mergeGeometries(list, false); for (const g of list) g.dispose(); if (!merged) continue;
      const mesh = new THREE.Mesh(merged, m); const see = m.transparent;
      mesh.castShadow = !see; mesh.receiveShadow = !see; if (see) mesh.renderOrder = 2;
      into.add(mesh);
    }
  }
}

export interface Driver {
  /** what sits in the seat: the 3D Fuzzy's group, or the flat picture */
  obj: THREE.Object3D; rider?: Rider; sprite?: THREE.Sprite;
  base: THREE.Vector3; size: number; phase: number; tex: number;
  /** seconds to the next blink, and how long the current one still shows */
  blinkIn: number; blinkLeft: number;
}
export interface VehicleModel {
  group: THREE.Group;
  /** the body that lifts / tilts / squashes (wheels stay on the ground) */
  body: THREE.Group;
  wheels: THREE.Object3D[]; wheelR: number;
  drivers: Driver[];
  length: number; kind: VehicleKind;
}

/** a wheel: a rounded tyre, a bright rim with five spokes and a chrome hub cap */
function wheel(r: number, w: number): THREE.Group {
  const g = new THREE.Group();
  const tyre = new THREE.Mesh(geo(`tyre${r}`, () => new THREE.TorusGeometry(r - w * 0.36, w * 0.36, 10, 22).scale(1, 1, 1.25)), TYRE());
  const fill = new THREE.Mesh(geo(`tyref${r}`, () => new THREE.CylinderGeometry(r * 0.72, r * 0.72, w * 0.82, 20).rotateX(Math.PI / 2)), TYRE());
  const rim = new THREE.Mesh(geo(`rim${r}`, () => new THREE.CylinderGeometry(r * 0.56, r * 0.56, w * 0.86, 18).rotateX(Math.PI / 2)), plain('#f4f5f7', 0.25, 0.6));
  const cap = new THREE.Mesh(geo(`cap${r}`, () => new THREE.CylinderGeometry(r * 0.2, r * 0.24, w * 0.95, 10).rotateX(Math.PI / 2)), CHROME());
  const spokes = new THREE.Mesh(geo(`spk${r}`, () => mergeGeometries(Array.from({ length: 5 }, (_, k) => new THREE.BoxGeometry(r * 0.12, r * 0.42, w * 0.9).translate(0, r * 0.26, 0).rotateZ((k / 5) * Math.PI * 2).toNonIndexed()))!), plain('#c9ced6', 0.3, 0.7));
  for (const m of [tyre, fill, rim, cap, spokes]) { m.castShadow = m === tyre; m.receiveShadow = true; g.add(m); }
  return g;
}

/**
 * 3D riders (the owner's model) when it has loaded; the flat pictures otherwise (or when switched off).
 * OFF until the owner approves the look (Phase A): a developer switch, localStorage `fz.pk.riders3d` = '1', turns them on.
 */
let use3d = (() => {
  try {
    // a link with ?riders3d=1 (or =0) switches them on (off) on this device and remembers it — so the owner can try them on a phone
    const q = new URLSearchParams(location.search).get('riders3d');
    if (q === '1' || q === '0') localStorage.setItem('fz.pk.riders3d', q);
    return localStorage.getItem('fz.pk.riders3d') === '1';
  } catch { return false; }
})();
export const riders3d = (): boolean => use3d;
export const setRiders3d = (on: boolean): void => { use3d = on; };
/** the 3D Fuzzy is this much of the picture's size (the picture has a margin round the fur) */
const RIDER_K = 0.9;
/** the ball leans back to look up at you, which lowers its face a little: sit it this much higher */
const RIDER_LIFT = 0.02;
/** swap a flat driver for the 3D one in the same seat (the model arrived after the lot was built); false if it can't */
export function toRider(d: Driver): boolean {
  if (d.rider || !use3d || !ridersReady() || !d.obj.parent) return false;
  const r = makeRider(d.tex, d.size * RIDER_K), parent = d.obj.parent;
  d.base.y += RIDER_LIFT; r.group.position.copy(d.base); r.group.rotation.set(0, Math.PI / 2, 0, 'YXZ');
  parent.remove(d.obj); parent.add(r.group);
  (d.sprite?.material as THREE.SpriteMaterial | undefined)?.dispose();
  d.obj = r.group; d.rider = r; d.sprite = undefined;
  return true;
}
function driver(tex: number, size: number, x: number, y: number, z: number, flat = false): Driver {
  const blinkIn = 1.5 + Math.random() * 4, phase = Math.random() * 6.28;
  if (use3d && !flat && ridersReady()) {
    const r = makeRider(tex, size * RIDER_K);
    y += RIDER_LIFT; r.group.position.set(x, y, z); r.group.rotation.set(0, Math.PI / 2, 0, 'YXZ');
    return { obj: r.group, rider: r, base: new THREE.Vector3(x, y, z), size, phase, tex, blinkIn, blinkLeft: 0 };
  }
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: driverTexture(tex), transparent: true, depthWrite: true, alphaTest: 0.14 }));
  s.center.set(0.5, 0); s.scale.set(size, size, 1); s.position.set(x, y, z); s.castShadow = false; s.renderOrder = 1;
  return { obj: s, sprite: s, base: new THREE.Vector3(x, y, z), size, phase, tex, blinkIn, blinkLeft: 0 };
}

const W = 0.8, hw = W / 2;

/**
 * One vehicle `len` cells long. `drivers` lists the Fuzzy pictures (the first drives; vans and buses seat the next ones too).
 * `star` adds the star-car marks (a gold star on the bonnet and a little flag) to any style.
 */
export function buildVehicle(kind: VehicleKind, len: number, color: string, drivers: number[], opts: { star?: boolean; flat?: boolean } = {}): VehicleModel {
  const group = new THREE.Group(), body = new THREE.Group(); group.add(body);
  const k = new Kit();
  const out: Driver[] = [];
  const L = len - 0.14, F = L / 2;
  const P = paint(color), PD = paint(shade(color, 0.72));
  const star = opts.star || kind === 'hero' || kind === 'hero2';
  const style: VehicleKind = kind === 'hero' || kind === 'hero2' ? 'car' : kind === 'jeep' ? 'suv' : kind;
  const wheelR = len === 3 ? 0.175 : 0.165;
  const axles = len === 3 ? [F - 0.42, -F + 0.46] : [F - 0.36, -F + 0.37];
  const sit = (n: number, size: number, x: number, y: number, z = 0) => out.push(driver(n, size, x, y, z, opts.flat));

  // --- shared parts: skirt + sill, fender flares, bumpers, grille, lights ---
  const skirt = (top: number, m = P) => {
    k.blk(-F, F, 0.1, top, -hw, hw, 0.08, m);
    k.blk(-F + 0.04, F - 0.04, 0.085, 0.15, -hw - 0.006, hw + 0.006, 0.03, TRIM()); // the dark sill
  };
  const flares = (m = PD) => { for (const x of axles) for (const s of [-1, 1]) k.add(geo(`flare${wheelR}`, () => new THREE.TorusGeometry(wheelR + 0.04, 0.042, 8, 20, Math.PI)), m, x, wheelR, s * (hw - 0.004)); };
  const front = (y: number, lampY: number) => {
    k.blk(F - 0.03, F + 0.045, y - 0.05, y + 0.04, -hw * 0.94, hw * 0.94, 0.035, CHROME());
    k.blk(F - 0.02, F + 0.012, lampY - 0.07, lampY, -0.15, 0.15, 0.015, TRIM()); // grille
    for (const s of [-1, 1]) {
      k.add(geo('hl', () => new THREE.SphereGeometry(0.06, 14, 10).scale(0.55, 1, 1)), glow('#fff6cf', 1.1), F + 0.004, lampY, s * (hw - 0.13));
      k.add(geo('hlr', () => new THREE.TorusGeometry(0.062, 0.012, 6, 16).rotateY(Math.PI / 2)), CHROME(), F + 0.01, lampY, s * (hw - 0.13));
    }
  };
  const rear = (y: number, lampY: number) => {
    k.blk(-F - 0.045, -F + 0.03, y - 0.05, y + 0.04, -hw * 0.94, hw * 0.94, 0.035, CHROME());
    for (const s of [-1, 1]) k.blk(-F - 0.012, -F + 0.02, lampY - 0.035, lampY + 0.035, s > 0 ? hw - 0.2 : -hw + 0.07, s > 0 ? hw - 0.07 : -hw + 0.2, 0.012, glow('#ff4152', 0.9));
  };
  const doors = (x0: number, x1: number, belt: number, m = P) => {
    for (const s of [-1, 1]) k.blk(x0, x1, 0.14, belt, s > 0 ? hw - 0.075 : -hw, s > 0 ? hw : -hw + 0.075, 0.035, m);
    k.blk(x0 + 0.05, x1, 0.14, 0.22, -hw + 0.07, hw - 0.07, 0.02, INTERIOR()); // the floor
  };
  const steer = (x: number, y: number) => { k.add(geo('steer', () => new THREE.TorusGeometry(0.062, 0.012, 8, 20)), plain('#4a4d55', 0.5), x, y, 0, 0, Math.PI / 2, 0.9, 'YZX'); k.add(geo('steerc', () => new THREE.CylinderGeometry(0.012, 0.012, 0.12, 6)), plain('#4a4d55', 0.5), x + 0.05, y - 0.04, 0, 0, 0, 0.9); };
  /** an open cockpit (convertibles): doors, a soft seat with a headrest behind the Fuzzy, a dashboard, a steering wheel and a framed windscreen */
  const cockpit = (x0: number, x1: number, belt: number, ws: number) => {
    doors(x0, x1, belt);
    k.blk(x0 - 0.02, x0 + 0.07, 0.14, belt, -hw, hw, 0.04, P); // the back of the cockpit
    k.blk(x0 + 0.06, x0 + 0.34, 0.2, 0.3, -hw + 0.1, hw - 0.1, 0.04, SEAT()); // seat cushion
    k.add(rbox(0.07, 0.3, W - 0.22, 0.03), SEAT(), x0 + 0.1, 0.42, 0, 0, 0, 0.22); // seat back, leaning back
    k.add(rbox(0.08, 0.1, 0.26, 0.04), SEAT(), x0 + 0.05, 0.6, 0, 0, 0, 0.22); // headrest
    k.blk(x1 - 0.08, x1, 0.2, belt + 0.03, -hw + 0.075, hw - 0.075, 0.03, INTERIOR()); // dashboard
    steer(x1 - 0.13, belt + 0.03);
    // windscreen: glass + a frame (two pillars and a top bar), leaning back over the dashboard
    const ang = 0.5, cx = x1 + 0.02, cy = belt + ws / 2 - 0.01;
    k.add(box(0.012, ws, W - 0.16), GLASS(), cx, cy, 0, 0, 0, ang);
    for (const s of [-1, 1]) k.add(rbox(0.035, ws + 0.02, 0.035, 0.012), P, cx, cy, s * (hw - 0.07), 0, 0, ang);
    k.add(rbox(0.035, 0.035, W - 0.12, 0.012), P, cx - Math.sin(ang) * ws / 2, cy + Math.cos(ang) * ws / 2, 0);
  };
  /**
   * A closed cabin with tinted windows and a glass roof from x0 to x1: body-colour door panels up to the belt, pillars (one at every
   * `posts` x), roof rails and cross bars, and glass on the sides, front, back and top — the Fuzzies inside stay visible from above.
   */
  const cabin = (x0: number, x1: number, belt: number, roof: number, posts: number[] = [], slope = 0.12, m = P, solidBack = false) => {
    doors(x0, x1, belt, m);
    k.blk(x0, x0 + 0.08, 0.14, solidBack ? roof : belt, -hw, hw, 0.04, m);
    const xr = x1 - slope; // the roof's front edge
    for (const x of [x0 + 0.035, ...posts]) for (const s of [-1, 1]) k.blk(x - 0.03, x + 0.03, belt - 0.01, roof, s * (hw - 0.06) - 0.03, s * (hw - 0.06) + 0.03, 0.015, m);
    const fl = Math.hypot(slope, roof - belt), fa = Math.atan2(slope, roof - belt);
    for (const s of [-1, 1]) k.add(rbox(0.055, fl + 0.02, 0.06, 0.015), m, (x1 + xr) / 2, (belt + roof) / 2, s * (hw - 0.06), 0, 0, fa);
    for (const s of [-1, 1]) k.blk(x0, xr + 0.02, roof - 0.015, roof + 0.035, s > 0 ? hw - 0.1 : -hw + 0.02, s > 0 ? hw - 0.02 : -hw + 0.1, 0.02, m);
    for (const x of [x0 + 0.035, xr - 0.01]) k.blk(x - 0.035, x + 0.035, roof - 0.015, roof + 0.03, -hw + 0.04, hw - 0.04, 0.015, m);
    k.add(box(xr - x0 - 0.04, 0.01, W - 0.16), GLASS(), (x0 + xr) / 2, roof, 0);
    for (const s of [-1, 1]) k.add(box(xr - x0, roof - belt, 0.01), GLASS(), (x0 + xr) / 2, (belt + roof) / 2, s * (hw - 0.06));
    k.add(box(0.01, fl, W - 0.14), GLASS(), (x1 + xr) / 2, (belt + roof) / 2, 0, 0, 0, fa);
    if (!solidBack) k.add(box(0.01, roof - belt, W - 0.14), GLASS(), x0 + 0.04, (belt + roof) / 2, 0);
    // dashboard + steering wheel at the front
    k.blk(x1 - 0.1, x1 - 0.01, 0.2, belt + 0.02, -hw + 0.075, hw - 0.075, 0.03, INTERIOR());
    steer(x1 - 0.16 - slope * 0.3, belt + 0.02);
  };
  const seat = (x: number, top: number) => {
    k.blk(x - 0.14, x + 0.12, 0.2, 0.29, -hw + 0.1, hw - 0.1, 0.04, SEAT());
    k.add(rbox(0.07, top - 0.29, W - 0.24, 0.03), SEAT(), x - 0.17, (top + 0.29) / 2, 0, 0, 0, 0.18);
  };
  const starMarks = (x: number, y: number) => {
    k.add(geo('stardecal', () => new THREE.PlaneGeometry(0.26, 0.26).rotateX(-Math.PI / 2)), STAR(), x, y + 0.004, 0);
    k.add(geo('pole', () => new THREE.CylinderGeometry(0.01, 0.01, 0.42, 6).translate(0, 0.21, 0)), plain('#e9ecef', 0.4, 0.5), -F + 0.12, y - 0.02, hw - 0.1);
    k.add(geo('flag', () => new THREE.ConeGeometry(0.07, 0.16, 3).rotateZ(-Math.PI / 2).translate(0.08, 0.36, 0)), plain('#ffd34a', 0.5), -F + 0.12, y - 0.02, hw - 0.1);
  };

  if (len === 2) {
    if (style === 'car' || style === 'sport') {
      // convertibles: a rounded bonnet and boot, an open cockpit in the middle
      const sport = style === 'sport';
      const belt = sport ? 0.36 : 0.41, hood = sport ? 0.33 : 0.38;
      const x1 = sport ? 0.2 : 0.3, x0 = sport ? -0.52 : -0.46;
      skirt(0.24);
      k.blk(x1 - 0.02, F, 0.14, hood, -hw, hw, 0.11, P);
      k.blk(-F, x0 + 0.02, 0.14, hood - 0.01, -hw, hw, 0.11, P);
      cockpit(x0, x1, belt, sport ? 0.17 : 0.21);
      flares(); front(0.17, hood - 0.1); rear(0.17, hood - 0.08);
      if (sport) {
        for (const s of [-1, 1]) k.add(box(F - x1 - 0.06, 0.006, 0.07), plain('#ffffff', 0.4), (F + x1) / 2, hood + 0.002, s * 0.09);
        k.blk(-F + 0.02, -F + 0.2, hood + 0.08, hood + 0.11, -hw + 0.04, hw - 0.04, 0.015, PD); // spoiler
        for (const s of [-1, 1]) k.blk(-F + 0.09, -F + 0.13, hood - 0.02, hood + 0.09, s * 0.25 - 0.02, s * 0.25 + 0.02, 0.008, TRIM());
      }
      if (star) starMarks((F + x1) / 2 + 0.03, hood);
      sit(drivers[0], sport ? 0.4 : 0.43, (x0 + x1) / 2 + 0.03, 0.235);
    } else if (style === 'taxi') {
      const belt = 0.42, roof = 0.72, x0 = -0.5, x1 = 0.36;
      skirt(0.24);
      k.blk(x1 - 0.04, F, 0.14, 0.4, -hw, hw, 0.11, P);
      k.blk(-F, x0 + 0.04, 0.14, 0.4, -hw, hw, 0.11, P);
      cabin(x0, x1, belt, roof, [-0.06]); seat(-0.02, 0.5);
      flares(); front(0.17, 0.3); rear(0.17, 0.32);
      for (const s of [-1, 1]) k.add(box(L * 0.9, 0.05, 0.006), CHECKER(), 0, 0.33, s * (hw + 0.004));
      k.add(rbox(0.12, 0.1, 0.34, 0.03), SIGN('TAXI', '#ffd34a', '#1d1d22'), x0 + 0.06, roof + 0.08, 0);
      if (star) starMarks((F + x1) / 2, 0.4);
      sit(drivers[0], 0.45, 0.04, 0.22);
    } else if (style === 'suv') {
      const belt = 0.46, roof = 0.8, x0 = -F + 0.02, x1 = 0.42;
      skirt(0.28);
      k.blk(x1 - 0.04, F, 0.14, 0.45, -hw, hw, 0.1, P);
      cabin(x0, x1, belt, roof, [-0.38]); seat(0.04, 0.54);
      flares(TRIM()); front(0.19, 0.34); rear(0.19, 0.38);
      k.add(geo('spare', () => new THREE.CylinderGeometry(0.14, 0.14, 0.08, 18).rotateZ(Math.PI / 2)), TYRE(), -F - 0.04, 0.38, 0);
      k.add(geo('spareh', () => new THREE.CylinderGeometry(0.07, 0.07, 0.09, 12).rotateZ(Math.PI / 2)), CHROME(), -F - 0.04, 0.38, 0);
      for (const s of [-1, 1]) k.blk(x0 + 0.1, x1 - 0.2, roof + 0.035, roof + 0.07, s * (hw - 0.09) - 0.02, s * (hw - 0.09) + 0.02, 0.01, TRIM()); // roof bars
      if (star) starMarks((F + x1) / 2, 0.45);
      sit(drivers[0], 0.46, 0.1, 0.25);
      if (drivers[1] !== undefined && !star) sit(drivers[1], 0.4, -0.44, 0.25);
    } else if (style === 'van') {
      const belt = 0.44, roof = 0.86, x0 = -F + 0.02, x1 = 0.66;
      skirt(0.28);
      k.blk(x1 - 0.06, F, 0.14, 0.42, -hw, hw, 0.12, P);
      cabin(x0, x1, belt, roof, [0.12, -0.42], 0.16); seat(0.3, 0.55); seat(-0.24, 0.55);
      flares(PD); front(0.18, 0.32); rear(0.18, 0.38);
      for (const s of [-1, 1]) k.add(box(L * 0.92, 0.06, 0.006), plain('#ffffff', 0.4), -0.02, 0.33, s * (hw + 0.004));
      if (star) starMarks((F + x1) / 2, 0.42);
      sit(drivers[0], 0.46, 0.34, 0.25);
      if (!star) sit(drivers[1] ?? drivers[0] + 4, 0.42, -0.2, 0.25);
    } else { // pickup: a closed cab and an open bed with cargo
      const belt = 0.46, roof = 0.78, x0 = -0.12, x1 = 0.4;
      skirt(0.28);
      k.blk(x1 - 0.04, F, 0.14, 0.45, -hw, hw, 0.1, P);
      cabin(x0, x1, belt, roof, []); seat(0.12, 0.54);
      k.blk(-F, x0 - 0.02, 0.14, 0.24, -hw, hw, 0.04, plain('#5b4e44', 0.85)); // the bed floor
      for (const s of [-1, 1]) k.blk(-F, x0 - 0.02, 0.14, 0.42, s > 0 ? hw - 0.06 : -hw, s > 0 ? hw : -hw + 0.06, 0.03, P);
      k.blk(-F, -F + 0.06, 0.14, 0.42, -hw, hw, 0.03, P); // tailgate
      k.blk(-F + 0.1, -F + 0.36, 0.24, 0.44, -0.3, -0.04, 0.025, plain('#c08a4b', 0.8)); // crates and a melon
      k.blk(-F + 0.42, -F + 0.66, 0.24, 0.4, 0.06, 0.3, 0.025, plain('#d9a35f', 0.8));
      k.add(geo('melon', () => new THREE.SphereGeometry(0.11, 14, 10).scale(1.25, 0.9, 1)), plain('#3d8b3d', 0.5), -F + 0.5, 0.33, -0.2);
      flares(PD); front(0.19, 0.34); rear(0.19, 0.36);
      if (star) starMarks((F + x1) / 2, 0.45);
      sit(drivers[0], 0.46, 0.17, 0.25);
    }
  } else if (style === 'bus' || style === 'school') {
    // buses: a short nose, then one long glass cabin split by pillars into three window sections, a Fuzzy in each
    const school = style === 'school', B = school ? paint('#ffc21a') : P;
    const belt = 0.5, roof = 0.94, x0 = -F + 0.03, x1 = F - 0.24;
    skirt(0.3, B);
    k.blk(x1 - 0.06, F, 0.14, 0.46, -hw, hw, 0.12, B);
    cabin(x0, x1, belt, roof, [0.5, -0.28], 0.1, B, true);
    for (const x of [0.92, 0.18, -0.58]) seat(x, 0.6);
    for (const s of [-1, 1]) k.add(box(L * 0.97, 0.05, 0.006), school ? plain('#1d1d22', 0.5) : plain('#ffffff', 0.4), 0, belt - 0.07, s * (hw + 0.004));
    if (school) {
      k.add(rbox(0.06, 0.1, 0.5, 0.02), SIGN('SCHOOL BUS', '#1d1d22', '#ffc21a'), x1 - 0.1, roof + 0.07, 0);
      for (const s of [-1, 1]) k.add(geo('stoparm', () => new THREE.CylinderGeometry(0.06, 0.06, 0.012, 8).rotateX(Math.PI / 2)), plain('#e03131', 0.4), 0.95, 0.36, s * (hw + 0.012));
    }
    flares(TRIM()); front(0.19, 0.36); rear(0.19, 0.42);
    sit(drivers[0], 0.46, 0.98, 0.28);
    sit(drivers[1] ?? drivers[0] + 3, 0.44, 0.24, 0.28);
    sit(drivers[2] ?? drivers[0] + 7, 0.44, -0.52, 0.28);
  } else {
    // trucks: a closed cab at the front, then the truck's own back
    const belt = 0.48, roof = 0.84, x1 = F - 0.32, x0 = x1 - 0.56;
    skirt(0.26, style === 'fire' ? P : paint('#5b6070'));
    k.blk(x1 - 0.04, F, 0.14, 0.47, -hw, hw, 0.11, P);
    cabin(x0, x1, belt, roof, []); seat(x0 + 0.3, 0.56);
    const bx0 = -F, bx1 = x0 - 0.04, bc = (bx0 + bx1) / 2, bl = bx1 - bx0;
    if (style === 'truck') {
      k.blk(bx0, bx1, 0.2, 0.86, -hw, hw, 0.08, paint('#f6f3ee'));
      for (const s of [-1, 1]) k.add(box(bl * 0.9, 0.12, 0.006), P, bc, 0.52, s * (hw + 0.004));
      k.blk(bx0 - 0.01, bx0 + 0.02, 0.24, 0.82, -0.02, 0.02, 0.005, TRIM()); // the roller door seam
      k.add(rbox(0.16, 0.05, 0.16, 0.02), plain('#c9ced6', 0.4, 0.4), bc, 0.88, 0); // roof vent
    } else if (style === 'fire') {
      k.blk(bx0, bx1, 0.2, 0.56, -hw, hw, 0.07, P);
      for (const s of [-1, 1]) { k.add(box(bl * 0.96, 0.04, 0.006), plain('#ffffff', 0.4), bc, 0.32, s * (hw + 0.004)); for (let i = 0; i < 3; i++) k.add(box(bl / 3 - 0.06, 0.12, 0.006), CHROME(), bx0 + (i + 0.5) * (bl / 3), 0.45, s * (hw + 0.004)); }
      for (const s of [-1, 1]) k.blk(bx0 + 0.06, bx1 - 0.08, 0.6, 0.63, s * 0.14 - 0.016, s * 0.14 + 0.016, 0.008, CHROME()); // ladder rails
      for (let i = 0; i < 9; i++) { const x = bx0 + 0.1 + i * ((bl - 0.24) / 8); k.blk(x - 0.012, x + 0.012, 0.6, 0.63, -0.14, 0.14, 0.005, CHROME()); }
      for (const s of [-1, 1]) k.blk(bx0 + 0.04, bx0 + 0.1, 0.56, 0.6, s * 0.14 - 0.02, s * 0.14 + 0.02, 0.008, TRIM());
      k.add(rbox(0.07, 0.07, 0.42, 0.025), glow('#ff3b3b', 1.4), (x0 + x1) / 2 - 0.02, roof + 0.07, -0.06);
      k.add(rbox(0.07, 0.07, 0.12, 0.025), glow('#4d8bff', 1.4), (x0 + x1) / 2 - 0.02, roof + 0.07, 0.24);
    } else { // ice cream
      k.blk(bx0, bx1, 0.2, 0.82, -hw, hw, 0.09, paint('#fff4f8'));
      for (let i = 0; i < 6; i++) k.add(box(bl / 6 - 0.004, 0.035, W + 0.12), plain(i % 2 ? '#ff8fb4' : '#ffffff', 0.5), bx0 + (i + 0.5) * (bl / 6), 0.66, 0);
      for (const s of [-1, 1]) k.blk(bc - 0.3, bc + 0.3, 0.36, 0.56, s > 0 ? hw - 0.01 : -hw - 0.02, s > 0 ? hw + 0.02 : -hw + 0.01, 0.02, plain('#5a3d4a', 0.7)); // serving windows
      k.add(geo('cone', () => new THREE.ConeGeometry(0.13, 0.3, 16).rotateX(Math.PI).translate(0, 0.15, 0)), plain('#e8b56a', 0.7), bc, 0.82, 0);
      k.add(geo('scoop', () => new THREE.SphereGeometry(0.15, 16, 12)), plain('#ff9cc2', 0.5), bc, 1.16, 0);
      k.add(geo('scoop2', () => new THREE.SphereGeometry(0.1, 14, 10)), plain('#fff3d6', 0.5), bc + 0.04, 1.28, 0.03);
      k.add(geo('cherry', () => new THREE.SphereGeometry(0.045, 10, 8)), plain('#e8483f', 0.3), bc + 0.03, 1.39, 0.02);
    }
    flares(TRIM()); front(0.19, 0.35); rear(0.19, 0.4);
    sit(drivers[0], 0.46, x0 + 0.32, 0.26);
  }

  k.build(body);
  for (const d of out) body.add(d.obj);
  // wheels (separate so they roll)
  const wheels: THREE.Object3D[] = [];
  for (const x of axles) for (const s of [-1, 1]) { const w = wheel(wheelR, 0.13); w.position.set(x, wheelR, s * (hw - 0.05)); group.add(w); wheels.push(w); }
  // a soft contact shadow under the whole vehicle (cheap and always there, even on phones)
  const sh = new THREE.Mesh(geo(`csh${len}`, () => new THREE.PlaneGeometry(L + 0.24, W + 0.26).rotateX(-Math.PI / 2)), mat('csh', () => new THREE.MeshBasicMaterial({ map: softShadow(), transparent: true, depthWrite: false, opacity: 0.6 })));
  sh.position.y = 0.012; group.add(sh);
  return { group, body, wheels, wheelR, drivers: out, length: len, kind };
}
let softTex: THREE.Texture | null = null;
function softShadow(): THREE.Texture {
  if (softTex) return softTex;
  softTex = canvasTex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 6, 64, 64, 64); gr.addColorStop(0, 'rgba(0,0,0,0.7)'); gr.addColorStop(0.55, 'rgba(0,0,0,0.38)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
  return softTex;
}
