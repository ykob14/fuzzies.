/**
 * The SHARED mini-game scene kit — everything a Fuzzies Land mini-game needs besides its own rules and props:
 * the renderer, lights and environment (sky, fog, a vertex-coloured ground, the tree line and rail fence, flowers), a
 * following camera, the HUD (score, a second counter, the clock, the combo badge, banners, the 3-2-1 / GO! / TIME! flash,
 * floating "+10" labels, a fading hint), the How-to-play intro card and the coach line, pause / restart / back to town,
 * the fixed-step game loop with visibility pause, particles (chips, sparks, puffs), the walking Fuzzy figure, and a clean
 * tear-down. A game calls `createArcade()`, builds its props into `a.scene`, and gives `a.run()` two callbacks:
 * `step(dt, input)` for the rules and `frame(dt)` for visuals. See fruitView.ts for the smallest complete example.
 * Rules stay DOM-free (land/arcade.ts); art follows ART.md.
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import * as M from '../game/models3d';
import * as T from '../game/textures3d';
import { race as snd, vac, sfx } from '../game/sound';
import { PAL, std, add } from './models';
import { buildSky } from './environment';
import * as O from './games/orchardArt';
import { groundTex, treeRing, type GroundKind, type TreeKind } from './games/sceneArt';
import { glbFuzzy, glbReady } from '../game/fuzzyGlb';
import { mountControls, type Controls } from '../ui/joystick';
import { introCard, coach as makeCoach } from '../ui/mgIntro';
import type { Adventure, Variant } from './adventures';

export interface Figure { group: THREE.Group; fuzzy: ReturnType<typeof M.makeFuzzy>; squash: number; base: number }
export interface Stat { label: string; value: string }
/** What every score-based mini-game hands back (the screen turns it into the results card and the reward). */
export interface MiniResult { place: number; score: number; timeMs: number; tier: string; stats: Stat[]; standings?: { name: string; score: number; you: boolean; place: number }[] }
export interface MiniHooks { onFinish: (r: MiniResult) => void; onQuit: () => void; onRestart?: () => void }
export interface MiniSetup { mobile: boolean; sound: boolean; deluxe?: boolean; you: { name: string; skin: [string, string] }; host: string; variant?: string | null; seed: number }

export interface ArcadeOpts {
  /** called when the intro is dismissed and the game begins — start the sim here */
  onStart?: () => void;
  cls: string;
  setup: MiniSetup;
  adv: Adventure;
  hooks: MiniHooks;
  buttonLabel?: string;
  /** an extra sentence under Details on the intro card */
  extra?: string;
  /** which controls to mount (default: joystick on touch + WASD, mouse steer on computers) */
  controls?: { touch?: boolean; mouseSteer?: boolean; actionKeys?: string[]; none?: boolean };
  hud?: { score?: string; count?: string; hint?: { desktop: string; mobile: string } };
  camera?: { fov?: number; back?: number; up?: number; lookDy?: number; lead?: number; lookY?: number };
  /** the world: a grassy clearing by default; `size` = half extents of the fenced area */
  world?: { size?: { hw: number; hd: number }; ground?: [string, string]; groundKind?: GroundKind; trees?: TreeKind; tufts?: boolean; clouds?: boolean; path?: boolean; treeLine?: boolean; fence?: boolean; flowers?: number; sky?: 'day' | 'dusk' | 'snow' | 'night'; fog?: [string, number, number]; sun?: number };
  /** how long the end celebration lasts before the results (ms) */
  outro?: number;
}

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, text = ''): HTMLElementTagNameMap[K] => { const e = document.createElement(tag); e.className = cls; if (text) e.textContent = text; return e; };
export const lerp = THREE.MathUtils.lerp;

export interface Arcade {
  root: HTMLElement; hud: HTMLElement; scene: THREE.Scene; camera: THREE.PerspectiveCamera; renderer: THREE.WebGLRenderer;
  time: { value: number }; ctl: Controls; mobile: boolean; real: boolean; mats: M.Mats;
  sun: THREE.DirectionalLight; hemi: THREE.HemisphereLight; sky: THREE.Mesh; ground: THREE.Mesh;
  camTarget: THREE.Vector3; cam: { back: number; up: number; lookDy: number; lead: number };
  /** the intro card; the game starts when it's dismissed */
  intro: HTMLElement; started: () => boolean; paused: () => boolean;
  play: (f: () => void) => void; tip: (key: string, text: string, ms?: number) => void;
  banner: (text: string, cls?: string) => void; flash: (text: string, cls?: string) => void;
  float: (x: number, y: number, z: number, text: string, cls?: string) => void;
  setScore: (n: number) => void; setCount: (text: string, n?: string) => void; setTime: (secsLeft: number, warn?: boolean) => void; setCombo: (chain: number, mult: number, next: { at: number; mult: number } | null) => void;
  /** particles */
  chips: (at: THREE.Vector3, n: number, color?: string) => void; sparks: (at: THREE.Vector3, n: number) => void; puff: (at: THREE.Vector3, n?: number, color?: string) => void;
  /** a Fuzzy figure (yours or a rival's) */
  figure: (skin: [string, string], r?: number) => Figure; walk: (f: Figure, speedK: number, dt: number) => void;
  /** start the loop; `step` runs on a fixed step with the input vector, `frame` once per rendered frame */
  run: (step: (dt: number, input: { x: number; z: number }) => void, frame: (dt: number, now: number) => void) => void;
  /** end the game: shows the flash, waits the outro, hands the result over and tears down */
  finish: (r: MiniResult, flashText?: string) => void;
  warn: (n: number) => void; onAction: (f: () => void) => void; destroy: () => void; start: () => void;
  /** a short tap / click on the scene (not a drag): NDC coords for ray-casting + client coords */
  onTap: (f: (ndc: { x: number; y: number }, client: { x: number; y: number }) => void) => void;
}

export function createArcade(stage: HTMLElement, o: ArcadeOpts): Arcade {
  const { setup, adv, hooks } = o;
  const mobile = setup.mobile;
  const W = o.world ?? {};
  const size = W.size ?? { hw: 16, hd: 11 };
  // ---- DOM ----
  const root = el('div', `${o.cls} mg`);
  const canvas = document.createElement('canvas'); canvas.className = 'race-canvas';
  const hud = el('div', 'race-hud mg-hud');
  const scoreEl = el('div', 'race-lap mg-score'); const scoreN = el('b', '', '0'); scoreEl.append(el('small', '', o.hud?.score ?? 'SCORE'), scoreN);
  const countEl = el('div', 'race-pos mg-count'); const countN = el('b', '', '0'); const countS = el('small', 'forest-trees', ''); countEl.append(el('small', '', o.hud?.count ?? ''), countN, countS);
  if (!o.hud?.count) countEl.hidden = true;
  const timeEl = el('div', 'race-time forest-time mg-time'); const timeN = el('span', '', adv.limit ? `${Math.floor(adv.limit / 60)}:${String(adv.limit % 60).padStart(2, '0')}` : '0:00'); timeEl.append(timeN);
  const comboEl = el('div', 'mg-combo'); const comboN = el('b', '', '×1'); const comboS = el('small', ''); comboEl.append(comboN, comboS);
  const pauseBtn = el('button', 'race-pause'); pauseBtn.type = 'button'; pauseBtn.setAttribute('aria-label', 'Pause'); pauseBtn.textContent = '❚❚';
  const bannerEl = el('div', 'race-banner');
  const count = el('div', 'race-count');
  const floats = el('div', 'mg-floats');
  const hint = el('div', 'race-hint', o.hud?.hint ? (mobile ? o.hud.hint.mobile : o.hud.hint.desktop) : (mobile ? adv.controls.mobile : adv.controls.desktop));
  hud.append(scoreEl, countEl, timeEl, comboEl, pauseBtn, bannerEl, count, hint, floats);
  const variant: Variant | null = setup.variant ? adv.variants?.[setup.variant] ?? null : null;
  const intro = introCard({ adv, variant, host: setup.host, mobile, buttonLabel: o.buttonLabel ?? 'Let’s go!', onStart: () => start(), extra: o.extra });
  const pauseOverlay = el('div', 'race-paused'); pauseOverlay.hidden = true;
  const resume = el('button', 'btn btn-primary btn-lg', 'Resume'); resume.type = 'button';
  const restart = el('button', 'btn btn-soft', 'Restart'); restart.type = 'button';
  const quit = el('button', 'btn btn-ghost', 'Back to town'); quit.type = 'button';
  const pbox = el('div', 'race-paused-box'); pbox.append(el('h2', '', 'Paused'), el('p', '', 'Take your time.'), resume, restart, quit);
  pauseOverlay.append(pbox);
  const vignette = el('div', 'mg-vignette');
  root.append(canvas, vignette, hud, intro, pauseOverlay);
  stage.append(root);
  const tips = makeCoach(root);

  // ---- renderer & scene ----
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !mobile, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  // soft shadows on phones too (a smaller map on a tight frustum that follows the camera), a touch more exposure
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = env.texture; scene.environmentIntensity = 0.42;
  const camera = new THREE.PerspectiveCamera(o.camera?.fov ?? (mobile ? 44 : 36), 1, 0.3, 300);
  const skyKind = W.sky ?? 'day';
  const sunColor = skyKind === 'dusk' ? 0xffd2a6 : skyKind === 'night' ? 0xb9c8ff : skyKind === 'snow' ? 0xf4f8ff : 0xfff1dc;
  const sun = new THREE.DirectionalLight(sunColor, W.sun ?? (skyKind === 'night' ? 1.2 : 2.4));
  sun.position.set(-14, 22, 12); sun.castShadow = true;
  Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 2, far: 90 });
  sun.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
  const hemi = new THREE.HemisphereLight(skyKind === 'night' ? 0x8fa3ff : 0xdff0ff, skyKind === 'snow' ? 0xdde7ee : 0x6a8a4a, skyKind === 'night' ? 0.5 : 0.75);
  scene.add(sun, sun.target, hemi);
  // the dome is built for the island (centred on the map); mini-game scenes sit at the origin, so re-centre it and keep it inside the camera's far plane
  const sky = buildSky(); sky.position.set(0, 0, 0); sky.scale.setScalar(0.6); scene.add(sky);
  const skyMat = sky.material as THREE.ShaderMaterial;
  if (skyKind === 'day') { (skyMat.uniforms.uTop.value as THREE.Color).set('#5aaae4'); (skyMat.uniforms.uHorizon.value as THREE.Color).set('#fcefd4'); }
  // a warm rim light from behind lifts silhouettes off the ground (characters, props, trees)
  const rim = new THREE.DirectionalLight(skyKind === 'night' ? 0x9fb4ff : skyKind === 'snow' ? 0xe6f0ff : 0xffe0b0, skyKind === 'night' ? 0.5 : 0.8); rim.position.set(7, 8, -14); scene.add(rim);
  if (skyKind === 'dusk') { (skyMat.uniforms.uTop.value as THREE.Color).set('#6a5aa8'); (skyMat.uniforms.uHorizon.value as THREE.Color).set('#ffc9a0'); }
  else if (skyKind === 'night') { (skyMat.uniforms.uTop.value as THREE.Color).set('#1b2140'); (skyMat.uniforms.uHorizon.value as THREE.Color).set('#4a5a9a'); }
  else if (skyKind === 'snow') { (skyMat.uniforms.uTop.value as THREE.Color).set('#9fc0e0'); (skyMat.uniforms.uHorizon.value as THREE.Color).set('#e9f1fa'); }
  const fog = W.fog ?? (skyKind === 'night' ? ['#2a3560', 30, 110] : skyKind === 'snow' ? ['#e4edf5', 35, 120] : ['#cfe6ee', 45, 130]);
  scene.fog = new THREE.Fog(fog[0], fog[1], fog[2]);
  const time = { value: 0 };
  // ground: a painted texture (grass / sand / dirt / snow / cobbles), large-scale light/shade variation baked into vertex colours, flat
  const gKind: GroundKind = W.groundKind ?? (skyKind === 'snow' ? 'snow' : 'grass');
  const ground = new THREE.PlaneGeometry(120, 120, 60, 60).rotateX(-Math.PI / 2);
  const gp = ground.attributes.position, gc = new Float32Array(gp.count * 3);
  const tint = new THREE.Color(W.ground ? W.ground[0] : '#ffffff'), white = new THREE.Color('#ffffff'), cc = new THREE.Color();
  const tintK = W.ground && gKind === 'grass' ? 0.5 : 0;
  for (let i = 0; i < gp.count; i++) {
    const x = gp.getX(i), z = gp.getZ(i);
    const k = 0.88 + Math.sin(x * 0.21 + 1) * Math.cos(z * 0.17) * 0.08 + Math.sin(x * 0.07 - z * 0.05) * 0.06;
    cc.copy(white).lerp(tint, tintK).multiplyScalar(k); gc.set([cc.r * 1.02, cc.g, cc.b * 0.96], i * 3);
  }
  ground.setAttribute('color', new THREE.BufferAttribute(gc, 3)); ground.computeVertexNormals();
  const gTex = groundTex(gKind); gTex.repeat.set(gKind === 'grass' ? 30 : 24, gKind === 'grass' ? 30 : 24);
  const groundMesh = new THREE.Mesh(ground, new THREE.MeshStandardMaterial({ map: gTex, vertexColors: true, roughness: gKind === 'snow' ? 0.7 : 0.95 }));
  groundMesh.receiveShadow = true; scene.add(groundMesh);
  if (W.path) { const pt = O.pathTex(); pt.repeat.set(4, 1); const lane = new THREE.Mesh(new THREE.PlaneGeometry(16, 2.6).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: pt, transparent: true, depthWrite: false, roughness: 0.95 })); lane.position.set(0, 0.012, size.hd * 0.45); lane.receiveShadow = true; scene.add(lane); }
  const rr = T.rng(setup.seed + 101);
  // the tree line: leafy trees with some pines (snowy pines on snow), all instanced
  if (W.treeLine !== false) {
    const n = mobile ? 26 : 40; const spots: { x: number; z: number; s: number }[] = [];
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + (rr() - 0.5) * 0.12; const r = 1 + (i % 5) * 0.3 + rr() * 0.15; spots.push({ x: Math.cos(a) * (size.hw + 3.5) * r, z: Math.sin(a) * (size.hd + 3.5) * r, s: 0.95 + (i % 3) * 0.22 + rr() * 0.15 }); }
    const kind: TreeKind = W.trees ?? (skyKind === 'snow' ? 'snowpine' : 'leafy');
    if (kind === 'leafy') { scene.add(treeRing(spots.filter((_, i) => i % 4 !== 3), 'leafy', { leaves: mobile ? 40 : 60 }), treeRing(spots.filter((_, i) => i % 4 === 3), 'pine')); }
    else scene.add(treeRing(spots, kind, { leaves: mobile ? 40 : 60 }));
  }
  // a rustic picket fence round the play area
  if (W.fence !== false) {
    const { hw, hd } = size;
    for (const sz of [-1, 1]) scene.add(O.fence(-hw, hw, sz * hd));
    for (const sx of [-1, 1]) { const f = O.fence(-hd, hd, 0); f.rotation.y = Math.PI / 2; f.position.x = sx * hw; scene.add(f); }
  }
  // flowers (daisies, poppies, buttercups) and swaying grass tufts on lawns — tufts only outside the play area so nothing hides
  const nFl = W.flowers ?? (mobile ? 14 : 26);
  if (nFl > 0) { const fl: { x: number; z: number; kind: number }[] = []; for (let i = 0; i < nFl; i++) fl.push({ x: (rr() - 0.5) * size.hw * 2, z: (rr() - 0.5) * size.hd * 2, kind: (rr() * 3) | 0 }); scene.add(O.flowers(fl)); }
  if (gKind === 'grass' && W.tufts !== false) {
    const tf: { x: number; z: number; s: number }[] = [];
    for (let i = 0; tf.length < (mobile ? 150 : 260) && i < 3000; i++) { const x = (rr() - 0.5) * (size.hw * 2 + 16), z = (rr() - 0.5) * (size.hd * 2 + 16); if (Math.abs(x) < size.hw + 0.3 && Math.abs(z) < size.hd + 0.3) continue; tf.push({ x, z, s: 0.6 + rr() * 0.6 }); }
    scene.add(O.grassTufts(tf, time));
  }
  // clouds and soft hills on the horizon
  if (W.clouds !== false && skyKind !== 'night') {
    for (let i = 0; i < 5; i++) { const c = O.cloud(i + 11); c.position.set((i - 2) * 22 + (rr() - 0.5) * 8, 16 + (i % 3) * 3, -55 - (i % 2) * 10); c.scale.multiplyScalar(1.5 + (i % 3) * 0.3); scene.add(c); }
    if (skyKind !== 'snow') scene.add(O.hills());
  }

  // ---- figures, particles ----
  const mats = { fur: T.furStrands() } as unknown as M.Mats;
  const real = !!setup.deluxe && glbReady();
  const shadowTex = T.glow('rgba(0,0,0,0.45)', 'rgba(0,0,0,0)');
  const figure = (skin: [string, string], r = 0.3): Figure => {
    const glb = !!setup.deluxe && glbReady(); // checked per figure: a scene may wait for the model before making its Fuzzy
    const fuzzy = glb ? glbFuzzy(skin, r * 1.13, { shadow: !mobile }) : M.makeFuzzy(mats, skin, r, 0.09, mobile ? 6 : 9);
    const group = new THREE.Group();
    const base = glb ? r * 1.33 : r * 1.13;
    fuzzy.group.position.y = base;
    group.add(fuzzy.group);
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(r * 1.6, 20).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false })); shadow.position.y = 0.02; group.add(shadow);
    group.traverse((o) => { if ((o as THREE.Mesh).isMesh && o !== shadow) o.castShadow = true; });
    scene.add(group);
    return { group, fuzzy, squash: 0, base };
  };
  const walk = (f: Figure, speedK: number, dt: number) => {
    f.squash = lerp(f.squash, 0, Math.min(1, dt * 8));
    f.fuzzy.group.position.y = f.base + Math.abs(Math.sin(time.value * 11)) * 0.08 * speedK;
    f.fuzzy.body.rotation.z = Math.sin(time.value * 11) * 0.1 * speedK;
    f.fuzzy.body.scale.set(1 + f.squash * 0.18, 1 - f.squash * 0.22, 1 + f.squash * 0.18);
  };
  const chipMat = std('#d9b27a', 0.9);
  const chipsArr: { m: THREE.Mesh; v: THREE.Vector3; life: number }[] = [];
  const chips = (at: THREE.Vector3, n: number, color?: string) => { const mat = color ? std(color, 0.85) : chipMat; for (let i = 0; i < n; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.12), mat); m.position.copy(at); m.rotation.set(Math.random() * 3, Math.random() * 3, 0); scene.add(m); chipsArr.push({ m, v: new THREE.Vector3((Math.random() - 0.5) * 3, 2 + Math.random() * 2, (Math.random() - 0.5) * 3), life: 0 }); } };
  const sparkTex = T.glow('rgba(255,230,120,1)', 'rgba(255,230,120,0)');
  const sparkMat = new THREE.SpriteMaterial({ map: sparkTex, transparent: true, depthWrite: false, opacity: 0.9 });
  const sparksArr: { s: THREE.Sprite; v: THREE.Vector3; life: number; max: number }[] = [];
  const sparks = (at: THREE.Vector3, n: number) => { for (let i = 0; i < n; i++) { const s = new THREE.Sprite(sparkMat); s.position.copy(at); s.scale.setScalar(0.3); scene.add(s); sparksArr.push({ s, v: new THREE.Vector3((Math.random() - 0.5) * 3, 1.5 + Math.random() * 2.5, (Math.random() - 0.5) * 3), life: 0, max: 1.2 }); } };
  const puffTex = T.glow('rgba(255,255,255,0.9)', 'rgba(255,255,255,0)');
  const puff = (at: THREE.Vector3, n = 4, color = '#ffffff') => { for (let i = 0; i < n; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, transparent: true, depthWrite: false, opacity: 0.7, color })); s.position.copy(at); s.scale.setScalar(0.4); scene.add(s); sparksArr.push({ s, v: new THREE.Vector3((Math.random() - 0.5) * 1.5, 0.8 + Math.random(), (Math.random() - 0.5) * 1.5), life: 0, max: 0.8 }); } };

  // ---- camera ----
  const camTarget = new THREE.Vector3(0, 0, 0);
  const cam = { back: o.camera?.back ?? (mobile ? 10 : 11), up: o.camera?.up ?? (mobile ? 12.5 : 12), lookDy: o.camera?.lookDy ?? -0.5, lead: o.camera?.lead ?? 0.25 };
  const resize = () => { const w = root.clientWidth || innerWidth, h = root.clientHeight || innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
  resize();
  const ro = new ResizeObserver(resize); ro.observe(root);

  // ---- controls ----
  const ctl: Controls = o.controls?.none
    ? { read: () => ({ x: 0, z: 0 }), action: false, onAction: null, destroy: () => { /* nothing mounted */ } }
    : mountControls(root, { touch: o.controls?.touch ?? mobile, mouseSteer: o.controls?.mouseSteer ?? !mobile, actionKeys: o.controls?.actionKeys });
  let actionFn: (() => void) | null = null;
  let tapFn: ((ndc: { x: number; y: number }, client: { x: number; y: number }) => void) | null = null;
  let tapStart: { id: number; x: number; y: number; t: number } | null = null;
  const onTapDown = (e: PointerEvent) => { if ((e.target as HTMLElement).closest('button, .mg-intro, .race-paused, .joy')) return; tapStart = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now() }; };
  const onTapUp = (e: PointerEvent) => { if (!tapStart || e.pointerId !== tapStart.id) return; const moved = Math.hypot(e.clientX - tapStart.x, e.clientY - tapStart.y), held = performance.now() - tapStart.t; tapStart = null; if (moved > 12 || held > 500 || paused || done || !startedFlag) return; const r = canvas.getBoundingClientRect(); tapFn?.({ x: ((e.clientX - r.left) / r.width) * 2 - 1, y: -((e.clientY - r.top) / r.height) * 2 + 1 }, { x: e.clientX, y: e.clientY }); };
  root.addEventListener('pointerdown', onTapDown); root.addEventListener('pointerup', onTapUp);
  ctl.onAction = () => { if (!intro.hidden) start(); else actionFn?.(); };
  const floatText = (x: number, y: number, z: number, text: string, cls = '') => {
    const v = new THREE.Vector3(x, y, z).project(camera);
    const d = el('span', `mg-float ${cls}`, text);
    d.style.left = `${(v.x * 0.5 + 0.5) * 100}%`; d.style.top = `${(-v.y * 0.5 + 0.5) * 100}%`;
    floats.append(d); setTimeout(() => d.remove(), 900);
  };

  // ---- pause / start / end ----
  let paused = false, done = false, finishedAt = 0, startedFlag = false, pendingResult: MiniResult | null = null;
  const play = (f: () => void) => { if (setup.sound) try { f(); } catch { /* no audio */ } };
  const togglePause = () => { if (done || !intro.hidden) return; paused = !paused; pauseOverlay.hidden = !paused; };
  pauseBtn.addEventListener('click', togglePause);
  resume.addEventListener('click', togglePause);
  quit.addEventListener('click', () => { destroy(); hooks.onQuit(); });
  restart.addEventListener('click', () => { destroy(); if (hooks.onRestart) hooks.onRestart(); else hooks.onQuit(); });
  const start = () => { if (intro.hidden) return; intro.hidden = true; startedFlag = true; o.onStart?.(); play(snd.go); count.textContent = 'GO!'; count.className = 'race-count go'; setTimeout(() => { if (count.textContent === 'GO!') { count.textContent = ''; count.className = 'race-count'; } }, 900); setTimeout(() => hint.classList.add('fade'), 4000); last = performance.now(); };
  const onKey = (e: KeyboardEvent) => { if (e.repeat) return; const k = e.key.toLowerCase(); if (k === 'escape' || k === 'p') togglePause(); };
  addEventListener('keydown', onKey);
  const onVis = () => { if (document.hidden && !paused && startedFlag && !done) togglePause(); };
  document.addEventListener('visibilitychange', onVis);
  const banner = (t: string, cls = '') => { bannerEl.textContent = t; bannerEl.className = `race-banner ${cls}`; void bannerEl.offsetWidth; bannerEl.classList.add('on'); setTimeout(() => bannerEl.classList.remove('on'), 1500); };
  const flash = (t: string, cls = '') => { count.textContent = t; count.className = `race-count ${cls}`; void count.offsetWidth; count.classList.add('pop'); };
  const warn = (n: number) => { if (n === 30) banner('30 seconds left!'); else if (n === 10) banner('10 seconds!', 'warn'); else if (n <= 3) flash(String(n)); play(n <= 3 ? snd.count : vac.tick); };
  let lastSec = -1, lastCombo = 1, lastScore = -1;
  const setScore = (n: number) => { if (n === lastScore) return; lastScore = n; scoreN.textContent = String(n); scoreEl.classList.remove('bump'); void scoreEl.offsetWidth; scoreEl.classList.add('bump'); };
  const setCount = (text: string, sub?: string) => { if (countN.textContent !== text) countN.textContent = text; if (sub !== undefined && countS.textContent !== sub) countS.textContent = sub; };
  const setTime = (left: number, w = left <= 10) => { const s = Math.ceil(left); if (s !== lastSec) { lastSec = s; timeN.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; timeEl.classList.toggle('warn', w && s > 0); } };
  const setCombo = (chain: number, mult: number, next: { at: number; mult: number } | null) => { if (chain > 1) { comboEl.classList.add('on'); comboN.textContent = `×${mult}`; comboS.textContent = next ? `${chain} in a row · ${next.at - chain} more for ×${next.mult}` : `${chain} in a row · MAX`; if (mult !== lastCombo) { comboEl.classList.remove('bump'); void comboEl.offsetWidth; comboEl.classList.add('bump'); } } else comboEl.classList.remove('on'); lastCombo = mult; };
  const finish = (r: MiniResult, flashText = 'TIME!') => { if (done || pendingResult) return; pendingResult = r; finishedAt = performance.now(); flash(flashText, 'go'); play(snd.finish); };

  // ---- the loop ----
  let raf = 0, last = performance.now(), acc = 0;
  const STEP = 1 / 120;
  const run = (step: (dt: number, input: { x: number; z: number }) => void, frame: (dt: number, now: number) => void) => {
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now;
      if (paused) return;
      if (!startedFlag) { renderer.render(scene, camera); return; }
      time.value += dt;
      if (!pendingResult) { const input = ctl.read(); acc += dt; while (acc >= STEP) { step(STEP, { x: input.x, z: input.z }); acc -= STEP; } }
      // particles
      for (let i = chipsArr.length - 1; i >= 0; i--) { const c = chipsArr[i]; c.life += dt; c.v.y -= 9 * dt; c.m.position.addScaledVector(c.v, dt); c.m.rotation.x += dt * 6; if (c.m.position.y < 0.02 || c.life > 1.6) { scene.remove(c.m); chipsArr.splice(i, 1); } }
      for (let i = sparksArr.length - 1; i >= 0; i--) { const c = sparksArr[i]; c.life += dt; c.v.y -= 3 * dt; c.s.position.addScaledVector(c.v, dt); (c.s.material as THREE.SpriteMaterial).opacity = Math.max(0, 1 - c.life / c.max); if (c.life > c.max) { scene.remove(c.s); sparksArr.splice(i, 1); } }
      frame(dt, now);
      camera.position.set(camTarget.x, cam.up, camTarget.z + cam.back);
      camera.lookAt(camTarget.x, o.camera?.lookY ?? 0.6, camTarget.z + cam.lookDy);
      sun.target.position.copy(camTarget);
      sun.position.set(camTarget.x - 14, 22, camTarget.z + 12);
      if (pendingResult && now - finishedAt > (o.outro ?? 1800)) { done = true; const r = pendingResult; destroy(); hooks.onFinish(r); return; }
      renderer.render(scene, camera);
    };
    requestAnimationFrame(() => { last = performance.now(); raf = requestAnimationFrame(tick); });
  };
  let destroyed = false;
  const destroy = () => {
    if (destroyed) return; destroyed = true;
    cancelAnimationFrame(raf);
    removeEventListener('keydown', onKey);
    root.removeEventListener('pointerdown', onTapDown); root.removeEventListener('pointerup', onTapUp);
    document.removeEventListener('visibilitychange', onVis);
    ro.disconnect(); ctl.destroy(); tips.destroy();
    scene.traverse((obj) => { if (obj instanceof THREE.Mesh) obj.geometry.dispose(); });
    env.dispose(); pmrem.dispose(); renderer.dispose(); renderer.forceContextLoss();
    root.remove();
  };
  return {
    root, hud, scene, camera, renderer, time, ctl, mobile, real, mats, sun, hemi, sky, ground: groundMesh, camTarget, cam, intro,
    started: () => startedFlag, paused: () => paused, play, tip: (k, t, ms) => tips.say(k, t, ms), banner, flash, float: floatText,
    setScore, setCount, setTime, setCombo, chips, sparks, puff, figure, walk, run, finish, warn, onAction: (f) => { actionFn = f; }, onTap: (f) => { tapFn = f; }, destroy, start,
  };
}

/** Points → a tier (1 gold … 4) from thresholds, and its word. */
export const TIER_WORDS = ['Gold', 'Silver', 'Bronze', 'Keep practising'];
export const PALS = PAL;
export { std, add, sfx, vac, snd };
