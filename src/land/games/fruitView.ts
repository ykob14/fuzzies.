/**
 * Fruit Catcher — the orchard scene, built from real models: the orchard kit (public/models/kits/orchard.glb — Quaternius
 * trees, ground cover and a farmhouse assembled from their village kit, all CC0; our own fruit, pinecone and woven basket)
 * and the owner's own Fuzzy (their 3D model, unchanged — only lit, shadowed and sized to sit in the scene).
 * A sunny lane between a picket fence and a row of fruit trees; the Fuzzy balances the basket on its head and follows your
 * finger (drag anywhere) or A/D / arrows. Fruit pops out of a shaking crown, tumbles down with a landing shadow, arcs into
 * the basket and piles up there; misses bounce and roll away; a pinecone leaves the Fuzzy dizzy.
 *
 * If a kit can't be loaded the scene falls back to the hand-built art in games/orchardArt.ts (same game, older look).
 * Rules (unchanged apart from the lane width) live in games/fruit.ts; scene chrome in land/mgScene.ts.
 */
import * as THREE from 'three';
import { createArcade, sfx, vac, lerp, type MiniSetup, type MiniHooks } from '../mgScene';
import { adventure } from '../adventures';
import { FruitSim, ARENA, SCORING, BASKET, type Falling, type FruitKind } from './fruit';
import * as O from './orchardArt';
import { loadKit, type Kit } from '../assets/kit';
import { loadFuzzyGlb } from '../../game/fuzzyGlb';

const JUICE: Record<FruitKind, string> = { apple: '#ff5a4a', pear: '#d8e070', berry: '#ff3d6a', gold: '#ffd84a', cone: '#9a6a3a' };
const FRUIT_NODE: Record<FruitKind, string> = { apple: 'fruit_apple', pear: 'fruit_pear', berry: 'fruit_berry', gold: 'fruit_gold', cone: 'fruit_cone' };
/** model radius → the rules' radius (the models are built about 1 m across) */
const FRUIT_K: Record<FruitKind, number> = { apple: 1.0, pear: 0.92, berry: 1.25, gold: 1.0, cone: 1.25 };

/** What the frame loop needs from the player figure — the rig, or the old drawn Fuzzy as a fallback. */
interface Player {
  group: THREE.Group;
  /** where the basket's rim is (world y, standing) */
  rimY: number;
  basket: { group: THREE.Group; fill: (kinds: O.FruitArtKind[]) => void; glow: (k: number) => void };
  frame(dt: number, s: { speed: number; vx: number; t: number; stun: boolean; lean: number; yaw: number; look: THREE.Vector3 | null }): void;
  catch(gold: boolean): void;
  cheer(): void;
  ouch(): void;
  miss(): void;
}

export function run(stage: HTMLElement, setup: MiniSetup, hooks: MiniHooks): void {
  const adv = adventure('fruit')!;
  // the camera is framed for the screen: on a portrait phone it stands back with a wider lens and the lane narrows so every
  // drop stays on screen; the Fuzzy is drawn big (≈ 1.5 m with the basket on top) so you always see its face
  const aspect = innerWidth / Math.max(1, innerHeight);
  const portrait = aspect < 0.9;
  const cam = portrait ? { fov: 52, back: 16, up: 4.4, lookDy: 0, lookY: 3.7, lead: 0 } : { fov: 36, back: 14, up: 4.1, lookDy: 0, lookY: 2.9, lead: 0 };
  const tanH = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * aspect;
  const halfWAt = (z: number) => (cam.back - z) * tanH;
  const hw = Math.min(ARENA.hw, Math.max(3.2, halfWAt(0) - 0.9));
  const sim = new FruitSim(setup.variant === 'golden' ? 'golden' : 'classic', setup.seed, hw);
  const lite = setup.mobile;
  // start fetching the art while the intro card is up; the run starts when it's here (or has failed → fallback art)
  // (and the owner's Fuzzy model, if this player uses it, so the figure is made from it)
  const kits = Promise.all([loadKit('orchard', lite), setup.deluxe ? Promise.race([loadFuzzyGlb(), new Promise((r) => setTimeout(r, 6000))]) : null]).then(([k]) => k);
  let built = false;
  const ready = new Promise<void>((res) => { const t = setInterval(() => { if (built) { clearInterval(t); res(); } }, 50); });
  const a = createArcade(stage, {
    cls: 'fruit', setup, adv, hooks, buttonLabel: 'Catch!',
    hud: { count: 'CAUGHT' },
    camera: cam,
    world: { size: { hw: 14, hd: 8 }, path: false, fence: false, treeLine: false, flowers: 0, clouds: false, tufts: false, fog: ['#e3eedb', portrait ? 34 : 28, portrait ? 100 : 85], sun: 2.6 },
    controls: { touch: false, mouseSteer: false }, onStart: () => { if (built) sim.start(); else void ready.then(() => sim.start()); },
  });
  const { scene, time, renderer, sun, hemi, camera } = a;

  // ---- light: warm low sun with soft shadows (phones too, on a tight frustum), cool sky fill, a warm rim from behind ----
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.toneMappingExposure = 1.08;
  sun.castShadow = true; sun.color.set('#fff0d6');
  sun.shadow.mapSize.set(lite ? 1024 : 2048, lite ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -15, right: 15, top: 15, bottom: -12, near: 4, far: 70 }); sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.05;
  hemi.color.set('#d6eaff'); hemi.groundColor.set('#7f9c56'); hemi.intensity = 1.0;
  scene.environmentIntensity = 0.45;
  const skyU = (a.sky.material as THREE.ShaderMaterial).uniforms; (skyU.uTop.value as THREE.Color).set('#5aaae4'); (skyU.uHorizon.value as THREE.Color).set('#fcefd4');

  // ---- ground: painted lawn (large-scale variation baked into vertex colours) + a soft-edged dirt lane ----
  const grass = O.grassTex(); grass.repeat.set(30, 30);
  { const g = a.ground.geometry as THREE.BufferGeometry; const p = g.attributes.position, c = g.attributes.color as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); const k = 0.88 + Math.sin(x * 0.21 + 1) * Math.cos(z * 0.17) * 0.08 + Math.sin(x * 0.07 - z * 0.05) * 0.06; c.setXYZ(i, k * 1.02, k, k * 0.92); p.setY(i, 0); }
    c.needsUpdate = true; p.needsUpdate = true; g.computeVertexNormals(); }
  a.ground.material = new THREE.MeshStandardMaterial({ map: grass, vertexColors: true, roughness: 0.96 }); a.ground.receiveShadow = true;
  const laneTex = O.pathTex(); laneTex.repeat.set(9, 1);
  const lane = new THREE.Mesh(new THREE.PlaneGeometry(60, 2.6).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: laneTex, transparent: true, depthWrite: false, roughness: 0.95 }));
  lane.position.set(0, 0.012, 0.15); lane.receiveShadow = true; scene.add(lane);
  const span = hw + 1.4;
  const rr = O.rng(setup.seed + 3);
  /** may this spot hold ground cover? (never on the lane or the fence line) */
  const free = (x: number, z: number) => Math.abs(z - 0.15) > 1.5 && !(z < -1.0 && z > -1.7) && Math.abs(x) < halfWAt(z) + 2.5;

  // shared scene state the two builders fill in
  type Shaker = { g: THREE.Object3D; x: number; v: number; a: number; update?: (t: number, dt: number) => void };
  const front: Shaker[] = [];
  const clouds: THREE.Object3D[] = [];
  let kit: Kit | null = null;
  let me: Player;

  /** You: the owner's Fuzzy exactly as it is (or the drawn one if the model isn't loaded), drawn big — on a phone it's about
   * a fifth of the screen's height with the basket — with a basket balanced on its head; hops on a catch, leans into the run. */
  const figurePlayer = (b: { group: THREE.Object3D; topY: number; width: number; fill: (kinds: O.FruitArtKind[]) => void; glow: (v: number) => void }): Player => {
    const R = portrait ? 0.78 : 0.62;
    const fig = a.figure(setup.you.skin, R);
    fig.group.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
    const bs = R * 1.05 / b.width; // the basket about as wide as the Fuzzy
    const holder = new THREE.Group(); holder.position.y = R * 0.95; holder.scale.setScalar(bs); holder.add(b.group); fig.fuzzy.group.add(holder);
    let hopY = 0, hopV = 0, tilt = 0, tiltV = 0, sq = 0;
    return {
      group: fig.group, rimY: fig.base + R * 0.95 + b.topY * bs * 0.85,
      basket: { group: holder, fill: b.fill, glow: b.glow },
      frame(dt, s) {
        hopV -= 15 * dt; hopY = Math.max(0, hopY + hopV * dt); if (hopY === 0 && hopV < 0) { if (hopV < -1.5) fig.squash = Math.max(fig.squash, 0.35); hopV = 0; }
        fig.group.position.set(sim.x, hopY, 0); fig.group.rotation.y = s.yaw; fig.fuzzy.group.rotation.z = s.lean;
        fig.fuzzy.group.rotation.x = lerp(fig.fuzzy.group.rotation.x, s.speed < 0.15 ? -0.1 + Math.sin(s.t * 2) * 0.03 : 0.05, Math.min(1, dt * 4)); // looks up for fruit when standing
        if (s.stun) fig.fuzzy.group.rotation.z += Math.sin(s.t * 28) * 0.12;
        a.walk(fig, s.speed, dt);
        tiltV += ((s.vx * 0.045) - tilt) * 90 * dt - tiltV * 9 * dt; tilt += tiltV * dt; sq = Math.max(0, sq - dt * 5);
        holder.rotation.z = tilt; holder.scale.set(bs * (1 + Math.sin(sq * 3) * 0.06 * sq), bs * (1 - 0.12 * sq), bs * (1 + Math.sin(sq * 3) * 0.06 * sq));
      },
      catch() { if (hopY < 0.05) hopV = 2.3; sq = 1; },
      cheer() { if (hopY < 0.05) hopV = 3; },
      ouch() { fig.squash = 0.7; sq = 1.4; },
      miss() { fig.squash = Math.max(fig.squash, 0.2); },
    };
  };

  // ---------------------------------------------------------------- the kit scene
  const buildKit = (k: Kit) => {
    kit = k;
    const put = (name: string, x: number, z: number, s = 1, rot = 0, shadow = true) => { const o = k.clone(name, { shadow }); o.position.set(x, 0, z); o.scale.setScalar(s); o.rotation.y = rot; scene.add(o); return o; };
    // the front row: fruit trees whose crowns overhang the lane (each in a pivot so it can shake when it drops a fruit)
    const nFront = portrait ? 3 : 5;
    const fruitTrees = ['tree_apple_1', 'tree_pear_1', 'tree_apple_2', 'tree_apple_3', 'tree_apple_1'];
    for (let i = 0; i < nFront; i++) {
      const x = -span + (i / (nFront - 1)) * span * 2;
      const pivot = new THREE.Group(); pivot.position.set(x, 0, -2.9 - (i % 2) * 0.35); scene.add(pivot);
      const t = k.clone(fruitTrees[i % fruitTrees.length]); t.scale.setScalar(portrait ? 0.95 : 0.82); t.rotation.y = i * 1.9 + 0.4; pivot.add(t);
      front.push({ g: pivot, x, v: 0, a: 0 });
    }
    // second row, the far tree line, the farmhouse with its wagon, hills and clouds
    const second = ['tree_apple_2', 'tree_1', 'tree_pear_1', 'tree_2', 'tree_apple_3', 'tree_3', 'tree_apple_1'];
    for (let i = 0; i < nFront + 2; i++) { const x = -span - 3 + (i / (nFront + 1)) * (span * 2 + 6); put(second[i % second.length], x, -8.6 - (i % 2) * 0.9, 0.72 + (i % 3) * 0.05, i * 2.3, false); }
    const farN = portrait ? 8 : 12;
    for (let i = 0; i < farN; i++) { const z = -18 - (i % 3) * 3; const w = halfWAt(z) * 1.1; put(['pine_1', 'tree_2', 'pine_2', 'tree_1', 'tree_3'][i % 5], -w + (i / (farN - 1)) * w * 2, z, 0.95 + (i % 3) * 0.18, i, false); }
    const fx = -halfWAt(-15) * 0.52;
    put('farmhouse', fx, -15, 0.8, 0.35, true);
    put('wagon', fx + 5.2, -13.2, 0.75, -0.9, true);
    put('crate_apples', fx + 3.4, -12.2, 0.7, 0.4, true);
    scene.add(O.hills());
    for (let i = 0; i < 6; i++) { const c = O.cloud(i + 3); c.position.set((i - 2.5) * 16, 15 + (i % 3) * 2.5, -48 - (i % 2) * 8); c.scale.multiplyScalar(1.4 + (i % 3) * 0.3); scene.add(c); clouds.push(c); }
    // the picket fence between the lane and the trees; crates of fruit at the ends of the lane
    const fence: { x: number; z: number }[] = []; for (let x = -span - 9; x <= span + 9; x += 2.04) fence.push({ x, z: -1.35 });
    scene.add(k.scatter('fence', fence, { shadow: true }));
    put('crate_apples', -(hw + 1.15), 1.0, 0.72, 0.5); put('crate_pears', hw + 1.15, 0.9, 0.72, -0.4); put('crate_apples', hw + 1.8, -0.4, 0.66, 0.2);
    // ground cover: grass, clover, flowers, ferns and mushrooms under the trees, pebbles by the lane, bushes framing the view
    const many = (n: number, zmin: number, zmax: number, smin: number, smax: number, xpad = 2) => { const out: { x: number; z: number; s: number; rot: number }[] = []; for (let i = 0; out.length < n && i < n * 30; i++) { const z = zmin + Math.pow(rr(), 0.8) * (zmax - zmin), x = (rr() - 0.5) * 2 * (halfWAt(z) + xpad); if (free(x, z)) out.push({ x, z, s: smin + rr() * (smax - smin), rot: rr() * 6.28 }); } return out; };
    const q = lite ? 0.6 : 1;
    scene.add(k.scatter('grass_short', many(Math.round(170 * q), -14, 9.5, 0.26, 0.42)));
    scene.add(k.scatter('grass_wispy', many(Math.round(40 * q), -12, 9, 0.3, 0.45)));
    scene.add(k.scatter('grass_tall', many(Math.round(40 * q), -14, -2, 0.25, 0.36)));
    scene.add(k.scatter('clover', many(Math.round(40 * q), -8, 8, 0.28, 0.4)));
    scene.add(k.scatter('flowers_a', many(Math.round(30 * q), -9, 7, 0.2, 0.28)));
    scene.add(k.scatter('flowers_b', many(Math.round(12 * q), -9, 7, 0.18, 0.25))); // 1.7k triangles each — keep them few
    scene.add(k.scatter('fern', many(12, -6, -2, 0.38, 0.5, 1)));
    scene.add(k.scatter('mushroom', many(10, -5, -1.9, 0.4, 0.6, 0)));
    const pebbles: { x: number; z: number; s: number; rot: number }[] = []; for (let i = 0; i < 30; i++) { const x = (rr() - 0.5) * 2 * (hw + 3), z = 0.15 + (rr() < 0.5 ? -1 : 1) * (1.25 + rr() * 0.4); pebbles.push({ x, z, s: 0.6 + rr() * 0.6, rot: rr() * 6.28 }); }
    scene.add(k.scatter('pebble', pebbles));
    scene.add(k.scatter('rock_1', [{ x: -halfWAt(-6) * 0.9, z: -6, s: 0.4, rot: 1 }, { x: halfWAt(-10) * 0.8, z: -10, s: 0.5, rot: 2 }], { shadow: true }));
    scene.add(k.scatter('bush_flowers', [-0.7, 0.35, 0.95].map((f, i) => ({ x: f * span, z: -1.95 - (i % 2) * 0.3, s: 0.55, rot: i * 2 })), { shadow: true }));
    for (const [sx, z, s] of [[-1, 8.6, 1.15], [1, 9.1, 1.25]] as const) put('bush_flowers', sx * (halfWAt(z) + 0.2), z, s, z, false);
    // grass and flowers sway in the wind (a tiny vertex nudge, instanced foliage only)
    const seen = new Set<THREE.Material>();
    scene.traverse((o) => { const im = o as THREE.InstancedMesh; if (!im.isInstancedMesh || !/grass|clover|flowers|fern/.test(o.parent?.name ?? '')) return; const m = im.material as THREE.MeshStandardMaterial; if (seen.has(m)) return; seen.add(m);
      m.onBeforeCompile = (sh) => { sh.uniforms.uTime = time; sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        #ifdef USE_INSTANCING
          float ph = instanceMatrix[3].x * 0.7 + instanceMatrix[3].z * 0.45;
          float bend = max(0.0, position.y) * 0.08;
          transformed.x += sin(uTime * 1.9 + ph) * bend; transformed.z += cos(uTime * 1.5 + ph * 1.3) * bend * 0.5;
        #endif`); }; m.customProgramCacheKey = () => 'sway'; m.needsUpdate = true; });
    // ---- you: the owner's Fuzzy with the woven basket balanced on its head ----
    const bk = k.clone('basket'); const pile = new THREE.Group(); bk.add(pile);
    const rimMats: THREE.MeshStandardMaterial[] = []; bk.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.material = (m.material as THREE.MeshStandardMaterial).clone(); rimMats.push(m.material as THREE.MeshStandardMaterial); } });
    me = figurePlayer({
      group: bk, topY: 0.72, width: 1,
      fill(kinds) { pile.clear(); kinds.slice(-9).forEach((kd, i) => { const f = k.clone(FRUIT_NODE[kd as FruitKind] ?? 'fruit_apple', { shadow: false }); const ring = i < 5 ? 0.42 : 0.2, an = i * 2.4; f.position.set(Math.cos(an) * ring, 0.52 + (i < 5 ? 0 : 0.18), Math.sin(an) * ring); f.scale.setScalar(0.26); f.rotation.set(rr(), rr() * 6, rr()); pile.add(f); }); },
      glow(v) { for (const m of rimMats) { m.emissive.set('#ffb84a'); m.emissiveIntensity = v; } },
    });
    me.basket.fill([]);
  };

  // ---------------------------------------------------------------- the fallback: the hand-built orchard
  const buildFallback = () => {
    const nFront = portrait ? 3 : 5;
    for (let i = 0; i < nFront; i++) {
      const x = -span + (i / (nFront - 1)) * span * 2;
      const t = O.orchardTree(11 + i * 7, i % 3 === 1 ? 'pear' : i % 3 === 2 ? 'mixed' : 'apple', { scale: portrait ? 1.55 : 1.3, leaves: lite ? 90 : 130, hanging: 12 });
      t.group.position.set(x, 0, -2.7 - (i % 2) * 0.35); t.group.rotation.y = i * 1.9; scene.add(t.group);
      front.push({ g: t.group, x, v: 0, a: 0, update: (tt, dt) => t.update(tt, dt) }); (front[front.length - 1] as Shaker & { shakeFn?: (k: number) => void }).shakeFn = (k) => t.shake(k);
    }
    for (let i = 0; i < 11; i++) { const z = -16 - (i % 3) * 3; const w = halfWAt(z) * 1.15; const t = O.farTree(200 + i, 1.2 + (i % 3) * 0.2); t.position.set(-w + (i / 10) * w * 2, 0, z); scene.add(t); }
    scene.add(O.hills());
    const barn = O.barn(); barn.position.set(-halfWAt(-14) * 0.62, 0, -14); barn.rotation.y = 0.35; scene.add(barn);
    for (let i = 0; i < 6; i++) { const c = O.cloud(i + 3); c.position.set((i - 2.5) * 16, 15 + (i % 3) * 2.5, -48 - (i % 2) * 8); scene.add(c); clouds.push(c); }
    scene.add(O.fence(-span - 6, span + 6, -1.3));
    const tufts: { x: number; z: number; s: number }[] = []; for (let i = 0; tufts.length < (lite ? 230 : 380) && i < 4000; i++) { const z = -14 + Math.pow(rr(), 0.7) * 24, x = (rr() - 0.5) * 2 * (halfWAt(z) + 2); if (free(x, z)) tufts.push({ x, z, s: 0.6 + rr() * 0.6 }); }
    scene.add(O.grassTufts(tufts, time));
    const basket = O.basketModel(1);
    me = figurePlayer({ group: basket.group, topY: basket.topY, width: 1, fill: (kinds) => basket.fill(kinds), glow: (v) => { (basket.rim.material as THREE.MeshStandardMaterial).emissiveIntensity = v; } });
  };

  void kits.then((k) => { buildKit(k); }).catch((e) => { console.warn('Orchard models unavailable, using the drawn orchard', e); buildFallback(); }).finally(() => { built = true; afterBuild(); });

  // ---------------------------------------------------------------- shared: effects, HUD, controls, the loop
  const starMat = new THREE.SpriteMaterial({ map: O.starTex(), transparent: true, depthWrite: false });
  const dizzy = new THREE.Group(); for (let i = 0; i < 3; i++) { const s = new THREE.Sprite(starMat); s.scale.setScalar(0.24); dizzy.add(s); } dizzy.visible = false; scene.add(dizzy);
  const aim = new THREE.Mesh(new THREE.RingGeometry(0.32, 0.42, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false })); aim.position.y = 0.03; scene.add(aim);
  const flies = ['#ffffff', '#ffcf4a', '#ff8fb4'].map((c, i) => { const b = O.butterfly(c); b.group.scale.setScalar(1.4); scene.add(b.group); return { ...b, ph: i * 2.1 }; });
  const pollenMat = new THREE.SpriteMaterial({ map: O.softDotTex(), color: '#fff6d0', transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending });
  const pollen = Array.from({ length: lite ? 14 : 26 }, (_, i) => { const s = new THREE.Sprite(pollenMat); s.scale.setScalar(0.07 + (i % 3) * 0.03); s.position.set((rr() - 0.5) * hw * 2.4, 0.5 + rr() * 5, -1 + rr() * 3); scene.add(s); return { s, ph: rr() * 10 }; });
  const caughtKinds: O.FruitArtKind[] = [];
  const FS = portrait ? 1.35 : 1.15;
  let VOFF = 0;
  const afterBuild = () => { VOFF = Math.max(0, me.rimY - BASKET.y - 0.1); };

  // ---- falling things ----
  const shadowMat = new THREE.MeshBasicMaterial({ map: O.softDotTex(), color: '#2a3a1a', transparent: true, depthWrite: false, opacity: 0.4 });
  const haloMat = new THREE.SpriteMaterial({ map: O.softDotTex(), color: '#ffd34a', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.75 });
  type Node = { it: Falling; m: THREE.Object3D; sh: THREE.Mesh; age: number; got: number; from: THREE.Vector3; ground: number; p: THREE.Vector3; v: THREE.Vector3; spin: THREE.Vector3; extra: THREE.Object3D[]; k: number };
  const nodes = new Map<number, Node>();
  const make = (it: Falling): Node => {
    const k0 = kit as Kit | null;
    const m: THREE.Object3D = k0 ? k0.clone(FRUIT_NODE[it.kind], { shadow: true }) : O.fruitModel(it.kind as O.FruitArtKind, true);
    const sizeK = k0 ? it.r * FRUIT_K[it.kind] : 1;
    const extra: THREE.Object3D[] = [];
    if (it.kind === 'gold') { const h = new THREE.Sprite(haloMat); h.scale.setScalar(k0 ? 1.3 / sizeK : 1.3); m.add(h); for (let i = 0; i < 2; i++) { const s = new THREE.Sprite(starMat); s.scale.setScalar(k0 ? 0.16 / sizeK : 0.16); m.add(s); extra.push(s); } }
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9).rotateX(-Math.PI / 2), shadowMat.clone()); sh.position.y = 0.025; scene.add(sh);
    m.scale.setScalar(0.001); scene.add(m);
    const n: Node = { it, m, sh, age: 0, got: -1, from: new THREE.Vector3(), ground: -1, p: new THREE.Vector3(it.x, it.y, 0), v: new THREE.Vector3(), spin: new THREE.Vector3(), extra, k: sizeK * FS };
    nodes.set(it.id, n); return n;
  };
  const drop = (n: Node) => { scene.remove(n.m, n.sh); nodes.delete(n.it.id); };
  // falling leaves when a crown lets go of a fruit
  const leafMat = new THREE.SpriteMaterial({ map: O.leafCardTex(), transparent: true, depthWrite: false });
  const leaves: { s: THREE.Sprite; v: THREE.Vector3; life: number; ph: number }[] = [];
  const shed = (x: number, y: number) => { for (let i = 0; i < 2; i++) { const s = new THREE.Sprite(leafMat.clone()); s.scale.setScalar(0.28); s.position.set(x + (Math.random() - 0.5) * 0.8, y + 0.2, -0.3 + Math.random() * 0.4); scene.add(s); leaves.push({ s, v: new THREE.Vector3((Math.random() - 0.5) * 0.6, -0.9, 0), life: 0, ph: Math.random() * 6 }); } };
  const nearestTree = (x: number) => front.reduce((b, t) => (Math.abs(t.x - x) < Math.abs(b.x - x) ? t : b), front[0]);
  const shake = (t: Shaker | undefined, k: number) => { if (!t) return; const f = (t as Shaker & { shakeFn?: (k: number) => void }).shakeFn; if (f) f(k); else t.v += (Math.random() < 0.5 ? -1 : 1) * k * 0.6; };

  // ---- HUD: a medal track under the score (bronze / silver / gold notches fill as you score) ----
  const bar = document.createElement('div'); bar.className = 'mg-tierbar';
  const fill = document.createElement('i'); const track = document.createElement('div'); track.className = 'track'; track.append(fill); bar.append(track);
  const top = SCORING.tiers[0] * 1.12;
  const notches = (['bronze', 'silver', 'gold'] as const).map((k, i) => { const d = document.createElement('b'); d.className = k; d.style.left = `${(SCORING.tiers[2 - i] / top) * 100}%`; d.title = `${k} ${SCORING.tiers[2 - i]}`; track.append(d); return d; });
  a.hud.append(bar);
  let medal = 0;

  // ---- drag anywhere: the Fuzzy follows your finger / the mouse along the lane ----
  let dragId: number | null = null; let targetX: number | null = null;
  const ray = new THREE.Raycaster(); const ndc = new THREE.Vector2();
  /** the lane x under a screen point (where the ray crosses the lane's plane) */
  const worldX = (cx: number, cy: number) => {
    const r = renderer.domElement.getBoundingClientRect(); ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera);
    const o = ray.ray.origin, d = ray.ray.direction; const t = Math.abs(d.z) > 1e-6 ? (0 - o.z) / d.z : 0;
    return Math.max(-hw, Math.min(hw, o.x + d.x * t));
  };
  const onDown = (e: PointerEvent) => { if ((e.target as HTMLElement).closest('button, .mg-intro, .race-paused')) return; if (!a.started() || a.paused()) return; dragId = e.pointerId; targetX = worldX(e.clientX, e.clientY); try { a.root.setPointerCapture(e.pointerId); } catch { /* not capturable */ } };
  const onMove = (e: PointerEvent) => { if (dragId === e.pointerId) targetX = worldX(e.clientX, e.clientY); };
  const onUp = (e: PointerEvent) => { if (dragId === e.pointerId) { dragId = null; targetX = null; } };
  a.root.addEventListener('pointerdown', onDown); a.root.addEventListener('pointermove', onMove); a.root.addEventListener('pointerup', onUp); a.root.addEventListener('pointercancel', onUp);
  const steer = (input: { x: number; z: number }) => (targetX === null ? input : { x: Math.max(-1, Math.min(1, (targetX - sim.x) * 1.6 - sim.vx * 0.2)), z: 0 });

  a.tip('move', a.mobile ? 'Drag anywhere — your Fuzzy follows your finger. Dodge the pinecones!' : 'A / D, the arrows, or drag with the mouse — dodge the pinecones', 3600);
  a.onAction(() => { /* no action key: catching is all in the running */ });

  let yaw = 0, lean = 0, spinT = 0, glow = 0;
  const basketWorld = new THREE.Vector3(), lookAt = new THREE.Vector3();
  a.run((dt, input) => {
    sim.step(dt, steer(input));
    if (!built) return;
    for (const e of sim.events) {
      if (e.kind === 'spawn' && e.item) { shake(nearestTree(e.item.x), 0.6); if (Math.random() < 0.6) shed(e.item.x, e.item.y); }
      else if (e.kind === 'catch' && e.item) {
        const n = nodes.get(e.item.id); if (n) { n.got = 0; n.from.copy(n.m.position); }
        a.float(sim.x, me.rimY + 0.9, 0, `+${e.value}${(e.mult ?? 1) > 1 ? ` ×${e.mult}` : ''}`, e.item.kind === 'gold' ? 'gold' : '');
        a.play(e.item.kind === 'gold' ? sfx.gold : sfx.collect);
        me.catch(e.item.kind === 'gold');
        if (e.item.kind === 'gold') a.tip('gold', 'Golden fruit! Worth 50 — and more with a chain', 3000);
      } else if (e.kind === 'cone' && e.item) {
        const n = nodes.get(e.item.id); if (n) { n.ground = 0; n.p.copy(n.m.position); n.v.set(Math.sign(e.item.x - sim.x || 1) * 2.6, 3.4, 0.8); n.spin.set(6, 4, 9); }
        a.chips(new THREE.Vector3(sim.x, me.rimY, 0.2), 9, '#8a5a30'); a.banner('Ouch — a pinecone! −20', 'warn'); a.play(vac.bump); me.ouch();
        a.tip('cone', 'Pinecones knock the basket and break your chain — step aside', 3200);
      } else if (e.kind === 'miss' && e.item) {
        const n = nodes.get(e.item.id); if (n) { n.ground = 0; n.p.copy(n.m.position); n.v.set((Math.random() - 0.5) * 1.6, -3, 0.4 + Math.random() * 0.6); n.spin.set(3, 0, 5); }
        a.puff(new THREE.Vector3(e.item.x, 0.15, 0.1), 4, '#e0c89a'); me.miss(); a.tip('miss', 'Missed one — the shadows on the path show where fruit lands', 3600);
      } else if (e.kind === 'combo') { a.banner(`×${e.mult} CHAIN!`, 'combo'); a.play(() => vac.combo(e.n ?? 1)); spinT = 0.55; me.cheer(); a.sparks(new THREE.Vector3(sim.x, me.rimY, 0), 10); }
      else if (e.kind === 'wave') { a.banner(e.n === 1 ? 'Faster!' : 'Even faster!', 'combo'); a.play(sfx.level); }
      else if (e.kind === 'warn') a.warn(e.n!);
    }
  }, (dt) => {
    if (!built) return;
    const t = time.value;
    // ---- the Fuzzy: follows, leans and turns into the run, watches the fruit, spins on a chain, wobbles when stunned ----
    const speedK = Math.min(1, Math.abs(sim.vx) / 9.5);
    yaw = lerp(yaw, THREE.MathUtils.clamp(sim.vx * 0.06, -0.5, 0.5), Math.min(1, dt * 8));
    spinT = Math.max(0, spinT - dt);
    lean = lerp(lean, -sim.vx * 0.03 + (sim.stun > 0 ? Math.sin(t * 28) * 0.1 : 0), Math.min(1, dt * 10));
    // eyes on the lowest fruit coming down (that's the one to catch)
    let watch: Falling | null = null; for (const it of sim.items) if (it.state === 'air' && it.kind !== 'cone' && (!watch || it.y < watch.y)) watch = it;
    me.frame(dt, { speed: speedK, vx: sim.vx, t, stun: sim.stun > 0, lean, yaw: yaw + (spinT > 0 ? (1 - spinT / 0.55) * Math.PI * 2 : 0), look: watch ? lookAt.set(watch.x, watch.y + VOFF, 0) : null });
    glow = lerp(glow, sim.combo.mult > 1 ? 0.25 + Math.sin(t * 8) * 0.12 : 0, Math.min(1, dt * 6)); me.basket.glow(glow);
    dizzy.visible = sim.stun > 0; if (dizzy.visible) dizzy.children.forEach((s, i) => { const an = t * 6 + (i / 3) * Math.PI * 2; s.position.set(sim.x + Math.cos(an) * 0.5, me.rimY + 0.35 + Math.sin(an * 2) * 0.05, Math.sin(an) * 0.5); });
    me.basket.group.getWorldPosition(basketWorld); basketWorld.y = me.rimY + (me.group.position.y);
    const am = aim.material as THREE.MeshBasicMaterial; am.opacity = lerp(am.opacity, targetX !== null ? 0.55 : 0, Math.min(1, dt * 10)); if (targetX !== null) aim.position.x = targetX;
    // ---- fruit ----
    for (const it of sim.items) {
      let n = nodes.get(it.id);
      if (!n) { if (it.state !== 'air') continue; n = make(it); }
      n.age += dt;
      if (n.got >= 0) {
        // arc into the basket, shrink to pile size, then join the pile with a juicy splash
        n.got += dt; const k = Math.min(1, n.got / 0.3);
        n.m.position.lerpVectors(n.from, basketWorld, k); n.m.position.y += Math.sin(k * Math.PI) * 0.5;
        n.m.scale.setScalar(n.k * (1 - k * 0.3)); n.sh.visible = false;
        if (k >= 1) {
          drop(n); caughtKinds.push(it.kind as O.FruitArtKind); if (caughtKinds.length > 12) caughtKinds.shift(); me.basket.fill(caughtKinds);
          a.puff(basketWorld.clone().setY(basketWorld.y + 0.2), it.kind === 'gold' ? 8 : 5, JUICE[it.kind]);
          if (it.kind === 'gold') a.sparks(basketWorld.clone(), 14);
        }
        continue;
      }
      if (n.ground >= 0) {
        // a miss bounces and rolls away; a pinecone flies off the basket — both fade out
        n.ground += dt; n.v.y -= 12 * dt; n.p.addScaledVector(n.v, dt);
        const floor = it.r * 0.9 * FS; if (n.p.y < floor) { n.p.y = floor; n.v.y = Math.abs(n.v.y) * 0.38; n.v.x *= 0.7; n.v.z *= 0.7; n.spin.multiplyScalar(0.6); }
        n.m.position.copy(n.p); n.m.rotation.x += n.spin.x * dt; n.m.rotation.z += n.spin.z * dt;
        n.sh.position.set(n.p.x, 0.025, n.p.z); n.sh.scale.setScalar(0.7); (n.sh.material as THREE.MeshBasicMaterial).opacity = 0.35;
        if (n.ground > 1.2) { const f = Math.max(0.001, 1 - (n.ground - 1.2) / 0.4); n.m.scale.setScalar(f * n.k); n.sh.visible = f > 0.2; if (f <= 0.001) drop(n); }
        continue;
      }
      if (it.state === 'ground') { n.ground = 0; n.p.copy(n.m.position); n.v.set((Math.random() - 0.5) * 1.2, -2, 0.3); n.spin.set(3, 0, 4); continue; }
      // in the air: pop out of the crown, tumble, wobble; the landing shadow grows as it nears the lane
      const pop = Math.min(1, n.age / 0.22); const back = 1 + 2.2 * Math.pow(pop - 1, 3) + 1.2 * Math.pow(pop - 1, 2);
      n.m.scale.setScalar(Math.max(0.001, back) * n.k);
      n.m.position.set(it.x, it.y + VOFF, 0);
      n.m.rotation.y += it.spin * dt; n.m.rotation.z = Math.sin(t * 3 + it.id) * 0.35; n.m.rotation.x = Math.cos(t * 2.4 + it.id) * 0.2;
      n.extra.forEach((s, i) => { const an = t * 4 + i * Math.PI; s.position.set(Math.cos(an) * 0.42 / n!.k * FS, Math.sin(an * 1.3) * 0.2 / n!.k * FS, Math.sin(an) * 0.42 / n!.k * FS); });
      const near = Math.max(0, 1 - it.y / 6.5);
      n.sh.position.set(it.x, 0.025, 0); n.sh.scale.setScalar(0.45 + near * 0.55); (n.sh.material as THREE.MeshBasicMaterial).opacity = 0.12 + near * 0.45;
    }
    for (const n of [...nodes.values()]) if (n.got < 0 && n.ground < 0 && !sim.items.includes(n.it)) drop(n);
    // ---- the world breathes: trees spring back after a shake, leaves flutter down, butterflies, pollen, clouds ----
    for (const tr of front) { if (tr.update) tr.update(t, dt); else { tr.v += (-tr.a * 60 - tr.v * 6) * dt; tr.a += tr.v * dt; tr.g.rotation.z = tr.a * 0.05 + Math.sin(t * 0.8 + tr.x) * 0.006; } }
    for (let i = leaves.length - 1; i >= 0; i--) { const l = leaves[i]; l.life += dt; l.s.position.x += (l.v.x + Math.sin(t * 3 + l.ph) * 0.5) * dt; l.s.position.y += l.v.y * dt; (l.s.material as THREE.SpriteMaterial).rotation = Math.sin(t * 4 + l.ph); if (l.s.position.y < 0.05 || l.life > 6) { scene.remove(l.s); leaves.splice(i, 1); } }
    flies.forEach((b, i) => { const ph = t * (0.35 + i * 0.07) + b.ph; b.group.position.set(Math.sin(ph) * (hw * 0.8), 1.8 + Math.sin(ph * 2.3) * 0.6 + i * 0.4, -0.6 + Math.cos(ph * 1.7) * 0.9); b.group.rotation.y = Math.atan2(Math.cos(ph), -Math.sin(ph * 1.7) * 0.5); b.update(t + i); });
    pollen.forEach((p) => { p.s.position.y += Math.sin(t * 0.7 + p.ph) * 0.003; p.s.position.x += Math.cos(t * 0.4 + p.ph) * 0.002; });
    clouds.forEach((c, i) => { c.position.x += dt * (0.25 + i * 0.05); if (c.position.x > 60) c.position.x = -60; });
    // ---- HUD ----
    a.setScore(sim.score);
    a.setCount(String(sim.caught), sim.missed ? `${sim.missed} missed` : '');
    a.setTime(sim.clock.left);
    a.setCombo(sim.combo.chain, sim.combo.mult, sim.combo.next);
    fill.style.width = `${Math.min(100, (sim.score / top) * 100)}%`;
    const m = sim.score >= SCORING.tiers[0] ? 3 : sim.score >= SCORING.tiers[1] ? 2 : sim.score >= SCORING.tiers[2] ? 1 : 0;
    if (m > medal) { medal = m; notches.forEach((d, i) => d.classList.toggle('on', i < m)); notches[m - 1].classList.add('pop'); a.banner(['', 'Bronze basket!', 'Silver basket!', 'Gold basket!'][m], 'combo'); a.play(sfx.level); }
    if (sim.state === 'done') a.finish(sim.result());
  });
  if (import.meta.env.DEV) (window as unknown as { __mg: unknown }).__mg = {
    id: 'fruit', sim, ctl: a.ctl, start: a.start, input: () => steer(a.ctl.read()), target: () => targetX, worldX, ready: () => built, kit: () => kit,
    screenOf: (x: number, y: number, z = 0) => { const v = new THREE.Vector3(x, y, z).project(camera); const r = renderer.domElement.getBoundingClientRect(); return { x: r.left + (v.x * 0.5 + 0.5) * r.width, y: r.top + (-v.y * 0.5 + 0.5) * r.height }; },
    finishNow: () => { (sim as unknown as { state: string }).state = 'done'; },
  };
}
