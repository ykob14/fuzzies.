/**
 * Layout system for the template library: each layout ("archetype") is a different composition — not a recolour —
 * built only from editable elements (text, shapes, photos, graphics, stickers). Layouts adapt to the format
 * (square post, story, poster, flyer, banner, invitation card, certificate) and take any palette + font pairing.
 */
import type { El, Fill, ImageEl, Page, ShapeEl, ShapeKind, TextEl } from '../../editor/types';
import { makeEmoji, makeGraphic, makeImage, makeShape, makeText, newPage } from '../../editor/doc';
import { fitText } from '../../editor/render';
import { ensureFont } from '../fonts';
import type { FontPair, Palette } from './palettes';

export type Kind = 'sports' | 'entertainment' | 'celebrations' | 'community' | 'business' | 'education' | 'creators';
export type Format = 'post' | 'story' | 'poster' | 'flyer' | 'landscape' | 'card' | 'certificate' | 'slides' | 'document' | 'bizcard';

export const FORMATS: Record<Format, { w: number; h: number; label: string }> = {
  post: { w: 1080, h: 1080, label: 'Social post' },
  story: { w: 1080, h: 1920, label: 'Story' },
  poster: { w: 1587, h: 2245, label: 'Poster' },
  flyer: { w: 1240, h: 1754, label: 'Flyer' },
  landscape: { w: 1920, h: 1080, label: 'Banner' },
  card: { w: 1500, h: 2100, label: 'Invitation' },
  certificate: { w: 2000, h: 1414, label: 'Certificate' },
  slides: { w: 1920, h: 1080, label: 'Presentation' },
  document: { w: 1275, h: 1650, label: 'Document' },      // US Letter, résumés & CVs
  bizcard: { w: 1050, h: 600, label: 'Business card' },  // 3.5 × 2 in at 300 dpi
};

export interface EventText { title: string; kicker: string; details: string[]; cta: string; occasion: string }
export interface Ctx {
  W: number; H: number; u: number;
  portrait: boolean; land: boolean;
  pal: Palette; f: FontPair;
  ev: EventText; motif: string; label: string; kind: Kind;
  seed: number;
  assets: Record<string, string>;
}
export interface Archetype {
  id: string;
  label: string;
  style: string; // style filter word
  voices: string[]; // font pairings that suit it (FONTS keys)
  formats: Format[];
  /** Which categories it suits, plus extra subcategories outside those (`also`). */
  kinds: Kind[];
  also?: string[];
  build(c: Ctx): { bg: Fill; els: El[] }[];
  /** Whether this layout makes sense for a piece of content (default: always). */
  fits?(ev: EventText): boolean;
}

// ---------- element helpers ----------
const lines = (ev: EventText) => ev.details.filter((d) => d && d.trim());
/** The detail lines, one under another, shrunk until they end above `floor` (where the call-to-action sits) — long details
 * used to run into the button underneath them. */
function details(c: Ctx, x: number, y: number, w: number, o: Partial<TextEl> & { size: number }, gap: number, floor: number): { els: El[]; y: number } {
  let els: El[] = [], end = y;
  for (const k of [1, 0.88, 0.77, 0.67, 0.58]) {
    els = []; end = y;
    for (const d of lines(c.ev)) { const e = txt(c, d, x, end, w, { ...o, size: o.size * k }); els.push(e); end += e.h + gap * k; }
    if (end <= floor) break;
  }
  return { els, y: end };
}

function txt(c: Ctx, s: string, x: number, y: number, w: number, o: Partial<TextEl> = {}): TextEl {
  const el = makeText(s, { w, align: 'left', font: c.f.body, weight: 500, fill: c.pal.ink, lineHeight: 1.2, ...o });
  ensureFont(el.font, el.weight, el.italic);
  el.x = x; el.y = y;
  fitText(el);
  return el;
}
// Text is measured with the real font (once fonts have loaded; the library rebuilds then), so titles never break mid-word.
let mctx: CanvasRenderingContext2D | null = null;
export function widthOf(s: string, font: string, weight: number, size: number, upper = false, spacing = 0): number {
  mctx ??= document.createElement('canvas').getContext('2d')!;
  mctx.font = `${weight} ${size}px "${font}", sans-serif`;
  const t = upper ? s.toUpperCase() : s;
  return mctx.measureText(t).width + spacing * t.length;
}
function lineCount(s: string, font: string, weight: number, size: number, w: number, upper: boolean, spacing: number): number {
  let n = 1, cur = 0;
  const space = widthOf(' ', font, weight, size, upper, spacing);
  for (const word of s.split(/\s+/)) {
    const ww = widthOf(word, font, weight, size, upper, spacing);
    if (cur && cur + space + ww > w) { n++; cur = ww; } else cur += (cur ? space : 0) + ww;
  }
  return n;
}
/** The biggest size ≤ maxSize where every word fits the width, in at most maxLines lines (and maxH tall, if given). */
export function fitSize(s: string, font: string, weight: number, w: number, maxSize: number, maxLines: number, o: { upper?: boolean; spacing?: number; maxH?: number; lh?: number } = {}): number {
  const upper = !!o.upper, lh = o.lh ?? 1;
  const longest = Math.max(...s.split(/\s+/).map((x) => widthOf(x, font, weight, 100, upper, (o.spacing ?? 0) / 100 * 100)), 1) / 100;
  let size = Math.min(maxSize, (w * 0.96) / longest);
  for (let i = 0; i < 24; i++) {
    const n = lineCount(s, font, weight, size, w * 0.98, upper, (o.spacing ?? 0));
    if (n <= maxLines && (!o.maxH || n * size * lh <= o.maxH)) break;
    size *= 0.93;
  }
  return Math.round(size);
}
/** A display title sized to fit `w` in at most `maxLines` lines (and `maxH` tall). */
function title(c: Ctx, s: string, x: number, y: number, w: number, maxSize: number, o: Partial<TextEl> & { maxLines?: number; maxH?: number } = {}): TextEl {
  const font = o.font ?? c.f.display;
  const weight = o.weight ?? c.f.displayWeight;
  const { maxLines = 2, maxH, ...rest } = o;
  const size = fitSize(s, font, weight, w, maxSize, maxLines, { upper: !!o.uppercase, spacing: o.letterSpacing ?? 0, maxH, lh: o.lineHeight ?? 0.98 });
  return txt(c, s, x, y, w, { font, weight, size, lineHeight: 0.98, ...rest });
}
/** Does this event have a number worth shouting about (25 years, 60% off, Class of 2025, $24)? */
export function statNumber(ev: EventText): string | null {
  const m = /(\$?\d+(?:[.,]\d+)?\s?(?:%|k\b|km\b)?)/i.exec(`${ev.title} ${ev.kicker}`) ?? /(\$\d+|\d+(?:[.,]\d+)?\s?(?:%|km\b))/i.exec(ev.details.join(' '));
  return m ? m[1].replace(/\s/g, '') : null;
}

function shp(kind: ShapeKind, x: number, y: number, w: number, h: number, fill: Fill, o: Partial<ShapeEl> = {}): ShapeEl {
  const el = makeShape(kind, { fill, ...o });
  Object.assign(el, { x, y, w, h });
  return el;
}
function emoji(c: Ctx, x: number, y: number, size: number, rotation = 0) {
  const el = makeEmoji(c.motif, size);
  el.x = x; el.y = y; el.rotation = rotation;
  el.name = `${c.label} sticker`;
  return el;
}
function art(id: string, x: number, y: number, w: number, h: number, colors: string[], rotation = 0) {
  const el = makeGraphic(id, w);
  Object.assign(el, { x, y, w, h, colors, rotation });
  return el;
}
function photo(c: Ctx, i: number, x: number, y: number, w: number, h: number, o: Partial<ImageEl> = {}): ImageEl {
  const id = `ph-${c.pal.id}-${(c.seed + i) % 7}`;
  c.assets[id] = photoAsset(c.pal, (c.seed + i) % 7);
  const el = makeImage(id, w, h, o);
  Object.assign(el, { x, y, w, h });
  el.name = 'Photo — tap to add yours';
  return el;
}
const pill = (c: Ctx, s: string, cx: number, y: number, fill: string, ink: string, size: number, align: 'center' | 'left' = 'center', x0 = 0): El[] => {
  if (!s) return [];
  const t = txt(c, s, 0, 0, 10_000, { font: c.f.body, weight: 700, size, fill: ink, align: 'center' });
  const est = Math.min(c.W * 0.86, s.length * size * 0.62 + size * 2.2);
  t.w = est; fitText(t);
  const x = align === 'center' ? cx - est / 2 : x0;
  t.x = x; t.y = y + size * 0.55;
  return [shp('rect', x, y, est, t.h + size * 1.1, fill, { radius: (t.h + size * 1.1) / 2 }), t];
};
const lin = (from: string, to: string, angle = 180): Fill => ({ kind: 'linear', angle, stops: [{ at: 0, color: from }, { at: 1, color: to }] });
const alpha = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

// ---------- procedural "photo" placeholders (soft, on-palette, clearly replaceable) ----------
const photoCache = new Map<string, string>();
export function photoAsset(p: Palette, seed: number): string {
  const key = `${p.id}-${seed}`;
  const hit = photoCache.get(key);
  if (hit) return hit;
  const W = 960, H = 720;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const x = cv.getContext('2d')!;
  let s = seed * 9301 + 49297;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const g = x.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, p.secondary); g.addColorStop(1, p.primary);
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  for (let i = 0; i < 16; i++) {
    const cx = rnd() * W, cy = rnd() * H, r = 60 + rnd() * 260;
    const rg = x.createRadialGradient(cx, cy, 0, cx, cy, r);
    const col = [p.accent, '#ffffff', p.primary, p.secondary][i % 4];
    rg.addColorStop(0, alpha(col.startsWith('#') && col.length === 7 ? col : '#ffffff', 0.38 + rnd() * 0.3));
    rg.addColorStop(1, alpha(col.startsWith('#') && col.length === 7 ? col : '#ffffff', 0));
    x.fillStyle = rg; x.fillRect(0, 0, W, H);
  }
  // a small camera mark says "put your photo here"
  x.globalAlpha = 0.5; x.strokeStyle = '#ffffff'; x.lineWidth = 10; x.lineJoin = 'round';
  x.beginPath(); x.roundRect(W / 2 - 70, H / 2 - 44, 140, 98, 18); x.stroke();
  x.beginPath(); x.arc(W / 2, H / 2 + 5, 26, 0, Math.PI * 2); x.stroke();
  x.beginPath(); x.moveTo(W / 2 - 30, H / 2 - 44); x.lineTo(W / 2 - 18, H / 2 - 62); x.lineTo(W / 2 + 18, H / 2 - 62); x.lineTo(W / 2 + 30, H / 2 - 44); x.stroke();
  const url = cv.toDataURL('image/jpeg', 0.8);
  photoCache.set(key, url);
  return url;
}

// ---------- the layouts ----------
const ALL: Kind[] = ['sports', 'entertainment', 'celebrations', 'community', 'business', 'education', 'creators'];

export const ARCHETYPES: Archetype[] = [
  {
    id: 'split', label: 'Bold split', style: 'Bold', voices: ['bold', 'heavy', 'condensed'], formats: ['post', 'story', 'poster', 'flyer', 'landscape'],
    kinds: ['sports', 'entertainment', 'community', 'business', 'education'],
    build(c) {
      const { W, H, u, pal, ev } = c;
      const pad = u * 0.08;
      const top = H * (c.land ? 0.62 : c.portrait ? 0.56 : 0.58);
      const els: El[] = [
        shp('rect', 0, 0, W, top, pal.primary),
        shp('rect', -W * 0.1, top - u * 0.1, W * 1.2, u * 0.2, pal.primary, { rotation: -4 }),
        shp('rect', -W * 0.1, top + u * 0.07, W * 0.7, u * 0.035, pal.accent, { rotation: -4 }),
      ];
      const k = txt(c, ev.kicker, pad, pad, W * 0.7, { weight: 700, size: u * 0.04, fill: pal.onPrimary, uppercase: true, letterSpacing: u * 0.006, opacity: 0.92 });
      const t = title(c, ev.title, pad, k.y + k.h + u * 0.03, W - pad * 2 - (c.land ? W * 0.18 : u * 0.06), u * (c.portrait ? 0.24 : 0.2), { fill: pal.onPrimary, uppercase: true, maxLines: 3, maxH: top - (k.y + k.h + u * 0.03) - u * 0.22 });
      els.push(k, t, emoji(c, W - u * 0.32 - pad * 0.5, top - u * 0.2, u * 0.32, 12));
      // the details shrink until they and the pill fit above the bottom edge (long ones used to push the pill off the page)
      const pillH = u * 0.11, floor = H - pad * 0.6 - pillH;
      let y = 0, det: El[] = [];
      for (const k2 of [1, 0.86, 0.74, 0.62]) {
        y = top + u * 0.16 * Math.max(0.6, k2); det = [];
        for (const [i, d] of lines(ev).entries()) {
          const e = txt(c, d, pad, y, W * 0.78, { weight: i ? 500 : 800, size: u * (i ? 0.042 : 0.054) * k2, fill: i ? pal.muted : pal.ink });
          det.push(e); y += e.h + u * 0.025 * k2;
        }
        if (y + u * 0.03 <= floor) break;
      }
      els.push(...det);
      els.push(...pill(c, ev.cta, 0, Math.min(floor, Math.max(y + u * 0.03, H - pad - pillH)), pal.secondary, pal.onPrimary, u * 0.036, 'left', pad));
      return [{ bg: pal.bg, els }];
    },
  },
  {
    id: 'badge', label: 'Centred badge', style: 'Playful', voices: ['playful', 'geometric', 'heavy'], formats: ['post', 'story', 'flyer', 'poster', 'card'],
    kinds: ALL,
    build(c) {
      const { W, H, u, pal, ev } = c;
      const cx = W / 2;
      // the badge gives up size when the words need the room (long details used to end up under the button)
      const need = u * (0.07 + 0.16 + lines(ev).length * 0.065 + (ev.cta ? 0.21 : 0.06));
      const r = Math.max(u * 0.12, Math.min(u * (c.portrait ? 0.3 : 0.26), (H - need - u * 0.14) / 2.36));
      const by = Math.max(u * 0.08 + r * 0.18, Math.min(H * (c.portrait ? 0.3 : 0.36) - r, H - need - r * 2.25 - u * 0.03));
      const els: El[] = [
        art('dots', -u * 0.04, -u * 0.04, u * 0.28, u * 0.28, [alpha(pal.secondary, 0.35)]),
        art('dots', W - u * 0.24, H - u * 0.24, u * 0.28, u * 0.28, [alpha(pal.secondary, 0.35)]),
        shp('burst', cx - r * 1.18, by - r * 0.18, r * 2.36, r * 2.36, pal.accent, { rotation: 8 }),
        shp('ellipse', cx - r, by, r * 2, r * 2, pal.primary),
        shp('ring', cx - r * 0.86, by + r * 0.14, r * 1.72, r * 1.72, 'rgba(0,0,0,0)', { stroke: pal.onPrimary, strokeWidth: u * 0.008, dash: true }),
        emoji(c, cx - r * 0.55, by + r * 0.45, r * 1.1),
      ];
      const k = txt(c, ev.kicker, W * 0.1, by + r * 2.25 + u * 0.03, W * 0.8, { align: 'center', weight: 700, size: u * 0.038, fill: pal.primary, uppercase: true, letterSpacing: u * 0.005 });
      const t = title(c, ev.title, W * 0.07, k.y + k.h + u * 0.02, W * 0.86, u * 0.15, { align: 'center', fill: pal.ink, maxLines: 3, maxH: H - (k.y + k.h + u * 0.02) - u * (lines(ev).length * 0.06 + (ev.cta ? 0.2 : 0.08)) });
      els.push(k, t);
      let y = t.y + t.h + u * 0.04;
      const dt = details(c, W * 0.1, y, W * 0.8, { align: 'center', size: u * 0.04, fill: pal.muted, weight: 600 }, u * 0.015, H - u * 0.16 - u * 0.04);
      els.push(...dt.els); y = dt.y;
      els.push(...pill(c, ev.cta, cx, Math.min(y + u * 0.05, H - u * 0.16), pal.secondary, pal.onPrimary, u * 0.034));
      return [{ bg: pal.bg, els }];
    },
  },
  {
    id: 'photo', label: 'Photo hero', style: 'Photo', voices: ['condensed', 'modern', 'bold'], formats: ['post', 'story', 'poster', 'landscape'],
    kinds: ALL,
    build(c) {
      const { W, H, u, pal, ev } = c;
      const pad = u * 0.08;
      const els: El[] = [
        photo(c, 0, 0, 0, W, H),
        shp('rect', 0, H * 0.35, W, H * 0.65, lin('rgba(0,0,0,0)', 'rgba(0,0,0,0.78)')),
        shp('rect', pad, pad, u * 0.012, u * 0.14, pal.accent),
      ];
      const k = txt(c, ev.kicker, pad + u * 0.04, pad, W * 0.7, { weight: 700, size: u * 0.04, fill: '#ffffff', uppercase: true, letterSpacing: u * 0.006 });
      const d = lines(ev);
      const ds = d.map((s, i) => txt(c, s, pad, 0, W * 0.8, { weight: i ? 500 : 700, size: u * (i ? 0.038 : 0.046), fill: i ? 'rgba(255,255,255,0.85)' : '#ffffff' }));
      const t = title(c, ev.title, pad, 0, W * (c.land ? 0.62 : 0.84), u * (c.portrait ? 0.2 : 0.17), { fill: '#ffffff', uppercase: true, maxLines: 3, maxH: H * 0.42 });
      let y = H - pad - (ev.cta ? u * 0.12 : 0) - ds.reduce((a, e) => a + e.h + u * 0.015, 0);
      t.y = y - t.h - u * 0.04;
      els.push(k, t);
      for (const e of ds) { e.y = y; els.push(e); y += e.h + u * 0.015; }
      els.push(...pill(c, ev.cta, 0, H - pad - u * 0.09, pal.accent, pal.dark ? pal.bg : pal.ink, u * 0.034, 'left', pad));
      return [{ bg: pal.secondary, els }];
    },
  },
  {
    id: 'ticket', label: 'Ticket', style: 'Retro', voices: ['condensed', 'heavy', 'bold'], formats: ['post', 'story', 'flyer', 'landscape'],
    kinds: ['entertainment', 'sports', 'celebrations', 'community'],
    build(c) {
      const { W, H, u, pal, ev } = c;
      const m = u * 0.08;
      const tw = W - m * 2, th = H - m * 2;
      const stubH = c.land ? 0 : th * 0.26;
      const stubW = c.land ? tw * 0.28 : 0;
      const els: El[] = [
        art('checker', 0, 0, W, u * 0.05, [alpha(pal.onPrimary, 0.18), 'rgba(0,0,0,0)']),
        shp('rect', m, m, tw, th, pal.surface, { radius: u * 0.04, shadow: { color: 'rgba(0,0,0,0.25)', blur: u * 0.04, x: 0, y: u * 0.015 } } as Partial<ShapeEl>),
      ];
      // perforation with notches
      const notch = u * 0.06;
      if (c.land) {
        const px = m + tw - stubW;
        els.push(shp('line', px - th / 2 + u * 0.01, m + th / 2, th - notch, u * 0.01, pal.muted, { strokeWidth: u * 0.006, dash: true, rotation: 90 }),
          shp('ellipse', px - notch / 2, m - notch / 2, notch, notch, pal.primary), shp('ellipse', px - notch / 2, m + th - notch / 2, notch, notch, pal.primary));
      } else {
        const py = m + th - stubH;
        els.push(shp('line', m + notch / 2, py, tw - notch, u * 0.01, pal.muted, { strokeWidth: u * 0.006, dash: true }),
          shp('ellipse', m - notch / 2, py - notch / 2, notch, notch, pal.primary), shp('ellipse', m + tw - notch / 2, py - notch / 2, notch, notch, pal.primary));
      }
      const bodyW = tw - stubW - u * 0.14;
      const bx = m + u * 0.07;
      const k = txt(c, ev.kicker, bx, m + u * 0.08, bodyW, { weight: 700, size: u * 0.036, fill: pal.primary, uppercase: true, letterSpacing: u * 0.008 });
      const t = title(c, ev.title, bx, k.y + k.h + u * 0.02, bodyW - (c.land || !c.portrait ? u * 0.16 : 0), u * (c.portrait ? 0.24 : 0.17), { fill: pal.ink, uppercase: true, maxLines: c.portrait ? 4 : 2, maxH: (c.land ? th : th - stubH) - u * 0.42 });
      const block: El[] = [k, t];
      let y = t.y + t.h + u * 0.04;
      for (const d of lines(ev)) { const e = txt(c, d, bx, y, bodyW, { size: u * 0.04, fill: pal.muted, weight: 600 }); block.push(e); y += e.h + u * 0.012; }
      if (c.portrait) { // centre the text block in the ticket body
        const free = (m + th - stubH) - y - u * 0.06;
        if (free > 0) for (const e of block) e.y += free / 2;
        els.push(...block, emoji(c, m + tw - u * 0.25, m + th - stubH - u * 0.24, u * 0.17, -10));
      } else els.push(...block, emoji(c, m + tw - stubW - u * 0.24, m + u * 0.06, u * 0.18, -10));
      // the stub: ADMIT ONE + call to action
      const sx = c.land ? m + tw - stubW + u * 0.05 : bx, sy = c.land ? m + u * 0.1 : m + th - stubH + u * 0.07, sw = c.land ? stubW - u * 0.1 : bodyW;
      const a = txt(c, 'ADMIT ONE', sx, sy, sw, { font: c.f.display, weight: c.f.displayWeight, size: u * 0.07, fill: pal.secondary, letterSpacing: u * 0.008, align: c.land ? 'center' : 'left' });
      const cta = txt(c, ev.cta || c.label, sx, a.y + a.h + u * 0.02, sw, { size: u * 0.032, fill: pal.ink, weight: 700, align: c.land ? 'center' : 'left' });
      const no = txt(c, `Nº ${String(100 + (c.seed % 900)).padStart(4, '0')}`, sx, cta.y + cta.h + u * 0.02, sw, { size: u * 0.028, fill: pal.muted, weight: 600, letterSpacing: u * 0.004, align: c.land ? 'center' : 'left' });
      els.push(a, cta, no);
      return [{ bg: pal.primary, els }];
    },
  },
  {
    id: 'matchup', label: 'Match-up', style: 'Sporty', voices: ['bold', 'condensed', 'heavy'], formats: ['post', 'story', 'landscape', 'poster'],
    kinds: ['sports'], also: ['gaming', 'trivia'],
    fits: (ev) => ['game', 'tournament'].includes(ev.occasion), // team against team
    build(c) {
      const { W, H, u, pal, ev } = c;
      const els: El[] = [];
      const band = H * (c.land ? 0.24 : 0.2);
      const k = txt(c, ev.kicker, u * 0.07, u * 0.06, W - u * 0.14, { align: 'center', weight: 700, size: u * 0.036, fill: pal.accent, uppercase: true, letterSpacing: u * 0.01 });
      const t = title(c, ev.title, u * 0.07, k.y + k.h + u * 0.01, W - u * 0.14, band * 0.62, { align: 'center', fill: pal.onPrimary, uppercase: true, maxLines: 1 });
      const midTop = band + u * 0.02, midH = H - band - (c.land ? H * 0.2 : H * 0.18);
      const half = (side: 0 | 1) => {
        const x = c.land ? side * W / 2 : 0, y = c.land ? midTop : midTop + side * midH / 2;
        const w = c.land ? W / 2 : W, h = c.land ? midH : midH / 2;
        const fill = side ? pal.secondary : pal.primary;
        els.push(shp('rect', x, y, w, h, fill));
        const lab = txt(c, side ? 'AWAY' : 'HOME', x, y + h * 0.16, w, { align: 'center', weight: 700, size: u * 0.032, fill: alpha('#ffffff', 0.75), letterSpacing: u * 0.012 });
        const name = title(c, side ? 'Hawks' : 'Eagles', x + w * 0.1, lab.y + lab.h + u * 0.01, w * 0.8, Math.min(h * 0.42, u * 0.18), { align: 'center', fill: '#ffffff', uppercase: true, maxLines: 1 });
        els.push(lab, name);
      };
      half(0); half(1);
      const vs = u * 0.17;
      const vx = W / 2 - vs / 2, vy = (c.land ? midTop + midH / 2 : midTop + midH / 2) - vs / 2;
      els.push(shp('ellipse', vx - u * 0.015, vy - u * 0.015, vs + u * 0.03, vs + u * 0.03, pal.bg), shp('ellipse', vx, vy, vs, vs, pal.accent),
        txt(c, 'VS', vx, vy + vs * 0.22, vs, { align: 'center', font: c.f.display, weight: c.f.displayWeight, size: vs * 0.42, fill: pal.dark ? pal.bg : pal.ink }),
        emoji(c, c.land ? W / 2 - u * 0.06 : W - u * 0.2, c.land ? midTop + midH - u * 0.16 : midTop + u * 0.03, u * 0.12, 10));
      let y = midTop + midH + u * 0.05;
      const d = lines(ev).join('  ·  ');
      // the joined details stay on one line so the call to action keeps its place inside the page
      if (d) { const e = txt(c, d, u * 0.06, y, W - u * 0.12, { align: 'center', weight: 700, size: fitSize(d, c.f.body, 700, W - u * 0.12, u * 0.042, 1), fill: pal.onPrimary }); els.push(e); y += e.h + u * 0.02; }
      if (ev.cta) els.push(txt(c, ev.cta, u * 0.06, y, W - u * 0.12, { align: 'center', weight: 600, size: u * 0.032, fill: pal.accent, uppercase: true, letterSpacing: u * 0.006 }));
      els.unshift(k, t);
      return [{ bg: pal.dark ? pal.bg : '#14141c', els }];
    },
  },
  {
    id: 'editorial', label: 'Editorial', style: 'Minimal', voices: ['serif', 'elegant', 'modern'], formats: ['post', 'story', 'poster', 'flyer', 'card', 'landscape'],
    kinds: ALL,
    build(c) {
      const { W, H, u, pal, ev } = c;
      const m = u * 0.05, pad = u * 0.12;
      const els: El[] = [shp('rect', m, m, W - m * 2, H - m * 2, 'rgba(0,0,0,0)', { stroke: alpha(pal.ink.length === 7 ? pal.ink : '#000000', 0.25), strokeWidth: u * 0.003 })];
      const k = txt(c, ev.kicker.toUpperCase(), pad, pad, W - pad * 2, { size: u * 0.03, weight: 600, fill: pal.muted, letterSpacing: u * 0.012 });
      const t = title(c, ev.title, pad, k.y + k.h + u * 0.05, W - pad * 2 - (c.land ? W * 0.2 : 0), u * (c.portrait ? 0.22 : c.land ? 0.21 : 0.15), { fill: pal.ink, maxLines: c.portrait ? 4 : 3, lineHeight: 1.05, maxH: H * (c.portrait ? 0.45 : 0.42) });
      const rule = shp('line', pad, t.y + t.h + u * 0.05, u * 0.2, u * 0.02, pal.primary, { strokeWidth: u * 0.008 });
      els.push(k, t, rule);
      const d = lines(ev);
      let y = rule.y + u * 0.07;
      const colW = c.land ? (W - pad * 2) / 2 - u * 0.03 : W - pad * 2;
      d.forEach((s, i) => {
        const e = txt(c, s, c.land && i ? pad + colW + u * 0.06 : pad, c.land ? y : y, colW, { size: u * 0.042, fill: pal.ink, weight: i ? 400 : 600, font: c.f.body });
        els.push(e); if (!c.land) y += e.h + u * 0.02; else if (i === d.length - 1) y += e.h;
      });
      if (ev.cta) els.push(txt(c, `${ev.cta}  →`, pad, Math.max(y + u * 0.06, H - pad - u * 0.06), W - pad * 2, { size: u * 0.036, weight: 700, fill: pal.primary }));
      els.push(emoji(c, W - pad - u * 0.11, H - pad - u * 0.12, u * 0.11));
      return [{ bg: pal.surface, els }];
    },
  },
  {
    id: 'burst', label: 'Retro burst', style: 'Retro', voices: ['heavy', 'playful', 'geometric'], formats: ['post', 'story', 'poster', 'flyer'],
    kinds: ['entertainment', 'sports', 'business', 'community', 'celebrations', 'creators'],
    build(c) {
      const { W, H, u, pal, ev } = c;
      const cx = W / 2, cy = H * (c.portrait ? 0.42 : 0.46);
      const R = Math.max(W, H) * 0.62;
      const els: El[] = [
        shp('burst', cx - R, cy - R, R * 2, R * 2, alpha(pal.accent, 0.35), { rotation: 6 }),
        shp('ellipse', cx - u * 0.42, cy - u * 0.42, u * 0.84, u * 0.84, alpha('#ffffff', 0.18)),
        art('checker', 0, H - u * 0.1, W, u * 0.1, [pal.ink, pal.surface]),
      ];
      const k = pill(c, ev.kicker, cx, H * (c.portrait ? 0.12 : 0.09), pal.ink, pal.surface, u * 0.034);
      const t = title(c, ev.title, W * 0.08, 0, W * 0.84, u * (c.portrait ? 0.21 : 0.17), { align: 'center', fill: pal.surface, uppercase: true, strokeColor: pal.ink, strokeWidth: u * 0.008, maxLines: 3, maxH: H * 0.36 });
      t.y = cy - t.h / 2;
      const floor = H - u * 0.26 - u * 0.03;
      let y = t.y + t.h + u * 0.06;
      const dt = details(c, W * 0.1, y, W * 0.8, { align: 'center', weight: 800, size: u * 0.045, fill: pal.ink }, u * 0.012, floor);
      // still too tall: lift the title and details together (never into the kicker), so nothing hides behind the button
      const kBottom = Math.max(...k.map((e) => e.y + e.h));
      const lift = Math.max(0, Math.min(dt.y - floor, t.y - kBottom - u * 0.03));
      t.y -= lift; for (const e of dt.els) e.y -= lift;
      y = dt.y - lift;
      const ey = t.y - u * 0.24;
      els.push(...k, ...(ey > kBottom + u * 0.01 ? [emoji(c, cx - u * 0.1, ey, u * 0.2, -8)] : []), t, ...dt.els);
      els.push(...pill(c, ev.cta, cx, Math.min(y + u * 0.04, H - u * 0.26), pal.secondary, pal.onPrimary, u * 0.034));
      return [{ bg: pal.primary, els }];
    },
  },
  {
    id: 'stack', label: 'Stacked type', style: 'Modern', voices: ['bold', 'condensed', 'heavy'], formats: ['post', 'story', 'poster'],
    kinds: ['sports', 'entertainment', 'business', 'creators'],
    build(c) {
      const { W, H, u, pal, ev } = c;
      const pad = u * 0.07;
      const word = ev.title.split(/\s+/).sort((a, b) => b.length - a.length)[0].replace(/[^\p{L}\p{N}!?&'-]/gu, '') || ev.title;
      const els: El[] = [shp('rect', 0, H * 0.72, W, H * 0.28, pal.primary)];
      const rows = c.portrait ? 5 : 3;
      const y0 = H * (c.portrait ? 0.2 : 0.16);
      const room = H * 0.72 - y0 - u * 0.04;
      const size = Math.min(fitSize(word, c.f.display, c.f.displayWeight, W - pad * 2, u * 0.5, 1, { upper: true }), room / (rows * 0.9));
      const lh = size * 0.92;
      for (let i = 0; i < rows; i++) {
        const solid = i === rows - 1;
        els.push(txt(c, word, pad, y0 + i * lh * 0.98, W - pad * 2, { font: c.f.display, weight: c.f.displayWeight, size, lineHeight: 0.92, uppercase: true, align: 'center',
          fill: solid ? pal.primary : 'rgba(0,0,0,0)', strokeColor: solid ? '' : pal.ink, strokeWidth: solid ? 0 : Math.max(2, size * 0.02), opacity: solid ? 1 : 0.22 + i * 0.16 }));
      }
      // kicker top-left and call to action top-right each keep their own half (they used to overlap in the middle)
      const half = (W - pad * 2) / 2 - u * 0.02;
      const k = txt(c, ev.kicker, pad, pad, half, { weight: 700, size: fitSize(ev.kicker, c.f.body, 700, half, u * 0.034, 2, { upper: true, spacing: u * 0.008 }), fill: pal.ink, uppercase: true, letterSpacing: u * 0.008 });
      const fw = W - pad * 2 - u * 0.2, band = H * 0.28 - u * 0.08;
      const fs = fitSize(ev.title, c.f.display, c.f.displayWeight, fw, u * 0.07, 2, { upper: true, maxH: band * 0.45, lh: 1 });
      const full = txt(c, ev.title, pad, H * 0.72 + u * 0.05, fw, { font: c.f.display, weight: c.f.displayWeight, size: fs, fill: pal.onPrimary, uppercase: true, lineHeight: 1 });
      let y = full.y + full.h + u * 0.025;
      els.push(k, full, emoji(c, W - pad - u * 0.16, H * 0.72 + u * 0.05, u * 0.15, 8));
      const ds = lines(ev), room2 = H - pad * 0.6 - y, dsSize = Math.min(u * 0.034, room2 / Math.max(1, ds.length) / 1.35);
      for (const d of ds) { const e = txt(c, d, pad, y, W - pad * 2, { size: dsSize, weight: 600, fill: pal.onPrimary, opacity: 0.9 }); els.push(e); y += e.h + u * 0.008; }
      if (ev.cta) els.push(txt(c, ev.cta.toUpperCase(), W - pad - half, pad, half, { align: 'right', size: fitSize(ev.cta, c.f.body, 700, half, u * 0.03, 2, { upper: true, spacing: u * 0.006 }), weight: 700, fill: pal.primary, letterSpacing: u * 0.006 }));
      return [{ bg: pal.bg, els }];
    },
  },
  {
    id: 'collage', label: 'Photo collage', style: 'Photo', voices: ['playful', 'modern', 'elegant'], formats: ['post', 'story', 'poster', 'landscape'],
    kinds: ['celebrations', 'community', 'business', 'education', 'sports', 'creators'],
    build(c) {
      const { W, H, u, pal, ev } = c;
      const els: El[] = [art('confetti', 0, 0, W, W / 1.5, [alpha(pal.primary, 0.35), alpha(pal.accent, 0.5), alpha(pal.secondary, 0.3)])];
      const frame = { stroke: '#ffffff', strokeWidth: u * 0.018, shadow: { color: 'rgba(0,0,0,0.22)', blur: u * 0.03, x: 0, y: u * 0.012 } };
      if (c.land) {
        els.push(photo(c, 0, W * 0.05, H * 0.1, W * 0.34, H * 0.62, { ...frame, rotation: -4 } as Partial<ImageEl>),
          photo(c, 1, W * 0.33, H * 0.22, W * 0.26, H * 0.5, { ...frame, rotation: 5 } as Partial<ImageEl>));
      } else {
        const ph = H * (c.portrait ? 0.3 : 0.38);
        els.push(photo(c, 0, W * 0.06, H * 0.06, W * 0.56, ph, { ...frame, rotation: -4 } as Partial<ImageEl>),
          photo(c, 1, W * 0.52, H * 0.1, W * 0.42, ph * 0.8, { ...frame, rotation: 5 } as Partial<ImageEl>),
          photo(c, 2, W * 0.3, H * 0.06 + ph * 0.72, W * 0.4, ph * 0.62, { ...frame, rotation: -1 } as Partial<ImageEl>));
      }
      const bx = c.land ? W * 0.62 : W * 0.07, bw = c.land ? W * 0.33 : W * 0.86;
      const by = c.land ? H * 0.16 : H * (c.portrait ? 0.62 : 0.66);
      const k = txt(c, ev.kicker, bx, by, bw, { font: c.f.script ?? c.f.display, weight: 400, size: u * 0.06, fill: pal.primary, align: c.land ? 'left' : 'center' });
      const t = title(c, ev.title, bx, k.y + k.h + u * 0.01, bw, u * 0.13, { fill: pal.ink, align: c.land ? 'left' : 'center', maxLines: 3, maxH: H - (k.y + k.h) - u * 0.26 });
      els.push(k, t);
      let y = t.y + t.h + u * 0.03;
      for (const d of lines(ev)) { const e = txt(c, d, bx, y, bw, { size: u * 0.038, weight: 600, fill: pal.muted, align: c.land ? 'left' : 'center' }); els.push(e); y += e.h + u * 0.01; }
      els.push(...pill(c, ev.cta, bx + bw / 2, y + u * 0.035, pal.primary, pal.onPrimary, u * 0.032, c.land ? 'left' : 'center', bx));
      return [{ bg: pal.surface, els }];
    },
  },
  {
    id: 'certificate', label: 'Certificate', style: 'Elegant', voices: ['elegant', 'serif'], formats: ['certificate'],
    kinds: [], also: ['certificate', 'awards', 'marathon', 'martial-arts', 'graduation'],
    build(c) {
      const { W, H, u, pal, ev } = c;
      const m = u * 0.05;
      const d = lines(ev);
      const els: El[] = [
        shp('rect', m, m, W - m * 2, H - m * 2, 'rgba(0,0,0,0)', { stroke: pal.primary, strokeWidth: u * 0.012 }),
        shp('rect', m * 1.6, m * 1.6, W - m * 3.2, H - m * 3.2, 'rgba(0,0,0,0)', { stroke: pal.secondary, strokeWidth: u * 0.004 }),
        art('sparkle', m * 1.9, m * 1.9, u * 0.07, u * 0.07, [pal.secondary, pal.surface]),
        art('sparkle', W - m * 1.9 - u * 0.07, m * 1.9, u * 0.07, u * 0.07, [pal.secondary, pal.surface]),
      ];
      const t = title(c, ev.title.toUpperCase(), W * 0.12, H * 0.14, W * 0.76, u * 0.09, { align: 'center', fill: pal.primary, letterSpacing: u * 0.006, maxLines: 1 });
      const k = txt(c, ev.kicker, W * 0.15, t.y + t.h + u * 0.06, W * 0.7, { align: 'center', size: u * 0.036, fill: pal.muted, italic: true, font: c.f.body });
      // the name stays on one line and the description on two, so neither runs into the date / signature lines
      const nm = d[0] ?? 'Your Name', nf = c.f.script ?? c.f.display;
      const name = txt(c, nm, W * 0.1, k.y + k.h + u * 0.04, W * 0.8, { align: 'center', font: nf, weight: 400, size: fitSize(nm, nf, 400, W * 0.8, u * 0.12, 1), fill: pal.ink });
      const line = shp('line', W * 0.25, name.y + name.h + u * 0.02, W * 0.5, u * 0.01, pal.secondary, { strokeWidth: u * 0.003 });
      const ds = d[1] ?? '';
      const desc = txt(c, ds, W * 0.15, line.y + u * 0.05, W * 0.7, { align: 'center', size: fitSize(ds || ' ', c.f.body, 400, W * 0.7, u * 0.034, 2), fill: pal.ink, font: c.f.body });
      els.push(t, k, name, line, desc);
      const sy = H - m * 2 - u * 0.17;
      for (const [i, lab] of [ev.cta || 'Date', 'Signature'].entries()) {
        const x = i ? W * 0.62 : W * 0.14;
        els.push(shp('line', x, sy, W * 0.24, u * 0.01, pal.ink, { strokeWidth: u * 0.0025 }),
          txt(c, lab, x, sy + u * 0.02, W * 0.24, { align: 'center', size: u * 0.026, fill: pal.muted, letterSpacing: u * 0.004, uppercase: true }));
      }
      const s = u * 0.19;
      els.push(art('badge', W / 2 - s / 2, sy - s * 0.62, s, s, [pal.secondary, pal.surface]), emoji(c, W / 2 - s * 0.24, sy - s * 0.4, s * 0.48));
      return [{ bg: pal.surface, els }];
    },
  },
  {
    id: 'bignum', label: 'Big statement', style: 'Bold', voices: ['heavy', 'bold', 'geometric'], formats: ['post', 'story', 'poster', 'landscape'],
    kinds: ['business', 'celebrations', 'sports', 'education', 'creators'],
    fits: (ev) => !!statNumber(ev),
    build(c) {
      const { W, H, u, pal, ev } = c;
      const pad = u * 0.08;
      const stat = statNumber(ev);
      const big = stat ?? c.motif;
      const isEmoji = !stat;
      const ink = pal.dark ? pal.ink : pal.onPrimary; // text on this layout's background
      const els: El[] = [
        shp('ellipse', W * 0.55, -u * 0.2, u * 0.9, u * 0.9, alpha(pal.accent, 0.55)),
        shp('rect', 0, H - u * 0.04, W, u * 0.04, pal.accent),
      ];
      const k = txt(c, ev.kicker, pad, pad, W * 0.7, { weight: 700, size: u * 0.038, fill: ink, uppercase: true, letterSpacing: u * 0.008 });
      const bigEl = isEmoji ? emoji(c, pad, H * 0.16, u * 0.46) : txt(c, big, pad - u * 0.02, H * (c.portrait ? 0.14 : 0.1), W - pad * 2, { font: c.f.display, weight: c.f.displayWeight, size: Math.min(fitSize(big, c.f.display, c.f.displayWeight, W - pad * 2, u * 0.62, 1), H * 0.36), fill: pal.accent, lineHeight: 0.9 });
      const ty = Math.max(bigEl.y + bigEl.h + u * 0.03, H * (c.land ? 0.48 : 0.5));
      const t = title(c, ev.title, pad, ty, W * (c.land ? 0.6 : 0.84), u * 0.13, { fill: ink, uppercase: true, maxLines: 3, maxH: H - ty - u * (0.12 + lines(ev).length * 0.055 + (ev.cta ? 0.12 : 0)) });
      els.push(k, bigEl, t);
      let y = t.y + t.h + u * 0.04;
      const dt = details(c, pad, y, W * 0.8, { size: u * 0.04, weight: 600, fill: ink, opacity: 0.88 }, u * 0.012, H - pad - u * 0.1 - u * 0.04);
      els.push(...dt.els); y = dt.y;
      els.push(...pill(c, ev.cta, 0, Math.min(y + u * 0.05, H - pad - u * 0.1), pal.accent, pal.dark ? pal.bg : pal.ink, u * 0.034, 'left', pad));
      if (!isEmoji) els.push(emoji(c, W - pad - u * 0.16, H - pad - u * 0.2, u * 0.16, 10));
      return [{ bg: pal.dark ? pal.bg : pal.secondary, els }];
    },
  },
  {
    id: 'confetti', label: 'Confetti party', style: 'Playful', voices: ['playful', 'elegant', 'handmade'], formats: ['post', 'story', 'card', 'flyer'],
    kinds: ['celebrations', 'entertainment', 'education', 'community'],
    build(c) {
      const { W, H, u, pal, ev } = c;
      const cols = [pal.primary, pal.accent, pal.secondary];
      const els: El[] = [
        art('confetti', -u * 0.05, -u * 0.02, W * 1.1, W * 0.7, cols),
        art('confetti', -u * 0.05, H - W * 0.55, W * 1.1, W * 0.7, cols, 180),
        art('balloons', W - u * 0.36, H * 0.12, u * 0.32, u * 0.4, cols, 8),
        shp('rect', W * 0.08, H * 0.24, W * 0.84, H * 0.52, alpha('#ffffff', pal.dark ? 0.08 : 0.82), { radius: u * 0.05 }),
      ];
      const cx = W / 2;
      const k = txt(c, ev.kicker, W * 0.12, H * 0.28, W * 0.76, { align: 'center', font: c.f.script ?? c.f.display, weight: 400, size: u * 0.07, fill: pal.primary });
      const t = title(c, ev.title, W * 0.12, k.y + k.h + u * 0.015, W * 0.76, u * 0.15, { align: 'center', fill: pal.ink, maxLines: 3, maxH: H * 0.76 - (k.y + k.h) - u * 0.22 });
      els.push(k, t);
      let y = t.y + t.h + u * 0.035;
      const dt = details(c, W * 0.12, y, W * 0.76, { align: 'center', size: u * 0.04, weight: 600, fill: pal.muted }, u * 0.01, H * 0.76 - u * 0.12 - u * 0.03);
      els.push(...dt.els); y = dt.y;
      els.push(...pill(c, ev.cta, cx, Math.min(y + u * 0.04, H * 0.76 - u * 0.12), pal.primary, pal.onPrimary, u * 0.032));
      return [{ bg: pal.bg, els }];
    },
  },
  {
    id: 'circle', label: 'Circle portrait', style: 'Elegant', voices: ['elegant', 'serif', 'playful'], formats: ['post', 'story', 'card', 'flyer'],
    kinds: ['celebrations', 'education', 'business', 'community'],
    build(c) {
      const { W, H, u, pal, ev } = c;
      const d0 = u * (c.portrait ? 0.62 : 0.5);
      const cx = W / 2, cy = H * (c.portrait ? 0.32 : 0.33);
      const els: El[] = [
        shp('rect', 0, 0, W, cy + d0 * 0.15, alpha(pal.secondary, pal.dark ? 0.5 : 0.18)),
        shp('ring', cx - d0 / 2 - u * 0.035, cy - d0 / 2 - u * 0.035, d0 + u * 0.07, d0 + u * 0.07, 'rgba(0,0,0,0)', { stroke: pal.accent, strokeWidth: u * 0.008 }),
        photo(c, 0, cx - d0 / 2, cy - d0 / 2, d0, d0, { mask: 'circle' }),
        art('sparkle', cx + d0 * 0.36, cy - d0 * 0.52, u * 0.09, u * 0.09, [pal.accent, pal.surface]),
        art('sparkle', cx - d0 * 0.56, cy + d0 * 0.3, u * 0.06, u * 0.06, [pal.accent, pal.surface]),
      ];
      const k = txt(c, ev.kicker, W * 0.1, cy + d0 / 2 + u * 0.08, W * 0.8, { align: 'center', size: u * 0.036, fill: pal.muted, weight: 600, uppercase: true, letterSpacing: u * 0.008 });
      const t = title(c, ev.title, W * 0.08, k.y + k.h + u * 0.02, W * 0.84, u * 0.13, { align: 'center', fill: pal.ink, maxLines: 3, maxH: H - (k.y + k.h) - u * 0.24 });
      els.push(k, t);
      let y = t.y + t.h + u * 0.035;
      const dt = details(c, W * 0.1, y, W * 0.8, { align: 'center', size: u * 0.038, fill: pal.ink, font: c.f.body }, u * 0.01, H - u * 0.1 - u * 0.025);
      els.push(...dt.els); y = dt.y;
      if (ev.cta) els.push(txt(c, ev.cta, W * 0.1, Math.min(y + u * 0.04, H - u * 0.1), W * 0.8, { align: 'center', size: u * 0.034, fill: pal.primary, weight: 700 }));
      return [{ bg: pal.surface, els }];
    },
  },
  {
    id: 'slides', label: 'Presentation', style: 'Modern', voices: ['modern', 'geometric', 'condensed'], formats: ['slides'],
    kinds: [], also: ['presentation', 'class-workshop', 'science-fair', 'workshop'],
    build(c) {
      const { W, H, u, pal, ev } = c;
      const pad = u * 0.1;
      const d = lines(ev);
      // 1 — title slide
      const s1: El[] = [shp('rect', 0, 0, W * 0.42, H, pal.primary), shp('ellipse', W * 0.3, H * 0.62, u * 0.5, u * 0.5, alpha(pal.accent, 0.8)), emoji(c, W * 0.1, H * 0.3, u * 0.32, -6)];
      const k1 = txt(c, ev.kicker, W * 0.48, H * 0.3, W * 0.45, { size: u * 0.04, weight: 700, fill: pal.primary, uppercase: true, letterSpacing: u * 0.008 });
      const t1 = title(c, ev.title, W * 0.48, k1.y + k1.h + u * 0.02, W * 0.45, u * 0.14, { fill: pal.ink });
      s1.push(k1, t1, txt(c, d[1] ?? '', W * 0.48, t1.y + t1.h + u * 0.04, W * 0.45, { size: u * 0.036, fill: pal.muted }));
      // 2 — three points
      const s2: El[] = [shp('rect', 0, 0, W, u * 0.02, pal.primary)];
      s2.push(title(c, 'Agenda', pad, pad, W - pad * 2, u * 0.1, { fill: pal.ink, maxLines: 1 }));
      const pts = (d[0] ?? 'One · Two · Three').split(/\s*[·,]\s*/).filter(Boolean).slice(0, 4);
      while (pts.length < 3) pts.push(['Highlights', 'Next steps', 'Questions'][pts.length]);
      const cw = (W - pad * 2 - u * 0.06 * (pts.length - 1)) / pts.length;
      pts.forEach((p, i) => {
        const x = pad + i * (cw + u * 0.06), y = H * 0.36;
        s2.push(shp('rect', x, y, cw, H * 0.44, pal.surface, { radius: u * 0.03, stroke: alpha(pal.ink.length === 7 ? pal.ink : '#000000', 0.12), strokeWidth: 2 }),
          txt(c, String(i + 1).padStart(2, '0'), x + u * 0.04, y + u * 0.04, cw - u * 0.08, { font: c.f.display, weight: c.f.displayWeight, size: u * 0.09, fill: pal.primary }),
          txt(c, p, x + u * 0.04, y + u * 0.18, cw - u * 0.08, { size: u * 0.045, weight: 700, fill: pal.ink }),
          txt(c, 'Add a short note about this point.', x + u * 0.04, y + u * 0.27, cw - u * 0.08, { size: u * 0.03, fill: pal.muted }));
      });
      // 3 — closing
      const s3: El[] = [shp('ellipse', -u * 0.3, H - u * 0.5, u, u, alpha(pal.accent, 0.7))];
      const t3 = title(c, ev.cta || 'Thank you', W * 0.1, H * 0.36, W * 0.8, u * 0.2, { align: 'center', fill: pal.onPrimary, maxLines: 1 });
      s3.push(t3, txt(c, ev.title, W * 0.1, t3.y + t3.h + u * 0.04, W * 0.8, { align: 'center', size: u * 0.04, fill: pal.onPrimary, opacity: 0.85 }));
      return [{ bg: pal.bg, els: s1 }, { bg: pal.bg, els: s2 }, { bg: pal.primary, els: s3 }];
    },
  },
];

export const archetypeById = (id: string): Archetype | undefined => ARCHETYPES.find((a) => a.id === id);

/** Build the pages of one template. Pure apart from the cached photo placeholders. */
export function buildPages(a: Archetype, c: Omit<Ctx, 'W' | 'H' | 'u' | 'portrait' | 'land' | 'assets'>, format: Format): { pages: Page[]; assets: Record<string, string>; w: number; h: number } {
  const { w, h } = FORMATS[format];
  const ctx: Ctx = { ...c, W: w, H: h, u: Math.min(w, h), portrait: h > w * 1.15, land: w > h * 1.15, assets: {} };
  const pages = a.build(ctx).map((p) => newPage(p.bg, p.els));
  return { pages, assets: ctx.assets, w, h };
}
