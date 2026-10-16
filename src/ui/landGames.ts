/** The Games panel in Fuzzies Land: every game in one place — Fuzzy Crossing, Parking Escape and today's challenges. */
import { h } from './dom';
import { landIcon, gameIcon } from './landIcons';
import * as A from '../land/adventures';
import type { LandState } from '../land/rules';
import { accounts } from '../core/account';
import './landGames.css';

export interface GamesActions { crossing: () => void; parking: () => void; challenges: () => void; collection: (panel: 'locker' | 'pass' | 'shop' | 'leaderboard' | 'missions') => void }

export function gamesBody(s: LandState, now: number, go: GamesActions): HTMLElement {
  const st = A.setStatus(s, now);
  const best = accounts.current?.stats.bestScore ?? 0;
  const lot = s.parking?.top ?? 1;
  const card = (cls: string, art: Node, kicker: string, title: string, sub: string, label: string, onClick: () => void) =>
    h('button', { class: `lg-card ${cls}`, type: 'button', onclick: onClick },
      h('span', { class: 'lg-art' }, art),
      h('span', { class: 'lg-text' }, h('small', null, kicker), h('b', null, title), h('em', null, sub)),
      h('span', { class: 'lg-go' }, label, landIcon('chevRight', 16)));
  const crossing = card('lg-crossing', h('img', { src: '/art/home/crossing.webp', alt: '', decoding: 'async' }),
    'Hop & collect', 'Fuzzy Crossing', best ? `Best ${best.toLocaleString()} · worlds, endless, events` : 'Worlds, endless runs, events and rewards', 'Play', go.crossing);
  const parking = card('lg-parking', h('span', { class: 'lg-ic' }, landIcon('car', 56)),
    'Puzzle', 'Parking Escape', `Level ${lot} of 500 · challenges, timed, holidays`, 'Play', go.parking);
  const left = st.ready ? 'New missions are ready!' : st.allDone ? 'All done today — more soon' : `${st.doneCount} of ${st.total} done`;
  const daily = card('lg-daily', h('span', { class: 'lg-ic row' }, ...A.today(s, now).list.slice(0, 3).map(({ adventure }) => h('span', { class: 'land-gtile' }, gameIcon(adventure.id, 34)))),
    'Daily challenges', 'Today’s missions', left, 'Open', go.challenges);
  // collecting Fuzzies (moved out of the Fuzzy Crossing lobby): the card opens the Locker, the chips go straight to the rest
  const chip = (label: string, panel: 'pass' | 'shop' | 'leaderboard' | 'missions') =>
    h('button', { class: 'lg-chip', type: 'button', onclick: (e: MouseEvent) => { e.stopPropagation(); go.collection(panel); } }, label);
  const collection = h('div', { class: 'lg-card lg-collect', role: 'button', tabindex: '0', onclick: () => go.collection('locker'), onkeydown: (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go.collection('locker'); } } },
    h('span', { class: 'lg-art' }, h('img', { src: '/art/friends/f01.webp', alt: '', decoding: 'async' })),
    h('span', { class: 'lg-text' }, h('small', null, 'Collect & dress up'), h('b', null, 'Fuzzy Collection'), h('em', null, 'Win new Fuzzies, outfits and trails by playing')),
    h('span', { class: 'lg-go' }, 'Open', landIcon('chevRight', 16)),
    h('span', { class: 'lg-chips' }, chip('Fuzzy Pass', 'pass'), chip('Shop', 'shop'), chip('Missions', 'missions'), chip('Boards', 'leaderboard')));
  return h('div', { class: 'lg-wrap' },
    daily, crossing, parking, collection,
    h('p', { class: 'lg-note' }, 'Finish games to earn coins, XP and Fuzzies for your town.'));
}
