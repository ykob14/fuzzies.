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
  { id: 'light', name: 'Light', cost: 0, dark: false, bg: '#f6f5fb', surface: '#ffffff', surface2: '#f0eef7', text: '#1c1830', muted: '#6b6684', border: '#e4e1ef', accent: '#7c4dff', accent2: '#ff4f9a', workspace: '#e9e7f2', swatch: 'linear-gradient(135deg,#ffffff 50%,#e9e7f2 50%)' },
  { id: 'dark', name: 'Dark', cost: 0, dark: true, bg: '#121019', surface: '#1b1825', surface2: '#252133', text: '#f2f0fa', muted: '#a19bb8', border: '#2f2a40', accent: '#9b7bff', accent2: '#ff6fae', workspace: '#0c0a12', swatch: 'linear-gradient(135deg,#1b1825 50%,#0c0a12 50%)' },
  { id: 'sunset', name: 'Sunset', cost: 0, dark: false, bg: 'linear-gradient(160deg,#fff1e6 0%,#ffe0ec 55%,#f1e4ff 100%)', surface: 'rgba(255,255,255,0.86)', surface2: 'rgba(255,236,226,0.9)', text: '#2b1a24', muted: '#85677a', border: 'rgba(214,160,180,0.35)', accent: '#ff5e62', accent2: '#ff9966', workspace: '#f8e5e4', swatch: 'linear-gradient(135deg,#ff9966,#ff5e62,#c471ed)' },
  { id: 'ocean', name: 'Ocean', cost: 20, dark: true, bg: 'linear-gradient(160deg,#04293a 0%,#064663 60%,#0b5f7a 100%)', surface: 'rgba(8,47,66,0.88)', surface2: 'rgba(12,66,90,0.9)', text: '#e6fbff', muted: '#8fc3d1', border: 'rgba(120,200,220,0.2)', accent: '#2ee6d6', accent2: '#4cc9f0', workspace: '#03202d', swatch: 'linear-gradient(135deg,#04293a,#0b5f7a,#2ee6d6)' },
  { id: 'forest', name: 'Forest', cost: 20, dark: false, bg: 'linear-gradient(160deg,#eef7ec 0%,#e3f1e0 60%,#f4f1df 100%)', surface: 'rgba(255,255,255,0.88)', surface2: 'rgba(230,243,226,0.95)', text: '#14301f', muted: '#5e7d66', border: 'rgba(80,140,90,0.22)', accent: '#2f9e5b', accent2: '#e2a93b', workspace: '#dcebd7', swatch: 'linear-gradient(135deg,#eef7ec,#2f9e5b,#e2a93b)' },
  { id: 'candy', name: 'Candy', cost: 30, dark: false, bg: 'linear-gradient(160deg,#ffe3f3 0%,#e7e1ff 50%,#d9f6ff 100%)', surface: 'rgba(255,255,255,0.85)', surface2: 'rgba(255,233,247,0.9)', text: '#3a1840', muted: '#8a6a93', border: 'rgba(220,150,220,0.3)', accent: '#ff3fa4', accent2: '#6c63ff', workspace: '#f3e6fb', swatch: 'linear-gradient(135deg,#ffb3de,#c3b5ff,#a8ecff)' },
  { id: 'neon', name: 'Neon Night', cost: 40, dark: true, bg: 'radial-gradient(circle at 20% 0%,#2b0b4a 0%,#0d0716 55%,#05030a 100%)', surface: 'rgba(20,10,34,0.9)', surface2: 'rgba(40,18,64,0.9)', text: '#fbf3ff', muted: '#b598d0', border: 'rgba(255,60,220,0.22)', accent: '#ff2bd6', accent2: '#00f0ff', workspace: '#06030c', swatch: 'linear-gradient(135deg,#0d0716,#ff2bd6,#00f0ff)' },
  { id: 'lavender', name: 'Lavender', cost: 25, dark: false, bg: 'linear-gradient(160deg,#f3efff 0%,#ebe4ff 100%)', surface: 'rgba(255,255,255,0.9)', surface2: 'rgba(240,234,255,0.95)', text: '#251d40', muted: '#756b99', border: 'rgba(150,130,220,0.25)', accent: '#8a63ff', accent2: '#ff8ac2', workspace: '#e4ddfa', swatch: 'linear-gradient(135deg,#f3efff,#b9a3ff,#8a63ff)' },
  { id: 'galaxy', name: 'Galaxy', cost: 60, dark: true, bg: 'radial-gradient(ellipse at 70% 10%,#3a1c71 0%,#1a1040 40%,#090616 100%)', surface: 'rgba(22,16,48,0.88)', surface2: 'rgba(40,28,82,0.9)', text: '#f4efff', muted: '#a99ed6', border: 'rgba(170,140,255,0.2)', accent: '#ffaf7b', accent2: '#d76d77', workspace: '#07051a', swatch: 'linear-gradient(135deg,#3a1c71,#d76d77,#ffaf7b)' },
  { id: 'gold', name: 'Golden Hour', cost: 100, dark: true, bg: 'linear-gradient(160deg,#1a1408 0%,#2a1f0a 60%,#3b2a0c 100%)', surface: 'rgba(36,27,10,0.9)', surface2: 'rgba(54,40,14,0.92)', text: '#fff6df', muted: '#cdb98a', border: 'rgba(240,200,110,0.22)', accent: '#f5c451', accent2: '#ff9f43', workspace: '#120d04', swatch: 'linear-gradient(135deg,#2a1f0a,#f5c451,#ff9f43)' },
];

export const ACCENTS = ['', '#7c4dff', '#ff4f9a', '#ff7a1a', '#f5b800', '#22b573', '#0fb5c9', '#2f6bff', '#e5484d'];

const mq = matchMedia('(prefers-color-scheme: dark)');

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
  r.setProperty('--accent-2', t.accent2);
  r.setProperty('--workspace', t.workspace);
  document.documentElement.dataset.dark = String(t.dark);
  document.documentElement.dataset.motion = s?.reduceMotion ? 'reduce' : 'full';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t.dark ? '#121019' : '#f6f5fb');
}

mq.addEventListener('change', applyTheme);
