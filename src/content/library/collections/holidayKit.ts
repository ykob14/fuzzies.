/**
 * Layout helpers for the illustrated holiday collections (Halloween, Christmas, Hanukkah, Passover).
 * They sit on top of the composition kit: `mark()` remembers where a block of layers starts, and `centerIn()` /
 * `endAt()` move that whole block afterwards — titles wrap to an unknown height, so blocks are built first and
 * placed second. That keeps text blocks balanced on the page instead of hugging the top and leaving dead space.
 */
import { box, text, type Kit, type TOpts } from './kit';
import type { TextEl } from '../../../editor/types';

/** Index of the next layer (start of a block). */
export const mark = (c: Kit): number => c.els.length;

/** Vertical extent of the layers from `from` on. */
export function extent(c: Kit, from: number): [number, number] {
  let a = Infinity, b = -Infinity;
  for (const e of c.els.slice(from)) { a = Math.min(a, e.y); b = Math.max(b, e.y + e.h); }
  return a === Infinity ? [0, 0] : [a, b];
}
/** Move the layers from `from` on by dy. */
export function shift(c: Kit, from: number, dy: number): void { for (const e of c.els.slice(from)) e.y += dy; }
/** Centre the block that starts at `from` between y0 and y1. */
export function centerIn(c: Kit, from: number, y0: number, y1: number): void {
  const [a, b] = extent(c, from);
  shift(c, from, (y0 + y1) / 2 - (a + b) / 2);
}
/** Move the block that starts at `from` so it ends at y1. */
export function endAt(c: Kit, from: number, y1: number): void { shift(c, from, y1 - extent(c, from)[1]); }

/** A hairline rule centred on cx (or starting at x when `left`). */
export function rule(c: Kit, x: number, y: number, w: number, color: string, o: { left?: boolean; t?: number } = {}): void {
  const t = o.t ?? Math.max(2, c.u * 0.003);
  box(c, o.left ? x : x - w / 2, y, w, t, color);
}

/** Text lines one under another; returns the y below the last one. */
export function lines(c: Kit, items: [string, TOpts, number?][], x: number, y: number, w: number): { y: number; els: TextEl[] } {
  const els: TextEl[] = [];
  for (const [s, o, gap] of items) {
    const t = text(c, s, x, y + (gap ?? 0), w, o);
    els.push(t);
    y = t.y + t.h;
  }
  return { y, els };
}
