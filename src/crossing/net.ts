/**
 * Fuzzy Crossing weekly boards — the app side. Nothing here ever blocks or delays the game, and nothing happens at all for guests or
 * on-device accounts (only signed-in cloud accounts can compete; everybody can read the boards).
 *
 *   startRun()   when a Classic game really starts: asks the server for a run session (a secret only this player holds) and begins
 *                counting hops / nests / pickups / deaths / streak from the store's `report` events.
 *   pauseRun(p)  the game was paused / resumed — paused time isn't run time.
 *   finishRun()  game over (or the player left): sends the result; the server times the run itself and checks it fits the rules.
 *                A network failure keeps the result for a retry (until the run's 45 minutes are up).
 *   claimLastWeek()  collects the rewards of weeks that ended (trophy, Fuzzies, cosmetics, coins) — once per board, applied through the store.
 */
import { api, ApiError, cloudEnabled, token } from '../core/api';
import { accounts } from '../core/account';
import * as store from './store';
import { BOARD_IDS, type Board, type Tier, type WeeklyReward } from './rewards-weekly';

export const canCompete = (): boolean => cloudEnabled && !!accounts.current?.cloud && !!token.get();

// ---------- the run being played ----------
interface Live {
  session: Promise<{ runId: string; nonce: string } | null>;
  t0: number; pausedMs: number; pausedAt: number | null;
  hops: number; nests: number; pickups: number; golds: number; deaths: number; streak: number; bestStreak: number; firstFive: number | null;
  characterId: string; off: () => void;
}
let live: Live | null = null;
const clock = (L: Live): number => Math.max(0, Math.round((L.pausedAt ?? performance.now()) - L.t0 - L.pausedMs));

export function startRun(): void {
  if (live) { live.off(); live = null; }
  if (!canCompete()) return;
  void flushPending();
  const L: Live = {
    session: api<{ runId: string; nonce: string }>('crossing', 'run.start', { mode: 'classic' }).then((r) => ({ runId: r.runId, nonce: r.nonce })).catch(() => null),
    t0: performance.now(), pausedMs: 0, pausedAt: null,
    hops: 0, nests: 0, pickups: 0, golds: 0, deaths: 0, streak: 0, bestStreak: 0, firstFive: null,
    characterId: store.equippedCharacter().id, off: () => undefined,
  };
  L.off = store.onReport((e) => {
    switch (e.kind) {
      case 'hop': L.hops++; break;
      case 'pickup': L.pickups++; if (e.gold) L.golds++; break;
      case 'nest':
        L.nests++; L.streak++; L.bestStreak = Math.max(L.bestStreak, L.streak);
        if (L.nests === 5 && L.deaths === 0) L.firstFive = clock(L); // the first level, with no life lost
        break;
      case 'death': L.deaths++; L.streak = 0; break;
    }
  });
  live = L;
}
export function pauseRun(paused: boolean): void {
  if (!live) return;
  if (paused && live.pausedAt === null) live.pausedAt = performance.now();
  else if (!paused && live.pausedAt !== null) { live.pausedMs += performance.now() - live.pausedAt; live.pausedAt = null; }
}
export const runLive = (): boolean => !!live;

export interface BoardStanding { rank: number | null; best: number | null; improved: boolean }
export interface RunReport { accepted: boolean; week?: string; standing: Record<Board, BoardStanding>; message?: string; queued?: boolean }

interface Pending { runId: string; nonce: string; result: Record<string, unknown>; at: number }
const pendingKey = (): string => `fz.cx.pending.${accounts.current?.id ?? ''}`;
const readPending = (): Pending[] => { try { const v = JSON.parse(localStorage.getItem(pendingKey()) ?? '[]'); return Array.isArray(v) ? v : []; } catch { return []; } };
const writePending = (xs: Pending[]): void => { try { if (xs.length) localStorage.setItem(pendingKey(), JSON.stringify(xs.slice(-5))); else localStorage.removeItem(pendingKey()); } catch { /* storage blocked: the result is simply lost */ } };
const RUN_LIFE = 45 * 60_000;

type FinishReply = { accepted: boolean; reason?: string; message?: string; week?: string; ranks?: Record<string, number | null>; bests?: Record<string, number | null>; improved?: Record<string, boolean> };
const toReport = (r: FinishReply): RunReport => ({
  accepted: !!r.accepted, week: r.week, message: r.message,
  standing: Object.fromEntries(BOARD_IDS.map((b) => [b, { rank: r.ranks?.[b] ?? null, best: r.bests?.[b] ?? null, improved: !!r.improved?.[b] }])) as Record<Board, BoardStanding>,
});
const announce = (report: RunReport): void => { try { dispatchEvent(new CustomEvent('fz:cx-result', { detail: report })); } catch { /* no window */ } };

/** Sends one stored result. true = done with it (accepted or refused for good), false = try again later. */
async function send(p: Pending): Promise<{ done: boolean; report?: RunReport }> {
  try {
    const r = await api<FinishReply>('crossing', 'run.finish', { runId: p.runId, nonce: p.nonce, result: p.result });
    return { done: true, report: toReport(r) };
  } catch (e) {
    // couldn't reach the server (or it hiccupped): keep it; anything else (a refusal, a 4xx) is final
    return { done: !(e instanceof ApiError && (e.status === 0 || e.status >= 500 || e.status === 429)) };
  }
}

/** Retry results that couldn't be sent earlier (runs older than 45 minutes are dropped: the server has closed them). */
export async function flushPending(): Promise<void> {
  if (!canCompete()) return;
  const keep: Pending[] = [];
  for (const p of readPending()) {
    if (Date.now() - p.at > RUN_LIFE) continue;
    const r = await send(p);
    if (!r.done) keep.push(p); else if (r.report?.accepted) announce(r.report);
  }
  writePending(keep);
}

/**
 * The run is over (the game ended, or the player left a run that had begun). Resolves with the standing, or null when there is nothing
 * to report (not signed in, nothing scored, the server couldn't be reached — then it is kept and retried later).
 */
export async function finishRun(end: { score: number; level: number }, quit = false): Promise<RunReport | null> {
  const L = live;
  if (!L) return null;
  live = null;
  L.off();
  if (L.pausedAt !== null) pauseRun(false);
  const timeMs = clock(L);
  if (end.score <= 0) return null; // nothing to put on a board
  const result = {
    score: Math.floor(end.score), level: end.level, nests: L.nests, pickups: L.pickups, goldPickups: L.golds, hops: L.hops, deaths: Math.min(3, L.deaths),
    timeMs, firstFiveNestsMs: L.firstFive, bestStreak: L.bestStreak, characterId: L.characterId,
  };
  const session = await L.session;
  if (!session) return null; // the run never got a session (offline at the start)
  const p: Pending = { ...session, result, at: Date.now() - timeMs };
  const sent = await send(p);
  if (!sent.done) {
    writePending([...readPending(), p]);
    return quit ? null : { accepted: false, queued: true, standing: toReport({ accepted: false }).standing };
  }
  if (sent.report?.accepted) announce(sent.report);
  return sent.report ?? null;
}

// ---------- weekly rewards ----------
export interface ClaimedItem { week: string; board: Board; rank: number; tier: Tier; reward: WeeklyReward; /** first time this trophy reached this device */ fresh: boolean }
type ClaimedWire = { board: Board; rank: number; tier: Tier; reward: WeeklyReward; repeat: boolean };

/** Put one board's reward in the save: the trophy (once), the best placing, the Fuzzies and cosmetics; coins only with a new trophy. */
export function applyWeeklyReward(week: string, board: Board, rank: number, reward: WeeklyReward): boolean {
  const fresh = !store.save().trophies.includes(reward.trophy);
  store.mutate((c) => {
    if (!c.trophies.includes(reward.trophy)) c.trophies.push(reward.trophy);
    c.weeklyBest = c.weeklyBest > 0 ? Math.min(c.weeklyBest, rank) : rank;
  }, 'weekly', { week, board, rank });
  for (const id of reward.characters) store.grantCharacter(id, `weekly-${week}`);
  for (const id of reward.cosmetics) store.grantCosmetic(id, `weekly-${week}`);
  if (fresh && reward.coins > 0) store.addCoins(reward.coins);
  store.evaluate();
  return fresh;
}

export interface ClaimableWeek { week: string; boards: { board: Board; rank: number; tier: Tier; reward: WeeklyReward }[] }
let statusCache: { at: number; weeks: ClaimableWeek[]; account: string } | null = null;
/** Finished weeks with a reward waiting for this player, with what each board earned (cached for a minute — it backs the menu badge). */
export async function claimableDetail(force = false): Promise<ClaimableWeek[]> {
  if (!canCompete()) return [];
  const me = accounts.current!.id;
  if (!force && statusCache && statusCache.account === me && Date.now() - statusCache.at < 60_000) return statusCache.weeks;
  try {
    const r = await api<{ claimable: ClaimableWeek[] }>('crossing', 'weekly.status');
    statusCache = { at: Date.now(), weeks: r.claimable, account: me };
    return statusCache.weeks;
  } catch { return statusCache?.account === me ? statusCache.weeks : []; }
}
export const claimableWeeks = async (force = false): Promise<string[]> => (await claimableDetail(force)).map((c) => c.week);

/** Collect every finished week's rewards. Never throws; returns what was applied (empty = nothing to collect or offline). */
export async function claimLastWeek(): Promise<ClaimedItem[]> {
  if (!canCompete()) return [];
  const out: ClaimedItem[] = [];
  try {
    for (const week of await claimableWeeks(true)) {
      const r = await api<{ week: string; claimed: ClaimedWire[] }>('crossing', 'weekly.claim', { week });
      for (const c of r.claimed) out.push({ week, board: c.board, rank: c.rank, tier: c.tier, reward: c.reward, fresh: applyWeeklyReward(week, c.board, c.rank, c.reward) });
    }
  } catch (e) { console.warn('weekly claim', e); }
  statusCache = null;
  return out;
}

// ---------- reading boards (public) ----------
export interface BoardRow { rank: number; username: string; avatar: { emoji: string; color: string; friend?: string }; value: number; characterId: string | null; you: boolean }
export interface BoardData {
  board: Board; week: string; current: string; weekStart: number; weekEnd: number; now: number; endsInMs: number;
  rows: BoardRow[]; me: { rank: number; value: number; characterId: string | null } | null; total: number;
}
export function fetchBoard(board: Board, week: 'current' | 'previous' | string, limit = 25): Promise<BoardData> {
  return api<BoardData>('crossing', 'board.get', { board, week, limit });
}

// results of a game can arrive while the app is offline: try again when the network comes back
try { addEventListener('online', () => { void flushPending(); }); } catch { /* no window */ }
