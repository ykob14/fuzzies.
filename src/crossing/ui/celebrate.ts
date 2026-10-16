/**
 * The unlock celebration. Every new Fuzzy (from the Pass, the Shop, achievements, worlds…) gets its moment: a dark stage, light, the
 * Fuzzy appearing in 3D with its own celebration and voice, its name and rarity, and **Equip Now** / **Keep going**. The drama grows with
 * rarity — common: a pop and sparkles · rare: + a ring burst · epic: + light beams and confetti · legendary: + fireworks and a camera
 * swoop · mythic: lights gather from the dark, a flash, then all of it. Tap / Space / Enter skips to the end; Escape = Keep going.
 * Reduce motion = a simple fade. No WebGL (or it fails) = a 2D card with the Fuzzy's picture. Cosmetics get a smaller card.
 * One renderer for the whole queue, thrown away at the end.
 */
import * as THREE from 'three';
import { h, icon } from '../../ui/dom';
import { takePending, equipCharacter, equipCosmetic, hasCharacter } from '../store';
import { CHARACTER_BY_ID, RARITY_COLOR, type CharacterDef, type Rarity } from '../characters';
import { COSMETIC_BY_ID, SLOT_NAME, type CosmeticDef } from '../cosmetics';
import { buildCharacter, type CharacterRig } from '../character3d';
import { loadFur, furReady } from '../fur';
import { FxLayer } from '../effects';
import { unlockFanfare, whoosh, equipSound, sparkle } from '../audio';
import { friendUrl } from '../../content/friends';
import { rarityTag } from './kit';
import { thumbnail } from './showroom';
import type { NavTarget } from '../hub';
import './celebrate.css';

export interface CelebrateHost { equipChanged(): void; go(t: NavTarget): void }
type Choice = 'equip' | 'keep';
const reduced = (): boolean => document.documentElement.dataset.motion === 'reduce' || matchMedia('(prefers-reduced-motion: reduce)').matches;
const RANK: Record<Rarity, number> = { common: 0, rare: 1, epic: 2, legendary: 3, mythic: 4 };
/** seconds of build-up before the Fuzzy appears */
const BUILD: Record<Rarity, number> = { common: 0.35, rare: 0.5, epic: 0.8, legendary: 1.2, mythic: 2.0 };

let running: Promise<void> | null = null;
/** Show every waiting unlock, one after another. Safe to call from several places: a second call waits for the first. */
export function celebrateAll(_root: HTMLElement, host: CelebrateHost): Promise<void> {
  if (running) return running;
  running = run(host).finally(() => { running = null; });
  return running;
}

async function run(host: CelebrateHost): Promise<void> {
  let stage: Stage | null = null;
  const overlay = h('div', { class: 'fzc', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'New unlock' });
  document.body.append(overlay);
  try {
    for (let p = takePending(); p; p = takePending()) {
      if (p.type === 'character') {
        const def = CHARACTER_BY_ID[p.id];
        if (!def) continue;
        if (!stage && !reduced()) stage = await makeStage(overlay).catch(() => null);
        const choice = await characterMoment(overlay, def, stage);
        if (choice === 'equip' && hasCharacter(def.id) && equipCharacter(def.id)) { equipSound(); host.equipChanged(); }
      } else {
        const c = COSMETIC_BY_ID[p.id];
        if (!c) continue;
        const choice = await cosmeticMoment(overlay, c);
        if (choice === 'equip' && equipCosmetic(c.id)) { equipSound(); host.equipChanged(); }
      }
    }
  } finally {
    stage?.dispose();
    overlay.classList.add('out');
    setTimeout(() => overlay.remove(), 220);
  }
}

// ---------- the 3D stage (one renderer for the whole queue) ----------
interface Stage {
  canvas: HTMLCanvasElement;
  /** play one Fuzzy's reveal; `skip()` jumps to the end; resolves when the reveal has played */
  reveal(def: CharacterDef, onPop: () => void): { skip(): void; done: Promise<void> };
  dispose(): void;
}
async function makeStage(overlay: HTMLElement): Promise<Stage> {
  if (!furReady()) await Promise.race([loadFur(), new Promise((r) => setTimeout(r, 6000))]);
  const canvas = h('canvas', { class: 'fzc-canvas', 'aria-hidden': 'true' }) as HTMLCanvasElement;
  overlay.append(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.NeutralToneMapping; renderer.setClearColor(0, 0);
  const scene = new THREE.Scene();
  const { RoomEnvironment } = await import('three/examples/jsm/environments/RoomEnvironment.js');
  const pm = new THREE.PMREMGenerator(renderer); const env = pm.fromScene(new RoomEnvironment(), 0.04).texture; pm.dispose();
  scene.environment = env; scene.environmentIntensity = 0.5;
  const hemi = new THREE.HemisphereLight('#ffffff', '#3a3346', 0.8); scene.add(hemi);
  const key = new THREE.DirectionalLight('#fff3e2', 2.4); key.position.set(-3, 5, 5); scene.add(key);
  const rim = new THREE.DirectionalLight('#ffffff', 2.2); rim.position.set(2.5, 3, -4); scene.add(rim);
  const fx = new FxLayer(1, 260); scene.add(fx.group);
  // light beams fanning up behind the Fuzzy
  const beamGeo = new THREE.ConeGeometry(0.5, 9, 24, 1, true); beamGeo.translate(0, -4.5, 0); beamGeo.rotateX(Math.PI);
  const beamMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const beams = new THREE.Group(); beams.position.set(0, -1.2, -1.6); scene.add(beams);
  for (let i = 0; i < 7; i++) { const b = new THREE.Mesh(beamGeo, beamMat); b.rotation.z = (i - 3) * 0.32; beams.add(b); }
  // a soft glowing floor disc
  const gc = document.createElement('canvas'); gc.width = gc.height = 64; const gg = gc.getContext('2d')!;
  const gr = gg.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.25)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  gg.fillStyle = gr; gg.fillRect(0, 0, 64, 64);
  const glowTex = new THREE.CanvasTexture(gc);
  const floorMat = new THREE.MeshBasicMaterial({ map: glowTex, color: '#ffffff', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 4.5).rotateX(-Math.PI / 2), floorMat); floor.position.y = -1.02; scene.add(floor);
  // gathering lights (mythic): sprites that spiral in
  const motes = new THREE.Group(); scene.add(motes);
  const moteMat = new THREE.SpriteMaterial({ map: glowTex, color: '#ffffff', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 });
  for (let i = 0; i < 26; i++) { const s = new THREE.Sprite(moteMat); s.scale.setScalar(0.18 + (i % 3) * 0.05); s.userData.a = (i / 26) * Math.PI * 2; s.userData.y = -0.6 + (i % 5) * 0.45; motes.add(s); }
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);
  let aspect = 1;
  const size = () => { const r = overlay.getBoundingClientRect(); renderer.setSize(Math.max(1, r.width), Math.max(1, r.height), false); aspect = r.width / Math.max(1, r.height); camera.aspect = aspect; camera.updateProjectionMatrix(); };
  const ro = new ResizeObserver(size); ro.observe(overlay); size();

  let rig: CharacterRig | null = null, raf = 0, dead = false;
  const dispose = () => {
    dead = true; cancelAnimationFrame(raf); ro.disconnect(); rig?.dispose(); fx.dispose();
    beamGeo.dispose(); beamMat.dispose(); glowTex.dispose(); floorMat.dispose(); floor.geometry.dispose(); moteMat.dispose(); env.dispose();
    renderer.dispose(); renderer.forceContextLoss(); canvas.remove();
  };
  const reveal = (def: CharacterDef, onPop: () => void) => {
    rig?.dispose(); rig = null; cancelAnimationFrame(raf);
    const r = RANK[def.rarity], build = BUILD[def.rarity], col = new THREE.Color(RARITY_COLOR[def.rarity]);
    rig = buildCharacter(def, { r: 1, sound: true, shadow: false });
    rig.group.scale.setScalar(0.001); scene.add(rig.group);
    rim.color.copy(col).lerp(new THREE.Color('#ffffff'), 0.3); beamMat.color.copy(col); floorMat.color.copy(col); moteMat.color.copy(col).lerp(new THREE.Color('#ffffff'), 0.4);
    let t = 0, popped = false, prev = performance.now(), finished = false, celebrated = false;
    let resolveDone!: () => void;
    const done = new Promise<void>((res) => { resolveDone = res; });
    const end = build + 2.2;
    const pop = () => {
      if (popped) return; popped = true;
      onPop(); unlockFanfare(def.rarity);
      const at = new THREE.Vector3(0, 0, 0);
      fx.sparkles(at, RARITY_COLOR[def.rarity], 14 + r * 8, 1 + r * 0.15);
      if (r >= 1) { fx.land('jump-shock', new THREE.Vector3(0, -1, 0)); fx.land('jump-ripple', new THREE.Vector3(0, -1, 0)); }
      if (r >= 2) fx.confetti(new THREE.Vector3(0, 1.4, 0), 40 + r * 10, 1.1);
      if (r >= 3) fx.fireworks(new THREE.Vector3(0, 0.5, -1.5), r === 4 ? 5 : 3);
      if (r === 4) overlay.classList.add('flash'), setTimeout(() => overlay.classList.remove('flash'), 420);
    };
    const loop = (now: number) => {
      if (dead) return;
      const dt = Math.min(0.05, Math.max(0, (now - prev) / 1000)); prev = now; t += dt;
      // build-up: beams rise (epic+), lights gather (mythic)
      const b = Math.min(1, t / Math.max(0.2, build));
      beamMat.opacity = r >= 2 ? (0.05 + 0.12 * b) * (0.85 + 0.15 * Math.sin(t * 3)) : 0;
      beams.rotation.y = t * 0.3; beams.children.forEach((m, i) => { m.rotation.z = (i - 3) * 0.32 + Math.sin(t * 0.8 + i) * 0.05; });
      floorMat.opacity = 0.15 + 0.45 * b;
      moteMat.opacity = r === 4 && !popped ? 0.9 * b : Math.max(0, moteMat.opacity - dt * 2);
      motes.children.forEach((s) => { const rr = 3.2 * (1 - b) + 0.2, a = s.userData.a + t * 2.2; s.position.set(Math.cos(a) * rr, s.userData.y * (1 - b), Math.sin(a) * rr * 0.6); });
      if (t >= build && !popped) { if (r >= 3) whoosh(); pop(); }
      // the Fuzzy: overshoot pop, then its own celebration
      if (rig) {
        const k = popped ? Math.min(1, (t - build) / 0.5) : 0;
        const s = k <= 0 ? 0.001 : 1 + Math.sin(k * Math.PI) * 0.25 * (1 - k) - (1 - k) * (1 - k) * 0.9 * Math.cos(k * 8);
        rig.group.scale.setScalar(Math.max(0.001, Math.min(1.3, s)));
        rig.group.rotation.y = popped ? Math.max(0, 1 - (t - build) / 0.6) * Math.PI * 2 * (r >= 3 ? 1 : 0.5) : 0;
        if (popped && !celebrated && t - build > 0.55) { celebrated = true; rig.play('celebrate'); }
        rig.lookAt(camera.position);
        rig.tick(t, dt);
      }
      // camera: legendary/mythic swoop in from close and low, others settle gently
      const sw = r >= 3 ? Math.max(0, 1 - Math.max(0, t - build + 0.4) / 1.4) : 0;
      const fit = Math.max(1, 0.75 / aspect);
      const d = (7.6 + sw * -4) * fit;
      const ang = sw * 0.9;
      camera.position.set(Math.sin(ang) * d, 0.4 - sw * 0.9, Math.cos(ang) * d);
      camera.lookAt(0, aspect < 0.9 ? 0.15 : -0.35, 0);
      fx.update(dt);
      if (popped && Math.random() < dt * (1 + r)) fx.sparkles(new THREE.Vector3((Math.random() - 0.5) * 3, Math.random() * 2, -0.5), RARITY_COLOR[def.rarity], 2, 0.4);
      renderer.render(scene, camera);
      if (!finished && t >= end) { finished = true; resolveDone(); }
      raf = requestAnimationFrame(loop);
    };
    prev = performance.now(); raf = requestAnimationFrame(loop);
    // skipping jumps past the build-up and the camera swoop (the pop still plays)
    return { skip() { t = Math.max(t, popped ? end : build + 1.5); }, done };
  };
  return { canvas, reveal, dispose };
}

/** The overlay is modal: no key reaches the game underneath. Escape = Keep going; Space/Enter skip the build-up, then press the focused
 *  button (Equip Now by default); Tab moves between the two buttons. */
function modalKey(e: KeyboardEvent, settled: boolean, skip: () => void, finish: (c: Choice) => void, btns: HTMLElement): void {
  e.stopPropagation();
  if (e.key === 'Tab') return;
  if (e.key === 'Escape') { e.preventDefault(); finish('keep'); return; }
  if (e.key !== ' ' && e.key !== 'Enter') { e.preventDefault(); return; }
  e.preventDefault();
  if (e.repeat) return;
  if (!settled) { skip(); return; }
  const focused = document.activeElement as HTMLElement | null;
  finish(focused?.classList.contains('fzc-keep') && btns.contains(focused) ? 'keep' : 'equip');
}

// ---------- one character ----------
function buttons(resolve: (c: Choice) => void, canEquip: boolean, equipLabel = 'Equip Now'): HTMLElement {
  return h('div', { class: 'fzc-btns' },
    canEquip ? h('button', { class: 'btn btn-primary btn-lg fzc-equip', type: 'button', onclick: (e: Event) => { e.stopPropagation(); resolve('equip'); } }, icon('star', 18), h('span', null, equipLabel)) : null,
    h('button', { class: 'btn btn-ghost btn-lg fzc-keep', type: 'button', onclick: (e: Event) => { e.stopPropagation(); resolve('keep'); } }, h('span', null, 'Keep going')));
}
function characterMoment(overlay: HTMLElement, def: CharacterDef, stage: Stage | null): Promise<Choice> {
  return new Promise((resolve) => {
    overlay.style.setProperty('--rar', RARITY_COLOR[def.rarity]);
    overlay.dataset.rarity = def.rarity;
    const card = h('div', { class: 'fzc-card' });
    const pic = stage ? null : h('div', { class: 'fzc-pic' }, def.friend ? h('img', { src: friendUrl(def.friend), alt: '' }) : h('span', { class: 'fzc-blob', style: `--c0:${def.color[0]};--c1:${def.color[1]}` }));
    // no moving stage (Reduce motion): show a still 3D picture of the real Fuzzy when WebGL works; the drawn picture stays otherwise
    if (pic) void thumbnail(def, { size: 480 }).then((url) => { if (url && pic.isConnected) pic.replaceChildren(h('img', { src: url, alt: '' })); }).catch(() => {});
    const text = h('div', { class: 'fzc-text' },
      h('p', { class: 'fzc-kicker' }, def.rarity === 'mythic' ? 'Mythic Fuzzy unlocked!' : 'New Fuzzy unlocked!'),
      h('h2', { class: 'fzc-name' }, def.name),
      h('div', { class: 'fzc-tag' }, rarityTag(def.rarity)),
      h('p', { class: 'fzc-line' }, def.tagline));
    let settled = false;
    const finish = (c: Choice) => { cleanup(); card.remove(); resolve(c); };
    const btns = buttons(finish, true);
    card.append(...[pic, text, btns].filter(Boolean) as HTMLElement[]);
    const skipHint = h('p', { class: 'fzc-skip' }, matchMedia('(pointer: coarse)').matches ? 'Tap to skip' : 'Click or press Space to skip');
    overlay.replaceChildren(...[stage?.canvas, card, skipHint].filter(Boolean) as HTMLElement[]);
    overlay.classList.remove('settled', 'shown');
    void overlay.offsetWidth;
    const showText = () => overlay.classList.add('shown');
    const settle = () => { if (settled) return; settled = true; overlay.classList.add('shown', 'settled'); skipHint.remove(); (btns.querySelector('.fzc-equip') as HTMLElement | null)?.focus({ preventScroll: true }); };
    let rv: { skip(): void; done: Promise<void> } | null = null;
    if (stage) {
      rv = stage.reveal(def, () => setTimeout(showText, 250));
      void rv.done.then(settle);
    } else {
      // 2D: the card pops in with a sparkle burst (or just fades with Reduce motion)
      requestAnimationFrame(() => { showText(); unlockFanfare(def.rarity); sparkle(); });
      setTimeout(settle, reduced() ? 50 : 1100);
    }
    const skip = () => { if (settled) return; if (rv) rv.skip(); else settle(); showText(); setTimeout(settle, rv ? 650 : 0); };
    const onTap = (e: Event) => { if ((e.target as HTMLElement).closest('button')) return; skip(); };
    const onKey = (e: KeyboardEvent) => modalKey(e, settled, skip, finish, btns);
    overlay.addEventListener('pointerdown', onTap);
    addEventListener('keydown', onKey, true);
    const cleanup = () => { overlay.removeEventListener('pointerdown', onTap); removeEventListener('keydown', onKey, true); };
  });
}

// ---------- a cosmetic (a smaller moment) ----------
function cosmeticMoment(overlay: HTMLElement, c: CosmeticDef): Promise<Choice> {
  return new Promise((resolve) => {
    overlay.style.setProperty('--rar', RARITY_COLOR[c.rarity]);
    overlay.dataset.rarity = c.rarity;
    overlay.classList.remove('settled');
    const finish = (x: Choice) => { removeEventListener('keydown', onKey, true); resolve(x); };
    const card = h('div', { class: 'fzc-card small' },
      h('div', { class: 'fzc-icon', 'aria-hidden': 'true' }, c.icon, ...Array.from({ length: 8 }, (_, i) => h('i', { class: 'fzc-spark', style: `--a:${i * 45}deg` }))),
      h('div', { class: 'fzc-text' },
        h('p', { class: 'fzc-kicker' }, `New ${SLOT_NAME[c.slot].toLowerCase()}!`),
        h('h2', { class: 'fzc-name' }, c.name),
        h('div', { class: 'fzc-tag' }, rarityTag(c.rarity)),
        h('p', { class: 'fzc-line' }, c.blurb)),
      buttons(finish, true));
    overlay.replaceChildren(card);
    void overlay.offsetWidth;
    overlay.classList.add('shown', 'settled', 'cos');
    sparkle(); setTimeout(sparkle, 160);
    (card.querySelector('.fzc-equip') as HTMLElement | null)?.focus({ preventScroll: true });
    const btns = card.querySelector('.fzc-btns') as HTMLElement;
    const onKey = (e: KeyboardEvent) => modalKey(e, true, () => {}, finish, btns);
    addEventListener('keydown', onKey, true);
  }).finally(() => overlay.classList.remove('cos')) as Promise<Choice>;
}
