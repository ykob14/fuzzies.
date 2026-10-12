/**
 * "Connect a wallet" window.
 * 1. Wallets installed in this browser (every Ethereum wallet announces itself: MetaMask, Coinbase Wallet, Trust Wallet,
 *    Crypto.com Onchain, OKX, Phantom, Rabby, Rainbow, Brave…) — tap to connect.
 * 2. "Scan with your phone wallet" (WalletConnect): a QR code on computers & tablets, a wallet-app list on phones —
 *    works with Robinhood Wallet, Crypto.com Onchain and 500+ others. Shown when the site has a WalletConnect project ID.
 * 3. Popular wallets that aren't here — tap for the safe way in: open Fuzzies inside the wallet app (official link
 *    where the wallet has one, otherwise step-by-step with a "Copy address" button) or get it from its official site.
 * The chosen wallet is handed to `run`; the window stays open with a friendly message if that fails.
 */
import { h, icon, modal, toast } from './dom';
import { findWallets, isPhone, isTablet, pageUrl, TOP_WALLETS, type TopWallet, type WalletChoice } from '../core/wallet';
import { connectRemote, walletConnectReady } from '../core/walletconnect';

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
function helpFor(t: TopWallet, url: string, phone: boolean, qr: (() => void) | null): HTMLElement {
  const official = h('a', { class: 'btn btn-ghost btn-sm', href: t.site, target: '_blank', rel: 'noopener noreferrer' }, icon('download', 16), h('span', null, phone || !t.desktop ? 'Get the app' : 'Get it (official site)'));
  const copy = h('button', { type: 'button', class: 'btn btn-soft btn-sm' }, icon('copy', 16), h('span', null, 'Copy address'));
  copy.addEventListener('click', () => void copyAddress(url));
  const host = () => h('b', { class: 'wallet-host' }, location.host);
  const qrBtn = () => {
    const b = h('button', { type: 'button', class: 'btn btn-primary btn-sm' }, icon('phone', 16), h('span', null, phone ? `Connect ${t.name}` : 'Scan QR code'));
    b.addEventListener('click', () => qr?.());
    return b;
  };
  if (qr && !(phone && t.open)) {
    return h('div', { class: 'wallet-help' },
      h('p', null, phone
        ? `Tap below and choose ${t.name} in the list — it opens the app to approve.`
        : `Tap “Scan QR code”, then scan it with ${t.name} on your phone or tablet (its scan button). ${t.desktop ? 'Or add its browser extension from the official site and reload this page.' : ''}`),
      h('div', { class: 'btn-row' }, qrBtn(), official));
  }
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

  let busy = false;
  const idle = isTablet() ? 'Open' : phone ? 'Choose' : 'Show QR';
  const setBusy = (on: boolean) => { busy = on; m.el.dataset.busy = String(on); m.el.querySelectorAll<HTMLButtonElement>('.wallet-opt, .wallet-help button').forEach((x) => (x.disabled = on)); };
  /** Scan with a phone wallet (WalletConnect): connect on the other device, sign there, then disconnect. */
  const viaQr = walletConnectReady ? async (status?: HTMLElement) => {
    if (busy) return;
    msg.textContent = '';
    if (opts.password && !pw.value) { msg.textContent = 'Please enter your Fuzzies password first.'; pw.focus(); return; }
    setBusy(true);
    const say = (t: string) => { if (status) status.textContent = t; };
    say('Opening…');
    try {
      const remote = await connectRemote();
      say('Approve in your wallet app…');
      try { await opts.run(remote, pw.value); m.close(); }
      finally { void remote.done(); }
    } catch (e) { msg.textContent = (e as Error).message; }
    finally { say(idle); setBusy(false); }
  } : null;

  void findWallets().then((found) => {
    list.removeAttribute('aria-busy');
    const buttons = found.map((w) => {
      const status = h('small', { class: 'wallet-status' }, 'Connect');
      const b = h('button', { type: 'button', class: 'wallet-opt' }, walletBadge(w), h('b', null, w.name), status);
      b.addEventListener('click', async () => {
        if (busy) return;
        msg.textContent = '';
        if (opts.password && !pw.value) { msg.textContent = 'Please enter your Fuzzies password first.'; pw.focus(); return; }
        setBusy(true);
        b.classList.add('busy');
        status.textContent = 'Check your wallet…';
        try { await opts.run(w, pw.value); m.close(); }
        catch (e) { msg.textContent = (e as Error).message; status.textContent = 'Connect'; }
        finally { b.classList.remove('busy'); setBusy(false); }
      });
      return b;
    });
    // the QR / phone-wallet option
    let qrRow: HTMLElement | null = null;
    if (viaQr) {
      const tablet = isTablet();
      const status = h('small', { class: 'wallet-status' }, idle);
      const b = h('button', { type: 'button', class: 'wallet-opt wallet-qr' },
        h('span', { class: 'wallet-logo qr', 'aria-hidden': 'true' }, icon(phone && !tablet ? 'phone' : 'grid', 18)),
        h('span', { class: 'wallet-qr-text' }, h('b', null, tablet ? 'Scan QR code or use a wallet app' : phone ? 'Use a wallet app' : 'Scan QR code with your phone'),
          h('small', null, phone ? 'Robinhood, Crypto.com, Rainbow, Ledger and 500+ more' : 'Robinhood, Crypto.com, MetaMask, Trust and 500+ phone wallets')),
        status);
      b.addEventListener('click', () => void viaQr(status));
      qrRow = b;
    }
    list.replaceChildren(...(buttons.length
      ? [h('p', { class: 'wallet-head' }, phone ? 'In this app' : 'In this browser'), ...buttons, ...(qrRow ? [h('p', { class: 'wallet-head' }, 'Wallet on another device'), qrRow] : [])]
      : qrRow
        ? [h('p', { class: 'wallet-head' }, isTablet() ? 'Wallet app or another device' : phone ? 'Your wallet app' : 'Wallet on your phone or tablet'), qrRow]
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
        if (open && !row.querySelector('.wallet-help')) row.append(helpFor(t, url, phone, viaQr ? () => void viaQr(qrRow?.querySelector('.wallet-status') as HTMLElement | undefined) : null));
      });
      row.append(b);
      return row;
    }), h('p', { class: 'fine' }, viaQr ? 'Smart wallets (Coinbase Smart Wallet, Safe, Argent…) work too.' : 'Any other Ethereum wallet works too once it’s installed in this browser. Smart wallets (Coinbase Smart Wallet, Safe…) work too.'));
  });
}
