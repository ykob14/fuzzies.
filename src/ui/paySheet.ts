/**
 * The payment window: pick a coin → see the exact amount and where it goes → pay in your wallet → we confirm it on the
 * blockchain. Used for Fuzzies packs and the one-time wallet activation.
 */
import { h, btn, icon, modal, toast, fuzzyMark } from './dom';
import { logoUrl } from './logos';
import { pickWallet } from './walletPicker';
import { pay, money, sendEvmPayment, type Asset, type CheckResult, type Network, type Payment } from '../core/pay';
import { isPhone, shortAddress } from '../core/wallet';
import { connectRemote } from '../core/walletconnect';
import { qrMatrix } from '../editor/qr';

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

const COIN_NAME: Record<Asset, string> = { ETH: 'ETH', USDC: 'USDC', SOL: 'SOL' };
const coinLogo = (asset: Asset, network: Network) => h('span', { class: 'coin' },
  h('img', { src: logoUrl(asset.toLowerCase()), alt: '', width: '34', height: '34' }),
  asset === 'SOL' && network === 'solana' ? null : h('img', { class: 'coin-net', src: logoUrl(`net-${network}`), alt: '', width: '16', height: '16' }));

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

  // ---- step 1: choose a coin ----
  function choose(): void {
    stop();
    const opts: { network: Network; asset: Asset; label: string; fee: string; tag?: string }[] = [];
    for (const n of cfg.networks) for (const a of n.assets) {
      const label = n.id === 'solana' ? (a === 'SOL' ? 'SOL' : 'USDC on Solana') : `${COIN_NAME[a]} on ${n.name}`;
      opts.push({ network: n.id, asset: a, label, fee: `Network fee ${n.fee}`, tag: n.id === 'base' && a === 'USDC' ? 'Lowest fee' : undefined });
    }
    const err = h('p', { class: 'form-err', role: 'alert' });
    body.replaceChildren(summary(), h('p', { class: 'wallet-head' }, 'Pay with'),
      h('div', { class: 'pay-opts' }, ...opts.map((x) => {
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
      })), err, fine());
  }

  // ---- step 2: the exact payment ----
  function show(p: Payment): void {
    const status = h('div', { class: 'pay-status', role: 'status' });
    const left = h('small', { class: 'pay-left' });
    const tick = () => {
      const s = Math.max(0, Math.round((new Date(p.expiresAt).getTime() - Date.now()) / 1000));
      left.textContent = s ? `Price held for ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : 'This price has expired — choose again for a new one.';
    };
    tick(); timer = window.setInterval(tick, 1000);
    const amount = h('div', { class: 'pay-amount' }, coinLogo(p.asset, p.network),
      h('div', null, h('small', null, 'Send exactly'), h('b', null, `${p.display} ${p.asset}`), h('small', null, `${money(p.usdCents)} · on ${p.networkName}`)),
      btn(null, { icon: 'copy', kind: 'plain', size: 'sm', title: 'Copy amount', onClick: () => void copy(p.display, 'Amount') }));
    const to = h('div', { class: 'pay-to' }, h('small', null, 'To Fuzzies'), h('code', { title: p.payTo }, shortAddress(p.payTo)),
      btn(null, { icon: 'copy', kind: 'plain', size: 'sm', title: 'Copy address', onClick: () => void copy(p.payTo, 'Address') }));
    const back = h('button', { type: 'button', class: 'link small' }, '← Choose another coin');
    back.addEventListener('click', choose);

    if (p.network === 'solana') {
      const link = h('a', { class: 'btn btn-primary btn-md btn-block', href: p.solanaPay!, rel: 'noopener' }, h('img', { src: logoUrl('net-solana'), alt: '', width: '18', height: '18' }), h('span', null, 'Open in my Solana wallet'));
      body.replaceChildren(summary(), amount, to,
        h('div', { class: 'pay-qr-box' }, qrCanvas(p.solanaPay!), h('small', null, isPhone() ? 'Or scan this from another device' : 'Scan with Phantom, Solflare, Backpack or any Solana Pay wallet')),
        ...(isPhone() ? [link] : []),
        h('div', { class: 'pay-row' }, btn('Copy payment link', { kind: 'ghost', size: 'sm', icon: 'copy', onClick: () => void copy(p.solanaPay!, 'Payment link') }), back),
        status, left, fine());
      waitFor(p, undefined, status);
      return;
    }
    const payBtn = btn('Pay with my wallet', { kind: 'primary', size: 'lg', class: 'btn-block', icon: 'wallet', onClick: () => pickWallet({
      title: `Pay ${money(p.usdCents)}`,
      intro: `Your wallet will show a payment of ${p.display} ${p.asset} on ${p.networkName} to ${shortAddress(p.payTo)}. Check it, then approve.`,
      remote: () => connectRemote('pay', p.chainId),
      safety: h('div', { class: 'wallet-safe' }, icon('lock', 16), h('div', null, h('b', null, 'Only this payment'), h('small', null, 'Fuzzies asks your wallet for this one payment — never for approvals, other tokens or your recovery phrase.'))),
      run: async (w) => {
        busy(true);
        try {
          const hash = await sendEvmPayment(w, p);
          payBtn.remove();
          waitFor(p, hash, status);
        } finally {
          busy(false);
          if ('done' in w) void (w as { done(): Promise<void> }).done(); // WalletConnect: disconnect straight away
        }
      },
    }) });
    body.replaceChildren(summary(), amount, to, payBtn, h('div', { class: 'pay-row' }, back), status, left, fine());
  }

  // ---- step 3: watch the blockchain until it's confirmed ----
  function waitFor(p: Payment, tx: string | undefined, status: HTMLElement): void {
    const say = (t: string, kind = '') => { status.className = `pay-status ${kind}`; status.replaceChildren(kind === 'wait' ? h('span', { class: 'spin' }) : '', h('span', null, t)); };
    say(tx ? `Payment sent — confirming on ${p.networkName}…` : 'Waiting for your payment…', 'wait');
    const once = async () => {
      if (closed) return;
      try {
        const r = await pay.check(p.id, tx);
        if (closed) return;
        if (r.state === 'paid') { done(r); return; }
        if (r.state === 'expired') { say('This payment request expired. Nothing was charged — choose again for a fresh price.', 'bad'); stop(); return; }
        if (r.state === 'confirming') say(`Confirming on ${p.networkName}… ${r.confirmations ?? 0}/${p.confirmations}`, 'wait');
        else if (r.detail) say(r.detail, 'bad');
      } catch (e) {
        const st = (e as { status?: number }).status;
        if (st === 409 || st === 400) { say((e as Error).message, 'bad'); return; }
        say('Still checking with the network…', 'wait'); // a hiccup: keep going
      }
      poll = window.setTimeout(once, p.network === 'solana' ? 3000 : 4000);
    };
    poll = window.setTimeout(once, tx ? 1500 : 3000);
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
    if (p.kind === 'pack') o.onPaid?.(r);
  }

  choose();
}
