/**
 * Wallet sign-in ("Sign-In with Ethereum", EIP-4361) — the safe way to connect MetaMask, Trust Wallet, Coinbase
 * Wallet, Rabby and other Ethereum wallets.
 *
 * How it stays safe:
 * - The wallet only ever signs a plain-text message. No transaction, no token approval, no gas, no access to funds.
 *   Fuzzies never asks for a recovery phrase or private key, and never could use one.
 * - The SERVER writes the whole message (site address, wallet address, purpose, a one-time random nonce, an expiry)
 *   and keeps it. The browser can't change a word of it: we verify the signature against our stored copy.
 * - Each message works once, for 10 minutes, and only for the purpose and account it was made for.
 * - Signatures are checked with @noble/curves + @noble/hashes (audited, dependency-free cryptography used by
 *   ethers and viem): recover the signer from the Ethereum "personal message" hash and compare addresses.
 * - Smart wallets (Coinbase Smart Wallet, Safe, Argent, Ambire…) sign with their contract instead of a key. They are
 *   checked the standard way (ERC-1271, and ERC-6492 for wallets that aren't deployed yet) with viem, by asking the
 *   network itself — read-only, no transaction, no fee. Two independent network providers must BOTH confirm it.
 */
import { secp256k1 } from '@noble/curves/secp256k1.js';
import { keccak_256 } from '@noble/hashes/sha3.js';
import { createPublicClient, http, type Chain } from 'viem';
import { mainnet, base, optimism, arbitrum, polygon } from 'viem/chains';
import { HttpError } from './auth.js';

const ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const enc = new TextEncoder();
const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
function unhex(s: string): Uint8Array {
  const clean = s.startsWith('0x') ? s.slice(2) : s;
  if (!/^[0-9a-fA-F]*$/.test(clean) || clean.length % 2) throw new HttpError(400, 'That signature doesn’t look right.');
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return out;
}

/** A wallet address in our storage form (lower-case 0x…), or an error for anything else. */
export function normAddress(a: unknown): string {
  if (typeof a !== 'string' || !ADDRESS.test(a.trim())) throw new HttpError(400, 'That wallet address doesn’t look right.');
  return a.trim().toLowerCase();
}

/** EIP-55 mixed-case checksum form (what wallets show and what the sign-in message must contain). */
export function checksumAddress(a: string): string {
  const lower = normAddress(a).slice(2);
  const h = hex(keccak_256(enc.encode(lower)));
  let out = '0x';
  for (let i = 0; i < 40; i++) out += parseInt(h[i], 16) >= 8 ? lower[i].toUpperCase() : lower[i];
  return out;
}

/** The hash a wallet signs for `personal_sign`: keccak256("\x19Ethereum Signed Message:\n" + length + message). */
export function personalHash(message: string): Uint8Array {
  const body = enc.encode(message);
  const prefix = enc.encode(`\x19Ethereum Signed Message:\n${body.length}`);
  const all = new Uint8Array(prefix.length + body.length);
  all.set(prefix); all.set(body, prefix.length);
  return keccak_256(all);
}

/** The longest signature we accept (smart wallets that aren't deployed yet send their set-up code along: a few KB). */
export const MAX_SIGNATURE = 20_000;

/** The address that signed `message` (personal_sign), lower-case; throws a friendly error for malformed signatures. */
export function recoverSigner(message: string, signature: unknown): string {
  if (typeof signature !== 'string' || signature.length > MAX_SIGNATURE) throw new HttpError(400, 'That signature doesn’t look right.');
  const sig = unhex(signature);
  if (sig.length !== 65) throw new HttpError(400, 'That signature doesn’t look right.');
  let v = sig[64];
  if (v >= 27) v -= 27;
  if (v !== 0 && v !== 1) throw new HttpError(400, 'That signature doesn’t look right.');
  // noble's "recovered" form puts the recovery bit first: [v, r, s]
  const rec = new Uint8Array(65);
  rec[0] = v; rec.set(sig.subarray(0, 64), 1);
  try {
    const pub = secp256k1.recoverPublicKey(rec, personalHash(message), { prehash: false });
    const full = secp256k1.Point.fromBytes(pub).toBytes(false); // 0x04 + X + Y
    return '0x' + hex(keccak_256(full.subarray(1))).slice(-40);
  } catch {
    throw new HttpError(400, 'That signature doesn’t look right.');
  }
}

/** Networks where smart-wallet signatures can be checked, each with two independent public providers. */
const NETWORKS: Record<number, { chain: Chain; rpcs: string[] }> = {
  1: { chain: mainnet, rpcs: [mainnet.rpcUrls.default.http[0], 'https://ethereum-rpc.publicnode.com'] },
  8453: { chain: base, rpcs: [base.rpcUrls.default.http[0], 'https://base-rpc.publicnode.com'] },
  10: { chain: optimism, rpcs: [optimism.rpcUrls.default.http[0], 'https://optimism-rpc.publicnode.com'] },
  42161: { chain: arbitrum, rpcs: [arbitrum.rpcUrls.default.http[0], 'https://arbitrum-one-rpc.publicnode.com'] },
  137: { chain: polygon, rpcs: [polygon.rpcUrls.default.http[0], 'https://polygon-bor-rpc.publicnode.com'] },
};

/** The providers to ask for a network: WALLET_RPC_<chainId> (comma-separated, e.g. your own Alchemy/Infura URLs) or the defaults. */
function providersFor(chainId: number): { chain?: Chain; rpcs: string[] } {
  const set = (process.env[`WALLET_RPC_${chainId}`] ?? '').split(',').map((u) => u.trim()).filter((u) => /^https?:\/\/[^\s]+$/.test(u));
  if (set.length) return { chain: NETWORKS[chainId]?.chain, rpcs: set.slice(0, 2) };
  return NETWORKS[chainId] ?? { rpcs: [] };
}

/**
 * Did the smart wallet at `address` sign `message`? Asks the network (read-only `eth_call`, ERC-1271 / ERC-6492) through
 * two independent providers; both must say yes, so one wrong or hacked provider can't let a forged signature in.
 */
export async function verifySmartWallet(address: string, message: string, signature: string, chainId: number): Promise<boolean> {
  const { chain, rpcs } = providersFor(chainId);
  if (!rpcs.length) throw new HttpError(400, 'Smart wallets work on Ethereum, Base, Optimism, Arbitrum and Polygon — switch your wallet to one of them and try again.');
  let answers: boolean[];
  try {
    answers = await Promise.all(rpcs.map(async (url) => {
      const client = createPublicClient({ chain, transport: http(url, { timeout: 8000, retryCount: 1 }) });
      // the provider must be reachable and really on this network (else "no" could just mean "couldn't ask")
      if ((await client.getChainId()) !== chainId) throw new Error(`provider ${new URL(url).host} is on another network`);
      return client.verifyMessage({ address: checksumAddress(address) as `0x${string}`, message, signature: signature as `0x${string}` });
    }));
  } catch (e) {
    console.error('smart wallet check failed', e);
    throw new HttpError(503, 'We couldn’t check your smart wallet with the network right now — please try again in a minute.');
  }
  return answers.length > 0 && answers.every((a) => a === true);
}

/** The EIP-4361 message, written by the server. `statement` must be one line. */
export function siweMessage(o: { domain: string; uri: string; address: string; statement: string; chainId: number; nonce: string; issuedAt: Date; expiresAt: Date }): string {
  return [
    `${o.domain} wants you to sign in with your Ethereum account:`,
    checksumAddress(o.address),
    '',
    o.statement.replace(/[\r\n]+/g, ' '),
    '',
    `URI: ${o.uri}`,
    'Version: 1',
    `Chain ID: ${o.chainId}`,
    `Nonce: ${o.nonce}`,
    `Issued At: ${o.issuedAt.toISOString()}`,
    `Expiration Time: ${o.expiresAt.toISOString()}`,
  ].join('\n');
}

/**
 * The site this request came from (host + origin). A browser always sends Origin on a POST fetch; when it does,
 * it must be the same site as the request — so another website can't start a wallet sign-in on someone's behalf.
 */
export function siteOf(req: Request): { domain: string; origin: string } {
  const url = new URL(req.url);
  // the public address people typed (Vercel and the dev server pass it as the Host / X-Forwarded-Host header)
  const host = (req.headers.get('x-forwarded-host') || req.headers.get('host') || url.host).split(',')[0].trim();
  const proto = (req.headers.get('x-forwarded-proto') || url.protocol.replace(':', '')).split(',')[0].trim() === 'http' ? 'http' : 'https';
  const origin = req.headers.get('origin');
  if (origin && origin !== 'null') {
    let o: URL;
    try { o = new URL(origin); } catch { throw new HttpError(403, 'Wallet sign-in only works on the Fuzzies website.'); }
    if (o.host !== host) throw new HttpError(403, 'Wallet sign-in only works on the Fuzzies website.');
  }
  if (!/^[a-z0-9.-]+(:\d+)?$/i.test(host)) throw new HttpError(400, 'Unknown website address.');
  return { domain: host, origin: `${proto}://${host}` };
}
