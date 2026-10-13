/**
 * Farm Harvest Rush — the 3D farm: four raised beds of carrots, tomatoes, pumpkins and corn that grow, glow when ripe (gold
 * while fresh), droop and brown when wilted and sprout again; a trough, a scarecrow, the kit's fence; your Fuzzy with a
 * basket — tap a plant to walk over and pick it, or walk up and PICK (Space); picked crops fly into the basket.
 * Rules: games/harvest.ts; scene, HUD, loop and chrome: land/mgScene.ts.
 */
import * as THREE from 'three';
import { createArcade, feed, std, add, sfx, vac, lerp, type MiniSetup, type MiniHooks } from '../mgScene';
import { BOTS } from './bots';
import { adventure } from '../adventures';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { soilTex, cropGeo } from './sceneArt';
import { woodTex, paint as shade } from './orchardArt';
import { HarvestSim, FIELD, ROWS, COLS, ROW_GAP, COL_GAP, FRESH, MOVE, type Plant, type Crop } from './harvest';

export function run(stage: HTMLElement, setup: MiniSetup, hooks: MiniHooks): void {
  const adv = adventure('harvest')!;
  const sim = new HarvestSim(setup.variant, setup.seed);
  const a = createArcade(stage, {
    cls: 'harvest', setup, adv, hooks, buttonLabel: 'Start picking!',
    rivals: { you: sim, make: () => new HarvestSim(setup.variant, setup.seed), bot: BOTS.harvest },
    hud: { count: 'PICKED' },
    camera: { fov: 44, back: 9.5, up: 10, lookDy: -2.6, lead: 0 },
    world: { size: { hw: FIELD.hw + 1, hd: FIELD.hd + 1 }, path: false, fence: true, flowers: 12 },
    controls: { mouseSteer: false },
    onStart: () => sim.start(),
  });
  const next = feed(sim); // events from taps / buttons between steps
  const { scene, time } = a;
  // ---- the beds ----
  // raised beds: tilled soil (furrows along the row) in a planked wooden frame
  const soilT = soilTex().clone(); soilT.needsUpdate = true; soilT.wrapS = soilT.wrapT = THREE.RepeatWrapping; soilT.repeat.set((COLS * COL_GAP + 0.8) / 2, 1);
  const soil = new THREE.MeshStandardMaterial({ map: soilT, roughness: 1 });
  const plankT = woodTex().clone(); plankT.needsUpdate = true; plankT.rotation = Math.PI / 2; plankT.wrapS = plankT.wrapT = THREE.RepeatWrapping; plankT.repeat.set(1, 6);
  const edge = new THREE.MeshStandardMaterial({ map: plankT, color: '#c99a62', roughness: 0.85 });
  for (let r = 0; r < ROWS; r++) { const z = (r - (ROWS - 1) / 2) * ROW_GAP; const bed = add(scene, new RoundedBoxGeometry(COLS * COL_GAP + 0.8, 0.26, 1.3, 2, 0.1), soil, 0, 0.11, z); bed.receiveShadow = true; for (const sz of [-1, 1]) add(scene, new THREE.BoxGeometry(COLS * COL_GAP + 1.0, 0.2, 0.1), edge, 0, 0.14, z + sz * 0.7); for (const sx of [-1, 1]) add(scene, new THREE.BoxGeometry(0.1, 0.2, 1.5), edge, sx * (COLS * COL_GAP + 0.95) / 2, 0.14, z); }
  // trough + scarecrow (the rules' obstacles)
  const trough = new THREE.Group(); trough.position.set(FIELD.hw - 1.4, 0, 0);
  add(trough, new THREE.BoxGeometry(1, 0.55, 2.2), edge, 0, 0.28, 0); add(trough, new THREE.BoxGeometry(0.84, 0.05, 2.04), std('#3fa7d6', 0.2), 0, 0.5, 0, false); scene.add(trough);
  const crow = new THREE.Group(); crow.position.set(-FIELD.hw + 1.3, 0, -FIELD.hd + 1.6);
  add(crow, new THREE.CylinderGeometry(0.05, 0.06, 2.2, 6), edge, 0, 1.1, 0); add(crow, new THREE.BoxGeometry(1.4, 0.08, 0.08), edge, 0, 1.6, 0, false);
  add(crow, new THREE.BoxGeometry(0.9, 0.5, 0.3), std('#4f74c9', 0.9), 0, 1.4, 0, false); add(crow, new THREE.SphereGeometry(0.22, 10, 8), std('#f2d49b', 0.9), 0, 1.95, 0, false);
  add(crow, new THREE.ConeGeometry(0.3, 0.3, 10), std('#d9b27a', 0.9), 0, 2.25, 0, false); add(crow, new THREE.CylinderGeometry(0.34, 0.34, 0.04, 12), std('#d9b27a', 0.9), 0, 2.1, 0, false); scene.add(crow);
  // ---- plants ----
  // leaves carry baked shading (vertex colours); the material tints them young / grown / wilted
  const plantMat = (c: string) => new THREE.MeshStandardMaterial({ vertexColors: true, color: c, roughness: 0.7, side: THREE.DoubleSide });
  const leafMat = plantMat('#ffffff'), youngMat = plantMat('#dcffcc'), brownMat = plantMat('#a3824e');
  const ribbed = (r: number) => { const g = new THREE.SphereGeometry(r, 28, 16); const p = g.attributes.position; const v = new THREE.Vector3(); for (let k = 0; k < p.count; k++) { v.fromBufferAttribute(p, k); const a = Math.atan2(v.z, v.x); const k8 = 1 + 0.09 * Math.cos(a * 8); v.x *= k8; v.z *= k8; v.y *= 0.82; p.setXYZ(k, v.x, v.y, v.z); } g.computeVertexNormals(); return g; };
  const pumpkinGeo = ribbed(0.3), tomatoGeo = new THREE.SphereGeometry(0.1, 16, 12);
  const cornStalk = shade(new THREE.CylinderGeometry(0.05, 0.07, 1.2, 8), (q, _n, c) => c.set('#5f9a3f').lerp(new THREE.Color('#a9d27a'), (q.y + 0.6) / 1.2));
  const fruitMat: Record<Crop, THREE.Material> = { carrot: std('#ff8c42', 0.55), tomato: new THREE.MeshPhysicalMaterial({ color: '#e8352c', roughness: 0.25, clearcoat: 0.8, clearcoatRoughness: 0.15 }), pumpkin: std('#ff9a1f', 0.55), corn: std('#ffd34a', 0.5) };
  const ringMat = new THREE.MeshBasicMaterial({ color: '#ffd34a', transparent: true, opacity: 0.5, depthWrite: false });
  const ringMatFresh = new THREE.MeshBasicMaterial({ color: '#fff3a8', transparent: true, opacity: 0.8, depthWrite: false });
  const ringGeo = new THREE.RingGeometry(0.42, 0.6, 24).rotateX(-Math.PI / 2);
  type Node = { p: Plant; g: THREE.Group; leaf: THREE.Group; fruit: THREE.Group; ring: THREE.Mesh; shown: string };
  const nodes: Node[] = sim.plants.map((p) => {
    const g = new THREE.Group(); g.position.set(p.x, 0.22, p.z);
    const leaf = new THREE.Group(); const fruit = new THREE.Group(); g.add(leaf, fruit);
    if (p.crop === 'carrot') { const l = new THREE.Mesh(cropGeo('carrot'), leafMat); l.scale.setScalar(1.25); l.castShadow = true; leaf.add(l); add(fruit, new THREE.ConeGeometry(0.14, 0.45, 8), fruitMat.carrot, 0, 0.12, 0, false).rotation.x = Math.PI; }
    else if (p.crop === 'tomato') { const l = new THREE.Mesh(cropGeo('lettuce'), leafMat); l.scale.set(1.3, 1.7, 1.3); l.castShadow = true; leaf.add(l); for (let i = 0; i < 4; i++) add(fruit, tomatoGeo, fruitMat.tomato, Math.cos(i * 1.7) * 0.26, 0.3 + Math.sin(i * 2.3) * 0.15, Math.sin(i * 1.7) * 0.26, false); }
    else if (p.crop === 'pumpkin') { const l = new THREE.Mesh(cropGeo('cabbage'), leafMat); l.scale.set(1.5, 0.6, 1.5); l.position.set(0.15, 0, 0.1); l.castShadow = true; leaf.add(l); const pk = add(fruit, pumpkinGeo, fruitMat.pumpkin, 0, 0.24, 0, false); pk.scale.set(1.1, 1, 1.1); add(fruit, new THREE.CylinderGeometry(0.04, 0.05, 0.14, 6), std('#5a7a3a', 0.9), 0, 0.56, 0, false); }
    else { add(leaf, cornStalk, leafMat, 0, 0.6, 0, false); const l = new THREE.Mesh(cropGeo('weedBig'), leafMat); l.scale.set(1.3, 2.4, 1.3); l.castShadow = true; leaf.add(l); const cob = add(fruit, new THREE.CylinderGeometry(0.09, 0.08, 0.42, 8), fruitMat.corn, 0.14, 0.85, 0, false); cob.rotation.z = -0.3; }
    const ring = new THREE.Mesh(ringGeo, ringMat); ring.position.y = 0.01; ring.visible = false; g.add(ring);
    scene.add(g);
    return { p, g, leaf, fruit, ring, shown: '' };
  });
  const paint = (n: Node) => {
    const p = n.p; const key = `${p.state}:${p.state === 'ripe' && p.t <= FRESH ? 'f' : ''}`;
    if (key === n.shown) return; n.shown = key;
    n.fruit.visible = p.state === 'ripe';
    n.ring.visible = p.state === 'ripe'; n.ring.material = p.t <= FRESH ? ringMatFresh : ringMat;
    n.leaf.traverse((o) => { if (o instanceof THREE.Mesh) o.material = p.state === 'wilted' ? brownMat : p.state === 'green' || p.state === 'picked' ? youngMat : leafMat; });
    n.leaf.rotation.z = p.state === 'wilted' ? 0.55 : 0;
    n.g.scale.setScalar(p.state === 'picked' ? 0.45 : p.state === 'green' ? 0.78 : 1);
  };
  // ---- you, with a basket ----
  const me = a.figure(setup.you.skin, 0.3);
  me.group.position.set(sim.you.pos.x, 0, sim.you.pos.z);
  const basket = new THREE.Group();
  add(basket, new THREE.CylinderGeometry(0.3, 0.22, 0.26, 12, 1, true), new THREE.MeshStandardMaterial({ color: '#c98b55', roughness: 0.9, side: THREE.DoubleSide }), 0, 0.13, 0);
  add(basket, new THREE.CylinderGeometry(0.22, 0.22, 0.04, 12), std('#a9743f', 0.95), 0, 0.02, 0, false);
  basket.position.set(0.3, 0.3, 0.3); me.group.add(basket);
  a.camTarget.set(sim.you.pos.x, 0, sim.you.pos.z);
  type Fly = { m: THREE.Mesh; t: number; from: THREE.Vector3 };
  const flies: Fly[] = [];
  // marker for taps
  const marker = new THREE.Mesh(new THREE.RingGeometry(0.22, 0.4, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false })); marker.position.y = 0.03; scene.add(marker); let markerT = 0;
  const ray = new THREE.Raycaster(); const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); const hit = new THREE.Vector3();
  a.onTap((ndc) => { ray.setFromCamera(new THREE.Vector2(ndc.x, ndc.y), a.camera); if (ray.ray.intersectPlane(plane, hit) && sim.goTo(hit.x, hit.z)) { marker.position.set(sim.goal!.x, 0.03, sim.goal!.z); markerT = 1; a.play(vac.tick); } });
  const pickBtn = document.createElement('button'); pickBtn.type = 'button'; pickBtn.className = 'mg-action'; pickBtn.textContent = a.mobile ? 'PICK' : 'PICK (Space)';
  const doPick = () => { if (!a.started() || a.paused()) return; sim.pick(); };
  pickBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); doPick(); }); a.hud.append(pickBtn);
  a.onAction(doPick);
  a.tip('go', a.mobile ? 'Tap a glowing plant — your Fuzzy walks there and picks it. Fresh (bright) ones pay 25' : 'Click a glowing plant to walk there and pick it, or walk up and press Space. Fresh (bright) ones pay 25', 5000);
  a.run((dt, input) => {
    for (const e of next(() => sim.step(dt, input))) {
      if (e.kind === 'pick' && e.plant) { const n = nodes.find((x) => x.p === e.plant)!; const m = n.fruit.children[0] as THREE.Mesh | undefined; if (m) { const fm = new THREE.Mesh(m.geometry, m.material); fm.scale.copy(m.scale).multiplyScalar(0.8); scene.add(fm); flies.push({ m: fm, t: 0, from: new THREE.Vector3(e.plant.x, 0.6, e.plant.z) }); } a.float(e.plant.x, 1.4, e.plant.z, e.fresh ? `+${e.value} FRESH!` : `+${e.value}`, e.fresh ? 'gold' : ''); a.play(e.fresh ? sfx.gold : sfx.collect); me.squash = 0.35; a.puff(new THREE.Vector3(e.plant.x, 0.4, e.plant.z), 3, '#9ad58c'); }
      else if (e.kind === 'early') { a.banner('Not ripe yet!', 'warn'); a.play(vac.bump); a.tip('early', 'Only the glowing plants are ripe — the bright ones are freshest', 3400); }
      else if (e.kind === 'wilt' && e.plant) { a.puff(new THREE.Vector3(e.plant.x, 0.5, e.plant.z), 4, '#8a6a3a'); if (sim.wilted === 1) a.tip('wilt', 'Ripe plants wilt after a few seconds — pick the ones that ripened first', 4000); }
      else if (e.kind === 'wave') { a.banner('A row is ripening!', 'combo'); a.play(sfx.level); }
      else if (e.kind === 'bump') { me.squash = 0.3; }
      else if (e.kind === 'warn') a.warn(e.n!);
    }
  }, (dt) => {
    const p = sim.you.pos;
    me.group.position.set(p.x, 0, p.z); me.group.rotation.y = sim.you.heading;
    a.walk(me, Math.min(1, sim.you.speed / MOVE.max), dt);
    if (sim.picking > 0) { me.squash = 0.25 + Math.sin(time.value * 16) * 0.12; basket.rotation.z = Math.sin(time.value * 16) * 0.2; } else basket.rotation.z = lerp(basket.rotation.z, 0, Math.min(1, dt * 8));
    a.camTarget.lerp(new THREE.Vector3(p.x, 0, p.z), Math.min(1, dt * 6));
    for (const n of nodes) { paint(n); if (n.p.state === 'ripe') { n.ring.scale.setScalar(1 + Math.sin(time.value * 4 + n.p.id) * 0.08); n.fruit.position.y = Math.sin(time.value * 3 + n.p.id) * 0.02; } if (n.p.state === 'green') n.g.scale.setScalar(0.5 + Math.min(1, n.p.t / 8) * 0.28); }
    for (let i = flies.length - 1; i >= 0; i--) { const f = flies[i]; f.t += dt; const k = Math.min(1, f.t / 0.5); const to = new THREE.Vector3(); basket.getWorldPosition(to); f.m.position.set(lerp(f.from.x, to.x, k), lerp(f.from.y, to.y + 0.2, k) + Math.sin(k * Math.PI) * 1.2, lerp(f.from.z, to.z, k)); f.m.rotation.y += dt * 6; if (k >= 1) { scene.remove(f.m); flies.splice(i, 1); } }
    if (markerT > 0) { markerT -= dt * 0.9; (marker.material as THREE.MeshBasicMaterial).opacity = Math.max(0, markerT) * 0.8; marker.scale.setScalar(1 + (1 - markerT) * 0.6); if (sim.goal === null) markerT = Math.min(markerT, 0.25); }
    pickBtn.classList.toggle('on', !!sim.reachable()); pickBtn.disabled = sim.picking > 0;
    a.setScore(sim.score);
    a.setCount(String(sim.picked), `${sim.ripe.length} ripe now`);
    a.setTime(sim.clock.left);
    if (sim.state === 'done') a.finish(sim.result());
  });
  if (import.meta.env.DEV) (window as unknown as { __mg: unknown }).__mg = { id: 'harvest', sim, ctl: a.ctl, start: a.start, pick: doPick, finishNow: () => { (sim as unknown as { state: string }).state = 'done'; } };
}
