/** The "run over" screen: one big score, three small numbers, what you earned, Play again. No lists, no paragraphs. */
import { h, fuzzyMark } from '../../ui/dom';
import { friendUrl } from '../../content/friends';
import type { CharacterDef } from '../characters';
import { coinMark } from './kit';
import { gicon, gtile } from './gicons';
import './gameui.css';
import './lobby.css';
import './results.css';

export interface ResultsOpts {
  me: CharacterDef;
  isBest: boolean;
  score: number;
  best: number;
  level: number;
  nests: number;
  coins: number;
  xp: number;
  pass: { level: number; pct: number; leveledUp: boolean; claimable: number };
  /** the weekly boards line (a button) when there is one */
  boards: HTMLElement | null;
  again(): void;
  menu(): void;
  openPass(): void;
  toLand(e: MouseEvent): void;
}

export function renderResults(o: ResultsOpts): HTMLElement {
  const pic = o.me.friend
    ? h('img', { class: 'fzx-rs-fuzzy', src: friendUrl(o.me.friend), alt: '', width: 120, height: 120, draggable: 'false' })
    : h('span', { class: 'fzx-rs-fuzzy' }, fuzzyMark(120, o.me.color));
  const stat = (ic: Parameters<typeof gtile>[0], label: string, value: string, cls = ''): HTMLElement =>
    h('div', { class: `fzx-rs-stat fzx-card ${cls}` }, gtile(ic, 38, cls === 'gold' ? 'gold' : 'soft'), h('b', null, value), h('small', null, label));
  const pass = h('button', { class: `fzx-rs-pass fzx-card ${o.pass.claimable ? 'ready' : ''}`, type: 'button', onclick: o.openPass },
    h('span', { class: 'fzx-lvl-ring', style: `--p:${o.pass.pct}` }, h('b', null, String(o.pass.level))),
    h('span', { class: 'fzx-rs-pt' }, h('b', null, o.pass.leveledUp ? `Level up! Pass level ${o.pass.level}` : 'Fuzzy Pass'), h('i', { class: 'fzx-lvl-bar wide' }, h('u', { style: `width:${o.pass.pct}%` }))),
    h('span', { class: 'fzx-chip xp' }, gicon('star', 14), `+${o.xp}`),
    o.pass.claimable ? h('i', { class: 'fzx-new' }) : null);
  const kids: (HTMLElement | null)[] = [
    h('div', { class: 'fzx-rs-top' }, pic, h('h2', null, o.isBest ? 'New best!' : 'Nice run!')),
    h('div', { class: 'fzx-rs-score' }, h('small', null, 'Score'), h('b', null, o.score.toLocaleString()), o.isBest ? h('span', { class: 'fzx-chip xp' }, gicon('trophy', 15), 'Personal best') : h('span', { class: 'fzx-chip' }, `Best ${o.best.toLocaleString()}`)),
    h('div', { class: 'fzx-rs-stats' }, stat('flag', 'Level', String(o.level)), stat('nest', 'Nests', String(o.nests)), stat('coin', 'Coins', `+${o.coins}`, 'gold')),
    pass,
    o.boards,
    h('button', { class: 'fzx-play', type: 'button', onclick: o.again }, gicon('play', 26), h('span', null, 'Play again')),
    h('div', { class: 'fzx-rs-sec' },
      h('button', { class: 'fzx-sbtn', type: 'button', onclick: o.menu }, gicon('fuzzy', 18), 'Menu'),
      h('button', { class: 'fzx-sbtn', type: 'button', onclick: o.toLand }, gicon('town', 18), 'Fuzzies Land')),
  ];
  void coinMark;
  return h('div', { class: 'fzx-lobby fzx-results' }, ...kids.filter((x): x is HTMLElement => !!x));
}
