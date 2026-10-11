/** Full-screen preview of a design (every page, as it will export) and the quick Download menu in the editor's top bar. */
import type { Editor } from './editor';
import { pageCanvas, prepare } from './render';
import { exportFiles, download, type ExportFormat } from './export';
import { rewards } from '../core/rewards';
import { h, btn, icon, modal, popMenu, toast } from '../ui/dom';
import { creditLine } from './photos';
import type { Credit, Design } from './types';

export function openPreview(ed: Editor): void {
  ed.finishTextEdit();
  const d = ed.design;
  let at = ed.pageIndex;
  const stage = h('div', { class: 'pv-stage' });
  const count = h('span', { class: 'pv-count' });
  const prev = h('button', { class: 'pv-nav pv-prev', type: 'button', 'aria-label': 'Previous page' }, icon('chevL', 26));
  const next = h('button', { class: 'pv-nav pv-next', type: 'button', 'aria-label': 'Next page' }, icon('chevR', 26));
  const close = h('button', { class: 'pv-close', type: 'button', 'aria-label': 'Close preview', title: 'Close (Esc)' }, icon('close', 22));
  const wrap = h('div', { class: 'pv', role: 'dialog', 'aria-modal': 'true', 'aria-label': `Preview of ${d.name}` },
    h('div', { class: 'pv-top' }, h('b', null, d.name), count, close), stage, prev, next);

  const show = async () => {
    count.textContent = d.pages.length > 1 ? `Page ${at + 1} of ${d.pages.length}` : '';
    prev.hidden = next.hidden = d.pages.length < 2;
    const page = d.pages[at];
    await prepare(d, [page]);
    if (!wrap.isConnected || page !== d.pages[at]) return;
    const r = stage.getBoundingClientRect();
    const dpr = Math.min(2, devicePixelRatio || 1);
    const s = Math.min((r.width - 32) / d.width, (r.height - 32) / d.height);
    const c = pageCanvas(d, page, s * dpr);
    c.style.width = `${Math.round(d.width * s)}px`;
    c.style.height = `${Math.round(d.height * s)}px`;
    c.className = 'pv-page';
    stage.replaceChildren(c);
  };
  const go = (step: number) => { at = (at + step + d.pages.length) % d.pages.length; void show(); };
  const end = () => { removeEventListener('keydown', onKey, true); removeEventListener('resize', onResize); wrap.classList.remove('in'); setTimeout(() => wrap.remove(), 180); };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); end(); }
    else if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') { e.preventDefault(); e.stopPropagation(); go(1); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); e.stopPropagation(); go(-1); }
  };
  const onResize = () => void show();
  prev.addEventListener('click', () => go(-1));
  next.addEventListener('click', () => go(1));
  close.addEventListener('click', end);
  stage.addEventListener('click', (e) => { if (e.target === stage) end(); });
  addEventListener('keydown', onKey, true);
  addEventListener('resize', onResize);
  document.body.append(wrap);
  requestAnimationFrame(() => { wrap.classList.add('in'); void show(); close.focus(); });
}

/** One-tap downloads with sensible defaults (the Share dialog keeps the full options). */
export function downloadMenu(ed: Editor, anchor: HTMLElement): void {
  const d = ed.design;
  const run = async (fmt: ExportFormat, pages?: number[]) => {
    ed.finishTextEdit();
    ed.save.flush();
    try {
      const files = await exportFiles(d, fmt, { pages, scale: fmt === 'png' || fmt === 'jpg' ? 2 : undefined });
      download(files);
      if (fmt !== 'fuzzies') rewards.exported();
    } catch (e) {
      console.error(e);
      toast('Could not export this design — please try again.', 'bad');
    }
  };
  const many = d.pages.length > 1;
  const credits = photoCredits(d);
  popMenu(anchor, [
    ...(credits.length ? [{ label: `Photo credits (${credits.length})`, icon: 'heart' as const, onClick: () => showCredits(credits) }, null] : []),
    { label: many ? 'PNG · this page' : 'PNG image', icon: 'image', onClick: () => void run('png', [ed.pageIndex]) },
    ...(many ? [{ label: 'PNG · all pages', icon: 'pages' as const, onClick: () => void run('png', d.pages.map((_, i) => i)) }] : []),
    { label: 'JPG image', icon: 'image', onClick: () => void run('jpg', [ed.pageIndex]) },
    { label: many ? 'PDF · all pages' : 'PDF document', icon: 'file', onClick: () => void run('pdf') },
    null,
    { label: 'Project file (.fuzzies)', icon: 'folder', onClick: () => void run('fuzzies') },
  ]);
}

/** Every stock photo's credit in a design (one per photo, even if used twice). */
export function photoCredits(d: Design): Credit[] {
  const seen = new Map<string, Credit>();
  for (const p of d.pages) for (const e of p.elements) if (e.type === 'image' && e.credit) seen.set(creditLine(e.credit), e.credit);
  return [...seen.values()];
}

function showCredits(list: Credit[]): void {
  const text = list.map(creditLine).join('\n');
  const need = list.some((c) => c.required);
  const copy = btn('Copy all credits', { kind: 'primary', icon: 'copy', onClick: () => void (navigator.clipboard?.writeText(text) ?? Promise.reject(new Error('no clipboard'))).then(() => toast('Credits copied', 'good'), () => toast('Select the text and copy it', 'info')) });
  modal('Photo credits', h('div', { class: 'credits' },
    h('p', { class: 'muted' }, need ? 'Some photos here use a licence that asks for a credit. Paste these lines where you share the design (caption, description or the back page).' : 'No credit is required for these photos, but it’s a kind thing to add.'),
    h('textarea', { class: 'input credits-text', readonly: true, rows: Math.min(8, list.length + 1), 'aria-label': 'Photo credits' }, text)), { actions: [copy] });
}
