/**
 * Colour palettes and font pairings for the template library. A palette is a small set of roles
 * (background, surface, primary, secondary, accent, ink…) so every layout can use any palette and still look intentional.
 * `families` feed the colour filter in the gallery; `mood` feeds the style filter.
 */

export interface Palette {
  id: string;
  label: string;
  families: string[]; // colour filter words
  dark: boolean;
  bg: string;        // page background
  surface: string;   // cards/panels on the background
  primary: string;   // main brand colour (big shapes, title highlights)
  secondary: string; // second colour (blocks, stripes)
  accent: string;    // small pops (badges, underlines)
  ink: string;       // text on bg/surface
  onPrimary: string; // text on primary/secondary
  muted: string;     // secondary text
}

const P = (id: string, label: string, families: string[], dark: boolean, bg: string, surface: string, primary: string, secondary: string, accent: string, ink: string, onPrimary: string, muted: string): Palette =>
  ({ id, label, families, dark, bg, surface, primary, secondary, accent, ink, onPrimary, muted });

export const PALETTES: Palette[] = [
  P('court', 'Court', ['orange', 'blue'], false, '#f4ece1', '#ffffff', '#e8702a', '#1b2a41', '#ffc145', '#1b2a41', '#ffffff', '#6b6f7a'),
  P('night', 'Night Game', ['blue', 'black', 'yellow'], true, '#0e1430', '#1a2250', '#ffcb2f', '#3a7bff', '#ff5470', '#ffffff', '#0e1430', '#a7b0d8'),
  P('electric', 'Electric', ['blue', 'green'], false, '#eef3ff', '#ffffff', '#2b59ff', '#00c2a8', '#ffde3b', '#0b1640', '#ffffff', '#5a6488'),
  P('ice', 'Ice', ['blue', 'white'], false, '#eaf5fb', '#ffffff', '#0a6ebd', '#9fd8f2', '#e63946', '#08324f', '#ffffff', '#5b7a8f'),
  P('classic', 'Varsity', ['red', 'blue', 'white'], false, '#f7f4ec', '#ffffff', '#c1272d', '#14213d', '#f2b632', '#14213d', '#ffffff', '#6d6a63'),
  P('pitch', 'Pitch', ['green', 'white'], false, '#eef6ec', '#ffffff', '#1f8a4c', '#0f3d2e', '#f5d547', '#0f2a20', '#ffffff', '#55705f'),
  P('fire', 'Fire', ['red', 'black', 'orange'], true, '#120d0d', '#221616', '#ff3d2e', '#ff9f1c', '#ffe066', '#ffffff', '#ffffff', '#c9a6a1'),
  P('sunset', 'Sunset', ['orange', 'pink', 'purple'], false, '#fff1e6', '#ffffff', '#ff6b4a', '#7b2d8b', '#ffc93c', '#3b1440', '#ffffff', '#8a6670'),
  P('beach', 'Beach', ['teal', 'yellow'], false, '#fff8e8', '#ffffff', '#00a6a6', '#ffb703', '#ff6f59', '#16323a', '#ffffff', '#6f7f7c'),
  P('court-green', 'Clubhouse', ['green', 'white'], false, '#f5f7ef', '#ffffff', '#2d6a4f', '#b7e4c7', '#d9f241', '#1b3a2c', '#ffffff', '#5e7065'),
  P('minimal', 'Minimal', ['black', 'white', 'grey'], false, '#f5f4f0', '#ffffff', '#18171c', '#d8d4cb', '#e4572e', '#18171c', '#ffffff', '#77736b'),
  P('fresh', 'Fresh', ['green', 'yellow'], false, '#f3fbf4', '#ffffff', '#21a179', '#ffd23f', '#3d5af1', '#103b2c', '#ffffff', '#5b7469'),
  P('ocean', 'Ocean', ['blue', 'teal'], true, '#06283d', '#0b3b58', '#47b5ff', '#1363df', '#dff6ff', '#ffffff', '#06283d', '#9cc3d9'),
  P('zen', 'Zen', ['beige', 'green'], false, '#f4efe6', '#fbf8f2', '#7a8b6f', '#3e4a3d', '#d9a65a', '#2f3a2e', '#ffffff', '#7b7a6e'),
  P('earth', 'Earth', ['brown', 'orange'], false, '#f3e9dc', '#fbf6ef', '#b4562a', '#4a3728', '#e2b33b', '#3a2a20', '#ffffff', '#86705f'),
  P('retro', 'Retro', ['orange', 'teal', 'cream'], false, '#fbf0d9', '#fff9ec', '#f2542d', '#0e9594', '#f5b700', '#2b2118', '#fff9ec', '#7d6b55'),
  P('pastel', 'Pastel', ['pink', 'blue', 'yellow'], false, '#fdf3f7', '#ffffff', '#f49cbb', '#9bc4f0', '#ffe28a', '#4a3a55', '#ffffff', '#8b7c93'),
  P('neon', 'Neon', ['pink', 'blue', 'black'], true, '#0b0618', '#1a1033', '#ff2e97', '#00e5ff', '#d9ff3b', '#ffffff', '#0b0618', '#b9a8dd'),
  P('pop', 'Pop', ['pink', 'yellow', 'blue'], false, '#fff6d6', '#ffffff', '#ff3e8a', '#3a86ff', '#ffbe0b', '#1d1340', '#ffffff', '#6f6683'),
  P('warm', 'Warm', ['orange', 'red', 'cream'], false, '#fbeee4', '#fff8f2', '#d9532b', '#6e2e2e', '#f2b134', '#3d1f1f', '#ffffff', '#8b6c62'),
  P('gold', 'Black & Gold', ['black', 'gold'], true, '#111015', '#1d1b22', '#d4af37', '#f3e3a6', '#ffffff', '#ffffff', '#111015', '#b9ad8c'),
  P('elegant', 'Elegant', ['cream', 'green', 'gold'], false, '#f7f3ec', '#fffdf9', '#2e4a3f', '#c8a96a', '#b0675a', '#2a2a28', '#ffffff', '#86806f'),
  P('blush', 'Blush', ['pink', 'cream'], false, '#fbeeee', '#fffafa', '#c96b7c', '#7a3b4a', '#e8b4a0', '#4a2a33', '#ffffff', '#9a7d84'),
  P('sage', 'Sage', ['green', 'cream'], false, '#eef2ea', '#fbfcf8', '#7c9a7e', '#3c5a46', '#e3b778', '#2d3b30', '#ffffff', '#7a8a7c'),
  P('festive', 'Festive', ['red', 'green', 'gold'], false, '#fbf5ec', '#ffffff', '#b3202c', '#1e5f3b', '#d6a842', '#2b1d17', '#ffffff', '#806b5f'),
  P('spooky', 'Spooky', ['orange', 'black', 'purple'], true, '#120d1c', '#22183a', '#ff7a1a', '#7b3fe4', '#c6ff00', '#ffffff', '#120d1c', '#b0a2cc'),
  P('festive-warm', 'Lanterns', ['red', 'gold'], true, '#5c0b0b', '#7a1010', '#ffcc4d', '#e8392d', '#fff1c1', '#fff6e0', '#5c0b0b', '#f2c9a5'),
  P('harvest', 'Harvest', ['orange', 'brown', 'yellow'], false, '#fbf2e3', '#fffaf0', '#c4571c', '#5e3b1e', '#e9a227', '#3b2412', '#ffffff', '#8a6c52'),
];

export const paletteById = (id: string): Palette => PALETTES.find((p) => p.id === id) ?? PALETTES[0];

/** Font pairings by voice. Only fonts from the free Essentials pack, so every template is usable straight away. */
export interface FontPair { voice: string; display: string; displayWeight: number; body: string; script?: string }
export const FONTS: Record<string, FontPair> = {
  bold: { voice: 'bold', display: 'Bebas Neue', displayWeight: 400, body: 'Montserrat' },
  heavy: { voice: 'heavy', display: 'Archivo Black', displayWeight: 400, body: 'Inter' },
  condensed: { voice: 'condensed', display: 'Oswald', displayWeight: 700, body: 'Inter' },
  modern: { voice: 'modern', display: 'Space Grotesk', displayWeight: 700, body: 'DM Sans' },
  geometric: { voice: 'geometric', display: 'Poppins', displayWeight: 800, body: 'Poppins' },
  elegant: { voice: 'elegant', display: 'Playfair Display', displayWeight: 700, body: 'Montserrat', script: 'Pacifico' },
  serif: { voice: 'serif', display: 'DM Serif Display', displayWeight: 400, body: 'Lora' },
  playful: { voice: 'playful', display: 'Fredoka', displayWeight: 700, body: 'Nunito', script: 'Pacifico' },
  handmade: { voice: 'handmade', display: 'Caveat', displayWeight: 700, body: 'Nunito' },
};
