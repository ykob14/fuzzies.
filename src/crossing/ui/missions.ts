/** Missions screen: today's three, this week's three, and the long-term achievements (hidden ones show as ??? until earned). */
import { h, toast } from '../../ui/dom';
import * as store from '../store';
import { ensureMissions, claimMissionReward } from '../init';
import { viewMissions, ALL_DAILY_BONUS, type MissionView } from '../missions';
import { ACHIEVEMENTS, rewardCharacter } from '../achievements';
import { character } from '../characters';
import { XP } from '../pass';
import { coinMark } from './kit';
import { gicon, gtile, METRIC_ICON } from './gicons';
import type { PanelOpen } from '../hub';
import './gameui.css';
import './missions.css';

const timeLeft = (ms: number): string => { const m = Math.max(0, Math.round(ms / 60000)); return m >= 1440 ? `${Math.floor(m / 1440)}d ${Math.floor((m % 1440) / 60)}h` : m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`; };
const endOfDay = (): number => { const d = new Date(); d.setHours(24, 0, 0, 0); return d.getTime(); };
const endOfWeek = (): number => { const d = new Date(); const dow = (d.getDay() + 6) % 7; d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + (7 - dow)); return d.getTime(); };

const coinChip = (n: number): HTMLElement => h('span', { class: 'fzx-chip' }, coinMark(17), String(n));
const xpChip = (n: number): HTMLElement => h('span', { class: 'fzx-chip xp' }, gicon('star', 14), String(n));

export const open: PanelOpen = (ctx) => {
  ensureMissions();
  let tab: 'missions' | 'achievements' = 'missions';
  const body = h('div', { class: 'fzx-ms' });
  ctx.root.replaceChildren(body);
  ctx.title('Missions');

  const row = (v: MissionView, daily: boolean): HTMLElement => {
    const pct = Math.round((v.progress / v.def.target) * 100);
    const xp = daily ? XP.mission : XP.weeklyMission;
    const ready = v.done && !v.claimed;
    const reward = ready
      ? h('button', { class: 'fzx-bigbtn fzx-claim fzx-wiggle', type: 'button', onclick: () => {
        const r = claimMissionReward(v.def.id);
        if (!r) return;
        toast(`+${r.coins} coins${r.bonus ? ` · includes the +${r.bonus} bonus!` : ''} · +${r.xp} Pass XP`, 'good', 3200);
        draw();
      } }, 'Claim')
      : v.claimed ? h('span', { class: 'fzx-got' }, gicon('check', 18)) : h('span', { class: 'fzx-rew' }, coinChip(v.def.coins), xpChip(xp));
    return h('article', { class: `fzx-mrow fzx-card ${ready ? 'ready' : ''} ${v.claimed ? 'claimed' : ''}` },
      gtile(v.claimed ? 'check' : METRIC_ICON[v.def.metric] ?? 'star', 48, v.claimed ? 'grey' : ready ? '' : 'soft'),
      h('div', { class: 'fzx-mt' },
        h('b', null, v.def.text),
        h('div', { class: `fzx-prog ${pct >= 100 ? 'full' : ''}` }, h('i', { style: `width:${Math.max(pct, 0)}%;${pct === 0 ? 'display:none' : ''}` }), h('b', null, `${v.progress.toLocaleString()} / ${v.def.target.toLocaleString()}`))),
      reward);
  };

  function draw(): void {
    const s = store.save();
    const tabs = h('div', { class: 'fzx-tabs' },
      h('button', { type: 'button', class: tab === 'missions' ? 'on' : '', onclick: () => { tab = 'missions'; draw(); } }, gicon('missions', 18), 'Missions'),
      h('button', { type: 'button', class: tab === 'achievements' ? 'on' : '', onclick: () => { tab = 'achievements'; draw(); } }, gicon('medal', 18), 'Badges', h('small', null, `${s.achievements.length}/${ACHIEVEMENTS.length}`)));
    if (tab === 'missions') {
      const daily = viewMissions(s, 'daily'), weekly = viewMissions(s, 'weekly');
      const got = daily.filter((v) => v.claimed).length;
      const doneAll = daily.length === 3 && got === 3;
      body.replaceChildren(tabs,
        h('section', null,
          h('div', { class: 'fzx-sh' }, h('h3', null, 'Today'), h('span', { class: 'fzx-timer' }, `New in ${timeLeft(endOfDay() - Date.now())}`)),
          ...daily.map((v) => row(v, true)),
          h('div', { class: `fzx-bonus fzx-card ${doneAll ? 'done' : ''}` },
            gtile('chest', 46, 'gold'),
            h('div', { class: 'fzx-mt' }, h('b', null, doneAll ? 'Bonus collected!' : 'Finish all 3 for a bonus'), h('span', { class: 'fzx-pips' }, ...[0, 1, 2].map((i) => h('i', { class: i < got ? 'on' : '' })))),
            doneAll ? h('span', { class: 'fzx-got' }, gicon('check', 18)) : coinChip(ALL_DAILY_BONUS))),
        h('section', null,
          h('div', { class: 'fzx-sh' }, h('h3', null, 'This week'), h('span', { class: 'fzx-timer' }, `Resets in ${timeLeft(endOfWeek() - Date.now())}`)),
          ...weekly.map((v) => row(v, false))));
    } else {
      body.replaceChildren(tabs, h('div', { class: 'fzx-ach' }, ...ACHIEVEMENTS.map((d) => {
        const done = s.achievements.includes(d.id), [v, t] = d.progress(s);
        const hidden = d.hidden && !done;
        const ch = rewardCharacter(d.id);
        const pct = Math.min(100, Math.round((v / t) * 100));
        return h('article', { class: `fzx-medal fzx-card ${done ? 'done' : ''}` },
          gtile(hidden ? 'lock' : 'medal', 54, done ? 'gold' : 'grey'),
          h('b', null, hidden ? 'Secret badge' : d.name),
          h('small', null, hidden ? 'Keep playing to find it…' : d.desc),
          done ? h('span', { class: 'fzx-got sm' }, gicon('check', 15))
            : hidden ? null : h('div', { class: 'fzx-prog sm' }, h('i', { style: `width:${pct}%;${pct === 0 ? 'display:none' : ''}` }), h('b', null, `${Math.min(v, t).toLocaleString()} / ${t.toLocaleString()}`)),
          ch && !hidden ? h('em', null, `Opens ${character(ch).name}`) : !done && d.coins && !hidden ? coinChip(d.coins) : null);
      })));
    }
  }
  draw();
  const on = () => draw();
  addEventListener('fz:crossing', on);
  return () => removeEventListener('fz:crossing', on);
};
