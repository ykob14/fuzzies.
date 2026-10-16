/**
 * Parking Escape's picture icons: the same chunky, filled, rounded style as Fuzzy Crossing's `gicons.ts` (white / currentColor glyphs for a
 * raspberry tile, cut-outs in `var(--tile)`), for the things that file doesn't have yet. Names that `gicon` already has are passed through.
 * Kept in its own file so this game's skin can't collide with the other game screens' icon edits.
 */
import { gicon, type GIcon } from '../../crossing/ui/gicons';

const NS = 'http://www.w3.org/2000/svg';
const CUT = 'var(--tile, #d6336c)';
const S = (d: string, w = 4.4) => `<path d="${d}" stroke="currentColor" stroke-width="${w}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;

const P: Record<string, string> = {
  undo: `${S('M12.5 7.5 6 14l6.5 6.5', 4.6)}${S('M7 14h11a6.2 6.2 0 0 1 0 12.4h-5', 4.6)}`,
  restart: `${S('M25.2 16A9.2 9.2 0 1 1 22 9', 4.4)}<path d="M26 4.5v9.2h-9.2z" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>`,
  hint: `<path d="M16 3.4a9 9 0 0 0-5.1 16.4c.7.5 1.1 1.2 1.1 2V23h8v-1.2c0-.8.4-1.5 1.1-2A9 9 0 0 0 16 3.4z" fill="currentColor"/><rect x="11.6" y="24.6" width="8.8" height="3.4" rx="1.7" fill="currentColor"/><path d="M12.6 13.2c.4-2 1.8-3.2 3.6-3.2" stroke="${CUT}" stroke-width="2.2" fill="none" stroke-linecap="round" opacity=".55"/>`,
  pause: '<rect x="8.4" y="6" width="5.6" height="20" rx="2.4" fill="currentColor"/><rect x="18" y="6" width="5.6" height="20" rx="2.4" fill="currentColor"/>',
  timer: `<circle cx="16" cy="18" r="10.4" fill="currentColor"/><rect x="12.4" y="3.2" width="7.2" height="3.6" rx="1.8" fill="currentColor"/><path d="M16 18v-6.2M16 18l4 2.6" stroke="${CUT}" stroke-width="2.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  moves: `${S('M5 16h19', 4.8)}${S('M17.5 8.5 25 16l-7.5 7.5', 4.8)}`,
  double: `${S('M5 11h19M18.5 5.5 24 11l-5.5 5.5', 4)}${S('M27 21H8M13.5 15.5 8 21l5.5 5.5', 4)}`,
  spark: '<path d="M16 3c1.3 6.4 3.6 8.7 10 10-6.4 1.3-8.7 3.6-10 10-1.3-6.4-3.6-8.7-10-10 6.4-1.3 8.7-3.6 10-10z" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="25.5" cy="24.5" r="2.6" fill="currentColor"/>',
  car: `<path d="M5.6 19.5 8 12.2A3.4 3.4 0 0 1 11.2 10h9.6a3.4 3.4 0 0 1 3.2 2.2l2.4 7.3c1.3.5 2.1 1.7 2.1 3.1V24a2 2 0 0 1-2 2h-1.5a3.5 3.5 0 0 1-6.8 0h-4.4a3.5 3.5 0 0 1-6.8 0H5.5a2 2 0 0 1-2-2v-1.4c0-1.4.8-2.6 2.1-3.1z" fill="currentColor"/><path d="M10.6 13.4h10.8l1.6 5H9z" fill="${CUT}" opacity=".6"/><circle cx="9.6" cy="25.6" r="2.3" fill="${CUT}"/><circle cx="22.4" cy="25.6" r="2.3" fill="${CUT}"/>`,
  back: S('M19.5 6 10 16l9.5 10', 5),
  next: S('M12.5 6 22 16l-9.5 10', 5),
  close: S('M8 8l16 16M24 8 8 24', 4.8),
  fit: `${S('M5.5 12V6.5H11M26.5 12V6.5H21M5.5 20v5.5H11M26.5 20v5.5H21', 3.8)}<rect x="11.2" y="11.2" width="9.6" height="9.6" rx="2.4" fill="currentColor"/>`,
  sound: `<path d="M5 12.2h4.6L17 6v20l-7.4-6.2H5z" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>${S('M21.4 11a7 7 0 0 1 0 10M25 7.6a12 12 0 0 1 0 16.8', 3.4)}`,
  mute: `<path d="M5 12.2h4.6L17 6v20l-7.4-6.2H5z" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>${S('M21.6 12l6 8M27.6 12l-6 8', 3.6)}`,
  music: `<path d="M11 24.4V8.2L25 5.4v15.8" stroke="currentColor" stroke-width="3.6" fill="none" stroke-linejoin="round" stroke-linecap="round"/><ellipse cx="8.4" cy="24.6" rx="4.4" ry="3.6" fill="currentColor"/><ellipse cx="22.4" cy="21.4" rx="4.4" ry="3.6" fill="currentColor"/>`,
  camera: `<path d="M4.5 11.6a3 3 0 0 1 3-3h2.4l1.6-2.4h9l1.6 2.4h2.4a3 3 0 0 1 3 3v11.8a3 3 0 0 1-3 3h-17a3 3 0 0 1-3-3z" fill="currentColor"/><circle cx="16" cy="17.2" r="5.2" fill="${CUT}"/><circle cx="16" cy="17.2" r="2.6" fill="currentColor"/>`,
  leaf: `<path d="M6 26C5 13 12 5.5 26 5.5c.5 13.5-6 21-17.5 21z" fill="currentColor"/><path d="M7 26C11 19 15.6 14.5 21 11.6" stroke="${CUT}" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".7"/>`,
  paint: `<path d="M16 3.8S25.6 13.4 25.6 20a9.6 9.6 0 0 1-19.2 0C6.4 13.4 16 3.8 16 3.8z" fill="currentColor"/><path d="M11.2 20.4a5 5 0 0 0 3.4 4.4" stroke="${CUT}" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".6"/>`,
  map: `<path d="M3.6 8.4 11 5.6l10 3 7.4-2.8v17.8l-7.4 2.8-10-3-7.4 2.8z" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M11 6v17.6M21 9v17.6" stroke="${CUT}" stroke-width="2.2" opacity=".55"/>`,
  eye: `<path d="M2.8 16C6 10 10.6 7.4 16 7.4S26 10 29.2 16C26 22 21.4 24.6 16 24.6S6 22 2.8 16z" fill="currentColor"/><circle cx="16" cy="16" r="4.6" fill="${CUT}"/>`,
  gift: `<rect x="5.5" y="13" width="21" height="14" rx="2.6" fill="currentColor"/><rect x="4" y="9.2" width="24" height="6" rx="2.4" fill="currentColor" stroke="${CUT}" stroke-width="1.4"/><rect x="14" y="9.2" width="4" height="17.8" fill="${CUT}"/><path d="M16 9.2c-1.4-4.6-6.4-5.6-7-3-.6 2.4 3.6 3 7 3zM16 9.2c1.4-4.6 6.4-5.6 7-3 .6 2.4-3.6 3-7 3z" fill="currentColor"/>`,
  key: `<circle cx="10.4" cy="15" r="6.4" fill="currentColor"/><circle cx="10.4" cy="15" r="2.4" fill="${CUT}"/><path d="M15.4 17.4h12.6v4.4M23 17.4v4.4" stroke="currentColor" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
};

/** an icon in the Parking skin: white / currentColor, 32-unit art */
export function pkicon(name: string, size = 24): SVGSVGElement {
  if (!(name in P)) return gicon(name as GIcon, size);
  const s = document.createElementNS(NS, 'svg');
  s.setAttribute('viewBox', '0 0 32 32'); s.setAttribute('width', String(size)); s.setAttribute('height', String(size));
  s.setAttribute('aria-hidden', 'true'); s.setAttribute('class', 'fzx-gi');
  s.innerHTML = P[name];
  return s;
}
/** a raspberry (or soft / grey / gold) tile with the icon on it — the shared `.fzx-ic` look */
export function pktile(name: string, size = 44, cls = ''): HTMLElement {
  const t = document.createElement('span');
  t.className = `fzx-ic ${cls}`.trim(); t.style.setProperty('--sz', `${size}px`);
  t.append(pkicon(name, Math.round(size * 0.62)));
  return t;
}
/** a chunky gold star (earned) or a pale one (not yet) */
export function pkStar(on: boolean, size = 22): SVGSVGElement {
  const s = document.createElementNS(NS, 'svg');
  s.setAttribute('viewBox', '0 0 32 32'); s.setAttribute('width', String(size)); s.setAttribute('height', String(size)); s.setAttribute('aria-hidden', 'true'); s.setAttribute('class', 'pk-star-svg');
  const pts = Array.from({ length: 10 }, (_, i) => { const a = (i / 10) * Math.PI * 2 - Math.PI / 2, r = i % 2 ? 6.6 : 14; return `${(16 + Math.cos(a) * r).toFixed(2)},${(17 + Math.sin(a) * r).toFixed(2)}`; }).join(' ');
  s.innerHTML = on
    ? `<polygon points="${pts}" fill="#ffc83a" stroke="#d98f00" stroke-width="2.6" stroke-linejoin="round"/><polygon points="${pts}" fill="none" stroke="#fff3b8" stroke-width="1.2" stroke-linejoin="round" transform="translate(16 17) scale(.74) translate(-16 -17)" opacity=".7"/><ellipse cx="12.2" cy="11.6" rx="2.6" ry="1.5" fill="#fff" opacity=".55" transform="rotate(-30 12.2 11.6)"/>`
    : `<polygon points="${pts}" fill="#e7e0e5" stroke="#cdc3ca" stroke-width="2.6" stroke-linejoin="round"/>`;
  return s;
}
