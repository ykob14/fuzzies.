/**
 * Template search: every query word must match (prefix match, small typos forgiven), results ranked by where
 * the words matched (name > topic > tags) and then by real usage. Filters are facets over the catalog metadata.
 */
import { quality, subById, type TemplateMeta } from './catalog';

export interface Filters { category?: string; sub?: string; format?: string; style?: string; color?: string; occasion?: string; free?: boolean; use?: string }
export interface Usage { uses(id: string): number }

/** A few everyday words people type that our keywords spell differently. */
const SYNONYMS: Record<string, string[]> = {
  bday: ['birthday'], xmas: ['christmas'], nye: ['new', 'year'], footy: ['football', 'soccer'], hoops: ['basketball'],
  invite: ['invitation'], invites: ['invitation'], grad: ['graduation'], promo: ['promotion'], ad: ['advertisement'],
  ppt: ['presentation'], deck: ['presentation'], cert: ['certificate'], gig: ['concert'], quiz: ['trivia'], pingpong: ['table', 'tennis'],
  gym: ['fitness'], workout: ['fitness'], kids: ['youth', 'ages'],
  // holidays: alternative spellings, Hebrew and related words
  chanukah: ['hanukkah'], hanukah: ['hanukkah'], chanukkah: ['hanukkah'], hannukah: ['hanukkah'], hanuka: ['hanukkah'], chanuka: ['hanukkah'], hanukkiyah: ['menorah'], hanukkia: ['menorah'],
  'חנוכה': ['hanukkah'], 'חנוכיה': ['menorah'], 'סביבון': ['dreidel'], sevivon: ['dreidel'], latke: ['latkes'], sufganiya: ['sufganiyot'],
  pesach: ['passover'], pesah: ['passover'], 'פסח': ['passover'], 'סדר': ['seder'], matzo: ['matzah'], matza: ['matzah'], matzoh: ['matzah'], hagadah: ['haggadah'], haggada: ['haggadah'], 'הגדה': ['haggadah'],
  noel: ['christmas'], garage: ['yard'], rummage: ['yard'], realtor: ['listed', 'estate'], realty: ['estate'], card: ['greeting'], cards: ['greeting'],
  // multicultural: spellings and other languages that should find the same topic (topic keywords cover the rest)
  ramzan: ['ramadan'], ramazan: ['ramadan'], ramadhan: ['ramadan'], 'رمضان': ['ramadan'], 'عيد': ['eid'], eidul: ['eid'], bakrid: ['adha'], qurbani: ['adha'],
  iftaar: ['iftar'], sehri: ['suhoor'], suhur: ['suhoor'], sahur: ['suhoor'], masjid: ['mosque'], 'مسجد': ['mosque'], zakah: ['zakat'], sadaqa: ['sadaqah'], sadqa: ['sadaqah'],
  succot: ['sukkot'], sukkos: ['sukkot'], succos: ['sukkot'], shavuos: ['shavuot'], 'סוכות': ['sukkot'], 'פורים': ['purim'], 'שבועות': ['shavuot'], bris: ['brit'], 'מזל': ['mazel'],
  pascua: ['easter'], pascuas: ['easter'], paques: ['easter'], ostern: ['easter'], navidad: ['christmas'], weihnachten: ['christmas'], bautizo: ['baptism'], christening: ['baptism'], comunion: ['communion'],
  deepavali: ['diwali'], divali: ['diwali'], deepawali: ['diwali'], 'दिवाली': ['diwali'], 'दीपावली': ['diwali'], 'होली': ['holi'], baisakhi: ['vaisakhi'], wesak: ['vesak'], garba: ['navratri'], dandiya: ['navratri'],
  cny: ['lunar'], '春节': ['lunar'], mooncake: ['autumn'], duanwu: ['dragon'], norooz: ['nowruz'], navruz: ['nowruz'], 'نوروز': ['nowruz'], muertos: ['muertos', 'dead'], calavera: ['muertos'],
  aqiqah: ['aqeeqah'], akika: ['aqeeqah'], quince: ['quinceanera'], xv: ['quinceanera'], sixteen: ['16'], mitzva: ['mitzvah'], mom: ['mothers'], mum: ['mothers'], dad: ['fathers'],
};

// Lower-case, drop Latin accents, Hebrew niqqud and Arabic harakat/tatweel, fold Arabic letter variants (أإآ→ا, ى→ي,
// ة→ه); keep combining marks inside words (Devanagari and other Indic vowel signs are marks, not separators).
const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f\u0591-\u05c7\u064b-\u065f\u0670\u0640]/g, '')
  .replace(/[\u0622\u0623\u0625]/g, '\u0627').replace(/\u0649/g, '\u064a').replace(/\u0629/g, '\u0647').replace(/[^\p{L}\p{M}\p{N}%#+&]+/gu, ' ').trim();

function close(a: string, b: string): boolean {
  // one edit (insert / delete / substitute / swap) for words of 4+ letters
  if (Math.abs(a.length - b.length) > 1 || a.length < 4) return false;
  let i = 0, j = 0, edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (a.length > b.length) i++; else if (b.length > a.length) j++;
    else if (a[i + 1] === b[j] && a[i] === b[j + 1]) { i += 2; j += 2; } else { i++; j++; }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

/** Words that name WHAT a template is ("instagram post", "logo", "invitation"): they pick the kind instead of having to
 * appear in the text, so "birthday invitation" ranks every birthday invitation first and still shows other birthday
 * templates after them. Longest phrases first. */
const KIND_PHRASES: [string[], string[]][] = [
  [['instagram', 'post'], ['post', 'carousel']], [['instagram', 'posts'], ['post', 'carousel']], [['instagram', 'story'], ['story']], [['instagram', 'stories'], ['story']],
  [['instagram', 'carousel'], ['carousel']], [['youtube', 'thumbnail'], ['youtube']], [['youtube', 'thumbnails'], ['youtube']], [['business', 'card'], ['business-card']],
  [['business', 'cards'], ['business-card']], [['greeting', 'card'], ['card']], [['greeting', 'cards'], ['card']], [['social', 'media', 'post'], ['post', 'carousel']], [['social', 'post'], ['post', 'carousel']],
  [['post'], ['post', 'carousel']], [['posts'], ['post', 'carousel']], [['instagram'], ['post', 'carousel', 'story']], [['ig'], ['post', 'carousel', 'story']], [['story'], ['story']], [['stories'], ['story']],
  [['carousel'], ['carousel']], [['poster'], ['poster']], [['posters'], ['poster']], [['flyer'], ['flyer']], [['flyers'], ['flyer']], [['leaflet'], ['flyer']],
  [['invitation'], ['invitation']], [['invitations'], ['invitation']], [['invite'], ['invitation']], [['invites'], ['invitation']], [['card'], ['card', 'invitation']], [['cards'], ['card', 'invitation']],
  [['logo'], ['logo']], [['logos'], ['logo']], [['thumbnail'], ['youtube']], [['thumbnails'], ['youtube']], [['youtube'], ['youtube']], [['banner'], ['banner']], [['banners'], ['banner']],
  [['presentation'], ['presentation']], [['presentations'], ['presentation']], [['slides'], ['presentation', 'carousel']], [['deck'], ['presentation']], [['ppt'], ['presentation']],
  [['menu'], ['menu']], [['menus'], ['menu']], [['resume'], ['resume']], [['resumes'], ['resume']], [['cv'], ['resume']], [['invoice'], ['invoice']], [['newsletter'], ['newsletter']],
  [['letterhead'], ['letterhead']], [['calendar'], ['calendar']], [['planner'], ['planner']], [['certificate'], ['certificate']], [['wallpaper'], ['wallpaper']],
];

interface Fields { name: string[]; topic: string[]; keys: string[]; tags: string[]; all: string[]; nameText: string; topicText: string; tagText: string }
const fieldCache = new WeakMap<TemplateMeta, Fields>();
function fields(m: TemplateMeta): Fields {
  let f = fieldCache.get(m);
  if (!f) {
    const s = subById(m.sub);
    const topicText = norm([m.sub.replace(/-/g, ' '), s?.sub.label ?? '', ...(s?.sub.keywords ?? [])].join(' · '));
    const tagText = norm([...m.tags, m.occasion].join(' · '));
    const nameText = norm(m.name);
    const topic = norm(`${m.sub.replace(/-/g, ' ')} ${s?.sub.label ?? ''}`).split(' ');
    f = { name: nameText.split(' '), topic, keys: topicText.split(' '), tags: tagText.split(' '), all: m.words, nameText, topicText, tagText };
    fieldCache.set(m, f);
  }
  return f;
}

/** 3 = the same word, 2 = starts with it, 1 = one typo away, 0 = no. */
function level(q: string, words: string[]): number {
  let best = 0;
  for (const w of words) {
    if (w === q) return 3;
    if (best < 2 && q.length >= 2 && w.startsWith(q)) best = 2;
    else if (!best && (close(q, w) || (q.length >= 5 && close(q, w.slice(0, q.length))))) best = 1;
  }
  return best;
}
/** How well one query word matches: a title word counts most, then the topic's name, its keywords, the tags, then
 * anything else (category, colours…).
 * Typos only count as 1 so they can never beat a real match. */
function wordScore(q: string, f: Fields): { s: number; typo: boolean } {
  const l = [level(q, f.name), level(q, f.topic), level(q, f.keys), level(q, f.tags), level(q, f.all)];
  const W = [4, 3.5, 2.5, 2, 1];
  let s = 0;
  for (let i = 0; i < 5; i++) if (l[i] >= 2) s = Math.max(s, l[i] * W[i]);
  if (s) return { s, typo: false };
  return l.some((x) => x === 1) ? { s: 1, typo: true } : { s: 0, typo: false };
}

/** Topics in season by month (Jan = 0): browsing shows them a little earlier, like a shop window. */
export const SEASON: string[][] = [
  ['new-year', 'lunar-new-year'], ['valentines', 'lunar-new-year', 'ramadan'], ['ramadan', 'eid-al-fitr', 'purim', 'holi'], ['easter', 'passover'],
  ['mothers-day', 'graduation'], ['fathers-day', 'graduation', 'wedding'], ['wedding', 'birthday'], ['back-to-school'],
  ['back-to-school', 'rosh-hashanah'], ['halloween', 'diwali', 'dia-de-los-muertos'], ['thanksgiving', 'diwali'], ['christmas', 'hanukkah', 'new-year', 'kwanzaa'],
];
function inSeason(): Set<string> {
  const mo = new Date().getMonth();
  return new Set([...(SEASON[mo] ?? []), ...(new Date().getDate() >= 20 ? SEASON[(mo + 1) % 12] ?? [] : [])]);
}

/** Keep the best first but never show the same topic three times in a row when another as good is close behind. */
function diversify<T extends { m: TemplateMeta; s: number }>(list: T[], slack: number): T[] {
  const out = [...list];
  for (let i = 1; i < out.length; i++) {
    const prev = out[i - 1].m.sub;
    if (!prev || out[i].m.sub !== prev) continue;
    for (let j = i + 1; j < Math.min(out.length, i + 14); j++) {
      if (out[j].s < out[i].s - slack) break;
      if (out[j].m.sub !== prev) { const [x] = out.splice(j, 1); out.splice(i, 0, x); break; }
    }
  }
  return out;
}

export function search(all: TemplateMeta[], query: string, f: Filters, usage?: Usage): TemplateMeta[] {
  const list = all.filter((m) => (!f.category || m.category === f.category) && (!f.sub || m.sub === f.sub) && (!f.format || m.kind === f.format)
    && (!f.style || m.style === f.style) && (!f.use || m.use === f.use) && (!f.color || m.colors.includes(f.color)) && (!f.occasion || m.occasion === f.occasion) && (!f.free || m.cost === 0));
  const season = inSeason();
  const base = (m: TemplateMeta) => quality(m) * 1.2 + Math.min(2.5, (usage?.uses(m.id) ?? 0) / 20) + (season.has(m.sub) ? 0.8 : 0);
  let qWords = norm(query).split(' ').filter(Boolean);
  if (!qWords.length) {
    const ranked = list.map((m) => ({ m, s: base(m) })).sort((a, b) => b.s - a.s);
    return diversify(ranked, 0.7).map((x) => x.m);
  }
  // pull out the words that say what kind of template is wanted
  const kindGroups: Set<string>[] = [];
  for (let i = 0; i < qWords.length;) {
    const hit = KIND_PHRASES.find(([ph]) => ph.every((w, k) => qWords[i + k] === w));
    if (hit) { kindGroups.push(new Set(hit[1])); qWords = [...qWords.slice(0, i), ...qWords.slice(i + hit[0].length)]; } else i++;
  }
  const groups = qWords.map((w) => [w, ...(SYNONYMS[w] ?? [])]);
  const phrase = norm(query);
  const topicPhrase = qWords.join(' ');
  type Hit = { m: TemplateMeta; s: number; rel: number; typo: boolean };
  const hits: Hit[] = [];
  for (const m of list) {
    const fl = fields(m);
    let rel = 0, typo = false, ok = true;
    for (const g of groups) {
      let best = { s: 0, typo: false };
      for (const w of g) { const r = wordScore(w, fl); if (r.s > best.s) best = r; }
      if (!best.s) { ok = false; break; }
      rel += best.s; typo ||= best.typo;
    }
    if (!ok) continue;
    let kinds = 0;
    for (const k of kindGroups) if (k.has(m.kind)) kinds++;
    if (!groups.length && !kinds) continue; // only kind words ("logo"): templates of that kind
    if (groups.length > 1 || (kindGroups.length && groups.length)) {
      if (fl.nameText.includes(topicPhrase)) rel += 8; else if (fl.topicText.includes(topicPhrase)) rel += 5; else if (fl.tagText.includes(topicPhrase)) rel += 4;
    }
    if (groups.length && phrase.includes(' ') && fl.nameText.includes(phrase)) rel += 6;
    hits.push({ m, rel, typo, s: rel + kinds * 14 + base(m) });
  }
  // a real match exists: leave out templates that only matched through a typo, and weak tag-only matches
  let kept = hits;
  if (hits.some((x) => !x.typo)) kept = hits.filter((x) => !x.typo);
  const bestRel = Math.max(0, ...kept.map((x) => x.rel));
  if (groups.length && kept.length > 6) kept = kept.filter((x) => x.rel >= bestRel * 0.4);
  kept.sort((a, b) => b.s - a.s);
  let out = diversify(kept, 0.6).map((x) => x.m);
  // only a few: add the rest of the best results' topics (a yard sale flyer → other markets & sales)
  if (out.length && out.length < 10 && groups.length && !f.sub) {
    const seen = new Set(out.map((m) => m.id));
    const topics = [...new Set(out.slice(0, 3).map((m) => m.sub).filter(Boolean))];
    const more = list.filter((m) => !seen.has(m.id) && topics.includes(m.sub)).map((m) => ({ m, s: base(m) + (kindGroups.some((k) => k.has(m.kind)) ? 5 : 0) })).sort((a, b) => b.s - a.s);
    out = [...out, ...more.slice(0, 16 - out.length).map((x) => x.m)];
  }
  return out;
}

/** Values for each filter with how many templates have them (for the filter menus). */
export function facets(list: TemplateMeta[]): Record<'format' | 'style' | 'color' | 'occasion', [string, string, number][]> {
  const count = (pick: (m: TemplateMeta) => [string, string][]) => {
    const map = new Map<string, [string, number]>();
    for (const m of list) for (const [k, label] of pick(m)) { const c = map.get(k); map.set(k, [label, (c?.[1] ?? 0) + 1]); }
    return [...map.entries()].map(([k, [label, n]]) => [k, label, n] as [string, string, number]).sort((a, b) => b[2] - a[2]);
  };
  return {
    format: count((m) => [[m.kind, m.formatLabel]]),
    style: count((m) => [[m.style, m.style]]),
    color: count((m) => m.colors.map((c) => [c, c[0].toUpperCase() + c.slice(1)])),
    occasion: count((m) => (m.occasion ? [[m.occasion, m.occasion.replace(/-/g, ' ').replace(/^./, (x) => x.toUpperCase())]] : [])),
  };
}

/** Templates like this one: same topic first, then same category and shared tags; never itself. */
export function related(all: TemplateMeta[], m: TemplateMeta, n = 8): TemplateMeta[] {
  const tags = new Set(m.words);
  return all.filter((x) => x.id !== m.id).map((x) => {
    let s = 0;
    if (x.sub && x.sub === m.sub) s += 6;
    if (x.category && x.category === m.category) s += 2;
    if (x.occasion && x.occasion === m.occasion) s += 2;
    if (x.style === m.style) s += 1;
    for (const w of x.words) if (tags.has(w)) s += 0.25;
    if (x.kind === m.kind) s += 0.5;
    return { x, s: s > 1 ? s + quality(x) * 0.5 : s };
  }).filter((r) => r.s > 1).sort((a, b) => b.s - a.s).slice(0, n).map((r) => r.x);
}
