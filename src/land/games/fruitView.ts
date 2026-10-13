/**
 * Fruit Catcher — the 3D orchard: fruit trees overhanging a path, the Fuzzy running along it with a basket, falling apples /
 * pears / strawberries / golden fruit / pinecones with soft shadows, catches that drop into the basket. Rules: games/fruit.ts;
 * scene, HUD, loop and chrome: land/mgScene.ts.
 */
import * as THREE from 'three';
import { createArcade, std, add, sfx, vac, lerp, type MiniSetup, type MiniHooks } from '../mgScene';
import { treeModel } from '../environment';
import { adventure } from '../adventures';
import { FruitSim, BASKET, SCORING, type Falling, type FruitKind } from './fruit';

export function run(stage: HTMLElement, setup: MiniSetup, hooks: MiniHooks): void {
  const adv = adventure('fruit')!;
  const sim = new FruitSim(setup.variant === 'golden' ? 'golden' : 'classic', setup.seed);
  const a = createArcade(stage, {
    cls: 'fruit', setup, adv, hooks, buttonLabel: 'Catch!',
    hud: { count: 'CAUGHT' },
    camera: { fov: 40, back: 11.5, up: 7.5, lookDy: -2.8, lead: 0 },
    world: { size: { hw: 9, hd: 6 }, path: true, fence: false, flowers: 22 },
    controls: { mouseSteer: true }, onStart: () => sim.start(),
  });
  const { scene, time } = a;
  // the orchard: a row of big fruit trees whose crowns hang over the path
  for (let i = -3; i <= 3; i++) {
    const t = treeModel(300 + i, time, 2.2 + ((i + 3) % 2) * 0.3);
    t.position.set(i * 3.1, 0, -2.2); t.rotation.y = i * 1.3;
    scene.add(t);
    // a few hanging fruit for looks
    for (let k = 0; k < 3; k++) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), std(k % 2 ? '#e8473c' : '#f2c14e', 0.5)); f.position.set(i * 3.1 + Math.sin(i * 3 + k * 2.1) * 1.3, 3.6 + Math.cos(k * 1.7 + i) * 0.7, -2.2 + Math.cos(i + k * 2.3) * 1.2); scene.add(f); }
  }
  // a second, farther row and a low wall at the back for depth
  for (let i = -3; i <= 2; i++) { const t = treeModel(400 + i, time, 1.8); t.position.set(i * 3.1 + 1.55, 0, -6.5); scene.add(t); }
  for (let x = -9; x <= 9; x += 1.5) add(scene, new THREE.BoxGeometry(1.4, 0.5, 0.4), std('#d9c9a8', 0.95), x, 0.25, 6.2, false);
  // the catching line: a soft lane marker on the path
  const lane = new THREE.Mesh(new THREE.PlaneGeometry(18, 0.12).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.25 })); lane.position.set(0, 0.03, 0); scene.add(lane);
  // the Fuzzy with a basket
  const me = a.figure(setup.you.skin, 0.3);
  const basket = new THREE.Group();
  add(basket, new THREE.CylinderGeometry(0.55, 0.42, 0.42, 14, 1, true), new THREE.MeshStandardMaterial({ color: '#c98b55', roughness: 0.9, side: THREE.DoubleSide }), 0, 0.21, 0);
  add(basket, new THREE.CylinderGeometry(0.42, 0.42, 0.05, 14), std('#a9743f', 0.95), 0, 0.03, 0, false);
  add(basket, new THREE.TorusGeometry(0.56, 0.05, 8, 20).rotateX(Math.PI / 2), std('#8a5a30', 0.9), 0, 0.42, 0, false);
  basket.position.set(0, 0.55, 0.55);
  me.group.add(basket);
  me.group.rotation.y = Math.PI; // facing the camera, basket held out in front
  me.group.position.set(0, 0, 0);
  // falling things
  const mats: Record<FruitKind, THREE.Material> = {
    apple: std('#e8473c', 0.45), pear: std('#c9d94a', 0.5), berry: std('#e02e5a', 0.45),
    gold: new THREE.MeshStandardMaterial({ color: '#ffd34a', roughness: 0.3, metalness: 0.6, emissive: '#6b4a00', emissiveIntensity: 0.35 }), cone: std('#8a5a30', 0.95),
  };
  const geo: Record<FruitKind, THREE.BufferGeometry> = {
    apple: new THREE.SphereGeometry(0.28, 14, 10).scale(1, 0.92, 1), pear: new THREE.SphereGeometry(0.26, 14, 10).scale(0.92, 1.25, 0.92), berry: new THREE.SphereGeometry(0.27, 12, 10).scale(1, 1.15, 1),
    gold: new THREE.SphereGeometry(0.3, 16, 12), cone: new THREE.DodecahedronGeometry(0.27, 0).scale(0.9, 1.2, 0.9),
  };
  const stemMat = std('#6f4b24', 0.9), leafMat = std('#5fb35a', 0.7);
  const shadowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d')!; const r = g.createRadialGradient(32, 32, 4, 32, 32, 30); r.addColorStop(0, 'rgba(0,0,0,.4)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
  const shadowMat = new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false });
  type Node = { it: Falling; m: THREE.Group; sh: THREE.Mesh; got: number };
  const nodes = new Map<number, Node>();
  const make = (it: Falling): Node => {
    const m = new THREE.Group();
    const body = new THREE.Mesh(geo[it.kind], mats[it.kind]); body.castShadow = !a.mobile; m.add(body);
    if (it.kind !== 'cone') { add(m, new THREE.CylinderGeometry(0.02, 0.03, 0.18, 6), stemMat, 0, 0.3, 0, false); if (it.kind !== 'gold') add(m, new THREE.SphereGeometry(0.08, 8, 6).scale(1.6, 0.4, 1), leafMat, 0.09, 0.33, 0, false); }
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9).rotateX(-Math.PI / 2), shadowMat); sh.position.y = 0.02; scene.add(sh);
    scene.add(m);
    const n = { it, m, sh, got: -1 }; nodes.set(it.id, n); return n;
  };
  a.tip('move', a.mobile ? 'Slide left and right under the fruit — dodge the pinecones' : 'A / D or the arrows run left and right — dodge the pinecones', 3600);
  a.onAction(() => { /* no action key: catching is all in the running */ });
  a.run((dt, input) => {
    sim.step(dt, input);
    for (const e of sim.events) {
      if (e.kind === 'catch' && e.item) { const n = nodes.get(e.item.id); if (n) n.got = 0; a.float(e.item.x, 1.6, 0, `+${e.value}${(e.mult ?? 1) > 1 ? ` ×${e.mult}` : ''}`, e.item.kind === 'gold' ? 'gold' : ''); a.play(e.item.kind === 'gold' ? sfx.gold : sfx.collect); me.squash = 0.35; if (e.item.kind === 'gold') { a.sparks(new THREE.Vector3(e.item.x, 1.2, 0), 12); a.tip('gold', 'Golden fruit! Worth 50 — and more with a chain', 3000); } }
      else if (e.kind === 'cone' && e.item) { const n = nodes.get(e.item.id); if (n) n.got = 0; a.chips(new THREE.Vector3(e.item.x, 1.1, 0.3), 8); a.banner('Ouch — a pinecone! −20', 'warn'); a.play(vac.bump); me.squash = 0.6; a.tip('cone', 'Pinecones knock the basket and break your chain — step aside', 3200); }
      else if (e.kind === 'miss' && e.item) { a.puff(new THREE.Vector3(e.item.x, 0.2, 0), 3, '#d9c9a8'); a.tip('miss', 'Missed one — watch the shadows on the path to see where fruit lands', 3600); }
      else if (e.kind === 'combo') { a.banner(`×${e.mult} CHAIN!`, 'combo'); a.play(() => vac.combo(e.n ?? 1)); }
      else if (e.kind === 'wave') { a.banner(e.n === 1 ? 'Faster!' : 'Even faster!', 'combo'); a.play(sfx.level); }
      else if (e.kind === 'warn') a.warn(e.n!);
    }
  }, (dt) => {
    // the Fuzzy: slides along the path, leans into the run, wobbles after a pinecone
    me.group.position.x = sim.x;
    me.group.rotation.z = lerp(me.group.rotation.z, -sim.vx * 0.03 + (sim.stun > 0 ? Math.sin(time.value * 30) * 0.12 : 0), Math.min(1, dt * 10));
    a.walk(me, Math.min(1, Math.abs(sim.vx) / BASKET.max), dt);
    basket.rotation.z = lerp(basket.rotation.z, sim.vx * 0.04, Math.min(1, dt * 8));
    // the fruit
    for (const it of sim.items) {
      let n = nodes.get(it.id);
      if (!n) { if (it.state !== 'air') continue; n = make(it); }
      if (n.got >= 0) {
        n.got += dt;
        const k = Math.min(1, n.got / 0.28);
        n.m.position.lerp(new THREE.Vector3(sim.x, 0.85, 0.55), Math.min(1, dt * 16));
        n.m.scale.setScalar(1 - k * 0.85);
        n.sh.visible = false;
        if (k >= 1) { scene.remove(n.m, n.sh); nodes.delete(it.id); }
        continue;
      }
      n.m.position.set(it.x, it.y, 0);
      n.m.rotation.y += it.spin * dt; n.m.rotation.z = it.state === 'air' ? Math.sin(time.value * 3 + it.id) * 0.3 : 0;
      n.sh.position.set(it.x, 0.02, 0); const s = 0.6 + Math.max(0, 1 - it.y / 7) * 0.6; n.sh.scale.set(s, 1, s); (n.sh.material as THREE.MeshBasicMaterial).opacity = 0.3 + Math.max(0, 1 - it.y / 7) * 0.5;
      if (it.state === 'ground') { n.m.position.y = it.r * 0.5; n.sh.visible = false; }
    }
    a.setScore(sim.score);
    a.setCount(String(sim.caught), sim.missed ? `${sim.missed} missed` : '');
    a.setTime(sim.clock.left);
    a.setCombo(sim.combo.chain, sim.combo.mult, sim.combo.next);
    if (sim.state === 'done') a.finish(sim.result());
  });
  if (import.meta.env.DEV) (window as unknown as { __mg: unknown }).__mg = { id: 'fruit', sim, ctl: a.ctl, start: a.start, finishNow: () => { (sim as unknown as { state: string }).state = 'done'; } };
  void SCORING;
}
