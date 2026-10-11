/**
 * Lazy template previews for the gallery: a placeholder of the right shape appears at once; the picture is drawn
 * only when the card scrolls into view, a few per frame so scrolling stays smooth, and cached for the visit.
 * Library templates wait for their fonts first so titles are measured and drawn exactly.
 */
import { loadTemplateDoc, forgetBuiltDocs, type TemplateMeta } from '../content/library/catalog';
import { FONTS } from '../content/library/palettes';
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
    await Promise.race([Promise.all([...faces].map((k) => document.fonts.load(k).catch(() => []))), new Promise((r) => setTimeout(r, 3500))]);
    forgetBuiltDocs(); // anything built before the fonts arrived is rebuilt with real measurements
  })();
  return fontsReady;
}

async function draw(m: TemplateMeta, max: number): Promise<string> {
  const key = `${m.id}@${max}`;
  const hit = cache.get(key);
  if (hit) return hit;
  if (m.thumb) { cache.set(key, m.thumb); return m.thumb; }
  if (m.source === 'library') await waitFonts();
  const d = await loadTemplateDoc(m);
  await prepare(d, [d.pages[0]]);
  const s = max / Math.max(d.width, d.height);
  const c = pageCanvas(d, d.pages[0], s * Math.min(2, devicePixelRatio || 1));
  const url = await new Promise<string>((res) => c.toBlob((b) => res(b ? URL.createObjectURL(b) : c.toDataURL('image/jpeg', 0.82)), 'image/jpeg', 0.84));
  cache.set(key, url);
  return url;
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

