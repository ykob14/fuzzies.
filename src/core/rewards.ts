/** Fuzzies: the token you collect in Fuzzy Crossing (and a few other ways) to unlock goodies. */
import { accounts } from './account';
import { todayKey } from './util';

type EarnListener = (amount: number, reason: string) => void;
const earnListeners = new Set<EarnListener>();

export const rewards = {
  balance(): number { return accounts.current?.fuzzies ?? 0; },

  isUnlocked(id: string, cost = 1): boolean {
    if (cost <= 0) return true;
    return !!accounts.current?.unlocked.includes(id);
  },

  canAfford(cost: number): boolean { return this.balance() >= cost; },

  /** Spend Fuzzies to unlock an item. Returns false if the balance is too low. */
  unlock(id: string, cost: number): boolean {
    const a = accounts.current;
    if (!a) return false;
    if (a.unlocked.includes(id)) return true;
    if (a.fuzzies < cost) return false;
    accounts.update((x) => { x.fuzzies -= cost; x.unlocked.push(id); });
    return true;
  },

  earn(amount: number, reason: string, fromGame = false): void {
    if (!accounts.current || amount <= 0) return;
    accounts.update((a) => {
      a.fuzzies += amount;
      a.totalFuzzies += amount;
      if (fromGame) a.stats.fuzziesFromGame += amount;
    });
    for (const l of earnListeners) l(amount, reason);
  },

  onEarn(fn: EarnListener): () => void {
    earnListeners.add(fn);
    return () => earnListeners.delete(fn);
  },

  /** Daily visit bonus: 5 Fuzzies, +2 per day of streak, up to 15. */
  dailyStatus(): { available: boolean; amount: number; streak: number } {
    const a = accounts.current;
    if (!a) return { available: false, amount: 0, streak: 0 };
    const today = todayKey();
    const y = new Date(); y.setDate(y.getDate() - 1);
    const continuing = a.daily.last === todayKey(y);
    const streak = a.daily.last === today ? a.daily.streak : continuing ? a.daily.streak + 1 : 1;
    return { available: a.daily.last !== today, amount: Math.min(15, 5 + (streak - 1) * 2), streak };
  },

  claimDaily(): number {
    const s = this.dailyStatus();
    if (!s.available) return 0;
    accounts.update((a) => { a.daily.last = todayKey(); a.daily.streak = s.streak; });
    this.earn(s.amount, `Day ${s.streak} bonus`);
    return s.amount;
  },

  /** +2 Fuzzies per export, up to 5 rewarded exports a day. */
  exported(): void {
    const a = accounts.current;
    if (!a) return;
    const today = todayKey();
    let rewarded = false;
    accounts.update((x) => {
      x.stats.exports++;
      if (x.daily.exportsDay !== today) { x.daily.exportsDay = today; x.daily.exportsToday = 0; }
      if (x.daily.exportsToday < 5) { x.daily.exportsToday++; rewarded = true; }
    });
    if (rewarded) this.earn(2, 'Design shared');
  },
};

/**
 * Time-on-app reward: 1 Fuzzy for every 5 minutes you are actively creating
 * (the tab is visible and you touched, clicked or typed in the last minute).
 */
export function startActivityRewards(): void {
  let lastInput = Date.now();
  let activeSeconds = 0;
  const mark = () => { lastInput = Date.now(); };
  for (const ev of ['pointerdown', 'keydown', 'wheel']) addEventListener(ev, mark, { passive: true });
  setInterval(() => {
    if (!accounts.current || document.hidden || Date.now() - lastInput > 60_000) return;
    activeSeconds += 10;
    if (activeSeconds % 60 === 0) accounts.update((a) => { a.stats.minutesActive++; });
    if (activeSeconds >= 300) { activeSeconds = 0; rewards.earn(1, '5 creative minutes'); }
  }, 10_000);
}
