/**
 * Hanukkah collection — 20 hand-composed templates in blue, white, silver and gold plus modern variations.
 * Hebrew used: חג חנוכה שמח (Happy Hanukkah holiday), חנוכה שמח (Happy Hanukkah), חג אורים שמח (Happy Festival of
 * Lights), נס גדול היה שם (A great miracle happened there). Hebrew is set in Hebrew-capable Google fonts
 * (Frank Ruhl Libre, Suez One, Secular One, Bellefair, Heebo, Rubik) and kept free of punctuation so it lays out right-to-left cleanly.
 */
import { art, below, box, drop, glow, lin, pill, scene, text, type CollectionTemplate } from './kit';

export const HANUKKAH_FONTS: [string, number][] = [['Frank Ruhl Libre', 500], ['Frank Ruhl Libre', 700], ['Frank Ruhl Libre', 900], ['Suez One', 400], ['Secular One', 400], ['Bellefair', 400],
  ['Heebo', 700], ['Heebo', 800], ['Rubik', 700], ['Rubik', 800], ['Cinzel', 600], ['Cinzel', 700], ['Cormorant Garamond', 600], ['Cormorant Garamond', 700],
  ['Pinyon Script', 400], ['Montserrat', 600], ['Montserrat', 700], ['Montserrat', 800], ['Fredoka', 700]];

const BLUE = '#1f4fa8', NAVY = '#0d1b3d', ROYAL = '#2f6fd6', GOLD = '#e8c46a', DGOLD = '#c99b2e', SILVER = '#c3cad6', WHITE = '#ffffff', INK = '#13254a';

export const HANUKKAH: CollectionTemplate[] = [
  { id: 'chag-chanukah-sameach', name: 'Chag Chanukah Sameach', format: 'post', use: 'greeting', style: 'Traditional', colors: ['navy', 'gold', 'blue'], occasion: 'greeting', tags: ['happy hanukkah', 'chag sameach', 'hebrew', 'menorah', 'hanukkiyah', 'greeting'], build(c) {
    const { W, H, u } = c;
    scene(c, 'hk-bg-night', 'post');
    const h = text(c, 'חג חנוכה שמח', W * 0.08, H * 0.07, W * 0.84, { font: 'Suez One', size: u * 0.13, fill: GOLD, shadow: glow('#ffb238', u * 0.03), name: 'Hebrew title' });
    text(c, 'Happy Hanukkah', W * 0.1, below(h, u * 0.01), W * 0.8, { font: 'Cinzel', weight: 700, size: u * 0.06, fill: WHITE, upper: true, spacing: u * 0.014 });
    art(c, 'hk-menorah', W * 0.15, H * 0.36, W * 0.7);
  } },
  { id: 'chanukah-party-invite', name: 'Chanukah Party Invitation', format: 'card', use: 'invitation', style: 'Elegant', colors: ['white', 'silver', 'blue'], occasion: 'party', tags: ['party', 'invitation', 'dreidel', 'rsvp', 'silver', 'family'], build(c) {
    const { W, H, u } = c;
    scene(c, 'hk-bg-silver', 'card');
    art(c, 'hk-frame', W * 0.04, H * 0.03, W * 0.92, { h: H * 0.94, colors: [DGOLD] });
    art(c, 'hk-dreidels', W * 0.2, H * 0.08, W * 0.6, { colors: [ROYAL, '#d4a940', WHITE] });
    const k = text(c, 'Please join us for a', W * 0.12, H * 0.42, W * 0.76, { font: 'Montserrat', weight: 700, size: u * 0.034, fill: BLUE, upper: true, spacing: u * 0.01 });
    const t = text(c, 'Chanukah Party', W * 0.1, below(k, u * 0.02), W * 0.8, { font: 'Frank Ruhl Libre', weight: 900, size: u * 0.14, lines: 2, fill: INK, lh: 1, name: 'Title' });
    const d = text(c, 'Sunday, December 14 · 5 PM', W * 0.12, below(t, u * 0.04), W * 0.76, { font: 'Montserrat', weight: 800, size: u * 0.038, fill: INK });
    const e = text(c, 'Latkes, dreidel & candle lighting · 18 Cedar Road', W * 0.12, below(d, u * 0.012), W * 0.76, { font: 'Montserrat', weight: 600, size: u * 0.03, fill: '#4b5d80', lines: 2 });
    pill(c, 'RSVP to Rachel by Dec 10', W / 2, below(e, u * 0.05), u * 0.027, BLUE, WHITE);
  } },
  { id: 'community-menorah-lighting', name: 'Community Menorah Lighting', format: 'poster', use: 'poster', style: 'Luxury', colors: ['navy', 'gold'], occasion: 'community', tags: ['community', 'menorah lighting', 'candle lighting', 'public', 'latkes', 'music'], build(c) {
    const { W, H, u } = c;
    scene(c, 'hk-bg-gold', 'poster');
    const k = text(c, 'Community', W * 0.1, H * 0.07, W * 0.8, { font: 'Montserrat', weight: 800, size: u * 0.045, fill: GOLD, upper: true, spacing: u * 0.02 });
    const t = text(c, 'Menorah Lighting', W * 0.06, below(k, u * 0.01), W * 0.88, { font: 'Cinzel', weight: 700, size: u * 0.13, lines: 2, fill: WHITE, lh: 1.02, name: 'Title' });
    const d = text(c, 'Thursday, December 18 · 5 PM · Town Square', W * 0.1, below(t, u * 0.03), W * 0.8, { font: 'Montserrat', weight: 700, size: u * 0.036, fill: '#dbe4f5', lines: 2 });
    art(c, 'hk-menorah', W * 0.1, below(d, u * 0.06), W * 0.8);
    pill(c, 'Latkes · Live music · Sufganiyot', W / 2, H * 0.89, u * 0.03, GOLD, NAVY);
  } },
  { id: 'festival-of-lights-story', name: 'Festival of Lights', format: 'story', use: 'greeting', style: 'Modern', colors: ['navy', 'blue', 'gold'], occasion: 'greeting', tags: ['festival of lights', 'chag urim', 'hebrew', 'oil', 'story', 'greeting'], build(c) {
    const { W, H, u } = c;
    scene(c, 'hk-bg-night', 'story');
    const h = text(c, 'חג אורים שמח', W * 0.06, H * 0.14, W * 0.88, { font: 'Secular One', size: u * 0.16, fill: WHITE, shadow: glow('#7fb4ff', u * 0.04), name: 'Hebrew title' });
    const t = text(c, 'A joyful Festival of Lights', W * 0.1, below(h, u * 0.03), W * 0.8, { font: 'Cormorant Garamond', weight: 700, italic: true, size: u * 0.065, fill: GOLD, lines: 2 });
    text(c, 'from our family to yours', W * 0.1, below(t, u * 0.02), W * 0.8, { font: 'Montserrat', weight: 700, size: u * 0.038, fill: '#cfdcf5', upper: true, spacing: u * 0.01 });
    art(c, 'hk-menorah-oil', W * 0.06, H * 0.56, W * 0.88);
  } },
  { id: 'dreidel-tournament', name: 'Dreidel Tournament', format: 'post', use: 'party', style: 'Playful', colors: ['blue', 'gold', 'white'], occasion: 'kids-event', tags: ['dreidel', 'tournament', 'kids', 'game', 'gelt', 'family'], build(c) {
    const { W, H, u } = c;
    scene(c, 'hk-bg-modern', 'post');
    const t = text(c, 'Dreidel Tournament', W * 0.06, H * 0.06, W * 0.88, { font: 'Rubik', weight: 800, size: u * 0.12, lines: 2, fill: BLUE, lh: 1, name: 'Title' });
    text(c, 'Spin to win chocolate gelt!', W * 0.1, below(t, u * 0.02), W * 0.8, { font: 'Montserrat', weight: 800, size: u * 0.04, fill: DGOLD });
    art(c, 'hk-dreidels', W * 0.14, H * 0.38, W * 0.72);
    pill(c, 'Dec 16 · 4 PM · JCC Gym', W * 0.3, H * 0.86, u * 0.03, BLUE, WHITE);
    art(c, 'hk-gelt', W * 0.6, H * 0.76, W * 0.32);
  } },
  { id: 'latke-party', name: 'Latke Party', format: 'flyer', use: 'party', style: 'Playful', colors: ['white', 'blue', 'gold'], occasion: 'party', tags: ['latkes', 'party', 'food', 'potato pancakes', 'applesauce', 'potluck'], build(c) {
    const { W, H, u } = c;
    c.bg = lin('#ffffff', '#e6efff');
    art(c, 'hk-stars', 0, H * 0.6, W, { h: H * 0.15, colors: ['#d4a940', ROYAL] });
    const k = text(c, 'Let’s get fried!', W * 0.1, H * 0.1, W * 0.8, { font: 'Montserrat', weight: 800, size: u * 0.045, fill: DGOLD, upper: true, spacing: u * 0.014 });
    const t = text(c, 'Latke Party', W * 0.06, below(k, u * 0.01), W * 0.88, { font: 'Suez One', size: u * 0.17, lines: 1, fill: BLUE, name: 'Title' });
    art(c, 'hk-latkes', W * 0.06, below(t, u * 0.04), W * 0.88);
    box(c, W * 0.08, H * 0.76, W * 0.84, H * 0.17, BLUE, { radius: u * 0.03 });
    text(c, 'Saturday, Dec 20 · 6 PM', W * 0.1, H * 0.78, W * 0.8, { font: 'Montserrat', weight: 800, size: u * 0.042, fill: WHITE });
    text(c, 'Bring your favourite topping — sweet or savoury', W * 0.1, H * 0.84, W * 0.8, { font: 'Montserrat', weight: 600, size: u * 0.032, fill: '#cfe0ff', lines: 2 });
  } },
  { id: 'eight-nights-banner', name: 'Eight Nights of Light', format: 'landscape', use: 'social', style: 'Elegant', colors: ['blue', 'white', 'gold'], occasion: 'greeting', tags: ['eight nights', 'banner', 'header', 'menorah', 'elegant', 'website'], build(c) {
    const { W, H, u } = c;
    scene(c, 'hk-bg-pattern', 'landscape');
    const t = text(c, 'Eight Nights of Light', W * 0.06, H * 0.22, W * 0.48, { font: 'Cinzel', weight: 700, size: u * 0.13, lines: 2, fill: WHITE, align: 'left', lh: 1.05, name: 'Title' });
    const h = text(c, 'חנוכה שמח', W * 0.06, below(t, u * 0.03), W * 0.46, { font: 'Frank Ruhl Libre', weight: 700, size: u * 0.09, fill: GOLD, align: 'left', name: 'Hebrew' });
    text(c, 'Wishing you light, warmth and miracles', W * 0.06, below(h, u * 0.02), W * 0.46, { font: 'Montserrat', weight: 600, size: u * 0.042, fill: '#dbe4f5', align: 'left', lines: 2 });
    art(c, 'hk-menorah', W * 0.55, H * 0.14, W * 0.4, { colors: [GOLD, WHITE, '#ffb238'] });
  } },
  { id: 'nes-gadol', name: 'A Great Miracle Happened There', format: 'post', use: 'greeting', style: 'Traditional', colors: ['blue', 'white', 'gold'], occasion: 'greeting', tags: ['nes gadol haya sham', 'miracle', 'dreidel', 'hebrew', 'greeting'], build(c) {
    const { W, H, u } = c;
    scene(c, 'hk-bg-pattern', 'post');
    const h = text(c, 'נס גדול היה שם', W * 0.06, H * 0.08, W * 0.88, { font: 'Frank Ruhl Libre', weight: 900, size: u * 0.12, fill: WHITE, name: 'Hebrew title' });
    text(c, 'A great miracle happened there', W * 0.1, below(h, u * 0.015), W * 0.8, { font: 'Cormorant Garamond', weight: 700, italic: true, size: u * 0.05, fill: GOLD });
    art(c, 'hk-dreidel', W * 0.32, H * 0.36, W * 0.36, { rot: -6, colors: [WHITE, BLUE, '#d4a940'] });
    art(c, 'hk-stars', W * 0.02, H * 0.6, W * 0.3, { colors: [GOLD, WHITE] });
    art(c, 'hk-stars', W * 0.68, H * 0.32, W * 0.3, { colors: [GOLD, WHITE] });
  } },
  { id: 'family-hanukkah-night', name: 'Family Hanukkah Night', format: 'card', use: 'invitation', style: 'Cozy', colors: ['blue', 'cream', 'red'], occasion: 'family', tags: ['family', 'window', 'home', 'invitation', 'candle lighting', 'dinner'], build(c) {
    const { W, H, u } = c;
    scene(c, 'hk-bg-silver', 'card');
    art(c, 'hk-window', W * 0.2, H * 0.05, W * 0.6);
    const t = text(c, 'Join our family for the fifth night', W * 0.08, H * 0.56, W * 0.84, { font: 'Frank Ruhl Libre', weight: 700, size: u * 0.08, lines: 2, fill: INK, lh: 1.08, name: 'Title' });
    const d = text(c, 'Candle lighting · Dinner · Gifts for the kids', W * 0.1, below(t, u * 0.03), W * 0.8, { font: 'Montserrat', weight: 700, size: u * 0.034, fill: BLUE, lines: 2 });
    text(c, 'Thursday, December 18 · 5:30 PM · The Levi home', W * 0.1, below(d, u * 0.025), W * 0.8, { font: 'Montserrat', weight: 600, size: u * 0.03, fill: '#4b5d80', lines: 2 });
  } },
  { id: 'hanukkah-sale', name: 'Hanukkah Sale', format: 'post', use: 'social', style: 'Bold', colors: ['navy', 'blue', 'silver'], occasion: 'sale', tags: ['sale', 'shop', 'gifts', 'eight days', 'business', 'discount'], build(c) {
    const { W, H, u } = c;
    c.bg = lin('#13254a', '#0b1530', 160);
    art(c, 'hk-stars', W * 0.55, H * 0.02, W * 0.44, { h: H * 0.4, colors: [SILVER, WHITE] });
    const k = text(c, 'Hanukkah Sale', W * 0.06, H * 0.12, W * 0.55, { font: 'Montserrat', weight: 800, size: u * 0.06, fill: WHITE, upper: true, spacing: u * 0.012, align: 'left' });
    const t = text(c, '8 DAYS', W * 0.05, below(k, u * 0.01), W * 0.6, { font: 'Secular One', size: u * 0.2, fill: '#8fb8ff', align: 'left', name: 'Offer' });
    text(c, 'of deals — up to 30% off gifts', W * 0.06, below(t, u * 0.01), W * 0.52, { font: 'Montserrat', weight: 700, size: u * 0.04, fill: '#dbe4f5', align: 'left', lines: 2 });
    art(c, 'hk-gifts', W * 0.52, H * 0.48, W * 0.46);
    pill(c, 'Dec 14 – 22 · In store & online', W * 0.3, H * 0.86, u * 0.028, SILVER, NAVY);
  } },
  { id: 'sufganiyot-bake-off', name: 'Sufganiyot Bake-Off', format: 'flyer', use: 'flyer', style: 'Playful', colors: ['blue', 'white', 'red'], occasion: 'contest', tags: ['sufganiyot', 'doughnuts', 'baking', 'contest', 'food', 'community'], build(c) {
    const { W, H, u } = c;
    scene(c, 'hk-bg-modern', 'flyer');
    const k = text(c, 'The great', W * 0.1, H * 0.08, W * 0.8, { font: 'Montserrat', weight: 800, size: u * 0.045, fill: DGOLD, upper: true, spacing: u * 0.02 });
    const t = text(c, 'Sufganiyot Bake-Off', W * 0.06, below(k, u * 0.01), W * 0.88, { font: 'Rubik', weight: 800, size: u * 0.13, lines: 2, fill: BLUE, lh: 1, name: 'Title' });
    art(c, 'hk-sufganiyah', W * 0.14, below(t, u * 0.05), W * 0.72);
    const d = text(c, 'Bring your best jelly doughnut — judges taste at 7', W * 0.1, H * 0.74, W * 0.8, { font: 'Montserrat', weight: 700, size: u * 0.036, fill: INK, lines: 2 });
    pill(c, 'Wed, Dec 17 · 6 PM · Shul kitchen', W / 2, below(d, u * 0.04), u * 0.028, BLUE, WHITE);
  } },
  { id: 'hanukkah-concert', name: 'Hanukkah Concert', format: 'poster', use: 'poster', style: 'Luxury', colors: ['navy', 'gold'], occasion: 'concert', tags: ['concert', 'music', 'choir', 'star of david', 'evening', 'elegant'], build(c) {
    const { W, H, u } = c;
    scene(c, 'hk-bg-gold', 'poster');
    art(c, 'hk-star-gold', W * 0.3, H * 0.06, W * 0.4);
    const t = text(c, 'Hanukkah Concert', W * 0.06, H * 0.38, W * 0.88, { font: 'Bellefair', size: u * 0.14, lines: 2, fill: WHITE, lh: 1, name: 'Title' });
    const d = text(c, 'Songs of light with the Kol Rinah Choir', W * 0.1, below(t, u * 0.03), W * 0.8, { font: 'Cormorant Garamond', weight: 700, italic: true, size: u * 0.05, fill: GOLD, lines: 2 });
    text(c, 'Saturday, December 20 · 8 PM · Beth Shalom', W * 0.1, below(d, u * 0.05), W * 0.8, { font: 'Montserrat', weight: 700, size: u * 0.034, fill: '#dbe4f5', upper: true, spacing: u * 0.006, lines: 2 });
  } },
  { id: 'kids-chanukah-crafts', name: 'Kids Chanukah Crafts', format: 'post', use: 'party', style: 'Playful', colors: ['sky', 'blue', 'gold'], occasion: 'kids-event', tags: ['kids', 'crafts', 'art', 'family', 'candles', 'dreidel'], build(c) {
    const { W, H, u } = c;
    c.bg = lin('#eaf3ff', '#cfe2ff');
    art(c, 'hk-stars', 0, H * 0.02, W, { h: H * 0.3, colors: ['#d4a940', ROYAL] });
    const t = text(c, 'Kids Chanukah Crafts', W * 0.06, H * 0.08, W * 0.88, { font: 'Fredoka', weight: 700, size: u * 0.12, lines: 2, fill: BLUE, lh: 1, name: 'Title' });
    text(c, 'Paint a dreidel · Build a menorah · Decorate cookies', W * 0.1, below(t, u * 0.02), W * 0.8, { font: 'Montserrat', weight: 700, size: u * 0.032, fill: INK, lines: 2 });
    art(c, 'hk-candles', W * 0.1, H * 0.46, W * 0.36, { colors: [WHITE, ROYAL, '#ffb238'] });
    art(c, 'hk-dreidel', W * 0.56, H * 0.44, W * 0.32, { rot: 10 });
    pill(c, 'Sun, Dec 14 · 11 AM · Ages 3–9', W / 2, H * 0.88, u * 0.028, ROYAL, WHITE);
  } },
  { id: 'happy-chanukah-gold', name: 'Happy Chanukah — Gold', format: 'story', use: 'greeting', style: 'Luxury', colors: ['navy', 'gold', 'silver'], occasion: 'greeting', tags: ['happy chanukah', 'gold', 'luxury', 'hebrew', 'menorah', 'story'], build(c) {
    const { W, H, u } = c;
    scene(c, 'hk-bg-gold', 'story');
    const t = text(c, 'Happy Chanukah', W * 0.06, H * 0.12, W * 0.88, { font: 'Pinyon Script', size: u * 0.2, lines: 2, fill: GOLD, lh: 1.05, name: 'Title' });
    text(c, 'חנוכה שמח', W * 0.1, below(t, u * 0.03), W * 0.8, { font: 'Bellefair', size: u * 0.1, fill: SILVER, name: 'Hebrew' });
    art(c, 'hk-menorah', W * 0.08, H * 0.52, W * 0.84, { colors: [GOLD, WHITE, '#ffb238'] });
  } },
  { id: 'gelt-hunt', name: 'Gelt Hunt', format: 'post', use: 'party', style: 'Playful', colors: ['sky', 'gold', 'blue'], occasion: 'kids-event', tags: ['gelt', 'hunt', 'kids', 'chocolate coins', 'game', 'treasure'], build(c) {
    const { W, H, u } = c;
    scene(c, 'hk-bg-modern', 'post');
    art(c, 'hk-gelt', W * 0.2, H * 0.36, W * 0.6);
    const t = text(c, 'Gelt Hunt!', W * 0.06, H * 0.07, W * 0.88, { font: 'Rubik', weight: 800, size: u * 0.17, fill: DGOLD, shadow: drop(u, 'rgba(31,79,168,0.25)'), name: 'Title' });
    text(c, 'Find the hidden chocolate coins', W * 0.1, below(t, u * 0.01), W * 0.8, { font: 'Montserrat', weight: 800, size: u * 0.04, fill: BLUE });
    pill(c, 'Dec 21 · 3 PM · Park Pavilion', W / 2, H * 0.86, u * 0.03, BLUE, WHITE);
  } },
  { id: 'nightly-candle-lighting', name: 'Nightly Candle Lighting', format: 'flyer', use: 'flyer', style: 'Elegant', colors: ['navy', 'silver', 'white'], occasion: 'community', tags: ['candle lighting', 'synagogue', 'shul', 'nightly', 'community', 'silver'], build(c) {
    const { W, H, u } = c;
    scene(c, 'hk-bg-night', 'flyer');
    const k = text(c, 'All are welcome', W * 0.1, H * 0.07, W * 0.8, { font: 'Montserrat', weight: 800, size: u * 0.04, fill: SILVER, upper: true, spacing: u * 0.016 });
    const t = text(c, 'Nightly Candle Lighting', W * 0.06, below(k, u * 0.015), W * 0.88, { font: 'Frank Ruhl Libre', weight: 900, size: u * 0.12, lines: 2, fill: WHITE, lh: 1.02, name: 'Title' });
    const d = text(c, 'December 14 – 21 · 5 PM · Congregation Beth Shalom', W * 0.1, below(t, u * 0.03), W * 0.8, { font: 'Montserrat', weight: 700, size: u * 0.034, fill: '#dbe4f5', lines: 2 });
    art(c, 'hk-menorah-silver', W * 0.1, below(d, u * 0.07), W * 0.8);
  } },
  { id: 'minimal-hanukkah', name: 'Minimal Hanukkah Card', format: 'card', use: 'greeting', style: 'Minimal', colors: ['white', 'blue'], occasion: 'greeting', tags: ['minimal', 'modern', 'star of david', 'clean', 'card', 'hebrew'], build(c) {
    const { W, H, u } = c;
    c.bg = '#ffffff';
    art(c, 'hk-star', W * 0.36, H * 0.16, W * 0.28, { colors: [ROYAL] });
    const t = text(c, 'Happy Hanukkah', W * 0.1, H * 0.5, W * 0.8, { font: 'Cormorant Garamond', weight: 700, size: u * 0.1, fill: INK, name: 'Title' });
    const h = text(c, 'חנוכה שמח', W * 0.1, below(t, u * 0.02), W * 0.8, { font: 'Frank Ruhl Libre', weight: 500, size: u * 0.065, fill: ROYAL, name: 'Hebrew' });
    box(c, W * 0.45, below(h, u * 0.05), W * 0.1, 3, '#c99b2e');
    text(c, 'Light & love from the Cohen family', W * 0.12, below(h, u * 0.09), W * 0.76, { font: 'Montserrat', weight: 600, size: u * 0.03, fill: '#5b6b88' });
  } },
  { id: 'hanukkah-gift-swap', name: 'Hanukkah Gift Swap', format: 'post', use: 'party', style: 'Modern', colors: ['blue', 'white', 'silver'], occasion: 'party', tags: ['gift swap', 'gifts', 'party', 'friends', 'presents', 'white elephant'], build(c) {
    const { W, H, u } = c;
    scene(c, 'hk-bg-pattern', 'post');
    const t = text(c, 'Hanukkah Gift Swap', W * 0.06, H * 0.07, W * 0.88, { font: 'Secular One', size: u * 0.12, lines: 2, fill: WHITE, lh: 1.02, name: 'Title' });
    text(c, 'Bring a wrapped gift under $25', W * 0.1, below(t, u * 0.02), W * 0.8, { font: 'Montserrat', weight: 700, size: u * 0.038, fill: GOLD });
    art(c, 'hk-gifts', W * 0.16, H * 0.42, W * 0.68, { colors: [WHITE, ROYAL, SILVER] });
    pill(c, 'Friday, Dec 19 · 7 PM · Maya’s place', W / 2, H * 0.86, u * 0.028, WHITE, BLUE);
  } },
  { id: 'light-it-up-story', name: 'Light It Up', format: 'story', use: 'social', style: 'Cozy', colors: ['navy', 'red', 'gold'], occasion: 'greeting', tags: ['window', 'story', 'instagram', 'share', 'menorah', 'night'], build(c) {
    const { W, H, u } = c;
    scene(c, 'hk-bg-night', 'story');
    const t = text(c, 'Light it up', W * 0.06, H * 0.08, W * 0.88, { font: 'Suez One', size: u * 0.17, fill: WHITE, shadow: glow('#ffb238', u * 0.04), name: 'Title' });
    text(c, 'Share your menorah tonight', W * 0.1, below(t, u * 0.02), W * 0.8, { font: 'Montserrat', weight: 700, size: u * 0.045, fill: GOLD });
    art(c, 'hk-window', W * 0.1, H * 0.32, W * 0.8);
    text(c, '#FestivalOfLights', W * 0.1, H * 0.9, W * 0.8, { font: 'Montserrat', weight: 800, size: u * 0.05, fill: '#cfdcf5' });
  } },
  { id: 'hanukkah-dinner', name: 'Hanukkah Dinner', format: 'flyer', use: 'invitation', style: 'Luxury', colors: ['navy', 'gold', 'white'], occasion: 'dinner', tags: ['dinner', 'menu', 'invitation', 'latkes', 'brisket', 'candles'], build(c) {
    const { W, H, u } = c;
    scene(c, 'hk-bg-gold', 'flyer');
    art(c, 'hk-candles', W * 0.36, H * 0.04, W * 0.28, { colors: [WHITE, '#8fb8ff', '#ffb238'] });
    const t = text(c, 'Hanukkah Dinner', W * 0.06, H * 0.3, W * 0.88, { font: 'Cinzel', weight: 700, size: u * 0.12, lines: 2, fill: WHITE, lh: 1.02, name: 'Title' });
    let y = below(t, u * 0.05);
    for (const [i, m] of ['Crispy potato latkes', 'Slow-roasted brisket', 'Sufganiyot & coffee'].entries()) {
      const e = text(c, m, W * 0.1, y, W * 0.8, { font: 'Cormorant Garamond', weight: 700, size: u * 0.055, fill: i % 2 ? GOLD : WHITE });
      y = below(e, u * 0.02);
    }
    box(c, W * 0.42, y + u * 0.02, W * 0.16, 3, GOLD);
    text(c, 'December 18 · 7 PM · The Olive Room · $45', W * 0.1, y + u * 0.06, W * 0.8, { font: 'Montserrat', weight: 700, size: u * 0.032, fill: '#dbe4f5', upper: true, spacing: u * 0.004, lines: 2 });
  } },
];
