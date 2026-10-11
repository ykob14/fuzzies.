/**
 * Text effect presets (Canva-style): each one sets the text's existing style properties (shadow, outline, highlight,
 * fill) and/or the `effect` copies drawn behind it. Picking "None" clears them; everything stays editable afterwards.
 */
import type { TextEl } from './types';

export type FxId = 'none' | 'shadow' | 'lift' | 'hollow' | 'outline' | 'neon' | 'background' | 'echo' | 'splice' | 'glitch';
export const TEXT_FX: { id: FxId; label: string }[] = [
  { id: 'none', label: 'None' }, { id: 'shadow', label: 'Shadow' }, { id: 'lift', label: 'Lift' }, { id: 'hollow', label: 'Hollow' },
  { id: 'outline', label: 'Outline' }, { id: 'neon', label: 'Neon' }, { id: 'background', label: 'Background' },
  { id: 'echo', label: 'Echo' }, { id: 'splice', label: 'Splice' }, { id: 'glitch', label: 'Glitch' },
];

const CLEAR = 'rgba(0,0,0,0)';
/** The text's main solid colour (gradients fall back to their first stop). */
function base(t: TextEl): string {
  if (typeof t.fill === 'string') return t.fill === CLEAR ? (t.strokeColor || '#1c1830') : t.fill;
  return t.fill.stops[0]?.color ?? '#1c1830';
}
const isLight = (c: string) => {
  const m = /^#([0-9a-f]{6})$/i.exec(c);
  if (!m) return false;
  const n = parseInt(m[1], 16);
  return ((n >> 16) & 255) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114 > 160;
};
/** Which preset a text currently matches (best effort, for highlighting the tile). */
export function currentFx(t: TextEl): FxId {
  if (t.effect) return t.effect.kind;
  if (t.fill === CLEAR && t.strokeWidth > 0) return 'hollow';
  if (t.bg) return 'background';
  if (t.shadow && !t.shadow.x && !t.shadow.y && t.shadow.blur > 0) return 'neon';
  if (t.shadow) return t.shadow.blur > t.size * 0.15 ? 'lift' : 'shadow';
  if (t.strokeWidth > 0) return 'outline';
  return 'none';
}

export function applyTextFx(t: TextEl, id: FxId): void {
  const c = base(t), s = t.size;
  // start clean so presets never stack by accident
  if (t.fill === CLEAR) t.fill = c;
  t.shadow = null; t.effect = null; t.strokeWidth = 0; t.strokeColor = ''; t.bg = '';
  switch (id) {
    case 'shadow': t.shadow = { color: 'rgba(0,0,0,0.45)', blur: Math.round(s * 0.06), x: Math.round(s * 0.05), y: Math.round(s * 0.05) }; break;
    case 'lift': t.shadow = { color: 'rgba(0,0,0,0.32)', blur: Math.round(s * 0.28), x: 0, y: Math.round(s * 0.07) }; break;
    case 'hollow': t.strokeColor = c; t.strokeWidth = Math.max(1, s * 0.022); t.fill = CLEAR; break;
    case 'outline': t.strokeColor = isLight(c) ? '#1c1830' : '#ffffff'; t.strokeWidth = Math.max(1, s * 0.035); break;
    case 'neon': t.shadow = { color: c, blur: Math.round(s * 0.32), x: 0, y: 0 }; break;
    case 'background': t.bg = isLight(c) ? '#1c1830' : '#ffd23f'; break;
    case 'echo': t.effect = { kind: 'echo', color: c, offset: Math.round(s * 0.05) }; break;
    case 'splice': t.strokeColor = c; t.strokeWidth = Math.max(1, s * 0.02); t.fill = CLEAR; t.effect = { kind: 'splice', color: isLight(c) ? '#1c1830' : '#ffb000', offset: Math.round(s * 0.05) }; break;
    case 'glitch': t.effect = { kind: 'glitch', color: '#00e5ff', offset: Math.round(s * 0.035) }; break;
    default: break;
  }
}
