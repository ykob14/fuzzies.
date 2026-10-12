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
import { base58 } from '@scure/base';
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
const GRACE_MINUTES = 60; // a transfer sent in time may still be confirming a little after the quote expires

/** The one-time wallet activation fee in cents (WALLET_FEE_USD, default $0.50; 0 turns it off). */
export function walletFeeCents(): number {
  const v = Number(process.env.WALLET_FEE_USD ?? '0.5');
  return Number.isFinite(v) && v >= 0 && v <= 20 ? Math.round(v * 100) : 50;
}

// ---------- networks & coins ----------
const dev = process.env.NODE_ENV !== 'production'; // test-only overrides are ignored on the live site
const USDC = { ethereum: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', base: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', solana: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' };
type Net = 'base' | 'ethereum' | 'solana';
type Asset = 'ETH' | 'USDC' | 'SOL';
interface NetInfo { id: Net; name: string; chainId?: number; chain?: Chain; assets: Asset[]; confirmations: number; rpcs: string[]; explorer: string; fee: string }

function rpcList(envName: string, defaults: string[]): string[] {
  const set = (process.env[envName] ?? '').split(',').map((u) => u.trim()).filter((u) => /^https?:\/\/\S+$/.test(u));
  return (set.length ? set : defaults).slice(0, 2);
}
function netInfo(id: Net): NetInfo {
  if (id === 'base') return { id, name: 'Base', chainId: 8453, chain: base, assets: ['ETH', 'USDC'], confirmations: 5, rpcs: rpcList('WALLET_RPC_8453', [base.rpcUrls.default.http[0], 'https://base-rpc.publicnode.com']), explorer: 'https://basescan.org/tx/', fee: 'under 1¢' };
  if (id === 'ethereum') return { id, name: 'Ethereum', chainId: 1, chain: mainnet, assets: ['ETH', 'USDC'], confirmations: 3, rpcs: rpcList('WALLET_RPC_1', [mainnet.rpcUrls.default.http[0], 'https://ethereum-rpc.publicnode.com']), explorer: 'https://etherscan.io/tx/', fee: 'about $0.20–$3' };
  return { id, name: 'Solana', assets: ['SOL', 'USDC'], confirmations: 0, rpcs: rpcList('SOLANA_RPC', ['https://api.mainnet-beta.solana.com', 'https://solana-rpc.publicnode.com']), explorer: 'https://solscan.io/tx/', fee: 'under 1¢' };
}
const DECIMALS: Record<Asset, number> = { ETH: 18, USDC: 6, SOL: 9 };
function tokenOf(net: Net, asset: Asset): string | null {
  if (asset !== 'USDC') return null;
  if (dev) { const t = process.env[`PAY_TEST_USDC_${net.toUpperCase()}`]; if (t) return t; }
  return USDC[net];
}

/** Where the money goes: the site owner's own addresses (set in Vercel). */
function payTo(net: Net): string | null {
  if (net === 'solana') {
    const a = (process.env.PAY_SOL_ADDRESS ?? '').trim();
    try { return a && base58.decode(a).length === 32 ? a : null; } catch { return null; }
  }
  const a = (process.env.PAY_EVM_ADDRESS ?? '').trim();
  return /^0x[0-9a-fA-F]{40}$/.test(a) ? checksumAddress(a) : null;
}

/** What the app may offer: networks with an owner address. */
export function payConfig() {
  const nets = (['base', 'solana', 'ethereum'] as Net[]).filter((n) => payTo(n)).map((n) => {
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
/** USD price of ETH or SOL: Coinbase and Kraken; when both answer they must be within 3%. */
export async function usdPrice(asset: 'ETH' | 'SOL'): Promise<number> {
  if (dev && process.env[`PRICE_TEST_${asset}`]) return Number(process.env[`PRICE_TEST_${asset}`]);
  const hit = priceCache.get(asset);
  if (hit && Date.now() - hit.at < 60_000) return hit.usd;
  const sources = await Promise.allSettled([
    fetchJson(`https://api.coinbase.com/v2/prices/${asset}-USD/spot`).then((j) => Number((j as { data?: { amount?: string } }).data?.amount)),
    fetchJson(`https://api.kraken.com/0/public/Ticker?pair=${asset === 'ETH' ? 'ETHUSD' : 'SOLUSD'}`).then((j) => {
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
async function amountFor(cents: number, asset: Asset): Promise<bigint> {
  if (asset === 'USDC') return BigInt(cents) * 10_000n + BigInt(randomInt(1, 999)); // micro-USDC; fingerprint < $0.001
  const price = await usdPrice(asset);
  const d = DECIMALS[asset];
  const step = asset === 'ETH' ? 10n ** 12n : 1_000n; // round up to 0.000001 ETH / 0.000001 SOL
  const raw = BigInt(Math.ceil((cents / 100 / price) * 1e9)) * 10n ** BigInt(d - 9);
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
  const display = formatUnits(BigInt(p.amount), DECIMALS[p.asset]);
  let solanaPay: string | undefined;
  if (p.network === 'solana') {
    solanaPay = `solana:${p.pay_to}?amount=${display}${token ? `&spl-token=${token}` : ''}&reference=${p.reference}&label=Fuzzies`;
  }
  return {
    id: p.id, kind: p.kind, item: p.item, usdCents: p.usd_cents, fuzzies: p.fuzzies,
    network: p.network, networkName: info.name, chainId: info.chainId, asset: p.asset, token, decimals: DECIMALS[p.asset],
    amount: p.amount, display, payTo: p.pay_to, solanaPay, status: p.status, tx: p.tx,
    txUrl: p.tx ? info.explorer + p.tx : undefined, expiresAt: new Date(p.expires_at).toISOString(), confirmations: info.confirmations,
  };
}

export async function createQuote(userId: string, kind: 'pack' | 'wallet', item: string, net: Net, asset: Asset): Promise<PaymentRow> {
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
  await q("update fz_payments set status = 'expired' where status = 'pending' and expires_at < now() - interval '1 hour'");
  const { rows: n } = await q("select count(*) filter (where created_at > now() - interval '1 hour')::int as hour, count(*) filter (where status = 'pending' and expires_at > now())::int as open from fz_payments where user_id = $1", [userId]);
  if (n[0].hour >= 30 || n[0].open >= 6) throw new HttpError(429, 'Too many payment requests — please finish or wait for the open ones first.');
  for (let attempt = 0; attempt < 6; attempt++) {
    const amount = await amountFor(cents, asset);
    const id = 'pay_' + randomBytes(12).toString('hex');
    const reference = net === 'solana' ? base58.encode(randomBytes(32)) : null;
    try {
      const { rows } = await q<PaymentRow>(
        `insert into fz_payments (id, user_id, kind, item, usd_cents, fuzzies, network, asset, amount, pay_to, reference, expires_at)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, now() + interval '${QUOTE_MINUTES} minutes') returning *`,
        [id, userId, kind, item, cents, fuzzies, net, asset, amount.toString(), to, reference]);
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
  const latest = await c.getBlockNumber();
  const confs = Number(latest - receipt.blockNumber + 1n);
  const block = await c.getBlock({ blockNumber: receipt.blockNumber });
  const when = Number(block.timestamp) * 1000;
  if (when < new Date(p.created_at).getTime() - 120_000 || when > new Date(p.expires_at).getTime() + GRACE_MINUTES * 60_000) return { ok: false, why: 'wrong', detail: 'That transaction was sent outside this payment’s time window.' };
  const amount = BigInt(p.amount);
  if (p.asset === 'ETH') {
    const tx = await c.getTransaction({ hash: hash as Hash });
    if (tx.to?.toLowerCase() !== p.pay_to.toLowerCase() || tx.value !== amount) return { ok: false, why: 'wrong', detail: 'That transaction isn’t this payment (address or amount differ).' };
    if (confs < info.confirmations) return { ok: false, why: 'confirming', confirmations: confs };
    return { ok: true, payer: tx.from.toLowerCase() };
  }
  const token = tokenOf(p.network, p.asset)!.toLowerCase();
  const log = receipt.logs.find((l) => l.address.toLowerCase() === token && l.topics[0] === TRANSFER && l.topics[2]?.toLowerCase() === pad32(p.pay_to) && BigInt(l.data) === amount);
  if (!log) return { ok: false, why: 'wrong', detail: 'That transaction isn’t this payment (token, address or amount differ).' };
  if (confs < info.confirmations) return { ok: false, why: 'confirming', confirmations: confs };
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
  const sigs = (await solRpc(rpc, 'getSignaturesForAddress', [p.reference, { limit: 10, commitment: 'finalized' }])) as { signature: string; err: unknown }[];
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
    if (when < new Date(p.created_at).getTime() - 120_000 || when > new Date(p.expires_at).getTime() + GRACE_MINUTES * 60_000) { wrong = 'That payment was sent outside its time window.'; continue; }
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

/** Ask both providers; every one must confirm the same thing. */
export async function verifyOnChain(p: PaymentRow, hash?: string): Promise<Verdict & { tx?: string }> {
  const info = netInfo(p.network);
  let verdicts: (Verdict & { tx?: string })[];
  try {
    verdicts = await Promise.all(info.rpcs.map((rpc) => (p.network === 'solana' ? checkSolana(p, rpc) : checkEvm(p, hash!, rpc).then((v) => ({ ...v, tx: hash })))));
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
