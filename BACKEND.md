# Turning on cloud accounts (log in on any device)

Fuzzies works on its own with everything saved on the device. Connect a free **Supabase** project and it
gets real accounts: people sign up with email + password, and their designs, photos, Fuzzies, unlocks and
settings sync to every phone and computer they log in on.

Nothing in the code needs to change. You only give the app two public values: the project URL and the public key.

## 1. Create the database (about 5 minutes)

**Easiest, if the site is on Vercel:** Vercel project → **Storage** → **Create Database** → **Supabase** → follow the steps.
Vercel then adds the Supabase settings to the project for you, so you can skip step 3.

**Or directly:** sign up at <https://supabase.com> → **New project** (the free plan is fine) → pick a name and a region near your users.

## 2. Add the Fuzzies tables

Supabase dashboard → **SQL Editor** → **New query** → paste everything from [`supabase/schema.sql`](supabase/schema.sql) → **Run**.
This adds the tables for profiles, designs and photos, and the privacy rules that make sure everyone can only see their own things.
It's safe to run again.

## 3. Give the app its two keys (skip if Vercel added them)

Supabase → **Project Settings** → **API** (called **Data API** and **API Keys** in newer dashboards): copy the **Project URL** and the **anon / publishable** key.
Then, in Vercel → your project → **Settings** → **Environment Variables**, add:

| Name | Value |
|---|---|
| `VITE_SUPABASE_URL` | the Project URL |
| `VITE_SUPABASE_ANON_KEY` | the anon / publishable key |

Never use the **service_role** or **secret** key here: those must stay private. The app only reads the URL and the public key.
The names Vercel's integration uses (`SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, …) work too.

For local development, put the same two lines in a file called `.env.local` (it's ignored by git).

## 4. Tell Supabase where the app lives

Supabase → **Authentication** → **URL Configuration**:
- **Site URL**: your live address, e.g. `https://fuzzies.vercel.app`
- **Redirect URLs**: add the same address, plus `http://localhost:5173/**` for testing on your computer

This is where the "confirm your email" and "reset password" links send people back to.

## 5. Emails

Supabase can email people a link to confirm their address (on by default) and to reset a forgotten password.
**Its built-in email service only sends a few emails an hour and is meant for testing.** Before launching, either:
- add your own email sender under **Authentication** → **Emails** → **SMTP Settings** (e.g. Resend, Postmark or SendGrid; most have a free tier), or
- turn off **Confirm email** (**Authentication** → **Sign In / Providers** → **Email**) so people can start right away.

## 6. Redeploy

Redeploy on Vercel (the keys are baked in at build time). The welcome screen now says
"…saved privately in your account — log in on any phone or computer", and **Profile** shows a **Sync** card.

## How it behaves

- **Offline first:** everything is still saved on the device first, then sent to the cloud a moment later, or when the device is back online.
- **Two devices at once:** each design keeps its newest version. The account is merged, so Fuzzies earned on the phone and an unlock on the laptop both count.
- **Guests and old on-device accounts:** Profile → **Save your account** moves their designs and Fuzzies into a cloud account.
- **Signing out** removes the copy on that device once everything is uploaded (good for shared computers).
- **Delete account** removes the login and every row from the cloud, and the copy on the device.

## For developers

- Code: `src/core/supabase.ts` (connection), `src/core/cloud.ts` (sign up / log in / claim / reset / delete),
  `src/core/sync.ts` (queue + pull/push), `src/core/merge.ts` (three-way account merge).
- Tables: `profiles` (one JSON `data` column per account + `updated_at` version), `designs`, `uploads`
  (`data` JSON, `deleted` tombstones, `updated_at`). Row-level security: `auth.uid()` must own the row.
- A profile save only overwrites the version this device last saw (`updated_at` check); on a clash the app merges and retries.
- Testing locally: `npx supabase start`, run `supabase/schema.sql` against `postgresql://postgres:postgres@127.0.0.1:54322/postgres`,
  then `VITE_SUPABASE_URL=http://127.0.0.1:54321 VITE_SUPABASE_ANON_KEY=<anon key from supabase start> npm run dev`.
