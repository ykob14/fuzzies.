/**
 * Database connection (Neon Postgres, or any Postgres). The connection string comes from Vercel's Neon
 * integration (DATABASE_URL / POSTGRES_URL). Tables are created automatically the first time the API runs.
 * Files in api/_lib are shared code, not endpoints.
 */
import pg from 'pg';

export function databaseUrl(): string {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
}

let pool: pg.Pool | null = null;
let ready: Promise<void> | null = null;

const SCHEMA = `
create table if not exists fz_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  username text not null unique,
  pass text not null,
  token_v integer not null default 0,
  created_at timestamptz not null default now()
);
create table if not exists fz_profiles (
  user_id uuid primary key references fz_users (id) on delete cascade,
  data jsonb not null,
  updated_at bigint not null
);
create table if not exists fz_designs (
  owner uuid not null references fz_users (id) on delete cascade,
  id text not null,
  data jsonb,
  deleted boolean not null default false,
  updated_at bigint not null,
  primary key (owner, id)
);
create table if not exists fz_uploads (
  owner uuid not null references fz_users (id) on delete cascade,
  id text not null,
  data jsonb,
  deleted boolean not null default false,
  updated_at bigint not null,
  primary key (owner, id)
);
create table if not exists fz_login_fails (
  email text not null,
  at timestamptz not null default now()
);
create index if not exists fz_login_fails_idx on fz_login_fails (email, at);
`;

/** Errors that mean "the connection dropped" (Neon puts idle databases to sleep): safe to retry once. */
export function isDropped(e: unknown): boolean {
  const code = String((e as { code?: string }).code ?? '');
  const msg = String((e as Error).message ?? '');
  return ['ECONNRESET', 'EPIPE', 'ETIMEDOUT', '57P01', '57P02', '57P03', '08000', '08003', '08006'].includes(code) || /Connection terminated|connection timeout|Client has encountered a connection error/i.test(msg);
}

/** The shared connection pool, with the tables in place. */
export async function db(): Promise<pg.Pool> {
  const url = databaseUrl();
  if (!url) throw Object.assign(new Error('The database isn’t connected yet.'), { status: 503 });
  if (!pool) {
    const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
    pool = new pg.Pool({
      connectionString: url, max: 3, ssl: local ? undefined : { rejectUnauthorized: true },
      // serverless: don't hang on a sleeping database, and let idle connections go before Neon drops them
      connectionTimeoutMillis: 10_000, idleTimeoutMillis: 10_000,
    });
    // a connection that drops while idle must not crash the function (it's simply replaced next time)
    pool.on('error', (e) => console.error('db idle client error', e));
  }
  ready ??= (async () => {
    try { await pool!.query(SCHEMA); } catch {
      // two cold starts creating the tables at the same moment can clash, or the database was just waking up: try again
      await pool!.query(SCHEMA);
    }
  })().catch((e) => { ready = null; throw Object.assign(e, { stage: 'setup' }); });
  await ready;
  return pool;
}

/** Run a query, retrying once if the connection had dropped. */
// rows default to `any`, like pg's own query()
export async function q<R extends pg.QueryResultRow = any>(text: string, values?: unknown[]): Promise<pg.QueryResult<R>> {
  const p = await db();
  try { return await p.query<R>(text, values); } catch (e) {
    if (!isDropped(e)) throw e;
    return (await db()).query<R>(text, values);
  }
}
