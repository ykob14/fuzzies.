/**
 * Community events collection — original vector artwork drawn in code for Fuzzies (licence: original Fuzzies artwork).
 * Thanksgiving (pie, cornucopia, autumn leaves, a friendly turkey), birthdays (cake with candles, party hat), sports
 * (trophy, medal, balls), marathons (running shoe, finish banner), bingo (balls and card), open mic (microphone,
 * spotlight) and community festivals (bunting, striped tent, food truck).
 */
import type { AssetDef } from '../index';
import { asset, backgrounds, dk, f1, flame, glowDef, lt, rng, sparkle, starPts } from '../draw';

const A = asset('events', ['event', 'community']);
const TG = ['thanksgiving', 'friendsgiving', 'harvest', 'fall', 'autumn', 'grateful', 'thankful', 'action de graces'];

// ---------- drawings ----------
function maple(x: number, y: number, s: number, c: string, rot = 0): string {
  return `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${rot}) scale(${s})"><path d="M0 -50 L10 -30 L24 -36 L20 -14 L40 -18 L30 0 L44 8 L18 14 L22 30 L4 22 L2 44 H-2 L-4 22 L-22 30 L-18 14 L-44 8 L-30 0 L-40 -18 L-20 -14 L-24 -36 L-10 -30 Z" fill="${c}"/><path d="M0 -40 V44 M0 0 L26 -10 M0 0 L-26 -10 M0 10 L16 22 M0 10 L-16 22" stroke="${dk(c, 0.2)}" stroke-width="1.6" fill="none"/></g>`;
}
function pie(crust: string, filling: string, cream: string): string {
  let g = `<ellipse cx="150" cy="150" rx="140" ry="22" fill="#000" opacity=".12"/><path d="M20 110 L40 150 C80 168 220 168 260 150 L280 110 Z" fill="${dk(crust, 0.1)}"/><ellipse cx="150" cy="110" rx="130" ry="40" fill="${filling}"/>`;
  for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; g += `<circle cx="${f1(150 + Math.cos(a) * 128)}" cy="${f1(110 + Math.sin(a) * 39)}" r="12" fill="${crust}"/>`; }
  g += `<path d="M150 110 L270 110 A120 36 0 0 1 220 140 Z" fill="${dk(filling, 0.12)}" opacity=".5"/>`;
  return g + `<path d="M130 92 C130 74 170 74 170 92 C178 92 180 104 170 106 H130 C120 104 122 92 130 92 Z" fill="${cream}"/><path d="M150 72 q6 -10 0 -16" stroke="${cream}" stroke-width="8" stroke-linecap="round"/>`;
}
function cornucopia(horn: string, fruit: string[]): string {
  let g = `<path d="M300 140 C260 60 160 40 90 70 C40 92 10 140 30 190 C60 170 90 160 130 160 C190 160 250 180 300 140 Z" fill="${horn}"/>`;
  for (let i = 0; i < 6; i++) g += `<path d="M${90 + i * 34} ${62 + i * 4} C${100 + i * 34} 110 ${100 + i * 30} 140 ${96 + i * 30} 162" stroke="${dk(horn, 0.2)}" stroke-width="3" fill="none"/>`;
  g += `<path d="M300 140 C330 130 340 110 330 90" stroke="${horn}" stroke-width="12" fill="none" stroke-linecap="round"/>`;
  g += `<circle cx="60" cy="150" r="30" fill="${fruit[0]}"/><circle cx="104" cy="168" r="26" fill="${fruit[1]}"/><ellipse cx="40" cy="196" rx="30" ry="22" fill="${fruit[2]}"/>`;
  for (const [x, y] of [[80, 120], [96, 128], [88, 140]]) g += `<circle cx="${x}" cy="${y}" r="10" fill="${fruit[3]}"/>`;
  g += `<path d="M60 120 v-10" stroke="#5a3a1a" stroke-width="4"/><path d="M20 196 C10 186 14 176 24 178" stroke="#5f8a3a" stroke-width="5" fill="none"/>`;
  return g + maple(150, 196, 0.6, '#d9682b', 20) + maple(20, 120, 0.5, '#c8402a', -30);
}
function turkey(body: string, feathers: string[]): string {
  let g = '';
  feathers.forEach((col, i) => { for (let k = 0; k < 2; k++) { const a = -150 + (i * 2 + k) * (120 / (feathers.length * 2 - 1)); g += `<ellipse cx="0" cy="-70" rx="22" ry="70" fill="${col}" transform="translate(150 150) rotate(${a + 90})"/>`; } });
  g += `<ellipse cx="150" cy="160" rx="60" ry="56" fill="${body}"/><circle cx="150" cy="96" r="34" fill="${lt(body, 0.1)}"/><circle cx="138" cy="90" r="6" fill="#fff"/><circle cx="162" cy="90" r="6" fill="#fff"/><circle cx="139" cy="91" r="3" fill="#222"/><circle cx="163" cy="91" r="3" fill="#222"/>`;
  g += `<path d="M144 104 L156 104 L150 116 Z" fill="#f2a541"/><path d="M150 110 C140 120 142 134 152 132" stroke="#d8433a" stroke-width="7" fill="none" stroke-linecap="round"/>`;
  return g + `<path d="M130 212 v14 l-8 6 M130 226 l8 6 M170 212 v14 l-8 6 M170 226 l8 6" stroke="#f2a541" stroke-width="4" fill="none" stroke-linecap="round"/>`;
}
function birthdayCake(c: string[]): string {
  let g = `<defs>${glowDef('bg', '#ffcf6a', 0.55)}</defs><ellipse cx="140" cy="262" rx="120" ry="10" fill="#000" opacity=".12"/><ellipse cx="140" cy="250" rx="124" ry="14" fill="${c[4]}"/>`;
  g += `<rect x="40" y="150" width="200" height="98" rx="10" fill="${c[0]}"/><rect x="40" y="186" width="200" height="16" fill="${c[1]}"/>`;
  g += `<path d="M40 160 ${Array.from({ length: 10 }, (_, i) => `q10 ${i % 2 ? -4 : 22} 20 0`).join(' ')} V150 H40 Z" fill="${c[2]}"/>`;
  for (let i = 0; i < 5; i++) { const x = 72 + i * 34; g += `<circle cx="${x}" cy="100" r="30" fill="url(#bg)"/><rect x="${x - 5}" y="106" width="10" height="46" rx="3" fill="${c[3 - (i % 2)]}"/><path d="M${x - 5} 116 l10 -6 M${x - 5} 130 l10 -6 M${x - 5} 144 l10 -6" stroke="#fff" stroke-width="2.5" opacity=".7"/>` + flame(x, 80, 24, '#ffb238'); }
  const r = rng(3);
  for (let i = 0; i < 18; i++) g += `<rect x="${f1(50 + r() * 180)}" y="${f1(206 + r() * 36)}" width="8" height="3" rx="1.5" fill="${['#ff6b9a', '#7fb3e8', '#f2c14e', '#8fd0b0'][i % 4]}" transform="rotate(${f1(r() * 180)} ${f1(50 + r() * 180)} 220)"/>`;
  return g;
}
function partyHat(c: string, c2: string): string {
  return `<path d="M100 20 L160 200 H40 Z" fill="${c}"/><path d="M100 20 L118 74 L82 74 Z M76 92 L124 92 L136 128 L64 128 Z M58 146 L142 146 L154 182 L46 182 Z" fill="${c2}"/><ellipse cx="100" cy="200" rx="64" ry="12" fill="${dk(c, 0.2)}"/>` +
    [0, 1, 2, 3, 4].map((i) => `<path d="M100 20 l${-18 + i * 9} -18" stroke="${[c2, '#7fb3e8', '#f2c14e', '#ff6b9a', '#8fd0b0'][i]}" stroke-width="5" stroke-linecap="round"/>`).join('');
}
function trophy(metal: string): string {
  return `<defs><linearGradient id="tr" x1="0" x2="1"><stop offset="0" stop-color="${lt(metal, 0.5)}"/><stop offset=".45" stop-color="${metal}"/><stop offset="1" stop-color="${dk(metal, 0.35)}"/></linearGradient></defs>` +
    `<path d="M60 30 H180 V80 C180 130 150 160 120 166 C90 160 60 130 60 80 Z" fill="url(#tr)"/><path d="M60 46 C20 46 20 110 70 116 M180 46 C220 46 220 110 170 116" stroke="url(#tr)" stroke-width="12" fill="none"/>` +
    `<rect x="108" y="164" width="24" height="40" fill="url(#tr)"/><rect x="76" y="200" width="88" height="20" rx="4" fill="url(#tr)"/><rect x="62" y="218" width="116" height="30" rx="4" fill="${dk(metal, 0.45)}"/>` +
    `<polygon points="${starPts(120, 84, 5, 26, 11)}" fill="${lt(metal, 0.55)}"/><path d="M80 40 C78 80 86 110 100 130" stroke="#fff" stroke-width="7" fill="none" opacity=".4" stroke-linecap="round"/>`;
}
function medal(metal: string, ribbon: string, ribbon2: string): string {
  return `<path d="M60 0 L100 110 L130 100 L96 0 Z" fill="${ribbon}"/><path d="M180 0 L140 110 L110 100 L144 0 Z" fill="${ribbon2}"/>` +
    `<defs><radialGradient id="md" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="${lt(metal, 0.5)}"/><stop offset="1" stop-color="${dk(metal, 0.25)}"/></radialGradient></defs><circle cx="120" cy="160" r="66" fill="url(#md)"/><circle cx="120" cy="160" r="50" fill="none" stroke="${dk(metal, 0.2)}" stroke-width="4"/><polygon points="${starPts(120, 160, 5, 30, 13)}" fill="${lt(metal, 0.4)}"/>`;
}
function shoe(c: string, sole: string, lace: string): string {
  return `<ellipse cx="160" cy="176" rx="150" ry="8" fill="#000" opacity=".1"/><path d="M20 150 C20 110 40 90 70 86 L120 60 C140 50 160 60 170 80 C200 100 250 110 290 124 C304 130 306 150 296 160 H30 C24 160 20 156 20 150 Z" fill="${c}"/>` +
    `<path d="M20 150 H296 C300 160 296 170 286 170 H30 C24 170 20 164 20 158 Z" fill="${sole}"/><path d="M40 160 H280" stroke="${dk(sole, 0.15)}" stroke-width="3" stroke-dasharray="10 6"/>` +
    `<path d="M120 70 L150 110 M134 64 L166 104 M148 62 L182 98" stroke="${lace}" stroke-width="5" stroke-linecap="round"/><path d="M60 120 C120 112 200 120 270 136" stroke="${lt(c, 0.4)}" stroke-width="8" fill="none" stroke-linecap="round"/><path d="M200 106 l30 -6 l-14 20 Z" fill="${lace}"/>`;
}
function finishBanner(c: string, post: string): string {
  let g = `<rect x="16" y="20" width="12" height="230" fill="${post}"/><rect x="372" y="20" width="12" height="230" fill="${post}"/><rect x="28" y="30" width="344" height="64" fill="#ffffff"/>`;
  for (let row = 0; row < 2; row++) for (let i = 0; i < 22; i++) if ((i + row) % 2 === 0) g += `<rect x="${28 + i * 15.6}" y="${30 + row * 15}" width="15.6" height="15" fill="#1d1a1a"/>`;
  return g + `<rect x="28" y="62" width="344" height="32" fill="${c}"/>`;
}
function bingoBall(x: number, y: number, r: number, c: string, n: string): string {
  return `<defs><radialGradient id="bb${n}" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="${lt(c, 0.45)}"/><stop offset="1" stop-color="${dk(c, 0.2)}"/></radialGradient></defs><circle cx="${x}" cy="${y}" r="${r}" fill="url(#bb${n})"/><circle cx="${x}" cy="${y}" r="${f1(r * 0.56)}" fill="#fff"/>` +
    `<text x="${x}" y="${f1(y + r * 0.2)}" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="${f1(r * 0.56)}" text-anchor="middle" fill="#222">${n}</text><ellipse cx="${f1(x - r * 0.4)}" cy="${f1(y - r * 0.5)}" rx="${f1(r * 0.18)}" ry="${f1(r * 0.1)}" fill="#fff" opacity=".6" transform="rotate(-30 ${f1(x - r * 0.4)} ${f1(y - r * 0.5)})"/>`;
}
function microphone(metal: string, grille: string): string {
  return `<defs><linearGradient id="mi" x1="0" x2="1"><stop offset="0" stop-color="${lt(metal, 0.5)}"/><stop offset=".5" stop-color="${metal}"/><stop offset="1" stop-color="${dk(metal, 0.35)}"/></linearGradient></defs>` +
    `<path d="M100 150 V300 M60 300 H140" stroke="${dk(metal, 0.3)}" stroke-width="8" stroke-linecap="round"/><path d="M70 130 C70 160 130 160 130 130" stroke="${dk(metal, 0.3)}" stroke-width="6" fill="none"/>` +
    `<rect x="72" y="20" width="56" height="110" rx="28" fill="url(#mi)"/><rect x="80" y="26" width="40" height="70" rx="20" fill="${grille}"/>` +
    Array.from({ length: 6 }, (_, i) => `<path d="M82 ${36 + i * 10} H118" stroke="${dk(grille, 0.3)}" stroke-width="2"/>`).join('') + `<rect x="72" y="96" width="56" height="10" fill="${dk(metal, 0.2)}"/>`;
}
function bunting(w: number, colors: string[], n: number, y = 10): string {
  let g = `<path d="M0 ${y} Q${w / 2} ${y + 40} ${w} ${y}" stroke="#6b5a4a" stroke-width="3" fill="none"/>`;
  for (let i = 0; i < n; i++) {
    const t0 = (i + 0.1) / n, t1 = (i + 0.9) / n, tm = (i + 0.5) / n;
    const yAt = (t: number) => y + 4 * t * (1 - t) * 20;
    g += `<path d="M${f1(t0 * w)} ${f1(yAt(t0))} L${f1(t1 * w)} ${f1(yAt(t1))} L${f1(tm * w)} ${f1(yAt(tm) + w / n * 1.1)} Z" fill="${colors[i % colors.length]}"/>`;
  }
  return g;
}
function tent(a: string, b: string): string {
  let g = `<ellipse cx="160" cy="244" rx="150" ry="8" fill="#000" opacity=".1"/>`;
  for (let i = 0; i < 8; i++) g += `<path d="M${30 + i * 32.5} 120 H${62.5 + i * 32.5} V240 H${30 + i * 32.5} Z" fill="${i % 2 ? a : b}"/>`;
  g += `<path d="M10 120 L160 30 L310 120 Z" fill="${a}"/>` + [0, 1, 2, 3].map((i) => `<path d="M${160} 30 L${10 + i * 100} 120 L${60 + i * 100} 120 Z" fill="${b}"/>`).join('');
  g += `<path d="M10 120 ${Array.from({ length: 10 }, () => 'q15 20 30 0').join(' ')}" fill="${b}" stroke="${dk(b, 0.1)}" stroke-width="2"/><path d="M160 30 V10" stroke="#6b5a4a" stroke-width="4"/><path d="M160 10 L184 18 L160 26 Z" fill="${a}"/>`;
  return g + `<path d="M130 240 V170 C130 150 190 150 190 170 V240 Z" fill="${dk(a, 0.35)}"/>`;
}
function foodTruck(body: string, trim: string): string {
  return `<ellipse cx="170" cy="210" rx="160" ry="8" fill="#000" opacity=".12"/><rect x="20" y="60" width="240" height="130" rx="16" fill="${body}"/><path d="M260 100 H300 C316 100 324 112 324 128 V190 H260 Z" fill="${dk(body, 0.1)}"/><rect x="272" y="110" width="40" height="34" rx="6" fill="#cfeaf5"/>` +
    `<rect x="50" y="84" width="170" height="60" rx="6" fill="#3a2e2a"/><path d="M40 84 H230 L220 64 H50 Z" fill="${trim}"/>` + Array.from({ length: 6 }, (_, i) => `<path d="M${40 + i * 32} 84 l16 0 l-8 14 Z" fill="${i % 2 ? trim : '#fff'}"/>`).join('') +
    `<rect x="40" y="144" width="190" height="10" rx="3" fill="${lt(body, 0.3)}"/>` + [[80, 190], [270, 190]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="24" fill="#2a2a2a"/><circle cx="${x}" cy="${y}" r="10" fill="#9a9a9a"/>`).join('') +
    `<circle cx="100" cy="112" r="12" fill="#f2c14e"/><path d="M130 104 h40 M130 116 h30" stroke="#fff" stroke-width="5" opacity=".7"/>`;
}

// ---------- assets ----------
export const ASSETS: AssetDef[] = [
  A('ev-pie', 'Pumpkin pie', 'illustration', 300, 180, ['#d89a52', '#d9682b', '#fff8ec'], [...TG, 'pie', 'pumpkin pie', 'dessert', 'bake sale'], (c) => pie(c[0], c[1], c[2])),
  A('ev-cornucopia', 'Cornucopia', 'illustration', 340, 230, ['#b8823a', '#d9682b', '#c8263a', '#e8b94a', '#7a3a8a'], [...TG, 'cornucopia', 'horn of plenty', 'harvest', 'abundance'], (c) => cornucopia(c[0], [c[1], c[2], c[3], c[4]])),
  A('ev-leaves', 'Autumn leaves', 'decoration', 300, 200, ['#d9682b', '#c8402a', '#e8b94a', '#9a5a2a'], [...TG, 'leaves', 'maple', 'fall', 'autumn', 'border'], (c) => {
    const r = rng(5); let g = '';
    for (let i = 0; i < 12; i++) g += maple(20 + r() * 260, 20 + r() * 160, 0.4 + r() * 0.4, c[i % 4], r() * 360);
    return g;
  }),
  A('ev-turkey', 'Friendly turkey', 'illustration', 300, 240, ['#8a5a3a', '#d9682b', '#e8b94a', '#c8402a', '#7a5a3a'], [...TG, 'turkey', 'cute', 'kids'], (c) => turkey(c[0], [c[1], c[2], c[3], c[4]])),
  A('ev-birthday-cake', 'Birthday cake', 'illustration', 280, 270, ['#fbe6ee', '#ff8fb1', '#ffffff', '#7fb3e8', '#e8c46a'], ['birthday', 'cake', 'candles', 'happy birthday', 'party', 'first birthday', 'celebration'], (c) => birthdayCake(c)),
  A('ev-party-hat', 'Party hat', 'illustration', 200, 220, ['#7fb3e8', '#ff8fb1'], ['birthday', 'party hat', 'party', 'kids'], (c) => partyHat(c[0], c[1])),
  A('ev-trophy', 'Trophy', 'illustration', 240, 250, ['#e8b94a'], ['trophy', 'champion', 'winner', 'awards', 'sports', 'tournament', 'competition', 'cup'], (c) => trophy(c[0])),
  A('ev-medal', 'Medal', 'illustration', 240, 230, ['#e8b94a', '#2e86de', '#c8263a'], ['medal', 'finisher', 'marathon', 'race', 'winner', 'sports', 'awards'], (c) => medal(c[0], c[1], c[2])),
  A('ev-shoe', 'Running shoe', 'illustration', 320, 180, ['#ff6b4a', '#ffffff', '#1f2a44'], ['marathon', 'running', '5k', '10k', 'fun run', 'race', 'sneaker', 'fitness', 'charity run'], (c) => shoe(c[0], c[1], c[2])),
  A('ev-finish', 'Finish line banner', 'illustration', 400, 250, ['#c8263a', '#6b6b6b'], ['finish line', 'marathon', 'race', 'running', 'checkered'], (c) => finishBanner(c[0], c[1])),
  A('ev-bingo-balls', 'Bingo balls', 'illustration', 300, 180, ['#e8574a', '#2e86de', '#f2c14e', '#2fa05a', '#8c6bd6'], ['bingo', 'bingo night', 'balls', 'game night', 'numbers', 'lottery'], (c) =>
    bingoBall(60, 110, 46, c[0], '7') + bingoBall(150, 80, 54, c[1], '22') + bingoBall(240, 112, 46, c[2], '41') + bingoBall(110, 150, 30, c[3], '58') + bingoBall(196, 152, 28, c[4], '63')),
  A('ev-bingo-card', 'Bingo card', 'illustration', 240, 280, ['#ffffff', '#e8574a', '#2e86de'], ['bingo', 'bingo card', 'game night'], (c) => {
    let g = `<rect x="10" y="10" width="220" height="260" rx="14" fill="${c[1]}"/><rect x="22" y="58" width="196" height="200" rx="6" fill="${c[0]}"/>`;
    'BINGO'.split('').forEach((ch, i) => { g += `<text x="${42 + i * 39}" y="46" font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="28" text-anchor="middle" fill="#fff">${ch}</text>`; });
    const r = rng(9);
    // each column holds 5 different numbers from its own range (B 1–15, I 16–30, N 31–45, G 46–60, O 61–75)
    const cols = [0, 1, 2, 3, 4].map((col) => Array.from({ length: 15 }, (_, i) => col * 15 + 1 + i).sort(() => r() - 0.5).slice(0, 5).sort((a, b) => a - b));
    for (let row = 0; row < 5; row++) for (let col = 0; col < 5; col++) {
      const x = 42 + col * 39, y = 80 + row * 39;
      g += `<rect x="${x - 18}" y="${y - 17}" width="36" height="36" fill="none" stroke="#e0e0e0"/>`;
      if (row === 2 && col === 2) g += `<polygon points="${starPts(x, y + 1, 5, 14, 6)}" fill="${c[1]}"/>`;
      else g += `<text x="${x}" y="${y + 7}" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="18" text-anchor="middle" fill="#333">${cols[col][row]}</text>` + (r() > 0.7 ? `<circle cx="${x}" cy="${y + 1}" r="14" fill="${c[2]}" opacity=".55"/>` : '');
    }
    return g;
  }),
  A('ev-microphone', 'Microphone', 'illustration', 200, 310, ['#c0c6cf', '#4a4a52'], ['open mic', 'microphone', 'karaoke', 'comedy', 'poetry', 'talent show', 'singing', 'podcast'], (c) => microphone(c[0], c[1])),
  A('ev-spotlight', 'Stage spotlight', 'decoration', 300, 300, ['#fff3c4'], ['spotlight', 'stage', 'open mic', 'show', 'theatre', 'talent show', 'performance'], (c) =>
    `<defs><linearGradient id="sl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c[0]}" stop-opacity=".85"/><stop offset="1" stop-color="${c[0]}" stop-opacity="0"/></linearGradient></defs><path d="M130 0 H170 L290 300 H10 Z" fill="url(#sl)"/><ellipse cx="150" cy="290" rx="140" ry="10" fill="${c[0]}" opacity=".35"/>`),
  A('ev-bunting', 'Bunting', 'decoration', 600, 120, ['#e8574a', '#f2c14e', '#2e86de', '#2fa05a', '#ff8fb1'], ['bunting', 'flags', 'festival', 'fair', 'party', 'garden party', 'street party', 'border'], (c) => bunting(600, c, 12)),
  A('ev-tent', 'Festival tent', 'illustration', 320, 250, ['#e8574a', '#ffffff'], ['festival', 'tent', 'fair', 'market', 'carnival', 'circus', 'community'], (c) => tent(c[0], c[1])),
  A('ev-food-truck', 'Food truck', 'illustration', 340, 220, ['#2fa0a0', '#f2c14e'], ['food truck', 'street food', 'festival', 'market', 'food', 'fair'], (c) => foodTruck(c[0], c[1])),
  A('ev-balls', 'Sports balls', 'illustration', 300, 160, ['#f28c1e', '#ffffff', '#c8263a'], ['sports', 'ball', 'basketball', 'soccer', 'football', 'baseball', 'team', 'game day'], (c) =>
    `<circle cx="70" cy="90" r="56" fill="${c[0]}"/><path d="M14 90 H126 M70 34 V146 M30 50 C56 70 56 110 30 130 M110 50 C84 70 84 110 110 130" stroke="#2a1a10" stroke-width="3" fill="none"/>` +
    `<circle cx="178" cy="96" r="50" fill="${c[1]}" stroke="#333" stroke-width="2"/><polygon points="178,76 196,90 189,112 167,112 160,90" fill="#2a2a2a"/>` + [[150, 70], [206, 70], [140, 120], [216, 120], [178, 140]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9" fill="#2a2a2a" opacity=".85"/>`).join('') +
    `<circle cx="262" cy="110" r="34" fill="#fbfbf7" stroke="#ccc" stroke-width="2"/><path d="M240 86 C252 100 252 120 240 134 M284 86 C272 100 272 120 284 134" stroke="${c[2]}" stroke-width="3" fill="none" stroke-dasharray="4 3"/>`),
  A('ev-sparkles', 'Party sparkles', 'decoration', 300, 200, ['#f2c14e', '#ff8fb1', '#7fb3e8'], ['sparkles', 'confetti', 'party'], (c) => {
    const r = rng(81); let g = '';
    for (let i = 0; i < 24; i++) { const x = r() * 300, y = r() * 200; g += i % 3 ? sparkle(x, y, 3 + r() * 7, c[i % 3], 0.9) : `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(2 + r() * 3)}" fill="${c[i % 3]}"/>`; }
    return g;
  }),
];

// ---------- backgrounds ----------
const BGS = backgrounds('events', ['event'], [
  { id: 'ev-bg-autumn', name: 'Autumn glow', colors: ['#fff1dc', '#f2b26b', '#d9682b', '#c8402a', '#e8b94a'], tags: [...TG, 'orange', 'warm', 'leaves'], draw: (c, W, H) => {
    const u = Math.min(W, H), r = rng(11);
    let g = `<defs><radialGradient id="r" cx="50%" cy="40%" r="85%"><stop offset="0" stop-color="${c[0]}"/><stop offset="1" stop-color="${c[1]}"/></radialGradient></defs><rect width="${W}" height="${H}" fill="url(#r)"/>`;
    for (let i = 0; i < Math.round((W * H) / 40000); i++) { const x = r() * W, y = r() * H, edge = Math.min(x, W - x, y, H - y) / u; if (edge > 0.12 || (y < u * 0.4 && x > W * 0.18 && x < W * 0.82)) continue; g += maple(x, y, u / 900 * (0.8 + r()), c[2 + (i % 3)], r() * 360); }
    return g;
  } },
  { id: 'ev-bg-party', name: 'Party confetti', colors: ['#fff8fb', '#ff8fb1', '#7fb3e8', '#f2c14e', '#8fd0b0'], tags: ['birthday', 'party', 'confetti', 'kids', 'celebration', 'colourful'], draw: (c, W, H) => {
    const u = Math.min(W, H), r = rng(13);
    let g = `<rect width="${W}" height="${H}" fill="${c[0]}"/>`;
    for (let i = 0; i < Math.round((W * H) / 5000); i++) { const x = r() * W, y = r() * H, s = u * (0.006 + r() * 0.01), col = c[1 + (i % 4)]; if (Math.min(x, W - x, y, H - y) / u > 0.2 && r() > 0.08) continue; g += i % 3 ? `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(s * 2)}" height="${f1(s)}" rx="${f1(s * 0.3)}" fill="${col}" opacity=".85" transform="rotate(${f1(r() * 180)} ${f1(x)} ${f1(y)})"/>` : `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(s * 0.7)}" fill="${col}" opacity=".85"/>`; }
    return g;
  } },
  { id: 'ev-bg-stage', name: 'Spotlight stage', colors: ['#120d1c', '#2a1f3a', '#fff3c4', '#8a1a2a'], tags: ['open mic', 'stage', 'comedy', 'concert', 'karaoke', 'talent show', 'night', 'spotlight'], draw: (c, W, H) => {
    const u = Math.min(W, H);
    let g = `<defs><radialGradient id="r" cx="50%" cy="85%" r="70%"><stop offset="0" stop-color="${c[1]}"/><stop offset="1" stop-color="${c[0]}"/></radialGradient><linearGradient id="sl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c[2]}" stop-opacity=".5"/><stop offset="1" stop-color="${c[2]}" stop-opacity="0"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#r)"/>`;
    g += `<path d="M${f1(W * 0.44)} 0 H${f1(W * 0.56)} L${f1(W * 0.86)} ${H} H${f1(W * 0.14)} Z" fill="url(#sl)"/>`;
    for (const side of [0, 1]) for (let i = 0; i < 5; i++) { const x = side ? W - (i + 1) * u * 0.04 : i * u * 0.04; g += `<rect x="${f1(x)}" y="0" width="${f1(u * 0.045)}" height="${H}" fill="${i % 2 ? c[3] : dk(c[3], 0.2)}"/>`; }
    return g + `<rect x="0" y="${f1(H - u * 0.08)}" width="${W}" height="${f1(u * 0.08)}" fill="${dk(c[1], 0.3)}"/>`;
  } },
  { id: 'ev-bg-fair', name: 'Sunny fair', colors: ['#cfeaf8', '#f4fbff', '#8cc96a', '#e8574a', '#f2c14e', '#2e86de', '#2fa05a', '#ff8fb1'], tags: ['festival', 'fair', 'community', 'market', 'bunting', 'summer', 'outdoor'], draw: (c, W, H) => {
    const u = Math.min(W, H);
    return `<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c[0]}"/><stop offset="1" stop-color="${c[1]}"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#s)"/>` +
      `<g transform="scale(${f1(W / 600)} ${f1(u / 600)})">${bunting(600, c.slice(3), 12, 12)}</g><path d="M0 ${f1(H - u * 0.12)} C${f1(W * 0.3)} ${f1(H - u * 0.18)} ${f1(W * 0.7)} ${f1(H - u * 0.08)} ${W} ${f1(H - u * 0.14)} V${H} H0 Z" fill="${c[2]}"/>`;
  } },
  { id: 'ev-bg-sunny', name: 'Sunny sky', colors: ['#cfeaf8', '#f4fbff', '#8cc96a'], tags: ['festival', 'fair', 'community', 'summer', 'outdoor', 'sky', 'sports day'], draw: (c, W, H) => {
    const u = Math.min(W, H);
    return `<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c[0]}"/><stop offset="1" stop-color="${c[1]}"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#s)"/>` +
      `<path d="M0 ${f1(H - u * 0.12)} C${f1(W * 0.3)} ${f1(H - u * 0.18)} ${f1(W * 0.7)} ${f1(H - u * 0.08)} ${W} ${f1(H - u * 0.14)} V${H} H0 Z" fill="${c[2]}"/>`;
  } },
  { id: 'ev-bg-track', name: 'Running track', colors: ['#c8573a', '#ffffff', '#cfe7f5', '#f6fbff'], tags: ['marathon', 'running', 'race', 'track', 'sports', 'fun run', '5k'], draw: (c, W, H) => {
    const u = Math.min(W, H), hz = H * 0.62, vx = W / 2;
    let g = `<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c[2]}"/><stop offset="1" stop-color="${c[3]}"/></linearGradient></defs><rect width="${W}" height="${f1(hz)}" fill="url(#s)"/>`;
    g += `<path d="M${f1(vx - W * 0.08)} ${f1(hz)} H${f1(vx + W * 0.08)} L${f1(W * 1.3)} ${H} H${f1(-W * 0.3)} Z" fill="${c[0]}"/><path d="M0 ${f1(hz)} H${W} V${H} H${f1(W * 1.3)} L${f1(vx + W * 0.08)} ${f1(hz)} H${f1(vx - W * 0.08)} L${f1(-W * 0.3)} ${H} H0 Z" fill="#7fbf6a"/>`;
    for (let i = 0; i <= 6; i++) { const t = i / 6, top = vx - W * 0.08 + t * W * 0.16, bot = -W * 0.3 + t * W * 1.6; g += `<path d="M${f1(top)} ${f1(hz)} L${f1(bot)} ${H}" stroke="${c[1]}" stroke-width="${f1(u * 0.005)}"/>`; }
    return g + `<rect x="0" y="${f1(H - u * 0.12)}" width="${W}" height="${f1(u * 0.012)}" fill="${c[1]}" opacity=".9"/>`;
  } },
]);

ASSETS.push(...BGS);
