/**
 * The Fuzzy Crossing lobby — the first thing you see on the Play tab. A game menu, not a settings page:
 * your Fuzzy on a stage, one big Play button, the modes, the daily-missions strip and a row of picture buttons.
 * Help and options live behind two small buttons so nothing else competes with Play.
 * New screens appear here by themselves once their panel exists (`panelAvailable`) — nothing in this file changes per feature.
 */
import { h, fuzzyMark } from '../../ui/dom';
import * as store from '../store';
import { CHARACTERS, RARITY_NAME, RARITY_COLOR, type CharacterDef } from '../characters';
import { viewMissions, claimable as missionsClaimable } from '../missions';
import { panelAvailable, type NavTarget, type PanelName } from '../hub';
import { friendUrl } from '../../content/friends';
import { accounts } from '../../core/account';
import { coinMark, newDot } from './kit';
import { gicon, gtile, type GIcon } from './gicons';
import { art, type ArtName } from './art';
import * as net from '../net';
import './gameui.css';
import './lobby.css';

export interface LobbyOpts {
  me: CharacterDef;
  go(t: NavTarget): void;
  /** start a Classic game */
  play(): void;
  /** the "Visit Fuzzies Land" link */
  toLand(e: MouseEvent): void;
  /** the Realistic 3D / Classic 2D switch (null when the browser has no WebGL) */
  gfx: HTMLElement | null;
  touch: boolean;
}

/** a big picture of a Fuzzy for the stage */
function bigPortrait(c: CharacterDef, size: number): HTMLElement {
  return c.friend
    ? h('img', { class: 'fzx-lb-fuzzy', src: friendUrl(c.friend), alt: '', width: size, height: size, draggable: 'false' })
    : h('span', { class: 'fzx-lb-fuzzy' }, fuzzyMark(size, c.color));
}

function sheet(title: string, body: Node, onClose: () => void): HTMLElement {
  const close = h('button', { class: 'fzx-x', type: 'button', 'aria-label': 'Close', onclick: onClose }, gicon('plus', 18));
  const box = h('div', { class: 'fzx-sheet-box', role: 'dialog', 'aria-label': title }, h('div', { class: 'fzx-sheet-head' }, h('h3', null, title), close), body);
  const s = h('div', { class: 'fzx-sheet', onclick: (e: MouseEvent) => { if (e.target === s) onClose(); } }, box);
  return s;
}

export function renderLobby(o: LobbyOpts): HTMLElement {
  const s = store.save();
  const pass = store.passInfo();
  const pct = pass.maxed ? 100 : Math.round((pass.into / Math.max(1, pass.need)) * 100);
  const claim = store.passClaimable().length;
  const root = h('div', { class: 'fzx-lobby' });

  const open = (to: PanelName): (() => void) => () => o.go({ to } as NavTarget);

  // ---- top row: Pass level, help, options, coins ----
  const lvl = h('button', { class: 'fzx-lvl', type: 'button', onclick: open('pass'), 'aria-label': `Fuzzy Pass, level ${pass.level}` },
    h('span', { class: 'fzx-lvl-ring', style: `--p:${pct}` }, h('b', null, String(pass.level))),
    h('span', { class: 'fzx-lvl-t' }, h('small', null, 'Fuzzy Pass'), h('i', { class: 'fzx-lvl-bar' }, h('u', { style: `width:${pct}%` }))));
  if (claim > 0) lvl.append(newDot());
  const helpBtn = h('button', { class: 'fzx-round', type: 'button', 'aria-label': 'How to play', onclick: () => showHelp() }, gicon('help', 22));
  const gearBtn = o.gfx ? h('button', { class: 'fzx-round', type: 'button', 'aria-label': 'Options', onclick: () => showOptions() }, gicon('gear', 22)) : null;
  const coinPill = h('button', { class: 'fzx-coinpill', type: 'button', 'aria-label': `${s.coins} coins. Open the shop`, onclick: open('shop') }, coinMark(22), h('b', null, s.coins.toLocaleString()), panelAvailable('shop') ? h('span', { class: 'fzx-plus' }, gicon('plus', 12)) : null);
  const streak = accounts.current?.daily.streak ?? 0;
  const streakChip = streak > 0 ? h('span', { class: 'fzx-streak', title: `${streak} day${streak > 1 ? 's' : ''} in a row` }, gicon('flame', 18), h('b', null, String(streak))) : null;
  const top = h('header', { class: 'fzx-lb-top' }, lvl, streakChip, h('span', { class: 'fzx-sp' }), helpBtn, gearBtn, coinPill);

  // ---- the stage: your Fuzzy ----
  const stage = h('div', { class: 'fzx-stage' },
    h('span', { class: 'fzx-rays', 'aria-hidden': 'true' }),
    h('span', { class: 'fzx-sky', 'aria-hidden': 'true' }, h('i', null), h('i', null), h('i', null)),
    h('div', { class: 'fzx-3d' }, bigPortrait(o.me, 190), h('span', { class: 'fzx-ground', 'aria-hidden': 'true' })),
    h('button', { class: 'fzx-name', type: 'button', onclick: () => o.go({ to: 'locker', id: o.me.id }), 'aria-label': `${o.me.name}. Open the Locker` },
      h('b', null, o.me.name), h('em', { style: `--rar:${RARITY_COLOR[o.me.rarity]}` }, RARITY_NAME[o.me.rarity]), gicon('plus', 13)));

  // ---- Play ----
  const modes: { id: PanelName; ic: ArtName; label: string; sub: string }[] = [
    { id: 'worlds', ic: 'worlds', label: 'Worlds', sub: `${Object.keys(s.worlds ?? {}).length} / 150` },
    { id: 'endless', ic: 'endless', label: 'Endless', sub: s.endless?.best ? `Best ${s.endless.best}` : 'How far can you go?' },
    { id: 'events', ic: 'events', label: 'Events', sub: 'Seasonal fun' },
  ];
  const shownModes = modes.filter((m) => panelAvailable(m.id));
  const playBtn = h('button', { class: 'fzx-play', type: 'button', onclick: o.play }, gicon('play', 26), h('span', null, shownModes.length ? 'Play Classic' : 'Play'));
  const modeRow = shownModes.length
    ? h('div', { class: `fzx-modes n${shownModes.length}` }, ...shownModes.map((m) => h('button', { class: 'fzx-mode', type: 'button', onclick: open(m.id) }, art(m.ic, 40), h('span', { class: 'fzx-mode-t' }, h('b', null, m.label), h('small', null, m.sub)))))
    : null;

  // ---- daily missions strip ----
  let strip: HTMLElement | null = null;
  if (panelAvailable('missions')) {
    const daily = viewMissions(s, 'daily');
    const got = daily.filter((v) => v.claimed).length;
    const ready = missionsClaimable(s).length;
    strip = h('button', { class: `fzx-daily ${ready ? 'ready' : ''}`, type: 'button', onclick: open('missions'), 'aria-label': `Daily missions, ${got} of 3 done` },
      art('missions', 40),
      h('span', { class: 'fzx-daily-t' },
        h('b', null, ready ? `${ready} reward${ready > 1 ? 's' : ''} ready!` : 'Daily missions'),
        h('span', { class: 'fzx-pips' }, ...[0, 1, 2].map((i) => h('i', { class: i < got ? 'on' : daily[i]?.done ? 'rdy' : '' })))),
      h('span', { class: 'fzx-daily-n' }, `${got}/3`));
  }

  // ---- the picture buttons ----
  const pendingNew = CHARACTERS.some((c) => store.hasCharacter(c.id) && store.isNew(c.id) && c.id !== 'classic');
  const card = (name: PanelName, pic: ArtName, label: string, sub: string, dot = false, extra?: Node): HTMLElement | null => {
    if (!panelAvailable(name)) return null;
    const b = h('button', { class: `fzx-fc fzx-fc-${name}`, type: 'button', onclick: open(name) },
      h('span', { class: 'fzx-fc-t' }, h('b', null, label), h('small', null, sub)),
      h('span', { class: 'fzx-fc-art' }, art(pic, 54), extra ?? null));
    if (dot) b.append(newDot());
    return b;
  };
  // the open locker shows the Fuzzy you are wearing
  const lockerFuzzy = o.me.friend ? h('img', { class: 'fzx-fc-peek', src: friendUrl(o.me.friend), alt: '', draggable: 'false' }) : h('span', { class: 'fzx-fc-peek' }, fuzzyMark(44, o.me.color));
  const boards = card('leaderboard', 'boards', 'Boards', 'Weekly');
  void net.claimableWeeks().then((w) => { if (w.length && boards?.isConnected) boards.append(newDot()); });
  const dock = h('nav', { class: 'fzx-cards', 'aria-label': 'Fuzzy Crossing' },
    card('locker', 'locker', 'Locker', `${store.ownedCount()}/${CHARACTERS.length}`, pendingNew, lockerFuzzy),
    card('pass', 'pass', 'Pass', `Level ${pass.level}`, claim > 0),
    card('shop', 'shop', 'Shop', 'Fresh picks'),
    boards);

  const land = h('button', { class: 'fzx-land', type: 'button', onclick: o.toLand }, gicon('town', 16), 'Visit your town in Fuzzies Land');

  root.append(...[top, stage, playBtn, modeRow, strip, dock, land].filter((x): x is HTMLElement => !!x));

  // ---- sheets: how to play / options ----
  function showHelp(): void {
    const row = (ic: GIcon, t: string, d: string) => h('li', null, gtile(ic, 40), h('span', null, h('b', null, t), h('small', null, d)));
    const body = h('div', null,
      h('ul', { class: 'fzx-howl' },
        row('road', 'Dodge the cars', 'Hop across the roads without getting bumped.'),
        row('nest', 'Ride the logs', 'Logs carry you over the water — stay off the splash!'),
        row('coin', 'Grab coins', 'Coin +1 · golden Fuzzy +5'),
        row('flag', 'Fill the nests', 'Nest +3 · finish a level +10')),
      h('p', { class: 'fzx-hint' }, o.touch ? 'Swipe or tap the board to hop. You have 3 lives.' : 'Arrow keys or WASD to hop · P to pause. You have 3 lives.'));
    const el = sheet('How to play', body, () => el.remove());
    root.append(el);
  }
  function showOptions(): void {
    const body = h('div', null, h('p', { class: 'fzx-opt-l' }, 'Graphics'), o.gfx ?? h('span'));
    const el = sheet('Options', body, () => el.remove());
    root.append(el);
  }
  requestAnimationFrame(() => mountHero(root, stage, o.me, o.touch, { claim, missions: strip?.classList.contains('ready') ?? false, streak }));
  return root;
}

// ---------- the living Fuzzy: your character in 3D on its podium, looking at you, answering taps, with something to say ----------
function linesFor(def: CharacterDef, f: { claim: number; missions: boolean; streak: number }): string[] {
  const hr = new Date().getHours();
  const out: string[] = [hr < 12 ? 'Good morning!' : hr < 18 ? 'Hi there!' : 'Good evening!'];
  if (new Date().getDay() === 5) out.push('It’s Fuzzie Friday!');
  if (f.claim > 0) out.push('A Pass reward is waiting!');
  if (f.missions) out.push('Your missions are ready!');
  if (f.streak > 1) out.push(`${f.streak} days in a row — wow!`);
  out.push('Ready to cross?', 'Tap me!', 'Let’s hop!', def.tagline);
  return out;
}
const REACT = ['Hehe!', 'Wheee!', 'Again!', 'That tickles!', 'Yay!', 'Boing!'];

function mountHero(root: HTMLElement, stage: HTMLElement, me: CharacterDef, touch: boolean, f: { claim: number; missions: boolean; streak: number }): void {
  const box = stage.querySelector<HTMLElement>('.fzx-3d');
  if (!box || !root.isConnected) return;
  const bubble = h('div', { class: 'fzx-bubble', role: 'status' });
  box.append(bubble);
  let n = 0, hold = 0;
  const say = (t: string, ms = 3600): void => { bubble.textContent = t; bubble.classList.remove('on'); void bubble.offsetWidth; bubble.classList.add('on'); clearTimeout(hold); hold = window.setTimeout(() => bubble.classList.remove('on'), ms); };
  const lines = linesFor(me, f);
  const talk = window.setInterval(() => { if (!root.isConnected) return; say(lines[n++ % lines.length]); }, 7000);
  const first = window.setTimeout(() => say(lines[n++ % lines.length]), 1400);
  let room: Awaited<ReturnType<typeof import('./showroom').createShowroom>> | null = null;
  let gone = false;
  const watch = window.setInterval(() => {
    if (root.isConnected) return;
    gone = true; clearInterval(watch); clearInterval(talk); clearTimeout(first); clearTimeout(hold);
    room?.dispose(); room = null;
  }, 800);
  const hasGL = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } })();
  if (!hasGL) return;
  void import('./showroom').then(async (m) => {
    if (gone) return;
    const r = await m.createShowroom({ mobile: touch, dist: 5.2 });
    if (gone) { r.dispose(); return; }
    room = r;
    const eq = store.save().equipped;
    await r.show(me, { locked: false, extra: eq.extra && eq.extra !== 'extra-none' ? eq.extra : null, fx: { trail: eq.trail, jump: eq.jump, celebration: eq.celebration } });
    if (gone) return;
    box.classList.add('live');
    box.prepend(r.el);
    r.onTap = () => { const k = Math.random(); r.play(k < 0.5 ? 'jump' : 'celebrate'); say(REACT[Math.floor(Math.random() * REACT.length)], 2200); };
  }).catch((e) => console.error(e));
}
