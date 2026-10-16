/**
 * Happy Friday! The first time a player opens Fuzzy Crossing on a Friday, every Fuzzy pops onto the screen, jumps and dances,
 * "HAPPY FRIDAY!" drops in, and there is a gift to claim: a random 50–100 Fuzzies.
 *
 * Once per player per Friday — decided by the SERVER for cloud accounts (table fz_friday, one row per player per Friday, so a
 * refresh or a second device can't claim again; the amount is picked there too). On-device accounts (guests, local) remember the
 * Friday in this browser. Nothing here touches the game itself; the overlay sits on top and goes away when the gift is claimed.
 */
import { h, fuzzyMark } from './dom';
import { sfx } from '../game/sound';
import { accounts } from '../core/account';
import { rewards } from '../core/rewards';
import { cloud } from '../core/cloud';
import { api } from '../core/api';
import { sync } from '../core/sync';
import { art } from '../crossing/ui/art';
import { equippedCharacter } from '../crossing/store';
import { celebrateFuzzies } from './celebrate';
import '../crossing/ui/gameui.css';
import './friday.css';

/** "now" — in development the clock can be set with localStorage fz.dev.now (a number) to test on any day */
const now = (): Date => {
  if (import.meta.env.DEV) { const v = Number(localStorage.getItem('fz.dev.now')); if (v > 0) return new Date(v); }
  return new Date();
};
/** the player's local date as YYYY-MM-DD */
export const localDay = (d = now()): string => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const isFriday = (d = now()): boolean => d.getDay() === 5;

const flagKey = (): string => `fz.friday.${accounts.current?.id ?? 'x'}`;
const claimedHere = (day: string): boolean => { try { return localStorage.getItem(flagKey()) === day; } catch { return false; } };
const remember = (day: string): void => { try { localStorage.setItem(flagKey(), day); } catch { /* private mode: the server still knows */ } };

let showing = false;

/** Decide whether to celebrate (cheap checks first, then the server for cloud accounts) and show it. Never throws, never blocks the game. */
export async function maybeShowFriday(): Promise<void> {
  try {
    const a = accounts.current;
    if (showing || !a || !isFriday()) return;
    const day = localDay();
    if (claimedHere(day)) return; // already done on this device
    const cloudAccount = cloud.enabled && !!a.cloud;
    if (cloudAccount) {
      const r = await api<{ available: boolean }>('pay', 'friday.status', { day });
      if (!r.available) { remember(day); return; } // claimed on another device (or the server doesn't think it's Friday)
    }
    if (document.querySelector('.fz-friday')) return;
    void show(day, cloudAccount);
  } catch { /* offline or the server is busy: the surprise simply waits for the next visit */ }
}

async function claim(day: string, cloudAccount: boolean): Promise<number> {
  if (cloudAccount) {
    const r = await api<{ already: boolean; amount: number }>('pay', 'friday.claim', { day });
    remember(day);
    if (r.already) return 0;
    void sync.pull(); // the server added the Fuzzies to the profile; bring the new balance in
    return r.amount;
  }
  const amount = 50 + Math.floor(Math.random() * 51);
  remember(day);
  rewards.earn(amount, 'Happy Friday');
  return amount;
}

const soundOn = () => accounts.current?.settings.sound !== false;

/** the ribbon: raspberry band with swallow-tail ends, cream lettering */
function banner(): HTMLElement {
  const OUT = '#8a1d49';
  const star = (x: number, y: number, r: number, c = '#fff') => `<path d="M${x} ${y - r}q1.4 ${r - 1.4} ${r} ${r}q-${r - 1.4} 1.4 -${r} ${r}q-1.4 -${r - 1.4} -${r} -${r}q${r - 1.4} -1.4 ${r} -${r}z" fill="${c}"/>`;
  const el = document.createElement('div');
  el.className = 'ff-banner';
  el.innerHTML = `<svg viewBox="0 0 440 170" aria-hidden="true">
    <defs><linearGradient id="ffb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff7aa8"/><stop offset="1" stop-color="#d6336c"/></linearGradient><linearGradient id="ffc" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b52a5c"/><stop offset="1" stop-color="#8a1d49"/></linearGradient>
    <path id="ffp" d="M52 106Q220 58 388 106"/></defs>
    <path d="M10 66l62 8-12 38 12 38-62-6 20-36z" fill="url(#ffc)" stroke="${OUT}" stroke-width="5" stroke-linejoin="round"/>
    <path d="M430 66l-62 8 12 38-12 38 62-6-20-36z" fill="url(#ffc)" stroke="${OUT}" stroke-width="5" stroke-linejoin="round"/>
    <path d="M44 56Q220 8 396 56L396 134Q220 86 44 134Z" fill="url(#ffb)" stroke="${OUT}" stroke-width="5.5" stroke-linejoin="round"/>
    <path d="M52 62Q220 16 388 62L388 78Q220 34 52 78Z" fill="#fff" opacity=".28"/>
    <text font-family="Fredoka, 'Baloo 2', system-ui, sans-serif" font-weight="700" font-size="40" letter-spacing=".5" fill="#fff8ee" stroke="${OUT}" stroke-width="7" stroke-linejoin="round" paint-order="stroke" text-anchor="middle"><textPath href="#ffp" startOffset="50%">FUZZIE FRIDAY!</textPath></text>
    ${star(34, 28, 12)}${star(412, 22, 9, '#ffe08a')}${star(402, 150, 8)}${star(26, 150, 7, '#ffe08a')}${star(224, 14, 7, '#ffe08a')}
  </svg>`;
  return el;
}

async function show(day: string, cloudAccount: boolean): Promise<void> {
  showing = true;
  const reduce = document.documentElement.dataset.motion === 'reduce' || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const phone = innerWidth < 640;
  const hero = equippedCharacter();

  // the 3D stage loads in the background and drops the Fuzzies in as soon as it is ready (on a slow phone the banner and the gift are already there)
  let stage: import('./fridayScene').FridayScene | null = null;
  let closed = false;
  const stageReady = import('./fridayScene').then((m) => m.createFridayScene({ hero, phone, calm: reduce, sound: soundOn() })).catch((e) => { console.error(e); return null; });

  // the gift card
  const amountEl = h('b', { class: 'ff-amt' }, '0');
  const gift = h('span', { class: 'ff-gift' }, art('events', 92));
  const lead = h('div', { class: 'ff-lead' }, h('b', null, 'Your Friday gift'), h('small', null, 'Free Fuzzies, just for you'));
  const prize = h('div', { class: 'ff-prize' }, fuzzyMark(46), amountEl);
  const claimBtn = h('button', { class: 'fzx-bigbtn ff-claim', type: 'button' }, 'Claim');
  const later = h('button', { class: 'ff-later', type: 'button' }, 'Later');
  const card = h('div', { class: 'ff-card fzx-card' }, h('div', { class: 'ff-row' }, gift, lead, prize), claimBtn, later);

  const el = h('div', { class: `fz-friday ${reduce ? 'calm' : ''}`, role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Fuzzie Friday! A gift for you' },
    h('div', { class: 'ff-beams', 'aria-hidden': 'true' }), h('div', { class: 'ff-floor', 'aria-hidden': 'true' }),
    banner(), card);
  document.body.append(el);
  requestAnimationFrame(() => el.classList.add('in'));
  void stageReady.then((st) => {
    if (!st) return;
    if (closed) { st.dispose(); return; }
    stage = st;
    el.insertBefore(st.el, el.querySelector('.ff-banner'));
    st.resize();
    st.start();
  });
  const onResize = (): void => stage?.resize();
  addEventListener('resize', onResize);

  if (soundOn()) { sfx.whoosh(); setTimeout(() => sfx.shimmer(), 900); setTimeout(() => sfx.giggle(), 1300); }

  const close = (): void => { closed = true; el.classList.add('out'); removeEventListener('keydown', onKey); removeEventListener('resize', onResize); setTimeout(() => { stage?.dispose(); el.remove(); showing = false; }, 320); };
  const onKey = (e: KeyboardEvent): void => { if (e.key === 'Escape') close(); };
  addEventListener('keydown', onKey);
  later.addEventListener('click', close);
  setTimeout(() => claimBtn.focus({ preventScroll: true }), 1500);

  let busy = false;
  claimBtn.addEventListener('click', () => {
    if (busy) return;
    busy = true;
    claimBtn.disabled = true;
    claim(day, cloudAccount).then((amount) => {
      if (!amount) { lead.replaceChildren(h('b', null, 'Already opened!'), h('small', null, 'See you next Friday')); claimBtn.replaceWith(h('button', { class: 'fzx-bigbtn ff-claim now', type: 'button', onclick: close }, 'OK')); later.remove(); return; }
      el.classList.add('opened');
      stage?.party();
      later.remove();
      if (soundOn()) { sfx.boing(); setTimeout(() => sfx.shimmer(), 150); setTimeout(() => sfx.coins(), 650); }
      lead.replaceChildren(h('b', null, 'Fuzzie Friday!'), h('small', null, 'Added to your Fuzzies'));
      const t0 = performance.now();
      const tick = (t: number): void => { const k = Math.min(1, (t - t0) / 1000); amountEl.textContent = '+' + Math.round(amount * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
      claimBtn.replaceWith(h('button', { class: 'fzx-bigbtn ff-claim now', type: 'button', onclick: () => { close(); void celebrateFuzzies(amount, { spendCard: false }); } }, 'Yay!'));
    }).catch((e: Error) => {
      busy = false;
      claimBtn.disabled = false;
      lead.replaceChildren(h('b', null, 'Couldn’t open it'), h('small', null, e.message || 'Try again in a moment'));
    });
  });
}
