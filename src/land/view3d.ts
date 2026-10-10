/**
 * Fuzzies Land in 3D (Three.js): an island town under a real sky with soft shadows, swaying grass,
 * a shimmering ocean, buildings, crops that grow while you watch, and Fuzzies who live there.
 *
 * The Fuzzies feel alive even when standing still: they breathe, shift their weight, look around,
 * blink, notice you, hop with squash & stretch, and chat in speech bubbles.
 * The view only draws; the rules are in land/rules.ts.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import * as ENV from './environment';
import * as M from '../game/models3d';
import * as GT from '../game/textures3d';
import * as LM from './models';
import { MAP, bounds, cropProgress, finished, item, footprint, good, population, walkway, type LandState, type Placed } from './rules';

const PITCH = THREE.MathUtils.degToRad(50);
const YAW = THREE.MathUtils.degToRad(45);
const ease = (k: number) => { k = Math.min(1, Math.max(0, k)); return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; };
const SKINS: [string, string][] = [['#ff86bb', '#b8235f'], ['#7dffcf', '#22b5a0'], ['#ffe066', '#ff8c42'], ['#7ad7ff', '#3a5bff'], ['#ff6b8b', '#b0004f'], ['#c77dff', '#5a189a'], ['#ffffff', '#b9c2cf'], ['#ffc078', '#e8590c']];

const FOOT = new THREE.SphereGeometry(0.06, 12, 8).scale(1, 0.55, 1.35);
const BLOB = new THREE.CircleGeometry(0.24, 20).rotateX(-Math.PI / 2);
const BLOB_MAT = new THREE.MeshBasicMaterial({ map: GT.glow('rgba(0,0,0,0.45)', 'rgba(0,0,0,0)'), transparent: true, depthWrite: false });
const ROAD_MATS = {
  asphalt: new THREE.MeshStandardMaterial({ color: '#9e978e', roughness: 0.92 }),
  kerb: new THREE.MeshStandardMaterial({ color: '#efe4d0', roughness: 0.85 }),
  dash: new THREE.MeshStandardMaterial({ color: '#fff4d8', roughness: 0.7 }),
};

export type Pick = { kind: 'building'; id: number } | { kind: 'resident'; index: number } | { kind: 'ground'; x: number; z: number } | null;

interface Built { node: THREE.Group; placed: Placed; key: string; cropNode?: THREE.Group; cropId?: string; bubble?: HTMLElement; smoke: number }
interface Resident {
  model: M.FuzzyModel; skin: number; feet: THREE.Mesh[]; shadow: THREE.Mesh;
  pos: THREE.Vector2; path: THREE.Vector2[]; facing: number; targetFacing: number;
  mode: 'walk' | 'idle' | 'hop'; timer: number; phase: number; blinkIn: number; blinking: number;
  lookIn: number; look: THREE.Vector2; hop: number; bubble?: HTMLElement; bubbleT: number; seed: number;
}
interface Floater { el: HTMLElement; pos: THREE.Vector3; t: number }
interface Puff { s: THREE.Sprite; v: THREE.Vector3; life: number; max: number; grow: number }

export class LandView {
  readonly renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(30, 1, 0.5, 900);
  private sun = new THREE.DirectionalLight(0xfff0d8, 2.7);
  private hemi = new THREE.HemisphereLight(0xdcefff, 0x8a8a6a, 0.9);
  private sunDir = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(40), THREE.MathUtils.degToRad(215));
  private composer: EffectComposer;
  private shadowHalf = 0;
  private water!: THREE.Mesh;
  private cover = new THREE.Group();
  private coverKey = '';
  private roads = new THREE.Group();
  private clouds!: THREE.Group;
  private vel = new THREE.Vector2();
  private zoomGoal = 24;
  private zoomAnchor: THREE.Vector3 | null = null;
  private lastPan = 0;
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
  dist = 24;
  private fly: { from: THREE.Vector3; to: THREE.Vector3; d0: number; d1: number; t: number; dur: number; done?: () => void } | null = null;
  private ray = new THREE.Raycaster();

  /** `phrase(i)` gives a resident something to say; `onFrame` runs after each frame (the screen keeps its HUD fresh). */
  constructor(private canvas: HTMLCanvasElement, private overlay: HTMLElement, private mobile: boolean, private phrase: (seed: number) => string) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.5 : 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    // neutral tone mapping keeps our colours saturated (ART.md)
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.pmrem = new THREE.PMREMGenerator(this.renderer);

    const s = this.sun;
    s.castShadow = true;
    s.shadow.mapSize.set(mobile ? 1536 : 2048, mobile ? 1536 : 2048);
    s.shadow.bias = -0.0005;
    s.shadow.normalBias = 0.025;
    s.shadow.radius = 4;
    this.scene.add(s, s.target, this.hemi);
    this.buildWorld();

    // a gentle finishing pass: a touch more colour and a soft vignette (antialiased with MSAA)
    const rt = new THREE.WebGLRenderTarget(1, 1, { samples: mobile ? 2 : 4, type: THREE.HalfFloatType });
    this.composer = new EffectComposer(this.renderer, rt);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.composer.addPass(new ShaderPass({
      uniforms: { tDiffuse: { value: null }, uVibrance: { value: 0.08 }, uVignette: { value: 0.2 } },
      vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform sampler2D tDiffuse; uniform float uVibrance, uVignette; varying vec2 vUv;
        void main() {
          vec4 c = texture2D(tDiffuse, vUv);
          float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
          float sat = max(c.r, max(c.g, c.b)) - min(c.r, min(c.g, c.b));
          c.rgb = max(vec3(0.0), mix(vec3(l), c.rgb, 1.0 + uVibrance * (1.0 - sat)));
          c.rgb *= mix(1.0, 1.0 - uVignette, smoothstep(0.38, 0.9, distance(vUv, vec2(0.5))));
          gl_FragColor = c;
        }`,
    }));
    this.composer.addPass(new OutputPass());
    this.selected = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, depthWrite: false }));
    this.selected.visible = false;
    this.scene.add(this.selected);
    this.resize();
  }

  // ---------- world ----------
  private buildWorld(): void {
    const sky = ENV.buildSky();
    // soft reflections and fill light come from the same sky
    const envScene = new THREE.Scene();
    envScene.add(ENV.buildSky());
    this.scene.environment = this.pmrem.fromScene(envScene, 0, 1, 1000).texture;
    this.scene.environmentIntensity = 0.55;
    this.scene.add(sky);
    this.scene.fog = new THREE.Fog(ENV.PALETTE.horizon, 90, 260);
    this.scene.add(ENV.buildTerrain(), ENV.buildRocks());
    this.water = ENV.buildWater(this.time);
    this.clouds = ENV.buildClouds();
    this.scene.add(this.water, this.clouds, this.forest, this.cover, this.roads);
    // the buildable square shows as a faint frame; a grid appears while placing
    this.area = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.0, depthWrite: false }));
    this.area.position.y = 0.006;
    this.grid = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.45 }));
    this.grid.visible = false;
    this.scene.add(this.area, this.grid);
  }

  /** Trees fill the land you haven't unlocked yet; expanding clears them. */
  private buildForest(size: number): void {
    this.forest.clear();
    this.forest.add(ENV.buildForest(size, this.time));
    const o = (MAP - size) / 2;
    this.area.scale.set(size, 1, size);
    this.area.position.set(MAP / 2, 0.006, MAP / 2);
    const pts: number[] = [];
    for (let i = 0; i <= size; i++) {
      pts.push(o + i, 0.03, o, o + i, 0.03, o + size);
      pts.push(o, 0.03, o + i, o + size, 0.03, o + i);
    }
    this.grid.geometry.dispose();
    this.grid.geometry = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  }

  /** Streets join up by themselves: asphalt, cream kerbs where a road ends or turns, dashes down straight stretches. */
  private buildRoads(s: LandState): void {
    this.roads.clear();
    const isRoad = new Set(s.buildings.filter((b) => b.item === 'road').map((b) => `${b.x},${b.z}`));
    if (!isRoad.size) return;
    const asphalt: THREE.BufferGeometry[] = [], kerb: THREE.BufferGeometry[] = [], dash: THREE.BufferGeometry[] = [];
    for (const key of isRoad) {
      const [x, z] = key.split(',').map(Number);
      const cx = x + 0.5, cz = z + 0.5;
      const n = isRoad.has(`${x},${z - 1}`), so = isRoad.has(`${x},${z + 1}`), e = isRoad.has(`${x + 1},${z}`), w = isRoad.has(`${x - 1},${z}`);
      asphalt.push(new THREE.BoxGeometry(1, 0.04, 1).translate(cx, 0.02, cz).toNonIndexed());
      const K = 0.15, H = 0.075;
      if (!n) kerb.push(new THREE.BoxGeometry(1, H, K).translate(cx, H / 2, z + K / 2).toNonIndexed());
      if (!so) kerb.push(new THREE.BoxGeometry(1, H, K).translate(cx, H / 2, z + 1 - K / 2).toNonIndexed());
      if (!e) kerb.push(new THREE.BoxGeometry(K, H, 1).translate(x + 1 - K / 2, H / 2, cz).toNonIndexed());
      if (!w) kerb.push(new THREE.BoxGeometry(K, H, 1).translate(x + K / 2, H / 2, cz).toNonIndexed());
      const along = (e || w) && !(n || so) ? 'x' : (n || so) && !(e || w) ? 'z' : '';
      if (along) for (const off of [-0.25, 0.25]) dash.push(new THREE.BoxGeometry(along === 'x' ? 0.26 : 0.05, 0.006, along === 'x' ? 0.05 : 0.26).translate(cx + (along === 'x' ? off : 0), 0.043, cz + (along === 'z' ? off : 0)).toNonIndexed());
    }
    const add = (list: THREE.BufferGeometry[], m: THREE.Material, shadow = false) => {
      if (!list.length) return;
      const mesh = new THREE.Mesh(mergeGeometries(list)!, m);
      mesh.receiveShadow = true; mesh.castShadow = shadow;
      this.roads.add(mesh);
    };
    add(asphalt, ROAD_MATS.asphalt);
    add(kerb, ROAD_MATS.kerb, true);
    add(dash, ROAD_MATS.dash);
  }

  // ---------- keeping the scene in step with the town ----------
  sync(s: LandState): void {
    this.state = s;
    if (s.size !== this.size) { this.size = s.size; this.buildForest(s.size); }
    this.buildRoads(s);
    const seen = new Set<number>();
    for (const p of s.buildings) {
      seen.add(p.id);
      const key = `${p.item}:${p.x}:${p.z}:${p.rot}:${p.doneAt ? 'site' : 'built'}`;
      let b = this.built.get(p.id);
      if (b && b.key !== key) { b.node.removeFromParent(); b.bubble?.remove(); b = undefined; }
      if (!b) {
        const f = footprint(item(p.item), p.rot);
        // roads are drawn together by buildRoads(); their node only exists for picking and bubbles
        const node = p.item === 'road' ? new THREE.Group() : p.doneAt ? LM.constructionSite(f.w, f.d, p.id) : LM.modelFor(p.item, p.id);
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
    // grass tufts and wildflowers grow wherever nothing is built (rebuilt only when that changes)
    const taken = new Uint8Array(MAP * MAP);
    for (const p of s.buildings) { const f = footprint(item(p.item), p.rot); for (let x = p.x; x < p.x + f.w; x++) for (let z = p.z; z < p.z + f.d; z++) taken[z * MAP + x] = 1; }
    const key = `${s.size}:${Array.from(taken).join('')}`;
    if (key !== this.coverKey) {
      this.coverKey = key;
      this.cover.clear();
      const b = bounds(s);
      this.cover.add(ENV.buildGroundCover((x, z) => {
        const tx = Math.floor(x), tz = Math.floor(z);
        if (tx < 0 || tz < 0 || tx >= MAP || tz >= MAP) return true;
        if (taken[tz * MAP + tx]) return false;
        // in town, keep the lawn tidy: just a few tufts along the edges of the tiles
        const inTown = x >= b.x0 && x < b.x1 && z >= b.z0 && z < b.z1;
        return !inTown || Math.random() < 0.03;
      }, this.time, this.mobile));
    }
    this.syncResidents(population(s));
  }

  private syncResidents(pop: number): void {
    const want = Math.max(2, Math.min(14, Math.round(pop / 3)));
    while (this.residents.length > want) { const r = this.residents.pop()!; r.model.group.removeFromParent(); r.shadow.removeFromParent(); r.bubble?.remove(); }
    while (this.residents.length < want) {
      const i = this.residents.length;
      const skin = i % SKINS.length;
      const model = M.makeFuzzy(this.mats, SKINS[skin], 0.2, 0.06, 9);
      const start = this.freeTile(i * 97 + 3);
      model.group.position.set(start.x, 0.26, start.y);
      // little feet that step when walking, and a soft shadow on the ground
      const footMat = LM.std(SKINS[skin][1], 0.8);
      const feet = [-1, 1].map((sx) => { const f = new THREE.Mesh(FOOT, footMat); f.position.set(sx * 0.09, -0.21, 0.05); f.castShadow = true; model.group.add(f); return f; });
      const shadow = new THREE.Mesh(BLOB, BLOB_MAT);
      shadow.renderOrder = 1;
      this.scene.add(model.group, shadow);
      this.residents.push({ model, skin, feet, shadow, pos: start.clone(), path: [], facing: 0, targetFacing: 0, mode: 'idle', timer: 1 + Math.random() * 3, phase: Math.random() * 10, blinkIn: 1 + Math.random() * 3, blinking: 0, lookIn: 2, look: new THREE.Vector2(), hop: 0, bubbleT: 0, seed: i * 7 + 1 });
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
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.composer.setSize(w, h);
    this.camera.aspect = w / h;
    // a narrow lens for a near-isometric look; tall phone screens get a little more
    this.camera.fov = w / h < 0.8 ? 40 : 30;
    this.camera.updateProjectionMatrix();
  }

  private thumbs = new Map<string, string>();
  private repaint = false;
  private thumbRig: { scene: THREE.Scene; cam: THREE.PerspectiveCamera } | null = null;
  /**
   * A little 3/4 picture of a building or decoration for the shop (a PNG data URL, cached). Drawn with the
   * town's own renderer into a corner of the canvas and copied out before the next frame is shown.
   */
  thumbnail(itemId: string): string {
    const hit = this.thumbs.get(itemId);
    if (hit) return hit;
    if (!this.thumbRig) {
      const scene = new THREE.Scene();
      const sun = new THREE.DirectionalLight(0xfff0d8, 2.4);
      sun.position.copy(this.sunDir).multiplyScalar(10);
      scene.add(sun, new THREE.HemisphereLight(0xdcefff, 0x8a8a6a, 1.1));
      scene.environment = this.scene.environment;
      scene.environmentIntensity = 0.6;
      this.thumbRig = { scene, cam: new THREE.PerspectiveCamera(28, 1, 0.1, 100) };
    }
    const { scene, cam } = this.thumbRig;
    const node = LM.modelFor(itemId, 3);
    scene.add(node);
    const sphere = new THREE.Box3().setFromObject(node).getBoundingSphere(new THREE.Sphere());
    const off = new THREE.Vector3().setFromSphericalCoords(sphere.radius / Math.sin(THREE.MathUtils.degToRad(14)) * 1.02, THREE.MathUtils.degToRad(56), YAW);
    cam.position.copy(sphere.center).add(off);
    cam.lookAt(sphere.center);
    const r = this.renderer, pr = r.getPixelRatio(), N = 192, n = N / pr;
    const size = r.getSize(new THREE.Vector2());
    const clear = r.getClearColor(new THREE.Color()), alpha = r.getClearAlpha();
    r.setRenderTarget(null);
    r.setScissorTest(true);
    r.setViewport(0, 0, n, n);
    r.setScissor(0, 0, n, n);
    r.setClearColor(0xf6ecdc, 1);
    r.shadowMap.autoUpdate = false;
    r.render(scene, cam);
    const out = document.createElement('canvas');
    out.width = out.height = N;
    out.getContext('2d')!.drawImage(this.canvas, 0, this.canvas.height - N, N, N, 0, 0, N, N);
    r.shadowMap.autoUpdate = true;
    r.setScissorTest(false);
    r.setViewport(0, 0, size.x, size.y);
    r.setClearColor(clear, alpha);
    scene.remove(node);
    // repaint the town over the corner once, after this batch of pictures (before the screen updates)
    if (!this.repaint) { this.repaint = true; queueMicrotask(() => { this.repaint = false; if (!this.disposed) this.composer.render(0); }); }
    const url = out.toDataURL('image/png');
    this.thumbs.set(itemId, url);
    return url;
  }

  private placeCamera(): void {
    const off = new THREE.Vector3().setFromSphericalCoords(this.dist, Math.PI / 2 - PITCH, YAW);
    this.camera.position.copy(this.target).add(off);
    this.camera.lookAt(this.target);
  }

  /** World units per screen pixel at the focus point. */
  private unitsPerPx(): number {
    return (2 * this.dist * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2))) / (this.canvas.clientHeight || 1);
  }

  /** Move the view by a screen drag (pixels). Letting go keeps a little glide (see release()). */
  pan(dx: number, dy: number): void {
    this.fly = null;
    const k = this.unitsPerPx();
    const right = new THREE.Vector3(Math.cos(YAW), 0, -Math.sin(YAW));
    const fwd = new THREE.Vector3(-Math.sin(YAW), 0, -Math.cos(YAW));
    const step = new THREE.Vector3().addScaledVector(right, -dx * k).addScaledVector(fwd, dy * k / Math.sin(PITCH));
    this.target.add(step);
    const now = performance.now();
    const dt = Math.max(8, now - this.lastPan) / 1000;
    this.vel.lerp(new THREE.Vector2(step.x / dt, step.z / dt), 0.5);
    this.lastPan = now;
    this.clampTarget(false);
  }

  /** The finger/mouse let go: glide on a little if it was moving. */
  release(): void {
    if (performance.now() - this.lastPan > 90) this.vel.set(0, 0);
  }

  /** Zoom by a factor, towards the point under the cursor/fingers if given. */
  zoom(f: number, cx?: number, cy?: number): void {
    this.fly = null;
    this.zoomGoal = THREE.MathUtils.clamp(this.zoomGoal * f, 9, 56);
    if (cx !== undefined && cy !== undefined) {
      const g = this.ground(cx, cy);
      this.zoomAnchor = g ? new THREE.Vector3(g.x, 0, g.y) : null;
    } else this.zoomAnchor = null;
  }

  /** Keep the view over the island (a soft pull back if you drift past the coast). */
  private clampTarget(hard: boolean): void {
    const dx = this.target.x - ENV.CENTER, dz = this.target.z - ENV.CENTER;
    const lim = ENV.islandRadius(Math.atan2(dz, dx)) - 3;
    const d = Math.hypot(dx, dz);
    if (d > lim) {
      const k = hard ? lim / d : 1 - Math.min(0.25, (d - lim) / d);
      this.target.x = ENV.CENTER + dx * k;
      this.target.z = ENV.CENTER + dz * k;
    }
  }

  /** Glide the camera to a spot (used for the swoop-in and for zooming into the Crossing Gate). */
  flyTo(x: number, z: number, dist: number, dur = 1.4, done?: () => void): void {
    this.vel.set(0, 0);
    this.zoomAnchor = null;
    this.fly = { from: this.target.clone(), to: new THREE.Vector3(x, 0, z), d0: this.dist, d1: dist, t: 0, dur, done };
  }

  /** Start far above the clouds and swoop down onto the town. */
  swoopIn(): void {
    const c = MAP / 2;
    this.target.set(c + 3, 0, c + 3);
    this.dist = 110;
    // frames the crossroads and the Town Hall; tall phone screens look a little further up the street
    if (this.camera.aspect < 0.8) this.flyTo(c - 2, c - 1.5, 25, 2.4);
    else this.flyTo(c - 0.5, c, 21, 2.4);
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
    LM.treeTime.value = T;
    for (const c of this.clouds.children) { c.position.x += c.userData.speed * dt; if (c.position.x > ENV.CENTER + 90) c.position.x -= 180; }
    // camera: scripted glide, or zoom easing + pan glide
    if (this.fly) {
      const f = this.fly;
      f.t += dt;
      const k = ease(f.t / f.dur);
      this.target.lerpVectors(f.from, f.to, k);
      this.dist = f.d0 + (f.d1 - f.d0) * k;
      this.zoomGoal = this.dist;
      if (f.t >= f.dur) { this.fly = null; f.done?.(); }
    } else {
      const d0 = this.dist;
      this.dist += (this.zoomGoal - this.dist) * Math.min(1, dt * 10);
      // keep the point under the cursor in place while zooming
      if (this.zoomAnchor && d0 > 0) this.target.lerp(this.zoomAnchor, 1 - this.dist / d0);
      if (Math.abs(this.zoomGoal - this.dist) < 0.01) this.zoomAnchor = null;
      if (performance.now() - this.lastPan > 40 && this.vel.lengthSq() > 1e-4) {
        this.target.x += this.vel.x * dt; this.target.z += this.vel.y * dt;
        this.vel.multiplyScalar(Math.pow(0.04, dt));
      }
      this.clampTarget(false);
    }
    this.placeCamera();
    // the sun's shadow box follows the view, so shadows stay crisp at any zoom
    this.sun.position.copy(this.target).addScaledVector(this.sunDir, 60);
    this.sun.target.position.copy(this.target);
    const half = THREE.MathUtils.clamp(this.dist * 0.62, 9, 34);
    if (Math.abs(half - this.shadowHalf) > half * 0.08) {
      this.shadowHalf = half;
      Object.assign(this.sun.shadow.camera, { left: -half, right: half, top: half, bottom: -half, near: 1, far: 140 });
      this.sun.shadow.camera.updateProjectionMatrix();
    }
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
    this.composer.render(dt);
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
    // feet: step while walking, tuck in mid-hop; the shadow shrinks as they rise
    const stride = r.mode === 'walk' ? Math.sin(r.phase * 2.6 * Math.PI) * 0.06 : 0;
    r.feet[0].position.z = 0.05 + stride; r.feet[1].position.z = 0.05 - stride;
    r.feet[0].position.y = r.feet[1].position.y = -0.21 - bob * 0.5;
    r.shadow.position.set(r.pos.x, 0.05, r.pos.y);
    r.shadow.scale.setScalar(1 - Math.min(0.5, bob * 1.6));
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
