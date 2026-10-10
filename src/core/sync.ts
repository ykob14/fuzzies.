/**
 * Keeps a cloud account's profile, designs and photos the same on every device.
 *
 * Offline-first: everything is saved on the device as usual, and every change is also put in a small
 * queue (localStorage) that is sent to the cloud a moment later — or when the device is back online.
 * When the app opens or comes back to the front, it pulls anything newer from the cloud.
 * Conflicts: the newest copy of each design wins; the profile is merged field by field (core/merge.ts)
 * against the last copy both sides agreed on, so Fuzzies and unlocks from two devices add up.
 */
import { supa, cloudEnabled } from './supabase';
import { accounts, migrateAccount, type Account } from './account';
import { merge3, same } from './merge';
import { db, type Upload } from './db';
import type { Design } from '../editor/types';

type Kind = 'designs' | 'uploads';
/** Pending changes, with the time each one was queued (so a change made during a send isn't lost). */
interface Queue { profile: number; designs: Record<string, number>; uploads: Record<string, number> }
export type SyncState = 'off' | 'syncing' | 'synced' | 'offline' | 'error';

export interface ProfileRow { username: string; data: Partial<Account>; updated_at: number }
/** The last profile copy this device and the cloud agreed on: `at` is the cloud row's version. */
interface Base { at: number; data: Partial<Account> }
interface Row { id: string; updated_at: number; deleted: boolean }
/** A design or upload as stored in the cloud (`data` is null once deleted). */
interface CloudRow extends Row { owner: string; data: Design | Upload | null }

let uid: string | null = null;
let state: SyncState = 'off';
let lastError = '';
let lastSynced = 0;
let flushing: Promise<void> | null = null;
let pulling: Promise<void> | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;
let lastPull = 0;
const stateListeners = new Set<() => void>();
const remoteListeners = new Set<() => void>();

const qKey = (u: string) => `fz.sync.${u}`;
const bKey = (u: string) => `fz.sync.base.${u}`;
function readBase(u: string): Base | null {
  try { return JSON.parse(localStorage.getItem(bKey(u)) || 'null') as Base | null; } catch { return null; }
}
export function writeBase(u: string, b: Base): void { localStorage.setItem(bKey(u), JSON.stringify(b)); }
function readQueue(u: string): Queue {
  try {
    const q = JSON.parse(localStorage.getItem(qKey(u)) || 'null') as Queue | null;
    return { profile: q?.profile ?? 0, designs: q?.designs ?? {}, uploads: q?.uploads ?? {} };
  } catch { return { profile: 0, designs: {}, uploads: {} }; }
}
const writeQueue = (u: string, q: Queue) => localStorage.setItem(qKey(u), JSON.stringify(q));
const queueSize = (q: Queue) => (q.profile ? 1 : 0) + Object.keys(q.designs).length + Object.keys(q.uploads).length;

function setState(s: SyncState, err = ''): void {
  state = s;
  lastError = err;
  if (s === 'synced') lastSynced = Date.now();
  for (const l of stateListeners) l();
}

function enqueue(kind: 'profile' | Kind, id = ''): void {
  if (!uid) return;
  const q = readQueue(uid);
  if (kind === 'profile') q.profile = Date.now();
  else q[kind][id] = Date.now();
  writeQueue(uid, q);
  schedule(2000);
}

function schedule(ms: number): void {
  clearTimeout(timer);
  timer = setTimeout(() => { void sync.flush(); }, ms);
}

/** What goes into the cloud copy of an account (never the local password hash or device-only fields). */
export function profileData(a: Account): Partial<Account> {
  const { hash: _h, salt: _s, id: _i, email: _e, cloud: _c, guest: _g, ...rest } = JSON.parse(JSON.stringify(a)) as Account;
  return rest;
}

/** Build the local account from the cloud copy. */
export function accountFromRow(id: string, email: string, data: Partial<Account>): Account {
  return migrateAccount({ ...(data as Account), id, email, cloud: true, guest: false, hash: '', salt: '' });
}

/** Bring the cloud's copy of the profile into this device, merging with changes made here. Returns true if the local account changed. */
function pullProfile(me: string, row: ProfileRow | null, q: Queue): boolean {
  const a = accounts.current?.id === me ? accounts.current : accounts.get(me);
  if (!a) return false;
  const local = profileData(a);
  const base = readBase(me);
  if (!row) { q.profile ||= Date.now(); return false; } // not in the cloud yet
  const remote = { ...row.data, username: row.username };
  if (base && base.at === row.updated_at) {
    if (!same(local, base.data)) q.profile ||= Date.now(); // only this device changed
    return false;
  }
  const merged = merge3(base?.data ?? remote, local, remote);
  writeBase(me, { at: row.updated_at, data: remote });
  if (!same(merged, remote)) q.profile ||= Date.now();
  if (same(merged, local)) return false;
  accounts.store(accountFromRow(me, a.email, { ...merged, username: a.username }));
  return true;
}

/** Send the profile. Only overwrites the version we last saw, so a change from another device is merged first, never lost. */
async function pushProfile(me: string, attempt = 0): Promise<void> {
  const a = accounts.current?.id === me ? accounts.current : accounts.get(me);
  if (!a) return;
  const sb = await supa();
  const data = profileData(a);
  const base = readBase(me);
  if (base && same(data, base.data)) return;
  const at = Math.max(Date.now(), (base?.at ?? 0) + 1);
  const row = { username: a.username, data, updated_at: at };
  const res = base
    ? await sb.from('profiles').update(row).eq('id', me).eq('updated_at', base.at).select('updated_at')
    : await sb.from('profiles').insert({ id: me, ...row }).select('updated_at');
  const conflict = base ? !res.error && !res.data?.length : res.error?.code === '23505' && !res.error.message.includes('username');
  if (conflict && attempt < 3) {
    // someone else saved first: fetch their copy, merge, and try again
    const { data: cur, error } = await sb.from('profiles').select('username,data,updated_at').eq('id', me).maybeSingle();
    if (error) throw error;
    pullProfile(me, cur as ProfileRow | null, { profile: 0, designs: {}, uploads: {} });
    return pushProfile(me, attempt + 1);
  }
  if (res.error) throw res.error;
  writeBase(me, { at, data });
}

const inEditor = (id: string) => document.body.classList.contains('in-editor') && location.hash.includes(id);

async function pullKind(kind: Kind, q: Queue, me: string): Promise<number> {
  const sb = await supa();
  const { data, error } = await sb.from(kind).select('id,updated_at,deleted');
  if (error) throw error;
  const remote = new Map((data as Row[]).map((r) => [r.id, r]));
  const localList: { id: string; t: number }[] = kind === 'designs'
    ? (await db.listDesigns(me)).map((d) => ({ id: d.id, t: d.updatedAt }))
    : (await db.listUploads(me)).map((u) => ({ id: u.id, t: u.createdAt }));
  const local = new Map(localList.map((x) => [x.id, x.t]));
  let changed = 0;
  const need: string[] = [];
  for (const r of remote.values()) {
    if (q[kind][r.id] || inEditor(r.id)) continue; // a change made here is still on its way up: it wins
    const t = local.get(r.id);
    if (r.deleted) {
      if (t !== undefined && t <= r.updated_at) {
        if (kind === 'designs') await db.deleteDesign(r.id, true); else await db.deleteUpload(r.id, true);
        changed++;
      }
    } else if (t === undefined || t < r.updated_at) need.push(r.id);
  }
  // fetch the full rows a few at a time (designs can carry photos, so rows can be big)
  for (let i = 0; i < need.length; i += 8) {
    const { data: rows, error: e2 } = await sb.from(kind).select('id,data').in('id', need.slice(i, i + 8));
    if (e2) throw e2;
    for (const r of rows as { id: string; data: Design | Upload }[]) {
      if (!r.data) continue;
      if (uid !== me) return changed; // signed out meanwhile
      if (kind === 'designs') await db.putDesign({ ...(r.data as Design), owner: me }, true);
      else await db.putUpload({ ...(r.data as Upload), owner: me }, true);
      changed++;
    }
  }
  // anything here that the cloud doesn't have yet (or has an older copy of) goes up
  for (const [id, t] of local) {
    const r = remote.get(id);
    if (!r || (!r.deleted && r.updated_at < t)) q[kind][id] ||= Date.now();
  }
  return changed;
}

export const sync = {
  get state(): SyncState { return state; },
  get error(): string { return lastError; },
  get lastSynced(): number { return lastSynced; },
  pending(): number { return uid ? queueSize(readQueue(uid)) : 0; },

  onState(fn: () => void): () => void { stateListeners.add(fn); return () => stateListeners.delete(fn); },
  /** Called after designs or the profile changed because of another device. */
  onRemoteChange(fn: () => void): () => void { remoteListeners.add(fn); return () => remoteListeners.delete(fn); },

  /** Start syncing for this cloud user (after logging in, or when the app opens already logged in). */
  start(userId: string): void {
    uid = userId;
    void this.pull();
  },

  stop(): void {
    uid = null;
    clearTimeout(timer);
    setState('off');
  },

  /** Get anything newer from the cloud, then send what's waiting here. */
  pull(): Promise<void> {
    if (!uid) return Promise.resolve();
    if (pulling) return pulling;
    const me = uid;
    pulling = (async () => {
      if (!navigator.onLine) { setState('offline'); return; }
      setState('syncing');
      try {
        const sb = await supa();
        const q = readQueue(me);
        let changed = 0;
        const { data: row, error } = await sb.from('profiles').select('username,data,updated_at').eq('id', me).maybeSingle();
        if (error) throw error;
        if (pullProfile(me, row as ProfileRow | null, q)) changed++;
        changed += await pullKind('designs', q, me);
        changed += await pullKind('uploads', q, me);
        if (uid !== me) return;
        // merge what we found into the queue (it may have grown while we were pulling)
        const cur = readQueue(me);
        writeQueue(me, { profile: cur.profile || q.profile, designs: { ...q.designs, ...cur.designs }, uploads: { ...q.uploads, ...cur.uploads } });
        lastPull = Date.now();
        if (changed) for (const l of remoteListeners) l();
        await this.flush(true);
      } catch (e) {
        console.warn('Fuzzies sync (pull):', e);
        setState(navigator.onLine ? 'error' : 'offline', (e as Error).message ?? String(e));
      }
    })().finally(() => { pulling = null; });
    return pulling;
  },

  /** Send everything waiting in the queue. */
  flush(force = false): Promise<void> {
    if (!uid) return Promise.resolve();
    if (flushing) return flushing.then(() => (force ? this.flush() : undefined));
    const me = uid;
    flushing = (async () => {
      if (!navigator.onLine) { setState('offline'); return; }
      const q = readQueue(me);
      if (!queueSize(q)) { setState('synced'); return; }
      setState('syncing');
      const done: Queue = { profile: 0, designs: {}, uploads: {} };
      try {
        const sb = await supa();
        if (q.profile) {
          await pushProfile(me);
          done.profile = q.profile;
        }
        for (const id of Object.keys(q.designs)) {
          if (uid !== me) return;
          const d = await db.getDesign(id);
          const row: CloudRow = d && d.owner === me ? { id, owner: me, data: d, deleted: false, updated_at: d.updatedAt } : { id, owner: me, data: null, deleted: true, updated_at: Date.now() };
          const { error } = await sb.from('designs').upsert(row);
          if (error) throw error;
          done.designs[id] = q.designs[id];
        }
        for (const id of Object.keys(q.uploads)) {
          if (uid !== me) return;
          const u = await db.getUpload(id);
          const row: CloudRow = u && u.owner === me ? { id, owner: me, data: u, deleted: false, updated_at: u.createdAt } : { id, owner: me, data: null, deleted: true, updated_at: Date.now() };
          const { error } = await sb.from('uploads').upsert(row);
          if (error) throw error;
          done.uploads[id] = q.uploads[id];
        }
        setState('synced');
      } catch (e) {
        console.warn('Fuzzies sync (push):', e);
        setState(navigator.onLine ? 'error' : 'offline', (e as Error).message ?? String(e));
        schedule(30_000); // try again in a bit
      } finally {
        // drop what was sent, unless it changed again in the meantime
        const cur = readQueue(me);
        if (done.profile && cur.profile === done.profile) cur.profile = 0;
        for (const k of ['designs', 'uploads'] as const) for (const [id, t] of Object.entries(done[k])) if (cur[k][id] === t) delete cur[k][id];
        writeQueue(me, cur);
      }
    })().finally(() => { flushing = null; });
    return flushing;
  },

  /** Wait (up to `ms`) for everything to be sent. Returns true if nothing is left waiting. */
  async drain(ms = 6000): Promise<boolean> {
    if (!uid) return true;
    await Promise.race([this.flush(true), new Promise((r) => setTimeout(r, ms))]);
    return this.pending() === 0;
  },

  /** Forget this device's queue for a user (after the account is deleted). */
  clear(userId: string): void { localStorage.removeItem(qKey(userId)); localStorage.removeItem(bKey(userId)); },
};

// ---- listen for changes made on this device ----
if (cloudEnabled) {
  db.onWrite((kind, id) => { if (uid && accounts.current?.id === uid) enqueue(kind, id); });
  accounts.onChange((a) => { if (uid && a?.id === uid) enqueue('profile'); }); // flush skips it if nothing really changed
  addEventListener('online', () => { void sync.pull(); });
  addEventListener('offline', () => { if (uid) setState('offline'); });
  document.addEventListener('visibilitychange', () => {
    if (!uid) return;
    if (document.hidden) void sync.flush(); // e.g. switching apps on a phone: send now
    else if (Date.now() - lastPull > 30_000) void sync.pull();
  });
}
