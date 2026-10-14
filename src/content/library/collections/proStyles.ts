/**
 * Professional photo templates (owner: "add any more templates that you think are really good and professional").
 * Built on the team kit (team.ts themes, header band, pills; teamStyles.ts photo helpers), every photo a tap-to-fill frame:
 *
 * - `feature`  header band + one big photo frame + a label and lines (bullets) + a closing pill. Square pages put the photo
 *              left and the words right; tall pages stack them. Hiring, webinars, home listings, RA floor meetings & events.
 * - `quote`    a customer review: big quote mark, the words, five stars, a round photo, name and role on a light page.
 * Speaker line-ups and the RA duty rota reuse `circles` and `directory` from teamStyles.ts.
 */
import { box, text, type CollectionTemplate, type Kit } from './kit';
import { footer, header, NAMES, people, RA_TAGS, T, tpl, type Theme } from './team';
import { circles, directory, L, lookPic, themePic, type Entry, type Look } from './teamStyles';

interface Feature {
  kicker: string; title: string; sub: string;
  mask: 'none' | 'circle' | 'arch';
  label?: string; lines: string[]; bullets?: boolean; lead?: boolean; // lead: the first line is bigger (a name, a price…)
  badge?: string; footer: string;
}
/** Header band, one photo frame, a label + lines, a closing pill. */
function feature(c: Kit, th: Theme, o: Feature): void {
  const { W, H, u } = c;
  const square = H / W < 1.15, tall = H / W > 1.5, round = o.mask === 'circle';
  const hh = H * (square ? 0.24 : tall ? 0.17 : 0.18);
  header(c, th, { kicker: o.kicker, title: o.title, sub: o.sub, h: hh, size: square ? 0.08 : 0.085 });
  const pillH = u * (square ? 0.075 : 0.07);
  let px: number, py: number, pw: number, ph: number, tx: number, tw: number, ty: number;
  if (square) {
    px = W * 0.07; py = hh + u * 0.06; pw = W * 0.42; ph = H - py - u * 0.2;
    if (round) { pw = ph = Math.min(pw, ph); py += (H - u * 0.2 - hh - u * 0.06 - pw) / 2; }
    tx = px + pw + W * 0.06; tw = W - tx - W * 0.07; ty = hh + u * 0.09;
  } else {
    pw = W * (round ? 0.5 : 0.84); ph = round ? pw : pw * (tall ? 0.95 : 0.68);
    px = (W - pw) / 2; py = hh + u * 0.07; tx = W * 0.12; tw = W * 0.76; ty = py + ph + u * 0.06;
  }
  // the photo frame: soft shadow, coloured edge, the tap-to-fill photo
  const b = u * 0.012, r = round ? 0 : Math.min(pw, ph) * 0.06;
  if (round) {
    box(c, px - b * 2, py - b * 2, pw + b * 4, ph + b * 4, th.bar, { shape: 'ellipse', name: 'Photo ring' });
    box(c, px - b, py - b, pw + b * 2, ph + b * 2, th.page, { shape: 'ellipse', name: 'Photo ring gap' });
  } else {
    box(c, px + b * 1.4, py + b * 1.8, pw, ph, th.shadow, { radius: r, shape: o.mask === 'arch' ? 'arch' : 'rect', name: 'Photo shadow' });
  }
  themePic(c, th, 0, px, py, pw, ph, o.mask, r);
  if (o.badge) {
    const bh = u * 0.07, bw = Math.min(pw * 0.8, u * 0.07 * (o.badge.length * 0.5 + 1.6)), bx = px + u * 0.03, by = py + ph - bh - u * 0.03;
    box(c, bx, by, bw, bh, th.bar, { radius: bh / 2, name: 'Badge' });
    const t = text(c, o.badge, bx + bh * 0.4, 0, bw - bh * 0.8, { font: th.nFont, weight: th.nW, size: bh * 0.5, fill: th.barInk, name: 'Badge text' });
    t.y = by + (bh - t.h) / 2;
  }
  // words
  const left = square || !!o.bullets, align = left ? 'left' as const : 'center' as const;
  const lx = square ? tx : o.bullets ? W * 0.16 : tx, lw = square ? tw : o.bullets ? W * 0.7 : tw;
  let y = ty;
  if (o.label) { const t = text(c, o.label, lx, y, lw, { font: th.kFont[0], weight: 800, size: u * 0.03, fill: th.frame, upper: true, spacing: u * 0.004, align, name: 'Label' }); y = t.y + t.h + u * 0.025; }
  const fs = u * (square ? 0.042 : 0.044);
  o.lines.forEach((line, i) => {
    const lead = o.lead && i === 0, size = lead ? fs * 1.35 : fs;
    if (o.bullets) box(c, lx, y + size * 0.4, size * 0.42, size * 0.42, th.frame, { shape: 'ellipse', name: 'Bullet' });
    const ix = o.bullets ? lx + size * 0.8 : lx;
    const t = text(c, line, ix, y, lw - (ix - lx), { font: th.nFont, weight: lead ? th.nW : 600, size, fill: th.ink, lines: 2, lh: 1.2, align, name: lead ? 'Headline' : 'Detail' });
    y = t.y + t.h + u * (square ? 0.022 : 0.026);
  });
  if (square) footer(c, th, o.footer, H - u * 0.055 - pillH, pillH, W * 0.86);
  else footer(c, th, o.footer, H - u * (tall ? 0.12 : 0.1), pillH, W * 0.76);
}

/** A customer review: quote mark, the words, stars, a round photo, name and role. */
function quote(c: Kit, l: Look, o: { quote: string; name: string; role: string; brand: string }): void {
  const { W, H, u } = c;
  c.bg = l.bg;
  box(c, W * 0.06, H * 0.06, W * 0.88, H * 0.88, '#ffffff', { radius: u * 0.04, shadow: { color: 'rgba(40,30,20,0.10)', blur: u * 0.04, x: 0, y: u * 0.01 }, name: 'Card' });
  const q = text(c, '“', W * 0.3, H * 0.09, W * 0.4, { font: l.tFont[0], weight: 700, size: u * 0.26, fill: l.accent, lh: 0.8, name: 'Quote mark' });
  const t = text(c, o.quote, W * 0.14, q.y + q.h * 0.75, W * 0.72, { font: l.tFont[0], weight: 700, size: u * 0.056, fill: l.ink, lines: 5, lh: 1.25, name: 'Review' });
  const s = text(c, '★★★★★', W * 0.3, t.y + t.h + u * 0.04, W * 0.4, { font: l.bFont, weight: 700, size: u * 0.05, fill: l.accent, spacing: u * 0.01, name: 'Stars' });
  const d = u * 0.15, py = s.y + s.h + u * 0.04;
  box(c, (W - d) / 2 - u * 0.008, py - u * 0.008, d + u * 0.016, d + u * 0.016, l.ring, { shape: 'ellipse', name: 'Photo ring' });
  lookPic(c, l, 0, (W - d) / 2, py, d, d, 'circle');
  const n = text(c, o.name, W * 0.15, py + d + u * 0.025, W * 0.7, { font: l.bFont, weight: 800, size: u * 0.04, fill: l.ink, name: 'Name' });
  text(c, o.role, W * 0.15, n.y + n.h + u * 0.004, W * 0.7, { font: l.bFont, weight: 600, size: u * 0.026, fill: l.muted, upper: true, spacing: u * 0.004, name: 'Role' });
  const bt = text(c, o.brand, W * 0.15, 0, W * 0.7, { font: l.bFont, weight: 700, size: u * 0.024, fill: l.accent, upper: true, spacing: u * 0.006, name: 'Brand' });
  bt.y = H * 0.94 - bt.h - u * 0.03;
}

const PURPLE = ['purple', 'gold', 'white'];
const DUTY: Entry[] = [
  [NAMES[0], 'Monday', '8 PM – 8 AM  ·  Duty phone (555) 010-2024'],
  [NAMES[1], 'Tuesday', '8 PM – 8 AM  ·  Duty phone (555) 010-2024'],
  [NAMES[2], 'Wednesday', '8 PM – 8 AM  ·  Duty phone (555) 010-2024'],
  [NAMES[3], 'Thursday', '8 PM – 8 AM  ·  Duty phone (555) 010-2024'],
  [NAMES[4], 'Friday', '8 PM – 8 AM  ·  Duty phone (555) 010-2024'],
  [NAMES[5], 'Weekend', 'Fri 8 PM – Mon 8 AM  ·  (555) 010-2024'],
];

export const PRO_SETS: { sub: string; label: string; cover: string; list: CollectionTemplate[] }[] = [
  { sub: 'hiring', label: 'Now hiring', cover: 'now-hiring-post', list: [
    tpl('now-hiring-post', 'We’re Hiring Post', 'post', 'social', 'Modern', ['green', 'cream'], 'announcement', ['now hiring', 'we are hiring', 'job opening', 'join our team', 'careers', 'recruiting', 'staff wanted', 'instagram', 'photo'],
      (c) => feature(c, T.forest, { kicker: 'We’re', title: 'Hiring!', sub: 'Green Leaf Café  •  Downtown', mask: 'none', label: 'Open roles', lines: ['Baristas', 'Line Cook', 'Weekend Host'], bullets: true, footer: 'Apply: jobs@greenleaf.cafe' }), T.forest),
    tpl('now-hiring-story', 'Join Our Team Story', 'story', 'social', 'Elegant', ['black', 'gold', 'cream'], 'announcement', ['now hiring', 'join our team', 'careers', 'job opening', 'recruiting', 'story', 'photo'],
      (c) => feature(c, T.luxe, { kicker: 'Join our', title: 'Team', sub: 'Studio North  •  Design & Branding', mask: 'none', label: 'We’re looking for', lines: ['Senior Designer', 'Project Manager', 'Design Intern (summer)'], bullets: true, footer: 'Apply at studionorth.co/jobs' }), T.luxe),
  ] },
  { sub: 'workshop', label: 'Speakers & webinars', cover: 'speaker-lineup-poster', list: [
    tpl('speaker-lineup-poster', 'Speaker Line-up Poster', 'poster', 'poster', 'Minimal', ['white', 'blue', 'navy'], 'event', ['speakers', 'speaker lineup', 'conference', 'summit', 'panel', 'keynote', 'agenda', 'event program', 'circle photos', '6 photos'],
      (c) => circles(c, L.slate, { kicker: 'Meet the speakers', title: 'Design Summit 2027', footer: 'Saturday, March 6  •  Riverside Hall  •  Tickets at designsummit.org' },
        people(['Keynote · 9 AM', 'Branding · 10:30', 'Typography · 11:30', 'UX Research · 1:30', 'Motion · 2:30', 'Closing Panel · 4 PM']), 3, 0.075), T.coral),
    tpl('live-webinar-post', 'Live Webinar Post', 'post', 'social', 'Modern', ['teal', 'yellow', 'white'], 'event', ['webinar', 'live webinar', 'online class', 'workshop', 'masterclass', 'speaker', 'zoom', 'register', 'instagram', 'photo'],
      (c) => feature(c, T.teal, { kicker: 'Free live webinar', title: 'Design Systems 101', sub: 'Thursday, Nov 12  •  1 PM EST', mask: 'circle', label: 'Your host', lines: ['Maya Chen', 'Head of Design, Studio North', '60 minutes + live Q&A'], lead: true, footer: 'Register free · link in bio' }), T.teal),
  ] },
  { sub: 'promotion', label: 'Customer reviews', cover: 'customer-review-post', list: [
    tpl('customer-review-post', 'Customer Review Post', 'post', 'social', 'Elegant', ['cream', 'terracotta'], 'announcement', ['testimonial', 'customer review', 'review', 'happy customer', 'feedback', '5 stars', 'quote', 'small business', 'instagram', 'photo'],
      (c) => quote(c, L.cream, { quote: 'The best haircut I’ve had in years — friendly, on time, and they really listened.', name: 'Sofia Martinez', role: 'Happy client', brand: 'Willow & Co. Salon' }), T.coral),
  ] },
  { sub: 'advertisement', label: 'Real estate', cover: 'just-listed-flyer', list: [
    tpl('just-listed-flyer', 'Just Listed Flyer', 'flyer', 'flyer', 'Elegant', ['black', 'gold', 'cream'], 'announcement', ['just listed', 'real estate', 'house for sale', 'home for sale', 'open house', 'realtor', 'property', 'listing', 'photo'],
      (c) => feature(c, T.luxe, { kicker: 'Just', title: 'Listed', sub: '128 Maple Street  •  Halifax', mask: 'none', badge: '$489,000', lines: ['4 bed  ·  3 bath  ·  2,150 sq ft', 'Open house Saturday, 1 – 3 PM', 'Maya Chen  ·  (555) 010-4455'], footer: 'Book a private showing' }), T.luxe),
    tpl('just-listed-post', 'Just Listed Post', 'post', 'social', 'Modern', ['green', 'cream'], 'announcement', ['just listed', 'real estate', 'home for sale', 'open house', 'realtor', 'property', 'listing', 'instagram', 'photo'],
      (c) => feature(c, T.forest, { kicker: 'Just', title: 'Listed', sub: '128 Maple Street  •  Halifax', mask: 'none', label: 'Home details', lines: ['$489,000', '4 beds  ·  3 baths', '2,150 sq ft', 'Open Sat 1–3 PM'], lead: true, footer: 'Call Maya · (555) 010-4455' }), T.forest),
  ] },
  { sub: 'residence-life', label: 'Residence Life (floor life)', cover: 'ra-floor-meeting-flyer', list: [
    tpl('ra-floor-meeting-flyer', 'Floor Meeting Flyer', 'flyer', 'flyer', 'Bold', PURPLE, 'event', [...RA_TAGS, 'floor meeting', 'house meeting', 'first floor meeting', 'agenda', 'flyer', 'photo'],
      (c) => feature(c, T.reslife, { kicker: 'You’re invited to our', title: 'Floor Meeting', sub: 'Maple Hall  •  Floor 3', mask: 'circle', label: 'What we’ll cover', lines: ['Meet your floor mates', 'Quiet hours & safety', 'Fall events and trips', 'Free pizza 🍕'], bullets: true, footer: 'Sunday, Sept 13  •  8 PM  •  Lounge' }), T.reslife),
    tpl('ra-on-duty-schedule', 'RA On Duty Schedule', 'flyer', 'flyer', 'Modern', PURPLE, 'announcement', [...RA_TAGS, 'ra on duty', 'duty schedule', 'on call', 'rota', 'weekly schedule', 'duty phone', 'flyer', 'photos'],
      (c) => directory(c, T.reslife, { kicker: 'This week’s', title: 'RA On Duty', sub: 'Maple Hall  •  Week of Oct 19', footer: 'Emergency? Call 911 first, then campus safety' }, DUTY), T.reslife),
    tpl('ra-floor-event-story', 'Floor Event Story', 'story', 'social', 'Playful', PURPLE, 'party', [...RA_TAGS, 'floor event', 'movie night', 'hall event', 'social', 'story', 'photo'],
      (c) => feature(c, T.reslife, { kicker: 'Floor 3 presents', title: 'Movie Night', sub: 'Maple Hall Lounge', mask: 'none', badge: 'FREE', lines: ['Friday, Oct 23  ·  9 PM', 'Popcorn, blankets & a cozy pick', 'Bring a friend from your floor!'], lead: true, footer: 'Hosted by your RA' }), T.reslife),
  ] },
];

/** Font weights these templates use beyond the team kits (previews wait for them). */
export const PRO_FONTS: [string, number][] = [['Poppins', 800], ['Poppins', 600], ['Nunito', 600], ['Montserrat', 600], ['Montserrat', 800], ['Playfair Display', 700], ['Inter', 600], ['Inter', 800]];
