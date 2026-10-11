/**
 * Licensed photo search for the editor's Photos panel, through official APIs only.
 * - Pexels (https://www.pexels.com/api/) when PEXELS_API_KEY is set in Vercel: free to use, no attribution required
 *   (we still credit the photographer and link to Pexels, as their guidelines ask).
 * - Otherwise Openverse (https://api.openverse.org, no key): only CC0, public domain and CC BY images — all allow
 *   commercial use and changes; CC BY needs a credit, which the app stores with the photo and shows.
 * Searches are cached by the CDN for an hour to stay well inside the providers' rate limits.
 *
 * GET /api/assets?q=<words>&page=<n>  → { provider, providerUrl, items: Photo[], more }
 * GET /api/assets?img=<url>           → the image bytes (only from the providers' image hosts), so the editor can
 *                                       put it in a design (browsers block canvas use of images without CORS)
 */
const PER_PAGE = 20;
const MAX_IMAGE = 4_300_000; // Vercel functions can't answer with more than ~4.5 MB

/** Image hosts the proxy may fetch from (exact host or a subdomain of it). Anything else is refused. */
const HOSTS = ['images.pexels.com', 'api.openverse.org', 'staticflickr.com', 'upload.wikimedia.org', 'cdn.stocksnap.io'];
const allowedHost = (host: string) => HOSTS.some((h) => host === h || host.endsWith('.' + h));

export interface Photo {
  id: string; width: number; height: number;
  thumb: string;   // small preview (loaded directly by the browser)
  full: string;    // the picture to put in a design (fetched through ?img=)
  alt: string;
  credit: { by: string; byUrl?: string; source: string; sourceUrl?: string; license: string; licenseUrl?: string; required: boolean };
}

const reply = (data: unknown, status = 200, cache = 'no-store') =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', 'cache-control': cache } });
const CACHE = 'public, max-age=600, s-maxage=3600, stale-while-revalidate=86400';
const text = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const https = (v: unknown) => (typeof v === 'string' && /^https:\/\//.test(v) ? v : undefined);

// A small per-instance brake so one busy moment can't spend the whole Pexels quota (the CDN cache absorbs repeats).
let windowStart = 0, calls = 0;
function brake(): boolean {
  const now = Date.now();
  if (now - windowStart > 60_000) { windowStart = now; calls = 0; }
  return ++calls <= 60;
}

async function pexels(key: string, q: string, page: number) {
  const url = q ? `https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=${PER_PAGE}&page=${page}` : `https://api.pexels.com/v1/curated?per_page=${PER_PAGE}&page=${page}`;
  const r = await fetch(url, { headers: { authorization: key } });
  if (!r.ok) throw Object.assign(new Error(`pexels ${r.status}`), { status: r.status });
  const d = (await r.json()) as { photos?: Record<string, unknown>[]; next_page?: string };
  const items: Photo[] = (d.photos ?? []).map((p) => {
    const src = (p.src ?? {}) as Record<string, string>;
    return {
      id: `px-${p.id}`, width: Number(p.width) || 1, height: Number(p.height) || 1,
      thumb: src.medium ?? src.small, full: src.large2x ?? src.large, alt: text(p.alt),
      credit: { by: text(p.photographer, 80), byUrl: https(p.photographer_url), source: 'Pexels', sourceUrl: https(p.url), license: 'Pexels License', licenseUrl: 'https://www.pexels.com/license/', required: false },
    };
  }).filter((p) => p.thumb && p.full);
  return { provider: 'Pexels', providerUrl: 'https://www.pexels.com', items, more: !!d.next_page };
}

const LICENSE: Record<string, string> = { cc0: 'CC0 (public domain)', pdm: 'Public domain', by: 'CC BY' };
async function openverse(q: string, page: number) {
  const url = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(q)}&license=cc0,pdm,by&source=flickr,wikimedia,stocksnap&mature=false&page_size=${PER_PAGE}&page=${page}`;
  const r = await fetch(url, { headers: { 'user-agent': 'Fuzzies design app (template photos)' } });
  if (!r.ok) throw Object.assign(new Error(`openverse ${r.status}`), { status: r.status });
  const d = (await r.json()) as { results?: Record<string, unknown>[]; page_count?: number };
  const items: Photo[] = [];
  for (const p of d.results ?? []) {
    const full = https(p.url), thumb = https(p.thumbnail);
    if (!full || !thumb) continue;
    try { if (!allowedHost(new URL(full).hostname)) continue; } catch { continue; }
    const lic = text(p.license, 10);
    items.push({
      id: `ov-${text(p.id, 64)}`, width: Number(p.width) || 4, height: Number(p.height) || 3, thumb, full, alt: text(p.title, 120),
      credit: {
        by: text(p.creator, 80) || 'Unknown', byUrl: https(p.creator_url), source: text(p.source, 30) === 'wikimedia' ? 'Wikimedia Commons' : text(p.source, 30) === 'flickr' ? 'Flickr' : 'StockSnap',
        sourceUrl: https(p.foreign_landing_url), license: `${LICENSE[lic] ?? lic.toUpperCase()}${lic === 'by' && p.license_version ? ' ' + text(p.license_version, 8) : ''}`,
        licenseUrl: https(p.license_url), required: lic === 'by',
      },
    });
  }
  return { provider: 'Openverse', providerUrl: 'https://openverse.org', items, more: page < (d.page_count ?? 0) };
}

/** Fetch an image from an allowed host (redirects are followed only to allowed hosts), size- and type-checked. */
async function proxy(raw: string): Promise<Response> {
  let url: URL;
  try { url = new URL(raw); } catch { return reply({ error: 'Bad address.' }, 400); }
  for (let hop = 0; hop < 4; hop++) {
    if (url.protocol !== 'https:' || !allowedHost(url.hostname) || url.port) return reply({ error: 'That picture isn’t from a supported photo library.' }, 400);
    const r = await fetch(url, { redirect: 'manual', headers: { 'user-agent': 'Fuzzies design app (template photos)' } });
    if (r.status >= 300 && r.status < 400 && r.headers.get('location')) { url = new URL(r.headers.get('location')!, url); continue; }
    const type = (r.headers.get('content-type') ?? '').split(';')[0].trim();
    if (!r.ok || !/^image\/(jpeg|png|webp|gif)$/.test(type)) return reply({ error: 'That picture couldn’t be loaded.' }, 502);
    if (Number(r.headers.get('content-length') ?? 0) > MAX_IMAGE) return reply({ error: 'That picture is too big — try another one.' }, 413);
    const buf = await r.arrayBuffer();
    if (buf.byteLength > MAX_IMAGE) return reply({ error: 'That picture is too big — try another one.' }, 413);
    return new Response(buf, { headers: { 'content-type': type, 'cache-control': 'public, max-age=86400, s-maxage=604800', 'x-content-type-options': 'nosniff' } });
  }
  return reply({ error: 'That picture couldn’t be loaded.' }, 502);
}

export async function GET(req: Request): Promise<Response> {
  const p = new URL(req.url).searchParams;
  try {
    if (p.has('img')) return await proxy(p.get('img') ?? '');
    const q = text(p.get('q'), 100);
    const page = Math.min(50, Math.max(1, Number(p.get('page')) || 1));
    const key = process.env.PEXELS_API_KEY?.trim();
    if (!q && !key) return reply({ provider: 'none', items: [], more: false }, 200, CACHE); // the app shows its own free picks
    if (!brake()) return reply({ error: 'Lots of people are searching right now — try again in a minute.' }, 429);
    if (key) {
      try { return reply(await pexels(key, q, page), 200, CACHE); } catch (e) {
        console.error('pexels failed', (e as Error).message);
        if (!q) return reply({ provider: 'none', items: [], more: false });
      }
    }
    return reply(await openverse(q, page), 200, CACHE);
  } catch (e) {
    console.error('assets failed', (e as Error).message);
    const status = (e as { status?: number }).status;
    return reply({ error: status === 429 ? 'The photo library is busy — try again in a minute.' : 'Photo search isn’t available right now.' }, status === 429 ? 429 : 502);
  }
}
