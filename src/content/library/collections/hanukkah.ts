/**
 * Hanukkah collection — 20 hand-composed templates in blue, white, silver and gold plus modern variations.
 * Hebrew used: חג חנוכה שמח (Happy Hanukkah holiday), חנוכה שמח (Happy Hanukkah), חג אורים שמח (Happy Festival of
 * Lights), נס גדול היה שם (A great miracle happened there), נ ג ה ש (the dreidel's letters). Hebrew is set in Hebrew-capable
 * Google fonts (Frank Ruhl Libre, Suez One, Secular One, Bellefair, Rubik) and kept free of punctuation so it lays out
 * right-to-left cleanly. Sample dates are Hanukkah 2026: first candle Friday evening, December 4; last day Saturday, December 12.
 * Each design keeps to two type families (the Hebrew face doubles as the Latin display face where it can).
 */
import { art, below, box, drop, glow, lin, pill, scene, text, type CollectionTemplate } from './kit';
import { centerIn, endAt, mark, rule } from './holidayKit';

export const HANUKKAH_FONTS: [string, number][] = [['Frank Ruhl Libre', 500], ['Frank Ruhl Libre', 700], ['Frank Ruhl Libre', 900], ['Suez One', 400], ['Secular One', 400], ['Bellefair', 400],
  ['Heebo', 700], ['Heebo', 800], ['Rubik', 500], ['Rubik', 700], ['Rubik', 800], ['Cinzel', 600], ['Cinzel', 700], ['Cormorant Garamond', 600], ['Cormorant Garamond', 700],
  ['Pinyon Script', 400], ['Montserrat', 600], ['Montserrat', 700], ['Montserrat', 800], ['Fredoka', 600], ['Fredoka', 700]];

const BLUE = '#1f4fa8', ROYAL = '#2f6fd6', GOLD = '#e8c46a', DGOLD = '#a8781c', SILVER = '#c3cad6', WHITE = '#ffffff', INK = '#13254a', MIST = '#dbe4f5', SLATE = '#3e5277';

export const HANUKKAH: CollectionTemplate[] = [
  { id: 'chag-chanukah-sameach', name: 'Chag Chanukah Sameach', format: 'post', use: 'greeting', style: 'Traditional', colors: ['navy', 'gold', 'blue'], occasion: 'greeting', tags: ['happy hanukkah', 'chag sameach', 'hebrew', 'menorah', 'hanukkiyah', 'greeting'], build(c) {
    const { W, H, u } = c;
    scene(c, 'hk-bg-night', 'post');
    const h = text(c, 'חג חנוכה שמח', W * 0.08, H * 0.075, W * 0.84, { font: 'Suez One', size: u * 0.13, fill: GOLD, shadow: glow('#ffb238', u * 0.03), name: 'Hebrew title' });
    const t = text(c, 'Happy Hanukkah', W * 0.1, below(h, u * 0.015), W * 0.8, { font: 'Cinzel', weight: 700, size: u * 0.062, fill: WHITE, upper: true, spacing: u * 0.014 });
    art(c, 'hk-menorah', W * 0.17, below(t, u * 0.05), W * 0.66);
    text(c, 'Eight nights of light · December 4 – 12', W * 0.1, H * 0.895, W * 0.8, { font: 'Cinzel', weight: 600, size: u * 0.034, fill: MIST, spacing: u * 0.004, name: 'Dates' });
  } },
  { id: 'chanukah-party-invite', name: 'Chanukah Party Invitation', format: 'card', use: 'invitation', style: 'Elegant', colors: ['white', 'silver', 'blue'], occasion: 'party', tags: ['party', 'invitation', 'dreidel', 'rsvp', 'silver', 'family'], build(c) {
    const { W, H, u } = c;
    scene(c, 'hk-bg-silver', 'card');
    art(c, 'hk-frame', W * 0.04, H * 0.03, W * 0.92, { h: H * 0.94, colors: [DGOLD] });
    art(c, 'hk-dreidels', W * 0.22, H * 0.085, W * 0.56, { colors: [ROYAL, '#d4a940', WHITE] });
    const k0 = mark(c);
    const k = text(c, 'Please join us for a', W * 0.12, 0, W * 0.76, { font: 'Montserrat', weight: 700, size: u * 0.036, fill: BLUE, upper: true, spacing: u * 0.01 });
    const t = text(c, 'Chanukah Party', W * 0.1, below(k, u * 0.02), W * 0.8, { font: 'Frank Ruhl Libre', weight: 900, size: u * 0.15, lines: 2, fill: INK, lh: 1, name: 'Title' });
    rule(c, W / 2, below(t, u * 0.045), W * 0.12, DGOLD);
    const d = text(c, 'Sunday, December 6 · 5 PM', W * 0.12, below(t, u * 0.08), W * 0.76, { font: 'Montserrat', weight: 800, size: u * 0.044, fill: INK, name: 'Date' });
    const e = text(c, 'The Rosen home · 18 Cedar Road', W * 0.12, below(d, u * 0.016), W * 0.76, { font: 'Frank Ruhl Libre', weight: 500, size: u * 0.044, fill: SLATE });
    const e2 = text(c, 'Latkes, dreidel & the third candle', W * 0.12, below(e, u * 0.008), W * 0.76, { font: 'Frank Ruhl Libre', weight: 500, size: u * 0.044, fill: SLATE });
    pill(c, 'RSVP to Rachel by Dec 2', W / 2, below(e2, u * 0.055), u * 0.032, BLUE, WHITE);
    centerIn(c, k0, H * 0.4, H * 0.9);
  } },
  { id: 'community-menorah-lighting', name: 'Community Menorah Lighting', format: 'poster', use: 'poster', style: 'Luxury', colors: ['navy', 'gold'], occasion: 'community', tags: ['community', 'menorah lighting', 'candle lighting', 'public', 'latkes', 'music'], build(c) {
    const { W, H, u } = c;
    scene(c, 'hk-bg-gold', 'poster');
    const k = text(c, 'The seventh night', W * 0.1, H * 0.065, W * 0.8, { font: 'Montserrat', weight: 800, size: u * 0.042, fill: GOLD, upper: true, spacing: u * 0.02 });
    const t = text(c, 'Community Menorah Lighting', W * 0.06, below(k, u * 0.02), W * 0.88, { font: 'Cinzel', weight: 700, size: u * 0.12, lines: 3, fill: WHITE, lh: 1.04, name: 'Title' });
    art(c, 'hk-menorah', W * 0.22, below(t, u * 0.05), W * 0.56);
    const b0 = mark(c);
    const d = text(c, 'Thursday, December 10 · 5 PM', W * 0.08, 0, W * 0.84, { font: 'Cinzel', weight: 700, size: u * 0.056, fill: WHITE, name: 'Date' });
    const v = text(c, 'Town Square, by the clock tower', W * 0.1, below(d, u * 0.012), W * 0.8, { font: 'Montserrat', weight: 600, size: u * 0.04, fill: MIST });
    rule(c, W / 2, below(v, u * 0.035), W * 0.5, GOLD);
    text(c, 'Latkes · Live music · Sufganiyot', W * 0.06, below(v, u * 0.065), W * 0.88, { font: 'Montserrat', weight: 800, size: u * 0.036, fill: GOLD, upper: true, spacing: u * 0.004 });
    endAt(c, b0, H * 0.93);
  } },
  { id: 'festival-of-lights-story', name: 'Festival of Lights', format: 'story', use: 'greeting', style: 'Modern', colors: ['navy', 'blue', 'gold'], occasion: 'greeting', tags: ['festival of lights', 'chag urim', 'hebrew', 'oil', 'story', 'greeting'], build(c) {
    const { W, H, u } = c;
    scene(c, 'hk-bg-night', 'story');
    const k0 = mark(c);
    const h = text(c, 'חג אורים שמח', W * 0.06, 0, W * 0.88, { font: 'Frank Ruhl Libre', weight: 900, size: u * 0.16, fill: WHITE, shadow: glow('#7fb4ff', u * 0.04), name: 'Hebrew title' });
    const t = text(c, 'Wishing you a joyful Festival of Lights', W * 0.1, below(h, u * 0.03), W * 0.8, { font: 'Cormorant Garamond', weight: 700, italic: true, size: u * 0.08, fill: GOLD, lines: 2, lh: 1.05 });
    art(c, 'hk-menorah-oil', W * 0.08, below(t, u * 0.14), W * 0.84);
    const f = text(c, 'from our family to yours', W * 0.1, below(c.els[c.els.length - 1], u * 0.12), W * 0.8, { font: 'Cormorant Garamond', weight: 700, size: u * 0.05, fill: MIST, upper: true, spacing: u * 0.012 });
    rule(c, W / 2, below(f, u * 0.035), W * 0.1, GOLD);
    text(c, 'The Mizrahi family', W * 0.1, below(f, u * 0.07), W * 0.8, { font: 'Cormorant Garamond', weight: 700, italic: true, size: u * 0.06, fill: WHITE, name: 'Signature' });
    centerIn(c, k0, H * 0.08, H * 0.94);
  } },
  { id: 'dreidel-tournament', name: 'Dreidel Tournament', format: 'post', use: 'party', style: 'Playful', colors: ['blue', 'gold', 'white'], occasion: 'kids-event', tags: ['dreidel', 'tournament', 'kids', 'game', 'gelt', 'family'], build(c) {
    const { W, H, u } = c;
    scene(c, 'hk-bg-modern', 'post');
    const t = text(c, 'Dreidel Tournament', W * 0.06, H * 0.06, W * 0.88, { font: 'Rubik', weight: 800, size: u * 0.12, lines: 2, fill: BLUE, lh: 1, name: 'Title' });
    text(c, 'Spin to win chocolate gelt!', W * 0.1, below(t, u * 0.02), W * 0.8, { font: 'Rubik', weight: 700, size: u * 0.045, fill: DGOLD });
    art(c, 'hk-dreidels', W * 0.12, H * 0.37, W * 0.62);
    art(c, 'hk-gelt', W * 0.62, H * 0.6, W * 0.32);
    text(c, 'Tuesday, Dec 8 · 4 PM', W * 0.07, H * 0.8, W * 0.6, { font: 'Rubik', weight: 800, size: u * 0.05, fill: INK, align: 'left', name: 'Date' });
    text(c, 'JCC gym · ages 5 and up', W * 0.07, H * 0.87, W * 0.6, { font: 'Rubik', weight: 500, size: u * 0.04, fill: SLATE, align: 'left' });
  } },
  { id: 'latke-party', name: 'Latke Party', format: 'flyer', use: 'party', style: 'Playful', colors: ['white', 'blue', 'gold'], occasion: 'party', tags: ['latkes', 'party', 'food', 'potato pancakes', 'applesauce', 'potluck'], build(c) {
    const { W, H, u } = c;
    c.bg = lin('#ffffff', '#e6efff');
    box(c, 0, H * 0.7, W, H * 0.3, BLUE);
    art(c, 'hk-stars', W * 0.02, H * 0.01, W * 0.96, { h: H * 0.2, colors: ['#d4a940', ROYAL], opacity: 0.6 });
    const k = text(c, 'Let’s get fried!', W * 0.1, H * 0.07, W * 0.8, { font: 'Montserrat', weight: 800, size: u * 0.046, fill: DGOLD, upper: true, spacing: u * 0.014 });
    text(c, 'Latke Party', W * 0.06, below(k, u * 0.01), W * 0.88, { font: 'Suez One', size: u * 0.19, lines: 1, fill: BLUE, name: 'Title' });
    art(c, 'hk-latkes', W * 0.04, H * 0.235, W * 0.92);
    const b0 = mark(c);
    const d = text(c, 'Saturday, December 5 · 7 PM', W * 0.08, 0, W * 0.84, { font: 'Suez One', size: u * 0.064, fill: WHITE, name: 'Date' });
    const e = text(c, 'After Shabbat · 22 Willow Court', W * 0.1, below(d, u * 0.015), W * 0.8, { font: 'Montserrat', weight: 700, size: u * 0.04, fill: '#cfe0ff' });
    text(c, 'Bring a topping: applesauce or sour cream', W * 0.1, below(e, u * 0.012), W * 0.8, { font: 'Montserrat', weight: 600, size: u * 0.036, fill: GOLD, lines: 2 });
    centerIn(c, b0, H * 0.73, H * 0.97);
  } },
  { id: 'eight-nights-banner', name: 'Eight Nights of Light', format: 'landscape', use: 'social', style: 'Elegant', colors: ['blue', 'white', 'gold'], occasion: 'greeting', tags: ['eight nights', 'banner', 'header', 'menorah', 'elegant', 'website'], build(c) {
    const { W, H, u } = c;
    scene(c, 'hk-bg-pattern', 'landscape');
    box(c, W * 0.5, 0, W * 0.5, H, 'rgba(10,22,52,0.55)');
    art(c, 'hk-menorah', W * 0.555, H * 0.12, W * 0.39, { colors: [GOLD, WHITE, '#ffb238'] });
    const k0 = mark(c);
    const h = text(c, 'חנוכה שמח', W * 0.065, 0, W * 0.4, { font: 'Frank Ruhl Libre', weight: 700, size: u * 0.13, fill: GOLD, align: 'left', name: 'Hebrew' });
    const t = text(c, 'Eight Nights of Light', W * 0.065, below(h, u * 0.02), W * 0.4, { font: 'Cinzel', weight: 700, size: u * 0.15, lines: 2, fill: WHITE, align: 'left', lh: 1.04, name: 'Title' });
    rule(c, W * 0.067, below(t, u * 0.045), W * 0.06, GOLD, { left: true });
    text(c, 'Wishing you light, warmth and miracles', W * 0.065, below(t, u * 0.08), W * 0.4, { font: 'Frank Ruhl Libre', weight: 500, size: u * 0.064, fill: MIST, align: 'left', lines: 2, lh: 1.2 });
    centerIn(c, k0, H * 0.1, H * 0.9);
  } },
  { id: 'nes-gadol', name: 'A Great Miracle Happened There', format: 'post', use: 'greeting', style: 'Traditional', colors: ['blue', 'white', 'gold'], occasion: 'greeting', tags: ['nes gadol haya sham', 'miracle', 'dreidel', 'hebrew', 'greeting'], build(c) {
    const { W, H, u } = c;
    scene(c, 'hk-bg-pattern', 'post');
    const h = text(c, 'נס גדול היה שם', W * 0.06, H * 0.075, W * 0.88, { font: 'Frank Ruhl Libre', weight: 900, size: u * 0.125, fill: WHITE, name: 'Hebrew title' });
    text(c, 'A great miracle happened there', W * 0.1, below(h, u * 0.02), W * 0.8, { font: 'Frank Ruhl Libre', weight: 500, size: u * 0.052, fill: GOLD });
    art(c, 'hk-dreidel', W * 0.33, H * 0.34, W * 0.34, { rot: -6, colors: [WHITE, BLUE, '#d4a940'] });
    const l = text(c, 'נ ג ה ש', W * 0.2, H * 0.8, W * 0.6, { font: 'Frank Ruhl Libre', weight: 700, size: u * 0.06, fill: GOLD, spacing: 0, name: 'Dreidel letters' });
    text(c, 'Nun · Gimel · Hei · Shin', W * 0.1, below(l, u * 0.01), W * 0.8, { font: 'Frank Ruhl Libre', weight: 500, size: u * 0.036, fill: MIST, upper: true, spacing: u * 0.012 });
  } },
  { id: 'family-hanukkah-night', name: 'Family Hanukkah Night', format: 'card', use: 'invitation', style: 'Cozy', colors: ['blue', 'cream', 'red'], occasion: 'family', tags: ['family', 'window', 'home', 'invitation', 'candle lighting', 'dinner'], build(c) {
    const { W, H, u } = c;
    scene(c, 'hk-bg-silver', 'card');
    art(c, 'hk-window', W * 0.23, H * 0.05, W * 0.54);
    const k0 = mark(c);
    const k = text(c, 'Tuesday · the fifth night', W * 0.1, 0, W * 0.8, { font: 'Montserrat', weight: 800, size: u * 0.036, fill: BLUE, upper: true, spacing: u * 0.012 });
    const t = text(c, 'Join our family by the window', W * 0.08, below(k, u * 0.02), W * 0.84, { font: 'Frank Ruhl Libre', weight: 700, size: u * 0.085, lines: 2, fill: INK, lh: 1.08, name: 'Title' });
    rule(c, W / 2, below(t, u * 0.04), W * 0.1, DGOLD);
    const d = text(c, 'December 8 · 5:30 PM', W * 0.1, below(t, u * 0.075), W * 0.8, { font: 'Montserrat', weight: 800, size: u * 0.046, fill: INK, name: 'Date' });
    text(c, 'Candle lighting, dinner & gifts for the kids · The Levi home', W * 0.12, below(d, u * 0.015), W * 0.76, { font: 'Frank Ruhl Libre', weight: 500, size: u * 0.042, fill: SLATE, lines: 2, lh: 1.2 });
    centerIn(c, k0, H * 0.58, H * 0.95);
  } },
  { id: 'hanukkah-sale', name: 'Hanukkah Sale', format: 'post', use: 'social', style: 'Bold', colors: ['navy', 'blue', 'silver'], occasion: 'sale', tags: ['sale', 'shop', 'gifts', 'eight days', 'business', 'discount'], build(c) {
    const { W, H, u } = c;
    c.bg = lin('#13254a', '#0b1530', 160);
    art(c, 'hk-stars', W * 0.5, H * 0.04, W * 0.46, { h: H * 0.34, colors: [SILVER, WHITE] });
    const k = text(c, 'Hanukkah Sale', W * 0.07, H * 0.1, W * 0.5, { font: 'Montserrat', weight: 800, size: u * 0.05, fill: WHITE, upper: true, spacing: u * 0.012, align: 'left' });
    const t = text(c, '8 DAYS', W * 0.06, below(k, u * 0.005), W * 0.6, { font: 'Secular One', size: u * 0.2, fill: '#8fb8ff', align: 'left', name: 'Offer' });
    text(c, 'of deals · up to 30% off gifts', W * 0.07, below(t, u * 0.0), W * 0.46, { font: 'Montserrat', weight: 700, size: u * 0.046, fill: MIST, align: 'left', lines: 2, lh: 1.15 });
    art(c, 'hk-gifts', W * 0.5, H * 0.46, W * 0.46);
    text(c, 'Dec 4 – 12', W * 0.07, H * 0.78, W * 0.42, { font: 'Secular One', size: u * 0.07, fill: WHITE, align: 'left', name: 'Dates' });
    text(c, 'In store & online', W * 0.07, H * 0.865, W * 0.42, { font: 'Montserrat', weight: 600, size: u * 0.034, fill: SILVER, align: 'left' });
  } },
  { id: 'sufganiyot-bake-off', name: 'Sufganiyot Bake-Off', format: 'flyer', use: 'flyer', style: 'Playful', colors: ['blue', 'white', 'red'], occasion: 'contest', tags: ['sufganiyot', 'doughnuts', 'baking', 'contest', 'food', 'community'], build(c) {
    const { W, H, u } = c;
    scene(c, 'hk-bg-modern', 'flyer');
    const k = text(c, 'The great', W * 0.1, H * 0.075, W * 0.8, { font: 'Rubik', weight: 800, size: u * 0.05, fill: DGOLD, upper: true, spacing: u * 0.02 });
    const t = text(c, 'Sufganiyot Bake-Off', W * 0.06, below(k, u * 0.01), W * 0.88, { font: 'Rubik', weight: 800, size: u * 0.14, lines: 2, fill: BLUE, lh: 1, name: 'Title' });
    art(c, 'hk-sufganiyah', W * 0.14, below(t, u * 0.04), W * 0.72);
    const b0 = mark(c);
    const d = text(c, 'Bring your best jelly doughnut. Judges taste at 7!', W * 0.1, 0, W * 0.8, { font: 'Rubik', weight: 700, size: u * 0.044, fill: INK, lines: 2, lh: 1.15 });
    pill(c, 'Wed, Dec 9 · 6 PM · Shul kitchen', W / 2, below(d, u * 0.04), u * 0.034, BLUE, WHITE);
    endAt(c, b0, H * 0.93);
  } },
  { id: 'hanukkah-concert', name: 'Hanukkah Concert', format: 'poster', use: 'poster', style: 'Luxury', colors: ['navy', 'gold'], occasion: 'concert', tags: ['concert', 'music', 'choir', 'star of david', 'evening', 'elegant'], build(c) {
    const { W, H, u } = c;
    scene(c, 'hk-bg-gold', 'poster');
    art(c, 'hk-star-gold', W * 0.34, H * 0.055, W * 0.32);
    const k0 = mark(c);
    const k = text(c, 'The Kol Rinah Choir presents', W * 0.1, 0, W * 0.8, { font: 'Montserrat', weight: 700, size: u * 0.036, fill: GOLD, upper: true, spacing: u * 0.012 });
    const t = text(c, 'Hanukkah Concert', W * 0.06, below(k, u * 0.03), W * 0.88, { font: 'Bellefair', size: u * 0.155, lines: 2, fill: WHITE, lh: 1, name: 'Title' });
    const s = text(c, 'Songs of light for the fifth night', W * 0.1, below(t, u * 0.03), W * 0.8, { font: 'Bellefair', size: u * 0.06, fill: GOLD, lines: 2 });
    rule(c, W / 2, below(s, u * 0.06), W * 0.56, 'rgba(232,196,106,0.7)');
    const d = text(c, 'Saturday, December 5 · 8 PM', W * 0.08, below(s, u * 0.1), W * 0.84, { font: 'Bellefair', size: u * 0.064, fill: WHITE, name: 'Date' });
    const v = text(c, 'Congregation Beth Shalom · 40 Maple Avenue', W * 0.1, below(d, u * 0.02), W * 0.8, { font: 'Montserrat', weight: 600, size: u * 0.036, fill: MIST, lines: 2, lh: 1.25 });
    text(c, 'Free · Sufganiyot after the show', W * 0.1, below(v, u * 0.025), W * 0.8, { font: 'Montserrat', weight: 800, size: u * 0.036, fill: GOLD, upper: true, spacing: u * 0.008 });
    centerIn(c, k0, H * 0.27, H * 0.95);
  } },
  { id: 'kids-chanukah-crafts', name: 'Kids Chanukah Crafts', format: 'post', use: 'party', style: 'Playful', colors: ['sky', 'blue', 'gold'], occasion: 'kids-event', tags: ['kids', 'crafts', 'art', 'family', 'candles', 'dreidel'], build(c) {
    const { W, H, u } = c;
    c.bg = lin('#eaf3ff', '#cfe2ff');
    art(c, 'hk-stars', 0, H * 0.02, W, { h: H * 0.3, colors: ['#d4a940', ROYAL], opacity: 0.5 });
    const t = text(c, 'Kids Chanukah Crafts', W * 0.06, H * 0.06, W * 0.88, { font: 'Fredoka', weight: 700, size: u * 0.125, lines: 2, fill: BLUE, lh: 1, name: 'Title' });
    text(c, 'Paint a dreidel · Build a menorah · Decorate cookies', W * 0.1, below(t, u * 0.025), W * 0.8, { font: 'Fredoka', weight: 600, size: u * 0.042, fill: INK, lines: 2, lh: 1.15 });
    art(c, 'hk-candles', W * 0.12, H * 0.46, W * 0.33, { colors: [WHITE, ROYAL, '#ffb238'] });
    art(c, 'hk-dreidel', W * 0.57, H * 0.44, W * 0.29, { rot: 10 });
    pill(c, 'Sun, Dec 6 · 11 AM · Ages 3–9', W / 2, H * 0.855, u * 0.036, ROYAL, WHITE, 'Fredoka', 700);
  } },
  { id: 'happy-chanukah-gold', name: 'Happy Chanukah — Gold', format: 'story', use: 'greeting', style: 'Luxury', colors: ['navy', 'gold', 'silver'], occasion: 'greeting', tags: ['happy chanukah', 'gold', 'luxury', 'hebrew', 'menorah', 'story'], build(c) {
    const { W, H, u } = c;
    scene(c, 'hk-bg-gold', 'story');
    const t = text(c, 'Happy Chanukah', W * 0.06, H * 0.11, W * 0.88, { font: 'Pinyon Script', size: u * 0.21, lines: 2, fill: GOLD, lh: 1.05, name: 'Title' });
    const h = text(c, 'חנוכה שמח', W * 0.1, below(t, u * 0.04), W * 0.8, { font: 'Bellefair', size: u * 0.11, fill: SILVER, name: 'Hebrew' });
    text(c, 'Love & light from the Katz family', W * 0.1, below(h, u * 0.03), W * 0.8, { font: 'Bellefair', size: u * 0.05, fill: MIST, upper: true, spacing: u * 0.01, lines: 2 });
    art(c, 'hk-menorah', W * 0.1, H * 0.555, W * 0.8, { colors: [GOLD, WHITE, '#ffb238'] });
  } },
  { id: 'gelt-hunt', name: 'Gelt Hunt', format: 'post', use: 'party', style: 'Playful', colors: ['sky', 'gold', 'blue'], occasion: 'kids-event', tags: ['gelt', 'hunt', 'kids', 'chocolate coins', 'game', 'treasure'], build(c) {
    const { W, H, u } = c;
    scene(c, 'hk-bg-modern', 'post');
    art(c, 'hk-gelt', W * 0.22, H * 0.34, W * 0.56);
    const t = text(c, 'Gelt Hunt!', W * 0.06, H * 0.06, W * 0.88, { font: 'Rubik', weight: 800, size: u * 0.17, fill: DGOLD, shadow: drop(u, 'rgba(31,79,168,0.25)'), name: 'Title' });
    text(c, 'Find the hidden chocolate coins', W * 0.1, below(t, u * 0.01), W * 0.8, { font: 'Rubik', weight: 700, size: u * 0.046, fill: BLUE });
    pill(c, 'Sun, Dec 6 · 2 PM · Park Pavilion', W / 2, H * 0.84, u * 0.036, BLUE, WHITE, 'Rubik', 800);
  } },
  { id: 'nightly-candle-lighting', name: 'Nightly Candle Lighting', format: 'flyer', use: 'flyer', style: 'Elegant', colors: ['navy', 'silver', 'white'], occasion: 'community', tags: ['candle lighting', 'synagogue', 'shul', 'nightly', 'community', 'silver'], build(c) {
    const { W, H, u } = c;
    scene(c, 'hk-bg-night', 'flyer');
    const k = text(c, 'All are welcome', W * 0.1, H * 0.065, W * 0.8, { font: 'Montserrat', weight: 800, size: u * 0.042, fill: SILVER, upper: true, spacing: u * 0.016 });
    const t = text(c, 'Nightly Candle Lighting', W * 0.06, below(k, u * 0.015), W * 0.88, { font: 'Frank Ruhl Libre', weight: 900, size: u * 0.125, lines: 2, fill: WHITE, lh: 1.02, name: 'Title' });
    art(c, 'hk-menorah-silver', W * 0.19, below(t, u * 0.05), W * 0.62);
    const b0 = mark(c);
    const d = text(c, 'December 4 – 11 · at sundown', W * 0.08, 0, W * 0.84, { font: 'Frank Ruhl Libre', weight: 700, size: u * 0.062, fill: WHITE, name: 'Date' });
    const v = text(c, 'Front steps of Beth Shalom', W * 0.1, below(d, u * 0.015), W * 0.8, { font: 'Montserrat', weight: 600, size: u * 0.04, fill: MIST });
    text(c, 'Friday Dec 4: 4 PM, before Shabbat', W * 0.1, below(v, u * 0.02), W * 0.8, { font: 'Montserrat', weight: 800, size: u * 0.034, fill: SILVER, upper: true, spacing: u * 0.006 });
    endAt(c, b0, H * 0.94);
  } },
  { id: 'minimal-hanukkah', name: 'Minimal Hanukkah Card', format: 'card', use: 'greeting', style: 'Minimal', colors: ['white', 'blue'], occasion: 'greeting', tags: ['minimal', 'modern', 'star of david', 'clean', 'card', 'hebrew'], build(c) {
    const { W, H, u } = c;
    c.bg = '#fbfcff';
    box(c, W * 0.06, H * 0.045, W * 0.88, H * 0.91, 'rgba(0,0,0,0)', { stroke: '#c9d6ef', strokeWidth: Math.max(2, u * 0.003) });
    const k0 = mark(c);
    art(c, 'hk-star', W * 0.35, 0, W * 0.3, { colors: [ROYAL] });
    const t = text(c, 'Happy Hanukkah', W * 0.1, below(c.els[c.els.length - 1], u * 0.1), W * 0.8, { font: 'Frank Ruhl Libre', weight: 500, size: u * 0.12, fill: INK, name: 'Title' });
    const h = text(c, 'חנוכה שמח', W * 0.1, below(t, u * 0.025), W * 0.8, { font: 'Frank Ruhl Libre', weight: 700, size: u * 0.08, fill: ROYAL, name: 'Hebrew' });
    rule(c, W / 2, below(h, u * 0.06), W * 0.08, '#c99b2e');
    text(c, 'Light & love, the Cohen family', W * 0.12, below(h, u * 0.11), W * 0.76, { font: 'Montserrat', weight: 600, size: u * 0.046, fill: SLATE, lines: 2 });
    centerIn(c, k0, H * 0.06, H * 0.94);
  } },
  { id: 'hanukkah-gift-swap', name: 'Hanukkah Gift Swap', format: 'post', use: 'party', style: 'Modern', colors: ['blue', 'white', 'silver'], occasion: 'party', tags: ['gift swap', 'gifts', 'party', 'friends', 'presents', 'white elephant'], build(c) {
    const { W, H, u } = c;
    scene(c, 'hk-bg-pattern', 'post');
    const t = text(c, 'Hanukkah Gift Swap', W * 0.06, H * 0.06, W * 0.88, { font: 'Secular One', size: u * 0.12, lines: 2, fill: WHITE, lh: 1.02, name: 'Title' });
    text(c, 'Bring a wrapped gift under $25', W * 0.1, below(t, u * 0.02), W * 0.8, { font: 'Montserrat', weight: 700, size: u * 0.044, fill: GOLD });
    art(c, 'hk-gifts', W * 0.18, H * 0.41, W * 0.64, { colors: [WHITE, ROYAL, SILVER] });
    pill(c, 'Saturday, Dec 12 · 7 PM · Maya’s place', W / 2, H * 0.855, u * 0.034, WHITE, BLUE);
  } },
  { id: 'light-it-up-story', name: 'Light It Up', format: 'story', use: 'social', style: 'Cozy', colors: ['navy', 'red', 'gold'], occasion: 'greeting', tags: ['window', 'story', 'instagram', 'share', 'menorah', 'night'], build(c) {
    const { W, H, u } = c;
    scene(c, 'hk-bg-night', 'story');
    const t = text(c, 'Light it up', W * 0.06, H * 0.075, W * 0.88, { font: 'Suez One', size: u * 0.17, fill: WHITE, shadow: glow('#ffb238', u * 0.04), name: 'Title' });
    text(c, 'Share your menorah tonight', W * 0.1, below(t, u * 0.02), W * 0.8, { font: 'Montserrat', weight: 700, size: u * 0.055, fill: GOLD });
    art(c, 'hk-window', W * 0.1, H * 0.29, W * 0.8);
    text(c, '#FestivalOfLights', W * 0.1, H * 0.885, W * 0.8, { font: 'Montserrat', weight: 800, size: u * 0.06, fill: MIST });
  } },
  { id: 'hanukkah-dinner', name: 'Hanukkah Dinner', format: 'flyer', use: 'invitation', style: 'Luxury', colors: ['navy', 'gold', 'white'], occasion: 'dinner', tags: ['dinner', 'menu', 'invitation', 'latkes', 'brisket', 'candles'], build(c) {
    const { W, H, u } = c;
    scene(c, 'hk-bg-gold', 'flyer');
    art(c, 'hk-candles', W * 0.38, H * 0.045, W * 0.24, { colors: [WHITE, '#8fb8ff', '#ffb238'] });
    const k0 = mark(c);
    const k = text(c, 'The Olive Room presents', W * 0.1, 0, W * 0.8, { font: 'Cormorant Garamond', weight: 700, size: u * 0.042, fill: GOLD, upper: true, spacing: u * 0.014 });
    const t = text(c, 'Hanukkah Dinner', W * 0.06, below(k, u * 0.02), W * 0.88, { font: 'Cinzel', weight: 700, size: u * 0.125, lines: 2, fill: WHITE, lh: 1.02, name: 'Title' });
    rule(c, W / 2, below(t, u * 0.05), W * 0.18, GOLD);
    let y = below(t, u * 0.1);
    for (const [name, desc] of [['Crispy potato latkes', 'applesauce · crème fraîche'], ['Slow-roasted brisket', 'red wine · root vegetables'], ['Sufganiyot & coffee', 'raspberry · vanilla custard']]) {
      const e = text(c, name, W * 0.1, y, W * 0.8, { font: 'Cormorant Garamond', weight: 700, size: u * 0.068, fill: WHITE });
      const f = text(c, desc, W * 0.1, below(e, u * 0.004), W * 0.8, { font: 'Cormorant Garamond', weight: 600, italic: true, size: u * 0.046, fill: GOLD });
      y = below(f, u * 0.04);
    }
    rule(c, W / 2, y + u * 0.01, W * 0.18, GOLD);
    text(c, 'Wednesday, December 9 · 7 PM · $45', W * 0.08, y + u * 0.05, W * 0.84, { font: 'Cinzel', weight: 700, size: u * 0.044, fill: MIST, name: 'Date' });
    centerIn(c, k0, H * 0.2, H * 0.96);
  } },
];
