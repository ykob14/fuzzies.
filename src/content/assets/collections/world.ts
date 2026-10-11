/**
 * World celebrations collection — original vector artwork drawn in code for Fuzzies (licence: original Fuzzies artwork).
 * Nowruz — the haft-sin table with its seven items that start with "s" in Persian: sabzeh (sprouts), samanu (sweet wheat
 * pudding), senjed (dried oleaster), sir (garlic), sib (apple), somāq (sumac) and serkeh (vinegar), with goldfish, mirror,
 * painted eggs and hyacinth (sonbol). Kwanzaa — the kinara holding seven candles (three red on the left, one black in
 * the centre, three green on the right), mkeka mat, muhindi (corn), kikombe cha umoja (unity cup), zawadi (gifts).
 * Día de los Muertos — decorated calaveras, cempasúchil marigolds, papel picado, candles and pan de muerto, drawn
 * warmly and respectfully.
 */
import type { AssetDef } from '../index';
import { asset, backgrounds, blossom, dk, f1, flame, glowDef, lt, rng, sparkle } from '../draw';

const A = asset('world', ['festival', 'celebration', 'culture']);
const NOW = ['nowruz', 'norooz', 'navruz', 'nowrouz', 'persian new year', 'نوروز', 'نوروز مبارک', 'haft sin', 'haft-sin', 'spring equinox'];
const KWZ = ['kwanzaa', 'kinara', 'habari gani', 'nguzo saba', 'seven principles', 'african american'];
const DDM = ['dia de los muertos', 'día de muertos', 'day of the dead', 'dia de muertos', 'ofrenda', 'calavera', 'mexican'];

// ---------- drawings ----------
function sprouts(x: number, y: number, s: number, green: string, dish: string, ribbon: string): string {
  let g = `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})"><ellipse cx="0" cy="30" rx="70" ry="8" fill="#000" opacity=".12"/>`;
  const r = rng(Math.round(x));
  for (let i = 0; i < 46; i++) { const px = -52 + r() * 104, h = 50 + r() * 50; g += `<path d="M${f1(px)} 0 C${f1(px + 2)} ${f1(-h * 0.5)} ${f1(px + (r() - 0.5) * 16)} ${f1(-h * 0.8)} ${f1(px + (r() - 0.5) * 20)} ${f1(-h)}" stroke="${i % 3 ? green : lt(green, 0.2)}" stroke-width="3" fill="none" stroke-linecap="round"/>`; }
  g += `<path d="M-64 -4 H64 C60 22 40 30 0 30 C-40 30 -60 22 -64 -4 Z" fill="${dish}"/><ellipse cx="0" cy="-4" rx="64" ry="9" fill="${dk(dish, 0.15)}"/>`;
  g += `<path d="M-60 6 C-20 14 20 14 60 6" stroke="${ribbon}" stroke-width="8" fill="none"/><path d="M40 10 l14 18 M40 10 l20 8" stroke="${ribbon}" stroke-width="5" stroke-linecap="round"/>`;
  return g + `</g>`;
}
function bowl(x: number, y: number, s: number, dish: string, fill: string, dots?: string): string {
  let g = `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})"><ellipse cx="0" cy="22" rx="40" ry="5" fill="#000" opacity=".12"/><path d="M-38 0 C-34 18 -18 24 0 24 C18 24 34 18 38 0 Z" fill="${dish}"/><ellipse cx="0" cy="0" rx="38" ry="8" fill="${fill}"/>`;
  if (dots) { const r = rng(Math.round(x + y)); for (let i = 0; i < 9; i++) g += `<ellipse cx="${f1(-24 + r() * 48)}" cy="${f1(-3 + r() * 5)}" rx="5" ry="3" fill="${dots}"/>`; }
  return g + `<path d="M-26 8 C-20 14 -10 16 0 16" stroke="#fff" stroke-width="3" fill="none" opacity=".4"/></g>`;
}
function goldfishBowl(x: number, y: number, s: number, fish: string): string {
  return `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})"><ellipse cx="0" cy="44" rx="42" ry="6" fill="#000" opacity=".12"/><path d="M-30 -40 C-60 -20 -60 30 -30 44 H30 C60 30 60 -20 30 -40 Z" fill="#cfeaf5" opacity=".75" stroke="#9fd0e3" stroke-width="3"/><path d="M-46 -6 C-46 30 46 30 46 -6 C30 -12 -30 -12 -46 -6 Z" fill="#8fd0ea" opacity=".6"/>` +
    `<path d="M-12 10 C-4 -2 14 -2 20 8 C14 18 -4 18 -12 10 Z" fill="${fish}"/><path d="M-12 10 L-24 2 L-22 18 Z" fill="${fish}"/><circle cx="12" cy="7" r="1.8" fill="#222"/><ellipse cx="-22" cy="-24" rx="5" ry="10" fill="#fff" opacity=".5" transform="rotate(30 -22 -24)"/><ellipse cx="0" cy="-40" rx="30" ry="5" fill="none" stroke="#9fd0e3" stroke-width="3"/></g>`;
}
function garlic(x: number, y: number, s: number): string {
  return `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})"><path d="M0 -36 C4 -26 8 -20 18 -14 C34 -4 34 22 18 30 C8 34 -8 34 -18 30 C-34 22 -34 -4 -18 -14 C-8 -20 -4 -26 0 -36 Z" fill="#f6efe2" stroke="#d8c8b0" stroke-width="2"/><path d="M0 -20 C-6 0 -6 20 0 32 M-12 -10 C-20 4 -18 22 -10 30 M12 -10 C20 4 18 22 10 30" stroke="#d8c8b0" stroke-width="2" fill="none"/><path d="M0 -36 V-46" stroke="#b8a888" stroke-width="3"/></g>`;
}
function hyacinth(x: number, y: number, s: number, c: string, leaf: string): string {
  let g = `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})"><path d="M0 0 V-90" stroke="${leaf}" stroke-width="6"/><path d="M-4 0 C-30 -30 -26 -70 -20 -80 C-14 -60 -8 -30 -4 0 Z M4 0 C30 -30 26 -60 22 -70 C14 -50 8 -26 4 0 Z" fill="${leaf}"/>`;
  for (let i = 0; i < 26; i++) { const t = i / 25, py = -96 - t * 90, w = 22 - t * 12, px = (i % 3 - 1) * w * 0.7; g += `<g transform="translate(${f1(px)} ${f1(py)})">${[0, 1, 2, 3, 4, 5].map((k) => `<ellipse cx="0" cy="-5" rx="3" ry="5.5" fill="${i % 2 ? c : lt(c, 0.2)}" transform="rotate(${k * 60})"/>`).join('')}</g>`; }
  return g + `<path d="M-20 0 H20 L16 18 H-16 Z" fill="#c4622d"/></g>`;
}
function paintedEgg(x: number, y: number, s: number, base: string, a: string, rot = 0): string {
  return `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${rot}) scale(${s})"><path d="M0 -28 C16 -28 22 -6 22 6 C22 20 12 28 0 28 C-12 28 -22 20 -22 6 C-22 -6 -16 -28 0 -28 Z" fill="${base}"/><path d="M-22 0 Q-11 -8 0 0 T22 0" stroke="${a}" stroke-width="3" fill="none"/><circle cx="-8" cy="12" r="3" fill="${a}"/><circle cx="8" cy="12" r="3" fill="${a}"/><circle cx="0" cy="-14" r="3" fill="${a}"/></g>`;
}
function kinara(wood: string, red: string, black: string, green: string): string {
  let g = `<defs>${glowDef('kg', '#ffc04a', 0.5)}</defs><ellipse cx="200" cy="262" rx="190" ry="8" fill="#000" opacity=".14"/>`;
  g += `<path d="M30 200 H370 L350 226 H50 Z" fill="${wood}"/><path d="M60 226 H340 L330 250 H70 Z" fill="${dk(wood, 0.2)}"/><path d="M40 204 H360" stroke="${lt(wood, 0.2)}" stroke-width="3"/>`;
  const cols = [red, red, red, black, green, green, green];
  cols.forEach((col, i) => {
    const x = 60 + i * 46.6, h = i === 3 ? 120 : 96, top = 200 - h;
    g += `<rect x="${f1(x - 14)}" y="${f1(top + h - 12)}" width="28" height="14" rx="3" fill="${dk(wood, 0.1)}"/><circle cx="${f1(x)}" cy="${f1(top - 26)}" r="26" fill="url(#kg)"/>`;
    g += `<rect x="${f1(x - 9)}" y="${f1(top)}" width="18" height="${h - 12}" rx="3" fill="${col}"/><rect x="${f1(x + 2)}" y="${f1(top)}" width="5" height="${h - 12}" fill="#fff" opacity=".15"/><path d="M${f1(x)} ${f1(top)} v-6" stroke="#2a2020" stroke-width="2"/>` + flame(x, top - 36, 28, '#ffb238');
  });
  return g;
}
function corn(x: number, y: number, s: number, kernel: string, husk: string, rot = 0): string {
  let g = `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${rot}) scale(${s})"><path d="M0 -70 C20 -70 26 -20 22 40 C20 60 -20 60 -22 40 C-26 -20 -20 -70 0 -70 Z" fill="${kernel}"/>`;
  for (let row = 0; row < 12; row++) for (let k = -2; k <= 2; k++) g += `<ellipse cx="${k * 8}" cy="${-60 + row * 9}" rx="3.6" ry="4" fill="${dk(kernel, 0.12)}" opacity=".55"/>`;
  return g + `<path d="M-6 50 C-40 20 -40 -30 -30 -60 C-24 -20 -14 20 0 50 Z" fill="${husk}"/><path d="M6 50 C40 20 40 -20 32 -50 C26 -14 16 20 0 50 Z" fill="${dk(husk, 0.12)}"/><path d="M0 50 V80" stroke="${husk}" stroke-width="6"/></g>`;
}
function unityCup(x: number, y: number, s: number, c: string, trim: string): string {
  return `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})"><ellipse cx="0" cy="96" rx="44" ry="5" fill="#000" opacity=".14"/><path d="M-44 0 C-44 40 -24 60 -8 64 V80 C-8 86 -22 88 -34 94 H34 C22 88 8 86 8 80 V64 C24 60 44 40 44 0 Z" fill="${c}"/><ellipse cx="0" cy="0" rx="44" ry="9" fill="${dk(c, 0.25)}"/>` +
    `<path d="M-42 20 H42 M-38 34 H38" stroke="${trim}" stroke-width="5"/><path d="M-30 20 l6 14 l6 -14 l6 14 l6 -14 l6 14 l6 -14 l6 14 l6 -14" stroke="${dk(trim, 0.2)}" stroke-width="2" fill="none"/></g>`;
}
function calavera(x: number, y: number, s: number, bone: string, a: string, b: string, cc: string): string {
  let g = `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})"><path d="M0 -90 C56 -90 84 -54 84 -10 C84 22 66 40 52 48 V74 C52 84 44 90 34 90 H-34 C-44 90 -52 84 -52 74 V48 C-66 40 -84 22 -84 -10 C-84 -54 -56 -90 0 -90 Z" fill="${bone}"/>`;
  // flower crown
  for (let i = 0; i < 5; i++) { const px = -56 + i * 28, py = -70 - Math.sin((i / 4) * Math.PI) * 14; g += blossom(px, py, 14, [a, b, cc][i % 3], '#f2c94c', i * 20); }
  // eye sockets with petal rings
  for (const ex of [-32, 32]) {
    for (let k = 0; k < 10; k++) { const ang = (k / 10) * Math.PI * 2; g += `<ellipse cx="${f1(ex + Math.cos(ang) * 26)}" cy="${f1(-8 + Math.sin(ang) * 26)}" rx="7" ry="4" fill="${k % 2 ? a : b}" transform="rotate(${f1((ang * 180) / Math.PI)} ${f1(ex + Math.cos(ang) * 26)} ${f1(-8 + Math.sin(ang) * 26)})"/>`; }
    g += `<circle cx="${ex}" cy="-8" r="19" fill="#2b2233"/><circle cx="${ex + 5}" cy="-13" r="5" fill="#fff" opacity=".8"/>`;
  }
  g += `<path d="M0 18 L-10 36 H10 Z" fill="#2b2233"/><path d="M-36 58 H36" stroke="#2b2233" stroke-width="3"/>`;
  for (let i = -3; i <= 3; i++) g += `<path d="M${i * 10} 50 V68" stroke="#2b2233" stroke-width="3"/>`;
  g += `<path d="M-60 24 C-50 34 -40 36 -30 34 M60 24 C50 34 40 36 30 34" stroke="${cc}" stroke-width="3" fill="none"/>` + [[-64, 10], [64, 10], [0, -40]].map(([dx, dy]) => `<circle cx="${dx}" cy="${dy}" r="5" fill="${cc}"/>`).join('');
  return g + `</g>`;
}
function marigoldBloom(x: number, y: number, r: number, c: string): string {
  let g = '';
  for (let k = 0; k < 4; k++) for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2 + k * 0.26, d = r * (0.82 - k * 0.2); g += `<ellipse cx="${f1(x + Math.cos(a) * d)}" cy="${f1(y + Math.sin(a) * d)}" rx="${f1(r * (0.3 - k * 0.04))}" ry="${f1(r * (0.2 - k * 0.03))}" fill="${k % 2 ? lt(c, 0.15) : c}" stroke="${dk(c, 0.15)}" stroke-width="1" transform="rotate(${f1((a * 180) / Math.PI)} ${f1(x + Math.cos(a) * d)} ${f1(y + Math.sin(a) * d)})"/>`; }
  return g + `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r * 0.16)}" fill="${dk(c, 0.25)}"/>`;
}
function papelPicado(w: number, colors: string[], n: number): string {
  let g = `<path d="M0 12 Q${w / 2} 30 ${w} 12" stroke="#6b5a4a" stroke-width="3" fill="none"/>`;
  const fw = w / n;
  for (let i = 0; i < n; i++) {
    const x = i * fw + fw * 0.06, t = (i + 0.5) / n, sag = 4 * t * (1 - t) * 18, top = 12 + sag, fwid = fw * 0.88, h = fw * 1.15, col = colors[i % colors.length];
    g += `<path d="M${f1(x)} ${f1(top)} H${f1(x + fwid)} V${f1(top + h)} l${f1(-fwid / 6)} ${f1(-h * 0.08)} l${f1(-fwid / 6)} ${f1(h * 0.08)} l${f1(-fwid / 6)} ${f1(-h * 0.08)} l${f1(-fwid / 6)} ${f1(h * 0.08)} l${f1(-fwid / 6)} ${f1(-h * 0.08)} L${f1(x)} ${f1(top + h)} Z" fill="${col}"/>`;
    const cx = x + fwid / 2, cy = top + h * 0.45;
    g += `<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(fwid * 0.16)}" fill="#fff" opacity=".9"/>` + [0, 1, 2, 3, 4, 5].map((k) => { const a = (k / 6) * Math.PI * 2; return `<ellipse cx="${f1(cx + Math.cos(a) * fwid * 0.27)}" cy="${f1(cy + Math.sin(a) * fwid * 0.27)}" rx="${f1(fwid * 0.06)}" ry="${f1(fwid * 0.035)}" fill="#fff" opacity=".9" transform="rotate(${f1((a * 180) / Math.PI)} ${f1(cx + Math.cos(a) * fwid * 0.27)} ${f1(cy + Math.sin(a) * fwid * 0.27)})"/>`; }).join('');
    g += `<rect x="${f1(x + fwid * 0.15)}" y="${f1(top + h * 0.8)}" width="${f1(fwid * 0.7)}" height="${f1(h * 0.04)}" fill="#fff" opacity=".8"/>`;
  }
  return g;
}

// ---------- assets ----------
export const ASSETS: AssetDef[] = [
  A('wd-haft-sin', 'Haft-sin table', 'illustration', 440, 184, ['#5aa04a', '#e8d9b8', '#c8263a', '#d4a940', '#f28c1e'], [...NOW, 'sabzeh', 'samanu', 'senjed', 'sir', 'sib', 'somaq', 'serkeh', 'goldfish', 'table'], (c) => {
    let g = `<g transform="translate(0 -56)"><rect x="0" y="196" width="440" height="44" rx="6" fill="${c[1]}"/><path d="M0 206 H440" stroke="${c[3]}" stroke-width="4"/>`;
    g += sprouts(220, 168, 1.05, c[0], '#ffffff', c[2]);                         // sabzeh
    g += bowl(70, 196, 0.9, '#ffffff', '#a86a3a');                                // samanu
    g += bowl(130, 210, 0.75, '#ffffff', '#d8a868', '#a0522d');                   // senjed
    g += garlic(320, 186, 0.6);                                                    // sir
    g += `<g transform="translate(372 186) scale(.42)"><path d="M0 -58 C-26 -78 -84 -70 -84 -8 C-84 52 -40 92 0 76 C40 92 84 52 84 -8 C84 -70 26 -78 0 -58 Z" fill="${c[2]}"/><path d="M0 -56 C2 -70 6 -84 14 -94" stroke="#3a2a1a" stroke-width="6"/></g>`; // sib
    g += bowl(276, 214, 0.65, '#ffffff', '#8a1f2c');                              // somaq
    g += `<path d="M412 120 h12 v22 c8 6 10 14 10 26 v40 h-32 v-40 c0 -12 2 -20 10 -26 z" fill="#b8d88a" opacity=".8" stroke="#8aa86a" stroke-width="2"/><rect x="410" y="112" width="16" height="10" rx="2" fill="${c[3]}"/>`; // serkeh
    g += goldfishBowl(36, 140, 0.6, c[4]) + paintedEgg(170, 186, 0.55, '#7fb3e8', c[3], -10) + paintedEgg(270, 178, 0.5, '#f4b6c2', c[3], 12);
    return g + '</g>';
  }),
  A('wd-sabzeh', 'Sabzeh sprouts', 'illustration', 200, 180, ['#5aa04a', '#ffffff', '#c8263a'], [...NOW, 'sabzeh', 'sprouts', 'wheatgrass', 'spring', 'growth'], (c) => sprouts(100, 130, 1.2, c[0], c[1], c[2])),
  A('wd-hyacinth', 'Hyacinth (sonbol)', 'illustration', 140, 240, ['#8c6bd6', '#5aa04a'], [...NOW, 'hyacinth', 'sonbol', 'flower', 'spring'], (c) => hyacinth(70, 210, 1, c[0], c[1])),
  A('wd-goldfish', 'Goldfish bowl', 'illustration', 140, 130, ['#f28c1e'], [...NOW, 'goldfish', 'fish bowl', 'life'], (c) => goldfishBowl(70, 70, 1.2, c[0])),
  A('wd-eggs', 'Painted eggs', 'illustration', 200, 100, ['#7fb3e8', '#f4b6c2', '#a8d68a', '#d4a940'], [...NOW, 'painted eggs', 'eggs', 'spring'], (c) => paintedEgg(50, 56, 1.1, c[0], c[3], -12) + paintedEgg(100, 50, 1.2, c[1], c[3]) + paintedEgg(150, 56, 1.1, c[2], c[3], 12)),
  A('wd-kinara', 'Kinara', 'illustration', 400, 270, ['#8a5a34', '#c8263a', '#1d1a1a', '#2f8a3a'], [...KWZ, 'kinara', 'candles', 'mishumaa saba', 'seven candles', 'red black green'], (c) => kinara(c[0], c[1], c[2], c[3])),
  A('wd-kwanzaa-table', 'Kwanzaa table', 'illustration', 440, 240, ['#c8263a', '#1d1a1a', '#2f8a3a', '#e8b94a', '#8a5a34'], [...KWZ, 'mkeka', 'muhindi', 'corn', 'unity cup', 'kikombe cha umoja', 'zawadi', 'gifts', 'table'], (c) => {
    let g = `<path d="M10 200 H430 L410 236 H30 Z" fill="${c[3]}"/>`;
    for (let i = 0; i < 14; i++) g += `<path d="M${30 + i * 28} 200 L${36 + i * 27} 236" stroke="${[c[0], c[1], c[2]][i % 3]}" stroke-width="10"/>`;
    g += corn(70, 140, 0.8, '#f2c14e', '#a8c46a', -16) + corn(110, 146, 0.75, '#e8a33a', '#9ab85a', 10);
    g += unityCup(220, 106, 0.9, c[4], c[3]);
    g += `<g><rect x="300" y="140" width="90" height="62" rx="4" fill="${c[2]}"/><rect x="296" y="132" width="98" height="14" rx="3" fill="${lt(c[2], 0.15)}"/><rect x="338" y="132" width="14" height="70" fill="${c[0]}"/><path d="M345 132 C325 110 315 124 345 132 C365 110 375 124 345 132" fill="${c[0]}"/></g>`;
    return g;
  }),
  A('wd-corn', 'Ears of corn', 'illustration', 180, 200, ['#f2c14e', '#a8c46a'], [...KWZ, ...['thanksgiving', 'harvest'], 'corn', 'muhindi', 'maize'], (c) => corn(70, 100, 1, c[0], c[1], -12) + corn(116, 106, 0.95, '#e8a33a', c[1], 12)),
  A('wd-calavera', 'Calavera', 'illustration', 220, 220, ['#fbf4ea', '#e8574a', '#f2a541', '#8c6bd6'], [...DDM, 'calavera', 'sugar skull', 'skull', 'flowers'], (c) => calavera(110, 116, 1, c[0], c[1], c[2], c[3])),
  A('wd-marigolds', 'Cempasúchil marigolds', 'illustration', 300, 180, ['#f28c1e', '#f6b53a', '#4f7a3a'], [...DDM, 'marigold', 'cempasuchil', 'flor de muerto', 'flowers'], (c) => {
    let g = '';
    for (const [x, y, r, k] of [[60, 110, 40, 0], [150, 90, 50, 1], [240, 112, 40, 0], [104, 150, 30, 1], [196, 152, 30, 0]] as const) g += `<path d="M${x} ${y} L${x + (x < 150 ? 10 : -10)} 180" stroke="${c[2]}" stroke-width="5"/>` + marigoldBloom(x, y, r, c[k]);
    return g;
  }),
  A('wd-papel-picado', 'Papel picado', 'decoration', 600, 150, ['#e8574a', '#f2a541', '#2e86de', '#d63384', '#2fa05a', '#8c6bd6'], [...DDM, ...['fiesta', 'cinco de mayo', 'quinceanera', 'mexican'], 'papel picado', 'banner', 'bunting', 'flags'], (c) => papelPicado(600, c, 8)),
  A('wd-candles', 'Ofrenda candles', 'illustration', 220, 220, ['#fbf4ea', '#e8574a', '#ffb238'], [...DDM, 'candles', 'veladoras', 'ofrenda', 'remembrance'], (c) => {
    let g = `<defs>${glowDef('cg', c[2], 0.5)}</defs>`;
    for (const [x, h, w] of [[60, 120, 34], [112, 160, 40], [166, 100, 32]] as const) g += `<circle cx="${x}" cy="${200 - h - 20}" r="44" fill="url(#cg)"/><rect x="${x - w / 2}" y="${200 - h}" width="${w}" height="${h}" rx="4" fill="${c[0]}"/><rect x="${x - w / 2}" y="${200 - h * 0.5}" width="${w}" height="${h * 0.18}" fill="${c[1]}"/><path d="M${x} ${200 - h} v-6" stroke="#2a2020" stroke-width="2"/>` + flame(x, 200 - h - 36, 30, c[2]);
    return g + `<ellipse cx="110" cy="204" rx="96" ry="6" fill="#000" opacity=".14"/>`;
  }),
  A('wd-pan-de-muerto', 'Pan de muerto', 'illustration', 220, 150, ['#d08a3a', '#fbf1d8'], [...DDM, 'pan de muerto', 'bread', 'ofrenda'], (c) => {
    const r = rng(7);
    let g = `<ellipse cx="110" cy="132" rx="96" ry="10" fill="#000" opacity=".14"/><path d="M14 120 C14 50 206 50 206 120 Z" fill="${c[0]}"/>`;
    g += `<path d="M40 104 C60 84 80 108 100 88 C120 68 140 98 160 80 C170 72 180 84 186 96" stroke="${dk(c[0], 0.12)}" stroke-width="12" fill="none" stroke-linecap="round"/><path d="M110 50 C90 70 120 80 100 110" stroke="${dk(c[0], 0.12)}" stroke-width="12" fill="none" stroke-linecap="round"/><circle cx="110" cy="56" r="12" fill="${dk(c[0], 0.08)}"/>`;
    for (let i = 0; i < 60; i++) { const a = Math.PI + r() * Math.PI, d = r() * 86; g += `<circle cx="${f1(110 + Math.cos(a) * d)}" cy="${f1(118 + Math.sin(a) * d * 0.7)}" r="1.6" fill="${c[1]}"/>`; }
    return g;
  }),
  A('wd-sparkles', 'Festive sparkles', 'decoration', 300, 200, ['#f2a541', '#ffffff'], ['sparkles', 'stars', 'confetti'], (c) => {
    const r = rng(71); let g = '';
    for (let i = 0; i < 20; i++) { const x = r() * 300, y = r() * 200; g += i % 3 ? sparkle(x, y, 3 + r() * 7, i % 2 ? c[0] : c[1], 0.9) : `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(2 + r() * 3)}" fill="${c[0]}"/>`; }
    return g;
  }),
];

// ---------- backgrounds ----------
const BGS = backgrounds('world', ['festival'], [
  { id: 'wd-bg-spring', name: 'Spring blossom', colors: ['#f4f9ee', '#dcefcf', '#f4b6c2', '#ffffff'], tags: [...NOW, 'spring', 'green', 'blossom', 'fresh'], draw: (c, W, H) => {
    const u = Math.min(W, H), r = rng(9);
    let g = `<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c[0]}"/><stop offset="1" stop-color="${c[1]}"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#s)"/>`;
    for (let i = 0; i < Math.round((W * H) / 30000); i++) { const x = r() * W, y = r() * H; g += blossom(x, y, u * (0.008 + r() * 0.012), i % 2 ? c[2] : c[3], '#f2c94c', r() * 72).replace(/<ellipse/g, '<ellipse opacity=".75"'); }
    return g;
  } },
  { id: 'wd-bg-kente', name: 'Kwanzaa kente', colors: ['#14100e', '#c8263a', '#2f8a3a', '#e8b94a'], tags: [...KWZ, 'kente', 'pattern', 'black', 'red', 'green', 'gold'], draw: (c, W, H) => {
    const u = Math.min(W, H), b = u * 0.07;
    let g = `<rect width="${W}" height="${H}" fill="${c[0]}"/>`;
    const band = (x: number, y: number, w: number, h: number, vertical: boolean) => {
      let s = '';
      const n = Math.ceil((vertical ? h : w) / (b * 0.5));
      for (let i = 0; i < n; i++) { const col = [c[1], c[3], c[2], c[3]][i % 4], o = i * b * 0.5; s += vertical ? `<rect x="${f1(x)}" y="${f1(y + o)}" width="${f1(w)}" height="${f1(b * 0.5)}" fill="${col}"/>` : `<rect x="${f1(x + o)}" y="${f1(y)}" width="${f1(b * 0.5)}" height="${f1(h)}" fill="${col}"/>`; }
      return s + (vertical ? `<path d="M${f1(x + w / 2)} ${f1(y)} V${f1(y + h)}" stroke="${c[0]}" stroke-width="${f1(b * 0.12)}" stroke-dasharray="${f1(b * 0.2)} ${f1(b * 0.3)}"/>` : `<path d="M${f1(x)} ${f1(y + h / 2)} H${f1(x + w)}" stroke="${c[0]}" stroke-width="${f1(b * 0.12)}" stroke-dasharray="${f1(b * 0.2)} ${f1(b * 0.3)}"/>`);
    };
    return g + band(0, 0, W, b, false) + band(0, H - b, W, b, false) + `<rect x="0" y="${f1(b)}" width="${W}" height="${f1(u * 0.006)}" fill="${c[3]}"/><rect x="0" y="${f1(H - b - u * 0.006)}" width="${W}" height="${f1(u * 0.006)}" fill="${c[3]}"/>`;
  } },
  { id: 'wd-bg-muertos', name: 'Marigold night', colors: ['#1d1430', '#3a1f4a', '#f28c1e', '#f6b53a'], tags: [...DDM, 'night', 'purple', 'marigold', 'petals'], draw: (c, W, H) => {
    const u = Math.min(W, H), r = rng(17);
    let g = `<defs><radialGradient id="r" cx="50%" cy="60%" r="85%"><stop offset="0" stop-color="${c[1]}"/><stop offset="1" stop-color="${c[0]}"/></radialGradient></defs><rect width="${W}" height="${H}" fill="url(#r)"/>`;
    for (let i = 0; i < Math.round((W * H) / 9000); i++) { const x = r() * W, y = r() * H, s = u * (0.006 + r() * 0.008); g += `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(s)}" ry="${f1(s * 0.6)}" fill="${i % 2 ? c[2] : c[3]}" opacity="${(0.35 + r() * 0.5).toFixed(2)}" transform="rotate(${f1(r() * 180)} ${f1(x)} ${f1(y)})"/>`; }
    return g;
  } },
  { id: 'wd-bg-fiesta', name: 'Fiesta cream', colors: ['#fff6e8', '#e8574a', '#f2a541', '#2e86de', '#d63384', '#2fa05a'], tags: [...DDM, 'fiesta', 'papel picado', 'colourful', 'bright'], draw: (c, W, H) => {
    const u = Math.min(W, H);
    return `<rect width="${W}" height="${H}" fill="${c[0]}"/><g transform="scale(${f1(W / 600)} ${f1(u / 600)})">${papelPicado(600, c.slice(1), 8)}</g>`;
  } },
  { id: 'wd-bg-persian', name: 'Persian turquoise', colors: ['#0f5c63', '#1f8a8f', '#e8c46a'], tags: [...NOW, 'turquoise', 'pattern', 'elegant', 'tile'], draw: (c, W, H) => {
    const u = Math.min(W, H), s = u * 0.12;
    let g = `<defs><radialGradient id="r" cx="50%" cy="40%" r="80%"><stop offset="0" stop-color="${c[1]}"/><stop offset="1" stop-color="${c[0]}"/></radialGradient><pattern id="p" width="${f1(s)}" height="${f1(s)}" patternUnits="userSpaceOnUse"><path d="M${f1(s / 2)} 0 L${f1(s)} ${f1(s / 2)} L${f1(s / 2)} ${f1(s)} L0 ${f1(s / 2)} Z" fill="none" stroke="${c[2]}" stroke-width="${f1(u * 0.002)}" opacity=".35"/><circle cx="${f1(s / 2)}" cy="${f1(s / 2)}" r="${f1(s * 0.08)}" fill="${c[2]}" opacity=".35"/></pattern></defs><rect width="${W}" height="${H}" fill="url(#r)"/><rect width="${W}" height="${H}" fill="url(#p)"/>`;
    const m = u * 0.04;
    return g + `<rect x="${f1(m)}" y="${f1(m)}" width="${f1(W - m * 2)}" height="${f1(H - m * 2)}" fill="none" stroke="${c[2]}" stroke-width="${f1(u * 0.005)}"/>`;
  } },
]);

ASSETS.push(...BGS);
