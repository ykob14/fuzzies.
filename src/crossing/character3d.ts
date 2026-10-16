/**
 * A Fuzzy Crossing character in 3D: the owner's own fur-ball model (never a new body) with its fur finish (`fur.ts`), its
 * accessories (`accessories.ts`) and an optional outfit piece, brought to life:
 *  - idle breathing + body language per `Mood` (happy bounce, cool lean, sleepy droop, proud puff, silly wobble, fierce lean, calm sway)
 *  - its own jump (`JumpStyle`: bounce, hop, spring, glide, twirl, bunny, stomp, float, zoom) and celebration (`CelebrateStyle`: spin,
 *    backflip, dance, cheer, salute, bow, flex, giggle, magic, roar) — squash & stretch about the feet, rotations about the middle
 *  - blinks (and a wink) on the model's own eyelids — the face itself is never redrawn
 *  - looking at a point (the whole ball turns), little emote bubbles (hearts, sparkles, notes, zzz, !, ?, stars, "hehe")
 *  - a locked "mystery" look: a dark silhouette with a rarity-coloured rim.
 * If the model can't load, the drawn Fuzzy (`models3d.makeFuzzy`) stands in with the same accessories.
 * `rig.model` has the `FuzzyModel` shape the game's view expects.
 */
import * as THREE from 'three';
import { RARITY_COLOR, type CelebrateStyle, type CharacterDef, type JumpStyle, type Mood } from './characters';
import { furMaterial, furReady, furSrc, lidMaterial, lookOf, setBlink, setLocked as lockFur, silhouetteMaterial, tickFur } from './fur';
import { buildPart, disposePart, type PartCtx } from './accessories';
import { characterVoice } from './audio';
import * as M3 from '../game/models3d';

export type Emote = 'heart' | 'sparkle' | 'note' | 'zzz' | 'bang' | 'question' | 'star' | 'hehe';
export type RigEvent = { kind: 'launch' | 'land' | 'stomp' | 'peak' | 'spin' | 'magic' | 'roar' | 'cheer' | 'done'; strength?: number };
export interface RigOpts {
  /** the ball's radius in world units */
  r: number;
  /** an outfit piece from cosmetics.ts ('extra-…'), or none */
  extra?: string | null;
  shadow?: boolean;
  locked?: boolean;
  /** false = just the body (e.g. the tiny nest Fuzzies on phones) */
  accessories?: boolean;
  /** play the Fuzzy's voice with its moves */
  sound?: boolean;
  /** use the drawn Fuzzy even if the model is there (Settings → Deluxe 3D Fuzzies off) */
  classic?: boolean;
}
interface Pose { y: number; x: number; z: number; rx: number; ry: number; rz: number; sy: number; sxz: number; s: number }
const pose0 = (): Pose => ({ y: 0, x: 0, z: 0, rx: 0, ry: 0, rz: 0, sy: 1, sxz: 1, s: 1 });
const PI = Math.PI, TAU = PI * 2;
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const ease = (k: number) => { k = clamp01(k); return k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2; };
const bump = (p: number, a: number, b: number) => (p <= a || p >= b ? 0 : Math.sin(((p - a) / (b - a)) * PI));

/** a jump arc in units of the radius: crouch → air (parabola) → landing squash that rings out */
function arc(p: Pose, k: number, o: { c: number; b: number; h: number; st?: number; sq?: number; cd?: number; ring?: number }): void {
  const { c, b } = o;
  if (k < c) { const q = Math.sin((k / c) * PI * 0.5); p.sy *= 1 - (o.cd ?? 0.16) * q; p.sxz *= 1 + (o.cd ?? 0.16) * 0.6 * q; return; }
  if (k < b) {
    const u = (k - c) / (b - c);
    p.y += o.h * 4 * u * (1 - u);
    const st = (o.st ?? 0.14) * Math.abs(1 - 2 * u) ** 1.5;
    p.sy *= 1 + st; p.sxz *= 1 - st * 0.45;
    return;
  }
  const v = (k - b) / (1 - b);
  const sq = (o.sq ?? 0.2) * Math.exp(-v * 4.2) * Math.cos(v * PI * (o.ring ?? 2.2));
  p.sy *= 1 - sq; p.sxz *= 1 + sq * 0.55;
}

interface Clip { name: string; dur: number; t: number; f: (p: Pose, k: number, t: number) => void; ev: [number, RigEvent['kind'], number?][]; fired: number }

const JUMPS: Record<JumpStyle, { dur: number; f: Clip['f']; ev: Clip['ev'] }> = {
  bounce: { dur: 0.72, f: (p, k) => arc(p, k, { c: 0.16, b: 0.72, h: 1.1 }), ev: [[0.16, 'launch'], [0.72, 'land', 0.6]] },
  hop: { dur: 0.48, f: (p, k) => { arc(p, k, { c: 0.12, b: 0.68, h: 0.6, st: 0.08, sq: 0.12 }); p.rx -= bump(k, 0.12, 0.68) * 0.12; }, ev: [[0.12, 'launch'], [0.68, 'land', 0.35]] },
  spring: { dur: 1.0, f: (p, k) => arc(p, k, { c: 0.3, b: 0.72, h: 1.8, st: 0.32, sq: 0.3, cd: 0.32, ring: 4.5 }), ev: [[0.3, 'launch'], [0.72, 'land', 0.8]] },
  glide: { dur: 1.2, f: (p, k) => {
    const c = 0.12, b = 0.88;
    if (k < c || k > b) { arc(p, k, { c, b, h: 0, sq: 0.12 }); return; }
    const u = (k - c) / (b - c);
    p.y += 1.0 * Math.sin(Math.min(1, u * 1.6) * PI * 0.5) * (1 - ease((u - 0.65) / 0.35)); // up fast, hang, glide down
    p.rx += 0.18 * Math.sin(u * PI); p.rz += 0.16 * Math.sin(u * TAU); p.ry += 0.25 * Math.sin(u * PI);
  }, ev: [[0.12, 'launch'], [0.88, 'land', 0.3]] },
  twirl: { dur: 0.95, f: (p, k) => { arc(p, k, { c: 0.15, b: 0.78, h: 1.35 }); p.ry += TAU * ease((k - 0.15) / 0.63); }, ev: [[0.15, 'launch'], [0.4, 'spin'], [0.78, 'land', 0.5]] },
  bunny: { dur: 0.95, f: (p, k) => { if (k < 0.5) arc(p, k / 0.5, { c: 0.15, b: 0.75, h: 0.7, sq: 0.12 }); else arc(p, (k - 0.5) / 0.5, { c: 0.05, b: 0.7, h: 0.85, sq: 0.18 }); p.rz += Math.sin(k * TAU * 2) * 0.06; }, ev: [[0.075, 'launch'], [0.375, 'land', 0.25], [0.53, 'launch'], [0.85, 'land', 0.45]] },
  stomp: { dur: 0.9, f: (p, k) => {
    const c = 0.25, b = 0.68;
    if (k < c) { const q = Math.sin((k / c) * PI * 0.5); p.sy *= 1 - 0.26 * q; p.sxz *= 1 + 0.18 * q; p.rx += 0.12 * q; return; }
    if (k < b) { const u = (k - c) / (b - c); const h = u < 0.6 ? Math.sin((u / 0.6) * PI * 0.5) : 1 - ((u - 0.6) / 0.4) ** 2; p.y += 1.25 * h; p.sy *= 1 + (u > 0.75 ? 0.22 : 0.05); p.sxz *= u > 0.75 ? 0.88 : 1; p.rx -= 0.15 * Math.sin(u * PI); return; }
    const v = (k - b) / (1 - b); const sq = 0.38 * Math.exp(-v * 5) * Math.cos(v * PI * 2); p.sy *= 1 - sq; p.sxz *= 1 + sq * 0.6;
  }, ev: [[0.25, 'launch'], [0.68, 'stomp', 1]] },
  float: { dur: 1.5, f: (p, k) => { const up = ease(k / 0.35), down = ease((k - 0.68) / 0.32); p.y += 0.9 * (up - down) + Math.sin(k * TAU * 1.5) * 0.06 * up * (1 - down); p.rz += Math.sin(k * TAU) * 0.08; p.ry += Math.sin(k * PI) * 0.4; }, ev: [[0.02, 'launch'], [0.98, 'land', 0.15]] },
  zoom: { dur: 0.75, f: (p, k) => {
    const c = 0.22, b = 0.7;
    if (k < c) { const q = Math.sin((k / c) * PI * 0.5); p.rx -= 0.35 * q; p.sy *= 1 - 0.2 * q; p.sxz *= 1 + 0.12 * q; return; }
    if (k < b) { const u = (k - c) / (b - c); p.y += 1.5 * Math.sin(u * PI) ** 0.7; const st = 0.38 * (1 - u) ** 2; p.sy *= 1 + st; p.sxz *= 1 - st * 0.5; p.rx -= 0.3 * (1 - u); return; }
    const v = (k - b) / (1 - b); const sq = 0.24 * Math.exp(-v * 5) * Math.cos(v * PI * 2.4); p.sy *= 1 - sq; p.sxz *= 1 + sq * 0.6;
  }, ev: [[0.22, 'launch'], [0.7, 'land', 0.6]] },
};

const CELEBRATIONS: Record<CelebrateStyle, { dur: number; f: Clip['f']; ev: Clip['ev']; emote?: Emote }> = {
  spin: { dur: 1.5, f: (p, k) => { arc(p, k, { c: 0.15, b: 0.72, h: 1.0 }); p.ry += TAU * 2 * ease((k - 0.12) / 0.64); }, ev: [[0.15, 'launch'], [0.4, 'spin'], [0.72, 'land', 0.5], [0.8, 'cheer']], emote: 'star' },
  backflip: { dur: 1.4, f: (p, k) => { arc(p, k, { c: 0.2, b: 0.72, h: 1.7, st: 0.2 }); p.rx -= TAU * ease((k - 0.22) / 0.48); }, ev: [[0.2, 'launch'], [0.46, 'spin'], [0.72, 'land', 0.7], [0.8, 'cheer']], emote: 'star' },
  dance: { dur: 2.2, f: (p, k) => { const b = k * 8; p.y += Math.abs(Math.sin(b * PI)) * 0.25 * (1 - ease((k - 0.85) / 0.15)); p.rz += Math.sin(b * PI * 0.5) * 0.28; p.ry += Math.sin(k * TAU * 2) * 0.5; p.x += Math.sin(b * PI * 0.5) * 0.12; p.sy *= 1 + Math.sin(b * PI) * 0.05; }, ev: [[0.05, 'cheer']], emote: 'note' },
  cheer: { dur: 1.7, f: (p, k) => { for (const [a, b, h] of [[0, 0.3, 0.55], [0.3, 0.6, 0.75], [0.6, 0.96, 1.15]] as [number, number, number][]) if (k >= a && k < b) arc(p, (k - a) / (b - a), { c: 0.12, b: 0.8, h, st: 0.18, sq: 0.15 }); p.rz += Math.sin(k * TAU * 3) * 0.06; }, ev: [[0.04, 'launch'], [0.3, 'land', 0.3], [0.6, 'land', 0.35], [0.66, 'cheer'], [0.96, 'land', 0.5]], emote: 'heart' },
  salute: { dur: 1.9, f: (p, k) => { const tilt = ease(k / 0.18) * (1 - ease((k - 0.7) / 0.2)); p.rz -= 0.28 * tilt; p.rx -= 0.08 * tilt; p.sy *= 1 + 0.06 * tilt; p.ry += 0.25 * tilt; if (k > 0.75) arc(p, (k - 0.75) / 0.25, { c: 0.2, b: 0.7, h: 0.45, sq: 0.15 }); }, ev: [[0.15, 'cheer']], emote: 'star' },
  bow: { dur: 2.0, f: (p, k) => { const d = ease(k / 0.3) * (1 - ease((k - 0.62) / 0.25)); p.rx += 0.62 * d; p.y -= 0.05 * d; p.sy *= 1 - 0.06 * d; if (k > 0.86) arc(p, (k - 0.86) / 0.14, { c: 0.1, b: 0.7, h: 0.3, sq: 0.1 }); }, ev: [[0.3, 'cheer']], emote: 'heart' },
  flex: { dur: 1.9, f: (p, k) => { const puff = ease(k / 0.25) * (1 - ease((k - 0.75) / 0.25)); const pulse = 1 + Math.max(0, Math.sin(k * TAU * 3)) * 0.05 * puff; p.s *= 1 + 0.14 * puff * pulse; p.rx -= 0.1 * puff; p.rz += Math.sin(k * 70) * 0.025 * puff; p.y += 0.06 * puff; }, ev: [[0.25, 'cheer']], emote: 'sparkle' },
  giggle: { dur: 1.8, f: (p, k) => { const g = bump(k, 0.05, 0.95); p.sy *= 1 + Math.sin(k * 90) * 0.045 * g; p.sxz *= 1 - Math.sin(k * 90) * 0.03 * g; p.rz += Math.sin(k * 40) * 0.12 * g; p.y += Math.abs(Math.sin(k * 45)) * 0.06 * g; p.ry += Math.sin(k * 7) * 0.3 * g; }, ev: [[0.05, 'cheer']], emote: 'hehe' },
  magic: { dur: 2.2, f: (p, k) => { const up = ease(k / 0.3), down = ease((k - 0.72) / 0.28); p.y += 0.65 * (up - down) + Math.sin(k * TAU * 2) * 0.05 * up; p.ry += TAU * ease((k - 0.15) / 0.7); p.s *= 1 + 0.06 * Math.sin(k * PI); }, ev: [[0.2, 'magic'], [0.5, 'magic'], [0.95, 'land', 0.2]], emote: 'sparkle' },
  roar: { dur: 1.7, f: (p, k) => {
    const back = ease(k / 0.3) * (1 - ease((k - 0.3) / 0.12)), lunge = ease((k - 0.32) / 0.1) * (1 - ease((k - 0.75) / 0.25));
    p.rx += -0.3 * back + 0.32 * lunge; p.s *= 1 + 0.12 * lunge; p.z += 0.15 * lunge; p.rz += Math.sin(k * 80) * 0.05 * lunge; p.sy *= 1 + 0.06 * back;
  }, ev: [[0.36, 'roar']], emote: 'bang' },
};

const MOOD_LOOK: Record<Mood, (p: Pose, t: number) => void> = {
  happy: (p, t) => { p.y += Math.max(0, Math.sin(t * 3.4)) ** 6 * 0.1; p.rz += Math.sin(t * 1.7) * 0.03; },
  cool: (p, t) => { p.rx -= 0.07; p.ry += Math.sin(t * 0.6) * 0.18; p.rz += Math.sin(t * 1.2) * 0.04; },
  sleepy: (p, t) => { p.rx += 0.1 + Math.sin(t * 0.8) * 0.04; p.sy *= 1 + Math.sin(t * 1.2) * 0.03; p.rz += Math.sin(t * 0.5) * 0.08; },
  proud: (p, t) => { p.rx -= 0.08; p.s *= 1.03; p.ry += Math.sin(t * 0.5) * 0.15; },
  silly: (p, t) => { p.rz += Math.sin(t * 2.2) * 0.13; p.y += Math.abs(Math.sin(t * 2.2)) * 0.04; },
  fierce: (p, t) => { p.rx += 0.1; p.rz += Math.sin(t * 23) * 0.006; p.sxz *= 1.02; },
  calm: (p, t) => { p.rz += Math.sin(t * 1.1) * 0.05; p.ry += Math.sin(t * 0.45) * 0.12; },
};
export const MOOD_EMOTE: Record<Mood, Emote> = { happy: 'heart', cool: 'sparkle', sleepy: 'zzz', proud: 'star', silly: 'hehe', fierce: 'bang', calm: 'note' };
export const MOOD_NAME: Record<Mood, string> = { happy: 'Happy', cool: 'Cool', sleepy: 'Sleepy', proud: 'Proud', silly: 'Silly', fierce: 'Fierce', calm: 'Calm' };

// ---------- emote bubbles (drawn once on canvases) ----------
const emoteTex = new Map<Emote, THREE.Texture>();
function emoteTexture(e: Emote): THREE.Texture {
  let t = emoteTex.get(e);
  if (t) return t;
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d')!;
  const bubble = () => { g.fillStyle = '#ffffff'; g.strokeStyle = 'rgba(24,23,28,0.12)'; g.lineWidth = 4; g.beginPath(); g.arc(64, 60, 50, 0, TAU); g.fill(); g.stroke(); g.beginPath(); g.moveTo(40, 96); g.lineTo(30, 120); g.lineTo(60, 104); g.closePath(); g.fill(); };
  const heart = (x: number, y: number, s: number, fill: string) => { g.fillStyle = fill; g.beginPath(); g.moveTo(x, y + s * 0.9); g.bezierCurveTo(x - s * 1.3, y, x - s * 0.8, y - s * 1.0, x, y - s * 0.35); g.bezierCurveTo(x + s * 0.8, y - s * 1.0, x + s * 1.3, y, x, y + s * 0.9); g.fill(); };
  const star = (x: number, y: number, ro: number, ri: number, n: number, fill: string) => { g.fillStyle = fill; g.beginPath(); for (let i = 0; i <= n * 2; i++) { const a = -PI / 2 + (i / (n * 2)) * TAU, r = i % 2 ? ri : ro; const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r; i ? g.lineTo(px, py) : g.moveTo(px, py); } g.fill(); };
  const text = (s: string, size: number, fill: string) => { g.fillStyle = fill; g.font = `800 ${size}px Fredoka, "DM Sans", system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(s, 64, 62); };
  switch (e) {
    case 'heart': heart(64, 66, 44, '#ff4f8b'); g.fillStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.ellipse(46, 50, 9, 6, -0.6, 0, TAU); g.fill(); break;
    case 'sparkle': star(64, 64, 56, 14, 4, '#ffd23f'); star(100, 28, 18, 5, 4, '#fff1a8'); break;
    case 'star': star(64, 64, 54, 24, 5, '#ffc93c'); g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.ellipse(52, 48, 8, 5, -0.5, 0, TAU); g.fill(); break;
    case 'note': bubble(); g.fillStyle = '#d6336c'; g.beginPath(); g.ellipse(52, 82, 14, 10, -0.4, 0, TAU); g.fill(); g.fillRect(62, 30, 7, 52); g.beginPath(); g.moveTo(62, 30); g.quadraticCurveTo(84, 34, 86, 54); g.quadraticCurveTo(80, 42, 69, 42); g.fill(); break;
    case 'zzz': bubble(); g.fillStyle = '#5b6cff'; g.font = '800 34px Fredoka, system-ui, sans-serif'; g.textAlign = 'center'; g.fillText('z', 44, 78); g.font = '800 44px Fredoka, system-ui, sans-serif'; g.fillText('Z', 74, 58); break;
    case 'bang': bubble(); text('!', 72, '#ff5a1f'); break;
    case 'question': bubble(); text('?', 70, '#3d8bfd'); break;
    case 'hehe': bubble(); text('hehe', 34, '#d6336c'); break;
  }
  t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  emoteTex.set(e, t);
  return t;
}

let fallbackMats: M3.Mats | null = null;

export interface CharacterRig {
  def: CharacterDef;
  group: THREE.Group;
  /** the squash target the game's view scales (pivot at the centre) */
  body: THREE.Group;
  radius: number;
  /** the shape the game's view expects (no pupils/eyes to move: the face is the owner's) */
  model: M3.FuzzyModel;
  /** is this the owner's model (true) or the drawn stand-in (false)? */
  glb: boolean;
  tick(t: number, dt: number): void;
  play(anim: 'jump' | 'celebrate' | 'look' | 'idle', style?: string): number;
  /** in-game: the Fuzzy is k (0…1) through a hop; adds its own style on top of the game's arc */
  gameHop(k: number): void;
  /** in-game: just landed */
  gameLand(): void;
  setMood(m: Mood | null): void;
  emote(e: Emote): void;
  lookAt(world: THREE.Vector3 | null): void;
  blink(): void;
  wink(): void;
  setLocked(on: boolean): void;
  setExtra(id: string | null): void;
  busy(): boolean;
  onEvent: ((e: RigEvent) => void) | null;
  dispose(): void;
}

/** Build a Fuzzy. Call `loadFur()` first for the owner's model (without it the drawn stand-in is used). */
export function buildCharacter(def: CharacterDef, opts: RigOpts): CharacterRig {
  const r = opts.r;
  const group = new THREE.Group(); group.name = `fuzzy-${def.id}`;
  const body = new THREE.Group(); group.add(body);
  const motion = new THREE.Group(); motion.rotation.order = 'YXZ'; body.add(motion);
  const squash = new THREE.Group(); squash.position.y = -r; motion.add(squash);
  const inner = new THREE.Group(); inner.position.y = r; squash.add(inner);
  const emotes = new THREE.Group(); group.add(emotes);
  const look = lookOf(def);
  const rim = RARITY_COLOR[def.rarity];
  const useGlb = furReady() && !opts.classic;
  let furMat: THREE.MeshStandardMaterial | null = null, lidMat: THREE.MeshStandardMaterial | null = null, lids: THREE.Mesh | null = null;
  let fallback: M3.FuzzyModel | null = null;
  const owned: THREE.Material[] = [];
  if (useGlb) {
    const src = furSrc()!;
    const k = r / 0.45; // the model's ball: centre at 0.45 of its height, radius 0.45 (top of the head ≈ 0.92 r)
    furMat = furMaterial(look); owned.push(furMat);
    const fm = new THREE.Mesh(src.geo, furMat); fm.scale.setScalar(k); fm.position.y = -0.45 * k; fm.receiveShadow = true; fm.castShadow = false;
    inner.add(fm);
    lidMat = lidMaterial(look); owned.push(lidMat);
    lids = new THREE.Mesh(src.lid, lidMat); lids.scale.setScalar(k); lids.position.y = -0.45 * k; lids.visible = false;
    inner.add(lids);
  } else {
    fallbackMats ??= M3.makeMaterials();
    fallback = M3.makeFuzzy(fallbackMats, def.color, r * 0.8, r * 0.2, 12, { metallic: def.fx === 'gold' });
    inner.add(fallback.group);
  }
  if (opts.shadow !== false) {
    // the shadow comes from a small invisible ball, not the 14,600-triangle model
    const sh = new THREE.Mesh(new THREE.IcosahedronGeometry(r * 0.95, 1), new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }));
    sh.castShadow = true; inner.add(sh);
    owned.push(sh.material as THREE.Material);
    sh.userData.shadowBall = true;
  }
  // accessories, in unit space scaled to the radius
  const parts = new THREE.Group(); parts.scale.setScalar(r); inner.add(parts);
  const ctx: PartCtx = { c0: def.color[0], c1: def.color[1], def };
  if (opts.accessories !== false) for (const n of def.parts) parts.add(buildPart(n, ctx));
  let extraObj: THREE.Object3D | null = null;
  const ticks: ((t: number, dt: number) => void)[] = [];
  const collect = () => { ticks.length = 0; parts.traverse((o) => { if (typeof o.userData.tick === 'function') ticks.push(o.userData.tick); }); };
  const shadows = (o: THREE.Object3D) => o.traverse((x) => { const m = x as THREE.Mesh; if (m.isMesh && !x.userData.shadowBall) { m.castShadow = opts.shadow !== false && !(m.material as THREE.Material).transparent; } });
  function setExtra(id: string | null): void {
    if (extraObj) { parts.remove(extraObj); disposePart(extraObj); extraObj = null; }
    if (id && id !== 'extra-none' && opts.accessories !== false) { extraObj = buildPart(id, ctx); parts.add(extraObj); shadows(extraObj); if (locked) silhouette(extraObj, true); }
    collect();
  }
  shadows(parts);
  let locked = false;
  const sil = silhouetteMaterial(rim); owned.push(sil);
  function silhouette(o: THREE.Object3D, on: boolean): void {
    o.traverse((x) => {
      const m = x as THREE.Mesh;
      if ((m as unknown as THREE.Sprite).isSprite) { x.visible = !on; return; }
      if (!m.isMesh || x.userData.shadowBall) return;
      if (on) { if (!x.userData.realMat) x.userData.realMat = m.material; m.material = sil; }
      else if (x.userData.realMat) { m.material = x.userData.realMat; delete x.userData.realMat; }
    });
  }
  function setLocked(on: boolean): void {
    locked = on;
    if (furMat) lockFur(furMat, on, rim);
    if (fallback) silhouette(fallback.group, on);
    silhouette(parts, on);
    if (on && lids) lids.visible = false;
  }
  setExtra(opts.extra ?? null);
  if (opts.locked) setLocked(true);

  const model: M3.FuzzyModel = { group, body, face: new THREE.Group(), pupils: [], eyes: fallback?.eyes ?? [], mouth: fallback?.mouth ?? null, shells: fallback?.shells ?? [], radius: r };
  // the game's view rotates `face` — give it a harmless empty group inside the body
  body.add(model.face);

  // ---------- life ----------
  const voice = opts.sound ? characterVoice(def) : null;
  let clip: Clip | null = null;
  let mood: Mood = def.mood, moodUntil = 0;
  let blinkIn = 1 + Math.random() * 2, blinkL = 0, blinkR = 0, blinkT = 0, winkT = 0;
  const lookCur = { yaw: 0, pitch: 0 }, lookWant = { yaw: 0, pitch: 0 };
  let lookTarget: THREE.Vector3 | null = null;
  const tmp = new THREE.Vector3();
  let game: { k: number; on: boolean } = { k: 0, on: false };
  const bubbles: { s: THREE.Sprite; t: number }[] = [];
  let time = 0;
  let onEvent: ((e: RigEvent) => void) | null = null;

  function fire(kind: RigEvent['kind'], strength?: number): void {
    if (voice) {
      if (kind === 'launch' && clip?.name === 'jump') voice.hop(def.jump);
      if (kind === 'land' || kind === 'stomp') voice.land(def.jump);
    }
    rig.onEvent?.({ kind, strength });
  }
  function start(name: string, d: { dur: number; f: Clip['f']; ev: Clip['ev'] }): number {
    clip = { name, dur: d.dur, t: 0, f: d.f, ev: d.ev, fired: 0 };
    return d.dur;
  }
  const LOOK_AROUND = { dur: 2.6, f: ((p: Pose, k: number) => { p.ry += 0.7 * Math.sin(k * TAU) * (1 - ease((k - 0.8) / 0.2)); p.rx += -0.12 * bump(k, 0.15, 0.45) + 0.08 * bump(k, 0.55, 0.8); p.rz += 0.08 * Math.sin(k * TAU); }) as Clip['f'], ev: [] as Clip['ev'] };
  const GAME_LAND: Record<JumpStyle, { dur: number; f: Clip['f']; ev: Clip['ev'] }> = {
    bounce: { dur: 0.3, f: (p, k) => { const s = 0.16 * Math.exp(-k * 5) * Math.cos(k * 8); p.sy *= 1 - s; p.sxz *= 1 + s * 0.6; }, ev: [] },
    hop: { dur: 0.22, f: (p, k) => { const s = 0.1 * (1 - k); p.sy *= 1 - s; p.sxz *= 1 + s * 0.5; }, ev: [] },
    spring: { dur: 0.6, f: (p, k) => { const s = 0.2 * Math.exp(-k * 3.5) * Math.cos(k * 22); p.sy *= 1 - s; p.sxz *= 1 + s * 0.6; }, ev: [] },
    glide: { dur: 0.35, f: (p, k) => { p.rx += 0.12 * (1 - k); }, ev: [] },
    twirl: { dur: 0.3, f: (p, k) => { p.rz += Math.sin(k * PI * 2) * 0.08 * (1 - k); }, ev: [] },
    bunny: { dur: 0.32, f: (p, k) => arc(p, k, { c: 0.05, b: 0.75, h: 0.3, sq: 0.1 }), ev: [] },
    stomp: { dur: 0.45, f: (p, k) => { const s = 0.32 * Math.exp(-k * 5) * Math.cos(k * 9); p.sy *= 1 - s; p.sxz *= 1 + s * 0.6; }, ev: [] },
    float: { dur: 0.4, f: (p, k) => { p.y += Math.sin(k * PI) * 0.08; }, ev: [] },
    zoom: { dur: 0.28, f: (p, k) => { const s = 0.18 * Math.exp(-k * 6); p.sy *= 1 - s; p.sxz *= 1 + s * 0.6; p.rx += 0.15 * (1 - k); }, ev: [] },
  };

  function tick(t: number, dt: number): void {
    time = t;
    tickFur(t);
    const p = pose0();
    // breathing + mood body language
    p.sy *= 1 + Math.sin(t * 2.6) * 0.016; p.sxz *= 1 - Math.sin(t * 2.6) * 0.008;
    MOOD_LOOK[t < moodUntil ? mood : def.mood](p, t);
    // the clip on top
    if (clip) {
      clip.t += dt;
      const k = Math.min(1, clip.t / clip.dur);
      clip.f(p, k, clip.t);
      while (clip.fired < clip.ev.length && k >= clip.ev[clip.fired][0]) { const [, kind, s] = clip.ev[clip.fired++]; fire(kind, s); }
      if (k >= 1) { const was = clip.name; clip = null; if (was !== 'gameLand') fire('done'); }
    }
    // in-game hop flourishes (the game moves the Fuzzy; this adds the character's own style)
    if (game.on) {
      const k = game.k;
      switch (def.jump) {
        case 'twirl': p.ry += TAU * ease(k); break;
        case 'glide': p.rx += 0.2 * Math.sin(k * PI); p.rz += 0.15 * Math.sin(k * TAU); break;
        case 'float': p.y += 0.25 * Math.sin(k * PI); p.rz += Math.sin(k * TAU) * 0.1; break;
        case 'zoom': p.rx -= 0.3 * (1 - k); { const st = 0.25 * (1 - k); p.sy *= 1 + st; p.sxz *= 1 - st * 0.5; } break;
        case 'stomp': p.rx -= 0.12 * Math.sin(k * PI); break;
        case 'spring': { const st = 0.18 * Math.sin(k * PI); p.sy *= 1 + st; p.sxz *= 1 - st * 0.4; } break;
        case 'bunny': p.rz += Math.sin(k * TAU * 2) * 0.1; break;
        case 'hop': p.rx -= 0.1 * Math.sin(k * PI); break;
        default: break;
      }
    }
    // look at
    if (lookTarget) {
      group.updateWorldMatrix(true, false);
      const l = group.worldToLocal(tmp.copy(lookTarget));
      lookWant.yaw = Math.max(-0.75, Math.min(0.75, Math.atan2(l.x, Math.max(0.2, l.z))));
      lookWant.pitch = Math.max(-0.35, Math.min(0.4, -Math.atan2(l.y - r * 0.2, Math.hypot(l.x, l.z) + 0.001) * 0.6));
    } else { lookWant.yaw = 0; lookWant.pitch = 0; }
    const lk = Math.min(1, dt * 5);
    lookCur.yaw += (lookWant.yaw - lookCur.yaw) * lk; lookCur.pitch += (lookWant.pitch - lookCur.pitch) * lk;
    p.ry += lookCur.yaw; p.rx += lookCur.pitch;

    motion.position.set(p.x * r, p.y * r, p.z * r);
    motion.rotation.set(p.rx, p.ry, p.rz);
    squash.scale.set(p.sxz * p.s, p.sy * p.s, p.sxz * p.s);

    // blinks (the model's own eyelids), sleepy half-closed eyes
    if (!locked) {
      if (blinkT > 0) blinkT = Math.max(0, blinkT - dt);
      else if ((blinkIn -= dt) <= 0) { blinkT = 0.15; blinkIn = 1.6 + Math.random() * 3.4 + (Math.random() < 0.15 ? -1.2 : 0); }
      if (winkT > 0) winkT = Math.max(0, winkT - dt);
      const b = blinkT > 0 ? Math.sin((1 - blinkT / 0.15) * PI) : 0;
      const w = winkT > 0 ? Math.min(1, Math.sin((1 - winkT / 0.7) * PI) * 1.6) : 0;
      const sleepy = (t < moodUntil ? mood : def.mood) === 'sleepy' ? 0.42 + Math.sin(t * 0.7) * 0.08 : 0;
      blinkL = Math.max(b, sleepy); blinkR = Math.max(b, w, sleepy);
      if (lidMat && lids) { setBlink(lidMat, blinkL, blinkR); lids.visible = blinkL > 0.01 || blinkR > 0.01; }
      if (fallback) fallback.eyes.forEach((e, i) => { e.open.scale.y = Math.max(0.08, 1 - (i ? blinkR : blinkL)); });
    }
    for (const f of ticks) f(t, dt);
    // emote bubbles rise and fade
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const b = bubbles[i]; b.t += dt;
      const k = b.t / 1.5;
      const pop = Math.min(1, b.t / 0.18), sc = r * 0.75 * (pop < 1 ? 0.6 + pop * 0.55 : 1.15 - Math.min(0.15, (b.t - 0.18) * 0.3));
      b.s.scale.set(sc, sc, 1);
      b.s.position.set(r * 0.85 + Math.sin(b.t * 3) * r * 0.06, r * 1.25 + b.t * r * 0.45, r * 0.2);
      b.s.material.opacity = k < 0.7 ? 1 : Math.max(0, 1 - (k - 0.7) / 0.3);
      if (k >= 1) { emotes.remove(b.s); b.s.material.dispose(); bubbles.splice(i, 1); }
    }
  }

  const rig: CharacterRig = {
    def, group, body, radius: r, model, glb: useGlb,
    tick,
    play(anim, style) {
      if (locked && anim !== 'idle' && anim !== 'look') return 0;
      if (anim === 'idle') { clip = null; return 0; }
      if (anim === 'look') return start('look', LOOK_AROUND);
      if (anim === 'jump') { const s = (style as JumpStyle) || def.jump; return start('jump', JUMPS[s] ?? JUMPS.bounce); }
      const s = (style as CelebrateStyle) || def.celebrate; const c = CELEBRATIONS[s] ?? CELEBRATIONS.cheer;
      const d = start('celebrate', c);
      if (c.emote) setTimeout(() => rig.emote(c.emote!), 250);
      if (s === 'giggle' || s === 'cheer') setTimeout(() => rig.wink(), 350);
      voice?.celebrate(s);
      return d;
    },
    gameHop(k) { game = { k: clamp01(k), on: true }; },
    gameLand() { game = { k: 0, on: false }; clip = { name: 'gameLand', ...GAME_LAND[def.jump], t: 0, fired: 0 }; },
    setMood(m) {
      if (!m) { moodUntil = 0; return; }
      mood = m; moodUntil = time + 5;
      rig.emote(MOOD_EMOTE[m]);
      if (voice) { if (m === 'sleepy') voice.sleepy(); else if (m === 'silly') voice.giggle(); else if (m === 'fierce') voice.roar(); else if (m === 'happy') voice.yay(); else voice.hum(); }
    },
    emote(e) {
      if (locked) return;
      while (bubbles.length > 2) { const b = bubbles.shift()!; emotes.remove(b.s); b.s.material.dispose(); }
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: emoteTexture(e), transparent: true, depthWrite: false, depthTest: false }));
      s.renderOrder = 20; s.scale.setScalar(0.001);
      emotes.add(s); bubbles.push({ s, t: 0 });
    },
    lookAt(w) { lookTarget = w ? w.clone() : null; },
    blink() { blinkT = 0.15; },
    wink() { winkT = 0.7; },
    setLocked,
    setExtra,
    busy: () => !!clip && clip.name !== 'gameLand',
    get onEvent() { return onEvent; },
    set onEvent(f) { onEvent = f; },
    dispose() {
      disposePart(parts);
      for (const b of bubbles) b.s.material.dispose();
      for (const m of owned) m.dispose();
      inner.traverse((x) => { if (x.userData.shadowBall) (x as THREE.Mesh).geometry.dispose(); });
      if (fallback) fallback.group.traverse((x) => { const m = x as THREE.Mesh; if (m.isMesh) m.geometry.dispose(); });
      group.removeFromParent();
    },
  };
  return rig;
}
