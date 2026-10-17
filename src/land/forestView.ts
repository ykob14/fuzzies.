/**
 * Forest Challenge — the 3D clearing, you and three town Fuzzies with axes, tap-to-walk, the chop meter, wood pick-ups,
 * the live standings and the HUD. Rules live in land/forestGame.ts; shared controls in ui/joystick.ts. A separate scene over
 * the town (the town's own forest is never touched); cleans up completely when it ends. Art follows ART.md.
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import * as M from '../game/models3d';
import * as T from '../game/textures3d';
import { race as snd, vac, sfx } from '../game/sound';
import { ForestSim, LIMIT, SWEET, SCORING, type Tree, type Wood, type Jack, type RivalSetup, type Standing } from './forestGame';
import { PAL, std, add } from './models';
import { buildSky, treeModel, leafMaterial } from './environment';
import * as O from './games/orchardArt';
import { groundTex, treeRing } from './games/sceneArt';
import { glbFuzzy, glbReady } from '../game/fuzzyGlb';
import { mountControls, lockPage } from '../ui/joystick';
import { ico, setHint, pauseCard } from './gameHud';
import { introCard, coach as makeCoach } from '../ui/mgIntro';
import { adventure } from './adventures';

export interface ForestSetup { mobile: boolean; sound: boolean; deluxe?: boolean; you: { name: string; skin: [string, string] }; host: string; variant?: string | null; seed: number; rivals?: RivalSetup[] }
export interface ForestResult { place: number; score: number; timeMs: number; wood: number; cleared: number; total: number; perfect: number; bestCombo: number; tier: string; standings: Standing[] }
export interface ForestHooks { onFinish: (r: ForestResult) => void; onQuit: () => void; onRestart?: () => void }

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, text = ''): HTMLElementTagNameMap[K] => { const e = document.createElement(tag); e.className = cls; if (text) e.textContent = text; return e; };
const lerp = THREE.MathUtils.lerp;

function axeModel(): THREE.Group {
  const g = new THREE.Group();
  add(g, new THREE.CylinderGeometry(0.035, 0.045, 1.0, 10).translate(0, 0.5, 0), std('#b58a5a', 0.9), 0, 0, 0, false);
  const head = new THREE.Group();
  add(head, new THREE.BoxGeometry(0.34, 0.26, 0.09), std('#8a8f99', 0.35, 0.7), 0.1, 0, 0, false);
  add(head, new THREE.BoxGeometry(0.1, 0.3, 0.1), std('#5c6068', 0.5, 0.5), -0.05, 0, 0, false);
  head.position.y = 0.92;
  g.add(head);
  return g;
}

/** A little name pill floating over a lumberjack's head. */
function nameLabel(text: string, color: string): THREE.Sprite {
  const c = document.createElement('canvas'); c.width = 256; c.height = 72;
  const g = c.getContext('2d')!;
  g.font = '700 34px Fredoka, "Arial Rounded MT Bold", system-ui, sans-serif';
  const w = Math.min(240, g.measureText(text).width + 40);
  g.fillStyle = 'rgba(255,250,240,0.94)';
  g.beginPath(); g.roundRect((256 - w) / 2, 8, w, 56, 28); g.fill();
  g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 128, 37);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sp.scale.set(1.7, 0.48, 1);
  return sp;
}

export function runForest(stage: HTMLElement, setup: ForestSetup, hooks: ForestHooks): void {
  const mobile = setup.mobile;
  const sim = new ForestSim(setup.variant === 'deep' ? 'deep' : 'classic', setup.seed, setup.rivals ?? []);
  const contest = sim.rivals.length > 0;

  // ---- DOM ----
  const root = el('div', 'forest mg');
  const canvas = document.createElement('canvas'); canvas.className = 'race-canvas';
  const hud = el('div', 'race-hud forest-hud mg-hud');
  const scoreEl = el('div', 'race-lap mg-score'); const scoreN = el('b', '', '0'); scoreEl.append(el('small', '', 'SCORE'), scoreN);
  const woodEl = el('div', 'race-pos mg-count'); const woodN = el('b', '', '0'); const treesN = el('small', 'forest-trees', '0 trees'); woodEl.append(el('small', '', 'WOOD'), woodN, treesN);
  const timeEl = el('div', 'race-time forest-time mg-time'); const sunIc = el('span', 'forest-sun'); sunIc.append(ico('sun', 22)); const timeN = el('span', '', '2:00'); timeEl.append(sunIc, timeN);
  const comboEl = el('div', 'mg-combo'); const comboN = el('b', '', '×1'); const comboS = el('small', ''); comboEl.append(comboN, comboS);
  const pauseBtn = el('button', 'race-pause'); pauseBtn.type = 'button'; pauseBtn.setAttribute('aria-label', 'Pause');
  const banner = el('div', 'race-banner');
  const count = el('div', 'race-count');
  const floats = el('div', 'mg-floats');
  const hint = el('div', 'race-hint');
  setHint(hint, mobile ? [{ text: 'Tap a tree to walk there' }, { text: 'CHOP in the green' }] : [{ text: 'Click a tree' }, { keys: ['W', 'A', 'S', 'D'], text: 'Walk' }, { keys: ['Space'], text: 'Chop' }]);
  // the live standings
  const board = el('div', 'forest-board'); board.hidden = !contest;
  const rows = new Map<number, { el: HTMLElement; pl: HTMLElement; sc: HTMLElement }>();
  for (const j of sim.jacks) { const r = el('div', `forest-row ${j.you ? 'you' : ''}`); const pl = el('small', '', '1'); const dot = el('i', ''); dot.style.background = j.skin[0]; const nm = el('b', '', j.you ? 'You' : j.name); const sc = el('span', '', '0'); r.append(pl, dot, nm, sc); board.append(r); rows.set(j.id, { el: r, pl, sc }); }
  hud.append(scoreEl, woodEl, timeEl, comboEl, board, pauseBtn, banner, count, hint, floats);
  const adv = adventure('forest')!;
  const rivalNames = sim.rivals.map((r) => r.name);
  const against = rivalNames.length ? `You’re up against ${rivalNames.length === 1 ? rivalNames[0] : rivalNames.slice(0, -1).join(', ') + ' and ' + rivalNames[rivalNames.length - 1]} — most points when the sun sets wins.` : undefined;
  const intro = introCard({ adv, variant: setup.variant ? adv.variants?.[setup.variant] ?? null : null, host: setup.host, mobile, buttonLabel: 'Let’s chop!', onStart: () => start(), onBack: () => quit.click(), extra: against });
  // the chop meter + button
  const meterWrap = el('div', 'forest-meter'); meterWrap.hidden = true;
  const meterBar = el('div', 'forest-meter-bar'); const sweet = el('i', 'forest-meter-sweet'); const marker = el('b', 'forest-meter-marker');
  sweet.style.left = `${SWEET.lo * 100}%`; sweet.style.width = `${(SWEET.hi - SWEET.lo) * 100}%`;
  meterBar.append(sweet, marker);
  const chopBtn = el('button', 'forest-chop'); chopBtn.type = 'button'; const chopLbl = el('span', '', 'CHOP'); const chopBonus = el('em', 'forest-chop-x', '×1.5'); chopBonus.hidden = true; chopBtn.append(ico('axe', 30), chopLbl, chopBonus);
  const hitEl = el('div', 'forest-hit');
  const hpEl = el('div', 'forest-hp'); const hpFill = el('i', ''); hpEl.append(hpFill);
  meterWrap.append(hpEl, meterBar, chopBtn, hitEl);
  const { overlay: pauseOverlay, resume, restart, quit } = pauseCard({});
  root.append(canvas, el('div', 'mg-vignette'), hud, meterWrap, intro, pauseOverlay);
  stage.append(root);
  const unlockPage = lockPage(root); // phones: a drag steers the game, never the page behind it
  const tips = makeCoach(root);

  // ---- renderer & scene ----
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !mobile, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = env.texture; scene.environmentIntensity = 0.4; renderer.toneMappingExposure = 1.05;
  const camera = new THREE.PerspectiveCamera(mobile ? 44 : 36, 1, 0.3, 300);
  const sun = new THREE.DirectionalLight(0xfff1dc, 2.4);
  sun.position.set(-14, 22, 12); sun.castShadow = true;
  Object.assign(sun.shadow.camera, { left: -18, right: 18, top: 18, bottom: -18, near: 2, far: 80 });
  sun.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
  // a warm rim light from behind lifts the Fuzzies and trunks off the grass
  const rim = new THREE.DirectionalLight(0xffe2b8, 0.8); rim.position.set(7, 8, -14); scene.add(rim);
  const hemi = new THREE.HemisphereLight(0xdff0ff, 0x6a8a4a, 0.75);
  scene.add(sun, sun.target, hemi);
  const sky = buildSky(); sky.position.set(0, 0, 0); sky.scale.setScalar(0.6); scene.add(sky); // the dome is built for the island; re-centre it and keep it inside the far plane
  const skyMat = sky.material as THREE.ShaderMaterial;
  const skyTop0 = (skyMat.uniforms.uTop.value as THREE.Color).clone(), skyHor0 = (skyMat.uniforms.uHorizon.value as THREE.Color).clone();
  scene.fog = new THREE.Fog('#cfe6ee', 45, 130);
  const time = { value: 0 };
  // ground: a painted lawn (soft light/shade baked into vertex colours, flat so nothing pokes through), a dirt path across
  // the start, the shared tree line beyond the clearing (never part of the game), a picket fence, flowers and swaying tufts
  const { hw, hd } = sim.you.o.bounds;
  const ground = new THREE.PlaneGeometry(100, 100, 50, 50).rotateX(-Math.PI / 2);
  const gp = ground.attributes.position, gc = new Float32Array(gp.count * 3);
  for (let i = 0; i < gp.count; i++) {
    const x = gp.getX(i), z = gp.getZ(i);
    const k = 0.9 + Math.sin(x * 0.21 + 1) * Math.cos(z * 0.17) * 0.07 + Math.sin(x * 0.07 - z * 0.05) * 0.05;
    gc.set([k * 1.02, k, k * 0.96], i * 3);
  }
  ground.setAttribute('color', new THREE.BufferAttribute(gc, 3)); ground.computeVertexNormals();
  const gTex = groundTex('grass'); gTex.repeat.set(25, 25);
  const groundMesh = new THREE.Mesh(ground, new THREE.MeshStandardMaterial({ map: gTex, vertexColors: true, roughness: 0.95 }));
  groundMesh.receiveShadow = true; scene.add(groundMesh);
  { const pt = O.pathTex(); pt.repeat.set(5, 1); const lane = new THREE.Mesh(new THREE.PlaneGeometry(15, 2.6).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: pt, transparent: true, depthWrite: false, roughness: 0.95 })); lane.position.set(0, 0.012, 6); lane.receiveShadow = true; scene.add(lane); }
  const rr = T.rng(setup.seed);
  {
    const n = mobile ? 28 : 44; const spots: { x: number; z: number; s: number }[] = [];
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + (rr() - 0.5) * 0.12; const r = 1 + (i % 5) * 0.3 + rr() * 0.15; spots.push({ x: Math.cos(a) * (hw + 4) * r, z: Math.sin(a) * (hd + 4) * r, s: 1.05 + (i % 3) * 0.25 + rr() * 0.15 }); }
    scene.add(treeRing(spots.filter((_, i) => i % 3 !== 2), 'leafy', { leaves: mobile ? 40 : 60 }), treeRing(spots.filter((_, i) => i % 3 === 2), 'pine'));
  }
  for (const sz of [-1, 1]) scene.add(O.fence(-hw, hw, sz * hd));
  for (const sx of [-1, 1]) { const f = O.fence(-hd, hd, 0); f.rotation.y = Math.PI / 2; f.position.x = sx * hw; scene.add(f); }
  { const tf: { x: number; z: number; s: number }[] = []; for (let i = 0; tf.length < (mobile ? 150 : 260) && i < 3000; i++) { const x = (rr() - 0.5) * (hw * 2 + 16), z = (rr() - 0.5) * (hd * 2 + 16); if (Math.abs(x) < hw + 0.3 && Math.abs(z) < hd + 0.3) continue; tf.push({ x, z, s: 0.6 + rr() * 0.6 }); } scene.add(O.grassTufts(tf, time)); }
  for (let i = 0; i < 5; i++) { const c = O.cloud(i + 11); c.position.set((i - 2) * 22 + (rr() - 0.5) * 8, 16 + (i % 3) * 3, -55 - (i % 2) * 10); c.scale.multiplyScalar(1.5 + (i % 3) * 0.3); scene.add(c); }
  scene.add(O.hills());
  // flowers and mushrooms
  { const fl: { x: number; z: number; kind: number }[] = []; for (let i = 0; i < (mobile ? 16 : 30); i++) fl.push({ x: (rr() - 0.5) * hw * 2, z: (rr() - 0.5) * hd * 2, kind: (rr() * 3) | 0 }); scene.add(O.flowers(fl)); }
  for (let i = 0; i < 8; i++) { const m = new THREE.Group(); add(m, new THREE.CylinderGeometry(0.06, 0.08, 0.22, 8), std('#fff4e3', 0.9), 0, 0.11, 0, false); add(m, new THREE.SphereGeometry(0.16, 10, 8), std(PAL.raspberry, 0.7), 0, 0.26, 0, false).scale.y = 0.6; m.position.set((rr() - 0.5) * hw * 1.8, 0, (rr() - 0.5) * hd * 1.8); scene.add(m); }
  // the game trees
  const fadeLeaf = leafMaterial(time).clone(); fadeLeaf.onBeforeCompile = leafMaterial(time).onBeforeCompile; fadeLeaf.transparent = true; fadeLeaf.opacity = 0.3; fadeLeaf.depthWrite = false;
  type Node = { tree: Tree; g: THREE.Group; ring?: THREE.Mesh; glow?: THREE.Sprite; spark?: THREE.Sprite; falling: number; fallDir: number; stump?: THREE.Mesh; rib?: THREE.Mesh; rise: number };
  const ringGeo = new THREE.TorusGeometry(1, 0.07, 10, 48).rotateX(-Math.PI / 2);
  const ringMat = new THREE.MeshBasicMaterial({ color: PAL.raspberry, transparent: true, opacity: 0.9 });
  const ringTargetMat = new THREE.MeshBasicMaterial({ color: '#ffc94a', transparent: true, opacity: 1 });
  const glowTex = T.glow('rgba(255,140,190,0.9)', 'rgba(255,140,190,0)');
  const sparkTex = T.glow('rgba(255,230,120,1)', 'rgba(255,230,120,0)');
  const nodes: Node[] = sim.trees.map((t) => {
    const g = treeModel(t.seed, time, t.scale * 0.85);
    g.position.set(t.x, 0, t.z); g.rotation.y = t.seed;
    scene.add(g);
    return { tree: t, g, falling: -1, fallDir: 0, rise: 1 };
  });
  const markNode = (n: Node, rise = false) => {
    if (n.ring) return;
    const t = n.tree;
    const ring = new THREE.Mesh(ringGeo, ringMat); ring.position.set(t.x, 0.05, t.z); ring.scale.setScalar(0.9 + t.scale * 0.3); scene.add(ring); n.ring = ring;
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, opacity: 0.6 })); glow.position.set(t.x, 0.3, t.z); glow.scale.setScalar(2.4 + t.scale); scene.add(glow); n.glow = glow;
    const rib = new THREE.Mesh(new THREE.TorusGeometry(0.14 * t.scale, 0.03, 8, 24).rotateX(Math.PI / 2), std(PAL.raspberry, 0.6)); rib.position.set(t.x, 0.55 * t.scale, t.z); scene.add(rib); n.rib = rib;
    if (t.bonus) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: sparkTex, transparent: true, depthWrite: false, opacity: 0.9 })); sp.position.set(t.x, 1.6 * t.scale, t.z); sp.scale.setScalar(1.2); scene.add(sp); n.spark = sp; }
    if (rise) n.rise = 0;
  };
  for (const n of nodes) if (n.tree.marked) markNode(n);
  // the gold ring under whatever tree you'd chop now (any tree), the tap marker, and a small ring per rival on its tree
  const targetRing = new THREE.Mesh(ringGeo, ringTargetMat); targetRing.position.y = 0.06; targetRing.visible = false; scene.add(targetRing);
  const tapMark = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.9 })); tapMark.position.y = 0.04; tapMark.visible = false; scene.add(tapMark);
  let tapLife = -1;
  // ---- the lumberjacks: you + the rivals ----
  const mats = { fur: T.furStrands() } as unknown as M.Mats;
  const real = !!setup.deluxe && glbReady();
  type Figure = { jack: Jack; group: THREE.Group; fuzzy: ReturnType<typeof M.makeFuzzy>; axe: THREE.Group; swing: number; squash: number; claim: THREE.Mesh };
  const makeFigure = (jack: Jack, skin: [string, string]): Figure => {
    const fuzzy = real ? glbFuzzy(skin, 0.34, { shadow: !mobile }) : M.makeFuzzy(mats, skin, 0.3, 0.09, mobile ? 6 : 9);
    const group = new THREE.Group();
    fuzzy.group.position.y = real ? 0.4 : 0.34;
    const axe = axeModel(); axe.scale.setScalar(0.9); axe.position.set(0.3, 0.22, -0.12); axe.rotation.set(-0.75, 0, -0.45); // carried over the shoulder
    group.add(fuzzy.group, axe);
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.5, 20).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: T.glow('rgba(0,0,0,0.45)', 'rgba(0,0,0,0)'), transparent: true, depthWrite: false })); shadow.position.y = 0.02; group.add(shadow);
    const label = nameLabel(jack.you ? 'You' : jack.name, jack.you ? PAL.raspberry : skin[1]); label.position.y = 1.55; group.add(label);
    scene.add(group);
    const claim = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: skin[0], transparent: true, opacity: 0.85 })); claim.position.y = 0.07; claim.visible = false; scene.add(claim);
    return { jack, group, fuzzy, axe, swing: -1, squash: 0, claim };
  };
  const figures = sim.jacks.map((j) => makeFigure(j, j.you ? setup.you.skin : j.skin));
  const me = figures[0];
  const fuzzy = me.fuzzy, player = me.group, axe = me.axe;
  // chips, wood pieces, sparkles
  const chipMat = std('#d9b27a', 0.9);
  const chips: { m: THREE.Mesh; v: THREE.Vector3; life: number }[] = [];
  const chip = (at: THREE.Vector3, n: number) => { for (let i = 0; i < n; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.12), chipMat); m.position.copy(at); m.rotation.set(Math.random() * 3, Math.random() * 3, 0); scene.add(m); chips.push({ m, v: new THREE.Vector3((Math.random() - 0.5) * 3, 2 + Math.random() * 2, (Math.random() - 0.5) * 3), life: 0 }); } };
  const logGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.42, 10).rotateZ(Math.PI / 2);
  const logMat = std('#b58a5a', 0.9), goldLog = new THREE.MeshStandardMaterial({ color: '#ffd34a', roughness: 0.35, metalness: 0.6, emissive: '#6b4a00', emissiveIntensity: 0.4 });
  const woods = new Map<number, { m: THREE.Mesh; w: Wood; got: number; glow?: THREE.Sprite }>();
  const sparkMat = new THREE.SpriteMaterial({ map: sparkTex, transparent: true, depthWrite: false, opacity: 0.9 });
  const sparks: { s: THREE.Sprite; v: THREE.Vector3; life: number }[] = [];
  const spark = (at: THREE.Vector3, n: number) => { for (let i = 0; i < n; i++) { const s = new THREE.Sprite(sparkMat); s.position.copy(at); s.scale.setScalar(0.3); scene.add(s); sparks.push({ s, v: new THREE.Vector3((Math.random() - 0.5) * 3, 1.5 + Math.random() * 2.5, (Math.random() - 0.5) * 3), life: 0 }); } };
  /** a tree starts falling (away from whoever cut it) and loses its decorations */
  const fellNode = (n: Node, fromX: number) => {
    n.falling = 0; n.fallDir = Math.sign(n.tree.x - fromX) || 1;
    for (const o of [n.ring, n.glow, n.rib, n.spark]) if (o) scene.remove(o);
    n.ring = undefined; n.glow = undefined; n.rib = undefined; n.spark = undefined;
  };

  // ---- camera: a fixed three-quarter view following the Fuzzy ----
  const camTarget = new THREE.Vector3(sim.you.pos.x, 0, sim.you.pos.z);
  const CAM = mobile ? { back: 10, up: 12.5 } : { back: 11, up: 12 };
  const resize = () => { const w = root.clientWidth || innerWidth, h = root.clientHeight || innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
  resize();
  const ro = new ResizeObserver(resize); ro.observe(root);

  // ---- controls ----
  const ctl = mountControls(root, { touch: mobile, mouseSteer: !mobile });
  ctl.onAction = () => { if (!intro.hidden) start(); else doChop(); };
  chopBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); doChop(); });
  // tap-to-walk: a short tap (no drag) on the clearing sends the Fuzzy to that tree or spot; tapping the tree you're at chops it
  const ray = new THREE.Raycaster(), groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), trunkPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -1.3), hit = new THREE.Vector3();
  let tap: { x: number; y: number; t: number; id: number } | null = null;
  const tapAt = (cx: number, cy: number): void => {
    const r = canvas.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1), camera);
    // a tap lands on the ground — or on a trunk/canopy, so try a plane at trunk height too
    let tree: Tree | null = null, gx = 0, gz = 0;
    if (ray.ray.intersectPlane(trunkPlane, hit)) tree = sim.treeAt(hit.x, hit.z);
    if (ray.ray.intersectPlane(groundPlane, hit)) { gx = hit.x; gz = hit.z; tree = tree ?? sim.treeAt(gx, gz); } else if (!tree) return;
    if (tree) { if (tree.id === sim.target) { doChop(); return; } sim.goToTree(tree.id); play(sfx.hop); }
    else sim.goTo(gx, gz);
  };
  const onTapDown = (e: PointerEvent) => { if ((e.target as HTMLElement).closest('button, .forest-meter, .race-paused, .mg-intro, .joy')) return; tap = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId }; };
  const onTapUp = (e: PointerEvent) => { if (!tap || e.pointerId !== tap.id) return; const moved = Math.hypot(e.clientX - tap.x, e.clientY - tap.y), held = performance.now() - tap.t; tap = null; if (moved > 12 || held > 500 || paused || sim.state !== 'playing' || !intro.hidden) return; tapAt(e.clientX, e.clientY); };
  root.addEventListener('pointerdown', onTapDown);
  root.addEventListener('pointerup', onTapUp);
  const floatText = (x: number, y: number, z: number, text: string, cls = '') => {
    const v = new THREE.Vector3(x, y, z).project(camera);
    const d = el('span', `mg-float ${cls}`, text);
    d.style.left = `${(v.x * 0.5 + 0.5) * 100}%`; d.style.top = `${(-v.y * 0.5 + 0.5) * 100}%`;
    floats.append(d); setTimeout(() => d.remove(), 900);
  };
  const doChop = () => {
    if (paused || sim.state !== 'playing' || sim.target === null) return;
    const r = sim.chop();
    if (!r) return;
    const n = nodes[r.tree.id];
    me.swing = 0;
    hitEl.textContent = r.hit === 'perfect' ? 'PERFECT!' : r.hit === 'good' ? 'Nice hit' : 'Weak…';
    hitEl.className = `forest-hit on ${r.hit}`; setTimeout(() => hitEl.classList.remove('on'), 650);
    const trunkAt = new THREE.Vector3(n.tree.x, 0.6 * n.tree.scale, n.tree.z);
    chip(trunkAt, r.hit === 'perfect' ? 8 : 4);
    play(() => { sfx.build(); if (r.hit === 'perfect') sfx.collect(); });
    n.g.userData.shake = r.hit === 'perfect' ? 0.12 : 0.06;
    if (r.felled) {
      fellNode(n, sim.you.pos.x);
      play(() => { snd.bump(); setTimeout(() => sfx.gold(), 500); });
      if (n.tree.bonus) { spark(new THREE.Vector3(n.tree.x, 1.5, n.tree.z), 14); play(vac.gold); }
    }
  };

  // ---- pause / start ----
  let paused = false, done = false, finishedAt = 0;
  const togglePause = () => { if (done || !intro.hidden) return; paused = !paused; pauseOverlay.hidden = !paused; };
  pauseBtn.addEventListener('click', togglePause);
  resume.addEventListener('click', togglePause);
  quit.addEventListener('click', () => { destroy(); hooks.onQuit(); });
  restart.addEventListener('click', () => { destroy(); if (hooks.onRestart) hooks.onRestart(); else hooks.onQuit(); });
  const start = () => { if (!intro.hidden) { intro.hidden = true; sim.start(); play(snd.go); count.textContent = 'GO!'; count.className = 'race-count go'; setTimeout(() => { count.textContent = ''; count.className = 'race-count'; }, 900); setTimeout(() => hint.classList.add('fade'), 4000); setTimeout(() => tips.say('walk', mobile ? 'Tap any tree and your Fuzzy walks there — ringed ones pay extra' : 'Click any tree and your Fuzzy walks there — ringed ones pay extra'), 1200); } };
  const onKey = (e: KeyboardEvent) => { if (e.repeat) return; const k = e.key.toLowerCase(); if (k === 'escape' || k === 'p') togglePause(); };
  addEventListener('keydown', onKey);
  const onVis = () => { if (document.hidden && !paused && sim.state === 'playing') togglePause(); };
  document.addEventListener('visibilitychange', onVis);
  const play = (f: () => void) => { if (setup.sound) try { f(); } catch { /* no audio */ } };
  const flashBanner = (t: string, cls = '') => { banner.textContent = t; banner.className = `race-banner ${cls}`; void banner.offsetWidth; banner.classList.add('on'); setTimeout(() => banner.classList.remove('on'), 1500); };

  // ---- loop ----
  let raf = 0, last = performance.now(), acc = 0, lastSec = -1, lastCombo = 1, lastTarget: number | null = null, lastOrder = '';
  const dusk = new THREE.Color('#ff9f6a'), duskHor = new THREE.Color('#ffd1a6'), night = new THREE.Color('#5a4b8a');
  const tick = (now: number) => {
    raf = requestAnimationFrame(tick);
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now;
    if (paused) return;
    time.value += dt;
    const input = ctl.read();
    acc += dt;
    while (acc >= 1 / 120) {
      sim.step(1 / 120, { x: input.x, z: input.z });
      acc -= 1 / 120;
      for (const e of sim.events) {
        if (e.kind === 'felled' && e.tree) { tips.say('wood', 'Timber! Walk over the wood pieces to collect them'); floatText(e.tree.x, 2.2 * e.tree.scale, e.tree.z, `+${e.value}${(e.mult ?? 1) > 1 ? ` ×${e.mult}` : ''}`, e.tree.bonus ? 'gold' : 'big'); flashBanner(e.tree.bonus ? `Bonus tree! +${SCORING.bonusPoints}` : e.tree.marked ? 'Timber! Ringed tree ×1.5' : 'Timber!', e.tree.bonus || e.tree.marked ? 'combo' : ''); }
        else if (e.kind === 'pick' && e.wood) { floatText(e.wood.x, 0.8, e.wood.z, `+${e.value}`, e.wood.gold ? 'gold' : ''); const n = woods.get(e.wood.id); if (n) n.got = 0; play(e.wood.gold ? sfx.gold : sfx.collect); me.squash = 0.4; }
        else if (e.kind === 'wave') { flashBanner(`New rings — wave ${e.n}!`, 'combo'); tips.say('wave', 'New rings further out — ringed trees pay ×1.5, big ones score most'); play(sfx.level); for (const n of nodes) if (n.tree.marked && !n.ring && !n.tree.felled) markNode(n, true); }
        else if (e.kind === 'combo') { flashBanner(`×${e.mult} PERFECT CHAIN!`, 'combo'); play(() => vac.combo(e.n ?? 1)); }
        else if (e.kind === 'warn') { if (e.n === 30) flashBanner('30 seconds — the sun is setting!'); else if (e.n === 10) flashBanner('10 seconds!', 'warn'); else if (e.n! <= 3) { count.textContent = String(e.n); count.className = 'race-count'; void count.offsetWidth; count.classList.add('pop'); } play(e.n! <= 3 ? snd.count : vac.tick); }
        else if (e.kind === 'bump') { play(vac.bump); me.squash = 0.5; }
        else if (e.kind === 'target' && e.tree) { play(sfx.hop); tips.say('chop', mobile ? 'Tap CHOP (or the tree) when the marker is in the green — big ones take more hits' : 'Press Space (or click the tree) when the marker is in the green — big ones take more hits'); }
        else if (e.kind === 'goal' && e.at) { tapMark.position.set(e.at.x, 0.04, e.at.z); tapMark.visible = true; tapLife = 0; }
        else if (e.kind === 'taken' && e.who) { tips.say('taken', `${e.who.name}’s already on that one — pick another tree`, 2600); flashBanner(`${e.who.name} got there first!`, 'warn'); }
        else if (e.kind === 'rivalChop' && e.who && e.tree) { const f = figures[e.who.id]; if (f) f.swing = 0; const n = nodes[e.tree.id]; n.g.userData.shake = 0.07; chip(new THREE.Vector3(e.tree.x, 0.6 * e.tree.scale, e.tree.z), 3); }
        else if (e.kind === 'rivalFell' && e.who && e.tree) { fellNode(nodes[e.tree.id], e.who.mover.pos.x); floatText(e.tree.x, 2.2 * e.tree.scale, e.tree.z, `${e.who.name} +${e.value}`, 'rival'); play(snd.bump); }
        else if (e.kind === 'lead' && e.who) { flashBanner(e.who.you ? 'You take the lead!' : `${e.who.name} takes the lead!`, e.who.you ? 'combo' : ''); if (!e.who.you) tips.say('lead', 'Ringed and big trees are the quickest way back to the top'); }
      }
    }
    // the day goes by: the sun sinks and warms, the sky turns to dusk
    const k = sim.clock.k;
    sun.position.set(camTarget.x - 14 + k * 10, 22 - k * 15, camTarget.z + 12);
    sun.intensity = 2.4 - k * 1.0; sun.color.copy(new THREE.Color(0xfff1dc)).lerp(dusk, k * 0.8);
    (skyMat.uniforms.uTop.value as THREE.Color).copy(skyTop0).lerp(night, k * 0.5);
    (skyMat.uniforms.uHorizon.value as THREE.Color).copy(skyHor0).lerp(duskHor, k * 0.9);
    hemi.intensity = 0.75 - k * 0.25;
    sunIc.style.transform = `translateY(${k * 6}px)`;
    // the lumberjacks: waddle while walking, squash on bumps, swing the axe
    for (const f of figures) {
      const m = f.jack.mover;
      f.squash = lerp(f.squash, 0, Math.min(1, dt * 8));
      f.group.position.set(m.pos.x, 0, m.pos.z);
      f.group.rotation.y = m.heading;
      const spK = m.speed / m.o.max;
      f.fuzzy.group.position.y = (real ? 0.4 : 0.34) + Math.abs(Math.sin(time.value * 11 + f.jack.id)) * 0.08 * spK;
      f.fuzzy.body.rotation.z = Math.sin(time.value * 11 + f.jack.id) * 0.1 * spK;
      f.fuzzy.body.scale.set(1 + f.squash * 0.18, 1 - f.squash * 0.22, 1 + f.squash * 0.18);
      const busy = f.jack.you ? sim.target !== null : f.jack.target !== null && sim.trees[f.jack.target]?.by === f.jack.id;
      if (f.swing >= 0) { f.swing += dt; const k2 = Math.min(1, f.swing / 0.28); f.axe.rotation.x = -0.75 + Math.sin(k2 * Math.PI) * 2.1; f.axe.rotation.z = -0.45 - Math.sin(k2 * Math.PI) * 0.5; if (f.swing > 0.5) f.swing = -1; }
      else { f.axe.rotation.x = -0.75 + Math.sin(time.value * 2 + f.jack.id) * 0.05 + (busy ? 0.5 : 0); f.axe.rotation.z = -0.45; }
      // a rival's ring sits under the tree it's cutting
      if (!f.jack.you) { const tid = f.jack.target; const t = tid !== null ? sim.trees[tid] : null; const on = !!t && t.by === f.jack.id && !t.felled; f.claim.visible = on; if (on && t) { f.claim.position.set(t.x, 0.07, t.z); const s = 0.75 + t.scale * 0.3; f.claim.scale.set(s, 1, s); } }
    }
    // face the target tree while in reach
    if (sim.target !== null) { const t = sim.trees[sim.target]; const want = Math.atan2(t.x - sim.you.pos.x, t.z - sim.you.pos.z); if (sim.you.speed < 1) player.rotation.y = lerp(player.rotation.y, player.rotation.y + Math.atan2(Math.sin(want - player.rotation.y), Math.cos(want - player.rotation.y)), Math.min(1, dt * 8)); }
    // the gold ring under your target, the tap marker
    if (sim.target !== null) { const t = sim.trees[sim.target]; targetRing.visible = true; targetRing.position.set(t.x, 0.06, t.z); const s = (0.9 + t.scale * 0.3) * (1 + Math.sin(time.value * 5) * 0.05); targetRing.scale.set(s, 1, s); } else targetRing.visible = false;
    if (tapLife >= 0) { tapLife += dt; const s = 0.5 + tapLife * 1.2; tapMark.scale.set(s, 1, s); (tapMark.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.9 - tapLife * 1.1); if (tapLife > 0.85) { tapLife = -1; tapMark.visible = false; } }
    // trees: rings pulse, new waves rise, shakes, falling
    for (const n of nodes) {
      if (n.rise < 1) { n.rise = Math.min(1, n.rise + dt * 2); const s = n.rise; if (n.ring) n.ring.scale.setScalar((0.9 + n.tree.scale * 0.3) * s); }
      if (n.ring) { const s = (0.9 + n.tree.scale * 0.3) * (1 + Math.sin(time.value * 3 + n.tree.id) * 0.06) * n.rise; n.ring.scale.set(s, 1, s); n.ring.visible = n.tree.id !== sim.target; }
      if (n.glow) (n.glow.material as THREE.SpriteMaterial).opacity = 0.45 + Math.sin(time.value * 3 + n.tree.id) * 0.2;
      if (n.spark) { n.spark.position.y = 1.6 * n.tree.scale + Math.sin(time.value * 4 + n.tree.id) * 0.15; (n.spark.material as THREE.SpriteMaterial).opacity = 0.6 + Math.sin(time.value * 7 + n.tree.id) * 0.35; }
      const sh = (n.g.userData.shake as number) ?? 0;
      if (sh > 0.001) { n.g.rotation.z = Math.sin(time.value * 40) * sh; n.g.userData.shake = sh * Math.pow(0.02, dt); } else if (n.falling < 0) n.g.rotation.z = 0;
      if (n.falling >= 0) {
        n.falling += dt;
        const f = Math.min(1, n.falling / 1.1);
        const e = f * f * (3 - 2 * f);
        n.g.rotation.z = -n.fallDir * e * (Math.PI / 2 - 0.08);
        if (n.falling > 1.3) {
          scene.remove(n.g); n.falling = -2;
          const stump = new THREE.Mesh(new THREE.CylinderGeometry(0.13 * n.tree.scale, 0.16 * n.tree.scale, 0.18, 10), std('#b58a5a', 0.95)); stump.position.set(n.tree.x, 0.09, n.tree.z); scene.add(stump); n.stump = stump;
          chip(new THREE.Vector3(n.tree.x, 0.3, n.tree.z), 6);
        }
      }
    }
    // wood pieces: fly out with the rules, lie on the ground, fly to the Fuzzy when picked up
    const you = sim.you;
    for (const w of sim.woods) {
      let n = woods.get(w.id);
      if (!n) { if (w.state === 'got') continue; const m = new THREE.Mesh(logGeo, w.gold ? goldLog : logMat); m.castShadow = !mobile; scene.add(m); n = { m, w, got: -1 }; if (w.gold) { const gl = new THREE.Sprite(sparkMat.clone()); gl.scale.setScalar(0.9); scene.add(gl); n.glow = gl; } woods.set(w.id, n); }
      if (n.got >= 0) {
        n.got += dt;
        const kk = Math.min(1, n.got / 0.3);
        n.m.position.lerp(new THREE.Vector3(you.pos.x, 0.7, you.pos.z), Math.min(1, dt * 14));
        n.m.scale.setScalar(1 - kk * 0.9);
        if (n.glow) n.glow.position.copy(n.m.position);
        if (kk >= 1) { scene.remove(n.m); if (n.glow) scene.remove(n.glow); woods.delete(w.id); }
        continue;
      }
      n.m.position.set(w.x, 0.09 + w.y, w.z);
      n.m.rotation.y = w.id * 1.7 + (w.state === 'flying' ? w.age * 8 : 0);
      n.m.rotation.x = w.state === 'flying' ? w.age * 6 : 0;
      if (n.glow) { n.glow.position.set(w.x, 0.35 + w.y, w.z); (n.glow.material as THREE.SpriteMaterial).opacity = 0.5 + Math.sin(time.value * 6) * 0.3; }
    }
    // chips & sparks
    for (let i = chips.length - 1; i >= 0; i--) { const c = chips[i]; c.life += dt; c.v.y -= 9 * dt; c.m.position.addScaledVector(c.v, dt); c.m.rotation.x += dt * 6; if (c.m.position.y < 0.02 || c.life > 1.6) { scene.remove(c.m); chips.splice(i, 1); } }
    for (let i = sparks.length - 1; i >= 0; i--) { const c = sparks[i]; c.life += dt; c.v.y -= 3 * dt; c.s.position.addScaledVector(c.v, dt); (c.s.material as THREE.SpriteMaterial).opacity = Math.max(0, 1 - c.life / 1.2); if (c.life > 1.2) { scene.remove(c.s); sparks.splice(i, 1); } }
    // camera follows
    camTarget.lerp(new THREE.Vector3(you.pos.x + you.vel.x * 0.25, 0, you.pos.z + you.vel.z * 0.25), Math.min(1, dt * 4));
    camera.position.set(camTarget.x, CAM.up, camTarget.z + CAM.back);
    camera.lookAt(camTarget.x, 0.6, camTarget.z - 0.5);
    // trees standing between the camera and your Fuzzy turn see-through (their crowns swap to a faded copy of the leaf material)
    for (const n of nodes) {
      const crown = n.g.children[1] as THREE.Mesh | undefined; if (!crown || !crown.isMesh) continue;
      const d = n.tree.z - camTarget.z, block = n.falling < 0 && d > 0.4 && d < CAM.back && Math.abs(n.tree.x - camTarget.x) < 1.4 + n.tree.scale;
      const want = block ? fadeLeaf : leafMaterial(time); if (crown.material !== want) crown.material = want;
    }
    sun.target.position.copy(camTarget);
    // HUD
    if (scoreN.textContent !== String(sim.score)) { scoreN.textContent = String(sim.score); scoreEl.classList.remove('bump'); void scoreEl.offsetWidth; scoreEl.classList.add('bump'); }
    woodN.textContent = String(sim.wood);
    treesN.textContent = `${sim.cleared} tree${sim.cleared === 1 ? '' : 's'} · ${sim.standing} standing`;
    if (contest) {
      const st = sim.standings();
      const order = st.map((x) => x.id).join(',');
      for (const x of st) { const r = rows.get(x.id)!; if (r.sc.textContent !== String(x.score)) r.sc.textContent = String(x.score); const pl = `${x.place}`; if (r.pl.textContent !== pl) r.pl.textContent = pl; }
      if (order !== lastOrder) { lastOrder = order; for (const x of st) board.append(rows.get(x.id)!.el); }
    }
    const left = Math.ceil(sim.clock.left);
    if (left !== lastSec) { lastSec = left; timeN.textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`; timeEl.classList.toggle('warn', left <= 10 && sim.state === 'playing'); }
    const showMeter = sim.target !== null && sim.state === 'playing';
    if (meterWrap.hidden === showMeter) { meterWrap.hidden = !showMeter; }
    if (showMeter) { marker.style.left = `${sim.meter.value * 100}%`; const t = sim.trees[sim.target!]; hpFill.style.transform = `scaleX(${t.hp / t.maxHp})`; if (sim.target !== lastTarget) { chopBonus.hidden = !t.marked; } }
    lastTarget = sim.target;
    const mult = sim.combo.mult;
    if (sim.combo.chain > 1) { comboEl.classList.add('on'); comboN.textContent = `×${mult}`; const nx = sim.combo.next; comboS.textContent = nx ? `${sim.combo.chain} perfect · ${nx.at - sim.combo.chain} more for ×${nx.mult}` : `${sim.combo.chain} perfect · MAX`; if (mult !== lastCombo) { comboEl.classList.remove('bump'); void comboEl.offsetWidth; comboEl.classList.add('bump'); } }
    else comboEl.classList.remove('on');
    lastCombo = mult;
    // end
    if (sim.state === 'done' && !done) {
      if (!finishedAt) { finishedAt = now; meterWrap.hidden = true; count.textContent = 'TIME!'; count.className = 'race-count go'; play(snd.finish); if (contest) { const w = sim.standings()[0]; setTimeout(() => flashBanner(w.you ? 'You win the contest!' : `${w.name} wins the contest!`, w.you ? 'combo' : ''), 700); } }
      if (now - finishedAt > (contest ? 2400 : 1800)) { done = true; const r = sim.result(); destroy(); hooks.onFinish(r); return; }
    }
    renderer.render(scene, camera);
  };
  let destroyed = false;
  const destroy = () => {
    if (destroyed) return; destroyed = true;
    unlockPage();
    cancelAnimationFrame(raf);
    removeEventListener('keydown', onKey);
    document.removeEventListener('visibilitychange', onVis);
    root.removeEventListener('pointerdown', onTapDown); root.removeEventListener('pointerup', onTapUp);
    ro.disconnect(); ctl.destroy(); tips.destroy();
    scene.traverse((o) => { if (o instanceof THREE.Mesh) o.geometry.dispose(); });
    env.dispose(); pmrem.dispose(); renderer.dispose(); renderer.forceContextLoss();
    root.remove();
  };
  requestAnimationFrame(() => { last = performance.now(); raf = requestAnimationFrame(tick); });
  if (import.meta.env.DEV) (window as unknown as { __forest: unknown }).__forest = { sim, start, chop: doChop, ctl, tapAt, screenOf: (x: number, z: number) => { const v = new THREE.Vector3(x, 0.4, z).project(camera); const r = canvas.getBoundingClientRect(); return { x: r.left + (v.x * 0.5 + 0.5) * r.width, y: r.top + (-v.y * 0.5 + 0.5) * r.height }; }, finishNow: () => { (sim as unknown as { state: string }).state = 'done'; }, destroy };
  void LIMIT; void axe; void fuzzy;
}
