/** One-tap text style presets. All free (owner, 2026-10-15: fonts are free, so their styles are too); `premium` only marks the fancy ones. */
import type { TextEl } from '../editor/types';

export interface TextStyle { id: string; name: string; premium: boolean; css: string; style: (u: number) => Partial<TextEl> }

export const FX_PACK = { id: 'fx-magic', name: 'Magic Text FX', cost: 0 };

export const TEXT_STYLES: TextStyle[] = [
  { id: 'bold-pop', name: 'BOLD POP', premium: false, css: 'font:400 22px "Archivo Black";color:#e8590c', style: (u) => ({ font: 'Archivo Black', weight: 400, size: u * 0.1, fill: '#e8590c', text: 'BOLD POP' }) },
  { id: 'outline', name: 'OUTLINE', premium: false, css: 'font:400 24px "Bebas Neue";color:transparent;-webkit-text-stroke:1.2px #1c1830;letter-spacing:2px', style: (u) => ({ font: 'Bebas Neue', weight: 400, size: u * 0.13, fill: 'rgba(0,0,0,0)', strokeColor: '#1c1830', strokeWidth: u * 0.003, letterSpacing: u * 0.006, text: 'OUTLINE' }) },
  { id: 'script', name: 'Lovely script', premium: false, css: 'font:400 20px "Pacifico";color:#ff4f9a', style: (u) => ({ font: 'Pacifico', weight: 400, size: u * 0.08, fill: '#ff4f9a', text: 'Lovely script' }) },
  { id: 'highlight', name: 'Highlight', premium: false, css: 'font:700 18px "Poppins";background:#ffd23f;padding:2px 8px;border-radius:6px;color:#1c1830', style: (u) => ({ font: 'Poppins', weight: 700, size: u * 0.05, fill: '#1c1830', bg: '#ffd23f', text: 'Highlight' }) },
  { id: 'elegant', name: 'Elegant', premium: false, css: 'font:italic 600 20px "Playfair Display";color:#3d2c2e', style: (u) => ({ font: 'Playfair Display', weight: 600, italic: true, size: u * 0.07, fill: '#3d2c2e', text: 'Elegant' }) },
  { id: 'spaced', name: 'S P A C E D', premium: false, css: 'font:600 14px "Montserrat";letter-spacing:5px;color:#55506a', style: (u) => ({ font: 'Montserrat', weight: 600, size: u * 0.035, letterSpacing: u * 0.02, fill: '#55506a', text: 'SPACED OUT', uppercase: true }) },
  { id: 'neon', name: 'Neon', premium: true, css: 'font:400 24px "Righteous";color:#fff;text-shadow:0 0 6px #ff2bd6,0 0 14px #ff2bd6', style: (u) => ({ font: 'Righteous', weight: 400, size: u * 0.1, fill: '#ffffff', shadow: { color: '#ff2bd6', blur: u * 0.03, x: 0, y: 0 }, text: 'Neon' }) },
  { id: 'retro', name: 'RETRO', premium: true, css: 'font:400 24px "Shrikhand";color:#ff5e62;text-shadow:3px 3px 0 #ffb000', style: (u) => ({ font: 'Shrikhand', weight: 400, size: u * 0.1, fill: '#ff5e62', shadow: { color: '#ffb000', blur: 0, x: u * 0.008, y: u * 0.008 }, text: 'RETRO' }) },
  { id: 'gradient', name: 'Gradient', premium: true, css: 'font:900 24px "Montserrat";background:linear-gradient(90deg,#d6336c,#f59f00);-webkit-background-clip:text;background-clip:text;color:transparent', style: (u) => ({ font: 'Montserrat', weight: 900, size: u * 0.1, fill: { kind: 'linear', angle: 90, stops: [{ at: 0, color: '#d6336c' }, { at: 1, color: '#f59f00' }] }, text: 'Gradient' }) },
  { id: 'sticker', name: 'Sticker', premium: true, css: 'font:400 22px "Bungee";color:#ff4f9a;-webkit-text-stroke:1px #fff;text-shadow:0 2px 4px rgba(0,0,0,.3)', style: (u) => ({ font: 'Bungee', weight: 400, size: u * 0.09, fill: '#ff4f9a', strokeColor: '#ffffff', strokeWidth: u * 0.012, shadow: { color: 'rgba(0,0,0,0.3)', blur: u * 0.01, x: 0, y: u * 0.006 }, text: 'STICKER' }) },
  { id: 'glitch', name: 'GLITCH', premium: true, css: 'font:400 22px "Rubik Mono One";color:#fff;text-shadow:-2px 0 #00f0ff,2px 0 #ff2bd6', style: (u) => ({ font: 'Rubik Mono One', weight: 400, size: u * 0.08, fill: '#1c1830', shadow: { color: '#00f0ff', blur: 0, x: -u * 0.005, y: 0 }, text: 'GLITCH' }) },
  { id: 'marker', name: 'Marker', premium: true, css: 'font:400 22px "Permanent Marker";color:#2ec4b6', style: (u) => ({ font: 'Permanent Marker', weight: 400, size: u * 0.08, fill: '#2ec4b6', rotation: -4, text: 'Marker!' }) },
];
