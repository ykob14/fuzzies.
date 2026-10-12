/**
 * POST /api/auth  { action, ... }
 *   signup   { email, username, password, name }  → { token, user }
 *   login    { email, password }                   → { token, user }
 *   me       (logged in)                           → { user }
 *   password { old, new } (logged in)              → { token }  (other devices are logged out)
 *   delete   (logged in)                           → { ok }     (removes the account and all its data)
 *   username { username }                          → { available }
 *   forgot   { email }                             → { ok }     (emails a reset link if the account exists)
 *   reset    { token, password }                   → { token, user }  (sets the new password; logs in)
 * Crypto wallets (see _lib/wallet.ts — the wallet only signs a message; nothing touches funds):
 *   wallet.challenge { address, chainId, purpose: 'link' | 'login', wallet, password | proof (link only) } → { message, nonce }
 *                    ('link' needs you to be logged in + re-authentication; the server writes and keeps the exact message)
 *   wallet.verify    { nonce, signature } → link: { wallets, activate }
 *                    login: { proof, address, wallet, linked: null | { username, same }, token?, user? }
 *                      token + user only when the wallet is linked, active and you're not logged in to a different account
 *   wallet.login     { proof } → { token, user }  (sign in to the account a proven wallet is linked to — a deliberate switch)
 *   wallet.signup    { proof, username, name?, email?, password? } → { token, user }  (a new account for an unlinked wallet)
 *   wallet.attach    { proof, password } (logged in) → { wallets, activate }  (link a proven wallet to this account)
 *   wallet.list      (logged in) → { wallets, hasPassword, email }
 *   wallet.unlink    { address, password | proof } (logged in) → { wallets }  (never the only way in)
 *   account.credentials { email, password, old | proof } (logged in) → { token, user }  (add or change email + password)
 * A "proof" is a short-lived server-signed note that a wallet just signed for this browser (_lib/auth.ts makeProof);
 * re-authentication for sensitive changes = the account password, or a proof from a wallet already linked to it.
 */
import { createHash, randomBytes } from 'node:crypto';
import { db, q } from './_lib/db.js';
import { requireMail, sendMail, resetEmail, mailReady, walletLinkedEmail } from './_lib/mail.js';
import { handle, hashPassword, checkPassword, makeToken, makeProof, readProof, requireUser, HttpError, errorRef, json, BUILD, type AuthedUser } from './_lib/auth.js';
import { paymentsEnabled, walletFeeCents, addressHash } from './_lib/pay.js';
import { normAddress, recoverSigner, siteOf, siweMessage, verifySmartWallet, MAX_SIGNATURE } from './_lib/wallet.js';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME = /^[a-z0-9_.]{3,20}$/;
const MAX_FAILS = 10; // wrong passwords per email per 15 minutes
const MAX_RESETS = 3; // reset emails per account per hour
const MAX_WALLETS = 5; // wallets per account
const WALLET_MINUTES = 10; // how long a wallet sign-in message stays valid
const MAX_CHALLENGES = 10; // wallet sign-in messages per wallet (and 40 per network address) per 10 minutes

/** Only a hash of each reset link is stored, so a database leak can't be used to reset passwords. */
const hashToken = (raw: string) => createHash('sha256').update(raw).digest('hex');

/** Where the app lives, for links in emails: APP_URL if set, else the site's production address, else this request's. */
function appUrl(req: Request): string {
  const set = process.env.APP_URL?.replace(/\/+$/, '');
  if (set) return set;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return new URL(req.url).origin;
}

const str = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const publicUser = (u: { id: string; email: string | null; username: string; has_password?: boolean; pass?: string | null }) =>
  ({ id: u.id, email: u.email ?? '', username: u.username, hasPassword: u.has_password ?? (u.pass !== undefined ? u.pass !== null : true) });
/** Wrong-password counting is per email; accounts without an email count under their id. */
const failKey = (u: { id: string; email: string | null }) => u.email || `u:${u.id}`;
const USER_COLS = 'id, email, username, token_v, (pass is not null) as has_password';
const walletsOf = async (userId: string) =>
  (await q<{ address: string; wallet: string; created_at: string; last_used_at: string | null; active: boolean }>('select address, wallet, created_at, last_used_at, active from fz_wallets where user_id = $1 order by created_at', [userId])).rows;
/** The visitor's network address as Vercel reports it (used only to slow down floods of sign-in requests). */
const clientIp = (req: Request) => (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim().slice(0, 64);

/** Too many wrong passwords lately? */
async function assertNotLocked(key: string): Promise<void> {
  const { rows } = await q("select count(*)::int as n from fz_login_fails where email = $1 and at > now() - interval '15 minutes'", [key]);
  if (rows[0].n >= MAX_FAILS) throw new HttpError(429, 'Too many tries — please wait 15 minutes and try again.');
}
async function countFail(key: string): Promise<void> {
  await q('insert into fz_login_fails (email) values ($1)', [key]);
  await q("delete from fz_login_fails where at < now() - interval '1 day'");
}
/**
 * Re-authentication for sensitive changes (linking / removing a wallet, changing email or password): the account
 * password, or a proof from a wallet that is already linked to this account. A logged-in device alone is never enough.
 */
async function reauth(u: AuthedUser, b: Record<string, unknown>, what: string): Promise<void> {
  if (typeof b.proof === 'string' && b.proof) {
    const { address } = readProof(b.proof);
    const { rows } = await q('select 1 from fz_wallets where address = $1 and user_id = $2', [address, u.id]);
    if (!rows[0]) throw new HttpError(400, 'That wallet isn’t linked to this account — confirm with one of your linked wallets instead.');
    return;
  }
  if (!u.has_password) throw new HttpError(400, `To ${what}, first confirm it’s you with one of your linked wallets.`);
  const key = failKey(u);
  await assertNotLocked(key);
  const { rows: pw } = await q<{ pass: string | null }>('select pass from fz_users where id = $1', [u.id]);
  if (!(await checkPassword(typeof b.password === 'string' ? b.password : '', pw[0].pass))) {
    await countFail(key);
    throw new HttpError(400, typeof b.password === 'string' && b.password ? 'That password isn’t right — please try again.' : `Please enter your password to ${what}.`);
  }
}
/** The logged-in user if the request carries a valid token, else null (never a 401). */
async function optionalUser(req: Request): Promise<AuthedUser | null> {
  if (!req.headers.get('authorization')) return null;
  try { return await requireUser(req); } catch { return null; }
}
/**
 * Link a proven wallet to an account: one account per wallet (409 otherwise), the one-time activation when payments
 * are on, and an email to the owner so a wallet they didn't add never goes unnoticed.
 */
async function linkWalletTo(req: Request, u: AuthedUser, address: string, wallet: string, opts: { activeAnyway?: boolean } = {}) {
  const { rows: n } = await q('select count(*)::int as n from fz_wallets where user_id = $1 and address <> $2', [u.id, address]);
  if (n[0].n >= MAX_WALLETS) throw new HttpError(400, `You can link up to ${MAX_WALLETS} wallets — remove one first.`);
  const { rows: paid } = await q('select 1 from fz_wallet_rewards where address_hash = $1 and fee_paid_at is not null', [addressHash(address)]);
  const needsFee = !opts.activeAnyway && paymentsEnabled() && walletFeeCents() > 0 && !paid[0];
  const { rows: ins } = await q<{ user_id: string; added: boolean; active: boolean }>(
    'insert into fz_wallets (address, user_id, wallet, active) values ($1, $2, $3, $4) on conflict (address) do update set wallet = excluded.wallet where fz_wallets.user_id = excluded.user_id returning user_id, (xmax = 0) as added, active',
    [address, u.id, wallet, !needsFee]);
  if (!ins[0]) throw new HttpError(409, 'This wallet is already linked to another Fuzzies account. Log in to that account to use it, or remove it there first.');
  if (ins[0].added && u.email && mailReady()) {
    await sendMail(u.email, walletLinkedEmail(u.username, address, wallet, `${appUrl(req)}/#/profile`)).catch((e) => console.error('wallet email failed', e));
  }
  return { wallets: await walletsOf(u.id), activate: ins[0].active ? null : { address, feeCents: walletFeeCents() }, gift: null };
}
/** New-account flood control (shared by email and wallet sign-ups). */
async function signupAllowed(req: Request): Promise<void> {
  const ip = clientIp(req);
  if (!ip) return;
  const { rows: n } = await q("select count(*)::int as n from fz_signups where ip = $1 and at > now() - interval '1 hour'", [ip]);
  if (n[0].n >= 8) throw new HttpError(429, 'Too many new accounts from this network — please try again in an hour.');
  await q('insert into fz_signups (ip) values ($1)', [ip]);
  await q("delete from fz_signups where at < now() - interval '1 day'");
}
const dup = (e: unknown): never => {
  if ((e as { code?: string }).code === '23505') {
    const which = String((e as { constraint?: string }).constraint ?? '');
    throw new HttpError(409, which.includes('email') ? 'There’s already an account with that email — log in instead.' : which.includes('username') ? 'That username is taken — try another.' : 'That’s already taken.');
  }
  throw e;
};

/** GET /api/auth?check — a health check you can open in a browser: is the database reachable and set up? */
export async function GET(req: Request): Promise<Response> {
  if (!new URL(req.url).searchParams.has('check')) return handle(req, async () => ({}));
  const started = Date.now();
  try {
    await db();
    await q('select 1 from fz_users limit 1');
    return json({ ok: true, database: 'connected', tables: 'ready', build: BUILD, ms: Date.now() - started });
  } catch (e) {
    console.error('health check failed', e);
    const status = (e as { status?: number }).status;
    return json({ ok: false, database: status === 503 ? 'not connected (no DATABASE_URL)' : 'error', ref: errorRef(e), build: BUILD, ms: Date.now() - started }, 500);
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
        await signupAllowed(req);
        const pass = await hashPassword(password);
        try {
          const { rows } = await q(`insert into fz_users (email, username, pass) values ($1, $2, $3) returning ${USER_COLS}`, [email, username, pass]);
          return { token: makeToken(rows[0].id, rows[0].token_v), user: publicUser(rows[0]) };
        } catch (e) { return dup(e); }
      }
      case 'login': {
        const email = str(b.email).toLowerCase();
        const password = typeof b.password === 'string' ? b.password : '';
        const { rows: fails } = await q("select count(*)::int as n from fz_login_fails where email = $1 and at > now() - interval '15 minutes'", [email]);
        if (fails[0].n >= MAX_FAILS) throw new HttpError(429, 'Too many tries — please wait 15 minutes and try again.');
        const { rows } = await q(`select ${USER_COLS}, pass from fz_users where email = $1 and email is not null`, [email]);
        if (!rows[0] || !(await checkPassword(password, rows[0].pass))) {
          await q('insert into fz_login_fails (email) values ($1)', [email]);
          await q("delete from fz_login_fails where at < now() - interval '1 day'");
          throw new HttpError(401, 'Wrong email or password.');
        }
        return { token: makeToken(rows[0].id, rows[0].token_v), user: publicUser(rows[0]) };
      }
      case 'forgot': {
        requireMail(); // say so straight away if email isn't set up
        const email = str(b.email).toLowerCase();
        if (!EMAIL.test(email)) throw new HttpError(400, 'Please enter the email you signed up with.');
        const { rows } = await q<{ id: string; username: string }>('select id, username from fz_users where email = $1', [email]);
        // the answer is the same whether or not the account exists (so nobody can probe for emails)
        if (rows[0]) {
          const { rows: recent } = await q("select count(*)::int as n from fz_resets where user_id = $1 and created_at > now() - interval '1 hour'", [rows[0].id]);
          if (recent[0].n >= MAX_RESETS) throw new HttpError(429, 'We’ve already sent you a few emails — check your inbox and spam folder, or try again in an hour.');
          const raw = randomBytes(32).toString('base64url');
          await q("insert into fz_resets (token_hash, user_id, expires_at) values ($1, $2, now() + interval '1 hour')", [hashToken(raw), rows[0].id]);
          await q("delete from fz_resets where expires_at < now() - interval '1 day'");
          try {
            await sendMail(email, resetEmail(rows[0].username, `${appUrl(req)}/#/reset/${raw}`));
          } catch (e) {
            // an email that never went out doesn't count towards the hourly limit (and its link is useless)
            await q('delete from fz_resets where token_hash = $1', [hashToken(raw)]).catch(() => {});
            throw e;
          }
        }
        return { ok: true };
      }
      case 'reset': {
        const raw = str(b.token, 100);
        const password = typeof b.password === 'string' ? b.password : '';
        if (password.length < 6 || password.length > 200) throw new HttpError(400, 'Password needs at least 6 characters.');
        // a link works once, for an hour
        const { rows } = await q<{ user_id: string }>('update fz_resets set used_at = now() where token_hash = $1 and used_at is null and expires_at > now() returning user_id', [hashToken(raw)]);
        if (!rows[0]) throw new HttpError(400, 'This reset link has expired or was already used — ask for a new one from the log-in screen.');
        // new password, and every other device is logged out
        const { rows: u } = await q(`update fz_users set pass = $2, token_v = token_v + 1 where id = $1 returning ${USER_COLS}`, [rows[0].user_id, await hashPassword(password)]);
        await q('update fz_resets set used_at = now() where user_id = $1 and used_at is null', [rows[0].user_id]); // older links stop working too
        await q('delete from fz_wallets where user_id = $1', [rows[0].user_id]); // wallets must be linked again (with the new password)
        await q('delete from fz_login_fails where email = $1', [u[0].email]);
        return { token: makeToken(u[0].id, u[0].token_v), user: publicUser(u[0]) };
      }
      case 'wallet.challenge': {
        const purpose = b.purpose === 'link' ? 'link' : b.purpose === 'login' ? 'login' : '';
        if (!purpose) throw new HttpError(400, 'Unknown wallet request.');
        const address = normAddress(b.address);
        const chainId = Number.isSafeInteger(b.chainId) && (b.chainId as number) > 0 ? (b.chainId as number) : 1;
        const wallet = str(b.wallet, 40).replace(/[^\w .()-]/g, '');
        const user = purpose === 'link' ? await requireUser(req) : null;
        const { domain, origin } = siteOf(req);
        // a wallet becomes a way into the account, so linking one needs re-authentication (not just a logged-in device)
        if (user) await reauth(user, b, 'link a wallet');
        const ip = clientIp(req);
        await q('delete from fz_wallet_nonces where expires_at < now()');
        const { rows: recent } = await q<{ a: number; i: number }>(
          "select count(*) filter (where address = $1 and (ip = $2 or $3))::int as a, count(*) filter (where ip = $2 and $2 <> '')::int as i from fz_wallet_nonces where created_at > now() - interval '10 minutes'", [address, ip, purpose === 'link']);
        if (recent[0].a >= MAX_CHALLENGES || recent[0].i >= MAX_CHALLENGES * 4) throw new HttpError(429, 'Too many wallet requests — please wait a few minutes and try again.');
        if (user) {
          const { rows: n } = await q('select count(*)::int as n from fz_wallets where user_id = $1', [user.id]);
          if (n[0].n >= MAX_WALLETS) throw new HttpError(400, `You can link up to ${MAX_WALLETS} wallets — remove one first.`);
        }
        const nonce = randomBytes(16).toString('hex');
        const issuedAt = new Date();
        const expiresAt = new Date(issuedAt.getTime() + WALLET_MINUTES * 60_000);
        const statement = user
          ? `Link this wallet to the Fuzzies account @${user.username}. Signing is free: it doesn't send a transaction or give access to your funds.`
          : `Sign in to Fuzzies with this wallet. Signing is free: it doesn't send a transaction or give access to your funds.`;
        const message = siweMessage({ domain, uri: origin, address, statement, chainId, nonce, issuedAt, expiresAt });
        await q('insert into fz_wallet_nonces (nonce, address, purpose, user_id, message, wallet, ip, expires_at, chain_id) values ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
          [nonce, address, purpose, user?.id ?? null, message, wallet, ip, expiresAt, chainId]);
        return { message, nonce };
      }
      case 'wallet.verify': {
        const nonce = str(b.nonce, 64);
        // a message works once: it is removed as it is checked, whatever the outcome
        const { rows } = await q<{ address: string; purpose: string; user_id: string | null; message: string; wallet: string; chain_id: number }>(
          'delete from fz_wallet_nonces where nonce = $1 and expires_at > now() returning address, purpose, user_id, message, wallet, chain_id', [nonce]);
        const c = rows[0];
        if (!c) throw new HttpError(400, 'This sign-in request has expired — please try again.');
        const signature = typeof b.signature === 'string' ? b.signature : '';
        if (!/^0x[0-9a-fA-F]+$/.test(signature) || signature.length > MAX_SIGNATURE) throw new HttpError(400, 'That signature doesn’t look right.');
        // a regular wallet's signature is checked right here; anything else is a smart wallet, checked with the network
        let valid = false;
        if (signature.length === 132) { try { valid = recoverSigner(c.message, signature) === c.address; } catch { valid = false; } }
        if (!valid) {
          try { valid = await verifySmartWallet(c.address, c.message, signature, c.chain_id); }
          catch (e) {
            // a plain wrong signature on a network we can't check smart wallets on
            if (signature.length === 132 && (e as HttpError).status === 400) throw new HttpError(400, 'The signature didn’t match this wallet — please try again. Using a smart wallet? Switch it to Ethereum, Base, Optimism, Arbitrum or Polygon first.');
            throw e;
          }
        }
        if (!valid) throw new HttpError(400, 'The signature didn’t match this wallet — please try again.');
        if (c.purpose === 'link') {
          const u = await requireUser(req);
          if (u.id !== c.user_id) throw new HttpError(403, 'This request was made for a different account — please try again.');
          // the 100-Fuzzies gift comes with a paid activation only (free gifts could be farmed with throwaway wallets)
          return linkWalletTo(req, u, c.address, c.wallet);
        }
        // signed in with a wallet: the browser gets a short-lived proof it holds this wallet, and — only when the wallet is
        // linked, active, and this device isn't logged in to a *different* account — a login. Never a silent account switch.
        const proof = makeProof(c.address, c.wallet);
        const me = await optionalUser(req);
        const { rows: owner } = await q<{ id: string; email: string | null; username: string; token_v: number; has_password: boolean; active: boolean }>(
          `select u.id, u.email, u.username, u.token_v, (u.pass is not null) as has_password, w.active from fz_wallets w join fz_users u on u.id = w.user_id where w.address = $1`, [c.address]);
        if (!owner[0]) return { proof, address: c.address, wallet: c.wallet, linked: null };
        const same = !!me && me.id === owner[0].id;
        const linked = { username: owner[0].username, same, active: owner[0].active };
        // linked to someone else while logged in, or not activated yet (one-time fee unpaid): the proof still serves for
        // re-authentication and the app explains the next step — but no login
        if ((me && !same) || !owner[0].active) return { proof, address: c.address, wallet: c.wallet, linked };
        await q('update fz_wallets set last_used_at = now() where address = $1', [c.address]);
        return { proof, address: c.address, wallet: c.wallet, linked, token: makeToken(owner[0].id, owner[0].token_v), user: publicUser(owner[0]) };
      }
      case 'wallet.login': {
        // a deliberate switch to the account a proven wallet belongs to (the app warns and saves first)
        const { address } = readProof(b.proof);
        const { rows: owner } = await q<{ id: string; email: string | null; username: string; token_v: number; has_password: boolean; active: boolean }>(
          `select u.id, u.email, u.username, u.token_v, (u.pass is not null) as has_password, w.active from fz_wallets w join fz_users u on u.id = w.user_id where w.address = $1`, [address]);
        if (!owner[0]) throw new HttpError(404, 'This wallet isn’t linked to a Fuzzies account.');
        if (!owner[0].active) throw new HttpError(402, 'This wallet isn’t activated yet.');
        await q('update fz_wallets set last_used_at = now() where address = $1', [address]);
        return { token: makeToken(owner[0].id, owner[0].token_v), user: publicUser(owner[0]) };
      }
      case 'wallet.signup': {
        // a brand-new account for a wallet nobody has linked yet: username required; email + password optional (they can
        // be added later in Profile → Account, and are the way back in if the wallet is ever lost)
        const { address, wallet } = readProof(b.proof);
        const username = str(b.username, 40).toLowerCase();
        const email = str(b.email).toLowerCase();
        const password = typeof b.password === 'string' ? b.password : '';
        if (!USERNAME.test(username)) throw new HttpError(400, 'Username: 3–20 letters, numbers, dots or underscores.');
        if (email && !EMAIL.test(email)) throw new HttpError(400, 'That email doesn’t look right.');
        if ((email || password) && (password.length < 6 || password.length > 200)) throw new HttpError(400, 'Password needs at least 6 characters (add an email with it).');
        if (password && !email) throw new HttpError(400, 'Add an email with your password — it’s how you log in without the wallet.');
        const { rows: taken } = await q('select 1 from fz_wallets where address = $1', [address]);
        if (taken[0]) throw new HttpError(409, 'This wallet is already linked to a Fuzzies account — log in with it instead.');
        await signupAllowed(req);
        let user: AuthedUser;
        try {
          const { rows } = await q<AuthedUser>(`insert into fz_users (email, username, pass) values ($1, $2, $3) returning ${USER_COLS}`, [email || null, username, password ? await hashPassword(password) : null]);
          user = rows[0];
        } catch (e) { return dup(e); }
        // the wallet that made the account can always log in to it (the activation / gift stays optional)
        try { await linkWalletTo(req, user, address, wallet, { activeAnyway: true }); }
        catch (e) { await q('delete from fz_users where id = $1', [user.id]).catch(() => {}); throw e; }
        return { token: makeToken(user.id, user.token_v), user: publicUser(user) };
      }
      case 'wallet.attach': {
        // link a wallet that just proved itself (at the log-in screen) to the account you then logged in to
        const u = await requireUser(req);
        const { address, wallet } = readProof(b.proof);
        await reauth(u, { password: b.password, proof: b.reauth }, 'link a wallet');
        return linkWalletTo(req, u, address, wallet);
      }
      case 'account.credentials': {
        // add (wallet-only accounts) or change the email + password; re-authenticate first
        const u = await requireUser(req);
        const email = str(b.email).toLowerCase();
        const password = typeof b.password === 'string' ? b.password : '';
        if (!EMAIL.test(email)) throw new HttpError(400, 'Please enter a valid email — it’s how you log in without your wallet.');
        if (password.length < 6 || password.length > 200) throw new HttpError(400, 'Password needs at least 6 characters.');
        await reauth(u, { password: b.old, proof: b.proof }, 'change your login details');
        try {
          const { rows } = await q<AuthedUser>(`update fz_users set email = $2, pass = $3 where id = $1 returning ${USER_COLS}`, [u.id, email, await hashPassword(password)]);
          return { token: makeToken(rows[0].id, rows[0].token_v), user: publicUser(rows[0]) };
        } catch (e) { return dup(e); }
      }
      case 'wallet.list': {
        const u = await requireUser(req);
        return { wallets: await walletsOf(u.id), hasPassword: u.has_password, email: u.email ?? '' };
      }
      case 'wallet.unlink': {
        // removing a way in needs re-authentication, and never leaves the account with no way in at all
        const u = await requireUser(req);
        const address = normAddress(b.address);
        const wallets = await walletsOf(u.id);
        if (!wallets.some((w) => w.address === address)) return { wallets };
        if (!u.has_password && wallets.length <= 1) throw new HttpError(400, 'This wallet is the only way into your account. Add an email and password first (Profile → Account), then remove it.');
        await reauth(u, b, 'remove a wallet');
        await q('delete from fz_wallets where user_id = $1 and address = $2', [u.id, address]);
        return { wallets: await walletsOf(u.id) };
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
        if (!u.has_password) throw new HttpError(400, 'This account has no password yet — add an email and password from Profile → Account.');
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
