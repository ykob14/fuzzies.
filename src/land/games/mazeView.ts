/**
 * Fuzzy Maze — the 3D hedge maze: instanced hedges with clipped tops over a gravel floor, keys and stars that bob and spin, a
 * stone-and-timber gate whose padlock drops when the keys are found, a tap-to-walk marker and a minimap of where you've been.
 * Rules: games/maze.ts; scene, HUD, loop and chrome: land/mgScene.ts.
 */
import * as THREE from 'three';
import { createArcade, std, add, sfx, vac, type MiniSetup, type MiniHooks } from '../mgScene';
import { adventure } from '../adventures';
import { groundTex, hedgeWalls } from './sceneArt';
import { MazeSim, N, CELL, KEYS, HALF, MOVE, type Pickup } from './maze';

export function run(stage: HTMLElement, setup: MiniSetup, hooks: MiniHooks): void {
  const adv = adventure('maze')!;
  const sim = new MazeSim(setup.variant, setup.seed);
  const a = createArcade(stage, {
    cls: 'maze', setup, adv, hooks, buttonLabel: 'Into the maze!',
    hud: { count: 'KEYS' },
    camera: { fov: 44, back: 7.5, up: 9, lookDy: -1.6, lead: 0 },
    world: { size: { hw: HALF + 4, hd: HALF + 4 }, path: false, fence: false, flowers: 12, fog: ['#d9ead2', 16, 34] },
    controls: { mouseSteer: false },
    onStart: () => sim.start(),
  });
  const { scene, time } = a;
  // the gravel floor of the maze
  const gravel = groundTex('gravel').clone(); gravel.needsUpdate = true; gravel.repeat.set((N * CELL) / 3, (N * CELL) / 3);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(N * CELL + 0.6, N * CELL + 0.6).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: gravel, roughness: 0.95 }));
  floor.position.y = 0.015; floor.receiveShadow = true; scene.add(floor);
  // hedges: clipped leafy walls (rounded, textured in world space, darker at the roots) merged into one mesh
  const H = 1.5;
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
  type Node = { it: Pickup; m: THREE.Group; got: number };
  const nodes: Node[] = sim.items.map((it) => {
    const m = new THREE.Group();
    if (it.kind === 'key') m.add(keyModel()); else { const s = new THREE.Mesh(starGeo, gold); s.castShadow = !a.mobile; m.add(s); }
    const sh = new THREE.Mesh(new THREE.CircleGeometry(0.26, 16).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.16, depthWrite: false })); sh.position.y = -0.86; m.add(sh);
    m.position.set(it.x, 0.9, it.z); scene.add(m);
    return { it, m, got: -1 };
  });
  // you
  const me = a.figure(setup.you.skin, 0.3);
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
    g.fillStyle = '#efe6cf';
    for (let i = 0; i < N * N; i++) { if (!sim.visited[i]) continue; g.fillRect(o + (i % N) * S, o + Math.floor(i / N) * S, S, S); }
    g.strokeStyle = '#4f9a48'; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath();
    for (let i = 0; i < N * N; i++) {
      if (!sim.visited[i]) continue;
      const r = Math.floor(i / N), c = i % N, x = o + c * S, y = o + r * S;
      if (sim.north[i] && !(i === sim.exit && sim.exitSide === 'n')) { g.moveTo(x, y); g.lineTo(x + S, y); }
      if (sim.west[i] && !(i === sim.exit && sim.exitSide === 'w')) { g.moveTo(x, y); g.lineTo(x, y + S); }
      if ((r === N - 1 || sim.north[i + N]) && !(i === sim.exit && sim.exitSide === 's')) { g.moveTo(x, y + S); g.lineTo(x + S, y + S); }
      if ((c === N - 1 || sim.west[i + 1]) && !(i === sim.exit && sim.exitSide === 'e')) { g.moveTo(x + S, y); g.lineTo(x + S, y + S); }
    }
    g.stroke();
    for (const it of sim.items) {
      if (it.got || it.kind !== 'key') continue;
      if (!sim.visited[it.cell] && !sim.neighbours(it.cell).some((j) => sim.visited[j])) continue;
      g.fillStyle = '#f3b11c'; g.beginPath(); g.arc(o + (it.cell % N) * S + S / 2, o + Math.floor(it.cell / N) * S + S / 2, S * 0.24, 0, 7); g.fill();
    }
    { const r = Math.floor(sim.exit / N), c = sim.exit % N; g.fillStyle = sim.unlocked ? '#2fa84f' : '#b8bcc2'; g.beginPath(); g.roundRect(o + c * S + S * 0.2, o + r * S + S * 0.2, S * 0.6, S * 0.6, 4); g.fill(); }
    const px = o + (sim.you.pos.x / CELL + (N - 1) / 2 + 0.5) * S, py = o + (sim.you.pos.z / CELL + (N - 1) / 2 + 0.5) * S;
    g.fillStyle = '#d6336c'; g.beginPath(); g.arc(px, py, S * 0.3, 0, 7); g.fill();
    g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke();
  };
  a.tip('go', a.mobile ? 'Tap anywhere — your Fuzzy walks there. Find 3 keys, then the exit' : 'Click anywhere to walk there (or WASD). Find 3 keys, then the exit', 4500);
  let lockOpen = 0, frameN = 0;
  a.run((dt, input) => {
    sim.step(dt, input);
    for (const e of sim.events) {
      if (e.kind === 'key' && e.item) { const n = nodes.find((x) => x.it === e.item); if (n) n.got = 0; a.float(e.item.x, 1.6, e.item.z, '+40 KEY', 'gold'); a.sparks(new THREE.Vector3(e.item.x, 1, e.item.z), 12); a.play(sfx.gold); me.squash = 0.4; a.banner(e.n! < KEYS ? `Key ${e.n} of ${KEYS}!` : 'All the keys!', 'combo'); if (e.n === 1) a.tip('map', 'The little map shows where you’ve been — keys show up on it when you’re close', 4200); }
      else if (e.kind === 'star' && e.item) { const n = nodes.find((x) => x.it === e.item); if (n) n.got = 0; a.float(e.item.x, 1.4, e.item.z, '+15'); a.play(sfx.collect); me.squash = 0.25; }
      else if (e.kind === 'unlock') { lockOpen = 0.001; a.banner('The gate is open — find the exit!', 'combo'); a.play(sfx.level); a.tip('exit', 'The exit glows green on the map — tap it and your Fuzzy walks there', 4200); }
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
    for (const n of nodes) {
      if (n.got >= 0) { n.got += dt; const k = Math.min(1, n.got / 0.3); n.m.position.y = 0.9 + k * 1.2; n.m.scale.setScalar(Math.max(0.001, 1 - k)); if (k >= 1 && n.m.parent) scene.remove(n.m); continue; }
      n.m.position.y = 0.9 + Math.sin(time.value * 2.4 + n.it.id) * 0.08; n.m.rotation.y += dt * (n.it.kind === 'key' ? 1.6 : 2.4);
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
