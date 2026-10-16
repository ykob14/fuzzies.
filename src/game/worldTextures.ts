/** Procedural textures for the Fuzzy Crossing world levels (snow, sand, pavement, rails, ice, neon…). Painted on canvases, cached. */
import * as THREE from 'three';
import { rng } from './textures3d';

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')!];
}
function tex(c: HTMLCanvasElement, color = true): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const cache = new Map<string, THREE.CanvasTexture>();
const once = (k: string, f: () => THREE.CanvasTexture) => { let t = cache.get(k); if (!t) { t = f(); cache.set(k, t); } return t; };

/** soft blotchy ground in a base colour with speckles (meadow, sand, snow, swamp, pavement…) */
export function ground(key: string, base: string, blotches: string[], specks: string[], seed: number, grass = false): THREE.CanvasTexture {
  return once(`g:${key}`, () => {
    const S = 512;
    const r = rng(seed);
    const [c, x] = canvas(S, S);
    x.fillStyle = base; x.fillRect(0, 0, S, S);
    for (let i = 0; i < 80; i++) {
      const px = r() * S, py = r() * S, rad = 30 + r() * 70;
      for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) {
        const g = x.createRadialGradient(px + ox, py + oy, 0, px + ox, py + oy, rad);
        g.addColorStop(0, blotches[i % blotches.length]); g.addColorStop(1, 'rgba(0,0,0,0)');
        x.fillStyle = g; x.fillRect(px + ox - rad, py + oy - rad, rad * 2, rad * 2);
      }
    }
    if (grass) {
      x.lineWidth = 1.4;
      for (let i = 0; i < 7000; i++) {
        const px = r() * S, py = r() * S, l = 4 + r() * 8, a = -Math.PI / 2 + (r() - 0.5) * 1.2;
        x.strokeStyle = specks[Math.floor(r() * specks.length)];
        x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke();
      }
    } else for (let i = 0; i < 16000; i++) { x.fillStyle = specks[Math.floor(r() * specks.length)]; const s = 1 + r() * 2.5; x.fillRect(r() * S, r() * S, s, s); }
    return tex(c);
  });
}

/** square paving slabs (city sidewalks) */
export function pavement(tint = '#c9c6bf'): THREE.CanvasTexture {
  return once(`pave:${tint}`, () => {
    const S = 512, r = rng(41);
    const [c, x] = canvas(S, S);
    x.fillStyle = tint; x.fillRect(0, 0, S, S);
    for (let i = 0; i < 14000; i++) { x.fillStyle = r() < 0.5 ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.07)'; x.fillRect(r() * S, r() * S, 2, 2); }
    x.strokeStyle = 'rgba(60,58,54,0.45)'; x.lineWidth = 4;
    for (let i = 0; i <= 4; i++) { x.beginPath(); x.moveTo(i * S / 4, 0); x.lineTo(i * S / 4, S); x.stroke(); x.beginPath(); x.moveTo(0, i * S / 4); x.lineTo(S, i * S / 4); x.stroke(); }
    return tex(c);
  });
}

/** gravel ballast under railway tracks */
export function ballast(): THREE.CanvasTexture {
  return once('ballast', () => {
    const S = 512, r = rng(43);
    const [c, x] = canvas(S, S);
    x.fillStyle = '#6d655c'; x.fillRect(0, 0, S, S);
    for (let i = 0; i < 9000; i++) {
      const v = 70 + r() * 90;
      x.fillStyle = `rgb(${v},${v * 0.95},${v * 0.88})`;
      x.beginPath(); x.ellipse(r() * S, r() * S, 2 + r() * 4, 2 + r() * 3, r() * 3, 0, Math.PI * 2); x.fill();
    }
    return tex(c);
  });
}

/** glossy ice with cracks and frost */
export function ice(): THREE.CanvasTexture {
  return once('ice', () => {
    const S = 512, r = rng(47);
    const [c, x] = canvas(S, S);
    const g = x.createLinearGradient(0, 0, S, S);
    g.addColorStop(0, '#d8f1ff'); g.addColorStop(0.5, '#bfe5fa'); g.addColorStop(1, '#d2eefc');
    x.fillStyle = g; x.fillRect(0, 0, S, S);
    x.strokeStyle = 'rgba(255,255,255,0.75)'; x.lineWidth = 1.5;
    for (let i = 0; i < 26; i++) {
      let px = r() * S, py = r() * S;
      x.beginPath(); x.moveTo(px, py);
      for (let k = 0; k < 6; k++) { px += (r() - 0.5) * 70; py += (r() - 0.5) * 70; x.lineTo(px, py); }
      x.stroke();
    }
    for (let i = 0; i < 4000; i++) { x.fillStyle = 'rgba(255,255,255,0.35)'; x.fillRect(r() * S, r() * S, 1.5, 1.5); }
    return tex(c);
  });
}

/** a hover lane: dark glossy strip with glowing chevrons (scroll the texture to move them) */
export function conveyor(color = '#ff3d81'): THREE.CanvasTexture {
  return once(`conv:${color}`, () => {
    const W = 256, H = 128;
    const [c, x] = canvas(W, H);
    x.fillStyle = '#1b1830'; x.fillRect(0, 0, W, H);
    x.strokeStyle = color; x.lineWidth = 10; x.lineCap = 'round'; x.lineJoin = 'round';
    x.shadowColor = color; x.shadowBlur = 14;
    for (let i = 0; i < 2; i++) { const ox = 40 + i * 128; x.beginPath(); x.moveTo(ox, 22); x.lineTo(ox + 40, H / 2); x.lineTo(ox, H - 22); x.stroke(); }
    x.shadowBlur = 0;
    x.fillStyle = 'rgba(255,255,255,0.12)'; x.fillRect(0, 6, W, 4); x.fillRect(0, H - 10, W, 4);
    return tex(c);
  });
}

/** neon city street tiles with a faint glowing grid */
export function neonGrid(line = '#39e6ff', base = '#1c1d33'): THREE.CanvasTexture {
  return once(`neon:${line}:${base}`, () => {
    const S = 256, r = rng(53);
    const [c, x] = canvas(S, S);
    x.fillStyle = base; x.fillRect(0, 0, S, S);
    for (let i = 0; i < 3000; i++) { x.fillStyle = 'rgba(255,255,255,0.03)'; x.fillRect(r() * S, r() * S, 2, 2); }
    x.strokeStyle = line; x.globalAlpha = 0.35; x.lineWidth = 3; x.shadowColor = line; x.shadowBlur = 8;
    x.strokeRect(2, 2, S - 4, S - 4);
    x.globalAlpha = 1; x.shadowBlur = 0;
    return tex(c);
  });
}

/** zebra crossing stripes (drawn on top of the road at a traffic light) */
export function zebra(): THREE.CanvasTexture {
  return once('zebra', () => {
    const [c, x] = canvas(256, 64);
    x.clearRect(0, 0, 256, 64);
    x.fillStyle = 'rgba(245,245,240,0.92)';
    for (let i = 0; i < 6; i++) x.fillRect(8 + i * 42, 4, 24, 56);
    return tex(c);
  });
}

/** window grid for the city / neon skyline */
export function windows(lit: string, dark: string, seed: number): THREE.CanvasTexture {
  return once(`win:${lit}:${dark}:${seed}`, () => {
    const W = 128, H = 256, r = rng(seed);
    const [c, x] = canvas(W, H);
    x.fillStyle = dark; x.fillRect(0, 0, W, H);
    for (let j = 0; j < 16; j++) for (let i = 0; i < 6; i++) {
      x.fillStyle = r() < 0.55 ? lit : 'rgba(0,0,0,0.25)';
      x.fillRect(8 + i * 19, 8 + j * 15, 11, 9);
    }
    return tex(c);
  });
}
