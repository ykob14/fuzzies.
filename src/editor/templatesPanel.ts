/** The editor's Templates panel: the whole library with search and categories (loaded on first open). */
import type { Editor } from './editor';
import type { Design } from './types';
import { instantiate } from './doc';
import { catalog, CATEGORIES_TREE, loadTemplateDoc, onCatalogChange, type TemplateMeta } from '../content/library/catalog';
import { loadPublished, searchPublished } from '../content/library/remote';
import { search as searchTemplates } from '../content/library/search';
import { usage, recordUse } from '../content/library/usage';
import { lazyThumb } from '../ui/libthumbs';
import { unlockDialog } from '../ui/unlock';
import { rewards } from '../core/rewards';
import { h, btn, toast, confirmDialog } from '../ui/dom';

let tplCat = '';
let tplQuery = '';
let tplShown = 40;

export function templatesPanelBody(ed: Editor, o: { afterAdd: () => void; rerender: () => void; lockBadge: (cost: number) => HTMLElement }): HTMLElement {
  const { afterAdd, lockBadge } = o;
  const render = o.rerender;
  function panel(): HTMLElement {
    const wrap = h('div');
    const search = h('input', { class: 'input', placeholder: 'Search 300+ templates', value: tplQuery, type: 'search', 'aria-label': 'Search templates' });
    const chips = h('div', { class: 'chips' });
    const grid = h('div', { class: 'tpl-grid' });
    const more = btn('Show more', { kind: 'ghost', class: 'btn-block', onClick: () => { tplShown += 40; fill(); } });
    const fill = () => {
      chips.replaceChildren(...[['', 'All'] as [string, string], ...CATEGORIES_TREE.map((c) => [c.id, `${c.emoji} ${c.label}`] as [string, string])].map(([id, label]) => {
        const b = h('button', { class: `chip ${id === tplCat ? 'on' : ''}`, type: 'button' }, label);
        b.addEventListener('click', () => { tplCat = id; tplShown = 40; fill(); });
        return b;
      }));
      const list = searchTemplates(catalog(), tplQuery, { category: tplCat || undefined }, usage);
      void searchPublished(tplQuery, { category: tplCat || undefined });
      grid.replaceChildren(...list.slice(0, tplShown).map((m) => tplCard(m)));
      if (!list.length) grid.append(h('p', { class: 'muted' }, 'No templates match.'));
      more.hidden = list.length <= tplShown;
    };
    let tmr = 0;
    search.addEventListener('input', () => { clearTimeout(tmr); tmr = window.setTimeout(() => { tplQuery = search.value; tplShown = 40; fill(); }, 120); });
    fill();
    // published templates arrive from the server a moment later
    const off = onCatalogChange(() => { if (wrap.isConnected) fill(); else off(); });
    void loadPublished();
    wrap.append(search, chips, grid, more);
    return wrap;
  }

  function tplCard(m: TemplateMeta): HTMLElement {
    const locked = !rewards.isUnlocked(m.id, m.cost);
    const card = h('button', { class: 'tpl-card', type: 'button', title: m.name }, lazyThumb(m, 220, 1), locked ? lockBadge(m.cost) : null, h('span', { class: 'tpl-name' }, m.name));
    card.addEventListener('click', async () => {
      if (locked) { unlockDialog({ id: m.id, name: m.name, cost: m.cost, kind: `${m.formatLabel} template` }, render); return; }
      if (ed.page.elements.length && !(await confirmDialog('Use this template?', 'It replaces what is on the current page. You can undo this.', 'Use template', false))) return;
      try {
        applyTemplate(m.name, await loadTemplateDoc(m));
        recordUse(m.id);
        afterAdd();
      } catch { toast('That template could not be loaded — please try again.', 'bad'); }
    });
    return card;
  }

  function applyTemplate(name: string, doc: Design): void {
    const inst = instantiate(doc, ed.design.owner);
    const d = ed.design;
    const sameSize = d.width === inst.width && d.height === inst.height;
    d.pages.splice(ed.pageIndex, 1, ...inst.pages);
    Object.assign(d.assets, inst.assets);
    if (sameSize) ed.commit();
    else ed.resizeDesign(inst.width, inst.height, false);
    ed.goToPage(ed.pageIndex);
    toast(`Template “${name}” applied`, 'good');
  }

  return panel();
}
