/**
 * Fishing Frenzy — the 3D lake: a plank jetty, reeds and lily pads, shoals rippling where the fish are, your Fuzzy with a rod,
 * the line and the bobber (flies out on a cast, bobs, trembles as the ripples build, dips on the bite, comes in as you reel),
 * the fish's shadow thrashing under the water, the rod bending with the tension, the catch leaping into the bucket. One line
 * at the top always says what to do (TAP TO CAST · wait… · HOOK NOW! · REEL / LET GO). Rules: games/fishing.ts.
 */
import * as THREE from 'three';
import { createArcade, std, add, sfx, vac, lerp, type MiniSetup, type MiniHooks } from '../mgScene';
import { adventure } from '../adventures';
import { FishingSim, LAKE, CAST_TIME, type FishKind, type Shoal } from './fishing';

const FISH: Record<FishKind, { color: string; size: number; name: string }> = {
  minnow: { color: '#b8c4d0', size: 0.5, name: 'Minnow' }, perch: { color: '#7aa84f', size: 0.7, name: 'Perch' },
  trout: { color: '#e08aa0', size: 0.9, name: 'Trout' }, carp: { color: '#ffc94a', size: 1.1, name: 'Golden carp' },
};

export function run(stage: HTMLElement, setup: MiniSetup, hooks: MiniHooks): void {
  const adv = adventure('fishing')!;
  const sim = new FishingSim(setup.variant, setup.seed);
  const a = createArcade(stage, {
    cls: 'fishing', setup, adv, hooks, buttonLabel: 'Cast off!',
    hud: { count: 'CAUGHT' },
    camera: { fov: 46, back: 6.5, up: 5.2, lookDy: -9, lookY: 0.3, lead: 0 },
    world: { size: { hw: LAKE.hw + 6, hd: LAKE.far + 6 }, path: false, fence: false, flowers: 16, fog: ['#dbeef5', 30, 90] },
    controls: { touch: false, mouseSteer: false, actionKeys: [' ', 'enter', 'e'] },
    onStart: () => sim.start(),
  });
  const { scene, time, camera } = a;
  a.camTarget.set(0, 0, 1.2);
  // ---- the lake (z < 0) ----
  const water = new THREE.Mesh(new THREE.PlaneGeometry(LAKE.hw * 2 + 30, LAKE.far + 30).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#3a8fc4', roughness: 0.18, metalness: 0.15, transparent: true, opacity: 0.9 }));
  water.position.set(0, 0.02, -(LAKE.far + 30) / 2 + 0.6); scene.add(water);
  const shoreMat = std('#cdb98a', 0.95);
  const shore = new THREE.Mesh(new THREE.PlaneGeometry(LAKE.hw * 2 + 30, 1.4).rotateX(-Math.PI / 2), shoreMat); shore.position.set(0, 0.025, 0.3); scene.add(shore);
  const reedMat = std('#5f9a3f', 0.8), padMat = std('#4f9a48', 0.7);
  for (let i = 0; i < 26; i++) { const x = -LAKE.hw - 2 + (i / 26) * (LAKE.hw * 2 + 4) + Math.sin(i * 7) * 0.5; if (Math.abs(x) < 1.6) continue; const h = 0.9 + (i % 3) * 0.25; add(scene, new THREE.CylinderGeometry(0.03, 0.045, h, 5), reedMat, x, h / 2, -0.4 - (i % 2) * 0.5); if (i % 3 === 0) add(scene, new THREE.CylinderGeometry(0.06, 0.06, 0.25, 6), std('#6b4a2b', 0.9), x, h + 0.1, -0.4 - (i % 2) * 0.5, false); }
  for (let i = 0; i < 9; i++) { const p = new THREE.Mesh(new THREE.CircleGeometry(0.35 + (i % 3) * 0.1, 14, 0.3, 5.6).rotateX(-Math.PI / 2), padMat); p.position.set(-LAKE.hw + 1 + ((i * 2.3) % (LAKE.hw * 2 - 2)), 0.035, -LAKE.near - 0.5 - ((i * 1.7) % 4)); scene.add(p); if (i % 4 === 0) add(scene, new THREE.SphereGeometry(0.12, 8, 6), std('#ff8fb4', 0.6), p.position.x + 0.1, 0.12, p.position.z, false); }
  // the jetty: posts + planks from the shore out over the water
  const plank = std('#a97c50', 0.9), post = std('#7a5634', 0.9);
  for (let i = 0; i < 7; i++) add(scene, new THREE.BoxGeometry(1.8, 0.08, 0.42), plank, 0, 0.42, 1.6 - i * 0.47 + 0.0);
  for (const sx of [-1, 1]) for (const z of [1.5, 0.2, -1.1]) add(scene, new THREE.CylinderGeometry(0.09, 0.1, 0.9, 8), post, sx * 0.8, 0.1, z);
  // a bucket for the catch
  const bucket = new THREE.Group(); bucket.position.set(0.7, 0.46, 1.3);
  add(bucket, new THREE.CylinderGeometry(0.22, 0.17, 0.3, 12, 1, true), new THREE.MeshStandardMaterial({ color: '#8a8f99', roughness: 0.4, metalness: 0.5, side: THREE.DoubleSide }), 0, 0.15, 0);
  add(bucket, new THREE.CylinderGeometry(0.19, 0.19, 0.02, 12), std('#2f6f9f', 0.3), 0, 0.26, 0, false);
  scene.add(bucket);
  // ---- you, facing the lake, with a rod ----
  const me = a.figure(setup.you.skin, 0.3); me.group.position.set(-0.25, 0.46, 0.1); me.group.rotation.y = Math.PI;
  const rod = new THREE.Group(); rod.position.set(0.3, 0.25, 0.2);
  add(rod, new THREE.CylinderGeometry(0.018, 0.03, 1.9, 6), std('#5a3b1e', 0.7), 0, 0.95, 0, false);
  add(rod, new THREE.CylinderGeometry(0.06, 0.06, 0.1, 8), std('#8a8f99', 0.4), 0, 0.35, 0.05, false);
  rod.rotation.x = 0.9; me.group.add(rod);
  const tipLocal = new THREE.Vector3(0, 1.9, 0); const tip = new THREE.Vector3();
  const rodTip = () => { rod.updateWorldMatrix(true, false); return tip.copy(tipLocal).applyMatrix4(rod.matrixWorld); };
  const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()]);
  const lineMat = new THREE.LineBasicMaterial({ color: '#f8f8f8', transparent: true, opacity: 0.85 });
  const line = new THREE.Line(lineGeo, lineMat); line.visible = false; scene.add(line);
  // the bobber
  const bob = new THREE.Group();
  add(bob, new THREE.SphereGeometry(0.13, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), std('#ff3b3b', 0.4), 0, 0, 0, false);
  add(bob, new THREE.SphereGeometry(0.13, 12, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), std('#ffffff', 0.4), 0, 0, 0, false);
  add(bob, new THREE.CylinderGeometry(0.015, 0.015, 0.22, 6), std('#ffffff', 0.4), 0, 0.2, 0, false);
  bob.visible = false; scene.add(bob);
  // the fish shadow under the water + the fish that leaps out
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.5, 16).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#0b2e45', transparent: true, opacity: 0.45, depthWrite: false })); shadow.scale.set(1, 1, 0.5); shadow.visible = false; shadow.position.y = 0.03; scene.add(shadow);
  const fishModel = (k: FishKind) => { const f = FISH[k]; const g = new THREE.Group(); const m = new THREE.MeshStandardMaterial({ color: f.color, roughness: 0.3, metalness: k === 'carp' ? 0.6 : 0.2, emissive: k === 'carp' ? '#6b4a00' : '#000', emissiveIntensity: 0.3 }); const body = add(g, new THREE.SphereGeometry(0.22, 12, 8), m, 0, 0, 0, false); body.scale.set(1.8, 0.9, 0.7); const tail = add(g, new THREE.ConeGeometry(0.16, 0.3, 3), m, -0.46, 0, 0, false); tail.rotation.z = Math.PI / 2; tail.scale.z = 0.4; add(g, new THREE.SphereGeometry(0.04, 6, 5), std('#111', 0.3), 0.28, 0.05, 0.1, false); g.scale.setScalar(f.size); return g; };
  type Leap = { g: THREE.Group; t: number; from: THREE.Vector3 };
  let leap: Leap | null = null;
  // ripple rings (bite build-up, shoals, splashes)
  const ringGeo = new THREE.RingGeometry(0.9, 1, 28).rotateX(-Math.PI / 2);
  type Ring = { m: THREE.Mesh; t: number; max: number; big: number };
  const rings: Ring[] = [];
  const ring = (x: number, z: number, big = 1.2, color = '#ffffff') => { const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7, depthWrite: false })); m.position.set(x, 0.04, z); m.scale.setScalar(0.1); scene.add(m); rings.push({ m, t: 0, max: 1.3, big }); };
  // shoals: three rings + two little shadows circling
  type ShoalNode = { s: Shoal; g: THREE.Group; shadows: THREE.Mesh[]; next: number };
  const shoalNodes = new Map<number, ShoalNode>();
  const makeShoal = (s: Shoal): ShoalNode => { const g = new THREE.Group(); g.position.set(s.x, 0.03, s.z); const shadows: THREE.Mesh[] = []; for (let i = 0; i < 3; i++) { const sh = new THREE.Mesh(new THREE.CircleGeometry(0.18 + FISH[s.kind].size * 0.12, 10).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: s.kind === 'carp' ? '#8a6a10' : '#0b2e45', transparent: true, opacity: 0.4, depthWrite: false })); sh.scale.set(1.6, 1, 0.6); g.add(sh); shadows.push(sh); } scene.add(g); const n = { s, g, shadows, next: 0 }; shoalNodes.set(s.id, n); return n; };
  // ---- HUD: the instruction line + the button ----
  const meter = document.createElement('div'); meter.className = 'mg-meter';
  const bar = document.createElement('div'); bar.className = 'bar'; const fill = document.createElement('i'); bar.append(fill);
  const label = document.createElement('b'); meter.append(bar, label); a.hud.append(meter);
  const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'mg-action'; a.hud.append(btn);
  let holding = false, btnHeld = false;
  const press = () => { if (!a.started() || a.paused()) return; if (sim.phase === 'idle') { if (sim.castAuto()) a.play(vac.tick); } else if (sim.press()) { /* hook or spook — the events say which */ } };
  btn.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); btnHeld = true; press(); });
  const btnUp = () => { btnHeld = false; };
  btn.addEventListener('pointerup', btnUp); btn.addEventListener('pointercancel', btnUp); btn.addEventListener('pointerleave', btnUp);
  const onDown = (e: PointerEvent) => { if ((e.target as HTMLElement).closest('button, .mg-intro, .race-paused')) return; holding = true; };
  const onUp = () => { holding = false; };
  a.root.addEventListener('pointerdown', onDown); addEventListener('pointerup', onUp); addEventListener('pointercancel', onUp);
  a.onAction(press);
  const ray = new THREE.Raycaster(); const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); const hit = new THREE.Vector3();
  a.onTap((ndc) => {
    if (!a.started()) return;
    if (sim.phase === 'idle') { ray.setFromCamera(new THREE.Vector2(ndc.x, ndc.y), camera); if (ray.ray.intersectPlane(plane, hit) && hit.z < -LAKE.near + 0.5) { if (sim.cast(hit.x, hit.z)) a.play(vac.tick); } else if (sim.castAuto()) a.play(vac.tick); }
    else sim.press();
  });
  a.tip('go', a.mobile ? 'Tap the water where the fish ripple to cast — then wait for the float to dip' : 'Click the water where the fish ripple to cast (or press Space) — then wait for the float to dip', 5000);
  const castFrom = new THREE.Vector3(); let rippleT = 0, snapFlash = 0;
  a.run((dt) => {
    const hold = holding || btnHeld || a.ctl.action;
    sim.step(dt, hold);
    for (const e of sim.events) {
      if (e.kind === 'cast') { castFrom.copy(rodTip()); bob.visible = true; line.visible = true; if (e.shoal) a.tip('shoal', `Right in the ${FISH[e.shoal.kind].name.toLowerCase()} shoal!`, 2500); }
      else if (e.kind === 'ripple') { a.tip('ripple', 'Ripples — get ready, the float is about to dip', 2500); }
      else if (e.kind === 'bite') { a.flash('HOOK!', 'go'); a.play(() => vac.combo(2)); a.puff(new THREE.Vector3(sim.float.x, 0.1, sim.float.z), 4, '#ffffff'); ring(sim.float.x, sim.float.z, 1.6); }
      else if (e.kind === 'hook') { a.banner(e.perfect ? 'PERFECT hook! ×1.5' : 'Hooked!', 'combo'); a.play(e.perfect ? sfx.gold : sfx.collect); me.squash = 0.4; a.tip('reel', a.mobile ? 'Hold REEL while the fish is calm — let go when it thrashes' : 'Hold Space (or the button) while the fish is calm — let go when it thrashes', 4500); }
      else if (e.kind === 'spooked') { a.banner('Too early — it swam off', 'warn'); a.play(vac.bump); for (let i = 0; i < 3; i++) ring(sim.float.x, sim.float.z, 1 + i * 0.5); a.tip('spook', 'Wait for the float to dip before you hook', 3200); }
      else if (e.kind === 'escaped') { a.banner('Too slow — it got away', 'warn'); a.play(vac.bump); a.tip('late', 'Hook the moment the float dips', 3200); }
      else if (e.kind === 'snapped') { a.banner('SNAP! The line broke', 'warn'); a.play(vac.bump); snapFlash = 0.5; a.tip('snap', 'When the line goes red, let go for a moment', 3600); }
      else if (e.kind === 'tension') { a.play(vac.tick); }
      else if (e.kind === 'catch' && e.fish) { const f = fishModel(e.fish); f.position.set(sim.float.x, 0, sim.float.z); scene.add(f); leap = { g: f, t: 0, from: new THREE.Vector3(sim.float.x, 0, sim.float.z) }; a.float(sim.float.x, 1.2, sim.float.z, `+${e.value} ${FISH[e.fish].name}${e.perfect ? ' ×1.5' : ''}`, e.fish === 'carp' ? 'gold' : ''); a.sparks(new THREE.Vector3(sim.float.x, 0.6, sim.float.z), e.fish === 'carp' ? 20 : 8); a.play(e.fish === 'carp' ? sfx.gold : sfx.collect); me.squash = 0.5; if (e.fish === 'carp') a.banner('A GOLDEN CARP! +' + e.value, 'combo'); }
      else if (e.kind === 'shoal' && e.shoal) { makeShoal(e.shoal); }
      else if (e.kind === 'warn') a.warn(e.n!);
    }
  }, (dt) => {
    // shoals: drifting shadows + ripples now and then
    for (const [id, n] of shoalNodes) {
      if (!sim.shoals.includes(n.s)) { n.g.scale.multiplyScalar(0.9); if (n.g.scale.x < 0.05) { scene.remove(n.g); shoalNodes.delete(id); } continue; }
      n.shadows.forEach((sh, i) => { const an = time.value * (0.8 + i * 0.2) + i * 2.1; sh.position.set(Math.cos(an) * 0.6, 0, Math.sin(an) * 0.45); sh.rotation.y = -an; });
      n.next -= dt; if (n.next <= 0) { n.next = 0.9 + Math.random() * 0.8; ring(n.s.x, n.s.z, 1.3, n.s.kind === 'carp' ? '#ffd34a' : '#ffffff'); }
    }
    for (let i = rings.length - 1; i >= 0; i--) { const r = rings[i]; r.t += dt; const k = r.t / r.max; r.m.scale.setScalar(0.1 + k * r.big); (r.m.material as THREE.MeshBasicMaterial).opacity = 0.7 * (1 - k); if (k >= 1) { scene.remove(r.m); rings.splice(i, 1); } }
    // the bobber, the line and the rod
    const ph = sim.phase; const tipW = rodTip();
    if (ph === 'casting') { const k = 1 - sim.phaseT / CAST_TIME; bob.position.set(lerp(castFrom.x, sim.float.x, k), lerp(castFrom.y, 0.05, k) + Math.sin(k * Math.PI) * 1.8, lerp(castFrom.z, sim.float.z, k)); if (k > 0.98) { a.puff(new THREE.Vector3(sim.float.x, 0.1, sim.float.z), 3, '#ffffff'); ring(sim.float.x, sim.float.z, 1); } }
    else if (ph === 'waiting') { bob.position.set(sim.float.x, 0.05 + Math.sin(time.value * 2.2) * 0.03 + (sim.ripple > 0 ? (Math.random() - 0.5) * 0.08 * sim.ripple : 0), sim.float.z); if (sim.ripple > 0) { rippleT -= dt; if (rippleT <= 0) { rippleT = 0.35; ring(sim.float.x, sim.float.z, 0.9); } } }
    else if (ph === 'bite') { bob.position.set(sim.float.x, -0.2 + Math.sin(time.value * 30) * 0.05, sim.float.z); }
    else if (ph === 'reeling') { const k = sim.progress; const x = lerp(sim.float.x, tipW.x, k * 0.85), z = lerp(sim.float.z, tipW.z - 0.8, k * 0.85); bob.position.set(x + (sim.calm ? 0 : (Math.random() - 0.5) * 0.25), 0.02 + (sim.calm ? 0 : -0.1), z + (sim.calm ? 0 : (Math.random() - 0.5) * 0.25)); shadow.visible = true; shadow.position.set(x + Math.sin(time.value * (sim.calm ? 2 : 14)) * (sim.calm ? 0.2 : 0.5), 0.03, z + 0.3); shadow.rotation.y = Math.sin(time.value * (sim.calm ? 2 : 14)) * 0.6; }
    else { shadow.visible = false; if (ph === 'idle') { bob.visible = false; line.visible = false; } }
    rod.rotation.x = lerp(rod.rotation.x, ph === 'reeling' ? 0.9 - sim.tension * 0.7 - (sim.calm ? 0 : 0.15) : ph === 'casting' ? 0.4 : 0.9, Math.min(1, dt * 8));
    if (line.visible) { const pos = lineGeo.attributes.position as THREE.BufferAttribute; const mid = tipW.clone().lerp(bob.position, 0.5); mid.y -= ph === 'reeling' ? 0.1 + (1 - sim.tension) * 0.4 : 0.6; pos.setXYZ(0, tipW.x, tipW.y, tipW.z); pos.setXYZ(1, mid.x, mid.y, mid.z); pos.setXYZ(2, bob.position.x, bob.position.y + 0.1, bob.position.z); pos.needsUpdate = true; lineMat.color.set(ph === 'reeling' && sim.tension > 0.7 ? '#ff5c3a' : snapFlash > 0 ? '#ff5c3a' : '#f8f8f8'); }
    snapFlash = Math.max(0, snapFlash - dt);
    if (leap) { leap.t += dt; const k = Math.min(1, leap.t / 0.9); const to = bucket.position; leap.g.position.set(lerp(leap.from.x, to.x, k), Math.sin(k * Math.PI) * 2.2 + k * 0.6, lerp(leap.from.z, to.z, k)); leap.g.rotation.z = -k * 2 + Math.sin(time.value * 20) * 0.3; if (k >= 1) { scene.remove(leap.g); leap = null; } }
    a.walk(me, 0, dt);
    // the instruction line
    let text = 'TAP TO CAST', cls = '';
    if (ph === 'idle') text = a.mobile ? 'TAP THE WATER TO CAST' : 'CLICK THE WATER TO CAST';
    else if (ph === 'casting') text = 'casting…';
    else if (ph === 'waiting') { text = sim.ripple > 0 ? 'READY…' : 'wait for the dip…'; cls = sim.ripple > 0 ? 'warm' : ''; }
    else if (ph === 'bite') { text = 'HOOK NOW!'; cls = 'hot'; }
    else if (ph === 'reeling') { text = sim.calm ? (a.mobile ? 'HOLD REEL' : 'HOLD SPACE — REEL') : 'LET GO — it’s thrashing!'; cls = sim.calm ? 'warm' : 'hot'; }
    else if (ph === 'landed') text = 'nice catch!';
    else text = 'it got away…';
    if (label.textContent !== text) label.textContent = text;
    meter.className = `mg-meter ${cls}`;
    fill.style.width = ph === 'reeling' ? `${Math.round(sim.tension * 100)}%` : ph === 'waiting' ? `${Math.round(sim.ripple * 100)}%` : '0%';
    const bt = ph === 'idle' ? 'CAST' : ph === 'bite' ? 'HOOK!' : ph === 'reeling' ? 'REEL' : ph === 'waiting' ? 'wait…' : '…';
    if (btn.textContent !== bt) btn.textContent = bt;
    btn.classList.toggle('on', ph === 'bite' || (ph === 'reeling' && sim.calm));
    a.setScore(sim.score);
    a.setCount(String(sim.caught), sim.bestFish ? `best: ${FISH[sim.bestFish].name}` : '');
    a.setTime(sim.clock.left);
    if (sim.state === 'done') a.finish(sim.result());
  });
  const destroyExtra = () => { removeEventListener('pointerup', onUp); removeEventListener('pointercancel', onUp); };
  const origFinish = hooks.onFinish; hooks.onFinish = (r) => { destroyExtra(); origFinish(r); };
  const origQuit = hooks.onQuit; hooks.onQuit = () => { destroyExtra(); origQuit(); };
  if (import.meta.env.DEV) (window as unknown as { __mg: unknown }).__mg = { id: 'fishing', sim, ctl: a.ctl, start: a.start, press, screenOf: (x: number, z: number) => { const v = new THREE.Vector3(x, 0, z).project(camera); const r = a.renderer.domElement.getBoundingClientRect(); return { x: r.left + (v.x * 0.5 + 0.5) * r.width, y: r.top + (-v.y * 0.5 + 0.5) * r.height }; }, finishNow: () => { (sim as unknown as { state: string }).state = 'done'; } };
}
