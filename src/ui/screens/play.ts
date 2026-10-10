/** Fuzzy Crossing screen: start card, HUD, touch controls and the game-over summary. */
import type { Screen } from '../app';
import { Crossing, SKINS, type Hud, type Result, type Skin } from '../../game/crossing';
import { accounts } from '../../core/account';
import { rewards } from '../../core/rewards';
import { unlockDialog } from '../unlock';
import { h, btn, icon, fuzzyMark } from '../dom';
import { isTouch } from '../../core/util';

type Dir = 'up' | 'down' | 'left' | 'right';

export function playScreen(): Screen {
  const a = accounts.current!;
  const skinOf = (): Skin => SKINS.find((s) => s.id === a.settings.skin && rewards.isUnlocked(`skin-${s.id}`, s.cost)) ?? SKINS[0];

  const canvas = h('canvas', { class: 'game-canvas', 'aria-label': 'Fuzzy Crossing game board' });
  const wrap = h('div', { class: 'game-wrap' }, canvas);
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

  function newGame(): void {
    game?.destroy();
    game = new Crossing(canvas, skinOf(), a.stats.bestScore, {
      hud: setHud,
      fuzzy: (n) => rewards.earn(n, 'Fuzzy Crossing', true),
      over: (r) => showOver(r),
    });
    setHud({ score: 0, level: 1, lives: 3, fuzzies: 0, time: 1, best: a.stats.bestScore });
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
      h('div', { class: 'go-title' }, fuzzyMark(56), h('div', null, h('h2', null, 'Fuzzy Crossing'), h('p', { class: 'muted' }, 'Hop across. Grab Fuzzies. Fill all 5 nests.'))),
      h('ul', { class: 'how' },
        h('li', null, '🚗 Dodge cars on the road'),
        h('li', null, '🪵 Ride logs and lily pads — don’t touch the water'),
        h('li', null, fuzzyMark(16), ' Pink Fuzzy = +1 · ', fuzzyMark(16, ['#fff3b0', '#e0a100']), ' Golden = +5'),
        h('li', null, '🏁 Each nest +2 · clear a level +5')),
      h('p', { class: 'pnl-label' }, 'Choose your Fuzzy'), skinPicker(),
      btn('Start playing', { kind: 'primary', size: 'lg', icon: 'play', class: 'btn-block', onClick: begin }),
      h('p', { class: 'hint center' }, isTouch() ? 'Swipe on the board or use the arrows.' : 'Arrow keys or WASD to hop · P to pause.')));
  }

  function begin(): void {
    overlay.hidden = true;
    accounts.update((x) => x.stats.gamesPlayed++);
    game?.start();
    canvas.focus();
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

  function showOver(r: Result): void {
    const isBest = r.score > a.stats.bestScore;
    accounts.update((x) => { x.stats.bestScore = Math.max(x.stats.bestScore, r.score); x.stats.bestLevel = Math.max(x.stats.bestLevel, r.level); });
    overlay.hidden = false;
    overlay.replaceChildren(h('div', { class: 'go-card' },
      h('h2', null, isBest ? '🏆 New best score!' : 'Game over'),
      h('div', { class: 'go-stats' },
        h('div', null, h('small', null, 'Score'), h('b', null, String(r.score))),
        h('div', null, h('small', null, 'Level'), h('b', null, String(r.level))),
        h('div', null, h('small', null, 'Nests'), h('b', null, String(r.homes)))),
      h('div', { class: 'go-earned' }, fuzzyMark(36), h('div', null, h('b', null, `+${r.fuzzies} Fuzzies`), h('small', null, `Balance: ${rewards.balance()}`))),
      btn('Play again', { kind: 'primary', size: 'lg', icon: 'play', class: 'btn-block', onClick: () => { newGame(); begin(); } }),
      h('div', { class: 'btn-row' },
        btn('Spend Fuzzies', { kind: 'soft', icon: 'gift', onClick: () => (location.hash = '#/rewards') }),
        btn('Back to designing', { kind: 'ghost', icon: 'brush', onClick: () => (location.hash = '#/home') }))));
  }

  // keyboard + swipe
  const keys: Record<string, Dir> = { arrowup: 'up', w: 'up', arrowdown: 'down', s: 'down', arrowleft: 'left', a: 'left', arrowright: 'right', d: 'right' };
  const onKey = (e: KeyboardEvent) => {
    if (document.querySelector('.modal-backdrop')) return;
    const k = e.key.toLowerCase();
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
    if (Math.hypot(dx, dy) < 14) { game?.input('up'); return; } // tap = hop forward
    game?.input(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up');
  });
  addEventListener('keydown', onKey);
  const ro = new ResizeObserver(() => game?.resize());
  ro.observe(wrap);
  const onVis = () => { if (document.hidden && game && !game.paused && overlay.hidden) togglePause(); };
  document.addEventListener('visibilitychange', onVis);

  const el = h('div', { class: 'page play' },
    h('div', { class: 'game-shell' }, hudBar, timebar, h('div', { class: 'game-board' }, wrap, overlay), controls));
  requestAnimationFrame(() => { newGame(); showStart(); });

  return {
    el,
    destroy: () => { game?.destroy(); removeEventListener('keydown', onKey); ro.disconnect(); document.removeEventListener('visibilitychange', onVis); },
  };
}
