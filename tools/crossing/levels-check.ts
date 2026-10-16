// Fairness + design checks for the 150 world levels. Run: bash tools/crossing/run.sh levels-check.ts [world] [--fix] [--routes]
import { writeFileSync, mkdirSync } from 'node:fs';
import { getLevel, layoutOf, milestoneOf, setVariant, TOKENS } from '../../src/crossing/levels';
import { MIN_WARN, hazardAt, rowOf, COLS, START_ROW, type LevelDef } from '../../src/crossing/sim';
import { WORLDS, LEVELS_PER_WORLD, worldOpen, levelOpen, clearedIn } from '../../src/crossing/worlds';
import { DT, HUMAN, ROBOT, Solver, planLevel } from './solver';

const args = process.argv.slice(2);
const only = args.find((a) => /^\d+$/.test(a)) ? Number(args.find((a) => /^\d+$/.test(a))) : 0;
const FIX = args.includes('--fix');
const ROUTES = args.includes('--routes');
const OFFSETS = args.includes('--quick') ? [2, 13, 29] : [1.5, 4.5, 7.5, 10.5, 13.5, 16.5, 19.5, 22.5, 25.5, 28.5, 31.5, 34.5, 37.5, 40.5, 43.5, 46.5];

let pass = 0, fail = 0;
const ok = (c: unknown, m: string) => { if (c) pass++; else { fail++; console.log('  ✗', m); } };

function telegraphs(d: LevelDef): string[] {
  const bad: string[] = [];
  for (const L of d.rows) {
    if (L.train && L.train.warn < MIN_WARN) bad.push(`row ${L.row} train warn ${L.train.warn}`);
    if (L.strikes && L.strikes.warn < MIN_WARN) bad.push(`row ${L.row} lightning warn`);
    if (L.strikes && L.strikes.phase < L.strikes.warn) bad.push(`row ${L.row} first strike untelegraphed`);
    if (L.lasers && L.lasers.warn < MIN_WARN) bad.push(`row ${L.row} laser warn`);
    if (L.flood && L.flood.warn < MIN_WARN) bad.push(`row ${L.row} flood warn`);
    if (L.ghost && L.ghost.fade < MIN_WARN) bad.push(`row ${L.row} ghost fade`);
    if (L.sink && L.sink.warn < MIN_WARN) bad.push(`row ${L.row} sink warn`);
    if (L.signal && L.signal.ramp + 1 < MIN_WARN) bad.push(`row ${L.row} signal amber`);
  }
  return bad;
}
/** share of the board that is deadly (rows × columns × time), 0..1 */
function danger(d: LevelDef): number {
  let bad = 0, all = 0;
  for (const L of d.rows) for (let t = 0; t < 30; t += 0.25) for (let x = 0; x < COLS; x += 0.5) {
    all++;
    if (L.surface === 'river') { /* riders: deadly where there is no rider */ const s = new Solver(d, ROBOT); if (s.stand(L.row, x, Math.round(t / DT)) === null) bad++; }
    else if (hazardAt(L, x, t) !== null) bad++;
  }
  return bad / all;
}
const spearman = (a: number[], b: number[]) => {
  const rank = (v: number[]) => { const idx = v.map((x, i) => [x, i]).sort((p, q) => p[0] - q[0]); const r = Array(v.length); idx.forEach(([, i], j) => (r[i] = j)); return r as number[]; };
  const ra = rank(a), rb = rank(b), n = a.length;
  let s = 0; for (let i = 0; i < n; i++) s += (ra[i] - rb[i]) ** 2;
  return 1 - (6 * s) / (n * (n * n - 1));
};

const routes: Record<string, unknown> = {};
const worldScore: number[] = [];
const t0 = Date.now();
for (const W of WORLDS) {
  if (only && W.n !== only) continue;
  const scores: number[] = [];
  const layouts = new Set<string>();
  const hashes = new Set<string>();
  console.log(`\nWorld ${W.n} · ${W.name}`);
  for (let l = 1; l <= LEVELS_PER_WORLD; l++) {
    let d = getLevel(W.n, l);
    let plan = planLevel(d);
    let variant = 0;
    const robust = (def: LevelDef) => {
      const times: number[] = []; let lost = 0;
      for (const o of OFFSETS) { const s = new Solver(def); const f = s.cross(Math.round(o / DT), def.timer * 0.75); if (f) times.push((f.k - Math.round(o / DT)) * DT); else lost++; }
      return { times, lost };
    };
    let rb = plan.ok ? robust(d) : { times: [], lost: OFFSETS.length };
    const fits = () => plan.ok && rb.lost === 0 && (!d.goal.timeLimit || plan.totalK * DT <= d.goal.timeLimit * 0.8);
    while (FIX && !fits() && variant < 30) { variant++; setVariant(W.n, l, variant); d = getLevel(W.n, l); plan = planLevel(d); rb = plan.ok ? robust(d) : { times: [], lost: OFFSETS.length }; }
    const tag = `${W.n}-${l}`;
    ok(plan.ok, `${tag} ${d.name}: solvable (${plan.reason ?? ''})`);
    ok(rb.lost === 0, `${tag}: crossable from every start time (${rb.lost}/${OFFSETS.length} lives would be stuck)`);
    if (d.goal.timeLimit) ok(plan.totalK * DT <= d.goal.timeLimit * 0.8, `${tag}: time attack fits (${(plan.totalK * DT).toFixed(1)} s of ${d.goal.timeLimit})`);
    const tg = telegraphs(d);
    ok(!tg.length, `${tag}: telegraphed ≥ ${MIN_WARN}s (${tg.join(', ')})`);
    ok(layoutOf(W.n, l).split(/\s+/).every((t) => TOKENS.includes(t)), `${tag}: tokens`);
    ok(!layouts.has(layoutOf(W.n, l)), `${tag}: layout unique in world`);
    layouts.add(layoutOf(W.n, l));
    const h = JSON.stringify(d.rows.map((r) => [r.surface, r.speed.toFixed(2), r.objs.length, r.token]));
    ok(!hashes.has(h), `${tag}: rows unique`); hashes.add(h);
    ok((milestoneOf(W.n, l) !== undefined) === [5, 10, 15].includes(l), `${tag}: milestone placement`);
    ok(d.nests.length === d.goal.nests && d.nests.every((c) => [1, 3, 5, 7, 9].includes(c)), `${tag}: nests`);
    ok(d.timer >= 25 && d.timer <= 70 && d.lives >= 1 && d.lives <= 3, `${tag}: timer/lives sensible`);
    if (d.goal.coins) ok(d.coins.length >= d.goal.coins + 2, `${tag}: enough coins`);
    // the robot's best time and whether hopping straight up ever works
    const robot = new Solver(d, ROBOT).cross(0, d.timer, false);
    // slack: the slowest reaction pause (seconds) a player can have and still get across from several start times
    const PAUSES = [6, 9, 12, 16, 21, 28, 36];
    let slack = 0;
    for (const R of PAUSES) {
      const hum = { ...HUMAN, rest: R };
      if ([0, 9, 19].every((o) => new Solver(d, hum).cross(Math.round(o / DT), d.timer * 0.75) !== null)) slack = R * DT; else break;
    }
    const meanCross = rb.times.length ? rb.times.reduce((a, b) => a + b, 0) / rb.times.length : 99;
    const dz = danger(d);
    const score = (10 / Math.max(0.2, slack)) * (1 + dz) * (d.lives === 1 ? 1.15 : 1) * (d.goal.timeLimit ? 1.1 : 1);
    scores.push(score);
    const hopsPerCross = plan.hops.length / Math.max(1, d.nests.length);
    ok(hopsPerCross >= (d.teleports.length ? 8 : 12), `${tag}: not trivial (${hopsPerCross.toFixed(1)} hops per crossing)`);
    console.log(`  ${String(l).padStart(2)} ${d.name.padEnd(22)} ${plan.ok ? '✓' : '✗'} v${variant} total ${(plan.totalK * DT).toFixed(1).padStart(5)}s  human ${meanCross.toFixed(1).padStart(4)}s (${Math.min(...rb.times).toFixed(1)}–${Math.max(...rb.times).toFixed(1)})  robot ${robot ? ((robot.k) * DT).toFixed(1) : '-'}s  danger ${(dz * 100).toFixed(0).padStart(2)}%  slack ${slack.toFixed(2)}s  score ${score.toFixed(1)}  ${d.milestone ?? ''}`);
    if (ROUTES && plan.ok) routes[tag] = { hops: plan.hops, marks: plan.marks, dt: DT };
  }
  const rho = spearman(scores.map((_, i) => i), scores);
  ok(rho >= 0.5, `world ${W.n}: difficulty rises through the world (Spearman ${rho.toFixed(2)})`);
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  console.log(`  difficulty trend ρ = ${rho.toFixed(2)}, mean score ${avg.toFixed(1)}`);
  worldScore.push(avg);
}
if (!only) {
  for (let i = 1; i < worldScore.length; i++) ok(worldScore[i] >= worldScore[i - 1] * 0.85, `world ${i + 1} not easier than world ${i} (${worldScore[i].toFixed(1)} vs ${worldScore[i - 1].toFixed(1)})`);
  // unlock chain
  const m: Record<string, number> = {};
  ok(worldOpen(m, 1) && !worldOpen(m, 2) && levelOpen(m, 1, 1) && !levelOpen(m, 1, 2), 'unlocks: start');
  for (let l = 1; l <= 9; l++) m[`1-${l}`] = 1;
  ok(!worldOpen(m, 2) && clearedIn(m, 1) === 9, 'unlocks: 9 cleared keeps world 2 shut');
  m['1-10'] = 2;
  ok(worldOpen(m, 2) && levelOpen(m, 2, 1) && !levelOpen(m, 2, 2) && !worldOpen(m, 3), 'unlocks: 10 cleared opens world 2 only');
  ok(levelOpen(m, 1, 11) && !levelOpen(m, 1, 12), 'unlocks: levels open one by one');
}
if (ROUTES) { mkdirSync('tools/crossing/.out', { recursive: true }); const f = `tools/crossing/.out/routes${only ? '-' + only : ''}.json`; writeFileSync(f, JSON.stringify(routes)); console.log('routes →', f); }
console.log(`\n${pass} passed, ${fail} failed  (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
void START_ROW; void rowOf;
process.exit(fail ? 1 : 0);
