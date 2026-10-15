/**
 * Everyday business & personal print — the kinds critic 2 found missing or thin: restaurant menus, logos, newsletters,
 * invoices, letterheads, planners & calendars, and a wedding stationery suite. Original layouts built only from
 * editable layers (shapes, live text in free Google fonts, tap-to-fill photo frames); sample names are fictional.
 * Documents (US Letter) and long menus are laid out with `fitPage` so the words always fit their page.
 */
import { box, text, type CollectionTemplate, type Kit } from './kit';
import { pic } from './teamStyles';
import { fitPage } from './careers';
import type { Format } from '../layouts';
import type { Fill } from '../../../editor/types';

const CLEAR = 'rgba(0,0,0,0)';
type Tint = [string, string, string];
const rule = (c: Kit, x: number, y: number, w: number, color: Fill, t = c.u * 0.003) => box(c, x, y, w, t, color, { name: 'Line' });
/** An outlined (not filled) shape. */
const outline = (c: Kit, x: number, y: number, w: number, h: number, color: string, width: number, o: { shape?: 'rect' | 'ellipse' | 'hexagon' | 'arch'; radius?: number; name?: string } = {}) =>
  box(c, x, y, w, h, CLEAR, { shape: o.shape ?? 'rect', stroke: color, strokeWidth: width, radius: o.radius ?? 0, name: o.name ?? 'Frame' });

const make = (occasion: string) => (id: string, name: string, format: Format, style: string, colors: string[], tags: string[], build: (c: Kit) => void, o: { fit?: boolean; more?: ((c: Kit) => void)[] } = {}): CollectionTemplate =>
  ({ id, name, format, style, colors, occasion, tags, build: o.fit ? (c) => fitPage(c, build) : build, more: o.more, use: format === 'post' || format === 'story' ? 'social' : undefined });

// ============================================================ menus
interface Dish { n: string; d?: string; p: string }
interface Menu { kicker: string; title: string; sub?: string; sections: [string, Dish[]][]; foot: string }
interface MenuLook { bg: string; ink: string; muted: string; accent: string; title: [string, number]; head: [string, number]; body: string; titleUpper?: boolean; frame?: string }

const BISTRO: Menu = {
  kicker: 'Dinner · Served from 5 PM', title: 'Maison Olive', sub: 'Seasonal French kitchen',
  sections: [
    ['To start', [{ n: 'Warm Sourdough & Cultured Butter', d: 'Sea salt, honey, thyme', p: '7' }, { n: 'French Onion Soup', d: 'Gruyère crouton, slow-cooked onions', p: '12' }, { n: 'Beet & Goat Cheese Salad', d: 'Walnuts, orange, little greens', p: '14' }]],
    ['Mains', [{ n: 'Steak Frites', d: 'Grilled hanger steak, herb butter, crisp fries', p: '32' }, { n: 'Roast Chicken', d: 'Lemon, garlic, pan juices, mashed potatoes', p: '27' }, { n: 'Wild Mushroom Risotto', d: 'Parmesan, truffle oil, chives', p: '24' }, { n: 'Seared Salmon', d: 'Lentils, spinach, beurre blanc', p: '29' }]],
    ['Dessert', [{ n: 'Crème Brûlée', d: 'Vanilla bean, caramel crust', p: '10' }, { n: 'Chocolate Mousse', d: 'Whipped cream, sea salt', p: '11' }]],
  ],
  foot: '214 Elm Street · (555) 010-2290 · maisonolive.com',
};
const BRUNCH: Menu = {
  kicker: 'Saturday & Sunday · 9 AM – 2 PM', title: 'Weekend Brunch', sub: 'Sunny Side Café',
  sections: [
    ['Eggs & Griddle', [{ n: 'Classic Benedict', d: 'Poached eggs, ham, hollandaise', p: '15' }, { n: 'Buttermilk Pancakes', d: 'Berries, maple, whipped butter', p: '13' }, { n: 'Avocado Toast', d: 'Chili flakes, lime, soft egg', p: '12' }, { n: 'Shakshuka', d: 'Spiced tomato, feta, warm bread', p: '14' }]],
    ['Bowls & Sides', [{ n: 'Granola Bowl', d: 'Yogurt, honey, fresh fruit', p: '10' }, { n: 'Crispy Potatoes', d: 'Rosemary salt, aioli', p: '6' }, { n: 'Smoked Bacon', p: '5' }]],
    ['Drinks', [{ n: 'Fresh Orange Juice', p: '5' }, { n: 'Oat Milk Latte', p: '5' }, { n: 'Sparkling Lemonade', p: '4' }, { n: 'Mimosa', p: '9' }]],
  ],
  foot: 'Ask about our gluten-free bread · sunnysidecafe.com',
};
const DRINKS: Menu = {
  kicker: 'Fresh every day', title: 'Coffee & Tea', sub: 'Little Bean Coffee House',
  sections: [
    ['Espresso bar', [{ n: 'Espresso', p: '3' }, { n: 'Cortado', p: '4' }, { n: 'Cappuccino', p: '4.5' }, { n: 'Flat White', p: '4.5' }, { n: 'Latte', p: '5' }, { n: 'Mocha', p: '5.5' }]],
    ['Tea & more', [{ n: 'Chai Latte', p: '5' }, { n: 'Matcha Latte', p: '5.5' }, { n: 'Loose-leaf Tea', p: '3.5' }, { n: 'Hot Chocolate', p: '4.5' }]],
    ['Extras', [{ n: 'Oat or almond milk', p: '0.75' }, { n: 'Extra shot', p: '1' }]],
  ],
  foot: 'Free Wi-Fi · Ask for our seasonal special',
};

/** A menu section: heading with a small rule, then each dish with its price on the right. Returns the next y. */
function menuSection(c: Kit, L: MenuLook, title: string, dishes: Dish[], x: number, y: number, w: number, center: boolean, s = 1): number {
  const u = c.u * s;
  const t = text(c, title, x, y, w, { font: L.head[0], weight: L.head[1], size: u * 0.036, fill: L.accent, upper: true, spacing: u * 0.006, align: center ? 'center' : 'left', name: 'Section' });
  const rw = u * 0.06;
  rule(c, center ? x + (w - rw) / 2 : x, t.y + t.h + u * 0.01, rw, L.accent, u * 0.003);
  y = t.y + t.h + u * 0.04;
  for (const d of dishes) {
    const n = text(c, d.n, x, y, w * 0.8, { font: L.body, weight: 700, size: u * 0.033, fill: L.ink, align: 'left', name: 'Dish' });
    text(c, d.p, x + w * 0.8, y, w * 0.2, { font: L.body, weight: 700, size: u * 0.033, fill: L.ink, align: 'right', name: 'Price' });
    y = n.y + n.h + u * 0.006;
    if (d.d) { const e = text(c, d.d, x, y, w * 0.8, { font: L.body, weight: 500, size: u * 0.025, fill: L.muted, lines: 2, lh: 1.3, align: 'left', italic: true, name: 'Description' }); y = e.y + e.h; }
    y += u * 0.032;
  }
  return y + u * 0.035;
}
/** One calm column, centred header with an ornament, a thin frame round the page. */
function menuClassic(c: Kit, L: MenuLook, m: Menu): void {
  const { W, H, u } = c;
  c.bg = L.bg;
  outline(c, W * 0.04, W * 0.04, W * 0.92, H - W * 0.08, L.frame ?? L.accent, u * 0.003, { name: 'Page frame' });
  const x = W * 0.14, w = W * 0.72;
  const k = text(c, m.kicker, x, u * 0.12, w, { font: L.body, weight: 700, size: u * 0.02, fill: L.accent, upper: true, spacing: u * 0.006, name: 'Kicker' });
  const t = text(c, m.title, x, k.y + k.h + u * 0.02, w, { font: L.title[0], weight: L.title[1], size: u * 0.1, fill: L.ink, upper: L.titleUpper, name: 'Restaurant name' });
  let y = t.y + t.h + u * 0.012;
  if (m.sub) { const s = text(c, m.sub, x, y, w, { font: L.title[0], weight: 400, size: u * 0.03, fill: L.muted, italic: true, name: 'Tagline' }); y = s.y + s.h; }
  y += u * 0.035;
  const d = u * 0.018;
  rule(c, W / 2 - u * 0.16, y + d / 2, u * 0.12, L.accent, u * 0.002);
  box(c, W / 2 - d / 2, y, d, d, L.accent, { shape: 'diamond', name: 'Ornament' });
  rule(c, W / 2 + u * 0.04, y + d / 2, u * 0.12, L.accent, u * 0.002);
  y += d + u * 0.06;
  for (const [title, dishes] of m.sections) y = menuSection(c, L, title, dishes, x, y, w, true);
  text(c, m.foot, x, y + u * 0.01, w, { font: L.body, weight: 600, size: u * 0.019, fill: L.muted, name: 'Address' });
}
/** Coloured header band with the name, a wide photo, then the sections in two columns. */
function menuTwoCol(c: Kit, L: MenuLook, m: Menu, band: string, tint: Tint): void {
  const { W, u } = c;
  c.bg = L.bg;
  const bh = u * 0.3;
  box(c, 0, 0, W, bh, band, { name: 'Header band' });
  const k = text(c, m.kicker, W * 0.08, u * 0.06, W * 0.84, { font: L.body, weight: 700, size: u * 0.021, fill: L.bg, upper: true, spacing: u * 0.006, name: 'Kicker' });
  const t = text(c, m.title, W * 0.08, k.y + k.h + u * 0.015, W * 0.84, { font: L.title[0], weight: L.title[1], size: u * 0.1, fill: '#ffffff', upper: L.titleUpper, name: 'Menu title' });
  if (m.sub) text(c, m.sub, W * 0.08, t.y + t.h + u * 0.01, W * 0.84, { font: L.body, weight: 600, size: u * 0.026, fill: L.bg, name: 'Café name' });
  const ph = u * 0.26;
  pic(c, 'menu-brunch', tint, 0, W * 0.08, bh + u * 0.05, W * 0.84, ph, 'none', u * 0.03);
  const top = bh + u * 0.05 + ph + u * 0.07, gap = W * 0.06, cw = (W * 0.84 - gap) / 2;
  let yl = top, yr = top;
  m.sections.forEach(([title, dishes], i) => {
    if (i === 0) yl = menuSection(c, L, title, dishes, W * 0.08, yl, cw, false, 0.95);
    else yr = menuSection(c, L, title, dishes, W * 0.08 + cw + gap, yr, cw, false, 0.95);
  });
  text(c, m.foot, W * 0.08, Math.max(yl, yr) + u * 0.01, W * 0.84, { font: L.body, weight: 600, size: u * 0.019, fill: L.muted, name: 'Note' });
}
/** Chalkboard drinks board: hand-lettered title, two columns of drinks, all in light ink on slate. */
function menuBoard(c: Kit, m: Menu): void {
  const { W, H, u } = c, chalk = '#f4f1e8', yellow = '#f6d36b', pink = '#f4a9b8';
  c.bg = '#26302f';
  outline(c, W * 0.035, W * 0.035, W * 0.93, H - W * 0.07, '#8a6a4a', u * 0.018, { radius: u * 0.01, name: 'Wood frame' });
  outline(c, W * 0.07, W * 0.07, W * 0.86, H - W * 0.14, 'rgba(244,241,232,0.35)', u * 0.0025, { radius: u * 0.01, name: 'Chalk border' });
  const x = W * 0.12, w = W * 0.76;
  const k = text(c, m.kicker, x, u * 0.13, w, { font: 'Amatic SC', weight: 700, size: u * 0.045, fill: pink, spacing: u * 0.004, name: 'Kicker' });
  const t = text(c, m.title, x, k.y + k.h, w, { font: 'Caveat', weight: 700, size: u * 0.16, fill: chalk, name: 'Board title' });
  const s = text(c, m.sub ?? '', x, t.y + t.h, w, { font: 'Amatic SC', weight: 700, size: u * 0.045, fill: yellow, spacing: u * 0.003, name: 'Shop name' });
  let y = s.y + s.h + u * 0.08;
  for (const [title, dishes] of m.sections) {
    const h = text(c, title, x, y, w, { font: 'Amatic SC', weight: 700, size: u * 0.075, fill: yellow, spacing: u * 0.004, name: 'Section' });
    y = h.y + h.h + u * 0.02;
    const half = Math.ceil(dishes.length / 2), cw = w * 0.46;
    dishes.forEach((d, i) => {
      const cx = i < half ? x : x + w * 0.54, cy = y + (i % half) * u * 0.075;
      text(c, d.n, cx, cy, cw * 0.74, { font: 'Nunito', weight: 700, size: u * 0.038, fill: chalk, align: 'left', name: 'Drink' });
      text(c, d.p, cx + cw * 0.74, cy, cw * 0.26, { font: 'Nunito', weight: 800, size: u * 0.038, fill: pink, align: 'right', name: 'Price' });
    });
    y += half * u * 0.075 + u * 0.07;
  }
  text(c, m.foot, x, y, w, { font: 'Caveat', weight: 700, size: u * 0.045, fill: chalk, name: 'Note' });
}
/** Today's special: a big photo, then the dish, a line about it and the price. */
function menuSpecial(c: Kit, tint: Tint, ink: string, accent: string, panel: string): void {
  const { W, H, u } = c;
  c.bg = panel;
  pic(c, 'menu-special', tint, 1, 0, 0, W, H * 0.56, 'none');
  const tagW = u * 0.36;
  box(c, W * 0.07, H * 0.56 - u * 0.04, tagW, u * 0.08, accent, { radius: u * 0.04, name: 'Tag' });
  const tg = text(c, "Chef's special", W * 0.07, 0, tagW, { font: 'Montserrat', weight: 800, size: u * 0.03, fill: '#ffffff', upper: true, spacing: u * 0.003, name: 'Tag text' });
  tg.y = H * 0.56 - tg.h / 2;
  const n = text(c, 'Lemon Herb Salmon', W * 0.07, H * 0.62, W * 0.86, { font: 'Playfair Display', weight: 800, size: u * 0.085, fill: ink, align: 'left', name: 'Dish' });
  const d = text(c, 'Crispy skin, spring greens, new potatoes and a bright lemon-caper butter.', W * 0.07, n.y + n.h + u * 0.015, W * 0.62, { font: 'Inter', weight: 500, size: u * 0.032, fill: ink, lines: 3, lh: 1.35, align: 'left', name: 'Description' });
  text(c, '$24', W * 0.7, d.y, W * 0.23, { font: 'Playfair Display', weight: 800, size: u * 0.11, fill: accent, align: 'right', name: 'Price' });
  text(c, 'Tonight only · while it lasts', W * 0.07, H - u * 0.09, W * 0.86, { font: 'Inter', weight: 700, size: u * 0.026, fill: accent, upper: true, spacing: u * 0.004, align: 'left', name: 'Note' });
}

// ============================================================ logos (square)
function logoMonogram(c: Kit): void {
  const { W, u } = c, ink = '#1f4d3a', cream = '#f5efe3';
  c.bg = cream;
  const r = u * 0.26;
  outline(c, W / 2 - r, u * 0.2, r * 2, r * 2, ink, u * 0.012, { shape: 'ellipse', name: 'Ring' });
  outline(c, W / 2 - r * 0.88, u * 0.2 + r * 0.12, r * 1.76, r * 1.76, ink, u * 0.003, { shape: 'ellipse', name: 'Inner ring' });
  const m = text(c, 'HC', W / 2 - r, 0, r * 2, { font: 'Playfair Display', weight: 700, size: u * 0.2, fill: ink, name: 'Monogram' });
  m.y = u * 0.2 + r - m.h / 2;
  const n = text(c, 'Harbor Coffee', W * 0.1, u * 0.2 + r * 2 + u * 0.06, W * 0.8, { font: 'Cormorant Garamond', weight: 700, size: u * 0.085, fill: ink, upper: true, spacing: u * 0.01, name: 'Business name' });
  text(c, 'Roasters · Est. 2026', W * 0.1, n.y + n.h + u * 0.015, W * 0.8, { font: 'Montserrat', weight: 600, size: u * 0.028, fill: '#a0703c', upper: true, spacing: u * 0.008, name: 'Tagline' });
}
function logoBadge(c: Kit): void {
  const { W, u } = c, gold = '#e8b84a';
  c.bg = '#14213d';
  const sz = u * 0.5, x = (W - sz) / 2, y = u * 0.1;
  outline(c, x, y, sz, sz, gold, u * 0.014, { shape: 'hexagon', name: 'Badge' });
  outline(c, x + sz * 0.07, y + sz * 0.07, sz * 0.86, sz * 0.86, 'rgba(232,184,74,0.45)', u * 0.003, { shape: 'hexagon', name: 'Inner badge' });
  box(c, W / 2 - u * 0.035, y + sz * 0.17, u * 0.07, u * 0.07, gold, { shape: 'star', name: 'Star' });
  const p = text(c, 'P', x, 0, sz, { font: 'Anton', weight: 400, size: u * 0.22, fill: gold, name: 'Initial' });
  p.y = y + sz * 0.56 - p.h / 2 + u * 0.03;
  const n = text(c, 'Peak Fitness', W * 0.08, y + sz + u * 0.06, W * 0.84, { font: 'Oswald', weight: 700, size: u * 0.11, fill: '#ffffff', upper: true, spacing: u * 0.012, name: 'Business name' });
  text(c, 'Train · Grow · Repeat', W * 0.1, n.y + n.h + u * 0.025, W * 0.8, { font: 'Oswald', weight: 500, size: u * 0.036, fill: gold, upper: true, spacing: u * 0.014, name: 'Tagline' });
}
function logoWordmark(c: Kit): void {
  const { W, u } = c, coral = '#e5674f', leaf = '#4f8a5b';
  c.bg = '#ffffff';
  const t = text(c, 'bloom', W * 0.12, 0, W * 0.7, { font: 'Fredoka', weight: 700, size: u * 0.26, fill: coral, name: 'Wordmark' });
  t.y = u * 0.34;
  const d = u * 0.065;
  box(c, W * 0.12 + W * 0.7 + u * 0.005, t.y + t.h - d * 1.6, d, d, leaf, { shape: 'ellipse', name: 'Dot' });
  text(c, 'Flower Studio', W * 0.1, t.y + t.h + u * 0.04, W * 0.8, { font: 'Montserrat', weight: 600, size: u * 0.035, fill: '#3d3d3d', upper: true, spacing: u * 0.016, name: 'Tagline' });
}
function logoStacked(c: Kit): void {
  const { W, u } = c, sea = '#2ec4b6';
  c.bg = '#0f0f12';
  const a = text(c, 'North', W * 0.15, u * 0.2, W * 0.7, { font: 'Anton', weight: 400, size: u * 0.24, fill: '#ffffff', upper: true, spacing: u * 0.01, name: 'Name line 1' });
  box(c, W * 0.15, a.y + a.h + u * 0.02, W * 0.7, u * 0.025, sea, { name: 'Bar' });
  const b = text(c, 'Side', W * 0.15, a.y + a.h + u * 0.08, W * 0.7, { font: 'Anton', weight: 400, size: u * 0.24, fill: '#ffffff', upper: true, spacing: u * 0.01, name: 'Name line 2' });
  text(c, 'Surf Co. — Since 2026', W * 0.15, b.y + b.h + u * 0.04, W * 0.7, { font: 'Space Grotesk', weight: 700, size: u * 0.035, fill: sea, upper: true, spacing: u * 0.01, name: 'Tagline' });
}
function logoBakery(c: Kit): void {
  const { W, u } = c, terra = '#c8664a';
  c.bg = '#fbf3e6';
  const aw = u * 0.6, ah = u * 0.62, x = (W - aw) / 2, y = u * 0.12;
  box(c, x, y, aw, ah, terra, { shape: 'arch', name: 'Arch' });
  outline(c, x + u * 0.025, y + u * 0.025, aw - u * 0.05, ah - u * 0.025, 'rgba(255,255,255,0.7)', u * 0.004, { shape: 'arch', name: 'Arch line' });
  const n = text(c, 'Sweet Crumb', x + aw * 0.08, 0, aw * 0.84, { font: 'Pacifico', weight: 400, size: u * 0.1, fill: '#ffffff', lines: 2, lh: 1.1, name: 'Business name' });
  n.y = y + ah * 0.55 - n.h / 2;
  const b = text(c, 'Bakery', W * 0.1, y + ah + u * 0.05, W * 0.8, { font: 'Cinzel', weight: 700, size: u * 0.07, fill: '#5b3a29', spacing: u * 0.03, name: 'Kind' });
  text(c, 'Fresh bread every morning', W * 0.1, b.y + b.h + u * 0.012, W * 0.8, { font: 'Cormorant Garamond', weight: 600, size: u * 0.04, fill: terra, italic: true, name: 'Tagline' });
}
function logoTech(c: Kit): void {
  const { W, u } = c, indigo = '#3a5bd9';
  c.bg = '#f4f6fb';
  const s = u * 0.22, x = W * 0.12, y = u * 0.39;
  box(c, x, y, s, s, indigo, { radius: s * 0.26, name: 'Icon' });
  box(c, x + s * 0.24, y + s * 0.24, s * 0.52, s * 0.52, '#ffffff', { shape: 'hexagon', name: 'Icon mark' });
  box(c, x + s * 0.39, y + s * 0.39, s * 0.22, s * 0.22, indigo, { shape: 'ellipse', name: 'Icon dot' });
  const t = text(c, 'Nexa Labs', x + s + u * 0.05, 0, W * 0.88 - (x + s + u * 0.05), { font: 'Space Grotesk', weight: 700, size: u * 0.13, fill: '#151a2d', align: 'left', name: 'Business name' });
  t.y = y + s / 2 - t.h / 2 - u * 0.015;
  text(c, 'Software for small teams', x + s + u * 0.05, t.y + t.h, W * 0.88 - (x + s + u * 0.05), { font: 'Inter', weight: 600, size: u * 0.032, fill: '#6b7280', align: 'left', name: 'Tagline' });
}

// ============================================================ newsletter (document)
interface NewsLook { band: string; bandInk: string; accent: string; ink: string; muted: string; head: [string, number]; body: string; tint: Tint; bg: string }
const story = (c: Kit, L: NewsLook, h: string, b: string, x: number, y: number, w: number): number => {
  const t = text(c, h, x, y, w, { font: L.head[0], weight: L.head[1], size: c.u * 0.034, fill: L.ink, lines: 2, lh: 1.15, align: 'left', name: 'Story headline' });
  const p = text(c, b, x, t.y + t.h + c.u * 0.012, w, { font: L.body, weight: 500, size: c.u * 0.021, fill: L.muted, lines: 6, lh: 1.5, align: 'left', name: 'Story' });
  return p.y + p.h + c.u * 0.045;
};
function newsletter(c: Kit, L: NewsLook, w0: { name: string; issue: string; feature: [string, string]; stories: [string, string][]; foot: string }): void {
  const { W, u } = c;
  c.bg = L.bg;
  const bh = u * 0.22;
  box(c, 0, 0, W, bh, L.band, { name: 'Masthead' });
  const n = text(c, w0.name, W * 0.07, u * 0.045, W * 0.86, { font: L.head[0], weight: L.head[1], size: u * 0.1, fill: L.bandInk, align: 'left', name: 'Newsletter name' });
  text(c, w0.issue, W * 0.07, n.y + n.h + u * 0.01, W * 0.86, { font: L.body, weight: 700, size: u * 0.021, fill: L.accent, upper: true, spacing: u * 0.005, align: 'left', name: 'Issue' });
  const x = W * 0.07, w = W * 0.86;
  let y = bh + u * 0.05;
  const k = text(c, 'Feature story', x, y, w, { font: L.body, weight: 800, size: u * 0.019, fill: L.accent, upper: true, spacing: u * 0.006, align: 'left', name: 'Label' });
  const pw = w * 0.46;
  pic(c, `news-${L.band.slice(1)}`, L.tint, 0, x, k.y + k.h + u * 0.02, pw, pw * 0.75, 'none', u * 0.02);
  const fx = x + pw + w * 0.04, fw = w - pw - w * 0.04;
  const ft = text(c, w0.feature[0], fx, k.y + k.h + u * 0.02, fw, { font: L.head[0], weight: L.head[1], size: u * 0.05, fill: L.ink, lines: 3, lh: 1.1, align: 'left', name: 'Feature headline' });
  text(c, w0.feature[1], fx, ft.y + ft.h + u * 0.015, fw, { font: L.body, weight: 500, size: u * 0.021, fill: L.muted, lines: 8, lh: 1.5, align: 'left', name: 'Feature story' });
  y = k.y + k.h + u * 0.02 + pw * 0.75 + u * 0.05;
  rule(c, x, y, w, 'rgba(0,0,0,0.12)', u * 0.002);
  y += u * 0.045;
  const cw = (w - w * 0.06) / 2;
  let yl = y, yr = y;
  w0.stories.forEach(([h, b], i) => { if (i % 2 === 0) yl = story(c, L, h, b, x, yl, cw); else yr = story(c, L, h, b, x + cw + w * 0.06, yr, cw); });
  y = Math.max(yl, yr);
  box(c, x, y, w, u * 0.09, L.band, { radius: u * 0.015, name: 'Footer' });
  const f = text(c, w0.foot, x + w * 0.04, 0, w * 0.92, { font: L.body, weight: 700, size: u * 0.021, fill: L.bandInk, name: 'Contact' });
  f.y = y + u * 0.045 - f.h / 2;
}

// ============================================================ invoice (document)
interface InvLook { accent: string; ink: string; muted: string; head: [string, number]; body: string; band: boolean }
function invoice(c: Kit, L: InvLook): void {
  const { W, u } = c, x = W * 0.08, w = W * 0.84;
  c.bg = '#ffffff';
  if (L.band) box(c, 0, 0, W, u * 0.025, L.accent, { name: 'Top bar' });
  const co = text(c, 'Studio Lark', x, u * 0.09, w * 0.5, { font: L.head[0], weight: L.head[1], size: u * 0.05, fill: L.ink, align: 'left', name: 'Company' });
  text(c, '88 Market Street, Suite 4\nSeattle, WA 98101\nhello@studiolark.com', x, co.y + co.h + u * 0.012, w * 0.5, { font: L.body, weight: 500, size: u * 0.02, fill: L.muted, lines: 3, lh: 1.45, align: 'left', name: 'Company address' });
  text(c, 'Invoice', x + w * 0.5, u * 0.085, w * 0.5, { font: L.head[0], weight: L.head[1], size: u * 0.085, fill: L.accent, upper: true, align: 'right', name: 'Title' });
  // bill to + details
  let y = u * 0.33;
  text(c, 'Bill to', x, y, w * 0.4, { font: L.body, weight: 800, size: u * 0.019, fill: L.accent, upper: true, spacing: u * 0.005, align: 'left', name: 'Label' });
  text(c, 'Greenleaf Market\nAttn: Priya Shah\n12 Orchard Lane, Portland, OR', x, y + u * 0.035, w * 0.45, { font: L.body, weight: 600, size: u * 0.021, fill: L.ink, lines: 3, lh: 1.45, align: 'left', name: 'Client' });
  const facts: [string, string][] = [['Invoice no.', 'INV-1042'], ['Date', 'Nov 2, 2026'], ['Due', 'Dec 2, 2026']];
  facts.forEach(([k, v], i) => {
    text(c, k, x + w * 0.55, y + i * u * 0.04, w * 0.22, { font: L.body, weight: 600, size: u * 0.021, fill: L.muted, align: 'left', name: 'Label' });
    text(c, v, x + w * 0.77, y + i * u * 0.04, w * 0.23, { font: L.body, weight: 700, size: u * 0.021, fill: L.ink, align: 'right', name: 'Value' });
  });
  // table
  y = u * 0.52;
  const cols = [0, 0.5, 0.62, 0.78];
  const rh = u * 0.07;
  box(c, x, y, w, rh, L.band ? L.accent : L.ink, { radius: u * 0.008, name: 'Table header' });
  ['Description', 'Qty', 'Rate', 'Amount'].forEach((s, i) => {
    const t = text(c, s, x + w * cols[i] + u * 0.02, 0, w * ((cols[i + 1] ?? 1) - cols[i]) - u * 0.04, { font: L.body, weight: 800, size: u * 0.02, fill: '#ffffff', upper: true, spacing: u * 0.003, align: i ? 'right' : 'left', name: 'Column' });
    t.y = y + rh / 2 - t.h / 2;
  });
  const rows: [string, string, string, string][] = [['Brand identity design', '1', '$1,800', '$1,800'], ['Website design (5 pages)', '1', '$2,400', '$2,400'], ['Product photos', '12', '$45', '$540'], ['Printed menus', '200', '$2', '$400']];
  y += rh;
  rows.forEach((r, j) => {
    if (j % 2) box(c, x, y, w, rh, 'rgba(0,0,0,0.035)', { name: 'Row shade' });
    r.forEach((s, i) => {
      const t = text(c, s, x + w * cols[i] + u * 0.02, 0, w * ((cols[i + 1] ?? 1) - cols[i]) - u * 0.04, { font: L.body, weight: i ? 600 : 700, size: u * 0.021, fill: L.ink, align: i ? 'right' : 'left', name: 'Cell' });
      t.y = y + rh / 2 - t.h / 2;
    });
    y += rh;
  });
  rule(c, x, y, w, 'rgba(0,0,0,0.15)', u * 0.002);
  // totals
  y += u * 0.04;
  const tx = x + w * 0.55, tw = w * 0.45;
  [['Subtotal', '$5,140'], ['Tax (8%)', '$411.20']].forEach(([k, v]) => {
    text(c, k, tx, y, tw * 0.5, { font: L.body, weight: 600, size: u * 0.021, fill: L.muted, align: 'left', name: 'Label' });
    text(c, v, tx + tw * 0.5, y, tw * 0.5, { font: L.body, weight: 700, size: u * 0.021, fill: L.ink, align: 'right', name: 'Value' });
    y += u * 0.042;
  });
  box(c, tx, y, tw, u * 0.08, L.accent, { radius: u * 0.012, name: 'Total box' });
  const tl = text(c, 'Total due', tx + u * 0.025, 0, tw * 0.5, { font: L.body, weight: 800, size: u * 0.024, fill: '#ffffff', upper: true, align: 'left', name: 'Label' });
  tl.y = y + u * 0.04 - tl.h / 2;
  const tv = text(c, '$5,551.20', tx + tw * 0.45, 0, tw * 0.55 - u * 0.025, { font: L.head[0], weight: L.head[1], size: u * 0.034, fill: '#ffffff', align: 'right', name: 'Total' });
  tv.y = y + u * 0.04 - tv.h / 2;
  // payment + thanks
  y += u * 0.12;
  text(c, 'Payment', x, y, w * 0.5, { font: L.body, weight: 800, size: u * 0.019, fill: L.accent, upper: true, spacing: u * 0.005, align: 'left', name: 'Label' });
  text(c, 'Bank transfer · Account 0012 3456 7890\nPlease pay within 30 days. Thank you!', x, y + u * 0.035, w * 0.6, { font: L.body, weight: 500, size: u * 0.02, fill: L.muted, lines: 2, lh: 1.5, align: 'left', name: 'Payment details' });
  text(c, 'Thank you for your business', x, y + u * 0.14, w, { font: L.head[0], weight: L.head[1], size: u * 0.035, fill: L.ink, name: 'Thank you' });
}

// ============================================================ letterhead (document)
function letterhead(c: Kit, accent: string, ink: string, head: [string, number], name: string, initials: string, side: boolean): void {
  const { W, H, u } = c, muted = '#6b7280', body = 'Inter';
  c.bg = '#ffffff';
  if (side) box(c, 0, 0, u * 0.03, H, accent, { name: 'Side bar' });
  const s = u * 0.1, x = W * 0.09;
  box(c, x, u * 0.08, s, s, accent, { shape: side ? 'rect' : 'ellipse', radius: side ? s * 0.2 : 0, name: 'Logo mark' });
  const m = text(c, initials, x, 0, s, { font: head[0], weight: head[1], size: u * 0.05, fill: '#ffffff', name: 'Initials' });
  m.y = u * 0.08 + s / 2 - m.h / 2;
  const n = text(c, name, x + s + u * 0.03, 0, W * 0.45, { font: head[0], weight: head[1], size: u * 0.042, fill: ink, align: 'left', name: 'Company' });
  n.y = u * 0.08 + s / 2 - n.h / 2;
  text(c, '(555) 010-6620\nhello@company.com\n410 Bay Street, Boston, MA', W * 0.55, u * 0.08, W * 0.36, { font: body, weight: 500, size: u * 0.018, fill: muted, lines: 3, lh: 1.5, align: 'right', name: 'Contact' });
  rule(c, x, u * 0.22, W - x * 2, accent, u * 0.003);
  const w = W - x * 2;
  let y = u * 0.3;
  const d = text(c, 'November 2, 2026', x, y, w, { font: body, weight: 600, size: u * 0.021, fill: ink, align: 'left', name: 'Date' });
  const a = text(c, 'Dear Ms. Alvarez,', x, d.y + d.h + u * 0.05, w, { font: body, weight: 600, size: u * 0.022, fill: ink, align: 'left', name: 'Greeting' });
  y = a.y + a.h + u * 0.03;
  for (const p of [
    'Thank you for meeting with us last week. It was a pleasure to learn more about your plans for the new studio and the community you hope to build there.',
    'As promised, we have attached a short proposal with two options, a timeline and a clear budget. Both options can start in January and finish before spring.',
    'Please let me know if you have any questions or would like to talk through the details. We look forward to working together.',
  ]) { const t = text(c, p, x, y, w, { font: body, weight: 500, size: u * 0.022, fill: ink, lines: 4, lh: 1.6, align: 'left', name: 'Paragraph' }); y = t.y + t.h + u * 0.025; }
  const k = text(c, 'Warm regards,', x, y + u * 0.02, w, { font: body, weight: 500, size: u * 0.022, fill: ink, align: 'left', name: 'Closing' });
  const sg = text(c, 'Daniel Okafor', x, k.y + k.h + u * 0.02, w * 0.5, { font: 'Great Vibes', weight: 400, size: u * 0.06, fill: accent, align: 'left', name: 'Signature' });
  text(c, 'Daniel Okafor · Founder', x, sg.y + sg.h + u * 0.005, w, { font: body, weight: 700, size: u * 0.02, fill: ink, align: 'left', name: 'Signer' });
  box(c, 0, H - u * 0.06, W, u * 0.06, side ? '#f3f4f6' : accent, { name: 'Footer band' });
  const f = text(c, 'www.company.com', x, 0, W - x * 2, { font: body, weight: 700, size: u * 0.018, fill: side ? muted : '#ffffff', spacing: u * 0.004, upper: true, name: 'Website' });
  f.y = H - u * 0.03 - f.h / 2;
}

// ============================================================ planners & calendars (document)
interface PlanLook { accent: string; soft: string; ink: string; muted: string; head: [string, number]; body: string; bg: string }
const lines = (c: Kit, x: number, y: number, w: number, n: number, gap: number, color: string) => { for (let i = 0; i < n; i++) rule(c, x, y + i * gap, w, color, c.u * 0.0018); };
function weekly(c: Kit, L: PlanLook): void {
  const { W, H, u } = c, x = W * 0.07, w = W * 0.86;
  c.bg = L.bg;
  const t = text(c, 'This Week', x, u * 0.07, w * 0.6, { font: L.head[0], weight: L.head[1], size: u * 0.09, fill: L.ink, align: 'left', name: 'Title' });
  text(c, 'Week of ________', x + w * 0.6, t.y + t.h * 0.45, w * 0.4, { font: L.body, weight: 600, size: u * 0.022, fill: L.muted, align: 'right', name: 'Week of' });
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'Notes'];
  const top = t.y + t.h + u * 0.05, gap = u * 0.025, cw = (w - gap) / 2, ch = (H - top - u * 0.07 - gap * 3) / 4;
  days.forEach((d, i) => {
    const cx = x + (i % 2) * (cw + gap), cy = top + Math.floor(i / 2) * (ch + gap), notes = i === 7;
    box(c, cx, cy, cw, ch, notes ? L.soft : '#ffffff', { radius: u * 0.018, stroke: L.soft, strokeWidth: u * 0.003, name: 'Day box' });
    box(c, cx, cy, cw, u * 0.062, notes ? L.accent : L.soft, { radius: u * 0.018, name: 'Day header' });
    const dt = text(c, d, cx + u * 0.025, 0, cw - u * 0.05, { font: L.body, weight: 800, size: u * 0.022, fill: notes ? '#ffffff' : L.ink, upper: true, spacing: u * 0.004, align: 'left', name: 'Day' });
    dt.y = cy + u * 0.031 - dt.h / 2;
    lines(c, cx + u * 0.025, cy + u * 0.12, cw - u * 0.05, Math.floor((ch - u * 0.12) / (u * 0.05)), u * 0.05, 'rgba(0,0,0,0.12)');
  });
}
function monthly(c: Kit, L: PlanLook, year: number, month: number): void {
  const { W, H, u } = c, x = W * 0.06, w = W * 0.88;
  c.bg = L.bg;
  const name = new Date(Date.UTC(year, month, 1)).toLocaleString('en-US', { month: 'long', timeZone: 'UTC' });
  const t = text(c, name, x, u * 0.07, w * 0.7, { font: L.head[0], weight: L.head[1], size: u * 0.11, fill: L.ink, align: 'left', name: 'Month' });
  text(c, String(year), x + w * 0.7, t.y + t.h * 0.3, w * 0.3, { font: L.head[0], weight: L.head[1], size: u * 0.06, fill: L.accent, align: 'right', name: 'Year' });
  const top = t.y + t.h + u * 0.05, cw = w / 7;
  ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach((d, i) => {
    box(c, x + i * cw + u * 0.004, top, cw - u * 0.008, u * 0.06, L.accent, { radius: u * 0.012, name: 'Weekday' });
    const dt = text(c, d, x + i * cw, 0, cw, { font: L.body, weight: 800, size: u * 0.022, fill: '#ffffff', upper: true, spacing: u * 0.003, name: 'Weekday name' });
    dt.y = top + u * 0.03 - dt.h / 2;
  });
  const first = new Date(Date.UTC(year, month, 1)).getUTCDay(), days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const rows = Math.ceil((first + days) / 7), gy = top + u * 0.08, chh = (H - gy - u * 0.2) / rows;
  for (let r = 0; r < rows; r++) for (let d = 0; d < 7; d++) {
    const n = r * 7 + d - first + 1, cx = x + d * cw, cy = gy + r * chh;
    box(c, cx + u * 0.004, cy + u * 0.004, cw - u * 0.008, chh - u * 0.008, n >= 1 && n <= days ? '#ffffff' : L.soft, { radius: u * 0.01, stroke: L.soft, strokeWidth: u * 0.002, name: 'Day box' });
    if (n >= 1 && n <= days) text(c, String(n), cx + u * 0.015, cy + u * 0.014, cw * 0.5, { font: L.body, weight: 800, size: u * 0.024, fill: d === 0 || d === 6 ? L.accent : L.ink, align: 'left', name: 'Date' });
  }
  const ny = gy + rows * chh + u * 0.025;
  text(c, 'Notes', x, ny, w, { font: L.body, weight: 800, size: u * 0.02, fill: L.accent, upper: true, spacing: u * 0.005, align: 'left', name: 'Label' });
  lines(c, x, ny + u * 0.08, w, 2, u * 0.05, 'rgba(0,0,0,0.12)');
}
function todo(c: Kit, L: PlanLook): void {
  const { W, H, u } = c, x = W * 0.08, w = W * 0.84;
  c.bg = L.bg;
  box(c, 0, 0, W, u * 0.26, L.soft, { name: 'Header' });
  const t = text(c, 'To-Do List', x, u * 0.07, w, { font: L.head[0], weight: L.head[1], size: u * 0.1, fill: L.ink, align: 'left', name: 'Title' });
  text(c, 'Date: ____________', x, t.y + t.h + u * 0.01, w, { font: L.body, weight: 600, size: u * 0.022, fill: L.muted, align: 'left', name: 'Date' });
  // top 3
  let y = u * 0.31;
  const pt = text(c, 'Top 3 priorities', x, y, w, { font: L.body, weight: 800, size: u * 0.022, fill: L.accent, upper: true, spacing: u * 0.005, align: 'left', name: 'Label' });
  y = pt.y + pt.h + u * 0.025;
  for (let i = 1; i <= 3; i++) {
    box(c, x, y, u * 0.05, u * 0.05, L.accent, { shape: 'ellipse', name: 'Number dot' });
    const n = text(c, String(i), x, 0, u * 0.05, { font: L.body, weight: 800, size: u * 0.026, fill: '#ffffff', name: 'Number' });
    n.y = y + u * 0.025 - n.h / 2;
    rule(c, x + u * 0.08, y + u * 0.045, w - u * 0.08, 'rgba(0,0,0,0.2)', u * 0.002);
    y += u * 0.08;
  }
  y += u * 0.03;
  const tt = text(c, 'Tasks', x, y, w, { font: L.body, weight: 800, size: u * 0.022, fill: L.accent, upper: true, spacing: u * 0.005, align: 'left', name: 'Label' });
  y = tt.y + tt.h + u * 0.025;
  const rowH = u * 0.068, n = Math.floor((H - y - u * 0.22) / rowH);
  for (let i = 0; i < n; i++) {
    box(c, x, y + i * rowH, u * 0.035, u * 0.035, '#ffffff', { radius: u * 0.008, stroke: L.accent, strokeWidth: u * 0.003, name: 'Checkbox' });
    rule(c, x + u * 0.06, y + i * rowH + u * 0.035, w - u * 0.06, 'rgba(0,0,0,0.13)', u * 0.002);
  }
  const ny = H - u * 0.19;
  box(c, x, ny, w, u * 0.15, L.soft, { radius: u * 0.02, name: 'Notes box' });
  text(c, "Don't forget", x + u * 0.03, ny + u * 0.025, w * 0.6, { font: L.body, weight: 800, size: u * 0.02, fill: L.accent, upper: true, spacing: u * 0.005, align: 'left', name: 'Label' });
}
function habits(c: Kit, L: PlanLook): void {
  const { W, u } = c, x = W * 0.07, w = W * 0.86;
  c.bg = L.bg;
  const t = text(c, 'Habit Tracker', x, u * 0.08, w, { font: L.head[0], weight: L.head[1], size: u * 0.09, fill: L.ink, name: 'Title' });
  const s = text(c, 'Two weeks · one small step a day', x, t.y + t.h + u * 0.005, w, { font: L.body, weight: 600, size: u * 0.024, fill: L.muted, name: 'Subtitle' });
  const list = ['Drink 8 glasses of water', 'Move for 30 minutes', 'Read 10 pages', 'No phone after 10 PM', 'Eat a vegetable', 'Go to bed by 11', 'Write one good thing'];
  const lw = w * 0.32, days = 14, dw = (w - lw) / days, top = s.y + s.h + u * 0.07;
  for (let d = 0; d < days; d++) {
    const n = text(c, String(d + 1), x + lw + d * dw, top, dw, { font: L.body, weight: 800, size: u * 0.019, fill: L.accent, name: 'Day number' });
    void n;
  }
  const rowH = u * 0.11;
  list.forEach((hb, i) => {
    const y = top + u * 0.05 + i * rowH;
    box(c, x, y, w, rowH - u * 0.015, i % 2 ? '#ffffff' : L.soft, { radius: u * 0.018, name: 'Habit row' });
    const ht = text(c, hb, x + u * 0.025, 0, lw - u * 0.04, { font: L.body, weight: 700, size: u * 0.022, fill: L.ink, lines: 2, lh: 1.2, align: 'left', name: 'Habit' });
    ht.y = y + (rowH - u * 0.015) / 2 - ht.h / 2;
    const r = Math.min(dw * 0.62, u * 0.04);
    for (let d = 0; d < days; d++) box(c, x + lw + d * dw + (dw - r) / 2, y + (rowH - u * 0.015) / 2 - r / 2, r, r, '#ffffff', { shape: 'ellipse', stroke: L.accent, strokeWidth: u * 0.0025, name: 'Day circle' });
  });
  const ny = top + u * 0.05 + list.length * rowH + u * 0.04;
  text(c, 'How did it go?', x, ny, w, { font: L.body, weight: 800, size: u * 0.02, fill: L.accent, upper: true, spacing: u * 0.005, align: 'left', name: 'Label' });
  lines(c, x, ny + u * 0.09, w, 3, u * 0.055, 'rgba(0,0,0,0.13)');
}

// ============================================================ wedding suite
const W_INK = '#4a3b35', W_SAGE = '#7d927a', W_BLUSH = '#f2e4dc', W_CREAM = '#fbf8f3';
function saveTheDate(c: Kit): void {
  const { W, H, u } = c;
  c.bg = W_CREAM;
  const aw = W * 0.62, ah = H * 0.46, ax = (W - aw) / 2, ay = H * 0.07;
  outline(c, ax - u * 0.02, ay - u * 0.02, aw + u * 0.04, ah + u * 0.03, W_SAGE, u * 0.004, { shape: 'arch', name: 'Arch line' });
  pic(c, 'wedding-std', ['#c9a99a', '#efe0d6', '#8c9f88'], 0, ax, ay, aw, ah, 'arch');
  const s = text(c, 'Save the Date', W * 0.08, ay + ah + u * 0.05, W * 0.84, { font: 'Pinyon Script', weight: 400, size: u * 0.13, fill: W_SAGE, name: 'Save the date' });
  const n = text(c, 'Olivia & James', W * 0.08, s.y + s.h + u * 0.01, W * 0.84, { font: 'Cormorant Garamond', weight: 700, size: u * 0.1, fill: W_INK, upper: true, spacing: u * 0.01, name: 'Names' });
  rule(c, W / 2 - u * 0.12, n.y + n.h + u * 0.03, u * 0.24, W_SAGE, u * 0.002);
  const d = text(c, 'June 12, 2027', W * 0.08, n.y + n.h + u * 0.06, W * 0.84, { font: 'Cormorant Garamond', weight: 600, size: u * 0.055, fill: W_INK, spacing: u * 0.006, name: 'Date' });
  text(c, 'Napa Valley, California · Invitation to follow', W * 0.08, d.y + d.h + u * 0.015, W * 0.84, { font: 'Montserrat', weight: 600, size: u * 0.026, fill: W_SAGE, upper: true, spacing: u * 0.006, name: 'Place' });
}
function rsvp(c: Kit): void {
  const { W, H, u } = c;
  c.bg = W_BLUSH;
  outline(c, W * 0.04, W * 0.04, W * 0.92, H - W * 0.08, W_INK, u * 0.003, { name: 'Frame' });
  const t = text(c, 'Kindly Reply', W * 0.1, H * 0.1, W * 0.8, { font: 'Pinyon Script', weight: 400, size: u * 0.14, fill: W_INK, name: 'Title' });
  const b = text(c, 'by the first of May', W * 0.1, t.y + t.h, W * 0.8, { font: 'Cormorant Garamond', weight: 600, size: u * 0.05, fill: W_SAGE, italic: true, name: 'Reply by' });
  let y = b.y + b.h + u * 0.08;
  text(c, 'Name(s)', W * 0.12, y, W * 0.2, { font: 'Montserrat', weight: 700, size: u * 0.038, fill: W_INK, upper: true, spacing: u * 0.004, align: 'left', name: 'Label' });
  rule(c, W * 0.34, y + u * 0.055, W * 0.54, W_INK, u * 0.002);
  y += u * 0.14;
  for (const s of ['Joyfully accepts', 'Regretfully declines']) {
    box(c, W * 0.22, y + u * 0.008, u * 0.055, u * 0.055, CLEAR, { shape: 'ellipse', stroke: W_INK, strokeWidth: u * 0.003, name: 'Tick circle' });
    text(c, s, W * 0.27, y - u * 0.004, W * 0.6, { font: 'Cormorant Garamond', weight: 600, size: u * 0.068, fill: W_INK, align: 'left', name: 'Option' });
    y += u * 0.11;
  }
  text(c, 'Olivia & James · 06.12.2027', W * 0.1, H - W * 0.04 - u * 0.11, W * 0.8, { font: 'Montserrat', weight: 600, size: u * 0.028, fill: W_SAGE, upper: true, spacing: u * 0.008, name: 'Names' });
}
function welcomeSign(c: Kit): void {
  const { W, H, u } = c;
  c.bg = W_CREAM;
  box(c, W * 0.06, W * 0.06, W * 0.88, H - W * 0.12, '#ffffff', { radius: W * 0.44, name: 'Panel' });
  outline(c, W * 0.09, W * 0.09, W * 0.82, H - W * 0.18, W_SAGE, u * 0.003, { radius: W * 0.41, name: 'Panel line' });
  const w = text(c, 'Welcome', W * 0.12, H * 0.22, W * 0.76, { font: 'Pinyon Script', weight: 400, size: u * 0.2, fill: W_SAGE, name: 'Welcome' });
  const t = text(c, 'to the wedding of', W * 0.12, w.y + w.h + u * 0.01, W * 0.76, { font: 'Montserrat', weight: 600, size: u * 0.032, fill: W_INK, upper: true, spacing: u * 0.01, name: 'Line' });
  const a = text(c, 'Olivia', W * 0.12, t.y + t.h + u * 0.06, W * 0.76, { font: 'Cormorant Garamond', weight: 700, size: u * 0.14, fill: W_INK, upper: true, spacing: u * 0.01, name: 'Name 1' });
  const amp = text(c, '&', W * 0.12, a.y + a.h, W * 0.76, { font: 'Pinyon Script', weight: 400, size: u * 0.15, fill: W_SAGE, name: 'And' });
  const b = text(c, 'James', W * 0.12, amp.y + amp.h, W * 0.76, { font: 'Cormorant Garamond', weight: 700, size: u * 0.14, fill: W_INK, upper: true, spacing: u * 0.01, name: 'Name 2' });
  rule(c, W / 2 - u * 0.12, b.y + b.h + u * 0.06, u * 0.24, W_SAGE, u * 0.002);
  text(c, 'June 12, 2027', W * 0.12, b.y + b.h + u * 0.1, W * 0.76, { font: 'Cormorant Garamond', weight: 600, size: u * 0.055, fill: W_INK, spacing: u * 0.006, name: 'Date' });
}

// ============================================================ sets
const menuT = make('restaurant');
const logoT = make('branding');
const officeT = make('business');
const planT = make('planning');
const wedT = make('wedding');
const MENU_TAGS = ['menu', 'restaurant', 'cafe', 'food', 'price list', 'print'];
const LOGO_TAGS = ['logo', 'brand', 'branding', 'logo design', 'small business', 'icon'];
const PLAN_TAGS = ['planner', 'printable', 'organizer', 'schedule'];

const BISTRO_LOOK: MenuLook = { bg: '#fbf7ef', ink: '#2b2622', muted: '#7a6f64', accent: '#8b5e3c', title: ['Playfair Display', 800], head: ['Montserrat', 800], body: 'Lora' };
const NAVY_LOOK: MenuLook = { bg: '#f6f4ef', ink: '#1b2a41', muted: '#6b7380', accent: '#c9a227', title: ['Cinzel', 700], head: ['Montserrat', 800], body: 'Inter', titleUpper: true, frame: '#1b2a41' };
const BRUNCH_LOOK: MenuLook = { bg: '#fffaf2', ink: '#3b2a1f', muted: '#8a7363', accent: '#e07a3f', title: ['Fredoka', 700], head: ['Fredoka', 700], body: 'Nunito' };
const OCEAN: PlanLook = { accent: '#2f6f8f', soft: '#e3eef3', ink: '#1d3442', muted: '#6b7f8a', head: ['DM Serif Display', 400], body: 'Nunito', bg: '#fbfdfe' };
const PEACH: PlanLook = { accent: '#e07a5f', soft: '#fbe5dc', ink: '#3d2b25', muted: '#8a6f66', head: ['Fredoka', 700], body: 'Nunito', bg: '#fffaf7' };
const SAGE: PlanLook = { accent: '#6f8f6a', soft: '#e7efe4', ink: '#2f3a2c', muted: '#78846f', head: ['Playfair Display', 800], body: 'Inter', bg: '#fcfdfb' };
const LILAC: PlanLook = { accent: '#7b6fb0', soft: '#ebe8f6', ink: '#2c2742', muted: '#7a7591', head: ['Poppins', 800], body: 'Poppins', bg: '#fdfcff' };

export const BUSINESS_SETS: { sub: string; label: string; cover: string; list: CollectionTemplate[] }[] = [
  { sub: 'menu', label: 'Menus', cover: 'bistro-dinner-menu', list: [
    menuT('bistro-dinner-menu', 'Bistro Dinner Menu', 'document', 'Elegant', ['cream', 'brown'], [...MENU_TAGS, 'dinner', 'french', 'fine dining'], (c) => menuClassic(c, BISTRO_LOOK, BISTRO), { fit: true }),
    menuT('navy-gold-menu', 'Navy & Gold Menu', 'document', 'Elegant', ['cream', 'navy', 'gold'], [...MENU_TAGS, 'dinner', 'wedding menu', 'event menu', 'formal'], (c) => menuClassic(c, NAVY_LOOK, BISTRO), { fit: true }),
    menuT('weekend-brunch-menu', 'Weekend Brunch Menu', 'document', 'Playful', ['orange', 'cream'], [...MENU_TAGS, 'brunch', 'breakfast', 'photo'], (c) => menuTwoCol(c, BRUNCH_LOOK, BRUNCH, '#e07a3f', ['#e9a66b', '#f7dfc1', '#7aa874'])),
    menuT('chalkboard-coffee-menu', 'Chalkboard Coffee Menu', 'poster', 'Hand-drawn', ['black', 'yellow', 'pink'], [...MENU_TAGS, 'coffee', 'drinks', 'chalkboard', 'menu board', 'coffee shop'], (c) => menuBoard(c, DRINKS)),
    menuT('chefs-special-post', "Chef's Special Post", 'post', 'Modern', ['cream', 'green'], [...MENU_TAGS, 'special', 'daily special', 'instagram', 'photo'], (c) => menuSpecial(c, ['#d79a6b', '#f3e2c8', '#7da35f'], '#22302a', '#2f7a55', '#fbf6ec')),
  ] },
  { sub: 'branding', label: 'Logos & Business Cards', cover: 'logo-monogram-coffee', list: [
    logoT('logo-monogram-coffee', 'Monogram Coffee Logo', 'post', 'Elegant', ['cream', 'green'], [...LOGO_TAGS, 'monogram', 'coffee', 'cafe', 'initials'], logoMonogram),
    logoT('logo-badge-fitness', 'Fitness Badge Logo', 'post', 'Bold', ['navy', 'gold'], [...LOGO_TAGS, 'badge', 'emblem', 'gym', 'fitness', 'sport'], logoBadge),
    logoT('logo-wordmark-flowers', 'Flower Studio Wordmark', 'post', 'Playful', ['white', 'coral', 'green'], [...LOGO_TAGS, 'wordmark', 'florist', 'flowers', 'cute'], logoWordmark),
    logoT('logo-stacked-surf', 'Stacked Surf Logo', 'post', 'Bold', ['black', 'teal'], [...LOGO_TAGS, 'surf', 'clothing', 'streetwear', 'bold type'], logoStacked),
    logoT('logo-bakery-arch', 'Bakery Arch Logo', 'post', 'Retro', ['cream', 'terracotta'], [...LOGO_TAGS, 'bakery', 'food', 'retro', 'arch'], logoBakery),
    logoT('logo-tech-icon', 'Tech Startup Logo', 'post', 'Minimal', ['white', 'blue'], [...LOGO_TAGS, 'tech', 'startup', 'software', 'app', 'minimal'], logoTech),
  ] },
  { sub: 'office', label: 'Newsletters, Invoices & Letterheads', cover: 'school-newsletter', list: [
    officeT('school-newsletter', 'School Newsletter', 'document', 'Playful', ['blue', 'yellow', 'white'], ['newsletter', 'school newsletter', 'class newsletter', 'parents', 'monthly update', 'photo', 'print'],
      (c) => newsletter(c, { band: '#1f5aa6', bandInk: '#ffffff', accent: '#f2b632', ink: '#1b2a41', muted: '#4b5563', head: ['Fredoka', 700], body: 'Nunito', tint: ['#7fb0e0', '#e3eefa', '#f2b632'], bg: '#ffffff' },
        { name: 'The Maple Times', issue: 'Maple Elementary · November 2026 · Issue 3', feature: ['Our Fall Science Fair Was a Big Hit', 'More than 80 students showed their projects, from volcano models to tiny weather stations. Thank you to every family and volunteer who helped make the night so special.'],
          stories: [['Picture Day Is Coming', 'Retakes are on November 18. Order forms go home in Friday folders.'], ['Thank You, Volunteers', 'Our reading buddies logged 300 hours this fall. We could not do it without you!'], ['Winter Concert', 'Join us on December 10 at 6 PM in the gym. Doors open at 5:30.'], ['Lost & Found', 'Please check the table by the office before break — it is overflowing!']], foot: 'Questions? office@maple.edu · (555) 010-4400' }), { fit: true }),
    officeT('company-newsletter', 'Company Newsletter', 'document', 'Modern', ['black', 'green', 'white'], ['newsletter', 'company newsletter', 'team update', 'staff newsletter', 'internal', 'photo', 'print'],
      (c) => newsletter(c, { band: '#111827', bandInk: '#ffffff', accent: '#34d399', ink: '#111827', muted: '#4b5563', head: ['Space Grotesk', 700], body: 'Inter', tint: ['#7aa6a0', '#e2efec', '#34d399'], bg: '#ffffff' },
        { name: 'Inside Northwind', issue: 'Team update · Q4 2026', feature: ['We Opened Our Second Office', 'The new Denver studio welcomed its first 24 teammates this month. Stop by the kitchen on Fridays for coffee with the leadership team.'],
          stories: [['New Faces', 'Say hello to the 9 people who joined us in October across design, sales and support.'], ['Wellness Week', 'Yoga, walking meetings and healthy snacks — all week from November 16.'], ['Product Launch', 'Version 3.0 ships on December 1. Thank you to everyone who tested early builds.'], ['Holiday Party', 'Save the date: December 18 at the Riverside Hall. RSVP by December 4.']], foot: 'Share your news: news@northwind.com' }), { fit: true }),
    officeT('invoice-minimal', 'Minimal Invoice', 'document', 'Minimal', ['white', 'black'], ['invoice', 'bill', 'receipt', 'billing', 'freelance', 'small business', 'print'], (c) => invoice(c, { accent: '#111827', ink: '#111827', muted: '#6b7280', head: ['Inter', 800], body: 'Inter', band: false }), { fit: true }),
    officeT('invoice-teal', 'Teal Invoice', 'document', 'Modern', ['white', 'teal'], ['invoice', 'bill', 'billing', 'freelance', 'designer', 'colourful', 'print'], (c) => invoice(c, { accent: '#0f766e', ink: '#1f2937', muted: '#6b7280', head: ['Poppins', 800], body: 'Poppins', band: true }), { fit: true }),
    officeT('letterhead-classic', 'Classic Letterhead', 'document', 'Elegant', ['white', 'navy'], ['letterhead', 'letter', 'business letter', 'company letter', 'stationery', 'print'], (c) => letterhead(c, '#1e3a5f', '#1f2937', ['Playfair Display', 700], 'Okafor & Co.', 'OC', false)),
    officeT('letterhead-modern', 'Modern Letterhead', 'document', 'Modern', ['white', 'orange'], ['letterhead', 'letter', 'business letter', 'stationery', 'startup', 'print'], (c) => letterhead(c, '#ea580c', '#111827', ['Montserrat', 800], 'Brightwave Studio', 'B', true)),
  ] },
  { sub: 'planner', label: 'Planners & Calendars', cover: 'weekly-planner', list: [
    planT('weekly-planner', 'Weekly Planner', 'document', 'Minimal', ['white', 'blue'], [...PLAN_TAGS, 'weekly planner', 'week', 'school', 'work'], (c) => weekly(c, OCEAN)),
    planT('monthly-calendar-nov', 'November 2026 Calendar', 'document', 'Modern', ['white', 'orange'], [...PLAN_TAGS, 'calendar', 'monthly calendar', 'month', 'november', '2026'], (c) => monthly(c, PEACH, 2026, 10)),
    planT('monthly-calendar-dec', 'December 2026 Calendar', 'document', 'Elegant', ['white', 'green'], [...PLAN_TAGS, 'calendar', 'monthly calendar', 'month', 'december', '2026'], (c) => monthly(c, SAGE, 2026, 11)),
    planT('daily-todo-list', 'Daily To-Do List', 'document', 'Playful', ['white', 'purple'], [...PLAN_TAGS, 'to do list', 'todo', 'checklist', 'tasks', 'daily'], (c) => todo(c, LILAC)),
    planT('habit-tracker', 'Two-Week Habit Tracker', 'document', 'Playful', ['white', 'orange'], [...PLAN_TAGS, 'habit tracker', 'habits', 'goals', 'wellness', 'self care'], (c) => habits(c, PEACH)),
  ] },
  { sub: 'wedding', label: 'Wedding', cover: 'save-the-date-arch', list: [
    wedT('save-the-date-arch', 'Save the Date — Photo Arch', 'card', 'Elegant', ['cream', 'sage', 'blush'], ['save the date', 'wedding', 'engagement', 'photo', 'stationery', 'invitation'], saveTheDate),
    wedT('wedding-rsvp-card', 'Wedding RSVP Card', 'landscape', 'Elegant', ['blush', 'sage'], ['rsvp', 'reply card', 'wedding', 'response card', 'stationery'], rsvp),
    wedT('wedding-welcome-sign', 'Sage Arch Welcome Sign', 'poster', 'Elegant', ['cream', 'sage'], ['welcome sign', 'wedding sign', 'wedding', 'ceremony', 'reception', 'decor'], welcomeSign),
  ] },
];

export const BUSINESS_FONTS: [string, number][] = [
  ['Playfair Display', 800], ['Playfair Display', 700], ['Montserrat', 800], ['Montserrat', 700], ['Montserrat', 600], ['Lora', 700], ['Lora', 500], ['Cinzel', 700], ['Inter', 500], ['Inter', 600], ['Inter', 700], ['Inter', 800],
  ['Fredoka', 700], ['Nunito', 500], ['Nunito', 600], ['Nunito', 700], ['Nunito', 800], ['Amatic SC', 700], ['Caveat', 700], ['Cormorant Garamond', 600], ['Cormorant Garamond', 700], ['Oswald', 500], ['Oswald', 700], ['Anton', 400],
  ['Space Grotesk', 700], ['Pacifico', 400], ['Poppins', 600], ['Poppins', 700], ['Poppins', 800], ['DM Serif Display', 400], ['Great Vibes', 400], ['Pinyon Script', 400],
];
