/**
 * Package Delivery — the 3D town square: cobbles, six colour-coded cottages with awnings and door mats that glow when you're
 * carrying their parcel, the depot counter with its parcel stack, lamp posts, a flower bed; your Fuzzy pulling a two-wheel
 * cart that swings on the corners, parcels stacked on it (and tumbling off on a crash), a floating arrow to the next door, and
 * a row of parcel chips in the HUD. Rules: games/delivery.ts; scene, HUD, loop and chrome: land/mgScene.ts.
 */
import * as THREE from 'three';
import { createArcade, std, add, sfx, vac, lerp, type MiniSetup, type MiniHooks } from '../mgScene';
import { adventure } from '../adventures';
import { DeliverySim, SQUARE, DEPOT, CART, type Parcel, type House } from './delivery';

const HOUSE_COLORS = ['#ff5c8a', '#ffc94a', '#4fa3ff', '#6fd36a', '#ff8c42', '#b48cff'];

export function run(stage: HTMLElement, setup: MiniSetup, hooks: MiniHooks): void {
  const adv = adventure('delivery')!;
  const sim = new DeliverySim(setup.variant, setup.seed);
  const a = createArcade(stage, {
    cls: 'delivery', setup, adv, hooks, buttonLabel: 'Deliver!',
    hud: { count: 'DELIVERED' },
    camera: { fov: 46, back: 10.5, up: 11, lookDy: -2.8, lead: 0 },
    world: { size: { hw: SQUARE.hw + 2, hd: SQUARE.hd + 2 }, path: false, fence: false, flowers: 10 },
    controls: { mouseSteer: false },
    onStart: () => sim.start(),
  });
  const { scene, time } = a;
  // ---- the square ----
  const cobble = new THREE.Mesh(new THREE.PlaneGeometry(SQUARE.hw * 2 + 1, SQUARE.hd * 2 + 1).rotateX(-Math.PI / 2), std('#cfc4b2', 0.95)); cobble.position.y = 0.012; cobble.receiveShadow = !a.mobile; scene.add(cobble);
  for (let i = 0; i < 50; i++) { const s = new THREE.Mesh(new THREE.CircleGeometry(0.16 + (i % 3) * 0.04, 8).rotateX(-Math.PI / 2), std(i % 2 ? '#c2b7a4' : '#d9cfbd', 0.95)); s.position.set(Math.sin(i * 12.9898) * (SQUARE.hw - 1), 0.02, Math.cos(i * 78.233) * (SQUARE.hd - 1)); scene.add(s); }
  const wallMat = std('#f6efe2', 0.9), roofMat = std('#8a5a30', 0.85), stone = std('#b9b4a6', 0.9), wood = std('#a97c50', 0.9);
  // houses from the rules, colour-coded
  type HouseNode = { h: House; mat: THREE.Mesh; glow: THREE.MeshBasicMaterial };
  const houseNodes: HouseNode[] = sim.houses.map((h) => {
    const g = new THREE.Group(); g.position.set(h.x, 0, h.z);
    const col = HOUSE_COLORS[h.color];
    add(g, new THREE.BoxGeometry(h.hw * 2, 2.6, h.hd * 2), wallMat, 0, 1.3, 0);
    const roof = add(g, new THREE.CylinderGeometry(0, Math.max(h.hw, h.hd) * 1.25, 1.5, 4), roofMat, 0, 2.6 + 0.75, 0); roof.rotation.y = Math.PI / 4; roof.scale.set(h.hw / Math.max(h.hw, h.hd), 1, h.hd / Math.max(h.hw, h.hd));
    // the door faces the door point: an awning + a coloured door + a mat that glows
    const dir = new THREE.Vector3(h.door.x - h.x, 0, h.door.z - h.z).normalize();
    const faceDist = Math.abs(dir.x) > 0.5 ? h.hw : h.hd;
    const door = add(g, new THREE.BoxGeometry(0.9, 1.4, 0.1), std(col, 0.6), dir.x * (faceDist + 0.05), 0.7, dir.z * (faceDist + 0.05), false); door.lookAt(door.position.clone().add(dir));
    const awning = add(g, new THREE.BoxGeometry(1.6, 0.08, 0.7), std(col, 0.8), dir.x * (faceDist + 0.35), 1.7, dir.z * (faceDist + 0.35), false); awning.lookAt(awning.position.clone().add(dir)); awning.rotation.x += 0.2;
    for (const sx of [-1, 1]) { const w = add(g, new THREE.BoxGeometry(0.6, 0.6, 0.1), std('#9fd3ff', 0.3), dir.x * (faceDist + 0.05) + (Math.abs(dir.x) > 0.5 ? 0 : sx * 1.1), 1.5, dir.z * (faceDist + 0.05) + (Math.abs(dir.x) > 0.5 ? sx * 1.1 : 0), false); w.lookAt(w.position.clone().add(dir)); }
    const glow = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0, depthWrite: false });
    const mat = new THREE.Mesh(new THREE.RingGeometry(0.5, 1.1, 28).rotateX(-Math.PI / 2), glow); mat.position.set(h.door.x, 0.03, h.door.z); scene.add(mat);
    const flag = add(g, new THREE.BoxGeometry(0.06, 1.2, 0.06), wood, dir.x * (faceDist + 0.6) + (Math.abs(dir.x) > 0.5 ? 0 : 1.2), 2.9, dir.z * (faceDist + 0.6) + (Math.abs(dir.x) > 0.5 ? 1.2 : 0), false);
    add(g, new THREE.BoxGeometry(0.5, 0.35, 0.04), std(col, 0.7), flag.position.x + 0.25, 3.3, flag.position.z, false);
    scene.add(g);
    return { h, mat, glow };
  });
  // depot: a counter with an awning and a parcel stack
  const depot = new THREE.Group(); depot.position.set(DEPOT.x, 0, SQUARE.hd - 0.5);
  add(depot, new THREE.BoxGeometry(3.6, 1, 1), wood, 0, 0.5, 0); for (const sx of [-1, 1]) add(depot, new THREE.CylinderGeometry(0.05, 0.05, 2.4, 6), wood, sx * 1.7, 1.2, -0.4, false);
  for (let i = 0; i < 8; i++) add(depot, new THREE.BoxGeometry(0.45, 0.06, 1.3), std(i % 2 ? '#ffffff' : '#d6336c', 0.8), -1.6 + i * 0.45 + 0.22, 2.4, -0.1, false);
  add(depot, new THREE.BoxGeometry(1.2, 0.5, 0.3), std('#f6efe2', 0.9), 0, 2.7, -0.4, false);
  const stack = new THREE.Group(); depot.add(stack); scene.add(depot);
  // the flower bed and the lamps
  add(scene, new THREE.CylinderGeometry(0.8, 0.9, 0.3, 20), stone, 0.5, 0.15, -0.5); add(scene, new THREE.CylinderGeometry(0.7, 0.7, 0.1, 20), std('#6f4f33', 1), 0.5, 0.33, -0.5, false);
  for (let i = 0; i < 9; i++) add(scene, new THREE.SphereGeometry(0.1, 7, 5), std(HOUSE_COLORS[i % 6], 0.6), 0.5 + Math.cos(i * 0.7) * 0.45, 0.5, -0.5 + Math.sin(i * 0.7) * 0.45, false);
  for (const [x, z] of [[-4.5, 2.5], [4.5, 2.5], [-4.5, -4], [4.5, -4]]) { add(scene, new THREE.CylinderGeometry(0.06, 0.09, 2.6, 8), stone, x, 1.3, z); add(scene, new THREE.SphereGeometry(0.2, 10, 8), new THREE.MeshStandardMaterial({ color: '#ffe9a8', emissive: '#ffb347', emissiveIntensity: 0.4 }), x, 2.7, z, false); }
  // ---- you + the cart ----
  const me = a.figure(setup.you.skin, 0.3);
  const cart = new THREE.Group();
  add(cart, new THREE.BoxGeometry(0.9, 0.08, 1.1), wood, 0, 0.42, 0); for (const sz of [-1, 1]) add(cart, new THREE.BoxGeometry(0.9, 0.3, 0.06), wood, 0, 0.6, sz * 0.52, false); for (const sx of [-1, 1]) add(cart, new THREE.BoxGeometry(0.06, 0.3, 1.1), wood, sx * 0.42, 0.6, 0, false);
  const wheels: THREE.Mesh[] = []; for (const sx of [-1, 1]) { const w = add(cart, new THREE.CylinderGeometry(0.3, 0.3, 0.1, 14).rotateZ(Math.PI / 2), std('#5a3b1e', 0.8), sx * 0.52, 0.3, 0, false); wheels.push(w); }
  add(cart, new THREE.CylinderGeometry(0.03, 0.03, 0.9, 6).rotateX(Math.PI / 2), wood, 0, 0.5, 0.95, false);
  cart.position.set(0, 0, -1.25); me.group.add(cart);
  const cartParcels: THREE.Mesh[] = [];
  const parcelGeo = new THREE.BoxGeometry(0.42, 0.34, 0.42);
  const parcelMat = (color: number) => new THREE.MeshStandardMaterial({ color: HOUSE_COLORS[color], roughness: 0.7 });
  const tape = std('#f6efe2', 0.6);
  const parcelMesh = (p: Parcel) => { const m = new THREE.Mesh(parcelGeo, parcelMat(sim.houses[p.house].color)); const t = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.08, 0.1), tape); t.position.y = 0.14; m.add(t); m.castShadow = !a.mobile; return m; };
  const repaintCart = () => { for (const m of cartParcels) cart.remove(m); cartParcels.length = 0; sim.cart.forEach((p, i) => { const m = parcelMesh(p); m.position.set((i % 2 ? 0.2 : -0.2) * (i < 2 ? 1 : 0), 0.63 + Math.floor(i / 2) * 0.34, i < 2 ? (i % 2 ? 0.25 : -0.25) : 0); cart.add(m); cartParcels.push(m); }); };
  const repaintStack = () => { while (stack.children.length) stack.remove(stack.children[0]); sim.waiting.forEach((p, i) => { const m = parcelMesh(p); m.position.set(-0.9 + i * 0.6, 1.17, 0.1); m.rotation.y = i * 0.3; stack.add(m); }); };
  repaintStack();
  // parcels on the ground and the ones tumbling off
  type Ground = { p: Parcel; m: THREE.Mesh; t: number; from: THREE.Vector3 };
  const groundNodes = new Map<number, Ground>();
  // arrow to the next door
  const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.6, 8).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#ffd34a', emissive: '#7a5200', emissiveIntensity: 0.5 })); arrow.position.y = 1.9; scene.add(arrow);
  // HUD: the parcels on the cart as coloured chips
  const chips = document.createElement('div'); chips.className = 'mg-chips'; a.hud.append(chips);
  const repaintChips = () => { chips.replaceChildren(...sim.cart.map((p) => { const s = document.createElement('i'); s.style.background = HOUSE_COLORS[sim.houses[p.house].color]; return s; })); chips.hidden = sim.cart.length === 0; };
  repaintChips();
  a.camTarget.set(sim.you.pos.x, 0, sim.you.pos.z);
  let swing = 0, lastVx = 0, lastVz = 0;
  a.tip('go', a.mobile ? 'Roll up to the depot to load, then follow the glowing door mats. Take the corners gently — the cart swings!' : 'Roll up to the depot to load (WASD), then follow the glowing door mats. Take corners gently — the cart swings!', 5200);
  a.run((dt, input) => {
    sim.step(dt, input);
    for (const e of sim.events) {
      if (e.kind === 'load') { repaintCart(); repaintStack(); repaintChips(); a.banner(`Loaded ${e.n} parcel${e.n === 1 ? '' : 's'} — follow the glowing doors`, 'combo'); a.play(sfx.collect); me.squash = 0.3; }
      else if (e.kind === 'deliver' && e.house) { repaintCart(); repaintChips(); a.float(e.house.door.x, 1.6, e.house.door.z, `+${e.value}${e.fast ? ' FAST!' : ''}`, e.fast ? 'gold' : ''); a.sparks(new THREE.Vector3(e.house.door.x, 0.8, e.house.door.z), e.fast ? 14 : 6); a.play(e.fast ? sfx.gold : sfx.collect); me.squash = 0.35; if (sim.delivered === 1) a.tip('fast', 'Deliver within 14 s of loading for 60 instead of 40', 3600); }
      else if (e.kind === 'drop' && e.parcel) { repaintCart(); repaintChips(); const m = parcelMesh(e.parcel); const from = new THREE.Vector3(); cart.getWorldPosition(from); from.y = 0.8; m.position.copy(from); scene.add(m); groundNodes.set(e.parcel.id, { p: e.parcel, m, t: 0, from }); a.banner('Oops — a parcel fell off!', 'warn'); a.play(vac.bump); me.squash = 0.6; a.tip('drop', 'A hard bump knocks a parcel off — roll over it to pick it up', 3600); }
      else if (e.kind === 'pickup' && e.parcel) { const n = groundNodes.get(e.parcel.id); if (n) { scene.remove(n.m); groundNodes.delete(e.parcel.id); } repaintCart(); repaintChips(); a.play(sfx.collect); a.float(sim.you.pos.x, 1.2, sim.you.pos.z, 'got it!'); }
      else if (e.kind === 'bump') { me.squash = Math.max(me.squash, 0.4); a.puff(new THREE.Vector3(sim.you.pos.x, 0.5, sim.you.pos.z), 4, '#d9cfbd'); }
      else if (e.kind === 'warn') a.warn(e.n!);
    }
  }, (dt) => {
    const p = sim.you.pos;
    me.group.position.set(p.x, 0, p.z); me.group.rotation.y = sim.you.heading;
    a.walk(me, Math.min(1, sim.you.speed / CART.max), dt);
    // the cart swings on the corners and the wheels turn
    const ax = (sim.you.vel.x - lastVx) / Math.max(dt, 1e-3), az = (sim.you.vel.z - lastVz) / Math.max(dt, 1e-3); lastVx = sim.you.vel.x; lastVz = sim.you.vel.z;
    const lateral = -ax * Math.cos(sim.you.heading) + az * Math.sin(sim.you.heading);
    swing = lerp(swing, Math.max(-0.35, Math.min(0.35, lateral * 0.02)), Math.min(1, dt * 6));
    cart.rotation.z = swing; cart.rotation.y = swing * 0.6;
    for (const w of wheels) w.rotation.x += sim.you.speed * dt / 0.3;
    a.camTarget.lerp(new THREE.Vector3(p.x, 0, p.z), Math.min(1, dt * 6));
    // door mats glow for the parcels on the cart; the arrow points at the nearest of them (or the depot when empty)
    const targets = new Set(sim.cart.map((q) => q.house));
    let best: THREE.Vector3 | null = null, bd = Infinity;
    for (const n of houseNodes) { const on = targets.has(n.h.id); n.glow.opacity = on ? 0.45 + Math.sin(time.value * 5) * 0.25 : 0; n.mat.scale.setScalar(on ? 1 + Math.sin(time.value * 5) * 0.08 : 1); if (on) { const d = Math.hypot(n.h.door.x - p.x, n.h.door.z - p.z); if (d < bd) { bd = d; best = new THREE.Vector3(n.h.door.x, 0, n.h.door.z); } } }
    if (!best) best = new THREE.Vector3(DEPOT.x, 0, DEPOT.z);
    arrow.position.set(p.x, 1.9 + Math.sin(time.value * 4) * 0.08, p.z); arrow.lookAt(best.x, 1.9, best.z); arrow.visible = bd > 2.5 || !sim.cart.length;
    // parcels on the ground: tumble, then sit and bob
    for (const [id, n] of groundNodes) {
      if (n.p.state !== 'ground') { scene.remove(n.m); groundNodes.delete(id); continue; }
      n.t += dt; const k = Math.min(1, n.t / 0.6);
      n.m.position.set(lerp(n.from.x, n.p.x, k), Math.sin(k * Math.PI) * 1.1 + 0.17 + (k >= 1 ? Math.abs(Math.sin(time.value * 3)) * 0.05 : 0), lerp(n.from.z, n.p.z, k));
      n.m.rotation.x = k < 1 ? k * 6 : 0; n.m.rotation.y += dt * (k < 1 ? 4 : 0.8);
    }
    a.setScore(sim.score);
    a.setCount(String(sim.delivered), sim.cart.length ? `${sim.cart.length} on the cart` : 'cart empty — go to the depot');
    a.setTime(sim.clock.left);
    if (sim.state === 'done') a.finish(sim.result());
  });
  if (import.meta.env.DEV) (window as unknown as { __mg: unknown }).__mg = { id: 'delivery', sim, ctl: a.ctl, start: a.start, finishNow: () => { (sim as unknown as { state: string }).state = 'done'; } };
}
