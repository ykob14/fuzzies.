/** "Today's missions" card and the achievements badge wall. */
import { todaysMissions, missionProgress, missionDone, ACHIEVEMENTS, ALL_DONE_BONUS } from '../core/missions';
import { accounts } from '../core/account';
import { h, fuzzyMark, icon } from './dom';
import { missionFace } from './homeArt';

/** Live card: re-renders itself when progress changes, and stops listening once removed from the page. */
export function missionsCard(): HTMLElement {
  const card = h('section', { class: 'missions' });
  const render = () => {
    const list = todaysMissions();
    const done = list.filter(missionDone).length;
    const a = accounts.current;
    const bonusClaimed = !!a?.missions.bonus && done === list.length;
    const midnight = new Date(); midnight.setHours(24, 0, 0, 0);
    const hrs = Math.max(1, Math.round((midnight.getTime() - Date.now()) / 3.6e6));
    card.replaceChildren(
      h('div', { class: 'missions-head' },
        h('div', null, h('h2', null, 'Today’s missions'), h('small', { class: 'muted' }, `${done}/${list.length} done · new missions in ${hrs}h`)),
        h('span', { class: `bonus-chip ${bonusClaimed ? 'got' : ''}` }, bonusClaimed ? icon('check', 14) : fuzzyMark(16), bonusClaimed ? 'Bonus earned' : `All 3: +${ALL_DONE_BONUS}`)),
      ...list.map((m) => {
        const p = missionProgress(m), ok = missionDone(m);
        const go = m.kind === 'game' ? '#/play' : m.event === 'template' ? '#/templates' : m.event === 'design' ? null : '#/projects';
        const row = h(go ? 'a' : 'div', { class: `mission ${ok ? 'done' : ''}`, ...(go ? { href: go } : {}) },
          missionFace(m.id, ok),
          h('div', { class: 'mission-body' },
            h('b', null, m.text),
            h('div', { class: 'progress small' }, h('div', { style: `width:${(p / m.target) * 100}%` })),
            h('small', { class: 'muted' }, ok ? 'Complete!' : `${p} / ${m.target}`)),
          h('span', { class: 'mission-reward' }, fuzzyMark(16), `+${m.reward}`));
        return row;
      }));
  };
  render();
  const off = accounts.onChange(() => { if (!card.isConnected) { off(); return; } render(); });
  return card;
}

export function achievementsGrid(compact = false): HTMLElement {
  const a = accounts.current;
  const got = new Set(a?.achievements ?? []);
  const list = compact ? ACHIEVEMENTS.filter((x) => got.has(x.id)) : ACHIEVEMENTS;
  const grid = h('div', { class: `badges ${compact ? 'compact' : ''}` }, ...list.map((x) => h('div', { class: `badge ${got.has(x.id) ? 'got' : ''}`, title: `${x.name} — ${x.desc}` },
    h('span', { class: 'badge-ic' }, got.has(x.id) ? x.icon : '🔒'),
    h('b', null, x.name),
    compact ? null : h('small', null, x.desc),
    compact ? null : h('span', { class: 'badge-reward' }, fuzzyMark(12), `+${x.reward}`))));
  if (compact && !list.length) return h('p', { class: 'muted badges-empty' }, 'No badges yet — make a design or play a round to earn your first!');
  return grid;
}
