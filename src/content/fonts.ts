/** Font library. Every font is free (owner, 2026-10-15); packs only group them. Loaded from Google Fonts. */

export interface FontPack { id: string; name: string; cost: number; fonts: string[] }

const W = (f: string, w: string) => `family=${f.replace(/ /g, '+')}${w ? `:wght@${w}` : ''}`;

/** How a font looks in Latin text ('-' = made for another script; shown only in that script's group). */
export type FontStyle = 'sans' | 'serif' | 'display' | 'script' | '-';
export type FontScript = 'hebrew' | 'arabic' | 'indic' | 'chinese';

const FONT_DEFS: [string, string, FontStyle, FontScript?][] = [
  ['Inter', '400;500;600;700;800;900', 'sans'],
  ['DM Sans', '400;500;600;700;800', 'sans'],
  ['Poppins', '400;500;600;700;800;900', 'sans'],
  ['Montserrat', '400;500;600;700;800;900', 'sans'],
  ['Nunito', '400;600;700;800;900', 'sans'],
  ['Fredoka', '400;500;600;700', 'sans'],
  ['Space Grotesk', '400;500;700', 'sans'],
  ['Playfair Display', '400;600;700;800;900', 'serif'],
  ['Lora', '400;600;700', 'serif'],
  ['DM Serif Display', '', 'serif'],
  ['Oswald', '400;500;600;700', 'sans'],
  ['Bebas Neue', '', 'display'],
  ['Archivo Black', '', 'display'],
  ['Caveat', '400;700', 'script'],
  ['Pacifico', '', 'script'],
  ['Dancing Script', '400;700', 'script'],
  ['Great Vibes', '', 'script'],
  ['Satisfy', '', 'script'],
  ['Lobster', '', 'script'],
  ['Abril Fatface', '', 'display'],
  ['Anton', '', 'display'],
  ['Righteous', '', 'display'],
  ['Bungee', '', 'display'],
  ['Monoton', '', 'display'],
  ['Shrikhand', '', 'display'],
  ['Permanent Marker', '', 'script'],
  ['Press Start 2P', '', 'display'],
  ['Rubik Mono One', '', 'display'],
  ['Bungee Shade', '', 'display'],
  ['Creepster', '', 'display'],
  ['Griffy', '', 'display'],
  ['Henny Penny', '', 'display'],
  ['Mystery Quest', '', 'display'],
  ['Jolly Lodger', '', 'display'],
  ['Mountains of Christmas', '400;700', 'display'],
  ['Cinzel', '400;600;700', 'serif'],
  ['Cormorant Garamond', '400;600;700', 'serif'],
  ['Pinyon Script', '', 'script'],
  ['Berkshire Swash', '', 'script'],
  ['Marcellus', '', 'serif'],
  ['Frank Ruhl Libre', '400;500;700;900', 'serif', 'hebrew'],
  ['David Libre', '400;500;700', 'serif', 'hebrew'],
  ['Heebo', '400;500;700;800', 'sans', 'hebrew'],
  ['Rubik', '400;500;700;800', 'sans', 'hebrew'],
  ['Suez One', '', 'serif', 'hebrew'],
  ['Secular One', '', 'sans', 'hebrew'],
  ['Bellefair', '', 'serif', 'hebrew'],
  ['Amatic SC', '400;700', 'script', 'hebrew'],
  ['Amiri', '400;700', 'serif', 'arabic'],
  ['Aref Ruqaa', '400;700', 'serif', 'arabic'],
  ['Reem Kufi', '400;500;600;700', 'sans', 'arabic'],
  ['Cairo', '400;600;700;800;900', 'sans', 'arabic'],
  ['Noto Naskh Arabic', '400;700', '-', 'arabic'],
  ['Vazirmatn', '400;500;700;800', 'sans', 'arabic'],
  ['Yatra One', '', '-', 'indic'],
  ['Tiro Devanagari Hindi', '', '-', 'indic'],
  ['Rozha One', '', '-', 'indic'],
  ['Mukta', '400;500;600;700;800', 'sans', 'indic'],
  ['Baloo 2', '400;500;600;700;800', 'display', 'indic'],
  ['Noto Sans Devanagari', '400;600;700', '-', 'indic'],
  ['Baloo Paaji 2', '400;600;700;800', '-', 'indic'],
  ['Manjari', '400;700', '-', 'indic'],
  ['Noto Serif SC', '400;600;700;900', '-', 'chinese'],
  ['Ma Shan Zheng', '', '-', 'chinese'],
  ['Quicksand', '400;500;600;700', 'sans'],
  ['Josefin Sans', '400;600;700', 'sans'],
  ['Parisienne', '', 'script'],
  ['Sacramento', '', 'script'],
];

export const FONT_PACKS: FontPack[] = [
  { id: 'fonts-basic', name: 'Essentials', cost: 0, fonts: ['Inter', 'DM Sans', 'Poppins', 'Montserrat', 'Nunito', 'Fredoka', 'Space Grotesk', 'Playfair Display', 'Lora', 'DM Serif Display', 'Oswald', 'Bebas Neue', 'Archivo Black', 'Caveat', 'Pacifico'] },
  { id: 'fonts-script', name: 'Script & Love', cost: 0, fonts: ['Dancing Script', 'Great Vibes', 'Satisfy', 'Lobster'] },
  { id: 'fonts-display', name: 'Big & Bold', cost: 0, fonts: ['Abril Fatface', 'Anton', 'Righteous', 'Bungee', 'Shrikhand'] },
  { id: 'fonts-retro', name: 'Retro Arcade', cost: 0, fonts: ['Monoton', 'Permanent Marker', 'Press Start 2P', 'Rubik Mono One', 'Bungee Shade'] },
  { id: 'fonts-spooky', name: 'Spooky Season', cost: 0, fonts: ['Creepster', 'Griffy', 'Henny Penny', 'Mystery Quest', 'Jolly Lodger'] },
  { id: 'fonts-festive', name: 'Festive & Elegant', cost: 0, fonts: ['Mountains of Christmas', 'Cinzel', 'Cormorant Garamond', 'Pinyon Script', 'Berkshire Swash', 'Marcellus'] },
  { id: 'fonts-hebrew', name: 'Hebrew (עברית)', cost: 0, fonts: ['Frank Ruhl Libre', 'David Libre', 'Heebo', 'Rubik', 'Suez One', 'Secular One', 'Bellefair', 'Amatic SC'] },
  { id: 'fonts-arabic', name: 'Arabic & Persian (العربية)', cost: 0, fonts: ['Amiri', 'Aref Ruqaa', 'Reem Kufi', 'Cairo', 'Noto Naskh Arabic', 'Vazirmatn'] },
  { id: 'fonts-indic', name: 'Indian scripts (हिन्दी)', cost: 0, fonts: ['Yatra One', 'Tiro Devanagari Hindi', 'Rozha One', 'Mukta', 'Baloo 2', 'Noto Sans Devanagari', 'Baloo Paaji 2', 'Manjari'] },
  { id: 'fonts-chinese', name: 'Chinese (中文)', cost: 0, fonts: ['Noto Serif SC', 'Ma Shan Zheng'] },
  { id: 'fonts-soft', name: 'Soft & Sweet', cost: 0, fonts: ['Quicksand', 'Josefin Sans', 'Parisienne', 'Sacramento'] },
];

export const ALL_FONTS = FONT_DEFS.map(([f]) => f);

/** The font picker's groups, in order: each lists fonts by their look, then the other-script groups. */
export const FONT_GROUPS: { id: string; label: string; sample?: string; fonts: string[] }[] = [
  { id: 'sans', label: 'Sans serif', fonts: FONT_DEFS.filter((d) => d[2] === 'sans').map((d) => d[0]) },
  { id: 'serif', label: 'Serif', fonts: FONT_DEFS.filter((d) => d[2] === 'serif').map((d) => d[0]) },
  { id: 'display', label: 'Display', fonts: FONT_DEFS.filter((d) => d[2] === 'display').map((d) => d[0]) },
  { id: 'script', label: 'Script & handwriting', fonts: FONT_DEFS.filter((d) => d[2] === 'script').map((d) => d[0]) },
  ...([['hebrew', 'Hebrew · עברית', 'שלום'], ['arabic', 'Arabic & Persian · العربية', 'مرحبا'], ['indic', 'Indian scripts · हिन्दी', 'नमस्ते'], ['chinese', 'Chinese · 中文', '你好']] as const)
    .map(([id, label, sample]) => ({ id, label, sample, fonts: FONT_DEFS.filter((d) => d[3] === id).map((d) => d[0]) })),
];
/** Fonts made for another script (their Latin letters, if any, are not the point). */
export const isScriptOnly = (font: string) => FONT_DEFS.find((x) => x[0] === font)?.[2] === '-';
/** A short word in the font's own script, to preview fonts made for other scripts (Latin fonts show their name). */
const SAMPLES: Record<string, string> = { Manjari: 'നമസ്കാരം', 'Baloo Paaji 2': 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ' };
export function fontSample(font: string): string | undefined {
  const d = FONT_DEFS.find((x) => x[0] === font);
  if (!d?.[3]) return undefined;
  return SAMPLES[font] ?? FONT_GROUPS.find((g) => g.id === d[3])?.sample;
}

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
