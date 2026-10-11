/**
 * Photos for the editor's Photos panel, from licensed libraries through their official APIs (see api/assets.ts):
 * - Search: Pexels (when the site has a Pexels key) or Openverse (CC0 / public domain / CC BY only).
 * - Browsing with no search words: Pexels' curated photos, or Unsplash-licensed picks from Lorem Picsum (no key).
 * Every photo carries its credit (photographer, source, licence). A picked photo is downloaded once, shrunk and stored
 * in the design like an upload — so it keeps working offline and exports cleanly — with its credit on the element.
 */
import { fileToImageData } from '../core/util';
import type { Credit } from './types';

export interface StockPhoto { id: string; width: number; height: number; thumb: string; full: string; alt: string; credit: Credit }
export interface PhotoPage { items: StockPhoto[]; more: boolean; provider: string; providerUrl?: string }

const PICSUM = 'https://picsum.photos';

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const d = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(d.error || `photos ${res.status}`);
  return d;
}

/** Lorem Picsum: Unsplash-licensed photos, free to use, no key (browse only — it has no search). */
async function picsum(page: number): Promise<PhotoPage> {
  const list = await getJson<{ id: string; author: string; width: number; height: number; url: string }[]>(`${PICSUM}/v2/list?page=${page}&limit=30`);
  if (!Array.isArray(list)) throw new Error('photos: bad list');
  return {
    provider: 'Unsplash', providerUrl: 'https://unsplash.com', more: list.length === 30,
    items: list.map((p) => {
      const id = encodeURIComponent(String(p.id)), w = Number(p.width) || 1, hh = Number(p.height) || 1, s = Math.min(1, 1600 / Math.max(w, hh));
      return {
        id: `ps-${p.id}`, width: w, height: hh, alt: p.author ? `Photo by ${p.author}` : 'Photo',
        thumb: `${PICSUM}/id/${id}/300/${Math.max(1, Math.round((300 * hh) / w))}.jpg`,
        full: `${PICSUM}/id/${id}/${Math.round(w * s)}/${Math.round(hh * s)}.jpg`,
        credit: { by: String(p.author ?? ''), source: 'Unsplash', sourceUrl: typeof p.url === 'string' && p.url.startsWith('https://') ? p.url : undefined, license: 'Unsplash License', licenseUrl: 'https://unsplash.com/license', required: false },
      };
    }),
  };
}

let searchWorks: boolean | null = null; // false when the site has no /api (e.g. a plain static preview)

/** One page of photos: a search (words) or the free browse list (no words). */
export async function findPhotos(q: string, page: number): Promise<PhotoPage> {
  q = q.trim();
  if (searchWorks !== false) {
    try {
      const d = await getJson<PhotoPage>(`./api/assets?${new URLSearchParams({ q, page: String(page) })}`);
      if (!Array.isArray(d.items)) throw new Error('photos: bad answer');
      searchWorks = true;
      if (d.provider !== 'none') return { ...d, items: d.items.map((p) => ({ ...p, full: `./api/assets?img=${encodeURIComponent(p.full)}` })) };
    } catch (e) {
      if (searchWorks) throw e; // search exists but failed this time: say so
      searchWorks = false;
    }
  }
  if (q) throw new Error('Photo search isn’t available on this copy of Fuzzies.');
  return picsum(page);
}

/** Can people search photos here? (null = not known yet) */
export const canSearch = () => searchWorks;

/** Download a photo for use in a design (at most 1600 px on its long side). */
export async function fetchPhoto(p: StockPhoto): Promise<{ src: string; w: number; h: number }> {
  const res = await fetch(p.full);
  if (!res.ok) {
    const d = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(d.error || `photo ${res.status}`);
  }
  return fileToImageData(await res.blob(), 1600);
}

/** "Photo by Ana on Pexels · Pexels License https://… · https://…" — the line people paste where they share a design. */
export const creditLine = (c: Credit): string =>
  [`Photo${c.by ? ` by ${c.by}` : ''} on ${c.source}`, [c.license, c.licenseUrl].filter(Boolean).join(' '), c.sourceUrl].filter(Boolean).join(' · ');
