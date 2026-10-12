/**
 * Crypto wallets in the browser — finding them and asking them to sign Fuzzies' sign-in message.
 *
 * - Finds every installed wallet with EIP-6963 (MetaMask, Coinbase Wallet, Trust Wallet, Rabby, Brave, OKX, Phantom…
 *   each announces itself with its name and icon), falling back to the classic `window.ethereum`.
 * - For popular wallets that aren't installed (Crypto.com Onchain, Robinhood Wallet, OKX, Phantom…) it explains how to
 *   open Fuzzies inside the wallet app's own browser — through the wallet's official link where one exists.
 * - Only three wallet requests are ever made: `eth_requestAccounts` (which address?), `eth_chainId` (which network?) and
 *   `personal_sign` (sign this text). Never transactions, approvals, network switches or anything that can move funds.
 * - Wallets on another device (scan a QR code) go through WalletConnect — see core/walletconnect.ts.
 * The server writes the message and checks the signature (api/_lib/wallet.ts).
 */

export interface Eip1193 { request(args: { method: string; params?: unknown[] }): Promise<unknown> }
export interface WalletChoice { id: string; name: string; icon: string; provider: Eip1193 }
export interface WalletApp { id: string; name: string; link: string }

/** A wallet's icon, accepted only as an embedded picture (never a script or a remote address). */
const safeIcon = (s: unknown) => (typeof s === 'string' && /^data:image\/(svg\+xml|png|jpeg|webp|gif)[;,]/i.test(s) && s.length < 200_000 ? s : '');
export const safeName = (s: unknown) => (typeof s === 'string' ? s.replace(/[^\p{L}\p{N} .()&'-]/gu, '').trim().slice(0, 40) : '') || 'Wallet';

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
/** A tablet: a touch device with a big screen (can show a QR code for a phone, or use a wallet app on itself). */
export const isTablet = () => isPhone() && Math.min(screen.width, screen.height) >= 600;

/**
 * The most popular wallets, for people who don't have one in this browser yet. Every address here is the wallet
 * maker's own official site or documented link (checked by hand — fake wallet downloads are the #1 crypto scam, so
 * never add a link from a search ad or a forum). `open` = the wallet's official "open this site in my app" link;
 * wallets without one get step-by-step instructions instead (`browser` says where their built-in browser is).
 */
export interface TopWallet { id: string; name: string; match: RegExp; site: string; desktop: boolean; browser: string; open?: (url: string) => string }
const enc = encodeURIComponent;
export const TOP_WALLETS: TopWallet[] = [
  { id: 'metamask', name: 'MetaMask', match: /metamask/i, site: 'https://metamask.io/download/', desktop: true, browser: 'its Browser',
    open: (url) => `https://metamask.app.link/dapp/${url.replace(/^https?:\/\//, '')}` },
  { id: 'coinbase', name: 'Coinbase Wallet', match: /coinbase/i, site: 'https://www.coinbase.com/wallet/downloads', desktop: true, browser: 'its Browser',
    open: (url) => `https://go.cb-w.com/dapp?cb_url=${enc(url)}` },
  { id: 'trust', name: 'Trust Wallet', match: /trust/i, site: 'https://trustwallet.com/download', desktop: true, browser: 'its Browser',
    open: (url) => `https://link.trustwallet.com/open_url?coin_id=60&url=${enc(url)}` },
  { id: 'cryptocom', name: 'Crypto.com Onchain', match: /crypto\.com|onchain|defi wallet/i, site: 'https://crypto.com/us/onchain', desktop: true, browser: 'the dapp browser (search bar)' },
  { id: 'robinhood', name: 'Robinhood Wallet', match: /robinhood/i, site: 'https://robinhood.com/us/en/download/wallet/', desktop: false, browser: 'the Web3 tab (globe icon)' },
  { id: 'okx', name: 'OKX Wallet', match: /okx|okex/i, site: 'https://web3.okx.com/download', desktop: true, browser: 'its Discover browser' },
  { id: 'phantom', name: 'Phantom', match: /phantom/i, site: 'https://phantom.com/download', desktop: true, browser: 'its Browser',
    open: (url) => `https://phantom.app/ul/browse/${enc(url)}?ref=${enc(new URL(url).origin)}` },
  { id: 'rabby', name: 'Rabby', match: /rabby/i, site: 'https://rabby.io/', desktop: true, browser: 'its Dapps browser' },
  { id: 'rainbow', name: 'Rainbow', match: /rainbow/i, site: 'https://rainbow.me/', desktop: true, browser: 'its Browser' },
];

/** This page's address, for "open it in your wallet app". */
export const pageUrl = (hash = location.hash || '#/profile') => `${location.origin}${location.pathname}${hash}`;

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
    // regular wallets give 65 bytes; smart wallets (Coinbase Smart Wallet, Safe…) give longer ones the server checks on-chain
    if (typeof sig !== 'string' || !/^0x[0-9a-fA-F]{130,19998}$/.test(sig)) throw new Error('Your wallet returned an unexpected signature.');
    return sig;
  } catch (e) { throw walletError(e); }
}

export const shortAddress = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
