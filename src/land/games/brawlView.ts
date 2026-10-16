/**
 * Fuzzie Brawl Arena — the 3D scene: a painted arena (mown lawn, team zones, dirt paths, a cobbled Sunflower plaza, a stone curb),
 * trimmed hedge walls with stone pillars, banded crates, soft cover rocks, bushes that rustle, glowing team gates, torches with
 * warm light, banners and bunting (the art lives in brawlArt.ts; fence, trees and bushes come from the orchard model kit). Six
 * Fuzzies (the owner's model, unchanged — only equipment and motion around it): a glowing team ring under each, a blaster in
 * their role colour, a name + health bar. Shooting is easy: FIRE (a big button on phones, Space / click on computers) aims for
 * you — it locks on the best enemy in a wide cone round where you are heading, leads a moving target a little, draws a line and
 * a reticle on it — and you can still drag the button (or click with the mouse) to aim yourself; your bolts are fatter. One big
 * ★ button for the special. Bolts glow with trails, hits burst, knockouts throw stars, the camera follows with a look-ahead and
 * pulls back a little when enemies are close. Rules: games/brawl.ts; scene kit: land/mgScene.ts; sounds: game/brawlSounds.ts.
 */
import * as THREE from 'three';
import { createArcade, std, lerp, type MiniSetup, type MiniHooks } from '../mgScene';
import { tree } from './sceneArt';
import { loadKit, type Kit } from '../assets/kit';
import { loadFuzzyGlb } from '../../game/fuzzyGlb';
import { adventure } from '../adventures';
import { BrawlSim, ROLES, SPECIAL, ZONE, ARENA, AMMO, WIN_AT, SPAWN, SKILLS, lineup, type Role, type Fighter, type BrawlEvent, type Roster, type Box } from './brawl';
import { brawl as bs } from '../../game/brawlSounds';
import * as A from './brawlArt';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const ROLE_KEY = 'fz.brawl.role', MUTE_KEY = 'fz.brawl.mute';
const TEAM = ['#4aa8f0', '#ff6b9a'] as const;
const BOLT = ['#8fd0ff', '#ff9fbf'] as const;
const ROLE_COLOR: Record<Role, string> = { burst: '#ffb02e', guard: '#2fbfa5', zip: '#ffd34a', bloom: '#5fc46b' };
const ROLE_UI: Record<Role, { icon: string; name: string; blurb: string }> = {
  burst: { icon: '💥', name: 'Energy Burst', blurb: 'Strong single shots · blast everyone close' },
  guard: { icon: '🛡️', name: 'Bubble Shield', blurb: 'Tough, short-range spread · shield yourself' },
  zip: { icon: '⚡', name: 'Zoom Dash', blurb: 'Fast, double shots · dash in or out' },
  bloom: { icon: '🌼', name: 'Bloom Heal', blurb: 'Steady shots · heal your whole team' },
};
const ALLY_SKINS: [string, string][] = [['#9fd8ff', '#6fb6f0'], ['#a6e3b8', '#6cc489']];
const FOE_SKINS: [string, string][] = [['#ffb38a', '#ff8f5a'], ['#ffe08a', '#f5c04a'], ['#ffc4d6', '#ff8fb4']];
const FOE_NAMES = ['Bramble', 'Fizz', 'Tuft'];
type V2 = { x: number; z: number };

export function run(stage: HTMLElement, setup: MiniSetup, hooks: MiniHooks): void {
  const adv = adventure('brawl')!;
  let role: Role = 'burst'; try { const r = localStorage.getItem(ROLE_KEY) as Role | null; if (r && r in ROLES) role = r; } catch { /* private mode */ }
  let muted = false; try { muted = localStorage.getItem(MUTE_KEY) === '1'; } catch { /* ignore */ }
  const soundWanted = setup.sound; if (muted) setup.sound = false;
  const portrait = setup.mobile && innerHeight > innerWidth;
  const CAM = portrait ? { fov: 54, back: 9.5, up: 19, lookDy: -1.2, lookY: 0, lead: 0 } : { fov: 40, back: 9, up: 15.5, lookDy: -0.6, lookY: 0, lead: 0 };
  const FR = portrait ? 0.5 : 0.46; // how big the Fuzzies are drawn (the rules' body radius stays 0.42)
  let sim: BrawlSim | null = null;
  const a = createArcade(stage, {
    cls: 'brawl', setup, adv, hooks, buttonLabel: 'Fight!',
    hud: { score: 'BLUE', count: 'PINK' },
    camera: CAM,
    world: { size: { hw: ARENA.hw + 2, hd: ARENA.hd + 2 }, path: false, fence: false, treeLine: true, flowers: 0, tufts: false, fog: ['#dcebd8', 34, 90] },
    controls: { touch: false, mouseSteer: false, actionKeys: ['e', 'shift'] },
    onStart: () => begin(),
  });
  const { scene, camera, time } = a;
  const play = (f: () => void) => a.play(f);
  const shadows = !a.mobile;
  const mobile = a.mobile;

  // ------------------------------------------------------------------ the intro: pick your role
  {
    const box = a.intro.querySelector('.mg-intro-box') ?? a.intro;
    const pick = document.createElement('div'); pick.className = 'br-roles';
    const head = document.createElement('b'); head.textContent = 'Pick your Fuzzy’s power'; pick.append(head);
    const row = document.createElement('div'); row.className = 'br-role-row';
    for (const r of Object.keys(ROLE_UI) as Role[]) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'br-role' + (r === role ? ' on' : ''); b.dataset.role = r;
      b.innerHTML = `<span>${ROLE_UI[r].icon}</span><b>${ROLE_UI[r].name}</b><small>${ROLE_UI[r].blurb}</small>`;
      b.style.setProperty('--rc', ROLE_COLOR[r]);
      b.addEventListener('click', (e) => { e.stopPropagation(); role = r; try { localStorage.setItem(ROLE_KEY, r); } catch { /* ignore */ } row.querySelectorAll('.br-role').forEach((x) => x.classList.toggle('on', (x as HTMLElement).dataset.role === r)); });
      row.append(b);
    }
    pick.append(row);
    const btnEl = box.querySelector('.mg-start'); if (btnEl?.parentElement) btnEl.parentElement.insertBefore(pick, btnEl); else box.append(pick);
  }

  // ------------------------------------------------------------------ the arena (painted floor, gates, pillars, torches, banners)
  const SPAWN_Z = SPAWN[0][0].z, GATE_Z = ARENA.hd - 0.35;
  const floor = A.arenaFloor({ hw: ARENA.hw, hd: ARENA.hd, zoneR: ZONE.r, teams: [TEAM[0], TEAM[1]], spawnZ: SPAWN_Z }); scene.add(floor);
  const clouds = A.cloudShadows(ARENA.hw, ARENA.hd); scene.add(clouds.mesh);
  const gates = ([0, 1] as const).map((t) => { const g = A.gate(TEAM[t]); g.position.set(0, 0, t ? -GATE_Z : GATE_Z); scene.add(g); return g; });
  // the Sunflower: painted petals on the cobbles, a ring that shows who holds it, an arc that fills towards the next point
  const sunTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d')!; g.translate(128, 128);
    for (let i = 0; i < 22; i++) { g.save(); g.rotate((i / 22) * Math.PI * 2); g.fillStyle = i % 2 ? '#ffd34a' : '#ffc21f'; g.beginPath(); g.ellipse(0, -78, 15, 44, 0, 0, Math.PI * 2); g.fill(); g.restore(); }
    const gr = g.createRadialGradient(0, 0, 4, 0, 0, 52); gr.addColorStop(0, '#7a4a1d'); gr.addColorStop(1, '#4e2e12'); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 50, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,220,120,.35)'; for (let i = 0; i < 70; i++) { const r = Math.sqrt(i / 70) * 46, an = i * 2.4; g.beginPath(); g.arc(Math.cos(an) * r, Math.sin(an) * r, 2.2, 0, Math.PI * 2); g.fill(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const sunflower = new THREE.Mesh(new THREE.PlaneGeometry(ZONE.r * 1.5, ZONE.r * 1.5).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: sunTex, transparent: true, roughness: 0.8, depthWrite: false })); sunflower.position.y = 0.02; sunflower.receiveShadow = true; scene.add(sunflower);
  const ringMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.9, depthWrite: false });
  const zoneRing = new THREE.Mesh(new THREE.RingGeometry(ZONE.r - 0.14, ZONE.r, 64).rotateX(-Math.PI / 2), ringMat); zoneRing.position.y = 0.025; scene.add(zoneRing);
  const fillMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.12, depthWrite: false });
  const zoneFill = new THREE.Mesh(new THREE.CircleGeometry(ZONE.r - 0.14, 48).rotateX(-Math.PI / 2), fillMat); zoneFill.position.y = 0.015; scene.add(zoneFill);
  const arcMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.95, depthWrite: false, side: THREE.DoubleSide });
  let zoneArc = new THREE.Mesh(new THREE.BufferGeometry(), arcMat); scene.add(zoneArc); let arcK = -1;
  const setArc = (k: number) => { if (Math.abs(k - arcK) < 0.01) return; arcK = k; zoneArc.geometry.dispose(); zoneArc.geometry = new THREE.RingGeometry(ZONE.r + 0.05, ZONE.r + 0.3, 48, 1, Math.PI / 2, -Math.max(0.001, k) * Math.PI * 2).rotateX(-Math.PI / 2); zoneArc.position.y = 0.03; };

  // pillars (corners + middle of each side), torches, banners, bunting
  const CX = ARENA.hw + 0.45, CZ = ARENA.hd + 0.45;
  {
    const pil: THREE.BufferGeometry[] = [];
    for (const sx of [-1, 1]) for (const z of [-CZ, 0, CZ]) { const g = A.pillarGeo(2.2, 0.66, '#e7b94c', sx + z); g.translate(sx * CX, 0, z); pil.push(g); }
    const pm = new THREE.Mesh(mergeGeometries(pil)!, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82 })); pm.castShadow = shadows; pm.receiveShadow = true; scene.add(pm);
  }
  const torches: A.Torch[] = [];
  {
    const spots: [number, number][] = [];
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { spots.push([sx * CX, sz * ARENA.hd * 0.5]); spots.push([sx * 5.8, sz * CZ]); }
    spots.forEach(([x, z], i) => { const t = A.torch(i * 1.7); t.group.position.set(x, 0, z); scene.add(t.group); torches.push(t); });
    if (!mobile) for (const [x, z] of [[-CX, ARENA.hd * 0.5], [CX, -ARENA.hd * 0.5], [-CX, -ARENA.hd * 0.5], [CX, ARENA.hd * 0.5]] as [number, number][]) { const l = new THREE.PointLight('#ffb25a', 7, 9, 2); l.position.set(x * 0.9, 2.2, z); scene.add(l); }
  }
  const banners: A.Banner[] = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const b = A.banner(TEAM[sz > 0 ? 0 : 1], '#ffffff', sx + sz * 2); b.group.position.set(sx * CX, 0, sz * ARENA.hd * 0.8); b.group.rotation.y = sx > 0 ? Math.PI / 2 : -Math.PI / 2; scene.add(b.group); banners.push(b); }
  {
    const cols = [TEAM[0], '#ffffff', TEAM[1], '#ffd34a'];
    for (const sx of [-1, 1]) for (const [z0, z1] of [[-CZ, 0], [0, CZ]]) scene.add(A.bunting(new THREE.Vector3(sx * CX, 2.35, z0), new THREE.Vector3(sx * CX, 2.35, z1), 14, cols, 0.7));
    for (const sz of [-1, 1]) scene.add(A.bunting(new THREE.Vector3(-CX, 2.35, sz * CZ), new THREE.Vector3(CX, 2.35, sz * CZ), 22, cols, 0.9));
  }
  // pollen / dust motes drifting in the light
  const MOTES = mobile ? 18 : 42; const moteSeed: { x: number; z: number; y: number; s: number; p: number }[] = [];
  const motePos = new Float32Array(MOTES * 3);
  for (let i = 0; i < MOTES; i++) moteSeed.push({ x: (Math.random() - 0.5) * ARENA.hw * 2, z: (Math.random() - 0.5) * ARENA.hd * 2, y: 0.4 + Math.random() * 2.2, s: 0.2 + Math.random() * 0.4, p: Math.random() * 6 });
  const motes = new THREE.Points((() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(motePos, 3)); return g; })(), new THREE.PointsMaterial({ map: A.softGlow(), color: '#fff3c4', size: 0.16, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }));
  motes.frustumCulled = false; scene.add(motes);

  // cover: trimmed hedges with pillars; banded crates and mossy rocks (ours); bushes, fence and trees from the orchard kit
  const boxNodes = new Map<number, THREE.Object3D>();
  const layoutBoxes = new BrawlSim([], [], 1).boxes; // the map is fixed: build it before the match
  scene.add(A.hedgeRun(layoutBoxes.filter((b) => b.kind === 'wall').map((b) => ({ x: b.x, z: b.z, w: b.hw * 2, d: b.hd * 2 })), 1.4, shadows));
  for (const b of layoutBoxes) {
    if (b.kind === 'crate') { const o = A.crateModel(b.hw * 2, shadows); o.position.set(b.x, 0, b.z); o.rotation.y = (b.id % 4) * Math.PI / 2 + ((b.id * 7) % 5 - 2) * 0.03; scene.add(o); boxNodes.set(b.id, o); }
    else if (b.kind === 'rock') { const o = A.coverRock(b.id, b.hw, b.hd, shadows); o.position.set(b.x, 0, b.z); o.rotation.y = b.id; scene.add(o); }
  }
  const fit = (o: THREE.Object3D, k: Kit, name: string, w: number, h?: number) => { const sz = k.size(name).getSize(new THREE.Vector3()); const s = h ? Math.min(w / Math.max(sz.x, sz.z), h / sz.y) : w / Math.max(sz.x, sz.z); o.scale.setScalar(s); return o; };
  type BushG = { box: Box; g: THREE.Group; holders: THREE.Object3D[]; rustle: number; leafT: number; phase: number };
  const bushGroups: BushG[] = [];
  let dressG: THREE.Group | null = null;
  const dress = (k: Kit | null) => {
    if (dressG) scene.remove(dressG); const dg = new THREE.Group(); scene.add(dg); dressG = dg; bushGroups.length = 0;
    for (const b of layoutBoxes) {
      if (b.kind !== 'bush') continue;
      const g = new THREE.Group(); const holders: THREE.Object3D[] = []; const nx = Math.max(1, Math.round(b.hw * 2 / 0.95)), nz = Math.max(1, Math.round(b.hd * 2 / 0.95));
      for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
        const x = b.x - b.hw + (i + 0.5) * (b.hw * 2 / nx), z = b.z - b.hd + (j + 0.5) * (b.hd * 2 / nz);
        let o: THREE.Object3D; if (k) { const name = k.has('bush_flowers') ? 'bush_flowers' : 'bush'; /* the plain kit bush is a red-leaf one */ o = fit(k.clone(name, { shadow: false }), k, name, 1.3, 1.2); }
        else { o = new THREE.Mesh(new THREE.IcosahedronGeometry(0.62, 1), std('#4f9e3f', 0.85)); o.position.y = 0.5; o.scale.y = 0.85; }
        const holder = new THREE.Group(); holder.add(o); holder.position.set(x + Math.sin(i * 3 + j) * 0.1, 0, z + Math.cos(i + j * 2) * 0.1); holder.rotation.y = i * 1.7 + j; g.add(holder); holders.push(holder);
      }
      dg.add(g); bushGroups.push({ box: b, g, holders, rustle: 0, leafT: 0, phase: b.id * 1.3 });
    }
    // a fence round the arena (outside the stone curb), trees and flowers beyond it
    const FX = ARENA.hw + 1.25, FZ = ARENA.hd + 1.25;
    if (k && k.has('fence')) {
      const sz = k.size('fence').getSize(new THREE.Vector3()); const L = Math.max(sz.x, sz.z) * 0.95; const spots: { x: number; z: number; rot: number }[] = []; const along = sz.x >= sz.z ? 0 : Math.PI / 2;
      for (let x = -FX + L / 2; x < FX; x += L) for (const z of [-FZ, FZ]) spots.push({ x, z, rot: along });
      for (let z = -FZ + L / 2; z < FZ; z += L) for (const x of [-FX, FX]) spots.push({ x, z, rot: along + Math.PI / 2 });
      dg.add(k.scatter('fence', spots, { shadow: shadows }));
      const outside: { x: number; z: number; rot: number; s: number }[] = []; for (let i = 0; i < (mobile ? 12 : 28); i++) { const side = i % 4; const t = ((i * 37) % 100) / 100; const x = side < 2 ? (side ? 1 : -1) * (ARENA.hw + 6.8 + (i % 3) * 1.3) : (t - 0.5) * (ARENA.hw * 2 + 16); const z = side < 2 ? (t - 0.5) * (ARENA.hd * 2 + 14) : (side === 2 ? 1 : -1) * (ARENA.hd + 6.8 + (i % 3) * 1.3); outside.push({ x, z, rot: i, s: 0.8 + (i % 3) * 0.12 }); }
      for (const [n, name] of (['tree_1', 'tree_2', 'tree_3', 'pine_1'] as const).entries()) if (k.has(name)) dg.add(k.scatter(name, outside.filter((_, i) => i % 4 === n), { shadow: shadows }));
      if (k.has('flowers_a')) { const fl: { x: number; z: number; rot: number; s: number }[] = []; for (let i = 0; i < (mobile ? 14 : 30); i++) fl.push({ x: (i % 2 ? 1 : -1) * (ARENA.hw + 1.9 + (i % 3) * 0.35), z: -ARENA.hd + ((i * 2.37) % (ARENA.hd * 2)), rot: i, s: 0.32 }); dg.add(k.scatter('flowers_a', fl)); }
    } else for (let i = 0; i < 12; i++) { const t = tree('leafy', i, 1.1, shadows); t.position.set((i % 2 ? 1 : -1) * (ARENA.hw + 3.6), 0, -ARENA.hd + i * 2.7); dg.add(t); }
  };
  let kit: Kit | null = null; let dressed = false;
  const kitReady = Promise.race([loadKit('orchard', setup.mobile).then((k) => { kit = k; }).catch(() => { /* fallback art */ }), new Promise((r) => setTimeout(r, 8000))]);
  // dress with the kit once it's here; on a slow connection the hand-made stand-ins come first and the kit replaces them when it lands
  let dressedWithKit = false;
  const redress = () => { dress(kit); dressedWithKit = !!kit; };
  void kitReady.then(() => { if (!dressed) { dressed = true; redress(); } });
  void loadKit('orchard', setup.mobile).then((k) => { kit = k; if (dressed && !dressedWithKit) redress(); }).catch(() => { /* keep the stand-ins */ });
  const glbReady = Promise.race([loadFuzzyGlb().catch(() => null), new Promise((r) => setTimeout(r, 6000))]);

  // ------------------------------------------------------------------ light particles: stars, sparks, trail dots, flashes
  const glowTex = A.softGlow();
  type Dot = { s: THREE.Sprite; vx: number; vy: number; vz: number; life: number; max: number; size: number; grow: number; grav: number; spin: number };
  const dots: Dot[] = []; const DOT_CAP = mobile ? 130 : 280;
  const addDot = (x: number, y: number, z: number, vx: number, vy: number, vz: number, color: string, size: number, max: number, tex: THREE.Texture = glowTex, grow = -0.6, grav = 0, spin = 0) => {
    if (dots.length >= DOT_CAP) return;
    const m = new THREE.SpriteMaterial({ map: tex, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const s = new THREE.Sprite(m); s.position.set(x, y, z); s.scale.setScalar(size); s.renderOrder = 3; scene.add(s); dots.push({ s, vx, vy, vz, life: 0, max, size, grow, grav, spin });
  };
  const tickDots = (dt: number) => {
    for (let i = dots.length - 1; i >= 0; i--) {
      const d = dots[i]; d.life += dt; const k = d.life / d.max;
      if (k >= 1) { scene.remove(d.s); (d.s.material as THREE.SpriteMaterial).dispose(); dots.splice(i, 1); continue; }
      d.vy -= d.grav * dt; d.s.position.x += d.vx * dt; d.s.position.y = Math.max(0.05, d.s.position.y + d.vy * dt); d.s.position.z += d.vz * dt;
      const m = d.s.material as THREE.SpriteMaterial; m.opacity = 1 - k * k; m.rotation += d.spin * dt; d.s.scale.setScalar(Math.max(0.01, d.size * (1 + d.grow * k)));
    }
  };
  const burst = (x: number, z: number, color: string, n: number, big = false) => {
    for (let i = 0; i < n; i++) { const an = Math.random() * Math.PI * 2, sp = (big ? 3 : 1.8) + Math.random() * (big ? 4 : 2.6); addDot(x, 0.75, z, Math.cos(an) * sp, 1 + Math.random() * 2.4, Math.sin(an) * sp, i % 3 ? color : '#ffffff', big ? 0.46 : 0.3, 0.5 + Math.random() * 0.25, A.starTex(), -0.5, 8, (Math.random() - 0.5) * 8); }
    addDot(x, 0.75, z, 0, 0, 0, '#ffffff', big ? 2.4 : 1.4, 0.2, glowTex, 0.7);
  };

  // ------------------------------------------------------------------ fighters (built when the match starts — your role is picked first)
  type FNode = { f: Fighter; fig: ReturnType<typeof a.figure>; ring: THREE.Mesh; glow: THREE.Mesh; bar: THREE.Sprite; barCv: HTMLCanvasElement; barKey: string; gun: THREE.Group; tip: THREE.Mesh; bubble: THREE.Mesh; ko: number; pop: number; recoil: number; face: number; hit: number };
  const fnodes: FNode[] = [];
  const bubbleGeo = new THREE.SphereGeometry(0.95, 20, 14);
  const BW = 256, BH = 96;
  const makeBar = () => { const c = document.createElement('canvas'); c.width = BW; c.height = BH; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true })); const k = portrait ? 2.5 : 2.25; s.scale.set(k, k * BH / BW, 1); s.renderOrder = 5; return { s, c }; };
  const drawBar = (n: FNode) => {
    const f = n.f; const key = `${Math.ceil(f.hp)}|${f.you ? Math.floor(f.ammo * 4) : 0}|${f.alive}|${f.hidden}|${f.shield > 0}|${f.charge >= 1}`; if (key === n.barKey) return; n.barKey = key;
    const g = n.barCv.getContext('2d')!; g.clearRect(0, 0, BW, BH); const map = (n.bar.material as THREE.SpriteMaterial).map!; if (!f.alive) { map.needsUpdate = true; return; }
    const col = f.you ? '#43c95a' : TEAM[f.team];
    // name chip
    const label = f.you ? 'YOU' : f.name.toUpperCase(); g.font = '800 22px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; const tw = Math.min(190, g.measureText(label).width + 30);
    g.fillStyle = 'rgba(14,22,40,.72)'; g.beginPath(); g.roundRect(BW / 2 - tw / 2, 4, tw, 28, 14); g.fill(); g.fillStyle = col; g.beginPath(); g.roundRect(BW / 2 - tw / 2, 4, 26, 28, 14); g.fill();
    g.fillStyle = '#ffffff'; g.fillText(label, BW / 2 + 10, 19);
    // health: a dark pill with a white rim, a glossy fill and quarter ticks
    const w = 200, x = (BW - w) / 2, y = 38, h = 22, k = Math.max(0, f.hp / f.maxHp);
    g.fillStyle = 'rgba(14,22,40,.78)'; g.beginPath(); g.roundRect(x - 4, y - 4, w + 8, h + 8, 14); g.fill();
    const grad = g.createLinearGradient(0, y, 0, y + h); grad.addColorStop(0, '#ffffff'); grad.addColorStop(0.18, col); grad.addColorStop(1, col);
    g.fillStyle = grad; g.beginPath(); g.roundRect(x, y, Math.max(h * 0.6, w * k), h, 11); g.fill();
    g.fillStyle = 'rgba(255,255,255,.28)'; g.beginPath(); g.roundRect(x + 3, y + 2, Math.max(4, w * k - 6), 5, 3); g.fill();
    g.strokeStyle = 'rgba(14,22,40,.35)'; g.lineWidth = 2; for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(x + w * i / 4, y + 2); g.lineTo(x + w * i / 4, y + h - 2); g.stroke(); }
    g.strokeStyle = f.shield > 0 ? '#bfe6ff' : 'rgba(255,255,255,.9)'; g.lineWidth = f.shield > 0 ? 4 : 2.5; g.beginPath(); g.roundRect(x - 1, y - 1, w + 2, h + 2, 12); g.stroke();
    if (f.you) { for (let i = 0; i < AMMO; i++) { const fill = Math.max(0, Math.min(1, f.ammo - i)); const px = x + i * (w / AMMO) + 3, pw = w / AMMO - 6; g.fillStyle = 'rgba(14,22,40,.7)'; g.beginPath(); g.roundRect(px, 68, pw, 12, 6); g.fill(); g.fillStyle = fill >= 1 ? '#ffb02e' : '#b78a3c'; g.beginPath(); g.roundRect(px, 68, Math.max(5, pw * fill), 12, 6); g.fill(); } }
    if (f.hidden && f.team === 0) { g.font = '700 16px system-ui, sans-serif'; g.fillStyle = '#c9f5c0'; g.fillText('hidden', BW / 2, 88); }
    map.needsUpdate = true;
  };
  const makeFighter = (f: Fighter) => {
    const fig = a.figure(f.skin, FR);
    const teamCol = f.you ? '#43c95a' : TEAM[f.team];
    const ring = new THREE.Mesh(new THREE.RingGeometry(FR + 0.12, FR + 0.27, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: teamCol, transparent: true, opacity: 0.95, depthWrite: false })); ring.position.y = 0.035; fig.group.add(ring);
    const glow = new THREE.Mesh(new THREE.CircleGeometry(FR * 2.3, 28).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: glowTex, color: teamCol, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending })); glow.position.y = 0.03; fig.group.add(glow);
    // a blaster held at the side, in the role colour (equipment only — the Fuzzy itself is untouched)
    const gun = new THREE.Group(); const body = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.42, 10).rotateX(Math.PI / 2), std('#f4efe6', 0.4)); gun.add(body);
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.095, 0.025, 6, 14), std(ROLE_COLOR[f.role], 0.4)); band.position.z = 0.05; gun.add(band);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), new THREE.MeshStandardMaterial({ color: ROLE_COLOR[f.role], emissive: ROLE_COLOR[f.role], emissiveIntensity: 0.8 })); tip.position.z = 0.24; gun.add(tip);
    if (f.role === 'guard') { const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.05, 18).rotateZ(Math.PI / 2), std(ROLE_COLOR.guard, 0.4)); sh.position.set(-0.62, 0.55, 0.12); fig.group.add(sh); }
    if (f.role === 'bloom') { const fl = new THREE.Group(); for (let i = 0; i < 6; i++) { const p = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), std('#ffffff', 0.6)); p.position.set(Math.cos(i) * 0.09, 0, Math.sin(i) * 0.09); p.scale.y = 0.4; fl.add(p); } const c = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), std('#ffd34a', 0.5)); fl.add(c); fl.position.set(0.15, 1.08, 0); fig.group.add(fl); }
    if (f.role === 'zip') { const bolt = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.28, 4), new THREE.MeshStandardMaterial({ color: ROLE_COLOR.zip, emissive: '#ff9f00', emissiveIntensity: 0.4 })); bolt.position.set(0, 0.62, -0.42); bolt.rotation.x = -0.5; fig.group.add(bolt); }
    gun.position.set(0.5, 0.44, 0.16); fig.group.add(gun);
    const bubble = new THREE.Mesh(bubbleGeo, new THREE.MeshStandardMaterial({ color: '#bfe6ff', transparent: true, opacity: 0.3, roughness: 0.05, emissive: TEAM[f.team], emissiveIntensity: 0.3, depthWrite: false })); bubble.position.y = 0.58; bubble.visible = false; fig.group.add(bubble);
    const { s: bar, c: barCv } = makeBar(); scene.add(bar);
    const n: FNode = { f, fig, ring, glow, bar, barCv, barKey: '', gun, tip, bubble, ko: -1, pop: -1, recoil: 0, face: f.face, hit: 0 };
    fig.group.position.set(f.x, 0, f.z); fnodes.push(n); return n;
  };

  // ------------------------------------------------------------------ bolts, rings, hearts, aim line + reticle
  type Bolt = { halo: THREE.Sprite; core: THREE.Sprite; trail: THREE.Mesh; acc: number; mine: boolean };
  const boltHalo = [0, 1].map((t) => new THREE.SpriteMaterial({ map: glowTex, color: BOLT[t], transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  const boltCore = new THREE.SpriteMaterial({ map: glowTex, color: '#ffffff', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const trailMat = [0, 1].map((t) => new THREE.MeshBasicMaterial({ map: A.streakTex(), color: BOLT[t], transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending }));
  const trailGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const bolts = new Map<number, Bolt>();
  const rings: { m: THREE.Mesh; t: number; dur: number; to: number }[] = [];
  const shock = (x: number, z: number, color: string, to: number, dur = 0.4) => { const m = new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending })); m.position.set(x, 0.12, z); scene.add(m); rings.push({ m, t: 0, dur, to }); };
  const ghosts: { s: THREE.Sprite; t: number }[] = [];
  const ghost = (x: number, z: number, color: string) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, opacity: 0.7, depthWrite: false })); s.position.set(x, 0.55, z); s.scale.setScalar(1.2); scene.add(s); ghosts.push({ s, t: 0 }); };
  const heartShape = new THREE.Shape(); heartShape.moveTo(0, -0.18); heartShape.bezierCurveTo(-0.32, 0.05, -0.18, 0.3, 0, 0.14); heartShape.bezierCurveTo(0.18, 0.3, 0.32, 0.05, 0, -0.18);
  const heartGeo = new THREE.ExtrudeGeometry(heartShape, { depth: 0.08, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 2 }); heartGeo.center();
  const heartMat = new THREE.MeshStandardMaterial({ color: '#ff5a7a', emissive: '#d6336c', emissiveIntensity: 0.4, roughness: 0.3 });
  const hearts = new Map<number, THREE.Mesh>();
  // the aim line: a flowing dashed streak from you to where your shot will go; the reticle sits on the locked enemy
  const aimTex = (() => { const c = document.createElement('canvas'); c.width = 64; c.height = 16; const g = c.getContext('2d')!; g.fillStyle = '#ffffff'; g.beginPath(); g.roundRect(4, 4, 34, 8, 4); g.fill(); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const aimMat = new THREE.MeshBasicMaterial({ map: aimTex, color: '#ffffff', transparent: true, opacity: 0.5, depthWrite: false });
  const aimLine = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), aimMat); aimLine.position.y = 0.05; aimLine.visible = false; aimLine.renderOrder = 2; scene.add(aimLine);
  const reticle = new THREE.Group(); reticle.visible = false; reticle.renderOrder = 4;
  const retMat = new THREE.MeshBasicMaterial({ color: '#ffd34a', transparent: true, opacity: 0.95, depthWrite: false, depthTest: false });
  { const ringG = new THREE.Mesh(new THREE.RingGeometry(0.6, 0.7, 40).rotateX(-Math.PI / 2), retMat); reticle.add(ringG); for (let i = 0; i < 4; i++) { const tk = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.1).rotateX(-Math.PI / 2), retMat); const an = i * Math.PI / 2; tk.position.set(Math.cos(an) * 0.95, 0, Math.sin(an) * 0.95); tk.rotation.y = -an; reticle.add(tk); } const dot = new THREE.Mesh(new THREE.CircleGeometry(0.09, 12).rotateX(-Math.PI / 2), retMat); reticle.add(dot); reticle.position.y = 0.06; scene.add(reticle); }
  const burstMark = new THREE.Mesh(new THREE.RingGeometry(SPECIAL.burst.r - 0.08, SPECIAL.burst.r, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: ROLE_COLOR.burst, transparent: true, opacity: 0.45, depthWrite: false })); burstMark.position.y = 0.04; burstMark.visible = false; scene.add(burstMark);
  let shake = 0, lastLock = -1, hitAt = 0, zoomK = 0;

  // ------------------------------------------------------------------ HUD extras: FIRE + special buttons, mute, ring status, respawn note
  const hud = a.hud;
  const touch = setup.mobile || matchMedia('(pointer: coarse)').matches;
  const fireBtn = document.createElement('button'); fireBtn.type = 'button'; fireBtn.className = 'br-fire'; fireBtn.setAttribute('aria-label', 'Fire — hold to shoot, drag to aim yourself');
  fireBtn.innerHTML = '<i></i><svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="12" fill="none" stroke="currentColor" stroke-width="4"/><circle cx="24" cy="24" r="3.5" fill="currentColor"/><path d="M24 3v9M24 36v9M3 24h9M36 24h9" stroke="currentColor" stroke-width="4" stroke-linecap="round"/></svg><small>FIRE</small>'; hud.append(fireBtn);
  const special = document.createElement('button'); special.type = 'button'; special.className = 'br-special'; special.innerHTML = `<i></i><span>★</span><small>SPECIAL${touch ? '' : ' · E'}</small>`; hud.append(special);
  const muteBtn = document.createElement('button'); muteBtn.type = 'button'; muteBtn.className = 'ob-mute br-mute'; hud.append(muteBtn);
  const paintMute = () => { muteBtn.textContent = muted ? '🔇' : '🔊'; muteBtn.classList.toggle('off', muted); muteBtn.setAttribute('aria-label', muted ? 'Sound off' : 'Sound on'); };
  muteBtn.addEventListener('click', (e) => { e.stopPropagation(); muted = !muted; setup.sound = muted ? false : soundWanted; try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch { /* ignore */ } paintMute(); });
  paintMute();
  const ringPill = document.createElement('div'); ringPill.className = 'br-ring'; hud.append(ringPill);
  const downNote = document.createElement('div'); downNote.className = 'br-down'; downNote.hidden = true; hud.append(downNote);
  const hurt = document.createElement('div'); hurt.className = 'br-hurt'; a.root.append(hurt);
  const firstTo = document.createElement('small'); firstTo.className = 'br-first'; firstTo.textContent = `first to ${WIN_AT}`; hud.append(firstTo);

  // ------------------------------------------------------------------ controls
  const ray = new THREE.Raycaster(); const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.5); const tmpV = new THREE.Vector3();
  const groundAt = (cx: number, cy: number): THREE.Vector3 | null => { const r = a.renderer.domElement.getBoundingClientRect(); ray.setFromCamera(new THREE.Vector2(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1), camera); return ray.ray.intersectPlane(ground, tmpV) ? tmpV.clone() : null; };
  const ctl = { mouse: null as THREE.Vector3 | null, mouseAt: 0, mouseDown: false, space: false, fireHeld: false, fireAim: null as V2 | null, fireUntil: 0, pendAim: null as V2 | null, specialQ: false, move: { x: 0, z: 0 }, stickAim: null as V2 | null, lastShot: -9, emptyAt: 0 };
  const mouseVec = (y: Fighter): V2 | null => { if (!ctl.mouse) return null; const dx = ctl.mouse.x - y.x, dz = ctl.mouse.z - y.z; return Math.hypot(dx, dz) > 0.9 ? { x: dx, z: dz } : null; };
  a.root.style.touchAction = 'none';
  const blocked = (e: Event) => !!(e.target as HTMLElement).closest('button, .race-pause, .mg-btn, .mg-intro, .race-paused, .adv-results');
  // computers: aim follows the pointer (snapping onto enemies near it); click / hold = fire; right-click, E or Shift = special; Space = auto-aim fire
  a.root.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') { ctl.mouse = groundAt(e.clientX, e.clientY); ctl.mouseAt = performance.now(); } });
  a.root.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse' || blocked(e) || !a.started() || a.paused()) return; ctl.mouse = groundAt(e.clientX, e.clientY); ctl.mouseAt = performance.now(); if (e.button === 2) ctl.specialQ = true; else if (e.button === 0) ctl.mouseDown = true; });
  addEventListener('pointerup', (e) => { if (e.pointerType === 'mouse' && e.button === 0) ctl.mouseDown = false; });
  a.root.addEventListener('contextmenu', (e) => e.preventDefault());
  const onKeyDown = (e: KeyboardEvent) => { if (e.key === ' ' && a.started() && !a.paused()) { e.preventDefault(); ctl.space = true; } };
  const onKeyUp = (e: KeyboardEvent) => { if (e.key === ' ') ctl.space = false; };
  addEventListener('keydown', onKeyDown); addEventListener('keyup', onKeyUp);
  a.onAction(() => { if (a.started() && !a.paused()) ctl.specialQ = true; });
  special.addEventListener('pointerdown', (e) => { e.stopPropagation(); e.preventDefault(); if (a.started() && !a.paused()) ctl.specialQ = true; });
  // the FIRE button: hold = keep shooting (auto-aim); drag it away from where you pressed to aim by hand
  { let id = -1, ox = 0, oy = 0;
    const upd = (e: PointerEvent) => { const dx = e.clientX - ox, dy = e.clientY - oy; ctl.fireAim = Math.hypot(dx, dy) > 28 ? { x: dx, z: dy } : null; };
    fireBtn.addEventListener('pointerdown', (e) => { e.stopPropagation(); e.preventDefault(); if (!a.started() || a.paused() || id !== -1) return; id = e.pointerId; const r = fireBtn.getBoundingClientRect(); ox = r.left + r.width / 2; oy = r.top + r.height / 2; ctl.fireHeld = true; fireBtn.classList.add('on'); try { fireBtn.setPointerCapture(e.pointerId); } catch { /* ignore */ } upd(e); });
    fireBtn.addEventListener('pointermove', (e) => { if (e.pointerId === id) { e.stopPropagation(); upd(e); } });
    const end = (e: PointerEvent) => { if (e.pointerId !== id) return; id = -1; ctl.fireHeld = false; ctl.fireAim = null; fireBtn.classList.remove('on'); };
    fireBtn.addEventListener('pointerup', end); fireBtn.addEventListener('pointercancel', end); }
  // phones: a floating move stick on the left half; the right half is an OPTIONAL aim stick (drag to aim, let go to shoot; a tap shoots at the best enemy)
  type Stick = { id: number; ox: number; oy: number; x: number; y: number; t: number; el: HTMLDivElement; knob: HTMLDivElement; dragged: boolean };
  const R = 56; let moveStick: Stick | null = null, aimStick: Stick | null = null;
  const stickEl = (cls: string) => { const el = document.createElement('div'); el.className = `joy br-joy ${cls}`; el.hidden = true; const k = document.createElement('div'); k.className = 'joy-knob'; el.append(k); a.root.append(el); return { el, knob: k }; };
  const mEl = stickEl('move'), aEl = stickEl('aim');
  const homeHint = document.createElement('div'); homeHint.className = 'br-sticks'; homeHint.innerHTML = '<span>Move</span>'; if (touch) a.root.append(homeHint);
  // the sticks are read in the capture phase and kept from the kit's own (hidden) touch stick
  a.root.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' || blocked(e)) return; e.stopPropagation(); if (!a.started() || a.paused()) return;
    const left = e.clientX < innerWidth / 2; const parts = left ? mEl : aEl;
    const st: Stick = { id: e.pointerId, ox: e.clientX, oy: e.clientY, x: 0, y: 0, t: e.timeStamp, el: parts.el, knob: parts.knob, dragged: false };
    if (left) { if (moveStick) return; moveStick = st; } else { if (aimStick) return; aimStick = st; }
    st.el.style.left = `${e.clientX}px`; st.el.style.top = `${e.clientY}px`; st.el.hidden = false; st.knob.style.transform = 'translate(-50%, -50%)'; homeHint.classList.add('gone');
    try { a.root.setPointerCapture(e.pointerId); } catch { /* ignore */ }
  }, true);
  a.root.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'mouse') return; if (moveStick || aimStick) e.stopPropagation();
    for (const st of [moveStick, aimStick]) { if (!st || st.id !== e.pointerId) continue; let dx = e.clientX - st.ox, dy = e.clientY - st.oy; const l = Math.hypot(dx, dy); if (l > R) { dx *= R / l; dy *= R / l; } st.x = dx / R; st.y = dy / R; if (l > 16) st.dragged = true; st.knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`; }
    if (moveStick) ctl.move = { x: moveStick.x, z: moveStick.y };
    if (aimStick && aimStick.dragged) ctl.stickAim = { x: aimStick.x, z: aimStick.y };
  }, true);
  const release = (e: PointerEvent) => {
    if (e.pointerType === 'mouse') return; if (moveStick || aimStick) e.stopPropagation();
    if (moveStick && moveStick.id === e.pointerId) { moveStick.el.hidden = true; moveStick = null; ctl.move = { x: 0, z: 0 }; }
    if (aimStick && aimStick.id === e.pointerId) { const st = aimStick; st.el.hidden = true; aimStick = null; ctl.pendAim = st.dragged && Math.hypot(st.x, st.y) > 0.25 ? { x: st.x, z: st.y } : null; ctl.fireUntil = performance.now() + 450; /* a tap = a shot at the best enemy */ ctl.stickAim = null; }
  };
  a.root.addEventListener('pointerup', release, true); a.root.addEventListener('pointercancel', release, true);
  a.tip('go', touch ? 'Left thumb moves · hold FIRE — your Fuzzy aims for you (drag FIRE to aim yourself) · ★ = special' : 'WASD move · click shoots where you point (it snaps onto enemies) · Space = auto-aim · E or right-click = special', 6200);

  // ------------------------------------------------------------------ the match
  let started = false;
  const begin = () => {
    if (started) return; started = true; a.root.classList.add('br-live');
    const you: Roster = { name: setup.you.name || 'You', skin: setup.you.skin, role, you: true };
    const l = lineup(role);
    const allies: Roster[] = l.allies.map((r, i) => ({ name: i === 0 ? (setup.host || 'Pom') : 'Mallow', skin: ALLY_SKINS[i], role: r, skill: SKILLS.ally[i] }));
    const foes: Roster[] = l.foes.map((r, i) => ({ name: FOE_NAMES[i], skin: FOE_SKINS[i], role: r, skill: SKILLS.foe[i] }));
    sim = new BrawlSim([you, ...allies], foes, setup.seed);
    // wait (briefly) for the model so everyone is the owner's Fuzzy
    void glbReady.then(() => { for (const f of sim!.fighters) makeFighter(f); sim!.start(); });
    a.tip('ring', 'Stand in the Sunflower ring with no pink Fuzzy inside to score', 5200);
  };
  const handle = (e: BrawlEvent) => {
    const s = sim!; const youF = s.you!; const n = e.f ? fnodes[e.f.id] : undefined;
    switch (e.kind) {
      case 'shot': if (e.f && n) {
        n.recoil = 1; play(() => bs.shot(e.f!.role, e.f!.you));
        const tx = e.f.x + Math.sin(e.f.face) * 0.75, tz = e.f.z + Math.cos(e.f.face) * 0.75; addDot(tx, 0.58, tz, 0, 0, 0, BOLT[e.f.team], e.f.you ? 1.3 : 0.9, 0.14, glowTex, 0.8); addDot(tx, 0.58, tz, 0, 0, 0, '#ffffff', 0.5, 0.1, glowTex, 0.5);
      } break;
      case 'hit': if (e.f && n) {
        n.hit = 1; n.fig.squash = Math.max(n.fig.squash, 0.35); const mine = e.by?.you; const onMe = e.f.you;
        burst(e.f.x, e.f.z, e.by ? BOLT[e.by.team] : '#ffffff', mine ? 6 : 4); addDot(e.f.x, 0.7, e.f.z, 0, 0, 0, '#ffffff', 1.7, 0.16, glowTex, 0.5);
        a.float(e.f.x, 1.95, e.f.z, `−${e.dmg}`, onMe ? 'warn' : mine ? 'gold' : '');
        if (onMe) { play(bs.hurt); shake = Math.max(shake, 0.28); hurt.classList.remove('on'); void hurt.offsetWidth; hurt.classList.add('on'); } else { play(() => bs.hit(!!mine)); if (mine) { shake = Math.max(shake, 0.1); hitAt = time.value; } }
      } break;
      case 'ko': if (e.f && n) {
        n.ko = 0; burst(e.f.x, e.f.z, '#ffd34a', 14, true); shock(e.f.x, e.f.z, TEAM[e.f.team], 3.2, 0.5); a.puff(new THREE.Vector3(e.f.x, 0.6, e.f.z), 8, '#ffffff');
        for (let i = 0; i < 5; i++) { const an = (i / 5) * Math.PI * 2; addDot(e.f.x + Math.cos(an) * 0.5, 1.2, e.f.z + Math.sin(an) * 0.5, Math.cos(an) * 0.5, 1.6, Math.sin(an) * 0.5, '#ffe27a', 0.4, 1.0, A.starTex(), -0.4, 0, 3); }
        if (e.f.you) { play(bs.youKO); a.banner(`Knocked out by ${e.by?.name ?? 'a pink Fuzzy'}!`, 'warn'); shake = 0.5; }
        else if (e.by?.you) { play(() => bs.ko(true)); a.banner(`You knocked out ${e.f.name}!`, 'combo'); a.flash('KO!'); shake = Math.max(shake, 0.3); }
        else play(() => bs.ko(false));
      } break;
      case 'respawn': if (n) { n.ko = -1; n.pop = 0; if (e.f) { shock(e.f.x, e.f.z, TEAM[e.f.team], 2.6, 0.55); burst(e.f.x, e.f.z, TEAM[e.f.team], 6); } if (e.f?.you) play(bs.respawn); } break;
      case 'special': if (e.f && n) {
        const f = e.f; const mine = f.you;
        if (f.role === 'burst') { play(bs.burst); shock(f.x, f.z, ROLE_COLOR.burst, SPECIAL.burst.r * 1.05, 0.45); shock(f.x, f.z, '#ffffff', SPECIAL.burst.r * 0.7, 0.3); burst(f.x, f.z, ROLE_COLOR.burst, 16, true); shake = Math.max(shake, mine ? 0.45 : 0.2); }
        else if (f.role === 'guard') { play(bs.shield); shock(f.x, f.z, '#bfe6ff', 2.2, 0.5); }
        else if (f.role === 'zip') { play(bs.dash); for (let i = 0; i < 4; i++) setTimeout(() => ghost(f.x, f.z, ROLE_COLOR.zip), i * 40); }
        else { play(bs.heal); shock(f.x, f.z, ROLE_COLOR.bloom, SPECIAL.heal.r, 0.6); burst(f.x, f.z, '#9be29b', 10); }
        if (mine) a.banner(`${ROLE_UI[f.role].icon} ${ROLE_UI[f.role].name}!`, 'combo');
      } break;
      case 'heal': if (e.f && (e.amount ?? 0) >= 5) { a.float(e.f.x, 1.9, e.f.z, `+${e.amount}`, 'gold'); a.puff(new THREE.Vector3(e.f.x, 0.8, e.f.z), 3, '#9be29b'); } break;
      case 'wall': if (e.x !== undefined) { const c = BOLT[e.shot!.team]; for (let i = 0; i < 5; i++) { const an = Math.random() * Math.PI * 2; addDot(e.x, 0.6, e.z!, Math.cos(an) * 1.6, 1 + Math.random() * 1.4, Math.sin(an) * 1.6, c, 0.18, 0.35, glowTex, -0.4, 6); } addDot(e.x, 0.6, e.z!, 0, 0, 0, '#ffffff', 0.7, 0.12, glowTex, 0.6); a.puff(new THREE.Vector3(e.x, 0.55, e.z!), 2, '#cfe6c0'); if (e.shot?.by === youF.id) play(bs.wall); } break;
      case 'crate': if (e.box) { const o = boxNodes.get(e.box.id); if (o) o.userData.shake = 1; a.chips(new THREE.Vector3(e.box.x, 0.6, e.box.z), 3); play(bs.crate); } break;
      case 'crateBreak': if (e.box) { const o = boxNodes.get(e.box.id); if (o) o.visible = false; a.chips(new THREE.Vector3(e.box.x, 0.5, e.box.z), 16); a.puff(new THREE.Vector3(e.box.x, 0.4, e.box.z), 6, '#e6d6b0'); burst(e.box.x, e.box.z, '#ffd9a0', 6); play(bs.crateBreak); } break;
      case 'heart': if (e.pickup) { if (e.f) { const m = hearts.get(e.pickup.id); if (m) { scene.remove(m); hearts.delete(e.pickup.id); } play(bs.heart); burst(e.pickup.x, e.pickup.z, '#ff8fb0', 6); } else { const m = new THREE.Mesh(heartGeo, heartMat); m.position.set(e.pickup.x, 0.6, e.pickup.z); m.castShadow = shadows; scene.add(m); hearts.set(e.pickup.id, m); } } break;
      case 'zoneTick': { const ours = e.team === youF.team; play(() => bs.zone(ours)); a.float(0, 1.4, 0, ours ? '+1 ring' : 'Pink +1', ours ? 'gold' : 'warn'); burst(0, 0, ours ? TEAM[0] : TEAM[1], 12, true); break; }
      case 'contest': play(bs.contest); break;
      case 'lead': play(() => bs.lead(e.team === youF.team)); a.banner(e.team === youF.team ? 'Blue team leads!' : 'Pink team leads!', e.team === youF.team ? 'combo' : 'warn'); break;
      case 'overtime': a.banner('Sudden overtime — next point wins!', 'warn'); break;
      case 'warn': a.warn(e.n!); break;
      case 'win': play(e.team === undefined ? bs.lose : e.team === youF.team ? bs.win : bs.lose); break;
    }
  };
  // the keyboard stick the kit reads, for the aim guide (the frame has no `input`)
  const input0 = { get x() { return a.ctl.read().x; }, get z() { return a.ctl.read().z; } };
  a.run((dt, input) => {
    if (!sim || sim.state !== 'playing') return;
    const y = sim.you!; const now = performance.now();
    // what the buttons mean right now: FIRE held (auto-aim, or the drag), a buffered tap / stick release, mouse click, Space
    let aim: V2 | null = null; let fire = false;
    if (ctl.fireHeld) { fire = true; aim = ctl.fireAim; }
    else if (now < ctl.fireUntil) { fire = true; aim = ctl.pendAim; }
    else if (ctl.mouseDown) { fire = true; aim = mouseVec(y); }
    else if (ctl.space) { fire = true; aim = null; }
    if (y.shotAt !== ctl.lastShot) { ctl.lastShot = y.shotAt; if (!ctl.fireHeld && now < ctl.fireUntil) ctl.fireUntil = 0; } // a buffered tap is spent once the shot is out
    if (fire && y.alive && y.ammo < 1 && now - ctl.emptyAt > 350) { ctl.emptyAt = now; play(bs.empty); }
    const spec = ctl.specialQ; ctl.specialQ = false;
    const kx = input.x || 0, kz = input.z || 0; const mv = Math.hypot(kx, kz) > 0.1 ? { x: kx, z: kz } : ctl.move;
    sim.step(dt, { move: mv, aim, fire, special: spec && !!y.alive });
    for (const e of sim.events) handle(e);
  }, (dt) => {
    if (!sim) return;
    const s = sim; const y = s.you!;
    clouds.update(time.value); for (const t of torches) A.tickTorch(t, time.value); for (const b of banners) A.waveBanner(b, time.value);
    gates.forEach((g, i) => A.tickGate(g, time.value, s.zone.team === i ? 0.4 : 0));
    for (const g of scene.children) if (g.userData.flag) g.rotation.y = Math.sin(time.value * 2 + g.position.x) * 0.25;
    for (let i = 0; i < MOTES; i++) { const m = moteSeed[i]; motePos[i * 3] = m.x + Math.sin(time.value * m.s + m.p) * 0.8; motePos[i * 3 + 1] = m.y + Math.sin(time.value * m.s * 1.7 + m.p) * 0.35; motePos[i * 3 + 2] = m.z + Math.cos(time.value * m.s * 0.8 + m.p) * 0.8; }
    (motes.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    tickDots(dt);
    // fighters
    for (const n of fnodes) {
      const f = n.f; const g = n.fig.group;
      const enemyHidden = f.team !== y.team && f.alive && !s.sees(y, f);
      if (n.ko >= 0) { n.ko += dt; const k = Math.min(1, n.ko / 0.55); g.visible = k < 1; g.position.y = Math.sin(k * Math.PI) * 1.2; g.rotation.y += dt * 18; g.scale.setScalar(Math.max(0.01, 1 - k)); }
      else {
        g.visible = !enemyHidden; g.position.set(lerp(g.position.x, f.x, Math.min(1, dt * 20)), 0, lerp(g.position.z, f.z, Math.min(1, dt * 20)));
        let d = f.face - n.face; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; n.face += d * Math.min(1, dt * 16); g.rotation.y = n.face;
        const sp = Math.hypot(f.vx, f.vz); a.walk(n.fig, Math.min(1.5, sp / 3.5), dt);
        if (n.pop >= 0) { n.pop += dt; const k = Math.min(1, n.pop / 0.35); g.scale.setScalar(k < 1 ? 0.3 + 0.7 * (1 - Math.cos(k * Math.PI * 1.5) * Math.exp(-k * 3)) : 1); if (k >= 1) n.pop = -1; } else g.scale.setScalar(1);
        n.hit = Math.max(0, n.hit - dt * 5); n.fig.fuzzy.body.rotation.x = -n.hit * 0.3;
        n.recoil = Math.max(0, n.recoil - dt * 8); n.gun.position.z = 0.16 - n.recoil * 0.12; (n.tip.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.6 + n.recoil * 2 + (f.charge >= 1 ? Math.sin(time.value * 8) * 0.4 + 0.5 : 0);
        n.bubble.visible = f.shield > 0; if (n.bubble.visible) { n.bubble.scale.setScalar(1 + Math.sin(time.value * 6) * 0.04); (n.bubble.material as THREE.MeshStandardMaterial).opacity = f.shield < 0.8 ? 0.15 + Math.abs(Math.sin(time.value * 14)) * 0.2 : 0.3; }
        if (f.dash > 0 && Math.random() < 0.6) ghost(f.x, f.z, ROLE_COLOR.zip);
      }
      drawBar(n); n.bar.visible = f.alive && g.visible; n.bar.position.set(g.position.x, 2.0, g.position.z);
      const pulse = f.hidden ? 0.4 + Math.sin(time.value * 4) * 0.15 : f.you && f.charge >= 1 ? 0.75 + Math.sin(time.value * 9) * 0.25 : 0.95;
      (n.ring.material as THREE.MeshBasicMaterial).opacity = pulse; (n.glow.material as THREE.MeshBasicMaterial).opacity = (f.hidden ? 0.25 : 0.55) * (f.you && f.charge >= 1 ? 1.3 : 1);
    }
    // bushes: the one you're in thins out so you can still see yourself; they sway, and rustle when someone moves through
    for (const bg of bushGroups) {
      let inside = false, moving = false;
      for (const f of s.fighters) if (f.alive && Math.abs(f.x - bg.box.x) < bg.box.hw + 0.3 && Math.abs(f.z - bg.box.z) < bg.box.hd + 0.3) { inside = true; if (Math.hypot(f.vx, f.vz) > 0.8) moving = true; }
      const youIn = y.alive && Math.abs(y.x - bg.box.x) < bg.box.hw + 0.3 && Math.abs(y.z - bg.box.z) < bg.box.hd + 0.3;
      bg.g.scale.y = lerp(bg.g.scale.y, youIn ? 0.55 : 1, Math.min(1, dt * 8));
      bg.rustle = Math.max(0, bg.rustle - dt * 1.6); if (moving) bg.rustle = 1; else if (inside) bg.rustle = Math.max(bg.rustle, 0.25);
      bg.holders.forEach((h, i) => { const sway = Math.sin(time.value * 1.6 + bg.phase + i) * 0.025 + Math.sin(time.value * 26 + i * 2) * 0.06 * bg.rustle; h.rotation.z = sway; h.rotation.x = Math.cos(time.value * 1.3 + bg.phase + i * 1.4) * 0.02 + Math.cos(time.value * 31 + i) * 0.05 * bg.rustle; });
      bg.leafT -= dt; if (bg.rustle > 0.5 && bg.leafT <= 0) { bg.leafT = 0.14; a.chips(new THREE.Vector3(bg.box.x + (Math.random() - 0.5) * bg.box.hw * 2, 0.9, bg.box.z + (Math.random() - 0.5) * bg.box.hd * 2), 2, '#5fae45'); }
    }
    // bolts: a hot core, a coloured halo, a tapering streak and a trail of fading sparks
    const live = new Set<number>();
    for (const b of s.shots) {
      live.add(b.id); let v = bolts.get(b.id);
      const mine = s.fighters[b.by]?.you ?? false;
      if (!v) { const halo = new THREE.Sprite(boltHalo[b.team]); halo.scale.setScalar((b.role === 'guard' ? 0.7 : 0.95) * (mine ? 1.3 : 1)); const core = new THREE.Sprite(boltCore); core.scale.setScalar((b.role === 'guard' ? 0.3 : 0.42) * (mine ? 1.25 : 1)); const trail = new THREE.Mesh(trailGeo, trailMat[b.team]); scene.add(halo, core, trail); v = { halo, core, trail, acc: 0, mine }; bolts.set(b.id, v); }
      v.halo.position.set(b.x, 0.6, b.z); v.core.position.set(b.x, 0.6, b.z);
      const L = Math.min(2.6, b.speed * 0.17) * (mine ? 1.15 : 1), W = (b.role === 'guard' ? 0.32 : 0.46) * (mine ? 1.3 : 1);
      v.trail.scale.set(L, 1, W); v.trail.position.set(b.x - b.dx * L / 2, 0.58, b.z - b.dz * L / 2); v.trail.rotation.y = Math.atan2(-b.dz, b.dx);
      v.acc += dt; if (v.acc > 0.03) { v.acc = 0; addDot(b.x - b.dx * 0.3, 0.58, b.z - b.dz * 0.3, (Math.random() - 0.5) * 0.5, 0.2, (Math.random() - 0.5) * 0.5, BOLT[b.team], mine ? 0.34 : 0.24, 0.3, glowTex, -0.8); }
    }
    for (const [id, v] of bolts) if (!live.has(id)) { scene.remove(v.halo, v.core, v.trail); bolts.delete(id); }
    // effects
    for (let i = rings.length - 1; i >= 0; i--) { const r = rings[i]; r.t += dt; const k = Math.min(1, r.t / r.dur); r.m.scale.setScalar(0.2 + k * r.to); (r.m.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - k); if (k >= 1) { scene.remove(r.m); (r.m.geometry as THREE.BufferGeometry).dispose(); (r.m.material as THREE.Material).dispose(); rings.splice(i, 1); } }
    for (let i = ghosts.length - 1; i >= 0; i--) { const gh = ghosts[i]; gh.t += dt; (gh.s.material as THREE.SpriteMaterial).opacity = 0.7 * (1 - gh.t / 0.35); if (gh.t > 0.35) { scene.remove(gh.s); (gh.s.material as THREE.Material).dispose(); ghosts.splice(i, 1); } }
    for (const [, m] of hearts) { m.rotation.y += dt * 2.5; m.position.y = 0.6 + Math.sin(time.value * 3) * 0.08; }
    for (const [, o] of boxNodes) if (o.userData.shake) { o.userData.shake = Math.max(0, o.userData.shake - dt * 5); o.rotation.z = Math.sin(o.userData.shake * 30) * 0.06 * o.userData.shake; }
    // the ring
    const zt = s.zone.contested ? -2 : s.zone.team; const zc = zt === -2 ? '#ffd34a' : zt === -1 ? '#ffffff' : TEAM[zt];
    ringMat.color.set(zc); fillMat.color.set(zc); fillMat.opacity = zt === -1 ? 0.08 : 0.16 + Math.sin(time.value * 5) * (zt === -2 ? 0.08 : 0.03);
    const prog = zt >= 0 ? s.zone.progress[zt as 0 | 1] / ZONE.hold : 0; setArc(prog); arcMat.color.set(zt >= 0 ? TEAM[zt as 0 | 1] : '#ffffff'); zoneArc.visible = prog > 0.01;
    sunflower.rotation.y += dt * 0.15;
    ringPill.textContent = s.zone.contested ? '🌻 Ring contested!' : zt === -1 ? '🌻 Ring free — grab it' : zt === y.team ? `🌻 Blue holds the ring · ${Math.ceil(ZONE.hold - s.zone.progress[zt as 0 | 1])} s` : `🌻 Pink holds the ring · ${Math.ceil(ZONE.hold - s.zone.progress[zt as 0 | 1])} s`;
    ringPill.className = `br-ring ${zt === -2 ? 'contest' : zt === y.team ? 'ours' : zt === -1 ? '' : 'theirs'}`;
    // the aim guide: what your next shot will do — a line from you to the locked enemy (or where you point) and a reticle on the enemy
    const st = ROLES[y.role]; const mvNow = Math.hypot(input0.x, input0.z) > 0.1 ? input0 : ctl.move;
    let prevAim: V2 | null = null;
    if (ctl.fireHeld) prevAim = ctl.fireAim; else if (ctl.stickAim && Math.hypot(ctl.stickAim.x, ctl.stickAim.z) > 0.25) prevAim = ctl.stickAim;
    else if (!touch && !ctl.space && ctl.mouse && (ctl.mouseDown || performance.now() - ctl.mouseAt < 1800)) prevAim = mouseVec(y);
    const pv = y.alive ? s.aimPreview(y, mvNow, prevAim) : { x: 0, z: 1, target: null };
    const tgt = pv.target; let showLine = false, len = st.range, dx = pv.x, dz = pv.z;
    if (y.alive) {
      const pl = Math.hypot(pv.x, pv.z) || 1;
      if (tgt) { len = Math.min(st.range + 0.4, Math.hypot(pv.x, pv.z)); showLine = true; }
      else if (prevAim) { len = st.range; showLine = true; } else { len = st.range * 0.7; showLine = !touch || !!ctl.fireHeld || ctl.fireUntil > performance.now(); }
      dx = pv.x / pl; dz = pv.z / pl;
    }
    aimLine.visible = showLine && y.alive;
    if (aimLine.visible) { const sx = y.x + dx * 0.75, sz = y.z + dz * 0.75, L = Math.max(0.4, len - 0.75); aimLine.position.set(sx + dx * L / 2, 0.05, sz + dz * L / 2); aimLine.rotation.y = Math.atan2(-dz, dx); aimLine.scale.set(L, 1, st.pellets > 1 && !tgt ? 1.6 : 0.3); aimTex.repeat.set(L / 0.9, 1); aimTex.offset.x = -time.value * 1.6; aimMat.opacity = tgt ? 0.72 : prevAim ? 0.55 : 0.25; aimMat.color.set(tgt ? '#ffe27a' : '#ffffff'); }
    reticle.visible = !!tgt && y.alive;
    if (reticle.visible && tgt) {
      const f = tgt; const lx = f.x, lz = f.z; reticle.position.set(lx, 0.06, lz); const pulse = 1 + Math.sin(time.value * 7) * 0.07; const fresh = Math.max(0, 1 - (time.value - hitAt) * 4); reticle.scale.setScalar(pulse * (1 + fresh * 0.25)); reticle.rotation.y += dt * 1.6;
      if (lastLock !== tgt.id) { lastLock = tgt.id; reticle.scale.setScalar(1.8); }
    } else lastLock = -1;
    burstMark.visible = y.alive && y.role === 'burst' && y.charge >= 1; if (burstMark.visible) { burstMark.position.set(y.x, 0.04, y.z); burstMark.rotation.y += dt; }
    // HUD
    a.setScore(s.score[y.team]); a.setCount(String(s.score[y.team === 0 ? 1 : 0]), s.overtime ? 'OVERTIME' : '');
    a.setTime(s.left);
    special.classList.toggle('ready', y.charge >= 1 && y.alive); (special.querySelector('i') as HTMLElement).style.setProperty('--k', String(y.charge)); special.dataset.role = y.role; (special.querySelector('span') as HTMLElement).textContent = ROLE_UI[y.role].icon;
    (fireBtn.querySelector('i') as HTMLElement).style.setProperty('--k', String(Math.min(1, y.ammo / AMMO))); fireBtn.classList.toggle('empty', y.ammo < 1); fireBtn.classList.toggle('lock', !!tgt);
    downNote.hidden = y.alive; if (!y.alive) downNote.textContent = `Back in ${Math.max(1, Math.ceil(y.respawn))}…`;
    // camera: follow you, a look-ahead towards what you're shooting at / heading for, pulling back a little when enemies are close; shake on hits
    const fx = y.alive ? y.x : SPAWN[y.team][0].x, fz = y.alive ? y.z : SPAWN[y.team][0].z;
    let near = 99; for (const f of s.fighters) if (f.team !== y.team && f.alive && y.alive) near = Math.min(near, Math.hypot(f.x - y.x, f.z - y.z));
    zoomK = lerp(zoomK, Math.max(0, Math.min(1, (10 - near) / 6)) * (portrait ? 0.14 : 0.2), Math.min(1, dt * 2.2));
    a.cam.back = CAM.back * (1 + zoomK); a.cam.up = CAM.up * (1 + zoomK);
    const lookX = tgt ? (tgt.x - y.x) * 0.22 : y.vx * 0.3, lookZ = tgt ? (tgt.z - y.z) * 0.22 : y.vz * 0.3;
    const cx = Math.max(-ARENA.hw + (portrait ? 1.6 : 4.5), Math.min(ARENA.hw - (portrait ? 1.6 : 4.5), fx + Math.max(-2.2, Math.min(2.2, lookX)))), cz = Math.max(-ARENA.hd + 4, Math.min(ARENA.hd - 4, fz + Math.max(-2.2, Math.min(2.2, lookZ))));
    shake = Math.max(0, shake - dt); const sk = shake * 0.5;
    a.camTarget.set(lerp(a.camTarget.x, cx, Math.min(1, dt * 5)) + (sk ? (Math.random() - 0.5) * sk : 0), 0, lerp(a.camTarget.z, cz, Math.min(1, dt * 5)) + (sk ? (Math.random() - 0.5) * sk : 0));
    if (s.state === 'done') a.finish(s.result(), s.winner === y.team ? 'VICTORY!' : s.winner === -1 ? 'DRAW' : 'DEFEAT');
  });
  if (import.meta.env.DEV) (window as unknown as { __mg: unknown }).__mg = {
    id: 'brawl', get sim() { return sim; }, ctl: a.ctl, start: a.start, ready: () => !!sim && sim.state !== 'ready', role: () => role, nodes: () => fnodes.length, ctlState: ctl,
    finishNow: () => { if (sim) (sim as unknown as { state: string }).state = 'done'; },
    screenOf: (x: number, z: number) => { const v = new THREE.Vector3(x, 0.5, z).project(camera); const r = a.renderer.domElement.getBoundingClientRect(); return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height }; },
    dressed: () => dressed, kit: () => !!kit,
    aim: () => ({ line: aimLine.visible, reticle: reticle.visible, at: { x: reticle.position.x, z: reticle.position.z } }),
    pressFire: (on: boolean) => { ctl.fireHeld = on; },
    scene: () => scene,
    info: () => ({ calls: a.renderer.info.render.calls, tris: a.renderer.info.render.triangles, geos: a.renderer.info.memory.geometries, tex: a.renderer.info.memory.textures }),
  };
}
