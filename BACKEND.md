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
