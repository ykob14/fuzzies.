/** Template gallery with categories and search. */
import type { Screen } from '../app';
import { CATEGORIES, templates } from '../../content/templates';
import { accounts } from '../../core/account';
import { h, icon } from '../dom';
import { templateCard } from './cards';

export function templatesScreen(): Screen {
  let cat = new URLSearchParams(location.hash.split('?')[1] ?? '').get('c') ?? 'All';
  let q = '';
  let onlyFree = false;
  const chips = h('div', { class: 'chips' });
  const grid = h('div', { class: 'card-grid tpl' });
  const search = h('input', { class: 'input search', type: 'search', placeholder: 'Search templates — try “party”, “poster” or “logo”', 'aria-label': 'Search templates' });
  const free = h('input', { type: 'checkbox' });
  search.addEventListener('input', () => { q = search.value.toLowerCase(); fill(); });
  free.addEventListener('change', () => { onlyFree = free.checked; fill(); });

  function fill(): void {
    chips.replaceChildren(...CATEGORIES.map((c) => h('button', { class: `chip ${c === cat ? 'on' : ''}`, type: 'button', onclick: () => { cat = c; fill(); } }, c)));
    const list = templates().filter((t) => (cat === 'All' || t.category === cat) && (!q || `${t.name} ${t.category}`.toLowerCase().includes(q)) && (!onlyFree || t.cost === 0 || accounts.current?.unlocked.includes(t.id)));
    grid.replaceChildren(...list.map(templateCard));
    if (!list.length) grid.append(h('p', { class: 'muted' }, 'No templates match — try another word.'));
  }
  fill();
  const off = accounts.onChange(() => fill());

  return {
    el: h('div', { class: 'page' },
      h('div', { class: 'page-head' }, h('div', null, h('h1', null, 'Templates'), h('p', { class: 'muted' }, 'Pick one, make it yours. Locked templates unlock with Fuzzies.'))),
      h('div', { class: 'toolbar' }, h('div', { class: 'search-wrap' }, icon('search', 18), search), h('label', { class: 'check' }, free, 'Ready to use')),
      chips, grid),
    destroy: off,
  };
}
