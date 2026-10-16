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
import { createHub, type NavTarget } from '../../crossing/hub';
import '../../crossing/ui/hub.css';
import { renderLobby } from '../../crossing/ui/lobby';
import { renderResults } from '../../crossing/ui/results';
import '../../crossing/ui/boards-menu.css';
import '../../crossing/ui/worlds.css';
import { getLevel, MILESTONE_ICON, MILESTONE_NAME } from '../../crossing/levels';
import { WORLDS, WORLD_BONUS, LEVELS_PER_WORLD, WORLD_COUNT, levelOpen, worldOpen, worldFlawless } from '../../crossing/worlds';
import { worldCleared } from '../../crossing/store';

type Dir = 'up' | 'down' | 'left' | 'right';
/** what the next game is: the Classic endless loop or one world level */
type PlayMode = { kind: 'classic' } | { kind: 'world'; world: number; level: number };
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
  const pauseBtn = btn(null, { icon: 'pause', kind: 'soft', size: 'sm', title: 'Pause (P)', onClick: () => togglePause() });
  const soundBtn = btn(null, { icon: a.settings.sound ? 'sound' : 'mute', kind: 'soft', size: 'sm', title: 'Sound', onClick: () => {
    accounts.update((x) => (x.settings.sound = !x.settings.sound));
    soundBtn.replaceChildren(icon(a.settings.sound ? 'sound' : 'mute', 16));
  } });
  const hudBar = h('div', { class: 'game-hud' },
    h('div', { class: 'hud-item' }, h('small', null, 'Score'), hud.score),
    h('div', { class: 'hud-item' }, h('small', null, 'Best'), hud.best),
    h('div', { class: 'hud-item' }, h('small', null, 'Level'), hud.level),
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
  const controls = h('div', { class: `dpad-wrap ${isTouch() ? '' : 'desktop'}` }, pad('up', 'up'), pad('left', 'back'), pad('right', 'play'), pad('down', 'down'));

  let game: Crossing | null = null;
  let mode: PlayMode = { kind: 'classic' };
  /** the level complete / failed card is showing (keys must not restart anything behind it) */
  let levelCard = false;
  const goalPill = h('div', { class: 'fzw-goalpill', hidden: true });
  /** coins and XP earned in the game that is being played (shown on the game over card) */
  let runCoins = 0, runStartCoins = 0, runStartXp = 0, runStartPass = 1;

  function setHud(s: Hud): void {
    hud.score.textContent = String(s.score);
    hud.best.textContent = String(s.best);
    hud.level.textContent = s.goal && mode.kind === 'world' ? `${mode.world}-${mode.level}` : String(s.level);
    hud.fz.textContent = String(runCoins);
    const maxLives = s.goal?.maxLives ?? 3;
    hud.lives.textContent = '❤'.repeat(Math.max(0, s.lives)) + '♡'.repeat(Math.max(0, maxLives - s.lives));
    goalPill.hidden = !s.goal;
    if (s.goal) {
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
    game?.destroy();
    game = null;
    mode = m;
    const v = await makeView();
    if (my !== gen) return; // a newer request replaced this one
    const def = m.kind === 'world' ? getLevel(m.world, m.level) : undefined;
    game = new Crossing(v, skinOf(), a.stats.bestScore, {
      hud: setHud,
      fuzzy: (n) => { rewards.earn(n, 'Fuzzy Crossing', true); track('gameFuzzies', n); },
      over: (r) => showOver(r),
      event: (e) => onGameEvent(e),
      levelEnd: (r) => showLevelEnd(r),
    }, def ? { mode: 'world', level: def } : { mode: 'classic' });
    runCoins = 0;
    setHud({ score: 0, level: 1, lives: def?.lives ?? 3, fuzzies: 0, time: 1, best: a.stats.bestScore, goal: def ? { nests: 0, nestsNeed: def.goal.nests, coins: def.goal.coins ? 0 : undefined, coinsNeed: def.goal.coins, timeLeft: def.goal.timeLimit, maxLives: def.lives } : undefined });
    requestAnimationFrame(() => dispatchEvent(new Event('fz:scene-ready'))); // lets the travel transition open up
  }

  /** what happens in the game → the site's missions (as before) and Fuzzy Crossing's own save (coins, Fuzzy Pass XP, achievements) */
  function onGameEvent(e: Fx): void {
    if (e.kind === 'home') track('nest');
    if (e.kind === 'level') track('level', e.level);
    let ev: store.CrossingEvent | null = null;
    if (e.kind === 'collect') ev = { kind: 'pickup', gold: e.gold };
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

  // ---- the hub: Fuzzy Locker, Fuzzy Pass, Fuzzy Shop (and more) open as screens over the board ----
  let hubOpen = false;
  let shellEl!: HTMLElement;
  const hub = createHub({
    get shell() { return shellEl; },
    toMenu: () => { if (!game?.started || game.over) { if (mode.kind === 'world') void newGame().then(showStart); else showStart(); } },
    equipChanged: () => { void newGame().then(() => { if (!hubOpen) showStart(); }); },
    play: (m) => { overlay.hidden = true; if (m.kind === 'world') void startWorld(m.world, m.level); else void newGame().then(begin); },
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
    if (!game || !overlay.hidden && !game.paused) return;
    const p = !game.paused;
    game.setPaused(p);
    net.pauseRun(p);
    pauseBtn.replaceChildren(icon(p ? 'play' : 'pause', 16));
    if (p) {
      overlay.hidden = false;
      overlay.replaceChildren(h('div', { class: 'go-card small' }, h('h2', null, 'Paused'), h('p', { class: 'muted' }, 'Your Fuzzies are already saved.'),
        btn('Resume', { kind: 'primary', size: 'lg', icon: 'play', class: 'btn-block', onClick: togglePause }),
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
  let sw: { x: number; y: number; id: number } | null = null;
  wrap.addEventListener('pointerdown', (e) => { sw = { x: e.clientX, y: e.clientY, id: e.pointerId }; });
  wrap.addEventListener('pointerup', (e) => {
    if (!sw || sw.id !== e.pointerId) return;
    const dx = e.clientX - sw.x, dy = e.clientY - sw.y;
    sw = null;
    if (introRunning) { skipIntro(); return; }
    if (Math.hypot(dx, dy) < 14) { game?.input('up'); return; } // tap = hop forward
    game?.input(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up');
  });
  addEventListener('keydown', onKey);
  const ro = new ResizeObserver(() => game?.resize());
  ro.observe(wrap);
  const onVis = () => { if (document.hidden && game && !game.paused && overlay.hidden) togglePause(); };
  document.addEventListener('visibilitychange', onVis);

  shellEl = h('div', { class: 'game-shell' }, hudBar, timebar, h('div', { class: 'game-board' }, wrap, skipBtn, goalPill), controls, overlay);
  if (import.meta.env.DEV) {
    // test hook: drive the game by hand (software WebGL runs at ~1 fps)
    (window as unknown as { __fc: unknown }).__fc = {
      get game() { return game; }, get mode() { return mode; }, get levelCard() { return levelCard; },
      startWorld: (w: number, l: number) => startWorld(w, l), newGame: () => newGame(), skipBanner: () => skipIntro(),
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
    destroy: () => { if (game?.started && !game.over) void net.finishRun({ score: game.score, level: game.level }, true); gen++; clearTimeout(bannerTimer); hub.dispose(); game?.destroy(); view?.destroy(); removeEventListener('keydown', onKey); ro.disconnect(); document.removeEventListener('visibilitychange', onVis); },
  };
}
