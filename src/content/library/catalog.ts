/**
 * The template catalog: lightweight metadata for every template (built-in library, the original "classic" templates
 * and templates published from the template manager), kept separate from the editable design documents.
 * Documents are built (library), copied (classic) or downloaded (published) only when someone previews or uses one.
 */
import taxonomy from './taxonomy.json';
import type { Design } from '../../editor/types';
import { DOC_VERSION } from '../../editor/model';
import { templates as classicTemplates, type Template } from '../templates';
import { ARCHETYPES, FORMATS, buildPages, type Archetype, type EventText, type Format, type Kind } from './layouts';
import { FONTS, PALETTES, paletteById } from './palettes';

// ---------- taxonomy (data-driven: edit taxonomy.json) ----------
export interface SubDef { id: string; label: string; emoji: string; keywords: string[]; palettes?: string[]; events: EventText[]; generate?: boolean }
export interface CatDef { id: string; label: string; emoji: string; kind: Kind; subcategories: SubDef[] }
export const CATEGORIES_TREE: CatDef[] = (taxonomy as { categories: CatDef[] }).categories;
const subIndex = new Map<string, { cat: CatDef; sub: SubDef }>();
for (const cat of CATEGORIES_TREE) for (const sub of cat.subcategories) subIndex.set(sub.id, { cat, sub });
export const subById = (id: string) => subIndex.get(id);

// ---------- metadata ----------
export type Source = 'library' | 'classic' | 'published';
export interface TemplateMeta {
  id: string;
  name: string;
  category: string; // CatDef id ('' = uncategorised)
  sub: string;      // SubDef id
  format: string;   // FORMATS key or a classic format label
  formatLabel: string;
  width: number;
  height: number;
  pages: number;
  style: string;
  colors: string[];
  occasion: string;
  tags: string[];
  cost: number;
  source: Source;
  addedAt: number;
  version: number;
  thumb?: string;   // published templates carry a server-made picture
  /** How to build a library template (never stored with user designs). */
  recipe?: { arch: string; pal: string; voice: string; event: number; format: Format };
  /** Lower-cased words for search (name, category, keywords, tags…). */
  words: string[];
}

/** When each part of the library was added — used for "Recently added". */
const LIBRARY_ADDED = Date.UTC(2026, 9, 11);
const CLASSIC_ADDED = Date.UTC(2026, 9, 1);

const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9%#+&]+/g, ' ').trim();
const wordsOf = (...parts: (string | string[] | undefined)[]) => [...new Set(parts.flat().filter(Boolean).flatMap((p) => norm(p as string).split(' ')).filter((w) => w.length > 1 || /\d/.test(w)))];

function hash(s: string): number { let h = 2166136261; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }

/** Choose 4–5 genuinely different layouts per subcategory (different archetypes, formats and palettes). */
function plan(cat: CatDef, sub: SubDef): TemplateMeta[] {
  if (sub.generate === false || !sub.events.length) return [];
  const h = hash(sub.id);
  // a layout must suit the category and at least one of the topic's texts
  const eligible = ARCHETYPES.filter((a) => (a.kinds.includes(cat.kind) || a.also?.includes(sub.id)) && (!a.fits || sub.events.some((e) => a.fits!(e))));
  const special = eligible.filter((a) => a.also?.includes(sub.id) && !a.kinds.length); // certificates, slides: the reason this topic exists
  const rest = eligible.filter((a) => !special.includes(a)).map((a) => ({ a, k: hash(sub.id + a.id) })).sort((x, y) => x.k - y.k).map((x) => x.a);
  const want = sub.events.length >= 3 ? 5 : 4;
  const picks: Archetype[] = [...special.flatMap((a) => [a, a]).slice(0, 2), ...rest].slice(0, want);
  const pals = sub.palettes?.length ? sub.palettes : PALETTES.map((p) => p.id);
  const used = new Map<string, number>();
  let lastFormat = '';
  return picks.map((a, i) => {
    const n = (used.get(a.id) ?? 0) + 1;
    used.set(a.id, n);
    const fmts = a.formats;
    let format = fmts[(h + i * 3) % fmts.length];
    if (format === lastFormat && fmts.length > 1) format = fmts[(h + i * 3 + 1) % fmts.length];
    lastFormat = format;
    const pal = paletteById(pals[(i + (n - 1)) % pals.length]);
    const voice = a.voices[(h + i) % a.voices.length];
    let event = (i + (n - 1)) % sub.events.length;
    if (a.fits && !a.fits(sub.events[event])) event = sub.events.findIndex((e) => a.fits!(e));
    const ev = sub.events[event];
    const f = FORMATS[format];
    return {
      id: `${sub.id}--${a.id}${n > 1 ? `-${n}` : ''}`,
      name: ev.title,
      category: cat.id, sub: sub.id,
      format, formatLabel: f.label, width: f.w, height: f.h, pages: a.id === 'slides' ? 3 : 1,
      style: a.style, colors: pal.families, occasion: ev.occasion,
      tags: [...sub.keywords, ev.occasion, a.label, pal.label],
      cost: 0, source: 'library' as const, addedAt: LIBRARY_ADDED, version: 1,
      recipe: { arch: a.id, pal: pal.id, voice, event, format },
      words: wordsOf(ev.title, ev.kicker, sub.label, cat.label, sub.keywords, ev.occasion, a.style, a.label, pal.families, f.label),
    };
  });
}

// The original hand-made templates, placed in the new categories (their designs are untouched).
const CLASSIC_PLACES: Record<string, [string, string, string, string[]]> = { // id: [category, sub, style, colours]
  'summer-sale': ['business', 'sale', 'Bold', ['orange', 'pink']], 'quote-classic': ['creators', 'quote', 'Elegant', ['cream', 'orange']],
  'new-drop': ['business', 'announcement', 'Bold', ['black', 'pink']], motivation: ['creators', 'quote', 'Playful', ['purple', 'pink']],
  'cafe-special': ['business', 'restaurant', 'Retro', ['cream', 'orange']], giveaway: ['creators', 'giveaway', 'Playful', ['purple', 'pink']],
  'this-or-that': ['creators', 'quote', 'Playful', ['cream', 'pink']], 'birthday-story': ['celebrations', 'birthday', 'Playful', ['pink', 'purple']],
  'travel-story': ['creators', 'travel', 'Photo', ['blue', 'teal']], 'story-announce': ['business', 'announcement', 'Bold', ['black', 'pink']],
  exhibition: ['community', 'local-event', 'Modern', ['white', 'orange']], 'spring-fair': ['community', 'festival', 'Playful', ['cream', 'pink']],
  'live-music': ['entertainment', 'concert', 'Bold', ['black', 'yellow']], 'retro-poster': ['entertainment', 'dj-night', 'Retro', ['orange', 'cream']],
  'yard-sale': ['community', 'market', 'Playful', ['yellow', 'black']], 'yoga-class': ['sports', 'yoga', 'Minimal', ['green', 'cream']],
  'lost-pet': ['community', 'local-event', 'Bold', ['yellow', 'black']], 'yt-top10': ['creators', 'youtube', 'Bold', ['black', 'yellow']],
  'yt-vlog': ['creators', 'youtube', 'Playful', ['blue', 'pink']], 'pitch-deck': ['business', 'presentation', 'Modern', ['blue', 'white']],
  'creative-deck': ['business', 'presentation', 'Playful', ['pink', 'yellow']], 'card-modern': ['creators', 'branding', 'Minimal', ['black', 'white']],
  'card-pastel': ['creators', 'branding', 'Playful', ['pink', 'blue']], 'party-invite': ['celebrations', 'birthday', 'Playful', ['pink', 'purple']],
  'save-the-date': ['celebrations', 'wedding', 'Elegant', ['cream', 'green']], 'logo-badge': ['creators', 'branding', 'Retro', ['orange', 'cream']],
  'logo-gradient': ['creators', 'branding', 'Modern', ['purple', 'pink']], 'wallpaper-dream': ['creators', 'wallpaper', 'Playful', ['pink', 'purple']],
};

function classicMeta(t: Template): TemplateMeta {
  const [category, sub, style, colors] = CLASSIC_PLACES[t.id] ?? ['', '', 'Classic', []];
  const s = subById(sub);
  return {
    id: t.id, name: t.name, category, sub, format: norm(t.category).replace(/ /g, '-'), formatLabel: t.category,
    width: t.design.width, height: t.design.height, pages: t.design.pages.length,
    style, colors, occasion: '', tags: s?.sub.keywords ?? [], cost: t.cost, source: 'classic', addedAt: CLASSIC_ADDED, version: 1,
    words: wordsOf(t.name, t.category, s?.sub.label, s?.cat.label, s?.sub.keywords, style, colors),
  };
}

let builtIn: TemplateMeta[] | null = null;
const published = new Map<string, TemplateMeta>();
const listeners = new Set<() => void>();

/** Everything in the catalog right now (built-in first time it's asked for; published ones as they arrive). */
export function catalog(): TemplateMeta[] {
  builtIn ??= [...CATEGORIES_TREE.flatMap((c) => c.subcategories.flatMap((s) => plan(c, s))), ...classicTemplates().map(classicMeta)];
  return published.size ? [...published.values(), ...builtIn] : builtIn;
}
export const metaById = (id: string): TemplateMeta | undefined => catalog().find((m) => m.id === id);

/** Add/refresh templates published from the template manager (server). */
export function setPublished(list: TemplateMeta[]): void {
  published.clear();
  for (const m of list) published.set(m.id, { ...m, source: 'published', words: wordsOf(m.name, m.tags, subById(m.sub)?.sub.label, subById(m.sub)?.cat.label, subById(m.sub)?.sub.keywords, m.style, m.colors, m.formatLabel, m.occasion) });
  listeners.forEach((f) => f());
}
export function onCatalogChange(fn: () => void): () => void { listeners.add(fn); return () => listeners.delete(fn); }

// ---------- documents ----------
const docs = new Map<string, Design>();
let remoteDoc: ((id: string) => Promise<Design>) | null = null;
/** The template manager provides how to download published documents. */
export function setRemoteLoader(fn: (id: string) => Promise<Design>): void { remoteDoc = fn; }

/** The editable document for a template (built or copied fresh; callers must not change it — use instantiate()). */
export function templateDoc(m: TemplateMeta): Design {
  const hit = docs.get(m.id);
  if (hit) return hit;
  let d: Design;
  if (m.source === 'classic') d = classicTemplates().find((t) => t.id === m.id)!.design;
  else if (m.recipe) {
    const r = m.recipe;
    const s = subById(m.sub)!;
    const a = ARCHETYPES.find((x) => x.id === r.arch)!;
    const { pages, assets, w, h } = buildPages(a, { pal: paletteById(r.pal), f: FONTS[r.voice], ev: s.sub.events[r.event], motif: s.sub.emoji, label: s.sub.label, kind: s.cat.kind, seed: hash(m.id) % 97 }, r.format);
    d = { v: DOC_VERSION, id: `tpl_${m.id}`, owner: 'system', name: m.name, width: w, height: h, pages, assets, template: m.id, createdAt: m.addedAt, updatedAt: m.addedAt };
  } else throw new Error('Published templates are loaded with loadTemplateDoc()');
  docs.set(m.id, d);
  return d;
}
/** Works for every source (downloads published documents once). */
export async function loadTemplateDoc(m: TemplateMeta): Promise<Design> {
  if (m.source !== 'published') return templateDoc(m);
  const hit = docs.get(m.id);
  if (hit) return hit;
  if (!remoteDoc) throw new Error('This template is not available offline.');
  const d = await remoteDoc(m.id);
  docs.set(m.id, d);
  return d;
}
/** Text sizes depend on fonts; when fonts arrive, rebuild library documents so pictures and layouts are exact. */
export function forgetBuiltDocs(): void { for (const [id] of docs) if (metaById(id)?.source === 'library') docs.delete(id); }

/** A `Template` (the shape the rest of the app uses) for a catalog entry. */
export function asTemplate(m: TemplateMeta): Template {
  return { id: m.id, name: m.name, category: m.formatLabel, cost: m.cost, get design() { return templateDoc(m); } } as Template;
}
