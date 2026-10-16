/**
 * Ice Skating — a real rink at dusk: glossy ice with hockey markings and scratches, dasher boards with adverts and glass, stands
 * full of cheering Fuzzy fans under floodlights, a Zamboni at the door, snowy pines. Eight glowing arches in a colour sequence
 * (the lit one has a beam, a curtain and chevrons); you — your own Fuzzy on skates with a scarf — carve through them while the
 * camera follows behind (looking ahead, the view widening with your speed), leaving fading skate lines on the ice.
 * Steering is direct (left = left, whichever way you face); rules: games/skate.ts; art: games/skateArt.ts; kit: land/mgScene.ts.
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { createArcade, feed, std, add, sfx, vac, lerp, type MiniSetup, type MiniHooks, type Figure } from '../mgScene';
import { BOTS } from './bots';
import { adventure } from '../adventures';
import { blob, cottage } from './sceneArt';
import { SkateSim, RINK, SKATE, SPIN, edge } from './skate';
import * as A from './skateArt';

const wrap = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));
const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));

/** each town rival skates its own lane beside the path you take, so nobody hides behind (or inside) anybody */
const LANES = [-1.15, 1.15, -2.1];
function rivalSpot(rs: SkateSim, i: number): { x: number; z: number } {
  let o = LANES[i % LANES.length]; const e = edge(rs.pos.x, rs.pos.z);
  const px = Math.cos(rs.heading), pz = -Math.sin(rs.heading); // sideways (left of travel is +… the sign doesn't matter, only that it is a side)
  let x = rs.pos.x + px * o, z = rs.pos.z + pz * o;
  if (edge(x, z).d > -0.5) { o = -o; x = rs.pos.x + px * o; z = rs.pos.z + pz * o; }
  if (edge(x, z).d > -0.4) { x = rs.pos.x; z = rs.pos.z; }
  void e; return { x, z };
}

export function run(stage: HTMLElement, setup: MiniSetup, hooks: MiniHooks): void {
  const adv = adventure('skate')!;
  const sim = new SkateSim(setup.variant, setup.seed);
  const portrait = setup.mobile && innerHeight > innerWidth;
  const mobile = setup.mobile;
  const SIZE = 0.42;
  const scarfMat = std('#d6336c', 0.8), bladeMat = new THREE.MeshStandardMaterial({ color: '#d5dbe2', metalness: 0.85, roughness: 0.22 }), bootMat = std('#f6f8fb', 0.45);
  const tails: THREE.Mesh[] = [];
  /** skates under a Fuzzy and a scarf round it (props only — the Fuzzy itself is never touched) */
  const mirrored: { src: THREE.Object3D; dst: THREE.Object3D }[] = [];
  const dress = (f: Figure, mine: boolean): void => {
    const k = SIZE / 0.3; // the props were drawn for a 0.3 Fuzzy
    const sc = add(f.fuzzy.group, new THREE.TorusGeometry(0.24, 0.06, 8, 16), scarfMat, 0, -0.05, 0, false); sc.rotation.x = Math.PI / 2;
    const tail = add(f.fuzzy.group, new THREE.BoxGeometry(0.1, 0.3, 0.04), scarfMat, 0.12, -0.2, -0.26, false); if (mine) tails.push(tail);
    for (const sx of [-1, 1]) {
      const boot = new THREE.Mesh(new RoundedBoxGeometry(0.11, 0.12, 0.27, 2, 0.04), bootMat); boot.position.set(sx * 0.12 * k, 0.11 * k, 0.05 * k); boot.scale.setScalar(k); f.group.add(boot);
      const bl = add(f.group, new THREE.BoxGeometry(0.026, 0.05, 0.36), bladeMat, sx * 0.12 * k, 0.035 * k, 0.05 * k, false); bl.scale.setScalar(k);
    }
    // its reflection in the ice
    if (mirrorRoot) { const dst = A.mirrorClone(f.group); mirrorRoot.add(dst); mirrored.push({ src: f.group, dst }); }
  };
  let mirrorRoot: THREE.Group | null = null;
  const a = createArcade(stage, {
    cls: 'skate', setup, adv, hooks, buttonLabel: 'Onto the ice!',
    rivals: { you: sim, make: () => new SkateSim(setup.variant, setup.seed), bot: BOTS.skate, decorate: (f) => dress(f, false), size: SIZE,
      pose: (rs: SkateSim, i: number) => { const o = rivalSpot(rs, i); return { x: o.x, z: o.z, heading: rs.heading, moving: rs.speed / SKATE.speed * 0.6 }; } },
    hud: { count: 'GATES' },
    world: { size: { hw: 17, hd: 12 }, treeLine: false, fence: false, flowers: 0, clouds: false, tufts: false, path: false, sky: 'snow' },
    controls: { mouseSteer: false },
    onStart: () => { sim.start(); startedAt = a.time.value; },
  });
  let startedAt = 0;
  const next = feed(sim); // events from taps / buttons between steps
  const { scene, time } = a;

  // ---- the evening: a deep blue sky, a peach glow at the horizon, warm light ----
  a.ground.visible = false;
  a.sky.material = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uTop: { value: new THREE.Color('#1a3470') }, uMid: { value: new THREE.Color('#4f82cc') }, uHorizon: { value: new THREE.Color('#f2c9a6') } },
    vertexShader: 'varying vec3 vD; void main() { vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform vec3 uTop, uMid, uHorizon; varying vec3 vD;
      void main() { float y = max(vD.y, 0.0); vec3 c = mix(uHorizon, uMid, smoothstep(0.0, 0.16, y)); c = mix(c, uTop, smoothstep(0.1, 0.65, y));
      gl_FragColor = vec4(c, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`,
  });
  scene.fog = new THREE.Fog('#d3d4e4', 40, 130); scene.environmentIntensity = 0.55; a.renderer.toneMappingExposure = 0.92;
  a.sun.color.set('#ffe0bc'); a.sun.intensity = 1.25; a.hemi.color.set('#a9c4f2'); a.hemi.groundColor.set('#dfe7f3'); a.hemi.intensity = 0.7;
  for (const sx of [-1, 1]) { const pl = new THREE.PointLight('#ffe8c2', mobile ? 26 : 38, 40, 1.5); pl.position.set(sx * 7, 8, 0); scene.add(pl); }

  // ---- the rink ----
  const ice = A.iceSheet(mobile); scene.add(ice, A.snowField());
  const brd = A.boards(mobile); scene.add(brd);
  const crowd = A.stands(mobile); scene.add(crowd.group);
  const lamps = A.floodlights(mobile); scene.add(lamps.group);
  // the glossy ice is a little see-through: under it, a mirror world (boards, stands, fans, lamps, gates, skaters) shows as reflections
  const mirror = new THREE.Group(); mirrorRoot = mirror; mirror.position.y = 0.06; mirror.scale.y = -1; scene.add(mirror);
  const under = new THREE.Mesh(new THREE.PlaneGeometry(220, 220).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#d8e6f3' })); under.position.y = -9; scene.add(under);
  mirror.add(A.mirrorClone(brd), A.mirrorClone(crowd.group), A.mirrorClone(lamps.group));
  const zam = A.zamboni(); zam.group.position.set(RINK.hw + 3.6, 0, 1.4); zam.group.rotation.y = Math.PI; scene.add(zam.group);
  const hut = cottage({ w: 3, d: 2.6, h: 2.3, wall: '#e0506c', roof: '#eef3fa', trim: '#fff3dc', door: '#6a4020', seed: 4 }); hut.position.set(RINK.hw + 4.2, 0, -4.2); hut.rotation.y = -Math.PI / 2; scene.add(hut);
  scene.add(A.surroundings(mobile));
  const snow = A.snowfall(mobile); scene.add(snow.points);

  // ---- gates: glowing arches in a colour sequence ----
  const gates = sim.gates.map((g, i) => { const art = A.gateArt(i, g.dir, mobile); art.group.position.set(g.x, 0, g.z); art.mirror.position.set(g.x, 0, g.z); scene.add(art.group); mirror.add(art.mirror); return art; });
  const light = (i: number) => gates.forEach((g, j) => g.setLit(j === i));
  light(sim.next);

  // ---- snowmen: smooth snowballs with a carrot nose, scarf and top hat ----
  const coal = std('#2b2a2e', 0.6), carrot = std('#ff8c42', 0.7), hatMat = std('#3a3540', 0.7), snowMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9 }), wood = std('#8a5a30', 0.85);
  for (const m of sim.snowmen) {
    const g = new THREE.Group(); g.position.set(m.x, 0, m.z); g.rotation.y = Math.atan2(-m.x, -m.z);
    add(g, blob(0.52, 2, 0.04, m.id), snowMat, 0, 0.45, 0); add(g, blob(0.38, 2, 0.04, m.id + 3), snowMat, 0, 1.1, 0); add(g, blob(0.28, 2, 0.04, m.id + 7), snowMat, 0, 1.6, 0);
    add(g, new THREE.ConeGeometry(0.05, 0.3, 8), carrot, 0, 1.62, 0.36, false).rotation.x = Math.PI / 2;
    for (const sx of [-1, 1]) add(g, new THREE.SphereGeometry(0.035, 6, 5), coal, sx * 0.1, 1.7, 0.25, false);
    for (let i = 0; i < 3; i++) add(g, new THREE.SphereGeometry(0.035, 6, 5), coal, 0, 1.0 + i * 0.14, 0.36, false);
    const sc = add(g, new THREE.TorusGeometry(0.26, 0.06, 8, 16), scarfMat, 0, 1.38, 0, false); sc.rotation.x = Math.PI / 2;
    add(g, new THREE.CylinderGeometry(0.3, 0.3, 0.04, 14), hatMat, 0, 1.84, 0, false); add(g, new THREE.CylinderGeometry(0.19, 0.2, 0.3, 14), hatMat, 0, 2.0, 0, false);
    for (const sx of [-1, 1]) { const arm = add(g, new THREE.CylinderGeometry(0.025, 0.035, 0.7, 5), wood, sx * 0.55, 1.2, 0, false); arm.rotation.z = sx * -1.1; }
    scene.add(g);
  }

  // ---- you: your own Fuzzy on skates, a scarf, blades that flash ----
  const me = a.figure(setup.you.skin, SIZE); dress(me, true);
  me.group.position.set(sim.pos.x, 0, sim.pos.z); me.group.rotation.y = sim.heading;
  const trailMe = A.trail(90, 4.5, mobile); scene.add(trailMe.mesh);
  const trailRiv: A.Trail[] = [];

  // ---- the camera: behind you and a little above, looking ahead; the view widens as you speed up ----
  const overview = new THREE.Vector3(-15, 9.5, 15.5), overLook = new THREE.Vector3(1, 0.6, -1);
  a.camera.position.copy(overview); a.camera.lookAt(overLook);
  const BASE_FOV = portrait ? 66 : 56; let yaw = sim.heading, lastFov = 0, shake = 0;
  const chasePos = new THREE.Vector3(), chaseLook = new THREE.Vector3();
  a.setRig((cam, dt) => {
    yaw += wrap(sim.heading - yaw) * Math.min(1, dt * 3.4);
    const fx = Math.sin(yaw), fz = Math.cos(yaw);
    const back = portrait ? 4.6 : 4.2, up = portrait ? 3.3 : 2.5, ahead = portrait ? 5 : 4;
    let cx = sim.pos.x - fx * back, cz = sim.pos.z - fz * back;
    const e = edge(cx, cz); if (e.d > -0.7) { cx -= e.nx * (e.d + 0.7); cz -= e.nz * (e.d + 0.7); }
    chasePos.set(cx, up, cz); chaseLook.set(sim.pos.x + fx * ahead, 0.5, sim.pos.z + fz * ahead);
    // the first second and a half glide in from the overview
    const k = a.started() ? clamp((time.value - startedAt) / 1.6, 0, 1) : 0, ease = k * k * (3 - 2 * k);
    cam.position.lerpVectors(overview, chasePos, ease); const look = new THREE.Vector3().lerpVectors(overLook, chaseLook, ease);
    if (shake > 0) { shake = Math.max(0, shake - dt * 2.4); cam.position.x += Math.sin(time.value * 53) * 0.05 * shake; cam.position.y += Math.sin(time.value * 61) * 0.05 * shake; }
    cam.lookAt(look); cam.rotateZ(-sim.drift * 0.05 * ease);
    const fov = BASE_FOV + 5 * (sim.speed / SKATE.speed) * ease; if (Math.abs(fov - lastFov) > 0.05) { cam.fov = fov; cam.updateProjectionMatrix(); lastFov = fov; }
    a.camTarget.set(sim.pos.x, 0, sim.pos.z);
  });

  // ---- controls: lean = steer. Keys, a stick, or hold the left / right side of the screen ----
  let holdSide = 0, holdId = -1;
  const ignore = (t: EventTarget | null) => !!(t as HTMLElement | null)?.closest?.('button, .mg-intro, .race-paused, .race-pause');
  const onDown = (e: PointerEvent) => { if (ignore(e.target) || !a.started() || a.paused() || (e.pointerType === 'mouse' && e.button !== 0)) return; holdId = e.pointerId; holdSide = e.clientX < a.root.getBoundingClientRect().left + a.root.clientWidth / 2 ? -1 : 1; padHint.classList.add('gone'); };
  const onUp = (e: PointerEvent) => { if (e.pointerId === holdId) { holdId = -1; holdSide = 0; } };
  a.root.addEventListener('pointerdown', onDown); addEventListener('pointerup', onUp); addEventListener('pointercancel', onUp);
  const steerOf = (x: number): number => (Math.abs(x) > 0.12 ? clamp(x * 1.5, -1, 1) : holdSide * 0.85);

  // ---- HUD: SPIN, a pointer to the lit gate, where to press ----
  const spinBtn = document.createElement('button'); spinBtn.type = 'button'; spinBtn.className = 'mg-action'; spinBtn.textContent = a.mobile ? 'SPIN' : 'SPIN (Space)';
  const doSpin = () => { if (!a.started() || a.paused()) return; if (sim.spin()) { a.play(sfx.collect); me.squash = 0.4; } else a.play(vac.tick); };
  spinBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); doSpin(); }); a.hud.append(spinBtn);
  a.onAction(doSpin);
  const arrow = document.createElement('div'); arrow.className = 'sk-gate'; arrow.innerHTML = '<i></i>'; a.hud.append(arrow);
  const padHint = document.createElement('div'); padHint.className = 'sk-pads'; padHint.innerHTML = '<span>‹</span><span>›</span>'; if (a.mobile) a.hud.append(padHint);
  a.tip('go', a.mobile ? 'Hold the left or right side of the screen to steer — lean towards the glowing gate and you carve right through it' : 'A / D or ← → to steer — lean towards the glowing gate and you carve right through it', 5200);

  let cheer = 0, sprayT = 0, tilt = 0, roll = 0;
  const flare = (x: number, z: number) => a.sparks(new THREE.Vector3(x, 1, z), 10);
  a.run((dt, input) => {
    for (const e of next(() => sim.step(dt, { x: steerOf(input.x), z: 0 }))) {
      if ((e.kind === 'gate' || e.kind === 'clean') && e.gate) {
        light(sim.next); gates[e.gate.id].burst();
        a.float(e.gate.x, 1.9, e.gate.z, e.kind === 'clean' ? `CLEAN +${e.value}` : `+${e.value}`, e.kind === 'clean' ? 'gold' : '');
        if (e.kind === 'clean') { flare(e.gate.x, e.gate.z); a.play(sfx.gold); cheer = Math.max(cheer, 0.9); } else a.play(sfx.collect);
        me.squash = 0.3;
        if (sim.gatesTaken === 1) a.tip('clean', 'Through the middle with no crash = a CLEAN gate, 45 points', 3600);
        else if (sim.gatesTaken === 3) a.tip('spin', a.mobile ? 'Tap SPIN once between gates for 15 style points — you keep steering' : 'Press Space once between gates for a 15-point spin — you keep steering', 3800);
      } else if (e.kind === 'missed' && e.gate) { light(sim.next); a.banner('Missed the gate — the next one lights up', 'warn'); a.play(vac.tick); a.tip('missed', 'Lean towards the gate early and you carve right through', 3600); }
      else if (e.kind === 'spin') { a.play(sfx.collect); }
      else if (e.kind === 'spinDone') { a.float(sim.pos.x, 1.4, sim.pos.z, `spin +${e.value}`, 'gold'); a.sparks(new THREE.Vector3(sim.pos.x, 0.8, sim.pos.z), 8); a.play(sfx.gold); me.squash = 0.4; cheer = Math.max(cheer, 0.6); }
      else if (e.kind === 'crash') { a.banner(`Bump! −${e.value}`, 'warn'); a.play(vac.bump); me.squash = 0.75; shake = 1; a.puff(new THREE.Vector3(sim.pos.x, 0.5, sim.pos.z), 10, '#ffffff'); a.tip('crash', 'Steer round the snowmen — a bump costs 20 and your speed', 3600); }
      else if (e.kind === 'boards') { a.play(vac.bump); me.squash = 0.3; shake = 0.4; a.chips(new THREE.Vector3(sim.pos.x, 0.3, sim.pos.z), 5, '#eaf6ff'); }
      else if (e.kind === 'lap') { a.banner(`Lap ${e.n} done!`, 'combo'); a.play(sfx.level); cheer = 1.6; }
      else if (e.kind === 'warn') a.warn(e.n!);
    }
  }, (dt) => {
    const t = time.value;
    // you: heading, a spin on top of it, a lean into the carve, a little forward tilt with speed
    const spinK = sim.spinning > 0 ? 1 - sim.spinning / SPIN.time : 0;
    me.group.position.set(sim.pos.x, 0, sim.pos.z); me.group.rotation.y = sim.heading + spinK * Math.PI * 2;
    tilt = lerp(tilt, sim.drift * 0.42, Math.min(1, dt * 9)); roll = lerp(roll, sim.drift, Math.min(1, dt * 6));
    me.fuzzy.group.rotation.z = tilt + Math.sin(t * 4) * 0.03; me.fuzzy.group.rotation.x = -0.05 - 0.12 * (sim.speed / SKATE.speed);
    if (sim.spinning > 0) me.fuzzy.group.position.y = me.base + Math.sin(spinK * Math.PI) * 0.4; else a.walk(me, 0.12 * (sim.speed / SKATE.speed), dt);
    for (const tl of tails) tl.rotation.x = -0.4 - Math.sin(t * 7) * 0.25 * (sim.speed / SKATE.speed) - Math.abs(roll) * 0.4;
    // trails and spray
    if (sim.state === 'playing') trailMe.add(sim.pos.x, sim.pos.z, sim.heading, t);
    trailMe.update(t); for (const m of mirrored) A.syncMirror(m.src, m.dst);
    const rf = a.rivals?.rivals ?? [];
    rf.forEach((rr, i) => { const r = { sim: rr.sim as unknown as SkateSim }; if (!trailRiv[i]) { trailRiv[i] = A.trail(60, 3.5, mobile); scene.add(trailRiv[i].mesh); } if (r.sim.state === 'playing') { const o = rivalSpot(r.sim, i); trailRiv[i].add(o.x, o.z, r.sim.heading, t); } trailRiv[i].update(t); });
    sprayT -= dt;
    if (Math.abs(sim.turnRate) > 1.5 && sim.speed > 2 && sprayT <= 0) { sprayT = 0.07; const side = Math.sign(sim.turnRate); a.puff(new THREE.Vector3(sim.pos.x + Math.cos(sim.heading) * side * 0.16, 0.1, sim.pos.z - Math.sin(sim.heading) * side * 0.16), 2, '#f2f9ff'); if (Math.random() < 0.5) a.chips(new THREE.Vector3(sim.pos.x, 0.08, sim.pos.z), 1, '#ffffff'); }
    // the world
    gates.forEach((g, i) => { g.update(t); g.fade(a.camera.position, sim.gates[i]); });
    cheer = Math.max(0, cheer - dt * 0.8); crowd.update(t, dt, cheer); zam.update(t); snow.update(dt, a.camera.position);
    // the arrow to the lit gate (shows when it isn't straight ahead)
    const aim = sim.aim(); const err = wrap(Math.atan2(aim.x - sim.pos.x, aim.z - sim.pos.z) - sim.heading);
    const show = sim.state === 'playing' && Math.abs(err) > 0.55; arrow.classList.toggle('on', show);
    if (show) { arrow.style.setProperty('--rot', `${(-err * 180 / Math.PI).toFixed(0)}deg`); arrow.style.setProperty('--gc', '#' + gates[sim.next].color.getHexString()); }
    spinBtn.classList.toggle('on', sim.state === 'playing' && !sim.spun && sim.spinning === 0 && sim.speed >= SPIN.minSpeed);
    a.setScore(sim.score);
    a.setCount(String(sim.gatesTaken), `lap ${sim.lap + 1}`);
    a.setTime(sim.clock.left);
    if (sim.state === 'done') a.finish(sim.result());
  });
  if (import.meta.env.DEV) (window as unknown as { __mg: unknown }).__mg = { id: 'skate', sim, ctl: a.ctl, start: a.start, spin: () => sim.spin(), finishNow: () => { (sim as unknown as { state: string }).state = 'done'; }, cheer: () => { cheer = 1.6; }, hold: (s: number) => { holdSide = s; }, snap: () => { yaw = sim.heading; startedAt = -99; } };
}
