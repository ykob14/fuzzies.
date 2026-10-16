/**
 * Three-way merge of two copies of an account that both changed since they were last in sync
 * (e.g. Fuzzies earned on the phone while something was unlocked on the laptop).
 * `base` is the copy both devices last agreed on.
 *
 * - a side that didn't change takes the other side's value
 * - counters add up both sides' changes (balance, stats, mission progress)
 * - bests take the higher value; lists combine (unlocks, badges, top scores)
 * - Fuzzies Land (`land`): the most recently saved town wins as a whole
 * - anything else that changed on both sides: this device wins
 */

type J = unknown;
const isObj = (x: J): x is Record<string, J> => !!x && typeof x === 'object' && !Array.isArray(x);

export function same(a: J, b: J): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b || !a || !b || typeof a !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) return a.length === (b as J[]).length && a.every((x, i) => same(x, (b as J[])[i]));
  const ka = Object.keys(a as object).filter((k) => (a as Record<string, J>)[k] !== undefined);
  const kb = Object.keys(b as object).filter((k) => (b as Record<string, J>)[k] !== undefined);
  return ka.length === kb.length && ka.every((k) => same((a as Record<string, J>)[k], (b as Record<string, J>)[k]));
}

/** Fields where the bigger number is the truth, not the sum of changes. */
const MAX_KEYS = new Set(['bestScore', 'bestLevel', 'streak', 'createdAt', 'best', 'bestCoins']);
/** Fields where the smaller number wins (a leaderboard placing: 1 is the best). 0 = never. */
const MIN_KEYS = new Set(['weeklyBest']);

function mergeAt(key: string, base: J, local: J, remote: J): J {
  if (same(local, base)) return remote;
  if (same(remote, base) || same(local, remote)) return local;
  if (typeof local === 'number' && typeof remote === 'number') {
    if (MAX_KEYS.has(key)) return Math.max(local, remote);
    if (MIN_KEYS.has(key)) return local && remote ? Math.min(local, remote) : Math.max(local, remote);
    return typeof base === 'number' ? Math.max(0, remote + (local - base)) : Math.max(local, remote);
  }
  if (Array.isArray(local) && Array.isArray(remote)) {
    const out = [...remote];
    for (const x of local) if (!out.some((y) => same(x, y))) out.push(x);
    if (key === 'topScores') return (out as { score: number }[]).sort((p, q) => q.score - p.score).slice(0, 10);
    return out;
  }
  if (isObj(local) && isObj(remote)) {
    // a new day resets missions and daily counters: the later day wins as a whole
    if (key === 'missions' && local.day !== remote.day) return String(local.day) > String(remote.day) ? local : remote;
    if (key === 'daily' && local.last !== remote.last) return String(local.last) > String(remote.last) ? local : remote;
    // Fuzzy Crossing's daily/weekly missions follow the same rule: the later day (week) wins as a whole
    if (key === 'missions' && local.week !== undefined && local.day === remote.day && local.week !== remote.week) return String(local.week) > String(remote.week) ? local : remote;
    // a town is one connected thing (buildings can't be half-moved): the most recently saved one wins
    if (key === 'land') return Number(local.savedAt ?? 0) >= Number(remote.savedAt ?? 0) ? local : remote;
    const b = isObj(base) ? base : {};
    const out: Record<string, J> = {};
    for (const k of new Set([...Object.keys(local), ...Object.keys(remote)])) {
      const v = mergeAt(k, b[k], local[k], remote[k]);
      if (v !== undefined) out[k] = v;
    }
    return out;
  }
  return local;
}

export function merge3<T>(base: T, local: T, remote: T): T {
  return mergeAt('', base, local, remote) as T;
}
