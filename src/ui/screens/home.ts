/** Home: greeting, daily bonus, quick sizes, recent designs, featured templates and the game. */
import type { Screen } from '../app';
import { accounts } from '../../core/account';
import { rewards } from '../../core/rewards';
import { db } from '../../core/db';
import { SIZE_PRESETS } from '../../editor/doc';
import { templates } from '../../content/templates';
import { h, btn, icon, fuzzyMark } from '../dom';
import { openQuickFind } from '../quickfind';
import { createBlank, createDialog, useCatalogTemplate } from '../create';
import { designCard, templateCard } from './cards';
import { missionsCard } from '../missions';
import { mascot } from '../mascot';
import { crossingArt, landArt } from '../homeArt';
import { travel } from '../travel';
import { landIcon } from '../landIcons';

/** Topics in season, by month (Jan = 0) — Home shows these first until real usage numbers exist. */
const SEASON: string[][] = [
  ['new-year', 'lunar-new-year'], ['valentines', 'lunar-new-year', 'ramadan'], ['ramadan', 'eid-al-fitr', 'purim', 'holi'], ['easter', 'passover'],
  ['mothers-day', 'graduation'], ['fathers-day', 'graduation', 'wedding'], ['wedding', 'birthday'], ['back-to-school'],
  ['back-to-school', 'rosh-hashanah'], ['halloween', 'diwali', 'dia-de-los-muertos'], ['thanksgiving', 'diwali'], ['christmas', 'hanukkah', 'new-year', 'kwanzaa'],
];
/** A spread of everyday topics after the seasonal ones. */
const EVERYDAY = ['birthday', 'wedding', 'baby-shower', 'sale', 'hiring', 'grand-opening', 'graduation', 'quote', 'giveaway', 'presentation', 'concert', 'fundraiser'];

export function homeScreen(): Screen {
  const a = accounts.current!;
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  // Canva-style banner: one big question, one search box, round shortcuts for the most-used sizes
  const search = h('input', { class: 'home-search-input', type: 'search', placeholder: 'Search templates, sizes, designs', 'aria-label': 'Search', autocomplete: 'off' });
  // typing (or tapping, on phones) hands over to quick find, which searches everything as you type
  search.addEventListener('input', () => { const v = search.value; search.value = ''; search.blur(); openQuickFind(v); });
  // on touch, don't focus the box (no keyboard flash) — quick find opens on the click that ends the tap, so that same tap
  // can't land on one of its rows (opening on pointerdown let the click pick whatever row was under the finger)
  search.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') e.preventDefault(); });
  search.addEventListener('click', () => { search.blur(); openQuickFind(); });
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

  // a row of quiet placeholders until the library arrives (the classic cards only if it can't load)
  const featured = h('div', { class: 'lib-strip home-strip' }, ...Array.from({ length: 6 }, () => h('div', { class: 'lib-card', 'aria-hidden': 'true' }, h('div', { class: 'lib-thumb' }), h('div', { class: 'lib-meta' }, h('b', null, '\u00a0')))));
  const classic = () => { featured.className = 'card-grid tpl'; featured.replaceChildren(...templates().slice(0, 10).map((t) => templateCard(t))); };
  const featuredHead = h('h2', null, 'Popular templates');
  // the real library (lazy): what people use most, else what's in season + a spread of everyday topics
  void Promise.all([import('../../content/library/catalog'), import('../../content/library/usage'), import('../libthumbs')]).then(async ([c, u, t]) => {
    await u.loadStats().catch(() => null);
    const all = c.catalog();
    const byId = new Map(all.map((m) => [m.id, m]));
    const popular = u.usage.popular().map(([id]) => byId.get(id)).filter((m): m is NonNullable<typeof m> => !!m);
    const month = new Date().getMonth();
    const season = SEASON[month] ?? [];
    const pick = (sub: string, n: number) => all.filter((m) => m.sub === sub).sort((a, b) => Number(b.source === 'collection') - Number(a.source === 'collection')).slice(0, n);
    const list = popular.length >= 8 ? popular.slice(0, 12)
      : [...new Map([...season.flatMap((sub) => pick(sub, 3)), ...EVERYDAY.flatMap((sub) => pick(sub, 1))].map((m) => [m.id, m])).values()].slice(0, 12);
    if (!list.length) { classic(); return; }
    t.prefetch(list.slice(0, 6));
    featuredHead.textContent = popular.length >= 8 ? 'Popular templates' : season.length ? 'Templates for this season' : 'Templates for you';
    featured.replaceChildren(...list.map((m) => {
      const locked = !rewards.isUnlocked(m.id, m.cost);
      const topic = c.subById(m.sub)?.sub.label;
      const card = h('button', { type: 'button', class: `lib-card ${locked ? 'locked' : ''}`, title: locked ? `Unlock for ${m.cost} Fuzzies` : `Use “${m.name}”` },
        h('div', { class: 'lib-thumb' }, t.lazyThumb(m, 300),
          locked ? h('span', { class: 'lock-badge lg' }, icon('lock', 14), fuzzyMark(16), String(m.cost)) : null,
          h('span', { class: 'tcard-hover' }, locked ? 'Unlock' : 'Use template')),
        h('div', { class: 'lib-meta' }, h('b', null, m.name), h('small', null, [topic, m.formatLabel].filter(Boolean).join(' · '))));
      card.addEventListener('click', () => void useCatalogTemplate(m));
      return card;
    }));
  }).catch(classic);

  const game = h('section', { class: 'game-promo' },
    h('div', { class: 'gp-text' },
      h('p', { class: 'hero-kicker' }, 'Take a break'),
      h('h2', null, 'Fuzzy Crossing'),
      h('p', null, 'Hop across busy roads and rivers, collect Fuzzies and unlock templates, sticker packs, fonts, themes and more.'),
      h('div', { class: 'gp-stats' },
        h('span', null, icon('trophy', 16), ` Best ${a.stats.bestScore}`),
        h('span', null, fuzzyMark(16), ` ${a.stats.fuzziesFromGame} collected`)),
      btn('Play now', { kind: 'primary', size: 'lg', icon: 'play', onClick: () => (location.hash = '#/play') })),
    h('div', { class: 'gp-art', 'aria-hidden': 'true' }, crossingArt()));

  const land = a.land;
  const landCard = h('section', { class: 'land-promo' },
    h('div', { class: 'lp-art', 'aria-hidden': 'true' }, landArt()),
    h('div', null,
      h('p', { class: 'hero-kicker' }, 'Your town'),
      h('h2', null, 'Fuzzies Land'),
      h('p', null, 'Build houses, grow crops, bake treats and fill orders for the Fuzzies who live there. Level up to earn Fuzzies.'),
      h('div', { class: 'gp-stats' }, h('span', null, landIcon('star', 16), `Level ${land.level}`), h('span', null, landIcon('coin', 16), `${land.coins.toLocaleString()} coins`)),
      btn('Visit my town', { kind: 'primary', size: 'lg', icon: 'town', onClick: (e) => travel('#/land', 'Off to Fuzzies Land…', { x: e.clientX, y: e.clientY }) })));

  // your work first, then ideas, then play
  const el = h('div', { class: 'page home' }, banner, dailyCard, recentSec,
    h('section', { class: 'sec' }, h('div', { class: 'sec-head' }, featuredHead, h('a', { href: '#/templates', class: 'link' }, 'Browse all')), featured),
    h('section', { class: 'sec' }, h('div', { class: 'sec-head' }, h('h2', null, 'Play & earn Fuzzies')), h('div', { class: 'home-play' }, game, landCard)),
    h('section', { class: 'sec' }, missionsCard()));

  function homeScreenRefresh() { if (location.hash === '#/home' || location.hash === '') dispatchEvent(new HashChangeEvent('hashchange')); }
  return { el };
}
