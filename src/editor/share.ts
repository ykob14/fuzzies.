/** Share & download dialog. */
import type { Editor } from './editor';
import { exportFiles, shareOrDownload, download, copyImage, canShareFiles, type ExportFormat } from './export';
import { pageCanvas, prepare } from './render';
import { rewards } from '../core/rewards';
import { makeShareLink, LINK_WARN } from '../core/sharelink';
import { track } from '../core/missions';
import { h, btn, modal, toast, icon, type IconName, promptDialog } from '../ui/dom';

const FORMATS: { id: ExportFormat; label: string; sub: string; icon: IconName }[] = [
  { id: 'png', label: 'PNG', sub: 'Best quality image', icon: 'image' },
  { id: 'jpg', label: 'JPG', sub: 'Small image file', icon: 'image' },
  { id: 'pdf', label: 'PDF', sub: 'Print & documents', icon: 'file' },
  { id: 'fuzzies', label: 'Project', sub: 'Editable .fuzzies file', icon: 'folder' },
];

export function openShare(ed: Editor): void {
  ed.finishTextEdit();
  ed.save.flush();
  const d = ed.design;
  let fmt: ExportFormat = 'png';
  let scale = 1;
  let allPages = d.pages.length > 1;
  let transparent = false;

  const preview = h('div', { class: 'share-preview' });
  void prepare(d, [ed.page]).then(() => {
    const c = pageCanvas(d, ed.page, Math.min(1, 520 / Math.max(d.width, d.height)));
    preview.replaceChildren(c);
  });

  const opts = h('div', { class: 'share-opts' });
  const busy = (b: HTMLButtonElement, on: boolean) => { b.disabled = on; b.classList.toggle('loading', on); };

  const renderOpts = () => {
    opts.replaceChildren(...[
      h('div', { class: 'pnl-label' }, 'File type'),
      h('div', { class: 'fmt-grid' }, ...FORMATS.map((f) => {
        const b = h('button', { type: 'button', class: `fmt ${fmt === f.id ? 'on' : ''}` }, icon(f.icon, 18), h('b', null, f.label), h('small', null, f.sub));
        b.addEventListener('click', () => { fmt = f.id; renderOpts(); });
        return b;
      })),
      fmt === 'png' || fmt === 'jpg' ? h('div', null,
        h('div', { class: 'pnl-label' }, 'Size'),
        h('div', { class: 'seg' }, ...[0.5, 1, 2, 3].map((s) => {
          const b = h('button', { type: 'button', class: s === scale ? 'on' : '' }, `${s}× · ${Math.round(d.width * s)}×${Math.round(d.height * s)}`);
          b.addEventListener('click', () => { scale = s; renderOpts(); });
          return b;
        }))) : null,
      fmt === 'png' ? checkbox('Transparent background', transparent, (v) => (transparent = v)) : null,
      d.pages.length > 1 && fmt !== 'fuzzies' ? checkbox(`All ${d.pages.length} pages (otherwise only page ${ed.pageIndex + 1})`, allPages, (v) => (allPages = v)) : null,
    ].filter((x) => !!x) as HTMLElement[]);
  };
  const checkbox = (label: string, on: boolean, set: (v: boolean) => void) => {
    const i = h('input', { type: 'checkbox', checked: on });
    i.addEventListener('change', () => set(i.checked));
    return h('label', { class: 'check' }, i, label);
  };
  renderOpts();

  const make = () => exportFiles(d, fmt, { scale, transparent, pages: allPages ? undefined : [ed.pageIndex] });
  const done = (msg: string) => { rewards.exported(); toast(msg, 'good'); };

  const saveBtn = btn('Download', { kind: 'soft', icon: 'download', onClick: async () => {
    busy(saveBtn, true);
    try { download(await make()); done('Downloaded!'); } catch (e) { toast(String((e as Error).message || e), 'bad'); }
    busy(saveBtn, false);
  } });
  const shareBtn = btn(isPhoneLike() ? 'Share / Save to Photos' : 'Share', { kind: 'primary', icon: 'share', onClick: async () => {
    busy(shareBtn, true);
    try {
      const files = await make();
      const r = await shareOrDownload(files, d.name);
      if (r === 'shared') done('Shared!');
      else if (r === 'downloaded') done(canShareFiles(files) ? 'Downloaded!' : 'Downloaded — this browser has no share sheet.');
    } catch (e) { toast(String((e as Error).message || e), 'bad'); }
    busy(shareBtn, false);
  } });
  const copyBtn = typeof ClipboardItem !== 'undefined' && navigator.clipboard && 'write' in navigator.clipboard ? btn('Copy image', { kind: 'ghost', icon: 'clipboard', onClick: async () => {
    try { await copyImage(d, ed.pageIndex); toast('Image copied — paste it anywhere', 'good'); } catch { toast('Copy is not allowed in this browser', 'bad'); }
  } }) : null;

  // ---- share as a link (view & remix, no account needed) ----
  let linkJob: Promise<{ url: string; length: number }> | null = null;
  const getLink = () => (linkJob ??= makeShareLink(d));
  const linkNote = h('small', { class: 'muted' }, 'Anyone with the link can see it and remix their own copy — no account needed.');
  const gotLink = (n: number) => {
    track('link');
    if (n > LINK_WARN) linkNote.textContent = 'Link ready! It’s long because of the photos — if an app cuts it off, send the image instead.';
  };
  const copyLink = btn('Copy link', { kind: 'soft', icon: 'copy', size: 'sm', onClick: async () => {
    busy(copyLink, true);
    try {
      const { url, length } = await getLink();
      try { await navigator.clipboard.writeText(url); toast('Link copied — paste it anywhere', 'good'); }
      catch { await promptDialog('Copy this link', url, 'Done'); }
      gotLink(length);
    } catch (e) { toast((e as Error).message, 'bad', 4000); linkJob = null; }
    busy(copyLink, false);
  } });
  const sendLink = typeof navigator.share === 'function' ? btn('Send link', { kind: 'soft', icon: 'share', size: 'sm', onClick: async () => {
    busy(sendLink!, true);
    try {
      const { url, length } = await getLink();
      await navigator.share({ title: d.name, text: `Check out my design “${d.name}” on Fuzzies ✨`, url });
      gotLink(length);
    } catch (e) { if ((e as DOMException).name !== 'AbortError') { toast((e as Error).message, 'bad', 4000); linkJob = null; } }
    busy(sendLink!, false);
  } }) : null;
  const linkBox = h('div', { class: 'link-box' }, h('div', { class: 'pnl-label', style: 'margin-top:0' }, '🔗 Share a link'), h('div', { class: 'row' }, copyLink, sendLink), linkNote);

  const m = modal('Share your design', h('div', { class: 'share' }, preview, h('div', null, linkBox, opts,
    h('p', { class: 'hint' }, 'Sharing earns +2 Fuzzies (up to 5 times a day). On phones, “Share” lets you save straight to Photos or send to any app.'))), {
    wide: true,
    actions: [...(copyBtn ? [copyBtn] : []), saveBtn, shareBtn],
  });
  void m;
}

const isPhoneLike = () => matchMedia('(pointer: coarse)').matches;
