/**
 * Mining Adventure — the 3D mine: a rock floor walled in by boulders, timber props with lanterns, a minecart on rails, sparkling
 * rock piles (the sparkle colour hints at the gem), a Fuzzy with a pickaxe and a helmet lamp, rumbling shadows where the
 * ceiling is about to drop a rock, falling rocks with dust, gems that pop out and fly into your bag. DIG = the button /
 * Space. Rules: games/mining.ts; scene, HUD, loop and chrome: land/mgScene.ts.
 */
import * as THREE from 'three';
import { createArcade, std, add, sfx, vac, lerp, type MiniSetup, type MiniHooks } from '../mgScene';
import { adventure } from '../adventures';
import { rockGeo, rockMat } from './sceneArt';
import { woodTex } from './orchardArt';
import { MiningSim, MINE, HP, MOVE, SWING, RUMBLE, FALL, type Pile, type Rock, type Gem } from './mining';

const GEM: Record<Gem, { color: string; glow: string; name: string }> = {
  quartz: { color: '#f3f0ff', glow: '#cfc8ff', name: 'Quartz' }, emerald: { color: '#3fd26b', glow: '#1f8a3a', name: 'Emerald' },
  ruby: { color: '#ff3b5c', glow: '#8a1020', name: 'Ruby' }, diamond: { color: '#9fe8ff', glow: '#3fa7d6', name: 'Diamond' },
};

export function run(stage: HTMLElement, setup: MiniSetup, hooks: MiniHooks): void {
  const adv = adventure('mining')!;
  const sim = new MiningSim(setup.variant, setup.seed);
  const a = createArcade(stage, {
    cls: 'mining', setup, adv, hooks, buttonLabel: 'Start digging!',
    hud: { count: 'GEMS' },
    camera: { fov: 44, back: 9, up: 9.5, lookDy: -2.4, lead: 0 },
    world: { size: { hw: MINE.hw + 2, hd: MINE.hd + 2 }, ground: ['#8a7a66', '#766858'], groundKind: 'dirt', path: false, fence: false, treeLine: false, flowers: 0, sky: 'dusk', fog: ['#3a3330', 16, 46] },
    controls: { mouseSteer: false },
    onStart: () => sim.start(),
  });
  const { scene, time } = a;
  // ---- the mine ----
  const rock = rockMat(), rockDark = rockMat(); const tT = woodTex().clone(); tT.needsUpdate = true; const timber = new THREE.MeshStandardMaterial({ map: tT, color: '#a87a4a', roughness: 0.85 }), rail = std('#8a8f99', 0.5);
  for (let i = 0; i < 46; i++) { const t = i / 46; const an = t * Math.PI * 2; const x = Math.cos(an) * (MINE.hw + 1.2), z = Math.sin(an) * (MINE.hd + 1.2); const r = add(scene, rockGeo(i, 1.1 + (i % 3) * 0.35, 'cave'), i % 2 ? rock : rockDark, x, 0.5 + (i % 3) * 0.2, z); r.rotation.set(i, i * 0.7, 0); }
  for (const [x, z] of [[-6, -4], [6, -4], [-6, 4], [6, 4]]) { add(scene, new THREE.BoxGeometry(0.4, 3.2, 0.4), timber, x, 1.6, z); add(scene, new THREE.BoxGeometry(2.4, 0.3, 0.5), timber, x, 3.3, z, false); add(scene, new THREE.SphereGeometry(0.18, 10, 8), new THREE.MeshStandardMaterial({ color: '#ffe9a8', emissive: '#ffb347', emissiveIntensity: 1.2 }), x + 0.35, 2.4, z + 0.3, false); }
  const cartG = new THREE.Group(); cartG.position.set(-MINE.hw + 1.6, 0, 0);
  for (const sz of [-0.5, 0.5]) add(cartG, new THREE.BoxGeometry(5, 0.06, 0.08), rail, 0, 0.04, sz, false);
  add(cartG, new THREE.BoxGeometry(2, 0.9, 1.2), std('#5a5f66', 0.6), 0, 0.75, 0); add(cartG, new THREE.BoxGeometry(1.8, 0.2, 1), rockDark, 0, 1.25, 0, false);
  for (const sx of [-0.7, 0.7]) for (const sz of [-0.5, 0.5]) add(cartG, new THREE.CylinderGeometry(0.22, 0.22, 0.1, 10).rotateX(Math.PI / 2), rail, sx, 0.22, sz, false);
  scene.add(cartG);
  for (const o of sim.obstacles) if (o.kind === 'circle' && o.r >= 0.5) { const b = add(scene, rockGeo(Math.round(o.x * 3 + o.z), o.r * 1.05, 'cave'), rock, o.x, o.r * 0.45, o.z); b.scale.y = 0.75; b.rotation.y = o.x; }
  // ---- piles ----
  type PileNode = { p: Pile; g: THREE.Group; mound: THREE.Mesh; sparks: THREE.Mesh[]; core: THREE.Mesh; gone: number };
  const pileNodes = new Map<number, PileNode>();
  const moundGeo = rockGeo(5, 0.55, 'cave'), sparkGeo = new THREE.OctahedronGeometry(0.09, 0), gemGeo = new THREE.OctahedronGeometry(0.28, 0);
  const makePile = (p: Pile): PileNode => {
    const g = new THREE.Group(); g.position.set(p.x, 0, p.z);
    const mound = add(g, moundGeo, rock, 0, 0.3, 0); mound.scale.set(1.1, 0.75, 1); mound.rotation.y = p.id;
    const gm = new THREE.MeshPhysicalMaterial({ color: GEM[p.gem].color, emissive: GEM[p.gem].glow, emissiveIntensity: 0.9, roughness: 0.06, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.05 });
    const core = add(g, new THREE.SphereGeometry(0.2, 10, 8), gm, 0, 0.35, 0, false); core.visible = false;
    const sparks: THREE.Mesh[] = []; for (let i = 0; i < 3; i++) { const s = add(g, sparkGeo, gm, 0, 0.7, 0, false); sparks.push(s); }
    scene.add(g); const n = { p, g, mound, sparks, core, gone: -1 }; pileNodes.set(p.id, n); return n;
  };
  for (const p of sim.piles) makePile(p);
  type Fly = { m: THREE.Mesh; t: number; from: THREE.Vector3 };
  const flies: Fly[] = [];
  // ---- rocks ----
  type RockNode = { r: Rock; m: THREE.Mesh; shadow: THREE.Mesh; t: number; landed: number };
  const rockNodes = new Map<number, RockNode>();
  const shadowMat = new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.35, depthWrite: false });
  const makeRock = (r: Rock): RockNode => {
    const m = add(scene, rockGeo(r.id + 40, 0.75, 'cave'), rockDark, r.x, 7.5, r.z); m.rotation.set(r.id, r.id * 0.5, 0);
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(1.1, 20).rotateX(-Math.PI / 2), shadowMat.clone()); shadow.position.set(r.x, 0.03, r.z); scene.add(shadow);
    const n = { r, m, shadow, t: 0, landed: -1 }; rockNodes.set(r.id, n); return n;
  };
  // ---- you, with a pickaxe and a helmet lamp ----
  const me = a.figure(setup.you.skin, 0.3);
  me.group.position.set(sim.you.pos.x, 0, sim.you.pos.z);
  const helmet = add(me.fuzzy.group, new THREE.SphereGeometry(0.33, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), std('#ffc94a', 0.6), 0, 0.22, 0, false); helmet.scale.set(1.05, 0.8, 1.05);
  add(helmet, new THREE.SphereGeometry(0.08, 8, 6), new THREE.MeshStandardMaterial({ color: '#fff7d6', emissive: '#ffe9a8', emissiveIntensity: 1.5 }), 0, 0.15, 0.3, false);
  const pick = new THREE.Group(); add(pick, new THREE.CylinderGeometry(0.03, 0.035, 0.8, 6), timber, 0, 0.4, 0, false); add(pick, new THREE.BoxGeometry(0.5, 0.08, 0.08), rail, 0, 0.8, 0, false); add(pick, new THREE.ConeGeometry(0.06, 0.2, 6).rotateZ(Math.PI / 2), rail, 0.32, 0.8, 0, false);
  pick.position.set(0.34, 0.15, 0.1); pick.rotation.z = -0.6; me.group.add(pick);
  a.camTarget.set(sim.you.pos.x, 0, sim.you.pos.z);
  const digBtn = document.createElement('button'); digBtn.type = 'button'; digBtn.className = 'mg-action'; digBtn.textContent = a.mobile ? 'DIG' : 'DIG (Space)';
  const doDig = () => { if (!a.started() || a.paused()) return; sim.dig(); };
  digBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); doDig(); }); a.hud.append(digBtn);
  a.onAction(doDig);
  a.tip('go', a.mobile ? 'Walk to a sparkle and tap DIG a few times. When the ground shakes, step away!' : 'Walk to a sparkle and press Space a few times. When the ground shakes under you, step away!', 5200);
  let shake = 0;
  a.run((dt, input) => {
    sim.step(dt, input);
    for (const e of sim.events) {
      if (e.kind === 'swing') { a.play(vac.tick); }
      else if (e.kind === 'crack' && e.pile) { const n = pileNodes.get(e.pile.id); if (n) { n.core.visible = true; n.mound.scale.multiplyScalar(0.93); } a.chips(new THREE.Vector3(e.pile.x, 0.5, e.pile.z), 5, '#8a7a66'); a.play(vac.bump); me.squash = 0.3; }
      else if (e.kind === 'gem' && e.pile) { const n = pileNodes.get(e.pile.id); if (n) n.gone = 0; const gm = new THREE.Mesh(gemGeo, new THREE.MeshStandardMaterial({ color: GEM[e.pile.gem].color, emissive: GEM[e.pile.gem].glow, emissiveIntensity: 0.8, roughness: 0.15 })); gm.position.set(e.pile.x, 0.5, e.pile.z); gm.scale.y = 1.4; scene.add(gm); flies.push({ m: gm, t: 0, from: new THREE.Vector3(e.pile.x, 0.5, e.pile.z) }); a.float(e.pile.x, 1.5, e.pile.z, `+${e.value} ${GEM[e.pile.gem].name}`, e.pile.gem === 'diamond' || e.pile.gem === 'ruby' ? 'gold' : ''); a.sparks(new THREE.Vector3(e.pile.x, 0.8, e.pile.z), e.pile.gem === 'diamond' ? 20 : 8); a.play(e.pile.gem === 'quartz' ? sfx.collect : sfx.gold); me.squash = 0.4; if (e.pile.gem === 'diamond') a.banner('A DIAMOND! +80', 'combo'); }
      else if (e.kind === 'sparkle' && e.pile) { makePile(e.pile); }
      else if (e.kind === 'rumble' && e.rock) { makeRock(e.rock); a.play(vac.bump); if (Math.hypot(e.rock.x - sim.you.pos.x, e.rock.z - sim.you.pos.z) < 2.5) { a.banner('Rumble! Step away', 'warn'); a.tip('rumble', 'A shaking shadow means a rock is coming down there', 3400); } }
      else if (e.kind === 'fall' && e.rock) { const n = rockNodes.get(e.rock.id); if (n) n.landed = 0; a.chips(new THREE.Vector3(e.rock.x, 0.3, e.rock.z), 10, '#8a7a66'); a.puff(new THREE.Vector3(e.rock.x, 0.4, e.rock.z), 6, '#a99a88'); a.play(vac.bump); }
      else if (e.kind === 'knock') { a.banner(`OUCH! Helmet knock −${e.value}`, 'warn'); a.play(vac.bump); shake = 0.6; me.squash = 0.8; a.sparks(new THREE.Vector3(sim.you.pos.x, 1.2, sim.you.pos.z), 6); a.tip('knock', 'Watch the shadows — they shake before the rock drops', 3600); }
      else if (e.kind === 'bump') { me.squash = 0.3; }
      else if (e.kind === 'warn') a.warn(e.n!);
    }
  }, (dt) => {
    const p = sim.you.pos;
    me.group.position.set(p.x, 0, p.z); me.group.rotation.y = sim.you.heading;
    a.walk(me, Math.min(1, sim.you.speed / MOVE.max), dt);
    if (sim.swinging > 0) { const k = 1 - sim.swinging / SWING; pick.rotation.z = -0.6 - Math.sin(k * Math.PI) * 1.6; pick.rotation.x = -0.4; } else { pick.rotation.z = lerp(pick.rotation.z, -0.6, Math.min(1, dt * 10)); pick.rotation.x = lerp(pick.rotation.x, 0, Math.min(1, dt * 10)); }
    if (sim.daze > 0) me.fuzzy.group.rotation.z = Math.sin(time.value * 20) * 0.15; else me.fuzzy.group.rotation.z = lerp(me.fuzzy.group.rotation.z, 0, Math.min(1, dt * 8));
    shake = Math.max(0, shake - dt);
    a.camTarget.lerp(new THREE.Vector3(p.x + (shake > 0 ? (Math.random() - 0.5) * shake * 0.5 : 0), 0, p.z), Math.min(1, dt * 6));
    for (const [id, n] of pileNodes) {
      if (n.gone >= 0) { n.gone += dt; const k = Math.min(1, n.gone / 0.4); n.g.scale.setScalar(Math.max(0.001, 1 - k)); if (k >= 1) { scene.remove(n.g); pileNodes.delete(id); } continue; }
      n.sparks.forEach((s, i) => { const an = time.value * 2.2 + i * 2.1 + n.p.id; s.position.set(Math.cos(an) * 0.5, 0.75 + Math.sin(time.value * 3 + i) * 0.12, Math.sin(an) * 0.5); s.rotation.y = an; });
      if (n.core.visible) n.core.scale.setScalar(1 + Math.sin(time.value * 8) * 0.15);
    }
    for (let i = flies.length - 1; i >= 0; i--) { const f = flies[i]; f.t += dt; const k = Math.min(1, f.t / 0.55); f.m.position.set(lerp(f.from.x, p.x, k), lerp(0.5, 0.9, k) + Math.sin(k * Math.PI) * 1.4, lerp(f.from.z, p.z, k)); f.m.rotation.y += dt * 6; if (k >= 1) { scene.remove(f.m); flies.splice(i, 1); } }
    for (const [id, n] of rockNodes) {
      const r = n.r;
      if (r.state === 'rumble') { const k = r.t / RUMBLE; n.shadow.scale.setScalar(0.6 + k * 0.5); (n.shadow.material as THREE.MeshBasicMaterial).opacity = 0.25 + k * 0.3 + Math.sin(time.value * 30) * 0.1; n.m.position.set(r.x + (Math.random() - 0.5) * 0.1 * k, 7.5, r.z + (Math.random() - 0.5) * 0.1 * k); if (Math.random() < dt * 6) a.chips(new THREE.Vector3(r.x, 4 + Math.random() * 2, r.z), 1, '#8a7a66'); }
      else if (r.state === 'falling') { const k = Math.min(1, r.t / FALL); n.m.position.set(r.x, 7.5 - k * k * 7, r.z); n.m.rotation.x += dt * 4; }
      else { n.landed += dt; n.m.position.set(r.x, Math.max(-1, 0.5 - Math.max(0, n.landed - 3) * 0.6), r.z); (n.shadow.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.35 - n.landed * 0.2); if (n.landed > 6) { scene.remove(n.m, n.shadow); rockNodes.delete(id); } }
    }
    const near = sim.reachable(); digBtn.classList.toggle('on', !!near && sim.swinging === 0); digBtn.disabled = sim.swinging > 0 || sim.daze > 0;
    a.setScore(sim.score);
    a.setCount(String(sim.gems), near ? `${GEM[near.gem].name}: ${HP[near.gem] - near.hits} more swing${HP[near.gem] - near.hits === 1 ? '' : 's'}` : `${sim.up.length} sparkles`);
    a.setTime(sim.clock.left);
    if (sim.state === 'done') a.finish(sim.result());
  });
  if (import.meta.env.DEV) (window as unknown as { __mg: unknown }).__mg = { id: 'mining', sim, ctl: a.ctl, start: a.start, dig: doDig, finishNow: () => { (sim as unknown as { state: string }).state = 'done'; } };
}
