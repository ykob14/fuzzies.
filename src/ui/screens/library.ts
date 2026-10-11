/**
 * Template library: search, a category tree (data-driven, see content/library/taxonomy.json), filters for format,
 * style, colour and occasion, real-data sections (trending, popular, recently used, recently added), lazy previews,
 * paged results, a preview with related templates, and blank-design starters.
 */
import type { Screen } from '../app';
import { accounts } from '../../core/account';
import { rewards } from '../../core/rewards';
import { catalog, CATEGORIES_TREE, metaById, onCatalogChange, subById, type TemplateMeta } from '../../content/library/catalog';
import { search, facets, related, type Filters } from '../../content/library/search';
import { usage, loadStats } from '../../content/library/usage';
import { h, btn, icon, fuzzyMark, modal } from '../dom';
import { createBlank, createDialog, useCatalogTemplate } from '../create';
import { lazyThumb } from '../libthumbs';

const PAGE = 36;
const BLANKS: [string, number, number, string][] = [
  ['Instagram post', 1080, 1080, '1080 × 1080'], ['Story', 1080, 1920, '1080 × 1920'], ['Poster', 1587, 2245, 'A-size'], ['Flyer', 1240, 1754, 'A4'],
  ['Presentation', 1920, 1080, '16:9'], ['Invitation', 1500, 2100, '5 × 7'], ['Certificate', 2000, 1414, 'Landscape A4'],
];

export function libraryScreen(): Screen {
  const params = new URLSearchParams(location.hash.split('?')[1] ?? '');
  let q = params.get('q') ?? '';
  const f: Filters = { category: params.get('cat') ?? undefined, sub: params.get('sub') ?? undefined };
  let shown = PAGE;
  let results: TemplateMeta[] = [];

  // ---------- header: search ----------
  const input = h('input', { class: 'input lib-search-input', type: 'search', placeholder: 'Search templates — “basketball tryouts”, “wedding”, “sale”…', 'aria-label': 'Search templates', value: q, autocomplete: 'off' });
  let tmr = 0;
  input.addEventListener('input', () => { clearTimeout(tmr); tmr = window.setTimeout(() => { q = input.value; shown = PAGE; fill(); }, 120); });
  const count = h('span', { class: 'tpl-count' });

  // ---------- category tree ----------
  const tree = h('nav', { class: 'lib-tree', 'aria-label': 'Template categories' });
  const open = new Set<string>(f.category ? [f.category] : []);
  function renderTree(): void {
    const all = catalog();
    const n = (cat?: string, sub?: string) => all.filter((m) => (!cat || m.category === cat) && (!sub || m.sub === sub)).length;
    const item = (label: string, on: boolean, num: number, onClick: () => void, cls = '', lead?: Node) => {
      const b = h('button', { type: 'button', class: `lib-node ${cls} ${on ? 'on' : ''}`, 'aria-current': on ? 'true' : null }, lead ?? null, h('span', { class: 'lib-node-label' }, label), h('span', { class: 'lib-node-n' }, String(num)));
      b.addEventListener('click', onClick);
      return b;
    };
    tree.replaceChildren(item('All templates', !f.category && !f.sub, all.length, () => { f.category = f.sub = undefined; shown = PAGE; fill(); }, 'lib-all'));
    for (const cat of CATEGORIES_TREE) {
      const isOpen = open.has(cat.id);
      const toggle = h('span', { class: `lib-caret ${isOpen ? 'open' : ''}`, role: 'button', 'aria-label': isOpen ? `Collapse ${cat.label}` : `Expand ${cat.label}` }, icon('chevR', 14));
      const head = item(cat.label, f.category === cat.id && !f.sub, n(cat.id), () => { f.category = cat.id; f.sub = undefined; open.add(cat.id); shown = PAGE; fill(); }, 'lib-cat', h('span', { class: 'lib-emoji' }, cat.emoji));
      head.setAttribute('aria-expanded', String(isOpen));
      toggle.addEventListener('click', (e) => { e.stopPropagation(); if (open.has(cat.id)) open.delete(cat.id); else open.add(cat.id); renderTree(); });
      head.prepend(toggle);
      const subs = h('div', { class: 'lib-subs', hidden: !isOpen },
        ...cat.subcategories.filter((s) => n(cat.id, s.id)).map((s) => item(s.label, f.sub === s.id, n(cat.id, s.id), () => { f.category = cat.id; f.sub = s.id; shown = PAGE; fill(); }, 'lib-sub', h('span', { class: 'lib-emoji' }, s.emoji))));
      tree.append(h('div', { class: 'lib-group' }, head, subs));
    }
  }

  // ---------- filters ----------
  const filterRow = h('div', { class: 'lib-filters' });
  function renderFilters(base: TemplateMeta[]): void {
    const fc = facets(base);
    const select = (key: 'format' | 'style' | 'color' | 'occasion', label: string) => {
      const s = h('select', { class: `input input-sm lib-filter ${f[key] ? 'on' : ''}`, 'aria-label': label },
        h('option', { value: '' }, label), ...fc[key].map(([v, l, n]) => h('option', { value: v, selected: f[key] === v }, `${l} (${n})`)));
      s.addEventListener('change', () => { f[key] = s.value || undefined; shown = PAGE; fill(); });
      return s;
    };
    const free = h('input', { type: 'checkbox', checked: !!f.free });
    free.addEventListener('change', () => { f.free = free.checked || undefined; shown = PAGE; fill(); });
    const any = f.format || f.style || f.color || f.occasion || f.free;
    filterRow.replaceChildren(select('format', 'Any format'), select('style', 'Any style'), select('color', 'Any colour'), select('occasion', 'Any occasion'),
      h('label', { class: 'check lib-free' }, free, 'Free only'));
    if (any) filterRow.append(btn('Clear filters', { kind: 'plain', size: 'sm', icon: 'close', onClick: () => { f.format = f.style = f.color = f.occasion = undefined; f.free = undefined; shown = PAGE; fill(); } }));
  }

  // ---------- cards ----------
  function card(m: TemplateMeta): HTMLElement {
    const locked = !rewards.isUnlocked(m.id, m.cost);
    const topic = subById(m.sub)?.sub.label;
    const preview = h('button', { type: 'button', class: 'lib-peek', title: 'Preview & similar templates', 'aria-label': `Preview ${m.name}` }, icon('eye', 16));
    preview.addEventListener('click', (e) => { e.stopPropagation(); openPreview(m); });
    const el = h('div', { class: `lib-card ${locked ? 'locked' : ''}`, role: 'button', tabindex: '0', title: locked ? `Unlock for ${m.cost} Fuzzies` : `Use “${m.name}”` },
      h('div', { class: 'lib-thumb' }, lazyThumb(m, 300),
        locked ? h('span', { class: 'lock-badge lg' }, icon('lock', 14), fuzzyMark(16), String(m.cost)) : null,
        m.pages > 1 ? h('span', { class: 'lib-pages' }, `${m.pages} pages`) : null,
        preview, h('span', { class: 'tcard-hover' }, locked ? 'Unlock' : 'Use template')),
      h('div', { class: 'lib-meta' }, h('b', null, m.name), h('small', null, [topic, m.formatLabel].filter(Boolean).join(' · '))));
    const go = () => void useCatalogTemplate(m);
    el.addEventListener('click', go);
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
    return el;
  }
  const row = (title: string, list: TemplateMeta[], more?: () => void, note?: string) => list.length ? h('section', { class: 'lib-row' },
    h('div', { class: 'sec-head' }, h('div', null, h('h2', null, title), note ? h('small', { class: 'muted' }, note) : null), more ? h('button', { class: 'link', type: 'button', onclick: more }, 'See all') : null),
    h('div', { class: 'lib-strip' }, ...list.map(card))) : null;

  // ---------- preview with related templates ----------
  function openPreview(m: TemplateMeta): void {
    const topic = subById(m.sub);
    const facts = [topic ? `${topic.cat.label} › ${topic.sub.label}` : '', `${m.formatLabel} · ${m.width} × ${m.height}`, m.pages > 1 ? `${m.pages} pages` : '', m.style, m.colors.join(', ')].filter(Boolean);
    const rel = related(catalog(), m, 8);
    const body = h('div', { class: 'lib-preview' },
      h('div', { class: 'lib-preview-pic' }, lazyThumb(m, 560, 1)),
      h('div', { class: 'lib-preview-side' },
        h('ul', { class: 'lib-facts' }, ...facts.map((x) => h('li', null, x))),
        h('p', { class: 'muted' }, 'Every word, colour, photo and shape is editable. Your copy is saved in My designs — the template itself never changes.'),
        btn(rewards.isUnlocked(m.id, m.cost) ? 'Use this template' : `Unlock for ${m.cost} Fuzzies`, { kind: 'primary', size: 'lg', icon: 'edit', class: 'btn-block', onClick: () => { mo.close(); void useCatalogTemplate(m); } })),
      rel.length ? h('div', { class: 'lib-related' }, h('h3', null, 'Similar templates'), h('div', { class: 'lib-strip small' }, ...rel.map((r) =>
        h('button', { type: 'button', class: 'lib-rel', title: r.name, onclick: () => { mo.close(); openPreview(r); } }, lazyThumb(r, 200, 1), h('span', null, r.name))))) : null);
    const mo = modal(m.name, body, { wide: true });
  }

  // ---------- main content ----------
  const main = h('div', { class: 'lib-main' });
  const sentinel = h('div', { class: 'lib-sentinel' }, h('span', { class: 'ph-spin' }));
  const grid = h('div', { class: 'lib-grid' });
  const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting) && shown < results.length) { shown += PAGE; renderResults(true); } }, { rootMargin: '600px 0px' });
  io.observe(sentinel);

  function renderResults(append = false): void {
    const slice = results.slice(append ? shown - PAGE : 0, shown);
    if (!append) grid.replaceChildren();
    grid.append(...slice.map(card));
    sentinel.hidden = shown >= results.length;
  }

  function blanks(): HTMLElement {
    return h('section', { class: 'lib-row' }, h('div', { class: 'sec-head' }, h('h2', null, 'Start from blank')),
      h('div', { class: 'lib-strip blanks' }, ...BLANKS.map(([name, w, hh, sub]) => {
        const r = w / hh, bw = r >= 1 ? 56 : 56 * r, bh = r >= 1 ? 56 / r : 56;
        return h('button', { class: 'lib-blank', type: 'button', onclick: () => createBlank(name, w, hh) }, h('span', { class: 'lib-blank-shape' }, h('span', { style: `width:${bw}px;height:${bh}px` })), h('b', null, name), h('small', null, sub));
      }), h('button', { class: 'lib-blank', type: 'button', onclick: () => createDialog() }, h('span', { class: 'lib-blank-shape' }, icon('plus', 26)), h('b', null, 'Custom size'), h('small', null, 'Any size'))));
  }

  function fill(): void {
    const all = catalog();
    const filtering = !!(q.trim() || f.category || f.sub || f.format || f.style || f.color || f.occasion || f.free);
    // the filter menus only offer choices that have results for the current topic/search
    const base = search(all, q, { category: f.category, sub: f.sub });
    results = search(all, q, f, usage);
    renderTree();
    renderFilters(base);
    count.textContent = `${results.length} template${results.length === 1 ? '' : 's'}`;
    const ps = new URLSearchParams();
    if (q.trim()) ps.set('q', q.trim());
    if (f.category) ps.set('cat', f.category);
    if (f.sub) ps.set('sub', f.sub);
    const hash = `#/templates${[...ps].length ? `?${ps}` : ''}`;
    // only while the gallery is the current screen (opening a template changes the address to the editor)
    if (location.hash.startsWith('#/templates') && location.hash !== hash) history.replaceState(null, '', hash);
    main.replaceChildren();
    if (!filtering) {
      const pick = (ids: string[]) => ids.map((id) => metaById(id)).filter((m): m is TemplateMeta => !!m).slice(0, 12);
      const onePerTopic = (list: TemplateMeta[]) => list.filter((m, i, arr) => !m.sub || arr.findIndex((x) => x.sub === m.sub) === i);
      main.append(...[blanks(),
        row('Recently used', pick(usage.recent()), undefined, 'On this device'),
        row('Trending this week', pick(usage.trending().map(([id]) => id)), undefined, 'Most used by everyone in the last 7 days'),
        row('Popular', pick(usage.popular().map(([id]) => id)), undefined, 'Most used of all time'),
        row('Recently added', onePerTopic([...all].sort((a, b) => b.addedAt - a.addedAt)).slice(0, 12)),
        ...CATEGORIES_TREE.map((cat) => row(`${cat.emoji} ${cat.label}`, onePerTopic(all.filter((m) => m.category === cat.id).sort((a, b) => usage.uses(b.id) - usage.uses(a.id))).slice(0, 12),
          () => { f.category = cat.id; open.add(cat.id); shown = PAGE; fill(); })),
      ].filter((x): x is HTMLElement => !!x));
      return;
    }
    const topic = f.sub ? subById(f.sub) : null;
    const heading = topic ? `${topic.sub.emoji} ${topic.sub.label}` : f.category ? CATEGORIES_TREE.find((c) => c.id === f.category)?.label ?? 'Templates' : q.trim() ? `Results for “${q.trim()}”` : 'Templates';
    main.append(h('div', { class: 'lib-results-head' }, h('h2', null, heading), count));
    if (!results.length) {
      main.append(h('div', { class: 'empty' }, fuzzyMark(48), h('p', null, 'No templates match yet.'), h('p', { class: 'muted' }, 'Try fewer words or clear a filter — or start from a blank design.'), btn('Start from blank', { kind: 'primary', icon: 'plus', onClick: () => createDialog() })));
      return;
    }
    main.append(grid, sentinel);
    renderResults();
  }

  // the real usage numbers arrive a moment later (cloud)
  void loadStats().then((s) => { if (s && main.isConnected) fill(); });
  const offCat = onCatalogChange(() => { if (main.isConnected) fill(); });
  const offAcc = accounts.onChange(() => { if (main.isConnected && location.hash.startsWith('#/templates')) fill(); });
  fill();

  const el = h('div', { class: 'page lib' },
    h('div', { class: 'page-head' }, h('div', null, h('h1', null, 'Templates'), h('p', { class: 'muted' }, `${catalog().length} original, fully editable templates for every event, sport and celebration.`))),
    h('div', { class: 'lib-searchbar' }, icon('search', 20), input),
    h('div', { class: 'lib-layout' }, h('aside', { class: 'lib-side' }, tree), h('div', { class: 'lib-body' }, filterRow, main)));
  if (q) setTimeout(() => input.focus(), 50);
  return { el, destroy: () => { io.disconnect(); offCat(); offAcc(); } };
}
