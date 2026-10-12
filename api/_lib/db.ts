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
-- Template catalog: metadata (searchable) kept apart from the editable document; published = visible to everyone.
create table if not exists fz_templates (
  id text primary key,
  status text not null default 'draft',
  name text not null,
  category text not null default '',
  sub text not null default '',
  format text not null default '',
  format_label text not null default '',
  width integer not null,
  height integer not null,
  pages integer not null default 1,
  style text not null default '',
  colors text[] not null default '{}',
  occasion text not null default '',
  tags text[] not null default '{}',
  thumb text,
  doc jsonb not null,
  revision integer not null default 1,
  search tsvector,
  author uuid references fz_users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists fz_templates_search on fz_templates using gin (search);
create index if not exists fz_templates_listing on fz_templates (status, created_at desc);
-- One row per person per template per day: real usage for "Trending" and "Popular" (no personal details shown).
create table if not exists fz_template_uses (
  template_id text not null,
  user_id uuid not null references fz_users (id) on delete cascade,
  day date not null default current_date,
  primary key (template_id, user_id, day)
);
create index if not exists fz_template_uses_day on fz_template_uses (day);
-- Template managers chosen in the database (in addition to ADMIN_EMAILS in Vercel).
create table if not exists fz_admins (
  user_id uuid primary key references fz_users (id) on delete cascade,
  created_at timestamptz not null default now()
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
-- Crypto wallets linked to an account (proved by signing a one-time message; one account per wallet).
create table if not exists fz_wallets (
  address text primary key,
  user_id uuid not null references fz_users (id) on delete cascade,
  wallet text not null default '',
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);
create index if not exists fz_wallets_user_idx on fz_wallets (user_id);
-- One-time wallet sign-in messages written by the server (10 minutes, single use).
create table if not exists fz_wallet_nonces (
  nonce text primary key,
  address text not null,
  purpose text not null,
  user_id uuid references fz_users (id) on delete cascade,
  message text not null,
  wallet text not null default '',
  ip text not null default '',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index if not exists fz_wallet_nonces_addr_idx on fz_wallet_nonces (address, created_at);
create index if not exists fz_wallet_nonces_ip_idx on fz_wallet_nonces (ip, created_at);
-- the network the message was signed for (smart wallets are checked on that network)
alter table fz_wallet_nonces add column if not exists chain_id integer not null default 1;
-- a wallet can log in once its one-time activation is paid (or straight away when there's no fee)
alter table fz_wallets add column if not exists active boolean not null default true;
-- accounts created with a wallet have no email or password until the player adds them (Profile → Account)
alter table fz_users alter column email drop not null;
alter table fz_users alter column pass drop not null;
-- Payments in crypto (Fuzzies packs, wallet activation). Amounts are exact base units (wei, lamports, USDC micro-units),
-- unique among open payments so each on-chain transfer matches exactly one payment.
create table if not exists fz_payments (
  id text primary key,
  user_id uuid not null references fz_users (id) on delete cascade,
  kind text not null,
  item text not null,
  usd_cents integer not null,
  fuzzies integer not null default 0,
  network text not null,
  asset text not null,
  amount text not null,
  pay_to text not null,
  reference text,
  status text not null default 'pending',
  tx text unique,
  payer text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  paid_at timestamptz
);
create index if not exists fz_payments_user_idx on fz_payments (user_id, created_at);
create unique index if not exists fz_payments_open_amount on fz_payments (network, asset, amount) where status = 'pending';
-- Fuzzies the server adds to an account (paid packs, opened gifts); applied to the profile once, then marked.
create table if not exists fz_credits (
  id text primary key,
  user_id uuid not null references fz_users (id) on delete cascade,
  amount integer not null,
  reason text not null,
  created_at timestamptz not null default now(),
  applied_at timestamptz
);
-- Gift boxes waiting to be opened (e.g. 100 Fuzzies for a newly activated wallet).
create table if not exists fz_gifts (
  id text primary key,
  user_id uuid not null references fz_users (id) on delete cascade,
  amount integer not null,
  reason text not null,
  created_at timestamptz not null default now(),
  opened_at timestamptz
);
-- Fuzzies a profile added by itself per day (the balance guard in _lib/balance.ts)
create table if not exists fz_earn (
  user_id uuid not null references fz_users (id) on delete cascade,
  day date not null,
  amount integer not null default 0,
  primary key (user_id, day)
);
alter table fz_payments add column if not exists checked_at timestamptz;
alter table fz_payments add column if not exists ip text not null default '';
create index if not exists fz_payments_ip_idx on fz_payments (ip, created_at);
alter table fz_payments add column if not exists seen_tx text;
create unique index if not exists fz_payments_seen_tx on fz_payments (seen_tx) where seen_tx is not null;
-- sign-ups per network address (flood guard)
create table if not exists fz_signups (ip text not null, at timestamptz not null default now());
create index if not exists fz_signups_idx on fz_signups (ip, at);
-- Fuzzy assistant messages per account / network address (rate limits only; chats are never stored)
create table if not exists fz_assist (key text not null, at timestamptz not null default now());
create index if not exists fz_assist_idx on fz_assist (key, at);
-- Once-per-wallet bookkeeping, kept even if the wallet is removed (only a hash of the address is stored).
create table if not exists fz_wallet_rewards (
  address_hash text primary key,
  fee_paid_at timestamptz,
  gift_at timestamptz
);
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
