/**
 * The payment window: pick a coin → see the exact amount and where it goes → pay in your wallet → we confirm it on the
 * blockchain. Used for Fuzzies packs and the one-time wallet activation.
 */
import { h, btn, icon, modal, toast, fuzzyMark } from './dom';
import { logoUrl } from './logos';
import { pickWallet } from './walletPicker';
import { pay, money, sendEvmPayment, isEvmNet, type Asset, type CheckResult, type Network, type Payment } from '../core/pay';
import { isPhone, shortAddress } from '../core/wallet';
import { connectRemote } from '../core/walletconnect';
import { qrMatrix } from '../editor/qr';
import { celebrateFuzzies } from './celebrate';

export interface PayOptions {
  kind: 'pack' | 'wallet';
  item: string;
  title: string;
  /** what it's for, e.g. "550 Fuzzies" or "Wallet activation" */
  what: string;
  cents: number;
  note?: string;
  onPaid?: (r: CheckResult) => void;
}

const COIN_NAME: Record<Asset, string> = { ETH: 'ETH', USDC: 'USDC', USDT: 'USDT', SOL: 'SOL', BTC: 'Bitcoin (BTC)' };
const coinLogo = (asset: Asset, network: Network) => h('span', { class: 'coin' },
  h('img', { src: logoUrl(asset.toLowerCase()), alt: '', width: '34', height: '34' }),
  (asset === 'SOL' && network === 'solana') || network === 'bitcoin' ? null : h('img', { class: 'coin-net', src: logoUrl(`net-${network}`), alt: '', width: '16', height: '16' }));

function qrCanvas(text: string, px = 220): HTMLCanvasElement {
  const m = qrMatrix(text);
  const quiet = 3, n = m.length + quiet * 2, scale = Math.max(2, Math.floor(px / n));
  const c = h('canvas', { class: 'pay-qr', width: String(n * scale), height: String(n * scale), role: 'img', 'aria-label': 'Payment QR code' });
  const g = c.getContext('2d')!;
  g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#18171c';
  m.forEach((row, y) => row.forEach((on, x) => { if (on) g.fillRect((x + quiet) * scale, (y + quiet) * scale, scale, scale); }));
  return c;
}

async function copy(text: string, what: string): Promise<void> {
  try { await navigator.clipboard.writeText(text); toast(`${what} copied`, 'good'); } catch { toast(text, 'info', 6000); }
}

export async function openPaySheet(o: PayOptions): Promise<void> {
  const cfg = await pay.config();
  if (!cfg.enabled) { toast('Paying with crypto isn’t switched on yet.', 'info'); return; }
  const body = h('div', { class: 'pay-sheet' });
  let timer = 0, poll = 0, closed = false;
  const stop = () => { clearInterval(timer); clearTimeout(poll); };
  const m = modal(o.title, body, { onClose: () => { closed = true; stop(); } });
  const busy = (on: boolean) => { m.el.dataset.busy = String(on); };

  const summary = () => h('div', { class: 'pay-sum' },
    o.kind === 'pack' ? fuzzyMark(40) : h('span', { class: 'pay-sum-ic' }, icon('wallet', 22)),
    h('div', null, h('b', null, o.what), o.note ? h('small', null, o.note) : null),
    h('span', { class: 'pay-price' }, money(o.cents)));
  const fine = () => h('p', { class: 'pay-fine' }, icon('lock', 12),
    ' Payments are final and go straight to Fuzzies’ wallet. Fuzzies are a game currency with no cash value. Always check the amount and address in your wallet before approving.');

  type Opt = { network: Network; asset: Asset; label: string; fee: string; tag?: string };
  const allOpts: Opt[] = [];
  for (const n of cfg.networks) for (const a of n.assets) {
    const label = n.id === 'solana' ? (a === 'SOL' ? 'SOL' : 'USDC on Solana') : n.id === 'bitcoin' ? COIN_NAME.BTC : `${COIN_NAME[a]} on ${n.name}`;
    allOpts.push({ network: n.id, asset: a, label, fee: `Network fee ${n.fee}${n.id === 'bitcoin' ? ' · takes ~10–30 min' : ''}`, tag: n.id === 'base' && a === 'USDC' ? 'Lowest fee' : undefined });
  }
  /** One coin to pay with: asks the server for an exact price, then shows the payment. */
  const optButton = (x: Opt, err: HTMLElement) => {
    const b = h('button', { type: 'button', class: 'pay-opt' }, coinLogo(x.asset, x.network),
      h('span', { class: 'pay-opt-t' }, h('b', null, x.label), h('small', null, x.fee)),
      x.tag ? h('span', { class: 'pay-tag' }, x.tag) : null, icon('chevR', 16));
    b.addEventListener('click', async () => {
      err.textContent = '';
      body.querySelectorAll('button').forEach((y) => (y.disabled = true));
      b.classList.add('busy');
      try { show(await pay.quote(o.kind, o.item, x.network, x.asset)); }
      catch (e) { err.textContent = (e as Error).message; body.querySelectorAll('button').forEach((y) => (y.disabled = false)); b.classList.remove('busy'); }
    });
    return b;
  };

  // ---- step 1: choose a coin (or card, via the wallet's own "Add Cash") ----
  function choose(): void {
    stop();
    const err = h('p', { class: 'form-err', role: 'alert' });
    const cardOpt = h('button', { type: 'button', class: 'pay-opt pay-card-opt' }, h('span', { class: 'pay-card-ic' }, icon('card', 20)),
      h('span', { class: 'pay-opt-t' }, h('b', null, 'Card, Apple Pay or bank'), h('small', null, 'No crypto yet? Add cash in your wallet app, then pay — about 2 minutes')), icon('chevR', 16));
    cardOpt.addEventListener('click', card);
    body.replaceChildren(summary(), h('div', { class: 'pay-opts' }, cardOpt), h('p', { class: 'wallet-head' }, 'Pay with crypto'),
      h('div', { class: 'pay-opts' }, ...allOpts.map((x) => optButton(x, err))), err, fine());
  }

  // ---- paying by card: the wallet app (Phantom, Coinbase Wallet, MetaMask…) sells the coin, then you pay with it ----
  function card(): void {
    stop();
    const err = h('p', { class: 'form-err', role: 'alert' });
    // ETH on Base first: one purchase covers the price and the (tiny) network fee
    const pick = ([['base', 'ETH'], ['base', 'USDC'], ['solana', 'USDC']] as [Network, Asset][])
      .map(([n, a]) => allOpts.find((x) => x.network === n && x.asset === a)).filter((x): x is Opt => !!x);
    if (pick[0]?.asset === 'ETH' && pick[0].network === 'base') pick[0] = { ...pick[0], tag: 'Easiest' };
    const step = (n: number, ...kids: (Node | string | null)[]) => h('li', { class: 'pay-step' }, h('span', { class: 'pay-step-n' }, String(n)), h('div', null, ...kids));
    const getApp = h('a', { class: 'link small', href: 'https://phantom.com/download', target: '_blank', rel: 'noopener noreferrer' }, 'Get Phantom (free, official site) ↗');
    const back = h('button', { type: 'button', class: 'link small' }, '← Other ways to pay');
    back.addEventListener('click', choose);
    body.replaceChildren(summary(),
      h('ol', { class: 'pay-steps' },
        step(1, h('b', null, 'Open your wallet app'), h('small', null, 'Phantom, Coinbase Wallet, MetaMask or Trust Wallet. No wallet yet? '), getApp),
        step(2, h('b', null, 'Tap “Add Cash” or “Buy”'), h('small', null, `Pay with Apple Pay, your card or bank. Buy about ${money(o.cents + 100)} of ETH on Base (or USDC) — that’s the price plus about $1, so every fee is covered (some apps also have a small minimum).`)),
        step(3, h('b', null, 'Come back and pay with it'), h('small', null, 'Choose the coin you bought:'))),
      h('div', { class: 'pay-opts' }, ...pick.map((x) => optButton(x, err))),
      h('p', { class: 'pay-fine' }, 'Paying with USDC? Also buy about $1 of ETH (Base) or SOL (Solana) — the network fee is paid in that coin. With ETH on Base, one purchase covers everything.'),
      err, back,
      h('p', { class: 'pay-fine' }, icon('lock', 12), ' Your card is handled by your wallet app and its payment partner — Fuzzies never sees your card or bank details.'));
  }

  // ---- step 2: the exact payment ----
  function show(p: Payment): void {
    const status = h('div', { class: 'pay-status', role: 'status' });
    const left = h('small', { class: 'pay-left' });
    let payBtn: HTMLButtonElement | null = null;
    const tick = () => {
      const s = Math.max(0, Math.round((new Date(p.expiresAt).getTime() - Date.now()) / 1000));
      left.textContent = s ? `Price held for ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : 'This price has expired — choose again for a new one.';
      if (s < 15 && payBtn) payBtn.disabled = true; // never start a payment the server would no longer accept
    };
    tick(); timer = window.setInterval(tick, 1000);
    // Ethereum/Base are paid from the wallet button (no copy & paste, so the amount and network can't go wrong)
    const sol = !isEvmNet(p.network); // Solana & Bitcoin: QR code / wallet link, matched by reference or exact amount
    const amount = h('div', { class: 'pay-amount' }, coinLogo(p.asset, p.network),
      h('div', null, h('small', null, sol ? 'Send exactly' : 'You pay'), h('b', null, `${p.display} ${p.asset}`), h('small', null, `${money(p.usdCents)} · on ${p.networkName}`)),
      sol ? btn(null, { icon: 'copy', kind: 'plain', size: 'sm', title: 'Copy amount', onClick: () => void copy(p.display, 'Amount') }) : null);
    const to = h('div', { class: 'pay-to' }, h('small', null, 'To Fuzzies'), h('code', { title: p.payTo }, shortAddress(p.payTo)),
      sol ? btn(null, { icon: 'copy', kind: 'plain', size: 'sm', title: 'Copy address', onClick: () => void copy(p.payTo, 'Address') }) : null);
    const back = h('button', { type: 'button', class: 'link small' }, '← Choose another coin');
    back.addEventListener('click', choose);
    // the network fee is always added on top by the wallet — say how much to keep, so the wallet never says "not enough"
    const feeNote = h('p', { class: 'pay-fee' }, icon('check', 14), h('span', null,
      p.network === 'bitcoin' ? 'Your wallet adds the Bitcoin network fee on top, so keep a little extra BTC. Send exactly the amount shown — don’t use “subtract fee from amount”.'
        : p.network === 'solana' && p.asset === 'SOL' ? `Have at least ${(Number(p.display) + 0.001).toFixed(6).replace(/0+$/, '')} SOL in your wallet — the tiny network fee is added on top and Solana keeps a small minimum in your wallet.`
          : p.network === 'solana' ? 'Keep about 0.003 SOL (well under $1) in your wallet as well — Solana’s network fee is paid in SOL.'
            : `The network fee (${p.network === 'ethereum' ? 'paid in ETH' : 'a fraction of a cent'}) is added on top. We check your wallet has enough before it opens — if it’s a little short, we’ll tell you exactly how much to add. Nothing is charged until you approve.`));

    if (sol) {
      const btcNet = p.network === 'bitcoin';
      const uri = (btcNet ? p.bitcoinPay : p.solanaPay)!;
      const link = h('a', { class: 'btn btn-primary btn-md btn-block', href: uri, rel: 'noopener' }, h('img', { src: logoUrl(`net-${p.network}`), alt: '', width: '18', height: '18' }), h('span', null, btcNet ? 'Open in my Bitcoin wallet' : 'Open in my Solana wallet'));
      body.replaceChildren(summary(), amount, to, feeNote,
        h('div', { class: 'pay-qr-box' }, qrCanvas(uri), h('small', null, isPhone() ? 'Or scan this from another device' : btcNet ? 'Scan with any Bitcoin wallet' : 'Scan with Phantom, Solflare, Backpack or any Solana Pay wallet')),
        ...(isPhone() ? [link] : []),
        ...(btcNet ? [h('p', { class: 'pay-fine' }, 'Bitcoin takes about 10–30 minutes to confirm; you can close this window — your Fuzzies arrive automatically (we check again when you open Fuzzies).')] : []),
        h('div', { class: 'pay-row' }, btn('Copy payment link', { kind: 'ghost', size: 'sm', icon: 'copy', onClick: () => void copy(uri, 'Payment link') }), back),
        status, left, fine());
      pay.remember(p.id, ''); // checked again the next time the app opens, even if this window is closed
      waitFor(p, undefined, status);
      return;
    }
    payBtn = btn('Pay with my wallet', { kind: 'primary', size: 'lg', class: 'btn-block', icon: 'wallet', onClick: () => pickWallet({
      title: `Pay ${money(p.usdCents)}`,
      intro: `Your wallet will show a payment of ${p.display} ${p.asset} on ${p.networkName} to ${shortAddress(p.payTo)}. Check it, then approve.`,
      remote: () => connectRemote('pay', p.chainId),
      safety: h('div', { class: 'wallet-safe' }, icon('lock', 16), h('div', null, h('b', null, 'Only this payment'), h('small', null, 'Fuzzies asks your wallet for this one payment — never for approvals, other tokens or your recovery phrase.'))),
      run: async (w) => {
        busy(true);
        try {
          const hash = await sendEvmPayment(w, p);
          payBtn?.remove();
          paidAlready.remove();
          waitFor(p, hash, status);
        } finally {
          busy(false);
          if ('done' in w) void (w as { done(): Promise<void> }).done(); // WalletConnect: disconnect straight away
        }
      },
    }) });
    // already paid but the window lost track (e.g. the phone reloaded)? paste the transaction id
    const paidAlready = h('div', { class: 'pay-paste' });
    const pasteLink = h('button', { type: 'button', class: 'link small' }, 'Already paid? Enter the transaction id');
    pasteLink.addEventListener('click', () => {
      const inp = h('input', { class: 'input', placeholder: '0x… (from your wallet’s activity)', spellcheck: 'false', autocapitalize: 'none' });
      const go = btn('Check', { kind: 'soft', size: 'sm', onClick: () => {
        const v = inp.value.trim();
        if (!/^0x[0-9a-fA-F]{64}$/.test(v)) { toast('That doesn’t look like a transaction id (0x + 64 characters).', 'bad'); return; }
        pay.remember(p.id, v); payBtn?.remove(); paidAlready.remove(); waitFor(p, v, status);
      } });
      paidAlready.replaceChildren(h('div', { class: 'pay-paste-row' }, inp, go));
      inp.focus();
    });
    paidAlready.append(pasteLink);
    body.replaceChildren(summary(), amount, to, feeNote, payBtn, h('div', { class: 'pay-row' }, back, paidAlready), status, left, fine());
    // USDC payments are found by their exact amount even without a transaction id
    if (p.asset === 'USDC') waitFor(p, undefined, status, true);
  }

  // ---- step 3: watch the blockchain until it's confirmed ----
  function waitFor(p: Payment, tx: string | undefined, status: HTMLElement, quiet = false): void {
    clearTimeout(poll);
    const say = (t: string, kind = '') => { status.className = `pay-status ${kind}`; status.replaceChildren(kind === 'wait' ? h('span', { class: 'spin' }) : '', h('span', null, t)); };
    if (!quiet) say(tx ? `Payment sent — confirming on ${p.networkName}…` : 'Waiting for your payment…', 'wait');
    const once = async () => {
      if (closed) return;
      try {
        const r = await pay.check(p.id, tx);
        if (closed) return;
        if (r.state === 'paid') { done(r); return; }
        if (r.state === 'expired') { say('This payment request expired. Nothing was charged — choose again for a fresh price.', 'bad'); stop(); return; }
        if (r.state === 'confirming') say(p.network === 'base' ? 'Payment received — Base is locking it in (usually 1–3 minutes)…' : `Confirming on ${p.networkName}… ${r.confirmations ?? 0}/${p.confirmations}`, 'wait');
        else if (r.detail) say(r.detail, 'bad');
      } catch (e) {
        const st = (e as { status?: number }).status;
        if (st === 409 || st === 400) { say((e as Error).message, 'bad'); return; }
        say('Still checking with the network…', 'wait'); // a hiccup: keep going
      }
      poll = window.setTimeout(once, quiet && !tx ? 8000 : p.network === 'bitcoin' ? 20000 : p.network === 'solana' ? 4500 : 5000);
    };
    poll = window.setTimeout(once, tx ? 1500 : quiet ? 8000 : 4500);
  }

  function done(r: CheckResult): void {
    stop();
    const p = r.payment;
    body.replaceChildren(h('div', { class: 'pay-done' },
      h('div', { class: 'pay-done-ic' }, icon('check', 34)),
      h('h3', null, p.kind === 'pack' ? `+${p.fuzzies} Fuzzies!` : 'Wallet activated!'),
      h('p', { class: 'muted' }, p.kind === 'pack' ? 'Thank you for supporting Fuzzies 💖 They’re in your account on every device.' : 'You can log in with this wallet now. A little gift is waiting for you…'),
      p.txUrl ? h('a', { class: 'link small', href: p.txUrl, target: '_blank', rel: 'noopener noreferrer' }, 'View the payment on the blockchain ↗') : null,
      btn(p.kind === 'pack' ? 'Done' : 'Open my gift 🎁', { kind: 'primary', size: 'lg', onClick: () => { m.close(); o.onPaid?.(r); } })));
    if (p.kind === 'pack') {
      o.onPaid?.(r);
      // the fun part: close the window and let the Fuzzies fly into the counter
      setTimeout(() => { m.close(); void celebrateFuzzies(p.fuzzies); }, 900);
    }
  }

  choose();
}
