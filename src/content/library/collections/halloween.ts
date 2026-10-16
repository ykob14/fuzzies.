/**
 * Halloween collection — 20 hand-composed templates. Every design is built only from editable layers: scene
 * backgrounds and illustrations from the Halloween asset collection (original artwork, recolourable), shapes and
 * live text in free Google fonts. Nothing is flattened, so every word, colour, illustration and position can change.
 * Sample dates are Halloween 2026 (Saturday, October 31); each design keeps to two type families.
 */
import { art, below, box, drop, glow, lin, pill, scene, text, type CollectionTemplate, type Use } from './kit';
import { centerIn, mark } from './holidayKit';

/** Fonts the collection uses (previews wait for them so text is measured exactly). */
export const HALLOWEEN_FONTS: [string, number][] = [['Creepster', 400], ['Griffy', 400], ['Henny Penny', 400], ['Mystery Quest', 400], ['Jolly Lodger', 400],
  ['Montserrat', 600], ['Montserrat', 700], ['Montserrat', 800], ['Poppins', 600], ['Poppins', 700], ['Abril Fatface', 400], ['Bebas Neue', 400], ['Fredoka', 600], ['Fredoka', 700], ['Playfair Display', 700]];

const ORANGE = '#f2802b', GOLD = '#ffcf5a', CREAM = '#fff1c1', INK = '#1a1426', WHITE = '#ffffff', GREEN = '#8bd346', PLUM = '#3b2160', RUST = '#9a3d0b';

// ---------- the 20 designs ----------
const LIST: CollectionTemplate[] = [
  { id: 'haunted-house-party', name: 'Haunted House Party', format: 'poster', style: 'Illustrated', colors: ['purple', 'orange', 'black'], occasion: 'party', tags: ['haunted house', 'party', 'invitation', 'moon', 'bats', 'night'], build(c) {
    const { W, H, u } = c;
    scene(c, 'hw-bg-night', 'poster');
    art(c, 'hw-house', W * 0.46, H * 0.4, W * 0.5);
    art(c, 'hw-bats', W * 0.52, H * 0.3, W * 0.3, { rot: -6 });
    const k = text(c, "You're invited to a", W * 0.07, H * 0.07, W * 0.48, { font: 'Montserrat', weight: 700, size: u * 0.04, fill: CREAM, upper: true, spacing: u * 0.006, align: 'left' });
    const t = text(c, 'Haunted House Party', W * 0.065, below(k, u * 0.02), W * 0.48, { font: 'Creepster', size: u * 0.17, lines: 3, fill: ORANGE, lh: 0.92, align: 'left', shadow: drop(u, 'rgba(0,0,0,0.6)'), name: 'Title' });
    const d = text(c, 'Saturday, Oct 31 · 8 PM', W * 0.07, below(t, u * 0.05), W * 0.44, { font: 'Montserrat', weight: 800, size: u * 0.048, fill: WHITE, align: 'left', name: 'Date' });
    text(c, '13 Hollow Lane, Raven Hill', W * 0.07, below(d, u * 0.015), W * 0.4, { font: 'Montserrat', weight: 600, size: u * 0.04, fill: CREAM, align: 'left', lines: 2, lh: 1.2 });
    art(c, 'hw-fog', -W * 0.1, H * 0.82, W * 1.2, { h: H * 0.12 });
    pill(c, 'Costumes required', W / 2, H * 0.9, u * 0.036, GOLD, INK);
  } },
  { id: 'trick-or-treat', name: 'Trick or Treat!', format: 'post', style: 'Illustrated', colors: ['orange', 'purple'], occasion: 'trick-or-treat', tags: ['trick or treat', 'candy', 'kids', 'pumpkin', 'street'], build(c) {
    const { W, H, u } = c;
    scene(c, 'hw-bg-patch', 'post');
    art(c, 'hw-moon', W * 0.68, H * 0.04, W * 0.26);
    art(c, 'hw-bats', W * 0.56, H * 0.3, W * 0.34, { rot: 4 });
    const t = text(c, 'Trick or Treat!', W * 0.06, H * 0.065, W * 0.6, { font: 'Griffy', size: u * 0.15, lines: 2, fill: CREAM, align: 'left', lh: 1, shadow: drop(u, 'rgba(20,10,40,0.7)'), name: 'Title' });
    const d = text(c, 'Saturday, Oct 31 · 5–8 PM', W * 0.065, below(t, u * 0.03), W * 0.56, { font: 'Montserrat', weight: 800, size: u * 0.046, fill: WHITE, align: 'left', name: 'Date' });
    text(c, 'Maple Street · porch lights on!', W * 0.065, below(d, u * 0.01), W * 0.56, { font: 'Montserrat', weight: 600, size: u * 0.04, fill: CREAM, align: 'left' });
    art(c, 'hw-jack', W * 0.28, H * 0.47, W * 0.42);
  } },
  { id: 'pumpkin-carving', name: 'Pumpkin Carving Contest', format: 'flyer', style: 'Illustrated', colors: ['cream', 'orange', 'brown'], occasion: 'contest', tags: ['pumpkin', 'carving', 'contest', 'community', 'family', 'autumn'], build(c) {
    const { W, H, u } = c;
    c.bg = lin('#fff6e6', '#ffdcb4');
    art(c, 'hw-leaves', -W * 0.08, -H * 0.04, W * 0.44, { rot: 8 });
    art(c, 'hw-leaves', W * 0.66, -H * 0.03, W * 0.4, { rot: -150, colors: ['#c2410c', '#e8590c', '#f2a516'] });
    const k = text(c, 'Maple Grove Community Center', W * 0.14, H * 0.165, W * 0.72, { font: 'Montserrat', weight: 800, size: u * 0.032, fill: RUST, upper: true, spacing: u * 0.004 });
    const t = text(c, 'Pumpkin Carving Contest', W * 0.07, below(k, u * 0.02), W * 0.86, { font: 'Abril Fatface', size: u * 0.15, lines: 2, fill: '#5a2a0a', lh: 0.98, name: 'Title' });
    art(c, 'hw-jack', W * 0.24, below(t, u * 0.05), W * 0.52);
    box(c, W * 0.07, H * 0.775, W * 0.86, H * 0.175, '#5a2a0a', { radius: u * 0.03 });
    const b0 = mark(c);
    const d = text(c, 'Sunday, October 25 · 2 PM', W * 0.1, 0, W * 0.8, { font: 'Abril Fatface', size: u * 0.064, fill: '#fff6e6', name: 'Date' });
    text(c, 'Prizes for the spookiest, silliest & most creative', W * 0.1, below(d, u * 0.02), W * 0.8, { font: 'Montserrat', weight: 600, size: u * 0.038, fill: '#ffcf9a', lines: 2, lh: 1.2 });
    centerIn(c, b0, H * 0.775, H * 0.95);
  } },
  { id: 'costume-party-invite', name: 'Costume Party Invitation', format: 'card', style: 'Illustrated', colors: ['black', 'orange', 'white'], occasion: 'party', tags: ['costume', 'party', 'invitation', 'ghosts', 'bats', 'rsvp'], build(c) {
    const { W, H, u } = c;
    scene(c, 'hw-bg-bats', 'card');
    art(c, 'hw-frame', W * 0.04, H * 0.03, W * 0.92, { h: H * 0.94 });
    art(c, 'hw-ghosts', W * 0.22, H * 0.09, W * 0.56);
    box(c, W * 0.12, H * 0.4, W * 0.76, H * 0.5, 'rgba(26,20,38,0.82)', { radius: u * 0.03 });
    const k0 = mark(c);
    const k = text(c, 'Join us for a frightfully fun night', W * 0.16, 0, W * 0.68, { font: 'Montserrat', weight: 700, size: u * 0.036, fill: GOLD, upper: true, spacing: u * 0.005, lines: 2, lh: 1.2 });
    const t = text(c, 'Costume Party', W * 0.14, below(k, u * 0.02), W * 0.72, { font: 'Henny Penny', size: u * 0.14, lines: 2, fill: WHITE, lh: 1, shadow: glow(ORANGE, u * 0.03), name: 'Title' });
    const d = text(c, 'Friday, October 30 · 7 PM', W * 0.14, below(t, u * 0.04), W * 0.72, { font: 'Montserrat', weight: 800, size: u * 0.044, fill: WHITE, name: 'Date' });
    const e = text(c, 'The Lantern Room · 42 Elm Street', W * 0.14, below(d, u * 0.012), W * 0.72, { font: 'Montserrat', weight: 600, size: u * 0.038, fill: CREAM });
    pill(c, 'RSVP to Sam by Oct 25', W / 2, below(e, u * 0.045), u * 0.032, ORANGE, INK);
    centerIn(c, k0, H * 0.4, H * 0.9);
  } },
  { id: 'spooky-movie-night', name: 'Spooky Movie Night', format: 'landscape', style: 'Illustrated', colors: ['purple', 'yellow', 'black'], occasion: 'movie-night', tags: ['movie', 'film', 'cinema', 'night', 'haunted house', 'banner'], build(c) {
    const { W, H, u } = c;
    c.bg = lin('#2d1a4f', '#0f0a1e');
    art(c, 'hw-stars', 0, 0, W, { h: H * 0.7, opacity: 0.8 });
    art(c, 'hw-hill-house', W * 0.5, H * 0.16, W * 0.5, { h: H * 0.84 });
    art(c, 'hw-bats', W * 0.4, H * 0.06, W * 0.18, { rot: -8 });
    art(c, 'hw-fog', -W * 0.05, H * 0.86, W * 1.1, { h: H * 0.14, opacity: 0.7 });
    const k0 = mark(c);
    const k = text(c, 'Friday Feature', W * 0.06, 0, W * 0.44, { font: 'Montserrat', weight: 800, size: u * 0.052, fill: CREAM, upper: true, spacing: u * 0.012, align: 'left' });
    const t = text(c, 'Spooky Movie Night', W * 0.055, below(k, u * 0.02), W * 0.44, { font: 'Creepster', size: u * 0.19, lines: 2, fill: GOLD, align: 'left', lh: 0.95, shadow: drop(u, 'rgba(0,0,0,0.6)'), name: 'Title' });
    const d = text(c, 'October 23 · Doors 7 PM', W * 0.06, below(t, u * 0.05), W * 0.44, { font: 'Montserrat', weight: 800, size: u * 0.056, fill: WHITE, align: 'left', name: 'Date' });
    text(c, 'Riverside Park Lawn · free popcorn, bring a blanket', W * 0.06, below(d, u * 0.015), W * 0.4, { font: 'Montserrat', weight: 600, size: u * 0.044, fill: CREAM, align: 'left', lines: 2, lh: 1.2 });
    centerIn(c, k0, H * 0.08, H * 0.92);
  } },
  { id: 'boo-greeting', name: 'Boo! Greeting', format: 'post', style: 'Cute', colors: ['purple', 'white'], occasion: 'greeting', tags: ['boo', 'ghost', 'greeting', 'cute', 'social'], build(c) {
    const { W, H, u } = c;
    c.bg = lin('#3b2160', '#1a1033', 160);
    art(c, 'hw-stars', 0, 0, W, { h: H * 0.6, opacity: 0.8 });
    art(c, 'hw-moon', W * 0.68, H * 0.06, W * 0.24);
    art(c, 'hw-ghost-boo', W * 0.06, H * 0.26, W * 0.46);
    const t = text(c, 'BOO!', W * 0.52, H * 0.27, W * 0.44, { font: 'Jolly Lodger', size: u * 0.3, fill: WHITE, shadow: glow('#b9a6ff', u * 0.04), name: 'Title' });
    text(c, 'Happy Halloween from all of us', W * 0.52, below(t, u * 0.01), W * 0.44, { font: 'Montserrat', weight: 700, size: u * 0.046, fill: '#d9ccff', lines: 2, lh: 1.15 });
    art(c, 'hw-pumpkins', W * 0.52, H * 0.74, W * 0.44);
  } },
  { id: 'halloween-bash-story', name: 'Halloween Bash', format: 'story', style: 'Illustrated', colors: ['purple', 'orange', 'pink'], occasion: 'party', tags: ['party', 'bash', 'story', 'instagram', 'moon', 'pumpkins'], build(c) {
    const { W, H, u } = c;
    scene(c, 'hw-bg-dusk', 'story');
    art(c, 'hw-moon-bats', W * 0.22, H * 0.04, W * 0.56);
    const t = text(c, 'Halloween Bash', W * 0.06, H * 0.31, W * 0.88, { font: 'Creepster', size: u * 0.24, lines: 2, fill: ORANGE, lh: 0.92, maxH: H * 0.2, stroke: ['#2b1846', u * 0.006], shadow: drop(u, 'rgba(20,0,30,0.6)'), name: 'Title' });
    const d = text(c, 'Saturday · October 31 · 9 PM', W * 0.08, below(t, u * 0.045), W * 0.84, { font: 'Montserrat', weight: 800, size: u * 0.056, fill: WHITE, name: 'Date' });
    const e = text(c, 'DJ · Costume contest · Treats', W * 0.08, below(d, u * 0.02), W * 0.84, { font: 'Montserrat', weight: 600, size: u * 0.05, fill: '#ffd9c2' });
    pill(c, 'Swipe up to RSVP', W / 2, below(e, u * 0.05), u * 0.042, GOLD, INK);
    art(c, 'hw-pumpkins', W * 0.1, H * 0.78, W * 0.8);
  } },
  { id: 'graveyard-smash', name: 'Graveyard Smash', format: 'poster', style: 'Illustrated', colors: ['blue', 'teal', 'white'], occasion: 'dance', tags: ['graveyard', 'dance', 'party', 'fog', 'spider', 'monster'], build(c) {
    const { W, H, u } = c;
    scene(c, 'hw-bg-graveyard', 'poster');
    art(c, 'hw-spider', W * 0.8, 0, W * 0.12);
    const k0 = mark(c);
    const k = text(c, 'A monster dance party', W * 0.1, 0, W * 0.8, { font: 'Montserrat', weight: 700, size: u * 0.04, fill: '#cfe3ef', upper: true, spacing: u * 0.01 });
    const t = text(c, 'Graveyard Smash', W * 0.06, below(k, u * 0.02), W * 0.88, { font: 'Mystery Quest', size: u * 0.17, lines: 2, fill: '#e9f6ff', lh: 1, shadow: glow('#7fd3ff', u * 0.03), name: 'Title' });
    const d = text(c, 'Sat, October 31 · 10 PM till late', W * 0.08, below(t, u * 0.04), W * 0.84, { font: 'Montserrat', weight: 800, size: u * 0.046, fill: WHITE, lines: 2, lh: 1.15, name: 'Date' });
    text(c, 'The Old Chapel Hall · Tickets $15', W * 0.1, below(d, u * 0.015), W * 0.8, { font: 'Montserrat', weight: 600, size: u * 0.04, fill: '#cfe3ef' });
    centerIn(c, k0, H * 0.33, H * 0.66);
    art(c, 'hw-eyes', W * 0.56, H * 0.68, W * 0.3, { colors: ['#b8ff6b'] });
    art(c, 'hw-fog', -W * 0.1, H * 0.88, W * 1.2, { h: H * 0.1, opacity: 0.8 });
  } },
  { id: 'witches-brew', name: "Witch's Brew Night", format: 'flyer', style: 'Illustrated', colors: ['green', 'black', 'purple'], occasion: 'bar', tags: ['witch', 'brew', 'cocktails', 'bar', 'drinks', 'menu', 'potion'], build(c) {
    const { W, H, u } = c;
    c.bg = lin('#16221a', '#0b0f0c');
    art(c, 'hw-stars', 0, 0, W, { h: H * 0.4, opacity: 0.6, colors: ['#d8ffb8'] });
    art(c, 'hw-hat', W * 0.38, H * 0.03, W * 0.24, { rot: -8 });
    const t = text(c, "Witch's Brew Night", W * 0.06, H * 0.165, W * 0.88, { font: 'Griffy', size: u * 0.14, lines: 2, fill: GREEN, lh: 1, shadow: glow('#5fbf2a', u * 0.03), name: 'Title' });
    art(c, 'hw-cauldron', W * 0.34, below(t, u * 0.03), W * 0.32);
    const m0 = mark(c);
    let y = 0;
    for (const [name, price] of [['Potion No. 9', '$9'], ["Bat's Blood Punch", '$8'], ['Pumpkin Spice Elixir', '$10']]) {
      text(c, name, W * 0.12, y, W * 0.56, { font: 'Griffy', size: u * 0.058, fill: WHITE, align: 'left' });
      const p = text(c, price, W * 0.68, y, W * 0.2, { font: 'Griffy', size: u * 0.058, fill: '#d9b8ff', align: 'right' });
      y = below(p, u * 0.01);
      box(c, W * 0.12, y, W * 0.76, Math.max(1.5, u * 0.0018), 'rgba(139,211,70,0.35)');
      y += u * 0.02;
    }
    const f = text(c, 'Friday, October 30 · 8 PM', W * 0.08, y + u * 0.03, W * 0.84, { font: 'Montserrat', weight: 800, size: u * 0.044, fill: GREEN, name: 'Date' });
    text(c, 'The Crooked Lantern · 21+', W * 0.08, below(f, u * 0.012), W * 0.84, { font: 'Montserrat', weight: 600, size: u * 0.038, fill: '#b9d9a8' });
    centerIn(c, m0, H * 0.64, H * 0.96);
  } },
  { id: 'pumpkin-patch-festival', name: 'Pumpkin Patch Festival', format: 'poster', style: 'Illustrated', colors: ['orange', 'purple', 'brown'], occasion: 'festival', tags: ['pumpkin patch', 'festival', 'farm', 'hayride', 'family', 'autumn'], build(c) {
    const { W, H, u } = c;
    scene(c, 'hw-bg-patch', 'poster');
    art(c, 'hw-leaves', W * 0.02, H * 0.02, W * 0.32);
    art(c, 'hw-leaves', W * 0.66, H * 0.03, W * 0.32, { rot: 160 });
    const k = text(c, 'Hillside Farm', W * 0.1, H * 0.11, W * 0.8, { font: 'Montserrat', weight: 800, size: u * 0.046, fill: GOLD, upper: true, spacing: u * 0.012 });
    const t = text(c, 'Pumpkin Patch Festival', W * 0.06, below(k, u * 0.015), W * 0.88, { font: 'Abril Fatface', size: u * 0.155, lines: 2, fill: CREAM, lh: 0.98, shadow: drop(u, 'rgba(40,10,40,0.6)'), name: 'Title' });
    const d = text(c, 'Hayrides · Corn maze · Hot cider · Pick your own', W * 0.1, below(t, u * 0.035), W * 0.8, { font: 'Montserrat', weight: 700, size: u * 0.04, fill: WHITE, lines: 2, lh: 1.2 });
    pill(c, 'Weekends in October · 10 AM – 5 PM', W / 2, below(d, u * 0.04), u * 0.034, ORANGE, '#2a1c3f');
  } },
  { id: 'halloween-sale', name: 'Spooky Season Sale', format: 'post', style: 'Bold', colors: ['black', 'orange'], occasion: 'sale', tags: ['sale', 'discount', 'shop', 'business', 'promotion', 'offer'], build(c) {
    const { W, H, u } = c;
    c.bg = '#15111d';
    art(c, 'hw-web', 0, 0, W * 0.32);
    art(c, 'hw-spider', W * 0.2, 0, W * 0.08);
    art(c, 'hw-jack', W * 0.5, H * 0.5, W * 0.48);
    const k0 = mark(c);
    const k = text(c, 'Spooky season sale', W * 0.07, 0, W * 0.5, { font: 'Montserrat', weight: 800, size: u * 0.052, fill: CREAM, upper: true, spacing: u * 0.006, align: 'left', lines: 2, lh: 1.1 });
    const o = text(c, '30% OFF', W * 0.06, below(k, u * 0.01), W * 0.5, { font: 'Bebas Neue', size: u * 0.24, fill: ORANGE, align: 'left', shadow: glow('#ff6a00', u * 0.03), name: 'Offer' });
    const d = text(c, 'This weekend only', W * 0.07, below(o, u * 0.01), W * 0.42, { font: 'Montserrat', weight: 700, size: u * 0.044, fill: WHITE, align: 'left' });
    text(c, 'Code BOO30', W * 0.07, below(d, u * 0.015), W * 0.42, { font: 'Bebas Neue', size: u * 0.07, fill: GOLD, align: 'left', spacing: u * 0.006, name: 'Code' });
    centerIn(c, k0, H * 0.3, H * 0.92);
    art(c, 'hw-candy-corn', W * 0.84, H * 0.06, W * 0.07, { rot: 16 });
  } },
  { id: 'trunk-or-treat', name: 'Trunk or Treat', format: 'flyer', style: 'Illustrated', colors: ['purple', 'orange', 'pink'], occasion: 'trick-or-treat', tags: ['trunk or treat', 'community', 'church', 'school', 'candy', 'kids'], build(c) {
    const { W, H, u } = c;
    scene(c, 'hw-bg-dusk', 'flyer');
    art(c, 'hw-bats', W * 0.62, H * 0.03, W * 0.32);
    const k = text(c, 'Community', W * 0.1, H * 0.075, W * 0.8, { font: 'Montserrat', weight: 800, size: u * 0.046, fill: GOLD, upper: true, spacing: u * 0.014 });
    const t = text(c, 'Trunk or Treat', W * 0.06, below(k, u * 0.005), W * 0.88, { font: 'Jolly Lodger', size: u * 0.21, lines: 1, fill: WHITE, lh: 0.92, shadow: drop(u, 'rgba(30,0,40,0.6)'), name: 'Title' });
    const d = text(c, 'Thursday, Oct 29 · 5:30–7:30 PM', W * 0.08, below(t, u * 0.035), W * 0.84, { font: 'Montserrat', weight: 800, size: u * 0.046, fill: WHITE, lines: 2, lh: 1.15, name: 'Date' });
    const e = text(c, 'St. Mark’s parking lot · 300 Church St', W * 0.1, below(d, u * 0.012), W * 0.8, { font: 'Montserrat', weight: 600, size: u * 0.04, fill: '#ffe1cf', lines: 2, lh: 1.2 });
    const y = below(e, u * 0.07);
    art(c, 'hw-candy', W * 0.08, y + u * 0.04, W * 0.3, { rot: -12 });
    art(c, 'hw-candy-corn', W * 0.44, y, W * 0.13, { rot: 10 });
    art(c, 'hw-candy', W * 0.62, y + u * 0.06, W * 0.3, { rot: 14, colors: ['#8bd346', '#ffffff', '#ff5d8f'] });
    const b0 = mark(c);
    const a = text(c, 'Decorate your trunk & bring candy', W * 0.1, 0, W * 0.8, { font: 'Jolly Lodger', size: u * 0.08, fill: GOLD, lines: 2, lh: 1 });
    text(c, 'Free for all ages · Costumes welcome', W * 0.1, below(a, u * 0.015), W * 0.8, { font: 'Montserrat', weight: 700, size: u * 0.04, fill: WHITE });
    centerIn(c, b0, H * 0.8, H * 0.95);
  } },
  { id: 'haunted-trail', name: 'Haunted Trail', format: 'story', style: 'Illustrated', colors: ['blue', 'black', 'yellow'], occasion: 'event', tags: ['haunted', 'trail', 'walk', 'woods', 'scary', 'lantern'], build(c) {
    const { W, H, u } = c;
    scene(c, 'hw-bg-graveyard', 'story');
    art(c, 'hw-tree', -W * 0.12, H * 0.38, W * 0.66, { colors: ['#070b12'] });
    art(c, 'hw-lantern', W * 0.74, 0, W * 0.15);
    art(c, 'hw-eyes', W * 0.1, H * 0.7, W * 0.36);
    const k = text(c, 'Enter if you dare', W * 0.1, H * 0.29, W * 0.8, { font: 'Montserrat', weight: 700, size: u * 0.05, fill: '#cfe3ef', upper: true, spacing: u * 0.012 });
    const t = text(c, 'Haunted Trail', W * 0.06, below(k, u * 0.015), W * 0.88, { font: 'Creepster', size: u * 0.2, lines: 2, fill: '#ffe14d', lh: 0.92, maxH: H * 0.2, shadow: glow('#ff9a00', u * 0.03), name: 'Title' });
    const d = text(c, 'Oct 23 – 31 · Dusk till 11 PM', W * 0.08, below(t, u * 0.045), W * 0.84, { font: 'Montserrat', weight: 800, size: u * 0.056, fill: WHITE, name: 'Date' });
    text(c, 'Blackwood Forest entrance · $10', W * 0.08, below(d, u * 0.018), W * 0.84, { font: 'Montserrat', weight: 600, size: u * 0.046, fill: '#cfe3ef' });
  } },
  { id: 'class-halloween-party', name: 'Class Halloween Party', format: 'flyer', style: 'Cute', colors: ['cream', 'orange', 'purple'], occasion: 'class-party', tags: ['school', 'class', 'kids', 'party', 'teacher', 'education'], build(c) {
    const { W, H, u } = c;
    c.bg = lin('#fff8ee', '#ffe9d1');
    box(c, 0, H * 0.83, W, H * 0.17, PLUM);
    art(c, 'hw-ghosts', W * 0.2, H * 0.04, W * 0.6);
    const k0 = mark(c);
    const t = text(c, 'Class Halloween Party', W * 0.06, 0, W * 0.88, { font: 'Fredoka', weight: 700, size: u * 0.14, lines: 2, fill: PLUM, lh: 1, name: 'Title' });
    const s = text(c, 'Costume parade · Games · Snacks', W * 0.06, below(t, u * 0.035), W * 0.88, { font: 'Fredoka', weight: 600, size: u * 0.048, fill: '#c2410c', lines: 2, lh: 1.15 });
    text(c, 'Friday, Oct 30 · 1:30 PM · Room 12', W * 0.08, below(s, u * 0.03), W * 0.84, { font: 'Fredoka', weight: 700, size: u * 0.048, fill: PLUM, name: 'Date' });
    centerIn(c, k0, H * 0.33, H * 0.67);
    art(c, 'hw-jack-cute', W * 0.06, H * 0.685, W * 0.17);
    art(c, 'hw-candy-corn', W * 0.82, H * 0.7, W * 0.09, { rot: 14 });
    const b0 = mark(c);
    text(c, 'Please send nut-free treats · Costumes welcome!', W * 0.08, 0, W * 0.84, { font: 'Fredoka', weight: 600, size: u * 0.04, fill: '#ffe9d1', lines: 2, lh: 1.2 });
    centerIn(c, b0, H * 0.83, H);
  } },
  { id: 'happy-halloween-wallpaper', name: 'Happy Halloween Wallpaper', format: 'story', style: 'Cute', colors: ['purple', 'orange', 'yellow'], occasion: 'greeting', tags: ['wallpaper', 'phone', 'greeting', 'cute', 'pumpkin', 'ghost'], build(c) {
    const { W, H, u } = c;
    scene(c, 'hw-bg-night', 'story');
    art(c, 'hw-ghost', W * 0.08, H * 0.52, W * 0.28, { rot: -8 });
    art(c, 'hw-bats', W * 0.52, H * 0.5, W * 0.4);
    text(c, 'Happy Halloween', W * 0.08, H * 0.3, W * 0.84, { font: 'Griffy', size: u * 0.2, lines: 2, fill: CREAM, lh: 1, shadow: glow('#ffb347', u * 0.04), name: 'Title' });
    art(c, 'hw-jack-cute', W * 0.28, H * 0.66, W * 0.44);
  } },
  { id: 'candy-hunt', name: 'Great Candy Hunt', format: 'post', style: 'Playful', colors: ['orange', 'purple', 'white'], occasion: 'kids-event', tags: ['candy', 'hunt', 'kids', 'treasure', 'family', 'games'], build(c) {
    const { W, H, u } = c;
    scene(c, 'hw-bg-candy', 'post');
    box(c, W * 0.09, H * 0.09, W * 0.82, H * 0.82, '#fff8ee', { radius: u * 0.05, shadow: { color: 'rgba(42,28,63,0.35)', blur: u * 0.03, x: 0, y: u * 0.012 } });
    const k0 = mark(c);
    art(c, 'hw-candy', W * 0.32, 0, W * 0.36);
    const t = text(c, 'The Great Candy Hunt', W * 0.14, below(c.els[c.els.length - 1], u * 0.03), W * 0.72, { font: 'Henny Penny', size: u * 0.11, lines: 2, fill: PLUM, lh: 1.02, name: 'Title' });
    const a = text(c, 'Ages 3–10 · Bring a bucket!', W * 0.14, below(t, u * 0.035), W * 0.72, { font: 'Montserrat', weight: 800, size: u * 0.042, fill: '#c2410c' });
    text(c, 'Sat, Oct 24 · 11 AM · Town Green', W * 0.14, below(a, u * 0.015), W * 0.72, { font: 'Montserrat', weight: 700, size: u * 0.04, fill: PLUM, name: 'Date' });
    centerIn(c, k0, H * 0.12, H * 0.84);
    art(c, 'hw-candy-corn', W * 0.16, H * 0.76, W * 0.07, { rot: -18 });
    art(c, 'hw-candy-corn', W * 0.77, H * 0.76, W * 0.07, { rot: 18 });
  } },
  { id: 'monster-mash', name: 'Monster Mash', format: 'poster', style: 'Bold', colors: ['green', 'black', 'purple'], occasion: 'dance', tags: ['monster', 'dance', 'dj', 'club', 'party', 'night'], build(c) {
    const { W, H, u } = c;
    scene(c, 'hw-bg-night', 'poster', ['#06140c', '#1d3d1a', '#e9ffd0']);
    art(c, 'hw-moon-bats', W * 0.52, H * 0.02, W * 0.44, { colors: ['#e9ffd0', '#0b1a0e', '#c9ff8a'] });
    const t = text(c, 'Monster Mash', W * 0.06, H * 0.26, W * 0.88, { font: 'Creepster', size: u * 0.22, lines: 2, fill: GREEN, lh: 0.92, shadow: glow('#6bff2a', u * 0.03), name: 'Title' });
    const d = text(c, 'Dance party · DJ Drac · Costume contest', W * 0.08, below(t, u * 0.035), W * 0.84, { font: 'Montserrat', weight: 800, size: u * 0.04, fill: WHITE, upper: true, spacing: u * 0.004, lines: 2, lh: 1.2 });
    text(c, 'Sat, Oct 31 · 9 PM · The Vault Club · 18+', W * 0.08, below(d, u * 0.02), W * 0.84, { font: 'Montserrat', weight: 700, size: u * 0.04, fill: '#c9ff8a', lines: 2, lh: 1.2, name: 'Date' });
    art(c, 'hw-eyes', W * 0.12, H * 0.72, W * 0.32);
    art(c, 'hw-fence', -W * 0.02, H * 0.83, W * 1.04, { h: H * 0.13, colors: ['#030805'] });
  } },
  { id: 'halloween-fun-run', name: 'Halloween Fun Run 5K', format: 'poster', style: 'Sporty', colors: ['purple', 'orange', 'pink'], occasion: 'race', tags: ['run', '5k', 'race', 'running', 'sports', 'charity', 'costume'], build(c) {
    const { W, H, u } = c;
    scene(c, 'hw-bg-dusk', 'poster');
    art(c, 'hw-bats', W * 0.06, H * 0.04, W * 0.36);
    const k = text(c, '5K', W * 0.06, H * 0.07, W * 0.88, { font: 'Bebas Neue', size: u * 0.42, fill: GOLD, shadow: drop(u, 'rgba(40,0,40,0.5)'), name: 'Distance' });
    const t = text(c, 'Halloween Fun Run', W * 0.06, below(k, -u * 0.02), W * 0.88, { font: 'Bebas Neue', size: u * 0.14, lines: 1, fill: WHITE, lh: 0.95, name: 'Title' });
    const d = text(c, 'Run in costume · Medals for every finisher', W * 0.08, below(t, u * 0.025), W * 0.84, { font: 'Montserrat', weight: 700, size: u * 0.042, fill: '#ffe1cf', lines: 2, lh: 1.2 });
    pill(c, 'Sunday, Oct 25 · 9 AM · Lakeside Park', W / 2, below(d, u * 0.04), u * 0.034, ORANGE, '#2b1846');
    art(c, 'hw-pumpkin', W * 0.39, H * 0.63, W * 0.22);
  } },
  { id: 'spooky-story-time', name: 'Spooky Story Time', format: 'card', style: 'Elegant', colors: ['cream', 'black', 'orange'], occasion: 'story-time', tags: ['story', 'library', 'books', 'reading', 'kids', 'cat', 'education'], build(c) {
    const { W, H, u } = c;
    c.bg = lin('#fbf3e4', '#f1e1c6');
    art(c, 'hw-moon', W * 0.64, H * 0.04, W * 0.28, { colors: ['#ffe6a8', '#ffcf5a'] });
    art(c, 'hw-web', W * 0.0, 0, W * 0.3, { colors: ['#b9a98f'] });
    const k = text(c, 'Town Library presents', W * 0.1, H * 0.2, W * 0.8, { font: 'Montserrat', weight: 700, size: u * 0.036, fill: RUST, upper: true, spacing: u * 0.01 });
    const t = text(c, 'Spooky Story Time', W * 0.08, below(k, u * 0.02), W * 0.84, { font: 'Playfair Display', weight: 700, italic: true, size: u * 0.14, lines: 2, fill: '#2a1f1a', lh: 1, name: 'Title' });
    text(c, 'Not-too-scary tales by candlelight', W * 0.1, below(t, u * 0.03), W * 0.8, { font: 'Playfair Display', weight: 700, italic: true, size: u * 0.05, fill: '#7a4a2a' });
    art(c, 'hw-cat', W * 0.14, H * 0.56, W * 0.26);
    art(c, 'hw-candles', W * 0.57, H * 0.585, W * 0.28);
    box(c, W * 0.1, H * 0.85, W * 0.8, Math.max(2, u * 0.002), '#2a1f1a');
    text(c, 'Ages 4–8 · Thursday, Oct 29 · 4 PM', W * 0.08, H * 0.87, W * 0.84, { font: 'Montserrat', weight: 700, size: u * 0.04, fill: '#2a1f1a', name: 'Date' });
  } },
  { id: 'halloween-menu', name: 'Halloween Menu', format: 'flyer', style: 'Elegant', colors: ['black', 'orange', 'cream'], occasion: 'menu', tags: ['menu', 'restaurant', 'cafe', 'food', 'dinner', 'business'], build(c) {
    const { W, H, u } = c;
    c.bg = lin('#221b2c', '#120e18');
    art(c, 'hw-leaves', W * 0.62, -H * 0.01, W * 0.42, { rot: 12 });
    text(c, 'Black Cat Café', W * 0.08, H * 0.06, W * 0.6, { font: 'Montserrat', weight: 800, size: u * 0.04, fill: ORANGE, upper: true, spacing: u * 0.012, align: 'left' });
    text(c, 'Halloween Menu', W * 0.075, H * 0.1, W * 0.7, { font: 'Abril Fatface', size: u * 0.12, lines: 2, fill: CREAM, align: 'left', lh: 1, name: 'Title' });
    const items: [string, string, string][] = [['Pumpkin Soup', 'Roasted squash, sage, pepitas', '$8'], ['Witch Fingers', 'Herb breadsticks, almond nails', '$6'], ['Graveyard Pie', 'Chocolate, cookie soil', '$9'], ['Spiced Cider', 'Warm apple, cinnamon', '$5']];
    items.forEach(([name, desc, price], i) => {
      const y = H * (0.32 + i * 0.1);
      text(c, name, W * 0.08, y, W * 0.56, { font: 'Playfair Display', weight: 700, size: u * 0.05, fill: WHITE, align: 'left' });
      text(c, price, W * 0.7, y, W * 0.22, { font: 'Playfair Display', weight: 700, size: u * 0.05, fill: GOLD, align: 'right' });
      text(c, desc, W * 0.08, y + u * 0.065, W * 0.6, { font: 'Montserrat', weight: 600, size: u * 0.03, fill: '#c9bfd6', align: 'left' });
    });
    art(c, 'hw-cat', W * 0.62, H * 0.72, W * 0.26);
    art(c, 'hw-candles', W * 0.06, H * 0.78, W * 0.2);
    text(c, 'Served Oct 25–31', W * 0.3, H * 0.9, W * 0.3, { font: 'Montserrat', weight: 700, size: u * 0.03, fill: ORANGE, align: 'left' });
  } },
];


const USE: Record<string, Use> = {
  'haunted-house-party': 'invitation', 'trick-or-treat': 'social', 'pumpkin-carving': 'flyer', 'costume-party-invite': 'invitation', 'spooky-movie-night': 'poster',
  'boo-greeting': 'greeting', 'halloween-bash-story': 'party', 'graveyard-smash': 'party', 'witches-brew': 'flyer', 'pumpkin-patch-festival': 'poster',
  'halloween-sale': 'social', 'trunk-or-treat': 'flyer', 'haunted-trail': 'poster', 'class-halloween-party': 'party', 'happy-halloween-wallpaper': 'greeting',
  'candy-hunt': 'party', 'monster-mash': 'poster', 'halloween-fun-run': 'poster', 'spooky-story-time': 'flyer', 'halloween-menu': 'flyer',
};
export const HALLOWEEN: CollectionTemplate[] = LIST.map((t) => ({ ...t, use: USE[t.id] }));
