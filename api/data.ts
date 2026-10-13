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
 *   adventure.set                            → { now, set: { key, issuedAt, seed, n, list }, done, nextAt }  (issues a new set when due)
 *   adventure.claim { set, id, place, score } → { ok, coins, xp }  (ok = false when already collected)
 */
import { randomInt } from 'node:crypto';
import { adventure, pickSet, CYCLE_MS } from '../src/land/adventures.js';
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
      // Fuzzies Adventures: the account's current mission set — THREE missions, a new set five hours after the last one was
      // issued and only once all three are done. The server's clock decides; the app only shows it.
      case 'adventure.set': {
        const now = Date.now();
        const { rows } = await q('select key, (extract(epoch from issued_at) * 1000)::float8 as issued_at, seed, n, list, done from fz_adventure_sets where user_id = $1', [u.id]);
        let cur = rows[0] as { key: string; issued_at: number; seed: number; n: number; list: { id: string; variant: string | null }[]; done: Record<string, unknown> } | undefined;
        if (cur) cur = { ...cur, issued_at: Number(cur.issued_at), n: Number(cur.n) }; // numbers, whatever the driver hands back
        const finished = (c: typeof cur) => !!c && c.list.every((e) => !!c!.done[e.id]);
        if (!cur || (finished(cur) && now >= cur.issued_at + CYCLE_MS)) {
          const n = (cur?.n ?? 0) + 1;
          const seed = randomInt(1, 2_000_000_000);
          const list = pickSet(seed, cur?.list.map((e) => e.id) ?? []);
          await q(`insert into fz_adventure_sets (user_id, key, issued_at, seed, n, list, done) values ($1, $2, to_timestamp($3 / 1000.0), $4, $5, $6, '{}'::jsonb)
                   on conflict (user_id) do update set key = excluded.key, issued_at = excluded.issued_at, seed = excluded.seed, n = excluded.n, list = excluded.list, done = excluded.done`, [u.id, String(now), now, seed, n, JSON.stringify(list)]);
          cur = { key: String(now), issued_at: now, seed, n, list, done: {} };
        }
        return { now, set: { key: cur.key, issuedAt: cur.issued_at, seed: Number(cur.seed), n: cur.n, list: cur.list }, done: cur.done, nextAt: cur.issued_at + CYCLE_MS };
      }
      // the reward for a mission in the current set is granted once (the app pays only after this says ok)
      case 'adventure.claim': {
        const id = String(b.id ?? ''), key = String(b.set ?? ''), place = Math.round(Number(b.place)), score = b.score === undefined ? undefined : Math.round(Number(b.score));
        const adv = adventure(id);
        if (!adv || !adv.playable) throw new HttpError(400, 'That adventure doesn’t exist.');
        if (!Number.isInteger(place) || place < 1 || place > 12 || (score !== undefined && !Number.isFinite(score))) throw new HttpError(400, 'Bad result.');
        const { rows } = await q('select key, list, done from fz_adventure_sets where user_id = $1', [u.id]);
        const cur = rows[0] as { key: string; list: { id: string }[]; done: Record<string, unknown> } | undefined;
        if (!cur || cur.key !== key) throw new HttpError(400, 'That mission set is over.');
        if (!cur.list.some((e) => e.id === id)) throw new HttpError(400, 'That mission isn’t in your set.');
        const coins = adv.coins[Math.min(place, adv.coins.length) - 1];
        const r = await q('insert into fz_adventures (user_id, day, adventure, place, coins) values ($1, $2, $3, $4, $5) on conflict (user_id, day, adventure) do nothing', [u.id, key, id, place, coins]);
        const ok = (r.rowCount ?? 0) > 0;
        if (ok) await q(`update fz_adventure_sets set done = done || $2::jsonb where user_id = $1 and key = $3`, [u.id, JSON.stringify({ [id]: { place, coins, xp: adv.xp, at: Date.now(), ...(score !== undefined ? { score } : {}) } }), key]);
        return { ok, coins, xp: adv.xp };
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
