/**
 * The gift box: a wrapped present appears on screen; double-click (or double-tap) it and a Fuzzy pops out with a giggle
 * and a sparkle, and you earn the gift's Fuzzies (100 for a newly activated wallet). Each gift opens once — the server
 * decides that (gift.open), so it can't be opened twice on two devices.
 */
import { h, btn, fuzzyMark, toast } from './dom';
import { mascot } from './mascot';
import { getArt } from './art3d';
import { celebrateFuzzies } from './celebrate';
import { sfx } from '../game/sound';
import { cloud } from '../core/cloud';
import { accounts } from '../core/account';
import { pay, type Gift } from '../core/pay';

let showing = false;

/** Show the next unopened gift, if there is one (cloud accounts only; quietly does nothing otherwise). */
export async function checkGifts(): Promise<void> {
  if (showing || !cloud.enabled || !accounts.current?.cloud) return;
  try {
    const [g] = await pay.gifts();
    if (g) showGift(g);
  } catch { /* offline: next time */ }
}

export function showGift(g: Gift): void {
  if (showing) return;
  showing = true;
  const reduce = document.documentElement.dataset.motion === 'reduce';
  const touch = matchMedia('(pointer: coarse)').matches;
  const hint = h('p', { class: 'gift-hint' }, touch ? 'Double-tap the present to open it!' : 'Double-click the present to open it!');
  const title = h('h2', { class: 'gift-title' }, 'A gift for you!');
  const box = h('button', { type: 'button', class: 'gift', 'aria-label': `Gift box with ${g.amount} Fuzzies — press twice to open` },
    h('span', { class: 'gift-shadow' }),
    h('span', { class: 'gift-body' }, h('span', { class: 'gift-ribbon v' })),
    h('span', { class: 'gift-lid' }, h('span', { class: 'gift-ribbon v' }), h('span', { class: 'gift-bow l' }), h('span', { class: 'gift-bow r' }), h('span', { class: 'gift-knot' })));
  // the real 3D present replaces the drawn one as soon as it's rendered (usually before anyone has clicked)
  void getArt().then((art) => {
    if (!art || !box.isConnected) return;
    box.querySelector('.gift-body')!.replaceWith(h('img', { class: 'gift-img gift-body', src: art.giftBody, alt: '', draggable: 'false' }));
    box.querySelector('.gift-lid')!.replaceWith(h('img', { class: 'gift-img gift-lid', src: art.giftLid, alt: '', draggable: 'false' }));
    box.classList.add('real');
  });
  const pop = h('div', { class: 'gift-pop', 'aria-hidden': 'true' }, mascot(132, { sparkles: true }));
  const sparks = h('div', { class: 'gift-sparks', 'aria-hidden': 'true' });
  const actions = h('div', { class: 'gift-actions' });
  const later = h('button', { type: 'button', class: 'link small gift-later' }, 'Open it later');
  const stage = h('div', { class: 'gift-stage' }, h('div', { class: 'gift-rays', 'aria-hidden': 'true' }), sparks, pop, box);
  const overlay = h('div', { class: 'gift-overlay', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'A gift for you' }, h('div', { class: 'gift-card' }, title, stage, hint, actions, later));
  document.body.append(overlay);
  requestAnimationFrame(() => overlay.classList.add('in'));
  setTimeout(() => box.focus(), 300);

  const close = () => { overlay.classList.remove('in'); setTimeout(() => { overlay.remove(); showing = false; }, 250); };
  later.addEventListener('click', close);

  let last = 0, opening = false;
  const press = () => {
    if (opening) return;
    const now = Date.now();
    if (now - last < 450) { void open(); return; }
    last = now;
    box.classList.remove('nudge'); void box.offsetWidth; box.classList.add('nudge');
    hint.textContent = 'Once more!';
    sfx.hop();
  };
  box.addEventListener('click', press); // two quick clicks/taps (works the same with mouse, finger and keyboard)

  async function open(): Promise<void> {
    opening = true;
    later.remove();
    // 1. the lid pops off …
    box.classList.add('opening');
    sfx.boing();
    let amount = g.amount;
    try {
      [amount] = await Promise.all([pay.openGift(g.id), new Promise((r) => setTimeout(r, reduce ? 0 : 550))]);
    } catch (e) {
      opening = false;
      box.classList.remove('opening');
      hint.textContent = (e as Error).message || 'Couldn’t open it right now — try again.';
      if ((e as { status?: number }).status === 404) setTimeout(close, 1800);
      return;
    }
    // 2. … the present disappears, and the Fuzzy pops out where it was
    overlay.classList.add('opened');
    for (let i = 0; i < (reduce ? 0 : 18); i++) {
      const s = h('span', { class: 'gift-spark', style: `--a:${(i / 18) * 360}deg;--d:${70 + (i % 3) * 30}px;--t:${0.5 + (i % 4) * 0.1}s` });
      sparks.append(s);
    }
    sfx.shimmer();
    setTimeout(() => { sfx.giggle(); }, 420);
    setTimeout(() => sfx.coins(), 900);
    title.textContent = `You earned ${amount} Fuzzies!`;
    const n = h('b', { class: 'gift-n' }, '0');
    hint.replaceChildren(fuzzyMark(26), n, h('span', null, ' added to your account'));
    const t0 = performance.now();
    const count = (t: number) => { const k = Math.min(1, (t - t0) / 900); n.textContent = String(Math.round(amount * k)); if (k < 1) requestAnimationFrame(count); };
    requestAnimationFrame(count);
    actions.replaceChildren(btn('Yay! 🎉', { kind: 'primary', size: 'lg', onClick: () => { close(); void celebrateFuzzies(amount, { spendCard: false }).then(() => { toast(`+${amount} Fuzzies · gift`, 'fuzzy'); setTimeout(() => void checkGifts(), 400); }); } }));
  }
}
