/**
 * Canvas renderer shared by the editor, thumbnails and exports, so what you see is exactly what you download.
 * All drawing happens in design pixels; callers set up the transform.
 */
import type { Design, DrawEl, El, EmojiEl, Fill, Filters, GraphicEl, ImageEl, Page, QrEl, ShapeEl, TextEl } from './types';
import { qrMatrix } from './qr';
import { maskPath, roundRect, shapePath } from './shapes';
import { artById, artDataUrl } from '../content/art';
import { ensureArt } from '../content/assets';
import { ensureFont } from '../content/fonts';

// ---------- image cache ----------
const images = new Map<string, HTMLImageElement>();
const assetListeners = new Set<() => void>();
let assetNotify = false;

function notifyAssets(): void {
  if (assetNotify) return;
  assetNotify = true;
  requestAnimationFrame(() => { assetNotify = false; for (const f of assetListeners) f(); });
}

export function onAssetsLoaded(fn: () => void): () => void {
  assetListeners.add(fn);
  return () => assetListeners.delete(fn);
}

export function getImage(src: string): HTMLImageElement | null {
  if (!src) return null;
  let img = images.get(src);
  if (!img) {
    img = new Image();
    img.decoding = 'async';
    img.onload = notifyAssets;
    img.src = src;
    images.set(src, img);
    if (images.size > 300) { const first = images.keys().next().value; if (first && first !== src) images.delete(first); }
  }
  return img.complete && img.naturalWidth > 0 ? img : null;
}

function imageReady(src: string): Promise<void> {
  getImage(src);
  const img = images.get(src)!;
  if (img.complete) return Promise.resolve();
  return new Promise((res) => { img.addEventListener('load', () => res(), { once: true }); img.addEventListener('error', () => res(), { once: true }); });
}

export function graphicSrc(el: GraphicEl): string { return artDataUrl(el.art, el.colors); }

/** Wait until every font and image a page needs is ready (used before exporting). */
export async function prepare(design: Design, pages = design.pages): Promise<void> {
  // graphics from asset collections: load their collection first so their pictures exist
  await ensureArt(pages.flatMap((p) => p.elements.filter((e): e is GraphicEl => e.type === 'graphic' && !artById(e.art)).map((e) => e.art)));
  const jobs: Promise<unknown>[] = [];
  for (const p of pages) {
    if (p.bgAsset && design.assets[p.bgAsset]) jobs.push(imageReady(design.assets[p.bgAsset]));
    for (const el of p.elements) {
      if (el.type === 'image' && design.assets[el.asset]) jobs.push(imageReady(design.assets[el.asset]));
      if (el.type === 'graphic') jobs.push(imageReady(graphicSrc(el)));
      if (el.type === 'text' && document.fonts) jobs.push(document.fonts.load(fontString(el, 32)).catch(() => {}));
    }
  }
  await Promise.all(jobs);
}

// ---------- fills ----------
export function fillStyle(ctx: CanvasRenderingContext2D, fill: Fill, w: number, h: number, x = 0, y = 0): string | CanvasGradient {
  if (typeof fill === 'string') return fill;
  const stops = fill.stops.length ? fill.stops : [{ at: 0, color: '#000' }];
  let g: CanvasGradient;
  if (fill.kind === 'radial') {
    g = ctx.createRadialGradient(x + w / 2, y + h / 2, 0, x + w / 2, y + h / 2, Math.hypot(w, h) / 2);
  } else {
    const a = ((fill.angle - 90) * Math.PI) / 180;
    const cx = x + w / 2, cy = y + h / 2;
    const len = (Math.abs(w * Math.cos(a)) + Math.abs(h * Math.sin(a))) / 2;
    g = ctx.createLinearGradient(cx - Math.cos(a) * len, cy - Math.sin(a) * len, cx + Math.cos(a) * len, cy + Math.sin(a) * len);
  }
  for (const s of stops) g.addColorStop(Math.min(1, Math.max(0, s.at)), s.color);
  return g;
}

export function fillToCss(fill: Fill): string {
  if (typeof fill === 'string') return fill;
  const st = fill.stops.map((s) => `${s.color} ${Math.round(s.at * 100)}%`).join(', ');
  return fill.kind === 'radial' ? `radial-gradient(circle, ${st})` : `linear-gradient(${fill.angle}deg, ${st})`;
}

// ---------- text ----------
export function fontString(el: TextEl, size = el.size): string {
  return `${el.italic ? 'italic ' : ''}${el.weight} ${size}px "${el.font}", "Inter", system-ui, sans-serif`;
}

const measureCtx = document.createElement('canvas').getContext('2d')!;
const hasLetterSpacing = 'letterSpacing' in measureCtx;

function setSpacing(ctx: CanvasRenderingContext2D, px: number): void {
  if (hasLetterSpacing) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${px}px`;
}

export interface TextLayout { lines: string[]; lineH: number; height: number }

export function layoutText(el: TextEl): TextLayout {
  const ctx = measureCtx;
  ensureFont(el.font, el.weight, el.italic);
  ctx.font = fontString(el);
  setSpacing(ctx, el.letterSpacing);
  const maxW = Math.max(el.size * 0.6, el.w);
  const src = el.uppercase ? el.text.toUpperCase() : el.text;
  const lines: string[] = [];
  for (const para of src.split('\n')) {
    const words = para.split(/(\s+)/);
    let line = '';
    for (const word of words) {
      const test = line + word;
      if (ctx.measureText(test).width <= maxW || !line.trim()) {
        if (ctx.measureText(test).width > maxW && !line.trim() && word.trim()) {
          // a single word wider than the box: break it by characters
          let chunk = '';
          for (const ch of word) {
            if (ctx.measureText(chunk + ch).width > maxW && chunk) { lines.push(chunk); chunk = ''; }
            chunk += ch;
          }
          line = chunk;
        } else line = test;
      } else {
        lines.push(line.trimEnd());
        line = word.trimStart();
      }
    }
    lines.push(line.trimEnd());
  }
  const lineH = el.size * el.lineHeight;
  return { lines, lineH, height: Math.max(lineH, lines.length * lineH) };
}

/** Text boxes grow and shrink with their content; call after any text change. */
export function fitText(el: TextEl): void {
  el.h = Math.round(layoutText(el).height);
}

function drawText(ctx: CanvasRenderingContext2D, el: TextEl): void {
  const { lines, lineH } = layoutText(el);
  const w = el.w, h = el.h;
  if (el.bg) {
    const pad = el.size * 0.22;
    ctx.save();
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = el.bg;
    ctx.fill(roundRect(new Path2D(), -pad, -pad * 0.6, w + pad * 2, h + pad * 1.2, el.size * 0.25));
    ctx.restore();
  }
  ctx.font = fontString(el);
  setSpacing(ctx, el.letterSpacing);
  ctx.textBaseline = 'middle';
  ctx.textAlign = el.align;
  const ax = el.align === 'left' ? 0 : el.align === 'center' ? w / 2 : w;
  // letterSpacing adds trailing space after the last glyph; nudge so centred/right text stays optical.
  const nudge = hasLetterSpacing ? (el.align === 'center' ? el.letterSpacing / 2 : el.align === 'right' ? el.letterSpacing : 0) : 0;
  ctx.fillStyle = fillStyle(ctx, el.fill, w, h);
  const ys = lines.map((_, i) => i * lineH + lineH / 2);
  if (el.strokeWidth > 0 && el.strokeColor) {
    // Outline first (it carries the shadow), then the fill on top without a second shadow.
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineWidth = el.strokeWidth * 2;
    ctx.strokeStyle = el.strokeColor;
    lines.forEach((line, i) => ctx.strokeText(line, ax + nudge, ys[i]));
    ctx.restore();
    ctx.shadowColor = 'transparent';
  }
  lines.forEach((line, i) => {
    ctx.fillText(line, ax + nudge, ys[i]);
    if (el.underline && line) {
      const lw = ctx.measureText(line).width;
      const x0 = el.align === 'left' ? 0 : el.align === 'center' ? w / 2 - lw / 2 : w - lw;
      ctx.fillRect(x0, ys[i] + el.size * 0.42, lw, Math.max(1, el.size * 0.06));
    }
  });
}

// ---------- images ----------
const probe = document.createElement('canvas').getContext('2d')!;
const canvasFilters = typeof (probe as { filter?: unknown }).filter === 'string';

export function filterCss(f: Filters): string {
  const parts: string[] = [];
  if (f.brightness !== 100) parts.push(`brightness(${f.brightness}%)`);
  if (f.contrast !== 100) parts.push(`contrast(${f.contrast}%)`);
  if (f.saturate !== 100) parts.push(`saturate(${f.saturate}%)`);
  if (f.grayscale) parts.push(`grayscale(${f.grayscale}%)`);
  if (f.sepia) parts.push(`sepia(${f.sepia}%)`);
  if (f.hue) parts.push(`hue-rotate(${f.hue}deg)`);
  if (f.blur) parts.push(`blur(${f.blur}px)`);
  return parts.join(' ') || 'none';
}

/** Safari has no ctx.filter, so colour filters are baked into a cached canvas there. */
const filtered = new Map<string, HTMLCanvasElement>();
function bakeFilters(img: HTMLImageElement, src: string, f: Filters): CanvasImageSource {
  const key = src.length + ':' + src.slice(-40) + JSON.stringify(f);
  const hit = filtered.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  const s = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
  c.width = Math.max(1, Math.round(img.naturalWidth * s)); c.height = Math.max(1, Math.round(img.naturalHeight * s));
  const x = c.getContext('2d')!;
  x.drawImage(img, 0, 0, c.width, c.height);
  const d = x.getImageData(0, 0, c.width, c.height), p = d.data;
  const br = f.brightness / 100, ct = f.contrast / 100, sat = f.saturate / 100, gr = f.grayscale / 100, sp = f.sepia / 100;
  const hr = (f.hue * Math.PI) / 180, cosH = Math.cos(hr), sinH = Math.sin(hr);
  for (let i = 0; i < p.length; i += 4) {
    let r = p[i] * br, g = p[i + 1] * br, b = p[i + 2] * br;
    r = (r - 128) * ct + 128; g = (g - 128) * ct + 128; b = (b - 128) * ct + 128;
    const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    r = l + (r - l) * sat; g = l + (g - l) * sat; b = l + (b - l) * sat;
    if (gr) { const l2 = 0.2126 * r + 0.7152 * g + 0.0722 * b; r += (l2 - r) * gr; g += (l2 - g) * gr; b += (l2 - b) * gr; }
    if (sp) {
      const sr = r * 0.393 + g * 0.769 + b * 0.189, sg = r * 0.349 + g * 0.686 + b * 0.168, sb = r * 0.272 + g * 0.534 + b * 0.131;
      r += (sr - r) * sp; g += (sg - g) * sp; b += (sb - b) * sp;
    }
    if (f.hue) {
      const nr = r * (0.213 + cosH * 0.787 - sinH * 0.213) + g * (0.715 - cosH * 0.715 - sinH * 0.715) + b * (0.072 - cosH * 0.072 + sinH * 0.928);
      const ng = r * (0.213 - cosH * 0.213 + sinH * 0.143) + g * (0.715 + cosH * 0.285 + sinH * 0.14) + b * (0.072 - cosH * 0.072 - sinH * 0.283);
      const nb = r * (0.213 - cosH * 0.213 - sinH * 0.787) + g * (0.715 - cosH * 0.715 + sinH * 0.715) + b * (0.072 + cosH * 0.928 + sinH * 0.072);
      r = nr; g = ng; b = nb;
    }
    p[i] = r; p[i + 1] = g; p[i + 2] = b;
  }
  x.putImageData(d, 0, 0);
  if (filtered.size > 24) filtered.delete(filtered.keys().next().value!);
  filtered.set(key, c);
  return c;
}

const isPlain = (f: Filters) => f.brightness === 100 && f.contrast === 100 && f.saturate === 100 && !f.grayscale && !f.sepia && !f.hue && !f.blur;

/** Draw an image so it covers the box (like CSS object-fit: cover), with pan and zoom. */
export function drawCover(ctx: CanvasRenderingContext2D, img: CanvasImageSource & { width: number; height: number }, iw: number, ih: number, w: number, h: number, panX = 0, panY = 0, zoom = 1): void {
  const s = Math.max(w / iw, h / ih) * zoom;
  const dw = iw * s, dh = ih * s;
  const ox = (w - dw) / 2 + ((dw - w) / 2) * -panX;
  const oy = (h - dh) / 2 + ((dh - h) / 2) * -panY;
  ctx.drawImage(img, ox, oy, dw, dh);
}

function drawImageEl(ctx: CanvasRenderingContext2D, el: ImageEl, design: Design): void {
  const src = design.assets[el.asset];
  const img = src ? getImage(src) : null;
  const clip = maskPath(el.mask, el.w, el.h, el.radius);
  ctx.save();
  if (!img) {
    ctx.fillStyle = 'rgba(140,130,170,0.25)';
    ctx.fill(clip);
    ctx.restore();
    return;
  }
  // Fill the mask once with the shadow so it follows the cut-out shape, then clip without it.
  // The fill is drawn far off-canvas and only its shadow is offset back, so transparent photos stay transparent.
  if (el.shadow) {
    const far = 100000;
    ctx.save();
    ctx.translate(-far, 0);
    ctx.shadowOffsetX += far * ctx.getTransform().a;
    ctx.shadowOffsetY += far * ctx.getTransform().b;
    ctx.fillStyle = '#000';
    ctx.fill(clip);
    ctx.restore();
    ctx.shadowColor = 'transparent';
  }
  ctx.clip(clip);
  const f = el.filters;
  let source: CanvasImageSource & { width: number; height: number } = img;
  let iw = img.naturalWidth, ih = img.naturalHeight;
  if (!isPlain(f)) {
    if (canvasFilters) ctx.filter = filterCss(f);
    else { const baked = bakeFilters(img, src, f) as HTMLCanvasElement; source = baked; iw = baked.width; ih = baked.height; }
  }
  drawCover(ctx, source, iw, ih, el.w, el.h, el.panX, el.panY, el.zoom);
  ctx.restore();
  if (el.strokeWidth > 0) {
    ctx.save();
    ctx.shadowColor = 'transparent';
    ctx.lineWidth = el.strokeWidth;
    ctx.strokeStyle = el.stroke;
    ctx.stroke(clip);
    ctx.restore();
  }
}

// ---------- other elements ----------
function drawShape(ctx: CanvasRenderingContext2D, el: ShapeEl): void {
  if (el.shape === 'line') {
    ctx.strokeStyle = fillStyle(ctx, el.fill, el.w, el.h);
    ctx.lineWidth = Math.max(1, el.strokeWidth || el.h);
    ctx.lineCap = 'round';
    if (el.dash) ctx.setLineDash([ctx.lineWidth * 2.5, ctx.lineWidth * 2]);
    ctx.stroke(shapePath('line', el.w, el.h));
    return;
  }
  if (el.shape === 'ring') {
    const lw = el.strokeWidth || Math.min(el.w, el.h) * 0.12;
    const p = new Path2D();
    p.ellipse(el.w / 2, el.h / 2, Math.max(1, el.w / 2 - lw / 2), Math.max(1, el.h / 2 - lw / 2), 0, 0, Math.PI * 2);
    ctx.lineWidth = lw;
    ctx.strokeStyle = fillStyle(ctx, el.fill, el.w, el.h);
    if (el.dash) ctx.setLineDash([lw * 1.5, lw]);
    ctx.stroke(p);
    return;
  }
  const path = shapePath(el.shape, el.w, el.h, el.radius);
  ctx.fillStyle = fillStyle(ctx, el.fill, el.w, el.h);
  ctx.fill(path);
  if (el.strokeWidth > 0) {
    ctx.shadowColor = 'transparent';
    ctx.lineWidth = el.strokeWidth;
    ctx.strokeStyle = el.stroke;
    ctx.lineJoin = 'round';
    if (el.dash) ctx.setLineDash([el.strokeWidth * 3, el.strokeWidth * 2]);
    ctx.stroke(path);
  }
}

const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji","Twemoji Mozilla",sans-serif';
function drawEmoji(ctx: CanvasRenderingContext2D, el: EmojiEl): void {
  const s = el.h * 0.86;
  ctx.font = `${s}px ${EMOJI_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.save();
  ctx.translate(el.w / 2, el.h / 2);
  ctx.scale(el.w / el.h, 1);
  ctx.fillText(el.char, 0, s * 0.06);
  ctx.restore();
}

function drawGraphic(ctx: CanvasRenderingContext2D, el: GraphicEl): void {
  if (!artById(el.art)) { void ensureArt([el.art]).then((fresh) => { if (fresh) notifyAssets(); }); return; }
  const img = getImage(graphicSrc(el));
  if (img) ctx.drawImage(img, 0, 0, el.w, el.h);
}

export function drawStroke(ctx: CanvasRenderingContext2D, pts: number[], w: number, h: number): void {
  if (pts.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(pts[0] * w, pts[1] * h);
  if (pts.length === 2) ctx.lineTo(pts[0] * w + 0.01, pts[1] * h);
  for (let i = 2; i < pts.length - 2; i += 2) {
    const mx = ((pts[i] + pts[i + 2]) / 2) * w, my = ((pts[i + 1] + pts[i + 3]) / 2) * h;
    ctx.quadraticCurveTo(pts[i] * w, pts[i + 1] * h, mx, my);
  }
  if (pts.length > 2) ctx.lineTo(pts[pts.length - 2] * w, pts[pts.length - 1] * h);
  ctx.stroke();
}

function drawDraw(ctx: CanvasRenderingContext2D, el: DrawEl): void {
  ctx.strokeStyle = el.color;
  ctx.lineWidth = el.width;
  ctx.lineCap = el.highlighter ? 'square' : 'round';
  ctx.lineJoin = 'round';
  if (el.highlighter) ctx.globalAlpha *= 0.45;
  drawStroke(ctx, el.points, el.w, el.h);
}

const qrCache = new Map<string, boolean[][] | null>();
function drawQr(ctx: CanvasRenderingContext2D, el: QrEl): void {
  let m = qrCache.get(el.text);
  if (m === undefined) {
    try { m = qrMatrix(el.text || ' '); } catch { m = null; }
    if (qrCache.size > 50) qrCache.delete(qrCache.keys().next().value!);
    qrCache.set(el.text, m);
  }
  const quiet = el.bg ? 2 : 0; // a white margin helps phones find the code
  if (el.bg) { ctx.fillStyle = el.bg; ctx.fill(roundRect(new Path2D(), 0, 0, el.w, el.h, Math.min(el.w, el.h) * 0.04)); }
  ctx.shadowColor = 'transparent';
  if (!m) {
    ctx.fillStyle = 'rgba(214,51,108,0.15)';
    ctx.fillRect(0, 0, el.w, el.h);
    return;
  }
  const n = m.length + quiet * 2;
  const cw = el.w / n, ch = el.h / n;
  ctx.fillStyle = el.color;
  for (let y = 0; y < m.length; y++) for (let x = 0; x < m.length; x++) {
    // slightly oversized squares so no hairline gaps appear between neighbours
    if (m[y][x]) ctx.fillRect((x + quiet) * cw, (y + quiet) * ch, cw + 0.5, ch + 0.5);
  }
}

export function drawElement(ctx: CanvasRenderingContext2D, el: El, design: Design): void {
  if (el.hidden) return;
  ctx.save();
  ctx.translate(el.x + el.w / 2, el.y + el.h / 2);
  if (el.rotation) ctx.rotate((el.rotation * Math.PI) / 180);
  if (el.flipX || el.flipY) ctx.scale(el.flipX ? -1 : 1, el.flipY ? -1 : 1);
  ctx.translate(-el.w / 2, -el.h / 2);
  ctx.globalAlpha *= el.opacity;
  if (el.shadow) {
    // Shadow sizes are in device pixels, so scale them with the current zoom/export scale.
    const t = ctx.getTransform(), k = Math.hypot(t.a, t.b);
    ctx.shadowColor = el.shadow.color;
    ctx.shadowBlur = el.shadow.blur * k;
    ctx.shadowOffsetX = el.shadow.x * k;
    ctx.shadowOffsetY = el.shadow.y * k;
  }
  switch (el.type) {
    case 'shape': drawShape(ctx, el); break;
    case 'text': drawText(ctx, el); break;
    case 'image': drawImageEl(ctx, el, design); break;
    case 'graphic': drawGraphic(ctx, el); break;
    case 'emoji': drawEmoji(ctx, el); break;
    case 'draw': drawDraw(ctx, el); break;
    case 'qr': drawQr(ctx, el); break;
  }
  ctx.restore();
}

export function drawBackground(ctx: CanvasRenderingContext2D, page: Page, design: Design, transparent = false): void {
  const { width: w, height: h } = design;
  if (!transparent) {
    ctx.fillStyle = fillStyle(ctx, page.background, w, h);
    ctx.fillRect(0, 0, w, h);
  }
  const src = page.bgAsset ? design.assets[page.bgAsset] : '';
  const img = src ? getImage(src) : null;
  if (img) drawCover(ctx, img, img.naturalWidth, img.naturalHeight, w, h);
}

export function renderPage(ctx: CanvasRenderingContext2D, design: Design, page: Page, opts: { transparent?: boolean; skip?: string } = {}): void {
  drawBackground(ctx, page, design, opts.transparent);
  for (const el of page.elements) if (el.id !== opts.skip) drawElement(ctx, el, design);
}

/** Render a page into a fresh canvas at the given scale. */
export function pageCanvas(design: Design, page: Page, scale: number, transparent = false): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(design.width * scale));
  c.height = Math.max(1, Math.round(design.height * scale));
  const ctx = c.getContext('2d')!;
  ctx.scale(scale, scale);
  renderPage(ctx, design, page, { transparent });
  return c;
}

export function thumbnail(design: Design, maxSide = 360): string {
  const s = maxSide / Math.max(design.width, design.height);
  return pageCanvas(design, design.pages[0], s).toDataURL('image/jpeg', 0.82);
}
