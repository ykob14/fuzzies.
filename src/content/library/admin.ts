/**
 * Template managers: accounts listed in the fz_admins table can save designs as templates, publish/unpublish and
 * delete them, and — when the site has an Anthropic API key — draft template wording with AI. The server decides who
 * is a manager; this file only asks. Kept small so the editor can import it without loading the whole catalog.
 */
import { api, cloudEnabled } from '../../core/api';
import { accounts } from '../../core/account';
import { migrateDesign } from '../../editor/model';
import type { Design } from '../../editor/types';
import type { TemplateMeta } from './catalog';

interface Rights { admin: boolean; ai: boolean }
let rights: { id: string; p: Promise<Rights>; v?: Rights } | null = null;

/** What the signed-in account may do with templates (asked once per account). */
export function templateRights(): Promise<Rights> {
  const a = accounts.current;
  if (!cloudEnabled || !a?.cloud) return Promise.resolve({ admin: false, ai: false });
  if (rights?.id !== a.id) {
    const r: { id: string; p: Promise<Rights>; v?: Rights } = { id: a.id, p: Promise.resolve({ admin: false, ai: false }) };
    r.p = api<Partial<Rights>>('templates', 'me').then((x) => (r.v = { admin: !!x.admin, ai: !!x.ai })).catch(() => ({ admin: false, ai: false }));
    rights = r;
  }
  return rights.p;
}
/** The answer if it's already known (for menus that open instantly). */
export const knownRights = (): Rights => (rights?.id === accounts.current?.id && rights?.v) || { admin: false, ai: false };

export interface ManagedTemplate extends TemplateMeta { status: 'draft' | 'published'; hasThumb?: boolean }
export interface DraftText { title: string; kicker: string; details: string[]; cta: string; occasion: string }

const changed = () => import('./remote').then((m) => m.refreshPublished()).catch(() => {});
export const manager = {
  list: () => api<{ items: ManagedTemplate[] }>('templates', 'mine').then((r) => r.items),
  get: (id: string) => api<{ meta: ManagedTemplate; doc: unknown }>('templates', 'get', { id }).then((r) => ({ meta: r.meta, doc: migrateDesign(r.doc) })),
  save: async (meta: Partial<TemplateMeta>, doc: Design, thumb: string | null, status: 'draft' | 'published') => {
    const r = await api<{ id: string; revision: number }>('templates', 'save', { meta, doc, thumb, status });
    void changed();
    return r;
  },
  publish: (id: string, on: boolean) => api('templates', on ? 'publish' : 'unpublish', { id }).then(changed),
  remove: (id: string) => api('templates', 'delete', { id }).then(changed),
  /** AI-drafted wording for a topic (only when the site has an AI key; the server says so in templateRights()). */
  draft: (brief: string, topic: string, n = 3) => api<{ drafts: DraftText[] }>('templates', 'ai', { brief, topic, n }).then((r) => r.drafts),
};
