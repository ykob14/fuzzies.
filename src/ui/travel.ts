/**
 * The smooth hop between Fuzzy Crossing and Fuzzies Land: a circle grows from where you tapped,
 * the Fuzzy bounces across with a little message while the next place loads underneath,
 * then the circle opens up again onto the new scene.
 */
import { h } from './dom';
import { mascot } from './mascot';
import { sfx } from '../game/sound';
import { accounts } from '../core/account';

let busy = false;

export function travel(hash: string, label: string, from?: { x: number; y: number }): void {
  if (busy) return;
  const reduce = !!accounts.current?.settings.reduceMotion || matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) { location.hash = hash; return; }
  busy = true;
  const x = from?.x ?? innerWidth / 2, y = from?.y ?? innerHeight / 2;
  const el = h('div', { class: 'travel', style: `--tx:${x}px; --ty:${y}px`, 'aria-hidden': 'true' },
    h('div', { class: 'travel-inner' }, mascot(96, { sparkles: true, interactive: false }), h('p', { class: 'travel-label' }, label),
      h('div', { class: 'travel-dots' }, h('span'), h('span'), h('span'))));
  document.body.append(el);
  try { sfx.whoosh(); } catch { /* no sound */ }
  requestAnimationFrame(() => el.classList.add('in'));
  // once the screen is covered, switch places underneath; open up again when the new scene says it's
  // ready (3D worlds take a moment to build), but never sooner than ~0.8 s or later than ~3 s
  let ready = false;
  const onReady = () => { ready = true; };
  addEventListener('fz:scene-ready', onReady, { once: true });
  setTimeout(() => { location.hash = hash; }, 520);
  const opened = Date.now() + 1350;
  const tryOpen = () => {
    if (!ready && Date.now() < opened + 1700) { setTimeout(tryOpen, 80); return; }
    removeEventListener('fz:scene-ready', onReady);
    el.classList.add('out');
    setTimeout(() => { el.remove(); busy = false; }, 650);
  };
  setTimeout(tryOpen, 1350);
}
