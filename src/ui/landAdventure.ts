/**
 * Fuzzies Adventures — the parts you see in the town: the conversation card when you tap a Fuzzy (portrait, name,
 * personality, what it says, Start Adventure / Maybe later — or "✓ Completed" once its mission is done), the missions pill in
 * the HUD (how many of the three are done, when the next set comes), the Adventures panel (the three missions, their Fuzzies,
 * rewards, status, the next unlock time, records) and the results screens after a mini-game.
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
const nextWords = (unlockIn: number): string => (unlockIn <= 0 ? 'New missions are ready — tap the compass!' : `New missions in ${A.countdown(unlockIn)}.`);

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
  const complete = o.isHost && !!done;
  const actions = o.isHost
    ? complete
      ? [btn('See you then!', { kind: 'primary', class: 'land-talk-bye', onClick: o.onLater })]
      : [btn('Start Adventure', { kind: 'primary', class: 'land-talk-go', onClick: o.onStart }), btn('Maybe later', { kind: 'ghost', onClick: o.onLater })]
    : [btn('Chat', { kind: 'soft', onClick: () => { const line = c.chat[Math.floor(Math.random() * c.chat.length)]; say(line); o.onChat(line); } }),
      btn(`Find ${o.hostName}`, { kind: 'primary', icon: undefined, class: 'land-talk-find', onClick: o.onFindHost })];
  const el = h('div', { class: `land-talk ${o.isHost ? 'is-host' : ''} ${complete ? 'complete' : ''}`, role: 'dialog', 'aria-label': `Talking to ${o.name}` },
    h('button', { class: 'land-talk-x', type: 'button', 'aria-label': 'Close', onclick: o.onClose }, '✕'),
    h('div', { class: 'land-talk-who' },
      h('div', { class: 'land-talk-pic' }, o.portrait ? h('img', { src: o.portrait, alt: '' }) : null),
      h('div', { class: 'land-talk-id' }, h('b', null, o.name), h('span', { class: 'land-talk-role' }, `${c.emoji} ${c.title}`), h('small', null, c.bio))),
    h('div', { class: 'land-talk-bubble' }, speech,
      o.isHost ? h('div', { class: 'land-talk-mission' },
        h('span', { class: 'land-talk-tag' }, landIcon('compass', 18), complete ? '✓ Completed' : 'My mission for you'),
        h('b', null, `${adv.emoji} ${adv.name}${o.mission.variant ? ` — ${o.mission.variant.name}` : ''}`),
        complete && done
          ? h('small', null, `Finished ${A.placeWord(done.place)} · +${done.coins} coins collected`)
          : h('small', null, adv.objective + (adv.limit ? ` · ⏱ ${limitWord(adv.limit)}` : '')),
        !complete && o.mission.variant ? h('small', { class: 'land-talk-twist' }, `The twist: ${o.mission.variant.note}`) : null,
        complete ? null : h('details', { class: 'land-talk-howto' }, h('summary', null, 'How to play'), h('ol', null, ...adv.howTo.map((t) => h('li', null, t))), h('small', null, `${isTouchDevice() ? adv.controls.mobile : adv.controls.desktop}`)),
        h('div', { class: 'land-talk-reward' },
          ...(complete ? [] : adv.coins.slice(0, 3).map((n, i) => h('span', null, A.medal(i + 1), ' ', landIcon('coin', 16), String(n)))),
          complete ? h('em', null, nextWords(o.mission.resetsIn)) : h('em', null, `+${adv.xp} XP · no deadline — finish your three missions in any order`))) : null),
    h('div', { class: 'land-talk-actions' }, ...actions));
  const hello = c.hello[Math.floor(Math.random() * c.hello.length)];
  say(complete && done ? `${hello} Great work — you finished ${A.placeWord(done.place)}, that one’s done! ${nextWords(o.mission.resetsIn)}` : o.isHost ? `${hello} ${adv.pitch}` : hello);
  return { el, say, destroy: () => { clearInterval(typing); el.remove(); } };
}

/** The small HUD pill: how many of the three missions are done, who's waiting, and when the next set comes. Call `update()` each minute. */
export function dailyPill(onTap: () => void): { el: HTMLElement; update: (st: A.SetStatus, nextHost: string) => void } {
  const text = h('span', { class: 'land-daily-t' });
  const sub = h('small', { class: 'land-daily-s' });
  const el = h('button', { class: 'land-daily', type: 'button', onclick: onTap, title: 'Your missions' }, h('span', { class: 'land-daily-ic' }, landIcon('compass', 26)), h('span', null, text, sub));
  return {
    el,
    update(st, nextHost) {
      el.hidden = false;
      el.classList.toggle('done', st.allDone);
      el.classList.toggle('ready', st.ready);
      if (st.ready) { text.textContent = 'New missions!'; sub.textContent = 'Three Fuzzies are waiting — tap to see'; }
      else if (st.allDone) { text.textContent = `✓ All ${st.total} done`; sub.textContent = `New missions in ${A.countdown(st.unlockIn)}`; }
      else { text.textContent = `Missions ${st.doneCount}/${st.total}`; sub.textContent = `${nextHost} is waiting · no deadline`; }
    },
  };
}

/** The Adventures panel body: the three missions with their Fuzzies, rewards and status, the next unlock time, your records. */
export function adventuresBody(s: LandState, now: number, hostNameOf: (id: string) => string, onPlay: (adv: A.Adventure) => void, onFind: (adv: A.Adventure) => void, hostSkin?: (id: string) => string | null): HTMLElement {
  const t = A.today(s, now);
  const st = A.setStatus(s, now);
  const a = A.adventures(s, now);
  const fmt = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}`;
  const next = h('p', { class: `land-adv-next ${st.ready ? 'ready' : ''}` }, landIcon('clock', 22),
    st.ready ? h('span', null, h('b', null, 'New missions are ready!'), ' Close this and look for the Fuzzies with a compass.')
      : st.allDone ? h('span', null, 'All three done — next set in ', h('b', null, A.countdown(st.unlockIn)))
        : h('span', null, h('b', null, `${st.doneCount} of ${st.total} done`), ` · new missions ${st.unlockIn > 0 ? `in ${A.countdown(st.unlockIn)}` : 'as soon as these are done'}`));
  const cards = t.list.map(({ adventure: adv, variant }, i) => {
    const m = A.mission(s, now, adv.id);
    const hostName = hostNameOf(adv.id);
    const skin = hostSkin?.(adv.id);
    return h('div', { class: `land-adv-featured ${m.done ? 'is-done' : ''}` },
      h('div', { class: 'land-adv-head' }, h('span', { class: 'land-adv-emoji' }, adv.emoji), h('div', null,
        h('span', { class: 'land-adv-kicker' }, m.done ? '✓ Completed' : `Mission ${i + 1}`),
        h('b', null, adv.name + (variant ? ` — ${variant.name}` : '')),
        h('small', null, adv.objective + (adv.limit ? ` · ⏱ ${limitWord(adv.limit)}` : '')),
        h('span', { class: 'land-adv-host' }, skin ? h('i', { style: `background:${skin}` }) : null, `${hostName} has it`),
        variant && !m.done ? h('small', { class: 'land-adv-twist' }, variant.note) : null)),
      h('div', { class: 'land-adv-rewards' }, ...adv.coins.slice(0, 3).map((n, k) => h('div', { class: 'land-adv-place' }, h('span', null, A.medal(k + 1)), h('b', null, landIcon('coin', 18), String(n)), h('small', null, adv.kind === 'score' ? ['Gold', 'Silver', 'Bronze'][k] : A.placeWord(k + 1)))), h('div', { class: 'land-adv-place' }, h('span', null, '✨'), h('b', null, `+${adv.xp}`), h('small', null, 'XP'))),
      m.done ? null : h('details', { class: 'land-adv-howto' }, h('summary', null, 'How to play'), h('ol', null, ...adv.howTo.map((t) => h('li', null, t))), h('small', null, `Controls: ${isTouchDevice() ? adv.controls.mobile : adv.controls.desktop}`), h('small', null, adv.scoring)),
      m.done
        ? h('p', { class: 'land-adv-status done' }, `${A.medal(m.done.place)} Finished ${A.placeWord(m.done.place)} · +${m.done.coins} coins collected.`)
        : h('p', { class: 'land-adv-status' }, `Open · ${hostName} is waiting in town — no deadline.`),
      m.done ? null : h('div', { class: 'btn-row' }, btn('Start Adventure', { kind: 'primary', onClick: () => onPlay(adv) }), btn(`Find ${hostName}`, { kind: 'soft', class: 'land-adv-find', onClick: () => onFind(adv) })));
  });
  const recordRows = A.playable().map((adv) => {
    const m = A.mission(s, now, adv.id);
    const scoreGame = adv.kind === 'score' || m.bestScore !== null;
    return h('div', { class: 'land-adv-rec' }, h('span', { class: 'land-adv-emoji sm' }, adv.emoji), h('div', { class: 'land-adv-grid' },
      h('span', null, h('small', null, 'Plays'), h('b', null, String(m.plays))),
      h('span', null, h('small', null, adv.kind === 'score' ? 'Best tier' : 'Best place'), h('b', null, m.best ? `${A.medal(m.best)} ${A.placeWord(m.best)}` : '—')),
      h('span', null, h('small', null, scoreGame ? 'Best score' : 'Best time'), h('b', null, scoreGame ? (m.bestScore !== null ? String(m.bestScore) : '—') : (m.bestTime ? fmt(m.bestTime) : '—'))),
      h('span', null, h('small', null, 'Now'), h('b', null, m.done ? '✓ done' : A.inSet(s, adv.id, now) ? 'open' : '—'))));
  });
  const records = h('div', { class: 'land-adv-records' }, h('b', null, 'Your records'), ...recordRows, h('p', { class: 'land-adv-wood' }, `🪵 Wood in the barn: ${a.wood} · sets finished: ${a.setsDone}`));
  const pool = h('div', { class: 'land-adv-more' }, h('b', null, 'How missions work'),
    h('p', { class: 'land-adv-how' }, 'Three missions at a time, each with its own Fuzzy in town. Finish them in any order — there is no deadline, and a finished mission shows a Completed mark over its Fuzzy. Five hours after a set was issued, and once all three are done, the next set of three arrives. Each mission pays town coins and XP once.'),
    ...A.playable().filter((x) => !t.list.some((y) => y.adventure.id === x.id)).map((x) => h('div', { class: 'land-adv-row' }, h('span', { class: 'land-adv-emoji sm' }, x.emoji), h('div', null, h('b', null, x.name), h('small', null, `${x.objective}${x.variants ? ` · twists: ${Object.values(x.variants).map((v) => v.name).join(', ')}` : ''}`)))));
  return h('div', { class: 'land-adv' }, next, ...cards, records, pool);
}

const rewardLine = (payout: A.Payout | null, pending: boolean): HTMLElement | null => payout?.practice
  ? h('p', { class: 'adv-reward practice' }, 'Practice run — this mission’s reward was already collected.')
  : pending ? h('p', { class: 'adv-reward practice' }, 'You’re offline — your reward will be added when you’re back online.')
    : payout ? h('p', { class: 'adv-reward' }, landIcon('coin', 22), h('b', null, `+${payout.coins} coins`), h('span', null, `+${payout.xp} XP`), ...(payout.levelUps.length ? [h('span', { class: 'adv-lvl' }, `Level ${payout.levelUps[payout.levelUps.length - 1]}!`)] : [])) : null;

export interface ResultOpts { adv: A.Adventure; place: number; timeMs: number; order: { name: string; portrait: string; place: number; you: boolean }[]; payout: A.Payout | null; pending: boolean; onAgain?: () => void; onBack: () => void; next?: string }
/** The results screen after a race: the podium, the real finishing order and what you earned. */
export function resultsScreen(o: ResultOpts): HTMLElement {
  const fmt = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}.${String(Math.floor((ms % 1000) / 100))}`;
  const flat = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(fuzzySvg(['#ff8fbf', '#c8326e'], 'giggle', 'advyou'));
  const podium = h('div', { class: 'adv-podium' }, ...[2, 1, 3].map((p) => {
    const who = o.order.find((x) => x.place === p);
    return h('div', { class: `adv-step p${p} ${who?.you ? 'you' : ''}` }, who ? h('img', { src: who.portrait || flat, alt: '' }) : h('span', { class: 'adv-empty' }), h('b', null, who ? who.name : '—'), h('div', { class: 'adv-block' }, A.medal(p)));
  }));
  const won = o.place === 1;
  const title = won ? 'You won the race!' : o.place === 2 ? 'Second place — so close!' : o.place === 3 ? 'Third place!' : 'Race finished';
  return h('div', { class: `adv-results ${won ? 'won' : ''}` },
    h('div', { class: 'adv-results-card' },
      h('span', { class: 'adv-kicker' }, `${o.adv.emoji} ${o.adv.name}`),
      h('h2', null, title),
      podium,
      h('ol', { class: 'adv-order' }, ...o.order.sort((a, b) => a.place - b.place).map((x) => h('li', { class: x.you ? 'you' : '' }, h('span', null, A.medal(x.place)), h('b', null, x.you ? `${x.name} (you)` : x.name), h('small', null, A.placeWord(x.place))))),
      h('p', { class: 'adv-time' }, `Your time ${fmt(o.timeMs)}`),
      rewardLine(o.payout, o.pending),
      h('p', { class: 'adv-next' }, o.payout && !o.payout.practice ? `✓ ${o.adv.short} completed. ${o.next ?? ''}` : null),
      h('div', { class: 'btn-row' }, btn('Back to town', { kind: 'primary', class: 'adv-back', onClick: o.onBack }), ...(o.onAgain ? [btn('Race again', { kind: 'soft', onClick: o.onAgain })] : []))));
}

export interface ScoreResultOpts { adv: A.Adventure; place: number; score: number; tier: string; stats: { label: string; value: string }[]; hostPortrait?: string; /** a contest against others: the final standings */ standings?: { name: string; score: number; you: boolean; place: number }[]; payout: A.Payout | null; pending: boolean; onAgain?: () => void; onBack: () => void; next?: string; best?: number | null }
/** The results screen for a score-based challenge: the score, the tier (or the contest standings), a few numbers and what you earned. */
export function scoreResults(o: ScoreResultOpts): HTMLElement {
  const won = o.place === 1;
  const contest = !!o.standings?.length;
  const title = contest
    ? won ? 'You won the contest!' : o.place === 2 ? 'Second place — so close!' : o.place === 3 ? 'Third place!' : 'Fourth place — next time!'
    : won ? 'Gold!' : o.place === 2 ? 'Silver!' : o.place === 3 ? 'Bronze!' : 'Time’s up!';
  const newBest = o.best !== undefined && o.best !== null && o.score >= o.best && o.score > 0;
  return h('div', { class: `adv-results ${won ? 'won' : ''}` },
    h('div', { class: 'adv-results-card' },
      h('span', { class: 'adv-kicker' }, `${o.adv.emoji} ${o.adv.name}`),
      h('h2', null, title),
      o.hostPortrait && !contest ? h('div', { class: 'adv-forest-host' }, h('img', { src: o.hostPortrait, alt: '' })) : null,
      h('div', { class: 'adv-score' }, String(o.score)),
      h('span', { class: 'adv-tier' }, `${A.medal(o.place)} ${contest ? `${A.placeWord(o.place)} · ` : ''}${o.tier}${newBest ? ' · new personal best!' : ''}`),
      contest ? h('ol', { class: 'adv-order adv-standings' }, ...o.standings!.map((x) => h('li', { class: x.you ? 'you' : '' }, h('span', null, A.medal(x.place)), h('b', null, x.you ? `${x.name} (you)` : x.name), h('small', null, `${x.score} pts`)))) : null,
      h('div', { class: 'land-adv-grid adv-stats' }, ...o.stats.map((x) => h('span', null, h('small', null, x.label), h('b', null, x.value)))),
      rewardLine(o.payout, o.pending),
      h('p', { class: 'adv-next' }, o.payout && !o.payout.practice ? `✓ ${o.adv.short} completed. ${o.next ?? ''}` : null),
      h('div', { class: 'btn-row' }, btn('Back to town', { kind: 'primary', class: 'adv-back', onClick: o.onBack }), ...(o.onAgain ? [btn('Play again', { kind: 'soft', onClick: o.onAgain })] : []))));
}
