/**
 * Fuzzie Brawl Arena — the arena's own art, all made in code (no image files): one painted floor (mown lawn, team zones, dirt
 * paths, a cobbled Sunflower plaza, chalk markings, a stone curb), trimmed hedge walls with stone pillars, banded wooden crates,
 * soft mossy cover rocks, torches with warm glow, glowing team gates, banners and bunting. Everything is shared or merged so a
 * phone only pays for a handful of draw calls; the rules (games/brawl.ts) never look at any of it.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { rng, C, noise3, canvas, tex, once, paint, grassTex } from './orchardArt';
import { blob, hedgeTex } from './sceneArt';

const M = 2.6; // painted margin round the playable rectangle

// ------------------------------------------------------------------ shared textures
export const softGlow = once(() => {
  const { c, g } = canvas(64, 64); const gr = g.createRadialGradient(32, 32, 1, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
});
export const starTex = once(() => {
  const { c, g } = canvas(64, 64); g.translate(32, 33); g.beginPath();
  for (let i = 0; i < 10; i++) { const r = i % 2 ? 11 : 27, a = -Math.PI / 2 + i * Math.PI / 5; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath();
  g.fillStyle = '#ffffff'; g.shadowColor = 'rgba(255,255,255,.9)'; g.shadowBlur = 8; g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
});
export const flameTex = once(() => {
  const { c, g } = canvas(64, 96);
  const gr = g.createRadialGradient(32, 62, 2, 32, 60, 34); gr.addColorStop(0, 'rgba(255,250,210,1)'); gr.addColorStop(0.35, 'rgba(255,190,70,.95)'); gr.addColorStop(0.75, 'rgba(255,110,30,.5)'); gr.addColorStop(1, 'rgba(255,80,20,0)');
  g.fillStyle = gr; g.beginPath(); g.moveTo(32, 2); g.bezierCurveTo(52, 34, 64, 52, 32, 92); g.bezierCurveTo(0, 52, 12, 34, 32, 2); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
});
/** a soft streak that fades from the head (u = 1) to the tail (u = 0): the glow behind a bolt */
export const streakTex = once(() => {
  const { c, g } = canvas(128, 32); const gr = g.createLinearGradient(0, 0, 128, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.7, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,1)');
  g.fillStyle = gr; g.beginPath(); g.moveTo(0, 16); g.lineTo(128, 3); g.lineTo(128, 29); g.closePath(); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
});

// ------------------------------------------------------------------ the painted floor
export interface FloorOpts { hw: number; hd: number; zoneR: number; teams: [string, string]; spawnZ: number }
/** the whole arena floor in one painted texture (blue team at +z, pink at −z) — returns a plane centred on the origin */
export function arenaFloor(o: FloorOpts): THREE.Mesh {
  const { hw, hd } = o, W = hw + M, D = hd + M, PX = 1024 / (W * 2), cw = 1024, ch = Math.round(D * 2 * PX);
  const { c, g } = canvas(cw, ch); const r = rng(5);
  const X = (x: number) => (x + W) * PX, Z = (z: number) => (z + D) * PX, L = (m: number) => m * PX;
  // 1. grass, tiled, then mown stripes
  const gt = grassTex().image as HTMLCanvasElement; const tile = L(5.5);
  for (let y = 0; y < ch; y += tile) for (let x = 0; x < cw; x += tile) g.drawImage(gt, x, y, tile + 1, tile + 1);
  g.fillStyle = 'rgba(255,255,205,.075)'; for (let z = -D; z < D; z += 5) g.fillRect(0, Z(z), cw, L(2.5));
  g.fillStyle = 'rgba(15,70,30,.075)'; for (let z = -D + 2.5; z < D; z += 5) g.fillRect(0, Z(z), cw, L(2.5));
  // 2. dirt paths (rough edges: many jittered discs)
  const dirt = (x0: number, z0: number, x1: number, z1: number, w: number) => {
    const len = Math.hypot(x1 - x0, z1 - z0), n = Math.ceil(len / 0.1);
    for (const [col, k] of [['rgba(70,56,36,.42)', 1.18], ['#b69a70', 1], ['rgba(226,205,165,.55)', 0.62]] as [string, number][]) {
      g.fillStyle = col; for (let i = 0; i <= n; i++) { const t = i / n, x = x0 + (x1 - x0) * t + (r() - 0.5) * 0.12, z = z0 + (z1 - z0) * t + (r() - 0.5) * 0.12; g.beginPath(); g.arc(X(x), Z(z), L(w / 2 * k * (0.93 + r() * 0.14)), 0, 7); g.fill(); }
    }
    for (let i = 0; i < len * 9; i++) { const t = r(), x = x0 + (x1 - x0) * t + (r() - 0.5) * w * 0.8, z = z0 + (z1 - z0) * t + (r() - 0.5) * w * 0.8; g.fillStyle = r() < 0.5 ? 'rgba(90,74,54,.5)' : 'rgba(240,226,196,.55)'; g.fillRect(X(x), Z(z), 2 + r() * 2, 2 + r()); }
  };
  dirt(0, -hd + 0.5, 0, hd - 0.5, 1.8); dirt(-hw + 2, 0, hw - 2, 0, 1.4); dirt(-7, 3, -7, 10, 1.2); dirt(7, -3, 7, -10, 1.2);
  // 3. team zones: a colour wash fading towards the middle, with a scalloped chalk edge and arrows pointing into the arena
  for (const [t, s] of [[0, 1], [1, -1]] as [0 | 1, 1 | -1][]) {
    const gr = g.createLinearGradient(0, Z(s * hd), 0, Z(s * (hd - 9))); gr.addColorStop(0, o.teams[t] + '88'); gr.addColorStop(0.6, o.teams[t] + '30'); gr.addColorStop(1, o.teams[t] + '00');
    g.fillStyle = gr; g.fillRect(X(-hw), Math.min(Z(s * hd), Z(s * (hd - 9))), L(hw * 2), L(9));
    g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = L(0.1); g.setLineDash([L(0.5), L(0.35)]); g.beginPath(); g.moveTo(X(-hw), Z(s * 7.4)); g.lineTo(X(hw), Z(s * 7.4)); g.stroke(); g.setLineDash([]);
    for (const x of [-6.5, 6.5]) { g.fillStyle = 'rgba(255,255,255,.38)'; g.beginPath(); g.moveTo(X(x), Z(-s * 0.1 + s * 8.6)); g.lineTo(X(x + 0.6), Z(s * 9.5)); g.lineTo(X(x), Z(s * 9.1)); g.lineTo(X(x - 0.6), Z(s * 9.5)); g.closePath(); g.fill(); }
    // the gate pad: filled disc, white rings, a star
    const gz = s * o.spawnZ;
    g.fillStyle = o.teams[t] + '55'; g.beginPath(); g.arc(X(0), Z(gz), L(3.5), 0, 7); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = L(0.12); g.beginPath(); g.arc(X(0), Z(gz), L(3.4), 0, 7); g.stroke();
    g.setLineDash([L(0.3), L(0.25)]); g.lineWidth = L(0.07); g.beginPath(); g.arc(X(0), Z(gz), L(2.5), 0, 7); g.stroke(); g.setLineDash([]);
    g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); for (let i = 0; i < 10; i++) { const rr = i % 2 ? 0.45 : 1.1, a = -Math.PI / 2 + i * Math.PI / 5; g.lineTo(X(Math.cos(a) * rr), Z(gz + Math.sin(a) * rr)); } g.closePath(); g.fill();
  }
  // 4. the centre: halfway chalk line, a cobbled plaza under the Sunflower, a chalk ring round it with ticks
  g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = L(0.1); g.setLineDash([L(0.55), L(0.4)]); g.beginPath(); g.moveTo(X(-hw), Z(0)); g.lineTo(X(hw), Z(0)); g.stroke(); g.setLineDash([]);
  const pr = o.zoneR + 0.55; g.fillStyle = '#6f685c'; g.beginPath(); g.arc(X(0), Z(0), L(pr + 0.12), 0, 7); g.fill();
  for (let ring = 0; ring * 0.46 < pr; ring++) {
    const rin = ring * 0.46, rout = Math.min(pr, rin + 0.42), mid = (rin + rout) / 2, n = Math.max(1, Math.round(2 * Math.PI * mid / 0.5)), off = r() * 6;
    for (let i = 0; i < n; i++) {
      const a0 = off + (i / n) * Math.PI * 2 + 0.015, a1 = off + ((i + 1) / n) * Math.PI * 2 - 0.015, k = 0.86 + r() * 0.26;
      g.fillStyle = `rgb(${Math.round(222 * k)},${Math.round(212 * k)},${Math.round(190 * k)})`; g.beginPath(); g.arc(X(0), Z(0), L(rout), a0, a1); g.arc(X(0), Z(0), L(Math.max(0.001, rin)), a1, a0, true); g.closePath(); g.fill();
    }
  }
  g.strokeStyle = 'rgba(60,52,40,.55)'; g.lineWidth = L(0.08); g.beginPath(); g.arc(X(0), Z(0), L(pr + 0.1), 0, 7); g.stroke();
  g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = L(0.09); g.beginPath(); g.arc(X(0), Z(0), L(pr + 0.55), 0, 7); g.stroke();
  for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; g.beginPath(); g.moveTo(X(Math.cos(a) * (pr + 0.7)), Z(Math.sin(a) * (pr + 0.7))); g.lineTo(X(Math.cos(a) * (pr + 1.15)), Z(Math.sin(a) * (pr + 1.15))); g.stroke(); }
  // 5. clover and tiny flowers in the corners and the margin
  for (let i = 0; i < 520; i++) {
    const x = (r() - 0.5) * W * 2, z = (r() - 0.5) * D * 2; const inside = Math.abs(x) < hw - 0.5 && Math.abs(z) < hd - 0.5;
    if (inside && (Math.hypot(x, z) < 5 || Math.abs(x) < 1.6 || Math.abs(z) < 1.2 || Math.abs(z) > hd - 5.5)) continue;
    g.fillStyle = ['rgba(255,255,255,.9)', 'rgba(255,224,92,.9)', 'rgba(255,170,200,.85)'][(r() * 3) | 0]; g.beginPath(); g.arc(X(x), Z(z), 1.6 + r() * 1.4, 0, 7); g.fill();
  }
  // 6. the stone curb round the playable rectangle, and a darker grass verge outside it
  g.fillStyle = 'rgba(20,70,25,.2)'; g.fillRect(0, 0, cw, Z(-hd - 0.9)); g.fillRect(0, Z(hd + 0.9), cw, ch); g.fillRect(0, 0, X(-hw - 0.9), ch); g.fillRect(X(hw + 0.9), 0, cw, ch);
  const curb = (x0: number, z0: number, x1: number, z1: number) => { // a band of stones from (x0,z0) to (x1,z1), 0.85 wide
    const horiz = Math.abs(x1 - x0) > Math.abs(z1 - z0); g.fillStyle = '#5f594f'; g.fillRect(X(Math.min(x0, x1)), Z(Math.min(z0, z1)), L(Math.abs(x1 - x0)), L(Math.abs(z1 - z0)));
    const len = horiz ? Math.abs(x1 - x0) : Math.abs(z1 - z0); let p = 0;
    while (p < len) { const sl = 0.55 + r() * 0.4, k = 0.82 + r() * 0.3; g.fillStyle = `rgb(${Math.round(212 * k)},${Math.round(204 * k)},${Math.round(186 * k)})`;
      const a = horiz ? [X(Math.min(x0, x1) + p + 0.03), Z(Math.min(z0, z1) + 0.04), L(sl - 0.06), L(0.77)] : [X(Math.min(x0, x1) + 0.04), Z(Math.min(z0, z1) + p + 0.03), L(0.77), L(sl - 0.06)];
      g.beginPath(); g.roundRect(a[0], a[1], a[2], a[3], L(0.08)); g.fill(); g.fillStyle = 'rgba(255,255,255,.28)'; g.fillRect(a[0] + 2, a[1] + 2, a[2] - 4, 3); p += sl; }
  };
  curb(-hw - 0.9, -hd - 0.9, hw + 0.9, -hd); curb(-hw - 0.9, hd, hw + 0.9, hd + 0.9); curb(-hw - 0.9, -hd, -hw, hd); curb(hw, -hd, hw + 0.9, hd);
  // 7. a soft shadow cast inwards by the curb and by each end of the arena, so the field reads as a sunk lawn
  const edge = (x0: number, z0: number, x1: number, z1: number, w: number, h: number, dir: 'u' | 'd' | 'l' | 'r') => { const grd = dir === 'u' || dir === 'd' ? g.createLinearGradient(0, dir === 'd' ? Z(z0) : Z(z0 + h), 0, dir === 'd' ? Z(z0 + h) : Z(z0)) : g.createLinearGradient(dir === 'r' ? X(x0) : X(x0 + w), 0, dir === 'r' ? X(x0 + w) : X(x0), 0); grd.addColorStop(0, 'rgba(10,40,15,.28)'); grd.addColorStop(1, 'rgba(10,40,15,0)'); g.fillStyle = grd; g.fillRect(X(x0), Z(z0), L(w), L(h)); void x1; void z1; };
  edge(-hw, -hd, hw, -hd + 1.4, hw * 2, 1.4, 'd'); edge(-hw, hd - 1.4, hw, hd, hw * 2, 1.4, 'u'); edge(-hw, -hd, -hw + 1.4, hd, 1.4, hd * 2, 'r'); edge(hw - 1.4, -hd, hw, hd, 1.4, hd * 2, 'l');
  const t = tex(c); t.anisotropy = 8;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(W * 2, D * 2).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: t, roughness: 0.95 })); m.position.y = 0.006; m.receiveShadow = true; return m;
}

/** big soft cloud shadows that drift over the lawn (one scrolling plane) */
export function cloudShadows(hw: number, hd: number): { mesh: THREE.Mesh; update: (t: number) => void } {
  const { c, g } = canvas(512, 512); const r = rng(33);
  for (let i = 0; i < 26; i++) { const x = r() * 512, y = r() * 512, rad = 40 + r() * 70; for (const ox of [-512, 0, 512]) for (const oy of [-512, 0, 512]) { const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, rad); gr.addColorStop(0, 'rgba(0,20,10,.55)'); gr.addColorStop(1, 'rgba(0,20,10,0)'); g.fillStyle = gr; g.fillRect(x + ox - rad, y + oy - rad, rad * 2, rad * 2); } }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2.4, 3); t.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry((hw + M) * 2, (hd + M) * 2).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0.2, depthWrite: false })); mesh.position.y = 0.03; mesh.renderOrder = 1;
  return { mesh, update: (time) => { t.offset.set(time * 0.006, time * 0.004); } };
}

// ------------------------------------------------------------------ stone, hedges, pillars
const stoneColor = (p: THREE.Vector3, n: THREE.Vector3, c: THREE.Color, base = '#cfc7b4', seed = 0) => {
  const k = noise3(p.x * 6 + seed, p.y * 6, p.z * 6); c.set(base).multiplyScalar(0.84 + k * 0.1 + Math.max(0, n.dot(new THREE.Vector3(-0.5, 0.8, 0.45).normalize())) * 0.16);
  c.multiplyScalar(0.62 + Math.min(1, Math.max(0, p.y) / 0.5) * 0.38);
};
const stoneMat = once(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82 }));
/** one stone pillar: plinth, tapered shaft, cap and a round finial (merged geometry, vertex colours); base at y = 0 */
export function pillarGeo(h: number, w = 0.62, finial = '#e7b94c', seed = 0): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const add = (g: THREE.BufferGeometry, y: number, col: string, sd: number) => { g.translate(0, y, 0); parts.push(paint(g, (p, n, c) => stoneColor(p, n, c, col, seed + sd))); };
  add(new RoundedBoxGeometry(w + 0.2, 0.3, w + 0.2, 2, 0.05), 0.15, '#b9b19e', 1);
  add(new RoundedBoxGeometry(w, h - 0.3, w, 2, 0.06), 0.3 + (h - 0.3) / 2, '#d8d0bd', 2);
  add(new RoundedBoxGeometry(w + 0.22, 0.16, w + 0.22, 2, 0.05), h + 0.08, '#e6dfcd', 3);
  const fin = new THREE.SphereGeometry(0.15, 14, 10).toNonIndexed(); fin.translate(0, h + 0.28, 0); parts.push(paint(fin, (p, n, c) => { c.set(finial).multiplyScalar(0.8 + Math.max(0, n.y) * 0.4); }));
  return mergeGeometries(parts)!;
}
export interface Wall { x: number; z: number; w: number; d: number }
/** trimmed hedge walls (a rounded block with a stepped, lighter top) with a stone pillar at each end — two merged meshes */
export function hedgeRun(walls: Wall[], H: number, shadow: boolean): THREE.Group {
  const out = new THREE.Group(); const hedge: THREE.BufferGeometry[] = [], pil: THREE.BufferGeometry[] = [];
  walls.forEach((b, i) => {
    const body = new RoundedBoxGeometry(b.w, H, b.d, 3, Math.min(0.26, b.w / 2 - 0.01, b.d / 2 - 0.01)); body.translate(b.x, H / 2, b.z);
    const top = new RoundedBoxGeometry(b.w - 0.22, 0.22, b.d - 0.22, 3, 0.1); top.translate(b.x, H + 0.04, b.z);
    for (const [g, lift] of [[body, 0], [top, 1]] as [THREE.BufferGeometry, number][]) {
      const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
      for (let k = 0; k < p.count; k++) { const x = p.getX(k), y = p.getY(k), z = p.getZ(k), nx = Math.abs(n.getX(k)), ny = Math.abs(n.getY(k)); if (ny > 0.6) uv.setXY(k, x / 1.3, z / 1.3); else if (nx > 0.6) uv.setXY(k, z / 1.3, y / 1.3); else uv.setXY(k, x / 1.3, y / 1.3); }
      const k0 = 0.92 + ((i * 7) % 6) * 0.02;
      paint(g, (q, nn, col) => { col.setScalar(k0 * (0.58 + Math.min(1, q.y / H) * 0.5)); if (nn.y > 0.6) col.multiplyScalar(1.22); if (lift) col.multiplyScalar(1.1); col.lerp(C('#fff2c8'), Math.max(0, nn.dot(new THREE.Vector3(-0.5, 0.8, 0.45).normalize())) * 0.12); col.r *= 0.96; col.b *= 0.9; });
      hedge.push(g);
    }
    const horiz = b.w >= b.d, half = (horiz ? b.w : b.d) / 2 - 0.32;
    for (const s of [-1, 1]) { const g = pillarGeo(H + 0.45, Math.min(0.66, Math.min(b.w, b.d) * 0.72), '#e7b94c', i * 3 + s); g.translate(horiz ? b.x + s * half : b.x, 0, horiz ? b.z : b.z + s * half); pil.push(g); }
  });
  const hm = new THREE.Mesh(mergeGeometries(hedge)!, new THREE.MeshStandardMaterial({ map: hedgeTex(), roughness: 0.85, vertexColors: true })); hm.castShadow = shadow; hm.receiveShadow = true;
  const pm = new THREE.Mesh(mergeGeometries(pil)!, stoneMat()); pm.castShadow = shadow; pm.receiveShadow = true; out.add(hm, pm); return out;
}

// ------------------------------------------------------------------ crates and rocks
const crateTex = once(() => {
  const { c, g } = canvas(256, 256); const r = rng(9);
  const tones = ['#c08a52', '#b37e49', '#c99560', '#b98650'];
  for (let p = 0; p < 4; p++) { g.fillStyle = tones[p]; g.fillRect(0, p * 64, 256, 64); for (let k = 0; k < 14; k++) { g.strokeStyle = `rgba(95,60,28,${0.1 + r() * 0.2})`; g.lineWidth = 0.8 + r(); const y = p * 64 + 4 + r() * 56; g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= 256; x += 16) g.lineTo(x, y + Math.sin(x * 0.04 + k) * 2); g.stroke(); } g.fillStyle = 'rgba(50,30,12,.6)'; g.fillRect(0, p * 64, 256, 2.5); g.fillStyle = 'rgba(255,225,180,.28)'; g.fillRect(0, p * 64 + 2.5, 256, 2); }
  // a darker frame and a diagonal brace
  g.fillStyle = '#8c5f35'; g.fillRect(0, 0, 256, 26); g.fillRect(0, 230, 256, 26); g.fillRect(0, 0, 26, 256); g.fillRect(230, 0, 26, 256);
  g.save(); g.translate(128, 128); g.rotate(Math.PI / 4); g.fillRect(-190, -13, 380, 26); g.restore();
  g.strokeStyle = 'rgba(50,30,12,.55)'; g.lineWidth = 2; g.strokeRect(13, 13, 230, 230); g.strokeStyle = 'rgba(255,225,180,.25)'; g.lineWidth = 1.5; g.strokeRect(15, 15, 226, 226);
  for (const [x, y] of [[13, 13], [243, 13], [13, 243], [243, 243], [128, 128]]) { g.fillStyle = '#3b3f46'; g.beginPath(); g.arc(x, y, 5, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.arc(x - 1.5, y - 1.5, 1.8, 0, 7); g.fill(); }
  return tex(c);
});
const steelMat = once(() => new THREE.MeshStandardMaterial({ color: '#59636f', roughness: 0.4, metalness: 0.6 }));
export interface CrateShared { body: THREE.BufferGeometry; steel: THREE.BufferGeometry; mat: THREE.Material }
const crateParts = once((): CrateShared => {
  const body = new RoundedBoxGeometry(1, 0.9, 1, 2, 0.05); body.translate(0, 0.45, 0);
  const steel: THREE.BufferGeometry[] = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const g = new RoundedBoxGeometry(0.12, 0.94, 0.12, 1, 0.02); g.translate(sx * 0.46, 0.47, sz * 0.46); steel.push(g); }
  for (const y of [0.1, 0.8]) { const g = new RoundedBoxGeometry(1.04, 0.07, 1.04, 1, 0.02); g.translate(0, y, 0); steel.push(g); }
  return { body, steel: mergeGeometries(steel)!, mat: new THREE.MeshStandardMaterial({ map: crateTex(), roughness: 0.82 }) };
});
/** a wooden crate with a steel frame (footprint `size` m, 0.9·size tall) */
export function crateModel(size: number, shadow: boolean): THREE.Group {
  const p = crateParts(); const g = new THREE.Group();
  const a = new THREE.Mesh(p.body, p.mat), b = new THREE.Mesh(p.steel, steelMat()); a.castShadow = b.castShadow = shadow; a.receiveShadow = true; g.add(a, b); g.scale.setScalar(size); return g;
}
/** a soft rounded boulder with a pale top, moss on its shoulders and a few pebbles — sits in a hw × hd footprint */
export function coverRock(seed: number, hw: number, hd: number, shadow: boolean): THREE.Group {
  const g = new THREE.Group(); const geo = blob(1, 3, 0.14, seed * 2.3); geo.scale(hw * 1.18, 0.95, hd * 1.18);
  paint(geo, (p, n, c) => {
    const k = noise3(p.x * 3 + seed, p.y * 3, p.z * 3);
    c.set('#8f8a82').lerp(C('#c6c1b6'), THREE.MathUtils.clamp(0.4 + k * 0.5 + n.y * 0.3, 0, 1));
    if (n.y > 0.35 + k * 0.18) c.lerp(C('#84a95c'), THREE.MathUtils.clamp((n.y - 0.3) * 1.6, 0, 0.8));
    c.multiplyScalar(0.55 + Math.min(1, Math.max(0, p.y + 0.1) / 0.8) * 0.45);
  });
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 })); m.position.y = 0.42; m.castShadow = shadow; m.receiveShadow = true; g.add(m);
  const r = rng(seed + 7); const peb: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 4; i++) { const pg = blob(0.12 + r() * 0.08, 1, 0.2, i + seed); const a = r() * 6.28, d = Math.max(hw, hd) * (1.1 + r() * 0.25); pg.translate(Math.cos(a) * d, 0.08, Math.sin(a) * d); peb.push(paint(pg, (p, n, c) => { c.set('#aaa59b').multiplyScalar(0.7 + n.y * 0.3); })); }
  const pm = new THREE.Mesh(mergeGeometries(peb)!, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 })); pm.receiveShadow = true; g.add(pm);
  return g;
}

// ------------------------------------------------------------------ torches, gates, banners, bunting
export interface Torch { group: THREE.Group; flame: THREE.Sprite; halo: THREE.Sprite; pool: THREE.Mesh; phase: number }
const woodMat = once(() => new THREE.MeshStandardMaterial({ color: '#7a5230', roughness: 0.85 }));
const ironMat = once(() => new THREE.MeshStandardMaterial({ color: '#35383f', roughness: 0.45, metalness: 0.7 }));
/** a standing torch: wooden post, iron bowl, a flickering flame, a warm halo and a glow pool on the ground (flicker via `tickTorch`) */
export function torch(phase = 0, h = 1.7): Torch {
  const g = new THREE.Group();
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, h, 8), woodMat()); post.position.y = h / 2; post.castShadow = true; g.add(post);
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.1, 0.2, 12, 1, true), ironMat()); bowl.position.y = h + 0.1; (bowl.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide; g.add(bowl);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.025, 6, 16), ironMat()); ring.rotation.x = Math.PI / 2; ring.position.y = h + 0.2; g.add(ring);
  const coal = new THREE.Mesh(new THREE.CircleGeometry(0.17, 12).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ff9a3a' })); coal.position.y = h + 0.17; g.add(coal);
  const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); flame.scale.set(0.5, 0.75, 1); flame.position.y = h + 0.5; g.add(flame);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: softGlow(), color: '#ffb457', transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending })); halo.scale.setScalar(2.4); halo.position.y = h + 0.45; g.add(halo);
  const pool = new THREE.Mesh(new THREE.CircleGeometry(2.6, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: softGlow(), color: '#ffa94a', transparent: true, opacity: 0.32, depthWrite: false, blending: THREE.AdditiveBlending })); pool.position.y = 0.035; g.add(pool);
  return { group: g, flame, halo, pool, phase };
}
export function tickTorch(t: Torch, time: number): void {
  const f = 0.5 + Math.sin(time * 9 + t.phase) * 0.22 + Math.sin(time * 23 + t.phase * 2) * 0.14;
  t.flame.scale.set(0.46 + f * 0.12, 0.66 + f * 0.26, 1); (t.halo.material as THREE.SpriteMaterial).opacity = 0.38 + f * 0.3; (t.pool.material as THREE.MeshBasicMaterial).opacity = 0.2 + f * 0.2;
}
const gateTex = (col: string) => { const { c, g } = canvas(64, 64); g.fillStyle = col; g.fillRect(0, 0, 64, 64); g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); for (let i = 0; i < 10; i++) { const rr = i % 2 ? 8 : 20, a = -Math.PI / 2 + i * Math.PI / 5; g.lineTo(32 + Math.cos(a) * rr, 33 + Math.sin(a) * rr); } g.closePath(); g.fill(); return tex(c); };
/** a team gate: two pillars, a glowing arch, a star plaque and pennants (stands at z = 0, facing ±z; pulse via `userData.glow`) */
export function gate(color: string, span = 3.9): THREE.Group {
  const g = new THREE.Group(); const col = new THREE.Color(color);
  for (const s of [-1, 1]) { const p = new THREE.Mesh(pillarGeo(2.3, 0.6, color, s), stoneMat()); p.position.x = s * span; p.castShadow = true; g.add(p); }
  const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(-span, 2.35, 0), new THREE.Vector3(0, 3.5, 0), new THREE.Vector3(span, 2.35, 0));
  const arch = new THREE.Mesh(new THREE.TubeGeometry(curve, 28, 0.13, 8), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.1, roughness: 0.4 })); g.add(arch);
  const plaque = new THREE.Mesh(new THREE.CircleGeometry(0.46, 24), new THREE.MeshBasicMaterial({ map: gateTex(color), side: THREE.DoubleSide })); plaque.position.set(0, 2.95, 0); g.add(plaque);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.05, 8, 24), new THREE.MeshStandardMaterial({ color: '#f3e3b2', roughness: 0.4, metalness: 0.5 })); rim.position.copy(plaque.position); g.add(rim);
  const tri: THREE.BufferGeometry[] = []; for (let i = 1; i < 8; i++) { if (i === 4) continue; const p = curve.getPoint(i / 8); const t = new THREE.BufferGeometry(); t.setAttribute('position', new THREE.Float32BufferAttribute([p.x - 0.2, p.y - 0.1, 0, p.x + 0.2, p.y - 0.1, 0, p.x, p.y - 0.62, 0], 3)); t.setIndex([0, 1, 2, 0, 2, 1]); t.computeVertexNormals(); const cl = i % 2 ? col : new THREE.Color('#ffffff'); t.setAttribute('color', new THREE.Float32BufferAttribute([cl.r, cl.g, cl.b, cl.r, cl.g, cl.b, cl.r, cl.g, cl.b], 3)); tri.push(t); }
  g.add(new THREE.Mesh(mergeGeometries(tri)!, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide })));
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: softGlow(), color, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending })); halo.scale.set(9, 3.6, 1); halo.position.set(0, 2.9, 0); g.add(halo);
  g.userData.glow = { arch, halo };
  return g;
}
export function tickGate(g: THREE.Group, time: number, hot: number): void {
  const { arch, halo } = g.userData.glow as { arch: THREE.Mesh; halo: THREE.Sprite }; const k = 0.5 + Math.sin(time * 2.4) * 0.5;
  (arch.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.8 + k * 0.5 + hot * 1.2; (halo.material as THREE.SpriteMaterial).opacity = 0.3 + k * 0.15 + hot * 0.4;
}
export interface Banner { group: THREE.Group; cloth: THREE.Mesh; base: Float32Array; phase: number }
/** a tall pole with a hanging team banner that waves (call `waveBanner`) */
export function banner(color: string, accent = '#ffffff', phase = 0): Banner {
  const g = new THREE.Group(); const h = 3.1;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, h, 8), woodMat()); pole.position.y = h / 2; pole.castShadow = true; g.add(pole);
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.06, 6).rotateZ(Math.PI / 2), woodMat()); bar.position.set(0.5, h - 0.12, 0); g.add(bar);
  const fin = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), new THREE.MeshStandardMaterial({ color: '#e7b94c', metalness: 0.5, roughness: 0.4 })); fin.position.y = h + 0.06; g.add(fin);
  const { c, g: cx } = canvas(128, 256); cx.fillStyle = color; cx.fillRect(0, 0, 128, 256); cx.fillStyle = accent; cx.globalAlpha = 0.9;
  cx.beginPath(); cx.moveTo(0, 60); cx.lineTo(64, 110); cx.lineTo(128, 60); cx.lineTo(128, 96); cx.lineTo(64, 146); cx.lineTo(0, 96); cx.fill(); cx.globalAlpha = 1;
  cx.beginPath(); for (let i = 0; i < 10; i++) { const rr = i % 2 ? 14 : 34, a = -Math.PI / 2 + i * Math.PI / 5; cx.lineTo(64 + Math.cos(a) * rr, 190 + Math.sin(a) * rr); } cx.closePath(); cx.fill();
  cx.fillStyle = 'rgba(0,0,0,.16)'; cx.fillRect(0, 0, 6, 256); cx.fillRect(122, 0, 6, 256); cx.fillStyle = '#e7b94c'; cx.fillRect(0, 244, 128, 12);
  const geo = new THREE.PlaneGeometry(0.9, 1.9, 6, 10); geo.translate(0.5, h - 0.2 - 0.95, 0);
  const cloth = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex(c), side: THREE.DoubleSide, roughness: 0.75 })); cloth.castShadow = false; g.add(cloth);
  return { group: g, cloth, base: (geo.attributes.position.array as Float32Array).slice(), phase };
}
export function waveBanner(b: Banner, time: number): void {
  const p = b.cloth.geometry.attributes.position as THREE.BufferAttribute, top = 3.1 - 0.2;
  for (let i = 0; i < p.count; i++) { const y = b.base[i * 3 + 1], x = b.base[i * 3] - 0.5, hang = (top - y) / 1.9; p.setZ(i, Math.sin(time * 2.6 + hang * 4 + b.phase + x * 3) * 0.13 * hang); p.setX(i, b.base[i * 3] + Math.sin(time * 2.1 + b.phase + hang * 2) * 0.05 * hang); }
  p.needsUpdate = true;
}
/** a sagging rope with triangular pennants between two points (one merged mesh, vertex colours) */
export function bunting(a: THREE.Vector3, b: THREE.Vector3, n: number, colors: string[], sag = 0.7): THREE.Mesh {
  const geos: THREE.BufferGeometry[] = []; const pts: THREE.Vector3[] = [];
  const at = (t: number) => new THREE.Vector3().lerpVectors(a, b, t).setY(a.y + (b.y - a.y) * t - Math.sin(t * Math.PI) * sag);
  for (let i = 0; i <= 24; i++) pts.push(at(i / 24));
  const rope = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.018, 4); const rc = new THREE.Color('#5a4630'); const ra = new Float32Array(rope.attributes.position.count * 3); for (let i = 0; i < ra.length; i += 3) { ra[i] = rc.r; ra[i + 1] = rc.g; ra[i + 2] = rc.b; } rope.setAttribute('color', new THREE.BufferAttribute(ra, 3)); rope.deleteAttribute('normal'); rope.deleteAttribute('uv'); geos.push(rope.toNonIndexed());
  const dir = new THREE.Vector3().subVectors(b, a).setY(0).normalize();
  for (let i = 0; i < n; i++) {
    const p = at((i + 0.5) / n), cl = new THREE.Color(colors[i % colors.length]), w = 0.17;
    const t = new THREE.BufferGeometry(); t.setAttribute('position', new THREE.Float32BufferAttribute([p.x - dir.x * w, p.y, p.z - dir.z * w, p.x + dir.x * w, p.y, p.z + dir.z * w, p.x, p.y - 0.42, p.z], 3));
    t.setAttribute('color', new THREE.Float32BufferAttribute([cl.r, cl.g, cl.b, cl.r, cl.g, cl.b, cl.r * 0.85, cl.g * 0.85, cl.b * 0.85], 3)); t.setIndex([0, 1, 2, 0, 2, 1]); geos.push(t.toNonIndexed());
  }
  return new THREE.Mesh(mergeGeometries(geos)!, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }));
}
