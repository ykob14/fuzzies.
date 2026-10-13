/**
 * Shared "How to play" chrome for the mini-games: the intro card (goal, steps, controls for this device, scoring, a tip) that
 * every challenge shows before it starts, and a small coach line that drops hints at the right moments during play.
 */
import { h, btn } from './dom';
import type { Adventure, Variant } from '../land/adventures';

export interface IntroOpts { adv: Adventure; variant?: Variant | null; host: string; mobile: boolean; buttonLabel: string; onStart: () => void; extra?: string }
/** The intro overlay. Returns the overlay element (hide it with `hidden = true` when the game starts). */
export function introCard(o: IntroOpts): HTMLElement {
  const a = o.adv;
  const box = h('div', { class: 'forest-intro-box mg-intro-box' },
    h('span', { class: 'adv-kicker' }, `${a.emoji} ${o.host} says`),
    h('h2', null, a.name + (o.variant ? ` — ${o.variant.name}` : '')),
    h('p', { class: 'mg-goal' }, a.objective + (a.limit ? ` · ⏱ ${a.limit % 60 === 0 ? `${a.limit / 60} min` : `${a.limit} s`}` : '')),
    o.variant ? h('p', { class: 'mg-twist' }, `Today’s twist: ${o.variant.note}`) : null,
    h('ol', { class: 'mg-steps' }, ...a.howTo.map((t) => h('li', null, t))),
    h('div', { class: 'mg-controls' }, h('b', null, 'Controls'), h('span', null, o.mobile ? a.controls.mobile : a.controls.desktop)),
    h('div', { class: 'mg-controls' }, h('b', null, 'Scoring'), h('span', null, a.scoring)),
    o.extra ? h('p', { class: 'mg-extra' }, o.extra) : null,
    h('p', { class: 'mg-tip' }, `💡 ${a.tip}`),
    btn(o.buttonLabel, { kind: 'primary', size: 'lg', class: 'mg-start', onClick: o.onStart }));
  return h('div', { class: 'forest-intro mg-intro' }, box);
}

/** A coach line near the bottom of the screen: `say(text)` shows it for a few seconds; each `key` is said only once. */
export function coach(root: HTMLElement): { say: (key: string, text: string, ms?: number) => void; destroy: () => void } {
  const el = h('div', { class: 'mg-coach', role: 'status' });
  root.append(el);
  const said = new Set<string>();
  let timer = 0;
  return {
    say(key, text, ms = 3600) {
      if (said.has(key)) return;
      said.add(key);
      el.textContent = text;
      el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');
      clearTimeout(timer);
      timer = window.setTimeout(() => el.classList.remove('on'), ms);
    },
    destroy() { clearTimeout(timer); el.remove(); },
  };
}
