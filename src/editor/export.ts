/** Downloads and sharing: PNG, JPG, multi-page PDF and the .fuzzies project file. */
import type { Design } from './types';
import { DOC_VERSION, migrateDesign } from './model';
import { pageCanvas, prepare } from './render';
import { downloadBlob, safeName } from '../core/util';

export type ExportFormat = 'png' | 'jpg' | 'pdf' | 'fuzzies';

const toBlob = (c: HTMLCanvasElement, type: string, q?: number) =>
  new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Export failed'))), type, q));

/** Keep exports under ~36 megapixels so phones don't run out of memory. */
function safeScale(d: Design, scale: number): number {
  const max = 36e6;
  return Math.min(scale, Math.sqrt(max / (d.width * d.height)));
}

export async function exportFiles(d: Design, fmt: ExportFormat, opts: { scale?: number; pages?: number[]; transparent?: boolean } = {}): Promise<File[]> {
  const base = safeName(d.name);
  if (fmt === 'fuzzies') {
    const json = JSON.stringify({ app: 'fuzzies', version: DOC_VERSION, design: { ...d, thumb: undefined } });
    return [new File([json], `${base}.fuzzies`, { type: 'application/json' })];
  }
  const idx = opts.pages?.length ? opts.pages : d.pages.map((_, i) => i);
  const pages = idx.map((i) => d.pages[i]);
  await prepare(d, pages);
  if (fmt === 'pdf') return [new File([await buildPdf(d, idx, safeScale(d, opts.scale ?? 2))], `${base}.pdf`, { type: 'application/pdf' })];
  const scale = safeScale(d, opts.scale ?? 1);
  const files: File[] = [];
  for (const [n, i] of idx.entries()) {
    const c = pageCanvas(d, d.pages[i], scale, fmt === 'png' && opts.transparent);
    const blob = fmt === 'png' ? await toBlob(c, 'image/png') : await toBlob(c, 'image/jpeg', 0.92);
    const suffix = idx.length > 1 ? `-${n + 1}` : '';
    files.push(new File([blob], `${base}${suffix}.${fmt}`, { type: blob.type }));
  }
  return files;
}

export function canShareFiles(files: File[]): boolean {
  return typeof navigator.share === 'function' && typeof navigator.canShare === 'function' && navigator.canShare({ files });
}

/** Share through the phone's share sheet (Save to Photos, Messages, WhatsApp…); fall back to download. */
export async function shareOrDownload(files: File[], title: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
  if (canShareFiles(files)) {
    try {
      await navigator.share({ files, title, text: `${title} — made with Fuzzies` });
      return 'shared';
    } catch (e) {
      if ((e as DOMException).name === 'AbortError') return 'cancelled';
    }
  }
  download(files);
  return 'downloaded';
}

export function download(files: File[]): void {
  files.forEach((f, i) => setTimeout(() => downloadBlob(f, f.name), i * 350));
}

export async function copyImage(d: Design, pageIndex: number): Promise<void> {
  await prepare(d, [d.pages[pageIndex]]);
  const c = pageCanvas(d, d.pages[pageIndex], safeScale(d, 1));
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': toBlob(c, 'image/png') })]);
}

export async function readProjectFile(file: File): Promise<Design> {
  const data = JSON.parse(await file.text());
  const d = data?.design as Design | undefined;
  if (data?.app !== 'fuzzies' || !d || !Array.isArray(d.pages) || !d.width || !d.height) throw new Error('This is not a Fuzzies project file.');
  return migrateDesign(d);
}

// ---------- minimal PDF writer: one full-bleed JPEG per page ----------
async function buildPdf(d: Design, idx: number[], scale: number): Promise<Blob> {
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  const offsets: number[] = [];
  let pos = 0;
  const push = (b: Uint8Array | string) => { const u = typeof b === 'string' ? enc.encode(b) : b; parts.push(u); pos += u.length; };
  const ptW = (d.width * 72) / 96, ptH = (d.height * 72) / 96;
  const nPages = idx.length;
  // objects: 1 catalog, 2 pages, then per page: page, content, image
  const pageObj = (i: number) => 3 + i * 3;
  push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  const obj = (n: number, body: string | (() => void)) => {
    offsets[n] = pos;
    push(`${n} 0 obj\n`);
    if (typeof body === 'string') push(body); else body();
    push('\nendobj\n');
  };
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
  obj(2, `<< /Type /Pages /Kids [${idx.map((_, i) => `${pageObj(i)} 0 R`).join(' ')}] /Count ${nPages} >>`);
  for (const [i, pi] of idx.entries()) {
    const c = pageCanvas(d, d.pages[pi], scale);
    const jpg = new Uint8Array(await (await toBlob(c, 'image/jpeg', 0.92)).arrayBuffer());
    const p = pageObj(i);
    obj(p, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${ptW.toFixed(2)} ${ptH.toFixed(2)}] /Resources << /XObject << /Im0 ${p + 2} 0 R >> >> /Contents ${p + 1} 0 R >>`);
    const content = `q ${ptW.toFixed(2)} 0 0 ${ptH.toFixed(2)} 0 0 cm /Im0 Do Q`;
    obj(p + 1, `<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
    obj(p + 2, () => {
      push(`<< /Type /XObject /Subtype /Image /Width ${c.width} /Height ${c.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>\nstream\n`);
      push(jpg);
      push('\nendstream');
    });
  }
  const total = 3 + nPages * 3;
  const xref = pos;
  let x = `xref\n0 ${total}\n0000000000 65535 f \n`;
  for (let i = 1; i < total; i++) x += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  push(x + `trailer\n<< /Size ${total} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
  return new Blob(parts as BlobPart[], { type: 'application/pdf' });
}
