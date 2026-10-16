/**
 * Lazy template previews for the gallery, Home and the editor's Templates panel: a placeholder of the right shape
 * appears at once; the picture is drawn when the card comes near the screen — cards on screen first — several per
 * frame within a small time budget so scrolling stays smooth, at the size the card is shown, and cached for the visit.
 * A library template only waits for ITS fonts (not the whole library's) so titles are measured and drawn exactly.
 * Built-in previews are also kept in Cache Storage between visits, keyed by a hash of the page they show — a changed
 * template gets a new key, so a stale picture is never shown (old entries are pruned).
 */
import { loadTemplateDoc, forgetBuiltDoc, forgetBuiltDocs, type TemplateMeta } from '../content/library/catalog';
import { FONTS } from '../content/library/palettes';
import { COLLECTION_FONTS, COLLECTION_TEXT } from '../content/library/collections';
import { fontString, pageCanvas, prepare } from '../editor/render';
import type { Design } from '../editor/types';
import { h } from './dom';

const cache = new Map<string, string>(); // `${id}@${size}` → object URL
const best = new Map<string, { size: number; url: string }>(); // the largest picture drawn so far per template
interface Job { m: TemplateMeta; max: number; img: HTMLImageElement | null; box: HTMLElement | null; near: boolean }
const queue: Job[] = [];
let fontsReady: Promise<void> | null = null;

/**
 * Fonts before a template is laid out. With a template: just ITS fonts (by family, weight and the words it sets), up to
 * 15 s — opening a template in the editor uses this so a slow phone never lays it out in a stand-in font. Without one:
 * every library font (up to 12 s).
 */
export function waitFonts(m?: TemplateMeta): Promise<void> {
  if (m) return (m.source === 'library' || m.source === 'collection') ? docWithFonts(m, 15000).then(() => {}) : Promise.resolve();
  fontsReady ??= (async () => {
    if (!document.fonts) return;
    const faces = new Set<string>();
    for (const f of Object.values(FONTS)) { faces.add(`${f.displayWeight} 32px "${f.display}"`); for (const w of [400, 500, 600, 700, 800]) faces.add(`${w} 32px "${f.body}"`); if (f.script) faces.add(`400 32px "${f.script}"`); }
    for (const [fam, w] of COLLECTION_FONTS) faces.add(`${w} 32px "${fam}"`);
    const texts = COLLECTION_TEXT.map(([fam, w, t]) => document.fonts.load(`${w} 32px "${fam}"`, t).catch(() => []));
    await Promise.race([Promise.all([...[...faces].map((k) => document.fonts.load(k).catch(() => [])), ...texts]), new Promise((r) => setTimeout(r, 12000))]);
    forgetBuiltDocs(); // anything built before the fonts arrived is rebuilt with real measurements
  })();
  return fontsReady;
}

// ---------- just the fonts one template needs ----------
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
let fontEpoch = 0; // goes up whenever a font finishes loading: a document laid out before that may be measured wrong
try { document.fonts?.addEventListener('loadingdone', () => { fontEpoch++; }); } catch { /* no FontFaceSet */ }
const builtAt = new WeakMap<Design, number>();
const fontLoads = new Map<string, Promise<unknown>>();
function loadFont(font: string, text: string): Promise<unknown> {
  const k = `${font}|${text}`;
  let p = fontLoads.get(k);
  if (!p) { p = document.fonts.load(font, text).catch(() => []); fontLoads.set(k, p); }
  return p;
}
/** Previews whose fonts hadn't arrived when they were drawn (a stand-in font): redrawn once those fonts load. */
const late = new Map<string, Promise<unknown>>();
const redrawn = new Set<string>(); // once each
async function docWithFonts(m: TemplateMeta, cap = 3000): Promise<Design> {
  let d = await loadTemplateDoc(m);
  if ((m.source !== 'library' && m.source !== 'collection') || !document.fonts) return d;
  if (!builtAt.has(d)) builtAt.set(d, fontEpoch);
  const need = new Map<string, string>();
  for (const p of d.pages) for (const el of p.elements) if (el.type === 'text') { const f = fontString(el, 32); need.set(f, (need.get(f) ?? '') + el.text); }
  const missing = [...need].filter(([f, t]) => { try { return !document.fonts.check(f, t); } catch { return false; } });
  if (!missing.length && builtAt.get(d) === fontEpoch) return d;
  if (missing.length) {
    const all = Promise.all(missing.map(([f, t]) => loadFont(f, t)));
    await Promise.race([all, wait(cap)]);
    // still not here (slow connection): draw now with a stand-in, and again once they arrive (at most 30 s more)
    if (missing.some(([f, t]) => { try { return !document.fonts.check(f, t); } catch { return false; } })) late.set(m.id, Promise.race([all, wait(30000)]));
    else late.delete(m.id);
  }
  forgetBuiltDoc(m.id); // lay it out again now that its fonts are here
  d = await loadTemplateDoc(m);
  builtAt.set(d, fontEpoch);
  return d;
}

// ---------- a time budget per frame ----------
let budgetEnd = 0;
let frame: Promise<void> | null = null;
const nextFrame = () => (frame ??= new Promise<void>((r) => requestAnimationFrame(() => { frame = null; budgetEnd = performance.now() + 14; r(); })));
async function slot(): Promise<void> {
  while (performance.now() > budgetEnd) await nextFrame();
}

async function draw(m: TemplateMeta, max: number): Promise<string> {
  const key = `${m.id}@${max}`;
  const hit = cache.get(key);
  if (hit) return hit;
  if (m.thumb) { cache.set(key, m.thumb); return m.thumb; }
  const d = await docWithFonts(m);
  const provisional = late.has(m.id);
  const dpr = Math.min(2, devicePixelRatio || 1);
  const stored = m.source !== 'published' ? `/__fz-preview/${encodeURIComponent(m.id)}/${max}x${dpr}/${hash(JSON.stringify(d.pages[0], (k, v) => (k === 'id' ? undefined : v)))}` : '';
  const saved = stored && !provisional ? await fromStore(stored) : null;
  if (saved) { const url = URL.createObjectURL(saved); cache.set(key, url); return url; }
  // a picture or font that never answers must not keep the preview grey forever (it draws without it)
  await Promise.race([prepare(d, [d.pages[0]]), wait(6000)]);
  await slot(); // painting is the expensive part: a few per frame
  const s = max / Math.max(d.width, d.height);
  const c = pageCanvas(d, d.pages[0], s * dpr);
  const blob = await new Promise<Blob | null>((res) => c.toBlob(res, 'image/jpeg', 0.84));
  const url = blob ? URL.createObjectURL(blob) : c.toDataURL('image/jpeg', 0.82);
  if (provisional) return url; // drawn in a stand-in font: not kept, drawn again when the fonts arrive
  if (blob && stored) void toStore(stored, blob);
  cache.set(key, url);
  return url;
}
async function drawBest(m: TemplateMeta, size: number): Promise<string> {
  const b = best.get(m.id);
  if (b && b.size >= size) return b.url;
  const url = await draw(m, size);
  if (!late.has(m.id) && (!best.has(m.id) || best.get(m.id)!.size < size)) best.set(m.id, { size, url });
  return url;
}

// ---------- previews kept between visits (Cache Storage; silently skipped where unavailable) ----------
const STORE = 'fz-template-previews-v2', KEEP = 900;
// previews made with the old photo placeholders: drop them once
try { void caches?.delete('fz-template-previews-v1').catch(() => {}); } catch { /* no Cache Storage */ }
function hash(s: string): string { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
let store: Promise<Cache | null> | null = null;
const openStore = () => (store ??= (async () => { try { return await caches.open(STORE); } catch { return null; } })());
async function fromStore(url: string): Promise<Blob | null> {
  try { const r = await (await openStore())?.match(url); return r ? await r.blob() : null; } catch { return null; }
}
let writes = 0;
async function toStore(url: string, blob: Blob): Promise<void> {
  try {
    const c = await openStore();
    if (!c) return;
    await c.put(url, new Response(blob, { headers: { 'content-type': 'image/jpeg' } }));
    if (++writes % 50 === 0) { const keys = await c.keys(); for (const k of keys.slice(0, Math.max(0, keys.length - KEEP))) await c.delete(k); }
  } catch { /* private mode, quota or no Cache Storage: the preview still works for this visit */ }
}

// ---------- the queue: on-screen cards first, a few at a time ----------
const ACTIVE = 4;
let active = 0;
const onScreen = (el: Element) => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth && r.width > 0; };
function take(): Job | undefined {
  for (let i = queue.length - 1; i >= 0; i--) if (queue[i].box && !queue[i].box!.isConnected) queue.splice(i, 1);
  let i = queue.findIndex((j) => j.near && j.box && onScreen(j.box));
  if (i < 0) i = 0;
  return queue.splice(i, 1)[0];
}
/** Draw at the size the card really shows (in 40 px steps so the cache stays useful), never above `max`. */
function sizeFor(job: Job): number {
  const r = job.box?.parentElement?.getBoundingClientRect();
  const want = r && r.width > 0 ? Math.max(r.width, r.height) : job.max;
  return Math.min(job.max, Math.max(120, Math.ceil(want / 40) * 40));
}
function pump(): void {
  while (active < ACTIVE && queue.length) {
    const job = take();
    if (!job) break;
    active++;
    let freed = false;
    const free = () => { if (!freed) { freed = true; active--; pump(); } };
    const stuck = setTimeout(free, 15000); // a slow one gives its place to the next card (and still shows when it's done)
    void (async () => {
      try {
        const size = sizeFor(job);
        const url = await drawBest(job.m, size);
        if (job.box?.isConnected && job.img) {
          const box = job.box;
          job.img.onload = () => box.classList.add('ready');
          job.img.src = url;
          const wait4 = late.get(job.m.id);
          if (wait4 && !redrawn.has(job.m.id)) { redrawn.add(job.m.id); void wait4.then(() => { if (late.get(job.m.id) === wait4) late.delete(job.m.id); if (box.isConnected) { queue.push(job); pump(); } }); }
        }
      } catch (e) { console.warn('preview failed', job.m.id, e); job.box?.classList.add('failed'); }
      finally { clearTimeout(stuck); free(); }
    })();
  }
}

const pending = new Map<HTMLElement, Job>();
const io = typeof IntersectionObserver === 'function' ? new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    io!.unobserve(e.target);
    const job = pending.get(e.target as HTMLElement);
    if (job) { pending.delete(e.target as HTMLElement); job.near = true; queue.push(job); }
  }
  pump();
}, { rootMargin: '400px 200px' }) : null;

/**
 * A preview box for a template (`max` = longest side in CSS px). It keeps the template's shape inside a frame
 * whose width/height ratio is `frame` (wide designs fill the width, tall ones the height).
 */
export function lazyThumb(m: TemplateMeta, max = 320, frame = 0.86): HTMLElement {
  const img = h('img', { alt: m.name, decoding: 'async', draggable: 'false' });
  const box = h('div', { class: `lt ${m.width / m.height >= frame ? 'wide' : 'tall'}`, style: `aspect-ratio:${m.width}/${m.height}` }, img);
  // already drawn big enough this visit (a big preview needs a big picture; a card is happy with ~160 px)
  const b = best.get(m.id);
  if (b && b.size >= (max >= 400 ? max * 0.9 : Math.min(max, 160))) { img.src = b.url; box.classList.add('ready'); return box; }
  const job: Job = { m, max, img, box, near: false };
  if (io) { pending.set(box, job); io.observe(box); } else { queue.push(job); pump(); }
  return box;
}

/** Queue the first previews before their cards are laid out (Home's and the gallery's first row): their fonts, art and
 * documents start loading straight away; cards on screen still go first. */
export function prefetch(list: TemplateMeta[], size = 200): void {
  for (const m of list.slice(0, 8)) if (!best.has(m.id)) queue.push({ m, max: size, img: null, box: null, near: false });
  pump();
}
