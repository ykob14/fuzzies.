/**
 * Passwords and login tokens, using only Node's built-in crypto.
 * - Passwords: scrypt with a random salt per user.
 * - Tokens: a signed note "user X, version V, valid until T". Changing the password or deleting the
 *   account bumps the version, which logs out every other device.
 */
import { scrypt as scryptCb, randomBytes, timingSafeEqual, createHmac, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { db, databaseUrl } from './db.js';

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;
const TOKEN_DAYS = 90;

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function hashPassword(pw: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(pw, salt, 32);
  return `s1$${salt.toString('base64')}$${hash.toString('base64')}`;
}

export async function checkPassword(pw: string, stored: string): Promise<boolean> {
  const [kind, salt, hash] = stored.split('$');
  if (kind !== 's1' || !salt || !hash) return false;
  const want = Buffer.from(hash, 'base64');
  const got = await scrypt(pw, Buffer.from(salt, 'base64'), want.length);
  return timingSafeEqual(got, want);
}

/** Signing key: AUTH_SECRET if set, otherwise derived from the (secret) database URL so setup needs nothing extra. */
function secret(): Buffer {
  const s = process.env.AUTH_SECRET;
  if (s && s.length >= 16) return Buffer.from(s);
  const url = databaseUrl();
  if (!url) throw new HttpError(503, 'The database isn’t connected yet.');
  return createHash('sha256').update('fuzzies-auth:' + url).digest();
}

const b64u = (b: Buffer | string) => Buffer.from(b).toString('base64url');
const sign = (body: string) => createHmac('sha256', secret()).update(body).digest('base64url');

export function makeToken(userId: string, version: number): string {
  const body = b64u(JSON.stringify({ sub: userId, v: version, exp: Date.now() + TOKEN_DAYS * 864e5 }));
  return `${body}.${sign(body)}`;
}

export interface AuthedUser { id: string; email: string; username: string; token_v: number }

/** The signed-in user for this request, or a 401. */
export async function requireUser(req: Request): Promise<AuthedUser> {
  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  const [body, sig] = token.split('.');
  const expected = body ? sign(body) : '';
  if (!body || !sig || sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    throw new HttpError(401, 'Please log in again.');
  }
  let p: { sub: string; v: number; exp: number };
  try { p = JSON.parse(Buffer.from(body, 'base64url').toString()); } catch { throw new HttpError(401, 'Please log in again.'); }
  if (!p.exp || p.exp < Date.now()) throw new HttpError(401, 'Please log in again.');
  const { rows } = await (await db()).query<AuthedUser>('select id, email, username, token_v from fz_users where id = $1', [p.sub]);
  if (!rows[0] || rows[0].token_v !== p.v) throw new HttpError(401, 'Please log in again.');
  return rows[0];
}

/** JSON helpers shared by the endpoints. */
export const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

export async function handle(req: Request, fn: (body: Record<string, unknown>) => Promise<unknown>): Promise<Response> {
  try {
    if (req.method !== 'POST') return json({ ok: true, service: 'fuzzies' });
    let body: Record<string, unknown>;
    try { body = (await req.json()) as Record<string, unknown>; } catch { throw new HttpError(400, 'Bad request.'); }
    return json(await fn(body));
  } catch (e) {
    const status = (e as { status?: number }).status ?? 500;
    if (status >= 500) console.error(e);
    const safe = e instanceof HttpError || status < 500 || status === 503; // only our own messages reach the app
    return json({ error: safe ? (e as Error).message : 'Something went wrong on our side — please try again.' }, status);
  }
}
