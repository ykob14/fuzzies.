/** Endless Crossing: proves the next stretches of the road in the background so playing never waits for the solver. */
import { stretch } from './endless';

interface Ask { id: number; seed: number; n: number }
const ctx = self as unknown as { onmessage: ((e: MessageEvent<Ask>) => void) | null; postMessage(m: unknown): void };
ctx.onmessage = (e) => {
  const { id, seed, n } = e.data;
  try { ctx.postMessage({ id, ok: true, stretch: stretch(seed, n) }); } catch (err) { ctx.postMessage({ id, ok: false, error: String(err) }); }
};
