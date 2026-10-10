/**
 * Your app icon: pick the Fuzzy's colour and the background for the icon on your phone's home screen
 * or your computer (and the browser tab).
 *
 * How it reaches the installed app: the page draws the icon PNGs and puts them in a cache, and the
 * service worker (public/sw.js) answers requests for icon-*.png / icon.svg from that cache. Phones read
 * the icon when Fuzzies is added to the home screen, so a change shows after re-adding it (Android
 * may also refresh it on its own after a while).
 */
import { accounts } from './account';
import { fuzzySvg } from '../ui/dom';

export interface AppIcon { color: string; bg: string }

/** Fuzzy colours (the same looks as the game's Fuzzies), all free for the icon. */
export const ICON_COLORS: { id: string; name: string; colors: [string, string] }[] = [
  { id: 'classic', name: 'Pink', colors: ['#ff86bb', '#b8235f'] },
  { id: 'berry', name: 'Berry', colors: ['#ff6b8b', '#b0004f'] },
  { id: 'sunny', name: 'Sunny', colors: ['#ffe066', '#ff8c42'] },
  { id: 'gold', name: 'Golden', colors: ['#fff3b0', '#e0a100'] },
  { id: 'mint', name: 'Minty', colors: ['#7dffcf', '#22b5a0'] },
  { id: 'ocean', name: 'Ocean', colors: ['#7ad7ff', '#3a5bff'] },
  { id: 'galaxy', name: 'Galaxy', colors: ['#c77dff', '#240046'] },
  { id: 'snow', name: 'Snowy', colors: ['#ffffff', '#b9c2cf'] },
];

export const ICON_BGS: { id: string; name: string; color: string }[] = [
  { id: 'ink', name: 'Ink', color: '#18171c' },
  { id: 'cream', name: 'Cream', color: '#f6f5f2' },
  { id: 'raspberry', name: 'Raspberry', color: '#d6336c' },
  { id: 'white', name: 'White', color: '#ffffff' },
  { id: 'sky', name: 'Sky', color: '#cfe8ff' },
  { id: 'night', name: 'Night', color: '#1d2b53' },
];

export const DEFAULT_ICON: AppIcon = { color: 'classic', bg: 'ink' };
const ICON_CACHE = 'fuzzies-icon';

const colorsOf = (c: AppIcon) => (ICON_COLORS.find((x) => x.id === c.color) ?? ICON_COLORS[0]).colors;
const bgOf = (c: AppIcon) => (ICON_BGS.find((x) => x.id === c.bg) ?? ICON_BGS[0]).color;
const isDefault = (c: AppIcon) => c.color === DEFAULT_ICON.color && c.bg === DEFAULT_ICON.bg;

/**
 * The icon as SVG. `rounded`: corners for browser tabs/desktops; otherwise a full square for phones,
 * which cut their own shape (the Fuzzy stays inside the middle 80% so nothing gets clipped).
 */
export function iconSvg(c: AppIcon, rounded = true): string {
  const bg = bgOf(c);
  const fuzzy = fuzzySvg(colorsOf(c), 'open', 'ic').replace('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" aria-hidden="true">',
    '<svg x="96" y="78" width="320" height="320" viewBox="0 0 100 100">');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" ${rounded ? 'rx="112"' : ''} fill="${bg}"/>`
    + `<ellipse cx="256" cy="420" rx="92" ry="16" fill="#000" opacity="${bg === '#18171c' || bg === '#1d2b53' ? 0.45 : 0.14}"/>${fuzzy}</svg>`;
}

const svgUrl = (svg: string) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);

/** Draw the icon to a PNG of the given size. */
export function iconPng(c: AppIcon, size: number, rounded: boolean): Promise<Blob> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      const cv = document.createElement('canvas');
      cv.width = cv.height = size;
      cv.getContext('2d')!.drawImage(img, 0, 0, size, size);
      cv.toBlob((b) => (b ? res(b) : rej(new Error('Could not draw the icon'))), 'image/png');
    };
    img.onerror = () => rej(new Error('Could not draw the icon'));
    img.src = svgUrl(iconSvg(c, rounded));
  });
}

const blobUrl = (b: Blob) => new Promise<string>((res) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.readAsDataURL(b); });

function setLink(rel: string, href: string, type?: string): void {
  let l = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!l) { l = document.createElement('link'); l.rel = rel; document.head.append(l); }
  l.href = href;
  if (type) l.type = type;
}

let applied = '';

/** Whether a background needs light text on top. */
const isDark = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255 < 0.55;
};

/** Remember the icon's look for the launch screen in index.html, which runs before the app loads. */
function rememberLook(c: AppIcon): void {
  const colors = colorsOf(c), bg = bgOf(c);
  try {
    localStorage.setItem('fz.look', JSON.stringify({
      color: c.color, bg, c: colors[0], dark: isDark(bg),
      open: svgUrl(fuzzySvg(colors, 'open', 'sp')), wink: svgUrl(fuzzySvg(colors, 'wink', 'sp')),
    }));
  } catch { /* storage full or blocked: the launch screen uses its defaults */ }
}

/** Use this icon for the browser tab, "Add to Home Screen" and the installed app. */
export async function applyAppIcon(c: AppIcon = accounts.current?.settings.appIcon ?? DEFAULT_ICON): Promise<void> {
  const key = `${c.color}/${c.bg}`;
  if (key === applied) return;
  applied = key;
  rememberLook(c);
  if (isDefault(c)) {
    setLink('icon', './icon.svg', 'image/svg+xml');
    setLink('apple-touch-icon', './apple-touch-icon.png');
    if ('caches' in self) await caches.delete(ICON_CACHE).catch(() => undefined);
    return;
  }
  setLink('icon', svgUrl(iconSvg(c)), 'image/svg+xml');
  try {
    const apple = await iconPng(c, 180, false);
    if (applied !== key) return;
    setLink('apple-touch-icon', await blobUrl(apple));
    if (!('caches' in self)) return;
    const cache = await caches.open(ICON_CACHE);
    const png = (b: Blob) => new Response(b, { headers: { 'Content-Type': 'image/png' } });
    await Promise.all([
      cache.put('./icon.svg', new Response(iconSvg(c), { headers: { 'Content-Type': 'image/svg+xml' } })),
      cache.put('./icon-192.png', png(await iconPng(c, 192, true))),
      cache.put('./icon-512.png', png(await iconPng(c, 512, true))),
      cache.put('./icon-maskable-512.png', png(await iconPng(c, 512, false))),
      cache.put('./apple-touch-icon.png', png(apple)),
    ]);
  } catch (e) { console.warn('App icon:', e); }
}

/** Keep the icon in step with whoever is signed in. */
export function watchAppIcon(): void {
  void applyAppIcon();
  accounts.onChange(() => { void applyAppIcon(); });
}
