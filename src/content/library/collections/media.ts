/**
 * Social, video and multi-page templates: YouTube thumbnails, sports (schedule, final score, team photo, player
 * spotlight), presentation decks (6 slides each, every slide its own layout — charts and diagrams drawn from shapes)
 * and Instagram carousels (5 slides each, three tip layouts). Multi-page templates use the kit's `more` pages.
 * Original layouts from editable layers only — shapes, live text, drawn art (bz-/ic-) and tap-to-fill photo frames.
 */
import { art, box, lin, text, type CollectionTemplate, type Kit } from './kit';
import { pic } from './teamStyles';
import { bz } from './business';
import { photoAsset, widthOf, type Format } from '../layouts';
import type { Palette } from '../palettes';
import type { Fill, Shadow } from '../../../editor/types';
import { makeImage } from '../../../editor/doc';

const CLEAR = 'rgba(0,0,0,0)';
type Tint = [string, string, string];
const make = (occasion: string) => (id: string, name: string, format: Format, style: string, colors: string[], tags: string[], build: (c: Kit) => void, more?: ((c: Kit) => void)[]): CollectionTemplate =>
  ({ id, name, format, style, colors, occasion, tags, build, more, use: format === 'post' || format === 'story' ? 'social' : undefined });
/** Text centred vertically on `cy`. */
function mid(c: Kit, s: string, x: number, cy: number, w: number, o: Parameters<typeof text>[5]) { const t = text(c, s, x, 0, w, o); t.y = cy - t.h / 2; return t; }
const rule = (c: Kit, x: number, y: number, w: number, color: Fill, t = c.u * 0.003) => box(c, x, y, w, t, color, { name: 'Line' });

/** A photo slot (tap to fill). `mark: false` = no picture glyph (full-bleed backgrounds under words). */
function photo(c: Kit, key: string, tint: Tint, i: number, x: number, y: number, w: number, h: number, o: { mask?: 'none' | 'circle' | 'arch'; radius?: number; mark?: boolean; stroke?: [string, number]; rot?: number; shadow?: Shadow } = {}): void {
  const mark = o.mark ?? true, id = `ph-${key}-${i % 3}${mark ? '' : '-plain'}`;
  c.assets[id] ??= photoAsset({ id: key, primary: tint[0], secondary: tint[1], accent: tint[2] } as Palette, i % 3, mark);
  const el = makeImage(id, w, h, { mask: o.mask ?? 'none', radius: o.radius ?? 0, stroke: o.stroke?.[0] ?? '#ffffff', strokeWidth: o.stroke?.[1] ?? 0 });
  Object.assign(el, { x, y, w, h, rotation: o.rot ?? 0, name: 'Photo — tap to add yours' });
  if (o.shadow) el.shadow = o.shadow;
  c.els.push(el);
}
const hard = (u: number, a = 0.35): Shadow => ({ color: `rgba(0,0,0,${a})`, blur: u * 0.025, x: 0, y: u * 0.012 });

// ============================================================ YouTube thumbnails (16:9)
/** Two photos (day 1 / day 30) with a hand-drawn arrow between them, the promise in huge type. */
function ytChallenge(c: Kit): void {
  const { W, H, u } = c, red = '#e63946', ink = '#111111';
  c.bg = '#ffd23f';
  const a = text(c, 'I tried it', W * 0.045, H * 0.15, W * 0.44, { font: 'Anton', weight: 400, size: u * 0.22, fill: ink, upper: true, align: 'left', name: 'Title line 1' });
  const by = a.y + a.h + u * 0.01, bw = W * 0.44, bh = u * 0.25;
  box(c, W * 0.035, by, bw, bh, red, { rotation: -3, shadow: hard(u, 0.25), name: 'Highlight' });
  mid(c, 'for 30 days', W * 0.035, by + bh / 2, bw, { font: 'Anton', weight: 400, size: u * 0.2, fill: '#ffffff', upper: true, name: 'Title line 2' });
  const sb = by + bh + u * 0.07, sw = widthOf('HERE’S WHAT CHANGED', 'Montserrat', 900, u * 0.052) + u * 0.08;
  box(c, W * 0.045, sb, sw, u * 0.11, ink, { radius: u * 0.02, name: 'Subtitle box' });
  mid(c, 'Here’s what changed', W * 0.045, sb + u * 0.055, sw, { font: 'Montserrat', weight: 900, size: u * 0.052, fill: '#ffd23f', upper: true, name: 'Subtitle' });
  const pw = W * 0.24, ph = H * 0.6, ty: Tint = ['#f4a261', '#ffe8b0', '#2a9d8f'];
  photo(c, 'yt-challenge', ty, 0, W * 0.5, H * 0.24, pw, ph, { stroke: ['#ffffff', u * 0.018], rot: -5, shadow: hard(u) });
  photo(c, 'yt-challenge', ty, 1, W * 0.73, H * 0.14, pw, ph, { stroke: ['#ffffff', u * 0.018], rot: 4, shadow: hard(u) });
  for (const [s, x, y, r] of [['Day 1', W * 0.52, H * 0.78, -5], ['Day 30', W * 0.79, H * 0.68, 4]] as const) {
    box(c, x, y, u * 0.24, u * 0.09, ink, { radius: u * 0.045, rotation: r, name: 'Label' });
    mid(c, s, x, y + u * 0.045, u * 0.24, { font: 'Anton', weight: 400, size: u * 0.055, fill: '#ffd23f', upper: true, spacing: u * 0.004, name: 'Label text' });
  }
}
/** A giant glowing number, the topic stacked beside it, a slanted photo on the right. */
function ytTopTen(c: Kit): void {
  const { W, H, u } = c, cyan = '#22d3ee', yellow = '#fde047', navy = '#0b1220';
  c.bg = navy;
  photo(c, 'yt-gems', ['#2a9d8f', '#cdeee8', '#f4a261'], 1, W * 0.5, 0, W * 0.5, H, { mark: true });
  box(c, W * 0.42, -H * 0.1, W * 0.14, H * 1.2, navy, { rotation: 8, name: 'Slant' });
  box(c, W * 0.56 - u * 0.01, -H * 0.1, u * 0.02, H * 1.2, cyan, { rotation: 8, name: 'Slant line' });
  const n = text(c, '10', W * 0.02, 0, W * 0.25, { font: 'Anton', weight: 400, size: u * 0.7, fill: cyan, shadow: { color: 'rgba(34,211,238,0.55)', blur: u * 0.06, x: 0, y: 0 }, name: 'Number' });
  n.y = H / 2 - n.h / 2;
  const x = W * 0.285, w = W * 0.23;
  const k = text(c, 'Top', x, H * 0.18, w, { font: 'Anton', weight: 400, size: u * 0.09, fill: cyan, upper: true, spacing: u * 0.01, align: 'left', name: 'Top' });
  const g = text(c, 'Hidden gems', x, k.y + k.h, w, { font: 'Anton', weight: 400, size: u * 0.2, fill: '#ffffff', upper: true, lines: 2, lh: 0.95, align: 'left', name: 'Title' });
  text(c, 'in Portugal', x, g.y + g.h + u * 0.01, w, { font: 'Caveat', weight: 700, size: u * 0.12, fill: yellow, align: 'left', name: 'Place' });
}
/** The dish on a big round plate, three stacked words with one in a highlight, a round sticker. */
function ytRecipe(c: Kit): void {
  const { W, H, u } = c, yellow = '#ffc93c', ink = '#1a1a1a', red = '#e63946';
  c.bg = '#1f1a17';
  const d = u * 1.02, px = W - d * 0.82, py = (H - d) / 2;
  box(c, px - u * 0.03, py - u * 0.03, d + u * 0.06, d + u * 0.06, '#f3ede4', { shape: 'ellipse', shadow: hard(u, 0.5), name: 'Plate' });
  photo(c, 'yt-recipe', ['#d97706', '#fde2b5', '#65a30d'], 2, px, py, d, d, { mask: 'circle' });
  const x = W * 0.05, w = W * 0.46;
  const a = text(c, 'Easy', x, H * 0.08, w, { font: 'Anton', weight: 400, size: u * 0.2, fill: '#ffffff', upper: true, align: 'left', name: 'Line 1' });
  const by = a.y + a.h + u * 0.01, hw = widthOf('15-MIN', 'Anton', 400, u * 0.24) + u * 0.08;
  box(c, x - u * 0.02, by, hw, u * 0.29, yellow, { radius: u * 0.02, rotation: -2, name: 'Highlight' });
  mid(c, '15-min', x + u * 0.02, by + u * 0.145, hw - u * 0.04, { font: 'Anton', weight: 400, size: u * 0.24, fill: ink, upper: true, align: 'left', name: 'Line 2' });
  text(c, 'Dinner', x, by + u * 0.3, w, { font: 'Anton', weight: 400, size: u * 0.2, fill: '#ffffff', upper: true, align: 'left', name: 'Line 3' });
  const s = u * 0.25, sx = W * 0.47, sy = H * 0.66;
  box(c, sx, sy, s, s, red, { shape: 'burst', rotation: 12, name: 'Sticker' });
  mid(c, 'One pan!', sx + s * 0.12, sy + s / 2, s * 0.76, { font: 'Anton', weight: 400, size: u * 0.05, fill: '#ffffff', upper: true, lines: 2, lh: 0.95, name: 'Sticker text' });
}
/** A tilted photo of the set-up with a camera drawing, the title in three stacked words. */
function ytTour(c: Kit): void {
  const { W, H, u } = c, coral = '#ff6b5b', ink = '#1f1f1f';
  c.bg = coral;
  box(c, 0, 0, W * 0.58, H, '#ffe066', { name: 'Panel' });
  photo(c, 'yt-tour', ['#9aa5b1', '#eef1f4', '#ff6b5b'], 0, W * 0.05, H * 0.1, W * 0.46, H * 0.74, { stroke: ['#ffffff', u * 0.02], rot: -4, shadow: hard(u) });
  bz(c, 'bz-camera', W * 0.37, H * 0.6, u * 0.36, [ink, '#4cc9f0'], { rot: 8, name: 'Camera' });
  const x = W * 0.62, w = W * 0.34;
  const a = text(c, 'My', x, H * 0.07, w, { font: 'Bebas Neue', weight: 400, size: u * 0.17, fill: '#ffffff', align: 'left', name: 'Line 1' });
  const b = text(c, 'Studio', x, a.y + a.h - u * 0.035, w, { font: 'Bebas Neue', weight: 400, size: u * 0.3, fill: '#ffffff', align: 'left', shadow: hard(u, 0.2), name: 'Line 2' });
  const t = text(c, 'Tour', x, b.y + b.h - u * 0.06, w, { font: 'Bebas Neue', weight: 400, size: u * 0.3, fill: ink, align: 'left', name: 'Line 3' });
  text(c, 'Everything I use to film', x, t.y + t.h, w, { font: 'Bebas Neue', weight: 400, size: u * 0.075, fill: '#ffffff', lines: 2, lh: 1, align: 'left', name: 'Subtitle' });
}

// ============================================================ sports
function schedule(c: Kit): void {
  const { W, H, u } = c, navy = '#0e1a2b', orange = '#f97316', ink = '#ffffff', soft = 'rgba(255,255,255,0.06)';
  c.bg = navy;
  for (let i = 0; i < 3; i++) box(c, 0, u * (0.02 + i * 0.03), W, u * 0.012, orange, { opacity: 1 - i * 0.3, name: 'Stripe' });
  const ball = u * 0.2;
  art(c, 'ic-basketball', W * 0.93 - ball, u * 0.14, ball, { h: ball, colors: [orange, navy], name: 'Basketball' });
  const k = text(c, 'Eastside Eagles Basketball', W * 0.07, u * 0.15, W * 0.62, { font: 'Oswald', weight: 600, size: u * 0.04, fill: orange, upper: true, spacing: u * 0.008, align: 'left', name: 'Team' });
  const t = text(c, '2026–27 Schedule', W * 0.07, k.y + k.h + u * 0.005, W * 0.66, { font: 'Anton', weight: 400, size: u * 0.13, fill: ink, upper: true, align: 'left', name: 'Title' });
  const games: [string, string, boolean, string][] = [
    ['Fri Nov 20', 'Westbrook Wolves', true, '7:00 PM'], ['Tue Nov 24', 'Lakeview Lions', false, '6:30 PM'], ['Fri Dec 4', 'Central Hawks', true, '7:00 PM'],
    ['Sat Dec 12', 'Riverside Rams', false, '2:00 PM'], ['Fri Dec 18', 'Hillcrest Hornets', true, '7:00 PM'], ['Tue Jan 5', 'North Bay Bears', false, '6:30 PM'],
    ['Fri Jan 15', 'Summit Spartans', true, '7:00 PM'], ['Sat Jan 23', 'Oak Park Owls', false, '1:00 PM'], ['Fri Feb 5', 'Westbrook Wolves', false, '7:00 PM'], ['Fri Feb 12', 'Lakeview Lions', true, '7:00 PM'],
  ];
  const top = t.y + t.h + u * 0.06, rh = (H - top - u * 0.2) / games.length, x = W * 0.07, w = W * 0.86;
  games.forEach(([d, o, home, tm], i) => {
    const y = top + i * rh;
    box(c, x, y + rh * 0.08, w, rh * 0.84, i % 2 ? soft : 'rgba(255,255,255,0.1)', { radius: u * 0.015, name: 'Row' });
    if (home) box(c, x, y + rh * 0.08, u * 0.008, rh * 0.84, orange, { name: 'Home marker' });
    mid(c, d, x + w * 0.03, y + rh / 2, w * 0.22, { font: 'Oswald', weight: 600, size: u * 0.032, fill: orange, upper: true, align: 'left', name: 'Date' });
    mid(c, `${home ? 'vs' : '@'} ${o}`, x + w * 0.26, y + rh / 2, w * 0.4, { font: 'Oswald', weight: 600, size: u * 0.036, fill: ink, upper: true, align: 'left', name: 'Opponent' });
    if (home) { box(c, x + w * 0.66, y + rh / 2 - u * 0.024, u * 0.13, u * 0.048, orange, { radius: u * 0.024, name: 'Home tag' }); mid(c, 'Home', x + w * 0.66, y + rh / 2, u * 0.13, { font: 'Oswald', weight: 600, size: u * 0.026, fill: navy, upper: true, spacing: u * 0.003, name: 'Home' }); }
    mid(c, tm, x + w * 0.8, y + rh / 2, w * 0.17, { font: 'Oswald', weight: 500, size: u * 0.032, fill: ink, upper: true, align: 'right', name: 'Time' });
  });
  text(c, 'Home games at Eastside Arena · Students free with ID', W * 0.07, H - u * 0.12, W * 0.86, { font: 'Oswald', weight: 500, size: u * 0.03, fill: 'rgba(255,255,255,0.8)', upper: true, spacing: u * 0.004, name: 'Note' });
}
/** Match photo on top, a scoreboard below: two crests, the score, scorers and the date. */
function finalScore(c: Kit): void {
  const { W, H, u } = c, green = '#16a34a', ink = '#0f172a';
  c.bg = ink;
  photo(c, 'sport-score', ['#4d7c0f', '#d9f99d', '#15803d'], 0, 0, 0, W, H * 0.5);
  box(c, W / 2 - u * 0.13, H * 0.5 - u * 0.042, u * 0.26, u * 0.084, green, { radius: u * 0.042, name: 'Final tag' });
  mid(c, 'Full time', W / 2 - u * 0.13, H * 0.5, u * 0.26, { font: 'Oswald', weight: 700, size: u * 0.036, fill: '#ffffff', upper: true, spacing: u * 0.006, name: 'Final' });
  const cy = H * 0.68, cr = u * 0.13;
  ([['RFC', W * 0.16, '#ffffff', ink], ['NC', W * 0.84, '#334155', '#ffffff']] as const).forEach(([s, x, f, t]) => {
    box(c, x - cr / 2, cy - cr / 2 - u * 0.02, cr, cr, f, { shape: 'ellipse', name: 'Crest' });
    mid(c, s, x - cr / 2, cy - u * 0.02, cr, { font: 'Oswald', weight: 700, size: u * 0.045, fill: t, name: 'Crest text' });
  });
  mid(c, 'Riverside FC', W * 0.02, cy + cr / 2 + u * 0.04, W * 0.28, { font: 'Oswald', weight: 600, size: u * 0.036, fill: '#ffffff', upper: true, name: 'Home team' });
  mid(c, 'North City', W * 0.7, cy + cr / 2 + u * 0.04, W * 0.28, { font: 'Oswald', weight: 600, size: u * 0.036, fill: 'rgba(255,255,255,0.75)', upper: true, name: 'Away team' });
  mid(c, '3 – 1', W * 0.3, cy, W * 0.4, { font: 'Anton', weight: 400, size: u * 0.2, fill: '#ffffff', name: 'Score' });
  text(c, "Lee 12' · Santos 58' · Okoye 81'", W * 0.08, H * 0.86, W * 0.84, { font: 'Oswald', weight: 500, size: u * 0.034, fill: '#86efac', spacing: u * 0.002, name: 'Scorers' });
  text(c, 'Sat, Nov 14 · Riverside Park', W * 0.08, H * 0.91, W * 0.84, { font: 'Oswald', weight: 500, size: u * 0.03, fill: 'rgba(255,255,255,0.65)', upper: true, spacing: u * 0.006, name: 'Date' });
}
function teamPhoto(c: Kit): void {
  const { W, H, u } = c, red = '#9b1c1c', gold = '#fbbf24';
  c.bg = red;
  const k = text(c, 'Varsity Football', W * 0.07, u * 0.07, W * 0.86, { font: 'Oswald', weight: 600, size: u * 0.04, fill: gold, upper: true, spacing: u * 0.012, name: 'Kicker' });
  const t = text(c, 'Lincoln Lions', W * 0.07, k.y + k.h + u * 0.02, W * 0.86, { font: 'Anton', weight: 400, size: u * 0.15, fill: '#ffffff', upper: true, name: 'Team' });
  const py = t.y + t.h + u * 0.04, ph = (W * 0.86) * 0.6;
  photo(c, 'sport-team', ['#7f1d1d', '#fde68a', '#1e3a8a'], 1, W * 0.07, py, W * 0.86, ph, { radius: u * 0.012, stroke: ['#ffffff', u * 0.012] });
  const s = text(c, '2026 Season Roster', W * 0.07, py + ph + u * 0.05, W * 0.86, { font: 'Oswald', weight: 600, size: u * 0.04, fill: gold, upper: true, spacing: u * 0.008, name: 'Roster title' });
  const names = ['2 · J. Carter', '4 · M. Alvarez', '7 · D. Brooks', '9 · T. Nguyen', '11 · K. Patel', '14 · R. Johnson', '18 · A. Okoye', '21 · L. Smith', '23 · C. Reyes', '27 · B. Walker', '33 · E. Kim', '44 · S. Moore', '52 · N. Davis', '55 · P. Rossi', '68 · G. Howard', '72 · H. Ellis', '77 · F. Grant', '88 · O. Mensah'];
  const cols = 3, cw = (W * 0.86) / cols, rows = Math.ceil(names.length / cols), top = s.y + s.h + u * 0.03, rh = Math.min(u * 0.052, (H - top - u * 0.06) / rows);
  names.forEach((n, i) => text(c, n, W * 0.07 + Math.floor(i / rows) * cw, top + (i % rows) * rh, cw, { font: 'Oswald', weight: 500, size: u * 0.03, fill: '#ffffff', align: 'left', name: 'Player' }));
}
function spotlight(c: Kit): void {
  const { W, H, u } = c, yellow = '#fde047';
  c.bg = lin('#0e7490', '#164e63');
  const k = text(c, 'Player spotlight', W * 0.08, H * 0.055, W * 0.84, { font: 'Montserrat', weight: 800, size: u * 0.045, fill: yellow, upper: true, spacing: u * 0.01, name: 'Kicker' });
  text(c, '12', 0, k.y + k.h + u * 0.16, W, { font: 'Anton', weight: 400, size: u * 0.78, fill: CLEAR, stroke: ['rgba(255,255,255,0.3)', u * 0.006], name: 'Big number' });
  const aw = W * 0.66, ah = H * 0.42, ax = (W - aw) / 2, ay = k.y + k.h + u * 0.1;
  photo(c, 'sport-player', ['#155e75', '#cffafe', '#fde047'], 2, ax, ay, aw, ah, { mask: 'arch', stroke: ['#ffffff', u * 0.016] });
  const b = u * 0.17;
  box(c, ax + aw - b * 0.7, ay + ah - b * 0.75, b, b, yellow, { shape: 'ellipse', name: 'Ball dot' });
  art(c, 'ic-volleyball', ax + aw - b * 0.62, ay + ah - b * 0.67, b * 0.84, { h: b * 0.84, colors: ['#ffffff', '#155e75'], name: 'Volleyball' });
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
}

// ============================================================ presentation decks (6 slides)
interface Deck { bg: string; dark: string; accent: string; soft: string; ink: string; muted: string; head: [string, number]; body: string; tint: Tint; key: string }
const slideTitle = (c: Kit, D: Deck, kicker: string, title: string, x: number, y: number, w: number, ink = D.ink, size = 0.085) => {
  const k = text(c, kicker, x, y, w, { font: D.body, weight: 800, size: c.u * 0.032, fill: D.accent, upper: true, spacing: c.u * 0.006, align: 'left', name: 'Kicker' });
  return text(c, title, x, k.y + k.h + c.u * 0.018, w, { font: D.head[0], weight: D.head[1], size: c.u * size, fill: ink, lines: 3, lh: 1.08, align: 'left', name: 'Slide title' });
};
const pageNo = (c: Kit, D: Deck, n: number, ink = D.muted) => text(c, String(n).padStart(2, '0'), c.W * 0.88, c.H - c.u * 0.09, c.W * 0.06, { font: D.body, weight: 800, size: c.u * 0.03, fill: ink, align: 'right', name: 'Page number' });
const para = (c: Kit, D: Deck, s: string, x: number, y: number, w: number, fill = D.muted, size = 0.036, lines = 5) =>
  text(c, s, x, y, w, { font: D.body, weight: 500, size: c.u * size, fill, lines, lh: 1.45, align: 'left', name: 'Text' });

const PITCH: Deck = { bg: '#f7f5f0', dark: '#14213d', accent: '#ff7a59', soft: '#ffe3d9', ink: '#14213d', muted: '#556070', head: ['Poppins', 800], body: 'Poppins', tint: ['#4b6584', '#e3e8ef', '#ff7a59'], key: 'deck-pitch' };
const pitch = (D: Deck): [(c: Kit) => void, ((c: Kit) => void)[]] => [
  (c) => { // cover: words on the left, photo bleeding off the right, the app overlapping both
    const { W, H, u } = c;
    c.bg = D.bg;
    pic(c, D.key, D.tint, 0, W * 0.56, 0, W * 0.44, H, 'none');
    box(c, W * 0.47, H * 0.2, u * 0.52, u * 0.52, D.soft, { shape: 'ellipse', name: 'Glow' });
    bz(c, 'bz-phone-app', W * 0.5, H * 0.12, u * 0.38, [D.dark, D.accent], { name: 'App mock-up' });
    const lx = W * 0.07, lw = W * 0.36;
    box(c, lx, H * 0.2, u * 0.085, u * 0.085, D.accent, { radius: u * 0.024, name: 'Logo tile' });
    mid(c, 'b', lx, H * 0.2 + u * 0.04, u * 0.085, { font: D.head[0], weight: D.head[1], size: u * 0.06, fill: '#ffffff', name: 'Logo letter' });
    const t = text(c, 'Brightside', lx, H * 0.36, lw, { font: D.head[0], weight: D.head[1], size: u * 0.135, fill: D.ink, align: 'left', name: 'Company' });
    para(c, D, 'Health care that fits in your pocket — book, chat and pay in one app.', lx, t.y + t.h + u * 0.02, lw * 0.95, D.muted, 0.04, 3);
    text(c, 'Seed round · November 2026', lx, H * 0.84, lw, { font: D.body, weight: 700, size: u * 0.032, fill: D.accent, upper: true, spacing: u * 0.005, align: 'left', name: 'Date' });
  },
  [
    (c) => { // problem: the words on the left, one huge number on a dark card
      const { W, H, u } = c;
      c.bg = D.bg;
      const t = slideTitle(c, D, 'The problem', 'Seeing a doctor still takes three phone calls', W * 0.07, H * 0.16, W * 0.4);
      para(c, D, 'Most clinics book by phone during office hours. Patients wait weeks, forget their visit and put off care they need.', W * 0.07, t.y + t.h + u * 0.04, W * 0.38);
      const cx = W * 0.53, cw = W * 0.4, cy = H * 0.12, ch = H * 0.76;
      box(c, cx, cy, cw, ch, D.dark, { radius: u * 0.035, name: 'Stat card' });
      const n = text(c, '24 days', cx + u * 0.07, cy + u * 0.08, cw - u * 0.14, { font: D.head[0], weight: D.head[1], size: u * 0.17, fill: D.accent, align: 'left', name: 'Big stat' });
      text(c, 'the average wait for a new-patient visit', cx + u * 0.07, n.y + n.h, cw - u * 0.14, { font: D.body, weight: 600, size: u * 0.04, fill: '#ffffff', lines: 2, lh: 1.3, align: 'left', name: 'Stat label' });
      rule(c, cx + u * 0.07, cy + ch * 0.62, cw - u * 0.14, 'rgba(255,255,255,0.2)', u * 0.003);
      const s2 = text(c, '1 in 4', cx + u * 0.07, cy + ch * 0.62 + u * 0.05, cw * 0.4, { font: D.head[0], weight: D.head[1], size: u * 0.09, fill: '#ffffff', align: 'left', name: 'Stat 2' });
      text(c, 'appointments are missed or late', cx + u * 0.07 + cw * 0.38, s2.y + u * 0.012, cw * 0.48 - u * 0.07, { font: D.body, weight: 500, size: u * 0.034, fill: 'rgba(255,255,255,0.8)', lines: 2, lh: 1.3, align: 'left', name: 'Stat 2 label' });
      pageNo(c, D, 2);
    },
    (c) => { // solution: the app on a soft circle, three numbered features
      const { W, H, u } = c;
      c.bg = D.bg;
      const d = u * 0.78;
      box(c, W * 0.27 - d / 2, H / 2 - d / 2, d, d, D.soft, { shape: 'ellipse', name: 'Circle' });
      bz(c, 'bz-phone-app', W * 0.27 - u * 0.2, H / 2 - u * 0.4, u * 0.4, [D.dark, D.accent], { name: 'App mock-up' });
      const x = W * 0.53, w = W * 0.4;
      const t = slideTitle(c, D, 'Our solution', 'Book, chat and pay in one app', x, H * 0.1, w);
      const feats: [string, string][] = [['Book in 30 seconds', 'Live openings from 2,000 clinics'], ['Chat with your doctor', 'Quick questions without a visit'], ['Clear prices', 'See the cost before you book']];
      feats.forEach(([a, b], i) => {
        const y = t.y + t.h + u * 0.07 + i * u * 0.17, s = u * 0.09;
        box(c, x, y, s, s, D.accent, { shape: 'ellipse', name: 'Number dot' });
        mid(c, String(i + 1), x, y + s / 2, s, { font: D.head[0], weight: D.head[1], size: u * 0.045, fill: '#ffffff', name: 'Number' });
        const h = text(c, a, x + s + u * 0.035, y - u * 0.004, w - s - u * 0.035, { font: D.body, weight: 700, size: u * 0.044, fill: D.ink, align: 'left', name: 'Feature' });
        text(c, b, x + s + u * 0.035, h.y + h.h, w - s - u * 0.035, { font: D.body, weight: 500, size: u * 0.034, fill: D.muted, align: 'left', name: 'Feature detail' });
      });
      pageNo(c, D, 3);
    },
    (c) => { // traction: three numbers and a 12-month bar chart drawn from shapes
      const { W, H, u } = c;
      c.bg = D.dark;
      slideTitle(c, D, 'Traction', 'Patients doubled in six months', W * 0.07, H * 0.09, W * 0.8, '#ffffff', 0.075);
      ([['48K', 'active patients'], ['$1.2M', 'yearly revenue'], ['4.8 ★', 'app store rating']] as const).forEach(([v, l], i) => {
        const y = H * 0.36 + i * H * 0.19;
        const n = text(c, v, W * 0.07, y, W * 0.24, { font: D.head[0], weight: D.head[1], size: u * 0.085, fill: D.accent, align: 'left', name: 'Stat' });
        text(c, l, W * 0.07, n.y + n.h - u * 0.005, W * 0.24, { font: D.body, weight: 600, size: u * 0.032, fill: 'rgba(255,255,255,0.85)', align: 'left', name: 'Stat label' });
      });
      const vals = [9, 11, 12, 14, 17, 20, 24, 28, 33, 38, 43, 48], months = 'JFMAMJJASOND';
      const x0 = W * 0.4, x1 = W * 0.93, top = H * 0.36, bot = H * 0.82, max = 50;
      for (const g of [0, 15, 30, 45]) {
        const y = bot - (g / max) * (bot - top);
        rule(c, x0, y, x1 - x0, 'rgba(255,255,255,0.14)', u * 0.002);
        text(c, g ? `${g}K` : '0', x0 - u * 0.1, y - u * 0.02, u * 0.085, { font: D.body, weight: 600, size: u * 0.026, fill: 'rgba(255,255,255,0.6)', align: 'right', name: 'Axis' });
      }
      const slot = (x1 - x0) / vals.length;
      vals.forEach((v, i) => {
        const h = (v / max) * (bot - top), bx = x0 + i * slot + slot * 0.18, last = i === vals.length - 1;
        box(c, bx, bot - h, slot * 0.64, h, last ? D.accent : '#3d4f7a', { radius: u * 0.01, name: 'Bar' });
        text(c, months[i], x0 + i * slot, bot + u * 0.02, slot, { font: D.body, weight: 700, size: u * 0.026, fill: 'rgba(255,255,255,0.6)', name: 'Month' });
      });
      text(c, '48K', x0 + (vals.length - 1) * slot - slot * 0.2, bot - (48 / max) * (bot - top) - u * 0.06, slot * 1.4, { font: D.body, weight: 800, size: u * 0.032, fill: '#ffffff', name: 'Bar label' });
      text(c, 'Monthly active patients, 2026', x0, H * 0.9, x1 - x0, { font: D.body, weight: 600, size: u * 0.026, fill: 'rgba(255,255,255,0.6)', align: 'left', name: 'Chart note' });
    },
    (c) => { // team: three cards with photos on top
      const { W, H, u } = c;
      c.bg = D.bg;
      slideTitle(c, D, 'The team', 'Built by people who know clinics', W * 0.07, H * 0.08, W * 0.8, D.ink, 0.075);
      const ppl: [string, string][] = [['Ava Brooks', 'CEO · former ER nurse'], ['Ken Mori', 'CTO · 10 years in health tech'], ['Lena Ruiz', 'Design lead · ex-Studio North']];
      const gap = W * 0.03, cw = (W * 0.86 - gap * 2) / 3, y = H * 0.33, ch = H * 0.58;
      ppl.forEach(([n, r], i) => {
        const x = W * 0.07 + i * (cw + gap);
        box(c, x, y, cw, ch, '#ffffff', { radius: u * 0.03, shadow: { color: 'rgba(20,33,61,0.10)', blur: u * 0.03, x: 0, y: u * 0.01 }, name: 'Card' });
        pic(c, D.key, D.tint, i, x + u * 0.025, y + u * 0.025, cw - u * 0.05, ch * 0.6, 'none', u * 0.02);
        const t = text(c, n, x + u * 0.045, y + ch * 0.6 + u * 0.06, cw - u * 0.09, { font: D.body, weight: 800, size: u * 0.044, fill: D.ink, align: 'left', name: 'Name' });
        text(c, r, x + u * 0.045, t.y + t.h + u * 0.005, cw - u * 0.09, { font: D.body, weight: 500, size: u * 0.032, fill: D.muted, align: 'left', name: 'Role' });
      });
      pageNo(c, D, 5);
    },
    (c) => { // the ask: one sentence, a use-of-funds bar, contact
      const { W, H, u } = c;
      c.bg = D.dark;
      const t = slideTitle(c, D, 'The ask', 'Raising $2M to reach 250,000 patients by 2028', W * 0.07, H * 0.12, W * 0.62, '#ffffff', 0.09);
      const y = Math.max(t.y + t.h + u * 0.1, H * 0.56), x = W * 0.07, w = W * 0.86;
      text(c, 'Use of funds', x, y - u * 0.07, w, { font: D.body, weight: 700, size: u * 0.03, fill: 'rgba(255,255,255,0.7)', upper: true, spacing: u * 0.005, align: 'left', name: 'Label' });
      const parts: [number, string, string][] = [[0.45, D.accent, 'Product & clinics'], [0.35, '#ffb59f', 'Growth'], [0.2, '#ffffff', 'Team']];
      let px = x;
      parts.forEach(([f, col, l], i) => {
        const pw = w * f - (i < parts.length - 1 ? u * 0.012 : 0);
        box(c, px, y, pw, u * 0.07, col, { radius: u * 0.012, name: 'Bar part' });
        const v = text(c, `${Math.round(f * 100)}%`, px, y + u * 0.1, pw, { font: D.head[0], weight: D.head[1], size: u * 0.06, fill: '#ffffff', align: 'left', name: 'Share' });
        text(c, l, px, v.y + v.h, pw, { font: D.body, weight: 600, size: u * 0.032, fill: 'rgba(255,255,255,0.75)', align: 'left', name: 'Share label' });
        px += w * f;
      });
      text(c, 'Thank you  ·  ava@brightside.health  ·  brightside.health', x, H * 0.88, w, { font: D.body, weight: 700, size: u * 0.032, fill: D.accent, align: 'left', name: 'Contact' });
    },
  ],
];

const LESSON: Deck = { bg: '#f3faf6', dark: '#2f6b4f', accent: '#e9a23b', soft: '#dcefe4', ink: '#1f3a2d', muted: '#4b6658', head: ['Fredoka', 700], body: 'Nunito', tint: ['#5fa8d3', '#e0f2fb', '#2f6b4f'], key: 'deck-lesson' };
const WATER = ['#3b8fd0', '#5c9a5a', '#f6b93b', '#ffffff'];
const lesson = (D: Deck): [(c: Kit) => void, ((c: Kit) => void)[]] => [
  (c) => { // cover: title on the left, the water-cycle picture on a light card
    const { W, H, u } = c;
    c.bg = D.dark;
    box(c, W * 0.5, H * 0.13, W * 0.44, H * 0.74, '#e6f3ec', { radius: u * 0.05, name: 'Picture card' });
    bz(c, 'bz-water-cycle', W * 0.53, H * 0.5 - W * 0.38 * 0.3125, W * 0.38, WATER, { name: 'Water cycle' });
    const k = text(c, 'Science · Grade 5', W * 0.07, H * 0.24, W * 0.4, { font: D.body, weight: 800, size: u * 0.038, fill: D.accent, upper: true, spacing: u * 0.008, align: 'left', name: 'Kicker' });
    const t = text(c, 'The Water Cycle', W * 0.07, k.y + k.h + u * 0.02, W * 0.4, { font: D.head[0], weight: D.head[1], size: u * 0.16, fill: '#ffffff', lines: 2, lh: 1, align: 'left', name: 'Lesson title' });
    text(c, 'Ms. Rivera · Room 12 · Lesson 4', W * 0.07, t.y + t.h + u * 0.05, W * 0.4, { font: D.body, weight: 700, size: u * 0.036, fill: 'rgba(255,255,255,0.85)', align: 'left', name: 'Teacher' });
  },
  [
    (c) => { // today's goals: checklist + round photo
      const { W, H, u } = c;
      c.bg = D.bg;
      const t = slideTitle(c, D, 'Today', "What we'll learn", W * 0.07, H * 0.12, W * 0.5);
      const d = u * 0.64, px = W * 0.93 - d, py = (H - d) / 2;
      box(c, px - u * 0.02, py - u * 0.02, d + u * 0.04, d + u * 0.04, D.accent, { shape: 'ellipse', name: 'Photo ring' });
      pic(c, D.key, D.tint, 1, px, py, d, d, 'circle');
      ['Where rain comes from', 'The four stages of the cycle', 'Why clouds form', 'How we can save water'].forEach((s, i) => {
        const y = t.y + t.h + u * 0.08 + i * u * 0.13, b = u * 0.075;
        box(c, W * 0.07, y, b, b, D.dark, { radius: u * 0.02, name: 'Check box' });
        mid(c, '✓', W * 0.07, y + b / 2, b, { font: D.body, weight: 800, size: u * 0.045, fill: '#ffffff', name: 'Check' });
        mid(c, s, W * 0.07 + b + u * 0.04, y + b / 2, W * 0.42, { font: D.body, weight: 700, size: u * 0.048, fill: D.ink, align: 'left', name: 'Goal' });
      });
      pageNo(c, D, 2);
    },
    (c) => { // a real cycle diagram: four stage cards round a hub, arrows between them
      const { W, H, u } = c;
      c.bg = D.bg;
      const k = text(c, 'Step by step', W * 0.07, H * 0.07, W * 0.5, { font: D.body, weight: 800, size: u * 0.032, fill: D.accent, upper: true, spacing: u * 0.006, align: 'left', name: 'Kicker' });
      text(c, 'The four stages', W * 0.07, k.y + k.h + u * 0.01, W * 0.5, { font: D.head[0], weight: D.head[1], size: u * 0.075, fill: D.ink, align: 'left', name: 'Slide title' });
      const gap = W * 0.04, cw = (W * 0.86 - gap * 3) / 4, ch = H * 0.5, y0 = H * 0.36;
      const st: [string, string][] = [
        ['Evaporation', 'The sun warms water and it rises as vapour.'],
        ['Condensation', 'Vapour cools and gathers into clouds.'],
        ['Precipitation', 'Water falls as rain, snow or hail.'],
        ['Collection', 'It gathers in rivers, lakes and seas.'],
      ];
      st.forEach(([a, b], i) => {
        const x = W * 0.07 + i * (cw + gap);
        box(c, x, y0, cw, ch, '#ffffff', { radius: u * 0.03, shadow: { color: 'rgba(31,58,45,0.10)', blur: u * 0.03, x: 0, y: u * 0.01 }, name: 'Stage card' });
        const s = u * 0.1;
        box(c, x + u * 0.04, y0 + u * 0.04, s, s, i % 2 ? D.accent : D.dark, { shape: 'ellipse', name: 'Step dot' });
        mid(c, String(i + 1), x + u * 0.04, y0 + u * 0.04 + s / 2, s, { font: D.head[0], weight: D.head[1], size: u * 0.056, fill: '#ffffff', name: 'Step' });
        const n = text(c, a, x + u * 0.04, y0 + u * 0.04 + s + u * 0.035, cw - u * 0.08, { font: D.head[0], weight: D.head[1], size: u * 0.042, fill: D.ink, align: 'left', name: 'Stage' });
        text(c, b, x + u * 0.04, n.y + n.h + u * 0.015, cw - u * 0.08, { font: D.body, weight: 600, size: u * 0.034, fill: D.muted, lines: 4, lh: 1.3, align: 'left', name: 'Stage detail' });
        if (i < 3) { const as = gap * 0.8; box(c, x + cw + (gap - as) / 2, y0 + u * 0.04 + s / 2 - as * 0.3, as, as * 0.6, D.accent, { shape: 'arrow', name: 'Arrow' }); }
      });
      pageNo(c, D, 3);
    },
    (c) => { // a fact with a waffle chart (100 squares)
      const { W, H, u } = c;
      c.bg = D.bg;
      const t = slideTitle(c, D, 'Did you know?', 'Only 3% of Earth’s water is fresh', W * 0.07, H * 0.16, W * 0.4);
      para(c, D, 'Almost all water is salty ocean. The fresh water we drink keeps moving round the cycle — so every drop we save matters.', W * 0.07, t.y + t.h + u * 0.04, W * 0.38);
      const cell = u * 0.056, gap = u * 0.01, gw = cell * 10 + gap * 9, gx = W * 0.55, gy = H * 0.1;
      for (let i = 0; i < 100; i++) {
        const r = Math.floor(i / 10), col = i % 10, fresh = i >= 97;
        box(c, gx + col * (cell + gap), gy + r * (cell + gap), cell, cell, fresh ? D.accent : '#5fa8d3', { radius: cell * 0.22, name: fresh ? 'Fresh water' : 'Salt water' });
      }
      const ly = gy + gw + u * 0.05;
      ([['#5fa8d3', 'Salt water 97%'], [D.accent, 'Fresh water 3%']] as const).forEach(([col, l], i) => {
        const lx = gx + i * gw * 0.52, s = u * 0.04;
        box(c, lx, ly, s, s, col, { radius: s * 0.22, name: 'Key' });
        mid(c, l, lx + s + u * 0.02, ly + s / 2, gw * 0.45, { font: D.body, weight: 700, size: u * 0.032, fill: D.ink, align: 'left', name: 'Key label' });
      });
      pageNo(c, D, 4);
    },
    (c) => { // quiz: the question, three answer cards in a row
      const { W, H, u } = c;
      c.bg = D.soft;
      const k = text(c, 'Quick quiz', W * 0.1, H * 0.1, W * 0.8, { font: D.body, weight: 800, size: u * 0.034, fill: D.dark, upper: true, spacing: u * 0.008, name: 'Kicker' });
      const q = text(c, 'What do we call water falling from clouds?', W * 0.12, k.y + k.h + u * 0.02, W * 0.76, { font: D.head[0], weight: D.head[1], size: u * 0.08, fill: D.ink, lines: 2, lh: 1.1, name: 'Question' });
      const gap = W * 0.03, cw = (W * 0.8 - gap * 2) / 3, y = Math.max(q.y + q.h + u * 0.08, H * 0.48), ch = H * 0.36;
      ['Evaporation', 'Precipitation', 'Collection'].forEach((a, i) => {
        const x = W * 0.1 + i * (cw + gap), right = i === 1;
        box(c, x, y, cw, ch, right ? D.dark : '#ffffff', { radius: u * 0.03, name: 'Answer card' });
        const s = u * 0.1;
        box(c, x + cw / 2 - s / 2, y + u * 0.05, s, s, right ? D.accent : D.soft, { shape: 'ellipse', name: 'Letter dot' });
        mid(c, 'ABC'[i], x + cw / 2 - s / 2, y + u * 0.05 + s / 2, s, { font: D.head[0], weight: D.head[1], size: u * 0.05, fill: right ? '#ffffff' : D.dark, name: 'Letter' });
        text(c, a, x + u * 0.03, y + u * 0.2, cw - u * 0.06, { font: D.head[0], weight: D.head[1], size: u * 0.05, fill: right ? '#ffffff' : D.ink, name: 'Answer' });
        if (right) text(c, '✓ Correct!', x + u * 0.03, y + ch - u * 0.09, cw - u * 0.06, { font: D.body, weight: 800, size: u * 0.032, fill: D.accent, name: 'Correct' });
      });
    },
    (c) => { // wrap-up with a homework card
      const { W, H, u } = c;
      c.bg = D.dark;
      const t = text(c, 'Great job, scientists!', W * 0.07, H * 0.3, W * 0.42, { font: D.head[0], weight: D.head[1], size: u * 0.13, fill: '#ffffff', lines: 3, lh: 1.02, align: 'left', name: 'Title' });
      text(c, 'Questions? Ask me after class.', W * 0.07, t.y + t.h + u * 0.04, W * 0.42, { font: D.body, weight: 700, size: u * 0.038, fill: 'rgba(255,255,255,0.8)', align: 'left', name: 'Note' });
      const x = W * 0.55, w = W * 0.38, y = H * 0.2, h = H * 0.6;
      box(c, x, y, w, h, '#ffffff', { radius: u * 0.04, name: 'Homework card' });
      box(c, x, y, w, u * 0.02, D.accent, { radius: u * 0.01, name: 'Card stripe' });
      const k = text(c, 'Homework', x + u * 0.06, y + u * 0.08, w - u * 0.12, { font: D.body, weight: 800, size: u * 0.034, fill: D.dark, upper: true, spacing: u * 0.008, align: 'left', name: 'Label' });
      const b = text(c, 'Draw the water cycle in your notebook and label all four stages.', x + u * 0.06, k.y + k.h + u * 0.03, w - u * 0.12, { font: D.head[0], weight: D.head[1], size: u * 0.056, fill: D.ink, lines: 4, lh: 1.2, align: 'left', name: 'Homework' });
      text(c, 'Due Friday, November 20', x + u * 0.06, b.y + b.h + u * 0.05, w - u * 0.12, { font: D.body, weight: 700, size: u * 0.034, fill: D.muted, align: 'left', name: 'Due date' });
    },
  ],
];

// ============================================================ Instagram carousels (5 slides)
interface Caro { bg: string; ink: string; accent: string; soft: string; head: [string, number]; body: string; handle: string; art: string; artColors: string[] }
const dots = (c: Kit, C: Caro, i: number, n: number, off?: string) => {
  const d = c.u * 0.016, gap = c.u * 0.012, w = n * d + (n - 1) * gap;
  for (let k = 0; k < n; k++) box(c, (c.W - w) / 2 + k * (d + gap), c.H - c.u * 0.06, d, d, k === i ? C.accent : off ?? C.soft, { shape: 'ellipse', name: 'Page dot' });
};
const handle = (c: Kit, C: Caro, fill = C.ink) => text(c, C.handle, c.W * 0.07, c.u * 0.06, c.W * 0.6, { font: C.body, weight: 700, size: c.u * 0.032, fill, align: 'left', name: 'Handle' });
const count = (c: Kit, C: Caro, i: number, n: number, fill = C.ink) => text(c, `${i + 1}/${n}`, c.W * 0.73, c.u * 0.06, c.W * 0.2, { font: C.body, weight: 700, size: c.u * 0.032, fill, align: 'right', name: 'Count' });
function caroCover(c: Kit, C: Caro, kicker: string, title: string, n: number): void {
  const { W, H, u } = c;
  c.bg = C.bg;
  handle(c, C); count(c, C, 0, n);
  box(c, W * 0.6, H * 0.06, u * 0.36, u * 0.36, C.soft, { shape: 'ellipse', name: 'Circle' });
  bz(c, C.art, W * 0.63, H * 0.09, u * 0.3, C.artColors, { name: 'Illustration' });
  const k = text(c, kicker, W * 0.07, H * 0.45, W * 0.6, { font: C.body, weight: 800, size: u * 0.04, fill: C.accent, upper: true, spacing: u * 0.008, align: 'left', name: 'Kicker' });
  const ty = k.y + k.h + u * 0.02;
  text(c, title, W * 0.07, ty, W * 0.86, { font: C.head[0], weight: C.head[1], size: u * 0.11, fill: C.ink, lines: 3, lh: 1.02, maxH: H * 0.8 - ty, align: 'left', name: 'Title' });
  box(c, W * 0.07, H * 0.83, u * 0.27, u * 0.075, C.ink, { radius: u * 0.0375, name: 'Swipe pill' });
  mid(c, 'Swipe  →', W * 0.07, H * 0.83 + u * 0.0375, u * 0.27, { font: C.body, weight: 800, size: u * 0.032, fill: C.bg, name: 'Swipe' });
  dots(c, C, 0, n);
}
/** Tip, layout A: a huge soft numeral, the tip under it. */
function caroTipA(c: Kit, C: Caro, i: number, n: number, title: string, body: string): void {
  const { W, H, u } = c;
  c.bg = C.bg;
  handle(c, C); count(c, C, i, n);
  text(c, String(i).padStart(2, '0'), W * 0.05, H * 0.12, W * 0.6, { font: C.head[0], weight: C.head[1], size: u * 0.34, fill: C.soft, align: 'left', name: 'Big number' });
  const t = text(c, title, W * 0.07, H * 0.47, W * 0.86, { font: C.head[0], weight: C.head[1], size: u * 0.09, fill: C.ink, lines: 2, lh: 1.05, align: 'left', name: 'Tip title' });
  box(c, W * 0.07, t.y + t.h + u * 0.035, u * 0.1, u * 0.012, C.accent, { name: 'Rule' });
  text(c, body, W * 0.07, t.y + t.h + u * 0.08, W * 0.82, { font: C.body, weight: 500, size: u * 0.042, fill: C.ink, lines: 4, lh: 1.4, align: 'left', name: 'Tip' });
  dots(c, C, i, n);
}
/** Tip, layout B: a dark top panel with the number and title, the tip and a "try this" note below. */
function caroTipB(c: Kit, C: Caro, i: number, n: number, title: string, body: string, tryThis: string): void {
  const { W, H, u } = c;
  c.bg = C.bg;
  box(c, 0, 0, W, H * 0.5, C.ink, { name: 'Panel' });
  handle(c, C, '#ffffff'); count(c, C, i, n, '#ffffff');
  const nb = text(c, String(i).padStart(2, '0'), W * 0.07, H * 0.15, W * 0.3, { font: C.head[0], weight: C.head[1], size: u * 0.1, fill: C.accent, align: 'left', name: 'Number' });
  text(c, title, W * 0.07, nb.y + nb.h, W * 0.86, { font: C.head[0], weight: C.head[1], size: u * 0.09, fill: '#ffffff', lines: 2, lh: 1.05, maxH: H * 0.46 - nb.y - nb.h, align: 'left', name: 'Tip title' });
  const b = text(c, body, W * 0.07, H * 0.56, W * 0.86, { font: C.body, weight: 500, size: u * 0.042, fill: C.ink, lines: 3, lh: 1.4, align: 'left', name: 'Tip' });
  const ty = b.y + b.h + u * 0.04;
  box(c, W * 0.07, ty, W * 0.86, u * 0.13, C.soft, { radius: u * 0.03, name: 'Note box' });
  mid(c, `Try this: ${tryThis}`, W * 0.1, ty + u * 0.065, W * 0.8, { font: C.body, weight: 700, size: u * 0.034, fill: C.ink, lines: 2, lh: 1.3, align: 'left', name: 'Try this' });
  dots(c, C, i, n);
}
/** Tip, layout C: a centred white card on the soft colour. */
function caroTipC(c: Kit, C: Caro, i: number, n: number, title: string, body: string): void {
  const { W, H, u } = c;
  c.bg = C.soft;
  handle(c, C); count(c, C, i, n);
  const x = W * 0.07, y = H * 0.16, w = W * 0.86, h = H * 0.7;
  box(c, x, y, w, h, '#ffffff', { radius: u * 0.05, name: 'Card' });
  const s = u * 0.14;
  box(c, W / 2 - s / 2, y + u * 0.08, s, s, C.accent, { shape: 'ellipse', name: 'Number dot' });
  mid(c, String(i).padStart(2, '0'), W / 2 - s / 2, y + u * 0.08 + s / 2, s, { font: C.head[0], weight: C.head[1], size: u * 0.06, fill: '#ffffff', name: 'Number' });
  const t = text(c, title, x + u * 0.07, y + u * 0.08 + s + u * 0.05, w - u * 0.14, { font: C.head[0], weight: C.head[1], size: u * 0.085, fill: C.ink, lines: 2, lh: 1.05, name: 'Tip title' });
  text(c, body, x + u * 0.08, t.y + t.h + u * 0.04, w - u * 0.16, { font: C.body, weight: 500, size: u * 0.042, fill: C.ink, lines: 4, lh: 1.4, name: 'Tip' });
  dots(c, C, i, n, '#ffffff');
}
function caroEnd(c: Kit, C: Caro, title: string, line: string, n: number): void {
  const { W, H, u } = c;
  c.bg = C.ink;
  const s = u * 0.22;
  bz(c, 'bz-bookmark', (W - s * 0.69) / 2, H * 0.1, s * 0.69, [C.accent, C.ink], { h: s, name: 'Bookmark' });
  const t = text(c, title, W * 0.08, H * 0.1 + s + u * 0.07, W * 0.84, { font: C.head[0], weight: C.head[1], size: u * 0.1, fill: '#ffffff', lines: 2, lh: 1.05, name: 'Title' });
  const l = text(c, line, W * 0.1, t.y + t.h + u * 0.04, W * 0.8, { font: C.body, weight: 600, size: u * 0.042, fill: 'rgba(255,255,255,0.85)', lines: 2, lh: 1.35, name: 'Line' });
  const hy = Math.min(Math.max(H * 0.74, l.y + l.h + u * 0.05), H - u * 0.2), hw = widthOf(C.handle, C.body, 800, u * 0.04) + u * 0.12;
  box(c, (W - hw) / 2, hy, hw, u * 0.085, C.accent, { radius: u * 0.0425, name: 'Follow pill' });
  mid(c, C.handle, (W - hw) / 2, hy + u * 0.0425, hw, { font: C.body, weight: 800, size: u * 0.04, fill: C.ink, name: 'Handle' });
  dots(c, C, n - 1, n, 'rgba(255,255,255,0.3)');
}
const SLEEP: Caro = { bg: '#fdf6ee', ink: '#1e2a4a', accent: '#d9653a', soft: '#f6dccb', head: ['DM Serif Display', 400], body: 'Poppins', handle: '@calmhabits', art: 'bz-moon', artColors: ['#f2b84b', '#d9653a'] };
const BIZ: Caro = { bg: '#eef6f3', ink: '#0f3d3e', accent: '#15803d', soft: '#cfe8df', head: ['Space Grotesk', 700], body: 'Inter', handle: '@smallbizclub', art: 'bz-shop', artColors: ['#15803d', '#ffffff', '#0f3d3e'] };

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
      [(c) => caroTipA(c, SLEEP, 1, 5, 'Keep the same bedtime', 'Going to bed at the same time every night sets your body clock — even on weekends.'),
        (c) => caroTipB(c, SLEEP, 2, 5, 'Dim the screens', 'Put your phone away 30 minutes before bed — screen light tells your brain it is still daytime.', 'charge your phone outside the bedroom.'),
        (c) => caroTipC(c, SLEEP, 3, 5, 'Cool, dark and quiet', 'A cool room (about 65°F / 18°C), dark curtains and a little white noise help you drift off.'),
        (c) => caroEnd(c, SLEEP, 'Save this for tonight', 'Share it with a friend who needs more rest', 5)]),
    caroT('small-business-launch-carousel', 'Small Business Launch Carousel', 'post', 'Modern', ['mint', 'green', 'teal'], [...CARO, 'small business', 'entrepreneur', 'launch', 'checklist', 'marketing'],
      (c) => caroCover(c, BIZ, 'Launching soon?', 'Your small business launch checklist', 5),
      [(c) => caroTipA(c, BIZ, 1, 5, 'Claim your name everywhere', 'Grab the same handle on Instagram, TikTok and your website before you announce.'),
        (c) => caroTipB(c, BIZ, 2, 5, 'Tease it for two weeks', 'Share behind-the-scenes posts and a countdown so people are ready on day one.', 'post a sneak peek every other day.'),
        (c) => caroTipC(c, BIZ, 3, 5, 'Give a launch-day reason', 'A small gift, discount or giveaway turns followers into first customers.'),
        (c) => caroEnd(c, BIZ, 'Follow for more tips', 'New small business ideas every week', 5)]),
  ] },
];

export const MEDIA_FONTS: [string, number][] = [
  ['Anton', 400], ['Bebas Neue', 400], ['Montserrat', 600], ['Montserrat', 700], ['Montserrat', 800], ['Montserrat', 900], ['Oswald', 500], ['Oswald', 600], ['Oswald', 700], ['Caveat', 700],
  ['Poppins', 500], ['Poppins', 600], ['Poppins', 700], ['Poppins', 800], ['Fredoka', 700], ['Nunito', 600], ['Nunito', 700], ['Nunito', 800], ['DM Serif Display', 400], ['Space Grotesk', 700], ['Inter', 600], ['Inter', 700], ['Inter', 800],
  ['Nunito', 500], ['Inter', 500], ['Oswald', 400],
];
