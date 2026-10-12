/**
 * Crypto payments: Fuzzies packs and the one-time wallet activation, paid in ETH or USDC (Ethereum, Base) or SOL or USDC
 * (Solana). Money goes straight from the buyer's wallet to the site owner's wallet — Fuzzies never holds funds or keys.
 *
 * How a payment is made safe:
 * - The SERVER sets the price: US dollars → an exact amount of the coin (two independent price sources must agree for
 *   ETH and SOL; USDC is 1:1), plus a tiny unique "fingerprint" in the last digits, so each open payment has its own
 *   exact amount. It's valid for 30 minutes.
 * - Nothing is believed from the browser. The server reads the blockchain itself (two independent providers for
 *   Ethereum/Base, two for Solana) and only accepts a transfer that succeeded, went to the owner's address, is for
 *   exactly the quoted amount and coin, happened after the quote, and has enough confirmations (Solana: finalized).
 * - Each transaction can pay for one payment only (database unique key), and each payment is paid once.
 * - Solana uses Solana Pay: the payment carries a random one-time "reference" key, which is how it's found.
 * Fuzzies bought this way are added on the server (fz_credits → the profile), so they sync to every device.
 */
import { createHash, randomBytes, randomInt } from 'node:crypto';
import { createPublicClient, http, type Chain, type Hash } from 'viem';
import { mainnet, base } from 'viem/chains';
import { base58, bech32 } from '@scure/base';
import { q } from './db.js';
import { applyCredits } from './credits.js';
export { applyCredits };
import { HttpError } from './auth.js';
import { checksumAddress, normAddress } from './wallet.js';

// ---------- what can be bought ----------
export const PACKS = [
  { id: 'p100', fuzzies: 100, cents: 99 },
  { id: 'p550', fuzzies: 550, cents: 499 },
  { id: 'p1200', fuzzies: 1200, cents: 999 },
  { id: 'p3000', fuzzies: 3000, cents: 1999 },
];
export const WALLET_GIFT = 100; // Fuzzies in the gift box for a newly activated wallet
const QUOTE_MINUTES = 30;

/** The one-time wallet activation fee in cents (WALLET_FEE_USD, default $0.50; 0 turns it off). */
export function walletFeeCents(): number {
  const v = Number(process.env.WALLET_FEE_USD ?? '0.5');
  return Number.isFinite(v) && v >= 0 && v <= 20 ? Math.round(v * 100) : 50;
}

// ---------- networks & coins ----------
// test-only overrides need PAY_TEST=1 and are always ignored on the live site (Vercel production or NODE_ENV=production)
const dev = process.env.PAY_TEST === '1' && process.env.NODE_ENV !== 'production' && process.env.VERCEL_ENV !== 'production';
type Net = 'base' | 'ethereum' | 'solana' | 'bnb' | 'robinhood' | 'bitcoin';
type Asset = 'ETH' | 'USDC' | 'USDT' | 'SOL' | 'BTC';
export const NETS: Net[] = ['base', 'solana', 'bnb', 'robinhood', 'ethereum', 'bitcoin'];
export const isEvm = (n: string) => n === 'base' || n === 'ethereum' || n === 'bnb' || n === 'robinhood';
/** Stablecoin contracts (official addresses). On BNB Chain they have 18 decimals. */
const STABLES: Partial<Record<Net, Partial<Record<Asset, { address: string; decimals: number }>>>> = {
  ethereum: { USDC: { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6 } },
  base: { USDC: { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6 } },
  solana: { USDC: { address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', decimals: 6 } },
  bnb: { USDT: { address: '0x55d398326f99059fF775485246999027B3197955', decimals: 18 }, USDC: { address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', decimals: 18 } },
};
const bsc = { id: 56, name: 'BNB Smart Chain', nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 }, rpcUrls: { default: { http: ['https://bsc-dataseed.bnbchain.org'] } } } as Chain;
const robinhood = { id: 4663, name: 'Robinhood Chain', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, rpcUrls: { default: { http: ['https://rpc.mainnet.chain.robinhood.com'] } } } as Chain;
/** How sure we wait to be: a block tag ('safe' = posted to Ethereum, 'finalized'), or a number of blocks. */
type Finality = 'safe' | 'finalized' | number;
interface NetInfo { id: Net; name: string; chainId?: number; chain?: Chain; assets: Asset[]; finality: Finality; blockSecs: number; rpcs: string[]; explorer: string; fee: string; graceMin: number }

function rpcList(envName: string, defaults: string[]): string[] {
  const set = (process.env[envName] ?? '').split(',').map((u) => u.trim()).filter((u) => /^https?:\/\/\S+$/.test(u));
  return (set.length ? set : defaults).slice(0, 2);
}
function netInfo(id: Net): NetInfo {
  switch (id) {
    case 'base': return { id, name: 'Base', chainId: 8453, chain: base, assets: ['USDC', 'ETH'], finality: 'safe', blockSecs: 2, rpcs: rpcList('WALLET_RPC_8453', [base.rpcUrls.default.http[0], 'https://base-rpc.publicnode.com']), explorer: 'https://basescan.org/tx/', fee: 'under 1¢', graceMin: 60 };
    case 'ethereum': return { id, name: 'Ethereum', chainId: 1, chain: mainnet, assets: ['USDC', 'ETH'], finality: 5, blockSecs: 12, rpcs: rpcList('WALLET_RPC_1', [mainnet.rpcUrls.default.http[0], 'https://ethereum-rpc.publicnode.com']), explorer: 'https://etherscan.io/tx/', fee: 'about $0.20–$3', graceMin: 60 };
    case 'bnb': return { id, name: 'BNB Chain', chainId: 56, chain: bsc, assets: ['USDT', 'USDC'], finality: 'finalized', blockSecs: 1, rpcs: rpcList('WALLET_RPC_56', ['https://bsc-dataseed.bnbchain.org', 'https://bsc-rpc.publicnode.com']), explorer: 'https://bscscan.com/tx/', fee: 'about 1¢', graceMin: 60 };
    // Robinhood Chain (Arbitrum Orbit L2, gas in ETH): one public provider today — add a second with WALLET_RPC_4663
    case 'robinhood': return { id, name: 'Robinhood Chain', chainId: 4663, chain: robinhood, assets: ['ETH'], finality: 'safe', blockSecs: 1, rpcs: rpcList('WALLET_RPC_4663', ['https://rpc.mainnet.chain.robinhood.com']), explorer: 'https://robinhoodchain.blockscout.com/tx/', fee: 'under 1¢', graceMin: 60 };
    case 'bitcoin': return { id, name: 'Bitcoin', assets: ['BTC'], finality: 1, blockSecs: 600, rpcs: rpcList('BITCOIN_API', ['https://mempool.space/api', 'https://blockstream.info/api']), explorer: 'https://mempool.space/tx/', fee: 'varies (often $0.30–$3)', graceMin: 360 };
    default: return { id: 'solana', name: 'Solana', assets: ['SOL', 'USDC'], finality: 'finalized', blockSecs: 0.4, rpcs: rpcList('SOLANA_RPC', ['https://api.mainnet-beta.solana.com', 'https://solana-rpc.publicnode.com']), explorer: 'https://solscan.io/tx/', fee: 'under 1¢', graceMin: 60 };
  }
}
export function decimalsOf(net: Net, asset: Asset): number {
  return STABLES[net]?.[asset]?.decimals ?? { ETH: 18, SOL: 9, BTC: 8, USDC: 6, USDT: 6 }[asset];
}
function tokenOf(net: Net, asset: Asset): string | null {
  if (asset !== 'USDC' && asset !== 'USDT') return null;
  if (dev) { const t = process.env[`PAY_TEST_${asset}_${net.toUpperCase()}`]; if (t) return t; }
  return STABLES[net]?.[asset]?.address ?? null;
}

/**
 * Where the money goes: the site owner's own addresses. Defaults are the owner's wallets (checked: EIP-55 checksum,
 * a real ed25519 key, a valid bech32 checksum); Vercel settings PAY_EVM_ADDRESS / PAY_SOL_ADDRESS / PAY_BTC_ADDRESS
 * override them, and PAY_<NETWORK>_ADDRESS (e.g. PAY_BNB_ADDRESS) one EVM network. An invalid address turns its network off.
 */
const OWNER = { evm: '0x341889850a71af6ef1918E6f6e42412A52B50278', sol: 'HyogAUPxstjVZo61mKnnwpWzAfL9CZiMGWXwgUiYK2nA', btc: 'bc1q7kt6nfeapf9zefcxqphgac8adfsdql2x5d6tgr' };
function payTo(net: Net): string | null {
  if (net === 'solana') {
    const a = (process.env.PAY_SOL_ADDRESS ?? OWNER.sol).trim();
    try { return a && base58.decode(a).length === 32 ? a : null; } catch { return null; }
  }
  if (net === 'bitcoin') {
    const a = (process.env.PAY_BTC_ADDRESS ?? OWNER.btc).trim().toLowerCase();
    try { const d = bech32.decode(a as `${string}1${string}`); return d.prefix === 'bc' && d.words[0] === 0 && [20, 32].includes(bech32.fromWords(d.words.slice(1)).length) ? a : null; } catch { return null; }
  }
  const a = (process.env[`PAY_${net.toUpperCase()}_ADDRESS`] ?? process.env.PAY_EVM_ADDRESS ?? OWNER.evm).trim();
  if (!/^0x[0-9a-fA-F]{40}$/.test(a)) return null;
  // mixed case must match its checksum (catches typos)
  if (a !== a.toLowerCase() && a !== a.toUpperCase().replace('0X', '0x') && checksumAddress(a) !== a) return null;
  return checksumAddress(a);
}

/** What the app may offer: networks with an owner address. */
export function payConfig() {
  const nets = NETS.filter((n) => payTo(n)).map((n) => {
    const i = netInfo(n);
    return { id: n, name: i.name, chainId: i.chainId, assets: i.assets, fee: i.fee };
  });
  return { enabled: nets.length > 0, networks: nets, packs: PACKS, walletFeeCents: nets.length ? walletFeeCents() : 0, walletGift: WALLET_GIFT };
}
export const paymentsEnabled = () => payConfig().enabled;

// ---------- prices ----------
const priceCache = new Map<string, { at: number; usd: number }>();
async function fetchJson(url: string): Promise<unknown> {
  const r = await fetch(url, { signal: AbortSignal.timeout(6000), headers: { accept: 'application/json' } });
  if (!r.ok) throw new Error(`price ${r.status}`);
  return r.json();
}
/** USD price of ETH, SOL or BTC: Coinbase and Kraken; when both answer they must be within 3%. */
export async function usdPrice(asset: 'ETH' | 'SOL' | 'BTC'): Promise<number> {
  if (dev && process.env[`PRICE_TEST_${asset}`]) return Number(process.env[`PRICE_TEST_${asset}`]);
  const hit = priceCache.get(asset);
  if (hit && Date.now() - hit.at < 60_000) return hit.usd;
  const sources = await Promise.allSettled([
    fetchJson(`https://api.coinbase.com/v2/prices/${asset}-USD/spot`).then((j) => Number((j as { data?: { amount?: string } }).data?.amount)),
    fetchJson(`https://api.kraken.com/0/public/Ticker?pair=${{ ETH: 'ETHUSD', SOL: 'SOLUSD', BTC: 'XBTUSD' }[asset]}`).then((j) => {
      const r = (j as { result?: Record<string, { c?: string[] }> }).result ?? {};
      return Number(Object.values(r)[0]?.c?.[0]);
    }),
  ]);
  const prices = sources.flatMap((s) => (s.status === 'fulfilled' && Number.isFinite(s.value) && s.value > 0 ? [s.value] : []));
  if (!prices.length) throw new HttpError(503, 'We couldn’t get the current price — please try again in a minute.');
  if (prices.length === 2 && Math.abs(prices[0] - prices[1]) / Math.min(...prices) > 0.03) throw new HttpError(503, 'Prices are moving fast right now — please try again in a minute.');
  const usd = prices.reduce((a, b) => a + b, 0) / prices.length;
  priceCache.set(asset, { at: Date.now(), usd });
  return usd;
}

/** Exact amount in base units: the dollar price converted, rounded up, plus a unique fingerprint worth less than a cent. */
async function amountFor(cents: number, net: Net, asset: Asset): Promise<bigint> {
  const d = BigInt(decimalsOf(net, asset));
  if (asset === 'USDC' || asset === 'USDT') return BigInt(cents) * 10n ** (d - 2n) + BigInt(randomInt(1, 4_999)) * 10n ** (d - 6n); // fingerprint < half a cent
  const price = await usdPrice(asset as 'ETH' | 'SOL' | 'BTC');
  if (asset === 'BTC') return BigInt(Math.ceil((cents / 100 / price) * 1e8)) + BigInt(randomInt(1, 99)); // sats; fingerprint ≤ 99 sats (about 10¢)
  const step = asset === 'ETH' ? 10n ** 12n : 1_000n; // round up to 0.000001 ETH / 0.000001 SOL
  const raw = BigInt(Math.ceil((cents / 100 / price) * 1e9)) * 10n ** (d - 9n);
  const rounded = ((raw + step - 1n) / step) * step;
  const fingerprint = asset === 'ETH' ? BigInt(randomInt(1, 999_999)) * 1_000n : BigInt(randomInt(1, 999)); // < 1 gwei / < 0.000001 SOL
  return rounded + fingerprint;
}
export function formatUnits(v: bigint, decimals: number): string {
  const s = v.toString().padStart(decimals + 1, '0');
  const whole = s.slice(0, -decimals), frac = s.slice(-decimals).replace(/0+$/, '');
  return frac ? `${whole}.${frac}` : whole;
}

// ---------- quotes ----------
export interface PaymentRow {
  id: string; user_id: string; kind: string; item: string; usd_cents: number; fuzzies: number; network: Net; asset: Asset;
  amount: string; pay_to: string; reference: string | null; status: string; tx: string | null; payer: string | null;
  created_at: Date; expires_at: Date; paid_at: Date | null;
}

/** What the app shows for a payment (and how wallets are asked to pay it). */
export function publicPayment(p: PaymentRow) {
  const info = netInfo(p.network);
  const token = tokenOf(p.network, p.asset);
  const display = formatUnits(BigInt(p.amount), decimalsOf(p.network, p.asset));
  let solanaPay: string | undefined;
  if (p.network === 'solana') {
    solanaPay = `solana:${p.pay_to}?amount=${display}${token ? `&spl-token=${token}` : ''}&reference=${p.reference}&label=Fuzzies`;
  }
  const bitcoinPay = p.network === 'bitcoin' ? `bitcoin:${p.pay_to}?amount=${display}&label=Fuzzies` : undefined;
  return {
    id: p.id, kind: p.kind, item: p.item, usdCents: p.usd_cents, fuzzies: p.fuzzies,
    network: p.network, networkName: info.name, chainId: info.chainId, asset: p.asset, token, decimals: decimalsOf(p.network, p.asset),
    amount: p.amount, display, payTo: p.pay_to, solanaPay, bitcoinPay, status: p.status, tx: p.tx,
    txUrl: p.tx ? info.explorer + p.tx : undefined, expiresAt: new Date(p.expires_at).toISOString(), confirmations: typeof info.finality === 'number' ? info.finality : 0,
  };
}

export async function createQuote(userId: string, kind: 'pack' | 'wallet', item: string, net: Net, asset: Asset, ip = ''): Promise<PaymentRow> {
  const to = payTo(net);
  if (!to) throw new HttpError(400, 'That way of paying isn’t available.');
  if (!netInfo(net).assets.includes(asset)) throw new HttpError(400, 'That coin isn’t available on this network.');
  let cents: number, fuzzies = 0;
  if (kind === 'pack') {
    const pack = PACKS.find((p) => p.id === item);
    if (!pack) throw new HttpError(400, 'Unknown pack.');
    cents = pack.cents; fuzzies = pack.fuzzies;
  } else {
    cents = walletFeeCents();
    if (!cents) throw new HttpError(400, 'Wallets don’t need activating.');
    const { rows } = await q('select active from fz_wallets where address = $1 and user_id = $2', [normAddress(item), userId]);
    if (!rows[0]) throw new HttpError(404, 'Link this wallet first.');
    if (rows[0].active) throw new HttpError(400, 'This wallet is already active.');
    item = normAddress(item);
  }
  // no floods: a few open payments and a limited number per hour
  // an amount stays reserved until its payment's grace time is over (Bitcoin: 6 hours, others: 1 hour)
  await q("update fz_payments set status = 'expired' where status = 'pending' and expires_at < now() - case when network = 'bitcoin' then interval '6 hours' else interval '1 hour' end");
  const { rows: n } = await q("select count(*) filter (where created_at > now() - interval '1 hour')::int as hour, count(*) filter (where status = 'pending' and expires_at > now())::int as open from fz_payments where user_id = $1", [userId]);
  if (n[0].hour >= 30 || n[0].open >= 6) throw new HttpError(429, 'Too many payment requests — please finish or wait for the open ones first.');
  if (ip) {
    const { rows: byIp } = await q("select count(*)::int as n from fz_payments where ip = $1 and created_at > now() - interval '1 hour'", [ip]);
    if (byIp[0].n >= 60) throw new HttpError(429, 'Too many payment requests from this network — please try again later.');
  }
  for (let attempt = 0; attempt < 12; attempt++) {
    const amount = await amountFor(cents, net, asset);
    const id = 'pay_' + randomBytes(12).toString('hex');
    const reference = net === 'solana' ? base58.encode(randomBytes(32)) : null;
    try {
      const { rows } = await q<PaymentRow>(
        `insert into fz_payments (id, user_id, kind, item, usd_cents, fuzzies, network, asset, amount, pay_to, reference, ip, expires_at)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, now() + interval '${QUOTE_MINUTES} minutes') returning *`,
        [id, userId, kind, item, cents, fuzzies, net, asset, amount.toString(), to, reference, ip]);
      return rows[0];
    } catch (e) {
      if ((e as { code?: string }).code === '23505') continue; // that exact amount is taken by another open payment: new fingerprint
      throw e;
    }
  }
  throw new HttpError(503, 'Please try again in a moment.');
}

// ---------- checking the blockchain ----------
const TRANSFER = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'; // ERC-20 Transfer(address,address,uint256)
const pad32 = (addr: string) => '0x' + addr.toLowerCase().replace(/^0x/, '').padStart(64, '0');
type Verdict = { ok: true; payer: string } | { ok: false; why: 'pending' | 'confirming' | 'wrong'; detail?: string; confirmations?: number };

async function checkEvm(p: PaymentRow, hash: string, rpc: string): Promise<Verdict> {
  const info = netInfo(p.network);
  const c = createPublicClient({ chain: info.chain, transport: http(rpc, { timeout: 8000, retryCount: 1 }) });
  if ((await c.getChainId()) !== info.chainId) throw new Error(`provider ${new URL(rpc).host} is on another network`);
  const receipt = await c.getTransactionReceipt({ hash: hash as Hash }).catch(() => null);
  if (!receipt) return { ok: false, why: 'pending' };
  if (receipt.status !== 'success') return { ok: false, why: 'wrong', detail: 'The transaction failed on the network.' };
  // Base / Robinhood Chain: wait until the block is "safe" (posted to Ethereum); BNB Chain: finalized; Ethereum: 5 blocks deep
  let confirmed: boolean, confs = 0;
  if (typeof info.finality === 'string') {
    const fin = await c.getBlock({ blockTag: info.finality });
    confirmed = fin.number !== null && receipt.blockNumber <= fin.number;
  } else {
    confs = Number((await c.getBlockNumber()) - receipt.blockNumber + 1n);
    confirmed = confs >= info.finality;
  }
  const block = await c.getBlock({ blockNumber: receipt.blockNumber });
  const when = Number(block.timestamp) * 1000;
  if (when < new Date(p.created_at).getTime() - 120_000 || when > new Date(p.expires_at).getTime() + info.graceMin * 60_000) return { ok: false, why: 'wrong', detail: 'That transaction was sent outside this payment’s time window.' };
  const amount = BigInt(p.amount);
  if (p.asset === 'ETH') {
    const tx = await c.getTransaction({ hash: hash as Hash });
    if (tx.to?.toLowerCase() !== p.pay_to.toLowerCase() || tx.value !== amount) return { ok: false, why: 'wrong', detail: 'That transaction isn’t this payment (address or amount differ).' };
    if (!confirmed) return { ok: false, why: 'confirming', confirmations: confs };
    return { ok: true, payer: tx.from.toLowerCase() };
  }
  const token = tokenOf(p.network, p.asset)!.toLowerCase();
  const log = receipt.logs.find((l) => l.address.toLowerCase() === token && l.topics[0] === TRANSFER && l.topics[2]?.toLowerCase() === pad32(p.pay_to) && BigInt(l.data) === amount);
  if (!log) return { ok: false, why: 'wrong', detail: 'That transaction isn’t this payment (token, address or amount differ).' };
  if (!confirmed) return { ok: false, why: 'confirming', confirmations: confs };
  return { ok: true, payer: ('0x' + (log.topics[1] ?? '').slice(-40)).toLowerCase() };
}

async function solRpc(url: string, method: string, params: unknown[]): Promise<unknown> {
  const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }), signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error(`solana rpc ${r.status}`);
  const j = (await r.json()) as { result?: unknown; error?: { message?: string } };
  if (j.error) throw new Error(`solana rpc: ${j.error.message}`);
  return j.result;
}
interface SolTx {
  blockTime: number | null;
  meta: { err: unknown; preBalances: number[]; postBalances: number[]; preTokenBalances?: TokBal[]; postTokenBalances?: TokBal[] } | null;
  transaction: { message: { accountKeys: ({ pubkey: string; signer?: boolean } | string)[] } };
}
interface TokBal { accountIndex: number; mint: string; owner?: string; uiTokenAmount: { amount: string } }

/** Solana Pay: find a finalized transfer carrying this payment's reference, with exactly the right amount to the owner. */
async function checkSolana(p: PaymentRow, rpc: string): Promise<Verdict & { tx?: string }> {
  const info = netInfo('solana');
  const sigs = (await solRpc(rpc, 'getSignaturesForAddress', [p.reference, { limit: 3, commitment: 'finalized' }])) as { signature: string; err: unknown }[];
  const amount = BigInt(p.amount);
  const mint = tokenOf('solana', p.asset);
  let wrong: string | undefined;
  for (const s of sigs ?? []) {
    if (s.err) continue;
    const tx = (await solRpc(rpc, 'getTransaction', [s.signature, { encoding: 'jsonParsed', commitment: 'finalized', maxSupportedTransactionVersion: 0 }])) as SolTx | null;
    if (!tx?.meta || tx.meta.err) continue;
    const keys = tx.transaction.message.accountKeys.map((k) => (typeof k === 'string' ? k : k.pubkey));
    if (!keys.includes(p.reference!)) continue;
    const when = (tx.blockTime ?? 0) * 1000;
    if (when < new Date(p.created_at).getTime() - 120_000 || when > new Date(p.expires_at).getTime() + info.graceMin * 60_000) { wrong = 'That payment was sent outside its time window.'; continue; }
    let got = 0n;
    if (!mint) {
      const i = keys.indexOf(p.pay_to);
      if (i >= 0) got = BigInt(tx.meta.postBalances[i]) - BigInt(tx.meta.preBalances[i]);
    } else {
      const sum = (list?: TokBal[]) => (list ?? []).filter((b) => b.owner === p.pay_to && b.mint === mint).reduce((a, b) => a + BigInt(b.uiTokenAmount.amount), 0n);
      got = sum(tx.meta.postTokenBalances) - sum(tx.meta.preTokenBalances);
    }
    if (got !== amount) { wrong = 'That payment’s amount doesn’t match.'; continue; }
    const signer = tx.transaction.message.accountKeys.find((k) => typeof k !== 'string' && k.signer);
    return { ok: true, payer: typeof signer === 'object' && signer ? signer.pubkey : keys[0], tx: s.signature };
  }
  return wrong ? { ok: false, why: 'wrong', detail: wrong } : { ok: false, why: 'pending' };
}

/**
 * USDC on Ethereum/Base without a transaction id (the app was closed, a smart wallet returned another kind of id, or the
 * person paid from somewhere else): look for a transfer of exactly this amount to the owner since the quote was made.
 */
async function findUsdc(p: PaymentRow, rpc: string): Promise<string | null> {
  const info = netInfo(p.network);
  const c = createPublicClient({ chain: info.chain, transport: http(rpc, { timeout: 8000, retryCount: 1 }) });
  if ((await c.getChainId()) !== info.chainId) throw new Error(`provider ${new URL(rpc).host} is on another network`);
  const latest = await c.getBlockNumber();
  const secs = (Date.now() - new Date(p.created_at).getTime()) / 1000 + 300;
  const span = BigInt(Math.min(20_000, Math.ceil(secs / info.blockSecs)));
  const amount = BigInt(p.amount);
  const token = tokenOf(p.network, p.asset)! as `0x${string}`;
  for (let to = latest; to > latest - span && to > 0n; to -= 2_000n) {
    const from = to - 1_999n > latest - span ? to - 1_999n : latest - span + 1n;
    const logs = await c.getLogs({ address: token, fromBlock: from < 0n ? 0n : from, toBlock: to, event: TRANSFER_EVENT, args: { to: p.pay_to as `0x${string}` } });
    const hit = logs.find((l) => l.args.value === amount);
    if (hit) return hit.transactionHash;
  }
  return null;
}
const TRANSFER_EVENT = { type: 'event', name: 'Transfer', inputs: [{ type: 'address', name: 'from', indexed: true }, { type: 'address', name: 'to', indexed: true }, { type: 'uint256', name: 'value', indexed: false }] } as const;

/** Is `address` a smart-contract wallet on this payment's network? (EIP-7702 accounts count as regular wallets.) */
export async function isSmartWallet(p: PaymentRow, address: string): Promise<boolean> {
  const info = netInfo(p.network);
  const c = createPublicClient({ chain: info.chain, transport: http(info.rpcs[0], { timeout: 8000, retryCount: 1 }) });
  const code = await c.getCode({ address: address as `0x${string}` }).catch(() => undefined);
  return !!code && code !== '0x' && !code.toLowerCase().startsWith('0xef0100');
}

/**
 * Bitcoin: find a transaction paying exactly this amount (in satoshis) to the owner's address, through two independent
 * block explorers (mempool.space, blockstream.info). 1 confirmation is enough for these small amounts.
 */
interface EsploraTx { txid: string; status: { confirmed: boolean; block_time?: number }; vout: { scriptpubkey_address?: string; value: number }[] }
async function checkBitcoin(p: PaymentRow, apiBase: string): Promise<Verdict & { tx?: string }> {
  const info = netInfo('bitcoin');
  const r = await fetch(`${apiBase}/address/${p.pay_to}/txs`, { signal: AbortSignal.timeout(8000), headers: { accept: 'application/json' } });
  if (!r.ok) throw new Error(`bitcoin api ${r.status}`);
  const txs = (await r.json()) as EsploraTx[];
  const amount = Number(p.amount);
  const hit = txs.find((t) => t.vout.some((o) => o.scriptpubkey_address === p.pay_to && o.value === amount));
  if (!hit) return { ok: false, why: 'pending' };
  if (!hit.status.confirmed) return { ok: false, why: 'confirming', tx: hit.txid };
  const when = (hit.status.block_time ?? 0) * 1000;
  if (when < new Date(p.created_at).getTime() - 120_000 || when > new Date(p.expires_at).getTime() + info.graceMin * 60_000) return { ok: false, why: 'wrong', detail: 'That payment was sent outside its time window.' };
  return { ok: true, payer: '', tx: hit.txid };
}

/** Ask both providers; every one must confirm the same thing. */
export async function verifyOnChain(p: PaymentRow, hash?: string): Promise<Verdict & { tx?: string }> {
  const info = netInfo(p.network);
  let verdicts: (Verdict & { tx?: string })[];
  try {
    if (isEvm(p.network) && !hash) {
      if (p.asset !== 'USDC' && p.asset !== 'USDT') return { ok: false, why: 'pending' };
      const found = await Promise.all(info.rpcs.map((rpc) => findUsdc(p, rpc)));
      if (!found[0] || found.some((f) => f !== found[0])) return { ok: false, why: 'pending' };
      hash = found[0];
    }
    verdicts = await Promise.all(info.rpcs.map((rpc) => (p.network === 'solana' ? checkSolana(p, rpc)
      : p.network === 'bitcoin' ? checkBitcoin(p, rpc)
        : checkEvm(p, hash!, rpc).then((v) => ({ ...v, tx: hash })))));
  } catch (e) {
    console.error('payment check failed', e);
    throw new HttpError(503, 'We couldn’t reach the network to check your payment — it’s safe, we’ll keep checking. Try again in a minute.');
  }
  if (!verdicts.length) throw new HttpError(503, 'Payments aren’t set up for this network.');
  const yes = verdicts.filter((v) => v.ok);
  if (yes.length === verdicts.length && verdicts.every((v) => v.tx === verdicts[0].tx)) return verdicts[0];
  // not all agree yet: report the least-finished state (never a "yes")
  const order = ['wrong', 'pending', 'confirming'];
  const no = verdicts.filter((v) => !v.ok) as Extract<Verdict, { ok: false }>[];
  if (!no.length) return { ok: false, why: 'confirming' };
  no.sort((a, b) => order.indexOf(a.why) - order.indexOf(b.why));
  return no[0];
}

// ---------- what a payment gives ----------
export const addressHash = (address: string) => createHash('sha256').update('fz-wallet:' + address.toLowerCase()).digest('hex');

/** Add a gift box (100 Fuzzies) for a wallet — once per wallet, ever. */
export async function giftForWallet(userId: string, address: string): Promise<{ id: string; amount: number } | null> {
  const h = addressHash(address);
  const { rows } = await q("insert into fz_wallet_rewards (address_hash, gift_at) values ($1, now()) on conflict (address_hash) do update set gift_at = now() where fz_wallet_rewards.gift_at is null returning address_hash", [h]);
  if (!rows[0]) return null;
  const id = 'gift_' + h.slice(0, 24);
  await q('insert into fz_gifts (id, user_id, amount, reason) values ($1, $2, $3, $4) on conflict (id) do nothing', [id, userId, WALLET_GIFT, 'wallet']);
  return { id, amount: WALLET_GIFT };
}

/** Make a paid payment count (safe to run again: every step only happens once). */
export async function fulfil(p: PaymentRow): Promise<{ gift?: { id: string; amount: number } | null }> {
  if (p.kind === 'pack') {
    await q('insert into fz_credits (id, user_id, amount, reason) values ($1, $2, $3, $4) on conflict (id) do nothing', [p.id, p.user_id, p.fuzzies, 'pack']);
    await applyCredits(p.user_id);
    return {};
  }
  await q('update fz_wallets set active = true where address = $1 and user_id = $2', [p.item, p.user_id]);
  await q("insert into fz_wallet_rewards (address_hash, fee_paid_at) values ($1, now()) on conflict (address_hash) do update set fee_paid_at = coalesce(fz_wallet_rewards.fee_paid_at, now())", [addressHash(p.item)]);
  return { gift: await giftForWallet(p.user_id, p.item) };
}
