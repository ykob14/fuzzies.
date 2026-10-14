/**
 * Share links: the whole design is packed into the link itself (compressed JSON after the #),
 * so there is no server and nothing is uploaded. Photos are shrunk to keep links short.
 */
import type { Design, Page } from '../editor/types';
import { migrateDesign } from '../editor/model';
import { loadImage } from './util';

interface Packed { v: 1; n: string; w: number; h: number; p: Page[]; a: Record<string, string> }

const b64url = (bytes: Uint8Array): string => {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const fromB64url = (s: string): Uint8Array => {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};

const canCompress = typeof CompressionStream === 'function' && typeof DecompressionStream === 'function';

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream, max = Infinity): Promise<Uint8Array> {
  if (max === Infinity) return new Uint8Array(await new Response(new Blob([bytes as BlobPart]).stream().pipeThrough(stream)).arrayBuffer());
  // read piece by piece and stop at `max`: a tiny link must not be able to unpack into gigabytes and freeze the tab
  const reader = new Blob([bytes as BlobPart]).stream().pipeThrough(stream).getReader();
  const parts: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) { void reader.cancel(); throw new Error('This link is too big to open.'); }
    parts.push(value);
  }
  const out = new Uint8Array(size);
  let at = 0;
  for (const p of parts) { out.set(p, at); at += p.byteLength; }
  return out;
}
/** Limits for opening a link: longer than any link we make (~400k), and what it may unpack to. */
const MAX_LINK = 600_000;
const MAX_UNPACKED = 20_000_000;

/** Shrink a photo for the link; keeps PNG only when the image has transparency. */
async function shrink(src: string, maxSide: number, quality: number): Promise<string> {
  try {
    const img = await loadImage(src);
    const s = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(img.naturalWidth * s));
    c.height = Math.max(1, Math.round(img.naturalHeight * s));
    const x = c.getContext('2d')!;
    x.drawImage(img, 0, 0, c.width, c.height);
    const px = x.getImageData(0, 0, c.width, c.height).data;
    let alpha = false;
    for (let i = 3; i < px.length; i += 4 * 37) if (px[i] < 250) { alpha = true; break; }
    return alpha ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', quality);
  } catch {
    return '';
  }
}

async function encode(p: Packed): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(p));
  return canCompress ? 'z' + b64url(await pipe(json, new CompressionStream('deflate-raw'))) : 'j' + b64url(json);
}

export const LINK_WARN = 60_000; // some chat apps cut very long links
const LINK_MAX = 400_000;

/** Build a link for a design. Tries smaller photos until it fits. */
export async function makeShareLink(d: Design): Promise<{ url: string; length: number }> {
  const used = new Set<string>();
  for (const pg of d.pages) {
    if (pg.bgAsset) used.add(pg.bgAsset);
    for (const el of pg.elements) if (el.type === 'image') used.add(el.asset);
  }
  const base = `${location.origin}${location.pathname}#/s/`;
  let url = '';
  for (const [side, q] of [[640, 0.7], [420, 0.6], [280, 0.5]] as const) {
    const a: Record<string, string> = {};
    for (const id of used) if (d.assets[id]) a[id] = await shrink(d.assets[id], side, q);
    url = base + await encode({ v: 1, n: d.name, w: d.width, h: d.height, p: d.pages, a });
    if (url.length <= LINK_WARN || used.size === 0) break;
  }
  if (url.length > LINK_MAX) throw new Error('This design has too many photos for a link — share it as an image or PDF instead.');
  return { url, length: url.length };
}

/** Turn the part after #/s/ back into a design (owner is filled in when someone remixes it). */
export async function readShareLink(data: string): Promise<Design> {
  if (data.length > MAX_LINK) throw new Error('This link is too big to open.');
  const kind = data[0];
  const bytes = fromB64url(data.slice(1));
  let json: Uint8Array;
  if (kind === 'z') {
    if (!canCompress) throw new Error('This browser is too old to open this link.');
    json = await pipe(bytes, new DecompressionStream('deflate-raw'), MAX_UNPACKED);
  } else if (kind === 'j') json = bytes;
  else throw new Error('This link looks broken.');
  const p = JSON.parse(new TextDecoder().decode(json)) as Packed;
  if (p.v !== 1 || !Array.isArray(p.p) || !p.w || !p.h) throw new Error('This link looks broken.');
  const now = Date.now();
  return migrateDesign({ id: 'shared', owner: '', name: p.n || 'Shared design', width: p.w, height: p.h, pages: p.p, assets: p.a ?? {}, createdAt: now, updatedAt: now });
}
