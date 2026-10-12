/**
 * Crypto wallets in the browser — finding them and asking them to sign Fuzzies' sign-in message.
 *
 * - Finds every installed wallet with EIP-6963 (MetaMask, Coinbase Wallet, Trust Wallet, Rabby, Brave, OKX, Phantom…
 *   each announces itself with its name and icon), falling back to the classic `window.ethereum`.
 * - On a phone without a wallet in the browser, offers to open Fuzzies inside the wallet app's own browser
 *   (MetaMask, Trust Wallet, Coinbase Wallet) through their official links.
 * - Only two wallet requests are ever made: `eth_requestAccounts` (which address?) and `personal_sign` (sign this
 *   text). Never transactions, approvals, network switches or anything that can move funds.
 * The server writes the message and checks the signature (api/_lib/wallet.ts).
 */

export interface Eip1193 { request(args: { method: string; params?: unknown[] }): Promise<unknown> }
export interface WalletChoice { id: string; name: string; icon: string; provider: Eip1193 }
export interface WalletApp { id: string; name: string; link: string }

/** A wallet's icon, accepted only as an embedded picture (never a script or a remote address). */
const safeIcon = (s: unknown) => (typeof s === 'string' && /^data:image\/(svg\+xml|png|jpeg|webp|gif)[;,]/i.test(s) && s.length < 200_000 ? s : '');
const safeName = (s: unknown) => (typeof s === 'string' ? s.replace(/[^\p{L}\p{N} .()&'-]/gu, '').trim().slice(0, 40) : '') || 'Wallet';

/** Every wallet installed in this browser (waits a moment for wallets to announce themselves). */
export async function findWallets(waitMs = 400): Promise<WalletChoice[]> {
  const found = new Map<string, WalletChoice>();
  const onAnnounce = (e: Event) => {
    const d = (e as CustomEvent).detail as { info?: { uuid?: string; name?: string; icon?: string; rdns?: string }; provider?: Eip1193 } | undefined;
    if (!d?.provider || typeof d.provider.request !== 'function' || !d.info) return;
    const id = String(d.info.rdns || d.info.uuid || d.info.name);
    if (!found.has(id)) found.set(id, { id, name: safeName(d.info.name), icon: safeIcon(d.info.icon), provider: d.provider });
  };
  window.addEventListener('eip6963:announceProvider', onAnnounce);
  window.dispatchEvent(new Event('eip6963:requestProvider'));
  await new Promise((r) => setTimeout(r, waitMs));
  window.removeEventListener('eip6963:announceProvider', onAnnounce);
  const legacy = (window as unknown as { ethereum?: Eip1193 & { isMetaMask?: boolean; isCoinbaseWallet?: boolean; isTrust?: boolean; isTrustWallet?: boolean } }).ethereum;
  if (!found.size && legacy && typeof legacy.request === 'function') {
    const name = legacy.isCoinbaseWallet ? 'Coinbase Wallet' : legacy.isTrust || legacy.isTrustWallet ? 'Trust Wallet' : legacy.isMetaMask ? 'MetaMask' : 'Browser wallet';
    found.set('injected', { id: 'injected', name, icon: '', provider: legacy });
  }
  return [...found.values()];
}

export const isPhone = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

/** Open this page inside a wallet app's browser (official links; the wallet then connects like a desktop extension). */
export function walletApps(hash = location.hash || '#/profile'): WalletApp[] {
  const url = `${location.origin}${location.pathname}${hash}`;
  return [
    { id: 'metamask', name: 'MetaMask', link: `https://metamask.app.link/dapp/${location.host}${location.pathname}${hash}` },
    { id: 'trust', name: 'Trust Wallet', link: `https://link.trustwallet.com/open_url?coin_id=60&url=${encodeURIComponent(url)}` },
    { id: 'coinbase', name: 'Coinbase Wallet', link: `https://go.cb-w.com/dapp?cb_url=${encodeURIComponent(url)}` },
  ];
}

/** Turn wallet errors into plain words. */
export function walletError(e: unknown): Error {
  const code = (e as { code?: number }).code;
  if (code === 4001 || /reject|denied|cancel/i.test(String((e as Error).message ?? ''))) return new Error('You cancelled in your wallet — nothing was signed.');
  if (code === -32002) return new Error('Your wallet already has a request waiting — open the wallet to finish or cancel it.');
  if (e instanceof Error && e.message && !(e as { code?: number }).code) return e;
  return new Error('Your wallet couldn’t complete that — please try again.');
}

/** Ask the wallet which address to use (the wallet shows its own "connect" window). */
export async function connect(w: WalletChoice): Promise<{ address: string; chainId: number }> {
  try {
    const accounts = (await w.provider.request({ method: 'eth_requestAccounts' })) as unknown;
    const address = Array.isArray(accounts) ? String(accounts[0] ?? '') : '';
    if (!/^0x[0-9a-fA-F]{40}$/.test(address)) throw new Error('Your wallet didn’t share an address.');
    let chainId = 1;
    try { chainId = parseInt(String(await w.provider.request({ method: 'eth_chainId' })), 16) || 1; } catch { /* sign-in works on any network */ }
    return { address, chainId };
  } catch (e) { throw walletError(e); }
}

const utf8Hex = (s: string) => '0x' + Array.from(new TextEncoder().encode(s), (b) => b.toString(16).padStart(2, '0')).join('');

/** Ask the wallet to sign the server's message (free; the wallet shows the full text first). */
export async function signMessage(w: WalletChoice, address: string, message: string): Promise<string> {
  try {
    const sig = await w.provider.request({ method: 'personal_sign', params: [utf8Hex(message), address] });
    if (typeof sig === 'string' && /^0x[0-9a-fA-F]{131,}$/.test(sig)) throw new Error('Smart-contract wallets (like Coinbase Smart Wallet) aren’t supported yet — please use a regular wallet account.');
    if (typeof sig !== 'string' || !/^0x[0-9a-fA-F]{130}$/.test(sig)) throw new Error('Your wallet returned an unexpected signature.');
    return sig;
  } catch (e) { throw walletError(e); }
}

export const shortAddress = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
