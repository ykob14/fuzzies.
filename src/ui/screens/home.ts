/**
 * Home: the one screen that says what Fuzzies is. In order of what people come for —
 * jump back in (your last design / game), the games, create, today (bonus + missions), what's on (seasonal event),
 * and your collections. Each section shows a little and links to the rest (no wall of everything).
 */
import type { Screen } from '../app';
import { accounts } from '../../core/account';
import { rewards } from '../../core/rewards';
import { db } from '../../core/db';
import { recentList, type RecentItem } from '../../core/recent';
import { SIZE_PRESETS } from '../../editor/doc';
import type { Design } from '../../editor/types';
import { templates } from '../../content/templates';
import { h, btn, icon, fuzzyMark, type IconName } from '../dom';
import { openQuickFind } from '../quickfind';
import { createBlank, createDialog, useCatalogTemplate } from '../create';
import { templateCard } from './cards';
import { missionsCard } from '../missions';
import { mascot } from '../mascot';
import { travel } from '../travel';
import { landIcon, type LandIcon } from '../landIcons';
import { timeAgo } from '../../core/util';
import { activeOccurrences } from '../../crossing/events';
import { EVENT_NAME } from '../../crossing/characters';
import { EVENTS } from '../../crossing/eventData';

/** Topics in season, by month (Jan = 0) — Home shows these first until real usage numbers exist. */
const SEASON: string[][] = [
  ['new-year', 'lunar-new-year'], ['valentines', 'lunar-new-year', 'ramadan'], ['ramadan', 'eid-al-fitr', 'purim', 'holi'], ['easter', 'passover'],
  ['mothers-day', 'graduation'], ['fathers-day', 'graduation', 'wedding'], ['wedding', 'birthday'], ['back-to-school'],
  ['back-to-school', 'rosh-hashanah'], ['halloween', 'diwali', 'dia-de-los-muertos'], ['thanksgiving', 'diwali'], ['christmas', 'hanukkah', 'new-year', 'kwanzaa'],
];
/** A spread of everyday topics after the seasonal ones. */
const EVERYDAY = ['birthday', 'wedding', 'baby-shower', 'sale', 'hiring', 'grand-opening', 'graduation', 'quote', 'giveaway', 'presentation', 'concert', 'fundraiser'];

/** where each game lives (Fuzzy Crossing and Parking Escape are reached through the town too) */
const GAME_HASH = { land: '#/land', crossing: '#/play', parking: '#/land/parking' } as const;
type Game = keyof typeof GAME_HASH;

export function homeScreen(): Screen {
  const a = accounts.current!;
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const go = (g: Game, e?: MouseEvent) => travel(GAME_HASH[g], g === 'crossing' ? 'Off to Fuzzy Crossing…' : g === 'parking' ? 'Off to Parking Escape…' : 'Off to Fuzzies Land…', e ? { x: e.clientX, y: e.clientY } : undefined);

  // ---- the banner: one question, one search box, the two big doors (play / create) ----
  const search = h('input', { class: 'home-search-input', type: 'search', placeholder: 'Search templates, games, designs', 'aria-label': 'Search', autocomplete: 'off' });
  // typing (or tapping, on phones) hands over to quick find, which searches everything as you type
  search.addEventListener('input', () => { const v = search.value; search.value = ''; search.blur(); openQuickFind(v); });
  // on touch, don't focus the box (no keyboard flash) — quick find opens on the click that ends the tap, so that same tap
  // can't land on one of its rows (opening on pointerdown let the click pick whatever row was under the finger)
  search.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') e.preventDefault(); });
  search.addEventListener('click', () => { search.blur(); openQuickFind(); });
  const bm = h('div', { class: 'home-banner-mascot', 'aria-hidden': 'true' }, mascot(76));
  const banner = h('section', { class: 'home-banner hb2' },
    bm,
    h('p', { class: 'home-banner-kicker' }, `${greet}, ${a.name.split(' ')[0]}`),
    h('h1', null, 'What will you play or make today?'),
    h('label', { class: 'home-search' }, icon('search', 20), search),
    h('div', { class: 'home-doors' },
      h('button', { class: 'home-door', type: 'button', onclick: (e: MouseEvent) => go('land', e) }, h('span', { class: 'home-door-ic' }, icon('play', 22)), h('span', null, h('b', null, 'Play'), h('small', null, 'Games & your town'))),
      h('button', { class: 'home-door', type: 'button', onclick: () => createDialog() }, h('span', { class: 'home-door-ic' }, icon('plus', 22)), h('span', null, h('b', null, 'Create'), h('small', null, 'Posters, posts & more')))));
  // the banner Fuzzy turns toward your mouse, and sends up hearts when you tap it
  banner.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || document.documentElement.dataset.motion === 'reduce') return;
    const r = bm.getBoundingClientRect();
    const dx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / 500));
    bm.style.setProperty('--tilt', `${(dx * 9).toFixed(1)}deg`);
  });
  bm.addEventListener('click', () => {
    if (document.documentElement.dataset.motion === 'reduce') return;
    for (let i = 0; i < 6; i++) {
      const hr = h('span', { class: 'home-heart', style: `--dx:${((Math.random() - 0.5) * 90).toFixed(0)}px;--dl:${i * 80}ms` }, '♥');
      bm.append(hr); setTimeout(() => hr.remove(), 1500);
    }
  });

  // ---- jump back in: the last few things you opened on this device (hidden until there is something) ----
  const recent = recentList();
  const resumeRow = h('div', { class: 'home-resume' });
  const resumeSec = h('section', { class: 'sec home-sec', hidden: true }, h('div', { class: 'sec-head' }, h('h2', null, 'Jump back in')), resumeRow);
  const parking = a.land.parking;
  const resumeTile = (pic: HTMLElement, title: string, sub: string, onClick: (e: MouseEvent) => void) =>
    h('button', { class: 'home-rtile', type: 'button', onclick: onClick }, h('span', { class: 'home-rtile-pic' }, pic), h('span', { class: 'home-rtile-t' }, h('b', null, title), h('small', null, sub)), h('span', { class: 'home-rtile-go', 'aria-hidden': 'true' }, icon('chevR', 18)));
  const gameTile = (r: RecentItem): HTMLElement | null => {
    if (r.kind === 'land') return resumeTile(h('img', { src: '/art/home/land.webp', alt: '' }), 'Fuzzies Land', `Level ${a.land.level} · ${a.land.coins.toLocaleString()} coins`, (e) => go('land', e));
    if (r.kind === 'crossing') return resumeTile(h('img', { src: '/art/home/crossing.webp', alt: '' }), 'Fuzzy Crossing', a.stats.bestScore ? `Best score ${a.stats.bestScore.toLocaleString()}` : 'Hop across the road', (e) => go('crossing', e));
    if (r.kind === 'parking') return resumeTile(h('img', { src: '/art/home/parking.webp', alt: '' }), 'Parking Escape', parking ? `Level ${parking.cur}` : 'Free the star car', (e) => go('parking', e));
    return null;
  };
  const designsHead = h('div', { class: 'sec-sub', hidden: true }, h('h3', null, 'Your designs'), h('a', { href: '#/projects', class: 'link' }, 'See all'));
  const designsRow = h('div', { class: 'home-designs' });
  void db.listDesigns(a.id).then((list) => {
    const byId = new Map(list.map((d) => [d.id, d]));
    const designTile = (d: Design) => resumeTile(d.thumb ? h('img', { src: d.thumb, alt: '' }) : h('span', { class: 'thumb-ph' }, fuzzyMark(28)), d.name, `Design · edited ${timeAgo(d.updatedAt)}`, () => (location.hash = `#/edit/${d.id}`));
    const tiles = recent.map((r) => (r.kind === 'design' ? (r.id && byId.get(r.id) ? designTile(byId.get(r.id)!) : null) : gameTile(r))).filter((t): t is HTMLElement => !!t);
    // your newest design always gets a place, even if it was last opened on another device
    if (list[0] && !recent.some((r) => r.kind === 'design' && r.id === list[0].id)) tiles.push(designTile(list[0]));
    resumeRow.replaceChildren(...tiles.slice(0, 3));
    resumeSec.hidden = !tiles.length;
    // the Create section: your designs first when you have some
    if (list.length) {
      designsHead.hidden = false;
      designsRow.replaceChildren(...list.slice(0, 6).map((d) => h('a', { class: 'home-dthumb', href: `#/edit/${d.id}`, title: d.name },
        h('span', { class: 'home-dthumb-pic', style: `aspect-ratio:${Math.max(0.6, Math.min(1.6, d.width / d.height))}` }, d.thumb ? h('img', { src: d.thumb, alt: '', loading: 'lazy' }) : fuzzyMark(28)),
        h('small', null, d.name))));
    }
  });

  // ---- the games: three big picture cards ----
  const gameCard = (g: Game, pic: string, title: string, line: string, ic: LandIcon, stat: string) => {
    const card = h('button', { class: `home-game hg-${g}`, type: 'button' },
      h('span', { class: 'home-game-pic' }, h('img', { src: pic, alt: '', loading: 'lazy', decoding: 'async' })),
      h('span', { class: 'home-game-body' },
        h('span', { class: 'home-game-ic', 'aria-hidden': 'true' }, landIcon(ic, 26)),
        h('span', { class: 'home-game-t' }, h('b', null, title), h('small', null, line)),
        h('span', { class: 'home-game-stat' }, stat)));
    card.addEventListener('click', (e) => go(g, e));
    return card;
  };
  const gamesSec = h('section', { class: 'sec home-sec' },
    h('div', { class: 'sec-head' }, h('h2', null, 'Games'), h('a', { href: '#/land/games', class: 'link' }, 'All games')),
    h('div', { class: 'home-games' },
      gameCard('land', '/art/home/land.webp', 'Fuzzies Land', 'Build your own town and play daily challenges', 'house', `Level ${a.land.level}`),
      gameCard('crossing', '/art/home/crossing.webp', 'Fuzzy Crossing', 'Hop your Fuzzy safely across roads and rivers', 'star', a.stats.bestScore ? `Best ${a.stats.bestScore.toLocaleString()}` : 'New'),
      gameCard('parking', '/art/home/parking.webp', 'Parking Escape', 'Slide the cars and free the star car', 'car', parking ? `Level ${parking.cur}` : '500 levels')));

  // ---- create: quick sizes, your designs, templates in season ----
  const SHORT: Record<string, string> = { 'ig-post': 'Instagram', story: 'Story', 'yt-thumb': 'YouTube' };
  const kind = (label: string, w: number, hh: number, onClick: () => void, plus = false) => {
    const r = w / hh, bw = r >= 1 ? 24 : 24 * r, bh = r >= 1 ? 24 / r : 24;
    return h('button', { class: 'home-kind', type: 'button', onclick: onClick },
      h('span', { class: 'home-kind-ic' }, plus ? icon('plus', 22) : h('span', { class: 'home-kind-shape', style: `width:${bw.toFixed(1)}px;height:${bh.toFixed(1)}px` })),
      h('span', { class: 'home-kind-label' }, label));
  };
  const kinds = h('div', { class: 'home-kinds hk2' },
    ...['ig-post', 'story', 'poster', 'presentation', 'yt-thumb', 'logo', 'invite'].map((id) => SIZE_PRESETS.find((p) => p.id === id)).filter((p): p is NonNullable<typeof p> => !!p)
      .map((p) => kind(SHORT[p.id] ?? p.name, p.w, p.h, () => createBlank(p.name, p.w, p.h))),
    kind('Custom size', 1, 1, () => createDialog(), true));

  // a row of quiet placeholders until the library arrives (the classic cards only if it can't load)
  const featured = h('div', { class: 'lib-strip home-strip' }, ...Array.from({ length: 6 }, () => h('div', { class: 'lib-card', 'aria-hidden': 'true' }, h('div', { class: 'lib-thumb' }), h('div', { class: 'lib-meta' }, h('b', null, ' ')))));
  const classic = () => { featured.className = 'card-grid tpl'; featured.replaceChildren(...templates().slice(0, 10).map((t) => templateCard(t))); };
  const featuredHead = h('h3', null, 'Templates for you');
  // the real library (lazy): what people use most, else what's in season + a spread of everyday topics
  void Promise.all([import('../../content/library/catalog'), import('../../content/library/usage'), import('../libthumbs')]).then(async ([c, u, t]) => {
    await u.loadStats().catch(() => null);
    const all = c.catalog();
    const byId = new Map(all.map((m) => [m.id, m]));
    const popular = u.usage.popular().map(([id]) => byId.get(id)).filter((m): m is NonNullable<typeof m> => !!m);
    const season = SEASON[new Date().getMonth()] ?? [];
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
  const createSec = h('section', { class: 'sec home-sec' },
    h('div', { class: 'sec-head' }, h('h2', null, 'Create'), h('a', { href: '#/templates', class: 'link' }, 'All templates')),
    kinds, designsHead, designsRow,
    h('div', { class: 'sec-sub' }, featuredHead, h('a', { href: '#/templates', class: 'link' }, 'Browse')), featured);

  // ---- today: the daily bonus (when it's waiting) and the three missions ----
  const daily = rewards.dailyStatus();
  const dailyCard = daily.available ? h('div', { class: 'daily' },
    h('div', { class: 'daily-ic' }, fuzzyMark(40)),
    h('div', { class: 'daily-text' }, h('b', null, `Daily bonus · day ${daily.streak}`), h('small', null, 'A free gift every day you visit.')),
    btn(`Claim +${daily.amount}`, { kind: 'primary', onClick: (e) => {
      const n = rewards.claimDaily();
      if (n) (e.currentTarget as HTMLElement).closest('.daily')?.remove();
    } })) : null;
  const todaySec = h('section', { class: 'sec home-sec' }, h('div', { class: 'sec-head' }, h('h2', null, 'Today')), dailyCard, missionsCard());

  // ---- what's on: a seasonal event in Fuzzy Crossing (only while one runs) ----
  const ev = activeOccurrences()[0];
  const eventSec = ev ? (() => {
    const def = EVENTS[ev.id], days = Math.max(1, Math.ceil((ev.endsAt - Date.now()) / 86400000));
    const card = h('a', { class: 'home-event', href: '#/play/events', style: `--ev:${def.theme.palette[0]};--ev-dk:${def.theme.palette[1]};--ev-lt:${def.theme.palette[2]}` },
      h('span', { class: 'home-event-ic', 'aria-hidden': 'true' }, def.theme.icon),
      h('span', { class: 'home-event-t' }, h('small', null, 'On now'), h('b', null, `${EVENT_NAME[ev.id]} in Fuzzy Crossing`), h('span', null, `Challenges and keepsakes · ${days === 1 ? 'last day' : `${days} days left`}`)),
      h('span', { class: 'home-event-go' }, 'See it', icon('chevR', 16)));
    return h('section', { class: 'sec home-sec' }, card);
  })() : null;

  // ---- your collections: three quiet doors ----
  const door = (href: string, ic: IconName, title: string, sub: string) => h('a', { class: 'home-col', href }, h('span', { class: 'home-col-ic' }, icon(ic, 22)), h('span', null, h('b', null, title), h('small', null, sub)));
  const collectSec = h('section', { class: 'sec home-sec' },
    h('div', { class: 'sec-head' }, h('h2', null, 'Collections & rewards')),
    h('div', { class: 'home-cols' },
      door('#/play/locker', 'star', 'Fuzzy Collection', 'Characters you’ve unlocked'),
      door('#/rewards', 'gift', 'Rewards', `${rewards.balance().toLocaleString()} Fuzzies to spend`),
      door('#/profile', 'trophy', 'Badges', 'Your achievements')));

  const el = h('div', { class: 'page home home2' }, banner, resumeSec, gamesSec, createSec, todaySec, eventSec, collectSec);
  return { el };
}
