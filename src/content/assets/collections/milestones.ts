/**
 * Life milestones collection — original vector artwork drawn in code for Fuzzies (licence: original Fuzzies artwork).
 * Weddings and engagements (rings, bouquet, cake, champagne, floral arch), anniversaries, graduations (mortarboard,
 * diploma), retirements, housewarmings (house and key, plants), Mother's and Father's Day, quinceañeras and sweet 16
 * (tiara, number balloons via text), bar and bat mitzvahs (tallit — use with the Jewish collection's Torah), and gentle
 * memorial pieces (candle, forget-me-nots, soft light).
 */
import type { AssetDef } from '../index';
import { asset, backgrounds, blossom, bokeh, dk, f1, flame, glowDef, lt, mix, rng, sparkle, starPts } from '../draw';

const A = asset('milestones', ['milestone', 'celebration', 'life event']);

// ---------- drawings ----------
function ring(id: string, cx: number, cy: number, r: number, metal: string, gem?: string): string {
  let g = `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${lt(metal, 0.5)}"/><stop offset=".5" stop-color="${metal}"/><stop offset="1" stop-color="${dk(metal, 0.35)}"/></linearGradient></defs>`;
  g += `<ellipse cx="${cx}" cy="${cy}" rx="${r}" ry="${f1(r * 0.92)}" fill="none" stroke="url(#${id})" stroke-width="${f1(r * 0.2)}"/>`;
  if (gem) g += `<path d="M${f1(cx - r * 0.34)} ${f1(cy - r * 1.02)} L${f1(cx - r * 0.2)} ${f1(cy - r * 1.3)} H${f1(cx + r * 0.2)} L${f1(cx + r * 0.34)} ${f1(cy - r * 1.02)} L${f1(cx)} ${f1(cy - r * 0.7)} Z" fill="${gem}" stroke="${dk(gem, 0.25)}" stroke-width="2"/><path d="M${f1(cx - r * 0.2)} ${f1(cy - r * 1.3)} L${f1(cx)} ${f1(cy - r * 1.02)} L${f1(cx + r * 0.2)} ${f1(cy - r * 1.3)} M${f1(cx - r * 0.34)} ${f1(cy - r * 1.02)} H${f1(cx + r * 0.34)}" stroke="#fff" stroke-width="1.5" opacity=".8" fill="none"/>` + sparkle(cx + r * 0.5, cy - r * 1.35, r * 0.18, '#ffffff');
  return g;
}
function rose(x: number, y: number, r: number, c: string): string {
  let g = `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}" fill="${c}"/>`;
  for (let k = 0; k < 3; k++) g += `<path d="M${f1(x - r * (0.8 - k * 0.22))} ${f1(y + r * 0.1)} C${f1(x - r * (0.7 - k * 0.2))} ${f1(y - r * (0.8 - k * 0.2))} ${f1(x + r * (0.7 - k * 0.2))} ${f1(y - r * (0.8 - k * 0.2))} ${f1(x + r * (0.8 - k * 0.22))} ${f1(y + r * 0.1)}" stroke="${dk(c, 0.18 + k * 0.05)}" stroke-width="${f1(r * 0.08)}" fill="none"/>`;
  return g + `<path d="M${f1(x - r * 0.2)} ${f1(y - r * 0.05)} q${f1(r * 0.2)} ${f1(-r * 0.3)} ${f1(r * 0.4)} 0" stroke="${dk(c, 0.3)}" stroke-width="${f1(r * 0.08)}" fill="none"/>`;
}
function leafy(x: number, y: number, len: number, rot: number, c: string): string {
  return `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(len)}" ry="${f1(len * 0.38)}" fill="${c}" transform="rotate(${rot} ${f1(x)} ${f1(y)})"/>`;
}
function bouquet(c: string[], seed: number): string {
  const r = rng(seed);
  let g = `<path d="M110 260 L130 170 L150 260 Z" fill="${c[3]}"/><path d="M104 200 Q130 190 156 200 L152 214 Q130 206 108 214 Z" fill="${c[4]}"/><path d="M130 214 L118 244 M130 214 L144 246" stroke="${c[4]}" stroke-width="5" stroke-linecap="round"/>`;
  for (let i = 0; i < 12; i++) { const a = -Math.PI + (i / 11) * Math.PI, d = 70 + r() * 30; g += leafy(130 + Math.cos(a) * d, 120 + Math.sin(a) * d * 0.8, 22 + r() * 8, (a * 180) / Math.PI, i % 2 ? c[3] : lt(c[3], 0.15)); }
  for (const [x, y, rr, k] of [[96, 110, 30, 0], [164, 104, 28, 1], [130, 76, 30, 2], [130, 136, 26, 1], [78, 150, 22, 2], [182, 148, 22, 0], [104, 56, 18, 1], [158, 54, 18, 0]] as const) g += rose(x, y, rr, c[k]);
  for (let i = 0; i < 14; i++) g += `<circle cx="${f1(60 + r() * 140)}" cy="${f1(40 + r() * 120)}" r="${f1(3 + r() * 3)}" fill="#ffffff" opacity=".9"/>`;
  return g;
}
function cake(c: string[]): string {
  let g = `<ellipse cx="130" cy="290" rx="110" ry="10" fill="#000" opacity=".12"/><rect x="40" y="276" width="180" height="10" rx="5" fill="${c[3]}"/>`;
  const tiers: [number, number, number][] = [[60, 200, 76], [80, 136, 64], [98, 84, 52]];
  for (const [x, y, h] of tiers) {
    const w = 260 - x * 2;
    g += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${c[0]}"/><rect x="${x + w * 0.62}" y="${y}" width="${w * 0.38}" height="${h}" rx="8" fill="${dk(c[0], 0.05)}"/>`;
    g += `<path d="M${x} ${y + 10} ${Array.from({ length: 8 }, (_, i) => `q${f1(w / 16)} ${i % 2 ? -6 : 14} ${f1(w / 8)} 0`).join(' ')}" stroke="${c[1]}" stroke-width="5" fill="none"/>`;
    for (let i = 0; i < 6; i++) g += `<circle cx="${f1(x + 10 + i * ((w - 20) / 5))}" cy="${y + h - 8}" r="4" fill="${c[1]}"/>`;
  }
  return g + rose(130, 72, 14, c[2]) + rose(112, 80, 10, c[2]) + rose(148, 80, 10, c[2]) + leafy(96, 82, 10, -20, c[4]) + leafy(164, 82, 10, 20, c[4]);
}
function flute(x: number, y: number, rot: number, glass: string, drink: string): string {
  return `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${rot})"><path d="M-22 -110 H22 C24 -60 14 -24 4 -16 V40 H-4 V-16 C-14 -24 -24 -60 -22 -110 Z" fill="${glass}" opacity=".55" stroke="${dk(glass, 0.25)}" stroke-width="2"/><path d="M-20 -80 H20 C20 -50 12 -26 0 -20 C-12 -26 -20 -50 -20 -80 Z" fill="${drink}"/><ellipse cx="0" cy="44" rx="24" ry="5" fill="${glass}" opacity=".7" stroke="${dk(glass, 0.25)}" stroke-width="2"/>` +
    [[-6, -60], [6, -48], [-2, -36], [8, -70]].map(([bx, by]) => `<circle cx="${bx}" cy="${by}" r="2.2" fill="#fff" opacity=".8"/>`).join('') + `<path d="M-14 -104 C-14 -80 -10 -50 -4 -30" stroke="#fff" stroke-width="3" fill="none" opacity=".6"/></g>`;
}
function mortarboard(cap: string, tassel: string): string {
  return `<path d="M140 30 L270 80 L140 130 L10 80 Z" fill="${cap}"/><path d="M140 30 L270 80 L140 92 Z" fill="${lt(cap, 0.15)}"/><path d="M60 100 V150 C60 176 220 176 220 150 V100 L140 130 Z" fill="${dk(cap, 0.15)}"/>` +
    `<circle cx="140" cy="80" r="7" fill="${tassel}"/><path d="M140 80 C190 84 222 92 232 100 V150" stroke="${tassel}" stroke-width="4" fill="none"/><path d="M226 146 h12 l4 36 h-20 Z" fill="${tassel}"/>` + [228, 232, 236].map((x) => `<path d="M${x} 180 V196" stroke="${tassel}" stroke-width="2"/>`).join('');
}
function diploma(paper: string, ribbon: string): string {
  return `<g transform="rotate(-18 140 70)"><rect x="30" y="50" width="220" height="44" rx="22" fill="${paper}" stroke="${dk(paper, 0.15)}" stroke-width="2"/><ellipse cx="250" cy="72" rx="12" ry="22" fill="${dk(paper, 0.08)}"/><ellipse cx="250" cy="72" rx="5" ry="10" fill="${dk(paper, 0.2)}"/>` +
    `<rect x="124" y="48" width="20" height="48" fill="${ribbon}"/><path d="M134 96 L120 130 L134 122 L148 130 Z" fill="${ribbon}"/></g>`;
}
function house(wall: string, roof: string, door: string, win: string): string {
  return `<ellipse cx="150" cy="232" rx="130" ry="9" fill="#000" opacity=".1"/><rect x="190" y="40" width="26" height="60" fill="${dk(roof, 0.2)}"/><path d="M30 120 L150 30 L270 120 Z" fill="${roof}"/><path d="M150 30 L270 120 H240 Z" fill="${dk(roof, 0.12)}"/>` +
    `<rect x="50" y="116" width="200" height="114" fill="${wall}"/><rect x="190" y="116" width="60" height="114" fill="${dk(wall, 0.06)}"/>` +
    `<rect x="126" y="150" width="48" height="80" rx="4" fill="${door}"/><circle cx="164" cy="192" r="4" fill="#e8c46a"/>` + [[70, 146], [196, 146]].map(([x, y]) => `<rect x="${x}" y="${y}" width="36" height="36" rx="3" fill="${win}"/><path d="M${x + 18} ${y} V${y + 36} M${x} ${y + 18} H${x + 36}" stroke="${wall}" stroke-width="3"/>`).join('') +
    `<path d="M40 230 H260" stroke="${dk(wall, 0.2)}" stroke-width="4"/>` + [[60, 220], [240, 220]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="16" fill="#6aa04a"/><circle cx="${x + 10}" cy="${y - 6}" r="12" fill="#7fb35a"/>`).join('');
}
function key(x: number, y: number, s: number, c: string, rot = 0): string {
  return `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${rot}) scale(${s})"><circle cx="0" cy="0" r="26" fill="none" stroke="${c}" stroke-width="10"/><path d="M26 0 H110 M86 0 V18 M100 0 V14" stroke="${c}" stroke-width="10" stroke-linecap="round"/></g>`;
}
function plant(x: number, y: number, s: number, leaf: string, pot: string): string {
  let g = `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})"><path d="M-40 0 H40 L32 60 H-32 Z" fill="${pot}"/><rect x="-44" y="-8" width="88" height="14" rx="4" fill="${dk(pot, 0.12)}"/>`;
  for (const [a, l] of [[-60, 80], [-30, 100], [0, 110], [30, 96], [60, 78]] as const) {
    const rad = ((a - 90) * Math.PI) / 180, ex = Math.cos(rad) * l, ey = Math.sin(rad) * l;
    g += `<path d="M0 -8 Q${f1(ex * 0.3)} ${f1(ey * 0.6)} ${f1(ex)} ${f1(ey)}" stroke="${dk(leaf, 0.2)}" stroke-width="3" fill="none"/><ellipse cx="${f1(ex)}" cy="${f1(ey)}" rx="26" ry="16" fill="${leaf}" transform="rotate(${a} ${f1(ex)} ${f1(ey)})"/><path d="M${f1(ex)} ${f1(ey - 12)} V${f1(ey + 12)}" stroke="${lt(leaf, 0.3)}" stroke-width="2" transform="rotate(${a} ${f1(ex)} ${f1(ey)})"/>`;
  }
  return g + `</g>`;
}
function tiara(metal: string, gem: string, gem2: string): string {
  let g = `<defs><linearGradient id="ti" x1="0" x2="1"><stop offset="0" stop-color="${lt(metal, 0.5)}"/><stop offset=".5" stop-color="${metal}"/><stop offset="1" stop-color="${dk(metal, 0.3)}"/></linearGradient></defs>`;
  g += `<path d="M20 150 C60 130 220 130 260 150" stroke="url(#ti)" stroke-width="10" fill="none" stroke-linecap="round"/>`;
  g += `<path d="M40 142 C50 100 70 90 80 124 C90 84 110 60 140 40 C170 60 190 84 200 124 C210 90 230 100 240 142" stroke="url(#ti)" stroke-width="6" fill="none"/>`;
  g += `<path d="M80 124 C100 120 120 100 140 80 C160 100 180 120 200 124" stroke="url(#ti)" stroke-width="4" fill="none"/>`;
  g += `<path d="M140 22 L152 46 L140 64 L128 46 Z" fill="${gem}" stroke="#fff" stroke-width="1.5"/><circle cx="80" cy="118" r="8" fill="${gem2}"/><circle cx="200" cy="118" r="8" fill="${gem2}"/>`;
  for (let i = 0; i < 9; i++) g += `<circle cx="${40 + i * 25}" cy="${144 - Math.sin((i / 8) * Math.PI) * 10}" r="4" fill="#fff"/>`;
  return g + sparkle(140, 14, 10, '#fff') + sparkle(250, 96, 8, '#fff') + sparkle(30, 104, 6, '#fff');
}
function tallit(cloth: string, stripe: string): string {
  let g = `<path d="M30 30 H270 L250 210 H50 Z" fill="${cloth}"/><path d="M30 30 H270" stroke="${dk(cloth, 0.08)}" stroke-width="6"/>`;
  for (const y of [70, 84, 160, 174]) g += `<path d="M${36 + (y - 30) * 0.11} ${y} H${264 - (y - 30) * 0.11}" stroke="${stripe}" stroke-width="${y === 84 || y === 160 ? 4 : 9}"/>`;
  g += `<rect x="110" y="24" width="80" height="20" rx="3" fill="${lt(stripe, 0.2)}"/>`;
  for (const x of [56, 244]) g += `<path d="M${x} 210 V250 M${x + 6} 210 V246 M${x - 6} 210 V246" stroke="${cloth}" stroke-width="3"/><circle cx="${x}" cy="214" r="4" fill="${dk(cloth, 0.15)}"/>`;
  return g;
}
function tie(c: string, dot: string): string {
  return `<path d="M100 20 H140 L130 50 H110 Z" fill="${dk(c, 0.15)}"/><path d="M110 50 H130 L156 190 L120 230 L84 190 Z" fill="${c}"/>` + [[112, 90], [128, 120], [108, 150], [130, 180], [118, 206]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5" fill="${dot}"/>`).join('') +
    `<path d="M70 26 C90 6 150 6 170 26" stroke="${lt(c, 0.6)}" stroke-width="6" fill="none"/>`;
}
function mug(c: string, steam: string): string {
  return `<ellipse cx="110" cy="200" rx="80" ry="8" fill="#000" opacity=".12"/><rect x="50" y="80" width="110" height="120" rx="14" fill="${c}"/><path d="M160 104 C200 104 200 170 160 170" stroke="${c}" stroke-width="14" fill="none"/><ellipse cx="105" cy="82" rx="55" ry="10" fill="${dk(c, 0.2)}"/>` +
    `<path d="M105 120 C95 108 78 112 80 126 C82 140 98 146 105 154 C112 146 128 140 130 126 C132 112 115 108 105 120 Z" fill="#fff" opacity=".85"/>` +
    [80, 105, 130].map((x) => `<path d="M${x} 66 C${x - 10} 52 ${x + 10} 40 ${x} 26" stroke="${steam}" stroke-width="5" fill="none" stroke-linecap="round" opacity=".6"/>`).join('');
}
function beachChair(c: string, stripe: string): string {
  return `<path d="M160 10 C100 10 50 40 40 70 H280 C270 40 220 10 160 10 Z" fill="${stripe}"/><path d="M160 10 C140 30 130 50 128 70 H192 C190 50 180 30 160 10 Z" fill="#fff"/><path d="M160 10 V230" stroke="#8a6a4a" stroke-width="6"/>` +
    `<path d="M60 230 L100 120 L180 120 L220 230" stroke="#8a6a4a" stroke-width="6" fill="none"/><path d="M96 130 L170 130 L200 200 H90 Z" fill="${c}"/>` + [110, 130, 150, 170].map((x) => `<path d="M${x} 130 L${x + 12} 200" stroke="#fff" stroke-width="5" opacity=".7"/>`).join('') +
    `<ellipse cx="160" cy="236" rx="140" ry="10" fill="#e8d4a8"/>`;
}
function hearts(c: string, c2: string): string {
  const heart = (x: number, y: number, s: number, col: string, rot: number) => `<path d="M0 30 C-50 -10 -30 -50 0 -26 C30 -50 50 -10 0 30 Z" fill="${col}" transform="translate(${x} ${y}) rotate(${rot}) scale(${s})"/>`;
  return heart(96, 100, 1.6, c, -12) + heart(150, 92, 1.5, c2, 12) + `<path d="M40 150 C80 130 170 130 210 150" stroke="${mix(c, c2, 0.5)}" stroke-width="3" fill="none" stroke-dasharray="6 6"/>`;
}
function archway(c: string[], seed: number): string {
  const r = rng(seed);
  let g = `<path d="M40 320 V140 C40 50 260 50 260 140 V320" stroke="${c[3]}" stroke-width="6" fill="none"/>`;
  for (let i = 0; i < 46; i++) { const t = r(), a = Math.PI + t * Math.PI; const side = t < 0.5; const px = t < 0.25 || t > 0.75 ? (side ? 40 : 260) + (r() - 0.5) * 16 : 150 + Math.cos(a) * 110; const py = t < 0.25 || t > 0.75 ? 140 + r() * 120 : 140 + Math.sin(a) * 90; g += leafy(px, py, 14 + r() * 6, r() * 180, i % 2 ? c[3] : lt(c[3], 0.15)); }
  for (let i = 0; i < 16; i++) { const t = i / 15, a = Math.PI + t * Math.PI; const px = 150 + Math.cos(a) * 110, py = 140 + Math.sin(a) * 90; g += rose(px + (r() - 0.5) * 10, py + (r() - 0.5) * 10, 10 + r() * 6, c[i % 3]); }
  for (const x of [40, 260]) for (let k = 0; k < 4; k++) g += rose(x + (r() - 0.5) * 10, 170 + k * 30, 10, c[k % 3]);
  return g;
}

// ---------- assets ----------
export const ASSETS: AssetDef[] = [
  A('ms-rings', 'Wedding rings', 'illustration', 260, 200, ['#e8c46a', '#d9dfe8', '#cfe8ff'], ['wedding', 'rings', 'engagement', 'anniversary', 'marriage', 'save the date', 'bride', 'groom'], (c) => ring('r1', 100, 120, 56, c[0], c[2]) + ring('r2', 166, 128, 50, c[1])),
  A('ms-diamond-ring', 'Engagement ring', 'illustration', 180, 200, ['#e8c46a', '#cfe8ff'], ['engagement', 'proposal', 'she said yes', 'ring', 'diamond', 'engaged'], (c) => ring('r', 90, 126, 60, c[0], c[1])),
  A('ms-bouquet', 'Rose bouquet', 'illustration', 260, 270, ['#f2b8c6', '#ffffff', '#e8879e', '#7fa86a', '#e8c46a'], ['bouquet', 'roses', 'flowers', 'wedding', 'mothers day', 'bridal shower', 'anniversary', 'valentines'], (c) => bouquet(c, 5)),
  A('ms-cake', 'Wedding cake', 'illustration', 260, 300, ['#fbf6ee', '#e8c46a', '#f2b8c6', '#d9cbb8', '#7fa86a'], ['cake', 'wedding cake', 'anniversary', 'reception', 'tiered cake'], (c) => cake(c)),
  A('ms-champagne', 'Champagne toast', 'illustration', 240, 220, ['#e8eef2', '#f2d27a'], ['champagne', 'toast', 'cheers', 'celebration', 'new year', 'anniversary', 'engagement party', 'retirement'], (c) => flute(96, 150, -14, c[0], c[1]) + flute(146, 150, 14, c[0], c[1]) + sparkle(122, 30, 10, c[1]) + sparkle(160, 20, 6, c[1]) + sparkle(84, 26, 5, c[1])),
  A('ms-floral-arch', 'Floral arch', 'decoration', 300, 320, ['#f2b8c6', '#ffffff', '#e8879e', '#7fa86a'], ['arch', 'floral arch', 'wedding', 'ceremony', 'frame', 'quinceanera'], (c) => archway(c, 11)),
  A('ms-hearts', 'Two hearts', 'illustration', 240, 170, ['#e8607e', '#f2b8c6'], ['hearts', 'love', 'anniversary', 'valentines', 'couple', 'romance'], (c) => hearts(c[0], c[1])),
  A('ms-grad-cap', 'Graduation cap', 'illustration', 280, 200, ['#1f2a44', '#e8c46a'], ['graduation', 'grad', 'class of', 'mortarboard', 'cap', 'commencement', 'graduate', 'university'], (c) => mortarboard(c[0], c[1])),
  A('ms-diploma', 'Diploma', 'illustration', 280, 170, ['#fbf4e2', '#c8263a'], ['graduation', 'diploma', 'degree', 'certificate', 'scroll'], (c) => diploma(c[0], c[1])),
  A('ms-house', 'Little house', 'illustration', 300, 240, ['#fbf4ea', '#c4573a', '#4a6a8a', '#ffd98a'], ['housewarming', 'new home', 'home', 'moving', 'house', 'open house', 'real estate'], (c) => house(c[0], c[1], c[2], c[3])),
  A('ms-key', 'House key', 'illustration', 200, 100, ['#e8c46a'], ['housewarming', 'key', 'new home', 'keys'], (c) => key(50, 50, 1, c[0])),
  A('ms-plant', 'Potted plant', 'illustration', 200, 220, ['#5f9a4a', '#d9876b'], ['plant', 'housewarming', 'home', 'green', 'growth', 'mothers day'], (c) => plant(100, 150, 1, c[0], c[1])),
  A('ms-tiara', 'Tiara', 'illustration', 280, 170, ['#e8c46a', '#cfe8ff', '#f2b8c6'], ['tiara', 'crown', 'quinceanera', 'quinceañera', 'xv años', 'sweet 16', 'sweet sixteen', 'princess', 'birthday'], (c) => tiara(c[0], c[1], c[2])),
  A('ms-tallit', 'Tallit', 'illustration', 300, 260, ['#fbfbf7', '#2f5fa8'], ['bar mitzvah', 'bat mitzvah', 'bnei mitzvah', 'tallit', 'tallis', 'prayer shawl', 'jewish', 'בר מצווה', 'בת מצווה'], (c) => tallit(c[0], c[1])),
  A('ms-tie', 'Necktie', 'illustration', 240, 240, ['#2f5fa8', '#e8c46a'], ['fathers day', "father's day", 'dad', 'tie', 'necktie', 'office'], (c) => tie(c[0], c[1])),
  A('ms-mug', 'Coffee mug', 'illustration', 220, 210, ['#d9876b', '#b8a898'], ['mug', 'coffee', 'mothers day', 'fathers day', 'cozy', 'morning'], (c) => mug(c[0], c[1])),
  A('ms-beach-chair', 'Beach chair & umbrella', 'illustration', 320, 250, ['#2e86de', '#f2a541'], ['retirement', 'retired', 'vacation', 'beach', 'summer', 'relax'], (c) => beachChair(c[0], c[1])),
  A('ms-candle', 'Memorial candle', 'illustration', 160, 280, ['#fbf7ef', '#ffcf6a'], ['memorial', 'in loving memory', 'celebration of life', 'remembrance', 'candle', 'funeral', 'vigil', 'yahrzeit'], (c) =>
    `<defs>${glowDef('mc', c[1], 0.6)}</defs><circle cx="80" cy="60" r="70" fill="url(#mc)"/><rect x="50" y="100" width="60" height="160" rx="6" fill="${c[0]}"/><rect x="88" y="100" width="22" height="160" fill="${dk(c[0], 0.06)}"/><ellipse cx="80" cy="100" rx="30" ry="6" fill="${lt(c[0], 0.3)}"/><path d="M80 100 v-8" stroke="#3a3030" stroke-width="2.5"/>` + flame(80, 46, 50, c[1]) + `<ellipse cx="80" cy="264" rx="50" ry="6" fill="#000" opacity=".12"/>`),
  A('ms-forget-me-nots', 'Forget-me-nots', 'decoration', 300, 140, ['#7fb3e8', '#f2d27a', '#7fa86a'], ['forget me not', 'memorial', 'remembrance', 'flowers', 'blue', 'sympathy'], (c) => {
    const r = rng(19); let g = '';
    for (let i = 0; i < 10; i++) { const x = 20 + i * 28 + r() * 10; g += `<path d="M${f1(x)} 140 C${f1(x - 6)} 110 ${f1(x + 6)} 80 ${f1(x)} ${f1(60 + r() * 30)}" stroke="${c[2]}" stroke-width="2.5" fill="none"/>`; }
    for (let i = 0; i < 22; i++) g += blossom(10 + r() * 280, 30 + r() * 80, 7 + r() * 5, i % 4 ? c[0] : lt(c[0], 0.3), c[1], r() * 70);
    return g;
  }),
  A('ms-number-balloons', 'Star balloons', 'illustration', 220, 280, ['#e8c46a', '#f2b8c6', '#cfd8e8'], ['balloons', 'birthday', 'sweet 16', 'quinceanera', 'anniversary', 'milestone birthday', 'party'], (c) => {
    let g = '';
    for (const [x, y, s, col] of [[70, 90, 1, c[0]], [150, 80, 0.9, c[1]], [110, 150, 0.8, c[2]]] as const) g += `<path d="M${x} ${y + 50 * s} Q${x + 10} 210 110 270" stroke="#9b8f8a" stroke-width="1.5" fill="none"/><polygon points="${starPts(x, y, 5, 52 * s, 26 * s)}" fill="${col}" stroke="${dk(col, 0.15)}" stroke-width="2" stroke-linejoin="round"/><path d="M${x - 14 * s} ${y - 24 * s} l${10 * s} ${-6 * s}" stroke="#fff" stroke-width="4" opacity=".6" stroke-linecap="round"/>`;
    return g;
  }),
  A('ms-confetti', 'Gold confetti', 'decoration', 300, 200, ['#e8c46a', '#f2b8c6', '#ffffff'], ['confetti', 'sparkles', 'party', 'celebration'], (c) => {
    const r = rng(23); let g = '';
    for (let i = 0; i < 40; i++) { const x = r() * 300, y = r() * 200, col = c[i % 3]; g += i % 4 === 0 ? sparkle(x, y, 4 + r() * 6, col) : `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(4 + r() * 6)}" height="${f1(2 + r() * 3)}" fill="${col}" transform="rotate(${f1(r() * 180)} ${f1(x)} ${f1(y)})"/>`; }
    return g;
  }),
];

// ---------- backgrounds ----------
const BGS = backgrounds('milestones', ['milestone'], [
  { id: 'ms-bg-blush', name: 'Blush & gold', colors: ['#fdf1ef', '#f6dcd6', '#d9b06a'], tags: ['wedding', 'bridal', 'engagement', 'blush', 'pink', 'gold', 'elegant', 'romantic'], draw: (c, W, H) => {
    const u = Math.min(W, H), m = u * 0.045;
    return `<defs><radialGradient id="r" cx="50%" cy="40%" r="80%"><stop offset="0" stop-color="${c[0]}"/><stop offset="1" stop-color="${c[1]}"/></radialGradient></defs><rect width="${W}" height="${H}" fill="url(#r)"/>` +
      bokeh(W, H, ['#ffffff', c[2]], Math.round((W * H) / 70000), 31, u * 0.04, 'bk') + `<rect x="${f1(m)}" y="${f1(m)}" width="${f1(W - m * 2)}" height="${f1(H - m * 2)}" fill="none" stroke="${c[2]}" stroke-width="${f1(u * 0.003)}"/>`;
  } },
  { id: 'ms-bg-eucalyptus', name: 'Eucalyptus', colors: ['#f6f6f0', '#8fae94', '#6f8f75'], tags: ['wedding', 'greenery', 'eucalyptus', 'sage', 'botanical', 'minimal', 'neutral'], draw: (c, W, H) => {
    const u = Math.min(W, H), r = rng(37);
    let g = `<rect width="${W}" height="${H}" fill="${c[0]}"/>`;
    const sprig = (x0: number, y0: number, ang: number, len: number) => {
      const ca = Math.cos(ang), sa = Math.sin(ang);
      let s = `<path d="M${f1(x0)} ${f1(y0)} L${f1(x0 + ca * len)} ${f1(y0 + sa * len)}" stroke="${c[2]}" stroke-width="${f1(len * 0.012)}"/>`;
      for (let i = 1; i < 10; i++) { const t = i / 10, px = x0 + ca * len * t, py = y0 + sa * len * t, side = i % 2 ? 1 : -1, rr = len * (0.06 - t * 0.02); s += `<circle cx="${f1(px - sa * rr * side * 1.1)}" cy="${f1(py + ca * rr * side * 1.1)}" r="${f1(rr)}" fill="${i % 3 ? c[1] : lt(c[1], 0.15)}" opacity=".9"/>`; }
      return s;
    };
    return g + sprig(-u * 0.02, u * 0.05, 0.45 + r() * 0.1, u * 0.27) + sprig(u * 0.05, -u * 0.02, 1.25, u * 0.2) + sprig(W + u * 0.02, H - u * 0.05, Math.PI + 0.45, u * 0.3) + sprig(W - u * 0.05, H + u * 0.02, Math.PI + 1.25, u * 0.22);
  } },
  { id: 'ms-bg-navy-gold', name: 'Navy & gold', colors: ['#14203a', '#24365e', '#e8c46a'], tags: ['graduation', 'class of', 'navy', 'gold', 'formal', 'retirement', 'awards', 'gala'], draw: (c, W, H) => {
    const u = Math.min(W, H), m = u * 0.04;
    return `<defs><radialGradient id="r" cx="50%" cy="35%" r="85%"><stop offset="0" stop-color="${c[1]}"/><stop offset="1" stop-color="${c[0]}"/></radialGradient></defs><rect width="${W}" height="${H}" fill="url(#r)"/>` +
      bokeh(W, H, [c[2]], Math.round((W * H) / 60000), 41, u * 0.04, 'bk') + `<rect x="${f1(m)}" y="${f1(m)}" width="${f1(W - m * 2)}" height="${f1(H - m * 2)}" fill="none" stroke="${c[2]}" stroke-width="${f1(u * 0.004)}"/>`;
  } },
  { id: 'ms-bg-confetti', name: 'Confetti party', colors: ['#fffaf2', '#e8c46a', '#f2b8c6', '#7fb3e8', '#8fd0b0'], tags: ['party', 'birthday', 'confetti', 'celebration', 'sweet 16', 'quinceanera', 'retirement', 'graduation'], draw: (c, W, H) => {
    const u = Math.min(W, H), r = rng(43);
    let g = `<rect width="${W}" height="${H}" fill="${c[0]}"/>`;
    for (let i = 0; i < Math.round((W * H) / 9000); i++) { const x = r() * W, y = r() * H, edge = Math.min(x, W - x, y, H - y) / u; if (edge > 0.22 && r() > 0.15) continue; const col = c[1 + (i % 4)], s = u * (0.006 + r() * 0.01); g += i % 3 ? `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(s * 2)}" height="${f1(s)}" fill="${col}" transform="rotate(${f1(r() * 180)} ${f1(x)} ${f1(y)})"/>` : `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(s * 0.7)}" fill="${col}"/>`; }
    return g;
  } },
  { id: 'ms-bg-soft-light', name: 'Soft light', colors: ['#eef2f6', '#d8e2ec', '#fff3d6'], tags: ['memorial', 'in loving memory', 'celebration of life', 'remembrance', 'sympathy', 'peaceful', 'calm'], draw: (c, W, H) => {
    const u = Math.min(W, H);
    return `<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c[0]}"/><stop offset="1" stop-color="${c[1]}"/></linearGradient>${glowDef('lg', c[2], 0.9)}</defs><rect width="${W}" height="${H}" fill="url(#s)"/><circle cx="${f1(W / 2)}" cy="${f1(H * 0.18)}" r="${f1(u * 0.6)}" fill="url(#lg)"/>`;
  } },
]);

ASSETS.push(...BGS);
