/** Rewards shop: everything you can unlock with Fuzzies, plus how to earn them. */
import type { Screen } from '../app';
import { rewards, TIME_BONUS, minutesToTimeBonus } from '../../core/rewards';
import { accounts } from '../../core/account';
import { THEMES, applyTheme } from '../../core/themes';
import { templates } from '../../content/templates';
import { ART_PACKS, ARTS, artDataUrl } from '../../content/art';
import { STICKER_PACKS } from '../../content/stickers';
import { FONT_PACKS } from '../../content/fonts';
import { FX_PACK, TEXT_STYLES } from '../../content/textstyles';
import { SKINS } from '../../game/crossing';
import { templateThumb } from '../thumbs';
import { missionsCard, achievementsGrid } from '../missions';
import { useTemplate, tryInDesign } from '../create';
import { ACHIEVEMENTS } from '../../core/missions';
import { h, btn, fuzzyMark, icon, toast } from '../dom';

/** `use` is what the button does once the item is yours; `inUse` marks the theme/look you have on right now. */
interface Item { id: string; name: string; cost: number; kind: string; preview: () => Node; after?: () => void; use: { label: string; run: () => void }; inUse?: () => boolean }

export function rewardsScreen(): Screen {
  const a = accounts.current!;
  const body = h('div');

  const wearTheme = (id: string) => { accounts.update((x) => (x.settings.theme = id)); applyTheme(); };

  const groups = (): { title: string; blurb: string; items: Item[] }[] => [
    { title: 'Premium templates', blurb: 'Pro designs ready to customise', items: templates().filter((t) => t.cost > 0).map((t) => ({ id: t.id, name: t.name, cost: t.cost, kind: t.category, preview: () => templateThumb(t, 260), use: { label: 'Use template', run: () => useTemplate(t) } })) },
    { title: 'Graphics packs', blurb: 'Recolourable illustrations', items: ART_PACKS.filter((p) => p.cost > 0).map((p) => ({ id: p.id, name: p.name, cost: p.cost, kind: p.blurb, preview: () => h('div', { class: 'rw-arts' }, ...ARTS.filter((x) => x.pack === p.id).slice(0, 4).map((x) => h('img', { src: artDataUrl(x.id, x.colors), alt: '' }))), use: { label: 'Use in a design', run: () => tryInDesign({ panel: 'elements', focus: p.name }) } })) },
    { title: 'Sticker packs', blurb: 'Fun emoji stickers', items: STICKER_PACKS.filter((p) => p.cost > 0).map((p) => ({ id: p.id, name: p.name, cost: p.cost, kind: `${p.items.length} stickers`, preview: () => h('div', { class: 'rw-emoji' }, p.items.slice(0, 6).join('')), use: { label: 'Use in a design', run: () => tryInDesign({ panel: 'stickers', focus: p.name }) } })) },
    { title: 'Font packs', blurb: 'More ways to say it', items: FONT_PACKS.filter((p) => p.cost > 0).map((p) => ({ id: p.id, name: p.name, cost: p.cost, kind: p.fonts.join(' · '), preview: () => h('div', { class: 'rw-font', style: `font-family:"${p.fonts[0]}"` }, 'Aa'), use: { label: 'Use in a design', run: () => tryInDesign({ font: p.fonts[0] }) } })) },
    { title: 'Text effects', blurb: 'One-tap magic text', items: [{ id: FX_PACK.id, name: FX_PACK.name, cost: FX_PACK.cost, kind: TEXT_STYLES.filter((s) => s.premium).map((s) => s.name).join(' · '), preview: () => h('div', { class: 'rw-fx' }, h('span', { style: TEXT_STYLES.find((s) => s.id === 'neon')!.css }, 'Neon')), use: { label: 'Use in a design', run: () => tryInDesign({ panel: 'text', focus: 'Text styles' }) } }] },
    { title: 'App themes', blurb: 'Make Fuzzies feel like yours', items: THEMES.filter((t) => t.cost > 0).map((t) => ({ id: `theme-${t.id}`, name: t.name, cost: t.cost, kind: t.dark ? 'Dark theme' : 'Light theme', preview: () => h('div', { class: 'rw-theme', style: `background:${t.swatch}` }), after: () => wearTheme(t.id), use: { label: 'Use theme', run: () => { wearTheme(t.id); toast(`${t.name} theme on`, 'good'); render(); } }, inUse: () => a.settings.theme === t.id })) },
    { title: 'Fuzzy Crossing looks', blurb: 'Dress up your Fuzzy', items: SKINS.filter((s) => s.cost > 0).map((s) => ({ id: `skin-${s.id}`, name: s.name, cost: s.cost, kind: 'Player look', preview: () => fuzzyMark(64, s.colors), after: () => accounts.update((x) => (x.settings.skin = s.id)), use: { label: 'Play as it', run: () => { accounts.update((x) => (x.settings.skin = s.id)); location.hash = '#/play'; } } })) },
  ];

  function card(it: Item): HTMLElement {
    const owned = rewards.isUnlocked(it.id, it.cost);
    const afford = rewards.canAfford(it.cost);
    const inUse = owned && !!it.inUse?.();
    const action = inUse
      ? h('span', { class: 'owned-tag' }, icon('check', 16), 'In use')
      : owned
      ? btn(it.use.label, { kind: 'soft', size: 'sm', icon: 'check', onClick: it.use.run })
      : btn(afford ? `Unlock · ${it.cost}` : `${it.cost}`, { kind: afford ? 'primary' : 'soft', size: 'sm', icon: afford ? 'unlock' : 'lock', onClick: () => {
          if (!rewards.canAfford(it.cost)) { toast(`You need ${it.cost - rewards.balance()} more Fuzzies — go play!`, 'info'); return; }
          if (rewards.unlock(it.id, it.cost)) { toast(`${it.name} unlocked!`, 'good'); it.after?.(); render(); }
        } });
    const preview = h('div', { class: 'rw-preview' }, it.preview());
    if (owned && !inUse) { preview.classList.add('clickable'); preview.title = it.use.label; preview.addEventListener('click', it.use.run); }
    return h('div', { class: `rw-card ${owned ? 'owned' : ''}` }, preview, owned ? h('span', { class: 'rw-owned-badge', title: 'Yours forever' }, icon('check', 14)) : null, h('div', { class: 'rw-meta' }, h('b', null, it.name), h('small', null, it.kind)), action);
  }

  function render(): void {
    const daily = rewards.dailyStatus();
    const gs = groups();
    const all = gs.flatMap((g) => g.items);
    const ownedCount = all.filter((i) => rewards.isUnlocked(i.id, i.cost)).length;
    const next = all.filter((i) => !rewards.isUnlocked(i.id, i.cost)).sort((x, y) => x.cost - y.cost)[0];
    const pct = next ? Math.min(100, Math.round((rewards.balance() / next.cost) * 100)) : 100;

    body.replaceChildren(
      h('section', { class: 'rw-hero' },
        h('div', { class: 'rw-bal' }, fuzzyMark(72), h('div', null, h('small', null, 'Your Fuzzies'), h('b', { class: 'fz-balance' }, String(rewards.balance())), h('small', null, `${a.totalFuzzies} earned all-time · ${ownedCount}/${all.length} unlocked`))),
        next ? h('div', { class: 'rw-next' }, h('small', null, rewards.canAfford(next.cost) ? `Ready to unlock: ${next.name} 🎉` : `Next up: ${next.name}`), h('div', { class: 'progress' }, h('div', { style: `width:${pct}%` })), h('small', null, `${Math.min(rewards.balance(), next.cost)} / ${next.cost}`)) : h('p', null, 'You unlocked everything. Legend! 🏆'),
        h('div', { class: 'rw-actions' },
          btn('Play to earn', { kind: 'primary', icon: 'gamepad', onClick: () => (location.hash = '#/play') }),
          daily.available ? btn(`Claim daily +${daily.amount}`, { kind: 'soft', icon: 'gift', onClick: () => { rewards.claimDaily(); render(); } }) : h('span', { class: 'owned-tag' }, icon('check', 16), `Daily bonus claimed · ${daily.streak}-day streak`))),
      missionsCard(),
      h('section', { class: 'earn-grid' }, ...[
        ['🐸', 'Fuzzy Crossing', '+1 per Fuzzy, +5 golden, +2 per nest, +5 per level'],
        ['📅', 'Daily visit', '5 Fuzzies, growing with your streak (max 15)'],
        ['⏰', 'Time bonus', `A surprise ${TIME_BONUS.min}–${TIME_BONUS.max} for every ${TIME_BONUS.everyMin} minutes in the app · next in ${minutesToTimeBonus()} min`],
        ['📤', 'Share designs', '+2 per share or download (5 a day)'],
        ['🎯', 'Missions & badges', '3 new missions a day, plus one-time achievement rewards'],
      ].map(([e, t, s]) => h('div', { class: 'earn' }, h('span', { class: 'earn-ic' }, e), h('div', null, h('b', null, t), h('small', null, s))))),
      h('section', { class: 'sec' }, h('div', { class: 'sec-head' }, h('h2', null, `Achievements · ${a.achievements.length}/${ACHIEVEMENTS.length}`), h('span', { class: 'muted' }, 'Badges that pay out once')), achievementsGrid()),
      ...gs.map((g) => h('section', { class: 'sec' }, h('div', { class: 'sec-head' }, h('h2', null, g.title), h('span', { class: 'muted' }, g.blurb)), h('div', { class: 'rw-grid' }, ...g.items.map(card)))),
    );
  }
  render();
  const off = accounts.onChange(() => { for (const b of body.querySelectorAll('.fz-balance')) b.textContent = String(rewards.balance()); });

  return {
    el: h('div', { class: 'page' }, h('div', { class: 'page-head' }, h('div', null, h('h1', null, 'Rewards'), h('p', { class: 'muted' }, 'Collect Fuzzies, unlock goodies. Everything you unlock is yours forever.'))), body),
    destroy: off,
  };
}
