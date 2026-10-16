/**
 * The 3D scenery of a Fuzzy Crossing WORLD level, built from its LevelDef rows and the world's theme: the ground strip of every row
 * (grass / snow / sand / pavement / neon, asphalt, water, rails, ice, hover lanes), banks, lane lines, obstacles, nests, far scenery,
 * and everything that switches on and off (traffic lights, level-crossing lights and barriers, lightning rings and bolts, laser gates,
 * rising water, teleport pads, the Titan), plus weather particles. The rules are in crossing/sim.ts; this file only draws them.
 */
import * as THREE from 'three';
import { COLS, GOAL, HOMES, START, type Crossing, type Lane, type Obj } from './crossing';
import * as S from '../crossing/sim';
import type { LevelDef, RowSpec } from '../crossing/sim';
import { WORLD_BY_N, type WorldTheme } from '../crossing/worlds';
import * as M from './models3d';
import * as T from './textures3d';
import * as WT from './worldTextures';
import * as WM from './worldModels3d';
import { wsfx } from './worldSounds';

const X0 = -40, X1 = 51;
export const WATER_Y = -0.18;

type Updater = (g: Crossing, t: number, dt: number) => void;

interface GroundLook { map: THREE.Texture; color?: string; rough: number; uv: [number, number] }
function groundLook(theme: WorldTheme): GroundLook {
  switch (theme.props) {
    case 'city': return { map: WT.pavement('#c9c6bf'), rough: 0.85, uv: [1, 1] };
    case 'snow': return { map: WT.ground('snow', '#eef4f8', ['rgba(200,220,235,0.5)', 'rgba(255,255,255,0.6)'], ['#ffffff', '#dfe9f0', '#cfdde8'], 61), rough: 0.75, uv: [2, 2] };
    case 'tropical': return { map: WT.ground('sand', '#ecd39a', ['rgba(214,180,110,0.45)', 'rgba(255,240,200,0.5)'], ['#f6e3b4', '#d9bc80', '#c9a86a', '#fff4d6'], 67), rough: 0.95, uv: [2, 2] };
    case 'neon': return { map: WT.neonGrid('#39e6ff', '#1c1d33'), rough: 0.35, uv: [1, 1] };
    case 'haunted': return { map: WT.ground('bog', '#46583f', ['rgba(30,40,28,0.5)', 'rgba(90,100,70,0.35)'], ['#3a4a33', '#56684a', '#2e3a29', '#647256'], 71, true), rough: 0.95, uv: [2, 2] };
    case 'storm': return { map: WT.ground('stormgrass', '#557f45', ['rgba(40,70,35,0.45)', 'rgba(110,130,80,0.35)'], ['#3f6b33', '#5f8a48', '#4a7a3b', '#2f5527'], 73, true), rough: 0.95, uv: [2, 2] };
    case 'legend': return { map: WT.ground('legend', '#7cbc5c', ['rgba(255,210,90,0.25)', 'rgba(60,110,40,0.35)'], ['#5f9d3f', '#8acb5f', '#4f8a33', '#a6d66a', '#f2d36b'], 79, true), rough: 0.9, uv: [2, 2] };
    case 'forest': return { map: WT.ground('forest', '#4f8f3a', ['rgba(40,80,30,0.45)', 'rgba(120,150,60,0.3)'], ['#3d7330', '#5c9a40', '#2f5a24', '#6aa84a'], 83, true), rough: 0.95, uv: [2, 2] };
    case 'rail': return { map: WT.ground('railgrass', '#8fb35a', ['rgba(150,140,80,0.35)', 'rgba(80,120,50,0.35)'], ['#7aa04a', '#9cbf62', '#6a8f3e', '#b5c87a'], 89, true), rough: 0.95, uv: [2, 2] };
    default: return { map: T.grass(), rough: 0.95, uv: [2, 2] };
  }
}

export class WorldScene {
  readonly group = new THREE.Group();
  readonly nests: { nest: THREE.Group; fuzzy: M.FuzzyModel }[] = [];
  readonly lamps: { light: THREE.PointLight; halo: THREE.Sprite }[] = [];
  readonly theme: WorldTheme;
  private ups: Updater[] = [];
  private waterMats: THREE.MeshPhysicalMaterial[] = [];
  private sparkTex: THREE.Texture;
  private flashLight = new THREE.PointLight(0xdfe8ff, 0, 40, 1.2);
  private weather: THREE.Points | null = null;
  private weatherVel: Float32Array | null = null;
  private trainWarn: boolean[] = [];
  private struck = new Set<string>();
  private nestLocks: THREE.Object3D[] = [];
  private materials = new Set<THREE.Material>();
  private textures = new Set<THREE.Texture>();

  constructor(readonly def: LevelDef, private mats: M.Mats, private mobile: boolean, skin: [string, string], sparkTex: THREE.Texture) {
    this.theme = WORLD_BY_N(def.world).theme;
    this.sparkTex = sparkTex;
    this.group.name = `world-${def.id}`;
    this.build(skin);
  }

  // ---------- helpers ----------
  private add<O extends THREE.Object3D>(o: O): O { this.group.add(o); return o; }
  private mat<Mt extends THREE.Material>(m: Mt): Mt { this.materials.add(m); return m; }
  private alt: THREE.MeshStandardMaterial | null = null;
  /** every other verge row a shade darker, so the rows read clearly */
  private altGround(m: THREE.Material): THREE.Material {
    if (!this.alt) { this.alt = this.mat((m as THREE.MeshStandardMaterial).clone()); this.alt.color.set(this.theme.props === 'neon' ? '#c8c8ff' : this.theme.props === 'snow' ? '#e2ecf3' : '#dfe8d2'); }
    return this.alt;
  }
  private plane(x0: number, x1: number, z0: number, z1: number, y: number, m: THREE.Material, uv: [number, number] = [1, 1]): THREE.Mesh {
    const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0).rotateX(-Math.PI / 2);
    const a = g.attributes.uv;
    for (let i = 0; i < a.count; i++) a.setXY(i, (a.getX(i) * (x1 - x0)) / uv[0], (a.getY(i) * (z1 - z0)) / uv[1]);
    const msh = new THREE.Mesh(g, m);
    msh.position.set((x0 + x1) / 2, y, (z0 + z1) / 2);
    msh.receiveShadow = true;
    return this.add(msh);
  }
  private slab(x0: number, x1: number, z0: number, z1: number, y0: number, y1: number, m: THREE.Material): THREE.Mesh {
    const msh = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), m);
    msh.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    msh.receiveShadow = msh.castShadow = true;
    return this.add(msh);
  }

  // ---------- build ----------
  private build(skin: [string, string]): void {
    const th = this.theme;
    const look = groundLook(th);
    const groundMat = this.mat(new THREE.MeshStandardMaterial({ map: look.map, roughness: look.rough, color: look.color ?? '#ffffff' }));
    const roadTex = T.asphalt();
    this.textures.add(roadTex.map); this.textures.add(roadTex.rough);
    const roadMat = this.mat(new THREE.MeshStandardMaterial({ map: roadTex.map, roughnessMap: roadTex.rough, roughness: 1, color: th.props === 'neon' ? '#7a7fa8' : th.props === 'haunted' ? '#9a9aa8' : '#ffffff' }));
    const stoneMat = this.mat(new THREE.MeshStandardMaterial({ map: T.stone(), roughness: 0.9, color: th.props === 'snow' ? '#dfe8ee' : th.props === 'neon' ? '#55597a' : '#ffffff' }));
    const wn = T.waterNormals();
    wn.repeat.set(18, 1);
    this.textures.add(wn);
    const deep = th.props === 'haunted' ? 0x253b2e : new THREE.Color(th.riverDeep).getHex();
    const waterMat = this.mat(new THREE.MeshPhysicalMaterial({ color: th.river, roughness: 0.07, normalMap: wn, normalScale: new THREE.Vector2(0.55, 0.55), transparent: true, opacity: 0.92, envMapIntensity: 1.25, clearcoat: 0.4 }));
    this.waterMats.push(waterMat);
    const bedMat = this.mat(new THREE.MeshStandardMaterial({ color: deep, roughness: 1 }));

    // far bank, near side, the start row and the nest row
    this.plane(-150, 160, -200, 1, 0, groundMat, look.uv);
    this.plane(X0, X1, 12, 60, 0, groundMat, look.uv);
    const rows = this.def.rows;
    for (const L of rows) this.buildRow(L, groundMat, roadMat, stoneMat, waterMat, bedMat, rows[L.row]);
    // lane lines between neighbouring road rows
    const lineMat = this.mat(new THREE.MeshBasicMaterial({ color: th.props === 'neon' ? '#39e6ff' : '#f2f2ea', transparent: true, opacity: th.props === 'neon' ? 0.8 : 0.7 }));
    for (const L of rows) {
      const below = rows[L.row]; // the row under this one (row + 1)
      if (L.surface === 'road' && below?.surface === 'road') {
        for (let x = -8; x < COLS + 8; x += 1.2) { const d = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.05).rotateX(-Math.PI / 2), lineMat); d.position.set(x, 0.006, L.row + 1); this.add(d); }
      }
      if (L.surface === 'road' && below?.surface !== 'road') this.slab(X0, X1, L.row + 0.97, L.row + 1.03, 0, 0.03, stoneMat);
      const above = rows[L.row - 2];
      if (L.surface === 'road' && L.row > 1 && above?.surface !== 'road') this.slab(X0, X1, L.row - 0.03, L.row + 0.03, 0, 0.03, stoneMat);
    }
    this.buildNests(skin);
    this.buildScenery();
    this.buildTeleports();
    if (this.def.weather !== 'none') this.buildWeather();
    this.flashLight.position.set(5.5, 12, 6);
    this.add(this.flashLight);
    if (this.def.world === 10 && this.def.milestone === 'boss') this.buildTitan();
  }

  private buildRow(L: RowSpec, groundMat: THREE.Material, roadMat: THREE.Material, stoneMat: THREE.Material, waterMat: THREE.Material, bedMat: THREE.Material, below?: RowSpec): void {
    const z0 = L.row, z1 = L.row + 1, th = this.theme;
    switch (L.surface) {
      case 'road': this.plane(X0, X1, z0, z1, 0.001, roadMat, [4, 5]); break;
      case 'river': {
        this.plane(X0, X1, z0, z1, -0.55, bedMat);
        this.plane(X0, X1, z0, z1, WATER_Y, waterMat);
        // stone banks where the water meets land
        const up = this.def.rows[L.row - 2];
        if (L.row === 1 || up?.surface !== 'river') this.slab(X0, X1, z0 - 0.04, z0 + 0.04, -0.6, 0.02, stoneMat);
        if (below?.surface !== 'river') this.slab(X0, X1, z1 - 0.04, z1 + 0.04, -0.6, 0.02, stoneMat);
        break;
      }
      case 'rail': this.buildRail(L, groundMat); break;
      case 'ice': {
        const m = this.mat(new THREE.MeshPhysicalMaterial({ map: WT.ice(), roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.4 }));
        this.plane(X0, X1, z0, z1, 0.004, m, [2, 1]);
        break;
      }
      case 'conveyor': {
        const tex = WT.conveyor(L.speed > 0 ? '#ff3d81' : '#39e6ff').clone();
        tex.needsUpdate = true;
        tex.repeat.set(L.speed > 0 ? 1 : -1, 1);
        this.textures.add(tex);
        const m = this.mat(new THREE.MeshStandardMaterial({ map: tex, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 0.6, roughness: 0.3 }));
        this.plane(X0, X1, z0 + 0.04, z1 - 0.04, 0.004, m, [2, 1]);
        this.ups.push((_g, t) => { tex.offset.x = (-S.disp(L, t) / 2) % 1; });
        break;
      }
      default: this.plane(X0, X1, z0, z1, 0.002, L.row % 2 ? groundMat : this.altGround(groundMat), groundLook(th).uv);
    }
    if (L.blocks) L.blocks.forEach((c, i) => { const b = WM.blocker(L.surface === 'ice' ? 'snowman' : L.blockKind ?? 'tree', th.props, L.row * 31 + c * 7 + i, this.mats); b.position.set(c + 0.5, 0, L.row + 0.5); b.rotation.y = (c * 1.7) % 6.28; this.add(b); });
    if (L.signal) this.buildSignal(L);
    if (L.lasers) this.buildLaser(L);
    if (L.strikes) this.buildStrikes(L);
    if (L.flood) this.buildFlood(L, waterMat);
    if (L.sink && L.objs.some((o) => o.kind === 'bridge')) { /* drawbridge lights are on the bridges themselves */ }
  }

  private buildRail(L: RowSpec, groundMat: THREE.Material): void {
    const z = L.row;
    this.plane(X0, X1, z, z + 1, 0.002, groundMat);
    const bal = WT.ballast();
    this.plane(X0, X1, z + 0.08, z + 0.92, 0.012, this.mat(new THREE.MeshStandardMaterial({ map: bal, roughness: 1 })), [2, 1]);
    const sleeperGeo = new THREE.BoxGeometry(0.16, 0.05, 0.86);
    const sleepers = new THREE.InstancedMesh(sleeperGeo, this.mat(new THREE.MeshStandardMaterial({ color: '#5a4030', roughness: 0.9 })), 150);
    const m4 = new THREE.Matrix4();
    let n = 0;
    for (let x = X0 + 15; x < X1 - 15 && n < 150; x += 0.42) sleepers.setMatrixAt(n++, m4.makeTranslation(x, 0.035, z + 0.5));
    sleepers.count = n;
    sleepers.receiveShadow = true;
    this.add(sleepers);
    const railMat = this.mat(new THREE.MeshStandardMaterial({ color: '#b9bec6', metalness: 0.9, roughness: 0.3 }));
    for (const dz of [0.27, 0.73]) this.slab(X0, X1, z + dz - 0.025, z + dz + 0.025, 0.04, 0.1, railMat);
    if (!L.train) return;
    // warning glow along the track + crossing signals with barriers at both ends of the board
    const glow = this.mat(new THREE.MeshBasicMaterial({ color: '#ff2a3d', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(COLS + 6, 0.9).rotateX(-Math.PI / 2), glow);
    strip.position.set(COLS / 2, 0.02, z + 0.5);
    this.add(strip);
    const sigs = [WM.crossingSignal(), WM.crossingSignal()];
    sigs[0].group.position.set(-0.85, 0, z + 0.98);
    sigs[1].group.position.set(COLS + 0.85, 0, z + 0.98);
    sigs[1].group.rotation.y = Math.PI;
    for (const s of sigs) this.add(s.group);
    let barrier = 0;
    const idx = this.trainWarn.length;
    this.trainWarn.push(false);
    this.ups.push((g, t, dt) => {
      const on = S.trainWarning(L, t);
      const blink = Math.floor(t * 4) % 2;
      for (const s of sigs) { s.lights[0].emissiveIntensity = on ? (blink ? 3 : 0.1) : 0.05; s.lights[1].emissiveIntensity = on ? (blink ? 0.1 : 3) : 0.05; }
      glow.opacity = on ? (blink ? 0.32 : 0.12) : 0;
      barrier += ((on ? 1 : 0) - barrier) * Math.min(1, dt * 4);
      for (const s of sigs) s.arm.rotation.z = (1 - barrier) * 1.35;
      if (on && !this.trainWarn[idx] && g.started && !g.over) wsfx.bell();
      if (on && blink && g.started && !g.over) wsfx.bell();
      this.trainWarn[idx] = on;
    });
  }

  private buildSignal(L: RowSpec): void {
    const tl = WM.trafficLight();
    const side = L.speed > 0 ? -0.9 : COLS + 0.9;
    tl.group.position.set(side, 0, L.row + 0.95);
    this.add(tl.group);
    const tl2 = WM.trafficLight();
    tl2.group.position.set(L.speed > 0 ? COLS + 0.9 : -0.9, 0, L.row + 0.95);
    this.add(tl2.group);
    const z = new THREE.Mesh(new THREE.PlaneGeometry(4, 0.9).rotateX(-Math.PI / 2), this.mat(new THREE.MeshBasicMaterial({ map: WT.zebra(), transparent: true, depthWrite: false })));
    z.position.set(5.5, 0.008, L.row + 0.5);
    this.add(z);
    // a small walk / don't-walk light right on the lane edge, so phones (narrower view) see it too
    const ped = this.mat(new THREE.MeshBasicMaterial({ color: '#36e07a', transparent: true, opacity: 0.0, depthWrite: false, blending: THREE.AdditiveBlending }));
    const band = new THREE.Mesh(new THREE.PlaneGeometry(4, 0.12).rotateX(-Math.PI / 2), ped);
    band.position.set(5.5, 0.012, L.row + 0.97);
    this.add(band);
    this.ups.push((_g, t) => {
      const s = S.signalLight(L, t);
      for (const x of [tl, tl2]) { x.red.emissiveIntensity = s === 'stop' ? 3 : 0.08; x.amber.emissiveIntensity = s === 'amber' ? 3 : 0.08; x.green.emissiveIntensity = s === 'go' ? 3 : 0.08; }
      ped.color.set(s === 'stop' ? '#36e07a' : s === 'amber' ? '#ffb020' : '#ff2a3d');
      ped.opacity = s === 'amber' ? 0.4 + 0.4 * (Math.floor(t * 4) % 2) : 0.55;
    });
  }

  private buildLaser(L: RowSpec): void {
    const l = L.lasers!;
    const post = this.mat(new THREE.MeshStandardMaterial({ color: '#2a2d44', metalness: 0.6, roughness: 0.3 }));
    const beamM = this.mat(new THREE.MeshBasicMaterial({ color: '#ff3d81', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    const floorM = this.mat(new THREE.MeshBasicMaterial({ color: '#ff3d81', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, map: this.sparkTex }));
    const x0 = Math.min(...l.cols), x1 = Math.max(...l.cols) + 1;
    for (const x of [x0 - 0.35, x1 + 0.35]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.95, 0.18), post);
      p.position.set(x, 0.48, L.row + 0.5); p.castShadow = true; this.add(p);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), beamM); cap.position.set(x, 0.98, L.row + 0.5); this.add(cap);
    }
    const beams: THREE.Mesh[] = [];
    for (const y of [0.25, 0.5, 0.75]) {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, x1 - x0 + 0.7, 8).rotateZ(Math.PI / 2), beamM);
      b.position.set((x0 + x1) / 2, y, L.row + 0.5);
      this.add(b); beams.push(b);
    }
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, 0.7).rotateX(-Math.PI / 2), floorM);
    floor.position.set((x0 + x1) / 2, 0.01, L.row + 0.5);
    this.add(floor);
    let was = 'off';
    this.ups.push((g, t) => {
      const s = S.laserState(L, t);
      const flick = Math.sin(t * 40) > 0 ? 1 : 0.4;
      beamM.opacity = s === 'on' ? 0.95 : s === 'warn' ? 0.25 * flick : 0.05;
      floorM.opacity = s === 'on' ? 0.5 : s === 'warn' ? 0.15 * flick : 0;
      for (const b of beams) b.scale.set(1, s === 'on' ? 2.2 : 1, s === 'on' ? 2.2 : 1);
      if (s === 'on' && was !== 'on' && g.started && !g.over && Math.abs(g.py - L.row) <= 3) wsfx.laser();
      was = s;
    });
  }

  private buildStrikes(L: RowSpec): void {
    const titan = this.def.world === 10 && L.token === 'stomp';
    const ringGeo = new THREE.RingGeometry(0.36, 0.48, 32).rotateX(-Math.PI / 2);
    const discGeo = new THREE.CircleGeometry(0.46, 28).rotateX(-Math.PI / 2);
    const color = titan ? '#ffb020' : '#9fd8ff';
    const pool: { ring: THREE.Mesh; disc: THREE.Mesh; bolt: THREE.Mesh; rm: THREE.MeshBasicMaterial; dm: THREE.MeshBasicMaterial; bm: THREE.MeshBasicMaterial }[] = [];
    for (let i = 0; i < 3; i++) {
      const rm = this.mat(new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
      const dm = this.mat(new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, map: this.sparkTex }));
      const bm = this.mat(new THREE.MeshBasicMaterial({ color: titan ? '#fff2c0' : '#e8f4ff', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
      const ring = new THREE.Mesh(ringGeo, rm), disc = new THREE.Mesh(discGeo, dm);
      const bolt = new THREE.Mesh(this.boltGeo(i + L.row * 3), bm);
      ring.renderOrder = disc.renderOrder = 3;
      this.add(ring); this.add(disc); this.add(bolt);
      pool.push({ ring, disc, bolt, rm, dm, bm });
    }
    this.ups.push((g, t) => {
      const st = S.strikesAt(L, t);
      pool.forEach((p, i) => {
        const s = st[i];
        if (!s) { p.rm.opacity = p.dm.opacity = p.bm.opacity = 0; return; }
        const x = s.col + 0.5, z = L.row + 0.5;
        const w = s.width;
        p.ring.position.set(x, 0.02, z); p.disc.position.set(x, 0.015, z);
        p.ring.scale.set(w * (1.15 - 0.15 * s.k), 1, 1.15 - 0.15 * s.k);
        p.disc.scale.set(w * (0.6 + 0.4 * s.k), 1, 0.6 + 0.4 * s.k);
        if (!s.hit) { p.rm.opacity = 0.35 + 0.55 * s.k * (0.75 + 0.25 * Math.sin(t * 30)); p.dm.opacity = 0.25 + 0.35 * s.k; p.bm.opacity = 0; }
        else {
          p.rm.opacity = 1; p.dm.opacity = 0.9; p.bm.opacity = titan ? 0 : 0.95;
          p.bolt.position.set(x, 0, z);
          const key = `${L.row}:${Math.round((t - (s.k === 1 ? 0 : 0)) * 0)}:${s.col}:${Math.floor((t - L.strikes!.phase) / L.strikes!.period)}`;
          if (!this.struck.has(key)) {
            this.struck.add(key);
            if (this.struck.size > 200) this.struck.clear();
            this.flashLight.position.set(x, 6, z + 1);
            this.flashLight.intensity = titan ? 30 : 60;
            this.flashLight.color.set(titan ? '#ffc070' : '#dfe8ff');
            if (g.started && !g.over && Math.abs(g.py - L.row) <= 4) { if (titan) wsfx.rumble(); else wsfx.thunder(); }
            if (titan) this.stompT = 0;
          }
        }
      });
    });
  }
  private stompT = 9;
  private boltGeo(seed: number): THREE.BufferGeometry {
    const r = T.rng(seed + 991);
    const pts: number[] = [];
    let x = 0, z = 0;
    for (let y = 9; y > 0; y -= 0.9) {
      const nx = x + (r() - 0.5) * 0.6, nz = z + (r() - 0.5) * 0.3;
      const y2 = Math.max(0, y - 0.9);
      pts.push(x - 0.05, y, z, x + 0.05, y, z, nx + 0.05, y2, nz, x - 0.05, y, z, nx + 0.05, y2, nz, nx - 0.05, y2, nz);
      x = nx; z = nz;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }

  private buildFlood(L: RowSpec, waterMat: THREE.Material): void {
    const m = this.mat((waterMat as THREE.MeshPhysicalMaterial).clone());
    m.opacity = 0;
    this.waterMats.push(m as THREE.MeshPhysicalMaterial);
    const w = this.plane(X0, X1, L.row, L.row + 1, -0.05, m);
    const foam = this.mat(new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false }));
    const edge = new THREE.Mesh(new THREE.PlaneGeometry(X1 - X0, 0.08).rotateX(-Math.PI / 2), foam);
    edge.position.set((X0 + X1) / 2, 0.02, L.row + 0.04);
    this.add(edge);
    let wet = false;
    this.ups.push((g, t) => {
      const lv = S.floodLevel(L, t);
      w.position.y = -0.04 + lv * 0.1;
      (m as THREE.MeshPhysicalMaterial).opacity = Math.min(0.9, lv * 1.1);
      foam.opacity = lv > 0.05 ? 0.35 + 0.25 * Math.sin(t * 6) : 0;
      edge.position.y = 0.02 + lv * 0.08;
      const nowWet = S.floodWet(L, t);
      if (nowWet && !wet && g.started && Math.abs(g.py - L.row) <= 3) wsfx.splashSoft();
      wet = nowWet;
    });
  }

  private buildNests(skin: [string, string]): void {
    const m = this.mats;
    const hedge = new THREE.Group();
    const snowy = this.theme.props === 'snow';
    const hedgeMat = this.mat(new THREE.MeshStandardMaterial({ map: T.leaves(), roughness: 0.9, color: this.theme.props === 'haunted' ? '#7d8a76' : snowy ? '#cfe0d8' : this.theme.props === 'neon' ? '#5a6a9a' : '#ffffff' }));
    for (let col = -8; col < COLS + 8; col++) {
      const i = HOMES.indexOf(col);
      if (i >= 0 && this.def.nests.includes(col)) continue;
      const b = new THREE.Mesh(M.bushGeometry(col + 40, col >= 0 && col < COLS ? 1 : 1.1), hedgeMat);
      b.position.set(col + 0.5, 0, 0.5);
      b.castShadow = b.receiveShadow = true;
      hedge.add(b);
    }
    this.add(hedge);
    HOMES.forEach((col) => {
      const open = this.def.nests.includes(col);
      const nest = open ? M.makeNest(m) : new THREE.Group();
      nest.position.set(col + 0.5, 0.02, 0.5);
      this.add(nest);
      const fuzzy = M.makeFuzzy(m, skin, 0.22, 0.07, 12);
      fuzzy.group.position.set(col + 0.5, 0.22, 0.52);
      fuzzy.group.visible = false;
      this.add(fuzzy.group);
      this.nests.push({ nest, fuzzy });
      if (open && this.def.goal.coins) {
        // Coin Rush: a little gate of golden bars until enough coins are in
        const lock = new THREE.Group();
        const gold = this.mat(new THREE.MeshPhysicalMaterial({ color: '#ffd23f', metalness: 1, roughness: 0.25, clearcoat: 1 }));
        for (let k = -2; k <= 2; k++) { const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.55, 8), gold); bar.position.set(k * 0.15, 0.28, 0.42); lock.add(bar); }
        const top = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.03, 8, 24, Math.PI), gold); top.position.set(0, 0.55, 0.42); lock.add(top);
        lock.position.set(col + 0.5, 0, 0.5);
        this.add(lock);
        this.nestLocks.push(lock);
      }
    });
  }

  private buildScenery(): void {
    const th = this.theme, m = this.mats;
    const r = T.rng(this.def.seed % 9973);
    const far = (i: number) => new THREE.Vector3(-14 + r() * 39, 0, -1.4 - r() * 8 - (i % 3));
    const near = () => { let x = -14 + r() * 39; if (x > -1.5 && x < 12.5) x += x < 5.5 ? -6 : 6; return new THREE.Vector3(x, 0, 13.6 + r() * 6); };
    const place = (o: THREE.Object3D, p: THREE.Vector3) => { o.position.copy(p); o.rotation.y = r() * 6.28; this.add(o); };
    const n = this.mobile ? 26 : 40;
    for (let i = 0; i < n; i++) {
      const p = i < n * 0.65 ? far(i) : near();
      switch (th.props) {
        case 'city': place(WM.building(i * 7 + 3, false), p.setZ(p.z < 0 ? p.z - 2 : p.z + 1.5)); break;
        case 'neon': place(WM.building(i * 5 + 11, true), p.setZ(p.z < 0 ? p.z - 2 : p.z + 1.5)); break;
        case 'snow': place(WM.pine(i * 3 + 1, true, 1.1), p); if (i % 7 === 0) place(WM.snowman(i), p.clone().add(new THREE.Vector3(1.2, 0, 0.4))); break;
        case 'tropical': place(i % 3 ? WM.palm(i * 13 + 5, 2 + r() * 1.4) : WM.rock(i, '#b9a27a', 1.4), p); break;
        case 'haunted': place(i % 2 ? WM.deadTree(i * 11) : WM.tombstone(i), p); if (i % 6 === 0) place(WM.lampPost('#ffb347', 1.6), p.clone().add(new THREE.Vector3(0.8, 0, 0))); break;
        case 'forest': place(i % 2 ? M.makeTree(m, i * 7 + 1, 1 + r() * 0.7) : WM.pine(i * 5, false, 1.4), p); break;
        case 'storm': place(i % 3 === 0 ? WM.rock(i, '#6f747b', 1.6) : M.makeTree(m, i * 7 + 2, 0.9 + r() * 0.5), p); break;
        case 'rail': place(M.makeTree(m, i * 7 + 4, 0.9 + r() * 0.6), p); break;
        case 'legend': place(i % 4 === 0 ? WM.crystal(i) : M.makeTree(m, i * 7 + 6, 1 + r() * 0.6), p); break;
        default: place(M.makeTree(m, i * 7 + 1, 0.9 + r() * 0.6), p);
      }
    }
    if (['meadow', 'forest', 'rail', 'storm', 'legend'].includes(th.props)) {
      const grass = M.makeGrass(this.mobile ? 4000 : 7000, [{ x0: -12, x1: 23, z0: -5, z1: 0.9 }, { x0: -12, x1: 23, z0: 13.05, z1: 19 }], this.def.seed % 100, { value: 0 });
      this.add(grass);
    }
    // street lamps on the start row (they light up at night)
    for (const [x, z] of [[-1.2, 12.6], [12.2, 12.6], [-1.2, 0.2], [12.2, 0.2]] as [number, number][]) {
      const lamp = M.makeLamp(m, x < 5 ? 1 : -1);
      lamp.group.position.set(x, 0, z);
      this.add(lamp.group);
      const head = lamp.head.clone().add(lamp.group.position);
      const light = new THREE.PointLight(th.props === 'neon' ? 0xff7ac2 : 0xffc77a, 0, 7, 1.6);
      light.position.copy(head);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.sparkTex, color: 0xffd08a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
      halo.position.copy(head); halo.scale.setScalar(1.1);
      this.add(light); this.add(halo);
      this.lamps.push({ light, halo });
    }
  }

  private buildTeleports(): void {
    const tex = this.sparkTex;
    for (const tp of this.def.teleports) {
      for (const [end, color] of [[tp.from, '#ff3d81'], [tp.to, '#39e6ff']] as [[number, number], string][]) {
        const g = new THREE.Group();
        const ringM = this.mat(new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending }));
        const ring = new THREE.Mesh(new THREE.RingGeometry(0.28, 0.38, 32).rotateX(-Math.PI / 2), ringM);
        const glowM = this.mat(new THREE.MeshBasicMaterial({ color, map: tex, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending }));
        const glow = new THREE.Mesh(new THREE.CircleGeometry(0.45, 24).rotateX(-Math.PI / 2), glowM);
        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.45, 0.05, 28), this.mat(new THREE.MeshStandardMaterial({ color: '#22243a', metalness: 0.6, roughness: 0.3 })));
        base.position.y = 0.025; ring.position.y = 0.06; glow.position.y = 0.055;
        g.add(base, glow, ring);
        g.position.set(end[1] + 0.5, 0, end[0] + 0.5);
        this.add(g);
        this.ups.push((_g, t) => { ring.rotation.y = t * 2; const s = 1 + Math.sin(t * 4 + end[1]) * 0.08; ring.scale.set(s, 1, s); glowM.opacity = 0.45 + 0.25 * Math.sin(t * 3); });
      }
    }
  }

  private buildTitan(): void {
    const t = WM.titan(this.mats);
    t.group.position.set(5.5, 0, -5.5);
    this.add(t.group);
    this.ups.push((_g, time, dt) => {
      this.stompT += dt;
      const k = this.stompT;
      // a hop and a big squash every time a stomp lands
      const up = k < 0.5 ? Math.sin((k / 0.5) * Math.PI) * 0.25 : 0;
      t.model.group.position.y = 1.9 + up + Math.sin(time * 1.4) * 0.05;
      const sq = k < 0.25 ? 1 - Math.sin((k / 0.25) * Math.PI) * 0.18 : 1;
      t.body.scale.set(2 - sq, sq, 2 - sq);
      t.model.face.rotation.x = -0.25;
      t.model.group.rotation.y = Math.sin(time * 0.6) * 0.25;
    });
  }

  private buildWeather(): void {
    const w = this.def.weather;
    const n = this.mobile ? 500 : 900;
    const pos = new Float32Array(n * 3), vel = new Float32Array(n * 3), col = new Float32Array(n * 3);
    const r = T.rng(this.def.seed % 777);
    const c = new THREE.Color();
    const palette: Record<string, string[]> = {
      rain: ['#bcd7ff'], storm: ['#bcd7ff'], snow: ['#ffffff'], leaves: ['#d98a2b', '#c9562a', '#e8b23a', '#8a9a3a'],
      petals: ['#ffc2dc', '#ffffff', '#ffd6e8'], fireflies: ['#fff3a0'], embers: ['#ffb347', '#ff7a1a', '#ffd27a'], mist: ['#e9edf5'],
    };
    for (let i = 0; i < n; i++) {
      pos.set([-6 + r() * 23, r() * 9, -4 + r() * 20], i * 3);
      const fall = w === 'rain' || w === 'storm' ? 9 + r() * 4 : w === 'snow' ? 0.6 + r() * 0.6 : w === 'embers' ? -(0.3 + r() * 0.5) : w === 'fireflies' ? 0 : w === 'mist' ? 0 : 0.5 + r() * 0.5;
      vel.set([(r() - 0.5) * (w === 'leaves' || w === 'petals' ? 1.2 : 0.3) + (w === 'storm' ? -2 : 0), -fall, (r() - 0.5) * 0.3], i * 3);
      c.set(palette[w]?.[i % (palette[w]?.length ?? 1)] ?? '#ffffff');
      col.set([c.r, c.g, c.b], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const size = w === 'rain' || w === 'storm' ? 0.06 : w === 'snow' ? 0.12 : w === 'mist' ? 2.4 : w === 'fireflies' ? 0.16 : 0.13;
    const mat = this.mat(new THREE.PointsMaterial({ size, map: this.sparkTex, vertexColors: true, transparent: true, opacity: w === 'mist' ? 0.09 : 0.85, depthWrite: false, blending: w === 'embers' || w === 'fireflies' ? THREE.AdditiveBlending : THREE.NormalBlending }));
    this.weather = new THREE.Points(geo, mat);
    this.weather.frustumCulled = false;
    this.weatherVel = vel;
    this.add(this.weather);
  }

  // ---------- per frame ----------
  update(g: Crossing, t: number, dt: number, look: THREE.Vector3): void {
    for (const m of this.waterMats) if (m.normalMap) { m.normalMap.offset.x = t * 0.012; m.normalMap.offset.y = t * 0.02; }
    for (const u of this.ups) u(g, g.wt, dt);
    this.flashLight.intensity *= Math.max(0, 1 - dt * 7);
    if (this.def.weather === 'storm' && Math.random() < dt * 0.12) { this.flashLight.position.set(look.x + (Math.random() - 0.5) * 10, 14, look.z - 6); this.flashLight.intensity = 25; }
    for (const l of this.nestLocks) l.visible = g.locked;
    if (this.weather && this.weatherVel) {
      const p = this.weather.geometry.attributes.position as THREE.BufferAttribute;
      const a = p.array as Float32Array, v = this.weatherVel;
      const w = this.def.weather;
      for (let i = 0; i < a.length; i += 3) {
        a[i] += v[i] * dt + (w === 'snow' || w === 'petals' || w === 'leaves' ? Math.sin(t * 1.3 + i) * 0.004 : 0);
        a[i + 1] += v[i + 1] * dt + (w === 'fireflies' ? Math.sin(t * 2 + i) * 0.005 : 0);
        a[i + 2] += v[i + 2] * dt;
        if (a[i + 1] < 0) a[i + 1] += 9;
        if (a[i + 1] > 9) a[i + 1] -= 9;
        const dx = a[i] - look.x, dz = a[i + 2] - look.z;
        if (dx < -12) a[i] += 24; else if (dx > 12) a[i] -= 24;
        if (dz < -10) a[i + 2] += 20; else if (dz > 10) a[i + 2] -= 20;
      }
      p.needsUpdate = true;
    }
  }

  /** place and animate one moving object of a world lane */
  place(node: THREE.Group, built: WM.Built, o: Obj, lane: Lane, g: Crossing, t: number): void {
    const L = lane.spec!, os = o.spec!;
    const cx = o.x + o.len / 2;
    node.visible = cx > -9 && cx < COLS + 9;
    if (!node.visible) return;
    const ph = node.userData.phase as number;
    const z = lane.row + 0.5;
    const dir = L.speed >= 0 ? 0 : Math.PI;
    switch (o.kind) {
      case 'log': node.position.set(cx, -0.1 + Math.sin(t * 1.6 + ph) * 0.018, z); node.rotation.x = Math.sin(t * 1.1 + ph) * 0.05; break;
      case 'pad': { const sink = g.sinkAmount(o); node.position.set(cx, WATER_Y + 0.012 + Math.sin(t * 1.3 + ph) * 0.008 - sink * 0.25, z); for (const m of built.mats ?? []) (m as THREE.MeshStandardMaterial).opacity = 1 - sink * 0.75; break; }
      case 'turtle': { const sink = g.sinkAmount(o); node.position.set(cx, WATER_Y + 0.02 - sink * 0.32 + Math.sin(t * 2 + ph) * 0.01, z); node.rotation.y = dir; for (const m of built.mats ?? []) (m as THREE.MeshStandardMaterial).opacity = 1 - sink * 0.8; break; }
      case 'boat': node.position.set(cx, WATER_Y + 0.02 + Math.sin(t * 1.4 + ph) * 0.025, z); node.rotation.set(Math.sin(t * 1.2 + ph) * 0.04, dir, Math.sin(t * 0.9 + ph) * 0.02); break;
      case 'raft': node.position.set(cx, WATER_Y + 0.06 + Math.sin(t * 1.5 + ph) * 0.015, z); node.rotation.y = Math.sin(t * 0.3 + ph) * 0.06; break;
      case 'bridge': {
        const sink = S.sinkAmount(L, os, g.wt);
        node.position.set(o.x + o.len / 2, WATER_Y + 0.12, z);
        const deck = built.parts?.deck;
        if (deck) deck.rotation.z = sink * 1.15;
        const warn = sink > 0 && sink < 0.99;
        for (const m of built.flash ?? []) (m as THREE.MeshStandardMaterial).emissiveIntensity = warn || sink >= 1 ? (Math.floor(t * 5) % 2 ? 3 : 0.2) : 0.15;
        break;
      }
      case 'ghost': {
        const a = S.ghostAlpha(L, os, g.wt);
        node.position.set(cx, 0.03 + Math.sin(t * 3 + ph) * 0.04, z); node.rotation.y = dir;
        const [body, eye] = built.mats ?? [];
        if (body) (body as THREE.MeshStandardMaterial).opacity = 0.08 + a * 0.82;
        if (eye) (eye as THREE.MeshBasicMaterial).opacity = 0.1 + a * 0.9;
        break;
      }
      case 'hover': node.position.set(cx, 0.06 + Math.sin(t * 4 + ph) * 0.04, z); node.rotation.y = dir; break;
      case 'ambulance': {
        node.position.set(cx, Math.abs(Math.sin(t * 9 + ph)) * 0.006, z); node.rotation.y = dir;
        const on = Math.floor(t * 6) % 2;
        const [red, blue] = built.flash ?? [];
        if (red) (red as THREE.MeshStandardMaterial).emissiveIntensity = on ? 3 : 0.2;
        if (blue) (blue as THREE.MeshStandardMaterial).emissiveIntensity = on ? 0.2 : 3;
        if (cx > -2 && cx < COLS + 2 && g.started && !g.over) wsfx.siren();
        break;
      }
      case 'train': node.position.set(cx, 0.02, z); node.rotation.y = dir; if (cx > -4 && cx < COLS + 4 && g.started && !g.over) wsfx.rumble(); break;
      case 'handcar': { node.position.set(cx, 0.04, z); node.rotation.y = dir; const bar = built.parts?.bar; if (bar) bar.rotation.z = Math.sin(t * 6 + ph) * 0.45; break; }
      case 'deer': {
        node.position.set(cx, Math.abs(Math.sin(t * 4 + ph)) * 0.03, z); node.rotation.y = dir;
        (node.userData.legs as THREE.Object3D[] | undefined)?.forEach((l, i) => { l.rotation.z = Math.sin(t * 7 + i * 1.7) * 0.35; });
        break;
      }
      case 'rabbit': { node.position.set(cx, 0, z); node.rotation.y = dir; const hb = node.userData.hopper as THREE.Object3D | undefined; if (hb) hb.position.y = Math.abs(Math.sin(t * 9 + ph)) * 0.22; break; }
      case 'bat': {
        node.position.set(cx, Math.sin(t * 3 + ph) * 0.12, z); node.rotation.y = dir;
        (node.userData.wings as THREE.Object3D[] | undefined)?.forEach((w, i) => { w.rotation.x = (i ? -1 : 1) * Math.sin(t * 18 + ph) * 0.7; });
        break;
      }
      case 'crab': node.position.set(cx, 0, z); node.rotation.y = -Math.PI / 2 + Math.sin(t * 5 + ph) * 0.15; break;
      case 'sled': node.position.set(cx, 0.01, z); node.rotation.y = dir; node.rotation.x = Math.sin(t * 6 + ph) * 0.04; break;
      default: node.position.set(cx, Math.abs(Math.sin(t * 9 + ph)) * 0.006, z); node.rotation.y = dir;
    }
  }

  /** height of what a Fuzzy stands on */
  groundY(g: Crossing, x: number, row: number): number {
    if (row === GOAL) return 0.05;
    if (row === START) return 0.01;
    const L = g.spec(row);
    if (!L) return 0.01;
    if (L.surface !== 'river') return L.surface === 'conveyor' ? 0.03 : 0.01;
    const c = x + 0.5;
    for (const o of L.objs) {
      const ox = S.objX(L, o, g.wt);
      if (c > ox && c < ox + o.len) {
        const sink = S.sinkAmount(L, o, g.wt);
        switch (o.kind) {
          case 'log': return 0.19;
          case 'boat': return 0.32;
          case 'raft': return 0.12;
          case 'turtle': return WATER_Y + 0.24 - sink * 0.32;
          case 'bridge': return WATER_Y + 0.28 + sink * 0.5;
          default: return WATER_Y + 0.02 - sink * 0.25;
        }
      }
    }
    return WATER_Y;
  }

  dispose(): void {
    this.group.traverse((o) => { if (o instanceof THREE.Mesh || o instanceof THREE.Points || o instanceof THREE.InstancedMesh) o.geometry.dispose(); });
    for (const m of this.materials) m.dispose();
    for (const t of this.textures) t.dispose();
    this.group.removeFromParent();
  }
}
