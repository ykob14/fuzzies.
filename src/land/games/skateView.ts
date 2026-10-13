/**
 * Ice Skating — the 3D frozen pond: an oval of glossy ice with boards round it, snow all about, winter trees; eight flag gates
 * (the lit one glows gold with a chevron on the ice), five snowmen, you with a scarf and skates — leaning into turns, spraying
 * ice when you slide, hopping into a spin. A high camera keeps you and the next gate in view whichever way you glide.
 * Rules: games/skate.ts; scene, HUD, loop and chrome: land/mgScene.ts.
 */
import * as THREE from 'three';
import { createArcade, std, add, sfx, vac, lerp, type MiniSetup, type MiniHooks } from '../mgScene';
import { adventure } from '../adventures';
import { blob } from './sceneArt';
import { paint as shade } from './orchardArt';
import { SkateSim, RINK, GATE_HW, SPIN, type Gate } from './skate';

export function run(stage: HTMLElement, setup: MiniSetup, hooks: MiniHooks): void {
  const adv = adventure('skate')!;
  const sim = new SkateSim(setup.variant, setup.seed);
  const portrait = setup.mobile && innerHeight > innerWidth;
  const a = createArcade(stage, {
    cls: 'skate', setup, adv, hooks, buttonLabel: 'Onto the ice!',
    hud: { count: 'GATES' },
    camera: portrait ? { fov: 60, back: 2.5, up: 24, lookDy: -2, lookY: 0.3, lead: 0 } : { fov: 50, back: 2.5, up: 17.5, lookDy: -2, lookY: 0.3, lead: 0 },
    world: { size: { hw: 17, hd: 12 }, ground: ['#f3f7fb', '#e2eaf1'], path: false, fence: false, flowers: 0, sky: 'snow' },
    controls: { mouseSteer: false },
    onStart: () => sim.start(),
  });
  const { scene, time } = a;
  // ---- the pond: glossy ice, a faint track ring, boards with a blue rail ----
  const oval = (rx: number, rz: number) => { const s = new THREE.Shape(); s.absellipse(0, 0, rx, rz, 0, Math.PI * 2, false, 0); return new THREE.ShapeGeometry(s, 64).rotateX(-Math.PI / 2); };
  const ice = new THREE.Mesh(oval(RINK.hw, RINK.hd), new THREE.MeshStandardMaterial({ color: '#d9ecfa', roughness: 0.08, metalness: 0.12 })); ice.position.y = 0.02; ice.receiveShadow = !a.mobile; scene.add(ice);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.98, 1, 72).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#8fc3ea', transparent: true, opacity: 0.6 })); ring.scale.set(RINK.hw - 2.4, 1, RINK.hd - 2); ring.position.y = 0.03; scene.add(ring);
  const centre = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.2, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#d6336c', transparent: true, opacity: 0.45 })); centre.position.y = 0.03; scene.add(centre);
  const boardMat = std('#f7f7f4', 0.8), railMat = std('#4fa3ff', 0.5);
  const N = 60;
  for (let i = 0; i < N; i++) {
    const an = (i / N) * Math.PI * 2, an2 = ((i + 1) / N) * Math.PI * 2;
    const x1 = Math.cos(an) * (RINK.hw + 0.2), z1 = Math.sin(an) * (RINK.hd + 0.2), x2 = Math.cos(an2) * (RINK.hw + 0.2), z2 = Math.sin(an2) * (RINK.hd + 0.2);
    const len = Math.hypot(x2 - x1, z2 - z1) + 0.04, yaw = -Math.atan2(z2 - z1, x2 - x1);
    const b = add(scene, new THREE.BoxGeometry(len, 0.8, 0.12), boardMat, (x1 + x2) / 2, 0.4, (z1 + z2) / 2, false); b.rotation.y = yaw;
    const r = add(scene, new THREE.BoxGeometry(len, 0.08, 0.2), railMat, (x1 + x2) / 2, 0.84, (z1 + z2) / 2, false); r.rotation.y = yaw;
  }
  // snow drifts round the boards, a bench and a lamp by the pond
  const snowMat = std('#ffffff', 0.95);
  const driftMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75 });
  for (let i = 0; i < 14; i++) { const an = (i / 14) * Math.PI * 2 + 0.2; const d = add(scene, shade(blob(0.9 + (i % 3) * 0.3, 2, 0.1, i), (_p, n, c) => c.set('#c9d9ec').lerp(new THREE.Color('#ffffff'), Math.max(0, n.y) * 0.9)), driftMat, Math.cos(an) * (RINK.hw + 1.6), -0.35, Math.sin(an) * (RINK.hd + 1.6), false); d.scale.y = 0.55; }
  const wood = std('#8a5a30', 0.85);
  const bench = new THREE.Group(); bench.position.set(0, 0, RINK.hd + 2.2);
  add(bench, new THREE.BoxGeometry(2, 0.1, 0.5), wood, 0, 0.5, 0); add(bench, new THREE.BoxGeometry(2, 0.4, 0.08), wood, 0, 0.8, -0.22); for (const sx of [-1, 1]) add(bench, new THREE.BoxGeometry(0.1, 0.5, 0.5), wood, sx * 0.9, 0.25, 0, false);
  add(bench, new THREE.BoxGeometry(2.05, 0.08, 0.55), snowMat, 0, 0.59, 0, false); scene.add(bench);
  for (const sx of [-1, 1]) { add(scene, new THREE.CylinderGeometry(0.05, 0.08, 2.6, 8), std('#5a5f66', 0.7), sx * 4.5, 1.3, RINK.hd + 2); add(scene, new THREE.SphereGeometry(0.2, 10, 8), new THREE.MeshStandardMaterial({ color: '#ffe9a8', emissive: '#ffb347', emissiveIntensity: 0.5 }), sx * 4.5, 2.7, RINK.hd + 2, false); }
  // ---- gates: two poles with pennants; the lit one glows gold with a chevron on the ice ----
  const poleMat = std('#e8e2d6', 0.6), flagMat = std('#d6336c', 0.7);
  const litFlag = new THREE.MeshStandardMaterial({ color: '#ffd34a', emissive: '#8a5a00', emissiveIntensity: 0.7, roughness: 0.4 });
  const lineMat = new THREE.MeshBasicMaterial({ color: '#ffd34a', transparent: true, opacity: 0.55 });
  const dimLine = new THREE.MeshBasicMaterial({ color: '#8fc3ea', transparent: true, opacity: 0.25 });
  type GateNode = { g: Gate; flags: THREE.Mesh[]; line: THREE.Mesh; chevron: THREE.Mesh };
  const gateNodes: GateNode[] = sim.gates.map((g) => {
    const grp = new THREE.Group(); grp.position.set(g.x, 0, g.z); grp.rotation.y = Math.atan2(g.dir.x, g.dir.z);
    const flags: THREE.Mesh[] = [];
    for (const sx of [-1, 1]) {
      add(grp, new THREE.CylinderGeometry(0.05, 0.06, 1.7, 8), poleMat, sx * GATE_HW, 0.85, 0);
      const f = add(grp, new THREE.ConeGeometry(0.22, 0.5, 3), flagMat, sx * GATE_HW + sx * 0.14, 1.5, 0, false); f.rotation.z = sx * Math.PI / 2; flags.push(f);
    }
    const line = add(grp, new THREE.BoxGeometry(GATE_HW * 2, 0.01, 0.28), dimLine, 0, 0.035, 0, false);
    const chevron = add(grp, new THREE.ConeGeometry(0.45, 0.9, 3), lineMat, 0, 0.05, 0.9, false); chevron.rotation.x = Math.PI / 2; chevron.rotation.y = Math.PI; chevron.visible = false;
    scene.add(grp);
    return { g, flags, line, chevron };
  });
  const light = (i: number) => gateNodes.forEach((n, j) => { const on = j === i; n.flags.forEach((f) => { f.material = on ? litFlag : flagMat; }); n.line.material = on ? lineMat : dimLine; n.chevron.visible = on; });
  light(sim.next);
  // ---- snowmen ----
  const coal = std('#2b2a2e', 0.6), carrot = std('#ff8c42', 0.7), scarfMat = std('#d6336c', 0.8), hatMat = std('#3a3540', 0.7);
  for (const m of sim.snowmen) {
    const g = new THREE.Group(); g.position.set(m.x, 0, m.z); g.rotation.y = Math.atan2(-m.x, -m.z);
    add(g, new THREE.SphereGeometry(0.52, 14, 10), snowMat, 0, 0.45, 0); add(g, new THREE.SphereGeometry(0.38, 14, 10), snowMat, 0, 1.12, 0); add(g, new THREE.SphereGeometry(0.28, 14, 10), snowMat, 0, 1.64, 0);
    add(g, new THREE.ConeGeometry(0.05, 0.3, 8), carrot, 0, 1.64, 0.36, false).rotation.x = Math.PI / 2;
    for (const sx of [-1, 1]) add(g, new THREE.SphereGeometry(0.035, 6, 5), coal, sx * 0.1, 1.72, 0.25, false);
    for (let i = 0; i < 3; i++) add(g, new THREE.SphereGeometry(0.035, 6, 5), coal, 0, 1.0 + i * 0.14, 0.36, false);
    const sc = add(g, new THREE.TorusGeometry(0.26, 0.06, 8, 16), scarfMat, 0, 1.4, 0, false); sc.rotation.x = Math.PI / 2;
    add(g, new THREE.CylinderGeometry(0.3, 0.3, 0.04, 14), hatMat, 0, 1.88, 0, false); add(g, new THREE.CylinderGeometry(0.19, 0.2, 0.3, 14), hatMat, 0, 2.04, 0, false);
    for (const sx of [-1, 1]) { const arm = add(g, new THREE.CylinderGeometry(0.025, 0.035, 0.7, 5), wood, sx * 0.55, 1.25, 0, false); arm.rotation.z = sx * -1.1; }
    scene.add(g);
  }
  // ---- you: a Fuzzy on skates with a scarf ----
  const me = a.figure(setup.you.skin, 0.3);
  const scarf = add(me.fuzzy.group, new THREE.TorusGeometry(0.24, 0.06, 8, 16), scarfMat, 0, -0.05, 0, false); scarf.rotation.x = Math.PI / 2;
  const tail = add(me.fuzzy.group, new THREE.BoxGeometry(0.1, 0.3, 0.04), scarfMat, 0.12, -0.2, -0.26, false);
  const bladeMat = new THREE.MeshStandardMaterial({ color: '#cfd6dd', metalness: 0.8, roughness: 0.25 });
  for (const sx of [-1, 1]) add(me.group, new THREE.BoxGeometry(0.05, 0.04, 0.4), bladeMat, sx * 0.13, 0.03, 0.04, false);
  me.group.position.set(sim.pos.x, 0, sim.pos.z); me.group.rotation.y = sim.heading;
  // ---- HUD: the SPIN button ----
  const spinBtn = document.createElement('button'); spinBtn.type = 'button'; spinBtn.className = 'mg-action'; spinBtn.textContent = a.mobile ? 'SPIN' : 'SPIN (Space)';
  const doSpin = () => { if (!a.started() || a.paused()) return; if (sim.spin()) { a.play(sfx.collect); me.squash = 0.4; } else a.play(vac.tick); };
  spinBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); doSpin(); }); a.hud.append(spinBtn);
  a.onAction(doSpin);
  a.tip('go', a.mobile ? 'Hold left or right to lean — you slide, so turn early. Glide through the glowing gate' : 'A / D or ← → to lean — you slide, so turn early. Glide through the glowing gate', 5000);
  let sprayT = 0, tilt = 0;
  a.run((dt, input) => {
    sim.step(dt, input);
    for (const e of sim.events) {
      if ((e.kind === 'gate' || e.kind === 'clean') && e.gate) {
        light(sim.next);
        a.float(e.gate.x, 1.6, e.gate.z, e.kind === 'clean' ? `CLEAN +${e.value}` : `+${e.value}`, e.kind === 'clean' ? 'gold' : '');
        if (e.kind === 'clean') { a.sparks(new THREE.Vector3(e.gate.x, 1, e.gate.z), 12); a.play(sfx.gold); } else a.play(sfx.collect);
        me.squash = 0.3;
        if (sim.gatesTaken === 1) a.tip('clean', 'Through the middle with no crash = a CLEAN gate, 45 points', 3600);
        else if (sim.gatesTaken === 2) a.tip('spin', a.mobile ? 'Tap SPIN once between gates for 15 style points' : 'Press Space once between gates for a 15-point spin', 3600);
      } else if (e.kind === 'missed' && e.gate) { light(sim.next); a.banner('Missed the gate — the next one lights up', 'warn'); a.play(vac.tick); a.tip('missed', 'Line up early: aim at the gate before you get there', 3600); }
      else if (e.kind === 'spin') { a.play(sfx.collect); }
      else if (e.kind === 'spinDone') { a.float(sim.pos.x, 1.4, sim.pos.z, `spin +${e.value}`, 'gold'); a.sparks(new THREE.Vector3(sim.pos.x, 0.8, sim.pos.z), 8); a.play(sfx.gold); me.squash = 0.4; }
      else if (e.kind === 'crash') { a.banner(`Crash! −${e.value}`, 'warn'); a.play(vac.bump); me.squash = 0.75; a.puff(new THREE.Vector3(sim.pos.x, 0.5, sim.pos.z), 10, '#ffffff'); a.tip('crash', 'Steer round the snowmen — a crash costs 20 and your speed', 3600); }
      else if (e.kind === 'boards') { a.play(vac.bump); me.squash = 0.4; a.puff(new THREE.Vector3(sim.pos.x, 0.4, sim.pos.z), 5, '#ffffff'); }
      else if (e.kind === 'lap') { a.banner(`Lap ${e.n} done!`, 'combo'); a.play(sfx.level); }
      else if (e.kind === 'warn') a.warn(e.n!);
    }
  }, (dt) => {
    // you
    me.group.position.set(sim.pos.x, 0, sim.pos.z); me.group.rotation.y = sim.heading;
    const lean = sim.spinning > 0 ? 0 : Math.max(-1, Math.min(1, sim.drift * 2.2));
    tilt = lerp(tilt, lean * 0.35, Math.min(1, dt * 8));
    me.fuzzy.group.rotation.z = tilt + Math.sin(time.value * 4) * 0.05 * (sim.speed / 5.6);
    me.fuzzy.group.rotation.x = sim.spinning > 0 ? -0.2 : -0.08 * (sim.speed / 5.6);
    if (sim.spinning > 0) me.fuzzy.group.position.y = me.base + Math.sin((1 - sim.spinning / SPIN.time) * Math.PI) * 0.45;
    else a.walk(me, 0.25 * (sim.speed / 5.6), dt);
    tail.rotation.x = -0.4 - Math.sin(time.value * 6) * 0.3 * (sim.speed / 5.6);
    // ice spray when sliding sideways
    sprayT -= dt;
    if (Math.abs(sim.drift) > 0.3 && sim.speed > 2 && sprayT <= 0) { sprayT = 0.09; const side = Math.sign(sim.drift); a.puff(new THREE.Vector3(sim.pos.x - Math.cos(sim.heading) * side * 0.3, 0.15, sim.pos.z + Math.sin(sim.heading) * side * 0.3), 2, '#ffffff'); }
    // the lit gate breathes; its chevron bobs
    const lit = gateNodes[sim.next]; litFlag.emissiveIntensity = 0.6 + Math.sin(time.value * 5) * 0.3; lit.chevron.position.z = 0.9 + Math.sin(time.value * 4) * 0.15;
    // the camera sits high and leans towards the next gate
    const g = sim.gate; const gx = (g.x - sim.pos.x), gz = (g.z - sim.pos.z); const gd = Math.hypot(gx, gz) || 1; const lead = Math.min(4, gd * 0.4);
    a.camTarget.x = lerp(a.camTarget.x, sim.pos.x + (gx / gd) * lead, Math.min(1, dt * 3));
    a.camTarget.z = lerp(a.camTarget.z, sim.pos.z + (gz / gd) * lead, Math.min(1, dt * 3));
    spinBtn.classList.toggle('on', sim.state === 'playing' && !sim.spun && sim.spinning === 0 && sim.speed >= SPIN.minSpeed);
    a.setScore(sim.score);
    a.setCount(String(sim.gatesTaken), `lap ${sim.lap + 1}`);
    a.setTime(sim.clock.left);
    if (sim.state === 'done') a.finish(sim.result());
  });
  if (import.meta.env.DEV) (window as unknown as { __mg: unknown }).__mg = { id: 'skate', sim, ctl: a.ctl, start: a.start, spin: () => sim.spin(), finishNow: () => { (sim as unknown as { state: string }).state = 'done'; } };
}
