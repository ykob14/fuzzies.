/** Fuzzy Crossing screen: start card, HUD, touch controls and the game-over summary. */
import type { Screen } from '../app';
import { Crossing, SKINS, type Hud, type Result, type Skin, type View } from '../../game/crossing';
import { View2D } from '../../game/view2d';
import { accounts } from '../../core/account';
import { rewards } from '../../core/rewards';
import { unlockDialog } from '../unlock';
import { track } from '../../core/missions';
import { mascot } from '../mascot';
import { h, btn, icon, fuzzyMark } from '../dom';
import { isTouch } from '../../core/util';

type Dir = 'up' | 'down' | 'left' | 'right';

export function playScreen(): Screen {
  const a = accounts.current!;
  const skinOf = (): Skin => SKINS.find((s) => s.id === a.settings.skin && rewards.isUnlocked(`skin-${s.id}`, s.cost)) ?? SKINS[0];

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
    h('div', { class: 'hud-item hud-fz' }, fuzzyMark(20), hud.fz),
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

  function setHud(s: Hud): void {
    hud.score.textContent = String(s.score);
    hud.best.textContent = String(s.best);
    hud.level.textContent = String(s.level);
    hud.fz.textContent = String(s.fuzzies);
    hud.lives.textContent = '❤'.repeat(Math.max(0, s.lives)) + '♡'.repeat(Math.max(0, 3 - s.lives));
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
        view = new View3D(canvas, isTouch());
      } catch (e) {
        console.error(e);
        viewMode = 'classic';
        view = new View2D(canvas);
      }
      wrap.classList.remove('loading');
    } else view = new View2D(canvas);
    return view;
  }

  async function newGame(): Promise<void> {
    const my = ++gen;
    introRunning = false;
    skipBtn.hidden = true;
    game?.destroy();
    game = null;
    const v = await makeView();
    if (my !== gen) return; // a newer request replaced this one
    game = new Crossing(v, skinOf(), a.stats.bestScore, {
      hud: setHud,
      fuzzy: (n) => { rewards.earn(n, 'Fuzzy Crossing', true); track('gameFuzzies', n); },
      over: (r) => showOver(r),
      event: (e) => { if (e.kind === 'home') track('nest'); if (e.kind === 'level') track('level', e.level); },
    });
    setHud({ score: 0, level: 1, lives: 3, fuzzies: 0, time: 1, best: a.stats.bestScore });
  }

  function gfxPicker(): HTMLElement | null {
    if (!hasWebGL) return null;
    const seg = h('div', { class: 'seg' });
    const fill = () => seg.replaceChildren(...(['real', 'classic'] as const).map((m) => {
      const b = h('button', { type: 'button', class: (a.settings.gameGfx ?? 'real') === m ? 'on' : '' }, m === 'real' ? '🌄 Realistic 3D' : '🎨 Classic 2D');
      b.addEventListener('click', () => { accounts.update((x) => (x.settings.gameGfx = m)); fill(); void newGame(); });
      return b;
    }));
    fill();
    return seg;
  }

  function skinPicker(): HTMLElement {
    const row = h('div', { class: 'skins' });
    const fill = () => row.replaceChildren(...SKINS.map((s) => {
      const owned = rewards.isUnlocked(`skin-${s.id}`, s.cost);
      const on = skinOf().id === s.id;
      const b = h('button', { type: 'button', class: `skin ${on ? 'on' : ''} ${owned ? '' : 'locked'}`, title: owned ? s.name : `${s.name} · ${s.cost} Fuzzies` }, fuzzyMark(40, s.colors), h('small', null, owned ? s.name : `🔒 ${s.cost}`));
      b.addEventListener('click', () => {
        if (!owned) { unlockDialog({ id: `skin-${s.id}`, name: `${s.name} Fuzzy`, cost: s.cost, kind: 'Player look for Fuzzy Crossing', preview: fuzzyMark(90, s.colors) }, () => { accounts.update((x) => (x.settings.skin = s.id)); fill(); newGame(); }); return; }
        accounts.update((x) => (x.settings.skin = s.id));
        fill();
        newGame();
      });
      return b;
    }));
    fill();
    return row;
  }

  function showStart(): void {
    overlay.hidden = false;
    overlay.replaceChildren(h('div', { class: 'go-card' },
      h('div', { class: 'go-title' }, mascot(56), h('div', null, h('h2', null, 'Fuzzy Crossing'), h('p', { class: 'muted' }, 'Hop across. Grab Fuzzies. Fill all 5 nests.'))),
      btn('Start playing', { kind: 'primary', size: 'lg', icon: 'play', class: 'btn-block', onClick: begin }),
      h('p', { class: 'hint center' }, isTouch() ? 'Swipe on the board or use the arrows.' : 'Arrow keys or WASD to hop · P to pause.'),
      h('ul', { class: 'how' },
        h('li', null, '🚗 Dodge cars on the road'),
        h('li', null, '🪵 Ride logs and lily pads — don’t touch the water'),
        h('li', null, fuzzyMark(16), ' Pink Fuzzy = +1 · ', fuzzyMark(16, ['#fff3b0', '#e0a100']), ' Golden = +5'),
        h('li', null, '🏁 Each nest +2 · clear a level +5'),
        h('li', null, '🌅 The sky changes every level: day, golden hour, dusk')),
      topList(0, 3),
      h('p', { class: 'pnl-label' }, 'Choose your Fuzzy'), skinPicker(),
      hasWebGL ? h('p', { class: 'pnl-label' }, 'Graphics') : null, gfxPicker()));
  }

  // Cute intro before each game: zoom in on the Fuzzy, it winks, zoom out to the board. Skippable.
  let introRunning = false;
  const skipBtn = h('button', { class: 'skip-intro', type: 'button', hidden: true }, 'Skip ›');
  skipBtn.addEventListener('click', (e) => { e.stopPropagation(); skipIntro(); });
  const skipIntro = () => { if (introRunning) view?.skipIntro?.(); };

  function goPop(): void {
    const pop = h('div', { class: 'go-pop', 'aria-hidden': 'true' }, 'Go!');
    wrap.parentElement?.append(pop);
    setTimeout(() => pop.remove(), 900);
  }

  function begin(): void {
    if (!game || introRunning) return;
    const g = game;
    overlay.hidden = true;
    accounts.update((x) => x.stats.gamesPlayed++);
    track('game');
    (wrap.querySelector('canvas') as HTMLCanvasElement | null)?.focus({ preventScroll: true });
    const go = () => {
      introRunning = false;
      skipBtn.hidden = true;
      if (game !== g) return; // a new game replaced this one
      g.start();
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
    pauseBtn.replaceChildren(icon(p ? 'play' : 'pause', 16));
    if (p) {
      overlay.hidden = false;
      overlay.replaceChildren(h('div', { class: 'go-card small' }, h('h2', null, 'Paused'), h('p', { class: 'muted' }, 'Your Fuzzies are already saved.'),
        btn('Resume', { kind: 'primary', size: 'lg', icon: 'play', class: 'btn-block', onClick: togglePause }),
        btn('Back to designing', { kind: 'ghost', class: 'btn-block', onClick: () => (location.hash = '#/home') })));
    } else overlay.hidden = true;
  }

  /** Your best runs, with the one you just played highlighted. */
  function topList(highlight = 0, n = 5): HTMLElement | null {
    const list = a.topScores.slice(0, n);
    if (!list.length) return null;
    const medal = ['🥇', '🥈', '🥉'];
    return h('div', { class: 'top-scores' },
      h('p', { class: 'pnl-label' }, 'Your top scores'),
      h('ol', null, ...list.map((s, i) => {
        const sk = SKINS.find((x) => x.id === s.skin) ?? SKINS[0];
        return h('li', { class: s.at === highlight ? 'me' : '' },
          h('span', { class: 'ts-rank' }, medal[i] ?? `${i + 1}.`), fuzzyMark(18, sk.colors),
          h('b', null, s.score.toLocaleString()), h('small', null, `Lv ${s.level} · ${new Date(s.at).toLocaleDateString()}`));
      })));
  }

  function showOver(r: Result): void {
    const isBest = r.score > a.stats.bestScore;
    const entry = { score: r.score, level: r.level, at: Date.now(), skin: skinOf().id };
    accounts.update((x) => {
      x.stats.bestScore = Math.max(x.stats.bestScore, r.score);
      x.stats.bestLevel = Math.max(x.stats.bestLevel, r.level);
      if (r.score > 0) x.topScores = [...x.topScores, entry].sort((p, q) => q.score - p.score).slice(0, 10);
    });
    const rank = a.topScores.indexOf(a.topScores.find((s) => s.at === entry.at)!) + 1;
    overlay.hidden = false;
    overlay.replaceChildren(h('div', { class: 'go-card' },
      h('h2', null, isBest ? '🏆 New best score!' : 'Game over'),
      h('div', { class: 'go-stats' },
        h('div', null, h('small', null, 'Score'), h('b', null, String(r.score))),
        h('div', null, h('small', null, 'Level'), h('b', null, String(r.level))),
        h('div', null, h('small', null, 'Nests'), h('b', null, String(r.homes)))),
      h('div', { class: 'go-earned' }, fuzzyMark(36), h('div', null, h('b', null, `+${r.fuzzies} Fuzzies`), h('small', null, `Balance: ${rewards.balance()}`))),
      rank > 0 && !isBest ? h('p', { class: 'hint center' }, `#${rank} in your top 10 scores!`) : null,
      topList(entry.at),
      btn('Play again', { kind: 'primary', size: 'lg', icon: 'play', class: 'btn-block', onClick: () => { void newGame().then(begin); } }),
      h('div', { class: 'btn-row' },
        btn('Spend Fuzzies', { kind: 'soft', icon: 'gift', onClick: () => (location.hash = '#/rewards') }),
        btn('Back to designing', { kind: 'ghost', icon: 'brush', onClick: () => (location.hash = '#/home') }))));
  }

  // keyboard + swipe
  const keys: Record<string, Dir> = { arrowup: 'up', w: 'up', arrowdown: 'down', s: 'down', arrowleft: 'left', a: 'left', arrowright: 'right', d: 'right' };
  const onKey = (e: KeyboardEvent) => {
    if (document.querySelector('.modal-backdrop')) return;
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

  const el = h('div', { class: 'page play' },
    h('div', { class: 'game-shell' }, hudBar, timebar, h('div', { class: 'game-board' }, wrap, skipBtn, overlay), controls));
  requestAnimationFrame(() => { void newGame(); showStart(); });

  return {
    el,
    destroy: () => { gen++; game?.destroy(); view?.destroy(); removeEventListener('keydown', onKey); ro.disconnect(); document.removeEventListener('visibilitychange', onVis); },
  };
}
