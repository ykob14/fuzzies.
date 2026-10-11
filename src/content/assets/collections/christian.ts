/**
 * Christian celebrations collection — original vector artwork drawn in code for Fuzzies (licence: original Fuzzies artwork).
 * Symbolism: Easter — the empty cross at sunrise, the empty tomb with the stone rolled away, white Easter lilies, the lamb,
 * plus the familiar spring customs (decorated eggs, bunny, chicks, basket). Palm Sunday — palm branches. Good Friday — the
 * crown of thorns. Advent — the wreath with four candles (three purple, one rose) and the white Christ candle. Epiphany —
 * the star and the three crowns of the Magi. Pentecost / Confirmation — the descending dove with a flame. Baptism — the
 * scallop shell with water. First Communion — chalice and host. No figures or faces of holy persons are depicted.
 */
import type { AssetDef } from '../index';
import { asset, backgrounds, blossom, bokeh, dk, f1, flame, frame, glowDef, lt, mix, rng, sparkle, starPts, stars } from '../draw';

const A = asset('christian', ['christian', 'church', 'faith']);
const EASTER = ['easter', 'he is risen', 'resurrection', 'pascha', 'pâques', 'pascua', 'ostern', 'spring'];

// ---------- drawings ----------
function cross(id: string, cx: number, top: number, h: number, c: string): string {
  const w = h * 0.12, arm = h * 0.6, ay = top + h * 0.26;
  return `<defs><linearGradient id="${id}" x1="0" x2="1"><stop offset="0" stop-color="${lt(c, 0.35)}"/><stop offset=".5" stop-color="${c}"/><stop offset="1" stop-color="${dk(c, 0.3)}"/></linearGradient></defs>` +
    `<rect x="${f1(cx - w / 2)}" y="${f1(top)}" width="${f1(w)}" height="${f1(h)}" rx="${f1(w * 0.12)}" fill="url(#${id})"/><rect x="${f1(cx - arm / 2)}" y="${f1(ay)}" width="${f1(arm)}" height="${f1(w)}" rx="${f1(w * 0.12)}" fill="url(#${id})"/>` +
    `<rect x="${f1(cx - w / 2 + w * 0.15)}" y="${f1(top + w * 0.2)}" width="${f1(w * 0.18)}" height="${f1(h - w * 0.4)}" fill="#fff" opacity=".3"/>`;
}
function lily(x: number, y: number, s: number, petal: string, stem: string, rot = 0): string {
  let g = `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${rot}) scale(${s})"><path d="M0 0 C-4 60 0 120 -2 180" stroke="${stem}" stroke-width="6" fill="none"/><path d="M-2 110 C-40 86 -54 60 -50 40 C-30 60 -14 82 -2 110 Z" fill="${stem}"/><path d="M0 140 C30 120 44 100 44 82 C26 96 12 116 0 140 Z" fill="${dk(stem, 0.12)}"/>`;
  // an open lily seen from the front: six broad pointed petals around a green throat, with stamens
  for (let i = 0; i < 6; i++) {
    const a = i * 60 + (i % 2 ? 30 : 0) * 0 + 30, k = i % 2 ? 0.08 : 0;
    g += `<g transform="rotate(${a})"><path d="M0 0 C22 -14 26 -44 4 -78 C2 -80 -2 -80 -4 -78 C-26 -44 -22 -14 0 0 Z" fill="${dk(petal, k)}" stroke="${dk(petal, 0.16)}" stroke-width="1.5"/><path d="M0 -6 C2 -30 1 -52 0 -70" stroke="${dk(petal, 0.18)}" stroke-width="1.6" fill="none"/></g>`;
  }
  g += `<circle cx="0" cy="0" r="12" fill="${mix(petal, stem, 0.45)}"/>`;
  for (let i = 0; i < 6; i++) { const a = ((i * 60 + 10) * Math.PI) / 180, ex = Math.cos(a) * 30, ey = Math.sin(a) * 30; g += `<path d="M0 0 L${f1(ex)} ${f1(ey)}" stroke="#c7a02c" stroke-width="2"/><ellipse cx="${f1(ex)}" cy="${f1(ey)}" rx="5" ry="2.6" fill="#d98a1e" transform="rotate(${f1((a * 180) / Math.PI)} ${f1(ex)} ${f1(ey)})"/>`; }
  return g + `</g>`;
}
function egg(id: string, x: number, y: number, s: number, base: string, a: string, b: string, kind: number, rot = 0): string {
  let g = `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${rot}) scale(${s})"><defs><clipPath id="${id}c"><path d="M0 -60 C34 -60 46 -10 46 14 C46 44 26 60 0 60 C-26 60 -46 44 -46 14 C-46 -10 -34 -60 0 -60 Z"/></clipPath><radialGradient id="${id}" cx="36%" cy="30%" r="80%"><stop offset="0" stop-color="${lt(base, 0.35)}"/><stop offset=".6" stop-color="${base}"/><stop offset="1" stop-color="${dk(base, 0.2)}"/></radialGradient></defs>`;
  g += `<ellipse cx="0" cy="62" rx="40" ry="5" fill="#000" opacity=".12"/><path d="M0 -60 C34 -60 46 -10 46 14 C46 44 26 60 0 60 C-26 60 -46 44 -46 14 C-46 -10 -34 -60 0 -60 Z" fill="url(#${id})"/><g clip-path="url(#${id}c)">`;
  if (kind === 0) g += `<path d="M-50 -6 L-38 -18 L-26 -6 L-14 -18 L-2 -6 L10 -18 L22 -6 L34 -18 L50 -6" stroke="${a}" stroke-width="6" fill="none"/><rect x="-50" y="10" width="100" height="10" fill="${b}"/><path d="M-50 34 L-38 22 L-26 34 L-14 22 L-2 34 L10 22 L22 34 L34 22 L50 34" stroke="${a}" stroke-width="6" fill="none"/>`;
  else if (kind === 1) { for (let i = 0; i < 5; i++) for (let j = 0; j < 4; j++) g += `<circle cx="${-36 + j * 24 + (i % 2) * 12}" cy="${-44 + i * 24}" r="6" fill="${(i + j) % 2 ? a : b}"/>`; }
  else g += `<rect x="-50" y="-20" width="100" height="16" fill="${a}"/><rect x="-50" y="14" width="100" height="16" fill="${a}"/>` + [-30, -10, 10, 30].map((px) => blossom(px, 5, 8, b, lt(a, 0.5))).join('');
  return g + `</g><ellipse cx="-16" cy="-30" rx="9" ry="15" fill="#fff" opacity=".35" transform="rotate(20 -16 -30)"/></g>`;
}
function bunny(x: number, y: number, s: number, fur: string, inner: string): string {
  return `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})"><ellipse cx="0" cy="96" rx="64" ry="7" fill="#000" opacity=".12"/>` +
    `<ellipse cx="-22" cy="-80" rx="15" ry="46" fill="${fur}" transform="rotate(-12 -22 -80)"/><ellipse cx="-22" cy="-78" rx="7" ry="34" fill="${inner}" transform="rotate(-12 -22 -78)"/>` +
    `<ellipse cx="22" cy="-80" rx="15" ry="46" fill="${fur}" transform="rotate(14 22 -80)"/><ellipse cx="22" cy="-78" rx="7" ry="34" fill="${inner}" transform="rotate(14 22 -78)"/>` +
    `<ellipse cx="0" cy="50" rx="56" ry="48" fill="${fur}"/><circle cx="52" cy="70" r="14" fill="#fff"/><circle cx="0" cy="-12" r="44" fill="${fur}"/><ellipse cx="-24" cy="88" rx="20" ry="10" fill="${lt(fur, 0.3)}"/><ellipse cx="24" cy="88" rx="20" ry="10" fill="${lt(fur, 0.3)}"/>` +
    `<circle cx="-16" cy="-16" r="5.5" fill="#2b2430"/><circle cx="16" cy="-16" r="5.5" fill="#2b2430"/><circle cx="-14" cy="-18" r="1.8" fill="#fff"/><circle cx="18" cy="-18" r="1.8" fill="#fff"/>` +
    `<ellipse cx="0" cy="-2" rx="5" ry="3.5" fill="${inner}"/><path d="M0 2 V6 M0 6 Q-6 12 -10 8 M0 6 Q6 12 10 8" stroke="#6b5560" stroke-width="2" fill="none" stroke-linecap="round"/><ellipse cx="-28" cy="2" rx="8" ry="5" fill="${inner}" opacity=".55"/><ellipse cx="28" cy="2" rx="8" ry="5" fill="${inner}" opacity=".55"/></g>`;
}
function chick(x: number, y: number, s: number, c: string): string {
  return `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})"><ellipse cx="0" cy="44" rx="34" ry="5" fill="#000" opacity=".12"/><ellipse cx="0" cy="10" rx="38" ry="34" fill="${c}"/><circle cx="0" cy="-22" r="26" fill="${c}"/><path d="M-4 -48 q4 -12 8 0 q6 -8 6 4" stroke="${dk(c, 0.15)}" stroke-width="3" fill="none"/>` +
    `<path d="M24 4 C40 -6 46 10 34 20 Z" fill="${dk(c, 0.1)}"/><circle cx="-9" cy="-26" r="3.5" fill="#2b2430"/><circle cx="9" cy="-26" r="3.5" fill="#2b2430"/><path d="M-6 -18 L0 -10 L6 -18 Z" fill="#f08a24"/><ellipse cx="-16" cy="-16" rx="5" ry="3" fill="#ff9bb3" opacity=".6"/><ellipse cx="16" cy="-16" rx="5" ry="3" fill="#ff9bb3" opacity=".6"/>` +
    `<path d="M-10 42 v6 M10 42 v6" stroke="#f08a24" stroke-width="3" stroke-linecap="round"/></g>`;
}
function palm(x: number, y: number, s: number, c: string, rot = 0): string {
  let g = `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${rot}) scale(${s})"><path d="M0 0 C10 -80 20 -160 50 -240" stroke="${dk(c, 0.3)}" stroke-width="5" fill="none"/>`;
  for (let i = 0; i < 18; i++) {
    const t = i / 18, px = 10 * t * 4 + t * t * 20, py = -240 * t - 10, l = 70 * (1 - t * 0.6);
    g += `<path d="M${f1(px)} ${f1(py)} q${f1(-l * 0.6)} ${f1(l * 0.1)} ${f1(-l)} ${f1(l * 0.55)}" stroke="${i % 2 ? c : lt(c, 0.12)}" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M${f1(px)} ${f1(py)} q${f1(l * 0.6)} ${f1(-l * 0.05)} ${f1(l)} ${f1(l * 0.45)}" stroke="${i % 2 ? dk(c, 0.1) : c}" stroke-width="7" fill="none" stroke-linecap="round"/>`;
  }
  return g + `</g>`;
}
/** A dove in flight, seen from the side (head on the left). */
function dove(x: number, y: number, s: number, c: string, line: string, rot = 0): string {
  return `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${rot}) scale(${s}) translate(-110 -90)"><path d="M40 104 C30 70 60 50 90 60 C110 40 140 30 170 34 C150 50 140 64 136 80 C160 72 190 70 210 80 C180 90 160 110 130 120 C110 140 70 146 40 130 C26 126 14 118 10 108 C22 108 32 108 40 104 Z" fill="${c}" stroke="${line}" stroke-width="2.5" stroke-linejoin="round"/>` +
    `<path d="M90 60 C96 80 110 92 136 80" stroke="${line}" stroke-width="2" fill="none"/><path d="M96 66 C120 40 150 20 190 6 C176 30 160 50 134 76" fill="${c}" stroke="${line}" stroke-width="2.5" stroke-linejoin="round"/><path d="M112 58 C130 44 150 32 172 22" stroke="${line}" stroke-width="1.6" fill="none"/>` +
    `<circle cx="58" cy="78" r="3.5" fill="#2b2b33"/><path d="M40 84 L26 90 L40 92 Z" fill="#e3a21a"/></g>`;
}
function wreath(id: string, cx: number, cy: number, r: number, green: string, berry: string, seed: number): string {
  const rr = rng(seed);
  let g = `<ellipse cx="${cx}" cy="${cy}" rx="${r}" ry="${f1(r * 0.34)}" fill="none" stroke="${dk(green, 0.35)}" stroke-width="${f1(r * 0.18)}"/>`;
  for (let i = 0; i < 70; i++) { const a = rr() * Math.PI * 2, d = r + (rr() - 0.5) * r * 0.22, px = cx + Math.cos(a) * d, py = cy + Math.sin(a) * d * 0.34; g += `<ellipse cx="${f1(px)}" cy="${f1(py)}" rx="${f1(r * 0.09)}" ry="${f1(r * 0.03)}" fill="${i % 3 ? green : lt(green, 0.15)}" transform="rotate(${f1(rr() * 180)} ${f1(px)} ${f1(py)})"/>`; }
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2 + 0.2, px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r * 0.34; g += `<circle cx="${f1(px)}" cy="${f1(py)}" r="${f1(r * 0.03)}" fill="${berry}"/>`; }
  return `<g id="${id}">${g}</g>`;
}
function candle(x: number, base: number, h: number, w: number, c: string, lit: boolean, id: string): string {
  let g = '';
  if (lit) g += `<circle cx="${f1(x)}" cy="${f1(base - h - w * 0.8)}" r="${f1(w * 1.8)}" fill="url(#${id})"/>`;
  g += `<rect x="${f1(x - w / 2)}" y="${f1(base - h)}" width="${f1(w)}" height="${f1(h)}" rx="${f1(w * 0.12)}" fill="${c}"/><rect x="${f1(x + w * 0.12)}" y="${f1(base - h)}" width="${f1(w * 0.3)}" height="${f1(h)}" fill="${dk(c, 0.14)}"/><ellipse cx="${f1(x)}" cy="${f1(base - h)}" rx="${f1(w / 2)}" ry="${f1(w * 0.14)}" fill="${lt(c, 0.25)}"/><path d="M${f1(x)} ${f1(base - h)} v${f1(-w * 0.2)}" stroke="#3a3030" stroke-width="2"/>`;
  if (lit) g += flame(x, base - h - w * 1.3, w * 1.05, '#ffbe46');
  return g;
}
function chalice(x: number, y: number, s: number, metal: string, host: string): string {
  return `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})"><defs><linearGradient id="chm" x1="0" x2="1"><stop offset="0" stop-color="${lt(metal, 0.45)}"/><stop offset=".45" stop-color="${metal}"/><stop offset="1" stop-color="${dk(metal, 0.35)}"/></linearGradient>${glowDef('chg', '#fff4c8', 0.8)}</defs>` +
    `<circle cx="0" cy="-60" r="70" fill="url(#chg)"/><circle cx="0" cy="-58" r="40" fill="${host}" stroke="${dk(host, 0.12)}" stroke-width="2.5"/><path d="M0 -80 V-36 M-16 -62 H16" stroke="${dk(host, 0.25)}" stroke-width="5" stroke-linecap="round"/>` +
    `<path d="M-60 -10 C-60 40 -30 70 -8 76 V120 C-8 128 -30 134 -50 146 H50 C30 134 8 128 8 120 V76 C30 70 60 40 60 -10 Z" fill="url(#chm)"/><ellipse cx="0" cy="-10" rx="60" ry="10" fill="${dk(metal, 0.2)}"/>` +
    `<ellipse cx="0" cy="96" rx="12" ry="7" fill="${lt(metal, 0.3)}"/><path d="M-44 4 C-42 30 -30 50 -14 60" stroke="#fff" stroke-width="5" fill="none" opacity=".45" stroke-linecap="round"/><ellipse cx="0" cy="150" rx="54" ry="5" fill="#000" opacity=".15"/></g>`;
}
function shell(x: number, y: number, s: number, c: string): string {
  let g = `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})"><path d="M0 70 L-80 -6 C-70 -60 -30 -84 0 -84 C30 -84 70 -60 80 -6 Z" fill="${c}" stroke="${dk(c, 0.25)}" stroke-width="2.5"/>`;
  for (let i = -4; i <= 4; i++) g += `<path d="M0 70 L${i * 18} -80" stroke="${dk(c, 0.2)}" stroke-width="2"/>`;
  return g + `<path d="M-18 70 H18 L10 86 H-10 Z" fill="${dk(c, 0.12)}"/><path d="M-60 -20 C-50 -50 -24 -66 0 -70" stroke="#fff" stroke-width="5" fill="none" opacity=".4" stroke-linecap="round"/></g>`;
}

// ---------- assets ----------
export const ASSETS: AssetDef[] = [
  A('cr-cross-sunrise', 'Cross at sunrise', 'illustration', 320, 300, ['#c99b2e', '#ffd27a', '#f6a96b'], [...EASTER, 'cross', 'sunrise', 'rays', 'good friday', 'church'], (c) => {
    let g = `<defs>${glowDef('sg', c[1], 0.8)}</defs><circle cx="160" cy="210" r="150" fill="url(#sg)"/>`;
    for (let i = 0; i < 16; i++) { const a = Math.PI + (i / 15) * Math.PI; g += `<path d="M160 210 L${f1(160 + Math.cos(a - 0.05) * 170)} ${f1(210 + Math.sin(a - 0.05) * 170)} L${f1(160 + Math.cos(a + 0.05) * 170)} ${f1(210 + Math.sin(a + 0.05) * 170)} Z" fill="${c[2]}" opacity=".22"/>`; }
    g += `<path d="M0 300 C80 250 240 250 320 300 Z" fill="${dk(c[0], 0.1)}" opacity=".35"/>`;
    return g + cross('cx', 160, 30, 240, c[0]);
  }),
  A('cr-cross', 'Simple cross', 'illustration', 160, 240, ['#c99b2e'], ['cross', 'faith', 'baptism', 'communion', 'confirmation', 'memorial', 'church'], (c) => cross('cs', 80, 8, 224, c[0])),
  A('cr-tomb', 'Empty tomb', 'illustration', 360, 240, ['#9c9384', '#ffe39a', '#7da35a'], [...EASTER, 'empty tomb', 'he is risen', 'stone rolled away', 'garden', 'resurrection'], (c) =>
    `<defs>${glowDef('tg', c[1], 0.85)}</defs><path d="M0 240 C40 200 100 190 140 180 C220 160 300 170 360 210 V240 Z" fill="${c[2]}"/>` +
    `<path d="M40 210 C40 90 110 40 200 40 C290 40 340 110 340 210 Z" fill="${c[0]}"/><path d="M40 210 C40 90 110 40 200 40" stroke="${lt(c[0], 0.25)}" stroke-width="6" fill="none"/>` +
    `<ellipse cx="190" cy="150" rx="66" ry="76" fill="url(#tg)"/><path d="M146 210 V150 C146 110 166 96 190 96 C214 96 234 110 234 150 V210 Z" fill="${mix(c[1], '#ffffff', 0.4)}"/>` +
    `<circle cx="290" cy="170" r="52" fill="${dk(c[0], 0.12)}"/><circle cx="290" cy="170" r="52" fill="none" stroke="${dk(c[0], 0.3)}" stroke-width="4"/><path d="M262 140 C270 132 284 128 298 130" stroke="${lt(c[0], 0.3)}" stroke-width="5" fill="none" stroke-linecap="round"/>` +
    `<path d="M0 240 C60 214 120 222 160 230 C220 214 300 214 360 236 V240 Z" fill="${dk(c[2], 0.15)}"/>` + [[70, 214], [104, 220], [326, 222]].map(([x, y]) => blossom(x, y, 8, '#ffffff', '#f2c94c')).join('')),
  A('cr-lilies', 'Easter lilies', 'illustration', 260, 300, ['#fbf7ef', '#5e8f3a'], [...EASTER, 'lily', 'lilies', 'flowers', 'white', 'memorial', 'sympathy'], (c) =>
    lily(76, 132, 0.8, c[0], c[1], -14) + lily(184, 130, 0.8, c[0], c[1], 14) + lily(130, 96, 0.9, c[0], c[1], 0)),
  A('cr-lamb', 'Spring lamb', 'illustration', 220, 180, ['#fbf7ef', '#f3d9c5', '#ff9bb3'], [...EASTER, 'lamb', 'sheep', 'cute', 'agnus dei'], (c) => {
    let g = `<ellipse cx="110" cy="172" rx="76" ry="6" fill="#000" opacity=".12"/><path d="M72 140 V168 M94 146 V170 M132 146 V170 M154 140 V168" stroke="${dk(c[1], 0.35)}" stroke-width="9" stroke-linecap="round"/>`;
    for (const [x, y, r] of [[70, 110, 30], [100, 94, 32], [134, 94, 32], [160, 114, 28], [114, 128, 34], [80, 134, 26], [148, 136, 26]]) g += `<circle cx="${x}" cy="${y}" r="${r}" fill="${c[0]}" stroke="${dk(c[0], 0.07)}" stroke-width="2"/>`;
    g += `<ellipse cx="48" cy="100" rx="25" ry="29" fill="${c[1]}"/><ellipse cx="26" cy="92" rx="14" ry="7" fill="${c[1]}" transform="rotate(-25 26 92)"/><ellipse cx="70" cy="86" rx="13" ry="6" fill="${c[1]}" transform="rotate(25 70 86)"/>`;
    g += `<circle cx="46" cy="78" r="12" fill="${c[0]}"/><circle cx="58" cy="76" r="10" fill="${c[0]}"/><path d="M34 100 q5 -5 10 0 M52 100 q5 -5 10 0" stroke="#3a2f2a" stroke-width="2.5" fill="none" stroke-linecap="round"/><ellipse cx="48" cy="114" rx="6" ry="3.5" fill="${c[2]}" opacity=".7"/>`;
    return g;
  }),
  A('cr-eggs', 'Decorated eggs', 'illustration', 300, 180, ['#a8d8f0', '#f7c6d9', '#fde39a', '#b9e3c6', '#e7d5f5'], [...EASTER, 'eggs', 'easter eggs', 'pastel', 'egg hunt'], (c) =>
    egg('e1', 70, 104, 0.95, c[0], c[1], c[2], 0, -12) + egg('e3', 228, 104, 0.95, c[3], c[0], c[1], 2, 14) + egg('e2', 150, 92, 1.1, c[1], c[3], c[2], 1)),
  A('cr-bunny', 'Easter bunny', 'illustration', 200, 260, ['#f5efe8', '#f7b5c8'], [...EASTER, 'bunny', 'rabbit', 'cute', 'kids', 'egg hunt'], (c) => bunny(100, 150, 1, c[0], c[1])),
  A('cr-chicks', 'Spring chicks', 'illustration', 260, 140, ['#ffd84d'], [...EASTER, 'chicks', 'chick', 'cute', 'kids', 'spring'], (c) => chick(70, 80, 0.9, c[0]) + chick(190, 84, 0.8, lt(c[0], 0.1)) + chick(130, 70, 1.05, c[0])),
  A('cr-basket', 'Easter basket', 'illustration', 300, 240, ['#c69a5a', '#a8d8f0', '#f7c6d9', '#fde39a', '#8fc96a'], [...EASTER, 'basket', 'eggs', 'egg hunt', 'kids'], (c) => {
    let g = `<path d="M60 120 C60 20 240 20 240 120" stroke="${dk(c[0], 0.15)}" stroke-width="12" fill="none"/>`;
    g += `<path d="M30 120 H270 C266 150 256 200 236 226 H64 C44 200 34 150 30 120 Z" fill="${c[0]}"/>`;
    g += egg('b1', 96, 108, 0.6, c[1], c[2], c[3], 1, -16) + egg('b2', 150, 98, 0.66, c[2], c[1], c[3], 0) + egg('b3', 204, 108, 0.6, c[3], c[2], c[1], 2, 14);
    for (let i = 0; i < 26; i++) g += `<path d="M${30 + i * 9.4} 124 q4 -14 8 0" stroke="${c[4]}" stroke-width="4" fill="none"/>`;
    g += `<path d="M30 120 H270 C266 150 256 200 236 226 H64 C44 200 34 150 30 120 Z" fill="${c[0]}" opacity=".0"/><rect x="26" y="116" width="248" height="16" rx="8" fill="${dk(c[0], 0.12)}"/>`;
    for (let row = 0; row < 4; row++) g += `<path d="M${40 + row * 4} ${148 + row * 22} H${260 - row * 4}" stroke="${dk(c[0], 0.22)}" stroke-width="3"/>`;
    for (let i = 0; i < 12; i++) g += `<path d="M${50 + i * 18} 132 L${56 + i * 16.5} 226" stroke="${dk(c[0], 0.15)}" stroke-width="2.5"/>`;
    return g + `<ellipse cx="150" cy="230" rx="100" ry="6" fill="#000" opacity=".12"/>`;
  }),
  A('cr-palms', 'Palm branches', 'illustration', 260, 280, ['#5e9a4a'], ['palm sunday', 'palms', 'palm branches', 'hosanna', 'domingo de ramos', 'church'], (c) => palm(70, 274, 0.95, c[0], -14) + palm(150, 278, 0.95, dk(c[0], 0.08), 4)),
  A('cr-thorns', 'Crown of thorns', 'illustration', 240, 140, ['#6b5038'], ['good friday', 'lent', 'holy week', 'crown of thorns', 'church'], (c) => {
    let g = '';
    for (let k = 0; k < 3; k++) g += `<ellipse cx="120" cy="70" rx="${100 - k * 4}" ry="${36 - k * 3}" fill="none" stroke="${k % 2 ? dk(c[0], 0.2) : c[0]}" stroke-width="7" transform="rotate(${k * 4 - 4} 120 70)"/>`;
    for (let i = 0; i < 26; i++) { const a = (i / 26) * Math.PI * 2, px = 120 + Math.cos(a) * 98, py = 70 + Math.sin(a) * 35, o = i % 2 ? 1 : -1; g += `<path d="M${f1(px)} ${f1(py)} l${f1(Math.cos(a) * 14 + o * 6)} ${f1(Math.sin(a) * 10 - 6)}" stroke="${dk(c[0], 0.25)}" stroke-width="3" stroke-linecap="round"/>`; }
    return g;
  }),
  A('cr-advent-wreath', 'Advent wreath', 'illustration', 320, 260, ['#3f7a4a', '#6b3fa0', '#e58fb4', '#fbf7ef', '#c8263a'], ['advent', 'advent wreath', 'candles', 'christmas', 'church', 'hope peace joy love'], (c) => {
    let g = `<defs>${glowDef('ag', '#ffcf6a', 0.6)}</defs>`;
    // back candles, wreath, front candles — three purple, one rose, white Christ candle in the centre
    g += candle(110, 168, 96, 22, c[1], true, 'ag') + candle(212, 168, 96, 22, c[2], true, 'ag');
    g += candle(160, 176, 120, 26, c[3], false, 'ag');
    g += wreath('w', 160, 188, 130, c[0], c[4], 42);
    g += candle(70, 214, 100, 24, c[1], true, 'ag') + candle(250, 214, 100, 24, c[1], true, 'ag');
    return g;
  }),
  A('cr-epiphany', 'Star & three crowns', 'illustration', 320, 260, ['#e8c46a', '#c8263a', '#2f6fd6', '#2f8a5a'], ['epiphany', 'three kings', 'magi', 'wise men', 'reyes magos', 'dia de reyes', 'star of bethlehem', 'christmas'], (c) => {
    let g = `<defs>${glowDef('eg', c[0], 0.7)}</defs><circle cx="160" cy="70" r="64" fill="url(#eg)"/><polygon points="${starPts(160, 70, 8, 44, 12)}" fill="${c[0]}"/><polygon points="${starPts(160, 70, 4, 70, 6, 0)}" fill="${lt(c[0], 0.4)}"/>`;
    [[80, c[1]], [160, c[2]], [240, c[3]]].forEach(([x, gem], i) => {
      const cx = x as number, y = 200 - (i === 1 ? 10 : 0);
      g += `<path d="M${cx - 36} ${y + 26} L${cx - 40} ${y - 14} L${cx - 18} ${y + 4} L${cx} ${y - 26} L${cx + 18} ${y + 4} L${cx + 40} ${y - 14} L${cx + 36} ${y + 26} Z" fill="${c[0]}" stroke="${dk(c[0], 0.3)}" stroke-width="2"/><rect x="${cx - 38}" y="${y + 18}" width="76" height="14" rx="4" fill="${dk(c[0], 0.15)}"/><circle cx="${cx}" cy="${y + 8}" r="7" fill="${gem}"/>`;
    });
    return g;
  }),
  A('cr-dove-flame', 'Dove & flame', 'illustration', 260, 280, ['#ffffff', '#9fb6cc', '#ff8a2a', '#ffd25a'], ['pentecost', 'confirmation', 'holy spirit', 'dove', 'flame', 'church', 'baptism'], (c) => {
    let g = `<defs>${glowDef('dg', c[3], 0.6)}</defs><circle cx="130" cy="150" r="120" fill="url(#dg)"/>`;
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; g += `<path d="M${f1(130 + Math.cos(a) * 70)} ${f1(150 + Math.sin(a) * 70)} L${f1(130 + Math.cos(a) * 120)} ${f1(150 + Math.sin(a) * 120)}" stroke="${c[3]}" stroke-width="3" opacity=".6"/>`; }
    return g + dove(130, 128, 0.9, c[0], c[1], 18) + `<path d="M130 228 C150 250 152 268 130 278 C108 268 110 250 130 228 Z" fill="${c[2]}"/><path d="M130 246 C140 258 140 268 130 274 C120 268 120 258 130 246 Z" fill="${c[3]}"/>`;
  }),
  A('cr-dove', 'Peace dove', 'illustration', 260, 240, ['#ffffff', '#9fb6cc'], ['dove', 'peace', 'baptism', 'christening', 'confirmation', 'memorial', 'wedding'], (c) => dove(130, 120, 1, c[0], c[1])),
  A('cr-shell', 'Baptism shell', 'illustration', 220, 220, ['#f3e2c7', '#8fc3e6'], ['baptism', 'christening', 'shell', 'water', 'scallop', 'bautizo'], (c) =>
    shell(110, 110, 1, c[0]) + [[110, 10, 8], [92, 30, 6], [128, 34, 5]].map(([x, y, r]) => `<path d="M${x} ${y} C${x + r} ${y + r * 1.2} ${x + r} ${y + r * 2} ${x} ${y + r * 2.2} C${x - r} ${y + r * 2} ${x - r} ${y + r * 1.2} ${x} ${y} Z" fill="${c[1]}"/>`).join('')),
  A('cr-chalice', 'Chalice & host', 'illustration', 200, 260, ['#d4a940', '#fbf4df'], ['first communion', 'holy communion', 'primera comunion', 'chalice', 'eucharist', 'church'], (c) => chalice(100, 110, 1, c[0], c[1])),
  A('cr-spring-flowers', 'Spring flowers', 'decoration', 400, 140, ['#f7c6d9', '#fde39a', '#a8d8f0', '#7fb069'], [...EASTER, 'flowers', 'spring', 'border', 'garden'], (c) => {
    let g = '';
    const r = rng(9);
    for (let i = 0; i < 18; i++) { const x = 10 + i * 22 + r() * 8, h = 40 + r() * 70; g += `<path d="M${f1(x)} 140 C${f1(x - 4)} ${f1(140 - h * 0.5)} ${f1(x + 4)} ${f1(140 - h * 0.8)} ${f1(x)} ${f1(140 - h)}" stroke="${c[3]}" stroke-width="3" fill="none"/>` + blossom(x, 140 - h, 9 + r() * 6, c[i % 3], i % 3 === 1 ? '#f08a24' : '#f2c94c', r() * 60); }
    for (let i = 0; i < 14; i++) { const x = r() * 400; g += `<ellipse cx="${f1(x)}" cy="132" rx="16" ry="5" fill="${i % 2 ? c[3] : dk(c[3], 0.12)}" transform="rotate(${f1(-30 + r() * 60)} ${f1(x)} 132)"/>`; }
    return g;
  }),
  A('cr-frame', 'Floral cross frame', 'decoration', 400, 520, ['#c99b2e'], ['frame', 'border', 'elegant', 'invitation', 'baptism', 'communion'], (c) =>
    frame(400, 520, c[0], 16, (k) => `<path d="M30 14 V46 M14 30 H46" stroke="${k}" stroke-width="4" stroke-linecap="round"/><circle cx="30" cy="30" r="20" fill="none" stroke="${k}" stroke-width="1.6"/>`)),
  A('cr-sparkles', 'Soft sparkles', 'decoration', 300, 200, ['#e8c46a', '#ffffff'], ['sparkles', 'stars', 'gold', 'light'], (c) => {
    const r = rng(41); let g = '';
    for (let i = 0; i < 20; i++) { const x = r() * 300, y = r() * 200; g += i % 3 ? sparkle(x, y, 3 + r() * 7, i % 2 ? c[0] : c[1], 0.9) : `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(2 + r() * 3)}" fill="${c[0]}"/>`; }
    return g;
  }),
];

// ---------- backgrounds ----------
const BGS = backgrounds('christian', ['christian', 'church'], [
  { id: 'cr-bg-sunrise', name: 'Easter sunrise', colors: ['#fff1d6', '#ffc58a', '#8fbf6a'], tags: [...EASTER, 'sunrise', 'hills', 'morning', 'warm'], draw: (c, W, H) => {
    const u = Math.min(W, H);
    let g = `<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${lt(c[1], 0.55)}"/><stop offset=".62" stop-color="${c[1]}"/><stop offset="1" stop-color="${c[0]}"/></linearGradient>${glowDef('sun', '#fff6d8', 0.95)}</defs><rect width="${W}" height="${H}" fill="url(#s)"/>`;
    g += `<circle cx="${f1(W / 2)}" cy="${f1(H * 0.74)}" r="${f1(u * 0.5)}" fill="url(#sun)"/>`;
    for (let i = 0; i < 18; i++) { const a = Math.PI + (i / 17) * Math.PI, R = Math.max(W, H); g += `<path d="M${f1(W / 2)} ${f1(H * 0.74)} L${f1(W / 2 + Math.cos(a - 0.03) * R)} ${f1(H * 0.74 + Math.sin(a - 0.03) * R)} L${f1(W / 2 + Math.cos(a + 0.03) * R)} ${f1(H * 0.74 + Math.sin(a + 0.03) * R)} Z" fill="#ffffff" opacity=".13"/>`; }
    return g + `<path d="M0 ${f1(H * 0.78)} C${f1(W * 0.3)} ${f1(H * 0.7)} ${f1(W * 0.6)} ${f1(H * 0.74)} ${W} ${f1(H * 0.72)} V${H} H0 Z" fill="${lt(c[2], 0.15)}"/><path d="M0 ${f1(H * 0.86)} C${f1(W * 0.4)} ${f1(H * 0.8)} ${f1(W * 0.7)} ${f1(H * 0.84)} ${W} ${f1(H * 0.8)} V${H} H0 Z" fill="${c[2]}"/>`;
  } },
  { id: 'cr-bg-meadow', name: 'Pastel meadow', colors: ['#eaf6fb', '#fdf3f7', '#9fd08a', '#f7c6d9', '#fde39a'], tags: [...EASTER, 'pastel', 'meadow', 'flowers', 'spring', 'kids'], draw: (c, W, H) => {
    const u = Math.min(W, H), r = rng(13);
    let g = `<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c[0]}"/><stop offset="1" stop-color="${c[1]}"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#s)"/>`;
    for (let i = 0; i < 3; i++) { const cx = r() * W, cy = H * (0.08 + r() * 0.2), s = u * 0.08; g += `<g fill="#ffffff" opacity=".9"><ellipse cx="${f1(cx)}" cy="${f1(cy)}" rx="${f1(s * 1.4)}" ry="${f1(s * 0.5)}"/><circle cx="${f1(cx - s * 0.4)}" cy="${f1(cy - s * 0.3)}" r="${f1(s * 0.5)}"/><circle cx="${f1(cx + s * 0.3)}" cy="${f1(cy - s * 0.45)}" r="${f1(s * 0.6)}"/></g>`; }
    g += `<path d="M0 ${f1(H - u * 0.2)} C${f1(W * 0.35)} ${f1(H - u * 0.27)} ${f1(W * 0.65)} ${f1(H - u * 0.17)} ${W} ${f1(H - u * 0.24)} V${H} H0 Z" fill="${c[2]}"/>`;
    for (let i = 0; i < Math.round(W / (u * 0.045)); i++) { const x = r() * W, y = H - u * (0.03 + r() * 0.15); g += blossom(x, y, u * (0.011 + r() * 0.01), [c[3], c[4], '#ffffff'][i % 3], '#f2a93b', r() * 70); }
    return g;
  } },
  { id: 'cr-bg-lily', name: 'Ivory & gold', colors: ['#fdfaf2', '#c99b2e', '#e9dfc6'], tags: [...EASTER, 'cream', 'white', 'elegant', 'baptism', 'communion', 'minimal'], draw: (c, W, H) => {
    const m = Math.min(W, H) * 0.045, u = Math.min(W, H);
    return `<defs><radialGradient id="r" cx="50%" cy="40%" r="80%"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="${c[2]}"/></radialGradient></defs><rect width="${W}" height="${H}" fill="url(#r)"/>` +
      bokeh(W, H, [lt(c[1], 0.6)], Math.round((W * H) / 70000), 5, u * 0.05, 'bk') +
      `<rect x="${f1(m)}" y="${f1(m)}" width="${f1(W - m * 2)}" height="${f1(H - m * 2)}" fill="none" stroke="${c[1]}" stroke-width="${f1(u * 0.004)}"/>`;
  } },
  { id: 'cr-bg-sky', name: 'Heavenly sky', colors: ['#cfe6f7', '#ffffff', '#ffe9b0'], tags: ['baptism', 'christening', 'confirmation', 'sky', 'clouds', 'blue', 'memorial', 'heaven'], draw: (c, W, H) => {
    const u = Math.min(W, H), r = rng(6);
    let g = `<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c[0]}"/><stop offset="1" stop-color="${c[1]}"/></linearGradient>${glowDef('lg', c[2], 0.8)}</defs><rect width="${W}" height="${H}" fill="url(#s)"/><circle cx="${f1(W / 2)}" cy="${f1(H * 0.12)}" r="${f1(u * 0.55)}" fill="url(#lg)"/>`;
    for (let i = 0; i < 7; i++) { const cx = r() * W, cy = H * (0.5 + r() * 0.5), s = u * (0.08 + r() * 0.08); g += `<g fill="#ffffff" opacity="${(0.6 + r() * 0.35).toFixed(2)}"><ellipse cx="${f1(cx)}" cy="${f1(cy)}" rx="${f1(s * 1.8)}" ry="${f1(s * 0.55)}"/><circle cx="${f1(cx - s * 0.5)}" cy="${f1(cy - s * 0.3)}" r="${f1(s * 0.6)}"/><circle cx="${f1(cx + s * 0.4)}" cy="${f1(cy - s * 0.5)}" r="${f1(s * 0.75)}"/></g>`; }
    return g;
  } },
  { id: 'cr-bg-advent', name: 'Advent night', colors: ['#2a1a4a', '#4a2f7a', '#e8c46a'], tags: ['advent', 'christmas', 'night', 'purple', 'stars', 'church'], draw: (c, W, H) =>
    `<defs><radialGradient id="r" cx="50%" cy="35%" r="85%"><stop offset="0" stop-color="${c[1]}"/><stop offset="1" stop-color="${c[0]}"/></radialGradient></defs><rect width="${W}" height="${H}" fill="url(#r)"/>` +
    stars(W, H, lt(c[2], 0.4), Math.round((W * H) / 11000), 21, 2.4) + bokeh(W, H, [c[2]], Math.round((W * H) / 80000), 8, Math.min(W, H) * 0.05, 'bk') },
]);

ASSETS.push(...BGS);
