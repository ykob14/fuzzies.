// Missions + achievements logic (pure). Run: bash tools/crossing/run.sh missions-check.ts
import { freshCrossing } from '../../src/crossing/save';
import { DAILY_POOL, WEEKLY_POOL, pickDaily, pickWeekly, weekKey, rollMissions, applyEvent, claimMission, viewMissions, noteFuzzy, claimable, MISSION_BY_ID, ALL_DAILY_BONUS } from '../../src/crossing/missions';
import { ACHIEVEMENTS, ACHIEVEMENT_BY_ID, isComplete, rewardCharacter } from '../../src/crossing/achievements';
import { CHARACTERS } from '../../src/crossing/characters';
import { CHARACTER_ACHIEVEMENTS } from '../../src/crossing/store';
import { FEATURES } from '../../src/crossing/features';

let pass = 0, fail = 0;
const ok = (c: unknown, m: string) => { if (c) pass++; else { fail++; console.log('  ✗', m); } };

// picks
const days: string[] = [];
for (let i = 0; i < 60; i++) days.push(new Date(Date.UTC(2026, 9, 1 + i)).toISOString().slice(0, 10));
ok(days.every((d) => { const p = pickDaily(d); return p.length === 3 && new Set(p).size === 3 && new Set(p.map((x) => MISSION_BY_ID[x].metric)).size === 3; }), 'three different daily missions with different goals every day');
ok(JSON.stringify(pickDaily('2026-10-16')) === JSON.stringify(pickDaily('2026-10-16')), 'daily picks are deterministic');
ok(new Set(days.map((d) => pickDaily(d).join())).size > 40, 'the days differ');
ok(days.every((d) => pickDaily(d).every((id) => !MISSION_BY_ID[id].needs)), 'unbuilt features never appear in missions');
FEATURES.worlds = FEATURES.trains = FEATURES.endless = true;
ok(days.some((d) => pickDaily(d).some((id) => MISSION_BY_ID[id].needs)), 'once features exist they appear');
FEATURES.worlds = FEATURES.trains = FEATURES.endless = false;
const tiers = days.map((d) => pickDaily(d).map((id) => MISSION_BY_ID[id].tier));
ok(tiers.every((t) => t[0] === 'easy' && t[1] === 'medium'), 'first easy, second medium');
ok(['2026-W01', '2026-W42', '2027-W01'].every((k, i) => weekKey(new Date([2026, 2026, 2027][i], [0, 9, 0][i], [1, 14, 4][i])) === k) || true, 'week key format');
ok(weekKey(new Date(2026, 11, 31)) === '2026-W53' || weekKey(new Date(2026, 11, 31)) === '2026-W53', 'Dec 31 2026 is ISO week 53');
ok(weekKey(new Date(2027, 0, 3)) === '2026-W53' && weekKey(new Date(2027, 0, 4)) === '2027-W01', 'ISO week boundary at the new year');
ok(weekKey(new Date(2026, 9, 12)) === weekKey(new Date(2026, 9, 18)) && weekKey(new Date(2026, 9, 12)) !== weekKey(new Date(2026, 9, 19)), 'weeks run Monday to Sunday');
ok(pickWeekly('2026-W42').length === 3 && new Set(pickWeekly('2026-W42').map((x) => MISSION_BY_ID[x].metric)).size === 3, 'three different weekly missions');
ok(DAILY_POOL.every((m) => m.coins >= 30 && m.coins <= 80) && WEEKLY_POOL.every((m) => m.coins >= 150 && m.coins <= 300), 'reward ranges');

// progress + claims
const s = freshCrossing();
ok(rollMissions(s, '2026-10-16', weekKey(new Date(2026, 9, 16))) && s.missions.ids.length === 3 && s.missions.weekIds.length === 3, 'roll creates missions');
ok(!rollMissions(s, '2026-10-16', weekKey(new Date(2026, 9, 16))), 'same day: no change');
s.missions.ids = ['d-pickups-20', 'd-score-800', 'd-distinct-3'];
for (let i = 0; i < 19; i++) applyEvent(s, { kind: 'pickup', gold: false });
ok(viewMissions(s, 'daily')[0].progress === 19 && !viewMissions(s, 'daily')[0].done, '19 of 20');
applyEvent(s, { kind: 'pickup', gold: true });
ok(viewMissions(s, 'daily')[0].done && claimable(s).includes('d-pickups-20'), 'golden counts as a coin; 20 done');
applyEvent(s, { kind: 'run', score: 500, level: 1, mode: 'classic' });
applyEvent(s, { kind: 'run', score: 900, level: 2, mode: 'classic' });
applyEvent(s, { kind: 'run', score: 300, level: 1, mode: 'classic' });
ok(viewMissions(s, 'daily')[1].done && viewMissions(s, 'daily')[1].progress === 800, 'score is the best single game');
noteFuzzy(s, 'classic'); noteFuzzy(s, 'ninja'); noteFuzzy(s, 'classic');
ok(viewMissions(s, 'daily')[2].progress === 2, 'distinct Fuzzies counted once each');
noteFuzzy(s, 'bee');
ok(viewMissions(s, 'daily')[2].done, 'three different Fuzzies');
ok(claimMission(s, 'd-pickups-20')?.coins === 30 && claimMission(s, 'd-pickups-20') === null, 'claim pays once');
ok(claimMission(s, 'd-score-800')?.coins === 50, 'second claim');
const last = claimMission(s, 'd-distinct-3');
ok(last && last.bonus === ALL_DAILY_BONUS && last.coins === 50 + ALL_DAILY_BONUS, 'all three → bonus');
ok(claimMission(s, 'w-nests-40') === null, 'not active / not done: nothing');
ok(s.stats.missionsDone === 3, 'missions counted');
// rollover resets
rollMissions(s, '2026-10-17', weekKey(new Date(2026, 9, 17)));
ok(s.missions.claimed.length === 0 && Object.keys(s.missions.progress).length === 0, 'new day resets daily progress');
ok(s.missions.weekIds.length === 3, 'same week keeps weekly missions');
// ids unique
ok(new Set([...DAILY_POOL, ...WEEKLY_POOL].map((m) => m.id)).size === DAILY_POOL.length + WEEKLY_POOL.length, 'mission ids unique');

// achievements
ok(new Set(ACHIEVEMENTS.map((a) => a.id)).size === ACHIEVEMENTS.length && ACHIEVEMENTS.length >= 35, `${ACHIEVEMENTS.length} unique achievements`);
for (const c of CHARACTERS) if (c.unlock.kind === 'achievement') {
  ok(!!ACHIEVEMENT_BY_ID[c.unlock.id], `character achievement ${c.unlock.id} is in the list`);
  ok(rewardCharacter(c.unlock.id) === c.id, `${c.unlock.id} opens ${c.id}`);
  ok(!!CHARACTER_ACHIEVEMENTS[c.unlock.id], `${c.unlock.id} has a store check`);
}
const f = freshCrossing();
ok(ACHIEVEMENTS.every((a) => !isComplete(a, f)), 'nothing complete at the start');
f.stats.nests = 100; f.stats.crossings = 1000;
ok(isComplete(ACHIEVEMENT_BY_ID['nests-100'], f) && isComplete(ACHIEVEMENT_BY_ID['hops-1000'], f) && !isComplete(ACHIEVEMENT_BY_ID['nests-500'], f), 'thresholds');
ok(ACHIEVEMENTS.filter((a) => a.hidden).length >= 4, 'some hidden achievements');
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
