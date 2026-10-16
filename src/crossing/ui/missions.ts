/** Missions screen: today's three, this week's three, and the long-term achievements (hidden ones show as ??? until earned). */
import { h, toast } from '../../ui/dom';
import * as store from '../store';
import { ensureMissions, claimMissionReward } from '../init';
import { viewMissions, ALL_DAILY_BONUS, type MissionView } from '../missions';
import { ACHIEVEMENTS, isComplete, rewardCharacter } from '../achievements';
import { character } from '../characters';
import { coinAmount, coinMark } from './kit';
import type { PanelOpen } from '../hub';
import './missions.css';

const timeLeft = (ms: number): string => { const m = Math.max(0, Math.round(ms / 60000)); return m >= 1440 ? `${Math.floor(m / 1440)}d ${Math.floor((m % 1440) / 60)}h` : m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`; };
const endOfDay = (): number => { const d = new Date(); d.setHours(24, 0, 0, 0); return d.getTime(); };
const endOfWeek = (): number => { const d = new Date(); const dow = (d.getDay() + 6) % 7; d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + (7 - dow)); return d.getTime(); };

export const open: PanelOpen = (ctx, focus) => {
  ensureMissions();
  let tab: 'missions' | 'achievements' = focus && 'to' in focus && focus.to === 'missions' ? 'missions' : 'missions';
  const body = h('div', { class: 'fzx-ms' });
  ctx.root.replaceChildren(body);
  ctx.title('Missions');

  const card = (v: MissionView, daily: boolean): HTMLElement => {
    const pct = Math.round((v.progress / v.def.target) * 100);
    const claim = h('button', { class: 'fzx-ms-claim', type: 'button', disabled: !v.done || v.claimed, onclick: () => {
      const r = claimMissionReward(v.def.id);
      if (!r) return;
      toast(`+${r.coins} coins${r.bonus ? ` (includes the +${r.bonus} all-three bonus!)` : ''} · +${r.xp} Pass XP`, 'good', 3200);
      draw();
    } }, v.claimed ? 'Claimed ✓' : v.done ? 'Claim' : `${v.progress} / ${v.def.target}`);
    return h('article', { class: `fzx-ms-card ${v.done ? 'done' : ''} ${v.claimed ? 'claimed' : ''}` },
      h('span', { class: 'fzx-ms-ic' }, v.def.icon),
      h('div', { class: 'fzx-ms-t' }, h('b', null, v.def.text), h('div', { class: 'fzx-ms-bar' }, h('i', { style: `width:${pct}%` })), h('small', null, coinAmount(v.def.coins, 14), h('span', null, daily ? ' · +100 Pass XP' : ' · +250 Pass XP'))),
      claim);
  };

  function draw(): void {
    const s = store.save();
    const tabs = h('div', { class: 'seg seg-sm fzx-ms-tabs' },
      ...(['missions', 'achievements'] as const).map((t) => h('button', { type: 'button', class: tab === t ? 'on' : '', onclick: () => { tab = t; draw(); } }, t === 'missions' ? 'Missions' : `Achievements ${s.achievements.length}/${ACHIEVEMENTS.length}`)));
    if (tab === 'missions') {
      const daily = viewMissions(s, 'daily'), weekly = viewMissions(s, 'weekly');
      const doneAll = daily.length === 3 && daily.every((v) => v.claimed);
      body.replaceChildren(tabs,
        h('section', null,
          h('div', { class: 'fzx-ms-head' }, h('h3', null, 'Today'), h('small', null, `New missions in ${timeLeft(endOfDay() - Date.now())}`)),
          ...daily.map((v) => card(v, true)),
          h('p', { class: 'fzx-ms-bonus' }, doneAll ? 'All three done — bonus collected! 🎉' : h('span', null, `Finish all three for a bonus of `, coinAmount(ALL_DAILY_BONUS, 14)))),
        h('section', null,
          h('div', { class: 'fzx-ms-head' }, h('h3', null, 'This week'), h('small', null, `Resets in ${timeLeft(endOfWeek() - Date.now())}`)),
          ...weekly.map((v) => card(v, false))),
        h('p', { class: 'fzx-ms-note' }, 'Missions are short on purpose — a few minutes a day is plenty.'));
    } else {
      body.replaceChildren(tabs, h('div', { class: 'fzx-ach' }, ...ACHIEVEMENTS.map((d) => {
        const done = s.achievements.includes(d.id), [v, t] = d.progress(s);
        const hidden = d.hidden && !done;
        const ch = rewardCharacter(d.id);
        return h('article', { class: `fzx-ach-card ${done ? 'done' : ''}` },
          h('span', { class: 'fzx-ms-ic' }, hidden ? '❔' : d.icon),
          h('div', { class: 'fzx-ms-t' }, h('b', null, hidden ? 'Hidden achievement' : d.name), h('small', null, hidden ? 'Keep playing to discover it…' : d.desc),
            done ? null : hidden ? null : h('div', { class: 'fzx-ms-bar' }, h('i', { style: `width:${Math.round((v / t) * 100)}%` })),
            ch && !hidden ? h('small', { class: 'fzx-ach-ch' }, `Opens ${character(ch).name}`) : null),
          done ? h('span', { class: 'fzx-ach-done' }, '✓') : h('small', { class: 'fzx-ach-n' }, hidden ? '' : `${Math.min(v, t).toLocaleString()} / ${t.toLocaleString()}`),
          !done && d.coins ? h('span', { class: 'fzx-ach-coins' }, coinMark(13), String(d.coins)) : null);
      })));
    }
  }
  draw();
  const on = () => draw();
  addEventListener('fz:crossing', on);
  void isComplete;
  return () => removeEventListener('fz:crossing', on);
};
