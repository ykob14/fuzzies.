/**
 * Fuzzies balance guard. The app earns Fuzzies on the device (games, daily bonus, missions…) and sends its whole profile,
 * so the server can't check each reward — but it can stop a doctored balance: what a profile may ADD by itself is capped
 * per day (DAILY_EARN_CAP, default 2,000 — far above normal play). Bought Fuzzies and gifts don't count: the server adds
 * those itself (credits.ts). Spending is always allowed. Values are clamped to whole numbers 0…1,000,000,000.
 */
import { q } from './db.js';

const DAILY = (() => { const v = Number(process.env.DAILY_EARN_CAP ?? 2000); return Number.isFinite(v) && v >= 0 ? Math.floor(v) : 2000; })();
const FIRST_SAVE = 5000; // a guest / on-device account moving into the cloud brings what it earned
const int = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? Math.max(0, Math.min(1e9, Math.floor(n))) : 0; };

export interface Guarded { data: Record<string, unknown>; clamped: boolean; fuzzies: number; totalFuzzies: number }

/** Limit how much `incoming` raises the balance compared with what the server has (`stored`, or null for a first save). */
export async function guardBalance(userId: string, incoming: Record<string, unknown>, stored: { fuzzies?: unknown; totalFuzzies?: unknown } | null): Promise<Guarded> {
  const newF = int(incoming.fuzzies), newT = int(incoming.totalFuzzies);
  const oldF = stored ? int(stored.fuzzies) : 0, oldT = stored ? int(stored.totalFuzzies) : 0;
  const earned = Math.max(0, newT - oldT); // totalFuzzies only grows when something is earned
  let allowed = earned;
  if (earned > 0) {
    const cap = stored ? DAILY : FIRST_SAVE;
    const { rows } = await q<{ amount: number }>('select amount from fz_earn where user_id = $1 and day = current_date', [userId]);
    allowed = Math.max(0, Math.min(earned, cap - (stored ? rows[0]?.amount ?? 0 : 0)));
    if (allowed > 0) await q('insert into fz_earn (user_id, day, amount) values ($1, current_date, $2) on conflict (user_id, day) do update set amount = fz_earn.amount + excluded.amount', [userId, allowed]);
  }
  const totalFuzzies = oldT + allowed;
  // the balance can't grow more than what was earned (spending lowers it freely)
  const fuzzies = Math.min(newF, oldF + allowed);
  const clamped = fuzzies !== incoming.fuzzies || totalFuzzies !== incoming.totalFuzzies;
  return { data: { ...incoming, fuzzies, totalFuzzies }, clamped, fuzzies, totalFuzzies };
}
