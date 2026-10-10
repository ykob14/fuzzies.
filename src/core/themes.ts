/** App themes: light, dark, system and a set of colourful modes (some unlockable with Fuzzies). */
import { accounts } from './account';

export interface Theme {
  id: string;
  name: string;
  cost: number;
  dark: boolean;
  /** App background (can be a gradient). */
  bg: string;
  surface: string;
  surface2: string;
  text: string;
  muted: string;
  border: string;
  accent: string;
  accent2: string;
  workspace: string;
  swatch: string; // preview in pickers
}

export const THEMES: Theme[] = [
  { id: 'light', name: 'Light', cost: 0, dark: false, bg: '#f6f5f2', surface: '#ffffff', surface2: '#efede9', text: '#18171c', muted: '#67646d', border: '#e4e1dc', accent: '#d6336c', accent2: '#b0245a', workspace: '#e8e6e1', swatch: 'linear-gradient(135deg,#ffffff 50%,#e8e6e1 50%)' },
  { id: 'dark', name: 'Dark', cost: 0, dark: true, bg: '#121114', surface: '#1b1a1f', surface2: '#252329', text: '#f4f2ee', muted: '#a09ca7', border: '#2e2c33', accent: '#ff6b9a', accent2: '#ff8fb4', workspace: '#0c0b0e', swatch: 'linear-gradient(135deg,#1b1a1f 50%,#0c0b0e 50%)' },
  { id: 'sunset', name: 'Sunset', cost: 0, dark: false, bg: 'linear-gradient(160deg,#fff1e6 0%,#ffe0ec 55%,#f1e4ff 100%)', surface: 'rgba(255,255,255,0.86)', surface2: 'rgba(255,236,226,0.9)', text: '#2b1a24', muted: '#85677a', border: 'rgba(214,160,180,0.35)', accent: '#ff5e62', accent2: '#ff9966', workspace: '#f8e5e4', swatch: 'linear-gradient(135deg,#ff9966,#ff5e62,#c471ed)' },
  { id: 'ocean', name: 'Ocean', cost: 20, dark: true, bg: 'linear-gradient(160deg,#04293a 0%,#064663 60%,#0b5f7a 100%)', surface: 'rgba(8,47,66,0.88)', surface2: 'rgba(12,66,90,0.9)', text: '#e6fbff', muted: '#8fc3d1', border: 'rgba(120,200,220,0.2)', accent: '#2ee6d6', accent2: '#4cc9f0', workspace: '#03202d', swatch: 'linear-gradient(135deg,#04293a,#0b5f7a,#2ee6d6)' },
  { id: 'forest', name: 'Forest', cost: 20, dark: false, bg: 'linear-gradient(160deg,#eef7ec 0%,#e3f1e0 60%,#f4f1df 100%)', surface: 'rgba(255,255,255,0.88)', surface2: 'rgba(230,243,226,0.95)', text: '#14301f', muted: '#5e7d66', border: 'rgba(80,140,90,0.22)', accent: '#2f9e5b', accent2: '#e2a93b', workspace: '#dcebd7', swatch: 'linear-gradient(135deg,#eef7ec,#2f9e5b,#e2a93b)' },
  { id: 'candy', name: 'Candy', cost: 30, dark: false, bg: 'linear-gradient(160deg,#ffe3f3 0%,#e7e1ff 50%,#d9f6ff 100%)', surface: 'rgba(255,255,255,0.85)', surface2: 'rgba(255,233,247,0.9)', text: '#3a1840', muted: '#8a6a93', border: 'rgba(220,150,220,0.3)', accent: '#ff3fa4', accent2: '#6c63ff', workspace: '#f3e6fb', swatch: 'linear-gradient(135deg,#ffb3de,#c3b5ff,#a8ecff)' },
  { id: 'neon', name: 'Neon Night', cost: 40, dark: true, bg: 'radial-gradient(circle at 20% 0%,#2b0b4a 0%,#0d0716 55%,#05030a 100%)', surface: 'rgba(20,10,34,0.9)', surface2: 'rgba(40,18,64,0.9)', text: '#fbf3ff', muted: '#b598d0', border: 'rgba(255,60,220,0.22)', accent: '#ff2bd6', accent2: '#00f0ff', workspace: '#06030c', swatch: 'linear-gradient(135deg,#0d0716,#ff2bd6,#00f0ff)' },
  { id: 'lavender', name: 'Lavender', cost: 25, dark: false, bg: 'linear-gradient(160deg,#f3efff 0%,#ebe4ff 100%)', surface: 'rgba(255,255,255,0.9)', surface2: 'rgba(240,234,255,0.95)', text: '#251d40', muted: '#756b99', border: 'rgba(150,130,220,0.25)', accent: '#8a63ff', accent2: '#ff8ac2', workspace: '#e4ddfa', swatch: 'linear-gradient(135deg,#f3efff,#b9a3ff,#8a63ff)' },
  { id: 'galaxy', name: 'Galaxy', cost: 60, dark: true, bg: 'radial-gradient(ellipse at 70% 10%,#3a1c71 0%,#1a1040 40%,#090616 100%)', surface: 'rgba(22,16,48,0.88)', surface2: 'rgba(40,28,82,0.9)', text: '#f4efff', muted: '#a99ed6', border: 'rgba(170,140,255,0.2)', accent: '#ffaf7b', accent2: '#d76d77', workspace: '#07051a', swatch: 'linear-gradient(135deg,#3a1c71,#d76d77,#ffaf7b)' },
  { id: 'gold', name: 'Golden Hour', cost: 100, dark: true, bg: 'linear-gradient(160deg,#1a1408 0%,#2a1f0a 60%,#3b2a0c 100%)', surface: 'rgba(36,27,10,0.9)', surface2: 'rgba(54,40,14,0.92)', text: '#fff6df', muted: '#cdb98a', border: 'rgba(240,200,110,0.22)', accent: '#f5c451', accent2: '#ff9f43', workspace: '#120d04', swatch: 'linear-gradient(135deg,#2a1f0a,#f5c451,#ff9f43)' },
];

export const ACCENTS = ['', '#d6336c', '#e8590c', '#e5a000', '#2b9a66', '#0c8599', '#2f6bff', '#6741d9', '#18171c'];

const mq = matchMedia('(prefers-color-scheme: dark)');

/** Text colour that reads on top of a given accent (white on deep colours, ink on light ones). */
function onColor(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return '#ffffff';
  const n = parseInt(m[1], 16);
  const lin = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const L = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
  return (1.05) / (L + 0.05) >= 4.5 ? '#ffffff' : '#18171c';
}

export function resolveTheme(id: string): Theme {
  if (id === 'system') return THEMES[mq.matches ? 1 : 0];
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

export function applyTheme(): void {
  const s = accounts.current?.settings;
  const t = resolveTheme(s?.theme ?? 'system');
  const accent = s?.accent || t.accent;
  const r = document.documentElement.style;
  r.setProperty('--bg', t.bg);
  r.setProperty('--surface', t.surface);
  r.setProperty('--surface-2', t.surface2);
  r.setProperty('--text', t.text);
  r.setProperty('--muted', t.muted);
  r.setProperty('--border', t.border);
  r.setProperty('--accent', accent);
  r.setProperty('--on-accent', onColor(accent));
  r.setProperty('--accent-2', t.accent2);
  r.setProperty('--workspace', t.workspace);
  document.documentElement.dataset.dark = String(t.dark);
  document.documentElement.dataset.motion = s?.reduceMotion ? 'reduce' : 'full';
  const bar = t.dark ? '#121114' : '#f6f5f2';
  // while the launch screen shows, it keeps its own colour and restores this one when it fades out
  const splash = document.getElementById('splash');
  if (splash && !splash.classList.contains('out')) splash.dataset.themeColor = bar;
  else document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bar);
}

mq.addEventListener('change', applyTheme);
