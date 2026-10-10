/**
 * Daily missions (3 new ones every day, paid in Fuzzies) and lifetime achievements (badges with a one-time reward).
 * Anything in the app reports what the user did with track(); this module decides what that completes.
 */
import { accounts, type Account } from './account';
import { rewards } from './rewards';
import { todayKey } from './util';

export type MissionEvent = 'game' | 'gameFuzzies' | 'nest' | 'level' | 'design' | 'template' | 'share' | 'link' | 'photo' | 'sticker' | 'text' | 'minute';

export interface Mission { id: string; text: string; event: MissionEvent; target: number; reward: number; kind: 'game' | 'create'; max?: boolean; icon: string }

export const MISSIONS: Mission[] = [
  { id: 'play2', text: 'Play 2 rounds of Fuzzy Crossing', event: 'game', target: 2, reward: 5, kind: 'game', icon: '🐸' },
  { id: 'fz10', text: 'Collect 10 Fuzzies while playing', event: 'gameFuzzies', target: 10, reward: 8, kind: 'game', icon: '✨' },
  { id: 'fz25', text: 'Collect 25 Fuzzies while playing', event: 'gameFuzzies', target: 25, reward: 15, kind: 'game', icon: '💫' },
  { id: 'nest3', text: 'Fill 3 nests', event: 'nest', target: 3, reward: 8, kind: 'game', icon: '🪺' },
  { id: 'level2', text: 'Reach level 2 in one game', event: 'level', target: 2, reward: 10, kind: 'game', max: true, icon: '🌅' },
  { id: 'design1', text: 'Create a new design', event: 'design', target: 1, reward: 5, kind: 'create', icon: '🎨' },
  { id: 'template1', text: 'Start a design from a template', event: 'template', target: 1, reward: 5, kind: 'create', icon: '🧩' },
  { id: 'share1', text: 'Share or download a design', event: 'share', target: 1, reward: 5, kind: 'create', icon: '📤' },
  { id: 'link1', text: 'Send someone a design link', event: 'link', target: 1, reward: 6, kind: 'create', icon: '🔗' },
  { id: 'photo1', text: 'Add a photo to a design', event: 'photo', target: 1, reward: 4, kind: 'create', icon: '📸' },
  { id: 'sticker3', text: 'Add 3 stickers', event: 'sticker', target: 3, reward: 4, kind: 'create', icon: '😜' },
  { id: 'text2', text: 'Add 2 text boxes', event: 'text', target: 2, reward: 4, kind: 'create', icon: '✍️' },
  { id: 'create10', text: 'Spend 10 minutes creating', event: 'minute', target: 10, reward: 8, kind: 'create', icon: '⏱️' },
];
export const ALL_DONE_BONUS = 10;

export interface Achievement { id: string; name: string; desc: string; icon: string; reward: number; check: (a: Account) => boolean }

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-design', name: 'First masterpiece', desc: 'Create your first design', icon: '🎨', reward: 5, check: (a) => a.stats.designs >= 1 },
  { id: 'designs-10', name: 'Prolific creator', desc: 'Create 10 designs', icon: '🖼️', reward: 20, check: (a) => a.stats.designs >= 10 },
  { id: 'first-share', name: 'Hello, world', desc: 'Share or download a design', icon: '📤', reward: 5, check: (a) => a.stats.exports >= 1 },
  { id: 'shares-25', name: 'Influencer', desc: 'Share or download 25 times', icon: '📣', reward: 20, check: (a) => a.stats.exports >= 25 },
  { id: 'link-1', name: 'Link maker', desc: 'Send a design link', icon: '🔗', reward: 5, check: (a) => a.stats.linksShared >= 1 },
  { id: 'photo-1', name: 'Shutterbug', desc: 'Add a photo to a design', icon: '📸', reward: 3, check: (a) => a.stats.photos >= 1 },
  { id: 'templates-5', name: 'Template explorer', desc: 'Use 5 templates', icon: '🧩', reward: 10, check: (a) => a.stats.templates >= 5 },
  { id: 'stickers-20', name: 'Sticker bomb', desc: 'Add 20 stickers', icon: '😜', reward: 10, check: (a) => a.stats.stickers >= 20 },
  { id: 'minutes-60', name: 'Hour of art', desc: 'Spend an hour creating', icon: '⏱️', reward: 15, check: (a) => a.stats.minutesActive >= 60 },
  { id: 'game-1', name: 'First hop', desc: 'Play Fuzzy Crossing', icon: '🐸', reward: 3, check: (a) => a.stats.gamesPlayed >= 1 },
  { id: 'games-25', name: 'Road regular', desc: 'Play 25 rounds', icon: '🚦', reward: 20, check: (a) => a.stats.gamesPlayed >= 25 },
  { id: 'nests-10', name: 'Nest builder', desc: 'Fill 10 nests', icon: '🪺', reward: 10, check: (a) => a.stats.nests >= 10 },
  { id: 'score-500', name: 'High hopper', desc: 'Score 500 in one game', icon: '🏅', reward: 10, check: (a) => a.stats.bestScore >= 500 },
  { id: 'score-2000', name: 'Crossing champion', desc: 'Score 2,000 in one game', icon: '🏆', reward: 30, check: (a) => a.stats.bestScore >= 2000 },
  { id: 'level-3', name: 'Dusk runner', desc: 'Reach level 3', icon: '🌆', reward: 15, check: (a) => a.stats.bestLevel >= 3 },
  { id: 'level-5', name: 'Unstoppable', desc: 'Reach level 5', icon: '🚀', reward: 30, check: (a) => a.stats.bestLevel >= 5 },
  { id: 'fuzzies-100', name: 'Fuzzy collector', desc: 'Earn 100 Fuzzies', icon: '✨', reward: 10, check: (a) => a.totalFuzzies >= 100 },
  { id: 'fuzzies-500', name: 'Fuzzy tycoon', desc: 'Earn 500 Fuzzies', icon: '💎', reward: 30, check: (a) => a.totalFuzzies >= 500 },
  { id: 'streak-3', name: 'On a roll', desc: 'Visit 3 days in a row', icon: '🔥', reward: 10, check: (a) => a.daily.streak >= 3 },
  { id: 'streak-7', name: 'Week of fuzz', desc: 'Visit 7 days in a row', icon: '📅', reward: 25, check: (a) => a.daily.streak >= 7 },
  { id: 'missions-day', name: 'Mission accomplished', desc: 'Finish all of a day’s missions', icon: '🎯', reward: 10, check: (a) => a.missions.bonus },
  { id: 'unlock-1', name: 'Treat yourself', desc: 'Unlock a reward', icon: '🎁', reward: 5, check: (a) => a.unlocked.length >= 1 },
  { id: 'unlock-10', name: 'Collector', desc: 'Unlock 10 rewards', icon: '👑', reward: 25, check: (a) => a.unlocked.length >= 10 },
];

/** Small string hash for picking the day's missions. */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Today's three missions: one game, one creative, one of either. Same all day, different per person. */
export function todaysMissions(a: Account | null = accounts.current): Mission[] {
  if (!a) return [];
  let h = hash(todayKey() + a.id);
  const take = (list: Mission[]) => { const m = list[h % list.length]; h = hash(String(h)); return m; };
  const game = MISSIONS.filter((m) => m.kind === 'game'), create = MISSIONS.filter((m) => m.kind === 'create');
  const out = [take(game), take(create)];
  const rest = MISSIONS.filter((m) => !out.some((o) => o.event === m.event));
  out.push(take(rest));
  return out;
}

function ensureToday(a: Account): void {
  if (a.missions.day !== todayKey()) a.missions = { day: todayKey(), progress: {}, done: [], bonus: false };
}

export function missionProgress(m: Mission): number {
  const a = accounts.current;
  if (!a || a.missions.day !== todayKey()) return 0;
  return Math.min(m.target, a.missions.progress[m.id] ?? 0);
}

export function missionDone(m: Mission): boolean {
  const a = accounts.current;
  return !!a && a.missions.day === todayKey() && a.missions.done.includes(m.id);
}

const STAT: Partial<Record<MissionEvent, keyof Account['stats']>> = { nest: 'nests', photo: 'photos', template: 'templates', sticker: 'stickers', link: 'linksShared' };

/** Report something the user did. Updates stats, mission progress and pays out anything completed. */
export function track(ev: MissionEvent, amount = 1): void {
  const a = accounts.current;
  if (!a || amount <= 0) return;
  const list = todaysMissions(a);
  const finished: Mission[] = [];
  let allDone = false;
  accounts.update((x) => {
    ensureToday(x);
    const stat = STAT[ev];
    if (stat) x.stats[stat] += amount;
    for (const m of list) {
      if (m.event !== ev || x.missions.done.includes(m.id)) continue;
      const cur = x.missions.progress[m.id] ?? 0;
      x.missions.progress[m.id] = m.max ? Math.max(cur, amount) : cur + amount;
      if (x.missions.progress[m.id] >= m.target) { x.missions.done.push(m.id); finished.push(m); }
    }
    if (finished.length && !x.missions.bonus && list.every((m) => x.missions.done.includes(m.id))) { x.missions.bonus = true; allDone = true; }
  });
  for (const m of finished) rewards.earn(m.reward, `🎯 Mission done: ${m.text}`);
  if (allDone) rewards.earn(ALL_DONE_BONUS, '🎉 All of today’s missions done!');
}

// ---------- achievements ----------
let checking = false;
export function checkAchievements(): void {
  const a = accounts.current;
  if (!a || checking) return;
  const fresh = ACHIEVEMENTS.filter((x) => !a.achievements.includes(x.id) && x.check(a));
  if (!fresh.length) return;
  checking = true;
  try {
    accounts.update((x) => { for (const f of fresh) x.achievements.push(f.id); });
    for (const f of fresh) rewards.earn(f.reward, `🏆 ${f.name}`);
  } finally { checking = false; }
}

export function startAchievements(): void {
  // Run after every account change (but outside it, so payouts don't recurse).
  let queued = false;
  accounts.onChange(() => {
    if (queued) return;
    queued = true;
    queueMicrotask(() => { queued = false; checkAchievements(); });
  });
  checkAchievements();
}
