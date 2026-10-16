/** Database helpers for the Fuzzy Crossing weekly boards (api/crossing.ts). */
import { q } from './db.js';
import { HttpError } from './auth.js';
import type { Board } from '../../src/crossing/rewards-weekly.js';

/**
 * The server's clock. Tests may move it with an `x-cx-now` header (or CX_NOW) — honoured ONLY when PAY_TEST=1 and the build is not a
 * production one, like the payment test overrides; on the live site it is always Date.now().
 */
export function testClockAllowed(): boolean {
  return process.env.PAY_TEST === '1' && process.env.NODE_ENV !== 'production' && process.env.VERCEL_ENV !== 'production';
}
export function serverNow(req?: Request): number {
  if (testClockAllowed()) {
    const h = req?.headers.get('x-cx-now') ?? process.env.CX_NOW ?? '';
    if (/^\d{10,14}$/.test(h)) return Number(h);
  }
  return Date.now();
}

/** Request-rate limit on the real clock: at most `max` stamps for `key` in the last `windowMs`; records this one. */
export async function hit(key: string, windowMs: number, max: number, message: string): Promise<void> {
  const now = Date.now();
  const { rows } = await q<{ n: number }>('select count(*)::int as n from fz_cx_hits where key = $1 and at > $2', [key, now - windowMs]);
  if (rows[0].n >= max) throw new HttpError(429, message);
  await q('insert into fz_cx_hits (key, at) values ($1, $2)', [key, now]);
  if (Math.random() < 0.02) await q('delete from fz_cx_hits where at < $1', [now - 2 * 3_600_000]).catch(() => undefined);
}

export const valueOrder = (board: Board): 'asc' | 'desc' => (board === 'fastest' ? 'asc' : 'desc');

/** 1 + how many players are ahead of this result: better value, or the same value reached earlier (then user id, only so it is stable). */
export async function rankOf(week: string, board: Board, value: number, createdAt: number, userId: string): Promise<number> {
  const op = board === 'fastest' ? '<' : '>';
  const { rows } = await q<{ n: number }>(
    `select count(*)::int as n from fz_cx_scores where week_key = $1 and board = $2
       and (value ${op} $3 or (value = $3 and (created_at < $4 or (created_at = $4 and user_id < $5))))`, [week, board, value, createdAt, userId]);
  return rows[0].n + 1;
}

export interface PublicAvatar { emoji: string; color: string; friend?: string }
/** The only bits of a profile's avatar that leave the server: a short emoji, a hex colour, or one of the Fuzzy Friends' ids. */
export function publicAvatar(a: unknown): PublicAvatar {
  const o = (a && typeof a === 'object' ? a : {}) as Record<string, unknown>;
  const emoji = typeof o.emoji === 'string' ? o.emoji.replace(/[\u0000-\u001f<>&"'`]/g, '').slice(0, 8) : '';
  const color = typeof o.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(o.color) ? o.color : '#d6336c';
  const friend = typeof o.image === 'string' ? /\/art\/friends\/(f\d{2})\.webp$/.exec(o.image.slice(0, 300))?.[1] : undefined;
  return { emoji: emoji || '🙂', color, ...(friend ? { friend } : {}) };
}
