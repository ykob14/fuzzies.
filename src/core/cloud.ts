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
import { connect, signMessage, walletSession, type WalletChoice } from './wallet';

export { cloudEnabled };

interface CloudUser { id: string; email: string; username: string; hasPassword?: boolean }
export interface LinkedWallet { address: string; wallet: string; created_at: string; last_used_at: string | null; active: boolean }
export interface LinkResult { wallets: LinkedWallet[]; activate: { address: string; feeCents: number } | null; gift: { id: string; amount: number; reason?: string } | null }
/** Everything the server knows about an account's ways in (Profile → Account). */
export interface LoginInfo { wallets: LinkedWallet[]; hasPassword: boolean; email: string }
/**
 * What signing in with a wallet found out. `proof` = a 10-minute server note that this browser holds the wallet (used to
 * create an account, link it after logging in another way, or confirm a sensitive change). `token`/`user` are only there
 * when the wallet is linked, active and this device isn't logged in to a different account.
 */
export interface WalletResult { proof: string; address: string; wallet: string; linked: { username: string; same: boolean; active: boolean } | null; token?: string; user?: CloudUser }
/** Re-authentication for sensitive changes: the password, or a proof from a wallet already linked to the account. */
export type Reauth = { password: string } | { proof: string };
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
  // switching from another cloud account on this device: its last changes go up first, so nothing is lost or mixed up
  const prev = accounts.current;
  if (prev?.cloud && prev.id !== user.id) { await sync.drain(); sync.stop(); }
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
    walletSession.clear();
    accounts.setSession(null);
  },

  async changePassword(oldPw: string, newPw: string): Promise<void> {
    if (!accounts.current?.cloud) return accounts.changePassword(oldPw, newPw);
    if (newPw.length < 6) throw new Error('New password needs at least 6 characters.');
    const res = await api<{ token: string }>('auth', 'password', { old: oldPw, new: newPw });
    token.set(res.token); // other devices are logged out; this one stays in
  },

  // ---------- crypto wallets (the wallet only signs a free message written by the server) ----------
  /** Connect a wallet and prove it's yours (one free signature). Says whether — and to whom — it's linked. */
  async identifyWallet(w: WalletChoice): Promise<WalletResult> {
    const { address, chainId } = await connect(w);
    const { message, nonce } = await api<{ message: string; nonce: string }>('auth', 'wallet.challenge', { purpose: 'login', address, chainId, wallet: w.name });
    const signature = await signMessage(w, address, message);
    return api<WalletResult>('auth', 'wallet.verify', { nonce, signature });
  },

  /**
   * Sign in with a wallet. Linked to an account → logged in (`account`). Not linked, or linked to another account while
   * this device is logged in → `result` for the app to offer the next step (create / link / switch), never a silent switch.
   */
  async signInWithWallet(w: WalletChoice): Promise<{ account: Account; result: WalletResult } | { account: null; result: WalletResult }> {
    const result = await this.identifyWallet(w);
    if (!result.token || !result.user) {
      // linked to you (or to nobody this device is logged in as) but its one-time activation isn't paid yet
      if (result.linked && !result.linked.active && (result.linked.same || !accounts.current?.cloud)) throw new Error('This wallet isn’t activated yet. Log in another way, then tap “Activate” next to it in Profile → Account & login (one time).');
      return { account: null, result };
    }
    token.set(result.token);
    const account = await adopt(result.user);
    walletSession.set({ address: result.address, wallet: result.wallet });
    return { account, result };
  },

  /** Switch to the account a proven wallet belongs to (the app has warned first; the current account's changes go up first). */
  async switchToWallet(r: WalletResult): Promise<Account> {
    const res = await api<{ token: string; user: CloudUser }>('auth', 'wallet.login', { proof: r.proof });
    token.set(res.token);
    const account = await adopt(res.user);
    walletSession.set({ address: r.address, wallet: r.wallet });
    return account;
  },

  /** A new account for a wallet nobody has linked yet. `keep` = bring this device's guest / on-device progress along. */
  async signUpWithWallet(r: WalletResult, input: { username: string; name?: string; email?: string; password?: string; keep?: boolean }): Promise<Account> {
    const username = input.username.trim().toLowerCase();
    if (!USERNAME.test(username)) throw new Error('Username: 3–20 letters, numbers, dots or underscores.');
    const email = (input.email ?? '').trim().toLowerCase();
    if (email && !EMAIL.test(email)) throw new Error('That email doesn’t look right.');
    if ((email || input.password) && (input.password ?? '').length < 6) throw new Error('Password needs at least 6 characters (and an email to go with it).');
    const from = input.keep ? accounts.current : null;
    const res = await api<{ token: string; user: CloudUser }>('auth', 'wallet.signup', { proof: r.proof, username, email, password: input.password ?? '' });
    token.set(res.token);
    const name = (input.name ?? '').trim() || from?.name || username;
    const account = await adopt(res.user, name, from && !from.cloud ? { ...from, username, name } : null);
    walletSession.set({ address: r.address, wallet: r.wallet });
    return account;
  },

  /** After logging in with email + password at the wallet screen: link the wallet that just proved itself. */
  async attachWallet(r: WalletResult, password: string, reauth?: string): Promise<LinkResult> {
    const x = await api<Partial<LinkResult> & { wallets: LinkedWallet[] }>('auth', 'wallet.attach', { proof: r.proof, password, ...(reauth ? { reauth } : {}) });
    walletSession.set({ address: r.address, wallet: r.wallet });
    return { wallets: x.wallets, activate: x.activate ?? null, gift: x.gift ?? null };
  },

  /** Link a wallet to the logged-in account (proves you own it). Re-authenticate with the password, or a linked wallet's proof. */
  async linkWallet(w: WalletChoice, auth: Reauth): Promise<LinkResult> {
    if (!accounts.current?.cloud) throw new Error('Save your account first — wallets link to a Fuzzies account.');
    if ('password' in auth && !auth.password) throw new Error('Please enter your Fuzzies password first.');
    const { address, chainId } = await connect(w);
    const { message, nonce } = await api<{ message: string; nonce: string }>('auth', 'wallet.challenge', { purpose: 'link', address, chainId, wallet: w.name, ...auth });
    const signature = await signMessage(w, address, message);
    const r = await api<Partial<LinkResult> & { wallets: LinkedWallet[] }>('auth', 'wallet.verify', { nonce, signature });
    walletSession.set({ address: address.toLowerCase(), wallet: w.name });
    return { wallets: r.wallets, activate: r.activate ?? null, gift: r.gift ?? null };
  },

  /** The account's ways in: linked wallets, whether it has a password, its email. */
  async loginInfo(): Promise<LoginInfo> {
    return api<LoginInfo>('auth', 'wallet.list');
  },
  async wallets(): Promise<LinkedWallet[]> {
    return (await this.loginInfo()).wallets;
  },

  /** Remove a wallet as a way in (re-authenticate first; never the only way in). */
  async unlinkWallet(address: string, auth: Reauth): Promise<LinkedWallet[]> {
    const r = await api<{ wallets: LinkedWallet[] }>('auth', 'wallet.unlink', { address, ...auth });
    if (walletSession.get()?.address === address.toLowerCase()) walletSession.clear();
    return r.wallets;
  },

  /** Add (wallet-only accounts) or change the email + password — the way back in if a wallet is ever lost. */
  async setCredentials(email: string, password: string, auth: { old: string } | { proof: string }): Promise<void> {
    const e = email.trim().toLowerCase();
    if (!EMAIL.test(e)) throw new Error('Please enter a valid email — it’s how you log in without your wallet.');
    if (password.length < 6) throw new Error('Password needs at least 6 characters.');
    const res = await api<{ token: string; user: CloudUser }>('auth', 'account.credentials', { email: e, password, ...auth });
    token.set(res.token);
    accounts.update((a) => { a.email = res.user.email; });
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
