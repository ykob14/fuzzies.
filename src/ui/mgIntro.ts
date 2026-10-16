/**
 * Shared "mission start" card for the mini-games: the game's picture tile, the host Fuzzy, the time and the goal in one line,
 * the three steps, how to control it on this device, ONE big Start button — and, folded behind a small "Details" chip, the
 * twist, the scoring and the host's tip. Plus a small coach line that drops hints at the right moments during play.
 * (Look: land/mgSkin.css + crossing/ui/gameui.css. Words live in land/adventures.ts, never here.)
 */
import { h } from './dom';
import { friendUrl } from '../content/friends';
import { mgIcon, gameTile } from '../land/mgIcons';
import type { Adventure, Variant } from '../land/adventures';
import '../crossing/ui/gameui.css';
import '../land/mgSkin.css';

export interface IntroOpts { adv: Adventure; variant?: Variant | null; host: string; mobile: boolean; buttonLabel: string; onStart: () => void; extra?: string; /** town Fuzzies playing the same round against you */ vs?: { name: string; skin: [string, string] }[] }

// ---- faces: the owner's Fuzzy Friends, matched to a colour when we know it ----
const POOL: Record<string, string[]> = {
  pink: ['f01', 'f11', 'f17', 'f36'], red: ['f02', 'f18', 'f37'], orange: ['f03', 'f32'], yellow: ['f04', 'f13', 'f20', 'f38'],
  green: ['f05', 'f14', 'f21', 'f39'], cyan: ['f06', 'f22', 'f33'], blue: ['f16', 'f23', 'f34', 'f40'], purple: ['f08', 'f24', 'f35', 'f29'],
};
const colourWord = (hex: string): string => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return 'pink';
  const n = parseInt(m[1], 16), r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  if (d < 0.08) return 'blue';
  let hue = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  hue = (hue * 60 + 360) % 360;
  return hue < 12 || hue >= 348 ? 'red' : hue < 40 ? 'orange' : hue < 70 ? 'yellow' : hue < 170 ? 'green' : hue < 200 ? 'cyan' : hue < 262 ? 'blue' : hue < 322 ? 'purple' : 'pink';
};
const hash = (s: string): number => { let n = 7; for (const ch of s) n = (n * 31 + ch.charCodeAt(0)) >>> 0; return n; };
/** a round portrait for a named Fuzzy: a Fuzzy Friend of its colour, ringed in that colour */
export function faceOf(name: string, skin?: [string, string], size = 44): HTMLElement {
  const pool = skin ? POOL[colourWord(skin[0])] : Object.values(POOL).flat();
  const id = pool[hash(name) % pool.length];
  const ring = h('span', { class: 'mg-face', title: name }, h('img', { src: friendUrl(id), alt: '', width: size, height: size, draggable: 'false' }));
  ring.style.setProperty('--sz', `${size}px`);
  if (skin) ring.style.setProperty('--ring', skin[0]);
  return ring;
}

/** which picture goes with this device's control text */
function controlGlyph(text: string, mobile: boolean): string {
  const t = text.toLowerCase();
  if (mobile) return /swipe/.test(t) ? 'swipe' : /^tap|tap where|tap the/.test(t) ? 'tap' : /hold left|hold the left|hold left or right/.test(t) ? 'hold' : 'stick';
  return /wasd|arrow|←|→|a \/ d/.test(t) ? 'keys' : 'mouse';
}
const limitChip = (sec: number): string => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

/** The intro overlay. Returns the overlay element (hide it with `hidden = true` when the game starts). */
export function introCard(o: IntroOpts): HTMLElement {
  const a = o.adv;
  const ctlText = o.mobile ? a.controls.mobile : a.controls.desktop;
  const hostSkin = o.vs?.[0]?.name === o.host ? o.vs[0].skin : undefined;
  const start = h('button', { class: 'btn btn-primary fzx-bigbtn mg-start', type: 'button', onclick: o.onStart }, mgIcon('play', 24), h('span', null, o.buttonLabel));
  const details = h('details', { class: 'mg-more' }, h('summary', null, mgIcon('info', 16), h('span', null, 'Details')),
    h('div', { class: 'mg-more-body' },
      o.variant ? h('p', { class: 'mg-twist' }, mgIcon('flag', 16), h('span', null, `Today’s twist: ${o.variant.note}`)) : null,
      h('p', null, mgIcon('trophy', 16), h('span', null, a.scoring)),
      o.extra ? h('p', null, mgIcon('star', 16), h('span', null, o.extra)) : null,
      h('p', { class: 'mg-tip' }, mgIcon('bulb', 16), h('span', null, a.tip))));
  const box = h('div', { class: 'forest-intro-box mg-intro-box' },
    h('div', { class: 'mg-stage' },
      h('i', { class: 'mg-rays' }),
      gameTile(a.id, 92, 'mg-hero'),
      h('span', { class: 'mg-host' }, faceOf(o.host, hostSkin, 46), h('b', null, o.host))),
    h('h2', null, a.name),
    o.variant ? h('span', { class: 'mg-variant' }, o.variant.name) : null,
    h('p', { class: 'mg-goal' },
      a.limit ? h('span', { class: 'mg-timechip' }, mgIcon('clock', 15), limitChip(a.limit)) : null,
      h('span', { class: 'mg-goal-t' }, a.objective)),
    o.vs?.length ? h('p', { class: 'mg-vs' }, h('span', { class: 'mg-vs-l' }, 'vs'), ...o.vs.map((r) => h('span', { class: 'mg-rival' }, faceOf(r.name, r.skin, 38), h('b', null, r.name)))) : null,
    h('ol', { class: 'mg-steps' }, ...a.howTo.map((t) => h('li', null, h('span', null, t)))),
    h('p', { class: 'mg-ctl' }, h('span', { class: 'mg-ctl-ic' }, mgIcon(controlGlyph(ctlText, o.mobile), 20)), h('span', null, ctlText)),
    start,
    details);
  return h('div', { class: 'forest-intro mg-intro' }, box);
}

/** A coach line near the bottom of the screen: `say(text)` shows it for a few seconds; each `key` is said only once. */
export function coach(root: HTMLElement): { say: (key: string, text: string, ms?: number) => void; destroy: () => void } {
  const el = h('div', { class: 'mg-coach', role: 'status' });
  root.append(el);
  const said = new Set<string>();
  let timer = 0;
  return {
    say(key, text, ms = 3600) {
      if (said.has(key)) return;
      said.add(key);
      el.textContent = text;
      el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');
      clearTimeout(timer);
      timer = window.setTimeout(() => el.classList.remove('on'), ms);
    },
    destroy() { clearTimeout(timer); el.remove(); },
  };
}
