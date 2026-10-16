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
import { friendUrl, FRIENDS } from '../content/friends';
import { gicon } from '../crossing/ui/gicons';
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
    show(day, cloudAccount);
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

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const soundOn = () => accounts.current?.settings.sound !== false;

function show(day: string, cloudAccount: boolean): void {
  showing = true;
  const reduce = document.documentElement.dataset.motion === 'reduce' || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const phone = innerWidth < 600;

  // the crowd: the owner's Fuzzy Friends, spread round the edges so the middle stays free for the title and the gift
  const picks = [...FRIENDS].sort(() => Math.random() - 0.5).slice(0, phone ? 10 : 15);
  const slots = phone
    ? [[14, 13], [86, 11], [13, 34], [87, 37], [14, 60], [86, 63], [24, 84], [50, 88], [76, 84], [50, 6]]
    : [[9, 18], [91, 16], [18, 8], [82, 7], [7, 42], [93, 44], [11, 66], [89, 68], [24, 84], [76, 84], [50, 87], [37, 88], [63, 88], [31, 11], [69, 11]];
  const crowd = picks.map((f, i) => {
    const [x, y] = slots[i] ?? [rnd(8, 92), rnd(10, 90)];
    const kind = ['jump', 'sway', 'spin', 'bounce'][i % 4];
    return h('span', { class: `ff-f ff-${kind}`, style: `left:${x}%;top:${y}%;--i:${i};--d:${(rnd(0.55, 0.95)).toFixed(2)}s;--t:${(0.28 + i * 0.075).toFixed(2)}s;--s:${(rnd(0.85, 1.15)).toFixed(2)}` },
      h('img', { src: friendUrl(f.id), alt: '', draggable: 'false', width: 96, height: 96 }));
  });

  // "HAPPY FRIDAY!" — letters drop in one by one
  const word = (w: string, base: number) => h('span', { class: 'ff-word' }, ...[...w].map((c, i) => h('span', { class: 'ff-l', style: `--k:${(base + i * 0.06).toFixed(2)}s` }, c)));
  const title = h('h1', { class: 'ff-title', 'aria-label': 'Happy Friday!' }, word('HAPPY', 1.0), word('FRIDAY!', 1.35));

  // the gift
  const giftBox = h('span', { class: 'ff-gift' }, h('span', { class: 'fzx-ic', style: '--sz:104px' }, gicon('events', 66)));
  const amountEl = h('b', { class: 'ff-amt' }, '0');
  const reward = h('div', { class: 'ff-reward', 'aria-live': 'polite' }, fuzzyMark(44), amountEl, h('span', null, 'Fuzzies'));
  const msg = h('p', { class: 'ff-msg' }, 'You have a Friday gift!');
  const claimBtn = h('button', { class: 'fzx-bigbtn ff-claim', type: 'button' }, gicon('events', 24), 'Claim my gift!');
  const later = h('button', { class: 'ff-later', type: 'button' }, 'Later');
  const card = h('div', { class: 'ff-card' }, title, giftBox, reward, msg, claimBtn, later);

  const confetti = reduce ? null : h('div', { class: 'ff-confetti', 'aria-hidden': 'true' }, ...Array.from({ length: phone ? 26 : 44 }, (_, i) => {
    const cols = ['#ffffff', '#ffd1e1', '#ff6b9a', '#f5b014', '#d6336c'];
    return h('i', { style: `left:${rnd(0, 100).toFixed(1)}%;--c:${cols[i % cols.length]};--w:${rnd(5, 10).toFixed(1)}px;--f:${rnd(2.2, 4).toFixed(2)}s;--dl:${(rnd(1.1, 3.4)).toFixed(2)}s;--r:${rnd(-540, 540).toFixed(0)}deg;--x:${rnd(-60, 60).toFixed(0)}px` });
  }));
  const el = h('div', { class: `fz-friday ${reduce ? 'calm' : ''}`, role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Happy Friday! A gift for you' },
    h('div', { class: 'ff-rays', 'aria-hidden': 'true' }), confetti, ...crowd, card);
  document.body.append(el);
  requestAnimationFrame(() => el.classList.add('in'));

  if (soundOn()) {
    sfx.whoosh();
    picks.forEach((_, i) => setTimeout(() => { if (i % 3 === 0) sfx.hop(); }, 280 + i * 75));
    setTimeout(() => sfx.shimmer(), 1100);
    setTimeout(() => sfx.giggle(), 1500);
  }

  const close = (): void => { el.classList.add('out'); setTimeout(() => { el.remove(); showing = false; }, 320); removeEventListener('keydown', onKey); };
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
      if (!amount) { msg.textContent = 'You already opened today’s gift — see you next Friday!'; claimBtn.replaceWith(h('button', { class: 'fzx-bigbtn ff-claim now', type: 'button', onclick: close }, 'OK')); later.remove(); return; }
      el.classList.add('opened');
      later.remove();
      if (soundOn()) { sfx.boing(); setTimeout(() => sfx.shimmer(), 150); setTimeout(() => sfx.coins(), 700); }
      msg.textContent = 'Your free Friday gift!';
      const t0 = performance.now();
      const tick = (t: number): void => { const k = Math.min(1, (t - t0) / 1000); amountEl.textContent = String(Math.round(amount * (1 - Math.pow(1 - k, 3)))); if (k < 1) requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
      claimBtn.replaceWith(h('button', { class: 'fzx-bigbtn ff-claim now', type: 'button', onclick: () => { close(); void celebrateFuzzies(amount, { spendCard: false }); } }, 'Yay!'));
    }).catch((e: Error) => {
      busy = false;
      claimBtn.disabled = false;
      msg.textContent = e.message || 'Couldn’t open the gift right now — try again.';
    });
  });
}
