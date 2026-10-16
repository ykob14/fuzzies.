/**
 * Passover (Pesach) collection — 20 hand-composed templates: traditional, elegant, modern, family-friendly and minimalist.
 * Hebrew used: חג פסח שמח (Happy Passover holiday), פסח שמח (Happy Passover), חג כשר ושמח (A kosher and happy holiday),
 * ליל סדר (Seder night), לשנה הבאה בירושלים (Next year in Jerusalem), פסח (Pesach). Set in Hebrew-capable Google fonts
 * and kept free of punctuation so it lays out right-to-left cleanly. Sample dates are Passover 2027: the first Seder is
 * Wednesday evening, April 21, the second Thursday, April 22; the holiday ends Thursday night, April 29. Each design keeps
 * to two type families (plus at most a short script accent).
 */
import { art, below, box, drop, lin, pill, scene, text, type CollectionTemplate } from './kit';
import { centerIn, endAt, mark, rule } from './holidayKit';

export const PASSOVER_FONTS: [string, number][] = [['Frank Ruhl Libre', 500], ['Frank Ruhl Libre', 700], ['Frank Ruhl Libre', 900], ['David Libre', 500], ['David Libre', 700], ['Bellefair', 400], ['Suez One', 400],
  ['Rubik', 700], ['Rubik', 800], ['Cinzel', 600], ['Cinzel', 700], ['Cormorant Garamond', 600], ['Cormorant Garamond', 700], ['Pinyon Script', 400], ['Marcellus', 400],
  ['Montserrat', 600], ['Montserrat', 700], ['Montserrat', 800], ['Fredoka', 500], ['Fredoka', 600], ['Fredoka', 700], ['Playfair Display', 700]];

const NAVY = '#13254a', BLUE = '#2f5fa8', GOLD = '#d4a940', LGOLD = '#ecd38a', WINE = '#7d1a39', GREEN = '#4f7f3f', INK = '#2a2320', WHITE = '#ffffff', SAGE = '#4f6e44', MIST = '#dbe4f5', BLUSH = '#f0d6de', GREY = '#55555f';

export const PASSOVER: CollectionTemplate[] = [
  { id: 'chag-pesach-sameach', name: 'Chag Pesach Sameach', format: 'post', use: 'greeting', style: 'Traditional', colors: ['cream', 'blue', 'gold'], occasion: 'greeting', tags: ['happy passover', 'chag sameach', 'hebrew', 'seder plate', 'greeting'], build(c) {
    const { W, H, u } = c;
    scene(c, 'ps-bg-cream', 'post');
    const h = text(c, 'חג פסח שמח', W * 0.4, H * 0.12, W * 0.53, { font: 'Frank Ruhl Libre', weight: 900, size: u * 0.12, fill: NAVY, align: 'right', name: 'Hebrew title' });
    const t = text(c, 'Happy Passover', W * 0.4, below(h, u * 0.01), W * 0.53, { font: 'Cormorant Garamond', weight: 700, italic: true, size: u * 0.075, fill: BLUE, align: 'right' });
    rule(c, W * 0.93 - W * 0.1, below(t, u * 0.04), W * 0.1, GOLD, { left: true });
    text(c, 'From the Adler family to yours', W * 0.55, below(t, u * 0.075), W * 0.38, { font: 'Cormorant Garamond', weight: 700, size: u * 0.048, fill: '#4b4b58', align: 'right', lines: 2, lh: 1.15, name: 'Signature' });
    art(c, 'ps-seder-plate', W * 0.07, H * 0.36, W * 0.52);
  } },
  { id: 'seder-invitation-navy', name: 'Passover Seder Invitation', format: 'card', use: 'invitation', style: 'Elegant', colors: ['navy', 'gold'], occasion: 'seder', tags: ['seder', 'invitation', 'elegant', 'cup of elijah', 'gold', 'rsvp'], build(c) {
    const { W, H, u } = c;
    scene(c, 'ps-bg-navy', 'card');
    art(c, 'ps-frame', W * 0.04, H * 0.03, W * 0.92, { h: H * 0.94, colors: [GOLD, '#8fae7f', '#e9a3b5'] });
    art(c, 'ps-elijah-cup', W * 0.4, H * 0.085, W * 0.2);
    const k0 = mark(c);
    const h = text(c, 'ליל סדר', W * 0.1, 0, W * 0.8, { font: 'Frank Ruhl Libre', weight: 700, size: u * 0.085, fill: LGOLD, name: 'Hebrew' });
    const t = text(c, 'Join us for the Passover Seder', W * 0.12, below(h, u * 0.025), W * 0.76, { font: 'Cinzel', weight: 700, size: u * 0.085, lines: 3, fill: WHITE, lh: 1.1, name: 'Title' });
    rule(c, W / 2, below(t, u * 0.045), W * 0.12, GOLD);
    const d = text(c, 'Wednesday, April 21 · 7:30 PM', W * 0.12, below(t, u * 0.085), W * 0.76, { font: 'Cinzel', weight: 700, size: u * 0.044, fill: WHITE, name: 'Date' });
    const e = text(c, 'The Goldberg home · 9 Olive Street', W * 0.12, below(d, u * 0.018), W * 0.76, { font: 'Frank Ruhl Libre', weight: 500, size: u * 0.044, fill: LGOLD });
    pill(c, 'Kindly reply by April 14', W / 2, below(e, u * 0.055), u * 0.032, GOLD, NAVY, 'Cinzel', 700);
    centerIn(c, k0, H * 0.33, H * 0.89);
  } },
  { id: 'community-seder', name: 'Community Seder', format: 'poster', use: 'poster', style: 'Traditional', colors: ['white', 'blue', 'gold'], occasion: 'community', tags: ['community', 'seder', 'public', 'table', 'dinner', 'synagogue'], build(c) {
    const { W, H, u } = c;
    scene(c, 'ps-bg-linen', 'poster');
    const k = text(c, 'All are welcome at our', W * 0.1, H * 0.075, W * 0.8, { font: 'Montserrat', weight: 800, size: u * 0.04, fill: BLUE, upper: true, spacing: u * 0.012 });
    const t = text(c, 'Community Seder', W * 0.07, below(k, u * 0.02), W * 0.86, { font: 'Frank Ruhl Libre', weight: 900, size: u * 0.15, lines: 2, fill: NAVY, lh: 1, name: 'Title' });
    const d = text(c, 'Thursday, April 22 · 6:30 PM', W * 0.1, below(t, u * 0.035), W * 0.8, { font: 'Montserrat', weight: 800, size: u * 0.048, fill: INK, name: 'Date' });
    text(c, 'The second night: a full traditional Seder, Haggadah reading & dinner', W * 0.1, below(d, u * 0.02), W * 0.8, { font: 'Frank Ruhl Libre', weight: 500, size: u * 0.044, fill: GREY, lines: 2, lh: 1.2 });
    art(c, 'ps-table', W * 0.07, H * 0.5, W * 0.86);
    pill(c, 'Adults $36 · Kids $18 · RSVP at the office', W / 2, H * 0.865, u * 0.034, BLUE, WHITE);
  } },
  { id: 'spring-passover-story', name: 'Kasher & Sameach Spring Greeting', format: 'story', use: 'greeting', style: 'Elegant', colors: ['sky', 'pink', 'green'], occasion: 'greeting', tags: ['spring', 'flowers', 'chag kasher vesameach', 'hebrew', 'story', 'greeting'], build(c) {
    const { W, H, u } = c;
    scene(c, 'ps-bg-spring', 'story');
    const k0 = mark(c);
    const t = text(c, 'Happy Passover', W * 0.06, 0, W * 0.88, { font: 'Pinyon Script', size: u * 0.22, lines: 2, fill: WINE, lh: 1.02, name: 'Title' });
    const h = text(c, 'חג כשר ושמח', W * 0.1, below(t, u * 0.03), W * 0.8, { font: 'David Libre', weight: 700, size: u * 0.1, fill: NAVY, name: 'Hebrew' });
    text(c, 'Chag kasher v’sameach', W * 0.1, below(h, u * 0.015), W * 0.8, { font: 'David Libre', weight: 700, size: u * 0.05, fill: SAGE, upper: true, spacing: u * 0.01 });
    art(c, 'ps-flowers', W * 0.23, below(c.els[c.els.length - 1], u * 0.09), W * 0.54);
    centerIn(c, k0, H * 0.18, H * 0.96);
  } },
  { id: 'model-matzah-bakery', name: 'Model Matzah Bakery', format: 'post', use: 'party', style: 'Playful', colors: ['cream', 'brown', 'blue'], occasion: 'kids-event', tags: ['matzah', 'baking', 'kids', 'workshop', 'hebrew school', 'hands on'], build(c) {
    const { W, H, u } = c;
    c.bg = lin('#fff8ec', '#f6e6c8');
    const t = text(c, 'Model Matzah Bakery', W * 0.06, H * 0.055, W * 0.88, { font: 'Rubik', weight: 800, size: u * 0.115, lines: 2, fill: '#7a4e22', lh: 1, name: 'Title' });
    text(c, 'Kids knead, roll & bake their own matzah in 18 minutes', W * 0.08, below(t, u * 0.025), W * 0.84, { font: 'Montserrat', weight: 700, size: u * 0.04, fill: BLUE, lines: 2, lh: 1.2 });
    art(c, 'ps-matzah-stack', W * 0.2, H * 0.41, W * 0.6, { colors: ['#ecd3a1', '#b7894a', BLUE] });
    pill(c, 'Sunday, April 11 · 10 AM · Ages 4–10', W / 2, H * 0.855, u * 0.034, '#7a4e22', WHITE);
  } },
  { id: 'seder-menu', name: 'Passover Seder Menu', format: 'flyer', use: 'flyer', style: 'Luxury', colors: ['burgundy', 'gold'], occasion: 'menu', tags: ['menu', 'dinner', 'restaurant', 'catering', 'wine', 'seder'], build(c) {
    const { W, H, u } = c;
    scene(c, 'ps-bg-wine', 'flyer');
    art(c, 'ps-wine', W * 0.7, H * 0.045, W * 0.22);
    const k = text(c, 'Passover', W * 0.08, H * 0.07, W * 0.58, { font: 'Cinzel', weight: 600, size: u * 0.055, fill: LGOLD, align: 'left', upper: true, spacing: u * 0.014 });
    const t = text(c, 'Seder Menu', W * 0.075, below(k, u * 0.005), W * 0.6, { font: 'Cormorant Garamond', weight: 700, size: u * 0.15, fill: WHITE, align: 'left', name: 'Title' });
    rule(c, W * 0.08, below(t, u * 0.03), W * 0.12, LGOLD, { left: true });
    const m0 = mark(c);
    let y = 0;
    for (const [name, desc] of [['Matzah ball soup', 'golden chicken broth, fresh dill'], ['Braised brisket', 'red wine, carrots & tzimmes'], ['Roasted spring vegetables', 'herbs & olive oil'], ['Flourless chocolate cake', 'coconut macaroons & berries']]) {
      const a = text(c, name, W * 0.08, y, W * 0.84, { font: 'Cormorant Garamond', weight: 700, size: u * 0.066, fill: WHITE, align: 'left' });
      const b = text(c, desc, W * 0.08, below(a, u * 0.002), W * 0.84, { font: 'Cormorant Garamond', weight: 600, italic: true, size: u * 0.046, fill: BLUSH, align: 'left' });
      y = below(b, u * 0.045);
    }
    centerIn(c, m0, H * 0.33, H * 0.84);
    text(c, 'Seatings April 21 & 22 · 7 PM', W * 0.08, H * 0.875, W * 0.84, { font: 'Cinzel', weight: 700, size: u * 0.04, fill: LGOLD, align: 'left', name: 'Date' });
    text(c, 'Reserve at the front desk', W * 0.08, H * 0.92, W * 0.84, { font: 'Cormorant Garamond', weight: 700, size: u * 0.04, fill: BLUSH, align: 'left' });
  } },
  { id: 'next-year-in-jerusalem', name: 'Next Year in Jerusalem', format: 'landscape', use: 'greeting', style: 'Elegant', colors: ['navy', 'gold'], occasion: 'greeting', tags: ['next year in jerusalem', 'leshana haba’a', 'hebrew', 'banner', 'kiddush cup', 'elegant'], build(c) {
    const { W, H, u } = c;
    scene(c, 'ps-bg-navy', 'landscape');
    art(c, 'ps-cup', W * 0.06, H * 0.24, W * 0.15);
    art(c, 'ps-elijah-cup', W * 0.79, H * 0.22, W * 0.16);
    const k0 = mark(c);
    const h = text(c, 'לשנה הבאה בירושלים', W * 0.23, 0, W * 0.54, { font: 'Frank Ruhl Libre', weight: 700, size: u * 0.13, lines: 2, fill: LGOLD, lh: 1.15, name: 'Hebrew title' });
    const t = text(c, 'Next year in Jerusalem', W * 0.23, below(h, u * 0.035), W * 0.54, { font: 'Cormorant Garamond', weight: 700, italic: true, size: u * 0.09, fill: WHITE });
    rule(c, W / 2, below(t, u * 0.045), W * 0.06, GOLD);
    text(c, 'Chag Pesach Sameach', W * 0.23, below(t, u * 0.085), W * 0.54, { font: 'Cormorant Garamond', weight: 700, size: u * 0.056, fill: MIST, upper: true, spacing: u * 0.014 });
    centerIn(c, k0, H * 0.08, H * 0.92);
  } },
  { id: 'family-seder-invite', name: 'Family Seder at Bubbe’s', format: 'post', use: 'invitation', style: 'Family', colors: ['sky', 'pink', 'blue'], occasion: 'seder', tags: ['family', 'seder', 'invitation', 'grandma', 'haggadah', 'flowers'], build(c) {
    const { W, H, u } = c;
    scene(c, 'ps-bg-spring', 'post');
    const t = text(c, 'Family Seder at Bubbe’s', W * 0.08, H * 0.235, W * 0.84, { font: 'Fredoka', weight: 700, size: u * 0.1, lines: 2, fill: NAVY, lh: 1.05, name: 'Title' });
    const d = text(c, 'Wednesday, April 21 · 6 PM', W * 0.08, below(t, u * 0.025), W * 0.84, { font: 'Fredoka', weight: 700, size: u * 0.048, fill: WINE, name: 'Date' });
    text(c, 'Bring your appetite!', W * 0.08, below(d, u * 0.008), W * 0.84, { font: 'Fredoka', weight: 600, size: u * 0.042, fill: NAVY });
    art(c, 'ps-haggadah', W * 0.07, H * 0.555, W * 0.5);
    art(c, 'ps-flowers', W * 0.6, H * 0.5, W * 0.3);
  } },
  { id: 'frogs-here-frogs-there', name: 'Frogs Here, Frogs There!', format: 'post', use: 'party', style: 'Playful', colors: ['green', 'sky', 'pink'], occasion: 'kids-event', tags: ['frogs', 'plagues', 'kids', 'program', 'fun', 'story'], build(c) {
    const { W, H, u } = c;
    c.bg = lin('#e7f6ff', '#d3f0dc');
    const t = text(c, 'Frogs here, frogs there!', W * 0.06, H * 0.055, W * 0.88, { font: 'Fredoka', weight: 700, size: u * 0.115, lines: 2, fill: GREEN, lh: 1, name: 'Title' });
    text(c, 'A Passover kids’ program with songs, crafts & the Exodus story', W * 0.08, below(t, u * 0.025), W * 0.84, { font: 'Fredoka', weight: 600, size: u * 0.042, fill: NAVY, lines: 2, lh: 1.15 });
    art(c, 'ps-frog', W * 0.24, H * 0.41, W * 0.52);
    art(c, 'ps-frog', W * 0.05, H * 0.66, W * 0.19, { rot: -12, colors: ['#8bd346', WHITE, '#ff8aa0'] });
    pill(c, 'Wednesday, April 14 · 4 PM', W * 0.6, H * 0.855, u * 0.036, GREEN, WHITE, 'Fredoka', 700);
  } },
  { id: 'minimal-pesach', name: 'Minimal Pesach Card', format: 'card', use: 'greeting', style: 'Minimal', colors: ['white', 'beige', 'blue'], occasion: 'greeting', tags: ['minimal', 'modern', 'matzah', 'clean', 'card', 'hebrew', 'pesach'], build(c) {
    const { W, H, u } = c;
    c.bg = '#fbfaf6';
    box(c, W * 0.06, H * 0.045, W * 0.88, H * 0.91, 'rgba(0,0,0,0)', { stroke: '#e3d6b4', strokeWidth: Math.max(2, u * 0.003) });
    const k0 = mark(c);
    art(c, 'ps-matzah', W * 0.37, 0, W * 0.26, { rot: 6 });
    const h = text(c, 'פסח', W * 0.1, below(c.els[c.els.length - 1], u * 0.07), W * 0.8, { font: 'Frank Ruhl Libre', weight: 500, size: u * 0.2, fill: NAVY, name: 'Hebrew title' });
    const t = text(c, 'Pesach', W * 0.1, below(h, u * 0.005), W * 0.8, { font: 'Frank Ruhl Libre', weight: 500, size: u * 0.064, fill: BLUE, upper: true, spacing: u * 0.035 });
    rule(c, W / 2, below(t, u * 0.06), W * 0.08, GOLD);
    text(c, 'Chag sameach from the Katz family', W * 0.09, below(t, u * 0.11), W * 0.76, { font: 'Montserrat', weight: 600, size: u * 0.044, fill: '#5d5d68', name: 'Signature' });
    centerIn(c, k0, H * 0.06, H * 0.94);
  } },
  { id: 'haggadah-study', name: 'Haggadah Study Evening', format: 'flyer', use: 'flyer', style: 'Traditional', colors: ['cream', 'navy', 'gold'], occasion: 'class', tags: ['haggadah', 'study', 'class', 'learning', 'adult education', 'book'], build(c) {
    const { W, H, u } = c;
    scene(c, 'ps-bg-cream', 'flyer');
    const k = text(c, 'Prepare for the Seder', W * 0.2, H * 0.165, W * 0.6, { font: 'Montserrat', weight: 800, size: u * 0.04, fill: SAGE, upper: true, spacing: u * 0.006 });
    const t = text(c, 'Haggadah Study Evening', W * 0.12, below(k, u * 0.02), W * 0.76, { font: 'David Libre', weight: 700, size: u * 0.13, lines: 2, fill: NAVY, lh: 1.02, name: 'Title' });
    art(c, 'ps-haggadah', W * 0.25, below(t, u * 0.05), W * 0.5);
    const b0 = mark(c);
    const d = text(c, 'The Four Questions, the Ten Plagues and the songs we sing', W * 0.08, 0, W * 0.52, { font: 'David Libre', weight: 500, size: u * 0.048, fill: INK, align: 'left', lines: 3, lh: 1.15 });
    const e = text(c, 'Tuesday, April 13 · 7:30 PM', W * 0.08, below(d, u * 0.035), W * 0.56, { font: 'Montserrat', weight: 800, size: u * 0.04, fill: BLUE, align: 'left', name: 'Date' });
    text(c, 'Library room · All levels welcome', W * 0.08, below(e, u * 0.012), W * 0.56, { font: 'Montserrat', weight: 600, size: u * 0.036, fill: GREY, align: 'left' });
    endAt(c, b0, H * 0.93);
  } },
  { id: 'kosher-for-passover', name: 'Kosher for Passover', format: 'post', use: 'social', style: 'Bold', colors: ['navy', 'gold', 'cream'], occasion: 'sale', tags: ['shop', 'store', 'kosher for passover', 'grocery', 'business', 'wine', 'matzah'], build(c) {
    const { W, H, u } = c;
    scene(c, 'ps-bg-navy', 'post');
    const k = text(c, 'Now in store', W * 0.07, H * 0.08, W * 0.6, { font: 'Montserrat', weight: 800, size: u * 0.046, fill: LGOLD, upper: true, spacing: u * 0.014, align: 'left' });
    const t = text(c, 'Kosher for Passover', W * 0.065, below(k, u * 0.01), W * 0.6, { font: 'Suez One', size: u * 0.115, lines: 2, fill: WHITE, align: 'left', lh: 1.05, name: 'Title' });
    text(c, 'Matzah, wine & everything for your Seder', W * 0.07, below(t, u * 0.03), W * 0.54, { font: 'Montserrat', weight: 700, size: u * 0.042, fill: MIST, align: 'left', lines: 2, lh: 1.2 });
    art(c, 'ps-wine', W * 0.66, H * 0.22, W * 0.3);
    art(c, 'ps-matzah-stack', W * 0.06, H * 0.6, W * 0.44, { colors: ['#ecd3a1', '#b7894a', GOLD] });
    text(c, 'Stock up by April 20', W * 0.54, H * 0.79, W * 0.4, { font: 'Suez One', size: u * 0.05, fill: WHITE, align: 'right', name: 'Date' });
    text(c, 'Open daily 8 AM – 9 PM', W * 0.54, H * 0.865, W * 0.4, { font: 'Montserrat', weight: 700, size: u * 0.04, fill: LGOLD, align: 'right' });
  } },
  { id: 'second-night-seder', name: 'Second Night Seder', format: 'poster', use: 'poster', style: 'Luxury', colors: ['burgundy', 'gold', 'white'], occasion: 'seder', tags: ['second night', 'seder', 'table', 'dinner', 'elegant', 'restaurant'], build(c) {
    const { W, H, u } = c;
    scene(c, 'ps-bg-wine', 'poster');
    const k = text(c, 'An elegant evening', W * 0.1, H * 0.07, W * 0.8, { font: 'Cormorant Garamond', weight: 700, italic: true, size: u * 0.058, fill: LGOLD });
    const t = text(c, 'Second Night Seder', W * 0.06, below(k, u * 0.01), W * 0.88, { font: 'Cinzel', weight: 700, size: u * 0.125, lines: 2, fill: WHITE, lh: 1.05, name: 'Title' });
    const d = text(c, 'Thursday, April 22 · 7 PM', W * 0.08, below(t, u * 0.035), W * 0.84, { font: 'Cinzel', weight: 700, size: u * 0.048, fill: WHITE, name: 'Date' });
    text(c, 'The Vineyard Hall · 220 Grove Street', W * 0.1, below(d, u * 0.015), W * 0.8, { font: 'Cormorant Garamond', weight: 700, size: u * 0.048, fill: BLUSH });
    art(c, 'ps-table', W * 0.06, H * 0.47, W * 0.88, { colors: ['#fbf6ec', WINE, GOLD] });
    pill(c, 'Reservations required', W / 2, H * 0.865, u * 0.034, GOLD, WINE, 'Cinzel', 700);
  } },
  { id: 'four-cups-story', name: 'Four Cups, One Family', format: 'story', use: 'social', style: 'Elegant', colors: ['navy', 'silver', 'gold'], occasion: 'greeting', tags: ['four cups', 'wine', 'kiddush cup', 'family', 'story', 'instagram'], build(c) {
    const { W, H, u } = c;
    scene(c, 'ps-bg-navy', 'story');
    const k0 = mark(c);
    const t = text(c, 'Four cups, one family', W * 0.06, 0, W * 0.88, { font: 'Cormorant Garamond', weight: 700, size: u * 0.14, lines: 2, fill: WHITE, lh: 1.02, name: 'Title' });
    const h = text(c, 'פסח שמח', W * 0.1, below(t, u * 0.045), W * 0.8, { font: 'Frank Ruhl Libre', weight: 700, size: u * 0.11, fill: LGOLD, name: 'Hebrew' });
    const y = below(h, u * 0.12);
    art(c, 'ps-cup', W * 0.17, y + u * 0.02, W * 0.28);
    art(c, 'ps-elijah-cup', W * 0.55, y, W * 0.3);
    const l = text(c, 'Kiddush · Maggid · Barech · Hallel', W * 0.08, y + W * 0.3 * (220 / 150) + u * 0.1, W * 0.84, { font: 'Cormorant Garamond', weight: 700, size: u * 0.054, fill: LGOLD, lines: 2, lh: 1.1 });
    text(c, 'From our Seder table to yours', W * 0.1, below(l, u * 0.03), W * 0.8, { font: 'Cormorant Garamond', weight: 700, italic: true, size: u * 0.064, fill: MIST, lines: 2 });
    centerIn(c, k0, H * 0.07, H * 0.94);
  } },
  { id: 'blossom-seder-invite', name: 'Spring Seder Invitation', format: 'card', use: 'invitation', style: 'Elegant', colors: ['sky', 'pink', 'brown'], occasion: 'seder', tags: ['spring', 'blossom', 'invitation', 'seder', 'rsvp', 'floral'], build(c) {
    const { W, H, u } = c;
    scene(c, 'ps-bg-spring', 'card');
    art(c, 'ps-flowers', W * 0.31, H * 0.11, W * 0.38);
    const k0 = mark(c);
    const k = text(c, 'You’re invited to our', W * 0.1, 0, W * 0.8, { font: 'Montserrat', weight: 700, size: u * 0.038, fill: SAGE, upper: true, spacing: u * 0.012 });
    const t = text(c, 'Passover Seder', W * 0.06, below(k, u * 0.02), W * 0.88, { font: 'Pinyon Script', size: u * 0.17, lines: 1, fill: WINE, name: 'Title' });
    rule(c, W / 2, below(t, u * 0.04), W * 0.1, '#c9a35a');
    const d = text(c, 'Wednesday, April 21 · 7 PM', W * 0.1, below(t, u * 0.08), W * 0.8, { font: 'Montserrat', weight: 800, size: u * 0.046, fill: NAVY, name: 'Date' });
    const e = text(c, '12 Almond Grove · Dinner to follow', W * 0.1, below(d, u * 0.015), W * 0.8, { font: 'Montserrat', weight: 600, size: u * 0.04, fill: GREY });
    pill(c, 'RSVP to Leah by April 14', W / 2, below(e, u * 0.055), u * 0.032, WINE, WHITE);
    centerIn(c, k0, H * 0.45, H * 0.93);
  } },
  { id: 'passover-holiday-hours', name: 'Passover Holiday Hours', format: 'flyer', use: 'flyer', style: 'Minimal', colors: ['white', 'blue', 'gold'], occasion: 'announcement', tags: ['hours', 'closed', 'announcement', 'business', 'office', 'schedule'], build(c) {
    const { W, H, u } = c;
    scene(c, 'ps-bg-linen', 'flyer');
    const k0 = mark(c);
    art(c, 'ps-wheat', W * 0.43, 0, W * 0.14);
    const t = text(c, 'Passover Holiday Hours', W * 0.1, below(c.els[c.els.length - 1], u * 0.05), W * 0.8, { font: 'Marcellus', size: u * 0.11, lines: 2, fill: NAVY, lh: 1.05, name: 'Title' });
    let y = below(t, u * 0.08);
    for (const [day, hours] of [['Wed, April 21', 'Close at 1 PM'], ['April 22 – 23', 'Closed'], ['April 25 – 27', '9 AM – 3 PM'], ['April 28 – 29', 'Closed'], ['From Fri, April 30', 'Regular hours']]) {
      text(c, day, W * 0.13, y, W * 0.4, { font: 'Montserrat', weight: 700, size: u * 0.04, fill: INK, align: 'left' });
      const b = text(c, hours, W * 0.5, y, W * 0.37, { font: 'Montserrat', weight: 600, size: u * 0.04, fill: BLUE, align: 'right' });
      y = below(b, u * 0.02);
      box(c, W * 0.13, y, W * 0.74, Math.max(1.5, u * 0.0016), '#d9dbe3');
      y += u * 0.025;
    }
    text(c, 'Chag sameach from all of us', W * 0.1, y + u * 0.045, W * 0.8, { font: 'Marcellus', size: u * 0.056, fill: '#a07a22', name: 'Signature' });
    centerIn(c, k0, H * 0.08, H * 0.92);
  } },
  { id: 'pomegranate-chag-sameach', name: 'Chag Sameach Pomegranate', format: 'post', use: 'greeting', style: 'Elegant', colors: ['cream', 'red', 'green'], occasion: 'greeting', tags: ['pomegranate', 'chag sameach', 'hebrew', 'elegant', 'greeting'], build(c) {
    const { W, H, u } = c;
    scene(c, 'ps-bg-cream', 'post');
    const k0 = mark(c);
    art(c, 'ps-pomegranate', W * 0.38, 0, W * 0.24);
    const t = text(c, 'Chag Sameach', W * 0.1, below(c.els[c.els.length - 1], u * 0.03), W * 0.8, { font: 'Pinyon Script', size: u * 0.15, fill: '#a3203a', name: 'Title' });
    const h = text(c, 'פסח שמח', W * 0.1, below(t, u * 0.005), W * 0.8, { font: 'Frank Ruhl Libre', weight: 700, size: u * 0.08, fill: GREEN, name: 'Hebrew' });
    text(c, 'Wishing you a sweet and meaningful Pesach', W * 0.2, below(h, u * 0.03), W * 0.6, { font: 'Frank Ruhl Libre', weight: 500, size: u * 0.042, fill: '#5c4c44', lines: 2, lh: 1.2 });
    centerIn(c, k0, H * 0.1, H * 0.88);
  } },
  { id: 'afikoman-hunt', name: 'Afikoman Hunt', format: 'story', use: 'social', style: 'Playful', colors: ['sky', 'green', 'beige'], occasion: 'kids-event', tags: ['afikoman', 'kids', 'game', 'seder', 'family', 'story'], build(c) {
    const { W, H, u } = c;
    scene(c, 'ps-bg-spring', 'story');
    const t = text(c, 'Afikoman Hunt', W * 0.06, H * 0.12, W * 0.88, { font: 'Fredoka', weight: 700, size: u * 0.16, lines: 2, fill: NAVY, lh: 1, name: 'Title' });
    text(c, 'Who will find it first?', W * 0.1, below(t, u * 0.025), W * 0.8, { font: 'Fredoka', weight: 700, size: u * 0.062, fill: WINE });
    art(c, 'ps-matzah', W * 0.24, H * 0.42, W * 0.52, { rot: -10 });
    art(c, 'ps-frog', W * 0.6, H * 0.715, W * 0.32);
    text(c, 'Tag us in your Seder pics!', W * 0.07, H * 0.77, W * 0.5, { font: 'Fredoka', weight: 700, size: u * 0.058, fill: SAGE, align: 'left', lines: 2, lh: 1.1 });
    text(c, '#AfikomanHunt', W * 0.07, H * 0.885, W * 0.5, { font: 'Fredoka', weight: 600, size: u * 0.05, fill: NAVY, align: 'left' });
  } },
  { id: 'kosher-wine-tasting', name: 'Kosher Wine Tasting', format: 'landscape', use: 'poster', style: 'Luxury', colors: ['burgundy', 'gold'], occasion: 'tasting', tags: ['wine', 'tasting', 'event', 'kosher', 'banner', 'evening'], build(c) {
    const { W, H, u } = c;
    scene(c, 'ps-bg-wine', 'landscape');
    art(c, 'ps-wine', W * 0.63, H * 0.1, W * 0.28);
    const k0 = mark(c);
    const k = text(c, 'Before the Seder', W * 0.06, 0, W * 0.52, { font: 'Cormorant Garamond', weight: 700, italic: true, size: u * 0.08, fill: LGOLD, align: 'left' });
    const t = text(c, 'Kosher Wine Tasting', W * 0.055, below(k, u * 0.01), W * 0.54, { font: 'Cinzel', weight: 700, size: u * 0.13, lines: 2, fill: WHITE, align: 'left', lh: 1.04, name: 'Title' });
    rule(c, W * 0.06, below(t, u * 0.045), W * 0.05, LGOLD, { left: true });
    const d = text(c, 'Thursday, April 15 · 7 PM', W * 0.06, below(t, u * 0.085), W * 0.52, { font: 'Cinzel', weight: 700, size: u * 0.058, fill: WHITE, align: 'left', name: 'Date' });
    text(c, 'The Cellar · Six wines for your Seder table · $30', W * 0.06, below(d, u * 0.02), W * 0.5, { font: 'Cormorant Garamond', weight: 700, size: u * 0.056, fill: BLUSH, align: 'left', lines: 2, lh: 1.15 });
    centerIn(c, k0, H * 0.08, H * 0.92);
  } },
  { id: 'story-of-exodus', name: 'The Story of Exodus', format: 'poster', use: 'poster', style: 'Traditional', colors: ['navy', 'gold'], occasion: 'storytelling', tags: ['exodus', 'story', 'storytelling', 'family', 'haggadah', 'candles'], build(c) {
    const { W, H, u } = c;
    scene(c, 'ps-bg-navy', 'poster');
    const k = text(c, 'A family storytelling evening', W * 0.1, H * 0.075, W * 0.8, { font: 'Cinzel', weight: 700, size: u * 0.04, fill: LGOLD, spacing: u * 0.006 });
    const t = text(c, 'The Story of Exodus', W * 0.06, below(k, u * 0.025), W * 0.88, { font: 'Cinzel', weight: 700, size: u * 0.13, lines: 2, fill: WHITE, lh: 1.05, shadow: drop(u, 'rgba(0,0,20,0.5)'), name: 'Title' });
    const d = text(c, 'From slavery to freedom, told for all ages', W * 0.1, below(t, u * 0.03), W * 0.8, { font: 'Cormorant Garamond', weight: 700, italic: true, size: u * 0.06, fill: LGOLD, lines: 2, lh: 1.1 });
    const y = below(d, u * 0.07);
    art(c, 'ps-haggadah-closed', W * 0.2, y, W * 0.26);
    art(c, 'ps-candles', W * 0.54, y - u * 0.02, W * 0.26);
    const b0 = mark(c);
    const e = text(c, 'Sunday, April 18 · 4 PM', W * 0.08, 0, W * 0.84, { font: 'Cinzel', weight: 700, size: u * 0.054, fill: WHITE, name: 'Date' });
    text(c, 'Main Sanctuary · Cocoa & macaroons after', W * 0.1, below(e, u * 0.015), W * 0.8, { font: 'Cormorant Garamond', weight: 700, size: u * 0.05, fill: MIST });
    endAt(c, b0, H * 0.93);
  } },
];
