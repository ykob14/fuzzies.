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
import { thumbnail } from '../editor/render';
import { track } from '../core/missions';
import type { TemplateMeta } from '../content/library/catalog';

/** Something to show as soon as a new design opens: a side panel (scrolled to a pack) or a starter text in a font. */
export interface TryIt { panel?: string; focus?: string; font?: string }
const TRY_KEY = 'fz.try';

/** Returns (once) what to show for the design that is opening, if anything. */
export function takeTryIt(designId: string): TryIt | null {
  const raw = sessionStorage.getItem(TRY_KEY);
  sessionStorage.removeItem(TRY_KEY);
  try {
    const t = raw ? (JSON.parse(raw) as TryIt & { id: string }) : null;
    return t && t.id === designId ? t : null;
  } catch { return null; }
}

export async function saveAndOpen(d: Design, tryIt?: TryIt): Promise<void> {
  try {
    try { d.thumb = thumbnail(d); } catch { /* the editor makes one on the first save */ }
    await db.putDesign(d);
    accounts.update((a) => a.stats.designs++);
    track('design');
    if (tryIt) sessionStorage.setItem(TRY_KEY, JSON.stringify({ ...tryIt, id: d.id }));
    location.hash = `#/edit/${d.id}`;
  } catch {
    toast('Could not create the design — storage may be full.', 'bad');
  }
}

export function createBlank(name: string, w: number, hh: number, tryIt?: TryIt): void {
  const a = accounts.current;
  if (!a) return;
  void saveAndOpen(newDesign(a.id, name, w, hh), tryIt);
}

/** Start a fresh square design to try out something you just unlocked. */
export function tryInDesign(tryIt: TryIt): void {
  const p = SIZE_PRESETS[0];
  createBlank(p.name, p.w, p.h, tryIt);
}

export function useTemplate(t: Template): void {
  const a = accounts.current;
  if (!a) return;
  if (!rewards.isUnlocked(t.id, t.cost)) {
    unlockDialog({ id: t.id, name: t.name, cost: t.cost, kind: `${t.category} template`, preview: templateThumb(t, 300) }, () => useTemplate(t));
    return;
  }
  track('template');
  void saveAndOpen(instantiate(t.design, a.id, t.name, t.id));
}

/** Start a design from any template in the catalog (built-in library, originals or published ones). */
export async function useCatalogTemplate(m: TemplateMeta): Promise<void> {
  const a = accounts.current;
  if (!a) return;
  if (!rewards.isUnlocked(m.id, m.cost)) {
    unlockDialog({ id: m.id, name: m.name, cost: m.cost, kind: `${m.formatLabel} template` }, () => void useCatalogTemplate(m));
    return;
  }
  try {
    const [{ loadTemplateDoc }, { recordUse }, { waitFonts }] = await Promise.all([import('../content/library/catalog'), import('../content/library/usage'), import('./libthumbs')]);
    await waitFonts(m); // text is sized by measuring the real fonts: this template's own fonts first
    const doc = await loadTemplateDoc(m);
    track('template');
    recordUse(m.id);
    await saveAndOpen(instantiate(doc, a.id, m.name, m.id));
  } catch (e) {
    console.error(e);
    toast(navigator.onLine ? 'That template could not be opened — please try again.' : 'This template needs an internet connection the first time.', 'bad');
  }
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
