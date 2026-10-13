/**
 * Residence life — "Meet your Resident Assistants" templates (owner's request, modelled on their RA poster).
 * A purple header with the title, a grid of photo cards (replaceable photo, purple frame, gold name bar with the
 * name and role) and a closing pill. Names and the college line are sample words: every piece is an editable layer.
 */
import { photoAsset } from '../layouts';
import type { Palette } from '../palettes';
import { makeImage } from '../../../editor/doc';
import { box, text, type CollectionTemplate, type Kit } from './kit';

const PURPLE = '#4b2590', LILAC = '#e5dbf8', GOLD = '#fdc94a', INK = '#25124d', PAGE = '#f6f3fc';
const FONT = 'Montserrat';
const NAMES = ['Jordan Lee', 'Amara Okafor', 'Sofia Martinez', 'Noah Bennett', 'Priya Sharma', 'Liam Walsh'];
const ROLE = 'Resident Assistant';
const PHOTO_TINT = { id: 'reslife', primary: '#7b5cc4', secondary: LILAC, accent: GOLD } as Palette;

/** A replaceable photo (soft lilac placeholder with a camera mark). */
function photo(c: Kit, i: number, x: number, y: number, w: number, h: number, radius: number): void {
  const id = `ph-reslife-${i % 3}`;
  c.assets[id] ??= photoAsset(PHOTO_TINT, i % 3);
  const el = makeImage(id, w, h, { mask: 'none', radius });
  Object.assign(el, { x, y, w, h, name: 'Photo — tap Replace' });
  c.els.push(el);
}

/** One RA card: lilac shadow, purple frame, photo, gold bar with the name and role. */
function card(c: Kit, i: number, name: string, role: string, x: number, y: number, w: number, h: number): void {
  const r = w * 0.05, b = Math.max(4, w * 0.016), barH = Math.min(h * 0.3, w * 0.24);
  box(c, x + w * 0.02, y + w * 0.025, w, h, LILAC, { radius: r, name: 'Card shadow' });
  box(c, x, y, w, h, PURPLE, { radius: r, name: 'Card frame' });
  photo(c, i, x + b, y + b, w - b * 2, h - b * 2 - barH * 0.6, r - b);
  const by = y + h - b - barH;
  box(c, x + b, by, w - b * 2, barH, GOLD, { radius: r - b, name: 'Name bar' });
  const n = text(c, name, x + w * 0.07, 0, w * 0.86, { font: FONT, weight: 800, size: w * 0.068, fill: INK, upper: true, spacing: w * 0.003, name: 'Name' });
  const t = text(c, role, x + w * 0.07, 0, w * 0.86, { font: FONT, weight: 500, size: w * 0.042, fill: INK, upper: true, spacing: w * 0.002, name: 'Role' });
  const gap = barH * 0.08, total = n.h + gap + t.h;
  n.y = by + (barH - total) / 2;
  t.y = n.y + n.h + gap;
}

interface Header { kicker: string; title: string; sub: string; h: number; size: number; kr?: number; sr?: number }
/** Purple header band with the two lilac bubbles at its corners, gold kicker, big white title, small line. */
function header(c: Kit, o: Header): void {
  const { W, u } = c;
  box(c, 0, 0, W, o.h, PURPLE, { name: 'Header' });
  const cr = u * 0.14;
  box(c, -cr * 0.75, o.h - cr * 0.95, cr * 2, cr * 2, LILAC, { shape: 'ellipse', name: 'Bubble' });
  box(c, W - cr * 1.2, o.h - cr * 0.9, cr * 2, cr * 2, LILAC, { shape: 'ellipse', name: 'Bubble' });
  const k = text(c, o.kicker, W * 0.15, 0, W * 0.7, { font: FONT, weight: 800, size: u * o.size * (o.kr ?? 0.62), fill: GOLD, upper: true, spacing: u * 0.003, name: 'Kicker' });
  const t = text(c, o.title, W * 0.15, 0, W * 0.7, { font: FONT, weight: 900, size: u * o.size, fill: '#ffffff', upper: true, name: 'Title' });
  const s = text(c, o.sub, W * 0.15, 0, W * 0.7, { font: FONT, weight: 700, size: u * o.size * (o.sr ?? 0.3), fill: '#ffffff', upper: true, spacing: u * 0.003, name: 'College' });
  const g1 = u * Math.min(0.012, o.size * 0.12), g2 = u * Math.min(0.03, o.size * 0.42), total = k.h + g1 + t.h + g2 + s.h;
  k.y = (o.h - total) / 2;
  t.y = k.y + k.h + g1;
  s.y = t.y + t.h + g2;
}

/** The closing purple pill ("Here to help you feel at home"). */
function footer(c: Kit, s: string, y: number, h: number, w = c.W * 0.64): void {
  box(c, (c.W - w) / 2, y, w, h, PURPLE, { radius: h / 2, name: 'Footer' });
  const t = text(c, s, (c.W - w) / 2 + h * 0.6, 0, w - h * 1.2, { font: FONT, weight: 800, size: h * 0.44, fill: '#ffffff', upper: true, spacing: h * 0.02, name: 'Footer text' });
  t.y = y + (h - t.h) / 2;
}

/** A grid of cards between `top` and `bottom`, `cols` across, centred, with `side` margins. */
function grid(c: Kit, names: string[], cols: number, top: number, bottom: number, side: number, gap: number, maxH = Infinity): void {
  const rows = Math.ceil(names.length / cols);
  const w = (c.W - side * 2 - gap * (cols - 1)) / cols;
  const h = Math.min(maxH, (bottom - top - gap * (rows - 1)) / rows);
  const y0 = top + (bottom - top - (h * rows + gap * (rows - 1))) / 2;
  names.forEach((n, i) => card(c, i, n, ROLE, side + (i % cols) * (w + gap), y0 + Math.floor(i / cols) * (h + gap), w, h));
}

const SUB = 'Your College Name  •  ResLife';
const TAGS = ['meet the team', 'resident assistants', 'resident assistant', 'ra', 'ras', 'reslife', 'residence life', 'dorm', 'residence hall', 'housing', 'student staff', 'staff photos', 'team photos', 'college', 'university', 'campus', 'welcome week', 'orientation'];

export const RESLIFE: CollectionTemplate[] = [
  { id: 'meet-your-resident-assistants', name: 'Meet Your Resident Assistants', format: 'poster', use: 'poster', style: 'Bold', colors: ['purple', 'gold', 'white'], occasion: 'announcement', tags: [...TAGS, 'poster', 'bulletin board', '6 photos'],
    build: (c) => {
      c.bg = PAGE;
      const { W, H, u } = c;
      header(c, { kicker: 'Meet your', title: 'Resident Assistants', sub: SUB, h: H * 0.155, size: 0.075 });
      grid(c, NAMES, 3, H * 0.2, H * 0.915, W * 0.05, W * 0.035);
      footer(c, 'Here to help you feel at home', H * 0.94, u * 0.034);
    } },
  { id: 'meet-your-ras-post', name: 'Meet Your RAs Post', format: 'post', use: 'social', style: 'Bold', colors: ['purple', 'gold', 'white'], occasion: 'announcement', tags: [...TAGS, 'instagram', 'social post', '6 photos'],
    build: (c) => {
      c.bg = PAGE;
      const { W, H, u } = c;
      header(c, { kicker: 'Meet your', title: 'Resident Assistants', sub: SUB, h: H * 0.22, size: 0.07 });
      grid(c, NAMES, 3, H * 0.255, H * 0.905, W * 0.06, W * 0.035);
      footer(c, 'Here to help you feel at home', H * 0.928, u * 0.045, W * 0.7);
    } },
  { id: 'meet-the-reslife-team-slide', name: 'Meet the ResLife Team Slide', format: 'slides', use: 'poster', style: 'Bold', colors: ['purple', 'gold', 'white'], occasion: 'presentation', tags: [...TAGS, 'presentation', 'slide', 'orientation slide', '6 photos'],
    build: (c) => {
      c.bg = PAGE;
      const { W, H, u } = c;
      header(c, { kicker: 'Meet the', title: 'ResLife Team', sub: SUB, h: H * 0.27, size: 0.1 });
      grid(c, NAMES, 6, H * 0.33, H * 0.86, W * 0.045, W * 0.02);
      footer(c, 'Here to help you feel at home', H * 0.895, u * 0.06, W * 0.46);
    } },
  { id: 'meet-your-ra-spotlight-story', name: 'Meet Your RA Spotlight Story', format: 'story', use: 'social', style: 'Bold', colors: ['purple', 'gold', 'white'], occasion: 'announcement', tags: [...TAGS, 'story', 'spotlight', 'one person', 'fun fact'],
    build: (c) => {
      c.bg = PAGE;
      const { W, H, u } = c;
      header(c, { kicker: 'Meet your', title: 'RA', sub: SUB, h: H * 0.19, size: 0.13, kr: 0.4, sr: 0.2 });
      const w = W * 0.66, h = w * 1.2, y = H * 0.24;
      card(c, 0, NAMES[0], `${ROLE} · Floor 3`, (W - w) / 2, y, w, h);
      const lines = ['Ask me about: study spots & campus events', 'Fun fact: I make the best pancakes'];
      let ly = y + h + u * 0.07;
      for (const l of lines) { const t = text(c, l, W * 0.1, ly, W * 0.8, { font: FONT, weight: 600, size: u * 0.034, fill: INK, lines: 2, lh: 1.25, name: 'About me' }); ly = t.y + t.h + u * 0.022; }
      footer(c, 'My door is always open', H * 0.875, u * 0.075, W * 0.72);
    } },
];

export const RESLIFE_FONTS: [string, number][] = [[FONT, 500], [FONT, 600], [FONT, 700], [FONT, 800], [FONT, 900]];
