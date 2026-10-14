/**
 * Snowball Challenge — the 3D snowy yard: you at a wooden fence with a bucket of snowballs, pine trees, snow mounds, a
 * snowman, falling snowflakes; targets (ringed boards on posts, the sliding ones on sleds) rise out of the snow and duck
 * again; an aim ring follows the mouse / your last tap; snowballs arc from your paw and burst where they land; a hit flips
 * the board back with a splash. Rules: games/snowball.ts; scene, HUD, loop and chrome: land/mgScene.ts.
 */
import * as THREE from 'three';
import { createArcade, feed, std, add, sfx, vac, lerp, type MiniSetup, type MiniHooks } from '../mgScene';
import { BOTS } from './bots';
import { adventure } from '../adventures';
import { blob, cottage, treeRing } from './sceneArt';
import { paint as shade } from './orchardArt';
import { SnowballSim, YARD, YOU, type Target, type Ball } from './snowball';

/** where the town rivals stand at the fence beside you */
const RIVAL_SPOTS = [[{ x: -3.0, z: -1.6 }, { x: 3.0, z: -1.6 }, { x: -4.0, z: -2.7 }], [{ x: -1.4, z: -2.2 }, { x: 1.4, z: -2.2 }, { x: -1.9, z: -3.3 }]];
/** a click / tap this close (px) to a target's board or its foot throws at that target (leading a sliding one) */
const AIM_SLOP = 70;

export function run(stage: HTMLElement, setup: MiniSetup, hooks: MiniHooks): void {
  const adv = adventure('snowball')!;
  const sim = new SnowballSim(setup.variant, setup.seed);
  const portrait = setup.mobile && innerHeight > innerWidth;
  const a = createArcade(stage, {
    cls: 'snowball', setup, adv, hooks, buttonLabel: 'Throw!',
    rivals: { you: sim, make: () => new SnowballSim(setup.variant, setup.seed), bot: BOTS.snowball,
      pose: (_r: SnowballSim, i: number) => ({ ...RIVAL_SPOTS[portrait ? 1 : 0][i], heading: Math.PI, moving: 0 }) },
    hud: { count: 'HITS' },
    camera: portrait ? { fov: 62, back: 5.5, up: 4.2, lookDy: -10, lookY: 0.6, lead: 0 } : { fov: 50, back: 5, up: 3.4, lookDy: -10, lookY: 0.8, lead: 0 },
    world: { size: { hw: 11, hd: 17 }, ground: ['#f4f7fb', '#e6edf5'], path: false, fence: false, flowers: 0, sky: 'snow', fog: ['#e4edf5', 24, 60] },
    controls: { none: true },
    onStart: () => sim.start(),
  });
  const next = feed(sim); // events from taps / buttons between steps
  const { scene, time, camera } = a;
  a.camTarget.set(0, 0, -1);
  // ---- the yard ----
  const wood = std('#8a5a30', 0.9), snow = std('#ffffff', 0.95), coal = std('#222', 0.8);
  for (const sx of [-1, 1]) add(scene, new THREE.BoxGeometry(0.12, 1.1, 0.12), wood, sx * 2.2, 0.55, -1.2); for (let i = 0; i < 2; i++) add(scene, new THREE.BoxGeometry(4.6, 0.12, 0.08), wood, 0, 0.4 + i * 0.45, -1.2, false);
  // soft snow drifts (smooth, blue in the shade), a snow-roofed cottage and snowy pines behind the yard
  const driftMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75 });
  for (let i = 0; i < 9; i++) { const r = 0.8 + (i % 3) * 0.3; const geo = shade(blob(r, 2, 0.1, i), (_p, n, c) => c.set('#c9d9ec').lerp(new THREE.Color('#ffffff'), Math.max(0, n.y) * 0.9)); const m = add(scene, geo, driftMat, -9 + i * 2.3 + Math.sin(i) * 0.6, -0.3, -YARD.far - 1.5 - (i % 2) * 1.5); m.scale.y = 0.5; }
  { const c = cottage({ w: 3.6, d: 3, h: 2.4, roof: '#f4f8fd', wall: '#e9d3b4', seed: 9 }); c.position.set(-YARD.hw - 1.2, 0, -YARD.far - 4.5); c.rotation.y = 0.35; scene.add(c); }
  scene.add(treeRing([{ x: YARD.hw + 2.5, z: -YARD.far - 3, s: 1.2 }, { x: YARD.hw + 4.5, z: -YARD.far - 1, s: 1 }, { x: -YARD.hw - 4.5, z: -YARD.far - 2, s: 1.1 }, { x: 2, z: -YARD.far - 6, s: 1.3 }], 'snowpine'));
  const snowman = new THREE.Group(); snowman.position.set(YARD.hw + 1.6, 0, -6);
  add(snowman, new THREE.SphereGeometry(0.55, 12, 9), snow, 0, 0.5, 0); add(snowman, new THREE.SphereGeometry(0.4, 12, 9), snow, 0, 1.25, 0); add(snowman, new THREE.SphereGeometry(0.3, 12, 9), snow, 0, 1.8, 0);
  add(snowman, new THREE.ConeGeometry(0.07, 0.3, 6).rotateX(Math.PI / 2), std('#ff8c42', 0.6), 0, 1.8, 0.35, false); for (const sx of [-1, 1]) add(snowman, new THREE.SphereGeometry(0.04, 6, 4), coal, sx * 0.1, 1.9, 0.27, false);
  add(snowman, new THREE.CylinderGeometry(0.22, 0.22, 0.22, 10), coal, 0, 2.15, 0, false); scene.add(snowman);
  // a bucket of snowballs by your feet
  const bucket = new THREE.Group(); bucket.position.set(-0.9, 0, 0.2);
  add(bucket, new THREE.CylinderGeometry(0.32, 0.26, 0.4, 12, 1, true), new THREE.MeshStandardMaterial({ color: '#d6336c', roughness: 0.6, side: THREE.DoubleSide }), 0, 0.2, 0);
  for (let i = 0; i < 5; i++) add(bucket, new THREE.SphereGeometry(0.11, 8, 6), snow, Math.cos(i * 1.3) * 0.15, 0.42 + (i % 2) * 0.08, Math.sin(i * 1.3) * 0.15, false);
  scene.add(bucket);
  // falling snow (cheap sprites)
  const flakeMat = new THREE.SpriteMaterial({ color: '#ffffff', transparent: true, opacity: 0.85, depthWrite: false });
  const flakes: { s: THREE.Sprite; v: number; ph: number }[] = [];
  for (let i = 0; i < (a.mobile ? 40 : 80); i++) { const s = new THREE.Sprite(flakeMat); s.scale.setScalar(0.08 + Math.random() * 0.08); s.position.set((Math.random() - 0.5) * 24, Math.random() * 9, -Math.random() * 18 + 2); scene.add(s); flakes.push({ s, v: 0.6 + Math.random() * 0.6, ph: Math.random() * 6 }); }
  // ---- targets ----
  const post = std('#5a3b1e', 0.9), ringW = std('#ffffff', 0.5), ringR = std('#e8473c', 0.5), sledMat = std('#a97c50', 0.8), runner = std('#8a8f99', 0.4);
  type TNode = { t: Target; g: THREE.Group; board: THREE.Group; hitT: number };
  const nodes = new Map<number, TNode>();
  const make = (t: Target): TNode => {
    const g = new THREE.Group(); g.position.set(t.x, -1.3, t.z);
    add(g, new THREE.BoxGeometry(0.12, 1.3, 0.12), post, 0, 0.65, 0, false);
    const board = new THREE.Group(); board.position.y = 1.3;
    const R = t.kind === 'near' ? 0.75 : 0.85;
    [[R, ringW], [R * 0.72, ringR], [R * 0.45, ringW], [R * 0.2, ringR]].forEach(([r, m], i) => add(board, new THREE.CylinderGeometry(r as number, r as number, 0.06, 20).rotateX(Math.PI / 2), m as THREE.Material, 0, 0, i * 0.012, false));
    g.add(board);
    if (t.kind === 'moving') { add(g, new THREE.BoxGeometry(1.2, 0.12, 0.6), sledMat, 0, 0.1, 0, false); for (const sx of [-1, 1]) add(g, new THREE.BoxGeometry(1.4, 0.06, 0.06), runner, 0, 0.03, sx * 0.25, false); }
    scene.add(g); const n = { t, g, board, hitT: -1 }; nodes.set(t.id, n); return n;
  };
  // ---- you + snowballs + the aim ring ----
  const me = a.figure(setup.you.skin, 0.3); me.group.position.set(0.5, 0, 0.3); me.group.rotation.y = Math.PI; // facing the yard (−z)
  const scarf = add(me.fuzzy.group, new THREE.TorusGeometry(0.3, 0.07, 8, 16), std('#d6336c', 0.7), 0, -0.05, 0, false); scarf.rotation.x = Math.PI / 2 + 0.2;
  const ballGeo = new THREE.SphereGeometry(0.16, 10, 8);
  type BNode = { b: Ball; m: THREE.Mesh };
  const balls = new Map<number, BNode>();
  const rivalBalls = new Map<string, THREE.Mesh>();
  const aim = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.65, 28).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.55, depthWrite: false })); aim.position.set(0, 0.03, -6); scene.add(aim);
  const aimDot = new THREE.Mesh(new THREE.CircleGeometry(0.12, 12).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#d6336c', transparent: true, opacity: 0.8, depthWrite: false })); aimDot.position.y = 0.035; aim.add(aimDot);
  const ray = new THREE.Raycaster(); const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); const hit = new THREE.Vector3();
  const groundAt = (clientX: number, clientY: number): THREE.Vector3 | null => { const r = a.renderer.domElement.getBoundingClientRect(); ray.setFromCamera(new THREE.Vector2(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1), camera); return ray.ray.intersectPlane(plane, hit) ? hit.clone() : null; };
  const onMove = (e: PointerEvent) => { if (e.pointerType !== 'mouse') return; const t = targetNear(e.clientX, e.clientY); if (t) { const p = leadOf(t); aim.position.set(p.x, 0.03, p.z); return; } const g = groundAt(e.clientX, e.clientY); if (g) aim.position.set(g.x, 0.03, Math.min(-1.5, g.z)); };
  a.root.addEventListener('pointermove', onMove);
  const throwAt = (x: number, z: number): boolean => { const b = sim.throwAt(x, z); if (!b) return false; aim.position.set(b.to.x, 0.03, b.to.z); return true; };
  // aim help: you see the board, but the mouse ray meets the ground far behind it — so a click / tap near a target's board (or
  // its foot) throws at that target, a little ahead of a sliding one; anywhere else throws where the ground was clicked
  const wp = new THREE.Vector3();
  const targetNear = (cx: number, cy: number): Target | null => {
    const r = a.renderer.domElement.getBoundingClientRect(); let best: Target | null = null, bd = AIM_SLOP;
    for (const [, n] of nodes) {
      const t = n.t; if (t.hit || (t.state !== 'up' && t.state !== 'rising')) continue;
      for (const y of [0, 1]) {
        if (y) n.board.getWorldPosition(wp); else wp.set(t.x, 0.2, t.z);
        wp.project(camera); const d = Math.hypot(r.left + (wp.x * 0.5 + 0.5) * r.width - cx, r.top + (-wp.y * 0.5 + 0.5) * r.height - cy);
        if (d < bd) { bd = d; best = t; }
      }
    }
    return best;
  };
  const leadOf = (t: Target) => sim.predict(t, 0.45 + Math.hypot(t.x - YOU.x, t.z - YOU.z) * 0.065);
  a.onTap((_ndc, client) => {
    const t = targetNear(client.x, client.y);
    if (t) { const p = leadOf(t); if (!throwAt(p.x, p.z)) a.play(vac.tick); return; }
    const g = groundAt(client.x, client.y); if (g && !throwAt(g.x, g.z)) a.play(vac.tick);
  });
  const screenOf = (x: number, z: number) => { const v = new THREE.Vector3(x, 0.2, z).project(camera); const r = a.renderer.domElement.getBoundingClientRect(); return { x: r.left + (v.x * 0.5 + 0.5) * r.width, y: r.top + (-v.y * 0.5 + 0.5) * r.height }; };
  a.tip('go', a.mobile ? 'Tap where to throw — aim at the targets as they pop up. Sliding ones: throw a little ahead' : 'Click where to throw — aim at the targets as they pop up. Sliding ones: throw a little ahead of them', 5000);
  a.run((dt) => {
    for (const e of next(() => sim.step(dt))) {
      if (e.kind === 'throw' && e.ball) { const m = new THREE.Mesh(ballGeo, snow); scene.add(m); balls.set(e.ball.id, { b: e.ball, m }); a.play(vac.tick); me.squash = 0.3; }
      else if ((e.kind === 'hit' || e.kind === 'bullseye') && e.target && e.ball) { const n = nodes.get(e.target.id); if (n) n.hitT = 0; a.chips(new THREE.Vector3(e.ball.to.x, 1.3, e.ball.to.z), 10, '#ffffff'); a.float(e.target.x, 2.4, e.target.z, e.kind === 'bullseye' ? `BULLSEYE! +${e.value}` : `+${e.value}${e.target.kind === 'moving' ? ' slider!' : ''}`, e.kind === 'bullseye' || e.target.kind === 'moving' ? 'gold' : ''); a.play(e.kind === 'bullseye' ? sfx.gold : sfx.collect); if (e.kind === 'bullseye') a.sparks(new THREE.Vector3(e.target.x, 1.5, e.target.z), 10); if (e.target.kind === 'moving' && sim.targets.filter((t) => t.hit && t.kind === 'moving').length === 1) a.tip('slide', 'Nice lead! Sliders pay 40', 2600); }
      else if (e.kind === 'miss' && e.ball) { a.puff(new THREE.Vector3(e.ball.to.x, 0.15, e.ball.to.z), 5, '#ffffff'); if (sim.misses === 3) a.tip('miss', 'Far targets need a moment in the air — throw where they will be', 3600); }
      else if (e.kind === 'pop' && e.target) { make(e.target); if (e.target.kind === 'moving' && !sim.targets.some((t) => t.hit && t.kind === 'moving')) a.tip('slider', 'A sliding target — throw a little ahead of it', 3200); }
      else if (e.kind === 'warn') a.warn(e.n!);
    }
  }, (dt) => {
    // the town rivals' snowballs, thrown from their spots at the fence (each plays its own copy of the yard)
    a.rivals?.rivals.forEach((r, i) => {
      const from = RIVAL_SPOTS[portrait ? 1 : 0][i];
      for (const b of (r.sim as unknown as SnowballSim).balls) {
        const key = `${i}:${b.id}`; let m = rivalBalls.get(key);
        if (b.state === 'landed') { if (m) { scene.remove(m); rivalBalls.delete(key); a.puff(new THREE.Vector3(b.to.x, 0.2, b.to.z), 3, '#ffffff'); } continue; }
        if (!m) { m = new THREE.Mesh(ballGeo, snow); m.scale.setScalar(0.85); scene.add(m); rivalBalls.set(key, m); }
        const k = Math.min(1, b.t / b.time), d = Math.hypot(b.to.x - from.x, b.to.z - from.z);
        m.position.set(lerp(from.x, b.to.x, k), 0.6 + Math.sin(k * Math.PI) * (1.2 + d * 0.12), lerp(from.z, b.to.z, k));
      }
    });
    for (const [id, n] of nodes) {
      const t = n.t; n.g.position.set(t.x, -1.3 + t.up * 1.3, t.z);
      if (n.hitT >= 0) { n.hitT += dt; n.board.rotation.x = Math.min(1.4, n.hitT * 8); }
      else n.board.rotation.y = Math.sin(time.value * 2 + t.id) * 0.08;
      if (t.state === 'down') { scene.remove(n.g); nodes.delete(id); }
    }
    for (const [id, n] of balls) {
      const b = n.b; const k = Math.min(1, b.t / b.time); const d = Math.hypot(b.to.x - b.from.x, b.to.z - b.from.z);
      n.m.position.set(lerp(b.from.x + 0.5, b.to.x, k), 0.6 + Math.sin(k * Math.PI) * (1.2 + d * 0.12), lerp(b.from.z, b.to.z, k));
      if (b.state === 'landed') { scene.remove(n.m); balls.delete(id); }
    }
    for (const f of flakes) { f.s.position.y -= f.v * dt; f.s.position.x += Math.sin(time.value + f.ph) * dt * 0.3; if (f.s.position.y < 0) { f.s.position.y = 9; f.s.position.x = (Math.random() - 0.5) * 24; f.s.position.z = -Math.random() * 18 + 2; } }
    aim.scale.setScalar(1 + Math.sin(time.value * 4) * 0.06); (aim.material as THREE.MeshBasicMaterial).opacity = sim.cooldown > 0 ? 0.25 : 0.55;
    a.walk(me, 0, dt);
    a.setScore(sim.score);
    a.setCount(String(sim.hits), sim.bullseyes ? `${sim.bullseyes} bullseye${sim.bullseyes === 1 ? '' : 's'}` : '');
    a.setTime(sim.clock.left);
    if (sim.state === 'done') a.finish(sim.result());
  });
  const origFinish = hooks.onFinish; hooks.onFinish = (r) => { a.root.removeEventListener('pointermove', onMove); origFinish(r); };
  if (import.meta.env.DEV) (window as unknown as { __mg: unknown }).__mg = { id: 'snowball', sim, ctl: a.ctl, start: a.start, throwAt, screenOf, finishNow: () => { (sim as unknown as { state: string }).state = 'done'; } };
  void YOU;
}
