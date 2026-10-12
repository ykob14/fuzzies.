# Accounts that work on every device (Neon + Vercel)

Fuzzies works on its own with everything saved on the device. Host it on **Vercel** with a free **Neon** database and it
gets real accounts: people sign up with email + password, and their designs, photos, Fuzzies, unlocks and settings
sync to every phone and computer they log in on.

Everything is already in the code:
- the website (`src/`)
- the backend: small server functions in `api/` that Vercel runs automatically
- the database setup: the tables create themselves the first time someone uses the app

You only need to connect the pieces.

## Setup (about 10 minutes, no code)

1. **Put the project on Vercel.** <https://vercel.com> → sign in with GitHub → **Add New… → Project** → import
   `ykob14/fuzzies.` → keep the detected settings (Vite) → **Deploy**. You get a link like `https://fuzzies-xyz.vercel.app`.
   Vercel publishes the `main` branch, so merge the latest work into `main` first.
2. **Add the database.** In the Vercel project → **Storage** → **Create Database** → **Neon** (Serverless Postgres) →
   pick the free plan and a region near your users → **Connect** it to the project (all environments).
   This gives the project its `DATABASE_URL` automatically.
3. **Redeploy.** **Deployments** → the latest one → **⋯** → **Redeploy**. (The app checks for the database while it's
   being built, so it needs one fresh build after step 2.)
4. **Check it.** Open your link: the welcome screen should say
   "…saved privately in your account — log in on any phone or computer". Make an account, then log in with it on your phone.

That's it. Optional: add an environment variable `AUTH_SECRET` (any long random text) in Vercel → Settings →
Environment Variables. Logins are signed with it; without it, a key is derived from the database password.
Changing it later logs everyone out once.

## How it behaves

- **Offline first:** everything is saved on the device first, then sent to the cloud a moment later, or when the device is back online.
- **Two devices at once:** each design keeps its newest version. The account is merged, so Fuzzies earned on the phone and an unlock on the laptop both count.
- **Guests and old on-device accounts:** Profile → **Save your account** moves their designs and Fuzzies into a real account.
- **Signing out** removes the copy on that device once everything is uploaded (good for shared computers).
- **Changing your password** logs out your other devices. **Delete account** removes everything from the database and the device.
- **Privacy:** every request is checked against the logged-in person; nobody can read or change anyone else's data.
  Passwords are stored scrambled (scrypt) and repeated wrong passwords are slowed down (10 tries per 15 minutes).

## Not included yet

- **Password reset by email** and **email confirmation** need an email service (e.g. Resend). It's a small next step.
- **Big photos:** a single design upload can be at most ~4.5 MB (Vercel's limit). Designs with many large photos won't sync
  and Profile shows a message. Moving photos to Vercel Blob storage is the fix.
- Neon's free plan holds about 0.5 GB, which is plenty to start.

## For developers

- Server: `api/auth.ts` (signup / login / me / password / delete / username), `api/data.ts` (profile + designs/uploads
  rows), shared code in `api/_lib/` (`db.ts`: pg pool + auto-created tables; `auth.ts`: scrypt, HMAC tokens, JSON helpers).
  Web-standard handlers (`export function POST(request: Request)`), which Vercel's Node runtime supports.
- Tables: `fz_users`, `fz_profiles` (account JSON + `updated_at` version), `fz_designs` / `fz_uploads`
  (primary key `(owner, id)`, JSON `data`, `deleted` tombstones), `fz_login_fails`.
- App: `src/core/api.ts` (fetch + token), `src/core/cloud.ts` (account flows), `src/core/sync.ts` (queue + pull/push),
  `src/core/merge.ts` (three-way account merge). Cloud mode turns on at build time when `DATABASE_URL`/`POSTGRES_URL`
  exists (`vite.config.ts`; only the yes/no reaches the browser). Force it with `VITE_CLOUD=1` or `0`.
- Local: put `DATABASE_URL=…` in `.env.local` (a Neon branch, `vercel env pull`, or a local Postgres) and run `npm run dev`.
  Vite serves `/api/*` with the same functions.

## Password reset emails (Resend)

"Forgot your password?" emails a link (works once, for 1 hour) through **Resend** — free for 3,000 emails a month.

1. Sign up at **resend.com** (use the same email you want to test with, e.g. your Gmail).
2. In Resend → **API Keys** → **Create API key** (permission: *Sending access*). Copy it.
3. In Vercel → your project → **Settings → Environment Variables**, add `RESEND_API_KEY` = the key (all environments).
4. **Redeploy** (Deployments → ⋯ → Redeploy). Done: "Forgot your password?" now sends emails.

Until you verify a domain, Resend's test sender (`onboarding@resend.dev`) **only delivers to the email you signed up to
Resend with**. To email any player: Resend → **Domains** → add your domain (e.g. fuzzies.app) and add the DNS records it
shows, then set `MAIL_FROM` in Vercel to e.g. `Fuzzies <hello@fuzzies.app>` and redeploy.

Optional: `APP_URL` (e.g. `https://fuzzies.app`) sets the address used in email links; by default it's your Vercel
production address.

## Crypto wallets (MetaMask, Coinbase Wallet, Trust Wallet…)

Browser wallets and smart wallets work as soon as the database is connected (the tables create themselves).
**QR codes / phone wallets (WalletConnect) need one free setting:**

1. Go to **dashboard.reown.com** (WalletConnect's company), sign up free, **Create project** → type *AppKit*, name *Fuzzies*.
2. Copy the **Project ID** (32 letters/numbers — it's public, not a password).
3. In the project → **Domain** (allowlist), add `fuzzies-nine.vercel.app` (and any other address you use, e.g. your own domain).
   This lets wallets show people a green "verified" Fuzzies address and stops copycat sites from using your ID.
4. Vercel → project **fuzzies.** → Settings → Environment Variables: `VITE_WALLETCONNECT_PROJECT_ID` = the Project ID → **Redeploy**.

Licence: WalletConnect's SDK is under the *WalletConnect Community License* (free up to 500 wallets a month, then a paid
licence from Reown). The required notice is in Settings → About and the licence is served at `/licenses/walletconnect.md`.
Optional: `WALLET_RPC_<chainId>` (e.g. `WALLET_RPC_8453`) = one or two comma-separated network URLs of your own (Alchemy,
Infura…) for checking smart wallets; by default each network uses two free public providers.

- **Profile → Crypto wallets → Connect a wallet** links a wallet to the logged-in account (the password is asked again,
  and the owner gets an email "A wallet was linked" when email is set up); **Log in → Continue with a wallet** then logs in
  with it on any device. Up to 5 wallets per account; a wallet belongs to one account.
- Works with every Ethereum wallet that's installed in the browser (they announce themselves through EIP-6963: MetaMask,
  Coinbase Wallet, Trust Wallet, Crypto.com Onchain, OKX, Phantom, Rabby, Rainbow, Brave…). Below that, **popular
  wallets** (`TOP_WALLETS` in `src/core/wallet.ts`: MetaMask, Coinbase, Trust, Crypto.com Onchain, Robinhood Wallet, OKX,
  Phantom, Rabby, Rainbow) explain the safe way in: on phones the wallet's official "open in app" link (MetaMask, Coinbase,
  Trust, Phantom) or steps for its built-in browser with a **Copy address** button (Crypto.com, Robinhood, OKX…), and
  links to official download pages only. Robinhood Wallet is phone-only, so on a computer it explains the phone steps.
- **Why it's safe:** the wallet only signs a plain-text message ("Sign-In with Ethereum", EIP-4361). No transactions,
  no token approvals, no network switches, no fees, no access to funds — the app only ever asks the wallet for
  `eth_requestAccounts`, `eth_chainId` and `personal_sign`. Fuzzies never asks for a recovery phrase or private key.
  The **server** writes the message (site address, wallet address, purpose, one-time random nonce, 10-minute expiry) and
  keeps it; the signature is checked against that stored copy with audited cryptography (`@noble/curves` +
  `@noble/hashes`), and each message works once. A request from another website is refused (Origin check), wallet
  requests are rate-limited (10 per address / 40 per IP per 10 minutes), and wallet log-in only works for a wallet the
  account owner linked while logged in **and with their password** (wrong passwords count towards the same 10-per-15-minutes
  lock as log-in). Every new link is emailed to the owner. Deleting the account removes its wallets. The site also sends
  security headers (`vercel.json`): no framing by other sites (stops "click-jacking" tricks), nosniff, a strict referrer
  policy and no camera/microphone/payment access.
- **QR codes / wallet apps (WalletConnect):** "Scan QR code with your phone" on computers, "Scan QR code or use a wallet
  app" on tablets, "Use a wallet app" on phones (Robinhood Wallet, Crypto.com Onchain, Rainbow, Ledger Live, Uniswap,
  Zerion, Safe and 500+ more). The session may only use `personal_sign` (checked: nothing else is even requested), it is
  new every time and disconnected straight after; swaps/buy/send/email/social/analytics in its window are off. The SDK
  loads only when someone taps it (not part of the main app download).
- **Smart wallets** (Coinbase Smart Wallet, Safe, Argent, Ambire…): signatures are checked on the network (ERC-1271, and
  ERC-6492 for wallets not deployed yet) with viem — read-only, no transaction, no fee — on Ethereum, Base, Optimism,
  Arbitrum and Polygon. **Two independent providers must both confirm** (and must really be on that network); if one is
  unreachable the sign-in is refused with "try again", never let through.
- Code: `api/_lib/wallet.ts` (message + signature check, `verifySmartWallet`), `src/core/walletconnect.ts`, `api/auth.ts` (`wallet.challenge` / `wallet.verify` /
  `wallet.list` / `wallet.unlink`), tables `fz_wallets` + `fz_wallet_nonces`; app: `src/core/wallet.ts`,
  `src/ui/walletPicker.ts`, Profile card and log-in button.

## Crypto payments (buy Fuzzies, $0.50 wallet activation)

Off until you add your own receiving addresses. Money goes **straight from the buyer's wallet to yours** — Fuzzies never
holds funds or keys. In Vercel → project **fuzzies.** → Settings → Environment Variables (Production *and* Preview), then Redeploy:

| Setting | What it is |
|---|---|
| `PAY_EVM_ADDRESS` | Your Ethereum address (0x…, from MetaMask / Coinbase Wallet…). Receives ETH and USDC on **Base** and **Ethereum**. |
| `PAY_SOL_ADDRESS` | Your Solana address (from Phantom / Solflare…). Receives SOL and USDC on Solana. Make sure it has a USDC account (receive any USDC once). |
| `WALLET_FEE_USD` | Optional. The one-time wallet activation fee, default `0.50`. `0` turns it off (wallets are then free and get the gift straight away). |
| `WALLET_RPC_8453`, `WALLET_RPC_1`, `SOLANA_RPC` | Optional. Your own network providers (e.g. Alchemy/Helius URLs, two comma-separated) instead of the free public ones. |

Only the **public** address is needed — never put a recovery phrase or private key anywhere. Each network turns on when its
address is set (e.g. only `PAY_EVM_ADDRESS` = Base + Ethereum only).

- **Packs** (in `api/_lib/pay.ts` → `PACKS`): 100 Fuzzies $0.99 · 550 $4.99 · 1,200 $9.99 · 3,000 $19.99. Shown in Rewards → *Get
  more Fuzzies* and from the Fuzzies counter in Fuzzies Land.
- **Wallet activation:** a newly linked wallet pays the fee once (ever, per wallet); then it can log in, and a **gift box**
  with 100 Fuzzies appears (double-click / double-tap to open). Unlinking and relinking doesn't charge or gift again.
- **How a payment is checked:** the server sets the price (USD → coin; ETH/SOL prices from Coinbase + Kraken, which must agree
  within 3%; USDC 1:1) with a unique sub-cent "fingerprint", valid 30 minutes; then it reads the blockchain itself through two
  providers: right coin, right amount to the cent, to your address, after the quote, confirmed (Base 5 blocks, Ethereum 3,
  Solana finalized). Each transaction pays one payment only. Solana uses Solana Pay (a one-time reference in the payment).
  Bought Fuzzies are added on the server (`fz_credits`) and sync to every device.
- **The fine print you should know:** crypto payments are final (no chargebacks — refunds are manual, from your wallet).
  Selling a game currency is income: keep records (Rewards → payments are in `fz_payments`) and check tax/consumer rules
  where you live. The app says Fuzzies have no cash value. App stores (if Fuzzies is ever shipped as an iPhone/Android app)
  have their own rules for in-app purchases.
- Tables: `fz_payments`, `fz_credits`, `fz_gifts`, `fz_wallet_rewards` (only a hash of each wallet address); `fz_wallets.active`.
  Code: `api/_lib/pay.ts`, `api/_lib/credits.ts`, `api/pay.ts`; app: `src/core/pay.ts`, `src/ui/paySheet.ts`, `src/ui/shop.ts`,
  `src/ui/giftBox.ts`. Logos: `src/ui/logos.ts` (web3icons, MIT).

## Template library extras (all optional)

The gallery works without any of these. Each one is a Vercel → **Settings → Environment Variables** entry, then **Redeploy**.

| Setting | What it switches on |
|---|---|
| `ADMIN_EMAILS` | Who may **publish templates** — the login emails of template managers, separated by commas (e.g. `you@gmail.com`). They get **Download → Publish as template** in the editor and **Manage templates** in Templates (publish, unpublish, edit, delete). Everyone else just sees and uses published templates. Managers can also be added in the database without a redeploy: `insert into fz_admins (user_id) select id from fz_users where email = '…';` |
| `PEXELS_API_KEY` | **Pexels** photos in the editor's Photos search (free key: pexels.com/api → *Your API key*). Without it, search uses **Openverse** (no key; only CC0, public-domain and CC BY photos — CC BY ones carry a credit the app shows and lets people copy). |
| `ANTHROPIC_API_KEY` + `ANTHROPIC_MODEL` | **Draft with AI** in Manage templates: Claude writes the wording for new templates and the app lays it out. Needs a key from console.anthropic.com (paid per use) and a Claude model id from Anthropic's model list. Both must be set; without them the AI button doesn't appear. |

Why not Unsplash's own API? Its rules require showing photos from Unsplash's servers (hotlinking), but a design must keep
its photos inside the file to work offline and export, so the app only uses Unsplash photos through Lorem Picsum's
free browse list.

## Troubleshooting

- **Health check:** open `https://<your-site>/api/auth?check` in a browser.
  `{"ok":true,"database":"connected",…}` means the backend and Neon are working.
- **"Something went wrong on our side … (ref: …)"** — the ref says where it failed and the database/network error code
  (never anything secret). Common ones:
  - `setup SELF_SIGNED_CERT_IN_CHAIN` — the provider signs its certificate with its own authority (Supabase does).
    Fixed in code: with `sslmode=require` (the usual) the app stays encrypted without public verification. To verify it
    too, paste the provider's CA certificate into a Vercel environment variable `DATABASE_CA` and redeploy.
  - `setup 28P01` — wrong database password: reconnect Neon in Vercel → Storage, then redeploy.
  - `setup 3D000` — the database name doesn't exist.
  - `setup ENOTFOUND` / `ECONNREFUSED` / `ETIMEDOUT` — the database address is wrong or unreachable.
  - `setup 42501` — the database user isn't allowed to create tables (use the owner role Neon gives you).
- Full details are in Vercel → your project → **Logs** (search for "db" or "health check").
- Connections that Neon drops while it sleeps are retried once automatically.
