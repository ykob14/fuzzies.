/** Template gallery with categories and search. */
import type { Screen } from '../app';
import { CATEGORIES, templates } from '../../content/templates';
import { accounts } from '../../core/account';
import { h, icon } from '../dom';
import { templateCard } from './cards';
import { createDialog } from '../create';

export function templatesScreen(): Screen {
  let cat = new URLSearchParams(location.hash.split('?')[1] ?? '').get('c') ?? 'All';
  let q = '';
  let onlyFree = false;
  let shape: 'all' | 'square' | 'portrait' | 'landscape' = 'all';
  const count = h('span', { class: 'tpl-count' });
  const chips = h('div', { class: 'chips' });
  const grid = h('div', { class: 'card-grid tpl' });
  const search = h('input', { class: 'input search', type: 'search', placeholder: 'Search templates — try “party”, “poster” or “logo”', 'aria-label': 'Search templates' });
  const free = h('input', { type: 'checkbox' });
  search.addEventListener('input', () => { q = search.value.toLowerCase(); fill(); });
  free.addEventListener('change', () => { onlyFree = free.checked; fill(); });
  const shapeSel = h('select', { class: 'input input-sm', 'aria-label': 'Shape' }, ...([['all', 'All shapes'], ['square', 'Square'], ['portrait', 'Portrait'], ['landscape', 'Landscape']] as const).map(([v, l]) => h('option', { value: v }, l)));
  shapeSel.addEventListener('change', () => { shape = shapeSel.value as typeof shape; fill(); });
  const shapeOf = (w: number, hh: number) => { const r = w / hh; return Math.abs(r - 1) < 0.05 ? 'square' : r < 1 ? 'portrait' : 'landscape'; };
  // start from nothing: the same size picker as "Create a design"
  const blank = h('button', { class: 'tcard tcard-blank', type: 'button', title: 'Start from a blank design', onclick: () => createDialog() },
    h('div', { class: 'tcard-thumb blank-thumb' }, icon('plus', 30), h('b', null, 'Blank design')),
    h('div', { class: 'tcard-meta' }, h('b', null, 'Start from scratch'), h('small', null, 'Any size')));

  function fill(): void {
    chips.replaceChildren(...CATEGORIES.map((c) => h('button', { class: `chip ${c === cat ? 'on' : ''}`, type: 'button', onclick: () => { cat = c; fill(); } }, c)));
    const list = templates().filter((t) => (cat === 'All' || t.category === cat) && (!q || `${t.name} ${t.category}`.toLowerCase().includes(q)) && (!onlyFree || t.cost === 0 || accounts.current?.unlocked.includes(t.id))
      && (shape === 'all' || shapeOf(t.design.width, t.design.height) === shape));
    count.textContent = `${list.length} template${list.length === 1 ? '' : 's'}`;
    grid.replaceChildren(...(q ? [] : [blank]), ...list.map(templateCard));
    if (!list.length) grid.append(h('p', { class: 'muted' }, 'No templates match — try another word.'));
  }
  fill();
  const off = accounts.onChange(() => fill());

  return {
    el: h('div', { class: 'page' },
      h('div', { class: 'page-head' }, h('div', null, h('h1', null, 'Templates'), h('p', { class: 'muted' }, 'Pick one, make it yours. Locked templates unlock with Fuzzies.'))),
      h('div', { class: 'toolbar' }, h('div', { class: 'search-wrap' }, icon('search', 18), search), shapeSel, h('label', { class: 'check' }, free, 'Ready to use')),
      chips, h('div', { class: 'tpl-meta-row' }, count), grid),
    destroy: off,
  };
}
