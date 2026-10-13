/**
 * Fuzzie Brawl Arena — the 3D scene: a hedged meadow arena built from the orchard model kit (rocks, bushes, apple crates, fence,
 * trees) with hedge walls, dirt paths, two team gates and the Sunflower ring in the middle. Six Fuzzies (the owner's model,
 * unchanged — only equipment and motion around it): a team ring under each, a blaster in their role colour, a name + health bar,
 * your charges under yours. Bolts glow in team colours, hits spark and show damage numbers, knockouts spin away in a puff and
 * pop back at the gate, specials have their own effect (shockwave, bubble, dash trail, healing petals). Controls: computers =
 * WASD + mouse aim + click (hold to keep firing) + Space / right-click special; phones = a move stick (left half), an aim
 * stick (right half — drag to aim, let go to shoot, tap to auto-shoot) and a ★ special button. You pick your role on the intro
 * card. Rules: games/brawl.ts; scene, HUD, loop and chrome: land/mgScene.ts; sounds: game/brawlSounds.ts.
 */
import * as THREE from 'three';
import { createArcade, std, lerp, type MiniSetup, type MiniHooks } from '../mgScene';
import { tree, rock, hedgeWalls, groundTex } from './sceneArt';
import { loadKit, type Kit } from '../assets/kit';
import { loadFuzzyGlb } from '../../game/fuzzyGlb';
import { adventure } from '../adventures';
import { BrawlSim, ROLES, SPECIAL, ZONE, ARENA, AMMO, WIN_AT, SPAWN, type Role, type Fighter, type BrawlEvent, type Roster, type Box } from './brawl';
import { brawl as bs } from '../../game/brawlSounds';

const ROLE_KEY = 'fz.brawl.role', MUTE_KEY = 'fz.brawl.mute';
const TEAM = ['#4aa8f0', '#ff6b9a'] as const;
const BOLT = ['#9fd8ff', '#ffb1c9'] as const;
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

export function run(stage: HTMLElement, setup: MiniSetup, hooks: MiniHooks): void {
  const adv = adventure('brawl')!;
  let role: Role = 'burst'; try { const r = localStorage.getItem(ROLE_KEY) as Role | null; if (r && r in ROLES) role = r; } catch { /* private mode */ }
  let muted = false; try { muted = localStorage.getItem(MUTE_KEY) === '1'; } catch { /* ignore */ }
  const soundWanted = setup.sound; if (muted) setup.sound = false;
  const portrait = setup.mobile && innerHeight > innerWidth;
  const CAM = portrait ? { fov: 54, back: 9.5, up: 19, lookDy: -1.2, lookY: 0, lead: 0 } : { fov: 40, back: 9, up: 15.5, lookDy: -0.6, lookY: 0, lead: 0 };
  let sim: BrawlSim | null = null;
  const a = createArcade(stage, {
    cls: 'brawl', setup, adv, hooks, buttonLabel: 'Fight!',
    hud: { score: 'BLUE', count: 'PINK' },
    camera: CAM,
    world: { size: { hw: ARENA.hw + 2, hd: ARENA.hd + 2 }, path: false, fence: false, treeLine: true, flowers: 0, tufts: false, fog: ['#dcebd8', 30, 80] },
    controls: { touch: false, mouseSteer: false, actionKeys: [' ', 'e'] },
    onStart: () => begin(),
  });
  const { scene, camera, time } = a;
  const play = (f: () => void) => a.play(f);
  const shadows = !a.mobile;

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

  // ------------------------------------------------------------------ the arena
  const floor = new THREE.Group(); scene.add(floor);
  {
    // a mown lawn inside the arena, dirt paths, team gates
    const lawnT = groundTex('grass').clone(); lawnT.needsUpdate = true; lawnT.wrapS = lawnT.wrapT = THREE.RepeatWrapping; lawnT.repeat.set(ARENA.hw / 3, ARENA.hd / 3);
    const lawn = new THREE.Mesh(new THREE.PlaneGeometry(ARENA.hw * 2, ARENA.hd * 2).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: lawnT, color: '#d9f0c4', roughness: 0.95 })); lawn.position.y = 0.006; lawn.receiveShadow = true; floor.add(lawn);
    const stripeMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.05, depthWrite: false });
    for (let z = -ARENA.hd + 1.5; z < ARENA.hd; z += 3) { const st = new THREE.Mesh(new THREE.PlaneGeometry(ARENA.hw * 2, 1.5).rotateX(-Math.PI / 2), stripeMat); st.position.set(0, 0.008, z); floor.add(st); }
    const dirtT = groundTex('dirt').clone(); dirtT.needsUpdate = true; dirtT.wrapS = dirtT.wrapT = THREE.RepeatWrapping;
    const path = (x: number, z: number, w: number, d: number) => { const t = dirtT.clone(); t.needsUpdate = true; t.repeat.set(w / 3, d / 3); const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: t, roughness: 0.95, transparent: true, opacity: 0.92 })); m.position.set(x, 0.01, z); m.receiveShadow = true; floor.add(m); };
    path(0, 0, 1.8, ARENA.hd * 2 - 1); path(0, 0, ARENA.hw * 2 - 4, 1.4); path(-7, 6.5, 1.2, 7); path(7, -6.5, 1.2, 7);
    for (const t of [0, 1] as const) {
      const pad = new THREE.Mesh(new THREE.CircleGeometry(3.4, 40).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: TEAM[t], roughness: 0.6, transparent: true, opacity: 0.28 })); pad.position.set(0, 0.012, t ? -13 : 13); floor.add(pad);
      const rim = new THREE.Mesh(new THREE.RingGeometry(3.3, 3.5, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: TEAM[t] })); rim.position.copy(pad.position).setY(0.014); floor.add(rim);
      for (const sx of [-1, 1]) { const pole = new THREE.Group(); const p = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 2.4, 8), std('#8a5a30', 0.8)); p.position.y = 1.2; pole.add(p); const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.55), new THREE.MeshStandardMaterial({ color: TEAM[t], side: THREE.DoubleSide, roughness: 0.6 })); flag.position.set(0.48, 2.05, 0); flag.userData.flag = true; pole.add(flag); pole.position.set(sx * 3.9, 0, t ? -14.2 : 14.2); scene.add(pole); }
    }
  }
  // the Sunflower ring: a painted sunflower on the grass, the ring shows who holds it, an arc fills to the next point
  const sunTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d')!; g.translate(128, 128);
    for (let i = 0; i < 22; i++) { g.save(); g.rotate((i / 22) * Math.PI * 2); g.fillStyle = i % 2 ? '#ffd34a' : '#ffc21f'; g.beginPath(); g.ellipse(0, -78, 15, 44, 0, 0, Math.PI * 2); g.fill(); g.restore(); }
    const gr = g.createRadialGradient(0, 0, 4, 0, 0, 52); gr.addColorStop(0, '#7a4a1d'); gr.addColorStop(1, '#4e2e12'); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 50, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,220,120,.35)'; for (let i = 0; i < 70; i++) { const r = Math.sqrt(i / 70) * 46, an = i * 2.4; g.beginPath(); g.arc(Math.cos(an) * r, Math.sin(an) * r, 2.2, 0, Math.PI * 2); g.fill(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const sunflower = new THREE.Mesh(new THREE.PlaneGeometry(ZONE.r * 1.5, ZONE.r * 1.5).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: sunTex, transparent: true, roughness: 0.8, depthWrite: false })); sunflower.position.y = 0.02; scene.add(sunflower);
  const ringMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.85, depthWrite: false });
  const zoneRing = new THREE.Mesh(new THREE.RingGeometry(ZONE.r - 0.14, ZONE.r, 64).rotateX(-Math.PI / 2), ringMat); zoneRing.position.y = 0.025; scene.add(zoneRing);
  const fillMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.12, depthWrite: false });
  const zoneFill = new THREE.Mesh(new THREE.CircleGeometry(ZONE.r - 0.14, 48).rotateX(-Math.PI / 2), fillMat); zoneFill.position.y = 0.015; scene.add(zoneFill);
  const arcMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.95, depthWrite: false, side: THREE.DoubleSide });
  let zoneArc = new THREE.Mesh(new THREE.BufferGeometry(), arcMat); scene.add(zoneArc); let arcK = -1;
  const setArc = (k: number) => { if (Math.abs(k - arcK) < 0.01) return; arcK = k; zoneArc.geometry.dispose(); zoneArc.geometry = new THREE.RingGeometry(ZONE.r + 0.05, ZONE.r + 0.3, 48, 1, Math.PI / 2, -Math.max(0.001, k) * Math.PI * 2).rotateX(-Math.PI / 2); zoneArc.position.y = 0.03; };

  // cover: hedge walls (one mesh); rocks, crates and bushes from the orchard kit (hand-made fallbacks while it loads)
  const boxNodes = new Map<number, THREE.Object3D>();
  const layoutBoxes = new BrawlSim([], [], 1).boxes; // the map is fixed: build it before the match
  scene.add(hedgeWalls(layoutBoxes.filter((b) => b.kind === 'wall').map((b) => ({ x: b.x, z: b.z, w: b.hw * 2, d: b.hd * 2 })), 1.15, shadows));
  const crateFallback = (b: Box) => { const g = new THREE.Group(); const m = new THREE.Mesh(new THREE.BoxGeometry(b.hw * 1.9, 0.9, b.hd * 1.9), std('#b9824a', 0.85)); m.position.y = 0.45; m.castShadow = shadows; g.add(m); return g; };
  const fit = (o: THREE.Object3D, k: Kit, name: string, w: number, h?: number) => { const sz = k.size(name).getSize(new THREE.Vector3()); const s = h ? Math.min(w / Math.max(sz.x, sz.z), h / sz.y) : w / Math.max(sz.x, sz.z); o.scale.setScalar(s); return o; };
  const bushGroups: { box: Box; g: THREE.Group }[] = [];
  let dressG: THREE.Group | null = null;
  const dress = (k: Kit | null) => {
    if (dressG) scene.remove(dressG); const dg = new THREE.Group(); scene.add(dg); dressG = dg; boxNodes.clear(); bushGroups.length = 0;
    for (const b of layoutBoxes) {
      if (b.kind === 'rock') { const o = k ? fit(k.clone(Math.abs(b.x * 7 + b.z) % 2 > 1 ? 'rock_1' : 'rock_2', { shadow: shadows }), k, 'rock_1', Math.max(b.hw, b.hd) * 2.3, 1.4) : rock(b.id, Math.max(b.hw, b.hd) * 1.6, 'grey', shadows); o.position.set(b.x, k ? 0 : o.position.y, b.z); o.rotation.y = b.id; dg.add(o); }
      else if (b.kind === 'crate') { const o = k ? fit(k.clone(b.id % 2 ? 'crate_apples' : 'crate_pears', { shadow: shadows }), k, 'crate_apples', b.hw * 2.1) : crateFallback(b); o.position.set(b.x, 0, b.z); o.rotation.y = (b.id % 4) * Math.PI / 2; dg.add(o); boxNodes.set(b.id, o); }
      else if (b.kind === 'bush') {
        const g = new THREE.Group(); const nx = Math.max(1, Math.round(b.hw * 2 / 0.95)), nz = Math.max(1, Math.round(b.hd * 2 / 0.95));
        for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
          const x = b.x - b.hw + (i + 0.5) * (b.hw * 2 / nx), z = b.z - b.hd + (j + 0.5) * (b.hd * 2 / nz);
          let o: THREE.Object3D; if (k) { const name = k.has('bush_flowers') ? 'bush_flowers' : 'bush'; /* the plain kit bush is a red-leaf one */ o = fit(k.clone(name, { shadow: false }), k, name, 1.25, 1.15); }
          else { o = new THREE.Mesh(new THREE.IcosahedronGeometry(0.62, 1), std('#4f9e3f', 0.85)); o.position.y = 0.5; o.scale.y = 0.85; }
          const holder = new THREE.Group(); holder.add(o); holder.position.set(x + Math.sin(i * 3 + j) * 0.1, 0, z + Math.cos(i + j * 2) * 0.1); holder.rotation.y = i * 1.7 + j; g.add(holder);
        }
        dg.add(g); bushGroups.push({ box: b, g });
      }
    }
    // a fence round the arena, trees and flowers beyond it
    if (k && k.has('fence')) {
      const sz = k.size('fence').getSize(new THREE.Vector3()); const L = Math.max(sz.x, sz.z) * 0.95; const spots: { x: number; z: number; rot: number }[] = []; const along = sz.x >= sz.z ? 0 : Math.PI / 2;
      for (let x = -ARENA.hw + L / 2; x < ARENA.hw; x += L) for (const z of [-ARENA.hd - 0.3, ARENA.hd + 0.3]) spots.push({ x, z, rot: along });
      for (let z = -ARENA.hd + L / 2; z < ARENA.hd; z += L) for (const x of [-ARENA.hw - 0.3, ARENA.hw + 0.3]) spots.push({ x, z, rot: along + Math.PI / 2 });
      dg.add(k.scatter('fence', spots, { shadow: shadows }));
      const outside: { x: number; z: number; rot: number; s: number }[] = []; for (let i = 0; i < (a.mobile ? 14 : 24); i++) { const side = i % 4; const t = ((i * 37) % 100) / 100; const x = side < 2 ? (side ? 1 : -1) * (ARENA.hw + 2.6 + (i % 3)) : (t - 0.5) * (ARENA.hw * 2 + 6); const z = side < 2 ? (t - 0.5) * (ARENA.hd * 2 + 4) : (side === 2 ? 1 : -1) * (ARENA.hd + 2.6 + (i % 3)); outside.push({ x, z, rot: i, s: 0.9 + (i % 3) * 0.15 }); }
      for (const [n, name] of (['tree_1', 'tree_2', 'tree_3', 'pine_1'] as const).entries()) if (k.has(name)) dg.add(k.scatter(name, outside.filter((_, i) => i % 4 === n), { shadow: shadows }));
      if (k.has('flowers_a')) { const fl: { x: number; z: number; rot: number; s: number }[] = []; for (let i = 0; i < 26; i++) fl.push({ x: (i % 2 ? 1 : -1) * (ARENA.hw + 0.9 + (i % 3) * 0.3), z: -ARENA.hd + ((i * 2.37) % (ARENA.hd * 2)), rot: i, s: 0.3 }); dg.add(k.scatter('flowers_a', fl)); }
    } else for (let i = 0; i < 12; i++) { const t = tree('leafy', i, 1.1, shadows); t.position.set((i % 2 ? 1 : -1) * (ARENA.hw + 3), 0, -ARENA.hd + i * 2.7); dg.add(t); }
  };
  let kit: Kit | null = null; let dressed = false;
  const kitReady = Promise.race([loadKit('orchard', setup.mobile).then((k) => { kit = k; }).catch(() => { /* fallback art */ }), new Promise((r) => setTimeout(r, 8000))]);
  // dress with the kit once it's here; on a slow connection the hand-made stand-ins come first and the kit replaces them when it lands
  let dressedWithKit = false;
  const redress = () => { dress(kit); dressedWithKit = !!kit; if (sim) for (const b of sim.boxes) if (b.kind === 'crate' && b.hp <= 0) { const o = boxNodes.get(b.id); if (o) o.visible = false; } };
  void kitReady.then(() => { if (!dressed) { dressed = true; redress(); } });
  void loadKit('orchard', setup.mobile).then((k) => { kit = k; if (dressed && !dressedWithKit) redress(); }).catch(() => { /* keep the stand-ins */ });
  const glbReady = Promise.race([loadFuzzyGlb().catch(() => null), new Promise((r) => setTimeout(r, 6000))]);

  // ------------------------------------------------------------------ fighters (built when the match starts — your role is picked first)
  type FNode = { f: Fighter; fig: ReturnType<typeof a.figure>; ring: THREE.Mesh; bar: THREE.Sprite; barCv: HTMLCanvasElement; barKey: string; gun: THREE.Group; tip: THREE.Mesh; bubble: THREE.Mesh; ko: number; pop: number; recoil: number; face: number; hit: number };
  const fnodes: FNode[] = [];
  const bubbleGeo = new THREE.SphereGeometry(0.85, 20, 14);
  const makeBar = () => { const c = document.createElement('canvas'); c.width = 192; c.height = 64; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true })); s.scale.set(1.9, 0.63, 1); s.renderOrder = 5; return { s, c }; };
  const drawBar = (n: FNode) => {
    const f = n.f; const key = `${Math.ceil(f.hp)}|${f.you ? Math.floor(f.ammo * 4) : 0}|${f.alive}|${f.hidden}|${f.shield > 0}`; if (key === n.barKey) return; n.barKey = key;
    const g = n.barCv.getContext('2d')!; g.clearRect(0, 0, 192, 64); if (!f.alive) { (n.bar.material as THREE.SpriteMaterial).map!.needsUpdate = true; return; }
    g.font = '700 19px system-ui, sans-serif'; g.textAlign = 'center'; g.lineWidth = 4; g.strokeStyle = 'rgba(20,30,50,.75)'; const label = f.you ? 'You' : f.name;
    g.strokeText(label, 96, 20); g.fillStyle = '#ffffff'; g.fillText(label, 96, 20);
    const w = 150, x = 21, y = 28, h = 14; g.fillStyle = 'rgba(20,30,50,.6)'; g.beginPath(); g.roundRect(x - 3, y - 3, w + 6, h + 6, 8); g.fill();
    const k = Math.max(0, f.hp / f.maxHp); g.fillStyle = f.you ? '#5fd36b' : TEAM[f.team]; g.beginPath(); g.roundRect(x, y, Math.max(4, w * k), h, 6); g.fill();
    if (f.shield > 0) { g.strokeStyle = '#bfe6ff'; g.lineWidth = 3; g.beginPath(); g.roundRect(x - 2, y - 2, w + 4, h + 4, 7); g.stroke(); }
    if (f.you) { for (let i = 0; i < AMMO; i++) { const fill = Math.max(0, Math.min(1, f.ammo - i)); g.fillStyle = 'rgba(20,30,50,.6)'; g.fillRect(x + i * (w / AMMO) + 2, y + h + 6, w / AMMO - 4, 7); g.fillStyle = fill >= 1 ? '#ffb02e' : '#a07a3a'; g.fillRect(x + i * (w / AMMO) + 2, y + h + 6, (w / AMMO - 4) * fill, 7); } }
    if (f.hidden && f.team === 0) { g.font = '700 13px system-ui, sans-serif'; g.fillStyle = '#c9f5c0'; g.fillText('🌿 hidden', 96, 62); }
    (n.bar.material as THREE.SpriteMaterial).map!.needsUpdate = true;
  };
  const makeFighter = (f: Fighter) => {
    const fig = a.figure(f.skin, 0.42);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.64, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: f.you ? '#5fd36b' : TEAM[f.team], transparent: true, opacity: 0.9, depthWrite: false })); ring.position.y = 0.03; fig.group.add(ring);
    // a blaster held at the side, in the role colour (equipment only — the Fuzzy itself is untouched)
    const gun = new THREE.Group(); const body = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.42, 10).rotateX(Math.PI / 2), std('#f4efe6', 0.4)); gun.add(body);
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.095, 0.025, 6, 14), std(ROLE_COLOR[f.role], 0.4)); band.position.z = 0.05; gun.add(band);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), new THREE.MeshStandardMaterial({ color: ROLE_COLOR[f.role], emissive: ROLE_COLOR[f.role], emissiveIntensity: 0.8 })); tip.position.z = 0.24; gun.add(tip);
    if (f.role === 'guard') { const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.05, 18).rotateZ(Math.PI / 2), std(ROLE_COLOR.guard, 0.4)); sh.position.set(-0.62, 0.55, 0.12); fig.group.add(sh); }
    if (f.role === 'bloom') { const fl = new THREE.Group(); for (let i = 0; i < 6; i++) { const p = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), std('#ffffff', 0.6)); p.position.set(Math.cos(i) * 0.09, 0, Math.sin(i) * 0.09); p.scale.y = 0.4; fl.add(p); } const c = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), std('#ffd34a', 0.5)); fl.add(c); fl.position.set(0.15, 1.08, 0); fig.group.add(fl); }
    if (f.role === 'zip') { const bolt = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.28, 4), new THREE.MeshStandardMaterial({ color: ROLE_COLOR.zip, emissive: '#ff9f00', emissiveIntensity: 0.4 })); bolt.position.set(0, 0.62, -0.42); bolt.rotation.x = -0.5; fig.group.add(bolt); }
    gun.position.set(0.48, 0.42, 0.16); fig.group.add(gun);
    const bubble = new THREE.Mesh(bubbleGeo, new THREE.MeshStandardMaterial({ color: '#bfe6ff', transparent: true, opacity: 0.3, roughness: 0.05, emissive: TEAM[f.team], emissiveIntensity: 0.3, depthWrite: false })); bubble.position.y = 0.55; bubble.visible = false; fig.group.add(bubble);
    const { s: bar, c: barCv } = makeBar(); scene.add(bar);
    const n: FNode = { f, fig, ring, bar, barCv, barKey: '', gun, tip, bubble, ko: -1, pop: -1, recoil: 0, face: f.face, hit: 0 };
    fig.group.position.set(f.x, 0, f.z); fnodes.push(n); return n;
  };

  // ------------------------------------------------------------------ bolts, effects
  const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d')!; const gr = g.createRadialGradient(32, 32, 1, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
  const boltMat = [0, 1].map((t) => new THREE.SpriteMaterial({ map: glowTex, color: BOLT[t], transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  const trailMat = [0, 1].map((t) => new THREE.MeshBasicMaterial({ color: BOLT[t], transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending }));
  const trailGeo = new THREE.PlaneGeometry(0.16, 1).rotateX(-Math.PI / 2).translate(0, 0, 0.5);
  const bolts = new Map<number, { s: THREE.Sprite; t: THREE.Mesh }>();
  const rings: { m: THREE.Mesh; t: number; dur: number; to: number }[] = [];
  const shock = (x: number, z: number, color: string, to: number, dur = 0.4) => { const m = new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending })); m.position.set(x, 0.12, z); scene.add(m); rings.push({ m, t: 0, dur, to }); };
  const ghosts: { s: THREE.Sprite; t: number }[] = [];
  const ghost = (x: number, z: number, color: string) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, opacity: 0.7, depthWrite: false })); s.position.set(x, 0.55, z); s.scale.setScalar(1.2); scene.add(s); ghosts.push({ s, t: 0 }); };
  const heartShape = new THREE.Shape(); heartShape.moveTo(0, -0.18); heartShape.bezierCurveTo(-0.32, 0.05, -0.18, 0.3, 0, 0.14); heartShape.bezierCurveTo(0.18, 0.3, 0.32, 0.05, 0, -0.18);
  const heartGeo = new THREE.ExtrudeGeometry(heartShape, { depth: 0.08, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 2 }); heartGeo.center();
  const heartMat = new THREE.MeshStandardMaterial({ color: '#ff5a7a', emissive: '#d6336c', emissiveIntensity: 0.4, roughness: 0.3 });
  const hearts = new Map<number, THREE.Mesh>();
  const aimMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.22, depthWrite: false });
  const aimLine = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 1).rotateX(-Math.PI / 2).translate(0, 0, 0.5), aimMat); aimLine.position.y = 0.04; aimLine.visible = false; scene.add(aimLine);
  const burstMark = new THREE.Mesh(new THREE.RingGeometry(SPECIAL.burst.r - 0.08, SPECIAL.burst.r, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: ROLE_COLOR.burst, transparent: true, opacity: 0.45, depthWrite: false })); burstMark.position.y = 0.04; burstMark.visible = false; scene.add(burstMark);
  let shake = 0;

  // ------------------------------------------------------------------ HUD extras: special button / meter, mute, ring status, respawn note
  const hud = a.hud;
  const special = document.createElement('button'); special.type = 'button'; special.className = 'br-special'; special.innerHTML = '<i></i><span>★</span><small>SPECIAL</small>'; hud.append(special);
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
  const ctl = { mouse: null as THREE.Vector3 | null, mouseDown: false, specialQ: false, fireQ: null as { x: number; z: number } | null, move: { x: 0, z: 0 }, aimStick: null as { x: number; z: number } | null, autoQ: false };
  const touch = setup.mobile || matchMedia('(pointer: coarse)').matches;
  a.root.style.touchAction = 'none';
  const blocked = (e: Event) => !!(e.target as HTMLElement).closest('button, .race-pause, .mg-btn, .mg-intro, .race-paused, .adv-results');
  // mouse: aim follows the pointer, click / hold fires, right-click = special
  a.root.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') ctl.mouse = groundAt(e.clientX, e.clientY); });
  a.root.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse' || blocked(e) || !a.started() || a.paused()) return; ctl.mouse = groundAt(e.clientX, e.clientY); if (e.button === 2) ctl.specialQ = true; else if (e.button === 0) ctl.mouseDown = true; });
  addEventListener('pointerup', (e) => { if (e.pointerType === 'mouse' && e.button === 0) ctl.mouseDown = false; });
  a.root.addEventListener('contextmenu', (e) => e.preventDefault());
  a.onAction(() => { if (a.started() && !a.paused()) ctl.specialQ = true; });
  special.addEventListener('pointerdown', (e) => { e.stopPropagation(); e.preventDefault(); if (a.started() && !a.paused()) ctl.specialQ = true; });
  // touch: a move stick on the left half, an aim stick on the right half
  type Stick = { id: number; ox: number; oy: number; x: number; y: number; t: number; el: HTMLDivElement; knob: HTMLDivElement; dragged: boolean };
  const R = 56; let moveStick: Stick | null = null, aimStick: Stick | null = null;
  const stickEl = (cls: string) => { const el = document.createElement('div'); el.className = `joy br-joy ${cls}`; el.hidden = true; const k = document.createElement('div'); k.className = 'joy-knob'; el.append(k); a.root.append(el); return { el, knob: k }; };
  const mEl = stickEl('move'), aEl = stickEl('aim');
  const homeHint = document.createElement('div'); homeHint.className = 'br-sticks'; homeHint.innerHTML = '<span>Move</span><span>Aim · shoot</span>'; if (touch) a.root.append(homeHint);
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
    if (aimStick && aimStick.dragged) ctl.aimStick = { x: aimStick.x, z: aimStick.y };
  }, true);
  const release = (e: PointerEvent) => {
    if (e.pointerType === 'mouse') return; e.stopPropagation();
    if (moveStick && moveStick.id === e.pointerId) { moveStick.el.hidden = true; moveStick = null; ctl.move = { x: 0, z: 0 }; }
    if (aimStick && aimStick.id === e.pointerId) { const st = aimStick; st.el.hidden = true; aimStick = null; if (st.dragged && Math.hypot(st.x, st.y) > 0.25) ctl.fireQ = { x: st.x, z: st.y }; else ctl.autoQ = true; /* a touch that didn't move = a tap → auto-shoot */ ctl.aimStick = null; }
  };
  a.root.addEventListener('pointerup', release, true); a.root.addEventListener('pointercancel', release, true);
  a.tip('go', touch ? 'Left thumb moves · right thumb aims — let go to shoot, tap to auto-shoot · ★ = special' : 'WASD to move · aim with the mouse · click to shoot (hold to keep firing) · Space or right-click = special', 5200);

  // ------------------------------------------------------------------ the match
  let started = false;
  const begin = () => {
    if (started) return; started = true;
    const you: Roster = { name: setup.you.name || 'You', skin: setup.you.skin, role, you: true };
    const others = (Object.keys(ROLES) as Role[]).filter((r) => r !== role);
    const allies: Roster[] = [{ name: setup.host || 'Pom', skin: ALLY_SKINS[0], role: others[1], skill: 0.62 }, { name: 'Mallow', skin: ALLY_SKINS[1], role: others[2], skill: 0.58 }];
    const foes: Roster[] = (['burst', 'guard', 'zip'] as Role[]).map((r, i) => ({ name: FOE_NAMES[i], skin: FOE_SKINS[i], role: r, skill: 0.6 + i * 0.04 }));
    sim = new BrawlSim([you, ...allies], foes, setup.seed);
    // wait (briefly) for the model so everyone is the owner's Fuzzy
    void glbReady.then(() => { for (const f of sim!.fighters) makeFighter(f); sim!.start(); });
    a.tip('ring', 'Stand in the Sunflower ring with no pink Fuzzy inside to score', 5200);
  };
  const me = () => fnodes.find((n) => n.f.you);
  const handle = (e: BrawlEvent) => {
    const s = sim!; const youF = s.you!; const n = e.f ? fnodes[e.f.id] : undefined;
    switch (e.kind) {
      case 'shot': if (e.f && n) { n.recoil = 1; play(() => bs.shot(e.f!.role, e.f!.you)); a.puff(new THREE.Vector3(e.f.x + Math.sin(e.f.face) * 0.6, 0.55, e.f.z + Math.cos(e.f.face) * 0.6), 1, BOLT[e.f.team]); } break;
      case 'hit': if (e.f && n) {
        n.hit = 1; n.fig.squash = Math.max(n.fig.squash, 0.35); const mine = e.by?.you; const onMe = e.f.you;
        a.sparks(new THREE.Vector3(e.f.x, 0.7, e.f.z), mine ? 6 : 3); a.float(e.f.x, 1.9, e.f.z, `−${e.dmg}`, onMe ? 'warn' : mine ? 'gold' : '');
        if (onMe) { play(bs.hurt); shake = Math.max(shake, 0.28); hurt.classList.remove('on'); void hurt.offsetWidth; hurt.classList.add('on'); } else play(() => bs.hit(!!mine));
      } break;
      case 'ko': if (e.f && n) {
        n.ko = 0; a.puff(new THREE.Vector3(e.f.x, 0.6, e.f.z), 10, '#ffffff'); a.sparks(new THREE.Vector3(e.f.x, 0.8, e.f.z), 14);
        if (e.f.you) { play(bs.youKO); a.banner(`Knocked out by ${e.by?.name ?? 'a pink Fuzzy'}!`, 'warn'); shake = 0.5; }
        else if (e.by?.you) { play(() => bs.ko(true)); a.banner(`You knocked out ${e.f.name}!`, 'combo'); a.flash('KO!'); }
        else play(() => bs.ko(false));
      } break;
      case 'respawn': if (n) { n.ko = -1; n.pop = 0; if (e.f?.you) play(bs.respawn); } break;
      case 'special': if (e.f && n) {
        const f = e.f; const mine = f.you;
        if (f.role === 'burst') { play(bs.burst); shock(f.x, f.z, ROLE_COLOR.burst, SPECIAL.burst.r * 1.05, 0.45); shock(f.x, f.z, '#ffffff', SPECIAL.burst.r * 0.7, 0.3); a.sparks(new THREE.Vector3(f.x, 0.6, f.z), 18); shake = Math.max(shake, mine ? 0.45 : 0.2); }
        else if (f.role === 'guard') play(bs.shield);
        else if (f.role === 'zip') { play(bs.dash); for (let i = 0; i < 4; i++) setTimeout(() => ghost(f.x, f.z, ROLE_COLOR.zip), i * 40); }
        else { play(bs.heal); shock(f.x, f.z, ROLE_COLOR.bloom, SPECIAL.heal.r, 0.6); }
        if (mine) a.banner(`${ROLE_UI[f.role].icon} ${ROLE_UI[f.role].name}!`, 'combo');
      } break;
      case 'heal': if (e.f && (e.amount ?? 0) >= 5) { a.float(e.f.x, 1.8, e.f.z, `+${e.amount}`, 'gold'); a.puff(new THREE.Vector3(e.f.x, 0.8, e.f.z), 3, '#9be29b'); } break;
      case 'wall': if (e.x !== undefined) { a.puff(new THREE.Vector3(e.x, 0.55, e.z!), 2, BOLT[e.shot!.team]); if (e.shot?.by === youF.id) play(bs.wall); } break;
      case 'crate': if (e.box) { const o = boxNodes.get(e.box.id); if (o) o.userData.shake = 1; a.chips(new THREE.Vector3(e.box.x, 0.6, e.box.z), 3); play(bs.crate); } break;
      case 'crateBreak': if (e.box) { const o = boxNodes.get(e.box.id); if (o) o.visible = false; a.chips(new THREE.Vector3(e.box.x, 0.5, e.box.z), 14); a.puff(new THREE.Vector3(e.box.x, 0.4, e.box.z), 6, '#e6d6b0'); play(bs.crateBreak); } break;
      case 'heart': if (e.pickup) { if (e.f) { const m = hearts.get(e.pickup.id); if (m) { scene.remove(m); hearts.delete(e.pickup.id); } play(bs.heart); } else { const m = new THREE.Mesh(heartGeo, heartMat); m.position.set(e.pickup.x, 0.6, e.pickup.z); m.castShadow = shadows; scene.add(m); hearts.set(e.pickup.id, m); } } break;
      case 'zoneTick': { const ours = e.team === youF.team; play(() => bs.zone(ours)); a.float(0, 1.4, 0, ours ? '+1 ring' : 'Pink +1', ours ? 'gold' : 'warn'); a.sparks(new THREE.Vector3(0, 0.5, 0), 10); break; }
      case 'contest': play(bs.contest); break;
      case 'lead': play(() => bs.lead(e.team === youF.team)); a.banner(e.team === youF.team ? 'Blue team leads!' : 'Pink team leads!', e.team === youF.team ? 'combo' : 'warn'); break;
      case 'overtime': a.banner('Sudden overtime — next point wins!', 'warn'); break;
      case 'warn': a.warn(e.n!); break;
      case 'win': play(e.team === undefined ? bs.lose : e.team === youF.team ? bs.win : bs.lose); break;
    }
  };
  a.run((dt, input) => {
    if (!sim || sim.state !== 'playing') return;
    const y = sim.you!; const m = me();
    // the aim: mouse point, the aim stick, or (tap) the nearest enemy in sight
    let aim: { x: number; z: number } | null = null; let fire = false;
    if (ctl.aimStick) aim = { x: ctl.aimStick.x, z: ctl.aimStick.z };
    else if (ctl.mouse) aim = { x: ctl.mouse.x - y.x, z: ctl.mouse.z - y.z };
    if (ctl.fireQ) { aim = ctl.fireQ; fire = true; ctl.fireQ = null; }
    else if (ctl.autoQ) { ctl.autoQ = false; const t = sim.fighters.filter((e) => e.team !== y.team && sim!.sees(y, e)).sort((p, q) => Math.hypot(p.x - y.x, p.z - y.z) - Math.hypot(q.x - y.x, q.z - y.z))[0]; aim = t ? { x: t.x - y.x, z: t.z - y.z } : { x: Math.sin(y.face), z: Math.cos(y.face) }; fire = true; }
    else if (ctl.mouseDown && aim) fire = true;
    if (fire && y.alive && y.ammo < 1 && m) play(bs.empty);
    const spec = ctl.specialQ; ctl.specialQ = false;
    const kx = input.x || 0, kz = input.z || 0; const mv = Math.hypot(kx, kz) > 0.1 ? { x: kx, z: kz } : ctl.move;
    sim.step(dt, { move: mv, aim, fire, special: spec && !!y.alive });
    for (const e of sim.events) handle(e);
  }, (dt) => {
    if (!sim) return;
    const s = sim; const y = s.you!;
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
      drawBar(n); n.bar.visible = f.alive && g.visible; n.bar.position.set(g.position.x, 1.75, g.position.z);
      (n.ring.material as THREE.MeshBasicMaterial).opacity = f.hidden ? 0.4 + Math.sin(time.value * 4) * 0.15 : 0.9;
    }
    // bushes: the one you're in thins out so you can still see yourself
    for (const bg of bushGroups) { const inside = y.alive && Math.abs(y.x - bg.box.x) < bg.box.hw + 0.3 && Math.abs(y.z - bg.box.z) < bg.box.hd + 0.3; const target = inside ? 0.55 : 1; bg.g.scale.y = lerp(bg.g.scale.y, target, Math.min(1, dt * 8)); }
    // bolts
    const live = new Set<number>();
    for (const b of s.shots) { live.add(b.id); let v = bolts.get(b.id); if (!v) { const sp = new THREE.Sprite(boltMat[b.team]); sp.scale.setScalar(b.role === 'guard' ? 0.42 : 0.55); const tr = new THREE.Mesh(trailGeo, trailMat[b.team]); scene.add(sp, tr); v = { s: sp, t: tr }; bolts.set(b.id, v); } v.s.position.set(b.x, 0.6, b.z); v.t.position.set(b.x, 0.58, b.z); v.t.rotation.y = Math.atan2(-b.dx, -b.dz); v.t.scale.z = Math.min(1.4, b.speed * 0.07); }
    for (const [id, v] of bolts) if (!live.has(id)) { scene.remove(v.s, v.t); bolts.delete(id); }
    // effects
    for (let i = rings.length - 1; i >= 0; i--) { const r = rings[i]; r.t += dt; const k = Math.min(1, r.t / r.dur); r.m.scale.setScalar(0.2 + k * r.to); (r.m.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - k); if (k >= 1) { scene.remove(r.m); rings.splice(i, 1); } }
    for (let i = ghosts.length - 1; i >= 0; i--) { const gh = ghosts[i]; gh.t += dt; (gh.s.material as THREE.SpriteMaterial).opacity = 0.7 * (1 - gh.t / 0.35); if (gh.t > 0.35) { scene.remove(gh.s); ghosts.splice(i, 1); } }
    for (const [, m] of hearts) { m.rotation.y += dt * 2.5; m.position.y = 0.6 + Math.sin(time.value * 3) * 0.08; }
    for (const [, o] of boxNodes) if (o.userData.shake) { o.userData.shake = Math.max(0, o.userData.shake - dt * 5); o.rotation.z = Math.sin(o.userData.shake * 30) * 0.06 * o.userData.shake; }
    scene.traverse((o) => { if (o.userData.flag) o.rotation.y = Math.sin(time.value * 2 + o.position.x) * 0.25; });
    // the ring
    const zt = s.zone.contested ? -2 : s.zone.team; const zc = zt === -2 ? '#ffd34a' : zt === -1 ? '#ffffff' : TEAM[zt];
    ringMat.color.set(zc); fillMat.color.set(zc); fillMat.opacity = zt === -1 ? 0.08 : 0.16 + Math.sin(time.value * 5) * (zt === -2 ? 0.08 : 0.03);
    const prog = zt >= 0 ? s.zone.progress[zt as 0 | 1] / ZONE.hold : 0; setArc(prog); arcMat.color.set(zt >= 0 ? TEAM[zt as 0 | 1] : '#ffffff'); zoneArc.visible = prog > 0.01;
    sunflower.rotation.y += dt * 0.15;
    ringPill.textContent = s.zone.contested ? '🌻 Ring contested!' : zt === -1 ? '🌻 Ring free — grab it' : zt === y.team ? `🌻 Blue holds the ring · ${Math.ceil(ZONE.hold - s.zone.progress[zt as 0 | 1])} s` : `🌻 Pink holds the ring · ${Math.ceil(ZONE.hold - s.zone.progress[zt as 0 | 1])} s`;
    ringPill.className = `br-ring ${zt === -2 ? 'contest' : zt === y.team ? 'ours' : zt === -1 ? '' : 'theirs'}`;
    // aim guide: computers always (faint), phones while dragging the aim stick
    const st = ROLES[y.role]; let ax = 0, az = 0; let show = false;
    if (ctl.aimStick && Math.hypot(ctl.aimStick.x, ctl.aimStick.z) > 0.25) { ax = ctl.aimStick.x; az = ctl.aimStick.z; show = true; } else if (!touch && ctl.mouse) { ax = ctl.mouse.x - y.x; az = ctl.mouse.z - y.z; show = true; }
    aimLine.visible = show && y.alive; if (aimLine.visible) { aimLine.position.set(y.x, 0.04, y.z); aimLine.rotation.y = Math.atan2(ax, az); aimLine.scale.set(st.pellets > 1 ? 2.2 : 1, 1, st.range); aimMat.opacity = ctl.aimStick ? 0.35 : 0.16; }
    burstMark.visible = y.alive && y.role === 'burst' && y.charge >= 1; if (burstMark.visible) { burstMark.position.set(y.x, 0.04, y.z); burstMark.rotation.y += dt; }
    // HUD
    a.setScore(s.score[y.team]); a.setCount(String(s.score[y.team === 0 ? 1 : 0]), s.overtime ? 'OVERTIME' : '');
    a.setTime(s.left);
    special.classList.toggle('ready', y.charge >= 1 && y.alive); (special.querySelector('i') as HTMLElement).style.setProperty('--k', String(y.charge)); special.dataset.role = y.role; (special.querySelector('span') as HTMLElement).textContent = ROLE_UI[y.role].icon;
    downNote.hidden = y.alive; if (!y.alive) downNote.textContent = `Back in ${Math.max(1, Math.ceil(y.respawn))}…`;
    // camera: follow you, a little ahead of where you aim, kept inside the arena; shake on hits
    const fx = y.alive ? y.x : SPAWN[y.team][0].x, fz = y.alive ? y.z : SPAWN[y.team][0].z;
    const leadX = show ? Math.max(-1, Math.min(1, ax / 6)) * 1.2 : 0, leadZ = show ? Math.max(-1, Math.min(1, az / 6)) * 1.2 : 0;
    const cx = Math.max(-ARENA.hw + (portrait ? 5 : 7), Math.min(ARENA.hw - (portrait ? 5 : 7), fx + leadX)), cz = Math.max(-ARENA.hd + 4, Math.min(ARENA.hd - 4, fz + leadZ));
    shake = Math.max(0, shake - dt); const sk = shake * 0.5;
    a.camTarget.set(lerp(a.camTarget.x, cx, Math.min(1, dt * 6)) + (sk ? (Math.random() - 0.5) * sk : 0), 0, lerp(a.camTarget.z, cz, Math.min(1, dt * 6)) + (sk ? (Math.random() - 0.5) * sk : 0));
    if (s.state === 'done') a.finish(s.result(), s.winner === y.team ? 'VICTORY!' : s.winner === -1 ? 'DRAW' : 'DEFEAT');
  });
  if (import.meta.env.DEV) (window as unknown as { __mg: unknown }).__mg = {
    id: 'brawl', get sim() { return sim; }, ctl: a.ctl, start: a.start, ready: () => !!sim && sim.state !== 'ready', role: () => role, nodes: () => fnodes.length, ctlState: ctl,
    finishNow: () => { if (sim) (sim as unknown as { state: string }).state = 'done'; },
    screenOf: (x: number, z: number) => { const v = new THREE.Vector3(x, 0.5, z).project(camera); const r = a.renderer.domElement.getBoundingClientRect(); return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height }; },
    dressed: () => dressed, kit: () => !!kit,
  };
}
