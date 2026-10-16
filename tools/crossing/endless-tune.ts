import { planStretch, buildStretch, OFFSETS, CROSS_LIMIT, TUNE } from '../../src/crossing/endless';
import { Solver, DT } from '../../src/crossing/solver';
import { crossFast } from '../../src/crossing/pathfind';
const configs = [{ pMax: 0.8, safeLate: 2 }, { pMax: 0.8, safeLate: 3 }, { pMax: 0.65, safeLate: 2 }, { pMax: 0.65, safeLate: 3 }];
for (const c of configs) {
  Object.assign(TUNE, c);
  let tot = 0, ok = 0, ms = 0, maxMs = 0;
  for (let n = 30; n < 46; n++) for (let sd = 0; sd < 3; sd++) {
    const seed = 777 + sd * 1013;
    const def = buildStretch(seed, planStretch(seed, n, 0));
    const t = Date.now(); let good = true;
    for (const o of OFFSETS) { if (!crossFast(new Solver(def), Math.round(o / DT), CROSS_LIMIT)) { good = false; break; } }
    const d = Date.now() - t; ms += d; maxMs = Math.max(maxMs, d);
    tot++; if (good) ok++;
  }
  console.log(`${JSON.stringify(c)}: variant-0 accepted ${ok}/${tot} (${Math.round(100 * ok / tot)}%), avg ${Math.round(ms / tot)} ms, max ${maxMs} ms`);
}
