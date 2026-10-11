/**
 * Christmas collection — original vector artwork drawn in code for Fuzzies (licence: original Fuzzies artwork).
 * Trees, ornaments, Santa, reindeer, snowflakes, presents, stockings, lights, wreaths and winter scenes.
 * Every piece is recolourable: shading derives from the colour slots.
 */
import type { AssetDef } from '../index';
import { asset, backgrounds, bokeh, dk, f1, frame, gift, glowDef, hills, lightString, lt, mix, rng, snowfall, sparkle, starPts, stars } from '../draw';

const A = asset('christmas', ['christmas', 'xmas', 'holiday', 'festive', 'winter', 'merry christmas']);

// ---------- drawings ----------
/** A decorated tree centred at cx with its base at y, h tall. */
function xmasTree(id: string, cx: number, y: number, h: number, green: string, orn: string, gold: string, opts: { lights?: boolean; star?: boolean; snow?: boolean } = {}): string {
  const s = h / 260;
  const T = (x: number, yy: number) => `${f1(cx + (x - 100) * s)} ${f1(y + (yy - 260) * s)}`;
  let g = `<defs><linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${lt(green, 0.18)}"/><stop offset=".55" stop-color="${green}"/><stop offset="1" stop-color="${dk(green, 0.35)}"/></linearGradient>${glowDef(`${id}s`, gold, 0.6)}${glowDef(`${id}l`, '#ffe9a8', 0.8)}</defs>`;
  g += `<ellipse cx="${f1(cx)}" cy="${f1(y - 2 * s)}" rx="${f1(70 * s)}" ry="${f1(7 * s)}" fill="#000" opacity=".18"/>`;
  g += `<path d="M${T(90, 260)} L${T(90, 226)} L${T(110, 226)} L${T(110, 260)} Z" fill="#6b4a2e"/>`;
  const tiers: [number, number, number][] = [[18, 92, 46], [62, 150, 66], [108, 214, 88], [152, 234, 96]];
  for (const [top, base, hw] of tiers.slice(0, 3).concat([tiers[3]])) {
    let d = `M${T(100, top)} L${T(100 - hw, base)}`;
    const n = 5;
    for (let i = 0; i < n; i++) { const x0 = 100 - hw + (i * 2 * hw) / n, x1 = x0 + (2 * hw) / n; d += ` Q${T((x0 + x1) / 2, base + 12)} ${T(x1, base)}`; }
    g += `<path d="${d} Z" fill="url(#${id}g)"/>`;
    if (opts.snow) g += `<path d="M${T(100, top)} L${T(100 - hw * 0.4, top + (base - top) * 0.4)} Q${T(100 - hw * 0.15, top + (base - top) * 0.48)} ${T(100, top + (base - top) * 0.36)} Q${T(100 + hw * 0.2, top + (base - top) * 0.5)} ${T(100 + hw * 0.42, top + (base - top) * 0.42)} Z" fill="#ffffff" opacity=".9"/>`;
  }
  // garlands
  for (const [ya, yb, xa, xb] of [[96, 120, 64, 140], [150, 180, 46, 156], [204, 230, 30, 170]]) g += `<path d="M${T(xa, ya)} Q${T(100, yb + 10)} ${T(xb, yb - 8)}" fill="none" stroke="${gold}" stroke-width="${f1(3 * s)}" stroke-linecap="round"/>`;
  // ornaments
  const r = rng(Math.round(h));
  const spots: [number, number][] = [[86, 84], [116, 100], [72, 132], [128, 140], [100, 160], [60, 190], [140, 196], [92, 206], [118, 222], [48, 226], [152, 228], [80, 236]];
  for (const [x, yy] of spots) {
    const c = r() > 0.45 ? orn : gold, rr = (5 + r() * 3) * s;
    g += `<circle cx="${T(x, yy).split(' ')[0]}" cy="${T(x, yy).split(' ')[1]}" r="${f1(rr)}" fill="${c}"/><circle cx="${f1(cx + (x - 100) * s - rr * 0.35)}" cy="${f1(y + (yy - 260) * s - rr * 0.35)}" r="${f1(rr * 0.3)}" fill="#fff" opacity=".7"/>`;
  }
  if (opts.lights) for (let i = 0; i < 22; i++) { const yy = 40 + r() * 190, half = ((yy - 20) / 214) * 80; const x = 100 + (r() - 0.5) * 2 * half * 0.9; g += `<circle cx="${T(x, yy).split(' ')[0]}" cy="${T(x, yy).split(' ')[1]}" r="${f1(7 * s)}" fill="url(#${id}l)"/><circle cx="${T(x, yy).split(' ')[0]}" cy="${T(x, yy).split(' ')[1]}" r="${f1(1.8 * s)}" fill="#fff6cf"/>`; }
  if (opts.star !== false) g += `<circle cx="${f1(cx)}" cy="${f1(y + (14 - 260) * s)}" r="${f1(30 * s)}" fill="url(#${id}s)"/><polygon points="${starPts(cx, y + (14 - 260) * s, 5, 15 * s, 6.5 * s)}" fill="${gold}" stroke="${dk(gold, 0.2)}" stroke-width="${f1(1.2 * s)}"/>`;
  return g;
}

function ornament(id: string, cx: number, top: number, r: number, body: string, band: string, cap: string, string = 0): string {
  const cy = top + r * 0.5 + r;
  let g = `<defs><radialGradient id="${id}" cx="35%" cy="32%" r="75%"><stop offset="0" stop-color="${lt(body, 0.45)}"/><stop offset=".55" stop-color="${body}"/><stop offset="1" stop-color="${dk(body, 0.4)}"/></radialGradient><clipPath id="${id}c"><circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(r)}"/></clipPath></defs>`;
  if (string) g += `<path d="M${f1(cx)} ${f1(top - string)} V${f1(top)}" stroke="${dk(cap, 0.2)}" stroke-width="1.6"/>`;
  g += `<circle cx="${f1(cx)}" cy="${f1(top - r * 0.05)}" r="${f1(r * 0.14)}" fill="none" stroke="${cap}" stroke-width="${f1(r * 0.06)}"/>`;
  g += `<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(r)}" fill="url(#${id})"/>`;
  g += `<g clip-path="url(#${id}c)"><path d="M${f1(cx - r)} ${f1(cy - r * 0.18)} H${f1(cx + r)} V${f1(cy + r * 0.18)} H${f1(cx - r)} Z" fill="${band}"/>`;
  for (let i = -3; i <= 3; i++) g += `<polygon points="${starPts(cx + i * r * 0.32, cy, 4, r * 0.1, r * 0.04, 0)}" fill="${dk(band, 0.25)}"/>`;
  g += `<path d="M${f1(cx - r)} ${f1(cy - r * 0.34)} Q${f1(cx)} ${f1(cy - r * 0.42)} ${f1(cx + r)} ${f1(cy - r * 0.34)} M${f1(cx - r)} ${f1(cy + r * 0.34)} Q${f1(cx)} ${f1(cy + r * 0.42)} ${f1(cx + r)} ${f1(cy + r * 0.34)}" stroke="${band}" stroke-width="${f1(r * 0.05)}" fill="none"/></g>`;
  g += `<rect x="${f1(cx - r * 0.24)}" y="${f1(top + r * 0.05)}" width="${f1(r * 0.48)}" height="${f1(r * 0.48)}" rx="${f1(r * 0.06)}" fill="${cap}"/><path d="M${f1(cx - r * 0.2)} ${f1(top + r * 0.18)} V${f1(top + r * 0.48)} M${f1(cx)} ${f1(top + r * 0.18)} V${f1(top + r * 0.48)} M${f1(cx + r * 0.2)} ${f1(top + r * 0.18)} V${f1(top + r * 0.48)}" stroke="${dk(cap, 0.25)}" stroke-width="${f1(r * 0.04)}"/>`;
  g += `<ellipse cx="${f1(cx - r * 0.38)}" cy="${f1(cy - r * 0.42)}" rx="${f1(r * 0.16)}" ry="${f1(r * 0.26)}" transform="rotate(35 ${f1(cx - r * 0.38)} ${f1(cy - r * 0.42)})" fill="#fff" opacity=".55"/>`;
  return g;
}

function snowflake(cx: number, cy: number, r: number, color: string, sw: number, variant = 0): string {
  let arm = `M0 0 L0 ${f1(-r)}`;
  const b = variant % 2 ? [[0.4, 0.28], [0.68, 0.22]] : [[0.32, 0.22], [0.55, 0.3], [0.78, 0.16]];
  for (const [at, len] of b) arm += ` M0 ${f1(-r * at)} L${f1(-r * len)} ${f1(-r * (at + len * 0.75))} M0 ${f1(-r * at)} L${f1(r * len)} ${f1(-r * (at + len * 0.75))}`;
  let g = `<g transform="translate(${f1(cx)} ${f1(cy)})" stroke="${color}" stroke-width="${f1(sw)}" stroke-linecap="round" fill="none">`;
  for (let i = 0; i < 6; i++) g += `<path d="${arm}" transform="rotate(${i * 60})"/>`;
  return g + `<circle r="${f1(sw * 1.4)}" fill="${color}" stroke="none"/></g>`;
}

function hollyLeaf(x: number, y: number, len: number, rot: number, fill: string): string {
  const w = len * 0.36;
  let d = `M0 0`;
  const pts = 4;
  for (let i = 1; i <= pts; i++) { const t = i / pts; d += ` Q${f1(len * (t - 0.12))} ${f1(-w * (i % 2 ? 0.55 : 1.1) * Math.sin(Math.PI * t) - w * 0.2)} ${f1(len * t)} ${f1(i === pts ? 0 : -w * 0.55 * Math.sin(Math.PI * t))}`; }
  for (let i = pts - 1; i >= 0; i--) { const t = i / pts; d += ` Q${f1(len * (t + 0.12))} ${f1(w * (i % 2 ? 0.55 : 1.1) * Math.sin(Math.PI * (t + 0.125)) + w * 0.2)} ${f1(len * t)} ${f1(i === 0 ? 0 : w * 0.55 * Math.sin(Math.PI * t))}`; }
  return `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${rot})"><path d="${d} Z" fill="${fill}"/><path d="M${f1(len * 0.05)} 0 L${f1(len * 0.95)} 0" stroke="${dk(fill, 0.3)}" stroke-width="${f1(len * 0.025)}"/></g>`;
}
const berries = (x: number, y: number, r: number, c: string) => [[0, 0], [r * 1.6, r * 0.5], [r * 0.7, r * 1.5]].map(([dx, dy]) => `<circle cx="${f1(x + dx)}" cy="${f1(y + dy)}" r="${f1(r)}" fill="${c}"/><circle cx="${f1(x + dx - r * 0.35)}" cy="${f1(y + dy - r * 0.35)}" r="${f1(r * 0.3)}" fill="#fff" opacity=".6"/>`).join('');

function reindeerRun(x: number, y: number, s: number, fill: string, phase = 0): string {
  const legs = phase ? 'M38 40 L30 62 M44 40 L52 60 M78 38 L92 58 M84 38 L74 62' : 'M38 40 L22 56 M44 40 L36 64 M78 38 L98 50 M84 38 L90 62';
  return `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})"><path d="M30 24 C40 14 74 14 90 22 C96 26 96 36 90 42 C74 46 46 46 34 42 C26 38 24 30 30 24 Z" fill="${fill}"/><path d="M88 24 L104 6 L112 8 L114 14 L100 28 Z" fill="${fill}"/><path d="M104 6 L100 -10 M102 -2 L94 -8 M106 2 L114 -10 M110 -4 L118 -6" stroke="${fill}" stroke-width="2.6" stroke-linecap="round"/><path d="${legs}" stroke="${fill}" stroke-width="4.5" stroke-linecap="round"/><path d="M30 26 L20 22" stroke="${fill}" stroke-width="4" stroke-linecap="round"/></g>`;
}

function evergreen(cx: number, base: number, h: number, fill: string, snow?: string): string {
  const w = h * 0.42;
  let g = `<path d="M${f1(cx)} ${f1(base - h)} L${f1(cx - w * 0.55)} ${f1(base - h * 0.55)} L${f1(cx - w * 0.3)} ${f1(base - h * 0.55)} L${f1(cx - w * 0.8)} ${f1(base - h * 0.18)} L${f1(cx - w * 0.45)} ${f1(base - h * 0.18)} L${f1(cx - w)} ${f1(base)} L${f1(cx + w)} ${f1(base)} L${f1(cx + w * 0.45)} ${f1(base - h * 0.18)} L${f1(cx + w * 0.8)} ${f1(base - h * 0.18)} L${f1(cx + w * 0.3)} ${f1(base - h * 0.55)} L${f1(cx + w * 0.55)} ${f1(base - h * 0.55)} Z" fill="${fill}"/>`;
  if (snow) g += `<path d="M${f1(cx)} ${f1(base - h)} L${f1(cx - w * 0.3)} ${f1(base - h * 0.74)} Q${f1(cx)} ${f1(base - h * 0.8)} ${f1(cx + w * 0.3)} ${f1(base - h * 0.74)} Z M${f1(cx - w * 0.55)} ${f1(base - h * 0.55)} Q${f1(cx)} ${f1(base - h * 0.6)} ${f1(cx + w * 0.55)} ${f1(base - h * 0.55)} L${f1(cx + w * 0.5)} ${f1(base - h * 0.5)} Q${f1(cx)} ${f1(base - h * 0.54)} ${f1(cx - w * 0.5)} ${f1(base - h * 0.5)} Z" fill="${snow}" opacity=".95"/>`;
  return g;
}

function pineBranch(x: number, y: number, len: number, rot: number, green: string): string {
  let g = `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${rot})"><path d="M0 0 Q${f1(len * 0.5)} ${f1(-len * 0.06)} ${f1(len)} 0" stroke="${dk(green, 0.45)}" stroke-width="${f1(len * 0.025)}" fill="none"/>`;
  for (let i = 0; i < 26; i++) {
    const t = i / 26, px = len * t, py = -len * 0.06 * Math.sin(Math.PI * t) * 0.5, nl = len * (0.16 - t * 0.06);
    g += `<path d="M${f1(px)} ${f1(py)} l${f1(nl * 0.6)} ${f1(-nl * 0.8)} M${f1(px)} ${f1(py)} l${f1(nl * 0.6)} ${f1(nl * 0.8)}" stroke="${i % 2 ? green : lt(green, 0.15)}" stroke-width="${f1(len * 0.014)}" stroke-linecap="round"/>`;
  }
  return g + `</g>`;
}
function pineCone(x: number, y: number, s: number, c: string): string {
  let g = `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})"><ellipse cx="0" cy="22" rx="13" ry="22" fill="${dk(c, 0.2)}"/>`;
  for (let r = 0; r < 5; r++) for (let k = -1; k <= 1; k++) g += `<path d="M${k * 8} ${8 + r * 8} q4 6 0 9 q-4 -3 0 -9 z" fill="${lt(c, 0.12 * (r % 2))}" transform="rotate(${k * 18} ${k * 8} ${8 + r * 8})"/>`;
  return g + `</g>`;
}

// ---------- the collection ----------
const ILLUSTRATIONS: AssetDef[] = [
  A('xm-tree', 'Christmas tree', 'illustration', 200, 270, ['#2f7d4f', '#d62839', '#f2c14e'], ['tree', 'christmas tree', 'ornaments', 'star'], (c) => xmasTree('t', 100, 266, 256, c[0], c[1], c[2], { lights: true })),
  A('xm-tree-snow', 'Snowy tree', 'illustration', 200, 270, ['#2b6b52', '#ffffff', '#f2c14e'], ['tree', 'snow', 'winter', 'evergreen'], (c) => xmasTree('t', 100, 266, 256, c[0], c[1], c[2], { snow: true })),
  A('xm-tree-minimal', 'Minimal tree', 'illustration', 200, 260, ['#1f5c46', '#e0b84a'], ['tree', 'minimal', 'modern', 'geometric', 'line'], (c) => {
    let g = '';
    for (let i = 0; i < 6; i++) { const y = 40 + i * 34, hw = 16 + i * 14; g += `<path d="M${100 - hw} ${y + 34} L100 ${y} L${100 + hw} ${y + 34}" fill="none" stroke="${c[0]}" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"/>`; g += `<circle cx="${100 + (i % 2 ? hw * 0.6 : -hw * 0.6)}" cy="${y + 26}" r="5" fill="${c[1]}"/>`; }
    return g + `<path d="M100 244 V256" stroke="${c[0]}" stroke-width="8" stroke-linecap="round"/><polygon points="${starPts(100, 26, 5, 16, 7)}" fill="${c[1]}"/>`;
  }),
  A('xm-ornament', 'Ornament', 'illustration', 140, 180, ['#c8102e', '#f2c14e', '#d9b44a'], ['ornament', 'bauble', 'decoration'], (c) => ornament('o', 70, 18, 58, c[0], c[1], c[2], 18)),
  A('xm-ornaments', 'Hanging ornaments', 'decoration', 300, 230, ['#c8102e', '#2f7d4f', '#f2c14e'], ['ornaments', 'baubles', 'hanging', 'border', 'decoration'], (c) =>
    ornament('a', 50, 70, 34, c[0], c[2], c[2], 70) + ornament('b', 150, 120, 44, c[1], c[2], c[2], 120) + ornament('c', 250, 40, 30, c[2], c[0], dk(c[2], 0.1), 40)),
  A('xm-santa', 'Santa Claus', 'illustration', 220, 240, ['#d62839', '#ffffff', '#f6c7a5'], ['santa', 'santa claus', 'father christmas', 'kids', 'cute'], (c) =>
    `<defs><radialGradient id="sk" cx="45%" cy="40%"><stop offset="0" stop-color="${lt(c[2], 0.25)}"/><stop offset="1" stop-color="${dk(c[2], 0.08)}"/></radialGradient><linearGradient id="sh" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${lt(c[0], 0.15)}"/><stop offset="1" stop-color="${dk(c[0], 0.25)}"/></linearGradient></defs>` +
    `<path d="M40 92 C40 40 80 16 118 18 C150 20 184 40 196 84 C200 100 190 108 180 100 C170 78 150 66 130 70 Z" fill="url(#sh)"/><circle cx="190" cy="104" r="16" fill="${c[1]}"/>` +
    `<circle cx="110" cy="120" r="54" fill="url(#sk)"/>` +
    `<path d="M50 128 C40 170 64 222 110 232 C156 222 180 170 170 128 C156 150 140 156 110 156 C80 156 64 150 50 128 Z" fill="${c[1]}"/>` +
    [[60, 150], [80, 176], [110, 186], [140, 176], [160, 150], [72, 206], [110, 214], [148, 206]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="20" fill="${c[1]}"/>`).join('') +
    `<path d="M108 146 C94 134 72 136 66 150 C80 148 92 152 108 156 Z M112 146 C126 134 148 136 154 150 C140 148 128 152 112 156 Z" fill="${dk(c[1], 0.06)}"/><ellipse cx="110" cy="138" rx="12" ry="10" fill="${mix(c[2], '#e0705a', 0.5)}"/>` +
    `<path d="M84 116 Q92 108 100 116 M120 116 Q128 108 136 116" stroke="#3a2a2a" stroke-width="4" fill="none" stroke-linecap="round"/><ellipse cx="78" cy="132" rx="10" ry="6" fill="#ff8a8a" opacity=".55"/><ellipse cx="142" cy="132" rx="10" ry="6" fill="#ff8a8a" opacity=".55"/>` +
    `<path d="M76 106 Q92 98 104 104 M116 104 Q128 98 144 106" stroke="${c[1]}" stroke-width="7" stroke-linecap="round" fill="none"/>` +
    `<rect x="40" y="76" width="148" height="30" rx="15" fill="${c[1]}"/><path d="M44 96 H184" stroke="${dk(c[1], 0.08)}" stroke-width="4" opacity=".6"/>`),
  A('xm-reindeer', 'Reindeer', 'illustration', 220, 240, ['#9b6b43', '#5e3b22', '#e63946'], ['reindeer', 'rudolph', 'deer', 'cute', 'kids'], (c) =>
    `<path d="M74 70 C60 50 64 26 50 10 M64 46 C50 44 40 34 34 22 M62 30 C70 22 72 14 70 6 M146 70 C160 50 156 26 170 10 M156 46 C170 44 180 34 186 22 M158 30 C150 22 148 14 150 6" stroke="${c[1]}" stroke-width="9" stroke-linecap="round" fill="none"/>` +
    `<path d="M62 92 C40 80 30 92 40 106 C50 112 62 108 66 102 Z M158 92 C180 80 190 92 180 106 C170 112 158 108 154 102 Z" fill="${c[0]}"/><path d="M60 96 C48 90 42 96 46 102 C52 106 58 104 60 100 Z M160 96 C172 90 178 96 174 102 C168 106 162 104 160 100 Z" fill="${lt(c[0], 0.4)}"/>` +
    `<path d="M110 60 C150 60 166 96 160 136 C156 170 136 204 110 206 C84 204 64 170 60 136 C54 96 70 60 110 60 Z" fill="${c[0]}"/><path d="M110 60 C150 60 166 96 160 136 C156 170 136 204 110 206 C130 190 140 150 136 112 C132 82 124 66 110 60 Z" fill="${dk(c[0], 0.15)}"/>` +
    `<ellipse cx="110" cy="170" rx="38" ry="32" fill="${lt(c[0], 0.45)}"/><circle cx="88" cy="118" r="9" fill="#2a1a12"/><circle cx="132" cy="118" r="9" fill="#2a1a12"/><circle cx="91" cy="115" r="3" fill="#fff"/><circle cx="135" cy="115" r="3" fill="#fff"/>` +
    `<circle cx="110" cy="158" r="17" fill="${c[2]}"/><circle cx="104" cy="152" r="5" fill="#fff" opacity=".6"/><path d="M100 186 Q110 194 120 186" stroke="#2a1a12" stroke-width="3.5" fill="none" stroke-linecap="round"/><ellipse cx="76" cy="146" rx="9" ry="5" fill="#ff8a8a" opacity=".5"/><ellipse cx="144" cy="146" rx="9" ry="5" fill="#ff8a8a" opacity=".5"/>`),
  A('xm-sleigh', 'Santa’s sleigh', 'illustration', 420, 170, ['#2a2236', '#ffcf5a'], ['sleigh', 'santa', 'reindeer', 'flying', 'silhouette', 'moon'], (c) => {
    let g = reindeerRun(250, 46, 0.9, c[0], 0) + reindeerRun(300, 30, 0.9, c[0], 1) + reindeerRun(196, 62, 0.9, c[0], 1) + reindeerRun(146, 78, 0.9, c[0], 0);
    g += `<path d="M150 104 Q240 70 330 52" stroke="${c[0]}" stroke-width="1.6" fill="none"/>`;
    g += `<path d="M20 120 C20 96 34 88 56 88 L110 88 C126 88 134 96 136 108 L150 108 C152 120 146 132 130 134 L44 134 C30 134 20 128 20 120 Z" fill="${c[0]}"/><path d="M14 148 Q20 140 40 142 L136 142 Q150 140 152 128" stroke="${c[0]}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
    g += `<circle cx="72" cy="74" r="14" fill="${c[0]}"/><path d="M60 72 L74 50 L86 70 Z" fill="${c[0]}"/><path d="M40 88 Q48 60 90 70 L100 88 Z" fill="${c[0]}"/>`;
    return g + `<path d="M30 112 H130" stroke="${c[1]}" stroke-width="3" opacity=".8"/>`;
  }),
  A('xm-snowflake', 'Snowflake', 'illustration', 200, 200, ['#ffffff'], ['snowflake', 'snow', 'winter', 'ice'], (c) => snowflake(100, 100, 92, c[0], 9)),
  A('xm-snowflakes', 'Falling snowflakes', 'decoration', 300, 200, ['#ffffff'], ['snowflakes', 'snow', 'winter', 'pattern'], (c) => {
    const r = rng(17); let g = '';
    for (let i = 0; i < 14; i++) g += `<g opacity="${(0.5 + r() * 0.5).toFixed(2)}">${snowflake(r() * 300, r() * 200, 6 + r() * 16, c[0], 2 + r() * 1.5, i)}</g>`;
    return g;
  }),
  A('xm-gift', 'Present', 'illustration', 170, 180, ['#d62839', '#f2c14e', '#ffffff'], ['gift', 'present', 'box', 'bow'], (c) => gift('g', 10, 30, 150, 145, c[0], c[1], c[2])),
  A('xm-gifts', 'Pile of presents', 'illustration', 320, 220, ['#d62839', '#2f7d4f', '#f2c14e'], ['gifts', 'presents', 'boxes', 'pile'], (c) =>
    gift('a', 20, 92, 120, 120, c[1], c[2], lt(c[1], 0.3)) + gift('c', 196, 112, 104, 100, c[2], c[0]) + gift('b', 98, 56, 140, 156, c[0], c[2], c[2])),
  A('xm-stocking', 'Stocking', 'illustration', 160, 220, ['#d62839', '#ffffff', '#2f7d4f'], ['stocking', 'sock', 'fireplace', 'hanging'], (c) =>
    `<defs><clipPath id="sc"><path d="M40 48 H112 V140 C112 150 120 160 132 168 C150 180 150 210 124 214 C104 216 84 206 66 196 C46 186 36 172 38 150 Z"/></clipPath></defs>` +
    `<path d="M40 48 H112 V140 C112 150 120 160 132 168 C150 180 150 210 124 214 C104 216 84 206 66 196 C46 186 36 172 38 150 Z" fill="${c[0]}"/><g clip-path="url(#sc)">` +
    [70, 100, 130].map((y) => `<path d="M30 ${y} H160" stroke="${c[2]}" stroke-width="8"/><path d="M30 ${y + 10} H160" stroke="${c[1]}" stroke-width="3"/>`).join('') +
    `<path d="M98 168 C120 150 158 168 150 200 C140 220 100 214 86 204 Z" fill="${c[2]}"/><path d="M30 120 C60 130 90 130 112 120 L112 48 H160 V240 H30 Z" fill="${dk(c[0], 0.2)}" opacity=".2"/></g>` +
    `<rect x="30" y="20" width="92" height="40" rx="14" fill="${c[1]}"/><path d="M42 40 Q76 30 112 40" stroke="${dk(c[1], 0.1)}" stroke-width="5" fill="none" opacity=".7"/><path d="M116 22 C124 6 136 6 140 18" stroke="${c[2]}" stroke-width="4" fill="none" stroke-linecap="round"/>`),
  A('xm-lights', 'String lights', 'decoration', 420, 110, ['#ff4d4d', '#ffd34d', '#4dc3ff', '#6ee08a'], ['lights', 'string lights', 'fairy lights', 'garland', 'border'], (c) => lightString('l', 0, 420, 12, 18, 11, '#1f3a2a', c)),
  A('xm-wreath', 'Wreath', 'illustration', 240, 250, ['#2f7d4f', '#d62839', '#f2c14e'], ['wreath', 'door', 'holly', 'berries', 'bow'], (c) => {
    let g = '';
    const r = rng(4);
    for (let i = 0; i < 60; i++) { const a = (i / 60) * Math.PI * 2, rr = 78 + (r() - 0.5) * 18, x = 120 + Math.cos(a) * rr, y = 118 + Math.sin(a) * rr; g += `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="22" ry="7" fill="${i % 3 ? c[0] : lt(c[0], 0.18)}" transform="rotate(${f1((a * 180) / Math.PI + 60 + r() * 40)} ${f1(x)} ${f1(y)})"/>`; }
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2 + 0.3; g += berries(120 + Math.cos(a) * 80, 118 + Math.sin(a) * 80, 5, c[1]); }
    g += `<path d="M120 206 C96 186 70 196 78 214 C86 230 108 218 120 206 Z M120 206 C144 186 170 196 162 214 C154 230 132 218 120 206 Z" fill="${c[1]}"/><path d="M114 210 L96 246 L108 242 L114 250 Z M126 210 L144 246 L132 242 L126 250 Z" fill="${dk(c[1], 0.15)}"/><circle cx="120" cy="208" r="9" fill="${dk(c[1], 0.1)}"/>`;
    return g;
  }),
  A('xm-holly', 'Holly', 'decoration', 220, 150, ['#2f7d4f', '#d62839'], ['holly', 'leaves', 'berries', 'corner'], (c) =>
    hollyLeaf(100, 80, 100, -150, c[0]) + hollyLeaf(110, 80, 96, -20, lt(c[0], 0.12)) + hollyLeaf(104, 86, 80, 80, dk(c[0], 0.08)) + berries(96, 70, 11, c[1])),
  A('xm-candy-cane', 'Candy cane', 'illustration', 120, 240, ['#ffffff', '#d62839'], ['candy cane', 'candy', 'sweet', 'stripes'], (c) =>
    `<path d="M76 228 V80 C76 40 30 40 30 76" fill="none" stroke="${dk(c[0], 0.12)}" stroke-width="30" stroke-linecap="round"/><path d="M76 228 V80 C76 40 30 40 30 76" fill="none" stroke="${c[0]}" stroke-width="26" stroke-linecap="round"/><path d="M76 228 V80 C76 40 30 40 30 76" fill="none" stroke="${c[1]}" stroke-width="26" stroke-dasharray="12 14"/><path d="M68 220 V84" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".5"/>`),
  A('xm-snowman', 'Snowman', 'illustration', 200, 260, ['#ffffff', '#d62839', '#2a2a36'], ['snowman', 'snow', 'winter', 'kids', 'cute'], (c) =>
    `<defs><radialGradient id="sn" cx="35%" cy="30%"><stop offset="0" stop-color="${c[0]}"/><stop offset="1" stop-color="${mix(c[0], '#8fb4d9', 0.35)}"/></radialGradient></defs><ellipse cx="100" cy="252" rx="72" ry="7" fill="#000" opacity=".15"/>` +
    `<path d="M44 150 L8 120 M18 128 L6 132 M156 150 L192 116 M182 124 L196 120" stroke="#6b4a2e" stroke-width="5" stroke-linecap="round"/>` +
    `<circle cx="100" cy="200" r="56" fill="url(#sn)"/><circle cx="100" cy="128" r="42" fill="url(#sn)"/><circle cx="100" cy="72" r="32" fill="url(#sn)"/>` +
    `<path d="M66 100 Q100 116 134 100 L134 112 Q100 128 66 112 Z" fill="${c[1]}"/><path d="M120 108 L130 150 L114 152 L108 112 Z" fill="${dk(c[1], 0.1)}"/>` +
    `<rect x="70" y="18" width="60" height="32" rx="4" fill="${c[2]}"/><rect x="60" y="44" width="80" height="9" rx="4" fill="${c[2]}"/><rect x="70" y="36" width="60" height="7" fill="${c[1]}"/>` +
    `<circle cx="89" cy="68" r="4" fill="${c[2]}"/><circle cx="111" cy="68" r="4" fill="${c[2]}"/><path d="M100 76 L126 82 L100 84 Z" fill="#f28c28"/>` +
    [134, 152, 186, 206].map((y) => `<circle cx="100" cy="${y}" r="5" fill="${c[2]}"/>`).join('') + `<path d="M88 90 Q100 96 112 90" stroke="${c[2]}" stroke-width="3" fill="none" stroke-dasharray="1 5" stroke-linecap="round"/>`),
  A('xm-star', 'Gold star', 'illustration', 200, 200, ['#f2c14e'], ['star', 'gold', 'bethlehem', 'topper', 'shine'], (c) =>
    `<defs>${glowDef('sg', c[0], 0.5)}<linearGradient id="sf" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${lt(c[0], 0.45)}"/><stop offset="1" stop-color="${dk(c[0], 0.25)}"/></linearGradient></defs><circle cx="100" cy="100" r="98" fill="url(#sg)"/>` +
    [0, 45, 90, 135].map((a) => `<path d="M100 6 L103 100 L97 100 Z" fill="${lt(c[0], 0.4)}" opacity=".6" transform="rotate(${a} 100 100)"/><path d="M100 194 L103 100 L97 100 Z" fill="${lt(c[0], 0.4)}" opacity=".6" transform="rotate(${a} 100 100)"/>`).join('') +
    `<polygon points="${starPts(100, 104, 5, 62, 26)}" fill="url(#sf)" stroke="${dk(c[0], 0.3)}" stroke-width="2"/>` + `<path d="M100 42 L100 104 L159 85 Z" fill="#fff" opacity=".18"/>`),
  A('xm-bells', 'Golden bells', 'illustration', 220, 190, ['#f2c14e', '#d62839', '#2f7d4f'], ['bells', 'jingle bells', 'gold', 'ring'], (c) => {
    const bell = (x: number, rot: number) => `<g transform="rotate(${rot} ${x} 40)"><defs><linearGradient id="b${x}" x1="0" x2="1"><stop offset="0" stop-color="${lt(c[0], 0.35)}"/><stop offset="1" stop-color="${dk(c[0], 0.3)}"/></linearGradient></defs><path d="M${x} 40 C${x - 30} 40 ${x - 32} 80 ${x - 36} 116 C${x - 40} 132 ${x - 50} 136 ${x - 50} 146 H${x + 50} C${x + 50} 136 ${x + 40} 132 ${x + 36} 116 C${x + 32} 80 ${x + 30} 40 ${x} 40 Z" fill="url(#b${x})"/><path d="M${x - 50} 146 H${x + 50}" stroke="${dk(c[0], 0.35)}" stroke-width="5"/><circle cx="${x}" cy="156" r="10" fill="${dk(c[0], 0.2)}"/><path d="M${x - 18} 60 C${x - 22} 84 ${x - 24} 110 ${x - 28} 128" stroke="#fff" stroke-width="5" opacity=".45" fill="none" stroke-linecap="round"/></g>`;
    return bell(74, 14) + bell(146, -14) + hollyLeaf(110, 40, 56, -160, c[2]) + hollyLeaf(110, 40, 56, -20, c[2]) +
      `<path d="M110 40 C86 10 60 20 70 38 C78 50 98 44 110 40 Z M110 40 C134 10 160 20 150 38 C142 50 122 44 110 40 Z" fill="${c[1]}"/><circle cx="110" cy="40" r="9" fill="${dk(c[1], 0.15)}"/>`;
  }),
  A('xm-gingerbread', 'Gingerbread man', 'illustration', 170, 210, ['#b8733a', '#ffffff', '#d62839'], ['gingerbread', 'cookie', 'baking', 'kids', 'sweet'], (c) =>
    `<path d="M85 10 C62 10 50 26 52 46 C54 60 60 68 66 72 C46 74 18 70 12 90 C8 106 26 112 48 108 L54 108 C50 124 44 150 34 172 C26 190 44 204 58 194 C68 186 76 168 85 150 C94 168 102 186 112 194 C126 204 144 190 136 172 C126 150 120 124 116 108 L122 108 C144 112 162 106 158 90 C152 70 124 74 104 72 C110 68 116 60 118 46 C120 26 108 10 85 10 Z" fill="${c[0]}"/>` +
    `<path d="M24 92 q6 -6 12 0 q6 6 12 0 M122 92 q6 -6 12 0 q6 6 12 0 M42 182 q6 -6 12 0 M116 182 q6 -6 12 0" stroke="${c[1]}" stroke-width="3.5" fill="none" stroke-linecap="round"/>` +
    `<circle cx="74" cy="40" r="5" fill="${c[1]}"/><circle cx="96" cy="40" r="5" fill="${c[1]}"/><path d="M72 54 Q85 64 98 54" stroke="${c[1]}" stroke-width="3.5" fill="none" stroke-linecap="round"/>` +
    `<circle cx="85" cy="94" r="6" fill="${c[2]}"/><circle cx="85" cy="114" r="6" fill="${c[2]}"/><path d="M70 74 L85 82 L100 74 L100 90 L85 82 L70 90 Z" fill="${c[2]}"/>`),
  A('xm-cottage', 'Snowy cottage', 'illustration', 320, 250, ['#8a4b3a', '#ffd27a', '#ffffff'], ['cottage', 'house', 'home', 'snow', 'village', 'cozy'], (c) =>
    `<defs>${glowDef('cw', c[1], 0.45)}</defs><path d="M222 60 C214 40 230 30 222 10 M232 64 C246 46 236 32 246 14" stroke="#d9dde6" stroke-width="7" fill="none" stroke-linecap="round" opacity=".7"/>` +
    `<rect x="212" y="60" width="24" height="50" fill="${dk(c[0], 0.2)}"/><rect x="206" y="54" width="36" height="12" rx="6" fill="${c[2]}"/>` +
    `<circle cx="120" cy="180" r="60" fill="url(#cw)"/><circle cx="210" cy="180" r="44" fill="url(#cw)"/>` +
    `<path d="M60 236 V140 L150 74 L250 140 V236 Z" fill="${c[0]}"/><path d="M150 74 L250 140 V236 H200 V150 Z" fill="${dk(c[0], 0.2)}" opacity=".6"/>` +
    `<path d="M40 150 L150 64 L270 150 L262 162 C240 150 230 160 214 148 C196 160 180 146 160 152 C140 140 120 156 104 146 C84 158 70 146 52 160 Z" fill="${c[2]}"/>` +
    `<rect x="84" y="160" width="44" height="40" rx="3" fill="${c[1]}" stroke="${dk(c[0], 0.4)}" stroke-width="5"/><path d="M106 160 V200 M84 180 H128" stroke="${dk(c[0], 0.4)}" stroke-width="4"/><path d="M80 158 H132" stroke="${c[2]}" stroke-width="6" stroke-linecap="round"/>` +
    `<path d="M180 236 V176 Q200 158 220 176 V236 Z" fill="${dk(c[0], 0.45)}"/><circle cx="212" cy="206" r="3" fill="${c[1]}"/><circle cx="200" cy="168" r="11" fill="none" stroke="#2f7d4f" stroke-width="5"/>` +
    `<path d="M0 250 V232 Q80 218 160 228 Q240 218 320 232 V250 Z" fill="${c[2]}"/>` + evergreen(26, 240, 110, '#2b6b52', c[2]) + evergreen(296, 244, 90, '#2b6b52', c[2])),
  A('xm-pine', 'Pine branch corner', 'decoration', 320, 220, ['#2f6b4f', '#8a5a32', '#d62839'], ['pine', 'branch', 'corner', 'evergreen', 'cones', 'frame'], (c) =>
    pineBranch(0, 30, 260, 12, c[0]) + pineBranch(0, 10, 200, 40, lt(c[0], 0.1)) + pineBranch(30, 0, 180, 70, dk(c[0], 0.08)) + pineCone(118, 70, 1.1, c[1]) + pineCone(86, 96, 0.9, c[1]) + berries(150, 64, 8, c[2])),
  A('xm-garland', 'Pine garland', 'decoration', 480, 140, ['#2f6b4f', '#d62839', '#f2c14e'], ['garland', 'swag', 'border', 'top', 'pine', 'ornaments'], (c) => {
    let g = '';
    for (let i = 0; i < 40; i++) { const t = i / 39, x = t * 480, y = 20 + 46 * Math.sin(Math.PI * ((t * 2) % 1)); g += pineBranch(x - 14, y, 54, -30 + (i % 3) * 30, i % 2 ? c[0] : lt(c[0], 0.12)); }
    return g + ornament('a', 120, 66, 14, c[1], c[2], c[2], 0) + ornament('b', 360, 66, 14, c[2], c[1], c[2], 0) + ornament('c', 240, 16, 12, c[1], c[2], c[2], 0) + `<path d="M0 6 Q120 60 240 6 Q360 60 480 6" stroke="${c[2]}" stroke-width="3" fill="none"/>`;
  }),
  A('xm-frame', 'Gold frame', 'decoration', 400, 520, ['#d4a940'], ['frame', 'border', 'gold', 'elegant', 'luxury', 'invitation'], (c) =>
    frame(400, 520, c[0], 16, (k) => `<path d="M8 60 C8 30 30 8 60 8 M18 74 C26 40 40 26 74 18" stroke="${k}" stroke-width="2.4" fill="none"/><polygon points="${starPts(34, 34, 4, 12, 4, 0)}" fill="${k}"/>`)),
  A('xm-mug', 'Hot cocoa', 'illustration', 180, 180, ['#d62839', '#6b3e26', '#ffffff'], ['cocoa', 'hot chocolate', 'mug', 'cozy', 'drink'], (c) =>
    `<path d="M70 50 C60 34 80 26 70 8 M96 52 C86 36 106 28 96 10" stroke="#d9dde6" stroke-width="6" fill="none" stroke-linecap="round" opacity=".8"/>` +
    `<path d="M134 84 C164 84 166 130 134 132" stroke="${c[0]}" stroke-width="12" fill="none"/><path d="M28 64 H140 L132 158 C130 168 122 174 112 174 H56 C46 174 38 168 36 158 Z" fill="${c[0]}"/><path d="M110 64 H140 L132 158 C130 168 122 174 112 174 Z" fill="${dk(c[0], 0.2)}" opacity=".6"/>` +
    `<ellipse cx="84" cy="64" rx="56" ry="11" fill="${c[1]}"/>` + [[64, 58], [84, 56], [104, 60], [74, 66], [96, 66]].map(([x, y]) => `<rect x="${x - 8}" y="${y - 8}" width="16" height="14" rx="4" fill="${c[2]}" transform="rotate(${x % 30} ${x} ${y})"/>`).join('') +
    snowflake(70, 118, 16, c[2], 2.6) + snowflake(104, 136, 10, c[2], 2) + `<ellipse cx="84" cy="176" rx="64" ry="4" fill="#000" opacity=".15"/>`),
  A('xm-banner', 'Ribbon banner', 'decoration', 420, 110, ['#c8102e', '#f2c14e'], ['banner', 'ribbon', 'label', 'title'], (c) =>
    `<path d="M50 32 L0 32 L20 60 L0 88 L70 88 Z M370 32 L420 32 L400 60 L420 88 L350 88 Z" fill="${dk(c[0], 0.25)}"/><path d="M40 16 H380 V94 H40 Z" fill="${c[0]}"/><path d="M40 24 H380 M40 86 H380" stroke="${c[1]}" stroke-width="3"/>`),
  A('xm-sparkles', 'Gold sparkles', 'decoration', 300, 200, ['#f2c14e'], ['sparkles', 'glitter', 'gold', 'shine', 'stars'], (c) => {
    const r = rng(9); let g = '';
    for (let i = 0; i < 22; i++) g += sparkle(r() * 300, r() * 200, 3 + r() * (i % 4 ? 6 : 16), c[0], 0.5 + r() * 0.5);
    return g;
  }),
  A('xm-poinsettia', 'Poinsettia', 'illustration', 220, 220, ['#c8102e', '#2f7d4f', '#f2c14e'], ['poinsettia', 'flower', 'christmas flower', 'elegant'], (c) => {
    let g = '';
    for (let i = 0; i < 5; i++) g += `<path d="M110 110 C100 80 104 40 110 20 C116 40 120 80 110 110 Z" fill="${c[1]}" transform="rotate(${i * 72 + 36} 110 110) scale(1)"/>`;
    for (let i = 0; i < 6; i++) g += `<path d="M110 110 C92 80 96 40 110 14 C124 40 128 80 110 110 Z" fill="${i % 2 ? c[0] : dk(c[0], 0.12)}" transform="rotate(${i * 60} 110 110)"/><path d="M110 104 V30" stroke="${dk(c[0], 0.3)}" stroke-width="1.6" transform="rotate(${i * 60} 110 110)"/>`;
    for (let i = 0; i < 6; i++) g += `<path d="M110 110 C100 92 102 70 110 56 C118 70 120 92 110 110 Z" fill="${lt(c[0], 0.12)}" transform="rotate(${i * 60 + 30} 110 110)"/>`;
    for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; g += `<circle cx="${f1(110 + Math.cos(a) * 8)}" cy="${f1(110 + Math.sin(a) * 8)}" r="4.5" fill="${c[2]}"/>`; }
    return g;
  }),
];

// ---------- backgrounds ----------
const BGS = backgrounds('christmas', ['christmas', 'xmas', 'holiday', 'winter'], [
  { id: 'xm-bg-snow-night', name: 'Snowy night', colors: ['#0f2747', '#2c5d8f', '#ffffff'], tags: ['snow', 'night', 'trees', 'winter', 'forest'], draw: (c, W, H) => {
    const u = Math.min(W, H);
    let g = `<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c[0]}"/><stop offset="1" stop-color="${c[1]}"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#s)"/>`;
    g += stars(W, H * 0.5, c[2], Math.round((W * H) / 16000), 3, 2.4);
    g += hills(W, H * 0.8, H * 0.06, mix(c[1], c[2], 0.55), 5);
    for (let i = 0; i < 9; i++) g += evergreen(W * (0.04 + i * 0.12) + ((i * 37) % 23), H * (0.82 + (i % 2) * 0.03), u * (0.16 + (i % 3) * 0.05), mix(c[0], '#1d4f3a', 0.6), c[2]);
    g += hills(W, H * 0.9, H * 0.05, mix(c[2], c[1], 0.12), 8) + snowfall(W, H, c[2], Math.round((W * H) / 5000), 2, u * 0.004);
    return g;
  } },
  { id: 'xm-bg-red-luxe', name: 'Red & gold luxury', colors: ['#5c0a14', '#b3122a', '#e8c46a'], tags: ['red', 'gold', 'luxury', 'elegant', 'damask'], draw: (c, W, H) =>
    `<defs><radialGradient id="r" cx="50%" cy="45%" r="75%"><stop offset="0" stop-color="${c[1]}"/><stop offset="1" stop-color="${c[0]}"/></radialGradient><pattern id="p" width="90" height="90" patternUnits="userSpaceOnUse"><path d="M45 8 C52 30 60 38 82 45 C60 52 52 60 45 82 C38 60 30 52 8 45 C30 38 38 30 45 8 Z" fill="none" stroke="${c[2]}" stroke-width="1.4" opacity=".36"/><circle cx="0" cy="0" r="3" fill="${c[2]}" opacity=".36"/><circle cx="90" cy="90" r="3" fill="${c[2]}" opacity=".36"/></pattern></defs><rect width="${W}" height="${H}" fill="url(#r)"/><rect width="${W}" height="${H}" fill="url(#p)"/>` + stars(W, H, c[2], Math.round((W * H) / 30000), 6, 2.2) },
  { id: 'xm-bg-plaid', name: 'Tartan plaid', colors: ['#b3122a', '#1f4d34', '#f2c14e'], tags: ['plaid', 'tartan', 'pattern', 'cozy', 'flannel'], draw: (c, W, H) =>
    `<defs><pattern id="p" width="160" height="160" patternUnits="userSpaceOnUse"><rect width="160" height="160" fill="${c[0]}"/><rect y="40" width="160" height="50" fill="${c[1]}" opacity=".55"/><rect x="40" width="50" height="160" fill="${c[1]}" opacity=".55"/><rect y="20" width="160" height="6" fill="#000" opacity=".25"/><rect x="20" width="6" height="160" fill="#000" opacity=".25"/><rect y="120" width="160" height="3" fill="${c[2]}" opacity=".8"/><rect x="120" width="3" height="160" fill="${c[2]}" opacity=".8"/><rect y="62" width="160" height="2" fill="#fff" opacity=".35"/><rect x="62" width="2" height="160" fill="#fff" opacity=".35"/></pattern></defs><rect width="${W}" height="${H}" fill="url(#p)"/>` },
  { id: 'xm-bg-snowy-day', name: 'Snowy day', colors: ['#cfe6f8', '#f7fbff', '#9cc3e6'], tags: ['snow', 'day', 'winter', 'light', 'pastel'], draw: (c, W, H) => {
    const u = Math.min(W, H);
    return `<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c[0]}"/><stop offset="1" stop-color="${c[1]}"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#s)"/>`
      + hills(W, H * 0.84, H * 0.07, mix(c[2], c[1], 0.45), 7) + evergreen(W * 0.12, H * 0.86, u * 0.26, mix(c[2], '#2b6b52', 0.6), c[1]) + evergreen(W * 0.86, H * 0.87, u * 0.22, mix(c[2], '#2b6b52', 0.6), c[1])
      + hills(W, H * 0.92, H * 0.05, c[1], 3) + snowfall(W, H, '#ffffff', Math.round((W * H) / 6000), 6, u * 0.005);
  } },
  { id: 'xm-bg-cream', name: 'Cream & gold', colors: ['#f8f1e5', '#d4a940'], tags: ['cream', 'minimal', 'gold', 'elegant', 'modern'], draw: (c, W, H) => {
    const r = rng(3); let g = `<rect width="${W}" height="${H}" fill="${c[0]}"/>`;
    for (let i = 0; i < Math.round((W * H) / 26000); i++) g += i % 5 ? `<circle cx="${f1(r() * W)}" cy="${f1(r() * H)}" r="${f1(1.5 + r() * 3)}" fill="${c[1]}" opacity="${(0.25 + r() * 0.4).toFixed(2)}"/>` : sparkle(r() * W, r() * H, 6 + r() * 8, c[1], 0.5);
    return g;
  } },
  { id: 'xm-bg-green-bokeh', name: 'Evergreen lights', colors: ['#0b2e22', '#1f6b4f', '#f2c14e'], tags: ['green', 'bokeh', 'lights', 'glow', 'night'], draw: (c, W, H) =>
    `<defs><radialGradient id="r" cx="50%" cy="40%" r="80%"><stop offset="0" stop-color="${c[1]}"/><stop offset="1" stop-color="${c[0]}"/></radialGradient></defs><rect width="${W}" height="${H}" fill="url(#r)"/>` + bokeh(W, H, [c[2], lt(c[2], 0.5), '#ff8a6a'], Math.round((W * H) / 22000), 12, Math.min(W, H) * 0.08, 'bk') + stars(W, H, lt(c[2], 0.4), Math.round((W * H) / 30000), 5, 2) },
]);

export const ASSETS: AssetDef[] = [...ILLUSTRATIONS, ...BGS];
