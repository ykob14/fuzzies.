/**
 * Fuzzies Parking Escape — THE GAME SCREEN: the level map (20 districts × 25 levels, stars, locks, specials, milestones), playing a
 * level (drag a vehicle along its lane; undo, restart, hint, pause; timers and move limits on special levels), the victory and
 * try-again cards, sound settings, the first-level tips and the endless mode after level 500. It runs full screen over Fuzzies Land
 * (the town is paused underneath) and talks to the town only through `hooks`: save, pay rewards, exit.
 * Rules: engine.ts · levels: levels.json (tools/parking) · progress/rewards: progress.ts · 3D: scene.ts · sound: audio.ts.
 */
import { h } from '../../ui/dom';
import { landIcon } from '../../ui/landIcons';
import { lockPage } from '../../ui/joystick';
import { parse, range, grid, apply, solved, solveAsync, transform, OUT, type LevelData, type Puzzle } from './engine';
import * as P from './progress';
import { ParkScene, districtName } from './scene';
import { ENVS, envIndexOf, holidayPaint, LEVELS_PER_ENV, type Atmo } from './world';
import { activeEvents, HOLIDAYS, type ActiveEvent } from '../events';
import { ParkAudio } from './audio';
import { preloadDrivers, driverUrl, DRIVER_NAMES, HERO, riders3d, setRiders3d } from './vehicles';
import { loadRiders } from './rider3d';
import { turntable, type Turntable } from './garage3d';
import { liveLevel, rng, type Spec } from './generator';

export interface ParkSetup { mobile: boolean; state: P.ParkState; coins: () => number; name: string; startLevel?: number; now?: () => number }
export interface Payment { key: string; coins: number; ok: boolean; pending?: boolean }
export interface ParkHooks {
  save(): void;
  /** pay rewards into the town (once each; cloud accounts ask the server first) */
  pay(rewards: { key: string; coins: number; why: string }[]): Promise<Payment[]>;
  exit(): void;
}
interface Levels { levels: LevelData[]; endless: LevelData[]; challenge: LevelData[]; timed: LevelData[]; season: LevelData[] }
/** journey = the 500 levels; ch / tm = the Challenge and Timed Escape ladders; season = a holiday's 10 lots; endless after 500 */
type Mode = 'journey' | 'ch' | 'tm' | 'season' | 'endless';
/** the ladders open part-way through the journey */
const OPEN_AT = { ch: 40, tm: 30 };

const PAGE = 25;
const SVG = (d: string, size = 26) => { const w = document.createElement('div'); w.innerHTML = `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`; return w.firstElementChild as SVGElement; };
const IC = {
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
  restart: '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/>',
  hint: '<path d="M9 18h6M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2V17h6v-.3c0-.8.4-1.5 1-2A7 7 0 0 0 12 2z"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  fit: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/><rect x="8.5" y="8.5" width="7" height="7" rx="1.5"/>',
  back: '<path d="M15 18l-6-6 6-6"/>',
  close: '<path d="M18 6 6 18M6 6l12 12"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  play: '<path d="M7 4v16l13-8z" fill="currentColor"/>',
  next: '<path d="M9 18l6-6-6-6"/>',
  timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2h6"/>',
  moves: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  double: '<path d="M4 8h12M12 4l4 4-4 4M20 16H8M12 12l-4 4 4 4"/>',
  spark: '<path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4z" fill="currentColor"/>',
  sound: '<path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>',
  mute: '<path d="M11 5 6 9H3v6h3l5 4z"/><path d="m22 9-6 6M16 9l6 6"/>',
  infinity: '<path d="M18.2 7.8a4.2 4.2 0 1 1 0 8.4c-3.4 0-5-8.4-12.4-8.4a4.2 4.2 0 1 0 0 8.4c7.4 0 9-8.4 12.4-8.4z"/>',
};
const TYPE_ICON: Record<P.LType, string> = { n: '', t: IC.timer, m: IC.moves, d: IC.double, s: IC.spark };
const CAR_ICON = '<path d="M5 16h14v-3l-2-4H7l-2 4z"/><circle cx="8" cy="17" r="1.6" fill="currentColor"/><circle cx="16" cy="17" r="1.6" fill="currentColor"/><path d="M7 9l1.5-3h7L17 9"/>';
/** the names of the town decorations Parking Escape gives (rules.ts items) */
const DECOR_NAMES: Record<string, string> = { parkstar: 'Star Car Statue', parksign: 'Parking Sign', parkbus: 'Fuzzy Bus Stop', parkclock: 'Clock Tower', parkwatch: 'Golden Stopwatch', parkchamp: 'Golden Parking Trophy' };
const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.max(0, Math.floor(s % 60))).padStart(2, '0')}`;
const starRow = (n: number, cls = '') => h('span', { class: `pk-stars ${cls}` }, ...[1, 2, 3].map((k) => h('i', { class: k <= n ? 'on' : '' }, landIcon('star', 18))));

/** Open Fuzzies Parking Escape over the town. */
export async function runParking(stage: HTMLElement, setup: ParkSetup, hooks: ParkHooks): Promise<() => void> {
  const st = setup.state;
  const data = (await import('./levels.json')).default as unknown as Levels;
  void preloadDrivers();
  const root = h('div', { class: 'pk' });
  stage.append(root);
  const unlock = lockPage(root);
  const audio = new ParkAudio(st.audio, st.plays % 3);
  const host = h('div', { class: 'pk-stage' }); root.append(host);
  const scene = new ParkScene(host, { mobile: setup.mobile });
  // the player's settings (Settings sheet): 3D or flat drivers, camera angle, calm motion (also on with the app's Reduce motion), voices
  const siteCalm = () => document.documentElement.dataset.motion === 'reduce';
  const applyPrefs = () => {
    if (st.prefs.flat) setRiders3d(false); else if (new URLSearchParams(location.search).get('riders3d') !== '0') setRiders3d(true);
    scene.topView = st.prefs.camera === 'top'; scene.calm = st.prefs.calm || siteCalm(); audio.voicesOn = st.prefs.voices;
  };
  applyPrefs();
  // the 3D drivers (0.4 MB) load while the map shows; a lot built before they arrive keeps its flat pictures until then and swaps them in
  // place. Phones use the same copy as computers: a lighter one (a quarter of the triangles) bent the eyes — the character comes first
  const want3d = () => { if (riders3d()) void loadRiders('fuzzy-rider.glb').then((ok) => { if (ok) scene.upgradeRiders(); }); };
  want3d();
  scene.onView = (zoomed) => { viewBtn.hidden = !zoomed; if (zoomed) hand.hidden = true; };
  scene.onIdle = (i) => { if (play && !play.done && !drag) audio.voice(scene.voiceOf(i), Math.random() < 0.3 ? 'giggle' : 'coo'); };
  audio.music(true);
  const wake = () => audio.wake();
  // browsers (iPhones especially) only allow sound from a real tap: try on every kind of press until it's running
  for (const ev of ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown']) root.addEventListener(ev, () => { if (!audio.ready) wake(); }, { capture: true });

  // ---------- HUD ----------
  const coinEl = h('b', null, String(setup.coins()));
  const coinChip = h('div', { class: 'pk-chip pk-coins', title: 'Your Fuzzies Land coins' }, landIcon('coin', 22), coinEl);
  const levelEl = h('div', { class: 'pk-level' });
  const movesEl = h('div', { class: 'pk-chip pk-moves' });
  const timerEl = h('div', { class: 'pk-chip pk-timer', hidden: true });
  const btn = (icon: string, label: string, cls: string, onClick: () => void) => { const b = h('button', { class: `pk-btn ${cls}`, type: 'button', 'aria-label': label, title: label }, SVG(icon), h('span', null, label)); b.addEventListener('click', () => { audio.button(); onClick(); }); return b; };
  const pauseBtn = h('button', { class: 'pk-round', type: 'button', 'aria-label': 'Pause', title: 'Pause (Esc)' }, SVG(IC.pause, 22));
  pauseBtn.addEventListener('click', () => { audio.button(); openPause(); });
  const mapBtn = h('button', { class: 'pk-round', type: 'button', 'aria-label': 'Level map', title: 'Level map' }, SVG(IC.back, 22));
  mapBtn.addEventListener('click', () => { audio.button(); showMap(); });
  const top = h('div', { class: 'pk-top' }, h('div', { class: 'pk-top-l' }, mapBtn, levelEl), h('div', { class: 'pk-top-c' }, movesEl, timerEl), h('div', { class: 'pk-top-r' }, coinChip, pauseBtn));
  const undoBtn = btn(IC.undo, 'Undo', 'pk-undo', () => undo());
  const restartBtn = btn(IC.restart, 'Restart', 'pk-restart', () => restart());
  const hintBtn = btn(IC.hint, 'Hint', 'pk-hint', () => void hint());
  const bottom = h('div', { class: 'pk-bottom' }, undoBtn, hintBtn, restartBtn);
  // back to the whole lot: shows only while you're zoomed in or slid aside (double-tap or the 0 key do the same)
  const viewBtn = h('button', { class: 'pk-round pk-view', type: 'button', 'aria-label': 'Show the whole lot', title: 'Show the whole lot (0)', hidden: true }, SVG(IC.fit, 22));
  viewBtn.addEventListener('click', () => { audio.button(); scene.resetView(); });
  const tip = h('div', { class: 'pk-tip', hidden: true });
  const hand = h('div', { class: 'pk-hand', hidden: true }, h('i'));
  const toastEl = h('div', { class: 'pk-toast', hidden: true });
  root.append(top, bottom, viewBtn, tip, hand, toastEl);
  const say = (text: string, ms = 2200) => { toastEl.textContent = text; toastEl.hidden = false; toastEl.classList.remove('show'); void toastEl.offsetWidth; toastEl.classList.add('show'); clearTimeout(sayT); sayT = setTimeout(() => { toastEl.hidden = true; }, ms); };
  let sayT: ReturnType<typeof setTimeout> | undefined;
  const paintCoins = (n = setup.coins()) => { coinEl.textContent = n.toLocaleString(); };
  /** frame the lot in the space the HUD really leaves free (measured, so buttons never sit on the exit road or a car) */
  const measurePad = () => {
    const sr = host.getBoundingClientRect(); if (!sr.width) return;
    const tr = top.getBoundingClientRect(), br = bottom.getBoundingClientRect();
    const rail = br.height > br.width; // wide screens: the tools are a column on the right
    const gap = 10;
    scene.pad = !br.width ? { top: tr.bottom - sr.top + gap, bottom: 16, left: 10, right: 10 } : rail
      ? { top: tr.bottom - sr.top + gap, bottom: 16, left: 14, right: sr.right - br.left + gap }
      : { top: tr.bottom - sr.top + gap, bottom: sr.bottom - br.top + gap, left: 10, right: 10 };
    scene.fit();
  };
  const padObs = new ResizeObserver(() => measurePad()); padObs.observe(top); padObs.observe(bottom); padObs.observe(host);
  requestAnimationFrame(measurePad);

  // ---------- one level ----------
  interface Play { n: number; mode: Mode; endless: boolean; relaxed: boolean; lvl: LevelData; p: Puzzle; s: Uint8Array; hist: Uint8Array[]; moves: number; t0: number; paused: number; pauseAt: number; timeLeft: number; done: boolean; hinted: boolean; started: boolean; warned: number }
  let play: Play | null = null;
  let busy = false;
  const levelOf = (n: number) => data.levels[n - 1];
  const elapsed = () => (play ? ((play.pauseAt || performance.now()) - play.t0 - play.paused) / 1000 : 0);

  function paintHud(): void {
    if (!play) return;
    const L = play.lvl, type = L.t;
    const title = play.mode === 'endless' ? `Endless ${play.n}` : play.mode === 'ch' ? `Challenge ${play.n}` : play.mode === 'tm' ? `Timed ${play.n}` : play.mode === 'season' ? `${eventNow()?.holiday.short ?? 'Holiday'} ${play.n}` : `Level ${play.n}`;
    const sub = play.mode === 'endless' ? 'Endless Parking' : play.mode === 'ch' ? `Goal: ${L.lim} moves` : play.mode === 'tm' ? 'Timed Escape' : play.mode === 'season' ? 'Holiday lot' : type === 'n' ? (play.relaxed ? `${districtName(play.n)} · Relaxed` : districtName(play.n)) : P.TYPE_NAMES[type];
    levelEl.replaceChildren(h('b', null, title), h('small', null, sub));
    const movesLeft = type === 'm' && L.lim ? L.lim - play.moves : null;
    movesEl.replaceChildren(SVG(IC.moves, 16), h('b', null, movesLeft !== null ? `${movesLeft}` : play.mode === 'ch' ? `${play.moves}/${L.lim}` : String(play.moves)), h('small', null, movesLeft !== null ? 'moves left' : play.moves === 1 ? 'move' : 'moves'));
    movesEl.classList.toggle('low', movesLeft !== null && movesLeft <= 3);
    timerEl.hidden = type !== 't';
    undoBtn.toggleAttribute('disabled', !play.hist.length || play.done);
    restartBtn.toggleAttribute('disabled', !play.hist.length || play.done);
    hintBtn.toggleAttribute('disabled', play.done);
  }
  function paintTimer(): void {
    if (!play || play.lvl.t !== 't') return;
    const left = Math.max(0, play.timeLeft);
    timerEl.replaceChildren(SVG(IC.timer, 16), h('b', null, fmtTime(Math.ceil(left))));
    timerEl.classList.toggle('low', left <= 10);
  }
  /** the holiday on now (Fuzzies Land's seasonal events), if any */
  const eventNow = (): ActiveEvent | null => activeEvents(setup.now?.() ?? Date.now())[0] ?? null;
  /** a holiday's 10 lots: picked from the holiday pool and turned differently each year */
  function seasonLevel(ev: ActiveEvent, k: number): LevelData {
    const pool = data.season.length ? data.season : data.endless;
    const hi = HOLIDAYS.indexOf(ev.holiday);
    const lvl = pool[(hi * 7 + (k - 1) * 3 + ev.year) % pool.length];
    return transform({ ...lvl, t: 'n' }, (ev.year + k) % 8);
  }
  /** a level: the journey (n ≤ 500), a ladder lot, a holiday lot or an endless puzzle */
  function start(n: number, mode: Mode = 'journey', lvlIn?: LevelData): void {
    if (mode === 'season' && !lvlIn && !eventNow()) { say('That holiday has finished — see you at the next one!'); mapMode = 'journey'; showMap(); return; }
    closeOverlays(); mapEl.hidden = true; cardEl.hidden = true; keySel = -1;
    const endless = mode === 'endless';
    let lvl = lvlIn ?? (mode === 'ch' ? data.challenge[n - 1] : mode === 'tm' ? data.timed[n - 1] : mode === 'season' ? seasonLevel(eventNow()!, n) : levelOf(n));
    // Relaxed: the journey's special levels lose their clock and move limit (same puzzle, standard rewards)
    const relaxed = mode === 'journey' && st.relaxed && (lvl.t === 't' || lvl.t === 'm');
    if (relaxed) lvl = { ...lvl, t: 'n', lim: undefined };
    // Challenge lots keep their move count as a goal (for ★★★), never a wall
    if (mode === 'ch') lvl = { ...lvl, t: 'n' };
    const p = parse(lvl);
    play = { n, mode, endless, relaxed, lvl, p, s: p.start.slice(), hist: [], moves: 0, t0: performance.now(), paused: 0, pauseAt: 0, timeLeft: lvl.lim ?? 0, done: false, hinted: false, started: lvl.t === 'n' || lvl.t === 's', warned: 99 };
    if (mode === 'journey') { st.cur = n; hooks.save(); }
    const envLevel = mode === 'journey' ? n : mode === 'ch' ? 1 + ((n - 1) % 10) * LEVELS_PER_ENV : mode === 'tm' ? 1 + ((n + 4) % 10) * LEVELS_PER_ENV : mode === 'season' ? 301 : 1 + (n % 10) * LEVELS_PER_ENV;
    const ev = eventNow();
    scene.load(p, play.s, envLevel, endless ? 10_000 + n : mode === 'ch' ? 20_000 + n : mode === 'tm' ? 30_000 + n : mode === 'season' ? 40_000 + n : n, mode === 'journey' && P.isMilestone(n), {
      style: st.garage.style, driver: st.garage.driver, paint: st.garage.paint ? holidayPaint(st.garage.paint) : HERO,
      atmo: ev ? (ev.holiday.atmo as Atmo) : undefined, colors: ev ? [holidayPaint(ev.key), '#ffffff', ev.holiday.tint || '#ffc21a'] : undefined,
    });
    audio.mood(lvl.t === 't' ? 'timed' : mode === 'season' ? 'season' : { env: envIndexOf(envLevel) });
    scene.clearHint();
    top.hidden = false; bottom.hidden = false;
    paintHud(); paintTimer(); paintCoins();
    tip.hidden = true; hand.hidden = true;
    // specials explain themselves first (the clock starts on "Start")
    if (!play.started) { play.pauseAt = performance.now(); showIntro(); }
    else { tutorial(); if (mode === 'ch' && n === 1) say(`Challenge lots are big and crowded — finish in ${lvl.lim} moves or fewer for ★★★`, 3200); if (lvl.t === 's') say(P.isMilestone(n) ? `Milestone level ${n}! Bonus coins waiting 🎉` : 'Special Challenge — a trickier lot, bigger reward!', 2600); }
  }

  // ---------- dragging ----------
  interface Drag { i: number; id: number; grab: number; pos0: number; min: number; max: number; out: boolean; exitDir: 0 | 1 | -1; vel: number; lastT: number; lastPos: number; bumped: boolean; moved: boolean; span: number; len: number }
  let drag: Drag | null = null;
  const canvas = scene.canvas;
  // ---------- the camera: two fingers pinch + slide, one finger / the mouse on open ground slides, the wheel zooms, double-tap ----------
  // a finger on a vehicle always drags the vehicle; a second finger hands everything to the camera (the vehicle goes back to its bay)
  const ptrs = new Map<number, { x: number; y: number }>();
  /** keep getting this pointer's moves even off the canvas (a pointer the browser no longer knows can't be captured: ignore) */
  const capture = (id: number) => { try { canvas.setPointerCapture(id); } catch { /* gone already */ } };
  let pan: { id: number; x: number; y: number; x0: number; y0: number; moved: boolean } | null = null;
  let pinch: { d: number; mx: number; my: number } | null = null;
  let lastTap = { t: 0, x: 0, y: 0 };
  const two = () => { const [a, b] = [...ptrs.values()]; return { d: Math.max(20, Math.hypot(a.x - b.x, a.y - b.y)), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 }; };
  canvas.addEventListener('pointerdown', (e) => {
    if (!play) return;
    if (e.isPrimary) { ptrs.clear(); pinch = null; } // a new gesture: forget any finger whose lift we never saw
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size >= 2) {
      if (drag) { const d = drag; drag = null; scene.settle(d.i, play.s[d.i]); }
      pan = null; pinch = two(); capture(e.pointerId); return;
    }
    const startPan = () => { pan = { id: e.pointerId, x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, moved: false }; capture(e.pointerId); };
    if (e.button !== 0) { startPan(); return; } // right / middle mouse button: always the camera
    if (play.done || busy || !play.started || drag) { if (!drag) startPan(); return; }
    const i = scene.pick(e.clientX, e.clientY, e.pointerType === 'touch' ? 0.2 : 0.1);
    if (i < 0) { startPan(); return; }
    const car = play.p.cars[i];
    const r = range(play.p, play.s, i);
    const a = scene.along(i, e.clientX, e.clientY); if (a === null) return;
    capture(e.pointerId);
    drag = { i, id: e.pointerId, grab: a, pos0: play.s[i], min: r.min, max: r.max, out: r.out, exitDir: car.exit, vel: 0, lastT: performance.now(), lastPos: play.s[i], bumped: false, moved: false, span: car.dir === 'h' ? play.p.w : play.p.h, len: car.len };
    scene.select(i); audio.select(); audio.voice(scene.voiceOf(i), 'hi'); keySel = i;
    if (r.min === r.max && !r.out) { scene.bump(i, -1); audio.blocked(); audio.voice(scene.voiceOf(i), 'oops', 0.12); }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (ptrs.has(e.pointerId)) ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && ptrs.size >= 2) {
      const n = two();
      scene.zoomAt(n.d / pinch.d, n.mx, n.my);
      scene.panBy(pinch.mx, pinch.my, n.mx - pinch.mx, n.my - pinch.my);
      pinch = n; return;
    }
    if (pan && e.pointerId === pan.id) {
      if (!pan.moved && Math.hypot(e.clientX - pan.x0, e.clientY - pan.y0) > 8) pan.moved = true;
      if (pan.moved) { scene.panBy(pan.x, pan.y, e.clientX - pan.x, e.clientY - pan.y); pan.x = e.clientX; pan.y = e.clientY; }
      return;
    }
    if (!drag || e.pointerId !== drag.id || !play) return;
    const a = scene.along(drag.i, e.clientX, e.clientY); if (a === null) return;
    const want = drag.pos0 + (a - drag.grab);
    const lo = drag.out && drag.exitDir === -1 ? drag.min - 1.6 : drag.min, hi = drag.out && drag.exitDir === 1 ? drag.max + 1.6 : drag.max;
    const clamped = Math.max(lo, Math.min(hi, want));
    const over = want - clamped;
    const pos = clamped + Math.max(-0.1, Math.min(0.1, over * 0.2)); // a little rubber band past the end
    if (Math.abs(want - drag.pos0) > 0.12) drag.moved = true;
    if (Math.abs(over) > 0.28 && !drag.bumped) { drag.bumped = true; const blocker = blockerOf(drag.i, over > 0 ? 1 : -1); scene.bump(drag.i, blocker); audio.bump(); audio.voice(scene.voiceOf(drag.i), 'oops', 0.05); }
    else if (Math.abs(over) < 0.1) drag.bumped = false;
    const now = performance.now(), dt = Math.max(1, now - drag.lastT) / 1000;
    drag.vel = drag.vel * 0.6 + ((pos - drag.lastPos) / dt) * 0.4; drag.lastT = now; drag.lastPos = pos;
    scene.dragTo(drag.i, pos);
  });
  const endCamera = (e: PointerEvent): boolean => {
    ptrs.delete(e.pointerId);
    if (pinch) {
      if (ptrs.size < 2) { pinch = null; const [id, q] = [...ptrs.entries()][0] ?? []; if (id !== undefined && q) pan = { id, x: q.x, y: q.y, x0: q.x, y0: q.y, moved: true }; }
      return true;
    }
    if (pan && e.pointerId === pan.id) {
      const p0 = pan; pan = null;
      if (!p0.moved && e.type === 'pointerup' && e.button === 0) {
        // a double-tap on open ground: zoom in there, or back out to the whole lot
        const now = e.timeStamp; // when the finger lifted, not when a busy phone got round to it
        if (now - lastTap.t < 340 && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 40) { if (scene.zoomed) scene.resetView(); else scene.focusAt(e.clientX, e.clientY); lastTap.t = 0; }
        else lastTap = { t: now, x: e.clientX, y: e.clientY };
      }
      return true;
    }
    return false;
  };
  canvas.addEventListener('wheel', (e) => {
    if (!play) return; e.preventDefault();
    scene.zoomAt(Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.05 : e.ctrlKey ? 0.01 : 0.0015)), e.clientX, e.clientY);
  }, { passive: false });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  // iPhone Safari's own pinch-to-zoom of the page
  for (const ev of ['gesturestart', 'gesturechange']) root.addEventListener(ev, (e) => e.preventDefault());
  const endDrag = (e: PointerEvent) => {
    if (endCamera(e)) return;
    if (!drag || e.pointerId !== drag.id || !play) return;
    const d = drag; drag = null;
    const pos = scene.posOf(d.i);
    const stale = performance.now() - d.lastT > 90; const vel = stale ? 0 : d.vel;
    let to = Math.round(Math.max(d.min, Math.min(d.max, pos)));
    let escape = false;
    if (d.out) {
      const beyond = d.exitDir === 1 ? pos - d.max : d.min - pos;
      if (beyond > 0.35 || (vel * d.exitDir > 6 && beyond > -0.6)) escape = true;
    }
    if (!escape && Math.abs(vel) > 7 && d.moved) to = vel > 0 ? d.max : d.min; // a flick sends it all the way
    if (!d.moved && !escape) { scene.settle(d.i, play.s[d.i]); return; }
    if (escape) { commit(d.i, OUT); return; }
    scene.settle(d.i, to);
    if (to !== play.s[d.i]) commit(d.i, to); else if (d.moved) setTimeout(() => audio.stop(), 120);
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  /** the vehicle (or −1 for a wall / the edge) in the way of `i` going in `dir` */
  function blockerOf(i: number, dir: 1 | -1): number {
    if (!play) return -1;
    const c = play.p.cars[i], g = grid(play.p, play.s), r = range(play.p, play.s, i, g);
    const along = dir === 1 ? r.max + c.len : r.min - 1;
    if (along < 0 || along >= (c.dir === 'h' ? play.p.w : play.p.h)) return -1;
    const v = g[c.dir === 'h' ? c.line * play.p.w + along : along * play.p.w + c.line];
    return v >= 0 ? v : -1;
  }
  /** a move is made */
  function commit(i: number, to: number): void {
    if (!play) return;
    const from = play.s[i];
    play.hist.push(play.s.slice());
    play.s = apply(play.s, { car: i, to });
    play.moves++;
    scene.clearHint(); tip.hidden = true; hand.hidden = true;
    paintHud();
    if (to === OUT) {
      busy = true; scene.select(-1); audio.escape(); audio.voice(scene.voiceOf(i), 'yay', 0.2);
      void scene.escape(i).then(() => { busy = false; audio.cheer(); afterMove(); });
      return;
    }
    audio.slide(to - from); setTimeout(() => audio.stop(), 140);
    if (Math.random() < 0.35) { scene.hop(i, 'note'); audio.voice(scene.voiceOf(i), 'go', 0.1); }
    afterMove();
  }
  function afterMove(): void {
    if (!play) return;
    if (solved(play.p, play.s)) { win(); return; }
    if (play.lvl.t === 'm' && play.lvl.lim && play.moves >= play.lvl.lim) { fail('moves'); return; }
    // the double escape: one out, one to go
    if (play.lvl.t === 'd' && play.p.cars.some((c) => c.exit && play!.s[c.i] === OUT)) say('One out — now the other star car!');
  }
  function undo(): void {
    if (!play || busy || play.done || !play.hist.length) return;
    play.s = play.hist.pop()!; play.moves = Math.max(0, play.moves - 1);
    scene.setState(play.s); scene.clearHint(); paintHud();
  }
  function restart(): void {
    if (!play || busy) return;
    if (play.lvl.t === 't' || play.done) { start(play.n, play.mode, play.lvl); return; }
    play.s = play.p.start.slice(); play.hist = []; play.moves = 0; scene.setState(play.s); scene.clearHint(); paintHud();
  }
  async function hint(): Promise<void> {
    if (!play || busy || play.done || !play.started) return;
    busy = true; hintBtn.classList.add('thinking'); audio.hint();
    const at = play;
    const sol = await solveAsync(at.p, at.s, 900_000);
    busy = false; hintBtn.classList.remove('thinking');
    if (play !== at || at.done) return;
    if (!sol || !sol.length) { say('Hmm — try Restart, this lot is in a tangle!'); return; }
    at.hinted = true;
    scene.hint(sol[0].car, sol[0].to);
    say(sol[0].to === OUT ? 'Drive your star car out!' : at.p.cars[sol[0].car].exit ? 'Move your star car there' : `Move this one — ${sol.length} moves to go`, 2600);
  }

  // ---------- keyboard ----------
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); if (!pauseEl.hidden || !settingsEl.hidden) closeOverlays(); else if (play && !play.done && mapEl.hidden) openPause(); else if (!mapEl.hidden) quit(); return; }
    if (!play || play.done || busy || !mapEl.hidden || !pauseEl.hidden) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); return; }
    if (e.key.toLowerCase() === 'r' && !e.ctrlKey && !e.metaKey) { restart(); return; }
    if (e.key.toLowerCase() === 'h') { void hint(); return; }
    // the camera: + / − zoom on the middle of the screen, 0 = the whole lot
    if (e.key === '+' || e.key === '=' || e.key === '-' || e.key === '_') { const r = canvas.getBoundingClientRect(); scene.zoomAt(e.key === '+' || e.key === '=' ? 1.25 : 0.8, r.left + r.width / 2, r.top + r.height / 2); return; }
    if (e.key === '0') { scene.resetView(); return; }
    // arrow keys move the last vehicle you picked one bay at a time (Tab picks the next one)
    if (e.key === 'Tab') { e.preventDefault(); const n = play.p.cars.length; for (let k = 1; k <= n; k++) { const i = (keySel + k + n) % n; if (play.s[i] !== OUT) { keySel = i; scene.select(i); audio.select(); break; } } return; }
    const dirs: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    const d = dirs[e.key]; if (!d || keySel < 0 || play.s[keySel] === OUT) return;
    e.preventDefault();
    const c = play.p.cars[keySel]; const step = c.dir === 'h' ? d[0] : d[1]; if (!step) return;
    const r = range(play.p, play.s, keySel);
    const to = play.s[keySel] + step;
    if (c.exit === step && (step === 1 ? to > r.max : to < r.min) && r.out) { commit(keySel, OUT); return; }
    if (to < r.min || to > r.max) { scene.bump(keySel, blockerOf(keySel, step as 1 | -1)); audio.bump(); audio.voice(scene.voiceOf(keySel), 'oops'); return; }
    scene.settle(keySel, to); commit(keySel, to);
  };
  let keySel = -1;
  addEventListener('keydown', onKey);

  // ---------- the clock ----------
  let timerRaf = 0;
  const clock = () => {
    timerRaf = requestAnimationFrame(clock);
    if (!play || play.done || !play.started || play.pauseAt || play.lvl.t !== 't') return;
    play.timeLeft = (play.lvl.lim ?? 0) - elapsed();
    const left = Math.ceil(play.timeLeft);
    if (left <= 10 && left < play.warned && left > 0) { play.warned = left; audio.warn(left <= 3); timerEl.classList.remove('tick'); void timerEl.offsetWidth; timerEl.classList.add('tick'); }
    paintTimer();
    if (play.timeLeft <= 0) fail('time');
  };
  timerRaf = requestAnimationFrame(clock);
  const holdClock = (on: boolean) => { if (!play) return; if (on && !play.pauseAt) play.pauseAt = performance.now(); else if (!on && play.pauseAt) { play.paused += performance.now() - play.pauseAt; play.pauseAt = 0; } };
  const onVis = () => { if (document.hidden) holdClock(true); else if (pauseEl.hidden && cardEl.hidden) holdClock(false); scene.setRunning(!document.hidden); };
  document.addEventListener('visibilitychange', onVis);

  // ---------- overlays ----------
  const pauseEl = h('div', { class: 'pk-sheet-wrap', hidden: true });
  const settingsEl = h('div', { class: 'pk-sheet-wrap', hidden: true });
  const cardEl = h('div', { class: 'pk-card-wrap', hidden: true });
  const mapEl = h('div', { class: 'pk-map', hidden: true });
  root.append(mapEl, cardEl, pauseEl, settingsEl);
  /** the Garage's 360° view (made when the Garage opens, thrown away when it closes; the lot underneath pauses meanwhile) */
  let turn: Turntable | null = null;
  const closeTurn = () => { if (!turn) return; turn.dispose(); turn = null; scene.setRunning(true); };
  function closeOverlays(): void { closeTurn(); pauseEl.hidden = true; settingsEl.hidden = true; if (play && !play.done && cardEl.hidden && play.started) holdClock(false); }
  function openPause(): void {
    if (!play) return;
    holdClock(true);
    pauseEl.replaceChildren(h('div', { class: 'pk-sheet' },
      h('h2', null, 'Paused'),
      h('p', { class: 'pk-muted' }, play.endless ? `Endless puzzle ${play.n}` : play.mode === 'ch' ? `Challenge ${play.n}` : play.mode === 'tm' ? `Timed Escape ${play.n}` : play.mode === 'season' ? `Holiday lot ${play.n}` : `Level ${play.n} · ${P.TYPE_NAMES[play.lvl.t]}`),
      big('Resume', 'primary', () => closeOverlays()),
      big('Restart level', 'soft', () => { closeOverlays(); restart(); }),
      big('Settings', 'soft', () => openSettings(true)),
      big('Level map', 'soft', () => { closeOverlays(); showMap(); }),
      big('Back to Fuzzies Land', 'ghost', () => quit())));
    pauseEl.hidden = false;
  }
  function big(label: string, kind: 'primary' | 'soft' | 'ghost', onClick: () => void, cls = ''): HTMLButtonElement {
    const b = h('button', { class: `pk-big ${kind} ${cls}`, type: 'button' }, label);
    b.addEventListener('click', () => { audio.button(); onClick(); });
    return b;
  }
  function openSettings(fromPause = false): void {
    if (fromPause) pauseEl.hidden = true;
    const slider = (label: string, key: 'music' | 'sfx') => {
      const val = h('output', null, `${Math.round(st.audio[key] * 100)}%`);
      const input = h('input', { type: 'range', min: '0', max: '100', step: '5', value: String(Math.round(st.audio[key] * 100)), 'aria-label': label }) as HTMLInputElement;
      input.addEventListener('input', () => { st.audio[key] = Number(input.value) / 100; val.textContent = `${input.value}%`; audio.set({ [key]: st.audio[key] }); });
      input.addEventListener('change', () => { hooks.save(); if (key === 'sfx') audio.coin(); });
      return h('label', { class: 'pk-slider' }, h('span', null, label), input, val);
    };
    /** a switch row: label, a short line under it, saved at once */
    const toggle = (label: string, note: string, get: () => boolean, set: (on: boolean) => void) => {
      const box = h('input', { type: 'checkbox', checked: get() }) as HTMLInputElement;
      box.addEventListener('change', () => { set(box.checked); applyPrefs(); hooks.save(); audio.button(); });
      return h('label', { class: 'pk-toggle' }, h('span', null, label, note ? h('small', null, note) : null), box);
    };
    /** the camera angle: two buttons, one pressed */
    const angle = h('div', { class: 'pk-seg', role: 'group', 'aria-label': 'Camera angle' }, ...(['standard', 'top'] as const).map((v) => {
      const b = h('button', { type: 'button', class: st.prefs.camera === v ? 'on' : '', 'aria-pressed': String(st.prefs.camera === v) }, v === 'standard' ? 'Standard' : 'From above');
      b.addEventListener('click', () => { st.prefs.camera = v; applyPrefs(); scene.fit(); hooks.save(); audio.button(); openSettings(fromPause); });
      return b;
    }));
    const sec = (title: string, ...kids: (HTMLElement | null)[]) => h('div', { class: 'pk-ssec' }, h('h3', null, title), ...kids);
    settingsEl.replaceChildren(h('div', { class: 'pk-sheet pk-settings' },
      h('h2', null, 'Settings'),
      sec('Sound', slider('Music', 'music'), slider('Sound effects', 'sfx'),
        toggle('Fuzzy voices', 'Their little “eep!” and giggles', () => st.prefs.voices, (on) => { st.prefs.voices = on; }),
        toggle('Mute everything', '', () => st.audio.mute, (on) => { st.audio.mute = on; audio.set({ mute: on }); }),
        h('p', { class: 'pk-muted small' }, `Now playing: “${audio.trackName}” — the tunes take turns.`)),
      sec('View', h('div', { class: 'pk-row' }, h('span', null, 'Camera'), angle),
        toggle('Calm motion', siteCalm() ? 'On — your app is set to reduce motion' : 'No confetti or fireworks, gentler bounces', () => st.prefs.calm || siteCalm(), (on) => { st.prefs.calm = on; }),
        toggle('3D Fuzzies', 'Turn off for flat pictures if an older phone feels slow · from the next lot', () => !st.prefs.flat, (on) => { st.prefs.flat = !on; if (on) want3d(); })),
      sec('Play', toggle('Relaxed', 'Special levels without the clock or move limit · same rewards', () => st.relaxed, (on) => { st.relaxed = on; })),
      big('Done', 'primary', () => { settingsEl.hidden = true; if (fromPause) pauseEl.hidden = false; })));
    settingsEl.hidden = false;
  }

  /** the card before a special level: what's different, then Start (the clock starts there) */
  function showIntro(): void {
    if (!play) return;
    const L = play.lvl, t = L.t;
    const lines: Record<P.LType, string> = {
      n: '', s: '',
      t: `Get your star car out within ${fmtTime(L.lim ?? 0)}. The clock starts when you tap Start.`,
      m: `You have ${L.lim} moves. Plan ahead — every slide counts!`,
      d: 'Two star cars this time: get BOTH of them out through their own exits.',
    };
    cardEl.replaceChildren(h('div', { class: `pk-card pk-intro t-${t}` },
      h('div', { class: 'pk-card-ic' }, SVG(TYPE_ICON[t] || IC.spark, 34)),
      h('small', null, play.endless ? 'Endless Parking' : play.mode === 'tm' ? `Timed Escape ${play.n} of ${P.LADDER}` : `Level ${play.n}`),
      h('h2', null, P.TYPE_NAMES[t]),
      h('p', null, lines[t]),
      play.endless ? null : h('p', { class: 'pk-reward' }, landIcon('coin', 20), `+${play.mode === 'tm' ? P.REWARDS.timed : P.coinsForLevel(play.n)} coins the first time`),
      big('Start', 'primary', () => { cardEl.hidden = true; if (play) { play.started = true; play.t0 = performance.now(); play.paused = 0; play.pauseAt = 0; play.timeLeft = play.lvl.lim ?? 0; play.warned = 99; paintTimer(); tutorial(); } }),
      big('Level map', 'ghost', () => { cardEl.hidden = true; showMap(); })));
    cardEl.hidden = false;
  }

  function fail(why: 'time' | 'moves'): void {
    if (!play || play.done) return;
    play.done = true; drag = null; scene.select(-1); audio.fail();
    if (why === 'time') { play.timeLeft = 0; paintTimer(); }
    paintHud();
    const at = play;
    cardEl.replaceChildren(h('div', { class: 'pk-card pk-fail' },
      h('div', { class: 'pk-card-ic sad' }, SVG(why === 'time' ? IC.timer : IC.moves, 34)),
      h('h2', null, why === 'time' ? 'Time’s up!' : 'Out of moves!'),
      h('p', null, why === 'time' ? 'So close! The Fuzzies are still honking. Try again — the lot is the same, and you keep every coin you’ve earned.' : 'Nearly there! Try again — plan the first few moves before you slide anything.'),
      big('Try again', 'primary', () => { cardEl.hidden = true; start(at.n, at.mode, at.lvl); }),
      big('Level map', 'ghost', () => { cardEl.hidden = true; showMap(); })));
    setTimeout(() => { if (play === at) cardEl.hidden = false; }, 700);
  }

  async function win(): Promise<void> {
    if (!play || play.done) return;
    const at = play; at.done = true; holdClock(true);
    const secs = elapsed();
    scene.select(-1); scene.cheerAll(); at.p.cars.slice(0, 4).forEach((_, k) => audio.voice(scene.voiceOf(k + 1 < at.p.cars.length ? k + 1 : 0), 'giggle', 0.5 + k * 0.32)); scene.fireworks(P.isMilestone(at.n) && !at.endless ? 6 : 3);
    const special = at.lvl.t !== 'n' || (!at.endless && P.isMilestone(at.n));
    if (special) audio.special(); else audio.complete();
    paintHud();
    let clear: P.Clear | null = null; let rewards: { key: string; coins: number; why: string }[] = [];
    let ladder: ReturnType<typeof P.clearLadder> | null = null; let paintEarned = false;
    if (at.endless) {
      const e = P.clearEndless(st); if (e.coins) rewards = [{ key: e.key, coins: e.coins, why: `Endless puzzle ${at.n}` }];
    } else if (at.mode === 'ch' || at.mode === 'tm') {
      ladder = P.clearLadder(st, at.mode, at.n, { opt: at.lvl.o, moves: at.moves, lim: at.lvl.lim, timeLeft: at.mode === 'tm' ? Math.max(0, at.timeLeft) : undefined, hinted: at.hinted });
      rewards = ladder.rewards;
    } else if (at.mode === 'season') {
      const ev = eventNow();
      if (ev) { const c = P.clearSeason(st, ev.key, ev.year, HOLIDAYS.indexOf(ev.holiday), at.n); rewards = c.rewards; paintEarned = c.paint; }
    } else {
      clear = P.clearLevel(st, at.n, { opt: at.lvl.o, type: at.lvl.t, lim: at.lvl.lim, moves: at.moves, seconds: secs, timeLeft: at.lvl.t === 't' ? Math.max(0, at.timeLeft) : undefined, hinted: at.hinted });
      rewards = clear.rewards;
    }
    hooks.save();
    await new Promise((r) => setTimeout(r, 900));
    if (play !== at) return;
    // the victory card, then the coins fly in as each reward is confirmed
    const coinsLine = h('div', { class: 'pk-win-coins' });
    const starsEl = starRow(0, 'big');
    const next = at.n + 1;
    const champ = at.mode === 'journey' && at.n === P.LEVELS && clear?.first;
    const stars = clear?.stars ?? ladder?.stars ?? 0;
    const lastOfMode = at.mode === 'journey' ? at.n >= P.LEVELS : at.mode === 'ch' || at.mode === 'tm' ? at.n >= P.LADDER : at.mode === 'season' ? at.n >= P.SEASON_SET : false;
    const decor = rewards.map((r) => P.DECOR_FOR_KEY[r.key]).find(Boolean);
    const card = h('div', { class: `pk-card pk-win ${special ? 'special' : ''}` },
      h('img', { class: 'pk-win-fuzzy', src: driverUrl(at.n % 15), alt: '' }),
      special ? h('div', { class: 'pk-ribbon' }, at.mode === 'journey' && P.isMilestone(at.n) ? `Milestone ${at.n}!` : P.TYPE_NAMES[at.lvl.t]) : null,
      h('h2', null, champ ? 'Parking Champion!' : at.endless || at.mode === 'season' ? 'Lot cleared!' : 'Parked it!'),
      at.endless || at.mode === 'season' ? h('p', { class: 'pk-muted' }, `${at.endless ? 'Endless puzzle' : 'Holiday lot'} ${at.n} · ${at.moves} moves`) : starsEl,
      at.endless || at.mode === 'season' ? null : h('div', { class: 'pk-win-stats' },
        h('span', null, h('b', null, String(at.moves)), h('small', null, `moves${clear?.bestMoves && clear.before ? ' · best!' : ''}`)),
        h('span', null, h('b', null, String(at.lvl.o)), h('small', null, 'fewest possible')),
        h('span', null, h('b', null, fmtTime(secs)), h('small', null, 'time'))),
      at.endless || at.mode === 'season' || !(clear || ladder) ? null : h('p', { class: 'pk-muted small' }, stars < 3 ? (at.hinted ? 'Solve it without a hint for ★★★' : `Solve it in ${at.lvl.o + Math.max(1, Math.ceil(at.lvl.o * 0.25))} moves or fewer for ★★★`) : 'Three stars — brilliant parking!'),
      champ ? h('p', { class: 'pk-champ' }, '🏆 Your Golden Parking Trophy is waiting in Build → Decor. Endless Parking is open!') : null,
      decor && !champ ? h('p', { class: 'pk-champ' }, `🎁 New town decoration: ${DECOR_NAMES[decor] ?? 'a surprise'} — find it in Build → Decor!`) : null,
      paintEarned ? h('p', { class: 'pk-champ' }, `🎨 New holiday paint for your star car — pick it in the Garage!`) : null,
      at.mode === 'journey' && clear?.unlockedNext && unlockNote(next) ? h('p', { class: 'pk-champ' }, unlockNote(next)) : null,
      coinsLine,
      h('div', { class: 'pk-win-btns' },
        at.mode === 'journey' && at.n >= P.LEVELS ? big('Endless Parking', 'primary', () => startEndless(), 'pk-next')
          : lastOfMode ? big('Level map', 'primary', () => showMap(), 'pk-next')
          : big(at.endless ? 'Next puzzle' : 'Next level', 'primary', () => { if (at.endless) void startEndless(); else start(next, at.mode); }, 'pk-next'),
        big('Replay', 'soft', () => start(at.n, at.mode, at.lvl)),
        big('Level map', 'ghost', () => showMap())));
    cardEl.replaceChildren(card); cardEl.hidden = false;
    // stars pop in one by one
    if (clear || ladder) for (let k = 1; k <= stars; k++) setTimeout(() => { starsEl.children[k - 1]?.classList.add('on', 'pop'); audio.coin(); }, 250 + k * 260);
    if (clear?.unlockedNext || ladder?.unlockedNext) setTimeout(() => { audio.unlock(); say(`${at.mode === 'ch' ? 'Challenge' : at.mode === 'tm' ? 'Timed Escape' : 'Level'} ${next} unlocked!`, 1800); }, 1300);
    if (rewards.length) {
      coinsLine.append(h('span', { class: 'pk-muted' }, 'Collecting your coins…'));
      const paid = await hooks.pay(rewards);
      coinsLine.replaceChildren();
      let total = 0;
      for (const p of paid) {
        const why = rewards.find((r) => r.key === p.key)?.why ?? '';
        if (p.ok && p.coins > 0) { total += p.coins; coinsLine.append(h('div', { class: 'pk-coin-row' }, landIcon('coin', 20), h('b', null, `+${p.coins.toLocaleString()}`), h('small', null, why))); }
        else if (p.pending) coinsLine.append(h('div', { class: 'pk-coin-row muted' }, h('small', null, `${why}: we’ll add your coins when you’re back online.`)));
      }
      if (total) flyCoins(card, Math.min(14, 4 + Math.round(total / 40)));
    } else if (!at.endless) coinsLine.append(h('small', { class: 'pk-muted' }, 'Coins for this lot were already collected — replays are for stars!'));
  }
  function flyCoins(from: HTMLElement, n: number): void {
    const a = from.getBoundingClientRect(), b = coinChip.getBoundingClientRect();
    for (let k = 0; k < n; k++) {
      const c = h('div', { class: 'pk-fly' }, landIcon('coin', 26)); root.append(c);
      const x0 = a.left + a.width / 2 + (Math.random() - 0.5) * 120, y0 = a.top + a.height * 0.62 + (Math.random() - 0.5) * 40;
      c.style.transform = `translate(${x0}px, ${y0}px) scale(0.6)`;
      setTimeout(() => { c.style.transform = `translate(${b.left + 8}px, ${b.top + 4}px) scale(0.9)`; c.style.opacity = '0.9'; }, 40 + k * 70);
      setTimeout(() => { c.remove(); audio.coin(); paintCoins(); coinChip.classList.remove('bump'); void coinChip.offsetWidth; coinChip.classList.add('bump'); }, 760 + k * 70);
    }
  }

  // ---------- endless ----------
  async function startEndless(): Promise<void> {
    if (!P.endlessOpen(st)) { say('Finish level 500 to open Endless Parking!'); return; }
    const n = st.endless.n;
    cardEl.replaceChildren(h('div', { class: 'pk-card' }, h('h2', null, 'Building a new lot…'), h('p', { class: 'pk-muted' }, 'The Fuzzies are parking their cars.')));
    cardEl.hidden = false;
    await new Promise((r) => setTimeout(r, 60));
    const lvl = endlessLevel(n);
    cardEl.hidden = true;
    start(n, 'endless', lvl);
  }
  /** a fresh puzzle from the generator now and then, otherwise one from the pool, turned and mirrored (always solvable) */
  function endlessLevel(n: number): LevelData {
    const want = Math.min(40, 18 + Math.floor(n / 3));
    if (n % 3 === 1 || !data.endless.length) {
      const spec: Spec = { w: 6, h: 6, cars: [9, 12], trucks: 0.3, walls: n % 2, double: false, cap: 30_000 };
      const f = liveLevel(spec, want, 12, rng(n * 104729 + 7), setup.mobile ? 2200 : 1500);
      // a brand-new lot when the generator finds one hard enough in time; the pool (prebuilt expert lots) otherwise
      if (f && f.opt >= want - 4) return { b: f.board, w: 6, h: 6, x: 'A>', o: f.opt, t: n % 4 === 0 ? 't' : 'n', ...(n % 4 === 0 ? { lim: Math.round((20 + f.opt * 5) / 5) * 5 } : {}) };
    }
    const pool = data.endless.length ? data.endless : data.levels.slice(350); const sorted = [...pool].sort((a, b) => Math.abs(a.o - want) - Math.abs(b.o - want));
    const pick = sorted[(n * 7) % Math.min(12, sorted.length)];
    const lvl = transform(pick, (n * 5) % 8);
    return n % 4 === 0 ? { ...lvl, t: 't', lim: Math.round((20 + lvl.o * 5) / 5) * 5 } : { ...lvl, t: 'n' };
  }

  // ---------- the level map ----------
  /** what the journey unlocks next (said on the victory card) */
  const unlockNote = (n: number): string => {
    const notes: string[] = [];
    if ((n - 1) % LEVELS_PER_ENV === 0 && n > 1) notes.push(`🗺️ New neighbourhood: ${ENVS[envIndexOf(n)].name}!`);
    if (n === OPEN_AT.ch) notes.push('🏁 Challenge mode is open — big, crowded lots!');
    if (n === OPEN_AT.tm) notes.push('⏱️ Timed Escape is open — beat the clock!');
    const style = P.STYLE_NAMES.findIndex((_, k) => P.styleUnlockedAt(k) === n && k > 0); if (style > 0) notes.push(`🚗 New star car in your Garage: the ${P.STYLE_NAMES[style]}!`);
    const drv = Array.from({ length: 15 }, (_, d) => d).find((d) => P.driverUnlockedAt(d) === n && n > 1); if (drv !== undefined) notes.push(`🧸 ${DRIVER_NAMES[drv]} wants to drive — pick them in the Garage!`);
    return notes.join(' ');
  };
  let mapMode: 'journey' | 'ch' | 'tm' | 'season' = 'journey';
  let page = Math.floor((Math.max(1, st.top) - 1) / PAGE);
  const ladderPage = { ch: 0, tm: 0 };
  function showMap(): void {
    play = null; drag = null; busy = false; closeOverlays(); cardEl.hidden = true; tip.hidden = true; hand.hidden = true;
    top.hidden = true; bottom.hidden = true;
    const ev = eventNow();
    if (mapMode === 'season' && !ev) mapMode = 'journey';
    audio.mood(mapMode === 'tm' ? 'timed' : mapMode === 'season' ? 'season' : { env: envIndexOf(mapMode === 'journey' ? page * PAGE + 1 : 1) });
    const close = h('button', { class: 'pk-round', type: 'button', 'aria-label': 'Back to Fuzzies Land', title: 'Back to Fuzzies Land' }, SVG(IC.close, 22));
    close.addEventListener('click', () => { audio.button(); quit(); });
    const gear = h('button', { class: 'pk-round', type: 'button', 'aria-label': 'Settings', title: 'Settings — sound, camera, motion' }, SVG(IC.gear, 22));
    gear.addEventListener('click', () => { audio.button(); openSettings(); });
    const garageB = h('button', { class: 'pk-round pk-garage-btn', type: 'button', 'aria-label': 'Garage', title: 'Garage — your star car and driver' }, h('img', { src: driverUrl(st.garage.driver), alt: '' }));
    garageB.addEventListener('click', () => { audio.button(); openGarage(); });
    // the mode tabs
    const tab = (id: typeof mapMode, label: string, sub: string, locked: string | null) => {
      const b = h('button', { class: `pk-tab ${mapMode === id ? 'on' : ''} ${locked ? 'locked' : ''}`, type: 'button', 'aria-pressed': String(mapMode === id), 'data-mode': id }, h('b', null, label), h('small', null, locked ?? sub));
      b.addEventListener('click', () => { audio.button(); if (locked) { say(locked); audio.blocked(); return; } mapMode = id; showMap(); });
      return b;
    };
    const chDone = [...st.ch.stars].filter((c) => c !== '0').length, tmDone = [...st.tm.stars].filter((c) => c !== '0').length;
    const tabs = h('div', { class: 'pk-tabs', role: 'tablist' },
      tab('journey', 'Journey', `${P.doneCount(st)}/${P.LEVELS}`, null),
      tab('ch', 'Challenge', `${chDone}/${P.LADDER}`, st.top >= OPEN_AT.ch ? null : `Opens at level ${OPEN_AT.ch}`),
      tab('tm', 'Timed', `${tmDone}/${P.LADDER}`, st.top >= OPEN_AT.tm ? null : `Opens at level ${OPEN_AT.tm}`),
      ev ? tab('season', ev.holiday.short, `${st.season[ev.key] ?? 0}/${P.SEASON_SET} · ${ev.daysLeft}d left`, null) : '');
    const header = h('div', { class: 'pk-map-top' }, close, h('div', { class: 'pk-title' }, h('img', { src: driverUrl(st.garage.driver), alt: '' }), h('div', null, h('b', null, 'Parking Escape'), h('small', null, `${P.totalStars(st)} ★ · ${(setup.coins()).toLocaleString()} coins`))), garageB, gear);
    let body: (HTMLElement | string)[] = [];
    if (mapMode === 'journey') body = journeyMap();
    else if (mapMode === 'season' && ev) body = ladderMap('season', ev);
    else body = ladderMap(mapMode as 'ch' | 'tm', null);
    const envI = mapMode === 'journey' ? envIndexOf(page * PAGE + 1) : mapMode === 'ch' ? 8 : mapMode === 'tm' ? 5 : 6;
    mapEl.className = `pk-map env-${ENVS[envI].id} mode-${mapMode}`;
    mapEl.style.setProperty('--pk-lawn', ENVS[envI].tile);
    mapEl.replaceChildren(header, tabs, ...body);
    mapEl.hidden = false;
    scene.clearHint();
  }
  /** a winding road of 25 numbered stops */
  function board(first: number, count: number, info: (n: number) => { open: boolean; stars: number; badge?: string; mile?: string; cur: boolean }, pick: (n: number, open: boolean) => void): HTMLElement {
    const nodes: HTMLElement[] = [];
    const cols = 5;
    for (let k = 0; k < count; k++) {
      const n = first + k, row = Math.floor(k / cols), colRaw = k % cols, col = row % 2 ? cols - 1 - colRaw : colRaw;
      const i = info(n);
      const b = h('button', { class: `pk-node ${i.open ? '' : 'locked'} ${i.mile ? 'mile' : ''} ${i.cur ? 'cur' : ''} ${i.stars ? 'done' : ''}`, type: 'button', style: `--r:${row};--c:${col}`, 'data-level': String(n), 'aria-label': `Lot ${n}${i.open ? '' : ' (locked)'}` },
        h('span', { class: 'pk-node-n' }, i.open ? String(n) : ''),
        i.open ? null : h('span', { class: 'pk-node-lock' }, SVG(IC.lock, 18)),
        i.badge && i.open ? h('span', { class: 'pk-node-badge' }, SVG(i.badge, 13)) : null,
        i.mile ? h('span', { class: 'pk-node-gift' }, landIcon('coin', 16), i.mile) : null,
        i.stars ? starRow(i.stars, 'tiny') : null,
        i.cur ? h('img', { class: 'pk-node-car', src: driverUrl(st.garage.driver), alt: '' }) : null);
      b.addEventListener('click', () => { audio.button(); pick(n, i.open); });
      nodes.push(b);
    }
    const road = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); road.setAttribute('class', 'pk-road'); road.setAttribute('viewBox', '0 0 500 500'); road.setAttribute('preserveAspectRatio', 'none');
    let d = ''; for (let row = 0; row < 5; row++) { const y = 50 + row * 100; d += row === 0 ? `M50 ${y} H450` : row % 2 ? ` Q490 ${y - 50} 450 ${y} H50` : ` Q10 ${y - 50} 50 ${y} H450`; }
    road.innerHTML = `<path d="${d}" class="pk-road-edge"/><path d="${d}" class="pk-road-top"/><path d="${d}" class="pk-road-line"/>`;
    return h('div', { class: 'pk-board' }, h('div', { class: 'pk-board-deco' }), road, ...nodes);
  }
  const pager = (label: string, sub: string, at: number, pages: number, go: (p: number) => void) => {
    const prev = h('button', { class: 'pk-round', type: 'button', 'aria-label': 'Previous', disabled: at === 0 }, SVG(IC.back, 22));
    const nextB = h('button', { class: 'pk-round', type: 'button', 'aria-label': 'Next', disabled: at === pages - 1 }, SVG(IC.next, 22));
    prev.addEventListener('click', () => { audio.button(); go(at - 1); });
    nextB.addEventListener('click', () => { audio.button(); go(at + 1); });
    return h('div', { class: 'pk-district' }, prev, h('div', null, h('b', null, label), h('small', null, sub)), nextB);
  };
  function journeyMap(): (HTMLElement | string)[] {
    const pages = P.LEVELS / PAGE;
    page = Math.max(0, Math.min(pages - 1, page));
    const first = page * PAGE + 1;
    const env = ENVS[envIndexOf(first)], part = (page % (LEVELS_PER_ENV / PAGE)) + 1;
    const pageStars = Array.from({ length: PAGE }, (_, k) => P.starsOf(st, first + k)).reduce((a, b) => a + b, 0);
    const envOpen = st.top >= first;
    const relax = h('label', { class: 'pk-relax', title: 'No timers or move limits on the special levels — same rewards' }, h('input', { type: 'checkbox', checked: st.relaxed }), h('span', null, h('b', null, 'Relaxed'), h('small', null, st.relaxed ? 'No timers or limits' : 'Clocks & limits on')));
    (relax.querySelector('input') as HTMLInputElement).addEventListener('change', (e) => { st.relaxed = (e.target as HTMLInputElement).checked; hooks.save(); audio.button(); showMap(); });
    const playN = Math.min(P.LEVELS, st.top);
    const endlessCard = P.endlessOpen(st) && page === pages - 1 ? h('button', { class: 'pk-endless', type: 'button' }, SVG(IC.infinity, 28), h('b', null, 'Endless Parking'), h('small', null, `${st.endless.done} solved · +${P.REWARDS.endless} coins each`)) : null;
    endlessCard?.addEventListener('click', () => { audio.button(); void startEndless(); });
    return [
      pager(env.name + (envOpen ? '' : ' 🔒'), `${envOpen ? env.blurb : `Opens at level ${first}`} · Part ${part} · ${pageStars}/${PAGE * 3} ★`, page, pages, (p) => { page = p; showMap(); }),
      relax,
      board(first, PAGE, (n) => { const t = P.typeOf(n); return { open: P.unlocked(st, n), stars: P.starsOf(st, n), badge: t !== 'n' && !(st.relaxed && (t === 't' || t === 'm')) ? TYPE_ICON[t] : undefined, mile: P.isMilestone(n) ? '250' : undefined, cur: n === st.top && P.starsOf(st, n) === 0 }; },
        (n, open) => { if (!open) { say(`Finish level ${st.top} first`); audio.blocked(); return; } start(n); }),
      endlessCard ?? '',
      h('div', { class: 'pk-map-bottom' }, big(st.top > P.LEVELS - 1 && P.starsOf(st, P.LEVELS) ? 'Endless Parking' : `Play level ${playN}`, 'primary', () => { if (P.starsOf(st, P.LEVELS) && st.top >= P.LEVELS) void startEndless(); else start(playN); }, 'pk-play')),
    ];
  }
  function ladderMap(mode: 'ch' | 'tm' | 'season', ev: ActiveEvent | null): (HTMLElement | string)[] {
    if (mode === 'season' && ev) {
      const done = st.season[ev.key] ?? 0, next = Math.min(P.SEASON_SET, done + 1);
      return [
        h('div', { class: 'pk-district' }, h('div', null, h('b', null, `${ev.holiday.name} lots`), h('small', null, `${done}/${P.SEASON_SET} solved · ${ev.daysLeft} day${ev.daysLeft === 1 ? '' : 's'} left · +${P.REWARDS.season} coins each · finish all 10 for a holiday paint`))),
        board(1, P.SEASON_SET, (n) => ({ open: n <= next, stars: n <= done ? 3 : 0, cur: n === next && done < P.SEASON_SET }), (n, open) => { if (!open) { say(`Solve lot ${next} first`); audio.blocked(); return; } start(n, 'season'); }),
        h('p', { class: 'pk-muted pk-map-note' }, 'Holiday lots come and go with the holidays — the journey never waits for them.'),
        h('div', { class: 'pk-map-bottom' }, big(done >= P.SEASON_SET ? 'Play again' : `Play lot ${next}`, 'primary', () => start(done >= P.SEASON_SET ? 1 : next, 'season'), 'pk-play')),
      ];
    }
    const L = st[mode as 'ch' | 'tm'], key = mode as 'ch' | 'tm';
    const pages = P.LADDER / PAGE;
    ladderPage[key] = Math.max(0, Math.min(pages - 1, ladderPage[key]));
    const first = ladderPage[key] * PAGE + 1;
    const name = mode === 'ch' ? 'Challenge' : 'Timed Escape';
    const blurb = mode === 'ch' ? `Big crowded lots · finish within the goal for ★★★ · +${P.REWARDS.challenge} coins` : `Beat the countdown · +${P.REWARDS.timed} coins`;
    const playN = Math.min(P.LADDER, L.top);
    return [
      pager(`${name} ${first}–${first + PAGE - 1}`, blurb, ladderPage[key], pages, (p) => { ladderPage[key] = p; showMap(); }),
      board(first, PAGE, (n) => ({ open: n <= L.top, stars: Number(L.stars[n - 1]), mile: n === 25 || n === P.LADDER ? String(P.REWARDS.ladderMilestone) : undefined, badge: mode === 'tm' ? IC.timer : undefined, cur: n === L.top && L.stars[n - 1] === '0' }),
        (n, open) => { if (!open) { say(`Finish ${name} ${L.top} first`); audio.blocked(); return; } start(n, key); }),
      h('p', { class: 'pk-muted pk-map-note' }, mode === 'ch' ? `Lot 25 and lot 50 also give a town decoration.` : `Lot 25 and lot 50 also give a town decoration.`),
      h('div', { class: 'pk-map-bottom' }, big(`Play ${name} ${playN}`, 'primary', () => start(playN, key), 'pk-play')),
    ];
  }
  /** the garage: your star car's shape and paint and who drives it — looks only, the puzzles are the same for every car */
  function openGarage(): void {
    if (!turn) { turn = turntable({ calm: scene.calm }); scene.setRunning(false); }
    turn.show(st.garage.style, st.garage.paint ? holidayPaint(st.garage.paint) : HERO, st.garage.driver);
    const section = (title: string, ...kids: HTMLElement[]) => h('div', { class: 'pk-gsec' }, h('h3', null, title), h('div', { class: 'pk-ggrid' }, ...kids));
    const pickBtn = (on: boolean, open: boolean, lockText: string, label: string, art: HTMLElement, choose: () => void) => {
      const b = h('button', { class: `pk-gitem ${on ? 'on' : ''} ${open ? '' : 'locked'}`, type: 'button', 'aria-pressed': String(on) }, art, h('small', null, open ? label : lockText));
      b.addEventListener('click', () => { audio.button(); if (!open) { say(lockText); audio.blocked(); return; } choose(); hooks.save(); openGarage(); });
      return b;
    };
    const styles = P.STYLE_NAMES.map((nm, k) => pickBtn(st.garage.style === k, P.styleOpen(st, k), `Level ${P.styleUnlockedAt(k)}`, nm, h('span', { class: `pk-gcar s${k}` }, SVG(CAR_ICON, 30)), () => { st.garage.style = k; }));
    const drivers = DRIVER_NAMES.map((nm, d) => pickBtn(st.garage.driver === d, P.driverOpen(st, d), `Level ${P.driverUnlockedAt(d)}`, nm, h('img', { src: driverUrl(d), alt: '' }), () => { st.garage.driver = d; }));
    const paints = ['', ...st.paints].map((id) => pickBtn(st.garage.paint === id, true, '', id ? id.replace(/-(\d{4})$/, ' $1').replace(/^./, (c) => c.toUpperCase()) : 'Classic pink', h('span', { class: 'pk-gpaint', style: `--c:${id ? holidayPaint(id) : HERO}` }), () => { st.garage.paint = id; }));
    settingsEl.replaceChildren(h('div', { class: 'pk-sheet pk-garage' },
      h('h2', null, 'Garage'),
      turn.el,
      h('p', { class: 'pk-muted' }, 'Pick your star car and who drives it. Just for looks — every puzzle stays the same.'),
      section('Star car', ...styles), section('Driver', ...drivers),
      section('Paint', ...paints),
      st.paints.length ? h('span') : h('p', { class: 'pk-muted small' }, 'Finish a holiday’s 10 lots to earn its paint.'),
      big('Done', 'primary', () => { closeTurn(); settingsEl.hidden = true; showMap(); })));
    settingsEl.hidden = false;
  }

  // ---------- first-time tips ----------
  function tutorial(): void {
    if (!play || play.mode !== 'journey') return;
    const n = play.n;
    const tips: Record<number, string> = {
      1: 'Get your pink star car to the EXIT — slide the cars in its way first!',
      2: 'Cars only drive forwards and backwards — along their own lane.',
      3: 'Something in the way? Slide it out first.',
      4: 'Stuck? Tap Hint. Slid the wrong one? Undo.',
      6: 'Trucks and buses are three spaces long.',
      13: 'A Special Challenge — trickier, with a bigger reward!',
      30: 'Timed Escape — watch the clock up top!',
    };
    const t = tips[n]; if (!t) return;
    tip.textContent = t; tip.hidden = false;
    if (n <= 3) {
      // a finger shows the first move of the solution
      const show = (car: number, to: number) => {
        const from = scene.screenOf(car); if (!from || !play) return;
        const c = play.p.cars[car]; const span = c.dir === 'h' ? play.p.w : play.p.h;
        const dest = scene.screenAt(scene.worldAt(car, to === OUT ? (c.exit === 1 ? span : -1) : to).setY(0.4));
        hand.style.setProperty('--x0', `${from.x}px`); hand.style.setProperty('--y0', `${from.y}px`); hand.style.setProperty('--x1', `${dest.x}px`); hand.style.setProperty('--y1', `${dest.y}px`);
        hand.hidden = false;
      };
      void solveAsync(play.p, play.s).then((s) => { if (s?.length) setTimeout(() => show(s[0].car, s[0].to), 300); });
    }
  }

  // ---------- leaving ----------
  let gone = false;
  function quit(): void {
    if (gone) return; gone = true;
    hooks.save();
    destroy();
    hooks.exit();
  }
  function destroy(): void {
    cancelAnimationFrame(timerRaf);
    closeTurn();
    removeEventListener('keydown', onKey);
    document.removeEventListener('visibilitychange', onVis);
    padObs.disconnect(); audio.destroy(); scene.dispose(); unlock(); root.remove();
  }
  // straight to a level if asked (the town's "continue"), else the map
  if (setup.startLevel && P.unlocked(st, setup.startLevel)) start(setup.startLevel); else showMap();
  if (import.meta.env.DEV) (window as unknown as { __pk: unknown }).__pk = { get play() { return play; }, st, scene, audio, data, start, showMap, startEndless, commit, undo, restart, hint, quit, win: () => win(), solve: () => play && solveAsync(play.p, play.s) };
  return () => { if (!gone) { gone = true; hooks.save(); destroy(); } };
}
