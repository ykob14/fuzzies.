/**
 * The living Fuzzy mascot: bounces with squash & stretch over its own shadow, twinkles with sparkles
 * and fuzzy puffs, winks at you every few seconds, and hops + chimes when you tap it.
 * Move the mouse over it (or tap three times quickly) to tickle it: it squirms and giggles "tee hee hee, ha ha ha".
 * While you hover, its sparkles twinkle with little bell sounds.
 * Starts with a flat drawing and swaps to photos of the real 3D game model once they're rendered.
 */
import { h, fuzzySvg, useRealMarks } from './dom';
import { accounts } from '../core/account';
import { sfx } from '../game/sound';

type Face = 'open' | 'wink' | 'blink' | 'giggle';
type Frames = Record<Face, string>;

const svgUrl = (face: Face) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(fuzzySvg(['#ff8fbf', '#c8326e'], face, 'm' + face));
let frames: Frames = { open: svgUrl('open'), wink: svgUrl('wink'), blink: svgUrl('blink'), giggle: svgUrl('giggle') };
let realistic = false;
const live = new Set<{ img: HTMLImageElement; face: Face }>();

// warm the browser cache so face swaps never flicker
const preload = (f: Frames) => Object.values(f).forEach((src) => { const i = new Image(); i.src = src; });
preload(frames);

/** Render the 3D frames in the background, then upgrade every mascot on screen. */
export function upgradeMascots(): void {
  if (realistic) return;
  try {
    const c = document.createElement('canvas');
    if (!(c.getContext('webgl2') || c.getContext('webgl'))) return;
  } catch { return; }
  const go = () => import('../game/mascot3d').then((m) => m.renderMascotFrames()).then((f) => {
    preload(f);
    void saveForSplash(f);
    frames = f;
    realistic = true;
    useRealMarks(f.open);
    for (const m of live) {
      if (!m.img.isConnected) { live.delete(m); continue; }
      m.img.src = frames[m.face];
      m.img.closest('.mascot')?.classList.add('real');
    }
  }).catch(() => { /* keep the drawn version */ });
  const idle = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => void }).requestIdleCallback;
  if (idle) idle(() => void go(), { timeout: 2500 }); else setTimeout(() => void go(), 600);
}


/** Keep small copies of the realistic open + wink frames so the launch screen (index.html) can show them instantly. */
async function saveForSplash(f: Frames): Promise<void> {
  const shrink = (src: string) => new Promise<string>((res, rej) => {
    const i = new Image();
    i.onload = () => {
      const c = document.createElement('canvas');
      c.width = c.height = 256;
      c.getContext('2d')!.drawImage(i, 0, 0, 256, 256);
      const webp = c.toDataURL('image/webp', 0.9);
      res(webp.startsWith('data:image/webp') ? webp : c.toDataURL('image/png'));
    };
    i.onerror = rej;
    i.src = src;
  });
  try {
    localStorage.setItem('fz.splash.frames', JSON.stringify({ open: await shrink(f.open), wink: await shrink(f.wink) }));
  } catch { /* no room: the launch screen uses the drawn Fuzzy */ }
}

export function mascot(size: number, opts: { sparkles?: boolean; small?: boolean; interactive?: boolean } = {}): HTMLElement {
  const img = h('img', { class: 'mascot-img', src: frames.open, alt: '', draggable: 'false' });
  const state = { img, face: 'open' as Face };
  live.add(state);
  const squash = h('div', { class: 'mascot-squash' }, img);
  const jump = h('div', { class: 'mascot-jump' }, squash);
  const fx = h('div', { class: 'mascot-fx', 'aria-hidden': 'true' });
  if (opts.sparkles !== false) {
    // twinkling stars + soft fuzzy puffs drifting up
    for (let i = 0; i < 5; i++) fx.append(h('span', { class: `mascot-star st${i}` }));
    for (let i = 0; i < 3; i++) fx.append(h('span', { class: `mascot-puff pf${i}` }));
  }
  const el = h('div', {
    class: `mascot ${opts.small ? 'mascot-sm' : ''} ${realistic ? 'real' : ''}`,
    style: `--s:${size}px; --delay:${(-Math.random() * 2).toFixed(2)}s`,
    role: 'img', 'aria-label': 'Fuzzies mascot',
  }, h('div', { class: 'mascot-shadow' }), fx, jump);

  const setFace = (f: Face) => { state.face = f; img.src = frames[f]; };
  const burst = () => {
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + Math.random() * 0.5;
      const d = 0.55 + Math.random() * 0.3;
      const s = h('span', { class: 'mascot-burst', style: `--dx:${(Math.cos(a) * d).toFixed(2)};--dy:${(Math.sin(a) * d - 0.2).toFixed(2)};--hue:${['#fff6b0', '#ff9fd6', '#ffffff', '#c7b3ff'][i % 4]}` });
      fx.append(s);
      setTimeout(() => s.remove(), 900);
    }
  };
  const wink = (withBurst = true) => {
    setFace('wink');
    if (withBurst) burst();
    setTimeout(() => { if (state.face === 'wink') setFace('open'); }, 650);
  };
  const blink = () => { setFace('blink'); setTimeout(() => { if (state.face === 'blink') setFace('open'); }, 130); };
  const soundOn = () => accounts.current?.settings.sound !== false;

  // ---- tickling ----
  let tickleEnd = 0, giggleUntil = 0, hovering = false, lastHehe = 0;
  const hehe = () => {
    const now = performance.now();
    if (now - lastHehe < 520) return; // one bubble at a time, so they don't pile up
    lastHehe = now;
    const words = ['tee hee hee!', 'ha ha ha!', 'hee hee', 'hehehe', 'that tickles!', 'ha ha!', 'hee!'];
    const s = h('span', { class: 'mascot-hehe', style: `--x:${(15 + Math.random() * 70).toFixed(0)}%;--r:${(Math.random() * 24 - 12).toFixed(0)}deg` }, words[Math.floor(Math.random() * words.length)]);
    fx.append(s);
    setTimeout(() => s.remove(), 1100);
  };
  const tickle = () => {
    const now = performance.now();
    const fresh = now > tickleEnd;
    tickleEnd = now + 900;
    setFace('giggle');
    el.classList.add('tickle');
    hehe();
    // one giggle phrase at a time, chained for as long as the tickling goes on
    if (soundOn() && now > giggleUntil) giggleUntil = now + sfx.giggle() * 1000 + 120;
    if (fresh) { burst(); if (soundOn()) sfx.shimmer(); }
    const settle = () => {
      if (performance.now() < tickleEnd) { setTimeout(settle, 120); return; }
      el.classList.remove('tickle');
      wink(false); // a satisfied little wink when the tickling stops
    };
    if (fresh) setTimeout(settle, 900);
  };

  // wink at you every few seconds (with the odd blink in between), until the mascot leaves the page
  let tries = 0;
  const loop = () => {
    if (!el.isConnected && (el.dataset.mounted || ++tries > 6)) { live.delete(state); return; }
    if (el.isConnected) el.dataset.mounted = '1';
    if (el.isConnected && !document.hidden && document.documentElement.dataset.motion !== 'reduce') {
      if (performance.now() < tickleEnd) { /* busy giggling */ } else if (Math.random() < 0.45) wink(); else blink();
    }
    setTimeout(loop, 3500 + Math.random() * 4500);
  };
  setTimeout(loop, 1800 + Math.random() * 2500);

  if (opts.interactive !== false) {
    el.classList.add('ticklish');
    el.addEventListener('pointerenter', (e) => {
      if (e.pointerType !== 'mouse') return;
      hovering = true;
      if (soundOn()) sfx.twinkle();
      if (performance.now() > tickleEnd) wink();
    });
    el.addEventListener('pointerleave', () => { hovering = false; });
    // the sparkles chime while you hover (each star rings as it shines)
    fx.addEventListener('animationiteration', (e) => {
      if (!(e.target as HTMLElement).classList.contains('mascot-star')) return;
      setTimeout(() => { if (hovering && soundOn() && el.isConnected) sfx.twinkle(); }, 900);
    });
    // a tickle = moving the mouse over it (any direction), or wiggling back and forth
    let lastX = 0, lastY = 0, dir = 0, travel = 0, rub = 0, rubAt = 0;
    let turns: number[] = [];
    el.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch') return;
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      const step = Math.abs(dx) >= Math.abs(dy) ? dx : dy;
      if (Math.abs(step) < 1) return;
      const nowM = performance.now();
      if (nowM - rubAt > 400) rub = 0;
      rubAt = nowM;
      rub += Math.min(40, Math.hypot(dx, dy));
      if (rub > Math.max(36, size * 0.45)) { rub = 0; tickle(); }
      const d = Math.sign(step);
      travel += Math.abs(step);
      if (d !== dir) {
        const now = performance.now();
        if (dir !== 0 && travel > size * 0.06) turns.push(now);
        dir = d; travel = 0;
        turns = turns.filter((t) => now - t < 700);
        if (turns.length >= 3) { tickle(); turns = turns.slice(-2); }
      }
    });
    // on touch screens: three quick taps
    let taps: number[] = [];
    el.addEventListener('click', () => {
      const now = performance.now();
      taps = [...taps.filter((t) => now - t < 900), now];
      if (taps.length >= 3) { taps = []; tickle(); return; }
      if (now < tickleEnd) { tickle(); return; }
      wink();
      el.classList.remove('hop');
      void el.offsetWidth; // restart the hop animation
      el.classList.add('hop');
      setTimeout(() => el.classList.remove('hop'), 800);
      if (soundOn()) { sfx.boing(); setTimeout(() => sfx.wink(), 180); }
    });
  }
  return el;
}
