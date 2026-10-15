/**
 * Lazy template previews for the gallery: a placeholder of the right shape appears at once; the picture is drawn
 * only when the card scrolls into view, a few per frame so scrolling stays smooth, and cached for the visit.
 * Library templates wait for their fonts first so titles are measured and drawn exactly.
 * Built-in previews are also kept in Cache Storage between visits, keyed by a hash of the page they show — a changed
 * template gets a new key, so a stale picture is never shown (old entries are pruned).
 */
import { loadTemplateDoc, forgetBuiltDocs, type TemplateMeta } from '../content/library/catalog';
import { FONTS } from '../content/library/palettes';
import { COLLECTION_FONTS, COLLECTION_TEXT } from '../content/library/collections';
import { pageCanvas, prepare } from '../editor/render';
import { h } from './dom';

const cache = new Map<string, string>(); // `${id}@${max}` → object URL
const queue: { m: TemplateMeta; max: number; img: HTMLImageElement; box: HTMLElement }[] = [];
let running = false;
let fontsReady: Promise<void> | null = null;

export function waitFonts(): Promise<void> {
  fontsReady ??= (async () => {
    if (!document.fonts) return;
    const faces = new Set<string>();
    for (const f of Object.values(FONTS)) { faces.add(`${f.displayWeight} 32px "${f.display}"`); for (const w of [400, 500, 600, 700, 800]) faces.add(`${w} 32px "${f.body}"`); if (f.script) faces.add(`400 32px "${f.script}"`); }
    for (const [fam, w] of COLLECTION_FONTS) faces.add(`${w} 32px "${fam}"`);
    const texts = COLLECTION_TEXT.map(([fam, w, t]) => document.fonts.load(`${w} 32px "${fam}"`, t).catch(() => []));
    await Promise.race([Promise.all([...[...faces].map((k) => document.fonts.load(k).catch(() => [])), ...texts]), new Promise((r) => setTimeout(r, 5000))]);
    forgetBuiltDocs(); // anything built before the fonts arrived is rebuilt with real measurements
  })();
  return fontsReady;
}

async function draw(m: TemplateMeta, max: number): Promise<string> {
  const key = `${m.id}@${max}`;
  const hit = cache.get(key);
  if (hit) return hit;
  if (m.thumb) { cache.set(key, m.thumb); return m.thumb; }
  if (m.source === 'library' || m.source === 'collection') await waitFonts();
  const d = await loadTemplateDoc(m);
  const dpr = Math.min(2, devicePixelRatio || 1);
  const stored = m.source !== 'published' ? `/__fz-preview/${encodeURIComponent(m.id)}/${max}x${dpr}/${hash(JSON.stringify(d.pages[0], (k, v) => (k === 'id' ? undefined : v)))}` : '';
  const saved = stored ? await fromStore(stored) : null;
  if (saved) { const url = URL.createObjectURL(saved); cache.set(key, url); return url; }
  await prepare(d, [d.pages[0]]);
  const s = max / Math.max(d.width, d.height);
  const c = pageCanvas(d, d.pages[0], s * dpr);
  const blob = await new Promise<Blob | null>((res) => c.toBlob(res, 'image/jpeg', 0.84));
  const url = blob ? URL.createObjectURL(blob) : c.toDataURL('image/jpeg', 0.82);
  if (blob && stored) void toStore(stored, blob);
  cache.set(key, url);
  return url;
}

// ---------- previews kept between visits (Cache Storage; silently skipped where unavailable) ----------
const STORE = 'fz-template-previews-v2', KEEP = 900;
// previews made with the old photo placeholders: drop them once
try { void caches?.delete('fz-template-previews-v1').catch(() => {}); } catch { /* no Cache Storage */ }
function hash(s: string): string { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
async function fromStore(url: string): Promise<Blob | null> {
  try { const r = await (await caches.open(STORE)).match(url); return r ? await r.blob() : null; } catch { return null; }
}
let writes = 0;
async function toStore(url: string, blob: Blob): Promise<void> {
  try {
    const c = await caches.open(STORE);
    await c.put(url, new Response(blob, { headers: { 'content-type': 'image/jpeg' } }));
    if (++writes % 50 === 0) { const keys = await c.keys(); for (const k of keys.slice(0, Math.max(0, keys.length - KEEP))) await c.delete(k); }
  } catch { /* private mode, quota or no Cache Storage: the preview still works for this visit */ }
}

async function pump(): Promise<void> {
  if (running) return;
  running = true;
  try {
    while (queue.length) {
      const job = queue.shift()!;
      if (!job.box.isConnected) continue;
      try {
        job.img.src = await draw(job.m, job.max);
        job.img.onload = () => job.box.classList.add('ready');
      } catch (e) { console.warn('preview failed', job.m.id, e); job.box.classList.add('failed'); }
      await new Promise((r) => requestAnimationFrame(r)); // one picture per frame keeps scrolling smooth
    }
  } finally { running = false; }
}

const io = typeof IntersectionObserver === 'function' ? new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    io!.unobserve(e.target);
    const job = pending.get(e.target as HTMLElement);
    if (job) { pending.delete(e.target as HTMLElement); queue.push(job); }
  }
  void pump();
}, { rootMargin: '300px 0px' }) : null;
const pending = new Map<HTMLElement, (typeof queue)[number]>();

/**
 * A preview box for a template (`max` = longest side in CSS px). It keeps the template's shape inside a frame
 * whose width/height ratio is `frame` (wide designs fill the width, tall ones the height).
 */
export function lazyThumb(m: TemplateMeta, max = 320, frame = 0.86): HTMLElement {
  const img = h('img', { alt: m.name, decoding: 'async', draggable: 'false' });
  const box = h('div', { class: `lt ${m.width / m.height >= frame ? 'wide' : 'tall'}`, style: `aspect-ratio:${m.width}/${m.height}` }, img);
  const key = `${m.id}@${max}`;
  const hit = cache.get(key);
  if (hit) { img.src = hit; box.classList.add('ready'); return box; }
  const job = { m, max, img, box };
  if (io) { pending.set(box, job); io.observe(box); } else { queue.push(job); void pump(); }
  return box;
}

