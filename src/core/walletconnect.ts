/**
 * WalletConnect: connect a wallet that lives on another device — scan a QR code with your phone wallet from a computer or
 * tablet, or pick your wallet app on a phone (Robinhood Wallet, Crypto.com Onchain, Rainbow, Ledger Live, Uniswap, Zerion,
 * Safe and 500+ more). Uses the official WalletConnect / Reown SDK, loaded only when someone taps it.
 *
 * Safety:
 * - The session may ONLY use `personal_sign` (no transactions, approvals or network switches can even be asked for).
 * - A fresh session every time; it is disconnected as soon as the sign-in is done (or fails), so nothing stays connected.
 * - The wallet sees Fuzzies' real address (WalletConnect Verify checks it against the domains listed for the project).
 * - Swaps, buying, sending, email/social log-ins and analytics in the WalletConnect window are switched off.
 *
 * Needs VITE_WALLETCONNECT_PROJECT_ID at build time (a free, public project ID from dashboard.reown.com); without it the
 * option is hidden. Licence: WalletConnect Community License — see public/licenses/walletconnect.md.
 */
import { safeName, type Eip1193, type WalletChoice } from './wallet';

const PROJECT_ID = String(import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ?? '').trim();
export const walletConnectReady = /^[0-9a-f]{32}$/i.test(PROJECT_ID);

/** Networks offered to the wallet (smart wallets are checked on these by the server). */
const CHAINS = [1, 8453, 10, 42161, 137];
const ONLY_SIGN = ['personal_sign'];

interface WcProvider extends Eip1193 {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  session?: { peer?: { metadata?: { name?: string } } };
  modal?: {
    updateFeatures?(f: Record<string, unknown>): void;
    setThemeMode?(m: 'light' | 'dark'): void;
    setThemeVariables?(v: Record<string, string | number>): void;
    close?(): Promise<void>;
  };
}

export interface RemoteWallet extends WalletChoice { done(): Promise<void> }

/** Show the WalletConnect window and wait until a wallet connects. Call `done()` afterwards (always). */
export async function connectRemote(): Promise<RemoteWallet> {
  if (!walletConnectReady) throw new Error('Scanning with a phone wallet isn’t switched on for this site yet.');
  let mod: typeof import('@walletconnect/ethereum-provider');
  try { mod = await import('@walletconnect/ethereum-provider'); }
  catch { throw new Error('Couldn’t load WalletConnect — check your internet and try again.'); }
  const css = getComputedStyle(document.documentElement);
  const provider = (await mod.EthereumProvider.init({
    projectId: PROJECT_ID,
    optionalChains: CHAINS as [number, ...number[]],
    methods: ONLY_SIGN,
    optionalMethods: ONLY_SIGN,
    events: ['accountsChanged', 'chainChanged'],
    optionalEvents: ['accountsChanged', 'chainChanged', 'disconnect'],
    showQrModal: true,
    metadata: {
      name: 'Fuzzies',
      description: 'Dream it fuzzy. Make it sharp. — sign in with your wallet (free, no transactions).',
      url: location.origin,
      icons: [`${location.origin}/icon-192.png`],
    },
    telemetryEnabled: false,
  })) as unknown as WcProvider;
  const m = provider.modal;
  m?.updateFeatures?.({ analytics: false, swaps: false, onramp: false, send: false, receive: false, history: false, email: false, socials: false, pay: false, legalCheckbox: false });
  m?.setThemeMode?.(document.documentElement.dataset.dark === 'true' ? 'dark' : 'light');
  m?.setThemeVariables?.({
    '--w3m-accent': css.getPropertyValue('--accent').trim() || '#d6336c',
    '--w3m-font-family': 'DM Sans, system-ui, sans-serif',
    '--w3m-border-radius-master': '2px',
    '--w3m-z-index': 1000,
  });
  const done = async () => { try { await provider.disconnect(); } catch { /* already gone */ } };
  if (provider.session) await done(); // never reuse an old session
  try {
    await provider.connect(); // QR code on computers & tablets, wallet list on phones
  } catch (e) {
    await done();
    const text = String((e as Error)?.message ?? '');
    if (/reset|closed|reject|cancel/i.test(text)) throw new Error('You closed WalletConnect — nothing was connected.');
    throw new Error('WalletConnect couldn’t connect — please try again.');
  }
  return { id: 'walletconnect', name: safeName(provider.session?.peer?.metadata?.name) || 'WalletConnect', icon: '', provider, done };
}
