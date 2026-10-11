/**
 * Templates published from the template manager (stored in the database, see api/templates.ts).
 * The newest ones are loaded into the catalog when the gallery opens; when there are more than that, searches
 * also ask the server (Postgres full-text search) and the matches join the catalog. Documents download only
 * when someone previews or uses a template. Template managers (ADMIN_EMAILS in Vercel) can save and publish.
 */
import { api, cloudEnabled } from '../../core/api';
import { accounts } from '../../core/account';
import { migrateDesign } from '../../editor/model';
import type { Design } from '../../editor/types';
import { setPublished, setRemoteLoader, type TemplateMeta } from './catalog';
import type { Filters } from './search';

const FIRST = 200;
let loadedAt = 0;
let loading: Promise<void> | null = null;
let more = false; // the server has more published templates than we loaded
const asked = new Set<string>();

setRemoteLoader(async (id) => {
  const r = await fetch(`./api/templates?id=${encodeURIComponent(id)}`);
  if (!r.ok) throw new Error('This template isn’t available right now.');
  const d = (await r.json()) as { doc: unknown };
  return migrateDesign(d.doc);
});

type Listing = { items: TemplateMeta[]; total: number };
async function list(params: Record<string, string | undefined>): Promise<Listing | null> {
  const ps = new URLSearchParams({ list: '1' });
  for (const [k, v] of Object.entries(params)) if (v) ps.set(k, v);
  try {
    const r = await fetch(`./api/templates?${ps}`);
    return r.ok ? ((await r.json()) as Listing) : null;
  } catch { return null; }
}

/** Load the newest published templates into the catalog (cloud only; refreshed every 5 minutes). */
export function loadPublished(): Promise<void> {
  if (!cloudEnabled || Date.now() - loadedAt < 5 * 60_000) return Promise.resolve();
  loading ??= list({ limit: String(FIRST) }).then((d) => {
    if (!d) return;
    loadedAt = Date.now();
    more = d.total > d.items.length;
    asked.clear();
    setPublished(d.items);
  }).finally(() => { loading = null; });
  return loading;
}

/** When the server holds more than we loaded, look there too (results are merged into the catalog). */
export async function searchPublished(q: string, f: Filters): Promise<void> {
  if (!more || !q.trim()) return;
  const key = JSON.stringify([q.trim().toLowerCase(), f.category, f.sub, f.format]);
  if (asked.has(key)) return;
  asked.add(key);
  const d = await list({ q: q.trim(), cat: f.category, sub: f.sub, format: f.format, limit: '60' });
  if (d?.items.length) setPublished(d.items, true);
}

// ---------- template managers ----------
let adminFor: { id: string; yes: Promise<boolean> } | null = null;
/** May the signed-in account create and publish templates? (decided by the server) */
export function isTemplateAdmin(): Promise<boolean> {
  const a = accounts.current;
  if (!cloudEnabled || !a?.cloud) return Promise.resolve(false);
  if (adminFor?.id !== a.id) adminFor = { id: a.id, yes: api<{ admin: boolean }>('templates', 'me').then((r) => !!r.admin).catch(() => false) };
  return adminFor.yes;
}

export interface ManagedTemplate extends TemplateMeta { status: 'draft' | 'published'; hasThumb?: boolean }
export const manager = {
  list: () => api<{ items: ManagedTemplate[] }>('templates', 'mine').then((r) => r.items),
  get: (id: string) => api<{ meta: ManagedTemplate; doc: unknown }>('templates', 'get', { id }).then((r) => ({ meta: r.meta, doc: migrateDesign(r.doc) })),
  save: (meta: Partial<TemplateMeta>, doc: Design, thumb: string | null, status: 'draft' | 'published') =>
    api<{ id: string; revision: number }>('templates', 'save', { meta, doc, thumb, status }).then((r) => { loadedAt = 0; return r; }),
  publish: (id: string, on: boolean) => api('templates', on ? 'publish' : 'unpublish', { id }).then(() => { loadedAt = 0; }),
  remove: (id: string) => api('templates', 'delete', { id }).then(() => { loadedAt = 0; }),
};
