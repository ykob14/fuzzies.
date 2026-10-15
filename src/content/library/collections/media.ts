/**
 * Social, video and multi-page templates: YouTube thumbnails, sports (schedule, final score, team photo, player
 * spotlight), presentation decks (6 slides each) and Instagram carousels (5 slides each). Multi-page templates use the
 * kit's `more` pages. Original layouts from editable layers only — shapes, live text, tap-to-fill photo frames.
 */
import { box, lin, text, type CollectionTemplate, type Kit } from './kit';
import { pic } from './teamStyles';
import type { Format } from '../layouts';

const CLEAR = 'rgba(0,0,0,0)';
type Tint = [string, string, string];
const make = (occasion: string) => (id: string, name: string, format: Format, style: string, colors: string[], tags: string[], build: (c: Kit) => void, more?: ((c: Kit) => void)[]): CollectionTemplate =>
  ({ id, name, format, style, colors, occasion, tags, build, more, use: format === 'post' || format === 'story' ? 'social' : undefined });
/** Text centred vertically on `cy`. */
function mid(c: Kit, s: string, x: number, cy: number, w: number, o: Parameters<typeof text>[5]) { const t = text(c, s, x, 0, w, o); t.y = cy - t.h / 2; return t; }

// ============================================================ YouTube thumbnails (16:9)
function ytChallenge(c: Kit): void {
  const { W, H, u } = c, red = '#e63946';
  c.bg = '#ffd23f';
  box(c, W * 0.5, H * 0.07, W * 0.46, H * 0.86, '#ffffff', { radius: u * 0.04, shadow: { color: 'rgba(0,0,0,0.25)', blur: u * 0.03, x: 0, y: u * 0.015 }, name: 'Photo border' });
  pic(c, 'yt-challenge', ['#f4a261', '#ffe8b0', '#2a9d8f'], 0, W * 0.5 + u * 0.022, H * 0.07 + u * 0.022, W * 0.46 - u * 0.044, H * 0.86 - u * 0.044, 'none', u * 0.03);
  box(c, W * 0.05, H * 0.08, u * 0.34, u * 0.09, '#111111', { radius: u * 0.045, name: 'Tag' });
  mid(c, 'New video', W * 0.05, H * 0.08 + u * 0.045, u * 0.34, { font: 'Montserrat', weight: 800, size: u * 0.04, fill: '#ffd23f', upper: true, spacing: u * 0.004, name: 'Tag text' });
  const a = text(c, 'I tried it', W * 0.05, H * 0.24, W * 0.43, { font: 'Anton', weight: 400, size: u * 0.2, fill: '#111111', upper: true, name: 'Title line 1' });
  const by = a.y + a.h + u * 0.02;
  box(c, W * 0.05 - u * 0.015, by, W * 0.43 + u * 0.03, u * 0.24, red, { rotation: -2, name: 'Highlight' });
  mid(c, 'for 30 days', W * 0.05, by + u * 0.12, W * 0.43, { font: 'Anton', weight: 400, size: u * 0.2, fill: '#ffffff', upper: true, name: 'Title line 2' });
  box(c, W * 0.38, H * 0.78, u * 0.2, u * 0.14, red, { shape: 'arrow', rotation: -12, name: 'Arrow' });
}
function ytTopTen(c: Kit): void {
  const { W, H, u } = c, cyan = '#22d3ee', yellow = '#fde047';
  c.bg = lin('#0b1220', '#1e293b', 135);
  const t = text(c, 'Top', W * 0.04, H * 0.06, W * 0.28, { font: 'Bebas Neue', weight: 400, size: u * 0.17, fill: '#ffffff', name: 'Top' });
  text(c, '10', W * 0.02, t.y + t.h - u * 0.05, W * 0.32, { font: 'Anton', weight: 400, size: u * 0.62, fill: cyan, shadow: { color: 'rgba(34,211,238,0.45)', blur: u * 0.06, x: 0, y: 0 }, name: 'Number' });
  const g = text(c, 'Hidden gems', W * 0.35, H * 0.22, W * 0.24, { font: 'Anton', weight: 400, size: u * 0.2, fill: '#ffffff', upper: true, lines: 2, lh: 0.95, align: 'left', name: 'Title' });
  text(c, 'in Portugal', W * 0.35, g.y + g.h + u * 0.02, W * 0.24, { font: 'Caveat', weight: 700, size: u * 0.12, fill: yellow, align: 'left', name: 'Place' });
  const d = u * 0.6, x = W - d - W * 0.045, y = (H - d) / 2;
  box(c, x - u * 0.02, y - u * 0.02, d + u * 0.04, d + u * 0.04, cyan, { shape: 'ellipse', name: 'Photo ring' });
  pic(c, 'yt-gems', ['#2a9d8f', '#cdeee8', '#f4a261'], 1, x, y, d, d, 'circle');
}
function ytRecipe(c: Kit): void {
  const { W, H, u } = c, yellow = '#ffc93c';
  c.bg = '#222222';
  pic(c, 'yt-recipe', ['#d97706', '#fde2b5', '#65a30d'], 2, 0, 0, W, H, 'none');
  box(c, 0, 0, W * 0.62, H, { kind: 'linear', angle: 90, stops: [{ at: 0, color: 'rgba(0,0,0,0.82)' }, { at: 1, color: 'rgba(0,0,0,0)' }] }, { name: 'Shade' });
  const a = text(c, 'Easy', W * 0.05, H * 0.1, W * 0.45, { font: 'Anton', weight: 400, size: u * 0.2, fill: '#ffffff', upper: true, align: 'left', name: 'Line 1' });
  const by = a.y + a.h + u * 0.015;
  box(c, W * 0.05 - u * 0.02, by, W * 0.38, u * 0.25, yellow, { radius: u * 0.02, name: 'Highlight' });
  mid(c, '15-min', W * 0.05, by + u * 0.125, W * 0.36, { font: 'Anton', weight: 400, size: u * 0.21, fill: '#1a1a1a', upper: true, align: 'left', name: 'Line 2' });
  text(c, 'dinner', W * 0.05, by + u * 0.27, W * 0.45, { font: 'Anton', weight: 400, size: u * 0.2, fill: '#ffffff', upper: true, align: 'left', name: 'Line 3' });
  text(c, 'One pan · no stress', W * 0.05, H * 0.86, W * 0.45, { font: 'Montserrat', weight: 800, size: u * 0.05, fill: yellow, upper: true, spacing: u * 0.004, align: 'left', name: 'Note' });
}
function ytTour(c: Kit): void {
  const { W, H, u } = c, coral = '#ff6b5b', yellow = '#ffe066';
  c.bg = coral;
  pic(c, 'yt-tour', ['#9aa5b1', '#eef1f4', '#ff6b5b'], 0, 0, 0, W * 0.55, H, 'none');
  const x = W * 0.6, w = W * 0.36;
  const a = text(c, 'My', x, H * 0.06, w, { font: 'Bebas Neue', weight: 400, size: u * 0.18, fill: '#ffffff', align: 'left', name: 'Line 1' });
  const b = text(c, 'Studio', x, a.y + a.h - u * 0.03, w, { font: 'Bebas Neue', weight: 400, size: u * 0.3, fill: '#ffffff', align: 'left', name: 'Line 2' });
  const t = text(c, 'Tour', x, b.y + b.h - u * 0.05, w, { font: 'Bebas Neue', weight: 400, size: u * 0.3, fill: '#1f1f1f', align: 'left', name: 'Line 3' });
  text(c, 'Everything I use to make videos', x, t.y + t.h + u * 0.01, w, { font: 'Montserrat', weight: 700, size: u * 0.048, fill: '#ffffff', lines: 2, lh: 1.2, align: 'left', name: 'Subtitle' });
  const s = u * 0.3;
  box(c, W * 0.04, H * 0.62, s, s, yellow, { shape: 'burst', rotation: 10, name: 'Burst' });
  mid(c, 'New!', W * 0.04, H * 0.62 + s / 2, s, { font: 'Bebas Neue', weight: 400, size: u * 0.09, fill: '#1f1f1f', name: 'Burst text' });
}

// ============================================================ sports
function schedule(c: Kit): void {
  const { W, H, u } = c, navy = '#0e1a2b', orange = '#f97316', ink = '#ffffff', soft = 'rgba(255,255,255,0.06)';
  c.bg = navy;
  for (let i = 0; i < 3; i++) box(c, 0, u * (0.02 + i * 0.03), W, u * 0.012, orange, { opacity: 1 - i * 0.3, name: 'Stripe' });
  const k = text(c, 'Eastside Eagles Basketball', W * 0.07, u * 0.14, W * 0.86, { font: 'Oswald', weight: 600, size: u * 0.04, fill: orange, upper: true, spacing: u * 0.008, name: 'Team' });
  const t = text(c, '2026–27 Schedule', W * 0.07, k.y + k.h + u * 0.01, W * 0.86, { font: 'Anton', weight: 400, size: u * 0.13, fill: ink, upper: true, name: 'Title' });
  const games: [string, string, boolean, string][] = [
    ['Fri Nov 20', 'Westbrook Wolves', true, '7:00 PM'], ['Tue Nov 24', 'Lakeview Lions', false, '6:30 PM'], ['Fri Dec 4', 'Central Hawks', true, '7:00 PM'],
    ['Sat Dec 12', 'Riverside Rams', false, '2:00 PM'], ['Fri Dec 18', 'Hillcrest Hornets', true, '7:00 PM'], ['Tue Jan 5', 'North Bay Bears', false, '6:30 PM'],
    ['Fri Jan 15', 'Summit Spartans', true, '7:00 PM'], ['Sat Jan 23', 'Oak Park Owls', false, '1:00 PM'], ['Fri Feb 5', 'Westbrook Wolves', false, '7:00 PM'], ['Fri Feb 12', 'Lakeview Lions', true, '7:00 PM'],
  ];
  const top = t.y + t.h + u * 0.06, rh = (H - top - u * 0.2) / games.length, x = W * 0.07, w = W * 0.86;
  games.forEach(([d, o, home, tm], i) => {
    const y = top + i * rh;
    box(c, x, y + rh * 0.08, w, rh * 0.84, i % 2 ? soft : 'rgba(255,255,255,0.1)', { radius: u * 0.015, name: 'Row' });
    mid(c, d, x + w * 0.03, y + rh / 2, w * 0.22, { font: 'Oswald', weight: 600, size: u * 0.03, fill: orange, upper: true, align: 'left', name: 'Date' });
    mid(c, `${home ? 'vs' : '@'} ${o}`, x + w * 0.26, y + rh / 2, w * 0.4, { font: 'Oswald', weight: 600, size: u * 0.034, fill: ink, upper: true, align: 'left', name: 'Opponent' });
    if (home) { box(c, x + w * 0.67, y + rh / 2 - u * 0.022, u * 0.11, u * 0.044, orange, { radius: u * 0.022, name: 'Home tag' }); mid(c, 'Home', x + w * 0.67, y + rh / 2, u * 0.11, { font: 'Montserrat', weight: 800, size: u * 0.018, fill: navy, upper: true, name: 'Home' }); }
    mid(c, tm, x + w * 0.82, y + rh / 2, w * 0.16, { font: 'Oswald', weight: 500, size: u * 0.03, fill: ink, upper: true, align: 'right', name: 'Time' });
  });
  text(c, 'Home games at Eastside Arena · Students free with ID', W * 0.07, H - u * 0.12, W * 0.86, { font: 'Montserrat', weight: 700, size: u * 0.026, fill: 'rgba(255,255,255,0.75)', name: 'Note' });
}
function finalScore(c: Kit): void {
  const { W, H, u } = c, green = '#15803d', ink = '#0f172a';
  c.bg = '#ffffff';
  pic(c, 'sport-score', ['#4d7c0f', '#d9f99d', '#15803d'], 0, 0, 0, W, H * 0.55, 'none');
  box(c, 0, H * 0.55, W, H * 0.45, ink, { name: 'Score panel' });
  box(c, W / 2 - u * 0.12, H * 0.55 - u * 0.04, u * 0.24, u * 0.08, green, { radius: u * 0.04, name: 'Final tag' });
  mid(c, 'Final', W / 2 - u * 0.12, H * 0.55, u * 0.24, { font: 'Montserrat', weight: 900, size: u * 0.035, fill: '#ffffff', upper: true, spacing: u * 0.006, name: 'Final' });
  const cy = H * 0.72;
  mid(c, 'Riverside FC', W * 0.03, cy, W * 0.3, { font: 'Oswald', weight: 700, size: u * 0.06, fill: '#ffffff', upper: true, lines: 2, lh: 1, name: 'Home team' });
  mid(c, '3 – 1', W * 0.33, cy, W * 0.34, { font: 'Anton', weight: 400, size: u * 0.17, fill: '#ffffff', name: 'Score' });
  mid(c, 'North City', W * 0.67, cy, W * 0.3, { font: 'Oswald', weight: 700, size: u * 0.06, fill: 'rgba(255,255,255,0.7)', upper: true, lines: 2, lh: 1, name: 'Away team' });
  text(c, "Goals: Lee 12' · Santos 58' · Okoye 81'", W * 0.06, H * 0.86, W * 0.88, { font: 'Montserrat', weight: 600, size: u * 0.03, fill: '#86efac', name: 'Scorers' });
}
function teamPhoto(c: Kit): void {
  const { W, H, u } = c, red = '#9b1c1c', gold = '#fbbf24';
  c.bg = red;
  const k = text(c, 'Varsity Football', W * 0.07, u * 0.07, W * 0.86, { font: 'Oswald', weight: 600, size: u * 0.04, fill: gold, upper: true, spacing: u * 0.012, name: 'Kicker' });
  const t = text(c, 'Lincoln Lions', W * 0.07, k.y + k.h + u * 0.03, W * 0.86, { font: 'Anton', weight: 400, size: u * 0.15, fill: '#ffffff', upper: true, name: 'Team' });
  const py = t.y + t.h + u * 0.04, ph = (W * 0.86) * 0.6;
  box(c, W * 0.07 - u * 0.012, py - u * 0.012, W * 0.86 + u * 0.024, ph + u * 0.024, '#ffffff', { radius: u * 0.02, name: 'Photo border' });
  pic(c, 'sport-team', ['#7f1d1d', '#fde68a', '#1e3a8a'], 1, W * 0.07, py, W * 0.86, ph, 'none', u * 0.012);
  const s = text(c, '2026 Season Roster', W * 0.07, py + ph + u * 0.05, W * 0.86, { font: 'Oswald', weight: 600, size: u * 0.04, fill: gold, upper: true, spacing: u * 0.008, name: 'Roster title' });
  const names = ['2 · J. Carter', '4 · M. Alvarez', '7 · D. Brooks', '9 · T. Nguyen', '11 · K. Patel', '14 · R. Johnson', '18 · A. Okoye', '21 · L. Smith', '23 · C. Reyes', '27 · B. Walker', '33 · E. Kim', '44 · S. Moore', '52 · N. Davis', '55 · P. Rossi', '68 · G. Howard', '72 · H. Ellis', '77 · F. Grant', '88 · O. Mensah'];
  const cols = 3, cw = (W * 0.86) / cols, rows = Math.ceil(names.length / cols), top = s.y + s.h + u * 0.025, rh = Math.min(u * 0.05, (H - top - u * 0.06) / rows);
  names.forEach((n, i) => text(c, n, W * 0.07 + Math.floor(i / rows) * cw, top + (i % rows) * rh, cw, { font: 'Montserrat', weight: 700, size: u * 0.026, fill: '#ffffff', align: 'left', name: 'Player' }));
}
function spotlight(c: Kit): void {
  const { W, H, u } = c, teal = '#0e7490', yellow = '#fde047';
  c.bg = lin('#0e7490', '#164e63');
  text(c, '12', 0, H * 0.02, W, { font: 'Anton', weight: 400, size: u * 0.8, fill: CLEAR, stroke: ['rgba(255,255,255,0.35)', u * 0.006], name: 'Big number' });
  const k = text(c, 'Player spotlight', W * 0.08, H * 0.06, W * 0.84, { font: 'Montserrat', weight: 800, size: u * 0.045, fill: yellow, upper: true, spacing: u * 0.01, name: 'Kicker' });
  const aw = W * 0.66, ah = H * 0.42, ax = (W - aw) / 2, ay = k.y + k.h + u * 0.08;
  box(c, ax - u * 0.015, ay - u * 0.015, aw + u * 0.03, ah + u * 0.03, '#ffffff', { shape: 'arch', name: 'Photo border' });
  pic(c, 'sport-player', ['#155e75', '#cffafe', '#fde047'], 2, ax, ay, aw, ah, 'arch');
  const n = text(c, 'Maya Torres', W * 0.08, ay + ah + u * 0.07, W * 0.84, { font: 'Anton', weight: 400, size: u * 0.14, fill: '#ffffff', upper: true, name: 'Name' });
  const p = text(c, 'Outside hitter · Senior · #12', W * 0.08, n.y + n.h + u * 0.01, W * 0.84, { font: 'Montserrat', weight: 700, size: u * 0.04, fill: yellow, upper: true, spacing: u * 0.004, name: 'Position' });
  const stats: [string, string][] = [['214', 'Kills'], ['38', 'Aces'], ['156', 'Digs']];
  const sy = p.y + p.h + u * 0.07, sw = W * 0.26, gap = W * 0.04;
  stats.forEach(([v, l], i) => {
    const x = W * 0.07 + i * (sw + gap);
    box(c, x, sy, sw, u * 0.26, 'rgba(255,255,255,0.12)', { radius: u * 0.03, name: 'Stat card' });
    text(c, v, x, sy + u * 0.03, sw, { font: 'Anton', weight: 400, size: u * 0.12, fill: '#ffffff', name: 'Stat' });
    text(c, l, x, sy + u * 0.18, sw, { font: 'Montserrat', weight: 800, size: u * 0.035, fill: yellow, upper: true, spacing: u * 0.004, name: 'Stat label' });
  });
  void teal;
}

// ============================================================ presentation decks (6 slides)
interface Deck { bg: string; dark: string; accent: string; soft: string; ink: string; muted: string; head: [string, number]; body: string; tint: Tint; key: string }
const slideTitle = (c: Kit, D: Deck, kicker: string, title: string, x: number, y: number, w: number, ink = D.ink) => {
  const k = text(c, kicker, x, y, w, { font: D.body, weight: 800, size: c.u * 0.03, fill: D.accent, upper: true, spacing: c.u * 0.006, align: 'left', name: 'Kicker' });
  return text(c, title, x, k.y + k.h + c.u * 0.015, w, { font: D.head[0], weight: D.head[1], size: c.u * 0.085, fill: ink, lines: 3, lh: 1.05, align: 'left', name: 'Slide title' });
};
const pageNo = (c: Kit, D: Deck, n: number) => text(c, String(n).padStart(2, '0'), c.W - c.W * 0.08, c.H - c.u * 0.08, c.W * 0.04, { font: D.body, weight: 800, size: c.u * 0.028, fill: D.muted, align: 'right', name: 'Page number' });

const PITCH: Deck = { bg: '#f7f5f0', dark: '#14213d', accent: '#ff7a59', soft: '#ffe3d9', ink: '#14213d', muted: '#6b7280', head: ['Poppins', 800], body: 'Poppins', tint: ['#4b6584', '#e3e8ef', '#ff7a59'], key: 'deck-pitch' };
const pitch = (D: Deck): [(c: Kit) => void, ((c: Kit) => void)[]] => [
  (c) => { // title
    const { W, H, u } = c;
    c.bg = D.bg;
    box(c, 0, 0, W * 0.46, H, D.dark, { name: 'Panel' });
    pic(c, D.key, D.tint, 0, W * 0.5, H * 0.08, W * 0.46, H * 0.84, 'none', u * 0.03);
    box(c, W * 0.06, H * 0.32, u * 0.1, u * 0.012, D.accent, { name: 'Accent' });
    const t = text(c, 'Brightside', W * 0.06, H * 0.36, W * 0.36, { font: D.head[0], weight: D.head[1], size: u * 0.13, fill: '#ffffff', align: 'left', name: 'Company' });
    text(c, 'Health care that fits in your pocket', W * 0.06, t.y + t.h + u * 0.02, W * 0.34, { font: D.body, weight: 500, size: u * 0.04, fill: 'rgba(255,255,255,0.8)', lines: 2, lh: 1.3, align: 'left', name: 'Tagline' });
    text(c, 'Seed round · 2026', W * 0.06, H * 0.86, W * 0.34, { font: D.body, weight: 700, size: u * 0.028, fill: D.accent, upper: true, spacing: u * 0.006, align: 'left', name: 'Date' });
  },
  [
    (c) => { // problem
      const { W, H, u } = c;
      c.bg = D.bg;
      slideTitle(c, D, 'The problem', 'Booking a doctor still takes 3 phone calls', W * 0.06, H * 0.3, W * 0.4);
      const pts = ['Most clinics still book by phone, open 9 to 5.', 'Patients wait 24 days on average for a visit.', 'One in four appointments is missed or late.'];
      pts.forEach((p, i) => {
        const y = H * 0.18 + i * u * 0.24;
        box(c, W * 0.52, y, u * 0.12, u * 0.12, D.soft, { shape: 'ellipse', name: 'Number circle' });
        mid(c, String(i + 1), W * 0.52, y + u * 0.06, u * 0.12, { font: D.head[0], weight: D.head[1], size: u * 0.06, fill: D.accent, name: 'Number' });
        mid(c, p, W * 0.52 + u * 0.16, y + u * 0.06, W * 0.36, { font: D.body, weight: 600, size: u * 0.05, fill: D.ink, lines: 2, lh: 1.3, align: 'left', name: 'Point' });
      });
      pageNo(c, D, 2);
    },
    (c) => { // solution
      const { W, H, u } = c;
      c.bg = D.bg;
      pic(c, D.key, D.tint, 1, W * 0.06, H * 0.12, W * 0.4, H * 0.76, 'none', u * 0.03);
      const t = slideTitle(c, D, 'Our solution', 'Book, chat and pay in one app', W * 0.52, H * 0.12, W * 0.42);
      [['Book in 30 seconds', 'Real-time openings from 2,000 clinics'], ['Chat with your doctor', 'Quick questions without a visit'], ['Clear prices', 'See the cost before you book']].forEach(([a, b], i) => {
        const y = t.y + t.h + u * 0.07 + i * u * 0.17;
        box(c, W * 0.52, y + u * 0.01, u * 0.016, u * 0.11, D.accent, { radius: u * 0.008, name: 'Bar' });
        const h = text(c, a, W * 0.52 + u * 0.05, y, W * 0.38, { font: D.body, weight: 800, size: u * 0.05, fill: D.ink, align: 'left', name: 'Feature' });
        text(c, b, W * 0.52 + u * 0.05, h.y + h.h + u * 0.005, W * 0.38, { font: D.body, weight: 500, size: u * 0.038, fill: D.muted, align: 'left', name: 'Feature detail' });
      });
      pageNo(c, D, 3);
    },
    (c) => { // traction
      const { W, H, u } = c;
      c.bg = D.dark;
      slideTitle(c, D, 'Traction', 'Growing every month', W * 0.06, H * 0.1, W * 0.88, '#ffffff');
      const stats: [string, string][] = [['48K', 'active patients'], ['$1.2M', 'yearly revenue'], ['4.8★', 'app store rating']];
      const cw = W * 0.27, gap = (W * 0.88 - cw * 3) / 2;
      stats.forEach(([v, l], i) => {
        const x = W * 0.06 + i * (cw + gap), y = H * 0.36;
        box(c, x, y, cw, H * 0.52, 'rgba(255,255,255,0.07)', { radius: u * 0.03, name: 'Stat card' });
        text(c, v, x + cw * 0.08, y + u * 0.1, cw * 0.84, { font: D.head[0], weight: D.head[1], size: u * 0.16, fill: D.accent, name: 'Stat' });
        text(c, l, x, y + u * 0.34, cw, { font: D.body, weight: 600, size: u * 0.05, fill: '#ffffff', name: 'Stat label' });
      });
    },
    (c) => { // team
      const { W, H, u } = c;
      c.bg = D.bg;
      slideTitle(c, D, 'The team', 'Meet the people behind it', W * 0.06, H * 0.1, W * 0.88);
      const ppl: [string, string][] = [['Ava Brooks', 'CEO · former ER nurse'], ['Ken Mori', 'CTO · 10 years in health tech'], ['Lena Ruiz', 'Design · ex-Studio North']];
      const d = u * 0.32, cw = W * 0.88 / 3;
      ppl.forEach(([n, r], i) => {
        const cx = W * 0.06 + i * cw + cw / 2, y = H * 0.4;
        box(c, cx - d / 2 - u * 0.012, y - u * 0.012, d + u * 0.024, d + u * 0.024, D.accent, { shape: 'ellipse', name: 'Photo ring' });
        pic(c, D.key, D.tint, i, cx - d / 2, y, d, d, 'circle');
        const t = text(c, n, cx - cw / 2, y + d + u * 0.05, cw, { font: D.body, weight: 800, size: u * 0.045, fill: D.ink, name: 'Name' });
        text(c, r, cx - cw / 2 + u * 0.03, t.y + t.h + u * 0.005, cw - u * 0.06, { font: D.body, weight: 500, size: u * 0.03, fill: D.muted, name: 'Role' });
      });
      pageNo(c, D, 5);
    },
    (c) => { // thanks
      const { W, H, u } = c;
      c.bg = D.dark;
      box(c, W / 2 - u * 0.06, H * 0.3, u * 0.12, u * 0.012, D.accent, { name: 'Accent' });
      const t = text(c, 'Thank you', W * 0.1, H * 0.35, W * 0.8, { font: D.head[0], weight: D.head[1], size: u * 0.18, fill: '#ffffff', name: 'Thank you' });
      text(c, 'ava@brightside.health  ·  brightside.health', W * 0.1, t.y + t.h + u * 0.04, W * 0.8, { font: D.body, weight: 600, size: u * 0.04, fill: D.accent, name: 'Contact' });
    },
  ],
];
const LESSON: Deck = { bg: '#f3faf6', dark: '#2f6b4f', accent: '#e9a23b', soft: '#dcefe4', ink: '#1f3a2d', muted: '#5f7a6c', head: ['Fredoka', 700], body: 'Nunito', tint: ['#5fa8d3', '#e0f2fb', '#2f6b4f'], key: 'deck-lesson' };
const lesson = (D: Deck): [(c: Kit) => void, ((c: Kit) => void)[]] => [
  (c) => {
    const { W, H, u } = c;
    c.bg = D.dark;
    for (let i = 0; i < 4; i++) box(c, W * (0.66 + i * 0.07), H * (0.12 + (i % 2) * 0.5), u * (0.3 - i * 0.05), u * (0.3 - i * 0.05), 'rgba(255,255,255,0.08)', { shape: 'ellipse', name: 'Bubble' });
    const k = text(c, 'Science · Grade 5', W * 0.07, H * 0.26, W * 0.6, { font: D.body, weight: 800, size: u * 0.04, fill: D.accent, upper: true, spacing: u * 0.008, align: 'left', name: 'Kicker' });
    const t = text(c, 'The Water Cycle', W * 0.07, k.y + k.h + u * 0.02, W * 0.6, { font: D.head[0], weight: D.head[1], size: u * 0.17, fill: '#ffffff', lines: 2, lh: 1, align: 'left', name: 'Lesson title' });
    text(c, 'Ms. Rivera · Room 12', W * 0.07, t.y + t.h + u * 0.04, W * 0.6, { font: D.body, weight: 600, size: u * 0.04, fill: 'rgba(255,255,255,0.8)', align: 'left', name: 'Teacher' });
  },
  [
    (c) => {
      const { W, H, u } = c;
      c.bg = D.bg;
      slideTitle(c, D, 'Today', "What we'll learn", W * 0.07, H * 0.1, W * 0.5);
      const d = u * 0.62;
      box(c, W * 0.93 - d - u * 0.015, H * 0.24 - u * 0.015, d + u * 0.03, d + u * 0.03, D.accent, { shape: 'ellipse', name: 'Photo ring' });
      pic(c, D.key, D.tint, 1, W * 0.93 - d, H * 0.24, d, d, 'circle');
      ['Where rain comes from', 'The four stages of the water cycle', 'Why clouds form', 'How we can save water'].forEach((s, i) => {
        const y = H * 0.4 + i * u * 0.13;
        box(c, W * 0.07, y, u * 0.08, u * 0.08, D.accent, { radius: u * 0.02, name: 'Check box' });
        mid(c, '✓', W * 0.07, y + u * 0.04, u * 0.08, { font: D.body, weight: 800, size: u * 0.05, fill: '#ffffff', name: 'Check' });
        mid(c, s, W * 0.07 + u * 0.12, y + u * 0.04, W * 0.44, { font: D.body, weight: 700, size: u * 0.05, fill: D.ink, align: 'left', name: 'Goal' });
      });
    },
    (c) => {
      const { W, H, u } = c;
      c.bg = D.bg;
      slideTitle(c, D, 'Step by step', 'The four stages', W * 0.07, H * 0.1, W * 0.86);
      const st: [string, string][] = [['Evaporation', 'The sun warms water and it rises as vapour.'], ['Condensation', 'Vapour cools and turns into clouds.'], ['Precipitation', 'Water falls as rain, snow or hail.'], ['Collection', 'Water gathers in rivers, lakes and seas.']];
      const cw = W * 0.86 / 4, cy = H * 0.5, d = u * 0.16;
      box(c, W * 0.07 + cw / 2, cy + d / 2 - u * 0.006, cw * 3, u * 0.012, D.soft, { name: 'Timeline' });
      st.forEach(([a, b], i) => {
        const cx = W * 0.07 + i * cw + cw / 2;
        box(c, cx - d / 2, cy, d, d, i % 2 ? D.accent : D.dark, { shape: 'ellipse', name: 'Step circle' });
        mid(c, String(i + 1), cx - d / 2, cy + d / 2, d, { font: D.head[0], weight: D.head[1], size: u * 0.08, fill: '#ffffff', name: 'Step' });
        const h = text(c, a, cx - cw / 2 + u * 0.01, cy + d + u * 0.04, cw - u * 0.02, { font: D.head[0], weight: D.head[1], size: u * 0.045, fill: D.ink, name: 'Stage' });
        text(c, b, cx - cw / 2 + u * 0.02, h.y + h.h + u * 0.01, cw - u * 0.04, { font: D.body, weight: 600, size: u * 0.038, fill: D.muted, lines: 3, lh: 1.3, name: 'Stage detail' });
      });
      pageNo(c, D, 3);
    },
    (c) => {
      const { W, H, u } = c;
      c.bg = D.bg;
      pic(c, D.key, D.tint, 0, W * 0.5, 0, W * 0.5, H, 'none');
      const t = slideTitle(c, D, 'Did you know?', 'The same water has been here for billions of years', W * 0.07, H * 0.16, W * 0.38);
      text(c, 'The water you drink today may once have been rain in the time of the dinosaurs. It just keeps moving around the cycle!', W * 0.07, t.y + t.h + u * 0.05, W * 0.38, { font: D.body, weight: 600, size: u * 0.036, fill: D.muted, lines: 6, lh: 1.45, align: 'left', name: 'Fact' });
      pageNo(c, D, 4);
    },
    (c) => {
      const { W, H, u } = c;
      c.bg = D.soft;
      const k = text(c, 'Quick quiz', W * 0.1, H * 0.12, W * 0.8, { font: D.body, weight: 800, size: u * 0.035, fill: D.accent, upper: true, spacing: u * 0.008, name: 'Kicker' });
      const q = text(c, 'What do we call water falling from clouds?', W * 0.1, k.y + k.h + u * 0.02, W * 0.8, { font: D.head[0], weight: D.head[1], size: u * 0.08, fill: D.ink, lines: 2, lh: 1.1, name: 'Question' });
      ['A · Evaporation', 'B · Precipitation', 'C · Collection'].forEach((a, i) => {
        const y = q.y + q.h + u * 0.08 + i * u * 0.16, w = W * 0.56;
        box(c, (W - w) / 2, y, w, u * 0.13, i === 1 ? D.dark : '#ffffff', { radius: u * 0.065, name: 'Answer' });
        mid(c, a, (W - w) / 2, y + u * 0.065, w, { font: D.body, weight: 800, size: u * 0.055, fill: i === 1 ? '#ffffff' : D.ink, name: 'Answer text' });
      });
    },
    (c) => {
      const { W, H, u } = c;
      c.bg = D.dark;
      const t = text(c, 'Great job, scientists!', W * 0.1, H * 0.3, W * 0.8, { font: D.head[0], weight: D.head[1], size: u * 0.14, fill: '#ffffff', lines: 2, lh: 1.05, name: 'Title' });
      text(c, 'Homework: draw the water cycle in your notebook', W * 0.1, t.y + t.h + u * 0.05, W * 0.8, { font: D.body, weight: 700, size: u * 0.045, fill: D.accent, name: 'Homework' });
    },
  ],
];

// ============================================================ Instagram carousels (5 slides)
interface Caro { bg: string; ink: string; accent: string; soft: string; head: [string, number]; body: string; handle: string }
const dots = (c: Kit, C: Caro, i: number, n: number) => {
  const d = c.u * 0.016, gap = c.u * 0.012, w = n * d + (n - 1) * gap;
  for (let k = 0; k < n; k++) box(c, (c.W - w) / 2 + k * (d + gap), c.H - c.u * 0.06, d, d, k === i ? C.accent : C.soft, { shape: 'ellipse', name: 'Page dot' });
};
const handle = (c: Kit, C: Caro) => text(c, C.handle, c.W * 0.06, c.u * 0.05, c.W * 0.6, { font: C.body, weight: 700, size: c.u * 0.03, fill: C.ink, align: 'left', name: 'Handle' });
function caroCover(c: Kit, C: Caro, kicker: string, title: string, n: number): void {
  const { W, H, u } = c;
  c.bg = C.bg;
  handle(c, C);
  box(c, W * 0.66, -u * 0.14, u * 0.5, u * 0.5, C.soft, { shape: 'ellipse', name: 'Circle' });
  const k = text(c, kicker, W * 0.06, H * 0.26, W * 0.8, { font: C.body, weight: 800, size: u * 0.04, fill: C.accent, upper: true, spacing: u * 0.008, align: 'left', name: 'Kicker' });
  const ty = k.y + k.h + u * 0.02;
  text(c, title, W * 0.06, ty, W * 0.86, { font: C.head[0], weight: C.head[1], size: u * 0.13, fill: C.ink, lines: 4, lh: 1.02, maxH: H * 0.78 - ty, align: 'left', name: 'Title' });
  box(c, W * 0.06, H * 0.82, u * 0.3, u * 0.08, C.ink, { radius: u * 0.04, name: 'Swipe pill' });
  mid(c, 'Swipe →', W * 0.06, H * 0.82 + u * 0.04, u * 0.3, { font: C.body, weight: 800, size: u * 0.034, fill: C.bg, name: 'Swipe' });
  dots(c, C, 0, n);
}
function caroTip(c: Kit, C: Caro, i: number, n: number, title: string, body: string): void {
  const { W, H, u } = c;
  c.bg = C.bg;
  handle(c, C);
  text(c, String(i).padStart(2, '0'), W * 0.06, H * 0.16, W * 0.5, { font: C.head[0], weight: C.head[1], size: u * 0.3, fill: C.soft, align: 'left', name: 'Big number' });
  const t = text(c, title, W * 0.06, H * 0.46, W * 0.86, { font: C.head[0], weight: C.head[1], size: u * 0.085, fill: C.ink, lines: 3, lh: 1.05, align: 'left', name: 'Tip title' });
  box(c, W * 0.06, t.y + t.h + u * 0.035, u * 0.1, u * 0.012, C.accent, { name: 'Rule' });
  text(c, body, W * 0.06, t.y + t.h + u * 0.08, W * 0.84, { font: C.body, weight: 600, size: u * 0.042, fill: C.ink, lines: 4, lh: 1.4, align: 'left', name: 'Tip' });
  dots(c, C, i, n);
}
function caroEnd(c: Kit, C: Caro, title: string, line: string, n: number): void {
  const { W, H, u } = c;
  c.bg = C.ink;
  const s = u * 0.2;
  box(c, (W - s * 0.75) / 2, H * 0.2, s * 0.75, s, C.accent, { shape: 'rect', radius: u * 0.02, name: 'Bookmark' });
  box(c, (W - s * 0.75) / 2 + s * 0.375 - s * 0.15, H * 0.2 + s * 0.72, s * 0.3, s * 0.3, C.ink, { shape: 'diamond', name: 'Bookmark notch' });
  const t = text(c, title, W * 0.08, H * 0.2 + s + u * 0.08, W * 0.84, { font: C.head[0], weight: C.head[1], size: u * 0.1, fill: '#ffffff', lines: 2, lh: 1.05, name: 'Title' });
  const l = text(c, line, W * 0.1, t.y + t.h + u * 0.04, W * 0.8, { font: C.body, weight: 600, size: u * 0.04, fill: C.soft, lines: 2, lh: 1.35, name: 'Line' });
  text(c, C.handle, W * 0.1, Math.max(H * 0.84, l.y + l.h + u * 0.03), W * 0.8, { font: C.body, weight: 800, size: u * 0.04, fill: C.accent, name: 'Handle' });
  dots(c, { ...C, soft: 'rgba(255,255,255,0.3)' }, n - 1, n);
}
const SLEEP: Caro = { bg: '#fdf6ee', ink: '#1e2a4a', accent: '#f08a5d', soft: '#f6dccb', head: ['DM Serif Display', 400], body: 'Poppins', handle: '@calmhabits' };
const BIZ: Caro = { bg: '#eef6f3', ink: '#0f3d3e', accent: '#16a34a', soft: '#cfe8df', head: ['Space Grotesk', 700], body: 'Inter', handle: '@smallbizclub' };

// ============================================================ sets
const ytT = make('video');
const sportT = make('sports');
const deckT = make('presentation');
const caroT = make('social');
const YT = ['youtube', 'thumbnail', 'youtube thumbnail', 'video', 'vlog', 'creator', 'channel'];
const DECK = ['presentation', 'slides', 'slide deck', 'deck', 'powerpoint', 'keynote', 'google slides', 'multi page'];
const CARO = ['carousel', 'instagram carousel', 'instagram', 'swipe', 'slides', 'tips', 'educational post', 'multi page'];
const [pitch1, pitchMore] = pitch(PITCH);
const [lesson1, lessonMore] = lesson(LESSON);

export const MEDIA_SETS: { sub: string; label: string; cover: string; list: CollectionTemplate[] }[] = [
  { sub: 'youtube', label: 'YouTube & Video', cover: 'yt-30-day-challenge', list: [
    ytT('yt-30-day-challenge', '30-Day Challenge Thumbnail', 'landscape', 'Bold', ['yellow', 'red', 'black'], [...YT, 'challenge', 'experiment', 'photo'], ytChallenge),
    ytT('yt-top-10-travel', 'Top 10 Travel Thumbnail', 'landscape', 'Bold', ['navy', 'cyan', 'yellow'], [...YT, 'top 10', 'list', 'travel', 'photo'], ytTopTen),
    ytT('yt-quick-recipe', 'Quick Recipe Thumbnail', 'landscape', 'Bold', ['black', 'yellow'], [...YT, 'recipe', 'cooking', 'food', 'photo'], ytRecipe),
    ytT('yt-studio-tour', 'Studio Tour Thumbnail', 'landscape', 'Playful', ['coral', 'yellow'], [...YT, 'tour', 'room tour', 'setup', 'photo'], ytTour),
  ] },
  { sub: 'basketball', label: 'Basketball', cover: 'season-schedule-poster', list: [
    sportT('season-schedule-poster', 'Season Schedule Poster', 'poster', 'Sporty', ['navy', 'orange'], ['schedule', 'game schedule', 'season schedule', 'fixtures', 'basketball', 'team', 'sports'], schedule),
  ] },
  { sub: 'soccer', label: 'Soccer', cover: 'final-score-post', list: [
    sportT('final-score-post', 'Final Score Post', 'post', 'Sporty', ['green', 'navy'], ['final score', 'score', 'result', 'match result', 'game day', 'soccer', 'football', 'photo'], finalScore),
  ] },
  { sub: 'football', label: 'Football', cover: 'team-photo-roster', list: [
    sportT('team-photo-roster', 'Team Photo & Roster', 'poster', 'Sporty', ['red', 'gold'], ['team photo', 'roster', 'team roster', 'season', 'football', 'varsity', 'photo'], teamPhoto),
  ] },
  { sub: 'volleyball', label: 'Volleyball', cover: 'player-spotlight-story', list: [
    sportT('player-spotlight-story', 'Player Spotlight Story', 'story', 'Sporty', ['teal', 'yellow'], ['player spotlight', 'athlete', 'senior night', 'stats', 'volleyball', 'sports', 'photo'], spotlight),
  ] },
  { sub: 'presentation', label: 'Presentations', cover: 'startup-pitch-deck', list: [
    deckT('startup-pitch-deck', 'Startup Pitch Deck', 'slides', 'Modern', ['navy', 'coral', 'cream'], [...DECK, 'pitch deck', 'startup', 'investor', 'business plan', 'team', 'photo'], pitch1, pitchMore),
    deckT('water-cycle-lesson', 'Science Lesson Slides', 'slides', 'Playful', ['green', 'yellow'], [...DECK, 'lesson', 'class', 'teacher', 'school', 'science', 'quiz', 'education'], lesson1, lessonMore),
  ] },
  { sub: 'carousel', label: 'Instagram Carousels', cover: 'sleep-tips-carousel', list: [
    caroT('sleep-tips-carousel', 'Better Sleep Tips Carousel', 'post', 'Elegant', ['cream', 'navy', 'peach'], [...CARO, 'wellness', 'health', 'sleep', 'self care'],
      (c) => caroCover(c, SLEEP, '3 easy habits', 'Sleep better starting tonight', 5),
      [(c) => caroTip(c, SLEEP, 1, 5, 'Keep the same bedtime', 'Going to bed at the same time every night sets your body clock — even on weekends.'),
        (c) => caroTip(c, SLEEP, 2, 5, 'Dim the screens', 'Put your phone away 30 minutes before bed. Read a book or stretch instead.'),
        (c) => caroTip(c, SLEEP, 3, 5, 'Cool, dark and quiet', 'A cool room (about 65°F / 18°C), dark curtains and a little white noise help you drift off.'),
        (c) => caroEnd(c, SLEEP, 'Save this for tonight', 'Share it with a friend who needs more rest', 5)]),
    caroT('small-business-launch-carousel', 'Small Business Launch Carousel', 'post', 'Modern', ['mint', 'green', 'teal'], [...CARO, 'small business', 'entrepreneur', 'launch', 'checklist', 'marketing'],
      (c) => caroCover(c, BIZ, 'Launching soon?', 'Your small business launch checklist', 5),
      [(c) => caroTip(c, BIZ, 1, 5, 'Claim your name everywhere', 'Grab the same handle on Instagram, TikTok and your website before you announce.'),
        (c) => caroTip(c, BIZ, 2, 5, 'Tease it for two weeks', 'Share behind-the-scenes posts and a countdown so people are ready on day one.'),
        (c) => caroTip(c, BIZ, 3, 5, 'Give a launch-day reason', 'A small gift, discount or giveaway turns followers into first customers.'),
        (c) => caroEnd(c, BIZ, 'Follow for more tips', 'New small business ideas every week', 5)]),
  ] },
];

export const MEDIA_FONTS: [string, number][] = [
  ['Anton', 400], ['Bebas Neue', 400], ['Montserrat', 600], ['Montserrat', 700], ['Montserrat', 800], ['Montserrat', 900], ['Oswald', 500], ['Oswald', 600], ['Oswald', 700], ['Caveat', 700],
  ['Poppins', 500], ['Poppins', 600], ['Poppins', 700], ['Poppins', 800], ['Fredoka', 700], ['Nunito', 600], ['Nunito', 700], ['Nunito', 800], ['DM Serif Display', 400], ['Space Grotesk', 700], ['Inter', 600], ['Inter', 700], ['Inter', 800],
];
