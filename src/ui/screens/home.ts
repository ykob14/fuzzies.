/** Home: greeting, daily bonus, quick sizes, recent designs, featured templates and the game. */
import type { Screen } from '../app';
import { accounts } from '../../core/account';
import { rewards } from '../../core/rewards';
import { db } from '../../core/db';
import { SIZE_PRESETS } from '../../editor/doc';
import { templates } from '../../content/templates';
import { h, btn, icon, fuzzyMark } from '../dom';
import { openQuickFind } from '../quickfind';
import { createBlank, createDialog } from '../create';
import { designCard, templateCard } from './cards';
import { missionsCard } from '../missions';
import { mascot } from '../mascot';
import { travel } from '../travel';

export function homeScreen(): Screen {
  const a = accounts.current!;
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  // Canva-style banner: one big question, one search box, round shortcuts for the most-used sizes
  const search = h('input', { class: 'home-search-input', type: 'search', placeholder: 'Search templates, sizes, designs', 'aria-label': 'Search', autocomplete: 'off' });
  // typing (or tapping, on phones) hands over to quick find, which searches everything as you type
  search.addEventListener('input', () => { const v = search.value; search.value = ''; search.blur(); openQuickFind(v); });
  search.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') { e.preventDefault(); openQuickFind(); } });
  const KINDS = ['ig-post', 'story', 'poster', 'presentation', 'yt-thumb', 'logo', 'invite'];
  const SHORT: Record<string, string> = { 'ig-post': 'Instagram', story: 'Story', 'yt-thumb': 'YouTube' };
  const kind = (label: string, w: number, hh: number, onClick: () => void, plus = false) => {
    const r = w / hh, bw = r >= 1 ? 26 : 26 * r, bh = r >= 1 ? 26 / r : 26;
    return h('button', { class: 'home-kind', type: 'button', onclick: onClick },
      h('span', { class: 'home-kind-ic' }, plus ? icon('plus', 24) : h('span', { class: 'home-kind-shape', style: `width:${bw.toFixed(1)}px;height:${bh.toFixed(1)}px` })),
      h('span', { class: 'home-kind-label' }, label));
  };
  const banner = h('section', { class: 'home-banner' },
    h('div', { class: 'home-banner-mascot', 'aria-hidden': 'true' }, mascot(76)),
    h('p', { class: 'home-banner-kicker' }, `${greet}, ${a.name.split(' ')[0]} 👋`),
    h('h1', null, 'What will you design today?'),
    h('label', { class: 'home-search' }, icon('search', 20), search),
    h('div', { class: 'home-kinds' },
      ...KINDS.map((id) => SIZE_PRESETS.find((p) => p.id === id)!).filter(Boolean).map((p) => kind(SHORT[p.id] ?? p.name, p.w, p.h, () => createBlank(p.name, p.w, p.h))),
      kind('Custom size', 1, 1, () => createDialog(), true)));

  // daily bonus
  const daily = rewards.dailyStatus();
  const dailyCard = daily.available ? h('section', { class: 'daily' },
    h('div', { class: 'daily-ic' }, fuzzyMark(44)),
    h('div', { class: 'daily-text' }, h('b', null, `Daily bonus · day ${daily.streak}`), h('small', null, `Come back every day for bigger bonuses (up to 15).`)),
    btn(`Claim +${daily.amount}`, { kind: 'primary', onClick: (e) => {
      const n = rewards.claimDaily();
      if (n) (e.currentTarget as HTMLElement).closest('.daily')?.remove();
    } })) : null;

  const recent = h('div', { class: 'card-grid' });
  const recentSec = h('section', { class: 'sec' }, h('div', { class: 'sec-head' }, h('h2', null, 'Recent designs'), h('a', { href: '#/projects', class: 'link' }, 'See all')), recent);
  void db.listDesigns(a.id).then((list) => {
    if (!list.length) {
      recent.replaceWith(h('div', { class: 'empty' }, mascot(64), h('p', null, 'No designs yet — make your first one!'), btn('Start designing', { kind: 'primary', icon: 'plus', onClick: () => createDialog() })));
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
    h('div', { class: 'gp-art', 'aria-hidden': 'true' }, ...['road', 'river', 'road'].map((k) => h('div', { class: `gp-lane ${k}` })), h('div', { class: 'gp-fuzzy' }, mascot(64))));

  const land = a.land;
  const landCard = h('section', { class: 'land-promo' },
    h('div', { class: 'lp-art', 'aria-hidden': 'true' }, h('span', null, '🏡'), h('span', null, '🌾'), h('span', null, '🍄'), h('span', null, '⛲')),
    h('div', null,
      h('p', { class: 'hero-kicker' }, 'Your town'),
      h('h2', null, 'Fuzzies Land'),
      h('p', null, 'Build houses, grow crops, bake treats and fill orders for the Fuzzies who live there. Level up to earn Fuzzies.'),
      h('div', { class: 'gp-stats' }, h('span', null, `⭐ Level ${land.level}`), h('span', null, `🪙 ${land.coins}`)),
      btn('Visit my town', { kind: 'primary', icon: 'town', onClick: (e) => travel('#/land', 'Off to Fuzzies Land…', { x: e.clientX, y: e.clientY }) })));

  // your work first, then ideas, then play
  const el = h('div', { class: 'page home' }, banner, dailyCard, recentSec,
    h('section', { class: 'sec' }, h('div', { class: 'sec-head' }, h('h2', null, 'Popular templates'), h('a', { href: '#/templates', class: 'link' }, 'Browse all')), featured),
    h('section', { class: 'sec' }, h('div', { class: 'sec-head' }, h('h2', null, 'Play & earn Fuzzies')), h('div', { class: 'home-play' }, game, landCard)),
    h('section', { class: 'sec' }, missionsCard()));

  function homeScreenRefresh() { if (location.hash === '#/home' || location.hash === '') dispatchEvent(new HashChangeEvent('hashchange')); }
  return { el };
}
