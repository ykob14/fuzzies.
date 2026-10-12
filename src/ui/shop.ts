/** "Get Fuzzies": packs you can buy with crypto (Rewards page, and the Fuzzies counter in Fuzzies Land). */
import { h, btn, fuzzyMark, modal } from './dom';
import { accounts } from '../core/account';
import { pay, money, type Pack } from '../core/pay';
import { openPaySheet } from './paySheet';
import { logoUrl } from './logos';
import { getArt } from './art3d';

const BEST = 'p1200';

/** The pack cards (empty when paying isn't switched on). `onPick` runs before the payment window opens. */
export async function packCards(onPick?: () => void): Promise<HTMLElement | null> {
  const cfg = await pay.config();
  if (!cfg.enabled || !cfg.packs.length) return null;
  const a = accounts.current;
  const base = cfg.packs[0];
  const perCent = base.fuzzies / base.cents;
  const card = (p: Pack) => {
    const bonus = Math.round((p.fuzzies / p.cents / perCent - 1) * 100);
    const b = h('button', { type: 'button', class: `pack ${p.id === BEST ? 'best' : ''}` },
      p.id === BEST ? h('span', { class: 'pack-flag' }, 'Best value') : null,
      h('span', { class: 'pack-art', 'data-pile': String(Math.min(3, cfg.packs.indexOf(p))) }, ...Array.from({ length: Math.min(4, cfg.packs.indexOf(p) + 1) }, () => fuzzyMark(34))),
      h('b', { class: 'pack-n' }, p.fuzzies.toLocaleString()),
      h('small', null, 'Fuzzies'),
      bonus > 0 ? h('span', { class: 'pack-bonus' }, `+${bonus}% bonus`) : h('span', { class: 'pack-bonus none' }, 'Starter'),
      h('span', { class: 'pack-price' }, money(p.cents)));
    b.addEventListener('click', () => {
      onPick?.();
      if (!a?.cloud) { location.hash = '#/profile'; return; }
      void openPaySheet({ kind: 'pack', item: p.id, title: 'Get Fuzzies', what: `${p.fuzzies.toLocaleString()} Fuzzies`, cents: p.cents, note: 'Use them for unlocks, upgrades and Fuzzies Land' });
    });
    return b;
  };
  const shop = h('div', { class: 'shop' },
    h('div', { class: 'pack-grid' }, ...cfg.packs.map(card)),
    h('div', { class: 'shop-pay' }, h('small', null, 'Pay with'),
      ...['usdc', 'eth', 'sol'].map((c) => h('img', { src: logoUrl(c), alt: c.toUpperCase(), title: c.toUpperCase(), width: '20', height: '20' })),
      h('small', null, 'on Base, Solana or Ethereum'),
      a?.cloud ? null : h('small', { class: 'shop-note' }, '· Save your account first (Profile) — bought Fuzzies live in your account.')));
  // swap the flat drawings for 3D piles of fluffy Fuzzies as soon as they're rendered
  void getArt().then((art) => {
    if (!art) return;
    for (const el of shop.querySelectorAll<HTMLElement>('.pack-art')) {
      el.replaceChildren(h('img', { src: art.piles[Number(el.dataset.pile)], alt: '', draggable: 'false' }));
      el.classList.add('real');
    }
  });
  return shop;
}

/** The shop as a window (used from Fuzzies Land). Falls back to the Rewards page when paying isn't on. */
export async function openShop(): Promise<void> {
  let m: { close(): void } | null = null;
  const cards = await packCards(() => m?.close());
  if (!cards) { location.hash = '#/rewards'; return; }
  m = modal('Get Fuzzies', h('div', null, h('p', { class: 'muted' }, 'Top up your Fuzzies to unlock goodies, speed up Fuzzies Land and more. Thank you for supporting Fuzzies!'), cards), { wide: true, actions: [btn('Not now', { kind: 'ghost', onClick: () => m?.close() })] });
}
