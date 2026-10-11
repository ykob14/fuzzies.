/**
 * Passover (Pesach) collection — original vector artwork drawn in code for Fuzzies (licence: original Fuzzies artwork).
 * The seder plate shows its six traditional items: zeroa (shank bone), beitzah (roasted egg), maror (bitter herb —
 * horseradish), charoset, karpas (green vegetable — parsley) and chazeret (second bitter herb — romaine lettuce).
 */
import type { AssetDef } from '../index';
import { asset, backgrounds, blossom, dk, f1, flame, frame, glowDef, lt, mix, rng, starPts } from '../draw';

const A = asset('passover', ['passover', 'pesach', 'pesah', 'פסח', 'seder', 'jewish', 'holiday', 'spring']);

// ---------- drawings ----------
function matzah(id: string, x: number, y: number, s: number, rot: number, dough: string, toast: string): string {
  const r = rng(Math.round(x * 7 + y));
  let edge = '';
  const N = 36;
  for (let i = 0; i <= N; i++) {
    const t = i / N, side = Math.floor(t * 4), u = (t * 4) % 1, j = (r() - 0.5) * 4;
    const [px, py] = side === 0 ? [u * 180, 0] : side === 1 ? [180, u * 180] : side === 2 ? [180 - u * 180, 180] : [0, 180 - u * 180];
    edge += `${i ? 'L' : 'M'}${f1(px + (side % 2 ? j : 0))} ${f1(py + (side % 2 ? 0 : j))} `;
  }
  let g = `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${rot} 90 90) scale(${s})"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${lt(dough, 0.25)}"/><stop offset="1" stop-color="${dk(dough, 0.12)}"/></linearGradient></defs>`;
  g += `<path d="${edge}Z" fill="${dk(toast, 0.2)}" transform="translate(3 4)" opacity=".35"/><path d="${edge}Z" fill="url(#${id})" stroke="${mix(dough, toast, 0.5)}" stroke-width="2"/>`;
  for (let i = 0; i < 16; i++) g += `<ellipse cx="${f1(14 + r() * 152)}" cy="${f1(14 + r() * 152)}" rx="${f1(5 + r() * 12)}" ry="${f1(3 + r() * 7)}" fill="${toast}" opacity="${(0.25 + r() * 0.35).toFixed(2)}" transform="rotate(${f1(r() * 180)} 90 90)"/>`;
  for (let row = 0; row < 7; row++) for (let k = 0; k < 14; k++) g += `<circle cx="${f1(14 + k * 11.7)}" cy="${f1(18 + row * 24)}" r="1.6" fill="${dk(toast, 0.25)}" opacity=".75"/>`;
  return g + `</g>`;
}

function cup(id: string, cx: number, top: number, s: number, metal: string, wine: string, band: string, ornate = false): string {
  let g = `<g transform="translate(${f1(cx)} ${f1(top)}) scale(${s})"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${lt(metal, 0.45)}"/><stop offset=".45" stop-color="${metal}"/><stop offset="1" stop-color="${dk(metal, 0.35)}"/></linearGradient></defs>`;
  g += `<path d="M-48 0 C-48 52 -30 84 -8 92 V128 C-8 136 -26 140 -40 150 H40 C26 140 8 136 8 128 V92 C30 84 48 52 48 0 Z" fill="url(#${id})"/>`;
  g += `<ellipse cx="0" cy="0" rx="48" ry="10" fill="${dk(metal, 0.2)}"/><ellipse cx="0" cy="2" rx="44" ry="8" fill="${wine}"/><ellipse cx="-12" cy="0" rx="16" ry="2.5" fill="#fff" opacity=".35"/>`;
  g += `<path d="M-46 30 C-30 34 30 34 46 30 L44 42 C30 46 -30 46 -44 42 Z" fill="${band}"/>`;
  if (ornate) {
    for (let i = -3; i <= 3; i++) g += `<circle cx="${i * 12}" cy="37" r="2.6" fill="${dk(band, 0.3)}"/>`;
    g += `<path d="M-34 56 Q0 74 34 56 M-24 68 Q0 82 24 68" stroke="${band}" stroke-width="2.5" fill="none"/><circle cx="0" cy="104" r="7" fill="${band}"/><path d="M-30 150 H30" stroke="${band}" stroke-width="4"/>`;
  } else g += `<rect x="-10" y="100" width="20" height="8" rx="3" fill="${band}"/>`;
  g += `<path d="M-36 8 C-36 40 -26 66 -12 78" stroke="#fff" stroke-width="5" fill="none" opacity=".45" stroke-linecap="round"/>`;
  return g + `<ellipse cx="0" cy="152" rx="44" ry="4" fill="#000" opacity=".15"/></g>`;
}

function candlestick(x: number, s: number, metal: string, candle: string, fire: string, id: string): string {
  return `<g transform="translate(${f1(x)} 0) scale(${s})"><defs>${glowDef(`${id}g`, fire, 0.5)}</defs><circle cx="0" cy="40" r="36" fill="url(#${id}g)"/>` +
    `<rect x="-8" y="70" width="16" height="70" rx="3" fill="${candle}"/><rect x="2" y="70" width="6" height="70" rx="3" fill="${dk(candle, 0.1)}"/><path d="M0 70 V64" stroke="#3a3030" stroke-width="2"/>` + flame(0, 34, 30, fire) +
    `<path d="M-16 140 H16 L10 150 C6 170 6 190 12 204 C20 208 26 214 26 222 H-26 C-26 214 -20 208 -12 204 C-6 190 -6 170 -10 150 Z" fill="${metal}"/><path d="M4 150 C6 170 6 190 12 204 C20 208 26 214 26 222 H6 Z" fill="${dk(metal, 0.25)}"/><ellipse cx="0" cy="176" rx="9" ry="5" fill="${lt(metal, 0.3)}"/></g>`;
}

function tulip(x: number, y: number, s: number, rot: number, petal: string, stem: string): string {
  return `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${rot}) scale(${s})"><path d="M0 0 C-4 40 2 80 0 120" stroke="${stem}" stroke-width="5" fill="none"/><path d="M0 70 C-26 50 -30 30 -24 20 C-14 40 -6 56 0 70 Z" fill="${stem}"/>` +
    `<path d="M-20 -30 C-24 -6 -14 8 0 8 C14 8 24 -6 20 -30 C14 -22 8 -24 0 -36 C-8 -24 -14 -22 -20 -30 Z" fill="${petal}"/><path d="M0 -36 C8 -24 14 -22 20 -30 C24 -6 14 8 0 8 Z" fill="${dk(petal, 0.18)}"/><path d="M-8 -14 C-6 -4 -2 2 0 4" stroke="${lt(petal, 0.4)}" stroke-width="2.5" fill="none" stroke-linecap="round"/></g>`;
}
function anemone(x: number, y: number, r: number, petal: string, centre = '#2a2030'): string {
  let g = '';
  for (let i = 0; i < 6; i++) g += `<ellipse cx="${f1(x)}" cy="${f1(y - r * 0.55)}" rx="${f1(r * 0.42)}" ry="${f1(r * 0.55)}" fill="${i % 2 ? petal : dk(petal, 0.1)}" transform="rotate(${i * 60} ${f1(x)} ${f1(y)})"/>`;
  return g + `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r * 0.28)}" fill="${centre}"/><circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r * 0.36)}" fill="none" stroke="${centre}" stroke-width="${f1(r * 0.06)}" stroke-dasharray="1 3"/>`;
}
function leafSprig(x: number, y: number, len: number, rot: number, green: string): string {
  let g = `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${rot})"><path d="M0 0 Q${f1(len * 0.5)} ${f1(-len * 0.08)} ${f1(len)} 0" stroke="${dk(green, 0.2)}" stroke-width="${f1(len * 0.025)}" fill="none"/>`;
  for (let i = 1; i < 6; i++) { const t = i / 6, l = len * 0.22 * (1 - t * 0.4); g += `<ellipse cx="${f1(len * t + l * 0.3)}" cy="${f1(-l * 0.45)}" rx="${f1(l * 0.55)}" ry="${f1(l * 0.24)}" fill="${green}" transform="rotate(-35 ${f1(len * t + l * 0.3)} ${f1(-l * 0.45)})"/><ellipse cx="${f1(len * t + l * 0.3)}" cy="${f1(l * 0.45)}" rx="${f1(l * 0.55)}" ry="${f1(l * 0.24)}" fill="${lt(green, 0.12)}" transform="rotate(35 ${f1(len * t + l * 0.3)} ${f1(l * 0.45)})"/>`; }
  return g + `<ellipse cx="${f1(len + len * 0.08)}" cy="0" rx="${f1(len * 0.12)}" ry="${f1(len * 0.05)}" fill="${green}"/></g>`;
}

function sederPlate(id: string, rim: string, plate: string, accent: string): string {
  const C = 130, R = 120;
  let g = `<defs><radialGradient id="${id}r" cx="40%" cy="35%"><stop offset="0" stop-color="${lt(rim, 0.35)}"/><stop offset="1" stop-color="${dk(rim, 0.25)}"/></radialGradient><radialGradient id="${id}p" cx="45%" cy="40%"><stop offset="0" stop-color="${lt(plate, 0.6)}"/><stop offset="1" stop-color="${dk(plate, 0.06)}"/></radialGradient></defs>`;
  g += `<ellipse cx="${C}" cy="${C + 8}" rx="${R}" ry="${R}" fill="#000" opacity=".15"/><circle cx="${C}" cy="${C}" r="${R}" fill="url(#${id}r)"/><circle cx="${C}" cy="${C}" r="${R - 12}" fill="url(#${id}p)"/>`;
  g += `<circle cx="${C}" cy="${C}" r="${R - 20}" fill="none" stroke="${accent}" stroke-width="2.5"/><circle cx="${C}" cy="${C}" r="${R - 26}" fill="none" stroke="${accent}" stroke-width="1" stroke-dasharray="2 5"/>`;
  for (let i = 0; i < 6; i++) g += `<ellipse cx="${C}" cy="${C - 18}" rx="7" ry="16" fill="${accent}" opacity=".85" transform="rotate(${i * 60} ${C} ${C})"/>`;
  g += `<circle cx="${C}" cy="${C}" r="7" fill="${rim}"/>`;
  const at = (i: number) => { const a = ((-90 + i * 60) * Math.PI) / 180; return [C + Math.cos(a) * 72, C + Math.sin(a) * 72]; };
  const bowl = (x: number, y: number) => `<circle cx="${f1(x)}" cy="${f1(y + 2)}" r="29" fill="#000" opacity=".1"/><circle cx="${f1(x)}" cy="${f1(y)}" r="28" fill="#ffffff"/><circle cx="${f1(x)}" cy="${f1(y)}" r="24" fill="none" stroke="${accent}" stroke-width="2"/>`;
  const items: ((x: number, y: number) => string)[] = [
    // zeroa: roasted shank bone
    (x, y) => `<g transform="translate(${f1(x)} ${f1(y)}) rotate(-30)"><path d="M-16 -3 H16 V3 H-16 Z" fill="#efe2c6"/><circle cx="-17" cy="-4" r="5" fill="#efe2c6"/><circle cx="-17" cy="4" r="5" fill="#efe2c6"/><circle cx="17" cy="-4" r="5" fill="#efe2c6"/><circle cx="17" cy="4" r="5" fill="#efe2c6"/><path d="M-10 -5 Q0 -12 10 -5 V5 Q0 10 -10 5 Z" fill="#9a5a2e"/></g>`,
    // beitzah: roasted egg
    (x, y) => `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="13" ry="17" fill="#ecd6b2"/><ellipse cx="${f1(x + 4)}" cy="${f1(y + 3)}" rx="7" ry="10" fill="#b98b5a" opacity=".45"/><ellipse cx="${f1(x - 4)}" cy="${f1(y - 6)}" rx="3" ry="5" fill="#fff" opacity=".6"/>`,
    // maror: horseradish root with leaves
    (x, y) => `<path d="M${f1(x - 12)} ${f1(y - 4)} C${f1(x - 6)} ${f1(y - 12)} ${f1(x + 8)} ${f1(y - 10)} ${f1(x + 16)} ${f1(y + 12)} C${f1(x + 4)} ${f1(y + 4)} ${f1(x - 6)} ${f1(y + 6)} ${f1(x - 12)} ${f1(y - 4)} Z" fill="#efe6cf" stroke="#cdbb91" stroke-width="1.5"/><path d="M${f1(x - 12)} ${f1(y - 4)} C${f1(x - 18)} ${f1(y - 18)} ${f1(x - 8)} ${f1(y - 22)} ${f1(x - 4)} ${f1(y - 12)} M${f1(x - 12)} ${f1(y - 4)} C${f1(x - 22)} ${f1(y - 8)} ${f1(x - 22)} ${f1(y - 18)} ${f1(x - 16)} ${f1(y - 16)}" stroke="#5f9f4a" stroke-width="4" fill="none" stroke-linecap="round"/>`,
    // charoset: chunky brown mound
    (x, y) => `<path d="M${f1(x - 18)} ${f1(y + 8)} C${f1(x - 18)} ${f1(y - 10)} ${f1(x - 4)} ${f1(y - 16)} ${f1(x + 4)} ${f1(y - 12)} C${f1(x + 16)} ${f1(y - 12)} ${f1(x + 20)} ${f1(y)} ${f1(x + 18)} ${f1(y + 8)} Z" fill="#8a5232"/>` + [[-8, -2], [4, -6], [10, 2], [-2, 4], [-12, 4]].map(([dx, dy]) => `<circle cx="${f1(x + dx)}" cy="${f1(y + dy)}" r="2.4" fill="#c9965e"/>`).join(''),
    // karpas: parsley
    (x, y) => [[-8, -6], [6, -8], [0, 2], [-10, 6], [10, 4], [-2, -14]].map(([dx, dy]) => `<circle cx="${f1(x + dx)}" cy="${f1(y + dy)}" r="7" fill="#4f9a3c"/><circle cx="${f1(x + dx - 2)}" cy="${f1(y + dy - 2)}" r="3" fill="#7cc35e"/>`).join('') + `<path d="M${f1(x)} ${f1(y + 4)} L${f1(x + 4)} ${f1(y + 18)}" stroke="#4f9a3c" stroke-width="2.5"/>`,
    // chazeret: romaine leaf
    (x, y) => `<path d="M${f1(x - 6)} ${f1(y + 18)} C${f1(x - 22)} ${f1(y + 2)} ${f1(x - 14)} ${f1(y - 20)} ${f1(x + 2)} ${f1(y - 20)} C${f1(x + 18)} ${f1(y - 16)} ${f1(x + 16)} ${f1(y + 4)} ${f1(x - 6)} ${f1(y + 18)} Z" fill="#9fd36a"/><path d="M${f1(x - 6)} ${f1(y + 18)} Q${f1(x - 2)} ${f1(y)} ${f1(x + 2)} ${f1(y - 18)}" stroke="#e8f5c8" stroke-width="2.5" fill="none"/>`,
  ];
  for (let i = 0; i < 6; i++) { const [x, y] = at(i); g += bowl(x, y) + items[i](x, y); }
  return g;
}

function bookOpen(id: string, cover: string, page: string, gold: string): string {
  let g = `<path d="M10 40 L130 54 L250 40 L250 172 L130 186 L10 172 Z" fill="${cover}"/><path d="M14 36 Q72 22 130 44 V176 Q72 158 14 170 Z" fill="${page}"/><path d="M246 36 Q188 22 130 44 V176 Q188 158 246 170 Z" fill="${dk(page, 0.05)}"/>`;
  g += `<path d="M130 44 V176" stroke="${dk(page, 0.25)}" stroke-width="2"/><path d="M28 46 Q72 36 120 54 V160 Q72 146 28 154 Z" fill="none" stroke="${gold}" stroke-width="2"/><path d="M232 46 Q188 36 140 54 V160 Q188 146 232 154 Z" fill="none" stroke="${gold}" stroke-width="2"/>`;
  for (let i = 0; i < 7; i++) {
    const y = 74 + i * 11;
    g += `<path d="M${40 + (i % 3) * 4} ${y + (i < 1 ? 0 : 0)} Q76 ${y - 6} 112 ${y + 6}" stroke="${mix(page, '#3a3a4a', 0.5)}" stroke-width="2.4" stroke-linecap="round" opacity=".55" fill="none"/>`;
    g += `<path d="M148 ${y + 6} Q184 ${y - 6} ${220 - (i % 3) * 4} ${y}" stroke="${mix(page, '#3a3a4a', 0.5)}" stroke-width="2.4" stroke-linecap="round" opacity=".55" fill="none"/>`;
  }
  g += `<path d="M64 60 Q74 50 84 60 Q74 70 64 60 Z M176 60 Q186 50 196 60 Q186 70 176 60 Z" fill="${gold}"/><path d="M180 176 V198 L188 190 L196 198 V172" fill="${gold}"/>`;
  return `<g id="${id}">${g}</g>`;
}

// ---------- the collection ----------
const ILLUSTRATIONS: AssetDef[] = [
  A('ps-seder-plate', 'Seder plate', 'illustration', 260, 270, ['#d4a940', '#f6f3ec', '#2f5fa8'], ['seder plate', 'kearah', 'seder', 'zeroa', 'egg', 'maror', 'charoset', 'karpas', 'chazeret'], (c) => sederPlate('s', c[0], c[1], c[2])),
  A('ps-matzah', 'Matzah', 'illustration', 200, 200, ['#ecd3a1', '#b7894a'], ['matzah', 'matzo', 'matza', 'unleavened bread'], (c) => matzah('m', 10, 10, 1, 0, c[0], c[1])),
  A('ps-matzah-stack', 'Stack of matzah', 'illustration', 300, 230, ['#ecd3a1', '#b7894a', '#2f5fa8'], ['matzah', 'matzo', 'stack', 'three matzot', 'matzah cover'], (c) =>
    matzah('a', 40, 30, 0.95, -8, c[0], c[1]) + matzah('b', 66, 22, 0.95, 4, c[0], c[1]) + matzah('d', 92, 30, 0.95, 12, c[0], c[1]) +
    `<path d="M20 206 Q150 190 284 206 L280 216 Q150 202 24 216 Z" fill="${c[2]}"/><path d="M30 210 H274" stroke="#fff" stroke-width="1.6" stroke-dasharray="4 4" opacity=".7"/>`),
  A('ps-cup', 'Kiddush cup', 'illustration', 150, 220, ['#c9ced6', '#8b1e3f', '#d4a940'], ['kiddush cup', 'wine cup', 'four cups', 'wine', 'silver'], (c) => cup('c', 75, 52, 1, c[0], c[1], c[2])),
  A('ps-elijah-cup', 'Cup of Elijah', 'illustration', 150, 220, ['#d4a940', '#8b1e3f', '#f3e3b0'], ['elijah', 'cup of elijah', 'kos eliyahu', 'wine cup', 'ornate', 'gold'], (c) => cup('e', 75, 52, 1, c[0], c[1], c[2], true)),
  A('ps-wine', 'Wine & glass', 'illustration', 220, 250, ['#29402c', '#8b1e3f', '#f3ead7'], ['wine', 'bottle', 'glass', 'four cups', 'drink'], (c) =>
    `<defs><linearGradient id="wb" x1="0" x2="1"><stop offset="0" stop-color="${lt(c[0], 0.25)}"/><stop offset=".5" stop-color="${c[0]}"/><stop offset="1" stop-color="${dk(c[0], 0.4)}"/></linearGradient></defs>` +
    `<path d="M58 14 H82 V70 C104 82 110 100 110 122 V232 C110 240 104 244 96 244 H44 C36 244 30 240 30 232 V122 C30 100 36 82 58 70 Z" fill="url(#wb)"/><rect x="56" y="8" width="28" height="18" rx="3" fill="${c[1]}"/>` +
    `<rect x="34" y="140" width="72" height="60" rx="4" fill="${c[2]}"/><path d="M46 158 H94 M50 172 H90 M56 184 H84" stroke="${dk(c[2], 0.4)}" stroke-width="2.4"/><path d="M42 100 V220" stroke="#fff" stroke-width="5" opacity=".3" stroke-linecap="round"/>` +
    `<path d="M136 120 H204 C204 162 188 180 170 182 C152 180 136 162 136 120 Z" fill="#eef2f6" opacity=".55" stroke="#fff" stroke-width="2"/><path d="M138 142 H202 C200 166 186 178 170 180 C154 178 140 166 138 142 Z" fill="${c[1]}"/><path d="M170 182 V230 M146 236 Q170 228 194 236" stroke="#dfe5ec" stroke-width="5" fill="none" stroke-linecap="round"/>`),
  A('ps-haggadah', 'Open Haggadah', 'illustration', 260, 210, ['#2f4f8f', '#fbf6ea', '#d4a940'], ['haggadah', 'book', 'reading', 'story', 'seder'], (c) => bookOpen('h', c[0], c[1], c[2])),
  A('ps-haggadah-closed', 'Haggadah book', 'illustration', 180, 230, ['#1f3b73', '#d4a940', '#fbf6ea'], ['haggadah', 'book', 'cover', 'elegant'], (c) =>
    `<path d="M30 14 H160 V222 H30 Z" fill="${c[2]}"/><path d="M22 10 H152 C158 10 162 14 162 20 V214 C162 220 158 224 152 224 H22 Z" fill="${c[0]}"/><path d="M22 10 V224" stroke="${dk(c[0], 0.3)}" stroke-width="10"/>` +
    `<rect x="40" y="26" width="108" height="182" rx="4" fill="none" stroke="${c[1]}" stroke-width="3"/><rect x="48" y="34" width="92" height="166" rx="3" fill="none" stroke="${c[1]}" stroke-width="1.2"/>` +
    `<path d="M62 160 V100 Q94 54 126 100 V160 Z" fill="none" stroke="${c[1]}" stroke-width="3"/><polygon points="${starPts(94, 118, 6, 18, 10)}" fill="${c[1]}"/><path d="M66 176 H122 M74 186 H114" stroke="${c[1]}" stroke-width="2.5"/>`),
  A('ps-flowers', 'Spring bouquet', 'illustration', 240, 280, ['#e63962', '#ffffff', '#5f9f4a'], ['flowers', 'bouquet', 'tulips', 'anemones', 'spring', 'centerpiece'], (c) =>
    tulip(84, 96, 0.9, -18, c[0], c[2]) + tulip(150, 90, 0.85, 16, mix(c[0], '#ff9a3c', 0.4), c[2]) + tulip(116, 70, 0.95, 2, c[0], c[2]) +
    leafSprig(70, 170, 70, -130, c[2]) + leafSprig(170, 170, 70, -50, c[2]) + anemone(70, 150, 22, c[0]) + anemone(166, 146, 20, mix(c[0], '#7a4fd6', 0.4)) +
    blossom(118, 140, 18, c[1], '#f2b33d') + blossom(96, 118, 12, c[1], '#f2b33d', 20) + blossom(144, 118, 12, c[1], '#f2b33d', 40) +
    `<path d="M76 176 H164 L156 262 C154 272 146 276 136 276 H104 C94 276 86 272 84 262 Z" fill="#dfe9f2" opacity=".85"/><path d="M84 200 H156" stroke="#b9cfe0" stroke-width="3"/><path d="M90 186 C88 210 90 236 96 256" stroke="#fff" stroke-width="5" opacity=".6" fill="none" stroke-linecap="round"/>`),
  A('ps-blossom', 'Almond blossom branch', 'decoration', 340, 180, ['#6b4a3a', '#ffd1dc', '#f2b33d'], ['blossom', 'almond', 'branch', 'spring', 'flowers', 'corner'], (c) => {
    let g = `<path d="M0 150 C80 130 140 90 220 70 C260 60 300 40 336 20 M150 98 C170 120 196 130 226 132 M90 128 C100 100 104 80 120 60" stroke="${c[0]}" stroke-width="6" fill="none" stroke-linecap="round"/>`;
    const spots: [number, number, number][] = [[60, 132, 16], [120, 60, 14], [180, 82, 18], [226, 132, 14], [262, 54, 16], [316, 28, 12], [140, 104, 12], [96, 100, 10]];
    for (const [x, y, r] of spots) g += blossom(x, y, r, c[1], c[2], x % 72);
    return g + [[200, 66], [284, 46], [80, 128]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="6" ry="9" fill="${lt(c[1], 0.2)}" stroke="${dk(c[1], 0.15)}" stroke-width="1"/>`).join('');
  }),
  A('ps-wheat', 'Wheat sheaf', 'decoration', 140, 250, ['#d4a940'], ['wheat', 'harvest', 'omer', 'grain', 'spring'], (c) => {
    let g = '';
    for (const [rot, len] of [[-16, 200], [-6, 220], [4, 226], [14, 206], [-24, 180], [22, 184]]) {
      g += `<g transform="rotate(${rot} 70 240)"><path d="M70 240 V${240 - len}" stroke="${dk(c[0], 0.15)}" stroke-width="3"/>`;
      for (let k = 0; k < 7; k++) { const y = 240 - len + 8 + k * 11; g += `<ellipse cx="64" cy="${y}" rx="4.5" ry="8" fill="${c[0]}" transform="rotate(-25 64 ${y})"/><ellipse cx="76" cy="${y}" rx="4.5" ry="8" fill="${lt(c[0], 0.15)}" transform="rotate(25 76 ${y})"/>`; }
      g += `<path d="M70 ${240 - len} V${222 - len}" stroke="${c[0]}" stroke-width="1.4"/></g>`;
    }
    return g + `<path d="M50 190 Q70 200 90 190 L88 202 Q70 212 52 202 Z" fill="${dk(c[0], 0.3)}"/>`;
  }),
  A('ps-candles', 'Holiday candles', 'illustration', 180, 230, ['#c9ced6', '#ffffff', '#ffb238'], ['candles', 'candlesticks', 'yom tov', 'light', 'blessing'], (c) => candlestick(54, 1, c[0], c[1], c[2], 'a') + candlestick(126, 1, c[0], c[1], c[2], 'b')),
  A('ps-table', 'Seder table', 'scene', 440, 280, ['#ffffff', '#2f5fa8', '#d4a940'], ['table', 'seder table', 'dinner', 'setting', 'family', 'scene'], (c) =>
    `<path d="M0 150 H440 V280 H0 Z" fill="${c[0]}"/><path d="M0 150 H440 V164 H0 Z" fill="${dk(c[0], 0.06)}"/><path d="M0 250 H440 M0 258 H440" stroke="${c[1]}" stroke-width="3"/>` +
    `<g transform="translate(6 -8) scale(.6)">${candlestick(54, 1, '#c9ced6', '#ffffff', '#ffb238', 'x')}${candlestick(126, 1, '#c9ced6', '#ffffff', '#ffb238', 'y')}</g>` +
    `<g transform="translate(150 54) scale(.6 .48)">${sederPlate('t', c[2], '#f6f3ec', c[1])}</g>` +
    `<g transform="translate(66 128) scale(.36)">${tulip(84, 96, 0.9, -18, '#e63962', '#5f9f4a')}${tulip(140, 96, 0.9, 18, '#e63962', '#5f9f4a')}${tulip(112, 76, 0.95, 0, '#ff7a6a', '#5f9f4a')}<path d="M80 170 H150 L144 240 H86 Z" fill="#dfe9f2"/></g>` +
    `<g transform="translate(296 168) scale(.4)">${matzah('q', 0, 0, 1, -6, '#ecd3a1', '#b7894a')}</g>` +
    cup('u', 360, 92, 0.5, '#c9ced6', '#8b1e3f', c[2]) + cup('v', 410, 84, 0.55, c[2], '#8b1e3f', '#f3e3b0', true)),
  A('ps-frog', 'Cute frog', 'illustration', 180, 150, ['#6cc24a', '#ffffff', '#ff8aa0'], ['frog', 'plagues', 'kids', 'cute', 'fun', 'story'], (c) =>
    `<ellipse cx="90" cy="142" rx="66" ry="6" fill="#000" opacity=".15"/><path d="M30 130 C10 128 10 108 30 104 C44 102 52 116 54 130 Z M150 130 C170 128 170 108 150 104 C136 102 128 116 126 130 Z" fill="${dk(c[0], 0.12)}"/>` +
    `<path d="M90 50 C140 50 160 80 156 110 C152 134 124 140 90 140 C56 140 28 134 24 110 C20 80 40 50 90 50 Z" fill="${c[0]}"/><ellipse cx="90" cy="112" rx="44" ry="24" fill="${lt(c[0], 0.45)}"/>` +
    `<circle cx="58" cy="50" r="24" fill="${c[0]}"/><circle cx="122" cy="50" r="24" fill="${c[0]}"/><circle cx="58" cy="48" r="16" fill="${c[1]}"/><circle cx="122" cy="48" r="16" fill="${c[1]}"/><circle cx="61" cy="50" r="8" fill="#1d2a1a"/><circle cx="125" cy="50" r="8" fill="#1d2a1a"/><circle cx="64" cy="46" r="3" fill="#fff"/><circle cx="128" cy="46" r="3" fill="#fff"/>` +
    `<path d="M62 86 Q90 106 118 86" stroke="#1d2a1a" stroke-width="4" fill="none" stroke-linecap="round"/><ellipse cx="44" cy="84" rx="10" ry="6" fill="${c[2]}" opacity=".6"/><ellipse cx="136" cy="84" rx="10" ry="6" fill="${c[2]}" opacity=".6"/>` +
    `<path d="M50 132 C46 140 56 144 62 138 M130 132 C134 140 124 144 118 138" stroke="${dk(c[0], 0.2)}" stroke-width="5" stroke-linecap="round" fill="none"/>`),
  A('ps-pomegranate', 'Pomegranate', 'illustration', 180, 190, ['#c2273b', '#5f9f4a', '#f6c2c8'], ['pomegranate', 'fruit', 'spring', 'israel', 'elegant'], (c) =>
    `<defs><radialGradient id="pg" cx="35%" cy="35%"><stop offset="0" stop-color="${lt(c[0], 0.3)}"/><stop offset="1" stop-color="${dk(c[0], 0.35)}"/></radialGradient></defs>` +
    `<path d="M100 30 C120 6 150 10 160 24 C140 26 120 30 104 40 Z" fill="${c[1]}"/><path d="M104 36 C120 24 140 22 156 24" stroke="${dk(c[1], 0.3)}" stroke-width="1.6" fill="none"/>` +
    `<circle cx="88" cy="112" r="68" fill="url(#pg)"/><path d="M72 46 L76 32 L84 42 L90 28 L96 42 L104 32 L106 48 Z" fill="${dk(c[0], 0.2)}"/>` +
    `<ellipse cx="62" cy="86" rx="12" ry="20" transform="rotate(30 62 86)" fill="#fff" opacity=".25"/>` + `<ellipse cx="88" cy="184" rx="60" ry="5" fill="#000" opacity=".15"/>`),
  A('ps-frame', 'Floral frame', 'decoration', 400, 520, ['#c9a24a', '#7fa36a', '#e9a3b5'], ['frame', 'border', 'floral', 'elegant', 'invitation'], (c) =>
    frame(400, 520, c[0], 18, (k) => `${leafSprig(10, 10, 90, 18, c[1])}${leafSprig(10, 10, 90, 72, c[1])}${blossom(26, 26, 14, c[2], k)}`)),
  A('ps-banner', 'Ribbon banner', 'decoration', 420, 110, ['#2f5fa8', '#d4a940'], ['banner', 'ribbon', 'label', 'title'], (c) =>
    `<path d="M50 32 L0 32 L20 60 L0 88 L70 88 Z M370 32 L420 32 L400 60 L420 88 L350 88 Z" fill="${dk(c[0], 0.3)}"/><path d="M40 16 H380 V94 H40 Z" fill="${c[0]}"/><path d="M40 24 H380 M40 86 H380" stroke="${c[1]}" stroke-width="3"/>`),
];

// ---------- backgrounds ----------
const BGS = backgrounds('passover', ['passover', 'pesach', 'פסח', 'seder', 'spring', 'jewish'], [
  { id: 'ps-bg-cream', name: 'Cream florals', colors: ['#fbf6ec', '#7fa36a', '#e9a3b5'], tags: ['cream', 'floral', 'elegant', 'flowers', 'light'], draw: (c, W, H) => {
    const u = Math.min(W, H), k = u / 400;
    const corner = (tx: string) => `<g transform="${tx} scale(${f1(k)})">${leafSprig(0, 20, 160, 10, c[1])}${leafSprig(20, 0, 150, 70, lt(c[1], 0.1))}${blossom(60, 60, 30, c[2], '#f2b33d')}${blossom(120, 30, 20, '#ffffff', '#f2b33d', 30)}${blossom(30, 130, 18, '#ffffff', '#f2b33d', 10)}</g>`;
    return `<rect width="${W}" height="${H}" fill="${c[0]}"/>` + corner('translate(0 0)') + corner(`translate(${W} ${H}) rotate(180)`);
  } },
  { id: 'ps-bg-navy', name: 'Navy & gold', colors: ['#13254a', '#d4a940'], tags: ['navy', 'gold', 'elegant', 'pattern', 'luxury'], draw: (c, W, H) =>
    `<defs><pattern id="p" width="120" height="120" patternUnits="userSpaceOnUse"><polygon points="${starPts(60, 60, 8, 22, 15, -90)}" fill="none" stroke="${c[1]}" stroke-width="1.6" opacity=".55"/><path d="M0 0 L20 20 M120 0 L100 20 M0 120 L20 100 M120 120 L100 100" stroke="${c[1]}" stroke-width="1.4" opacity=".45"/></pattern><radialGradient id="r" cx="50%" cy="45%" r="75%"><stop offset="0" stop-color="${lt(c[0], 0.12)}"/><stop offset="1" stop-color="${dk(c[0], 0.3)}"/></radialGradient></defs><rect width="${W}" height="${H}" fill="url(#r)"/><rect width="${W}" height="${H}" fill="url(#p)"/>` },
  { id: 'ps-bg-spring', name: 'Spring blossoms', colors: ['#e3f2f8', '#fbfdf6', '#ffd1dc'], tags: ['spring', 'blossom', 'sky', 'light', 'pastel'], draw: (c, W, H) => {
    const u = Math.min(W, H), k = u / 500, r = rng(5);
    let g = `<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c[0]}"/><stop offset="1" stop-color="${c[1]}"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#s)"/>`;
    const branch = (tx: string) => `<g transform="${tx} scale(${f1(k)})"><path d="M0 40 C80 50 160 90 240 110 M100 62 C130 30 150 20 180 16" stroke="#6b4a3a" stroke-width="7" fill="none" stroke-linecap="round"/>${[[60, 46, 22], [140, 80, 20], [210, 104, 24], [170, 18, 16], [110, 38, 14]].map(([x, y, rr]) => blossom(x, y, rr, c[2], '#f2b33d', x)).join('')}</g>`;
    g += branch('translate(0 0)') + branch(`translate(${W} 0) scale(-1 1)`);
    for (let i = 0; i < Math.round((W * H) / 40000); i++) { const x = r() * W, y = H * 0.2 + r() * H * 0.8; g += `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(u * 0.008)}" ry="${f1(u * 0.012)}" fill="${c[2]}" opacity=".7" transform="rotate(${f1(r() * 180)} ${f1(x)} ${f1(y)})"/>`; }
    return g;
  } },
  { id: 'ps-bg-linen', name: 'White linen', colors: ['#f7f5ef', '#3f6fb0'], tags: ['linen', 'white', 'minimal', 'tablecloth', 'clean'], draw: (c, W, H) => {
    const u = Math.min(W, H), m = u * 0.05;
    return `<defs><pattern id="p" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="${c[0]}"/><path d="M0 3 H6 M3 0 V6" stroke="${dk(c[0], 0.05)}" stroke-width=".8"/></pattern></defs><rect width="${W}" height="${H}" fill="url(#p)"/>` +
      `<rect x="${f1(m)}" y="${f1(m)}" width="${f1(W - m * 2)}" height="${f1(H - m * 2)}" fill="none" stroke="${c[1]}" stroke-width="${f1(u * 0.008)}"/><rect x="${f1(m * 1.35)}" y="${f1(m * 1.35)}" width="${f1(W - m * 2.7)}" height="${f1(H - m * 2.7)}" fill="none" stroke="${c[1]}" stroke-width="${f1(u * 0.003)}"/>`;
  } },
  { id: 'ps-bg-wine', name: 'Burgundy & gold', colors: ['#3d0b1c', '#7d1a39', '#d4a940'], tags: ['burgundy', 'wine', 'gold', 'elegant', 'dinner'], draw: (c, W, H) =>
    `<defs><radialGradient id="r" cx="50%" cy="40%" r="80%"><stop offset="0" stop-color="${c[1]}"/><stop offset="1" stop-color="${c[0]}"/></radialGradient><pattern id="p" width="100" height="100" patternUnits="userSpaceOnUse"><path d="M50 10 C60 30 70 40 90 50 C70 60 60 70 50 90 C40 70 30 60 10 50 C30 40 40 30 50 10 Z" fill="none" stroke="${c[2]}" stroke-width="1.4" opacity=".34"/></pattern></defs><rect width="${W}" height="${H}" fill="url(#r)"/><rect width="${W}" height="${H}" fill="url(#p)"/>` },
]);

export const ASSETS: AssetDef[] = [...ILLUSTRATIONS, ...BGS];
