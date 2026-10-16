/**
 * Wires the Fuzzy Crossing systems together once per session: missions (progress from game events, day/week roll-over, claiming),
 * achievements (granted as soon as they are met) and the Fuzzy-of-the-day bookkeeping. Idempotent — the screen calls initCrossing() when it opens.
 */
import * as store from './store';
import { ACHIEVEMENTS, isComplete, rewardCharacter } from './achievements';
import { applyEvent, claimMission, noteFuzzy, rollMissions, weekKey } from './missions';
import { toast } from '../ui/dom';

let started = false;
const today = (): string => store.dayKey();

/** make sure today's and this week's missions exist (call before showing them) */
export function ensureMissions(): void {
  const s = store.save();
  if (s.missions.day === today() && s.missions.week === weekKey() && s.missions.ids.length) return;
  store.mutate((c) => { rollMissions(c, today(), weekKey()); noteFuzzy(c, c.equipped.character); }, 'missions');
}

function grantAchievements(): void {
  let again = true;
  while (again) {
    again = false;
    for (const d of ACHIEVEMENTS) {
      const s = store.save();
      if (s.achievements.includes(d.id) || !isComplete(d, s)) continue;
      store.mutate((c) => { c.achievements.push(d.id); }, 'achievement', { id: d.id });
      if (d.coins) store.addCoins(d.coins);
      const ch = rewardCharacter(d.id);
      if (ch) store.grantCharacter(ch, `achievement-${d.id}`);
      if (d.cosmetic) store.grantCosmetic(d.cosmetic, `achievement-${d.id}`);
      toast(`Achievement: ${d.name}${d.coins ? ` · +${d.coins} coins` : ''}`, 'good', 3500);
      again = true;
    }
  }
}

export function initCrossing(): void {
  ensureMissions();
  if (started) return;
  started = true;
  store.addEvaluator(grantAchievements);
  store.onReport((e) => {
    ensureMissions();
    store.mutate((c) => { applyEvent(c, e); if (e.kind === 'start') noteFuzzy(c, c.equipped.character); }, 'missions');
  });
  grantAchievements();
}

/** claim a finished mission: pays coins + Fuzzy Pass XP (and the all-three bonus) */
export function claimMissionReward(id: string): { coins: number; xp: number; bonus: number } | null {
  let paid: { coins: number; xp: number; bonus: number } | null = null;
  store.mutate((c) => { paid = claimMission(c, id); }, 'missions');
  if (!paid) return null;
  const p = paid as { coins: number; xp: number; bonus: number };
  store.addCoins(p.coins);
  store.addXp(p.xp);
  return p;
}
