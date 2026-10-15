/**
 * "Meet the team" templates — the clean photo-card look from the owner's Resident Assistants poster, reused for any group
 * of people: RAs, club executives, student council, teachers, a company or café team, a sports roster, coaching staff,
 * volunteers, a wedding party, a spotlight on one person (new hire, employee of the month, senior, volunteer).
 *
 * Every template is: a coloured header band with two soft bubbles at its corners, a small kicker, a big title and a
 * line underneath; photo cards (soft shadow, coloured frame, a replaceable photo, a name bar with name + role); a
 * closing pill. A `Theme` holds the colours and fonts, so a new set is mostly data. Names, roles and places are sample
 * words — every piece is an editable layer. Template ids are `${sub}--${id}`: never rename them.
 */
import { photoAsset, widthOf, type Format } from '../layouts';
import type { Palette } from '../palettes';
import { makeImage } from '../../../editor/doc';
import { box, text, type CollectionTemplate, type Kit, type Use } from './kit';

export interface Theme {
  id: string;
  head: string; bubble: string; page: string; frame: string; shadow: string;
  bar: string; barInk: string;                 // name bar and the words on it
  kicker: string; title: string; sub: string;  // header words
  ink: string;                                 // words on the page
  footer: string; footerInk: string;
  tFont: [string, number]; kFont: [string, number];
  nFont: string; nW: number; rW: number;       // names / roles font and weights
  upper?: boolean;                             // uppercase title (default true)
  photo: [string, string, string];             // placeholder tint: primary, secondary, accent
  /** Header look: `band` centred band with two soft bubbles (the owner's RA poster), `left` a band with left-aligned words
   * and an accent edge, `clean` no band (serif title on the page between hairlines), `slant` a band with a slanted edge (sport). */
  hs?: 'band' | 'left' | 'clean' | 'slant';
  /** Closing line: a `pill`, or a `line` of spaced capitals between two hairlines. */
  foot?: 'pill' | 'line';
  /** Person cards: a coloured `bar` with name + role on the photo, or a `caption` under a rounded photo. */
  card?: 'bar' | 'caption';
  muted?: string;                              // secondary words on the page (roles in caption cards)
}
const base = { title: '#ffffff', sub: '#ffffff', footerInk: '#ffffff', nW: 800, rW: 500 };
export const T: Record<string, Theme> = {
  reslife: { ...base, id: 'reslife', head: '#4b2590', bubble: '#e5dbf8', page: '#f6f3fc', frame: '#4b2590', shadow: '#e5dbf8', bar: '#fdc94a', barInk: '#25124d', kicker: '#fdc94a', ink: '#25124d', footer: '#4b2590', tFont: ['Montserrat', 900], kFont: ['Montserrat', 800], nFont: 'Montserrat', photo: ['#7b5cc4', '#e5dbf8', '#fdc94a'] },
  coral: { ...base, id: 'coral', head: '#1d2b53', bubble: '#ffe1d6', page: '#f7f8fc', frame: '#1d2b53', shadow: '#dfe3ef', bar: '#ff8a65', barInk: '#1d2b53', kicker: '#ff8a65', ink: '#1d2b53', muted: '#4b5675', footer: '#1d2b53', tFont: ['Poppins', 800], kFont: ['Poppins', 700], nFont: 'Poppins', nW: 700, photo: ['#5b6b9a', '#e6e9f4', '#ff8a65'], hs: 'left', foot: 'line', card: 'caption' },
  teal: { ...base, id: 'teal', head: '#0f6e78', bubble: '#d4efec', page: '#f4fbfa', frame: '#0f6e78', shadow: '#d4efec', bar: '#ffd34d', barInk: '#0d3c42', kicker: '#ffd34d', ink: '#0d3c42', footer: '#0f6e78', tFont: ['Nunito', 900], kFont: ['Nunito', 800], nFont: 'Nunito', nW: 900, rW: 700, photo: ['#3c9aa3', '#d4efec', '#ffd34d'] },
  luxe: { ...base, id: 'luxe', head: '#1c1c22', bubble: '#ece4cf', page: '#f8f6f0', frame: '#1c1c22', shadow: '#e6dfcc', bar: '#d2ae5a', barInk: '#1c1c22', kicker: '#d8b45c', ink: '#1c1c22', muted: '#6b5a2e', footer: '#1c1c22', tFont: ['DM Serif Display', 400], kFont: ['Montserrat', 700], nFont: 'Montserrat', upper: false, photo: ['#5a5650', '#ece4cf', '#d2ae5a'], hs: 'left', foot: 'line', card: 'caption' },
  forest: { ...base, id: 'forest', head: '#1f4d3a', bubble: '#dcebdc', page: '#f6f8f3', frame: '#1f4d3a', shadow: '#dcebdc', bar: '#f4e3b5', barInk: '#1f3a2c', kicker: '#f4c95d', ink: '#1f3a2c', muted: '#3f6b55', footer: '#1f4d3a', tFont: ['Poppins', 800], kFont: ['Poppins', 700], nFont: 'Poppins', nW: 700, photo: ['#4f7d63', '#dcebdc', '#f4c95d'], hs: 'left', card: 'caption' },
  sport: { ...base, id: 'sport', head: '#b3122e', bubble: '#f6d3d9', page: '#f4f4f6', frame: '#111827', shadow: '#d9dbe0', bar: '#111827', barInk: '#ffffff', kicker: '#ffe0e5', ink: '#111827', footer: '#b3122e', tFont: ['Oswald', 700], kFont: ['Oswald', 600], nFont: 'Oswald', nW: 700, rW: 500, photo: ['#7a7f8c', '#e5e7eb', '#b3122e'], hs: 'slant', foot: 'line' },
  sky: { ...base, id: 'sky', head: '#2563a6', bubble: '#dbe8f6', page: '#f5f8fc', frame: '#2563a6', shadow: '#dbe8f6', bar: '#ffa94d', barInk: '#17324f', kicker: '#ffc078', ink: '#17324f', footer: '#2563a6', tFont: ['Fredoka', 700], kFont: ['Fredoka', 600], nFont: 'Nunito', nW: 900, rW: 700, photo: ['#5a8cc4', '#dbe8f6', '#ffa94d'] },
  blush: { ...base, id: 'blush', head: '#8c5e63', bubble: '#f3e1dc', page: '#fbf7f4', frame: '#8c5e63', shadow: '#efdcd6', bar: '#f3e1dc', barInk: '#5e3a3e', kicker: '#8c5e63', ink: '#5e3a3e', muted: '#8c5e63', footer: '#8c5e63', tFont: ['Cormorant Garamond', 700], kFont: ['Montserrat', 600], nFont: 'Montserrat', nW: 700, rW: 500, upper: false, photo: ['#b08a8e', '#f3e1dc', '#e7c48f'], hs: 'clean', foot: 'line', card: 'caption' },
  grad: { ...base, id: 'grad', head: '#14213d', bubble: '#e8e2cc', page: '#f7f6f2', frame: '#14213d', shadow: '#e2ddca', bar: '#fca311', barInk: '#14213d', kicker: '#fca311', ink: '#14213d', footer: '#14213d', tFont: ['Montserrat', 900], kFont: ['Montserrat', 800], nFont: 'Montserrat', photo: ['#4a5a7a', '#e8e2cc', '#fca311'], hs: 'left' },
};

/** A replaceable photo (soft placeholder in the theme's colours with a camera mark). */
export function photo(c: Kit, th: Theme, i: number, x: number, y: number, w: number, h: number, radius: number): void {
  const id = th.id === 'reslife' ? `ph-reslife-${i % 3}` : `ph-team-${th.id}-${i % 3}`;
  c.assets[id] ??= photoAsset({ id: th.id === 'reslife' ? 'reslife' : `team-${th.id}`, primary: th.photo[0], secondary: th.photo[1], accent: th.photo[2] } as Palette, i % 3);
  const el = makeImage(id, w, h, { mask: 'none', radius });
  Object.assign(el, { x, y, w, h, name: 'Photo — tap to add yours' });
  c.els.push(el);
}

/** Name + role sizes for a card `w` wide (big enough to read on the page, never past the card). */
const nameSize = (c: Kit, w: number) => Math.min(w * 0.105, c.u * 0.05);
const roleSize = (c: Kit, w: number) => Math.min(w * 0.088, c.u * 0.036);
/** One person card: a framed photo with a name bar, or (caption themes) a rounded photo with the words under it. */
function card(c: Kit, th: Theme, i: number, name: string, role: string, x: number, y: number, w: number, h: number): void {
  if (th.card === 'caption') { captionCard(c, th, i, name, role, x, y, w, h); return; }
  const r = w * 0.05, b = Math.max(4, w * 0.016);
  const ns = nameSize(c, w), rs = roleSize(c, w), barH = Math.min(h * 0.36, ns * 1.15 + rs * 1.25 + w * 0.1);
  box(c, x + w * 0.02, y + w * 0.025, w, h, th.shadow, { radius: r, name: 'Card shadow' });
  box(c, x, y, w, h, th.frame, { radius: r, name: 'Card frame' });
  photo(c, th, i, x + b, y + b, w - b * 2, h - b * 2 - barH * 0.6, r - b);
  const by = y + h - b - barH;
  box(c, x + b, by, w - b * 2, barH, th.bar, { radius: r - b, name: 'Name bar' });
  const n = text(c, name, x + w * 0.06, 0, w * 0.88, { font: th.nFont, weight: th.nW, size: ns, fill: th.barInk, upper: true, spacing: w * 0.002, name: 'Name' });
  const t = text(c, role, x + w * 0.06, 0, w * 0.88, { font: th.nFont, weight: th.rW, size: rs, fill: th.barInk, upper: true, spacing: w * 0.002, name: 'Role' });
  const gap = barH * 0.06, total = n.h + gap + t.h;
  n.y = by + (barH - total) / 2;
  t.y = n.y + n.h + gap;
}
/** Rounded photo, a short accent tab on its edge, name and role underneath (left-aligned, like an editorial team page). */
function captionCard(c: Kit, th: Theme, i: number, name: string, role: string, x: number, y: number, w: number, h: number): void {
  const ns = nameSize(c, w), rs = roleSize(c, w), capH = ns * 1.1 + rs * 1.2 + w * 0.07;
  const ph = h - capH, r = w * 0.04;
  photo(c, th, i, x, y, w, ph, r);
  box(c, x, y + ph - w * 0.012, w * 0.28, w * 0.024, th.bar === th.bubble ? th.frame : th.bar, { radius: w * 0.012, name: 'Accent' });
  const n = text(c, name, x, y + ph + w * 0.045, w, { font: th.nFont, weight: th.nW, size: ns, fill: th.ink, align: 'left', upper: th.hs !== 'clean', name: 'Name' });
  text(c, role, x, n.y + n.h + w * 0.012, w, { font: th.nFont, weight: Math.max(500, th.rW), size: rs, fill: th.muted ?? th.frame, align: 'left', upper: true, spacing: w * 0.003, name: 'Role' });
}

interface Header { kicker: string; title: string; sub: string; h: number; size: number; kr?: number; sr?: number }
/** The page heading in the theme's look (see `Theme.hs`). */
export function header(c: Kit, th: Theme, o: Header): void {
  const hs = th.hs ?? 'band';
  if (hs === 'left' || hs === 'slant') { headerLeft(c, th, o, hs === 'slant'); return; }
  if (hs === 'clean') { headerClean(c, th, o); return; }
  const { W, u } = c, upper = th.upper ?? true;
  box(c, 0, 0, W, o.h, th.head, { name: 'Header' });
  const cr = u * 0.14;
  box(c, -cr * 0.75, o.h - cr * 0.95, cr * 2, cr * 2, th.bubble, { shape: 'ellipse', name: 'Bubble' });
  box(c, W - cr * 1.2, o.h - cr * 0.9, cr * 2, cr * 2, th.bubble, { shape: 'ellipse', name: 'Bubble' });
  const k = text(c, o.kicker, W * 0.15, 0, W * 0.7, { font: th.kFont[0], weight: th.kFont[1], size: u * o.size * (o.kr ?? 0.5), fill: th.kicker, upper: true, spacing: u * 0.004, name: 'Kicker' });
  const t = text(c, o.title, W * 0.14, 0, W * 0.72, { font: th.tFont[0], weight: th.tFont[1], size: u * o.size * (upper ? 1 : 1.15), fill: th.title, upper, spacing: upper && th.tFont[0] === 'Cormorant Garamond' ? u * 0.006 : 0, name: 'Title' });
  const s = text(c, o.sub, W * 0.15, 0, W * 0.7, { font: th.kFont[0], weight: 700, size: Math.max(u * o.size * (o.sr ?? 0.3), u * 0.024), fill: th.sub, upper: true, spacing: u * 0.003, name: th.id === 'reslife' ? 'College' : 'Subtitle' });
  const g1 = u * Math.min(0.012, o.size * 0.12), g2 = u * Math.min(0.03, o.size * 0.42), total = k.h + g1 + t.h + g2 + s.h;
  k.y = (o.h - total) / 2;
  t.y = k.y + k.h + g1;
  s.y = t.y + t.h + g2;
}
/** A band with the words on the left: kicker with a short accent bar, a big title, the line underneath; an accent edge
 * along the bottom (or, `slant`, a slanted bottom edge with a dark stripe — sport). */
function headerLeft(c: Kit, th: Theme, o: Header, slant: boolean): void {
  const { W, u } = c, upper = th.upper ?? true, x = W * 0.07, w = W * 0.86;
  if (slant) {
    box(c, 0, 0, W, o.h * 0.9, th.head, { name: 'Header' });
    // a long rotated strip makes the slanted bottom edge, a dark stripe follows it
    const lw = W * 1.3, a = -3.2;
    box(c, -W * 0.15, o.h * 0.86 + u * 0.02, lw, u * 0.03, th.frame, { rotation: a, name: 'Stripe' });
    box(c, -W * 0.15, o.h * 0.68, lw, o.h * 0.26, th.head, { rotation: a, name: 'Header edge' });
  } else {
    box(c, 0, 0, W, o.h, th.head, { name: 'Header' });
    box(c, 0, o.h, W, u * 0.014, th.bar === th.bubble ? th.kicker : th.bar, { name: 'Accent edge' });
  }
  const k = text(c, o.kicker, x + u * 0.06, 0, w - u * 0.06, { font: th.kFont[0], weight: th.kFont[1], size: u * o.size * (o.kr ?? 0.42), fill: th.kicker, upper: true, spacing: u * 0.005, align: 'left', name: 'Kicker' });
  const s = text(c, o.sub, x, 0, w, { font: th.kFont[0], weight: 600, size: Math.max(u * o.size * (o.sr ?? 0.28), u * 0.024), fill: th.sub, upper: true, spacing: u * 0.004, align: 'left', name: 'Subtitle' });
  const room = slant ? o.h * 0.82 : o.h, g1 = u * 0.01, g2 = u * 0.022;
  const t = text(c, o.title, x, 0, w, { font: th.tFont[0], weight: th.tFont[1], size: u * o.size * (upper ? 1.1 : 1.25), fill: th.title, upper, lh: 1, lines: 2, maxH: room * 0.86 - k.h - s.h - g1 - g2, align: 'left', name: 'Title' });
  c.els.push(c.els.splice(c.els.indexOf(s), 1)[0]); // keep the layer order kicker → title → line
  const total = k.h + g1 + t.h + g2 + s.h;
  k.y = (room - total) / 2; t.y = k.y + k.h + g1; s.y = t.y + t.h + g2;
  box(c, x, k.y + k.h / 2 - u * 0.003, u * 0.045, u * 0.006, th.kicker, { name: 'Kicker bar' });
}
/** No band: spaced kicker between hairlines, a large serif title in the theme colour, the line underneath (weddings). */
function headerClean(c: Kit, th: Theme, o: Header): void {
  const { W, u } = c, upper = th.upper ?? true;
  const k = text(c, o.kicker, W * 0.25, 0, W * 0.5, { font: th.kFont[0], weight: th.kFont[1], size: u * o.size * (o.kr ?? 0.36), fill: th.kicker, upper: true, spacing: u * 0.008, name: 'Kicker' });
  const t = text(c, o.title, W * 0.08, 0, W * 0.84, { font: th.tFont[0], weight: th.tFont[1], size: u * o.size * 1.35, fill: th.head, upper, lh: 1, name: 'Title' });
  const s = text(c, o.sub, W * 0.12, 0, W * 0.76, { font: th.kFont[0], weight: 600, size: Math.max(u * o.size * (o.sr ?? 0.28), u * 0.024), fill: th.ink, upper: true, spacing: u * 0.005, name: 'Subtitle' });
  const g1 = u * 0.016, g2 = u * 0.03, total = k.h + g1 + t.h + g2 + s.h;
  k.y = (o.h - total) / 2 + u * 0.01; t.y = k.y + k.h + g1; s.y = t.y + t.h + g2;
  const lw = W * 0.12, ly = k.y + k.h / 2;
  box(c, W / 2 - W * 0.27 - lw, ly, lw, Math.max(2, u * 0.002), th.head, { name: 'Hairline' });
  box(c, W / 2 + W * 0.27, ly, lw, Math.max(2, u * 0.002), th.head, { name: 'Hairline' });
}

/** The closing line: a pill, or spaced capitals between two hairlines (`Theme.foot`). */
export function footer(c: Kit, th: Theme, s: string, y: number, h: number, w = c.W * 0.64, x = (c.W - w) / 2): void {
  if (th.foot === 'line') {
    const t = text(c, s, x, 0, w, { font: th.kFont[0], weight: 700, size: h * 0.46, fill: th.footer, upper: true, spacing: h * 0.05, name: 'Footer text' });
    t.y = y + (h - t.h) / 2;
    const tw = Math.min(w, widthOf(s.toUpperCase(), th.kFont[0], 700, t.size, false, t.letterSpacing)), lw = c.W * 0.06, gap = h * 0.5, ly = y + h / 2;
    box(c, x + (w - tw) / 2 - gap - lw, ly, lw, Math.max(2, c.u * 0.002), th.footer, { name: 'Hairline' });
    box(c, x + (w + tw) / 2 + gap, ly, lw, Math.max(2, c.u * 0.002), th.footer, { name: 'Hairline' });
    return;
  }
  box(c, x, y, w, h, th.footer, { radius: h / 2, name: 'Footer' });
  const t = text(c, s, x + h * 0.6, 0, w - h * 1.2, { font: th.kFont[0], weight: Math.max(700, th.kFont[1]), size: h * 0.44, fill: th.footerInk, upper: true, spacing: h * 0.02, name: 'Footer text' });
  t.y = y + (h - t.h) / 2;
}

export type Person = [name: string, role: string];
/** Cards in a grid between `top` and `bottom`, `cols` across; a short last row is centred; `tall` caps height ÷ width. */
function grid(c: Kit, th: Theme, people: Person[], cols: number, top: number, bottom: number, side: number, gap: number, tall = Infinity): void {
  const rows = Math.ceil(people.length / cols);
  const w = (c.W - side * 2 - gap * (cols - 1)) / cols;
  const h = Math.min(w * tall, (bottom - top - gap * (rows - 1)) / rows);
  const y0 = top + (bottom - top - (h * rows + gap * (rows - 1))) / 2;
  people.forEach(([n, r], i) => {
    const row = Math.floor(i / cols), inRow = Math.min(cols, people.length - row * cols);
    const x0 = (c.W - (inRow * w + (inRow - 1) * gap)) / 2;
    card(c, th, i, n, r, x0 + (i % cols) * (w + gap), y0 + row * (h + gap), w, h);
  });
}

interface Spot { kicker: string; title: string; sub: string; name: string; role: string; lines: [string, string][]; footer: string }
/** One person, tall pages (story): header, a big card, two "question → answer" lines, a closing line. */
function spotlight(c: Kit, th: Theme, o: Spot): void {
  const { W, H, u } = c;
  header(c, th, { kicker: o.kicker, title: o.title, sub: o.sub, h: H * 0.2, size: 0.12, kr: 0.36, sr: 0.24 });
  const w = W * 0.72, h = w * 1.18, y = H * 0.245;
  card(c, th, 0, o.name, o.role, (W - w) / 2, y, w, h);
  let ly = y + h + u * 0.075;
  const cap = th.card === 'caption', qx = cap ? (W - w) / 2 : W * 0.1, qw = cap ? w : W * 0.8, al = cap ? 'left' as const : 'center' as const;
  for (const [q, a] of o.lines) {
    const qe = text(c, q, qx, ly, qw, { font: th.kFont[0], weight: th.kFont[1], size: u * 0.032, fill: th.muted ?? th.frame, upper: true, spacing: u * 0.004, align: al, name: 'Question' });
    const ae = text(c, a, qx, qe.y + qe.h + u * 0.008, qw, { font: th.nFont, weight: 600, size: u * 0.046, fill: th.ink, lines: 2, lh: 1.2, align: al, name: 'Answer' });
    ly = ae.y + ae.h + u * 0.04;
  }
  footer(c, th, o.footer, H - u * 0.17, u * 0.085, W * 0.72);
}
/** One person, square pages: header, the card on the left, the words and the closing line on the right. */
function spotlightSquare(c: Kit, th: Theme, o: Spot): void {
  const { W, H, u } = c;
  header(c, th, { kicker: o.kicker, title: o.title, sub: o.sub, h: H * 0.25, size: 0.085, kr: 0.5, sr: 0.3 });
  const w = W * 0.4, h = w * 1.32, x = W * 0.08, y = H * 0.31;
  card(c, th, 0, o.name, o.role, x, y, w, h);
  const tx = W * 0.54, tw = W * 0.38;
  let ly = y + u * 0.01;
  for (const [q, a] of o.lines) {
    const qe = text(c, q, tx, ly, tw, { font: th.kFont[0], weight: th.kFont[1], size: u * 0.03, fill: th.frame, upper: true, spacing: u * 0.004, align: 'left', name: 'Label' });
    const ae = text(c, a, tx, qe.y + qe.h + u * 0.01, tw, { font: th.nFont, weight: 600, size: u * 0.042, fill: th.ink, lines: 3, lh: 1.22, align: 'left', name: 'About' });
    ly = ae.y + ae.h + u * 0.045;
  }
  footer(c, th, o.footer, y + h - u * 0.075, u * 0.075, tw, tx);
}
/** Wide pages (slides, banners): a coloured panel on the left with the words, the people in a grid on the right. */
function sideGrid(th: Theme, w: Words, ps: Person[], cols: number) {
  return (c: Kit) => {
    const { W, H, u } = c, pw = W * 0.34;
    box(c, 0, 0, pw, H, th.head, { name: 'Side panel' });

    box(c, pw - u * 0.012, 0, u * 0.012, H, th.bar === th.bubble ? th.kicker : th.bar, { name: 'Accent edge' });
    const x = W * 0.045, tw = pw - x * 1.8, upper = th.upper ?? true;
    const k = text(c, w.kicker, x, 0, tw, { font: th.kFont[0], weight: th.kFont[1], size: u * 0.04, fill: th.kicker, upper: true, spacing: u * 0.005, align: 'left', name: 'Kicker' });
    const t = text(c, w.title, x, 0, tw, { font: th.tFont[0], weight: th.tFont[1], size: u * (upper ? 0.105 : 0.12), fill: th.title, upper, lh: 1, lines: 3, align: 'left', name: 'Title' });
    const s = text(c, w.sub, x, 0, tw, { font: th.kFont[0], weight: 600, size: u * 0.03, fill: th.sub, upper: true, spacing: u * 0.003, lines: 2, lh: 1.3, align: 'left', name: 'Subtitle' });
    const total = k.h + t.h + s.h + u * 0.07;
    k.y = (H - total) / 2 - u * 0.04; t.y = k.y + k.h + u * 0.02; s.y = t.y + t.h + u * 0.05;
    box(c, x, s.y - u * 0.028, u * 0.07, u * 0.008, th.kicker, { name: 'Rule' });
    const f = text(c, w.footer, x, 0, tw, { font: th.kFont[0], weight: 700, size: u * 0.026, fill: th.kicker, upper: true, spacing: u * 0.003, lines: 2, lh: 1.3, align: 'left', name: 'Footer text' });
    f.y = H - u * 0.08 - f.h;
    // the grid lives in the space right of the panel
    const sub: Kit = { ...c, W: W - pw, els: [] };
    grid(sub, th, ps, cols, H * 0.08, H * 0.92, (W - pw) * 0.06, (W - pw) * 0.04);
    for (const e of sub.els) e.x += pw;
    c.els.push(...sub.els);
  };
}

export const tpl = (id: string, name: string, format: Format, use: Use, style: string, colors: string[], occasion: string, tags: string[], build: (c: Kit) => void, th: Theme): CollectionTemplate =>
  ({ id, name, format, use, style, colors, occasion, tags: [...tags, 'meet the team', 'team photos', 'photo grid'], build: (c) => { c.bg = th.page; build(c); } });

// Page plans shared by every theme: kicker / title / line on top, people in the middle, a pill at the bottom.
export interface Words { kicker: string; title: string; sub: string; footer: string }
const posterGrid = (th: Theme, w: Words, ps: Person[], cols = 3) => (c: Kit) => {
  const { W, H, u } = c;
  header(c, th, { ...w, h: H * 0.16, size: 0.08 });
  grid(c, th, ps, cols, H * 0.2 + (th.hs === 'slant' ? u * 0.03 : 0), H * 0.895, W * 0.06, W * 0.035);
  footer(c, th, w.footer, H * 0.915, u * 0.055);
};
const postGrid = (th: Theme, w: Words, ps: Person[], cols = 3, side = 0.06, tall = Infinity) => (c: Kit) => {
  const { W, H, u } = c;
  header(c, th, { ...w, h: H * 0.22, size: 0.075 });
  grid(c, th, ps, cols, H * 0.26 + (th.hs === 'slant' ? u * 0.03 : 0), H * 0.885, W * side, W * 0.035, tall);
  footer(c, th, w.footer, H * 0.905, u * 0.06, W * 0.7);
};
const flyerGrid = (th: Theme, w: Words, ps: Person[], cols: number) => (c: Kit) => {
  const { W, H, u } = c;
  header(c, th, { ...w, h: H * 0.17, size: 0.085 });
  grid(c, th, ps, cols, H * 0.21, H * 0.895, W * (cols > 2 ? 0.06 : 0.1), W * (cols > 2 ? 0.03 : 0.05));
  footer(c, th, w.footer, H * 0.915, u * 0.055);
};
export const NAMES = ['Jordan Lee', 'Amara Okafor', 'Sofia Martinez', 'Noah Bennett', 'Priya Sharma', 'Liam Walsh', 'Maya Chen', 'Ethan Brooks'];
export const people = (roles: string[], names = NAMES): Person[] => roles.map((r, i) => [names[i % names.length], r]);
const RA = 'Resident Assistant';
export const RA_TAGS = ['resident assistants', 'resident assistant', 'ra', 'ras', 'reslife', 'residence life', 'dorm', 'residence hall', 'housing', 'student staff', 'staff photos', 'college', 'university', 'campus', 'welcome week', 'orientation'];
const RA_WORDS: Words = { kicker: 'Meet your', title: 'Resident Assistants', sub: 'Your College Name  •  ResLife', footer: 'Here to help you feel at home' };
const PURPLE = ['purple', 'gold', 'white'];
const SIX_RAS = people(Array(6).fill(RA));

const RESLIFE: CollectionTemplate[] = [
  tpl('meet-your-resident-assistants', 'Meet Your Resident Assistants', 'poster', 'poster', 'Bold', PURPLE, 'announcement', [...RA_TAGS, 'poster', 'bulletin board', '6 photos'], posterGrid(T.reslife, RA_WORDS, SIX_RAS), T.reslife),
  tpl('meet-your-ras-post', 'Meet Your RAs Post', 'post', 'social', 'Bold', PURPLE, 'announcement', [...RA_TAGS, 'instagram', 'social post', '6 photos'], postGrid(T.reslife, RA_WORDS, SIX_RAS), T.reslife),
  tpl('meet-the-reslife-team-slide', 'Meet the ResLife Team Slide', 'slides', 'poster', 'Bold', PURPLE, 'presentation', [...RA_TAGS, 'presentation', 'slide', 'orientation slide', '6 photos'],
    sideGrid(T.reslife, { ...RA_WORDS, kicker: 'Meet the', title: 'ResLife Team' }, SIX_RAS, 3), T.reslife),
  tpl('meet-your-ra-spotlight-story', 'Meet Your RA Spotlight Story', 'story', 'social', 'Bold', PURPLE, 'announcement', [...RA_TAGS, 'story', 'spotlight', 'one person', 'fun fact'],
    (c) => spotlight(c, T.reslife, { kicker: 'Meet your', title: 'RA', sub: RA_WORDS.sub, name: NAMES[0], role: `${RA} · Floor 3`, lines: [['Ask me about', 'Study spots & campus events'], ['Fun fact', 'I make the best pancakes']], footer: 'My door is always open' }), T.reslife),
  tpl('meet-your-ras-four-flyer', 'Meet Your Floor RAs Flyer', 'flyer', 'flyer', 'Bold', PURPLE, 'announcement', [...RA_TAGS, 'flyer', 'floor', '4 photos'],
    flyerGrid(T.reslife, { ...RA_WORDS, title: 'Floor RAs', sub: 'Maple Hall  •  Floors 1–4' }, people(['RA · Floor 1', 'RA · Floor 2', 'RA · Floor 3', 'RA · Floor 4']), 2), T.reslife),
  tpl('meet-the-reslife-team-eight', 'Meet the ResLife Team Poster', 'poster', 'poster', 'Bold', PURPLE, 'announcement', [...RA_TAGS, 'poster', 'residence staff', '8 photos'],
    posterGrid(T.reslife, { ...RA_WORDS, kicker: 'Meet the', title: 'ResLife Team' }, people(['Hall Manager', 'Coordinator', RA, RA, RA, RA, RA, RA]), 3), T.reslife),
];

const SCHOOL_TAGS = ['school', 'students', 'staff photos', 'leadership', 'officers', 'executives'];
export const TEAM_SETS: { sub: string; label: string; cover: string; list: CollectionTemplate[] }[] = [
  { sub: 'residence-life', label: 'Residence Life', cover: 'meet-your-resident-assistants', list: RESLIFE },
  { sub: 'club', label: 'Club teams', cover: 'meet-the-club-executives', list: [
    tpl('meet-the-club-executives', 'Meet the Club Executives', 'post', 'social', 'Playful', ['teal', 'yellow', 'white'], 'club', [...SCHOOL_TAGS, 'club executives', 'club officers', 'club president', 'instagram', '4 photos'],
      postGrid(T.teal, { kicker: 'Meet the', title: 'Club Executives', sub: 'Robotics Club  •  2026–27', footer: 'Join us Wednesdays · Room 204' }, people(['President', 'Vice President', 'Treasurer', 'Secretary']), 2, 0.17), T.teal),
  ] },
  { sub: 'student-activity', label: 'Student leaders', cover: 'student-council-officers', list: [
    tpl('student-council-officers', 'Meet Your Student Council', 'poster', 'poster', 'Modern', ['navy', 'coral', 'white'], 'announcement', [...SCHOOL_TAGS, 'student council', 'student government', 'class officers', 'student union', 'poster', '6 photos'],
      posterGrid(T.coral, { kicker: 'Meet your', title: 'Student Council', sub: 'Lincoln High School  •  2026–27', footer: 'Your voice, our mission' }, people(['President', 'Vice President', 'Secretary', 'Treasurer', 'Events Lead', 'Outreach Lead'])), T.coral),
  ] },
  { sub: 'school-event', label: 'Meet the teachers', cover: 'meet-the-teachers', list: [
    tpl('meet-the-teachers', 'Meet the Teachers', 'flyer', 'flyer', 'Playful', ['teal', 'yellow', 'white'], 'event', ['meet the teachers', 'teachers', 'teacher', 'school staff', 'open house', 'back to school', 'elementary', 'faculty', 'flyer', '8 photos'],
      flyerGrid(T.teal, { kicker: 'Meet the', title: 'Teachers', sub: 'Lincoln Elementary  •  Open House', footer: 'Welcome back, families!' },
        people(['Kindergarten', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Music', 'Art'], ['Ms. Rivera', 'Mr. Okafor', 'Mrs. Chen', 'Mr. Bennett', 'Ms. Sharma', 'Mr. Walsh', 'Ms. Lopez', 'Mr. Brooks']), 3), T.teal),
  ] },
  { sub: 'announcement', label: 'Meet our team', cover: 'meet-our-team-banner', list: [
    tpl('meet-our-team-banner', 'Meet Our Team Banner', 'landscape', 'poster', 'Elegant', ['black', 'gold', 'cream'], 'announcement', ['our team', 'company team', 'staff', 'employees', 'about us', 'website banner', 'linkedin', 'business', '4 photos'],
      sideGrid(T.luxe, { kicker: 'Meet our', title: 'Team', sub: 'Studio North  •  Design & Branding', footer: 'Let’s create something great' }, people(['Founder & CEO', 'Creative Director', 'Lead Designer', 'Account Manager']), 2), T.luxe),
  ] },
  { sub: 'restaurant', label: 'Meet the crew', cover: 'meet-the-cafe-team', list: [
    tpl('meet-the-cafe-team', 'Meet the Café Team', 'post', 'social', 'Modern', ['green', 'cream'], 'announcement', ['cafe team', 'restaurant staff', 'our team', 'baristas', 'chef', 'small business', 'instagram', '4 photos'],
      postGrid(T.forest, { kicker: 'Meet the', title: 'Team', sub: 'Green Leaf Café  •  Since 2014', footer: 'Come say hi!' }, people(['Owner', 'Head Chef', 'Barista', 'Pastry Chef']), 2, 0.17), T.forest),
  ] },
  { sub: 'hiring', label: 'New hires', cover: 'welcome-new-hire-story', list: [
    tpl('welcome-new-hire-story', 'Welcome Our New Hire Story', 'story', 'social', 'Elegant', ['black', 'gold', 'cream'], 'announcement', ['new hire', 'welcome to the team', 'new employee', 'new team member', 'onboarding', 'staff', 'business', 'story', 'spotlight'],
      (c) => spotlight(c, T.luxe, { kicker: 'Please welcome', title: 'Our New Hire', sub: 'Studio North  •  October 2026', name: NAMES[6], role: 'Marketing Manager', lines: [['Joining us from', 'Bright Media Co.'], ['Ask me about', 'Hiking & great coffee']], footer: 'Welcome to the team!' }), T.luxe),
  ] },
  { sub: 'promotion', label: 'Staff spotlights', cover: 'employee-of-the-month', list: [
    tpl('employee-of-the-month', 'Employee of the Month', 'post', 'social', 'Modern', ['navy', 'coral', 'white'], 'announcement', ['employee of the month', 'staff spotlight', 'team member', 'recognition', 'award', 'shout out', 'business', 'instagram', 'spotlight'],
      (c) => spotlightSquare(c, T.coral, { kicker: 'Employee of the', title: 'Month', sub: 'October 2026  •  Studio North', name: NAMES[7], role: 'Customer Success', lines: [['Why we chose Ethan', 'Always the first to help a teammate.'], ['From all of us', 'Thank you for everything you do!']], footer: 'Well done!' }), T.coral),
  ] },
  { sub: 'basketball', label: 'Team rosters', cover: 'basketball-team-roster', list: [
    tpl('basketball-team-roster', 'Basketball Team Roster', 'poster', 'poster', 'Bold', ['red', 'black', 'white'], 'season', ['team roster', 'roster', 'players', 'varsity', 'squad', 'lineup', 'poster', '8 photos'],
      posterGrid(T.sport, { kicker: 'Meet the', title: 'Varsity Roster', sub: 'Riverside Hawks  •  2026–27 Season', footer: 'Go Hawks!' },
        people(['#4 · Guard', '#7 · Guard', '#11 · Forward', '#15 · Forward', '#21 · Center', '#23 · Guard', '#30 · Forward', '#34 · Center']), 3), T.sport),
  ] },
  { sub: 'soccer', label: 'Coaching staff', cover: 'soccer-coaching-staff', list: [
    tpl('soccer-coaching-staff', 'Meet the Coaching Staff', 'post', 'social', 'Bold', ['red', 'black', 'white'], 'season', ['coaching staff', 'coaches', 'head coach', 'meet the coaches', 'club staff', 'instagram', '3 photos'],
      postGrid(T.sport, { kicker: 'Meet the', title: 'Coaching Staff', sub: 'Riverside FC  •  2026 Season', footer: 'Train hard. Play together.' }, people(['Head Coach', 'Assistant Coach', 'Goalkeeper Coach'], ['Liam Walsh', 'Sofia Martinez', 'Noah Bennett']), 3, 0.06, 2.1), T.sport),
  ] },
  { sub: 'volunteering', label: 'Volunteers', cover: 'thank-you-volunteers', list: [
    tpl('thank-you-volunteers', 'Thank You Volunteers', 'poster', 'poster', 'Playful', ['blue', 'orange', 'white'], 'thanks', ['volunteers', 'thank you volunteers', 'volunteer appreciation', 'charity', 'nonprofit', 'food bank', 'community', 'poster', '6 photos'],
      posterGrid(T.sky, { kicker: 'Thank you to our', title: 'Volunteers', sub: 'Riverside Food Bank  •  Fall 2026', footer: 'We couldn’t do it without you' }, people(['Food Drive Lead', 'Sorting Team', 'Delivery Driver', 'Kitchen Helper', 'Youth Volunteer', 'Event Setup'])), T.sky),
    tpl('volunteer-spotlight-story', 'Volunteer Spotlight Story', 'story', 'social', 'Playful', ['blue', 'orange', 'white'], 'thanks', ['volunteer spotlight', 'volunteer of the month', 'volunteers', 'charity', 'nonprofit', 'community', 'story', 'spotlight'],
      (c) => spotlight(c, T.sky, { kicker: 'Volunteer', title: 'Spotlight', sub: 'Riverside Food Bank', name: NAMES[1], role: 'Volunteer since 2022', lines: [['Favourite task', 'Packing weekend meal kits'], ['Why I help', 'Everyone deserves a full plate']], footer: 'Join our team!' }), T.sky),
  ] },
  { sub: 'wedding', label: 'Wedding party', cover: 'meet-the-wedding-party', list: [
    tpl('meet-the-wedding-party', 'Meet the Wedding Party', 'poster', 'poster', 'Elegant', ['blush', 'mauve', 'cream'], 'wedding', ['wedding party', 'bridal party', 'bridesmaids', 'groomsmen', 'maid of honor', 'best man', 'wedding website', 'welcome sign', '6 photos'],
      posterGrid(T.blush, { kicker: 'Meet the', title: 'Wedding Party', sub: 'Sarah & James  •  June 20, 2027', footer: 'See you on the dance floor' },
        people(['Maid of Honor', 'Bridesmaid', 'Bridesmaid', 'Best Man', 'Groomsman', 'Groomsman'], ['Emma Rossi', 'Amara Okafor', 'Priya Sharma', 'Noah Bennett', 'Liam Walsh', 'Ethan Brooks'])), T.blush),
  ] },
  { sub: 'graduation', label: 'Senior spotlights', cover: 'senior-spotlight-story', list: [
    tpl('senior-spotlight-story', 'Senior Spotlight Story', 'story', 'social', 'Bold', ['navy', 'gold', 'white'], 'graduation', ['senior spotlight', 'graduate', 'class of 2027', 'senior', 'grad', 'yearbook', 'story', 'spotlight'],
      (c) => spotlight(c, T.grad, { kicker: 'Senior', title: 'Spotlight', sub: 'Lincoln High  •  Class of 2027', name: NAMES[4], role: 'Class of 2027', lines: [['Next stop', 'Studying nursing at State U'], ['Favourite memory', 'Winning the science fair']], footer: 'Congrats, grad!' }), T.grad),
  ] },
];

/** Every font these templates use (previews wait for them so text is measured exactly). */
export const TEAM_FONTS: [string, number][] = (() => {
  const out = new Map<string, [string, number]>();
  for (const th of Object.values(T)) {
    const fs: [string, number][] = [th.tFont, th.kFont, [th.kFont[0], 700], [th.kFont[0], Math.max(700, th.kFont[1])], [th.nFont, th.nW], [th.nFont, th.rW], [th.nFont, 600], [th.nFont, Math.max(500, th.rW)], [th.kFont[0], 600]];
    for (const f of fs) out.set(f.join(':'), f);
  }
  return [...out.values()];
})();
