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

const isTouchDevice = (): boolean => matchMedia('(pointer: coarse)').matches;
export const limitWord = (sec: number): string => (sec % 60 === 0 ? `${sec / 60} min` : `${sec} s`);

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
    ? [btn(done ? 'Play again (practice)' : 'Start Adventure', { kind: 'primary', class: 'land-talk-go', onClick: o.onStart }), btn('Maybe later', { kind: 'ghost', onClick: o.onLater })]
    : [btn('Chat', { kind: 'soft', onClick: () => { const line = c.chat[Math.floor(Math.random() * c.chat.length)]; say(line); o.onChat(line); } }),
      btn(`Find ${o.hostName}`, { kind: 'primary', icon: undefined, class: 'land-talk-find', onClick: o.onFindHost })];
  const el = h('div', { class: `land-talk ${o.isHost ? 'is-host' : ''}`, role: 'dialog', 'aria-label': `Talking to ${o.name}` },
    h('button', { class: 'land-talk-x', type: 'button', 'aria-label': 'Close', onclick: o.onClose }, '✕'),
    h('div', { class: 'land-talk-who' },
      h('div', { class: 'land-talk-pic' }, o.portrait ? h('img', { src: o.portrait, alt: '' }) : null),
      h('div', { class: 'land-talk-id' }, h('b', null, o.name), h('span', { class: 'land-talk-role' }, `${c.emoji} ${c.title}`), h('small', null, c.bio))),
    h('div', { class: 'land-talk-bubble' }, speech,
      o.isHost ? h('div', { class: 'land-talk-mission' },
        h('span', { class: 'land-talk-tag' }, landIcon('compass', 18), o.mission.special ? 'Fuzzy Festival' : 'Today’s adventure'),
        h('b', null, `${adv.emoji} ${adv.name}${o.mission.variant ? ` — ${o.mission.variant.name}` : ''}`),
        h('small', null, adv.objective + (adv.limit ? ` · ⏱ ${limitWord(adv.limit)}` : '')),
        o.mission.variant ? h('small', { class: 'land-talk-twist' }, `Today’s twist: ${o.mission.variant.note}`) : null,
        h('details', { class: 'land-talk-howto' }, h('summary', null, 'How to play'), h('ol', null, ...adv.howTo.map((t) => h('li', null, t))), h('small', null, `${isTouchDevice() ? adv.controls.mobile : adv.controls.desktop}`)),
        h('div', { class: 'land-talk-reward' },
          ...adv.coins.slice(0, 3).map((n, i) => h('span', null, A.medal(i + 1), ' ', landIcon('coin', 16), String(n))),
          done ? h('em', null, `Done today · ${A.placeWord(done.place)} · resets in ${A.countdown(o.mission.resetsIn)}`) : h('em', null, `+${adv.xp} XP · resets in ${A.countdown(o.mission.resetsIn)}`))) : null),
    h('div', { class: 'land-talk-actions' }, ...actions));
  const hello = c.hello[Math.floor(Math.random() * c.hello.length)];
  say(o.isHost ? `${hello} ${adv.pitch}` : hello);
  return { el, say, destroy: () => { clearInterval(typing); el.remove(); } };
}

/** The small HUD pill: today's adventure, who has it, status and the reset countdown. Call `update()` each minute. */
export function dailyPill(onTap: () => void): { el: HTMLElement; update: (m: A.Mission, hostName: string, today: A.Today, doneCount: number) => void } {
  const text = h('span', { class: 'land-daily-t' });
  const sub = h('small', { class: 'land-daily-s' });
  const el = h('button', { class: 'land-daily', type: 'button', onclick: onTap, title: 'Today’s adventure' }, h('span', { class: 'land-daily-ic' }, landIcon('compass', 26)), h('span', null, text, sub));
  return {
    el,
    update(m, hostName, today, doneCount) {
      if (today.special) {
        const all = doneCount >= today.list.length;
        text.textContent = `🎪 ${today.title} · ${doneCount}/${today.list.length}`;
        sub.textContent = all ? `All done! New day in ${A.countdown(m.resetsIn)}` : `${today.list.length} adventures, each one pays · ${A.countdown(m.resetsIn)} left`;
        el.classList.toggle('done', all);
        return;
      }
      text.textContent = `${m.adventure.emoji} ${m.adventure.short}${m.variant ? ` · ${m.variant.name}` : ''}${m.done ? ` · ${A.medal(m.done.place)} done` : ''}`;
      sub.textContent = m.done ? `New adventure in ${A.countdown(m.resetsIn)}` : `${hostName} is waiting · ${A.countdown(m.resetsIn)} left`;
      el.classList.toggle('done', !!m.done);
    },
  };
}

/** The Adventures sheet body: today's adventure(s) with their hosts, your records, what else is in the pool. */
export function adventuresBody(s: LandState, now: number, hostNameOf: (id: string) => string, onPlay: (adv: A.Adventure) => void, onFind: (adv: A.Adventure) => void): HTMLElement {
  const t = A.today(now);
  const a = A.adventures(s, now);
  const fmt = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}`;
  const cards = t.list.map(({ adventure: adv, variant }) => {
    const m = A.mission(s, now, adv.id);
    const hostName = hostNameOf(adv.id);
    return h('div', { class: 'land-adv-featured' },
      h('div', { class: 'land-adv-head' }, h('span', { class: 'land-adv-emoji' }, adv.emoji), h('div', null, h('span', { class: 'land-adv-kicker' }, t.special ? '🎪 Fuzzy Festival' : 'Today’s adventure'), h('b', null, adv.name + (variant ? ` — ${variant.name}` : '')), h('small', null, adv.objective + (adv.limit ? ` · ⏱ ${limitWord(adv.limit)}` : '')), variant ? h('small', { class: 'land-adv-twist' }, variant.note) : null)),
      h('div', { class: 'land-adv-rewards' }, ...adv.coins.slice(0, 3).map((n, i) => h('div', { class: 'land-adv-place' }, h('span', null, A.medal(i + 1)), h('b', null, landIcon('coin', 18), String(n)), h('small', null, adv.kind === 'score' ? ['Top tier', '2nd tier', '3rd tier'][i] : A.placeWord(i + 1)))), h('div', { class: 'land-adv-place' }, h('span', null, '✨'), h('b', null, `+${adv.xp}`), h('small', null, 'XP'))),
      h('details', { class: 'land-adv-howto' }, h('summary', null, 'How to play'), h('ol', null, ...adv.howTo.map((t) => h('li', null, t))), h('small', null, `Controls: ${isTouchDevice() ? adv.controls.mobile : adv.controls.desktop}`), h('small', null, adv.scoring)),
      m.done
        ? h('p', { class: 'land-adv-status done' }, `${A.medal(m.done.place)} Finished ${A.placeWord(m.done.place)} today · +${m.done.coins} coins collected. Play again for practice — a new adventure arrives in ${A.countdown(m.resetsIn)}.`)
        : h('p', { class: 'land-adv-status' }, `${hostName} has this adventure today · resets in ${A.countdown(m.resetsIn)} (at midnight).`),
      h('div', { class: 'btn-row' }, btn(m.done ? 'Play again' : 'Start Adventure', { kind: 'primary', onClick: () => onPlay(adv) }), btn(`Find ${hostName}`, { kind: 'soft', onClick: () => onFind(adv) })));
  });
  const recordRows = A.playable().map((adv) => {
    const m = A.mission(s, now, adv.id);
    return h('div', { class: 'land-adv-rec' }, h('span', { class: 'land-adv-emoji sm' }, adv.emoji), h('div', { class: 'land-adv-grid' },
      h('span', null, h('small', null, 'Plays'), h('b', null, String(m.plays))),
      h('span', null, h('small', null, adv.kind === 'score' ? 'Best tier' : 'Best place'), h('b', null, m.best ? `${A.medal(m.best)} ${A.placeWord(m.best)}` : '—')),
      h('span', null, h('small', null, adv.kind === 'score' ? 'Best score' : 'Best time'), h('b', null, adv.kind === 'score' ? (m.bestScore !== null ? String(m.bestScore) : '—') : (m.bestTime ? fmt(m.bestTime) : '—'))),
      h('span', null, h('small', null, 'Today'), h('b', null, m.done ? `+${m.done.coins}` : A.isToday(adv.id, now) ? 'open' : '—'))));
  });
  const records = h('div', { class: 'land-adv-records' }, h('b', null, 'Your records'), ...recordRows, h('p', { class: 'land-adv-wood' }, `🪵 Wood in the barn: ${a.wood}`));
  const pool = h('div', { class: 'land-adv-more' }, h('b', null, 'How adventures work'),
    h('p', { class: 'land-adv-how' }, 'A different Fuzzy offers a different challenge every day: the adventures take turns, some days with a twist, and once a week the whole town celebrates the Fuzzy Festival. Each adventure pays town coins and XP once a day — play again any time for practice and better records.'),
    ...A.playable().filter((x) => !t.list.some((y) => y.adventure.id === x.id)).map((x) => h('div', { class: 'land-adv-row' }, h('span', { class: 'land-adv-emoji sm' }, x.emoji), h('div', null, h('b', null, x.name), h('small', null, `${x.objective}${x.variants ? ` · twist days: ${Object.values(x.variants).map((v) => v.name).join(', ')}` : ''}`)))),
    h('div', { class: 'land-adv-row' }, h('span', { class: 'land-adv-emoji sm' }, '🎪'), h('div', null, h('b', null, A.FESTIVAL.title), h('small', null, A.FESTIVAL.note))));
  return h('div', { class: 'land-adv' }, ...cards, records, pool);
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

export interface ScoreResultOpts { adv: A.Adventure; place: number; score: number; tier: string; stats: { label: string; value: string }[]; hostPortrait?: string; payout: A.Payout | null; pending: boolean; onAgain: () => void; onBack: () => void }
/** The results screen for a score-based challenge: the score, the tier, a few numbers and what you earned. */
export function scoreResults(o: ScoreResultOpts): HTMLElement {
  const won = o.place === 1;
  const title = won ? 'Top tier!' : o.place === 2 ? 'Great run!' : o.place === 3 ? 'Nicely done!' : 'Time’s up!';
  const reward = o.payout?.practice
    ? h('p', { class: 'adv-reward practice' }, 'Practice run — today’s reward was already collected. Come back tomorrow for a new adventure!')
    : o.pending ? h('p', { class: 'adv-reward practice' }, 'You’re offline — your reward will be added when you’re back online.')
      : o.payout ? h('p', { class: 'adv-reward' }, landIcon('coin', 22), h('b', null, `+${o.payout.coins} coins`), h('span', null, `+${o.payout.xp} XP`), ...(o.payout.levelUps.length ? [h('span', { class: 'adv-lvl' }, `Level ${o.payout.levelUps[o.payout.levelUps.length - 1]}!`)] : [])) : null;
  return h('div', { class: `adv-results ${won ? 'won' : ''}` },
    h('div', { class: 'adv-results-card' },
      h('span', { class: 'adv-kicker' }, `${o.adv.emoji} ${o.adv.name}`),
      h('h2', null, title),
      o.hostPortrait ? h('div', { class: 'adv-forest-host' }, h('img', { src: o.hostPortrait, alt: '' })) : null,
      h('div', { class: 'adv-score' }, String(o.score)),
      h('span', { class: 'adv-tier' }, `${A.medal(o.place)} ${o.tier}`),
      h('div', { class: 'land-adv-grid adv-stats' }, ...o.stats.map((x) => h('span', null, h('small', null, x.label), h('b', null, x.value)))),
      reward,
      h('div', { class: 'btn-row' }, btn('Back to town', { kind: 'primary', class: 'adv-back', onClick: o.onBack }), btn('Play again', { kind: 'soft', onClick: o.onAgain }))));
}

