/**
 * Fuzzies Parking Escape — the 3D SCENE: a tidy parking lot (painted asphalt with bay lines, kerbs, a pavement, the exit road with
 * its barrier and EXIT sign, bollard planters), the town around it (lawn, trees, flowers, lamps — never in front of the lot), the
 * vehicles with their Fuzzy drivers, and every bit of motion: dragging, springy stops, bumps, the drivers' little reactions, the
 * hint ghost, the escape drive and the confetti / fireworks. The rules live in engine.ts; game.ts drives this scene.
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { flowers } from '../games/orchardArt';
import { backdrop, envOf, eventProps, groundTexture, smoothBush, type Atmo } from './world';
import { buildVehicle, driverBlinkTexture, driverTexture, SHORT_KINDS, LONG_KINDS, STAR_STYLES, PAINTS, HERO, HERO2, type VehicleModel } from './vehicles';
import { OUT, type Puzzle } from './engine';

/** the neighbourhood name for a level (ten neighbourhoods, 50 levels each — see world.ts) */
export const districtName = (i: number): string => envOf(i).name;

type Emote = 'bang' | 'heart' | 'star' | 'note' | 'huh' | 'sweat';
interface Car {
  m: VehicleModel; len: number; dir: 'h' | 'v'; line: number; exit: 0 | 1 | -1; face: 1 | -1;
  /** shown position (cells along its line, float) and where it's heading */
  pos: number; goal: number; vel: number;
  drag: boolean; lift: number; tilt: number; jiggle: number; hop: number; spin: number; gone: boolean; leaving: number;
  emote: THREE.Sprite | null; emoteT: number;
  /** which of the 15 Fuzzies drives (its voice) */ voice: number;
}
interface Spark { m: THREE.Mesh; v: THREE.Vector3; spin: THREE.Vector3; life: number; max: number }

export interface SceneOpts { mobile: boolean }
export class ParkScene {
  readonly canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200);
  private sun: THREE.DirectionalLight;
  private hemi: THREE.HemisphereLight;
  private lot = new THREE.Group();
  private carsGroup = new THREE.Group();
  private fx = new THREE.Group();
  private cars: Car[] = [];
  private p: Puzzle | null = null;
  private sparks: Spark[] = [];
  private barriers: { arm: THREE.Group; open: number; side: string; target: number }[] = [];
  private ghost: THREE.Group | null = null; private ghostT = 0;
  private selRing: THREE.Mesh;
  private sel = -1;
  private raf = 0; private last = 0; private t = 0;
  private running = true;
  /** screen space the HUD covers (px): the board is framed inside what's left */
  /** screen pixels the HUD covers on each side (measured by the game from the real bars) */
  pad = { top: 80, bottom: 110, left: 12, right: 12 };
  /** a Fuzzy hums now and then (game.ts gives it a voice) */
  onIdle: ((i: number) => void) | null = null;
  voiceOf(i: number): number { return this.cars[i]?.voice ?? 0; }
  private ro: ResizeObserver;
  private ray = new THREE.Raycaster();
  private milestone = false;
  /** the neighbourhood on show */
  env = envOf(1);
  private tickWorld: ((t: number) => void) | null = null;

  constructor(host: HTMLElement, private o: SceneOpts) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, o.mobile ? 2 : 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NeutralToneMapping; this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.canvas = this.renderer.domElement; this.canvas.className = 'pk-canvas';
    host.append(this.canvas);
    const pm = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; pm.dispose(); this.scene.environmentIntensity = 0.45;
    this.hemi = new THREE.HemisphereLight('#e4f1ff', '#6f9a5c', 0.75); this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight('#fff1d6', 2.6);
    this.sun.position.set(-6, 14, 7); this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(o.mobile ? 1024 : 2048, o.mobile ? 1024 : 2048);
    Object.assign(this.sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 40 });
    this.sun.shadow.bias = -0.0006; this.sun.shadow.normalBias = 0.02;
    this.scene.add(this.sun, this.sun.target, this.lot, this.carsGroup, this.fx);
    this.selRing = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: ringTex(), transparent: true, depthWrite: false, color: '#ff6b9a' }));
    this.selRing.position.y = 0.02; this.selRing.visible = false; this.scene.add(this.selRing);
    this.ro = new ResizeObserver(() => this.resize()); this.ro.observe(host);
    this.resize();
    this.last = performance.now();
    const tick = (now: number) => { this.raf = requestAnimationFrame(tick); const dt = Math.min(0.05, Math.max(0, (now - this.last) / 1000)); this.last = now; if (this.running) this.frame(dt); };
    this.raf = requestAnimationFrame(tick);
  }

  // ---------- the lot for a level ----------
  /** build the lot and its vehicles for a puzzle; `seed` picks paint and drivers, `level` the district look */
  /**
   * `look`: the garage's choice for your star car (shape, driver, paint) and, during a holiday, its decorations around the lot.
   * Looks only — the puzzle, footprints and collisions are the same for every shape.
   */
  load(p: Puzzle, s: Uint8Array, level: number, seed: number, milestone = false, look: { style?: number; driver?: number; paint?: string; atmo?: Atmo; colors?: string[] } = {}): void {
    this.p = p; this.milestone = milestone;
    // free the last lot's GPU memory: its own geometry, materials and painted textures (vehicle parts are shared caches; only their
    // per-driver sprite materials go)
    disposeTree(this.lot, true);
    this.carsGroup.traverse((o) => { if ((o as THREE.Sprite).isSprite) ((o as THREE.Sprite).material as THREE.Material).dispose(); });
    for (const s of this.sparks) (s.m.material as THREE.Material).dispose();
    if (this.ghost) disposeTree(this.ghost, false);
    clear(this.lot); clear(this.carsGroup); clear(this.fx); this.sparks = []; this.barriers = []; this.ghost = null; this.cars = [];
    const env = envOf(level); this.env = env;
    this.hemi.groundColor.set(env.ground === 'lawn' ? '#6f9a5c' : env.ground === 'garage' ? '#3a3f47' : '#a99f8c');
    this.scene.background = new THREE.Color(env.sky);
    this.scene.fog = new THREE.Fog(env.sky, env.fog[0], env.fog[1]);
    const indoor = env.ground === 'garage';
    this.hemi.intensity = indoor ? 0.8 : 0.75; this.sun.intensity = indoor ? 2.3 : 2.6;
    const W = p.w, H = p.h, hw = W / 2, hh = H / 2;
    // ground
    const gt = groundTexture(env.ground); const g = gt.map.clone(); g.needsUpdate = true; g.repeat.set(gt.repeat, gt.repeat);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: g, color: env.lawn, roughness: indoor ? 0.35 : 0.95, metalness: indoor ? 0.1 : 0 }));
    ground.position.y = -0.12; ground.receiveShadow = true; this.lot.add(ground);
    // pavement ring + kerb + the asphalt with bay lines
    const exits = p.cars.filter((c) => c.exit).map((c) => ({ side: c.dir === 'h' ? (c.exit === 1 ? 'e' : 'w') : (c.exit === 1 ? 's' : 'n'), line: c.line, i: c.i }));
    const pave = new THREE.Mesh(new THREE.BoxGeometry(W + 1.6, 0.1, H + 1.6), new THREE.MeshStandardMaterial({ map: paveTex(W + 1.6, H + 1.6), color: env.pave, roughness: 0.9 }));
    pave.position.y = -0.07; pave.receiveShadow = true; this.lot.add(pave);
    const asphalt = new THREE.Mesh(new THREE.BoxGeometry(W + 0.3, 0.08, H + 0.3), [side(), side(), new THREE.MeshStandardMaterial({ map: asphaltTex(W, H, p.walls), roughness: 0.82 }), side(), side(), side()]);
    asphalt.position.y = -0.04; asphalt.receiveShadow = true; this.lot.add(asphalt);
    const kerbMat = new THREE.MeshStandardMaterial({ color: '#e7e2d6', roughness: 0.8 });
    const kerb = (x: number, z: number, w: number, d: number) => { const k = new THREE.Mesh(new THREE.BoxGeometry(w, 0.14, d), kerbMat); k.position.set(x, 0.02, z); k.castShadow = true; k.receiveShadow = true; this.lot.add(k); };
    const T = 0.16, E = 0.15 + T / 2;
    for (const sd of ['n', 's', 'e', 'w'] as const) {
      const horiz = sd === 'n' || sd === 's', len = (horiz ? W : H) + 0.3 + T * 2, fixed = horiz ? (sd === 'n' ? -hh - E : hh + E) : (sd === 'w' ? -hw - E : hw + E);
      const gaps = exits.filter((e) => e.side === sd).map((e) => e.line - (horiz ? W : H) / 2 + 0.5).sort((a, b) => a - b);
      let from = -len / 2;
      for (const gc of [...gaps, null]) {
        const to = gc === null ? len / 2 : gc - 0.5;
        if (to - from > 0.01) { const mid = (from + to) / 2, l = to - from; if (horiz) kerb(mid, fixed, l, T); else kerb(fixed, mid, T, l); }
        if (gc !== null) from = gc + 0.5;
      }
    }
    // the exit roads, arrows, barrier and EXIT sign
    for (const e of exits) this.exitRoad(e.side, e.line, W, H, e.i);
    // bollard planters on wall cells
    for (let k = 0; k < p.walls.length; k++) if (p.walls[k]) this.planter((k % W) - hw + 0.5, Math.floor(k / W) - hh + 0.5, k);
    // the neighbourhood around: trees and its backdrop behind and to the sides (never between you and the lot), flowers in front
    const rnd = mulberry(level * 31 + 7);
    const near = (x: number, z: number) => exits.some((e) => { const c = e.line - (e.side === 'n' || e.side === 's' ? W : H) / 2 + 0.5; return e.side === 'e' ? x > hw && Math.abs(z - c) < 1.4 : e.side === 'w' ? x < -hw && Math.abs(z - c) < 1.4 : e.side === 'n' ? z < -hh && Math.abs(x - c) < 1.4 : z > hh && Math.abs(x - c) < 1.4; });
    const bd = backdrop(env, { W, H, near, mobile: this.o.mobile }, level);
    this.lot.add(bd.group); this.tickWorld = bd.tick ?? null;
    if (look.atmo) { const ev = eventProps(look.atmo, look.colors ?? [], { W, H, near, mobile: this.o.mobile }); this.lot.add(ev); }
    const fl: { x: number; z: number; kind: number }[] = [];
    for (let k = 0; k < 70; k++) { const a = rnd() * Math.PI * 2, r = 0.5 + rnd() * 2.2; const x = Math.cos(a) * (hw + 1.2 + r * 0.5), z = Math.sin(a) * (hh + 1.2 + r * 0.5); if (near(x, z) || (Math.abs(x) < hw + 1 && Math.abs(z) < hh + 1)) continue; fl.push({ x, z, kind: k }); }
    if (env.flowers) { const f = flowers(fl); f.position.y = -0.1; this.lot.add(f); }
    for (const [x, z] of [[-hw - 0.75, -hh - 0.75], [hw + 0.75, -hh - 0.75]] as [number, number][]) this.lamp(x, z);
    if (milestone) this.balloons(W, H, exits);
    // the vehicles
    const r2 = mulberry(seed * 977 + 13);
    let drv = Math.floor(r2() * 15);
    for (const c of p.cars) {
      const kind = c.exit ? (c.letter === 'A' ? 'hero' : 'hero2') : (c.len === 3 ? LONG_KINDS : SHORT_KINDS)[Math.floor(r2() * (c.len === 3 ? LONG_KINDS : SHORT_KINDS).length)];
      const color = c.exit ? (c.letter === 'A' ? HERO : HERO2) : kind === 'taxi' ? '#ffcf3a' : kind === 'school' ? '#ffb81c' : kind === 'fire' ? '#e03131' : PAINTS[Math.floor(r2() * PAINTS.length)];
      // drivers: different Fuzzies in turn; light vehicles never get the white / grey Fuzzy (they'd vanish against the paint)
      const light = ['#f4f1ea', '#ffb3c7'].includes(color) || kind === 'icecream';
      const pickDrv = () => { let d = drv++ % 15; if (light && (d === 10 || d === 11)) d = (d + 2) % 15; if (d === 0) d = 1; return d; };
      const mine = c.exit && c.letter === 'A';
      const ds = mine ? [look.driver ?? 0, 6, 9] : [pickDrv(), pickDrv(), pickDrv()];
      const m = mine && c.len === 2 && look.style ? buildVehicle(STAR_STYLES[look.style] ?? 'car', 2, look.paint || HERO, ds, { star: true }) : buildVehicle(kind, c.len, mine && look.paint ? look.paint : color, ds);
      const face: 1 | -1 = c.exit ? c.exit : r2() < 0.5 ? 1 : -1;
      const car: Car = { m, len: c.len, dir: c.dir, line: c.line, exit: c.exit, face, pos: s[c.i], goal: s[c.i], vel: 0, drag: false, lift: 0, tilt: 0, jiggle: 0, hop: 0, spin: 0, gone: s[c.i] === OUT, leaving: 0, emote: null, emoteT: 0, voice: ds[0] };
      m.group.rotation.y = c.dir === 'h' ? (face === 1 ? 0 : Math.PI) : (face === 1 ? -Math.PI / 2 : Math.PI / 2);
      this.carsGroup.add(m.group);
      this.cars.push(car);
      if (car.gone) m.group.visible = false;
      this.place(car);
    }
    this.select(-1);
    this.fit();
  }

  private exitRoad(sd: string, line: number, W: number, H: number, target: number): void {
    const horiz = sd === 'e' || sd === 'w';
    const c = line - (horiz ? H : W) / 2 + 0.5;
    const edge = horiz ? W / 2 : H / 2;
    const dirv = sd === 'e' || sd === 's' ? 1 : -1;
    const road = new THREE.Group();
    const len = 6;
    const m = new THREE.Mesh(new THREE.BoxGeometry(len, 0.08, 1.02), new THREE.MeshStandardMaterial({ map: roadTex(), roughness: 0.82 }));
    m.position.set(edge + len / 2 - 0.05, -0.04, 0); m.receiveShadow = true; road.add(m);
    // painted chevrons and EXIT on the road
    const arrows = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.8).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: exitTex(), transparent: true, depthWrite: false }));
    arrows.position.set(edge + 1.15, 0.005, 0); road.add(arrows);
    // barrier: a post and a striped arm across the opening
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.5, 0.12), new THREE.MeshStandardMaterial({ color: '#f1f3f5', roughness: 0.5 }));
    post.position.set(edge + 0.38, 0.25, -0.62); post.castShadow = true; road.add(post);
    const arm = new THREE.Group(); arm.position.set(edge + 0.38, 0.42, -0.62);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 1.15), new THREE.MeshStandardMaterial({ map: stripeTex(), roughness: 0.5 }));
    bar.position.z = 0.6; bar.castShadow = true; arm.add(bar); road.add(arm);
    // the EXIT sign on a pole
    const sign = new THREE.Group(); sign.position.set(edge + 0.5, 0, 0.75);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.1, 8), new THREE.MeshStandardMaterial({ color: '#9aa1ab', metalness: 0.5, roughness: 0.4 })); pole.position.y = 0.55; pole.castShadow = true; sign.add(pole);
    const board = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.32, 0.62), [plainM('#1f8f4e'), plainM('#1f8f4e'), plainM('#1f8f4e'), plainM('#1f8f4e'), new THREE.MeshStandardMaterial({ map: signTex(), roughness: 0.4, emissive: '#ffffff', emissiveIntensity: 0.08, emissiveMap: signTex() }), new THREE.MeshStandardMaterial({ map: signTex(), roughness: 0.4 })]);
    board.position.y = 1.08; board.rotation.y = Math.PI / 2; board.castShadow = true; sign.add(board);
    road.add(sign);
    // orient: built along +x out of the east side
    road.rotation.y = sd === 'e' ? 0 : sd === 'w' ? Math.PI : sd === 's' ? -Math.PI / 2 : Math.PI / 2;
    if (horiz) road.position.set(0, 0, c); else road.position.set(c, 0, 0);
    if (dirv < 0 && horiz) road.position.z = c;
    this.lot.add(road);
    this.barriers.push({ arm, open: 0, side: sd, target });
    // the glow strip on the ground just inside the exit, so you see where your car has to go
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.96).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: glowStripTex(), transparent: true, depthWrite: false, color: target === 0 ? '#ff6b9a' : '#3fd2c3' }));
    glow.position.set(edge + 0.12, 0.012, 0); road.add(glow);
  }
  private planter(x: number, z: number, seed: number): void {
    const g = new THREE.Group(); g.position.set(x, 0, z);
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.3, 0.78), new THREE.MeshStandardMaterial({ map: plankTex(), roughness: 0.8 }));
    box.position.y = 0.15; box.castShadow = true; box.receiveShadow = true; g.add(box);
    const soil = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.02, 0.68), new THREE.MeshStandardMaterial({ color: '#5a3d2b', roughness: 1 })); soil.position.y = 0.3; g.add(soil);
    const b = smoothBush(seed + 3, 0.36); b.position.y = 0.28; g.add(b);
    // two little traffic cones at its corners
    for (const s of [-1, 1]) { const cone = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.2, 12), new THREE.MeshStandardMaterial({ map: coneTex(), roughness: 0.5 })); cone.position.set(s * 0.33, 0.4, s * 0.33); cone.castShadow = true; g.add(cone); }
    this.lot.add(g);
  }
  private lamp(x: number, z: number): void {
    const g = new THREE.Group(); g.position.set(x, 0, z);
    const mat = new THREE.MeshStandardMaterial({ color: '#3a4450', metalness: 0.4, roughness: 0.4 });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 1.5, 10), mat); pole.position.y = 0.75; pole.castShadow = true; g.add(pole);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 10), new THREE.MeshStandardMaterial({ color: '#fff6d5', emissive: '#ffe9a8', emissiveIntensity: 0.6 })); head.position.y = 1.55; g.add(head);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.1, 12), mat); cap.position.y = 1.66; g.add(cap);
    this.lot.add(g);
  }
  /** milestone levels: balloon bunches by the exits and bunting along the back kerb */
  private balloons(W: number, H: number, exits: { side: string; line: number }[]): void {
    const cols = ['#ff6b9a', '#ffd34a', '#3fd2c3', '#7cc84a', '#ffffff'];
    for (const e of exits) {
      const horiz = e.side === 'e' || e.side === 'w'; const c = e.line - (horiz ? H : W) / 2 + 0.5; const edge = (horiz ? W : H) / 2 + 0.55, sgn = e.side === 'e' || e.side === 's' ? 1 : -1;
      for (const off of [-0.85, 0.85]) {
        const g = new THREE.Group(); const x = horiz ? sgn * edge : c + off, z = horiz ? c + off : sgn * edge; g.position.set(x, 0, z);
        for (let k = 0; k < 5; k++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), new THREE.MeshPhysicalMaterial({ color: cols[k], roughness: 0.15, clearcoat: 1 })); b.scale.y = 1.15; b.position.set(Math.cos(k * 1.3) * 0.16, 1.3 + (k % 3) * 0.16, Math.sin(k * 1.3) * 0.16); b.userData.bob = k; g.add(b); }
        const str = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 1.3, 4), new THREE.MeshBasicMaterial({ color: '#ffffff' })); str.position.y = 0.65; g.add(str);
        g.userData.balloons = true; this.lot.add(g);
      }
    }
    const flags = new THREE.Group();
    for (let k = 0; k < 16; k++) { const f = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.2, 3).rotateX(Math.PI), new THREE.MeshStandardMaterial({ color: cols[k % cols.length], roughness: 0.6, side: THREE.DoubleSide })); f.position.set(-W / 2 + (k + 0.5) * (W / 16), 0.95 - Math.sin(((k + 0.5) / 16) * Math.PI) * 0.15, -H / 2 - 0.62); flags.add(f); }
    this.lot.add(flags);
  }

  // ---------- positions ----------
  /** where a vehicle stands in the world for a position along its line */
  private worldOf(c: Car, pos: number): THREE.Vector3 {
    const p = this.p!; const along = pos + (c.len - 1) / 2;
    return c.dir === 'h' ? new THREE.Vector3(along - p.w / 2 + 0.5, 0, c.line - p.h / 2 + 0.5) : new THREE.Vector3(c.line - p.w / 2 + 0.5, 0, along - p.h / 2 + 0.5);
  }
  private place(c: Car): void { const w = this.worldOf(c, c.pos); c.m.group.position.set(w.x, 0, w.z); }

  /** jump every vehicle to a state (undo, restart) — `animate` slides them there */
  setState(s: Uint8Array, animate = true): void {
    this.cars.forEach((c, i) => {
      const pos = s[i];
      if (pos === OUT) { c.gone = true; c.m.group.visible = false; return; }
      if (c.gone) { c.gone = false; c.leaving = 0; c.m.group.visible = true; c.m.group.scale.setScalar(1); c.pos = pos; }
      c.goal = pos; if (!animate) { c.pos = pos; c.vel = 0; this.place(c); }
    });
    for (const b of this.barriers) if (this.cars[b.target] && !this.cars[b.target].gone) b.open = 0;
  }
  /** a dragged vehicle follows the finger (float position along its line) */
  dragTo(i: number, pos: number): void { const c = this.cars[i]; if (!c) return; c.drag = true; const d = pos - c.pos; c.vel = d / 0.016; c.pos = pos; c.goal = pos; }
  /** let go: spring to a cell */
  settle(i: number, to: number): void { const c = this.cars[i]; if (!c) return; c.drag = false; c.goal = to; }
  posOf(i: number): number { return this.cars[i]?.pos ?? 0; }

  select(i: number): void {
    this.sel = i;
    this.cars.forEach((c, k) => { c.m.group.userData.sel = k === i; });
    this.selRing.visible = i >= 0 && !!this.cars[i] && !this.cars[i].gone;
    if (i >= 0 && this.cars[i]) { const c = this.cars[i]; c.hop = Math.max(c.hop, 0.6); const L = c.len - 0.02; this.selRing.scale.set(c.dir === 'h' ? L + 0.3 : 1.1, 1, c.dir === 'h' ? 1.1 : L + 0.3); }
  }

  // ---------- reactions ----------
  emote(i: number, kind: Emote, secs = 1.3): void {
    const c = this.cars[i]; if (!c || c.gone) return;
    if (c.emote) c.m.body.remove(c.emote);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: emoteTex(kind), transparent: true, depthTest: false }));
    s.renderOrder = 20; s.scale.set(0.38, 0.38, 1);
    const d = c.m.drivers[0]; s.position.copy(d.base).add(new THREE.Vector3(0, d.size * 1.05, 0));
    c.m.body.add(s); c.emote = s; c.emoteT = secs;
  }
  /** a vehicle ran into something: it squashes back a touch, its driver frowns, the one in the way wobbles */
  bump(i: number, blocker: number): void {
    const c = this.cars[i]; if (!c) return;
    c.jiggle = 1; this.emote(i, Math.random() < 0.5 ? 'huh' : 'bang', 1);
    if (blocker >= 0 && this.cars[blocker]) { this.cars[blocker].jiggle = 0.8; this.emote(blocker, 'sweat', 0.9); }
  }
  hop(i: number, emote?: Emote): void { const c = this.cars[i]; if (!c) return; c.hop = 1; if (emote) this.emote(i, emote); }
  /** every Fuzzy cheers (the level is solved) */
  cheerAll(): void { this.cars.forEach((c, i) => { if (!c.gone) { c.hop = 1 + Math.random() * 0.5; setTimeout(() => this.emote(i, i % 3 ? 'heart' : 'star', 1.6), i * 70); } }); }

  /** drive a target out through its exit: the barrier lifts, confetti at the gate; resolves when it's gone */
  escape(i: number): Promise<void> {
    const c = this.cars[i]; if (!c) return Promise.resolve();
    c.drag = false; c.leaving = 0.001; c.spin = 1; this.emote(i, 'star', 1.5);
    const b = this.barriers.find((x) => x.target === i); if (b) b.open = 0.001;
    const p = this.p!; const span = c.dir === 'h' ? p.w : p.h;
    const edgePos = c.exit === 1 ? span - c.len : 0;
    c.goal = edgePos;
    setTimeout(() => this.burst(this.worldOf(c, c.exit === 1 ? span : -c.len).setY(0.6), 46), 260);
    return new Promise((res) => setTimeout(res, 1100));
  }
  /** confetti */
  burst(at: THREE.Vector3, n = 40, colors = ['#ff6b9a', '#ffd34a', '#3fd2c3', '#7cc84a', '#ffffff', '#5b9cff']): void {
    const geo = confettiGeo();
    for (let k = 0; k < n; k++) {
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: colors[k % colors.length], side: THREE.DoubleSide, transparent: true }));
      m.position.copy(at);
      const a = Math.random() * Math.PI * 2, sp = 1.5 + Math.random() * 2.5;
      this.fx.add(m); this.sparks.push({ m, v: new THREE.Vector3(Math.cos(a) * sp, 3 + Math.random() * 3, Math.sin(a) * sp), spin: new THREE.Vector3(Math.random() * 10, Math.random() * 10, Math.random() * 10), life: 0, max: 1.6 + Math.random() * 0.8 });
    }
  }
  /** fireworks over the lot (level won; bigger for milestones) */
  fireworks(n = 3): void {
    const p = this.p; if (!p) return;
    for (let k = 0; k < n; k++) setTimeout(() => { const at = new THREE.Vector3((Math.random() - 0.5) * p.w, 2.6 + Math.random() * 1.4, -p.h / 2 + Math.random() * 1.5); this.burst(at, 34, [['#ffd34a', '#fff3b0'], ['#ff6b9a', '#ffd1e0'], ['#3fd2c3', '#c9fff7'], ['#7cc84a', '#e3ffd0']][k % 4]); }, k * 380);
  }

  /** the hint: a see-through copy of the vehicle where it should go, and an arrow along the way */
  hint(i: number, to: number): void {
    this.clearHint();
    const c = this.cars[i]; if (!c) return;
    const g = new THREE.Group();
    const span = c.dir === 'h' ? this.p!.w : this.p!.h;
    const dest = to === OUT ? (c.exit === 1 ? span : -c.len) : to;
    const w = this.worldOf(c, dest), from = this.worldOf(c, c.pos);
    const L = c.len - 0.14;
    const box = new THREE.Mesh(new THREE.BoxGeometry(c.dir === 'h' ? L : 0.8, 0.5, c.dir === 'h' ? 0.8 : L), new THREE.MeshBasicMaterial({ color: '#ffd34a', transparent: true, opacity: 0.35, depthWrite: false }));
    box.position.set(w.x, 0.3, w.z); g.add(box);
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(box.geometry), new THREE.LineBasicMaterial({ color: '#ffb400' })); edges.position.copy(box.position); g.add(edges);
    const dir = new THREE.Vector3().subVectors(w, from); const dist = dir.length(); dir.normalize();
    const arrow = new THREE.ArrowHelper(dir, from.clone().setY(0.75), Math.max(0.4, dist), 0xffb400, 0.3, 0.22);
    g.add(arrow);
    this.ghost = g; this.ghostT = 0; this.scene.add(g);
    this.hop(i, 'note');
  }
  clearHint(): void { if (this.ghost) { this.scene.remove(this.ghost); disposeTree(this.ghost, false); this.ghost = null; } }

  // ---------- picking ----------
  private ndc(x: number, y: number): THREE.Vector2 { const r = this.canvas.getBoundingClientRect(); return new THREE.Vector2(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1); }
  /** a point on the plane at height y under the pointer */
  ground(x: number, y: number, h = 0.32): THREE.Vector3 | null {
    this.ray.setFromCamera(this.ndc(x, y), this.camera);
    const hit = new THREE.Vector3(); return this.ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -h), hit) ? hit : null;
  }
  /** which vehicle is under the pointer (forgiving: a finger-sized margin round each one) */
  pick(x: number, y: number, slop = 0.12): number {
    let best = -1, bd = Infinity;
    for (const h of [0.45, 0.25]) {
      const g = this.ground(x, y, h); if (!g) continue;
      this.cars.forEach((c, i) => {
        if (c.gone || c.leaving) return;
        const w = this.worldOf(c, c.pos); const hx = (c.dir === 'h' ? c.len : 1) / 2 - 0.05 + slop, hz = (c.dir === 'h' ? 1 : c.len) / 2 - 0.05 + slop;
        const dx = Math.abs(g.x - w.x), dz = Math.abs(g.z - w.z);
        if (dx <= hx && dz <= hz) { const d = dx / hx + dz / hz; if (d < bd) { bd = d; best = i; } }
      });
      if (best >= 0) return best;
    }
    return best;
  }
  /** pointer → position along a vehicle's line (cells) */
  along(i: number, x: number, y: number): number | null {
    const c = this.cars[i]; const g = this.ground(x, y); if (!c || !g) return null;
    const p = this.p!; return c.dir === 'h' ? g.x + p.w / 2 - 0.5 - (c.len - 1) / 2 : g.z + p.h / 2 - 0.5 - (c.len - 1) / 2;
  }
  /** screen position of a vehicle (for the tutorial hand) */
  screenOf(i: number): { x: number; y: number } | null {
    const c = this.cars[i]; if (!c) return null; const w = this.worldOf(c, c.pos).setY(0.4).project(this.camera); const r = this.canvas.getBoundingClientRect();
    return { x: r.left + ((w.x + 1) / 2) * r.width, y: r.top + ((1 - w.y) / 2) * r.height };
  }
  screenAt(world: THREE.Vector3): { x: number; y: number } { const w = world.clone().project(this.camera); const r = this.canvas.getBoundingClientRect(); return { x: r.left + ((w.x + 1) / 2) * r.width, y: r.top + ((1 - w.y) / 2) * r.height }; }
  /** where a vehicle would stand at a position (world) — the tutorial points at the exit with it */
  worldAt(i: number, pos: number): THREE.Vector3 { return this.worldOf(this.cars[i], pos); }

  // ---------- camera ----------
  private resize(): void {
    const r = this.canvas.parentElement!.getBoundingClientRect();
    const w = Math.max(1, r.width), h = Math.max(1, r.height);
    this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    this.fit();
  }
  /** frame the lot (with its exit roads) in the space the HUD leaves free */
  fit(): void {
    const p = this.p; if (!p) return;
    const r = this.canvas.getBoundingClientRect(); const w = Math.max(1, r.width), h = Math.max(1, r.height);
    const portrait = h > w * 1.15;
    // measure without the last frame's shift (it is set again at the end — otherwise every second fit undoes the one before)
    this.camera.clearViewOffset();
    this.camera.fov = portrait ? 34 : 30; this.camera.updateProjectionMatrix();
    const tiltDeg = portrait ? 61 : 54, tilt = THREE.MathUtils.degToRad(tiltDeg);
    const hasExit = (sd: string) => this.barriers.some((b) => b.side === sd);
    // the whole marked exit stays on screen: barrier, sign, chevrons and the painted EXIT
    // the space that's scarce gets less road: a side exit on a portrait phone shows its barrier, sign and first chevrons (the lot stays big);
    // a top/bottom exit there — or a side exit on a wide screen — shows the whole road with its painted EXIT
    const m = portrait ? 0.22 : 0.4, exH = portrait ? 1.0 : 2.05, exV = portrait ? 1.75 : 1.5;
    const xs = [-p.w / 2 - (hasExit('w') ? exH : m), p.w / 2 + (hasExit('e') ? exH : m)], zs = [-p.h / 2 - (hasExit('n') ? exV : m) - 0.4, p.h / 2 + (hasExit('s') ? exV : m)];
    const corners = [] as THREE.Vector3[]; for (const x of xs) for (const z of zs) for (const y of [0, 0.8]) corners.push(new THREE.Vector3(x, y, z));
    const cx = (xs[0] + xs[1]) / 2, cz = (zs[0] + zs[1]) / 2;
    // usable rectangle in NDC
    const top = 1 - (this.pad.top / h) * 2, bottom = -1 + (this.pad.bottom / h) * 2, left = -1 + (this.pad.left / w) * 2, right = 1 - (this.pad.right / w) * 2;
    let lo = 3, hi = 80;
    for (let k = 0; k < 28; k++) {
      const d = (lo + hi) / 2;
      this.camera.position.set(cx, Math.sin(tilt) * d, cz + Math.cos(tilt) * d); this.camera.lookAt(cx, 0, cz); this.camera.updateMatrixWorld();
      let xmin = Infinity, xmax = -Infinity, ymin = Infinity, ymax = -Infinity;
      for (const c of corners) { const v = c.clone().project(this.camera); xmin = Math.min(xmin, v.x); xmax = Math.max(xmax, v.x); ymin = Math.min(ymin, v.y); ymax = Math.max(ymax, v.y); }
      const ok = xmax - xmin <= right - left && ymax - ymin <= top - bottom;
      if (ok) hi = d; else lo = d;
    }
    const d = hi;
    this.camera.position.set(cx, Math.sin(tilt) * d, cz + Math.cos(tilt) * d); this.camera.lookAt(cx, 0, cz); this.camera.updateMatrixWorld();
    // shift so the lot sits in the middle of the free space (between the HUD bars and beside a tool rail)
    let xmin = Infinity, xmax = -Infinity, ymin = Infinity, ymax = -Infinity;
    for (const c of corners) { const v = c.clone().project(this.camera); xmin = Math.min(xmin, v.x); xmax = Math.max(xmax, v.x); ymin = Math.min(ymin, v.y); ymax = Math.max(ymax, v.y); }
    const dy = (ymin + ymax) / 2 - (top + bottom) / 2, dx = (xmin + xmax) / 2 - (left + right) / 2;
    this.camera.setViewOffset(w, h, (dx / 2) * w, -(dy / 2) * h, w, h); this.camera.updateProjectionMatrix();
    this.sun.target.position.set(cx, 0, cz); this.sun.position.set(cx - 6, 14, cz + 7);
  }

  // ---------- the loop ----------
  setRunning(on: boolean): void { this.running = on; if (on) this.last = performance.now(); }
  private frame(dt: number): void {
    this.t += dt;
    this.tickWorld?.(this.t);
    const p = this.p;
    if (p) for (const c of this.cars) {
      if (c.gone) continue;
      const before = c.pos;
      if (c.leaving) {
        // accelerate out along the exit road, then shrink away
        c.leaving += dt;
        const span = c.dir === 'h' ? p.w : p.h;
        const acc = Math.min(14, 3 + c.leaving * 16);
        c.vel = c.exit * Math.max(Math.abs(c.vel), 1) + c.exit * acc * dt; c.pos += c.vel * dt;
        const past = c.exit === 1 ? c.pos - (span - c.len) : -c.pos;
        if (past > 4.5) { c.gone = true; c.m.group.visible = false; }
        c.m.group.scale.setScalar(Math.max(0.01, 1 - Math.max(0, past - 3) / 1.5));
      } else if (!c.drag) {
        // a critically damped spring to the goal cell, with a little overshoot
        const k = 220, damp = 24;
        const a = (c.goal - c.pos) * k - c.vel * damp; c.vel += a * dt; c.pos += c.vel * dt;
        if (Math.abs(c.goal - c.pos) < 0.002 && Math.abs(c.vel) < 0.02) { c.pos = c.goal; c.vel = 0; }
      }
      this.place(c);
      // wheels roll, the body leans into the motion
      const moved = c.pos - before; const roll = (moved * c.face) / c.m.wheelR;
      for (const w of c.m.wheels) w.rotation.z -= roll;
      c.tilt += ((-c.vel * c.face * 0.012) - c.tilt) * Math.min(1, dt * 10);
      c.lift += ((c.m.group.userData.sel || c.drag ? 0.06 : 0) - c.lift) * Math.min(1, dt * 12);
      c.jiggle = Math.max(0, c.jiggle - dt * 3); c.hop = Math.max(0, c.hop - dt * 2.2); c.spin = Math.max(0, c.spin - dt * 1.4);
      const jig = Math.sin(this.t * 40) * c.jiggle * 0.05;
      c.m.body.position.y = c.lift + Math.sin((1 - Math.min(1, c.hop)) * Math.PI) * 0.08 * Math.min(1, c.hop);
      c.m.body.rotation.z = Math.max(-0.08, Math.min(0.08, c.tilt)) + jig;
      c.m.body.scale.set(1 + c.jiggle * 0.05, 1 - c.jiggle * 0.06, 1);
      // drivers: breathe, bob, blink-squash now and then, hop and spin when happy, lean back when the car shoots off
      for (const d of c.m.drivers) {
        const ph = d.phase + this.t;
        // real blinks: the closed-eyes picture shows for a moment every few seconds (double blinks now and then)
        const mat = d.sprite.material as THREE.SpriteMaterial;
        if (d.blinkLeft > 0) { d.blinkLeft -= dt; if (d.blinkLeft <= 0) { mat.map = driverTexture(d.tex); mat.needsUpdate = true; } }
        else if ((d.blinkIn -= dt) <= 0) {
          const b = driverBlinkTexture(d.tex);
          if (b) { mat.map = b; mat.needsUpdate = true; d.blinkLeft = 0.13; }
          d.blinkIn = Math.random() < 0.2 ? 0.25 : 2 + Math.random() * 4;
        }
        const blink = 1;
        const hopY = Math.sin(Math.min(1, c.hop) * Math.PI) * 0.18;
        const breathe = 1 + Math.sin(ph * 2.2) * 0.025;
        d.sprite.position.set(d.base.x, d.base.y + hopY + Math.sin(ph * 1.7) * 0.012, d.base.z);
        d.sprite.scale.set(d.size * breathe * (1 + c.jiggle * 0.08), d.size * breathe * blink * (1 - c.jiggle * 0.08), 1);
        // they lean into the motion like steering round a bend, spin when happy, sway a little while waiting
        mat.rotation = Math.sin(this.t * 14) * 0.25 * c.spin + Math.sin(ph * 1.1) * 0.03 + (c.leaving ? -0.15 * c.face : 0) + Math.max(-0.12, Math.min(0.12, c.vel * c.face * 0.02));
      }
      if (c.emote) { c.emoteT -= dt; const s = c.emote; const a = Math.min(1, c.emoteT * 3); (s.material as THREE.SpriteMaterial).opacity = a; s.position.y += dt * 0.12; const sc = 0.38 * (1 + Math.max(0, 0.25 - (1.3 - c.emoteT)) * 2); s.scale.set(sc, sc, 1); if (c.emoteT <= 0) { c.m.body.remove(s); c.emote = null; } }
    }
    // idle life: now and then a Fuzzy hums or waves
    if (Math.random() < dt * 0.35 && this.cars.length) { const k = Math.floor(Math.random() * this.cars.length); const c = this.cars[k]; if (!c.gone && !c.drag && !c.emote && !c.leaving) { c.hop = 0.7; if (Math.random() < 0.5) { this.emote(k, 'note', 1.1); this.onIdle?.(k); } } }
    // selection ring follows its car
    if (this.sel >= 0 && this.cars[this.sel] && !this.cars[this.sel].gone) { const w = this.worldOf(this.cars[this.sel], this.cars[this.sel].pos); this.selRing.position.set(w.x, 0.02, w.z); (this.selRing.material as THREE.MeshBasicMaterial).opacity = 0.75 + Math.sin(this.t * 6) * 0.2; } else this.selRing.visible = false;
    for (const b of this.barriers) if (b.open > 0) { b.open = Math.min(1, b.open + dt * 2.5); b.arm.rotation.x = -b.open * 1.35; }
    if (this.ghost) { this.ghostT += dt; this.ghost.children.forEach((o) => { const m = (o as THREE.Mesh).material as THREE.MeshBasicMaterial; if (m && 'opacity' in m && o.type === 'Mesh') m.opacity = 0.25 + Math.sin(this.ghostT * 5) * 0.12; }); }
    for (let k = this.sparks.length - 1; k >= 0; k--) {
      const s = this.sparks[k]; s.life += dt; s.v.y -= 6 * dt; s.v.multiplyScalar(1 - dt * 0.9); s.m.position.addScaledVector(s.v, dt);
      s.m.rotation.x += s.spin.x * dt; s.m.rotation.y += s.spin.y * dt; (s.m.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - Math.max(0, s.life - s.max * 0.6) / (s.max * 0.4));
      if (s.life > s.max || s.m.position.y < 0) { this.fx.remove(s.m); (s.m.material as THREE.Material).dispose(); this.sparks.splice(k, 1); }
    }
    if (this.milestone) this.lot.children.forEach((g) => { if (g.userData.balloons) g.children.forEach((b) => { if (b.userData.bob !== undefined) b.position.y += Math.sin(this.t * 2 + b.userData.bob) * 0.0015; }); });
    this.renderer.render(this.scene, this.camera);
  }
  dispose(): void {
    cancelAnimationFrame(this.raf); this.ro.disconnect();
    this.scene.traverse((o) => { const m = o as THREE.Mesh; if (m.geometry && !(m.geometry as THREE.BufferGeometry & { shared?: boolean }).shared) { /* shared caches stay for the next visit */ } });
    this.renderer.dispose(); this.renderer.forceContextLoss?.(); this.canvas.remove();
  }
}

// ---------- helpers ----------
function clear(g: THREE.Group): void { while (g.children.length) g.remove(g.children[0]); }
const confettiGeo = (() => { let g: THREE.BufferGeometry | null = null; return () => (g ??= new THREE.PlaneGeometry(0.08, 0.13)); })();
/** dispose what a group made for itself (geometry, materials and — with `maps` — their textures); shared caches re-upload if reused */
function disposeTree(root: THREE.Object3D, maps: boolean): void {
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.geometry && m.geometry !== confettiGeo()) m.geometry.dispose();
    const mats = m.material ? (Array.isArray(m.material) ? m.material : [m.material]) : [];
    for (const mat of mats) { if (maps) for (const k of ['map', 'emissiveMap'] as const) (mat as THREE.MeshStandardMaterial)[k]?.dispose(); mat.dispose(); }
  });
}
function mulberry(seed: number): () => number { let t = seed >>> 0; return () => { t += 0x6d2b79f5; let r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; }
const plainM = (c: string) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.5 });
const side = () => new THREE.MeshStandardMaterial({ color: '#3d424a', roughness: 0.9 });
const once = <T>(f: () => T) => { let v: T | undefined; return () => (v ??= f()); };
const cv = (w: number, h: number) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return { c, g: c.getContext('2d')! }; };
const ctex = (c: HTMLCanvasElement, aniso = 8) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso; return t; };

/** asphalt with fine speckles and one soft, rounded parking tile per cell, framed by a crisp white line — calm, and the lanes still read at a glance */
function asphaltTex(W: number, H: number, walls: Uint8Array): THREE.Texture {
  const S = 112, pad = Math.round(S * 0.15);
  const { c, g } = cv(W * S + pad * 2, H * S + pad * 2);
  g.fillStyle = '#3e434d'; g.fillRect(0, 0, c.width, c.height);
  const r = mulberry(W * 100 + H);
  for (let k = 0; k < c.width * c.height / 40; k++) { const v = 58 + r() * 40; g.fillStyle = `rgba(${v},${v + 2},${v + 6},${0.18 + r() * 0.22})`; g.fillRect(r() * c.width, r() * c.height, 1 + r() * 1.2, 1 + r() * 1.2); }
  // the spaces: a slightly lighter rounded tile with a soft inner edge
  for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) {
    const px = pad + x * S + 5, py = pad + z * S + 5, sz = S - 10;
    g.fillStyle = 'rgba(255,255,255,0.055)'; g.beginPath(); g.roundRect(px, py, sz, sz, 14); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.09)'; g.lineWidth = 2; g.stroke();
  }
  // the lot's frame
  g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 4; g.beginPath(); g.roundRect(pad - 2, pad - 2, W * S + 4, H * S + 4, 10); g.stroke();
  // cross-hatched bays under the planters
  g.strokeStyle = 'rgba(255,214,74,0.6)'; g.lineWidth = 3;
  for (let k = 0; k < walls.length; k++) if (walls[k]) { const x = pad + (k % W) * S, y = pad + Math.floor(k / W) * S; g.save(); g.beginPath(); g.rect(x + 4, y + 4, S - 8, S - 8); g.clip(); for (let d = -S; d < S * 2; d += 16) { g.beginPath(); g.moveTo(x + d, y); g.lineTo(x + d - S, y + S); g.stroke(); } g.restore(); }
  return ctex(c);
}
function paveTex(w: number, h: number): THREE.Texture {
  const S = 64; const { c, g } = cv(Math.round(w * S), Math.round(h * S));
  g.fillStyle = '#e9e3d6'; g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = 'rgba(150,140,120,0.35)'; g.lineWidth = 1.5;
  for (let x = 0; x < c.width; x += S * 0.5) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, c.height); g.stroke(); }
  for (let y = 0; y < c.height; y += S * 0.5) { g.beginPath(); g.moveTo(0, y); g.lineTo(c.width, y); g.stroke(); }
  const r = mulberry(5); for (let k = 0; k < c.width * c.height / 60; k++) { g.fillStyle = `rgba(120,110,95,${r() * 0.12})`; g.fillRect(r() * c.width, r() * c.height, 2, 2); }
  return ctex(c);
}
const roadTex = once(() => { const { c, g } = cv(512, 96); g.fillStyle = '#4b5059'; g.fillRect(0, 0, 512, 96); const r = mulberry(9); for (let k = 0; k < 2500; k++) { const v = 60 + r() * 50; g.fillStyle = `rgba(${v},${v},${v + 4},0.4)`; g.fillRect(r() * 512, r() * 96, 1.5, 1.5); } g.fillStyle = 'rgba(255,255,255,0.85)'; g.fillRect(0, 4, 512, 4); g.fillRect(0, 88, 512, 4); return ctex(c); });
const exitTex = once(() => { const { c, g } = cv(256, 128); g.fillStyle = 'rgba(255,255,255,0.92)'; for (let k = 0; k < 3; k++) { const x = 30 + k * 46; g.beginPath(); g.moveTo(x, 24); g.lineTo(x + 30, 64); g.lineTo(x, 104); g.lineTo(x + 16, 104); g.lineTo(x + 46, 64); g.lineTo(x + 16, 24); g.closePath(); g.fill(); } g.font = 'bold 30px sans-serif'; g.save(); g.translate(222, 64); g.rotate(Math.PI / 2); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('EXIT', 0, 0); g.restore(); return ctex(c); });
const stripeTex = once(() => { const { c, g } = cv(16, 128); for (let k = 0; k < 8; k++) { g.fillStyle = k % 2 ? '#ffffff' : '#e8483f'; g.fillRect(0, k * 16, 16, 16); } return ctex(c, 2); });
const signTex = once(() => { const { c, g } = cv(160, 80); g.fillStyle = '#1f8f4e'; g.fillRect(0, 0, 160, 80); g.strokeStyle = '#ffffff'; g.lineWidth = 4; g.strokeRect(5, 5, 150, 70); g.fillStyle = '#ffffff'; g.font = 'bold 34px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('EXIT', 64, 42); g.beginPath(); g.moveTo(118, 26); g.lineTo(144, 40); g.lineTo(118, 54); g.closePath(); g.fill(); return ctex(c, 4); });
const glowStripTex = once(() => { const { c, g } = cv(64, 128); const gr = g.createLinearGradient(0, 0, 64, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(255,255,255,0.85)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 128); return ctex(c, 2); });
const plankTex = once(() => { const { c, g } = cv(128, 64); g.fillStyle = '#b07a46'; g.fillRect(0, 0, 128, 64); g.strokeStyle = 'rgba(70,40,20,0.45)'; g.lineWidth = 2; for (let y = 16; y < 64; y += 16) { g.beginPath(); g.moveTo(0, y); g.lineTo(128, y); g.stroke(); } const r = mulberry(3); for (let k = 0; k < 120; k++) { g.fillStyle = `rgba(80,45,20,${r() * 0.25})`; g.fillRect(r() * 128, r() * 64, 6 + r() * 14, 1); } return ctex(c, 2); });
const coneTex = once(() => { const { c, g } = cv(32, 64); g.fillStyle = '#ff7a1a'; g.fillRect(0, 0, 32, 64); g.fillStyle = '#ffffff'; g.fillRect(0, 22, 32, 10); return ctex(c, 2); });
const ringTex = once(() => { const { c, g } = cv(128, 128); g.strokeStyle = '#ffffff'; g.lineWidth = 9; const r = 18; g.beginPath(); g.roundRect(8, 8, 112, 112, r); g.stroke(); g.globalAlpha = 0.25; g.fillStyle = '#ffffff'; g.fill(); return ctex(c, 2); });
const emoteCache = new Map<string, THREE.Texture>();
function emoteTex(kind: Emote): THREE.Texture {
  let t = emoteCache.get(kind); if (t) return t;
  const { c, g } = cv(96, 96);
  g.fillStyle = '#ffffff'; g.strokeStyle = 'rgba(0,0,0,0.12)'; g.lineWidth = 3;
  g.beginPath(); g.arc(48, 44, 34, 0, Math.PI * 2); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(38, 72); g.lineTo(46, 92); g.lineTo(56, 74); g.closePath(); g.fill();
  g.textAlign = 'center'; g.textBaseline = 'middle';
  const sym: Record<Emote, [string, string]> = { bang: ['!', '#e8483f'], huh: ['?!', '#e8590c'], heart: ['♥', '#ff4f8b'], star: ['★', '#f2b705'], note: ['♪', '#3d8bfd'], sweat: ['💧', '#3d8bfd'] };
  const [s, col] = sym[kind]; g.fillStyle = col; g.font = `bold ${s.length > 1 && kind !== 'sweat' ? 36 : 46}px sans-serif`; g.fillText(s, 48, 46);
  t = ctex(c, 2); emoteCache.set(kind, t); return t;
}
