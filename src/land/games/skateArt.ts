/**
 * Ice Skating — the rink's art, built in code (no image files): a painted ice sheet with hockey markings, scratches and
 * the Fuzzies logo; dasher boards with advert panels, a kick plate and glass; tiered stands full of instanced Fuzzy fans;
 * a banner wall; floodlight towers with warm glow; a Zamboni with a blinking beacon; snowy pines and drifts; the glowing
 * gate arches (a colour for each, the lit one with a beam, a curtain and chevrons on the ice); skate trails that fade.
 * Everything is shared / instanced / baked so a phone keeps up. Rules: skate.ts; scene wiring: skateView.ts.
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import * as T from '../../game/textures3d';
import { RINK, GATE_HW, trackPoint, trackLength } from './skate';
import { canvas, tex, once, C, rng } from './orchardArt';
import { blob, treeRing } from './sceneArt';

const BRAND = '#d6336c';
const FONT = `'Fredoka', ui-rounded, 'Arial Rounded MT Bold', system-ui, sans-serif`;

// ---------- paths round the rink ----------
export interface PathPt { x: number; z: number; nx: number; nz: number; s: number }
/** samples round the rounded rectangle, `off` metres out from the boards (negative = inside), n + 1 of them (closed) */
export function rinkPath(off: number, n: number): PathPt[] {
  const inset = -off, L = trackLength(inset); const out: PathPt[] = [];
  for (let i = 0; i <= n; i++) { const s = (i / n) * L; const p = trackPoint(s, inset); out.push({ x: p.x, z: p.z, nx: -p.tz, nz: p.tx, s }); }
  return out;
}
/** a strip swept along the path between two cross-section points (offset from the boards, height) */
function strip(path: PathPt[], a: { o: number; y: number }, b: { o: number; y: number }, uLen: number, keep?: (p: PathPt) => boolean, v: [number, number] = [0, 1]): THREE.BufferGeometry {
  const n = path.length; const pos = new Float32Array(n * 6), uv = new Float32Array(n * 4); const idx: number[] = [];
  path.forEach((p, i) => { pos.set([p.x + p.nx * a.o, a.y, p.z + p.nz * a.o, p.x + p.nx * b.o, b.y, p.z + p.nz * b.o], i * 6); uv.set([-p.s / uLen, v[0], -p.s / uLen, v[1]], i * 4); });
  for (let i = 0; i < n - 1; i++) { if (keep && !keep(path[i])) continue; const a0 = i * 2, b0 = a0 + 1, a1 = a0 + 2, b1 = a0 + 3; idx.push(a0, a1, b0, b0, a1, b1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
const isEast = (p: PathPt) => p.nx > 0.96;

// ---------- textures ----------
/** the ice: pale blue sheet, resurfacer bands, hundreds of skate scratches, hockey markings and a raspberry fuzzies logo */
export const iceTex = once(() => {
  const mobile = innerWidth < 800 || navigator.maxTouchPoints > 0;
  const W = mobile ? 1024 : 2048, H = Math.round(W * (RINK.hd / RINK.hw));
  const { c, g } = canvas(W, H); const R = rng(11); const ppm = W / (2 * RINK.hw);
  const X = (x: number) => (x + RINK.hw) * ppm, Z = (z: number) => (z + RINK.hd) * ppm;
  const grd = g.createRadialGradient(W / 2, H / 2, 20, W / 2, H / 2, W * 0.62); grd.addColorStop(0, '#f6fcff'); grd.addColorStop(0.6, '#e3f1fb'); grd.addColorStop(1, '#c9e0f1');
  g.fillStyle = grd; g.fillRect(0, 0, W, H);
  // soft cloudy blotches (frozen water is never one flat colour)
  for (let i = 0; i < 40; i++) { const x = R() * W, y = R() * H, r = (60 + R() * 220) * (W / 2048); const k = g.createRadialGradient(x, y, 0, x, y, r); const lt = R() < 0.5; k.addColorStop(0, lt ? 'rgba(255,255,255,0.28)' : 'rgba(120,170,215,0.13)'); k.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = k; g.fillRect(x - r, y - r, r * 2, r * 2); }
  // resurfacer passes: faint long bands
  for (let i = 0; i < 9; i++) { g.fillStyle = i % 2 ? 'rgba(255,255,255,0.10)' : 'rgba(150,190,225,0.06)'; g.fillRect(0, (i / 9) * H, W, H / 9); }
  // markings first (scratches go over them)
  const line = (x0: number, z0: number, x1: number, z1: number, w: number, col: string) => { g.strokeStyle = col; g.lineWidth = w * ppm; g.beginPath(); g.moveTo(X(x0), Z(z0)); g.lineTo(X(x1), Z(z1)); g.stroke(); };
  const ring = (x: number, z: number, r: number, w: number, col: string) => { g.strokeStyle = col; g.lineWidth = w * ppm; g.beginPath(); g.arc(X(x), Z(z), r * ppm, 0, Math.PI * 2); g.stroke(); };
  const red = 'rgba(214,60,70,0.78)', blue = 'rgba(46,110,205,0.8)';
  line(0, -RINK.hd, 0, RINK.hd, 0.3, red); g.setLineDash([0.34 * ppm, 0.34 * ppm]); line(0, -RINK.hd, 0, RINK.hd, 0.12, 'rgba(255,255,255,0.9)'); g.setLineDash([]);
  for (const sx of [-1, 1]) { line(sx * 4.3, -RINK.hd, sx * 4.3, RINK.hd, 0.34, blue); line(sx * 11.2, -RINK.hd + 1.5, sx * 11.2, RINK.hd - 1.5, 0.1, red); }
  ring(0, 0, 2.6, 0.12, blue);
  for (const sx of [-1, 1]) { g.fillStyle = 'rgba(120,185,240,0.35)'; g.beginPath(); g.arc(X(sx * 11.2), Z(0), 1.7 * ppm, sx < 0 ? -Math.PI / 2 : Math.PI / 2, sx < 0 ? Math.PI / 2 : Math.PI * 1.5); g.fill(); ring(sx * 11.2, 0, 1.7, 0.08, red); }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { ring(sx * 7.6, sz * 3.6, 1.7, 0.1, red); g.fillStyle = red; g.beginPath(); g.arc(X(sx * 7.6), Z(sz * 3.6), 0.22 * ppm, 0, Math.PI * 2); g.fill(); line(sx * 7.6 - 0.45, sz * 3.6 - 1.7, sx * 7.6 - 0.45, sz * 3.6 - 2.1, 0.07, red); line(sx * 7.6 + 0.45, sz * 3.6 - 1.7, sx * 7.6 + 0.45, sz * 3.6 - 2.1, 0.07, red); line(sx * 7.6 - 0.45, sz * 3.6 + 1.7, sx * 7.6 - 0.45, sz * 3.6 + 2.1, 0.07, red); line(sx * 7.6 + 0.45, sz * 3.6 + 1.7, sx * 7.6 + 0.45, sz * 3.6 + 2.1, 0.07, red); }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { g.fillStyle = red; g.beginPath(); g.arc(X(sx * 4.3 * 0.5 + sx * 0.9), Z(sz * 3.6), 0.15 * ppm, 0, Math.PI * 2); g.fill(); }
  // the fuzzies logo at centre ice
  g.save(); g.translate(X(0), Z(0)); g.font = `700 ${1.45 * ppm}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = 'rgba(214,51,108,0.62)'; g.fillText('fuzzies', 0, 0.06 * ppm); g.restore();
  // scratches: long carving arcs, a worn ring where people skate, short crossing cuts
  g.lineCap = 'round';
  for (let i = 0; i < (W > 1500 ? 700 : 420); i++) {
    const a = R() * Math.PI * 2, rx = (5 + R() * 6.5), rz = (2.5 + R() * 4.3), cx = (R() - 0.5) * 6, cz = (R() - 0.5) * 3;
    const a0 = R() * 6.28, len = 0.3 + R() * 1.5;
    g.strokeStyle = R() < 0.72 ? `rgba(255,255,255,${0.18 + R() * 0.35})` : `rgba(90,140,190,${0.06 + R() * 0.1})`; g.lineWidth = (0.6 + R() * 1.3) * (W / 2048);
    g.beginPath(); g.ellipse(X(cx), Z(cz), rx * ppm, rz * ppm, a * 0.12, a0, a0 + len); g.stroke();
  }
  for (let i = 0; i < 260; i++) { const x = (R() - 0.5) * 2 * (RINK.hw - 1), z = (R() - 0.5) * 2 * (RINK.hd - 1), a = R() * 6.28, l = 0.25 + R() * 1.2; g.strokeStyle = `rgba(255,255,255,${0.2 + R() * 0.3})`; g.lineWidth = (0.5 + R()) * (W / 2048); g.beginPath(); g.moveTo(X(x), Z(z)); g.lineTo(X(x + Math.cos(a) * l), Z(z + Math.sin(a) * l)); g.stroke(); }
  const t = tex(c); t.anisotropy = 8; return t;
});
/** the dasher boards: advert panels above a kick plate (repeats every 14.4 m) */
export const boardTex = once(() => {
  const { c, g } = canvas(2048, 128); const P = 6, pw = 2048 / P;
  const ads: [string, string, string, string][] = [['fuzzies', BRAND, '#ffffff', '700'], ['HOT COCOA', '#f4e3cf', '#7a4426', '700'], ['WINTER GAMES', '#2f7fd1', '#ffffff', '700'], ['ICE CREAM', '#ffffff', BRAND, '700'], ['fuzzy coats', '#2c3e50', '#ffd447', '700'], ['SKATE!', '#1fa98a', '#ffffff', '700']];
  ads.forEach(([txt, bg, fg, w], i) => {
    g.fillStyle = bg; g.fillRect(i * pw, 0, pw, 96);
    g.fillStyle = 'rgba(255,255,255,0.14)'; g.fillRect(i * pw, 0, pw, 8);
    g.fillStyle = fg; g.font = `${w} ${txt.length > 8 ? 40 : 52}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, i * pw + pw / 2, 52);
    g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(i * pw, 0, 3, 96); // panel seam
  });
  // kick plate: scuffed grey-blue
  g.fillStyle = '#8c9fb3'; g.fillRect(0, 96, 2048, 32); g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(0, 96, 2048, 3);
  const R = rng(5); for (let i = 0; i < 90; i++) { g.strokeStyle = `rgba(255,255,255,${0.1 + R() * 0.2})`; g.lineWidth = 1 + R() * 2; g.beginPath(); const x = R() * 2048, y = 100 + R() * 26; g.moveTo(x, y); g.lineTo(x + 20 + R() * 70, y + (R() - 0.5) * 6); g.stroke(); }
  const t = tex(c); t.wrapS = THREE.RepeatWrapping; return t;
});
/** banners on the stand's back wall */
const bannerTex = once(() => {
  const { c, g } = canvas(2048, 256); const P = 8, pw = 2048 / P; const cols = [BRAND, '#2f7fd1', '#ffd447', '#1fa98a', '#ff8a3d', '#4cc9f0', BRAND, '#7ed957'];
  g.fillStyle = '#23324a'; g.fillRect(0, 0, 2048, 256);
  for (let i = 0; i < P; i++) {
    const x = i * pw + pw * 0.14, w = pw * 0.72; g.fillStyle = cols[i]; g.beginPath(); g.moveTo(x, 14); g.lineTo(x + w, 14); g.lineTo(x + w, 210); g.lineTo(x + w / 2, 244); g.lineTo(x, 210); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); const cx = x + w / 2, cy = 92; for (let k = 0; k < 10; k++) { const r = k % 2 ? 14 : 34, a = -Math.PI / 2 + (k * Math.PI) / 5; g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } g.closePath(); g.fill();
    g.fillStyle = i % 3 === 2 ? '#7a5a00' : '#ffffff'; g.font = `700 30px ${FONT}`; g.textAlign = 'center'; g.fillText(['fuzzies', 'WINTER', 'SKATE', 'GO PINK', 'SPIN!', 'COCOA', 'fuzzies', 'COOL'][i], cx, 170);
  }
  const t = tex(c); t.wrapS = THREE.RepeatWrapping; return t;
});
const seatTex = once(() => {
  const { c, g } = canvas(256, 64); g.fillStyle = '#9fb0c4'; g.fillRect(0, 0, 256, 64);
  for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? '#7f93ab' : '#b3c2d4'; g.fillRect(i * 64 + 3, 6, 58, 52); g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(i * 64 + 3, 6, 58, 6); }
  return tex(c);
});
const beamTex = once(() => { const { c, g } = canvas(4, 128); const k = g.createLinearGradient(0, 128, 0, 0); k.addColorStop(0, 'rgba(255,255,255,0.9)'); k.addColorStop(0.5, 'rgba(255,255,255,0.28)'); k.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = k; g.fillRect(0, 0, 4, 128); return tex(c); });
const curtainTex = once(() => { const { c, g } = canvas(8, 128); const k = g.createLinearGradient(0, 128, 0, 0); k.addColorStop(0, 'rgba(255,255,255,0.55)'); k.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = k; g.fillRect(0, 0, 8, 128); return tex(c); });

// ---------- the ice, boards, glass ----------
export function iceSheet(mobile: boolean): THREE.Mesh {
  const hw = RINK.hw + 0.05, hd = RINK.hd + 0.05, r = RINK.r + 0.05;
  const s = new THREE.Shape(); s.moveTo(-hw + r, -hd); s.lineTo(hw - r, -hd); s.absarc(hw - r, -hd + r, r, -Math.PI / 2, 0, false); s.lineTo(hw, hd - r); s.absarc(hw - r, hd - r, r, 0, Math.PI / 2, false); s.lineTo(-hw + r, hd); s.absarc(-hw + r, hd - r, r, Math.PI / 2, Math.PI, false); s.lineTo(-hw, -hd + r); s.absarc(-hw + r, -hd + r, r, Math.PI, Math.PI * 1.5, false);
  const g = new THREE.ShapeGeometry(s, 14).rotateX(-Math.PI / 2); // lies flat, facing up
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + RINK.hw) / (2 * RINK.hw), 1 - (p.getZ(i) + RINK.hd) / (2 * RINK.hd));
  const m = new THREE.MeshPhysicalMaterial({ map: iceTex(), roughness: 0.14, metalness: 0, clearcoat: mobile ? 0.5 : 1, clearcoatRoughness: 0.05, envMapIntensity: 1.6, color: '#cfe0ee', transparent: true, opacity: 0.84 });
  const mesh = new THREE.Mesh(g, m); mesh.position.y = 0.03; mesh.receiveShadow = true; mesh.renderOrder = -1; return mesh;
}
/** the snow outside the rink: a big sheet with a rounded-rectangle hole where the ice is */
export function snowField(): THREE.Mesh {
  const S = 90; const o = new THREE.Shape(); o.moveTo(-S, -S); o.lineTo(S, -S); o.lineTo(S, S); o.lineTo(-S, S); o.closePath();
  const hw = RINK.hw + 0.02, hd = RINK.hd + 0.02, r = RINK.r + 0.02; const h = new THREE.Path();
  h.moveTo(-hw + r, -hd); h.lineTo(hw - r, -hd); h.absarc(hw - r, -hd + r, r, -Math.PI / 2, 0, false); h.lineTo(hw, hd - r); h.absarc(hw - r, hd - r, r, 0, Math.PI / 2, false); h.lineTo(-hw + r, hd); h.absarc(-hw + r, hd - r, r, Math.PI / 2, Math.PI, false); h.lineTo(-hw, -hd + r); h.absarc(-hw + r, -hd + r, r, Math.PI, Math.PI * 1.5, false);
  o.holes.push(h);
  const g = new THREE.ShapeGeometry(o, 12).rotateX(-Math.PI / 2); const p = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 5, p.getZ(i) / 5);
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: '#dfe9f5', roughness: 0.92 })); m.receiveShadow = true; return m;
}
export function boards(mobile: boolean): THREE.Group {
  const N = mobile ? 120 : 200; const grp = new THREE.Group(); const L = trackLength(-0.04);
  const path = rinkPath(0.04, N); const uLen = 14.4;
  const adMat = new THREE.MeshStandardMaterial({ map: boardTex(), roughness: 0.45, side: THREE.DoubleSide });
  const face = new THREE.Mesh(strip(path, { o: 0, y: 0 }, { o: 0, y: 0.9 }, uLen), adMat); face.receiveShadow = true; grp.add(face);
  const capMat = new THREE.MeshStandardMaterial({ color: '#f1f4f7', roughness: 0.5, side: THREE.DoubleSide });
  const cap = new THREE.Mesh(strip(path, { o: 0, y: 0.9 }, { o: 0.22, y: 0.9 }, 4), capMat); cap.castShadow = !mobile; grp.add(cap);
  const outer = new THREE.Mesh(strip(path, { o: 0.22, y: 0.9 }, { o: 0.22, y: 0 }, 4), new THREE.MeshStandardMaterial({ color: '#cdd7e0', roughness: 0.7, side: THREE.DoubleSide })); grp.add(outer);
  const edgeLine = new THREE.Mesh(strip(path, { o: 0, y: 0.905 }, { o: 0.05, y: 0.905 }, 4), new THREE.MeshBasicMaterial({ color: BRAND, side: THREE.DoubleSide })); grp.add(edgeLine);
  // glass: see-through with a faint blue sheen, framed by posts and a top rail
  const glass = new THREE.Mesh(strip(path, { o: 0.1, y: 0.9 }, { o: 0.1, y: 1.6 }, 4), new THREE.MeshStandardMaterial({ color: '#cfe8ff', roughness: 0.04, metalness: 0.2, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false })); glass.renderOrder = 4; grp.add(glass);
  const rail = new THREE.Mesh(strip(path, { o: 0.06, y: 1.6 }, { o: 0.14, y: 1.6 }, 4), new THREE.MeshStandardMaterial({ color: '#9fb4c8', roughness: 0.4, metalness: 0.5, side: THREE.DoubleSide })); grp.add(rail);
  const posts = Math.round(L / 2.4); const pg = new THREE.BoxGeometry(0.07, 0.72, 0.07); const pm = new THREE.InstancedMesh(pg, new THREE.MeshStandardMaterial({ color: '#9fb4c8', roughness: 0.4, metalness: 0.5 }), posts);
  const m4 = new THREE.Matrix4(); for (let i = 0; i < posts; i++) { const p = trackPoint((i / posts) * L, -0.1); m4.makeTranslation(p.x, 1.26, p.z); pm.setMatrixAt(i, m4); } grp.add(pm);
  // the players' door on the east end (where the Zamboni waits)
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.9, 2.6), new THREE.MeshStandardMaterial({ color: '#f2c230', roughness: 0.55 })); door.position.set(RINK.hw + 0.07, 0.45, 0.2); grp.add(door);
  for (let k = -3; k <= 3; k++) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.9, 0.2), new THREE.MeshStandardMaterial({ color: '#2a2f3a', roughness: 0.6 })); st.position.set(RINK.hw + 0.09, 0.45, 0.2 + k * 0.38 - 0.1); st.rotation.x = 0.0; st.scale.set(1, 1, 0.5); grp.add(st); }
  return grp;
}

// ---------- the stands, the fans, the banner wall ----------
export interface Crowd { group: THREE.Group; update: (t: number, dt: number, cheer: number) => void }
export function stands(mobile: boolean): Crowd {
  const grp = new THREE.Group(); const N = mobile ? 140 : 220; const path = rinkPath(0, N);
  const O0 = 1.5, ROWS = mobile ? 4 : 5, TREAD = 0.95, RISE = 0.52, H0 = 0.55;
  const seat = new THREE.MeshStandardMaterial({ map: seatTex(), roughness: 0.8, side: THREE.DoubleSide }); seatTex().wrapS = THREE.RepeatWrapping;
  const concrete = new THREE.MeshStandardMaterial({ color: '#c3ccd8', roughness: 0.9, side: THREE.DoubleSide });
  const front = new THREE.Mesh(strip(path, { o: O0 - 0.05, y: 0 }, { o: O0 - 0.05, y: H0 }, 14.4, (p) => !isEast(p)), new THREE.MeshStandardMaterial({ map: boardTex(), roughness: 0.5, side: THREE.DoubleSide })); grp.add(front);
  for (let k = 0; k < ROWS; k++) {
    const o = O0 + k * TREAD, h = H0 + k * RISE;
    grp.add(new THREE.Mesh(strip(path, { o, y: h }, { o: o + TREAD, y: h }, 3.2, (p) => !isEast(p)), seat));
    grp.add(new THREE.Mesh(strip(path, { o, y: h - (k ? RISE : H0) }, { o, y: h }, 4, (p) => !isEast(p)), concrete));
  }
  const top = H0 + (ROWS - 1) * RISE, oBack = O0 + ROWS * TREAD;
  const wall = new THREE.Mesh(strip(path, { o: oBack, y: top - 0.2 }, { o: oBack, y: top + 3.2 }, 16.4, (p) => !isEast(p)), new THREE.MeshStandardMaterial({ map: bannerTex(), roughness: 0.8, side: THREE.DoubleSide })); grp.add(wall);
  grp.add(new THREE.Mesh(strip(path, { o: oBack, y: top + 3.2 }, { o: oBack + 0.5, y: top + 3.2 }, 4, (p) => !isEast(p)), concrete));
  // the fans: round furry blobs with two eyes, in the team colours (one instanced mesh each for body, eye whites, pupils)
  const R = rng(23); const spots: { x: number; y: number; z: number; yaw: number; ph: number; sp: number; col: THREE.Color }[] = [];
  const pal = [BRAND, '#2f7fd1', '#ffd447', '#1fa98a', '#ff8a3d', '#ffffff', '#4cc9f0', '#ff9ec4', '#7ed957'].map((h) => C(h));
  for (let k = 0; k < ROWS; k++) {
    const o = O0 + k * TREAD + TREAD * 0.5, h = H0 + k * RISE; const step = 0.82;
    const L = trackLength(-o); const n = Math.floor(L / step);
    for (let i = 0; i < n; i++) {
      if (R() < 0.12) continue;
      const p = trackPoint((i / n) * L + R() * 0.2, -o); const nx = -p.tz, nz = p.tx;
      if (nx > 0.96) continue;
      spots.push({ x: p.x, y: h + 0.3, z: p.z, yaw: Math.atan2(-nx, -nz), ph: R() * 6.28, sp: 2 + R() * 2, col: pal[(R() * pal.length) | 0].clone().multiplyScalar(0.8 + R() * 0.3) });
    }
  }
  const bodyGeo = blob(0.28, 1, 0.1, 3), eyeGeo = new THREE.SphereGeometry(0.075, 8, 6), pupGeo = new THREE.SphereGeometry(0.042, 6, 5);
  const body = new THREE.InstancedMesh(bodyGeo, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.95 }), spots.length);
  const eyes = new THREE.InstancedMesh(eyeGeo, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.4 }), spots.length * 2);
  const pups = new THREE.InstancedMesh(pupGeo, new THREE.MeshStandardMaterial({ color: '#1d1b22', roughness: 0.3 }), spots.length * 2);
  spots.forEach((s, i) => body.setColorAt(i, s.col)); grp.add(body, eyes, pups);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1), v = new THREE.Vector3(), sq = new THREE.Vector3();
  let acc = 0, cheerPrev = 0;
  const update = (t: number, dt: number, cheer: number) => {
    acc += dt; if (acc < 0.05 && cheer === 0 && cheerPrev === 0) return; acc = 0; cheerPrev = cheer;
    spots.forEach((s, i) => {
      const jump = cheer > 0 ? Math.abs(Math.sin(t * 9 + s.ph)) * 0.3 * Math.min(1, cheer) : 0;
      const y = s.y + Math.sin(t * s.sp + s.ph) * 0.025 + jump; const squash = 1 + Math.sin(t * s.sp * 1.5 + s.ph) * 0.03 - jump * 0.1;
      q.setFromAxisAngle(up, s.yaw); sq.set(1 / Math.sqrt(squash), squash, 1 / Math.sqrt(squash));
      m.compose(v.set(s.x, y, s.z), q, sq); body.setMatrixAt(i, m);
      for (let e = 0; e < 2; e++) {
        const lx = (e ? 1 : -1) * 0.1, lz = 0.235; // local → world (rotate by yaw)
        const wx = s.x + lx * Math.cos(s.yaw) + lz * Math.sin(s.yaw), wz = s.z - lx * Math.sin(s.yaw) + lz * Math.cos(s.yaw);
        m.compose(v.set(wx, y + 0.06, wz), q, one); eyes.setMatrixAt(i * 2 + e, m);
        const px = wx + 0.033 * Math.sin(s.yaw), pz = wz + 0.033 * Math.cos(s.yaw);
        m.compose(v.set(px, y + 0.06, pz), q, one); pups.setMatrixAt(i * 2 + e, m);
      }
    });
    body.instanceMatrix.needsUpdate = eyes.instanceMatrix.needsUpdate = pups.instanceMatrix.needsUpdate = true;
  };
  update(0, 1, 0);
  return { group: grp, update };
}

// ---------- floodlight towers ----------
export interface Lamps { group: THREE.Group; update: (t: number) => void }
export function floodlights(mobile: boolean): Lamps {
  const g = new THREE.Group(); const glow = new THREE.SpriteMaterial({ map: T.glow('rgba(255,238,196,0.95)', 'rgba(255,238,196,0)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.6 });
  const pole = new THREE.MeshStandardMaterial({ color: '#4a5666', roughness: 0.5, metalness: 0.6 }), houseM = new THREE.MeshStandardMaterial({ color: '#2c3440', roughness: 0.6 });
  const panel = (() => { const { c, g: x } = canvas(128, 64); x.fillStyle = '#fff8e2'; x.fillRect(0, 0, 128, 64); x.fillStyle = '#ffe7a8'; for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) { x.beginPath(); x.arc(16 + i * 32, 16 + j * 32, 11, 0, 6.3); x.fill(); } x.strokeStyle = '#8a7a52'; x.lineWidth = 3; x.strokeRect(1, 1, 126, 62); return tex(c); })();
  const panelM = new THREE.MeshBasicMaterial({ map: panel, toneMapped: false });
  const coneMat = new THREE.MeshBasicMaterial({ map: beamTex(), color: '#ffeab8', transparent: true, opacity: 0.055, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const coneGeo = new THREE.CylinderGeometry(8, 0.5, 24, 20, 1, true).rotateX(Math.PI / 2).translate(0, 0, 12);
  const towers: [number, number][] = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
  for (const [sx, sz] of towers) {
    const x = sx * (RINK.hw + 8.4), z = sz * (RINK.hd + 7.4); const t = new THREE.Group(); t.position.set(x, 0, z);
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.22, 9.4, 8), pole); p.position.y = 4.7; p.castShadow = !mobile; t.add(p);
    const head = new THREE.Group(); head.position.y = 9.5; head.rotation.order = 'YXZ'; head.rotation.y = Math.atan2(-x, -z); head.rotation.x = Math.atan2(9.5, Math.hypot(x, z)); t.add(head);
    const hb = new THREE.Mesh(new THREE.BoxGeometry(3.1, 1.7, 0.3), houseM); head.add(hb);
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 1.4), panelM); pl.position.z = 0.17; head.add(pl);
    const sp = new THREE.Sprite(glow); sp.scale.setScalar(6); sp.position.z = 0.6; head.add(sp);
    if (!mobile) { const cone = new THREE.Mesh(coneGeo, coneMat); cone.position.z = 0.2; head.add(cone); }
    g.add(t);
  }
  return { group: g, update: () => { /* steady */ } };
}

// ---------- the Zamboni ----------
export interface Zamboni { group: THREE.Group; update: (t: number) => void }
export function zamboni(): Zamboni {
  const g = new THREE.Group(); const m = (c: string, r = 0.5, me = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: me });
  const rb = (w: number, h: number, d: number, rad: number, mat: THREE.Material, x: number, y: number, z: number) => { const me = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, rad), mat); me.position.set(x, y, z); me.castShadow = true; me.receiveShadow = true; g.add(me); return me; };
  // faces +x (towards the rink); length along x
  rb(3.0, 1.05, 1.5, 0.12, m('#f4f7fa', 0.4), 0, 0.85, 0);                 // body
  rb(3.02, 0.22, 1.52, 0.08, m(BRAND, 0.45), 0, 0.72, 0);                  // raspberry stripe
  rb(1.05, 0.95, 1.3, 0.14, m('#f4f7fa', 0.4), 0.55, 1.78, 0);             // cab
  rb(0.04, 0.58, 1.1, 0.02, m('#5aa4d8', 0.1, 0.3), 1.08, 1.82, 0);        // windscreen
  rb(0.9, 0.04, 1.1, 0.02, m('#5aa4d8', 0.1, 0.3), 0.55, 2.26, 0);         // roof glass
  rb(1.55, 1.25, 1.42, 0.14, m('#3a86d8', 0.45), -0.95, 1.82, 0);          // the snow tank
  rb(0.22, 0.2, 1.6, 0.05, m('#2a2f3a', 0.6), 1.62, 0.34, 0);              // front blade
  rb(0.2, 0.3, 1.7, 0.05, m('#8a96a4', 0.5, 0.6), -1.55, 0.4, 0);          // conditioner bar behind
  for (const [x, z] of [[1.0, 0.82], [1.0, -0.82], [-1.0, 0.82], [-1.0, -0.82]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 18).rotateX(Math.PI / 2), m('#23262d', 0.9)); w.position.set(x, 0.42, z); w.castShadow = true; g.add(w); const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.32, 12).rotateX(Math.PI / 2), m('#b8c2cc', 0.4, 0.7)); hub.position.set(x, 0.42, z); g.add(hub); }
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.8, 8), m('#6b7684', 0.4, 0.7)); pipe.position.set(-0.5, 2.7, 0.55); g.add(pipe);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 8), new THREE.MeshStandardMaterial({ color: '#ffb300', emissive: '#ff9500', emissiveIntensity: 1.5 })); beacon.position.set(0.55, 2.42, 0); g.add(beacon);
  const bg = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.glow('rgba(255,170,40,0.9)', 'rgba(255,170,40,0)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); bg.scale.setScalar(1.8); bg.position.copy(beacon.position); g.add(bg);
  const dot = new THREE.Mesh(new THREE.CircleGeometry(0.18, 20), m('#d6336c', 0.5)); dot.position.set(0, 0.95, 0.77); g.add(dot);
  return { group: g, update: (t) => { const on = (Math.sin(t * 6) > 0 ? 1 : 0.15); (beacon.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.2 + on * 1.8; (bg.material as THREE.SpriteMaterial).opacity = on; } };
}

// ---------- scenery round the rink: snowy pines, drifts, distant hills ----------
export function surroundings(mobile: boolean): THREE.Group {
  const g = new THREE.Group(); const R = rng(41);
  const spots: { x: number; z: number; s: number }[] = [];
  const n = mobile ? 20 : 36;
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + (R() - 0.5) * 0.15, k = 1.0 + R() * 0.45; spots.push({ x: Math.cos(a) * (RINK.hw + 20) * k, z: Math.sin(a) * (RINK.hd + 17) * k, s: 1.1 + R() * 0.9 }); }
  g.add(treeRing(spots, 'snowpine', { shadow: false }));
  const driftMat = new THREE.MeshStandardMaterial({ color: '#eef4fb', roughness: 0.95 });
  for (let i = 0; i < (mobile ? 14 : 24); i++) { const a = R() * Math.PI * 2, rr = 1 + R() * 0.5; const d = new THREE.Mesh(blob(1.4 + R() * 1.8, 2, 0.12, i), driftMat); d.position.set(Math.cos(a) * (RINK.hw + 12) * rr, -0.4, Math.sin(a) * (RINK.hd + 11) * rr); d.scale.set(1.5, 0.4, 1.1); g.add(d); }
  const hillMat = new THREE.MeshStandardMaterial({ color: '#b4c4e2', roughness: 1 });
  for (let i = 0; i < 11; i++) { const a = (i / 11) * Math.PI * 2 + 0.3; const h = new THREE.Mesh(blob(11 + R() * 7, 2, 0.14, i * 3), hillMat); h.position.set(Math.cos(a) * 80, -3.5, Math.sin(a) * 80); h.scale.set(1.7, 0.7 + R() * 0.35, 1.1); g.add(h); }
  return g;
}

// ---------- gates: glowing arches in a colour sequence ----------
export const GATE_COLORS = ['#ff4d7a', '#ff9a3d', '#ffd23f', '#7ed957', '#2ec4b6', '#4cc9f0', '#3a86ff', '#ff7fb7'];
export interface GateArt { group: THREE.Group; mirror: THREE.Group; color: THREE.Color; setLit: (on: boolean) => void; update: (t: number) => void; burst: () => void }
export function gateArt(index: number, dir: { x: number; z: number }, mobile: boolean): GateArt {
  const color = C(GATE_COLORS[index % GATE_COLORS.length]); const group = new THREE.Group(); group.rotation.y = Math.atan2(dir.x, dir.z);
  const glowMat = (op: number) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false });
  const archMat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.5, roughness: 0.35 });
  const tube = new THREE.TorusGeometry(GATE_HW, 0.075, 8, mobile ? 20 : 32, Math.PI); tube.scale(1, 0.5, 1);
  const arch = new THREE.Mesh(tube, archMat); arch.position.y = 1.15; arch.castShadow = false; group.add(arch);
  const postGeo = new THREE.CylinderGeometry(0.075, 0.09, 1.15, 10);
  for (const sx of [-1, 1]) { const p = new THREE.Mesh(postGeo, archMat); p.position.set(sx * GATE_HW, 0.575, 0); group.add(p); const base = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.06, 14), new THREE.MeshStandardMaterial({ color: '#f4f7fa', roughness: 0.5 })); base.position.set(sx * GATE_HW, 0.03, 0); group.add(base); }
  const halo = new THREE.Mesh(new THREE.TorusGeometry(GATE_HW, 0.26, 8, 24, Math.PI).scale(1, 0.5, 1), glowMat(0.34)); halo.position.y = 1.15; group.add(halo);
  const curtain = new THREE.Mesh(new THREE.PlaneGeometry(GATE_HW * 2, 1.9), new THREE.MeshBasicMaterial({ map: curtainTex(), color, transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false })); curtain.position.y = 0.95; group.add(curtain);
  const line = new THREE.Mesh(new THREE.PlaneGeometry(GATE_HW * 2 + 0.3, 0.34).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7, depthWrite: false, toneMapped: false })); line.position.y = 0.045; group.add(line);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.85, 15, 14, 1, true), new THREE.MeshBasicMaterial({ map: beamTex(), color, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false })); beam.position.y = 7.5; group.add(beam);
  const pool = new THREE.Mesh(new THREE.CircleGeometry(GATE_HW * 1.5, 28).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: T.glow('rgba(255,255,255,0.8)', 'rgba(255,255,255,0)'), color, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); pool.position.y = 0.05; group.add(pool);
  const chev: THREE.Mesh[] = []; const cs = new THREE.Shape(); cs.moveTo(-0.7, 0); cs.lineTo(0, 0.9); cs.lineTo(0.7, 0); cs.lineTo(0.45, 0); cs.lineTo(0, 0.55); cs.lineTo(-0.45, 0); cs.closePath();
  const cg = new THREE.ShapeGeometry(cs).rotateX(-Math.PI / 2);
  for (let i = 0; i < 3; i++) { const c = new THREE.Mesh(cg, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, depthWrite: false, toneMapped: false, side: THREE.DoubleSide })); c.position.set(0, 0.05, -1.4 - i * 1.5); group.add(c); chev.push(c); }
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 40).rotateX(-Math.PI / 2), glowMat(0)); ring.position.y = 0.08; group.add(ring);
  line.renderOrder = 2; pool.renderOrder = 2; chev.forEach((c) => { c.renderOrder = 2; }); ring.renderOrder = 3; halo.renderOrder = 3; curtain.renderOrder = 3; beam.renderOrder = 3;
  // the reflection in the ice: the arch, its posts and the halo
  const mirror = new THREE.Group(); mirror.rotation.y = group.rotation.y;
  const mArch = arch.clone(), mHalo = halo.clone(); mirror.add(mArch, mHalo);
  for (const sx of [-1, 1]) { const mp = new THREE.Mesh(postGeo, archMat); mp.position.set(sx * GATE_HW, 0.575, 0); mirror.add(mp); }
  let lit = false, burstT = 1;
  const lights = [halo, curtain, beam, pool, mHalo, ...chev];
  const setLit = (on: boolean) => { lit = on; lights.forEach((l) => { l.visible = on; }); archMat.emissiveIntensity = on ? 2.1 : 0.45; (line.material as THREE.MeshBasicMaterial).opacity = on ? 0.9 : 0.32; };
  setLit(false);
  return {
    group, mirror, color, setLit,
    burst: () => { burstT = 0; },
    update: (t) => {
      if (lit) {
        archMat.emissiveIntensity = 1.8 + Math.sin(t * 5) * 0.5; (beam.material as THREE.MeshBasicMaterial).opacity = 0.45 + Math.sin(t * 3) * 0.12;
        chev.forEach((c, i) => { const k = (t * 1.6 - i * 0.28) % 1; (c.material as THREE.MeshBasicMaterial).opacity = 0.2 + 0.7 * Math.max(0, Math.sin(k * Math.PI)); });
      }
      if (burstT < 1) { burstT = Math.min(1, burstT + 0.03); ring.scale.setScalar(1 + burstT * 3.2); (ring.material as THREE.MeshBasicMaterial).opacity = (1 - burstT) * 0.9; }
    },
  };
}

// ---------- skate trails: fading lines on the ice ----------
export interface Trail { mesh: THREE.Mesh; add: (x: number, z: number, heading: number, t: number) => void; update: (t: number) => void; clear: () => void }
export function trail(max = 90, life = 4.5, mobile = false): Trail {
  const N = mobile ? Math.round(max * 0.7) : max; const per = 2; // two blades
  const pos = new Float32Array(per * N * 2 * 3), col = new Float32Array(per * N * 2 * 4); const idx: number[] = [];
  for (let b = 0; b < per; b++) for (let i = 0; i < N - 1; i++) { const a = (b * N + i) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 4)); g.setIndex(idx);
  const mat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(g, mat); mesh.frustumCulled = false; mesh.renderOrder = 2;
  const pts: { x: number; z: number; px: number; pz: number; t: number }[] = []; // px/pz = the sideways unit vector there
  let lastX = 1e9, lastZ = 1e9;
  const W = 0.028;
  return {
    mesh,
    add: (x, z, heading, t) => {
      if (Math.hypot(x - lastX, z - lastZ) < 0.22) return; lastX = x; lastZ = z;
      pts.push({ x, z, px: Math.cos(heading), pz: -Math.sin(heading), t }); if (pts.length > N) pts.shift();
    },
    update: (t) => {
      for (let b = 0; b < per; b++) {
        const side = b ? 0.13 : -0.13;
        for (let i = 0; i < N; i++) {
          const p = pts[Math.max(0, pts.length - N + i)] ?? { x: 0, z: 0, px: 1, pz: 0, t: -99 }; const o = (b * N + i) * 2;
          const live = pts.length > 0 && i >= N - pts.length; const age = live ? (t - p.t) / life : 1; const a = live ? Math.max(0, 1 - age) : 0;
          const cx = p.x + p.px * side, cz = p.z + p.pz * side, qx = p.px, qz = p.pz;
          pos.set([cx - qx * W, 0.052, cz - qz * W, cx + qx * W, 0.052, cz + qz * W], o * 3);
          const al = a * 0.55; col.set([0.42, 0.6, 0.78, al, 0.42, 0.6, 0.78, al], o * 4);
        }
      }
      g.attributes.position.needsUpdate = true; g.attributes.color.needsUpdate = true;
    },
    clear: () => { pts.length = 0; },
  };
}

// ---------- falling snow ----------
export function snowfall(mobile: boolean): { points: THREE.Points; update: (dt: number, at: THREE.Vector3) => void } {
  const n = mobile ? 140 : 280; const pos = new Float32Array(n * 3); const R = rng(77); const sp = new Float32Array(n);
  for (let i = 0; i < n; i++) { pos.set([(R() - 0.5) * 34, R() * 14, (R() - 0.5) * 34], i * 3); sp[i] = 0.5 + R() * 0.9; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.PointsMaterial({ map: T.glow('rgba(255,255,255,1)', 'rgba(255,255,255,0)'), size: 0.16, transparent: true, depthWrite: false, opacity: 0.85, sizeAttenuation: true });
  const points = new THREE.Points(g, m); points.frustumCulled = false;
  return { points, update: (dt, at) => {
    for (let i = 0; i < n; i++) { let y = pos[i * 3 + 1] - sp[i] * dt; if (y < 0) y += 14; pos[i * 3 + 1] = y; pos[i * 3] += Math.sin(y * 0.8 + i) * 0.12 * dt; }
    g.attributes.position.needsUpdate = true; points.position.set(at.x, 0, at.z);
  } };
}

// ---------- the reflection in the ice ----------
/** a clone of `src` for the mirror world under the ice; instanced meshes share their buffers so fans bob in the reflection too */
export function mirrorClone<T extends THREE.Object3D>(src: T): T {
  const c = src.clone(true) as T; const a: THREE.InstancedMesh[] = [], b: THREE.InstancedMesh[] = [];
  src.traverse((o) => { if ((o as THREE.InstancedMesh).isInstancedMesh) a.push(o as THREE.InstancedMesh); });
  c.traverse((o) => { o.castShadow = false; o.receiveShadow = false; if ((o as THREE.InstancedMesh).isInstancedMesh) b.push(o as THREE.InstancedMesh); });
  a.forEach((s, i) => { b[i].instanceMatrix = s.instanceMatrix; if (s.instanceColor) b[i].instanceColor = s.instanceColor; });
  return c;
}
/** copy the pose of a moving object onto its reflection (same node structure) */
export function syncMirror(src: THREE.Object3D, dst: THREE.Object3D): void {
  dst.position.copy(src.position); dst.quaternion.copy(src.quaternion); dst.scale.copy(src.scale); dst.visible = src.visible;
  for (let i = 0; i < src.children.length && i < dst.children.length; i++) syncMirror(src.children[i], dst.children[i]);
}
