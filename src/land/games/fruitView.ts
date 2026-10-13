/**
 * Fruit Catcher — the orchard scene. A sunny lane between a picket fence and a row of real-looking fruit trees (painted bark,
 * shaded crowns, leaf cards, ripe fruit), a red barn and hills beyond, hay, crates of apples, grass and flowers swaying in the
 * front. The Fuzzy balances a wide wicker basket on its head and follows your finger (drag anywhere) or A/D / arrows; it leans
 * and turns into the run, hops on every catch, spins on a chain, sees stars after a pinecone. Fruit pops out of a shaking crown,
 * tumbles down with a landing shadow, arcs into the basket and piles up there; misses bounce and roll away. All artwork comes
 * from games/orchardArt.ts; rules (unchanged apart from the lane width) from games/fruit.ts; scene chrome from land/mgScene.ts.
 */
import * as THREE from 'three';
import { createArcade, sfx, vac, lerp, type MiniSetup, type MiniHooks } from '../mgScene';
import { adventure } from '../adventures';
import { FruitSim, ARENA, SCORING, type Falling, type FruitKind } from './fruit';
import * as O from './orchardArt';

const JUICE: Record<FruitKind, string> = { apple: '#ff5a4a', pear: '#d8e070', berry: '#ff3d6a', gold: '#ffd84a', cone: '#9a6a3a' };

export function run(stage: HTMLElement, setup: MiniSetup, hooks: MiniHooks): void {
  const adv = adventure('fruit')!;
  // the camera is framed for the screen: on a portrait phone it stands further back with a wider lens and the lane narrows so
  // every drop is on screen; on a computer or a landscape phone the whole 14 m lane shows
  const aspect = innerWidth / Math.max(1, innerHeight);
  const portrait = aspect < 0.9;
  const cam = portrait ? { fov: 56, back: 18, up: 5.2, lookDy: 0, lookY: 4.5, lead: 0 } : { fov: 38, back: 14.5, up: 4.8, lookDy: 0, lookY: 3.1, lead: 0 };
  const tanH = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * aspect;
  const halfWAt = (z: number) => (cam.back - z) * tanH;
  const hw = Math.min(ARENA.hw, Math.max(3.2, halfWAt(0) - 0.9));
  const sim = new FruitSim(setup.variant === 'golden' ? 'golden' : 'classic', setup.seed, hw);
  const a = createArcade(stage, {
    cls: 'fruit', setup, adv, hooks, buttonLabel: 'Catch!',
    hud: { count: 'CAUGHT' },
    camera: cam,
    world: { size: { hw: 14, hd: 8 }, path: false, fence: false, treeLine: false, flowers: 0, clouds: false, tufts: false, fog: ['#e3eedb', portrait ? 34 : 28, portrait ? 100 : 85], sun: 2.6 },
    controls: { touch: false, mouseSteer: false }, onStart: () => sim.start(),
  });
  const { scene, time, renderer, sun, hemi, camera } = a;
  const lite = a.mobile; // phones: fewer leaves / tufts, a smaller shadow map — same look

  // ---- light: warm low sun with soft shadows (phones too, on a tight frustum), cool sky fill, a warm rim from behind ----
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.toneMappingExposure = 1.06;
  sun.castShadow = true; sun.color.set('#fff0d6');
  sun.shadow.mapSize.set(lite ? 1024 : 2048, lite ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -15, right: 15, top: 15, bottom: -12, near: 4, far: 70 }); sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.05;
  hemi.color.set('#d6eaff'); hemi.groundColor.set('#7f9c56'); hemi.intensity = 0.95;
  scene.environmentIntensity = 0.42;
  const skyU = (a.sky.material as THREE.ShaderMaterial).uniforms; (skyU.uTop.value as THREE.Color).set('#5aaae4'); (skyU.uHorizon.value as THREE.Color).set('#fcefd4');

  // ---- ground: painted lawn (large-scale variation baked into vertex colours) + a soft-edged dirt lane ----
  const grass = O.grassTex(); grass.repeat.set(30, 30);
  { const g = a.ground.geometry as THREE.BufferGeometry; const p = g.attributes.position, c = g.attributes.color as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); const k = 0.88 + Math.sin(x * 0.21 + 1) * Math.cos(z * 0.17) * 0.08 + Math.sin(x * 0.07 - z * 0.05) * 0.06; c.setXYZ(i, k * 1.02, k, k * 0.92); p.setY(i, 0); }
    c.needsUpdate = true; p.needsUpdate = true; g.computeVertexNormals(); } // a flat lawn: the lane and the landing shadows must never sink into it
  a.ground.material = new THREE.MeshStandardMaterial({ map: grass, vertexColors: true, roughness: 0.96 }); a.ground.receiveShadow = true;
  const laneTex = O.pathTex(); laneTex.repeat.set(9, 1);
  const lane = new THREE.Mesh(new THREE.PlaneGeometry(60, 2.6).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: laneTex, transparent: true, depthWrite: false, roughness: 0.95 }));
  lane.position.set(0, 0.012, 0.15); lane.receiveShadow = true; scene.add(lane);

  // ---- the orchard: a front row whose crowns overhang the lane, a second row, a far tree line, hills, a barn, clouds ----
  const front: O.OrchardTree[] = [];
  const nFront = portrait ? 3 : 5; const span = hw + 1.4;
  for (let i = 0; i < nFront; i++) {
    const x = -span + (i / (nFront - 1)) * span * 2;
    const t = O.orchardTree(11 + i * 7, i % 3 === 1 ? 'pear' : i % 3 === 2 ? 'mixed' : 'apple', { scale: portrait ? 1.55 : 1.3, leaves: lite ? 90 : 130, hanging: 12 });
    t.group.position.set(x, 0, -2.7 - (i % 2) * 0.35); t.group.rotation.y = i * 1.9; scene.add(t.group); front.push(t);
  }
  const back: O.OrchardTree[] = [];
  for (let i = 0; i < nFront + 1; i++) {
    const x = -span - 2 + (i / nFront) * (span * 2 + 4);
    const t = O.orchardTree(61 + i * 5, i % 2 ? 'pear' : 'apple', { scale: portrait ? 1.35 : 1.1, leaves: lite ? 40 : 70, hanging: 7, shadow: false });
    t.group.position.set(x, 0, -8.5 - (i % 2) * 0.8); t.group.rotation.y = i * 2.3; scene.add(t.group); back.push(t);
  }
  const farN = portrait ? 7 : 11;
  for (let i = 0; i < farN; i++) { const z = -16 - (i % 3) * 3; const w = halfWAt(z) * 1.15; const t = O.farTree(200 + i, 1.2 + (i % 3) * 0.2); t.position.set(-w + (i / (farN - 1)) * w * 2, 0, z); t.rotation.y = i; scene.add(t); }
  scene.add(O.hills());
  const barn = O.barn(); barn.position.set(-halfWAt(-14) * 0.62, 0, -14); barn.rotation.y = 0.35; barn.scale.setScalar(1.1); scene.add(barn);
  const clouds = Array.from({ length: 6 }, (_, i) => { const c = O.cloud(i + 3); c.position.set((i - 2.5) * 16, 15 + (i % 3) * 2.5, -48 - (i % 2) * 8); c.scale.multiplyScalar(1.4 + (i % 3) * 0.3); scene.add(c); return c; });
  // the picket fence between the lane and the trees, hay and crates at the ends of the lane, a ladder against a tree
  scene.add(O.fence(-span - 6, span + 6, -1.3));
  const crateL = O.fruitCrate('apple', 3); crateL.position.set(-(hw + 1.05), 0, 1.0); crateL.rotation.y = 0.5; scene.add(crateL);
  const crateR = O.fruitCrate('pear', 4); crateR.position.set(hw + 1.05, 0, 0.9); crateR.rotation.y = -0.4; scene.add(crateR);
  const crate2 = O.fruitCrate('apple', 5); crate2.position.set(hw + 1.6, 0, -0.35); crate2.rotation.y = 0.2; scene.add(crate2);
  const hay = O.hayBale(); hay.position.set(-(hw + 1.9), 0.55, -0.3); hay.rotation.y = 0.4; scene.add(hay);
  const lad = O.ladder(2.8); lad.position.set(front[0].group.position.x + 0.75, 0, -2.0); lad.rotation.set(-0.28, 0.3, 0); scene.add(lad);
  // grass tufts and flowers: dense in the foreground, never on the lane or under the fence
  const rr = O.rng(setup.seed + 3);
  const tufts: { x: number; z: number; s: number }[] = []; const fl: { x: number; z: number; kind: number }[] = [];
  for (let i = 0; tufts.length < (lite ? 230 : 380) && i < 4000; i++) { const z = -14 + Math.pow(rr(), 0.7) * 24, x = (rr() - 0.5) * 2 * (halfWAt(z) + 2); if (Math.abs(z - 0.15) < 1.45) continue; if (z < -1.0 && z > -1.6) continue; tufts.push({ x, z, s: (0.6 + rr() * 0.6) * (z > 3 ? 0.75 : 1) }); }
  for (let i = 0; fl.length < (lite ? 70 : 120) && i < 4000; i++) { const z = -7 + Math.pow(rr(), 0.6) * 15, x = (rr() - 0.5) * 2 * (halfWAt(z) + 1); if (Math.abs(z - 0.15) < 1.5) continue; if (z < -1.0 && z > -1.6) continue; fl.push({ x, z, kind: (rr() * 3) | 0 }); }
  scene.add(O.grassTufts(tufts, time), O.flowers(fl));
  // foreground framing: leafy bushes cropped by the bottom corners, closer than anything you play with
  for (const [sx, z, sz] of [[-1, 8.5, 1.0], [1, 9.0, 1.1]] as const) { const bsh = O.bush(Math.round(z * 10), sz, false); bsh.position.set(sx * (halfWAt(z) + 0.1), 0, z); bsh.rotation.y = z; scene.add(bsh); }
  // butterflies and pollen in the sunbeams
  const flies = ['#ffffff', '#ffcf4a', '#ff8fb4'].map((c, i) => { const b = O.butterfly(c); b.group.scale.setScalar(1.4); scene.add(b.group); return { ...b, ph: i * 2.1 }; });
  const pollenMat = new THREE.SpriteMaterial({ map: O.softDotTex(), color: '#fff6d0', transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending });
  const pollen = Array.from({ length: lite ? 14 : 26 }, (_, i) => { const s = new THREE.Sprite(pollenMat); s.scale.setScalar(0.07 + (i % 3) * 0.03); s.position.set((rr() - 0.5) * hw * 2.4, 0.5 + rr() * 5, -1 + rr() * 3); scene.add(s); return { s, ph: rr() * 10 }; });

  // ---- you: the Fuzzy with a wide wicker basket balanced on its head ----
  const R = portrait ? 0.55 : 0.46;
  const me = a.figure(setup.you.skin, R);
  me.group.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.castShadow = true; });
  const basket = O.basketModel(R * 1.72);
  const basketHolder = new THREE.Group(); basketHolder.position.y = R * 0.92; basketHolder.add(basket.group); me.fuzzy.group.add(basketHolder);
  const caughtKinds: O.FruitArtKind[] = [];
  // dizzy stars after a pinecone
  const starMat = new THREE.SpriteMaterial({ map: O.starTex(), transparent: true, depthWrite: false });
  const dizzy = new THREE.Group(); for (let i = 0; i < 3; i++) { const s = new THREE.Sprite(starMat); s.scale.setScalar(0.22); dizzy.add(s); } dizzy.visible = false; me.group.add(dizzy);
  // where your finger is: a soft ring on the lane
  const aim = new THREE.Mesh(new THREE.RingGeometry(0.32, 0.42, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false })); aim.position.y = 0.03; scene.add(aim);

  // ---- falling things: drawn a touch larger on phones, and lifted so the rules' catch line sits at the basket's rim ----
  const FS = portrait ? 1.3 : 1.1;
  const VOFF = Math.max(0, me.base + R * 0.92 + basket.topY * 0.6 - 1.18);
  const shadowMat = new THREE.MeshBasicMaterial({ map: O.softDotTex(), color: '#2a3a1a', transparent: true, depthWrite: false, opacity: 0.4 });
  const haloMat = new THREE.SpriteMaterial({ map: O.softDotTex(), color: '#ffd34a', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.75 });
  type Node = { it: Falling; m: THREE.Group; sh: THREE.Mesh; age: number; got: number; from: THREE.Vector3; ground: number; p: THREE.Vector3; v: THREE.Vector3; spin: THREE.Vector3; extra: THREE.Object3D[] };
  const nodes = new Map<number, Node>();
  const make = (it: Falling): Node => {
    const m = O.fruitModel(it.kind as O.FruitArtKind, true);
    const extra: THREE.Object3D[] = [];
    if (it.kind === 'gold') { const h = new THREE.Sprite(haloMat); h.scale.setScalar(1.3); m.add(h); for (let i = 0; i < 2; i++) { const s = new THREE.Sprite(starMat); s.scale.setScalar(0.16); m.add(s); extra.push(s); } }
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9).rotateX(-Math.PI / 2), shadowMat.clone()); sh.position.y = 0.025; scene.add(sh);
    m.scale.setScalar(0.001); scene.add(m); m.userData.fs = FS;
    const n: Node = { it, m, sh, age: 0, got: -1, from: new THREE.Vector3(), ground: -1, p: new THREE.Vector3(it.x, it.y, 0), v: new THREE.Vector3(), spin: new THREE.Vector3(), extra };
    nodes.set(it.id, n); return n;
  };
  const drop = (n: Node) => { scene.remove(n.m, n.sh); nodes.delete(n.it.id); };
  // falling leaves when a crown lets go of a fruit
  const leafMat = new THREE.SpriteMaterial({ map: O.leafCardTex(), transparent: true, depthWrite: false });
  const leaves: { s: THREE.Sprite; v: THREE.Vector3; life: number; ph: number }[] = [];
  const shed = (x: number, y: number) => { for (let i = 0; i < 2; i++) { const s = new THREE.Sprite(leafMat.clone()); s.scale.setScalar(0.28); s.position.set(x + (Math.random() - 0.5) * 0.8, y + 0.2, -0.3 + Math.random() * 0.4); scene.add(s); leaves.push({ s, v: new THREE.Vector3((Math.random() - 0.5) * 0.6, -0.9, 0), life: 0, ph: Math.random() * 6 }); } };
  const nearestTree = (x: number) => front.reduce((b, t) => (Math.abs(t.group.position.x - x) < Math.abs(b.group.position.x - x) ? t : b), front[0]);

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
  /** the lane x under a screen point: where the ray crosses basket height (or the lane line when looking up) */
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

  // the Fuzzy's motion state
  let hopY = 0, hopV = 0, yaw = 0, lean = 0, tilt = 0, tiltV = 0, bSquash = 0, spinT = 0, lastVx = 0;
  const basketWorld = new THREE.Vector3();
  a.run((dt, input) => {
    sim.step(dt, steer(input));
    for (const e of sim.events) {
      if (e.kind === 'spawn' && e.item) { nearestTree(e.item.x).shake(0.6); if (Math.random() < 0.6) shed(e.item.x, e.item.y); }
      else if (e.kind === 'catch' && e.item) {
        const n = nodes.get(e.item.id); if (n) { n.got = 0; n.from.copy(n.m.position); }
        a.float(sim.x, 2.2, 0, `+${e.value}${(e.mult ?? 1) > 1 ? ` ×${e.mult}` : ''}`, e.item.kind === 'gold' ? 'gold' : '');
        a.play(e.item.kind === 'gold' ? sfx.gold : sfx.collect);
        if (hopY < 0.05) hopV = 2.3; bSquash = 1;
        if (e.item.kind === 'gold') a.tip('gold', 'Golden fruit! Worth 50 — and more with a chain', 3000);
      } else if (e.kind === 'cone' && e.item) {
        const n = nodes.get(e.item.id); if (n) { n.ground = 0; n.p.copy(n.m.position); n.v.set(Math.sign(e.item.x - sim.x || 1) * 2.6, 3.4, 0.8); n.spin.set(6, 4, 9); }
        a.chips(new THREE.Vector3(sim.x, 1.4, 0.2), 9, '#8a5a30'); a.banner('Ouch — a pinecone! −20', 'warn'); a.play(vac.bump); me.squash = 0.7; bSquash = 1.4;
        a.tip('cone', 'Pinecones knock the basket and break your chain — step aside', 3200);
      } else if (e.kind === 'miss' && e.item) {
        const n = nodes.get(e.item.id); if (n) { n.ground = 0; n.p.copy(n.m.position); n.v.set((Math.random() - 0.5) * 1.6, -3, 0.4 + Math.random() * 0.6); n.spin.set(3, 0, 5); }
        a.puff(new THREE.Vector3(e.item.x, 0.15, 0.1), 4, '#e0c89a'); a.tip('miss', 'Missed one — the shadows on the path show where fruit lands', 3600);
      } else if (e.kind === 'combo') { a.banner(`×${e.mult} CHAIN!`, 'combo'); a.play(() => vac.combo(e.n ?? 1)); spinT = 0.55; a.sparks(new THREE.Vector3(sim.x, 1.6, 0), 10); }
      else if (e.kind === 'wave') { a.banner(e.n === 1 ? 'Faster!' : 'Even faster!', 'combo'); a.play(sfx.level); }
      else if (e.kind === 'warn') a.warn(e.n!);
    }
  }, (dt) => {
    const t = time.value;
    // ---- the Fuzzy: follows, leans and turns into the run, hops on catches, spins on a chain, wobbles when stunned ----
    const speedK = Math.min(1, Math.abs(sim.vx) / 9.5);
    if (Math.sign(sim.vx) !== Math.sign(lastVx) && Math.abs(sim.vx) > 2) me.squash = Math.max(me.squash, 0.25); // a little skid on a turn
    lastVx = sim.vx;
    hopV -= 15 * dt; hopY = Math.max(0, hopY + hopV * dt); if (hopY === 0 && hopV < 0) { if (hopV < -1.5) me.squash = Math.max(me.squash, 0.35); hopV = 0; }
    me.group.position.set(sim.x, hopY, 0);
    yaw = lerp(yaw, THREE.MathUtils.clamp(sim.vx * 0.06, -0.5, 0.5), Math.min(1, dt * 8));
    spinT = Math.max(0, spinT - dt);
    me.group.rotation.y = yaw + (spinT > 0 ? (1 - spinT / 0.55) * Math.PI * 2 : 0);
    lean = lerp(lean, -sim.vx * 0.035 + (sim.stun > 0 ? Math.sin(t * 28) * 0.14 : 0), Math.min(1, dt * 10));
    a.walk(me, speedK, dt);
    me.fuzzy.group.rotation.z = lean;
    me.fuzzy.group.rotation.x = lerp(me.fuzzy.group.rotation.x, speedK < 0.15 ? -0.1 + Math.sin(t * 2) * 0.03 : 0.05, Math.min(1, dt * 4)); // looks up for fruit when standing
    // the basket: a damped spring that swings behind the run, squashes on a catch, glows on a chain
    tiltV += ((sim.vx * 0.045) - tilt) * 90 * dt - tiltV * 9 * dt; tilt += tiltV * dt;
    basket.group.rotation.z = tilt; bSquash = Math.max(0, bSquash - dt * 5);
    basket.group.scale.set(1 + Math.sin(bSquash * 3) * 0.06 * bSquash, 1 - 0.12 * bSquash, 1 + Math.sin(bSquash * 3) * 0.06 * bSquash);
    const rimMat = basket.rim.material as THREE.MeshStandardMaterial; rimMat.emissiveIntensity = lerp(rimMat.emissiveIntensity, sim.combo.mult > 1 ? 0.25 + Math.sin(t * 8) * 0.12 : 0, Math.min(1, dt * 6));
    dizzy.visible = sim.stun > 0; if (dizzy.visible) dizzy.children.forEach((s, i) => { const an = t * 6 + (i / 3) * Math.PI * 2; s.position.set(Math.cos(an) * 0.45, 1.75 + Math.sin(an * 2) * 0.05, Math.sin(an) * 0.45); });
    basket.group.getWorldPosition(basketWorld); basketWorld.y += basket.topY * 0.6;
    // the aim ring under your finger
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
        n.m.scale.setScalar(FS * (1 - k * 0.3)); n.sh.visible = false;
        if (k >= 1) {
          drop(n); caughtKinds.push(it.kind as O.FruitArtKind); if (caughtKinds.length > 12) caughtKinds.shift(); basket.fill(caughtKinds);
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
        if (n.ground > 1.2) { const f = Math.max(0.001, 1 - (n.ground - 1.2) / 0.4); n.m.scale.setScalar(f * FS); n.sh.visible = f > 0.2; if (f <= 0.001) drop(n); }
        continue;
      }
      if (it.state === 'ground') { n.ground = 0; n.p.copy(n.m.position); n.v.set((Math.random() - 0.5) * 1.2, -2, 0.3); n.spin.set(3, 0, 4); continue; }
      // in the air: pop out of the crown, tumble, wobble; the landing shadow grows as it nears the lane
      const pop = Math.min(1, n.age / 0.22); const back = 1 + 2.2 * Math.pow(pop - 1, 3) + 1.2 * Math.pow(pop - 1, 2);
      n.m.scale.setScalar(Math.max(0.001, back) * FS);
      n.m.position.set(it.x, it.y + VOFF, 0);
      n.m.rotation.y += it.spin * dt; n.m.rotation.z = Math.sin(t * 3 + it.id) * 0.35; n.m.rotation.x = Math.cos(t * 2.4 + it.id) * 0.2;
      n.extra.forEach((s, i) => { const an = t * 4 + i * Math.PI; s.position.set(Math.cos(an) * 0.42, Math.sin(an * 1.3) * 0.2, Math.sin(an) * 0.42); });
      const near = Math.max(0, 1 - it.y / 6.5);
      n.sh.position.set(it.x, 0.025, 0); n.sh.scale.setScalar(0.45 + near * 0.55); (n.sh.material as THREE.MeshBasicMaterial).opacity = 0.12 + near * 0.45;
    }
    for (const n of [...nodes.values()]) if (n.got < 0 && n.ground < 0 && !sim.items.includes(n.it)) drop(n);
    // ---- the world breathes ----
    for (const tr of front) tr.update(t, dt);
    for (const tr of back) tr.update(t * 0.9, dt);
    for (let i = leaves.length - 1; i >= 0; i--) { const l = leaves[i]; l.life += dt; l.s.position.x += (l.v.x + Math.sin(t * 3 + l.ph) * 0.5) * dt; l.s.position.y += l.v.y * dt; (l.s.material as THREE.SpriteMaterial).rotation = Math.sin(t * 4 + l.ph); if (l.s.position.y < 0.05 || l.life > 6) { scene.remove(l.s); leaves.splice(i, 1); } }
    flies.forEach((b, i) => { const ph = t * (0.35 + i * 0.07) + b.ph; b.group.position.set(Math.sin(ph) * (hw * 0.8), 1.6 + Math.sin(ph * 2.3) * 0.6 + i * 0.4, -0.6 + Math.cos(ph * 1.7) * 0.9); b.group.rotation.y = Math.atan2(Math.cos(ph), -Math.sin(ph * 1.7) * 0.5); b.update(t + i); });
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
    id: 'fruit', sim, ctl: a.ctl, start: a.start, input: () => steer(a.ctl.read()), target: () => targetX, worldX,
    screenOf: (x: number, y: number, z = 0) => { const v = new THREE.Vector3(x, y, z).project(camera); const r = renderer.domElement.getBoundingClientRect(); return { x: r.left + (v.x * 0.5 + 0.5) * r.width, y: r.top + (-v.y * 0.5 + 0.5) * r.height }; },
    finishNow: () => { (sim as unknown as { state: string }).state = 'done'; },
  };
}
