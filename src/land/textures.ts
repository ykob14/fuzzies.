/** Procedural textures for Fuzzies Land buildings (painted on canvases, so no image files ship). */
import * as THREE from 'three';
import { rng } from '../game/textures3d';

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
const memo = (key: string, make: () => THREE.CanvasTexture) => { let t = cache.get(key); if (!t) { t = make(); cache.set(key, t); } return t; };

/** Shift a hex colour lighter (+) or darker (−). */
export function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v + amt * 255)));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

/** Rows of rounded clay roof tiles. One tile of texture ≈ 1 unit. */
export function roofTiles(color: string): THREE.CanvasTexture {
  return memo('roof' + color, () => {
    const S = 256, rows = 8, cols = 8;
    const [c, x] = canvas(S, S);
    const r = rng(3);
    x.fillStyle = shade(color, -0.25); x.fillRect(0, 0, S, S);
    const tw = S / cols, th = S / rows;
    for (let j = rows; j >= 0; j--) for (let i = -1; i <= cols; i++) {
      const ox = (j % 2) * tw / 2;
      const px = i * tw + ox, py = j * th;
      const g = x.createLinearGradient(0, py - th, 0, py + th * 0.4);
      const v = (r() - 0.5) * 0.12;
      g.addColorStop(0, shade(color, 0.1 + v)); g.addColorStop(0.75, shade(color, v)); g.addColorStop(1, shade(color, -0.2 + v));
      x.fillStyle = g;
      x.beginPath();
      x.moveTo(px + 1, py - th);
      x.lineTo(px + tw - 1, py - th);
      x.lineTo(px + tw - 1, py);
      x.quadraticCurveTo(px + tw / 2, py + th * 0.55, px + 1, py);
      x.closePath();
      x.fill();
    }
    return tex(c);
  });
}

/** Soft plaster wall with a little speckle. */
export function plaster(color: string): THREE.CanvasTexture {
  return memo('plaster' + color, () => {
    const S = 128;
    const [c, x] = canvas(S, S);
    const r = rng(5);
    x.fillStyle = color; x.fillRect(0, 0, S, S);
    for (let i = 0; i < 900; i++) { x.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'; const s = 1 + r() * 2; x.fillRect(r() * S, r() * S, s, s); }
    return tex(c);
  });
}

/** Horizontal wooden planks. */
export function planks(color: string): THREE.CanvasTexture {
  return memo('planks' + color, () => {
    const S = 256, n = 8;
    const [c, x] = canvas(S, S);
    const r = rng(9);
    for (let i = 0; i < n; i++) {
      x.fillStyle = shade(color, (r() - 0.5) * 0.12);
      x.fillRect(0, (i * S) / n, S, S / n);
      x.fillStyle = 'rgba(0,0,0,0.28)'; x.fillRect(0, (i * S) / n, S, 2);
      for (let k = 0; k < 14; k++) { x.strokeStyle = `rgba(0,0,0,${0.04 + r() * 0.05})`; x.beginPath(); const y = (i + r()) * S / n; x.moveTo(0, y); x.bezierCurveTo(S * 0.3, y + 2, S * 0.6, y - 2, S, y + 1); x.stroke(); }
      x.fillStyle = 'rgba(0,0,0,0.3)'; x.fillRect(Math.floor(r() * S), (i * S) / n, 2, S / n);
    }
    return tex(c);
  });
}

/** Brick wall with mortar. */
export function bricks(color: string): THREE.CanvasTexture {
  return memo('bricks' + color, () => {
    const S = 256, rows = 12, cols = 6;
    const [c, x] = canvas(S, S);
    const r = rng(13);
    x.fillStyle = '#d9cfc2'; x.fillRect(0, 0, S, S);
    const bw = S / cols, bh = S / rows;
    for (let j = 0; j < rows; j++) for (let i = -1; i <= cols; i++) {
      const ox = (j % 2) * bw / 2;
      x.fillStyle = shade(color, (r() - 0.5) * 0.16);
      x.fillRect(i * bw + ox + 2, j * bh + 2, bw - 4, bh - 4);
    }
    return tex(c);
  });
}

/** Ploughed soil with furrows (fields). */
export function soil(): THREE.CanvasTexture {
  return memo('soil', () => {
    const S = 256;
    const [c, x] = canvas(S, S);
    const r = rng(21);
    x.fillStyle = '#6b4a2f'; x.fillRect(0, 0, S, S);
    for (let i = 0; i < 6; i++) {
      const y = (i + 0.5) * S / 6;
      const g = x.createLinearGradient(0, y - 20, 0, y + 20);
      g.addColorStop(0, 'rgba(40,25,12,0.6)'); g.addColorStop(0.5, 'rgba(150,110,70,0.5)'); g.addColorStop(1, 'rgba(40,25,12,0.6)');
      x.fillStyle = g; x.fillRect(0, y - 20, S, 40);
    }
    for (let i = 0; i < 1600; i++) { x.fillStyle = r() < 0.5 ? 'rgba(30,18,8,0.35)' : 'rgba(170,130,90,0.3)'; const s = 1 + r() * 3; x.fillRect(r() * S, r() * S, s, s); }
    return tex(c);
  });
}

/** Two-colour stripes (awnings, popcorn stand). */
export function stripes(a: string, b: string, n = 8): THREE.CanvasTexture {
  return memo(`stripes${a}${b}${n}`, () => {
    const S = 256;
    const [c, x] = canvas(S, S);
    for (let i = 0; i < n; i++) { x.fillStyle = i % 2 ? b : a; x.fillRect((i * S) / n, 0, S / n + 1, S); }
    return tex(c);
  });
}

/** Red cap with white spots for the mushroom house. */
export function mushroomCap(): THREE.CanvasTexture {
  return memo('cap', () => {
    const W = 512, H = 256;
    const [c, x] = canvas(W, H);
    const r = rng(31);
    const g = x.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#ff5a5f'); g.addColorStop(1, '#b3162a');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 26; i++) {
      const px = r() * W, py = 20 + r() * H * 0.62, rad = 10 + r() * 18;
      x.fillStyle = '#fff6ec';
      x.beginPath(); x.ellipse(px, py, rad, rad * 0.8, 0, 0, Math.PI * 2); x.fill();
    }
    return tex(c);
  });
}

/** A neat, freshly mown lawn: soft colour variation and faint mowing stripes (no harsh speckle). */
export function lawn(): THREE.CanvasTexture {
  return memo('lawn', () => {
    const S = 512;
    const [c, x] = canvas(S, S);
    const r = rng(41);
    x.fillStyle = '#6aa73f'; x.fillRect(0, 0, S, S);
    for (let i = 0; i < 4; i++) { x.fillStyle = i % 2 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.03)'; x.fillRect(0, (i * S) / 4, S, S / 4); }
    for (let i = 0; i < 70; i++) {
      x.fillStyle = r() < 0.5 ? 'rgba(90,150,50,0.10)' : 'rgba(130,185,80,0.10)';
      x.beginPath(); x.ellipse(r() * S, r() * S, 20 + r() * 50, 14 + r() * 30, r() * 3, 0, Math.PI * 2); x.fill();
    }
    for (let i = 0; i < 7000; i++) { x.fillStyle = ['rgba(70,120,40,0.35)', 'rgba(140,195,90,0.3)', 'rgba(95,155,55,0.35)'][Math.floor(r() * 3)]; x.fillRect(r() * S, r() * S, 1, 2 + r() * 2); }
    return tex(c);
  });
}

/** Sand for the beach ring around the island. */
export function sand(): THREE.CanvasTexture {
  return memo('sand', () => {
    const S = 128;
    const [c, x] = canvas(S, S);
    const r = rng(43);
    x.fillStyle = '#e8d5a3'; x.fillRect(0, 0, S, S);
    for (let i = 0; i < 1500; i++) { x.fillStyle = r() < 0.5 ? 'rgba(160,130,80,0.25)' : 'rgba(255,255,255,0.3)'; x.fillRect(r() * S, r() * S, 1.5, 1.5); }
    return tex(c);
  });
}

/** A painted sign (Crossing Gate, Bakery…): rounded board with text. */
export function sign(text: string, bg: string, fg = '#fff'): THREE.CanvasTexture {
  return memo(`sign${text}${bg}`, () => {
    const W = 512, H = 160;
    const [c, x] = canvas(W, H);
    x.fillStyle = bg;
    x.beginPath(); x.roundRect(6, 6, W - 12, H - 12, 40); x.fill();
    x.lineWidth = 8; x.strokeStyle = 'rgba(255,255,255,0.75)'; x.stroke();
    x.font = '700 76px Fredoka, Poppins, system-ui, sans-serif';
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillText(text, W / 2 + 3, H / 2 + 7);
    x.fillStyle = fg; x.fillText(text, W / 2, H / 2 + 4);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  });
}
