/**
 * Business & media artwork (bz-) — original vector pieces drawn in code for Fuzzies: logo marks (coffee cup, mountain
 * peak, shield, tulip, surf wave, wheat, isometric cube), botanicals for menus and wedding stationery (olive branch,
 * eucalyptus sprig), and explainer illustrations for decks and carousels (water cycle, booking app on a phone, moon &
 * stars, shop front, vlog camera). Every colour comes from the slots, so templates recolour them freely.
 */
import type { AssetDef } from '../index';
import { asset, dk, f1, lt, rng, starPts } from '../draw';

const A = asset('bizart', ['business', 'brand']);
const R = 'stroke-linecap="round" stroke-linejoin="round"';

/** A pointed leaf of length `len` and half-width `wid`, starting at (x, y) and pointing at `deg` degrees. */
const leaf = (x: number, y: number, len: number, wid: number, deg: number, fill: string, vein?: string) =>
  `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(deg)})"><path d="M0 0 Q${f1(len * 0.45)} ${f1(-wid)} ${f1(len)} 0 Q${f1(len * 0.45)} ${f1(wid)} 0 0 Z" fill="${fill}"/>${vein ? `<path d="M${f1(len * 0.08)} 0 L${f1(len * 0.82)} 0" stroke="${vein}" stroke-width="${f1(wid * 0.12)}" stroke-linecap="round" opacity=".55"/>` : ''}</g>`;

/** A point on a quadratic curve. */
const q = (t: number, a: number[], b: number[], c: number[]) => [(1 - t) ** 2 * a[0] + 2 * (1 - t) * t * b[0] + t * t * c[0], (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * b[1] + t * t * c[1]];

function oliveBranch([lf, fruit]: string[]): string {
  const a = [14, 92], b = [170, 120], c = [386, 44];
  let g = `<path d="M${a} Q${b} ${c}" fill="none" stroke="${dk(lf, 0.28)}" stroke-width="4.5" stroke-linecap="round"/>`;
  const n = 11;
  for (let i = 0; i < n; i++) {
    const t = 0.08 + (i / (n - 1)) * 0.88, [x, y] = q(t, a, b, c);
    const tang = (Math.atan2(c[1] - b[1], c[0] - b[0]) * t + Math.atan2(b[1] - a[1], b[0] - a[0]) * (1 - t)) * 180 / Math.PI;
    const up = i % 2 === 0, len = 58 - Math.abs(i - 4) * 2.4;
    g += leaf(x, y, len, 10.5, tang + (up ? -48 : 44), i % 3 === 0 ? lt(lf, 0.14) : lf, dk(lf, 0.35));
  }
  for (const [t, off] of [[0.3, 16], [0.56, -18], [0.74, 15]] as const) {
    const [x, y] = q(t, a, b, c);
    g += `<path d="M${f1(x)} ${f1(y)} L${f1(x + 4)} ${f1(y + off * 0.8)}" stroke="${dk(lf, 0.28)}" stroke-width="2.5"/>`;
    g += `<ellipse cx="${f1(x + 5)}" cy="${f1(y + off * 1.25)}" rx="9.5" ry="12.5" fill="${fruit}" transform="rotate(-18 ${f1(x + 5)} ${f1(y + off * 1.25)})"/>`;
    g += `<ellipse cx="${f1(x + 2)}" cy="${f1(y + off * 1.25 - 4)}" rx="2.6" ry="4" fill="${lt(fruit, 0.45)}" opacity=".8"/>`;
  }
  return g;
}

function eucalyptus([lf, stem]: string[]): string {
  const r = rng(7);
  let g = `<path d="M110 392 C96 300 132 220 112 140 C100 92 118 46 128 10" fill="none" stroke="${stem}" stroke-width="4" stroke-linecap="round"/>`;
  const spine = (t: number) => { // samples the stem roughly
    const y = 392 - t * 382, x = 110 + Math.sin(t * 5.2) * 14 + t * 10;
    return [x, y];
  };
  for (let i = 0; i < 13; i++) {
    const t = 0.06 + i * 0.07, [x, y] = spine(t), rr = 30 - i * 1.5, side = i % 2 ? 1 : -1;
    const cx = x + side * rr * 0.95, cy = y - rr * 0.25;
    const shade = [lf, lt(lf, 0.16), dk(lf, 0.1)][Math.floor(r() * 3)];
    g += `<path d="M${f1(x)} ${f1(y)} L${f1(cx - side * rr * 0.6)} ${f1(cy)}" stroke="${stem}" stroke-width="2.5"/>`;
    g += `<ellipse cx="${f1(cx)}" cy="${f1(cy)}" rx="${f1(rr)}" ry="${f1(rr * 0.86)}" fill="${shade}" transform="rotate(${f1(side * 18)} ${f1(cx)} ${f1(cy)})"/>`;
    g += `<path d="M${f1(cx - side * rr * 0.7)} ${f1(cy)} Q${f1(cx)} ${f1(cy - rr * 0.18)} ${f1(cx + side * rr * 0.6)} ${f1(cy - rr * 0.1)}" stroke="${dk(lf, 0.25)}" stroke-width="1.6" fill="none" opacity=".45"/>`;
  }
  return g;
}

function coffeeLine([ink]: string[]): string {
  const s = `fill="none" stroke="${ink}" stroke-width="9" ${R}`;
  return `<path d="M58 112 H182 V150 C182 196 152 222 120 222 C88 222 58 196 58 150 Z" ${s}/>`
    + `<path d="M182 128 C214 124 222 160 184 176" ${s}/>`
    + `<path d="M36 238 H204" ${s}/>`
    + `<path d="M92 92 C80 76 104 66 92 46 M120 90 C108 70 134 58 120 30 M148 92 C136 76 160 66 148 46" fill="none" stroke="${ink}" stroke-width="7" ${R}/>`;
}

function peak([main, detail]: string[]): string {
  return `<path d="M14 196 L104 46 L194 196 Z" fill="${main}"/>`
    + `<path d="M130 196 L178 112 L226 196 Z" fill="${dk(main, 0.25)}"/>`
    + `<path d="M104 46 L132 92 L116 84 L102 100 L88 86 L76 92 Z" fill="${detail}"/>`
    + `<path d="M178 112 L192 136 L182 132 L174 142 L166 134 Z" fill="${detail}" opacity=".85"/>`;
}

function shield([main, detail]: string[]): string {
  return `<path d="M120 8 L224 40 V128 C224 196 176 246 120 272 C64 246 16 196 16 128 V40 Z" fill="${main}"/>`
    + `<path d="M120 24 L210 52 V128 C210 188 168 232 120 256 C72 232 30 188 30 128 V52 Z" fill="none" stroke="${detail}" stroke-width="4"/>`;
}

function tulip([petal, leafC]: string[]): string {
  return `<path d="M80 252 C82 200 78 160 80 120" fill="none" stroke="${leafC}" stroke-width="6" stroke-linecap="round"/>`
    + `<path d="M80 236 C40 222 24 186 30 150 C56 168 74 196 80 236 Z" fill="${leafC}"/>`
    + `<path d="M82 214 C114 204 132 176 128 146 C104 160 88 184 82 214 Z" fill="${lt(leafC, 0.15)}"/>`
    + `<path d="M50 54 C46 96 58 124 80 128 C102 124 114 96 110 54 L96 76 L80 46 L64 76 Z" fill="${petal}"/>`
    + `<path d="M80 46 L64 76 C68 100 74 116 80 128 C86 116 92 100 96 76 Z" fill="${dk(petal, 0.12)}"/>`;
}

function surfWave([main, detail]: string[]): string {
  return `<defs><clipPath id="bzwave"><circle cx="120" cy="120" r="108"/></clipPath></defs>`
    + `<circle cx="120" cy="120" r="108" fill="${detail}"/>`
    + `<circle cx="166" cy="78" r="26" fill="${lt(main, 0.55)}"/>`
    + `<g clip-path="url(#bzwave)"><path d="M0 170 C30 120 70 92 112 96 C152 100 168 132 150 152 C136 166 114 160 116 146 C118 136 130 134 134 140 C130 118 96 116 80 140 C66 160 70 200 110 214 C150 228 200 210 240 176 V260 H0 Z" fill="${main}"/>`
    + `<path d="M0 214 C60 196 120 236 240 204 V260 H0 Z" fill="${dk(main, 0.25)}"/></g>`
    + `<circle cx="120" cy="120" r="108" fill="none" stroke="${main}" stroke-width="8"/>`;
}

function wheat([main]: string[]): string {
  let g = `<path d="M50 292 C52 220 50 140 50 40" fill="none" stroke="${main}" stroke-width="5" stroke-linecap="round"/>`;
  for (let i = 0; i < 7; i++) {
    const y = 64 + i * 26;
    g += `<ellipse cx="34" cy="${y}" rx="10" ry="19" fill="${main}" transform="rotate(-28 34 ${y})"/><ellipse cx="66" cy="${y}" rx="10" ry="19" fill="${main}" transform="rotate(28 66 ${y})"/>`;
  }
  return g + `<ellipse cx="50" cy="36" rx="9" ry="20" fill="${main}"/><path d="M50 20 L48 2 M38 44 L26 14 M62 44 L74 14" stroke="${main}" stroke-width="2.5" stroke-linecap="round"/>`;
}

function cube([main, detail]: string[]): string {
  // an isometric cube with its front corner cut: three shaded faces + the accent face on top
  const top = `M120 20 L206 70 L120 120 L34 70 Z`, left = `M34 70 L120 120 V220 L34 170 Z`, right = `M206 70 V170 L120 220 V120 Z`;
  return `<path d="${left}" fill="${main}"/><path d="${right}" fill="${dk(main, 0.3)}"/><path d="${top}" fill="${detail}"/>`
    + `<path d="M120 120 L163 95 V145 L120 170 Z" fill="${lt(main, 0.92)}"/><path d="M120 120 L77 95 V145 L120 170 Z" fill="${lt(main, 0.75)}"/>`;
}

function waterCycle([water, land, sun, cloud]: string[]): string {
  const arrow = (d: string, c: string) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="6" stroke-dasharray="2 14" ${R}/>`;
  let g = `<circle cx="78" cy="70" r="40" fill="${sun}"/>`;
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; g += `<path d="M${f1(78 + Math.cos(a) * 50)} ${f1(70 + Math.sin(a) * 50)} L${f1(78 + Math.cos(a) * 62)} ${f1(70 + Math.sin(a) * 62)}" stroke="${sun}" stroke-width="6" stroke-linecap="round"/>`; }
  g += `<path d="M300 300 L392 150 L470 300 Z" fill="${land}"/><path d="M392 150 L414 186 L400 180 L388 194 L376 182 L366 186 Z" fill="${cloud}"/>`;
  g += `<path d="M230 300 L300 214 L360 300 Z" fill="${dk(land, 0.18)}"/>`;
  g += `<path d="M0 248 C60 240 120 256 180 248 C220 243 250 252 290 250 V300 H0 Z" fill="${water}"/>`;
  g += `<path d="M20 266 C40 262 60 270 80 266 M120 276 C140 272 160 280 180 276" stroke="${lt(water, 0.5)}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
  g += `<path d="M290 262 C320 270 340 290 380 278 C420 266 440 284 480 280 V300 H290 Z" fill="${lt(water, 0.15)}"/>`;
  const cl = (x: number, y: number, s: number) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-62 20 C-80 20 -84 -6 -62 -10 C-60 -34 -26 -40 -14 -22 C-4 -46 40 -44 42 -14 C66 -18 76 12 56 20 Z" fill="${cloud}"/><path d="M-62 20 H56" stroke="${dk(cloud, 0.12)}" stroke-width="4" stroke-linecap="round"/></g>`;
  g += cl(328, 64, 1.15) + cl(214, 44, 0.75);
  for (let i = 0; i < 5; i++) g += `<path d="M${296 + i * 16} ${100 + (i % 2) * 8} l-7 18" stroke="${water}" stroke-width="5" stroke-linecap="round"/>`;
  g += arrow('M150 232 C150 180 160 130 190 82', dk(water, 0.15));
  g += arrow('M248 52 C266 46 280 50 294 56', dk(cloud, 0.35));
  g += arrow('M396 230 C380 260 340 262 300 258', dk(water, 0.15));
  return g;
}

function phoneApp([frame, accent]: string[]): string {
  let g = `<rect x="10" y="6" width="180" height="388" rx="30" fill="${frame}"/><rect x="20" y="18" width="160" height="364" rx="22" fill="#ffffff"/>`;
  g += `<rect x="74" y="24" width="52" height="10" rx="5" fill="${frame}"/>`;
  g += `<rect x="34" y="52" width="70" height="10" rx="5" fill="${dk('#ffffff', 0.75)}"/><rect x="34" y="70" width="110" height="18" rx="6" fill="${frame}"/>`;
  g += `<rect x="34" y="102" width="132" height="64" rx="12" fill="${lt(accent, 0.82)}"/><circle cx="58" cy="134" r="14" fill="${accent}"/><rect x="80" y="122" width="70" height="8" rx="4" fill="${frame}"/><rect x="80" y="138" width="50" height="7" rx="3.5" fill="${dk('#ffffff', 0.35)}"/>`;
  for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) {
    const on = r === 1 && c === 3;
    g += `<rect x="${34 + c * 22}" y="${184 + r * 26}" width="16" height="18" rx="5" fill="${on ? accent : dk('#ffffff', 0.07)}"/>`;
  }
  g += `<rect x="34" y="296" width="132" height="22" rx="7" fill="${dk('#ffffff', 0.06)}"/><rect x="42" y="304" width="60" height="6" rx="3" fill="${dk('#ffffff', 0.3)}"/>`;
  g += `<rect x="34" y="332" width="132" height="34" rx="17" fill="${accent}"/><rect x="74" y="346" width="52" height="6" rx="3" fill="#ffffff"/>`;
  return g;
}

function moonStars([moon, star]: string[]): string {
  let g = `<defs><mask id="bzmoon"><rect width="240" height="240" fill="#fff"/><circle cx="150" cy="96" r="78" fill="#000"/></mask></defs>`;
  g += `<circle cx="110" cy="130" r="92" fill="${moon}" mask="url(#bzmoon)"/>`;
  g += `<circle cx="70" cy="170" r="10" fill="${dk(moon, 0.08)}" mask="url(#bzmoon)"/><circle cx="48" cy="128" r="6" fill="${dk(moon, 0.08)}" mask="url(#bzmoon)"/>`;
  for (const [x, y, s] of [[186, 46, 16], [212, 132, 10], [160, 196, 8]] as const) g += `<polygon points="${starPts(x, y, 4, s, s * 0.38, -90)}" fill="${star}"/>`;
  return g;
}

function shopFront([awning, wall, trim]: string[]): string {
  let g = `<rect x="30" y="80" width="240" height="170" fill="${wall}"/><rect x="20" y="40" width="260" height="34" rx="6" fill="${trim}"/>`;
  g += `<rect x="96" y="48" width="108" height="18" rx="4" fill="${lt(trim, 0.85)}"/>`;
  for (let i = 0; i < 6; i++) g += `<path d="M${20 + i * 43.3} 74 h43.3 v30 a21.7 21.7 0 0 1 -43.3 0 Z" fill="${i % 2 ? '#ffffff' : awning}"/>`;
  g += `<rect x="48" y="138" width="118" height="84" rx="6" fill="${lt(trim, 0.75)}"/><path d="M54 206 L94 162 L126 196 L144 178 L160 196 V216 H54 Z" fill="${lt(trim, 0.55)}"/>`;
  g += `<rect x="186" y="132" width="64" height="118" rx="6" fill="${trim}"/><circle cx="238" cy="194" r="4" fill="${lt(trim, 0.8)}"/>`;
  g += `<rect x="20" y="248" width="260" height="10" rx="5" fill="${dk(wall, 0.25)}"/>`;
  return g;
}

function vlogCam([body, lens]: string[]): string {
  return `<rect x="20" y="70" width="190" height="130" rx="22" fill="${body}"/><rect x="40" y="52" width="60" height="26" rx="8" fill="${dk(body, 0.25)}"/>`
    + `<path d="M210 104 L262 76 V194 L210 166 Z" fill="${dk(body, 0.2)}"/>`
    + `<circle cx="112" cy="135" r="48" fill="${dk(body, 0.45)}"/><circle cx="112" cy="135" r="34" fill="${lens}"/><circle cx="112" cy="135" r="16" fill="${dk(lens, 0.5)}"/><circle cx="100" cy="122" r="7" fill="#ffffff" opacity=".7"/>`
    + `<circle cx="184" cy="92" r="8" fill="#ff4d4d"/>`;
}

function bookmark([main, detail]: string[]): string {
  return `<path d="M30 10 H150 Q162 10 162 22 V250 L90 196 L18 250 V22 Q18 10 30 10 Z" fill="${main}"/>`
    + `<path d="M90 196 L18 250 V232 L90 178 L162 232 V250 Z" fill="${dk(main, 0.18)}" opacity=".55"/>`
    + `<polygon points="${starPts(90, 98, 5, 40, 17, -90)}" fill="${detail}"/>`;
}

export const ASSETS: AssetDef[] = [
  A('bz-olive-branch', 'Olive branch', 'decoration', 400, 150, ['#6f7d4a', '#3f4a2a'], ['olive', 'branch', 'leaves', 'menu', 'restaurant', 'mediterranean', 'botanical'], oliveBranch),
  A('bz-eucalyptus', 'Eucalyptus sprig', 'decoration', 240, 400, ['#9bb08f', '#6d7f63'], ['eucalyptus', 'greenery', 'leaves', 'wedding', 'botanical', 'sage'], eucalyptus),
  A('bz-coffee-line', 'Coffee cup (line)', 'illustration', 240, 250, ['#1f4d3a'], ['coffee', 'cup', 'cafe', 'logo', 'chalk', 'line art', 'drinks'], coffeeLine),
  A('bz-peak', 'Mountain peak mark', 'illustration', 240, 200, ['#e8b84a', '#ffffff'], ['mountain', 'peak', 'logo', 'outdoors', 'fitness', 'mark'], peak),
  A('bz-shield', 'Shield badge', 'decoration', 240, 280, ['#14213d', '#e8b84a'], ['shield', 'badge', 'crest', 'emblem', 'logo', 'sport'], shield),
  A('bz-tulip', 'Tulip mark', 'illustration', 160, 260, ['#e5674f', '#4f8a5b'], ['tulip', 'flower', 'florist', 'logo', 'spring', 'botanical'], tulip),
  A('bz-wave', 'Surf wave mark', 'illustration', 240, 240, ['#2ec4b6', '#0f0f12'], ['wave', 'surf', 'ocean', 'beach', 'logo', 'badge'], surfWave),
  A('bz-wheat', 'Wheat stalk', 'decoration', 100, 300, ['#5b3a29'], ['wheat', 'grain', 'bakery', 'bread', 'harvest', 'logo'], wheat),
  A('bz-cube', 'Isometric cube mark', 'illustration', 240, 240, ['#3a5bd9', '#22d3ee'], ['cube', 'geometric', 'tech', 'startup', 'logo', 'software', 'mark'], cube),
  A('bz-water-cycle', 'Water cycle', 'illustration', 480, 300, ['#3b8fd0', '#5c9a5a', '#f6b93b', '#ffffff'], ['water cycle', 'science', 'rain', 'cloud', 'sun', 'lesson', 'school', 'diagram'], waterCycle),
  A('bz-phone-app', 'Booking app on a phone', 'illustration', 200, 400, ['#14213d', '#ff7a59'], ['phone', 'app', 'mobile', 'mockup', 'startup', 'booking', 'tech'], phoneApp),
  A('bz-moon', 'Moon and stars', 'illustration', 240, 240, ['#f6c76b', '#f08a5d'], ['moon', 'stars', 'night', 'sleep', 'bedtime', 'wellness'], moonStars),
  A('bz-shop', 'Shop front', 'illustration', 300, 260, ['#16a34a', '#fdf6ee', '#0f3d3e'], ['shop', 'store', 'small business', 'storefront', 'retail', 'launch'], shopFront),
  A('bz-bookmark', 'Bookmark with star', 'illustration', 180, 260, ['#d9653a', '#ffffff'], ['bookmark', 'save', 'saved', 'favorite', 'star', 'social'], bookmark),
  A('bz-camera', 'Vlog camera', 'illustration', 280, 220, ['#1f1f1f', '#4cc9f0'], ['camera', 'video', 'vlog', 'youtube', 'creator', 'studio'], vlogCam),
];
