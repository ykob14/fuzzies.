/**
 * Themed template system — reusable layouts filled from structured theme data, so a new celebration is mostly data.
 *
 * - A `Look` is what makes a celebration look like itself: a scene background (from an asset collection), a hero
 *   illustration, optional decorations (something hung across the top, a corner piece, a frame), a palette and fonts.
 * - `Words` are the editable texts: eyebrow, title, a greeting in the celebration's own script (`native`), a line
 *   underneath, event details and a call to action.
 * - A `LayoutId` picks one of the reusable compositions below. Every layout adapts to square, portrait, story and
 *   landscape pages and only produces normal editable layers (scene, illustrations, shapes, live text).
 *
 * `themed(spec)` turns a spec into a CollectionTemplate the catalog already understands.
 * Right-to-left and complex scripts (Arabic, Hebrew, Persian, Devanagari…) are set without letter spacing so letters
 * join and shape correctly; the canvas lays out their direction by itself.
 */
import { photoAsset, type Format } from '../layouts';
import type { Palette } from '../palettes';
import { makeImage } from '../../../editor/doc';
import { art, below, box, glow, pill, ratio, scene, sceneColor, text, type CollectionTemplate, type Kit, type Use } from './kit';
import type { Mask, TextEl } from '../../../editor/types';

export type FontRef = [string, number];
export interface Pal {
  title: string;     // main headline colour
  ink: string;       // body text
  muted: string;     // secondary text
  accent: string;    // pills, rules, the native greeting by default
  onAccent: string;  // text on the accent colour
  panel?: string;    // card / arch / medallion fill
  panelTitle?: string; panelInk?: string; panelMuted?: string; // text on that fill (default: title / ink / muted)
  glow?: string;     // soft glow behind headlines on dark scenes
}
export type Script = 'ar' | 'he' | 'fa' | 'hi' | 'ml' | 'pa' | 'zh' | 'latin';
export interface Native { text: string; font: FontRef; script: Script; color?: string }
export interface Look {
  scene: string;                          // background base id (e.g. 'is-bg-night'); the right page shape is picked
  sceneColors?: string[];
  pal: Pal;
  title: FontRef; body: FontRef; script?: FontRef;
  hero: string; heroColors?: string[];    // the main illustration
  top?: string; topColors?: string[];     // hung across the top (lanterns, toran, lights, mobile…)
  corner?: string; cornerColors?: string[];
  frame?: string; frameColors?: string[];
  photo?: { mask: Mask; tint: [string, string, string] }; // photo slot (the 'photo' layout): shape + placeholder colours
}
export interface Words { eyebrow?: string; title: string; native?: Native; sub?: string; details?: string[]; cta?: string }
export type LayoutId = 'hero' | 'arch' | 'framed' | 'poster' | 'split' | 'minimal' | 'medallion' | 'photo';
export interface ThemedSpec {
  id: string; name: string; format: Format; use: Use; style: string; colors: string[]; occasion: string; tags: string[];
  layout: LayoutId; look: Look; words: Words;
}

export interface ThemedSet { sub: string; label: string; specs: ThemedSpec[] }
/** Shorthand for a spec: id, name, format, use, layout, style, colour words, occasion, tags, look, words. */
export const spec = (id: string, name: string, format: Format, use: Use, layout: LayoutId, style: string, colors: string[], occasion: string, tags: string[], look: Look, words: Words): ThemedSpec =>
  ({ id, name, format, use, layout, style, colors, occasion, tags, look, words });

/** Fonts every themed template uses (so previews wait for them and text is measured exactly). */
export function fontsOf(specs: ThemedSpec[]): [string, number][] {
  const out = new Map<string, [string, number]>();
  const add = (f?: FontRef) => { if (f) out.set(f.join(':'), f); };
  for (const s of specs) { add(s.look.title); add(s.look.body); add(s.look.script); add(s.words.native?.font); add(['Montserrat', 800]); add([s.look.body[0], 700]); }
  return [...out.values()];
}

/** Each greeting in its own script with its font: preloading a font by name only fetches its Latin part, so the
 * Devanagari / Arabic / Hebrew / Chinese letters were measured with a stand-in font and wrapped into the title. */
export function nativeSamples(specs: ThemedSpec[]): [string, number, string][] {
  return specs.flatMap((s) => (s.words.native ? [[s.words.native.font[0], s.words.native.font[1], s.words.native.text] as [string, number, string]] : []));
}

const RTL: Script[] = ['ar', 'he', 'fa'];
/** The same look with its panel text colours as the main ones (for words placed on a panel, arch or medallion). */
const onPanel = (L: Look): Look => ({ ...L, pal: { ...L.pal, title: L.pal.panelTitle ?? L.pal.title, ink: L.pal.panelInk ?? L.pal.ink, muted: L.pal.panelMuted ?? L.pal.muted } });
const SCRIPT_NAME: Record<Script, string> = { ar: 'Arabic', he: 'Hebrew', fa: 'Persian', hi: 'Hindi', ml: 'Malayalam', pa: 'Punjabi', zh: 'Chinese', latin: 'Greeting' };

// ---------- pieces ----------
/** The greeting in its own script: no letter spacing (keeps Arabic joined), a little more line height for tall marks. */
function nativeLine(c: Kit, n: Native, x: number, y: number, w: number, size: number, fill: string, pal: Pal, lines = 1, align: 'left' | 'center' = 'center'): TextEl {
  return text(c, n.text, x, y, w, {
    align,
    font: n.font[0], weight: n.font[1], size, lines, fill: n.color ?? fill, lh: RTL.includes(n.script) || n.script === 'hi' ? 1.3 : 1.1,
    shadow: pal.glow ? glow(pal.glow, c.u * 0.03) : undefined, name: `${SCRIPT_NAME[n.script]} greeting`,
  });
}
/** An illustration fitted into a box (keeps its proportions, centred horizontally on cx). */
function fitArt(c: Kit, id: string, cx: number, top: number, maxW: number, maxH: number, colors?: string[], name?: string): { y: number; h: number } {
  if (maxH <= c.u * 0.05) return { y: top, h: 0 };
  const r = ratio(id);
  let w = maxW, h = w / r;
  if (h > maxH) { h = maxH; w = h * r; }
  art(c, id, cx - w / 2, top, w, { h, colors, name });
  return { y: top, h };
}
const detailLine = (wd: Words) => (wd.details ?? []).filter(Boolean);

/** Eyebrow → native greeting → title → sub, centred in a column. Returns the bottom of the last line. */
function textStack(c: Kit, L: Look, wd: Words, x: number, y: number, w: number, s: { native: number; title: number; titleLines: number; sub: number; nativeFirst?: boolean; align?: 'left' | 'center' }): number {
  const { u } = c, P = L.pal, align = s.align ?? 'center';
  let last = { y, h: 0 };
  if (wd.eyebrow) last = text(c, wd.eyebrow, x, y, w, { font: L.body[0], weight: 800, size: u * 0.032, fill: P.accent, upper: true, spacing: u * 0.008, align, lines: 2 });
  const nat = () => { if (wd.native) last = nativeLine(c, wd.native, x, below(last, last.h ? u * 0.012 : 0), w, u * s.native, P.accent, P, 1, align); };
  if (s.nativeFirst !== false) nat();
  const tf = L.script && s.titleLines === 1 ? L.script : L.title;
  last = text(c, wd.title, x, below(last, last.h ? u * 0.012 : 0), w, { font: tf[0], weight: tf[1], size: u * s.title, lines: s.titleLines, fill: P.title, lh: 1.04, align, name: 'Title', shadow: P.glow && !wd.native ? glow(P.glow, u * 0.025) : undefined });
  if (s.nativeFirst === false) nat();
  if (wd.sub) last = text(c, wd.sub, x, below(last, u * 0.02), w, { font: L.body[0], weight: L.body[1], size: u * s.sub, fill: P.muted, lines: 3, lh: 1.25, align });
  return below(last, 0);
}

// ---------- layouts ----------
/** Greeting: decoration across the top, greeting + title, big hero illustration underneath, optional pill. */
function hero(c: Kit, f: Format, L: Look, wd: Words): void {
  const { W, H, u } = c, P = L.pal;
  if (W / H > 1.3) return split(c, f, L, wd);
  scene(c, L.scene, f, L.sceneColors);
  let y = H * (H / W > 1.5 ? 0.12 : 0.07);
  if (L.top) { const t = fitArt(c, L.top, W / 2, 0, W * 0.9, H * (H / W > 1.5 ? 0.2 : 0.24), L.topColors, 'Top decoration'); y = Math.max(y, t.h * 0.82); }
  const end = textStack(c, L, wd, W * 0.08, y, W * 0.84, { native: 0.15, title: wd.native ? 0.075 : 0.13, titleLines: wd.native ? 1 : 2, sub: 0.034 });
  const pillText = wd.cta ?? detailLine(wd).join(' · ');
  const bottom = H - (pillText ? u * 0.15 : u * 0.06);
  fitArt(c, L.hero, W / 2, end + u * 0.04, W * 0.8, bottom - end - u * 0.04, L.heroColors, 'Illustration');
  if (L.corner) art(c, L.corner, W * 0.04, H - u * 0.3, u * 0.28, { colors: L.cornerColors, opacity: 0.9 });
  if (pillText) pill(c, pillText, W / 2, H - u * 0.12, u * 0.028, P.accent, P.onAccent, L.body[0], 800);
}

/** Wide pages: illustration on one side, the words on the other. */
function split(c: Kit, f: Format, L: Look, wd: Words): void {
  const { W, H, u } = c, P = L.pal;
  scene(c, L.scene, f, L.sceneColors);
  if (L.top) fitArt(c, L.top, W * 0.28, 0, W * 0.5, H * 0.3, L.topColors, 'Top decoration');
  fitArt(c, L.hero, W * 0.28, H * (L.top ? 0.28 : 0.12), W * 0.46, H * (L.top ? 0.64 : 0.76), L.heroColors, 'Illustration');
  const x = W * 0.54, w = W * 0.4;
  const end = textStack(c, L, wd, x, H * 0.16, w, { native: 0.14, title: 0.1, titleLines: 2, sub: 0.04 });
  const pillText = wd.cta ?? detailLine(wd).join(' · ');
  if (pillText) pill(c, pillText, x + w / 2, Math.min(end + u * 0.05, H - u * 0.14), u * 0.03, P.accent, P.onAccent, L.body[0], 800);
}

/**
 * Lay out a content block that must end above `bottom`: if it leaves free space (or runs over), rebuild it once with
 * a bigger (or smaller) illustration, then centre it vertically so cards never end half-empty. `body(heroMax)` adds the layers and returns
 * the bottom of the last one.
 */
function settle(c: Kit, bottom: number, heroMax: number, body: (heroMax: number) => number, centreOnly = false): void {
  const from = c.els.length;
  let end = body(heroMax), slack = bottom - end;
  if (!centreOnly && (slack > c.u * 0.06 || slack < 0)) { c.els.length = from; end = body(Math.max(c.u * 0.08, heroMax + slack * (slack > 0 ? 0.6 : 1.1))); slack = bottom - end; }
  if (slack > 0) for (const el of c.els.slice(from)) el.y += slack / 2;
}
const pillH = (size: number) => size * 2.3;

/** Invitation inside an arch window: decoration on top, illustration in the crown, text and details below. */
function arch(c: Kit, f: Format, L0: Look, wd: Words): void {
  const L = onPanel(L0), { W, H, u } = c, P = L.pal;
  if (W / H > 1.3) return split(c, f, L0, wd);
  scene(c, L.scene, f, L.sceneColors);
  const ax = W * 0.1, ay = H * (H / W > 1.5 ? 0.08 : 0.06), aw = W * 0.8, ah = H - ay * 2;
  box(c, ax, ay, aw, ah, P.panel ?? '#ffffff', { shape: 'arch', stroke: P.accent, strokeWidth: u * 0.006, name: 'Arch panel' });
  box(c, ax + u * 0.022, ay + u * 0.022, aw - u * 0.044, ah - u * 0.044, 'rgba(0,0,0,0)', { shape: 'arch', stroke: P.accent, strokeWidth: u * 0.0022, name: 'Arch line' });
  if (L.top) fitArt(c, L.top, W / 2, 0, W, H * 0.13, L.topColors, 'Top decoration');
  const ix = ax + aw * 0.1, iw = aw * 0.8, top = ay + aw * 0.2, bottom = ay + ah - u * 0.07;
  settle(c, bottom, H * 0.17, (heroMax) => {
    const hr = fitArt(c, L.hero, W / 2, top, aw * 0.78, heroMax, L.heroColors, 'Illustration');
    let end = textStack(c, L, wd, ix, below(hr, u * 0.035), iw, { native: 0.105, title: wd.native ? 0.085 : 0.11, titleLines: 2, sub: 0.032 });
    if (L.corner) { const d = fitArt(c, L.corner, W / 2, end + u * 0.03, u * 0.4, u * 0.11, L.cornerColors, 'Divider'); end = d.y + d.h; }
    for (const d of detailLine(wd)) { const t = text(c, d, ix, end + u * 0.022, iw, { font: L.body[0], weight: 700, size: u * 0.034, fill: P.ink, lines: 2 }); end = below(t, 0); }
    if (wd.cta) { pill(c, wd.cta, W / 2, end + u * 0.045, u * 0.026, P.accent, P.onAccent, L.body[0], 800); end += u * 0.045 + pillH(u * 0.026); }
    return end;
  });
}

/** Card or flyer inside an ornamental frame: illustration on top, centred words, details, pill. */
function framed(c: Kit, f: Format, L: Look, wd: Words): void {
  const { W, H, u } = c, P = L.pal;
  if (W / H > 1.3) return split(c, f, L, wd);
  scene(c, L.scene, f, L.sceneColors);
  if (L.frame) art(c, L.frame, W * 0.035, H * 0.025, W * 0.93, { h: H * 0.95, colors: L.frameColors, name: 'Frame' });
  let top = H * 0.07;
  if (L.top) { const t = fitArt(c, L.top, W / 2, H * 0.03, W * 0.8, H * 0.14, L.topColors, 'Top decoration'); top = Math.max(top, t.y + t.h * 0.9); }
  const cr = L.corner ? ratio(L.corner) : 1, ch = L.corner ? Math.min(u * 0.2 / cr, u * 0.22) : 0, cw = ch * cr;
  const bottom = H - (L.corner ? ch + u * 0.09 : u * 0.08);
  settle(c, bottom, H * 0.22, (heroMax) => {
    const hr = fitArt(c, L.hero, W / 2, top, W * 0.62, heroMax, L.heroColors, 'Illustration');
    let end = textStack(c, L, wd, W * 0.12, below(hr, u * 0.03), W * 0.76, { native: 0.11, title: wd.native ? 0.09 : 0.14, titleLines: 2, sub: 0.034 });
    for (const d of detailLine(wd)) { const t = text(c, d, W * 0.12, end + u * 0.022, W * 0.76, { font: L.body[0], weight: 700, size: u * 0.035, fill: P.ink, lines: 2 }); end = below(t, 0); }
    if (wd.cta) { pill(c, wd.cta, W / 2, end + u * 0.05, u * 0.027, P.accent, P.onAccent, L.body[0], 800); end += u * 0.05 + pillH(u * 0.027); }
    return end;
  });
  if (L.corner) { const y = H * 0.955 - u * 0.03 - ch; art(c, L.corner, W * 0.075, y, cw, { h: ch, colors: L.cornerColors, name: 'Corner' }); art(c, L.corner, W * 0.925 - cw, y, cw, { h: ch, colors: L.cornerColors, flip: true, name: 'Corner' }); }
}

/** Event poster: eyebrow pill, big title, greeting, large illustration, details card, call to action. */
function poster(c: Kit, f: Format, L: Look, wd: Words): void {
  const { W, H, u } = c, P = L.pal;
  if (W / H > 1.3) return split(c, f, L, wd);
  scene(c, L.scene, f, L.sceneColors);
  if (L.top) fitArt(c, L.top, W / 2, 0, W, H * 0.12, L.topColors, 'Top decoration');
  let y = H * (L.top ? 0.11 : 0.06);
  if (wd.eyebrow) { pill(c, wd.eyebrow, W / 2, y, u * 0.03, P.accent, P.onAccent, L.body[0], 800); y += u * 0.1; }
  const t = text(c, wd.title, W * 0.07, y, W * 0.86, { font: L.title[0], weight: L.title[1], size: u * 0.14, lines: 2, fill: P.title, lh: 1, name: 'Title', shadow: P.glow ? glow(P.glow, u * 0.02) : undefined });
  let last: { y: number; h: number } = t;
  if (wd.native) last = nativeLine(c, wd.native, W * 0.1, below(t, u * 0.012), W * 0.8, u * 0.075, P.accent, P);
  if (wd.sub) last = text(c, wd.sub, W * 0.1, below(last, u * 0.018), W * 0.8, { font: L.body[0], weight: L.body[1], size: u * 0.034, fill: P.muted, lines: 2, lh: 1.25 });
  const det = detailLine(wd), cardH = det.length ? u * (0.07 + det.length * 0.058) : 0;
  const ctaH = wd.cta ? u * 0.11 : 0;
  const cardY = H - u * 0.06 - ctaH - cardH;
  fitArt(c, L.hero, W / 2, below(last, u * 0.03), W * 0.84, cardY - below(last, u * 0.03) - u * 0.03, L.heroColors, 'Illustration');
  if (det.length) {
    box(c, W * 0.08, cardY, W * 0.84, cardH, P.panel ?? 'rgba(255,255,255,0.88)', { radius: u * 0.03, name: 'Details card' });
    det.forEach((d, i) => text(c, d, W * 0.11, cardY + u * (0.04 + i * 0.058), W * 0.78, { font: L.body[0], weight: i ? 600 : 800, size: u * (i ? 0.034 : 0.04), fill: i ? (P.panelMuted ?? P.muted) : (P.panelInk ?? P.ink) }));
  }
  if (wd.cta) pill(c, wd.cta, W / 2, H - u * 0.05 - ctaH * 0.85, u * 0.03, P.accent, P.onAccent, L.body[0], 800);
  if (L.corner) { const r = ratio(L.corner), ch = Math.min(u * 0.22 / r, u * 0.2); art(c, L.corner, W * 0.03, cardY - ch + u * 0.02, ch * r, { h: ch, colors: L.cornerColors, name: 'Corner' }); }
}

/** Minimal: calm background, one small illustration, a left-aligned headline over a thin rule, quiet details. */
function minimal(c: Kit, f: Format, L: Look, wd: Words): void {
  const { W, H, u } = c, P = L.pal;
  if (W / H > 1.3) return split(c, f, L, wd);
  scene(c, L.scene, f, L.sceneColors);
  const x = W * 0.1, w = W * 0.8, size = u * 0.3, r = ratio(L.hero);
  const aw = r >= 1 ? size : size * r;
  art(c, L.hero, x, H * 0.08, aw, { h: aw / r, colors: L.heroColors, name: 'Illustration' });
  let end = textStack(c, L, wd, x, H * (H / W > 1.5 ? 0.42 : 0.36), w, { native: 0.1, title: wd.native ? 0.09 : 0.13, titleLines: 3, sub: 0.034, align: 'left' });
  box(c, x, end + u * 0.04, u * 0.16, u * 0.006, P.accent, { name: 'Rule' });
  end += u * 0.07;
  for (const d of detailLine(wd)) { const t = text(c, d, x, end + u * 0.016, w, { font: L.body[0], weight: 700, size: u * 0.034, fill: P.ink, align: 'left', lines: 2 }); end = below(t, 0); }
  if (wd.cta) text(c, wd.cta, x, end + u * 0.04, w, { font: L.body[0], weight: 800, size: u * 0.03, fill: P.accent, upper: true, spacing: u * 0.006, align: 'left' });
  if (L.corner) art(c, L.corner, W - u * 0.34, H - u * 0.34, u * 0.28, { colors: L.cornerColors, opacity: 0.9, name: 'Corner' });
}

/** Medallion: a big round badge holding the illustration and greeting, with the details underneath. */
function medallion(c: Kit, f: Format, L: Look, wd: Words): void {
  const { W, H, u } = c, P = L.pal;
  if (W / H > 1.3) return split(c, f, L, wd);
  scene(c, L.scene, f, L.sceneColors);
  const tall = H / W > 1.5, square = H / W < 1.15;
  const d = square ? H * 0.66 : W * 0.8, cx = W / 2, top = tall ? H * 0.14 : square ? H * 0.06 : H * 0.08;
  if (L.top && !square) fitArt(c, L.top, W / 2, 0, W, top * 1.2, L.topColors, 'Top decoration');
  box(c, cx - d / 2, top, d, d, P.panel ?? '#ffffff', { shape: 'ellipse', stroke: P.accent, strokeWidth: u * 0.008, name: 'Medallion' });
  box(c, cx - d / 2 + u * 0.024, top + u * 0.024, d - u * 0.048, d - u * 0.048, 'rgba(0,0,0,0)', { shape: 'ellipse', stroke: P.accent, strokeWidth: u * 0.0025, name: 'Medallion ring' });
  const hr = fitArt(c, L.hero, cx, top + d * 0.12, d * 0.52, d * (square ? 0.34 : 0.36), L.heroColors, 'Illustration');
  const inner = { ...wd, eyebrow: undefined, sub: undefined };
  textStack(c, onPanel(L), inner, cx - d * 0.34, below(hr, u * 0.02), d * 0.68, { native: square ? 0.075 : 0.1, title: wd.native ? (square ? 0.065 : 0.075) : (square ? 0.09 : 0.1), titleLines: 2, sub: 0.03 });
  let end = top + d + u * 0.04;
  const lines = [wd.eyebrow && !square ? wd.eyebrow : '', wd.sub ?? '', ...(square ? [] : detailLine(wd))].filter(Boolean);
  lines.forEach((l, i) => { const t = text(c, l, W * 0.1, end, W * 0.8, { font: L.body[0], weight: i === 0 ? 700 : 600, size: u * (square ? 0.03 : 0.034), fill: i === 0 ? P.title : P.ink, lines: 2, lh: 1.2 }); end = below(t, u * 0.014); });
  const pillText = wd.cta ?? (square ? detailLine(wd)[0] : '');
  if (pillText) pill(c, pillText, W / 2, Math.min(end + u * 0.03, H - u * 0.1), u * 0.026, P.accent, P.onAccent, L.body[0], 800);
  if (L.corner) art(c, L.corner, W * 0.03, H - u * 0.25, u * 0.22, { colors: L.cornerColors, name: 'Corner' });
}

/** A replaceable photo in a shaped frame (soft placeholder in the theme's colours; tap Replace to use your own). */
function photoSlot(c: Kit, L: Look, x: number, y: number, w: number, h: number): void {
  const t = L.photo?.tint ?? [L.pal.accent, '#ffffff', L.pal.title];
  const key = `th-${t.join('').replace(/#/g, '')}`, seed = (x + y) % 7 | 0;
  const id = `ph-${key}-${seed}`;
  c.assets[id] = photoAsset({ id: key, primary: t[0], secondary: t[1], accent: t[2] } as Palette, seed);
  const el = makeImage(id, w, h, { mask: L.photo?.mask ?? 'rounded' });
  Object.assign(el, { x, y, w, h, name: 'Photo — tap to add yours' });
  c.els.push(el);
  const m = L.photo?.mask ?? 'rounded', pad = c.u * 0.016;
  box(c, x - pad, y - pad, w + pad * 2, h + pad * 2, 'rgba(0,0,0,0)', { shape: m === 'circle' ? 'ellipse' : m === 'arch' ? 'arch' : 'rect', radius: m === 'rounded' ? Math.min(w, h) * 0.13 : 0, stroke: L.pal.accent, strokeWidth: c.u * 0.006, name: 'Photo frame' });
}

/** Photo card: your photo in a shaped frame, a small illustration tucked on its edge, the words underneath. */
function photo(c: Kit, f: Format, L: Look, wd: Words): void {
  const { W, H, u } = c, P = L.pal;
  scene(c, L.scene, f, L.sceneColors);
  const circle = L.photo?.mask === 'circle';
  if (W / H > 1.3) {
    const ph = H * 0.76, pw = circle ? ph : ph * 0.8;
    photoSlot(c, L, W * 0.07, H * 0.12, pw, ph);
    fitArt(c, L.hero, W * 0.07 + pw, H * 0.12 + ph - u * 0.24, u * 0.3, u * 0.3, L.heroColors, 'Illustration');
    const x = W * 0.07 + pw + W * 0.08, w = W - x - W * 0.06;
    const end = textStack(c, L, wd, x, H * 0.2, w, { native: 0.12, title: 0.1, titleLines: 2, sub: 0.04 });
    const tx = wd.cta ?? detailLine(wd).join(' · ');
    if (tx) pill(c, tx, x + w / 2, Math.min(end + u * 0.05, H - u * 0.14), u * 0.03, P.accent, P.onAccent, L.body[0], 800);
    return;
  }
  const square = H / W < 1.15;
  const pw = square ? (circle ? H * 0.46 : W * 0.5) : W * (circle ? 0.62 : 0.66);
  const ph = circle ? pw : pw * (square ? 0.86 : 1.12);
  const py = H * (H / W > 1.5 ? 0.1 : 0.06);
  if (L.top) fitArt(c, L.top, W / 2, 0, W, py * 1.6, L.topColors, 'Top decoration');
  photoSlot(c, L, (W - pw) / 2, py, pw, ph);
  fitArt(c, L.hero, (W + pw) / 2 - u * 0.04, py + ph - u * 0.2, u * 0.26, u * 0.26, L.heroColors, 'Illustration');
  settle(c, H - u * 0.07, 0, () => {
    let end = textStack(c, L, wd, W * 0.1, py + ph + u * 0.05, W * 0.8, { native: square ? 0.07 : 0.09, title: square ? 0.075 : 0.1, titleLines: 2, sub: 0.032 });
    for (const d of square ? [] : detailLine(wd)) { const t = text(c, d, W * 0.1, end + u * 0.018, W * 0.8, { font: L.body[0], weight: 700, size: u * 0.034, fill: P.ink, lines: 2 }); end = below(t, 0); }
    const tx = wd.cta ?? (square ? detailLine(wd)[0] : '');
    if (tx) { pill(c, tx, W / 2, end + u * 0.035, u * 0.026, P.accent, P.onAccent, L.body[0], 800); end += u * 0.035 + pillH(u * 0.026); }
    return end;
  }, true);
  if (L.corner) art(c, L.corner, W * 0.03, H - u * 0.25, u * 0.22, { colors: L.cornerColors, name: 'Corner' });
}

const LAYOUTS: Record<LayoutId, (c: Kit, f: Format, L: Look, wd: Words) => void> = { hero, split, arch, framed, poster, minimal, medallion, photo };

/** A collection template built from a layout, a look and words. */
export function themed(s: ThemedSpec): CollectionTemplate {
  return {
    id: s.id, name: s.name, format: s.format, use: s.use, style: s.style, colors: s.colors, occasion: s.occasion,
    tags: [...s.tags, s.layout === 'arch' ? 'arch' : s.layout, ...(s.words.native ? [s.words.native.text, SCRIPT_NAME[s.words.native.script].toLowerCase()] : [])],
    build: (c) => { c.bg = s.look.sceneColors?.[0] ?? sceneColor(s.look.scene) ?? c.bg; LAYOUTS[s.layout](c, s.format, s.look, s.words); },
  };
}
