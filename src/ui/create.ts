/** "Create a design" flow: pick a size or start from a template. */
import { SIZE_PRESETS, newDesign, instantiate } from '../editor/doc';
import type { Template } from '../content/templates';
import { db } from '../core/db';
import { accounts } from '../core/account';
import { rewards } from '../core/rewards';
import { unlockDialog } from './unlock';
import { templateThumb } from './thumbs';
import { h, btn, modal, toast } from './dom';
import type { Design } from '../editor/types';
import { track } from '../core/missions';

async function saveAndOpen(d: Design): Promise<void> {
  try {
    await db.putDesign(d);
    accounts.update((a) => a.stats.designs++);
    track('design');
    location.hash = `#/edit/${d.id}`;
  } catch {
    toast('Could not create the design — storage may be full.', 'bad');
  }
}

export function createBlank(name: string, w: number, hh: number): void {
  const a = accounts.current;
  if (!a) return;
  void saveAndOpen(newDesign(a.id, name, w, hh));
}

export function useTemplate(t: Template): void {
  const a = accounts.current;
  if (!a) return;
  if (!rewards.isUnlocked(t.id, t.cost)) {
    unlockDialog({ id: t.id, name: t.name, cost: t.cost, kind: `${t.category} template`, preview: templateThumb(t, 300) }, () => useTemplate(t));
    return;
  }
  track('template');
  void saveAndOpen(instantiate(t.design, a.id, t.name));
}

export function createDialog(): void {
  const grid = h('div', { class: 'size-grid' }, ...SIZE_PRESETS.map((p) => {
    const r = p.w / p.h;
    const bw = r >= 1 ? 46 : 46 * r, bh = r >= 1 ? 46 / r : 46;
    const b = h('button', { class: 'size-card', type: 'button' },
      h('div', { class: 'size-shape' }, h('div', { style: `width:${bw}px;height:${bh}px` })),
      h('b', null, p.name), h('small', null, `${p.w} × ${p.h}`));
    b.addEventListener('click', () => { m.close(); createBlank(p.name, p.w, p.h); });
    return b;
  }));
  const w = h('input', { class: 'input', type: 'number', min: '16', max: '8000', value: '1080', 'aria-label': 'Width in pixels' });
  const hh = h('input', { class: 'input', type: 'number', min: '16', max: '8000', value: '1350', 'aria-label': 'Height in pixels' });
  const custom = h('div', { class: 'custom-size' },
    h('label', null, h('span', null, 'Width'), w), h('span', { class: 'x' }, '×'), h('label', null, h('span', null, 'Height'), hh),
    btn('Create', { kind: 'primary', onClick: () => {
      const W = Math.round(+w.value), H = Math.round(+hh.value);
      if (!(W >= 16 && W <= 8000 && H >= 16 && H <= 8000)) { toast('Use a size between 16 and 8000 px', 'bad'); return; }
      m.close(); createBlank('Custom design', W, H);
    } }));
  const m = modal('Create a design', h('div', null, grid, h('div', { class: 'pnl-label', style: 'margin-top:18px' }, 'Custom size (pixels)'), custom,
    h('p', { class: 'hint' }, 'Prefer a head start? ', h('a', { href: '#/templates', onclick: () => m.close() }, 'Browse templates →'))), { wide: true });
}
