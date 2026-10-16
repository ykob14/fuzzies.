/** Fuzzy Crossing screen: start card, HUD, touch controls and the game-over summary. */
import type { Screen } from '../app';
import { Crossing, SKINS, type Fx, type Hud, type LevelResult, type Result, type Skin, type View } from '../../game/crossing';
import { View2D } from '../../game/view2d';
import { accounts } from '../../core/account';
import { rewards } from '../../core/rewards';
import { track } from '../../core/missions';
import { travel } from '../travel';
import { h, btn, icon } from '../dom';
import { coinMark } from '../../crossing/ui/kit';
import { isTouch } from '../../core/util';
import * as store from '../../crossing/store';
import { initCrossing } from '../../crossing/init';
import * as net from '../../crossing/net';
import { BOARDS, BOARD_IDS } from '../../crossing/rewards-weekly';
import { equippedCharacter } from '../../crossing/store';
import type { EventId } from '../../crossing/characters';
import { createHub, type NavTarget } from '../../crossing/hub';
import { eventItems } from '../../crossing/events';
import { createEventFx } from '../../crossing/ui/eventFx';
import '../../crossing/ui/hub.css';
import { renderLobby } from '../../crossing/ui/lobby';
import { renderResults } from '../../crossing/ui/results';
import '../../crossing/ui/boards-menu.css';
import '../../crossing/ui/worlds.css';
import '../../crossing/ui/endless.css';
import { Road } from '../../crossing/road';
import { MAX_LIVES, ROWS_PER_STRETCH, dailySeed, distanceOf, endlessRewards, freshSeed, livesAfter, utcDay, withLives, type Stretch } from '../../crossing/endless';
import type { LevelDef } from '../../crossing/sim';
import { getLevel, MILESTONE_ICON, MILESTONE_NAME } from '../../crossing/levels';
import { WORLDS, WORLD_BONUS, LEVELS_PER_WORLD, WORLD_COUNT, levelOpen, worldOpen, worldFlawless } from '../../crossing/worlds';
import { worldCleared } from '../../crossing/store';

type Dir = 'up' | 'down' | 'left' | 'right';
/** the row the Fuzzy starts on (rows reached = START_ROW_ − row) */
const START_ROW_ = 12;
/** one Endless Crossing run in progress */
interface ERun { road: Road; seed: number; daily: boolean; day: string; /** stretch being played (0-based) */ n: number; lives: number; score: number; cleared: number; /** rows reached in the stretch being played (best of this stretch's lives) */ progress: number; coinsAtStart: number; xpAtStart: number; passAtStart: number; ending: boolean; /** between two stretches (the next one is being set up) */ between: boolean }
/** what the next game is: the Classic endless loop or one world level */
type PlayMode = { kind: 'classic' } | { kind: 'world'; world: number; level: number } | { kind: 'endless'; def: LevelDef };
/** seconds the "World 3 · Level 7" banner shows before a world level starts (the level clock is primed to reach 0 then) */
const BANNER = 1.7;

export function playScreen(): Screen {
  const a = accounts.current!;
  /** the equipped collectible Fuzzy as the game's look (colours for the old renderer, the whole character for the new one) */
  const skinOf = (): Skin => { const c = equippedCharacter(); return { id: c.id, name: c.name, cost: 0, colors: c.color, character: c }; };
  void SKINS;

  const wrap = h('div', { class: 'game-wrap' });
  const overlay = h('div', { class: 'game-overlay' });
  const hud = {
    score: h('b', null, '0'), best: h('b', null, String(a.stats.bestScore)), level: h('b', null, '1'),
    lives: h('span', { class: 'lives' }), fz: h('b', null, '0'), time: h('div', { class: 'timebar-fill' }),
  };
  const lvlLabel = h('small', null, 'Level');
  const pauseBtn = btn(null, { icon: 'pause', kind: 'soft', size: 'sm', title: 'Pause (P)', onClick: () => togglePause() });
  const soundBtn = btn(null, { icon: a.settings.sound ? 'sound' : 'mute', kind: 'soft', size: 'sm', title: 'Sound', onClick: () => {
    accounts.update((x) => (x.settings.sound = !x.settings.sound));
    soundBtn.replaceChildren(icon(a.settings.sound ? 'sound' : 'mute', 16));
  } });
  const hudBar = h('div', { class: 'game-hud' },
    h('div', { class: 'hud-item' }, h('small', null, 'Score'), hud.score),
    h('div', { class: 'hud-item' }, h('small', null, 'Best'), hud.best),
    h('div', { class: 'hud-item' }, lvlLabel, hud.level),
    h('div', { class: 'hud-item' }, h('small', null, 'Lives'), hud.lives),
    h('div', { class: 'hud-item hud-fz', title: 'Crossing Coins this run' }, coinMark(20), hud.fz),
    h('div', { class: 'hud-actions' }, soundBtn, pauseBtn));
  const timebar = h('div', { class: 'timebar' }, hud.time);

  const pad = (d: Dir, ic: 'up' | 'down' | 'back' | 'play') => {
    const b = h('button', { class: `dpad dpad-${d}`, type: 'button', 'aria-label': `Hop ${d}` }, icon(ic, 26));
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); game?.input(d); b.classList.add('on'); });
    for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, () => b.classList.remove('on'));
    return b;
  };
  // on a phone the whole board is the control (tap = hop forward, swipe = sideways / back), so the little arrow buttons are gone
  const controls = h('div', { class: 'dpad-wrap desktop' }, pad('up', 'up'), pad('left', 'back'), pad('right', 'play'), pad('down', 'down'));

  const eventFx = createEventFx(isTouch());
  let game: Crossing | null = null;
  let mode: PlayMode = { kind: 'classic' };
  /** the level complete / failed card is showing (keys must not restart anything behind it) */
  let levelCard = false;
  const goalPill = h('div', { class: 'fzw-goalpill', hidden: true });
  /** coins and XP earned in the game that is being played (shown on the game over card) */
  let runCoins = 0, runStartCoins = 0, runStartXp = 0, runStartPass = 1;

  /** Endless Crossing: the run being played (null in Classic and the worlds) */
  let erun: ERun | null = null;
  function setHud(s: Hud): void {
    const e = erun;
    hud.score.textContent = String((e?.score ?? 0) + s.score);
    hud.best.textContent = e ? String(Math.max(store.save().endless.best, distanceOf(e.cleared, e.progress))) : String(s.best);
    hud.level.textContent = e ? String(distanceOf(e.cleared, e.progress)) : s.goal && mode.kind === 'world' ? `${mode.world}-${mode.level}` : String(s.level);
    lvlLabel.textContent = e ? 'Rows' : 'Level';
    hud.fz.textContent = String(runCoins);
    const maxLives = e ? MAX_LIVES : s.goal?.maxLives ?? 3;
    hud.lives.textContent = '❤'.repeat(Math.max(0, s.lives)) + '♡'.repeat(Math.max(0, maxLives - s.lives));
    if (e) {
      goalPill.hidden = false;
      const key = `e${e.n}`;
      if (goalPill.dataset.k !== key) { goalPill.dataset.k = key; goalPill.replaceChildren(h('span', { class: 'fze-pill', title: 'Stretch' }, '🏁 ', h('b', null, `Stretch ${e.n + 1}`), e.daily ? h('i', null, ' · daily road') : null)); }
    } else goalPill.hidden = !s.goal;
    if (s.goal && !e) {
      const g = s.goal;
      const parts: Node[] = [h('span', { class: 'nests', title: 'Nests' }, '🪺 ', ...Array.from({ length: g.nestsNeed }, (_, i) => h('i', { class: i < g.nests ? 'on' : '' }, '●')))];
      if (g.coinsNeed) parts.push(h('span', { title: 'Coins to open the nests' }, coinMark(14), ` ${Math.min(g.coins ?? 0, g.coinsNeed)}/${g.coinsNeed}`));
      if (g.timeLeft !== undefined) parts.push(h('span', { class: g.timeLeft < 10 ? 't-low' : '' }, `⏱ ${Math.ceil(g.timeLeft)}`));
      const key = parts.map((p) => p.textContent).join('|');
      if (goalPill.dataset.k !== key) { goalPill.dataset.k = key; goalPill.replaceChildren(...parts); }
    }
    hud.time.style.transform = `scaleX(${s.time})`;
    hud.time.classList.toggle('low', s.time < 0.25);
  }

  // The realistic renderer (Three.js) is a separate download, fetched only when the game opens.
  const hasWebGL = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } })();
  const want3D = () => hasWebGL && a.settings.gameGfx !== 'classic';
  const load3D = want3D() ? import('../../game/view3d') : null;
  let view: View | null = null;
  let viewMode = '';
  let gen = 0;

  async function makeView(): Promise<View> {
    const mode = want3D() ? 'real' : 'classic';
    if (view && viewMode === mode) return view;
    view?.destroy();
    wrap.replaceChildren();
    const canvas = h('canvas', { class: 'game-canvas', 'aria-label': 'Fuzzy Crossing game board', tabindex: '0' });
    wrap.append(canvas);
    viewMode = mode;
    if (mode === 'real') {
      wrap.classList.add('loading');
      try {
        const { View3D } = await (load3D ?? import('../../game/view3d'));
        // the owner's 3D Fuzzy as the hero (Settings → Deluxe 3D Fuzzies); a slow download never holds the game up
        const deluxe = a.settings.fuzzyLook !== 'classic';
        const glb = deluxe ? await Promise.race([import('../../game/fuzzyGlb').then((m) => m.loadFuzzyGlb()), new Promise<null>((r) => setTimeout(() => r(null), 6000))]) : null;
        view = new View3D(canvas, isTouch(), !!glb);
      } catch (e) {
        console.error(e);
        viewMode = 'classic';
        view = new View2D(canvas);
      }
      wrap.classList.remove('loading');
    } else view = new View2D(canvas);
    return view;
  }

  async function newGame(m: PlayMode = { kind: 'classic' }): Promise<void> {
    const my = ++gen;
    introRunning = false;
    skipBtn.hidden = true;
    bannerEl?.remove();
    levelCard = false;
    pauseBtn.replaceChildren(icon('pause', 16));
    game?.destroy();
    game = null;
    mode = m;
    if (m.kind !== 'endless' && erun) { erun.road.destroy(); erun = null; }
    const v = await makeView();
    if (my !== gen) return; // a newer request replaced this one
    const def = m.kind === 'world' ? getLevel(m.world, m.level) : m.kind === 'endless' ? m.def : undefined;
    game = new Crossing(v, skinOf(), a.stats.bestScore, {
      hud: setHud,
      fuzzy: (n) => { rewards.earn(n, 'Fuzzy Crossing', true); track('gameFuzzies', n); },
      over: (r) => showOver(r),
      event: (e) => onGameEvent(e),
      levelEnd: (r) => (erun ? endlessStretchEnd(r) : showLevelEnd(r)),
    }, def ? { mode: 'world', level: def } : { mode: 'classic' });
    game.eventItems = eventItems(); // seasonal pickups only while an event is on
    eventFx.refresh();
    runCoins = 0;
    setHud({ score: 0, level: 1, lives: def?.lives ?? 3, fuzzies: 0, time: 1, best: a.stats.bestScore, goal: def ? { nests: 0, nestsNeed: def.goal.nests, coins: def.goal.coins ? 0 : undefined, coinsNeed: def.goal.coins, timeLeft: def.goal.timeLimit, maxLives: def.lives } : undefined });
    requestAnimationFrame(() => dispatchEvent(new Event('fz:scene-ready'))); // lets the travel transition open up
  }

  /** what happens in the game → the site's missions (as before) and Fuzzy Crossing's own save (coins, Fuzzy Pass XP, achievements) */
  function onGameEvent(e: Fx): void {
    if (erun && e.kind === 'advance') erun.progress = Math.max(erun.progress, START_ROW_ - e.row);
    if (e.kind === 'home') track('nest');
    if (e.kind === 'level') track('level', e.level);
    let ev: store.CrossingEvent | null = null;
    if (e.kind === 'collect' && e.item) ev = { kind: 'eventItem', event: e.item.event as EventId };
    else if (e.kind === 'collect') ev = { kind: 'pickup', gold: e.gold };
    else if (e.kind === 'home') ev = { kind: 'nest' };
    else if (e.kind === 'level') ev = { kind: 'levelClear' };
    else if (e.kind === 'hop') ev = { kind: 'hop' };
    else if (e.kind === 'advance') ev = { kind: 'advance' };
    else if (e.kind === 'train-passed') ev = { kind: 'trainPassed' };
    else if (e.kind === 'death') ev = { kind: 'death', how: e.how === 'zap' ? 'other' : e.how };
    if (!ev) return;
    runCoins += store.coinsFor(ev);
    store.report(ev);
    hud.fz.textContent = String(runCoins);
  }


  // ================= Endless Crossing =================
  // A run is a chain of proven stretches (crossing/endless.ts). Each stretch is one board the engine plays like a world level whose only
  // goal is a nest; clearing it fades to the next one. Lives carry over (a spare life every few stretches), the score adds up, and
  // distance (rows) is what the records and the unlockable Fuzzies count.
  const wipe = h('div', { class: 'fze-wipe', 'aria-hidden': 'true' });
  const paintWipe = (on: boolean) => wipe.classList.toggle('on', on);
  const pause = (ms: number) => new Promise<void>((r) => setTimeout(r, a.settings.reduceMotion ? Math.min(ms, 60) : ms));

  async function startEndless(daily: boolean): Promise<void> {
    erun?.road.destroy();
    const seed = daily ? dailySeed() : freshSeed();
    const e: ERun = { road: new Road(seed), seed, daily, day: utcDay(), n: 0, lives: MAX_LIVES, score: 0, cleared: 0, progress: 0, coinsAtStart: store.save().coinsEarned, xpAtStart: store.save().xp, passAtStart: store.passInfo().level, ending: false, between: false };
    erun = e;
    runCoins = 0;
    levelCard = true; // keys must not start anything behind the "building the road" card
    overlay.hidden = false;
    overlay.replaceChildren(h('div', { class: 'go-card small fze-prep' }, h('div', { class: 'fze-spin', 'aria-hidden': 'true' }), h('h2', null, daily ? "Building today's road…" : 'Building your road…'), h('p', { class: 'muted' }, 'Checking every lane can be crossed.')));
    accounts.update((x) => x.stats.gamesPlayed++);
    track('game');
    store.report({ kind: 'start', mode: 'endless' });
    e.coinsAtStart = store.save().coinsEarned; e.xpAtStart = store.save().xp; e.passAtStart = store.passInfo().level;
    await playStretch(e, true);
  }

  async function playStretch(e: ERun, first = false): Promise<void> {
    let st: Stretch;
    try { st = await e.road.get(e.n); } catch (err) { console.error(err); if (erun === e) { erun = null; overlay.replaceChildren(h('div', { class: 'go-card small' }, h('h2', null, "Couldn't build the road"), h('p', { class: 'muted' }, 'Please try again.'), btn('Back', { kind: 'primary', class: 'btn-block', onClick: () => { void newGame().then(showStart); } }))); } return; }
    if (erun !== e || e.ending) return;
    e.road.ahead(e.n, 2);
    e.progress = 0;
    await newGame({ kind: 'endless', def: withLives(st.def, e.lives) });
    if (erun !== e || !game) return;
    overlay.hidden = true;
    const g = game;
    paintWipe(false);
    e.between = false;
    endlessBanner(g, st, first, () => { if (game !== g || erun !== e) return; g.start(); goPop(); });
  }

  /** the short "Stretch 5 · what's new" card before a stretch (the stretch's clock is primed so the lanes are already moving when it ends) */
  function endlessBanner(g: Crossing, st: Stretch, first: boolean, done: () => void): void {
    const d = g.def!;
    const secs = first ? BANNER : 1.05;
    g.prime(secs);
    introRunning = true;
    const fresh = st.plan.fresh.length > 0;
    const finish = () => { if (!bannerEl) return; clearTimeout(bannerTimer); bannerEl.remove(); bannerEl = null; introRunning = false; done(); };
    bannerEl = h('div', { class: 'fzw-intro fze-intro', style: '--wc:#d6336c', role: 'status' },
      h('div', { class: 'fzw-intro-card' },
        h('small', null, `♾️ Endless · ${st.plan.family.label}`),
        h('b', null, `Stretch ${erun!.n + 1}`),
        h('span', null, `${distanceOf(erun!.cleared, 0)} rows so far`),
        fresh || first ? h('em', null, d.tip) : null));
    bannerEl.addEventListener('pointerdown', (ev) => { ev.stopPropagation(); finish(); });
    wrap.parentElement?.append(bannerEl);
    if (!(import.meta.env.DEV && (window as unknown as { __fcHold?: boolean }).__fcHold)) bannerTimer = window.setTimeout(finish, a.settings.reduceMotion ? 400 : secs * 1000);
  }

  /** a stretch ended: on to the next one, or the run is over */
  function endlessStretchEnd(r: LevelResult): void {
    const e = erun, g = game;
    if (!e || !g?.def || e.ending) return;
    e.score += r.score;
    if (!r.cleared) { e.ending = true; setTimeout(() => finishEndless('lives', true), 200); return; }
    e.cleared++;
    e.between = true;
    e.lives = livesAfter(g.def.lives - r.livesLost, e.n);
    e.n++;
    e.progress = 0;
    const gained = e.lives > g.def.lives - r.livesLost;
    const pop = h('div', { class: 'go-pop fze-rows', 'aria-hidden': 'true' }, `${distanceOf(e.cleared, 0)} rows`, gained ? h('small', null, '♥ spare life!') : null);
    wrap.parentElement?.append(pop);
    setTimeout(() => pop.remove(), 1100);
    void (async () => {
      await pause(700);
      if (erun !== e || e.ending) return;
      paintWipe(true);
      await pause(260);
      if (erun !== e || e.ending) return;
      await playStretch(e);
    })();
  }

  /** the run is over (out of lives, or "End run" in the pause menu): records, rewards, the summary card */
  function finishEndless(why: 'lives' | 'quit', counted = false): void {
    const e = erun;
    if (!e) return;
    e.ending = true;
    if (!counted && game?.def) e.score += game.score;
    e.road.destroy();
    paintWipe(false);
    bannerEl?.remove(); bannerEl = null; introRunning = false;
    const rows = distanceOf(e.cleared, e.progress);
    const stretches = e.cleared + (e.progress > 0 ? 1 : 0);
    const before = { best: store.save().endless.best, bestCoins: store.save().endless.bestCoins, today: e.daily && store.save().endless.today.day === e.day ? store.save().endless.today.best : 0 };
    game?.destroy();
    if (rows > 0 || e.score > 0) store.report({ kind: 'run', score: e.score, level: e.n + 1, rows, mode: 'endless' });
    const gainedCoins = store.save().coinsEarned - e.coinsAtStart, gainedXp = store.save().xp - e.xpAtStart;
    store.mutate((c) => {
      c.endless.bestCoins = Math.max(c.endless.bestCoins, gainedCoins);
      if (e.daily) {
        const t = c.endless.today;
        if (t.day !== e.day) { t.day = e.day; t.best = 0; t.runs = 0; }
        t.best = Math.max(t.best, rows); t.runs++;
      }
    }, 'endlessRun', { rows });
    const sum = { rows, stretches, score: e.score, coins: gainedCoins, xp: gainedXp, daily: e.daily, newBest: rows > before.best, newCoins: gainedCoins > before.bestCoins && gainedCoins > 0, newToday: e.daily && rows > before.today, before, why };
    showEndlessEnd(sum, e);
    erun = null;
    void celebrateUnlocks();
  }

  function showEndlessEnd(sum: { rows: number; stretches: number; score: number; coins: number; xp: number; daily: boolean; newBest: boolean; newCoins: boolean; newToday: boolean; before: { best: number; bestCoins: number; today: number }; why: string }, e: ERun): void {
    levelCard = true;
    overlay.hidden = false;
    const pass = store.passInfo();
    const best = store.save().endless.best;
    const rewards = endlessRewards();
    const next = rewards.find((r) => !store.hasCharacter(r.id));
    const title = sum.newBest && sum.rows > 0 ? '🏆 New record!' : sum.daily && sum.newToday && sum.rows > 0 ? 'Best run today!' : sum.rows >= ROWS_PER_STRETCH ? 'Run over' : 'Nice try!';
    overlay.replaceChildren(h('div', { class: 'go-card fze-end', role: 'dialog', 'aria-label': title },
      h('h2', null, title),
      sum.daily ? h('p', { class: 'fzw-endsub' }, `Daily road · ${e.day}`) : h('p', { class: 'fzw-endsub' }, 'Free run'),
      h('div', { class: 'fze-big' }, h('b', null, String(sum.rows)), h('small', null, sum.rows === 1 ? 'row' : 'rows')),
      h('div', { class: 'go-stats' },
        h('div', null, h('small', null, 'Stretches'), h('b', null, String(sum.stretches))),
        h('div', null, h('small', null, 'Score'), h('b', null, String(sum.score))),
        h('div', null, h('small', null, 'Best'), h('b', null, String(best)))),
      h('div', { class: 'go-earned fzx-earned' }, coinMark(32), h('div', null, h('b', null, `+${sum.coins} coins`), h('small', null, sum.newCoins ? `Most coins in a run! · you have ${store.coins().toLocaleString()}` : `You have ${store.coins().toLocaleString()}`))),
      next ? h('div', { class: 'fze-next' }, h('span', null, `Next Fuzzy: ${next.name}`), h('small', null, `${Math.min(best, next.rows)} / ${next.rows} rows`), h('i', { class: 'fzx-passbar-track' }, h('i', { style: `width:${Math.min(100, Math.round((best / next.rows) * 100))}%` }))) : null,
      h('button', { class: 'fzx-passbar', type: 'button', onclick: () => { void newGame().then(() => go({ to: 'pass' })); } },
        h('span', null, `Fuzzy Pass · level ${pass.level}`), h('small', null, `+${sum.xp} XP`),
        h('i', { class: 'fzx-passbar-track' }, h('i', { style: `width:${pass.maxed ? 100 : Math.round((pass.into / pass.need) * 100)}%` }))),
      btn('Run again', { kind: 'primary', size: 'lg', icon: 'play', class: 'btn-block', onClick: () => { void startEndless(sum.daily); } }),
      h('div', { class: 'btn-row' },
        btn('Endless', { kind: 'soft', icon: 'grid', onClick: () => { void newGame().then(() => go({ to: 'endless' })); } }),
        btn('Menu', { kind: 'soft', icon: 'home', onClick: () => { void newGame().then(showStart); } }))));
  }

  // ---- the hub: Fuzzy Locker, Fuzzy Pass, Fuzzy Shop (and more) open as screens over the board ----
  let hubOpen = false;
  let shellEl!: HTMLElement;
  const hub = createHub({
    get shell() { return shellEl; },
    toMenu: () => { if (!game?.started || game.over) { if (mode.kind !== 'classic') void newGame().then(showStart); else showStart(); } },
    equipChanged: () => { void newGame().then(() => { if (!hubOpen) showStart(); }); },
    play: (m) => { overlay.hidden = true; if (m.kind === 'world') void startWorld(m.world, m.level); else if (m.kind === 'endless') void startEndless(!!m.daily); else void newGame().then(begin); },
    onOpen: (o) => { hubOpen = o; if (o) overlay.hidden = true; },
  });
  const go = (t: NavTarget): void => { if (t.to === 'menu') hub.close(); else void hub.open(t.to, t); };

  function gfxPicker(): HTMLElement | null {
    if (!hasWebGL) return null;
    const seg = h('div', { class: 'seg seg-sm' });
    const fill = () => seg.replaceChildren(...(['real', 'classic'] as const).map((m) => {
      const b = h('button', { type: 'button', class: (a.settings.gameGfx ?? 'real') === m ? 'on' : '' }, m === 'real' ? '🌄 Realistic 3D' : '🎨 Classic 2D');
      b.addEventListener('click', () => { accounts.update((x) => (x.settings.gameGfx = m)); fill(); void newGame(); });
      return b;
    }));
    fill();
    return seg;
  }

  function showStart(): void {
    overlay.hidden = false;
    overlay.replaceChildren(renderLobby({
      me: equippedCharacter(),
      go,
      play: begin,
      toLand: (e) => travel('#/land', 'Off to Fuzzies Land…', { x: e.clientX, y: e.clientY }),
      gfx: gfxPicker(),
      touch: isTouch(),
    }));
  }

  // Cute intro before each game: zoom in on the Fuzzy, it winks, zoom out to the board. Skippable.
  let introRunning = false;
  const skipBtn = h('button', { class: 'skip-intro', type: 'button', hidden: true }, 'Skip ›');
  skipBtn.addEventListener('click', (e) => { e.stopPropagation(); skipIntro(); });
  const skipIntro = () => { if (!introRunning) return; if (bannerEl) bannerEl.dispatchEvent(new Event('pointerdown')); else view?.skipIntro?.(); };

  function goPop(): void {
    const pop = h('div', { class: 'go-pop', 'aria-hidden': 'true' }, 'Go!');
    wrap.parentElement?.append(pop);
    setTimeout(() => pop.remove(), 900);
  }

  let bannerEl: HTMLElement | null = null;
  let bannerTimer = 0;
  /** world levels: a short "World 3 · Level 7" banner instead of the cinematic intro; the level clock is primed so it reaches 0 on start */
  function worldBanner(g: Crossing, done: () => void): void {
    const d = g.def!;
    const w = WORLDS[d.world - 1];
    g.prime(BANNER);
    const finish = () => { if (!bannerEl) return; clearTimeout(bannerTimer); bannerEl.remove(); bannerEl = null; done(); };
    bannerEl = h('div', { class: 'fzw-intro', style: `--wc:${w.color}`, role: 'status' },
      h('div', { class: 'fzw-intro-card' },
        h('small', null, `${w.emoji} World ${d.world} · Level ${d.level}${d.milestone ? ` · ${MILESTONE_ICON[d.milestone]} ${MILESTONE_NAME[d.milestone]}` : ''}`),
        h('b', null, d.name),
        h('span', null, goalLine(d)),
        h('em', null, d.tip)));
    bannerEl.addEventListener('pointerdown', (e) => { e.stopPropagation(); finish(); });
    wrap.parentElement?.append(bannerEl);
    // (tests can hold the banner: window.__fcHold = true in a dev build)
    if (!(import.meta.env.DEV && (window as unknown as { __fcHold?: boolean }).__fcHold)) bannerTimer = window.setTimeout(finish, a.settings.reduceMotion ? 600 : BANNER * 1000);
  }
  const goalLine = (d: NonNullable<Crossing['def']>) => [`Fill ${d.goal.nests} nest${d.goal.nests > 1 ? 's' : ''}`, d.goal.coins ? `grab ${d.goal.coins} coins first` : '', d.goal.timeLimit ? `in ${d.goal.timeLimit} s` : '', d.lives === 1 ? 'one life!' : 'lose no lives for ★★★'].filter(Boolean).join(' · ');

  async function startWorld(w: number, l: number): Promise<void> {
    overlay.hidden = true;
    await newGame({ kind: 'world', world: w, level: l });
    begin();
  }

  function begin(): void {
    if (!game || introRunning || levelCard) return;
    const g = game;
    overlay.hidden = true;
    accounts.update((x) => x.stats.gamesPlayed++);
    track('game');
    store.report({ kind: 'start', mode: g.def ? 'world' : 'classic' });
    runStartCoins = store.save().coinsEarned; runStartXp = store.save().xp; runStartPass = store.passInfo().level; runCoins = 0;
    (wrap.querySelector('canvas') as HTMLCanvasElement | null)?.focus({ preventScroll: true });
    if (g.def) {
      introRunning = true;
      worldBanner(g, () => { introRunning = false; if (game !== g) return; g.start(); goPop(); });
      return;
    }
    const go = () => {
      introRunning = false;
      skipBtn.hidden = true;
      if (game !== g) return; // a new game replaced this one
      g.start();
      net.startRun(); // weekly boards: a run session for signed-in players (never blocks the game)
      goPop();
    };
    if (view?.playIntro && !a.settings.reduceMotion) {
      introRunning = true;
      skipBtn.hidden = false;
      view.playIntro(g, go);
    } else go();
  }

  function togglePause(): void {
    if (erun?.between) return;
    if (!game || !overlay.hidden && !game.paused) return;
    const p = !game.paused;
    game.setPaused(p);
    net.pauseRun(p);
    pauseBtn.replaceChildren(icon(p ? 'play' : 'pause', 16));
    if (p) {
      overlay.hidden = false;
      overlay.replaceChildren(h('div', { class: 'go-card small' }, h('h2', null, 'Paused'), h('p', { class: 'muted' }, 'Your Fuzzies are already saved.'),
        btn('Resume', { kind: 'primary', size: 'lg', icon: 'play', class: 'btn-block', onClick: togglePause }),
        erun ? btn('End run', { kind: 'soft', icon: 'redo', class: 'btn-block', onClick: () => finishEndless('quit') }) : null,
        mode.kind === 'world' ? h('div', { class: 'btn-row' },
          btn('Restart level', { kind: 'soft', icon: 'redo', onClick: () => { const m = mode; if (m.kind === 'world') void startWorld(m.world, m.level); } }),
          btn('Worlds', { kind: 'soft', icon: 'grid', onClick: () => { const m = mode; void newGame().then(() => go(m.kind === 'world' ? { to: 'worlds', world: m.world, level: m.level } : { to: 'worlds' })); } })) : null,
        btn('Back to designing', { kind: 'ghost', class: 'btn-block', onClick: () => (location.hash = '#/home') })));
    } else overlay.hidden = true;
  }

  /** Your best runs, with the one you just played highlighted. */
  function showOver(r: Result): void {
    const isBest = r.score > a.stats.bestScore;
    const entry = { score: r.score, level: r.level, at: Date.now(), skin: skinOf().id };
    accounts.update((x) => {
      x.stats.bestScore = Math.max(x.stats.bestScore, r.score);
      x.stats.bestLevel = Math.max(x.stats.bestLevel, r.level);
      if (r.score > 0) x.topScores = [...x.topScores, entry].sort((p, q) => q.score - p.score).slice(0, 10);
    });
    store.report({ kind: 'run', score: r.score, level: r.level, mode: 'classic' });
    const boardsLine = net.canCompete() ? h('button', { class: 'fzx-boardsline', type: 'button', hidden: true, onclick: () => go({ to: 'leaderboard' }) }) : null;
    void net.finishRun({ score: r.score, level: r.level }).then((rep) => {
      if (!boardsLine || !rep) return;
      if (rep.queued) { boardsLine.textContent = 'Your score will go on the weekly boards when you are back online.'; boardsLine.hidden = false; return; }
      if (!rep.accepted) return;
      const gained = BOARD_IDS.filter((b) => rep.standing[b].improved && rep.standing[b].rank).sort((x, y) => rep.standing[x].rank! - rep.standing[y].rank!)[0];
      const shown = gained ?? 'score';
      const rk = rep.standing[shown].rank;
      if (!rk) return;
      boardsLine.replaceChildren(icon('star', 15), h('span', null, gained ? `New weekly best — #${rk} for ${BOARDS[shown].title}` : `Weekly boards: you are #${rk} for ${BOARDS[shown].title}`));
      boardsLine.hidden = false;
    });
    const gainedCoins = store.save().coinsEarned - runStartCoins, gainedXp = store.save().xp - runStartXp;
    const pass = store.passInfo();
    const levelsUp = pass.level - runStartPass;
    overlay.hidden = false;
    overlay.replaceChildren(renderResults({
      me: equippedCharacter(), isBest, score: r.score, best: a.stats.bestScore, level: r.level, nests: r.homes, coins: gainedCoins, xp: gainedXp,
      pass: { level: pass.level, pct: pass.maxed ? 100 : Math.round((pass.into / Math.max(1, pass.need)) * 100), leveledUp: levelsUp > 0, claimable: store.passClaimable().length },
      boards: boardsLine,
      again: () => { void newGame().then(begin); },
      menu: () => { void newGame().then(showStart); },
      openPass: () => go({ to: 'pass' }),
      toLand: (e) => travel('#/land', 'Off to Fuzzies Land…', { x: e.clientX, y: e.clientY }),
    }));
    void celebrateUnlocks();
  }

  /** a world level ended: save stars + bonuses, then the Level complete / Level failed card */
  function showLevelEnd(r: LevelResult): void {
    if (mode.kind !== 'world' || !game?.def) return;
    const { world: w, level: l } = mode;
    const d = game.def;
    const before = { ...store.save().worlds };
    const wasOpen = w < WORLD_COUNT && worldOpen(before, w + 1);
    const wasDone = worldCleared(store.save(), w);
    let bonus = 0;
    const notes: string[] = [];
    if (r.cleared) {
      store.report({ kind: 'levelClear', world: w, level: l, stars: r.stars, flawless: r.livesLost === 0 });
      const prev = before[`${w}-${l}`] ?? 0;
      if (!prev) { bonus += WORLD_BONUS.firstClear + (d.milestone ? WORLD_BONUS.milestone : 0); }
      if (prev < 3 && r.stars === 3) bonus += WORLD_BONUS.firstThreeStars;
      if (!wasDone && worldCleared(store.save(), w)) { bonus += WORLD_BONUS.worldComplete; notes.push(`🏆 You cleared every level of ${WORLDS[w - 1].name}!`); }
      if (worldFlawless(store.save().worlds, w) && !store.save().flawlessWorlds.includes(w)) {
        store.mutate((c) => { c.flawlessWorlds.push(w); }, 'flawless', { world: w });
        notes.push(`✨ Flawless world: every level of ${WORLDS[w - 1].name} with 3 stars!`);
      }
      if (bonus) store.addCoins(bonus);
      if (!wasOpen && w < WORLD_COUNT && worldOpen(store.save().worlds, w + 1)) notes.push(`🗺️ World ${w + 1} · ${WORLDS[w].name} is open!`);
      store.evaluate();
    }
    store.report({ kind: 'run', score: r.score, level: l, mode: 'world' });
    const gainedCoins = store.save().coinsEarned - runStartCoins, gainedXp = store.save().xp - runStartXp;
    const pass = store.passInfo();
    const m = store.save().worlds;
    const next: PlayMode | null = l < LEVELS_PER_WORLD ? (levelOpen(m, w, l + 1) ? { kind: 'world', world: w, level: l + 1 } : null)
      : w < WORLD_COUNT && worldOpen(m, w + 1) ? { kind: 'world', world: w + 1, level: 1 } : null;
    const toWorlds = () => { void newGame().then(() => go({ to: 'worlds', world: w, level: next?.kind === 'world' && next.world === w ? next.level : l })); };
    const retry = () => { void startWorld(w, l); };
    levelCard = true;
    overlay.hidden = false;
    const title = r.cleared ? (r.stars === 3 ? 'Perfect crossing!' : 'Level clear!') : r.reason === 'time' ? "Time's up!" : 'Out of lives';
    overlay.replaceChildren(h('div', { class: 'go-card fzw-end', role: 'dialog', 'aria-label': title },
      h('h2', null, title),
      h('p', { class: 'fzw-endsub' }, `World ${w} · Level ${l} — ${d.name}`),
      r.cleared ? h('div', { class: 'fzw-bigstars', 'aria-label': `${r.stars} stars` }, ...[1, 2, 3].map((i) => h('i', { class: i <= r.stars ? 'on' : '' }, '★'))) : null,
      h('div', { class: 'go-stats' },
        h('div', null, h('small', null, 'Score'), h('b', null, String(r.score))),
        h('div', null, h('small', null, 'Nests'), h('b', null, `${r.nests}/${d.goal.nests}`)),
        h('div', null, h('small', null, r.cleared ? 'Lives lost' : 'Coins'), h('b', null, String(r.cleared ? r.livesLost : r.coins)))),
      h('div', { class: 'go-earned fzx-earned' }, coinMark(32), h('div', null, h('b', null, `+${gainedCoins} coins`), h('small', null, bonus ? `incl. +${bonus} bonus · you have ${store.coins().toLocaleString()}` : `You have ${store.coins().toLocaleString()}`))),
      h('button', { class: 'fzx-passbar', type: 'button', onclick: () => { void newGame().then(() => go({ to: 'pass' })); } },
        h('span', null, `Fuzzy Pass · level ${pass.level}`), h('small', null, `+${gainedXp} XP`),
        h('i', { class: 'fzx-passbar-track' }, h('i', { style: `width:${pass.maxed ? 100 : Math.round((pass.into / pass.need) * 100)}%` }))),
      ...notes.map((n) => h('p', { class: 'fzw-bonus' }, n)),
      !r.cleared ? h('p', { class: 'hint center' }, d.tip) : null,
      r.cleared && next
        ? btn(next.kind === 'world' && next.world !== w ? `Next world: ${WORLDS[next.world - 1].name}` : 'Next level', { kind: 'primary', size: 'lg', icon: 'play', class: 'btn-block', onClick: () => { if (next.kind === 'world') void startWorld(next.world, next.level); } })
        : btn(r.cleared ? 'Worlds' : 'Try again', { kind: 'primary', size: 'lg', icon: r.cleared ? 'grid' : 'redo', class: 'btn-block', onClick: r.cleared ? toWorlds : retry }),
      h('div', { class: 'btn-row' },
        r.cleared ? btn('Retry', { kind: 'soft', icon: 'redo', onClick: retry }) : btn('Worlds', { kind: 'soft', icon: 'grid', onClick: toWorlds }),
        r.cleared && next ? btn('Worlds', { kind: 'soft', icon: 'grid', onClick: toWorlds }) : btn('Menu', { kind: 'soft', icon: 'home', onClick: () => { void newGame().then(showStart); } }))));
    void celebrateUnlocks();
  }

  /** every new Fuzzy / cosmetic that was unlocked while playing gets its celebration (character appears in 3D, Equip Now) */
  async function celebrateUnlocks(): Promise<void> {
    if (!store.pendingCount()) return;
    try {
      const { celebrateAll } = await import('../../crossing/ui/celebrate');
      await celebrateAll(el, { equipChanged: () => { void newGame(); }, go });
    } catch (e) { console.error(e); }
  }

  // keyboard + swipe
  const keys: Record<string, Dir> = { arrowup: 'up', w: 'up', arrowdown: 'down', s: 'down', arrowleft: 'left', a: 'left', arrowright: 'right', d: 'right' };
  const onKey = (e: KeyboardEvent) => {
    if (document.querySelector('.modal-backdrop') || hubOpen || levelCard) return;
    const k = e.key.toLowerCase();
    if (introRunning && !game?.paused) { e.preventDefault(); skipIntro(); return; }
    if (k === 'p' || k === 'escape') { togglePause(); return; }
    const d = keys[k];
    if (!d) { if ((k === ' ' || k === 'enter') && !overlay.hidden && !game?.paused) { e.preventDefault(); begin(); } return; }
    e.preventDefault();
    if (!overlay.hidden && !game?.paused) begin();
    game?.input(d);
  };
  // touch / mouse on the board: a tap hops forward, a swipe goes that way — the move happens as soon as the swipe is long enough
  let sw: { x: number; y: number; id: number; fired: boolean } | null = null;
  const SWIPE = 24;
  const swipeDir = (dx: number, dy: number): Dir => (Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up');
  wrap.addEventListener('pointerdown', (e) => { sw = { x: e.clientX, y: e.clientY, id: e.pointerId, fired: false }; });
  wrap.addEventListener('pointermove', (e) => {
    if (!sw || sw.id !== e.pointerId || introRunning || levelCard || !overlay.hidden) return;
    const dx = e.clientX - sw.x, dy = e.clientY - sw.y;
    if (Math.hypot(dx, dy) < SWIPE) return;
    game?.input(swipeDir(dx, dy));
    sw.fired = true; sw.x = e.clientX; sw.y = e.clientY; // a long drag can hop again
  });
  wrap.addEventListener('pointerup', (e) => {
    if (!sw || sw.id !== e.pointerId) return;
    const dx = e.clientX - sw.x, dy = e.clientY - sw.y, fired = sw.fired;
    sw = null;
    if (introRunning) { skipIntro(); return; }
    if (fired) return;
    if (Math.hypot(dx, dy) < 14) { game?.input('up'); return; } // tap = hop forward
    game?.input(swipeDir(dx, dy));
  });
  wrap.addEventListener('pointercancel', () => { sw = null; });
  addEventListener('keydown', onKey);
  const ro = new ResizeObserver(() => game?.resize());
  ro.observe(wrap);
  const onVis = () => { if (document.hidden && game && !game.paused && overlay.hidden) togglePause(); };
  document.addEventListener('visibilitychange', onVis);

  shellEl = h('div', { class: 'game-shell' }, hudBar, timebar, h('div', { class: 'game-board' }, wrap, eventFx.el, skipBtn, goalPill, wipe), controls, overlay);
  if (import.meta.env.DEV) {
    // test hook: drive the game by hand (software WebGL runs at ~1 fps)
    (window as unknown as { __fc: unknown }).__fc = {
      get game() { return game; }, get mode() { return mode; }, get levelCard() { return levelCard; },
      startWorld: (w: number, l: number) => startWorld(w, l), startEndless: (daily: boolean) => startEndless(daily), get erun() { return erun; }, finishEndless: () => finishEndless('quit'), newGame: () => newGame(), skipBanner: () => skipIntro(),
    };
  }
  const el = h('div', { class: 'page play' },
    // the start / pause / game-over card covers the whole shell (HUD and arrows too) so it fits on small screens
    shellEl);
  initCrossing();
  setTimeout(() => { void import('../friday').then((m) => m.maybeShowFriday()); }, 900); // Fridays: the first visit gets the Happy Friday surprise
  if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__play = { showOver: (r: Result) => showOver(r) };
  requestAnimationFrame(() => { void newGame(); showStart(); });

  return {
    el,
    destroy: () => { if (game?.started && !game.over) void net.finishRun({ score: game.score, level: game.level }, true); gen++; clearTimeout(bannerTimer); erun?.road.destroy(); erun = null; hub.dispose(); game?.destroy(); view?.destroy(); removeEventListener('keydown', onKey); eventFx.destroy(); ro.disconnect(); document.removeEventListener('visibilitychange', onVis); },
  };
}
