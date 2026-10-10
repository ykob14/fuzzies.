/**
 * Accounts and profiles. The signed-in account is always kept on this device (localStorage), so the
 * app works offline. Local accounts store a salted PBKDF2 password hash. Cloud accounts (`cloud: true`,
 * see core/cloud.ts) log in through the Fuzzies backend (api/, Neon) and are synced to every device; their id is the cloud user id.
 */
import { uid, todayKey } from './util';

export interface Avatar { emoji: string; color: string; image?: string }

export interface Settings {
  theme: string;
  accent: string; // '' = theme default
  sound: boolean;
  snap: boolean;
  reduceMotion: boolean;
  skin: string; // Fuzzy Crossing player look
  gameGfx: 'real' | 'classic';
  /** Home-screen / desktop app icon: Fuzzy colour + background (see core/appicon.ts). */
  appIcon: { color: string; bg: string };
}

export interface Stats {
  designs: number;
  exports: number;
  gamesPlayed: number;
  bestScore: number;
  bestLevel: number;
  fuzziesFromGame: number;
  minutesActive: number;
  nests: number;
  photos: number;
  templates: number;
  stickers: number;
  linksShared: number;
}

export interface BrandKit { colors: string[]; heading: string; body: string; logo?: { src: string; w: number; h: number } }

export interface ScoreEntry { score: number; level: number; at: number; skin: string }

export interface Account {
  id: string;
  username: string;
  email: string;
  name: string;
  bio: string;
  guest: boolean;
  /** Logged in through the Fuzzies backend (Neon) and synced across devices. */
  cloud: boolean;
  hash: string;
  salt: string;
  createdAt: number;
  avatar: Avatar;
  fuzzies: number; // spendable balance
  totalFuzzies: number; // lifetime earned
  unlocked: string[];
  stats: Stats;
  daily: { last: string; streak: number; exportsToday: number; exportsDay: string };
  /** Today's missions: progress per mission id, and whether today's set was finished. */
  missions: { day: string; progress: Record<string, number>; done: string[]; bonus: boolean };
  achievements: string[];
  topScores: ScoreEntry[];
  /** Brand kit: colours, fonts and a logo reused across designs. */
  brand: BrandKit;
  settings: Settings;
}

const K_ACCOUNTS = 'fz.accounts';
const K_SESSION = 'fz.session';

type Listener = (a: Account | null) => void;
const listeners = new Set<Listener>();

function readAll(): Record<string, Account> {
  try { return JSON.parse(localStorage.getItem(K_ACCOUNTS) || '{}'); } catch { return {}; }
}
function writeAll(all: Record<string, Account>): void {
  localStorage.setItem(K_ACCOUNTS, JSON.stringify(all));
}

const enc = new TextEncoder();
const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');

async function hashPassword(pw: string, salt: string): Promise<string> {
  if (globalThis.crypto?.subtle) {
    const key = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(salt), iterations: 120_000 }, key, 256);
    return 'p2:' + hex(bits);
  }
  // Non-secure contexts (plain http on a LAN) have no SubtleCrypto: fall back to an iterated FNV mix.
  let h1 = 0x811c9dc5, h2 = 0x01000193;
  const s = salt + ':' + pw;
  for (let r = 0; r < 4000; r++) {
    for (let i = 0; i < s.length; i++) {
      h1 = Math.imul(h1 ^ s.charCodeAt(i), 16777619) >>> 0;
      h2 = Math.imul(h2 ^ (h1 + r), 2246822519) >>> 0;
    }
  }
  return 'f1:' + h1.toString(16) + h2.toString(16);
}

const AVATAR_COLORS = ['#d6336c', '#18171c', '#b0245a', '#ff8fb4', '#5c5864'];
const AVATAR_EMOJI = ['🦄', '🐻', '🐰', '🦊', '🐼', '🐸', '🐙', '🦋', '🐯', '🐨'];
const pick = <T>(a: T[]) => a[Math.floor(Math.random() * a.length)];

function fresh(username: string, name: string, email: string, guest: boolean): Account {
  return {
    id: uid('u_'),
    username,
    email,
    name,
    bio: '',
    guest,
    cloud: false,
    hash: '',
    salt: uid(),
    createdAt: Date.now(),
    avatar: { emoji: pick(AVATAR_EMOJI), color: pick(AVATAR_COLORS) },
    fuzzies: 10, // welcome gift
    totalFuzzies: 10,
    unlocked: [],
    stats: { designs: 0, exports: 0, gamesPlayed: 0, bestScore: 0, bestLevel: 0, fuzziesFromGame: 0, minutesActive: 0, nests: 0, photos: 0, templates: 0, stickers: 0, linksShared: 0 },
    daily: { last: '', streak: 0, exportsToday: 0, exportsDay: '' },
    missions: { day: '', progress: {}, done: [], bonus: false },
    achievements: [],
    topScores: [],
    brand: { colors: [], heading: 'Poppins', body: 'DM Sans' },
    settings: { theme: 'system', accent: '', sound: true, snap: true, reduceMotion: false, skin: 'classic', gameGfx: 'real', appIcon: { color: 'classic', bg: 'ink' } },
  };
}

let current: Account | null = null;

export const accounts = {
  get current(): Account | null { return current; },

  restore(): Account | null {
    const id = localStorage.getItem(K_SESSION);
    const all = readAll();
    current = id && all[id] ? migrate(all[id]) : null;
    return current;
  },

  onChange(fn: Listener): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  /** Persist and notify. Pass a mutator to change the signed-in account. */
  update(mut?: (a: Account) => void): void {
    if (!current) return;
    mut?.(current);
    const all = readAll();
    all[current.id] = current;
    writeAll(all);
    for (const l of listeners) l(current);
  },

  async signUp(input: { name: string; username: string; email: string; password: string }): Promise<Account> {
    const username = input.username.trim().toLowerCase();
    if (!/^[a-z0-9_.]{3,20}$/.test(username)) throw new Error('Username: 3–20 letters, numbers, dots or underscores.');
    if (input.password.length < 6) throw new Error('Password needs at least 6 characters.');
    const all = readAll();
    if (Object.values(all).some((a) => a.username === username)) throw new Error('That username is taken on this device.');
    const a = fresh(username, input.name.trim() || username, input.email.trim(), false);
    a.hash = await hashPassword(input.password, a.salt);
    all[a.id] = a;
    writeAll(all);
    this.setSession(a);
    return a;
  },

  async signIn(login: string, password: string): Promise<Account> {
    const key = login.trim().toLowerCase();
    const a = Object.values(readAll()).find((x) => !x.guest && !x.cloud && (x.username === key || (x.email && x.email.toLowerCase() === key)));
    if (!a || (await hashPassword(password, a.salt)) !== a.hash) throw new Error('Wrong username or password.');
    this.setSession(migrate(a));
    return a;
  },

  guest(): Account {
    const a = fresh('guest' + Math.floor(Math.random() * 9000 + 1000), 'Guest', '', true);
    const all = readAll();
    all[a.id] = a;
    writeAll(all);
    this.setSession(a);
    return a;
  },

  /** Turn a guest into a full account, keeping designs and Fuzzies. */
  async claimGuest(input: { name: string; username: string; email: string; password: string }): Promise<void> {
    if (!current) return;
    const username = input.username.trim().toLowerCase();
    if (!/^[a-z0-9_.]{3,20}$/.test(username)) throw new Error('Username: 3–20 letters, numbers, dots or underscores.');
    if (input.password.length < 6) throw new Error('Password needs at least 6 characters.');
    if (Object.values(readAll()).some((a) => a.username === username && a.id !== current!.id)) throw new Error('That username is taken on this device.');
    const hash = await hashPassword(input.password, current.salt);
    this.update((a) => { a.username = username; a.name = input.name.trim() || username; a.email = input.email.trim(); a.hash = hash; a.guest = false; });
  },

  async changePassword(oldPw: string, newPw: string): Promise<void> {
    if (!current) return;
    if ((await hashPassword(oldPw, current.salt)) !== current.hash) throw new Error('Current password is wrong.');
    if (newPw.length < 6) throw new Error('New password needs at least 6 characters.');
    const hash = await hashPassword(newPw, current.salt);
    this.update((a) => { a.hash = hash; });
  },

  /** Save an account that came from elsewhere (the cloud, or a converted guest) without marking it as changed. */
  store(a: Account): void {
    const all = readAll();
    all[a.id] = a;
    writeAll(all);
    if (current?.id === a.id) { current = a; for (const l of listeners) l(current); }
  },

  /** Forget an account on this device only (used when a guest or local account moves to the cloud). */
  forget(id: string): void {
    const all = readAll();
    delete all[id];
    writeAll(all);
  },

  /** A saved account by id, with any new fields filled in. */
  get(id: string): Account | null {
    const a = readAll()[id];
    return a ? migrate(a) : null;
  },

  setSession(a: Account | null): void {
    current = a;
    if (a) localStorage.setItem(K_SESSION, a.id);
    else localStorage.removeItem(K_SESSION);
    for (const l of listeners) l(current);
  },

  signOut(): void { this.setSession(null); },

  remove(): void {
    if (!current) return;
    const all = readAll();
    delete all[current.id];
    writeAll(all);
    this.setSession(null);
  },

  list(): Account[] { return Object.values(readAll()).filter((a) => !a.guest); },
};

/** Fill in fields added after an account was first saved. */
function migrate(a: Account): Account {
  const f = fresh(a.username, a.name, a.email, a.guest);
  return { ...f, ...a, stats: { ...f.stats, ...a.stats }, daily: { ...f.daily, ...a.daily }, missions: { ...f.missions, ...a.missions }, brand: { ...f.brand, ...a.brand }, settings: { ...f.settings, ...a.settings }, avatar: { ...f.avatar, ...a.avatar } };
}

export { fresh as freshAccount, migrate as migrateAccount };

export const isToday = (key: string): boolean => key === todayKey();
