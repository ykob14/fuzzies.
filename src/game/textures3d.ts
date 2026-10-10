/** Procedural textures for the realistic Fuzzy Crossing scene. Everything is painted on canvases at start-up, so no image files ship. */
import * as THREE from 'three';

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')!];
}

/** Small seeded RNG so the world looks the same every game. */
export function rng(seed: number): () => number {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function tex(c: HTMLCanvasElement, repeat: [number, number] = [1, 1], color = true, aniso = 8): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = aniso;
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function speckle(x: CanvasRenderingContext2D, w: number, h: number, n: number, r: () => number, colors: string[], size: [number, number]): void {
  for (let i = 0; i < n; i++) {
    x.fillStyle = colors[Math.floor(r() * colors.length)];
    const s = size[0] + r() * (size[1] - size[0]);
    x.fillRect(r() * w, r() * h, s, s);
  }
}

/** Asphalt for the 5 road lanes (one texture tile = 4 units along the road × 5 lanes). */
export function asphalt(): { map: THREE.CanvasTexture; rough: THREE.CanvasTexture } {
  const W = 1024, H = 1280, U = 256; // 256 px per unit
  const r = rng(11);
  const [c, x] = canvas(W, H);
  x.fillStyle = '#3a3c40'; x.fillRect(0, 0, W, H);
  speckle(x, W, H, 60000, r, ['#2c2e32', '#46484c', '#333539', '#505257', '#28292c'], [1, 3]);
  // worn darker tyre tracks in each lane
  for (let lane = 0; lane < 5; lane++) {
    for (const off of [0.28, 0.72]) {
      const g = x.createLinearGradient(0, (lane + off - 0.1) * U, 0, (lane + off + 0.1) * U);
      g.addColorStop(0, 'rgba(20,20,22,0)'); g.addColorStop(0.5, 'rgba(20,20,22,0.28)'); g.addColorStop(1, 'rgba(20,20,22,0)');
      x.fillStyle = g; x.fillRect(0, (lane + off - 0.1) * U, W, 0.2 * U);
    }
    // oil drips in the middle of the lane
    for (let i = 0; i < 3; i++) {
      x.fillStyle = `rgba(10,10,12,${0.12 + r() * 0.15})`;
      x.beginPath(); x.ellipse(r() * W, (lane + 0.5 + (r() - 0.5) * 0.15) * U, 20 + r() * 40, 6 + r() * 10, 0, 0, Math.PI * 2); x.fill();
    }
  }
  // cracks
  x.strokeStyle = 'rgba(15,15,17,0.55)'; x.lineWidth = 2;
  for (let i = 0; i < 14; i++) {
    let px = r() * W, py = r() * H;
    x.beginPath(); x.moveTo(px, py);
    for (let k = 0; k < 8; k++) { px += (r() - 0.5) * 60; py += (r() - 0.5) * 60; x.lineTo(px, py); }
    x.stroke();
  }
  // markings: dashed white between lanes, solid edge lines
  const paint = (y: number, h: number, dash: boolean, color: string) => {
    x.fillStyle = color;
    if (!dash) x.fillRect(0, y, W, h);
    else for (let d = 0; d < 2; d++) x.fillRect(d * 2 * U + 0.15 * U, y, 1.1 * U, h);
    // paint wear
    speckle(x, W, h, 900, r, ['rgba(58,60,64,0.8)'], [1, 3]);
  };
  for (let l = 1; l < 5; l++) { const y = l * U - 6; x.save(); x.beginPath(); x.rect(0, y, W, 12); x.clip(); paint(y, 12, true, '#e9e9e2'); x.restore(); }
  x.save(); x.beginPath(); x.rect(0, 10, W, 12); x.clip(); paint(10, 12, false, '#e8d36a'); x.restore();
  x.save(); x.beginPath(); x.rect(0, H - 22, W, 12); x.clip(); paint(H - 22, 12, false, '#e9e9e2'); x.restore();

  const [rc, rx] = canvas(256, 320);
  rx.drawImage(c, 0, 0, 256, 320);
  const id = rx.getImageData(0, 0, 256, 320);
  for (let i = 0; i < id.data.length; i += 4) {
    const lum = (id.data[i] + id.data[i + 1] + id.data[i + 2]) / 3;
    const v = lum > 150 ? 150 : 225 + (lum - 60) * 0.3; // paint is a bit smoother than tarmac
    id.data[i] = id.data[i + 1] = id.data[i + 2] = Math.max(0, Math.min(255, v));
  }
  rx.putImageData(id, 0, 0);
  return { map: tex(c), rough: tex(rc, [1, 1], false) };
}

export function grass(): THREE.CanvasTexture {
  const S = 512;
  const r = rng(3);
  const [c, x] = canvas(S, S);
  x.fillStyle = '#4b7a2a'; x.fillRect(0, 0, S, S);
  for (let i = 0; i < 90; i++) {
    const g = x.createRadialGradient(0, 0, 0, 0, 0, 60);
    const col = ['rgba(98,140,52,0.35)', 'rgba(52,92,30,0.35)', 'rgba(120,140,60,0.25)'][i % 3];
    g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.save(); x.translate(r() * S, r() * S); x.fillStyle = g; x.fillRect(-60, -60, 120, 120); x.restore();
  }
  x.lineWidth = 1.4;
  for (let i = 0; i < 9000; i++) {
    const px = r() * S, py = r() * S, l = 4 + r() * 9, a = -Math.PI / 2 + (r() - 0.5) * 1.2;
    x.strokeStyle = ['#3d6b20', '#5c8f34', '#6fa33f', '#2f5718', '#7fae4a'][Math.floor(r() * 5)];
    x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke();
  }
  return tex(c);
}

export function concrete(tile = true): THREE.CanvasTexture {
  const S = 512;
  const r = rng(7);
  const [c, x] = canvas(S, S);
  x.fillStyle = '#a7a59f'; x.fillRect(0, 0, S, S);
  speckle(x, S, S, 30000, r, ['#9a9892', '#b3b1ab', '#8f8d88', '#bcbab4'], [1, 2]);
  for (let i = 0; i < 25; i++) { x.fillStyle = `rgba(80,78,72,${r() * 0.08})`; x.beginPath(); x.arc(r() * S, r() * S, 10 + r() * 50, 0, Math.PI * 2); x.fill(); }
  if (tile) {
    x.strokeStyle = 'rgba(70,68,64,0.6)'; x.lineWidth = 3;
    for (let i = 0; i <= 2; i++) { x.beginPath(); x.moveTo(i * S / 2, 0); x.lineTo(i * S / 2, S); x.stroke(); x.beginPath(); x.moveTo(0, i * S / 2); x.lineTo(S, i * S / 2); x.stroke(); }
  }
  return tex(c);
}

export function stone(): THREE.CanvasTexture {
  const S = 512;
  const r = rng(19);
  const [c, x] = canvas(S, S);
  x.fillStyle = '#5d554b'; x.fillRect(0, 0, S, S);
  for (let row = 0; row < 6; row++) {
    let px = -r() * 60;
    while (px < S) {
      const w = 50 + r() * 70, h = S / 6;
      const v = 95 + r() * 50;
      x.fillStyle = `rgb(${v},${v * 0.94},${v * 0.86})`;
      x.beginPath(); x.roundRect(px + 3, row * h + 3, w - 6, h - 6, 12); x.fill();
      x.fillStyle = 'rgba(40,60,30,0.35)';
      if (r() < 0.4) { x.beginPath(); x.ellipse(px + w * 0.5, row * h + h * 0.8, w * 0.4, h * 0.15, 0, 0, Math.PI * 2); x.fill(); }
      px += w;
    }
  }
  speckle(x, S, S, 15000, r, ['rgba(0,0,0,0.15)', 'rgba(255,255,255,0.08)'], [1, 2]);
  return tex(c);
}

export function bark(): THREE.CanvasTexture {
  const W = 256, H = 512;
  const r = rng(5);
  const [c, x] = canvas(W, H);
  x.fillStyle = '#8a6440'; x.fillRect(0, 0, W, H);
  speckle(x, W, H, 20000, r, ['#76522f', '#9a7046', '#694626', '#a57b50'], [1, 3]);
  for (let i = 0; i < 40; i++) {
    let px = r() * W;
    x.strokeStyle = `rgba(45,28,14,${0.35 + r() * 0.35})`; x.lineWidth = 2 + r() * 4;
    x.beginPath(); x.moveTo(px, 0);
    for (let y = 0; y <= H; y += 16) { px += (r() - 0.5) * 8; x.lineTo(px, y); }
    x.stroke();
  }
  for (let i = 0; i < 12; i++) { x.fillStyle = 'rgba(80,110,40,0.35)'; x.beginPath(); x.ellipse(r() * W, r() * H, 6 + r() * 14, 10 + r() * 30, 0, 0, Math.PI * 2); x.fill(); }
  return tex(c);
}

export function rings(): THREE.CanvasTexture {
  const S = 256;
  const [c, x] = canvas(S, S);
  x.fillStyle = '#c9a06a'; x.fillRect(0, 0, S, S);
  for (let i = 30; i > 0; i--) { x.strokeStyle = i % 2 ? 'rgba(130,85,45,0.55)' : 'rgba(170,120,70,0.4)'; x.lineWidth = 2; x.beginPath(); x.arc(S / 2 + Math.sin(i) * 2, S / 2 + Math.cos(i) * 2, i * 4, 0, Math.PI * 2); x.stroke(); }
  x.strokeStyle = '#5a3d24'; x.lineWidth = 10; x.beginPath(); x.arc(S / 2, S / 2, S / 2 - 5, 0, Math.PI * 2); x.stroke();
  return tex(c);
}

export function lilyPad(): THREE.CanvasTexture {
  const S = 256;
  const [c, x] = canvas(S, S);
  const g = x.createRadialGradient(S / 2, S / 2, 10, S / 2, S / 2, S / 2);
  g.addColorStop(0, '#6fbf4a'); g.addColorStop(0.75, '#4e9a34'); g.addColorStop(1, '#3a7a26');
  x.fillStyle = g; x.fillRect(0, 0, S, S);
  x.strokeStyle = 'rgba(160,210,110,0.55)'; x.lineWidth = 2;
  for (let i = 0; i < 18; i++) { const a = (i / 18) * Math.PI * 2; x.beginPath(); x.moveTo(S / 2, S / 2); x.lineTo(S / 2 + Math.cos(a) * S / 2, S / 2 + Math.sin(a) * S / 2); x.stroke(); }
  x.fillStyle = 'rgba(120,80,40,0.25)';
  const r = rng(2);
  for (let i = 0; i < 6; i++) { x.beginPath(); x.arc(r() * S, r() * S, 3 + r() * 6, 0, Math.PI * 2); x.fill(); }
  return tex(c);
}

export function straw(): THREE.CanvasTexture {
  const S = 256;
  const r = rng(9);
  const [c, x] = canvas(S, S);
  x.fillStyle = '#9c7a3c'; x.fillRect(0, 0, S, S);
  x.lineWidth = 2;
  for (let i = 0; i < 700; i++) {
    const px = r() * S, py = r() * S, l = 20 + r() * 40, a = r() * Math.PI;
    x.strokeStyle = ['#d9b56a', '#b58f48', '#7a5a28', '#e8cd8a'][Math.floor(r() * 4)];
    x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke();
  }
  return tex(c);
}

export function leaves(): THREE.CanvasTexture {
  const S = 256;
  const r = rng(13);
  const [c, x] = canvas(S, S);
  x.fillStyle = '#2f5a24'; x.fillRect(0, 0, S, S);
  for (let i = 0; i < 1400; i++) {
    x.fillStyle = ['#3d7330', '#264a1c', '#4f8a3a', '#1f3d17', '#5d9a44'][Math.floor(r() * 5)];
    x.save(); x.translate(r() * S, r() * S); x.rotate(r() * Math.PI);
    x.beginPath(); x.ellipse(0, 0, 4 + r() * 4, 2 + r() * 2, 0, 0, Math.PI * 2); x.fill(); x.restore();
  }
  return tex(c);
}

/** Tileable ripple normal map for the river. */
export function waterNormals(): THREE.CanvasTexture {
  const S = 256;
  const [c, x] = canvas(S, S);
  const id = x.createImageData(S, S);
  const r = rng(21);
  const waves = Array.from({ length: 14 }, () => ({ fx: Math.floor(r() * 7) - 3, fy: Math.floor(r() * 7) + 1, ph: r() * 6.28, a: 0.3 + r() * 0.7 }));
  const hgt = (u: number, v: number) => waves.reduce((s, w) => s + w.a * Math.sin(2 * Math.PI * (w.fx * u + w.fy * v) + w.ph), 0);
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    const u = i / S, v = j / S, e = 1 / S;
    const dx = (hgt(u + e, v) - hgt(u - e, v)) * 0.035 * S / 2;
    const dy = (hgt(u, v + e) - hgt(u, v - e)) * 0.035 * S / 2;
    const n = new THREE.Vector3(-dx, -dy, 1).normalize();
    const k = (j * S + i) * 4;
    id.data[k] = (n.x * 0.5 + 0.5) * 255; id.data[k + 1] = (n.y * 0.5 + 0.5) * 255; id.data[k + 2] = (n.z * 0.5 + 0.5) * 255; id.data[k + 3] = 255;
  }
  x.putImageData(id, 0, 0);
  return tex(c, [1, 1], false);
}

/** Random strand heights for shell-rendered fur (each texel is one hair). */
export function furStrands(): THREE.CanvasTexture {
  const S = 128;
  const [c, x] = canvas(S, S);
  const id = x.createImageData(S, S);
  const r = rng(31);
  for (let i = 0; i < S * S; i++) { const v = Math.pow(r(), 0.7) * 255; id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = v; id.data[i * 4 + 3] = 255; }
  x.putImageData(id, 0, 0);
  const t = tex(c, [10, 5], false, 1);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  return t;
}

/** Soft round glow used for headlight pools, lamp halos and token auras. */
export function glow(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)'): THREE.CanvasTexture {
  const S = 128;
  const [c, x] = canvas(S, S);
  const g = x.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, inner); g.addColorStop(1, outer);
  x.fillStyle = g; x.fillRect(0, 0, S, S);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Text label texture for floating "+1" pop-ups. */
export function label(text: string, color: string, outline = true): THREE.CanvasTexture {
  const font = '800 78px Fredoka, Poppins, system-ui, sans-serif';
  const probe = document.createElement('canvas').getContext('2d')!;
  probe.font = font;
  const [c, x] = canvas(Math.max(256, Math.ceil(probe.measureText(text).width) + 48), 128);
  x.font = font;
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.lineWidth = 14; x.strokeStyle = 'rgba(25,20,45,0.85)'; x.lineJoin = 'round';
  if (outline) x.strokeText(text, c.width / 2, 66);
  x.fillStyle = color; x.fillText(text, c.width / 2, 66);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
