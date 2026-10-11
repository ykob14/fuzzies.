/**
 * Diwali, Holi & Indian festivals collection — original vector artwork drawn in code for Fuzzies (licence: original
 * Fuzzies artwork). Symbolism: Diwali — clay diyas (oil lamps), rangoli, marigold torans with mango leaves, akash kandil
 * star lanterns, fireworks, mithai (laddoo, barfi), lotus. Holi — gulal colour powder in bowls and clouds, pichkari.
 * Navratri — dandiya sticks and the garbi (pierced pot with a lamp inside). Ganesh Chaturthi — modak sweets. Onam — the
 * pookalam flower carpet. Vaisakhi — the dhol drum and ripe wheat. Deities are not depicted.
 */
import type { AssetDef } from '../index';
import { asset, backgrounds, bokeh, dk, f1, flame, frame, glowDef, lightString, lt, mix, rng, sparkle, starPts, stars } from '../draw';

const A = asset('indian', ['indian', 'festival', 'celebration']);
const DIWALI = ['diwali', 'deepavali', 'dipawali', 'divali', 'festival of lights', 'दीपावली', 'दिवाली', 'shubh deepavali', 'happy diwali'];
const HOLI = ['holi', 'होली', 'festival of colours', 'festival of colors', 'rang'];
const NAV = ['navratri', 'navaratri', 'नवरात्रि', 'garba', 'dandiya', 'durga puja', 'dussehra'];

// ---------- drawings ----------
/** A clay diya with a painted rim and a glowing flame. */
function diya(id: string, x: number, y: number, s: number, clay: string, paint: string, fire: string): string {
  return `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${lt(clay, 0.15)}"/><stop offset="1" stop-color="${dk(clay, 0.35)}"/></linearGradient>${glowDef(`${id}g`, fire, 0.65)}</defs>` +
    `<circle cx="40" cy="-30" r="80" fill="url(#${id}g)"/><ellipse cx="0" cy="40" rx="62" ry="7" fill="#000" opacity=".18"/>` +
    `<path d="M-70 0 C-60 30 -30 40 0 40 C30 40 60 30 70 0 C80 -6 90 -10 96 -12 C86 -2 76 4 70 0 Z" fill="url(#${id})"/>` +
    `<ellipse cx="0" cy="0" rx="70" ry="13" fill="${dk(clay, 0.25)}"/><ellipse cx="0" cy="2" rx="62" ry="9" fill="#5a3410"/><ellipse cx="0" cy="2" rx="56" ry="7" fill="${mix('#e8b23a', '#5a3410', 0.35)}"/>` +
    `<path d="M-64 14 C-40 26 40 26 64 14" stroke="${paint}" stroke-width="4" fill="none"/>` + [-44, -22, 0, 22, 44].map((px) => `<circle cx="${px}" cy="${24 - Math.abs(px) * 0.12}" r="3.4" fill="${paint}"/>`).join('') +
    `<path d="M-54 22 C-50 30 -40 34 -30 36" stroke="#fff" stroke-width="3" fill="none" opacity=".25" stroke-linecap="round"/>` +
    `<path d="M52 -4 V-10" stroke="#3a2a1a" stroke-width="3"/>` + flame(54, -52, 44, fire) + `</g>`;
}
function marigold(x: number, y: number, r: number, c: string): string {
  let g = `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}" fill="${dk(c, 0.18)}"/>`;
  for (let k = 0; k < 3; k++) for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 + k * 0.3, d = r * (0.75 - k * 0.25); g += `<circle cx="${f1(x + Math.cos(a) * d)}" cy="${f1(y + Math.sin(a) * d)}" r="${f1(r * (0.34 - k * 0.06))}" fill="${k === 1 ? lt(c, 0.12) : c}"/>`; }
  return g + `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r * 0.2)}" fill="${dk(c, 0.3)}"/>`;
}
function rangoli(cx: number, cy: number, R: number, c: string[]): string {
  let g = `<circle cx="${cx}" cy="${cy}" r="${R}" fill="${c[0]}"/>`;
  const rings: [number, number, number][] = [[1, 16, 1], [0.8, 12, 2], [0.6, 10, 3], [0.42, 8, 4], [0.26, 8, 5]];
  for (const [k, n, ci] of rings) {
    const r = R * k;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 360;
      g += `<path d="M0 0 C${f1(r * 0.22)} ${f1(-r * 0.25)} ${f1(r * 0.2)} ${f1(-r * 0.7)} 0 ${f1(-r * 0.98)} C${f1(-r * 0.2)} ${f1(-r * 0.7)} ${f1(-r * 0.22)} ${f1(-r * 0.25)} 0 0 Z" fill="${c[ci % c.length]}" transform="translate(${cx} ${cy}) rotate(${f1(a + (ci % 2 ? 180 / n : 0))})"/>`;
    }
  }
  for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; g += `<circle cx="${f1(cx + Math.cos(a) * R * 1.04)}" cy="${f1(cy + Math.sin(a) * R * 1.04)}" r="${f1(R * 0.035)}" fill="${c[1]}"/>`; }
  return g + `<circle cx="${cx}" cy="${cy}" r="${f1(R * 0.1)}" fill="${c[1]}"/><circle cx="${cx}" cy="${cy}" r="${f1(R * 0.05)}" fill="#fff"/>`;
}
function kandil(id: string, x: number, y: number, s: number, paper: string, trim: string): string {
  return `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})"><defs>${glowDef(id, '#ffd27a', 0.55)}</defs><path d="M0 -200 V-80" stroke="${dk(trim, 0.3)}" stroke-width="2"/><circle cx="0" cy="0" r="90" fill="url(#${id})"/>` +
    `<polygon points="${starPts(0, 0, 5, 76, 38)}" fill="${paper}" stroke="${trim}" stroke-width="4" stroke-linejoin="round"/><polygon points="${starPts(0, 0, 5, 50, 25)}" fill="${lt(paper, 0.35)}" opacity=".85"/><circle cx="0" cy="0" r="14" fill="#fff6d0"/>` +
    [-24, -8, 8, 24].map((tx, i) => `<path d="M${tx} 44 C${tx + 2} 70 ${tx - 2} 90 ${tx} ${110 + (i % 2) * 14}" stroke="${i % 2 ? trim : paper}" stroke-width="4" fill="none" stroke-linecap="round"/>`).join('') + `</g>`;
}
function burst(cx: number, cy: number, r: number, c: string, n: number): string {
  let g = '';
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, x1 = cx + Math.cos(a) * r * 0.25, y1 = cy + Math.sin(a) * r * 0.25, x2 = cx + Math.cos(a) * r, y2 = cy + Math.sin(a) * r; g += `<path d="M${f1(x1)} ${f1(y1)} L${f1(x2)} ${f1(y2)}" stroke="${c}" stroke-width="${f1(r * 0.04)}" stroke-linecap="round"/><circle cx="${f1(x2 + Math.cos(a) * r * 0.08)}" cy="${f1(y2 + Math.sin(a) * r * 0.08)}" r="${f1(r * 0.035)}" fill="${lt(c, 0.4)}"/>`; }
  return g;
}
function laddoo(x: number, y: number, r: number, c: string): string {
  const rr = rng(Math.round(x * 3 + y));
  let g = `<defs><radialGradient id="ld${Math.round(x)}" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="${lt(c, 0.35)}"/><stop offset="1" stop-color="${dk(c, 0.25)}"/></radialGradient></defs><circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}" fill="url(#ld${Math.round(x)})"/>`;
  for (let i = 0; i < 26; i++) { const a = rr() * Math.PI * 2, d = Math.sqrt(rr()) * r * 0.9; g += `<circle cx="${f1(x + Math.cos(a) * d)}" cy="${f1(y + Math.sin(a) * d)}" r="${f1(r * 0.06)}" fill="${i % 2 ? lt(c, 0.3) : dk(c, 0.2)}"/>`; }
  return g;
}
function lotus(x: number, y: number, s: number, petal: string, leaf: string): string {
  let g = `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})"><ellipse cx="0" cy="20" rx="110" ry="20" fill="${leaf}"/><path d="M-110 20 L-40 18" stroke="${dk(leaf, 0.2)}" stroke-width="2"/>`;
  for (const [a, k] of [[-70, 0.12], [70, 0.12], [-40, 0.06], [40, 0.06], [-14, 0], [14, 0]] as const) g += `<path d="M0 14 C${f1(a * 0.2 - 30)} -10 ${f1(a * 0.9 - 14)} -60 ${f1(a * 0.9)} -80 C${f1(a * 0.9 + 14)} -60 ${f1(a * 0.2 + 30)} -10 0 14 Z" fill="${dk(petal, k)}" stroke="${dk(petal, 0.2)}" stroke-width="1.5"/>`;
  g += `<path d="M0 14 C-22 -20 -16 -70 0 -100 C16 -70 22 -20 0 14 Z" fill="${lt(petal, 0.15)}" stroke="${dk(petal, 0.2)}" stroke-width="1.5"/>`;
  return g + `<path d="M0 -6 C-6 -30 -4 -60 0 -84" stroke="${lt(petal, 0.5)}" stroke-width="3" fill="none" stroke-linecap="round"/></g>`;
}
function powder(cx: number, cy: number, r: number, c: string, seed: number, o = 0.85): string {
  const rr = rng(seed);
  let g = '';
  for (let i = 0; i < 22; i++) { const a = rr() * Math.PI * 2, d = Math.sqrt(rr()) * r, s = r * (0.18 + rr() * 0.3); g += `<circle cx="${f1(cx + Math.cos(a) * d)}" cy="${f1(cy + Math.sin(a) * d * 0.8)}" r="${f1(s)}" fill="${c}" opacity="${(o * (0.3 + rr() * 0.5)).toFixed(2)}"/>`; }
  for (let i = 0; i < 30; i++) { const a = rr() * Math.PI * 2, d = r * (0.9 + rr() * 0.6); g += `<circle cx="${f1(cx + Math.cos(a) * d)}" cy="${f1(cy + Math.sin(a) * d * 0.8)}" r="${f1(r * 0.03 + rr() * r * 0.03)}" fill="${c}" opacity="${o.toFixed(2)}"/>`; }
  return g;
}
function bowl(x: number, y: number, s: number, clay: string, pigment: string): string {
  return `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})"><ellipse cx="0" cy="30" rx="54" ry="6" fill="#000" opacity=".15"/><path d="M-50 0 C-46 22 -26 32 0 32 C26 32 46 22 50 0 Z" fill="${clay}"/><path d="M-44 0 C-40 -26 -14 -40 0 -40 C14 -40 40 -26 44 0 Z" fill="${pigment}"/><ellipse cx="0" cy="0" rx="50" ry="8" fill="${dk(clay, 0.2)}"/><path d="M-44 0 C-40 -26 -14 -40 0 -40 C14 -40 40 -26 44 0 C30 4 -30 4 -44 0 Z" fill="${pigment}"/><path d="M-20 -24 C-12 -32 0 -34 8 -32" stroke="#fff" stroke-width="4" fill="none" opacity=".35" stroke-linecap="round"/></g>`;
}

// ---------- assets ----------
export const ASSETS: AssetDef[] = [
  A('in-diya', 'Diya', 'illustration', 220, 180, ['#c4622d', '#f2c14e', '#ffb238'], [...DIWALI, 'diya', 'deepam', 'oil lamp', 'lamp', 'flame', 'दीया'], (c) => diya('d', 100, 120, 1, c[0], c[1], c[2])),
  A('in-diyas', 'Row of diyas', 'illustration', 400, 180, ['#c4622d', '#f2c14e', '#ffb238'], [...DIWALI, 'diyas', 'lamps', 'row', 'lights', 'border'], (c) =>
    diya('a', 70, 130, 0.72, c[0], c[1], c[2]) + diya('b', 196, 120, 0.9, dk(c[0], 0.08), c[1], c[2]) + diya('c', 322, 130, 0.72, c[0], c[1], c[2])),
  A('in-rangoli', 'Rangoli', 'illustration', 260, 260, ['#f6efe2', '#e2362f', '#f39c12', '#2e86de', '#27ae60', '#d63384'], [...DIWALI, ...['onam', 'pongal'], 'rangoli', 'kolam', 'pattern', 'mandala', 'flower', 'रंगोली'], (c) => rangoli(130, 130, 118, [c[0], c[1], c[2], c[3], c[4], c[5]])),
  A('in-toran', 'Marigold toran', 'decoration', 600, 200, ['#f39c12', '#f6c429', '#4f8a3a'], [...DIWALI, ...NAV, 'marigold', 'garland', 'toran', 'flowers', 'border', 'wedding', 'mehndi', 'गेंदा'], (c) => {
    let g = `<path d="M0 14 Q300 34 600 14" stroke="${dk(c[2], 0.3)}" stroke-width="4" fill="none"/>`;
    for (let i = 0; i < 9; i++) { const x = 34 + i * 66.5, len = 120 + (i % 2 ? 0 : 40) - Math.abs(i - 4) * 6; g += `<path d="M${f1(x)} 22 V${f1(len)}" stroke="${dk(c[2], 0.3)}" stroke-width="2"/>`; for (let k = 0; k < Math.floor(len / 22); k++) g += marigold(x, 34 + k * 22, 11, k % 2 ? c[1] : c[0]); g += `<path d="M${f1(x)} ${f1(len + 10)} l-7 14 h14z" fill="${c[0]}"/>`; }
    for (let i = 0; i < 18; i++) { const x = 16 + i * 33.5; g += `<path d="M${f1(x)} 22 C${f1(x - 10)} 40 ${f1(x - 4)} 60 ${f1(x)} 66 C${f1(x + 4)} 60 ${f1(x + 10)} 40 ${f1(x)} 22 Z" fill="${i % 2 ? c[2] : dk(c[2], 0.12)}"/>`; }
    return g;
  }),
  A('in-kandil', 'Star lantern (akash kandil)', 'illustration', 200, 340, ['#e2362f', '#f2c14e'], [...DIWALI, 'lantern', 'kandil', 'akash kandil', 'star', 'paper lantern', 'kandeel'], (c) => kandil('k', 100, 200, 1, c[0], c[1])),
  A('in-fireworks', 'Fireworks', 'decoration', 320, 260, ['#f2c14e', '#e2362f', '#d63384', '#2e86de'], [...DIWALI, 'fireworks', 'crackers', 'patakhe', 'celebration', 'new year', 'party'], (c) => burst(90, 90, 70, c[0], 18) + burst(230, 70, 54, c[2], 16) + burst(200, 190, 60, c[1], 18) + burst(70, 200, 40, c[3], 14) + sparkle(160, 130, 8, '#fff') + sparkle(280, 150, 6, c[0])),
  A('in-mithai', 'Mithai plate', 'illustration', 300, 180, ['#e8a33a', '#d4a940', '#f3ead7', '#c0c6cf'], [...DIWALI, 'mithai', 'sweets', 'laddoo', 'ladoo', 'barfi', 'मिठाई', 'gift'], (c) => {
    let g = `<ellipse cx="150" cy="150" rx="140" ry="22" fill="#000" opacity=".12"/><ellipse cx="150" cy="138" rx="140" ry="28" fill="${c[1]}"/><ellipse cx="150" cy="134" rx="124" ry="22" fill="${lt(c[1], 0.25)}"/>`;
    for (const [x, y] of [[110, 96], [150, 104], [190, 96], [130, 70], [170, 70], [150, 44]]) g += laddoo(x, y, 24, c[0]);
    for (const x of [44, 236]) g += `<path d="M${x} 120 l18 -20 h40 l-18 20 z" fill="${lt(c[2], 0.2)}"/><path d="M${x} 120 h40 v14 h-40z" fill="${c[2]}"/><path d="M${x + 40} 120 l18 -20 v14 l-18 20z" fill="${dk(c[2], 0.12)}"/><path d="M${x + 6} 116 l16 -14 h20 l-14 14 z" fill="${c[3]}" opacity=".9"/>`;
    return g;
  }),
  A('in-lotus', 'Lotus', 'illustration', 240, 160, ['#f28bb0', '#3f8a5a'], [...DIWALI, 'lotus', 'kamal', 'flower', 'vesak', 'yoga', 'peace'], (c) => lotus(120, 120, 1, c[0], c[1])),
  A('in-lights', 'String lights', 'decoration', 600, 120, ['#3a2a1a', '#ffd27a', '#ffb238', '#fff3c4'], [...DIWALI, 'lights', 'string lights', 'fairy lights', 'party', 'border'], (c) => lightString('ls', 0, 600, 20, 26, 14, c[0], [c[1], c[2], c[3]])),
  A('in-mandala', 'Mandala', 'decoration', 260, 260, ['#d4a940'], [...DIWALI, ...NAV, 'mandala', 'pattern', 'ornament', 'gold', 'mehndi', 'henna'], (c) => {
    let g = '';
    for (const [r, n] of [[124, 24], [96, 16], [70, 12], [44, 8]] as const) {
      g += `<circle cx="130" cy="130" r="${r}" fill="none" stroke="${c[0]}" stroke-width="2"/>`;
      for (let i = 0; i < n; i++) g += `<path d="M130 ${130 - r} C${f1(130 + r * 0.16)} ${f1(130 - r * 0.8)} ${f1(130 + r * 0.08)} ${f1(130 - r * 0.62)} 130 ${f1(130 - r * 0.6)} C${f1(130 - r * 0.08)} ${f1(130 - r * 0.62)} ${f1(130 - r * 0.16)} ${f1(130 - r * 0.8)} 130 ${130 - r} Z" fill="none" stroke="${c[0]}" stroke-width="2" transform="rotate(${f1((i / n) * 360)} 130 130)"/>`;
    }
    return g + `<circle cx="130" cy="130" r="14" fill="${c[0]}"/>`;
  }),
  A('in-frame', 'Paisley gold frame', 'decoration', 400, 520, ['#d4a940'], [...DIWALI, ...NAV, 'frame', 'border', 'paisley', 'elegant', 'invitation', 'wedding'], (c) =>
    frame(400, 520, c[0], 16, (k) => `<path d="M24 40 C10 30 14 12 30 12 C46 12 50 30 40 44 C34 52 26 56 22 66" stroke="${k}" stroke-width="2.5" fill="none"/><circle cx="31" cy="27" r="6" fill="${k}"/>`)),
  A('in-gulal', 'Gulal bowls', 'illustration', 320, 160, ['#c88a5a', '#e91e63', '#ffc107', '#00a8e8', '#4caf50'], [...HOLI, 'gulal', 'abir', 'colour powder', 'color powder', 'bowls'], (c) =>
    powder(160, 60, 90, c[1], 3, 0.25) + bowl(70, 112, 0.95, c[0], c[1]) + bowl(160, 100, 1.05, dk(c[0], 0.06), c[2]) + bowl(250, 112, 0.95, c[0], c[3]) + powder(110, 140, 20, c[4], 8)),
  A('in-holi-splash', 'Colour splash', 'decoration', 400, 300, ['#e91e63', '#ffc107', '#00a8e8', '#4caf50', '#9c27b0'], [...HOLI, 'splash', 'powder', 'colours', 'colors', 'rang'], (c) =>
    powder(110, 110, 90, c[0], 1) + powder(290, 100, 80, c[1], 2) + powder(200, 200, 90, c[2], 3) + powder(90, 230, 60, c[3], 4) + powder(320, 230, 60, c[4], 5)),
  A('in-pichkari', 'Pichkari', 'illustration', 300, 120, ['#00a8e8', '#ffc107', '#e91e63'], [...HOLI, 'pichkari', 'water gun', 'kids', 'fun'], (c) =>
    `<rect x="60" y="40" width="160" height="40" rx="18" fill="${c[0]}"/><rect x="70" y="46" width="140" height="10" rx="5" fill="#fff" opacity=".35"/><path d="M220 54 H270 V66 H220 Z" fill="${c[1]}"/><rect x="10" y="52" width="56" height="16" rx="6" fill="${c[1]}"/><rect x="0" y="40" width="16" height="40" rx="6" fill="${dk(c[1], 0.15)}"/>` +
    [0, 1, 2, 3].map((i) => `<circle cx="${280 + i * 6}" cy="${60 + (i % 2 ? -6 : 6)}" r="${4 - i * 0.6}" fill="${c[2]}"/>`).join('')),
  A('in-dandiya', 'Dandiya sticks', 'illustration', 240, 240, ['#e2362f', '#f2c14e', '#2e86de'], [...NAV, 'dandiya', 'sticks', 'raas', 'dance'], (c) => {
    const stick = (rot: number, col: string) => `<g transform="rotate(${rot} 120 120)"><rect x="112" y="10" width="16" height="220" rx="8" fill="${col}"/>` + [30, 60, 90, 120, 150, 180, 210].map((y, i) => `<rect x="110" y="${y}" width="20" height="8" rx="3" fill="${i % 2 ? c[1] : '#fff'}"/>`).join('') + `<circle cx="120" cy="12" r="8" fill="${c[1]}"/><path d="M120 18 c-12 10 -14 26 -8 34 M120 18 c12 10 14 26 8 34" stroke="${c[1]}" stroke-width="3" fill="none"/></g>`;
    return stick(-30, c[0]) + stick(30, c[2]);
  }),
  A('in-garbi', 'Garbi lamp pot', 'illustration', 200, 240, ['#c4622d', '#f2c14e', '#ffb238'], [...NAV, 'garbi', 'garba', 'pot', 'lamp', 'matki'], (c) => {
    let g = `<defs>${glowDef('gg', c[2], 0.6)}</defs><circle cx="100" cy="130" r="96" fill="url(#gg)"/><ellipse cx="100" cy="226" rx="70" ry="7" fill="#000" opacity=".15"/>`;
    g += `<path d="M70 40 H130 L126 64 C170 80 180 120 172 160 C164 200 134 222 100 222 C66 222 36 200 28 160 C20 120 30 80 74 64 Z" fill="${c[0]}"/><rect x="64" y="30" width="72" height="14" rx="5" fill="${dk(c[0], 0.2)}"/>`;
    const r = rng(5);
    for (let row = 0; row < 5; row++) for (let i = 0; i < 7; i++) { const a = -1 + (i / 6) * 2, x = 100 + a * (50 + row * 6 - Math.abs(row - 2) * 6), y = 92 + row * 24; g += `<circle cx="${f1(x)}" cy="${y}" r="${f1(4 + r() * 2)}" fill="#ffe08a"/>`; }
    return g + `<path d="M40 120 C60 128 140 128 160 120" stroke="${c[1]}" stroke-width="4" fill="none"/>` + flame(100, 0, 28, c[2]);
  }),
  A('in-modak', 'Modak', 'illustration', 260, 160, ['#f6e7c8', '#d4a940'], ['ganesh chaturthi', 'ganeshotsav', 'गणेश चतुर्थी', 'modak', 'sweets', 'prasad'], (c) => {
    const modak = (x: number, y: number, s: number) => {
      let g = `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 -60 C10 -40 44 -10 44 20 C44 40 26 50 0 50 C-26 50 -44 40 -44 20 C-44 -10 -10 -40 0 -60 Z" fill="${c[0]}" stroke="${dk(c[0], 0.2)}" stroke-width="2"/>`;
      for (const k of [-30, -15, 0, 15, 30]) g += `<path d="M0 -58 C${k * 0.4} -30 ${k} 10 ${k * 0.9} 48" stroke="${dk(c[0], 0.18)}" stroke-width="2" fill="none"/>`;
      return g + `</g>`;
    };
    return `<ellipse cx="130" cy="140" rx="120" ry="16" fill="${c[1]}"/>` + modak(70, 100, 0.9) + modak(190, 100, 0.9) + modak(130, 84, 1.05);
  }),
  A('in-pookalam', 'Pookalam', 'illustration', 260, 260, ['#fff4d6', '#f39c12', '#f6c429', '#e2362f', '#ffffff', '#4f8a3a'], ['onam', 'ഓണം', 'pookalam', 'athapookalam', 'flower carpet', 'kerala', 'harvest'], (c) => {
    let g = `<circle cx="130" cy="130" r="124" fill="${c[5]}"/>`;
    const ring = [c[1], c[2], c[3], c[4], c[1], c[3]];
    for (let k = 0; k < 6; k++) { const r = 118 - k * 19; g += `<circle cx="130" cy="130" r="${r}" fill="${ring[k]}"/>`; if (k % 2 === 0) for (let i = 0; i < 16; i++) g += `<path d="M130 ${130 - r} L${f1(130 + Math.sin(0.2) * r * 0.2)} ${f1(130 - r + 14)} L${f1(130 - Math.sin(0.2) * r * 0.2)} ${f1(130 - r + 14)} Z" fill="${ring[k + 1]}" transform="rotate(${i * 22.5} 130 130)"/>`; }
    return g + `<circle cx="130" cy="130" r="10" fill="${c[0]}"/>`;
  }),
  A('in-dhol', 'Dhol drum', 'illustration', 260, 200, ['#c4622d', '#f2c14e', '#e2362f', '#f6efe2'], ['vaisakhi', 'baisakhi', 'ਵਿਸਾਖੀ', 'bhangra', 'dhol', 'drum', 'lohri', 'music', 'wedding'], (c) =>
    `<ellipse cx="130" cy="190" rx="100" ry="7" fill="#000" opacity=".12"/><path d="M50 50 H210 C222 80 222 140 210 170 H50 C38 140 38 80 50 50 Z" fill="${c[0]}"/>` +
    `<path d="M50 50 L90 170 M90 50 L130 170 M130 50 L170 170 M170 50 L210 170 M90 50 L50 170 M130 50 L90 170 M170 50 L130 170 M210 50 L170 170" stroke="${c[1]}" stroke-width="3"/>` +
    `<ellipse cx="50" cy="110" rx="18" ry="62" fill="${c[3]}" stroke="${c[2]}" stroke-width="8"/><ellipse cx="210" cy="110" rx="18" ry="62" fill="${dk(c[3], 0.06)}" stroke="${c[2]}" stroke-width="8"/>` +
    `<path d="M80 40 Q130 0 180 40" stroke="${c[2]}" stroke-width="6" fill="none"/><path d="M226 30 L180 120" stroke="${dk(c[0], 0.4)}" stroke-width="6" stroke-linecap="round"/><path d="M20 40 Q40 60 36 100" stroke="${dk(c[0], 0.4)}" stroke-width="5" fill="none" stroke-linecap="round"/>`),
  A('in-sparkles', 'Golden sparkles', 'decoration', 300, 200, ['#f2c14e', '#fff3c4'], [...DIWALI, 'sparkles', 'stars', 'gold'], (c) => {
    const r = rng(52); let g = '';
    for (let i = 0; i < 20; i++) { const x = r() * 300, y = r() * 200; g += i % 3 ? sparkle(x, y, 3 + r() * 7, i % 2 ? c[0] : c[1], 0.9) : `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(2 + r() * 3)}" fill="${c[0]}"/>`; }
    return g;
  }),
];

// ---------- backgrounds ----------
const BGS = backgrounds('indian', ['indian', 'festival'], [
  { id: 'in-bg-diwali-night', name: 'Diwali night', colors: ['#1b0f3a', '#5a1846', '#ffb238'], tags: [...DIWALI, 'night', 'lights', 'bokeh', 'purple', 'magenta'], draw: (c, W, H) => {
    const u = Math.min(W, H);
    return `<defs><radialGradient id="r" cx="50%" cy="80%" r="95%"><stop offset="0" stop-color="${c[1]}"/><stop offset="1" stop-color="${c[0]}"/></radialGradient></defs><rect width="${W}" height="${H}" fill="url(#r)"/>` +
      bokeh(W, H, [c[2], '#ff7a59', '#ffd27a'], Math.round((W * H) / 26000), 17, u * 0.06, 'bk') + stars(W, H * 0.5, '#fff3c4', Math.round((W * H) / 30000), 6, 2) +
      `<g transform="scale(${f1(W / 600)} ${f1(u / 600)})">${lightString('ls', -10, 610, 0, 28, 14, '#2a1a10', [c[2], '#ffd27a', '#fff3c4'])}</g>`;
  } },
  { id: 'in-bg-saffron', name: 'Saffron glow', colors: ['#fff1d0', '#f6b44a', '#e2362f'], tags: [...DIWALI, ...NAV, 'saffron', 'orange', 'warm', 'mandala'], draw: (c, W, H) => {
    const u = Math.min(W, H);
    let g = `<defs><radialGradient id="r" cx="50%" cy="45%" r="80%"><stop offset="0" stop-color="${c[0]}"/><stop offset=".7" stop-color="${c[1]}"/><stop offset="1" stop-color="${mix(c[1], c[2], 0.5)}"/></radialGradient></defs><rect width="${W}" height="${H}" fill="url(#r)"/>`;
    for (const [r, n] of [[0.62, 32], [0.5, 24], [0.38, 16]] as const) {
      const R = u * r;
      g += `<circle cx="${f1(W / 2)}" cy="${f1(H * 0.45)}" r="${f1(R)}" fill="none" stroke="#fff" stroke-width="${f1(u * 0.003)}" opacity=".35"/>`;
      for (let i = 0; i < n; i++) g += `<circle cx="${f1(W / 2 + Math.cos((i / n) * Math.PI * 2) * R)}" cy="${f1(H * 0.45 + Math.sin((i / n) * Math.PI * 2) * R)}" r="${f1(u * 0.007)}" fill="#fff" opacity=".4"/>`;
    }
    return g;
  } },
  { id: 'in-bg-maroon', name: 'Maroon & gold', colors: ['#4a0d1c', '#7a1a2e', '#d4a940'], tags: [...DIWALI, ...NAV, 'maroon', 'gold', 'luxury', 'wedding', 'elegant'], draw: (c, W, H) => {
    const u = Math.min(W, H), m = u * 0.04;
    let g = `<defs><radialGradient id="r" cx="50%" cy="40%" r="80%"><stop offset="0" stop-color="${c[1]}"/><stop offset="1" stop-color="${c[0]}"/></radialGradient></defs><rect width="${W}" height="${H}" fill="url(#r)"/>`;
    g += `<rect x="${f1(m)}" y="${f1(m)}" width="${f1(W - m * 2)}" height="${f1(H - m * 2)}" fill="none" stroke="${c[2]}" stroke-width="${f1(u * 0.005)}"/><rect x="${f1(m * 1.4)}" y="${f1(m * 1.4)}" width="${f1(W - m * 2.8)}" height="${f1(H - m * 2.8)}" fill="none" stroke="${c[2]}" stroke-width="${f1(u * 0.002)}" stroke-dasharray="${f1(u * 0.01)} ${f1(u * 0.008)}"/>`;
    return g + bokeh(W, H, [c[2]], Math.round((W * H) / 70000), 9, u * 0.04, 'bk');
  } },
  { id: 'in-bg-holi', name: 'Holi colours', colors: ['#fffdf8', '#e91e63', '#ffc107', '#00a8e8', '#4caf50', '#9c27b0'], tags: [...HOLI, 'colourful', 'colorful', 'splash', 'bright', 'fun'], draw: (c, W, H) => {
    const u = Math.min(W, H);
    return `<rect width="${W}" height="${H}" fill="${c[0]}"/>` + powder(W * 0.08, H * 0.1, u * 0.3, c[1], 11, 0.7) + powder(W * 0.92, H * 0.12, u * 0.26, c[2], 12, 0.7) + powder(W * 0.06, H * 0.9, u * 0.28, c[3], 13, 0.7) + powder(W * 0.94, H * 0.88, u * 0.3, c[4], 14, 0.7) + powder(W * 0.5, H * 1.02, u * 0.2, c[5], 15, 0.6);
  } },
  { id: 'in-bg-cream', name: 'Ivory mandala', colors: ['#fdf6ea', '#d4a940', '#c4622d'], tags: [...DIWALI, 'cream', 'ivory', 'minimal', 'elegant', 'invitation'], draw: (c, W, H) => {
    const u = Math.min(W, H);
    let g = `<rect width="${W}" height="${H}" fill="${c[0]}"/>`;
    for (const [cx, cy] of [[0, 0], [W, 0], [0, H], [W, H]]) for (let k = 1; k <= 5; k++) g += `<circle cx="${cx}" cy="${cy}" r="${f1(u * 0.06 * k)}" fill="none" stroke="${k % 2 ? c[1] : c[2]}" stroke-width="${f1(u * (k % 2 ? 0.004 : 0.0025))}" opacity="${(0.85 - k * 0.12).toFixed(2)}" stroke-dasharray="${f1(u * 0.01)} ${f1(u * 0.006)}"/>`;
    return g;
  } },
]);

ASSETS.push(...BGS);
