/**
 * Christmas collection — 20 hand-composed templates (elegant gold-and-red, traditional green-and-red, snowy winter,
 * modern minimalist, luxury and playful). Built only from editable layers: Christmas asset collection artwork,
 * shapes and live text in free Google fonts. Sample dates are December 2026 (Christmas Day is a Friday); each design
 * keeps to two type families, plus at most a short script accent.
 */
import { art, below, box, drop, glow, lin, pill, scene, text, type CollectionTemplate } from './kit';
import { centerIn, mark, rule } from './holidayKit';

export const CHRISTMAS_FONTS: [string, number][] = [['Mountains of Christmas', 700], ['Cinzel', 600], ['Cinzel', 700], ['Cormorant Garamond', 600], ['Cormorant Garamond', 700],
  ['Pinyon Script', 400], ['Berkshire Swash', 400], ['Great Vibes', 400], ['Marcellus', 400], ['Montserrat', 600], ['Montserrat', 700], ['Montserrat', 800],
  ['Fredoka', 600], ['Fredoka', 700], ['Abril Fatface', 400], ['Bebas Neue', 400], ['Playfair Display', 700]];

const RED = '#c8102e', DEEP = '#7a0d1a', GOLD = '#e8c46a', PALE = '#f5dc9a', GREEN = '#1f5c46', PINE = '#2f7d4f', CREAM = '#fbf3e6', SNOW = '#ffffff', NAVY = '#0f2747', INK = '#2a1f1a', BROWN = '#6b3e26';

export const CHRISTMAS: CollectionTemplate[] = [
  { id: 'merry-christmas-luxe', name: 'Merry Christmas — Red & Gold', format: 'poster', use: 'greeting', style: 'Luxury', colors: ['red', 'gold'], occasion: 'greeting', tags: ['merry christmas', 'luxury', 'gold', 'elegant', 'card', 'ornaments'], build(c) {
    const { W, H, u } = c;
    scene(c, 'xm-bg-red-luxe', 'poster');
    art(c, 'xm-frame', W * 0.04, H * 0.03, W * 0.92, { h: H * 0.94, colors: [GOLD] });
    art(c, 'xm-ornaments', W * 0.2, H * 0.03, W * 0.6, { colors: ['#e8c46a', '#a50e24', '#f5dc9a'] });
    const k0 = mark(c);
    const t = text(c, 'Merry Christmas', W * 0.08, 0, W * 0.84, { font: 'Pinyon Script', size: u * 0.185, lines: 2, fill: GOLD, lh: 1.02, shadow: drop(u, 'rgba(40,0,10,0.5)'), name: 'Title' });
    const s = text(c, '& a happy new year', W * 0.1, below(t, u * 0.04), W * 0.8, { font: 'Cinzel', weight: 600, size: u * 0.05, fill: PALE, upper: true, spacing: u * 0.012 });
    rule(c, W / 2, below(s, u * 0.05), W * 0.14, GOLD);
    text(c, 'With love, the Harper family', W * 0.1, below(s, u * 0.09), W * 0.8, { font: 'Cinzel', weight: 600, size: u * 0.04, fill: SNOW, spacing: u * 0.004, name: 'Signature' });
    centerIn(c, k0, H * 0.34, H * 0.77);
    art(c, 'xm-poinsettia', W * 0.4, H * 0.775, W * 0.2, { colors: ['#e8c46a', '#f5dc9a', '#a50e24'] });
  } },
  { id: 'christmas-party-invite', name: 'Christmas Party Invitation', format: 'card', use: 'invitation', style: 'Traditional', colors: ['red', 'green', 'cream'], occasion: 'party', tags: ['party', 'invitation', 'plaid', 'wreath', 'rsvp', 'traditional'], build(c) {
    const { W, H, u } = c;
    scene(c, 'xm-bg-plaid', 'card');
    box(c, W * 0.08, H * 0.06, W * 0.84, H * 0.88, CREAM, { radius: u * 0.04, shadow: { color: 'rgba(0,0,0,0.35)', blur: u * 0.03, x: 0, y: u * 0.01 } });
    art(c, 'xm-wreath', W * 0.32, H * 0.095, W * 0.36);
    const k0 = mark(c);
    const k = text(c, 'You’re invited to our', W * 0.14, 0, W * 0.72, { font: 'Montserrat', weight: 700, size: u * 0.038, fill: PINE, upper: true, spacing: u * 0.008 });
    const t = text(c, 'Christmas Party', W * 0.12, below(k, u * 0.02), W * 0.76, { font: 'Mountains of Christmas', weight: 700, size: u * 0.16, lines: 2, fill: RED, lh: 1, name: 'Title' });
    const d = text(c, 'Saturday, December 19 · 7 PM', W * 0.14, below(t, u * 0.045), W * 0.72, { font: 'Montserrat', weight: 800, size: u * 0.046, fill: INK, name: 'Date' });
    const e0 = text(c, '24 Holly Lane', W * 0.14, below(d, u * 0.015), W * 0.72, { font: 'Montserrat', weight: 600, size: u * 0.04, fill: '#5e4f46' });
    const e = text(c, 'Food, drinks & carols', W * 0.14, below(e0, u * 0.008), W * 0.72, { font: 'Montserrat', weight: 600, size: u * 0.04, fill: '#5e4f46' });
    pill(c, 'RSVP to Jamie by Dec 14', W / 2, below(e, u * 0.055), u * 0.034, PINE, SNOW);
    centerIn(c, k0, H * 0.38, H * 0.91);
  } },
  { id: 'let-it-snow', name: 'Let It Snow', format: 'post', use: 'greeting', style: 'Snowy', colors: ['blue', 'white'], occasion: 'greeting', tags: ['snow', 'winter', 'snowman', 'greeting', 'cute', 'let it snow'], build(c) {
    const { W, H, u } = c;
    scene(c, 'xm-bg-snowy-day', 'post');
    art(c, 'xm-snowflakes', 0, 0, W, { h: H * 0.45, colors: ['#9cc3e6'] });
    art(c, 'xm-snowman', W * 0.58, H * 0.27, W * 0.38);
    const k0 = mark(c);
    const t = text(c, 'Let it Snow', W * 0.07, 0, W * 0.52, { font: 'Berkshire Swash', size: u * 0.14, lines: 2, fill: NAVY, align: 'left', lh: 1.02, name: 'Title' });
    const s = text(c, 'Warm wishes for a cozy winter season', W * 0.072, below(t, u * 0.035), W * 0.46, { font: 'Montserrat', weight: 700, size: u * 0.044, fill: '#2c5d8f', align: 'left', lines: 3, lh: 1.2 });
    text(c, 'Love, the Parkers', W * 0.072, below(s, u * 0.04), W * 0.46, { font: 'Berkshire Swash', size: u * 0.05, fill: NAVY, align: 'left', name: 'Signature' });
    centerIn(c, k0, H * 0.08, H * 0.74);
  } },
  { id: 'christmas-dinner', name: 'Christmas Dinner', format: 'flyer', use: 'invitation', style: 'Luxury', colors: ['green', 'gold'], occasion: 'dinner', tags: ['dinner', 'menu', 'invitation', 'elegant', 'luxury', 'pine'], build(c) {
    const { W, H, u } = c;
    scene(c, 'xm-bg-green-bokeh', 'flyer');
    art(c, 'xm-pine', -W * 0.02, -H * 0.01, W * 0.46, { colors: ['#2f6b4f', '#8a5a32', RED] });
    art(c, 'xm-pine', W * 0.56, -H * 0.01, W * 0.46, { flip: true, colors: ['#2f6b4f', '#8a5a32', RED] });
    const k0 = mark(c);
    const k = text(c, 'You are warmly invited to', W * 0.1, 0, W * 0.8, { font: 'Cormorant Garamond', weight: 700, italic: true, size: u * 0.056, fill: PALE });
    const t = text(c, 'Christmas Dinner', W * 0.08, below(k, u * 0.02), W * 0.84, { font: 'Cinzel', weight: 700, size: u * 0.12, lines: 2, fill: SNOW, lh: 1.05, spacing: u * 0.004, name: 'Title' });
    art(c, 'xm-star', W * 0.45, below(t, u * 0.03), W * 0.1, { colors: [GOLD] });
    let y = below(t, u * 0.17);
    for (const m of ['Roast turkey & chestnut stuffing', 'Mulled wine by the fire', 'Christmas pudding & brandy cream']) {
      const e = text(c, m, W * 0.1, y, W * 0.8, { font: 'Cormorant Garamond', weight: 700, size: u * 0.056, fill: PALE });
      y = below(e, u * 0.018);
    }
    rule(c, W / 2, y + u * 0.03, W * 0.2, GOLD);
    const d = text(c, 'Friday, December 25 · 6 PM', W * 0.08, y + u * 0.07, W * 0.84, { font: 'Cinzel', weight: 700, size: u * 0.05, fill: SNOW, name: 'Date' });
    text(c, 'The Green Room · 12 Market Square', W * 0.1, below(d, u * 0.015), W * 0.8, { font: 'Cormorant Garamond', weight: 700, size: u * 0.048, fill: '#cfe7da' });
    centerIn(c, k0, H * 0.17, H * 0.95);
  } },
  { id: 'minimal-tree-card', name: 'Minimal Christmas Card', format: 'card', use: 'greeting', style: 'Minimal', colors: ['cream', 'green', 'gold'], occasion: 'greeting', tags: ['minimal', 'modern', 'tree', 'card', 'clean', 'simple'], build(c) {
    const { W, H, u } = c;
    scene(c, 'xm-bg-cream', 'card');
    box(c, W * 0.06, H * 0.045, W * 0.88, H * 0.91, 'rgba(0,0,0,0)', { stroke: '#d4b56a', strokeWidth: Math.max(2, u * 0.003) });
    const k0 = mark(c);
    art(c, 'xm-tree-minimal', W * 0.33, 0, W * 0.34);
    const t = text(c, 'Merry Christmas', W * 0.1, below(c.els[c.els.length - 1], u * 0.08), W * 0.8, { font: 'Cormorant Garamond', weight: 700, size: u * 0.13, lines: 2, fill: GREEN, lh: 1, name: 'Title' });
    rule(c, W / 2, below(t, u * 0.05), W * 0.1, '#d4a940');
    const m = text(c, 'Peace, joy & love this season', W * 0.12, below(t, u * 0.1), W * 0.76, { font: 'Cormorant Garamond', weight: 600, italic: true, size: u * 0.058, fill: '#4d5b52' });
    text(c, 'The Ortiz family', W * 0.12, below(m, u * 0.035), W * 0.76, { font: 'Montserrat', weight: 700, size: u * 0.034, fill: '#8a6a2a', upper: true, spacing: u * 0.012, name: 'Signature' });
    centerIn(c, k0, H * 0.06, H * 0.94);
  } },
  { id: 'santa-kids-party', name: "Santa's Coming! Kids Party", format: 'post', use: 'party', style: 'Playful', colors: ['red', 'white', 'blue'], occasion: 'kids-party', tags: ['santa', 'kids', 'party', 'photos with santa', 'playful', 'gifts'], build(c) {
    const { W, H, u } = c;
    scene(c, 'xm-bg-snowy-day', 'post');
    const t = text(c, "Santa's Coming!", W * 0.05, H * 0.055, W * 0.9, { font: 'Mountains of Christmas', weight: 700, size: u * 0.15, lines: 1, fill: RED, shadow: drop(u, 'rgba(0,0,0,0.2)'), name: 'Title' });
    text(c, 'Kids party · Photos with Santa · Cookies', W * 0.08, below(t, u * 0.015), W * 0.84, { font: 'Montserrat', weight: 800, size: u * 0.04, fill: NAVY });
    art(c, 'xm-santa', W * 0.05, H * 0.27, W * 0.46);
    art(c, 'xm-gifts', W * 0.5, H * 0.48, W * 0.46);
    pill(c, 'Sat, Dec 12 · 2 PM · Town Hall', W / 2, H * 0.85, u * 0.036, RED, SNOW);
  } },
  { id: 'reindeer-games', name: 'Reindeer Games', format: 'story', use: 'social', style: 'Playful', colors: ['blue', 'brown', 'red'], occasion: 'kids-event', tags: ['reindeer', 'rudolph', 'games', 'kids', 'story', 'instagram'], build(c) {
    const { W, H, u } = c;
    scene(c, 'xm-bg-snow-night', 'story');
    art(c, 'xm-lights', -W * 0.02, H * 0.02, W * 1.04);
    const t = text(c, 'Reindeer Games', W * 0.06, H * 0.1, W * 0.88, { font: 'Berkshire Swash', size: u * 0.17, lines: 2, fill: SNOW, lh: 1, shadow: glow('#7fb4ff', u * 0.03), name: 'Title' });
    const d = text(c, 'Sack races · Cocoa bar · Rudolph trivia', W * 0.08, below(t, u * 0.035), W * 0.84, { font: 'Montserrat', weight: 700, size: u * 0.052, fill: '#d9ecff', lines: 2, lh: 1.2 });
    pill(c, 'Sat, Dec 19 · 10 AM · Pine Park', W / 2, below(d, u * 0.05), u * 0.042, RED, SNOW);
    art(c, 'xm-reindeer', W * 0.18, H * 0.5, W * 0.64);
  } },
  { id: 'christmas-market', name: 'Christmas Market', format: 'poster', use: 'poster', style: 'Illustrated', colors: ['blue', 'white', 'gold'], occasion: 'market', tags: ['market', 'community', 'village', 'crafts', 'mulled wine', 'carols'], build(c) {
    const { W, H, u } = c;
    scene(c, 'xm-bg-snow-night', 'poster');
    art(c, 'xm-lights', -W * 0.02, H * 0.02, W * 1.04);
    const k = text(c, 'Old Town', W * 0.1, H * 0.115, W * 0.8, { font: 'Montserrat', weight: 800, size: u * 0.048, fill: GOLD, upper: true, spacing: u * 0.016 });
    const t = text(c, 'Christmas Market', W * 0.06, below(k, u * 0.01), W * 0.88, { font: 'Abril Fatface', size: u * 0.155, lines: 2, fill: CREAM, lh: 1, shadow: drop(u, 'rgba(0,0,30,0.5)'), name: 'Title' });
    const d = text(c, 'Handmade crafts · Mulled wine · Carols · Santa’s grotto', W * 0.1, below(t, u * 0.035), W * 0.8, { font: 'Montserrat', weight: 700, size: u * 0.04, fill: SNOW, lines: 2, lh: 1.2 });
    pill(c, 'Weekends Dec 5–20 · 10 AM – 8 PM', W / 2, below(d, u * 0.04), u * 0.034, RED, SNOW);
    art(c, 'xm-cottage', W * 0.17, H * 0.6, W * 0.66);
  } },
  { id: 'ugly-sweater-party', name: 'Ugly Sweater Party', format: 'post', use: 'party', style: 'Playful', colors: ['red', 'green'], occasion: 'party', tags: ['ugly sweater', 'party', 'fun', 'plaid', 'gingerbread', 'candy cane'], build(c) {
    const { W, H, u } = c;
    scene(c, 'xm-bg-plaid', 'post');
    box(c, W * 0.1, H * 0.13, W * 0.8, H * 0.64, GREEN, { radius: u * 0.05, shadow: { color: 'rgba(0,0,0,0.4)', blur: u * 0.03, x: 0, y: u * 0.012 } });
    const k0 = mark(c);
    const t = text(c, 'Ugly Sweater Party', W * 0.15, 0, W * 0.7, { font: 'Bebas Neue', size: u * 0.17, lines: 2, fill: SNOW, lh: 0.95, name: 'Title' });
    const d = text(c, 'Wear your worst sweater. Best one wins!', W * 0.16, below(t, u * 0.035), W * 0.68, { font: 'Montserrat', weight: 700, size: u * 0.04, fill: '#ffe08a', lines: 2, lh: 1.2 });
    text(c, 'Friday, Dec 18 · 8 PM · The Lodge', W * 0.16, below(d, u * 0.03), W * 0.68, { font: 'Montserrat', weight: 800, size: u * 0.04, fill: SNOW, name: 'Date' });
    centerIn(c, k0, H * 0.14, H * 0.76);
    art(c, 'xm-gingerbread', W * 0.02, H * 0.66, W * 0.22, { rot: -12 });
    art(c, 'xm-candy-cane', W * 0.82, H * 0.6, W * 0.12, { rot: 14 });
  } },
  { id: 'cookie-exchange', name: 'Cookie Exchange', format: 'flyer', use: 'flyer', style: 'Playful', colors: ['cream', 'brown', 'red'], occasion: 'party', tags: ['cookies', 'baking', 'exchange', 'gingerbread', 'cocoa', 'neighbours'], build(c) {
    const { W, H, u } = c;
    c.bg = lin('#fff8ee', '#f6e2c8');
    art(c, 'xm-sparkles', 0, 0, W, { h: H * 0.4, colors: ['#e2a64a'] });
    const k = text(c, 'Holiday', W * 0.1, H * 0.075, W * 0.8, { font: 'Montserrat', weight: 800, size: u * 0.05, fill: RED, upper: true, spacing: u * 0.018 });
    const t = text(c, 'Cookie Exchange', W * 0.07, below(k, u * 0.01), W * 0.86, { font: 'Berkshire Swash', size: u * 0.16, lines: 2, fill: BROWN, lh: 1, name: 'Title' });
    const y = below(t, u * 0.06);
    art(c, 'xm-gingerbread', W * 0.1, y, W * 0.27, { rot: -10 });
    art(c, 'xm-mug', W * 0.38, y + u * 0.04, W * 0.25);
    art(c, 'xm-gingerbread', W * 0.65, y, W * 0.25, { rot: 12, colors: ['#c98747', '#ffffff', PINE] });
    box(c, W * 0.07, H * 0.745, W * 0.86, H * 0.205, BROWN, { radius: u * 0.03 });
    const b0 = mark(c);
    const a = text(c, 'Bring a dozen, take a dozen home', W * 0.1, 0, W * 0.8, { font: 'Berkshire Swash', size: u * 0.062, fill: '#fff3e2' });
    const d = text(c, 'Sunday, December 13 · 3 PM', W * 0.1, below(a, u * 0.025), W * 0.8, { font: 'Montserrat', weight: 800, size: u * 0.044, fill: '#ffd9b0', name: 'Date' });
    text(c, 'Maple Street Hall', W * 0.1, below(d, u * 0.01), W * 0.8, { font: 'Montserrat', weight: 600, size: u * 0.04, fill: '#ffd9b0' });
    centerIn(c, b0, H * 0.745, H * 0.95);
  } },
  { id: 'carols-by-candlelight', name: 'Carols by Candlelight', format: 'poster', use: 'poster', style: 'Elegant', colors: ['navy', 'gold', 'white'], occasion: 'concert', tags: ['carols', 'concert', 'church', 'choir', 'star', 'music'], build(c) {
    const { W, H, u } = c;
    scene(c, 'xm-bg-snow-night', 'poster', ['#0b1c38', '#1d3f6b', '#ffffff']);
    art(c, 'xm-star', W * 0.36, H * 0.045, W * 0.28, { colors: [GOLD] });
    const k0 = mark(c);
    const t = text(c, 'Carols by Candlelight', W * 0.07, 0, W * 0.86, { font: 'Cormorant Garamond', weight: 700, size: u * 0.145, lines: 2, fill: SNOW, lh: 0.98, name: 'Title' });
    const s = text(c, 'An evening of carols & readings', W * 0.1, below(t, u * 0.035), W * 0.8, { font: 'Cormorant Garamond', weight: 600, italic: true, size: u * 0.062, fill: GOLD });
    rule(c, W / 2, below(s, u * 0.05), W * 0.4, 'rgba(232,196,106,0.7)');
    const d = text(c, 'Sunday, December 20 · 7 PM', W * 0.08, below(s, u * 0.09), W * 0.84, { font: 'Montserrat', weight: 800, size: u * 0.046, fill: SNOW, upper: true, spacing: u * 0.006, name: 'Date' });
    text(c, 'St. Anne’s Church · Free entry', W * 0.1, below(d, u * 0.018), W * 0.8, { font: 'Montserrat', weight: 600, size: u * 0.04, fill: '#d9e6f5' });
    centerIn(c, k0, H * 0.21, H * 0.66);
  } },
  { id: 'office-holiday-party', name: 'Office Holiday Party', format: 'landscape', use: 'party', style: 'Modern', colors: ['green', 'gold'], occasion: 'party', tags: ['office', 'work', 'team', 'holiday party', 'corporate', 'banner'], build(c) {
    const { W, H, u } = c;
    scene(c, 'xm-bg-green-bokeh', 'landscape');
    art(c, 'xm-ornaments', W * 0.6, 0, W * 0.32, { colors: [GOLD, RED, '#f5dc9a'] });
    art(c, 'xm-gifts', W * 0.57, H * 0.45, W * 0.38, { colors: [RED, '#2f6b4f', GOLD] });
    const k0 = mark(c);
    const k = text(c, 'You’re invited', W * 0.06, 0, W * 0.46, { font: 'Montserrat', weight: 800, size: u * 0.05, fill: GOLD, upper: true, spacing: u * 0.014, align: 'left' });
    const t = text(c, 'Team Holiday Party', W * 0.055, below(k, u * 0.02), W * 0.48, { font: 'Cinzel', weight: 700, size: u * 0.13, lines: 2, fill: SNOW, align: 'left', lh: 1.04, name: 'Title' });
    rule(c, W * 0.06, below(t, u * 0.04), W * 0.05, GOLD, { left: true });
    const d = text(c, 'Friday, Dec 11 · 6 PM', W * 0.06, below(t, u * 0.08), W * 0.46, { font: 'Montserrat', weight: 800, size: u * 0.06, fill: SNOW, align: 'left', name: 'Date' });
    const e = text(c, 'Rooftop Lounge, 9th floor', W * 0.06, below(d, u * 0.012), W * 0.46, { font: 'Montserrat', weight: 600, size: u * 0.048, fill: '#e3f2e8', align: 'left' });
    text(c, 'Dinner · Secret Santa · Music', W * 0.06, below(e, u * 0.03), W * 0.46, { font: 'Montserrat', weight: 700, size: u * 0.044, fill: GOLD, align: 'left' });
    centerIn(c, k0, H * 0.07, H * 0.93);
  } },
  { id: 'holiday-sale', name: 'Holiday Sale', format: 'post', use: 'social', style: 'Bold', colors: ['red', 'gold'], occasion: 'sale', tags: ['sale', 'shop', 'discount', 'business', 'gift', 'offer'], build(c) {
    const { W, H, u } = c;
    c.bg = lin('#b3122a', '#6e0a18', 160);
    art(c, 'xm-sparkles', 0, 0, W, { h: H, colors: [GOLD], opacity: 0.7 });
    const k = text(c, 'Holiday Sale', W * 0.07, H * 0.11, W * 0.55, { font: 'Montserrat', weight: 800, size: u * 0.058, fill: SNOW, upper: true, spacing: u * 0.012, align: 'left' });
    const t = text(c, '40% OFF', W * 0.06, below(k, u * 0.005), W * 0.6, { font: 'Bebas Neue', size: u * 0.26, fill: GOLD, align: 'left', shadow: drop(u, 'rgba(40,0,0,0.5)'), name: 'Offer' });
    text(c, 'Gifts for everyone on your list, in store & online', W * 0.07, below(t, u * 0.02), W * 0.5, { font: 'Montserrat', weight: 700, size: u * 0.042, fill: '#ffe1e1', align: 'left', lines: 3, lh: 1.2 });
    art(c, 'xm-gift', W * 0.6, H * 0.28, W * 0.34, { colors: [GOLD, RED, '#f5dc9a'] });
    art(c, 'xm-banner', W * 0.14, H * 0.8, W * 0.72, { colors: [GOLD, DEEP] });
    text(c, 'December 20 – 24', W * 0.25, H * 0.868, W * 0.5, { font: 'Montserrat', weight: 800, size: u * 0.042, fill: DEEP, upper: true, spacing: u * 0.008, name: 'Dates' });
  } },
  { id: 'cozy-christmas', name: 'Cozy Christmas', format: 'story', use: 'greeting', style: 'Cozy', colors: ['cream', 'red', 'brown'], occasion: 'greeting', tags: ['cozy', 'cocoa', 'hot chocolate', 'story', 'greeting', 'warm'], build(c) {
    const { W, H, u } = c;
    c.bg = lin('#fbf1e4', '#f1d9bf');
    art(c, 'xm-snowflakes', 0, H * 0.02, W, { h: H * 0.3, colors: ['#e3b98f'] });
    const k0 = mark(c);
    const t = text(c, 'Cozy Christmas', W * 0.06, 0, W * 0.88, { font: 'Pinyon Script', size: u * 0.22, lines: 2, fill: RED, lh: 1.02, name: 'Title' });
    const s = text(c, 'Hot cocoa, soft blankets & good company', W * 0.1, below(t, u * 0.04), W * 0.8, { font: 'Montserrat', weight: 700, size: u * 0.052, fill: BROWN, lines: 2, lh: 1.2 });
    art(c, 'xm-mug', W * 0.14, below(s, u * 0.08), W * 0.72);
    text(c, 'From our home to yours', W * 0.1, below(c.els[c.els.length - 1], u * 0.08), W * 0.8, { font: 'Montserrat', weight: 600, size: u * 0.044, fill: '#8a5a32', lines: 2, lh: 1.2, name: 'Signature' });
    centerIn(c, k0, H * 0.06, H * 0.95);
  } },
  { id: 'christmas-eve-service', name: 'Christmas Eve Service', format: 'flyer', use: 'flyer', style: 'Elegant', colors: ['cream', 'green', 'red'], occasion: 'service', tags: ['church', 'service', 'christmas eve', 'candlelight', 'holly', 'star'], build(c) {
    const { W, H, u } = c;
    scene(c, 'xm-bg-cream', 'flyer');
    art(c, 'xm-holly', -W * 0.04, -H * 0.01, W * 0.36, { rot: 160 });
    art(c, 'xm-holly', W * 0.68, H * 0.86, W * 0.36, { rot: -20 });
    const k0 = mark(c);
    art(c, 'xm-star', W * 0.41, 0, W * 0.18, { colors: ['#d4a940'] });
    const t = text(c, 'Christmas Eve Service', W * 0.08, below(c.els[c.els.length - 1], u * 0.04), W * 0.84, { font: 'Playfair Display', weight: 700, size: u * 0.125, lines: 2, fill: GREEN, lh: 1.02, name: 'Title' });
    const s = text(c, 'Candlelight, carols & the Christmas story', W * 0.1, below(t, u * 0.035), W * 0.8, { font: 'Playfair Display', weight: 700, italic: true, size: u * 0.05, fill: RED, lines: 2, lh: 1.15 });
    rule(c, W / 2, below(s, u * 0.05), W * 0.14, '#d4a940');
    const d = text(c, 'Thursday, December 24', W * 0.1, below(s, u * 0.09), W * 0.8, { font: 'Montserrat', weight: 800, size: u * 0.046, fill: INK, upper: true, spacing: u * 0.006, name: 'Date' });
    const e = text(c, '5 PM family service', W * 0.1, below(d, u * 0.02), W * 0.8, { font: 'Montserrat', weight: 600, size: u * 0.042, fill: '#4d5b52' });
    const f = text(c, '11 PM midnight mass', W * 0.1, below(e, u * 0.008), W * 0.8, { font: 'Montserrat', weight: 600, size: u * 0.042, fill: '#4d5b52' });
    text(c, 'Grace Church · 4 Elm Street', W * 0.1, below(f, u * 0.03), W * 0.8, { font: 'Playfair Display', weight: 700, size: u * 0.044, fill: GREEN });
    centerIn(c, k0, H * 0.1, H * 0.88);
  } },
  { id: 'merry-and-bright', name: 'Merry & Bright', format: 'post', use: 'greeting', style: 'Luxury', colors: ['red', 'gold'], occasion: 'greeting', tags: ['merry and bright', 'gift', 'gold', 'luxury', 'greeting'], build(c) {
    const { W, H, u } = c;
    scene(c, 'xm-bg-red-luxe', 'post');
    art(c, 'xm-gift', W * 0.31, H * 0.07, W * 0.38, { colors: [GOLD, '#a50e24', '#f5dc9a'] });
    const t = text(c, 'Merry & Bright', W * 0.06, H * 0.53, W * 0.88, { font: 'Cinzel', weight: 700, size: u * 0.115, lines: 1, fill: GOLD, spacing: u * 0.004, shadow: drop(u, 'rgba(40,0,10,0.5)'), name: 'Title' });
    const s = text(c, 'Wishing you a season full of sparkle', W * 0.08, below(t, u * 0.03), W * 0.84, { font: 'Cormorant Garamond', weight: 600, italic: true, size: u * 0.06, fill: PALE });
    text(c, 'The Bennett family', W * 0.1, below(s, u * 0.035), W * 0.8, { font: 'Cinzel', weight: 600, size: u * 0.038, fill: SNOW, spacing: u * 0.01, name: 'Signature' });
    art(c, 'xm-sparkles', 0, H * 0.8, W, { h: H * 0.2, colors: [GOLD] });
  } },
  { id: 'holiday-lights-tour', name: 'Holiday Lights Tour', format: 'landscape', use: 'poster', style: 'Illustrated', colors: ['navy', 'gold', 'white'], occasion: 'tour', tags: ['lights', 'tour', 'sleigh', 'santa', 'night', 'community', 'banner'], build(c) {
    const { W, H, u } = c;
    scene(c, 'xm-bg-snow-night', 'landscape');
    art(c, 'xm-sleigh', W * 0.54, H * 0.07, W * 0.4, { colors: ['#0b1c38', GOLD] });
    art(c, 'xm-cottage', W * 0.58, H * 0.44, W * 0.36);
    box(c, W * 0.035, H * 0.08, W * 0.48, H * 0.84, 'rgba(10,26,52,0.82)', { radius: u * 0.03 });
    art(c, 'xm-lights', W * 0.035, H * 0.06, W * 0.48);
    const k0 = mark(c);
    const t = text(c, 'Holiday Lights Tour', W * 0.07, 0, W * 0.42, { font: 'Abril Fatface', size: u * 0.12, lines: 2, fill: CREAM, align: 'left', lh: 1, name: 'Title' });
    const d = text(c, 'Hop on the trolley through the brightest streets in town', W * 0.07, below(t, u * 0.035), W * 0.41, { font: 'Montserrat', weight: 600, size: u * 0.044, fill: '#d9e6f5', align: 'left', lines: 3, lh: 1.2 });
    const e = text(c, 'Nightly Dec 10–30 · 6 & 8 PM', W * 0.07, below(d, u * 0.04), W * 0.42, { font: 'Montserrat', weight: 800, size: u * 0.05, fill: GOLD, align: 'left', name: 'Date' });
    text(c, 'Tickets $12 · Kids ride free', W * 0.07, below(e, u * 0.015), W * 0.42, { font: 'Montserrat', weight: 600, size: u * 0.044, fill: '#d9e6f5', align: 'left' });
    centerIn(c, k0, H * 0.14, H * 0.9);
  } },
  { id: 'stocking-drive', name: 'Stocking Stuffer Drive', format: 'flyer', use: 'flyer', style: 'Traditional', colors: ['cream', 'red', 'green'], occasion: 'charity', tags: ['donation', 'charity', 'toy drive', 'stockings', 'community', 'giving'], build(c) {
    const { W, H, u } = c;
    c.bg = lin('#fffaf2', '#f6ead8');
    box(c, 0, H * 0.06, W, u * 0.012, '#8a5a32');
    art(c, 'xm-stocking', W * 0.12, H * 0.05, W * 0.24, { rot: -6 });
    art(c, 'xm-stocking', W * 0.4, H * 0.06, W * 0.22, { colors: [PINE, SNOW, RED] });
    art(c, 'xm-stocking', W * 0.66, H * 0.05, W * 0.24, { rot: 6, colors: ['#d4a940', SNOW, RED] });
    const k0 = mark(c);
    const t = text(c, 'Stocking Stuffer Drive', W * 0.08, 0, W * 0.84, { font: 'Mountains of Christmas', weight: 700, size: u * 0.15, lines: 2, fill: RED, lh: 1, name: 'Title' });
    const d = text(c, 'Help us fill 200 stockings for local kids', W * 0.1, below(t, u * 0.035), W * 0.8, { font: 'Montserrat', weight: 700, size: u * 0.046, fill: GREEN, lines: 2, lh: 1.2 });
    const e = text(c, 'Toys · Books · Mittens · Treats', W * 0.1, below(d, u * 0.025), W * 0.8, { font: 'Montserrat', weight: 600, size: u * 0.04, fill: '#5e4f46' });
    pill(c, 'Drop off by Fri, Dec 18 · Community Center', W / 2, below(e, u * 0.06), u * 0.032, GREEN, SNOW);
    centerIn(c, k0, H * 0.4, H * 0.92);
  } },
  { id: 'wishing-you-joy', name: 'Wishing You Joy', format: 'card', use: 'greeting', style: 'Traditional', colors: ['green', 'red', 'cream'], occasion: 'greeting', tags: ['joy', 'wreath', 'card', 'greeting', 'traditional'], build(c) {
    const { W, H, u } = c;
    scene(c, 'xm-bg-cream', 'card');
    art(c, 'xm-wreath', W * 0.14, H * 0.1, W * 0.72);
    text(c, 'Joy', W * 0.25, H * 0.27, W * 0.5, { font: 'Pinyon Script', size: u * 0.26, fill: RED, name: 'Title' });
    const t = text(c, 'Wishing you joy this Christmas', W * 0.1, H * 0.655, W * 0.8, { font: 'Cormorant Garamond', weight: 700, size: u * 0.075, lines: 2, fill: GREEN, lh: 1.05 });
    rule(c, W / 2, below(t, u * 0.04), W * 0.1, '#c99b2e');
    text(c, 'Love, Mia & Theo', W * 0.1, below(t, u * 0.08), W * 0.8, { font: 'Cormorant Garamond', weight: 700, size: u * 0.05, fill: '#8a5a32', upper: true, spacing: u * 0.012, name: 'Signature' });
  } },
  { id: 'winter-concert', name: 'Winter Concert', format: 'story', use: 'social', style: 'Elegant', colors: ['red', 'gold'], occasion: 'concert', tags: ['concert', 'music', 'bells', 'choir', 'school', 'story'], build(c) {
    const { W, H, u } = c;
    scene(c, 'xm-bg-red-luxe', 'story');
    art(c, 'xm-bells', W * 0.24, H * 0.07, W * 0.52, { colors: [GOLD, '#2f6b4f', '#2f6b4f'] });
    const k0 = mark(c);
    const t = text(c, 'Winter Concert', W * 0.06, 0, W * 0.88, { font: 'Cinzel', weight: 700, size: u * 0.155, lines: 2, fill: GOLD, lh: 1.04, spacing: u * 0.004, name: 'Title' });
    const d = text(c, 'Choir, orchestra & carols', W * 0.1, below(t, u * 0.04), W * 0.8, { font: 'Cormorant Garamond', weight: 700, italic: true, size: u * 0.066, fill: PALE, lines: 2, lh: 1.1 });
    pill(c, 'Thursday, Dec 17 · 6:30 PM', W / 2, below(d, u * 0.06), u * 0.044, GOLD, DEEP, 'Cinzel', 700);
    text(c, 'Riverside School Auditorium', W * 0.08, below(c.els[c.els.length - 2], u * 0.05), W * 0.84, { font: 'Cormorant Garamond', weight: 700, size: u * 0.064, fill: SNOW });
    centerIn(c, k0, H * 0.29, H * 0.78);
    art(c, 'xm-sparkles', 0, H * 0.8, W, { h: H * 0.18, colors: [GOLD] });
  } },
];
