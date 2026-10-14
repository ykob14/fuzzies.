/**
 * Fuzzy Obstacle Run — the 3D trail: the course scrolls towards the runner (things sit at z = −(distance ahead)), trees, bushes
 * and trail dashes recycle as they pass. Logs, rocks, puddles and stars keep their look; new things are built in the same simple
 * style: mud, water buckets, falling branches (from a tree at the trail side), vines to duck under, sprinklers, rolling boulders,
 * carts, bouncy mushrooms, a super star, power-ups (shield bubble, star magnet, lightning boost), a boardwalk over a pond and
 * hills (the trail and a strip of lawn rise and fall). The owner's Fuzzy is used unchanged: reactions are motion only (stumble,
 * tumble, flattened, spun, knocked back, a wet shake, a squelch, a boing) plus effects around it (drips, mud splats, dizzy
 * stars, the shield bubble, speed lines). Controls: swipes / tap on phones (no joystick), keys on computers; the 🔊 button
 * mutes the game. Sounds: game/runSounds.ts. Rules: games/obstacle.ts; scene, HUD, loop and chrome: land/mgScene.ts.
 */
import * as THREE from 'three';
import { createArcade, std, add, sfx, lerp, type MiniSetup, type MiniHooks } from '../mgScene';
import { BOTS } from './bots';
import { tree, trailTex } from './sceneArt';
import { adventure } from '../adventures';
import { RunSim, LANES, BUMP, POWER, groundH, sprayOn, type Thing, type ObKind, type Power, type RunEvent, type Section } from './obstacle';
import { run as rs } from '../../game/runSounds';

const AHEAD = 70, BEHIND = 8;
const MUTE_KEY = 'fz.obstacle.mute';
const CAM = { fov: 52, back: 6.2, up: 3.8, lookDy: -9, lookY: 0.9, lead: 0 };

export function run(stage: HTMLElement, setup: MiniSetup, hooks: MiniHooks): void {
  const adv = adventure('obstacle')!;
  const sim = new RunSim(setup.variant, setup.seed);
  let muted = false; try { muted = localStorage.getItem(MUTE_KEY) === '1'; } catch { /* private mode */ }
  const soundWanted = setup.sound; if (muted) setup.sound = false;
  const a = createArcade(stage, {
    cls: 'obstacle', setup, adv, hooks, buttonLabel: 'Run!',
    rivals: { you: sim, make: () => new RunSim(setup.variant, setup.seed), bot: BOTS.obstacle,
      pose: (r: RunSim) => { const dz = -(r.dist - sim.dist); return dz > 3 || dz < -45 ? null : { x: r.x, z: dz, y: r.y + groundH(r.sections, r.dist), heading: Math.PI, moving: 1 }; } },
    hud: { count: 'STARS' },
    camera: { ...CAM },
    world: { size: { hw: 14, hd: 40 }, path: false, fence: false, treeLine: false, flowers: 0, fog: ['#cfe6ee', 28, 72] },
    controls: { touch: false, mouseSteer: false },
    onStart: () => sim.start(),
  });
  const { scene, time, camera } = a;
  const play = (f: () => void) => a.play(f);
  const shadows = !a.mobile;
  // ---- the trail: a long dirt strip with edge lines and dashes that scroll (segmented so hills can lift it) ----
  const TRAIL_L = AHEAD + BEHIND + 10, TILE = 6, ROWS = 64; const tt = trailTex(); tt.repeat.set(1, TRAIL_L / TILE);
  const trailZ = -(AHEAD - BEHIND) / 2;
  const trailGeo = new THREE.PlaneGeometry(9.4, TRAIL_L, 2, ROWS).rotateX(-Math.PI / 2);
  const trail = new THREE.Mesh(trailGeo, new THREE.MeshStandardMaterial({ map: tt, transparent: true, depthWrite: false, roughness: 0.95 })); trail.position.set(0, 0.012, trailZ); trail.receiveShadow = true; scene.add(trail);
  const edgeMat = std('#f3eadb', 0.9); const edges: THREE.Mesh[] = [];
  for (const sx of [-1, 1]) { const edge = new THREE.Mesh(new THREE.PlaneGeometry(0.18, TRAIL_L, 1, ROWS).rotateX(-Math.PI / 2), edgeMat); edge.position.set(sx * 3.6, 0.016, trailZ); scene.add(edge); edges.push(edge); }
  // a strip of lawn that only shows when a hill comes: the same ground material, lifted with the trail and easing out sideways
  const skinGeo = new THREE.PlaneGeometry(36, TRAIL_L, 18, ROWS).rotateX(-Math.PI / 2); skinGeo.translate(0, 0, trailZ);
  {
    const gp = a.ground.geometry.attributes.position as THREE.BufferAttribute; const gc = a.ground.geometry.attributes.color as THREE.BufferAttribute | undefined;
    const sp = skinGeo.attributes.position as THREE.BufferAttribute; const uv = skinGeo.attributes.uv as THREE.BufferAttribute; const col = new Float32Array(sp.count * 3);
    const side = Math.round(Math.sqrt(gp.count)); const half = 60, step = (2 * half) / (side - 1);
    for (let i = 0; i < sp.count; i++) {
      const x = sp.getX(i), z = sp.getZ(i); uv.setXY(i, (x + half) / (2 * half), 1 - (z + half) / (2 * half));
      const ix = Math.max(0, Math.min(side - 1, Math.round((x + half) / step))), iz = Math.max(0, Math.min(side - 1, Math.round((z + half) / step)));
      const gi = iz * side + ix; col[i * 3] = gc ? gc.getX(gi) : 1; col[i * 3 + 1] = gc ? gc.getY(gi) : 1; col[i * 3 + 2] = gc ? gc.getZ(gi) : 1;
    }
    skinGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  }
  const skin = new THREE.Mesh(skinGeo, a.ground.material); skin.receiveShadow = true; skin.visible = false; skin.position.y = 0.004; scene.add(skin);
  const sideFall = (x: number) => { const ax = Math.abs(x); return ax < 5 ? 1 : ax > 17 ? 0 : 0.5 + 0.5 * Math.cos(Math.PI * (ax - 5) / 12); };
  const hillAt = (d: number) => groundH(sim.sections, d);
  let hillsShown = false;
  const lift = (geo: THREE.BufferGeometry, zOff: number, on: boolean, base = 0) => {
    const p = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) { const rel = -(p.getZ(i) + zOff); p.setY(i, on ? base + hillAt(sim.dist + rel) * sideFall(p.getX(i)) : base); }
    p.needsUpdate = true; geo.computeVertexNormals();
  };
  type Scroller = { m: THREE.Object3D; d: number; span: number; x: number; bush?: boolean; y?: number };
  const scrollers: Scroller[] = [];
  const dashMat = std('#e6d6b0', 0.9) as THREE.MeshStandardMaterial; const dashGold = new THREE.Color('#ffd34a'), dashBase = new THREE.Color('#e6d6b0');
  for (let i = 0; i < 14; i++) for (const lx of [-1.1, 1.1]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 1.2).rotateX(-Math.PI / 2), dashMat); scene.add(m); scrollers.push({ m, d: i * 6, span: 84, x: lx, y: 0.015 }); }
  // trees and bushes along both sides
  const nTrees = a.mobile ? 16 : 24;
  for (let i = 0; i < nTrees; i++) { const t = tree(i % 4 === 3 ? 'pine' : 'leafy', i, 0.95 + (i % 3) * 0.2, shadows); const side = i % 2 ? 1 : -1; scene.add(t); scrollers.push({ m: t, d: (i / nTrees) * 90 + ((i * 7) % 5), span: 90, x: side * (5.6 + ((i * 13) % 4) * 0.9) }); }
  const bushMat = std('#5fb35a', 0.8), flowerMats = [std('#ff8fb4', 0.6), std('#ffc94a', 0.6), std('#9fd3ff', 0.6)];
  for (let i = 0; i < 30; i++) { const g = new THREE.Group(); add(g, new THREE.SphereGeometry(0.28 + (i % 3) * 0.08, 8, 6), bushMat, 0, 0.2, 0, false); if (i % 2) add(g, new THREE.SphereGeometry(0.08, 6, 5), flowerMats[i % 3], 0.1, 0.42, 0.05, false); scene.add(g); scrollers.push({ m: g, d: (i / 30) * 80 + (i % 4), span: 80, x: (i % 2 ? 1 : -1) * (4.3 + ((i * 11) % 5) * 0.5), bush: true }); }

  // ---- materials + shapes (the original look for logs / rocks / puddles / stars) ----
  const logMat = std('#8a5a30', 0.9), logEnd = std('#d9b27a', 0.9), rockMat = std('#9a948a', 0.95);
  const puddleMat = new THREE.MeshStandardMaterial({ color: '#4fa3d8', roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.8 });
  const mudMat = new THREE.MeshStandardMaterial({ color: '#6b4a2b', roughness: 0.35, metalness: 0.05 }), mudDark = std('#553a20', 0.5);
  const gold = new THREE.MeshStandardMaterial({ color: '#ffd34a', metalness: 0.55, roughness: 0.3, emissive: '#5a3d00', emissiveIntensity: 0.25 });
  const goldBig = new THREE.MeshStandardMaterial({ color: '#ffe36b', metalness: 0.7, roughness: 0.2, emissive: '#8a5a00', emissiveIntensity: 0.6 });
  const superMat = new THREE.MeshStandardMaterial({ color: '#ff6b9a', metalness: 0.6, roughness: 0.2, emissive: '#d6336c', emissiveIntensity: 0.55 });
  const starShape = new THREE.Shape();
  for (let i = 0; i < 10; i++) { const r = i % 2 ? 0.13 : 0.3; const an = (i / 10) * Math.PI * 2 - Math.PI / 2; if (i === 0) starShape.moveTo(Math.cos(an) * r, Math.sin(an) * r); else starShape.lineTo(Math.cos(an) * r, Math.sin(an) * r); }
  const starGeo = new THREE.ExtrudeGeometry(starShape, { depth: 0.1, bevelEnabled: false }); starGeo.center();
  const logGeo = new THREE.CylinderGeometry(0.3, 0.3, 2, 12).rotateZ(Math.PI / 2), logEndGeo = new THREE.CylinderGeometry(0.31, 0.31, 0.06, 12).rotateZ(Math.PI / 2);
  const rockGeo = new THREE.DodecahedronGeometry(0.62, 0), puddleGeo = new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2);
  const woodMat = std('#a8743f', 0.85), woodDark = std('#7a4f28', 0.9), bandMat = new THREE.MeshStandardMaterial({ color: '#8d969e', metalness: 0.6, roughness: 0.4 });
  const waterTop = new THREE.MeshStandardMaterial({ color: '#7cc6f0', roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.9 });
  const leafMat = std('#4f9e3f', 0.8), leafLight = std('#79c25a', 0.8), vineMat = std('#3f7f34', 0.85);
  const capMat = std('#e2424f', 0.45), dotMat = std('#fff6ea', 0.6), stemMat = std('#f3e6cf', 0.7);
  const boulderGeo = new THREE.DodecahedronGeometry(0.78, 1), boulderMat = std('#8f887c', 0.95);
  const brassMat = new THREE.MeshStandardMaterial({ color: '#d9a441', metalness: 0.7, roughness: 0.3 }), greenPipe = std('#3d8b4f', 0.6);
  const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d')!; const gr = g.createRadialGradient(32, 32, 2, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
  const glow = (color: string, s: number, opacity = 0.7) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, depthWrite: false, opacity })); sp.scale.setScalar(s); return sp; };
  const cast = <T extends THREE.Object3D>(o: T) => { o.traverse((c) => { if ((c as THREE.Mesh).isMesh) { c.castShadow = shadows; } }); return o; };
  // power-up icons
  const shieldShape = new THREE.Shape(); shieldShape.moveTo(0, 0.2); shieldShape.quadraticCurveTo(0.17, 0.18, 0.17, 0.06); shieldShape.quadraticCurveTo(0.16, -0.12, 0, -0.22); shieldShape.quadraticCurveTo(-0.16, -0.12, -0.17, 0.06); shieldShape.quadraticCurveTo(-0.17, 0.18, 0, 0.2);
  const shieldGeo = new THREE.ExtrudeGeometry(shieldShape, { depth: 0.06, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015, bevelSegments: 2 }); shieldGeo.center();
  const boltShape = new THREE.Shape(); [[0.06, 0.26], [-0.12, -0.02], [0, -0.02], [-0.06, -0.26], [0.13, 0.04], [0.01, 0.04]].forEach(([x, y], i) => (i ? boltShape.lineTo(x, y) : boltShape.moveTo(x, y))); boltShape.closePath();
  const boltGeo = new THREE.ExtrudeGeometry(boltShape, { depth: 0.07, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 2 }); boltGeo.center();
  const bubbleMat = new THREE.MeshStandardMaterial({ color: '#9fdcff', transparent: true, opacity: 0.32, roughness: 0.05, metalness: 0.2, emissive: '#3a8fd0', emissiveIntensity: 0.25, depthWrite: false });
  const shieldMat = new THREE.MeshStandardMaterial({ color: '#4aa8f0', metalness: 0.4, roughness: 0.3, emissive: '#1d5f9a', emissiveIntensity: 0.3 });
  const magRed = new THREE.MeshStandardMaterial({ color: '#e2424f', metalness: 0.3, roughness: 0.35 }), magTip = new THREE.MeshStandardMaterial({ color: '#e8eef2', metalness: 0.8, roughness: 0.25 });
  const boltMat = new THREE.MeshStandardMaterial({ color: '#ffb02e', metalness: 0.3, roughness: 0.3, emissive: '#ff7a00', emissiveIntensity: 0.5 });
  const magnetIcon = () => { const g = new THREE.Group(); const u = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.065, 8, 18, Math.PI), magRed); u.rotation.z = Math.PI; g.add(u); for (const sx of [-1, 1]) { const t = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.1, 0.13), magTip); t.position.set(sx * 0.17, 0.05, 0); g.add(t); } return g; };
  const powerIcon = (k: Power) => { const g = new THREE.Group(); if (k === 'shield') { g.add(new THREE.Mesh(new THREE.SphereGeometry(0.42, 18, 12), bubbleMat), new THREE.Mesh(shieldGeo, shieldMat)); g.add(glow('#9fdcff', 1.6, 0.5)); } else if (k === 'magnet') { g.add(magnetIcon(), glow('#ff8a8a', 1.4, 0.45)); } else { g.add(new THREE.Mesh(boltGeo, boltMat), glow('#ffb02e', 1.5, 0.55)); } g.scale.setScalar(1.25); return cast(g); };

  type Node = { t: Thing; m: THREE.Object3D; gone: number; fly?: THREE.Vector3; spin?: number; spray?: THREE.Points; wheels?: THREE.Object3D[]; cap?: THREE.Object3D; squish?: number; branch?: THREE.Object3D };
  const nodes = new Map<number, Node>();
  const make = (t: Thing): Node => {
    let m: THREE.Object3D; const n: Node = { t, m: null as unknown as THREE.Object3D, gone: -1 };
    switch (t.kind) {
      case 'log': { const g = new THREE.Group(); const b = new THREE.Mesh(logGeo, logMat); g.add(b); for (const sx of [-1, 1]) { const e = new THREE.Mesh(logEndGeo, logEnd); e.position.x = sx * 1; g.add(e); } m = cast(g); break; }
      case 'rock': { const r = new THREE.Mesh(rockGeo, rockMat); r.scale.set(1.1, 0.8, 1); r.rotation.set(0.3, t.id, 0); r.position.y = 0.4; const g = new THREE.Group(); g.add(r); m = cast(g); break; }
      case 'puddle': { const p = new THREE.Mesh(puddleGeo, puddleMat); p.scale.set(1.15, 1, 0.8); p.position.y = 0.02; const g = new THREE.Group(); g.add(p); m = g; break; }
      case 'mud': { const g = new THREE.Group(); const p = new THREE.Mesh(puddleGeo, mudMat); p.scale.set(1.2, 1, 0.85); p.position.y = 0.02; g.add(p); for (let i = 0; i < 5; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.12 + (i % 2) * 0.06, 8, 6), mudDark); b.scale.y = 0.35; b.position.set(Math.cos(i * 2.4) * 0.6, 0.03, Math.sin(i * 2.4) * 0.45); g.add(b); } m = g; break; }
      case 'bucket': {
        const g = new THREE.Group(); const body = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.27, 0.52, 14), woodMat); body.position.y = 0.26; g.add(body);
        for (const y of [0.1, 0.42]) { const band = new THREE.Mesh(new THREE.TorusGeometry(y > 0.2 ? 0.33 : 0.285, 0.022, 6, 18), bandMat); band.rotation.x = Math.PI / 2; band.position.y = y; g.add(band); }
        const w = new THREE.Mesh(new THREE.CircleGeometry(0.3, 16).rotateX(-Math.PI / 2), waterTop); w.position.y = 0.48; g.add(w); m = cast(g); break;
      }
      case 'branch': {
        const g = new THREE.Group(); const side = t.lane === 0 ? -1 : t.lane === 2 ? 1 : (t.id % 2 ? 1 : -1);
        const tr = tree('leafy', t.id, 1.15, shadows); tr.position.set(side * 3.4 - LANES[t.lane], 0, 0.4); g.add(tr);
        const br = new THREE.Group(); const limb = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 2.1, 8).rotateZ(Math.PI / 2), woodDark); br.add(limb);
        for (let i = 0; i < 3; i++) { const tw = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.6, 5), woodDark); tw.position.set(-0.6 + i * 0.6, 0.22, (i % 2 ? 0.1 : -0.1)); tw.rotation.z = (i - 1) * 0.6; br.add(tw); const lf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28, 0), i % 2 ? leafMat : leafLight); lf.position.set(-0.7 + i * 0.7, 0.45, 0); br.add(lf); }
        g.add(br); n.branch = br; m = cast(g); break;
      }
      case 'bar': {
        const g = new THREE.Group(); for (const sx of [-1, 1]) { const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.7, 7), woodDark); post.position.set(sx * 1.1, 0.85, 0); g.add(post); }
        const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 2.4, 8).rotateZ(Math.PI / 2), vineMat); beam.position.y = 1.08; g.add(beam);
        for (let i = 0; i < 7; i++) { const len = 0.18 + ((i * 37) % 5) * 0.04; const s = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, len, 4), vineMat); s.position.set(-0.95 + i * 0.32, 1.02 - len / 2, 0); g.add(s); const lf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.09, 0), i % 2 ? leafMat : leafLight); lf.position.set(-0.95 + i * 0.32, 1.0 - len, 0); g.add(lf); }
        for (let i = 0; i < 5; i++) { const lf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.12, 0), i % 2 ? leafMat : leafLight); lf.position.set(-1 + i * 0.5, 1.14, 0.05); g.add(lf); }
        m = cast(g); break;
      }
      case 'sprinkler': {
        const g = new THREE.Group(); const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.34, 8), greenPipe); pipe.position.y = 0.17; g.add(pipe);
        const head = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.1, 10), brassMat); head.position.y = 0.38; g.add(head);
        const N = 60; const pos = new Float32Array(N * 3); const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: '#bfe6ff', size: a.mobile ? 0.09 : 0.07, transparent: true, opacity: 0.85, depthWrite: false })); pts.frustumCulled = false; g.add(pts); n.spray = pts;
        m = cast(g); break;
      }
      case 'boulder': { const g = new THREE.Group(); const b = new THREE.Mesh(boulderGeo, boulderMat); b.position.y = 0.72; b.scale.set(1, 0.92, 1); g.add(b); n.spin = 0; m = cast(g); break; }
      case 'cart': {
        const g = new THREE.Group(); const body = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 0.95), woodMat); body.position.y = 0.62; g.add(body);
        for (const sx of [-1, 1]) { const rim = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.08, 0.06), woodDark); rim.position.set(0, 0.9, sx * 0.46); g.add(rim); }
        const wheels: THREE.Object3D[] = [];
        for (const sx of [-0.5, 0.5]) for (const sz of [-1, 1]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.08, 12).rotateX(Math.PI / 2), woodDark); w.position.set(sx, 0.27, sz * 0.52); g.add(w); wheels.push(w); }
        for (let i = 0; i < 5; i++) { const ap = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), i % 2 ? capMat : leafLight); ap.position.set(-0.45 + i * 0.22, 0.95, (i % 2 ? 0.15 : -0.12)); g.add(ap); }
        const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 6).rotateZ(Math.PI / 2), woodDark); handle.position.set(1.15, 0.7, 0); g.add(handle);
        n.wheels = wheels; m = cast(g); break;
      }
      case 'mushroom': {
        const g = new THREE.Group(); const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 0.42, 12), stemMat); stem.position.y = 0.21; g.add(stem);
        const cap = new THREE.Group(); const c = new THREE.Mesh(new THREE.SphereGeometry(0.62, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), capMat); c.scale.y = 0.7; cap.add(c);
        for (let i = 0; i < 7; i++) { const an = i * 0.9, el = 0.35 + (i % 3) * 0.3; const dot = new THREE.Mesh(new THREE.SphereGeometry(0.07 + (i % 2) * 0.03, 8, 6), dotMat); dot.position.set(Math.cos(an) * Math.cos(el) * 0.6, Math.sin(el) * 0.42, Math.sin(an) * Math.cos(el) * 0.6); cap.add(dot); }
        cap.position.y = 0.4; g.add(cap); n.cap = cap; m = cast(g); break;
      }
      case 'shield': case 'magnet': case 'boost': { const g = new THREE.Group(); const ic = powerIcon(t.kind); ic.name = 'icon'; g.add(ic); m = g; break; }
      default: { // star / gold / super
        const g = new THREE.Group(); const s = new THREE.Mesh(starGeo, t.kind === 'super' ? superMat : t.kind === 'gold' ? goldBig : gold); s.name = 'icon'; if (t.kind === 'gold') s.scale.setScalar(1.4); if (t.kind === 'super') { s.scale.setScalar(1.9); g.add(glow('#ff9fbf', 1.8, 0.6)); }
        s.castShadow = shadows; g.add(s); m = g;
      }
    }
    m.position.x = t.x; scene.add(m); n.m = m; nodes.set(t.id, n); return n;
  };
  // ---- the bridge: a boardwalk down the middle lane over a pond ----
  const bridges = new Map<Section, THREE.Group>();
  const pondMat = new THREE.MeshStandardMaterial({ color: '#4fa3d8', roughness: 0.12, metalness: 0.15, transparent: true, opacity: 0.94 });
  const plankMat = std('#b98552', 0.85), padMat = std('#5aa84a', 0.7);
  const buildBridge = (s: Section) => {
    const L = s.d1 - s.d0; const g = new THREE.Group();
    const pond = new THREE.Mesh(new THREE.PlaneGeometry(26, L + 3).rotateX(-Math.PI / 2), pondMat); pond.position.set(0, 0.05, -L / 2); pond.receiveShadow = true; g.add(pond);
    for (let z = 0; z < L; z += 0.62) { const p = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.1, 0.52), plankMat); p.position.set(0, 0.16, -z - 0.3); p.receiveShadow = true; g.add(p); }
    for (const sx of [-1, 1]) { for (let z = 0; z <= L; z += 2.2) { const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.75, 6), woodDark); post.position.set(sx * 1.3, 0.45, -z); g.add(post); } const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, L), woodMat); rail.position.set(sx * 1.3, 0.8, -L / 2); g.add(rail); }
    for (let i = 0; i < 12; i++) { const pad = new THREE.Mesh(new THREE.CircleGeometry(0.35 + (i % 3) * 0.1, 10).rotateX(-Math.PI / 2), padMat); pad.position.set((i % 2 ? 1 : -1) * (2.4 + ((i * 7) % 5) * 0.6), 0.06, -((i * 9.3) % L)); g.add(pad); }
    scene.add(cast(g)); bridges.set(s, g);
  };

  // ---- you ----
  const me = a.figure(setup.you.skin, 0.3);
  me.group.rotation.y = Math.PI;
  const R = me.fuzzy.radius ?? 0.3;
  a.camTarget.set(0, 0, 0);
  // effects that ride with the Fuzzy
  const bubble = new THREE.Mesh(new THREE.SphereGeometry(R * 2.4, 22, 14), bubbleMat.clone()); bubble.position.y = R * 1.1; bubble.visible = false; me.group.add(bubble);
  const dizzy = new THREE.Group(); for (let i = 0; i < 3; i++) { const s = new THREE.Mesh(starGeo, gold); s.scale.setScalar(0.35); dizzy.add(s); } dizzy.position.y = R * 2.6; dizzy.visible = false; me.group.add(dizzy);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(R * 3, 0.03, 6, 40), new THREE.MeshBasicMaterial({ color: '#ff8a8a', transparent: true, opacity: 0.6 })); ring.rotation.x = Math.PI / 2; ring.position.y = 0.05; ring.visible = false; me.group.add(ring);
  const splats: THREE.Mesh[] = []; for (let i = 0; i < 6; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.06 + (i % 3) * 0.02, 7, 5), mudDark); const an = -1.2 + i * 0.5, el = -0.3 + (i % 3) * 0.45; s.position.set(Math.sin(an) * R * 1.02, R + Math.sin(el) * R, -Math.cos(an) * Math.cos(el) * R * 1.02); s.lookAt(0, R, 0); s.visible = false; me.group.add(s); splats.push(s); }
  // drips (wet / muddy) and speed lines (boost)
  const dripMat = new THREE.MeshBasicMaterial({ color: '#8fd0ff', transparent: true, opacity: 0.85 }), mudDrip = new THREE.MeshBasicMaterial({ color: '#6b4a2b' });
  const drips: { m: THREE.Mesh; v: number; life: number }[] = [];
  for (let i = 0; i < 14; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 4), dripMat); m.visible = false; scene.add(m); drips.push({ m, v: 0, life: 9 }); }
  let dripT = 0;
  const lines: THREE.Mesh[] = []; const lineMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.55, depthWrite: false });
  for (let i = 0; i < (a.mobile ? 10 : 16); i++) { const l = new THREE.Mesh(new THREE.PlaneGeometry(0.04, 2.6).rotateX(-Math.PI / 2), lineMat); l.position.set((i % 2 ? 1 : -1) * (1.2 + (i * 0.37) % 3), 0.4 + ((i * 0.53) % 2.2), -((i * 4.7) % 40)); l.userData.y = l.position.y; l.visible = false; scene.add(l); lines.push(l); }
  // reactions: motion only, the model itself is untouched
  type ReactKind = 'stumble' | 'tumble' | 'flat' | 'spin' | 'knock' | 'shake' | 'squelch' | 'boing' | 'hop';
  let react: { kind: ReactKind; t: number; dur: number } | null = null;
  const doReact = (kind: ReactKind, dur: number) => { react = { kind, t: 0, dur }; };
  let shake = 0, shakeAmp = 0, lean = 0, duckK = 0, fovKick = 0, dizzyT = 0, popT = -1;
  const kick = (amp: number, t = 0.45) => { shake = t; shakeAmp = amp; };

  // ---- HUD extras: the power-up pill and the mute button ----
  const pill = document.createElement('div'); pill.className = 'ob-power'; pill.hidden = true;
  const pillIcon = document.createElement('span'); const pillName = document.createElement('b'); const pillBar = document.createElement('i'); const pillFill = document.createElement('u'); pillBar.append(pillFill); pill.append(pillIcon, pillName, pillBar);
  const muteBtn = document.createElement('button'); muteBtn.className = 'ob-mute'; muteBtn.type = 'button';
  const paintMute = () => { muteBtn.textContent = muted ? '🔇' : '🔊'; muteBtn.setAttribute('aria-label', muted ? 'Sound off — tap to turn it on' : 'Sound on — tap to mute'); muteBtn.classList.toggle('off', muted); };
  muteBtn.addEventListener('click', (e) => { e.stopPropagation(); muted = !muted; setup.sound = muted ? false : soundWanted; try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch { /* ignore */ } paintMute(); if (!muted) play(() => rs.star(3)); });
  paintMute(); a.hud.append(pill, muteBtn);
  const POWER_UI: Record<Power, [string, string]> = { shield: ['🛡️', 'Shield'], magnet: ['🧲', 'Star magnet'], boost: ['⚡', 'Speed boost'] };
  const paintPill = () => {
    const act = (['boost', 'magnet', 'shield'] as Power[]).filter((p) => sim.power[p] > 0);
    pill.hidden = !act.length; if (!act.length) return; const p = act[0];
    if (pill.dataset.p !== p) { pill.dataset.p = p; pillIcon.textContent = POWER_UI[p][0]; pillName.textContent = act.length > 1 ? `${POWER_UI[p][1]} +${act.length - 1}` : POWER_UI[p][1]; }
    pillFill.style.width = `${Math.round((sim.power[p] / POWER[p]) * 100)}%`; pill.classList.toggle('ending', sim.power[p] < 2);
  };

  // ---- controls: swipes + tap on phones (and mouse drags), keys via the kit ----
  type Act = 'L' | 'R' | 'J' | 'D';
  const queue: Act[] = [];
  // one swipe = one move; a swipe that turns (right then left, or up then down…) can make one more
  let sw: { id: number; x: number; y: number; x0: number; y0: number; t: number; fired: boolean; dir: Act | null } | null = null;
  const SWIPE = 24, TAP = 12;
  a.root.style.touchAction = 'none';
  const blocked = (e: Event) => !!(e.target as HTMLElement).closest('button, .race-pause, .mg-btn, .mg-intro, .race-paused, .adv-results');
  // swipes are read in the capture phase and kept from the kit's (hidden) touch stick, which would move a lane a second time
  const own = (e: PointerEvent) => e.pointerType !== 'mouse' && !blocked(e);
  a.root.addEventListener('pointerdown', (e) => { if (!own(e)) return; e.stopPropagation(); if (!a.started() || a.paused() || sw) return; sw = { id: e.pointerId, x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t: e.timeStamp, fired: false, dir: null }; }, true);
  a.root.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'mouse') return; if (sw) e.stopPropagation();
    if (!sw || e.pointerId !== sw.id) return; const dx = e.clientX - sw.x, dy = e.clientY - sw.y;
    const dir: Act = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'R' : 'L') : dy < 0 ? 'J' : 'D';
    if (dir === sw.dir) { sw.x = e.clientX; sw.y = e.clientY; return; } // still going the same way: follow the finger, no repeat
    if (Math.hypot(dx, dy) < SWIPE) return;
    queue.push(dir); sw.x = e.clientX; sw.y = e.clientY; sw.fired = true; sw.dir = dir;
  }, true);
  const up = (e: PointerEvent) => { if (e.pointerType === 'mouse' || !sw || e.pointerId !== sw.id) return; e.stopPropagation(); if (!sw.fired && Math.hypot(e.clientX - sw.x0, e.clientY - sw.y0) < TAP) queue.push('J'); /* a touch that didn't move = a tap (however long: slow phones deliver late) */ sw = null; };
  a.root.addEventListener('pointerup', up, true); a.root.addEventListener('pointercancel', (e) => { if (sw && e.pointerId === sw.id) { e.stopPropagation(); sw = null; } }, true);
  a.onAction(() => { if (a.started() && !a.paused()) queue.push('J'); });
  const ctlLine = a.mobile ? 'Swipe ← → to change lane · swipe ↑ or tap to jump · swipe ↓ to duck' : '← → change lane · ↑ or Space jump · ↓ duck';
  a.tip('go', ctlLine, 4200);

  // ---- what happens: sound + a reaction for every event ----
  const TIPS: Partial<Record<string, string>> = {
    mushroom: 'Run onto the mushroom — BOING! — up to the high stars', mud: 'Mud slows you right down — jump it or go round', bucket: 'Water buckets: jump them or get soaked!',
    branch: 'A branch is about to fall — jump it like a log', bar: a.mobile ? 'Vines! Swipe ↓ to duck under them' : 'Vines! Press ↓ or S to duck under them', sprinkler: 'Sprinklers spray on and off — pass when they rest',
    boulder: 'A boulder is rolling at you — change lane!', cart: 'Carts trundle to and fro — take the free lane', shield: 'A shield: one bump for free', magnet: 'A star magnet pulls stars to you', boost: 'Speed boost: smash through everything!', super: 'A super star! Worth 150',
  };
  const BUMP_WORDS: Partial<Record<ObKind, string>> = { rock: 'Oof — a rock!', log: 'Whoops — tripped!', branch: 'Bonk — a branch!', boulder: 'Squashed flat!', cart: 'Crash — a cart!', bar: 'Tangled in the vines!' };
  const at = (x: number, y = 0.4) => new THREE.Vector3(x, y + hillAt(sim.dist), 0);
  const handle = (e: RunEvent) => {
    const t = e.item; const n = t ? nodes.get(t.id) : undefined;
    switch (e.kind) {
      case 'star': if (t) {
        if (n) { n.gone = 0; if (e.pulled) n.fly = n.m.position.clone(); }
        a.float(t.x, t.y + 0.6 + hillAt(t.d), 0, `+${e.value}${(e.mult ?? 1) > 1 ? ` ×${e.mult}` : ''}`, t.kind === 'star' ? '' : 'gold');
        if (t.kind === 'super') { play(rs.super); a.banner('SUPER STAR! +' + e.value, 'combo'); a.sparks(at(t.x, t.y), 22); }
        else if (t.kind === 'gold') { play(rs.gold); a.sparks(at(t.x, t.y), 12); } else play(() => rs.star(sim.combo.chain));
      } break;
      case 'bump': if (t) {
        if (n) n.gone = 0; a.banner(BUMP_WORDS[t.kind] ?? 'Ouch!', 'warn'); a.float(me.group.position.x, 1.5 + hillAt(sim.dist), 0, `−40`, 'warn'); dizzyT = BUMP.time;
        if (t.kind === 'rock') { play(rs.rock); doReact('stumble', 0.7); kick(0.35); a.chips(at(t.x, 0.4), 8, '#9a948a'); a.puff(at(t.x, 0.2), 5, '#e6d6b0'); a.tip('rock', 'Rocks can’t be jumped — change lane', 3400); }
        else if (t.kind === 'log' || t.kind === 'branch') { play(rs.wood); doReact('tumble', 0.75); kick(0.3); a.chips(at(t.x, 0.4), 8); a.tip('log', a.mobile ? 'Swipe ↑ a moment before the log' : 'Jump (↑ / Space) a moment before the log', 3400); }
        else if (t.kind === 'boulder') { play(rs.boulder); doReact('flat', 1.0); kick(0.6, 0.6); a.puff(at(t.x, 0.3), 9, '#d8cfc0'); a.tip('boulder2', 'Boulders roll down one lane — step aside early', 3400); }
        else if (t.kind === 'cart') { play(rs.cartHit); doReact('spin', 0.9); kick(0.45); a.chips(at(t.x, 0.6), 6); a.tip('cart2', 'Watch where the cart is going — take the free lane', 3400); }
        else if (t.kind === 'bar') { play(rs.vine); doReact('knock', 0.6); kick(0.25); a.chips(at(t.x, 1), 6, '#4f9e3f'); a.tip('bar2', a.mobile ? 'Swipe ↓ just before the vines' : 'Press ↓ just before the vines', 3400); }
      } break;
      case 'splash':
        if (t?.kind === 'bucket') { play(rs.bucket); if (n) { n.gone = 0; n.fly = new THREE.Vector3(0, 0, 0); } } else if (t?.kind === 'sprinkler') play(() => { rs.spray(); rs.splash(); }); else play(() => rs.splash());
        doReact('shake', 0.7); kick(0.12, 0.25); a.puff(at(sim.x, 0.3), 8, '#9fd3ff'); a.float(me.group.position.x, 1.3 + hillAt(sim.dist), 0, 'Splash!');
        a.tip('puddle', 'Jump the water or go round it', 3200); break;
      case 'mud': play(rs.mud); doReact('squelch', 0.9); a.puff(at(sim.x, 0.2), 7, '#7a5534'); a.float(me.group.position.x, 1.3 + hillAt(sim.dist), 0, 'Squelch!'); break;
      case 'bounce': play(rs.boing); doReact('boing', 0.5); if (n) n.squish = 0; a.float(me.group.position.x, 1.6 + hillAt(sim.dist), 0, 'BOING!', 'gold'); fovKick = Math.max(fovKick, 5); break;
      case 'power': { const p = e.what as Power; play(p === 'shield' ? rs.shield : p === 'magnet' ? rs.magnet : rs.boost); if (n) n.gone = 0; a.banner(`${POWER_UI[p][0]} ${POWER_UI[p][1]}!`, 'combo'); a.sparks(at(sim.x, 0.8), 14); pill.dataset.p = ''; if (p === 'boost') fovKick = 10; break; }
      case 'powerEnd': play(rs.powerEnd); pill.dataset.p = ''; break;
      case 'shieldPop': play(rs.shieldPop); popT = 0; if (n) { n.gone = 0; n.fly = new THREE.Vector3(0, 0, 0); } a.float(me.group.position.x, 1.6 + hillAt(sim.dist), 0, 'Shield saved you!', 'gold'); a.sparks(at(sim.x, 0.6), 16); kick(0.15, 0.2); break;
      case 'smash': play(rs.smash); if (n) { n.gone = 0; n.fly = new THREE.Vector3(0, 0, 0); } a.chips(at(t?.x ?? 0, 0.5), 8, t?.kind === 'rock' || t?.kind === 'boulder' ? '#9a948a' : undefined); a.float(t?.x ?? 0, 1.2 + hillAt(sim.dist), 0, `SMASH +${e.value}`, 'gold'); kick(0.15, 0.2); break;
      case 'duck': play(rs.duck); break;
      case 'fall': play(rs.fall); doReact('hop', 0.55); a.puff(at(sim.x, 0.2), 12, '#9fd3ff'); a.banner('Splash! Keep to the boardwalk', 'warn'); a.float(0, 1.5, 0, '−20', 'warn'); kick(0.2, 0.3); break;
      case 'roll': play(rs.rumble); break;
      case 'crack': play(rs.crack); break;
      case 'cart': play(rs.cart); break;
      case 'section':
        if (e.what === 'bridge') { a.banner('Boardwalk ahead — keep to the middle!', 'combo'); a.tip('bridge', 'Get to the middle lane before the boardwalk', 3600); }
        else if (e.what === 'rush') a.banner('STAR RUSH ahead!', 'combo'); else if (e.what === 'hill') a.banner('Over the hill!', 'combo');
        break;
      case 'rush': play(rs.rush); a.banner('⭐ STAR RUSH! ⭐', 'combo'); a.sparks(at(0, 1.2), 24); break;
      case 'rushEnd': play(rs.rushEnd); break;
      case 'newThing': if (e.what && TIPS[e.what]) a.tip('new-' + e.what, TIPS[e.what]!, 3600); break;
      case 'stars': play(rs.milestone); a.banner(`${e.n} stars! +${e.value}`, 'combo'); a.sparks(at(sim.x, 1), 18); break;
      case 'combo': a.banner(`×${e.mult} CHAIN!`, 'combo'); play(() => rs.combo(e.mult ?? 1.5)); break;
      case 'milestone': a.float(me.group.position.x, 1.8 + hillAt(sim.dist), 0, `${e.n} m +${e.value}`, 'gold'); play(rs.milestone); break;
      case 'jump': play(rs.jump); break;
      case 'land': play(rs.land); me.squash = Math.max(me.squash, 0.35); a.puff(at(me.group.position.x, 0.1), 3, '#e6d6b0'); break;
      case 'speedup': a.banner(e.n === 1 ? 'Faster!' : 'Full speed!', 'combo'); play(sfx.level); break;
      case 'warn': a.warn(e.n!); break;
    }
  };
  a.run((dt, input) => {
    sim.step(dt, input);
    const evs = [...sim.events];
    while (queue.length) { // swipes / taps land between steps; their events are handled with this step's
      const q = queue.shift()!; const before = sim.events.length;
      if (q === 'L') sim.shift(-1); else if (q === 'R') sim.shift(1); else if (q === 'J') sim.jump(); else sim.slide();
      evs.push(...sim.events.slice(before));
    }
    for (const e of evs) handle(e);
  }, (dt) => {
    const gH = hillAt(sim.dist); const onBridge = sim.section()?.kind === 'bridge' && Math.abs(sim.x) < 1.3;
    // the runner
    const tx = sim.x; lean = lerp(lean, (tx - me.group.position.x) * 2.2, Math.min(1, dt * 10));
    me.group.position.set(tx, sim.y + gH + (onBridge ? 0.16 : 0), 0);
    me.group.rotation.z = -lean * 0.5; me.group.rotation.x = sim.airborne ? -0.25 : 0;
    a.walk(me, sim.airborne ? 0 : Math.min(1.6, sim.pace / 8), dt);
    const fg = me.fuzzy.group; fg.rotation.set(0, 0, 0); fg.scale.set(1, 1, 1);
    duckK = lerp(duckK, sim.ducking ? 1 : 0, Math.min(1, dt * 18));
    if (duckK > 0.01) { fg.scale.set(1 + duckK * 0.22, 1 - duckK * 0.45, 1 + duckK * 0.22); fg.rotation.x = duckK * 0.35; }
    if (react) {
      const r = react as { kind: ReactKind; t: number; dur: number }; r.t += dt; const k = Math.min(1, r.t / r.dur); const s = Math.sin(k * Math.PI);
      switch (r.kind) {
        case 'stumble': fg.rotation.x += s * 0.75; fg.rotation.z = Math.sin(k * Math.PI * 4) * 0.28 * (1 - k); fg.position.y += s * 0.12; break;
        case 'tumble': fg.rotation.x += k * Math.PI * 2; fg.position.y += s * 0.55; break;
        case 'flat': { const y = k < 0.35 ? 0.28 : 0.28 + 0.72 * (1 - Math.cos((k - 0.35) / 0.65 * Math.PI * 2.5) * Math.exp(-(k - 0.35) * 5)); const xz = 1 / Math.sqrt(Math.max(0.28, y)); fg.scale.set(xz, y, xz); break; }
        case 'spin': fg.rotation.y = (1 - (1 - k) ** 2) * Math.PI * 4; fg.position.y += s * 0.25; break;
        case 'knock': fg.rotation.x -= s * 0.65; break;
        case 'shake': fg.rotation.y = Math.sin(k * Math.PI * 10) * 0.4 * (1 - k); fg.rotation.z = Math.sin(k * Math.PI * 10 + 1) * 0.12 * (1 - k); break;
        case 'squelch': { const q = Math.sin(k * Math.PI * 3) * 0.22 * (1 - k); fg.scale.set(1 + q, 1 - q, 1 + q); break; }
        case 'boing': { const q = Math.sin(k * Math.PI * 2) * 0.3 * (1 - k); fg.scale.set(1 - q * 0.5, 1 + q, 1 - q * 0.5); break; }
        case 'hop': fg.position.y += s * 0.8; fg.rotation.y = k * Math.PI * 2; break;
      }
      if (k >= 1) react = null;
    }
    if (fg.scale.y !== 1) fg.position.y -= me.base * (1 - fg.scale.y); // squashes keep the feet on the ground (the figure's pivot is its middle)
    // dizzy stars after a bump, mud splats, drips, the shield bubble, the magnet ring
    dizzyT = Math.max(0, dizzyT - dt); dizzy.visible = dizzyT > 0;
    if (dizzy.visible) dizzy.children.forEach((c, i) => { const an = time.value * 6 + (i * Math.PI * 2) / 3; c.position.set(Math.cos(an) * R * 1.3, Math.sin(an * 2) * 0.05, Math.sin(an) * R * 1.3); c.rotation.y += dt * 4; });
    const mk = Math.min(1, sim.muddy * 2); splats.forEach((s) => { s.visible = mk > 0.02; s.scale.set(mk, mk, mk * 0.4); });
    dripT -= dt;
    if ((sim.wet > 0 || sim.muddy > 0) && dripT <= 0) { dripT = 0.07; const d = drips.find((x) => x.life > 0.9); if (d) { d.life = 0; d.v = 0; d.m.material = sim.muddy > sim.wet ? mudDrip : dripMat; d.m.visible = true; d.m.position.set(me.group.position.x + (Math.random() - 0.5) * R * 1.6, me.group.position.y + R * (0.4 + Math.random()), 0.05 + Math.random() * 0.2); } }
    for (const d of drips) { if (d.life > 0.9) continue; d.life += dt; d.v -= 9 * dt; d.m.position.y += d.v * dt; d.m.position.z += sim.pace * dt * 0.6; if (d.life > 0.9 || d.m.position.y < gH) { d.life = 9; d.m.visible = false; } }
    const sh = sim.power.shield; bubble.visible = (sh > 0 && (sh > 2 || Math.sin(time.value * 18) > 0)) || popT >= 0;
    const bm = bubble.material as THREE.MeshStandardMaterial;
    if (popT >= 0) { popT += dt; bubble.scale.setScalar(1 + popT * 4); bm.opacity = Math.max(0, 0.32 * (1 - popT / 0.3)); if (popT > 0.3) { popT = -1; bubble.scale.setScalar(1); bm.opacity = 0.32; } }
    else if (bubble.visible) { bubble.scale.setScalar(1 + Math.sin(time.value * 5) * 0.04); bubble.rotation.y += dt; }
    ring.visible = sim.power.magnet > 0; if (ring.visible) { ring.rotation.z += dt * 3; ring.scale.setScalar(1 + Math.sin(time.value * 6) * 0.08); }
    // boost: speed lines + a wider lens
    const boosting = sim.power.boost > 0;
    for (const l of lines) { l.visible = boosting; if (boosting) { l.position.z += sim.pace * 2.2 * dt; if (l.position.z > 4) l.position.z -= 44; l.position.y = (l.userData.y as number) + gH; } }
    fovKick = Math.max(boosting ? 10 : 0, fovKick - dt * 12);
    const fov = CAM.fov + fovKick; if (Math.abs(camera.fov - fov) > 0.05) { camera.fov = lerp(camera.fov, fov, Math.min(1, dt * 6)); camera.updateProjectionMatrix(); }
    // camera: follow the lane, rise over hills, shake on bumps
    shake = Math.max(0, shake - dt); const sk = shake > 0 ? shakeAmp * (shake / 0.45) : 0;
    a.camTarget.set(lerp(a.camTarget.x, tx * 0.6, Math.min(1, dt * 5)) + (sk ? (Math.random() - 0.5) * sk : 0), 0, sk ? (Math.random() - 0.5) * sk * 0.3 : 0);
    a.cam.up = lerp(a.cam.up, CAM.up + gH * 0.9 + (sk ? (Math.random() - 0.5) * sk * 0.6 : 0), Math.min(1, dt * 6));
    // scrolling scenery (the trail scrolls with the run; hills lift the trail, its edges and a strip of lawn)
    tt.offset.y = sim.dist / TILE;
    const hillNear = sim.sections.some((s) => s.kind === 'hill' && s.d1 > sim.dist - BEHIND && s.d0 < sim.dist + AHEAD);
    if (hillNear || hillsShown) { lift(trailGeo, trailZ, hillNear); for (const e of edges) lift(e.geometry, trailZ, hillNear); lift(skinGeo, 0, hillNear); skin.visible = hillNear; hillsShown = hillNear; }
    const inBridge = (d: number) => sim.sections.some((s) => s.kind === 'bridge' && d > s.d0 - 1 && d < s.d1 + 1);
    const rushOn = sim.section()?.kind === 'rush'; dashMat.color.lerp(rushOn ? dashGold : dashBase, Math.min(1, dt * 4));
    for (const s of scrollers) {
      let rel = s.d - sim.dist; while (rel < -BEHIND) { s.d += s.span; rel += s.span; } while (rel > s.span - BEHIND) { s.d -= s.span; rel -= s.span; }
      s.m.position.set(s.x, (s.y ?? 0) + (hillNear ? hillAt(s.d) * sideFall(s.x) : 0), -rel); s.m.visible = rel < AHEAD && !((s.bush || s.y) && inBridge(s.d));
    }
    // the boardwalks
    for (const s of sim.sections) if (s.kind === 'bridge' && !bridges.has(s) && s.d0 - sim.dist < AHEAD + 5) buildBridge(s);
    for (const [s, g] of bridges) { g.position.z = -(s.d0 - sim.dist); if (s.d1 < sim.dist - BEHIND - 4 || !sim.sections.includes(s)) { scene.remove(g); bridges.delete(s); } }
    // things
    superMat.color.setHSL(0.93 + Math.sin(time.value * 3) * 0.04, 0.9, 0.62);
    for (const t of sim.things) {
      const rel = t.d - sim.dist;
      let n = nodes.get(t.id);
      if (!n) { if (t.state !== 'ahead' || rel > AHEAD) continue; n = make(t); }
      const baseY = hillAt(t.d);
      if (n.gone >= 0) {
        n.gone += dt; const k = Math.min(1, n.gone / 0.25); const icon = n.m.getObjectByName('icon');
        if (n.fly) {
          if (t.kind === 'star' || t.kind === 'gold' || t.kind === 'super') { // pulled in by the magnet
            const f = Math.min(1, n.gone / 0.2); n.m.position.lerpVectors(n.fly, new THREE.Vector3(me.group.position.x, me.group.position.y + R, 0), f); n.m.scale.setScalar(Math.max(0.01, 1 - f * 0.7));
            if (f >= 1) { scene.remove(n.m); nodes.delete(t.id); } continue;
          }
          // knocked flying (smash / bucket / shield pop)
          n.fly.y -= 14 * dt; n.m.position.y += (6 + n.fly.y) * dt; n.m.position.z = -rel - n.gone * 6; n.m.position.x += (t.x >= 0 ? 1 : -1) * 4 * dt; n.m.rotation.x += dt * 9; n.m.rotation.z += dt * 6;
          if (n.gone > 0.9) { scene.remove(n.m); nodes.delete(t.id); } continue;
        }
        n.m.position.x = t.x;
        if (icon) { icon.position.y = k * 1.2; icon.scale.setScalar(Math.max(0.001, (t.kind === 'super' ? 1.9 : t.kind === 'gold' ? 1.4 : t.kind === 'star' ? 1 : 1.25) * (1 - k))); n.m.position.y = baseY + t.y; if (k >= 1) { scene.remove(n.m); nodes.delete(t.id); continue; } }
        else n.m.rotation.z = Math.sin(n.gone * 30) * 0.2 * Math.max(0, 1 - n.gone / 0.5);
      } else {
        n.m.position.x = t.x;
        if (t.kind === 'star' || t.kind === 'gold' || t.kind === 'super') { n.m.getObjectByName('icon')!.rotation.y += dt * 3; n.m.position.y = baseY + t.y + Math.sin(time.value * 3 + t.id) * 0.06; }
        else if (t.kind === 'shield' || t.kind === 'magnet' || t.kind === 'boost') { n.m.getObjectByName('icon')!.rotation.y += dt * 2.2; n.m.position.y = baseY + t.y + 0.15 + Math.sin(time.value * 2.5 + t.id) * 0.1; }
        else n.m.position.y = baseY + (t.kind === 'log' ? 0.3 : 0);
      }
      n.m.position.z = -rel;
      if (n.gone < 0 && t.kind === 'branch' && n.branch) { n.branch.position.y = Math.max(0.2, t.y); n.branch.rotation.z = t.y > 0 ? (1 - t.y / 3.2) * 0.5 : 0; n.branch.rotation.x = t.y > 0.05 ? Math.sin(time.value * 20) * 0.05 : 0; }
      if (t.kind === 'boulder' && n.spin !== undefined && t.t) { n.spin += dt * 9; (n.m.children[0] as THREE.Mesh).rotation.x = -n.spin; if (Math.random() < dt * 6) a.puff(new THREE.Vector3(t.x, baseY + 0.1, -rel + 0.6), 1, '#d8cfc0'); }
      if (t.kind === 'cart' && n.wheels) { const moving = t.t && Math.abs(t.x - LANES[t.to]) > 0.01; for (const w of n.wheels) w.rotation.z += moving ? dt * 8 * (LANES[t.to] > t.x ? -1 : 1) : 0; n.m.rotation.z = moving ? Math.sin(time.value * 16) * 0.02 : 0; }
      if (t.kind === 'mushroom' && n.cap && n.squish !== undefined) { n.squish += dt; const q = Math.sin(Math.min(1, n.squish / 0.5) * Math.PI * 3) * 0.35 * Math.max(0, 1 - n.squish / 0.5); n.cap.scale.set(1 + q, 1 - q, 1 + q); }
      if (t.kind === 'sprinkler' && n.spray) {
        const on = sprayOn(sim.clock.time, t.phase); n.spray.visible = on && rel < 40;
        if (n.spray.visible) { const p = n.spray.geometry.attributes.position as THREE.BufferAttribute; const sweep = Math.sin(time.value * 2.2 + t.phase) * 1.2; for (let i = 0; i < p.count; i++) { const life = ((time.value * 1.6 + i / p.count) % 1); const an = sweep + (i % 6 - 2.5) * 0.12; p.setXYZ(i, Math.sin(an) * 2.4 * life * 0.8, 0.42 + 2.4 * life - 3.2 * life * life, Math.cos(an) * 2.4 * life * 0.5 - 0.3); } p.needsUpdate = true; }
      }
      if (rel < -BEHIND) { scene.remove(n.m); nodes.delete(t.id); }
    }
    for (const [id, n] of nodes) if (!sim.things.includes(n.t)) { scene.remove(n.m); nodes.delete(id); }
    paintPill();
    a.setScore(sim.score);
    a.setCount(String(sim.stars + sim.golden), `${Math.round(sim.dist)} m`);
    a.setTime(sim.clock.left);
    a.setCombo(sim.combo.chain, sim.combo.mult, sim.combo.next);
    if (sim.state === 'done') a.finish(sim.result());
  });
  if (import.meta.env.DEV) (window as unknown as { __mg: unknown }).__mg = {
    id: 'obstacle', sim, ctl: a.ctl, start: a.start, jump: () => sim.jump(), finishNow: () => { (sim as unknown as { state: string }).state = 'done'; },
    queue, muted: () => muted, sound: () => setup.sound, react: () => (react as { kind: string } | null)?.kind ?? null, resetReact: () => { react = null; }, nodes: () => nodes.size, bridges: () => bridges.size, skin: () => skin.visible,
    screenOfMe: () => { const v = me.group.position.clone().setY(me.group.position.y + R).project(camera); const r = a.renderer.domElement.getBoundingClientRect(); return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height }; },
  };
}
