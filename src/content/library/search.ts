/**
 * Template search: every query word must match (prefix match, small typos forgiven), results ranked by where
 * the words matched (name > topic > tags) and then by real usage. Filters are facets over the catalog metadata.
 */
import type { TemplateMeta } from './catalog';

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
  noel: ['christmas'], card: ['greeting'], cards: ['greeting'],
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

/** How well one query word matches a template (0 = not at all). */
function wordScore(q: string, m: TemplateMeta, nameWords: string[]): number {
  let best = 0;
  for (const w of m.words) {
    let s = 0;
    if (w === q) s = 3; else if (w.startsWith(q)) s = 2; else if (close(q, w) || (q.length >= 5 && close(q, w.slice(0, q.length)))) s = 1;
    if (s && nameWords.includes(w)) s += 2; // matches in the title count most
    if (s > best) best = s;
  }
  return best;
}

export function search(all: TemplateMeta[], query: string, f: Filters, usage?: Usage): TemplateMeta[] {
  const list = all.filter((m) => (!f.category || m.category === f.category) && (!f.sub || m.sub === f.sub) && (!f.format || m.format === f.format)
    && (!f.style || m.style === f.style) && (!f.use || m.use === f.use) && (!f.color || m.colors.includes(f.color)) && (!f.occasion || m.occasion === f.occasion) && (!f.free || m.cost === 0));
  const qWords = norm(query).split(' ').filter(Boolean);
  if (!qWords.length) return usage ? [...list].sort((a, b) => usage.uses(b.id) - usage.uses(a.id)) : list;
  const groups = qWords.map((w) => [w, ...(SYNONYMS[w] ?? [])]);
  const scored: { m: TemplateMeta; s: number }[] = [];
  for (const m of list) {
    const nameWords = norm(m.name).split(' ');
    let total = 0, ok = true;
    for (const g of groups) {
      const s = Math.max(...g.map((w) => wordScore(w, m, nameWords)));
      if (!s) { ok = false; break; }
      total += s;
    }
    if (!ok) continue;
    if (norm(m.name).includes(norm(query))) total += 3; // the whole phrase in the title
    scored.push({ m, s: total + Math.min(2, (usage?.uses(m.id) ?? 0) / 25) + (m.source === 'collection' ? 1.5 : 0) });
  }
  return scored.sort((a, b) => b.s - a.s).map((x) => x.m);
}

/** Values for each filter with how many templates have them (for the filter menus). */
export function facets(list: TemplateMeta[]): Record<'format' | 'style' | 'color' | 'occasion', [string, string, number][]> {
  const count = (pick: (m: TemplateMeta) => [string, string][]) => {
    const map = new Map<string, [string, number]>();
    for (const m of list) for (const [k, label] of pick(m)) { const c = map.get(k); map.set(k, [label, (c?.[1] ?? 0) + 1]); }
    return [...map.entries()].map(([k, [label, n]]) => [k, label, n] as [string, string, number]).sort((a, b) => b[2] - a[2]);
  };
  return {
    format: count((m) => [[m.format, m.formatLabel]]),
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
    return { x, s };
  }).filter((r) => r.s > 1).sort((a, b) => b.s - a.s).slice(0, n).map((r) => r.x);
}
