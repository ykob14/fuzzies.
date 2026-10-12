/**
 * "Your Fuzzies are here!" — after a purchase, a crowd of fluffy Fuzzies bursts out across the whole screen, bounces and
 * wiggles for a moment, then they all hop into your Fuzzies counter one by one (it counts up as they land) and vanish.
 * Then a small card shows where to spend them. Respects "reduce motion" (no flying, just the card).
 */
import { h, btn, fuzzyMark } from './dom';
import { sfx } from '../game/sound';
import { accounts } from '../core/account';

const soundOn = () => accounts.current?.settings.sound !== false;
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** The visible Fuzzies counter to fly into (top bar, phone header or Fuzzies Land), else the top-right corner. */
function target(): DOMRect {
  const cands = [...document.querySelectorAll<HTMLElement>('.land-cap[data-k="fz"], .fz-chip, .fz-balance')];
  const el = cands.find((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.bottom > 0 && r.top < innerHeight; });
  return el?.getBoundingClientRect() ?? new DOMRect(innerWidth - 80, 20, 40, 40);
}
function bump(): void {
  for (const e of document.querySelectorAll<HTMLElement>('.land-cap[data-k="fz"], .fz-chip')) { e.classList.remove('fz-bump'); void e.offsetWidth; e.classList.add('fz-bump'); }
}

export async function celebrateFuzzies(amount: number, opts: { spendCard?: boolean } = {}): Promise<void> {
  const reduce = document.documentElement.dataset.motion === 'reduce';
  if (!reduce) {
    const count = Math.max(6, Math.min(36, Math.round(6 + amount / 90)));
    const layer = h('div', { class: 'fz-party', 'aria-hidden': 'true' });
    document.body.append(layer);
    const cx = innerWidth / 2, cy = innerHeight / 2;
    const flock = Array.from({ length: count }, (_, i) => {
      const size = Math.round(rnd(38, Math.min(96, innerWidth / 6)));
      const el = h('span', { class: 'fz-party-one', style: `width:${size}px;height:${size}px;left:${cx - size / 2}px;top:${cy - size / 2}px;--d:${rnd(0.9, 1.6).toFixed(2)}s;--w:${rnd(-14, 14).toFixed(1)}deg` }, fuzzyMark(size));
      layer.append(el);
      // spread out all over the screen (not stuck together)
      const x = rnd(16, innerWidth - size - 16) - (cx - size / 2);
      const y = rnd(70, innerHeight - size - 30) - (cy - size / 2);
      return { el, size, x, y, delay: i * 28 };
    });
    if (soundOn()) { sfx.shimmer(); setTimeout(() => sfx.giggle(), 350); }
    requestAnimationFrame(() => flock.forEach((f) => setTimeout(() => {
      f.el.style.transform = `translate(${f.x}px, ${f.y}px) rotate(${rnd(-20, 20).toFixed(0)}deg)`;
      f.el.classList.add('out');
    }, f.delay)));
    await sleep(1500 + count * 28);
    // hop into the counter one by one
    const t = target();
    let landed = 0;
    flock.forEach((f, i) => setTimeout(() => {
      const r = f.el.getBoundingClientRect();
      const dx = t.left + t.width / 2 - (r.left + r.width / 2), dy = t.top + t.height / 2 - (r.top + r.height / 2);
      f.el.classList.add('home');
      f.el.style.transform = `${f.el.style.transform} translate(${dx}px, ${dy}px) scale(0.25)`;
      setTimeout(() => {
        f.el.remove();
        landed++;
        bump();
        if (soundOn() && landed % 3 === 1) sfx.coins();
      }, 620);
    }, i * 55));
    await sleep(count * 55 + 760);
    layer.remove();
  }
  if (opts.spendCard !== false) spendCard(amount);
}

/** Where to use them: right after buying, make it obvious what Fuzzies are good for. */
function spendCard(amount: number): void {
  const go = (hash: string) => { card.remove(); location.hash = hash; };
  const card = h('div', { class: 'fz-spend', role: 'status' },
    h('div', { class: 'fz-spend-head' }, fuzzyMark(36), h('div', null, h('b', null, `+${amount.toLocaleString()} Fuzzies are yours!`), h('small', null, 'Here’s what you can do with them:'))),
    h('div', { class: 'fz-spend-row' },
      btn('🏝️ Build in Fuzzies Land', { kind: 'primary', size: 'sm', onClick: () => go('#/land') }),
      btn('🎁 Unlock goodies', { kind: 'soft', size: 'sm', onClick: () => go('#/rewards') })),
    h('small', { class: 'fz-spend-fine' }, 'Fuzzies Land: golden statues, rainbow arches, instant building and coin chests · Rewards: templates, stickers, fonts, themes and game looks'),
    h('button', { type: 'button', class: 'fz-spend-x', 'aria-label': 'Close' }, '×'));
  card.querySelector('.fz-spend-x')!.addEventListener('click', () => card.remove());
  document.body.append(card);
  requestAnimationFrame(() => card.classList.add('in'));
  setTimeout(() => { card.classList.remove('in'); setTimeout(() => card.remove(), 400); }, 14000);
}
