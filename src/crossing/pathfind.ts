/**
 * A fast way to PROVE a stretch can be crossed: a depth-first search that tries the promising moves first (hop up, then sideways, then
 * wait) over the same states, the same human model and the same hop rules as the fairness solver's breadth-first `cross()`
 * (`solver.ts` — its `hop()` and `stand()` do all the physics, so what is proven here is exactly what the game plays).
 *
 * A path found by ANY search order is a real, playable path, so finding one is a proof. DFS visits each (tick, row, column-bucket) at most
 * once, so when no path exists it fails after the same amount of work as the breadth-first search; when one exists (almost always) it is
 * found after a small fraction of it. That makes it cheap enough to prove every stretch of an endless road while the game is running.
 */
import { START_COL, START_ROW, type Dir } from './sim';
import { DT, HUMAN, type Solver } from './solver';

const ORDER: Dir[] = ['up', 'left', 'right', 'down'];

export interface Crossed { k: number; hops: number; /** states expanded */ work: number }
/** give up (= "can't prove it") after this many expanded states; a layout that needs more is thrown away */
export const WORK_LIMIT = 15000;

/**
 * Can the human of `s` get from the start row, starting at tick `k0`, to an open nest within `maxSeconds`?
 * (`restFirst` = the player needs a reaction pause before the first hop, as at the start of a life.)
 */
export function crossFast(s: Solver, k0: number, maxSeconds: number, restFirst = true, limit = WORK_LIMIT): Crossed | null {
  let work = 0;
  const H = s.human;
  const maxK = k0 + Math.floor(maxSeconds / DT);
  const seen = new Set<number>();
  const keyOf = (k: number, row: number, x: number) => (k * 16 + row) * 1024 + Math.round((x + 1) * 40);
  let x = START_COL as number, k = k0;
  if (restFirst) for (let i = 0; i < H.rest; i++) { const nx = s.stand(START_ROW, x, k); if (nx === null) return null; x = nx; k++; }
  type Node = { k: number; row: number; x: number; depth: number };
  const stack: Node[] = [{ k, row: START_ROW, x, depth: 0 }];
  seen.add(keyOf(k, START_ROW, x));
  // children are pushed in reverse so the best move is popped first
  while (stack.length) {
    const n = stack.pop()!;
    if (n.k >= maxK) continue;
    if (++work > limit) return null;
    const w = s.stand(n.row, n.x, n.k);
    const kids: Node[] = [];
    for (const dir of ORDER) {
      const h = s.hop(n.row, n.x, n.k, dir);
      if (!h) continue;
      if (H.tolerance) {
        if (w === null) continue;
        if (!s.hop(n.row, w, n.k + 1, dir)) continue; // pressed one tick late must work too
      }
      if (h.nest !== undefined) return { k: h.k, hops: n.depth + 1, work };
      if (h.k > maxK) continue;
      let px = h.x, kr = h.k, ok = true;
      for (let i = 0; i < H.rest; i++) { const nx = s.stand(h.row, px, kr); if (nx === null) { ok = false; break; } px = nx; kr++; }
      if (!ok || kr > maxK) continue;
      const key = keyOf(kr, h.row, px);
      if (seen.has(key)) continue;
      seen.add(key);
      kids.push({ k: kr, row: h.row, x: px, depth: n.depth + 1 });
    }
    // waiting one tick (and then deciding again) comes last
    if (w !== null) {
      const key = keyOf(n.k + 1, n.row, w);
      if (!seen.has(key)) { seen.add(key); kids.push({ k: n.k + 1, row: n.row, x: w, depth: n.depth }); }
    }
    for (let i = kids.length - 1; i >= 0; i--) stack.push(kids[i]);
  }
  return null;
}
export { HUMAN };
