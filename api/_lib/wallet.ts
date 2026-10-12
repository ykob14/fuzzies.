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
 */
import { secp256k1 } from '@noble/curves/secp256k1.js';
import { keccak_256 } from '@noble/hashes/sha3.js';
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

/** The address that signed `message` (personal_sign), lower-case; throws a friendly error for malformed signatures. */
export function recoverSigner(message: string, signature: unknown): string {
  if (typeof signature !== 'string' || signature.length > 200) throw new HttpError(400, 'That signature doesn’t look right.');
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
