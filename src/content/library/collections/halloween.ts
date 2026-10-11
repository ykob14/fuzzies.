/**
 * Halloween collection — 20 hand-composed templates. Every design is built only from editable layers: scene
 * backgrounds and illustrations from the Halloween asset collection (original artwork, recolourable), shapes and
 * live text in free Google fonts. Nothing is flattened, so every word, colour, illustration and position can change.
 */
import type { Design, El, Fill, Shadow, ShapeEl, TextEl } from '../../../editor/types';
import { makeGraphic, makeShape, makeText, newPage } from '../../../editor/doc';
import { DOC_VERSION } from '../../../editor/model';
import { fitText } from '../../../editor/render';
import { ensureFont } from '../../fonts';
import { ASSETS } from '../../assets/collections/halloween';
import { FORMATS, fitSize, widthOf, type Format } from '../layouts';

export interface CollectionTemplate {
  id: string; name: string; format: Format; style: string; colors: string[]; occasion: string; tags: string[];
  build(c: Kit): void;
}
/** Fonts the collection uses (previews wait for them so text is measured exactly). */
export const HALLOWEEN_FONTS: [string, number][] = [['Creepster', 400], ['Griffy', 400], ['Henny Penny', 400], ['Mystery Quest', 400], ['Jolly Lodger', 400],
  ['Montserrat', 600], ['Montserrat', 700], ['Montserrat', 800], ['Poppins', 600], ['Poppins', 700], ['Abril Fatface', 400], ['Bebas Neue', 400], ['Fredoka', 600], ['Fredoka', 700], ['Playfair Display', 700]];

// ---------- composition kit ----------
interface Kit { W: number; H: number; u: number; els: El[]; bg: Fill }
const ratioOf = new Map(ASSETS.map((a) => [a.id, a.ratio]));
const colorsOf = new Map(ASSETS.map((a) => [a.id, a.colors]));
const SHAPE: Record<Format, string> = { post: 'sq', story: 'st', poster: 'po', flyer: 'po', card: 'po', landscape: 'ls', certificate: 'ls', slides: 'ls' };

/** An illustration at (x, y), `w` wide (height from its shape unless given). */
function art(c: Kit, id: string, x: number, y: number, w: number, o: { h?: number; colors?: string[]; rot?: number; opacity?: number; flip?: boolean; name?: string } = {}): void {
  const el = makeGraphic(id, w);
  Object.assign(el, { x, y, w, h: o.h ?? w / (ratioOf.get(id) ?? 1), colors: [...(o.colors ?? colorsOf.get(id) ?? [])], rotation: o.rot ?? 0, opacity: o.opacity ?? 1, flipX: !!o.flip });
  if (o.name) el.name = o.name;
  c.els.push(el);
}
/** A full-page scene background in the right shape for this format. */
function scene(c: Kit, base: string, format: Format, colors?: string[]): void {
  art(c, `${base}-${SHAPE[format]}`, 0, 0, c.W, { h: c.H, colors, name: 'Background scene' });
}
interface TOpts { font: string; weight?: number; size: number; lines?: number; fill?: Fill; align?: 'left' | 'center' | 'right'; upper?: boolean; spacing?: number; lh?: number; shadow?: Shadow; stroke?: [string, number]; italic?: boolean; name?: string; maxH?: number }
/** Live text, sized to fit `w` in at most `lines` lines (never breaking words). */
function text(c: Kit, s: string, x: number, y: number, w: number, o: TOpts): TextEl {
  const weight = o.weight ?? 400, lh = o.lh ?? 1.05;
  const size = fitSize(s, o.font, weight, w, o.size, o.lines ?? 1, { upper: o.upper, spacing: o.spacing, lh, maxH: o.maxH });
  const el = makeText(s, { font: o.font, weight, size, w, align: o.align ?? 'center', fill: o.fill ?? '#ffffff', uppercase: !!o.upper, letterSpacing: o.spacing ?? 0, lineHeight: lh, italic: !!o.italic, shadow: o.shadow ?? null, strokeColor: o.stroke?.[0] ?? '', strokeWidth: o.stroke?.[1] ?? 0 });
  ensureFont(el.font, el.weight, el.italic);
  el.x = x; el.y = y;
  if (o.name) el.name = o.name;
  fitText(el);
  c.els.push(el);
  return el;
}
function box(c: Kit, x: number, y: number, w: number, h: number, fill: Fill, o: Partial<ShapeEl> = {}): ShapeEl {
  const el = makeShape(o.shape ?? 'rect', { fill, ...o });
  Object.assign(el, { x, y, w, h });
  c.els.push(el);
  return el;
}
/** A rounded label ("pill") centred on cx. */
function pill(c: Kit, s: string, cx: number, y: number, size: number, fill: string, ink: string, font = 'Montserrat', weight = 800): void {
  const tw = widthOf(s.toUpperCase(), font, weight, size, true, size * 0.06);
  const w = Math.min(c.W * 0.9, tw + size * 2.4), h = size * 2.3;
  box(c, cx - w / 2, y, w, h, fill, { radius: h / 2 });
  const t = text(c, s, cx - w / 2, 0, w, { font, weight, size, fill: ink, upper: true, spacing: size * 0.06 });
  t.y = y + (h - t.h) / 2;
}
/** The y just below an element plus a gap (for text that flows under a title of unknown height). */
const below = (el: { y: number; h: number }, gap: number) => el.y + el.h + gap;
const lin = (a: string, b: string, angle = 180): Fill => ({ kind: 'linear', angle, stops: [{ at: 0, color: a }, { at: 1, color: b }] });
const glow = (color: string, blur: number): Shadow => ({ color, blur, x: 0, y: 0 });
const drop = (u: number, color = 'rgba(0,0,0,0.45)'): Shadow => ({ color, blur: u * 0.012, x: 0, y: u * 0.006 });

const ORANGE = '#f2802b', GOLD = '#ffcf5a', CREAM = '#fff1c1', NIGHT = '#120f2b', INK = '#1a1426', WHITE = '#ffffff', GREEN = '#8bd346';

// ---------- the 20 designs ----------
export const HALLOWEEN: CollectionTemplate[] = [
  { id: 'haunted-house-party', name: 'Haunted House Party', format: 'poster', style: 'Illustrated', colors: ['purple', 'orange', 'black'], occasion: 'party', tags: ['haunted house', 'party', 'invitation', 'moon', 'bats', 'night'], build(c) {
    const { W, H, u } = c;
    scene(c, 'hw-bg-night', 'poster');
    art(c, 'hw-bats', W * 0.05, H * 0.04, W * 0.36, { rot: -6 });
    text(c, "You're invited to a", W * 0.1, H * 0.075, W * 0.8, { font: 'Montserrat', weight: 700, size: u * 0.034, fill: CREAM, upper: true, spacing: u * 0.008 });
    const t = text(c, 'Haunted House Party', W * 0.06, H * 0.11, W * 0.88, { font: 'Creepster', size: u * 0.2, lines: 2, fill: ORANGE, lh: 0.95, maxH: H * 0.21, shadow: drop(u, 'rgba(0,0,0,0.6)'), name: 'Title' });
    const d = text(c, 'Saturday, October 31 · 8 PM', W * 0.1, below(t, u * 0.03), W * 0.8, { font: 'Montserrat', weight: 700, size: u * 0.042, fill: WHITE });
    text(c, '13 Hollow Lane, Raven Hill', W * 0.1, below(d, u * 0.01), W * 0.8, { font: 'Montserrat', weight: 600, size: u * 0.034, fill: CREAM });
    art(c, 'hw-house', W * 0.17, H * 0.44, W * 0.66);
    art(c, 'hw-fog', -W * 0.1, H * 0.8, W * 1.2, { h: H * 0.12 });
    pill(c, 'Costumes required', W / 2, H * 0.9, u * 0.03, GOLD, INK);
  } },
  { id: 'trick-or-treat', name: 'Trick or Treat!', format: 'post', style: 'Illustrated', colors: ['orange', 'purple'], occasion: 'trick-or-treat', tags: ['trick or treat', 'candy', 'kids', 'pumpkin', 'street'], build(c) {
    const { W, H, u } = c;
    scene(c, 'hw-bg-patch', 'post');
    art(c, 'hw-moon', W * 0.68, H * 0.03, W * 0.28);
    art(c, 'hw-bats', W * 0.55, H * 0.3, W * 0.36, { rot: 4 });
    const t = text(c, 'Trick or Treat!', W * 0.06, H * 0.07, W * 0.6, { font: 'Griffy', size: u * 0.15, lines: 2, fill: CREAM, align: 'left', lh: 1, shadow: drop(u, 'rgba(20,10,40,0.7)'), name: 'Title' });
    text(c, 'October 31 · 5–8 PM · Maple Street', W * 0.065, below(t, u * 0.02), W * 0.55, { font: 'Montserrat', weight: 700, size: u * 0.036, fill: WHITE, align: 'left', lines: 2 });
    art(c, 'hw-jack', W * 0.27, H * 0.44, W * 0.4);
  } },
  { id: 'pumpkin-carving', name: 'Pumpkin Carving Contest', format: 'flyer', style: 'Illustrated', colors: ['cream', 'orange', 'brown'], occasion: 'contest', tags: ['pumpkin', 'carving', 'contest', 'community', 'family', 'autumn'], build(c) {
    const { W, H, u } = c;
    c.bg = lin('#fff6e6', '#ffdcb4');
    art(c, 'hw-leaves', -W * 0.08, -H * 0.04, W * 0.44, { rot: 8 });
    art(c, 'hw-leaves', W * 0.66, -H * 0.03, W * 0.4, { rot: -150, colors: ['#c2410c', '#e8590c', '#f2a516'] });
    text(c, 'Maple Grove Community Center presents', W * 0.1, H * 0.165, W * 0.8, { font: 'Montserrat', weight: 800, size: u * 0.03, fill: '#9a3d0b', upper: true, spacing: u * 0.006, lines: 2 });
    text(c, 'Pumpkin Carving Contest', W * 0.07, H * 0.22, W * 0.86, { font: 'Abril Fatface', size: u * 0.15, lines: 2, fill: '#5a2a0a', lh: 0.98, name: 'Title' });
    art(c, 'hw-jack', W * 0.22, H * 0.43, W * 0.56);
    box(c, W * 0.08, H * 0.8, W * 0.84, H * 0.15, '#5a2a0a', { radius: u * 0.03 });
    text(c, 'Sunday, October 27 · 2 PM', W * 0.1, H * 0.815, W * 0.8, { font: 'Montserrat', weight: 800, size: u * 0.04, fill: '#fff6e6' });
    text(c, 'Prizes for the spookiest, silliest & most creative', W * 0.12, H * 0.865, W * 0.76, { font: 'Montserrat', weight: 600, size: u * 0.03, fill: '#ffcf9a', lines: 2 });
  } },
  { id: 'costume-party-invite', name: 'Costume Party Invitation', format: 'card', style: 'Illustrated', colors: ['black', 'orange', 'white'], occasion: 'party', tags: ['costume', 'party', 'invitation', 'ghosts', 'bats', 'rsvp'], build(c) {
    const { W, H, u } = c;
    scene(c, 'hw-bg-bats', 'card');
    art(c, 'hw-frame', W * 0.04, H * 0.03, W * 0.92, { h: H * 0.94 });
    art(c, 'hw-ghosts', W * 0.2, H * 0.1, W * 0.6);
    text(c, 'Join us for a frightfully fun night', W * 0.14, H * 0.44, W * 0.72, { font: 'Montserrat', weight: 700, size: u * 0.034, fill: GOLD, upper: true, spacing: u * 0.005, lines: 2 });
    const t = text(c, 'Costume Party', W * 0.08, H * 0.5, W * 0.84, { font: 'Henny Penny', size: u * 0.15, lines: 2, fill: WHITE, lh: 1, maxH: H * 0.2, shadow: glow(ORANGE, u * 0.03), name: 'Title' });
    const d = text(c, 'Friday, October 30 · 7 PM', W * 0.12, below(t, u * 0.03), W * 0.76, { font: 'Montserrat', weight: 800, size: u * 0.04, fill: WHITE });
    const e = text(c, 'The Lantern Room · 42 Elm Street', W * 0.12, below(d, u * 0.01), W * 0.76, { font: 'Montserrat', weight: 600, size: u * 0.032, fill: CREAM });
    pill(c, 'RSVP to Sam by Oct 25', W / 2, below(e, u * 0.035), u * 0.026, ORANGE, INK);
  } },
  { id: 'spooky-movie-night', name: 'Spooky Movie Night', format: 'landscape', style: 'Illustrated', colors: ['purple', 'yellow', 'black'], occasion: 'movie-night', tags: ['movie', 'film', 'cinema', 'night', 'haunted house', 'banner'], build(c) {
    const { W, H, u } = c;
    scene(c, 'hw-bg-night', 'landscape');
    art(c, 'hw-hill-house', W * 0.48, H * 0.18, W * 0.52, { h: H * 0.82 });
    art(c, 'hw-bats', W * 0.36, H * 0.05, W * 0.2, { rot: -8 });
    text(c, 'Friday Feature', W * 0.06, H * 0.16, W * 0.44, { font: 'Montserrat', weight: 800, size: u * 0.05, fill: CREAM, upper: true, spacing: u * 0.01, align: 'left' });
    text(c, 'Spooky Movie Night', W * 0.055, H * 0.25, W * 0.46, { font: 'Creepster', size: u * 0.2, lines: 2, fill: GOLD, align: 'left', lh: 0.95, shadow: drop(u, 'rgba(0,0,0,0.6)'), name: 'Title' });
    text(c, 'October 25 · Doors 7 PM · Free popcorn', W * 0.06, H * 0.66, W * 0.44, { font: 'Montserrat', weight: 700, size: u * 0.045, fill: WHITE, align: 'left', lines: 2 });
    text(c, 'Riverside Park Lawn — bring a blanket', W * 0.06, H * 0.8, W * 0.44, { font: 'Montserrat', weight: 600, size: u * 0.038, fill: CREAM, align: 'left' });
  } },
  { id: 'boo-greeting', name: 'Boo! Greeting', format: 'post', style: 'Cute', colors: ['purple', 'white'], occasion: 'greeting', tags: ['boo', 'ghost', 'greeting', 'cute', 'social'], build(c) {
    const { W, H, u } = c;
    c.bg = lin('#3b2160', '#1a1033', 160);
    art(c, 'hw-stars', 0, 0, W, { h: H * 0.6, opacity: 0.8 });
    art(c, 'hw-moon', W * 0.66, H * 0.06, W * 0.26);
    art(c, 'hw-ghost-boo', W * 0.06, H * 0.26, W * 0.46);
    const t = text(c, 'BOO!', W * 0.52, H * 0.28, W * 0.44, { font: 'Jolly Lodger', size: u * 0.3, fill: WHITE, shadow: glow('#b9a6ff', u * 0.04), name: 'Title' });
    text(c, 'Happy Halloween from all of us', W * 0.52, below(t, u * 0.01), W * 0.44, { font: 'Montserrat', weight: 700, size: u * 0.04, fill: '#d9ccff', lines: 2 });
    art(c, 'hw-pumpkins', W * 0.52, H * 0.76, W * 0.44);
  } },
  { id: 'halloween-bash-story', name: 'Halloween Bash', format: 'story', style: 'Illustrated', colors: ['purple', 'orange', 'pink'], occasion: 'party', tags: ['party', 'bash', 'story', 'instagram', 'moon', 'pumpkins'], build(c) {
    const { W, H, u } = c;
    scene(c, 'hw-bg-dusk', 'story');
    art(c, 'hw-moon-bats', W * 0.2, H * 0.04, W * 0.6);
    const t = text(c, 'Halloween Bash', W * 0.06, H * 0.33, W * 0.88, { font: 'Creepster', size: u * 0.24, lines: 2, fill: ORANGE, lh: 0.92, maxH: H * 0.2, stroke: ['#2b1846', u * 0.006], shadow: drop(u, 'rgba(20,0,30,0.6)'), name: 'Title' });
    const d = text(c, 'Saturday · October 31 · 9 PM', W * 0.1, below(t, u * 0.04), W * 0.8, { font: 'Montserrat', weight: 800, size: u * 0.05, fill: WHITE });
    const e = text(c, 'DJ · Costume contest · Treats', W * 0.1, below(d, u * 0.015), W * 0.8, { font: 'Montserrat', weight: 600, size: u * 0.042, fill: '#ffd9c2' });
    pill(c, 'Swipe up to RSVP', W / 2, below(e, u * 0.04), u * 0.034, GOLD, INK);
    art(c, 'hw-pumpkins', W * 0.1, H * 0.78, W * 0.8);
  } },
  { id: 'graveyard-smash', name: 'Graveyard Smash', format: 'poster', style: 'Illustrated', colors: ['blue', 'teal', 'white'], occasion: 'dance', tags: ['graveyard', 'dance', 'party', 'fog', 'spider', 'monster'], build(c) {
    const { W, H, u } = c;
    scene(c, 'hw-bg-graveyard', 'poster');
    art(c, 'hw-spider', W * 0.8, 0, W * 0.12);
    art(c, 'hw-eyes', W * 0.6, H * 0.56, W * 0.3, { colors: ['#b8ff6b'] });
    text(c, 'A monster dance party', W * 0.1, H * 0.3, W * 0.8, { font: 'Montserrat', weight: 700, size: u * 0.036, fill: '#cfe3ef', upper: true, spacing: u * 0.01 });
    const t = text(c, 'Graveyard Smash', W * 0.06, H * 0.33, W * 0.88, { font: 'Mystery Quest', size: u * 0.17, lines: 2, fill: '#e9f6ff', lh: 1, shadow: glow('#7fd3ff', u * 0.03), name: 'Title' });
    const d = text(c, 'October 31 · 10 PM till late', W * 0.1, below(t, u * 0.03), W * 0.8, { font: 'Montserrat', weight: 800, size: u * 0.045, fill: WHITE });
    text(c, 'The Old Chapel Hall · Tickets $15', W * 0.1, below(d, u * 0.012), W * 0.8, { font: 'Montserrat', weight: 600, size: u * 0.034, fill: '#cfe3ef' });
    art(c, 'hw-fog', -W * 0.1, H * 0.88, W * 1.2, { h: H * 0.1, opacity: 0.8 });
  } },
  { id: 'witches-brew', name: "Witch's Brew Night", format: 'flyer', style: 'Illustrated', colors: ['green', 'black', 'purple'], occasion: 'bar', tags: ['witch', 'brew', 'cocktails', 'bar', 'drinks', 'menu', 'potion'], build(c) {
    const { W, H, u } = c;
    c.bg = lin('#16221a', '#0b0f0c');
    art(c, 'hw-stars', 0, 0, W, { h: H * 0.4, opacity: 0.6, colors: ['#d8ffb8'] });
    art(c, 'hw-hat', W * 0.36, H * 0.03, W * 0.28, { rot: -8 });
    const t = text(c, "Witch's Brew Night", W * 0.06, H * 0.19, W * 0.88, { font: 'Griffy', size: u * 0.14, lines: 2, fill: GREEN, lh: 1, shadow: glow('#5fbf2a', u * 0.03), name: 'Title' });
    art(c, 'hw-cauldron', W * 0.31, below(t, u * 0.02), W * 0.38);
    const menu = ['Potion No. 9 — $9', "Bat's Blood Punch — $8", 'Pumpkin Spice Elixir — $10'];
    menu.forEach((m, i) => text(c, m, W * 0.1, H * (0.72 + i * 0.045), W * 0.8, { font: 'Montserrat', weight: 700, size: u * 0.036, fill: i % 2 ? '#d9b8ff' : WHITE }));
    text(c, 'Thursday, October 31 · The Crooked Lantern', W * 0.08, H * 0.88, W * 0.84, { font: 'Montserrat', weight: 600, size: u * 0.03, fill: '#b9d9a8', lines: 2 });
    art(c, 'hw-potions', W * 0.0, H * 0.82, W * 0.24);
  } },
  { id: 'pumpkin-patch-festival', name: 'Pumpkin Patch Festival', format: 'poster', style: 'Illustrated', colors: ['orange', 'purple', 'brown'], occasion: 'festival', tags: ['pumpkin patch', 'festival', 'farm', 'hayride', 'family', 'autumn'], build(c) {
    const { W, H, u } = c;
    scene(c, 'hw-bg-patch', 'poster');
    art(c, 'hw-leaves', W * 0.02, H * 0.02, W * 0.34);
    art(c, 'hw-leaves', W * 0.64, H * 0.03, W * 0.34, { rot: 160 });
    text(c, 'Hillside Farm', W * 0.1, H * 0.12, W * 0.8, { font: 'Montserrat', weight: 800, size: u * 0.04, fill: GOLD, upper: true, spacing: u * 0.012 });
    text(c, 'Pumpkin Patch Festival', W * 0.06, H * 0.165, W * 0.88, { font: 'Abril Fatface', size: u * 0.16, lines: 2, fill: CREAM, lh: 0.98, shadow: drop(u, 'rgba(40,10,40,0.6)'), name: 'Title' });
    text(c, 'Hayrides · Corn maze · Hot cider · Pick your own', W * 0.1, H * 0.39, W * 0.8, { font: 'Montserrat', weight: 700, size: u * 0.034, fill: WHITE, lines: 2 });
    pill(c, 'Weekends in October · 10 AM – 5 PM', W / 2, H * 0.47, u * 0.027, ORANGE, '#2a1c3f');
  } },
  { id: 'halloween-sale', name: 'Spooky Season Sale', format: 'post', style: 'Bold', colors: ['black', 'orange'], occasion: 'sale', tags: ['sale', 'discount', 'shop', 'business', 'promotion', 'offer'], build(c) {
    const { W, H, u } = c;
    c.bg = '#15111d';
    art(c, 'hw-web', 0, 0, W * 0.34);
    art(c, 'hw-spider', W * 0.2, 0, W * 0.09);
    art(c, 'hw-jack', W * 0.5, H * 0.46, W * 0.52);
    text(c, 'Spooky season sale', W * 0.07, H * 0.32, W * 0.6, { font: 'Montserrat', weight: 800, size: u * 0.05, fill: CREAM, upper: true, spacing: u * 0.006, align: 'left', lines: 2 });
    text(c, '30% OFF', W * 0.06, H * 0.44, W * 0.55, { font: 'Bebas Neue', size: u * 0.26, fill: ORANGE, align: 'left', shadow: glow('#ff6a00', u * 0.03), name: 'Offer' });
    text(c, 'This weekend only · Code BOO30', W * 0.07, H * 0.7, W * 0.46, { font: 'Montserrat', weight: 700, size: u * 0.034, fill: WHITE, align: 'left', lines: 2 });
    art(c, 'hw-candy-corn', W * 0.08, H * 0.86, W * 0.07, { rot: -16 });
    art(c, 'hw-candy-corn', W * 0.18, H * 0.88, W * 0.06, { rot: 18 });
  } },
  { id: 'trunk-or-treat', name: 'Trunk or Treat', format: 'flyer', style: 'Illustrated', colors: ['purple', 'orange', 'pink'], occasion: 'trick-or-treat', tags: ['trunk or treat', 'community', 'church', 'school', 'candy', 'kids'], build(c) {
    const { W, H, u } = c;
    scene(c, 'hw-bg-dusk', 'flyer');
    art(c, 'hw-bats', W * 0.6, H * 0.04, W * 0.34);
    text(c, 'Community', W * 0.1, H * 0.08, W * 0.8, { font: 'Montserrat', weight: 800, size: u * 0.04, fill: GOLD, upper: true, spacing: u * 0.014 });
    const t = text(c, 'Trunk or Treat', W * 0.06, H * 0.12, W * 0.88, { font: 'Jolly Lodger', size: u * 0.2, lines: 1, fill: WHITE, lh: 0.92, shadow: drop(u, 'rgba(30,0,40,0.6)'), name: 'Title' });
    const d = text(c, 'Tuesday, October 29 · 4–6 PM', W * 0.1, below(t, u * 0.03), W * 0.8, { font: 'Montserrat', weight: 800, size: u * 0.042, fill: WHITE });
    text(c, 'St. Mark’s parking lot', W * 0.1, below(d, u * 0.01), W * 0.8, { font: 'Montserrat', weight: 600, size: u * 0.034, fill: '#ffe1cf' });
    art(c, 'hw-candy', W * 0.08, H * 0.5, W * 0.3, { rot: -12 });
    art(c, 'hw-candy-corn', W * 0.44, H * 0.48, W * 0.13, { rot: 10 });
    art(c, 'hw-candy', W * 0.6, H * 0.54, W * 0.3, { rot: 14, colors: ['#8bd346', '#ffffff', '#ff5d8f'] });
    pill(c, 'Decorate your trunk & bring candy!', W / 2, H * 0.66, u * 0.026, ORANGE, '#2b1846');
  } },
  { id: 'haunted-trail', name: 'Haunted Trail', format: 'story', style: 'Illustrated', colors: ['blue', 'black', 'yellow'], occasion: 'event', tags: ['haunted', 'trail', 'walk', 'woods', 'scary', 'lantern'], build(c) {
    const { W, H, u } = c;
    scene(c, 'hw-bg-graveyard', 'story');
    art(c, 'hw-tree', -W * 0.12, H * 0.36, W * 0.7, { colors: ['#070b12'] });
    art(c, 'hw-lantern', W * 0.72, 0, W * 0.16);
    art(c, 'hw-eyes', W * 0.08, H * 0.66, W * 0.4);
    text(c, 'Enter if you dare', W * 0.1, H * 0.3, W * 0.8, { font: 'Montserrat', weight: 700, size: u * 0.045, fill: '#cfe3ef', upper: true, spacing: u * 0.012 });
    const t = text(c, 'Haunted Trail', W * 0.06, H * 0.335, W * 0.88, { font: 'Creepster', size: u * 0.2, lines: 2, fill: '#ffe14d', lh: 0.92, maxH: H * 0.2, shadow: glow('#ff9a00', u * 0.03), name: 'Title' });
    const d = text(c, 'Oct 24–31 · Dusk till 11 PM', W * 0.1, below(t, u * 0.04), W * 0.8, { font: 'Montserrat', weight: 800, size: u * 0.05, fill: WHITE });
    text(c, 'Blackwood Forest entrance', W * 0.1, below(d, u * 0.015), W * 0.8, { font: 'Montserrat', weight: 600, size: u * 0.04, fill: '#cfe3ef' });
  } },
  { id: 'class-halloween-party', name: 'Class Halloween Party', format: 'flyer', style: 'Cute', colors: ['cream', 'orange', 'purple'], occasion: 'class-party', tags: ['school', 'class', 'kids', 'party', 'teacher', 'education'], build(c) {
    const { W, H, u } = c;
    c.bg = lin('#fff8ee', '#ffe9d1');
    box(c, 0, H * 0.84, W, H * 0.16, '#3b2160');
    art(c, 'hw-ghosts', W * 0.18, H * 0.04, W * 0.64);
    text(c, 'Class Halloween Party', W * 0.06, H * 0.36, W * 0.88, { font: 'Fredoka', weight: 700, size: u * 0.14, lines: 2, fill: '#3b2160', lh: 1, name: 'Title' });
    text(c, 'Costume parade · Games · Spooky snacks', W * 0.1, H * 0.6, W * 0.8, { font: 'Fredoka', weight: 600, size: u * 0.042, fill: '#c2410c', lines: 2 });
    text(c, 'Friday, Oct 31 · 1:30 PM · Room 12', W * 0.1, H * 0.68, W * 0.8, { font: 'Montserrat', weight: 800, size: u * 0.036, fill: '#3b2160' });
    art(c, 'hw-jack-cute', W * 0.05, H * 0.7, W * 0.2);
    art(c, 'hw-candy-corn', W * 0.82, H * 0.73, W * 0.09, { rot: 14 });
    text(c, 'Please send nut-free treats · Costumes welcome!', W * 0.08, H * 0.885, W * 0.84, { font: 'Montserrat', weight: 700, size: u * 0.03, fill: '#ffe9d1', lines: 2 });
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
    box(c, W * 0.1, H * 0.12, W * 0.8, H * 0.76, '#fff8ee', { radius: u * 0.05, shadow: { color: 'rgba(42,28,63,0.35)', blur: u * 0.03, x: 0, y: u * 0.012 } });
    art(c, 'hw-candy', W * 0.3, H * 0.15, W * 0.4);
    text(c, 'The Great Candy Hunt', W * 0.14, H * 0.36, W * 0.72, { font: 'Henny Penny', size: u * 0.11, lines: 2, fill: '#3b2160', lh: 1.02, name: 'Title' });
    text(c, 'Ages 3–10 · Bring a bucket!', W * 0.16, H * 0.6, W * 0.68, { font: 'Montserrat', weight: 800, size: u * 0.036, fill: '#c2410c' });
    text(c, 'Sat, Oct 26 · 11 AM · Town Green', W * 0.16, H * 0.66, W * 0.68, { font: 'Montserrat', weight: 600, size: u * 0.032, fill: '#3b2160' });
    art(c, 'hw-candy-corn', W * 0.18, H * 0.73, W * 0.08, { rot: -18 });
    art(c, 'hw-candy-corn', W * 0.74, H * 0.73, W * 0.08, { rot: 18 });
  } },
  { id: 'monster-mash', name: 'Monster Mash', format: 'poster', style: 'Bold', colors: ['green', 'black', 'purple'], occasion: 'dance', tags: ['monster', 'dance', 'dj', 'club', 'party', 'night'], build(c) {
    const { W, H, u } = c;
    scene(c, 'hw-bg-night', 'poster', ['#06140c', '#1d3d1a', '#e9ffd0']);
    art(c, 'hw-moon-bats', W * 0.52, H * 0.02, W * 0.46, { colors: ['#e9ffd0', '#0b1a0e', '#c9ff8a'] });
    const t = text(c, 'Monster Mash', W * 0.06, H * 0.27, W * 0.88, { font: 'Creepster', size: u * 0.22, lines: 2, fill: GREEN, lh: 0.92, shadow: glow('#6bff2a', u * 0.03), name: 'Title' });
    const d = text(c, 'Dance party · DJ Drac · Costume contest', W * 0.1, below(t, u * 0.03), W * 0.8, { font: 'Montserrat', weight: 800, size: u * 0.036, fill: WHITE, upper: true, spacing: u * 0.004, lines: 2 });
    text(c, 'Oct 31 · 9 PM · The Vault Club · 18+', W * 0.1, below(d, u * 0.015), W * 0.8, { font: 'Montserrat', weight: 600, size: u * 0.034, fill: '#c9ff8a' });
    art(c, 'hw-eyes', W * 0.1, H * 0.7, W * 0.36);
    art(c, 'hw-fence', -W * 0.02, H * 0.82, W * 1.04, { h: H * 0.13, colors: ['#030805'] });
  } },
  { id: 'halloween-fun-run', name: 'Halloween Fun Run 5K', format: 'poster', style: 'Sporty', colors: ['purple', 'orange', 'pink'], occasion: 'race', tags: ['run', '5k', 'race', 'running', 'sports', 'charity', 'costume'], build(c) {
    const { W, H, u } = c;
    scene(c, 'hw-bg-dusk', 'poster');
    art(c, 'hw-bats', W * 0.06, H * 0.04, W * 0.4);
    const k = text(c, '5K', W * 0.06, H * 0.08, W * 0.88, { font: 'Bebas Neue', size: u * 0.42, fill: GOLD, shadow: drop(u, 'rgba(40,0,40,0.5)'), name: 'Distance' });
    const t = text(c, 'Halloween Fun Run', W * 0.06, below(k, -u * 0.02), W * 0.88, { font: 'Bebas Neue', size: u * 0.13, lines: 1, fill: WHITE, lh: 0.95, name: 'Title' });
    const d = text(c, 'Run in costume · Medals for every finisher', W * 0.1, below(t, u * 0.02), W * 0.8, { font: 'Montserrat', weight: 700, size: u * 0.034, fill: '#ffe1cf', lines: 2 });
    pill(c, 'Sunday, Oct 27 · 9 AM · Lakeside Park', W / 2, below(d, u * 0.03), u * 0.027, ORANGE, '#2b1846');
    art(c, 'hw-pumpkin', W * 0.38, H * 0.6, W * 0.24);
  } },
  { id: 'spooky-story-time', name: 'Spooky Story Time', format: 'card', style: 'Elegant', colors: ['cream', 'black', 'orange'], occasion: 'story-time', tags: ['story', 'library', 'books', 'reading', 'kids', 'cat', 'education'], build(c) {
    const { W, H, u } = c;
    c.bg = lin('#fbf3e4', '#f1e1c6');
    art(c, 'hw-moon', W * 0.62, H * 0.04, W * 0.3, { colors: ['#ffe6a8', '#ffcf5a'] });
    art(c, 'hw-web', W * 0.0, 0, W * 0.3, { colors: ['#b9a98f'] });
    text(c, 'Town Library presents', W * 0.1, H * 0.2, W * 0.8, { font: 'Montserrat', weight: 700, size: u * 0.032, fill: '#9a3d0b', upper: true, spacing: u * 0.01 });
    text(c, 'Spooky Story Time', W * 0.08, H * 0.24, W * 0.84, { font: 'Playfair Display', weight: 700, italic: true, size: u * 0.14, lines: 2, fill: '#2a1f1a', lh: 1, name: 'Title' });
    text(c, 'Not-too-scary tales by candlelight', W * 0.12, H * 0.45, W * 0.76, { font: 'Playfair Display', weight: 700, italic: true, size: u * 0.04, fill: '#7a4a2a' });
    art(c, 'hw-cat', W * 0.14, H * 0.55, W * 0.28);
    art(c, 'hw-candles', W * 0.56, H * 0.58, W * 0.3);
    box(c, W * 0.1, H * 0.85, W * 0.8, 3, '#2a1f1a');
    text(c, 'Ages 4–8 · Thursday, Oct 24 · 4 PM', W * 0.1, H * 0.87, W * 0.8, { font: 'Montserrat', weight: 700, size: u * 0.032, fill: '#2a1f1a' });
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
      text(c, name, W * 0.08, y, W * 0.6, { font: 'Playfair Display', weight: 700, size: u * 0.05, fill: WHITE, align: 'left' });
      text(c, price, W * 0.64, y, W * 0.28, { font: 'Playfair Display', weight: 700, size: u * 0.05, fill: GOLD, align: 'right' });
      text(c, desc, W * 0.08, y + u * 0.065, W * 0.62, { font: 'Montserrat', weight: 600, size: u * 0.03, fill: '#c9bfd6', align: 'left' });
    });
    art(c, 'hw-cat', W * 0.62, H * 0.72, W * 0.26);
    art(c, 'hw-candles', W * 0.06, H * 0.78, W * 0.2);
    text(c, 'Served Oct 25–31', W * 0.3, H * 0.9, W * 0.3, { font: 'Montserrat', weight: 700, size: u * 0.03, fill: ORANGE, align: 'left' });
  } },
];

// ---------- build ----------
export function buildCollectionDoc(t: CollectionTemplate, addedAt: number): Design {
  const f = FORMATS[t.format];
  const c: Kit = { W: f.w, H: f.h, u: Math.min(f.w, f.h), els: [], bg: NIGHT };
  t.build(c);
  return { v: DOC_VERSION, id: `tpl_halloween--${t.id}`, owner: 'system', name: t.name, width: f.w, height: f.h, pages: [newPage(c.bg, c.els)], assets: {}, template: `halloween--${t.id}`, createdAt: addedAt, updatedAt: addedAt };
}
