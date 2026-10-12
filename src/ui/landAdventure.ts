/**
 * Fuzzies Adventures — the parts you see in the town: the conversation card when you tap a Fuzzy (portrait, name,
 * personality, what it says, Start Adventure / Maybe later), the "today's adventure" pill in the HUD, the Adventures
 * sheet (today's mission, rewards, records, what's coming) and the results screen after a mini-game.
 * Rules live in land/adventures.ts; the mini-games have their own files (land/raceView.ts…).
 */
import { h, btn, fuzzySvg } from './dom';
import { landIcon } from './landIcons';
import * as A from '../land/adventures';
import type { LandState } from '../land/rules';

export interface TalkOpts {
  index: number; name: string; portrait: string; mission: A.Mission; isHost: boolean; hostName: string;
  onStart: () => void; onLater: () => void; onFindHost: () => void; onChat: (line: string) => void; onClose: () => void;
}

/** The conversation card. Returns the element and a `say(text)` that types new words into the bubble. */
export function conversation(o: TalkOpts): { el: HTMLElement; say: (t: string) => void; destroy: () => void } {
  const c = A.character(o.index);
  const speech = h('p', { class: 'land-talk-speech' });
  let typing = 0;
  const say = (t: string) => {
    clearInterval(typing);
    speech.textContent = '';
    speech.classList.add('typing');
    const reduce = document.documentElement.dataset.motion === 'reduce';
    let i = 0;
    const step = () => { i = Math.min(t.length, i + (reduce ? t.length : 2)); speech.textContent = t.slice(0, i); if (i >= t.length) { clearInterval(typing); speech.classList.remove('typing'); } };
    typing = window.setInterval(step, 24);
    step();
  };
  const adv = o.mission.adventure;
  const done = o.mission.done;
  const actions = o.isHost
    ? [btn(done ? 'Race again (practice)' : 'Start Adventure', { kind: 'primary', class: 'land-talk-go', onClick: o.onStart }), btn('Maybe later', { kind: 'ghost', onClick: o.onLater })]
    : [btn('Chat', { kind: 'soft', onClick: () => { const line = c.chat[Math.floor(Math.random() * c.chat.length)]; say(line); o.onChat(line); } }),
      btn(`Find ${o.hostName}`, { kind: 'primary', icon: undefined, class: 'land-talk-find', onClick: o.onFindHost })];
  const el = h('div', { class: `land-talk ${o.isHost ? 'is-host' : ''}`, role: 'dialog', 'aria-label': `Talking to ${o.name}` },
    h('button', { class: 'land-talk-x', type: 'button', 'aria-label': 'Close', onclick: o.onClose }, '✕'),
    h('div', { class: 'land-talk-who' },
      h('div', { class: 'land-talk-pic' }, o.portrait ? h('img', { src: o.portrait, alt: '' }) : null),
      h('div', { class: 'land-talk-id' }, h('b', null, o.name), h('span', { class: 'land-talk-role' }, `${c.emoji} ${c.title}`), h('small', null, c.bio))),
    h('div', { class: 'land-talk-bubble' }, speech,
      o.isHost ? h('div', { class: 'land-talk-mission' },
        h('span', { class: 'land-talk-tag' }, landIcon('compass', 18), 'Today’s adventure'),
        h('b', null, `${adv.emoji} ${adv.name}`),
        h('small', null, adv.objective),
        h('div', { class: 'land-talk-reward' },
          ...adv.coins.slice(0, 3).map((n, i) => h('span', null, A.medal(i + 1), ' ', landIcon('coin', 16), String(n))),
          done ? h('em', null, `Done today · ${A.placeWord(done.place)} · resets in ${A.countdown(o.mission.resetsIn)}`) : h('em', null, `+${adv.xp} XP · resets in ${A.countdown(o.mission.resetsIn)}`))) : null),
    h('div', { class: 'land-talk-actions' }, ...actions));
  const hello = c.hello[Math.floor(Math.random() * c.hello.length)];
  say(o.isHost ? `${hello} ${adv.pitch}` : hello);
  return { el, say, destroy: () => { clearInterval(typing); el.remove(); } };
}

/** The small HUD pill: today's adventure, who has it, status and the reset countdown. Call `update()` each minute. */
export function dailyPill(onTap: () => void): { el: HTMLElement; update: (m: A.Mission, hostName: string) => void } {
  const text = h('span', { class: 'land-daily-t' });
  const sub = h('small', { class: 'land-daily-s' });
  const el = h('button', { class: 'land-daily', type: 'button', onclick: onTap, title: 'Today’s adventure' }, h('span', { class: 'land-daily-ic' }, landIcon('compass', 26)), h('span', null, text, sub));
  return {
    el,
    update(m, hostName) {
      text.textContent = `${m.adventure.emoji} ${m.adventure.short}${m.done ? ` · ${A.medal(m.done.place)} done` : ''}`;
      sub.textContent = m.done ? `New adventure in ${A.countdown(m.resetsIn)}` : `${hostName} is waiting · ${A.countdown(m.resetsIn)} left`;
      el.classList.toggle('done', !!m.done);
    },
  };
}

/** The Adventures sheet body. */
export function adventuresBody(s: LandState, now: number, hostName: string, onPlay: () => void, onFind: () => void): HTMLElement {
  const m = A.mission(s, now);
  const a = A.adventures(s, now);
  const adv = m.adventure;
  const fmt = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}`;
  const featured = h('div', { class: 'land-adv-featured' },
    h('div', { class: 'land-adv-head' }, h('span', { class: 'land-adv-emoji' }, adv.emoji), h('div', null, h('span', { class: 'land-adv-kicker' }, 'Today’s adventure'), h('b', null, adv.name), h('small', null, adv.objective))),
    h('div', { class: 'land-adv-rewards' }, ...adv.coins.slice(0, 3).map((n, i) => h('div', { class: 'land-adv-place' }, h('span', null, A.medal(i + 1)), h('b', null, landIcon('coin', 18), String(n)), h('small', null, A.placeWord(i + 1)))), h('div', { class: 'land-adv-place' }, h('span', null, '✨'), h('b', null, `+${adv.xp}`), h('small', null, 'XP'))),
    m.done
      ? h('p', { class: 'land-adv-status done' }, `${A.medal(m.done.place)} Finished ${A.placeWord(m.done.place)} today · +${m.done.coins} coins collected. Play again for practice — a new adventure arrives in ${A.countdown(m.resetsIn)}.`)
      : h('p', { class: 'land-adv-status' }, `${hostName} has this adventure today · resets in ${A.countdown(m.resetsIn)} (at midnight).`),
    h('div', { class: 'btn-row' }, btn(m.done ? 'Play again' : 'Start Adventure', { kind: 'primary', onClick: onPlay }), btn(`Find ${hostName}`, { kind: 'soft', onClick: onFind })));
  const records = h('div', { class: 'land-adv-records' }, h('b', null, 'Your records'),
    h('div', { class: 'land-adv-grid' },
      h('span', null, h('small', null, 'Plays'), h('b', null, String(m.plays))),
      h('span', null, h('small', null, 'Best place'), h('b', null, m.best ? `${A.medal(m.best)} ${A.placeWord(m.best)}` : '—')),
      h('span', null, h('small', null, 'Best time'), h('b', null, m.bestTime ? fmt(m.bestTime) : '—')),
      h('span', null, h('small', null, 'Wood'), h('b', null, String(a.wood)))));
  const others = h('div', { class: 'land-adv-more' }, h('b', null, 'More adventures'),
    ...A.ADVENTURES.filter((x) => x.id !== adv.id).map((x) => h('div', { class: `land-adv-row ${x.playable ? '' : 'soon'}` }, h('span', { class: 'land-adv-emoji sm' }, x.emoji), h('div', null, h('b', null, x.name), h('small', null, x.playable ? 'Comes round in the daily rotation' : 'Coming soon — not playable yet')))));
  return h('div', { class: 'land-adv' }, featured, records, others);
}

export interface ResultOpts { adv: A.Adventure; place: number; timeMs: number; order: { name: string; portrait: string; place: number; you: boolean }[]; payout: A.Payout | null; pending: boolean; onAgain: () => void; onBack: () => void }
/** The results screen after a mini-game: the podium, the real finishing order and what you earned. */
export function resultsScreen(o: ResultOpts): HTMLElement {
  const fmt = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}.${String(Math.floor((ms % 1000) / 100))}`;
  const flat = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(fuzzySvg(['#ff8fbf', '#c8326e'], 'giggle', 'advyou'));
  const podium = h('div', { class: 'adv-podium' }, ...[2, 1, 3].map((p) => {
    const who = o.order.find((x) => x.place === p);
    return h('div', { class: `adv-step p${p} ${who?.you ? 'you' : ''}` }, who ? h('img', { src: who.portrait || flat, alt: '' }) : h('span', { class: 'adv-empty' }), h('b', null, who ? who.name : '—'), h('div', { class: 'adv-block' }, A.medal(p)));
  }));
  const won = o.place === 1;
  const title = won ? 'You won the race!' : o.place === 2 ? 'Second place — so close!' : o.place === 3 ? 'Third place!' : 'Race finished';
  const reward = o.payout?.practice
    ? h('p', { class: 'adv-reward practice' }, 'Practice run — today’s reward was already collected. Come back tomorrow for a new adventure!')
    : o.pending ? h('p', { class: 'adv-reward practice' }, 'You’re offline — your reward will be added when you’re back online.')
      : o.payout ? h('p', { class: 'adv-reward' }, landIcon('coin', 22), h('b', null, `+${o.payout.coins} coins`), h('span', null, `+${o.payout.xp} XP`), ...(o.payout.levelUps.length ? [h('span', { class: 'adv-lvl' }, `Level ${o.payout.levelUps[o.payout.levelUps.length - 1]}!`)] : [])) : null;
  return h('div', { class: `adv-results ${won ? 'won' : ''}` },
    h('div', { class: 'adv-results-card' },
      h('span', { class: 'adv-kicker' }, `${o.adv.emoji} ${o.adv.name}`),
      h('h2', null, title),
      podium,
      h('ol', { class: 'adv-order' }, ...o.order.sort((a, b) => a.place - b.place).map((x) => h('li', { class: x.you ? 'you' : '' }, h('span', null, A.medal(x.place)), h('b', null, x.you ? `${x.name} (you)` : x.name), h('small', null, A.placeWord(x.place))))),
      h('p', { class: 'adv-time' }, `Your time ${fmt(o.timeMs)}`),
      reward,
      h('div', { class: 'btn-row' }, btn('Back to town', { kind: 'primary', class: 'adv-back', onClick: o.onBack }), btn('Race again', { kind: 'soft', onClick: o.onAgain }))));
}

export interface ForestResultOpts { adv: A.Adventure; place: number; timeMs: number; wood: number; cleared: number; total: number; perfect: number; hostPortrait: string; payout: A.Payout | null; pending: boolean; onAgain: () => void; onBack: () => void }
/** The results screen after the forest mission: trees cleared, wood, time and what you earned. */
export function forestResults(o: ForestResultOpts): HTMLElement {
  const fmt = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}`;
  const all = o.cleared >= o.total;
  const title = !all ? 'The sun set first…' : o.place === 1 ? 'Lightning fast!' : o.place === 2 ? 'Nicely cleared!' : 'Cleared before sunset!';
  const reward = o.payout?.practice
    ? h('p', { class: 'adv-reward practice' }, 'Practice run — today’s reward was already collected. Come back tomorrow for a new adventure!')
    : o.pending ? h('p', { class: 'adv-reward practice' }, 'You’re offline — your reward will be added when you’re back online.')
      : o.payout ? h('p', { class: 'adv-reward' }, landIcon('coin', 22), h('b', null, `+${o.payout.coins} coins`), h('span', null, `+${o.payout.xp} XP`), ...(o.payout.levelUps.length ? [h('span', { class: 'adv-lvl' }, `Level ${o.payout.levelUps[o.payout.levelUps.length - 1]}!`)] : [])) : null;
  return h('div', { class: `adv-results ${all && o.place === 1 ? 'won' : ''}` },
    h('div', { class: 'adv-results-card' },
      h('span', { class: 'adv-kicker' }, `${o.adv.emoji} ${o.adv.name}`),
      h('h2', null, title),
      h('div', { class: 'adv-forest-host' }, o.hostPortrait ? h('img', { src: o.hostPortrait, alt: '' }) : null, h('span', { class: 'adv-forest-trees' }, ...Array.from({ length: o.total }, (_, i) => h('i', { class: i < o.cleared ? 'cut' : '' }, i < o.cleared ? '🪵' : '🌳')))),
      h('div', { class: 'land-adv-grid adv-forest-grid' },
        h('span', null, h('small', null, 'Trees'), h('b', null, `${o.cleared}/${o.total}`)),
        h('span', null, h('small', null, 'Wood'), h('b', null, `+${o.wood}`)),
        h('span', null, h('small', null, 'Perfect hits'), h('b', null, String(o.perfect))),
        h('span', null, h('small', null, 'Time'), h('b', null, fmt(o.timeMs)))),
      h('p', { class: 'adv-time' }, `${A.medal(o.place)} ${A.placeWord(o.place)} tier · wood goes towards the town’s expansion`),
      reward,
      h('div', { class: 'btn-row' }, btn('Back to town', { kind: 'primary', class: 'adv-back', onClick: o.onBack }), btn('Try again', { kind: 'soft', onClick: o.onAgain }))));
}
