/**
 * Baby collection — original vector artwork drawn in code for Fuzzies (licence: original Fuzzies artwork).
 * For pregnancy announcements, gender reveals, baby showers, sprinkles, births, welcomes, first birthdays and naming
 * days: teddy bears, clouds, moon and stars, boho rainbows, balloons, baby animals, onesies, bottles, rattles, prams,
 * footprints, mobiles and soft watercolour flowers in pink, blue and neutral palettes.
 */
import type { AssetDef } from '../index';
import { asset, backgrounds, dk, f1, lt, rng, sparkle, starPts } from '../draw';

const A = asset('baby', ['baby', 'baby shower', 'newborn', 'cute', 'nursery']);

// ---------- drawings ----------
const face = (x: number, y: number, s: number, ink = '#4a3b3b', blush = '#f5a3b5', sleepy = false) =>
  (sleepy
    ? `<path d="M${f1(x - s * 1.1)} ${f1(y)} q${f1(s * 0.4)} ${f1(s * 0.35)} ${f1(s * 0.8)} 0 M${f1(x + s * 0.3)} ${f1(y)} q${f1(s * 0.4)} ${f1(s * 0.35)} ${f1(s * 0.8)} 0" stroke="${ink}" stroke-width="${f1(s * 0.16)}" fill="none" stroke-linecap="round"/>`
    : `<circle cx="${f1(x - s * 0.7)}" cy="${f1(y)}" r="${f1(s * 0.2)}" fill="${ink}"/><circle cx="${f1(x + s * 0.7)}" cy="${f1(y)}" r="${f1(s * 0.2)}" fill="${ink}"/><circle cx="${f1(x - s * 0.64)}" cy="${f1(y - s * 0.07)}" r="${f1(s * 0.06)}" fill="#fff"/><circle cx="${f1(x + s * 0.76)}" cy="${f1(y - s * 0.07)}" r="${f1(s * 0.06)}" fill="#fff"/>`) +
  `<path d="M${f1(x - s * 0.22)} ${f1(y + s * 0.35)} q${f1(s * 0.22)} ${f1(s * 0.22)} ${f1(s * 0.44)} 0" stroke="${ink}" stroke-width="${f1(s * 0.12)}" fill="none" stroke-linecap="round"/>` +
  `<ellipse cx="${f1(x - s * 1.15)}" cy="${f1(y + s * 0.35)}" rx="${f1(s * 0.3)}" ry="${f1(s * 0.18)}" fill="${blush}" opacity=".7"/><ellipse cx="${f1(x + s * 1.15)}" cy="${f1(y + s * 0.35)}" rx="${f1(s * 0.3)}" ry="${f1(s * 0.18)}" fill="${blush}" opacity=".7"/>`;
function cloud(x: number, y: number, s: number, c: string, withFace = false): string {
  return `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})"><path d="M-80 30 C-104 30 -110 0 -88 -8 C-92 -36 -56 -48 -40 -30 C-30 -64 22 -66 32 -30 C52 -46 86 -34 80 -6 C104 -4 104 30 80 30 Z" fill="${c}"/><path d="M-80 30 H80" stroke="${dk(c, 0.06)}" stroke-width="4"/>${withFace ? face(0, 2, 12) : ''}</g>`;
}
function balloon(x: number, y: number, s: number, c: string, sx: number, sy: number): string {
  return `<path d="M${f1(x)} ${f1(y + 60 * s)} C${f1(x + 10)} ${f1((y + sy) / 2)} ${f1(sx - 10)} ${f1((y + sy) / 2 + 20)} ${f1(sx)} ${f1(sy)}" stroke="#9b8f8a" stroke-width="1.6" fill="none"/>` +
    `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})"><defs><radialGradient id="bl${Math.round(x)}${Math.round(y)}" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="${lt(c, 0.45)}"/><stop offset=".6" stop-color="${c}"/><stop offset="1" stop-color="${dk(c, 0.15)}"/></radialGradient></defs>` +
    `<path d="M0 -60 C34 -60 46 -30 46 -8 C46 26 18 52 0 56 C-18 52 -46 26 -46 -8 C-46 -30 -34 -60 0 -60 Z" fill="url(#bl${Math.round(x)}${Math.round(y)})"/><path d="M-6 56 L6 56 L4 62 L-4 62 Z" fill="${dk(c, 0.15)}"/><ellipse cx="-16" cy="-30" rx="7" ry="13" fill="#fff" opacity=".45" transform="rotate(25 -16 -30)"/></g>`;
}
function teddy(x: number, y: number, s: number, fur: string, muzzle: string, bow: string): string {
  return `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})"><ellipse cx="0" cy="118" rx="80" ry="8" fill="#000" opacity=".1"/>` +
    `<ellipse cx="-54" cy="76" rx="26" ry="34" fill="${fur}" transform="rotate(30 -54 76)"/><ellipse cx="54" cy="76" rx="26" ry="34" fill="${fur}" transform="rotate(-30 54 76)"/>` +
    `<ellipse cx="0" cy="70" rx="58" ry="52" fill="${fur}"/><ellipse cx="0" cy="80" rx="32" ry="30" fill="${muzzle}"/>` +
    `<ellipse cx="-40" cy="108" rx="24" ry="18" fill="${fur}"/><ellipse cx="40" cy="108" rx="24" ry="18" fill="${fur}"/><ellipse cx="-40" cy="110" rx="12" ry="9" fill="${muzzle}"/><ellipse cx="40" cy="110" rx="12" ry="9" fill="${muzzle}"/>` +
    `<circle cx="-44" cy="-44" r="20" fill="${fur}"/><circle cx="44" cy="-44" r="20" fill="${fur}"/><circle cx="-44" cy="-44" r="10" fill="${muzzle}"/><circle cx="44" cy="-44" r="10" fill="${muzzle}"/>` +
    `<circle cx="0" cy="-10" r="52" fill="${fur}"/><ellipse cx="0" cy="8" rx="22" ry="17" fill="${muzzle}"/><ellipse cx="0" cy="0" rx="8" ry="5.5" fill="#4a3530"/><path d="M0 6 V12 M-7 15 Q0 20 7 15" stroke="#4a3530" stroke-width="2.6" fill="none" stroke-linecap="round"/>` +
    `<circle cx="-19" cy="-18" r="5.5" fill="#4a3530"/><circle cx="19" cy="-18" r="5.5" fill="#4a3530"/><circle cx="-17" cy="-20" r="1.8" fill="#fff"/><circle cx="21" cy="-20" r="1.8" fill="#fff"/><ellipse cx="-34" cy="4" rx="8" ry="5" fill="#f5a3b5" opacity=".55"/><ellipse cx="34" cy="4" rx="8" ry="5" fill="#f5a3b5" opacity=".55"/>` +
    `<path d="M0 40 L-26 28 L-26 54 Z M0 40 L26 28 L26 54 Z" fill="${bow}"/><circle cx="0" cy="40" r="7" fill="${dk(bow, 0.15)}"/></g>`;
}
function elephant(x: number, y: number, s: number, c: string, ear: string): string {
  return `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})"><ellipse cx="0" cy="84" rx="80" ry="7" fill="#000" opacity=".1"/>` +
    `<ellipse cx="10" cy="34" rx="70" ry="48" fill="${c}"/><rect x="-34" y="52" width="24" height="34" rx="10" fill="${c}"/><rect x="34" y="52" width="24" height="34" rx="10" fill="${c}"/><path d="M78 26 q16 0 14 16" stroke="${c}" stroke-width="5" fill="none" stroke-linecap="round"/>` +
    `<ellipse cx="-62" cy="-6" rx="34" ry="40" fill="${c}"/><ellipse cx="-62" cy="-6" rx="22" ry="28" fill="${ear}"/>` +
    `<circle cx="-30" cy="-14" r="44" fill="${c}"/><path d="M-62 4 C-82 20 -86 46 -70 60 C-62 66 -56 60 -62 52 C-70 42 -60 28 -44 18 Z" fill="${c}"/>` +
    `<path d="M-30 -28 q8 6 16 0" stroke="#4a3b3b" stroke-width="4" fill="none" stroke-linecap="round"/><ellipse cx="-6" cy="-6" rx="8" ry="5" fill="#f5a3b5" opacity=".6"/></g>`;
}
function giraffe(x: number, y: number, s: number, c: string, spot: string): string {
  let g = `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})"><ellipse cx="0" cy="150" rx="60" ry="6" fill="#000" opacity=".1"/>`;
  g += `<path d="M-20 150 V100 M20 150 V100" stroke="${c}" stroke-width="16" stroke-linecap="round"/><ellipse cx="0" cy="94" rx="44" ry="30" fill="${c}"/><path d="M8 80 C10 40 4 0 -2 -30 L20 -30 C24 0 30 40 30 82 Z" fill="${c}"/>`;
  for (const [sx, sy, r] of [[-20, 90, 9], [6, 100, 8], [26, 86, 7], [14, 40, 6], [12, 6, 6], [18, -16, 5]]) g += `<circle cx="${sx}" cy="${sy}" r="${r}" fill="${spot}"/>`;
  g += `<ellipse cx="0" cy="-44" rx="32" ry="26" fill="${c}"/><ellipse cx="-14" cy="-36" rx="18" ry="12" fill="${lt(c, 0.25)}"/><path d="M-6 -70 V-86 M14 -70 V-86" stroke="${dk(c, 0.2)}" stroke-width="5" stroke-linecap="round"/><circle cx="-6" cy="-88" r="6" fill="${spot}"/><circle cx="14" cy="-88" r="6" fill="${spot}"/>`;
  g += `<ellipse cx="30" cy="-62" rx="12" ry="6" fill="${c}" transform="rotate(-20 30 -62)"/><circle cx="8" cy="-50" r="4" fill="#4a3b3b"/><circle cx="-18" cy="-36" r="2" fill="#4a3b3b"/><ellipse cx="18" cy="-38" rx="6" ry="4" fill="#f5a3b5" opacity=".6"/>`;
  return g + `<path d="M-2 -30 C-6 -10 -10 20 0 60" stroke="${spot}" stroke-width="6" fill="none" stroke-dasharray="6 6"/></g>`;
}
function duck(x: number, y: number, s: number, c: string): string {
  return `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})"><ellipse cx="0" cy="50" rx="56" ry="6" fill="#000" opacity=".1"/><path d="M-50 14 C-50 44 -20 50 6 50 C40 50 56 30 54 0 C46 12 30 14 20 10 Z" fill="${c}"/><circle cx="-14" cy="-16" r="30" fill="${c}"/>` +
    `<path d="M-46 -14 C-60 -14 -64 -4 -56 0 C-50 2 -44 -2 -42 -6 Z" fill="#f08a24"/><circle cx="-22" cy="-22" r="4" fill="#4a3b3b"/><ellipse cx="-6" cy="-8" rx="6" ry="4" fill="#f5a3b5" opacity=".6"/><path d="M0 20 C10 6 26 6 34 16" stroke="${dk(c, 0.12)}" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M-14 -46 q4 -10 8 0" stroke="${dk(c, 0.1)}" stroke-width="3" fill="none"/></g>`;
}
function onesie(c: string, trim: string): string {
  return `<path d="M60 20 C70 34 110 34 120 20 L160 40 L176 80 L148 92 L140 74 V150 C140 170 130 178 116 184 L108 200 H72 L64 184 C50 178 40 170 40 150 V74 L32 92 L4 80 L20 40 Z" fill="${c}"/>` +
    `<path d="M60 20 C70 34 110 34 120 20" stroke="${trim}" stroke-width="6" fill="none"/><path d="M4 80 L32 92 M176 80 L148 92" stroke="${trim}" stroke-width="6"/>` +
    `<path d="M90 120 C80 106 62 108 64 124 C66 138 84 146 90 154 C96 146 114 138 116 124 C118 108 100 106 90 120 Z" fill="${trim}"/>` + [80, 100].map((x) => `<circle cx="${x}" cy="190" r="3" fill="${dk(c, 0.2)}"/>`).join('');
}
function flowerBunch(c: string[], seed: number): string {
  const r = rng(seed);
  let g = '';
  for (let i = 0; i < 12; i++) { const a = -2.6 + r() * 2.2, d = 70 + r() * 50, lx = 150 + Math.cos(a) * d, ly = 130 + Math.sin(a) * d * 0.7 + 30; g += `<ellipse cx="${f1(lx)}" cy="${f1(ly)}" rx="${f1(24 + r() * 10)}" ry="${f1(9 + r() * 4)}" fill="${c[3]}" opacity=".85" transform="rotate(${f1((a * 180) / Math.PI)} ${f1(lx)} ${f1(ly)})"/>`; }
  const peony = (x: number, y: number, R: number, col: string) => {
    let p = '';
    for (let k = 0; k < 4; k++) for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2 + k * 0.5, d = R * (0.6 - k * 0.15); p += `<circle cx="${f1(x + Math.cos(a) * d)}" cy="${f1(y + Math.sin(a) * d * 0.85)}" r="${f1(R * (0.5 - k * 0.08))}" fill="${k % 2 ? lt(col, 0.2) : col}" opacity=".78"/>`; }
    return p + `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(R * 0.2)}" fill="${dk(col, 0.12)}" opacity=".7"/>`;
  };
  g += peony(110, 120, 44, c[0]) + peony(196, 112, 40, c[1]) + peony(154, 80, 36, c[2]) + peony(70, 70, 26, c[1]) + peony(236, 64, 24, c[0]);
  for (let i = 0; i < 10; i++) g += `<circle cx="${f1(40 + r() * 220)}" cy="${f1(20 + r() * 60)}" r="${f1(3 + r() * 3)}" fill="${c[i % 3]}" opacity=".7"/>`;
  return g;
}

// ---------- assets ----------
export const ASSETS: AssetDef[] = [
  A('bb-teddy', 'Teddy bear', 'illustration', 220, 260, ['#c99a6e', '#f2dcc2', '#9cc4e4'], ['teddy', 'bear', 'toy', 'boy', 'girl', 'first birthday'], (c) => teddy(110, 130, 1, c[0], c[1], c[2])),
  A('bb-cloud', 'Sleepy cloud', 'illustration', 240, 140, ['#ffffff'], ['cloud', 'sky', 'dream', 'sleepy', 'neutral'], (c) => cloud(120, 70, 1.1, c[0], true)),
  A('bb-moon', 'Moon & stars', 'illustration', 260, 260, ['#f6d27a', '#fff3c4', '#ffffff'], ['moon', 'stars', 'twinkle twinkle little star', 'night', 'sleep', 'neutral', 'gender neutral'], (c) => {
    let g = `<path d="M150 30 C90 40 60 100 80 160 C100 220 170 240 220 210 C160 210 120 170 118 120 C116 80 130 50 150 30 Z" fill="${c[0]}"/><path d="M100 150 q10 10 20 0" stroke="#7a6040" stroke-width="4" fill="none" stroke-linecap="round"/><ellipse cx="96" cy="170" rx="9" ry="5" fill="#f5a3b5" opacity=".6"/>`;
    for (const [x, len, r] of [[180, 60, 14], [212, 100, 10], [240, 40, 9]]) g += `<path d="M${x} 0 V${len}" stroke="${dk(c[0], 0.2)}" stroke-width="1.5"/><polygon points="${starPts(x, len + r, 5, r, r * 0.45)}" fill="${c[1]}" stroke="${dk(c[0], 0.1)}" stroke-width="1.5" stroke-linejoin="round"/>`;
    return g + cloud(170, 220, 0.5, c[2]) + sparkle(40, 60, 8, c[1]) + sparkle(60, 230, 6, c[1]);
  }),
  A('bb-rainbow', 'Boho rainbow', 'illustration', 300, 190, ['#d9876b', '#e8b98a', '#f3dcc0', '#a8b89a', '#ffffff'], ['rainbow', 'boho', 'neutral', 'gender neutral', 'rainbow baby', 'sprinkle'], (c) => {
    let g = '';
    [c[0], c[1], c[2], c[3]].forEach((col, i) => { const r = 130 - i * 26; g += `<path d="M${150 - r} 170 A${r} ${r} 0 0 1 ${150 + r} 170" stroke="${col}" stroke-width="24" fill="none" stroke-linecap="round"/>`; });
    return g + cloud(40, 166, 0.42, c[4]) + cloud(260, 166, 0.42, c[4]);
  }),
  A('bb-balloons', 'Balloon bunch', 'illustration', 240, 320, ['#f7b8c8', '#a9d2f0', '#f6e3a1', '#c8e6c9'], ['balloons', 'party', 'celebration', 'first birthday', 'welcome'], (c) =>
    balloon(70, 90, 0.95, c[0], 120, 300) + balloon(170, 84, 0.95, c[1], 120, 300) + balloon(120, 150, 0.95, c[2], 120, 300) + balloon(64, 196, 0.75, c[3], 120, 300) + balloon(180, 190, 0.75, c[0], 120, 300) + `<path d="M112 296 L120 300 L128 296" stroke="#9b8f8a" stroke-width="3" fill="none"/>`),
  A('bb-reveal-balloons', 'Pink or blue balloons', 'illustration', 240, 300, ['#f4a6c0', '#94c6ec', '#ffffff'], ['gender reveal', 'boy or girl', 'he or she', 'pink or blue', 'balloons', 'team pink', 'team blue'], (c) => {
    let g = balloon(78, 110, 1.15, c[0], 120, 290) + balloon(162, 110, 1.15, c[1], 120, 290);
    g += `<path d="M66 104 c0 -14 22 -14 22 -2 c0 8 -10 9 -10 18 M78 132 v2" stroke="${c[2]}" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M150 104 c0 -14 22 -14 22 -2 c0 8 -10 9 -10 18 M162 132 v2" stroke="${c[2]}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
    return g + `<path d="M112 286 L120 290 L128 286" stroke="#9b8f8a" stroke-width="3" fill="none"/>`;
  }),
  A('bb-elephant', 'Baby elephant', 'illustration', 240, 190, ['#b9c6d2', '#f4c2cf'], ['elephant', 'animal', 'safari', 'boy', 'neutral'], (c) => elephant(130, 92, 1, c[0], c[1])),
  A('bb-giraffe', 'Baby giraffe', 'illustration', 180, 280, ['#f2c46b', '#d08b4a'], ['giraffe', 'animal', 'safari', 'neutral', 'jungle'], (c) => giraffe(90, 124, 0.95, c[0], c[1])),
  A('bb-duck', 'Little duckling', 'illustration', 160, 120, ['#ffd84d'], ['duck', 'duckling', 'rubber duck', 'bath', 'neutral'], (c) => duck(86, 62, 1, c[0])),
  A('bb-onesie', 'Onesie', 'illustration', 180, 210, ['#f7c6d6', '#ffffff'], ['onesie', 'bodysuit', 'clothes', 'pregnancy announcement', 'coming soon'], (c) => onesie(c[0], c[1])),
  A('bb-bottle', 'Baby bottle', 'illustration', 120, 240, ['#a9d2f0', '#ffffff', '#f6e3a1'], ['bottle', 'milk', 'feeding'], (c) =>
    `<path d="M50 10 C50 0 70 0 70 10 L76 44 H44 Z" fill="${c[2]}"/><rect x="34" y="44" width="52" height="20" rx="6" fill="${c[0]}"/><rect x="28" y="62" width="64" height="168" rx="22" fill="${c[1]}" opacity=".95" stroke="${dk(c[1], 0.12)}" stroke-width="3"/>` +
    `<path d="M30 140 H90 V208 C90 220 80 228 70 228 H50 C40 228 30 220 30 208 Z" fill="#fff8ec"/>` + [100, 130, 160, 190].map((y) => `<path d="M30 ${y} H44" stroke="${c[0]}" stroke-width="3"/>`).join('') + `<path d="M40 78 V200" stroke="#fff" stroke-width="5" opacity=".6" stroke-linecap="round"/>`),
  A('bb-rattle', 'Rattle', 'illustration', 160, 240, ['#f7b8c8', '#f6e3a1', '#a9d2f0'], ['rattle', 'toy'], (c) =>
    `<rect x="72" y="130" width="16" height="90" rx="8" fill="${c[1]}"/><circle cx="80" cy="226" r="14" fill="${c[2]}"/><circle cx="80" cy="74" r="64" fill="${c[0]}"/><circle cx="80" cy="74" r="64" fill="none" stroke="${dk(c[0], 0.12)}" stroke-width="4"/>` +
    [[56, 50], [104, 58], [74, 100], [100, 92], [60, 82]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="7" fill="${i % 2 ? c[1] : c[2]}"/>`).join('') + `<rect x="64" y="128" width="32" height="12" rx="6" fill="${dk(c[1], 0.1)}"/><ellipse cx="54" cy="40" rx="10" ry="16" fill="#fff" opacity=".4" transform="rotate(30 54 40)"/>`),
  A('bb-pram', 'Pram', 'illustration', 260, 220, ['#a9d2f0', '#ffffff', '#6b7c8a'], ['pram', 'stroller', 'carriage', 'buggy', 'welcome baby', 'its a boy', 'its a girl'], (c) =>
    `<path d="M60 40 A90 90 0 0 0 40 120 H130 Z" fill="${dk(c[0], 0.1)}"/><path d="M40 120 H220 C220 160 190 176 130 176 C70 176 40 160 40 120 Z" fill="${c[0]}"/><path d="M40 120 H220" stroke="${c[1]}" stroke-width="6"/>` +
    [70, 100].map((x) => `<path d="M${x} 52 L${x + 30} 118" stroke="${c[1]}" stroke-width="3" opacity=".7"/>`).join('') +
    `<path d="M220 120 L240 70 H256" stroke="${c[2]}" stroke-width="6" fill="none" stroke-linecap="round"/>` +
    [[80, 196], [190, 196]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="20" fill="none" stroke="${c[2]}" stroke-width="7"/><circle cx="${x}" cy="${y}" r="5" fill="${c[2]}"/>`).join('') + `<path d="M100 176 L80 196 M160 176 L190 196" stroke="${c[2]}" stroke-width="5"/>`),
  A('bb-footprints', 'Baby footprints', 'illustration', 200, 200, ['#e8a3b5'], ['footprints', 'feet', 'birth announcement', 'tiny feet', 'newborn'], (c) => {
    const foot = (x: number, y: number, flip: number) => `<g transform="translate(${x} ${y}) scale(${flip} 1)"><path d="M0 -40 C22 -40 28 -10 24 20 C20 46 6 56 -6 54 C-20 52 -22 36 -16 14 C-12 -2 -24 -40 0 -40 Z" fill="${c[0]}"/>` +
      [[-10, -54, 7], [3, -58, 6], [14, -54, 5], [22, -46, 4.5], [27, -36, 4]].map(([tx, ty, r]) => `<circle cx="${tx}" cy="${ty}" r="${r}" fill="${c[0]}"/>`).join('') + `</g>`;
    return foot(70, 110, -1) + foot(132, 96, 1);
  }),
  A('bb-mobile', 'Crib mobile', 'decoration', 300, 260, ['#d9c7b5', '#f6d27a', '#f7b8c8', '#a9d2f0', '#ffffff'], ['mobile', 'crib', 'nursery', 'stars', 'moon', 'clouds'], (c) => {
    let g = `<path d="M150 0 V30 M40 40 Q150 20 260 40" stroke="${dk(c[0], 0.3)}" stroke-width="4" fill="none"/>`;
    const items = [[50, 140, 'cloud'], [100, 180, 'star'], [150, 120, 'moon'], [200, 180, 'star'], [250, 140, 'cloud']] as const;
    items.forEach(([x, len, k], i) => {
      g += `<path d="M${x} ${36 - Math.abs(x - 150) * -0.05} V${len - 18}" stroke="${dk(c[0], 0.2)}" stroke-width="1.5"/>`;
      if (k === 'cloud') g += cloud(x, len, 0.3, c[4]);
      else if (k === 'star') g += `<polygon points="${starPts(x, len, 5, 20, 9)}" fill="${i % 2 ? c[1] : c[2]}" stroke-linejoin="round"/>`;
      else g += `<path d="M${x + 10} ${len - 30} C${x - 26} ${len - 24} ${x - 30} ${len + 24} ${x + 6} ${len + 30} C${x - 10} ${len + 14} ${x - 12} ${len - 14} ${x + 10} ${len - 30} Z" fill="${c[1]}"/>`;
    });
    return g;
  }),
  A('bb-flowers', 'Watercolour flowers', 'decoration', 300, 220, ['#f4b6c2', '#f7d6c6', '#e9a0b4', '#a8c3a0'], ['flowers', 'watercolour', 'watercolor', 'floral', 'girl', 'peony', 'sprinkle'], (c) => flowerBunch(c, 17)),
  A('bb-hearts', 'Little hearts', 'decoration', 300, 200, ['#f4a6c0', '#ffd0dc'], ['hearts', 'love', 'girl', 'confetti'], (c) => {
    const r = rng(29); let g = '';
    for (let i = 0; i < 16; i++) { const x = r() * 280 + 10, y = r() * 180 + 10, s = 5 + r() * 9; g += `<path d="M${f1(x)} ${f1(y + s * 0.8)} C${f1(x - s * 1.6)} ${f1(y - s * 0.4)} ${f1(x - s * 0.6)} ${f1(y - s * 1.4)} ${f1(x)} ${f1(y - s * 0.4)} C${f1(x + s * 0.6)} ${f1(y - s * 1.4)} ${f1(x + s * 1.6)} ${f1(y - s * 0.4)} ${f1(x)} ${f1(y + s * 0.8)} Z" fill="${i % 2 ? c[0] : c[1]}" opacity=".9"/>`; }
    return g;
  }),
  A('bb-stars', 'Pastel stars', 'decoration', 300, 200, ['#f6d27a', '#a9d2f0', '#f7b8c8'], ['stars', 'confetti', 'twinkle', 'neutral'], (c) => {
    const r = rng(31); let g = '';
    for (let i = 0; i < 16; i++) { const x = r() * 280 + 10, y = r() * 180 + 10, s = 5 + r() * 10; g += i % 4 === 3 ? sparkle(x, y, s, c[0]) : `<polygon points="${starPts(x, y, 5, s, s * 0.45)}" fill="${c[i % 3]}" stroke="${c[i % 3]}" stroke-width="2" stroke-linejoin="round"/>`; }
    return g;
  }),
  A('bb-frame', 'Scalloped frame', 'decoration', 400, 520, ['#e8c9b5', '#ffffff'], ['frame', 'border', 'scalloped', 'invitation', 'neutral'], (c) => {
    let g = `<rect x="20" y="20" width="360" height="480" rx="30" fill="none" stroke="${c[0]}" stroke-width="6"/>`;
    for (let i = 0; i < 18; i++) g += `<circle cx="${f1(30 + i * 20)}" cy="20" r="10" fill="${c[0]}"/><circle cx="${f1(30 + i * 20)}" cy="500" r="10" fill="${c[0]}"/>`;
    for (let i = 0; i < 24; i++) g += `<circle cx="20" cy="${f1(30 + i * 20)}" r="10" fill="${c[0]}"/><circle cx="380" cy="${f1(30 + i * 20)}" r="10" fill="${c[0]}"/>`;
    return g;
  }),
];

// ---------- backgrounds ----------
const softClouds = (W: number, H: number, u: number, seed: number, n: number, y0: number, y1: number, c = '#ffffff', o = 0.9) => {
  const r = rng(seed);
  let g = '';
  for (let i = 0; i < n; i++) { const x = r() * W, y = H * (y0 + r() * (y1 - y0)); g += `<g opacity="${o}">${cloud(x, y, (u / 600) * (0.6 + r() * 0.6), c)}</g>`; }
  return g;
};
const BGS = backgrounds('baby', ['baby', 'baby shower'], [
  { id: 'bb-bg-sky', name: 'Baby blue sky', colors: ['#d8ecfa', '#f5fbff'], tags: ['blue', 'sky', 'clouds', 'boy', 'its a boy'], draw: (c, W, H) => {
    const u = Math.min(W, H);
    return `<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c[0]}"/><stop offset="1" stop-color="${c[1]}"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#s)"/>` + softClouds(W, H, u, 3, 6, 0.05, 0.95);
  } },
  { id: 'bb-bg-blush', name: 'Blush pink', colors: ['#fde6ec', '#fff6f8', '#f7c6d6'], tags: ['pink', 'blush', 'girl', 'its a girl', 'hearts'], draw: (c, W, H) => {
    const u = Math.min(W, H), r = rng(8);
    let g = `<defs><radialGradient id="r" cx="50%" cy="45%" r="80%"><stop offset="0" stop-color="${c[1]}"/><stop offset="1" stop-color="${c[0]}"/></radialGradient></defs><rect width="${W}" height="${H}" fill="url(#r)"/>`;
    for (let i = 0; i < Math.round((W * H) / 22000); i++) { const x = r() * W, y = r() * H, s = u * (0.006 + r() * 0.008); g += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(s)}" fill="${c[2]}" opacity=".6"/>`; }
    return g;
  } },
  { id: 'bb-bg-sage', name: 'Sage & sand', colors: ['#eef0e6', '#c9d3bd', '#e6cdb5', '#d9876b'], tags: ['neutral', 'gender neutral', 'boho', 'sage', 'beige', 'arches'], draw: (c, W, H) => {
    const u = Math.min(W, H);
    let g = `<rect width="${W}" height="${H}" fill="${c[0]}"/>`;
    const arch = (cx: number, base: number, r: number, col: string) => `<path d="M${f1(cx - r)} ${f1(base)} V${f1(base - r * 0.6)} A${f1(r)} ${f1(r)} 0 0 1 ${f1(cx + r)} ${f1(base - r * 0.6)} V${f1(base)} Z" fill="${col}"/>`;
    g += arch(W * 0.08, H, u * 0.32, c[1]) + arch(W * 0.95, H, u * 0.26, c[2]);
    g += `<circle cx="${f1(W * 0.88)}" cy="${f1(u * 0.14)}" r="${f1(u * 0.09)}" fill="${c[2]}"/><circle cx="${f1(W * 0.1)}" cy="${f1(u * 0.12)}" r="${f1(u * 0.04)}" fill="${c[3]}" opacity=".6"/>`;
    return g;
  } },
  { id: 'bb-bg-night', name: 'Twinkle night', colors: ['#1f2b4d', '#33467a', '#f6d27a'], tags: ['night', 'stars', 'moon', 'twinkle twinkle little star', 'navy', 'boy', 'neutral'], draw: (c, W, H) => {
    const u = Math.min(W, H), r = rng(12);
    let g = `<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c[0]}"/><stop offset="1" stop-color="${c[1]}"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#s)"/>`;
    for (let i = 0; i < Math.round((W * H) / 16000); i++) { const x = r() * W, y = r() * H, s = u * (0.004 + r() * 0.01); g += i % 3 ? `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(s * 0.5)}" fill="#fff" opacity=".7"/>` : `<polygon points="${starPts(x, y, 5, s * 1.4, s * 0.6)}" fill="${c[2]}" opacity=".9"/>`; }
    return g + softClouds(W, H, u, 5, 4, 0.82, 1.02, '#ffffff', 0.25);
  } },
  { id: 'bb-bg-watercolor', name: 'Watercolour wash', colors: ['#fffaf5', '#f7c6d6', '#c8dff2', '#f6e3a1'], tags: ['watercolour', 'watercolor', 'pastel', 'soft', 'girl', 'sprinkle'], draw: (c, W, H) => {
    const u = Math.min(W, H), r = rng(21);
    let g = `<rect width="${W}" height="${H}" fill="${c[0]}"/>`;
    const blob = (x: number, y: number, R: number, col: string) => { let b = ''; for (let i = 0; i < 9; i++) { const a = r() * Math.PI * 2, d = r() * R * 0.5; b += `<circle cx="${f1(x + Math.cos(a) * d)}" cy="${f1(y + Math.sin(a) * d)}" r="${f1(R * (0.4 + r() * 0.4))}" fill="${col}" opacity=".16"/>`; } return b; };
    return g + blob(0, 0, u * 0.5, c[1]) + blob(W, H, u * 0.55, c[2]) + blob(W, 0, u * 0.3, c[3]) + blob(0, H, u * 0.3, c[1]);
  } },
]);

ASSETS.push(...BGS);
