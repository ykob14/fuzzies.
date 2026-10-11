/** Font library. Free fonts plus font packs unlocked with Fuzzies. Loaded from Google Fonts. */

export interface FontPack { id: string; name: string; cost: number; fonts: string[] }

const W = (f: string, w: string) => `family=${f.replace(/ /g, '+')}${w ? `:wght@${w}` : ''}`;

const FONT_DEFS: [string, string][] = [
  ['Inter', '400;500;600;700;800;900'],
  ['DM Sans', '400;500;600;700;800'],
  ['Poppins', '400;500;600;700;800;900'],
  ['Montserrat', '400;500;600;700;800;900'],
  ['Nunito', '400;600;700;800;900'],
  ['Fredoka', '400;500;600;700'],
  ['Space Grotesk', '400;500;700'],
  ['Playfair Display', '400;600;700;800;900'],
  ['Lora', '400;600;700'],
  ['DM Serif Display', ''],
  ['Oswald', '400;500;600;700'],
  ['Bebas Neue', ''],
  ['Archivo Black', ''],
  ['Caveat', '400;700'],
  ['Pacifico', ''],
  ['Dancing Script', '400;700'],
  ['Great Vibes', ''],
  ['Satisfy', ''],
  ['Lobster', ''],
  ['Abril Fatface', ''],
  ['Anton', ''],
  ['Righteous', ''],
  ['Bungee', ''],
  ['Monoton', ''],
  ['Shrikhand', ''],
  ['Permanent Marker', ''],
  ['Press Start 2P', ''],
  ['Rubik Mono One', ''],
  ['Bungee Shade', ''],
  ['Creepster', ''],
  ['Griffy', ''],
  ['Henny Penny', ''],
  ['Mystery Quest', ''],
  ['Jolly Lodger', ''],
  ['Mountains of Christmas', '400;700'],
  ['Cinzel', '400;600;700'],
  ['Cormorant Garamond', '400;600;700'],
  ['Pinyon Script', ''],
  ['Berkshire Swash', ''],
  ['Marcellus', ''],
  ['Frank Ruhl Libre', '400;500;700;900'],
  ['David Libre', '400;500;700'],
  ['Heebo', '400;500;700;800'],
  ['Rubik', '400;500;700;800'],
  ['Suez One', ''],
  ['Secular One', ''],
  ['Bellefair', ''],
  ['Amatic SC', '400;700'],
];

export const FONT_PACKS: FontPack[] = [
  { id: 'fonts-basic', name: 'Essentials', cost: 0, fonts: ['Inter', 'DM Sans', 'Poppins', 'Montserrat', 'Nunito', 'Fredoka', 'Space Grotesk', 'Playfair Display', 'Lora', 'DM Serif Display', 'Oswald', 'Bebas Neue', 'Archivo Black', 'Caveat', 'Pacifico'] },
  { id: 'fonts-script', name: 'Script & Love', cost: 25, fonts: ['Dancing Script', 'Great Vibes', 'Satisfy', 'Lobster'] },
  { id: 'fonts-display', name: 'Big & Bold', cost: 25, fonts: ['Abril Fatface', 'Anton', 'Righteous', 'Bungee', 'Shrikhand'] },
  { id: 'fonts-retro', name: 'Retro Arcade', cost: 35, fonts: ['Monoton', 'Permanent Marker', 'Press Start 2P', 'Rubik Mono One', 'Bungee Shade'] },
  { id: 'fonts-spooky', name: 'Spooky Season', cost: 0, fonts: ['Creepster', 'Griffy', 'Henny Penny', 'Mystery Quest', 'Jolly Lodger'] },
  { id: 'fonts-festive', name: 'Festive & Elegant', cost: 0, fonts: ['Mountains of Christmas', 'Cinzel', 'Cormorant Garamond', 'Pinyon Script', 'Berkshire Swash', 'Marcellus'] },
  { id: 'fonts-hebrew', name: 'Hebrew (עברית)', cost: 0, fonts: ['Frank Ruhl Libre', 'David Libre', 'Heebo', 'Rubik', 'Suez One', 'Secular One', 'Bellefair', 'Amatic SC'] },
];

export const ALL_FONTS = FONT_DEFS.map(([f]) => f);

export function fontPackOf(font: string): FontPack {
  return FONT_PACKS.find((p) => p.fonts.includes(font)) ?? FONT_PACKS[0];
}

export function injectFontCss(): void {
  const href = `https://fonts.googleapis.com/css2?${FONT_DEFS.map(([f, w]) => W(f, w)).join('&')}&display=swap`;
  document.head.append(
    Object.assign(document.createElement('link'), { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' }),
    Object.assign(document.createElement('link'), { rel: 'stylesheet', href }),
  );
}

// ---------- canvas font loading ----------
const requested = new Set<string>();
const fontListeners = new Set<() => void>();
let notifyQueued = false;

/** Ask the browser to load a font face for canvas use; listeners re-render when it arrives. */
export function ensureFont(family: string, weight: number, italic: boolean): void {
  const key = `${italic ? 'italic ' : ''}${weight} 32px "${family}"`;
  if (requested.has(key) || !document.fonts) return;
  requested.add(key);
  document.fonts.load(key).then((faces) => {
    if (!faces.length || notifyQueued) return;
    notifyQueued = true;
    requestAnimationFrame(() => { notifyQueued = false; for (const f of fontListeners) f(); });
  }).catch(() => {});
}

export function onFontsLoaded(fn: () => void): () => void {
  fontListeners.add(fn);
  return () => fontListeners.delete(fn);
}
