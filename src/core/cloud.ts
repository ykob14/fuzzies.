/**
 * Cloud accounts: sign up / log in with email + password, and keep the account on every device.
 * The UI calls these instead of the local-only versions in core/account.ts. When no database is
 * connected (see core/api.ts) everything falls back to on-device accounts.
 */
import { accounts, freshAccount, type Account } from './account';
import { db } from './db';
import { api, token, onLoggedOut, cloudEnabled } from './api';
import { sync, accountFromRow, profileData, writeBase, type ProfileRow } from './sync';
import { merge3 } from './merge';
import { connect, signMessage, type WalletChoice } from './wallet';

export { cloudEnabled };

interface CloudUser { id: string; email: string; username: string }
export interface LinkedWallet { address: string; wallet: string; created_at: string; last_used_at: string | null }
interface SignUpInput { name: string; username: string; email: string; password: string }

const USERNAME = /^[a-z0-9_.]{3,20}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function check(input: SignUpInput): { username: string; email: string } {
  const username = input.username.trim().toLowerCase();
  const email = input.email.trim().toLowerCase();
  if (!USERNAME.test(username)) throw new Error('Username: 3–20 letters, numbers, dots or underscores.');
  if (!EMAIL.test(email)) throw new Error('Please enter your email — it’s how you log in on other devices.');
  if (input.password.length < 6) throw new Error('Password needs at least 6 characters.');
  return { username, email };
}

/** Add a guest's / on-device account's Fuzzies, unlocks and badges to a cloud account that already has data. */
function addInto(target: Account, extra: Account): Account {
  const zero = freshAccount(target.username, target.name, target.email, false);
  zero.fuzzies = zero.totalFuzzies = 0;
  // merging against an empty account adds the extra account's counters and lists on top
  const merged = merge3(profileData(zero), profileData(target), profileData(extra));
  return accountFromRow(target.id, target.email, { ...merged, username: target.username, name: target.name, avatar: target.avatar, settings: target.settings, createdAt: target.createdAt });
}

/** Make this device's copy of the logged-in cloud user and start syncing. `from` = a guest/local account moving in. */
async function adopt(user: CloudUser, name?: string, from?: Account | null): Promise<Account> {
  const { profile: row } = await api<{ profile: ProfileRow | null }>('data', 'profile.get');
  let acc: Account;
  let mergeFrom = from ?? null;
  const cached = accounts.get(user.id);
  if (cached?.cloud) {
    // this device already has a copy (maybe with changes that weren't sent yet): sync merges it with the cloud's
    acc = { ...cached, username: user.username, email: user.email };
  } else if (row) {
    acc = accountFromRow(user.id, user.email, { ...row.data, username: user.username });
    writeBase(user.id, { at: row.updated_at, data: profileData(acc) });
  } else {
    // brand-new cloud account: start from the guest/local account (if any) so nothing is lost
    const base = from ?? freshAccount(user.username, name || user.username, user.email, false);
    acc = { ...base, id: user.id, username: user.username, name: name || base.name, email: user.email, cloud: true, guest: false, hash: '', salt: '' };
    mergeFrom = null; // already the starting point
  }
  if (mergeFrom && mergeFrom.id !== user.id) acc = addInto(acc, mergeFrom);
  if (from && from.id !== user.id) { await db.reassignOwner(from.id, user.id); accounts.forget(from.id); }
  accounts.store(acc);
  accounts.setSession(acc);
  sync.start(user.id);
  return acc;
}

export const cloud = {
  enabled: cloudEnabled,

  /** Called once when the app starts: checks the saved login is still good and starts syncing. */
  init(onSignedOut: (why: string) => void): void {
    if (!cloudEnabled) return;
    const signedOut = (why: string) => { sync.stop(); accounts.setSession(null); onSignedOut(why); };
    onLoggedOut(() => { if (accounts.current?.cloud) signedOut('Please log in again.'); });
    const cur = accounts.current;
    if (!cur?.cloud) return;
    if (!token.get()) { signedOut('Please log in again.'); return; }
    sync.start(cur.id);
    // in the background: is the login still valid? (a 401 lands in onLoggedOut above)
    api('auth', 'me').catch(() => undefined);
  },

  async signUp(input: SignUpInput): Promise<Account> {
    const { username, email } = check(input);
    const res = await api<{ token: string; user: CloudUser }>('auth', 'signup', { email, username, password: input.password });
    token.set(res.token);
    return adopt(res.user, input.name.trim() || username, null);
  },

  async signIn(login: string, password: string): Promise<Account> {
    let email = login.trim().toLowerCase();
    if (!email.includes('@')) {
      // usernames work on a device that already knows the account; otherwise we need the email
      const known = accounts.list().find((a) => a.cloud && a.username === email);
      if (!known) throw new Error('Log in with the email you signed up with.');
      email = known.email;
    }
    const res = await api<{ token: string; user: CloudUser }>('auth', 'login', { email, password });
    token.set(res.token);
    return adopt(res.user);
  },

  /** "Forgot your password?": email a reset link (the server answers the same whether or not the account exists). */
  async requestReset(email: string): Promise<void> {
    const e = email.trim().toLowerCase();
    if (!EMAIL.test(e)) throw new Error('Please enter the email you signed up with.');
    await api('auth', 'forgot', { email: e });
  },

  /** Set a new password from an emailed link, and log in. */
  async resetPassword(resetToken: string, password: string): Promise<Account> {
    if (password.length < 6) throw new Error('Password needs at least 6 characters.');
    const res = await api<{ token: string; user: CloudUser }>('auth', 'reset', { token: resetToken, password });
    token.set(res.token);
    return adopt(res.user);
  },

  /** Move the guest or on-device account you're using into the cloud, keeping designs and Fuzzies. */
  async claim(input: SignUpInput): Promise<Account> {
    const a = accounts.current;
    if (!a || a.cloud) throw new Error('This account is already saved to your Fuzzies account.');
    const { username, email } = check(input);
    const name = input.name.trim() || a.name || username;
    const res = await api<{ token: string; user: CloudUser }>('auth', 'signup', { email, username, password: input.password });
    token.set(res.token);
    return adopt(res.user, name, { ...a, username, name });
  },

  /** Log out. A cloud account's copy on this device is removed once everything is safely uploaded. */
  async signOut(): Promise<void> {
    const a = accounts.current;
    if (a?.cloud) {
      const allSent = await sync.drain();
      sync.stop();
      token.clear();
      if (allSent) { await db.deleteOwner(a.id); accounts.forget(a.id); sync.clear(a.id); }
    }
    accounts.setSession(null);
  },

  async changePassword(oldPw: string, newPw: string): Promise<void> {
    if (!accounts.current?.cloud) return accounts.changePassword(oldPw, newPw);
    if (newPw.length < 6) throw new Error('New password needs at least 6 characters.');
    const res = await api<{ token: string }>('auth', 'password', { old: oldPw, new: newPw });
    token.set(res.token); // other devices are logged out; this one stays in
  },

  // ---------- crypto wallets (the wallet only signs a free message written by the server) ----------
  /** Sign in with a wallet that's already linked to an account. */
  async signInWithWallet(w: WalletChoice): Promise<Account> {
    const { address, chainId } = await connect(w);
    const { message, nonce } = await api<{ message: string; nonce: string }>('auth', 'wallet.challenge', { purpose: 'login', address, chainId, wallet: w.name });
    const signature = await signMessage(w, address, message);
    const res = await api<{ token: string; user: CloudUser }>('auth', 'wallet.verify', { nonce, signature });
    token.set(res.token);
    return adopt(res.user);
  },

  /** Link a wallet to the logged-in account (proves you own it). */
  async linkWallet(w: WalletChoice): Promise<LinkedWallet[]> {
    if (!accounts.current?.cloud) throw new Error('Save your account first — wallets link to a Fuzzies account.');
    const { address, chainId } = await connect(w);
    const { message, nonce } = await api<{ message: string; nonce: string }>('auth', 'wallet.challenge', { purpose: 'link', address, chainId, wallet: w.name });
    const signature = await signMessage(w, address, message);
    return (await api<{ wallets: LinkedWallet[] }>('auth', 'wallet.verify', { nonce, signature })).wallets;
  },

  async wallets(): Promise<LinkedWallet[]> {
    return (await api<{ wallets: LinkedWallet[] }>('auth', 'wallet.list')).wallets;
  },

  async unlinkWallet(address: string): Promise<LinkedWallet[]> {
    return (await api<{ wallets: LinkedWallet[] }>('auth', 'wallet.unlink', { address })).wallets;
  },

  /** Delete the account everywhere (cloud + this device). */
  async deleteAccount(): Promise<void> {
    const a = accounts.current;
    if (!a) return;
    if (a.cloud) {
      await api('auth', 'delete');
      sync.stop();
      sync.clear(a.id);
      token.clear();
    }
    await db.deleteOwner(a.id);
    accounts.remove();
  },
};
