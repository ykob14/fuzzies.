/**
 * Balloon Pop — the 3D town square: cobbles, cottages, bunting, a stall; balloons (plain / big / shiny / spiky) with knots and
 * strings that rise and sway, pop into confetti, and float away over the roofs. Tap / click picks the balloon nearest the
 * finger on screen (forgiving), then the rules decide. Rules: games/balloon.ts; scene, HUD, loop, chrome: land/mgScene.ts.
 */
import * as THREE from 'three';
import { createArcade, std, add, sfx, vac, lerp, type MiniSetup, type MiniHooks } from '../mgScene';
import { adventure } from '../adventures';
import { BalloonSim, TOP, SQUARE, type Balloon } from './balloon';

const PALETTE = ['#ff5c8a', '#ffc94a', '#4fa3ff', '#6fd36a', '#ff8c42'];

export function run(stage: HTMLElement, setup: MiniSetup, hooks: MiniHooks): void {
  const adv = adventure('balloon')!;
  const sim = new BalloonSim(setup.variant, setup.seed);
  const a = createArcade(stage, {
    cls: 'balloon', setup, adv, hooks, buttonLabel: 'Let’s pop!',
    hud: { count: 'POPPED' },
    camera: { fov: 46, back: 13, up: 4.5, lookDy: -13, lookY: 3.6, lead: 0 },
    world: { size: { hw: 10, hd: 8 }, path: false, fence: false, flowers: 10 },
    controls: { none: true },
    onStart: () => sim.start(),
  });
  const { scene, time, camera } = a;
  // ---- the square ----
  const cobble = new THREE.Mesh(new THREE.PlaneGeometry(SQUARE.hw * 2 + 2, SQUARE.hd * 2 + 2).rotateX(-Math.PI / 2), std('#cfc4b2', 0.95)); cobble.position.y = 0.015; cobble.receiveShadow = !a.mobile; scene.add(cobble);
  for (let i = 0; i < 40; i++) { const s = new THREE.Mesh(new THREE.CircleGeometry(0.16 + (i % 3) * 0.04, 8).rotateX(-Math.PI / 2), std(i % 2 ? '#c2b7a4' : '#d9cfbd', 0.95)); s.position.set((Math.sin(i * 12.9898) * 0.5) * (SQUARE.hw * 2 - 1), 0.02, (Math.cos(i * 78.233) * 0.5) * (SQUARE.hd * 2 - 1)); scene.add(s); }
  const roof = std('#c9534f', 0.8), trim = std('#8a5a30', 0.85), stone = std('#b9b4a6', 0.9);
  const cottage = (x: number, z: number, w: number, h: number, tint: string) => {
    const g = new THREE.Group(); g.position.set(x, 0, z);
    add(g, new THREE.BoxGeometry(w, h, 3), std(tint, 0.9), 0, h / 2, 0);
    const r = add(g, new THREE.CylinderGeometry(0, w * 0.74, 1.4, 4), roof, 0, h + 0.7, 0); r.rotation.y = Math.PI / 4; r.scale.z = 3 / (w * 1.05);
    add(g, new THREE.BoxGeometry(0.8, 1.3, 0.1), trim, 0, 0.65, 1.52, false);
    for (const sx of [-1, 1]) add(g, new THREE.BoxGeometry(0.7, 0.7, 0.1), std('#9fd3ff', 0.3), sx * w * 0.3, h * 0.6, 1.52, false);
    scene.add(g);
  };
  cottage(-5, -6.5, 3.6, 2.6, '#f1e4cf'); cottage(0, -7, 4.4, 3, '#f7d9c4'); cottage(5.2, -6.5, 3.4, 2.4, '#e8efd8');
  // the stall with a striped awning
  const stall = new THREE.Group(); stall.position.set(-7.2, 0, 1.5);
  add(stall, new THREE.BoxGeometry(2.2, 1, 1.2), trim, 0, 0.5, 0);
  for (const sx of [-1, 1]) add(stall, new THREE.CylinderGeometry(0.05, 0.05, 2.2, 6), trim, sx * 1, 1.1, -0.5, false);
  for (let i = 0; i < 6; i++) add(stall, new THREE.BoxGeometry(0.4, 0.06, 1.5), std(i % 2 ? '#ffffff' : '#d6336c', 0.8), -1 + i * 0.4 + 0.2, 2.2 - i * 0.0, 0.1, false);
  scene.add(stall);
  // bunting between two poles across the front
  for (const sx of [-1, 1]) add(scene, new THREE.CylinderGeometry(0.06, 0.08, 4, 8), trim, sx * 7.5, 2, -2.5);
  for (let i = 0; i < 18; i++) { const t = i / 17; const flag = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.34, 3), std(PALETTE[i % 5], 0.8)); flag.position.set(-7.5 + t * 15, 3.95 - Math.sin(t * Math.PI) * 0.6, -2.5); flag.rotation.z = Math.PI; scene.add(flag); }
  // lamps
  for (const sx of [-1, 1]) { add(scene, new THREE.CylinderGeometry(0.05, 0.07, 2.4, 8), stone, sx * 4, 1.2, 3.6); add(scene, new THREE.SphereGeometry(0.18, 10, 8), new THREE.MeshStandardMaterial({ color: '#ffe9a8', emissive: '#ffb347', emissiveIntensity: 0.4 }), sx * 4, 2.5, 3.6, false); }
  // you, at the front, looking up
  const me = a.figure(setup.you.skin, 0.3);
  me.group.position.set(2.2, 0, 4.2); me.group.rotation.y = Math.PI;
  // ---- balloons ----
  const mats = PALETTE.map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.25, metalness: 0.05 }));
  const shinyMat = new THREE.MeshStandardMaterial({ color: '#ffd34a', roughness: 0.18, metalness: 0.7, emissive: '#7a5200', emissiveIntensity: 0.3 });
  const spikyMat = std('#5b5566', 0.6), knotMat = std('#6b6b6b', 0.7), stringMat = new THREE.MeshBasicMaterial({ color: '#f5f5f5' });
  const sphere = new THREE.SphereGeometry(1, 18, 14).scale(1, 1.15, 1);
  const spike = new THREE.ConeGeometry(0.12, 0.3, 6);
  type Node = { b: Balloon; g: THREE.Group; body: THREE.Mesh; gone: number };
  const nodes = new Map<number, Node>();
  const make = (b: Balloon): Node => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(sphere, b.kind === 'shiny' ? shinyMat : b.kind === 'spiky' ? spikyMat : mats[b.color]);
    body.scale.setScalar(b.r); body.castShadow = !a.mobile; g.add(body);
    if (b.kind === 'spiky') for (let i = 0; i < 8; i++) { const s = new THREE.Mesh(spike, spikyMat); const an = (i / 8) * Math.PI * 2; s.position.set(Math.cos(an) * b.r, Math.sin(i * 2.1) * b.r * 0.4, Math.sin(an) * b.r); s.lookAt(s.position.clone().multiplyScalar(2)); s.rotateX(Math.PI / 2); g.add(s); }
    add(g, new THREE.ConeGeometry(0.06, 0.1, 6), knotMat, 0, -b.r * 1.15 - 0.03, 0, false);
    add(g, new THREE.CylinderGeometry(0.008, 0.008, 1.3, 4), stringMat, 0, -b.r * 1.15 - 0.7, 0, false);
    g.position.set(b.x, b.y, b.z); scene.add(g);
    const n = { b, g, body, gone: -1 }; nodes.set(b.id, n); return n;
  };
  // ---- picking: nearest balloon to the finger on screen ----
  const v = new THREE.Vector3();
  const screenOf = (b: Balloon) => { v.set(b.x, b.y, b.z).project(camera); const r = a.renderer.domElement.getBoundingClientRect(); return { x: r.left + (v.x * 0.5 + 0.5) * r.width, y: r.top + (-v.y * 0.5 + 0.5) * r.height, px: (b.r / Math.max(1, camera.position.distanceTo(v.set(b.x, b.y, b.z)))) * r.height * 1.25 }; };
  const popAt = (cx: number, cy: number): boolean => {
    let best: Balloon | null = null, bd = Infinity;
    for (const b of sim.live) { const s = screenOf(b); const d = Math.hypot(s.x - cx, s.y - cy); const slop = Math.max(a.mobile ? 34 : 24, s.px + (a.mobile ? 20 : 10)); if (d < slop && d < bd) { bd = d; best = b; } }
    if (!best) return false;
    return sim.pop(best.id);
  };
  a.onTap((_ndc, client) => { if (!popAt(client.x, client.y)) a.play(vac.tick); });
  a.tip('go', a.mobile ? 'Tap the balloons before they float over the roofs — shiny ones are 50!' : 'Click the balloons before they float over the roofs — shiny ones are 50!', 4500);
  a.run((dt) => {
    sim.step(dt);
    for (const e of sim.events) {
      if (e.kind === 'pop' && e.item) {
        const n = nodes.get(e.item.id); const at = new THREE.Vector3(e.item.x, e.item.y, e.item.z);
        if (n) { scene.remove(n.g); nodes.delete(e.item.id); }
        a.chips(at, e.item.kind === 'big' ? 14 : 9, e.item.kind === 'shiny' ? '#ffd34a' : PALETTE[e.item.color]);
        if (e.item.kind === 'shiny') { a.sparks(at, 14); a.tip('shiny', 'Shiny! 50 points — and more with a chain', 3000); }
        a.float(e.item.x, e.item.y + 0.4, e.item.z, `+${e.value}${(e.mult ?? 1) > 1 ? ` ×${e.mult}` : ''}`, e.item.kind === 'shiny' ? 'gold' : '');
        a.play(e.item.kind === 'shiny' ? sfx.gold : sfx.collect); me.squash = 0.35;
      } else if (e.kind === 'spiky' && e.item) {
        const n = nodes.get(e.item.id); if (n) { scene.remove(n.g); nodes.delete(e.item.id); }
        a.puff(new THREE.Vector3(e.item.x, e.item.y, e.item.z), 6, '#5b5566'); a.banner('Spiky! Chain broken', 'warn'); a.play(vac.bump); me.squash = 0.6;
        a.tip('spiky', 'The dark spiky ones break your chain — let them float away', 3400);
      } else if (e.kind === 'gone' && e.item) { if (sim.gone === 3) a.tip('gone', 'Pop the high ones first — the low ones hang around', 3400); }
      else if (e.kind === 'combo') { a.banner(`×${e.mult} CHAIN!`, 'combo'); a.play(() => vac.combo(e.n ?? 1)); }
      else if (e.kind === 'burst') { a.banner('Party burst!', 'combo'); a.play(sfx.level); }
      else if (e.kind === 'warn') a.warn(e.n!);
    }
  }, (dt) => {
    for (const b of sim.items) {
      let n = nodes.get(b.id);
      if (!n) { if (b.state !== 'up') continue; n = make(b); }
      if (b.state === 'gone') { n.gone = n.gone < 0 ? 0 : n.gone + dt; n.g.position.y = b.y + n.gone * 1.4; n.g.scale.setScalar(Math.max(0.001, 1 - n.gone * 1.5)); if (n.gone > 0.7) { scene.remove(n.g); nodes.delete(b.id); } continue; }
      n.g.position.set(b.x, b.y, b.z);
      n.g.rotation.z = Math.sin(time.value * 1.3 + b.phase) * 0.12; n.g.rotation.x = Math.cos(time.value * 1.1 + b.phase) * 0.06;
      if (b.kind === 'shiny') n.body.rotation.y += dt * 2;
    }
    a.walk(me, 0.2, dt);
    me.fuzzy.group.rotation.x = lerp(me.fuzzy.group.rotation.x, -0.35, Math.min(1, dt * 3));
    a.setScore(sim.score);
    a.setCount(String(sim.popped), sim.gone ? `${sim.gone} floated away` : '');
    a.setTime(sim.clock.left);
    a.setCombo(sim.combo.chain, sim.combo.mult, sim.combo.next);
    if (sim.state === 'done') a.finish(sim.result());
  });
  void TOP;
  if (import.meta.env.DEV) (window as unknown as { __mg: unknown }).__mg = { id: 'balloon', sim, ctl: a.ctl, start: a.start, popAt, screenOf: (id: number) => { const b = sim.items.find((x) => x.id === id); return b ? screenOf(b) : null; }, finishNow: () => { (sim as unknown as { state: string }).state = 'done'; } };
}
