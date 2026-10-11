/**
 * Halloween collection — original vector artwork drawn in code for Fuzzies (licence: original Fuzzies artwork, free to
 * use in Fuzzies designs). Storybook style: flat shapes with soft gradients, rim highlights and gentle glows.
 * Every piece is recolourable: shading is derived from the colour slots, so a pumpkin stays a pumpkin in any colour.
 */
import type { AssetDef, AssetKind } from '../index';

const LICENSE = 'Original Fuzzies artwork';
const AUTHOR = 'Fuzzies';

// ---------- colour helpers (work on #rrggbb) ----------
const hex = (c: string) => { const n = parseInt(c.slice(1, 7), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const toHex = (r: number, g: number, b: number) => '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const mix = (a: string, b: string, t: number) => { const [r1, g1, b1] = hex(a), [r2, g2, b2] = hex(b); return toHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t); };
const dk = (c: string, t: number) => mix(c, '#000000', t);
const lt = (c: string, t: number) => mix(c, '#ffffff', t);

/** An SVG document; width/height keep canvas drawing crisp, "none" lets it stretch with its box. */
const svg = (w: number, h: number, body: string, scale = 600) => {
  const k = scale / Math.max(w, h);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${Math.round(w * k)}" height="${Math.round(h * k)}" preserveAspectRatio="none">${body}</svg>`;
};

function rng(seed: number): () => number {
  return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
}
const f1 = (n: number) => n.toFixed(1);

// ---------- reusable drawings ----------

/** A ribbed pumpkin centred on (cx, cy), `w` wide; optional carved face lit by `glow`. */
function pumpkin(id: string, cx: number, cy: number, w: number, body: string, stem: string, leaf: string, face?: { glow: string; cute?: boolean }): string {
  const s = w / 180; // canonical pumpkin is 180 wide, 130 tall, centred on 0,0
  const ribs = [[-52, 46, 54], [52, 46, 54], [-30, 44, 60], [30, 44, 60], [0, 38, 63]];
  let g = `<defs><radialGradient id="${id}r" cx="42%" cy="35%" r="70%"><stop offset="0" stop-color="${lt(body, 0.28)}"/><stop offset=".55" stop-color="${body}"/><stop offset="1" stop-color="${dk(body, 0.38)}"/></radialGradient>`;
  if (face) g += `<radialGradient id="${id}g" cx="50%" cy="45%" r="60%"><stop offset="0" stop-color="${lt(face.glow, 0.7)}"/><stop offset=".5" stop-color="${face.glow}"/><stop offset="1" stop-color="${mix(face.glow, body, 0.6)}"/></radialGradient>`;
  g += `</defs><g transform="translate(${f1(cx)} ${f1(cy)}) scale(${s.toFixed(4)})">`;
  g += `<ellipse cx="0" cy="66" rx="84" ry="9" fill="#000" opacity=".2"/>`;
  for (const [x, rx, ry] of ribs) g += `<ellipse cx="${x}" cy="2" rx="${rx}" ry="${ry}" fill="url(#${id}r)" stroke="${dk(body, 0.3)}" stroke-opacity=".35" stroke-width="1.5"/>`;
  g += `<path d="M-22 -48 C-28 -20 -28 30 -16 58" fill="none" stroke="${lt(body, 0.35)}" stroke-width="4" stroke-linecap="round" opacity=".35"/>`;
  g += `<path d="M-6 -56 C-9 -70 -6 -84 4 -92 L14 -88 C6 -78 5 -68 8 -56 Z" fill="${stem}"/><path d="M4 -92 L14 -88 C8 -80 7 -70 8 -56 L3 -57 C1 -70 2 -82 4 -92Z" fill="${dk(stem, 0.3)}"/>`;
  g += `<path d="M10 -70 C26 -88 48 -82 50 -66 C40 -72 28 -70 18 -62 Z" fill="${leaf}"/><path d="M12 -68 C24 -76 36 -76 46 -68" fill="none" stroke="${dk(leaf, 0.3)}" stroke-width="1.5"/>`;
  g += `<path d="M6 -74 C-10 -86 -26 -80 -24 -66 C-22 -56 -12 -58 -14 -66" fill="none" stroke="${leaf}" stroke-width="3" stroke-linecap="round"/>`;
  if (face) {
    const cut = `fill="url(#${id}g)" stroke="${dk(body, 0.55)}" stroke-width="3" stroke-linejoin="round"`;
    if (face.cute) {
      g += `<ellipse cx="-30" cy="-6" rx="13" ry="16" ${cut}/><ellipse cx="30" cy="-6" rx="13" ry="16" ${cut}/>`;
      g += `<path d="M-34 20 Q0 52 34 20 Q0 34 -34 20Z" ${cut}/>`;
      g += `<ellipse cx="-50" cy="16" rx="9" ry="5" fill="#ff7a8a" opacity=".45"/><ellipse cx="50" cy="16" rx="9" ry="5" fill="#ff7a8a" opacity=".45"/>`;
    } else {
      g += `<path d="M-46 -2 L-28 -32 L-12 -2 Z" ${cut}/><path d="M12 -2 L28 -32 L46 -2 Z" ${cut}/><path d="M-8 16 L0 4 L8 16 Z" ${cut}/>`;
      g += `<path d="M-56 22 Q0 76 56 22 Q36 34 22 34 L22 46 L8 47 L8 38 L-8 38 L-8 47 L-22 46 L-22 34 Q-36 34 -56 22 Z" ${cut}/>`;
    }
  }
  return g + `</g>`;
}

/** A friendly floating ghost, canonical 140×170 at (x, y) top-left, scaled by s. */
function ghost(id: string, x: number, y: number, s: number, body: string, eyes: string, cheeks: string, rot = 0, mood: 'happy' | 'boo' = 'happy'): string {
  let g = `<defs><linearGradient id="${id}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${lt(body, 0.5)}"/><stop offset=".7" stop-color="${body}"/><stop offset="1" stop-color="${dk(body, 0.12)}"/></linearGradient></defs>`;
  g += `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${rot} 70 85) scale(${s.toFixed(4)})">`;
  g += `<ellipse cx="70" cy="178" rx="38" ry="6" fill="#000" opacity=".16"/>`;
  g += `<path d="M70 4 C32 4 14 34 14 74 L14 140 Q22 158 32 144 Q42 160 52 146 Q62 162 72 148 Q82 162 92 146 Q102 160 112 144 Q120 156 126 140 L126 74 C126 34 108 4 70 4 Z" fill="url(#${id}b)"/>`;
  g += `<path d="M126 74 C126 48 118 26 100 13 C114 34 116 66 114 140 Q120 154 126 140 Z" fill="${dk(body, 0.14)}" opacity=".7"/>`;
  g += `<path d="M16 86 Q-4 90 2 106 Q10 100 18 104 Z" fill="${body}"/><path d="M124 86 Q144 80 142 64 Q134 72 124 72 Z" fill="${body}"/>`;
  g += `<ellipse cx="50" cy="62" rx="9" ry="12" fill="${eyes}"/><ellipse cx="90" cy="62" rx="9" ry="12" fill="${eyes}"/>`;
  g += `<circle cx="53" cy="57" r="3.2" fill="#fff"/><circle cx="93" cy="57" r="3.2" fill="#fff"/>`;
  g += mood === 'boo' ? `<ellipse cx="70" cy="90" rx="9" ry="12" fill="${eyes}"/>` : `<path d="M58 84 Q70 96 82 84" fill="none" stroke="${eyes}" stroke-width="4" stroke-linecap="round"/>`;
  g += `<ellipse cx="36" cy="80" rx="9" ry="5" fill="${cheeks}" opacity=".6"/><ellipse cx="104" cy="80" rx="9" ry="5" fill="${cheeks}" opacity=".6"/>`;
  g += `<path d="M34 24 Q46 12 60 10" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".7"/>`;
  return g + `</g>`;
}

/** A bat with spread wings, canonical 200×100 centred at its body; place with translate/scale/rotate. */
function batBody(body: string, eye: string, detail = true): string {
  let g = `<path d="M100 40 C92 31 84 31 80 37 C66 21 40 15 6 24 C23 30 29 41 29 54 C40 47 50 49 56 59 C62 51 72 51 78 59 C84 53 92 53 100 61 C108 53 116 53 122 59 C128 51 138 51 144 59 C150 49 160 47 171 54 C171 41 177 30 194 24 C160 15 134 21 120 37 C116 31 108 31 100 40 Z" fill="${body}"/>`;
  if (detail) g += `<path d="M84 40 L30 52 M84 40 L56 58 M84 40 L62 30 M116 40 L170 52 M116 40 L144 58 M116 40 L138 30" stroke="${lt(body, 0.18)}" stroke-width="1.6" stroke-linecap="round" fill="none"/>`;
  g += `<ellipse cx="100" cy="52" rx="12" ry="17" fill="${body}"/><circle cx="100" cy="35" r="11" fill="${body}"/>`;
  g += `<path d="M90 31 L91 15 L98 26 Z M110 31 L109 15 L102 26 Z" fill="${body}"/>`;
  if (detail) g += `<circle cx="95.5" cy="34" r="2.6" fill="${eye}"/><circle cx="104.5" cy="34" r="2.6" fill="${eye}"/><path d="M97 41 l1.2 3 l1.2 -3 M101 41 l1.2 3 l1.2 -3" fill="#fff"/>`;
  return g;
}

/** A tapered branch along a quadratic curve (filled polygon), for natural-looking trees. */
function branch(x1: number, y1: number, cx: number, cy: number, x2: number, y2: number, w1: number, w2: number): string {
  const L: string[] = [], R: string[] = [];
  const N = 10;
  for (let i = 0; i <= N; i++) {
    const t = i / N, u = 1 - t;
    const px = u * u * x1 + 2 * u * t * cx + t * t * x2, py = u * u * y1 + 2 * u * t * cy + t * t * y2;
    const dx = 2 * u * (cx - x1) + 2 * t * (x2 - cx), dy = 2 * u * (cy - y1) + 2 * t * (y2 - cy);
    const len = Math.hypot(dx, dy) || 1;
    const w = (w1 + (w2 - w1) * t) / 2;
    L.push(`${f1(px - (dy / len) * w)} ${f1(py + (dx / len) * w)}`);
    R.unshift(`${f1(px + (dy / len) * w)} ${f1(py - (dx / len) * w)}`);
  }
  return `M${L.join(' L')} L${R.join(' L')} Z`;
}

/** A gnarled bare tree growing from (x, y), `size` tall. */
function tree(x: number, y: number, size: number, fill: string, seed: number): string {
  const r = rng(seed);
  const paths: string[] = [];
  const grow = (x1: number, y1: number, ang: number, len: number, w: number, depth: number) => {
    const x2 = x1 + Math.cos(ang) * len, y2 = y1 + Math.sin(ang) * len;
    const bend = (r() - 0.5) * len * 0.5;
    const cx = (x1 + x2) / 2 + Math.cos(ang + Math.PI / 2) * bend, cy = (y1 + y2) / 2 + Math.sin(ang + Math.PI / 2) * bend;
    paths.push(branch(x1, y1, cx, cy, x2, y2, w, Math.max(0.8, w * 0.55)));
    if (depth <= 0) return;
    const kids = depth > 2 ? 2 + (r() > 0.5 ? 1 : 0) : 2;
    for (let i = 0; i < kids; i++) {
      const spread = (i / (kids - 1 || 1) - 0.5) * 1.5 + (r() - 0.5) * 0.5;
      grow(x2, y2, ang + spread, len * (0.62 + r() * 0.16), w * 0.58, depth - 1);
    }
  };
  // trunk with roots
  paths.push(branch(x, y, x + size * 0.04, y - size * 0.25, x - size * 0.02, y - size * 0.46, size * 0.13, size * 0.07));
  paths.push(branch(x - size * 0.03, y - size * 0.02, x - size * 0.12, y + size * 0.0, x - size * 0.2, y + size * 0.02, size * 0.07, size * 0.01));
  paths.push(branch(x + size * 0.03, y - size * 0.02, x + size * 0.12, y - size * 0.01, x + size * 0.22, y + size * 0.02, size * 0.07, size * 0.01));
  grow(x - size * 0.02, y - size * 0.44, -Math.PI / 2 - 0.5, size * 0.3, size * 0.07, 4);
  grow(x - size * 0.02, y - size * 0.44, -Math.PI / 2 + 0.55, size * 0.28, size * 0.065, 4);
  grow(x + size * 0.01, y - size * 0.3, -0.35, size * 0.22, size * 0.05, 3);
  return `<path d="${paths.join(' ')}" fill="${fill}"/>`;
}

/** Twinkling stars and dots across an area. */
function stars(w: number, h: number, color: string, n: number, seed: number, maxR = 3): string {
  const r = rng(seed);
  let g = '';
  for (let i = 0; i < n; i++) {
    const x = r() * w, y = r() * h, s = 0.6 + r() * maxR;
    if (i % 7 === 0) g += `<path d="M${f1(x)} ${f1(y - s * 3)} Q${f1(x + s * 0.4)} ${f1(y - s * 0.4)} ${f1(x + s * 3)} ${f1(y)} Q${f1(x + s * 0.4)} ${f1(y + s * 0.4)} ${f1(x)} ${f1(y + s * 3)} Q${f1(x - s * 0.4)} ${f1(y + s * 0.4)} ${f1(x - s * 3)} ${f1(y)} Q${f1(x - s * 0.4)} ${f1(y - s * 0.4)} ${f1(x)} ${f1(y - s * 3)}Z" fill="${color}"/>`;
    else g += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(s * 0.6)}" fill="${color}" opacity="${(0.35 + r() * 0.6).toFixed(2)}"/>`;
  }
  return g;
}

function moon(id: string, cx: number, cy: number, r: number, face: string, glow: string): string {
  let g = `<defs><radialGradient id="${id}h"><stop offset=".45" stop-color="${glow}" stop-opacity=".55"/><stop offset=".7" stop-color="${glow}" stop-opacity=".15"/><stop offset="1" stop-color="${glow}" stop-opacity="0"/></radialGradient>`;
  g += `<radialGradient id="${id}m" cx="38%" cy="35%" r="70%"><stop offset="0" stop-color="${lt(face, 0.6)}"/><stop offset=".6" stop-color="${face}"/><stop offset="1" stop-color="${dk(face, 0.15)}"/></radialGradient></defs>`;
  g += `<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(r * 1.65)}" fill="url(#${id}h)"/><circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(r)}" fill="url(#${id}m)"/>`;
  for (const [dx, dy, cr] of [[-0.3, -0.2, 0.18], [0.25, 0.1, 0.13], [-0.05, 0.4, 0.1], [0.35, -0.35, 0.08], [-0.42, 0.2, 0.07]]) {
    g += `<circle cx="${f1(cx + dx * r)}" cy="${f1(cy + dy * r)}" r="${f1(cr * r)}" fill="${dk(face, 0.12)}" opacity=".55"/>`;
    g += `<path d="M${f1(cx + (dx - cr * 0.7) * r)} ${f1(cy + (dy + cr * 0.3) * r)} A${f1(cr * r)} ${f1(cr * r)} 0 0 0 ${f1(cx + (dx + cr * 0.7) * r)} ${f1(cy + (dy + cr * 0.3) * r)}" fill="none" stroke="${lt(face, 0.5)}" stroke-width="${f1(r * 0.02)}" opacity=".7"/>`;
  }
  return g;
}

function hauntedHouse(id: string, walls: string, glow: string, roof: string): string {
  const win = (x: number, y: number, w: number, h: number, lit = true) => {
    const fill = lit ? `url(#${id}w)` : dk(walls, 0.35);
    return `<path d="M${x} ${y + h} L${x} ${y + w / 2} A${w / 2} ${w / 2} 0 0 1 ${x + w} ${y + w / 2} L${x + w} ${y + h} Z" fill="${fill}" stroke="${dk(walls, 0.45)}" stroke-width="3"/>`
      + `<path d="M${x + w / 2} ${y + 2} V${y + h} M${x} ${y + h * 0.58} H${x + w}" stroke="${dk(walls, 0.45)}" stroke-width="2.4"/>`;
  };
  let g = `<defs><radialGradient id="${id}w" cx="50%" cy="60%" r="65%"><stop offset="0" stop-color="${lt(glow, 0.6)}"/><stop offset="1" stop-color="${glow}"/></radialGradient>`;
  g += `<radialGradient id="${id}h"><stop offset="0" stop-color="${glow}" stop-opacity=".35"/><stop offset="1" stop-color="${glow}" stop-opacity="0"/></radialGradient>`;
  g += `<pattern id="${id}s" width="12" height="9" patternUnits="userSpaceOnUse"><rect width="12" height="9" fill="${walls}"/><path d="M0 8.5 H12" stroke="${dk(walls, 0.25)}" stroke-width="1"/></pattern></defs>`;
  // glow halos behind the windows
  for (const [cx, cy, r] of [[150, 214, 70], [58, 190, 40], [214, 196, 36]]) g += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${id}h)"/>`;
  // chimney + right turret
  g += `<path d="M206 112 L208 64 L228 64 L228 112 Z" fill="${dk(walls, 0.15)}"/><path d="M202 64 H232 V56 H202 Z" fill="${dk(roof, 0.2)}"/>`;
  // left tower
  g += `<path d="M28 330 L31 132 L86 129 L88 330 Z" fill="url(#${id}s)"/>`;
  g += `<path d="M18 138 L54 40 Q56 24 66 16 Q60 30 62 42 L96 134 Z" fill="${roof}"/><path d="M54 40 Q56 24 66 16 Q60 30 62 42 L96 134 L72 136 Z" fill="${dk(roof, 0.25)}"/>`;
  g += `<path d="M14 138 H100 V146 H14 Z" fill="${dk(roof, 0.3)}"/>`;
  // main house
  g += `<path d="M60 330 L63 168 L238 162 L242 330 Z" fill="url(#${id}s)"/>`;
  g += `<path d="M44 176 L152 72 L258 170 Z" fill="${roof}"/><path d="M152 72 L258 170 L232 172 L150 92 Z" fill="${dk(roof, 0.25)}"/>`;
  g += `<path d="M40 176 L152 68 L262 170" fill="none" stroke="${dk(roof, 0.35)}" stroke-width="6" stroke-linejoin="round"/>`;
  g += `<circle cx="152" cy="128" r="17" fill="url(#${id}w)" stroke="${dk(walls, 0.45)}" stroke-width="4"/><path d="M152 111 V145 M135 128 H169" stroke="${dk(walls, 0.45)}" stroke-width="2.5"/>`;
  // windows
  g += win(42, 168, 30, 44) + win(42, 244, 30, 44, false) + win(92, 188, 34, 50) + win(178, 186, 34, 50);
  g += `<path d="M176 182 L170 244 L178 246" fill="none" stroke="${dk(walls, 0.5)}" stroke-width="4"/>`; // broken shutter
  // porch + door
  g += `<path d="M90 250 L214 250 L206 262 L98 262 Z" fill="${roof}"/><path d="M100 262 V330 M204 262 V330" stroke="${dk(walls, 0.35)}" stroke-width="6"/>`;
  g += `<path d="M134 330 L134 290 Q152 266 170 290 L170 330 Z" fill="${dk(walls, 0.55)}"/><path d="M152 274 L152 330" stroke="url(#${id}w)" stroke-width="3"/><circle cx="162" cy="306" r="2.5" fill="${glow}"/>`;
  g += `<path d="M120 330 H184 V336 H120 Z" fill="${dk(walls, 0.4)}"/>`;
  // ground
  g += `<path d="M0 340 Q50 322 150 328 Q250 322 300 340 Z" fill="${dk(walls, 0.45)}"/>`;
  return g;
}

function tombstone(x: number, y: number, w: number, h: number, stone: string, rot: number, kind: 'round' | 'cross' | 'flat'): string {
  let g = `<g transform="rotate(${rot} ${x + w / 2} ${y + h})">`;
  if (kind === 'cross') {
    g += `<path d="M${x + w * 0.38} ${y + h} V${y + h * 0.35} H${x + w * 0.1} V${y + h * 0.18} H${x + w * 0.38} V${y} H${x + w * 0.62} V${y + h * 0.18} H${x + w * 0.9} V${y + h * 0.35} H${x + w * 0.62} V${y + h} Z" fill="${stone}"/>`;
    g += `<path d="M${x + w * 0.62} ${y} V${y + h} H${x + w * 0.54} V${y + h * 0.04} Z" fill="${dk(stone, 0.2)}"/>`;
  } else {
    const top = kind === 'round' ? `A${w / 2} ${w / 2} 0 0 1 ${x + w} ${y + w / 2}` : `L${x + w * 0.15} ${y} H${x + w * 0.85} L${x + w} ${y + w / 2}`;
    g += `<path d="M${x} ${y + h} V${y + w / 2} ${top} V${y + h} Z" fill="${stone}"/>`;
    g += `<path d="M${x + w * 0.8} ${y + w * 0.1} Q${x + w} ${y + w * 0.3} ${x + w} ${y + w / 2} V${y + h} H${x + w * 0.8} Z" fill="${dk(stone, 0.18)}"/>`;
    g += `<path d="M${x + w * 0.26} ${y + h * 0.42} H${x + w * 0.64} M${x + w * 0.3} ${y + h * 0.55} H${x + w * 0.6} M${x + w * 0.34} ${y + h * 0.66} H${x + w * 0.56}" stroke="${dk(stone, 0.32)}" stroke-width="${f1(w * 0.05)}" stroke-linecap="round"/>`;
    g += `<path d="M${x + w * 0.2} ${y + h * 0.18} l${f1(w * 0.12)} ${f1(h * 0.1)} l${f1(-w * 0.04)} ${f1(h * 0.08)}" fill="none" stroke="${dk(stone, 0.4)}" stroke-width="1.6"/>`;
  }
  return g + `</g>`;
}

/** A mist band made of soft overlapping glows. */
function mist(w: number, y: number, h: number, color: string, id: string, seed: number, opacity = 0.55): string {
  const r = rng(seed);
  let g = `<defs><radialGradient id="${id}"><stop offset="0" stop-color="${color}" stop-opacity="${opacity}"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient></defs>`;
  for (let i = 0; i < 9; i++) g += `<ellipse cx="${f1((i / 8) * w + (r() - 0.5) * w * 0.08)}" cy="${f1(y + (r() - 0.5) * h * 0.4)}" rx="${f1(w * (0.16 + r() * 0.12))}" ry="${f1(h * (0.4 + r() * 0.3))}" fill="url(#${id})"/>`;
  return g;
}

function hills(w: number, base: number, amp: number, fill: string, seed: number): string {
  const r = rng(seed);
  let d = `M0 ${f1(base)}`;
  const n = 5;
  for (let i = 0; i < n; i++) {
    const x1 = ((i + 0.5) / n) * w, x2 = ((i + 1) / n) * w;
    d += ` Q${f1(x1)} ${f1(base - amp * (0.4 + r() * 0.8))} ${f1(x2)} ${f1(base - amp * (r() * 0.3))}`;
  }
  return `<path d="${d} V9999 H0 Z" fill="${fill}"/>`;
}

const MAPLE = 'M50 4 L56 22 L66 14 L64 32 L80 26 L74 42 L94 44 L80 56 L86 62 L64 64 L56 72 L54 96 L46 96 L44 72 L36 64 L14 62 L20 56 L6 44 L26 42 L20 26 L36 32 L34 14 L44 22 Z';

// ---------- the collection ----------
const A = (id: string, name: string, kind: AssetKind, w: number, h: number, colors: string[], tags: string[], body: (c: string[]) => string, scale = 600): AssetDef =>
  ({ id, name, pack: 'halloween', kind, ratio: w / h, colors, tags: ['halloween', 'spooky', 'autumn', ...tags], license: LICENSE, author: AUTHOR, svg: (c) => svg(w, h, body(c), scale) });

const ILLUSTRATIONS: AssetDef[] = [
  A('hw-pumpkin', 'Pumpkin', 'illustration', 200, 170, ['#f2802b', '#6b4f2a', '#5f8f3a'], ['pumpkin', 'harvest', 'fall', 'thanksgiving'], (c) => pumpkin('p', 100, 92, 180, c[0], c[1], c[2])),
  A('hw-jack', "Jack-o'-lantern", 'illustration', 200, 170, ['#f2802b', '#ffd34d', '#6b4f2a'], ['pumpkin', 'jack', 'lantern', 'carved', 'face', 'glow'], (c) =>
    `<defs><radialGradient id="jh"><stop offset="0" stop-color="${c[1]}" stop-opacity=".45"/><stop offset="1" stop-color="${c[1]}" stop-opacity="0"/></radialGradient></defs><ellipse cx="100" cy="98" rx="100" ry="78" fill="url(#jh)"/>` + pumpkin('j', 100, 92, 180, c[0], c[2], '#5f8f3a', { glow: c[1] })),
  A('hw-jack-cute', 'Cute pumpkin face', 'illustration', 200, 170, ['#ff8f3a', '#ffe08a', '#6b4f2a'], ['pumpkin', 'cute', 'kids', 'face', 'smile'], (c) => pumpkin('k', 100, 92, 180, c[0], c[2], '#6aa046', { glow: c[1], cute: true })),
  A('hw-pumpkins', 'Pumpkin trio', 'illustration', 340, 200, ['#f2802b', '#ffd34d', '#e9e2cf'], ['pumpkin', 'patch', 'harvest', 'group', 'fall'], (c) =>
    pumpkin('a', 74, 128, 130, c[2], '#6b5a3a', '#7b9a4a') + pumpkin('b', 268, 132, 124, mix(c[0], '#c2410c', 0.35), '#6b4f2a', '#5f8f3a') + pumpkin('c', 170, 110, 168, c[0], '#6b4f2a', '#5f8f3a', { glow: c[1] })),
  A('hw-ghost', 'Friendly ghost', 'illustration', 150, 190, ['#f7f4ff', '#2a2140', '#ff9bb3'], ['ghost', 'boo', 'cute', 'kids', 'spirit'], (c) => ghost('g', 5, 2, 1, c[0], c[1], c[2])),
  A('hw-ghost-boo', 'Ghost saying boo', 'illustration', 150, 190, ['#f7f4ff', '#2a2140', '#ff9bb3'], ['ghost', 'boo', 'scare', 'surprise'], (c) => ghost('g', 5, 2, 1, c[0], c[1], c[2], -6, 'boo')),
  A('hw-ghosts', 'Ghost friends', 'illustration', 320, 210, ['#f7f4ff', '#2a2140', '#ff9bb3'], ['ghost', 'ghosts', 'group', 'cute', 'party'], (c) =>
    ghost('a', 10, 50, 0.85, c[0], c[1], c[2], -10) + ghost('c', 200, 60, 0.75, c[0], c[1], c[2], 8, 'boo') + ghost('b', 92, 6, 1.08, c[0], c[1], c[2])),
  A('hw-house', 'Haunted house', 'illustration', 300, 340, ['#2e2540', '#ffcf5a', '#43305e'], ['haunted', 'house', 'mansion', 'spooky', 'night', 'building'], (c) => hauntedHouse('h', c[0], c[1], c[2])),
  A('hw-hill-house', 'Haunted hill at night', 'scene', 400, 300, ['#2e2540', '#ffcf5a', '#fff1c1'], ['haunted', 'house', 'moon', 'hill', 'scene', 'night'], (c) =>
    moon('m', 290, 92, 62, c[2], c[2]) + `<g transform="translate(64 40) scale(.78)">${hauntedHouse('h', c[0], c[1], dk(c[0], 0.1))}</g>` + tree(330, 300, 150, dk(c[0], 0.3), 7) + `<path d="M0 300 Q120 262 240 280 Q330 266 400 288 V300 Z" fill="${dk(c[0], 0.5)}"/>`),
  A('hw-bat', 'Bat', 'illustration', 200, 100, ['#241a33', '#ffcf5a'], ['bat', 'bats', 'night', 'fly', 'wings'], (c) => batBody(c[0], c[1])),
  A('hw-bats', 'Bat flock', 'illustration', 320, 200, ['#241a33', '#ffcf5a'], ['bat', 'bats', 'flock', 'night', 'fly'], (c) => {
    const spots: [number, number, number, number][] = [[20, 30, 0.7, -14], [130, 8, 0.5, 10], [220, 40, 0.62, -6], [80, 100, 0.42, 16], [190, 120, 0.36, -18], [260, 140, 0.3, 8], [24, 150, 0.28, -4]];
    return spots.map(([x, y, s, r]) => `<g transform="translate(${x} ${y}) rotate(${r} 100 50) scale(${s})">${batBody(c[0], c[1], s > 0.4)}</g>`).join('');
  }),
  A('hw-moon', 'Full moon', 'illustration', 200, 200, ['#fff1c1', '#ffe58a'], ['moon', 'full moon', 'night', 'glow', 'sky'], (c) => moon('m', 100, 100, 60, c[0], c[1])),
  A('hw-moon-bats', 'Moon with bats', 'illustration', 240, 220, ['#fff1c1', '#241a33', '#ffe58a'], ['moon', 'bat', 'bats', 'night', 'sky'], (c) =>
    moon('m', 120, 110, 66, c[0], c[2]) + [[40, 70, 0.5, -10], [120, 120, 0.38, 6], [150, 40, 0.3, 14], [20, 150, 0.26, -6]].map(([x, y, s, r]) => `<g transform="translate(${x} ${y}) rotate(${r} 100 50) scale(${s})">${batBody(c[1], c[1], false)}</g>`).join('')),
  A('hw-tree', 'Spooky tree', 'illustration', 220, 260, ['#1d1626'], ['tree', 'dead tree', 'branches', 'forest', 'creepy'], (c) => tree(110, 252, 250, c[0], 3)),
  A('hw-graveyard', 'Graveyard', 'scene', 340, 170, ['#9a98ae', '#2d2a3c', '#1b1726'], ['graveyard', 'cemetery', 'tombstone', 'grave', 'rip'], (c) => {
    let g = '';
    for (let x = 6; x < 340; x += 16) g += `<path d="M${x} 150 V${78 + (x % 3) * 4} M${x - 4} ${84 + (x % 3) * 4} L${x} ${70 + (x % 3) * 4} L${x + 4} ${84 + (x % 3) * 4}" stroke="${c[2]}" stroke-width="3" fill="${c[2]}"/>`;
    g += `<path d="M0 96 H340" stroke="${c[2]}" stroke-width="3"/><path d="M0 120 H340" stroke="${c[2]}" stroke-width="3"/>`;
    g += tombstone(34, 74, 56, 84, c[0], -6, 'round') + tombstone(120, 60, 44, 96, c[0], 4, 'cross') + tombstone(186, 82, 62, 76, lt(c[0], 0.08), 3, 'flat') + tombstone(266, 92, 46, 64, dk(c[0], 0.06), -8, 'round');
    g += `<path d="M0 170 V150 Q60 138 120 148 Q200 140 260 150 Q310 144 340 150 V170 Z" fill="${c[1]}"/>`;
    const r = rng(5);
    for (let i = 0; i < 70; i++) { const x = r() * 340; g += `<path d="M${f1(x)} 152 q${f1((r() - 0.5) * 6)} -${f1(5 + r() * 9)} ${f1((r() - 0.5) * 8)} -${f1(8 + r() * 10)}" stroke="${lt(c[1], 0.15)}" stroke-width="2" fill="none" stroke-linecap="round"/>`; }
    return g;
  }),
  A('hw-tombstone', 'Tombstone', 'illustration', 120, 150, ['#9a98ae', '#3f5a3a'], ['tombstone', 'grave', 'rip', 'cemetery'], (c) => {
    let g = tombstone(18, 14, 84, 124, c[0], 0, 'round');
    g += `<path d="M2 150 Q30 132 60 138 Q90 132 118 150 Z" fill="${c[1]}"/>`;
    for (let x = 6; x < 116; x += 7) g += `<path d="M${x} 146 q2 -8 -1 -14" stroke="${lt(c[1], 0.2)}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
    return g;
  }),
  A('hw-web', 'Spider web corner', 'decoration', 200, 200, ['#ebe8f5'], ['web', 'cobweb', 'spider', 'corner', 'frame'], (c) => {
    const spokes = [0, 14, 30, 45, 60, 76, 90].map((d) => (d * Math.PI) / 180);
    let g = spokes.map((a) => `<path d="M0 0 L${f1(Math.cos(a) * 200)} ${f1(Math.sin(a) * 200)}" />`).join('');
    for (const rr of [26, 50, 78, 108, 140, 176]) {
      let d = '';
      spokes.forEach((a, i) => {
        const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
        if (!i) d += `M${f1(x)} ${f1(y)}`;
        else { const m = (a + spokes[i - 1]) / 2; d += ` Q${f1(Math.cos(m) * rr * 0.84)} ${f1(Math.sin(m) * rr * 0.84)} ${f1(x)} ${f1(y)}`; }
      });
      g += `<path d="${d}"/>`;
    }
    return `<g fill="none" stroke="${c[0]}" stroke-width="1.8" stroke-linecap="round" opacity=".92">${g}</g>`;
  }),
  A('hw-spider', 'Hanging spider', 'illustration', 100, 200, ['#1f1a2b', '#ffffff', '#d9d6e6'], ['spider', 'web', 'creepy', 'cute', 'bug'], (c) => {
    let g = `<path d="M50 0 V122" stroke="${c[2]}" stroke-width="1.6"/>`;
    for (const s of [-1, 1]) for (const [y, a, b] of [[132, 28, 18], [140, 34, 6], [148, 32, -8], [156, 24, -20]]) g += `<path d="M50 ${y} q${s * a * 0.6} ${-12} ${s * a} ${b * -0.2 - 6} q${s * 8} ${10} ${s * 10} ${b + 20}" fill="none" stroke="${c[0]}" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>`;
    g += `<ellipse cx="50" cy="152" rx="20" ry="24" fill="${c[0]}"/><circle cx="50" cy="126" r="14" fill="${c[0]}"/>`;
    g += `<circle cx="44" cy="124" r="5.5" fill="${c[1]}"/><circle cx="56" cy="124" r="5.5" fill="${c[1]}"/><circle cx="45" cy="125" r="2.6" fill="${c[0]}"/><circle cx="57" cy="125" r="2.6" fill="${c[0]}"/>`;
    g += `<path d="M44 133 Q50 138 56 133" fill="none" stroke="${c[1]}" stroke-width="1.6" stroke-linecap="round"/><ellipse cx="42" cy="146" rx="5" ry="8" fill="${lt(c[0], 0.2)}" opacity=".6"/>`;
    return g;
  }),
  A('hw-hat', 'Witch hat', 'illustration', 200, 170, ['#2c2140', '#f2802b', '#ffd34d'], ['witch', 'hat', 'costume', 'magic'], (c) =>
    `<ellipse cx="100" cy="146" rx="96" ry="20" fill="${dk(c[0], 0.25)}"/><ellipse cx="100" cy="142" rx="94" ry="18" fill="${c[0]}"/>` +
    `<path d="M50 140 C64 110 74 70 92 40 C100 26 116 14 140 8 C126 22 120 34 118 52 C126 84 140 116 150 140 Z" fill="${c[0]}"/><path d="M118 52 C126 84 140 116 150 140 L128 142 C122 110 114 76 112 60 Z" fill="${dk(c[0], 0.25)}"/><path d="M80 70 C76 90 68 116 62 136" stroke="${lt(c[0], 0.2)}" stroke-width="4" fill="none" stroke-linecap="round"/>` +
    `<path d="M54 128 Q100 116 148 128 L150 142 Q100 130 52 142 Z" fill="${c[1]}"/><rect x="88" y="120" width="24" height="22" rx="3" fill="none" stroke="${c[2]}" stroke-width="5"/>`),
  A('hw-cauldron', 'Bubbling cauldron', 'illustration', 200, 210, ['#24202e', '#8bd346', '#ff8a1f'], ['cauldron', 'witch', 'brew', 'potion', 'magic'], (c) =>
    `<defs><radialGradient id="cb" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="${lt(c[0], 0.25)}"/><stop offset="1" stop-color="${dk(c[0], 0.3)}"/></radialGradient><radialGradient id="cg"><stop offset="0" stop-color="${c[1]}" stop-opacity=".5"/><stop offset="1" stop-color="${c[1]}" stop-opacity="0"/></radialGradient></defs>` +
    `<ellipse cx="100" cy="64" rx="96" ry="46" fill="url(#cg)"/>` +
    `<path d="M70 210 C64 196 74 186 70 172 C84 180 82 192 92 200 C94 186 104 180 100 166 C116 178 112 196 120 206 C126 194 136 190 134 176 C146 190 140 202 132 210 Z" fill="${c[2]}"/><path d="M84 210 C82 200 88 194 86 186 C94 192 96 200 100 206 C104 196 110 194 110 186 C118 196 116 204 112 210 Z" fill="${lt(c[2], 0.5)}"/>` +
    `<path d="M48 186 L40 204 M152 186 L160 204" stroke="${c[0]}" stroke-width="8" stroke-linecap="round"/>` +
    `<path d="M30 92 C20 140 46 192 100 192 C154 192 180 140 170 92 Z" fill="url(#cb)"/><ellipse cx="100" cy="92" rx="76" ry="16" fill="${dk(c[1], 0.15)}"/><ellipse cx="100" cy="90" rx="68" ry="12" fill="${c[1]}"/>` +
    `<path d="M22 90 Q100 112 178 90 Q182 84 176 80 Q100 100 24 80 Q18 84 22 90 Z" fill="${lt(c[0], 0.1)}"/>` +
    `<circle cx="78" cy="86" r="8" fill="${lt(c[1], 0.3)}"/><circle cx="118" cy="84" r="6" fill="${lt(c[1], 0.3)}"/><circle cx="100" cy="60" r="7" fill="none" stroke="${lt(c[1], 0.2)}" stroke-width="3"/><circle cx="124" cy="40" r="5" fill="none" stroke="${lt(c[1], 0.2)}" stroke-width="2.6"/><circle cx="84" cy="30" r="4" fill="none" stroke="${lt(c[1], 0.2)}" stroke-width="2.4"/>` +
    `<path d="M50 120 Q46 150 66 170" stroke="${lt(c[0], 0.3)}" stroke-width="5" fill="none" stroke-linecap="round" opacity=".7"/>`),
  A('hw-candy-corn', 'Candy corn', 'illustration', 100, 120, ['#ffc93c', '#ff7a1a', '#fff8ec'], ['candy', 'candy corn', 'sweets', 'treat', 'trick or treat'], (c) =>
    `<defs><clipPath id="cc"><path d="M50 6 C58 6 92 92 92 104 C92 116 8 116 8 104 C8 92 42 6 50 6 Z"/></clipPath></defs><g clip-path="url(#cc)"><rect width="100" height="120" fill="${c[0]}"/><rect width="100" height="74" fill="${c[1]}"/><rect width="100" height="40" fill="${c[2]}"/><path d="M60 0 L100 110 V0 Z" fill="#000" opacity=".1"/></g><path d="M36 40 Q30 64 22 92" stroke="#fff" stroke-width="5" stroke-linecap="round" fill="none" opacity=".45"/>`),
  A('hw-candy', 'Wrapped candy', 'illustration', 200, 100, ['#ff7a1a', '#ffffff', '#b44dff'], ['candy', 'sweets', 'treat', 'trick or treat', 'wrapper'], (c) =>
    `<path d="M56 50 L10 18 Q2 34 12 50 Q2 66 10 82 Z" fill="${c[2]}"/><path d="M144 50 L190 18 Q198 34 188 50 Q198 66 190 82 Z" fill="${c[2]}"/><path d="M56 50 L20 32 M56 50 L18 68 M144 50 L180 32 M144 50 L182 68" stroke="${dk(c[2], 0.25)}" stroke-width="2.5"/>` +
    `<defs><clipPath id="cw"><circle cx="100" cy="50" r="42"/></clipPath></defs><circle cx="100" cy="50" r="42" fill="${c[0]}"/><g clip-path="url(#cw)">${[-40, -10, 20, 50].map((x) => `<path d="M${60 + x} 0 Q${100 + x} 50 ${60 + x} 100" stroke="${c[1]}" stroke-width="12" fill="none"/>`).join('')}</g><circle cx="100" cy="50" r="42" fill="none" stroke="${dk(c[0], 0.2)}" stroke-width="3"/><path d="M76 30 Q86 20 100 18" stroke="#fff" stroke-width="5" stroke-linecap="round" fill="none" opacity=".6"/>`),
  A('hw-cat', 'Black cat', 'illustration', 160, 200, ['#1e1a26', '#ffd84a'], ['cat', 'black cat', 'witch', 'pet', 'night'], (c) =>
    `<path d="M120 190 C150 186 158 150 140 120 C130 104 146 86 154 96 C160 104 150 108 148 104" fill="none" stroke="${c[0]}" stroke-width="12" stroke-linecap="round"/>` +
    `<path d="M40 194 C30 160 38 124 58 104 C50 92 46 76 50 62 L80 66 L110 62 C114 76 110 92 102 104 C122 124 130 160 120 194 Z" fill="${c[0]}"/>` +
    `<path d="M44 66 C40 40 52 24 80 24 C108 24 120 40 116 66 C114 86 100 96 80 96 C60 96 46 86 44 66 Z" fill="${c[0]}"/><path d="M48 44 L42 6 L70 28 Z M112 44 L118 6 L90 28 Z" fill="${c[0]}"/><path d="M50 36 L47 16 L62 28 Z M110 36 L113 16 L98 28 Z" fill="${lt(c[0], 0.2)}"/>` +
    `<path d="M58 58 Q66 48 74 58 Q66 66 58 58 Z M86 58 Q94 48 102 58 Q94 66 86 58 Z" fill="${c[1]}"/><path d="M66 51 V65 M94 51 V65" stroke="${c[0]}" stroke-width="3" stroke-linecap="round"/>` +
    `<path d="M77 72 L80 75 L83 72" fill="none" stroke="${lt(c[0], 0.4)}" stroke-width="2"/><path d="M60 74 L28 70 M60 78 L30 82 M100 74 L132 70 M100 78 L130 82" stroke="${lt(c[0], 0.5)}" stroke-width="1.5"/>` +
    `<path d="M58 150 C58 170 62 188 64 194 M100 150 C100 170 98 188 96 194" stroke="${lt(c[0], 0.12)}" stroke-width="3" fill="none"/><ellipse cx="80" cy="196" rx="52" ry="4" fill="#000" opacity=".2"/>`),
  A('hw-candles', 'Candles', 'illustration', 170, 190, ['#f3ead7', '#ffb648'], ['candle', 'candles', 'flame', 'light', 'glow'], (c) => {
    let g = `<defs><radialGradient id="cf"><stop offset="0" stop-color="${c[1]}" stop-opacity=".5"/><stop offset="1" stop-color="${c[1]}" stop-opacity="0"/></radialGradient></defs>`;
    for (const [x, top, w] of [[24, 70, 34], [70, 40, 38], [118, 92, 32]]) {
      g += `<circle cx="${x + w / 2}" cy="${top - 18}" r="34" fill="url(#cf)"/>`;
      g += `<path d="M${x} 186 V${top} Q${x + w / 2} ${top - 6} ${x + w} ${top} V186 Z" fill="${c[0]}"/><path d="M${x + w * 0.7} ${top - 1} V186 H${x + w} V${top} Z" fill="${dk(c[0], 0.12)}"/>`;
      g += `<path d="M${x + 4} ${top + 2} q2 14 4 18 q3 4 5 -2 q1 -8 2 -16" fill="${c[0]}" stroke="${dk(c[0], 0.08)}" stroke-width="1"/>`;
      g += `<path d="M${x + w / 2} ${top} V${top - 7}" stroke="#3a3030" stroke-width="2"/><path d="M${x + w / 2} ${top - 36} C${x + w / 2 + 10} ${top - 20} ${x + w / 2 + 8} ${top - 6} ${x + w / 2} ${top - 6} C${x + w / 2 - 8} ${top - 6} ${x + w / 2 - 10} ${top - 20} ${x + w / 2} ${top - 36} Z" fill="${c[1]}"/><path d="M${x + w / 2} ${top - 24} C${x + w / 2 + 4} ${top - 16} ${x + w / 2 + 3} ${top - 9} ${x + w / 2} ${top - 9} C${x + w / 2 - 3} ${top - 9} ${x + w / 2 - 4} ${top - 16} ${x + w / 2} ${top - 24} Z" fill="#fff6d6"/>`;
    }
    return g + `<ellipse cx="85" cy="187" rx="80" ry="4" fill="#000" opacity=".2"/>`;
  }),
  A('hw-potions', 'Potion bottles', 'illustration', 220, 180, ['#8bd346', '#b467ff', '#ff5d8f'], ['potion', 'bottle', 'witch', 'magic', 'brew', 'drink'], (c) => {
    const glass = (d: string) => `<path d="${d}" fill="#ffffff" opacity=".18" stroke="#ffffff" stroke-opacity=".5" stroke-width="2"/>`;
    let g = `<ellipse cx="110" cy="176" rx="104" ry="4" fill="#000" opacity=".2"/>`;
    // round flask
    g += glass('M58 60 V82 C30 92 18 116 22 140 C26 164 48 174 70 174 C92 174 114 164 118 140 C122 116 110 92 82 82 V60 Z');
    g += `<path d="M24 128 C30 118 110 118 116 128 C118 150 104 172 70 172 C36 172 22 150 24 128 Z" fill="${c[0]}" opacity=".9"/><circle cx="52" cy="146" r="5" fill="#fff" opacity=".5"/><circle cx="80" cy="136" r="3" fill="#fff" opacity=".5"/>`;
    g += `<rect x="56" y="46" width="28" height="16" rx="3" fill="#a07850"/>`;
    // tall bottle
    g += glass('M138 30 V56 C126 62 122 72 122 84 V170 H174 V84 C174 72 170 62 158 56 V30 Z');
    g += `<path d="M124 100 H172 V168 H124 Z" fill="${c[1]}" opacity=".9"/><rect x="128" y="112" width="40" height="26" rx="3" fill="#f3ead7"/><path d="M136 125 H160" stroke="${dk(c[1], 0.3)}" stroke-width="2"/>`;
    g += `<path d="M136 18 H160 L158 32 H138 Z" fill="#8a6440"/>`;
    // small bottle
    g += glass('M190 108 V122 C180 126 176 134 176 144 V172 H214 V144 C214 134 210 126 200 122 V108 Z');
    g += `<path d="M178 148 H212 V170 H178 Z" fill="${c[2]}" opacity=".9"/><path d="M187 98 H203 V110 H187 Z" fill="#a07850"/>`;
    return g + `<path d="M34 104 Q40 96 50 92 M130 70 V150" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".45" fill="none"/>`;
  }),
  A('hw-lantern', 'Lantern', 'illustration', 120, 210, ['#2b2433', '#ffc94d'], ['lantern', 'light', 'glow', 'lamp', 'night'], (c) =>
    `<defs><radialGradient id="lg"><stop offset="0" stop-color="${c[1]}" stop-opacity=".55"/><stop offset="1" stop-color="${c[1]}" stop-opacity="0"/></radialGradient><radialGradient id="lp" cy="60%"><stop offset="0" stop-color="${lt(c[1], 0.7)}"/><stop offset="1" stop-color="${c[1]}"/></radialGradient></defs>` +
    `<circle cx="60" cy="120" r="60" fill="url(#lg)"/><path d="M60 6 a10 10 0 1 1 -0.1 0" fill="none" stroke="${c[0]}" stroke-width="5"/>` +
    `<path d="M34 52 L60 26 L86 52 Z" fill="${c[0]}"/><rect x="28" y="50" width="64" height="10" rx="3" fill="${c[0]}"/>` +
    `<path d="M34 60 L30 160 H90 L86 60 Z" fill="url(#lp)"/><path d="M34 60 L30 160 M86 60 L90 160 M60 60 V160 M32 110 H88" stroke="${c[0]}" stroke-width="4"/>` +
    `<rect x="24" y="158" width="72" height="12" rx="3" fill="${c[0]}"/><path d="M40 170 L46 182 H74 L80 170 Z" fill="${c[0]}"/>` +
    `<path d="M60 92 C68 104 66 120 60 124 C54 120 52 104 60 92 Z" fill="#fff6d6"/>`),
  A('hw-leaves', 'Autumn leaves', 'decoration', 300, 200, ['#e8590c', '#f2a516', '#b0361a'], ['leaves', 'autumn', 'fall', 'maple', 'harvest', 'thanksgiving'], (c) => {
    const spots: [number, number, number, number, number][] = [[10, 20, 0.9, -20, 0], [120, 4, 0.7, 25, 1], [210, 40, 0.85, 10, 2], [60, 110, 0.6, 50, 1], [170, 120, 0.75, -35, 0], [250, 130, 0.55, 70, 1], [100, 70, 0.45, 100, 2]];
    return spots.map(([x, y, s, r, k]) => `<g transform="translate(${x} ${y}) rotate(${r} 50 50) scale(${s})"><path d="${MAPLE}" fill="${c[k]}"/><path d="M50 96 V30 M50 60 L26 44 M50 60 L74 44 M50 46 L38 28 M50 46 L62 28" stroke="${dk(c[k], 0.3)}" stroke-width="2" fill="none"/></g>`).join('');
  }),
  A('hw-fog', 'Rolling fog', 'decoration', 400, 120, ['#e8e4f5'], ['fog', 'mist', 'smoke', 'cloud', 'eerie'], (c) => mist(400, 64, 90, c[0], 'f', 3, 0.7)),
  A('hw-stars', 'Night stars', 'decoration', 300, 200, ['#fff3c4'], ['stars', 'sky', 'night', 'sparkle', 'twinkle'], (c) => stars(300, 200, c[0], 46, 11, 3)),
  A('hw-eyes', 'Glowing eyes', 'decoration', 240, 90, ['#ffe14d'], ['eyes', 'glowing', 'dark', 'creepy', 'monster'], (c) =>
    `<defs><radialGradient id="eg"><stop offset="0" stop-color="${c[0]}" stop-opacity=".5"/><stop offset="1" stop-color="${c[0]}" stop-opacity="0"/></radialGradient></defs>` +
    [[30, 30, 1], [130, 20, 0.8], [190, 60, 0.7], [80, 66, 0.6]].map(([x, y, s]) => `<g transform="translate(${x} ${y}) scale(${s})"><ellipse cx="18" cy="0" rx="34" ry="18" fill="url(#eg)"/><path d="M0 0 Q6 -9 13 0 Q6 5 0 0 Z M23 0 Q30 -9 36 0 Q30 5 23 0 Z" fill="${c[0]}"/><path d="M6.5 -4 V3 M29.5 -4 V3" stroke="#1a1426" stroke-width="2"/></g>`).join('')),
  A('hw-fence', 'Iron fence', 'decoration', 400, 120, ['#15111d'], ['fence', 'gate', 'iron', 'graveyard', 'border'], (c) => {
    let g = `<path d="M0 40 H400 M0 96 H400" stroke="${c[0]}" stroke-width="5"/>`;
    for (let x = 10; x < 400; x += 22) { const lean = Math.sin(x) * 3; g += `<path d="M${x} 120 L${f1(x + lean)} 22" stroke="${c[0]}" stroke-width="4.5"/><path d="M${f1(x + lean - 6)} 26 L${f1(x + lean)} 8 L${f1(x + lean + 6)} 26 Z" fill="${c[0]}"/>`; }
    return g + `<path d="M160 40 Q200 0 240 40" fill="none" stroke="${c[0]}" stroke-width="5"/><circle cx="200" cy="58" r="10" fill="none" stroke="${c[0]}" stroke-width="3.5"/>`;
  }),
  A('hw-banner', 'Tattered banner', 'decoration', 420, 110, ['#f2802b', '#9a3d0b'], ['banner', 'ribbon', 'label', 'title', 'sign'], (c) =>
    `<path d="M40 30 L0 30 L18 58 L0 86 L60 86 Z M380 30 L420 30 L402 58 L420 86 L360 86 Z" fill="${c[1]}"/>` +
    `<path d="M40 14 L380 14 L380 90 L360 96 L340 88 L300 94 L270 86 L230 96 L190 88 L150 96 L110 88 L80 94 L40 90 Z" fill="${c[0]}"/>` +
    `<path d="M40 14 L380 14 L380 24 L40 24 Z" fill="#fff" opacity=".18"/><path d="M60 22 L64 34 M330 80 L336 70 M200 18 L196 26" stroke="${c[1]}" stroke-width="2.5"/>`),
  A('hw-broom', 'Witch broom', 'illustration', 260, 90, ['#8a5a32', '#e2b04a'], ['broom', 'witch', 'fly', 'magic'], (c) =>
    `<path d="M10 22 L178 50" stroke="${c[0]}" stroke-width="9" stroke-linecap="round"/><path d="M10 22 L178 50" stroke="${lt(c[0], 0.3)}" stroke-width="2.5" stroke-linecap="round"/>` +
    `<path d="M172 40 C200 30 236 34 256 58 C236 70 214 84 168 64 Z" fill="${c[1]}"/>${[44, 50, 56, 62].map((y, i) => `<path d="M178 ${y} Q216 ${y + 2 + i * 2} 250 ${y + 10 + i * 3}" stroke="${dk(c[1], 0.3)}" stroke-width="2" fill="none"/>`).join('')}<rect x="164" y="40" width="16" height="26" rx="4" transform="rotate(10 172 53)" fill="${dk(c[0], 0.25)}"/>`),
  A('hw-frame', 'Spooky frame', 'decoration', 400, 500, ['#f2802b', '#ebe8f5'], ['frame', 'border', 'web', 'invitation', 'card'], (c) => {
    const web = (tx: string) => `<g transform="${tx}" fill="none" stroke="${c[1]}" stroke-width="2" opacity=".9">${[0, 22, 45, 68, 90].map((d) => `<path d="M0 0 L${f1(Math.cos(d * Math.PI / 180) * 110)} ${f1(Math.sin(d * Math.PI / 180) * 110)}"/>`).join('')}${[30, 58, 88].map((r) => `<path d="M${r} 0 Q${f1(r * 0.75)} ${f1(r * 0.3)} ${f1(r * 0.92)} ${f1(r * 0.38)} Q${f1(r * 0.55)} ${f1(r * 0.55)} ${f1(r * 0.71)} ${f1(r * 0.71)} Q${f1(r * 0.3)} ${f1(r * 0.75)} ${f1(r * 0.38)} ${f1(r * 0.92)} Q${f1(r * 0.3)} ${f1(r * 0.75)} 0 ${r}"/>`).join('')}</g>`;
    return `<rect x="16" y="16" width="368" height="468" rx="18" fill="none" stroke="${c[0]}" stroke-width="8"/><rect x="30" y="30" width="340" height="440" rx="10" fill="none" stroke="${c[0]}" stroke-width="2" stroke-dasharray="2 8" stroke-linecap="round"/>` + web('translate(16 16)') + web('translate(384 16) scale(-1 1)');
  }),
];

// ---------- scene backgrounds (one per page shape so nothing stretches) ----------
const SHAPES: Record<string, [number, number, string]> = { sq: [1080, 1080, 'square'], po: [1000, 1414, 'portrait'], st: [1080, 1920, 'story'], ls: [1920, 1080, 'landscape'] };

type Bg = { id: string; name: string; colors: string[]; tags: string[]; draw: (c: string[], W: number, H: number) => string };
const BACKGROUNDS: Bg[] = [
  { id: 'hw-bg-night', name: 'Moonlit night', colors: ['#120f2b', '#3b2160', '#fff1c1'], tags: ['night', 'moon', 'sky', 'hills', 'stars'], draw: (c, W, H) => {
    const u = Math.min(W, H);
    return `<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c[0]}"/><stop offset=".75" stop-color="${c[1]}"/><stop offset="1" stop-color="${mix(c[1], '#ff8a3c', 0.25)}"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#s)"/>`
      + stars(W, H * 0.7, c[2], Math.round((W * H) / 9000), 4, 3.4) + moon('m', W * 0.72, H * 0.2, u * 0.13, c[2], c[2])
      + hills(W, H * 0.82, H * 0.1, mix(c[0], c[1], 0.55), 2) + mist(W, H * 0.8, H * 0.12, lt(c[1], 0.5), 'mf', 3, 0.35) + hills(W, H * 0.9, H * 0.08, dk(c[0], 0.25), 9);
  } },
  { id: 'hw-bg-dusk', name: 'Halloween dusk', colors: ['#2b1846', '#c2416b', '#ff9a3c'], tags: ['dusk', 'sunset', 'sky', 'trees', 'evening'], draw: (c, W, H) => {
    const u = Math.min(W, H);
    return `<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c[0]}"/><stop offset=".55" stop-color="${c[1]}"/><stop offset=".85" stop-color="${c[2]}"/></linearGradient><radialGradient id="sun"><stop offset="0" stop-color="${lt(c[2], 0.6)}"/><stop offset=".5" stop-color="${c[2]}" stop-opacity=".9"/><stop offset="1" stop-color="${c[2]}" stop-opacity="0"/></radialGradient></defs><rect width="${W}" height="${H}" fill="url(#s)"/>`
      + stars(W, H * 0.4, '#ffffff', Math.round((W * H) / 22000), 6, 2.4) + `<circle cx="${W * 0.5}" cy="${H * 0.8}" r="${u * 0.32}" fill="url(#sun)"/>`
      + hills(W, H * 0.84, H * 0.07, mix(c[0], c[1], 0.45), 4) + tree(W * 0.12, H * 0.86, u * 0.42, dk(c[0], 0.3), 2) + tree(W * 0.9, H * 0.88, u * 0.36, dk(c[0], 0.3), 8) + hills(W, H * 0.92, H * 0.05, dk(c[0], 0.4), 12);
  } },
  { id: 'hw-bg-patch', name: 'Pumpkin patch', colors: ['#2a1c3f', '#ff9a3c', '#3a2a1a'], tags: ['pumpkin', 'patch', 'field', 'farm', 'harvest'], draw: (c, W, H) => {
    const r = rng(21);
    let g = `<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c[0]}"/><stop offset=".62" stop-color="${mix(c[0], c[1], 0.6)}"/><stop offset=".7" stop-color="${c[1]}"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#s)"/>`;
    g += stars(W, H * 0.35, '#fff6d6', Math.round((W * H) / 30000), 8, 2.4);
    g += hills(W, H * 0.7, H * 0.04, mix(c[2], c[0], 0.3), 3) + `<rect y="${H * 0.72}" width="${W}" height="${H * 0.28}" fill="${c[2]}"/>`;
    const rows: [number, number][] = [[0.755, 0.045], [0.8, 0.07], [0.865, 0.1], [0.95, 0.15]];
    rows.forEach(([fy, fw], row) => {
      const y = H * fy, pw0 = W * fw;
      g += `<path d="M0 ${f1(y + pw0 * 0.3)} Q${W / 2} ${f1(y - pw0 * 0.2)} ${W} ${f1(y + pw0 * 0.3)}" stroke="${mix(c[2], '#3d6b2a', 0.6)}" stroke-width="${f1(2 + row * 3)}" fill="none"/>`;
      for (let x = pw0 * (0.4 + (row % 2) * 0.9) ; x < W + pw0; x += pw0 * (1.9 + r() * 0.8)) {
        const pw = pw0 * (0.8 + r() * 0.45);
        g += pumpkin(`p${row}_${Math.round(x)}`, x, y, pw, mix(c[1], '#e8590c', r() * 0.6), '#5b4426', '#4f7a34');
      }
    });
    return g;
  } },
  { id: 'hw-bg-bats', name: 'Bats & moons pattern', colors: ['#1a1426', '#ff8a1f'], tags: ['pattern', 'bats', 'moon', 'repeat', 'wallpaper'], draw: (c, W, H) =>
    `<defs><pattern id="p" width="240" height="240" patternUnits="userSpaceOnUse"><g transform="translate(14 26) scale(.56)" opacity=".85">${batBody(c[1], c[0], false)}</g><g transform="translate(130 140) rotate(-12 40 20) scale(.42)" opacity=".7">${batBody(c[1], c[0], false)}</g><path d="M180 50 a20 20 0 1 0 14 34 a16 16 0 1 1 -14 -34 Z" fill="${c[1]}" opacity=".8"/><circle cx="60" cy="170" r="4" fill="${c[1]}" opacity=".7"/><circle cx="210" cy="200" r="3" fill="${c[1]}" opacity=".6"/><circle cx="110" cy="100" r="2.5" fill="${c[1]}" opacity=".6"/></pattern></defs><rect width="${W}" height="${H}" fill="${c[0]}"/><rect width="${W}" height="${H}" fill="url(#p)"/>` },
  { id: 'hw-bg-candy', name: 'Candy pattern', colors: ['#ff8a1f', '#2a1c3f', '#fff2d6'], tags: ['pattern', 'candy', 'candy corn', 'sweets', 'party'], draw: (c, W, H) =>
    `<defs><pattern id="p" width="200" height="200" patternUnits="userSpaceOnUse"><g transform="translate(20 20) rotate(-15 25 30) scale(.5)"><path d="M50 6 C58 6 92 92 92 104 C92 116 8 116 8 104 C8 92 42 6 50 6 Z" fill="${c[2]}"/><path d="M26 66 H74 L84 92 C84 100 16 100 16 92 Z" fill="${c[1]}" opacity=".9"/></g><g transform="translate(120 110) rotate(20 25 30) scale(.45)"><path d="M50 6 C58 6 92 92 92 104 C92 116 8 116 8 104 C8 92 42 6 50 6 Z" fill="${c[2]}"/><path d="M26 66 H74 L84 92 C84 100 16 100 16 92 Z" fill="${c[1]}" opacity=".9"/></g><circle cx="150" cy="40" r="7" fill="${c[2]}" opacity=".8"/><circle cx="40" cy="160" r="5" fill="${c[1]}" opacity=".5"/><circle cx="90" cy="90" r="4" fill="${c[2]}" opacity=".6"/></pattern></defs><rect width="${W}" height="${H}" fill="${c[0]}"/><rect width="${W}" height="${H}" fill="url(#p)"/>` },
  { id: 'hw-bg-graveyard', name: 'Foggy graveyard', colors: ['#0f1a2a', '#36506b', '#cfe3ef'], tags: ['graveyard', 'cemetery', 'fog', 'night', 'tombstone'], draw: (c, W, H) => {
    const u = Math.min(W, H);
    let g = `<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c[0]}"/><stop offset="1" stop-color="${c[1]}"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#s)"/>`;
    g += stars(W, H * 0.6, c[2], Math.round((W * H) / 14000), 9, 2.6) + moon('m', W * 0.25, H * 0.18, u * 0.1, lt(c[2], 0.4), c[2]);
    g += tree(W * 0.85, H * 0.86, u * 0.5, dk(c[0], 0.2), 5);
    for (let i = 0; i < 6; i++) { const x = W * (0.06 + i * 0.16), w = u * (0.07 + (i % 3) * 0.02); g += tombstone(x, H * 0.86 - w * 1.4, w, w * 1.5, mix(c[1], c[0], 0.3), (i % 2 ? 5 : -6), i % 3 === 1 ? 'cross' : 'round'); }
    g += hills(W, H * 0.88, H * 0.03, dk(c[0], 0.35), 14) + mist(W, H * 0.84, H * 0.12, c[2], 'mf', 6, 0.4);
    return g;
  } },
];

const BG_ASSETS: AssetDef[] = BACKGROUNDS.flatMap((b) => Object.entries(SHAPES).map(([k, [W, H, label]]) => ({
  id: `${b.id}-${k}`, name: `${b.name} (${label})`, pack: 'halloween', kind: 'background' as const, ratio: W / H, colors: b.colors,
  tags: ['halloween', 'spooky', 'background', 'scene', label, ...b.tags], license: LICENSE, author: AUTHOR,
  svg: (c: string[]) => svg(W, H, b.draw(c, W, H), Math.max(W, H)),
})));

export const ASSETS: AssetDef[] = [...ILLUSTRATIONS, ...BG_ASSETS];
