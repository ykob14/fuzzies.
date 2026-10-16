/**
 * The Fuzzy Locker's 3D showroom: one Fuzzy on a podium in a soft collection-room light, its own small renderer (made when the Locker
 * opens, thrown away when it closes, paused while hidden). Drag to turn it all the way round (it keeps spinning after a flick), drag
 * up/down to look from lower or higher, wheel / pinch to zoom, double-tap to put it back; it turns slowly by itself when left alone
 * (not with Reduce motion) and looks at the pointer. Locked Fuzzies stand as a dark silhouette with their rarity's rim light — still
 * turnable, so players can see what they're aiming for; the secret one is a plain silhouette with a "?".
 * Also: `thumbnail(def)` — card pictures rendered one at a time in a shared offscreen renderer and cached.
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RARITY_COLOR, type CharacterDef, type Mood } from '../characters';
import type { CosmeticDef } from '../cosmetics';
import { buildCharacter, COSMETIC_MOVE, type CharacterRig } from '../character3d';
import { loadFur, furReady } from '../fur';
import { FxLayer } from '../effects';

export interface ShowOpts { locked: boolean; secret?: boolean; extra?: string | null; fx?: { trail?: string; jump?: string; celebration?: string } }
export interface Showroom {
  el: HTMLElement;
  show(def: CharacterDef, o: ShowOpts): Promise<void>;
  play(a: 'jump' | 'celebrate' | 'look'): void;
  mood(m: Mood): void;
  setExtra(id: string | null): void;
  /** effects used with the jump / celebration previews */
  setFx(fx: ShowOpts['fx']): void;
  /** try a cosmetic on the Fuzzy now (outfit pieces stay on until another `setExtra`) */
  preview(c: CosmeticDef): void;
  reset(): void;
  rig(): CharacterRig | null;
  /** a tap on the Fuzzy (not a drag) */
  onTap: (() => void) | null;
  dispose(): void;
}
const PI = Math.PI;
const reducedMotion = (): boolean => document.documentElement.dataset.motion === 'reduce' || matchMedia('(prefers-reduced-motion: reduce)').matches;
const SPARKS: Record<string, number> = { common: 14, rare: 22, epic: 30, legendary: 44, mythic: 60 };

let dotTex: THREE.Texture | null = null;
function dot(): THREE.Texture {
  if (dotTex) return dotTex;
  const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d')!;
  const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 32, 32); dotTex = new THREE.CanvasTexture(c); return dotTex;
}

/** the podium: a soft cream drum with a raspberry lip and a glowing rarity ring; the top is at y = -1 (the Fuzzy's feet) */
function podium(): { group: THREE.Group; ring: THREE.MeshStandardMaterial; dispose(): void } {
  const g = new THREE.Group();
  const geos: THREE.BufferGeometry[] = [], mats: THREE.Material[] = [];
  const add = (geo: THREE.BufferGeometry, m: THREE.Material, y = 0, shadow = false) => { geos.push(geo); if (!mats.includes(m)) mats.push(m); const x = new THREE.Mesh(geo, m); x.position.y = y; x.receiveShadow = true; x.castShadow = shadow; g.add(x); return x; };
  const cream = new THREE.MeshStandardMaterial({ color: '#f2ebe2', roughness: 0.78 });
  const lip = new THREE.MeshStandardMaterial({ color: '#d6336c', roughness: 0.45 });
  const base = new THREE.MeshStandardMaterial({ color: '#e5ddd2', roughness: 0.9 });
  const ring = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 1.2, roughness: 0.4 });
  add(new THREE.CylinderGeometry(1.32, 1.36, 0.2, 72), cream, -1.1);
  add(new THREE.TorusGeometry(1.33, 0.022, 8, 96).rotateX(PI / 2), lip, -1.0);
  add(new THREE.CylinderGeometry(1.62, 1.7, 0.16, 72), base, -1.28);
  add(new THREE.TorusGeometry(1.56, 0.02, 8, 96).rotateX(PI / 2), ring, -1.195);
  return { group: g, ring, dispose: () => { geos.forEach((x) => x.dispose()); mats.forEach((m) => m.dispose()); ring.dispose(); } };
}

export async function createShowroom(opts: { mobile: boolean }): Promise<Showroom> {
  const el = document.createElement('div'); el.className = 'fzl-stage';
  const canvas = document.createElement('canvas'); canvas.className = 'fzl-canvas'; canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', 'Your Fuzzy in 3D — drag to turn it');
  const hint = document.createElement('span'); hint.className = 'fzl-hint'; hint.textContent = 'Drag to turn';
  el.append(canvas, hint);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(renderer); const env = pm.fromScene(new RoomEnvironment(), 0.04).texture; pm.dispose();
  scene.environment = env; scene.environmentIntensity = 0.55;
  const hemi = new THREE.HemisphereLight('#fff8f0', '#b9b0a6', 0.9); scene.add(hemi);
  const key = new THREE.DirectionalLight('#fff3e2', 2.4); key.position.set(-3, 5.5, 4.5); key.castShadow = true;
  key.shadow.mapSize.set(opts.mobile ? 512 : 1024, opts.mobile ? 512 : 1024); Object.assign(key.shadow.camera, { left: -2.5, right: 2.5, top: 2.5, bottom: -2.5, near: 1, far: 16 }); key.shadow.bias = -0.0006; key.shadow.normalBias = 0.03; key.shadow.radius = 4;
  scene.add(key);
  const rim = new THREE.DirectionalLight('#ffffff', 1.6); rim.position.set(2.5, 2.5, -4.5); scene.add(rim);
  const fill = new THREE.DirectionalLight('#dfe8ff', 0.5); fill.position.set(4, 1, 3); scene.add(fill);
  const pod = podium(); scene.add(pod.group);
  const turn = new THREE.Group(); scene.add(turn);
  const fx = new FxLayer(1, 160); scene.add(fx.group);
  // light beam for the rarest Fuzzies
  const beamGeo = new THREE.CylinderGeometry(0.9, 2.2, 6, 40, 1, true); beamGeo.translate(0, 2.0, 0);
  const beamMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const beam = new THREE.Mesh(beamGeo, beamMat); scene.add(beam);
  // ambient sparkles drifting up
  const NP = 64, pPos = new Float32Array(NP * 3), pSeed = new Float32Array(NP);
  for (let i = 0; i < NP; i++) { const a = Math.random() * PI * 2, r = 1.2 + Math.random() * 1.6; pPos.set([Math.cos(a) * r, -1 + Math.random() * 3.5, Math.sin(a) * r - 0.3], i * 3); pSeed[i] = Math.random(); }
  const pGeo = new THREE.BufferGeometry(); pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  const pMat = new THREE.PointsMaterial({ map: dot(), size: 0.12, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: '#ffffff', opacity: 0.85 });
  const points = new THREE.Points(pGeo, pMat); scene.add(points);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);

  let rig: CharacterRig | null = null, current: CharacterDef | null = null, curOpts: ShowOpts = { locked: false };
  let extra: string | null = null, fxSel: NonNullable<ShowOpts['fx']> = {};
  let yaw = -0.45, pitch = 0.2, dist = 7.4, spin = 0, idle = 0, dragging = false, pop = 1, aspect = 1;
  let mystery: THREE.Sprite | null = null;
  const motion = !reducedMotion();
  const target = new THREE.Vector3(0, 0.2, 0);
  const frame = () => {
    const fit = Math.max(1, 0.82 / aspect) * (aspect > 1.6 ? 1.05 : 1);
    const d = dist * fit;
    camera.position.set(0, target.y + Math.sin(pitch) * d, Math.cos(pitch) * d); camera.lookAt(target);
  };
  const show = async (def: CharacterDef, o: ShowOpts): Promise<void> => {
    current = def; curOpts = o;
    if (!furReady()) await Promise.race([loadFur(), new Promise((r) => setTimeout(r, 6000))]);
    if (current !== def || dead) return;
    if (rig) { rig.dispose(); rig = null; }
    if (mystery) { turn.remove(mystery); mystery.material.dispose(); mystery = null; }
    extra = o.extra ?? null;
    if (o.fx) fxSel = o.fx;
    rig = buildCharacter(def, { r: 1, shadow: true, sound: true, locked: o.locked, accessories: !o.secret, extra: o.secret ? null : extra });
    rig.onEvent = (e) => {
      const at = new THREE.Vector3(0, -1, 0).applyMatrix4(turn.matrixWorld);
      if (e.kind === 'land' || e.kind === 'stomp') fx.land(fxSel.jump || 'jump-puff', at);
      if (e.kind === 'magic') fx.sparkles(new THREE.Vector3(0, 0.6, 0), RARITY_COLOR[def.rarity], 18, 0.9);
    };
    turn.add(rig.group);
    if (o.secret && o.locked) {
      const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d')!;
      g.fillStyle = '#ffffff'; g.font = '800 96px Fredoka, system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', 64, 70);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
      mystery = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, color: RARITY_COLOR[def.rarity], transparent: true, depthTest: false })); mystery.position.set(0, 1.55, 0); mystery.scale.setScalar(0.8); mystery.renderOrder = 30;
      turn.add(mystery);
    }
    // the rarity's light
    const rc = new THREE.Color(RARITY_COLOR[def.rarity]);
    rim.color.copy(rc).lerp(new THREE.Color('#ffffff'), o.locked ? 0.1 : 0.45); rim.intensity = o.locked ? 2.6 : 1.8;
    pod.ring.color.copy(rc); pod.ring.emissive.copy(rc);
    pMat.color.copy(rc).lerp(new THREE.Color('#ffffff'), 0.35);
    const n = SPARKS[def.rarity] ?? 14; pGeo.setDrawRange(0, motion ? n : Math.min(n, 12));
    beamMat.color.copy(rc); beamMat.opacity = def.rarity === 'mythic' ? 0.16 : def.rarity === 'legendary' ? 0.11 : def.rarity === 'epic' ? 0.05 : 0;
    el.style.setProperty('--rar', RARITY_COLOR[def.rarity]);
    el.classList.toggle('locked', o.locked);
    pop = motion ? 0 : 1;
    if (motion && !o.locked) setTimeout(() => rig?.emote(def.mood === 'sleepy' ? 'zzz' : 'heart'), 600);
  };

  // ---------- input: drag to turn (with a flick), up/down tilt, wheel + pinch zoom, double-tap reset, tap ----------
  const ptrs = new Map<number, { x: number; y: number }>();
  let last = { x: 0, y: 0, t: 0 }, down = { x: 0, y: 0, t: 0 }, lastTap = 0, pinch0 = 0, dist0 = dist, moved = 0;
  const reset = () => { yaw = -0.45; pitch = 0.2; dist = 7.4; spin = 0; };
  canvas.addEventListener('pointerdown', (e) => {
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try { canvas.setPointerCapture(e.pointerId); } catch { /* gone */ }
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); dist0 = dist; return; }
    dragging = true; idle = 0; spin = 0; moved = 0;
    last = down = { x: e.clientX, y: e.clientY, t: e.timeStamp };
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!ptrs.has(e.pointerId)) {
      // hover: the Fuzzy looks at the pointer
      if (rig && e.pointerType === 'mouse') { const r = canvas.getBoundingClientRect(); const nx = ((e.clientX - r.left) / r.width) * 2 - 1, ny = -((e.clientY - r.top) / r.height) * 2 + 1; const v = new THREE.Vector3(nx, ny, 0.5).unproject(camera).sub(camera.position).normalize(); const p = camera.position.clone().addScaledVector(v, camera.position.length() - 1.4); rig.lookAt(p); }
      return;
    }
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch0 > 0) dist = Math.max(4.2, Math.min(11, dist0 * (pinch0 / Math.max(10, d)))); return; }
    if (!dragging) return;
    const dx = e.clientX - last.x, dy = e.clientY - last.y, dt = Math.max(1, e.timeStamp - last.t) / 1000;
    moved += Math.abs(dx) + Math.abs(dy);
    yaw += dx * 0.011; pitch = Math.max(-0.05, Math.min(0.95, pitch + dy * 0.006));
    spin = ((dx * 0.011) / dt) * 0.55; last = { x: e.clientX, y: e.clientY, t: e.timeStamp };
    if (moved > 6) hint.classList.add('gone');
  });
  const up = (e: PointerEvent) => {
    if (!ptrs.has(e.pointerId)) return;
    ptrs.delete(e.pointerId);
    if (ptrs.size) return;
    if (dragging && moved < 8 && e.timeStamp - down.t < 350) {
      if (e.timeStamp - lastTap < 320) { reset(); lastTap = 0; } else { lastTap = e.timeStamp; setTimeout(() => { if (lastTap && performance.now() - lastTap >= 300) room.onTap?.(); }, 330); }
    }
    dragging = false; pinch0 = 0;
    if (!motion) spin = 0;
  };
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('pointerleave', () => rig?.lookAt(null));
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); const k = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1; dist = Math.max(4.2, Math.min(11, dist * Math.exp(e.deltaY * k * 0.0012))); idle = 0; }, { passive: false });
  canvas.addEventListener('dblclick', (e) => { e.preventDefault(); reset(); });
  canvas.style.touchAction = 'none';

  // ---------- the loop (paused while hidden) ----------
  let raf = 0, prev = performance.now(), dead = false, visible = true, t = 0;
  const size = () => { const r = el.getBoundingClientRect(); const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height)); renderer.setSize(w, h, false); aspect = w / h; camera.aspect = aspect; camera.updateProjectionMatrix(); };
  const ro = new ResizeObserver(size); ro.observe(el);
  const io = new IntersectionObserver((es) => { visible = es.some((x) => x.isIntersecting); if (visible) wake(); }, { threshold: 0.01 }); io.observe(el);
  const onVis = () => { if (!document.hidden) wake(); };
  document.addEventListener('visibilitychange', onVis);
  function wake(): void { if (!raf && !dead) { prev = performance.now(); raf = requestAnimationFrame(loop); } }
  function loop(now: number): void {
    raf = 0;
    if (dead || document.hidden || !visible) return;
    const dt = Math.min(0.05, Math.max(0, (now - prev) / 1000)); prev = now; t += dt;
    if (!dragging) {
      idle += dt;
      const cruise = motion && idle > 2.5 && !(rig?.busy()) ? 0.28 : 0;
      spin += (cruise - spin) * Math.min(1, dt * (Math.abs(spin) > 0.6 ? 1.6 : 1.1));
      yaw += spin * dt;
    }
    turn.rotation.y = yaw;
    if (pop < 1) { pop = Math.min(1, pop + dt * 2.6); const k = pop; const s = 1 - Math.pow(1 - k, 3) * Math.cos(k * 9) * 0.9; turn.scale.setScalar(Math.max(0.05, Math.min(1.12, s))); } else turn.scale.setScalar(1);
    turn.updateMatrixWorld();
    rig?.tick(t, dt);
    if (mystery) { mystery.position.y = 1.55 + Math.sin(t * 2) * 0.08; mystery.material.opacity = 0.7 + Math.sin(t * 3) * 0.3; }
    // ambient sparkles
    const pa = pGeo.attributes.position as THREE.BufferAttribute;
    if (motion) for (let i = 0; i < NP; i++) { let y = pa.getY(i) + dt * (0.18 + pSeed[i] * 0.3); if (y > 2.6) y = -1.1; pa.setY(i, y); pa.setX(i, pa.getX(i) + Math.sin(t * 0.8 + pSeed[i] * 20) * dt * 0.05); }
    pa.needsUpdate = true;
    pMat.opacity = 0.55 + Math.sin(t * 2.2) * 0.25;
    beam.rotation.y = t * 0.2;
    fx.update(dt);
    frame();
    renderer.render(scene, camera);
    raf = requestAnimationFrame(loop);
  }
  size(); frame(); wake();

  const room: Showroom = {
    el, show,
    play(a) {
      if (!rig || !current) return;
      idle = 0;
      if (a === 'celebrate') {
        const move = COSMETIC_MOVE[fxSel.celebration ?? ''] || undefined;
        const d = rig.play('celebrate', move);
        if (d) setTimeout(() => fx.celebrate(fxSel.celebration || 'cele-spin', new THREE.Vector3(0, -1, 0)), 250);
      } else if (a === 'jump') {
        const d = rig.play('jump');
        if (d && fxSel.trail && fxSel.trail !== 'trail-none') { let k = 0; const iv = setInterval(() => { if (!rig || ++k > d * 30) return clearInterval(iv); fx.trail(fxSel.trail!, rig.core.getWorldPosition(new THREE.Vector3()), 1 / 30, 1.2); }, 33); }
      } else rig.play('look');
    },
    mood(m) { idle = 0; rig?.setMood(m); },
    setExtra(id) { extra = id; if (!curOpts.secret) rig?.setExtra(id); },
    setFx(f) { if (f) fxSel = { ...fxSel, ...f }; },
    preview(c) {
      if (!rig) return;
      if (c.slot === 'extra') { room.setExtra(c.id === 'extra-none' ? null : c.id); rig.emote('sparkle'); return; }
      if (c.slot === 'trail') { fxSel.trail = c.id; room.play('jump'); return; }
      if (c.slot === 'jump') { fxSel.jump = c.id; room.play('jump'); return; }
      fxSel.celebration = c.id; room.play('celebrate');
    },
    reset,
    rig: () => rig,
    onTap: null,
    dispose() {
      dead = true; cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); document.removeEventListener('visibilitychange', onVis);
      rig?.dispose(); rig = null; fx.dispose();
      if (mystery) mystery.material.dispose();
      pod.dispose(); beamGeo.dispose(); beamMat.dispose(); pGeo.dispose(); pMat.dispose(); env.dispose();
      renderer.dispose(); renderer.forceContextLoss(); el.remove();
    },
  };
  return room;
}

// ---------- card pictures: one shared offscreen renderer, one picture at a time, cached ----------
interface ThumbJob { key: string; def: CharacterDef; locked: boolean; size: number; resolve: (s: string) => void }
const thumbCache = new Map<string, string>();
const thumbWait = new Map<string, Promise<string>>();
const queue: ThumbJob[] = [];
let tr: { renderer: THREE.WebGLRenderer; scene: THREE.Scene; camera: THREE.PerspectiveCamera; env: THREE.Texture } | null = null;
let running = false;
function thumbRenderer() {
  if (tr) return tr;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.NeutralToneMapping; renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(renderer); const env = pm.fromScene(new RoomEnvironment(), 0.04).texture; pm.dispose();
  scene.environment = env; scene.environmentIntensity = 0.6;
  scene.add(new THREE.HemisphereLight('#fff8f0', '#b9b0a6', 1.0));
  const key = new THREE.DirectionalLight('#fff3e2', 2.3); key.position.set(-3, 5, 5); scene.add(key);
  const rimL = new THREE.DirectionalLight('#ffffff', 1.3); rimL.position.set(3, 2, -4); scene.add(rimL);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  const yaw = 0.38, d = 7.6; camera.position.set(Math.sin(yaw) * d, 1.35, Math.cos(yaw) * d); camera.lookAt(0, 0.28, 0);
  tr = { renderer, scene, camera, env };
  return tr;
}
async function pump(): Promise<void> {
  if (running) return;
  running = true;
  try {
    // wait for the real fur ball (a slow phone can take a while); only a failed load falls back to the drawn Fuzzy
    if (!furReady()) await loadFur().catch(() => false);
    while (queue.length) {
      const job = queue.shift()!;
      await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
      let url = '';
      try {
        const { renderer, scene, camera } = thumbRenderer();
        renderer.setSize(job.size, job.size, false);
        const rig = buildCharacter(job.def, { r: 1, shadow: false, locked: job.locked, accessories: !(job.locked && job.def.unlock.kind === 'secret') });
        scene.add(rig.group);
        for (let k = 0; k <= 3; k++) rig.tick(1.2 + k * 0.1, 0.1);
        renderer.render(scene, camera);
        url = renderer.domElement.toDataURL('image/png');
        rig.dispose();
      } catch (e) { console.warn('thumbnail failed', e); }
      if (url && furReady()) thumbCache.set(job.key, url); // never keep a fallback picture
      thumbWait.delete(job.key);
      job.resolve(url);
    }
  } finally { running = false; }
}
/** A transparent PNG of the Fuzzy (3/4 view), or '' if 3D isn't available. Cached per Fuzzy + look. */
export function thumbnail(def: CharacterDef, o: { locked?: boolean; size?: number } = {}): Promise<string> {
  const size = o.size ?? 200, locked = !!o.locked;
  const key = `${def.id}|${def.fx}|${locked ? 'L' : 'O'}|${size}`;
  const hit = thumbCache.get(key); if (hit) return Promise.resolve(hit);
  const w = thumbWait.get(key); if (w) return w;
  const p = new Promise<string>((resolve) => { queue.push({ key, def, locked, size, resolve }); });
  thumbWait.set(key, p);
  void pump();
  return p;
}
/** the picture if it's already made */
export const cachedThumbnail = (def: CharacterDef, locked: boolean, size = 200): string | undefined => thumbCache.get(`${def.id}|${def.fx}|${locked ? 'L' : 'O'}|${size}`);
/** drop the queue and the offscreen renderer (the cached pictures stay) */
export function disposeThumbnails(): void {
  for (const j of queue.splice(0)) { thumbWait.delete(j.key); j.resolve(''); }
  if (tr) { tr.env.dispose(); tr.renderer.dispose(); tr.renderer.forceContextLoss(); tr = null; }
}
