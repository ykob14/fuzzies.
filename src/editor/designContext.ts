/**
 * What a design is about, so the editor's panels can lead with related art and templates (a birthday invitation should
 * open Elements on cakes and balloons, not on Halloween). Sources, strongest first: the art collections the design already
 * uses, the template it was started from (its topic and category), and the words on its pages. With nothing to go on,
 * the current season decides. The template catalog is a lazy chunk, so the context is worked out asynchronously and cached.
 */
import type { Design } from './types';
import { COLLECTIONS, collectionOf, type AssetDef, type Collection } from '../content/assets';

export interface DesignContext {
  /** Topic (taxonomy sub id) and category, or '' when unknown. */
  sub: string;
  cat: string;
  /** Human label of the topic ("Birthdays"). */
  label: string;
  /** Lower-case words that describe the design: strong (topic) and weak (keywords, page text). */
  strong: string[];
  weak: string[];
  /** The template's tags and the page's own words — hints only (a name on the page shouldn't pull in art). */
  extra: string[];
  /** Collections ranked best first (every collection appears once). */
  ranked: Collection[];
}

/** Topics whose art lives in a specific collection (the category default is used otherwise). */
const SUB_COLS: Record<string, string[]> = {
  halloween: ['halloween'], christmas: ['christmas', 'christian'], advent: ['christian', 'christmas'], hanukkah: ['hanukkah', 'jewish'],
  passover: ['passover', 'jewish'], thanksgiving: ['events'], birthday: ['events', 'milestones', 'icons'], 'first-birthday': ['baby', 'events'],
  'new-year': ['events', 'icons'], diwali: ['indian'], holi: ['indian'], navratri: ['indian'], 'ganesh-chaturthi': ['indian'], onam: ['indian'],
  vaisakhi: ['indian'], vesak: ['asian'], 'lunar-new-year': ['asian'], 'mid-autumn': ['asian'], 'dragon-boat': ['asian'], nowruz: ['world'],
  kwanzaa: ['world'], 'dia-de-los-muertos': ['world'], valentines: ['milestones', 'icons'], anniversary: ['milestones', 'icons'],
  retirement: ['milestones', 'icons'], 'bar-bat-mitzvah': ['milestones', 'jewish'], 'brit-milah': ['baby', 'jewish'], aqeeqah: ['baby', 'islamic'],
  'charity-run': ['icons', 'events'], marathon: ['icons', 'events'], running: ['icons', 'events'], wedding: ['milestones'], engagement: ['milestones'],
};
const CAT_COLS: Record<string, string[]> = {
  sports: ['icons', 'events'], entertainment: ['icons', 'events'], community: ['icons', 'events'], business: ['icons', 'events'],
  education: ['icons', 'milestones', 'events'], creators: ['icons', 'events'], celebrations: ['events', 'milestones'], islamic: ['islamic'],
  jewish: ['jewish', 'hanukkah', 'passover'], christian: ['christian', 'christmas'], cultural: ['indian', 'asian', 'world'], baby: ['baby'],
  milestones: ['milestones', 'events'],
};
/** What's in season (month 0–11) — used when the design gives no clue, and as a light tie-breaker. */
export function seasonCollections(now = new Date()): string[] {
  const m = now.getMonth(), d = now.getDate();
  if (m === 8 && d >= 15 || m === 9) return ['halloween', 'events'];
  if (m === 10) return ['events', 'christmas', 'hanukkah'];
  if (m === 11) return ['christmas', 'hanukkah', 'events'];
  if (m <= 1) return ['asian', 'milestones'];
  if (m <= 3) return ['christian', 'passover', 'islamic'];
  if (m <= 5) return ['milestones', 'events'];
  return ['events', 'icons'];
}
/** Everyday collections, in the order they help most when nothing else is known. */
const GENERAL = ['events', 'icons', 'milestones', 'baby'];

const tokens = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').split(/[^a-z0-9']+/).filter((w) => w.length > 2);
const STOP = new Set(['the', 'and', 'for', 'you', 'your', 'our', 'with', 'are', 'join', 'from', 'this', 'that', 'all', 'get', 'new', 'day', 'pm', 'am', 'rsvp', 'post', 'story', 'poster', 'flyer']);

const cache = new Map<string, DesignContext>();

export async function designContext(d: Design, now = new Date()): Promise<DesignContext> {
  const text = d.pages.flatMap((p) => p.elements.map((e) => (e.type === 'text' ? e.text : ''))).join(' ').slice(0, 2000);
  const used = new Map<string, number>();
  for (const p of d.pages) for (const e of p.elements) if (e.type === 'graphic') { const c = collectionOf(e.art); if (c) used.set(c.id, (used.get(c.id) ?? 0) + 1); }
  const key = `${d.id}|${d.template ?? ''}|${text.length}|${[...used].join(',')}|${now.getMonth()}`;
  const hit = cache.get(key);
  if (hit) return hit;

  let sub = '', cat = '', label = '';
  const strong: string[] = [], weak: string[] = [], extra: string[] = [];
  try {
    const lib = await import('../content/library/catalog');
    const meta = d.template ? lib.metaById(d.template) : undefined;
    let s = meta?.sub ? lib.subById(meta.sub) : undefined;
    if (!s && text.trim()) {
      // no template: the topic whose keywords the page's words hit most ("Happy Birthday Mia!" → Birthdays)
      const words = new Set(tokens(text));
      let best = 0;
      for (const c of lib.CATEGORIES_TREE) for (const x of c.subcategories) {
        const score = x.keywords.reduce((n, k) => n + (tokens(k).length && tokens(k).every((w) => words.has(w)) ? 1 : 0), 0) + (words.has(x.id) ? 2 : 0);
        if (score > best) { best = score; s = { cat: c, sub: x }; }
      }
    }
    if (s) {
      sub = s.sub.id; cat = s.cat.id; label = s.sub.label;
      strong.push(...tokens(s.sub.id.replace(/-/g, ' ')), ...tokens(s.sub.label));
      weak.push(...s.sub.keywords.flatMap(tokens));
    } else if (meta?.category) cat = meta.category;
    if (meta) extra.push(...meta.tags.flatMap(tokens));
  } catch { /* offline before the library chunk loaded: season + used art only */ }
  extra.push(...tokens(text).filter((w) => !STOP.has(w)).slice(0, 40));

  const score = new Map<string, number>(COLLECTIONS.map((c) => [c.id, 0]));
  const add = (id: string, n: number) => score.has(id) && score.set(id, score.get(id)! + n);
  for (const [id, n] of used) add(id, 100 + n);
  (SUB_COLS[sub] ?? []).forEach((id, i) => add(id, 60 - i * 5));
  (CAT_COLS[cat] ?? []).forEach((id, i) => add(id, 40 - i * 5));
  const words = new Set([...strong, ...weak, ...extra]);
  for (const c of COLLECTIONS) for (const w of tokens(`${c.name} ${c.blurb}`)) if (words.has(w)) add(c.id, strong.includes(w) ? 12 : 4);
  seasonCollections(now).forEach((id, i) => add(id, 6 - i * 2));
  GENERAL.forEach((id, i) => add(id, 2 - i * 0.4));
  const ranked = [...COLLECTIONS].sort((a, b) => score.get(b.id)! - score.get(a.id)!);

  const ctx: DesignContext = { sub, cat, label, strong: [...new Set(strong)], weak: [...new Set(weak)], extra: [...new Set(extra)].filter((w) => !strong.includes(w) && !weak.includes(w)), ranked };
  cache.set(key, ctx);
  return ctx;
}

/** How well an asset fits the design (0 = not at all). The topic's own icon (ic-<topic>) always comes first. */
export function relevance(a: AssetDef, ctx: DesignContext): number {
  if (ctx.sub && a.id === `ic-${ctx.sub}`) return 1000;
  const hay = new Set([a.name, ...a.tags].flatMap(tokens));
  let n = 0;
  const has = (w: string) => hay.has(w) || (w.length > 4 && w.endsWith('s') && hay.has(w.slice(0, -1)));
  for (const w of ctx.strong) if (has(w)) n += 5;
  for (const w of ctx.weak) if (has(w)) n += 2;
  for (const w of ctx.extra) if (has(w)) n += 1;
  return n;
}
