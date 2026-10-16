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

- **Profile → Account & login** shows every way into the account — email + password and each linked wallet (with the one
  connected in this browser marked "Connected now") — with **Connect a wallet**, **Switch wallet**, **Disconnect** (forgets
  the wallet in this browser only) and **Remove** (unlinks it as a log-in method). Linking asks for the password again (the
  owner gets an email "A wallet was linked" when email is set up); **Continue with a wallet** on the log-in / sign-up screen
  then logs in with it on any device. Up to 5 wallets per account; a wallet belongs to one account.
- **A wallet nobody has linked yet** can **create a new account** (username; email + password optional but recommended,
  and a guest's progress on that device can come along) or be **linked to an existing account** after logging in to it with
  email + password. **Wallet-only accounts** (no email/password) can add them later from Profile → Account & login; until
  then their last wallet can't be removed (it would leave no way in). **Switching accounts** never happens silently: if
  the wallet belongs to another account than the one this device is signed in to, the app says whose it is and asks; the
  current account's last changes are uploaded first and the accounts are never merged.
- **Re-authentication** for sensitive changes (linking or removing a wallet, changing email or password): the password,
  or — for wallet-only accounts — a fresh signature from a wallet already linked. A logged-in device alone is never enough.
  The server hands the browser a 10-minute signed "proof" after each wallet signature (`makeProof` in `api/_lib/auth.ts`)
  so the next step (create / link / confirm) doesn't need a second signature; a proof is never a log-in by itself.
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
  `wallet.login` / `wallet.signup` / `wallet.attach` / `wallet.list` / `wallet.unlink` / `account.credentials`), tables `fz_wallets` +
  `fz_wallet_nonces` (`fz_users.email` and `pass` may be empty for wallet-only accounts); app: `src/core/wallet.ts` (+ the
  "connected now" note `fz.wallet.now`), `src/core/cloud.ts`, `src/ui/walletPicker.ts`, `src/ui/walletOnboard.ts`
  (new wallet → create / link / switch), Profile → Account & login card, the log-in / sign-up button.

## Crypto payments (buy Fuzzies, $0.50 wallet activation)

**On by default, paying the owner's wallets** (built into `api/_lib/pay.ts` → `OWNER`, all checked: EVM `0x3418…0278` has a valid
EIP-55 checksum, the Solana address is a real ed25519 key, the Bitcoin `bc1q…6tgr` address has a valid bech32 checksum).
Money goes **straight from the buyer's wallet to those addresses** — Fuzzies never holds funds or keys.

Networks and coins: **Base** (USDC, ETH), **Solana** (SOL, USDC — Solana Pay), **BNB Chain** (USDT, USDC — stablecoins only, no
BNB price feed needed), **Robinhood Chain** (ETH; chain id 4663, public RPC `rpc.mainnet.chain.robinhood.com`, one provider —
add a second with `WALLET_RPC_4663`), **Ethereum** (USDC, ETH), **Bitcoin** (BTC to the owner's bc1q address; matched by exact
amount in satoshis through mempool.space + blockstream.info, 1 confirmation; ~10–30 min; a payment is claimed for its order the
first time it's seen, even before it confirms, so a slow one can never be credited to someone else).
To change an address later, set these in Vercel → project **fuzzies.** → Settings → Environment Variables (Production *and* Preview), then Redeploy:

| Setting | What it is |
|---|---|
| `PAY_EVM_ADDRESS` | Your Ethereum address (0x…, from MetaMask / Coinbase Wallet…). Receives ETH and USDC on **Base** and **Ethereum**. |
| `PAY_BTC_ADDRESS` | Optional. A Bitcoin `bc1…` address (receives BTC). |
| `PAY_BNB_ADDRESS`, `PAY_ROBINHOOD_ADDRESS`, `PAY_BASE_ADDRESS`, `PAY_ETHEREUM_ADDRESS` | Optional. A different 0x address for one EVM network. |
| `PAY_SOL_ADDRESS` | Your Solana address (from Phantom / Solflare…). Receives SOL and USDC on Solana. Make sure it has a USDC account (receive any USDC once). |
| `WALLET_FEE_USD` | Optional. The one-time wallet activation fee, default `0.50`. `0` turns it off (wallets are then free and get the gift straight away). |
| `WALLET_RPC_8453`, `WALLET_RPC_1`, `SOLANA_RPC` | Optional. Your own network providers (e.g. Alchemy/Helius URLs, two comma-separated) instead of the free public ones. |

**The app checks the address too** (a second lock in case the server were ever hacked): it only shows payments to the built-in
addresses. If you change an address above, also add the same value as `VITE_PAY_EVM_ADDRESS` / `VITE_PAY_SOL_ADDRESS` /
`VITE_PAY_BTC_ADDRESS` (all 0x networks share one EVM address in the app — per-network EVM addresses aren't supported by the
app check), then Redeploy. Otherwise the app refuses the payment with "This payment request looks wrong (address)".

Only the **public** address is needed — never put a recovery phrase or private key anywhere. Each network turns on when its
address is set (e.g. only `PAY_EVM_ADDRESS` = Base + Ethereum only).

- **Packs** (in `api/_lib/pay.ts` → `PACKS`): 100 Fuzzies $0.99 · 550 $4.99 · 1,200 $9.99 · 3,000 $19.99. Shown in Rewards → *Get
  more Fuzzies* and from the Fuzzies counter in Fuzzies Land.
- **Wallet activation:** a newly linked wallet pays the fee once (ever, per wallet); then it can log in, and a **gift box**
  with 100 Fuzzies appears (double-click / double-tap to open). Unlinking and relinking doesn't charge or gift again. The gift
  only ever comes with a **paid** activation (free gifts could be farmed with throwaway wallets); with no fee, there's no gift.
- **How a payment is checked:** the server sets the price (USD → coin; ETH/SOL prices from Coinbase + Kraken, which must agree
  within 3%; USDC 1:1) with a unique sub-cent "fingerprint", valid 30 minutes; then it reads the blockchain itself through two
  providers: right coin, right amount to the cent, to your address, after the quote, confirmed (Base 5 blocks, Ethereum 3,
  Solana finalized). Each transaction pays one payment only. Solana uses Solana Pay (a one-time reference in the payment).
  Bought Fuzzies are added on the server (`fz_credits`) and sync to every device.
- **Hardening (second safety review):**
  - **Balance guard** (`api/_lib/balance.ts`): a profile can add at most `DAILY_EARN_CAP` Fuzzies a day by itself (default 2,000;
    5,000 on the first save). Bought Fuzzies and gifts are added by the server and don't count. A doctored balance is cut back
    and the app takes the server's numbers.
  - **Checks:** the blockchain is asked at most once every 4 s per payment. Solana looks at 3 signatures at most. Base payments
    count once the block is "safe" (posted to Ethereum, ~1–3 min); Ethereum after 5 blocks.
  - **USDC payments are found by their exact amount** even without a transaction id (e.g. the phone reloaded). For ETH the
    window offers "Already paid? Enter the transaction id".
  - **Smart wallets must pay in USDC:** they're stopped before paying ETH (their ETH can't be matched).
  - **Limits:** 60 quotes per network address per hour; 8 sign-ups per network address per hour; log-in challenges counted
    per wallet *and* network address.
  - **Password reset by email unlinks all wallets** (they can be re-linked with the new password, without paying again).
  - **Test switches** (`PAY_TEST_USDC_*`, `PRICE_TEST_*`) need `PAY_TEST=1` and never work when `NODE_ENV` or `VERCEL_ENV`
    is `production`.
  - **The app double-checks** every payment the server sends (network, coin contract, address, amount) before showing it or
    asking a wallet. Transactions carry the chain id, and the network is re-checked right before sending. The pay button turns
    off before the price expires. Pending payments are remembered per account.
  - **Strict script rule:** `vercel.json` adds `script-src 'self'` (only the site's own files run; the launch screen script is
    `public/splash.js`).
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
| `PEXELS_API_KEY` | **Pexels** photos in the editor's Photos search (free key: pexels.com/api → *Your API key*). Without it, search uses **Openverse** (no key; only CC0, public-domain and CC BY photos — CC BY ones carry a credit the app shows and lets people copy). |
| `ANTHROPIC_API_KEY` + `ANTHROPIC_MODEL` | **The Fuzzy assistant's AI chat** (the blue Fuzzy in the corner of every screen) and **Draft with AI** in Manage templates: Claude writes the wording for new templates and the app lays it out. Needs a key from console.anthropic.com (paid per use) and a Claude model id from Anthropic's model list. Both must be set; without them the AI button doesn't appear and the Fuzzy assistant answers from its built-in guide (clearly labelled, no AI). Optional `ASSIST_MODEL` picks a different (e.g. faster) model for the assistant only. The assistant is rate-limited (15 messages an hour for visitors, 40 for accounts) and sends Claude only the site guide, the current screen and — when logged in — the person's own username, balance, counts and town level, never emails, passwords, payments or wallet details; chats are not stored. |
| `GEMINI_API_KEY` (free) or `GROQ_API_KEY` (free) | **A free brain for the Fuzzy assistant** — no payment needed. Make a key at aistudio.google.com (Google Gemini free tier) or console.groq.com (Groq free tier), paste it in Vercel as `GEMINI_API_KEY` (or `GROQ_API_KEY`) and redeploy: the helper then answers like a real AI agent (any question, design tips, wording ideas, how to use every feature). Used only when the paid `ANTHROPIC_*` pair isn't set. Optional `GEMINI_MODEL` (default: the `gemini-flash-latest` alias; if Google says that model is not found, the server asks Google which Flash models the key can use and picks the newest), `GROQ_MODEL` (default `llama-3.3-70b-versatile`). Free tiers have daily limits; when they run out the helper says so and the built-in guide keeps working. |

**Template managers** (who may publish templates: **Download → Publish as template** in the editor and **Manage
templates** in Templates) are set in the database, not in Vercel — emails aren't verified, so an email list could be
claimed by whoever signs up with that address first. Add one in Supabase → SQL editor:
`insert into fz_admins (user_id) select id from fz_users where email = 'you@gmail.com';` (`ADMIN_EMAILS` is no longer read.)
Optional `ASSIST_HOURLY_CAP` (default 1500) caps the assistant's AI messages for the whole site per hour.

## Fuzzy Crossing weekly boards

Weekly competitions inside the Fuzzy Crossing tab (separate from Fuzzies Land): **Highest score**, **Fastest crossing** (all 5 nests of level 1
without losing a life) and **Survival streak** (most nests in a row without losing a life). One best result per player per board per week; only
signed-in cloud accounts can compete, everybody can read the boards. No new environment variables or services — the tables are created by the
same schema script as everything else (`api/_lib/db.ts`, row-level security on, no public grants).

**Endpoint** `POST /api/crossing { action, … }` (`api/crossing.ts`): `run.start`, `run.finish`, `board.get`, `weekly.status`, `weekly.claim`.
Rules of the checks: `api/_lib/crossing-rules.ts`. Week maths + reward table (shared with the app): `src/crossing/rewards-weekly.ts`.

**Weeks** are ISO weeks in UTC: Monday 00:00 UTC to the next Monday (the week key looks like `2026-W42`). The **server** decides which week it is;
nothing the app sends is believed. A run counts for the week it *finishes* in, so a finished week never changes and its rewards can be handed out
safely. There is nothing to schedule: the new week's boards are simply empty, and the reset needs no job.

**Tables** (all `fz_cx_*`): `fz_cx_runs` (every run: server start/finish times, status `open | finishing | accepted | rejected:<reason> | abandoned`,
flags, the submitted numbers), `fz_cx_scores` (the best result per `(week_key, board, user_id)`; `created_at` = when that best was reached, the
earlier one wins a tie), `fz_cx_claims` (a finished week's reward, once per player per board; the rank is frozen when first claimed),
`fz_cx_players` (emoji + colour or Fuzzy Friend id shown next to a name — never an email), `fz_cx_hits` (request stamps for rate limits only).

**Rewards** by final rank on each board (`TIER_DEFS`): top 1 — trophy, Nebula + Rainbow Fuzzies, Neon trail, Champion pose, 1,000 coins;
top 3 — trophy, Rainbow, Neon trail, Champion pose, 600 coins; top 10 — trophy, Rainbow, Neon trail, Champion pose, 400 coins; top 25 — trophy, Neon
trail, 300 coins; top 100 — trophy, 200 coins. A finished week stays claimable for 8 weeks. The app applies rewards through the Crossing store; coins are
only paid together with a *new* trophy, so claiming twice (or from two devices) never pays twice.

**What the checks do and don't mean.** The game's rules run in the player's browser, so the server can only check that a result is *plausible*:
a signed-in player opens a run (`run.start`: one open run per player, a random secret kept only as a hash), the server times it, and `run.finish`
must fit the server's stopwatch (claimed time ≤ server time + 3 s), the hop rate (0.14 s per hop), the minimum hops per nest (12), the token spawn
rate, a hard score ceiling worked out from the run's own statistics, streak/nest/level consistency and a physical minimum for the fastest time (14 s;
under 20 s is flagged). A run can be finished once and expires after 45 minutes. Limits: 40 runs an hour per player, 20 finishes a minute, 90 board
reads a minute per network address. A determined cheater who reproduces a *believable* run (right pace, right statistics) cannot be told from a
very good player. Runs the checks accept but find odd carry `flags` (see below).

**Operating it**
- *Look at suspicious runs:* `select u.username, r.flags, r.result, r.started_at, r.finished_at from fz_cx_runs r join fz_users u on u.id = r.user_id where r.flags <> '' order by r.started_at desc;`
  and rejected ones: `… where r.status like 'rejected:%'` (the reason code is after the colon).
- *Remove someone from a week's boards:* `delete from fz_cx_scores where user_id = '<id>' and week_key = '2026-W42';` (before the week ends; after it
  ends and rewards were claimed, delete the `fz_cx_claims` rows too if you want them to be able to re-claim nothing — rewards already in a player's save stay).
- *"Reset" a week:* there is nothing to reset. To wipe one week's results for everyone: `delete from fz_cx_scores where week_key = '2026-W42'; delete from fz_cx_claims where week_key = '2026-W42';`
- *Test the roll-over without waiting:* the dev server honours an `x-cx-now: <ms>` request header (or env `CX_NOW`) **only** when `PAY_TEST=1` and the build is not
  a production one; on Vercel production it is always ignored. `tools/crossing/boards-api.mjs` uses it to play whole weeks.

**Tests** (see the file headers): `bash tools/crossing/run.sh boards-check.ts` (week maths, rules, reward table — no database),
`node tools/crossing/boards-api.mjs` (API on a real Postgres + the cloud dev server), `node tools/crossing/boards-browser.cjs` (Playwright:
sign up, play, boards at phone / tablet / computer, collecting rewards).

## Security notes

- Every `fz_` table has row-level security on with no policies and no grants for Supabase's `anon` / `authenticated`
  roles (set automatically on every cold start): nothing is reachable through Supabase's public REST API. The app
  connects as the tables' owner, which isn't affected.
- Limits per account: one design/upload ≤ 5 MB, ≤ 300 MB and 20,000 rows of each kind, profile ≤ 3 MB.
- Sign-in guessing: 10 wrong passwords per email and 30 per network (IPv6 counted per /64) in 15 minutes; changing the
  password also locks after 10 wrong tries. Changing email + password logs out every other device. Deleting an
  account needs the password (or a linked wallet's signature).
- Browser rules (`vercel.json`): strict Content-Security-Policy (scripts only from the site; WebAssembly allowed for the
  3D model decoder), HSTS, no framing, `Cross-Origin-Opener-Policy: same-origin-allow-popups` (wallet pop-ups keep working).
- Designs from share links are checked when opened: pictures must be embedded (`data:image/…`), credit links must be
  `https://`, colours can't carry CSS like `url(…)`, and links can't unpack to more than 20 MB.

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
