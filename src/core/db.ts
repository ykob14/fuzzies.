/** IndexedDB storage for designs and uploaded photos (they can be several MB, too big for localStorage). */
import type { Design } from '../editor/types';

export interface Upload { id: string; owner: string; src: string; w: number; h: number; createdAt: number }

const DB_NAME = 'fuzzies';
const VERSION = 1;
let dbp: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  if (dbp) return dbp;
  dbp = new Promise((res, rej) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('designs')) db.createObjectStore('designs', { keyPath: 'id' }).createIndex('owner', 'owner');
      if (!db.objectStoreNames.contains('uploads')) db.createObjectStore('uploads', { keyPath: 'id' }).createIndex('owner', 'owner');
    };
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
  return dbp;
}

function wrap<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((res, rej) => {
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

async function store(name: 'designs' | 'uploads', mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> {
  return (await open()).transaction(name, mode).objectStore(name);
}

/** Someone changed a design or upload on this device (the cloud sync listens to push it). */
type WriteListener = (kind: 'designs' | 'uploads', id: string) => void;
const writeListeners = new Set<WriteListener>();
const wrote = (kind: 'designs' | 'uploads', id: string, quiet?: boolean) => { if (!quiet) for (const l of writeListeners) l(kind, id); };

export const db = {
  onWrite(fn: WriteListener): () => void {
    writeListeners.add(fn);
    return () => writeListeners.delete(fn);
  },
  async listDesigns(owner: string): Promise<Design[]> {
    const all = (await wrap((await store('designs')).index('owner').getAll(owner))) as Design[];
    return all.sort((a, b) => b.updatedAt - a.updatedAt);
  },
  async getDesign(id: string): Promise<Design | undefined> {
    return (await wrap((await store('designs')).get(id))) as Design | undefined;
  },
  /** `quiet` = this change came from the cloud, so don't send it back. */
  async putDesign(d: Design, quiet = false): Promise<void> {
    await wrap((await store('designs', 'readwrite')).put(d));
    wrote('designs', d.id, quiet);
  },
  async deleteDesign(id: string, quiet = false): Promise<void> {
    await wrap((await store('designs', 'readwrite')).delete(id));
    wrote('designs', id, quiet);
  },
  async listUploads(owner: string): Promise<Upload[]> {
    const all = (await wrap((await store('uploads')).index('owner').getAll(owner))) as Upload[];
    return all.sort((a, b) => b.createdAt - a.createdAt);
  },
  async getUpload(id: string): Promise<Upload | undefined> {
    return (await wrap((await store('uploads')).get(id))) as Upload | undefined;
  },
  async putUpload(u: Upload, quiet = false): Promise<void> {
    await wrap((await store('uploads', 'readwrite')).put(u));
    wrote('uploads', u.id, quiet);
  },
  async deleteUpload(id: string, quiet = false): Promise<void> {
    await wrap((await store('uploads', 'readwrite')).delete(id));
    wrote('uploads', id, quiet);
  },
  /** Move everything one account owns to another (a guest or local account moving to the cloud). */
  async reassignOwner(from: string, to: string): Promise<void> {
    for (const name of ['designs', 'uploads'] as const) {
      const s = await store(name, 'readwrite');
      const rows = (await wrap(s.index('owner').getAll(from))) as { owner: string }[];
      for (const r of rows) { r.owner = to; s.put(r); }
    }
  },
  async deleteOwner(owner: string): Promise<void> {
    for (const name of ['designs', 'uploads'] as const) {
      const s = await store(name, 'readwrite');
      const keys = await wrap(s.index('owner').getAllKeys(owner));
      for (const k of keys) s.delete(k);
    }
  },
};
