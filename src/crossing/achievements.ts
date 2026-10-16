/**
 * Long-term achievements (pure: they read a CrossingSave). Some also open a collectible Fuzzy (see characters.ts `unlock.kind === 'achievement'`),
 * some are hidden until earned. Each pays coins once; the unlock engine in init.ts grants them as soon as they are met.
 */
import type { CrossingSave } from './save';
import { CHARACTERS } from './characters';
import { passLevel } from './pass';

export interface AchievementDef {
  id: string; name: string; desc: string; icon: string; coins: number;
  hidden?: boolean;
  /** current / target for the progress bar */
  progress: (s: CrossingSave) => [number, number];
  cosmetic?: string;
}
const cnt = (target: number, get: (s: CrossingSave) => number) => (s: CrossingSave): [number, number] => [Math.min(target, get(s)), target];
const a = (id: string, name: string, desc: string, icon: string, coins: number, progress: AchievementDef['progress'], extra: Partial<AchievementDef> = {}): AchievementDef => ({ id, name, desc, icon, coins, progress, ...extra });
const stars = (s: CrossingSave): number => Object.values(s.worlds).reduce((x, y) => x + y, 0);
const worldsCleared = (s: CrossingSave): number => { let n = 0; for (let w = 1; w <= 10; w++) { let all = true; for (let l = 1; l <= 15; l++) if (!s.worlds[`${w}-${l}`]) all = false; if (all) n++; } return n; };
const levelsIn = (s: CrossingSave): number => Object.keys(s.worlds).length;

export const ACHIEVEMENTS: AchievementDef[] = [
  a('hops-100', 'First steps', 'Hop 100 times', '🐾', 20, cnt(100, (s) => s.stats.crossings)),
  a('hops-1000', 'Born to hop', 'Hop 1,000 times', '🐇', 60, cnt(1000, (s) => s.stats.crossings)),
  a('hops-10000', 'Hop legend', 'Hop 10,000 times', '🦘', 250, cnt(10000, (s) => s.stats.crossings)),
  a('pickups-100', 'Coin collector', 'Collect 100 coins', '🪙', 30, cnt(100, (s) => s.stats.pickups)),
  a('pickups-1000', 'Coin hoarder', 'Collect 1,000 coins', '💰', 100, cnt(1000, (s) => s.stats.pickups)),
  a('gold-25', 'Golden touch', 'Collect 25 golden Fuzzies', '🌟', 60, cnt(25, (s) => s.stats.goldPickups)),
  a('gold-250', 'Thunder collector', 'Collect 250 golden Fuzzies', '⚡', 300, cnt(250, (s) => s.stats.goldPickups)),
  a('nests-10', 'Nest builder', 'Fill 10 nests', '🪺', 30, cnt(10, (s) => s.stats.nests)),
  a('nests-100', 'Guardian of the nests', 'Fill 100 nests', '🛡️', 150, cnt(100, (s) => s.stats.nests)),
  a('nests-500', 'Nest master', 'Fill 500 nests', '🏰', 400, cnt(500, (s) => s.stats.nests)),
  a('games-10', 'Getting started', 'Play 10 games', '🎮', 20, cnt(10, (s) => s.stats.games)),
  a('games-100', 'Regular', 'Play 100 games', '🎸', 200, cnt(100, (s) => s.stats.games)),
  a('games-500', 'Crossing devotee', 'Play 500 games', '🎖️', 500, cnt(500, (s) => s.stats.games)),
  a('lives-100', 'Bone-weary', 'Lose 100 lives. It happens to the best of us', '💀', 100, cnt(100, (s) => s.stats.lives)),
  a('levels-10', 'On the road', 'Clear 10 levels', '🏁', 40, cnt(10, (s) => s.stats.levelsCleared)),
  a('levels-100', 'Road warrior', 'Clear 100 levels', '🏆', 200, cnt(100, (s) => s.stats.levelsCleared)),
  a('worlds-1', 'World explorer', 'Clear every level of a world', '🌍', 150, cnt(1, worldsCleared)),
  a('worlds-5', 'World traveller', 'Clear every level of 5 worlds', '🧭', 400, cnt(5, worldsCleared)),
  a('worlds-10', 'Legend of the Fuzzy Worlds', 'Clear every level of all 10 worlds', '👑', 1000, cnt(10, worldsCleared)),
  a('stars-30', 'Star gazer', 'Earn 30 stars in the worlds', '⭐', 80, cnt(30, stars)),
  a('stars-150', 'Constellation', 'Earn 150 stars in the worlds', '🌌', 300, cnt(150, stars)),
  a('stars-450', 'Perfectionist', 'Earn all 450 stars', '✨', 1500, cnt(450, stars), { hidden: true }),
  a('endless-50', 'Keep going', 'Reach 50 in Endless Crossing', '♾️', 60, cnt(50, (s) => s.endless.best)),
  a('endless-300', 'Marathon Fuzzy', 'Reach 300 in Endless Crossing', '🏃', 250, cnt(300, (s) => s.endless.best)),
  a('collection-10', 'Collector', 'Own 10 Fuzzies', '🧸', 60, cnt(10, (s) => s.owned.length)),
  a('collection-25', 'Fuzzy fan', 'Own 25 Fuzzies', '🎪', 200, cnt(25, (s) => s.owned.length)),
  a('collection-45', 'Almost everyone', 'Own 45 Fuzzies', '🌈', 500, cnt(45, (s) => s.owned.length)),
  a('coins-10000', 'Golden Fuzzy', 'Earn 10,000 coins in total', '🥇', 0, cnt(10000, (s) => s.coinsEarned)),
  a('spend-1000', 'Shopper', 'Spend 1,000 coins in the Fuzzy Shop', '🛍️', 60, cnt(1000, (s) => s.stats.coinsSpent)),
  a('pass-10', 'Pass starter', 'Reach Fuzzy Pass level 10', '🎟️', 50, cnt(10, (s) => passLevel(s.xp).level)),
  a('pass-25', 'Halfway there', 'Reach Fuzzy Pass level 25', '🎫', 150, cnt(25, (s) => passLevel(s.xp).level)),
  a('pass-50', 'Pass complete', 'Reach Fuzzy Pass level 50', '🔥', 400, cnt(50, (s) => passLevel(s.xp).level)),
  a('missions-10', 'Daily habit', 'Complete 10 missions', '📅', 60, cnt(10, (s) => s.stats.missionsDone)),
  a('missions-50', 'Mission master', 'Complete 50 missions', '🗓️', 250, cnt(50, (s) => s.stats.missionsDone)),
  a('trains-50', 'Rail runner', 'Survive 50 train crossings', '🚆', 120, cnt(50, (s) => s.stats.trainsSurvived)),
  // hidden: discovered by doing
  a('splash-25', 'Fish out of water', 'Fall in the river 25 times', '💦', 40, cnt(25, (s) => s.stats.splashes), { hidden: true }),
  a('crash-25', 'Road pizza', 'Get hit by traffic 25 times', '🍕', 40, cnt(25, (s) => s.stats.crashes), { hidden: true }),
  a('commons-all', 'Every little Fuzzy', 'Own every Common Fuzzy', '🐣', 150, (s) => { const c = CHARACTERS.filter((x) => x.rarity === 'common'); return [c.filter((x) => s.owned.includes(x.id)).length, c.length]; }, { hidden: true }),
  a('flawless-10', 'Smooth operator', 'Clear 10 levels without losing a life', '💎', 150, cnt(10, (s) => s.stats.noDeathLevels), { hidden: true }),
  a('levels-all', 'Every level', 'Clear all 150 levels', '🗺️', 600, cnt(150, levelsIn), { hidden: true }),
];
export const ACHIEVEMENT_BY_ID: Record<string, AchievementDef> = Object.fromEntries(ACHIEVEMENTS.map((x) => [x.id, x]));
export const isComplete = (d: AchievementDef, s: CrossingSave): boolean => { const [v, t] = d.progress(s); return v >= t; };
/** the Fuzzy this achievement opens, if any */
export const rewardCharacter = (id: string): string | undefined => CHARACTERS.find((c) => c.unlock.kind === 'achievement' && c.unlock.id === id)?.id;
