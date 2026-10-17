/**
 * The look of the four self-built mini-game screens (Boat Race, Forest Challenge, Hairball Vacuum, Brawl Arena): picture icons for
 * the HUD (no emoji), the key-cap hint line, and the pause card. Styles live in `gamesSkin.css`; the icons follow the Fuzzy
 * Crossing set in `crossing/ui/gicons.ts` (chunky, filled, rounded, white on a tile) and add the pieces these games need.
 * Pure DOM, no game rules.
 */
import './gamesSkin.css';
import '../crossing/ui/gameui.css';
import { gicon, type GIcon } from '../crossing/ui/gicons';
import { friendUrl } from '../content/friends';

const NS = 'http://www.w3.org/2000/svg';
const CUT = 'var(--tile, #d6336c)';
const rays = (n: number, r0: number, r1: number): string => Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2; return `M${(16 + Math.cos(a) * r0).toFixed(1)} ${(16 + Math.sin(a) * r0).toFixed(1)}L${(16 + Math.cos(a) * r1).toFixed(1)} ${(16 + Math.sin(a) * r1).toFixed(1)}`; }).join('');
const petals = (n: number, d: number, r: number): string => Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2 - Math.PI / 2; return `<circle cx="${(16 + Math.cos(a) * d).toFixed(1)}" cy="${(16 + Math.sin(a) * d).toFixed(1)}" r="${r}" fill="currentColor"/>`; }).join('');

const MORE: Record<string, string> = {
  pause: `<rect x="7.5" y="6" width="6.6" height="20" rx="2.6" fill="currentColor"/><rect x="17.9" y="6" width="6.6" height="20" rx="2.6" fill="currentColor"/>`,
  clock: `<rect x="12.4" y="2.4" width="7.2" height="3.4" rx="1.7" fill="currentColor"/><circle cx="16" cy="17.2" r="11.6" fill="currentColor"/><path d="M16 10.6v6.8l4.4 3" stroke="${CUT}" stroke-width="2.7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  sun: `<circle cx="16" cy="16" r="6.6" fill="currentColor"/><path d="${rays(8, 10.4, 14)}" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/>`,
  log: `<rect x="3" y="8.6" width="22" height="14.8" rx="4.4" fill="currentColor"/><path d="M8 13.6h9M8 18.4h12" stroke="${CUT}" stroke-width="1.8" stroke-linecap="round" opacity=".55"/><ellipse cx="25" cy="16" rx="4" ry="7.4" fill="currentColor" stroke="${CUT}" stroke-width="1.7"/><ellipse cx="25" cy="16" rx="1.5" ry="3.4" fill="none" stroke="${CUT}" stroke-width="1.5"/>`,
  tree: `<path d="M16 3.4 6.6 15h4.6L5.8 22.4h6.6V29h7.2v-6.6h6.6L20.8 15h4.6z" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>`,
  axe: `<path d="M8.4 26.6 21.2 10.6" stroke="currentColor" stroke-width="3.8" stroke-linecap="round"/><path d="M14.4 5.6c5.6-3 11.8.2 12.4 5.8l-6.2.4-3.8 5.6c-2.2-2.2-3.8-4.4-4.6-7.2z" fill="currentColor" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>`,
  next: `<path d="M27.4 16 6.6 4.8l4.6 11.2-4.6 11.2z" fill="currentColor" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/>`,
  back: `<path d="M9.6 11.6h10.4a6.2 6.2 0 0 1 0 12.4h-7" stroke="currentColor" stroke-width="4.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M14.4 5.6 8 11.6l6.4 6" stroke="currentColor" stroke-width="4.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  warn: `<path d="M16 4.2 29 27H3z" fill="currentColor" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/><path d="M16 12.2v6.4" stroke="${CUT}" stroke-width="3" stroke-linecap="round"/><circle cx="16" cy="22.8" r="1.9" fill="${CUT}"/>`,
  buoy: `<path d="M16 3.4 24 9 21.4 22H10.6L8 9z" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M9 14.6h14" stroke="${CUT}" stroke-width="2.6" opacity=".6"/><path d="M4 26.4q3-3 6 0t6 0 6 0 6 0" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round"/>`,
  chevL: `<path d="M20.4 5.6 10 16l10.4 10.4" stroke="currentColor" stroke-width="5.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  chevR: `<path d="M11.6 5.6 22 16 11.6 26.4" stroke="currentColor" stroke-width="5.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  brake: `<path d="M11 3.6h10l7.4 7.4v10L21 28.4H11L3.6 21V11z" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><rect x="9.6" y="13.8" width="12.8" height="4.4" rx="2.2" fill="${CUT}"/>`,
  bolt: `<path d="M18.8 2.6 7 18.4h7.6L12.6 29.4 25 12.6h-7.8z" fill="currentColor" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>`,
  shield: `<path d="M16 3 5.4 7.2v8.2c0 6.4 4.4 10.8 10.6 13.6 6.2-2.8 10.6-7.2 10.6-13.6V7.2z" fill="currentColor" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M16 9.4v13.4M9.8 15.6h12.4" stroke="${CUT}" stroke-width="2.8" stroke-linecap="round" opacity=".7"/>`,
  bloom: `${petals(5, 7.2, 5.6)}<circle cx="16" cy="16" r="5" fill="${CUT}"/><circle cx="16" cy="16" r="2.4" fill="currentColor"/>`,
  burst: `<path d="${rays(10, 7, 14.6)}" stroke="currentColor" stroke-width="4.4" stroke-linecap="round"/><circle cx="16" cy="16" r="7.4" fill="currentColor"/><circle cx="16" cy="16" r="3.2" fill="${CUT}"/>`,
  heart: `<path d="M16 28.4C5.2 20.4 3 13.6 3 9.8A6.6 6.6 0 0 1 16 7.4a6.6 6.6 0 0 1 13 2.4c0 3.8-2.2 10.6-13 18.6z" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>`,
  aim: `<circle cx="16" cy="16" r="8.6" fill="none" stroke="currentColor" stroke-width="3.4"/><circle cx="16" cy="16" r="2.6" fill="currentColor"/><path d="M16 2.6v6M16 23.4v6M2.6 16h6M23.4 16h6" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"/>`,
  soundOn: `<path d="M4.6 12.2h5.4l8-6.2v20l-8-6.2H4.6z" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M22.4 11.4a7 7 0 0 1 0 9.2M25.6 8a11.4 11.4 0 0 1 0 16" stroke="currentColor" stroke-width="2.8" fill="none" stroke-linecap="round"/>`,
  soundOff: `<path d="M4.6 12.2h5.4l8-6.2v20l-8-6.2H4.6z" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M22.6 12l7 8M29.6 12l-7 8" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>`,
  sunflower: `${petals(8, 9, 4.6)}<circle cx="16" cy="16" r="6.6" fill="${CUT}"/><circle cx="16" cy="16" r="3.6" fill="currentColor" opacity=".55"/>`,
  home: `<path d="M16 4.5 3.8 15.2a1 1 0 0 0 .7 1.7H7V26a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-9.1h2.5a1 1 0 0 0 .7-1.7z" fill="currentColor"/><rect x="13" y="19" width="6" height="9" rx="1.6" fill="${CUT}"/>`,
  restart: `<path d="M26 16a10 10 0 1 1-3.2-7.3" stroke="currentColor" stroke-width="4.2" fill="none" stroke-linecap="round"/><path d="M25.4 3.4v7.2h-7.2" stroke="currentColor" stroke-width="4.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  boat: `<path d="M4 17.6h24l-3.6 7.4a3 3 0 0 1-2.7 1.7H10.3a3 3 0 0 1-2.7-1.7z" fill="currentColor"/><path d="M15 5v10.6M15 5l8 9.6h-8z" fill="currentColor" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>`,
};

type Name = GIcon | keyof typeof MORE;

/** An SVG icon: ours first, then the Fuzzy Crossing set. White (currentColor); little cut-outs take `--tile`. */
export function ico(name: Name, size = 24): SVGSVGElement {
  const body = MORE[name as string];
  if (!body) return gicon(name as GIcon, size);
  const s = document.createElementNS(NS, 'svg');
  s.setAttribute('viewBox', '0 0 32 32'); s.setAttribute('width', String(size)); s.setAttribute('height', String(size)); s.setAttribute('aria-hidden', 'true'); s.setAttribute('class', 'fzx-gi');
  s.innerHTML = body;
  return s;
}
/** The icon as markup, for `innerHTML` templates */
export function icoHtml(name: Name, size = 24): string { return ico(name, size).outerHTML; }

/** a raspberry (or soft / grey) picture tile with an icon on it */
export function tile(name: Name, size = 36, cls = ''): HTMLElement {
  const t = document.createElement('span');
  t.className = `fzx-ic ${cls}`.trim();
  t.style.setProperty('--sz', `${size}px`);
  t.append(ico(name, Math.round(size * 0.62)));
  return t;
}

/** `<kbd>` key caps + a one-word label, e.g. keys(['W','A','S','D'], 'Drive') — the computer controls line */
export interface HintPart { keys?: string[]; text?: string; icon?: Name }
export function hintParts(parts: HintPart[]): DocumentFragment {
  const f = document.createDocumentFragment();
  for (const p of parts) {
    const g = document.createElement('span'); g.className = 'gs-hint-part';
    if (p.icon) g.append(ico(p.icon, 18));
    for (const k of p.keys ?? []) { const kb = document.createElement('kbd'); kb.textContent = k; g.append(kb); }
    if (p.text) { const t = document.createElement('em'); t.textContent = p.text; g.append(t); }
    f.append(g);
  }
  return f;
}
/** fill a hint pill (`.race-hint`) with parts; keeps its class so the games can still fade it */
export function setHint(el: HTMLElement, parts: HintPart[]): void { el.textContent = ''; el.append(hintParts(parts)); }

/** The pause card: a Fuzzy peeking over a raised card, a big Resume and two quiet buttons. Returns the overlay and the three buttons. */
export function pauseCard(o: { restartLabel?: string }): { overlay: HTMLElement; resume: HTMLButtonElement; restart: HTMLButtonElement; quit: HTMLButtonElement } {
  const overlay = document.createElement('div'); overlay.className = 'race-paused'; overlay.hidden = true;
  const box = document.createElement('div'); box.className = 'race-paused-box fzx-card';
  const peek = document.createElement('img'); peek.className = 'gs-peek'; peek.src = friendUrl('f15'); peek.alt = ''; peek.draggable = false;
  const title = document.createElement('h2'); title.textContent = 'Paused';
  const mk = (cls: string, label: string, icon: Name): HTMLButtonElement => { const b = document.createElement('button'); b.type = 'button'; b.className = cls; b.append(ico(icon, 24)); const s = document.createElement('span'); s.textContent = label; b.append(s); return b; };
  const resume = mk('fzx-bigbtn gs-resume', 'Resume', 'play');
  const restart = mk('gs-soft', o.restartLabel ?? 'Restart', 'restart');
  const quit = mk('gs-soft', 'Back to town', 'town');
  const row = document.createElement('div'); row.className = 'gs-pause-row'; row.append(restart, quit);
  box.append(peek, title, resume, row);
  overlay.append(box);
  return { overlay, resume, restart, quit };
}
