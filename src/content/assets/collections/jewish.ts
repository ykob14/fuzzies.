/**
 * Jewish holidays collection (beyond Hanukkah and Passover, which have their own) — original vector artwork drawn in
 * code for Fuzzies (licence: original Fuzzies artwork).
 * Symbolism: Rosh Hashanah — apples dipped in honey, pomegranate (with its crown), round spiral challah, shofar (a
 * ram's horn, curved, with a narrow mouthpiece), bees and honey. Yom Kippur — white, candles, the Book of Life.
 * Sukkot — the sukkah with a roof of branches (schach) and hanging decorations, the four species: lulav (palm),
 * hadass (myrtle, three), aravah (willow, two) and the etrog (citron, with its pitam). Simchat Torah — a Torah scroll
 * on its two wooden rollers. Purim — hamantaschen, a grogger (ra'ashan), masks and crowns. Shavuot — wheat, greenery,
 * dairy. Tu BiShvat — a young tree. Lag BaOmer — a bonfire with bow and arrows.
 */
import type { AssetDef } from '../index';
import { asset, backgrounds, bokeh, dk, f1, flame, frame, glowDef, lt, mix, rng, sparkle, stars } from '../draw';

const A = asset('jewish', ['jewish', 'judaism', 'holiday', 'chag', 'חג']);
const RH = ['rosh hashanah', 'rosh hashana', 'jewish new year', 'shana tova', 'ראש השנה', 'שנה טובה'];
const YK = ['yom kippur', 'יום כיפור', 'gmar chatima tova'];
const SK = ['sukkot', 'succot', 'sukkos', 'סוכות'];

// ---------- drawings ----------
function apple(id: string, x: number, y: number, s: number, skin: string, leaf: string, rot = 0): string {
  return `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${rot}) scale(${s})"><defs><radialGradient id="${id}" cx="38%" cy="35%" r="70%"><stop offset="0" stop-color="${lt(skin, 0.35)}"/><stop offset=".55" stop-color="${skin}"/><stop offset="1" stop-color="${dk(skin, 0.35)}"/></radialGradient></defs>` +
    `<path d="M0 -58 C-26 -78 -84 -70 -84 -8 C-84 52 -40 92 0 76 C40 92 84 52 84 -8 C84 -70 26 -78 0 -58 Z" fill="url(#${id})"/>` +
    `<path d="M-50 -30 C-58 -10 -56 14 -46 30" stroke="#fff" stroke-width="8" fill="none" opacity=".35" stroke-linecap="round"/><ellipse cx="-34" cy="-42" rx="10" ry="6" fill="#fff" opacity=".45" transform="rotate(-30 -34 -42)"/>` +
    `<path d="M0 -56 C2 -70 6 -84 14 -94" stroke="${dk(leaf, 0.6)}" stroke-width="6" fill="none" stroke-linecap="round"/>` +
    `<path d="M10 -84 C24 -110 58 -112 72 -98 C56 -78 28 -74 10 -84 Z" fill="${leaf}"/><path d="M12 -84 C30 -92 50 -98 70 -98" stroke="${dk(leaf, 0.25)}" stroke-width="2" fill="none"/></g>`;
}
/** Honey jar with a cloth-tied lid and a wooden dipper dripping honey. */
function honeyJar(x: number, y: number, s: number, honey: string, cloth: string, wood: string): string {
  let g = `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})"><defs><linearGradient id="hj" x1="0" x2="1"><stop offset="0" stop-color="${lt(honey, 0.25)}"/><stop offset=".5" stop-color="${honey}"/><stop offset="1" stop-color="${dk(honey, 0.3)}"/></linearGradient></defs>`;
  g += `<ellipse cx="0" cy="118" rx="70" ry="7" fill="#000" opacity=".15"/>`;
  g += `<path d="M-50 -20 H50 C64 -8 68 10 68 40 V96 C68 110 58 118 44 118 H-44 C-58 118 -68 110 -68 96 V40 C-68 10 -64 -8 -50 -20 Z" fill="url(#hj)"/>`;
  g += `<path d="M-52 4 C-58 30 -58 70 -52 100" stroke="#fff" stroke-width="7" fill="none" opacity=".35" stroke-linecap="round"/><path d="M-68 34 H68" stroke="${lt(honey, 0.4)}" stroke-width="2" opacity=".5"/>`;
  g += `<rect x="-46" y="-34" width="92" height="18" rx="4" fill="${dk(honey, 0.15)}"/>`;
  // cloth cover tied with a ribbon
  g += `<path d="M-60 -40 C-50 -60 50 -60 60 -40 L70 -10 C50 -18 30 -6 14 -16 C0 -6 -20 -18 -36 -8 C-50 -16 -62 -8 -70 -12 Z" fill="${cloth}"/>`;
  for (let i = -2; i <= 2; i++) g += `<path d="M${i * 24} -56 V-12" stroke="#fff" stroke-width="5" opacity=".5"/>`;
  for (let j = 0; j < 2; j++) g += `<path d="M-64 ${-44 + j * 16} H64" stroke="#fff" stroke-width="5" opacity=".5"/>`;
  g += `<path d="M-56 -36 C-20 -28 20 -28 56 -36" stroke="${dk(cloth, 0.35)}" stroke-width="5" fill="none"/><path d="M20 -32 C34 -22 30 -6 40 2 M20 -32 C40 -40 50 -30 54 -20" stroke="${dk(cloth, 0.35)}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
  // dipper
  g += `<g transform="rotate(28 40 -40)"><rect x="34" y="-112" width="10" height="82" rx="5" fill="${wood}"/><rect x="36" y="-112" width="3" height="82" fill="${lt(wood, 0.3)}"/>`;
  for (let i = 0; i < 4; i++) g += `<ellipse cx="39" cy="${-26 + i * 9}" rx="${16 - Math.abs(i - 1.5) * 3}" ry="5" fill="${i % 2 ? dk(wood, 0.15) : wood}"/>`;
  g += `<path d="M30 -4 C30 10 36 18 40 30 C44 18 48 10 48 -4 Z" fill="${honey}" opacity=".95"/></g>`;
  g += `<path d="M-20 -18 C-22 -2 -18 6 -16 14 C-12 6 -12 -4 -14 -18 Z M10 -18 C8 -6 12 2 13 8 C16 2 16 -8 15 -18 Z" fill="${dk(honey, 0.1)}"/>`;
  return g + `</g>`;
}
function pomegranate(id: string, x: number, y: number, s: number, skin: string, rot = 0): string {
  return `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${rot}) scale(${s})"><defs><radialGradient id="${id}" cx="36%" cy="34%" r="72%"><stop offset="0" stop-color="${lt(skin, 0.35)}"/><stop offset=".6" stop-color="${skin}"/><stop offset="1" stop-color="${dk(skin, 0.4)}"/></radialGradient></defs>` +
    `<path d="M-14 -66 L-22 -86 L-8 -76 L0 -92 L8 -76 L22 -86 L14 -66 Z" fill="${dk(skin, 0.15)}"/><path d="M-14 -66 L-8 -76 L0 -66 L8 -76 L14 -66" fill="none" stroke="${dk(skin, 0.4)}" stroke-width="2"/>` +
    `<path d="M-16 -64 C-60 -62 -82 -30 -80 6 C-78 50 -44 80 0 80 C44 80 78 50 80 6 C82 -30 60 -62 16 -64 Z" fill="url(#${id})"/>` +
    `<path d="M-50 -24 C-58 -2 -54 22 -42 40" stroke="#fff" stroke-width="8" fill="none" opacity=".3" stroke-linecap="round"/><ellipse cx="-30" cy="-40" rx="10" ry="5" fill="#fff" opacity=".4" transform="rotate(-35 -30 -40)"/></g>`;
}
/** Half a pomegranate showing its jewel-like seeds. */
function pomegranateHalf(x: number, y: number, s: number, skin: string, seed: string): string {
  const r = rng(Math.round(x + y));
  let g = `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})"><path d="M-78 0 C-78 50 -40 74 0 74 C40 74 78 50 78 0 Z" fill="${dk(skin, 0.15)}"/><ellipse cx="0" cy="0" rx="78" ry="22" fill="#f7e6d4"/>`;
  for (let i = 0; i < 46; i++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()); const sx = Math.cos(a) * d * 66, sy = Math.sin(a) * d * 16; g += `<ellipse cx="${f1(sx)}" cy="${f1(sy)}" rx="5.5" ry="4" fill="${i % 3 ? seed : dk(seed, 0.2)}"/><circle cx="${f1(sx - 1.5)}" cy="${f1(sy - 1.4)}" r="1.4" fill="#fff" opacity=".7"/>`; }
  g += `<path d="M-30 -2 C-10 4 10 -6 30 2 M-50 4 C-30 10 -40 -8 -20 -12" stroke="#f7e6d4" stroke-width="2.5" fill="none"/>`;
  return g + `<path d="M-60 30 C-50 50 -30 60 -10 64" stroke="#fff" stroke-width="5" fill="none" opacity=".25" stroke-linecap="round"/></g>`;
}
/** Round spiral challah for the new year. */
function roundChallah(x: number, y: number, s: number, crust: string): string {
  let g = `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})"><defs><radialGradient id="ch" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="${lt(crust, 0.3)}"/><stop offset="1" stop-color="${dk(crust, 0.2)}"/></radialGradient></defs><ellipse cx="0" cy="40" rx="104" ry="18" fill="#000" opacity=".15"/>`;
  g += `<ellipse cx="0" cy="12" rx="100" ry="52" fill="${dk(crust, 0.3)}"/>`;
  const r = rng(5);
  for (let i = 0; i < 26; i++) {
    const t = i / 25, a = t * Math.PI * 4.2, rad = 92 * (1 - t * 0.92);
    const px = Math.cos(a) * rad, py = Math.sin(a) * rad * 0.46 - t * 26;
    g += `<ellipse cx="${f1(px)}" cy="${f1(py)}" rx="${f1(30 - t * 12)}" ry="${f1(20 - t * 7)}" fill="url(#ch)" stroke="${dk(crust, 0.25)}" stroke-width="1.5" transform="rotate(${f1((a * 180) / Math.PI + 90)} ${f1(px)} ${f1(py)})"/>`;
  }
  for (let i = 0; i < 40; i++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 84; g += `<ellipse cx="${f1(Math.cos(a) * d)}" cy="${f1(Math.sin(a) * d * 0.44 - 10)}" rx="2.2" ry="1.2" fill="#fbf1d8" transform="rotate(${f1(r() * 180)} ${f1(Math.cos(a) * d)} ${f1(Math.sin(a) * d * 0.44 - 10)})"/>`; }
  return g + `</g>`;
}
/** A ram's-horn shofar: tapering, curving, ridged, with a narrow mouthpiece. */
function shofar(horn: string, x = 0, y = 0, s = 1): string {
  const P = (t: number): [number, number] => { const u = 1 - t; return [u * u * u * 44 + 3 * u * u * t * 96 + 3 * u * t * t * 280 + t * t * t * 334, u * u * u * 44 + 3 * u * u * t * 196 + 3 * u * t * t * 176 + t * t * t * 62]; };
  const W = (t: number) => 64 * (1 - t) ** 1.25 + 8;
  const L: string[] = [], R: string[] = [];
  const N = 40;
  for (let i = 0; i <= N; i++) {
    const t = i / N, [px, py] = P(t), [qx, qy] = P(Math.min(1, t + 0.01)), [ox, oy] = P(Math.max(0, t - 0.01));
    const dx = qx - ox, dy = qy - oy, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len, w = W(t) / 2;
    L.push(`${f1(px + nx * w)} ${f1(py + ny * w)}`); R.push(`${f1(px - nx * w)} ${f1(py - ny * w)}`);
  }
  let g = `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})"><defs><linearGradient id="sh" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${lt(horn, 0.35)}"/><stop offset=".55" stop-color="${horn}"/><stop offset="1" stop-color="${dk(horn, 0.45)}"/></linearGradient></defs>`;
  g += `<path d="M${L.join(' L')} L${R.reverse().join(' L')} Z" fill="url(#sh)"/>`;
  for (let i = 2; i < N - 3; i += 3) {
    const t = i / N, [px, py] = P(t), [qx, qy] = P(t + 0.01), dx = qx - px, dy = qy - py, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len, w = W(t) / 2;
    g += `<path d="M${f1(px + nx * w)} ${f1(py + ny * w)} Q${f1(px + dx / len * 4)} ${f1(py + dy / len * 4)} ${f1(px - nx * w)} ${f1(py - ny * w)}" stroke="${dk(horn, 0.3)}" stroke-width="1.6" fill="none" opacity=".55"/>`;
  }
  const [bx, by] = P(0), [b2x, b2y] = P(0.01), ang = (Math.atan2(b2y - by, b2x - bx) * 180) / Math.PI;
  g += `<ellipse cx="${f1(bx)}" cy="${f1(by)}" rx="9" ry="${f1(W(0) / 2)}" fill="${dk(horn, 0.6)}" transform="rotate(${f1(ang)} ${f1(bx)} ${f1(by)})"/><ellipse cx="${f1(bx)}" cy="${f1(by)}" rx="9" ry="${f1(W(0) / 2)}" fill="none" stroke="${lt(horn, 0.2)}" stroke-width="3" transform="rotate(${f1(ang)} ${f1(bx)} ${f1(by)})"/>`;
  const [ex, ey] = P(1);
  g += `<ellipse cx="${f1(ex)}" cy="${f1(ey)}" rx="3" ry="4" fill="${dk(horn, 0.6)}"/>`;
  g += `<path d="M60 96 C100 170 200 176 270 130" stroke="#fff" stroke-width="5" fill="none" opacity=".35" stroke-linecap="round"/>`;
  return g + `</g>`;
}
function bee(x: number, y: number, s: number, body: string, rot = 0): string {
  return `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${rot}) scale(${s})"><ellipse cx="-6" cy="-22" rx="16" ry="22" fill="#fff" opacity=".75" transform="rotate(-25 -6 -22)"/><ellipse cx="12" cy="-22" rx="14" ry="20" fill="#fff" opacity=".65" transform="rotate(25 12 -22)"/>` +
    `<ellipse cx="0" cy="0" rx="30" ry="22" fill="${body}"/><path d="M-10 -20 C-14 -6 -14 6 -10 20 M6 -21 C2 -6 2 6 6 21" stroke="#2b2118" stroke-width="7" fill="none"/><path d="M-30 0 L-40 0" stroke="#2b2118" stroke-width="4" stroke-linecap="round"/>` +
    `<circle cx="26" cy="-4" r="13" fill="#2b2118"/><circle cx="30" cy="-6" r="3" fill="#fff"/><path d="M24 -16 C22 -26 18 -30 14 -32 M30 -16 C32 -26 36 -30 40 -30" stroke="#2b2118" stroke-width="2.5" fill="none" stroke-linecap="round"/></g>`;
}
function hexPath(cx: number, cy: number, r: number): string {
  return [0, 1, 2, 3, 4, 5].map((i) => { const a = (Math.PI / 3) * i; return `${i ? 'L' : 'M'}${f1(cx + Math.cos(a) * r)} ${f1(cy + Math.sin(a) * r)}`; }).join(' ') + 'Z';
}
/** Torah scroll open on its two wooden rollers (lines suggest the writing — no text is shown). */
function torah(x: number, y: number, s: number, wood: string, parch: string, crown: string): string {
  let g = `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})">`;
  const roller = (cx: number) => `<rect x="${cx - 7}" y="-10" width="14" height="280" rx="7" fill="${wood}"/><rect x="${cx - 3}" y="-10" width="4" height="280" fill="${lt(wood, 0.3)}"/>` +
    `<ellipse cx="${cx}" cy="34" rx="28" ry="9" fill="${dk(wood, 0.15)}"/><ellipse cx="${cx}" cy="226" rx="28" ry="9" fill="${dk(wood, 0.15)}"/>` +
    `<rect x="${cx - 26}" y="34" width="52" height="192" fill="${dk(parch, 0.08)}"/><rect x="${cx - 26}" y="34" width="14" height="192" fill="${dk(parch, 0.18)}"/>` +
    `<path d="M${cx - 10} -10 L${cx - 16} -34 L${cx - 4} -24 L${cx} -40 L${cx + 4} -24 L${cx + 16} -34 L${cx + 10} -10 Z" fill="${crown}"/><circle cx="${cx}" cy="-44" r="5" fill="${crown}"/>`;
  g += `<rect x="40" y="40" width="200" height="180" fill="${parch}"/><path d="M40 40 H240 M40 220 H240" stroke="${dk(parch, 0.15)}" stroke-width="2"/>`;
  for (const col of [56, 150]) for (let i = 0; i < 12; i++) { const r = rng(col + i); g += `<rect x="${col + r() * 6}" y="${56 + i * 13.5}" width="${f1(64 - r() * 16)}" height="3" rx="1.5" fill="#3a2e28" opacity=".55"/>`; }
  g += roller(14) + roller(266);
  return g + `</g>`;
}
function sukkah(wood: string, wall: string, schach: string, fruit: string[]): string {
  let g = `<ellipse cx="200" cy="292" rx="190" ry="10" fill="#000" opacity=".12"/>`;
  g += `<rect x="40" y="96" width="320" height="192" fill="${dk(wall, 0.25)}"/>`;
  g += `<path d="M40 96 H120 V288 H40 Z" fill="${wall}"/><path d="M280 96 H360 V288 H280 Z" fill="${wall}"/>`;
  for (let i = 0; i < 4; i++) g += `<path d="M${48 + i * 20} 100 V284 M${288 + i * 20} 100 V284" stroke="${dk(wall, 0.12)}" stroke-width="3"/>`;
  g += `<path d="M120 96 H280" stroke="${wood}" stroke-width="8"/>`;
  for (const x of [40, 120, 280, 360]) g += `<rect x="${x - 6}" y="88" width="12" height="202" fill="${wood}"/>`;
  g += `<rect x="30" y="84" width="340" height="10" fill="${dk(wood, 0.15)}"/>`;
  // inside: table with a white cloth and a candle glow
  g += `<path d="M150 230 H250 L256 250 H144 Z" fill="#fbf7ef"/><rect x="156" y="250" width="6" height="38" fill="${dk(wood, 0.2)}"/><rect x="238" y="250" width="6" height="38" fill="${dk(wood, 0.2)}"/>`;
  g += `<circle cx="200" cy="214" r="30" fill="url(#skg)"/><rect x="196" y="212" width="8" height="18" fill="#fff"/>` + flame(200, 196, 16, '#ffbe46');
  // schach: leafy branches
  const r = rng(31);
  for (let i = 0; i < 46; i++) { const lx = 24 + r() * 352, ly = 66 + r() * 26; g += `<ellipse cx="${f1(lx)}" cy="${f1(ly)}" rx="${f1(16 + r() * 14)}" ry="${f1(6 + r() * 4)}" fill="${i % 3 ? schach : dk(schach, 0.2)}" transform="rotate(${f1(-30 + r() * 60)} ${f1(lx)} ${f1(ly)})"/>`; }
  for (let i = 0; i < 6; i++) { const lx = 30 + i * 66 + r() * 20; g += `<path d="M${f1(lx)} 74 q-6 18 -2 34" stroke="${dk(schach, 0.2)}" stroke-width="3" fill="none"/><ellipse cx="${f1(lx - 3)}" cy="110" rx="5" ry="9" fill="${schach}"/>`; }
  // hanging decorations: paper chain + fruit
  g += `<path d="M126 104 Q200 140 274 104" fill="none" stroke="${fruit[0]}" stroke-width="5" stroke-dasharray="10 5"/>`;
  [[146, 118, 0], [176, 138, 1], [224, 138, 2], [254, 118, 0]].forEach(([fx, len, k]) => {
    g += `<path d="M${fx} 96 V${len}" stroke="#7b6a58" stroke-width="1.5"/><circle cx="${fx}" cy="${len + 9}" r="9" fill="${fruit[k % fruit.length]}"/><circle cx="${fx - 3}" cy="${len + 6}" r="2.5" fill="#fff" opacity=".6"/>`;
  });
  return `<defs>${glowDef('skg', '#ffcf6a', 0.6)}</defs>` + g;
}
/** The four species: lulav (palm) with myrtle and willow in a woven holder, and the etrog. */
function fourSpecies(palm: string, myrtle: string, willow: string, etrog: string): string {
  let g = `<ellipse cx="150" cy="392" rx="120" ry="8" fill="#000" opacity=".12"/>`;
  // willow (aravah) — two long narrow leaves sprays, left
  for (const [dx, rot] of [[-8, -8], [-2, -3]]) {
    g += `<g transform="translate(${118 + dx} 300) rotate(${rot})"><path d="M0 0 V-190" stroke="${dk(willow, 0.4)}" stroke-width="3"/>`;
    for (let i = 0; i < 9; i++) g += `<path d="M0 ${-20 - i * 19} q${i % 2 ? 22 : -22} -8 ${i % 2 ? 26 : -26} -34 q${i % 2 ? -14 : 14} 18 ${i % 2 ? -26 : 26} 34Z" fill="${i % 2 ? willow : lt(willow, 0.15)}"/>`;
    g += `</g>`;
  }
  // palm (lulav) — tall closed frond
  g += `<path d="M140 380 V40 C140 20 150 8 150 0 C150 8 160 20 160 40 V380 Z" fill="${palm}"/><path d="M150 0 V380" stroke="${lt(palm, 0.35)}" stroke-width="3"/><path d="M144 60 V370 M156 60 V370" stroke="${dk(palm, 0.2)}" stroke-width="1.2"/>`;
  // myrtle (hadass) — three branches with small leaves in tiers, right
  for (const [dx, rot] of [[176, 4], [184, 9], [170, 1]]) {
    g += `<g transform="translate(${dx} 300) rotate(${rot})"><path d="M0 0 V-170" stroke="${dk(myrtle, 0.5)}" stroke-width="3"/>`;
    for (let i = 0; i < 12; i++) for (const sd of [-1, 0, 1]) g += `<ellipse cx="${sd * 8}" cy="${-14 - i * 13.5}" rx="5" ry="8" fill="${(i + sd) % 2 ? myrtle : dk(myrtle, 0.15)}" transform="rotate(${sd * 30} ${sd * 8} ${-14 - i * 13.5})"/>`;
    g += `</g>`;
  }
  // woven holder (koishikel)
  g += `<path d="M122 300 H188 L184 372 H126 Z" fill="${mix(palm, '#c8a96a', 0.6)}"/>`;
  for (let i = 0; i < 6; i++) g += `<path d="M124 ${308 + i * 11} H186" stroke="${dk('#c8a96a', 0.25)}" stroke-width="2"/><path d="M${132 + i * 10} 300 V372" stroke="${dk('#c8a96a', 0.12)}" stroke-width="1.2"/>`;
  // etrog
  g += `<g transform="translate(236 334)"><defs><radialGradient id="et" cx="35%" cy="35%" r="70%"><stop offset="0" stop-color="${lt(etrog, 0.4)}"/><stop offset=".6" stop-color="${etrog}"/><stop offset="1" stop-color="${dk(etrog, 0.3)}"/></radialGradient></defs>` +
    `<path d="M-46 4 C-48 -30 -20 -48 6 -46 C34 -44 54 -20 50 8 C46 40 18 54 -8 50 C-32 46 -44 30 -46 4 Z" fill="url(#et)"/>`;
  const r = rng(77);
  for (let i = 0; i < 30; i++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 38; g += `<circle cx="${f1(Math.cos(a) * d)}" cy="${f1(Math.sin(a) * d)}" r="1.6" fill="${dk(etrog, 0.2)}" opacity=".5"/>`; }
  g += `<path d="M50 4 l10 -6 l2 4 l-10 5Z" fill="${dk(etrog, 0.45)}"/><path d="M-46 4 l-6 2" stroke="#6a8a3a" stroke-width="4" stroke-linecap="round"/><ellipse cx="-20" cy="-24" rx="10" ry="5" fill="#fff" opacity=".45" transform="rotate(-30 -20 -24)"/></g>`;
  return g;
}
function hamantasch(x: number, y: number, s: number, dough: string, filling: string, rot = 0): string {
  return `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${rot}) scale(${s})"><path d="M0 -52 C10 -52 56 26 52 34 C48 42 -48 42 -52 34 C-56 26 -10 -52 0 -52 Z" fill="${dough}" stroke="${dk(dough, 0.2)}" stroke-width="2.5"/>` +
    `<path d="M0 -24 L24 18 L-24 18 Z" fill="${filling}" stroke="${dk(filling, 0.25)}" stroke-width="2" stroke-linejoin="round"/><circle cx="-6" cy="4" r="3" fill="#fff" opacity=".35"/>` +
    `<path d="M0 -52 C-4 -40 -16 -22 -24 -10 M52 34 C40 32 24 22 16 14 M-52 34 C-40 32 -26 26 -18 22" stroke="${lt(dough, 0.35)}" stroke-width="5" fill="none" stroke-linecap="round" opacity=".7"/></g>`;
}
function grogger(x: number, y: number, s: number, body: string, handle: string, rot = 0): string {
  return `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${rot}) scale(${s})"><rect x="-8" y="30" width="16" height="70" rx="6" fill="${handle}"/><rect x="-4" y="30" width="4" height="70" fill="${lt(handle, 0.3)}"/>` +
    `<path d="M-46 -40 H46 V30 H-46 Z" fill="${body}"/><path d="M-46 -40 L-30 -56 H62 L46 -40 Z" fill="${lt(body, 0.2)}"/><path d="M46 -40 L62 -56 V14 L46 30 Z" fill="${dk(body, 0.2)}"/>` +
    `<path d="M-30 -24 H30 M-30 -8 H30 M-30 8 H30" stroke="${lt(body, 0.45)}" stroke-width="4"/><circle cx="0" cy="-5" r="10" fill="${lt(body, 0.55)}" opacity=".6"/>` +
    `<rect x="-6" y="-66" width="12" height="30" rx="3" fill="${handle}"/></g>`;
}
function mask(fill: string, trim: string, x = 0, y = 0, s = 1): string {
  return `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})"><path d="M-110 -20 C-80 -46 -30 -40 0 -18 C30 -40 80 -46 110 -20 C112 20 80 44 50 40 C24 36 10 22 0 18 C-10 22 -24 36 -50 40 C-80 44 -112 20 -110 -20 Z" fill="${fill}"/>` +
    `<path d="M-74 -6 C-62 -20 -40 -20 -28 -6 C-40 6 -62 6 -74 -6 Z M74 -6 C62 -20 40 -20 28 -6 C40 6 62 6 74 -6 Z" fill="#1d1622"/>` +
    `<path d="M-110 -20 C-80 -46 -30 -40 0 -18 C30 -40 80 -46 110 -20" stroke="${trim}" stroke-width="5" fill="none"/>` +
    [-90, -60, -30, 30, 60, 90].map((px) => `<circle cx="${px}" cy="${Math.abs(px) > 60 ? 18 : 26}" r="4" fill="${trim}"/>`).join('') +
    `<path d="M110 -20 C130 -40 150 -70 144 -100 C160 -76 156 -40 118 -10 Z" fill="${trim}"/><path d="M126 -30 C150 -46 172 -60 186 -90 C186 -56 160 -30 130 -20 Z" fill="${lt(trim, 0.3)}"/><path d="M0 -18 V-4" stroke="${trim}" stroke-width="3"/></g>`;
}
function wheat(x: number, y: number, s: number, c: string, rot = 0): string {
  let g = `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${rot}) scale(${s})"><path d="M0 0 C2 -60 4 -120 0 -180" stroke="${dk(c, 0.2)}" stroke-width="3" fill="none"/>`;
  for (let i = 0; i < 8; i++) { const py = -110 - i * 10; g += `<ellipse cx="-7" cy="${py}" rx="5" ry="9" fill="${c}" transform="rotate(-24 -7 ${py})"/><ellipse cx="7" cy="${py - 4}" rx="5" ry="9" fill="${dk(c, 0.08)}" transform="rotate(24 7 ${py - 4})"/>`; }
  return g + `<ellipse cx="0" cy="-196" rx="4.5" ry="9" fill="${c}"/><path d="M0 -60 C-14 -80 -24 -86 -34 -100" stroke="${mix(c, '#6d8d3a', 0.6)}" stroke-width="4" fill="none" stroke-linecap="round"/></g>`;
}

// ---------- assets ----------
export const ASSETS: AssetDef[] = [
  A('jh-apple-honey', 'Apples & honey', 'illustration', 300, 240, ['#c8263a', '#e3a21a', '#5e8f3a', '#d7c8b0'], [...RH, 'apple', 'honey', 'sweet new year', 'jar', 'dipper'], (c) =>
    honeyJar(196, 112, 0.92, c[1], c[3], '#a0703e') + apple('a1', 84, 160, 0.82, c[0], c[2], -6) + apple('a2', 252, 196, 0.42, mix(c[0], '#e0b23a', 0.25), c[2], 12)),
  A('jh-apple', 'Apple', 'illustration', 180, 200, ['#c8263a', '#5e8f3a'], [...RH, 'apple', 'fruit', 'sweet'], (c) => apple('a', 90, 112, 1, c[0], c[1])),
  A('jh-honey', 'Honey jar', 'illustration', 180, 260, ['#e3a21a', '#d7c8b0', '#a0703e'], [...RH, 'honey', 'jar', 'dipper', 'sweet'], (c) => honeyJar(84, 128, 1, c[0], c[1], c[2])),
  A('jh-pomegranate', 'Pomegranate', 'illustration', 180, 190, ['#b3243b'], [...RH, 'pomegranate', 'rimon', 'רימון', 'fruit', 'mitzvot'], (c) => pomegranate('p', 90, 102, 1, c[0])),
  A('jh-pomegranates', 'Pomegranates', 'illustration', 300, 200, ['#b3243b', '#e2304e'], [...RH, 'pomegranate', 'rimon', 'seeds', 'fruit'], (c) =>
    pomegranate('p1', 96, 96, 0.95, c[0], -8) + pomegranateHalf(208, 128, 0.95, c[0], c[1])),
  A('jh-challah', 'Round challah', 'illustration', 240, 140, ['#c97a2c'], [...RH, 'challah', 'bread', 'round challah', 'חלה', 'shabbat'], (c) => roundChallah(120, 76, 1, c[0])),
  A('jh-shofar', 'Shofar', 'illustration', 360, 230, ['#d9b483'], [...RH, ...YK, 'shofar', 'שופר', 'ram horn', 'horn', 'tekiah'], (c) => shofar(c[0], 10, 0, 1)),
  A('jh-bee', 'Honey bee', 'illustration', 120, 100, ['#f2b531'], [...RH, 'bee', 'honey', 'cute', 'sweet'], (c) => bee(56, 62, 1.2, c[0], -8)),
  A('jh-honeycomb', 'Honeycomb', 'decoration', 300, 220, ['#e3a21a', '#f5d27a'], [...RH, 'honeycomb', 'honey', 'hexagon', 'pattern', 'border'], (c) => {
    let g = '';
    for (let row = 0; row < 5; row++) for (let col = 0; col < 7; col++) {
      if ((row + col) % 5 === 4 && row > 1) continue;
      const cx = 30 + col * 40, cy = 24 + row * 46 + (col % 2 ? 23 : 0), full = (row * 7 + col) % 3 !== 0;
      g += `<path d="${hexPath(cx, cy, 25)}" fill="${full ? c[0] : lt(c[1], 0.5)}" stroke="${dk(c[0], 0.25)}" stroke-width="3"/>` + (full ? `<path d="M${cx - 10} ${cy - 10} q6 -4 12 -2" stroke="#fff" stroke-width="3" fill="none" opacity=".5" stroke-linecap="round"/>` : '');
    }
    return g + `<path d="M70 200 q4 14 0 18 q-4 -4 0 -18Z M190 210 q4 12 0 8 q-4 -2 0 -8Z" fill="${c[0]}"/>`;
  }),
  A('jh-shana-tova-wreath', 'Apple & pomegranate wreath', 'decoration', 300, 300, ['#c8263a', '#b3243b', '#5e8f3a', '#e3a21a'], [...RH, 'wreath', 'frame', 'circle', 'leaves'], (c) => {
    let g = '';
    for (let i = 0; i < 28; i++) { const a = (i / 28) * Math.PI * 2, px = 150 + Math.cos(a) * 118, py = 150 + Math.sin(a) * 118; g += `<ellipse cx="${f1(px)}" cy="${f1(py)}" rx="22" ry="9" fill="${i % 2 ? c[2] : dk(c[2], 0.15)}" transform="rotate(${f1((a * 180) / Math.PI + (i % 2 ? 40 : -40))} ${f1(px)} ${f1(py)})"/>`; }
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 - Math.PI / 2, px = 150 + Math.cos(a) * 118, py = 150 + Math.sin(a) * 118; g += i % 2 ? pomegranate(`w${i}`, px, py, 0.26, c[1]) : apple(`w${i}`, px, py, 0.24, c[0], c[2]); }
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 - Math.PI / 2 + Math.PI / 6; g += `<circle cx="${f1(150 + Math.cos(a) * 118)}" cy="${f1(150 + Math.sin(a) * 118)}" r="6" fill="${c[3]}"/>`; }
    return g;
  }),
  A('jh-torah', 'Torah scroll', 'illustration', 280, 290, ['#7a4a2a', '#f5ead2', '#d4a940'], [...YK, 'torah', 'תורה', 'scroll', 'simchat torah', 'shavuot', 'sefer torah', 'bar mitzvah', 'bat mitzvah'], (c) => torah(0, 46, 1, c[0], c[1], c[2])),
  A('jh-candles', 'Holiday candles', 'illustration', 200, 240, ['#d4b25a', '#fbf7ef', '#ffbe46'], [...YK, ...RH, 'candles', 'candlesticks', 'shabbat', 'yom tov', 'neirot'], (c) => {
    let g = `<defs>${glowDef('cg', c[2], 0.5)}</defs>`;
    for (const x of [62, 138]) {
      g += `<circle cx="${x}" cy="44" r="40" fill="url(#cg)"/><rect x="${x - 9}" y="66" width="18" height="96" rx="3" fill="${c[1]}"/><rect x="${x + 2}" y="66" width="6" height="96" fill="${dk(c[1], 0.08)}"/><path d="M${x} 66 V60" stroke="#3a3030" stroke-width="2"/>` + flame(x, 30, 32, c[2]);
      g += `<path d="M${x - 18} 162 H${x + 18} L${x + 10} 174 C${x + 6} 196 ${x + 6} 210 ${x + 14} 222 C${x + 22} 226 ${x + 28} 230 ${x + 28} 236 H${x - 28} C${x - 28} 230 ${x - 22} 226 ${x - 14} 222 C${x - 6} 210 ${x - 6} 196 ${x - 10} 174 Z" fill="${c[0]}"/><path d="M${x + 4} 174 C${x + 6} 196 ${x + 6} 210 ${x + 14} 222 C${x + 22} 226 ${x + 28} 230 ${x + 28} 236 H${x + 6} Z" fill="${dk(c[0], 0.25)}"/>`;
    }
    return g;
  }),
  A('jh-dove', 'Dove of peace', 'illustration', 220, 170, ['#ffffff', '#8aa6c1', '#6d8d3a'], [...YK, 'dove', 'peace', 'shalom', 'שלום', 'olive branch'], (c) =>
    `<path d="M40 104 C30 70 60 50 90 60 C110 40 140 30 170 34 C150 50 140 64 136 80 C160 72 190 70 210 80 C180 90 160 110 130 120 C110 140 70 146 40 130 C26 126 14 118 10 108 C22 108 32 108 40 104 Z" fill="${c[0]}" stroke="${c[1]}" stroke-width="2.5"/>` +
    `<path d="M90 60 C96 80 110 92 136 80" stroke="${c[1]}" stroke-width="2" fill="none"/><circle cx="58" cy="78" r="3.5" fill="#2b2b33"/><path d="M40 84 L26 90 L40 92 Z" fill="#e3a21a"/>` +
    `<path d="M26 90 C10 100 6 120 16 140" stroke="${c[2]}" stroke-width="3" fill="none"/>` + [[14, 104, -40], [10, 120, 30], [16, 132, -20]].map(([lx, ly, r]) => `<ellipse cx="${lx}" cy="${ly}" rx="9" ry="4" fill="${c[2]}" transform="rotate(${r} ${lx} ${ly})"/>`).join('')),
  A('jh-sukkah', 'Sukkah', 'illustration', 400, 300, ['#8a5a34', '#f3e3c3', '#5b8a3c', '#d8433a', '#e3a21a', '#7b4ea3'], [...SK, 'sukkah', 'סוכה', 'booth', 'hut', 'schach', 'harvest'], (c) => sukkah(c[0], c[1], c[2], [c[3], c[4], c[5]])),
  A('jh-four-species', 'Lulav & etrog', 'illustration', 300, 400, ['#6d8f3a', '#2f6b3a', '#7fa65a', '#e8c33a'], [...SK, 'lulav', 'etrog', 'לולב', 'אתרוג', 'four species', 'arba minim', 'myrtle', 'willow', 'palm', 'citron'], (c) => fourSpecies(c[0], c[1], c[2], c[3])),
  A('jh-hamantaschen', 'Hamantaschen', 'illustration', 300, 180, ['#e4b46a', '#6a2b52', '#c8263a', '#3a2a20'], ['purim', 'פורים', 'hamantaschen', 'oznei haman', 'cookies', 'mishloach manot'], (c) =>
    hamantasch(80, 108, 1, c[0], c[1], -10) + hamantasch(220, 112, 0.95, c[0], c[2], 8) + hamantasch(150, 72, 0.85, lt(c[0], 0.1), c[3], 0)),
  A('jh-grogger', 'Grogger', 'illustration', 160, 200, ['#d8433a', '#e3a21a'], ['purim', 'פורים', 'grogger', 'raashan', 'noisemaker', 'megillah'], (c) => grogger(76, 96, 1, c[0], c[1], -10)),
  A('jh-mask', 'Purim mask', 'illustration', 380, 200, ['#7b2d8f', '#e3a21a'], ['purim', 'פורים', 'mask', 'costume', 'carnival', 'masquerade'], (c) => mask(c[0], c[1], 170, 110, 1)),
  A('jh-crown', 'Queen Esther crown', 'illustration', 220, 150, ['#e3b341', '#c8263a', '#2f6fd6'], ['purim', 'פורים', 'crown', 'queen esther', 'costume', 'royal'], (c) =>
    `<defs><linearGradient id="cr" x1="0" x2="1"><stop offset="0" stop-color="${lt(c[0], 0.4)}"/><stop offset=".5" stop-color="${c[0]}"/><stop offset="1" stop-color="${dk(c[0], 0.3)}"/></linearGradient></defs>` +
    `<path d="M20 130 L10 40 L60 84 L110 18 L160 84 L210 40 L200 130 Z" fill="url(#cr)"/><rect x="18" y="116" width="184" height="24" rx="6" fill="${dk(c[0], 0.15)}"/>` +
    [[10, 40], [110, 18], [210, 40]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="10" fill="${lt(c[0], 0.3)}"/>`).join('') + `<circle cx="110" cy="96" r="14" fill="${c[1]}"/><circle cx="60" cy="104" r="9" fill="${c[2]}"/><circle cx="160" cy="104" r="9" fill="${c[2]}"/>` +
    [50, 80, 140, 170].map((x) => `<circle cx="${x}" cy="128" r="4" fill="#fff" opacity=".8"/>`).join('')),
  A('jh-wheat', 'Wheat sheaf', 'illustration', 200, 240, ['#e0b45a'], ['shavuot', 'שבועות', 'wheat', 'harvest', 'omer', 'first fruits', 'bikkurim'], (c) =>
    [-18, -8, 0, 8, 18].map((r, i) => wheat(100 + r * 1.4, 232, 1, i % 2 ? dk(c[0], 0.06) : c[0], r)).join('') + `<path d="M76 168 Q100 180 124 168 L122 182 Q100 192 78 182 Z" fill="#7a9a4a"/>`),
  A('jh-tree', 'Young almond tree', 'illustration', 240, 260, ['#7a5a3a', '#6aa04a', '#f6c9d4'], ['tu bishvat', 'tu bshvat', 'ט״ו בשבט', 'tree', 'new year of trees', 'planting', 'nature', 'almond'], (c) => {
    let g = `<ellipse cx="120" cy="250" rx="80" ry="8" fill="#000" opacity=".12"/><path d="M112 250 C114 200 110 170 104 140 L116 140 C122 170 128 200 130 250 Z" fill="${c[0]}"/><path d="M110 170 C90 150 80 130 76 110 M122 160 C140 140 156 126 170 110" stroke="${c[0]}" stroke-width="8" fill="none" stroke-linecap="round"/>`;
    const r = rng(8);
    for (let i = 0; i < 40; i++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()); const px = 120 + Math.cos(a) * d * 96, py = 96 + Math.sin(a) * d * 72; g += i % 3 ? `<circle cx="${f1(px)}" cy="${f1(py)}" r="${f1(14 + r() * 10)}" fill="${i % 2 ? c[1] : dk(c[1], 0.12)}"/>` : `<circle cx="${f1(px)}" cy="${f1(py)}" r="7" fill="${c[2]}"/><circle cx="${f1(px)}" cy="${f1(py)}" r="2" fill="${dk(c[2], 0.4)}"/>`; }
    return g;
  }),
  A('jh-bonfire', 'Bonfire', 'illustration', 240, 220, ['#ff8a2a', '#ffd25a', '#7a4a2a'], ['lag baomer', 'lag b\'omer', 'ל״ג בעומר', 'bonfire', 'fire', 'campfire', 'medura'], (c) => {
    let g = `<defs>${glowDef('bf', c[1], 0.5)}</defs><circle cx="120" cy="130" r="110" fill="url(#bf)"/>`;
    g += `<path d="M120 30 C150 70 176 90 168 140 C164 170 144 186 120 186 C96 186 76 170 72 140 C66 100 100 90 104 56 C112 74 116 86 120 30 Z" fill="${c[0]}"/><path d="M120 86 C138 110 150 130 144 156 C140 172 130 180 120 180 C108 180 98 172 96 156 C92 130 110 120 120 86 Z" fill="${c[1]}"/>`;
    g += `<rect x="40" y="174" width="160" height="18" rx="9" fill="${c[2]}" transform="rotate(14 120 183)"/><rect x="40" y="174" width="160" height="18" rx="9" fill="${dk(c[2], 0.15)}" transform="rotate(-14 120 183)"/>`;
    return g + sparkle(70, 60, 6, c[1]) + sparkle(180, 44, 5, c[1]) + sparkle(190, 96, 4, c[1]);
  }),
  A('jh-sparkles', 'Gold sparkles', 'decoration', 300, 200, ['#d4a940', '#fff3c4'], ['sparkles', 'stars', 'gold', 'confetti'], (c) => {
    const r = rng(23); let g = '';
    for (let i = 0; i < 20; i++) { const x = r() * 300, y = r() * 200; g += i % 3 ? sparkle(x, y, 3 + r() * 7, i % 2 ? c[0] : c[1], 0.9) : `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(2 + r() * 3)}" fill="${c[0]}"/>`; }
    return g;
  }),
  A('jh-frame', 'Pomegranate border frame', 'decoration', 400, 520, ['#b8862b', '#b3243b'], ['frame', 'border', 'elegant', 'invitation'], (c) =>
    frame(400, 520, c[0], 16, (k) => `<path d="M12 40 C12 22 22 12 40 12" stroke="${k}" stroke-width="2.4" fill="none"/>` + pomegranate('fp', 30, 30, 0.13, c[1]))),
];

// ---------- backgrounds ----------
const BGS = backgrounds('jewish', ['jewish', 'holiday'], [
  { id: 'jh-bg-honey', name: 'Honey glow', colors: ['#fff4d6', '#f2c25a', '#e3a21a'], tags: [...RH, 'honey', 'warm', 'gold', 'honeycomb'], draw: (c, W, H) => {
    const u = Math.min(W, H);
    let g = `<defs><radialGradient id="r" cx="50%" cy="40%" r="80%"><stop offset="0" stop-color="${c[0]}"/><stop offset="1" stop-color="${c[1]}"/></radialGradient></defs><rect width="${W}" height="${H}" fill="url(#r)"/>`;
    const s = u * 0.06;
    for (let row = -1; row < H / (s * 1.73) + 1; row++) for (let col = -1; col < W / (s * 1.5) + 1; col++) {
      const cx = col * s * 1.5, cy = row * s * 1.73 + (col % 2 ? s * 0.865 : 0), d = Math.min(cx, W - cx, cy, H - cy) / u;
      if (d > 0.16) continue;
      g += `<path d="${hexPath(cx, cy, s * 0.92)}" fill="${c[2]}" opacity="${(0.32 - d * 1.6).toFixed(2)}"/>`;
    }
    return g + bokeh(W, H, ['#ffffff', c[0]], Math.round((W * H) / 60000), 3, u * 0.05, 'bk');
  } },
  { id: 'jh-bg-pomegranate', name: 'Pomegranate red', colors: ['#5a0f1e', '#8f1d33', '#d4a940'], tags: [...RH, 'red', 'burgundy', 'gold', 'elegant', 'luxury'], draw: (c, W, H) => {
    const u = Math.min(W, H);
    let g = `<defs><radialGradient id="r" cx="50%" cy="38%" r="80%"><stop offset="0" stop-color="${c[1]}"/><stop offset="1" stop-color="${c[0]}"/></radialGradient></defs><rect width="${W}" height="${H}" fill="url(#r)"/>`;
    const r = rng(11);
    for (let i = 0; i < Math.round((W * H) / 26000); i++) { const x = r() * W, y = r() * H; g += `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(u * 0.006)}" ry="${f1(u * 0.0045)}" fill="${c[2]}" opacity="${(0.15 + r() * 0.3).toFixed(2)}" transform="rotate(${f1(r() * 180)} ${f1(x)} ${f1(y)})"/>`; }
    const m = u * 0.04;
    return g + `<rect x="${f1(m)}" y="${f1(m)}" width="${f1(W - m * 2)}" height="${f1(H - m * 2)}" fill="none" stroke="${c[2]}" stroke-width="${f1(u * 0.004)}" opacity=".8"/>`;
  } },
  { id: 'jh-bg-orchard', name: 'Orchard morning', colors: ['#f7f3e8', '#dfe8cf', '#6a9a4a'], tags: [...RH, ...SK, 'green', 'leaves', 'fresh', 'light', 'nature'], draw: (c, W, H) => {
    const u = Math.min(W, H);
    let g = `<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c[0]}"/><stop offset="1" stop-color="${c[1]}"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#s)"/>`;
    const branch = (x0: number, y0: number, ang: number, len: number, seed: number) => {
      const r = rng(seed), ca = Math.cos(ang), sa = Math.sin(ang), nx = -sa, ny = ca;
      const P = (t: number, bend: number) => [x0 + ca * len * t + nx * bend * len * t * t * 0.18, y0 + sa * len * t + ny * bend * len * t * t * 0.18];
      let b = `<path d="M${f1(x0)} ${f1(y0)} Q${f1(P(0.5, 1)[0])} ${f1(P(0.5, 1)[1])} ${f1(P(1, 1)[0])} ${f1(P(1, 1)[1])}" stroke="${dk(c[2], 0.45)}" stroke-width="${f1(len * 0.028)}" fill="none" stroke-linecap="round"/>`;
      for (let i = 1; i <= 8; i++) {
        const t = i / 8.6, [px, py] = P(t, 1), side = i % 2 ? 1 : -1, la = (ang * 180) / Math.PI + side * (40 + r() * 15), l = len * (0.26 - t * 0.09);
        b += `<ellipse cx="${f1(px + Math.cos((la * Math.PI) / 180) * l * 0.5)}" cy="${f1(py + Math.sin((la * Math.PI) / 180) * l * 0.5)}" rx="${f1(l * 0.5)}" ry="${f1(l * 0.19)}" fill="${i % 3 ? c[2] : lt(c[2], 0.18)}" transform="rotate(${f1(la)} ${f1(px + Math.cos((la * Math.PI) / 180) * l * 0.5)} ${f1(py + Math.sin((la * Math.PI) / 180) * l * 0.5)})"/>`;
      }
      const [ax, ay] = P(0.55, 1);
      return b + apple(`ap${seed}`, ax, ay + len * 0.1, len / 1100, '#c8263a', c[2]);
    };
    return g + branch(-u * 0.02, u * 0.05, 0.35, u * 0.42, 3) + branch(u * 0.04, -u * 0.02, 1.15, u * 0.3, 5) + branch(W + u * 0.02, H - u * 0.05, Math.PI + 0.35, u * 0.42, 7) + branch(W - u * 0.04, H + u * 0.02, Math.PI + 1.15, u * 0.3, 9);
  } },
  { id: 'jh-bg-parchment', name: 'Parchment & gold', colors: ['#fbf6ea', '#b8862b'], tags: [...YK, 'cream', 'white', 'elegant', 'minimal', 'invitation'], draw: (c, W, H) => {
    const m = Math.min(W, H) * 0.045, u = Math.min(W, H);
    return `<defs><radialGradient id="r" cx="50%" cy="45%" r="75%"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="${c[0]}"/></radialGradient></defs><rect width="${W}" height="${H}" fill="url(#r)"/>` +
      `<rect x="${f1(m)}" y="${f1(m)}" width="${f1(W - m * 2)}" height="${f1(H - m * 2)}" fill="none" stroke="${c[1]}" stroke-width="${f1(u * 0.005)}"/><rect x="${f1(m * 1.35)}" y="${f1(m * 1.35)}" width="${f1(W - m * 2.7)}" height="${f1(H - m * 2.7)}" fill="none" stroke="${c[1]}" stroke-width="${f1(u * 0.0018)}"/>`;
  } },
  { id: 'jh-bg-twilight', name: 'Holiday twilight', colors: ['#141a3a', '#3a3f7a', '#f2c25a'], tags: [...YK, ...SK, 'night', 'stars', 'blue', 'evening'], draw: (c, W, H) =>
    `<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c[0]}"/><stop offset="1" stop-color="${c[1]}"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#s)"/>` +
    stars(W, H * 0.8, '#fff6d8', Math.round((W * H) / 9000), 12, 2.4) + bokeh(W, H, [c[2]], Math.round((W * H) / 90000), 4, Math.min(W, H) * 0.05, 'bk') },
]);

ASSETS.push(...BGS);
