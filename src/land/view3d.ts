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
import { glbFuzzy, glbReady } from '../game/fuzzyGlb';
import { MAP, NAMES, bounds, cropProgress, finished, item, footprint, good, population, walkway, type LandState, type Placed } from './rules';
import { trophyLook } from './trophies';

const PITCH = THREE.MathUtils.degToRad(50);
const YAW = THREE.MathUtils.degToRad(45);
/** the town opens no further out than this (you can still zoom out to see the whole island) */
const OPEN_MAX = 30;
const easeOut = (k: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, k)), 3);
const ease = (k: number) => { k = Math.min(1, Math.max(0, k)); return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; };
const SKINS: [string, string][] = [['#ff86bb', '#b8235f'], ['#7dffcf', '#22b5a0'], ['#ffe066', '#ff8c42'], ['#7ad7ff', '#2f7fe0'], ['#ff6b8b', '#b0004f'], ['#ffb3d9', '#d6337f'], ['#ffffff', '#b9c2cf'], ['#ffc078', '#e8590c'], ['#b8f28a', '#4f9e2f']];
/** Each Fuzzy's look and character: an outfit, and how fast, chatty, hoppy and home-loving they are. */
const OUTFITS = ['bow', 'beanie', 'none', 'straw', 'flower', 'scarf', 'beanie', 'bow', 'straw', 'scarf', 'flower', 'none', 'bow', 'beanie'] as const;
type Outfit = typeof OUTFITS[number];
interface Persona { speed: number; chatty: number; hoppy: number; homebody: number; farmer: number }

const FOOT = new THREE.SphereGeometry(0.06, 12, 8).scale(1, 0.55, 1.35);
const BLOB = new THREE.CircleGeometry(0.24, 20).rotateX(-Math.PI / 2);
const FENCE_MAT = new THREE.MeshStandardMaterial({ color: '#c9925b', roughness: 0.85 });
const BLOB_MAT = new THREE.MeshBasicMaterial({ map: GT.glow('rgba(0,0,0,0.45)', 'rgba(0,0,0,0)'), transparent: true, depthWrite: false });
const ROAD_MATS = {
  asphalt: new THREE.MeshStandardMaterial({ color: '#a39d96', roughness: 0.92 }),
  walk: new THREE.MeshStandardMaterial({ color: '#efe6d6', roughness: 0.85 }),
  dash: new THREE.MeshStandardMaterial({ color: '#fff6e0', roughness: 0.7 }),
  pole: new THREE.MeshStandardMaterial({ color: '#4a4f5a', roughness: 0.45, metalness: 0.6 }),
  lamp: new THREE.MeshStandardMaterial({ color: '#fff3c4', emissive: '#ffd36b', emissiveIntensity: 0.9, roughness: 0.3 }),
};
/** Sidewalk width and the radius of rounded road ends/turns (tiles). */
const WALK = 0.17, ROUND = 0.3;

export type Pick = { kind: 'building'; id: number } | { kind: 'resident'; index: number } | { kind: 'ground'; x: number; z: number } | null;

interface Built { node: THREE.Group; placed: Placed; key: string; cropNode?: THREE.Group; cropId?: string; bubble?: HTMLElement; smoke: number }
type Goal = { kind: 'visit'; id: number; door: THREE.Vector2; face: number } | { kind: 'work'; id: number; face: number } | { kind: 'sit'; id: number; seat: THREE.Vector3; face: number } | { kind: 'wander' };
interface Resident {
  model: M.FuzzyModel; skin: number; feet: THREE.Mesh[]; shadow: THREE.Mesh; name: string; persona: Persona;
  pos: THREE.Vector2; path: THREE.Vector2[]; facing: number; targetFacing: number; goal: Goal | null;
  mode: 'walk' | 'idle' | 'hop' | 'enter' | 'inside' | 'exit' | 'work' | 'sit' | 'chat' | 'greet'; timer: number; phase: number; blinkIn: number; blinking: number;
  lookIn: number; look: THREE.Vector2; hop: number; bubble?: HTMLElement; bubbleT: number; seed: number; mood: 'normal' | 'happy' | 'sleepy'; y: number; wave: number;
  /** a lasting badge over the head ("Completed" once its mission is done) */
  mark?: HTMLElement;
}
interface Floater { el: HTMLElement; pos: THREE.Vector3; t: number }
interface Puff { s: THREE.Sprite; v: THREE.Vector3; life: number; max: number; grow: number }

const Resident_greet = (n: string) => ['Hi {n}!', 'Hey {n}! 👋', 'Nice day, {n}!', 'Ooh, hi {n}!', 'Hug, {n}? 🤗', 'Hehe, {n}!', 'Love your look, {n}!'][Math.floor(Math.random() * 7)].replace('{n}', n);

export class LandView {
  readonly renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(30, 1, 0.5, 900);
  private sun = new THREE.DirectionalLight(0xffe6c4, 3.05);
  private hemi = new THREE.HemisphereLight(0xdcefff, 0x6f8a4a, 0.68);
  private sunDir = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(40), THREE.MathUtils.degToRad(215));
  private composer: EffectComposer;
  private shadowHalf = 0;
  private water!: THREE.Mesh;
  private cover = new THREE.Group();
  private coverKey = '';
  private roads = new THREE.Group();
  private fences = new THREE.Group();
  private butterflies: { g: THREE.Group; wings: THREE.Mesh[]; home: THREE.Vector2; ph: number; sp: number }[] = [];
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
  private hiddenNode: THREE.Object3D | null = null;
  private selected: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
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
  /** Tapping a ready bubble (the screen collects / harvests that building). */
  onBubble: ((id: number) => void) | null = null;
  private fly: { from: THREE.Vector3; to: THREE.Vector3; d0: number; d1: number; t: number; dur: number; done?: () => void; out?: boolean } | null = null;
  /** The Fuzzy the camera is keeping company with (Fuzzies Adventures): the view glides after it until released. */
  private focus: number | null = null;
  private ray = new THREE.Raycaster();

  /** `phrase(i)` gives a resident something to say; `onFrame` runs after each frame (the screen keeps its HUD fresh). */
  constructor(private canvas: HTMLCanvasElement, private overlay: HTMLElement, private mobile: boolean, private phrase: (seed: number) => string) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.5 : 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    // neutral tone mapping keeps our colours saturated (ART.md)
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure = 0.95;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.pmrem = new THREE.PMREMGenerator(this.renderer);

    const s = this.sun;
    s.castShadow = true;
    s.shadow.mapSize.set(mobile ? 1536 : 2048, mobile ? 1536 : 2048);
    s.shadow.bias = -0.0005;
    s.shadow.normalBias = 0.025;
    s.shadow.radius = 2.5;
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
    this.selected = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide }));
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
    this.scene.add(this.water, this.clouds, this.forest, this.cover, this.roads, this.fences);
    this.addButterflies();
    // the buildable square shows as a faint frame; a grid appears while placing
    this.area = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.0, depthWrite: false }));
    this.area.position.y = 0.006;
    this.grid = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.45 }));
    this.grid.visible = false;
    this.scene.add(this.area, this.grid);
  }

  /** A few butterflies flutter around town (cheap: two little wings each). */
  private addButterflies(): void {
    const wing = new THREE.CircleGeometry(0.05, 10).scale(1, 1.3, 1).translate(0.05, 0, 0);
    const cols = ['#ff9fc8', '#ffd43b', '#ffffff', '#7ad7ff', '#ffb066', '#ff6b9a'];
    const n = this.mobile ? 5 : 8;
    for (let i = 0; i < n; i++) {
      const g = new THREE.Group();
      const m = new THREE.MeshStandardMaterial({ color: cols[i % cols.length], side: THREE.DoubleSide, roughness: 0.6, emissive: cols[i % cols.length], emissiveIntensity: 0.15 });
      const wings = [1, -1].map((sx) => { const w = new THREE.Mesh(wing, m); w.scale.x = sx; g.add(w); return w; });
      g.add(new THREE.Mesh(new THREE.CapsuleGeometry(0.008, 0.05, 2, 4).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#3b2a20' })));
      this.scene.add(g);
      this.butterflies.push({ g, wings, home: new THREE.Vector2(MAP / 2 + (Math.random() - 0.5) * 10, MAP / 2 + (Math.random() - 0.5) * 10), ph: Math.random() * 10, sp: 0.5 + Math.random() * 0.5 });
    }
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

  /**
   * Streets join up by themselves: each road tile is asphalt with a raised sidewalk on every side that has no
   * road next to it. Dead ends and turns get rounded outer corners; junctions get curved sidewalk corners,
   * zebra crossings on the arms and lane lines down straight stretches. Street lamps stand on the sidewalks.
   */
  private buildRoads(s: LandState): void {
    this.roads.clear();
    const isRoad = new Set(s.buildings.filter((b) => b.item === 'road').map((b) => `${b.x},${b.z}`));
    if (!isRoad.size) return;
    const has = (x: number, z: number) => isRoad.has(`${x},${z}`);
    const degree = (x: number, z: number) => +has(x, z - 1) + +has(x + 1, z) + +has(x, z + 1) + +has(x - 1, z);
    const asphalt: THREE.BufferGeometry[] = [], walk: THREE.BufferGeometry[] = [], dash: THREE.BufferGeometry[] = [], poles: THREE.BufferGeometry[] = [], heads: THREE.BufferGeometry[] = [];
    const K = WALK, R = ROUND, H = 0.07;
    // corner points of the asphalt for the NE corner of a tile in a canonical frame (u right, v down), given
    // whether the sides "top" (a) and "right" (b) have road and the diagonal (d) too; rotated for other corners
    const corner = (a: boolean, b: boolean, d: boolean): [number, number][] => {
      if (!a && !b) return Array.from({ length: 7 }, (_, i) => { const t = -Math.PI / 2 + (i / 6) * (Math.PI / 2); return [1 - K - R + R * Math.cos(t), K + R + R * Math.sin(t)]; });
      if (a && b && !d) return Array.from({ length: 6 }, (_, i) => { const t = Math.PI - (i / 5) * (Math.PI / 2); return [1 + K * Math.cos(t), K * Math.sin(t)]; });
      return [[b ? 1 : 1 - K, a ? 0 : K]];
    };
    const rot = (p: [number, number], k: number): [number, number] => { let [u, v] = p; for (let i = 0; i < k; i++) [u, v] = [1 - v, u]; return [u, v]; };
    const flat = (shape: THREE.Shape, h: number, y0: number) => new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false, curveSegments: 4 }).rotateX(Math.PI / 2).translate(0, y0 + h, 0);
    let lampN = 0;
    for (const key of isRoad) {
      const [x, z] = key.split(',').map(Number);
      const n = has(x, z - 1), e = has(x + 1, z), so = has(x, z + 1), w = has(x - 1, z);
      const ne = has(x + 1, z - 1), se = has(x + 1, z + 1), sw = has(x - 1, z + 1), nw = has(x - 1, z - 1);
      const pts: [number, number][] = [
        ...corner(w, n, nw).map((p) => rot(p, 3)), ...corner(n, e, ne), ...corner(e, so, se).map((p) => rot(p, 1)), ...corner(so, w, sw).map((p) => rot(p, 2)),
      ];
      const outline = new THREE.Shape(pts.map(([u, v]) => new THREE.Vector2(x + u, z + v)));
      asphalt.push(flat(outline, 0.035, 0));
      // sidewalk pieces (no holes, so triangulation stays clean): a strip along each side without road, a fillet
      // behind each rounded corner and a quarter-round where two roads meet without the diagonal
      const piece = (poly: [number, number][], k: number) => walk.push(flat(new THREE.Shape(poly.map((p) => { const [u, v] = rot(p, k); return new THREE.Vector2(x + u, z + v); })), H, 0));
      const sides: [boolean, boolean, boolean, number][] = [[n, e, ne, 0], [e, so, se, 1], [so, w, sw, 2], [w, n, nw, 3]];
      for (const [a, b, d, k] of sides) {
        if (!a) piece([[0, 0], [1, 0], [1, K], [0, K]], k);
        if (!a && !b) piece(([[1 - K, K], ...corner(false, false, false)] as [number, number][]).reverse(), k);
        else if (a && b && !d) piece([[1, 0], ...corner(true, true, false)], k);
      }
      const deg = degree(x, z);
      const straightX = e && w && !n && !so, straightZ = n && so && !e && !w;
      // lane lines down straight stretches; zebra crossings next to a junction
      if (straightX || straightZ) {
        const nearJ = straightX ? [[x + 1, z, 1], [x - 1, z, -1]] : [[x, z + 1, 1], [x, z - 1, -1]];
        const j = nearJ.find(([jx, jz]) => degree(jx, jz) >= 3);
        if (j) {
          for (let i = 0; i < 4; i++) {
            const off = -0.24 + i * 0.16, at = 0.5 - 0.17;
            const g = straightX ? new THREE.BoxGeometry(0.22, 0.006, 0.08).translate(x + 0.5 + j[2] * at, 0.038, z + 0.5 + off) : new THREE.BoxGeometry(0.08, 0.006, 0.22).translate(x + 0.5 + off, 0.038, z + 0.5 + j[2] * at);
            dash.push(g.toNonIndexed());
          }
        } else for (const off of [-0.25, 0.25]) dash.push(new THREE.BoxGeometry(straightX ? 0.24 : 0.035, 0.006, straightX ? 0.035 : 0.24).translate(x + 0.5 + (straightX ? off : 0), 0.038, z + 0.5 + (straightZ ? off : 0)).toNonIndexed());
        // a street lamp on every third straight tile, on alternating sides
        if (deg === 2 && (x * 7 + z * 13) % 3 === 0) {
          const side = lampN++ % 2 ? 1 : -1;
          const lx = straightX ? x + 0.5 : x + 0.5 + side * (0.5 - K / 2), lz = straightX ? z + 0.5 + side * (0.5 - K / 2) : z + 0.5;
          poles.push(new THREE.CylinderGeometry(0.016, 0.022, 0.62, 8).translate(lx, H + 0.31, lz).toNonIndexed());
          poles.push(new THREE.CylinderGeometry(0.05, 0.035, 0.035, 12).translate(lx, H + 0.64, lz).toNonIndexed());
          heads.push(new THREE.SphereGeometry(0.05, 14, 10).translate(lx, H + 0.69, lz).toNonIndexed());
        }
      }
    }
    const add = (list: THREE.BufferGeometry[], m: THREE.Material, shadow = false) => {
      if (!list.length) return;
      const mesh = new THREE.Mesh(mergeGeometries(list.map((g) => g.index ? g.toNonIndexed() : g))!, m);
      mesh.receiveShadow = true; mesh.castShadow = shadow;
      this.roads.add(mesh);
    };
    add(asphalt, ROAD_MATS.asphalt);
    add(walk, ROAD_MATS.walk, true);
    add(dash, ROAD_MATS.dash);
    add(poles, ROAD_MATS.pole, true);
    add(heads, ROAD_MATS.lamp);
  }

  /** A rustic wooden fence around each patch of fields (only on the outer edges), so farms look tended. */
  private buildFences(s: LandState): void {
    this.fences.clear();
    const isField = new Set(s.buildings.filter((b) => b.item === 'field').map((b) => `${b.x},${b.z}`));
    if (!isField.size) return;
    const parts: THREE.BufferGeometry[] = [];
    const I = 0.035; // just inside the plot edge
    for (const key of isField) {
      const [x, z] = key.split(',').map(Number);
      const edges: [boolean, number, number, number, number][] = [
        [!isField.has(`${x},${z - 1}`), x, z + I, x + 1, z + I], [!isField.has(`${x},${z + 1}`), x, z + 1 - I, x + 1, z + 1 - I],
        [!isField.has(`${x - 1},${z}`), x + I, z, x + I, z + 1], [!isField.has(`${x + 1},${z}`), x + 1 - I, z, x + 1 - I, z + 1],
      ];
      for (const [on, x0, z0, x1, z1] of edges) {
        if (!on) continue;
        const along = x0 !== x1, len = along ? x1 - x0 : z1 - z0;
        for (const y of [0.11, 0.2]) parts.push(new THREE.BoxGeometry(along ? len : 0.022, 0.025, along ? 0.022 : len).translate((x0 + x1) / 2, y, (z0 + z1) / 2));
        for (let k = 0; k <= 2; k++) { const t = k / 2; parts.push(new THREE.BoxGeometry(0.035, 0.26, 0.035).translate(x0 + (x1 - x0) * t, 0.13, z0 + (z1 - z0) * t)); }
      }
    }
    const mesh = new THREE.Mesh(mergeGeometries(parts.map((g) => g.toNonIndexed()))!, FENCE_MAT);
    mesh.castShadow = true; mesh.receiveShadow = true;
    this.fences.add(mesh);
  }

  // ---------- keeping the scene in step with the town ----------
  sync(s: LandState): void {
    this.state = s;
    if (s.size !== this.size) { this.size = s.size; this.buildForest(s.size); }
    this.buildRoads(s);
    this.buildFences(s);
    const seen = new Set<number>();
    for (const p of s.buildings) {
      seen.add(p.id);
      const key = `${p.item}:${p.x}:${p.z}:${p.rot}:${p.doneAt ? 'site' : 'built'}${trophyLook(p.item)}`; // a trophy rebuilds when its metal changes
      let b = this.built.get(p.id);
      if (b && b.key !== key) { b.node.removeFromParent(); b.bubble?.remove(); b = undefined; }
      if (!b) {
        const f = footprint(item(p.item), p.rot);
        // roads are drawn together by buildRoads(); their node only exists for picking and bubbles
        const node = p.item === 'road' ? new THREE.Group() : p.doneAt ? LM.constructionSite(f.w, f.d, p.id) : LM.modelFor(p.item, p.id);
        node.position.set(p.x + f.w / 2, 0, p.z + f.d / 2);
        if (!p.doneAt) node.rotation.y = -(p.rot & 3) * Math.PI / 2;
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
      const f = footprint(item(p.item), p.rot);
      for (let x = p.x; x < p.x + f.w; x++) for (let z = p.z; z < p.z + f.d; z++) this.blocked[z * MAP + x] = walkway(p.item) ? 2 : 1;
    }
    // anyone standing where something was just built steps aside
    for (const r of this.residents) if (r.mode !== 'inside' && this.blocked[Math.floor(r.pos.y) * MAP + Math.floor(r.pos.x)] === 1 && r.mode !== 'sit') { r.pos.copy(this.freeTile(r.seed)); r.path = []; r.goal = null; r.mode = 'idle'; }
    // grass tufts and wildflowers grow wherever nothing is built (rebuilt only when that changes)
    const taken = new Uint8Array(MAP * MAP);
    for (const p of s.buildings) { const f = footprint(item(p.item), p.rot); for (let x = p.x; x < p.x + f.w; x++) for (let z = p.z; z < p.z + f.d; z++) taken[z * MAP + x] = 1; }
    const key = `${s.size}:${Array.from(taken).join('')}`;
    if (key !== this.coverKey) {
      this.coverKey = key;
      this.cover.clear();
      const b = bounds(s);
      const at = (x: number, z: number) => (x < 0 || z < 0 || x >= MAP || z >= MAP ? 0 : taken[z * MAP + x]);
      const kind = new Uint8Array(MAP * MAP); // 1 = building/field, 2 = road or path
      for (const p of s.buildings) { const f = footprint(item(p.item), p.rot); for (let x = p.x; x < p.x + f.w; x++) for (let z = p.z; z < p.z + f.d; z++) kind[z * MAP + x] = walkway(p.item) ? 2 : 1; }
      const kindAt = (x: number, z: number) => (x < 0 || z < 0 || x >= MAP || z >= MAP ? 0 : kind[z * MAP + x]);
      this.cover.add(ENV.buildGroundCover((x, z) => {
        const tx = Math.floor(x), tz = Math.floor(z);
        if (tx < 0 || tz < 0 || tx >= MAP || tz >= MAP) return true;
        if (taken[tz * MAP + tx]) return false;
        // in town, keep the lawn tidy: just a few tufts
        const inTown = x >= b.x0 && x < b.x1 && z >= b.z0 && z < b.z1;
        return !inTown || Math.random() < 0.05;
      }, this.time, this.mobile, (x, z) => {
        // landscaping weight: hug the sides of buildings and the edges of sidewalks, on free lawn only
        const tx = Math.floor(x), tz = Math.floor(z);
        if (at(tx, tz) || !(x >= b.x0 && x < b.x1 && z >= b.z0 && z < b.z1)) return 0;
        const fx = x - tx, fz = z - tz;
        let w = 0;
        for (const [dx, dz, d] of [[1, 0, 1 - fx], [-1, 0, fx], [0, 1, 1 - fz], [0, -1, fz]] as const) {
          const k = kindAt(tx + dx, tz + dz);
          if (k === 1 && d < 0.3) w = Math.max(w, 1 - d / 0.3);
          if (k === 2 && d < 0.18) w = Math.max(w, 0.45 * (1 - d / 0.18));
        }
        return w;
      }, this.mats.leaves));
    }
    this.syncResidents(population(s));
  }

  /** Use the owner's 3D model for the Fuzzies (when it has loaded); rebuilds the residents in place. */
  private deluxe = false;
  useDeluxe(on: boolean): void {
    const next = on && glbReady();
    if (next === this.deluxe) return;
    this.deluxe = next;
    const keep = this.residents.map((r) => ({ pos: r.pos.clone(), facing: r.facing }));
    while (this.residents.length) { const r = this.residents.pop()!; r.model.group.removeFromParent(); r.shadow.removeFromParent(); r.bubble?.remove(); r.mark?.remove(); }
    this.thumbs.forEach((_, k) => { if (k.startsWith('fuzzy:')) this.thumbs.delete(k); });
    if (this.state) this.syncResidents(population(this.state));
    this.residents.forEach((r, i) => { if (keep[i]) { r.pos.copy(keep[i].pos); r.facing = r.targetFacing = keep[i].facing; } });
    if (this.focus !== null && !this.residents[this.focus]) this.focus = null;
  }
  private makeResident(skin: [string, string]): M.FuzzyModel {
    return this.deluxe && glbReady() ? glbFuzzy(skin, 0.21, { shadow: !this.mobile, size: this.mobile ? 512 : 768 }) : M.makeFuzzy(this.mats, skin, 0.2, 0.06, this.mobile ? 7 : 9);
  }

  private syncResidents(pop: number): void {
    const want = Math.max(2, Math.min(14, Math.round(pop / 3)));
    while (this.residents.length > want) { const r = this.residents.pop()!; r.model.group.removeFromParent(); r.shadow.removeFromParent(); r.bubble?.remove(); r.mark?.remove(); }
    while (this.residents.length < want) {
      const i = this.residents.length;
      const skin = i % SKINS.length;
      const model = this.makeResident(SKINS[skin]);
      const start = this.freeTile(i * 97 + 3);
      model.group.position.set(start.x, 0.26, start.y);
      // little feet that step when walking, an outfit, and a soft shadow on the ground
      const footMat = LM.std(SKINS[skin][1], 0.8);
      const feet = [-1, 1].map((sx) => { const f = new THREE.Mesh(FOOT, footMat); f.position.set(sx * 0.09, -0.21, 0.05); f.castShadow = true; model.group.add(f); return f; });
      const outfit = LM.fuzzyOutfit(OUTFITS[i % OUTFITS.length] as Outfit, i);
      if (outfit) model.body.add(outfit);
      const shadow = new THREE.Mesh(BLOB, BLOB_MAT);
      shadow.renderOrder = 1;
      this.scene.add(model.group, shadow);
      const r = GT.rng(i * 31 + 7);
      const persona: Persona = { speed: 0.85 + r() * 0.4, chatty: 0.2 + r() * 0.6, hoppy: 0.05 + r() * 0.2, homebody: 0.2 + r() * 0.6, farmer: 0.2 + r() * 0.6 };
      this.residents.push({ model, skin, feet, shadow, name: NAMES[i % NAMES.length], persona, pos: start.clone(), path: [], facing: 0, targetFacing: 0, goal: null, mode: 'idle', timer: 1 + Math.random() * 3, phase: Math.random() * 10, blinkIn: 1 + Math.random() * 3, blinking: 0, lookIn: 2, look: new THREE.Vector2(), hop: 0, bubbleT: 0, seed: i * 7 + 1, mood: 'normal', y: 0, wave: 0 });
    }
  }

  private inArea(x: number, z: number): boolean {
    const b = this.state ? bounds(this.state) : { x0: 0, z0: 0, x1: MAP, z1: MAP };
    return x >= b.x0 && z >= b.z0 && x < b.x1 && z < b.z1;
  }
  private walkable = (x: number, z: number) => this.inArea(x, z) && this.blocked[z * MAP + x] !== 1;

  private freeTile(seed: number): THREE.Vector2 {
    const r = GT.rng(seed + Math.floor(Math.random() * 1e6));
    for (let k = 0; k < 200; k++) {
      const x = Math.floor(r() * MAP), z = Math.floor(r() * MAP);
      if (this.walkable(x, z)) return new THREE.Vector2(x + 0.5, z + 0.5);
    }
    return new THREE.Vector2(MAP / 2, MAP / 2);
  }

  /**
   * The nicest walk between two tiles: Dijkstra over free tiles where streets and paths are cheaper than the
   * lawn, so Fuzzies keep to the pavements when there are some, and cut across the grass when there aren't.
   */
  private route(from: THREE.Vector2, to: THREE.Vector2): THREE.Vector2[] {
    const sx = Math.floor(from.x), sz = Math.floor(from.y), tx = Math.floor(to.x), tz = Math.floor(to.y);
    const N = MAP * MAP, start = sz * MAP + sx, end = tz * MAP + tx;
    if (!this.walkable(tx, tz)) return [];
    const dist = new Float32Array(N).fill(Infinity), prev = new Int32Array(N).fill(-1);
    const heap: number[] = [start]; // a small binary heap of tile indices keyed by dist
    dist[start] = 0; prev[start] = start;
    const up = (i: number) => { while (i > 0) { const p = (i - 1) >> 1; if (dist[heap[p]] <= dist[heap[i]]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
    const down = (i: number) => { for (;;) { const l = i * 2 + 1, r = l + 1; let m = i; if (l < heap.length && dist[heap[l]] < dist[heap[m]]) m = l; if (r < heap.length && dist[heap[r]] < dist[heap[m]]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } };
    const done = new Uint8Array(N);
    while (heap.length) {
      const cur = heap[0];
      const last = heap.pop()!;
      if (heap.length) { heap[0] = last; down(0); }
      if (done[cur]) continue;
      done[cur] = 1;
      if (cur === end) break;
      const x = cur % MAP, z = (cur / MAP) | 0;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, nz = z + dz, n = nz * MAP + nx;
        if (nx < 0 || nz < 0 || nx >= MAP || nz >= MAP || done[n] || !this.walkable(nx, nz)) continue;
        const cost = this.blocked[n] === 2 ? 1 : 2.4;
        if (dist[cur] + cost < dist[n]) { dist[n] = dist[cur] + cost; prev[n] = cur; heap.push(n); up(heap.length - 1); }
      }
    }
    if (prev[end] === -1) return [];
    const out: THREE.Vector2[] = [];
    for (let c = end; c !== prev[c]; c = prev[c]) {
      const onWalk = this.blocked[c] === 2;
      const j = onWalk ? 0.12 : 0.3; // on pavements they keep closer to the middle
      out.push(new THREE.Vector2((c % MAP) + 0.5 + (Math.random() - 0.5) * j, ((c / MAP) | 0) + 0.5 + (Math.random() - 0.5) * j));
    }
    return out.reverse();
  }

  /** Where a building's front door is (world x/z), the tile just outside it, and which way to face to go in. */
  private doorOf(p: Placed): { door: THREE.Vector2; outside: THREE.Vector2; face: number } | null {
    const b = this.built.get(p.id);
    if (!b || p.doneAt) return null;
    const d = b.node.userData.door as THREE.Vector3 | undefined;
    if (!d) return null;
    b.node.updateMatrixWorld();
    const w = d.clone().applyMatrix4(b.node.matrixWorld);
    const dir = [[0, 1], [-1, 0], [0, -1], [1, 0]][p.rot & 3];
    const f = footprint(item(p.item), p.rot);
    const cx = p.x + f.w / 2, cz = p.z + f.d / 2;
    const half = dir[0] ? f.w / 2 : f.d / 2;
    const outside = new THREE.Vector2(Math.floor(cx + dir[0] * (half + 0.5) + (dir[0] ? 0 : w.x - cx)) + 0.5, Math.floor(cz + dir[1] * (half + 0.5) + (dir[1] ? 0 : w.z - cz)) + 0.5);
    return { door: new THREE.Vector2(w.x + dir[0] * 0.12, w.z + dir[1] * 0.12), outside, face: Math.atan2(-dir[0], -dir[1]) };
  }

  /** Pick something to do: pop home, tend a field, sit on a bench, or stroll somewhere. */
  private plan(r: Resident, T: number): void {
    const s = this.state;
    const pick = <X,>(list: X[]): X | undefined => list[Math.floor(Math.random() * list.length)];
    const near = (p: Placed) => Math.hypot(p.x - r.pos.x, p.z - r.pos.y) < 12;
    const roll = Math.random();
    let goal: Goal = { kind: 'wander' };
    let target: THREE.Vector2 | null = null;
    // pop indoors now and then, but most Fuzzies stay out and about where you can see them
    const indoors = this.residents.filter((x) => x.mode === 'inside' || x.mode === 'enter' || x.goal?.kind === 'visit').length;
    if (s && roll < r.persona.homebody * 0.35 && indoors < Math.max(1, Math.floor(this.residents.length * 0.3))) {
      const home = pick(s.buildings.filter((p) => !p.doneAt && near(p) && ['house', 'factory', 'special'].includes(item(p.item).kind) && p.item !== 'gate'));
      const d = home && this.doorOf(home);
      if (home && d && this.walkable(Math.floor(d.outside.x), Math.floor(d.outside.y))) { goal = { kind: 'visit', id: home.id, door: d.door, face: d.face }; target = d.outside; }
    } else if (s && roll < 0.55 + r.persona.farmer * 0.3) {
      if (Math.random() < 0.45) {
        const bench = pick(s.buildings.filter((p) => p.item === 'bench' && near(p)));
        if (bench) {
          const dir = [[0, 1], [-1, 0], [0, -1], [1, 0]][bench.rot & 3];
          const o = new THREE.Vector2(bench.x + 0.5 + dir[0], bench.z + 0.5 + dir[1]);
          if (this.walkable(Math.floor(o.x), Math.floor(o.y)) && !this.residents.some((x) => x.goal?.kind === 'sit' && x.goal.id === bench.id)) {
            goal = { kind: 'sit', id: bench.id, seat: new THREE.Vector3(bench.x + 0.5 + dir[0] * 0.08, 0.36, bench.z + 0.5 + dir[1] * 0.08), face: Math.atan2(dir[0], dir[1]) };
            target = o;
          }
        }
      }
      if (!target) {
        const f = pick(s.buildings.filter((p) => p.item === 'field' && near(p)));
        if (f) {
          const spots = [[0, 1], [0, -1], [1, 0], [-1, 0]].map(([dx, dz]) => [f.x + dx, f.z + dz]).filter(([x, z]) => this.walkable(x, z));
          const sp = pick(spots);
          if (sp) { goal = { kind: 'work', id: f.id, face: Math.atan2(f.x - sp[0], f.z - sp[1]) }; target = new THREE.Vector2(sp[0] + 0.5 - (sp[0] - f.x) * 0.25, sp[1] + 0.5 - (sp[1] - f.z) * 0.25); }
        }
      }
    }
    if (!target) {
      // a stroll: most often along the streets
      const walks = s?.buildings.filter((p) => walkway(p.item)) ?? [];
      const w = Math.random() < 0.65 ? pick(walks) : undefined;
      target = w ? new THREE.Vector2(w.x + 0.5, w.z + 0.5) : this.freeTile(r.seed + Math.floor(T * 10));
    }
    if (target.distanceTo(r.pos) > 14) { r.timer = 1; return; }
    r.path = this.route(r.pos, target);
    if (goal.kind === 'visit') r.path.push(goal.door.clone());
    if (goal.kind === 'work') r.path.push(target.clone());
    if (r.path.length) { r.mode = 'walk'; r.goal = goal; } else r.timer = 1;
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
    const key = itemId + trophyLook(itemId); // a trophy's picture follows its metal
    const hit = this.thumbs.get(key);
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
    return this.snap(LM.modelFor(itemId, 3), key, THREE.MathUtils.degToRad(56), YAW, 0.9);
  }

  /** Photograph any node with the thumbnail rig: `polar` = how high the camera sits, `azimuth` = from which side, `fit` = how tightly framed. */
  private snap(node: THREE.Object3D, key: string, polar: number, azimuth: number, fit: number): string {
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
    scene.add(node);
    const sphere = new THREE.Box3().setFromObject(node).getBoundingSphere(new THREE.Sphere());
    const off = new THREE.Vector3().setFromSphericalCoords(sphere.radius / Math.sin(THREE.MathUtils.degToRad(14)) * fit, polar, azimuth);
    cam.position.copy(sphere.center).add(off);
    cam.lookAt(sphere.center);
    const r = this.renderer, pr = r.getPixelRatio(), N = Math.min(320, Math.floor(Math.min(this.canvas.width, this.canvas.height) * 0.9)), n = N / pr;
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
    this.thumbs.set(key, url);
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
    this.fly = null; this.focus = null;
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

  /** Move the view without any glide afterwards (two-finger drag, edge scrolling, keyboard). */
  nudge(dx: number, dy: number): void {
    this.fly = null; this.focus = null;
    const k = this.unitsPerPx();
    const right = new THREE.Vector3(Math.cos(YAW), 0, -Math.sin(YAW));
    const fwd = new THREE.Vector3(-Math.sin(YAW), 0, -Math.cos(YAW));
    this.target.addScaledVector(right, -dx * k).addScaledVector(fwd, dy * k / Math.sin(PITCH));
    this.vel.set(0, 0);
    this.clampTarget(false);
  }

  /** Keyboard movement: a direction in screen terms (x right, y down), applied smoothly every frame until set to 0. */
  private keyDir = new THREE.Vector2();
  setKeyPan(x: number, y: number): void { this.keyDir.set(x, y); if (x || y) this.fly = null; }

  /** Stop any glide (e.g. when a gesture turns into something else). */
  stopGlide(): void { this.vel.set(0, 0); }

  /** The finger/mouse let go: glide on a little if it was moving. */
  release(): void {
    if (performance.now() - this.lastPan > 90) this.vel.set(0, 0);
  }

  /** Zoom by a factor, towards the point under the cursor/fingers if given. */
  zoom(f: number, cx?: number, cy?: number): void {
    this.fly = null; this.focus = null;
    this.zoomGoal = THREE.MathUtils.clamp(this.zoomGoal * f, 9, 42);
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
  flyTo(x: number, z: number, dist: number, dur = 1.4, done?: () => void, out = false): void {
    this.vel.set(0, 0);
    this.zoomAnchor = null;
    this.fly = { from: this.target.clone(), to: new THREE.Vector3(x, 0, z), d0: this.dist, d1: dist, t: 0, dur, done, out };
  }

  /**
   * Opening the town. A first visit swoops down from above the clouds onto the main street (an ease-out arc — it moves from the
   * first frame, no frozen start). Coming back opens straight on your own town where you left it: a short 0.7 s settle in from a
   * little further out (a view you left very far out is brought in to a comfortable distance).
   */
  swoopIn(saved?: { x: number; z: number; d: number } | null): void {
    const c = MAP / 2;
    if (saved) {
      const d = THREE.MathUtils.clamp(saved.d, 12, OPEN_MAX);
      this.target.set(saved.x, 0, saved.z); this.clampTarget(true);
      this.dist = d * 1.3; this.zoomGoal = this.dist;
      this.flyTo(this.target.x, this.target.z, d, 0.7, undefined, true);
      return;
    }
    this.target.set(c + 3, 0, c + 3);
    this.dist = 90;
    // frames the main street, the Town Hall and the cottages; tall phone screens look a little further up
    if (this.camera.aspect < 0.8) this.flyTo(c - 1, c - 2, 20, 1.9, undefined, true);
    else this.flyTo(c - 0.5, c - 1.8, 18, 1.9, undefined, true);
  }
  /** Without motion: put the camera on the saved view (or the opening view) at once. */
  placeAt(saved?: { x: number; z: number; d: number } | null): void {
    const c = MAP / 2;
    if (saved) { this.target.set(saved.x, 0, saved.z); this.clampTarget(true); this.dist = THREE.MathUtils.clamp(saved.d, 12, OPEN_MAX); }
    else { const phone = this.camera.aspect < 0.8; this.target.set(phone ? c - 1 : c - 0.5, 0, phone ? c - 2 : c - 1.8); this.dist = phone ? 20 : 18; }
    this.zoomGoal = this.dist;
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

  /** What's under this screen point. `piecesOnly` skips the walking Fuzzies (select mode: you're picking buildings). */
  pick(cx: number, cy: number, piecesOnly = false): Pick {
    // residents first (they're small: pick by screen distance)
    const r = this.canvas.getBoundingClientRect();
    let best = -1, bd = piecesOnly ? -1 : 26;
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
  setGhost(g: { item: string; x: number; z: number; rot: number; ok: boolean; moving?: number; seed?: number } | null): void {
    this.grid.visible = !!g || this.editing;
    // while moving something, its old self is hidden so you only see the one you're carrying
    const hide = g?.moving !== undefined ? this.built.get(g.moving)?.node ?? null : null;
    if (this.hiddenNode && this.hiddenNode !== hide) this.hiddenNode.visible = true;
    if (hide) hide.visible = false;
    this.hiddenNode = hide;
    if (!g) {
      if (this.ghost) {
        this.ghost.node.removeFromParent(); this.ghost.pad.removeFromParent();
        this.ghost.node.traverse((o) => { const m = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined; if (m) (Array.isArray(m) ? m : [m]).forEach((x) => x.dispose()); });
        this.ghost = null;
      }
      return;
    }
    const key = `${g.item}:${g.rot}:${g.moving ?? ''}:${g.seed ?? ''}`;
    if (!this.ghost || this.ghost.key !== key) {
      if (this.ghost) { this.ghost.node.removeFromParent(); this.ghost.pad.removeFromParent(); this.ghost = null; }
      // the one you're carrying looks exactly like the real thing (same colours)
      const node = LM.modelFor(g.item, g.moving ?? g.seed ?? 1);
      node.rotation.y = -(g.rot & 3) * Math.PI / 2;
      // a see-through preview (its own copies of the materials, so the real buildings stay solid)
      node.traverse((o) => {
        const m = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
        if (!m) return;
        const see = (x: THREE.Material) => { const c = x.clone(); c.transparent = true; c.opacity = Math.min(c.opacity, 0.78); c.depthWrite = true; return c; };
        (o as THREE.Mesh).material = Array.isArray(m) ? m.map(see) : see(m);
      });
      // the green/red marker is drawn on top of everything, so it shows even over another building
      const pad = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.42, depthWrite: false, depthTest: false }));
      pad.renderOrder = 10;
      this.scene.add(node, pad);
      this.ghost = { node, pad, key };
    }
    const f = footprint(item(g.item), g.rot);
    this.ghost.node.position.set(g.x + f.w / 2, 0.16, g.z + f.d / 2);
    this.ghost.pad.scale.set(f.w + 0.1, 1, f.d + 0.1);
    this.ghost.pad.position.set(g.x + f.w / 2, 0.03, g.z + f.d / 2);
    (this.ghost.pad.material as THREE.MeshBasicMaterial).color.set(g.ok ? 0x40c057 : 0xfa5252);
  }

  /** Is this screen point on the building being carried (its visible model, not only its ground square)? */
  hitGhost(cx: number, cy: number): boolean {
    if (!this.ghost) return false;
    this.ray.setFromCamera(this.ndc(cx, cy), this.camera);
    return this.ray.intersectObject(this.ghost.node, true).length > 0;
  }

  /** A soft rounded outline around a footprint (selection and hover). */
  private outline(w: number, d: number): THREE.ShapeGeometry {
    const rr = (sh: THREE.Path, w: number, d: number, r: number) => { sh.moveTo(-w / 2 + r, -d / 2); sh.lineTo(w / 2 - r, -d / 2); sh.quadraticCurveTo(w / 2, -d / 2, w / 2, -d / 2 + r); sh.lineTo(w / 2, d / 2 - r); sh.quadraticCurveTo(w / 2, d / 2, w / 2 - r, d / 2); sh.lineTo(-w / 2 + r, d / 2); sh.quadraticCurveTo(-w / 2, d / 2, -w / 2, d / 2 - r); sh.lineTo(-w / 2, -d / 2 + r); sh.quadraticCurveTo(-w / 2, -d / 2, -w / 2 + r, -d / 2); return sh; };
    const outer = rr(new THREE.Shape(), w + 0.24, d + 0.24, 0.26) as THREE.Shape;
    outer.holes.push(rr(new THREE.Path(), w + 0.08, d + 0.08, 0.2));
    return new THREE.ShapeGeometry(outer, 6).rotateX(Math.PI / 2);
  }

  select(id: number | null): void {
    const b = id === null ? undefined : this.built.get(id);
    this.selected.visible = !!b;
    this.selectedId = b ? id : null;
    if (!b) return;
    if (this.hoverId === id) this.hover(null);
    const f = footprint(item(b.placed.item), b.placed.rot);
    this.selected.geometry.dispose();
    this.selected.geometry = this.outline(f.w, f.d);
    this.selected.scale.set(1, 1, 1);
    this.selected.position.set(b.placed.x + f.w / 2, 0.09, b.placed.z + f.d / 2);
    b.node.userData.boing = 0;
  }
  selectedId: number | null = null;

  // ---------- multi-select & group moves ----------
  private multi: THREE.Mesh[] = [];
  private multiIds: number[] = [];
  private multiMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide });
  private groupOff = { x: 0, z: 0 };
  private groupBase = new Map<number, THREE.Vector3>();
  private groupPads: THREE.Mesh[] = [];
  private padOk = new THREE.MeshBasicMaterial({ color: 0x40c057, transparent: true, opacity: 0.42, depthWrite: false, depthTest: false });
  private padBad = new THREE.MeshBasicMaterial({ color: 0xfa5252, transparent: true, opacity: 0.5, depthWrite: false, depthTest: false });
  private groupKey = '';
  /** Soft outlines under every selected piece (they follow a group while it's being moved). */
  setMulti(ids: number[]): void {
    this.multiIds = ids;
    if (ids.length) this.selected.visible = false;
    while (this.multi.length < ids.length) {
      const m = new THREE.Mesh(new THREE.BufferGeometry(), this.multiMat);
      m.renderOrder = 3;
      this.scene.add(m);
      this.multi.push(m);
    }
    this.multi.forEach((m, i) => {
      const b = i < ids.length ? this.built.get(ids[i]) : undefined;
      m.visible = !!b;
      if (!b) return;
      const f = footprint(item(b.placed.item), b.placed.rot);
      const key = `${f.w}x${f.d}`;
      if (m.userData.key !== key) { m.geometry.dispose(); m.geometry = this.outline(f.w, f.d); m.userData.key = key; }
      m.position.set(b.placed.x + f.w / 2 + this.groupOff.x, 0.09, b.placed.z + f.d / 2 + this.groupOff.z);
    });
  }
  /**
   * Show a group being carried: the pieces lift and move by (dx, dz) together, roads and fences redraw where they'd
   * be, and a green (fits) or red (doesn't) marker sits under each piece. `null` puts everything back.
   */
  groupPreview(p: { ids: number[]; dx: number; dz: number; bad: number[] } | null): void {
    if (!p) {
      for (const [id, pos] of this.groupBase) { const b = this.built.get(id); if (b) b.node.position.copy(pos); }
      this.groupBase.clear();
      this.groupOff = { x: 0, z: 0 };
      this.groupKey = '';
      for (const m of this.groupPads) m.visible = false;
      this.grid.visible = this.editing;
      if (this.state) { this.buildRoads(this.state); this.buildFences(this.state); }
      this.setMulti(this.multiIds);
      return;
    }
    this.grid.visible = true;
    const set = new Set(p.ids), bad = new Set(p.bad);
    for (const id of p.ids) {
      const b = this.built.get(id);
      if (!b) continue;
      if (!this.groupBase.has(id)) this.groupBase.set(id, b.node.position.clone());
      const base = this.groupBase.get(id)!;
      b.node.position.set(base.x + p.dx, base.y + 0.18, base.z + p.dz);
    }
    while (this.groupPads.length < p.ids.length) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), this.padOk);
      m.renderOrder = 10;
      this.scene.add(m);
      this.groupPads.push(m);
    }
    this.groupPads.forEach((m, i) => {
      const b = i < p.ids.length ? this.built.get(p.ids[i]) : undefined;
      m.visible = !!b;
      if (!b) return;
      const f = footprint(item(b.placed.item), b.placed.rot);
      m.material = bad.has(b.placed.id) ? this.padBad : this.padOk;
      m.scale.set(f.w + 0.06, 1, f.d + 0.06);
      m.position.set(b.placed.x + p.dx + f.w / 2, 0.035, b.placed.z + p.dz + f.d / 2);
    });
    // roads and fences are drawn as a whole: redraw them as they'd look (only when the offset changes)
    const key = `${p.dx},${p.dz}`;
    if (this.state && key !== this.groupKey) {
      this.groupKey = key;
      const moved = { ...this.state, buildings: this.state.buildings.map((b) => (set.has(b.id) ? { ...b, x: b.x + p.dx, z: b.z + p.dz } : b)) };
      if (this.state.buildings.some((b) => set.has(b.id) && b.item === 'road')) this.buildRoads(moved);
      if (this.state.buildings.some((b) => set.has(b.id) && b.item === 'field')) this.buildFences(moved);
    }
    this.groupOff = { x: p.dx, z: p.dz };
    this.setMulti(this.multiIds);
  }

  // ---------- Town Edit Mode ----------
  private editing = false;
  /** Edit mode shows a faint grid over the whole land so moves and drops read clearly. */
  editMode(on: boolean): void {
    this.editing = on;
    (this.grid.material as THREE.LineBasicMaterial).opacity = on ? 0.26 : 0.45;
    this.grid.visible = on || !!this.ghost;
  }
  /** Pieces that were just moved or placed back drop onto their spot with a little squash (a satisfying "plop"). */
  /** A quick happy squash on a building (a harvest, a collect, a replant). */
  bounce(id: number): void { const b = this.built.get(id); if (b && b.node.userData.grow === undefined && b.node.userData.drop === undefined) b.node.userData.boing = 0; }
  settle(ids: number[]): void {
    for (const id of ids) {
      const b = this.built.get(id);
      if (!b || b.node.userData.grow !== undefined) continue;
      b.node.userData.drop = 0;
      b.node.position.y = 0.6;
    }
  }

  // ---------- seasonal atmosphere (land/events.ts says what's on) ----------
  private season: Season | null = null;
  private sunBase = new THREE.Color(0xffe6c4);
  private hemiBase = new THREE.Color(0xdcefff);
  /**
   * Holiday weather: falling leaves, snow, petals, hearts, floating lanterns, sparks or fireflies around the camera, a
   * warm tint on the light and, for Halloween, a shy ghost now and then. `null` = plain weather. Cheap: a few dozen
   * sprites, fewer on phones and when the automatic quality steps down.
   */
  setSeason(o: { atmo: string; tint: string; ghosts?: boolean } | null): void {
    const want = o && o.atmo !== 'none' ? `${o.atmo}:${o.ghosts ? 1 : 0}` : '';
    if ((this.season?.key ?? '') !== want) {
      this.season?.dispose(this.scene);
      this.season = want ? new Season(this.scene, o!.atmo, !!o!.ghosts, this.mobile ? 34 : 70) : null;
    }
    const tint = o?.tint ? new THREE.Color(o.tint) : null;
    this.sun.color.copy(this.sunBase); this.hemi.color.copy(this.hemiBase);
    if (tint) { this.sun.color.lerp(tint, 0.28); this.hemi.color.lerp(tint, 0.22); }
  }

  /** Mouse hover (computers): a fainter outline under what the pointer is over. */
  private hoverMesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial> | null = null;
  private hoverId: number | null = null;
  hover(id: number | null): void {
    if (id === this.hoverId) return;
    this.hoverId = id;
    const b = id === null || id === this.selectedId ? undefined : this.built.get(id);
    if (!this.hoverMesh) {
      this.hoverMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide }));
      this.scene.add(this.hoverMesh);
    }
    this.hoverMesh.visible = !!b;
    if (!b) return;
    const f = footprint(item(b.placed.item), b.placed.rot);
    this.hoverMesh.geometry.dispose();
    this.hoverMesh.geometry = this.outline(f.w, f.d);
    this.hoverMesh.position.set(b.placed.x + f.w / 2, 0.085, b.placed.z + f.d / 2);
  }

  /** Screen position of a building's top (for panels and pop-ups). */
  /** Where a building is on screen (canvas pixels), `y` metres above the ground (1.2 ≈ its roof, 0.3 ≈ a field). */
  screenOf(id: number, y = 1.2): { x: number; y: number } | null {
    const b = this.built.get(id);
    if (!b) return null;
    const v = new THREE.Vector3(b.node.position.x, y, b.node.position.z).project(this.camera);
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
    if (r.mode === 'inside' || r.mode === 'enter') return;
    r.mode = 'hop'; r.hop = 0; r.path = []; r.goal = null; r.y = 0; r.mood = 'happy';
    r.targetFacing = this.facingCamera(r);
    this.say(r, this.phrase(r.seed + Math.floor(Math.random() * 100)), 3.2);
  }

  /** How many Fuzzies are out and about (the adventure host is chosen among them). */
  get residentCount(): number { return this.residents.length; }

  /** A resident's name, colours and whether it can be talked to right now (not indoors). */
  residentInfo(i: number): { name: string; skin: [string, string]; outfit: string; available: boolean; pos: { x: number; z: number } } | null {
    const r = this.residents[i];
    if (!r) return null;
    return { name: r.name, skin: SKINS[r.skin], outfit: OUTFITS[i % OUTFITS.length], available: r.mode !== 'inside' && r.mode !== 'enter' && r.mode !== 'exit', pos: { x: r.pos.x, z: r.pos.y } };
  }

  /**
   * Keep a Fuzzy company: the camera glides in close and follows it, and it stops to face you, waves and says hello.
   * `null` lets it go back to its day (the camera stays where it is).
   */
  focusResident(i: number | null, hello?: string): void {
    const prev = this.focus !== null ? this.residents[this.focus] : null;
    if (prev && (i === null || this.residents[i] !== prev) && prev.mode === 'greet') { prev.mode = 'idle'; prev.timer = 1 + Math.random(); prev.mood = 'normal'; }
    this.focus = i;
    if (i === null) return;
    const r = this.residents[i];
    if (!r) { this.focus = null; return; }
    r.mode = 'greet'; r.hop = 0; r.path = []; r.goal = null; r.y = 0; r.mood = 'happy'; r.timer = 0;
    r.targetFacing = this.facingCamera(r);
    if (hello) this.say(r, hello, 4);
    this.vel.set(0, 0);
    this.zoomAnchor = null;
    const dist = this.mobile ? 8.5 : 7.5;
    this.fly = { from: this.target.clone(), to: new THREE.Vector3(r.pos.x, 0, r.pos.y), d0: this.dist, d1: dist, t: 0, dur: Math.min(1.6, 0.6 + this.target.distanceTo(new THREE.Vector3(r.pos.x, 0, r.pos.y)) * 0.05) };
  }
  get focused(): number | null { return this.focus; }

  /** A lasting badge over a resident's head — a drawn tick and a word ("Completed"); `null` removes it. */
  setMark(i: number, text: string | null): void {
    const r = this.residents[i];
    if (!r) return;
    if (!text) { r.mark?.remove(); r.mark = undefined; return; }
    if (r.mark && r.mark.dataset.text === text) return;
    r.mark?.remove();
    const el = document.createElement('div');
    el.className = 'land-mark';
    el.dataset.text = text;
    el.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#2a7d3f"/><path d="M6.5 12.5l3.6 3.5L17.5 8.5" fill="none" stroke="#fff" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    el.append(document.createTextNode(text));
    this.overlay.append(el);
    r.mark = el;
  }

  /** A little wave / happy hop from a resident (reactions during a conversation). */
  react(i: number, how: 'wave' | 'hop' | 'cheer'): void {
    const r = this.residents[i];
    if (!r) return;
    if (how === 'hop' || how === 'cheer') { r.mode = this.focus === i ? 'greet' : 'hop'; r.hop = 0; r.mood = 'happy'; r.phase = 0; }
    r.wave = how === 'wave' || how === 'cheer' ? 1.2 : r.wave;
  }

  /** A portrait of a resident (front view, PNG data URL, cached): the picture on its conversation card. */
  portrait(i: number): string {
    const r = this.residents[i];
    if (!r) return '';
    const key = `fuzzy:${r.skin}:${i % 14}`;
    const hit = this.thumbs.get(key);
    if (hit) return hit;
    const clone = r.model.group.clone();
    clone.position.set(0, 0, 0); clone.rotation.set(0, 0, 0); clone.scale.setScalar(1);
    clone.traverse((o) => { if (o instanceof THREE.Mesh) o.castShadow = false; });
    clone.children.forEach((c) => { if (c instanceof THREE.Mesh && c.geometry === FOOT) c.visible = false; });
    return this.snap(clone, key, THREE.MathUtils.degToRad(80), 0.25, 0.72);
  }

  private facingCamera(r: Resident): number {
    const d = this.camera.position.clone().sub(r.model.group.position);
    return Math.atan2(d.x, d.z);
  }

  private say(r: Resident, text: string, secs: number): void {
    r.bubble?.remove();
    const el = document.createElement('div');
    el.className = 'land-say';
    const who = document.createElement('b');
    who.textContent = r.name;
    el.append(who, text);
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
      const raw = Math.max(0, (t - this.last) / 1000); // the first frame time can be slightly in the past
      const dt = Math.min(0.05, raw);
      this.last = t;
      this.frame(dt);
      this.adapt(raw);
    };
    this.raf = requestAnimationFrame(tick);
  }

  stop(): void { cancelAnimationFrame(this.raf); this.raf = 0; }

  /**
   * Automatic quality: if frames take too long for a few seconds (an older phone), step down — fewer pixels
   * first, then no MSAA, then softer shadows — so the town stays smooth. Never steps back up mid-visit.
   */
  private perf = { n: 0, sum: 0, level: 0 };
  private adapt(raw: number): void {
    if (raw <= 0 || raw > 0.5 || document.hidden) return; // ignore hiccups and tab switches
    const p = this.perf;
    p.n++; p.sum += raw;
    if (p.n < 120) return;
    const avg = p.sum / p.n;
    p.n = 0; p.sum = 0;
    if (avg < 1 / 42 || p.level >= 3) return;
    p.level++;
    if (p.level === 1) this.renderer.setPixelRatio(Math.min(this.renderer.getPixelRatio(), 1.25));
    if (p.level === 2) { this.renderer.setPixelRatio(1); for (const t of [this.composer.renderTarget1, this.composer.renderTarget2]) { t.samples = 0; t.dispose(); } }
    if (p.level === 3) { this.sun.shadow.mapSize.set(1024, 1024); this.sun.shadow.map?.dispose(); this.sun.shadow.map = null; }
    this.resize();
  }

  /** Current automatic quality step (0 = best). */
  get quality(): number { return this.perf.level; }

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
      const k = f.out ? easeOut(f.t / f.dur) : ease(f.t / f.dur);
      this.target.lerpVectors(f.from, f.to, k);
      this.dist = f.d0 + (f.d1 - f.d0) * k;
      this.zoomGoal = this.dist;
      if (f.t >= f.dur) { this.fly = null; f.done?.(); }
    } else {
      const d0 = this.dist;
      // keeping a Fuzzy company: drift after it (it mostly stands still, but it can shuffle)
      const fr = this.focus !== null ? this.residents[this.focus] : null;
      if (fr) this.target.lerp(new THREE.Vector3(fr.pos.x, 0, fr.pos.y), Math.min(1, dt * 3));
      else if (this.focus !== null) this.focus = null;
      this.dist += (this.zoomGoal - this.dist) * Math.min(1, dt * 10);
      // keep the point under the cursor in place while zooming
      if (this.zoomAnchor && d0 > 0) this.target.lerp(this.zoomAnchor, 1 - this.dist / d0);
      if (Math.abs(this.zoomGoal - this.dist) < 0.01) this.zoomAnchor = null;
      if (this.keyDir.lengthSq() > 0) {
        // about 0.9 screen-heights per second, whatever the zoom
        const px = (this.canvas.clientHeight || 600) * 0.9 * dt;
        this.nudge(-this.keyDir.x * px, -this.keyDir.y * px);
      }
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
        // pops up past full size, lands with a squash, then wobbles to rest (a damped spring)
        const k = Math.min(1, n.userData.grow / 0.75);
        if (k < 0.4) { const e = easeOut(k / 0.4) * 1.14; n.scale.set(e * 0.94, e * 1.08, e * 0.94); }
        else if (k < 1) { const u = (k - 0.4) / 0.6, w = Math.cos(u * Math.PI * 3) * (1 - u) * 0.14; n.scale.set(1 + w * 0.6, 1 + w, 1 + w * 0.6); }
        if (k >= 1) { n.scale.setScalar(1); delete n.userData.grow; this.sparkle(n.position.x, 0.4, n.position.z, 14); }
      }
      if (n.userData.drop !== undefined) {
        n.userData.drop += dt;
        const k = Math.min(1, n.userData.drop / 0.42);
        n.position.y = k < 0.55 ? 0.6 * (1 - k / 0.55) ** 2 : 0;
        const sq = k >= 0.55 ? Math.sin((k - 0.55) / 0.45 * Math.PI) * 0.12 : 0;
        n.scale.set(1 + sq, 1 - sq, 1 + sq);
        if (k >= 1) { n.position.y = 0; n.scale.setScalar(1); delete n.userData.drop; this.sparkle(n.position.x, 0.25, n.position.z, 6); }
      }
      if (n.userData.tick) (n.userData.tick as (T: number, dt: number) => void)(T, dt);
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
      // doors swing open when someone goes in or out; homes puff a little chimney smoke
      if (n.userData.doorLeaf === undefined) n.userData.doorLeaf = n.getObjectByName('doorleaf') ?? null;
      const leaf = n.userData.doorLeaf as THREE.Object3D | null;
      if (leaf) {
        if (n.userData.doorOpen > 0) n.userData.doorOpen -= dt;
        const want = n.userData.doorOpen > 0 ? -1.3 : 0;
        leaf.rotation.y += (want - leaf.rotation.y) * Math.min(1, dt * 7);
      }
      const ch = n.userData.chimney as THREE.Vector3 | undefined;
      if (ch && !p.doneAt && item(p.item).kind === 'house') { b.smoke -= dt; if (b.smoke <= 0) { b.smoke = 1.4 + Math.random() * 1.6; this.smoke(ch.clone().applyMatrix4(n.matrixWorld)); } }
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
        if (!b.bubble) {
          // the bubble itself is a big, tappable button: it pops in, squashes when pressed, and collects like a tap on the building
          const el = document.createElement('div'), inner = document.createElement('span');
          el.append(inner); this.overlay.append(el); b.bubble = el;
          const id = p.id;
          el.addEventListener('pointerdown', (e) => { if (!el.classList.contains('land-timer')) e.stopPropagation(); });
          el.addEventListener('click', (e) => { if (el.classList.contains('land-timer')) return; e.stopPropagation(); this.onBubble?.(id); });
        }
        const cls = timer ? 'land-ready land-timer' : 'land-ready';
        if (b.bubble.className !== cls) b.bubble.className = cls;
        const inner = b.bubble.firstElementChild as HTMLElement;
        if (inner.textContent !== badge) inner.textContent = badge;
        this.toScreen(b.bubble, new THREE.Vector3(n.position.x, p.item === 'field' ? 0.85 : p.doneAt ? 1.6 : 2.1, n.position.z), timer ? 0 : Math.sin(T * 4 + p.id) * 4);
      } else if (b.bubble) { b.bubble.remove(); b.bubble = undefined; }
    }
    this.selected.material.opacity = 0.7 + Math.sin(T * 4) * 0.25;
    if (this.multiIds.length) this.multiMat.opacity = 0.72 + Math.sin(T * 4) * 0.22;
    // a carried group floats a little
    for (const [id, base] of this.groupBase) { const b = this.built.get(id); if (b) b.node.position.y = base.y + 0.16 + Math.sin(T * 5) * 0.035; }
    if (this.ghost) this.ghost.node.position.y = 0.16 + Math.sin(T * 5) * 0.035; // the carried building floats a little
    for (const r of this.residents) this.live(r, dt, T);
    this.season?.update(dt, T, this.target, this.quality);
    for (const f of this.butterflies) {
      const t = T * f.sp + f.ph;
      const x = f.home.x + Math.sin(t * 0.7) * 2.2 + Math.sin(t * 1.9) * 0.4, z = f.home.y + Math.cos(t * 0.53) * 1.8 + Math.cos(t * 2.3) * 0.3;
      const y = 0.45 + Math.sin(t * 2.7) * 0.15 + Math.sin(t * 7) * 0.04;
      const dx = x - f.g.position.x, dz = z - f.g.position.z;
      f.g.position.set(x, y, z);
      if (dx * dx + dz * dz > 1e-8) f.g.rotation.y = Math.atan2(dx, dz);
      const flap = 0.25 + Math.abs(Math.sin(T * 22 + f.ph)) * 1.1;
      f.wings[0].rotation.y = -flap; f.wings[1].rotation.y = flap;
    }
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

  /** A resident's little life: walk somewhere (on the pavements), pop into a house, tend a field, sit on a bench, chat, breathe, blink. */
  private live(r: Resident, dt: number, T: number): void {
    const m = r.model;
    r.phase += dt;
    r.timer -= dt;
    let bob = 0, sx = 1, sy = 1, lean = 0, scale = 1;
    const g = r.goal;
    if (r.mode === 'walk') {
      const next = r.path[0];
      if (!next) this.arrive(r);
      else {
        const d = next.clone().sub(r.pos);
        const len = d.length();
        const step = dt * 1.05 * r.persona.speed;
        if (len <= step) { r.pos.copy(next); r.path.shift(); }
        else r.pos.addScaledVector(d.divideScalar(len), step);
        if (len > 1e-3) r.targetFacing = Math.atan2(d.x, d.y);
        // little hops: up, then a squashy landing
        const k = (r.phase * 2.6 * r.persona.speed) % 1;
        bob = Math.sin(k * Math.PI) * 0.07;
        const land = Math.max(0, 1 - k * 6) + Math.max(0, (k - 0.9) * 10);
        sx = 1 + land * 0.08 - Math.sin(k * Math.PI) * 0.03; sy = 1 - land * 0.1 + Math.sin(k * Math.PI) * 0.06;
        lean = 0.12;
      }
    } else if (r.mode === 'enter' || r.mode === 'exit') {
      // squeeze through the door (it swings open for them)
      const k = Math.min(1, 1 - r.timer / 0.5);
      scale = r.mode === 'enter' ? 1 - k : k;
      if (g?.kind === 'visit') r.targetFacing = r.mode === 'enter' ? g.face : g.face + Math.PI;
      if (r.timer <= 0) {
        if (r.mode === 'enter') { r.mode = 'inside'; r.timer = 3 + Math.random() * 4 * r.persona.homebody; this.puffAt(r.pos.x, r.pos.y); }
        else { r.mode = 'idle'; r.goal = null; r.timer = 1 + Math.random() * 2; r.mood = 'happy'; setTimeout(() => { r.mood = 'normal'; }, 1500); }
      }
    } else if (r.mode === 'inside') {
      scale = 0;
      if (r.timer <= 0 && g?.kind === 'visit') { this.openDoor(g.id); r.mode = 'exit'; r.timer = 0.5; }
      else if (r.timer <= 0) { r.mode = 'idle'; r.goal = null; }
    } else if (r.mode === 'work') {
      // tending the crops: bob down and up, now and then a puff of soil
      const k = (r.phase * 1.6) % 1;
      lean = 0.35 + Math.sin(k * Math.PI * 2) * 0.25;
      sy = 1 - Math.max(0, Math.sin(k * Math.PI * 2)) * 0.08; sx = 2 - sy;
      if (g?.kind === 'work') r.targetFacing = g.face;
      if (Math.random() < dt * 1.2) this.dust(r.pos.x + Math.sin(r.facing) * 0.3, r.pos.y + Math.cos(r.facing) * 0.3);
      if (r.timer <= 0) { r.mode = 'idle'; r.goal = null; r.timer = 1 + Math.random() * 2; }
    } else if (r.mode === 'sit') {
      if (g?.kind === 'sit') {
        const k = Math.min(1, r.hop / 0.35);
        r.hop += dt;
        if (k < 1) { r.pos.lerp(new THREE.Vector2(g.seat.x, g.seat.z), k); bob = Math.sin(k * Math.PI) * 0.25; r.y = g.seat.y * k - 0.26 * k * 0.4; }
        r.targetFacing = g.face;
        const br = Math.sin(r.phase * 1.6);
        sy = 0.94 + br * 0.03; sx = 2 - sy;
        r.mood = 'sleepy';
      }
      if (r.timer <= 0) { r.mode = 'hop'; r.hop = 0; r.y = 0; r.mood = 'normal'; if (g?.kind === 'sit') r.pos.set(g.seat.x + Math.sin(g.face) * 0.75, g.seat.z + Math.cos(g.face) * 0.75); r.goal = null; }
    } else if (r.mode === 'chat') {
      const br = Math.sin(r.phase * 5);
      sy = 1 + br * 0.04; sx = 1 - br * 0.02;
      if (r.timer <= 0) { r.mode = 'idle'; r.mood = 'normal'; r.timer = 2 + Math.random() * 3; }
    } else if (r.mode === 'greet') {
      // talking to you: face the camera, a happy little bounce and a wave now and then
      r.targetFacing = this.facingCamera(r);
      const br = Math.sin(r.phase * 4.2);
      sy = 1 + br * 0.05; sx = 1 - br * 0.025;
      bob = Math.max(0, Math.sin(r.phase * 4.2)) * 0.05;
      if (r.wave <= 0 && Math.random() < dt * 0.25) r.wave = 1.2;
      if (r.hop < 0.55) { r.hop += dt; const k = r.hop / 0.55; bob += Math.sin(Math.min(1, k) * Math.PI) * 0.3; sy *= k < 0.15 ? 1 - k : k > 0.9 ? 0.9 : 1.05; sx = 2 - sy; }
    } else if (r.mode === 'hop') {
      r.hop += dt;
      const k = r.hop / 0.55;
      bob = Math.sin(Math.min(1, k) * Math.PI) * 0.28;
      sy = k < 0.15 ? 1 - k * 1.2 : k > 0.9 ? 0.88 : 1.06; sx = 2 - sy;
      if (k >= 1.2) { r.mode = 'idle'; r.timer = 2.5 + Math.random() * 2; r.mood = 'normal'; }
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
        const friend = Math.random() < r.persona.chatty * 0.5 ? this.residents.find((o) => o !== r && o.mode === 'idle' && o.pos.distanceTo(r.pos) < 2.6) : undefined;
        if (friend) this.chat(r, friend);
        else if (Math.random() < r.persona.hoppy) { r.mode = 'hop'; r.hop = 0; }
        else this.plan(r, T);
      }
    }
    if (r.mode !== 'idle') m.body.rotation.z *= 0.9;
    if (r.wave > 0) { r.wave -= dt; m.body.rotation.z = Math.sin(r.wave * 18) * 0.22 * Math.min(1, r.wave); }
    // turn smoothly towards where we're going / looking
    let df = r.targetFacing - r.facing;
    df = Math.atan2(Math.sin(df), Math.cos(df));
    r.facing += df * Math.min(1, dt * 6);
    const hidden = scale < 0.02;
    m.group.visible = r.shadow.visible = !hidden;
    m.group.position.set(r.pos.x, 0.26 + bob + r.y, r.pos.y);
    m.group.rotation.y = r.facing;
    m.group.scale.setScalar(Math.max(0.001, scale));
    // feet: step while walking, tuck in mid-hop; the shadow shrinks as they rise
    const stride = r.mode === 'walk' ? Math.sin(r.phase * 2.6 * r.persona.speed * Math.PI) * 0.06 : 0;
    r.feet[0].position.z = 0.05 + stride; r.feet[1].position.z = 0.05 - stride;
    r.feet[0].position.y = r.feet[1].position.y = -0.21 - bob * 0.5;
    r.shadow.position.set(r.pos.x, 0.05 + (r.y > 0.05 ? 0.33 : 0), r.pos.y);
    r.shadow.scale.setScalar((1 - Math.min(0.5, bob * 1.6)) * scale);
    m.body.rotation.x = lean;
    m.body.scale.set(sx, sy, sx);
    // eyes: blink, happy squints, sleepy lids
    r.blinkIn -= dt;
    if (r.blinkIn <= 0) { r.blinking = 0.13; r.blinkIn = 2 + Math.random() * 4; }
    const closed = r.blinking > 0;
    if (closed) r.blinking -= dt;
    const happy = r.mood === 'happy' || r.mode === 'chat';
    for (const e of m.eyes) { e.open.visible = !happy; e.lid.visible = happy; e.open.scale.y = closed ? 0.12 : r.mood === 'sleepy' ? 0.45 : 1; }
    for (const p of m.pupils) { p.position.x = r.look.x; p.position.y = r.look.y; }
    // speech bubbles: now and then someone says something
    if (!r.bubble && !hidden && Math.random() < dt / 40) this.say(r, this.phrase(r.seed + Math.floor(T)), 3.4);
    if (r.bubble) {
      r.bubbleT -= dt;
      this.toScreen(r.bubble, new THREE.Vector3(r.pos.x, 0.78 + bob + r.y, r.pos.y));
      if (r.bubbleT <= 0 || hidden) { r.bubble.remove(); r.bubble = undefined; }
    }
    if (r.mark) { if (hidden) r.mark.hidden = true; else { r.mark.hidden = false; this.toScreen(r.mark, new THREE.Vector3(r.pos.x, (r.bubble ? 1.2 : 0.8) + bob + r.y, r.pos.y)); } }
  }

  /** Reached the end of a walk: do what we came for. */
  private arrive(r: Resident): void {
    const g = r.goal;
    if (g?.kind === 'visit' && this.built.has(g.id)) { this.openDoor(g.id); r.mode = 'enter'; r.timer = 0.5; return; }
    if (g?.kind === 'work' && this.built.has(g.id)) { r.mode = 'work'; r.timer = 3.5 + Math.random() * 4 * (0.5 + r.persona.farmer); return; }
    if (g?.kind === 'sit' && this.built.has(g.id)) { r.mode = 'sit'; r.hop = 0; r.timer = 5 + Math.random() * 8; return; }
    r.mode = 'idle'; r.goal = null; r.timer = 2 + Math.random() * 5;
  }

  /** Two Fuzzies stop to say hello. */
  private chat(a: Resident, b: Resident): void {
    for (const [x, y] of [[a, b], [b, a]]) {
      x.mode = 'chat'; x.timer = 3 + Math.random(); x.path = []; x.goal = null;
      x.targetFacing = Math.atan2(y.pos.x - x.pos.x, y.pos.y - x.pos.y);
    }
    this.say(a, Resident_greet(b.name), 2.6);
    setTimeout(() => { if (b.mode === 'chat') this.say(b, Resident_greet(a.name), 2.4); }, 900);
  }

  /** Swing a building's front door open for a moment. */
  private openDoor(id: number): void {
    const b = this.built.get(id);
    if (b) b.node.userData.doorOpen = 1.4;
  }

  private puffAt(x: number, z: number): void {
    for (let i = 0; i < 4; i++) this.sparkle(x, 0.3, z, 1);
  }

  /** A little puff of soil (farm work). */
  private dust(x: number, z: number): void {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.puffTex, transparent: true, depthWrite: false, color: 0xc49a6c, opacity: 0.6 }));
    s.position.set(x, 0.12, z);
    s.scale.setScalar(0.1);
    this.scene.add(s);
    this.puffs.push({ s, v: new THREE.Vector3((Math.random() - 0.5) * 0.4, 0.5, (Math.random() - 0.5) * 0.4), life: 0, max: 0.7, grow: 0.8 });
  }

  /** Camera position that frames a building (for zooming into the Crossing Gate). */
  centerOf(id: number): THREE.Vector3 | null {
    const b = this.built.get(id);
    return b ? b.node.position.clone() : null;
  }

  destroy(): void {
    this.season?.dispose(this.scene);
    this.disposed = true;
    this.stop();
    this.overlay.replaceChildren();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }
}

// ---------- seasonal particles ----------
interface Flake { s: THREE.Sprite; v: THREE.Vector3; ph: number; spin: number; rest: number; size: number }
class Season {
  key: string;
  private flakes: Flake[] = [];
  private ghost: { s: THREE.Sprite; t: number; v: THREE.Vector3 } | null = null;
  private nextGhost = 12;
  private tex: THREE.Texture;
  private ghostTex: THREE.Texture | null = null;
  constructor(private scene: THREE.Scene, private atmo: string, private ghosts: boolean, private max: number) {
    this.key = `${atmo}:${ghosts ? 1 : 0}`;
    this.tex = Season.texture(atmo);
    for (let i = 0; i < max; i++) this.add(true);
  }
  /** A soft sprite per kind: leaf, snowflake, petal, heart, lantern light, spark, firefly. */
  private static texture(atmo: string): THREE.Texture {
    if (atmo === 'snow' || atmo === 'sparks' || atmo === 'fireflies' || atmo === 'lanterns') {
      return GT.glow(atmo === 'snow' ? 'rgba(255,255,255,1)' : atmo === 'lanterns' ? 'rgba(255,214,140,1)' : atmo === 'fireflies' ? 'rgba(220,255,150,1)' : 'rgba(255,230,150,1)', 'rgba(255,255,255,0)');
    }
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d')!;
    x.translate(32, 32);
    if (atmo === 'hearts') {
      x.fillStyle = '#ff6b9a';
      x.beginPath(); x.moveTo(0, 22); x.bezierCurveTo(-30, -2, -14, -26, 0, -10); x.bezierCurveTo(14, -26, 30, -2, 0, 22); x.fill();
    } else {
      // leaf / petal: a pointed ellipse with a soft vein
      x.fillStyle = atmo === 'petals' ? '#ffb3d1' : '#e0792f';
      x.beginPath(); x.moveTo(0, -28); x.bezierCurveTo(22, -12, 22, 12, 0, 28); x.bezierCurveTo(-22, 12, -22, -12, 0, -28); x.fill();
      x.strokeStyle = atmo === 'petals' ? 'rgba(255,255,255,.6)' : 'rgba(120,50,20,.45)'; x.lineWidth = 2;
      x.beginPath(); x.moveTo(0, -22); x.lineTo(0, 22); x.stroke();
    }
    const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; return tx;
  }
  private colorFor(): THREE.Color {
    const pick = (a: string[]) => new THREE.Color(a[Math.floor(Math.random() * a.length)]);
    switch (this.atmo) {
      case 'leaves': return pick(['#e0792f', '#c9512a', '#f2b134', '#b8431f', '#ffa94d']);
      case 'petals': return pick(['#ffb3d1', '#ffd6e4', '#ffffff', '#ff9fc8']);
      case 'hearts': return pick(['#ff6b9a', '#ff8fb4', '#ffffff']);
      case 'sparks': return pick(['#ffd43b', '#ff922b', '#ff6b9a', '#4dabf7', '#ffffff']);
      default: return new THREE.Color('#ffffff');
    }
  }
  private add(anywhere: boolean): void {
    const m = new THREE.SpriteMaterial({ map: this.tex, transparent: true, depthWrite: false, color: this.colorFor(), opacity: 0.9, blending: this.atmo === 'snow' || this.atmo === 'leaves' || this.atmo === 'petals' || this.atmo === 'hearts' ? THREE.NormalBlending : THREE.AdditiveBlending });
    const s = new THREE.Sprite(m);
    const size = this.atmo === 'snow' ? 0.12 + Math.random() * 0.1 : this.atmo === 'lanterns' ? 0.22 + Math.random() * 0.12 : this.atmo === 'fireflies' ? 0.08 : this.atmo === 'sparks' ? 0.1 + Math.random() * 0.08 : 0.16 + Math.random() * 0.08;
    s.scale.setScalar(size);
    this.scene.add(s);
    const f: Flake = { s, v: new THREE.Vector3(), ph: Math.random() * 10, spin: (Math.random() - 0.5) * 3, rest: 0, size };
    this.flakes.push(f);
    this.respawn(f, new THREE.Vector3(MAP / 2, 0, MAP / 2), anywhere);
  }
  private respawn(f: Flake, target: THREE.Vector3, anywhere: boolean): void {
    const rising = this.atmo === 'lanterns' || this.atmo === 'sparks' || this.atmo === 'fireflies';
    const x = target.x + (Math.random() - 0.5) * 18, z = target.z + (Math.random() - 0.5) * 18;
    const y = rising ? (anywhere ? Math.random() * 4 : 0.2 + Math.random() * 0.6) : anywhere ? Math.random() * 6 : 5.5 + Math.random() * 1.5;
    f.s.position.set(x, y, z);
    f.rest = 0;
    (f.s.material as THREE.SpriteMaterial).opacity = 0.9;
    switch (this.atmo) {
      case 'snow': f.v.set(0.15, -0.55 - Math.random() * 0.35, 0.05); break;
      case 'leaves': f.v.set(0.4 + Math.random() * 0.3, -0.9 - Math.random() * 0.5, 0.15); break;
      case 'petals': case 'hearts': f.v.set(0.25, -0.5 - Math.random() * 0.3, 0.1); break;
      case 'lanterns': f.v.set(0.05, 0.25 + Math.random() * 0.2, 0.03); break;
      case 'sparks': f.v.set(0, 1.2 + Math.random() * 1.2, 0); f.ph = 0; break;
      default: f.v.set(0, 0, 0); // fireflies wander
    }
  }
  update(dt: number, T: number, target: THREE.Vector3, quality: number): void {
    const limit = Math.max(8, this.max >> quality);
    this.flakes.forEach((f, i) => {
      if (i >= limit) { f.s.visible = false; return; }
      f.s.visible = true;
      const m = f.s.material as THREE.SpriteMaterial;
      const p = f.s.position;
      if (this.atmo === 'fireflies') {
        const t = T * 0.6 + f.ph;
        p.x += Math.sin(t * 1.3) * dt * 0.6; p.z += Math.cos(t * 0.9) * dt * 0.6; p.y = 0.35 + Math.sin(t * 2.1) * 0.25;
        m.opacity = 0.25 + Math.max(0, Math.sin(T * 3 + f.ph * 5)) * 0.75;
      } else if (this.atmo === 'sparks') {
        p.addScaledVector(f.v, dt); f.v.y -= 1.6 * dt; f.ph += dt;
        m.opacity = Math.max(0, 1 - f.ph / 1.6);
        if (f.ph > 1.6) this.respawn(f, target, false);
      } else {
        const sway = Math.sin(T * 1.7 + f.ph) * (this.atmo === 'snow' ? 0.25 : 0.6);
        if (f.rest > 0) { f.rest -= dt; m.opacity = Math.min(0.9, f.rest); if (f.rest <= 0) this.respawn(f, target, false); }
        else {
          p.x += (f.v.x + sway) * dt; p.z += (f.v.z + Math.cos(T * 1.3 + f.ph) * 0.3) * dt; p.y += f.v.y * dt;
          m.rotation += f.spin * dt;
          if (f.v.y > 0 && p.y > 6) this.respawn(f, target, false);
          if (f.v.y < 0 && p.y <= 0.03) { p.y = 0.03; f.rest = this.atmo === 'snow' ? 0.5 : 2.5; }
        }
      }
      // keep the flurry around the camera as it pans
      if (Math.abs(p.x - target.x) > 11 || Math.abs(p.z - target.z) > 11) this.respawn(f, target, true);
    });
    if (this.ghosts) this.updateGhost(dt, T, target);
  }
  private updateGhost(dt: number, T: number, target: THREE.Vector3): void {
    if (!this.ghost) {
      this.nextGhost -= dt;
      if (this.nextGhost > 0) return;
      this.ghostTex ??= Season.ghostTexture();
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.ghostTex, transparent: true, depthWrite: false, opacity: 0 }));
      s.scale.set(0.9, 1.1, 1);
      const side = Math.random() < 0.5 ? -1 : 1;
      s.position.set(target.x + side * 9, 1.2 + Math.random() * 0.8, target.z + (Math.random() - 0.5) * 8);
      this.scene.add(s);
      this.ghost = { s, t: 0, v: new THREE.Vector3(-side * 0.9, 0, 0.1) };
      return;
    }
    const g = this.ghost;
    g.t += dt;
    g.s.position.addScaledVector(g.v, dt);
    g.s.position.y += Math.sin(T * 2.2) * dt * 0.3;
    (g.s.material as THREE.SpriteMaterial).opacity = Math.min(0.75, g.t * 0.5, (20 - g.t) * 0.5);
    if (g.t > 20) { g.s.removeFromParent(); g.s.material.dispose(); this.ghost = null; this.nextGhost = 25 + Math.random() * 25; }
  }
  private static ghostTexture(): THREE.Texture {
    const c = document.createElement('canvas'); c.width = 96; c.height = 128;
    const x = c.getContext('2d')!;
    x.fillStyle = '#ffffff';
    x.beginPath(); x.arc(48, 44, 34, Math.PI, 0); x.lineTo(82, 100);
    for (let i = 0; i < 4; i++) x.quadraticCurveTo(82 - i * 17 - 8, i % 2 ? 100 : 118, 82 - (i + 1) * 17, 100);
    x.closePath(); x.fill();
    x.fillStyle = '#2a2230';
    x.beginPath(); x.ellipse(36, 44, 5, 8, 0, 0, Math.PI * 2); x.ellipse(60, 44, 5, 8, 0, 0, Math.PI * 2); x.fill();
    x.beginPath(); x.ellipse(48, 64, 5, 7, 0, 0, Math.PI * 2); x.fill();
    const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; return tx;
  }
  dispose(scene: THREE.Scene): void {
    for (const f of this.flakes) { f.s.removeFromParent(); f.s.material.dispose(); }
    this.flakes = [];
    if (this.ghost) { this.ghost.s.removeFromParent(); this.ghost.s.material.dispose(); this.ghost = null; }
    this.tex.dispose(); this.ghostTex?.dispose();
    void scene;
  }
}
