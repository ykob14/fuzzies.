/** Small shared pieces for the Fuzzy Crossing screens (so Locker, Pass, Shop and the rest look like one game). */
import { h } from '../../ui/dom';
import { RARITY_COLOR, RARITY_NAME, type Rarity } from '../characters';
import './kit.css';

/** The Crossing Coin: a gold coin with a little fuzzy tuft. Separate from the site's Fuzzies (pink Fuzzy mark). */
export function coinMark(size = 18): SVGSVGElement {
  const NS = 'http://www.w3.org/2000/svg';
  const s = document.createElementNS(NS, 'svg');
  s.setAttribute('viewBox', '0 0 32 32'); s.setAttribute('width', String(size)); s.setAttribute('height', String(size)); s.setAttribute('class', 'fzx-coin'); s.setAttribute('aria-hidden', 'true');
  s.innerHTML = '<circle cx="16" cy="16" r="14" fill="#f5b014"/><circle cx="16" cy="16" r="14" fill="none" stroke="#b97800" stroke-width="2"/><circle cx="16" cy="16" r="10.5" fill="#ffd45a"/><circle cx="16" cy="16" r="10.5" fill="none" stroke="#d99a06" stroke-width="1.4"/><path d="M16 9.5c-3.6 0-6.2 2.6-6.2 6 0 3.4 2.6 6 6.2 6s6.2-2.6 6.2-6c0-3.4-2.6-6-6.2-6z" fill="#fff0b3"/><circle cx="13.6" cy="15" r="1.2" fill="#6b4a00"/><circle cx="18.4" cy="15" r="1.2" fill="#6b4a00"/><path d="M13.8 18.4c.9.9 3.5.9 4.4 0" stroke="#6b4a00" stroke-width="1.2" fill="none" stroke-linecap="round"/>';
  return s;
}
export const coinAmount = (n: number, size = 18): HTMLElement => h('span', { class: 'fzx-amt' }, coinMark(size), h('b', null, n.toLocaleString()));

export function rarityTag(r: Rarity): HTMLElement {
  return h('span', { class: `fzx-rar fzx-rar-${r}`, style: `--rar:${RARITY_COLOR[r]}` }, RARITY_NAME[r]);
}
/** a subtle red/pink "new" dot */
export const newDot = (): HTMLElement => h('i', { class: 'fzx-new', 'aria-label': 'New' });
export const rarityVar = (r: Rarity): string => `--rar:${RARITY_COLOR[r]}`;
