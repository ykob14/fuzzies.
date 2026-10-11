/**
 * Hanukkah collection — original vector artwork drawn in code for Fuzzies (licence: original Fuzzies artwork).
 * Accuracy notes: every hanukkiyah has nine lights — eight in a row at one height plus the shamash (helper candle)
 * set apart higher in the middle; the seven-branch Temple menorah is never used. Dreidels carry the Hebrew letters
 * נ ג ה ש (nun, gimel, he, shin — "a great miracle happened there"), drawn as shapes so they never depend on fonts.
 */
import type { AssetDef } from '../index';
import { asset, backgrounds, bokeh, davidStar, dk, f1, flame, frame, gift, glowDef, lightString, lt, mix, rng, sparkle, stars } from '../draw';

const A = asset('hanukkah', ['hanukkah', 'chanukah', 'hanukah', 'chanukkah', 'חנוכה', 'jewish', 'festival of lights', 'holiday']);

// ---------- Hebrew letters as strokes (40×50 box) ----------
const LETTER: Record<string, string> = {
  nun: 'M17 7 H24 Q27 7 27 10 V44 H9',
  gimel: 'M12 7 H22 Q25 7 25 10 V44 M25 31 L13 44',
  he: 'M7 7 H31 Q34 7 34 10 V44 M12 20 V44',
  shin: 'M8 7 Q8 40 20 44 Q33 44 34 30 V7 M21 8 Q21 28 21 44',
};
const letter = (name: string, color: string, sw = 5.5) => `<path d="${LETTER[name]}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`;

// ---------- drawings ----------
/** Classic hanukkiyah: four nested arms each side → eight lights in a row, shamash raised in the centre. */
function hanukkiyah(id: string, metal: string, candle: string, fire: string, lit = true): string {
  const cx = 150, cupY = 120, shY = 88;
  let g = `<defs><linearGradient id="${id}m" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${lt(metal, 0.35)}"/><stop offset=".5" stop-color="${metal}"/><stop offset="1" stop-color="${dk(metal, 0.3)}"/></linearGradient>${glowDef(`${id}f`, fire, 0.55)}</defs>`;
  const xs = [-120, -90, -60, -30, 30, 60, 90, 120];
  if (lit) for (const dx of xs) g += `<circle cx="${cx + dx}" cy="${cupY - 52}" r="26" fill="url(#${id}f)"/>`;
  if (lit) g += `<circle cx="${cx}" cy="${shY - 52}" r="28" fill="url(#${id}f)"/>`;
  // arms (elliptical arcs), stem, base
  for (const r of [30, 60, 90, 120]) g += `<path d="M${cx - r} ${cupY} A${r} ${r * 0.7} 0 0 0 ${cx + r} ${cupY}" fill="none" stroke="url(#${id}m)" stroke-width="7" stroke-linecap="round"/>`;
  g += `<rect x="${cx - 5}" y="${shY}" width="10" height="${232 - shY}" rx="4" fill="url(#${id}m)"/>`;
  g += `<path d="M${cx - 10} 206 Q${cx} 196 ${cx + 10} 206 Z M${cx - 8} 160 Q${cx} 152 ${cx + 8} 160 Z" fill="${metal}"/>`;
  g += `<path d="M${cx - 16} 232 L${cx + 16} 232 L${cx + 44} 250 L${cx - 44} 250 Z" fill="url(#${id}m)"/><rect x="${cx - 58}" y="248" width="116" height="10" rx="4" fill="${dk(metal, 0.15)}"/>`;
  // cups + candles
  const cup = (x: number, y: number, w: number) => `<path d="M${x - w} ${y - 6} H${x + w} L${x + w * 0.6} ${y + 4} H${x - w * 0.6} Z" fill="url(#${id}m)"/>`;
  const cand = (x: number, y: number, h: number) => {
    let s = `<rect x="${x - 5}" y="${y - h}" width="10" height="${h}" rx="2" fill="${candle}"/><rect x="${x + 1}" y="${y - h}" width="4" height="${h}" rx="2" fill="${dk(candle, 0.12)}"/>`;
    for (let k = 1; k < 4; k++) s += `<path d="M${x - 5} ${y - h + k * (h / 4)} L${x + 5} ${y - h + k * (h / 4) - 5}" stroke="${lt(candle, 0.55)}" stroke-width="2" opacity=".8"/>`;
    s += `<path d="M${x} ${y - h} V${y - h - 4}" stroke="#3a3030" stroke-width="1.6"/>`;
    if (lit) s += flame(x, y - h - 26, 22, fire);
    return s;
  };
  for (const dx of xs) g += cand(cx + dx, cupY - 6, 34) + cup(cx + dx, cupY, 9);
  g += cand(cx, shY - 6, 34) + cup(cx, shY, 10);
  return g;
}

/** Modern oil hanukkiyah: a bar of eight oil cups, shamash raised on its own post. */
function oilHanukkiyah(id: string, metal: string, fire: string): string {
  let g = `<defs><linearGradient id="${id}m" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${lt(metal, 0.4)}"/><stop offset="1" stop-color="${dk(metal, 0.25)}"/></linearGradient>${glowDef(`${id}f`, fire, 0.55)}</defs>`;
  const xs = [26, 62, 98, 134, 186, 222, 258, 294];
  for (const x of xs) g += `<circle cx="${x}" cy="128" r="24" fill="url(#${id}f)"/>`;
  g += `<circle cx="160" cy="70" r="26" fill="url(#${id}f)"/>`;
  g += `<rect x="10" y="150" width="300" height="10" rx="5" fill="url(#${id}m)"/><rect x="155" y="96" width="10" height="64" rx="4" fill="url(#${id}m)"/>`;
  g += `<path d="M40 160 L28 196 M280 160 L292 196" stroke="${metal}" stroke-width="8" stroke-linecap="round"/><rect x="10" y="194" width="300" height="8" rx="4" fill="${dk(metal, 0.2)}"/>`;
  const bowl = (x: number, y: number) => `<path d="M${x - 15} ${y} Q${x} ${y + 20} ${x + 15} ${y} Z" fill="url(#${id}m)"/><ellipse cx="${x}" cy="${y}" rx="15" ry="4" fill="${dk(metal, 0.15)}"/><ellipse cx="${x}" cy="${y}" rx="11" ry="2.6" fill="${mix(fire, '#c98a1a', 0.5)}"/>`;
  for (const x of xs) g += bowl(x, 144) + flame(x, 112, 26, fire);
  g += bowl(160, 92) + flame(160, 60, 28, fire);
  return g;
}

/** A dreidel in three-quarter view with Hebrew letters on two faces. */
function dreidel(id: string, x: number, y: number, s: number, rot: number, body: string, ink: string, handle: string, front: string, side: string): string {
  let g = `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${rot} 80 100) scale(${s})">`;
  g += `<defs><linearGradient id="${id}f" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${lt(body, 0.25)}"/><stop offset="1" stop-color="${body}"/></linearGradient></defs>`;
  g += `<path d="M66 18 Q66 12 74 12 Q82 12 82 18 V44 H66 Z" fill="${handle}"/><path d="M76 14 Q82 14 82 18 V44 H76 Z" fill="${dk(handle, 0.25)}"/>`;
  g += `<path d="M30 52 L100 52 L130 40 L60 40 Z" fill="${lt(body, 0.4)}"/>`; // top
  g += `<path d="M30 52 H100 V132 H30 Z" fill="url(#${id}f)"/>`; // front
  g += `<path d="M100 52 L130 40 V120 L100 132 Z" fill="${dk(body, 0.28)}"/>`; // side
  g += `<path d="M30 132 H100 L66 190 Z" fill="${dk(body, 0.1)}"/><path d="M100 132 L130 120 L66 190 Z" fill="${dk(body, 0.38)}"/>`; // point
  g += `<g transform="translate(45 67) scale(1)">${letter(front, ink)}</g>`;
  g += `<g transform="matrix(.42 -.17 0 1 105 68)">${letter(side, dk(ink, 0.1), 6)}</g>`;
  g += `<path d="M36 58 V126" stroke="#fff" stroke-width="3" opacity=".35"/>`;
  return g + `</g>`;
}

function coin(id: string, x: number, y: number, r: number, metal: string, tilt = 0.45, mark: 'star' | 'menorah' = 'star'): string {
  const ry = r * tilt;
  let g = `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${lt(metal, 0.45)}"/><stop offset=".6" stop-color="${metal}"/><stop offset="1" stop-color="${dk(metal, 0.3)}"/></linearGradient></defs>`;
  g += `<ellipse cx="${f1(x)}" cy="${f1(y + r * 0.1)}" rx="${f1(r)}" ry="${f1(ry)}" fill="${dk(metal, 0.35)}"/><ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(r)}" ry="${f1(ry)}" fill="url(#${id})"/><ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(r * 0.82)}" ry="${f1(ry * 0.82)}" fill="none" stroke="${dk(metal, 0.2)}" stroke-width="${f1(r * 0.05)}"/>`;
  g += `<g transform="translate(${f1(x)} ${f1(y)}) scale(1 ${tilt})">`;
  g += mark === 'star' ? `<path d="${davidStar(0, 0, r * 0.45)}" fill="none" stroke="${dk(metal, 0.3)}" stroke-width="${f1(r * 0.07)}" stroke-linejoin="round"/>`
    : `<path d="M${f1(-r * 0.4)} ${f1(-r * 0.15)} A${f1(r * 0.4)} ${f1(r * 0.3)} 0 0 0 ${f1(r * 0.4)} ${f1(-r * 0.15)} M${f1(-r * 0.2)} ${f1(-r * 0.15)} A${f1(r * 0.2)} ${f1(r * 0.16)} 0 0 0 ${f1(r * 0.2)} ${f1(-r * 0.15)} M0 ${f1(-r * 0.3)} V${f1(r * 0.35)} M${f1(-r * 0.18)} ${f1(r * 0.35)} H${f1(r * 0.18)}" fill="none" stroke="${dk(metal, 0.3)}" stroke-width="${f1(r * 0.06)}" stroke-linecap="round"/>`;
  return g + `</g>`;
}

function starOfDavid(cx: number, cy: number, r: number, color: string, sw: number, inner = true): string {
  let g = `<path d="${davidStar(cx, cy, r)}" fill="none" stroke="${color}" stroke-width="${f1(sw)}" stroke-linejoin="round"/>`;
  if (inner) g += `<path d="${davidStar(cx, cy, r * 0.74)}" fill="none" stroke="${color}" stroke-width="${f1(sw * 0.3)}" stroke-linejoin="round" opacity=".7"/>`;
  return g;
}

// ---------- the collection ----------
const ILLUSTRATIONS: AssetDef[] = [
  A('hk-menorah', 'Hanukkiyah (menorah)', 'illustration', 300, 262, ['#d4a940', '#4f86d9', '#ffb238'], ['menorah', 'hanukkiyah', 'hanukkia', 'candles', 'lights', 'eighth night', 'shamash', 'gold'], (c) => hanukkiyah('m', c[0], c[1], c[2])),
  A('hk-menorah-silver', 'Silver hanukkiyah', 'illustration', 300, 262, ['#c3cad6', '#ffffff', '#ffb238'], ['menorah', 'hanukkiyah', 'silver', 'candles', 'white candles'], (c) => hanukkiyah('s', c[0], c[1], c[2])),
  A('hk-menorah-oil', 'Oil hanukkiyah', 'illustration', 320, 206, ['#c3cad6', '#ffb238'], ['menorah', 'hanukkiyah', 'oil', 'modern', 'lamp', 'miracle of oil'], (c) => oilHanukkiyah('o', c[0], c[1])),
  A('hk-window', 'Hanukkiyah in the window', 'scene', 300, 340, ['#1b2d5a', '#d4a940', '#ffb238'], ['window', 'menorah', 'night', 'snow', 'home', 'scene'], (c) =>
    `<defs><linearGradient id="ws" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${dk(c[0], 0.35)}"/><stop offset="1" stop-color="${lt(c[0], 0.15)}"/></linearGradient></defs>` +
    `<rect x="30" y="20" width="240" height="240" fill="url(#ws)"/>` + `<g transform="translate(30 20)">${stars(240, 160, '#ffffff', 40, 6, 2.2)}</g>` +
    `<path d="M30 220 Q110 196 190 210 Q240 202 270 214 V260 H30 Z" fill="${lt(c[0], 0.75)}"/>` +
    `<path d="M30 20 H270 V260 H30 Z M150 20 V200 M30 120 H270" fill="none" stroke="#f3eee4" stroke-width="12"/>` +
    `<g transform="translate(64 120) scale(.58)">${hanukkiyah('w', c[1], '#ffffff', c[2])}</g>` +
    `<rect x="14" y="258" width="272" height="20" rx="4" fill="#e9e2d2"/><rect x="14" y="276" width="272" height="8" fill="#cfc6b2"/>` +
    `<path d="M0 0 H70 C60 80 70 180 40 330 H0 Z" fill="#7f1d3a"/><path d="M300 0 H230 C240 80 230 180 260 330 H300 Z" fill="#7f1d3a"/><path d="M20 0 C24 100 30 220 22 330 M280 0 C276 100 270 220 278 330" stroke="#5c1229" stroke-width="5" fill="none"/>`),
  A('hk-dreidel', 'Dreidel', 'illustration', 160, 200, ['#2f6fd6', '#ffffff', '#d4a940'], ['dreidel', 'sevivon', 'game', 'spin', 'nun', 'gimel', 'hebrew letters', 'kids'], (c) => dreidel('d', 0, 0, 1, -8, c[0], c[1], c[2], 'nun', 'gimel')),
  A('hk-dreidels', 'Spinning dreidels', 'illustration', 320, 220, ['#2f6fd6', '#d4a940', '#ffffff'], ['dreidels', 'sevivon', 'game', 'spin', 'kids', 'family'], (c) =>
    dreidel('a', 10, 20, 0.95, -14, c[0], c[2], c[1], 'he', 'shin') + dreidel('b', 160, 10, 1, 12, c[1], dk(c[0], 0.3), c[0], 'gimel', 'nun') +
    `<path d="M156 210 Q200 220 250 206 M150 196 Q190 204 236 194" stroke="${c[1]}" stroke-width="3" fill="none" stroke-linecap="round" opacity=".6"/>` + sparkle(150, 40, 10, c[1]) + sparkle(300, 60, 7, c[1])),
  A('hk-gelt', 'Chanukah gelt', 'illustration', 220, 170, ['#d4a940', '#c3cad6'], ['gelt', 'coins', 'chocolate', 'gold', 'money', 'kids'], (c) =>
    coin('a', 60, 128, 42, c[1]) + coin('b', 150, 132, 46, c[0], 0.42, 'menorah') + coin('c', 104, 112, 44, c[0]) + coin('d', 76, 88, 38, c[0], 0.5, 'menorah') + coin('e', 150, 86, 40, c[1]) +
    `<g transform="rotate(-24 120 52)">${coin('f', 120, 52, 38, c[0], 0.9)}</g>` + `<ellipse cx="110" cy="160" rx="96" ry="6" fill="#000" opacity=".15"/>`),
  A('hk-star', 'Star of David', 'illustration', 200, 200, ['#2f6fd6'], ['star of david', 'magen david', 'star', 'jewish'], (c) => starOfDavid(100, 104, 86, c[0], 10)),
  A('hk-star-gold', 'Golden Star of David', 'illustration', 200, 200, ['#d4a940', '#fff3c4'], ['star of david', 'magen david', 'gold', 'glow'], (c) =>
    `<defs>${glowDef('g', c[1], 0.5)}<linearGradient id="sg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${lt(c[0], 0.4)}"/><stop offset="1" stop-color="${dk(c[0], 0.25)}"/></linearGradient></defs><circle cx="100" cy="102" r="98" fill="url(#g)"/><path d="${davidStar(100, 104, 84)}" fill="none" stroke="url(#sg)" stroke-width="14" stroke-linejoin="round"/>`),
  A('hk-stars', 'Stars & sparkles', 'decoration', 300, 200, ['#d4a940', '#ffffff'], ['stars', 'star of david', 'sparkles', 'pattern', 'confetti'], (c) => {
    const r = rng(12); let g = '';
    for (let i = 0; i < 16; i++) { const x = r() * 300, y = r() * 200; g += i % 3 ? sparkle(x, y, 3 + r() * 6, c[1], 0.8) : starOfDavid(x, y, 8 + r() * 10, c[0], 2.4, false); }
    return g;
  }),
  A('hk-sufganiyah', 'Sufganiyot', 'illustration', 220, 160, ['#d99a52', '#ffffff', '#c8102e'], ['sufganiyot', 'sufganiyah', 'doughnut', 'jelly doughnut', 'food', 'treat'], (c) => {
    const d = (x: number, y: number, s: number) => `<g transform="translate(${x} ${y}) scale(${s})"><defs><radialGradient id="sd${x}" cx="40%" cy="30%"><stop offset="0" stop-color="${lt(c[0], 0.3)}"/><stop offset="1" stop-color="${dk(c[0], 0.3)}"/></radialGradient></defs><ellipse cx="0" cy="0" rx="62" ry="44" fill="url(#sd${x})"/><path d="M-62 0 Q0 22 62 0" stroke="${lt(c[0], 0.55)}" stroke-width="8" fill="none" opacity=".8"/><path d="M-52 -22 Q-30 -46 0 -44 Q34 -46 54 -20 Q30 -30 0 -28 Q-30 -30 -52 -22 Z" fill="${c[1]}" opacity=".95"/>${[[-30, -30], [-10, -36], [16, -34], [36, -26], [-40, -18], [24, -20]].map(([x2, y2]) => `<circle cx="${x2}" cy="${y2}" r="3" fill="${c[1]}"/>`).join('')}<path d="M-10 -40 C-6 -52 12 -52 14 -40 C14 -32 -8 -32 -10 -40 Z" fill="${c[2]}"/><circle cx="-2" cy="-44" r="2.6" fill="#fff" opacity=".6"/></g>`;
    return `<ellipse cx="110" cy="132" rx="104" ry="20" fill="#e9eef7"/><ellipse cx="110" cy="128" rx="96" ry="16" fill="#fff"/>` + d(72, 102, 0.8) + d(148, 96, 0.9);
  }),
  A('hk-latkes', 'Latkes', 'illustration', 220, 160, ['#d9a24a', '#ffffff', '#f0c98a'], ['latkes', 'potato pancakes', 'food', 'applesauce', 'sour cream', 'dinner'], (c) => {
    const latke = (y: number, w: number) => { const r = rng(y); let d = ''; for (let i = 0; i <= 24; i++) { const a = (i / 24) * Math.PI * 2, rr = 1 + (r() - 0.5) * 0.12; d += `${i ? 'L' : 'M'}${f1(100 + Math.cos(a) * w * rr)} ${f1(y + Math.sin(a) * w * 0.32 * rr)} `; } return `<path d="${d}Z" fill="${c[0]}"/><path d="${d}Z" fill="none" stroke="${dk(c[0], 0.3)}" stroke-width="3"/>` + Array.from({ length: 9 }, (_, i) => `<path d="M${f1(100 + (r() - 0.5) * w * 1.4)} ${f1(y + (r() - 0.5) * w * 0.3)} l${f1(6 + r() * 6)} ${f1((r() - 0.5) * 4)}" stroke="${dk(c[0], 0.25)}" stroke-width="2" stroke-linecap="round"/>`).join(''); };
    return `<ellipse cx="110" cy="132" rx="104" ry="22" fill="#e9eef7"/><ellipse cx="110" cy="128" rx="96" ry="17" fill="#fff"/>` + `<g transform="translate(-6 0)">${latke(118, 66)}${latke(102, 62)}${latke(86, 58)}</g>` +
      `<path d="M150 76 Q176 40 200 76 Q176 88 150 76 Z" fill="${c[1]}"/><path d="M164 56 Q176 44 186 58" stroke="#fff" stroke-width="3" fill="none"/>` +
      `<ellipse cx="44" cy="70" rx="30" ry="11" fill="${c[2]}" stroke="${dk(c[2], 0.25)}" stroke-width="2"/>` + `<path d="M150 70 Q160 66 170 70" stroke="#5f9f4a" stroke-width="4" stroke-linecap="round"/>`;
  }),
  A('hk-oil-jug', 'Jug of oil', 'illustration', 140, 180, ['#b9673f', '#e8c46a'], ['oil', 'jug', 'cruse', 'miracle', 'pach shemen', 'story'], (c) =>
    `<defs><linearGradient id="oj" x1="0" x2="1"><stop offset="0" stop-color="${lt(c[0], 0.2)}"/><stop offset="1" stop-color="${dk(c[0], 0.3)}"/></linearGradient></defs>` +
    `<path d="M96 66 C130 66 132 112 100 116" stroke="${dk(c[0], 0.15)}" stroke-width="10" fill="none"/><path d="M50 30 H84 V52 C110 62 118 92 114 122 C110 156 92 170 67 170 C42 170 24 156 20 122 C16 92 24 62 50 52 Z" fill="url(#oj)"/>` +
    `<path d="M46 24 H88 V34 H46 Z" fill="${dk(c[0], 0.2)}"/><path d="M30 100 H104 M28 116 H106" stroke="${c[1]}" stroke-width="4"/><path d="M36 74 C30 94 30 120 40 144" stroke="#fff" stroke-width="5" fill="none" opacity=".35" stroke-linecap="round"/>` +
    `<path d="M67 4 C74 14 74 20 67 22 C60 20 60 14 67 4 Z" fill="${c[1]}"/>`),
  A('hk-lights', 'Blue & white lights', 'decoration', 420, 110, ['#4f86d9', '#ffffff', '#d4a940'], ['lights', 'string lights', 'festival of lights', 'border', 'garland'], (c) => lightString('l', 0, 420, 12, 18, 11, '#3a4660', c)),
  A('hk-gifts', 'Hanukkah gifts', 'illustration', 320, 220, ['#2f6fd6', '#ffffff', '#c3cad6'], ['gifts', 'presents', 'eight nights', 'boxes'], (c) =>
    gift('a', 20, 92, 120, 120, c[1], c[0], lt(c[0], 0.5)) + gift('c', 196, 112, 104, 100, c[2], c[0]) + gift('b', 98, 56, 140, 156, c[0], c[2], c[1])),
  A('hk-frame', 'Star of David frame', 'decoration', 400, 520, ['#d4a940'], ['frame', 'border', 'elegant', 'invitation', 'star of david'], (c) =>
    frame(400, 520, c[0], 16, (k) => `<path d="${davidStar(36, 36, 18)}" fill="none" stroke="${k}" stroke-width="2.6" stroke-linejoin="round"/><path d="M62 30 H120 M30 62 V120" stroke="${k}" stroke-width="2"/>`)),
  A('hk-banner', 'Ribbon banner', 'decoration', 420, 110, ['#1f4fa8', '#d4a940'], ['banner', 'ribbon', 'label', 'title'], (c) =>
    `<path d="M50 32 L0 32 L20 60 L0 88 L70 88 Z M370 32 L420 32 L400 60 L420 88 L350 88 Z" fill="${dk(c[0], 0.3)}"/><path d="M40 16 H380 V94 H40 Z" fill="${c[0]}"/><path d="M40 24 H380 M40 86 H380" stroke="${c[1]}" stroke-width="3"/>`),
  A('hk-candles', 'Candle glow', 'illustration', 180, 200, ['#ffffff', '#4f86d9', '#ffb238'], ['candles', 'candle', 'light', 'glow', 'blessing'], (c) => {
    let g = `<defs>${glowDef('cg', c[2], 0.5)}</defs>`;
    for (const [x, top, w, col] of [[40, 70, 30, c[0]], [80, 40, 32, c[1]], [124, 86, 28, c[0]]] as [number, number, number, string][]) {
      g += `<circle cx="${x + w / 2}" cy="${top - 18}" r="34" fill="url(#cg)"/><rect x="${x}" y="${top}" width="${w}" height="${190 - top}" rx="4" fill="${col}"/><rect x="${x + w * 0.66}" y="${top}" width="${w * 0.34}" height="${190 - top}" rx="3" fill="${dk(col, 0.12)}"/>`;
      g += `<path d="M${x + w / 2} ${top} V${top - 6}" stroke="#3a3030" stroke-width="2"/>` + flame(x + w / 2, top - 36, 30, c[2]);
    }
    return g + `<ellipse cx="90" cy="192" rx="80" ry="5" fill="#000" opacity=".15"/>`;
  }),
];

// ---------- backgrounds ----------
const BGS = backgrounds('hanukkah', ['hanukkah', 'chanukah', 'hanukah', 'חנוכה', 'jewish', 'holiday'], [
  { id: 'hk-bg-night', name: 'Festival of lights', colors: ['#0b1838', '#1f3f86', '#e8c46a'], tags: ['night', 'blue', 'lights', 'stars', 'gold'], draw: (c, W, H) =>
    `<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c[0]}"/><stop offset="1" stop-color="${c[1]}"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#s)"/>` +
    stars(W, H * 0.8, '#ffffff', Math.round((W * H) / 14000), 7, 2.4) + `<g transform="translate(0 ${f1(H * 0.55)})">${bokeh(W, H * 0.45, [c[2], lt(c[2], 0.5)], Math.round((W * H) / 60000) + 6, 3, Math.min(W, H) * 0.07, 'bk')}</g>` },
  { id: 'hk-bg-silver', name: 'Silver & white', colors: ['#ffffff', '#dfe7f3', '#9fb3d1'], tags: ['silver', 'white', 'light', 'elegant', 'pattern'], draw: (c, W, H) =>
    `<defs><linearGradient id="s" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c[0]}"/><stop offset="1" stop-color="${c[1]}"/></linearGradient><pattern id="p" width="120" height="120" patternUnits="userSpaceOnUse"><path d="${davidStar(60, 60, 22)}" fill="none" stroke="${c[2]}" stroke-width="1.6" opacity=".35"/><circle cx="0" cy="0" r="2.5" fill="${c[2]}" opacity=".35"/><circle cx="120" cy="120" r="2.5" fill="${c[2]}" opacity=".35"/></pattern></defs><rect width="${W}" height="${H}" fill="url(#s)"/><rect width="${W}" height="${H}" fill="url(#p)"/>` },
  { id: 'hk-bg-pattern', name: 'Royal blue stars', colors: ['#1f4fa8', '#ffffff', '#d4a940'], tags: ['pattern', 'blue', 'star of david', 'repeat'], draw: (c, W, H) =>
    `<defs><pattern id="p" width="160" height="140" patternUnits="userSpaceOnUse"><path d="${davidStar(40, 40, 18)}" fill="none" stroke="${c[1]}" stroke-width="2" opacity=".35"/><path d="${davidStar(120, 110, 12)}" fill="none" stroke="${c[2]}" stroke-width="2" opacity=".55"/><circle cx="120" cy="30" r="3" fill="${c[1]}" opacity=".4"/><circle cx="40" cy="110" r="2" fill="${c[2]}" opacity=".6"/></pattern><radialGradient id="r" cx="50%" cy="45%" r="75%"><stop offset="0" stop-color="${lt(c[0], 0.12)}"/><stop offset="1" stop-color="${dk(c[0], 0.3)}"/></radialGradient></defs><rect width="${W}" height="${H}" fill="url(#r)"/><rect width="${W}" height="${H}" fill="url(#p)"/>` },
  { id: 'hk-bg-gold', name: 'Navy & gold', colors: ['#0d1b3d', '#1b3266', '#e8c46a'], tags: ['navy', 'gold', 'luxury', 'bokeh', 'elegant'], draw: (c, W, H) =>
    `<defs><radialGradient id="r" cx="50%" cy="40%" r="80%"><stop offset="0" stop-color="${c[1]}"/><stop offset="1" stop-color="${c[0]}"/></radialGradient></defs><rect width="${W}" height="${H}" fill="url(#r)"/>` + bokeh(W, H, [c[2], lt(c[2], 0.4)], Math.round((W * H) / 26000), 21, Math.min(W, H) * 0.07, 'bk') + stars(W, H, lt(c[2], 0.3), Math.round((W * H) / 26000), 4, 2.2) },
  { id: 'hk-bg-modern', name: 'Modern sky blue', colors: ['#e8f1ff', '#bcd6ff', '#2f6fd6'], tags: ['modern', 'light', 'blue', 'playful', 'confetti'], draw: (c, W, H) => {
    const r = rng(8), u = Math.min(W, H);
    let g = `<rect width="${W}" height="${H}" fill="${c[0]}"/><circle cx="${W * 0.9}" cy="${H * 0.08}" r="${u * 0.4}" fill="${c[1]}" opacity=".7"/><circle cx="${W * 0.05}" cy="${H * 0.95}" r="${u * 0.35}" fill="${c[1]}" opacity=".6"/>`;
    for (let i = 0; i < Math.round((W * H) / 24000); i++) { const x = r() * W, y = r() * H; g += i % 4 ? `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(u * 0.012)}" height="${f1(u * 0.03)}" rx="3" fill="${i % 2 ? c[2] : '#e8c46a'}" opacity=".7" transform="rotate(${f1(r() * 180)} ${f1(x)} ${f1(y)})"/>` : `<path d="${davidStar(x, y, u * 0.018)}" fill="none" stroke="${c[2]}" stroke-width="2" opacity=".6"/>`; }
    return g;
  } },
]);

export const ASSETS: AssetDef[] = [...ILLUSTRATIONS, ...BGS];
