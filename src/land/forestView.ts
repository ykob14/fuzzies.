/**
 * Forest Expansion — the 3D clearing, the axe, the chop meter and the HUD. Rules live in land/forestGame.ts.
 * A separate scene over the town (the town's own forest is never touched); cleans up completely when it ends.
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import * as M from '../game/models3d';
import * as T from '../game/textures3d';
import { race as snd, sfx } from '../game/sound';
import { ForestSim, LIMIT, SWEET, type Tree } from './forestGame';
import { PAL, std, add } from './models';
import { buildSky, treeModel } from './environment';

export interface ForestSetup { mobile: boolean; sound: boolean; host: { name: string; skin: [string, string] } }
export interface ForestResult { place: number; timeMs: number; wood: number; cleared: number; total: number; perfect: number }
export interface ForestHooks { onFinish: (r: ForestResult) => void; onQuit: () => void }

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, text = ''): HTMLElementTagNameMap[K] => { const e = document.createElement(tag); e.className = cls; if (text) e.textContent = text; return e; };

function axeModel(): THREE.Group {
  const g = new THREE.Group();
  add(g, new THREE.CylinderGeometry(0.035, 0.045, 1.1, 10).translate(0, 0.55, 0), std('#b58a5a', 0.9), 0, 0, 0, false);
  const head = new THREE.Group();
  add(head, new THREE.BoxGeometry(0.34, 0.26, 0.09), std('#8a8f99', 0.35, 0.7), 0.1, 0, 0, false);
  add(head, new THREE.BoxGeometry(0.1, 0.3, 0.1), std('#5c6068', 0.5, 0.5), -0.05, 0, 0, false);
  head.position.y = 1.0;
  g.add(head);
  return g;
}

export function runForest(stage: HTMLElement, setup: ForestSetup, hooks: ForestHooks): void {
  const mobile = setup.mobile;
  const sim = new ForestSim();

  // ---- DOM ----
  const root = el('div', 'forest');
  const canvas = document.createElement('canvas'); canvas.className = 'race-canvas';
  const hud = el('div', 'race-hud forest-hud');
  const treesEl = el('div', 'race-lap'); const treesN = el('b', '', '0'); treesEl.append(el('small', '', 'TREES'), treesN, el('span', '', `/${sim.marked}`));
  const woodEl = el('div', 'race-pos'); const woodN = el('b', '', '0'); woodEl.append(el('small', '', 'WOOD'), woodN);
  const timeEl = el('div', 'race-time forest-time'); const sunIc = el('span', 'forest-sun', '☀'); const timeN = el('span', '', '1:30'); timeEl.append(sunIc, timeN);
  const pauseBtn = el('button', 'race-pause'); pauseBtn.type = 'button'; pauseBtn.setAttribute('aria-label', 'Pause'); pauseBtn.textContent = '❚❚';
  const banner = el('div', 'race-banner');
  const hint = el('div', 'race-hint', 'Tap a tree with a glowing ring, then chop when the marker is in the green');
  const intro = el('div', 'forest-intro'); const introBox = el('div', 'forest-intro-box');
  introBox.append(el('h2', '', 'Forest Expansion'), el('p', '', `${setup.host.name} marked six trees with glowing rings. Clear them before the sun sets — tap a marked tree, then chop when the marker lands in the green. The other trees stay!`));
  const go = el('button', 'btn btn-primary btn-lg', 'Let’s chop!'); go.type = 'button'; introBox.append(go); intro.append(introBox);
  // the chop meter + button
  const meterWrap = el('div', 'forest-meter'); meterWrap.hidden = true;
  const meterBar = el('div', 'forest-meter-bar'); const sweet = el('i', 'forest-meter-sweet'); const marker = el('b', 'forest-meter-marker');
  sweet.style.left = `${SWEET.lo * 100}%`; sweet.style.width = `${(SWEET.hi - SWEET.lo) * 100}%`;
  meterBar.append(sweet, marker);
  const chopBtn = el('button', 'forest-chop', 'CHOP!'); chopBtn.type = 'button';
  const hitEl = el('div', 'forest-hit');
  meterWrap.append(meterBar, chopBtn, hitEl);
  const pauseOverlay = el('div', 'race-paused'); pauseOverlay.hidden = true;
  const resume = el('button', 'btn btn-primary btn-lg', 'Resume'); resume.type = 'button';
  const quit = el('button', 'btn btn-ghost', 'Back to town'); quit.type = 'button';
  const pbox = el('div', 'race-paused-box'); pbox.append(el('h2', '', 'Paused'), el('p', '', 'The trees aren’t going anywhere.'), resume, quit);
  pauseOverlay.append(pbox);
  hud.append(treesEl, woodEl, timeEl, pauseBtn, banner, hint);
  root.append(canvas, hud, meterWrap, intro, pauseOverlay);
  stage.append(root);

  // ---- renderer & scene ----
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !mobile, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.shadowMap.enabled = !mobile;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = env.texture; scene.environmentIntensity = 0.3;
  const camera = new THREE.PerspectiveCamera(mobile ? 40 : 34, 1, 0.3, 300);
  const sun = new THREE.DirectionalLight(0xfff1dc, 2.4);
  sun.position.set(-14, 22, 12); sun.castShadow = !mobile;
  Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 2, far: 80 });
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
  const hemi = new THREE.HemisphereLight(0xdff0ff, 0x6a8a4a, 0.75);
  scene.add(sun, sun.target, hemi);
  const sky = buildSky(); sky.position.set(0, 0, 0); scene.add(sky);
  const skyMat = sky.material as THREE.ShaderMaterial;
  const skyTop0 = (skyMat.uniforms.uTop.value as THREE.Color).clone(), skyHor0 = (skyMat.uniforms.uHorizon.value as THREE.Color).clone();
  scene.fog = new THREE.Fog('#cfe6ee', 40, 120);
  const time = { value: 0 };
  // ground: a grassy clearing with a dirt path and a darker tree line all round
  const ground = new THREE.PlaneGeometry(60, 60, 60, 60).rotateX(-Math.PI / 2);
  const gp = ground.attributes.position, gc = new Float32Array(gp.count * 3);
  const g1 = new THREE.Color('#79c86b'), g2 = new THREE.Color('#5fb35a'), dirt = new THREE.Color('#c9a06b');
  const cc = new THREE.Color();
  for (let i = 0; i < gp.count; i++) {
    const x = gp.getX(i), z = gp.getZ(i);
    const n = Math.sin(x * 0.8) * Math.cos(z * 0.6) * 0.5 + 0.5;
    const path = Math.exp(-Math.pow((z - 8.5) / 1.4, 2)) * (x > -12 ? 1 : 0);
    cc.copy(g1).lerp(g2, n).lerp(dirt, path * 0.9);
    gc.set([cc.r, cc.g, cc.b], i * 3);
    gp.setY(i, Math.sin(x * 0.5) * Math.cos(z * 0.4) * 0.08);
  }
  ground.setAttribute('color', new THREE.BufferAttribute(gc, 3));
  ground.computeVertexNormals();
  const groundMesh = new THREE.Mesh(ground, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }));
  groundMesh.receiveShadow = !mobile;
  scene.add(groundMesh);
  // the tree line behind (never part of the game)
  for (let i = 0; i < (mobile ? 26 : 40); i++) { const a = (i / 40) * Math.PI * 2; const r = 16 + (i % 5) * 1.6; const t = treeModel(100 + i, time, 1.1 + (i % 3) * 0.25); t.position.set(Math.cos(a) * r * 1.3, 0, Math.sin(a) * r - 2); scene.add(t); }
  // rocks, flowers, a log pile marker
  for (let i = 0; i < 10; i++) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), std(i % 2 ? '#ff8fb4' : '#ffc94a', 0.6)); f.position.set((i * 3.7) % 17 - 8.5, 0.1, ((i * 5.3) % 11) - 5.5 + 7); f.scale.y = 0.6; scene.add(f); }
  // the game trees
  type Node = { tree: Tree; g: THREE.Group; ring?: THREE.Mesh; glow?: THREE.Sprite; falling: number; fallDir: number; stump?: THREE.Mesh };
  const ringGeo = new THREE.TorusGeometry(1.1, 0.07, 10, 48).rotateX(-Math.PI / 2);
  const ringMat = new THREE.MeshBasicMaterial({ color: PAL.raspberry, transparent: true, opacity: 0.9 });
  const glowTex = T.glow('rgba(255,140,190,0.9)', 'rgba(255,140,190,0)');
  const nodes: Node[] = sim.trees.map((t) => {
    const g = treeModel(t.seed, time, t.scale);
    g.position.set(t.x, 0, t.z);
    g.rotation.y = t.seed;
    scene.add(g);
    const n: Node = { tree: t, g, falling: -1, fallDir: 0 };
    if (t.marked) {
      const ring = new THREE.Mesh(ringGeo, ringMat); ring.position.set(t.x, 0.05, t.z); scene.add(ring); n.ring = ring;
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, opacity: 0.6 })); glow.position.set(t.x, 0.3, t.z); glow.scale.setScalar(3); scene.add(glow); n.glow = glow;
      // a pink ribbon round the trunk
      const rib = new THREE.Mesh(new THREE.TorusGeometry(0.14 * t.scale, 0.03, 8, 24).rotateX(Math.PI / 2), std(PAL.raspberry, 0.6)); rib.position.set(t.x, 0.55 * t.scale, t.z); scene.add(rib); n.g.userData.ribbon = rib;
    }
    return n;
  });
  // the host Fuzzy watching from the path
  const mats = { fur: T.furStrands() } as unknown as M.Mats;
  const host = M.makeFuzzy(mats, setup.host.skin, 0.26, 0.08, mobile ? 6 : 9);
  host.group.position.set(-9, 0.3, 8.5); host.group.rotation.y = 1.2;
  scene.add(host.group);
  const hostShadow = new THREE.Mesh(new THREE.CircleGeometry(0.3, 20).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: T.glow('rgba(0,0,0,0.45)', 'rgba(0,0,0,0)'), transparent: true, depthWrite: false }));
  hostShadow.position.set(-9, 0.02, 8.5); scene.add(hostShadow);
  // the axe
  const axe = axeModel(); axe.visible = false; axe.scale.setScalar(1.7); scene.add(axe);
  let swing = -1;
  // chips & logs
  const chipMat = std('#d9b27a', 0.9);
  const chips: { m: THREE.Mesh; v: THREE.Vector3; life: number }[] = [];
  const chip = (at: THREE.Vector3, n: number) => { for (let i = 0; i < n; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.12), chipMat); m.position.copy(at); m.rotation.set(Math.random() * 3, Math.random() * 3, 0); scene.add(m); chips.push({ m, v: new THREE.Vector3((Math.random() - 0.5) * 3, 2 + Math.random() * 2, (Math.random() - 0.5) * 3), life: 0 }); } };
  const logMat = std('#b58a5a', 0.9);
  const logs: { m: THREE.Mesh; t: number; from: THREE.Vector3 }[] = [];

  // ---- camera ----
  const target = new THREE.Vector3(0, 0, 2), camTarget = target.clone();
  let dist = mobile ? 24 : 20, distGoal = dist;
  const YAW = 0.35, PITCH = 0.95;
  const placeCamera = () => {
    const off = new THREE.Vector3(Math.sin(YAW) * Math.cos(PITCH) * dist, Math.sin(PITCH) * dist, Math.cos(YAW) * Math.cos(PITCH) * dist);
    camera.position.copy(target).add(off); camera.lookAt(target.x, target.y + 0.6, target.z);
  };
  const resize = () => { const w = root.clientWidth || innerWidth, h = root.clientHeight || innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); if (camera.aspect < 0.8) distGoal = Math.max(distGoal, 26); };
  resize();
  const ro = new ResizeObserver(resize); ro.observe(root);

  // ---- input: tap trees, drag to look around, chop ----
  const ray = new THREE.Raycaster();
  let down: { x: number; y: number; moved: boolean } | null = null;
  const pick = (cx: number, cy: number): number | null => {
    const r = canvas.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1), camera);
    const hit = ray.intersectObjects(nodes.filter((n) => !n.tree.felled).map((n) => n.g), true)[0];
    if (!hit) return null;
    let o: THREE.Object3D | null = hit.object;
    while (o && !nodes.some((n) => n.g === o)) o = o.parent;
    const n = nodes.find((x) => x.g === o);
    return n ? n.tree.id : null;
  };
  canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, moved: false }; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', (e) => {
    if (!down) return;
    const dx = e.clientX - down.x, dy = e.clientY - down.y;
    if (!down.moved && Math.hypot(dx, dy) > 8) down.moved = true;
    if (down.moved) { const k = dist / (canvas.clientHeight || 600) * 1.6; camTarget.x -= dx * k * Math.cos(YAW); camTarget.z += dx * k * Math.sin(YAW); camTarget.z -= dy * k; camTarget.x = THREE.MathUtils.clamp(camTarget.x, -12, 12); camTarget.z = THREE.MathUtils.clamp(camTarget.z, -6, 10); down.x = e.clientX; down.y = e.clientY; }
  });
  canvas.addEventListener('pointerup', (e) => {
    if (!down) return;
    const tap = !down.moved; down = null;
    if (!tap || paused || sim.state !== 'playing') return;
    const id = pick(e.clientX, e.clientY);
    if (id === null) return;
    const r = sim.select(id);
    if (r === 'ok') { if (sim.selected === id && lastSelected === id) doChop(); lastSelected = id; onSelect(id); }
    else if (r === 'keep') { flashBanner('This tree stays 🌳'); const n = nodes[id]; shake(n); play(() => sfx.hop()); }
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  let lastSelected = -1;
  const onKey = (e: KeyboardEvent) => { if (e.repeat) return; const k = e.key.toLowerCase(); if (k === ' ' || k === 'enter') { e.preventDefault(); if (!intro.hidden) start(); else doChop(); } if (k === 'escape' || k === 'p') togglePause(); };
  addEventListener('keydown', onKey);
  chopBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); doChop(); });
  const onSelect = (id: number) => {
    const t = sim.trees[id];
    target.set(t.x, 0, t.z); camTarget.copy(target); distGoal = mobile ? 15 : 12;
    meterWrap.hidden = false;
    axe.visible = true; axe.position.set(t.x + 1.1 * (t.x < 0 ? 1 : -1), 0.15, t.z + 0.9); axe.rotation.set(0, t.x < 0 ? 0.5 : -0.5, -0.5); axe.userData.side = t.x < 0 ? 1 : -1;
    for (const n of nodes) if (n.ring) (n.ring.material as THREE.MeshBasicMaterial).opacity = n.tree.id === id ? 1 : 0.9;
    hint.classList.add('fade');
  };
  const doChop = () => {
    if (paused || sim.state !== 'playing' || sim.selected === null) return;
    const id = sim.selected;
    const r = sim.chop();
    if (!r) return;
    const n = nodes[id];
    swing = 0;
    hitEl.textContent = r.hit === 'perfect' ? 'PERFECT! +1 wood' : r.hit === 'good' ? 'Nice hit' : 'Weak…';
    hitEl.className = `forest-hit on ${r.hit}`; setTimeout(() => hitEl.classList.remove('on'), 650);
    const trunkAt = new THREE.Vector3(n.tree.x, 0.6 * n.tree.scale, n.tree.z);
    chip(trunkAt, r.hit === 'perfect' ? 8 : 4);
    play(() => { sfx.build(); if (r.hit === 'perfect') sfx.collect(); });
    shake(n, r.hit === 'perfect' ? 0.12 : 0.06);
    if (r.felled) {
      n.falling = 0; n.fallDir = axe.userData.side as number;
      if (n.ring) { scene.remove(n.ring); n.ring = undefined; } if (n.glow) { scene.remove(n.glow); n.glow = undefined; }
      const rib = n.g.userData.ribbon as THREE.Mesh | undefined; if (rib) scene.remove(rib);
      meterWrap.hidden = true; axe.visible = false;
      play(() => { snd.bump(); setTimeout(() => sfx.gold(), 500); });
      flashBanner(sim.remaining ? `Timber! ${sim.remaining} to go` : 'All clear!');
      hostCheer = 1;
    }
    treesN.textContent = String(sim.cleared);
    woodN.textContent = String(sim.wood);
    woodEl.classList.remove('bump'); void woodEl.offsetWidth; woodEl.classList.add('bump');
  };
  const shake = (n: Node, amp = 0.08) => { n.g.userData.shake = amp; };

  // ---- pause / start ----
  let paused = false, done = false, finishedAt = -1, hostCheer = 0;
  const togglePause = () => { if (done || !intro.hidden) return; paused = !paused; pauseOverlay.hidden = !paused; };
  pauseBtn.addEventListener('click', togglePause);
  resume.addEventListener('click', togglePause);
  quit.addEventListener('click', () => { destroy(); hooks.onQuit(); });
  const start = () => { intro.hidden = true; sim.start(); play(() => snd.go()); };
  go.addEventListener('click', start);
  const onVis = () => { if (document.hidden && !paused && sim.state === 'playing') togglePause(); };
  document.addEventListener('visibilitychange', onVis);
  const play = (f: () => void) => { if (setup.sound) try { f(); } catch { /* no audio */ } };
  const flashBanner = (t: string) => { banner.textContent = t; banner.classList.remove('on'); void banner.offsetWidth; banner.classList.add('on'); setTimeout(() => banner.classList.remove('on'), 1500); };

  // ---- loop ----
  let raf = 0, last = performance.now();
  const dusk = new THREE.Color('#ff9f6a'), duskHor = new THREE.Color('#ffd1a6'), night = new THREE.Color('#5a4b8a');
  const tick = (now: number) => {
    raf = requestAnimationFrame(tick);
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now;
    if (paused) return;
    time.value += dt;
    sim.step(dt);
    for (const e of sim.events) { if (e.kind === 'timeup') { flashBanner('The sun has set…'); } }
    // the day goes by: the sun sinks and warms, the sky turns to dusk
    const k = Math.min(1, sim.time / LIMIT);
    sun.position.set(-14 + k * 10, 22 - k * 17, 12);
    sun.intensity = 2.4 - k * 1.1; sun.color.copy(new THREE.Color(0xfff1dc)).lerp(dusk, k * 0.8);
    (skyMat.uniforms.uTop.value as THREE.Color).copy(skyTop0).lerp(night, k * 0.55);
    (skyMat.uniforms.uHorizon.value as THREE.Color).copy(skyHor0).lerp(duskHor, k * 0.9);
    hemi.intensity = 0.75 - k * 0.3;
    sunIc.style.transform = `translateY(${k * 6}px)`;
    const left = Math.max(0, LIMIT - sim.time);
    timeN.textContent = `${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}`;
    timeEl.classList.toggle('warn', left < 15 && sim.state === 'playing');
    // meter
    if (!meterWrap.hidden) marker.style.left = `${sim.meter.value * 100}%`;
    // trees: rings pulse, the target glows, shakes, falling
    for (const n of nodes) {
      if (n.ring) { const s = 1 + Math.sin(time.value * 3 + n.tree.id) * 0.06; n.ring.scale.set(s, 1, s); }
      if (n.glow) (n.glow.material as THREE.SpriteMaterial).opacity = 0.45 + Math.sin(time.value * 3 + n.tree.id) * 0.2;
      const sh = (n.g.userData.shake as number) ?? 0;
      if (sh > 0.001) { n.g.rotation.z = Math.sin(time.value * 40) * sh; n.g.userData.shake = sh * Math.pow(0.02, dt); } else n.g.rotation.z = 0;
      if (n.falling >= 0) {
        n.falling += dt;
        const f = Math.min(1, n.falling / 1.1);
        const e = f * f * (3 - 2 * f);
        n.g.rotation.z = -n.fallDir * e * (Math.PI / 2 - 0.08);
        if (n.falling > 1.3) {
          // gone: a stump stays, logs roll out and float away to the wood count
          scene.remove(n.g); n.falling = -2;
          const stump = new THREE.Mesh(new THREE.CylinderGeometry(0.13 * n.tree.scale, 0.16 * n.tree.scale, 0.18, 10), std('#b58a5a', 0.95)); stump.position.set(n.tree.x, 0.09, n.tree.z); scene.add(stump); n.stump = stump;
          for (let i = 0; i < 3; i++) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.5, 10).rotateZ(Math.PI / 2), logMat); m.position.set(n.tree.x + (i - 1) * 0.5, 0.12, n.tree.z + 0.6); scene.add(m); logs.push({ m, t: -i * 0.15, from: m.position.clone() }); }
        }
      }
    }
    // the axe swings
    if (swing >= 0 && axe.visible) { swing += dt; const k2 = Math.min(1, swing / 0.28); axe.rotation.z = -0.5 - Math.sin(k2 * Math.PI) * 1.4 * (axe.userData.side as number); if (swing > 0.5) swing = -1; }
    else if (axe.visible) axe.rotation.z = -0.5 + Math.sin(time.value * 2) * 0.05;
    // chips & logs
    for (let i = chips.length - 1; i >= 0; i--) { const c = chips[i]; c.life += dt; c.v.y -= 9 * dt; c.m.position.addScaledVector(c.v, dt); c.m.rotation.x += dt * 6; if (c.m.position.y < 0.02 || c.life > 1.6) { scene.remove(c.m); chips.splice(i, 1); } }
    for (let i = logs.length - 1; i >= 0; i--) { const l = logs[i]; l.t += dt; if (l.t < 0.6) continue; const k3 = Math.min(1, (l.t - 0.6) / 0.8); l.m.position.copy(l.from).lerp(new THREE.Vector3(camera.position.x, camera.position.y - 1, camera.position.z), k3 * k3); l.m.scale.setScalar(1 - k3 * 0.9); if (k3 >= 1) { scene.remove(l.m); logs.splice(i, 1); } }
    // host: breathe, cheer when a tree falls
    host.body.scale.set(1 + Math.sin(time.value * 2.2) * 0.03, 1 - Math.sin(time.value * 2.2) * 0.03, 1 + Math.sin(time.value * 2.2) * 0.03);
    if (hostCheer > 0) { hostCheer -= dt; host.group.position.y = 0.3 + Math.abs(Math.sin(hostCheer * 9)) * 0.35; for (const e of host.eyes) { e.open.visible = false; e.lid.visible = true; } }
    else { host.group.position.y = 0.3; for (const e of host.eyes) { e.open.visible = true; e.lid.visible = false; } }
    // camera glide
    target.lerp(camTarget, Math.min(1, dt * 3.5));
    dist += (distGoal - dist) * Math.min(1, dt * 3);
    placeCamera();
    sun.target.position.copy(target);
    // end
    if (sim.state === 'done' && !done) {
      if (finishedAt < 0) { finishedAt = time.value; meterWrap.hidden = true; axe.visible = false; play(() => snd.finish()); }
      if (time.value - finishedAt > 2.2) { done = true; const r = sim.result(); destroy(); hooks.onFinish(r); return; }
    }
    renderer.render(scene, camera);
  };
  let destroyed = false;
  const destroy = () => {
    if (destroyed) return; destroyed = true;
    cancelAnimationFrame(raf);
    removeEventListener('keydown', onKey);
    document.removeEventListener('visibilitychange', onVis);
    ro.disconnect();
    scene.traverse((o) => { if (o instanceof THREE.Mesh) o.geometry.dispose(); });
    env.dispose(); pmrem.dispose(); renderer.dispose(); renderer.forceContextLoss();
    root.remove();
  };
  requestAnimationFrame(() => { last = performance.now(); raf = requestAnimationFrame(tick); });
  if (import.meta.env.DEV) (window as unknown as { __forest: unknown }).__forest = { sim, start, chop: doChop, select: (id: number) => { const r = sim.select(id); if (r === 'ok') onSelect(id); return r; }, finishNow: () => { (sim as unknown as { state: string }).state = 'done'; }, destroy };
}
