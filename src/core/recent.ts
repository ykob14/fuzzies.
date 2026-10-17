/** What you did last on this device (a design, the town, a game), so Home can offer "Jump back in". Per account, per device. */
import { accounts } from './account';

export type RecentKind = 'land' | 'crossing' | 'parking' | 'design';
export interface RecentItem { kind: RecentKind; at: number; id?: string }

const key = () => (accounts.current ? `fz.recent.${accounts.current.id}` : '');

function read(): RecentItem[] {
  const k = key();
  if (!k) return [];
  try {
    const v = JSON.parse(localStorage.getItem(k) || '[]');
    return Array.isArray(v) ? v.filter((x): x is RecentItem => !!x && typeof x.kind === 'string' && Number.isFinite(x.at)) : [];
  } catch { return []; }
}

/** remember that this was just opened (newest first, one entry per kind) */
export function noteRecent(kind: RecentKind, id?: string): void {
  const k = key();
  if (!k) return;
  const list = [{ kind, at: Date.now(), ...(id ? { id } : {}) }, ...read().filter((x) => x.kind !== kind)].slice(0, 6);
  try { localStorage.setItem(k, JSON.stringify(list)); } catch { /* private mode: Home just shows less */ }
}

/** newest first */
export function recentList(): RecentItem[] { return read().sort((a, b) => b.at - a.at); }
