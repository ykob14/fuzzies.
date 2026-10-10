# Fuzzies — build progress & handoff

> **For AI agents:** read this whole file before changing anything, then follow `AGENTS.md`.
> When you finish a session, update **Status**, **Build log** and **Next up** below, and commit it with your work.

_Last updated: 2026-10-10 (session 2) · by Claude Code · latest work on branch `claude/fuzzies-design-app-jwv4tu`_

---

## 1. What Fuzzies is

**Fuzzies** — tagline **"Dream it fuzzy. Make it sharp."** — is a Canva-style design app for phones and computers,
with a built-in Frogger-style game, **Fuzzy Crossing**. In the game you collect **Fuzzies** (tokens) that unlock
premium templates, graphics, stickers, fonts, text effects, app themes and game skins. The owner's goals:
super professional *and* easy to use, lots of creative freedom, easy sharing/saving, and "cute stuff" that
keeps people coming back (the mascot, the game, missions).

- **Repo:** https://github.com/ykob14/fuzzies. (note the trailing dot in the repo name) — `main` is the live branch.
- **Owner:** GitHub `ykob14`. Not a developer: explain things in plain words, show screenshots, keep replies short.
- An older, outdated copy lives in the `fuzzies/` folder of `ykob14/cap-off` (branch `claude/fuzzies-design-app-jwv4tu`). **Ignore it** — this repo is the source of truth.

## 2. Status

| | |
|---|---|
| **Current state** | All features below are built, type-check, build cleanly and were browser-tested. |
| **In progress** | Nothing half-done in code. **Cloud accounts are built and tested against a local Supabase, but not connected to a real Supabase project yet** — the owner has to create one (see `BACKEND.md`); they offered to help with Vercel. |
| **Branches** | `claude/fuzzies-design-app-jwv4tu` is **ahead of `main`** (game card, rewards "Use", cloud sync). Ask the owner before merging to `main`. |
| **Deploy** | Vercel-ready (`vercel.json`). Not deployed yet as far as we know. Cloud keys are read at build time (`vite.config.ts`). |

## 3. Owner preferences (learned — respect these)

- **Colours:** ONE consistent brand colour — raspberry **`#d6336c`** (dark mode `#ff6b9a`) on calm neutrals
  (ink `#18171c`, grey bg `#f6f5f2`, white cards). **No purple UI, no rainbow/multi-colour gradients** — the owner
  called the old purple-gradient look "slopish" and colourful palette options "too much". Template *content* may be colourful.
- **Logo:** solid lower-case **"fuzzies"** wordmark (Fredoka 700, ink colour) + the living 3D mascot beside it.
- Loves **cute, playful touches** (mascot winks, giggles, game intro). Wants things **realistic** where it fits (3D game).
- Wants **everything saved to GitHub** after each chunk of work. Commit + push often.
- The owner approved merging to `main` on 2026-10-10. For future work: build on a branch, push it, then ask
  (one line) before merging to `main` unless the owner has already said to.
- Do not open pull requests unless asked.
- Wants **real accounts that work on every device** (asked for a backend: "people can log in and register and have all
  their data synced"). Built with Supabase; the owner will help set up hosting (Vercel) when ready.
- Owner's own feedback (session 2): loved the giggle/tickle, the cars' graphics, the unlockable themes and accent colours;
  thought the app is "close to a first version". Asked for: no scrolling on the game instructions (done), unlocked
  rewards should be usable straight away (done), test on mobile (done: phone layouts checked), device sync (done, needs keys).

## 4. How to run, build and test

```bash
npm ci
npm run dev        # http://localhost:5173 (also on LAN for phones)
npm run build      # tsc --noEmit + vite build → dist/
npm run preview    # serve dist/
```

- There is **no automated test suite** yet. Verification so far = `npm run build` + scripted Playwright runs.
- **Playwright in a cloud container:** Chromium is at `/opt/pw-browsers`; launch with
  `args: ['--enable-unsafe-swiftshader','--use-angle=swiftshader','--ignore-gpu-blocklist']` for WebGL.
  Software WebGL runs the 3D game at ~1 fps, so step the game/intro manually rather than waiting in real time
  (e.g. import `/src/game/view3d.ts` from the Vite dev server and call `view.render(game, dt)` yourself).
- Animated elements (the mascot) never become "stable": take screenshots with `page.screenshot({ clip })`, not `element.screenshot()`.
- **QR codes** were verified by decoding with `jsqr` (installed in a scratch folder, not a project dependency) — versions 1–10 and an exported PNG all decode.
- **Cloud sync testing (local Supabase):** Docker works in the cloud container but the daemon must be started (`sudo dockerd &`).
  Install the CLI in a scratch folder (`npm i supabase@2`), `npx supabase init`, then
  `npx supabase start -x studio,imgproxy,realtime,storage-api,edge-runtime,logflare,vector,supavisor,postgres-meta,mailpit`
  (fewer images; Docker Hub rate-limits). Run `supabase/schema.sql` with psql on port 54322 (user/pass `postgres`), then start Vite with
  `VITE_SUPABASE_URL=http://127.0.0.1:54321 VITE_SUPABASE_ANON_KEY=<ANON_KEY printed by supabase start>`.
  Use two Playwright browser contexts as two devices. Email flows: mailpit couldn't be pulled, so a tiny Node SMTP sink on
  port 2525 + `[auth.email.smtp] host = "172.17.0.1"` (with dummy user/pass) in the local `config.toml` catches the emails.
- **Test gotcha:** if you edit a module while Vite is running, a test's `import('/src/…')` can load a *second copy* of it
  (the app's copy has a `?t=` stamp). Restart Vite before tests that poke at module state.

## 5. Tech & architecture

TypeScript + Vite, **no UI framework** (small `h()` DOM helper in `src/ui/dom.ts`). Three.js only for the game's
3D view and the mascot renders (lazy-loaded chunk). Data is **on-device first**. An optional **Supabase** backend
(turned on by two build-time env vars, see `BACKEND.md`) adds cloud accounts and sync; the Supabase library is a lazy chunk.

```
src/
  main.ts              boot: fonts, router, activity rewards, service worker
  styles.css           all styling; theme tokens are CSS variables (set by core/themes.ts)
  core/
    account.ts         accounts (local ones: PBKDF2-hashed passwords; `cloud: true` ones: Supabase), profile, stats, missions, brand kit, settings
    db.ts              IndexedDB: designs + uploads; `onWrite` hook (sync listens); `quiet` writes = came from the cloud
    supabase.ts        cloud on/off (`cloudEnabled`), lazy Supabase client (PKCE auth), friendly error messages
    cloud.ts           sign up / log in / claim guest-or-local account / sign out / reset / change password / delete
    sync.ts            offline queue + pull/push of profile, designs, uploads; status for the Profile "Sync" card
    merge.ts           three-way merge of two account copies (counters add, bests max, lists union)
    rewards.ts         Fuzzies balance, unlocks, daily bonus, export reward, active-time reward
    missions.ts        daily missions (track(event)) + achievements (checked after every account change)
    sharelink.ts       pack a design into a URL fragment (#/s/<data>), compressed, photos shrunk
    themes.ts          light/dark/system + unlockable themes; computes --on-accent for contrast
    util.ts            helpers (uid, debounce, image downscaling, download…)
  editor/
    types.ts           design model (Design → Page → El union: shape, text, image, graphic, emoji, draw, qr)
    render.ts          canvas renderer shared by editor, thumbnails and exports (WYSIWYG)
    editor.ts          the editor: selection, move/resize/rotate, snapping, grouping, pages, undo, autosave, keys
    panels.ts          left panels (Templates, Elements, Text, Uploads, Stickers, Draw, Background, Layers)
    props.ts           right inspector for the selection / page
    colors.ts          colour + gradient picker (brand colours shown first)
    doc.ts             factories, size presets, clone/instantiate
    export.ts / share.ts  PNG/JPG/PDF/.fuzzies export, share sheet, share links
    shapes.ts, qr.ts   shape paths; QR encoder (byte mode, level M, v1–10)
  content/             templates (28), art packs, sticker packs, fonts (Google Fonts), text styles
  game/
    crossing.ts        Fuzzy Crossing RULES only (lanes, collisions, scoring) + View interface + Fx events
    view3d.ts          realistic Three.js view (sky, shadows, water, fur, intro cinematic)
    view2d.ts          classic 2D canvas view (also the no-WebGL fallback)
    models3d.ts, textures3d.ts  procedural models/textures (no image assets)
    mascot3d.ts        renders the website mascot frames (open / wink / blink / giggle) from the game model
    sound.ts           Web Audio synth (hops, chimes, wink, boing, whoosh, giggle)
  ui/
    app.ts             shell (sidebar / top bar / phone tab bar) + hash router
    mascot.ts          the living mascot component (bounce, shadow, sparkles, wink, tap hop, tickle)
    missions.ts        missions card + badge grid
    screens/           auth, home, templates, projects, editor, play, rewards, profile, settings, shared (link viewer)
```

**Storage keys:** `localStorage` `fz.accounts`, `fz.session`, `fz.sync.<userId>` (pending uploads queue),
`fz.sync.base.<userId>` (last profile copy agreed with the cloud), `fz.claim` (guest/local account waiting for email
confirmation to move to the cloud), plus Supabase's own `sb-…-auth-token`; `sessionStorage` `fz.remix` (pending remix after
sign-up), `fz.try` (what to open when a new design is started from Rewards → Use);
IndexedDB database `fuzzies` with stores `designs` and `uploads` (both indexed by `owner`).

**Cloud (Supabase):** `supabase/schema.sql` — tables `profiles` (id = auth user, `username`, `data` JSON = the account minus
device-only fields, `updated_at` version), `designs` and `uploads` (`data` JSON, `deleted` tombstone, `updated_at`), row-level
security (own rows only), RPCs `username_available(name)` and `delete_my_account()`. Setup steps for the owner: `BACKEND.md`.

## 6. Rules of the codebase (gotchas)

- **Adding an account field:** add it to the `Account` type *and* to `fresh()` in `core/account.ts`; `migrate()`
  merges defaults into old saved accounts (nested objects need their own spread in `migrate()`). It syncs automatically
  (the whole account goes to the cloud minus `hash/salt/id/email/cloud/guest`). If it's a **counter**, `merge.ts` adds both
  devices' changes; if bigger-is-better (like a best score) add its key to `MAX_KEYS`; lists are unioned.
- **Cloud sync:** always write designs/uploads through `db.*` (the sync hooks there). Writes that came *from* the cloud
  pass `quiet = true`. Account changes go through `accounts.update()` as before. `accounts.store()` saves without notifying the queue's
  "changed" check (used for cloud copies). Never put the Supabase service-role/secret key in the app or repo.
- **Adding an element type:** update `types.ts` (El union), `render.ts` (`drawElement`), `doc.ts` (factory + `elLabel`),
  `props.ts` (title map + section), `panels.ts` (add button + `layerIcon`). TypeScript catches most misses.
- **Fonts:** every weight listed in `content/fonts.ts` must really exist on Google Fonts, or the whole CSS request fails.
- **Game:** rules live in `crossing.ts`; views only draw. New visual effects = new `Fx` events → `view.fx()`.
  Objects wrap `OFFSCREEN` cells past the edges so they never pop in.
- **Mission/achievement tracking:** call `track('<event>')` from `core/missions.ts` where the user does the thing.
  Earn toasts for reason `'Fuzzy Crossing'` are suppressed (the game shows its own pop-ups).
- **Theme:** use `var(--accent)`, `var(--on-accent)`, `var(--text)`, etc. Never hard-code purple or gradients in UI chrome.
- **Reduce motion:** `:root[data-motion='reduce']` disables all CSS animations; JS animations check it too.
- **Sound** only plays after a user gesture (browser rule) and respects `settings.sound`.
- Commit messages: imperative subject + bullet body, ending with the attribution lines your tool requires.

## 7. Build log (oldest → newest)

| Commit | What was built |
|---|---|
| `e2b1d9a` | **The app.** Accounts & profile, home, templates gallery (28), My designs, canvas editor (text/shapes/graphics/stickers/photos/drawing, filters, masks, layers, pages, undo/redo, snapping, shortcuts), export PNG/JPG/PDF/project file + phone share sheet, themes (light/dark/system + unlockables), Fuzzy Crossing 2D game, Fuzzies rewards shop, PWA + Capacitor config, responsive phone/desktop layouts. |
| `0db1c66` | **Realistic 3D game** (Three.js): physical sky lighting/reflections, soft shadows, water, swaying grass, glossy vehicles, furry shell-rendered Fuzzy, effects, day → golden hour → dusk per level, follow camera; Classic 2D switch & fallback; rules split from views. |
| `25e6925` | **Game intro:** close-up of the Fuzzy → blink → wink + sparkle → fur shot with bounce → swoop to the board → "Go!". Skippable; works in 2D too. |
| `7476637` | **Daily missions** (3/day + bonus), **23 achievements**, **share links** (view / download / remix without an account), **grouping** in the editor (Ctrl/Cmd+G), **top-10 scores**. |
| `48a3860` | **Living 3D mascot logo:** rendered from the game model; bounces with squash & stretch over a shadow, sparkles & puffs, winks/blinks every few seconds, hop + chime on tap. |
| `319e853` | **Tickle the mascot:** wiggle the mouse over it (feather cursor) or triple-tap → squirm, giggle face, "hehe!" bubbles, synthesised giggle. |
| `6e2ed12` | **One consistent brand colour** (raspberry on neutrals, no gradients), cleaner lower-case wordmark, DM Sans UI font, mascot/game/coin share the pink identity. |
| `25b8a80` | **QR codes** in the editor (verified scannable); brand-coloured avatar choices. |
| `7e2dcbc` | **Brand kit** (Settings): brand colours, heading/body fonts, logo — used in colour pickers, Text, Uploads, Background ("Use my brand colours"). Merged to `main`. |
| `b8dad04` | `PROGRESS.md` / `AGENTS.md` / `CLAUDE.md` handoff files. On `main`. |
| `1ba1820` | Owner feedback: **game start card fits without scrolling** (compact tips, card covers HUD + arrows on small screens); **Rewards → Use** buttons on unlocked items (template opens, packs open a new design at the right panel, font pack adds a sample heading, theme switches, look → Play). Branch only. |
| `53201c2` | **Cloud accounts + device sync** (Supabase): email sign-up/log-in, offline queue, account merge, guest/local → cloud, email confirm + password reset links, sign out clears device copy, delete everywhere; `supabase/schema.sql`, `BACKEND.md`. Tested against a local Supabase (two-device sync, concurrent Fuzzies merge, offline catch-up, privacy/RLS, confirm + reset emails). Branch only. |

Design exploration (not code): a Claude Design canvas with three palette mockups —
https://claude.ai/artifact/QTuketL61NYuYA21APjJn4 (private to the owner). The owner rejected all three as "too much"
and chose a single consistent brand colour instead (see §3).

## 8. Known limitations / not verified

- **Cloud not connected yet:** until the owner creates a Supabase project and sets the two keys, accounts stay on-device.
- Fuzzies balance and unlocks are written by the app itself, so a technical user could edit their own balance via the API
  (fine for now; a server-side rewards check would fix it).
- Photos are stored inside each design's JSON row (and uploads as data URLs), so designs with many photos sync slowly.
  Moving images to Supabase Storage is the next step for big designs.
- Usernames can't be changed after sign-up, and the login email can't be changed in the app yet.
- Supabase's built-in email sender only sends a few emails per hour — set up SMTP or turn off "Confirm email" before launch (see `BACKEND.md`).
- Share links carry the design in the URL; designs with many photos make long links (warned in the UI; hard cap ~400k chars).
- 3D performance and the mascot/intro animations were only checked via screenshots in software WebGL — **not on a real phone yet**.
- The top-scores list on the game-over card was not seen end-to-end in a browser (logic is simple; unit-checked by reading).
- No automated tests, linting or CI.
- Old accounts keep their old avatar colour; old designs keep their old colours (only defaults changed).

## 9. Next up (ideas the owner hasn't prioritised yet)

1. **Connect the real Supabase project + deploy on Vercel with the owner** (follow `BACKEND.md`), then test on two real devices.
   After that: photos → Supabase Storage, real short share links (a `shares` table), online leaderboards, change email/username.
2. More game characters / levels / power-ups; online leaderboards.
3. Editor: curved text, background remover, animation/video export, tables/charts, more templates.
4. A test suite (Vitest for rules: `crossing.ts`, `qr.ts`, `missions.ts`, `sharelink.ts`) + CI build check.
5. Real-device check of performance (low-end Android) and an adaptive-quality switch for the 3D game.
