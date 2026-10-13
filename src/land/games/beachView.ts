/**
 * Beach Cleanup — the 3D beach: sand, a sea that really rolls in and out with the tide (foam line, wet sand), a lifeguard
 * chair, a parasol, rocks, the recycling bin; cans, bags, bottles and wrappers to bag; scuttling crabs with waving claws;
 * your Fuzzy with a litter bag that fills up; a HOP button (Space) to jump out of a crab's way. The HUD shows the bag.
 * Rules: games/beach.ts; scene, HUD, loop and chrome: land/mgScene.ts.
 */
import * as THREE from 'three';
import { createArcade, std, add, sfx, vac, lerp, type MiniSetup, type MiniHooks } from '../mgScene';
import { adventure } from '../adventures';
import { water, palm, rock } from './sceneArt';
import { BeachSim, BEACH, BIN, BAG, MOVE, HOP, type Litter, type LitterKind } from './beach';

export function run(stage: HTMLElement, setup: MiniSetup, hooks: MiniHooks): void {
  const adv = adventure('beach')!;
  const sim = new BeachSim(setup.variant, setup.seed);
  const a = createArcade(stage, {
    cls: 'beach', setup, adv, hooks, buttonLabel: 'Clean up!',
    hud: { count: 'BAGGED' },
    camera: { fov: 44, back: 9.5, up: 10, lookDy: -2.6, lead: 0 },
    world: { size: { hw: BEACH.hw + 3, hd: BEACH.hd + 3 }, ground: ['#efd9a8', '#e6c98f'], groundKind: 'sand', path: false, fence: false, treeLine: false, flowers: 0, fog: ['#dff0f7', 40, 120] },
    onStart: () => sim.start(),
  });
  const { scene, time } = a;
  // ---- the sea, moving with the tide ----
  const sea = water(BEACH.hw * 2 + 60, 40, { shallow: '#7fe0d4', deep: '#1f7fc4', depth: (_x, z) => (20 - z) / 14, waves: 0.05 }, time);
  sea.position.set(0, 0.03, -BEACH.hd - 20); scene.add(sea);
  const foam = new THREE.Mesh(new THREE.PlaneGeometry(BEACH.hw * 2 + 60, 0.5).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.75 })); foam.position.y = 0.16; scene.add(foam);
  const wet = new THREE.Mesh(new THREE.PlaneGeometry(BEACH.hw * 2 + 60, 4).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#d2b67c', roughness: 0.9, transparent: true, opacity: 0.8 })); wet.position.y = 0.02; scene.add(wet);
  // furniture from the rules
  const wood = std('#a97c50', 0.9), white = std('#f3f0e6', 0.8), rockMat = std('#9a948a', 0.95);
  const chair = new THREE.Group(); chair.position.set(-BEACH.hw + 2, 0, BEACH.hd - 2);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(chair, new THREE.BoxGeometry(0.08, 2.2, 0.08), white, sx * 0.5, 1.1, sz * 0.5);
  add(chair, new THREE.BoxGeometry(1.2, 0.08, 1.2), white, 0, 2.2, 0, false); add(chair, new THREE.BoxGeometry(1.2, 0.6, 0.08), std('#d6336c', 0.7), 0, 2.5, -0.55, false); scene.add(chair);
  add(scene, new THREE.CylinderGeometry(0.03, 0.03, 2.4, 6), wood, 2, 1.2, BEACH.hd - 2.2); const para = add(scene, new THREE.ConeGeometry(1.5, 0.5, 10, 1, true), new THREE.MeshStandardMaterial({ color: '#ff8fb4', roughness: 0.7, side: THREE.DoubleSide }), 2, 2.5, BEACH.hd - 2.2, false); void para;
  for (const [x, z, r] of [[-4, -1, 0.8], [6.5, 0.5, 0.6]]) { const m = rock(Math.round(x * 3 + z), r * 1.05, 'sand'); m.position.x = x; m.position.z = z; scene.add(m); }
  void rockMat;
  for (const [x, z, h] of [[-BEACH.hw - 1.8, BEACH.hd - 1, 4.4], [BEACH.hw + 1.8, BEACH.hd - 2.5, 5], [BEACH.hw + 2.5, -1, 4.2], [-BEACH.hw - 2.2, 1.5, 4.8]]) { const p = palm(Math.round(x * 5 + z), h); p.position.set(x, 0, z); scene.add(p); }
  const bin = new THREE.Group(); bin.position.set(BIN.x, 0, BIN.z);
  add(bin, new THREE.CylinderGeometry(0.42, 0.38, 1, 14), std('#2fa84f', 0.6), 0, 0.5, 0); add(bin, new THREE.CylinderGeometry(0.45, 0.45, 0.08, 14), std('#1f7a3a', 0.6), 0, 1.02, 0, false);
  add(bin, new THREE.TorusGeometry(0.3, 0.04, 6, 16), white, 0, 0.6, 0.42, false); scene.add(bin);
  const binGlow = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.3, 28).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#2fa84f', transparent: true, opacity: 0, depthWrite: false })); binGlow.position.set(BIN.x, 0.035, BIN.z); scene.add(binGlow);
  // ---- litter ----
  const mats: Record<LitterKind, THREE.Material> = { can: std('#e8473c', 0.3), bag: std('#ffffff', 0.9), bottle: new THREE.MeshStandardMaterial({ color: '#5fd3ff', roughness: 0.15, transparent: true, opacity: 0.8 }), wrapper: std('#ffc94a', 0.6) };
  const litterMesh = (l: Litter): THREE.Object3D => {
    const g = new THREE.Group();
    if (l.kind === 'can') { const m = add(g, new THREE.CylinderGeometry(0.11, 0.11, 0.34, 10), mats.can, 0, 0.11, 0, false); m.rotation.z = Math.PI / 2 + 0.3; }
    else if (l.kind === 'bottle') { add(g, new THREE.CylinderGeometry(0.1, 0.12, 0.42, 10), mats.bottle, 0, 0.1, 0, false).rotation.z = Math.PI / 2; add(g, new THREE.CylinderGeometry(0.05, 0.05, 0.12, 8), mats.bottle, 0.27, 0.1, 0, false).rotation.z = Math.PI / 2; }
    else if (l.kind === 'bag') { const m = add(g, new THREE.SphereGeometry(0.22, 8, 6), mats.bag, 0, 0.14, 0, false); m.scale.set(1.2, 0.7, 1); }
    else { const m = add(g, new THREE.BoxGeometry(0.3, 0.03, 0.2), mats.wrapper, 0, 0.03, 0, false); m.rotation.y = l.id; }
    g.position.set(l.x, 0, l.z); scene.add(g); return g;
  };
  const litterNodes = new Map<number, { l: Litter; m: THREE.Object3D; gone: number }>();
  for (const l of sim.litter) litterNodes.set(l.id, { l, m: litterMesh(l), gone: -1 });
  // ---- crabs ----
  const crabMat = std('#ff6b3d', 0.6);
  const crabNodes = sim.crabs.map((c) => { const g = new THREE.Group(); const body = add(g, new THREE.SphereGeometry(0.28, 10, 8), crabMat, 0, 0.2, 0); body.scale.set(1.3, 0.6, 1); for (const sx of [-1, 1]) { add(g, new THREE.SphereGeometry(0.12, 8, 6), crabMat, sx * 0.42, 0.22, 0.15, false); for (let i = 0; i < 3; i++) add(g, new THREE.CylinderGeometry(0.02, 0.02, 0.3, 5), crabMat, sx * (0.3 + i * 0.05), 0.1, -0.1 + i * 0.12, false).rotation.z = sx * 0.9; add(g, new THREE.SphereGeometry(0.04, 6, 5), std('#111', 0.3), sx * 0.1, 0.38, 0.2, false); } scene.add(g); return { c, g }; });
  // ---- you + the litter bag ----
  const me = a.figure(setup.you.skin, 0.3);
  me.group.position.set(sim.you.pos.x, 0, sim.you.pos.z);
  const bagMesh = add(me.group, new THREE.SphereGeometry(0.26, 10, 8), new THREE.MeshStandardMaterial({ color: '#4fa3ff', roughness: 0.8, transparent: true, opacity: 0.9 }), -0.34, 0.35, -0.05, false); bagMesh.scale.set(0.5, 0.5, 0.5);
  a.camTarget.set(sim.you.pos.x, 0, sim.you.pos.z);
  // HUD: the bag as chips + HOP button
  const chips = document.createElement('div'); chips.className = 'mg-chips'; a.hud.append(chips);
  const colors: Record<LitterKind, string> = { can: '#e8473c', bag: '#ffffff', bottle: '#5fd3ff', wrapper: '#ffc94a' };
  const repaintChips = () => { chips.replaceChildren(...Array.from({ length: BAG }, (_, i) => { const s = document.createElement('i'); const l = sim.bag[i]; s.style.background = l ? colors[l.kind] : 'rgba(255,255,255,.18)'; return s; })); };
  repaintChips();
  const hopBtn = document.createElement('button'); hopBtn.type = 'button'; hopBtn.className = 'mg-action'; hopBtn.textContent = a.mobile ? 'HOP' : 'HOP (Space)';
  const doHop = () => { if (!a.started() || a.paused()) return; sim.hop(); };
  hopBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); doHop(); }); a.hud.append(hopBtn);
  a.onAction(doHop);
  a.tip('go', a.mobile ? 'Walk over litter to bag it — the water line first, the tide takes it. Full bag → the green bin' : 'Walk over litter to bag it (WASD) — the water line first, the tide takes it. Full bag → the green bin. Space hops over crabs', 5600);
  a.run((dt, input) => {
    sim.step(dt, input);
    for (const e of sim.events) {
      if (e.kind === 'pick' && e.litter) { const n = litterNodes.get(e.litter.id); if (n) n.gone = 0; if (e.value) a.float(e.litter.x, 1.2, e.litter.z, `+${e.value}`); a.play(sfx.collect); me.squash = 0.25; repaintChips(); }
      else if (e.kind === 'full') { a.banner('Bag full — take it to the bin!', 'combo'); a.play(sfx.level); a.tip('full', 'The bin is the green one at the top of the beach (+60 for a full bag)', 3600); }
      else if (e.kind === 'empty') { repaintChips(); if (e.value) { a.float(BIN.x, 1.6, BIN.z, `+${e.value} full bag!`, 'gold'); a.sparks(new THREE.Vector3(BIN.x, 1.2, BIN.z), 12); a.play(sfx.gold); } else a.play(sfx.collect); me.squash = 0.3; }
      else if (e.kind === 'washed' && e.litter) { const n = litterNodes.get(e.litter.id); if (n) { scene.remove(n.m); litterNodes.delete(e.litter.id); } a.puff(new THREE.Vector3(e.litter.x, 0.2, e.litter.z), 4, '#ffffff'); if (sim.washed === 2) a.tip('wash', 'Litter in the wet sand gets washed away — grab the ones by the water first', 3800); }
      else if (e.kind === 'washup' && e.litter) { litterNodes.set(e.litter.id, { l: e.litter, m: litterMesh(e.litter), gone: -1 }); }
      else if (e.kind === 'pinch') { repaintChips(); for (const l of sim.sand) if (!litterNodes.has(l.id)) litterNodes.set(l.id, { l, m: litterMesh(l), gone: -1 }); for (const n of litterNodes.values()) if (n.l.state === 'sand') { n.m.position.set(n.l.x, 0, n.l.z); n.m.visible = true; n.gone = -1; n.m.scale.setScalar(1); } a.banner(`Ouch! A crab — ${e.n} piece${e.n === 1 ? '' : 's'} dropped`, 'warn'); a.play(vac.bump); me.squash = 0.7; a.tip('crab', a.mobile ? 'Tap HOP to jump over crabs' : 'Press Space to hop over crabs', 3400); }
      else if (e.kind === 'hop') { a.play(vac.tick); }
      else if (e.kind === 'tide') { a.banner(e.n ? 'Tide coming in!' : 'Tide going out', e.n ? 'warn' : ''); }
      else if (e.kind === 'bump') { me.squash = 0.3; }
      else if (e.kind === 'warn') a.warn(e.n!);
    }
  }, (dt) => {
    const p = sim.you.pos;
    me.group.position.set(p.x, sim.hopping > 0 ? Math.sin((1 - sim.hopping / HOP.time) * Math.PI) * 0.8 : 0, p.z); me.group.rotation.y = sim.you.heading;
    a.walk(me, sim.hopping > 0 ? 0 : Math.min(1, sim.you.speed / MOVE.max), dt);
    if (sim.daze > 0) me.fuzzy.group.rotation.z = Math.sin(time.value * 20) * 0.15; else me.fuzzy.group.rotation.z = lerp(me.fuzzy.group.rotation.z, 0, Math.min(1, dt * 8));
    const fill = sim.bag.length / BAG; bagMesh.scale.setScalar(0.5 + fill * 0.7); bagMesh.position.y = 0.35 + fill * 0.1;
    a.camTarget.lerp(new THREE.Vector3(p.x, 0, p.z), Math.min(1, dt * 6));
    // the tide
    const wz = sim.waterZ; sea.position.z = wz - 20 + Math.sin(time.value * 1.5) * 0.08; foam.position.z = wz + Math.sin(time.value * 1.5) * 0.08; wet.position.z = Math.min(wz + 2.2, -BEACH.hd + 4.2);
    for (const [id, n] of litterNodes) {
      if (n.gone >= 0) { n.gone += dt; const k = Math.min(1, n.gone / 0.25); n.m.position.y = k * 0.8; n.m.scale.setScalar(Math.max(0.001, 1 - k)); if (k >= 1) { n.m.visible = false; if (n.l.state !== 'sand') { scene.remove(n.m); litterNodes.delete(id); } } continue; }
      if (n.l.state === 'sand') { n.m.position.set(n.l.x, 0, n.l.z); if (n.l.z < wz) n.m.position.y = Math.sin(time.value * 4 + n.l.id) * 0.05 + 0.05; }
    }
    for (const n of crabNodes) { n.g.position.set(n.c.x, 0, n.c.z); n.g.rotation.y = n.c.vx > 0 ? -0.3 : 0.3; n.g.position.y = Math.abs(Math.sin(time.value * 16)) * 0.03; n.g.children[1].rotation.x = Math.sin(time.value * 10) * 0.4; n.g.children[2].rotation.x = -Math.sin(time.value * 10) * 0.4; }
    (binGlow.material as THREE.MeshBasicMaterial).opacity = sim.bag.length >= BAG ? 0.45 + Math.sin(time.value * 5) * 0.25 : 0;
    hopBtn.classList.toggle('on', sim.crabs.some((c) => Math.hypot(c.x - p.x, c.z - p.z) < 1.6));
    a.setScore(sim.score);
    a.setCount(String(sim.picked), sim.bag.length >= BAG ? 'bag full → bin!' : `bag ${sim.bag.length}/${BAG}`);
    a.setTime(sim.clock.left);
    if (sim.state === 'done') a.finish(sim.result());
  });
  if (import.meta.env.DEV) (window as unknown as { __mg: unknown }).__mg = { id: 'beach', sim, ctl: a.ctl, start: a.start, hop: doHop, finishNow: () => { (sim as unknown as { state: string }).state = 'done'; } };
}
