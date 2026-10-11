/**
 * East & South-East Asian festivals collection — original vector artwork drawn in code for Fuzzies (licence: original
 * Fuzzies artwork). Lunar New Year — round red lanterns with gold caps and tassels, red envelopes, firecrackers, plum
 * blossom, mandarin oranges, gold ingots, auspicious clouds. Mid-Autumn — mooncakes, the full moon with the jade rabbit,
 * rabbit and paper lanterns, osmanthus, tea. Dragon Boat (Duanwu) — dragon boats, zongzi tied with string, drum.
 * Vesak — the dharma wheel (eight spokes), Bodhi leaf, lotus and Vesak lanterns. No characters or deities are drawn.
 */
import type { AssetDef } from '../index';
import { asset, backgrounds, bokeh, dk, f1, glowDef, lt, rng, sparkle, starPts, stars } from '../draw';

const A = asset('asian', ['asian', 'festival', 'celebration']);
const LNY = ['lunar new year', 'chinese new year', 'spring festival', 'tet', 'seollal', '春节', '新年快乐', 'gong hei fat choi', 'xin nian kuai le', 'cny'];
const MAF = ['mid-autumn', 'mid autumn festival', 'moon festival', 'mooncake festival', '中秋节', 'chuseok', 'tet trung thu'];
const DBF = ['dragon boat festival', 'duanwu', '端午节', 'tuen ng'];
const VES = ['vesak', 'wesak', 'buddha day', 'buddha purnima', 'visakha bucha', 'buddhist'];

// ---------- drawings ----------
function lantern(id: string, x: number, y: number, s: number, red: string, gold: string, rope = true): string {
  return `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})"><defs><radialGradient id="${id}" cx="40%" cy="40%" r="70%"><stop offset="0" stop-color="${lt(red, 0.35)}"/><stop offset=".7" stop-color="${red}"/><stop offset="1" stop-color="${dk(red, 0.35)}"/></radialGradient>${glowDef(`${id}g`, '#ffb24a', 0.4)}</defs>` +
    (rope ? `<path d="M0 -120 V-62" stroke="${dk(gold, 0.4)}" stroke-width="3"/>` : '') + `<circle cx="0" cy="0" r="92" fill="url(#${id}g)"/>` +
    `<rect x="-26" y="-66" width="52" height="14" rx="4" fill="${gold}"/><rect x="-26" y="52" width="52" height="14" rx="4" fill="${gold}"/>` +
    `<ellipse cx="0" cy="0" rx="70" ry="58" fill="url(#${id})"/>` +
    [-44, -22, 0, 22, 44].map((k) => `<path d="M${k * 0.6} -56 C${k * 1.5} -30 ${k * 1.5} 30 ${k * 0.6} 56" stroke="${dk(red, 0.25)}" stroke-width="2.5" fill="none"/>`).join('') +
    `<path d="M0 66 V84" stroke="${gold}" stroke-width="4"/><circle cx="0" cy="86" r="6" fill="${gold}"/>` + [-8, -4, 0, 4, 8].map((k) => `<path d="M${k} 90 L${k * 1.4} 128" stroke="${red}" stroke-width="3"/>`).join('') +
    `<ellipse cx="-30" cy="-20" rx="10" ry="18" fill="#fff" opacity=".25" transform="rotate(20 -30 -20)"/></g>`;
}
function envelope(x: number, y: number, s: number, red: string, gold: string, rot = 0): string {
  return `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${rot}) scale(${s})"><rect x="-50" y="-76" width="100" height="152" rx="8" fill="${red}"/><path d="M-50 -60 Q0 -10 50 -60 V-68 C50 -73 46 -76 42 -76 H-42 C-46 -76 -50 -73 -50 -68 Z" fill="${dk(red, 0.15)}"/>` +
    `<circle cx="0" cy="-16" r="18" fill="${gold}"/><rect x="-6" y="-22" width="12" height="12" fill="${dk(red, 0.1)}"/><circle cx="0" cy="-16" r="13" fill="none" stroke="${dk(gold, 0.25)}" stroke-width="2"/>` +
    `<path d="M-36 30 H36 M-36 44 H36" stroke="${gold}" stroke-width="3" opacity=".8"/>` + [-24, 0, 24].map((k) => `<circle cx="${k}" cy="60" r="4" fill="${gold}"/>`).join('') + `</g>`;
}
function plumBranch(x: number, y: number, s: number, wood: string, petal: string, rot = 0): string {
  let g = `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${rot}) scale(${s})"><path d="M0 0 C40 -20 80 -20 120 -60 C150 -90 190 -96 230 -110 M120 -60 C130 -30 160 -20 190 -24 M60 -16 C70 -50 60 -80 80 -110" stroke="${wood}" stroke-width="7" fill="none" stroke-linecap="round"/>`;
  for (const [px, py, r] of [[230, -110, 14], [190, -24, 13], [80, -110, 12], [150, -86, 11], [40, -10, 10], [110, -52, 9], [200, -100, 8], [170, -26, 8]]) {
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; g += `<circle cx="${f1(px + Math.cos(a) * r * 0.62)}" cy="${f1(py + Math.sin(a) * r * 0.62)}" r="${f1(r * 0.5)}" fill="${i % 2 ? petal : lt(petal, 0.12)}"/>`; }
    g += `<circle cx="${px}" cy="${py}" r="${f1(r * 0.28)}" fill="#f6d36a"/>`;
  }
  return g + [[100, -30], [210, -80], [60, -70]].map(([bx, by]) => `<circle cx="${bx}" cy="${by}" r="5" fill="${dk(petal, 0.15)}"/>`).join('') + `</g>`;
}
function mandarin(x: number, y: number, r: number, c: string, leaf: string): string {
  return `<defs><radialGradient id="md${Math.round(x)}" cx="35%" cy="35%" r="70%"><stop offset="0" stop-color="${lt(c, 0.35)}"/><stop offset="1" stop-color="${dk(c, 0.2)}"/></radialGradient></defs><ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(r)}" ry="${f1(r * 0.9)}" fill="url(#md${Math.round(x)})"/>` +
    `<path d="M${f1(x)} ${f1(y - r * 0.9)} q${f1(r * 0.4)} ${f1(-r * 0.5)} ${f1(r * 0.9)} ${f1(-r * 0.3)} q${f1(-r * 0.4)} ${f1(r * 0.4)} ${f1(-r * 0.9)} ${f1(r * 0.3)}Z" fill="${leaf}"/><circle cx="${f1(x)}" cy="${f1(y - r * 0.88)}" r="${f1(r * 0.1)}" fill="${dk(leaf, 0.3)}"/>`;
}
function mooncake(x: number, y: number, s: number, crust: string): string {
  let g = `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})"><ellipse cx="0" cy="40" rx="86" ry="14" fill="#000" opacity=".14"/><path d="M-80 0 V24 C-80 44 80 44 80 24 V0 Z" fill="${dk(crust, 0.2)}"/>`;
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; g += `<circle cx="${f1(Math.cos(a) * 72)}" cy="${f1(Math.sin(a) * 26)}" r="12" fill="${crust}"/>`; }
  g += `<ellipse cx="0" cy="0" rx="70" ry="25" fill="${lt(crust, 0.08)}"/><ellipse cx="0" cy="0" rx="52" ry="18" fill="none" stroke="${dk(crust, 0.2)}" stroke-width="3"/>`;
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; g += `<ellipse cx="${f1(Math.cos(a) * 30)}" cy="${f1(Math.sin(a) * 10)}" rx="10" ry="4" fill="none" stroke="${dk(crust, 0.25)}" stroke-width="2.5" transform="rotate(${f1((a * 180) / Math.PI)} ${f1(Math.cos(a) * 30)} ${f1(Math.sin(a) * 10)})"/>`; }
  return g + `<circle cx="0" cy="0" r="6" fill="${dk(crust, 0.25)}"/></g>`;
}
function bunny(x: number, y: number, s: number, c: string, inner: string): string {
  return `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})"><ellipse cx="0" cy="52" rx="56" ry="6" fill="#000" opacity=".1"/><ellipse cx="-14" cy="-50" rx="11" ry="34" fill="${c}" transform="rotate(-14 -14 -50)"/><ellipse cx="14" cy="-50" rx="11" ry="34" fill="${c}" transform="rotate(14 14 -50)"/>` +
    `<ellipse cx="-14" cy="-48" rx="5" ry="24" fill="${inner}" transform="rotate(-14 -14 -48)"/><ellipse cx="14" cy="-48" rx="5" ry="24" fill="${inner}" transform="rotate(14 14 -48)"/>` +
    `<ellipse cx="6" cy="22" rx="48" ry="32" fill="${c}"/><circle cx="-12" cy="-2" r="30" fill="${c}"/><circle cx="50" cy="30" r="10" fill="#fff"/>` +
    `<circle cx="-22" cy="-6" r="4" fill="#c2405a"/><circle cx="-2" cy="-6" r="4" fill="#c2405a"/><ellipse cx="-12" cy="6" rx="4" ry="3" fill="${inner}"/></g>`;
}
function dragonBoat(hull: string, trim: string, head: string): string {
  let g = `<path d="M30 120 C120 140 380 140 470 116 L480 100 H20 Z" fill="${hull}"/><path d="M24 104 H476" stroke="${trim}" stroke-width="8"/>`;
  for (let i = 0; i < 14; i++) g += `<path d="M${40 + i * 31} 112 l10 -8 l10 8" stroke="${trim}" stroke-width="3" fill="none"/>`;
  // dragon head (left) and tail (right)
  g += `<path d="M30 104 C10 80 4 50 20 30 C34 12 60 14 70 30 C80 44 70 60 56 62 C66 72 64 90 50 104 Z" fill="${head}"/><circle cx="40" cy="36" r="6" fill="#fff"/><circle cx="41" cy="37" r="3" fill="#1d1622"/>` +
    `<path d="M20 30 L4 14 M30 22 L22 2" stroke="${trim}" stroke-width="4" stroke-linecap="round"/><path d="M14 52 C0 54 -4 64 6 68" stroke="${trim}" stroke-width="3" fill="none"/>`;
  g += `<path d="M470 104 C490 80 500 60 494 40 C510 56 510 86 480 108 Z" fill="${head}"/>`;
  for (let i = 0; i < 8; i++) { const x = 100 + i * 42; g += `<path d="M${x} 96 L${x - 26} 150" stroke="${dk(hull, 0.3)}" stroke-width="4" stroke-linecap="round"/><ellipse cx="${x - 28}" cy="152" rx="5" ry="10" fill="${dk(hull, 0.3)}" transform="rotate(30 ${x - 28} 152)"/><circle cx="${x}" cy="80" r="11" fill="${i % 2 ? '#f2c14e' : '#2e86de'}"/><path d="M${x - 10} 96 Q${x} 84 ${x + 10} 96" fill="${i % 2 ? '#f2c14e' : '#2e86de'}"/>`; }
  g += `<ellipse cx="440" cy="80" rx="18" ry="14" fill="#c4622d"/><path d="M440 66 V94" stroke="#fff" stroke-width="2"/>`;
  return g + `<path d="M0 150 Q60 140 120 150 T240 150 T360 150 T480 150 T600 150" stroke="#9bd3e6" stroke-width="5" fill="none" opacity=".8"/>`;
}
function zongzi(x: number, y: number, s: number, leaf: string, tie: string): string {
  return `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})"><ellipse cx="0" cy="54" rx="60" ry="7" fill="#000" opacity=".12"/><path d="M0 -60 L60 50 H-60 Z" fill="${leaf}"/><path d="M0 -60 L-60 50 H-10 Z" fill="${lt(leaf, 0.15)}"/><path d="M0 -60 L22 50" stroke="${dk(leaf, 0.2)}" stroke-width="2"/><path d="M-10 -40 L30 30 M10 -40 L-30 30" stroke="${dk(leaf, 0.12)}" stroke-width="1.5"/>` +
    `<path d="M-40 10 L40 10 M-26 -14 L26 -14 M0 -60 L0 50" stroke="${tie}" stroke-width="4"/><path d="M0 -60 q10 -14 22 -10" stroke="${tie}" stroke-width="3" fill="none"/></g>`;
}
function dharmaWheel(cx: number, cy: number, r: number, c: string): string {
  let g = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${c}" stroke-width="${f1(r * 0.1)}"/><circle cx="${cx}" cy="${cy}" r="${f1(r * 0.18)}" fill="${c}"/><circle cx="${cx}" cy="${cy}" r="${f1(r * 0.08)}" fill="${lt(c, 0.5)}"/>`;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
    g += `<path d="M${f1(cx + ca * r * 0.18)} ${f1(cy + sa * r * 0.18)} L${f1(cx + ca * r * 0.95)} ${f1(cy + sa * r * 0.95)}" stroke="${c}" stroke-width="${f1(r * 0.07)}"/><circle cx="${f1(cx + ca * r * 1.12)}" cy="${f1(cy + sa * r * 1.12)}" r="${f1(r * 0.09)}" fill="${c}"/>`;
  }
  return g;
}
function bodhiLeaf(x: number, y: number, s: number, c: string, rot = 0): string {
  let g = `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${rot}) scale(${s})"><path d="M0 -100 C40 -100 70 -60 60 -10 C52 30 20 60 4 110 C2 120 -2 120 -4 110 C-20 60 -52 30 -60 -10 C-70 -60 -40 -100 0 -100 Z" fill="${c}"/><path d="M0 -110 V110" stroke="${dk(c, 0.25)}" stroke-width="3"/>`;
  for (let i = 0; i < 5; i++) { const py = -70 + i * 26; g += `<path d="M0 ${py} Q30 ${py - 8} 46 ${py - 26} M0 ${py} Q-30 ${py - 8} -46 ${py - 26}" stroke="${dk(c, 0.2)}" stroke-width="1.8" fill="none"/>`; }
  return g + `<path d="M0 -114 V-140" stroke="${dk(c, 0.3)}" stroke-width="4"/></g>`;
}
function cloudMotif(x: number, y: number, s: number, c: string): string {
  return `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})" fill="none" stroke="${c}" stroke-width="5" stroke-linecap="round"><path d="M-60 20 H60 C80 20 84 -4 66 -10 C70 -30 46 -40 34 -26 C30 -50 -4 -54 -12 -30 C-24 -44 -48 -36 -44 -16 C-64 -16 -72 10 -60 20 Z"/><path d="M-30 6 C-30 -6 -14 -8 -12 2 M14 2 C16 -12 36 -12 36 0"/></g>`;
}

// ---------- assets ----------
export const ASSETS: AssetDef[] = [
  A('as-lantern', 'Red lantern', 'illustration', 200, 330, ['#d7263d', '#e8b94a'], [...LNY, 'lantern', 'red lantern', 'denglong'], (c) => lantern('l', 100, 160, 1, c[0], c[1])),
  A('as-lanterns', 'Hanging lanterns', 'decoration', 420, 300, ['#d7263d', '#e8b94a'], [...LNY, ...MAF, 'lanterns', 'hanging', 'red', 'border'], (c) =>
    `<path d="M0 10 Q210 50 420 10" stroke="${dk(c[1], 0.4)}" stroke-width="3" fill="none"/>` + lantern('a', 70, 150, 0.62, c[0], c[1]) + lantern('b', 210, 186, 0.78, c[0], c[1]) + lantern('c', 350, 150, 0.62, c[0], c[1])),
  A('as-envelopes', 'Red envelopes', 'illustration', 260, 220, ['#d7263d', '#e8b94a'], [...LNY, 'red envelope', 'hongbao', 'lai see', 'ang pao', 'lucky money', 'gift'], (c) => envelope(90, 116, 1, c[0], c[1], -12) + envelope(170, 104, 1, c[0], c[1], 10)),
  A('as-firecrackers', 'Firecrackers', 'illustration', 140, 320, ['#d7263d', '#e8b94a'], [...LNY, 'firecrackers', 'bianpao', 'celebration'], (c) => {
    let g = `<path d="M70 0 V300" stroke="${dk(c[1], 0.3)}" stroke-width="3"/>`;
    for (let i = 0; i < 10; i++) { const y = 30 + i * 26, side = i % 2 ? 1 : -1; g += `<g transform="rotate(${side * 28} 70 ${y})"><rect x="${70 + (side > 0 ? 4 : -42)}" y="${y - 9}" width="38" height="18" rx="4" fill="${c[0]}"/><rect x="${70 + (side > 0 ? 8 : -38)}" y="${y - 9}" width="6" height="18" fill="${c[1]}"/></g>`; }
    return g + `<path d="M70 300 l-10 16 M70 300 l10 16 M70 300 v18" stroke="${c[1]}" stroke-width="4" stroke-linecap="round"/>` + sparkle(70, 316, 10, '#ffd25a');
  }),
  A('as-plum', 'Plum blossom branch', 'decoration', 260, 140, ['#4a3328', '#e4577a'], [...LNY, 'plum blossom', 'meihua', 'blossom', 'spring', 'branch', 'flowers'], (c) => plumBranch(10, 128, 1, c[0], c[1])),
  A('as-mandarins', 'Mandarin oranges', 'illustration', 240, 150, ['#f28c1e', '#3f7a3a'], [...LNY, 'mandarin', 'oranges', 'tangerine', 'luck'], (c) => `<ellipse cx="120" cy="140" rx="100" ry="8" fill="#000" opacity=".12"/>` + mandarin(70, 96, 42, c[0], c[1]) + mandarin(170, 98, 40, c[0], c[1]) + mandarin(120, 64, 40, c[0], c[1])),
  A('as-ingot', 'Gold ingot', 'illustration', 220, 140, ['#e8b94a'], [...LNY, 'gold ingot', 'yuanbao', 'prosperity', 'wealth'], (c) =>
    `<defs><linearGradient id="ig" x1="0" x2="1"><stop offset="0" stop-color="${lt(c[0], 0.4)}"/><stop offset=".5" stop-color="${c[0]}"/><stop offset="1" stop-color="${dk(c[0], 0.3)}"/></linearGradient></defs><ellipse cx="110" cy="128" rx="90" ry="8" fill="#000" opacity=".12"/>` +
    `<path d="M10 50 C20 40 40 40 50 60 H170 C180 40 200 40 210 50 C204 90 170 120 110 120 C50 120 16 90 10 50 Z" fill="url(#ig)"/><ellipse cx="110" cy="58" rx="56" ry="28" fill="${lt(c[0], 0.2)}"/><ellipse cx="110" cy="52" rx="40" ry="22" fill="url(#ig)"/><ellipse cx="96" cy="44" rx="12" ry="6" fill="#fff" opacity=".5"/>`),
  A('as-clouds', 'Auspicious clouds', 'decoration', 300, 120, ['#e8b94a'], [...LNY, ...MAF, 'clouds', 'xiangyun', 'pattern', 'ornament'], (c) => cloudMotif(80, 70, 1, c[0]) + cloudMotif(220, 50, 0.8, c[0])),
  A('as-mooncakes', 'Mooncakes', 'illustration', 300, 180, ['#c98a3c', '#3f7a3a'], [...MAF, 'mooncake', 'mooncakes', 'yuebing', 'pastry'], (c) =>
    `<ellipse cx="150" cy="150" rx="140" ry="22" fill="${c[1]}" opacity=".85"/>` + mooncake(96, 106, 0.85, c[0]) + mooncake(206, 112, 0.8, c[0]) + mooncake(150, 72, 0.9, c[0])),
  A('as-moon-rabbit', 'Full moon & rabbit', 'illustration', 260, 260, ['#fff1c4', '#f2d27a', '#ffffff'], [...MAF, 'full moon', 'moon', 'jade rabbit', 'rabbit', 'chang e', 'night'], (c) =>
    `<defs><radialGradient id="mn" cx="40%" cy="38%" r="70%"><stop offset="0" stop-color="${c[0]}"/><stop offset="1" stop-color="${c[1]}"/></radialGradient>${glowDef('mg', c[0], 0.5)}</defs><circle cx="130" cy="120" r="126" fill="url(#mg)"/><circle cx="130" cy="120" r="96" fill="url(#mn)"/>` +
    [[100, 90, 16], [160, 140, 12], [140, 80, 8], [96, 150, 9]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${dk(c[1], 0.08)}" opacity=".5"/>`).join('') + bunny(150, 214, 0.8, c[2], '#f4b6c2')),
  A('as-rabbit', 'Moon rabbit', 'illustration', 160, 150, ['#ffffff', '#f4b6c2'], [...MAF, 'rabbit', 'bunny', 'jade rabbit', 'cute'], (c) => bunny(80, 90, 1, c[0], c[1])),
  A('as-paper-lanterns', 'Paper lanterns', 'decoration', 420, 260, ['#e8574a', '#f2c14e', '#2e86de', '#e8b94a'], [...MAF, ...VES, 'lanterns', 'paper lanterns', 'festival'], (c) => {
    let g = `<path d="M0 10 Q210 46 420 10" stroke="#6b5a4a" stroke-width="3" fill="none"/>`;
    [[60, 120, c[0]], [150, 160, c[1]], [250, 150, c[2]], [350, 118, c[0]]].forEach(([x, y, col], i) => {
      const cx = x as number, cy = y as number, k = col as string;
      g += `<path d="M${cx} ${i % 3 ? 22 : 16} V${cy - 44}" stroke="#6b5a4a" stroke-width="2"/><defs>${glowDef(`pl${i}`, '#ffd27a', 0.5)}</defs><circle cx="${cx}" cy="${cy}" r="60" fill="url(#pl${i})"/><rect x="${cx - 16}" y="${cy - 48}" width="32" height="8" rx="3" fill="${c[3]}"/><ellipse cx="${cx}" cy="${cy}" rx="34" ry="42" fill="${k}"/><path d="M${cx - 34} ${cy} H${cx + 34} M${cx} ${cy - 42} V${cy + 42}" stroke="${dk(k, 0.2)}" stroke-width="2" opacity=".5"/><rect x="${cx - 16}" y="${cy + 40}" width="32" height="8" rx="3" fill="${c[3]}"/><path d="M${cx} ${cy + 48} V${cy + 72}" stroke="${c[3]}" stroke-width="4"/>`;
    });
    return g;
  }),
  A('as-osmanthus', 'Osmanthus sprig', 'decoration', 240, 140, ['#f2a541', '#4f7a3a'], [...MAF, 'osmanthus', 'guihua', 'flowers', 'autumn'], (c) => {
    let g = `<path d="M10 130 C60 100 120 80 220 30" stroke="#6b4a32" stroke-width="5" fill="none"/>`;
    const r = rng(4);
    for (let i = 0; i < 9; i++) { const t = i / 9, x = 10 + t * 210, y = 130 - t * 100; g += `<ellipse cx="${f1(x + 14)}" cy="${f1(y - 14)}" rx="22" ry="9" fill="${c[1]}" transform="rotate(-40 ${f1(x + 14)} ${f1(y - 14)})"/>`; for (let k = 0; k < 4; k++) g += `<circle cx="${f1(x + r() * 20 - 4)}" cy="${f1(y + 8 + r() * 10)}" r="4.5" fill="${c[0]}"/>`; }
    return g;
  }),
  A('as-tea', 'Teapot & cups', 'illustration', 280, 180, ['#5a8f86', '#f6efe2'], [...MAF, 'tea', 'teapot', 'gathering', 'family'], (c) =>
    `<ellipse cx="140" cy="170" rx="120" ry="8" fill="#000" opacity=".12"/><path d="M60 80 C60 150 80 166 120 166 C160 166 180 150 180 80 Z" fill="${c[0]}"/><ellipse cx="120" cy="80" rx="60" ry="12" fill="${dk(c[0], 0.15)}"/><path d="M100 62 Q120 44 140 62 Z" fill="${dk(c[0], 0.15)}"/><circle cx="120" cy="50" r="6" fill="${dk(c[0], 0.2)}"/>` +
    `<path d="M178 100 C214 92 226 76 232 66" stroke="${c[0]}" stroke-width="12" fill="none" stroke-linecap="round"/><path d="M62 96 C30 96 30 140 64 140" stroke="${c[0]}" stroke-width="8" fill="none"/><path d="M80 110 C100 116 140 116 160 110" stroke="${c[1]}" stroke-width="4" fill="none"/>` +
    [[220, 150], [256, 150]].map(([x, y]) => `<path d="M${x - 16} ${y - 22} H${x + 16} L${x + 12} ${y} H${x - 12} Z" fill="${c[1]}"/><path d="M${x - 16} ${y - 22} H${x + 16}" stroke="${dk(c[1], 0.2)}" stroke-width="3"/>`).join('')),
  A('as-dragon-boat', 'Dragon boat', 'illustration', 520, 170, ['#c4402d', '#e8b94a', '#2f8a5a'], [...DBF, 'dragon boat', 'boat race', 'paddles', 'race'], (c) => dragonBoat(c[0], c[1], c[2])),
  A('as-zongzi', 'Zongzi', 'illustration', 260, 150, ['#5f9a4a', '#c69a5a'], [...DBF, 'zongzi', 'rice dumplings', 'food'], (c) => zongzi(80, 84, 0.95, c[0], c[1]) + zongzi(180, 88, 0.9, '#6aa652', c[1])),
  A('as-dharma-wheel', 'Dharma wheel', 'illustration', 220, 220, ['#d9a12b'], [...VES, 'dharma wheel', 'dharmachakra', 'wheel', 'buddhism'], (c) => dharmaWheel(110, 110, 80, c[0])),
  A('as-bodhi-leaf', 'Bodhi leaf', 'illustration', 160, 260, ['#5f9a4a'], [...VES, 'bodhi leaf', 'bodhi tree', 'leaf', 'peace', 'meditation'], (c) => bodhiLeaf(80, 128, 1, c[0])),
  A('as-vesak-lantern', 'Vesak lantern', 'illustration', 200, 320, ['#f2c14e', '#e8574a', '#ffffff'], [...VES, 'vesak lantern', 'vesak kudu', 'lantern', 'light'], (c) =>
    `<defs>${glowDef('vl', c[0], 0.55)}</defs><path d="M100 0 V60" stroke="#6b5a4a" stroke-width="2"/><circle cx="100" cy="150" r="100" fill="url(#vl)"/><polygon points="${starPts(100, 150, 8, 86, 60, -90)}" fill="${c[0]}" stroke="${c[1]}" stroke-width="4" stroke-linejoin="round"/><polygon points="${starPts(100, 150, 8, 54, 36, -67.5)}" fill="${c[2]}" opacity=".9"/><circle cx="100" cy="150" r="18" fill="${c[1]}"/>` +
    [70, 90, 110, 130].map((x, i) => `<path d="M${x} 228 C${x + 4} 260 ${x - 4} 280 ${x} ${300 + (i % 2) * 14}" stroke="${i % 2 ? c[1] : c[0]}" stroke-width="5" fill="none" stroke-linecap="round"/>`).join('')),
  A('as-sparkles', 'Gold sparkles', 'decoration', 300, 200, ['#e8b94a', '#fff3c4'], ['sparkles', 'stars', 'gold'], (c) => {
    const r = rng(61); let g = '';
    for (let i = 0; i < 20; i++) { const x = r() * 300, y = r() * 200; g += i % 3 ? sparkle(x, y, 3 + r() * 7, i % 2 ? c[0] : c[1], 0.9) : `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(2 + r() * 3)}" fill="${c[0]}"/>`; }
    return g;
  }),
];

// ---------- backgrounds ----------
const BGS = backgrounds('asian', ['asian', 'festival'], [
  { id: 'as-bg-red', name: 'Lucky red', colors: ['#8f0f1f', '#c8182e', '#e8b94a'], tags: [...LNY, 'red', 'gold', 'luxury', 'pattern'], draw: (c, W, H) => {
    const u = Math.min(W, H), r = rng(3);
    let g = `<defs><radialGradient id="r" cx="50%" cy="40%" r="80%"><stop offset="0" stop-color="${c[1]}"/><stop offset="1" stop-color="${c[0]}"/></radialGradient></defs><rect width="${W}" height="${H}" fill="url(#r)"/>`;
    for (let i = 0; i < Math.round((W * H) / 90000); i++) g += `<g opacity=".18">${cloudMotif(r() * W, r() * H, u / 700, c[2])}</g>`;
    const m = u * 0.035;
    return g + `<rect x="${f1(m)}" y="${f1(m)}" width="${f1(W - m * 2)}" height="${f1(H - m * 2)}" fill="none" stroke="${c[2]}" stroke-width="${f1(u * 0.005)}"/>`;
  } },
  { id: 'as-bg-moon-night', name: 'Moonlit night', colors: ['#0f1c3d', '#24396b', '#fff1c4'], tags: [...MAF, 'night', 'moonlight', 'blue', 'stars'], draw: (c, W, H) => {
    const u = Math.min(W, H);
    return `<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c[0]}"/><stop offset="1" stop-color="${c[1]}"/></linearGradient>${glowDef('mg', c[2], 0.45)}<radialGradient id="mn" cx="40%" cy="38%" r="70%"><stop offset="0" stop-color="${c[2]}"/><stop offset="1" stop-color="#f2d27a"/></radialGradient></defs><rect width="${W}" height="${H}" fill="url(#s)"/>` +
      stars(W, H, '#fff6d8', Math.round((W * H) / 14000), 33, 2.2) + `<ellipse cx="${f1(W / 2)}" cy="${f1(H)}" rx="${f1(W * 0.8)}" ry="${f1(u * 0.5)}" fill="url(#mg)"/>`;
  } },
  { id: 'as-bg-cream', name: 'Plum blossom cream', colors: ['#fbf4ea', '#4a3328', '#e4577a'], tags: [...LNY, 'cream', 'blossom', 'minimal', 'elegant'], draw: (c, W, H) => {
    const u = Math.min(W, H);
    return `<rect width="${W}" height="${H}" fill="${c[0]}"/>` + plumBranch(-u * 0.02, u * 0.28, u / 400, c[1], c[2], 0) + `<g transform="translate(${W} ${H}) scale(-1 -1)">${plumBranch(-u * 0.02, u * 0.22, u / 520, c[1], c[2], 0)}</g>`;
  } },
  { id: 'as-bg-river', name: 'River race', colors: ['#bfe6f2', '#5fb3cc', '#ffffff'], tags: [...DBF, 'river', 'water', 'blue', 'summer'], draw: (c, W, H) => {
    const u = Math.min(W, H);
    let g = `<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${lt(c[0], 0.4)}"/><stop offset=".55" stop-color="${c[0]}"/><stop offset="1" stop-color="${c[1]}"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#s)"/>`;
    for (let i = 0; i < 9; i++) { const y = H * (0.55 + i * 0.05); let d = `M0 ${f1(y)}`; for (let x = 0; x <= W; x += u * 0.08) d += ` q${f1(u * 0.02)} ${f1(-u * 0.012)} ${f1(u * 0.04)} 0 t${f1(u * 0.04)} 0`; g += `<path d="${d}" stroke="${c[2]}" stroke-width="${f1(u * 0.004)}" fill="none" opacity="${(0.25 + i * 0.05).toFixed(2)}"/>`; }
    return g;
  } },
  { id: 'as-bg-saffron', name: 'Saffron dawn', colors: ['#fff3d6', '#f6c25a', '#e8913a'], tags: [...VES, 'saffron', 'warm', 'dawn', 'peace', 'light'], draw: (c, W, H) => {
    const u = Math.min(W, H);
    return `<defs><radialGradient id="r" cx="50%" cy="30%" r="85%"><stop offset="0" stop-color="${c[0]}"/><stop offset=".6" stop-color="${c[1]}"/><stop offset="1" stop-color="${c[2]}"/></radialGradient></defs><rect width="${W}" height="${H}" fill="url(#r)"/>` +
      bokeh(W, H, ['#ffffff', c[0]], Math.round((W * H) / 50000), 15, u * 0.05, 'bk') + dharmaWheel(W / 2, H * 0.3, u * 0.32, '#ffffff').replace(/<(circle|path)/g, '<$1 opacity=".12"');
  } },
]);

ASSETS.push(...BGS);
