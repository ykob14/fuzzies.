/**
 * Orchard art kit — the hand-built 3D artwork for the Fruit Catcher (and any later orchard / farm scene). No primitives on show:
 * fruit are lathed from real profiles (apple dimples, pear necks, strawberry seeds), trees are tapered branching trunks with lumpy
 * shaded crowns broken up by hundreds of leaf cards, the basket is woven, the ground is painted grass with a soft-edged dirt path,
 * grass tufts sway in the wind on the GPU. Every texture is painted on a canvas at load time (no image files), every mesh is
 * shared or instanced, and shading (ambient occlusion, sun-side warmth, blush) is baked into vertex colours so it costs nothing
 * per frame. Art direction: warm, soft, saturated but not neon; rounded silhouettes; ART.md palette for wood and greens.
 */
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// ---------- small helpers ----------
// negative seeds wrap into range
export const rng = (seed: number): (() => number) => { let s = (((Math.round(seed) * 9301 + 49297) % 233280) + 233280) % 233280 || 1; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; };
export const C = (h: string) => new THREE.Color(h);
/** smooth pseudo-noise in 3D (cheap, deterministic, good enough for lumps and colour variation) */
export const noise3 = (x: number, y: number, z: number) => (Math.sin(x * 1.7 + y * 2.3) * Math.cos(z * 1.9 - x * 0.7) + Math.sin(y * 3.1 - z * 1.3 + 1.7) * 0.5 + Math.cos(x * 2.9 + z * 2.2) * 0.35) / 1.85;
export const canvas = (w: number, h: number) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return { c, g: c.getContext('2d')! }; };
export const tex = (c: HTMLCanvasElement, repeat?: [number, number]) => {
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
};
export const once = <T>(f: () => T): (() => T) => { let v: T | undefined; return () => (v ??= f()); };

// ---------- painted textures ----------
/** a card of 9 overlapping leaves with veins, on transparent — breaks crowns into foliage */
export const leafCardTex = once(() => {
  const { c, g } = canvas(256, 256); const r = rng(5);
  for (let i = 0; i < 11; i++) {
    const cx = 50 + r() * 156, cy = 50 + r() * 156, len = 44 + r() * 30, wid = len * (0.38 + r() * 0.1), an = r() * Math.PI * 2;
    g.save(); g.translate(cx, cy); g.rotate(an);
    const gr = g.createLinearGradient(-len / 2, 0, len / 2, 0);
    const dark = ['#2e6a2c', '#356f2e', '#2b6330'][i % 3], mid = ['#4f9a3c', '#5aa547', '#4a9440'][i % 3], tip = ['#86c95c', '#9ad366', '#7cc055'][i % 3];
    gr.addColorStop(0, dark); gr.addColorStop(0.55, mid); gr.addColorStop(1, tip);
    g.fillStyle = gr; g.beginPath(); g.moveTo(-len / 2, 0);
    g.bezierCurveTo(-len / 4, -wid, len / 4, -wid * 0.9, len / 2, 0); g.bezierCurveTo(len / 4, wid * 0.9, -len / 4, wid, -len / 2, 0); g.fill();
    g.strokeStyle = 'rgba(210,240,170,0.45)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(-len / 2, 0); g.quadraticCurveTo(0, -wid * 0.08, len / 2 - 3, 0); g.stroke();
    g.lineWidth = 0.8; for (let k = -2; k <= 2; k++) { if (!k) continue; g.beginPath(); g.moveTo(k * len * 0.12, 0); g.lineTo(k * len * 0.12 + len * 0.1, Math.sign(k) * wid * 0.5); g.stroke(); }
    g.restore();
  }
  return tex(c);
});
/** painted lawn: thousands of short strokes in five greens, tiny clover and daisies */
export const grassTex = once(() => {
  const { c, g } = canvas(512, 512); const r = rng(11);
  g.fillStyle = '#74bd56'; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 40; i++) { const x = r() * 512, y = r() * 512, rad = 30 + r() * 70; const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, r() < 0.5 ? 'rgba(140,205,95,0.35)' : 'rgba(80,150,60,0.3)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); }
  const greens = ['#5aa845', '#7fcf62', '#8ad86b', '#4f9a3e', '#69b84f', '#9be07a'];
  for (let i = 0; i < 9000; i++) { const x = r() * 512, y = r() * 512, l = 3 + r() * 6, a = -Math.PI / 2 + (r() - 0.5) * 0.9; g.strokeStyle = greens[(r() * greens.length) | 0]; g.lineWidth = 1 + r() * 0.8; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
  for (let i = 0; i < 60; i++) { const x = r() * 512, y = r() * 512; g.fillStyle = r() < 0.7 ? 'rgba(255,255,255,0.8)' : 'rgba(255,214,90,0.85)'; for (let p = 0; p < 5; p++) { const a = (p / 5) * Math.PI * 2; g.beginPath(); g.arc(x + Math.cos(a) * 1.6, y + Math.sin(a) * 1.6, 1.2, 0, 7); g.fill(); } }
  return tex(c, [16, 16]);
});
/** the dirt path strip: packed earth, pebbles, wheel ruts, and a soft ragged edge to the grass (alpha) */
export const pathTex = once(() => {
  const { c, g } = canvas(512, 256); const r = rng(23);
  g.fillStyle = '#c9a26a'; g.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 90; i++) { const x = r() * 512, y = 40 + r() * 176, rad = 12 + r() * 40; const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, r() < 0.5 ? 'rgba(150,110,62,0.35)' : 'rgba(224,192,140,0.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); }
  for (const y of [100, 156]) { g.strokeStyle = 'rgba(120,85,45,0.18)'; g.lineWidth = 14; g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= 512; x += 32) g.lineTo(x, y + Math.sin(x * 0.04) * 3); g.stroke(); }
  for (let i = 0; i < 260; i++) { const x = r() * 512, y = 36 + r() * 184, w = 2 + r() * 5, h = w * (0.6 + r() * 0.3); g.fillStyle = ['#a99a86', '#bdb09a', '#8d7f6c', '#d8ccb6'][(r() * 4) | 0]; g.beginPath(); g.ellipse(x, y, w, h, r() * 3, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.ellipse(x - w * 0.3, y - h * 0.3, w * 0.35, h * 0.3, 0, 0, 7); g.fill(); }
  // ragged soft edge: a mask (opaque middle, noisy soft edges) applied once
  const mk = canvas(512, 256);
  for (let x = 0; x < 512; x += 2) {
    const e1 = 24 + Math.sin(x * 0.05) * 8 + Math.sin(x * 0.17) * 4 + r() * 4, e2 = 232 - (Math.sin(x * 0.043 + 2) * 8 + Math.sin(x * 0.13) * 4 + r() * 4);
    const gr = mk.g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(Math.max(0.01, (e1 - 12) / 256), 'rgba(0,0,0,0)'); gr.addColorStop(e1 / 256, 'rgba(0,0,0,1)'); gr.addColorStop(e2 / 256, 'rgba(0,0,0,1)'); gr.addColorStop(Math.min(0.99, (e2 + 12) / 256), 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    mk.g.fillStyle = gr; mk.g.fillRect(x, 0, 2, 256);
  }
  g.globalCompositeOperation = 'destination-in'; g.drawImage(mk.c, 0, 0); g.globalCompositeOperation = 'source-over';
  return tex(c, [3, 1]);
});
/** a grass tuft card: 16 tapered blades fanning out */
export const tuftTex = once(() => {
  const { c, g } = canvas(128, 128); const r = rng(31);
  for (let i = 0; i < 16; i++) {
    const bx = 64 + (r() - 0.5) * 34, lean = (r() - 0.5) * 60, h = 70 + r() * 50, w = 4 + r() * 3;
    const gr = g.createLinearGradient(0, 128, 0, 128 - h); gr.addColorStop(0, '#3f7f32'); gr.addColorStop(0.6, ['#69b84f', '#5aa845', '#7fcf62'][i % 3]); gr.addColorStop(1, '#b4e889');
    g.fillStyle = gr; g.beginPath(); g.moveTo(bx - w, 128); g.quadraticCurveTo(bx + lean * 0.3, 128 - h * 0.6, bx + lean, 128 - h); g.quadraticCurveTo(bx + lean * 0.3 + w * 0.6, 128 - h * 0.55, bx + w, 128); g.fill();
  }
  return tex(c);
});
/** weathered planks with grain and knots (fences, crates, the barn) */
export const woodTex = once(() => {
  const { c, g } = canvas(256, 256); const r = rng(41);
  const tones = ['#b98a55', '#a97b48', '#c49562', '#ae804c'];
  for (let p = 0; p < 4; p++) {
    g.fillStyle = tones[p]; g.fillRect(p * 64, 0, 64, 256);
    for (let k = 0; k < 22; k++) { g.strokeStyle = `rgba(90,58,28,${0.12 + r() * 0.18})`; g.lineWidth = 0.8 + r(); const x = p * 64 + 4 + r() * 56; g.beginPath(); g.moveTo(x, 0); for (let y = 0; y <= 256; y += 16) g.lineTo(x + Math.sin(y * 0.03 + k) * 2.5, y); g.stroke(); }
    if (r() < 0.8) { const ky = r() * 256, kx = p * 64 + 16 + r() * 32; g.fillStyle = 'rgba(95,60,30,0.55)'; g.beginPath(); g.ellipse(kx, ky, 4, 7, 0, 0, 7); g.fill(); }
    g.fillStyle = 'rgba(60,38,18,0.55)'; g.fillRect(p * 64, 0, 2, 256); g.fillStyle = 'rgba(255,230,190,0.25)'; g.fillRect(p * 64 + 2, 0, 2, 256);
  }
  return tex(c);
});
/** a woven wicker pattern: over-under strands with rounded shading */
export const weaveTex = once(() => {
  const { c, g } = canvas(256, 256);
  g.fillStyle = '#7a5428'; g.fillRect(0, 0, 256, 256);
  const rows = 8, cols = 8, rh = 256 / rows, cw = 256 / cols;
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const over = (x + y) % 2 === 0;
    const gx = x * cw, gy = y * rh;
    const gr = g.createLinearGradient(0, gy, 0, gy + rh); gr.addColorStop(0, over ? '#e8bf7e' : '#b8874a'); gr.addColorStop(0.5, over ? '#d4a35f' : '#a77940'); gr.addColorStop(1, over ? '#9c6e38' : '#7d5427');
    g.fillStyle = gr; g.beginPath(); g.roundRect(gx + (over ? 0 : 3), gy + 3, cw - (over ? 0 : 6), rh - 6, 8); g.fill();
    g.strokeStyle = 'rgba(255,240,200,0.25)'; g.lineWidth = 1; g.beginPath(); g.moveTo(gx + 4, gy + 7); g.lineTo(gx + cw - 4, gy + 7); g.stroke();
  }
  for (let x = 0; x < cols; x++) { g.fillStyle = 'rgba(70,45,18,0.35)'; g.fillRect(x * cw - 1, 0, 2, 256); }
  return tex(c, [6, 1]);
});
/** a strawberry skin: red with staggered seeds in little dimples (mapped by the lathe's UVs) */
const strawberryTex = once(() => {
  const { c, g } = canvas(256, 256);
  const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#b3122e'); gr.addColorStop(0.7, '#e3253d'); gr.addColorStop(0.92, '#f04b4f'); gr.addColorStop(1, '#f7a0a0');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  for (let row = 0; row < 12; row++) for (let k = 0; k < 14; k++) {
    const x = (k + (row % 2) * 0.5) * (256 / 14), y = 18 + row * 18;
    g.fillStyle = 'rgba(110,0,20,0.35)'; g.beginPath(); g.ellipse(x, y, 4.2, 5, 0, 0, 7); g.fill();
    g.fillStyle = '#ffd86b'; g.beginPath(); g.ellipse(x, y + 0.5, 1.6, 2.6, 0, 0, 7); g.fill();
  }
  return tex(c);
});
/** a sparkle star for the golden fruit and dizzy stars */
export const starTex = once(() => {
  const { c, g } = canvas(64, 64);
  g.fillStyle = '#ffe27a'; g.beginPath();
  for (let i = 0; i < 10; i++) { const r = i % 2 ? 11 : 28, a = (i / 10) * Math.PI * 2 - Math.PI / 2; const x = 32 + Math.cos(a) * r, y = 32 + Math.sin(a) * r; if (i) g.lineTo(x, y); else g.moveTo(x, y); }
  g.closePath(); g.fill(); g.strokeStyle = '#fff6c8'; g.lineWidth = 3; g.stroke();
  return tex(c);
});
export const softDotTex = once(() => {
  const { c, g } = canvas(64, 64); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 30); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,0.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return tex(c);
});

// ---------- vertex-colour shading ----------
type Shade = (p: THREE.Vector3, n: THREE.Vector3, out: THREE.Color) => void;
export const paint = (geo: THREE.BufferGeometry, f: Shade): THREE.BufferGeometry => {
  const pos = geo.attributes.position, nor = geo.attributes.normal; const col = new Float32Array(pos.count * 3);
  const p = new THREE.Vector3(), n = new THREE.Vector3(), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) { p.fromBufferAttribute(pos, i); n.fromBufferAttribute(nor, i); f(p, n, c); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); return geo;
};
export const SUN = new THREE.Vector3(-0.5, 0.8, 0.45).normalize();

// ---------- fruit ----------
export type FruitArtKind = 'apple' | 'pear' | 'berry' | 'gold' | 'cone';
const latheProfile = (n: number, f: (t: number) => [number, number]) => { const pts: THREE.Vector2[] = []; for (let i = 0; i <= n; i++) { const [r, y] = f(i / n); pts.push(new THREE.Vector2(Math.max(0.0001, r), y)); } return pts; };
const appleProfile = () => latheProfile(36, (t) => {
  const ph = t * Math.PI; let r = Math.sin(ph) * (1 - 0.12 * Math.cos(ph)); let y = -Math.cos(ph) * 0.9;
  y -= 0.26 * Math.exp(-Math.pow((Math.PI - ph) / 0.5, 2)); y += 0.12 * Math.exp(-Math.pow(ph / 0.42, 2)); r *= 1 - 0.04 * Math.sin(ph * 5);
  return [r, y];
});
const leafGeo = once(() => {
  const s = new THREE.Shape(); s.moveTo(0, 0); s.bezierCurveTo(0.09, 0.05, 0.16, 0.12, 0.26, 0); s.bezierCurveTo(0.16, -0.1, 0.08, -0.06, 0, 0);
  const g = new THREE.ShapeGeometry(s, 6); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, -x * x * 1.4 + Math.abs(y) * 0.25); }
  g.computeVertexNormals();
  return paint(g, (q, _n, c) => c.copy(C('#3f8f36')).lerp(C('#8fd06a'), Math.min(1, q.x / 0.26)).multiplyScalar(Math.abs(q.y) < 0.012 ? 1.25 : 1));
});
const stemGeo = once(() => { const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.01, 0.1, 0), new THREE.Vector3(0.06, 0.17, 0)); return paint(new THREE.TubeGeometry(curve, 6, 0.018, 6), (_p, _n, c) => c.set('#6b4524')); });
const withStem = (body: THREE.BufferGeometry, top: number, leaf: boolean, scale: number) => {
  const parts = [body];
  const st = stemGeo().clone().scale(scale / 0.28, scale / 0.28, scale / 0.28).translate(0, top - 0.04 * scale / 0.28, 0); parts.push(st);
  if (leaf) { const lf = leafGeo().clone().scale(scale / 0.28, scale / 0.28, scale / 0.28).rotateZ(0.35).rotateY(-0.6).translate(0.015, top + 0.06 * scale / 0.28, 0); parts.push(lf); }
  return mergeGeometries(parts.map((g) => g.index ? g.toNonIndexed() : g))!;
};
const fruitGeos = once(() => {
  const R = 0.28;
  // apple: dimpled lathe, red with a golden blush on the sun side, darker in the stem cavity, pale lenticels
  const apple = paint(new THREE.LatheGeometry(appleProfile(), 30).scale(R, R, R), (p, n, c) => {
    const blush = Math.max(0, n.dot(SUN)) * 0.55 + Math.max(0, noise3(p.x * 9, p.y * 9, p.z * 9)) * 0.25;
    c.set('#c81f2b').lerp(C('#f0a23a'), blush * 0.55);
    const top = Math.max(0, (p.y / R - 0.45) * 1.8) * (1 - Math.min(1, Math.hypot(p.x, p.z) / (R * 0.5))); c.lerp(C('#5a1210'), Math.min(0.7, top));
    if (noise3(p.x * 60, p.y * 60, p.z * 60) > 0.82) c.lerp(C('#ffe0a8'), 0.5);
  });
  const pear = paint(new THREE.LatheGeometry(latheProfile(36, (t) => { const ph = t * Math.PI; const neck = THREE.MathUtils.smoothstep((1 - Math.cos(ph)) / 2, 0.45, 0.95); let r = Math.sin(ph) * (1 - 0.48 * neck); const y = -Math.cos(ph) * 1.25 + 0.1; r *= 1 - 0.03 * Math.sin(ph * 4); return [r * 0.92, y - 0.18 * Math.exp(-Math.pow((Math.PI - ph) / 0.35, 2))]; }), 28).scale(R, R, R), (p, n, c) => {
    c.set('#a9c23a').lerp(C('#e8d45a'), Math.max(0, n.dot(SUN)) * 0.6);
    c.lerp(C('#c9773a'), Math.max(0, n.dot(SUN)) * 0.18);
    if (noise3(p.x * 70, p.y * 70, p.z * 70) > 0.7) c.lerp(C('#8a6a2a'), 0.45);
    c.lerp(C('#5e6a1e'), Math.max(0, (p.y / R - 0.9)) * 1.2);
  });
  const berryBody = new THREE.LatheGeometry(latheProfile(30, (t) => { const ph = t * Math.PI; const r = Math.pow(Math.sin(ph), 0.85) * (0.38 + 0.62 * Math.pow(t, 0.55)); return [r * 0.95, -Math.cos(ph) * 1.05]; }), 24).scale(R, R, R);
  // calyx: seven little sepals on top
  const sepals: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 7; i++) { const s = new THREE.ConeGeometry(0.045, 0.2, 4).rotateX(Math.PI / 2).scale(1, 0.35, 1).translate(0, 0, 0.1).rotateY((i / 7) * Math.PI * 2); s.rotateX(0); sepals.push(paint(s.translate(0, R * 1.02, 0), (_p, _n, c) => c.set(i % 2 ? '#3f8f36' : '#55a845'))); }
  const calyx = mergeGeometries(sepals.map((g) => g.toNonIndexed()))!;
  const berryStem = paint(new THREE.CylinderGeometry(0.014, 0.02, 0.1, 6).translate(0, R * 1.08 + 0.04, 0), (_p, _n, c) => c.set('#4f8f30'));
  // pinecone: scales on a Fibonacci spiral, lighter tips
  const scales: THREE.BufferGeometry[] = [];
  const N = 64;
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1), y = (t - 0.5) * 0.62, rr = Math.sin(t * Math.PI) * 0.21 + 0.03, a = i * 2.39996;
    const s = new THREE.ConeGeometry(0.07, 0.12, 4).rotateX(Math.PI / 2 + 0.5).scale(1.2, 0.55, 1).translate(0, 0, 0.05);
    s.rotateY(a).translate(Math.sin(a) * rr, y, Math.cos(a) * rr);
    scales.push(paint(s, (p, _n, c) => { const k = Math.hypot(p.x, p.z) / 0.26; c.set('#5a3a1c').lerp(C('#b98a55'), Math.min(1, k * 0.9)); }));
  }
  const cone = mergeGeometries(scales.map((g) => g.toNonIndexed()))!;
  return {
    apple: withStem(apple, R * 0.66, true, R), pear: withStem(pear, R * 1.2, true, R), gold: withStem(apple.clone(), R * 0.66, true, R),
    berryBody, berryTop: mergeGeometries([calyx, berryStem.toNonIndexed()])!, cone,
  };
});
const fruitMats = once(() => ({
  skin: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.32, metalness: 0 }),
  gold: new THREE.MeshStandardMaterial({ color: '#ffd04a', roughness: 0.22, metalness: 0.85, emissive: '#7a4a00', emissiveIntensity: 0.45 }),
  berry: new THREE.MeshStandardMaterial({ map: strawberryTex(), roughness: 0.38 }),
  rough: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }),
}));
/** many apples / pears (and golden ones) in ONE mesh — one draw call for a whole tree's fruit or a crate */
export function fruitBatch(list: { kind: FruitArtKind; m: THREE.Matrix4 }[], shadow = true): THREE.Mesh | null {
  const geo = fruitGeos(); const parts = list.filter((f) => f.kind === 'apple' || f.kind === 'pear').map((f) => (f.kind === 'apple' ? geo.apple : geo.pear).clone().applyMatrix4(f.m));
  if (!parts.length) return null;
  const m = new THREE.Mesh(mergeGeometries(parts)!, fruitMats().skin); m.castShadow = shadow; return m;
}
/** a finished piece of fruit (or pinecone), ready to drop, ~0.28 m radius */
export function fruitModel(kind: FruitArtKind, shadow = true): THREE.Group {
  const g = new THREE.Group(); const geo = fruitGeos(), mat = fruitMats();
  const add = (gg: THREE.BufferGeometry, m: THREE.Material) => { const mesh = new THREE.Mesh(gg, m); mesh.castShadow = shadow; g.add(mesh); return mesh; };
  if (kind === 'apple') add(geo.apple, mat.skin);
  else if (kind === 'pear') add(geo.pear, mat.skin);
  else if (kind === 'berry') { add(geo.berryBody, mat.berry); add(geo.berryTop, mat.rough); g.scale.setScalar(1.05); }
  else if (kind === 'gold') { const m = add(geo.gold, mat.gold); m.userData.gold = true; }
  else add(geo.cone, mat.rough);
  return g;
}

// ---------- trees ----------
/** a tapered tube along a curve: radius r0 at the base to r1 at the tip */
export function taperTube(curve: THREE.Curve<THREE.Vector3>, r0: number, r1: number, segs = 10, radial = 9): THREE.BufferGeometry {
  const frames = curve.computeFrenetFrames(segs, false); const pos: number[] = [], nor: number[] = [], uv: number[] = [], idx: number[] = [];
  const p = new THREE.Vector3(), n = new THREE.Vector3();
  for (let i = 0; i <= segs; i++) {
    const t = i / segs; curve.getPointAt(t, p); const r = THREE.MathUtils.lerp(r0, r1, Math.pow(t, 0.8)) * (1 + (i === 0 ? 0.25 : 0));
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2; const sn = Math.sin(a), cs = -Math.cos(a);
      n.set(cs * frames.normals[i].x + sn * frames.binormals[i].x, cs * frames.normals[i].y + sn * frames.binormals[i].y, cs * frames.normals[i].z + sn * frames.binormals[i].z).normalize();
      const bump = 1 + noise3(p.x * 6 + a, p.y * 6, p.z * 6) * 0.08;
      pos.push(p.x + n.x * r * bump, p.y + n.y * r * bump, p.z + n.z * r * bump); nor.push(n.x, n.y, n.z); uv.push(j / radial * 2, t * 3);
    }
  }
  for (let i = 0; i < segs; i++) for (let j = 0; j < radial; j++) { const a = i * (radial + 1) + j, b = a + radial + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  return g;
}
export const barkTex = once(() => {
  const { c, g } = canvas(128, 256); const r = rng(51);
  g.fillStyle = '#8a6440'; g.fillRect(0, 0, 128, 256);
  for (let i = 0; i < 70; i++) { const x = r() * 128; g.strokeStyle = r() < 0.5 ? 'rgba(70,45,25,0.5)' : 'rgba(170,135,95,0.4)'; g.lineWidth = 1 + r() * 2.5; g.beginPath(); g.moveTo(x, 0); for (let y = 0; y <= 256; y += 12) g.lineTo(x + Math.sin(y * 0.05 + i) * 3 + (r() - 0.5) * 2, y); g.stroke(); }
  for (let i = 0; i < 8; i++) { const x = r() * 128, y = r() * 256; g.fillStyle = 'rgba(60,38,20,0.6)'; g.beginPath(); g.ellipse(x, y, 4, 8, 0, 0, 7); g.fill(); }
  return tex(c, [1, 1]);
});
export interface OrchardTree { group: THREE.Group; crown: THREE.Vector3; radius: number; update: (t: number, dt: number) => void; shake: (k?: number) => void }
/**
 * An orchard tree: a curved trunk forking into branches, a lumpy crown of 9–12 merged blobs shaded dark inside / bright on top,
 * ~110 leaf cards on its surface to break the silhouette, and ripe fruit hanging under it. `fruit` picks what grows on it.
 */
export function orchardTree(seed: number, fruit: 'apple' | 'pear' | 'mixed', opts: { scale?: number; leaves?: number; shadow?: boolean; hanging?: number } = {}): OrchardTree {
  const r = rng(seed * 7 + 3), S = opts.scale ?? 1, shadow = opts.shadow ?? true;
  const group = new THREE.Group();
  // trunk + branches
  const lean = (r() - 0.5) * 0.5;
  const trunkCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(lean * 0.3, 1.1, 0.05), new THREE.Vector3(lean * 0.7, 2.1, -0.05), new THREE.Vector3(lean, 2.9, 0)]);
  const wood: THREE.BufferGeometry[] = [taperTube(trunkCurve, 0.26, 0.15, 12, 10)];
  const top = trunkCurve.getPoint(1); const blobs: { c: THREE.Vector3; r: number }[] = [];
  const nb = 4;
  for (let i = 0; i < nb; i++) {
    const a = (i / nb) * Math.PI * 2 + r() * 0.8, out = 0.9 + r() * 0.5, up = 0.7 + r() * 0.6;
    const from = trunkCurve.getPoint(0.72 + r() * 0.2);
    const end = new THREE.Vector3(top.x + Math.cos(a) * out, top.y + up, top.z + Math.sin(a) * out * 0.8);
    const mid = from.clone().lerp(end, 0.5).add(new THREE.Vector3(0, 0.25, 0));
    wood.push(taperTube(new THREE.CatmullRomCurve3([from, mid, end]), 0.12, 0.05, 8, 7));
    blobs.push({ c: end.clone().add(new THREE.Vector3(0, 0.35, 0)), r: 0.95 + r() * 0.35 });
  }
  blobs.push({ c: top.clone().add(new THREE.Vector3(0, 1.25, 0)), r: 1.25 });
  for (let i = 0; i < 6; i++) { const a = r() * Math.PI * 2; blobs.push({ c: top.clone().add(new THREE.Vector3(Math.cos(a) * (0.7 + r() * 0.7), 0.6 + r() * 1.2, Math.sin(a) * (0.6 + r() * 0.6))), r: 0.7 + r() * 0.35 }); }
  const woodGeo = mergeGeometries(wood)!;
  paint(woodGeo, (p, _n, c) => { c.set('#ffffff').multiplyScalar(0.55 + Math.min(1, p.y / 1.2) * 0.45); if (p.y < 0.5) c.lerp(C('#6f9a4a'), (0.5 - p.y) * 0.5); });
  const trunk = new THREE.Mesh(woodGeo, new THREE.MeshStandardMaterial({ map: barkTex(), vertexColors: true, roughness: 0.92 })); trunk.castShadow = shadow; trunk.receiveShadow = true;
  // crown: lumpy blobs merged, baked AO (inner + underside darker), sun-side warmth
  const centre = blobs.reduce((s, b) => s.add(b.c), new THREE.Vector3()).multiplyScalar(1 / blobs.length);
  const crownParts = blobs.map((b, i) => {
    const ico = new THREE.IcosahedronGeometry(b.r, 3); ico.deleteAttribute('normal'); ico.deleteAttribute('uv');
    const g = mergeVertices(ico); const p = g.attributes.position; const v = new THREE.Vector3();
    for (let k = 0; k < p.count; k++) { v.fromBufferAttribute(p, k); const d = 1 + noise3(v.x * 2.2 + i, v.y * 2.2, v.z * 2.2) * 0.12; v.multiplyScalar(d).add(b.c); p.setXYZ(k, v.x, v.y, v.z); }
    g.computeVertexNormals(); return g;
  });
  const crownGeo = mergeGeometries(crownParts)!;
  let maxD = 0; { const p = crownGeo.attributes.position; const v = new THREE.Vector3(); for (let k = 0; k < p.count; k++) maxD = Math.max(maxD, v.fromBufferAttribute(p, k).distanceTo(centre)); }
  const yMin = top.y - 0.2, yMax = centre.y + 1.8;
  paint(crownGeo, (p, n, c) => {
    const h = THREE.MathUtils.clamp((p.y - yMin) / (yMax - yMin), 0, 1); const ao = THREE.MathUtils.clamp(p.distanceTo(centre) / maxD, 0, 1);
    c.set('#2c5f2a').lerp(C('#4e9a3d'), h * 0.8).lerp(C('#8ccf5e'), Math.pow(Math.max(0, n.dot(SUN)), 1.5) * 0.65 * (0.4 + h * 0.6));
    c.multiplyScalar(0.55 + ao * 0.5); c.lerp(C('#2a4f2a'), Math.max(0, -n.y) * 0.35);
  });
  const crown = new THREE.Mesh(crownGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82 })); crown.castShadow = shadow; crown.receiveShadow = true;
  const sway = new THREE.Group(); sway.add(crown);
  // leaf cards on the crown surface, tinted to match the shading there
  const nLeaves = opts.leaves ?? 140;
  const leaves = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.95, 0.95), new THREE.MeshStandardMaterial({ map: leafCardTex(), alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.7, transparent: false }), nLeaves);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), pv = new THREE.Vector3(), col = new THREE.Color();
  for (let i = 0; i < nLeaves; i++) {
    const b = blobs[(r() * blobs.length) | 0]; const th = r() * Math.PI * 2, u = r() * 2 - 1 * (r() < 0.25 ? 1 : 0.55); const s = Math.sqrt(1 - Math.min(1, u * u));
    const dir = new THREE.Vector3(Math.cos(th) * s, u, Math.sin(th) * s).normalize();
    pv.copy(b.c).addScaledVector(dir, b.r * (0.93 + r() * 0.1));
    if (pv.distanceTo(centre) < maxD * 0.55) { i--; continue; }
    // lie the card on the crown's surface (facing out, tilted a little, random roll) so leaves texture the crown instead of sticking out
    q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir); e.set((r() - 0.5) * 0.9, (r() - 0.5) * 0.9, r() * Math.PI * 2); q.multiply(new THREE.Quaternion().setFromEuler(e)); sc.setScalar(0.65 + r() * 0.5);
    m4.compose(pv, q, sc); leaves.setMatrixAt(i, m4);
    const h = THREE.MathUtils.clamp((pv.y - yMin) / (yMax - yMin), 0, 1);
    col.set('#5e8f4a').lerp(C('#c8f0a0'), Math.max(0, dir.dot(SUN)) * 0.6 * (0.5 + h * 0.5)).multiplyScalar(0.75 + h * 0.4); leaves.setColorAt(i, col);
  }
  leaves.instanceMatrix.needsUpdate = true; if (leaves.instanceColor) leaves.instanceColor.needsUpdate = true;
  sway.add(leaves);
  // hanging fruit under the crown
  const nFruit = opts.hanging ?? 11;
  const hang: { kind: FruitArtKind; m: THREE.Matrix4 }[] = [];
  for (let i = 0; i < nFruit; i++) {
    const b = blobs[(r() * blobs.length) | 0]; const th = r() * Math.PI * 2; const u = -0.2 - r() * 0.6; const s = Math.sqrt(1 - u * u);
    const dir = new THREE.Vector3(Math.cos(th) * s, u, Math.sin(th) * s);
    hang.push({ kind: fruit === 'mixed' ? (r() < 0.5 ? 'apple' : 'pear') : fruit, m: new THREE.Matrix4().compose(b.c.clone().addScaledVector(dir, b.r * 0.98), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * 6), new THREE.Vector3().setScalar(0.85)) });
  }
  const fm = fruitBatch(hang, false); if (fm) sway.add(fm);
  group.add(trunk, sway);
  group.scale.setScalar(S);
  const phase = r() * 10; let shakeK = 0;
  return {
    group, crown: centre.clone().multiplyScalar(S), radius: maxD * S,
    update: (t, dt) => { shakeK = Math.max(0, shakeK - dt * 2.2); sway.rotation.z = Math.sin(t * 0.9 + phase) * 0.012 + Math.sin(t * 22) * 0.025 * shakeK; sway.rotation.x = Math.cos(t * 0.7 + phase) * 0.008 + Math.cos(t * 19) * 0.015 * shakeK; },
    shake: (k = 1) => { shakeK = Math.min(1, shakeK + k); },
  };
}
/** a cheap background tree for far rows: crown + trunk only, fogged into the distance */
export function farTree(seed: number, scale = 1): THREE.Group {
  const t = orchardTree(seed, 'apple', { scale, leaves: 0, hanging: 0, shadow: false });
  return t.group;
}

// ---------- the basket ----------
export interface Basket { group: THREE.Group; rim: THREE.Mesh; pile: THREE.Group; fill: (kinds: FruitArtKind[]) => void; topY: number; radius: number }
/** a wide, shallow harvest basket of woven wicker with a braided rim and two loop handles; `fill` shows the latest catches */
export function basketModel(radius = 0.62, shadow = true): Basket {
  const group = new THREE.Group(); const h = radius * 0.62;
  // body: outside up, over the lip, inside down to the floor (one lathe)
  const prof: THREE.Vector2[] = [];
  const outer = (t: number) => radius * (0.66 + 0.34 * Math.sin(t * Math.PI * 0.5));
  for (let i = 0; i <= 10; i++) { const t = i / 10; prof.push(new THREE.Vector2(outer(t), t * h)); }
  for (let i = 10; i >= 0; i--) { const t = i / 10; prof.push(new THREE.Vector2(outer(t) - radius * 0.06, Math.max(radius * 0.06, t * h))); }
  prof.unshift(new THREE.Vector2(0.0001, 0)); prof.push(new THREE.Vector2(0.0001, radius * 0.06));
  const bodyGeo = new THREE.LatheGeometry(prof, 36);
  paint(bodyGeo, (p, n, c) => { const inside = Math.hypot(p.x, p.z) < outer(p.y / h) - radius * 0.03 && n.y > -0.2; c.setScalar(inside ? 0.55 + (p.y / h) * 0.35 : 0.8 + Math.max(0, n.dot(SUN)) * 0.3); });
  const body = new THREE.Mesh(bodyGeo, new THREE.MeshStandardMaterial({ map: weaveTex(), vertexColors: true, roughness: 0.85, side: THREE.DoubleSide })); body.castShadow = shadow; body.receiveShadow = true;
  // braided rim: a twisted torus
  const rimGeo = new THREE.TorusGeometry(radius - radius * 0.03, radius * 0.075, 10, 56); rimGeo.rotateX(Math.PI / 2);
  { const p = rimGeo.attributes.position; const v = new THREE.Vector3(); for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const a = Math.atan2(v.z, v.x); const k = 1 + Math.sin(a * 28 + v.y * 40) * 0.12; const rr = Math.hypot(v.x, v.z), base = radius - radius * 0.03; const dr = (rr - base) * k; v.x = Math.cos(a) * (base + dr); v.z = Math.sin(a) * (base + dr); v.y *= k; p.setXYZ(i, v.x, v.y + h, v.z); } rimGeo.computeVertexNormals(); }
  paint(rimGeo, (p, _n, c) => { const a = Math.atan2(p.z, p.x); c.set('#c9965a').lerp(C('#f0c98c'), (Math.sin(a * 28) * 0.5 + 0.5) * 0.6); });
  const rim = new THREE.Mesh(rimGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, emissive: '#ff9a3a', emissiveIntensity: 0 })); rim.castShadow = shadow;
  // side loop handles
  for (const sx of [-1, 1]) { const hg = new THREE.TorusGeometry(radius * 0.18, radius * 0.045, 8, 16, Math.PI); const m = new THREE.Mesh(hg, rim.material); m.position.set(sx * (radius + radius * 0.02), h * 0.86, 0); m.rotation.z = sx * -Math.PI / 2; m.rotation.y = Math.PI / 2; group.add(m); }
  const pile = new THREE.Group(); pile.position.y = radius * 0.08;
  group.add(body, rim, pile);
  // the pile: up to 12 pieces in two layers, newest on top
  const spots: THREE.Vector3[] = [];
  for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; spots.push(new THREE.Vector3(Math.cos(a) * radius * 0.45, 0.06, Math.sin(a) * radius * 0.45)); }
  for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2 + 0.4; spots.push(new THREE.Vector3(Math.cos(a) * radius * 0.22, 0.2, Math.sin(a) * radius * 0.22)); }
  const fill = (kinds: FruitArtKind[]) => {
    pile.clear();
    kinds.slice(-spots.length).forEach((k, i) => { const f = fruitModel(k, false); f.scale.setScalar(0.78); f.position.copy(spots[i]); f.rotation.set((i * 1.3) % 0.6, i * 2.1, (i * 0.7) % 0.5); pile.add(f); });
  };
  return { group, rim, pile, fill, topY: h, radius };
}

// ---------- ground cover ----------
/** grass tufts as crossed alpha cards, instanced, swaying in the wind in the vertex shader */
export function grassTufts(spots: { x: number; z: number; s: number }[], time: { value: number }): THREE.InstancedMesh {
  const a = new THREE.PlaneGeometry(0.6, 0.42).translate(0, 0.2, 0), b = a.clone().rotateY(Math.PI / 2);
  const geo = mergeGeometries([a, b])!;
  const mat = new THREE.MeshStandardMaterial({ map: tuftTex(), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.9 });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = time;
    sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      float w = position.y * 1.6; vec4 ip = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
      transformed.x += sin(uTime * 1.8 + ip.x * 0.7 + ip.z * 0.4) * 0.07 * w; transformed.z += cos(uTime * 1.3 + ip.x * 0.5) * 0.04 * w;`);
  };
  const m = new THREE.InstancedMesh(geo, mat, spots.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), col = new THREE.Color(); const r = rng(77);
  spots.forEach((s, i) => { q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * Math.PI); m4.compose(new THREE.Vector3(s.x, 0, s.z), q, new THREE.Vector3(s.s, s.s * (0.8 + r() * 0.5), s.s)); m.setMatrixAt(i, m4); col.setHSL(0.27 + r() * 0.05, 0.55, 0.62 + r() * 0.15); m.setColorAt(i, col); });
  m.receiveShadow = true;
  return m;
}
/** daisies and poppies: little flower heads on stems, instanced by kind */
export function flowers(spots: { x: number; z: number; kind: number }[]): THREE.Group {
  const g = new THREE.Group();
  const petal = (n: number, rIn: number, rOut: number, colA: string, colB: string, centre: string, h: number) => {
    const s = new THREE.Shape(); for (let i = 0; i <= n * 2; i++) { const a = (i / (n * 2)) * Math.PI * 2; const rr = i % 2 ? rIn : rOut; const x = Math.cos(a) * rr, y = Math.sin(a) * rr; if (i) s.quadraticCurveTo(Math.cos(a - Math.PI / (n * 2)) * rOut * 1.05, Math.sin(a - Math.PI / (n * 2)) * rOut * 1.05, x, y); else s.moveTo(x, y); }
    const head = paint(new THREE.ShapeGeometry(s, 3).rotateX(-Math.PI / 2 + 0.25).translate(0, h, 0), (p, _n, c) => c.set(colA).lerp(C(colB), Math.min(1, Math.hypot(p.x, p.z) / rOut)));
    const dot = paint(new THREE.SphereGeometry(rOut * 0.28, 8, 6).scale(1, 0.5, 1).translate(0, h + 0.015, 0), (_p, _n, c) => c.set(centre));
    const stem = paint(new THREE.CylinderGeometry(0.008, 0.01, h, 4).translate(0, h / 2, 0), (_p, _n, c) => c.set('#4f8f36'));
    return mergeGeometries([head.toNonIndexed(), dot.toNonIndexed(), stem.toNonIndexed()])!;
  };
  const kinds = [petal(8, 0.035, 0.085, '#ffffff', '#f6f0ff', '#ffc93a', 0.22), petal(5, 0.05, 0.09, '#ff5a4a', '#d8262c', '#2b1a1a', 0.28), petal(6, 0.04, 0.075, '#ffd447', '#ffb02e', '#a0521c', 0.18)];
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, side: THREE.DoubleSide });
  kinds.forEach((geo, k) => {
    const list = spots.filter((s) => s.kind % kinds.length === k); if (!list.length) return;
    const m = new THREE.InstancedMesh(geo, mat, list.length); const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(); const r = rng(90 + k);
    list.forEach((s, i) => { q.setFromEuler(new THREE.Euler((r() - 0.5) * 0.3, r() * 6, (r() - 0.5) * 0.3)); m4.compose(new THREE.Vector3(s.x, 0, s.z), q, new THREE.Vector3().setScalar(0.85 + r() * 0.5)); m.setMatrixAt(i, m4); });
    g.add(m);
  });
  return g;
}

// ---------- props ----------
export const woodMat = once(() => new THREE.MeshStandardMaterial({ map: woodTex(), roughness: 0.85, vertexColors: true }));
export const shadeBox = (w: number, h: number, d: number) => paint(new THREE.BoxGeometry(w, h, d), (p, n, c) => c.setScalar(0.72 + Math.max(0, n.dot(SUN)) * 0.35 - (p.y < -h * 0.3 ? 0.1 : 0)));
/** a rustic picket fence along x from x0 to x1 at depth z */
export function fence(x0: number, x1: number, z: number, shadow = true): THREE.Group {
  const g = new THREE.Group(); const parts: THREE.BufferGeometry[] = []; const r = rng(Math.round(x0 * 13 + z * 7));
  for (let x = x0; x <= x1 + 1e-6; x += 0.42) { const h = 0.72 + r() * 0.08; const p = shadeBox(0.16, h, 0.06).translate(x, h / 2, z); parts.push(p); const tip = paint(new THREE.ConeGeometry(0.115, 0.14, 4).rotateY(Math.PI / 4).scale(1, 1, 0.45).translate(x, h + 0.07, z), (_p, _n, c) => c.setScalar(0.95)); parts.push(tip); }
  for (const y of [0.25, 0.55]) parts.push(shadeBox(x1 - x0 + 0.3, 0.09, 0.05).translate((x0 + x1) / 2, y, z - 0.05));
  const m = new THREE.Mesh(mergeGeometries(parts.map((p) => p.index ? p.toNonIndexed() : p))!, woodMat()); m.castShadow = shadow; m.receiveShadow = true; g.add(m);
  return g;
}
/** a slatted crate heaped with fruit */
export function fruitCrate(kind: FruitArtKind, seed = 1, shadow = true): THREE.Group {
  const g = new THREE.Group(); const parts: THREE.BufferGeometry[] = [];
  for (const sx of [-1, 1]) for (const y of [0.1, 0.32]) parts.push(shadeBox(0.06, 0.16, 0.62).translate(sx * 0.42, y, 0));
  for (const sz of [-1, 1]) for (const y of [0.1, 0.32]) parts.push(shadeBox(0.9, 0.16, 0.05).translate(0, y, sz * 0.3));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) parts.push(shadeBox(0.07, 0.44, 0.07).translate(sx * 0.42, 0.22, sz * 0.29));
  parts.push(shadeBox(0.84, 0.04, 0.58).translate(0, 0.04, 0));
  const m = new THREE.Mesh(mergeGeometries(parts.map((p) => p.toNonIndexed()))!, woodMat()); m.castShadow = shadow; m.receiveShadow = true; g.add(m);
  const r = rng(seed);
  const list = Array.from({ length: 10 }, (_, i) => ({ kind, m: new THREE.Matrix4().compose(new THREE.Vector3(i < 9 ? -0.27 + (i % 3) * 0.27 + (r() - 0.5) * 0.05 : 0, i < 9 ? 0.36 + Math.floor(i / 3) * 0.02 : 0.55, i < 9 ? -0.17 + Math.floor(i / 3) * 0.17 : 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(r() * 0.6, r() * 6, r() * 0.6)), new THREE.Vector3().setScalar(0.85)) }));
  const fm = fruitBatch(list, false); if (fm) g.add(fm);
  return g;
}
/** a round hay bale with straw strands */
export function hayBale(shadow = true): THREE.Mesh {
  const geo = new THREE.CylinderGeometry(0.55, 0.55, 0.9, 28, 4).rotateZ(Math.PI / 2);
  paint(geo, (p, n, c) => { const k = noise3(p.x * 14, p.y * 14, p.z * 14); c.set('#e4c25c').lerp(C('#b98f32'), Math.max(0, k) * 0.6).multiplyScalar(0.8 + Math.max(0, n.dot(SUN)) * 0.3); if (Math.abs(n.x) > 0.9) c.lerp(C('#c9a04a'), 0.3 + Math.sin(Math.hypot(p.y, p.z) * 60) * 0.15); });
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 })); m.castShadow = shadow; m.receiveShadow = true; m.position.y = 0.55;
  return m;
}
/** a wooden ladder to lean on a tree */
export function ladder(h = 2.6, shadow = true): THREE.Mesh {
  const parts: THREE.BufferGeometry[] = [];
  for (const sx of [-1, 1]) parts.push(shadeBox(0.07, h, 0.06).translate(sx * 0.22, h / 2, 0));
  for (let y = 0.3; y < h - 0.1; y += 0.36) parts.push(shadeBox(0.44, 0.05, 0.05).translate(0, y, 0));
  const m = new THREE.Mesh(mergeGeometries(parts.map((p) => p.toNonIndexed()))!, woodMat()); m.castShadow = shadow;
  return m;
}
/** a red barn with white trim, gambrel roof and hay loft (background landmark) */
export function barn(): THREE.Group {
  const g = new THREE.Group();
  const wallTex = (() => { const { c, g: x } = canvas(256, 256); x.fillStyle = '#b8352f'; x.fillRect(0, 0, 256, 256); for (let i = 0; i < 16; i++) { x.fillStyle = i % 2 ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.04)'; x.fillRect(i * 16, 0, 16, 256); x.fillStyle = 'rgba(60,10,10,0.35)'; x.fillRect(i * 16, 0, 1.5, 256); } return tex(c, [2, 1]); })();
  const wall = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.9 }), trim = new THREE.MeshStandardMaterial({ color: '#f4efe6', roughness: 0.8 }), roof = new THREE.MeshStandardMaterial({ color: '#5b4a46', roughness: 0.85 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(5, 3, 4), wall); body.position.y = 1.5; g.add(body);
  const shape = new THREE.Shape(); shape.moveTo(-2.7, 0); shape.lineTo(-2.2, 1.1); shape.lineTo(0, 2); shape.lineTo(2.2, 1.1); shape.lineTo(2.7, 0); shape.lineTo(-2.7, 0);
  const gable = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 4.3, bevelEnabled: false }), roof); gable.position.set(0, 3, -2.15); g.add(gable);
  const front = new THREE.Shape(); front.moveTo(-2.5, 0); front.lineTo(-2.05, 1.0); front.lineTo(0, 1.82); front.lineTo(2.05, 1.0); front.lineTo(2.5, 0); front.lineTo(-2.5, 0);
  const fg = new THREE.Mesh(new THREE.ShapeGeometry(front), wall); fg.position.set(0, 3, 2.01); g.add(fg);
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.1, 0.06), new THREE.MeshStandardMaterial({ color: '#9c2a25', roughness: 0.9 })); door.position.set(0, 1.05, 2.03); g.add(door);
  for (const [x, y, w, hh, rz] of [[0, 2.12, 1.95, 0.1, 0], [-0.93, 1.05, 0.1, 2.15, 0], [0.93, 1.05, 0.1, 2.15, 0], [0, 1.05, 0.1, 2.6, 0.82], [0, 1.05, 0.1, 2.6, -0.82]] as const) { const t = new THREE.Mesh(new THREE.BoxGeometry(w, hh, 0.04), trim); t.position.set(x, y, 2.07); t.rotation.z = rz; g.add(t); }
  const loft = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.8, 0.06), trim); loft.position.set(0, 3.7, 2.03); g.add(loft);
  const loftIn = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.62, 0.07), new THREE.MeshStandardMaterial({ color: '#3a2a20' })); loftIn.position.set(0, 3.7, 2.04); g.add(loftIn);
  g.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}
/** puffy cumulus: merged spheres, sun-lit tops, cool undersides */
export function cloud(seed: number): THREE.Mesh {
  const r = rng(seed); const parts: THREE.BufferGeometry[] = [];
  const n = 6 + ((r() * 4) | 0);
  for (let i = 0; i < n; i++) { const s = 0.9 + r() * 1.1; const ico = new THREE.IcosahedronGeometry(s, 3); ico.deleteAttribute('normal'); ico.deleteAttribute('uv'); const w = mergeVertices(ico); w.computeVertexNormals(); parts.push(w.translate((i - n / 2) * 0.9 + (r() - 0.5) * 0.5, Math.sin((i / n) * Math.PI) * 0.8 + r() * 0.3, (r() - 0.5) * 0.8)); }
  const geo = mergeGeometries(parts)!; paint(geo, (p, n, c) => c.set('#c9d9ec').lerp(C('#ffffff'), THREE.MathUtils.clamp(0.4 + n.y * 0.5 + p.y * 0.15, 0, 1)));
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, fog: false }));
  m.scale.set(1.4, 0.8, 1);
  return m;
}
/** soft rolling hills: wide, flattened, gradient-shaded mounds for the horizon */
export function hills(): THREE.Group {
  const g = new THREE.Group(); const r = rng(5);
  for (let i = 0; i < 6; i++) {
    const geo = new THREE.SphereGeometry(1, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    paint(geo, (p, n, c) => c.set('#5f9f4c').lerp(C('#a8d77a'), Math.max(0, n.dot(SUN)) * 0.7 + p.y * 0.2));
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
    m.scale.set(18 + r() * 14, 4 + r() * 4, 8 + r() * 4); m.position.set((i - 2.5) * 22 + (r() - 0.5) * 8, -0.5, -40 - r() * 12);
    g.add(m);
  }
  return g;
}
/** a butterfly: two flapping wings; move it with `update` */
export function butterfly(color: string): { group: THREE.Group; update: (t: number) => void } {
  const g = new THREE.Group(); const mat = new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide, roughness: 0.6, emissive: color, emissiveIntensity: 0.15 });
  const ws = new THREE.Shape(); ws.moveTo(0, 0); ws.bezierCurveTo(0.08, 0.1, 0.18, 0.08, 0.16, -0.02); ws.bezierCurveTo(0.14, -0.1, 0.05, -0.08, 0, 0);
  const wg = new THREE.ShapeGeometry(ws, 6).rotateX(-Math.PI / 2);
  const L = new THREE.Mesh(wg, mat), R = new THREE.Mesh(wg.clone().scale(-1, 1, 1), mat);
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.012, 0.08, 3, 6).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#2b2230' }));
  g.add(L, R, body);
  return { group: g, update: (t) => { const f = Math.sin(t * 22) * 0.9; L.rotation.z = f; R.rotation.z = -f; } };
}

/** a round leafy bush (smooth crown + leaf cards, a few flowers) — foreground framing and garden edges */
export function bush(seed: number, size = 1, shadow = true): THREE.Group {
  const r = rng(seed * 13 + 1); const g = new THREE.Group(); const parts: THREE.BufferGeometry[] = []; const blobs: { c: THREE.Vector3; r: number }[] = [];
  for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2 + r(); blobs.push({ c: new THREE.Vector3(Math.cos(a) * 0.45 * size, (0.45 + r() * 0.25) * size, Math.sin(a) * 0.35 * size), r: (0.45 + r() * 0.2) * size }); }
  blobs.push({ c: new THREE.Vector3(0, 0.75 * size, 0), r: 0.55 * size });
  for (const b of blobs) { const ico = new THREE.IcosahedronGeometry(b.r, 3); ico.deleteAttribute('normal'); ico.deleteAttribute('uv'); const w = mergeVertices(ico); const p = w.attributes.position; const v = new THREE.Vector3(); for (let k = 0; k < p.count; k++) { v.fromBufferAttribute(p, k); v.multiplyScalar(1 + noise3(v.x * 3, v.y * 3, v.z * 3) * 0.1).add(b.c); p.setXYZ(k, v.x, v.y, v.z); } w.computeVertexNormals(); parts.push(w); }
  const geo = mergeGeometries(parts)!;
  paint(geo, (p, n, c) => { c.set('#2f6a2c').lerp(C('#5fae45'), THREE.MathUtils.clamp(p.y / (1.2 * size), 0, 1)).lerp(C('#9fd86e'), Math.pow(Math.max(0, n.dot(SUN)), 1.5) * 0.5); c.multiplyScalar(0.7 + Math.max(0, n.y) * 0.35); });
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 })); m.castShadow = shadow; m.receiveShadow = true; g.add(m);
  const nL = 40; const leaves = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.7 * size, 0.7 * size), new THREE.MeshStandardMaterial({ map: leafCardTex(), alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.7 }), nL);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), col = new THREE.Color();
  for (let i = 0; i < nL; i++) { const b = blobs[(r() * blobs.length) | 0]; const th = r() * Math.PI * 2, u = r() * 1.2 - 0.2; const s2 = Math.sqrt(Math.max(0, 1 - u * u)); const dir = new THREE.Vector3(Math.cos(th) * s2, u, Math.sin(th) * s2).normalize(); q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler((r() - 0.5) * 0.8, (r() - 0.5) * 0.8, r() * 6.28))); m4.compose(b.c.clone().addScaledVector(dir, b.r * 0.94), q, new THREE.Vector3().setScalar(0.7 + r() * 0.5)); leaves.setMatrixAt(i, m4); col.set('#6a9a52').lerp(C('#cdf0a6'), Math.max(0, dir.dot(SUN)) * 0.55); leaves.setColorAt(i, col); }
  g.add(leaves);
  const fl = new THREE.MeshStandardMaterial({ color: '#ff8fb4', roughness: 0.5 });
  for (let i = 0; i < 6; i++) { const b = blobs[(r() * blobs.length) | 0]; const th = r() * Math.PI * 2, u = 0.2 + r() * 0.6; const s2 = Math.sqrt(1 - u * u); const f = new THREE.Mesh(new THREE.SphereGeometry(0.07 * size, 8, 6), fl); f.position.copy(b.c).add(new THREE.Vector3(Math.cos(th) * s2, u, Math.sin(th) * s2).multiplyScalar(b.r)); g.add(f); }
  return g;
}
