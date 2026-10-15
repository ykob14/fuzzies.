/** Built-in templates. Free ones are ready to use; premium ones unlock with Fuzzies.
 *  The "classics": hand-made, every element a normal layer. Art comes from the recolourable packs (`art.ts`) and the
 *  Everyday collection (`ed-…`), photo slots are `ph-classic-…` frames the editor fills with a tap. */
import type { Design, El, Fill, Gradient, ShapeKind, TextEl, ShapeEl, GraphicEl, ImageEl } from '../editor/types';
import { makeGraphic, makeImage, makeShape, makeText, newPage } from '../editor/doc';

export interface Template {
  id: string;
  name: string;
  category: string;
  cost: number;
  design: Design;
}

export const CATEGORIES = ['All', 'Social', 'Story', 'Poster', 'Flyer', 'YouTube', 'Presentation', 'Business card', 'Invitation', 'Logo', 'Wallpaper'];

// ---------- tiny builders ----------
const lg = (angle: number, ...colors: string[]): Gradient => ({ kind: 'linear', angle, stops: colors.map((color, i) => ({ at: i / Math.max(1, colors.length - 1), color })) });

function tx(text: string, x: number, y: number, w: number, o: Partial<TextEl> = {}): TextEl {
  const el = makeText(text, { w, align: 'left', ...o });
  el.x = x; el.y = y;
  return el;
}
/** Centered text on a canvas of width W. */
const ct = (W: number, text: string, y: number, w: number, o: Partial<TextEl> = {}) => tx(text, (W - w) / 2, y, w, { align: 'center', ...o });

function sh(shape: ShapeKind, x: number, y: number, w: number, h: number, fill: Fill, o: Partial<ShapeEl> = {}): ShapeEl {
  const el = makeShape(shape, { fill, ...o });
  Object.assign(el, { x, y, w, h });
  return el;
}
/** A recolourable graphic. Collection art isn't loaded when templates are built, so colours are always given. */
function gr(art: string, x: number, y: number, w: number, h: number, colors: string[], o: Partial<GraphicEl> = {}): GraphicEl {
  const el = makeGraphic(art, w, o);
  Object.assign(el, { x, y, w, h, colors });
  return el;
}
const rot = <T extends El>(el: T, deg: number): T => { el.rotation = deg; return el; };
const named = <T extends El>(el: T, name: string): T => { el.name = name; return el; };

/** A photo slot: a calm, palette-tinted placeholder (soft light, fine diagonal lines, a small landscape mark).
 *  Its asset id starts with `ph-`, so the editor treats it as an empty frame: tap it to put your own photo in. */
function photoSvg(a: string, b: string): string {
  let lines = '';
  for (let d = -720; d < 960; d += 26) lines += `<path d="M${d} 720 L${d + 720} 0" stroke="#fff" stroke-opacity=".1" stroke-width="2"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 720" width="960" height="720">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${b}"/><stop offset="1" stop-color="${a}"/></linearGradient>` +
    `<radialGradient id="l" cx=".3" cy=".15" r=".8"><stop offset="0" stop-color="#fff" stop-opacity=".4"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>` +
    `<rect width="960" height="720" fill="url(#g)"/><rect width="960" height="720" fill="url(#l)"/>${lines}` +
    `<g opacity=".55" fill="#fff" stroke="#fff" stroke-width="7" stroke-linejoin="round"><rect x="370" y="277" width="220" height="166" rx="16" fill="none"/>` +
    `<path d="M392 421 L452 349 L490 393 L518 365 L568 421Z" stroke="none"/><circle cx="530" cy="318" r="14" stroke="none"/></g></svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}
type Assets = Record<string, string>;
function photo(assets: Assets, key: string, tint: [string, string], x: number, y: number, w: number, h: number, o: Partial<ImageEl> = {}): ImageEl {
  const id = `ph-classic-${key}`;
  assets[id] ??= photoSvg(tint[0], tint[1]);
  const el = makeImage(id, w, h, o);
  Object.assign(el, { x, y, w, h, name: 'Photo — tap to add yours' });
  return el;
}

let n = 0;
function T(id: string, name: string, category: string, w: number, h: number, pages: { bg: Fill; els: El[] }[], cost = 0, assets: Assets = {}): Template {
  return {
    id, name, category, cost,
    design: { id: `tpl_${id}`, owner: 'system', name, width: w, height: h, template: id, assets, createdAt: ++n, updatedAt: n, pages: pages.map((p) => newPage(p.bg, p.els)) },
  };
}

function build(): Template[] {
  const A: Record<string, Assets> = {};
  const as = (id: string) => (A[id] ??= {});
  return [
    // ===================== Social (1080×1080) =====================
    (() => {
      const TEAL = '#0f4c5c', CORAL = '#d1304a';
      return T('summer-sale', 'Summer Sale', 'Social', 1080, 1080, [{
        bg: '#fff3dd',
        els: [
          sh('ellipse', 600, 500, 620, 620, '#ffb238'),
          rot(gr('ed-ice-cream', 640, 440, 400, 400, ['#ff7aa2', '#fff6e0', '#e3a35a']), 10),
          tx('SEASON FINALE', 84, 90, 600, { font: 'Poppins', size: 30, weight: 700, fill: CORAL, letterSpacing: 8 }),
          tx('SUMMER\nSALE', 84, 140, 700, { font: 'Bebas Neue', size: 250, weight: 400, fill: TEAL, lineHeight: 0.86 }),
          tx('Up to 50% off swimwear,\nsandals & shades.', 84, 600, 520, { font: 'Poppins', size: 40, weight: 500, fill: TEAL, lineHeight: 1.3 }),
          tx('Shop now  →', 84, 750, 360, { font: 'Poppins', size: 36, weight: 700, fill: CORAL }),
          sh('line', 86, 806, 200, 6, CORAL, { strokeWidth: 4 }),
          tx('June 18 – July 5 · fuzzymarket.com', 84, 940, 560, { font: 'Poppins', size: 30, weight: 500, fill: TEAL }),
          rot(sh('burst', 800, 80, 210, 210, '#ff5a5f'), 10),
          rot(tx('50%\nOFF', 815, 118, 180, { font: 'Bebas Neue', size: 66, weight: 400, fill: '#ffffff', align: 'center', lineHeight: 0.9 }), 10),
        ],
      }]);
    })(),
    T('quote-classic', 'Classic Quote', 'Social', 1080, 1080, [{
      bg: '#f7efe4',
      els: [
        sh('rect', 60, 60, 960, 960, 'rgba(0,0,0,0)', { stroke: '#d9c6ad', strokeWidth: 3 }),
        ct(1080, '“', 130, 300, { font: 'Playfair Display', size: 280, weight: 700, fill: '#c8613f', lineHeight: 0.9 }),
        ct(1080, 'Creativity is\nintelligence\nhaving fun.', 370, 820, { font: 'Playfair Display', size: 84, weight: 600, italic: true, fill: '#3d2c2e', lineHeight: 1.22 }),
        sh('line', 480, 740, 120, 6, '#c8613f', { strokeWidth: 4 }),
        ct(1080, 'ALBERT EINSTEIN', 780, 600, { font: 'Montserrat', size: 32, weight: 600, fill: '#6f5a4c', letterSpacing: 8 }),
        ct(1080, '@studio.daily', 920, 600, { font: 'Montserrat', size: 30, weight: 500, fill: '#8a7466' }),
      ],
    }]),
    T('new-drop', 'New Drop', 'Social', 1080, 1080, [{
      bg: '#0e0e10',
      els: [
        photo(as('new-drop'), 'new-drop', ['#3a3f47', '#9aa3ad'], 84, 84, 912, 560, { radius: 28 }),
        sh('rect', 120, 120, 210, 60, '#d4ff3f', { radius: 30 }),
        tx('LIMITED', 120, 133, 210, { font: 'Space Grotesk', size: 28, weight: 700, fill: '#0e0e10', align: 'center', letterSpacing: 4 }),
        tx('NEW DROP', 84, 676, 912, { font: 'Archivo Black', size: 138, weight: 400, fill: '#ffffff', lineHeight: 1 }),
        tx('Fall Capsule 03\nFriday, Oct 23 · 10 AM', 84, 846, 640, { font: 'Space Grotesk', size: 36, weight: 500, fill: '#c9c9d1', lineHeight: 1.35 }),
        sh('ellipse', 880, 860, 116, 116, '#d4ff3f'),
        sh('arrow', 904, 897, 68, 42, '#0e0e10'),
      ],
    }], 0, A['new-drop']),
    T('motivation', 'Monday Motivation', 'Social', 1080, 1080, [{
      bg: '#f6efe6',
      els: [
        gr('ed-sun', 84, 84, 190, 190, ['#ffb000', '#ff7a2f']),
        tx('MONDAY MOTIVATION', 84, 330, 700, { font: 'DM Sans', size: 32, weight: 700, fill: '#b2462a', letterSpacing: 6 }),
        tx('Small steps\nevery day add up\nto big things.', 84, 400, 912, { font: 'DM Serif Display', size: 108, weight: 400, fill: '#2b2118', lineHeight: 1.08 }),
        gr('underline', 84, 800, 330, 55, ['#ff7a2f']),
        tx('Have a good week ✦ @fuzzystudio', 84, 930, 900, { font: 'DM Sans', size: 32, weight: 500, fill: '#6b5a4c' }),
      ],
    }]),
    T('cafe-special', 'Café Special', 'Social', 1080, 1080, [{
      bg: '#fff3e0',
      els: [
        sh('ellipse', 560, 280, 640, 640, '#ffcf8a'),
        gr('ed-latte', 610, 300, 440, 440, ['#e8724a', '#7a4a2c']),
        rot(gr('ed-croissant', 520, 650, 300, 300, ['#eaa24e', '#a8572a']), -12),
        tx('Morning', 84, 100, 600, { font: 'Pacifico', size: 104, weight: 400, fill: '#6d3b1c' }),
        tx('TREATS', 84, 270, 600, { font: 'Bebas Neue', size: 170, weight: 400, fill: '#d24d0e', letterSpacing: 6, lineHeight: 0.95 }),
        tx('Latte + croissant\nevery day before 11 AM', 84, 470, 470, { font: 'Poppins', size: 38, weight: 500, fill: '#6d3b1c', lineHeight: 1.35 }),
        rot(sh('burst', 84, 640, 230, 230, '#d24d0e'), -10),
        rot(tx('$6', 99, 700, 200, { font: 'Bebas Neue', size: 104, weight: 400, fill: '#ffffff', align: 'center' }), -10),
        tx('Fuzzy Café · 18 Bloom St · Open 7–3', 84, 960, 640, { font: 'Poppins', size: 30, weight: 500, fill: '#6d3b1c' }),
      ],
    }], 15),
    T('giveaway', 'Giveaway', 'Social', 1080, 1080, [{
      bg: '#ffe14d',
      els: [
        rot(gr('gift', 660, 80, 340, 340, ['#ff4f81', '#141414']), 8),
        gr('sparkle', 620, 70, 70, 70, ['#141414', '#ffe14d']),
        tx('GIVE\nAWAY', 84, 84, 600, { font: 'Anton', size: 210, weight: 400, fill: '#141414', lineHeight: 0.9 }),
        tx('Win a cosy reading bundle worth $150', 84, 500, 640, { font: 'Poppins', size: 40, weight: 700, fill: '#141414', lineHeight: 1.25 }),
        ...['Follow @fuzzybooks', 'Like this post', 'Tag two friends'].flatMap((t, i) => [
          sh('ellipse', 84, 660 + i * 96, 68, 68, '#141414'),
          tx(String(i + 1), 84, 668 + i * 96, 68, { font: 'Anton', size: 40, weight: 400, fill: '#ffe14d', align: 'center' }),
          tx(t, 176, 670 + i * 96, 700, { font: 'Poppins', size: 38, weight: 600, fill: '#141414' }),
        ]),
        tx('Ends Sunday, Oct 25 · US only', 84, 970, 700, { font: 'Poppins', size: 30, weight: 500, fill: '#4a4000' }),
      ],
    }], 20),

    // ===================== Story (1080×1920) =====================
    T('this-or-that', 'This or That', 'Story', 1080, 1920, [{
      bg: '#fef6e4',
      els: [
        ct(1080, 'THIS', 230, 900, { font: 'Archivo Black', size: 170, weight: 400, fill: '#e2508a' }),
        ct(1080, 'or that?', 420, 900, { font: 'Caveat', size: 130, weight: 700, fill: '#1c1830' }),
        sh('rect', 90, 640, 430, 620, '#f7a1c4', { radius: 50 }),
        sh('rect', 560, 640, 430, 620, '#9fdbe3', { radius: 50 }),
        gr('ed-pizza', 125, 700, 360, 360, ['#f7c548', '#d8432e', '#d98a3d']),
        gr('ed-sushi', 595, 700, 360, 360, ['#ff8a5c', '#22302e']),
        tx('Pizza', 90, 1120, 430, { font: 'Archivo Black', size: 72, weight: 400, fill: '#1c1830', align: 'center' }),
        tx('Sushi', 560, 1120, 430, { font: 'Archivo Black', size: 72, weight: 400, fill: '#1c1830', align: 'center' }),
        sh('ellipse', 480, 890, 120, 120, '#1c1830'),
        tx('VS', 480, 922, 120, { font: 'Archivo Black', size: 44, weight: 400, fill: '#ffffff', align: 'center' }),
        ct(1080, 'Vote in the poll below ↓', 1330, 900, { font: 'Caveat', size: 80, weight: 700, fill: '#1c1830' }),
        sh('rect', 190, 1450, 700, 170, 'rgba(0,0,0,0)', { radius: 30, stroke: '#c9bfa8', strokeWidth: 4, dash: true }),
        ct(1080, 'Add a poll sticker here', 1510, 640, { font: 'Archivo Black', size: 36, weight: 400, fill: '#8a8070' }),
      ],
    }]),
    T('birthday-story', 'Birthday Bash', 'Story', 1080, 1920, [{
      bg: '#fff0f3',
      els: [
        gr('confetti', 0, 140, 1080, 720, ['#ff5c8a', '#ffc53d', '#5ec2f0']),
        gr('balloons', 300, 240, 480, 600, ['#ff5c8a', '#ffc53d', '#5ec2f0']),
        ct(1080, 'Happy', 880, 920, { font: 'Pacifico', size: 150, weight: 400, fill: '#d93a68' }),
        ct(1080, 'BIRTHDAY', 1090, 920, { font: 'Bebas Neue', size: 230, weight: 400, fill: '#241a2e', letterSpacing: 10, lineHeight: 0.95 }),
        ct(1080, 'MAYA TURNS 30', 1340, 900, { font: 'Poppins', size: 52, weight: 700, fill: '#d93a68', letterSpacing: 6 }),
        ct(1080, 'Saturday, Nov 7 · 8 PM\nThe Loft, 214 Pine St', 1440, 900, { font: 'Poppins', size: 46, weight: 500, fill: '#241a2e', lineHeight: 1.35 }),
      ],
    }], 20),
    T('travel-story', 'Weekend Escape', 'Story', 1080, 1920, [{
      bg: '#fff7ec',
      els: [
        photo(as('travel-story'), 'travel', ['#1f6f8b', '#9fd8e8'], 0, 0, 1080, 1220),
        tx('3 DAYS · 2 NIGHTS', 90, 1290, 700, { font: 'Poppins', size: 36, weight: 700, fill: '#c2412a', letterSpacing: 6 }),
        tx('WEEKEND ESCAPE', 90, 1350, 900, { font: 'Anton', size: 132, weight: 400, fill: '#10324a', lineHeight: 1 }),
        tx('Lake Tahoe · cabins from $289 per person', 90, 1510, 900, { font: 'Poppins', size: 42, weight: 500, fill: '#10324a' }),
        tx('Book by Nov 1  →  fuzzytrips.com', 90, 1590, 900, { font: 'Poppins', size: 40, weight: 700, fill: '#c2412a' }),
        rot(gr('ed-plane', 700, 990, 330, 330, ['#ffffff', '#ff6b4a']), -6),
      ],
    }], 20, A['travel-story']),
    T('story-announce', 'Big News', 'Story', 1080, 1920, [{
      bg: '#151518',
      els: [
        gr('ed-megaphone', 230, 260, 620, 620, ['#ff5c39', '#ffd23f']),
        ct(1080, 'BIG', 900, 920, { font: 'Archivo Black', size: 260, weight: 400, fill: '#fff4e6', lineHeight: 0.9 }),
        ct(1080, 'NEWS', 1130, 920, { font: 'Archivo Black', size: 260, weight: 400, fill: 'rgba(0,0,0,0)', strokeColor: '#ff5c39', strokeWidth: 5, lineHeight: 0.9 }),
        ct(1080, 'Something new lands Monday, Oct 26.\nTurn on notifications!', 1420, 880, { font: 'Space Grotesk', size: 44, weight: 500, fill: '#d9d4cc', lineHeight: 1.35 }),
        ct(1080, '@fuzzystudio', 1620, 600, { font: 'Space Grotesk', size: 38, weight: 700, fill: '#ffd23f' }),
      ],
    }]),

    // ===================== Poster =====================
    T('exhibition', 'Modern Exhibition', 'Poster', 1587, 2245, [{
      bg: '#f2efe9',
      els: [
        tx('CITY GALLERY', 140, 150, 800, { font: 'Montserrat', size: 42, weight: 700, fill: '#1c1830', letterSpacing: 12 }),
        tx('01', 1287, 140, 160, { font: 'Montserrat', size: 60, weight: 800, fill: '#1c1830', align: 'right' }),
        sh('ellipse', 440, 330, 900, 900, '#ff6b35'),
        sh('rect', 160, 820, 520, 520, '#1c1830'),
        sh('triangle', 900, 1000, 460, 400, '#2ec4b6'),
        tx('FORM\n& COLOUR', 140, 1470, 1300, { font: 'Montserrat', size: 170, weight: 900, fill: '#1c1830', lineHeight: 0.95, letterSpacing: -4 }),
        sh('line', 142, 1860, 1303, 4, '#1c1830', { strokeWidth: 3 }),
        tx('A modern art exhibition\nMar 12 – Apr 25, 2027', 140, 1900, 640, { font: 'Montserrat', size: 46, weight: 600, fill: '#1c1830', lineHeight: 1.35 }),
        tx('Tue–Sun · 10 AM – 6 PM\n40 Harbour Road', 807, 1900, 640, { font: 'Montserrat', size: 46, weight: 500, fill: '#55506a', align: 'right', lineHeight: 1.35 }),
      ],
    }]),
    T('spring-fair', 'Spring Fair', 'Poster', 1587, 2245, [{
      bg: '#f3f7ee',
      els: [
        gr('blob1', -300, -300, 900, 900, ['#dcefd9']),
        gr('blob2', 1000, 1700, 900, 900, ['#fde0e7']),
        gr('ed-tulips', 518, 150, 550, 550, ['#ff6f91', '#3f8f5a', '#efdcc0']),
        ct(1587, 'Spring', 700, 1300, { font: 'Pacifico', size: 230, weight: 400, fill: '#d94c74', lineHeight: 1.1 }),
        ct(1587, 'FAIR', 1000, 1300, { font: 'Bebas Neue', size: 380, weight: 400, fill: '#24533a', letterSpacing: 40, lineHeight: 0.95 }),
        sh('line', 593, 1400, 400, 6, '#d94c74', { strokeWidth: 5 }),
        ct(1587, 'SAT · APRIL 17, 2027 · 10 AM – 4 PM', 1450, 1300, { font: 'Poppins', size: 56, weight: 700, fill: '#24533a', letterSpacing: 2 }),
        ct(1587, 'Flowers · Food trucks · Live music · Kids corner', 1560, 1150, { font: 'Poppins', size: 50, weight: 500, fill: '#24533a', lineHeight: 1.4 }),
        sh('rect', 443, 1810, 700, 130, '#d94c74', { radius: 65 }),
        ct(1587, 'Free entry · Maple Park', 1844, 700, { font: 'Poppins', size: 52, weight: 700, fill: '#ffffff' }),
      ],
    }]),
    T('live-music', 'Live Music Night', 'Poster', 1587, 2245, [{
      bg: '#0d0e24',
      els: [
        sh('ring', 293, 200, 1000, 1000, lg(90, '#ff2bd6', '#00f0ff'), { strokeWidth: 30 }),
        sh('ring', 443, 350, 700, 700, lg(90, '#00f0ff', '#ff2bd6'), { strokeWidth: 16 }),
        gr('ed-guitar', 573, 430, 440, 550, ['#ff8a3d', '#241b3a']),
        ct(1587, 'LIVE MUSIC', 1300, 1380, { font: 'Bebas Neue', size: 300, weight: 400, fill: '#ffffff', letterSpacing: 20, lineHeight: 0.9, shadow: { color: '#ff2bd6', blur: 40, x: 0, y: 0 } }),
        ct(1587, 'FRIDAY, NOV 13 · DOORS 9 PM', 1640, 1350, { font: 'Montserrat', size: 62, weight: 700, fill: '#00f0ff', letterSpacing: 8 }),
        ct(1587, 'with The Night Owls + DJ Mira', 1770, 1300, { font: 'Montserrat', size: 56, weight: 600, fill: '#ffffff' }),
        ct(1587, 'The Velvet Room · 21+ · Free entry before 10 PM', 1880, 1300, { font: 'Montserrat', size: 46, weight: 500, fill: '#c6c3e8' }),
      ],
    }], 25),
    T('retro-poster', 'Retro Vibes', 'Poster', 1587, 2245, [{
      bg: '#fff1d6',
      els: [
        gr('retro-sun', 393, 170, 800, 800, ['#ff7a59', '#ffd23f', '#ff4f9a']),
        gr('rainbow', 193, 760, 1200, 600, ['#ff5e62', '#ffb000', '#2ec4b6']),
        ct(1587, 'GOOD VIBES', 1430, 1400, { font: 'Shrikhand', size: 200, weight: 400, fill: '#d6336c', shadow: { color: '#ffb000', blur: 0, x: 10, y: 10 } }),
        ct(1587, 'ROLLER DISCO · SAT MAY 8 · 7 PM', 1730, 1400, { font: 'Righteous', size: 68, weight: 400, fill: '#2b2d42', letterSpacing: 6 }),
        ct(1587, 'Sunset Rink · 22 Ocean Ave · All ages', 1860, 1300, { font: 'Righteous', size: 54, weight: 400, fill: '#7a4b2a' }),
      ],
    }], 30),

    // ===================== Flyer =====================
    T('yard-sale', 'Yard Sale', 'Flyer', 1240, 1754, [{
      bg: '#ffd23f',
      els: [
        rot(sh('burst', 780, 100, 380, 380, '#e63946'), 12),
        rot(tx('EVERYTHING\nMUST GO!', 800, 232, 340, { font: 'Archivo Black', size: 46, weight: 400, fill: '#ffffff', align: 'center', lineHeight: 1.1 }), 12),
        tx('YARD', 90, 380, 1000, { font: 'Archivo Black', size: 300, weight: 400, fill: '#1c1830', lineHeight: 0.9 }),
        tx('SALE', 90, 650, 1000, { font: 'Archivo Black', size: 300, weight: 400, fill: '#ffffff', strokeColor: '#1c1830', strokeWidth: 8, lineHeight: 0.9 }),
        sh('rect', 90, 1030, 1060, 8, '#1c1830'),
        tx('Saturday, Oct 24 · 8 AM – 2 PM\n42 Maple Street', 90, 1090, 1060, { font: 'Poppins', size: 62, weight: 700, fill: '#1c1830', lineHeight: 1.3 }),
        tx('Furniture · Books · Toys · Clothes · Plants · Vinyl', 90, 1320, 600, { font: 'Poppins', size: 42, weight: 500, fill: '#4a3c00', lineHeight: 1.4 }),
        tx('Cash & card welcome.\nRain date Sun, Oct 25.', 90, 1520, 600, { font: 'Poppins', size: 38, weight: 600, fill: '#1c1830', lineHeight: 1.35 }),
        gr('ed-armchair', 760, 1270, 400, 400, ['#2fa39a', '#8a5a3b']),
      ],
    }]),
    T('yoga-class', 'Yoga Class', 'Flyer', 1240, 1754, [{
      bg: '#eef5ea',
      els: [
        sh('arch', 270, 150, 700, 860, '#a3c9a8'),
        sh('ellipse', 520, 290, 200, 200, '#f6bd60'),
        gr('leaf', 380, 590, 200, 286, ['#52796f', '#2f3e46']),
        rot(gr('leaf', 660, 610, 180, 257, ['#84a98c', '#2f3e46']), 25),
        ct(1240, 'Morning Yoga', 1070, 1060, { font: 'Lora', size: 124, weight: 700, fill: '#2f3e46' }),
        ct(1240, 'Breathe in. Slow down. Feel good.', 1240, 1000, { font: 'Lora', size: 50, weight: 400, italic: true, fill: '#3e6358' }),
        ct(1240, 'EVERY SUNDAY · 9 AM · RIVERSIDE PARK', 1400, 1060, { font: 'Montserrat', size: 40, weight: 700, fill: '#2f3e46', letterSpacing: 5 }),
        ct(1240, 'All levels welcome · Bring a mat · First class free', 1480, 1060, { font: 'Montserrat', size: 36, weight: 500, fill: '#3e6358' }),
        ct(1240, 'fuzzyyoga.com', 1580, 600, { font: 'Montserrat', size: 36, weight: 700, fill: '#2f3e46' }),
      ],
    }], 20),
    T('lost-pet', 'Lost Pet', 'Flyer', 1240, 1754, [{
      bg: '#ffffff',
      els: [
        sh('rect', 0, 0, 1240, 330, '#d62839'),
        ct(1240, 'LOST CAT', 70, 1060, { font: 'Archivo Black', size: 190, weight: 400, fill: '#ffffff' }),
        photo(as('lost-pet'), 'lost-pet', ['#6f6a64', '#d8d2c8'], 170, 400, 900, 640, { radius: 28 }),
        ct(1240, 'MOCHI', 1090, 1000, { font: 'Archivo Black', size: 110, weight: 400, fill: '#1c1830' }),
        ct(1240, 'Grey tabby · green eyes · blue collar\nLast seen near Oak Ave on Tuesday, Oct 13', 1235, 1060, { font: 'Poppins', size: 44, weight: 500, fill: '#3d3a4a', lineHeight: 1.35 }),
        sh('rect', 120, 1430, 1000, 220, '#ffd23f', { radius: 30 }),
        ct(1240, 'CALL 555-0123', 1455, 1000, { font: 'Archivo Black', size: 96, weight: 400, fill: '#1c1830' }),
        ct(1240, 'Reward offered · Any time, day or night', 1575, 1000, { font: 'Poppins', size: 40, weight: 600, fill: '#1c1830' }),
      ],
    }], 0, A['lost-pet']),

    // ===================== YouTube (1280×720) =====================
    T('yt-top10', 'Top 10 Thumbnail', 'YouTube', 1280, 720, [{
      bg: lg(120, '#ff1f4b', '#ff8a5c'),
      els: [
        rot(tx('TOP', 64, 40, 600, { font: 'Anton', size: 170, weight: 400, fill: '#ffffff', strokeColor: '#141414', strokeWidth: 8 }), -4),
        rot(tx('10', 60, 236, 600, { font: 'Anton', size: 400, weight: 400, fill: '#ffe066', strokeColor: '#141414', strokeWidth: 12, lineHeight: 1 }), -4),
        rot(gr('ed-wow', 770, 40, 450, 450, ['#ffe14d', '#141414']), 8),
        sh('rect', 620, 540, 600, 120, '#141414', { radius: 22 }),
        tx('GADGETS UNDER $50', 620, 572, 600, { font: 'Archivo Black', size: 44, weight: 400, fill: '#ffffff', align: 'center' }),
      ],
    }]),
    T('yt-vlog', 'Vlog Thumbnail', 'YouTube', 1280, 720, [{
      bg: '#ffe14d',
      els: [
        photo(as('yt-vlog'), 'vlog', ['#c2416b', '#f6a8bf'], 700, 50, 530, 620, { radius: 36 }),
        rot(gr('ed-vlog-camera', 600, 430, 240, 240, ['#1f2233', '#ff4f7a']), -10),
        tx('A DAY\nIN MY LIFE', 60, 110, 620, { font: 'Bebas Neue', size: 168, weight: 400, fill: '#141414', lineHeight: 0.9 }),
        sh('rect', 60, 450, 280, 84, '#e0245e', { radius: 42 }),
        tx('VLOG #12', 60, 465, 280, { font: 'Poppins', size: 44, weight: 800, fill: '#ffffff', align: 'center' }),
        tx('NYC edition', 60, 560, 400, { font: 'Poppins', size: 44, weight: 600, fill: '#141414' }),
      ],
    }], 15, A['yt-vlog']),

    // ===================== Presentation (1920×1080) =====================
    (() => {
      const INK = '#101828', BLUE = '#2f5bea', GREY = '#5b6475';
      const assets = as('pitch-deck');
      return T('pitch-deck', 'Clean Pitch Deck', 'Presentation', 1920, 1080, [
        {
          bg: '#ffffff',
          els: [
            photo(assets, 'pitch', ['#2f5bea', '#a9bdf7'], 1180, 0, 740, 1080),
            sh('rect', 140, 140, 44, 44, BLUE, { radius: 10 }),
            tx('Fuzzy Co.', 204, 140, 700, { font: 'Inter', size: 40, weight: 700, fill: INK }),
            tx('Big ideas,\nbeautifully told.', 140, 360, 980, { font: 'Inter', size: 124, weight: 800, fill: INK, lineHeight: 1.04, letterSpacing: -3 }),
            tx('Company overview · Q4 2026', 140, 680, 900, { font: 'Inter', size: 44, weight: 500, fill: GREY }),
            sh('line', 142, 880, 900, 3, '#d9dee8', { strokeWidth: 2 }),
            tx('Presented by Alex Lane · October 2026', 140, 910, 900, { font: 'Inter', size: 32, weight: 500, fill: GREY }),
          ],
        },
        {
          bg: '#ffffff',
          els: [
            tx('Agenda', 140, 120, 900, { font: 'Inter', size: 96, weight: 800, fill: INK, letterSpacing: -2 }),
            ...[['The problem', 'Why teams lose hours to busywork'], ['Our solution', 'One calm workspace for every project'], ['Market', '$4.2B and growing 18% a year'], ['Roadmap', 'What we ship in the next 12 months']].flatMap(([t, d], i) => [
              sh('line', 142, 300 + i * 175, 1636, 3, '#e3e7ef', { strokeWidth: 2 }),
              tx(`0${i + 1}`, 140, 330 + i * 175, 160, { font: 'Inter', size: 56, weight: 800, fill: BLUE }),
              tx(t, 320, 330 + i * 175, 640, { font: 'Inter', size: 56, weight: 700, fill: INK }),
              tx(d, 1000, 344 + i * 175, 780, { font: 'Inter', size: 38, weight: 500, fill: GREY }),
            ]),
          ],
        },
        {
          bg: BLUE,
          els: [
            ct(1920, 'Thank you!', 360, 1400, { font: 'Inter', size: 170, weight: 800, fill: '#ffffff', letterSpacing: -4 }),
            ct(1920, 'hello@fuzzy.co · fuzzy.co', 620, 1400, { font: 'Inter', size: 52, weight: 500, fill: '#ffffff' }),
          ],
        },
      ], 0, assets);
    })(),
    (() => {
      const INK = '#1c1830';
      return T('creative-deck', 'Pop Presentation', 'Presentation', 1920, 1080, [
        {
          bg: '#fff6e5',
          els: [
            gr('zigzag', 1200, 120, 560, 140, ['#ff4f9a']),
            gr('half-circle', 1320, 780, 600, 300, ['#4cc9f0']),
            gr('pill-stripes', 1400, 430, 400, 160, ['#ffd23f', INK]),
            tx('CREATIVE\nSTUDIO', 140, 260, 1200, { font: 'Rubik Mono One', size: 150, weight: 400, fill: INK, lineHeight: 1.05 }),
            tx('Portfolio 2026 — design, motion & illustration', 140, 640, 1100, { font: 'Space Grotesk', size: 48, weight: 500, fill: '#4a4560' }),
            tx('hello@creativestudio.co', 140, 900, 900, { font: 'Space Grotesk', size: 36, weight: 700, fill: INK }),
          ],
        },
        {
          bg: INK,
          els: [
            gr('cross-pattern', 1600, 100, 200, 200, ['#ffd23f']),
            tx('What we do', 140, 140, 1200, { font: 'Rubik Mono One', size: 90, weight: 400, fill: '#ffffff' }),
            ...[['Brand', '#ff4f9a', 'Identity systems,\nlogos & guidelines'], ['Motion', '#4cc9f0', 'Launch films, loops\n& UI animation'], ['Print', '#ffd23f', 'Posters, packaging\n& editorial']].flatMap(([t, c, d], i) => [
              sh('rect', 140 + i * 560, 380, 500, 540, c, { radius: 40 }),
              tx(t, 190 + i * 560, 700, 420, { font: 'Space Grotesk', size: 68, weight: 700, fill: INK }),
              tx(d, 190 + i * 560, 790, 420, { font: 'Space Grotesk', size: 34, weight: 500, fill: INK, lineHeight: 1.3 }),
            ]),
          ],
        },
      ], 30);
    })(),

    // ===================== Business card (1050×600) =====================
    T('card-modern', 'Modern Card', 'Business card', 1050, 600, [{
      bg: '#ffffff',
      els: [
        sh('rect', 0, 0, 360, 600, '#1c1830'),
        sh('ellipse', 110, 230, 140, 140, '#f2545b'),
        tx('AL', 110, 272, 140, { font: 'Montserrat', size: 50, weight: 800, fill: '#ffffff', align: 'center' }),
        tx('Alex Lane', 430, 140, 560, { font: 'Montserrat', size: 66, weight: 800, fill: '#1c1830' }),
        tx('PRODUCT DESIGNER', 430, 232, 560, { font: 'Montserrat', size: 26, weight: 700, fill: '#d33b45', letterSpacing: 6 }),
        sh('line', 432, 300, 80, 6, '#f2545b', { strokeWidth: 5 }),
        tx('alex@studio.com\n+1 555 0199\nstudio.com', 430, 340, 560, { font: 'Montserrat', size: 28, weight: 500, fill: '#4a4558', lineHeight: 1.5 }),
      ],
    }]),
    T('card-pastel', 'Pastel Card', 'Business card', 1050, 600, [{
      bg: '#fbeae6',
      els: [
        sh('ellipse', 700, 90, 420, 420, '#f6d3cc'),
        gr('ed-tulips', 740, 120, 330, 330, ['#f07a98', '#5f9a6b', '#f3e2cc']),
        tx('Mia Rose', 80, 140, 640, { font: 'Great Vibes', size: 116, weight: 400, fill: '#7a3e57' }),
        tx('FLORAL DESIGN STUDIO', 80, 300, 640, { font: 'Montserrat', size: 26, weight: 600, fill: '#7a3e57', letterSpacing: 6 }),
        tx('mia@blooms.co · @miablooms\n(555) 014-2290', 80, 420, 640, { font: 'Montserrat', size: 26, weight: 500, fill: '#5e3a48', lineHeight: 1.45 }),
      ],
    }], 15),

    // ===================== Invitation (1500×2100) =====================
    T('party-invite', 'Party Invite', 'Invitation', 1500, 2100, [{
      bg: '#1d1b3a',
      els: [
        gr('confetti', 0, -280, 1500, 1000, ['#ff4f9a', '#ffd23f', '#4cc9f0']),
        gr('ed-party-popper', 550, 330, 400, 400, ['#ff4f9a', '#ffd23f', '#4cc9f0']),
        ct(1500, 'You’re invited', 820, 1300, { font: 'Pacifico', size: 150, weight: 400, fill: '#ffd23f' }),
        ct(1500, 'TO A PARTY!', 1030, 1300, { font: 'Bebas Neue', size: 230, weight: 400, fill: '#ffffff', letterSpacing: 14 }),
        sh('rect', 400, 1320, 700, 4, 'rgba(255,255,255,0.4)'),
        ct(1500, 'Saturday, Nov 14 · 7 PM\n12 Sunset Blvd', 1390, 1200, { font: 'Poppins', size: 66, weight: 600, fill: '#ffffff', lineHeight: 1.4 }),
        ct(1500, 'RSVP to Sam by Nov 7 · 555-0110', 1650, 1200, { font: 'Poppins', size: 46, weight: 500, fill: '#c9c4ee' }),
      ],
    }]),
    T('save-the-date', 'Save the Date', 'Invitation', 1500, 2100, [{
      bg: '#fbf7f2',
      els: [
        sh('rect', 80, 80, 1340, 1940, 'rgba(0,0,0,0)', { stroke: '#c9a96e', strokeWidth: 4 }),
        sh('rect', 110, 110, 1280, 1880, 'rgba(0,0,0,0)', { stroke: '#c9a96e', strokeWidth: 2 }),
        gr('leaf', 650, 260, 200, 286, ['#9caf88', '#6b7f5a']),
        ct(1500, 'Save the Date', 660, 1300, { font: 'Great Vibes', size: 200, weight: 400, fill: '#6b5a3e' }),
        ct(1500, 'EMMA & NOAH', 1000, 1200, { font: 'Playfair Display', size: 110, weight: 600, fill: '#3b3326', letterSpacing: 12 }),
        ct(1500, '18 · 09 · 2027', 1230, 1200, { font: 'Playfair Display', size: 84, weight: 400, fill: '#a8853f', letterSpacing: 16 }),
        ct(1500, 'Lake Como, Italy\nFormal invitation to follow', 1440, 1200, { font: 'Playfair Display', size: 54, weight: 400, italic: true, fill: '#6b5a3e', lineHeight: 1.5 }),
        ct(1500, 'emmaandnoah.com', 1760, 1000, { font: 'Playfair Display', size: 44, weight: 600, fill: '#a8853f', letterSpacing: 4 }),
      ],
    }], 30),

    // ===================== Logo (1000×1000) =====================
    T('logo-badge', 'Badge Logo', 'Logo', 1000, 1000, [{
      bg: '#ffffff',
      els: [
        sh('ellipse', 150, 150, 700, 700, '#1c1830'),
        sh('ring', 190, 190, 620, 620, '#ffd23f', { strokeWidth: 6, dash: true }),
        gr('ed-latte', 380, 250, 240, 240, ['#f6e7d0', '#8a5a3b']),
        ct(1000, 'FUZZY BEANS', 520, 600, { font: 'Bebas Neue', size: 110, weight: 400, fill: '#ffffff', letterSpacing: 8 }),
        ct(1000, 'EST. 2026', 650, 400, { font: 'Montserrat', size: 32, weight: 700, fill: '#ffd23f', letterSpacing: 10 }),
      ],
    }]),
    T('logo-gradient', 'Gradient Mark', 'Logo', 1000, 1000, [{
      bg: '#0f0e17',
      els: [
        rot(sh('rect', 330, 180, 340, 340, lg(135, '#ff4f9a', '#ff9a3c'), { radius: 90 }), 45),
        rot(sh('rect', 405, 255, 190, 190, '#0f0e17', { radius: 50 }), 45),
        ct(1000, 'nova', 610, 700, { font: 'Space Grotesk', size: 150, weight: 700, fill: '#ffffff', letterSpacing: -4 }),
        ct(1000, 'STUDIO', 800, 500, { font: 'Space Grotesk', size: 34, weight: 500, fill: '#a7a3b8', letterSpacing: 14 }),
      ],
    }], 20),

    // ===================== Wallpaper =====================
    T('wallpaper-dream', 'Dreamy Wallpaper', 'Wallpaper', 1170, 2532, [{
      bg: lg(180, '#1b2a4e', '#c4577a', '#ffb88c'),
      els: [
        gr('moon', 760, 860, 260, 260, ['#fff1c1', '#ffffff']),
        named(gr('ed-sparkles', 120, 820, 300, 300, ['#ffe39a', '#ffffff']), 'Stars'),
        named(gr('ed-sparkles', 640, 1240, 200, 200, ['#ffe39a', '#ffffff'], { flipX: true }), 'Stars'),
        gr('mountains', -60, 1900, 1290, 645, ['#1b2440', '#5a3a66', '#ffd6e8']),
        ct(1170, 'dream big', 1440, 1000, { font: 'Pacifico', size: 150, weight: 400, fill: '#ffffff' }),
      ],
    }], 10),
  ];
}

let cache: Template[] | null = null;
export function templates(): Template[] {
  return (cache ??= build());
}
export const templateById = (id: string): Template | undefined => templates().find((t) => t.id === id);
