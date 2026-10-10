/**
 * Cloud accounts: sign up / log in with email + password, and keep the account on every device.
 * The UI calls these instead of the local-only versions in core/account.ts. When the cloud isn't
 * set up (no Supabase keys at build time) everything falls back to on-device accounts.
 */
import type { User } from '@supabase/supabase-js';
import { accounts, freshAccount, type Account } from './account';
import { db } from './db';
import { supa, friendly, cloudEnabled } from './supabase';
import { sync, accountFromRow, profileData, writeBase, type ProfileRow } from './sync';
import { merge3 } from './merge';

export { cloudEnabled };

/** Thrown when the account was made but the email still has to be confirmed. Not really an error. */
export class CheckEmail extends Error {}

const CLAIM_KEY = 'fz.claim'; // a guest/local account waiting to move into the cloud once its email is confirmed
const USERNAME = /^[a-z0-9_.]{3,20}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const appUrl = () => location.origin + location.pathname;
// came back from an email link (confirm address / reset password)
const fromLink = new URLSearchParams(location.search).has('code');

interface SignUpInput { name: string; username: string; email: string; password: string }

function check(input: SignUpInput): { username: string; email: string } {
  const username = input.username.trim().toLowerCase();
  const email = input.email.trim();
  if (!USERNAME.test(username)) throw new Error('Username: 3–20 letters, numbers, dots or underscores.');
  if (!EMAIL.test(email)) throw new Error('Please enter your email — it’s how you log in on other devices.');
  if (input.password.length < 6) throw new Error('Password needs at least 6 characters.');
  return { username, email };
}

/** Add a guest's / local account's Fuzzies, unlocks and badges to a cloud account that already exists. */
function addInto(target: Account, extra: Account): Account {
  const zero = freshAccount(target.username, target.name, target.email, false);
  zero.fuzzies = zero.totalFuzzies = 0;
  // merging against an empty account adds the extra account's counters and lists on top
  const merged = merge3(profileData(zero), profileData(target), profileData(extra));
  return accountFromRow(target.id, target.email, { ...merged, username: target.username, name: target.name, avatar: target.avatar, settings: target.settings, createdAt: target.createdAt });
}

/** Make this device's copy of the signed-in cloud user and start syncing. */
async function adopt(user: User, meta?: { username: string; name: string }, from?: Account | null): Promise<Account> {
  const sb = await supa();
  const email = user.email ?? '';
  const claimId = localStorage.getItem(CLAIM_KEY);
  from ??= claimId ? accounts.get(claimId) : null;

  const { data: row, error } = await sb.from('profiles').select('username,data,updated_at').eq('id', user.id).maybeSingle();
  if (error) throw friendly(error);

  let acc: Account;
  const cached = accounts.get(user.id);
  if (cached?.cloud) {
    // this device already has a copy (maybe with changes that weren't sent yet): sync merges it with the cloud's
    acc = cached;
    if (from && from.id !== user.id) acc = addInto(acc, from);
  } else if (row) {
    const r = row as ProfileRow;
    acc = accountFromRow(user.id, email, { ...r.data, username: r.username });
    writeBase(user.id, { at: r.updated_at, data: profileData(acc) });
    if (from && from.id !== user.id) acc = addInto(acc, from);
  } else {
    // brand-new cloud account: start from the guest/local account (if any) so nothing is lost
    const m = (meta ?? user.user_metadata ?? {}) as { username?: string; name?: string };
    const username = String(m.username || from?.username || email.split('@')[0].toLowerCase().replace(/[^a-z0-9_.]/g, '').slice(0, 20) || 'creator');
    const base = from ?? freshAccount(username, m.name || username, email, false);
    acc = { ...base, id: user.id, username, name: m.name || base.name, email, cloud: true, guest: false, hash: '', salt: '' };
    // the username must be free in the cloud; if someone took it meanwhile, add a few digits
    const { data: free } = await sb.rpc('username_available', { name: username });
    if (free === false) acc.username = (username.slice(0, 16) + Math.floor(1000 + Math.random() * 9000));
  }

  if (from && from.id !== user.id) {
    await db.reassignOwner(from.id, user.id);
    accounts.forget(from.id);
  }
  localStorage.removeItem(CLAIM_KEY);
  accounts.store(acc);
  accounts.setSession(acc);
  sync.start(user.id);
  return acc;
}

export const cloud = {
  enabled: cloudEnabled,

  /** Called once when the app starts: picks up email links and checks the saved login is still valid. */
  async init(onSignedIn: () => void, onSignedOut: (why: string) => void, onRecovery: () => void): Promise<void> {
    if (!cloudEnabled) return;
    const sb = await supa();
    sb.auth.onAuthStateChange((event, session) => {
      // never await other Supabase calls inside this callback (it can deadlock): hop out first
      setTimeout(() => {
        const cur = accounts.current;
        const user = session?.user;
        if (event === 'PASSWORD_RECOVERY') {
          // came from a "reset password" email: log them in on this device, then ask for the new password
          if (user && cur?.id !== user.id) adopt(user).then(() => { onSignedIn(); onRecovery(); }).catch((e) => console.warn('Fuzzies cloud:', e));
          else onRecovery();
          return;
        }
        if ((event === 'INITIAL_SESSION' || event === 'SIGNED_IN') && user) {
          if (cur?.id === user.id) { sync.start(user.id); return; }
          const claimPending = !!cur && !cur.cloud && localStorage.getItem(CLAIM_KEY) === cur.id;
          if (!cur || fromLink || claimPending) {
            adopt(user).then(onSignedIn).catch((e) => console.warn('Fuzzies cloud:', e));
          }
          return;
        }
        if (event === 'INITIAL_SESSION' && !user) {
          if (fromLink) onSignedOut('Email confirmed! Log in to continue.');
          else if (cur?.cloud && navigator.onLine) { sync.stop(); accounts.setSession(null); onSignedOut('Please log in again.'); }
          return;
        }
        if (event === 'SIGNED_OUT' && cur?.cloud) { sync.stop(); accounts.setSession(null); onSignedOut('You were logged out.'); }
      });
    });
    if (fromLink) history.replaceState(null, '', location.pathname + location.hash);
  },

  async signUp(input: SignUpInput): Promise<Account> {
    const { username, email } = check(input);
    const name = input.name.trim() || username;
    const sb = await supa();
    const { data: free, error: e1 } = await sb.rpc('username_available', { name: username });
    if (e1) throw friendly(e1);
    if (!free) throw new Error('That username is taken — try another.');
    const { data, error } = await sb.auth.signUp({ email, password: input.password, options: { data: { username, name }, emailRedirectTo: appUrl() } });
    if (error) throw friendly(error);
    if (!data.session || !data.user) throw new CheckEmail(`Almost there! We sent a link to ${email}. Tap it to finish, then log in.`);
    return adopt(data.user, { username, name }, null);
  },

  async signIn(login: string, password: string): Promise<Account> {
    let email = login.trim();
    if (!email.includes('@')) {
      // usernames work on a device that already knows the account; otherwise we need the email
      const known = accounts.list().find((a) => a.cloud && a.username === email.toLowerCase());
      if (!known) throw new Error('Log in with the email you signed up with.');
      email = known.email;
    }
    const sb = await supa();
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw friendly(error);
    return adopt(data.user, undefined, null);
  },

  /** Move the guest or on-device account you're using into the cloud, keeping designs and Fuzzies. */
  async claim(input: SignUpInput): Promise<Account> {
    const a = accounts.current;
    if (!a || a.cloud) throw new Error('This account is already saved in the cloud.');
    const { username, email } = check(input);
    const name = input.name.trim() || a.name || username;
    const sb = await supa();
    const { data: free, error: e1 } = await sb.rpc('username_available', { name: username });
    if (e1) throw friendly(e1);
    if (!free) throw new Error('That username is taken — try another.');
    const { data, error } = await sb.auth.signUp({ email, password: input.password, options: { data: { username, name }, emailRedirectTo: appUrl() } });
    if (error) throw friendly(error);
    if (!data.session || !data.user) {
      localStorage.setItem(CLAIM_KEY, a.id);
      throw new CheckEmail(`Almost there! We sent a link to ${email}. Tap it on this device and your designs and Fuzzies move into your new account.`);
    }
    return adopt(data.user, { username, name }, { ...a, username, name });
  },

  /** Log out. A cloud account's copy on this device is removed once everything is safely uploaded. */
  async signOut(): Promise<void> {
    const a = accounts.current;
    if (a?.cloud) {
      const allSent = await sync.drain();
      sync.stop();
      try { await (await supa()).auth.signOut({ scope: 'local' }); } catch { /* offline: the saved login is cleared anyway */ }
      if (allSent) { await db.deleteOwner(a.id); accounts.forget(a.id); sync.clear(a.id); }
    }
    accounts.setSession(null);
  },

  async changePassword(oldPw: string, newPw: string): Promise<void> {
    const a = accounts.current;
    if (!a?.cloud) return accounts.changePassword(oldPw, newPw);
    if (newPw.length < 6) throw new Error('New password needs at least 6 characters.');
    const sb = await supa();
    const { error: e1 } = await sb.auth.signInWithPassword({ email: a.email, password: oldPw });
    if (e1) throw new Error('Current password is wrong.');
    const { error } = await sb.auth.updateUser({ password: newPw });
    if (error) throw friendly(error);
  },

  /** After tapping a "reset password" email link. */
  async setNewPassword(pw: string): Promise<void> {
    if (pw.length < 6) throw new Error('Password needs at least 6 characters.');
    const { error } = await (await supa()).auth.updateUser({ password: pw });
    if (error) throw friendly(error);
  },

  async sendReset(email: string): Promise<void> {
    if (!EMAIL.test(email.trim())) throw new Error('Enter the email you signed up with.');
    const { error } = await (await supa()).auth.resetPasswordForEmail(email.trim(), { redirectTo: appUrl() });
    if (error) throw friendly(error);
  },

  /** Delete the account everywhere (cloud + this device). */
  async deleteAccount(): Promise<void> {
    const a = accounts.current;
    if (!a) return;
    if (a.cloud) {
      const sb = await supa();
      const { error } = await sb.rpc('delete_my_account');
      if (error) throw friendly(error);
      sync.stop();
      sync.clear(a.id);
      await sb.auth.signOut({ scope: 'local' }).catch(() => undefined);
    }
    await db.deleteOwner(a.id);
    accounts.remove();
  },
};
