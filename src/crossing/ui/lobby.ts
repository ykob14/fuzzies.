/**
 * The Fuzzy Crossing lobby — the first thing you see on the Play tab. A game menu, not a settings page:
 * your Fuzzy on a stage, one big Play button and the two other ways to play (Worlds, Endless) — nothing else (owner: "too complicated").
 * Collecting Fuzzies (Locker, Pass, Shop, Boards, missions) lives in Fuzzies Land → Games → Fuzzy Collection, which opens `#/play/<panel>`.
 * New screens appear here by themselves once their panel exists (`panelAvailable`) — nothing in this file changes per feature.
 */
import { h, fuzzyMark } from '../../ui/dom';
import * as store from '../store';
import { type CharacterDef } from '../characters';
import { panelAvailable, type NavTarget, type PanelName } from '../hub';
import { friendUrl } from '../../content/friends';
import { accounts } from '../../core/account';
import { gicon, gtile, type GIcon } from './gicons';
import { art, type ArtName } from './art';
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

/** the owner's Fuzzy picture (public/art/fuzzy-hero.webp) — never redrawn, re-rendered or swapped */
const OWNER_FUZZY = '/art/fuzzy-hero.webp';

/** a big picture of a Fuzzy for the stage */
function bigPortrait(c: CharacterDef, size: number): HTMLElement {
  // the Classic Fuzzy is the owner's own picture, shown exactly as it is (owner: "do not change the image")
  if (c.id === 'classic') return h('img', { class: 'fzx-lb-fuzzy fzx-hero-pic', src: OWNER_FUZZY, alt: '', width: size, height: size, draggable: 'false' });
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
  const root = h('div', { class: 'fzx-lobby' });

  const open = (to: PanelName): (() => void) => () => o.go({ to } as NavTarget);

  // ---- top row: back to the town, help, options (collecting Fuzzies lives in Fuzzies Land → Games → Fuzzy Collection) ----
  const back = h('button', { class: 'fzx-back', type: 'button', onclick: o.toLand, 'aria-label': 'Back to Fuzzies Land' }, gicon('town', 18), h('span', null, 'Town'));
  const helpBtn = h('button', { class: 'fzx-round', type: 'button', 'aria-label': 'How to play', onclick: () => showHelp() }, gicon('help', 22));
  const gearBtn = o.gfx ? h('button', { class: 'fzx-round', type: 'button', 'aria-label': 'Options', onclick: () => showOptions() }, gicon('gear', 22)) : null;
  const streak = accounts.current?.daily.streak ?? 0;
  const top = h('header', { class: 'fzx-lb-top' }, back, h('span', { class: 'fzx-sp' }), helpBtn, gearBtn);

  // ---- the stage: your Fuzzy ----
  const stage = h('div', { class: 'fzx-stage' },
    h('span', { class: 'fzx-rays', 'aria-hidden': 'true' }),
    h('span', { class: 'fzx-sky', 'aria-hidden': 'true' }, h('i', null), h('i', null), h('i', null)),
    h('div', { class: 'fzx-3d' }, bigPortrait(o.me, 190), h('span', { class: 'fzx-ground', 'aria-hidden': 'true' })),
    h('div', { class: 'fzx-name plain' }, h('b', null, o.me.name)));

  // ---- Play ----
  const modes: { id: PanelName; ic: ArtName; label: string; sub: string }[] = [
    { id: 'worlds', ic: 'worlds', label: 'Worlds', sub: `${Object.keys(s.worlds ?? {}).length} / 150` },
    { id: 'endless', ic: 'endless', label: 'Endless', sub: s.endless?.best ? `Best ${s.endless.best}` : 'How far can you go?' },
  ];
  const shownModes = modes.filter((m) => panelAvailable(m.id));
  const playBtn = h('button', { class: 'fzx-play', type: 'button', onclick: o.play }, gicon('play', 26), h('span', null, 'Play'));
  const modeRow = shownModes.length
    ? h('div', { class: `fzx-modes n${shownModes.length}` }, ...shownModes.map((m) => h('button', { class: 'fzx-mode', type: 'button', onclick: open(m.id) }, art(m.ic, 40), h('span', { class: 'fzx-mode-t' }, h('b', null, m.label), h('small', null, m.sub)))))
    : null;

  root.append(...[top, stage, playBtn, modeRow].filter((x): x is HTMLElement => !!x));

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
  requestAnimationFrame(() => mountHero(root, stage, o.me, o.touch, { claim: 0, missions: false, streak }));
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
  // the Classic Fuzzy stays the owner's picture (no 3D swap): a tap makes it hop and giggle
  if (me.id === 'classic') {
    const pic = box.querySelector<HTMLElement>('.fzx-lb-fuzzy');
    pic?.addEventListener('animationend', () => pic.classList.remove('hop'));
    pic?.addEventListener('click', () => { pic.classList.remove('hop'); void pic.offsetWidth; pic.classList.add('hop'); say(REACT[Math.floor(Math.random() * REACT.length)], 2200); });
    return;
  }
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
