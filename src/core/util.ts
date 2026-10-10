/** Small shared helpers. */

export const uid = (prefix = ''): string =>
  prefix + Date.now().toString(36).slice(-5) + Math.random().toString(36).slice(2, 9);

export const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

export const deepClone = <T>(v: T): T => (typeof structuredClone === 'function' ? structuredClone(v) : JSON.parse(JSON.stringify(v)));

export const todayKey = (d = new Date()): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function debounce<A extends unknown[]>(fn: (...a: A) => void, ms: number): ((...a: A) => void) & { flush(): void } {
  let t: ReturnType<typeof setTimeout> | undefined;
  let last: A | undefined;
  const run = (...a: A) => {
    last = a;
    clearTimeout(t);
    t = setTimeout(() => { t = undefined; fn(...a); }, ms);
  };
  run.flush = () => {
    if (t !== undefined && last) { clearTimeout(t); t = undefined; fn(...last); }
  };
  return run;
}

export function timeAgo(ts: number): string {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 45) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d} d ago`;
  return new Date(ts).toLocaleDateString();
}

export function readFileAsDataURL(file: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = () => rej(r.error);
    r.readAsDataURL(file);
  });
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => res(img);
    img.onerror = () => rej(new Error('Could not load image'));
    img.src = src;
  });
}

/** Downscale big photos so projects stay light enough to save on a phone. */
export async function fileToImageData(file: Blob, maxSide = 2400): Promise<{ src: string; w: number; h: number }> {
  const raw = await readFileAsDataURL(file);
  const img = await loadImage(raw);
  const w0 = img.naturalWidth || 512, h0 = img.naturalHeight || 512;
  const isSvg = file.type === 'image/svg+xml';
  const s = Math.min(1, maxSide / Math.max(w0, h0));
  if (isSvg || (s === 1 && file.size < 1.5e6)) return { src: raw, w: w0, h: h0 };
  const c = document.createElement('canvas');
  c.width = Math.round(w0 * s); c.height = Math.round(h0 * s);
  c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
  const png = file.type === 'image/png' || file.type === 'image/webp' || file.type === 'image/gif';
  return { src: c.toDataURL(png ? 'image/png' : 'image/jpeg', 0.9), w: c.width, h: c.height };
}

export function downloadBlob(blob: Blob, name: string): void {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

export const safeName = (s: string): string => (s.trim() || 'design').replace(/[^\w\- ]+/g, '').replace(/\s+/g, '-').toLowerCase();

export const isTouch = (): boolean => matchMedia('(pointer: coarse)').matches;
