/**
 * Firefighter Fuzzy — the 3D campsite at dusk: a pond with a stone rim and reeds, the runaway campfire, four cottages whose
 * windows glow and smoke when they burn (charred black when lost, sparkling when saved), bushes, flickering flames that
 * grow and spread, a Fuzzy with a hose — the water stream arcs onto the flame you're spraying — a water-tank bar, a SPRAY
 * button (Space / a held finger). Rules: games/fire.ts; scene, HUD, loop and chrome: land/mgScene.ts.
 */
import * as THREE from 'three';
import { createArcade, std, add, sfx, vac, lerp, type MiniSetup, type MiniHooks } from '../mgScene';
import { adventure } from '../adventures';
import { cottage, rockGeo, rockMat } from './sceneArt';
import { bush } from './orchardArt';
import { FireSim, CAMP, POND, POND_R, CAMPFIRE, TANK, MOVE, type Flame, type Cottage } from './fire';

export function run(stage: HTMLElement, setup: MiniSetup, hooks: MiniHooks): void {
  const adv = adventure('fire')!;
  const sim = new FireSim(setup.variant, setup.seed);
  const a = createArcade(stage, {
    cls: 'fire', setup, adv, hooks, buttonLabel: 'Grab the hose!',
    hud: { count: 'FIRES OUT' },
    camera: { fov: 44, back: 9.5, up: 10, lookDy: -2.6, lead: 0 },
    world: { size: { hw: CAMP.hw + 2, hd: CAMP.hd + 2 }, path: false, fence: false, flowers: 8, sky: 'dusk' },
    controls: { mouseSteer: false },
    onStart: () => sim.start(),
  });
  const { scene, time } = a;
  // ---- the campsite ----
  const charcoal = std('#2a2622', 1);
  const pond = new THREE.Mesh(new THREE.CircleGeometry(POND_R, 36).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#2f8fc4', roughness: 0.08, metalness: 0.2, transparent: true, opacity: 0.9 })); pond.position.set(POND.x, 0.03, POND.z); scene.add(pond);
  for (let i = 0; i < 16; i++) { const an = (i / 16) * Math.PI * 2; add(scene, rockGeo(i + 70, 0.24 + (i % 3) * 0.06), rockMat(), POND.x + Math.cos(an) * (POND_R + 0.1), 0.12, POND.z + Math.sin(an) * (POND_R + 0.1), false); }
  for (let i = 0; i < 8; i++) { const an = (i / 8) * Math.PI * 2 + 0.3; add(scene, new THREE.CylinderGeometry(0.03, 0.045, 0.9, 5), std('#5f9a3f', 0.8), POND.x + Math.cos(an) * (POND_R + 0.5), 0.45, POND.z + Math.sin(an) * (POND_R + 0.5), false); }
  const camp = new THREE.Group(); camp.position.set(CAMPFIRE.x, 0, CAMPFIRE.z);
  for (let i = 0; i < 8; i++) { const an = (i / 8) * Math.PI * 2; add(camp, rockGeo(i + 90, 0.18), rockMat(), Math.cos(an) * 0.6, 0.1, Math.sin(an) * 0.6, false); }
  for (let i = 0; i < 3; i++) { const l = add(camp, new THREE.CylinderGeometry(0.08, 0.08, 0.9, 7).rotateZ(Math.PI / 2), charcoal, 0, 0.12, 0, false); l.rotation.y = i * 1.05; }
  scene.add(camp);
  for (const o of sim.obstacles) if (o.kind === 'circle' && o.r === 0.45) { const b = bush(Math.round(o.x * 7 + o.z), 0.7); b.position.set(o.x, 0, o.z); scene.add(b); }
  // cottages
  const winOff = new THREE.MeshStandardMaterial({ color: '#bfe3ff', roughness: 0.08, metalness: 0.35, emissive: '#ffd99a', emissiveIntensity: 0.12 });
  type CotNode = { c: Cottage; g: THREE.Group; wins: THREE.Mesh[]; smokeT: number; shown: string };
  const cotNodes: CotNode[] = sim.cottages.map((c) => {
    const g = new THREE.Group(); g.position.set(c.x, 0, c.z);
    const home = cottage({ w: c.hw * 2, d: c.hd * 2, h: 2.4, wall: ['#f6efe2', '#f2e3cc', '#eef0e2'][c.id % 3], roof: ['#c4524c', '#5f7fa8', '#b8743a'][c.id % 3], seed: c.id + 4 }); g.add(home);
    const wins = (home.userData.windows ?? []) as THREE.Mesh[];
    scene.add(g); return { c, g, wins, smokeT: 0, shown: 'fine' };
  });
  const winOn = new THREE.MeshStandardMaterial({ color: '#ffb347', emissive: '#ff7a1a', emissiveIntensity: 1.4 });
  // ---- flames ----
  const flameMats = [new THREE.MeshBasicMaterial({ color: '#ff5a1f', transparent: true, opacity: 0.95 }), new THREE.MeshBasicMaterial({ color: '#ffa726', transparent: true, opacity: 0.95 }), new THREE.MeshBasicMaterial({ color: '#ffe082', transparent: true, opacity: 0.9 })];
  const glowMat = new THREE.MeshBasicMaterial({ color: '#ff8a3d', transparent: true, opacity: 0.35, depthWrite: false });
  type FlameNode = { f: Flame; g: THREE.Group; cones: THREE.Mesh[]; glow: THREE.Mesh; gone: number };
  const flameNodes = new Map<number, FlameNode>();
  const makeFlame = (f: Flame): FlameNode => {
    const g = new THREE.Group(); g.position.set(f.x, 0, f.z);
    const cones = [0, 1, 2].map((i) => { const m = new THREE.Mesh(new THREE.ConeGeometry(0.42 - i * 0.12, 1.1 - i * 0.25, 7), flameMats[i]); m.position.y = (1.1 - i * 0.25) / 2; g.add(m); return m; });
    const glow = new THREE.Mesh(new THREE.CircleGeometry(0.9, 18).rotateX(-Math.PI / 2), glowMat); glow.position.y = 0.025; g.add(glow);
    scene.add(g); const n = { f, g, cones, glow, gone: -1 }; flameNodes.set(f.id, n); return n;
  };
  for (const f of sim.flames) makeFlame(f);
  // ---- you, the hose and the water ----
  const me = a.figure(setup.you.skin, 0.3);
  me.group.position.set(sim.you.pos.x, 0, sim.you.pos.z);
  const helmet = add(me.fuzzy.group, new THREE.SphereGeometry(0.33, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), std('#e8473c', 0.5), 0, 0.22, 0, false); helmet.scale.set(1.05, 0.75, 1.1);
  add(helmet, new THREE.BoxGeometry(0.2, 0.06, 0.12), std('#ffd34a', 0.5), 0, 0.2, 0.3, false);
  const nozzle = new THREE.Group(); add(nozzle, new THREE.CylinderGeometry(0.05, 0.07, 0.5, 8).rotateX(Math.PI / 2), std('#c9c9c9', 0.4), 0, 0, 0.25, false); add(nozzle, new THREE.TorusGeometry(0.09, 0.03, 6, 12), std('#e8473c', 0.6), 0, 0, 0.05, false);
  nozzle.position.set(0.3, 0.35, 0.3); me.group.add(nozzle);
  const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.12, 1, 8).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#7cc8ff', transparent: true, opacity: 0.75, roughness: 0.2 })); stream.visible = false; scene.add(stream);
  const tankBack = add(me.fuzzy.group, new THREE.CylinderGeometry(0.16, 0.16, 0.5, 10), std('#e8473c', 0.5), 0, 0.05, -0.32, false); tankBack.rotation.x = 0.1;
  a.camTarget.set(sim.you.pos.x, 0, sim.you.pos.z);
  // ---- HUD ----
  const meter = document.createElement('div'); meter.className = 'mg-meter';
  const bar = document.createElement('div'); bar.className = 'bar'; const fill = document.createElement('i'); bar.append(fill);
  const label = document.createElement('b'); label.textContent = 'WATER'; meter.append(bar, label); a.hud.append(meter);
  const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'mg-action'; btn.textContent = a.mobile ? 'SPRAY' : 'SPRAY (Space)'; a.hud.append(btn);
  let btnHeld = false, sceneHeld = false, moved = false, down = { x: 0, y: 0 }, forcedHold = false;
  btn.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); btnHeld = true; });
  const btnUp = () => { btnHeld = false; }; btn.addEventListener('pointerup', btnUp); btn.addEventListener('pointercancel', btnUp); btn.addEventListener('pointerleave', btnUp);
  const onDown = (e: PointerEvent) => { if ((e.target as HTMLElement).closest('button, .mg-intro, .race-paused')) return; sceneHeld = true; moved = false; down = { x: e.clientX, y: e.clientY }; };
  const onMove = (e: PointerEvent) => { if (sceneHeld && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 12) moved = true; };
  const onUp = () => { sceneHeld = false; };
  a.root.addEventListener('pointerdown', onDown); a.root.addEventListener('pointermove', onMove); addEventListener('pointerup', onUp); addEventListener('pointercancel', onUp);
  a.tip('go', a.mobile ? 'Walk up to a flame and hold SPRAY. Big fires first — they spread. Refill at the pond' : 'Walk up to a flame and hold Space. Big fires first — they spread to the cottages. Refill at the pond', 5500);
  a.run((dt, input) => {
    const hold = forcedHold || btnHeld || a.ctl.action || (sceneHeld && !moved);
    sim.step(dt, input, hold);
    for (const e of sim.events) {
      if (e.kind === 'spray') { a.play(vac.tick); }
      else if (e.kind === 'out' && e.flame) { const n = flameNodes.get(e.flame.id); if (n) n.gone = 0; a.puff(new THREE.Vector3(e.flame.x, 0.6, e.flame.z), 8, '#ffffff'); a.float(e.flame.x, 1.6, e.flame.z, `+${e.value}${e.big ? ' big one!' : ''}`, e.big ? 'gold' : ''); a.play(e.big ? sfx.gold : sfx.collect); me.squash = 0.3; }
      else if (e.kind === 'spread' && e.flame) { makeFlame(e.flame); a.puff(new THREE.Vector3(e.flame.x, 0.3, e.flame.z), 3, '#ffa726'); }
      else if (e.kind === 'flare') { for (const f of sim.burning) if (!flameNodes.has(f.id)) makeFlame(f); a.banner('The embers flared up!', 'warn'); a.play(vac.bump); a.tip('flare', 'The campfire keeps flaring up for a while — keep at it', 3400); }
      else if (e.kind === 'catch' && e.cottage) { for (const f of sim.burning) if (!flameNodes.has(f.id)) makeFlame(f); a.banner('A cottage is on fire!', 'warn'); a.play(vac.bump); a.tip('catch', 'Put out the flames on the cottage before it burns down (25 s)', 4000); }
      else if (e.kind === 'saved' && e.cottage) { a.banner(`Cottage saved! +${e.value}`, 'combo'); a.sparks(new THREE.Vector3(e.cottage.x, 2.5, e.cottage.z), 18); a.play(sfx.level); }
      else if (e.kind === 'lost' && e.cottage) { a.banner(`A cottage burned down −${e.value}`, 'warn'); a.play(vac.bump); for (const f of sim.flames) if (f.cottage === e.cottage.id) { const n = flameNodes.get(f.id); if (n) n.gone = 0; } a.puff(new THREE.Vector3(e.cottage.x, 2, e.cottage.z), 14, '#444'); }
      else if (e.kind === 'empty') { a.banner('Tank empty — refill at the pond', 'warn'); a.play(vac.bump); a.tip('empty', 'The pond is the blue circle — stand by it to refill', 3600); }
      else if (e.kind === 'refill') { a.play(vac.tick); }
      else if (e.kind === 'refilled') { a.float(sim.you.pos.x, 1.4, sim.you.pos.z, 'tank full!'); a.play(sfx.collect); }
      else if (e.kind === 'allout') { a.banner(`Fire's out! +${e.value} time bonus`, 'combo'); a.play(sfx.level); a.finish(sim.result(), 'FIRE’S OUT!'); }
      else if (e.kind === 'bump') { me.squash = 0.3; }
      else if (e.kind === 'warn') a.warn(e.n!);
    }
  }, (dt) => {
    const p = sim.you.pos;
    me.group.position.set(p.x, 0, p.z); me.group.rotation.y = sim.you.heading;
    a.walk(me, Math.min(1, sim.you.speed / MOVE.max), dt);
    a.camTarget.lerp(new THREE.Vector3(p.x, 0, p.z), Math.min(1, dt * 6));
    // the water stream
    if (sim.spraying && sim.target) {
      const from = new THREE.Vector3(); nozzle.getWorldPosition(from); const to = new THREE.Vector3(sim.target.x, 0.5, sim.target.z);
      const mid = from.clone().lerp(to, 0.5); const len = from.distanceTo(to);
      stream.visible = true; stream.position.copy(mid); stream.scale.set(1, 1, len); stream.lookAt(to); stream.position.y += 0.15;
      if (Math.random() < dt * 20) a.chips(to.clone().setY(0.6), 1, '#7cc8ff');
      me.squash = 0.15 + Math.sin(time.value * 20) * 0.05;
    } else stream.visible = false;
    nozzle.rotation.x = lerp(nozzle.rotation.x, sim.spraying ? -0.3 : 0, Math.min(1, dt * 8));
    // flames flicker, grow, go out
    for (const [id, n] of flameNodes) {
      if (n.gone >= 0) { n.gone += dt; const k = Math.min(1, n.gone / 0.35); n.g.scale.setScalar(Math.max(0.001, 1 - k)); if (k >= 1) { scene.remove(n.g); flameNodes.delete(id); } continue; }
      if (n.f.state !== 'burning') { n.gone = 0; continue; }
      const s = 0.35 + n.f.size * 0.9; n.g.scale.set(s, s * (1 + Math.sin(time.value * 14 + n.f.id) * 0.12), s);
      n.cones.forEach((c, i) => { c.rotation.y += dt * (2 + i); c.scale.x = 1 + Math.sin(time.value * 17 + i * 2 + n.f.id) * 0.15; });
      (n.glow.material as THREE.MeshBasicMaterial).opacity = 0.25 + Math.sin(time.value * 9 + n.f.id) * 0.1;
      if (Math.random() < dt * 3 * n.f.size) a.sparks(new THREE.Vector3(n.f.x, 0.8 + n.f.size, n.f.z), 1);
    }
    for (const n of cotNodes) {
      const st = n.c.state;
      if (st !== n.shown) { n.shown = st; for (const w of n.wins) w.material = st === 'burning' ? winOn : winOff; if (st === 'lost') n.g.traverse((o) => { if (o instanceof THREE.Mesh) o.material = charcoal; }); }
      if (st === 'burning') { n.smokeT -= dt; if (n.smokeT <= 0) { n.smokeT = 0.25; a.puff(new THREE.Vector3(n.c.x + (Math.random() - 0.5), 3.4, n.c.z + (Math.random() - 0.5)), 1, '#555'); } }
      if (st === 'lost') n.g.scale.y = lerp(n.g.scale.y, 0.75, Math.min(1, dt * 2));
    }
    // HUD: water
    const pct = Math.round((sim.tank / TANK) * 100); fill.style.width = `${pct}%`;
    const low = sim.tank < 20;
    meter.className = `mg-meter ${low ? 'hot' : sim.spraying ? 'warm' : ''}`;
    label.textContent = sim.tank <= 0 ? 'EMPTY — REFILL AT THE POND' : low ? `WATER ${pct}% — refill soon` : sim.atPond && sim.tank < TANK ? 'refilling…' : `WATER ${pct}%`;
    btn.classList.toggle('on', !!sim.inFront() && sim.tank > 0 && !sim.spraying);
    const burningCot = sim.cottages.filter((c) => c.state === 'burning').length;
    a.setScore(sim.score);
    a.setCount(String(sim.out), burningCot ? `${burningCot} cottage${burningCot === 1 ? '' : 's'} on fire!` : `${sim.burning.length} fire${sim.burning.length === 1 ? '' : 's'} burning`);
    a.setTime(sim.clock.left);
    if (sim.state === 'done') a.finish(sim.result(), sim.allOut ? 'FIRE’S OUT!' : 'TIME!');
  });
  const cleanup = () => { a.root.removeEventListener('pointermove', onMove); removeEventListener('pointerup', onUp); removeEventListener('pointercancel', onUp); };
  const origFinish = hooks.onFinish; hooks.onFinish = (res) => { cleanup(); origFinish(res); };
  const origQuit = hooks.onQuit; hooks.onQuit = () => { cleanup(); origQuit(); };
  if (import.meta.env.DEV) (window as unknown as { __mg: unknown }).__mg = { id: 'fire', sim, ctl: a.ctl, start: a.start, setHold: (b: boolean) => { forcedHold = b; }, finishNow: () => { (sim as unknown as { state: string }).state = 'done'; } };
}
