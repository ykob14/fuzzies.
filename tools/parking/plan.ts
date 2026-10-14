/**
 * Fuzzies Parking Escape — THE LEVEL PLAN: what each of the 500 levels should be (board size, vehicles, walls, type, how many
 * optimal moves). The generator (generate.ts) builds a puzzle to fit each line; the difficulty is the optimal solution length the
 * solver proves, not the number of vehicles.
 *   1–20 beginner (1→7 moves) · 21–75 more vehicles (6→12) · 76–150 intermediate (11→18) · 151–250 complex (16→25, some 7×7)
 *   251–350 advanced with bollards (22→32) · 351–450 expert (29→38) · 451–500 master (36→46)
 * Types: timed every 15 from 30, limited moves every 15 from 40, double escape every 20 from 60, a special challenge at x13 of
 * every 25 and a milestone at every 25th (both a little harder than their neighbours). Everything else has no timer.
 */
import type { Spec } from './.lib/generator.ts';
import { typeOf, type LType } from './.lib/progress.ts';
export { typeOf };

export interface PlanLine { i: number; spec: Spec; lo: number; hi: number; type: LType }
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const BANDS: [from: number, to: number, opt0: number, opt1: number][] = [[1, 20, 1, 7], [21, 75, 6, 12], [76, 150, 11, 18], [151, 250, 16, 25], [251, 350, 22, 32], [351, 450, 29, 38], [451, 500, 36, 46]];

export function plan(i: number): PlanLine {
  const band = BANDS.find(([a, b]) => i >= a && i <= b)!;
  const t = (i - band[0]) / Math.max(1, band[1] - band[0]);
  const type = typeOf(i);
  let opt = Math.round(lerp(band[2], band[3], t));
  if (type === 's') opt += i % 25 === 0 ? 4 : 3;
  const big = i >= 151 && i % 3 === 0;
  const walls = i < 251 ? 0 : big ? 1 + (i % 3) : i % 2 ? 1 : 2;
  const carsLo = i <= 20 ? 1 + Math.floor(i / 6) : i <= 75 ? 5 : i <= 150 ? 7 : i <= 250 ? 9 : 10;
  const carsHi = i <= 20 ? 3 + Math.floor(i / 4) : i <= 75 ? 9 : i <= 150 ? 11 : i <= 250 ? 13 : 14;
  const spec: Spec = big
    ? { w: 7, h: 7, cars: [carsLo + 3, carsHi + 3], trucks: 0.35, walls, double: type === 'd', cap: 120_000 }
    : { w: 6, h: 6, cars: [carsLo, carsHi], trucks: i <= 10 ? 0.15 : 0.3, walls, double: type === 'd', cap: 150_000 };
  opt = Math.min(opt, 45); // master puzzles past ~47 moves are vanishingly rare on these lots
  const slack = i <= 20 ? 0 : opt < 15 ? 1 : 2;
  return { i, spec, lo: Math.max(1, opt - slack), hi: opt + slack, type };
}
/** the endless pool (after level 500): expert and master puzzles, played in a shuffled order with turns and mirrors */
export function endlessPlan(k: number): PlanLine {
  const big = k % 3 === 0, opt = 24 + (k % 12);
  const spec: Spec = big ? { w: 7, h: 7, cars: [13, 17], trucks: 0.35, walls: k % 2, double: false, cap: 120_000 } : { w: 6, h: 6, cars: [10, 14], trucks: 0.3, walls: k % 4 === 1 ? 1 : 0, double: false, cap: 150_000 };
  return { i: 10_000 + k, spec, lo: opt - 2, hi: opt + 3, type: 'n' };
}
