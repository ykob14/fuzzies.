/**
 * POST /api/data  { action, ... }  — everything here needs a login, and only ever touches that person's rows.
 *   profile.get                              → { profile: { username, data, updated_at } | null }
 *   profile.put { data, at, ifVersion }      → { ok } | { conflict: true }
 *       ifVersion = the version this device last saw (null = first save). If someone else saved since,
 *       nothing is written and the app merges and tries again.
 *   rows.list   { kind }                     → { rows: [{ id, updated_at, deleted }] }
 *   rows.get    { kind, ids }                → { rows: [{ id, data }] }
 *   rows.put    { kind, row: { id, data, deleted, updated_at } } → { ok }
 *   kind = 'designs' | 'uploads'
 */
import { adventure } from '../src/land/adventures.js';
import { applyCredits } from './_lib/credits.js';
import { guardBalance, type Guarded } from './_lib/balance.js';
import { db, q } from './_lib/db.js';
import { handle, requireUser, HttpError } from './_lib/auth.js';

const TABLES = { designs: 'fz_designs', uploads: 'fz_uploads' } as const;
const tableOf = (k: unknown) => {
  const t = TABLES[k as keyof typeof TABLES];
  if (!t) throw new HttpError(400, 'Unknown kind.');
  return t;
};
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : NaN);

export function GET(req: Request): Promise<Response> {
  return handle(req, async () => ({}));
}

export function POST(req: Request): Promise<Response> {
  return handle(req, async (b) => {
    const u = await requireUser(req);
    await db(); // connects and makes sure the tables exist
    switch (b.action) {
      // Fuzzies Adventures: the reward for today's mission is granted once per adventure per day (the app pays only after this says ok)
      case 'adventure.claim': {
        const id = String(b.id ?? ''), day = String(b.day ?? ''), place = Math.round(Number(b.place));
        const adv = adventure(id);
        if (!adv || !adv.playable) throw new HttpError(400, 'That adventure doesn’t exist.');
        if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isInteger(place) || place < 1 || place > 12) throw new HttpError(400, 'Bad result.');
        // the day is the player's local calendar day: allow a day either side of the server's clock, nothing older
        const diff = Math.abs(Date.UTC(+day.slice(0, 4), +day.slice(5, 7) - 1, +day.slice(8, 10)) - Date.now()) / 86_400_000;
        if (!Number.isFinite(diff) || diff > 1.5) throw new HttpError(400, 'That day’s mission has expired.');
        const coins = adv.coins[Math.min(place, adv.coins.length) - 1];
        const r = await q('insert into fz_adventures (user_id, day, adventure, place, coins) values ($1, $2, $3, $4, $5) on conflict (user_id, day, adventure) do nothing', [u.id, day, id, place, coins]);
        return { ok: (r.rowCount ?? 0) > 0, coins, xp: adv.xp };
      }
      case 'profile.get': {
        await applyCredits(u.id); // Fuzzies bought or gifted while this account's profile wasn't saved yet
        const { rows } = await q('select data, updated_at::float8 as updated_at from fz_profiles where user_id = $1', [u.id]);
        return { profile: rows[0] ? { username: u.username, data: rows[0].data, updated_at: rows[0].updated_at } : null };
      }
      case 'profile.put': {
        const at = num(b.at);
        if (!b.data || typeof b.data !== 'object' || Number.isNaN(at)) throw new HttpError(400, 'Bad profile.');
        const incoming = { ...(b.data as Record<string, unknown>), username: u.username };
        // the Fuzzies balance can't be raised beyond what normal play earns (see _lib/balance.ts)
        const reply = (g: Guarded) => (g.clamped ? { ok: true, fuzzies: g.fuzzies, totalFuzzies: g.totalFuzzies } : { ok: true });
        if (b.ifVersion === null || b.ifVersion === undefined) {
          const { rows: had } = await q('select 1 from fz_profiles where user_id = $1', [u.id]);
          if (had[0]) return { conflict: true };
          const g = await guardBalance(u.id, incoming, null);
          const r = await q('insert into fz_profiles (user_id, data, updated_at) values ($1, $2, $3) on conflict (user_id) do nothing', [u.id, JSON.stringify(g.data), at]);
          return r.rowCount ? reply(g) : { conflict: true };
        }
        const { rows: cur } = await q<{ f: unknown; t: unknown; v: number }>("select data->'fuzzies' as f, data->'totalFuzzies' as t, updated_at::float8 as v from fz_profiles where user_id = $1", [u.id]);
        if (!cur[0] || cur[0].v !== num(b.ifVersion)) return { conflict: true };
        const g = await guardBalance(u.id, incoming, { fuzzies: cur[0].f, totalFuzzies: cur[0].t });
        const r = await q('update fz_profiles set data = $2, updated_at = $3 where user_id = $1 and updated_at = $4', [u.id, JSON.stringify(g.data), at, num(b.ifVersion)]);
        return r.rowCount ? reply(g) : { conflict: true };
      }
      case 'rows.list': {
        const { rows } = await q(`select id, updated_at::float8 as updated_at, deleted from ${tableOf(b.kind)} where owner = $1`, [u.id]);
        return { rows };
      }
      case 'rows.get': {
        const ids = Array.isArray(b.ids) ? b.ids.filter((x): x is string => typeof x === 'string').slice(0, 50) : [];
        const { rows } = await q(`select id, data from ${tableOf(b.kind)} where owner = $1 and id = any($2)`, [u.id, ids]);
        return { rows };
      }
      case 'rows.put': {
        const r = b.row as { id?: unknown; data?: unknown; deleted?: unknown; updated_at?: unknown } | undefined;
        const at = num(r?.updated_at);
        if (!r || typeof r.id !== 'string' || !r.id || r.id.length > 80 || Number.isNaN(at)) throw new HttpError(400, 'Bad row.');
        const deleted = r.deleted === true;
        await q(
          `insert into ${tableOf(b.kind)} (owner, id, data, deleted, updated_at) values ($1, $2, $3, $4, $5)
           on conflict (owner, id) do update set data = excluded.data, deleted = excluded.deleted, updated_at = excluded.updated_at`,
          [u.id, r.id, deleted ? null : JSON.stringify(r.data ?? null), deleted, at]);
        return { ok: true };
      }
      default:
        throw new HttpError(400, 'Unknown action.');
    }
  });
}
