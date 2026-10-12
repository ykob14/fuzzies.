/**
 * "Connect a wallet" window.
 * 1. Wallets installed in this browser (every Ethereum wallet announces itself: MetaMask, Coinbase Wallet, Trust Wallet,
 *    Crypto.com Onchain, OKX, Phantom, Rabby, Rainbow, Brave…) — tap to connect.
 * 2. Popular wallets that aren't here — tap for the safe way in: open Fuzzies inside the wallet app (official link
 *    where the wallet has one, otherwise step-by-step with a "Copy address" button) or get it from its official site.
 * The chosen wallet is handed to `run`; the window stays open with a friendly message if that fails.
 */
import { h, icon, modal, toast } from './dom';
import { findWallets, isPhone, pageUrl, TOP_WALLETS, type TopWallet, type WalletChoice } from '../core/wallet';

export function walletBadge(w: { name: string; icon?: string }): HTMLElement {
  if (w.icon) return h('img', { class: 'wallet-logo', src: w.icon, alt: '', width: '32', height: '32' });
  return h('span', { class: 'wallet-logo letter', 'aria-hidden': 'true' }, w.name.slice(0, 1).toUpperCase());
}

/** The safety promise shown wherever wallets come up. */
export function walletSafetyNote(): HTMLElement {
  return h('div', { class: 'wallet-safe' }, icon('lock', 16),
    h('div', null,
      h('b', null, 'Safe & free'),
      h('small', null, 'Your wallet only signs a short message to prove it’s yours. Fuzzies never sends transactions, never asks for payments and can’t touch your funds. We will never ask for your recovery phrase — anyone who does is a scammer.'),
      h('small', null, 'Before you sign, check that your wallet shows ', h('b', null, location.host), '. If it shows anything else, cancel.')));
}

async function copyAddress(url: string): Promise<void> {
  try { await navigator.clipboard.writeText(url); toast('Address copied — paste it in your wallet’s browser', 'good', 3000); }
  catch { toast(url, 'info', 6000); }
}

/** What to do for a popular wallet that isn't in this browser. */
function helpFor(t: TopWallet, url: string, phone: boolean): HTMLElement {
  const official = h('a', { class: 'btn btn-ghost btn-sm', href: t.site, target: '_blank', rel: 'noopener noreferrer' }, icon('download', 16), h('span', null, phone || !t.desktop ? 'Get the app' : 'Get it (official site)'));
  const copy = h('button', { type: 'button', class: 'btn btn-soft btn-sm' }, icon('copy', 16), h('span', null, 'Copy address'));
  copy.addEventListener('click', () => void copyAddress(url));
  const host = () => h('b', { class: 'wallet-host' }, location.host);
  if (phone && t.open) {
    return h('div', { class: 'wallet-help' },
      h('p', null, `Opens Fuzzies inside the ${t.name} app, where you can connect safely.`),
      h('div', { class: 'btn-row' }, h('a', { class: 'btn btn-primary btn-sm', href: t.open(url), rel: 'noopener noreferrer' }, h('span', null, `Open in ${t.name}`)), official));
  }
  if (phone) {
    return h('div', { class: 'wallet-help' },
      h('p', null, `Open ${t.name}, go to ${t.browser} and enter `, host(), '. Then tap “Connect a wallet” again in there.'),
      h('div', { class: 'btn-row' }, copy, official));
  }
  if (!t.desktop) {
    return h('div', { class: 'wallet-help' },
      h('p', null, `${t.name} is a phone app. On your phone, open ${t.name}, go to ${t.browser} and enter `, host(), ' — then connect from there.'),
      h('div', { class: 'btn-row' }, copy, official));
  }
  return h('div', { class: 'wallet-help' },
    h('p', null, `Add the ${t.name} browser extension from its official site, then reload this page. Or on your phone: open ${t.name}, go to ${t.browser} and enter `, host(), '.'),
    h('div', { class: 'btn-row' }, official, copy));
}

export function pickWallet(opts: { title: string; intro: string; run: (w: WalletChoice, password: string) => Promise<void>; hash?: string; password?: boolean }): void {
  const list = h('div', { class: 'wallet-list', 'aria-busy': 'true' }, h('p', { class: 'muted wallet-looking' }, 'Looking for wallets…'));
  const more = h('div', { class: 'wallet-list' });
  const msg = h('p', { class: 'form-err', role: 'alert' });
  const pw = h('input', { class: 'input', type: 'password', autocomplete: 'current-password', placeholder: 'Your Fuzzies password' });
  const pwField = opts.password
    ? h('label', { class: 'field wallet-pw' }, h('span', null, 'First, confirm it’s you'), pw, h('small', { class: 'muted' }, 'A linked wallet can log in to your account, so we ask for your password.'))
    : null;
  const m = modal(opts.title, h('div', { class: 'wallet-pick' }, h('p', { class: 'muted' }, opts.intro), ...(pwField ? [pwField] : []), list, msg, more, walletSafetyNote()));
  const url = pageUrl(opts.hash);
  const phone = isPhone();
  if (pwField) setTimeout(() => pw.focus(), 60);

  void findWallets().then((found) => {
    list.removeAttribute('aria-busy');
    const buttons = found.map((w) => {
      const status = h('small', { class: 'wallet-status' }, 'Connect');
      const b = h('button', { type: 'button', class: 'wallet-opt' }, walletBadge(w), h('b', null, w.name), status);
      b.addEventListener('click', async () => {
        msg.textContent = '';
        if (opts.password && !pw.value) { msg.textContent = 'Please enter your Fuzzies password first.'; pw.focus(); return; }
        list.querySelectorAll('button').forEach((x) => (x.disabled = true));
        b.classList.add('busy');
        status.textContent = 'Check your wallet…';
        try { await opts.run(w, pw.value); m.close(); }
        catch (e) { msg.textContent = (e as Error).message; status.textContent = 'Connect'; }
        finally { b.classList.remove('busy'); list.querySelectorAll('button').forEach((x) => (x.disabled = false)); }
      });
      return b;
    });
    list.replaceChildren(...(buttons.length
      ? [h('p', { class: 'wallet-head' }, phone ? 'In this app' : 'In this browser'), ...buttons]
      : [h('p', { class: 'wallet-hint' }, phone
        ? 'No wallet in this browser. Pick your wallet below to open Fuzzies inside its app:'
        : 'No wallet found in this browser. Pick yours below to see how to connect it:')]));

    // popular wallets that aren't installed here
    const rest = TOP_WALLETS.filter((t) => !found.some((w) => t.match.test(w.name)));
    more.replaceChildren(h('p', { class: 'wallet-head' }, buttons.length ? 'Other popular wallets' : 'Popular wallets'), ...rest.map((t) => {
      const row = h('div', { class: 'wallet-more' });
      const b = h('button', { type: 'button', class: 'wallet-opt', 'aria-expanded': 'false' }, walletBadge(t), h('b', null, t.name), icon('chevR', 16));
      b.addEventListener('click', () => {
        const open = row.classList.toggle('open');
        b.setAttribute('aria-expanded', String(open));
        if (open && !row.querySelector('.wallet-help')) row.append(helpFor(t, url, phone));
      });
      row.append(b);
      return row;
    }), h('p', { class: 'fine' }, 'Any other Ethereum wallet works too once it’s installed in this browser.'));
  });
}
