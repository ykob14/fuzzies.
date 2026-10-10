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
import { db } from './_lib/db.js';
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
    const pool = await db();
    switch (b.action) {
      case 'profile.get': {
        const { rows } = await pool.query('select data, updated_at::float8 as updated_at from fz_profiles where user_id = $1', [u.id]);
        return { profile: rows[0] ? { username: u.username, data: rows[0].data, updated_at: rows[0].updated_at } : null };
      }
      case 'profile.put': {
        const at = num(b.at);
        if (!b.data || typeof b.data !== 'object' || Number.isNaN(at)) throw new HttpError(400, 'Bad profile.');
        const data = JSON.stringify({ ...(b.data as object), username: u.username });
        if (b.ifVersion === null || b.ifVersion === undefined) {
          const r = await pool.query('insert into fz_profiles (user_id, data, updated_at) values ($1, $2, $3) on conflict (user_id) do nothing', [u.id, data, at]);
          return r.rowCount ? { ok: true } : { conflict: true };
        }
        const r = await pool.query('update fz_profiles set data = $2, updated_at = $3 where user_id = $1 and updated_at = $4', [u.id, data, at, num(b.ifVersion)]);
        return r.rowCount ? { ok: true } : { conflict: true };
      }
      case 'rows.list': {
        const { rows } = await pool.query(`select id, updated_at::float8 as updated_at, deleted from ${tableOf(b.kind)} where owner = $1`, [u.id]);
        return { rows };
      }
      case 'rows.get': {
        const ids = Array.isArray(b.ids) ? b.ids.filter((x): x is string => typeof x === 'string').slice(0, 50) : [];
        const { rows } = await pool.query(`select id, data from ${tableOf(b.kind)} where owner = $1 and id = any($2)`, [u.id, ids]);
        return { rows };
      }
      case 'rows.put': {
        const r = b.row as { id?: unknown; data?: unknown; deleted?: unknown; updated_at?: unknown } | undefined;
        const at = num(r?.updated_at);
        if (!r || typeof r.id !== 'string' || !r.id || r.id.length > 80 || Number.isNaN(at)) throw new HttpError(400, 'Bad row.');
        const deleted = r.deleted === true;
        await pool.query(
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
