/**
 * Download options shared by the top bar's Download panel and the Share dialog — one set of choices everywhere:
 * file type, size (PNG/JPG) or quality (PDF), transparent background (PNG) and which pages.
 * The last file type, size and transparency are remembered on this device (`fz.ed.export`).
 */
import type { Editor } from './editor';
import { exportFiles, download, type ExportFormat } from './export';
import { rewards } from '../core/rewards';
import { h, btn, icon, toast, type IconName } from '../ui/dom';
import { knownRights } from '../content/library/admin';
import { photoCredits, showCredits } from './preview';

export const FORMATS: { id: ExportFormat; label: string; sub: string; icon: IconName }[] = [
  { id: 'png', label: 'PNG', sub: 'Best quality image', icon: 'image' },
  { id: 'jpg', label: 'JPG', sub: 'Small image file', icon: 'image' },
  { id: 'pdf', label: 'PDF', sub: 'Print & documents', icon: 'file' },
  { id: 'fuzzies', label: 'Project', sub: 'Editable .fuzzies file', icon: 'folder' },
];
const SIZES = [0.5, 1, 2, 3];
const PDF_QUALITY: [number, string][] = [[2, 'Standard'], [3, 'Print · sharper']];

export interface ExportChoice { fmt: ExportFormat; scale: number; pdfScale: number; transparent: boolean; pages: 'all' | 'current' | number[] }

const KEY = 'fz.ed.export';
function remembered(): Omit<ExportChoice, 'pages'> {
  const base = { fmt: 'png' as ExportFormat, scale: 2, pdfScale: 2, transparent: false };
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    return {
      fmt: FORMATS.some((f) => f.id === v.fmt) ? v.fmt : base.fmt,
      scale: SIZES.includes(v.scale) ? v.scale : base.scale,
      pdfScale: PDF_QUALITY.some(([s]) => s === v.pdfScale) ? v.pdfScale : base.pdfScale,
      transparent: v.transparent === true,
    };
  } catch { return base; }
}
function remember(c: ExportChoice): void {
  try { localStorage.setItem(KEY, JSON.stringify({ fmt: c.fmt, scale: c.scale, pdfScale: c.pdfScale, transparent: c.transparent })); } catch { /* private mode */ }
}

/** The page numbers (0-based) a choice means, or undefined for every page. */
export function chosenPages(ed: Editor, c: ExportChoice): number[] | undefined {
  if (c.pages === 'all' || ed.design.pages.length < 2) return undefined;
  if (c.pages === 'current') return [ed.pageIndex];
  const valid = c.pages.filter((i) => i >= 0 && i < ed.design.pages.length).sort((a, b) => a - b);
  return valid.length ? valid : [ed.pageIndex];
}

export function newChoice(ed: Editor): ExportChoice {
  return { ...remembered(), pages: ed.design.pages.length > 1 ? 'all' : 'current' };
}

/** Run an export with these choices and download the files. Returns false if it failed (a message is shown). */
export async function runExport(ed: Editor, c: ExportChoice): Promise<boolean> {
  ed.finishTextEdit();
  ed.save.flush();
  remember(c);
  try {
    const scale = c.fmt === 'pdf' ? c.pdfScale : c.fmt === 'fuzzies' ? undefined : c.scale;
    const files = await exportFiles(ed.design, c.fmt, { scale, transparent: c.fmt === 'png' && c.transparent, pages: c.fmt === 'fuzzies' ? undefined : chosenPages(ed, c) });
    download(files);
    if (c.fmt !== 'fuzzies') rewards.exported();
    return true;
  } catch (e) {
    console.error(e);
    toast('Could not export this design — please try again.', 'bad');
    return false;
  }
}

/** The option controls for a choice (redraws itself when something changes). */
export function exportOptions(ed: Editor, c: ExportChoice, onChange: () => void = () => {}): HTMLElement {
  const d = ed.design;
  const el = h('div', { class: 'share-opts dl-opts' });
  const change = () => { remember(c); draw(); onChange(); };
  const seg = (items: [string, boolean, () => void][], label: string) => h('div', { class: 'seg', role: 'group', 'aria-label': label }, ...items.map(([text, on, pick]) => {
    const b = h('button', { type: 'button', class: on ? 'on' : '', 'aria-pressed': String(on) }, text);
    b.addEventListener('click', () => { pick(); change(); });
    return b;
  }));
  const check = (label: string, on: boolean, set: (v: boolean) => void, cls = '', redraw = true) => {
    const i = h('input', { type: 'checkbox', checked: on });
    i.addEventListener('change', () => { set(i.checked); if (redraw) change(); else onChange(); });
    return h('label', { class: `check ${cls}` }, i, label);
  };
  function draw(): void {
    const n = d.pages.length;
    const pickPages = Array.isArray(c.pages);
    el.replaceChildren(...[
      h('div', { class: 'pnl-label' }, 'File type'),
      h('div', { class: 'fmt-grid' }, ...FORMATS.map((f) => {
        const b = h('button', { type: 'button', class: `fmt ${c.fmt === f.id ? 'on' : ''}`, 'data-fmt': f.id, 'aria-pressed': String(c.fmt === f.id) }, icon(f.icon, 18), h('b', null, f.label), h('small', null, f.sub));
        b.addEventListener('click', () => { c.fmt = f.id; change(); });
        return b;
      })),
      c.fmt === 'png' || c.fmt === 'jpg' ? h('div', { class: 'dl-size' }, h('div', { class: 'pnl-label' }, 'Size'),
        seg(SIZES.map((s) => [`${s}× · ${Math.round(d.width * s)} × ${Math.round(d.height * s)}`, c.scale === s, () => (c.scale = s)]), 'Size')) : null,
      c.fmt === 'pdf' ? h('div', { class: 'dl-size' }, h('div', { class: 'pnl-label' }, 'Quality'),
        seg(PDF_QUALITY.map(([s, label]) => [label, c.pdfScale === s, () => (c.pdfScale = s)]), 'PDF quality')) : null,
      c.fmt === 'png' ? check('Transparent background', c.transparent, (v) => (c.transparent = v), 'dl-transparent') : null,
      n > 1 && c.fmt !== 'fuzzies' ? h('div', { class: 'dl-pages' }, h('div', { class: 'pnl-label' }, 'Pages'),
        seg([[`All ${n} pages`, c.pages === 'all', () => (c.pages = 'all')], [`This page (${ed.pageIndex + 1})`, c.pages === 'current', () => (c.pages = 'current')],
          ['Choose…', pickPages, () => (c.pages = pickPages ? c.pages : [ed.pageIndex])]], 'Pages'),
        pickPages ? h('div', { class: 'dl-page-list' }, ...d.pages.map((_, i) => check(`Page ${i + 1}`, (c.pages as number[]).includes(i), (v) => {
          const set = new Set(c.pages as number[]);
          if (v) set.add(i); else set.delete(i);
          c.pages = [...set].sort((a, b) => a - b);
        }, '', false))) : null) : null,
      c.fmt === 'pdf' || (n > 1 && c.fmt !== 'fuzzies' && (chosenPages(ed, c)?.length ?? n) > 1) ? h('p', { class: 'hint dl-note' },
        c.fmt === 'pdf' ? 'One PDF with every chosen page.' : `Each page downloads as its own ${c.fmt.toUpperCase()} file.`) : null,
    ].filter((x) => !!x) as HTMLElement[]);
  }
  draw();
  return el;
}

/** The top bar's Download panel: a drop-down under the button on computers, a bottom sheet on phones. */
export function openDownload(ed: Editor, anchor: HTMLElement): void {
  const open = document.querySelector<HTMLElement>('.dl-panel');
  if (open) { open.dispatchEvent(new Event('dl-close')); return; } // the button toggles
  ed.finishTextEdit();
  const c = newChoice(ed);
  const go = btn('Download', { kind: 'primary', icon: 'download', class: 'btn-block dl-go', onClick: async () => {
    go.disabled = true; go.classList.add('loading');
    const ok = await runExport(ed, c);
    go.disabled = false; go.classList.remove('loading');
    if (ok) { toast('Downloaded!', 'good'); close(); }
  } });
  const label = () => {
    const pages = c.fmt === 'fuzzies' ? undefined : chosenPages(ed, c);
    const n = pages?.length ?? ed.design.pages.length;
    const none = c.fmt !== 'fuzzies' && Array.isArray(c.pages) && !c.pages.length && ed.design.pages.length > 1;
    go.disabled = none;
    go.lastElementChild!.textContent = none ? 'Choose at least one page' : c.fmt === 'fuzzies' ? 'Download project' : `Download ${c.fmt.toUpperCase()}${n > 1 && c.fmt !== 'pdf' ? ` · ${n} files` : ''}`;
  };
  const credits = photoCredits(ed.design);
  const extras = h('div', { class: 'dl-extras' },
    credits.length ? h('button', { class: 'link', type: 'button', onclick: () => { close(); showCredits(credits); } }, icon('heart', 14), `Photo credits (${credits.length})`) : null,
    knownRights().admin ? h('button', { class: 'link', type: 'button', onclick: () => { close(); void import('./publish').then((m) => m.publishDialog(ed)); } }, icon('upload', 14), ed.design.template?.startsWith('pub-') ? 'Update template…' : 'Publish as template…') : null);
  const panel = h('div', { class: 'dl-panel', role: 'dialog', 'aria-label': 'Download' },
    h('div', { class: 'dl-head' }, h('div', { class: 'sheet-grip' }), h('b', null, 'Download'),
      btn(null, { icon: 'close', kind: 'plain', size: 'sm', title: 'Close (Esc)', onClick: () => close() })),
    exportOptions(ed, c, label), go, extras.childElementCount ? extras : null);
  const scrim = h('div', { class: 'dl-scrim' });
  label();
  const phone = innerWidth < 760;
  panel.classList.toggle('sheet', phone);
  document.body.append(...(phone ? [scrim] : []), panel);
  const place = () => {
    if (phone) return;
    const r = anchor.getBoundingClientRect();
    const w = panel.offsetWidth;
    panel.style.left = `${Math.max(8, Math.min(r.right - w, innerWidth - w - 8))}px`;
    panel.style.top = `${r.bottom + 8}px`;
    panel.style.maxHeight = `${innerHeight - r.bottom - 20}px`;
  };
  place();
  anchor.setAttribute('aria-expanded', 'true');
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); } };
  const off = (e: Event) => { const t = e.target as Node; if (!panel.contains(t) && !anchor.contains(t)) close(); };
  function close(): void {
    if (!panel.isConnected) return;
    panel.remove(); scrim.remove();
    anchor.setAttribute('aria-expanded', 'false');
    removeEventListener('keydown', onKey, true); removeEventListener('pointerdown', off, true); removeEventListener('resize', place); removeEventListener('hashchange', close);
    anchor.focus({ preventScroll: true });
  }
  panel.addEventListener('dl-close', close);
  addEventListener('keydown', onKey, true);
  addEventListener('resize', place);
  addEventListener('hashchange', close);
  setTimeout(() => addEventListener('pointerdown', off, true));
  requestAnimationFrame(() => { panel.classList.add('in'); panel.querySelector<HTMLElement>('.fmt.on')?.focus({ preventScroll: true }); });
}
