/**
 * Realistic 3D look for Fuzzy Crossing (Three.js): physically based materials, a real sky that lights and
 * reflects in the scene, soft sun shadows, rippling water, swaying grass, glossy cars and furry Fuzzies.
 * The time of day changes with each level: day → golden hour → dusk (headlights and street lamps on).
 */
import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { COLS, GOAL, HOMES, MEDIAN, START, type Crossing, type Fx, type Lane, type Obj, type View } from './crossing';
import * as T from './textures3d';
import * as M from './models3d';
import { sfx } from './sound';

const WORLD_X0 = -40, WORLD_X1 = 51;
const CAM_H = 7.4, CAM_BACK = 5.8;
/** Intro timeline in seconds. */
const INTRO = { blink: 0.4, winkIn: 1.0, winkOut: 1.6, pullBack: 1.75, bounce: 2.05, swoop: 2.75, end: 4.35 };
const ease = (k: number) => { k = THREE.MathUtils.clamp(k, 0, 1); return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; };
/** 0→1→0 envelope over [a, b] with soft edges. */
const bump = (t: number, a: number, b: number, soft = 0.12) => Math.min(THREE.MathUtils.smoothstep(t, a, a + soft), 1 - THREE.MathUtils.smoothstep(t, b - soft, b));
const WATER_Y = -0.18;
const CURB = 0.07;

interface Mood { name: string; elevation: number; azimuth: number; turbidity: number; rayleigh: number; mie: number; sun: string; sunI: number; hemiSky: string; hemiGround: string; hemiI: number; fog: string; exposure: number; env: number; night: number }
const MOODS: Mood[] = [
  { name: 'day', elevation: 48, azimuth: 215, turbidity: 4, rayleigh: 1.1, mie: 0.004, sun: '#fff1dc', sunI: 3.2, hemiSky: '#a9c8f0', hemiGround: '#3f4a2a', hemiI: 0.45, fog: '#cfdbe4', exposure: 0.62, env: 0.4, night: 0 },
  { name: 'golden', elevation: 12, azimuth: 250, turbidity: 8, rayleigh: 2.2, mie: 0.01, sun: '#ffab5e', sunI: 3.0, hemiSky: '#f3c08e', hemiGround: '#3a2e1f', hemiI: 0.35, fog: '#e3c4a6', exposure: 0.6, env: 0.35, night: 0.25 },
  { name: 'dusk', elevation: 3, azimuth: 285, turbidity: 3, rayleigh: 0.8, mie: 0.003, sun: '#9fb3ff', sunI: 0.9, hemiSky: '#4b5a8a', hemiGround: '#1a1c28', hemiI: 0.3, fog: '#252d45', exposure: 0.85, env: 0.35, night: 1 },
];

interface Pop { obj: THREE.Object3D; vel: THREE.Vector3; life: number; max: number; kind: 'drop' | 'spark' | 'text' | 'ring' | 'puff'; grow?: number }

export class View3D implements View {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1200);
  private mats = M.makeMaterials();
  private sun = new THREE.DirectionalLight(0xffffff, 2.5);
  private hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
  private sky = new Sky();
  private pmrem: THREE.PMREMGenerator;
  private envRT: THREE.WebGLRenderTarget | null = null;
  private mood = -1;
  private sunDir = new THREE.Vector3();
  private time = { value: 0 };
  private water!: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshPhysicalMaterial>;
  private lamps: { light: THREE.PointLight; halo: THREE.Sprite }[] = [];
  private objs = new Map<number, { node: THREE.Group; mats?: THREE.Material[]; obj: Obj; lane: Lane }>();
  private tokens = new Map<number, { model: M.FuzzyModel; aura: THREE.Sprite }>();
  private nests: { nest: THREE.Group; fuzzy: M.FuzzyModel }[] = [];
  private player!: M.FuzzyModel;
  private playerSkin = '';
  private pops: Pop[] = [];
  private camPos = new THREE.Vector3(5.5, 10, 18);
  private camLook = new THREE.Vector3(5.5, 0, 10);
  private shake = 0;
  private halfW = 6.4;
  private gameFov = 50;
  private intro: { t: number; done: () => void; sparkled: boolean; hearted: boolean; winked: boolean; whooshed: boolean } | null = null;
  private lastP = new THREE.Vector3();
  private vel = new THREE.Vector3();
  private furLag = new THREE.Vector3();
  private landSquash = 0;
  private wasHopping = false;
  private dropGeo = new THREE.SphereGeometry(1, 8, 6);
  private dropMat = new THREE.MeshStandardMaterial({ color: 0xdff4ff, roughness: 0.05, transparent: true, opacity: 0.8 });
  private sparkTex = T.glow('rgba(255,255,255,1)', 'rgba(255,255,255,0)');
  private ringGeo = new THREE.RingGeometry(0.85, 1, 40).rotateX(-Math.PI / 2);
  private disposed = false;

  constructor(private canvas: HTMLCanvasElement, mobile: boolean) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.75 : 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.pmrem = new THREE.PMREMGenerator(this.renderer);
    canvas.classList.add('real');

    const s = this.sun;
    s.castShadow = true;
    s.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
    Object.assign(s.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 60 });
    s.shadow.bias = -0.0004;
    s.shadow.normalBias = 0.025;
    s.shadow.radius = 3;
    this.scene.add(s, s.target, this.hemi);
    this.sky.scale.setScalar(900);

    this.buildWorld();
    this.resize();
  }

  // ---------- world ----------
  private plane(x0: number, x1: number, z0: number, z1: number, y: number, mat: THREE.Material, uvScale: [number, number]): THREE.Mesh {
    const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0).rotateX(-Math.PI / 2);
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (x1 - x0) / uvScale[0], uv.getY(i) * (z1 - z0) / uvScale[1]);
    const m = new THREE.Mesh(g, mat);
    m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2);
    m.receiveShadow = true;
    this.scene.add(m);
    return m;
  }

  private slab(x0: number, x1: number, z0: number, z1: number, y0: number, y1: number, mat: THREE.Material): THREE.Mesh {
    const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (x1 - x0), uv.getY(i));
    const m = new THREE.Mesh(g, mat);
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    m.receiveShadow = true;
    m.castShadow = true;
    this.scene.add(m);
    return m;
  }

  private buildWorld(): void {
    const grassMat = new THREE.MeshStandardMaterial({ map: T.grass(), roughness: 0.95 });
    const concreteMat = new THREE.MeshStandardMaterial({ map: T.concrete(), roughness: 0.85 });
    const curbMat = new THREE.MeshStandardMaterial({ map: T.concrete(false), roughness: 0.8, color: 0xd8d6d0 });
    const stoneMat = new THREE.MeshStandardMaterial({ map: T.stone(), roughness: 0.9 });
    const road = T.asphalt();
    const roadMat = new THREE.MeshStandardMaterial({ map: road.map, roughnessMap: road.rough, roughness: 1, metalness: 0 });

    // far bank (behind the nests) and the near side
    this.plane(-150, 160, -200, 1, 0, grassMat, [2, 2]);
    this.plane(WORLD_X0, WORLD_X1, 13, 60, 0, grassMat, [2, 2]);
    // river: stone banks, a dark bed and the water surface
    this.slab(WORLD_X0, WORLD_X1, 0.92, 1.0, -0.6, 0.02, stoneMat);
    this.slab(WORLD_X0, WORLD_X1, 6.0, 6.08, -0.6, CURB, stoneMat);
    this.plane(WORLD_X0, WORLD_X1, 1, 6, -0.55, new THREE.MeshStandardMaterial({ color: 0x1b2a22, roughness: 1 }), [4, 4]);
    const wn = T.waterNormals();
    wn.repeat.set(18, 2);
    this.water = this.plane(WORLD_X0, WORLD_X1, 1, 6, WATER_Y, new THREE.MeshPhysicalMaterial({
      color: 0x0d4a57, roughness: 0.07, metalness: 0, normalMap: wn, normalScale: new THREE.Vector2(0.55, 0.55),
      transparent: true, opacity: 0.93, envMapIntensity: 1.25, clearcoat: 0.4,
    }), [1, 1]) as THREE.Mesh<THREE.PlaneGeometry, THREE.MeshPhysicalMaterial>;
    // median sidewalk, road, start sidewalk with curbs
    this.slab(WORLD_X0, WORLD_X1, 6.08, 6.9, 0, CURB, concreteMat);
    this.slab(WORLD_X0, WORLD_X1, 6.9, 7.0, 0, CURB + 0.01, curbMat);
    const roadPlane = this.plane(WORLD_X0, WORLD_X1, 7, 12, 0, roadMat, [4, 5]);
    roadPlane.geometry.attributes.uv.needsUpdate = true;
    this.slab(WORLD_X0, WORLD_X1, 12.0, 12.1, 0, CURB + 0.01, curbMat);
    this.slab(WORLD_X0, WORLD_X1, 12.1, 13.0, 0, CURB, concreteMat);

    // hedges between the nests, nests, trees, lamps
    const m = this.mats;
    const hedge = new THREE.Group();
    for (let col = -8; col < COLS + 8; col++) {
      if (HOMES.includes(col)) continue;
      const b = new THREE.Mesh(M.bushGeometry(col + 40, col >= 0 && col < COLS ? 1 : 1.1), (col & 1) ? m.leaves : m.darkLeaves);
      b.position.set(col + 0.5, 0, 0.5);
      b.castShadow = b.receiveShadow = true;
      hedge.add(b);
    }
    this.scene.add(hedge);
    for (const col of HOMES) {
      const nest = M.makeNest(m);
      nest.position.set(col + 0.5, 0.02, 0.5);
      this.scene.add(nest);
      const fuzzy = M.makeFuzzy(m, ['#ff7ac2', '#8b5cff'], 0.22, 0.07, 12);
      fuzzy.group.position.set(col + 0.5, 0.22, 0.52);
      fuzzy.group.visible = false;
      this.scene.add(fuzzy.group);
      this.nests.push({ nest, fuzzy });
    }
    const r = T.rng(77);
    for (let i = 0; i < 46; i++) {
      const tree = M.makeTree(m, i * 7 + 1, 0.9 + r() * 0.6);
      const far = i < 30;
      tree.position.set(-14 + r() * 39, 0, far ? -1.2 - r() * 7 : 13.6 + r() * 6);
      if (!far && tree.position.x > -1.5 && tree.position.x < 12.5) tree.position.x += tree.position.x < 5.5 ? -6 : 6;
      tree.rotation.y = r() * 6.28;
      this.scene.add(tree);
    }
    for (const [x, z] of [[-1.2, 6.5], [12.2, 6.5], [-1.2, 12.6], [12.2, 12.6]] as [number, number][]) {
      const lamp = M.makeLamp(m, x < 5 ? 1 : -1);
      lamp.group.position.set(x, CURB, z);
      this.scene.add(lamp.group);
      const head = lamp.head.clone().add(lamp.group.position);
      const light = new THREE.PointLight(0xffc77a, 0, 7, 1.6);
      light.position.copy(head);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.sparkTex, color: 0xffd08a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
      halo.position.copy(head);
      halo.scale.setScalar(1.1);
      this.scene.add(light, halo);
      this.lamps.push({ light, halo });
    }
    this.scene.add(M.makeGrass(9000, [
      { x0: -12, x1: 23, z0: -5, z1: 0.9 },
      { x0: -12, x1: 23, z0: 13.05, z1: 19 },
    ], 5, this.time));
  }

  private setMood(level: number): void {
    const idx = (level - 1) % MOODS.length;
    if (idx === this.mood) return;
    this.mood = idx;
    const md = MOODS[idx];
    const u = this.sky.material.uniforms;
    u.turbidity.value = md.turbidity;
    u.rayleigh.value = md.rayleigh;
    u.mieCoefficient.value = md.mie;
    u.mieDirectionalG.value = 0.8;
    this.sunDir.setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - md.elevation), THREE.MathUtils.degToRad(md.azimuth));
    u.sunPosition.value.copy(this.sunDir);
    // reflections & ambient light come from the sky itself
    const skyScene = new THREE.Scene();
    skyScene.add(this.sky);
    this.envRT?.dispose();
    this.envRT = this.pmrem.fromScene(skyScene, 0, 0.1, 1000);
    this.scene.environment = this.envRT.texture;
    this.scene.add(this.sky); // the same sky is also visible above the horizon
    this.scene.environmentIntensity = md.env;
    this.sun.color.set(md.sun);
    this.sun.intensity = md.sunI;
    // at dusk the "sun" is soft moonlight from higher up so shadows stay readable
    if (md.night >= 1) this.sunDir.setFromSphericalCoords(1, THREE.MathUtils.degToRad(40), THREE.MathUtils.degToRad(md.azimuth));
    this.hemi.color.set(md.hemiSky);
    this.hemi.groundColor.set(md.hemiGround);
    this.hemi.intensity = md.hemiI;
    this.scene.background = new THREE.Color(md.fog);
    this.scene.fog = new THREE.Fog(md.fog, 22, 70);
    this.renderer.toneMappingExposure = md.exposure;
    const n = md.night;
    this.mats.head.emissiveIntensity = 0.8 + n * 3;
    this.mats.tail.emissiveIntensity = 0.6 + n * 2;
    this.mats.beam.opacity = n * 0.9;
    this.mats.bulb.emissiveIntensity = 0.2 + n * 4;
    for (const l of this.lamps) { l.light.intensity = n * 6; (l.halo.material as THREE.SpriteMaterial).opacity = n * 0.6; }
  }

  // ---------- View interface ----------
  resize(): void {
    const r = this.canvas.parentElement!.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width)), hh = Math.max(1, Math.round(r.height));
    this.renderer.setSize(w, hh, true);
    this.camera.aspect = w / hh;
    // Wide screens fit the whole 11-column board across; tall phone screens show ~9.5 columns and pan with the player.
    const dist = Math.hypot(CAM_H, CAM_BACK);
    this.halfW = THREE.MathUtils.clamp(4.75 + (this.camera.aspect - 0.7) * 3.5, 4.75, 6.4);
    const hfov = 2 * Math.atan(this.halfW / dist);
    const vfov = 2 * Math.atan(Math.tan(hfov / 2) / this.camera.aspect);
    this.gameFov = THREE.MathUtils.clamp(THREE.MathUtils.radToDeg(vfov), 34, 78);
    this.camera.fov = this.gameFov;
    this.camera.updateProjectionMatrix();
  }

  // ---------- intro: close-up, wink, pull back to show the fur, swoop out to the game ----------
  playIntro(_g: Crossing, done: () => void): void {
    this.intro = { t: 0, done, sparkled: false, hearted: false, winked: false, whooshed: false };
  }

  skipIntro(): void {
    if (this.intro) this.intro.t = INTRO.end;
  }

  reset(g: Crossing): void {
    for (const o of this.objs.values()) { this.scene.remove(o.node); o.mats?.forEach((m) => m.dispose()); }
    this.objs.clear();
    for (const t of this.tokens.values()) this.scene.remove(t.model.group, t.aura);
    this.tokens.clear();
    for (const lane of g.lanes) for (const o of lane.objs) {
      let node: THREE.Group, mats: THREE.Material[] | undefined;
      if (o.kind === 'log') node = M.makeLog(this.mats, o.len);
      else if (o.kind === 'pad') { const p = M.makePads(this.mats, o.len, o.id % 3 !== 0, o.id); node = p.group; mats = p.mats; }
      else {
        const trailers = ['#eceff2', '#d9dde2', '#f5f1e6', o.color];
        node = M.makeVehicle(this.mats, o.kind, o.kind === 'bus' ? ['#f2b705', '#e63946', '#1d6fd8', '#2a9d8f'][o.id % 4] : o.color, trailers[o.id % trailers.length]);
        node.rotation.y = lane.speed > 0 ? 0 : Math.PI;
      }
      node.userData.phase = (o.id * 1.7) % 6.28;
      this.scene.add(node);
      this.objs.set(o.id, { node, mats, obj: o, lane });
    }
    this.setMood(g.level);
    this.ensurePlayer(g);
  }

  private ensurePlayer(g: Crossing): void {
    if (this.playerSkin === g.skin.id) return;
    if (this.player) this.scene.remove(this.player.group);
    this.player = M.makeFuzzy(this.mats, g.skin.colors, 0.27, 0.095, 20);
    this.player.body.children[0].castShadow = true;
    this.scene.add(this.player.group);
    this.playerSkin = g.skin.id;
    for (const n of this.nests) {
      this.scene.remove(n.fuzzy.group);
      const pos = n.fuzzy.group.position.clone();
      n.fuzzy = M.makeFuzzy(this.mats, g.skin.colors, 0.22, 0.07, 12);
      n.fuzzy.group.position.copy(pos);
      n.fuzzy.group.visible = false;
      this.scene.add(n.fuzzy.group);
    }
  }

  destroy(): void {
    this.disposed = true;
    this.envRT?.dispose();
    this.pmrem.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.scene.traverse((o) => { if (o instanceof THREE.Mesh) o.geometry.dispose(); });
  }

  /** Height of whatever the fuzzy is standing on at a given column/row. */
  private groundY(g: Crossing, x: number, row: number): number {
    if (row === MEDIAN || row === START) return CURB;
    if (row === GOAL) return 0.05;
    if (!g.onRiver(row)) return 0;
    const lane = g.laneAt(row)!;
    const c = x + 0.5;
    const o = lane.objs.find((ob) => c > ob.x && c < ob.x + ob.len);
    if (!o) return WATER_Y;
    return o.kind === 'log' ? 0.19 : WATER_Y + 0.02 - g.sinkAmount(o) * 0.25;
  }

  render(g: Crossing, dt: number): void {
    if (this.disposed) return;
    this.time.value += dt;
    const t = this.time.value;
    this.ensurePlayer(g);

    // water drift
    const wn = this.water.material.normalMap!;
    wn.offset.x = t * 0.012;
    wn.offset.y = t * 0.02;

    // lane objects
    for (const { node, mats, obj: o, lane } of this.objs.values()) {
      const cx = o.x + o.len / 2;
      node.visible = cx > -7 && cx < COLS + 7;
      if (!node.visible) continue;
      const ph = node.userData.phase as number;
      if (o.kind === 'log') {
        node.position.set(cx, -0.1 + Math.sin(t * 1.6 + ph) * 0.018, lane.row + 0.5);
        node.rotation.x = Math.sin(t * 1.1 + ph) * 0.05;
      } else if (o.kind === 'pad') {
        const sink = g.sinkAmount(o);
        node.position.set(cx, WATER_Y + 0.012 + Math.sin(t * 1.3 + ph) * 0.008 - sink * 0.25, lane.row + 0.5);
        for (const m of mats!) (m as THREE.MeshStandardMaterial).opacity = 1 - sink * 0.75;
      } else {
        node.position.set(cx, Math.abs(Math.sin(t * 9 + ph)) * 0.006, lane.row + 0.5);
      }
    }

    // Fuzzies to collect
    const live = new Set<number>();
    for (const tk of g.tokens) {
      live.add(tk.id);
      let v = this.tokens.get(tk.id);
      if (!v) {
        const colors: [string, string] = tk.gold ? ['#fff1a8', '#d99a00'] : ['#ffc0e4', '#ff4f9a'];
        const model = M.makeFuzzy(this.mats, colors, 0.12, 0.045, 9, { mouth: true, metallic: tk.gold });
        model.face.rotation.x = -0.55;
        const aura = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.sparkTex, color: tk.gold ? 0xffd34d : 0xff7ac2, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.55 }));
        aura.scale.setScalar(tk.gold ? 0.9 : 0.65);
        this.scene.add(model.group, aura);
        v = { model, aura };
        this.tokens.set(tk.id, v);
      }
      const base = tk.obj ? this.groundY(g, tk.x, tk.row) : g.onRiver(tk.row) ? 0.19 : tk.row === MEDIAN ? CURB : 0;
      const y = base + 0.2 + Math.sin(t * 4 + tk.id) * 0.05;
      v.model.group.position.set(tk.x + 0.5, y, tk.row + 0.5);
      v.model.group.rotation.y = Math.sin(t * 1.5 + tk.id) * 0.6;
      v.aura.position.set(tk.x + 0.5, y, tk.row + 0.5);
      const blink = tk.life - tk.age < 2 ? (Math.sin(tk.age * 18) > 0 ? 1 : 0.25) : 1;
      v.model.group.visible = blink > 0.5 || tk.life - tk.age >= 2;
      (v.aura.material as THREE.SpriteMaterial).opacity = (tk.gold ? 0.75 : 0.5) * blink * (0.8 + Math.sin(t * 6 + tk.id) * 0.2);
    }
    for (const [id, v] of this.tokens) if (!live.has(id)) { this.scene.remove(v.model.group, v.aura); this.tokens.delete(id); }

    // nests
    this.nests.forEach((n, i) => {
      n.fuzzy.group.visible = g.homes[i];
      if (g.homes[i]) { n.fuzzy.body.scale.y = 1 + Math.sin(t * 3 + i) * 0.03; n.fuzzy.face.rotation.x = -0.6; }
    });

    if (this.intro) this.intro.t += dt;
    this.updatePlayer(g, dt, t);
    this.updatePops(dt);
    this.updateCamera(g, dt);
    if (this.intro && this.intro.t >= INTRO.end) { const done = this.intro.done; this.intro = null; this.resetFace(); done(); }
    this.renderer.render(this.scene, this.camera);
  }

  private updatePlayer(g: Crossing, dt: number, t: number): void {
    const P = this.player;
    const [vx, vy, lift] = g.visualPos();
    const d = g.dying;
    let base: number;
    if (g.hop) {
      const a = this.groundY(g, g.hop.fx, g.hop.fy), b = this.groundY(g, g.hop.tx, g.hop.ty);
      const k = Math.min(1, g.hop.t);
      base = a + (b - a) * k;
    } else base = this.groundY(g, vx, Math.round(vy));
    const restY = base + P.radius * 0.92;
    let y = restY + lift * 0.5;
    let sx = 1, sy = 1;
    if (g.hop) { sy = 1 + lift * 0.14; sx = 1 - lift * 0.06; }
    if (this.wasHopping && !g.hop) this.landSquash = 1;
    this.wasHopping = !!g.hop;
    this.landSquash = Math.max(0, this.landSquash - dt * 6);
    if (this.landSquash > 0) { sy *= 1 - this.landSquash * 0.18; sx *= 1 + this.landSquash * 0.1; y -= this.landSquash * 0.04; }
    // idle breathing
    if (!g.hop && !d) sy *= 1 + Math.sin(t * 3) * 0.015;
    P.group.visible = true;
    if (d) {
      if (d.kind === 'splash') { y = restY - Math.min(1, d.t * 1.4) * 0.6; sx = sy = Math.max(0.01, 1 - d.t * 0.6); }
      else if (d.kind === 'time') { sx = sy = Math.max(0.01, 1 - d.t); }
      else { sy = Math.max(0.12, 1 - d.t * 5); sx = 1 + Math.min(1, d.t * 5) * 0.45; y = base + P.radius * sy * 0.92; }
      if (d.t > 1.05) P.group.visible = false;
    }
    const it = this.intro;
    if (it) {
      // happy little bounce while the camera shows off the fur
      const b = it.t - INTRO.bounce;
      if (b > 0 && b < 0.55) { const h = Math.sin((b / 0.55) * Math.PI); y += h * 0.32; sy *= 1 + h * 0.12; sx *= 1 - h * 0.05; }
      if (b > 0.55 && b < 0.75) { const q = Math.sin(((b - 0.55) / 0.2) * Math.PI); sy *= 1 - q * 0.16; sx *= 1 + q * 0.09; }
      if (b > 0 && !it.hearted) { it.hearted = true; sfx.boing(); }
      if (b > 0.5 && b < 0.6 && !it.sparkled) { it.sparkled = true; this.text('💖', '#fff', vx + 0.5 + 0.35, y + 0.45, vy + 0.5, 0.75, 1.2, true); }
    }
    P.group.position.set(vx + 0.5, y, vy + 0.5);
    P.body.scale.set(sx, sy, sx);

    // fur lags behind movement for a soft, physical feel
    const pos = P.group.position;
    if (dt > 0) {
      this.vel.subVectors(pos, this.lastP).divideScalar(dt);
      if (this.vel.length() > 20) this.vel.set(0, 0, 0); // teleport (respawn)
    }
    this.lastP.copy(pos);
    this.furLag.lerp(this.vel.clone().multiplyScalar(-0.012), Math.min(1, dt * 10));
    P.shells.forEach((s, i) => { const k = ((i + 1) / P.shells.length) ** 2; s.position.copy(this.furLag).multiplyScalar(k); });

    if (it) { this.introFace(it.t, vx + 0.5, y, vy + 0.5); return; }
    // face looks up at the camera; pupils look where we're heading
    const yaw = g.facing === 'left' ? -0.45 : g.facing === 'right' ? 0.45 : 0;
    P.face.rotation.y += (yaw - P.face.rotation.y) * Math.min(1, dt * 10);
    P.face.rotation.x = -0.6 + (g.facing === 'up' ? -0.08 : g.facing === 'down' ? 0.15 : 0);
    const look = { up: [0, 0.018], down: [0, -0.02], left: [-0.02, 0], right: [0.02, 0] }[g.facing];
    for (const p of P.pupils) { p.userData.base ??= p.position.clone(); p.position.set(p.userData.base.x + look[0], p.userData.base.y + look[1], p.userData.base.z); }
  }

  /** Blink, then a cheeky wink with a big smile, head tilt and a sparkle. */
  private introFace(t: number, x: number, y: number, z: number): void {
    const P = this.player;
    const it = this.intro!;
    // keep looking into the lens while the camera orbits
    P.face.rotation.x = -0.6;
    P.face.rotation.y = 0.5 * ease((t - INTRO.pullBack) / 0.9) * (1 - ease((t - INTRO.swoop) / 1.2));
    for (const p of P.pupils) { p.userData.base ??= p.position.clone(); p.position.copy(p.userData.base); }
    const blink = bump(t, INTRO.blink, INTRO.blink + 0.16, 0.06);
    const wink = bump(t, INTRO.winkIn, INTRO.winkOut, 0.08);
    P.eyes.forEach((e, i) => {
      const closed = i === 1 ? Math.max(blink, wink) : blink;
      e.open.scale.y = Math.max(0.06, 1 - closed);
      // the wink eye turns into a happy "^"
      const happy = i === 1 && wink > 0.6;
      e.open.visible = !happy;
      e.lid.visible = happy;
    });
    if (P.mouth) P.mouth.scale.set(1 + wink * 0.35, 1 + wink * 0.25, 1);
    P.body.rotation.z = -0.2 * wink;
    if (wink > 0.6 && !it.winked) {
      it.winked = true;
      sfx.wink();
      // sparkle next to the winking eye
      const n = new THREE.Vector3(0, Math.sin(0.6), Math.cos(0.6));
      const eye = new THREE.Vector3(x + 0.17, y + 0.12, z).addScaledVector(n, P.radius * 0.9);
      this.text('✨', '#fff', eye.x + 0.16, eye.y + 0.08, eye.z, 0.42, 1.0, true);
      this.sparks(eye.x + 0.1, eye.y, eye.z, 0xfff3b0, 8, 0.3);
    }
  }

  private resetFace(): void {
    const P = this.player;
    P.eyes.forEach((e) => { e.open.scale.y = 1; e.open.visible = true; e.lid.visible = false; });
    P.mouth?.scale.set(1, 1, 1);
    P.body.rotation.z = 0;
  }

  /** Camera pose for the intro, blended into the gameplay pose at the end. */
  private introCamera(want: THREE.Vector3, wantLook: THREE.Vector3): { pos: THREE.Vector3; look: THREE.Vector3; fov: number } {
    const t = this.intro!.t;
    const P = this.player;
    const c = P.group.position.clone().add(new THREE.Vector3(0, P.radius * 0.12, 0));
    const n = new THREE.Vector3(0, Math.sin(0.6), Math.cos(0.6));
    // portrait screens need a little more distance so the whole face fits across
    const fit = THREE.MathUtils.clamp(1 / this.camera.aspect, 1, 1.35);
    const closeDist = (1.3 - 0.18 * ease(t / INTRO.pullBack)) * fit;
    const close = c.clone().addScaledVector(n, closeDist);
    const a = 0.55, e = 0.38;
    const mid = c.clone().add(new THREE.Vector3(Math.sin(a) * Math.cos(e), Math.sin(e), Math.cos(a) * Math.cos(e)).multiplyScalar(2.5 * fit));
    if (t < INTRO.pullBack) return { pos: close, look: c, fov: 34 };
    if (t < INTRO.swoop) {
      const k = ease((t - INTRO.pullBack) / (INTRO.swoop - INTRO.pullBack - 0.15));
      return { pos: close.lerp(mid, k), look: c, fov: 34 + 6 * k };
    }
    const k = ease((t - INTRO.swoop) / (INTRO.end - INTRO.swoop - 0.1));
    if (!this.intro!.whooshed) { this.intro!.whooshed = true; sfx.whoosh(); }
    const pos = mid.lerp(want, k);
    pos.y += Math.sin(k * Math.PI) * 1.2; // swoop up and over
    return { pos, look: c.lerp(wantLook, k), fov: 40 + (this.gameFov - 40) * k };
  }

  private updateCamera(g: Crossing, dt: number): void {
    const [vx, vy] = g.visualPos();
    const focusZ = THREE.MathUtils.clamp(vy + 0.5, 2.4, 12.2);
    const follow = this.halfW < 6 ? 0.7 : 0.25;
    const edge = Math.max(0, this.halfW - 6.1);
    const focusX = THREE.MathUtils.clamp(5.5 + (vx + 0.5 - 5.5) * follow, 5.5 - (5.5 - this.halfW + 0.7) - edge, 5.5 + (5.5 - this.halfW + 0.7) + edge);
    // Tilt so the player sits about 72% of the way down the screen, with the road/river ahead in view.
    const half = THREE.MathUtils.degToRad(this.gameFov / 2);
    const pitch = Math.atan(CAM_H / CAM_BACK) - Math.atan(0.44 * Math.tan(half));
    const ahead = CAM_H / Math.tan(pitch) - CAM_BACK;
    const wantPos = new THREE.Vector3(focusX, CAM_H, focusZ + CAM_BACK);
    const wantLook = new THREE.Vector3(focusX, 0, focusZ - ahead);
    let fov = this.gameFov;
    if (this.intro) {
      const shot = this.introCamera(wantPos, wantLook);
      this.camPos.copy(shot.pos);
      this.camLook.copy(shot.look);
      fov = shot.fov;
    } else {
      const k = dt === 0 ? 1 : Math.min(1, dt * 3.2);
      this.camPos.lerp(wantPos, k);
      this.camLook.lerp(wantLook, k);
    }
    if (Math.abs(this.camera.fov - fov) > 0.01) { this.camera.fov = fov; this.camera.updateProjectionMatrix(); }
    this.camera.position.copy(this.camPos);
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt * 2.5);
      this.camera.position.x += (Math.random() - 0.5) * this.shake * 0.25;
      this.camera.position.y += (Math.random() - 0.5) * this.shake * 0.25;
    }
    this.camera.lookAt(this.camLook);
    // keep the sharp shadow area centred on what we see
    this.sun.target.position.set(this.camLook.x, 0, this.camLook.z + 1.5);
    this.sun.position.copy(this.sun.target.position).addScaledVector(this.sunDir, 30);
  }

  // ---------- effects ----------
  fx(e: Fx, g: Crossing): void {
    if (e.kind === 'hop') {
      if (!g.onRiver(e.row)) this.puff(e.x + 0.5, this.groundY(g, e.x, e.row) + 0.03, e.row + 0.5, 0xcfc6b4, 5, 0.6);
      else this.ripple(e.x + 0.5, e.row + 0.5, 0.5);
    }
    if (e.kind === 'collect') {
      const y = (g.onRiver(e.row) ? 0.2 : 0) + 0.3;
      this.sparks(e.x + 0.5, y, e.row + 0.5, e.gold ? 0xffd34d : 0xff7ac2, e.gold ? 26 : 14);
      this.text(`+${e.amount}`, e.gold ? '#ffd23f' : '#ffffff', e.x + 0.5, y + 0.4, e.row + 0.5);
    }
    if (e.kind === 'home') {
      this.sparks(e.x + 0.5, 0.4, 0.5, 0xffd34d, 30);
      this.text(`+${e.amount}`, '#ffd23f', e.x + 0.5, 0.9, 0.5);
    }
    if (e.kind === 'level') {
      this.text(`LEVEL ${e.level}!`, '#ffffff', this.camLook.x, 1.8, this.camLook.z + 2.2, 2.6, 2.2);
      for (let i = 0; i < 4; i++) this.sparks(this.camLook.x - 3 + i * 2, 1, this.camLook.z + 2, [0xff7ac2, 0xffd34d, 0x4cc9f0, 0x7c4dff][i], 18);
    }
    if (e.kind === 'death') {
      const x = e.x + 0.5, z = e.row + 0.5;
      if (e.how === 'splash') {
        for (let i = 0; i < 26; i++) this.drop(x, WATER_Y + 0.05, z);
        this.ripple(x, z, 1.4); setTimeout(() => this.ripple(x, z, 1.1), 180);
      } else {
        this.shake = e.how === 'crash' ? 1 : 0.5;
        this.puff(x, 0.25, z, new THREE.Color(g.skin.colors[0]).getHex(), 18, 1.4);
        this.sparks(x, 0.4, z, 0xffffff, 10);
      }
    }
  }

  private add(p: Pop): void { this.scene.add(p.obj); this.pops.push(p); }

  private drop(x: number, y: number, z: number): void {
    const m = new THREE.Mesh(this.dropGeo, this.dropMat);
    m.scale.setScalar(0.025 + Math.random() * 0.03);
    m.position.set(x, y, z);
    const a = Math.random() * Math.PI * 2, s = 0.6 + Math.random() * 1.6;
    this.add({ obj: m, vel: new THREE.Vector3(Math.cos(a) * s * 0.6, 2.5 + Math.random() * 2.5, Math.sin(a) * s * 0.6), life: 1.1, max: 1.1, kind: 'drop' });
  }

  private sparks(x: number, y: number, z: number, color: number, n: number, power = 1): void {
    for (let i = 0; i < n; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.sparkTex, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      sp.scale.setScalar((0.1 + Math.random() * 0.12) * Math.min(1, power));
      sp.position.set(x, y, z);
      const a = Math.random() * Math.PI * 2, s = (0.8 + Math.random() * 1.8) * power;
      this.add({ obj: sp, vel: new THREE.Vector3(Math.cos(a) * s, 1.5 + Math.random() * 2.2, Math.sin(a) * s), life: 0.9, max: 0.9, kind: 'spark' });
    }
  }

  private puff(x: number, y: number, z: number, color: number, n: number, size: number): void {
    for (let i = 0; i < n; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.sparkTex, color, transparent: true, depthWrite: false, opacity: 0.6 }));
      sp.scale.setScalar(0.15 * size);
      sp.position.set(x + (Math.random() - 0.5) * 0.2, y, z + (Math.random() - 0.5) * 0.2);
      const a = Math.random() * Math.PI * 2, s = (0.4 + Math.random() * 0.8) * size;
      this.add({ obj: sp, vel: new THREE.Vector3(Math.cos(a) * s, 0.4 + Math.random() * 0.6, Math.sin(a) * s), life: 0.7, max: 0.7, kind: 'puff', grow: 0.5 * size });
    }
  }

  private ripple(x: number, z: number, size: number): void {
    const m = new THREE.Mesh(this.ringGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false }));
    m.position.set(x, WATER_Y + 0.01, z);
    m.scale.setScalar(0.1);
    this.add({ obj: m, vel: new THREE.Vector3(), life: 1, max: 1, kind: 'ring', grow: size });
  }

  private text(s: string, color: string, x: number, y: number, z: number, scale = 1, life = 1.1, emoji = false): void {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.label(s, color, !emoji), transparent: true, depthTest: false, depthWrite: false }));
    sp.renderOrder = 10;
    const aspect = (sp.material.map!.image as HTMLCanvasElement).width / (sp.material.map!.image as HTMLCanvasElement).height;
    sp.scale.set(0.5 * aspect * scale, 0.5 * scale, 1);
    sp.position.set(x, y, z);
    this.add({ obj: sp, vel: new THREE.Vector3(0, emoji ? 0.35 : 0.9, 0), life, max: life, kind: 'text' });
  }

  private updatePops(dt: number): void {
    this.pops = this.pops.filter((p) => {
      p.life -= dt;
      const k = Math.max(0, p.life / p.max);
      if (p.kind === 'drop' || p.kind === 'spark') p.vel.y -= 9 * dt;
      if (p.kind === 'puff') p.vel.multiplyScalar(1 - dt * 3);
      p.obj.position.addScaledVector(p.vel, dt);
      const mat = (p.obj as THREE.Mesh).material as THREE.Material & { opacity: number };
      if (p.kind === 'ring') { p.obj.scale.setScalar(0.1 + (1 - k) * p.grow!); mat.opacity = 0.55 * k; }
      else if (p.kind === 'puff') { p.obj.scale.setScalar(0.15 + (1 - k) * p.grow!); mat.opacity = 0.6 * k; }
      else if (p.kind === 'spark' || p.kind === 'text') mat.opacity = Math.min(1, k * 2);
      if (p.kind === 'drop' && p.obj.position.y < WATER_Y) p.life = 0;
      if (p.life <= 0) {
        this.scene.remove(p.obj);
        if (p.kind !== 'drop') { mat.dispose(); if (p.kind === 'text') (mat as THREE.SpriteMaterial).map?.dispose(); }
        return false;
      }
      return true;
    });
  }
}

/** True when the browser can run the realistic renderer. */
export function webglAvailable(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch { return false; }
}
