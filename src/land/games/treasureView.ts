/**
 * Island Treasure Hunt — the 3D beach: sand with the sea along the north edge, palms, rocks and a stranded boat (the rules'
 * furniture), shells on the sand, a treasure meter at the top (cold → warm → HOT, DIG!), a big DIG button on phones / Space on
 * computers, digging with flying sand, holes, chests and gems that pop out of the ground. Rules: games/treasure.ts; scene,
 * HUD, loop and chrome: land/mgScene.ts.
 */
import * as THREE from 'three';
import { createArcade, std, add, sfx, vac, lerp, type MiniSetup, type MiniHooks } from '../mgScene';
import { adventure } from '../adventures';
import { TreasureSim, BEACH, CHESTS, GEMS, SHELLS, DIG_TIME, MOVE, type Buried, type Shell } from './treasure';

export function run(stage: HTMLElement, setup: MiniSetup, hooks: MiniHooks): void {
  const adv = adventure('treasure')!;
  const sim = new TreasureSim(setup.variant, setup.seed);
  const a = createArcade(stage, {
    cls: 'treasure', setup, adv, hooks, buttonLabel: 'Start digging!',
    hud: { count: 'CHESTS' },
    camera: { fov: 42, back: 9.5, up: 10, lookDy: -2.4, lead: 0 },
    world: { size: { hw: BEACH.hw + 3, hd: BEACH.hd + 3 }, ground: ['#efd9a8', '#e6c98f'], path: false, fence: false, treeLine: false, flowers: 0, fog: ['#dff0f7', 40, 120] },
    onStart: () => sim.start(),
  });
  const { scene, time } = a;
  // ---- the sea along the north edge, with a foam line ----
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(BEACH.hw * 2 + 60, 40).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#3fa7d6', roughness: 0.25, metalness: 0.1, transparent: true, opacity: 0.92 }));
  sea.position.set(0, 0.03, -BEACH.hd - 20.5); scene.add(sea);
  const foam = new THREE.Mesh(new THREE.PlaneGeometry(BEACH.hw * 2 + 60, 0.5).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.7 }));
  foam.position.set(0, 0.04, -BEACH.hd - 0.6); scene.add(foam);
  const wet = new THREE.Mesh(new THREE.PlaneGeometry(BEACH.hw * 2 + 60, 1.6).rotateX(-Math.PI / 2), std('#d9bf86', 0.9)); wet.position.set(0, 0.02, -BEACH.hd + 0.3); scene.add(wet);
  // ---- furniture from the rules: palms (r 0.5), rocks (other circles), the boat (box) ----
  const trunkMat = std('#a97c50', 0.9), leafMat = std('#3f9a46', 0.8), rockMat = std('#9a948a', 0.95), hullMat = std('#6b4a2b', 0.85), paintMat = std('#f3f0e6', 0.8);
  for (const o of sim.obstacles) {
    if (o.kind === 'circle' && o.r === 0.5) {
      const g = new THREE.Group(); g.position.set(o.x, 0, o.z); const lean = (Math.sin(o.x * 3.1 + o.z) * 0.18);
      for (let i = 0; i < 5; i++) { const seg = add(g, new THREE.CylinderGeometry(0.16 - i * 0.015, 0.2 - i * 0.015, 0.9, 8), trunkMat, Math.sin(lean) * i * 0.8, 0.45 + i * 0.85, 0); seg.rotation.z = -lean; }
      const topX = Math.sin(lean) * 4, topY = 4.5;
      for (let i = 0; i < 7; i++) { const an = (i / 7) * Math.PI * 2; const leaf = add(g, new THREE.BoxGeometry(2.4, 0.06, 0.6), leafMat, topX + Math.cos(an) * 1.1, topY - 0.1, Math.sin(an) * 1.1, false); leaf.rotation.y = -an; leaf.rotation.z = -0.45; leaf.geometry = leaf.geometry.clone(); leaf.geometry.translate(0, 0, 0); }
      for (let i = 0; i < 3; i++) add(g, new THREE.SphereGeometry(0.16, 8, 6), std('#6b4a2b', 0.9), topX + Math.cos(i * 2.1) * 0.25, topY - 0.3, Math.sin(i * 2.1) * 0.25, false);
      scene.add(g);
    } else if (o.kind === 'circle') {
      const r = add(scene, new THREE.DodecahedronGeometry(o.r, 0), rockMat, o.x, o.r * 0.55, o.z); r.scale.set(1, 0.7, 1); r.rotation.set(Math.sin(o.x) * 0.3, o.z, 0);
    } else {
      const g = new THREE.Group(); g.position.set(o.x, 0, o.z);
      const hull = add(g, new THREE.BoxGeometry(o.hw * 2, 0.9, o.hd * 2), hullMat, 0, 0.45, 0); hull.rotation.z = 0.08;
      add(g, new THREE.BoxGeometry(o.hw * 2 + 0.1, 0.1, o.hd * 2 + 0.1), paintMat, 0, 0.9, 0, false);
      add(g, new THREE.BoxGeometry(0.2, 0.08, o.hd * 2 - 0.2), paintMat, -0.6, 0.6, 0, false); add(g, new THREE.BoxGeometry(0.2, 0.08, o.hd * 2 - 0.2), paintMat, 0.6, 0.6, 0, false);
      add(g, new THREE.CylinderGeometry(0.05, 0.06, 2.6, 6), trunkMat, 0.2, 1.8, 0, false);
      scene.add(g);
    }
  }
  // ---- shells ----
  const shellMat = std('#ffd8c2', 0.6), shellMat2 = std('#f7f1e8', 0.6);
  const shellNodes = new Map<number, { s: Shell; m: THREE.Mesh; got: number }>();
  for (const s of sim.shells) { const m = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.12, 7), s.id % 2 ? shellMat : shellMat2); m.position.set(s.x, 0.06, s.z); m.rotation.y = s.id; m.scale.set(1, 1, 0.8); scene.add(m); shellNodes.set(s.id, { s, m, got: -1 }); }
  // ---- you, with a little spade ----
  const me = a.figure(setup.you.skin, 0.3);
  me.group.position.set(sim.you.pos.x, 0, sim.you.pos.z); me.group.rotation.y = sim.you.heading;
  const spade = new THREE.Group(); add(spade, new THREE.CylinderGeometry(0.03, 0.03, 0.7, 6), trunkMat, 0, 0.35, 0, false); add(spade, new THREE.BoxGeometry(0.22, 0.26, 0.04), std('#8a8f99', 0.4), 0, 0.02, 0, false);
  spade.position.set(0.32, 0.2, 0.25); spade.rotation.z = -0.5; me.group.add(spade);
  a.camTarget.set(sim.you.pos.x, 0, sim.you.pos.z);
  // the "X" glow under your feet when the spot is hot
  const hotRing = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.78, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ffd34a', transparent: true, opacity: 0, depthWrite: false })); hotRing.position.y = 0.035; scene.add(hotRing);
  // holes, chests, gems
  const holeMat = std('#8a6a3a', 1), moundMat = std('#dcc08a', 0.95);
  const chestWood = std('#8a5a30', 0.8), chestGold = new THREE.MeshStandardMaterial({ color: '#ffd34a', metalness: 0.6, roughness: 0.3 });
  const gemMat = new THREE.MeshStandardMaterial({ color: '#5fd3ff', metalness: 0.2, roughness: 0.15, emissive: '#1a5a7a', emissiveIntensity: 0.4, transparent: true, opacity: 0.92 });
  type Pop = { g: THREE.Group; t: number; kind: 'chest' | 'gem' };
  const pops: Pop[] = [];
  const makeHole = (x: number, z: number) => { add(scene, new THREE.CircleGeometry(0.55, 18).rotateX(-Math.PI / 2), holeMat, x, 0.03, z, false); const m = add(scene, new THREE.SphereGeometry(0.4, 10, 7), moundMat, x + 0.7, 0, z + 0.2, false); m.scale.set(1, 0.4, 0.8); };
  const popOut = (b: Buried) => {
    const g = new THREE.Group(); g.position.set(b.x, 0.1, b.z);
    if (b.kind === 'chest') { add(g, new THREE.BoxGeometry(0.8, 0.5, 0.55), chestWood, 0, 0.25, 0); const lid = add(g, new THREE.BoxGeometry(0.82, 0.22, 0.57), chestWood, 0, 0.6, -0.1); lid.rotation.x = -0.7; add(g, new THREE.BoxGeometry(0.84, 0.08, 0.1), chestGold, 0, 0.3, 0.29, false); for (let i = 0; i < 5; i++) add(g, new THREE.CylinderGeometry(0.1, 0.1, 0.04, 10), chestGold, (i - 2) * 0.13, 0.52 + (i % 2) * 0.04, 0.05, false); }
    else { const m = add(g, new THREE.OctahedronGeometry(0.3, 0), gemMat, 0, 0.5, 0); m.scale.y = 1.4; }
    scene.add(g); pops.push({ g, t: 0, kind: b.kind });
  };
  // ---- HUD: the meter + the DIG button ----
  const meter = document.createElement('div'); meter.className = 'mg-meter';
  const bar = document.createElement('div'); bar.className = 'bar'; const fill = document.createElement('i'); bar.append(fill);
  const label = document.createElement('b'); label.textContent = 'COLD'; meter.append(bar, label); a.hud.append(meter);
  const digBtn = document.createElement('button'); digBtn.type = 'button'; digBtn.className = 'mg-action'; digBtn.textContent = a.mobile ? 'DIG' : 'DIG (Space)';
  digBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); doDig(); }); a.hud.append(digBtn);
  const doDig = () => { if (!a.started() || a.paused()) return; if (sim.dig()) { a.play(vac.tick); } };
  a.onAction(doDig);
  a.tip('go', a.mobile ? 'Walk around — the meter warms near treasure. When it says HOT, tap DIG' : 'Walk around — the meter warms near treasure. When it says HOT, press Space to dig', 5000);
  let digFx = 0;
  a.run((dt, input) => {
    sim.step(dt, input);
    for (const e of sim.events) {
      if (e.kind === 'find' && e.item) {
        makeHole(e.item.x, e.item.z); popOut(e.item);
        if (e.item.kind === 'chest') { a.banner(`Chest ${e.n} of ${CHESTS}! +${e.value}`, 'combo'); a.sparks(new THREE.Vector3(e.item.x, 0.8, e.item.z), 18); a.play(sfx.gold); me.squash = 0.5; }
        else { a.float(e.item.x, 1.3, e.item.z, `+${e.value} gem`, 'gold'); a.sparks(new THREE.Vector3(e.item.x, 0.8, e.item.z), 8); a.play(sfx.collect); me.squash = 0.3; }
      } else if (e.kind === 'miss') { makeHole(sim.holes[sim.holes.length - 1].x, sim.holes[sim.holes.length - 1].z); a.puff(new THREE.Vector3(sim.you.pos.x, 0.4, sim.you.pos.z), 5, '#dcc08a'); a.float(sim.you.pos.x, 1.2, sim.you.pos.z, 'nothing…'); a.tip('miss', 'Nothing there — only dig when the meter says HOT', 3600); }
      else if (e.kind === 'shell' && e.shell) { const n = shellNodes.get(e.shell.id); if (n) n.got = 0; a.float(e.shell.x, 1, e.shell.z, '+10'); a.play(sfx.collect); }
      else if (e.kind === 'hot') { a.tip('hot', a.mobile ? 'HOT! Tap DIG right here' : 'HOT! Press Space to dig right here', 3000); a.play(() => vac.combo(2)); }
      else if (e.kind === 'dig') { digFx = DIG_TIME; }
      else if (e.kind === 'done') { a.banner(`All ${CHESTS} chests! +${e.value} time bonus`, 'combo'); a.play(sfx.level); a.finish(sim.result(), 'FOUND!'); }
      else if (e.kind === 'bump') { me.squash = 0.3; }
      else if (e.kind === 'warn') a.warn(e.n!);
    }
  }, (dt) => {
    const p = sim.you.pos;
    me.group.position.set(p.x, 0, p.z); me.group.rotation.y = sim.you.heading;
    a.walk(me, Math.min(1, sim.you.speed / MOVE.max), dt);
    a.camTarget.lerp(new THREE.Vector3(p.x, 0, p.z), Math.min(1, dt * 6));
    // digging: the spade swings, sand flies, the Fuzzy bobs
    if (sim.digging > 0) { digFx -= dt; spade.rotation.z = -0.5 + Math.sin(time.value * 18) * 0.9; spade.rotation.x = -0.6; me.squash = 0.25 + Math.sin(time.value * 18) * 0.15; if (Math.random() < dt * 14) a.chips(new THREE.Vector3(p.x + Math.sin(sim.you.heading) * 0.4, 0.2, p.z + Math.cos(sim.you.heading) * 0.4), 2, '#e6c98f'); }
    else { spade.rotation.z = lerp(spade.rotation.z, -0.5, Math.min(1, dt * 8)); spade.rotation.x = lerp(spade.rotation.x, 0, Math.min(1, dt * 8)); }
    // the meter
    const h = sim.heat; fill.style.width = `${Math.round(h * 100)}%`;
    const hot = sim.hot; meter.classList.toggle('hot', hot); meter.classList.toggle('warm', !hot && sim.warm);
    label.textContent = hot ? 'HOT — DIG!' : sim.warm ? (sim.trend > 1e-4 ? 'WARMER…' : sim.trend < -1e-4 ? 'colder…' : 'WARM') : h > 0.15 ? (sim.trend > 1e-4 ? 'warmer' : 'cool') : 'COLD';
    digBtn.classList.toggle('on', hot); digBtn.disabled = sim.digging > 0;
    hotRing.position.set(p.x, 0.035, p.z); (hotRing.material as THREE.MeshBasicMaterial).opacity = hot ? 0.55 + Math.sin(time.value * 6) * 0.25 : 0; hotRing.rotation.y += dt;
    // shells and the things that popped out
    for (const n of shellNodes.values()) { if (n.got < 0) continue; n.got += dt; const k = Math.min(1, n.got / 0.3); n.m.position.y = 0.06 + k * 0.8; n.m.scale.setScalar(Math.max(0.001, 1 - k)); if (k >= 1 && n.m.parent) scene.remove(n.m); }
    for (let i = pops.length - 1; i >= 0; i--) { const q = pops[i]; q.t += dt; const up = Math.min(1, q.t / 0.5); q.g.position.y = 0.1 + Math.sin(up * Math.PI) * 0.9 + up * 0.1; q.g.rotation.y += dt * (q.kind === 'gem' ? 3 : 0.6); if (q.kind === 'gem' && q.t > 1.4) { q.g.scale.setScalar(Math.max(0.001, 1 - (q.t - 1.4) * 2.5)); if (q.t > 1.8) { scene.remove(q.g); pops.splice(i, 1); } } }
    a.setScore(sim.score);
    a.setCount(`${sim.chests}/${CHESTS}`, `${sim.gems}/${GEMS} gems · ${sim.shellsGot}/${SHELLS} shells`);
    a.setTime(sim.clock.left);
    if (sim.state === 'done' && !sim.allFound) a.finish(sim.result());
  });
  if (import.meta.env.DEV) (window as unknown as { __mg: unknown }).__mg = { id: 'treasure', sim, ctl: a.ctl, start: a.start, dig: doDig, finishNow: () => { (sim as unknown as { state: string }).state = 'done'; } };
}
