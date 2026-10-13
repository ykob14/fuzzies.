/**
 * Garden Cleanup — the 3D walled garden: sandy paths, a fountain, a bench, four raised beds with stone borders, buds that
 * bloom into flowers (rare ones golden), tufty weeds (dandelions for the big ones) that stretch and shake as you pull them and
 * pop out with a shower of soil. Hold PULL (the button, Space, or a finger held on the scene) next to a weed; a progress
 * bar at the top shows how far out it is. Rules: games/garden.ts; scene, HUD, loop and chrome: land/mgScene.ts.
 */
import * as THREE from 'three';
import { createArcade, std, add, sfx, vac, lerp, type MiniSetup, type MiniHooks } from '../mgScene';
import { adventure } from '../adventures';
import { GardenSim, GARDEN, MOVE, type Weed, type Bud } from './garden';

const PETALS = ['#ff5c8a', '#ff8c42', '#9b7bff', '#4fa3ff', '#ff6b9a'];

export function run(stage: HTMLElement, setup: MiniSetup, hooks: MiniHooks): void {
  const adv = adventure('garden')!;
  const sim = new GardenSim(setup.variant, setup.seed);
  const a = createArcade(stage, {
    cls: 'garden', setup, adv, hooks, buttonLabel: 'Start weeding!',
    hud: { count: 'WEEDS' },
    camera: { fov: 44, back: 9.5, up: 10, lookDy: -2.4, lead: 0 },
    world: { size: { hw: GARDEN.hw + 1.5, hd: GARDEN.hd + 1.5 }, path: false, fence: true, flowers: 0 },
    controls: { mouseSteer: false },
    onStart: () => sim.start(),
  });
  const { scene, time } = a;
  // ---- paths, fountain, bench, beds ----
  const sand = std('#e3d3ad', 0.95), stone = std('#b9b4a6', 0.9), soil = std('#6f4f33', 1);
  const px = new THREE.Mesh(new THREE.PlaneGeometry(GARDEN.hw * 2, 2.4).rotateX(-Math.PI / 2), sand); px.position.y = 0.012; scene.add(px);
  const pz = new THREE.Mesh(new THREE.PlaneGeometry(2.4, GARDEN.hd * 2).rotateX(-Math.PI / 2), sand); pz.position.y = 0.012; scene.add(pz);
  const fountain = new THREE.Group();
  add(fountain, new THREE.CylinderGeometry(1.3, 1.4, 0.5, 24, 1, true), new THREE.MeshStandardMaterial({ color: '#b9b4a6', roughness: 0.9, side: THREE.DoubleSide }), 0, 0.25, 0);
  add(fountain, new THREE.CylinderGeometry(1.22, 1.22, 0.04, 24), new THREE.MeshStandardMaterial({ color: '#3fa7d6', roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.85 }), 0, 0.4, 0, false);
  add(fountain, new THREE.CylinderGeometry(0.16, 0.2, 1.3, 10), stone, 0, 0.9, 0); const top = add(fountain, new THREE.CylinderGeometry(0.5, 0.1, 0.25, 16), stone, 0, 1.55, 0, false); void top;
  scene.add(fountain);
  const bench = new THREE.Group(); bench.position.set(0, 0, -GARDEN.hd + 1);
  add(bench, new THREE.BoxGeometry(2, 0.1, 0.6), std('#a97c50', 0.9), 0, 0.5, 0); add(bench, new THREE.BoxGeometry(2, 0.5, 0.1), std('#a97c50', 0.9), 0, 0.85, -0.28);
  for (const sx of [-1, 1]) add(bench, new THREE.BoxGeometry(0.1, 0.5, 0.55), std('#5a3b1e', 0.9), sx * 0.9, 0.25, 0);
  scene.add(bench);
  for (const b of sim.beds) { add(scene, new THREE.BoxGeometry(b.hw * 2, 0.3, b.hd * 2), soil, b.x, 0.15, b.z); for (const sx of [-1, 1]) { add(scene, new THREE.BoxGeometry(0.16, 0.4, b.hd * 2 + 0.16), stone, b.x + sx * (b.hw + 0.08), 0.2, b.z, false); add(scene, new THREE.BoxGeometry(b.hw * 2 + 0.16, 0.4, 0.16), stone, b.x, 0.2, b.z + sx * (b.hd + 0.08), false); } }
  // ---- buds / blooms ----
  const stemMat = std('#4f8a3a', 0.8), budMat = std('#7ab86a', 0.7), goldMat = new THREE.MeshStandardMaterial({ color: '#ffd34a', metalness: 0.5, roughness: 0.3, emissive: '#6b4a00', emissiveIntensity: 0.4 });
  const centreMat = std('#ffd34a', 0.5);
  type BudNode = { b: Bud; g: THREE.Group; bud: THREE.Mesh; flower: THREE.Group; shown: string; t: number };
  const budNodes: BudNode[] = sim.buds.map((b) => {
    const g = new THREE.Group(); g.position.set(b.x, 0.3, b.z);
    add(g, new THREE.CylinderGeometry(0.025, 0.035, 0.5, 6), stemMat, 0, 0.25, 0, false);
    add(g, new THREE.SphereGeometry(0.09, 7, 5), stemMat, 0.08, 0.2, 0, false).scale.set(1.6, 0.4, 1);
    const bud = add(g, new THREE.SphereGeometry(0.1, 8, 6), budMat, 0, 0.55, 0, false); bud.scale.y = 1.3;
    const flower = new THREE.Group(); flower.position.y = 0.55; flower.visible = false;
    const pm = b.rare ? goldMat : std(PETALS[b.id % PETALS.length], 0.6);
    for (let i = 0; i < 6; i++) { const an = (i / 6) * Math.PI * 2; const pt = add(flower, new THREE.SphereGeometry(0.11, 8, 6), pm, Math.cos(an) * 0.16, 0, Math.sin(an) * 0.16, false); pt.scale.set(1.3, 0.45, 0.8); pt.rotation.y = -an; }
    add(flower, new THREE.SphereGeometry(0.09, 8, 6), b.rare ? std('#fff3a8', 0.4) : centreMat, 0, 0.03, 0, false);
    g.add(flower); scene.add(g);
    return { b, g, bud, flower, shown: '', t: 0 };
  });
  // ---- weeds ----
  const weedMat = std('#3e7a35', 0.9), weedDark = std('#2f5f2a', 0.9), fluff = std('#f5f5f5', 0.8);
  type WeedNode = { w: Weed; g: THREE.Group; gone: number };
  const weedNodes = new Map<number, WeedNode>();
  const makeWeed = (w: Weed): WeedNode => {
    const g = new THREE.Group(); g.position.set(w.x, 0.02, w.z);
    const n = w.kind === 'big' ? 7 : 5, h = w.kind === 'big' ? 0.75 : 0.45;
    for (let i = 0; i < n; i++) { const an = (i / n) * Math.PI * 2 + w.id; const blade = add(g, new THREE.ConeGeometry(0.07, h, 4), i % 2 ? weedMat : weedDark, Math.cos(an) * 0.12, h / 2, Math.sin(an) * 0.12, false); blade.rotation.z = Math.cos(an) * 0.5; blade.rotation.x = -Math.sin(an) * 0.5; }
    if (w.kind === 'big') { add(g, new THREE.CylinderGeometry(0.02, 0.03, 0.7, 5), weedMat, 0, 0.75, 0, false); add(g, new THREE.SphereGeometry(0.14, 8, 6), fluff, 0, 1.12, 0, false); }
    scene.add(g); const node = { w, g, gone: -1 }; weedNodes.set(w.id, node); return node;
  };
  for (const w of sim.weeds) makeWeed(w);
  // ---- you ----
  const me = a.figure(setup.you.skin, 0.3);
  me.group.position.set(sim.you.pos.x, 0, sim.you.pos.z);
  a.camTarget.set(sim.you.pos.x, 0, sim.you.pos.z);
  // ---- HUD: the pull meter + the PULL button + holds ----
  const meter = document.createElement('div'); meter.className = 'mg-meter';
  const bar = document.createElement('div'); bar.className = 'bar'; const fill = document.createElement('i'); bar.append(fill);
  const label = document.createElement('b'); label.textContent = 'walk up to a weed'; meter.append(bar, label); a.hud.append(meter);
  const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'mg-action'; btn.textContent = a.mobile ? 'PULL' : 'PULL (Space)'; a.hud.append(btn);
  let btnHeld = false, sceneHeld = false, moved = false, down = { x: 0, y: 0 }, forcedHold = false;
  btn.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); btnHeld = true; });
  const btnUp = () => { btnHeld = false; }; btn.addEventListener('pointerup', btnUp); btn.addEventListener('pointercancel', btnUp); btn.addEventListener('pointerleave', btnUp);
  const onDown = (e: PointerEvent) => { if ((e.target as HTMLElement).closest('button, .mg-intro, .race-paused')) return; sceneHeld = true; moved = false; down = { x: e.clientX, y: e.clientY }; };
  const onMove = (e: PointerEvent) => { if (sceneHeld && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 12) moved = true; };
  const onUp = () => { sceneHeld = false; };
  a.root.addEventListener('pointerdown', onDown); a.root.addEventListener('pointermove', onMove); addEventListener('pointerup', onUp); addEventListener('pointercancel', onUp);
  a.tip('go', a.mobile ? 'Walk up to a weed and hold PULL (or hold a finger on the screen) until it pops out' : 'Walk up to a weed and hold Space until it pops out. Flowers bloom when the weeds near them are gone', 5200);
  a.run((dt, input) => {
    const hold = forcedHold || btnHeld || a.ctl.action || (sceneHeld && !moved);
    sim.step(dt, input, hold);
    for (const e of sim.events) {
      if (e.kind === 'pull' && e.weed) { const n = weedNodes.get(e.weed.id); if (n) n.gone = 0; a.chips(new THREE.Vector3(e.weed.x, 0.3, e.weed.z), 8, '#6f4f33'); a.float(e.weed.x, 1.3, e.weed.z, `+${e.value}${(e.mult ?? 1) > 1 ? ` ×${e.mult}` : ''}`); a.play(sfx.collect); me.squash = 0.45; }
      else if (e.kind === 'pulling') { a.play(vac.tick); }
      else if (e.kind === 'letgo') { a.tip('letgo', 'Keep holding until the weed pops out', 2800); }
      else if (e.kind === 'bloom' && e.bud) { const n = budNodes.find((x) => x.b === e.bud); if (n) n.t = 0; a.sparks(new THREE.Vector3(e.bud.x, 0.9, e.bud.z), e.bud.rare ? 10 : 4); a.float(e.bud.x, 1.1, e.bud.z, e.bud.rare ? 'a RARE bloom!' : 'bloomed!', e.bud.rare ? 'gold' : ''); a.tip('bloom', 'A flower bloomed — walk up to it to pick it', 3400); }
      else if (e.kind === 'flower' && e.bud) { a.float(e.bud.x, 1.4, e.bud.z, `+${e.value}${e.bud.rare ? ' RARE!' : ''}`, e.bud.rare ? 'gold' : ''); a.sparks(new THREE.Vector3(e.bud.x, 0.9, e.bud.z), e.bud.rare ? 16 : 6); a.play(e.bud.rare ? sfx.gold : sfx.collect); me.squash = 0.35; }
      else if (e.kind === 'trample') { a.banner(`Off the flower bed! −${e.value}`, 'warn'); a.play(vac.bump); a.puff(new THREE.Vector3(sim.you.pos.x, 0.4, sim.you.pos.z), 5, '#6f4f33'); a.tip('trample', 'Stay on the paths — the beds are for the flowers', 3400); }
      else if (e.kind === 'sprout' && e.weed) { makeWeed(e.weed); a.puff(new THREE.Vector3(e.weed.x, 0.2, e.weed.z), 3, '#8fd07f'); }
      else if (e.kind === 'combo') { a.banner(`×${e.mult} CHAIN!`, 'combo'); a.play(() => vac.combo(e.n ?? 1)); }
      else if (e.kind === 'bump') { me.squash = 0.3; }
      else if (e.kind === 'warn') a.warn(e.n!);
    }
  }, (dt) => {
    const p = sim.you.pos;
    me.group.position.set(p.x, 0, p.z); me.group.rotation.y = sim.you.heading;
    a.walk(me, Math.min(1, sim.you.speed / MOVE.max), dt);
    if (sim.pulling) { me.squash = 0.2 + Math.sin(time.value * 14) * 0.15; me.group.rotation.x = -0.25 + Math.sin(time.value * 14) * 0.08; } else me.group.rotation.x = lerp(me.group.rotation.x, 0, Math.min(1, dt * 8));
    a.camTarget.lerp(new THREE.Vector3(p.x, 0, p.z), Math.min(1, dt * 6));
    for (const [id, n] of weedNodes) {
      if (n.gone >= 0) { n.gone += dt; const k = Math.min(1, n.gone / 0.45); n.g.position.y = 0.02 + k * 1.6; n.g.rotation.z = k * 2.5; n.g.scale.setScalar(Math.max(0.001, 1 - k)); if (k >= 1) { scene.remove(n.g); weedNodes.delete(id); } continue; }
      const k = n.w.need > 0 ? n.w.progress / n.w.need : 0;
      n.g.scale.set(1 - k * 0.2, 1 + k * 0.7, 1 - k * 0.2);
      n.g.rotation.z = sim.pulling === n.w ? Math.sin(time.value * 30) * 0.12 * (0.5 + k) : lerp(n.g.rotation.z, Math.sin(time.value * 1.5 + n.w.id) * 0.04, Math.min(1, dt * 6));
    }
    for (const n of budNodes) {
      const key = n.b.state; if (key !== n.shown) { n.shown = key; n.bud.visible = key === 'bud'; n.flower.visible = key === 'bloom'; if (key === 'picked') n.flower.visible = false; }
      if (key === 'bloom') { n.t += dt; const k = Math.min(1, n.t / 0.45); n.flower.scale.setScalar(0.2 + k * 0.8); n.flower.rotation.y = time.value * 0.6; if (n.b.rare) n.flower.position.y = 0.55 + Math.sin(time.value * 3) * 0.04; }
      else if (key === 'bud') n.bud.rotation.z = Math.sin(time.value * 2 + n.b.id) * 0.1;
    }
    const r = sim.pulling ?? sim.reachable();
    if (sim.pulling) { fill.style.width = `${Math.round((sim.pulling.progress / sim.pulling.need) * 100)}%`; meter.className = 'mg-meter hot'; label.textContent = 'keep holding…'; }
    else if (r) { fill.style.width = `${Math.round((r.progress / r.need) * 100)}%`; meter.className = 'mg-meter warm'; label.textContent = a.mobile ? 'HOLD PULL!' : 'HOLD SPACE — PULL!'; }
    else { fill.style.width = '0%'; meter.className = 'mg-meter'; label.textContent = sim.buds.some((b) => b.state === 'bloom') ? 'a flower is waiting ✿' : 'walk up to a weed'; }
    btn.classList.toggle('on', !!r && !sim.pulling);
    a.setScore(sim.score);
    a.setCount(String(sim.pulled), `${sim.flowers} flower${sim.flowers === 1 ? '' : 's'}`);
    a.setTime(sim.clock.left);
    a.setCombo(sim.combo.chain, sim.combo.mult, sim.combo.next);
    if (sim.state === 'done') a.finish(sim.result());
  });
  const cleanup = () => { a.root.removeEventListener('pointermove', onMove); removeEventListener('pointerup', onUp); removeEventListener('pointercancel', onUp); };
  const origFinish = hooks.onFinish; hooks.onFinish = (res) => { cleanup(); origFinish(res); };
  const origQuit = hooks.onQuit; hooks.onQuit = () => { cleanup(); origQuit(); };
  if (import.meta.env.DEV) (window as unknown as { __mg: unknown }).__mg = { id: 'garden', sim, ctl: a.ctl, start: a.start, setHold: (b: boolean) => { forcedHold = b; }, finishNow: () => { (sim as unknown as { state: string }).state = 'done'; } };
}
