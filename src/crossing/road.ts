/**
 * The endless road as the game sees it: `road.get(n)` gives the proven stretch n of a run, `road.ahead(n)` starts proving the next ones.
 * The solver runs in a Web Worker (a stretch takes the solver anywhere from a few milliseconds to a couple of seconds, far too long for
 * a phone's main thread while someone is hopping); if workers aren't available it falls back to the main thread, one stretch at a time
 * between frames.
 */
import { stretch as proveHere, type Stretch } from './endless';

export class Road {
  private memo = new Map<number, Promise<Stretch>>();
  private waiting = new Map<number, { res: (s: Stretch) => void; rej: (e: Error) => void; n: number }>();
  private worker: Worker | null = null;
  private uid = 1;
  private dead = false;
  constructor(readonly seed: number) {
    try { this.worker = new Worker(new URL('./endlessWorker.ts', import.meta.url), { type: 'module' }); } catch { this.worker = null; }
    if (this.worker) {
      this.worker.onmessage = (e: MessageEvent<{ id: number; ok: boolean; stretch?: Stretch; error?: string }>) => {
        const w = this.waiting.get(e.data.id);
        if (!w) return;
        this.waiting.delete(e.data.id);
        if (e.data.ok && e.data.stretch) w.res(e.data.stretch); else w.rej(new Error(e.data.error ?? 'road'));
      };
      // a worker that dies (blocked, out of memory…) hands its work to the main thread
      this.worker.onerror = () => this.fallBack();
    }
  }
  private fallBack(): void {
    this.worker?.terminate();
    this.worker = null;
    const todo = [...this.waiting.values()];
    this.waiting.clear();
    for (const w of todo) this.here(w.n).then(w.res, w.rej);
  }
  private here(n: number): Promise<Stretch> {
    return new Promise((res, rej) => setTimeout(() => { try { res(proveHere(this.seed, n)); } catch (e) { rej(e as Error); } }, 0));
  }
  /** stretch n, proven */
  get(n: number): Promise<Stretch> {
    let p = this.memo.get(n);
    if (!p) {
      if (this.dead) return Promise.reject(new Error('road closed'));
      if (this.worker) {
        const id = this.uid++;
        p = new Promise<Stretch>((res, rej) => { this.waiting.set(id, { res, rej, n }); this.worker!.postMessage({ id, seed: this.seed, n }); });
      } else p = this.here(n);
      this.memo.set(n, p);
      // forget the oldest ones
      if (this.memo.size > 8) this.memo.delete(this.memo.keys().next().value as number);
    }
    return p;
  }
  /** start proving the stretches after n */
  ahead(n: number, count = 2): void { for (let i = 1; i <= count; i++) void this.get(n + i).catch(() => undefined); }
  destroy(): void { this.dead = true; this.worker?.terminate(); this.worker = null; this.waiting.clear(); this.memo.clear(); }
}
