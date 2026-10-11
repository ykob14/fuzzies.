/**
 * Free photos for the editor's Photos panel: Unsplash-licensed pictures served by Lorem Picsum (picsum.photos,
 * no account or key needed, CORS-enabled). The list loads page by page; a picked photo is downloaded once,
 * shrunk to a sensible size and stored in the design like an upload, so it keeps working offline and exports cleanly.
 */
import { fileToImageData } from '../core/util';

export interface StockPhoto { id: string; author: string; width: number; height: number; url: string }

const API = 'https://picsum.photos';
const PAGE = 30;
let cache: StockPhoto[] = [];
let nextPage = 1;
let done = false;

/** The next page of photos (cached for this visit, so reopening the panel is instant). */
export async function loadPhotos(more = false): Promise<StockPhoto[]> {
  if (cache.length && !more) return cache;
  if (done) return cache;
  const res = await fetch(`${API}/v2/list?page=${nextPage}&limit=${PAGE}`);
  if (!res.ok) throw new Error(`photos ${res.status}`);
  const list = (await res.json()) as { id: string; author: string; width: number; height: number; url: string }[];
  if (!Array.isArray(list)) throw new Error('photos: bad list');
  if (list.length < PAGE) done = true;
  nextPage++;
  cache = [...cache, ...list.map((p) => ({ id: String(p.id), author: String(p.author ?? ''), width: Number(p.width) || 1, height: Number(p.height) || 1, url: String(p.url ?? '') }))];
  return cache;
}

/** A small preview of a photo, `w` px wide, keeping its shape. */
export const previewUrl = (p: StockPhoto, w = 300): string => `${API}/id/${encodeURIComponent(p.id)}/${w}/${Math.max(1, Math.round((w * p.height) / p.width))}.jpg`;

/** Download a photo for use in a design (at most 1600 px on its long side). */
export async function fetchPhoto(p: StockPhoto): Promise<{ src: string; w: number; h: number }> {
  const s = Math.min(1, 1600 / Math.max(p.width, p.height));
  const res = await fetch(`${API}/id/${encodeURIComponent(p.id)}/${Math.round(p.width * s)}/${Math.round(p.height * s)}.jpg`);
  if (!res.ok) throw new Error(`photo ${res.status}`);
  return fileToImageData(await res.blob(), 1600);
}
