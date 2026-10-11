/** Cards for designs and templates, shared by several screens. */
import type { Design } from '../../editor/types';
import type { Template } from '../../content/templates';
import { db } from '../../core/db';
import { rewards } from '../../core/rewards';
import { accounts } from '../../core/account';
import { exportFiles, shareOrDownload, download } from '../../editor/export';
import { instantiate } from '../../editor/doc';
import { timeAgo } from '../../core/util';
import { templateThumb } from '../thumbs';
import { useTemplate } from '../create';
import { h, btn, fuzzyMark, popMenu, promptDialog, confirmDialog, toast, icon, modal } from '../dom';

export function designCard(d: Design, onChange: () => void, folders: string[] = []): HTMLElement {
  const thumb = d.thumb ? h('img', { src: d.thumb, alt: '', loading: 'lazy' }) : h('div', { class: 'thumb-ph' }, fuzzyMark(40));
  const ratio = Math.max(0.5, Math.min(1.8, d.width / d.height));
  const more = btn(null, { icon: 'more', kind: 'plain', size: 'sm', title: 'More options', class: 'card-more' });
  const card = h('div', { class: 'dcard' },
    h('a', { class: 'dcard-thumb', href: `#/edit/${d.id}`, style: `aspect-ratio:${ratio}` }, thumb),
    h('div', { class: 'dcard-meta' },
      h('div', null, h('b', { class: 'dcard-name' }, d.name), h('small', null, `${d.width}×${d.height} · ${d.pages.length > 1 ? `${d.pages.length} pages · ` : ''}edited ${timeAgo(d.updatedAt)}`)),
      more));
  more.addEventListener('click', (e) => {
    e.preventDefault();
    popMenu(more, [
      { label: 'Open', icon: 'edit', onClick: () => (location.hash = `#/edit/${d.id}`) },
      { label: 'Rename', icon: 'text', onClick: async () => { const n = await promptDialog('Rename design', d.name); if (n?.trim()) { d.name = n.trim(); await db.putDesign(d); onChange(); } } },
      { label: 'Make a copy', icon: 'copy', onClick: async () => { const c = instantiate(d, d.owner, `${d.name} (copy)`, d.template); c.thumb = d.thumb; if (d.folder) c.folder = d.folder; await db.putDesign(c); accounts.update((a) => a.stats.designs++); toast('Copy created', 'good'); onChange(); } },
      { label: d.folder ? 'Move to another folder' : 'Move to a folder', icon: 'folder', onClick: () => moveToFolder(d, folders, onChange) },
      null,
      { label: 'Share image', icon: 'share', onClick: async () => { try { const r = await shareOrDownload(await exportFiles(d, 'png', { pages: [0] }), d.name); if (r !== 'cancelled') rewards.exported(); } catch { toast('Export failed', 'bad'); } } },
      { label: 'Download PNG', icon: 'download', onClick: async () => { download(await exportFiles(d, 'png', { pages: [0] })); rewards.exported(); } },
      { label: 'Download PDF', icon: 'file', onClick: async () => { download(await exportFiles(d, 'pdf')); rewards.exported(); } },
      { label: 'Export project file', icon: 'folder', onClick: async () => download(await exportFiles(d, 'fuzzies')) },
      null,
      { label: 'Delete', icon: 'trash', danger: true, onClick: async () => { if (await confirmDialog('Delete this design?', `“${d.name}” will be gone for good.`)) { await db.deleteDesign(d.id); toast('Design deleted'); onChange(); } } },
    ]);
  });
  return card;
}

export function templateCard(t: Template): HTMLElement {
  const locked = !rewards.isUnlocked(t.id, t.cost);
  const ratio = Math.max(0.5, Math.min(1.8, t.design.width / t.design.height));
  const card = h('button', { class: `tcard ${locked ? 'locked' : ''}`, type: 'button', title: locked ? `Unlock for ${t.cost} Fuzzies` : `Use “${t.name}”` },
    h('div', { class: 'tcard-thumb', style: `aspect-ratio:${ratio}` }, templateThumb(t),
      locked ? h('span', { class: 'lock-badge lg' }, icon('lock', 14), fuzzyMark(16), String(t.cost)) : t.cost ? h('span', { class: 'own-badge' }, icon('check', 14), 'Unlocked') : null,
      h('span', { class: 'tcard-hover' }, locked ? 'Unlock' : 'Use template')),
    h('div', { class: 'tcard-meta' }, h('b', null, t.name), h('small', null, t.category)));
  card.addEventListener('click', () => useTemplate(t));
  return card;
}

/** Pick (or make) a folder for a design in My Designs. Folders are just a label on the design, so they sync with it. */
export function moveToFolder(d: Design, folders: string[], onChange: () => void): void {
  const input = h('input', { class: 'input', placeholder: 'New folder name', maxlength: '40', 'aria-label': 'New folder name' });
  const put = async (folder: string | null) => {
    const name = folder?.trim() ?? '';
    if (name) d.folder = name; else delete d.folder;
    try { await db.putDesign(d); toast(name ? `Moved to “${name}”` : 'Removed from its folder', 'good'); onChange(); }
    catch { toast('Could not move the design', 'bad'); }
    m.close();
  };
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && input.value.trim()) void put(input.value); });
  const list = h('div', { class: 'folder-pick' },
    ...folders.filter((f) => f !== d.folder).map((f) => h('button', { class: 'folder-opt', type: 'button', onclick: () => void put(f) }, icon('folder', 18), h('span', null, f))),
    d.folder ? h('button', { class: 'folder-opt', type: 'button', onclick: () => void put(null) }, icon('close', 18), h('span', null, 'No folder')) : null);
  const m = modal(`Move “${d.name}”`, h('div', null, list, h('div', { class: 'folder-new' }, input, btn('Create & move', { kind: 'primary', onClick: () => { if (input.value.trim()) void put(input.value); } }))));
  setTimeout(() => input.focus(), 50);
}
