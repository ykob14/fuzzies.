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
create table if not exists fz_resets (
  token_hash text primary key,
  user_id uuid not null references fz_users (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz
);
create index if not exists fz_resets_user_idx on fz_resets (user_id, created_at);
`;

/** Errors that mean "the connection dropped" (Neon puts idle databases to sleep): safe to retry once. */
export function isDropped(e: unknown): boolean {
  const code = String((e as { code?: string }).code ?? '');
  const msg = String((e as Error).message ?? '');
  return ['ECONNRESET', 'EPIPE', 'ETIMEDOUT', '57P01', '57P02', '57P03', '08000', '08003', '08006'].includes(code) || /Connection terminated|connection timeout|Client has encountered a connection error/i.test(msg);
}

/** TLS errors that mean "encrypted fine, but the certificate isn't signed by a public authority" (e.g. Supabase's own CA). */
const CERT_ERRORS = ['SELF_SIGNED_CERT_IN_CHAIN', 'DEPTH_ZERO_SELF_SIGNED_CERT', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY', 'UNABLE_TO_GET_ISSUER_CERT', 'CERT_UNTRUSTED'];
const isCertError = (e: unknown) => CERT_ERRORS.includes(String((e as { code?: string }).code ?? ''));

/**
 * Connection settings from the database URL. The URL's sslmode is read here and removed (the pg driver would
 * otherwise treat "require" as "verify against public authorities", which fails for providers with their own CA):
 * - verify-full / verify-ca, or a DATABASE_CA certificate set in Vercel → strict verification only
 * - require / prefer / not given (the usual) → verify first; if the provider's certificate isn't publicly signed,
 *   stay encrypted without verification (standard libpq "require" behaviour)
 * - disable, or a local database → no TLS
 */
function settings(url: string): { config: pg.PoolConfig; relaxable: boolean } {
  let conn = url, mode = '';
  try {
    const u = new URL(url);
    mode = (u.searchParams.get('sslmode') ?? '').toLowerCase();
    for (const k of ['sslmode', 'sslrootcert', 'sslcert', 'sslkey', 'uselibpqcompat', 'channel_binding']) u.searchParams.delete(k);
    conn = u.toString();
  } catch { /* not a URL we can parse: hand it to pg unchanged */ }
  const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
  const ca = process.env.DATABASE_CA?.replace(/\\n/g, '\n');
  const base: pg.PoolConfig = { connectionString: conn, max: 3, connectionTimeoutMillis: 10_000, idleTimeoutMillis: 10_000 };
  if (local || mode === 'disable') return { config: { ...base, ssl: false }, relaxable: false };
  const strict = mode === 'verify-full' || mode === 'verify-ca' || !!ca;
  return { config: { ...base, ssl: { rejectUnauthorized: true, ...(ca ? { ca } : {}) } }, relaxable: !strict };
}

function makePool(config: pg.PoolConfig): pg.Pool {
  const p = new pg.Pool(config);
  // a connection that drops while idle must not crash the function (it's simply replaced next time)
  p.on('error', (e) => console.error('db idle client error', e));
  return p;
}

/** The shared connection pool, with the tables in place. */
export async function db(): Promise<pg.Pool> {
  const url = databaseUrl();
  if (!url) throw Object.assign(new Error('The database isn’t connected yet.'), { status: 503 });
  const { config, relaxable } = settings(url);
  pool ??= makePool(config);
  const setup = async () => {
    try { await pool!.query(SCHEMA); } catch (e) {
      if (isCertError(e)) throw e;
      // two cold starts creating the tables at the same moment can clash, or the database was just waking up: try again
      await pool!.query(SCHEMA);
    }
  };
  ready ??= (async () => {
    try { await setup(); } catch (e) {
      if (!isCertError(e) || !relaxable) throw e;
      console.warn('db: the database certificate is not publicly signed; connecting encrypted without verification (sslmode=require). Set DATABASE_CA in Vercel to verify it.');
      const old = pool;
      pool = makePool({ ...config, ssl: { rejectUnauthorized: false } });
      old?.end().catch(() => { /* already closed */ });
      await setup();
    }
  })().catch((e) => { ready = null; throw Object.assign(e, { stage: 'setup' }); });
  await ready;
  return pool!;
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
