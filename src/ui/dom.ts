/** Tiny DOM helpers, icons and shared widgets (toast, modal, menus). */
import { mascot } from './mascot';

type Child = Node | string | number | null | undefined | false;
type Attrs = Record<string, unknown> & { class?: string; style?: string };

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs | null = null, ...children: (Child | Child[])[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v === undefined || v === null || v === false) continue;
      if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v as EventListener);
      else if (k === 'class') el.className = String(v);
      else if (k === 'style') el.setAttribute('style', String(v));
      else if (k === 'html') el.innerHTML = String(v);
      else if (k === 'value') (el as HTMLInputElement).value = String(v);
      else if (v === true) el.setAttribute(k, '');
      else el.setAttribute(k, String(v));
    }
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

export const ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  gamepad: '<rect x="2" y="7" width="20" height="11" rx="5"/><path d="M7 11v3M5.5 12.5h3"/><circle cx="15.5" cy="11.5" r="1"/><circle cx="18" cy="14" r="1"/>',
  gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M5 12v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8"/><path d="M12 8S10.5 3 8 3a2.5 2.5 0 0 0 0 5M12 8s1.5-5 4-5a2.5 2.5 0 0 1 0 5"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  chevL: '<path d="M15 6l-6 6 6 6"/>',
  chevR: '<path d="M9 6l6 6-6 6"/>',
  back: '<path d="M15 18l-6-6 6-6"/>',
  close: '<path d="M18 6 6 18M6 6l12 12"/>',
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
  redo: '<path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
  share: '<path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7M16 6l-4-4-4 4M12 2v13"/>',
  text: '<path d="M4 7V5h16v2M9 19h6M12 5v14"/>',
  shapes: '<path d="M8.3 10a.7.7 0 0 1-.6-1L11.4 3a.7.7 0 0 1 1.2 0L16.3 9a.7.7 0 0 1-.6 1z"/><rect x="3" y="14" width="7" height="7" rx="1"/><circle cx="17.5" cy="17.5" r="3.5"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',
  upload: '<path d="M12 15V3M7 8l5-5 5 5M5 21h14"/>',
  brush: '<path d="m9.1 11.5 6.8-6.8a2.1 2.1 0 1 1 3 3l-6.8 6.8"/><path d="M7 14c-1.7 0-3 1.3-3 3 0 1.3-1 2-2 2 1 1.5 3 2 4.5 2a4.5 4.5 0 0 0 4.5-4.5c0-1.4-1.3-2.5-3-2.5z"/>',
  palette: '<circle cx="13.5" cy="6.5" r="1"/><circle cx="17.5" cy="10.5" r="1"/><circle cx="8.5" cy="7.5" r="1"/><circle cx="6.5" cy="12.5" r="1"/><path d="M12 2a10 10 0 0 0 0 20 1.7 1.7 0 0 0 1.7-1.7c0-.4-.2-.8-.4-1.1a1.6 1.6 0 0 1 1.2-2.7h2A5.6 5.6 0 0 0 22 11c0-5-4.5-9-10-9z"/>',
  layers: '<path d="m12 2 10 5-10 5L2 7z"/><path d="m2 17 10 5 10-5M2 12l10 5 10-5"/>',
  sticker: '<path d="M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h9.5L21 14.5V5a2 2 0 0 0-2-2z"/><path d="M14 21v-5a2 2 0 0 1 2-2h5"/><path d="M8 13s1.5 2 4 2 4-2 4-2"/><path d="M9 9h.01M15 9h.01"/>',
  sparkles: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 3v4M17 5h4M5 17v4M3 19h4"/>',
  trash: '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>',
  copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  unlock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.8-1"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="M9.9 4.2A10 10 0 0 1 12 4c6.5 0 10 8 10 8a17 17 0 0 1-2.2 3.2M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a10 10 0 0 0 5.4-1.6M2 2l20 20"/><path d="M14.1 14.1a3 3 0 0 1-4.2-4.2"/>',
  up: '<path d="m18 15-6-6-6 6"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  front: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M4 16V5a1 1 0 0 1 1-1h11"/>',
  flipH: '<path d="M12 3v18M8 7l-5 5 5 5V7zM16 7l5 5-5 5V7z"/>',
  flipV: '<path d="M3 12h18M7 8l5-5 5 5H7zM7 16l5 5 5-5H7z"/>',
  alignL: '<path d="M4 3v18M8 7h12v4H8zM8 14h7v4H8z"/>',
  alignC: '<path d="M12 3v18M6 7h12v4H6zM8.5 14h7v4h-7z"/>',
  alignR: '<path d="M20 3v18M4 7h12v4H4zM9 14h7v4H9z"/>',
  alignT: '<path d="M3 4h18M7 8v12h4V8zM14 8v7h4V8z"/>',
  alignM: '<path d="M3 12h18M7 6v12h4V6zM14 8.5v7h4v-7z"/>',
  alignB: '<path d="M3 20h18M7 4v12h4V4zM14 9v7h4V9z"/>',
  zoomIn: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5M11 8v6M8 11h6"/>',
  zoomOut: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5M8 11h6"/>',
  fit: '<path d="M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3"/>',
  more: '<circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',
  pages: '<rect x="7" y="3" width="13" height="16" rx="2"/><path d="M4 7v12a2 2 0 0 0 2 2h10"/>',
  play: '<path d="M7 4v16l13-8z"/>',
  pause: '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>',
  trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
  heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21.2l8.8-8.8a5.5 5.5 0 0 0 0-7.8z"/>',
  wand: '<path d="m15 4 1 2 2 1-2 1-1 2-1-2-2-1 2-1zM3 21l12-12M19 13l.5 1 1 .5-1 .5-.5 1-.5-1-1-.5 1-.5z"/>',
  crop: '<path d="M6 2v14a2 2 0 0 0 2 2h14M18 22V8a2 2 0 0 0-2-2H2"/>',
  rotate: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
  hand: '<path d="M18 11V6a2 2 0 0 0-4 0v5M14 10V4a2 2 0 0 0-4 0v6M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.9-6-2.4l-3.6-3.6a2 2 0 0 1 2.8-2.8L7 15"/>',
  eraser: '<path d="m7 21-4.3-4.3a1 1 0 0 1 0-1.4l10-10a1 1 0 0 1 1.4 0l5.6 5.6a1 1 0 0 1 0 1.4L13 19"/><path d="M22 21H7M5 11l9 9"/>',
  star: '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>',
  bolt: '<path d="M13 2 3 14h9l-1 8 10-12h-9z"/>',
  clipboard: '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>',
  phone: '<rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M11 18h2"/>',
  monitor: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
  sound: '<path d="M11 5 6 9H2v6h4l5 4zM15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/>',
  mute: '<path d="M11 5 6 9H2v6h4l5 4zM22 9l-6 6M16 9l6 6"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  group: '<rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/><path d="M11 7h4a2 2 0 0 1 2 2v4"/>',
  town: '<path d="M3 21V11l5-4 5 4v10"/><path d="M13 21v-6l4-3 4 3v6M2 21h20M7 21v-4h2v4M8 7V3l3 1.5L8 6"/>',
  cloud: '<path d="M17.5 19H7a5 5 0 1 1 1.1-9.9A6 6 0 0 1 19.5 11 4 4 0 0 1 17.5 19z"/>',
  wallet: '<path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3"/><rect x="3" y="8" width="18" height="12" rx="2.5"/><path d="M16 14h2"/>',
};
export type IconName = keyof typeof ICONS;

export function icon(name: IconName, size = 20): SVGSVGElement {
  const wrap = document.createElement('div');
  wrap.innerHTML = `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;
  return wrap.firstElementChild as SVGSVGElement;
}

/** Flat Fuzzy drawing as an SVG string (token icon, and the mascot's no-3D fallback). */
export function fuzzySvg(colors: [string, string] = ['#ff8fbf', '#c8326e'], face: 'open' | 'wink' | 'blink' | 'giggle' = 'open', id = 'fz' + Math.random().toString(36).slice(2, 7)): string {
  const spikes: string[] = [];
  const n = 26;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r1 = 40, r2 = 47 + (i % 2) * 2;
    const a2 = a + Math.PI / n;
    spikes.push(`${50 + Math.cos(a) * r1},${50 + Math.sin(a) * r1} ${50 + Math.cos(a2) * r2},${50 + Math.sin(a2) * r2}`);
  }
  const eye = (cx: number, closed: boolean, happy: boolean) => happy
    ? `<path d="M${cx - 7} ${47} q7 -9 14 0" stroke="#1c1830" stroke-width="3.4" fill="none" stroke-linecap="round"/>`
    : closed
      ? `<path d="M${cx - 6.5} 47 h13" stroke="#1c1830" stroke-width="3" stroke-linecap="round"/>`
      : `<ellipse cx="${cx}" cy="46" rx="6.5" ry="8" fill="#fff"/><circle cx="${cx + 1.5}" cy="48" r="3.6" fill="#1c1830"/><circle cx="${cx + 0.2}" cy="46.2" r="1.2" fill="#fff"/>`;
  const smile = face === 'giggle' ? 'M39 58q11 13 22 0z' : face === 'wink' ? 'M41 60q9 9 18 0' : 'M43 61q7 6 14 0';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" aria-hidden="true"><defs><radialGradient id="${id}" cx="0.38" cy="0.32" r="0.75"><stop offset="0" stop-color="${colors[0]}"/><stop offset="1" stop-color="${colors[1]}"/></radialGradient></defs><polygon points="${spikes.join(' ')}" fill="url(#${id})"/><circle cx="50" cy="50" r="41" fill="url(#${id})"/>${eye(38, face === 'blink', face === 'giggle')}${eye(62, face !== 'open', face === 'wink' || face === 'giggle')}<path d="${smile}" stroke="#1c1830" stroke-width="3.2" fill="${face === 'giggle' ? '#7a1f3d' : 'none'}" stroke-linecap="round" stroke-linejoin="round"/><circle cx="30" cy="59" r="4.5" fill="#fff" opacity=".35"/><circle cx="70" cy="59" r="4.5" fill="#fff" opacity=".35"/></svg>`;
}

/** The realistic furry 3D Fuzzy (a picture of the game model), once it has been rendered — see ui/mascot.ts. */
let markSrc = '';
try { markSrc = (JSON.parse(localStorage.getItem('fz.splash.frames') || 'null') as { open?: string } | null)?.open ?? ''; } catch { /* none yet */ }

/** Fuzzy token mark (the currency icon): the fluffy 3D Fuzzy, or a flat drawing until that picture exists. */
export function fuzzyMark(size = 32, colors: [string, string] = ['#ff8fbf', '#c8326e']): SVGSVGElement | HTMLImageElement {
  if (markSrc && colors[0] === '#ff8fbf') return h('img', { class: 'fz-mark real', src: markSrc, alt: '', width: String(size), height: String(size), draggable: 'false' });
  const wrap = document.createElement('div');
  wrap.innerHTML = fuzzySvg(colors);
  const svg = wrap.firstElementChild as SVGSVGElement;
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.classList.add('fz-mark');
  return svg;
}

/** Swap every flat Fuzzy mark on screen (and all future ones) for the 3D picture. */
export function useRealMarks(src: string): void {
  markSrc = src;
  for (const svg of document.querySelectorAll<SVGSVGElement>('svg.fz-mark')) {
    const size = svg.getAttribute('width') || '32';
    svg.replaceWith(h('img', { class: 'fz-mark real', src, alt: '', width: size, height: size, draggable: 'false' }));
  }
}

export const QUOTE = 'Dream it fuzzy. Make it sharp.';

export function logo(size: 'sm' | 'lg' = 'sm', withQuote = true): HTMLElement {
  return h('div', { class: `logo logo-${size}` },
    mascot(size === 'lg' ? 64 : 40, { sparkles: true, small: size === 'sm' }),
    h('div', { class: 'logo-text' }, h('div', { class: 'logo-word' }, 'fuzzies'), withQuote ? h('div', { class: 'logo-quote' }, QUOTE) : null));
}

export function btn(label: string | Node | null, opts: { icon?: IconName; kind?: 'primary' | 'ghost' | 'soft' | 'danger' | 'plain'; onClick?: (e: MouseEvent) => void; title?: string; size?: 'sm' | 'md' | 'lg'; class?: string } = {}): HTMLButtonElement {
  const b = h('button', { class: `btn btn-${opts.kind ?? 'soft'} btn-${opts.size ?? 'md'} ${label === null ? 'btn-icon' : ''} ${opts.class ?? ''}`, title: opts.title, 'aria-label': opts.title, type: 'button' },
    opts.icon ? icon(opts.icon, opts.size === 'sm' ? 16 : 18) : null, label === null ? null : typeof label === 'string' ? h('span', null, label) : label);
  if (opts.onClick) b.addEventListener('click', opts.onClick);
  return b;
}

export function fuzzyCount(n: number): HTMLElement {
  return h('span', { class: 'fz-count' }, fuzzyMark(18), h('b', null, String(n)));
}

// ---------- toast ----------
let toastWrap: HTMLElement | null = null;
export function toast(msg: string, kind: 'info' | 'good' | 'bad' | 'fuzzy' = 'info', ms = 2600): void {
  if (!toastWrap) { toastWrap = h('div', { class: 'toasts', role: 'status', 'aria-live': 'polite' }); document.body.append(toastWrap); }
  const t = h('div', { class: `toast toast-${kind}` }, kind === 'fuzzy' ? fuzzyMark(20) : null, h('span', null, msg));
  toastWrap.append(t);
  requestAnimationFrame(() => t.classList.add('in'));
  setTimeout(() => { t.classList.remove('in'); setTimeout(() => t.remove(), 300); }, ms);
}

// ---------- modal ----------
export interface ModalHandle { el: HTMLElement; close(): void }
export function modal(title: string, body: Node, opts: { actions?: HTMLElement[]; wide?: boolean; onClose?: () => void } = {}): ModalHandle {
  const backdrop = h('div', { class: 'modal-backdrop' });
  const close = () => {
    backdrop.classList.remove('in');
    removeEventListener('keydown', onKey);
    setTimeout(() => backdrop.remove(), 200);
    opts.onClose?.();
  };
  // a window marked busy (e.g. waiting for a wallet) doesn't close on Escape / outside taps
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && box.dataset.busy !== 'true') close(); };
  const box = h('div', { class: `modal ${opts.wide ? 'modal-wide' : ''}`, role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
    h('div', { class: 'modal-head' }, h('h3', null, title), btn(null, { icon: 'close', kind: 'plain', title: 'Close', onClick: close })),
    h('div', { class: 'modal-body' }, body),
    opts.actions?.length ? h('div', { class: 'modal-actions' }, ...opts.actions) : null);
  backdrop.append(box);
  backdrop.addEventListener('pointerdown', (e) => { if (e.target === backdrop && box.dataset.busy !== 'true') close(); });
  addEventListener('keydown', onKey);
  document.body.append(backdrop);
  requestAnimationFrame(() => backdrop.classList.add('in'));
  return { el: box, close };
}

export function confirmDialog(title: string, message: string, okLabel = 'Delete', danger = true): Promise<boolean> {
  return new Promise((res) => {
    let done = false;
    const finish = (v: boolean) => { if (!done) { done = true; res(v); } m.close(); };
    const m = modal(title, h('p', { class: 'muted' }, message), {
      actions: [btn('Cancel', { kind: 'ghost', onClick: () => finish(false) }), btn(okLabel, { kind: danger ? 'danger' : 'primary', onClick: () => finish(true) })],
      onClose: () => { if (!done) { done = true; res(false); } },
    });
  });
}

export function promptDialog(title: string, value: string, okLabel = 'Save'): Promise<string | null> {
  return new Promise((res) => {
    let done = false;
    const input = h('input', { class: 'input', value, type: 'text' });
    const finish = (v: string | null) => { if (!done) { done = true; res(v); } m.close(); };
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') finish(input.value); });
    const m = modal(title, input, {
      actions: [btn('Cancel', { kind: 'ghost', onClick: () => finish(null) }), btn(okLabel, { kind: 'primary', onClick: () => finish(input.value) })],
      onClose: () => { if (!done) { done = true; res(null); } },
    });
    setTimeout(() => { input.focus(); input.select(); }, 50);
  });
}

/** Small popover menu anchored to an element. */
export function popMenu(anchor: HTMLElement, items: ({ label: string; icon?: IconName; danger?: boolean; onClick: () => void } | null)[]): void {
  document.querySelector('.popmenu')?.remove();
  const menu = h('div', { class: 'popmenu', role: 'menu' });
  for (const it of items) {
    if (!it) { menu.append(h('div', { class: 'popmenu-sep' })); continue; }
    const b = h('button', { class: `popmenu-item ${it.danger ? 'danger' : ''}`, role: 'menuitem', type: 'button' }, it.icon ? icon(it.icon, 16) : null, h('span', null, it.label));
    b.addEventListener('click', (e) => { e.stopPropagation(); menu.remove(); it.onClick(); });
    menu.append(b);
  }
  document.body.append(menu);
  const r = anchor.getBoundingClientRect();
  const mw = menu.offsetWidth, mh = menu.offsetHeight;
  let x = r.right - mw, y = r.bottom + 6;
  if (x < 8) x = Math.min(r.left, innerWidth - mw - 8);
  if (y + mh > innerHeight - 8) y = r.top - mh - 6;
  menu.style.left = `${Math.max(8, x)}px`;
  menu.style.top = `${Math.max(8, y)}px`;
  const off = (e: Event) => { if (!menu.contains(e.target as Node)) { menu.remove(); removeEventListener('pointerdown', off, true); } };
  setTimeout(() => addEventListener('pointerdown', off, true));
}

export function avatarEl(a: { avatar: { emoji: string; color: string; image?: string }; name: string }, size = 36): HTMLElement {
  const el = h('div', { class: 'avatar', style: `width:${size}px;height:${size}px;background:${a.avatar.color};font-size:${size * 0.55}px`, title: a.name });
  if (a.avatar.image) el.append(h('img', { src: a.avatar.image, alt: '' }));
  else el.textContent = a.avatar.emoji;
  return el;
}

export function pickFile(accept: string, multiple = false): Promise<File[]> {
  return new Promise((res) => {
    const input = h('input', { type: 'file', accept, style: 'display:none' });
    if (multiple) input.multiple = true;
    input.addEventListener('change', () => { res([...(input.files ?? [])]); input.remove(); });
    document.body.append(input);
    input.click();
  });
}
