/**
 * Picture icons for the mini-game screens (intro cards, HUD, pause menu, results): one chunky glyph per game, the controls
 * pictograms, and the bronze / silver / gold medals. Same conventions as Fuzzy Crossing's `crossing/ui/gicons.ts` (32×32,
 * filled, rounded, `currentColor` + little cut-outs in the tile colour `var(--tile)`), so they sit on a `.fzx-ic` tile or
 * stand alone. No emoji anywhere on these screens — emoji look different on every phone and read as a prototype.
 * Icons that already exist in gicons.ts (coin, star, trophy, play, town, check, help, flag, chest, lock, fuzzy…) are reused from there.
 */
import { gicon, type GIcon } from '../crossing/ui/gicons';

const NS = 'http://www.w3.org/2000/svg';
const CUT = 'var(--tile, #d6336c)';

const G: Record<string, string> = {
  // ---- one per game ----
  apple: `<path d="M16 9.6c-3-2.6-9.4-1.8-10 5.4-.6 6.4 3.8 13 7 13 1.2 0 2-.7 3-.7s1.8.7 3 .7c3.2 0 7.6-6.6 7-13-.6-7.2-7-8-10-5.4z" fill="currentColor"/><path d="M16.2 9.4c-.2-3 1.4-5.4 4.8-5.8.2 3.2-1.4 5.4-4.8 5.8z" fill="currentColor" stroke="${CUT}" stroke-width="1.5" stroke-linejoin="round"/><path d="M16 9.4c0-1.8-.4-3.2-1.2-4.4" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/><path d="M10 15.2c.4-1.6 1.4-2.6 2.8-3" stroke="${CUT}" stroke-width="1.8" stroke-linecap="round" fill="none" opacity=".7"/>`,
  maze: `<rect x="3.5" y="3.5" width="25" height="25" rx="6.5" fill="currentColor"/><path d="M16 16.2h2.4v-2.6h-5v5h7.6V11H10.6v10.4h13" stroke="${CUT}" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  balloon: `<ellipse cx="16" cy="12.6" rx="9.2" ry="10.4" fill="currentColor"/><path d="M16 22.6l-2.4 3h4.8z" fill="currentColor"/><path d="M16 25.6c-2.6 1.8-1.6 3.4.4 4" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round"/><path d="M10.4 9.6c.6-2 2.2-3.4 4-3.6" stroke="${CUT}" stroke-width="2.2" fill="none" stroke-linecap="round" opacity=".75"/>`,
  fish: `<path d="M3.6 16.2c4.2-7.4 13-8.6 18-3.2l5.6-4.2v14.8L21.6 19c-5 5.4-13.8 4.4-18-2.8z" fill="currentColor"/><circle cx="11.6" cy="14.6" r="1.9" fill="${CUT}"/><path d="M17.4 13c1.2 1.6 1.2 4.4 0 6" stroke="${CUT}" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".8"/>`,
  runner: `<path d="M4 21.4c0-3.4 1.2-5.8 4.2-6.8l3.4-1.2 2.2 3.2 5.2 1.4c3.6 1 6.4 2.4 8 4.6V26H4z" fill="currentColor"/><path d="M4 26.4h24.6" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"/><path d="M12.6 17.4l2.2 1.6M16.6 18.6l2 1.4" stroke="${CUT}" stroke-width="1.8" stroke-linecap="round"/>`,
  wheat: `<path d="M16 29V11" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><ellipse cx="16" cy="7" rx="2.8" ry="4.8" fill="currentColor"/><ellipse cx="11.2" cy="12.4" rx="2.7" ry="4.6" transform="rotate(-38 11.2 12.4)" fill="currentColor"/><ellipse cx="20.8" cy="12.4" rx="2.7" ry="4.6" transform="rotate(38 20.8 12.4)" fill="currentColor"/><ellipse cx="11.2" cy="19.2" rx="2.7" ry="4.6" transform="rotate(-38 11.2 19.2)" fill="currentColor"/><ellipse cx="20.8" cy="19.2" rx="2.7" ry="4.6" transform="rotate(38 20.8 19.2)" fill="currentColor"/>`,
  flower: `<g fill="currentColor"><circle cx="16" cy="8.6" r="5.4"/><circle cx="23.4" cy="14" r="5.4"/><circle cx="20.6" cy="22.4" r="5.4"/><circle cx="11.4" cy="22.4" r="5.4"/><circle cx="8.6" cy="14" r="5.4"/></g><circle cx="16" cy="16.4" r="4.2" fill="${CUT}"/>`,
  parcel: `<path d="M16 3.6l11.6 4.6v15.6L16 28.4 4.4 23.8V8.2z" fill="currentColor"/><path d="M4.4 8.2L16 12.8l11.6-4.6M16 12.8v15.6" stroke="${CUT}" stroke-width="1.8" fill="none" stroke-linejoin="round"/><path d="M10.2 5.9l11.6 4.6" stroke="${CUT}" stroke-width="3" stroke-linecap="round"/>`,
  gem: `<path d="M9.4 5h13.2l6.4 8.2L16 28.2 3 13.2z" fill="currentColor"/><path d="M3 13.2h26M12 13.2L16 28l4-14.8M12 13.2L9.4 5M20 13.2L22.6 5M12 13.2L16 5l4 8.2" stroke="${CUT}" stroke-width="1.5" fill="none" stroke-linejoin="round" opacity=".85"/>`,
  flame: `<path d="M16.4 2.4c1 5.2 8 8.2 8 16.2a8.2 8.2 0 0 1-16.4 0c0-4 2-6.2 3.2-8.2.6 2 1.6 3 3.2 3.2-.2-4.2-1-8.4 2-11.2z" fill="currentColor"/><path d="M16.2 28.2a4.4 4.4 0 0 1-4.2-4.4c0-2.6 2.2-3.6 3.2-6.4.8 1.8 2.2 2.6 3.2 4.2.8 1.2 1 2 1 2.4a4.4 4.4 0 0 1-3.2 4.2z" fill="${CUT}"/>`,
  snow: `<g stroke="currentColor" stroke-width="3" stroke-linecap="round" fill="none"><path d="M16 3.6v24.8M5.3 9.8l21.4 12.4M26.7 9.8L5.3 22.2"/><path d="M12.6 6l3.4 3 3.4-3M12.6 26l3.4-3 3.4 3M4.6 14.6l4.4-1-1.2-4.2M27.4 17.4l-4.4 1 1.2 4.2M4.6 17.4l4.4 1-1.2 4.2M27.4 14.6l-4.4-1 1.2-4.2" stroke-width="2"/></g><circle cx="16" cy="16" r="3" fill="currentColor"/>`,
  shell: `<path d="M16 4.6C8.4 4.6 3.4 11.6 3.4 19.4h25.2c0-7.8-5-14.8-12.6-14.8z" fill="currentColor"/><path d="M9.6 21.6h12.8l-2.2 5.6h-8.4z" fill="currentColor"/><path d="M16 19V7M16 19L9.4 9.6M16 19l6.6-9.4M16 19L5.8 14.4M16 19l10.2-4.6" stroke="${CUT}" stroke-width="1.7" stroke-linecap="round" fill="none"/>`,
  skate: `<path d="M9 4h8.2v11l8.6 3.4c2.4.9 3.2 2.6 3.2 5.2V25H9z" fill="currentColor"/><path d="M9 8.8h8.2M9 12.6h8.2" stroke="${CUT}" stroke-width="1.8" stroke-linecap="round"/><path d="M5.6 28.4h24" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/><rect x="11" y="24.4" width="2.4" height="3.2" fill="currentColor"/><rect x="23.4" y="24.4" width="2.4" height="3.2" fill="currentColor"/>`,
  bolt: `<path d="M19 2.4L6.6 18.2h7.2L12 29.6l13.4-17.4h-7.6z" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>`,
  boat: `<path d="M16.4 3.4v16.4H6.6z" fill="currentColor"/><path d="M18.6 8.2l8.6 11.6h-8.6z" fill="currentColor"/><path d="M2.8 21.6h26.4l-4.2 6.2H7z" fill="currentColor"/>`,
  tree: `<rect x="13.6" y="19" width="4.8" height="10" rx="1.6" fill="currentColor"/><circle cx="16" cy="11.4" r="8.2" fill="currentColor"/><circle cx="9.4" cy="16.6" r="6" fill="currentColor"/><circle cx="22.6" cy="16.6" r="6" fill="currentColor"/>`,
  vacuum: `<circle cx="12.4" cy="20.2" r="8.6" fill="currentColor"/><circle cx="12.4" cy="20.2" r="3.4" fill="${CUT}"/><path d="M18.4 14.6c7.6-.4 8.4-5.8 8-9.6" stroke="currentColor" stroke-width="3.2" fill="none" stroke-linecap="round"/><rect x="21.6" y="2.6" width="9" height="4.6" rx="2.2" fill="currentColor"/>`,
  // ---- the controls line ----
  keys: `<g fill="currentColor"><rect x="11.4" y="3.6" width="9.2" height="9.2" rx="2.4"/><rect x="2" y="14" width="9.2" height="9.2" rx="2.4"/><rect x="11.4" y="14" width="9.2" height="9.2" rx="2.4"/><rect x="20.8" y="14" width="9.2" height="9.2" rx="2.4"/></g><path d="M16 6.8v3.2M14.4 8.6L16 7l1.6 1.6" stroke="${CUT}" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  mouse: `<rect x="8" y="3" width="16" height="26" rx="8" fill="currentColor"/><path d="M16 3v10M8 13h16" stroke="${CUT}" stroke-width="1.8" fill="none"/><rect x="14.4" y="6.4" width="3.2" height="4.4" rx="1.6" fill="${CUT}"/>`,
  stick: `<circle cx="16" cy="16" r="12.6" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="16" cy="16" r="6" fill="currentColor"/>`,
  tap: `<circle cx="16" cy="16" r="5" fill="currentColor"/><circle cx="16" cy="16" r="10.4" fill="none" stroke="currentColor" stroke-width="2.6" opacity=".75"/><circle cx="16" cy="16" r="14.2" fill="none" stroke="currentColor" stroke-width="2" opacity=".4"/>`,
  swipe: `<path d="M4.4 16h23.2" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"/><path d="M10.6 9.4L4.4 16l6.2 6.6M21.4 9.4l6.2 6.6-6.2 6.6" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
  hold: `<circle cx="16" cy="16" r="12.4" fill="none" stroke="currentColor" stroke-width="2.6" stroke-dasharray="5 4"/><circle cx="16" cy="16" r="7" fill="currentColor"/>`,
  // ---- screen buttons ----
  pause: `<rect x="7.6" y="5.6" width="6.6" height="20.8" rx="2.6" fill="currentColor"/><rect x="17.8" y="5.6" width="6.6" height="20.8" rx="2.6" fill="currentColor"/>`,
  restart: `<path d="M26.4 16A10.4 10.4 0 1 1 22.6 8" stroke="currentColor" stroke-width="3.8" fill="none" stroke-linecap="round"/><path d="M27.6 3.4v9.4h-9.4z" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>`,
  soundOn: `<path d="M4.6 12.4h4.6l7-5.6v18.4l-7-5.6H4.6z" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M20.6 11.6c2.2 2.4 2.2 6.4 0 8.8M24.2 7.8c4.2 4.6 4.2 12.2 0 16.8" stroke="currentColor" stroke-width="2.6" fill="none" stroke-linecap="round"/>`,
  soundOff: `<path d="M4.6 12.4h4.6l7-5.6v18.4l-7-5.6H4.6z" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M21 12l7.6 8M28.6 12L21 20" stroke="currentColor" stroke-width="2.8" fill="none" stroke-linecap="round"/>`,
  clock: `<circle cx="16" cy="17" r="11.4" fill="currentColor"/><path d="M16 10.4V17l4.4 2.6" stroke="${CUT}" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/><rect x="12.4" y="2.4" width="7.2" height="3.4" rx="1.7" fill="currentColor"/>`,
  bulb: `<path d="M16 3.2a8.8 8.8 0 0 0-5 16c1 .8 1.4 1.8 1.4 3h7.2c0-1.2.4-2.2 1.4-3a8.8 8.8 0 0 0-5-16z" fill="currentColor"/><rect x="12.2" y="24.4" width="7.6" height="3.2" rx="1.6" fill="currentColor"/>`,
  info: `<circle cx="16" cy="16" r="12.6" fill="currentColor"/><rect x="14.4" y="13.6" width="3.2" height="9" rx="1.6" fill="${CUT}"/><circle cx="16" cy="9.6" r="1.9" fill="${CUT}"/>`,
};

/** the picture that stands for each mini-game */
export const GAME_GLYPH: Record<string, string> = {
  fruit: 'apple', maze: 'maze', balloon: 'balloon', treasure: 'chest', fishing: 'fish', obstacle: 'runner', harvest: 'wheat', garden: 'flower',
  delivery: 'parcel', mining: 'gem', fire: 'flame', snowball: 'snow', beach: 'shell', skate: 'skate', brawl: 'bolt',
  boatrace: 'boat', forest: 'tree', vacuum: 'vacuum', kart: 'flag', dolphin: 'fish', cooking: 'flame',
};

export type MgGlyph = keyof typeof G | GIcon;

/** a bare icon (white / currentColor) — mini-game glyphs first, then Fuzzy Crossing's set */
export function mgIcon(name: string, size = 24): SVGSVGElement {
  if (!G[name]) return gicon(name as GIcon, size);
  const s = document.createElementNS(NS, 'svg');
  s.setAttribute('viewBox', '0 0 32 32');
  s.setAttribute('width', String(size));
  s.setAttribute('height', String(size));
  s.setAttribute('aria-hidden', 'true');
  s.setAttribute('class', 'fzx-gi');
  s.innerHTML = G[name];
  return s;
}

/** the raspberry tile with the glyph on it */
export function mgTile(name: string, size = 44, cls = ''): HTMLElement {
  const t = document.createElement('span');
  t.className = `fzx-ic ${cls}`.trim();
  t.style.setProperty('--sz', `${size}px`);
  t.append(mgIcon(name, Math.round(size * 0.62)));
  return t;
}

/** the tile for a game by its adventure id */
export const gameTile = (id: string, size = 88, cls = ''): HTMLElement => mgTile(GAME_GLYPH[id] ?? 'star', size, cls);

let medalN = 0;
const METALS: Record<string, [string, string, string, string]> = {
  gold: ['#fff0a8', '#f5b014', '#b97800', '#fff6cc'],
  silver: ['#fafcff', '#c5ced8', '#8793a2', '#ffffff'],
  bronze: ['#f6c697', '#cd7f3f', '#8c4a1c', '#ffe2c4'],
  finisher: ['#ffd3e2', '#ee6d9a', '#b0245a', '#ffe8f0'],
};
/** a real medal on its ribbon: 1 = gold, 2 = silver, 3 = bronze, anything else = the raspberry finisher medal */
export function medalGraphic(place: number, size = 56): SVGSVGElement {
  const key = place === 1 ? 'gold' : place === 2 ? 'silver' : place === 3 ? 'bronze' : 'finisher';
  const [hi, mid, lo, shine] = METALS[key];
  const id = `mgm${++medalN}`;
  const star = (cx: number, cy: number, r: number): string => {
    const pts: string[] = [];
    for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 - Math.PI / 2; const rr = i % 2 ? r * 0.46 : r; pts.push(`${(cx + Math.cos(a) * rr).toFixed(2)},${(cy + Math.sin(a) * rr).toFixed(2)}`); }
    return pts.join(' ');
  };
  const s = document.createElementNS(NS, 'svg');
  s.setAttribute('viewBox', '0 0 48 56');
  s.setAttribute('width', String(Math.round(size * 48 / 56)));
  s.setAttribute('height', String(size));
  s.setAttribute('aria-hidden', 'true');
  s.setAttribute('class', `mg-medal m-${key}`);
  s.innerHTML = `<defs><radialGradient id="${id}" cx=".35" cy=".28" r=".85"><stop offset="0" stop-color="${hi}"/><stop offset=".55" stop-color="${mid}"/><stop offset="1" stop-color="${lo}"/></radialGradient></defs>`
    + `<path d="M12.5 1.5h9l5.5 20-9 3z" fill="var(--accent, #d6336c)"/><path d="M35.5 1.5h-9L21 21.5l9 3z" fill="color-mix(in srgb, var(--accent, #d6336c) 72%, #000)"/>`
    + `<circle cx="24" cy="35" r="17.5" fill="${lo}"/><circle cx="24" cy="33.6" r="17.5" fill="url(#${id})"/>`
    + `<circle cx="24" cy="33.6" r="12.6" fill="none" stroke="${lo}" stroke-opacity=".45" stroke-width="1.8"/>`
    + `<polygon points="${star(24, 33.8, 8)}" fill="${shine}" stroke="${lo}" stroke-opacity=".4" stroke-width="1" stroke-linejoin="round"/>`
    + `<path d="M13.4 27.4a12.6 12.6 0 0 1 8-7" stroke="#fff" stroke-opacity=".7" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
  return s;
}
export const medalName = (place: number): string => (place === 1 ? 'Gold' : place === 2 ? 'Silver' : place === 3 ? 'Bronze' : 'Finisher');
