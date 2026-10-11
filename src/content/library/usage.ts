/**
 * Real usage data for the template gallery.
 * - Everyone (cloud): how often each template was used in total and in the last 7 days, counted by the server
 *   (one count per person per template per day), cached for a few minutes.
 * - This device: the templates you used, newest first ("Recently used").
 * Nothing here is invented: with no data yet, the gallery simply doesn't show Trending/Popular.
 */
import { api, cloudEnabled } from '../../core/api';
import { accounts } from '../../core/account';

const LOCAL_KEY = 'fz.tpl.used';
interface Stats { popular: Record<string, number>; trending: Record<string, number>; at: number }
let stats: Stats | null = null;
let loading: Promise<Stats | null> | null = null;

function localUses(): { id: string; at: number }[] {
  try {
    const all = JSON.parse(localStorage.getItem(LOCAL_KEY) ?? '{}') as Record<string, { id: string; at: number }[]>;
    return all[accounts.current?.id ?? ''] ?? [];
  } catch { return []; }
}

/** Remember a use (this device) and tell the server (cloud accounts). */
export function recordUse(id: string): void {
  try {
    const all = JSON.parse(localStorage.getItem(LOCAL_KEY) ?? '{}') as Record<string, { id: string; at: number }[]>;
    const me = accounts.current?.id ?? '';
    all[me] = [{ id, at: Date.now() }, ...(all[me] ?? []).filter((u) => u.id !== id)].slice(0, 40);
    localStorage.setItem(LOCAL_KEY, JSON.stringify(all));
  } catch { /* private mode */ }
  if (cloudEnabled && accounts.current?.cloud) void api('templates', 'use', { id }).catch(() => {});
  if (stats) stats.popular[id] = (stats.popular[id] ?? 0) + 1;
}

/** Usage counts from the server (null when there's no server or it can't be reached). */
export function loadStats(): Promise<Stats | null> {
  if (stats && Date.now() - stats.at < 5 * 60_000) return Promise.resolve(stats);
  if (!cloudEnabled) return Promise.resolve(null);
  loading ??= fetch('./api/templates?stats=1').then(async (r) => {
    if (!r.ok) return null;
    const d = (await r.json()) as { popular?: [string, number][]; trending?: [string, number][] };
    stats = { popular: Object.fromEntries(d.popular ?? []), trending: Object.fromEntries(d.trending ?? []), at: Date.now() };
    return stats;
  }).catch(() => null).finally(() => { loading = null; });
  return loading;
}

export const usage = {
  /** Total uses by everyone (falls back to this device's count). */
  uses(id: string): number { return stats?.popular[id] ?? localUses().filter((u) => u.id === id).length; },
  trending(): [string, number][] { return Object.entries(stats?.trending ?? {}).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]); },
  popular(): [string, number][] { return Object.entries(stats?.popular ?? {}).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]); },
  recent(): string[] { return localUses().map((u) => u.id); },
};
