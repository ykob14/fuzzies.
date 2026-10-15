/**
 * Composition kit for hand-made template collections (Halloween, Christmas, Hanukkah, Passover…).
 * Templates are built only from editable layers: scene backgrounds and illustrations from the asset collections,
 * shapes and live text in free Google fonts. Text under a title is placed with `below()` because titles wrap.
 */
import type { Design, El, Fill, Shadow, ShapeEl, TextEl } from '../../../editor/types';
import { makeGraphic, makeShape, makeText, newPage } from '../../../editor/doc';
import { DOC_VERSION } from '../../../editor/model';
import { fitText } from '../../../editor/render';
import { ensureFont } from '../../fonts';
import { ASSETS as HW } from '../../assets/collections/halloween';
import { ASSETS as XM } from '../../assets/collections/christmas';
import { ASSETS as HK } from '../../assets/collections/hanukkah';
import { ASSETS as PS } from '../../assets/collections/passover';
import { ASSETS as IS } from '../../assets/collections/islamic';
import { ASSETS as JH } from '../../assets/collections/jewish';
import { ASSETS as CR } from '../../assets/collections/christian';
import { ASSETS as IN } from '../../assets/collections/indian';
import { ASSETS as BB } from '../../assets/collections/baby';
import { ASSETS as AS } from '../../assets/collections/asian';
import { ASSETS as WD } from '../../assets/collections/world';
import { ASSETS as MS } from '../../assets/collections/milestones';
import { ASSETS as EV } from '../../assets/collections/events';
import { FORMATS, fitSize, widthOf, type Format } from '../layouts';

/** What a template is for — the holiday sub-filters (Greetings, Invitations, Parties, Social media, Flyers, Posters). */
export type Use = 'greeting' | 'invitation' | 'party' | 'social' | 'flyer' | 'poster';
export const USES: [Use, string][] = [['greeting', 'Greetings'], ['invitation', 'Invitations'], ['party', 'Parties'], ['social', 'Social media'], ['flyer', 'Flyers'], ['poster', 'Posters']];

export interface CollectionTemplate {
  id: string; name: string; format: Format; style: string; colors: string[]; occasion: string; tags: string[];
  use?: Use;
  build(c: Kit): void;
}

// ---------- composition kit ----------
export interface Kit { W: number; H: number; u: number; els: El[]; bg: Fill; assets: Record<string, string> }
const ALL_ASSETS = [...HW, ...XM, ...HK, ...PS, ...IS, ...JH, ...CR, ...IN, ...BB, ...AS, ...WD, ...MS, ...EV];
const ratioOf = new Map(ALL_ASSETS.map((a) => [a.id, a.ratio]));
const colorsOf = new Map(ALL_ASSETS.map((a) => [a.id, a.colors]));
/** The main colour of a scene background (used as the page colour underneath it). */
export const sceneColor = (base: string): string | undefined => colorsOf.get(`${base}-sq`)?.[0];
/** Width ÷ height of an illustration (1 if unknown). */
export const ratio = (id: string) => ratioOf.get(id) ?? 1;
const SHAPE: Record<Format, string> = { post: 'sq', story: 'st', poster: 'po', flyer: 'po', card: 'po', landscape: 'ls', certificate: 'ls', slides: 'ls', document: 'po', bizcard: 'ls' };

/** An illustration at (x, y), `w` wide (height from its shape unless given). */
export function art(c: Kit, id: string, x: number, y: number, w: number, o: { h?: number; colors?: string[]; rot?: number; opacity?: number; flip?: boolean; name?: string } = {}): void {
  const el = makeGraphic(id, w);
  Object.assign(el, { x, y, w, h: o.h ?? w / (ratioOf.get(id) ?? 1), colors: [...(o.colors ?? colorsOf.get(id) ?? [])], rotation: o.rot ?? 0, opacity: o.opacity ?? 1, flipX: !!o.flip });
  if (o.name) el.name = o.name;
  c.els.push(el);
}
/** A full-page scene background in the right shape for this format. */
export function scene(c: Kit, base: string, format: Format, colors?: string[]): void {
  art(c, `${base}-${SHAPE[format]}`, 0, 0, c.W, { h: c.H, colors, name: 'Background scene' });
}
export interface TOpts { font: string; weight?: number; size: number; lines?: number; fill?: Fill; align?: 'left' | 'center' | 'right'; upper?: boolean; spacing?: number; lh?: number; shadow?: Shadow; stroke?: [string, number]; italic?: boolean; name?: string; maxH?: number }
/** Live text, sized to fit `w` in at most `lines` lines (never breaking words). */
export function text(c: Kit, s: string, x: number, y: number, w: number, o: TOpts): TextEl {
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
export function box(c: Kit, x: number, y: number, w: number, h: number, fill: Fill, o: Partial<ShapeEl> = {}): ShapeEl {
  const el = makeShape(o.shape ?? 'rect', { fill, ...o });
  Object.assign(el, { x, y, w, h });
  c.els.push(el);
  return el;
}
/** A rounded label ("pill") centred on cx. */
export function pill(c: Kit, s: string, cx: number, y: number, size: number, fill: string, ink: string, font = 'Montserrat', weight = 800): void {
  const tw = widthOf(s.toUpperCase(), font, weight, size, true, size * 0.06);
  const w = Math.min(c.W * 0.9, tw + size * 2.4), h = size * 2.3;
  box(c, cx - w / 2, y, w, h, fill, { radius: h / 2 });
  const t = text(c, s, cx - w / 2, 0, w, { font, weight, size, fill: ink, upper: true, spacing: size * 0.06 });
  t.y = y + (h - t.h) / 2;
}
/** The y just below an element plus a gap (for text that flows under a title of unknown height). */
export const below = (el: { y: number; h: number }, gap: number) => el.y + el.h + gap;
export const lin = (a: string, b: string, angle = 180): Fill => ({ kind: 'linear', angle, stops: [{ at: 0, color: a }, { at: 1, color: b }] });
export const glow = (color: string, blur: number): Shadow => ({ color, blur, x: 0, y: 0 });
export const drop = (u: number, color = 'rgba(0,0,0,0.45)'): Shadow => ({ color, blur: u * 0.012, x: 0, y: u * 0.006 });

// ---------- build ----------
/** The editable document for a collection template (`sub` = its topic id, e.g. "halloween"). */
export function buildCollectionDoc(sub: string, t: CollectionTemplate, addedAt: number, bg: Fill = '#120f2b'): Design {
  const f = FORMATS[t.format];
  const c: Kit = { W: f.w, H: f.h, u: Math.min(f.w, f.h), els: [], bg, assets: {} };
  t.build(c);
  return { v: DOC_VERSION, id: `tpl_${sub}--${t.id}`, owner: 'system', name: t.name, width: f.w, height: f.h, pages: [newPage(c.bg, c.els)], assets: c.assets, template: `${sub}--${t.id}`, createdAt: addedAt, updatedAt: addedAt };
}
