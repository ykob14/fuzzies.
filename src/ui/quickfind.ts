/** Quick find (Ctrl/Cmd+K or the search box in the top bar): jump to any screen, template or one of your designs. */
import { accounts } from '../core/account';
import { db } from '../core/db';
import { rewards } from '../core/rewards';
import { applyTheme, resolveTheme } from '../core/themes';
import { templates } from '../content/templates';
import { createDialog, useTemplate, useCatalogTemplate } from './create';
import type { TemplateMeta } from '../content/library/catalog';
import { h, icon, fuzzyMark, type IconName } from './dom';

interface Item { group: string; label: string; sub?: string; icon?: IconName; thumb?: string; keys?: string; run: () => void; found?: boolean }

/** The screens, in the same groups as the sidebar (shared so both stay in step). */
export const NAV_GROUPS: { label: string; items: { id: string; label: string; icon: IconName; keys?: string }[] }[] = [
  { label: 'Create', items: [
    { id: 'home', label: 'Home', icon: 'home', keys: 'start dashboard missions' },
    { id: 'templates', label: 'Templates', icon: 'grid', keys: 'gallery browse' },
    { id: 'projects', label: 'My designs', icon: 'folder', keys: 'projects files' },
  ] },
  { label: 'Play', items: [
    { id: 'play', label: 'Fuzzy Crossing', icon: 'gamepad', keys: 'game frogger play' },
    { id: 'land', label: 'Fuzzies Land', icon: 'town', keys: 'town fland build farm' },
    { id: 'rewards', label: 'Rewards', icon: 'gift', keys: 'shop unlock fuzzies tokens' },
  ] },
  { label: 'You', items: [
    { id: 'profile', label: 'Profile', icon: 'user', keys: 'account badges achievements sync' },
    { id: 'settings', label: 'Settings', icon: 'settings', keys: 'theme brand kit app icon sound music' },
  ] },
];

let open = false;

export function openQuickFind(initial = ''): void {
  const a = accounts.current;
  if (!a || open) return;
  open = true;
  const input = h('input', { class: 'qf-input', type: 'search', placeholder: 'Search screens, templates and your designs…', 'aria-label': 'Quick find', autocomplete: 'off', spellcheck: 'false' });
  input.value = initial;
  const list = h('div', { class: 'qf-list', role: 'listbox' });
  const box = h('div', { class: 'qf', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Quick find' },
    h('div', { class: 'qf-head' }, icon('search', 18), input, h('kbd', { class: 'qf-esc' }, 'Esc')),
    list,
    h('div', { class: 'qf-foot' }, h('span', null, h('kbd', null, '↑'), h('kbd', null, '↓'), ' to move'), h('span', null, h('kbd', null, '↵'), ' to open')));
  const backdrop = h('div', { class: 'qf-backdrop' }, box);

  const dark = resolveTheme(a.settings.theme).dark;
  const base: Item[] = [
    { group: 'Actions', label: 'Create a design', icon: 'plus', keys: 'new blank size', run: () => createDialog() },
    { group: 'Actions', label: dark ? 'Switch to light mode' : 'Switch to dark mode', icon: dark ? 'sun' : 'moon', keys: 'theme dark light', run: () => { accounts.update((x) => (x.settings.theme = dark ? 'light' : 'dark')); applyTheme(); } },
    ...NAV_GROUPS.flatMap((g) => g.items.map((n): Item => ({ group: 'Go to', label: n.label, sub: g.label, icon: n.icon, keys: n.keys, run: () => (location.hash = `#/${n.id}`) }))),
    ...templates().map((t): Item => {
      const locked = !rewards.isUnlocked(t.id, t.cost);
      return { group: 'Templates', label: t.name, sub: locked ? `${t.category} · unlock for ${t.cost} Fuzzies` : t.category, icon: locked ? 'lock' : 'grid', keys: `template ${t.category}`, run: () => useTemplate(t) };
    }),
  ];
  // the whole template library (lazy chunk): until it arrives the classic templates above answer
  type Lib = { all: () => TemplateMeta[]; find: (q: string) => TemplateMeta[]; label: (m: TemplateMeta) => string };
  let lib: Lib | null = null;
  void Promise.all([import('../content/library/catalog'), import('../content/library/search'), import('../content/library/usage')]).then(([c, s, u]) => {
    lib = { all: c.catalog, find: (q) => s.search(c.catalog(), q, {}, u.usage), label: (m) => c.subById(m.sub)?.sub.label ?? m.formatLabel };
    if (open && input.value.trim()) fill();
  }).catch(() => {});
  let designs: Item[] = [];
  void db.listDesigns(a.id).then((ds) => {
    designs = ds.map((d) => ({ group: 'My designs', label: d.name, sub: `${d.width} × ${d.height}`, thumb: d.thumb, keys: 'design', run: () => (location.hash = `#/edit/${d.id}`) }));
    if (open) fill();
  }).catch(() => {});

  let shown: Item[] = [];
  let at = 0;
  function fill(): void {
    const q = input.value.trim().toLowerCase();
    const words = q.split(/\s+/).filter(Boolean);
    const match = (it: Item) => it.found || words.every((w) => `${it.label} ${it.sub ?? ''} ${it.keys ?? ''}`.toLowerCase().includes(w));
    let all = [...base.slice(0, 2), ...designs, ...base.slice(2)];
    let more: Item | null = null;
    if (q && lib) {
      const found = lib.find(input.value.trim());
      all = [...all.filter((i) => i.group !== 'Templates'), ...found.slice(0, 8).map((m): Item => {
        const locked = !rewards.isUnlocked(m.id, m.cost);
        return { group: 'Templates', label: m.name, sub: locked ? `${lib!.label(m)} · unlock for ${m.cost} Fuzzies` : `${lib!.label(m)} · ${m.formatLabel}`, icon: locked ? 'lock' : 'grid', found: true, run: () => void useCatalogTemplate(m) };
      })];
      if (found.length) more = { group: 'Templates', label: `See all ${found.length} template${found.length === 1 ? '' : 's'} for “${input.value.trim()}”`, icon: 'search', found: true, run: () => (location.hash = `#/templates?q=${encodeURIComponent(input.value.trim())}`) };
    }
    shown = q
      ? [...all.filter(match), ...(more ? [more] : [])].slice(0, 40)
      // nothing typed yet: actions, your latest designs and the screens (templates are one word away)
      : [...base.filter((i) => i.group !== 'Templates'), ...designs.slice(0, 4)];
    at = Math.min(at, Math.max(0, shown.length - 1));
    list.replaceChildren();
    if (!shown.length) { list.append(h('div', { class: 'qf-empty' }, fuzzyMark(36), h('p', null, `Nothing called “${input.value.trim()}” yet.`))); return; }
    let group = '';
    shown.forEach((it, i) => {
      if (it.group !== group) { group = it.group; list.append(h('div', { class: 'qf-group' }, group)); }
      const row = h('button', { type: 'button', class: `qf-item ${i === at ? 'on' : ''}`, role: 'option', 'aria-selected': String(i === at) },
        it.thumb ? h('img', { class: 'qf-thumb', src: it.thumb, alt: '' }) : h('span', { class: 'qf-ic' }, icon(it.icon ?? 'file', 16)),
        h('span', { class: 'qf-label' }, it.label),
        it.sub ? h('span', { class: 'qf-sub' }, it.sub) : null);
      row.addEventListener('pointermove', () => { if (at !== i) { at = i; mark(); } });
      row.addEventListener('click', () => choose(i));
      list.append(row);
    });
  }
  function mark(): void {
    list.querySelectorAll('.qf-item').forEach((r, i) => { r.classList.toggle('on', i === at); r.setAttribute('aria-selected', String(i === at)); });
    list.querySelectorAll('.qf-item')[at]?.scrollIntoView({ block: 'nearest' });
  }
  function choose(i: number): void { const it = shown[i]; if (!it) return; close(); it.run(); }
  function close(): void {
    if (!open) return;
    open = false;
    backdrop.classList.remove('in');
    removeEventListener('keydown', onKey, true);
    setTimeout(() => backdrop.remove(), 160);
  }
  function onKey(e: KeyboardEvent): void {
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); at = (at + 1) % Math.max(1, shown.length); mark(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); at = (at - 1 + shown.length) % Math.max(1, shown.length); mark(); }
    else if (e.key === 'Enter') { e.preventDefault(); choose(at); }
  }
  input.addEventListener('input', () => { at = 0; fill(); });
  backdrop.addEventListener('pointerdown', (e) => { if (e.target === backdrop) close(); });
  addEventListener('keydown', onKey, true);
  addEventListener('hashchange', close, { once: true });
  fill();
  document.body.append(backdrop);
  input.focus(); // right away, so keys typed straight after opening land here
  requestAnimationFrame(() => backdrop.classList.add('in'));
  setTimeout(() => { input.focus(); input.setSelectionRange(input.value.length, input.value.length); }, 20);
}

/** Ctrl/Cmd+K opens quick find on the app's screens (the editor and the games keep their own keys). */
export function bindQuickFind(): void {
  addEventListener('keydown', (e) => {
    if (!(e.key === 'k' || e.key === 'K') || !(e.metaKey || e.ctrlKey) || e.altKey) return;
    if (!document.querySelector('.app')) return; // only where the app shell is showing
    e.preventDefault();
    openQuickFind();
  });
}
