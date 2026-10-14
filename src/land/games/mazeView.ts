/**
 * Fuzzy Maze — the 3D misty hedge maze: tall clipped hedges over a gravel floor seen from close behind your Fuzzy (mist hides the
 * far corridors), keys and stars that bob and spin, red peek mushrooms (the view lifts over the hedges for a moment), hedgehogs
 * trundling the corridors, a stone-and-timber gate whose padlock drops when the keys are found, a tap-to-walk marker and a map
 * that only fills in with what you've seen.
 * Rules: games/maze.ts; scene, HUD, loop and chrome: land/mgScene.ts.
 */
import * as THREE from 'three';
import { createArcade, std, add, sfx, vac, type MiniSetup, type MiniHooks } from '../mgScene';
import { adventure } from '../adventures';
import { groundTex, hedgeWalls } from './sceneArt';
import { MazeSim, N, CELL, KEYS, HALF, MOVE, type Pickup } from './maze';

/** the close, low camera (the hedges hide what's round the corner) and the high one a peek mushroom gives you */
const VIEW = { desk: { back: 4.6, up: 7.4, lookDy: -0.7 }, phone: { back: 5.2, up: 8.6, lookDy: -0.8 }, peek: { back: 6.5, up: 17, lookDy: -1.2 } };
const MIST = { near: 7.5, far: 14, peekNear: 22, peekFar: 40 };

export function run(stage: HTMLElement, setup: MiniSetup, hooks: MiniHooks): void {
  const adv = adventure('maze')!;
  const sim = new MazeSim(setup.variant, setup.seed);
  const portrait = setup.mobile && innerHeight > innerWidth;
  const base = portrait ? VIEW.phone : VIEW.desk;
  const a = createArcade(stage, {
    cls: 'maze', setup, adv, hooks, buttonLabel: 'Into the maze!',
    hud: { count: 'KEYS' },
    camera: { fov: 46, ...base, lead: 0 },
    world: { size: { hw: HALF + 4, hd: HALF + 4 }, path: false, fence: false, flowers: 12, fog: ['#dcebd6', MIST.near, MIST.far] },
    controls: { mouseSteer: false },
    onStart: () => sim.start(),
  });
  const { scene, time } = a;
  // the gravel floor of the maze
  const gravel = groundTex('gravel').clone(); gravel.needsUpdate = true; gravel.repeat.set((N * CELL) / 3, (N * CELL) / 3);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(N * CELL + 0.6, N * CELL + 0.6).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: gravel, roughness: 0.95 }));
  floor.position.y = 0.015; floor.receiveShadow = true; scene.add(floor);
  // hedges: clipped leafy walls (rounded, textured in world space, darker at the roots) merged into one mesh
  const H = 2.1;
  scene.add(hedgeWalls(sim.walls.filter((w) => w.kind === 'box').map((w) => ({ x: w.x, z: w.z, w: w.hw * 2, d: w.hd * 2 })), H));
  // the gate: stone posts, a timber beam, a lamp, a floor glow — and a padlock on a chain while the keys are missing
  const gate = new THREE.Group(); gate.position.set(sim.gatePos.x, 0, sim.gatePos.z);
  if (sim.exitSide === 'e' || sim.exitSide === 'w') gate.rotation.y = Math.PI / 2;
  const stone = std('#b9b4a6', 0.9), wood = std('#8a5a30', 0.85), steel = std('#8a8f99', 0.4);
  for (const sx of [-1, 1]) { add(gate, new THREE.BoxGeometry(0.42, 2.2, 0.42), stone, sx * (CELL / 2 + 0.05), 1.1, 0); add(gate, new THREE.BoxGeometry(0.56, 0.16, 0.56), stone, sx * (CELL / 2 + 0.05), 2.28, 0, false); }
  add(gate, new THREE.BoxGeometry(CELL + 0.7, 0.22, 0.3), wood, 0, 2.32, 0);
  const lampMat = new THREE.MeshStandardMaterial({ color: '#ffd34a', emissive: '#ff9f1a', emissiveIntensity: 0.15, roughness: 0.4 });
  add(gate, new THREE.SphereGeometry(0.17, 12, 10), lampMat, 0, 2.6, 0, false);
  const glowMat = new THREE.MeshBasicMaterial({ color: '#ffd34a', transparent: true, opacity: 0, depthWrite: false });
  const glow = new THREE.Mesh(new THREE.RingGeometry(0.45, 1.15, 32).rotateX(-Math.PI / 2), glowMat); glow.position.y = 0.035; gate.add(glow);
  const lock = new THREE.Group(); lock.position.y = 1.15;
  add(lock, new THREE.BoxGeometry(CELL + 0.1, 0.06, 0.06), steel, 0, 0.3, 0, false);
  add(lock, new THREE.BoxGeometry(0.5, 0.42, 0.22), new THREE.MeshStandardMaterial({ color: '#ffc94a', metalness: 0.6, roughness: 0.35 }), 0, 0, 0);
  add(lock, new THREE.TorusGeometry(0.17, 0.045, 8, 16, Math.PI), steel, 0, 0.22, 0, false);
  gate.add(lock); scene.add(gate);
  // keys and stars
  const gold = new THREE.MeshStandardMaterial({ color: '#ffd34a', metalness: 0.55, roughness: 0.3, emissive: '#5a3d00', emissiveIntensity: 0.25 });
  const starShape = new THREE.Shape();
  for (let i = 0; i < 10; i++) { const r = i % 2 ? 0.14 : 0.32; const an = (i / 10) * Math.PI * 2 - Math.PI / 2; if (i === 0) starShape.moveTo(Math.cos(an) * r, Math.sin(an) * r); else starShape.lineTo(Math.cos(an) * r, Math.sin(an) * r); }
  const starGeo = new THREE.ExtrudeGeometry(starShape, { depth: 0.1, bevelEnabled: false }); starGeo.center();
  const keyModel = () => { const g = new THREE.Group(); add(g, new THREE.TorusGeometry(0.2, 0.06, 8, 18), gold, 0, 0.26, 0, false); add(g, new THREE.BoxGeometry(0.1, 0.5, 0.08), gold, 0, -0.2, 0, false); add(g, new THREE.BoxGeometry(0.18, 0.08, 0.08), gold, 0.09, -0.4, 0, false); add(g, new THREE.BoxGeometry(0.14, 0.08, 0.08), gold, 0.07, -0.26, 0, false); return g; };
  // a red peek mushroom with white spots (it sits on the floor, so its group is lowered)
  const capMat = std('#e2483d', 0.5), stemMat = std('#f4ecd8', 0.8), dotMat = std('#ffffff', 0.6);
  const mushModel = () => {
    const g = new THREE.Group(); g.position.y = -0.62;
    add(g, new THREE.CylinderGeometry(0.13, 0.17, 0.42, 14), stemMat, 0, 0.21, 0);
    const cap = add(g, new THREE.SphereGeometry(0.36, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), capMat, 0, 0.4, 0); cap.scale.y = 0.75;
    for (let i = 0; i < 6; i++) { const an = (i / 6) * Math.PI * 2, el = i % 2 ? 0.55 : 0.95; add(g, new THREE.SphereGeometry(0.055, 8, 6), dotMat, Math.cos(an) * 0.3 * Math.sin(el), 0.4 + 0.27 * Math.cos(el) * 0.75, Math.sin(an) * 0.3 * Math.sin(el), false); }
    add(g, new THREE.SphereGeometry(0.06, 8, 6), dotMat, 0, 0.67, 0, false);
    return g;
  };
  type Node = { it: Pickup; m: THREE.Group; got: number };
  const nodes: Node[] = sim.items.map((it) => {
    const m = new THREE.Group();
    if (it.kind === 'key') m.add(keyModel()); else if (it.kind === 'peek') m.add(mushModel()); else { const s = new THREE.Mesh(starGeo, gold); s.castShadow = !a.mobile; m.add(s); }
    const sh = new THREE.Mesh(new THREE.CircleGeometry(0.26, 16).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.16, depthWrite: false })); sh.position.y = -0.86; m.add(sh);
    m.position.set(it.x, 0.9, it.z); scene.add(m);
    return { it, m, got: -1 };
  });
  // hedgehogs: a spiky brown dome, a cream face with a black nose, tiny feet that patter
  const spikeMat = std('#6b4a2e', 0.9), faceMat = std('#e9cfa6', 0.8), noseMat = std('#1d1612', 0.4);
  const spikeGeo = new THREE.ConeGeometry(0.05, 0.2, 5);
  const hogs = sim.hogs.map(() => {
    const g = new THREE.Group(); const body = new THREE.Group(); g.add(body);
    const dome = add(body, new THREE.SphereGeometry(0.3, 16, 12), spikeMat, 0, 0.24, -0.02); dome.scale.set(1, 0.8, 1.15);
    for (let i = 0; i < 26; i++) { const u = (i * 0.618) % 1, v = 0.15 + ((i * 0.37) % 0.75); const th = u * Math.PI * 2, ph = v * Math.PI * 0.5;
      const n = new THREE.Vector3(Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th) - 0.25).normalize();
      if (n.z > 0.55) continue; const sp = new THREE.Mesh(spikeGeo, spikeMat); sp.position.set(n.x * 0.3, 0.24 + n.y * 0.24, -0.02 + n.z * 0.34); sp.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n); body.add(sp); }
    const face = add(body, new THREE.SphereGeometry(0.16, 12, 10), faceMat, 0, 0.2, 0.26); face.scale.set(1, 0.9, 1.2);
    add(body, new THREE.SphereGeometry(0.045, 8, 6), noseMat, 0, 0.21, 0.45, false);
    for (const sx of [-1, 1]) add(body, new THREE.SphereGeometry(0.03, 6, 5), noseMat, sx * 0.07, 0.28, 0.37, false);
    const feet = [-1, 1].flatMap((sx) => [-1, 1].map((sz) => add(g, new THREE.SphereGeometry(0.05, 6, 5), faceMat, sx * 0.14, 0.04, sz * 0.13, false)));
    scene.add(g); return { g, body, feet };
  });
  // you
  const me = a.figure(setup.you.skin, 0.3);
  // a pink ring and a little pointer that show through the hedges, so you never lose your Fuzzy behind a wall
  const onTop = (color: string, opacity: number) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthTest: false, depthWrite: false });
  const youRing = new THREE.Mesh(new THREE.RingGeometry(0.36, 0.48, 28).rotateX(-Math.PI / 2), onTop('#d6336c', 0.55)); youRing.renderOrder = 10; youRing.position.y = 0.05; scene.add(youRing);
  const youPin = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.26, 4).rotateX(Math.PI), onTop('#ff6b9a', 0.9)); youPin.renderOrder = 10; scene.add(youPin);
  me.group.position.set(sim.you.pos.x, 0, sim.you.pos.z); me.group.rotation.y = sim.you.heading;
  a.camTarget.set(sim.you.pos.x, 0, sim.you.pos.z);
  // tap-to-walk marker
  const marker = new THREE.Mesh(new THREE.RingGeometry(0.22, 0.4, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false }));
  marker.position.y = 0.04; scene.add(marker); let markerT = 0;
  const ray = new THREE.Raycaster(); const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); const hit = new THREE.Vector3();
  const tapAt = (ndcX: number, ndcY: number) => { ray.setFromCamera(new THREE.Vector2(ndcX, ndcY), a.camera); if (ray.ray.intersectPlane(plane, hit) && sim.goTo(hit.x, hit.z)) { marker.position.set(sim.goal!.x, 0.04, sim.goal!.z); markerT = 1; a.play(vac.tick); } };
  a.onTap((ndc) => tapAt(ndc.x, ndc.y));
  // the minimap
  const map = document.createElement('canvas'); map.className = 'mg-map'; map.width = map.height = 240; a.hud.append(map);
  const g = map.getContext('2d');
  const drawMap = () => {
    if (!g) return;
    const S = 240 / (N + 1), o = S / 2;
    g.clearRect(0, 0, 240, 240);
    g.fillStyle = 'rgba(255,252,245,.92)'; g.beginPath(); g.roundRect(0, 0, 240, 240, 24); g.fill();
    for (let i = 0; i < N * N; i++) { if (!sim.seen[i]) continue; g.fillStyle = sim.visited[i] ? '#e9dcb9' : '#f4eedd'; g.fillRect(o + (i % N) * S, o + Math.floor(i / N) * S, S, S); }
    g.strokeStyle = '#4f9a48'; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath();
    for (let i = 0; i < N * N; i++) {
      if (!sim.seen[i]) continue;
      const r = Math.floor(i / N), c = i % N, x = o + c * S, y = o + r * S;
      if (sim.north[i] && !(i === sim.exit && sim.exitSide === 'n')) { g.moveTo(x, y); g.lineTo(x + S, y); }
      if (sim.west[i] && !(i === sim.exit && sim.exitSide === 'w')) { g.moveTo(x, y); g.lineTo(x, y + S); }
      if ((r === N - 1 || sim.north[i + N]) && !(i === sim.exit && sim.exitSide === 's')) { g.moveTo(x, y + S); g.lineTo(x + S, y + S); }
      if ((c === N - 1 || sim.west[i + 1]) && !(i === sim.exit && sim.exitSide === 'e')) { g.moveTo(x + S, y); g.lineTo(x + S, y + S); }
    }
    g.stroke();
    for (const it of sim.items) {
      if (it.got || it.kind === 'star' || !sim.seen[it.cell]) continue;
      g.fillStyle = it.kind === 'key' ? '#f3b11c' : '#e2483d'; g.beginPath(); g.arc(o + (it.cell % N) * S + S / 2, o + Math.floor(it.cell / N) * S + S / 2, S * (it.kind === 'key' ? 0.24 : 0.18), 0, 7); g.fill();
    }
    if (sim.seen[sim.exit]) { const r = Math.floor(sim.exit / N), c = sim.exit % N; g.fillStyle = sim.unlocked ? '#2fa84f' : '#b8bcc2'; g.beginPath(); g.roundRect(o + c * S + S * 0.2, o + r * S + S * 0.2, S * 0.6, S * 0.6, 4); g.fill(); }
    const px = o + (sim.you.pos.x / CELL + (N - 1) / 2 + 0.5) * S, py = o + (sim.you.pos.z / CELL + (N - 1) / 2 + 0.5) * S;
    g.fillStyle = '#d6336c'; g.beginPath(); g.arc(px, py, S * 0.3, 0, 7); g.fill();
    g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke();
  };
  a.tip('go', a.mobile ? 'The mist hides the maze — tap a path you can see and your Fuzzy walks there' : 'The mist hides the maze — click a path you can see (or WASD). Find 3 keys, then the gate', 4800);
  let lockOpen = 0, frameN = 0, peekT = 0, firstHog = true;
  const fog = scene.fog as THREE.Fog;
  a.run((dt, input) => {
    sim.step(dt, input);
    for (const e of sim.events) {
      if (e.kind === 'key' && e.item) { const n = nodes.find((x) => x.it === e.item); if (n) n.got = 0; a.float(e.item.x, 1.6, e.item.z, '+40 KEY', 'gold'); a.sparks(new THREE.Vector3(e.item.x, 1, e.item.z), 12); a.play(sfx.gold); me.squash = 0.4; a.banner(e.n! < KEYS ? `Key ${e.n} of ${KEYS}!` : 'All the keys!', 'combo'); if (e.n === 1) a.tip('map', 'The little map fills in with everything you’ve seen', 4200); }
      else if (e.kind === 'peek' && e.item) { const n = nodes.find((x) => x.it === e.item); if (n) n.got = 0; peekT = 3.4; a.sparks(new THREE.Vector3(e.item.x, 0.8, e.item.z), 16); a.play(sfx.whoosh); me.squash = 0.5; a.banner('Peek! You can see over the hedges', 'combo'); }
      else if (e.kind === 'prickle') { a.puff(new THREE.Vector3(sim.you.pos.x, 0.5, sim.you.pos.z), 5, '#c9a27a'); a.sparks(new THREE.Vector3(sim.you.pos.x, 0.9, sim.you.pos.z), 6); a.play(sfx.boing); me.squash = 0.6; a.banner('Ouch — a hedgehog!', 'warn'); if (firstHog) { firstHog = false; a.tip('hog', 'Hedgehogs wander the paths — wait for one to pass, or find another way', 4200); } }
      else if (e.kind === 'star' && e.item) { const n = nodes.find((x) => x.it === e.item); if (n) n.got = 0; a.float(e.item.x, 1.4, e.item.z, '+15'); a.play(sfx.collect); me.squash = 0.25; }
      else if (e.kind === 'unlock') { lockOpen = 0.001; a.banner('The gate is open — it’s on your map!', 'combo'); a.play(sfx.level); a.tip('exit', 'The gate shows green on your map — find a way there through the mist', 4200); }
      else if (e.kind === 'locked') { a.banner(`Locked — ${e.n} more key${e.n === 1 ? '' : 's'}`, 'warn'); a.play(vac.bump); a.tip('locked', 'Keys hide in dead ends — follow the hedge and you’ll find them', 4200); }
      else if (e.kind === 'exit') { a.sparks(new THREE.Vector3(sim.gatePos.x, 1.2, sim.gatePos.z), 24); a.play(sfx.level); a.finish(sim.result(), 'OUT!'); }
      else if (e.kind === 'bump') { a.puff(new THREE.Vector3(sim.you.pos.x, 0.6, sim.you.pos.z), 3, '#8fd07f'); me.squash = 0.3; }
      else if (e.kind === 'warn') a.warn(e.n!);
    }
  }, (dt) => {
    const p = sim.you.pos;
    me.group.position.set(p.x, 0, p.z);
    me.group.rotation.y = sim.you.heading;
    a.walk(me, Math.min(1, sim.you.speed / MOVE.max), dt);
    a.camTarget.lerp(new THREE.Vector3(p.x, 0, p.z), Math.min(1, dt * 6));
    youRing.position.set(p.x, 0.05, p.z); youPin.position.set(p.x, 1.25 + Math.sin(time.value * 4) * 0.06, p.z); youPin.rotation.y += dt * 2;
    (youRing.material as THREE.MeshBasicMaterial).opacity = sim.dazed > 0 ? 0.25 + Math.sin(time.value * 30) * 0.2 : 0.55;
    // a peek lifts the view over the hedges and clears the mist for a moment, then eases back down
    peekT = Math.max(0, peekT - dt); const want = peekT > 0.6 ? VIEW.peek : base, ease = Math.min(1, dt * (peekT > 0.6 ? 3 : 1.8));
    a.cam.back += (want.back - a.cam.back) * ease; a.cam.up += (want.up - a.cam.up) * ease; a.cam.lookDy += (want.lookDy - a.cam.lookDy) * ease;
    const k = (a.cam.up - base.up) / (VIEW.peek.up - base.up); fog.near = MIST.near + (MIST.peekNear - MIST.near) * k; fog.far = MIST.far + (MIST.peekFar - MIST.far) * k;
    sim.hogs.forEach((h, i) => { const v = hogs[i]; v.g.position.set(h.x, 0, h.z); v.g.rotation.y = h.heading; v.body.position.y = Math.abs(Math.sin(time.value * 9 + i)) * 0.03; v.feet.forEach((f, j) => { f.position.y = 0.04 + Math.max(0, Math.sin(time.value * 14 + j * 1.6)) * 0.04; }); });
    for (const n of nodes) {
      if (n.got >= 0) { n.got += dt; const k = Math.min(1, n.got / 0.3); n.m.position.y = 0.9 + k * 1.2; n.m.scale.setScalar(Math.max(0.001, 1 - k)); if (k >= 1 && n.m.parent) scene.remove(n.m); continue; }
      n.m.position.y = 0.9 + Math.sin(time.value * 2.4 + n.it.id) * 0.08; n.m.rotation.y += dt * (n.it.kind === 'key' ? 1.6 : n.it.kind === 'peek' ? 0.6 : 2.4); if (n.it.kind === 'peek') n.m.position.y = 0.9 + Math.sin(time.value * 3 + n.it.id) * 0.03;
    }
    if (lockOpen > 0) {
      lockOpen += dt; lock.position.y = Math.max(-1, 1.15 - lockOpen * lockOpen * 6); lock.rotation.z = lockOpen * 2; if (lockOpen > 1.2 && lock.parent) gate.remove(lock);
      glowMat.opacity = Math.min(0.8, lockOpen) * (0.7 + Math.sin(time.value * 5) * 0.3); lampMat.emissiveIntensity = 1.4 + Math.sin(time.value * 5) * 0.5;
    }
    if (markerT > 0) { markerT -= dt * 0.9; (marker.material as THREE.MeshBasicMaterial).opacity = Math.max(0, markerT) * 0.8; marker.scale.setScalar(1 + (1 - markerT) * 0.6); if (sim.goal === null) markerT = Math.min(markerT, 0.25); }
    a.setScore(sim.score);
    a.setCount(`${sim.keys}/${KEYS}`, `${sim.stars} star${sim.stars === 1 ? '' : 's'}`);
    a.setTime(sim.clock.left);
    if ((frameN++ & 1) === 0) drawMap();
    if (sim.state === 'done') a.finish(sim.result(), sim.escaped ? 'OUT!' : 'TIME!');
  });
  if (import.meta.env.DEV) (window as unknown as { __mg: unknown }).__mg = { id: 'maze', sim, ctl: a.ctl, start: a.start, tapAt, finishNow: () => { (sim as unknown as { state: string }).state = 'done'; } };
}
