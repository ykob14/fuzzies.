/**
 * Fuzzies Parking Escape — the level GENERATOR (no DOM; tools/parking/generate.ts builds the 500 levels with it, the endless mode uses it live). A "setup" is a set of
 * vehicles + walls; explore() maps every state those vehicles can reach and how far each is from the exit, and a hill-climb
 * keeps changing the setup while its hardest state gets harder. The puzzle we keep is a real state of that graph, so its
 * optimal move count is exact and it is solvable by construction (checked again by tools/parking/check.ts).
 */
import { explore, decode, board, OUT, type Puzzle, type Vehicle } from './engine';

export interface Spec { w: number; h: number; cars: [number, number]; trucks: number; walls: number; double: boolean; cap?: number }
export interface Piece { len: number; dir: 'h' | 'v'; line: number; pos: number; exit: 0 | 1 | -1 }
export interface Setup { pieces: Piece[]; walls: number[] }

export function rng(seed: number): () => number { let t = seed >>> 0; return () => { t += 0x6d2b79f5; let r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; }
const LETTERS = 'CDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

export function toPuzzle(spec: Spec, su: Setup): Puzzle {
  const walls = new Uint8Array(spec.w * spec.h); for (const k of su.walls) walls[k] = 1;
  let n = 0;
  const cars: Vehicle[] = su.pieces.map((pc, i) => ({ i, letter: pc.exit ? (i === 0 ? 'A' : 'B') : LETTERS[n++], len: pc.len, dir: pc.dir, line: pc.line, exit: pc.exit }));
  return { w: spec.w, h: spec.h, walls, cars, start: Uint8Array.from(su.pieces.map((pc) => pc.pos)) };
}
function occupied(spec: Spec, su: Setup, skip = -1): Uint8Array {
  const o = new Uint8Array(spec.w * spec.h); for (const k of su.walls) o[k] = 1;
  su.pieces.forEach((pc, i) => { if (i === skip) return; for (let j = 0; j < pc.len; j++) o[pc.dir === 'h' ? pc.line * spec.w + pc.pos + j : (pc.pos + j) * spec.w + pc.line] = 1; });
  return o;
}
const fits = (spec: Spec, o: Uint8Array, pc: Piece) => { for (let j = 0; j < pc.len; j++) { const r = pc.dir === 'h' ? pc.line : pc.pos + j, c = pc.dir === 'h' ? pc.pos + j : pc.line; if (r < 0 || c < 0 || r >= spec.h || c >= spec.w || o[r * spec.w + c]) return false; } return true; };
/** the target lines: A's row (and B's column) — kept free of walls so an exit can never be walled in */
const targetRow = (spec: Spec) => Math.floor((spec.h - 1) / 2);

function randomPiece(spec: Spec, r: () => number, o: Uint8Array, truckBias: number): Piece | null {
  for (let t = 0; t < 60; t++) {
    const len = r() < truckBias ? 3 : 2, dir = r() < 0.5 ? 'h' : 'v';
    const line = Math.floor(r() * (dir === 'h' ? spec.h : spec.w));
    const pos = Math.floor(r() * ((dir === 'h' ? spec.w : spec.h) - len + 1));
    const pc: Piece = { len, dir, line, pos, exit: 0 };
    if (dir === 'h' && line === targetRow(spec)) continue; // nothing else lies along the target's own row (it could never pass)
    if (fits(spec, o, pc)) return pc;
  }
  return null;
}

export function randomSetup(spec: Spec, r: () => number): Setup {
  const tr = targetRow(spec);
  const su: Setup = { pieces: [{ len: 2, dir: 'h', line: tr, pos: Math.floor(r() * (spec.w - 3)), exit: 1 }], walls: [] };
  if (spec.double) {
    const col = 1 + Math.floor(r() * (spec.w - 2));
    for (let t = 0; t < 20; t++) { const pc: Piece = { len: 2, dir: 'v', line: col, pos: Math.floor(r() * (spec.h - 3)), exit: 1 }; if (fits(spec, occupied(spec, su), pc)) { su.pieces.push(pc); break; } }
  }
  const bcol = spec.double && su.pieces[1] ? su.pieces[1].line : -1;
  for (let t = 0; su.walls.length < spec.walls && t < 100; t++) {
    const k = Math.floor(r() * spec.w * spec.h), row = Math.floor(k / spec.w), col = k % spec.w;
    if (row === tr || col === bcol || occupied(spec, su)[k]) continue;
    su.walls.push(k);
  }
  const n = spec.cars[0] + Math.floor(r() * (spec.cars[1] - spec.cars[0] + 1));
  const truckBias = spec.trucks;
  for (let t = 0; su.pieces.length < n && t < 400; t++) { const pc = randomPiece(spec, r, occupied(spec, su), truckBias); if (pc) su.pieces.push(pc); }
  return su;
}

export function mutate(spec: Spec, su: Setup, r: () => number): Setup {
  const out: Setup = { pieces: su.pieces.map((p) => ({ ...p })), walls: [...su.walls] };
  const firstFree = out.pieces.filter((p) => p.exit).length;
  const kind = r();
  const others = out.pieces.length - firstFree;
  if (kind < 0.35 && others > 0) { // nudge one vehicle: a step along or across its line
    const i = firstFree + Math.floor(r() * others); const o = occupied(spec, out, i); const pc = { ...out.pieces[i] };
    if (r() < 0.5) pc.pos += r() < 0.5 ? -1 : 1; else pc.line += r() < 0.5 ? -1 : 1;
    if (!(pc.dir === 'h' && pc.line === targetRow(spec)) && fits(spec, o, pc)) out.pieces[i] = pc;
  } else if (kind < 0.55 && others > 0) { // move one vehicle somewhere else
    const i = firstFree + Math.floor(r() * others); const o = occupied(spec, out, i); const pc = randomPiece(spec, r, o, spec.trucks); if (pc) out.pieces[i] = pc;
  } else if (kind < 0.6 && others > spec.cars[0]) { out.pieces.splice(firstFree + Math.floor(r() * others), 1); }
  else if (kind < 0.8 && out.pieces.length < spec.cars[1]) { const pc = randomPiece(spec, r, occupied(spec, out), spec.trucks); if (pc) out.pieces.push(pc); }
  else if (kind < 0.9 && out.walls.length) { // move a wall
    const tr = targetRow(spec), bcol = spec.double ? out.pieces[1]?.line ?? -1 : -1;
    const wi = Math.floor(r() * out.walls.length); const o = occupied(spec, out);
    for (let t = 0; t < 30; t++) { const k = Math.floor(r() * spec.w * spec.h); if (Math.floor(k / spec.w) === tr || k % spec.w === bcol || o[k]) continue; out.walls[wi] = k; break; }
  } else { // slide a target to another start
    const o = occupied(spec, out, 0); const pc = { ...out.pieces[0], pos: Math.floor(r() * (spec.w - 1)) }; if (fits(spec, o, pc)) out.pieces[0] = pc;
  }
  return out;
}

export interface Found { board: string; opt: number; states: number; setup: Setup; maxDist: number }
/** the hardest state of this setup's graph (or the state closest to `want` moves when it can go harder) */
export function evaluate(spec: Spec, su: Setup, want?: number): Found | null {
  const p = toPuzzle(spec, su);
  const g = explore(p, p.start, spec.cap ?? 150_000);
  if (!g) return null;
  let best = -1, bd = -1;
  for (let a = 0; a < g.codes.length; a++) if (g.present[a] && g.dist[a] > bd) { bd = g.dist[a]; best = a; }
  if (best < 0 || bd < 1) return null;
  let pick = best, pd = bd;
  if (want !== undefined && bd > want) {
    // a state exactly `want` moves from the goal (several may exist: take the one with the most vehicles in the way)
    const cands: number[] = [];
    for (let a = 0; a < g.codes.length; a++) if (g.present[a] && g.dist[a] === want) cands.push(a);
    if (cands.length) { pick = cands[Math.floor(cands.length / 2)]; pd = want; }
  }
  const st = decode(g.codes[pick], p.cars.length);
  if ([...st].some((v) => v === OUT)) return null;
  return { board: board(p, st), opt: pd, states: g.codes.length, setup: su, maxDist: bd };
}

/** hill-climb a setup until its hardest state needs between lo and hi moves */
export function climb(spec: Spec, lo: number, hi: number, r: () => number, steps = 400): Found | null {
  let su = randomSetup(spec, r); let cur = evaluate(spec, su);
  for (let t = 0; t < 8 && !cur; t++) { su = randomSetup(spec, r); cur = evaluate(spec, su); }
  if (!cur) return null;
  let best = cur;
  for (let k = 0; k < steps && best.maxDist < lo; k++) {
    // annealing: mostly uphill, now and then a step down so the search doesn't get stuck on a small hill
    const n = mutate(spec, cur.setup, r); const e = evaluate(spec, n);
    if (e && (e.maxDist >= cur.maxDist || r() < Math.exp((e.maxDist - cur.maxDist) / Math.max(0.3, 2 * (1 - k / steps))))) cur = e;
    if (cur.maxDist > best.maxDist) best = cur;
  }
  cur = best;
  if (cur.maxDist < lo) return null;
  if (cur.maxDist > hi) { const want = lo + Math.floor(r() * (hi - lo + 1)); return evaluate(spec, cur.setup, want); }
  return cur;
}

/**
 * Endless mode, live: short hill-climbs for up to `budgetMs`, keeping the hardest lot found; returns a puzzle `want` moves from the
 * exit when one that hard turns up, otherwise the hardest one (null if nothing reached `min` moves — the caller uses the pool).
 */
export function liveLevel(spec: Spec, want: number, min: number, r: () => number, budgetMs = 1500): Found | null {
  const t0 = Date.now(); let best: Found | null = null;
  while (Date.now() - t0 < budgetMs) {
    let su = randomSetup(spec, r); let cur = evaluate(spec, su);
    if (!cur) continue;
    for (let k = 0; k < 40 && Date.now() - t0 < budgetMs && cur.maxDist < want; k++) {
      const n = mutate(spec, cur.setup, r); const e = evaluate(spec, n);
      if (e && e.maxDist >= cur.maxDist) { cur = e; su = n; }
    }
    if (!best || cur.maxDist > best.maxDist) best = cur;
    if (best.maxDist >= want) break;
  }
  if (!best || best.maxDist < min) return null;
  return best.maxDist > want ? evaluate(spec, best.setup, want) ?? best : best;
}
