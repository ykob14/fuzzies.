/**
 * The results screens after a mini-game, in the Fuzzy Crossing "run over" language: the Fuzzy on a glowing stage with the tier's
 * medal, a big title, the score counting up, a few small stat tiles, what you earned as chips, the trophy line, the final
 * standings when town Fuzzies played against you — and ONE big button. A finished mission has no replay (the "once a day means
 * once" rule): `onAgain` is only drawn when the caller passes it.
 * `landAdventure.ts` keeps the option types and exports `resultsScreen` / `scoreResults`, which call these.
 */
import { h } from './dom';
import { faceOf } from './mgIntro';
import { gameTile, mgIcon, medalGraphic } from '../land/mgIcons';
import { gicon } from '../crossing/ui/gicons';
import * as A from '../land/adventures';
import type { ResultOpts, ScoreResultOpts, TrophyNote } from './landAdventure';
import '../crossing/ui/gameui.css';
import '../land/mgSkin.css';

const HERO = `${import.meta.env.BASE_URL}art/fuzzy-hero.webp`;
const fmtScore = (n: number): string => n.toLocaleString();

/** the Fuzzy on its stage (glow rays), with the tier medal hanging off its corner */
function stage(place: number, medalSize = 64): HTMLElement {
  return h('div', { class: 'mg-rs-stage' },
    h('i', { class: 'mg-rays' }),
    h('img', { class: 'mg-rs-hero', src: HERO, alt: '', width: 120, height: 120, draggable: 'false' }),
    h('span', { class: 'mg-rs-medal' }, medalGraphic(place, medalSize)));
}

/** the score, counting up (instantly with Reduce motion, and always settled a moment after) */
function countUp(el: HTMLElement, to: number, ms = 950): void {
  const reduce = document.documentElement.dataset.motion === 'reduce';
  el.dataset.score = String(to);
  if (reduce || to <= 0) { el.textContent = fmtScore(to); return; }
  el.textContent = '0';
  const t0 = performance.now();
  const tick = (t: number) => {
    const k = Math.min(1, (t - t0) / ms);
    el.textContent = fmtScore(Math.round(to * (1 - Math.pow(1 - k, 3))));
    if (k < 1 && el.isConnected) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  setTimeout(() => { el.textContent = fmtScore(to); }, ms + 400);
}

const chip = (cls: string, ...kids: (Node | string | null)[]): HTMLElement => h('span', { class: `mg-chip ${cls}` }, ...kids);

/** what the run earned: coins, XP, a level-up — or why it didn't pay */
function rewardChips(payout: A.Payout | null, pending: boolean): HTMLElement | null {
  if (payout?.practice) return h('p', { class: 'mg-rs-note' }, mgIcon('info', 18), h('span', null, 'Practice run — this mission’s reward was already collected.'));
  if (pending) return h('p', { class: 'mg-rs-note' }, mgIcon('info', 18), h('span', null, 'You’re offline — your reward will be added when you’re back online.'));
  if (!payout) return null;
  return h('div', { class: 'mg-rs-earn' },
    chip('c-money big', gicon('coin', 24), h('b', null, `+${payout.coins} coins`)),
    chip('c-xp', gicon('star', 15), h('b', null, `+${payout.xp} XP`)),
    ...(payout.levelUps.length ? [chip('c-lvl', gicon('flag', 15), h('b', null, `Level ${payout.levelUps[payout.levelUps.length - 1]}!`))] : []));
}

/** a trophy earned or upgraded by this run (see land/trophies.ts) */
function trophyLine(t: TrophyNote | null | undefined): HTMLElement | null {
  if (!t || (!t.isNew && !t.upgraded)) return null;
  return h('div', { class: `adv-trophy m-${t.metal.toLowerCase()}` },
    t.img ? h('img', { src: t.img, alt: '' }) : h('span', { class: 'adv-trophy-cup' }, gicon('trophy', 34)),
    h('span', null, h('small', null, t.isNew ? 'New trophy!' : 'Trophy upgraded!'), h('b', null, `${t.name} · ${t.metal}`), h('i', null, t.isNew ? 'Place it in your town: Build → Decor' : 'It shines in your town already')));
}

const nextLine = (adv: A.Adventure, payout: A.Payout | null, next?: string): HTMLElement | null =>
  payout && !payout.practice ? h('p', { class: 'adv-next' }, mgIcon('check', 16), h('span', null, `${adv.short} completed. ${next ?? ''}`)) : null;

/** the one big button (+ Play again where allowed) */
function actions(back: () => void, again: (() => void) | undefined, againLabel: string): HTMLElement {
  const backBtn = (primary: boolean): HTMLElement => h('button', { class: `btn ${primary ? 'btn-primary fzx-bigbtn' : 'btn-soft fzx-sbtn'} adv-back`, type: 'button', onclick: back }, mgIcon('town', primary ? 24 : 20), h('span', null, 'Back to town'));
  if (!again) return h('div', { class: 'mg-rs-actions' }, backBtn(true));
  return h('div', { class: 'mg-rs-actions' },
    h('button', { class: 'btn btn-primary fzx-bigbtn mg-again', type: 'button', onclick: again }, mgIcon('play', 24), h('span', null, againLabel)),
    backBtn(false));
}

/** your own portrait: the owner's pink Fuzzy */
function youFace(size: number): HTMLElement {
  const f = h('span', { class: 'mg-face', title: 'You' }, h('img', { src: HERO, alt: '', width: size, height: size, draggable: 'false' }));
  f.style.setProperty('--sz', `${size}px`);
  return f;
}

/** the standings of a contest: rank medal, face, name, score; you are marked */
function standings(rows: { name: string; score: number; you: boolean; place: number }[]): HTMLElement {
  return h('ol', { class: 'adv-order adv-standings mg-rs-list' }, ...rows.map((x) => h('li', { class: x.you ? 'you' : '' },
    h('span', { class: 'mg-rank' }, medalGraphic(x.place, 30)),
    x.you ? youFace(34) : faceOf(x.name, undefined, 34),
    h('b', null, x.you ? `${x.name} (you)` : x.name),
    h('small', null, `${fmtScore(x.score)} pts`))));
}

/** The results screen for a score-based challenge: the score, the tier (or the contest standings), a few numbers and what you earned. */
export function renderScoreResults(o: ScoreResultOpts): HTMLElement {
  const won = o.place === 1;
  const contest = !!o.standings?.length;
  const title = o.title ? o.title : contest
    ? won ? 'You won the contest!' : o.place === 2 ? 'Second place — so close!' : o.place === 3 ? 'Third place!' : 'Fourth place — next time!'
    : won ? 'Gold!' : o.place === 2 ? 'Silver!' : o.place === 3 ? 'Bronze!' : 'Time’s up!';
  const newBest = o.best !== undefined && o.best !== null && o.score >= o.best && o.score > 0;
  const scoreEl = h('b', { class: 'adv-score' });
  countUp(scoreEl, o.score);
  return h('div', { class: `adv-results mg-results ${won ? 'won' : ''} p${Math.min(4, o.place)}` },
    h('div', { class: 'adv-results-card' },
      stage(o.place),
      h('h2', null, title),
      h('span', { class: 'adv-kicker mg-rs-game' }, gameTile(o.adv.id, 26, 'soft'), o.adv.name),
      h('div', { class: 'mg-rs-score' }, h('small', null, 'Score'), scoreEl),
      h('div', { class: 'mg-rs-chips' },
        h('span', { class: `adv-tier mg-chip tier t${Math.min(4, o.place)}` }, `${contest ? `${A.placeWord(o.place)} place` : o.tier}`),
        newBest ? chip('c-best', gicon('trophy', 15), 'New personal best!') : null),
      contest ? standings(o.standings!) : null,
      o.stats.length ? h('div', { class: `adv-stats mg-stats n${Math.min(4, o.stats.length)}` }, ...o.stats.map((x) => h('span', { class: 'fzx-card' }, h('b', null, x.value), h('small', null, x.label)))) : null,
      rewardChips(o.payout, o.pending),
      trophyLine(o.trophy),
      nextLine(o.adv, o.payout, o.next),
      actions(o.onBack, o.onAgain, 'Play again')));
}

/** The results screen after a race: the podium, the real finishing order and what you earned. */
export function renderRaceResults(o: ResultOpts): HTMLElement {
  const fmt = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}.${String(Math.floor((ms % 1000) / 100))}`;
  const podium = h('div', { class: 'adv-podium mg-podium' }, ...[2, 1, 3].map((p) => {
    const who = o.order.find((x) => x.place === p);
    return h('div', { class: `adv-step p${p} ${who?.you ? 'you' : ''}` },
      who ? (who.portrait ? h('img', { class: 'mg-pod-pic', src: who.portrait, alt: '' }) : h('img', { class: 'mg-pod-pic', src: HERO, alt: '' })) : h('span', { class: 'adv-empty' }),
      h('b', null, who ? who.name : '—'),
      h('div', { class: 'adv-block' }, medalGraphic(p, p === 1 ? 44 : 36)));
  }));
  const won = o.place === 1;
  const title = won ? 'You won the race!' : o.place === 2 ? 'Second place — so close!' : o.place === 3 ? 'Third place!' : 'Race finished';
  const sorted = [...o.order].sort((a, b) => a.place - b.place);
  return h('div', { class: `adv-results mg-results ${won ? 'won' : ''} p${Math.min(4, o.place)}` },
    h('div', { class: 'adv-results-card' },
      h('h2', null, title),
      h('span', { class: 'adv-kicker mg-rs-game' }, gameTile(o.adv.id, 26, 'soft'), o.adv.name),
      podium,
      h('ol', { class: 'adv-order mg-rs-list' }, ...sorted.map((x) => h('li', { class: x.you ? 'you' : '' },
        h('span', { class: 'mg-rank' }, medalGraphic(x.place, 30)),
        h('b', null, x.you ? `${x.name} (you)` : x.name),
        h('small', null, A.placeWord(x.place))))),
      h('div', { class: 'mg-rs-chips' }, chip('c-time', mgIcon('clock', 16), h('b', null, `Your time ${fmt(o.timeMs)}`))),
      rewardChips(o.payout, o.pending),
      trophyLine(o.trophy),
      nextLine(o.adv, o.payout, o.next),
      actions(o.onBack, o.onAgain, 'Race again')));
}
