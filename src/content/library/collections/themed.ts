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
import type { Format } from '../layouts';
import { art, below, box, glow, pill, ratio, scene, text, type CollectionTemplate, type Kit, type Use } from './kit';
import type { TextEl } from '../../../editor/types';

export type FontRef = [string, number];
export interface Pal {
  title: string;     // main headline colour
  ink: string;       // body text
  muted: string;     // secondary text
  accent: string;    // pills, rules, the native greeting by default
  onAccent: string;  // text on the accent colour
  panel?: string;    // card / arch panel fill
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
}
export interface Words { eyebrow?: string; title: string; native?: Native; sub?: string; details?: string[]; cta?: string }
export type LayoutId = 'hero' | 'arch' | 'framed' | 'poster' | 'split';
export interface ThemedSpec {
  id: string; name: string; format: Format; use: Use; style: string; colors: string[]; occasion: string; tags: string[];
  layout: LayoutId; look: Look; words: Words;
}

/** Fonts every themed template uses (so previews wait for them and text is measured exactly). */
export function fontsOf(specs: ThemedSpec[]): [string, number][] {
  const out = new Map<string, [string, number]>();
  const add = (f?: FontRef) => { if (f) out.set(f.join(':'), f); };
  for (const s of specs) { add(s.look.title); add(s.look.body); add(s.look.script); add(s.words.native?.font); add(['Montserrat', 800]); add([s.look.body[0], 700]); }
  return [...out.values()];
}

const RTL: Script[] = ['ar', 'he', 'fa'];
const SCRIPT_NAME: Record<Script, string> = { ar: 'Arabic', he: 'Hebrew', fa: 'Persian', hi: 'Hindi', ml: 'Malayalam', pa: 'Punjabi', zh: 'Chinese', latin: 'Greeting' };

// ---------- pieces ----------
/** The greeting in its own script: no letter spacing (keeps Arabic joined), a little more line height for tall marks. */
function nativeLine(c: Kit, n: Native, x: number, y: number, w: number, size: number, fill: string, pal: Pal, lines = 1): TextEl {
  return text(c, n.text, x, y, w, {
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
  const nat = () => { if (wd.native) last = nativeLine(c, wd.native, x, below(last, last.h ? u * 0.012 : 0), w, u * s.native, P.accent, P); };
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
function settle(c: Kit, bottom: number, heroMax: number, body: (heroMax: number) => number): void {
  const from = c.els.length;
  let end = body(heroMax), slack = bottom - end;
  if (slack > c.u * 0.06 || slack < 0) { c.els.length = from; end = body(Math.max(c.u * 0.08, heroMax + slack * (slack > 0 ? 0.6 : 1.1))); slack = bottom - end; }
  if (slack > 0) for (const el of c.els.slice(from)) el.y += slack / 2;
}
const pillH = (size: number) => size * 2.3;

/** Invitation inside an arch window: decoration on top, illustration in the crown, text and details below. */
function arch(c: Kit, f: Format, L: Look, wd: Words): void {
  const { W, H, u } = c, P = L.pal;
  if (W / H > 1.3) return split(c, f, L, wd);
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
  const bottom = H - (L.corner ? u * 0.24 : u * 0.08);
  settle(c, bottom, H * 0.22, (heroMax) => {
    const hr = fitArt(c, L.hero, W / 2, top, W * 0.62, heroMax, L.heroColors, 'Illustration');
    let end = textStack(c, L, wd, W * 0.12, below(hr, u * 0.03), W * 0.76, { native: 0.11, title: wd.native ? 0.09 : 0.14, titleLines: 2, sub: 0.034 });
    for (const d of detailLine(wd)) { const t = text(c, d, W * 0.12, end + u * 0.022, W * 0.76, { font: L.body[0], weight: 700, size: u * 0.035, fill: P.ink, lines: 2 }); end = below(t, 0); }
    if (wd.cta) { pill(c, wd.cta, W / 2, end + u * 0.05, u * 0.027, P.accent, P.onAccent, L.body[0], 800); end += u * 0.05 + pillH(u * 0.027); }
    return end;
  });
  if (L.corner) { const s = u * 0.2, y = H * 0.955 - u * 0.03 - s / ratio(L.corner); art(c, L.corner, W * 0.075, y, s, { colors: L.cornerColors, name: 'Corner' }); art(c, L.corner, W * 0.925 - s, y, s, { colors: L.cornerColors, flip: true, name: 'Corner' }); }
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
    det.forEach((d, i) => text(c, d, W * 0.11, cardY + u * (0.04 + i * 0.058), W * 0.78, { font: L.body[0], weight: i ? 600 : 800, size: u * (i ? 0.034 : 0.04), fill: i ? P.muted : P.ink }));
  }
  if (wd.cta) pill(c, wd.cta, W / 2, H - u * 0.05 - ctaH * 0.85, u * 0.03, P.accent, P.onAccent, L.body[0], 800);
  if (L.corner) art(c, L.corner, W * 0.03, cardY - u * 0.2, u * 0.22, { colors: L.cornerColors });
}

const LAYOUTS: Record<LayoutId, (c: Kit, f: Format, L: Look, wd: Words) => void> = { hero, split, arch, framed, poster };

/** A collection template built from a layout, a look and words. */
export function themed(s: ThemedSpec): CollectionTemplate {
  return {
    id: s.id, name: s.name, format: s.format, use: s.use, style: s.style, colors: s.colors, occasion: s.occasion,
    tags: [...s.tags, s.layout === 'arch' ? 'arch' : s.layout, ...(s.words.native ? [s.words.native.text, SCRIPT_NAME[s.words.native.script].toLowerCase()] : [])],
    build: (c) => LAYOUTS[s.layout](c, s.format, s.look, s.words),
  };
}
