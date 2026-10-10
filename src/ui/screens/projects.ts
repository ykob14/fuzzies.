/** "My designs": everything you've made, with search, sort and import. */
import type { Screen } from '../app';
import type { Design } from '../../editor/types';
import { db } from '../../core/db';
import { accounts } from '../../core/account';
import { readProjectFile } from '../../editor/export';
import { instantiate } from '../../editor/doc';
import { h, btn, icon, fuzzyMark, pickFile, toast } from '../dom';
import { createDialog } from '../create';
import { designCard } from './cards';

export function projectsScreen(): Screen {
  const a = accounts.current!;
  let all: Design[] = [];
  let q = '';
  let sort: 'recent' | 'name' | 'oldest' = 'recent';
  const grid = h('div', { class: 'card-grid' });
  const search = h('input', { class: 'input search', type: 'search', placeholder: 'Search your designs', 'aria-label': 'Search your designs' });
  const sortSel = h('select', { class: 'input input-sm', 'aria-label': 'Sort' }, h('option', { value: 'recent' }, 'Last edited'), h('option', { value: 'name' }, 'Name A–Z'), h('option', { value: 'oldest' }, 'Oldest first'));
  search.addEventListener('input', () => { q = search.value.toLowerCase(); fill(); });
  sortSel.addEventListener('change', () => { sort = sortSel.value as typeof sort; fill(); });

  async function load(): Promise<void> { all = await db.listDesigns(a.id); fill(); }

  function fill(): void {
    let list = all.filter((d) => !q || d.name.toLowerCase().includes(q));
    if (sort === 'name') list = [...list].sort((x, y) => x.name.localeCompare(y.name));
    if (sort === 'oldest') list = [...list].sort((x, y) => x.createdAt - y.createdAt);
    grid.replaceChildren(...list.map((d) => designCard(d, load)));
    if (!all.length) grid.replaceChildren(h('div', { class: 'empty', style: 'grid-column:1/-1' }, fuzzyMark(64), h('h3', null, 'Your designs live here'), h('p', { class: 'muted' }, 'Everything saves automatically as you work.'), btn('Create your first design', { kind: 'primary', icon: 'plus', onClick: () => createDialog() })));
    else if (!list.length) grid.append(h('p', { class: 'muted' }, 'No designs match your search.'));
  }

  const importBtn = btn('Import', { kind: 'ghost', icon: 'upload', title: 'Open a .fuzzies project file', onClick: async () => {
    const files = await pickFile('.fuzzies,application/json', true);
    for (const f of files) {
      try {
        const d = await readProjectFile(f);
        const copy = instantiate({ ...d, assets: d.assets ?? {} }, a.id, d.name);
        copy.assets = d.assets ?? {};
        await db.putDesign(copy);
        toast(`Imported “${d.name}”`, 'good');
      } catch (e) { toast((e as Error).message, 'bad'); }
    }
    void load();
  } });

  void load();
  return {
    el: h('div', { class: 'page' },
      h('div', { class: 'page-head' }, h('div', null, h('h1', null, 'My designs'), h('p', { class: 'muted' }, 'Saved on this device. Share or download any time.')),
        h('div', { class: 'row' }, importBtn, btn('New design', { kind: 'primary', icon: 'plus', onClick: () => createDialog() }))),
      h('div', { class: 'toolbar' }, h('div', { class: 'search-wrap' }, icon('search', 18), search), sortSel),
      grid),
  };
}
