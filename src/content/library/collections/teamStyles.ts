/**
 * More "meet the team" styles (owner: "add professional templates … more options … find the best"). Patterns that keep
 * coming up in professional team/staff templates, redrawn in Fuzzies' own way (no one else's artwork or layouts copied):
 *
 * - `circles`   round headshots with a ring, name + role underneath, a clean white page and oversized title (corporate).
 * - `facts`     per-person cards: photo + name + role + three "get to know me" facts (onboarding / RA intro boards).
 * - `directory` a list with a round photo, name, role and how to reach the person (rooms, emails, office hours).
 * - `snapshots` tilted instant-photo cards with tape on kraft paper and handwritten names (collage / analog look).
 * - `arches`    arch-shaped photos, serif names and small spaced capitals on cream (clean editorial look).
 * - `bigType`   one huge outlined word behind a photo grid (oversized type).
 * - `doorDecs`  a sheet of cut-out name tags for dorm doors (an RA classic).
 * Every piece is still a normal editable layer; photos are placeholders you Replace.
 */
import { makeImage } from '../../../editor/doc';
import type { El } from '../../../editor/types';
import { photoAsset } from '../layouts';
import type { Palette } from '../palettes';
import {box, drop, text as kitText, type CollectionTemplate, type Kit, type TOpts } from './kit';
import { fitText } from '../../../editor/render';
import type { TextEl } from '../../../editor/types';
/** Live text measured with 4% slack: if a web font is still loading when a template is built, the real (wider) letters
 * still fit on the lines that were measured, so a name never wraps onto the line below it. */
const text = (c: Kit, s: string, x: number, y: number, w: number, o: TOpts): TextEl => {
  const el = kitText(c, s, x, y, w * 0.96, o);
  el.w = w;
  fitText(el);
  return el;
};
import { footer, header, NAMES, people, RA_TAGS, T, tpl, type Person, type Theme, type Words } from './team';

/** Colours + fonts for the styles that don't use a header band. */
export interface Look { id: string; bg: string; ink: string; muted: string; accent: string; ring: string; tFont: [string, number]; bFont: string; photo: [string, string, string] }
export const L = {
  slate: { id: 'slate', bg: '#ffffff', ink: '#14213d', muted: '#5c6b84', accent: '#2f6fed', ring: '#dbe6fd', tFont: ['Inter', 900], bFont: 'Inter', photo: ['#6f86b5', '#e8eefb', '#2f6fed'] },
  lilac: { id: 'lilac', bg: '#ffffff', ink: '#25124d', muted: '#6a5a8c', accent: '#6b3fc4', ring: '#fdc94a', tFont: ['Montserrat', 900], bFont: 'Montserrat', photo: ['#7b5cc4', '#e5dbf8', '#fdc94a'] },
  cream: { id: 'cream', bg: '#f7f1e8', ink: '#3b2a20', muted: '#8a6f5c', accent: '#c0674a', ring: '#c0674a', tFont: ['Playfair Display', 700], bFont: 'Montserrat', photo: ['#c99a7f', '#f2e4d6', '#c0674a'] },
  blush: { id: 'blushed', bg: '#fbf6f3', ink: '#4e3236', muted: '#8f6d70', accent: '#b07a7f', ring: '#b07a7f', tFont: ['Playfair Display', 700], bFont: 'Montserrat', photo: ['#c4a0a3', '#f3e4e1', '#e7c48f'] },
  ink: { id: 'ink', bg: '#111111', ink: '#ffffff', muted: '#b9b9b9', accent: '#ffd43b', ring: '#ffd43b', tFont: ['Archivo Black', 400], bFont: 'Inter', photo: ['#5a5a5a', '#2a2a2a', '#ffd43b'] },
} satisfies Record<string, Look>;

/** A placeholder photo in a shape ('none' + radius, 'circle' or 'arch'). */
export function pic(c: Kit, key: string, tint: [string, string, string], i: number, x: number, y: number, w: number, h: number, mask: 'none' | 'circle' | 'arch', radius = 0): El {
  const id = `ph-${key}-${i % 3}`;
  c.assets[id] ??= photoAsset({ id: key, primary: tint[0], secondary: tint[1], accent: tint[2] } as Palette, i % 3);
  const el = makeImage(id, w, h, { mask, radius });
  Object.assign(el, { x, y, w, h, name: 'Photo — tap to add yours' });
  c.els.push(el);
  return el;
}
export const lookPic = (c: Kit, l: Look, i: number, x: number, y: number, w: number, h: number, mask: 'none' | 'circle' | 'arch', r = 0) => pic(c, `style-${l.id}`, l.photo, i, x, y, w, h, mask, r);
export const themePic = (c: Kit, th: Theme, i: number, x: number, y: number, w: number, h: number, mask: 'none' | 'circle' | 'arch', r = 0) => pic(c, th.id === 'reslife' ? 'reslife' : `team-${th.id}`, th.photo, i, x, y, w, h, mask, r);

/** Turn a finished card (its elements) around a point, so tilted cards stay in one piece. */
function spin(els: El[], cx: number, cy: number, deg: number): void {
  const r = (deg * Math.PI) / 180, cos = Math.cos(r), sin = Math.sin(r);
  for (const el of els) {
    const ex = el.x + el.w / 2 - cx, ey = el.y + el.h / 2 - cy;
    el.x = cx + ex * cos - ey * sin - el.w / 2;
    el.y = cy + ex * sin + ey * cos - el.h / 2;
    el.rotation = (el.rotation || 0) + deg;
  }
}
/** Small deterministic random numbers (same template every time). */
function rng(seed: number): () => number { let s = seed; return () => ((s = (s * 9301 + 49297) % 233280) / 233280); }

/** Cell grid: calls `cell(i, x, y, w, h)` for each person, centred between `top` and `bottom`. */
export function cells(c: Kit, n: number, cols: number, top: number, bottom: number, side: number, gap: number, cell: (i: number, x: number, y: number, w: number, h: number) => void, gapY = gap): void {
  const rows = Math.ceil(n / cols), w = (c.W - side * 2 - gap * (cols - 1)) / cols, h = (bottom - top - gapY * (rows - 1)) / rows;
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / cols), inRow = Math.min(cols, n - row * cols);
    const x0 = side + (c.W - side * 2 - (inRow * w + (inRow - 1) * gap)) / 2; // a short last row is centred
    cell(i, x0 + (i % cols) * (w + gap), top + row * (h + gapY), w, h);
  }
}

interface Head { kicker: string; title: string; sub?: string }
/** A light-page heading: small spaced kicker, an oversized title, a short accent rule and an optional line. Returns its bottom. */
export function lightHead(c: Kit, l: Look, o: Head, top: number, size: number, align: 'center' | 'left' = 'center'): number {
  const { W, u } = c, x = align === 'left' ? W * 0.07 : W * 0.1, w = align === 'left' ? W * 0.86 : W * 0.8;
  const k = text(c, o.kicker, x, top, w, { font: l.bFont, weight: 700, size: Math.max(u * size * 0.3, u * 0.026), fill: l.accent, upper: true, spacing: u * 0.006, align, name: 'Kicker' });
  const t = text(c, o.title, x, k.y + k.h + u * 0.012, w, { font: l.tFont[0], weight: l.tFont[1], size: u * size, fill: l.ink, lh: 1.02, lines: 2, align, name: 'Title' });
  const rx = align === 'left' ? x : W / 2 - u * 0.045;
  box(c, rx, t.y + t.h + u * 0.025, u * 0.09, u * 0.008, l.accent, { radius: u * 0.004, name: 'Rule' });
  let end = t.y + t.h + u * 0.033;
  if (o.sub) { const s = text(c, o.sub, x, end + u * 0.02, w, { font: l.bFont, weight: 500, size: u * size * 0.27, fill: l.muted, align, lines: 2, lh: 1.3, name: 'Subtitle' }); end = s.y + s.h; }
  return end;
}

// ---------- circles: round headshots, clean and corporate ----------
export function circles(c: Kit, l: Look, o: Head & { footer?: string }, ps: Person[], cols: number, head = 0.075): void {
  const { W, H, u } = c;
  c.bg = l.bg;
  const wide = W / H > 1.3;
  const top = lightHead(c, l, o, H * (wide ? 0.08 : 0.06), head, wide ? 'left' : 'center');
  const bottom = H - (o.footer ? u * 0.13 : u * 0.06);
  cells(c, ps.length, cols, top + u * (wide ? 0.08 : 0.06), bottom, W * 0.06, W * 0.03, (i, x, y, w, h) => {
    const nameH = u * 0.105, d = Math.min(w * 0.78, (h - nameH) / 1.12), cx = x + w / 2, ring = d * 0.05;
    y += Math.max(0, (h - (d + ring * 2 + nameH)) / 2);
    box(c, cx - d / 2 - ring * 1.6, y - ring * 1.6, d + ring * 3.2, d + ring * 3.2, l.ring, { shape: 'ellipse', name: 'Ring' });
    box(c, cx - d / 2 - ring * 0.6, y - ring * 0.6, d + ring * 1.2, d + ring * 1.2, l.bg, { shape: 'ellipse', name: 'Ring gap' });
    lookPic(c, l, i, cx - d / 2, y, d, d, 'circle');
    const n = text(c, ps[i][0], x, y + d + ring * 2 + u * 0.024, w, { font: l.bFont, weight: 800, size: Math.min(w * 0.105, u * 0.046), fill: l.ink, name: 'Name' });
    text(c, ps[i][1], x, n.y + n.h + u * 0.008, w, { font: l.bFont, weight: 700, size: Math.min(w * 0.085, u * 0.032), fill: l.accent, upper: true, spacing: u * 0.002, lines: 2, lh: 1.2, name: 'Role' });
  });
  if (o.footer) { const t = text(c, o.footer, W * 0.1, 0, W * 0.8, { font: l.bFont, weight: 700, size: u * 0.03, fill: l.muted, upper: true, spacing: u * 0.004, name: 'Footer text' }); t.y = H - u * 0.09; }
}

// ---------- facts: "get to know me" cards ----------
type Facts = { name: string; role: string; facts: [string, string][] };
function facts(c: Kit, th: Theme, w: Words, ps: Facts[], cols: number): void {
  const { W, H, u } = c;
  c.bg = th.page;
  header(c, th, { ...w, h: H * 0.15, size: 0.07 });
  cells(c, ps.length, cols, H * 0.19, H * 0.915, W * 0.05, W * 0.035, (i, x, y, cw, ch) => {
    const p = ps[i], r = cw * 0.04, pad = cw * 0.04;
    box(c, x + cw * 0.012, y + cw * 0.016, cw, ch, th.shadow, { radius: r, name: 'Card shadow' });
    box(c, x, y, cw, ch, '#ffffff', { radius: r, stroke: th.frame, strokeWidth: Math.max(3, cw * 0.008), name: 'Card' });
    const ph = ch * 0.36;
    themePic(c, th, i, x + pad, y + pad, cw - pad * 2, ph, 'none', r * 0.8);
    const tx = x + pad * 1.6, tw = cw - pad * 3.2;
    const n = text(c, p.name, tx, y + pad + ph + ch * 0.03, tw, { font: th.nFont, weight: th.nW, size: cw * 0.085, fill: th.ink, upper: true, align: 'left', name: 'Name' });
    const ro = text(c, p.role, tx, n.y + n.h + ch * 0.008, tw, { font: th.nFont, weight: 700, size: cw * 0.055, fill: th.frame, upper: true, spacing: cw * 0.002, align: 'left', name: 'Role' });
    let fy = ro.y + ro.h + ch * 0.04;
    for (const [label, value] of p.facts) {
      box(c, tx, fy - ch * 0.014, tw, Math.max(2, ch * 0.003), th.shadow, { name: 'Divider' });
      const lb = text(c, label, tx, fy, tw, { font: th.nFont, weight: 800, size: cw * 0.046, fill: th.frame, upper: true, spacing: cw * 0.002, align: 'left', name: 'Fact label' });
      const v = text(c, value, tx, lb.y + lb.h + ch * 0.006, tw, { font: th.nFont, weight: 600, size: cw * 0.052, fill: th.ink, lines: 1, align: 'left', name: 'Fact' });
      fy = v.y + v.h + ch * 0.03;
    }
  }, W * 0.035);
  footer(c, th, w.footer, H * 0.93, u * 0.05);
}

// ---------- directory: who to ask and how to reach them ----------
export type Entry = [name: string, role: string, reach: string];
export function directory(c: Kit, th: Theme, w: Words, rows: Entry[]): void {
  const { W, H, u } = c;
  c.bg = th.page;
  header(c, th, { ...w, h: H * 0.16, size: 0.075 });
  const top = H * 0.195, bottom = H * 0.9, gap = u * 0.018, rh = (bottom - top - gap * (rows.length - 1)) / rows.length;
  rows.forEach(([name, role, reach], i) => {
    const y = top + i * (rh + gap), x = W * 0.07, rw = W * 0.86;
    box(c, x, y, rw, rh, '#ffffff', { radius: rh * 0.22, shadow: drop(u, 'rgba(20,20,40,0.12)'), name: 'Row' });
    box(c, x, y, rh * 0.09, rh, th.bar, { radius: rh * 0.045, name: 'Accent' });
    const d = rh * 0.74;
    box(c, x + rh * 0.24 - d * 0.04, y + (rh - d) / 2 - d * 0.04, d * 1.08, d * 1.08, th.frame, { shape: 'ellipse', name: 'Photo ring' });
    themePic(c, th, i, x + rh * 0.24, y + (rh - d) / 2, d, d, 'circle');
    const tx = x + rh * 0.24 + d + rh * 0.25, tw = rw - (tx - x) - rh * 0.25;
    const n = text(c, name, tx, 0, tw, { font: th.nFont, weight: th.nW, size: rh * 0.24, fill: th.ink, align: 'left', name: 'Name' });
    const r = text(c, role, tx, 0, tw, { font: th.nFont, weight: 700, size: rh * 0.17, fill: th.frame, upper: true, spacing: rh * 0.01, align: 'left', name: 'Role' });
    const re = text(c, reach, tx, 0, tw, { font: th.nFont, weight: 600, size: rh * 0.17, fill: th.ink, align: 'left', name: 'Contact' });
    const g = rh * 0.05, total = n.h + r.h + re.h + g * 2;
    n.y = y + (rh - total) / 2; r.y = n.y + n.h + g; re.y = r.y + r.h + g;
  });
  footer(c, th, w.footer, H * 0.92, u * 0.055);
}

// ---------- snapshots: tilted instant photos with tape on kraft paper ----------
interface Paper { bg: string; speck: string; ink: string; accent: string; tape: string; photo: [string, string, string]; id: string }
const KRAFT: Paper = { id: 'kraft', bg: '#d8b98f', speck: '#a8835a', ink: '#2c2118', accent: '#c2452d', tape: 'rgba(255,236,170,0.82)', photo: ['#b9946d', '#efe2cf', '#c2452d'] };
const CORK: Paper = { id: 'cork', bg: '#c99e6e', speck: '#8f6539', ink: '#1f2a44', accent: '#2563a6', tape: 'rgba(196,226,255,0.8)', photo: ['#8eaed6', '#e7eef8', '#ffa94d'] };
function snapshots(c: Kit, pp: Paper, o: { title: string; sub: string; note: string }, ps: Person[], cols: number): void {
  const { W, H, u } = c, rnd = rng(7);
  c.bg = pp.bg;
  for (let i = 0; i < 90; i++) { const s = u * (0.003 + rnd() * 0.006); box(c, rnd() * W, rnd() * H, s, s, pp.speck, { shape: 'ellipse', opacity: 0.35 + rnd() * 0.3, name: 'Paper speck' }); }
  // title on a torn white label with tape
  const tw = W * 0.74, th = u * 0.2, tx = (W - tw) / 2, ty = H * 0.045, t0 = c.els.length;
  box(c, tx, ty, tw, th, '#fffdf7', { shadow: drop(u, 'rgba(60,40,20,0.35)'), name: 'Title label' });
  const t = text(c, o.title, tx + tw * 0.05, 0, tw * 0.9, { font: 'Caveat', weight: 700, size: th * 0.62, fill: pp.ink, name: 'Title' });
  t.y = ty + (th - t.h) / 2 - th * 0.04;
  box(c, tx - tw * 0.03, ty - th * 0.08, tw * 0.16, th * 0.28, pp.tape, { name: 'Tape' }); box(c, tx + tw * 0.87, ty - th * 0.08, tw * 0.16, th * 0.28, pp.tape, { name: 'Tape' });
  spin(c.els.slice(t0), W / 2, ty + th / 2, -1.5);
  const s = text(c, o.sub, W * 0.1, ty + th + u * 0.03, W * 0.8, { font: 'Montserrat', weight: 800, size: u * 0.032, fill: pp.ink, upper: true, spacing: u * 0.006, name: 'Subtitle' });
  const tilts = [-4, 3, -2, 4, -3, 2, -4, 3];
  cells(c, ps.length, cols, s.y + s.h + u * 0.04, H - u * 0.12, W * 0.05, W * 0.035, (i, x, y, w, h) => {
    const fw = Math.min(w, h / 1.42), pad = fw * 0.06, phh = (fw - pad * 2) * 1.16, fh = pad + phh + fw * 0.3, fx = x + (w - fw) / 2, fy = y + (h - fh) / 2, start = c.els.length;
    box(c, fx, fy, fw, fh, '#ffffff', { shadow: drop(u, 'rgba(60,40,20,0.4)'), name: 'Photo card' });
    pic(c, `snap-${pp.id}`, pp.photo, i, fx + pad, fy + pad, fw - pad * 2, phh, 'none');
    const n = text(c, ps[i][0], fx + pad, fy + pad + phh + fw * 0.03, fw - pad * 2, { font: 'Caveat', weight: 700, size: fw * 0.13, fill: pp.ink, name: 'Name' });
    text(c, ps[i][1], fx + pad, n.y + n.h - fh * 0.005, fw - pad * 2, { font: 'Montserrat', weight: 800, size: fw * 0.08, fill: pp.accent, upper: true, spacing: fw * 0.004, name: 'Role' });
    box(c, fx + fw * 0.34, fy - fh * 0.04, fw * 0.32, fh * 0.085, pp.tape, { name: 'Tape' });
    spin(c.els.slice(start), fx + fw / 2, fy + fh / 2, tilts[i % tilts.length]);
  }, u * 0.04);
  const n = text(c, o.note, W * 0.15, 0, W * 0.7, { font: 'Caveat', weight: 700, size: u * 0.05, fill: pp.ink, name: 'Note' });
  n.y = H - u * 0.105;
}

// ---------- arches: editorial, serif, arch-shaped photos ----------
function arches(c: Kit, l: Look, o: Head & { footer: string }, ps: Person[], cols: number, head = 0.08): void {
  const { W, H, u } = c;
  c.bg = l.bg;
  const top = lightHead(c, l, o, H * 0.06, head);
  cells(c, ps.length, cols, top + u * 0.05, H - u * 0.12, W * 0.07, W * 0.04, (i, x, y, w, h) => {
    const aw = Math.min(w * 0.92, (h - u * 0.11) / 1.38), ah = aw * 1.3, ax = x + (w - aw) / 2, off = aw * 0.045;
    y += Math.max(0, (h - (ah + off + u * 0.1)) / 2);
    box(c, ax + off, y + off, aw, ah, 'rgba(0,0,0,0)', { shape: 'arch', stroke: l.accent, strokeWidth: Math.max(2, u * 0.003), name: 'Arch outline' });
    lookPic(c, l, i, ax, y, aw, ah, 'arch');
    const n = text(c, ps[i][0], x, y + ah + off + u * 0.025, w, { font: l.tFont[0], weight: 700, size: Math.min(w * 0.11, u * 0.045), fill: l.ink, name: 'Name' });
    text(c, ps[i][1], x, n.y + n.h + u * 0.008, w, { font: l.bFont, weight: 700, size: Math.min(w * 0.095, u * 0.03), fill: l.accent, upper: true, spacing: u * 0.003, name: 'Role' });
  }, u * 0.03);
  box(c, W * 0.3, H - u * 0.085, W * 0.4, Math.max(2, u * 0.002), l.accent, { name: 'Footer rule' });
  const f = text(c, o.footer, W * 0.1, 0, W * 0.8, { font: l.bFont, weight: 700, size: u * 0.028, fill: l.muted, upper: true, spacing: u * 0.005, name: 'Footer text' });
  f.y = H - u * 0.065;
}

// ---------- bigType: one huge outlined word behind the photos ----------
function bigType(c: Kit, l: Look, o: { kicker: string; word: string; sub: string; footer: string }, ps: Person[], cols: number): void {
  const { W, H, u } = c;
  c.bg = l.bg;
  const k = text(c, o.kicker, W * 0.06, H * 0.04, W * 0.88, { font: l.bFont, weight: 800, size: u * 0.05, fill: l.accent, upper: true, spacing: u * 0.01, align: 'left', name: 'Kicker' });
  const big = text(c, o.word, W * 0.04, k.y + k.h - u * 0.01, W * 0.92, { font: l.tFont[0], weight: l.tFont[1], size: u * 0.4, fill: 'rgba(0,0,0,0)', stroke: [l.ink, u * 0.004], upper: true, lh: 0.9, align: 'left', name: 'Big word' });
  const s = text(c, o.sub, W * 0.06, big.y + big.h + u * 0.01, W * 0.88, { font: l.bFont, weight: 600, size: u * 0.026, fill: l.muted, upper: true, spacing: u * 0.004, align: 'left', name: 'Subtitle' });
  const top = big.y + big.h * 0.62; // photos overlap the bottom of the big word
  cells(c, ps.length, cols, Math.max(top, s.y + s.h + u * 0.03), H - u * 0.12, W * 0.06, W * 0.03, (i, x, y, w, h) => {
    const ph = h - u * 0.12;
    lookPic(c, l, i, x, y, w, ph, 'none', 0);
    box(c, x, y + ph - u * 0.012, w * 0.3, u * 0.012, l.accent, { name: 'Accent' });
    const n = text(c, ps[i][0], x, y + ph + u * 0.018, w, { font: l.bFont, weight: 800, size: Math.min(w * 0.095, u * 0.04), fill: l.ink, upper: true, align: 'left', name: 'Name' });
    text(c, ps[i][1], x, n.y + n.h + u * 0.006, w, { font: l.bFont, weight: 600, size: Math.min(w * 0.085, u * 0.032), fill: l.muted, align: 'left', name: 'Role' });
  }, u * 0.03);
  const f = text(c, o.footer, W * 0.06, 0, W * 0.88, { font: l.bFont, weight: 800, size: u * 0.026, fill: l.accent, upper: true, spacing: u * 0.006, align: 'left', name: 'Footer text' });
  f.y = H - u * 0.07;
}

// ---------- doorDecs: a sheet of name tags for dorm doors ----------
const DEC_COLORS = ['#ffd6e0', '#d6ecff', '#fff1bf', '#d9f5e3', '#e9dcff', '#ffe2cc'];
const DEC_INK = ['#8a2846', '#1f4f82', '#7a5a00', '#1d6b43', '#4b2590', '#9a4a12'];
const DEC_SHAPES = ['star', 'heart', 'hexagon', 'ellipse', 'diamond', 'burst'] as const;
function doorDecs(c: Kit, o: { title: string; sub: string; greeting: string }, names: string[]): void {
  const { W, H, u } = c;
  c.bg = '#ffffff';
  const t = text(c, o.title, W * 0.08, H * 0.03, W * 0.84, { font: 'Fredoka', weight: 700, size: u * 0.06, fill: '#25124d', name: 'Title' });
  text(c, o.sub, W * 0.08, t.y + t.h + u * 0.006, W * 0.84, { font: 'Montserrat', weight: 600, size: u * 0.022, fill: '#6a5a8c', upper: true, spacing: u * 0.004, name: 'Subtitle' });
  cells(c, names.length, 2, H * 0.12, H * 0.97, W * 0.06, W * 0.05, (i, x, y, w, h) => {
    const k = i % DEC_COLORS.length;
    box(c, x, y, w, h, DEC_COLORS[k], { radius: Math.min(w, h) * 0.18, stroke: DEC_INK[k], strokeWidth: Math.max(2, u * 0.003), name: 'Door dec (cut along the line)' });
    const sh = DEC_SHAPES[i % DEC_SHAPES.length], d = h * 0.3;
    box(c, x + (w - d) / 2, y + h * 0.1, d, d, '#ffffff', { shape: sh, stroke: DEC_INK[k], strokeWidth: Math.max(2, u * 0.004), name: 'Door dec shape' });
    box(c, x + (w - d * 0.5) / 2, y + h * 0.1 + d * 0.27, d * 0.5, d * 0.5, DEC_INK[k], { shape: sh, opacity: 0.85, name: 'Door dec shape' });
    const g = text(c, o.greeting, x + w * 0.08, y + h * 0.48, w * 0.84, { font: 'Caveat', weight: 700, size: h * 0.11, fill: DEC_INK[k], name: 'Greeting' });
    text(c, names[i], x + w * 0.06, g.y + g.h, w * 0.88, { font: 'Fredoka', weight: 700, size: h * 0.17, fill: DEC_INK[k], name: 'Name' });
  }, W * 0.05);
}

// ---------- the templates ----------
const RA_FACTS: Facts[] = [
  { name: NAMES[0], role: 'RA · Floor 1', facts: [['Major', 'Nursing'], ['Hometown', 'Halifax, NS'], ['Ask me about', 'Study spots & coffee']] },
  { name: NAMES[1], role: 'RA · Floor 2', facts: [['Major', 'Business'], ['Hometown', 'Lagos, Nigeria'], ['Ask me about', 'Clubs & intramurals']] },
  { name: NAMES[2], role: 'RA · Floor 3', facts: [['Major', 'Psychology'], ['Hometown', 'Toronto, ON'], ['Ask me about', 'Self-care & movie nights']] },
  { name: NAMES[3], role: 'RA · Floor 4', facts: [['Major', 'Engineering'], ['Hometown', 'St. John’s, NL'], ['Ask me about', 'Cooking on a budget']] },
];
const RA_DIR: Entry[] = [
  [NAMES[0], 'RA · Floor 1', 'Room 112  ·  jordan.lee@yourcollege.edu'],
  [NAMES[1], 'RA · Floor 2', 'Room 214  ·  amara.okafor@yourcollege.edu'],
  [NAMES[2], 'RA · Floor 3', 'Room 309  ·  sofia.martinez@yourcollege.edu'],
  [NAMES[3], 'RA · Floor 4', 'Room 405  ·  noah.bennett@yourcollege.edu'],
  [NAMES[4], 'Residence Coordinator', 'Front office  ·  Mon–Fri 9–5'],
  ['RA on Duty', 'After hours & weekends', 'Duty phone  ·  (555) 010-2024'],
];
const PURPLE = ['purple', 'gold', 'white'];
const STAFF = ['staff directory', 'contact list', 'who to ask', 'office hours', 'directory'];

export const STYLE_SETS: { sub: string; label: string; cover: string; list: CollectionTemplate[] }[] = [
  { sub: 'residence-life', label: 'Residence Life (more styles)', cover: 'get-to-know-your-ras', list: [
    tpl('get-to-know-your-ras', 'Get to Know Your RAs', 'poster', 'poster', 'Bold', PURPLE, 'announcement', [...RA_TAGS, 'fun facts', 'get to know', 'bulletin board', 'poster', '4 photos'],
      (c) => facts(c, T.reslife, { kicker: 'Get to know', title: 'Your RAs', sub: 'Maple Hall  •  Fall 2026', footer: 'Here to help you feel at home' }, RA_FACTS, 2), T.reslife),
    tpl('ra-snapshot-board', 'RA Snapshot Board', 'poster', 'poster', 'Playful', ['brown', 'kraft', 'white'], 'announcement', [...RA_TAGS, 'polaroid', 'snapshots', 'collage', 'bulletin board', 'scrapbook', 'handwritten', '6 photos'],
      (c) => snapshots(c, KRAFT, { title: 'Meet Your RAs!', sub: 'Maple Hall  •  2026–27', note: 'Knock anytime — we’re here for you!' }, people(['Floor 1', 'Floor 2', 'Floor 3', 'Floor 4', 'Floor 5', 'Floor 6']), 3), { ...T.reslife, page: KRAFT.bg }),
    tpl('ra-directory', 'RA Directory & Contacts', 'flyer', 'flyer', 'Modern', PURPLE, 'announcement', [...RA_TAGS, ...STAFF, 'room numbers', 'duty phone', 'emergency contacts'],
      (c) => directory(c, T.reslife, { kicker: 'Who to call', title: 'Your RA Team', sub: 'Maple Hall  •  2026–27', footer: 'Save this — we’re here 24/7' }, RA_DIR), T.reslife),
    tpl('welcome-home-door-decs', 'Welcome Home Door Decs', 'flyer', 'flyer', 'Playful', ['pastel', 'pink', 'blue', 'yellow'], 'announcement', [...RA_TAGS, 'door decs', 'door tags', 'name tags', 'dorm door', 'welcome home', 'printable', 'cut out'],
      (c) => doorDecs(c, { title: 'Welcome Home!', sub: 'Maple Hall Floor 3  •  cut along the lines', greeting: 'Welcome home,' }, ['Ava', 'Mateo', 'Zara', 'Kai', 'Leila', 'Omar']), T.reslife),
    tpl('meet-your-ras-circles', 'Meet Your RAs — Clean Circles', 'post', 'social', 'Minimal', ['white', 'purple', 'gold'], 'announcement', [...RA_TAGS, 'circle photos', 'minimal', 'clean', 'instagram', '6 photos'],
      (c) => circles(c, L.lilac, { kicker: 'Meet your', title: 'Resident Assistants', footer: 'Your College Name  •  ResLife' }, people(['RA · Floor 1', 'RA · Floor 2', 'RA · Floor 3', 'RA · Floor 4', 'RA · Floor 5', 'RA · Floor 6']), 3, 0.062), T.reslife),
  ] },
  { sub: 'announcement', label: 'Team styles', cover: 'leadership-team-circles', list: [
    tpl('leadership-team-circles', 'Our Leadership Team', 'slides', 'poster', 'Minimal', ['white', 'blue', 'navy'], 'presentation', ['leadership team', 'executive team', 'management', 'our team', 'about us', 'company', 'presentation', 'circle photos', '4 photos'],
      (c) => circles(c, L.slate, { kicker: 'Meet our', title: 'Leadership Team', footer: 'Studio North  •  Design & Branding' }, people(['Chief Executive Officer', 'Chief Operating Officer', 'Head of Design', 'Head of Growth']), 4, 0.11), T.coral),
    tpl('meet-the-team-big-type', 'Meet the Team — Big Type', 'poster', 'poster', 'Bold', ['black', 'yellow', 'white'], 'announcement', ['our team', 'meet the team', 'staff', 'crew', 'bold', 'modern', 'oversized type', 'poster', '6 photos'],
      (c) => bigType(c, L.ink, { kicker: 'Meet the', word: 'Team', sub: 'Studio North  •  Design & Branding  •  2026', footer: 'Let’s make something great' }, people(['Founder & CEO', 'Creative Director', 'Lead Designer', 'Developer', 'Account Manager', 'Studio Manager']), 3), T.coral),
  ] },
  { sub: 'promotion', label: 'Salon & studio teams', cover: 'meet-the-stylists-arch', list: [
    tpl('meet-the-stylists-arch', 'Meet the Stylists', 'post', 'social', 'Elegant', ['cream', 'terracotta', 'brown'], 'announcement', ['meet the stylists', 'salon team', 'stylists', 'beauty', 'spa', 'boutique', 'small business', 'arch photos', 'instagram', '3 photos'],
      (c) => arches(c, L.cream, { kicker: 'Meet the', title: 'Stylists', footer: 'Book your visit  •  Willow & Co. Salon' }, people(['Owner', 'Senior Stylist', 'Lash Artist'], [NAMES[2], NAMES[6], NAMES[4]]), 3, 0.1), T.coral),
  ] },
  { sub: 'school-event', label: 'Staff directory', cover: 'school-staff-directory', list: [
    tpl('school-staff-directory', 'School Staff Directory', 'flyer', 'flyer', 'Playful', ['teal', 'yellow', 'white'], 'event', ['school staff', 'teachers', 'principal', 'counselor', 'back to school', 'parents', ...STAFF],
      (c) => directory(c, T.teal, { kicker: 'Who to ask', title: 'Our School Staff', sub: 'Lincoln Elementary  •  2026–27', footer: 'Office open 8 AM – 4 PM' }, [
        ['Ms. Rivera', 'Principal', 'Main office  ·  rivera@lincoln.edu'],
        ['Mr. Okafor', 'Vice Principal', 'Room 102  ·  okafor@lincoln.edu'],
        ['Mrs. Chen', 'School Counselor', 'Room 110  ·  chen@lincoln.edu'],
        ['Mr. Bennett', 'Nurse', 'Health room  ·  ext. 204'],
        ['Ms. Sharma', 'Librarian', 'Library  ·  sharma@lincoln.edu'],
        ['Mr. Walsh', 'Front Office', 'Main office  ·  (555) 010-3000'],
      ]), T.teal),
  ] },
  { sub: 'student-activity', label: 'Camp & club snapshots', cover: 'camp-counselors-snapshots', list: [
    tpl('camp-counselors-snapshots', 'Meet Your Camp Counselors', 'poster', 'poster', 'Playful', ['brown', 'blue', 'white'], 'announcement', ['camp counselors', 'summer camp', 'counselors', 'camp staff', 'polaroid', 'snapshots', 'bulletin board', '6 photos'],
      (c) => snapshots(c, CORK, { title: 'Meet Your Counselors!', sub: 'Camp Pinecrest  •  Summer 2027', note: 'See you at the campfire!' }, people(['Cabin 1', 'Cabin 2', 'Cabin 3', 'Waterfront', 'Arts & Crafts', 'Sports']), 3), { ...T.sky, page: CORK.bg }),
  ] },
  { sub: 'wedding', label: 'Wedding party (editorial)', cover: 'wedding-party-arches', list: [
    tpl('wedding-party-arches', 'Wedding Party — Arches', 'poster', 'poster', 'Elegant', ['blush', 'cream', 'mauve'], 'wedding', ['wedding party', 'bridal party', 'bridesmaids', 'groomsmen', 'maid of honor', 'best man', 'welcome sign', 'arch photos', 'editorial', '6 photos'],
      (c) => arches(c, L.blush, { kicker: 'Sarah & James  •  June 20, 2027', title: 'The Wedding Party', footer: 'Thank you for standing with us' },
        people(['Maid of Honor', 'Bridesmaid', 'Bridesmaid', 'Best Man', 'Groomsman', 'Groomsman'], ['Emma Rossi', 'Amara Okafor', 'Priya Sharma', 'Noah Bennett', 'Liam Walsh', 'Ethan Brooks']), 3, 0.075), T.blush),
  ] },
];

/** Fonts these styles use beyond the team themes (previews wait for them). */
export const STYLE_FONTS: [string, number][] = [
  ['Inter', 900], ['Inter', 800], ['Inter', 700], ['Inter', 600], ['Inter', 500],
  ['Playfair Display', 700], ['Archivo Black', 400], ['Caveat', 700], ['Fredoka', 700],
  ['Montserrat', 500], ['Montserrat', 600], ['Montserrat', 700], ['Montserrat', 800], ['Montserrat', 900],
];
