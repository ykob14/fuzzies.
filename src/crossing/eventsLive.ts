/**
 * Seasonal events, the live part: listens to what happens in the game, saves the progress, pays claims and hands out the event Fuzzies
 * and keepsakes. All the rules are in events.ts (pure); this file only connects them to the store. Call initEvents() once (init.ts does).
 */
import * as store from './store';
import { applyEvent, claimInSave, missingGrants, newTracker, activeOccurrences, type ClaimResult } from './events';
import { now } from './shopData';

const tracker = newTracker();
let started = false;

/** grant every event Fuzzy / keepsake the saved progress has earned (idempotent — also repairs a grant that was interrupted) */
export function evaluateEvents(): void {
  if (!store.save()) return;
  const g = missingGrants(store.save());
  for (const id of g.characters) store.grantCharacter(id, 'event');
  for (const id of g.cosmetics) store.grantCosmetic(id, 'event');
}

export function initEvents(): void {
  if (started) return;
  started = true;
  store.onReport((e) => {
    const t = now();
    if (!activeOccurrences(t).length) { tracker.died = e.kind === 'death' ? true : e.kind === 'start' || e.kind === 'levelClear' ? false : tracker.died; return; }
    // the save object is the live one, so count in place and only write when a challenge moved
    const touched = applyEvent(store.save(), e, t, tracker);
    if (touched.length) store.mutate(() => {}, 'events', { keys: touched });
  });
  store.addEvaluator(evaluateEvents);
  evaluateEvents();
}

/** Claim a finished challenge: pays its coins + Pass XP once, adds its tokens, and the evaluator hands out whatever that earned. */
export function claimChallenge(key: string, chId: string): ClaimResult | null {
  let r: ClaimResult | null = null;
  store.mutate((c) => { r = claimInSave(c, key, chId); }, 'events', { key, chId });
  if (!r) return null;
  const got = r as ClaimResult;
  if (got.coins) store.addCoins(got.coins);
  if (got.xp) store.addXp(got.xp);
  evaluateEvents();
  return got;
}
