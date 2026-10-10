/** Factories for designs, pages and elements, plus the canvas size presets. */
import type { Design, DrawEl, El, EmojiEl, Fill, GraphicEl, ImageEl, Page, ShapeEl, ShapeKind, TextEl } from './types';
import { DEFAULT_FILTERS } from './types';
import { uid, deepClone } from '../core/util';
import { fitText } from './render';
import { artById } from '../content/art';

export interface SizePreset { id: string; name: string; w: number; h: number; icon: string }

export const SIZE_PRESETS: SizePreset[] = [
  { id: 'ig-post', name: 'Instagram Post', w: 1080, h: 1080, icon: '◻️' },
  { id: 'story', name: 'Story / Reel', w: 1080, h: 1920, icon: '📱' },
  { id: 'poster', name: 'Poster', w: 1587, h: 2245, icon: '🖼️' },
  { id: 'flyer', name: 'Flyer (A4)', w: 1240, h: 1754, icon: '📄' },
  { id: 'presentation', name: 'Presentation', w: 1920, h: 1080, icon: '🖥️' },
  { id: 'yt-thumb', name: 'YouTube Thumbnail', w: 1280, h: 720, icon: '▶️' },
  { id: 'fb-cover', name: 'Facebook Cover', w: 1640, h: 624, icon: '🌄' },
  { id: 'card', name: 'Business Card', w: 1050, h: 600, icon: '💼' },
  { id: 'invite', name: 'Invitation', w: 1500, h: 2100, icon: '💌' },
  { id: 'logo', name: 'Logo', w: 1000, h: 1000, icon: '⭐' },
  { id: 'wallpaper', name: 'Phone Wallpaper', w: 1170, h: 2532, icon: '🌈' },
  { id: 'desktop-wall', name: 'Desktop Wallpaper', w: 2560, h: 1440, icon: '💻' },
];

export function newPage(background: Fill = '#ffffff', elements: El[] = []): Page {
  return { id: uid('p_'), background, elements };
}

export function newDesign(owner: string, name: string, w: number, h: number, pages?: Page[]): Design {
  const now = Date.now();
  return { id: uid('d_'), owner, name, width: w, height: h, pages: pages ?? [newPage()], assets: {}, createdAt: now, updatedAt: now };
}

const base = (x: number, y: number, w: number, h: number) => ({ id: uid('e_'), x, y, w, h, rotation: 0, opacity: 1, shadow: null });

export function makeText(text: string, opts: Partial<TextEl> = {}): TextEl {
  const el: TextEl = {
    ...base(0, 0, 600, 100),
    type: 'text', text, font: 'Poppins', size: 64, weight: 700, italic: false, underline: false, uppercase: false,
    align: 'center', fill: '#1c1830', lineHeight: 1.2, letterSpacing: 0, strokeColor: '', strokeWidth: 0, bg: '',
    ...opts,
  };
  fitText(el);
  return el;
}

export function makeShape(shape: ShapeKind, opts: Partial<ShapeEl> = {}): ShapeEl {
  const line = shape === 'line';
  return { ...base(0, 0, 300, line ? 12 : 300), type: 'shape', shape, fill: '#7c4dff', stroke: '#1c1830', strokeWidth: 0, radius: 0, ...opts };
}

export function makeImage(asset: string, w: number, h: number, opts: Partial<ImageEl> = {}): ImageEl {
  return { ...base(0, 0, w, h), type: 'image', asset, radius: 0, mask: 'none', filters: { ...DEFAULT_FILTERS }, stroke: '#ffffff', strokeWidth: 0, panX: 0, panY: 0, zoom: 1, ...opts };
}

export function makeGraphic(art: string, size: number, opts: Partial<GraphicEl> = {}): GraphicEl {
  const a = artById(art);
  const ratio = a?.ratio ?? 1;
  const w = ratio >= 1 ? size : size * ratio, h = ratio >= 1 ? size / ratio : size;
  return { ...base(0, 0, w, h), type: 'graphic', art, colors: [...(a?.colors ?? [])], ...opts };
}

export function makeEmoji(char: string, size: number, opts: Partial<EmojiEl> = {}): EmojiEl {
  return { ...base(0, 0, size, size), type: 'emoji', char, ...opts };
}

export function makeDraw(points: number[], x: number, y: number, w: number, h: number, color: string, width: number, highlighter = false): DrawEl {
  return { ...base(x, y, w, h), type: 'draw', points, color, width, highlighter };
}

/** Deep-copy elements with fresh ids. */
export function cloneEls(els: El[], offset = 0): El[] {
  // copies keep their grouping, but as a brand-new group
  const groups = new Map<string, string>();
  const regroup = (g?: string) => { if (!g) return undefined; if (!groups.has(g)) groups.set(g, uid('g_')); return groups.get(g); };
  return els.map((e) => ({ ...deepClone(e), id: uid('e_'), x: e.x + offset, y: e.y + offset, group: regroup(e.group) }));
}

/** Copy a design (e.g. from a template) for a new owner, with fresh ids everywhere. */
export function instantiate(src: Design, owner: string, name?: string): Design {
  const d = deepClone(src);
  const now = Date.now();
  d.id = uid('d_');
  d.owner = owner;
  d.name = name ?? src.name;
  d.createdAt = d.updatedAt = now;
  d.pages = d.pages.map((p) => ({ ...p, id: uid('p_'), elements: cloneEls(p.elements) }));
  for (const p of d.pages) for (const el of p.elements) if (el.type === 'text') fitText(el);
  delete d.thumb;
  return d;
}

export function elLabel(el: El): string {
  if (el.name) return el.name;
  switch (el.type) {
    case 'text': return el.text.split('\n')[0].slice(0, 28) || 'Text';
    case 'shape': return el.shape[0].toUpperCase() + el.shape.slice(1);
    case 'image': return 'Photo';
    case 'graphic': return artById(el.art)?.name ?? 'Graphic';
    case 'emoji': return `Sticker ${el.char}`;
    case 'draw': return el.highlighter ? 'Highlighter' : 'Drawing';
  }
}
