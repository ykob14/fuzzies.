/**
 * Endless Crossing — the screen: today's road (the same for everyone that UTC day), a free run, your records, the Fuzzies you win by
 * distance and what you meet further down the road. Starting a run calls ctx.play({ kind: 'endless', daily }).
 */
import { h, icon, fuzzyMark } from '../../ui/dom';
import type { PanelOpen } from '../hub';
import * as store from '../store';
import { CHARACTER_BY_ID } from '../characters';
import { FAMILIES, LEGEND_FROM, ROWS_PER_STRETCH, endlessRewards, msToNextDaily, utcDay, MAX_LIVES, LIFE_EVERY } from '../endless';
import { friendUrl } from '../../content/friends';
import { coinMark, rarityTag } from './kit';
import './endless.css';

const countdown = (ms: number): string => { const m = Math.max(1, Math.ceil(ms / 60000)); return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m} min`; };

export const open: PanelOpen = (ctx) => {
  const render = (): void => {
    const e = store.save().endless;
    const day = utcDay();
    const today = e.today.day === day ? e.today : { day, best: 0, runs: 0 };
    const rewards = endlessRewards();

    const daily = h('section', { class: 'fze-card fze-daily' },
      h('div', { class: 'fze-card-top' }, h('span', { class: 'fze-tag' }, '📅 Daily road'), h('small', { class: 'fze-reset' }, `New road in ${countdown(msToNextDaily())}`)),
      h('b', { class: 'fze-card-t' }, "Today's road"),
      h('p', { class: 'muted' }, 'The same road for everybody today. Run it as often as you like — your farthest run counts.'),
      h('div', { class: 'fze-today' },
        h('div', null, h('small', null, 'Best today'), h('b', null, today.best ? `${today.best} rows` : '—')),
        h('div', null, h('small', null, 'Runs today'), h('b', null, String(today.runs)))),
      btnPlay("Play today's road", () => ctx.play({ kind: 'endless', daily: true })));

    const free = h('section', { class: 'fze-card fze-free' },
      h('div', { class: 'fze-card-top' }, h('span', { class: 'fze-tag' }, '🎲 Free run')),
      h('b', { class: 'fze-card-t' }, 'A road of your own'),
      h('p', { class: 'muted' }, `A fresh road every time. ${MAX_LIVES} lives, and a spare one every ${LIFE_EVERY} stretches.`),
      btnPlay('Start a free run', () => ctx.play({ kind: 'endless' })));

    const stat = (label: string, value: Node | string) => h('div', { class: 'fze-stat' }, h('small', null, label), h('b', null, value));
    const records = h('section', { class: 'fze-records', 'aria-label': 'Your records' },
      stat('Farthest', `${e.best} rows`),
      stat('Runs', String(e.runs)),
      stat('Most coins', h('span', { class: 'fzx-amt' }, coinMark(15), String(e.bestCoins))));

    const ladder = h('section', { class: 'fze-block' },
      h('h3', null, 'Fuzzies you win by distance'),
      ...rewards.map((r) => {
        const c = CHARACTER_BY_ID[r.id];
        const got = store.hasCharacter(r.id);
        const pct = Math.min(100, Math.round((e.best / r.rows) * 100));
        const row = h('button', { class: `fze-reward ${got ? 'got' : ''}`, type: 'button', 'aria-label': `${c.name}: ${got ? 'unlocked' : `reach ${r.rows} rows`}` },
          c.friend ? h('img', { class: 'fze-reward-pic', src: friendUrl(c.friend), alt: '', width: 48, height: 48 }) : h('span', { class: 'fze-reward-pic' }, fuzzyMark(44, c.color)),
          h('span', { class: 'fze-reward-t' },
            h('b', null, c.name),
            h('small', null, got ? 'Unlocked ✓' : `Reach ${r.rows} rows · you: ${Math.min(e.best, r.rows)}`),
            got ? null : h('i', { class: 'fzx-passbar-track' }, h('i', { style: `width:${pct}%` }))),
          rarityTag(c.rarity));
        row.addEventListener('click', () => ctx.go({ to: 'locker', id: r.id }));
        return row;
      }));

    // what you meet where (one entry per look; the first stretch it can appear in)
    const meets = FAMILIES.map((f) => ({ f, from: Math.min(...[...f.land, ...f.water].map(([, n]) => n)) })).sort((a, b) => a.from - b.from);
    const road = h('section', { class: 'fze-block' },
      h('h3', null, "What's on the road"),
      h('p', { class: 'muted fze-small' }, 'New lanes appear one at a time the farther you go. Every stretch is checked to be crossable before you get there.'),
      h('ol', { class: 'fze-road' },
        ...meets.map(({ f, from }) => {
          const rows = from * ROWS_PER_STRETCH;
          const seen = e.best >= rows && !(from === 0);
          return h('li', { class: e.best >= rows ? 'seen' : '' }, h('span', { class: 'fze-road-rows' }, rows === 0 ? 'Start' : `${rows}+`), h('span', null, f.label), seen ? h('i', null, '✓') : null);
        }),
        h('li', { class: e.best >= LEGEND_FROM * ROWS_PER_STRETCH ? 'seen' : '' }, h('span', { class: 'fze-road-rows' }, `${LEGEND_FROM * ROWS_PER_STRETCH}+`), h('span', null, 'Everything at once'))));

    ctx.root.replaceChildren(h('div', { class: 'fze' },
      h('div', { class: 'fze-head' }, h('div', null, h('h3', null, 'How far can you hop?'), h('p', { class: 'muted' }, 'The road never ends and gets trickier the farther you go.'))),
      h('div', { class: 'fze-cards' }, daily, free),
      records, ladder, road));
  };
  const btnPlay = (label: string, on: () => void): HTMLElement => {
    const b = h('button', { class: 'btn btn-primary btn-lg btn-block', type: 'button' }, icon('play', 18), h('span', null, label));
    b.addEventListener('click', on);
    return b;
  };
  render();
  const onChange = () => render();
  addEventListener('fz:crossing', onChange);
  const tick = window.setInterval(() => { const el = ctx.root.querySelector('.fze-reset'); if (el) el.textContent = `New road in ${countdown(msToNextDaily())}`; }, 30000);
  return () => { removeEventListener('fz:crossing', onChange); clearInterval(tick); };
};
