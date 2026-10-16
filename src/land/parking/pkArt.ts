/**
 * Parking Escape's little illustrations for the 2D screens (no 3D, no image files): the neighbourhood banners on the level map, the star
 * car for the start card and the Garage tiles. Flat, rounded, a few colours each — they follow the game's look, not a photo.
 */
const NS = 'http://www.w3.org/2000/svg';
const el = (html: string, cls: string, vb: string, par = 'xMidYMid slice'): SVGSVGElement => {
  const s = document.createElementNS(NS, 'svg');
  s.setAttribute('viewBox', vb); s.setAttribute('class', cls); s.setAttribute('preserveAspectRatio', par); s.setAttribute('aria-hidden', 'true');
  s.innerHTML = html;
  return s;
};
const mix = (a: string, b: string, t: number): string => {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('');
};

// ---------- neighbourhood banners (360 × 120) ----------
const cloud = (x: number, y: number, s = 1, c = '#fff') => `<g transform="translate(${x} ${y}) scale(${s})" fill="${c}" opacity=".9"><ellipse cx="0" cy="0" rx="17" ry="7"/><ellipse cx="-9" cy="-5" rx="9" ry="7"/><ellipse cx="7" cy="-7" rx="11" ry="8"/></g>`;
const roundTree = (x: number, y: number, s = 1, c = '#4f9e3f') => `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-2.5" y="-12" width="5" height="14" rx="2" fill="#8a5a3c"/><circle cx="0" cy="-20" r="13" fill="${c}"/><circle cx="-4" cy="-24" r="5" fill="#fff" opacity=".18"/></g>`;
const pine = (x: number, y: number, s = 1, c = '#2f7d58', snow = false) => `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-2" y="-8" width="4" height="10" rx="1.5" fill="#7a4e33"/><path d="M0-40 13-14h-26z" fill="${c}"/><path d="M0-30 15-6h-30z" fill="${c}"/>${snow ? '<path d="M0-40 6-28.6c-3 1.6-9 1.6-12 0zM0-30l7 11c-4.4 2-9.6 2-14 0z" fill="#fff"/>' : ''}</g>`;
const house = (x: number, y: number, w: number, wall: string, roof: string) => `<g transform="translate(${x} ${y})"><rect x="0" y="-${w * 0.55}" width="${w}" height="${w * 0.55}" rx="2.5" fill="${wall}"/><path d="M-4 -${w * 0.55} ${w / 2} -${w * 0.55 + w * 0.42} ${w + 4} -${w * 0.55}z" fill="${roof}" stroke="${roof}" stroke-width="2" stroke-linejoin="round"/><rect x="${w * 0.2}" y="-${w * 0.38}" width="${w * 0.2}" height="${w * 0.2}" rx="2" fill="#bfe6f7"/><rect x="${w * 0.58}" y="-${w * 0.34}" width="${w * 0.2}" height="${w * 0.34}" rx="2.5" fill="#8a5a3c"/></g>`;
const scenes: Record<string, (sky: string, ground: string) => string> = {
  sunny: (sky, g) => `${cloud(60, 26)}${cloud(250, 18, 0.8)}<circle cx="318" cy="26" r="13" fill="#ffd34a"/><path d="M0 86Q90 72 180 84T360 80V120H0z" fill="${g}"/>${house(36, 92, 54, '#fff7ea', '#d6584a')}${house(214, 90, 46, '#ffe6ef', '#7aa7e0')}${roundTree(144, 96, 1)}${roundTree(300, 100, 0.8, '#5fae48')}`,
  downtown: (sky, g) => `${cloud(80, 22)}<rect y="88" width="360" height="32" fill="${g}"/>${[0, 1, 2, 3, 4].map((k) => { const x = 18 + k * 68, c = ['#e9764f', '#5fb3d9', '#f2c14e', '#d6336c', '#6fae6b'][k]; return `<rect x="${x}" y="46" width="58" height="46" rx="3" fill="#fff6e6"/><path d="M${x - 3} 46h64l-4 16H${x + 1}z" fill="${c}"/><path d="M${x + 8} 46v16M${x + 22} 46v16M${x + 36} 46v16M${x + 50} 46v16" stroke="#fff" stroke-width="5" opacity=".55"/><rect x="${x + 20}" y="68" width="18" height="24" rx="3" fill="#8a6a56"/><rect x="${x + 6}" y="68" width="10" height="12" rx="2" fill="#bfe6f7"/><rect x="${x + 42}" y="68" width="10" height="12" rx="2" fill="#bfe6f7"/>`; }).join('')}`,
  mall: (sky, g) => `${cloud(300, 24, 0.9)}<rect y="88" width="360" height="32" fill="${g}"/><rect x="40" y="40" width="280" height="50" rx="8" fill="#f4f7fa"/><rect x="40" y="40" width="280" height="14" rx="7" fill="#d6336c"/><rect x="150" y="58" width="60" height="32" rx="4" fill="#bfe6f7"/><path d="M180 58v32" stroke="#fff" stroke-width="3"/><rect x="62" y="62" width="64" height="18" rx="4" fill="#cfe6f5"/><rect x="234" y="62" width="64" height="18" rx="4" fill="#cfe6f5"/>${[0, 1, 2, 3, 4, 5].map((k) => `<path d="M${30 + k * 60} 120l8-26" stroke="#fff" stroke-width="3" opacity=".7"/>`).join('')}`,
  beach: (sky, g) => `<circle cx="300" cy="28" r="14" fill="#ffd34a"/>${cloud(70, 24)}<rect y="58" width="360" height="26" fill="#58bde0"/><path d="M0 62q15-6 30 0t30 0 30 0 30 0 30 0 30 0 30 0 30 0 30 0 30 0 30 0 30 0" stroke="#fff" stroke-width="2.4" fill="none" opacity=".8"/><path d="M0 84Q120 74 240 86T360 80V120H0z" fill="${g}"/><g transform="translate(74 98)"><path d="M-22 -34a22 22 0 0 1 44 0z" fill="#e9764f"/><path d="M-22 -34a22 22 0 0 1 11 -19M0 -34V-56M0 -34a22 22 0 0 1 0 0" stroke="#fff" stroke-width="5" opacity=".6"/><rect x="-1.5" y="-34" width="3" height="36" fill="#8a5a3c"/></g><g transform="translate(268 100)"><path d="M0 0q-3-30 6-52" stroke="#8a5a3c" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M6-52q-18-2-26 8M6-52q14-8 26 0M6-52q-10-12-22-8M6-52q16 0 22 12" stroke="#3fae7a" stroke-width="6" fill="none" stroke-linecap="round"/></g>`,
  winter: (sky, g) => `${cloud(90, 22, 1, '#fff')}<path d="M0 84Q100 72 200 86T360 78V120H0z" fill="#fff"/>${pine(40, 98, 1.1, '#2f7d58', true)}${pine(84, 102, 0.8, '#3f8d68', true)}${pine(300, 100, 1.1, '#2f7d58', true)}<g transform="translate(190 100)"><circle cy="-8" r="13" fill="#fff" stroke="#dce8f2" stroke-width="2"/><circle cy="-26" r="9.4" fill="#fff" stroke="#dce8f2" stroke-width="2"/><circle cx="-3" cy="-28" r="1.3" fill="#3d2f2a"/><circle cx="3" cy="-28" r="1.3" fill="#3d2f2a"/><path d="M0-26l7 1.6-7 1.6z" fill="#f08a3c"/><path d="M-9-19q9 5 18 0" stroke="#d6336c" stroke-width="3.6" fill="none" stroke-linecap="round"/></g>${house(236, 96, 44, '#fff7ea', '#8fb4d6')}`,
  airport: (sky, g) => `${cloud(70, 24)}<rect y="88" width="360" height="32" fill="#8d949c"/><path d="M0 104H360" stroke="#fff" stroke-width="3" stroke-dasharray="16 12"/><rect y="84" width="360" height="6" fill="${g}"/><g transform="translate(230 42) rotate(-8)"><ellipse rx="42" ry="9" fill="#fff"/><path d="M-6 0 14-26h10L12 0zM-6 0 14 22h10L12 0z" fill="#e9eef2"/><path d="M-40-2-50-14h10l8 10z" fill="#d6336c"/><ellipse cx="22" cy="-2" rx="9" ry="3.4" fill="#7aa7e0"/></g><g transform="translate(66 88)"><rect x="-6" y="-48" width="12" height="48" fill="#e9eef2"/><rect x="-16" y="-62" width="32" height="16" rx="6" fill="#7aa7e0"/><rect x="-18" y="-48" width="36" height="5" rx="2" fill="#d6336c"/></g>`,
  festival: (sky, g) => `<path d="M0 90Q120 78 240 90T360 84V120H0z" fill="${g}"/><path d="M0 18Q90 40 180 18T360 18" stroke="#8a5a3c" stroke-width="2" fill="none"/>${Array.from({ length: 12 }, (_, k) => { const x = 14 + k * 30, y = 18 + Math.sin((x / 360) * Math.PI * 2 + 3.1) * 9 + 9; return `<path d="M${x - 8} ${y}l16 0-8 14z" fill="${['#d6336c', '#fff', '#f2c14e', '#5fb3d9'][k % 4]}"/>`; }).join('')}<g transform="translate(250 96)"><circle cy="-34" r="30" fill="none" stroke="#d6336c" stroke-width="4"/><path d="M0-64V-4M-30-34H30M-21-55 21-13M21-55-21-13" stroke="#d6336c" stroke-width="2.4"/><path d="M-12 0 0-34 12 0" stroke="#8a5a3c" stroke-width="4" fill="none"/>${[0, 1, 2, 3, 4, 5].map((k) => `<circle cx="${Math.cos(k * 1.0472) * 30}" cy="${-34 + Math.sin(k * 1.0472) * 30}" r="4.4" fill="${k % 2 ? '#f2c14e' : '#fff'}"/>`).join('')}</g><g transform="translate(74 98)"><path d="M-36 0 0-44 36 0z" fill="#fff"/><path d="M-36 0 0-44-12 0zM12 0 0-44 36 0z" fill="#d6336c"/><path d="M-9 0 0-14 9 0z" fill="#8a1f4a"/></g>`,
  mountain: (sky, g) => `${cloud(300, 22, 0.9)}<path d="M0 90 70 30 120 70 190 14 270 80 320 44 360 76V120H0z" fill="#9fb4c4"/><path d="M190 14 168 38q10 6 22-2 8 8 18 2zM70 30 56 46q8 4 14-2 6 6 12 0z" fill="#fff"/><path d="M0 92Q120 80 240 94T360 88V120H0z" fill="${g}"/>${pine(40, 104, 1)}${pine(80, 108, 0.8)}${pine(290, 106, 1)}${pine(324, 110, 0.75)}${house(158, 100, 40, '#fff7ea', '#a8613c')}`,
  garage: () => `<rect width="360" height="120" fill="#3d424a"/>${[0, 1, 2, 3, 4].map((k) => `<rect x="${24 + k * 76}" y="0" width="30" height="96" fill="#555b64"/><rect x="${24 + k * 76}" y="0" width="6" height="96" fill="#fff" opacity=".1"/>`).join('')}<rect x="20" y="14" width="320" height="6" rx="3" fill="#ffd9a0" opacity=".85"/><rect x="20" y="40" width="320" height="4" rx="2" fill="#ffd9a0" opacity=".35"/><rect y="92" width="360" height="28" fill="#7c828b"/><path d="M0 104H360" stroke="#ffc21a" stroke-width="2.4" stroke-dasharray="14 10" opacity=".9"/>`,
  city: (sky, g) => `${cloud(60, 22)}<rect y="92" width="360" height="28" fill="${g}"/>${[[20, 40, 34], [58, 22, 36], [100, 52, 30], [136, 14, 40], [182, 44, 32], [220, 28, 38], [262, 50, 30], [298, 20, 40]].map(([x, y, w], k) => `<rect x="${x}" y="${y}" width="${w}" height="${94 - y}" rx="3" fill="${['#8fa6c0', '#a9bbd0', '#7c94b0', '#b7c6d8'][k % 4]}"/>${Array.from({ length: 4 }, (_, r) => `<rect x="${x + 6}" y="${y + 8 + r * 14}" width="${w - 12}" height="4" rx="2" fill="#fff" opacity=".55"/>`).join('')}`).join('')}<g transform="translate(180 100)"><path d="M-22 0h44l-6-10h-32z" fill="#cfd9e3"/><path d="M0-10V-26M0-26q-10-4-12 4M0-26q10-4 12 4" stroke="#7ec8ec" stroke-width="3" fill="none" stroke-linecap="round"/></g>`,
};
/** the illustrated strip at the top of a neighbourhood on the level map (360 × 120, sky and ground follow the neighbourhood) */
export function envBanner(id: string, sky: string, ground: string): SVGSVGElement {
  const dark = id === 'garage';
  const sc = (scenes[id] ?? scenes.sunny)(sky, ground);
  return el(`${dark ? '' : `<rect width="360" height="120" fill="${mix(sky, '#ffffff', 0.25)}"/><rect y="60" width="360" height="60" fill="${mix(sky, '#ffffff', 0.5)}" opacity=".45"/>`}${sc}`, 'pk-banner-art', '0 0 360 120');
}

// ---------- the star car ----------
const wheel = (x: number, y: number, r: number) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#3d3440"/><circle cx="${x}" cy="${y}" r="${r * 0.5}" fill="#d9d2dc"/><circle cx="${x}" cy="${y}" r="${r * 0.18}" fill="#3d3440"/>`;
/** a toy car in side view for the Garage tiles — one silhouette per style (Convertible, Sports car, SUV, Van, Pickup, Taxi) */
export function carArt(style: number, color: string): SVGSVGElement {
  const dark = mix(color, '#000000', 0.28), glass = '#cfeaf7';
  const L: Record<number, string> = {
    0: `<path d="M6 30v-7q0-3 3-3l9-1 8-7h7l3 7 10 1q4 .6 4 4v6z" fill="${color}"/><path d="M25 12.6h6l2 6.6h-14z" fill="${glass}"/><rect x="34" y="12" width="2.6" height="8" rx="1" fill="${dark}"/>`,
    1: `<path d="M4 30v-6q0-4 4-4l12-2 9-6h9l9 7q8 1 10 4 2 1.6 2 4v3z" fill="${color}"/><path d="M27 14h7l5.6 6H21z" fill="${glass}"/><path d="M10 25h44" stroke="${dark}" stroke-width="1.6" opacity=".5"/>`,
    2: `<path d="M5 30v-12q0-4 4-4h6l3-4h26l5 4h3q3 0 3 4v12z" fill="${color}"/><path d="M19 12.6h14v8H15zM35 12.6h9l4 8H35z" fill="${glass}"/><path d="M19 8h27" stroke="${dark}" stroke-width="2.4" stroke-linecap="round"/>`,
    3: `<path d="M4 30V15q0-5 5-5h38q7 0 11 9l1 3q2 1 2 4v4z" fill="${color}"/><path d="M10 13h10v8H10zM23 13h10v8H23zM36 13h9l5 8H36z" fill="${glass}"/>`,
    4: `<path d="M4 30v-8q0-3 3-3h4v-4q0-3 3-3h10l6 7v-0h4q2 0 2 3v8z" fill="${color}"/><path d="M26 15h6l4 5H24z" fill="${glass}" transform="translate(-9 0)"/><path d="M38 30v-11h22q2 0 2 3v8z" fill="${dark}"/><rect x="43" y="14" width="7" height="5" rx="1.4" fill="#f2c14e"/><rect x="51" y="15" width="6" height="4" rx="1.4" fill="#e9764f"/>`,
    5: `<path d="M5 30v-7q0-3 3-3l10-1 7-7h12l7 7 9 1q4 .6 4 4v6z" fill="${color}"/><path d="M28 14h6l4.6 5.4H22.6z" fill="${glass}"/><rect x="27" y="8.4" width="12" height="4.4" rx="2" fill="#ffd34a"/><path d="M6 25h46" stroke="#3d3440" stroke-width="1.8" stroke-dasharray="4 3" opacity=".6"/>`,
  };
  return el(`${L[style] ?? L[0]}${wheel(17, 30.5, 4.8)}${wheel(49, 30.5, 4.8)}`, 'pk-car-art', '0 0 64 40', 'xMidYMid meet');
}
/** the pink star car for the start card (a driver's picture is laid over its cockpit by the caller) */
export function heroCar(): SVGSVGElement {
  return el(`<ellipse cx="110" cy="109" rx="86" ry="8" fill="#000" opacity=".12"/>
  <path d="M18 98V82q0-8 8-10l36-8q8-2 14-8l8-8q4-4 10-4h22q8 0 12 6l10 14 20 4q10 2 10 12v18q0 4-4 4H22q-4 0-4-4z" fill="#e0527f"/>
  <path d="M18 88h196v10q0 4-4 4H22q-4 0-4-4z" fill="#a8204f"/>
  <path d="M48 66l36-8q8-2 14-8l8-8q4-4 10-4h6v28H48z" fill="#bfe6f7" opacity=".0"/>
  <rect x="26" y="78" width="32" height="6" rx="3" fill="#fff3b0"/>
  <path d="M140 70h26l10 12h-36z" fill="#fff" opacity=".0"/>
  <path d="M124 76h44" stroke="#a8204f" stroke-width="2.4" stroke-linecap="round" opacity=".6"/>
  <polygon points="150,80 153,87 160,87 154.5,91.5 156.5,98.5 150,94.5 143.5,98.5 145.5,91.5 140,87 147,87" fill="#ffc83a" stroke="#d98f00" stroke-width="1.6" stroke-linejoin="round"/>
  <path d="M40 100h8" stroke="#fff" stroke-width="2" opacity=".5"/>
  ${wheel(62, 102, 16)}${wheel(168, 102, 16)}`, 'pk-hero-car', '0 0 230 120', 'xMidYMax meet');
}
