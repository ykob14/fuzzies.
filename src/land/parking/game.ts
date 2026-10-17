/**
 * Fuzzies Parking Escape — THE GAME SCREEN: the level map (20 districts × 25 levels, stars, locks, specials, milestones), playing a
 * level (drag a vehicle along its lane; undo, restart, hint, pause; timers and move limits on special levels), the victory and
 * try-again cards, sound settings, the first-level tips and the endless mode after level 500. It runs full screen over Fuzzies Land
 * (the town is paused underneath) and talks to the town only through `hooks`: save, pay rewards, exit.
 * Rules: engine.ts · levels: levels.json (tools/parking) · progress/rewards: progress.ts · 3D: scene.ts · sound: audio.ts.
 */
import { h } from '../../ui/dom';
import { landIcon } from '../../ui/landIcons';
import { gicon } from '../../crossing/ui/gicons';
import '../../crossing/ui/gameui.css';
import './pkSkin.css';
import { pkicon, pktile, pkStar } from './pkIcons';
import { envBanner, carArt, heroCar } from './pkArt';
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
const TYPE_ICON: Record<P.LType, string> = { n: '', t: 'timer', m: 'moves', d: 'double', s: 'spark' };
/** the names of the town decorations Parking Escape gives (rules.ts items) */
const DECOR_NAMES: Record<string, string> = { parkstar: 'Star Car Statue', parksign: 'Parking Sign', parkbus: 'Fuzzy Bus Stop', parkclock: 'Clock Tower', parkwatch: 'Golden Stopwatch', parkchamp: 'Golden Parking Trophy' };
const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.max(0, Math.floor(s % 60))).padStart(2, '0')}`;
/** three gold stars (earned ones lit); each holds a pale and a lit star, CSS shows the right one so the pop-in can just add `.on` */
const starRow = (n: number, cls = '') => h('span', { class: `pk-stars ${cls}` }, ...[1, 2, 3].map((k) => h('i', { class: k <= n ? 'on' : '' }, pkStar(false), pkStar(true))));
/** the glow-and-rays stage a hero (a driver, the star car) stands on, like the Fuzzy Crossing lobby */
const heroStage = (...kids: (HTMLElement | SVGElement | null)[]) => h('div', { class: 'pk-stagehero' }, h('i', { class: 'pk-rays' }), ...kids, h('i', { class: 'pk-ground' }));

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
  const coinChip = h('div', { class: 'pk-chip pk-coins', title: 'Your Fuzzies Land coins' }, landIcon('coin', 26), coinEl);
  const levelEl = h('div', { class: 'pk-level' });
  const movesEl = h('div', { class: 'pk-chip pk-moves' });
  const goalEl = h('div', { class: 'pk-chip pk-goal', hidden: true, title: 'Finish in this many moves or fewer for three stars' });
  const timerEl = h('div', { class: 'pk-chip pk-timer', hidden: true });
  /** a big round picture button with its label under it (and, for Undo, a little counter) */
  const btn = (icon: string, label: string, cls: string, onClick: () => void, counter = false) => {
    const b = h('button', { class: `pk-btn ${cls}`, type: 'button', 'aria-label': label, title: label }, h('span', { class: 'pk-btn-ic' }, pkicon(icon, 30), counter ? h('i', { class: 'pk-count', hidden: true }) : null), h('span', { class: 'pk-btn-l' }, label));
    b.addEventListener('click', () => { audio.button(); onClick(); });
    return b;
  };
  const pauseBtn = h('button', { class: 'pk-round pk-pause-btn', type: 'button', 'aria-label': 'Pause', title: 'Pause (Esc)' }, pkicon('pause', 22));
  pauseBtn.addEventListener('click', () => { audio.button(); openPause(); });
  const mapBtn = h('button', { class: 'pk-round', type: 'button', 'aria-label': 'Level map', title: 'Level map' }, pkicon('back', 22));
  mapBtn.addEventListener('click', () => { audio.button(); showMap(); });
  const top = h('div', { class: 'pk-top' }, h('div', { class: 'pk-top-l' }, mapBtn, levelEl), h('div', { class: 'pk-top-c' }, movesEl, goalEl, timerEl), h('div', { class: 'pk-top-r' }, coinChip, pauseBtn));
  const undoBtn = btn('undo', 'Undo', 'pk-undo', () => undo(), true);
  const restartBtn = btn('restart', 'Restart', 'pk-restart', () => restart());
  const hintBtn = btn('hint', 'Hint', 'pk-hint', () => void hint());
  const bottom = h('div', { class: 'pk-bottom' }, undoBtn, hintBtn, restartBtn);
  // back to the whole lot: shows only while you're zoomed in or slid aside (double-tap or the 0 key do the same)
  const viewBtn = h('button', { class: 'pk-round pk-view', type: 'button', 'aria-label': 'Show the whole lot', title: 'Show the whole lot (0)', hidden: true }, pkicon('fit', 22));
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

  /** the move count that earns three stars (journey: a quarter over the fewest possible; Challenge: the lot's goal) */
  const starGoal = (pl: Play): number => pl.mode === 'ch' ? (pl.lvl.lim ?? pl.lvl.o) : pl.lvl.o + Math.max(1, Math.ceil(pl.lvl.o * 0.25));
  function paintHud(): void {
    if (!play) return;
    const L = play.lvl, type = L.t;
    const word = play.mode === 'endless' ? 'Endless' : play.mode === 'ch' ? 'Challenge' : play.mode === 'tm' ? 'Timed' : play.mode === 'season' ? (eventNow()?.holiday.short ?? 'Holiday') : 'Level';
    const sub = play.mode === 'endless' ? 'Endless Parking' : play.mode === 'ch' ? 'Crowded lot' : play.mode === 'tm' ? 'Beat the clock' : play.mode === 'season' ? 'Holiday lot' : type === 'n' ? districtName(play.n) : P.TYPE_NAMES[type];
    levelEl.replaceChildren(h('span', { class: 'pk-lv-n' }, String(play.n)), h('span', { class: 'pk-lv-t' }, h('b', null, word), h('small', null, sub)));
    const movesLeft = type === 'm' && L.lim ? L.lim - play.moves : null;
    movesEl.replaceChildren(pkicon('moves', 20), h('b', null, movesLeft !== null ? `${movesLeft}` : String(play.moves)), ...(movesLeft !== null ? [h('small', null, 'left')] : []));
    movesEl.classList.toggle('low', movesLeft !== null && movesLeft <= 3);
    // the three-star goal: a gold star and the number of moves; it greys out once you're over it
    const goal = (play.mode === 'journey' || play.mode === 'ch') && type !== 'm' ? starGoal(play) : 0;
    goalEl.hidden = !goal;
    if (goal) { goalEl.replaceChildren(pkStar(play.moves <= goal, 22), h('b', null, `≤${goal}`)); goalEl.classList.toggle('over', play.moves > goal); }
    timerEl.hidden = type !== 't';
    undoBtn.toggleAttribute('disabled', !play.hist.length || play.done);
    restartBtn.toggleAttribute('disabled', !play.hist.length || play.done);
    hintBtn.toggleAttribute('disabled', play.done);
    const cnt = undoBtn.querySelector('.pk-count') as HTMLElement | null;
    if (cnt) { cnt.textContent = String(play.hist.length); cnt.hidden = !play.hist.length || play.done; }
  }
  function paintTimer(): void {
    if (!play || play.lvl.t !== 't') return;
    const left = Math.max(0, play.timeLeft);
    timerEl.replaceChildren(pkicon('timer', 20), h('b', null, fmtTime(Math.ceil(left))));
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
    else { tutorial(); if (mode === 'ch' && n === 1) say(`Big crowded lot — finish in ${lvl.lim} moves or fewer for 3 stars`, 3200); if (lvl.t === 's') say(P.isMilestone(n) ? `Milestone level ${n}! Bonus coins waiting` : 'Special Challenge — a trickier lot, bigger reward!', 2600); }
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
  // leaving the app mid-level opens the pause sheet (like every other game), so a timed lot never runs on unseen
  const onVis = () => { if (document.hidden) { holdClock(true); if (play && play.started && !play.done && pauseEl.hidden && settingsEl.hidden && cardEl.hidden && mapEl.hidden) openPause(); } else if (pauseEl.hidden && cardEl.hidden) holdClock(false); scene.setRunning(!document.hidden); };
  document.addEventListener('visibilitychange', onVis);

  // ---------- overlays ----------
  const pauseEl = h('div', { class: 'pk-sheet-wrap', hidden: true });
  const settingsEl = h('div', { class: 'pk-sheet-wrap', hidden: true });
  const cardEl = h('div', { class: 'pk-card-wrap', hidden: true });
  const mapEl = h('div', { class: 'pk-map', hidden: true });
  root.append(mapEl, cardEl, pauseEl, settingsEl);
  // while a card (start, win, try again) is up, only the coin counter stays on top of it, so the coins have somewhere to fly
  new MutationObserver(() => root.classList.toggle('has-card', !cardEl.hidden)).observe(cardEl, { attributes: true, attributeFilter: ['hidden'] });
  /** the Garage's 360° view (made when the Garage opens, thrown away when it closes; the lot underneath pauses meanwhile) */
  let turn: Turntable | null = null;
  const closeTurn = () => { if (!turn) return; turn.dispose(); turn = null; scene.setRunning(true); };
  function closeOverlays(): void { closeTurn(); pauseEl.hidden = true; settingsEl.hidden = true; if (play && !play.done && cardEl.hidden && play.started) holdClock(false); }
  function openPause(): void {
    if (!play) return;
    holdClock(true);
    const label = play.endless ? `Endless ${play.n}` : play.mode === 'ch' ? `Challenge ${play.n}` : play.mode === 'tm' ? `Timed ${play.n}` : play.mode === 'season' ? `Holiday lot ${play.n}` : `Level ${play.n}`;
    pauseEl.replaceChildren(h('div', { class: 'pk-sheet pk-pause' },
      sheetHead('Paused', () => closeOverlays()),
      h('span', { class: 'pk-chip pk-labelchip' }, pkicon(play.lvl.t === 'n' || play.lvl.t === 's' ? 'flag' : TYPE_ICON[play.lvl.t], 18), h('b', null, label)),
      big('Resume', 'primary', () => closeOverlays(), '', 'play'),
      h('div', { class: 'pk-grid2' },
        big('Restart', 'soft', () => { closeOverlays(); restart(); }, '', 'restart'),
        big('Settings', 'soft', () => openSettings(true), '', 'gear'),
        big('Level map', 'soft', () => { closeOverlays(); showMap(); }, '', 'map'),
        big('Back to town', 'soft', () => quit(), '', 'town'))));
    pauseEl.hidden = false;
  }
  /** a button: `primary` = the big raspberry one, `soft` = white with a lip, `ghost` = plain words; an optional picture first */
  function big(label: string, kind: 'primary' | 'soft' | 'ghost', onClick: () => void, cls = '', icon?: string): HTMLButtonElement {
    const b = h('button', { class: `pk-big ${kind} ${cls}`, type: 'button' }, icon ? pkicon(icon, kind === 'primary' ? 26 : 20) : null, label);
    b.addEventListener('click', () => { audio.button(); onClick(); });
    return b;
  }
  /** the title row of a sheet: the title and a round close button */
  function sheetHead(title: string, close: () => void): HTMLElement {
    const x = h('button', { class: 'fzx-x pk-x', type: 'button', 'aria-label': 'Close' }, gicon('plus', 16));
    x.addEventListener('click', () => { audio.button(); close(); });
    return h('div', { class: 'pk-sheet-head' }, h('h2', null, title), x);
  }
  /** a short note kept behind a small "?" so rows stay clean */
  function noteBtn(note: string): { q: HTMLElement; text: HTMLElement } {
    const text = h('small', { class: 'pk-note', hidden: true }, note);
    const q = h('button', { class: 'pk-q', type: 'button', 'aria-label': 'What is this?' }, '?');
    q.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); text.hidden = !text.hidden; q.classList.toggle('on', !text.hidden); });
    return { q, text };
  }
  function openSettings(fromPause = false): void {
    if (fromPause) pauseEl.hidden = true;
    const slider = (label: string, key: 'music' | 'sfx', icon: string) => {
      const val = h('output', null, `${Math.round(st.audio[key] * 100)}%`);
      const input = h('input', { type: 'range', min: '0', max: '100', step: '5', value: String(Math.round(st.audio[key] * 100)), 'aria-label': label }) as HTMLInputElement;
      const paint = () => input.style.setProperty('--v', `${input.value}%`);
      paint();
      input.addEventListener('input', () => { st.audio[key] = Number(input.value) / 100; val.textContent = `${input.value}%`; paint(); audio.set({ [key]: st.audio[key] }); });
      input.addEventListener('change', () => { hooks.save(); if (key === 'sfx') audio.coin(); });
      return h('label', { class: 'pk-slider' }, pktile(icon, 38, 'soft'), h('span', { class: 'pk-sl-t' }, h('b', null, label), input), val);
    };
    /** a switch row: a picture, the label (a "?" when there is more to say), a chunky switch; saved at once */
    const toggle = (label: string, note: string, icon: string, get: () => boolean, set: (on: boolean) => void) => {
      const box = h('input', { type: 'checkbox', checked: get() }) as HTMLInputElement;
      box.addEventListener('change', () => { set(box.checked); applyPrefs(); hooks.save(); audio.button(); });
      const n = note ? noteBtn(note) : null;
      return h('div', { class: 'pk-toggle' }, pktile(icon, 38, 'soft'), h('span', { class: 'pk-tl' }, label, n?.q ?? null, n?.text ?? null), h('label', { class: 'pk-switch' }, box, h('i')));
    };
    /** the camera angle: two buttons, one pressed */
    const angle = h('div', { class: 'pk-seg', role: 'group', 'aria-label': 'Camera angle' }, ...(['standard', 'top'] as const).map((v) => {
      const b = h('button', { type: 'button', class: st.prefs.camera === v ? 'on' : '', 'aria-pressed': String(st.prefs.camera === v) }, v === 'standard' ? 'Standard' : 'From above');
      b.addEventListener('click', () => { st.prefs.camera = v; applyPrefs(); scene.fit(); hooks.save(); audio.button(); openSettings(fromPause); });
      return b;
    }));
    const sec = (title: string, ...kids: (HTMLElement | null)[]) => h('div', { class: 'pk-ssec' }, h('h3', null, title), h('div', { class: 'pk-scard' }, ...kids));
    const close = () => { settingsEl.hidden = true; if (fromPause) pauseEl.hidden = false; };
    settingsEl.replaceChildren(h('div', { class: 'pk-sheet pk-settings' },
      sheetHead('Settings', close),
      sec('Sound', slider('Music', 'music', 'music'), slider('Sound effects', 'sfx', 'sound'),
        toggle('Fuzzy voices', 'Their little “eep!” and giggles', 'fuzzy', () => st.prefs.voices, (on) => { st.prefs.voices = on; }),
        toggle('Mute everything', '', 'mute', () => st.audio.mute, (on) => { st.audio.mute = on; audio.set({ mute: on }); }),
        h('p', { class: 'pk-track' }, pkicon('music', 16), h('span', null, audio.trackName))),
      sec('View', h('div', { class: 'pk-row' }, pktile('camera', 38, 'soft'), h('span', null, 'Camera'), angle),
        toggle('Calm motion', siteCalm() ? 'On — your app is set to reduce motion' : 'No confetti or fireworks, gentler bounces', 'leaf', () => st.prefs.calm || siteCalm(), (on) => { st.prefs.calm = on; }),
        toggle('3D Fuzzies', 'Turn off for flat pictures if an older phone feels slow · from the next lot', 'eye', () => !st.prefs.flat, (on) => { st.prefs.flat = !on; if (on) want3d(); })),
      sec('Play', toggle('Relaxed', 'Special levels without the clock or move limit · same rewards', 'hint', () => st.relaxed, (on) => { st.relaxed = on; })),
      big('Done', 'primary', close, '', 'check')));
    settingsEl.hidden = false;
  }

  /** the card before a special level: what's different, then Start (the clock starts there) */
  function showIntro(): void {
    if (!play) return;
    const L = play.lvl, t = L.t;
    const goal: Record<P.LType, { icon: string; text: string; line: string }> = {
      n: { icon: 'flag', text: '', line: '' },
      s: { icon: 'spark', text: 'Bonus', line: 'A trickier lot with a bigger reward' },
      t: { icon: 'timer', text: fmtTime(L.lim ?? 0), line: 'The clock starts when you tap Start' },
      m: { icon: 'moves', text: `${L.lim} moves`, line: 'Every slide counts — plan ahead' },
      d: { icon: 'double', text: '2 star cars', line: 'Get both out through their own exits' },
    };
    const g = goal[t];
    const where = play.endless ? 'Endless Parking' : play.mode === 'tm' ? `Timed Escape ${play.n}` : `Level ${play.n}`;
    const back = h('button', { class: 'pk-round pk-card-back', type: 'button', 'aria-label': 'Level map', title: 'Level map' }, pkicon('back', 22));
    back.addEventListener('click', () => { audio.button(); cardEl.hidden = true; showMap(); });
    const reward = play.endless ? null : h('span', { class: 'pk-chip pk-reward' }, landIcon('coin', 22), h('b', null, `+${play.mode === 'tm' ? P.REWARDS.timed : P.coinsForLevel(play.n)}`));
    cardEl.replaceChildren(h('div', { class: `pk-card pk-intro t-${t}` },
      back,
      heroStage(h('div', { class: 'pk-hero' }, h('img', { class: 'pk-hero-driver', src: driverUrl(st.garage.driver), alt: '' }), heroCar())),
      h('small', null, where),
      h('h2', null, P.TYPE_NAMES[t]),
      h('div', { class: 'pk-chips' }, h('span', { class: 'pk-chip pk-goalchip' }, pkicon(g.icon, 22), g.text ? h('b', null, g.text) : h('b', null, 'Special')), reward),
      h('p', { class: 'pk-line' }, g.line),
      big('Start', 'primary', () => { cardEl.hidden = true; if (play) { play.started = true; play.t0 = performance.now(); play.paused = 0; play.pauseAt = 0; play.timeLeft = play.lvl.lim ?? 0; play.warned = 99; paintTimer(); tutorial(); } }, 'pk-next', 'play')));
    cardEl.hidden = false;
  }

  function fail(why: 'time' | 'moves'): void {
    if (!play || play.done) return;
    play.done = true; drag = null; scene.select(-1); audio.fail();
    if (why === 'time') { play.timeLeft = 0; paintTimer(); }
    paintHud();
    const at = play;
    cardEl.replaceChildren(h('div', { class: 'pk-card pk-fail' },
      heroStage(h('div', { class: 'pk-hero small' }, h('img', { class: 'pk-fail-driver', src: driverUrl(st.garage.driver), alt: '' }), h('span', { class: 'pk-badge-ic' }, pktile(why === 'time' ? 'timer' : 'moves', 44, 'grey')))),
      h('h2', null, why === 'time' ? 'Time’s up!' : 'Out of moves!'),
      h('p', { class: 'pk-line' }, 'So close! Same lot, and you keep every coin.'),
      big('Try again', 'primary', () => { cardEl.hidden = true; start(at.n, at.mode, at.lvl); }, 'pk-next', 'restart'),
      big('Level map', 'soft', () => { cardEl.hidden = true; showMap(); }, '', 'map')));
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
    const plain = at.endless || at.mode === 'season';
    const notes: { icon: string; text: string }[] = [];
    if (champ) notes.push({ icon: 'trophy', text: 'Golden Parking Trophy is waiting in Build → Decor. Endless Parking is open!' });
    else if (decor) notes.push({ icon: 'events', text: `New decoration: ${DECOR_NAMES[decor] ?? 'a surprise'} — find it in Build → Decor` });
    if (paintEarned) notes.push({ icon: 'paint', text: 'New holiday paint — pick it in the Garage' });
    if (at.mode === 'journey' && clear?.unlockedNext) notes.push(...unlockNotes(next));
    const stat = (icon: string, label: string, value: string, flag = '') => h('div', { class: 'pk-stat' }, pktile(icon, 36, 'soft'), h('b', null, value), h('small', null, label), flag ? h('em', null, flag) : null);
    const goal = (at.mode === 'journey' || at.mode === 'ch') ? starGoal(at) : 0;
    const hint = !plain && (clear || ladder) && stars < 3 && goal ? h('p', { class: 'pk-starhint' }, pkStar(true, 18), at.hinted ? 'No hints for 3 stars' : `${goal} moves or fewer for 3 stars`) : null;
    const card = h('div', { class: `pk-card pk-win ${special ? 'special' : ''}` },
      heroStage(h('img', { class: 'pk-win-fuzzy', src: driverUrl(at.n % 15), alt: '' })),
      special ? h('div', { class: 'pk-ribbon' }, at.mode === 'journey' && P.isMilestone(at.n) ? `Milestone ${at.n}` : P.TYPE_NAMES[at.lvl.t]) : null,
      h('h2', null, champ ? 'Parking Champion!' : plain ? 'Lot cleared!' : 'Parked it!'),
      plain ? h('span', { class: 'pk-chip pk-labelchip' }, pkicon('moves', 18), h('b', null, `${at.moves} moves`)) : starsEl,
      plain ? null : h('div', { class: 'pk-win-stats' },
        stat('moves', 'Moves', String(at.moves), clear?.bestMoves && clear.before ? 'Best!' : ''),
        stat('flag', 'Fewest', String(at.lvl.o)),
        stat('timer', 'Time', fmtTime(secs))),
      hint,
      ...notes.map((n) => h('p', { class: 'pk-champ' }, pktile(n.icon, 30, 'soft'), h('span', null, n.text))),
      coinsLine,
      h('div', { class: 'pk-win-btns' },
        at.mode === 'journey' && at.n >= P.LEVELS ? big('Endless Parking', 'primary', () => startEndless(), 'pk-next', 'endless')
          : lastOfMode ? big('Level map', 'primary', () => showMap(), 'pk-next', 'map')
          : big(at.endless ? 'Next puzzle' : 'Next level', 'primary', () => { if (at.endless) void startEndless(); else start(next, at.mode); }, 'pk-next', 'next'),
        h('div', { class: 'pk-win-sec' },
          big('Replay', 'soft', () => start(at.n, at.mode, at.lvl), '', 'restart'),
          big('Level map', 'soft', () => showMap(), '', 'map'))));
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
        if (p.ok && p.coins > 0) { total += p.coins; coinsLine.append(h('div', { class: 'pk-coin-row' }, landIcon('coin', 26), h('b', null, `+${p.coins.toLocaleString()}`), h('small', null, why))); }
        else if (p.pending) coinsLine.append(h('div', { class: 'pk-coin-row muted' }, h('small', null, `${why}: we’ll add your coins when you’re back online.`)));
      }
      if (total) flyCoins(card, Math.min(14, 4 + Math.round(total / 40)));
    } else if (!at.endless) coinsLine.append(h('small', { class: 'pk-muted' }, 'Coins already collected — replays are for stars!'));
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
  const unlockNotes = (n: number): { icon: string; text: string }[] => {
    const notes: { icon: string; text: string }[] = [];
    if ((n - 1) % LEVELS_PER_ENV === 0 && n > 1) notes.push({ icon: 'map', text: `New neighbourhood: ${ENVS[envIndexOf(n)].name}` });
    if (n === OPEN_AT.ch) notes.push({ icon: 'flag', text: 'Challenge mode is open — big, crowded lots' });
    if (n === OPEN_AT.tm) notes.push({ icon: 'timer', text: 'Timed Escape is open — beat the clock' });
    const style = P.STYLE_NAMES.findIndex((_, k) => P.styleUnlockedAt(k) === n && k > 0); if (style > 0) notes.push({ icon: 'car', text: `New star car in your Garage: the ${P.STYLE_NAMES[style]}` });
    const drv = Array.from({ length: 15 }, (_, d) => d).find((d) => P.driverUnlockedAt(d) === n && n > 1); if (drv !== undefined) notes.push({ icon: 'fuzzy', text: `${DRIVER_NAMES[drv]} wants to drive — pick them in the Garage` });
    return notes;
  };
  let mapMode: 'journey' | 'ch' | 'tm' | 'season' = 'journey';
  let page = Math.floor((Math.max(1, st.top) - 1) / PAGE);
  const ladderPage = { ch: 0, tm: 0 };
  const MODE_ICON = { journey: 'map', ch: 'trophy', tm: 'timer', season: 'events' } as const;
  function showMap(): void {
    play = null; drag = null; busy = false; closeOverlays(); cardEl.hidden = true; tip.hidden = true; hand.hidden = true;
    top.hidden = true; bottom.hidden = true;
    const ev = eventNow();
    if (mapMode === 'season' && !ev) mapMode = 'journey';
    audio.mood(mapMode === 'tm' ? 'timed' : mapMode === 'season' ? 'season' : { env: envIndexOf(mapMode === 'journey' ? page * PAGE + 1 : 1) });
    const close = h('button', { class: 'pk-round', type: 'button', 'aria-label': 'Back to Fuzzies Land', title: 'Back to Fuzzies Land' }, pkicon('close', 22));
    close.addEventListener('click', () => { audio.button(); quit(); });
    const gear = h('button', { class: 'pk-round', type: 'button', 'aria-label': 'Settings', title: 'Settings — sound, camera, motion' }, pkicon('gear', 24));
    gear.addEventListener('click', () => { audio.button(); openSettings(); });
    const garageB = h('button', { class: 'pk-round pk-garage-btn', type: 'button', 'aria-label': 'Garage', title: 'Garage — your star car and driver' }, h('img', { src: driverUrl(st.garage.driver), alt: '' }));
    garageB.addEventListener('click', () => { audio.button(); openGarage(); });
    // the mode tabs: Journey · Challenge · Timed · (a holiday)
    const tab = (id: typeof mapMode, label: string, sub: string, locked: string | null, lockShort = '') => {
      const b = h('button', { class: `pk-tab ${mapMode === id ? 'on' : ''} ${locked ? 'locked' : ''}`, type: 'button', 'aria-pressed': String(mapMode === id), 'data-mode': id }, locked ? pkicon('lock', 24) : pkicon(MODE_ICON[id], 24), h('b', null, label), h('small', null, locked ? lockShort : sub));
      b.addEventListener('click', () => { audio.button(); if (locked) { say(locked); audio.blocked(); return; } mapMode = id; showMap(); });
      return b;
    };
    const chDone = [...st.ch.stars].filter((c) => c !== '0').length, tmDone = [...st.tm.stars].filter((c) => c !== '0').length;
    const tabs = h('div', { class: 'pk-tabs', role: 'tablist' },
      tab('journey', 'Journey', `${P.doneCount(st)}/${P.LEVELS}`, null),
      tab('ch', 'Challenge', `${chDone}/${P.LADDER}`, st.top >= OPEN_AT.ch ? null : `Opens at level ${OPEN_AT.ch}`, `Lv ${OPEN_AT.ch}`),
      tab('tm', 'Timed', `${tmDone}/${P.LADDER}`, st.top >= OPEN_AT.tm ? null : `Opens at level ${OPEN_AT.tm}`, `Lv ${OPEN_AT.tm}`),
      ev ? tab('season', ev.holiday.short, `${st.season[ev.key] ?? 0}/${P.SEASON_SET}`, null) : '');
    const header = h('div', { class: 'pk-map-top' }, close,
      h('div', { class: 'pk-title' }, h('b', null, 'Parking Escape'),
        h('div', { class: 'pk-title-chips' }, h('span', { class: 'pk-mini' }, pkStar(true, 18), h('b', null, String(P.totalStars(st)))), h('span', { class: 'pk-mini' }, landIcon('coin', 18), h('b', null, setup.coins().toLocaleString())))),
      garageB, gear);
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
  /** a winding candy road of numbered stops: chunky nodes on a wavy path, the road you've travelled in raspberry, stars under each */
  function board(first: number, count: number, info: (n: number) => { open: boolean; stars: number; badge?: string; mile?: string; cur: boolean }, pick: (n: number, open: boolean) => void): HTMLElement {
    const nodes: HTMLElement[] = [];
    const cols = 5, rows = Math.ceil(count / cols), ROW = 118; // the art is 500 wide × (rows × 118) tall; nodes sit in percentages of it
    const pts: { x: number; y: number }[] = []; let lastOpen = 0;
    for (let k = 0; k < count; k++) {
      const n = first + k, row = Math.floor(k / cols), colRaw = k % cols, col = row % 2 ? cols - 1 - colRaw : colRaw;
      const x = col * 100 + 50, y = (row + 0.5) * ROW + 15 * Math.sin((colRaw / 4) * Math.PI * 2);
      pts.push({ x, y });
      const i = info(n);
      if (i.open) lastOpen = k;
      const b = h('button', { class: `pk-node ${i.open ? '' : 'locked'} ${i.mile ? 'mile' : ''} ${i.cur ? 'cur' : ''} ${i.stars ? 'done' : ''}`, type: 'button', style: `left:${(x / 5).toFixed(2)}%;top:${((y / (rows * ROW)) * 100).toFixed(2)}%`, 'data-level': String(n), 'aria-label': `Lot ${n}${i.open ? '' : ' (locked)'}` },
        h('span', { class: 'pk-node-n' }, i.open ? String(n) : ''),
        i.open ? null : h('span', { class: 'pk-node-lock' }, pkicon('lock', 22)),
        i.badge && i.open ? h('span', { class: 'pk-node-badge' }, pkicon(i.badge, 14)) : null,
        i.mile ? h('span', { class: 'pk-node-gift' }, landIcon('coin', 16), i.mile) : null,
        i.stars ? starRow(i.stars, 'tiny') : null,
        i.cur ? h('img', { class: 'pk-node-car', src: driverUrl(st.garage.driver), alt: '' }) : null);
      b.addEventListener('click', () => { audio.button(); pick(n, i.open); });
      nodes.push(b);
    }
    // a smooth curve through the stops (Catmull-Rom turned into Béziers); the same curve up to the last open stop is the travelled part
    const curve = (upTo: number) => {
      let d = `M${pts[0].x} ${pts[0].y}`;
      for (let k = 0; k < upTo; k++) {
        const p0 = pts[Math.max(0, k - 1)], p1 = pts[k], p2 = pts[k + 1], p3 = pts[Math.min(pts.length - 1, k + 2)];
        d += ` C${(p1.x + (p2.x - p0.x) / 6).toFixed(1)} ${(p1.y + (p2.y - p0.y) / 6).toFixed(1)} ${(p2.x - (p3.x - p1.x) / 6).toFixed(1)} ${(p2.y - (p3.y - p1.y) / 6).toFixed(1)} ${p2.x} ${p2.y}`;
      }
      return d;
    };
    const road = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); road.setAttribute('class', 'pk-road'); road.setAttribute('viewBox', `0 0 500 ${rows * ROW}`); road.setAttribute('preserveAspectRatio', 'none');
    const all = curve(pts.length - 1);
    road.innerHTML = `<path d="${all}" class="pk-road-edge"/><path d="${all}" class="pk-road-top"/><path d="${all}" class="pk-road-line"/>${lastOpen > 0 ? `<path d="${curve(lastOpen)}" class="pk-road-done"/>` : ''}`;
    const el = h('div', { class: 'pk-board', style: `aspect-ratio: 500 / ${rows * ROW}` }, h('div', { class: 'pk-board-deco' }), road, ...nodes);
    return el;
  }
  /** the neighbourhood banner: an illustrated strip, the name on a ribbon, a small chip, arrows to the next / last part */
  const banner = (envI: number, title: string, chip: HTMLElement[], nav?: { at: number; pages: number; go: (p: number) => void }) => {
    const env = ENVS[envI];
    const arrow = (dir: -1 | 1) => {
      const b = h('button', { class: `pk-round pk-dist-${dir < 0 ? 'prev' : 'next'}`, type: 'button', 'aria-label': dir < 0 ? 'Previous' : 'Next', disabled: nav ? (dir < 0 ? nav.at === 0 : nav.at === nav.pages - 1) : true }, pkicon(dir < 0 ? 'back' : 'next', 22));
      b.addEventListener('click', () => { audio.button(); nav?.go(nav.at + dir); });
      return b;
    };
    return h('div', { class: 'pk-district' }, envBanner(env.id, env.sky, env.lawn),
      nav ? arrow(-1) : null, nav ? arrow(1) : null,
      h('div', { class: 'pk-dist-chips' }, ...chip),
      h('div', { class: 'pk-dist-ribbon' }, h('b', null, title)));
  };
  const miniChip = (...kids: (HTMLElement | SVGElement | string)[]) => h('span', { class: 'pk-mini' }, ...kids);
  function journeyMap(): (HTMLElement | string)[] {
    const pages = P.LEVELS / PAGE;
    page = Math.max(0, Math.min(pages - 1, page));
    const first = page * PAGE + 1;
    const envI = envIndexOf(first), env = ENVS[envI], part = (page % (LEVELS_PER_ENV / PAGE)) + 1;
    const pageStars = Array.from({ length: PAGE }, (_, k) => P.starsOf(st, first + k)).reduce((a, b) => a + b, 0);
    const envOpen = st.top >= first;
    const relaxBox = h('input', { type: 'checkbox', checked: st.relaxed }) as HTMLInputElement;
    const relax = h('label', { class: 'pk-relax', title: 'No timers or move limits on the special levels — same rewards' }, h('span', { class: 'pk-switch' }, relaxBox, h('i')), h('b', null, 'Relaxed'));
    relaxBox.addEventListener('change', () => { st.relaxed = relaxBox.checked; hooks.save(); audio.button(); showMap(); });
    const playN = Math.min(P.LEVELS, st.top);
    const endlessCard = P.endlessOpen(st) && page === pages - 1 ? h('button', { class: 'pk-endless', type: 'button' }, pktile('endless', 44), h('b', null, 'Endless Parking'), h('small', null, `${st.endless.done} solved · +${P.REWARDS.endless} coins each`)) : null;
    endlessCard?.addEventListener('click', () => { audio.button(); void startEndless(); });
    const endlessNow = st.top > P.LEVELS - 1 && P.starsOf(st, P.LEVELS);
    return [
      banner(envI, env.name, [envOpen ? miniChip(pkStar(true, 16), h('b', null, `${pageStars}/${PAGE * 3}`), h('small', null, `Part ${part}`)) : miniChip(pkicon('lock', 14), h('b', null, `Level ${first}`))], { at: page, pages, go: (p) => { page = p; showMap(); } }),
      board(first, PAGE, (n) => { const t = P.typeOf(n); return { open: P.unlocked(st, n), stars: P.starsOf(st, n), badge: t !== 'n' && !(st.relaxed && (t === 't' || t === 'm')) ? TYPE_ICON[t] : undefined, mile: P.isMilestone(n) ? '250' : undefined, cur: n === st.top && P.starsOf(st, n) === 0 }; },
        (n, open) => { if (!open) { say(`Finish level ${st.top} first`); audio.blocked(); return; } start(n); }),
      endlessCard ?? '',
      h('div', { class: 'pk-map-bottom' }, relax, bigPlay(endlessNow ? 'Endless' : 'Play', endlessNow ? '' : String(playN), () => { if (P.starsOf(st, P.LEVELS) && st.top >= P.LEVELS) void startEndless(); else start(playN); })),
    ];
  }
  /** the big Play button under the map: the word and the level it starts */
  function bigPlay(label: string, level: string, onClick: () => void): HTMLButtonElement {
    const b = h('button', { class: 'pk-big primary pk-play', type: 'button' }, pkicon('play', 26), h('span', null, label), level ? h('em', null, level) : null);
    b.addEventListener('click', () => { audio.button(); onClick(); });
    return b;
  }
  function ladderMap(mode: 'ch' | 'tm' | 'season', ev: ActiveEvent | null): (HTMLElement | string)[] {
    if (mode === 'season' && ev) {
      const done = st.season[ev.key] ?? 0, next = Math.min(P.SEASON_SET, done + 1);
      return [
        banner(6, `${ev.holiday.name}`, [miniChip(pkStar(true, 16), h('b', null, `${done}/${P.SEASON_SET}`)), miniChip(pkicon('timer', 14), h('b', null, `${ev.daysLeft}d left`)), miniChip(landIcon('coin', 16), h('b', null, `+${P.REWARDS.season}`))]),
        board(1, P.SEASON_SET, (n) => ({ open: n <= next, stars: n <= done ? 3 : 0, cur: n === next && done < P.SEASON_SET }), (n, open) => { if (!open) { say(`Solve lot ${next} first`); audio.blocked(); return; } start(n, 'season'); }),
        h('div', { class: 'pk-map-bottom' }, bigPlay(done >= P.SEASON_SET ? 'Again' : 'Play', done >= P.SEASON_SET ? '' : String(next), () => start(done >= P.SEASON_SET ? 1 : next, 'season'))),
      ];
    }
    const L = st[mode as 'ch' | 'tm'], key = mode as 'ch' | 'tm';
    const pages = P.LADDER / PAGE;
    ladderPage[key] = Math.max(0, Math.min(pages - 1, ladderPage[key]));
    const first = ladderPage[key] * PAGE + 1;
    const name = mode === 'ch' ? 'Challenge' : 'Timed Escape';
    const reward = mode === 'ch' ? P.REWARDS.challenge : P.REWARDS.timed;
    const playN = Math.min(P.LADDER, L.top);
    return [
      banner(mode === 'ch' ? 8 : 5, `${name} ${first}–${first + PAGE - 1}`, [miniChip(landIcon('coin', 16), h('b', null, `+${reward}`)), mode === 'ch' ? miniChip(pkStar(true, 16), h('small', null, 'goal moves')) : miniChip(pkicon('timer', 14), h('small', null, 'beat the clock'))], { at: ladderPage[key], pages, go: (p) => { ladderPage[key] = p; showMap(); } }),
      board(first, PAGE, (n) => ({ open: n <= L.top, stars: Number(L.stars[n - 1]), mile: n === 25 || n === P.LADDER ? String(P.REWARDS.ladderMilestone) : undefined, badge: mode === 'tm' ? 'timer' : undefined, cur: n === L.top && L.stars[n - 1] === '0' }),
        (n, open) => { if (!open) { say(`Finish ${name} ${L.top} first`); audio.blocked(); return; } start(n, key); }),
      h('div', { class: 'pk-map-bottom' }, bigPlay('Play', String(playN), () => start(playN, key))),
    ];
  }
  /** the garage: your star car's shape and paint and who drives it — looks only, the puzzles are the same for every car */
  function openGarage(): void {
    if (!turn) { turn = turntable({ calm: scene.calm }); scene.setRunning(false); }
    turn.show(st.garage.style, st.garage.paint ? holidayPaint(st.garage.paint) : HERO, st.garage.driver);
    const section = (title: string, count: string, ...kids: HTMLElement[]) => h('div', { class: 'pk-gsec' }, h('h3', null, title, h('em', null, count)), h('div', { class: 'pk-ggrid' }, ...kids));
    const pickBtn = (on: boolean, open: boolean, lockText: string, label: string, art: HTMLElement | SVGElement, choose: () => void) => {
      const b = h('button', { class: `pk-gitem ${on ? 'on' : ''} ${open ? '' : 'locked'}`, type: 'button', 'aria-pressed': String(on) }, art, h('small', null, open ? label : lockText), on ? h('i', { class: 'pk-gcheck' }, gicon('check', 12)) : null, open ? null : h('i', { class: 'pk-glock' }, pkicon('lock', 16)));
      b.addEventListener('click', () => { audio.button(); if (!open) { say(lockText); audio.blocked(); return; } choose(); hooks.save(); openGarage(); });
      return b;
    };
    const carColor = st.garage.paint ? holidayPaint(st.garage.paint) : '#e0527f';
    const styles = P.STYLE_NAMES.map((nm, k) => pickBtn(st.garage.style === k, P.styleOpen(st, k), `Level ${P.styleUnlockedAt(k)}`, nm, h('span', { class: `pk-gcar s${k}` }, carArt(k, carColor)), () => { st.garage.style = k; }));
    const drivers = DRIVER_NAMES.map((nm, d) => pickBtn(st.garage.driver === d, P.driverOpen(st, d), `Level ${P.driverUnlockedAt(d)}`, nm, h('img', { src: driverUrl(d), alt: '' }), () => { st.garage.driver = d; }));
    const paints = ['', ...st.paints].map((id) => pickBtn(st.garage.paint === id, true, '', id ? id.replace(/-(\d{4})$/, ' $1').replace(/^./, (c) => c.toUpperCase()) : 'Classic pink', h('span', { class: 'pk-gpaint', style: `--c:${id ? holidayPaint(id) : HERO}` }), () => { st.garage.paint = id; }));
    const nOpenStyles = P.STYLE_NAMES.filter((_, k) => P.styleOpen(st, k)).length, nOpenDrivers = DRIVER_NAMES.filter((_, d) => P.driverOpen(st, d)).length;
    const why = noteBtn('Just for looks — every puzzle stays the same for every car.');
    settingsEl.replaceChildren(h('div', { class: 'pk-sheet pk-garage' },
      h('h2', null, 'Garage', why.q),
      turn.el,
      section('Star car', `${nOpenStyles}/${P.STYLE_NAMES.length}`, ...styles), section('Driver', `${nOpenDrivers}/${DRIVER_NAMES.length}`, ...drivers),
      section('Paint', `${paints.length}`, ...paints),
      why.text,
      big('Done', 'primary', () => { closeTurn(); settingsEl.hidden = true; showMap(); }, '', 'check')));
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
