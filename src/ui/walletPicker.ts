/**
 * "Connect a wallet" window: lists the wallets installed in this browser (MetaMask, Coinbase Wallet, Trust Wallet,
 * Rabby, Brave…), or — on a phone without one — opens Fuzzies inside the wallet app. The chosen wallet is handed to
 * `run` (link it to the account, or sign in with it); the window stays open with a friendly message if that fails.
 */
import { h, icon, modal } from './dom';
import { findWallets, isPhone, walletApps, type WalletChoice } from '../core/wallet';

const DOWNLOADS = [
  { name: 'MetaMask', href: 'https://metamask.io/download/' },
  { name: 'Coinbase Wallet', href: 'https://www.coinbase.com/wallet/downloads' },
  { name: 'Trust Wallet', href: 'https://trustwallet.com/download' },
];

export function walletBadge(w: { name: string; icon?: string }): HTMLElement {
  if (w.icon) return h('img', { class: 'wallet-logo', src: w.icon, alt: '', width: '32', height: '32' });
  return h('span', { class: 'wallet-logo letter', 'aria-hidden': 'true' }, w.name.slice(0, 1).toUpperCase());
}

/** The safety promise shown wherever wallets come up. */
export function walletSafetyNote(): HTMLElement {
  return h('div', { class: 'wallet-safe' }, icon('lock', 16),
    h('div', null,
      h('b', null, 'Safe & free'),
      h('small', null, 'Your wallet only signs a short message to prove it’s yours. Fuzzies never sends transactions, never asks for payments and can’t touch your funds. We will never ask for your recovery phrase — anyone who does is a scammer.')));
}

export function pickWallet(opts: { title: string; intro: string; run: (w: WalletChoice) => Promise<void>; hash?: string }): void {
  const list = h('div', { class: 'wallet-list', 'aria-busy': 'true' }, h('p', { class: 'muted wallet-looking' }, 'Looking for wallets…'));
  const msg = h('p', { class: 'form-err', role: 'alert' });
  const m = modal(opts.title, h('div', { class: 'wallet-pick' }, h('p', { class: 'muted' }, opts.intro), list, msg, walletSafetyNote()));

  void findWallets().then((found) => {
    list.removeAttribute('aria-busy');
    if (found.length) {
      list.replaceChildren(...found.map((w) => {
        const status = h('small', { class: 'wallet-status' }, 'Connect');
        const b = h('button', { type: 'button', class: 'wallet-opt' }, walletBadge(w), h('b', null, w.name), status);
        b.addEventListener('click', async () => {
          msg.textContent = '';
          list.querySelectorAll('button').forEach((x) => (x.disabled = true));
          b.classList.add('busy');
          status.textContent = 'Check your wallet…';
          try { await opts.run(w); m.close(); }
          catch (e) { msg.textContent = (e as Error).message; status.textContent = 'Connect'; }
          finally { b.classList.remove('busy'); list.querySelectorAll('button').forEach((x) => (x.disabled = false)); }
        });
        return b;
      }), h('p', { class: 'fine' }, 'Using another wallet? Any Ethereum wallet installed in this browser shows up here.'));
    } else if (isPhone()) {
      // phone browsers can't talk to wallet apps directly: open this page in the wallet app's own browser
      list.replaceChildren(
        h('p', { class: 'wallet-hint' }, 'Open Fuzzies inside your wallet app, then connect from there:'),
        ...walletApps(opts.hash).map((a) => h('a', { class: 'wallet-opt', href: a.link, rel: 'noopener noreferrer' }, walletBadge(a), h('b', null, `Open in ${a.name}`), icon('chevR', 16))));
    } else {
      list.replaceChildren(
        h('p', { class: 'wallet-hint' }, 'No wallet found in this browser. Install one from its official website, then reload this page:'),
        ...DOWNLOADS.map((d) => h('a', { class: 'wallet-opt', href: d.href, target: '_blank', rel: 'noopener noreferrer' }, walletBadge(d), h('b', null, d.name), icon('chevR', 16))));
    }
  });
}


