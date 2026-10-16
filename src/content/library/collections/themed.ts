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
  small?: string;    // (derived) the accent adjusted to read at small sizes (4.5:1 on the background)
  bg?: string;       // (set by the layouts) the solid colour the words sit on, so a greeting's own colour is only kept when it reads
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
/**
 * Layouts: centred greeting (`hero`), arch window, ornamental frame, event `poster`, wide `split`, quiet `minimal`, round
 * `medallion`, `photo` card, plus four skeletons that break the centred stack: `editorial` (left-aligned words, the
 * illustration bleeding off the right edge), `panel` (full-bleed illustration with the words on a card), `band`
 * (asymmetric split: illustration on the scene, words on a solid colour block) and `type` (typography-led: a huge
 * headline, small art, details in columns).
 */
export type LayoutId = 'hero' | 'arch' | 'framed' | 'poster' | 'split' | 'minimal' | 'medallion' | 'photo' | 'editorial' | 'panel' | 'band' | 'type';
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
const onPanel = (L: Look): Look => withBg({ ...L, pal: { ...L.pal, title: L.pal.panelTitle ?? L.pal.title, ink: L.pal.panelInk ?? L.pal.ink, muted: L.pal.panelMuted ?? L.pal.muted } }, L.pal.panel ?? '#ffffff');
/** The look with small accent text and muted text adjusted to read on `bg` (WCAG 4.5:1). */
function withBg(L: Look, bg: string): Look {
  const P = L.pal;
  return { ...L, pal: { ...P, bg, small: readOn(P.accent, bg, 5), muted: readable(bg, 5, P.muted, P.ink) } };
}
/** A rounded label in the accent colour, its fill deepened if needed so the words on it pass 4.5:1. */
function tag(c: Kit, L: Look, s: string, cx: number, y: number, size: number): void {
  const P = L.pal, fill = contrast(P.onAccent, P.accent) >= 4.5 ? P.accent : readOn(P.accent, P.onAccent, 4.5);
  pill(c, s, cx, y, size, fill, P.onAccent, L.body[0], 800);
}
const SCRIPT_NAME: Record<Script, string> = { ar: 'Arabic', he: 'Hebrew', fa: 'Persian', hi: 'Hindi', ml: 'Malayalam', pa: 'Punjabi', zh: 'Chinese', latin: 'Greeting' };

// ---------- colour ----------
function rgbOf(s: string): [number, number, number] {
  const m = s.match(/^#([0-9a-f]{6})$/i);
  if (m) return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)) as [number, number, number];
  const r = s.match(/rgba?\(([^)]+)\)/);
  return r ? r[1].split(',').slice(0, 3).map(Number) as [number, number, number] : [128, 128, 128];
}
const hexOf = (c: number[]) => '#' + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
function lumOf(s: string): number {
  const f = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const [r, g, b] = rgbOf(s);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
/** WCAG contrast ratio of two colours. */
export function contrast(a: string, b: string): number { const x = lumOf(a), y = lumOf(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
/** `c` darkened (on light backgrounds) or lightened (on dark ones) just enough to read on `bg` at `need`:1, keeping its hue. */
function readOn(c: string, bg: string, need: number): string {
  let rgb = rgbOf(c);
  const dark = lumOf(bg) < 0.25;
  for (let i = 0; i < 24 && contrast(hexOf(rgb), bg) < need; i++) rgb = dark ? rgb.map((v) => v + (255 - v) * 0.14) as typeof rgb : rgb.map((v) => v * 0.86) as typeof rgb;
  return hexOf(rgb);
}
/** The first colour that reads on `bg` at `need`:1, else the first one adjusted until it does. */
function readable(bg: string, need: number, ...cands: (string | undefined)[]): string {
  const list = cands.filter((x): x is string => !!x && !/gradient/.test(x));
  return list.find((x) => contrast(x, bg) >= need) ?? readOn(list[0] ?? '#222222', bg, need);
}
/** The look's palette re-picked for words sitting on a solid `fill` (cards, colour blocks): every colour passes WCAG. */
function onFill(L: Look, fill: string): Look {
  const P = L.pal, dark = lumOf(fill) < 0.25;
  const ink = readable(fill, 4.5, dark ? undefined : P.panelInk, P.ink, dark ? '#f6f2ea' : P.onAccent);
  return { ...L, pal: {
    ...P, bg: fill,
    title: readable(fill, 3, dark ? undefined : P.panelTitle, P.title, dark ? '#ffffff' : P.onAccent),
    ink,
    muted: readable(fill, 4.5, dark ? undefined : P.panelMuted, P.muted, ink),
    accent: readable(fill, 4.5, P.accent, dark ? P.glow : undefined),
    small: undefined,
    glow: undefined,
  } };
}
/** A deep colour from the look for a solid block that white words read on (4.6:1). */
function deepOf(L: Look): string {
  const P = L.pal;
  const base = lumOf(P.title) < 0.2 ? P.title : lumOf(P.onAccent) < 0.2 ? P.onAccent : '#1f2430';
  return readOn(base, '#ffffff', 4.8);
}
/** A light card colour from the look (its panel colour when it has a solid light one). */
function cardOf(L: Look): string {
  const p = L.pal.panel;
  if (p && /^#/.test(p) && lumOf(p) > 0.7) return p;
  if (p && /^rgba/.test(p) && lumOf(p) > 0.7) return hexOf(rgbOf(p));
  return '#fffdf8';
}

// ---------- pieces ----------
/** The greeting in its own script: no letter spacing (keeps Arabic joined), a little more line height for tall marks. */
function nativeLine(c: Kit, n: Native, x: number, y: number, w: number, size: number, fill: string, pal: Pal, lines = 1, align: 'left' | 'center' = 'center'): TextEl {
  return text(c, n.text, x, y, w, {
    align,
    font: n.font[0], weight: n.font[1], size, lines, fill: nativeColour(n, fill, pal), lh: RTL.includes(n.script) || n.script === 'hi' ? 1.3 : 1.1,
    shadow: pal.glow ? glow(pal.glow, c.u * 0.03) : undefined, name: `${SCRIPT_NAME[n.script]} greeting`,
  });
}
/** The greeting's own colour when it reads on the background, else the layout's colour — nudged to 3.2:1 either way. */
function nativeColour(n: Native, fill: string, pal: Pal): string {
  const c = n.color && (!pal.bg || contrast(n.color, pal.bg) >= 2.6) ? n.color : fill;
  return pal.bg && /^#/.test(c) ? readOn(c, pal.bg, 3.2) : c;
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
/** Stories are read at arm's length on a phone: their body text is set a quarter bigger. */
const tallK = (c: Kit) => (c.H / c.W > 1.5 ? 1.25 : 1);

/** Eyebrow → native greeting → title → sub, centred in a column. Returns the bottom of the last line. */
function textStack(c: Kit, L: Look, wd: Words, x: number, y: number, w: number, s: { native: number; title: number; titleLines: number; sub: number; nativeFirst?: boolean; align?: 'left' | 'center' }): number {
  const { u } = c, P = L.pal, align = s.align ?? 'center', k = tallK(c);
  let last = { y, h: 0 };
  if (wd.eyebrow) last = text(c, wd.eyebrow, x, y, w, { font: L.body[0], weight: 800, size: u * 0.032 * k, fill: P.small ?? P.accent, upper: true, spacing: u * 0.008, align, lines: 2, name: 'Eyebrow' });
  const nat = () => { if (wd.native) last = nativeLine(c, wd.native, x, below(last, last.h ? u * 0.012 : 0), w, u * s.native, P.accent, P, 1, align); };
  if (s.nativeFirst !== false) nat();
  const tf = L.script && s.titleLines === 1 ? L.script : L.title;
  last = text(c, wd.title, x, below(last, last.h ? u * 0.012 : 0), w, { font: tf[0], weight: tf[1], size: u * s.title, lines: s.titleLines, fill: P.title, lh: 1.04, align, name: 'Title', shadow: P.glow && !wd.native ? glow(P.glow, u * 0.025) : undefined });
  if (s.nativeFirst === false) nat();
  if (wd.sub) last = text(c, wd.sub, x, below(last, u * 0.02), w, { font: L.body[0], weight: L.body[1], size: u * Math.max(s.sub, 0.034) * k, fill: P.muted, lines: 3, lh: 1.25, align, name: 'Subtitle' });
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
  let end = textStack(c, L, wd, W * 0.08, y, W * 0.84, { native: 0.15, title: wd.native ? 0.08 : 0.13, titleLines: wd.native ? 1 : 2, sub: 0.036 });
  for (const d of detailLine(wd)) { const t = text(c, d, W * 0.1, end + u * 0.018, W * 0.8, { font: L.body[0], weight: 700, size: u * 0.034 * tallK(c), fill: P.ink, lines: 2, name: 'Details' }); end = below(t, 0); }
  const pillText = wd.cta;
  const bottom = H - (pillText ? u * 0.16 : u * 0.07);
  fitArt(c, L.hero, W / 2, end + u * 0.04, W * 0.84, bottom - end - u * 0.04, L.heroColors, 'Illustration');
  if (L.corner) art(c, L.corner, W * 0.04, H - u * 0.3, u * 0.28, { colors: L.cornerColors, opacity: 0.9 });
  if (pillText) tag(c, L, pillText, W / 2, H - u * 0.13, u * 0.03 * tallK(c));
}

/** Wide pages: illustration on one side, the words on the other. */
function split(c: Kit, f: Format, L: Look, wd: Words): void {
  const { W, H, u } = c;
  scene(c, L.scene, f, L.sceneColors);
  if (L.top) fitArt(c, L.top, W * 0.28, 0, W * 0.5, H * 0.3, L.topColors, 'Top decoration');
  fitArt(c, L.hero, W * 0.28, H * (L.top ? 0.28 : 0.12), W * 0.46, H * (L.top ? 0.64 : 0.76), L.heroColors, 'Illustration');
  const x = W * 0.54, w = W * 0.38, from = c.els.length;
  let end = textStack(c, L, wd, x, 0, w, { native: 0.14, title: 0.1, titleLines: 2, sub: 0.042 });
  for (const d of detailLine(wd)) end = below(text(c, d, x, end + u * 0.02, w, { font: L.body[0], weight: 700, size: u * 0.04, fill: L.pal.ink, lines: 2, name: 'Details' }), 0);
  const tx = wd.cta;
  if (tx) { tag(c, L, tx, x + w / 2, end + u * 0.05, u * 0.034); end += u * 0.05 + pillH(u * 0.034); }
  shift(c, from, Math.max(H * 0.08, (H - end) / 2));
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
    if (wd.cta) end = below(ctaText(c, L, wd.cta, ix, end + u * 0.04, iw, 'center'), 0);
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
    if (wd.cta) { tag(c, L, wd.cta, W / 2, end + u * 0.05, u * 0.027); end += u * 0.05 + pillH(u * 0.027); }
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
  if (wd.eyebrow) { tag(c, L, wd.eyebrow, W / 2, y, u * 0.03); y += u * 0.1; }
  const t = text(c, wd.title, W * 0.07, y, W * 0.86, { font: L.title[0], weight: L.title[1], size: u * 0.14, lines: 2, fill: P.title, lh: 1, name: 'Title', shadow: P.glow ? glow(P.glow, u * 0.02) : undefined });
  let last: { y: number; h: number } = t;
  if (wd.native) last = nativeLine(c, wd.native, W * 0.1, below(t, u * 0.012), W * 0.8, u * 0.075, P.accent, P);
  if (wd.sub) last = text(c, wd.sub, W * 0.1, below(last, u * 0.018), W * 0.8, { font: L.body[0], weight: L.body[1], size: u * 0.034, fill: P.muted, lines: 2, lh: 1.25 });
  const det = detailLine(wd), cardH = det.length ? u * (0.07 + det.length * 0.058) : 0;
  const ctaH = wd.cta ? u * 0.11 : 0;
  const cardY = H - u * 0.06 - ctaH - cardH;
  fitArt(c, L.hero, W / 2, below(last, u * 0.03), W * 0.84, cardY - below(last, u * 0.03) - u * 0.03, L.heroColors, 'Illustration');
  if (det.length) {
    const cardFill = P.panel ?? 'rgba(255,255,255,0.88)', CL = onFill(L, /^#|^rgb/.test(cardFill) ? hexOf(rgbOf(cardFill)) : '#ffffff').pal;
    box(c, W * 0.08, cardY, W * 0.84, cardH, cardFill, { radius: u * 0.03, name: 'Details card' });
    det.forEach((d, i) => text(c, d, W * 0.11, cardY + u * (0.04 + i * 0.058), W * 0.78, { font: L.body[0], weight: i ? 600 : 800, size: u * (i ? 0.034 : 0.04), fill: i ? CL.muted : CL.ink, name: 'Details' }));
  }
  if (wd.cta) tag(c, L, wd.cta, W / 2, H - u * 0.05 - ctaH * 0.85, u * 0.03);
  if (L.corner) { const r = ratio(L.corner), ch = Math.min(u * 0.22 / r, u * 0.2); art(c, L.corner, W * 0.03, cardY - ch + u * 0.02, ch * r, { h: ch, colors: L.cornerColors, name: 'Corner' }); }
}

/** Minimal: calm background, one small illustration, a left-aligned headline over a thin rule, quiet details. */
function minimal(c: Kit, f: Format, L: Look, wd: Words): void {
  const { W, H, u } = c, P = L.pal;
  if (W / H > 1.3) return split(c, f, L, wd);
  scene(c, L.scene, f, L.sceneColors);
  const tall = H / W > 1.5, x = W * 0.1, w = W * 0.8, size = u * (tall ? 0.5 : H / W < 1.15 ? 0.28 : 0.36), r = ratio(L.hero);
  const aw = r >= 1 ? size : size * r;
  art(c, L.hero, x, H * 0.08, aw, { h: aw / r, colors: L.heroColors, name: 'Illustration' });
  const from = c.els.length;
  let end = textStack(c, L, wd, x, 0, w, { native: tall ? 0.12 : 0.1, title: wd.native ? 0.09 : 0.13, titleLines: 3, sub: 0.036, align: 'left' });
  box(c, x, end + u * 0.04, u * 0.16, u * 0.006, P.accent, { name: 'Rule' });
  end += u * 0.07;
  for (const d of detailLine(wd)) { const t = text(c, d, x, end + u * 0.016, w, { font: L.body[0], weight: 700, size: u * 0.034 * tallK(c), fill: P.ink, align: 'left', lines: 2, name: 'Details' }); end = below(t, 0); }
  if (wd.cta) end = below(ctaText(c, L, wd.cta, x, end + u * 0.04, w, 'left'), 0);
  const artEnd = H * 0.08 + aw / r + u * 0.06, room = H * 0.92 - artEnd;
  shift(c, from, artEnd + Math.max(0, (room - end) * 0.55));
  if (L.corner) art(c, L.corner, W - u * 0.34, H - u * 0.34, u * 0.28, { colors: L.cornerColors, opacity: 0.9, name: 'Corner' });
}

/** Medallion: a big round badge holding the illustration and greeting (filling it, centred), with the words underneath; the whole group is centred on the page. */
function medallion(c: Kit, f: Format, L: Look, wd: Words): void {
  const { W, H, u } = c, P = L.pal;
  if (W / H > 1.3) return split(c, f, L, wd);
  scene(c, L.scene, f, L.sceneColors);
  const square = H / W < 1.15, k = tallK(c);
  const d = square ? H * 0.6 : W * 0.8, cx = W / 2;
  // words under the badge, built first so the group can be centred
  const from = c.els.length;
  let end = 0;
  const lines = [wd.eyebrow && !square ? wd.eyebrow : '', wd.sub ?? '', ...(square ? [] : detailLine(wd))].filter(Boolean);
  lines.forEach((l, i) => { const t = text(c, l, W * 0.1, end, W * 0.8, { font: L.body[0], weight: i === 0 ? 700 : 600, size: u * (square ? 0.034 : 0.036) * k, fill: i === 0 ? P.title : P.ink, lines: 2, lh: 1.2, name: i === 0 ? 'Subtitle' : 'Details' }); end = below(t, u * 0.016); });
  const pillText = wd.cta ?? (square ? detailLine(wd)[0] : '');
  if (pillText) { tag(c, L, pillText, W / 2, end + u * 0.02, u * 0.03 * k); end += u * 0.02 + pillH(u * 0.03 * k); }
  const gap = u * 0.05, group = d + gap + end;
  const minTop = L.top && !square ? H * 0.13 : H * 0.06;
  const top = Math.max(minTop, (H - group) / 2);
  shift(c, from, top + d + gap);
  if (L.top && !square) fitArt(c, L.top, W / 2, 0, W, top * 0.95, L.topColors, 'Top decoration');
  box(c, cx - d / 2, top, d, d, P.panel ?? '#ffffff', { shape: 'ellipse', stroke: P.accent, strokeWidth: u * 0.008, name: 'Medallion' });
  box(c, cx - d / 2 + u * 0.024, top + u * 0.024, d - u * 0.048, d - u * 0.048, 'rgba(0,0,0,0)', { shape: 'ellipse', stroke: P.accent, strokeWidth: u * 0.0025, name: 'Medallion ring' });
  const inner = { ...wd, eyebrow: undefined, sub: undefined }, IL = onPanel(L);
  settle(c, top + d * 0.86, d * 0.36, (heroMax) => {
    const hr = fitArt(c, L.hero, cx, top + d * 0.14, d * 0.56, Math.min(heroMax, d * 0.46), L.heroColors, 'Illustration');
    return textStack(c, IL, inner, cx - d * 0.37, below(hr, u * 0.02), d * 0.74, { native: square ? 0.085 : 0.105, title: wd.native ? (square ? 0.075 : 0.085) : (square ? 0.11 : 0.125), titleLines: 2, sub: 0.03 });
  });
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
    if (tx) tag(c, L, tx, x + w / 2, Math.min(end + u * 0.05, H - u * 0.14), u * 0.03);
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
    let end = textStack(c, L, wd, W * 0.1, py + ph + u * 0.05, W * 0.8, { native: square ? 0.07 : 0.1, title: square ? 0.075 : H / W > 1.5 ? 0.13 : 0.1, titleLines: 2, sub: 0.034 });
    for (const d of square ? [] : detailLine(wd)) { const t = text(c, d, W * 0.1, end + u * 0.018, W * 0.8, { font: L.body[0], weight: 700, size: u * 0.034 * tallK(c), fill: P.ink, lines: 2, name: 'Details' }); end = below(t, 0); }
    const tx = wd.cta ?? (square ? detailLine(wd)[0] : '');
    if (tx) end = below(ctaText(c, L, tx, W * 0.1, end + u * 0.035, W * 0.8, 'center'), 0);
    return end;
  }, true);
  if (L.corner) art(c, L.corner, W * 0.03, H - u * 0.25, u * 0.22, { colors: L.cornerColors, name: 'Corner' });
}

// ---------- the four newer skeletons ----------
interface WordOpts { align: 'left' | 'center'; native: number; title: number; titleLines: number; sub?: number; detail?: number; rule?: boolean; cta?: boolean; titleFont?: FontRef }
/**
 * The words of a template as one block (eyebrow, accent rule, greeting, title, sub, details, call to action as text —
 * no pill). Body ≥ 3.4 % and details ≥ 3.2 % of the short side. Returns the bottom of the last line.
 */
function words(c: Kit, L: Look, wd: Words, x: number, y: number, w: number, o: WordOpts): number {
  const { u } = c, P = L.pal, align = o.align, k = tallK(c), kt = k > 1 ? 1.15 : 1;
  let last = { y, h: 0 };
  const next = (g: number) => (last.h ? below(last, u * g) : last.y);
  if (wd.eyebrow) last = text(c, wd.eyebrow, x, y, w, { font: L.body[0], weight: 800, size: u * 0.032 * k, fill: P.small ?? P.accent, upper: true, spacing: u * 0.008, align, lines: 2, name: 'Eyebrow' });
  if (o.rule) { const ry = next(0.026), rw = u * 0.11; box(c, align === 'left' ? x : x + (w - rw) / 2, ry, rw, u * 0.007, P.accent, { name: 'Rule' }); last = { y: ry, h: u * 0.007 }; }
  if (wd.native) last = nativeLine(c, wd.native, x, next(0.024), w, u * o.native * kt, P.accent, P, 2, align);
  const tf = o.titleFont ?? L.title;
  last = text(c, wd.title, x, next(0.016), w, { font: tf[0], weight: tf[1], size: u * o.title * kt, lines: o.titleLines, fill: P.title, lh: 1.02, align, name: 'Title', shadow: P.glow && !wd.native ? glow(P.glow, u * 0.02) : undefined });
  if (wd.sub) last = text(c, wd.sub, x, next(0.024), w, { font: L.body[0], weight: L.body[1], size: u * (o.sub ?? 0.036) * k, fill: P.muted, lines: 3, lh: 1.3, align, name: 'Subtitle' });
  detailLine(wd).forEach((d, i) => { last = text(c, d, x, next(i ? 0.012 : 0.034), w, { font: L.body[0], weight: i ? 600 : 800, size: u * (o.detail ?? 0.034) * k, fill: P.ink, lines: 2, lh: 1.2, align, name: 'Details' }); });
  if (wd.cta && o.cta !== false) last = ctaText(c, L, wd.cta, x, next(0.04), w, align);
  return below(last, 0);
}
/** A call to action set as spaced accent capitals (a quieter alternative to the pill). */
function ctaText(c: Kit, L: Look, s: string, x: number, y: number, w: number, align: 'left' | 'center' | 'right'): TextEl {
  return text(c, s, x, y, w, { font: L.body[0], weight: 800, size: c.u * 0.031 * tallK(c), fill: L.pal.small ?? L.pal.accent, upper: true, spacing: c.u * 0.006, align, lines: 2, name: 'Call to action' });
}
/** The hero illustration fitted into a box and centred in it vertically too. */
function centreArt(c: Kit, L: Look, cx: number, top: number, maxW: number, maxH: number): void {
  const r = ratio(L.hero), h = Math.min(maxH, maxW / r);
  fitArt(c, L.hero, cx, top + (maxH - h) / 2, maxW, h, L.heroColors, 'Illustration');
}
/** Moves every layer added since `from` down by `dy`. */
const shift = (c: Kit, from: number, dy: number) => { for (const el of c.els.slice(from)) el.y += dy; };
/** Runs `add` and moves the layers it made to position `at` (so an illustration can sit under a card drawn earlier). */
function underAt(c: Kit, at: number, add: () => void): void { const n = c.els.length; add(); const made = c.els.splice(n); c.els.splice(at, 0, ...made); }
/** An illustration that may run off the page (`bleed` = share of its width past the right edge). */
function bleedArt(c: Kit, L: Look, right: number, cy: number, maxW: number, maxH: number, bleed: number): { x: number; y: number; w: number; h: number } {
  const r = ratio(L.hero);
  let w = maxW, h = w / r;
  if (h > maxH) { h = maxH; w = h * r; }
  const x = right - w * (1 - bleed), y = cy - h / 2;
  art(c, L.hero, x, y, w, { h, colors: L.heroColors, name: 'Illustration' });
  return { x, y, w, h };
}

/** Editorial: words left-aligned in a column, the illustration large and running off the right (or top-right) edge. */
function editorial(c: Kit, f: Format, L: Look, wd: Words): void {
  const { W, H, u } = c;
  if (W / H > 1.3) return split(c, f, L, wd);
  scene(c, L.scene, f, L.sceneColors);
  const x = W * 0.08, tall = H / W > 1.5, square = H / W < 1.15;
  if (square) {
    const r = ratio(L.hero);
    if (r > 1.2) {
      // a wide illustration sits along the bottom, running off the right edge; the words take the top
      const from = c.els.length;
      const end = words(c, L, wd, x, H * 0.09, W * 0.7, { align: 'left', native: 0.095, title: wd.native ? 0.095 : 0.13, titleLines: 2, rule: !wd.eyebrow, sub: 0.04, detail: 0.036 });
      const room = H * 0.93 - end - u * 0.04;
      let aw = W * 0.82, ah = aw / r;
      if (ah > room) { ah = room; aw = ah * r; }
      underAt(c, from, () => art(c, L.hero, W - aw * 0.88, H * 0.93 - ah, aw, { h: ah, colors: L.heroColors, name: 'Illustration' }));
      return;
    }
    const a = bleedArt(c, L, W, H * 0.52, W * 0.66, H * 0.8, 0.2);
    const w = Math.min(W * 0.56, a.x - x - u * 0.03);
    const from = c.els.length;
    const end = words(c, L, wd, x, 0, w, { align: 'left', native: 0.095, title: wd.native ? 0.095 : 0.13, titleLines: wd.title.split(' ').length <= 4 ? 2 : 3, rule: !wd.eyebrow, sub: 0.04, detail: 0.036 });
    shift(c, from, Math.max(H * 0.08, (H - end) / 2));
    return;
  }
  // portrait / story: the words sit at the bottom-left, the illustration fills the space above and bleeds off the right
  const from = c.els.length;
  const end = words(c, L, wd, x, 0, W * 0.84, { align: 'left', native: 0.1, title: wd.native ? (tall ? 0.11 : 0.1) : (tall ? 0.15 : 0.13), titleLines: 3, rule: true, sub: 0.036, detail: 0.034 });
  const top = H - H * 0.075 - end;
  shift(c, from, top);
  const room = top - (tall ? H * 0.06 : H * 0.05) - u * 0.05;
  underAt(c, from, () => { if (room > u * 0.15) bleedArt(c, L, W, (tall ? H * 0.06 : H * 0.05) + room / 2 + u * 0.02, W * (tall ? 1.05 : 0.9), room, tall ? 0.16 : 0.12); });
}

/** Panel: the illustration fills the page, the words sit on a solid card pinned to the bottom. */
function panel(c: Kit, f: Format, L0: Look, wd: Words): void {
  const { W, H, u } = c;
  if (W / H > 1.3) return split(c, f, L0, wd);
  scene(c, L0.scene, f, L0.sceneColors);
  const fill = cardOf(L0), L = onFill(L0, fill), tall = H / W > 1.5, square = H / W < 1.15;
  const cx = W * 0.07, cw = W * 0.86, pad = u * (square ? 0.055 : 0.065);
  const at = c.els.length;
  const card = box(c, cx, 0, cw, 10, fill, { radius: u * 0.035, name: 'Text card' });
  const stripe = box(c, cx + pad, 0, u * 0.1, u * 0.008, L.pal.accent, { name: 'Accent' });
  const from = c.els.length;
  const end = words(c, L, wd, cx + pad, pad + u * 0.035, cw - pad * 2, { align: 'left', native: square ? 0.075 : 0.09, title: wd.native ? (square ? 0.07 : 0.085) : (square ? 0.09 : 0.11), titleLines: 2, sub: square ? 0.034 : 0.037, detail: square ? 0.032 : 0.035 });
  card.h = end + pad;
  const cy = H - (square ? H * 0.06 : H * 0.07) - card.h;
  card.y = cy; stripe.y = cy + pad; shift(c, from, cy);
  // the illustration fills the space above (and tucks a little behind the card)
  let top = tall ? H * 0.07 : H * 0.05;
  underAt(c, at, () => {
    if (L0.top) { const t = fitArt(c, L0.top, W / 2, 0, W, H * (tall ? 0.16 : 0.2), L0.topColors, 'Top decoration'); top = Math.max(top, t.h * 0.85); }
    centreArt(c, L0, W / 2, top, W * 0.84, cy + u * 0.03 - top);
  });
}

/** Band: an asymmetric split — the illustration on the scene, the words on a solid colour block (bottom, or left on squares). */
function band(c: Kit, f: Format, L0: Look, wd: Words): void {
  const { W, H, u } = c;
  if (W / H > 1.3) return split(c, f, L0, wd);
  scene(c, L0.scene, f, L0.sceneColors);
  const fill = deepOf(L0), L = onFill(L0, fill), square = H / W < 1.15, tall = H / W > 1.5;
  if (square && ratio(L0.hero) < 1.15) {
    const bw = W * 0.5, x = W * 0.075, w = bw - x - W * 0.06;
    box(c, 0, 0, bw, H, fill, { name: 'Colour block' });
    box(c, bw - u * 0.012, 0, u * 0.012, H, L.pal.accent, { name: 'Accent line' });
    const from = c.els.length;
    const end = words(c, L, wd, x, 0, w, { align: 'left', native: 0.075, title: wd.native ? 0.075 : 0.095, titleLines: 3, sub: 0.034, detail: 0.032 });
    shift(c, from, Math.max(H * 0.08, (H - end) / 2));
    if (L0.top) fitArt(c, L0.top, bw + (W - bw) / 2, 0, W - bw, H * 0.24, L0.topColors, 'Top decoration');
    centreArt(c, L0, bw + (W - bw) / 2, H * (L0.top ? 0.26 : 0.1), (W - bw) * 0.86, H * (L0.top ? 0.66 : 0.8));
    return;
  }
  const x = W * 0.08, w = W * 0.84, pad = H * (tall ? 0.06 : 0.055);
  const at = c.els.length;
  const block = box(c, 0, 0, W, 10, fill, { name: 'Colour block' });
  const line = box(c, 0, 0, W, u * 0.012, L.pal.accent, { name: 'Accent line' });
  const from = c.els.length;
  const end = words(c, L, wd, x, 0, w, { align: 'left', native: 0.09, title: wd.native ? 0.09 : 0.115, titleLines: 2, sub: 0.036, detail: 0.035 });
  const bh = Math.max(H * (tall ? 0.36 : 0.4), end + pad * 2), by = H - bh;
  block.y = by; block.h = bh; line.y = by;
  shift(c, from, by + (bh - end) / 2);
  underAt(c, at, () => {
    let top = H * 0.06;
    if (L0.top) { const t = fitArt(c, L0.top, W / 2, 0, W, H * (tall ? 0.15 : 0.18), L0.topColors, 'Top decoration'); top = Math.max(top, t.h * 0.85); }
    centreArt(c, L0, W / 2, top, W * 0.8, by - top - H * 0.04);
  });
}

/** Type: typography leads — a huge left-aligned headline, a small illustration as a motif, details in columns at the foot. */
function type(c: Kit, f: Format, L: Look, wd: Words): void {
  const { W, H, u } = c, P = L.pal;
  if (W / H > 1.3) return split(c, f, L, wd);
  scene(c, L.scene, f, L.sceneColors);
  const x = W * 0.08, w = W * 0.84, tall = H / W > 1.5, square = H / W < 1.15;
  // small art at the top-right, eyebrow at the top-left
  const art0 = fitArt(c, L.hero, W - x - u * (square ? 0.12 : 0.15), H * 0.06, u * (square ? 0.24 : 0.3), u * (square ? 0.22 : 0.3), L.heroColors, 'Illustration');
  let y = H * 0.07;
  if (wd.eyebrow) { const e = text(c, wd.eyebrow, x, y, W * 0.5, { font: L.body[0], weight: 800, size: u * 0.032, fill: P.small ?? P.accent, upper: true, spacing: u * 0.008, align: 'left', lines: 2, name: 'Eyebrow' }); y = below(e, 0); }
  // the foot: a hairline, then details in two columns and the call to action
  const det = detailLine(wd), foot = c.els.length;
  const colW = (w - u * 0.05) / 2, dsz = u * 0.034 * tallK(c);
  let fy = u * 0.035;
  const subInFoot = !det.length && !wd.cta && !!wd.sub;
  const items = subInFoot ? [wd.sub as string] : [...det, ...(wd.cta ? [wd.cta] : [])];
  const cols: string[][] = items.length > 1 ? [items.slice(0, Math.ceil(items.length / 2)), items.slice(Math.ceil(items.length / 2))] : [items];
  let fEnd = items.length ? fy : 0;
  cols.forEach((col, ci) => {
    let cy = fy;
    col.forEach((d) => {
      const isCta = d === wd.cta;
      const t = text(c, d, x + ci * (colW + u * 0.05), cy, cols.length > 1 ? colW : w, { font: L.body[0], weight: isCta ? 800 : subInFoot ? L.body[1] : 700, size: isCta ? u * 0.031 * tallK(c) : dsz, fill: isCta ? P.small ?? P.accent : P.ink, upper: isCta, spacing: isCta ? u * 0.006 : 0, align: 'left', lines: 3, lh: 1.25, name: isCta ? 'Call to action' : 'Details' });
      cy = below(t, u * 0.014); fEnd = Math.max(fEnd, below(t, 0));
    });
  });
  if (items.length) { box(c, x, 0, w, Math.max(2, u * 0.003), P.accent, { name: 'Rule' }); }
  const footTop = H - H * 0.07 - fEnd;
  shift(c, foot, footTop);
  // the headline block: the biggest title that fits between the top bits and the foot, centred there
  const topB = Math.max(y, art0.y + art0.h) + u * 0.05, botB = (items.length ? footTop : H - H * 0.07) - u * 0.04;
  const from = c.els.length, k = tallK(c);
  let size = Math.min(0.2, (tall ? 0.19 : square ? 0.15 : 0.17) * 1.15), blockH = 0;
  for (let tries = 0; tries < 8; tries++) {
    c.els.length = from;
    let last = { y: 0, h: 0 };
    if (wd.native) last = nativeLine(c, wd.native, x, 0, w * 0.9, u * Math.min(0.12, size * 0.62), P.accent, P, 1, 'left');
    last = text(c, wd.title, x, last.h ? below(last, u * 0.014) : 0, w, { font: L.title[0], weight: L.title[1], size: u * size, lines: 4, fill: P.title, lh: 0.98, align: 'left', name: 'Title', shadow: P.glow ? glow(P.glow, u * 0.02) : undefined });
    if (wd.sub && !subInFoot) last = text(c, wd.sub, x, below(last, u * 0.03), w * 0.86, { font: L.body[0], weight: L.body[1], size: u * 0.038 * k, fill: P.muted, lines: 3, lh: 1.3, align: 'left', name: 'Subtitle' });
    blockH = below(last, 0);
    if (blockH <= botB - topB || size < 0.08) break;
    size *= 0.88;
  }
  shift(c, from, topB + Math.max(0, (botB - topB - blockH) * 0.5));
}

const LAYOUTS: Record<LayoutId, (c: Kit, f: Format, L: Look, wd: Words) => void> = { hero, split, arch, framed, poster, minimal, medallion, photo, editorial, panel, band, type };

/** A collection template built from a layout, a look and words. */
export function themed(s: ThemedSpec): CollectionTemplate {
  return {
    id: s.id, name: s.name, format: s.format, use: s.use, style: s.style, colors: s.colors, occasion: s.occasion,
    tags: [...s.tags, s.layout === 'arch' ? 'arch' : s.layout, ...(s.words.native ? [s.words.native.text, SCRIPT_NAME[s.words.native.script].toLowerCase()] : [])],
    build: (c) => { const bg = s.look.sceneColors?.[0] ?? sceneColor(s.look.scene) ?? '#ffffff'; c.bg = bg; LAYOUTS[s.layout](c, s.format, withBg(s.look, bg), s.words); },
  };
}
