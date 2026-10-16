/**
 * A light seasonal touch over the Fuzzy Crossing board while an event is on: a soft colour wash at the edges and a few drifting pieces
 * (bats and leaves, snow, petals, lanterns, bubbles…). It is a separate layer ABOVE the game that ignores taps, so it works with the 3D
 * and the Classic 2D view alike and never touches the game's rules. Off when no event is on, when Settings → Seasonal effects is off, and
 * calm (just the colour wash) with Reduce motion. Pauses while the page is hidden.
 */
import { h } from '../../ui/dom';
import { accounts } from '../../core/account';
import { atmosphere } from '../events';
import { now as clockNow } from '../shopData';
import './eventFx.css';

interface P { x: number; y: number; vx: number; vy: number; r: number; s: number; ph: number; g: string }
const GLYPHS: Record<string, string[]> = { bats: ['🦇', '🍂', '🦇'], leaves: ['🍂', '🍁', '🍂'], snow: ['•'], lights: ['•'], lanterns: ['🏮'], petals: ['🌸', '🌷'], bubbles: ['○'], confetti: ['🎊'] };

export function createEventFx(touch: boolean): { el: HTMLElement; refresh(): void; destroy(): void } {
  const canvas = h('canvas', { class: 'evfx-canvas', 'aria-hidden': 'true' });
  const wash = h('div', { class: 'evfx-wash', 'aria-hidden': 'true' });
  const el = h('div', { class: 'evfx', 'aria-hidden': 'true', hidden: true }, wash, canvas);
  const ctx = canvas.getContext('2d');
  let watching = false;
  let parts: P[] = [], kind = '', raf = 0, last = 0, w = 0, hh = 0, dpr = 1;
  const calm = (): boolean => document.documentElement.dataset.motion === 'reduce' || !!accounts.current?.settings.reduceMotion;

  /** sit exactly over the game canvas (the 2D board is narrower than its box on wide screens) */
  function fit(): void {
    const board = el.parentElement, cv = board?.querySelector<HTMLElement>('canvas.game-canvas');
    if (!board || !cv) return;
    const r = cv.getBoundingClientRect(), b = board.getBoundingClientRect();
    if (r.width < 2) return;
    Object.assign(el.style, { inset: 'auto', left: `${r.left - b.left}px`, top: `${r.top - b.top}px`, width: `${r.width}px`, height: `${r.height}px` });
  }
  function size(): void {
    const r = el.getBoundingClientRect();
    dpr = Math.min(2, devicePixelRatio || 1);
    w = Math.max(1, Math.round(r.width)); hh = Math.max(1, Math.round(r.height));
    canvas.width = w * dpr; canvas.height = hh * dpr;
  }
  const rnd = (a: number, b: number): number => a + Math.random() * (b - a);
  function seed(k: string): void {
    const n = touch ? 9 : 14, set = GLYPHS[k] ?? ['•'];
    parts = Array.from({ length: n }, (_, i) => {
      const up = k === 'lanterns' || k === 'bubbles' || k === 'lights';
      return { x: rnd(0, w), y: rnd(0, hh), vx: k === 'bats' ? rnd(14, 34) * (i % 2 ? 1 : -1) : rnd(-8, 8), vy: up ? -rnd(8, 22) : rnd(14, 34), r: k === 'snow' || k === 'lights' || k === 'bubbles' ? rnd(2, 4.5) : rnd(13, 21), s: rnd(0.6, 1.4), ph: rnd(0, 6.28), g: set[i % set.length] };
    });
  }
  function frame(t: number): void {
    raf = requestAnimationFrame(frame);
    if (document.hidden || !ctx) return;
    const dt = Math.min(0.1, (t - last) / 1000 || 0.016); last = t;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, hh);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const p of parts) {
      p.ph += dt * p.s;
      p.x += (p.vx + Math.sin(p.ph) * 10) * dt; p.y += p.vy * dt;
      if (p.y > hh + 24) { p.y = -24; p.x = rnd(0, w); } else if (p.y < -24) { p.y = hh + 24; p.x = rnd(0, w); }
      if (p.x > w + 24) p.x = -24; else if (p.x < -24) p.x = w + 24;
      ctx.globalAlpha = kind === 'snow' ? 0.85 : kind === 'bubbles' ? 0.55 : kind === 'lights' ? 0.5 + Math.sin(p.ph * 2) * 0.3 : 0.62;
      if (p.g === '•') { ctx.fillStyle = kind === 'lights' ? '#ffd166' : '#fff'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill(); }
      else if (p.g === '○') { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 1.6, 0, 6.283); ctx.stroke(); }
      else { ctx.font = `${p.r}px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif`; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.sin(p.ph) * 0.5); ctx.fillText(p.g, 0, 0); ctx.restore(); }
    }
    ctx.globalAlpha = 1;
  }
  function stop(): void { cancelAnimationFrame(raf); raf = 0; ctx?.clearRect(0, 0, canvas.width, canvas.height); }
  function refresh(): void {
    const a = accounts.current?.settings.seasonFx === false ? null : atmosphere(clockNow());
    stop();
    el.hidden = !a;
    el.dataset.event = a?.id ?? '';
    if (!a) { parts = []; kind = ''; return; }
    wash.style.setProperty('--evfx', a.tint);
    if (el.parentElement && !watching) { watching = true; ro.observe(el.parentElement); }
    fit();
    size();
    if (calm()) return; // just the colour wash
    kind = a.weather;
    seed(kind);
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
  const ro = new ResizeObserver(() => { if (!el.hidden) { fit(); size(); if (kind) seed(kind); } });
  return { el, refresh, destroy: () => { stop(); ro.disconnect(); } };
}
