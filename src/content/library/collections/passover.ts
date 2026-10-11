/**
 * Passover (Pesach) collection — 20 hand-composed templates: traditional, elegant, modern, family-friendly and minimalist.
 * Hebrew used: חג פסח שמח (Happy Passover holiday), פסח שמח (Happy Passover), חג כשר ושמח (A kosher and happy holiday),
 * ליל סדר (Seder night), לשנה הבאה בירושלים (Next year in Jerusalem), פסח (Pesach). Set in Hebrew-capable Google fonts
 * and kept free of punctuation so it lays out right-to-left cleanly.
 */
import { art, below, box, drop, lin, pill, scene, text, type CollectionTemplate } from './kit';

export const PASSOVER_FONTS: [string, number][] = [['Frank Ruhl Libre', 500], ['Frank Ruhl Libre', 700], ['Frank Ruhl Libre', 900], ['David Libre', 500], ['David Libre', 700], ['Bellefair', 400], ['Suez One', 400],
  ['Rubik', 700], ['Rubik', 800], ['Cinzel', 600], ['Cinzel', 700], ['Cormorant Garamond', 600], ['Cormorant Garamond', 700], ['Pinyon Script', 400], ['Marcellus', 400],
  ['Montserrat', 600], ['Montserrat', 700], ['Montserrat', 800], ['Fredoka', 600], ['Fredoka', 700], ['Playfair Display', 700]];

const NAVY = '#13254a', BLUE = '#2f5fa8', GOLD = '#d4a940', LGOLD = '#ecd38a', WINE = '#7d1a39', GREEN = '#4f7f3f', INK = '#2a2320', WHITE = '#ffffff', SAGE = '#6f8f62';

export const PASSOVER: CollectionTemplate[] = [
  { id: 'chag-pesach-sameach', name: 'Chag Pesach Sameach', format: 'post', use: 'greeting', style: 'Traditional', colors: ['cream', 'blue', 'gold'], occasion: 'greeting', tags: ['happy passover', 'chag sameach', 'hebrew', 'seder plate', 'greeting'], build(c) {
    const { W, H, u } = c;
    scene(c, 'ps-bg-cream', 'post');
    const h = text(c, 'חג פסח שמח', W * 0.42, H * 0.1, W * 0.52, { font: 'Frank Ruhl Libre', weight: 900, size: u * 0.11, fill: NAVY, align: 'right', name: 'Hebrew title' });
    text(c, 'Happy Passover', W * 0.42, below(h, u * 0.01), W * 0.52, { font: 'Cormorant Garamond', weight: 700, italic: true, size: u * 0.065, fill: BLUE, align: 'right' });
    art(c, 'ps-seder-plate', W * 0.12, H * 0.4, W * 0.5);
  } },
  { id: 'seder-invitation-navy', name: 'Passover Seder Invitation', format: 'card', use: 'invitation', style: 'Elegant', colors: ['navy', 'gold'], occasion: 'seder', tags: ['seder', 'invitation', 'elegant', 'cup of elijah', 'gold', 'rsvp'], build(c) {
    const { W, H, u } = c;
    scene(c, 'ps-bg-navy', 'card');
    art(c, 'ps-frame', W * 0.04, H * 0.03, W * 0.92, { h: H * 0.94, colors: [GOLD, '#8fae7f', '#e9a3b5'] });
    art(c, 'ps-elijah-cup', W * 0.39, H * 0.08, W * 0.22);
    const h = text(c, 'ליל סדר', W * 0.1, H * 0.36, W * 0.8, { font: 'Frank Ruhl Libre', weight: 700, size: u * 0.07, fill: LGOLD, name: 'Hebrew' });
    const t = text(c, 'Join us for the Passover Seder', W * 0.1, below(h, u * 0.02), W * 0.8, { font: 'Cinzel', weight: 700, size: u * 0.08, lines: 3, fill: WHITE, lh: 1.08, name: 'Title' });
    const d = text(c, 'First night · Saturday, April 1 · 7:30 PM', W * 0.12, below(t, u * 0.04), W * 0.76, { font: 'Montserrat', weight: 700, size: u * 0.032, fill: '#dbe4f5', lines: 2 });
    const e = text(c, 'The Goldberg home · 9 Olive Street', W * 0.12, below(d, u * 0.012), W * 0.76, { font: 'Cormorant Garamond', weight: 700, italic: true, size: u * 0.042, fill: LGOLD });
    pill(c, 'Kindly reply by March 25', W / 2, below(e, u * 0.045), u * 0.026, GOLD, NAVY);
  } },
  { id: 'community-seder', name: 'Community Seder', format: 'poster', use: 'poster', style: 'Traditional', colors: ['white', 'blue', 'gold'], occasion: 'community', tags: ['community', 'seder', 'public', 'table', 'dinner', 'synagogue'], build(c) {
    const { W, H, u } = c;
    scene(c, 'ps-bg-linen', 'poster');
    const k = text(c, 'All are welcome at our', W * 0.1, H * 0.08, W * 0.8, { font: 'Montserrat', weight: 800, size: u * 0.036, fill: BLUE, upper: true, spacing: u * 0.012 });
    const t = text(c, 'Community Seder', W * 0.07, below(k, u * 0.02), W * 0.86, { font: 'Frank Ruhl Libre', weight: 900, size: u * 0.14, lines: 2, fill: NAVY, lh: 1, name: 'Title' });
    const d = text(c, 'Second night · Sunday, April 2 · 6:30 PM', W * 0.1, below(t, u * 0.03), W * 0.8, { font: 'Montserrat', weight: 800, size: u * 0.038, fill: INK, lines: 2 });
    text(c, 'Full traditional Seder, Haggadah reading & dinner', W * 0.1, below(d, u * 0.015), W * 0.8, { font: 'Montserrat', weight: 600, size: u * 0.032, fill: '#5a5a66', lines: 2 });
    art(c, 'ps-table', W * 0.06, H * 0.5, W * 0.88);
    pill(c, 'Adults $36 · Kids $18 · RSVP at the office', W / 2, H * 0.88, u * 0.026, BLUE, WHITE);
  } },
  { id: 'spring-passover-story', name: 'Kasher & Sameach Spring Greeting', format: 'story', use: 'greeting', style: 'Elegant', colors: ['sky', 'pink', 'green'], occasion: 'greeting', tags: ['spring', 'flowers', 'chag kasher vesameach', 'hebrew', 'story', 'greeting'], build(c) {
    const { W, H, u } = c;
    scene(c, 'ps-bg-spring', 'story');
    const t = text(c, 'Happy Passover', W * 0.06, H * 0.16, W * 0.88, { font: 'Pinyon Script', size: u * 0.2, lines: 2, fill: WINE, lh: 1.05, name: 'Title' });
    const h = text(c, 'חג כשר ושמח', W * 0.1, below(t, u * 0.02), W * 0.8, { font: 'David Libre', weight: 700, size: u * 0.09, fill: NAVY, name: 'Hebrew' });
    text(c, 'Chag kasher v’sameach', W * 0.1, below(h, u * 0.01), W * 0.8, { font: 'Montserrat', weight: 700, size: u * 0.036, fill: SAGE, upper: true, spacing: u * 0.01 });
    art(c, 'ps-flowers', W * 0.18, H * 0.5, W * 0.64);
  } },
  { id: 'model-matzah-bakery', name: 'Model Matzah Bakery', format: 'post', use: 'party', style: 'Playful', colors: ['cream', 'brown', 'blue'], occasion: 'kids-event', tags: ['matzah', 'baking', 'kids', 'workshop', 'hebrew school', 'hands on'], build(c) {
    const { W, H, u } = c;
    c.bg = lin('#fff8ec', '#f6e6c8');
    const t = text(c, 'Model Matzah Bakery', W * 0.06, H * 0.06, W * 0.88, { font: 'Rubik', weight: 800, size: u * 0.11, lines: 2, fill: '#7a4e22', lh: 1, name: 'Title' });
    text(c, 'Kids knead, roll & bake their own matzah in 18 minutes', W * 0.1, below(t, u * 0.02), W * 0.8, { font: 'Montserrat', weight: 700, size: u * 0.032, fill: BLUE, lines: 2 });
    art(c, 'ps-matzah-stack', W * 0.18, H * 0.4, W * 0.64, { colors: ['#ecd3a1', '#b7894a', BLUE] });
    pill(c, 'Sunday, March 26 · 10 AM · Ages 4–10', W / 2, H * 0.88, u * 0.028, '#7a4e22', WHITE);
  } },
  { id: 'seder-menu', name: 'Passover Seder Menu', format: 'flyer', use: 'flyer', style: 'Luxury', colors: ['burgundy', 'gold'], occasion: 'menu', tags: ['menu', 'dinner', 'restaurant', 'catering', 'wine', 'seder'], build(c) {
    const { W, H, u } = c;
    scene(c, 'ps-bg-wine', 'flyer');
    art(c, 'ps-wine', W * 0.68, H * 0.04, W * 0.26);
    const k = text(c, 'Passover', W * 0.08, H * 0.08, W * 0.58, { font: 'Cinzel', weight: 600, size: u * 0.05, fill: LGOLD, align: 'left', upper: true, spacing: u * 0.014 });
    const t = text(c, 'Seder Menu', W * 0.075, below(k, u * 0.01), W * 0.6, { font: 'Cormorant Garamond', weight: 700, size: u * 0.13, fill: WHITE, align: 'left', name: 'Title' });
    let y = Math.max(below(t, u * 0.08), H * 0.36);
    for (const [name, desc] of [['Matzah ball soup', 'Golden chicken broth, fresh dill'], ['Braised brisket', 'Red wine, carrots, tzimmes'], ['Roasted vegetables', 'Spring herbs, olive oil'], ['Flourless chocolate cake', 'Macaroons & fresh berries']]) {
      const a = text(c, name, W * 0.08, y, W * 0.84, { font: 'Cormorant Garamond', weight: 700, size: u * 0.055, fill: WHITE, align: 'left' });
      const b = text(c, desc, W * 0.08, below(a, u * 0.002), W * 0.84, { font: 'Montserrat', weight: 600, size: u * 0.03, fill: '#e8c4cf', align: 'left' });
      y = below(b, u * 0.04);
    }
    text(c, 'Seatings April 1 & 2 · 7 PM · Reserve ahead', W * 0.08, H * 0.9, W * 0.84, { font: 'Montserrat', weight: 700, size: u * 0.03, fill: LGOLD, align: 'left', upper: true, spacing: u * 0.004 });
  } },
  { id: 'next-year-in-jerusalem', name: 'Next Year in Jerusalem', format: 'landscape', use: 'greeting', style: 'Elegant', colors: ['navy', 'gold'], occasion: 'greeting', tags: ['next year in jerusalem', 'leshana haba’a', 'hebrew', 'banner', 'kiddush cup', 'elegant'], build(c) {
    const { W, H, u } = c;
    scene(c, 'ps-bg-navy', 'landscape');
    art(c, 'ps-cup', W * 0.06, H * 0.2, W * 0.16);
    art(c, 'ps-elijah-cup', W * 0.78, H * 0.18, W * 0.17);
    const h = text(c, 'לשנה הבאה בירושלים', W * 0.24, H * 0.26, W * 0.52, { font: 'Frank Ruhl Libre', weight: 700, size: u * 0.12, lines: 2, fill: LGOLD, lh: 1.15, name: 'Hebrew title' });
    const t = text(c, 'Next year in Jerusalem', W * 0.24, below(h, u * 0.04), W * 0.52, { font: 'Cormorant Garamond', weight: 700, italic: true, size: u * 0.08, fill: WHITE });
    text(c, 'Chag Pesach Sameach', W * 0.24, below(t, u * 0.03), W * 0.52, { font: 'Montserrat', weight: 700, size: u * 0.045, fill: '#cfdcf5', upper: true, spacing: u * 0.012 });
  } },
  { id: 'family-seder-invite', name: 'Family Seder at Bubbe’s', format: 'post', use: 'invitation', style: 'Family', colors: ['sky', 'pink', 'blue'], occasion: 'seder', tags: ['family', 'seder', 'invitation', 'grandma', 'haggadah', 'flowers'], build(c) {
    const { W, H, u } = c;
    scene(c, 'ps-bg-spring', 'post');
    const t = text(c, 'Family Seder at Bubbe’s', W * 0.08, H * 0.12, W * 0.84, { font: 'Fredoka', weight: 700, size: u * 0.1, lines: 2, fill: NAVY, lh: 1.05, name: 'Title' });
    text(c, 'First night · April 1 · 6 PM · Bring your appetite!', W * 0.1, below(t, u * 0.02), W * 0.8, { font: 'Montserrat', weight: 700, size: u * 0.032, fill: WINE, lines: 2 });
    art(c, 'ps-haggadah', W * 0.08, H * 0.48, W * 0.5);
    art(c, 'ps-flowers', W * 0.6, H * 0.42, W * 0.32);
  } },
  { id: 'frogs-here-frogs-there', name: 'Frogs Here, Frogs There!', format: 'post', use: 'party', style: 'Playful', colors: ['green', 'sky', 'pink'], occasion: 'kids-event', tags: ['frogs', 'plagues', 'kids', 'program', 'fun', 'story'], build(c) {
    const { W, H, u } = c;
    c.bg = lin('#e7f6ff', '#d3f0dc');
    const t = text(c, 'Frogs here, frogs there!', W * 0.06, H * 0.06, W * 0.88, { font: 'Fredoka', weight: 700, size: u * 0.11, lines: 2, fill: GREEN, lh: 1, name: 'Title' });
    text(c, 'A Passover kids’ program with songs, crafts & the Exodus story', W * 0.1, below(t, u * 0.02), W * 0.8, { font: 'Montserrat', weight: 700, size: u * 0.032, fill: NAVY, lines: 2 });
    art(c, 'ps-frog', W * 0.22, H * 0.42, W * 0.56);
    art(c, 'ps-frog', W * 0.04, H * 0.7, W * 0.2, { rot: -12, colors: ['#8bd346', WHITE, '#ff8aa0'] });
    pill(c, 'Wednesday, March 29 · 4 PM', W * 0.62, H * 0.88, u * 0.028, GREEN, WHITE);
  } },
  { id: 'minimal-pesach', name: 'Minimal Pesach Card', format: 'card', use: 'greeting', style: 'Minimal', colors: ['white', 'beige', 'blue'], occasion: 'greeting', tags: ['minimal', 'modern', 'matzah', 'clean', 'card', 'hebrew', 'pesach'], build(c) {
    const { W, H, u } = c;
    c.bg = '#fbfaf6';
    art(c, 'ps-matzah', W * 0.38, H * 0.14, W * 0.24, { rot: 6 });
    const h = text(c, 'פסח', W * 0.1, H * 0.42, W * 0.8, { font: 'Frank Ruhl Libre', weight: 500, size: u * 0.16, fill: NAVY, name: 'Hebrew title' });
    const t = text(c, 'Pesach', W * 0.1, below(h, u * 0.01), W * 0.8, { font: 'Bellefair', size: u * 0.06, fill: BLUE, upper: true, spacing: u * 0.03 });
    box(c, W * 0.45, below(t, u * 0.04), W * 0.1, 3, GOLD);
    text(c, 'Chag sameach from the Katz family', W * 0.12, below(t, u * 0.08), W * 0.76, { font: 'Montserrat', weight: 600, size: u * 0.03, fill: '#6b6b74' });
  } },
  { id: 'haggadah-study', name: 'Haggadah Study Evening', format: 'flyer', use: 'flyer', style: 'Traditional', colors: ['cream', 'navy', 'gold'], occasion: 'class', tags: ['haggadah', 'study', 'class', 'learning', 'adult education', 'book'], build(c) {
    const { W, H, u } = c;
    scene(c, 'ps-bg-cream', 'flyer');
    const k = text(c, 'Prepare for the Seder', W * 0.1, H * 0.12, W * 0.8, { font: 'Montserrat', weight: 800, size: u * 0.036, fill: SAGE, upper: true, spacing: u * 0.012 });
    const t = text(c, 'Haggadah Study Evening', W * 0.08, below(k, u * 0.02), W * 0.84, { font: 'David Libre', weight: 700, size: u * 0.12, lines: 2, fill: NAVY, lh: 1.02, name: 'Title' });
    art(c, 'ps-haggadah', W * 0.16, below(t, u * 0.05), W * 0.68);
    const d = text(c, 'Explore the Four Questions, the Ten Plagues and the songs', W * 0.08, H * 0.72, W * 0.56, { font: 'Cormorant Garamond', weight: 700, italic: true, size: u * 0.045, fill: INK, lines: 3, align: 'left' });
    text(c, 'Tuesday, March 21 · 7:30 PM · Library room', W * 0.08, below(d, u * 0.03), W * 0.56, { font: 'Montserrat', weight: 800, size: u * 0.032, fill: BLUE, upper: true, spacing: u * 0.004, lines: 2, align: 'left' });
  } },
  { id: 'kosher-for-passover', name: 'Kosher for Passover', format: 'post', use: 'social', style: 'Bold', colors: ['navy', 'gold', 'cream'], occasion: 'sale', tags: ['shop', 'store', 'kosher for passover', 'grocery', 'business', 'wine', 'matzah'], build(c) {
    const { W, H, u } = c;
    scene(c, 'ps-bg-navy', 'post');
    const k = text(c, 'Now in store', W * 0.06, H * 0.08, W * 0.6, { font: 'Montserrat', weight: 800, size: u * 0.045, fill: LGOLD, upper: true, spacing: u * 0.014, align: 'left' });
    const t = text(c, 'Kosher for Passover', W * 0.055, below(k, u * 0.01), W * 0.62, { font: 'Suez One', size: u * 0.11, lines: 2, fill: WHITE, align: 'left', lh: 1.05, name: 'Title' });
    text(c, 'Matzah, wine & everything for your Seder', W * 0.06, below(t, u * 0.03), W * 0.56, { font: 'Montserrat', weight: 700, size: u * 0.034, fill: '#dbe4f5', align: 'left', lines: 2 });
    art(c, 'ps-wine', W * 0.66, H * 0.22, W * 0.3);
    art(c, 'ps-matzah-stack', W * 0.06, H * 0.62, W * 0.46, { colors: ['#ecd3a1', '#b7894a', GOLD] });
  } },
  { id: 'second-night-seder', name: 'Second Night Seder', format: 'poster', use: 'poster', style: 'Luxury', colors: ['burgundy', 'gold', 'white'], occasion: 'seder', tags: ['second night', 'seder', 'table', 'dinner', 'elegant', 'restaurant'], build(c) {
    const { W, H, u } = c;
    scene(c, 'ps-bg-wine', 'poster');
    const k = text(c, 'An elegant evening', W * 0.1, H * 0.08, W * 0.8, { font: 'Cormorant Garamond', weight: 700, italic: true, size: u * 0.05, fill: LGOLD });
    const t = text(c, 'Second Night Seder', W * 0.06, below(k, u * 0.01), W * 0.88, { font: 'Cinzel', weight: 700, size: u * 0.12, lines: 2, fill: WHITE, lh: 1.05, name: 'Title' });
    const d = text(c, 'Sunday, April 2 · 7 PM · The Vineyard Hall', W * 0.1, below(t, u * 0.03), W * 0.8, { font: 'Montserrat', weight: 700, size: u * 0.034, fill: '#f0d6de', upper: true, spacing: u * 0.004, lines: 2 });
    art(c, 'ps-table', W * 0.04, below(d, u * 0.06), W * 0.92, { colors: ['#fbf6ec', WINE, GOLD] });
    pill(c, 'Reservations required', W / 2, H * 0.88, u * 0.028, GOLD, WINE);
  } },
  { id: 'four-cups-story', name: 'Four Cups, One Family', format: 'story', use: 'social', style: 'Elegant', colors: ['navy', 'silver', 'gold'], occasion: 'greeting', tags: ['four cups', 'wine', 'kiddush cup', 'family', 'story', 'instagram'], build(c) {
    const { W, H, u } = c;
    scene(c, 'ps-bg-navy', 'story');
    const t = text(c, 'Four cups, one family', W * 0.06, H * 0.12, W * 0.88, { font: 'Cormorant Garamond', weight: 700, size: u * 0.12, lines: 2, fill: WHITE, lh: 1.05, name: 'Title' });
    const h = text(c, 'פסח שמח', W * 0.1, below(t, u * 0.04), W * 0.8, { font: 'Frank Ruhl Libre', weight: 700, size: u * 0.1, fill: LGOLD, name: 'Hebrew' });
    text(c, 'From our Seder table to yours', W * 0.1, below(h, u * 0.01), W * 0.8, { font: 'Montserrat', weight: 700, size: u * 0.038, fill: '#cfdcf5', upper: true, spacing: u * 0.008, lines: 2 });
    art(c, 'ps-cup', W * 0.14, H * 0.56, W * 0.32);
    art(c, 'ps-elijah-cup', W * 0.52, H * 0.54, W * 0.34);
  } },
  { id: 'blossom-seder-invite', name: 'Spring Seder Invitation', format: 'card', use: 'invitation', style: 'Elegant', colors: ['sky', 'pink', 'brown'], occasion: 'seder', tags: ['spring', 'blossom', 'invitation', 'seder', 'rsvp', 'floral'], build(c) {
    const { W, H, u } = c;
    scene(c, 'ps-bg-spring', 'card');
    art(c, 'ps-blossom', W * 0.04, H * 0.28, W * 0.6, { rot: -8 });
    const k = text(c, 'You’re invited to our', W * 0.1, H * 0.46, W * 0.8, { font: 'Montserrat', weight: 700, size: u * 0.034, fill: SAGE, upper: true, spacing: u * 0.012 });
    const t = text(c, 'Passover Seder', W * 0.08, below(k, u * 0.02), W * 0.84, { font: 'Pinyon Script', size: u * 0.16, lines: 1, fill: WINE, name: 'Title' });
    const d = text(c, 'Saturday, April 1 · 7 PM', W * 0.1, below(t, u * 0.03), W * 0.8, { font: 'Montserrat', weight: 800, size: u * 0.038, fill: NAVY });
    const e = text(c, '12 Almond Grove · Dinner to follow', W * 0.1, below(d, u * 0.012), W * 0.8, { font: 'Cormorant Garamond', weight: 700, italic: true, size: u * 0.045, fill: '#5a5a66' });
    pill(c, 'RSVP to Leah', W / 2, below(e, u * 0.045), u * 0.028, WINE, WHITE);
  } },
  { id: 'passover-holiday-hours', name: 'Passover Holiday Hours', format: 'flyer', use: 'flyer', style: 'Minimal', colors: ['white', 'blue', 'gold'], occasion: 'announcement', tags: ['hours', 'closed', 'announcement', 'business', 'office', 'schedule'], build(c) {
    const { W, H, u } = c;
    scene(c, 'ps-bg-linen', 'flyer');
    art(c, 'ps-wheat', W * 0.42, H * 0.08, W * 0.16);
    const t = text(c, 'Passover Holiday Hours', W * 0.1, H * 0.34, W * 0.8, { font: 'Marcellus', size: u * 0.1, lines: 2, fill: NAVY, lh: 1.05, name: 'Title' });
    let y = below(t, u * 0.05);
    for (const [day, hours] of [['April 1 – 2', 'Closed'], ['April 3 – 6', '9 AM – 3 PM'], ['April 7 – 8', 'Closed'], ['From April 9', 'Regular hours']]) {
      text(c, day, W * 0.14, y, W * 0.36, { font: 'Montserrat', weight: 700, size: u * 0.036, fill: INK, align: 'left' });
      const b = text(c, hours, W * 0.5, y, W * 0.36, { font: 'Montserrat', weight: 600, size: u * 0.036, fill: BLUE, align: 'right' });
      y = below(b, u * 0.03);
    }
    text(c, 'Chag sameach from all of us', W * 0.1, y + u * 0.04, W * 0.8, { font: 'Cormorant Garamond', weight: 700, italic: true, size: u * 0.05, fill: GOLD });
  } },
  { id: 'pomegranate-chag-sameach', name: 'Chag Sameach Pomegranate', format: 'post', use: 'greeting', style: 'Elegant', colors: ['cream', 'red', 'green'], occasion: 'greeting', tags: ['pomegranate', 'chag sameach', 'hebrew', 'elegant', 'greeting'], build(c) {
    const { W, H, u } = c;
    scene(c, 'ps-bg-cream', 'post');
    art(c, 'ps-pomegranate', W * 0.36, H * 0.06, W * 0.28);
    const t = text(c, 'Chag Sameach', W * 0.1, H * 0.38, W * 0.8, { font: 'Pinyon Script', size: u * 0.14, fill: '#a3203a', name: 'Title' });
    const h = text(c, 'פסח שמח', W * 0.1, below(t, u * 0.01), W * 0.8, { font: 'Frank Ruhl Libre', weight: 700, size: u * 0.07, fill: GREEN, name: 'Hebrew' });
    text(c, 'Wishing you a sweet and meaningful Pesach', W * 0.18, below(h, u * 0.025), W * 0.64, { font: 'Montserrat', weight: 600, size: u * 0.03, fill: '#6b5a50', lines: 2 });
  } },
  { id: 'afikoman-hunt', name: 'Afikoman Hunt', format: 'story', use: 'social', style: 'Playful', colors: ['sky', 'green', 'beige'], occasion: 'kids-event', tags: ['afikoman', 'kids', 'game', 'seder', 'family', 'story'], build(c) {
    const { W, H, u } = c;
    scene(c, 'ps-bg-spring', 'story');
    const t = text(c, 'Afikoman Hunt', W * 0.06, H * 0.14, W * 0.88, { font: 'Fredoka', weight: 700, size: u * 0.15, lines: 2, fill: NAVY, lh: 1, name: 'Title' });
    text(c, 'Who will find it first?', W * 0.1, below(t, u * 0.02), W * 0.8, { font: 'Montserrat', weight: 800, size: u * 0.05, fill: WINE });
    art(c, 'ps-matzah', W * 0.26, H * 0.44, W * 0.48, { rot: -10 });
    art(c, 'ps-frog', W * 0.58, H * 0.72, W * 0.34);
    text(c, 'Tag us in your Seder pics', W * 0.06, H * 0.8, W * 0.5, { font: 'Montserrat', weight: 700, size: u * 0.04, fill: SAGE, align: 'left', lines: 2 });
  } },
  { id: 'kosher-wine-tasting', name: 'Kosher Wine Tasting', format: 'landscape', use: 'poster', style: 'Luxury', colors: ['burgundy', 'gold'], occasion: 'tasting', tags: ['wine', 'tasting', 'event', 'kosher', 'banner', 'evening'], build(c) {
    const { W, H, u } = c;
    scene(c, 'ps-bg-wine', 'landscape');
    art(c, 'ps-wine', W * 0.64, H * 0.12, W * 0.24);
    const k = text(c, 'Before the Seder', W * 0.06, H * 0.16, W * 0.54, { font: 'Cormorant Garamond', weight: 700, italic: true, size: u * 0.07, fill: LGOLD, align: 'left' });
    const t = text(c, 'Kosher Wine Tasting', W * 0.055, below(k, u * 0.01), W * 0.56, { font: 'Cinzel', weight: 700, size: u * 0.12, lines: 2, fill: WHITE, align: 'left', lh: 1.05, name: 'Title' });
    text(c, 'Thursday, March 23 · 7 PM · The Cellar · $30', W * 0.06, below(t, u * 0.04), W * 0.54, { font: 'Montserrat', weight: 700, size: u * 0.045, fill: '#f0d6de', align: 'left', lines: 2 });
  } },
  { id: 'story-of-exodus', name: 'The Story of Exodus', format: 'poster', use: 'poster', style: 'Traditional', colors: ['navy', 'gold'], occasion: 'storytelling', tags: ['exodus', 'story', 'storytelling', 'family', 'haggadah', 'candles'], build(c) {
    const { W, H, u } = c;
    scene(c, 'ps-bg-navy', 'poster');
    const k = text(c, 'A family storytelling evening', W * 0.1, H * 0.08, W * 0.8, { font: 'Montserrat', weight: 700, size: u * 0.036, fill: LGOLD, upper: true, spacing: u * 0.01 });
    const t = text(c, 'The Story of Exodus', W * 0.06, below(k, u * 0.02), W * 0.88, { font: 'Cinzel', weight: 700, size: u * 0.12, lines: 2, fill: WHITE, lh: 1.05, shadow: drop(u, 'rgba(0,0,20,0.5)'), name: 'Title' });
    const d = text(c, 'From slavery to freedom — told for all ages', W * 0.1, below(t, u * 0.03), W * 0.8, { font: 'Cormorant Garamond', weight: 700, italic: true, size: u * 0.05, fill: LGOLD, lines: 2 });
    art(c, 'ps-haggadah-closed', W * 0.2, below(d, u * 0.06), W * 0.28);
    art(c, 'ps-candles', W * 0.54, below(d, u * 0.04), W * 0.28);
    pill(c, 'Sunday, March 26 · 4 PM · Main Sanctuary', W / 2, H * 0.88, u * 0.027, GOLD, NAVY);
  } },
];
