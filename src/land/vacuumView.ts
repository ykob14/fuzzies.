/**
 * Hairball Vacuum Challenge — the 3D garden, the Fuzzy with its cartoon vacuum, hairballs, effects, controls and HUD.
 * Rules live in land/vacuumGame.ts (every pick-up is real distance); shared controls in ui/joystick.ts. A separate scene
 * over the town (own renderer; the town's view is paused) that cleans up completely when it ends. Art follows ART.md.
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import * as M from '../game/models3d';
import * as T from '../game/textures3d';
import { race as snd, vac, vacuumHum, sfx } from '../game/sound';
import { VacuumSim, SCORING, LIMIT, ARENA, SUCTION, type Hairball } from './vacuumGame';
import { PAL, std, add } from './models';
import { buildSky, treeModel } from './environment';
import { glbFuzzy, glbReady } from '../game/fuzzyGlb';
import { mountControls } from '../ui/joystick';

export interface VacuumSetup { mobile: boolean; sound: boolean; deluxe?: boolean; you: { name: string; skin: [string, string] }; host: string; variant?: string | null; seed: number }
export interface VacuumResult { place: number; score: number; collected: number; count: { small: number; large: number; gold: number }; bestCombo: number; tier: string; timeMs: number }
export interface VacuumHooks { onFinish: (r: VacuumResult) => void; onQuit: () => void; onRestart?: () => void }

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, text = ''): HTMLElementTagNameMap[K] => { const e = document.createElement(tag); e.className = cls; if (text) e.textContent = text; return e; };
const lerp = THREE.MathUtils.lerp;
function paint(color: string): THREE.MeshPhysicalMaterial { return new THREE.MeshPhysicalMaterial({ color, metalness: 0.1, roughness: 0.3, clearcoat: 0.9, clearcoatRoughness: 0.1 }); }

// ---------- models ----------
/** The cartoon vacuum: a round body on two wheels, a see-through canister that fills up, a hose to a wide nozzle, a handle. */
function vacuumModel(color: string): { g: THREE.Group; wheels: THREE.Mesh[]; fill: THREE.Mesh; nozzle: THREE.Group; cone: THREE.Mesh; lamp: THREE.Mesh } {
  const g = new THREE.Group();
  const body = paint(color);
  add(g, new THREE.CapsuleGeometry(0.34, 0.5, 8, 18).rotateX(Math.PI / 2), body, 0, 0.42, 0);
  add(g, new THREE.TorusGeometry(0.36, 0.035, 8, 32).rotateX(Math.PI / 2), std('#fffaf0', 0.5), 0, 0.42, 0.05, false);
  // wheels
  const wheelGeo = new THREE.TorusGeometry(0.17, 0.08, 10, 20).rotateY(Math.PI / 2);
  const hub = std('#fffaf0', 0.5);
  const wheels = [-1, 1].map((sx) => { const w = add(g, wheelGeo, std('#3a3f4a', 0.6, 0.2), sx * 0.42, 0.2, -0.1, false); add(g, new THREE.CylinderGeometry(0.1, 0.1, 0.06, 12).rotateZ(Math.PI / 2), hub, sx * 0.46, 0.2, -0.1, false); return w; });
  add(g, new THREE.SphereGeometry(0.09, 10, 8), std('#3a3f4a', 0.6, 0.2), 0, 0.09, 0.45, false); // a little front castor
  // canister: a glass drum on top with a swirling fill inside
  const glass = new THREE.MeshPhysicalMaterial({ color: '#dff4ff', transmission: 0.75, roughness: 0.08, thickness: 0.3, transparent: true, opacity: 0.6 });
  add(g, new THREE.CylinderGeometry(0.24, 0.24, 0.5, 20, 1, true), glass, 0, 0.98, -0.05, false);
  add(g, new THREE.CylinderGeometry(0.26, 0.26, 0.06, 20), std(PAL.gold, 0.4, 0.3), 0, 1.25, -0.05, false);
  add(g, new THREE.CylinderGeometry(0.26, 0.26, 0.05, 20), std(PAL.gold, 0.4, 0.3), 0, 0.73, -0.05, false);
  const fill = add(g, new THREE.CylinderGeometry(0.21, 0.21, 0.46, 16), new THREE.MeshStandardMaterial({ color: '#ffb3c8', roughness: 0.95 }), 0, 0.98, -0.05, false);
  fill.scale.y = 0.02;
  // handle back to the Fuzzy
  const handle = add(g, new THREE.CylinderGeometry(0.03, 0.03, 0.9, 8), std('#8a8f99', 0.4, 0.5), 0, 0.75, -0.55, false); handle.rotation.x = 0.75;
  add(g, new THREE.CylinderGeometry(0.035, 0.035, 0.4, 8).rotateZ(Math.PI / 2), std('#3a3f4a', 0.6), 0, 1.06, -0.9, false);
  // hose + nozzle
  const nozzle = new THREE.Group();
  const path = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.6, 0.3), new THREE.Vector3(0, 0.55, 0.7), new THREE.Vector3(0, 0.25, 0.95), new THREE.Vector3(0, 0.12, 1.1)]);
  add(g, new THREE.TubeGeometry(path, 12, 0.06, 10, false), std('#5a6070', 0.6, 0.2), 0, 0, 0, false);
  add(nozzle, new THREE.BoxGeometry(0.62, 0.14, 0.22), paint(color), 0, 0.1, 0, false);
  add(nozzle, new THREE.BoxGeometry(0.56, 0.06, 0.08), std('#2b2f38', 0.6), 0, 0.05, 0.1, false);
  const lamp = add(nozzle, new THREE.SphereGeometry(0.05, 10, 8), new THREE.MeshBasicMaterial({ color: '#58d68d' }), 0.22, 0.19, 0.02, false);
  nozzle.position.set(0, 0, 1.12);
  g.add(nozzle);
  // the suction fan on the ground (shows the reach)
  const cone = new THREE.Mesh(new THREE.CircleGeometry(SUCTION.range, 24, Math.PI / 2 - SUCTION.cone, SUCTION.cone * 2).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.12, depthWrite: false }));
  cone.position.set(0, 0.03, SUCTION.ahead); cone.rotation.z = 0; g.add(cone);
  return { g, wheels, fill, nozzle, cone, lamp };
}

/** A hairball: a fluffy ball with a few tufts; golden ones shine. */
function hairballModel(b: Hairball, fur: THREE.Texture): THREE.Group {
  const g = new THREE.Group();
  const col = b.kind === 'gold' ? new THREE.Color('#ffd34a') : new THREE.Color().setHSL(0.86 + b.hue * 0.3 - 0.15, 0.55, 0.72);
  const mat = b.kind === 'gold'
    ? new THREE.MeshStandardMaterial({ color: col, roughness: 0.35, metalness: 0.6, emissive: '#6b4a00', emissiveIntensity: 0.4 })
    : new THREE.MeshStandardMaterial({ color: col, roughness: 0.95, map: fur, bumpMap: fur, bumpScale: 0.02 });
  const r = b.r;
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 2), mat); core.castShadow = true;
  const p = core.geometry.attributes.position; const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const k = 1 + Math.sin(v.x * 9 + b.hue * 7) * Math.cos(v.z * 8) * 0.07; p.setXYZ(i, v.x * k, v.y * k, v.z * k); }
  core.geometry.computeVertexNormals();
  g.add(core);
  const tuftGeo = new THREE.ConeGeometry(r * 0.22, r * 0.9, 6);
  for (let i = 0; i < 5; i++) { const t = new THREE.Mesh(tuftGeo, mat); const a = b.hue * 6 + i * 1.3, e = 0.4 + (i % 3) * 0.5; t.position.set(Math.cos(a) * Math.cos(e) * r * 0.9, Math.sin(e) * r * 0.9, Math.sin(a) * Math.cos(e) * r * 0.9); t.lookAt(t.position.clone().multiplyScalar(3)); t.rotateX(Math.PI / 2); g.add(t); }
  if (b.kind === 'gold') { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.glow('rgba(255,230,120,0.9)', 'rgba(255,230,120,0)'), transparent: true, depthWrite: false, opacity: 0.8 })); s.scale.setScalar(r * 5); s.name = 'glow'; g.add(s); }
  g.position.set(b.x, r * 0.9, b.z);
  return g;
}

/** The garden: lawn, paths, fountain, flower beds, benches, bushes, lamps, picket fence, trees beyond. */
function garden(scene: THREE.Scene, sim: VacuumSim, time: { value: number }, mobile: boolean): { water: THREE.Mesh; lamps: THREE.Mesh[] } {
  const { hw, hd } = ARENA;
  // lawn with a soft colour variation and a dip of darker grass under the beds
  const lawn = new THREE.PlaneGeometry(90, 90, 80, 80).rotateX(-Math.PI / 2);
  const lp = lawn.attributes.position, lc = new Float32Array(lp.count * 3);
  const g1 = new THREE.Color('#7fcc70'), g2 = new THREE.Color('#5fb35a'), c = new THREE.Color();
  for (let i = 0; i < lp.count; i++) { const x = lp.getX(i), z = lp.getZ(i); const n = Math.sin(x * 0.7) * Math.cos(z * 0.5) * 0.5 + 0.5; c.copy(g1).lerp(g2, n * 0.8); lc.set([c.r, c.g, c.b], i * 3); lp.setY(i, Math.abs(x) > hw + 1 || Math.abs(z) > hd + 1 ? Math.sin(x * 0.3) * Math.cos(z * 0.25) * 0.5 - 0.02 : 0); }
  lawn.setAttribute('color', new THREE.BufferAttribute(lc, 3)); lawn.computeVertexNormals();
  const lawnMesh = new THREE.Mesh(lawn, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 })); lawnMesh.receiveShadow = !mobile; scene.add(lawnMesh);
  // paths: a cross + a ring round the fountain, in warm paving
  const pave = std('#e6d6b8', 0.9);
  for (const [w, d] of [[hw * 2, 2.6], [2.6, hd * 2]]) add(scene, new THREE.BoxGeometry(w, 0.06, d), pave, 0, 0.03, 0, false).receiveShadow = !mobile;
  add(scene, new THREE.RingGeometry(2.6, 4.2, 40).rotateX(-Math.PI / 2), pave, 0, 0.035, 0, false);
  // the fountain (an obstacle): stone basin, water, a spout
  const stone = std(PAL.stone, 0.85);
  add(scene, new THREE.CylinderGeometry(2.3, 2.45, 0.5, 36), stone, 0, 0.25, 0);
  add(scene, new THREE.CylinderGeometry(2.0, 2.0, 0.5, 36), std('#cfc3b0', 0.9), 0, 0.26, 0, false);
  const water = add(scene, new THREE.CylinderGeometry(1.95, 1.95, 0.1, 36), new THREE.MeshPhysicalMaterial({ color: '#8fe3ea', roughness: 0.1, transmission: 0.3, transparent: true, opacity: 0.85 }), 0, 0.5, 0, false);
  add(scene, new THREE.CylinderGeometry(0.22, 0.3, 1.2, 12), stone, 0, 1.0, 0);
  add(scene, new THREE.CylinderGeometry(0.7, 0.75, 0.12, 20), stone, 0, 1.55, 0);
  add(scene, new THREE.SphereGeometry(0.2, 12, 10), paint(PAL.raspberry), 0, 1.75, 0, false);
  // flower beds: a low hedge border, dark soil, flowers
  const hedge = std('#4f9e4a', 0.9), soil = std('#6b4a2e', 1), petal = ['#ff8fb4', '#ffc94a', '#ff6f91', '#b48cff', '#fff4e3'];
  for (const ob of sim.obstacles) {
    if (ob.kind === 'box' && ob.hw > 1.5) {
      add(scene, new THREE.BoxGeometry(ob.hw * 2 + 0.3, 0.42, ob.hd * 2 + 0.3), hedge, ob.x, 0.21, ob.z);
      add(scene, new THREE.BoxGeometry(ob.hw * 2 - 0.2, 0.44, ob.hd * 2 - 0.2), soil, ob.x, 0.22, ob.z, false);
      const rr = T.rng(Math.round(ob.x * 3 + ob.z));
      for (let i = 0; i < (mobile ? 10 : 16); i++) { const fx = ob.x + (rr() - 0.5) * (ob.hw * 2 - 0.6), fz = ob.z + (rr() - 0.5) * (ob.hd * 2 - 0.6); add(scene, new THREE.CylinderGeometry(0.02, 0.02, 0.3, 5), std('#3f8a3a', 0.9), fx, 0.55, fz, false); const f = add(scene, new THREE.SphereGeometry(0.11, 8, 6), std(petal[i % petal.length], 0.6), fx, 0.72, fz, false); f.scale.y = 0.6; }
    } else if (ob.kind === 'box') {
      // a bench: two slats and legs
      for (const dz of [-0.14, 0.14]) add(scene, new THREE.BoxGeometry(ob.hw * 2, 0.06, 0.22), std(PAL.wood, 0.8), ob.x, 0.46, ob.z + dz);
      add(scene, new THREE.BoxGeometry(ob.hw * 2, 0.3, 0.05), std(PAL.wood, 0.8), ob.x, 0.72, ob.z - 0.3, false).rotation.x = -0.15;
      for (const sx of [-1, 1]) add(scene, new THREE.BoxGeometry(0.08, 0.44, 0.5), std('#5c6068', 0.6, 0.3), ob.x + sx * (ob.hw - 0.15), 0.22, ob.z, false);
    } else if (ob.r > 0.5 && ob.r < 2) { // bushes (the fountain is its own build above)
      const b = add(scene, new THREE.IcosahedronGeometry(ob.r, 2), std(ob.r > 0.85 ? '#5fb75d' : '#4f9e4a', 0.95), ob.x, ob.r * 0.65, ob.z); b.scale.y = 0.8;
      if (ob.r > 0.85) for (let i = 0; i < 4; i++) add(scene, new THREE.SphereGeometry(0.08, 8, 6), std(i % 2 ? '#ff8fb4' : '#fff4e3', 0.6), ob.x + Math.cos(i * 1.6) * ob.r * 0.7, ob.r * 0.9, ob.z + Math.sin(i * 1.6) * ob.r * 0.7, false);
    }
  }
  // lamp posts
  const lamps: THREE.Mesh[] = [];
  for (const [x, z] of [[-11.5, 0], [11.5, 0]]) {
    add(scene, new THREE.CylinderGeometry(0.07, 0.1, 2.6, 8), std('#3a3f4a', 0.6, 0.3), x, 1.3, z);
    lamps.push(add(scene, new THREE.SphereGeometry(0.22, 12, 10), new THREE.MeshStandardMaterial({ color: '#fff4c2', emissive: '#ffd27a', emissiveIntensity: 0.6, roughness: 0.4 }), x, 2.75, z, false));
  }
  // picket fence round the arena
  const picket = std('#fffaf0', 0.8);
  const post = new THREE.BoxGeometry(0.12, 0.9, 0.12), rail = new THREE.BoxGeometry(1, 0.08, 0.06);
  for (let x = -hw; x <= hw; x += 1) for (const z of [-hd, hd]) { add(scene, post, picket, x, 0.45, z, false); add(scene, rail, picket, x + 0.5, 0.65, z, false); add(scene, rail, picket, x + 0.5, 0.3, z, false); }
  for (let z = -hd; z <= hd; z += 1) for (const x of [-hw, hw]) { add(scene, post, picket, x, 0.45, z, false); add(scene, rail.clone().rotateY(Math.PI / 2), picket, x, 0.65, z + 0.5, false); add(scene, rail.clone().rotateY(Math.PI / 2), picket, x, 0.3, z + 0.5, false); }
  // trees beyond the fence
  for (let i = 0; i < (mobile ? 18 : 30); i++) { const a = (i / 30) * Math.PI * 2; const t = treeModel(200 + i, time, 1 + (i % 3) * 0.25); t.position.set(Math.cos(a) * (hw + 5 + (i % 4) * 2), 0, Math.sin(a) * (hd + 5 + (i % 3) * 2)); scene.add(t); }
  return { water, lamps };
}

// ---------- the run ----------
export function runVacuum(stage: HTMLElement, setup: VacuumSetup, hooks: VacuumHooks): void {
  const mobile = setup.mobile;
  const sim = new VacuumSim(setup.variant === 'golden' ? 'golden' : 'classic', setup.seed);

  // ---- DOM ----
  const root = el('div', 'vac mg');
  const canvas = document.createElement('canvas'); canvas.className = 'race-canvas';
  const hud = el('div', 'race-hud mg-hud');
  const scoreEl = el('div', 'race-lap mg-score'); const scoreN = el('b', '', '0'); scoreEl.append(el('small', '', 'SCORE'), scoreN);
  const countEl = el('div', 'race-pos mg-count'); const countN = el('b', '', '0'); const canBar = el('i', 'mg-can'); const canFill = el('b', 'mg-can-fill'); canBar.append(canFill); countEl.append(el('small', '', 'HAIRBALLS'), countN, canBar);
  const timeEl = el('div', 'race-time mg-time', '2:00');
  const comboEl = el('div', 'mg-combo'); const comboN = el('b', '', '×1'); const comboS = el('small', ''); comboEl.append(comboN, comboS);
  const pauseBtn = el('button', 'race-pause'); pauseBtn.type = 'button'; pauseBtn.setAttribute('aria-label', 'Pause'); pauseBtn.textContent = '❚❚';
  const banner = el('div', 'race-banner');
  const count = el('div', 'race-count');
  const hint = el('div', 'race-hint', mobile ? 'Drag anywhere to walk — the vacuum does the rest' : 'WASD / arrows to walk (or hold the mouse) — the vacuum does the rest');
  const floats = el('div', 'mg-floats');
  hud.append(scoreEl, countEl, timeEl, comboEl, pauseBtn, banner, count, hint, floats);
  const intro = el('div', 'forest-intro mg-intro'); const introBox = el('div', 'forest-intro-box');
  introBox.append(el('h2', '', 'Hairball Vacuum Challenge'), el('p', '', `${setup.host} lent you the vacuum. Walk over the hairballs and the nozzle pulls them in — ${SCORING.small} points each, ${SCORING.large} for the big ones, ${SCORING.gold} for golden ones. Quick pick-ups chain into a multiplier. Two minutes!`));
  const go = el('button', 'btn btn-primary btn-lg', 'Start cleaning!'); go.type = 'button'; introBox.append(go); intro.append(introBox);
  const pauseOverlay = el('div', 'race-paused'); pauseOverlay.hidden = true;
  const resume = el('button', 'btn btn-primary btn-lg', 'Resume'); resume.type = 'button';
  const restart = el('button', 'btn btn-soft', 'Restart'); restart.type = 'button';
  const quit = el('button', 'btn btn-ghost', 'Back to town'); quit.type = 'button';
  const pbox = el('div', 'race-paused-box'); pbox.append(el('h2', '', 'Paused'), el('p', '', 'The hairballs aren’t going anywhere.'), resume, restart, quit);
  pauseOverlay.append(pbox);
  root.append(canvas, hud, intro, pauseOverlay);
  stage.append(root);

  // ---- renderer & scene ----
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !mobile, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.shadowMap.enabled = !mobile; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = env.texture; scene.environmentIntensity = 0.3;
  const camera = new THREE.PerspectiveCamera(mobile ? 46 : 38, 1, 0.3, 300);
  const sun = new THREE.DirectionalLight(0xfff1dc, 2.4);
  sun.position.set(-14, 24, 10); sun.castShadow = !mobile;
  Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, near: 2, far: 80 });
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target, new THREE.HemisphereLight(0xdff0ff, 0x6a8a4a, 0.75));
  const sky = buildSky(); scene.add(sky);
  scene.fog = new THREE.Fog('#cfe6ee', 45, 130);
  const time = { value: 0 };
  const { water, lamps } = garden(scene, sim, time, mobile);
  // the Fuzzy + vacuum
  const mats = { fur: T.furStrands() } as unknown as M.Mats;
  const real = !!setup.deluxe && glbReady();
  const fuzzy = real ? glbFuzzy(setup.you.skin, 0.34, { shadow: !mobile }) : M.makeFuzzy(mats, setup.you.skin, 0.3, 0.09, mobile ? 6 : 9);
  const player = new THREE.Group();
  fuzzy.group.position.set(0, real ? 0.4 : 0.34, -0.35);
  const vacuum = vacuumModel(PAL.raspberry);
  vacuum.g.position.set(0, 0, 0.35);
  player.add(fuzzy.group, vacuum.g);
  const shadowTex = T.glow('rgba(0,0,0,0.4)', 'rgba(0,0,0,0)');
  const pShadow = new THREE.Mesh(new THREE.CircleGeometry(0.7, 20).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false })); pShadow.position.y = 0.02; player.add(pShadow);
  scene.add(player);
  // hairballs
  const furTex = T.furStrands([4, 2], 0.5);
  const balls = new Map<number, { g: THREE.Group; b: Hairball; pop: number }>();
  const addBall = (b: Hairball) => { const g = hairballModel(b, furTex); g.scale.setScalar(0.01); scene.add(g); balls.set(b.id, { g, b, pop: -1 }); };
  for (const b of sim.balls) addBall(b);
  // particles (suction wisps, pops, sparkles)
  const puffMat = new THREE.SpriteMaterial({ map: T.glow('rgba(255,255,255,0.9)', 'rgba(255,255,255,0)'), transparent: true, depthWrite: false, opacity: 0.6 });
  const sparkMat = new THREE.SpriteMaterial({ map: T.glow('rgba(255,230,120,1)', 'rgba(255,230,120,0)'), transparent: true, depthWrite: false, opacity: 0.9 });
  const wisps: { s: THREE.Sprite; to: THREE.Vector3 | null; v: THREE.Vector3; life: number; max: number }[] = [];
  const wisp = (at: THREE.Vector3, v: THREE.Vector3, size: number, max: number, mat = puffMat, to: THREE.Vector3 | null = null) => { if (wisps.length > (mobile ? 90 : 180)) return; const s = new THREE.Sprite(mat); s.position.copy(at); s.scale.setScalar(size); scene.add(s); wisps.push({ s, to, v, life: 0, max }); };
  // fountain droplets
  const drops: THREE.Sprite[] = [];
  for (let i = 0; i < (mobile ? 10 : 18); i++) { const s = new THREE.Sprite(puffMat); s.scale.setScalar(0.12); s.userData.ph = Math.random() * 6; scene.add(s); drops.push(s); }

  // ---- controls ----
  const ctl = mountControls(root, { touch: mobile, mouseSteer: !mobile });

  // ---- pause / start ----
  let paused = false, done = false, finishedAt = 0;
  const togglePause = () => { if (done || !intro.hidden) return; paused = !paused; pauseOverlay.hidden = !paused; if (paused) hum.set(0, 0); };
  pauseBtn.addEventListener('click', togglePause);
  resume.addEventListener('click', togglePause);
  quit.addEventListener('click', () => { destroy(); hooks.onQuit(); });
  restart.addEventListener('click', () => { destroy(); if (hooks.onRestart) hooks.onRestart(); else hooks.onQuit(); });
  const start = () => { if (!intro.hidden) { intro.hidden = true; sim.start(); play(snd.go); count.textContent = 'GO!'; count.className = 'race-count go'; setTimeout(() => { count.textContent = ''; count.className = 'race-count'; }, 900); setTimeout(() => hint.classList.add('fade'), 3500); } };
  go.addEventListener('click', start);
  const onKey = (e: KeyboardEvent) => { if (e.repeat) return; const k = e.key.toLowerCase(); if ((k === ' ' || k === 'enter') && !intro.hidden) { e.preventDefault(); start(); } if (k === 'escape' || k === 'p') togglePause(); };
  addEventListener('keydown', onKey);
  const onVis = () => { if (document.hidden && !paused && sim.state === 'playing') togglePause(); };
  document.addEventListener('visibilitychange', onVis);
  const play = (f: () => void) => { if (setup.sound) try { f(); } catch { /* no audio */ } };
  const hum = setup.sound ? vacuumHum() : { set() { /* off */ }, stop() { /* off */ } };
  const flashBanner = (t: string, cls = '') => { banner.textContent = t; banner.className = `race-banner ${cls}`; void banner.offsetWidth; banner.classList.add('on'); setTimeout(() => banner.classList.remove('on'), 1400); };
  const floatText = (x: number, y: number, z: number, text: string, cls = '') => {
    const v = new THREE.Vector3(x, y, z).project(camera);
    const d = el('span', `mg-float ${cls}`, text);
    d.style.left = `${(v.x * 0.5 + 0.5) * 100}%`; d.style.top = `${(-v.y * 0.5 + 0.5) * 100}%`;
    floats.append(d); setTimeout(() => d.remove(), 900);
  };

  // ---- camera: a fixed three-quarter view that follows the Fuzzy ----
  const camTarget = new THREE.Vector3(sim.you.pos.x, 0, sim.you.pos.z);
  const CAM = mobile ? { back: 9.5, up: 11.5 } : { back: 10.5, up: 11 };
  const resize = () => { const w = root.clientWidth || innerWidth, h = root.clientHeight || innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
  resize();
  const ro = new ResizeObserver(resize); ro.observe(root);
  camera.position.set(camTarget.x, CAM.up, camTarget.z + CAM.back);
  camera.lookAt(camTarget.x, 0.5, camTarget.z);

  // ---- loop ----
  let raf = 0, last = performance.now(), acc = 0, squash = 0, wheelSpin = 0, lastSec = -1, lastCombo = 1, hop = 0, hopV = 0;
  const tick = (now: number) => {
    raf = requestAnimationFrame(tick);
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now;
    if (paused) return;
    time.value += dt;
    const input = ctl.read();
    // fixed-step rules (screen-relative input maps straight to the ground: the camera never turns)
    acc += dt;
    let pulling = 0;
    while (acc >= 1 / 120) {
      sim.step(1 / 120, { x: input.x, z: input.z });
      acc -= 1 / 120;
      for (const e of sim.events) {
        if (e.kind === 'collect' && e.ball) {
          const n = balls.get(e.ball.id); if (n) n.pop = 0;
          const col = e.ball.kind === 'gold' ? 'gold' : e.ball.kind === 'large' ? 'big' : '';
          floatText(e.ball.x, 1.1, e.ball.z, `+${e.value}${(e.mult ?? 1) > 1 ? ` ×${e.mult}` : ''}`, col);
          play(e.ball.kind === 'gold' ? vac.gold : e.ball.kind === 'large' ? vac.big : vac.slurp);
          squash = e.ball.kind === 'small' ? 0.5 : 0.9;
          if (e.ball.kind === 'gold') { hopV = 3.2; for (let k = 0; k < 10; k++) wisp(new THREE.Vector3(sim.you.pos.x, 1.2, sim.you.pos.z), new THREE.Vector3((Math.random() - 0.5) * 3, 2 + Math.random() * 2, (Math.random() - 0.5) * 3), 0.3, 0.9, sparkMat); }
        } else if (e.kind === 'combo') { flashBanner(`×${e.mult} COMBO!`, 'combo'); play(() => vac.combo(e.n ?? 1)); }
        else if (e.kind === 'full') { flashBanner(`Canister full! +${e.value}`, 'combo'); play(vac.full); for (let k = 0; k < 14; k++) wisp(new THREE.Vector3(sim.you.pos.x, 1.4, sim.you.pos.z + 0.3), new THREE.Vector3((Math.random() - 0.5) * 4, 1 + Math.random() * 3, (Math.random() - 0.5) * 4), 0.35, 1.1); }
        else if (e.kind === 'spawn' && e.ball) addBall(e.ball);
        else if (e.kind === 'warn') { if (e.n === 30) flashBanner('30 seconds!'); else if (e.n === 10) flashBanner('10 seconds — hurry!', 'warn'); else if (e.n! <= 3) { count.textContent = String(e.n); count.className = 'race-count'; void count.offsetWidth; count.classList.add('pop'); } play(e.n! <= 3 ? snd.count : vac.tick); }
        else if (e.kind === 'bump') { play(vac.bump); squash = 0.6; }
      }
    }
    // the Fuzzy and its vacuum
    const you = sim.you;
    hopV -= 12 * dt; hop = Math.max(0, hop + hopV * dt); if (hop === 0) hopV = Math.max(0, hopV);
    squash = lerp(squash, 0, Math.min(1, dt * 8));
    player.position.set(you.pos.x, 0, you.pos.z);
    player.rotation.y = you.heading;
    const spK = you.speed / you.o.max;
    fuzzy.group.position.y = (real ? 0.4 : 0.34) + Math.abs(Math.sin(time.value * 11)) * 0.08 * spK + hop;
    fuzzy.body.rotation.z = Math.sin(time.value * 11) * 0.09 * spK;
    fuzzy.body.rotation.x = 0.12 * spK;
    fuzzy.body.scale.set(1 + squash * 0.18, 1 - squash * 0.22, 1 + squash * 0.18);
    const happy = hop > 0.05;
    for (const e of fuzzy.eyes) { e.open.visible = !happy; e.lid.visible = happy; }
    wheelSpin += you.speed * dt / 0.17;
    for (const w of vacuum.wheels) w.rotation.x = wheelSpin;
    vacuum.g.rotation.x = Math.sin(time.value * 9) * 0.015 * spK;
    vacuum.fill.scale.y = Math.max(0.02, sim.fill);
    vacuum.fill.position.y = 0.75 + 0.23 * Math.max(0.02, sim.fill);
    vacuum.fill.rotation.y += dt * (2 + pulling * 6);
    // hairballs: bob, spin when pulled, pop when caught; wisps stream into the nozzle
    const fx = Math.sin(you.heading), fz = Math.cos(you.heading);
    const nozzleAt = new THREE.Vector3(you.pos.x + fx * 1.1, 0.15, you.pos.z + fz * 1.1);
    for (const [id, n] of balls) {
      const b = n.b;
      if (n.pop >= 0) {
        n.pop += dt;
        const k = n.pop / 0.22;
        n.g.position.lerp(nozzleAt, Math.min(1, dt * 18));
        n.g.scale.setScalar(Math.max(0.01, 1 - k) * (b.kind === 'large' ? 1 : 0.9));
        if (k >= 1) { scene.remove(n.g); balls.delete(id); }
        continue;
      }
      const grow = Math.min(1, n.g.scale.x + dt * 3);
      n.g.scale.setScalar(grow);
      if (b.state === 'pulled') {
        pulling = 1;
        n.g.position.set(b.x, b.r * 0.9 + 0.1, b.z);
        n.g.rotation.y += dt * 12; n.g.rotation.x += dt * 7;
        // stretch towards the nozzle
        const d = Math.max(0.3, Math.hypot(nozzleAt.x - b.x, nozzleAt.z - b.z));
        n.g.scale.set(grow * 0.9, grow * 0.85, grow * Math.min(1.5, 0.9 + 1 / d));
        n.g.lookAt(nozzleAt.x, n.g.position.y, nozzleAt.z);
        if (Math.random() < dt * 20) wisp(n.g.position.clone(), new THREE.Vector3(0, 0.5, 0), 0.25, 0.3, puffMat, nozzleAt.clone());
      } else {
        n.g.position.set(b.x, b.r * 0.9 + Math.sin(time.value * 2 + b.bob) * 0.03, b.z);
        n.g.rotation.y = b.bob + Math.sin(time.value * 1.2 + b.bob) * 0.3;
        n.g.rotation.x = Math.sin(time.value * 1.7 + b.bob) * 0.12;
      }
      const glow = n.g.getObjectByName('glow') as THREE.Sprite | undefined;
      if (glow) (glow.material as THREE.SpriteMaterial).opacity = 0.5 + Math.sin(time.value * 5 + b.bob) * 0.3;
    }
    (vacuum.lamp.material as THREE.MeshBasicMaterial).color.set(pulling ? '#ffc94a' : '#58d68d');
    (vacuum.cone.material as THREE.MeshBasicMaterial).opacity = 0.1 + pulling * 0.12 + Math.sin(time.value * 8) * 0.02;
    hum.set(sim.state === 'playing' ? 0.6 + spK * 0.4 : 0, pulling);
    // wisps
    for (let i = wisps.length - 1; i >= 0; i--) {
      const q = wisps[i]; q.life += dt;
      if (q.to) q.s.position.lerp(q.to, Math.min(1, dt * 10)); else { q.v.y -= 4 * dt; q.s.position.addScaledVector(q.v, dt); }
      const k = q.life / q.max; (q.s.material === sparkMat ? q.s : q.s).scale.setScalar(q.s.scale.x * (1 - dt * 0.5));
      if (k >= 1) { scene.remove(q.s); wisps.splice(i, 1); }
    }
    // fountain
    water.rotation.y += dt * 0.3;
    drops.forEach((s, i) => { const t = (time.value * 0.8 + s.userData.ph) % 1; const a = i * 1.1; s.position.set(Math.cos(a) * t * 1.6, 1.6 + Math.sin(t * Math.PI) * 1.2 - t * 1.0, Math.sin(a) * t * 1.6); (s.material as THREE.SpriteMaterial).opacity = 0.6; });
    for (const l of lamps) (l.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.5 + Math.sin(time.value * 3 + l.position.x) * 0.1;
    // camera: follows, leads a little in the walking direction
    camTarget.lerp(new THREE.Vector3(you.pos.x + you.vel.x * 0.25, 0, you.pos.z + you.vel.z * 0.25), Math.min(1, dt * 4));
    camera.position.set(camTarget.x, CAM.up, camTarget.z + CAM.back);
    camera.lookAt(camTarget.x, 0.5, camTarget.z - 0.5);
    sun.target.position.copy(camTarget); sun.position.set(camTarget.x - 14, 24, camTarget.z + 10);
    // HUD
    if (scoreN.textContent !== String(sim.score)) { scoreN.textContent = String(sim.score); scoreEl.classList.remove('bump'); void scoreEl.offsetWidth; scoreEl.classList.add('bump'); }
    countN.textContent = String(sim.collected);
    const left = Math.ceil(sim.left);
    if (left !== lastSec) { lastSec = left; timeEl.textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`; timeEl.classList.toggle('warn', left <= 10 && sim.state === 'playing'); }
    canFill.style.transform = `scaleX(${sim.fill})`;
    const mult = sim.combo.mult;
    if (sim.combo.chain > 1) { comboEl.classList.add('on'); comboN.textContent = `×${mult}`; const nx = sim.combo.next; comboS.textContent = nx ? `${sim.combo.chain} chain · ${nx.at - sim.combo.chain} more for ×${nx.mult}` : `${sim.combo.chain} chain · MAX`; if (mult !== lastCombo) { comboEl.classList.remove('bump'); void comboEl.offsetWidth; comboEl.classList.add('bump'); } }
    else comboEl.classList.remove('on');
    lastCombo = mult;
    // end: freeze, a beat, then the results
    if (sim.state === 'done' && !done) {
      hum.set(0, 0);
      if (!finishedAt) { finishedAt = now; count.textContent = 'TIME!'; count.className = 'race-count go'; play(vac.timeup); }
      if (now - finishedAt > 1800) { done = true; const r = sim.result(); destroy(); hooks.onFinish(r); return; }
    }
    renderer.render(scene, camera);
  };
  let destroyed = false;
  const destroy = () => {
    if (destroyed) return; destroyed = true;
    cancelAnimationFrame(raf);
    removeEventListener('keydown', onKey);
    document.removeEventListener('visibilitychange', onVis);
    ro.disconnect(); ctl.destroy(); hum.stop();
    scene.traverse((o) => { if (o instanceof THREE.Mesh) o.geometry.dispose(); });
    env.dispose(); pmrem.dispose(); renderer.dispose(); renderer.forceContextLoss();
    root.remove();
  };
  requestAnimationFrame(() => { last = performance.now(); raf = requestAnimationFrame(tick); });
  if (import.meta.env.DEV) (window as unknown as { __vac: unknown }).__vac = { sim, start, ctl, finishNow: () => { (sim as unknown as { state: string }).state = 'done'; finishedAt = performance.now() - 5000; }, destroy };
  void LIMIT; void sfx;
}
