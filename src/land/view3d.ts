/**
 * Fuzzies Land in 3D (Three.js): an island town under a real sky with soft shadows, swaying grass,
 * a shimmering ocean, buildings, crops that grow while you watch, and Fuzzies who live there.
 *
 * The Fuzzies feel alive even when standing still: they breathe, shift their weight, look around,
 * blink, notice you, hop with squash & stretch, and chat in speech bubbles.
 * The view only draws; the rules are in land/rules.ts.
 */
import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import * as M from '../game/models3d';
import * as GT from '../game/textures3d';
import * as LM from './models';
import * as LT from './textures';
import { MAP, bounds, cropProgress, finished, item, footprint, good, population, walkway, type LandState, type Placed } from './rules';

const PITCH = THREE.MathUtils.degToRad(52);
const YAW = THREE.MathUtils.degToRad(45);
const ease = (k: number) => { k = Math.min(1, Math.max(0, k)); return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; };
const SKINS: [string, string][] = [['#ff86bb', '#b8235f'], ['#7dffcf', '#22b5a0'], ['#ffe066', '#ff8c42'], ['#7ad7ff', '#3a5bff'], ['#ff6b8b', '#b0004f'], ['#c77dff', '#5a189a'], ['#ffffff', '#b9c2cf'], ['#ffc078', '#e8590c']];

export type Pick = { kind: 'building'; id: number } | { kind: 'resident'; index: number } | { kind: 'ground'; x: number; z: number } | null;

interface Built { node: THREE.Group; placed: Placed; key: string; cropNode?: THREE.Group; cropId?: string; bubble?: HTMLElement; smoke: number }
interface Resident {
  model: M.FuzzyModel; skin: number;
  pos: THREE.Vector2; path: THREE.Vector2[]; facing: number; targetFacing: number;
  mode: 'walk' | 'idle' | 'hop'; timer: number; phase: number; blinkIn: number; blinking: number;
  lookIn: number; look: THREE.Vector2; hop: number; bubble?: HTMLElement; bubbleT: number; seed: number;
}
interface Floater { el: HTMLElement; pos: THREE.Vector3; t: number }
interface Puff { s: THREE.Sprite; v: THREE.Vector3; life: number; max: number; grow: number }

export class LandView {
  readonly renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(36, 1, 0.1, 600);
  private sun = new THREE.DirectionalLight(0xfff1dc, 3.0);
  private hemi = new THREE.HemisphereLight(0xa9c8f0, 0x3f4a2a, 0.5);
  private pmrem: THREE.PMREMGenerator;
  private time = { value: 0 };
  private mats = LM.baseMats();
  private built = new Map<number, Built>();
  private residents: Resident[] = [];
  private floaters: Floater[] = [];
  private puffs: Puff[] = [];
  private blocked = new Uint8Array(MAP * MAP);
  private forest = new THREE.Group();
  private area!: THREE.Mesh;
  private grid!: THREE.LineSegments;
  private ocean!: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshPhysicalMaterial>;
  private ghost: { node: THREE.Group; pad: THREE.Mesh; key: string } | null = null;
  private selected: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private size = 0;
  private state: LandState | null = null;
  private raf = 0;
  private last = 0;
  private disposed = false;
  private puffTex = GT.glow('rgba(255,255,255,0.9)', 'rgba(255,255,255,0)');
  private sparkTex = GT.glow('rgba(255,240,170,1)', 'rgba(255,200,80,0)');
  // camera: looks at `target` from a fixed angle; `dist` is the zoom
  target = new THREE.Vector3(MAP / 2, 0, MAP / 2);
  dist = 22;
  private fly: { from: THREE.Vector3; to: THREE.Vector3; d0: number; d1: number; t: number; dur: number; done?: () => void } | null = null;
  private ray = new THREE.Raycaster();

  /** `phrase(i)` gives a resident something to say; `onFrame` runs after each frame (the screen keeps its HUD fresh). */
  constructor(private canvas: HTMLCanvasElement, private overlay: HTMLElement, mobile: boolean, private phrase: (seed: number) => string) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.6 : 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.66;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.pmrem = new THREE.PMREMGenerator(this.renderer);

    const s = this.sun;
    s.castShadow = true;
    s.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
    Object.assign(s.shadow.camera, { left: -18, right: 18, top: 18, bottom: -18, near: 1, far: 90 });
    s.shadow.bias = -0.0004;
    s.shadow.normalBias = 0.03;
    s.shadow.radius = 3;
    this.scene.add(s, s.target, this.hemi);
    this.buildSky();
    this.buildIsland();
    this.selected = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, depthWrite: false }));
    this.selected.visible = false;
    this.scene.add(this.selected);
    this.resize();
  }

  // ---------- world ----------
  private buildSky(): void {
    const sky = new Sky();
    sky.scale.setScalar(450);
    const u = sky.material.uniforms;
    u.turbidity.value = 5; u.rayleigh.value = 1.3; u.mieCoefficient.value = 0.005; u.mieDirectionalG.value = 0.8;
    const dir = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - 42), THREE.MathUtils.degToRad(200));
    u.sunPosition.value.copy(dir);
    const skyScene = new THREE.Scene();
    skyScene.add(sky);
    this.scene.environment = this.pmrem.fromScene(skyScene, 0, 0.1, 1000).texture;
    this.scene.environmentIntensity = 0.45;
    this.scene.add(sky);
    this.sun.position.copy(dir).multiplyScalar(40).add(new THREE.Vector3(MAP / 2, 0, MAP / 2));
    this.sun.target.position.set(MAP / 2, 0, MAP / 2);
    this.scene.fog = new THREE.Fog('#cfe3f0', 60, 160);
  }

  private buildIsland(): void {
    const c = MAP / 2;
    // ocean
    const wn = GT.waterNormals();
    wn.repeat.set(70, 70);
    this.ocean = new THREE.Mesh(new THREE.PlaneGeometry(400, 400).rotateX(-Math.PI / 2), new THREE.MeshPhysicalMaterial({
      color: 0x1c6e86, roughness: 0.22, normalMap: wn, normalScale: new THREE.Vector2(0.07, 0.07), clearcoat: 0.3, envMapIntensity: 0.8,
    }));
    this.ocean.position.set(c, -0.3, c);
    this.ocean.receiveShadow = true;
    this.scene.add(this.ocean);
    // sandy beach and the grassy island on top, both with soft rounded edges
    const beach = new THREE.Mesh(new RoundedSlab(MAP + 3.2, 0.5, MAP + 3.2, 2.4), new THREE.MeshStandardMaterial({ map: rep(LT.sand(), MAP / 2), roughness: 1 }));
    beach.position.set(c, -0.48, c); // top sits just under the island's edge (the bevel adds 0.15 on top)
    beach.receiveShadow = true;
    this.scene.add(beach);
    const isl = new THREE.Mesh(new RoundedSlab(MAP, 0.4, MAP, 1.6), new THREE.MeshStandardMaterial({ map: rep(LT.lawn(), MAP / 3), roughness: 0.95 }));
    isl.position.set(c, -0.35, c); // top of the grass = y 0
    isl.receiveShadow = true;
    this.scene.add(isl);
    // the buildable square is a touch brighter; a grid shows while placing
    this.area = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xe6ffd0, transparent: true, opacity: 0.16, depthWrite: false, roughness: 1 }));
    this.area.position.y = 0.006;
    this.area.receiveShadow = true;
    this.scene.add(this.area);
    this.grid = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 }));
    this.grid.visible = false;
    this.scene.add(this.grid, this.forest);
    this.scene.add(M.makeGrass(7000, [
      { x0: 0.6, x1: MAP - 0.6, z0: 0.6, z1: 4 }, { x0: 0.6, x1: MAP - 0.6, z0: MAP - 4, z1: MAP - 0.6 },
      { x0: 0.6, x1: 4, z0: 4, z1: MAP - 4 }, { x0: MAP - 4, x1: MAP - 0.6, z0: 4, z1: MAP - 4 },
    ], 9, this.time));
  }

  /** Trees fill the land you haven't unlocked yet; expanding clears them. */
  private buildForest(size: number): void {
    this.forest.clear();
    const o = (MAP - size) / 2;
    const r = GT.rng(19);
    for (let i = 0; i < 150; i++) {
      const x = 0.8 + r() * (MAP - 1.6), z = 0.8 + r() * (MAP - 1.6);
      const sc = 0.5 + r() * 0.35;
      if (x > o - 1.2 && x < o + size + 1.2 && z > o - 1.2 && z < o + size + 1.2) continue; // keep a clear lawn around the town
      const t = M.makeTree(this.mats, i * 13 + 5, sc);
      t.position.set(x, 0, z);
      t.rotation.y = r() * 6.28;
      this.forest.add(t);
    }
    this.area.scale.set(size, 1, size);
    this.area.position.set(MAP / 2, 0.006, MAP / 2);
    const pts: number[] = [];
    for (let i = 0; i <= size; i++) {
      pts.push(o + i, 0.02, o, o + i, 0.02, o + size);
      pts.push(o, 0.02, o + i, o + size, 0.02, o + i);
    }
    this.grid.geometry.dispose();
    this.grid.geometry = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  }

  // ---------- keeping the scene in step with the town ----------
  sync(s: LandState): void {
    this.state = s;
    if (s.size !== this.size) { this.size = s.size; this.buildForest(s.size); }
    const seen = new Set<number>();
    for (const p of s.buildings) {
      seen.add(p.id);
      const key = `${p.item}:${p.x}:${p.z}:${p.rot}:${p.doneAt ? 'site' : 'built'}`;
      let b = this.built.get(p.id);
      if (b && b.key !== key) { b.node.removeFromParent(); b.bubble?.remove(); b = undefined; }
      if (!b) {
        const f = footprint(item(p.item), p.rot);
        const node = p.doneAt ? LM.constructionSite(f.w, f.d, p.id) : LM.modelFor(p.item, p.id);
        node.position.set(p.x + f.w / 2, 0, p.z + f.d / 2);
        if (!p.doneAt) node.rotation.y = p.rot ? -Math.PI / 2 : 0;
        // soft shadow underneath so buildings sit on the ground
        if (!walkway(p.item) && p.item !== 'field' && p.item !== 'flowers') { const dims = p.doneAt ? f : item(p.item); node.add(LM.contactShadow(dims.w, dims.d)); } // sites aren't rotated, finished buildings are
        // new buildings pop up with a bounce
        if (p.builtAt && Date.now() - p.builtAt < 1500) { node.scale.setScalar(0.01); node.userData.grow = 0; }
        this.scene.add(node);
        b = { node, placed: p, key, smoke: 0 };
        this.built.set(p.id, b);
      }
      b.placed = p;
    }
    for (const [id, b] of this.built) if (!seen.has(id)) { b.node.removeFromParent(); b.bubble?.remove(); this.built.delete(id); }
    // which tiles Fuzzies can't walk through
    this.blocked.fill(0);
    for (const p of s.buildings) {
      if (walkway(p.item)) continue;
      const f = footprint(item(p.item), p.rot);
      for (let x = p.x; x < p.x + f.w; x++) for (let z = p.z; z < p.z + f.d; z++) this.blocked[z * MAP + x] = 1;
    }
    this.syncResidents(population(s));
  }

  private syncResidents(pop: number): void {
    const want = Math.max(2, Math.min(14, Math.round(pop / 3)));
    while (this.residents.length > want) { const r = this.residents.pop()!; r.model.group.removeFromParent(); r.bubble?.remove(); }
    while (this.residents.length < want) {
      const i = this.residents.length;
      const skin = i % SKINS.length;
      const model = M.makeFuzzy(this.mats, SKINS[skin], 0.2, 0.06, 9);
      const start = this.freeTile(i * 97 + 3);
      model.group.position.set(start.x, 0.26, start.y);
      this.scene.add(model.group);
      this.residents.push({ model, skin, pos: start.clone(), path: [], facing: 0, targetFacing: 0, mode: 'idle', timer: 1 + Math.random() * 3, phase: Math.random() * 10, blinkIn: 1 + Math.random() * 3, blinking: 0, lookIn: 2, look: new THREE.Vector2(), hop: 0, bubbleT: 0, seed: i * 7 + 1 });
    }
  }

  private inArea(x: number, z: number): boolean {
    const b = this.state ? bounds(this.state) : { x0: 0, z0: 0, x1: MAP, z1: MAP };
    return x >= b.x0 && z >= b.z0 && x < b.x1 && z < b.z1;
  }
  private walkable = (x: number, z: number) => this.inArea(x, z) && !this.blocked[z * MAP + x];

  private freeTile(seed: number): THREE.Vector2 {
    const r = GT.rng(seed + Math.floor(Math.random() * 1e6));
    for (let k = 0; k < 200; k++) {
      const x = Math.floor(r() * MAP), z = Math.floor(r() * MAP);
      if (this.walkable(x, z)) return new THREE.Vector2(x + 0.5, z + 0.5);
    }
    return new THREE.Vector2(MAP / 2, MAP / 2);
  }

  /** Shortest walk over free tiles (breadth-first search on the grid). */
  private route(from: THREE.Vector2, to: THREE.Vector2): THREE.Vector2[] {
    const sx = Math.floor(from.x), sz = Math.floor(from.y), tx = Math.floor(to.x), tz = Math.floor(to.y);
    const prev = new Int32Array(MAP * MAP).fill(-1);
    const q = [sz * MAP + sx];
    prev[q[0]] = q[0];
    for (let h = 0; h < q.length; h++) {
      const cur = q[h];
      if (cur === tz * MAP + tx) break;
      const x = cur % MAP, z = (cur / MAP) | 0;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, nz = z + dz, n = nz * MAP + nx;
        if (nx < 0 || nz < 0 || nx >= MAP || nz >= MAP || prev[n] !== -1 || !this.walkable(nx, nz)) continue;
        prev[n] = cur;
        q.push(n);
      }
    }
    const end = tz * MAP + tx;
    if (prev[end] === -1) return [];
    const out: THREE.Vector2[] = [];
    for (let c = end; c !== prev[c]; c = prev[c]) out.push(new THREE.Vector2((c % MAP) + 0.5 + (Math.random() - 0.5) * 0.3, ((c / MAP) | 0) + 0.5 + (Math.random() - 0.5) * 0.3));
    return out.reverse();
  }

  // ---------- camera ----------
  resize(): void {
    const r = this.canvas.parentElement!.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
    this.renderer.setSize(w, h, true);
    this.camera.aspect = w / h;
    this.camera.fov = w / h < 0.8 ? 46 : 36;
    this.camera.updateProjectionMatrix();
  }

  private placeCamera(): void {
    const off = new THREE.Vector3().setFromSphericalCoords(this.dist, Math.PI / 2 - PITCH, YAW);
    this.camera.position.copy(this.target).add(off);
    this.camera.lookAt(this.target);
  }

  /** Move the view by a screen drag (pixels). */
  pan(dx: number, dy: number): void {
    this.fly = null;
    const h = this.canvas.clientHeight || 1;
    const k = (2 * this.dist * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2))) / h;
    const right = new THREE.Vector3(Math.cos(YAW), 0, -Math.sin(YAW));
    const fwd = new THREE.Vector3(-Math.sin(YAW), 0, -Math.cos(YAW));
    this.target.addScaledVector(right, -dx * k).addScaledVector(fwd, dy * k / Math.sin(PITCH));
    this.clampTarget();
  }

  zoom(f: number): void {
    this.fly = null;
    this.dist = THREE.MathUtils.clamp(this.dist * f, 7, 42);
  }

  private clampTarget(): void {
    this.target.x = THREE.MathUtils.clamp(this.target.x, 2, MAP - 2);
    this.target.z = THREE.MathUtils.clamp(this.target.z, 2, MAP - 2);
  }

  /** Glide the camera to a spot (used for the swoop-in and for zooming into the Crossing Gate). */
  flyTo(x: number, z: number, dist: number, dur = 1.4, done?: () => void): void {
    this.fly = { from: this.target.clone(), to: new THREE.Vector3(x, 0, z), d0: this.dist, d1: dist, t: 0, dur, done };
  }

  /** Start far above the clouds and swoop down onto the town. */
  swoopIn(): void {
    const c = MAP / 2;
    this.target.set(c + 3, 0, c + 3);
    this.dist = 95;
    this.flyTo(c, c, this.camera.aspect < 0.8 ? 13 : 20, 2.2); // phones start a bit closer
  }

  // ---------- picking ----------
  private ndc(cx: number, cy: number): THREE.Vector2 {
    const r = this.canvas.getBoundingClientRect();
    return new THREE.Vector2(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
  }

  /** The ground point under the pointer (tile coordinates, can be fractional). */
  ground(cx: number, cy: number): THREE.Vector2 | null {
    this.ray.setFromCamera(this.ndc(cx, cy), this.camera);
    const p = new THREE.Vector3();
    return this.ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), p) ? new THREE.Vector2(p.x, p.z) : null;
  }

  pick(cx: number, cy: number): Pick {
    // residents first (they're small: pick by screen distance)
    const r = this.canvas.getBoundingClientRect();
    let best = -1, bd = 26;
    this.residents.forEach((res, i) => {
      const v = res.model.group.position.clone().project(this.camera);
      const d = Math.hypot((v.x + 1) / 2 * r.width + r.left - cx, (1 - v.y) / 2 * r.height + r.top - cy);
      if (d < bd) { bd = d; best = i; }
    });
    if (best >= 0) return { kind: 'resident', index: best };
    // then buildings (by their meshes, so tall ones are easy to tap)
    this.ray.setFromCamera(this.ndc(cx, cy), this.camera);
    const nodes = [...this.built.values()].map((b) => b.node);
    const hit = this.ray.intersectObjects(nodes, true)[0];
    if (hit) {
      let o: THREE.Object3D | null = hit.object;
      while (o && !nodes.includes(o as THREE.Group)) o = o.parent;
      for (const [id, b] of this.built) if (b.node === o) return { kind: 'building', id };
    }
    const g = this.ground(cx, cy);
    if (!g) return null;
    const x = Math.floor(g.x), z = Math.floor(g.y);
    for (const p of this.state?.buildings ?? []) {
      const f = footprint(item(p.item), p.rot);
      if (x >= p.x && x < p.x + f.w && z >= p.z && z < p.z + f.d) return { kind: 'building', id: p.id };
    }
    return { kind: 'ground', x, z };
  }

  // ---------- placing ----------
  setGhost(g: { item: string; x: number; z: number; rot: 0 | 1; ok: boolean } | null): void {
    this.grid.visible = !!g;
    if (!g) { if (this.ghost) { this.ghost.node.removeFromParent(); this.ghost.pad.removeFromParent(); this.ghost = null; } return; }
    const key = `${g.item}:${g.rot}`;
    if (!this.ghost || this.ghost.key !== key) {
      this.setGhost(null);
      this.grid.visible = true;
      const node = LM.modelFor(g.item, 1);
      node.rotation.y = g.rot ? -Math.PI / 2 : 0;
      const pad = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.5, depthWrite: false }));
      this.scene.add(node, pad);
      this.ghost = { node, pad, key };
    }
    const f = footprint(item(g.item), g.rot);
    this.ghost.node.position.set(g.x + f.w / 2, 0.12, g.z + f.d / 2);
    this.ghost.pad.scale.set(f.w, 1, f.d);
    this.ghost.pad.position.set(g.x + f.w / 2, 0.03, g.z + f.d / 2);
    (this.ghost.pad.material as THREE.MeshBasicMaterial).color.set(g.ok ? 0x40c057 : 0xfa5252);
  }

  select(id: number | null): void {
    const b = id === null ? undefined : this.built.get(id);
    this.selected.visible = !!b;
    if (!b) return;
    const f = footprint(item(b.placed.item), b.placed.rot);
    this.selected.scale.set(f.w + 0.2, 1, f.d + 0.2);
    this.selected.position.set(b.placed.x + f.w / 2, 0.02, b.placed.z + f.d / 2);
    b.node.userData.boing = 0;
  }

  /** Screen position of a building's top (for panels and pop-ups). */
  screenOf(id: number): { x: number; y: number } | null {
    const b = this.built.get(id);
    if (!b) return null;
    const v = new THREE.Vector3(b.node.position.x, 1.2, b.node.position.z).project(this.camera);
    return { x: (v.x + 1) / 2 * this.canvas.clientWidth, y: (1 - v.y) / 2 * this.canvas.clientHeight };
  }

  // ---------- effects ----------
  /** A floating "+2 🌾" style label rising from a building or resident. */
  float(text: string, id: number, cls = ''): void {
    const b = this.built.get(id);
    if (!b) return;
    const el = document.createElement('div');
    el.className = `land-float ${cls}`;
    el.textContent = text;
    this.overlay.append(el);
    this.floaters.push({ el, pos: new THREE.Vector3(b.node.position.x, 1.0, b.node.position.z), t: 0 });
    this.sparkle(b.node.position.x, 0.6, b.node.position.z, 10);
  }

  sparkle(x: number, y: number, z: number, n = 12): void {
    for (let i = 0; i < n; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.sparkTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      s.position.set(x + (Math.random() - 0.5) * 0.6, y + Math.random() * 0.4, z + (Math.random() - 0.5) * 0.6);
      s.scale.setScalar(0.18);
      this.scene.add(s);
      this.puffs.push({ s, v: new THREE.Vector3((Math.random() - 0.5) * 1.2, 1 + Math.random() * 1.5, (Math.random() - 0.5) * 1.2), life: 0, max: 0.7 + Math.random() * 0.4, grow: -0.1 });
    }
  }

  private smoke(at: THREE.Vector3): void {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.puffTex, transparent: true, depthWrite: false, color: 0xeeeeee, opacity: 0.55 }));
    s.position.copy(at);
    s.scale.setScalar(0.2);
    this.scene.add(s);
    this.puffs.push({ s, v: new THREE.Vector3(0.15 + Math.random() * 0.1, 0.5, (Math.random() - 0.5) * 0.1), life: 0, max: 2.2, grow: 0.35 });
  }

  /** Make a resident hop, giggle and say something (when tapped). */
  poke(i: number): void {
    const r = this.residents[i];
    if (!r) return;
    r.mode = 'hop'; r.hop = 0; r.path = [];
    r.targetFacing = this.facingCamera(r);
    this.say(r, this.phrase(r.seed + Math.floor(Math.random() * 100)), 3.2);
  }

  private facingCamera(r: Resident): number {
    const d = this.camera.position.clone().sub(r.model.group.position);
    return Math.atan2(d.x, d.z);
  }

  private say(r: Resident, text: string, secs: number): void {
    r.bubble?.remove();
    const el = document.createElement('div');
    el.className = 'land-say';
    el.textContent = text;
    this.overlay.append(el);
    r.bubble = el;
    r.bubbleT = secs;
  }

  // ---------- the loop ----------
  start(): void {
    if (this.raf || this.disposed) return;
    this.last = performance.now();
    const tick = (t: number) => {
      this.raf = requestAnimationFrame(tick);
      const dt = Math.min(0.05, Math.max(0, (t - this.last) / 1000)); // the first frame time can be slightly in the past
      this.last = t;
      this.frame(dt);
    };
    this.raf = requestAnimationFrame(tick);
  }

  stop(): void { cancelAnimationFrame(this.raf); this.raf = 0; }

  /** One frame (also callable directly, e.g. by tests). */
  frame(dt: number): void {
    const now = Date.now();
    this.time.value += dt;
    const T = this.time.value;
    (this.ocean.material.normalMap as THREE.Texture).offset.set(T * 0.004, T * 0.006);
    // camera glide
    if (this.fly) {
      const f = this.fly;
      f.t += dt;
      const k = ease(f.t / f.dur);
      this.target.lerpVectors(f.from, f.to, k);
      this.dist = f.d0 + (f.d1 - f.d0) * k;
      if (f.t >= f.dur) { this.fly = null; f.done?.(); }
    }
    this.placeCamera();
    // buildings: pop-in, crops, workshop life, ready bubbles
    for (const b of this.built.values()) {
      const n = b.node;
      if (n.userData.grow !== undefined) {
        n.userData.grow += dt;
        const k = Math.min(1, n.userData.grow / 0.6);
        n.scale.setScalar(k < 1 ? 1 + Math.sin(k * Math.PI) * 0.18 - (1 - k) * 0.9 : 1);
        if (k >= 1) { n.scale.setScalar(1); delete n.userData.grow; this.sparkle(n.position.x, 0.4, n.position.z, 14); }
      }
      if (n.userData.boing !== undefined) {
        n.userData.boing += dt;
        const k = n.userData.boing / 0.45;
        n.scale.set(1 + Math.sin(k * Math.PI) * 0.06, 1 - Math.sin(k * Math.PI) * 0.08, 1 + Math.sin(k * Math.PI) * 0.06);
        if (k >= 1) { n.scale.setScalar(1); delete n.userData.boing; }
      }
      const p = b.placed;
      let badge = '';
      let timer = false;
      if (p.doneAt) {
        const left = p.doneAt - now;
        if (left > 0) {
          const sec = Math.ceil(left / 1000);
          badge = `🔨 ${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
          timer = true;
          const arm = n.getObjectByName('arm');
          if (arm) arm.rotation.y = Math.sin(T * 0.8 + p.id) * 0.9;
          if (Math.random() < dt * 1.5) this.smoke(n.position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.6, 0.3, (Math.random() - 0.5) * 0.6)));
        } else badge = '✨';
      } else if (p.item === 'field') {
        const cid = p.crop?.good;
        if (cid !== b.cropId) { b.cropNode?.removeFromParent(); b.cropNode = cid ? LM.crop(cid) : undefined; if (b.cropNode) n.add(b.cropNode); b.cropId = cid; }
        if (b.cropNode) {
          const k = cropProgress(p, now);
          b.cropNode.scale.set(0.6 + 0.4 * k, 0.12 + 0.88 * k, 0.6 + 0.4 * k);
          b.cropNode.rotation.z = k >= 1 ? Math.sin(T * 2 + p.id) * 0.04 : 0;
          if (k >= 1) badge = good(cid!).emoji;
        }
      } else if (p.queue) {
        if (finished(p, now).length) badge = good(finished(p, now)[0].good).emoji;
        const busy = p.queue.some((q) => q.end > now);
        const smoke = n.userData.smoke as THREE.Vector3 | undefined;
        if (busy && smoke) { b.smoke -= dt; if (b.smoke <= 0) { b.smoke = 0.35; this.smoke(smoke.clone().applyMatrix4(n.matrixWorld)); } }
        const yarn = n.getObjectByName('yarn');
        if (yarn && busy) yarn.rotation.y += dt * 2;
      }
      const portal = n.getObjectByName('portal');
      if (portal) { (portal as THREE.Mesh).scale.set(1 + Math.sin(T * 2) * 0.05, 1 + Math.sin(T * 2.6) * 0.04, 1); ((portal as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.65 + Math.sin(T * 3) * 0.25; }
      const flag = n.getObjectByName('flag');
      if (flag) flag.rotation.y = Math.sin(T * 3) * 0.3;
      const water = n.getObjectByName('water');
      if (water && Math.random() < dt * 12) {
        const sp = (n.userData.spout as THREE.Vector3).clone().applyMatrix4(n.matrixWorld);
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.puffTex, color: 0xbfe6ff, transparent: true, depthWrite: false, opacity: 0.8 }));
        s.position.copy(sp); s.scale.setScalar(0.07);
        this.scene.add(s);
        const a = Math.random() * Math.PI * 2;
        this.puffs.push({ s, v: new THREE.Vector3(Math.cos(a) * 0.5, 1.4, Math.sin(a) * 0.5), life: 0, max: 0.75, grow: 0, });
      }
      // a little icon bubble over anything ready to collect
      if (badge) {
        if (!b.bubble) { b.bubble = document.createElement('div'); this.overlay.append(b.bubble); }
        const cls = timer ? 'land-ready land-timer' : 'land-ready';
        if (b.bubble.className !== cls) b.bubble.className = cls;
        if (b.bubble.textContent !== badge) b.bubble.textContent = badge;
        this.toScreen(b.bubble, new THREE.Vector3(n.position.x, p.item === 'field' ? 0.85 : p.doneAt ? 1.6 : 2.1, n.position.z), timer ? 0 : Math.sin(T * 4 + p.id) * 4);
      } else if (b.bubble) { b.bubble.remove(); b.bubble = undefined; }
    }
    this.selected.material.opacity = 0.25 + Math.sin(T * 4) * 0.1;
    if (this.ghost) this.ghost.node.position.y = 0.12 + Math.sin(T * 5) * 0.05;
    for (const r of this.residents) this.live(r, dt, T);
    // particles
    this.puffs = this.puffs.filter((p) => {
      p.life += dt;
      const k = p.life / p.max;
      if (k >= 1) { p.s.removeFromParent(); p.s.material.dispose(); return false; }
      p.s.position.addScaledVector(p.v, dt);
      if (p.grow <= 0) p.v.y -= 3.2 * dt;
      p.s.scale.multiplyScalar(1 + p.grow * dt);
      p.s.material.opacity = (1 - k) * (p.grow > 0 ? 0.55 : 1);
      return true;
    });
    this.floaters = this.floaters.filter((f) => {
      f.t += dt;
      if (f.t > 1.6) { f.el.remove(); return false; }
      const p = f.pos.clone(); p.y += f.t * 0.9;
      this.toScreen(f.el, p);
      f.el.style.opacity = String(Math.min(1, (1.6 - f.t) * 2));
      return true;
    });
    this.renderer.render(this.scene, this.camera);
  }

  private toScreen(el: HTMLElement, p: THREE.Vector3, dy = 0): void {
    const v = p.clone().project(this.camera);
    const x = (v.x + 1) / 2 * this.canvas.clientWidth, y = (1 - v.y) / 2 * this.canvas.clientHeight + dy;
    el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`;
    el.style.visibility = v.z > 1 ? 'hidden' : '';
  }

  /** A resident's little life: walk somewhere, stop and breathe, look around, blink, notice you, chat. */
  private live(r: Resident, dt: number, T: number): void {
    const m = r.model;
    r.phase += dt;
    r.timer -= dt;
    let bob = 0, sx = 1, sy = 1, lean = 0;
    if (r.mode === 'walk') {
      const next = r.path[0];
      if (!next) { r.mode = 'idle'; r.timer = 2 + Math.random() * 5; }
      else {
        const d = next.clone().sub(r.pos);
        const len = d.length();
        const step = dt * 1.05;
        if (len <= step) { r.pos.copy(next); r.path.shift(); }
        else r.pos.addScaledVector(d.divideScalar(len), step);
        r.targetFacing = Math.atan2(d.x, d.y);
        // little hops: up, then a squashy landing
        const k = (r.phase * 2.6) % 1;
        bob = Math.sin(k * Math.PI) * 0.07;
        const land = Math.max(0, 1 - k * 6) + Math.max(0, (k - 0.9) * 10);
        sx = 1 + land * 0.08 - Math.sin(k * Math.PI) * 0.03; sy = 1 - land * 0.1 + Math.sin(k * Math.PI) * 0.06;
        lean = 0.12;
      }
    } else if (r.mode === 'hop') {
      r.hop += dt;
      const k = r.hop / 0.55;
      bob = Math.sin(Math.min(1, k) * Math.PI) * 0.28;
      sy = k < 0.15 ? 1 - k * 1.2 : k > 0.9 ? 0.88 : 1.06; sx = 2 - sy;
      if (k >= 1.2) { r.mode = 'idle'; r.timer = 2.5 + Math.random() * 2; }
    } else {
      // idle: breathe and shift weight, like a real little creature
      const br = Math.sin(r.phase * 2.3);
      sy = 1 + br * 0.035; sx = 1 - br * 0.018;
      lean = Math.sin(r.phase * 0.8) * 0.02;
      m.body.rotation.z = Math.sin(r.phase * 1.1 + r.seed) * 0.07;
      r.lookIn -= dt;
      if (r.lookIn <= 0) {
        r.lookIn = 1.2 + Math.random() * 2.5;
        // sometimes look at you, sometimes look around
        r.targetFacing = Math.random() < 0.4 ? this.facingCamera(r) : r.facing + (Math.random() - 0.5) * 2;
        r.look.set((Math.random() - 0.5) * 0.06, (Math.random() - 0.5) * 0.04);
      }
      if (r.timer <= 0) {
        if (Math.random() < 0.18) { r.mode = 'hop'; r.hop = 0; }
        else {
          const target = this.freeTile(r.seed + Math.floor(T * 10));
          if (target.distanceTo(r.pos) < 9) r.path = this.route(r.pos, target);
          if (r.path.length) r.mode = 'walk'; else r.timer = 1;
        }
      }
    }
    if (r.mode !== 'idle') m.body.rotation.z *= 0.9;
    // turn smoothly towards where we're going / looking
    let df = r.targetFacing - r.facing;
    df = Math.atan2(Math.sin(df), Math.cos(df));
    r.facing += df * Math.min(1, dt * 6);
    m.group.position.set(r.pos.x, 0.26 + bob, r.pos.y);
    m.group.rotation.y = r.facing;
    m.body.rotation.x = lean;
    m.body.scale.set(sx, sy, sx);
    // blink
    r.blinkIn -= dt;
    if (r.blinkIn <= 0) { r.blinking = 0.13; r.blinkIn = 2 + Math.random() * 4; }
    const closed = r.blinking > 0;
    if (closed) r.blinking -= dt;
    for (const e of m.eyes) e.open.scale.y = closed ? 0.12 : 1;
    for (const p of m.pupils) { p.position.x = r.look.x; p.position.y = r.look.y; }
    // speech bubbles: now and then someone says something
    if (!r.bubble && Math.random() < dt / 40) this.say(r, this.phrase(r.seed + Math.floor(T)), 3.4);
    if (r.bubble) {
      r.bubbleT -= dt;
      this.toScreen(r.bubble, new THREE.Vector3(r.pos.x, 0.78 + bob, r.pos.y));
      if (r.bubbleT <= 0) { r.bubble.remove(); r.bubble = undefined; }
    }
  }

  /** Camera position that frames a building (for zooming into the Crossing Gate). */
  centerOf(id: number): THREE.Vector3 | null {
    const b = this.built.get(id);
    return b ? b.node.position.clone() : null;
  }

  destroy(): void {
    this.disposed = true;
    this.stop();
    this.overlay.replaceChildren();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }
}

/** A flat slab with rounded corners and a soft bevel (the island and beach). */
class RoundedSlab extends THREE.ExtrudeGeometry {
  constructor(w: number, h: number, d: number, r: number) {
    const s = new THREE.Shape();
    const x0 = -w / 2, z0 = -d / 2;
    s.moveTo(x0 + r, z0); s.lineTo(x0 + w - r, z0); s.quadraticCurveTo(x0 + w, z0, x0 + w, z0 + r);
    s.lineTo(x0 + w, z0 + d - r); s.quadraticCurveTo(x0 + w, z0 + d, x0 + w - r, z0 + d);
    s.lineTo(x0 + r, z0 + d); s.quadraticCurveTo(x0, z0 + d, x0, z0 + d - r);
    s.lineTo(x0, z0 + r); s.quadraticCurveTo(x0, z0, x0 + r, z0);
    super(s, { depth: h, bevelEnabled: true, bevelSize: 0.3, bevelThickness: 0.15, bevelSegments: 4, curveSegments: 10 });
    this.rotateX(Math.PI / 2);
    this.translate(0, h / 2, 0);
    // planar UVs from the top view so textures tile evenly
    const pos = this.attributes.position, uv = this.attributes.uv;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + w / 2) / w, (pos.getZ(i) + d / 2) / d);
  }
}

function rep(t: THREE.Texture, n: number): THREE.Texture {
  const c = t.clone();
  c.repeat.set(n, n);
  c.needsUpdate = true;
  return c;
}
