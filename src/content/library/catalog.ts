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
import { COLLECTION_SETS, buildCollectionDoc, type CollectionSet } from './collections';
import type { CollectionTemplate } from './collections/kit';

// ---------- taxonomy (data-driven: edit taxonomy.json) ----------
export interface SubDef { id: string; label: string; emoji: string; keywords: string[]; palettes?: string[]; events: EventText[]; generate?: boolean }
export interface CatDef { id: string; label: string; emoji: string; kind: Kind; subcategories: SubDef[] }
export const CATEGORIES_TREE: CatDef[] = (taxonomy as { categories: CatDef[] }).categories;
const subIndex = new Map<string, { cat: CatDef; sub: SubDef }>();
for (const cat of CATEGORIES_TREE) for (const sub of cat.subcategories) subIndex.set(sub.id, { cat, sub });
export const subById = (id: string) => subIndex.get(id);

// ---------- metadata ----------
export type Source = 'library' | 'classic' | 'published' | 'collection';
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
  /** What it's for (holiday sub-filters): greeting, invitation, party, social, flyer, poster. */
  use?: string;
  /** How to build a library template (never stored with user designs). */
  recipe?: { arch: string; pal: string; voice: string; event: number; format: Format };
  /** Lower-cased words for search (name, category, keywords, tags…). */
  words: string[];
}

/** When each part of the library was added — used for "Recently added". */
const LIBRARY_ADDED = Date.UTC(2026, 9, 11);
const CLASSIC_ADDED = Date.UTC(2026, 9, 1);

// Lower-case, drop Latin accents, Hebrew niqqud and Arabic harakat/tatweel, fold Arabic letter variants (أإآ→ا, ى→ي,
// ة→ه); keep combining marks inside words (Devanagari and other Indic vowel signs are marks, not separators).
const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f\u0591-\u05c7\u064b-\u065f\u0670\u0640]/g, '')
  .replace(/[\u0622\u0623\u0625]/g, '\u0627').replace(/\u0649/g, '\u064a').replace(/\u0629/g, '\u0647').replace(/[^\p{L}\p{M}\p{N}%#+&]+/gu, ' ').trim();
const wordsOf = (...parts: (string | string[] | undefined)[]) => [...new Set(parts.flat().filter(Boolean).flatMap((p) => norm(p as string).split(' ')).filter((w) => w.length > 1 || /\d/.test(w)))];

function hash(s: string): number { let h = 2166136261; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }

/** Layouts a critic review found amateur next to Canva (racing-flag strips on wedding invites, "ADMIT ONE" on greetings,
 * numbers that mean nothing, balloons on every occasion): no longer used to generate templates. Their code stays so a
 * design made from one still has its source, and they can come back once redesigned. */
const RETIRED = new Set(['burst', 'confetti', 'ticket', 'bignum']);

/** Choose 4–5 genuinely different layouts per subcategory (different archetypes, formats and palettes). */
function plan(cat: CatDef, sub: SubDef): TemplateMeta[] {
  if (sub.generate === false || !sub.events.length) return [];
  const h = hash(sub.id);
  // a layout must suit the category and at least one of the topic's texts
  const eligible = ARCHETYPES.filter((a) => !RETIRED.has(a.id) && (a.kinds.includes(cat.kind) || a.also?.includes(sub.id)) && (!a.fits || sub.events.some((e) => a.fits!(e))));
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
  'save-the-date': ['milestones', 'wedding', 'Elegant', ['cream', 'green']], 'logo-badge': ['creators', 'branding', 'Retro', ['orange', 'cream']],
  'logo-gradient': ['creators', 'branding', 'Modern', ['purple', 'pink']], 'wallpaper-dream': ['creators', 'wallpaper', 'Playful', ['pink', 'purple']],
};

function classicMeta(t: Template): TemplateMeta {
  const [category, sub, style, colors] = CLASSIC_PLACES[t.id] ?? ['', '', 'Classic', []];
  const s = subById(sub);
  return {
    id: t.id, name: t.name, category: s?.cat.id ?? category, sub, format: norm(t.category).replace(/ /g, '-'), formatLabel: t.category,
    width: t.design.width, height: t.design.height, pages: t.design.pages.length,
    style, colors, occasion: '', tags: s?.sub.keywords ?? [], cost: t.cost, source: 'classic', addedAt: CLASSIC_ADDED, version: 1,
    words: wordsOf(t.name, t.category, s?.sub.label, s?.cat.label, s?.sub.keywords, style, colors),
  };
}

/** Hand-made collections (illustrated, made one by one — see collections/). */
const collectionBuilders = new Map<string, { set: CollectionSet; t: CollectionTemplate }>(COLLECTION_SETS.flatMap((set) => set.list.map((t) => [`${set.sub}--${t.id}`, { set, t }] as const)));
const USE_WORDS: Record<string, string[]> = { greeting: ['greeting', 'greetings', 'card', 'wishes'], invitation: ['invitation', 'invite', 'rsvp'], party: ['party', 'parties', 'event'], social: ['social', 'social media', 'instagram', 'post'], flyer: ['flyer', 'flyers', 'leaflet'], poster: ['poster', 'posters', 'print'] };
function collectionMeta(set: CollectionSet, t: CollectionTemplate): TemplateMeta {
  const f = FORMATS[t.format], s = subById(set.sub);
  return {
    id: `${set.sub}--${t.id}`, name: t.name, category: s?.cat.id ?? 'celebrations', sub: set.sub, format: t.format, formatLabel: f.label,
    width: f.w, height: f.h, pages: 1, style: t.style, colors: t.colors, occasion: t.occasion, tags: [...t.tags, 'illustrated'], use: t.use,
    cost: 0, source: 'collection', addedAt: set.addedAt, version: 1,
    words: wordsOf(t.name, t.tags, s?.sub.label, s?.cat.label, s?.sub.keywords, t.style, t.colors, f.label, t.occasion, 'illustrated', t.use ? USE_WORDS[t.use] : []),
  };
}

let builtIn: TemplateMeta[] | null = null;
const published = new Map<string, TemplateMeta>();
const listeners = new Set<() => void>();

/** A topic can use the same event text in several layouts ("3-on-3 Tournament" ×3): tell them apart by format, then style. */
function distinctNames(list: TemplateMeta[]): TemplateMeta[] {
  const groups = new Map<string, TemplateMeta[]>();
  for (const m of list) { const k = `${m.sub}|${m.name}`; groups.set(k, [...(groups.get(k) ?? []), m]); }
  for (const g of groups.values()) {
    if (g.length < 2) continue;
    const byFormat = new Set(g.map((m) => m.formatLabel)).size === g.length;
    for (const m of g) {
      const twin = g.filter((x) => x.formatLabel === m.formatLabel);
      m.name = `${m.name} · ${byFormat || twin.length === 1 ? m.formatLabel : `${m.formatLabel} ${twin.indexOf(m) + 1}`}`;
    }
  }
  return list;
}

/** Everything in the catalog right now (built-in first time it's asked for; published ones as they arrive). */
export function catalog(): TemplateMeta[] {
  builtIn ??= distinctNames([...COLLECTION_SETS.flatMap((set) => set.list.map((t) => collectionMeta(set, t))), ...CATEGORIES_TREE.flatMap((c) => c.subcategories.flatMap((s) => plan(c, s))), ...classicTemplates().map(classicMeta)]);
  return published.size ? [...published.values(), ...builtIn] : builtIn;
}
export const metaById = (id: string): TemplateMeta | undefined => published.get(id) ?? catalog().find((m) => m.id === id);

/** Add/refresh templates published from the template manager (server). */
export function setPublished(list: TemplateMeta[], merge = false): void {
  if (!merge) published.clear();
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
  else if (m.source === 'collection') { const b = collectionBuilders.get(m.id)!; d = buildCollectionDoc(b.set.sub, b.t, m.addedAt); }
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
  const key = `${m.id}@${m.version}`; // a re-published template gets a new revision
  const hit = docs.get(key);
  if (hit) return hit;
  if (!remoteDoc) throw new Error('This template is not available offline.');
  const d = await remoteDoc(m.id);
  docs.set(key, d);
  return d;
}
/** Text sizes depend on fonts; when fonts arrive, rebuild library documents so pictures and layouts are exact. */
export function forgetBuiltDocs(): void { for (const [id] of docs) { const src = metaById(id)?.source; if (src === 'library' || src === 'collection') docs.delete(id); } }

/** A `Template` (the shape the rest of the app uses) for a catalog entry. */
export function asTemplate(m: TemplateMeta): Template {
  return { id: m.id, name: m.name, category: m.formatLabel, cost: m.cost, get design() { return templateDoc(m); } } as Template;
}

/**
 * Layouts for new wording (AI drafts in the template manager): several different archetypes in the topic's colours,
 * built by the same layout engine as the library. Returns editable designs; nothing is saved here.
 */
export function draftDesigns(subId: string, ev: EventText, n = 4, seed = 0): { label: string; style: string; design: Design }[] {
  const s = subById(subId);
  if (!s) return [];
  const h0 = hash(subId + ev.title) + seed;
  const pals = s.sub.palettes?.length ? s.sub.palettes : PALETTES.map((p) => p.id);
  const picks = ARCHETYPES.filter((a) => (a.kinds.includes(s.cat.kind) || a.also?.includes(s.sub.id)) && (!a.fits || a.fits(ev)))
    .map((a) => ({ a, k: hash(a.id + h0) })).sort((x, y) => x.k - y.k).slice(0, n).map((x) => x.a);
  return picks.map((a, i) => {
    const format = a.formats[(h0 + i) % a.formats.length];
    const { pages, assets, w, h } = buildPages(a, { pal: paletteById(pals[(h0 + i) % pals.length]), f: FONTS[a.voices[(h0 + i) % a.voices.length]], ev, motif: s.sub.emoji, label: s.sub.label, kind: s.cat.kind, seed: (h0 + i) % 97 }, format);
    const now = Date.now();
    return { label: `${a.label} · ${FORMATS[format].label}`, style: a.style, design: { v: DOC_VERSION, id: `draft_${i}`, owner: 'system', name: ev.title, width: w, height: h, pages, assets, createdAt: now, updatedAt: now } };
  });
}

/** The format key + label for a design size (library formats first, otherwise "W × H"). */
export function formatFor(w: number, h: number, pages: number): { format: string; formatLabel: string } {
  const hit = (Object.entries(FORMATS) as [Format, { w: number; h: number; label: string }][]).find(([k, f]) => f.w === w && f.h === h && (k !== 'slides' || pages > 1) && (k !== 'landscape' || pages === 1));
  return hit ? { format: hit[0], formatLabel: hit[1].label } : { format: `${w}x${h}`, formatLabel: `${w} × ${h} px` };
}

/** Every style and colour word used in the library (choices for the publish form). */
export function styleWords(): { styles: string[]; colors: string[] } {
  return { styles: [...new Set(ARCHETYPES.map((a) => a.style))].sort(), colors: [...new Set(PALETTES.flatMap((p) => p.families))].sort() };
}
