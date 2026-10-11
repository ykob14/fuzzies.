/**
 * Shared drawing helpers for asset collections (original Fuzzies artwork, drawn in code as SVG).
 * Colours are #rrggbb; shading is derived from the colour slots so every piece stays recolourable.
 */
import type { AssetDef, AssetKind } from './index';

export const LICENSE = 'Original Fuzzies artwork';
export const AUTHOR = 'Fuzzies';

// ---------- colour ----------
const hex = (c: string) => { const n = parseInt(c.slice(1, 7), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const toHex = (r: number, g: number, b: number) => '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
export const mix = (a: string, b: string, t: number) => { const [r1, g1, b1] = hex(a), [r2, g2, b2] = hex(b); return toHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t); };
export const dk = (c: string, t: number) => mix(c, '#000000', t);
export const lt = (c: string, t: number) => mix(c, '#ffffff', t);
export const f1 = (n: number) => n.toFixed(1);

export function rng(seed: number): () => number {
  return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
}

/** An SVG document; width/height keep canvas drawing crisp, "none" lets it stretch with its box. */
export const svg = (w: number, h: number, body: string, scale = 600) => {
  const k = scale / Math.max(w, h);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${Math.round(w * k)}" height="${Math.round(h * k)}" preserveAspectRatio="none">${body}</svg>`;
};

/** Factory for one asset of a collection. */
export function asset(collection: string, baseTags: string[]) {
  return (id: string, name: string, kind: AssetKind, w: number, h: number, colors: string[], tags: string[], body: (c: string[]) => string, scale = 600): AssetDef =>
    ({ id, name, pack: collection, kind, ratio: w / h, colors, tags: [...baseTags, ...tags], license: LICENSE, author: AUTHOR, svg: (c) => svg(w, h, body(c), scale) });
}

/** Page backgrounds in four shapes (square, portrait, story, landscape) so nothing ever stretches. */
export const SHAPES: Record<string, [number, number, string]> = { sq: [1080, 1080, 'square'], po: [1000, 1414, 'portrait'], st: [1080, 1920, 'story'], ls: [1920, 1080, 'landscape'] };
export interface BgDef { id: string; name: string; colors: string[]; tags: string[]; draw: (c: string[], W: number, H: number) => string }
export function backgrounds(collection: string, baseTags: string[], list: BgDef[]): AssetDef[] {
  return list.flatMap((b) => Object.entries(SHAPES).map(([k, [W, H, label]]) => ({
    id: `${b.id}-${k}`, name: `${b.name} (${label})`, pack: collection, kind: 'background' as const, ratio: W / H, colors: b.colors,
    tags: [...baseTags, 'background', 'scene', label, ...b.tags], license: LICENSE, author: AUTHOR,
    svg: (c: string[]) => svg(W, H, b.draw(c, W, H), Math.max(W, H)),
  })));
}

// ---------- reusable pieces ----------
export function sparkle(x: number, y: number, s: number, fill: string, opacity = 1): string {
  return `<path d="M${f1(x)} ${f1(y - s)} Q${f1(x + s * 0.14)} ${f1(y - s * 0.14)} ${f1(x + s)} ${f1(y)} Q${f1(x + s * 0.14)} ${f1(y + s * 0.14)} ${f1(x)} ${f1(y + s)} Q${f1(x - s * 0.14)} ${f1(y + s * 0.14)} ${f1(x - s)} ${f1(y)} Q${f1(x - s * 0.14)} ${f1(y - s * 0.14)} ${f1(x)} ${f1(y - s)}Z" fill="${fill}" opacity="${opacity}"/>`;
}
/** Stars, dots and the odd sparkle across an area. */
export function stars(w: number, h: number, color: string, n: number, seed: number, maxR = 3, y0 = 0): string {
  const r = rng(seed);
  let g = '';
  for (let i = 0; i < n; i++) {
    const x = r() * w, y = y0 + r() * h, s = 0.6 + r() * maxR;
    g += i % 7 === 0 ? sparkle(x, y, s * 3, color) : `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(s * 0.6)}" fill="${color}" opacity="${(0.35 + r() * 0.6).toFixed(2)}"/>`;
  }
  return g;
}
/** Falling snow: soft dots of different sizes. */
export function snowfall(w: number, h: number, color: string, n: number, seed: number, maxR = 4): string {
  const r = rng(seed);
  let g = '';
  for (let i = 0; i < n; i++) g += `<circle cx="${f1(r() * w)}" cy="${f1(r() * h)}" r="${f1(0.8 + r() * maxR)}" fill="${color}" opacity="${(0.45 + r() * 0.5).toFixed(2)}"/>`;
  return g;
}
/** Out-of-focus lights. */
export function bokeh(w: number, h: number, colors: string[], n: number, seed: number, maxR: number, id: string): string {
  const r = rng(seed);
  let g = '<defs>' + colors.map((c, i) => `<radialGradient id="${id}${i}"><stop offset="0" stop-color="${c}" stop-opacity=".75"/><stop offset=".7" stop-color="${c}" stop-opacity=".35"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`).join('') + '</defs>';
  for (let i = 0; i < n; i++) g += `<circle cx="${f1(r() * w)}" cy="${f1(r() * h)}" r="${f1(maxR * (0.25 + r() * 0.75))}" fill="url(#${id}${i % colors.length})" opacity="${(0.4 + r() * 0.6).toFixed(2)}"/>`;
  return g;
}
export function mist(w: number, y: number, h: number, color: string, id: string, seed: number, opacity = 0.55): string {
  const r = rng(seed);
  let g = `<defs><radialGradient id="${id}"><stop offset="0" stop-color="${color}" stop-opacity="${opacity}"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient></defs>`;
  for (let i = 0; i < 9; i++) g += `<ellipse cx="${f1((i / 8) * w + (r() - 0.5) * w * 0.08)}" cy="${f1(y + (r() - 0.5) * h * 0.4)}" rx="${f1(w * (0.16 + r() * 0.12))}" ry="${f1(h * (0.4 + r() * 0.3))}" fill="url(#${id})"/>`;
  return g;
}
export function hills(w: number, base: number, amp: number, fill: string, seed: number): string {
  const r = rng(seed);
  let d = `M0 ${f1(base)}`;
  for (let i = 0; i < 5; i++) d += ` Q${f1(((i + 0.5) / 5) * w)} ${f1(base - amp * (0.4 + r() * 0.8))} ${f1(((i + 1) / 5) * w)} ${f1(base - amp * (r() * 0.3))}`;
  return `<path d="${d} V99999 H0 Z" fill="${fill}"/>`;
}
/** A soft glow disc (for flames, lights, windows). */
export const glowDef = (id: string, color: string, o = 0.55) => `<radialGradient id="${id}"><stop offset="0" stop-color="${color}" stop-opacity="${o}"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient>`;
/** A candle flame centred at x, with its tip at y and height h. */
export function flame(x: number, y: number, h: number, color: string): string {
  const w = h * 0.36;
  return `<path d="M${f1(x)} ${f1(y)} C${f1(x + w)} ${f1(y + h * 0.45)} ${f1(x + w * 0.8)} ${f1(y + h)} ${f1(x)} ${f1(y + h)} C${f1(x - w * 0.8)} ${f1(y + h)} ${f1(x - w)} ${f1(y + h * 0.45)} ${f1(x)} ${f1(y)} Z" fill="${color}"/>`
    + `<path d="M${f1(x)} ${f1(y + h * 0.38)} C${f1(x + w * 0.45)} ${f1(y + h * 0.62)} ${f1(x + w * 0.35)} ${f1(y + h * 0.92)} ${f1(x)} ${f1(y + h * 0.92)} C${f1(x - w * 0.35)} ${f1(y + h * 0.92)} ${f1(x - w * 0.45)} ${f1(y + h * 0.62)} ${f1(x)} ${f1(y + h * 0.38)} Z" fill="#fff8de"/>`;
}
/** A wrapped present at (x, y) with size w×h. */
export function gift(id: string, x: number, y: number, w: number, h: number, box: string, ribbon: string, pattern?: string): string {
  const lid = h * 0.2;
  let g = `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${lt(box, 0.12)}"/><stop offset=".65" stop-color="${box}"/><stop offset="1" stop-color="${dk(box, 0.22)}"/></linearGradient></defs>`;
  g += `<rect x="${f1(x + w * 0.04)}" y="${f1(y + lid)}" width="${f1(w * 0.92)}" height="${f1(h - lid)}" fill="url(#${id})"/>`;
  if (pattern) for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) g += `<circle cx="${f1(x + w * (0.14 + i * 0.15))}" cy="${f1(y + lid + (h - lid) * (0.16 + j * 0.24))}" r="${f1(w * 0.025)}" fill="${pattern}" opacity=".7"/>`;
  g += `<rect x="${f1(x)}" y="${f1(y + lid * 0.25)}" width="${f1(w)}" height="${f1(lid)}" rx="${f1(w * 0.02)}" fill="${lt(box, 0.08)}"/><rect x="${f1(x)}" y="${f1(y + lid * 1.05)}" width="${f1(w)}" height="${f1(lid * 0.18)}" fill="${dk(box, 0.25)}" opacity=".6"/>`;
  g += `<rect x="${f1(x + w * 0.44)}" y="${f1(y + lid * 0.25)}" width="${f1(w * 0.12)}" height="${f1(h - lid * 0.25)}" fill="${ribbon}"/><rect x="${f1(x + w * 0.52)}" y="${f1(y + lid * 0.25)}" width="${f1(w * 0.04)}" height="${f1(h - lid * 0.25)}" fill="${dk(ribbon, 0.2)}"/>`;
  const cx = x + w / 2, cy = y + lid * 0.25;
  g += `<path d="M${f1(cx)} ${f1(cy)} C${f1(cx - w * 0.36)} ${f1(cy - h * 0.34)} ${f1(cx - w * 0.42)} ${f1(cy + h * 0.02)} ${f1(cx)} ${f1(cy)} Z M${f1(cx)} ${f1(cy)} C${f1(cx + w * 0.36)} ${f1(cy - h * 0.34)} ${f1(cx + w * 0.42)} ${f1(cy + h * 0.02)} ${f1(cx)} ${f1(cy)} Z" fill="${ribbon}" stroke="${dk(ribbon, 0.25)}" stroke-width="${f1(w * 0.015)}"/>`;
  g += `<path d="M${f1(cx)} ${f1(cy)} L${f1(cx - w * 0.14)} ${f1(cy + h * 0.2)} M${f1(cx)} ${f1(cy)} L${f1(cx + w * 0.16)} ${f1(cy + h * 0.18)}" stroke="${ribbon}" stroke-width="${f1(w * 0.06)}" stroke-linecap="round"/><circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(w * 0.05)}" fill="${dk(ribbon, 0.1)}"/>`;
  return g;
}
/** A string of glowing bulbs along a sagging wire from x0 to x1. */
export function lightString(id: string, x0: number, x1: number, y: number, sag: number, n: number, wire: string, bulbs: string[]): string {
  let g = `<defs>${bulbs.map((b, i) => glowDef(`${id}${i}`, b, 0.6)).join('')}</defs>`;
  g += `<path d="M${f1(x0)} ${f1(y)} Q${f1((x0 + x1) / 2)} ${f1(y + sag * 2)} ${f1(x1)} ${f1(y)}" fill="none" stroke="${wire}" stroke-width="2.5"/>`;
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n, u = 1 - t;
    const bx = u * u * x0 + 2 * u * t * ((x0 + x1) / 2) + t * t * x1, by = u * u * y + 2 * u * t * (y + sag * 2) + t * t * y;
    const c = bulbs[i % bulbs.length], rot = (t - 0.5) * 30;
    g += `<circle cx="${f1(bx)}" cy="${f1(by + 12)}" r="16" fill="url(#${id}${i % bulbs.length})"/>`;
    g += `<g transform="rotate(${f1(rot)} ${f1(bx)} ${f1(by)})"><rect x="${f1(bx - 3.5)}" y="${f1(by)}" width="7" height="6" rx="1" fill="${wire}"/><path d="M${f1(bx)} ${f1(by + 22)} C${f1(bx + 8)} ${f1(by + 18)} ${f1(bx + 7)} ${f1(by + 7)} ${f1(bx)} ${f1(by + 6)} C${f1(bx - 7)} ${f1(by + 7)} ${f1(bx - 8)} ${f1(by + 18)} ${f1(bx)} ${f1(by + 22)} Z" fill="${c}"/><ellipse cx="${f1(bx - 2.5)}" cy="${f1(by + 12)}" rx="1.6" ry="3.5" fill="#fff" opacity=".7"/></g>`;
  }
  return g;
}
/** A five-pointed star polygon. */
export function starPts(cx: number, cy: number, n: number, r1: number, r2: number, rot = -90): string {
  const p: string[] = [];
  for (let i = 0; i < n * 2; i++) { const r = i % 2 ? r2 : r1, a = ((rot + (i * 180) / n) * Math.PI) / 180; p.push(`${f1(cx + Math.cos(a) * r)},${f1(cy + Math.sin(a) * r)}`); }
  return p.join(' ');
}
/** A Star of David (two interlaced equilateral triangles) as one path, centred at (cx, cy) with outer radius r. */
export function davidStar(cx: number, cy: number, r: number): string {
  const tri = (rot: number) => [0, 1, 2].map((i) => { const a = ((rot + i * 120) * Math.PI) / 180; return `${f1(cx + Math.cos(a) * r)} ${f1(cy + Math.sin(a) * r)}`; });
  const a = tri(-90), b = tri(90);
  return `M${a[0]} L${a[1]} L${a[2]} Z M${b[0]} L${b[1]} L${b[2]} Z`;
}
/** A five-petal blossom. */
export function blossom(cx: number, cy: number, r: number, petal: string, centre: string, rot = 0): string {
  let g = '';
  for (let i = 0; i < 5; i++) g += `<ellipse cx="${f1(cx)}" cy="${f1(cy - r * 0.55)}" rx="${f1(r * 0.42)}" ry="${f1(r * 0.55)}" fill="${petal}" transform="rotate(${rot + i * 72} ${f1(cx)} ${f1(cy)})"/>`;
  g += `<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(r * 0.22)}" fill="${centre}"/>`;
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; g += `<circle cx="${f1(cx + Math.cos(a) * r * 0.3)}" cy="${f1(cy + Math.sin(a) * r * 0.3)}" r="${f1(r * 0.05)}" fill="${dk(centre, 0.3)}"/>`; }
  return g;
}
/** Elegant double-line frame with small corner ornaments (`corner` draws one at the top-left; it's mirrored to the others). */
export function frame(w: number, h: number, color: string, inset: number, corner: (c: string) => string): string {
  let g = `<rect x="${inset}" y="${inset}" width="${w - inset * 2}" height="${h - inset * 2}" fill="none" stroke="${color}" stroke-width="5"/>`;
  g += `<rect x="${inset + 12}" y="${inset + 12}" width="${w - inset * 2 - 24}" height="${h - inset * 2 - 24}" fill="none" stroke="${color}" stroke-width="1.6"/>`;
  const c = corner(color);
  return g + `<g transform="translate(${inset} ${inset})">${c}</g><g transform="translate(${w - inset} ${inset}) scale(-1 1)">${c}</g><g transform="translate(${inset} ${h - inset}) scale(1 -1)">${c}</g><g transform="translate(${w - inset} ${h - inset}) scale(-1 -1)">${c}</g>`;
}
