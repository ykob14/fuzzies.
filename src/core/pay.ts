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
import { api, cloudEnabled } from './api';
import { sync } from './sync';
import { walletError, type WalletChoice } from './wallet';
import { accounts } from './account';

export type Network = 'base' | 'ethereum' | 'solana' | 'bnb' | 'robinhood' | 'bitcoin';
export type Asset = 'ETH' | 'USDC' | 'USDT' | 'SOL' | 'BTC';
export const isEvmNet = (n: Network) => n === 'base' || n === 'ethereum' || n === 'bnb' || n === 'robinhood';
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
  amount: string; display: string; payTo: string; solanaPay?: string; bitcoinPay?: string; status: string; tx: string | null; txUrl?: string;
  expiresAt: string; confirmations: number;
}
export interface Gift { id: string; amount: number; reason: string }
export interface CheckResult { payment: Payment; state: 'paid' | 'pending' | 'confirming' | 'expired'; detail?: string; confirmations?: number; gift?: Gift | null }

let cfg: Promise<PayConfig> | null = null;
const OFF: PayConfig = { enabled: false, networks: [], packs: [], walletFeeCents: 0, walletGift: 0 };

export const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

// payments sent from this device that still need checking: { paymentId: txHash } (one list per account)
const PENDING_KEY_BASE = 'fz.pay.pending';
const PENDING_KEY_GET = () => `${PENDING_KEY_BASE}.${accounts.current?.id ?? 'none'}`;
function pending(): Record<string, string> { try { return JSON.parse(localStorage.getItem(PENDING_KEY_GET()) || '{}'); } catch { return {}; } }
function setPending(p: Record<string, string>): void { try { localStorage.setItem(PENDING_KEY_GET(), JSON.stringify(p)); } catch { /* private mode */ } }

export const pay = {
  /** What can be bought and how (cached; "off" when the site has no payment addresses or no backend). */
  config(): Promise<PayConfig> {
    if (!cloudEnabled) return Promise.resolve(OFF); // on-device version: no backend, no payments
    cfg ??= api<PayConfig>('pay', 'pay.config').catch(() => { cfg = null; return OFF; });
    return cfg;
  },
  quote(kind: 'pack' | 'wallet', item: string, network: Network, asset: Asset): Promise<Payment> {
    return api<{ payment: Payment }>('pay', 'pay.quote', { kind, item, network, asset }).then((r) => checked(r.payment));
  },
  async check(id: string, tx?: string): Promise<CheckResult> {
    const r = await api<CheckResult>('pay', 'pay.check', { id, tx });
    r.payment = checked(r.payment);
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

/**
 * Double-check what the server sent before showing it or handing it to a wallet (defence in depth): known networks and
 * coins only, real addresses, a whole positive amount, and the shown amount rebuilt here from the exact one.
 */
const TOKENS: Record<string, string> = {
  'base:USDC': '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913', 'ethereum:USDC': '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  'solana:USDC': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  'bnb:USDT': '0x55d398326f99059ff775485246999027b3197955', 'bnb:USDC': '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d',
};
const CHAIN_OF: Record<string, number> = { base: 8453, ethereum: 1, bnb: 56, robinhood: 4663 };
const DEV_TOKENS = import.meta.env.DEV; // a test coin (and test addresses) are allowed only while developing
/** Where Fuzzies' money goes — pinned here too, so even a broken or hijacked server can't send a payment elsewhere. */
const env = import.meta.env as Record<string, string | undefined>;
const OWNER = {
  evm: (env.VITE_PAY_EVM_ADDRESS || '0x341889850a71af6ef1918E6f6e42412A52B50278').trim().toLowerCase(),
  sol: (env.VITE_PAY_SOL_ADDRESS || 'HyogAUPxstjVZo61mKnnwpWzAfL9CZiMGWXwgUiYK2nA').trim(),
  btc: (env.VITE_PAY_BTC_ADDRESS || 'bc1q7kt6nfeapf9zefcxqphgac8adfsdql2x5d6tgr').trim().toLowerCase(),
};
/** The only network + coin pairs Fuzzies takes. */
const PAIRS = new Set(['base:ETH', 'base:USDC', 'ethereum:ETH', 'ethereum:USDC', 'solana:SOL', 'solana:USDC', 'bnb:USDT', 'bnb:USDC', 'robinhood:ETH', 'bitcoin:BTC']);
const EXPLORER: Record<Network, string> = { base: 'https://basescan.org/tx/', ethereum: 'https://etherscan.io/tx/', bnb: 'https://bscscan.com/tx/', robinhood: 'https://robinhoodchain.blockscout.com/tx/', bitcoin: 'https://mempool.space/tx/', solana: 'https://solscan.io/tx/' };
const B58 = '[1-9A-HJ-NP-Za-km-z]';
function checked(p: Payment): Payment {
  const bad = (why: string) => { throw new Error(`This payment request looks wrong (${why}) — please try again.`); };
  if (!PAIRS.has(`${p.network}:${p.asset}`)) bad('network');
  if (!/^\d{1,40}$/.test(p.amount) || BigInt(p.amount) <= 0n) bad('amount');
  const stable = p.asset === 'USDC' || p.asset === 'USDT';
  const dec = p.network === 'bnb' && stable ? 18 : { ETH: 18, USDC: 6, USDT: 6, SOL: 9, BTC: 8 }[p.asset];
  if (!dec || dec !== p.decimals) bad('coin');
  const s = p.amount.padStart(dec + 1, '0');
  const frac = s.slice(-dec).replace(/0+$/, '');
  const display = frac ? `${s.slice(0, -dec)}.${frac}` : s.slice(0, -dec);
  // the wallet links and QR codes are built here from the checked values — never taken from the server as they are
  let solanaPay: string | undefined, bitcoinPay: string | undefined;
  if (p.network === 'solana') {
    if (!new RegExp(`^${B58}{32,44}$`).test(p.payTo) || (!DEV_TOKENS && p.payTo !== OWNER.sol)) bad('address');
    if (stable ? p.token !== TOKENS[`solana:${p.asset}`] : p.token) bad('token');
    const ref = new RegExp(`[?&]reference=(${B58}{32,44})(?:&|$)`).exec(p.solanaPay ?? '')?.[1];
    if (!ref) bad('reference');
    solanaPay = `solana:${p.payTo}?amount=${display}${stable ? `&spl-token=${p.token}` : ''}&reference=${ref}&label=Fuzzies`;
  } else if (p.network === 'bitcoin') {
    if (!/^bc1[02-9ac-hj-np-z]{25,62}$/.test(p.payTo) || (!DEV_TOKENS && p.payTo !== OWNER.btc) || p.token) bad('address');
    bitcoinPay = `bitcoin:${p.payTo}?amount=${display}&label=Fuzzies`;
  } else {
    if (!/^0x[0-9a-fA-F]{40}$/.test(p.payTo) || (!DEV_TOKENS && p.payTo.toLowerCase() !== OWNER.evm) || p.chainId !== CHAIN_OF[p.network]) bad('address');
    if (stable && (!p.token || !/^0x[0-9a-fA-F]{40}$/.test(p.token) || (!DEV_TOKENS && p.token.toLowerCase() !== TOKENS[`${p.network}:${p.asset}`]))) bad('token');
    if (p.asset === 'ETH' && p.token) bad('token');
  }
  // the explorer link points only at the known explorer for that network
  const txOk = p.tx && (p.network === 'solana' ? new RegExp(`^${B58}{64,90}$`).test(p.tx) : p.network === 'bitcoin' ? /^[0-9a-f]{64}$/.test(p.tx) : /^0x[0-9a-fA-F]{64}$/.test(p.tx));
  return { ...p, display, solanaPay, bitcoinPay, txUrl: txOk ? EXPLORER[p.network] + p.tx : undefined };
}

// ---------- sending on Ethereum / Base ----------
const hex = (n: bigint | number) => '0x' + BigInt(n).toString(16);
/** Network details for wallets that don't know a network yet (official endpoints). */
const ADD_PARAMS: Record<number, object> = {
  8453: { chainId: '0x2105', chainName: 'Base', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, rpcUrls: ['https://mainnet.base.org'], blockExplorerUrls: ['https://basescan.org'] },
  56: { chainId: '0x38', chainName: 'BNB Smart Chain', nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 }, rpcUrls: ['https://bsc-dataseed.bnbchain.org'], blockExplorerUrls: ['https://bscscan.com'] },
  4663: { chainId: '0x1237', chainName: 'Robinhood Chain', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, rpcUrls: ['https://rpc.mainnet.chain.robinhood.com'], blockExplorerUrls: ['https://robinhoodchain.blockscout.com'] },
};
const NET_NAME: Record<number, string> = { 1: 'Ethereum', 8453: 'Base', 56: 'BNB Chain', 4663: 'Robinhood Chain' };

/** Make sure the wallet is on the payment's network (asks the wallet; it shows its own "switch network" window). */
async function onNetwork(w: WalletChoice, chainId: number): Promise<void> {
  const now = parseInt(String(await w.provider.request({ method: 'eth_chainId' })), 16);
  if (now === chainId) return;
  try {
    await w.provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: hex(chainId) }] });
  } catch (e) {
    if ((e as { code?: number }).code === 4902 && ADD_PARAMS[chainId]) {
      await w.provider.request({ method: 'wallet_addEthereumChain', params: [ADD_PARAMS[chainId]] });
    } else throw e;
  }
  const after = parseInt(String(await w.provider.request({ method: 'eth_chainId' })), 16);
  if (after !== chainId) throw new Error(`Please switch your wallet to ${NET_NAME[chainId] ?? 'the right network'} and try again.`);
}

/** Ask the wallet to send exactly this payment. Returns the transaction id. */
export async function sendEvmPayment(w: WalletChoice, p: Payment): Promise<string> {
  try {
    const accounts = (await w.provider.request({ method: 'eth_requestAccounts' })) as string[];
    const from = String(accounts?.[0] ?? '');
    if (!/^0x[0-9a-fA-F]{40}$/.test(from)) throw new Error('Your wallet didn’t share an address.');
    if (Date.now() > new Date(p.expiresAt).getTime() - 15_000) throw new Error('This price has expired — choose your coin again for a fresh one. Nothing was paid.');
    // before asking the wallet: enough for the payment and its network fee? (smart wallets: USDC only — their ETH payments
    // can't be matched). If it's short we say how much to add instead of letting the wallet fail. Never blocks if unsure.
    const pre = await api<{ ok: boolean; short?: string }>('pay', 'pay.precheck', { id: p.id, from }).catch((e) => {
      if ((e as { status?: number }).status === 400) throw Object.assign(new Error((e as Error).message), { friendly: true });
      return { ok: true } as { ok: boolean; short?: string };
    });
    if (!pre.ok && pre.short) throw Object.assign(new Error(pre.short), { friendly: true });
    await onNetwork(w, p.chainId!);
    const amount = BigInt(p.amount);
    const chainId = hex(p.chainId!);
    const tx = p.token
      ? { from, to: p.token, value: '0x0', chainId, data: '0xa9059cbb' + p.payTo.slice(2).toLowerCase().padStart(64, '0') + amount.toString(16).padStart(64, '0') }
      : { from, to: p.payTo, value: hex(amount), chainId };
    // last look right before sending: still on the right network?
    if (parseInt(String(await w.provider.request({ method: 'eth_chainId' })), 16) !== p.chainId) throw new Error(`Your wallet changed network — please switch it to ${p.networkName} and try again. Nothing was paid.`);
    const hash = await w.provider.request({ method: 'eth_sendTransaction', params: [tx] });
    if (typeof hash !== 'string' || !/^0x[0-9a-fA-F]{64}$/.test(hash)) throw new Error('Your wallet didn’t return a transaction id.');
    pay.remember(p.id, hash);
    return hash;
  } catch (e) {
    if ((e as { friendly?: boolean }).friendly) throw e; // our own clear message (e.g. "add a little more")
    const msg = String((e as Error)?.message ?? '');
    if (/insufficient|funds/i.test(msg)) throw Object.assign(new Error(`Not quite enough in this wallet for ${p.display} ${p.asset} plus the network fee on ${p.networkName}. Add a little more (tap “Add Cash” or “Buy” in your wallet), then try again — nothing was charged.`), { friendly: true });
    const err = walletError(e);
    throw err.message.startsWith('You cancelled') ? new Error('You cancelled in your wallet — nothing was paid.') : err;
  }
}
