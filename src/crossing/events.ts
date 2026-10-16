/**
 * Fuzzy Crossing seasonal events — the logic. Reusable: everything about a particular event (look, challenges, keepsakes) is data in
 * eventData.ts, the dates are in shopData.ts, so a new year is a data-only change.
 *
 *  - An OCCURRENCE is one run of an event: `${event}-${year}` (the year its window starts in — Christmas 2026 runs into January 2027).
 *  - Challenges (6 + a finale) count what the player does WHILE the event is on (progress is saved in `account.crossing.events[key]`).
 *    Every counter is a plain adding-up number, so two devices merge correctly (core/merge.ts adds each side's change).
 *  - Claiming is idempotent: the challenge id goes into `claimed` first, so a second tap, a second device or a replay pays nothing.
 *    A challenge finished during the event can still be claimed afterwards (you earned it); nothing new can be progressed after the end.
 *  - The event's own Fuzzy comes from the finale ("finish all the challenges"). Keepsakes (year-keyed cosmetics) come from token
 *    milestones, a challenge or the finale. Both are DERIVED from the saved progress by `evaluateEvents()`, so a missed grant repairs itself.
 *  - No pay-to-win: nothing here is for sale; rewards are small coin/XP amounts and looks.
 *
 * HONEST LIMIT: this is a client-side system like the rest of Fuzzy Crossing's economy. It trusts the device clock (setting the clock into
 * an event's window opens that event), and a save edited by hand can claim rewards. Each occurrence pays once per account at most, rewards
 * are cosmetic or small, and nothing can be bought — so the damage a cheater can do is limited to their own Locker.
 */
import { CHARACTERS, EVENT_NAME, type CharacterDef, type EventId } from './characters';
import { COSMETIC_BY_ID, type CosmeticDef } from './cosmetics';
import { EVENTS, EVENT_IDS, YEAR_SETS, keepsakeId, type EventDef, type Keepsake, type Metric } from './eventData';
import { DAY, dayNumber, dayStart, eventWindowIn, EVENT_ORDER, now as clockNow } from './shopData';
import type { CrossingSave } from './save';
import type { CrossingEvent } from './store';

export { EVENTS, EVENT_IDS, YEAR_SETS };
export type { EventDef, Keepsake };

// ───────────────────────── occurrences (when) ─────────────────────────
export interface Occurrence { id: EventId; year: number; key: string; /** day numbers (inclusive) */ startDay: number; endDay: number; /** local midnight of the first day / after the last day */ start: number; endsAt: number }
export const occKey = (id: EventId, year: number): string => `${id}-${year}`;
const occ = (id: EventId, year: number, w: [number, number]): Occurrence => ({ id, year, key: occKey(id, year), startDay: w[0], endDay: w[1], start: dayStart(w[0]), endsAt: dayStart(w[1] + 1) });

/** the run of `id` that includes this moment, or null */
export function occurrenceAt(id: EventId, ms: number = clockNow()): Occurrence | null {
  const today = dayNumber(ms), y = new Date(ms).getFullYear();
  for (const yy of [y - 1, y]) { const w = eventWindowIn(id, yy); if (w && today >= w[0] && today <= w[1]) return occ(id, yy, w); }
  return null;
}
/** every event that is on right now, soonest to end first */
export function activeOccurrences(ms: number = clockNow()): Occurrence[] {
  return EVENT_ORDER.map((id) => occurrenceAt(id, ms)).filter((o): o is Occurrence => !!o).sort((a, b) => a.endDay - b.endDay);
}
/** the next run of `id` that starts after today (null when we have no dates that far ahead) */
export function nextOccurrence(id: EventId, ms: number = clockNow()): Occurrence | null {
  const today = dayNumber(ms), y = new Date(ms).getFullYear();
  let best: Occurrence | null = null;
  for (let yy = y; yy <= y + 9; yy++) { const w = eventWindowIn(id, yy); if (w && w[0] > today && (!best || w[0] < best.startDay)) best = occ(id, yy, w); }
  return best;
}
/** a particular run by year (null when we have no dates for it) */
export function occurrenceOf(id: EventId, year: number): Occurrence | null { const w = eventWindowIn(id, year); return w ? occ(id, year, w) : null; }
/** upcoming | live | over, for a run seen from a moment */
export function phaseOf(o: Occurrence, ms: number = clockNow()): 'upcoming' | 'live' | 'over' { const d = dayNumber(ms); return d < o.startDay ? 'upcoming' : d > o.endDay ? 'over' : 'live'; }
export function parseKey(key: string): { id: EventId; year: number } | null {
  const m = /^([a-z]+)-(\d{4})$/.exec(key);
  return m && (EVENT_IDS as string[]).includes(m[1]) ? { id: m[1] as EventId, year: Number(m[2]) } : null;
}

// ───────────────────────── challenges (what) ─────────────────────────
export interface Challenge {
  id: string; text: string; icon: string; metric: Metric | 'finale';
  target: number; /** scoreRuns: the score a game needs */ min?: number;
  coins: number; xp: number; tokens: number; finale?: boolean;
}
const ICON: Record<Metric, string> = { items: '🎁', rows: '🛣️', nests: '🪺', pickups: '🪙', gold: '🌟', flawless: '💎', levels: '🏁', runs: '🎮', scoreRuns: '🏆' };
export const eventDef = (id: EventId): EventDef => EVENTS[id];
/** the event's own Fuzzy (the one that unlocks with `season(id)`) */
export const eventFuzzy = (id: EventId): CharacterDef | undefined => CHARACTERS.find((c) => c.unlock.kind === 'season' && c.unlock.event === id);

export function challengesOf(id: EventId): Challenge[] {
  const d = EVENTS[id], th = d.theme;
  const regular: Challenge[] = d.challenges.map((s) => {
    const target = s.metric === 'scoreRuns' ? 1 : Math.max(1, Math.round(s.base * d.scale));
    const text = s.metric === 'items' ? `Collect ${target} ${th.item.plural}`
      : s.metric === 'rows' ? `Cross ${target} lanes`
        : s.metric === 'nests' ? `Fill ${target} nests`
          : s.metric === 'pickups' ? `Collect ${target} Fuzzies`
            : s.metric === 'gold' ? `Collect ${target} golden Fuzzies`
              : s.metric === 'flawless' ? `Clear ${target} ${target === 1 ? 'level' : 'levels'} without losing a life`
                : s.metric === 'levels' ? `Clear ${target} levels`
                  : s.metric === 'runs' ? `Play ${target} games`
                    : `Score ${(s.min ?? 1000).toLocaleString()} in one game`;
    return { id: s.id, text, icon: s.metric === 'items' ? th.item.emoji : ICON[s.metric], metric: s.metric, target, min: s.min, coins: s.coins, xp: s.xp, tokens: s.tokens ?? 0 };
  });
  return [...regular, { id: 'finale', text: `Finish all ${regular.length} ${EVENT_NAME[id]} challenges`, icon: th.icon, metric: 'finale', target: regular.length, coins: d.finale.coins, xp: d.finale.xp, tokens: 0, finale: true }];
}

// ───────────────────────── saved state ─────────────────────────
type Entry = { progress: Record<string, number>; claimed: string[] };
const peek = (s: CrossingSave, key: string): Entry | undefined => s.events[key];
function ensure(s: CrossingSave, key: string): Entry {
  const e = s.events[key];
  if (e && typeof e.progress === 'object' && Array.isArray(e.claimed)) return e;
  // every counter starts at an explicit 0: that way two devices that both play before they sync ADD their progress (merge.ts only adds
  // changes to a number both sides already knew about)
  const p = parseKey(key), progress: Record<string, number> = {};
  if (p) for (const c of challengesOf(p.id)) if (!c.finale) progress[c.id] = 0;
  return (s.events[key] = { progress, claimed: [] });
}
/** event tokens: one or two for every claimed challenge — worked out from the claimed list, so two devices can never disagree about it */
export function tokensOf(s: CrossingSave, key: string): number {
  const p = parseKey(key), e = peek(s, key);
  return p && e ? challengesOf(p.id).filter((c) => e.claimed.includes(c.id)).reduce((a, c) => a + c.tokens, 0) : 0;
}
export const isClaimed = (s: CrossingSave, key: string, chId: string): boolean => !!peek(s, key)?.claimed.includes(chId);
/** current value of a challenge (the finale counts the challenges already claimed) */
export function progressOf(s: CrossingSave, key: string, ch: Challenge, id: EventId): number {
  const e = peek(s, key);
  if (!e) return 0;
  if (ch.finale) return challengesOf(id).filter((c) => !c.finale && e.claimed.includes(c.id)).length;
  return Math.min(ch.target, Math.max(0, Math.floor(e.progress[ch.id] ?? 0)));
}

// ───────────────────────── progress from play ─────────────────────────
/** things the live game tells us that aren't in the save: did the Fuzzy lose a life since the last level was cleared? */
export interface Tracker { died: boolean }
export const newTracker = (): Tracker => ({ died: false });

/** what a game event adds to which metrics (the score-run threshold is checked per challenge) */
function adds(e: CrossingEvent, t: Tracker, ev: EventId): Metric[] {
  switch (e.kind) {
    case 'eventItem': return e.event === ev ? ['items'] : [];
    case 'advance': return ['rows'];
    case 'nest': return ['nests'];
    case 'pickup': return e.gold ? ['pickups', 'gold'] : ['pickups'];
    case 'levelClear': return (e.flawless ?? !t.died) ? ['levels', 'flawless'] : ['levels'];
    case 'run': return ['runs', 'scoreRuns'];
    default: return [];
  }
}
/**
 * Count one game event for every event that is on at `ms`. Pure on the save (no coins or unlocks here). Returns the keys it touched.
 * Progress only ever moves while the event's window is open, and never on a challenge that has been claimed.
 */
export function applyEvent(s: CrossingSave, e: CrossingEvent, ms: number, t: Tracker): string[] {
  if (e.kind === 'start') t.died = false;
  if (e.kind === 'death') t.died = true;
  const touched: string[] = [];
  for (const o of activeOccurrences(ms)) {
    const metrics = adds(e, t, o.id);
    if (!metrics.length) continue;
    const entry = ensure(s, o.key);
    for (const ch of challengesOf(o.id)) {
      if (ch.finale || entry.claimed.includes(ch.id) || !metrics.includes(ch.metric as Metric)) continue;
      if (ch.metric === 'scoreRuns' && !(e.kind === 'run' && e.score >= (ch.min ?? 0))) continue;
      const before = entry.progress[ch.id] ?? 0;
      if (before >= ch.target) continue;
      entry.progress[ch.id] = Math.min(ch.target, before + 1);
      touched.push(o.key);
    }
  }
  if (e.kind === 'levelClear') t.died = false;
  return touched;
}

// ───────────────────────── claiming ─────────────────────────
export interface ClaimResult { coins: number; xp: number; tokens: number; finale: boolean }
export function claimable(s: CrossingSave, key: string): string[] {
  const p = parseKey(key);
  if (!p) return [];
  return challengesOf(p.id).filter((c) => !isClaimed(s, key, c.id) && progressOf(s, key, c, p.id) >= c.target).map((c) => c.id);
}
/** Mark a finished challenge as claimed (its tokens come with it). Pure on the save; the caller pays coins/XP and runs the evaluator. Null when it can't be claimed. */
export function claimInSave(s: CrossingSave, key: string, chId: string): ClaimResult | null {
  const p = parseKey(key);
  if (!p) return null;
  const ch = challengesOf(p.id).find((c) => c.id === chId);
  if (!ch || isClaimed(s, key, chId) || progressOf(s, key, ch, p.id) < ch.target) return null;
  const e = ensure(s, key);
  e.claimed.push(chId);
  return { coins: ch.coins, xp: ch.xp, tokens: ch.tokens, finale: !!ch.finale };
}

// ───────────────────────── what a finished event gives (derived, idempotent) ─────────────────────────
export function setOf(key: string): Keepsake[] { return YEAR_SETS[key] ?? []; }
/** the keepsakes of an occurrence that its saved progress has earned */
export function earnedKeepsakes(s: CrossingSave, key: string): string[] {
  const p = parseKey(key);
  if (!p) return [];
  const tokens = tokensOf(s, key);
  return setOf(key).filter((k) => ('tokens' in k.how ? tokens >= k.how.tokens : 'challenge' in k.how ? isClaimed(s, key, k.how.challenge) : isClaimed(s, key, 'finale'))).map((k) => keepsakeId(p.id, p.year, k.key));
}
/** the event Fuzzies and keepsakes the saved progress has earned but the Locker doesn't have yet (nothing for events with no progress) */
export function missingGrants(s: CrossingSave): { characters: string[]; cosmetics: string[] } {
  const characters: string[] = [], cosmetics: string[] = [];
  for (const key of Object.keys(s.events)) {
    const p = parseKey(key);
    if (!p) continue;
    if (isClaimed(s, key, 'finale')) { const f = eventFuzzy(p.id); if (f && !s.owned.includes(f.id) && !characters.includes(f.id)) characters.push(f.id); }
    for (const id of earnedKeepsakes(s, key)) if (COSMETIC_BY_ID[id] && !s.ownedCosmetics.includes(id)) cosmetics.push(id);
  }
  return { characters, cosmetics };
}

// ───────────────────────── what the screens show ─────────────────────────
export interface ChallengeState { def: Challenge; progress: number; done: boolean; claimed: boolean }
export function challengeStates(s: CrossingSave, id: EventId, year: number): ChallengeState[] {
  const key = occKey(id, year);
  return challengesOf(id).map((def) => { const progress = progressOf(s, key, def, id); return { def, progress, done: progress >= def.target, claimed: isClaimed(s, key, def.id) }; });
}
export interface KeepsakeState { id: string; k: Keepsake; cosmetic: CosmeticDef; owned: boolean; how: string; event: EventId; year: number }
export function howText(k: Keepsake, id: EventId): string {
  return 'tokens' in k.how ? `Collect ${k.how.tokens} event tokens (each finished challenge gives one)` : 'challenge' in k.how ? `Finish: ${challengesOf(id).find((c) => c.id === (k.how as { challenge: string }).challenge)?.text ?? 'a challenge'}` : `Finish all the ${EVENT_NAME[id]} challenges`;
}
export function keepsakeStates(s: CrossingSave, id: EventId, year: number): KeepsakeState[] {
  return setOf(occKey(id, year)).map((k) => { const kid = keepsakeId(id, year, k.key); return { id: kid, k, cosmetic: COSMETIC_BY_ID[kid], owned: s.ownedCosmetics.includes(kid), how: howText(k, id), event: id, year }; }).filter((x) => x.cosmetic);
}
/** every keepsake that exists for any year (for the collection) */
export function allKeepsakes(s: CrossingSave): KeepsakeState[] {
  const out: KeepsakeState[] = [];
  for (const key of Object.keys(YEAR_SETS)) { const p = parseKey(key); if (p) out.push(...keepsakeStates(s, p.id, p.year)); }
  return out;
}

/** Honest words about an event's own Fuzzy at a moment: yours, earnable now, or when it comes back. */
export function fuzzyStatus(s: CrossingSave, id: EventId, ms: number = clockNow()): { state: 'owned' | 'now' | 'later' | 'unknown'; text: string; endsAt?: number; startsAt?: number } {
  const f = eventFuzzy(id), name = EVENT_NAME[id];
  if (!f) return { state: 'unknown', text: `${name} has no Fuzzy of its own yet.` };
  if (s.owned.includes(f.id)) return { state: 'owned', text: `${f.name} is in your Locker — yours forever.` };
  const o = occurrenceAt(id, ms);
  if (o) return { state: 'now', text: `Finish all the ${name} challenges to unlock ${f.name}. Only while the event is on.`, endsAt: o.endsAt };
  const n = nextOccurrence(id, ms);
  return n ? { state: 'later', text: `${f.name} is only earned during ${name}. Available again next ${name}.`, startsAt: n.start } : { state: 'later', text: `${f.name} is only earned during ${name}. It comes back every year — the next dates aren't published yet.` };
}
/** claimable rewards across every event that has progress (for the menu's dot) */
export function claimableCount(s: CrossingSave): number { let n = 0; for (const key of Object.keys(s.events)) n += claimable(s, key).length; return n; }

/** The event items for a game started at `ms`: one per event that is on (the game spawns them now and then). Empty when no event is on. */
export interface EventItem { event: EventId; emoji: string; colors: [string, string] }
export function eventItems(ms: number = clockNow()): EventItem[] {
  return activeOccurrences(ms).map((o) => ({ event: o.id, emoji: EVENTS[o.id].theme.item.emoji, colors: EVENTS[o.id].theme.item.colors }));
}
/** the look for the board's weather layer: the event that ends soonest, or null */
export function atmosphere(ms: number = clockNow()): { id: EventId; tint: string; weather: string; emoji: string } | null {
  const o = activeOccurrences(ms)[0];
  return o ? { id: o.id, tint: EVENTS[o.id].theme.tint, weather: EVENTS[o.id].theme.weather, emoji: EVENTS[o.id].theme.item.emoji } : null;
}
export { DAY };
