/**
 * Buying with crypto (Fuzzies packs, the one-time wallet activation) — the app side. The server sets every price and
 * checks every payment on the blockchain itself (api/_lib/pay.ts); this file only asks for a quote, hands the payment
 * to the wallet, and asks the server to check.
 *
 * - Ethereum & Base: the wallet is asked to send exactly the quoted amount to the site's address (eth_sendTransaction);
 *   it shows the amount and address first, and nothing happens without the person approving it there.
 * - Solana: a Solana Pay link / QR code (Phantom, Solflare, Backpack… open it and show the payment to approve).
 * - A payment that was sent but not yet confirmed is remembered on this device and checked again later, so closing the
 *   app at the wrong moment never loses anything.
 */
import { api } from './api';
import { sync } from './sync';
import { walletError, type WalletChoice } from './wallet';

export type Network = 'base' | 'ethereum' | 'solana';
export type Asset = 'ETH' | 'USDC' | 'SOL';
export interface Pack { id: string; fuzzies: number; cents: number }
export interface PayConfig {
  enabled: boolean;
  networks: { id: Network; name: string; chainId?: number; assets: Asset[]; fee: string }[];
  packs: Pack[];
  walletFeeCents: number;
  walletGift: number;
}
export interface Payment {
  id: string; kind: 'pack' | 'wallet'; item: string; usdCents: number; fuzzies: number;
  network: Network; networkName: string; chainId?: number; asset: Asset; token: string | null; decimals: number;
  amount: string; display: string; payTo: string; solanaPay?: string; status: string; tx: string | null; txUrl?: string;
  expiresAt: string; confirmations: number;
}
export interface Gift { id: string; amount: number; reason: string }
export interface CheckResult { payment: Payment; state: 'paid' | 'pending' | 'confirming' | 'expired'; detail?: string; confirmations?: number; gift?: Gift | null }

let cfg: Promise<PayConfig> | null = null;
const OFF: PayConfig = { enabled: false, networks: [], packs: [], walletFeeCents: 0, walletGift: 0 };

export const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

// payments sent from this device that still need checking: { paymentId: txHash }
const PENDING_KEY = 'fz.pay.pending';
function pending(): Record<string, string> { try { return JSON.parse(localStorage.getItem(PENDING_KEY) || '{}'); } catch { return {}; } }
function setPending(p: Record<string, string>): void { try { localStorage.setItem(PENDING_KEY, JSON.stringify(p)); } catch { /* private mode */ } }

export const pay = {
  /** What can be bought and how (cached; "off" when the site has no payment addresses or no backend). */
  config(): Promise<PayConfig> {
    cfg ??= api<PayConfig>('pay', 'pay.config').catch(() => { cfg = null; return OFF; });
    return cfg;
  },
  quote(kind: 'pack' | 'wallet', item: string, network: Network, asset: Asset): Promise<Payment> {
    return api<{ payment: Payment }>('pay', 'pay.quote', { kind, item, network, asset }).then((r) => r.payment);
  },
  async check(id: string, tx?: string): Promise<CheckResult> {
    const r = await api<CheckResult>('pay', 'pay.check', { id, tx });
    if (r.state === 'paid') {
      const p = pending(); delete p[id]; setPending(p);
      void sync.pull(); // bring the new Fuzzies into this device
    }
    return r;
  },
  remember(id: string, tx: string): void { setPending({ ...pending(), [id]: tx }); },
  /** Check payments sent earlier from this device (e.g. the app was closed while confirming). */
  async resume(): Promise<number> {
    let done = 0;
    for (const [id, tx] of Object.entries(pending())) {
      try {
        const r = await pay.check(id, tx);
        if (r.state === 'paid') done++;
        if (r.state === 'expired') { const p = pending(); delete p[id]; setPending(p); }
      } catch (e) { if ((e as { status?: number }).status === 404 || (e as { status?: number }).status === 409) { const p = pending(); delete p[id]; setPending(p); } }
    }
    return done;
  },
  history(): Promise<Payment[]> { return api<{ payments: Payment[] }>('pay', 'pay.history').then((r) => r.payments); },
  gifts(): Promise<Gift[]> { return api<{ gifts: Gift[] }>('pay', 'gift.list').then((r) => r.gifts); },
  async openGift(id: string): Promise<number> {
    const r = await api<{ amount: number }>('pay', 'gift.open', { id });
    void sync.pull();
    return r.amount;
  },
};

// ---------- sending on Ethereum / Base ----------
const hex = (n: bigint | number) => '0x' + BigInt(n).toString(16);
const BASE_PARAMS = { chainId: '0x2105', chainName: 'Base', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, rpcUrls: ['https://mainnet.base.org'], blockExplorerUrls: ['https://basescan.org'] };

/** Make sure the wallet is on the payment's network (asks the wallet; it shows its own "switch network" window). */
async function onNetwork(w: WalletChoice, chainId: number): Promise<void> {
  const now = parseInt(String(await w.provider.request({ method: 'eth_chainId' })), 16);
  if (now === chainId) return;
  try {
    await w.provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: hex(chainId) }] });
  } catch (e) {
    if ((e as { code?: number }).code === 4902 && chainId === 8453) {
      await w.provider.request({ method: 'wallet_addEthereumChain', params: [BASE_PARAMS] });
    } else throw e;
  }
  const after = parseInt(String(await w.provider.request({ method: 'eth_chainId' })), 16);
  if (after !== chainId) throw new Error(`Please switch your wallet to ${chainId === 8453 ? 'Base' : 'Ethereum'} and try again.`);
}

/** Ask the wallet to send exactly this payment. Returns the transaction id. */
export async function sendEvmPayment(w: WalletChoice, p: Payment): Promise<string> {
  try {
    const accounts = (await w.provider.request({ method: 'eth_requestAccounts' })) as string[];
    const from = String(accounts?.[0] ?? '');
    if (!/^0x[0-9a-fA-F]{40}$/.test(from)) throw new Error('Your wallet didn’t share an address.');
    await onNetwork(w, p.chainId!);
    const amount = BigInt(p.amount);
    const tx = p.token
      ? { from, to: p.token, value: '0x0', data: '0xa9059cbb' + p.payTo.slice(2).toLowerCase().padStart(64, '0') + amount.toString(16).padStart(64, '0') }
      : { from, to: p.payTo, value: hex(amount) };
    const hash = await w.provider.request({ method: 'eth_sendTransaction', params: [tx] });
    if (typeof hash !== 'string' || !/^0x[0-9a-fA-F]{64}$/.test(hash)) throw new Error('Your wallet didn’t return a transaction id.');
    pay.remember(p.id, hash);
    return hash;
  } catch (e) {
    const msg = String((e as Error)?.message ?? '');
    if (/insufficient|funds/i.test(msg)) throw new Error(`Not enough ${p.asset} on ${p.networkName} in this wallet (the network fee needs a little ETH too).`);
    const err = walletError(e);
    throw err.message.startsWith('You cancelled') ? new Error('You cancelled in your wallet — nothing was paid.') : err;
  }
}
