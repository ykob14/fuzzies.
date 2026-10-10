/** Built-in templates. Free ones are ready to use; premium ones unlock with Fuzzies. */
import type { Design, El, Fill, Gradient, ShapeKind, TextEl, ShapeEl, GraphicEl, EmojiEl } from '../editor/types';
import { makeEmoji, makeGraphic, makeShape, makeText, newPage } from '../editor/doc';

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
const rg = (...colors: string[]): Gradient => ({ kind: 'radial', angle: 0, stops: colors.map((color, i) => ({ at: i / Math.max(1, colors.length - 1), color })) });

function tx(text: string, x: number, y: number, w: number, o: Partial<TextEl> = {}): TextEl {
  const el = makeText(text, { w, ...o });
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
function gr(art: string, x: number, y: number, w: number, h: number, colors?: string[], o: Partial<GraphicEl> = {}): GraphicEl {
  const el = makeGraphic(art, w, o);
  Object.assign(el, { x, y, w, h });
  if (colors) el.colors = colors;
  return el;
}
function em(char: string, x: number, y: number, size: number, o: Partial<EmojiEl> = {}): EmojiEl {
  const el = makeEmoji(char, size, o);
  el.x = x; el.y = y;
  return el;
}
const rot = <T extends El>(el: T, deg: number): T => { el.rotation = deg; return el; };

let n = 0;
function T(id: string, name: string, category: string, w: number, h: number, pages: { bg: Fill; els: El[] }[], cost = 0): Template {
  return {
    id, name, category, cost,
    design: { id: `tpl_${id}`, owner: 'system', name, width: w, height: h, template: id, assets: {}, createdAt: ++n, updatedAt: n, pages: pages.map((p) => newPage(p.bg, p.els)) },
  };
}

const INK = '#1c1830';

function build(): Template[] {
  return [
    // ===================== Social (1080×1080) =====================
    T('summer-sale', 'Summer Sale', 'Social', 1080, 1080, [{
      bg: lg(160, '#ff9a5a', '#ff5e7e', '#c045c9'),
      els: [
        gr('blob1', -160, -180, 620, 620, ['rgba(255,255,255,0.14)']),
        gr('blob2', 640, 640, 560, 560, ['rgba(255,255,255,0.12)']),
        gr('retro-sun', 340, 100, 400, 400, ['#ffb03a', '#ffe36e', '#ff7a6a']),
        ct(1080, 'SUMMER', 520, 1000, { font: 'Bebas Neue', size: 250, weight: 400, fill: '#ffffff', letterSpacing: 6, lineHeight: 0.95 }),
        ct(1080, 'SALE', 740, 1000, { font: 'Bebas Neue', size: 150, weight: 400, fill: '#fff4c2', letterSpacing: 30, lineHeight: 0.95 }),
        sh('rect', 330, 905, 420, 84, '#ffffff', { radius: 42 }),
        ct(1080, 'UP TO 50% OFF', 925, 420, { font: 'Poppins', size: 34, weight: 800, fill: '#e2456d', letterSpacing: 2 }),
      ],
    }]),
    T('quote-classic', 'Classic Quote', 'Social', 1080, 1080, [{
      bg: '#f7efe4',
      els: [
        sh('rect', 60, 60, 960, 960, 'rgba(0,0,0,0)', { stroke: '#d9c6ad', strokeWidth: 3 }),
        ct(1080, '“', 120, 300, { font: 'Playfair Display', size: 300, weight: 700, fill: '#e07a5f', lineHeight: 0.9 }),
        ct(1080, 'Creativity is intelligence having fun.', 380, 820, { font: 'Playfair Display', size: 76, weight: 600, italic: true, fill: '#3d2c2e', lineHeight: 1.25 }),
        sh('line', 470, 720, 140, 6, '#e07a5f', { strokeWidth: 4 }),
        ct(1080, 'ALBERT EINSTEIN', 760, 600, { font: 'Montserrat', size: 30, weight: 600, fill: '#8a7466', letterSpacing: 8 }),
      ],
    }]),
    T('new-drop', 'New Drop', 'Social', 1080, 1080, [{
      bg: '#101014',
      els: [
        gr('blob2', 220, 160, 700, 700, ['#7c4dff']),
        gr('blob1', 330, 280, 520, 520, ['#ff4f9a']),
        tx('NEW', 90, 120, 900, { font: 'Archivo Black', size: 230, weight: 400, fill: '#ffffff', align: 'left', lineHeight: 0.9 }),
        tx('DROP', 90, 330, 900, { font: 'Archivo Black', size: 230, weight: 400, fill: 'rgba(0,0,0,0)', strokeColor: '#ffffff', strokeWidth: 3, align: 'left', lineHeight: 0.9 }),
        gr('sparkle', 820, 140, 120, 120, ['#ffd23f', '#ffffff']),
        gr('sparkle', 900, 300, 60, 60, ['#ffffff', '#ffffff']),
        tx('Fall collection · Available Friday', 90, 900, 900, { font: 'Space Grotesk', size: 38, weight: 500, fill: '#d6d3e6', align: 'left' }),
        sh('arrow', 860, 905, 120, 46, '#ffd23f'),
      ],
    }]),
    T('motivation', 'Monday Motivation', 'Social', 1080, 1080, [{
      bg: lg(135, '#a18cd1', '#fbc2eb'),
      els: [
        sh('rect', 110, 160, 860, 760, 'rgba(255,255,255,0.75)', { radius: 60 }),
        em('☀️', 470, 210, 140),
        ct(1080, 'MONDAY MOTIVATION', 390, 760, { font: 'Fredoka', size: 40, weight: 600, fill: '#8a63ff', letterSpacing: 6 }),
        ct(1080, 'Small steps every day add up to big things.', 470, 740, { font: 'Fredoka', size: 78, weight: 700, fill: INK, lineHeight: 1.12 }),
        gr('squiggle', 390, 820, 300, 75, ['#ff7ac2']),
      ],
    }]),
    T('cafe-special', 'Café Special', 'Social', 1080, 1080, [{
      bg: '#fff3e0',
      els: [
        sh('ellipse', 590, 300, 620, 620, '#ffcc80'),
        sh('ellipse', 650, 360, 500, 500, '#ffb74d'),
        em('☕', 700, 420, 300),
        em('🥐', 620, 700, 160),
        tx('Morning', 80, 170, 600, { font: 'Pacifico', size: 110, weight: 400, fill: '#6d3b1c', align: 'left' }),
        tx('TREATS', 80, 310, 600, { font: 'Bebas Neue', size: 170, weight: 400, fill: '#e65100', align: 'left', letterSpacing: 6, lineHeight: 0.95 }),
        tx('Latte + croissant\nevery day before 11', 80, 500, 520, { font: 'Poppins', size: 40, weight: 500, fill: '#6d3b1c', align: 'left', lineHeight: 1.35 }),
        rot(sh('burst', 90, 700, 230, 230, '#e65100'), -10),
        rot(tx('$6', 105, 765, 200, { font: 'Archivo Black', size: 80, weight: 400, fill: '#ffffff' }), -10),
      ],
    }], 15),
    T('giveaway', 'Giveaway', 'Social', 1080, 1080, [{
      bg: lg(180, '#2b1055', '#7597de'),
      els: [
        gr('confetti', 0, 0, 1080, 720, ['#ff7ac2', '#ffd23f', '#4cc9f0']),
        gr('gift', 380, 260, 320, 320, ['#ff4f9a', '#ffd23f']),
        ct(1080, 'GIVEAWAY', 620, 1000, { font: 'Anton', size: 170, weight: 400, fill: '#ffffff', letterSpacing: 6 }),
        ct(1080, 'Like · Follow · Tag 2 friends', 860, 900, { font: 'Poppins', size: 40, weight: 600, fill: '#ffe1f0' }),
      ],
    }], 20),

    // ===================== Story (1080×1920) =====================
    T('this-or-that', 'This or That', 'Story', 1080, 1920, [{
      bg: '#fef6e4',
      els: [
        ct(1080, 'THIS', 140, 900, { font: 'Archivo Black', size: 150, weight: 400, fill: '#f582ae' }),
        ct(1080, 'or that?', 310, 900, { font: 'Caveat', size: 120, weight: 700, fill: INK }),
        sh('rect', 90, 560, 430, 560, '#f582ae', { radius: 50 }),
        sh('rect', 560, 560, 430, 560, '#8bd3dd', { radius: 50 }),
        em('🍕', 195, 700, 220),
        em('🍣', 665, 700, 220),
        tx('Pizza', 90, 1150, 430, { font: 'Fredoka', size: 70, weight: 700, fill: INK, align: 'center' }),
        tx('Sushi', 560, 1150, 430, { font: 'Fredoka', size: 70, weight: 700, fill: INK, align: 'center' }),
        ct(1080, 'Vote in the poll ↓', 1500, 900, { font: 'Poppins', size: 48, weight: 600, fill: '#6b6684' }),
      ],
    }]),
    T('birthday-story', 'Birthday Bash', 'Story', 1080, 1920, [{
      bg: lg(170, '#ffd1e8', '#c8b6ff'),
      els: [
        gr('confetti', 0, 0, 1080, 720),
        gr('balloons', 300, 330, 480, 600, ['#ff4f9a', '#7c4dff', '#ffd23f']),
        ct(1080, 'Happy', 980, 1000, { font: 'Pacifico', size: 160, weight: 400, fill: '#ff2f8e' }),
        ct(1080, 'BIRTHDAY', 1200, 1000, { font: 'Bebas Neue', size: 210, weight: 400, fill: '#3a1d6e', letterSpacing: 10 }),
        ct(1080, 'Saturday 8 PM · Bring your best dance moves', 1460, 800, { font: 'Poppins', size: 44, weight: 600, fill: '#3a1d6e', lineHeight: 1.3 }),
        gr('cake', 450, 1640, 180, 200),
      ],
    }], 20),
    T('travel-story', 'Weekend Escape', 'Story', 1080, 1920, [{
      bg: lg(180, '#4facfe', '#00f2fe', '#fef9d7'),
      els: [
        gr('cloud', 80, 220, 300, 176, ['rgba(255,255,255,0.9)']),
        gr('cloud', 680, 380, 260, 152, ['rgba(255,255,255,0.8)']),
        gr('sunburst-lines', 700, 120, 240, 240, ['#ffd23f']),
        gr('mountains', -40, 1220, 1160, 580, ['#3b5bdb', '#748ffc', '#ffffff']),
        ct(1080, 'weekend', 560, 1000, { font: 'Pacifico', size: 140, weight: 400, fill: '#ffffff', shadow: { color: 'rgba(0,0,0,0.2)', blur: 20, x: 0, y: 8 } }),
        ct(1080, 'ESCAPE', 760, 1000, { font: 'Anton', size: 230, weight: 400, fill: '#ffffff', letterSpacing: 12, shadow: { color: 'rgba(0,0,0,0.2)', blur: 20, x: 0, y: 8 } }),
        sh('rect', 340, 1060, 400, 90, '#ffffff', { radius: 45 }),
        ct(1080, 'Book now ✈️', 1080, 400, { font: 'Poppins', size: 40, weight: 700, fill: '#1971c2' }),
      ],
    }], 20),
    T('story-announce', 'Big News', 'Story', 1080, 1920, [{
      bg: '#111111',
      els: [
        sh('ellipse', -200, -200, 900, 900, rg('#ff4f9a', 'rgba(255,79,154,0)')),
        sh('ellipse', 400, 1200, 1000, 1000, rg('#7c4dff', 'rgba(124,77,255,0)')),
        ct(1080, 'BIG', 600, 1000, { font: 'Archivo Black', size: 260, weight: 400, fill: '#ffffff', lineHeight: 0.9 }),
        ct(1080, 'NEWS', 830, 1000, { font: 'Archivo Black', size: 260, weight: 400, fill: 'rgba(0,0,0,0)', strokeColor: '#ffffff', strokeWidth: 4, lineHeight: 0.9 }),
        ct(1080, 'Something new is coming. Stay tuned!', 1150, 760, { font: 'Space Grotesk', size: 52, weight: 500, fill: '#cfc9e6', lineHeight: 1.3 }),
        em('👀', 470, 1420, 140),
      ],
    }]),

    // ===================== Poster =====================
    T('exhibition', 'Modern Exhibition', 'Poster', 1587, 2245, [{
      bg: '#f2efe9',
      els: [
        sh('ellipse', 440, 300, 900, 900, '#ff6b35'),
        sh('rect', 160, 820, 520, 520, INK),
        sh('triangle', 900, 1000, 460, 400, '#2ec4b6'),
        tx('FORM\n& COLOUR', 140, 1500, 1300, { font: 'Montserrat', size: 170, weight: 900, fill: INK, align: 'left', lineHeight: 0.95, letterSpacing: -4 }),
        tx('A modern art exhibition · 12–28 March · City Gallery', 140, 1930, 1300, { font: 'Montserrat', size: 40, weight: 500, fill: '#55506a', align: 'left' }),
        tx('01', 1300, 140, 160, { font: 'Montserrat', size: 60, weight: 800, fill: INK, align: 'right' }),
      ],
    }]),
    T('spring-fair', 'Spring Fair', 'Poster', 1587, 2245, [{
      bg: lg(180, '#e8f7ee', '#fdf0f5'),
      els: [
        gr('blob1', -250, -250, 900, 900, ['#b7e4c7']),
        gr('blob2', 950, 1650, 900, 900, ['#ffc6d9']),
        em('🌸', 150, 200, 200), em('🌷', 1220, 300, 180), em('🌼', 1250, 1500, 160), em('🌿', 120, 1700, 180),
        ct(1587, 'Spring', 520, 1300, { font: 'Pacifico', size: 260, weight: 400, fill: '#e75480' }),
        ct(1587, 'FAIR', 850, 1300, { font: 'Bebas Neue', size: 380, weight: 400, fill: '#2d6a4f', letterSpacing: 40 }),
        ct(1587, 'Flowers · Food trucks · Live music · Kids corner', 1300, 1100, { font: 'Poppins', size: 54, weight: 600, fill: '#2d6a4f', lineHeight: 1.4 }),
        sh('rect', 493, 1560, 600, 120, '#e75480', { radius: 60 }),
        ct(1587, 'SAT 18 APRIL', 1590, 600, { font: 'Poppins', size: 52, weight: 800, fill: '#ffffff', letterSpacing: 4 }),
      ],
    }]),
    T('live-music', 'Live Music Night', 'Poster', 1587, 2245, [{
      bg: lg(180, '#0b0c2a', '#2b1055'),
      els: [
        sh('ring', 293, 300, 1000, 1000, lg(90, '#ff2bd6', '#00f0ff'), { strokeWidth: 30 }),
        sh('ring', 443, 450, 700, 700, lg(90, '#00f0ff', '#ff2bd6'), { strokeWidth: 18 }),
        em('🎸', 618, 620, 350),
        ct(1587, 'LIVE MUSIC', 1420, 1500, { font: 'Bebas Neue', size: 300, weight: 400, fill: '#ffffff', letterSpacing: 20, shadow: { color: '#ff2bd6', blur: 40, x: 0, y: 0 } }),
        ct(1587, 'FRIDAY NIGHT · DOORS 9PM', 1760, 1300, { font: 'Montserrat', size: 64, weight: 700, fill: '#00f0ff', letterSpacing: 10 }),
        ct(1587, 'The Velvet Room · 21+ · Free entry before 10', 1900, 1300, { font: 'Montserrat', size: 44, weight: 500, fill: '#b9b3e0' }),
      ],
    }], 25),
    T('retro-poster', 'Retro Vibes', 'Poster', 1587, 2245, [{
      bg: '#fff1d6',
      els: [
        gr('retro-sun', 293, 260, 1000, 1000, ['#ff7a59', '#ffd23f', '#ff4f9a']),
        gr('rainbow', 193, 1100, 1200, 600, ['#ff5e62', '#ffb000', '#2ec4b6']),
        ct(1587, 'GOOD VIBES', 1550, 1500, { font: 'Shrikhand', size: 220, weight: 400, fill: '#d6336c', strokeColor: '#fff1d6', strokeWidth: 0, shadow: { color: '#ffb000', blur: 0, x: 10, y: 10 } }),
        ct(1587, 'ONLY · SINCE 1975', 1850, 1200, { font: 'Righteous', size: 80, weight: 400, fill: '#2b2d42', letterSpacing: 16 }),
      ],
    }], 30),

    // ===================== Flyer =====================
    T('yard-sale', 'Yard Sale', 'Flyer', 1240, 1754, [{
      bg: '#ffd23f',
      els: [
        rot(sh('burst', 760, 90, 400, 400, '#e63946'), 12),
        rot(tx('EVERYTHING\nMUST GO!', 790, 230, 340, { font: 'Archivo Black', size: 46, weight: 400, fill: '#ffffff', lineHeight: 1.1 }), 12),
        tx('YARD', 90, 380, 1000, { font: 'Archivo Black', size: 300, weight: 400, fill: INK, align: 'left', lineHeight: 0.9 }),
        tx('SALE', 90, 650, 1000, { font: 'Archivo Black', size: 300, weight: 400, fill: '#ffffff', strokeColor: INK, strokeWidth: 8, align: 'left', lineHeight: 0.9 }),
        sh('rect', 90, 1030, 1060, 8, INK),
        tx('Saturday · 8 AM – 2 PM\n42 Maple Street', 90, 1090, 1060, { font: 'Poppins', size: 64, weight: 700, fill: INK, align: 'left', lineHeight: 1.3 }),
        tx('Furniture · Books · Toys · Clothes · Plants · Vinyl', 90, 1350, 1060, { font: 'Poppins', size: 40, weight: 500, fill: '#5c4b00', align: 'left', lineHeight: 1.4 }),
        em('🛋️', 900, 1450, 200), em('📚', 680, 1500, 150),
      ],
    }]),
    T('yoga-class', 'Yoga Class', 'Flyer', 1240, 1754, [{
      bg: lg(180, '#f1f7ed', '#dcebdf'),
      els: [
        sh('arch', 270, 160, 700, 860, '#a3c9a8'),
        sh('ellipse', 520, 300, 200, 200, '#f6bd60'),
        gr('leaf', 380, 600, 200, 286, ['#52796f', '#2f3e46']),
        rot(gr('leaf', 660, 620, 180, 257, ['#84a98c', '#2f3e46']), 25),
        ct(1240, 'Morning Yoga', 1090, 1100, { font: 'Lora', size: 120, weight: 700, fill: '#2f3e46' }),
        ct(1240, 'Breathe in. Slow down. Feel good.', 1260, 1000, { font: 'Lora', size: 48, weight: 400, italic: true, fill: '#52796f' }),
        ct(1240, 'EVERY SUNDAY · 9 AM · RIVERSIDE PARK', 1420, 1100, { font: 'Montserrat', size: 36, weight: 700, fill: '#2f3e46', letterSpacing: 6 }),
        ct(1240, 'All levels welcome · Bring a mat', 1500, 1100, { font: 'Montserrat', size: 34, weight: 500, fill: '#52796f' }),
      ],
    }], 20),
    T('lost-pet', 'Lost Pet', 'Flyer', 1240, 1754, [{
      bg: '#ffffff',
      els: [
        sh('rect', 0, 0, 1240, 330, '#e63946'),
        ct(1240, 'LOST CAT', 70, 1100, { font: 'Archivo Black', size: 190, weight: 400, fill: '#ffffff' }),
        sh('rect', 220, 400, 800, 640, '#f1f1f5', { radius: 30, stroke: '#d0d0da', strokeWidth: 4, dash: true }),
        em('🐱', 470, 560, 300),
        ct(1240, 'Add a photo here', 950, 800, { font: 'Poppins', size: 34, weight: 500, fill: '#9a96ad' }),
        ct(1240, 'Name: Mochi · Grey tabby · Very friendly', 1110, 1100, { font: 'Poppins', size: 52, weight: 700, fill: INK }),
        ct(1240, 'Last seen near Oak Ave on Tuesday evening', 1200, 1100, { font: 'Poppins', size: 40, weight: 500, fill: '#55506a' }),
        sh('rect', 170, 1360, 900, 200, '#ffd23f', { radius: 30 }),
        ct(1240, 'CALL 555-0123', 1405, 900, { font: 'Archivo Black', size: 90, weight: 400, fill: INK }),
      ],
    }]),

    // ===================== YouTube (1280×720) =====================
    T('yt-top10', 'Top 10 Thumbnail', 'YouTube', 1280, 720, [{
      bg: lg(120, '#ff0844', '#ffb199'),
      els: [
        rot(tx('TOP', 60, 70, 600, { font: 'Anton', size: 170, weight: 400, fill: '#ffffff', align: 'left', strokeColor: INK, strokeWidth: 8 }), -4),
        rot(tx('10', 60, 230, 600, { font: 'Anton', size: 420, weight: 400, fill: '#ffe066', align: 'left', strokeColor: INK, strokeWidth: 12, lineHeight: 1 }), -4),
        em('😱', 760, 140, 420),
        sh('rect', 640, 560, 600, 110, INK, { radius: 20 }),
        tx('YOU WON’T BELIEVE #1', 650, 580, 580, { font: 'Archivo Black', size: 46, weight: 400, fill: '#ffffff' }),
      ],
    }]),
    T('yt-vlog', 'Vlog Thumbnail', 'YouTube', 1280, 720, [{
      bg: lg(135, '#43e97b', '#38f9d7'),
      els: [
        gr('blob1', 650, -120, 760, 760, ['#ffffff']),
        em('🤳', 800, 120, 360),
        rot(tx('A DAY\nIN MY LIFE', 60, 140, 700, { font: 'Bebas Neue', size: 190, weight: 400, fill: INK, align: 'left', lineHeight: 0.9 }), -3),
        rot(sh('rect', 70, 560, 380, 80, '#ff4f9a', { radius: 40 }), -3),
        rot(tx('vlog #12', 70, 570, 380, { font: 'Poppins', size: 44, weight: 800, fill: '#ffffff' }), -3),
      ],
    }], 15),

    // ===================== Presentation (1920×1080) =====================
    T('pitch-deck', 'Clean Pitch Deck', 'Presentation', 1920, 1080, [
      {
        bg: '#ffffff',
        els: [
          sh('rect', 1180, 0, 740, 1080, lg(160, '#7c4dff', '#ff4f9a')),
          gr('blob2', 1300, 260, 560, 560, ['rgba(255,255,255,0.18)']),
          tx('Fuzzy Co.', 140, 140, 900, { font: 'Inter', size: 40, weight: 700, fill: '#7c4dff', align: 'left' }),
          tx('Big ideas,\nbeautifully told.', 140, 360, 1000, { font: 'Inter', size: 120, weight: 800, fill: INK, align: 'left', lineHeight: 1.05, letterSpacing: -3 }),
          tx('Company overview · 2026', 140, 700, 900, { font: 'Inter', size: 40, weight: 500, fill: '#6b6684', align: 'left' }),
        ],
      },
      {
        bg: '#ffffff',
        els: [
          tx('Agenda', 140, 120, 900, { font: 'Inter', size: 90, weight: 800, fill: INK, align: 'left' }),
          ...['The problem', 'Our solution', 'Market', 'Roadmap'].flatMap((t, i) => [
            sh('ellipse', 140, 330 + i * 160, 90, 90, i % 2 ? '#ff4f9a' : '#7c4dff'),
            tx(String(i + 1), 140, 352 + i * 160, 90, { font: 'Inter', size: 40, weight: 800, fill: '#ffffff' }),
            tx(t, 270, 348 + i * 160, 1200, { font: 'Inter', size: 56, weight: 600, fill: INK, align: 'left' }),
          ]),
        ],
      },
      {
        bg: lg(160, '#7c4dff', '#ff4f9a'),
        els: [
          ct(1920, 'Thank you!', 380, 1400, { font: 'Inter', size: 160, weight: 800, fill: '#ffffff', letterSpacing: -4 }),
          ct(1920, 'hello@fuzzy.co · fuzzy.co', 620, 1400, { font: 'Inter', size: 48, weight: 500, fill: 'rgba(255,255,255,0.85)' }),
        ],
      },
    ]),
    T('creative-deck', 'Pop Presentation', 'Presentation', 1920, 1080, [
      {
        bg: '#fff6e5',
        els: [
          gr('zigzag', 1200, 120, 600, 150, ['#ff4f9a']),
          gr('half-circle', 1300, 780, 600, 300, ['#4cc9f0']),
          gr('triangles', 80, 760, 450, 300),
          gr('pill-stripes', 1350, 420, 400, 160, ['#ffd23f', INK]),
          tx('CREATIVE\nSTUDIO', 140, 260, 1200, { font: 'Rubik Mono One', size: 150, weight: 400, fill: INK, align: 'left', lineHeight: 1.05 }),
          tx('Portfolio 2026 — design, motion & illustration', 140, 640, 1100, { font: 'Space Grotesk', size: 46, weight: 500, fill: '#55506a', align: 'left' }),
        ],
      },
      {
        bg: INK,
        els: [
          gr('cross-pattern', 1600, 100, 220, 220, ['#ffd23f']),
          tx('What we do', 140, 140, 1200, { font: 'Rubik Mono One', size: 90, weight: 400, fill: '#ffffff', align: 'left' }),
          ...[['Brand', '#ff4f9a'], ['Motion', '#4cc9f0'], ['Print', '#ffd23f']].flatMap(([t, c], i) => [
            sh('rect', 140 + i * 560, 420, 500, 480, c, { radius: 40 }),
            tx(t, 180 + i * 560, 800, 420, { font: 'Space Grotesk', size: 64, weight: 700, fill: INK, align: 'left' }),
          ]),
        ],
      },
    ], 30),

    // ===================== Business card (1050×600) =====================
    T('card-modern', 'Modern Card', 'Business card', 1050, 600, [{
      bg: '#ffffff',
      els: [
        sh('rect', 0, 0, 360, 600, INK),
        sh('ellipse', 110, 230, 140, 140, lg(135, '#7c4dff', '#ff4f9a')),
        tx('AL', 110, 275, 140, { font: 'Montserrat', size: 48, weight: 800, fill: '#ffffff' }),
        tx('Alex Lane', 430, 150, 560, { font: 'Montserrat', size: 64, weight: 800, fill: INK, align: 'left' }),
        tx('PRODUCT DESIGNER', 430, 240, 560, { font: 'Montserrat', size: 26, weight: 600, fill: '#7c4dff', align: 'left', letterSpacing: 6 }),
        sh('line', 430, 310, 80, 6, '#ff4f9a', { strokeWidth: 5 }),
        tx('alex@studio.com\n+1 555 0199\nstudio.com', 430, 350, 560, { font: 'Montserrat', size: 28, weight: 500, fill: '#55506a', align: 'left', lineHeight: 1.5 }),
      ],
    }]),
    T('card-pastel', 'Pastel Card', 'Business card', 1050, 600, [{
      bg: lg(135, '#fde2e4', '#e2ece9', '#dfe7fd'),
      els: [
        gr('blob1', 700, -120, 460, 460, ['rgba(255,255,255,0.7)']),
        gr('flower', 820, 60, 140, 140, ['#ffffff', '#ffc83d']),
        tx('Mia Rose', 80, 170, 700, { font: 'Great Vibes', size: 110, weight: 400, fill: '#6d4c7d', align: 'left' }),
        tx('FLORAL DESIGN STUDIO', 80, 320, 700, { font: 'Montserrat', size: 26, weight: 600, fill: '#8f6f9e', align: 'left', letterSpacing: 6 }),
        tx('mia@blooms.co  ·  @miablooms', 80, 460, 900, { font: 'Montserrat', size: 26, weight: 500, fill: '#6d4c7d', align: 'left' }),
      ],
    }], 15),

    // ===================== Invitation (1500×2100) =====================
    T('party-invite', 'Party Invite', 'Invitation', 1500, 2100, [{
      bg: '#1d1b3a',
      els: [
        ...Array.from({ length: 28 }, (_, i) => {
          const cols = ['#ff4f9a', '#ffd23f', '#4cc9f0', '#7c4dff', '#2ec4b6'];
          const x = (i * 397) % 1440, y = (i * 211) % 700;
          return rot(sh(i % 3 ? 'rect' : 'ellipse', x, y, i % 3 ? 22 : 26, i % 3 ? 54 : 26, cols[i % 5], { radius: 6 }), (i * 47) % 180);
        }),
        ct(1500, 'You’re invited', 780, 1300, { font: 'Pacifico', size: 150, weight: 400, fill: '#ffd23f' }),
        ct(1500, 'TO A PARTY!', 1010, 1300, { font: 'Bebas Neue', size: 220, weight: 400, fill: '#ffffff', letterSpacing: 14 }),
        sh('rect', 300, 1330, 900, 4, 'rgba(255,255,255,0.4)'),
        ct(1500, 'Saturday, June 14 · 7 PM\n12 Sunset Blvd', 1400, 1200, { font: 'Poppins', size: 64, weight: 600, fill: '#ffffff', lineHeight: 1.4 }),
        ct(1500, 'RSVP to Sam · 555-0110', 1720, 1200, { font: 'Poppins', size: 44, weight: 500, fill: '#bcb6e8' }),
        em('🎉', 640, 1860, 200),
      ],
    }]),
    T('save-the-date', 'Save the Date', 'Invitation', 1500, 2100, [{
      bg: '#fbf7f2',
      els: [
        sh('rect', 80, 80, 1340, 1940, 'rgba(0,0,0,0)', { stroke: '#c9a96e', strokeWidth: 4 }),
        sh('rect', 110, 110, 1280, 1880, 'rgba(0,0,0,0)', { stroke: '#c9a96e', strokeWidth: 2 }),
        gr('leaf', 650, 240, 200, 286, ['#9caf88', '#6b7f5a']),
        ct(1500, 'Save the Date', 640, 1300, { font: 'Great Vibes', size: 200, weight: 400, fill: '#6b5a3e' }),
        ct(1500, 'EMMA & NOAH', 980, 1200, { font: 'Playfair Display', size: 110, weight: 600, fill: '#3b3326', letterSpacing: 12 }),
        ct(1500, '20 · 09 · 2027', 1210, 1200, { font: 'Playfair Display', size: 80, weight: 400, fill: '#c9a96e', letterSpacing: 16 }),
        ct(1500, 'Lake Como, Italy\nFormal invitation to follow', 1420, 1200, { font: 'Lora', size: 52, weight: 400, italic: true, fill: '#6b5a3e', lineHeight: 1.5 }),
      ],
    }], 30),

    // ===================== Logo (1000×1000) =====================
    T('logo-badge', 'Badge Logo', 'Logo', 1000, 1000, [{
      bg: '#ffffff',
      els: [
        sh('ellipse', 150, 150, 700, 700, INK),
        sh('ring', 190, 190, 620, 620, '#ffd23f', { strokeWidth: 6, dash: true }),
        em('☕', 400, 280, 200),
        ct(1000, 'FUZZY BEANS', 520, 600, { font: 'Bebas Neue', size: 110, weight: 400, fill: '#ffffff', letterSpacing: 8 }),
        ct(1000, 'EST. 2026', 650, 400, { font: 'Montserrat', size: 32, weight: 700, fill: '#ffd23f', letterSpacing: 10 }),
      ],
    }]),
    T('logo-gradient', 'Gradient Mark', 'Logo', 1000, 1000, [{
      bg: '#0f0e17',
      els: [
        rot(sh('rect', 330, 200, 340, 340, lg(135, '#ff4f9a', '#7c4dff', '#4cc9f0'), { radius: 90 }), 45),
        rot(sh('rect', 405, 275, 190, 190, '#0f0e17', { radius: 50 }), 45),
        ct(1000, 'nova', 640, 700, { font: 'Space Grotesk', size: 150, weight: 700, fill: '#ffffff', letterSpacing: -4 }),
      ],
    }], 20),

    // ===================== Wallpaper =====================
    T('wallpaper-dream', 'Dreamy Wallpaper', 'Wallpaper', 1170, 2532, [{
      bg: lg(180, '#2b1055', '#d53369', '#ffb88c'),
      els: [
        gr('moon', 700, 300, 300, 300, ['#fff1c1', '#ffffff']),
        ...Array.from({ length: 22 }, (_, i) => em('✨', (i * 263) % 1100, 120 + ((i * 397) % 1200), 30 + (i % 4) * 14)),
        gr('mountains', -60, 1900, 1290, 645, ['#1b0a33', '#4a1a5c', '#ffd6e8']),
        ct(1170, 'dream big', 1000, 1000, { font: 'Pacifico', size: 140, weight: 400, fill: '#ffffff', opacity: 0.92 } as Partial<TextEl>),
      ],
    }], 10),
  ];
}

let cache: Template[] | null = null;
export function templates(): Template[] {
  return (cache ??= build());
}
export const templateById = (id: string): Template | undefined => templates().find((t) => t.id === id);
