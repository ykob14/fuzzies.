/**
 * POST /api/auth  { action, ... }
 *   signup   { email, username, password, name }  → { token, user }
 *   login    { email, password }                   → { token, user }
 *   me       (logged in)                           → { user }
 *   password { old, new } (logged in)              → { token }  (other devices are logged out)
 *   delete   (logged in)                           → { ok }     (removes the account and all its data)
 *   username { username }                          → { available }
 */
import { db, q } from './_lib/db.js';
import { handle, hashPassword, checkPassword, makeToken, requireUser, HttpError, errorRef, json } from './_lib/auth.js';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME = /^[a-z0-9_.]{3,20}$/;
const MAX_FAILS = 10; // wrong passwords per email per 15 minutes

const str = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const publicUser = (u: { id: string; email: string; username: string }) => ({ id: u.id, email: u.email, username: u.username });

/** GET /api/auth?check — a health check you can open in a browser: is the database reachable and set up? */
export async function GET(req: Request): Promise<Response> {
  if (!new URL(req.url).searchParams.has('check')) return handle(req, async () => ({}));
  const started = Date.now();
  try {
    await db();
    await q('select 1 from fz_users limit 1');
    return json({ ok: true, database: 'connected', tables: 'ready', ms: Date.now() - started });
  } catch (e) {
    console.error('health check failed', e);
    const status = (e as { status?: number }).status;
    return json({ ok: false, database: status === 503 ? 'not connected (no DATABASE_URL)' : 'error', ref: errorRef(e), ms: Date.now() - started }, 500);
  }
}

export function POST(req: Request): Promise<Response> {
  return handle(req, async (b) => {
    await db(); // connects and makes sure the tables exist
    switch (b.action) {
      case 'signup': {
        const email = str(b.email).toLowerCase();
        const username = str(b.username, 40).toLowerCase();
        const password = typeof b.password === 'string' ? b.password : '';
        if (!EMAIL.test(email)) throw new HttpError(400, 'Please enter your email — it’s how you log in on other devices.');
        if (!USERNAME.test(username)) throw new HttpError(400, 'Username: 3–20 letters, numbers, dots or underscores.');
        if (password.length < 6 || password.length > 200) throw new HttpError(400, 'Password needs at least 6 characters.');
        const pass = await hashPassword(password);
        try {
          const { rows } = await q('insert into fz_users (email, username, pass) values ($1, $2, $3) returning id, email, username, token_v', [email, username, pass]);
          return { token: makeToken(rows[0].id, rows[0].token_v), user: publicUser(rows[0]) };
        } catch (e) {
          if ((e as { code?: string }).code === '23505') {
            const which = String((e as { constraint?: string }).constraint ?? '');
            throw new HttpError(409, which.includes('email') ? 'There’s already an account with that email — log in instead.' : 'That username is taken — try another.');
          }
          throw e;
        }
      }
      case 'login': {
        const email = str(b.email).toLowerCase();
        const password = typeof b.password === 'string' ? b.password : '';
        const { rows: fails } = await q("select count(*)::int as n from fz_login_fails where email = $1 and at > now() - interval '15 minutes'", [email]);
        if (fails[0].n >= MAX_FAILS) throw new HttpError(429, 'Too many tries — please wait 15 minutes and try again.');
        const { rows } = await q('select id, email, username, pass, token_v from fz_users where email = $1', [email]);
        if (!rows[0] || !(await checkPassword(password, rows[0].pass))) {
          await q('insert into fz_login_fails (email) values ($1)', [email]);
          await q("delete from fz_login_fails where at < now() - interval '1 day'");
          throw new HttpError(401, 'Wrong email or password.');
        }
        return { token: makeToken(rows[0].id, rows[0].token_v), user: publicUser(rows[0]) };
      }
      case 'username': {
        const username = str(b.username, 40).toLowerCase();
        const { rows } = await q('select 1 from fz_users where username = $1', [username]);
        return { available: USERNAME.test(username) && !rows.length };
      }
      case 'me': {
        const u = await requireUser(req);
        return { user: publicUser(u) };
      }
      case 'password': {
        const u = await requireUser(req);
        const next = typeof b.new === 'string' ? b.new : '';
        if (next.length < 6 || next.length > 200) throw new HttpError(400, 'New password needs at least 6 characters.');
        const { rows } = await q('select pass from fz_users where id = $1', [u.id]);
        if (!(await checkPassword(typeof b.old === 'string' ? b.old : '', rows[0].pass))) throw new HttpError(400, 'Current password is wrong.');
        const { rows: r2 } = await q('update fz_users set pass = $2, token_v = token_v + 1 where id = $1 returning token_v', [u.id, await hashPassword(next)]);
        return { token: makeToken(u.id, r2[0].token_v) };
      }
      case 'delete': {
        const u = await requireUser(req);
        await q('delete from fz_users where id = $1', [u.id]); // profile, designs and uploads go with it
        return { ok: true };
      }
      default:
        throw new HttpError(400, 'Unknown action.');
    }
  });
}
