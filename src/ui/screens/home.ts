/** Home: greeting, daily bonus, quick sizes, recent designs, featured templates and the game. */
import type { Screen } from '../app';
import { accounts } from '../../core/account';
import { rewards } from '../../core/rewards';
import { db } from '../../core/db';
import { SIZE_PRESETS } from '../../editor/doc';
import { templates } from '../../content/templates';
import { h, btn, icon, fuzzyMark, QUOTE } from '../dom';
import { createBlank, createDialog } from '../create';
import { designCard, templateCard } from './cards';
import { missionsCard } from '../missions';

export function homeScreen(): Screen {
  const a = accounts.current!;
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const hero = h('section', { class: 'hero' },
    h('div', { class: 'hero-text' },
      h('p', { class: 'hero-kicker' }, `${greet}, ${a.name.split(' ')[0]} 👋`),
      h('h1', null, 'What will you ', h('span', { class: 'grad-text' }, 'create'), ' today?'),
      h('p', { class: 'hero-quote' }, `“${QUOTE}”`),
      h('div', { class: 'hero-actions' },
        btn('Create a design', { kind: 'primary', size: 'lg', icon: 'plus', onClick: () => createDialog() }),
        btn('Browse templates', { kind: 'ghost', size: 'lg', icon: 'grid', onClick: () => (location.hash = '#/templates') }))),
    h('div', { class: 'hero-art', 'aria-hidden': 'true' },
      h('div', { class: 'ha-card ha1' }, h('span', null, 'SALE')),
      h('div', { class: 'ha-card ha2' }, h('span', null, 'Hello!')),
      h('div', { class: 'ha-card ha3' }, fuzzyMark(70))));

  // daily bonus
  const daily = rewards.dailyStatus();
  const dailyCard = daily.available ? h('section', { class: 'daily' },
    h('div', { class: 'daily-ic' }, fuzzyMark(44)),
    h('div', { class: 'daily-text' }, h('b', null, `Daily bonus · day ${daily.streak}`), h('small', null, `Come back every day for bigger bonuses (up to 15).`)),
    btn(`Claim +${daily.amount}`, { kind: 'primary', onClick: (e) => {
      const n = rewards.claimDaily();
      if (n) (e.currentTarget as HTMLElement).closest('.daily')?.remove();
    } })) : null;

  const sizes = h('div', { class: 'quick-sizes' }, ...SIZE_PRESETS.slice(0, 10).map((p) => {
    const b = h('button', { class: 'qs', type: 'button' }, h('span', { class: 'qs-ic' }, p.icon), h('span', null, p.name));
    b.addEventListener('click', () => createBlank(p.name, p.w, p.h));
    return b;
  }), h('button', { class: 'qs', type: 'button', onclick: () => createDialog() }, h('span', { class: 'qs-ic' }, '➕'), h('span', null, 'Custom size')));

  const recent = h('div', { class: 'card-grid' });
  const recentSec = h('section', { class: 'sec' }, h('div', { class: 'sec-head' }, h('h2', null, 'Recent designs'), h('a', { href: '#/projects', class: 'link' }, 'See all')), recent);
  void db.listDesigns(a.id).then((list) => {
    if (!list.length) {
      recent.replaceWith(h('div', { class: 'empty' }, fuzzyMark(56), h('p', null, 'No designs yet — make your first one!'), btn('Start designing', { kind: 'primary', icon: 'plus', onClick: () => createDialog() })));
      return;
    }
    recent.append(...list.slice(0, 8).map((d) => designCard(d, () => homeScreenRefresh())));
  });

  const featured = h('div', { class: 'card-grid tpl' }, ...templates().slice(0, 10).map((t) => templateCard(t)));

  const game = h('section', { class: 'game-promo' },
    h('div', { class: 'gp-text' },
      h('p', { class: 'hero-kicker' }, 'Take a break'),
      h('h2', null, 'Fuzzy Crossing'),
      h('p', null, 'Hop across busy roads and rivers, collect Fuzzies and unlock templates, sticker packs, fonts, themes and more.'),
      h('div', { class: 'gp-stats' },
        h('span', null, icon('trophy', 16), ` Best ${a.stats.bestScore}`),
        h('span', null, fuzzyMark(16), ` ${a.stats.fuzziesFromGame} collected`)),
      btn('Play now', { kind: 'primary', size: 'lg', icon: 'play', onClick: () => (location.hash = '#/play') })),
    h('div', { class: 'gp-art', 'aria-hidden': 'true' }, ...['road', 'river', 'road'].map((k) => h('div', { class: `gp-lane ${k}` })), h('div', { class: 'gp-fuzzy' }, fuzzyMark(64))));

  const el = h('div', { class: 'page home' }, hero, dailyCard, missionsCard(),
    h('section', { class: 'sec' }, h('div', { class: 'sec-head' }, h('h2', null, 'Start something new')), sizes),
    recentSec, game,
    h('section', { class: 'sec' }, h('div', { class: 'sec-head' }, h('h2', null, 'Popular templates'), h('a', { href: '#/templates', class: 'link' }, 'Browse all')), featured));

  function homeScreenRefresh() { if (location.hash === '#/home' || location.hash === '') dispatchEvent(new HashChangeEvent('hashchange')); }
  return { el };
}
