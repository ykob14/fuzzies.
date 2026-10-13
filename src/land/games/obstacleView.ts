/**
 * Fuzzy Obstacle Run — the 3D trail: the course scrolls towards the runner (things sit at z = −(distance ahead)), trees, bushes
 * and trail dashes recycle as they pass, logs / rocks / puddles / stars pop in from the fog, the Fuzzy leans into lane
 * changes, jumps, squashes on landing, trips on a bump, splashes through puddles. Rules: games/obstacle.ts; scene, HUD,
 * loop and chrome: land/mgScene.ts.
 */
import * as THREE from 'three';
import { createArcade, std, add, sfx, vac, lerp, type MiniSetup, type MiniHooks } from '../mgScene';
import { tree, trailTex } from './sceneArt';
import { adventure } from '../adventures';
import { RunSim, LANES, type Thing } from './obstacle';

const AHEAD = 70, BEHIND = 8;

export function run(stage: HTMLElement, setup: MiniSetup, hooks: MiniHooks): void {
  const adv = adventure('obstacle')!;
  const sim = new RunSim(setup.variant, setup.seed);
  const a = createArcade(stage, {
    cls: 'obstacle', setup, adv, hooks, buttonLabel: 'Run!',
    hud: { count: 'STARS' },
    camera: { fov: 52, back: 6.2, up: 3.8, lookDy: -9, lookY: 0.9, lead: 0 },
    world: { size: { hw: 14, hd: 40 }, path: false, fence: false, treeLine: false, flowers: 0, fog: ['#cfe6ee', 28, 72] },
    controls: { mouseSteer: false },
    onStart: () => sim.start(),
  });
  const { scene, time } = a;
  // ---- the trail: a long dirt strip with edge lines and dashes that scroll ----
  const TRAIL_L = AHEAD + BEHIND + 10, TILE = 6; const tt = trailTex(); tt.repeat.set(1, TRAIL_L / TILE);
  const trail = new THREE.Mesh(new THREE.PlaneGeometry(9.4, TRAIL_L).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: tt, transparent: true, depthWrite: false, roughness: 0.95 })); trail.position.set(0, 0.012, -(AHEAD - BEHIND) / 2); trail.receiveShadow = true; scene.add(trail);
  for (const sx of [-1, 1]) { const edge = new THREE.Mesh(new THREE.PlaneGeometry(0.18, AHEAD + BEHIND + 10).rotateX(-Math.PI / 2), std('#f3eadb', 0.9)); edge.position.set(sx * 3.6, 0.016, -(AHEAD - BEHIND) / 2); scene.add(edge); }
  type Scroller = { m: THREE.Object3D; d: number; span: number; x: number };
  const scrollers: Scroller[] = [];
  const dashMat = std('#e6d6b0', 0.9);
  for (let i = 0; i < 14; i++) for (const lx of [-1.1, 1.1]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 1.2).rotateX(-Math.PI / 2), dashMat); m.position.y = 0.015; scene.add(m); scrollers.push({ m, d: i * 6, span: 84, x: lx }); }
  // trees and bushes along both sides
  const nTrees = a.mobile ? 16 : 24;
  for (let i = 0; i < nTrees; i++) { const t = tree(i % 4 === 3 ? 'pine' : 'leafy', i, 0.95 + (i % 3) * 0.2, !a.mobile); const side = i % 2 ? 1 : -1; t.position.y = 0; scene.add(t); scrollers.push({ m: t, d: (i / nTrees) * 90 + ((i * 7) % 5), span: 90, x: side * (5.6 + ((i * 13) % 4) * 0.9) }); }
  const bushMat = std('#5fb35a', 0.8), flowerMats = [std('#ff8fb4', 0.6), std('#ffc94a', 0.6), std('#9fd3ff', 0.6)];
  for (let i = 0; i < 30; i++) { const g = new THREE.Group(); add(g, new THREE.SphereGeometry(0.28 + (i % 3) * 0.08, 8, 6), bushMat, 0, 0.2, 0, false); if (i % 2) add(g, new THREE.SphereGeometry(0.08, 6, 5), flowerMats[i % 3], 0.1, 0.42, 0.05, false); scene.add(g); scrollers.push({ m: g, d: (i / 30) * 80 + (i % 4), span: 80, x: (i % 2 ? 1 : -1) * (4.3 + ((i * 11) % 5) * 0.5) }); }
  // ---- things on the course ----
  const logMat = std('#8a5a30', 0.9), logEnd = std('#d9b27a', 0.9), rockMat = std('#9a948a', 0.95);
  const puddleMat = new THREE.MeshStandardMaterial({ color: '#4fa3d8', roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.8 });
  const gold = new THREE.MeshStandardMaterial({ color: '#ffd34a', metalness: 0.55, roughness: 0.3, emissive: '#5a3d00', emissiveIntensity: 0.25 });
  const goldBig = new THREE.MeshStandardMaterial({ color: '#ffe36b', metalness: 0.7, roughness: 0.2, emissive: '#8a5a00', emissiveIntensity: 0.6 });
  const starShape = new THREE.Shape();
  for (let i = 0; i < 10; i++) { const r = i % 2 ? 0.13 : 0.3; const an = (i / 10) * Math.PI * 2 - Math.PI / 2; if (i === 0) starShape.moveTo(Math.cos(an) * r, Math.sin(an) * r); else starShape.lineTo(Math.cos(an) * r, Math.sin(an) * r); }
  const starGeo = new THREE.ExtrudeGeometry(starShape, { depth: 0.1, bevelEnabled: false }); starGeo.center();
  const logGeo = new THREE.CylinderGeometry(0.3, 0.3, 2, 12).rotateZ(Math.PI / 2), logEndGeo = new THREE.CylinderGeometry(0.31, 0.31, 0.06, 12).rotateZ(Math.PI / 2);
  const rockGeo = new THREE.DodecahedronGeometry(0.62, 0), puddleGeo = new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2);
  type Node = { t: Thing; m: THREE.Object3D; gone: number };
  const nodes = new Map<number, Node>();
  const make = (t: Thing): Node => {
    let m: THREE.Object3D;
    if (t.kind === 'log') { const g = new THREE.Group(); const b = new THREE.Mesh(logGeo, logMat); b.castShadow = !a.mobile; g.add(b); for (const sx of [-1, 1]) { const e = new THREE.Mesh(logEndGeo, logEnd); e.position.x = sx * 1; g.add(e); } g.position.y = 0.3; m = g; }
    else if (t.kind === 'rock') { const r = new THREE.Mesh(rockGeo, rockMat); r.castShadow = !a.mobile; r.scale.set(1.1, 0.8, 1); r.rotation.set(0.3, t.id, 0); r.position.y = 0.4; m = r; }
    else if (t.kind === 'puddle') { const p = new THREE.Mesh(puddleGeo, puddleMat); p.scale.set(1.15, 1, 0.8); p.position.y = 0.02; m = p; }
    else { const s = new THREE.Mesh(starGeo, t.kind === 'gold' ? goldBig : gold); if (t.kind === 'gold') s.scale.setScalar(1.4); s.castShadow = !a.mobile; s.position.y = t.y; m = s; }
    m.position.x = LANES[t.lane]; scene.add(m);
    const n = { t, m, gone: -1 }; nodes.set(t.id, n); return n;
  };
  // ---- you ----
  const me = a.figure(setup.you.skin, 0.3);
  me.group.rotation.y = Math.PI;
  a.camTarget.set(0, 0, 0);
  let shake = 0, lean = 0;
  a.onAction(() => { if (a.started() && !a.paused()) sim.jump(); });
  a.tip('go', a.mobile ? 'Swipe left / right to change lane · swipe up to jump' : 'A / D or ← → change lane · Space, W or ↑ to jump', 4500);
  a.run((dt, input) => {
    sim.step(dt, input);
    for (const e of sim.events) {
      if (e.kind === 'star' && e.item) { const n = nodes.get(e.item.id); if (n) { n.gone = 0; } a.float(LANES[e.item.lane], e.item.y + 0.6, 0, `+${e.value}${(e.mult ?? 1) > 1 ? ` ×${e.mult}` : ''}`, e.item.kind === 'gold' ? 'gold' : ''); a.play(e.item.kind === 'gold' ? sfx.gold : sfx.collect); if (e.item.kind === 'gold') a.sparks(new THREE.Vector3(LANES[e.item.lane], e.item.y, 0), 12); }
      else if (e.kind === 'bump' && e.item) { const n = nodes.get(e.item.id); if (n) n.gone = 0; a.banner(e.item.kind === 'rock' ? 'Ouch! A rock — −40' : 'Tripped on a log — −40', 'warn'); a.play(vac.bump); me.squash = 0.7; shake = 0.5; a.chips(new THREE.Vector3(me.group.position.x, 0.5, 0), 6); a.tip(e.item.kind === 'rock' ? 'rock' : 'log', e.item.kind === 'rock' ? 'Rocks can’t be jumped — change lane' : 'Jump a moment before the log', 3400); }
      else if (e.kind === 'splash' && e.item) { a.banner('Splash! slower…', 'warn'); a.puff(new THREE.Vector3(me.group.position.x, 0.3, 0), 8, '#9fd3ff'); a.play(vac.tick); a.tip('puddle', 'Jump the puddles or go round them', 3200); }
      else if (e.kind === 'jump') { a.play(sfx.collect); }
      else if (e.kind === 'land') { me.squash = Math.max(me.squash, 0.35); a.puff(new THREE.Vector3(me.group.position.x, 0.1, 0), 3, '#e6d6b0'); }
      else if (e.kind === 'combo') { a.banner(`×${e.mult} CHAIN!`, 'combo'); a.play(() => vac.combo(e.n ?? 1)); }
      else if (e.kind === 'milestone') { a.float(me.group.position.x, 1.8, 0, `${e.n} m +${e.value}`, 'gold'); }
      else if (e.kind === 'speedup') { a.banner(e.n === 1 ? 'Faster!' : 'Full speed!', 'combo'); a.play(sfx.level); }
      else if (e.kind === 'warn') a.warn(e.n!);
    }
  }, (dt) => {
    // the runner
    const tx = sim.x; lean = lerp(lean, (tx - me.group.position.x) * 2.2, Math.min(1, dt * 10));
    me.group.position.set(tx, sim.y, 0);
    me.group.rotation.z = -lean * 0.5; me.group.rotation.x = sim.airborne ? -0.25 : 0;
    a.walk(me, sim.airborne ? 0 : Math.min(1.4, sim.speed / 8), dt);
    if (sim.slow > 0 && !sim.airborne) me.fuzzy.body.rotation.z += Math.sin(time.value * 25) * 0.08;
    shake = Math.max(0, shake - dt);
    a.camTarget.set(lerp(a.camTarget.x, tx * 0.6, Math.min(1, dt * 5)) + (shake > 0 ? (Math.random() - 0.5) * shake * 0.3 : 0), 0, 0);
    // scrolling scenery
    tt.offset.y = sim.dist / TILE; // the trail scrolls with the run
    for (const s of scrollers) { let rel = s.d - sim.dist; while (rel < -BEHIND) { s.d += s.span; rel += s.span; } while (rel > s.span - BEHIND) { s.d -= s.span; rel -= s.span; } s.m.position.x = s.x; s.m.position.z = -rel; s.m.visible = rel < AHEAD; }
    // things
    for (const t of sim.things) {
      const rel = t.d - sim.dist;
      let n = nodes.get(t.id);
      if (!n) { if (t.state !== 'ahead' || rel > AHEAD) continue; n = make(t); }
      if (n.gone >= 0) { n.gone += dt; const k = Math.min(1, n.gone / 0.25); if (n.t.kind === 'star' || n.t.kind === 'gold') { n.m.position.y = n.t.y + k * 1.2; n.m.scale.setScalar(Math.max(0.001, (n.t.kind === 'gold' ? 1.4 : 1) * (1 - k))); } else { n.m.rotation.z = Math.sin(n.gone * 30) * 0.2 * (1 - k); } if (k >= 1 && n.t.kind !== 'log' && n.t.kind !== 'rock') { scene.remove(n.m); nodes.delete(t.id); continue; } }
      n.m.position.z = -rel;
      if (n.t.kind === 'star' || n.t.kind === 'gold') { if (n.gone < 0) { n.m.rotation.y += dt * 3; n.m.position.y = n.t.y + Math.sin(time.value * 3 + n.t.id) * 0.06; } }
      if (rel < -BEHIND) { scene.remove(n.m); nodes.delete(t.id); }
    }
    for (const [id, n] of nodes) if (!sim.things.includes(n.t)) { scene.remove(n.m); nodes.delete(id); }
    a.setScore(sim.score);
    a.setCount(String(sim.stars + sim.golden), `${Math.round(sim.dist)} m`);
    a.setTime(sim.clock.left);
    a.setCombo(sim.combo.chain, sim.combo.mult, sim.combo.next);
    if (sim.state === 'done') a.finish(sim.result());
  });
  if (import.meta.env.DEV) (window as unknown as { __mg: unknown }).__mg = { id: 'obstacle', sim, ctl: a.ctl, start: a.start, jump: () => sim.jump(), finishNow: () => { (sim as unknown as { state: string }).state = 'done'; } };
}
