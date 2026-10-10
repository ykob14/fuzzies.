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
| **In progress** | Nothing half-done in code. **The backend (Vercel functions + Neon Postgres) is built and tested locally, but not hosted yet**: the owner needs to import the repo on Vercel, add a Neon database in Vercel → Storage, and redeploy (`BACKEND.md`). |
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
  their data synced"). They chose **Neon + Vercel** ("setup the backend with accounts and a neon database to work with
  vercel … get it ready for hosting"). A first Supabase version was replaced by this one. The owner will help with Vercel.
- Time reward: owner asked for a random **2–10 Fuzzies every 30 minutes** of using the app (they also said "2-50" once;
  2–10 was their last word, it's one constant: `TIME_BONUS` in `core/rewards.ts`).
- App icon: owner wanted to **change the Fuzzy colour of the phone/desktop app icon** (Settings → App icon).
- Fuzzies Land: soft background music (owner: "soft enough to fit with everything"); playing earns 1–5 Fuzzies per 30 min.
- Fuzzies Land must save progress every time and keep things (construction, crops, workshops) progressing while away;
  look should be realistic, professional, organised and clean.
- Mascot sounds: owner wants it to giggle "he he he ha ha ha" when you move the mouse over it, and sparkle sounds; welcome cards
  should have Fuzzy-themed pictures instead of plain emoji.
- Launch screen: owner asked for an opening like Canva's app (logo on a splash) but with the Fuzzy popping and bouncing, then the name, "very smooth".
- Owner asked to go live on Vercel + Neon and said to merge to `main` ("yes do it for me … i allow"). The owner has since
  deployed the site on Vercel themselves (fuzzies-7w39zxiwx-silver-swan-special.vercel.app); it serves `main`.
- **Fuzzies Land** (tab "Fland"): owner asked for a Township-style town builder with the Fuzzies (shared Township's loading
  screen + a clip of Township's idle pig as reference: "don't use this character, but make it move like that" — i.e. alive
  when idle: breathing, weight shift, blinking, looking around). Earn Fuzzies tokens there; smooth transition to/from the game.
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
- **Backend testing:** any Postgres works. Set `DATABASE_URL=postgresql://user:pass@127.0.0.1:5432/db` and run `npm run dev`
  (Vite serves `/api/*` with the real functions, tables auto-create). In the cloud container Docker works once the daemon
  is started (`sudo dockerd &`); Docker Hub may rate-limit pulls. Use two Playwright browser contexts as two devices and
  poke `/src/core/*.ts` modules via `page.evaluate(import(...))`. `npx vercel build` (CLI in a scratch folder, with a fake
  `.vercel/project.json`) checks that Vercel can build the functions; the built `.vercel/output/functions/api/*.func/api/*.js`
  can be imported in Node and called with a `Request`.
- **Test gotcha:** if you edit a module while Vite is running, a test's `import('/src/…')` can load a *second copy* of it
  (the app's copy has a `?t=` stamp). Restart Vite before tests that poke at module state.

## 5. Tech & architecture

TypeScript + Vite, **no UI framework** (small `h()` DOM helper in `src/ui/dom.ts`). Three.js only for the game's
3D view and the mascot renders (lazy-loaded chunk). Data is **on-device first**. The **backend** is a pair of Vercel
functions in `api/` using a **Neon Postgres** database (`pg` driver); it adds real accounts and sync. Cloud mode switches
on at build time when `DATABASE_URL` exists (see `BACKEND.md`); without it the app is exactly the on-device version.

```
src/
  main.ts              boot: fonts, router, activity rewards, service worker
  styles.css           all styling; theme tokens are CSS variables (set by core/themes.ts)
  core/
    account.ts         accounts (local ones: PBKDF2-hashed passwords; `cloud: true` ones: the backend), profile, stats, missions, brand kit, settings
    db.ts              IndexedDB: designs + uploads; `onWrite` hook (sync listens); `quiet` writes = came from the cloud
    api.ts             cloud on/off (`cloudEnabled`), fetch to /api with the login token, ApiError
    cloud.ts           sign up / log in / claim guest-or-local account / sign out / change password / delete
    appicon.ts         app icon colours; draws icon PNGs into a cache that public/sw.js serves
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
    sound.ts           Web Audio synth (hops, chimes, wink, boing, whoosh, giggle, build, plant, coins)
  land/                Fuzzies Land (Township-style town)
    rules.ts           RULES only: items, goods, crops/workshops/orders/levels/expansions, placement; wall-clock timers
    view3d.ts          Three.js island town: sky, ocean, forest, buildings, growing crops, residents (BFS walking,
                       breathing/blinking/looking idle, speech bubbles), camera pan/zoom/swoop, picking, placement ghost
    models.ts, textures.ts  procedural building/crop/decor models and textures
  ui/
    app.ts             shell (sidebar / top bar / phone tab bar) + hash router
    mascot.ts          the living mascot component (bounce, shadow, sparkles, wink, tap hop, tickle)
    travel.ts          the circle-wipe transition between Fuzzy Crossing and Fuzzies Land (waits for 'fz:scene-ready')
    missions.ts        missions card + badge grid
    screens/           auth, home, templates, projects, editor, play, land, rewards, profile, settings, shared (link viewer)
api/                   Vercel serverless functions (the backend)
  auth.ts              signup / login / me / password / delete / username
  data.ts              profile get/put (version-checked), designs & uploads list/get/put
  _lib/db.ts           pg pool from DATABASE_URL + auto-created tables
  _lib/auth.ts         scrypt passwords, HMAC login tokens, JSON/error helpers
```

**Storage keys:** `localStorage` `fz.accounts`, `fz.session`, `fz.sync.<userId>` (pending uploads queue),
`fz.sync.base.<userId>` (last profile copy agreed with the cloud), `fz.token` (login token for the backend),
`fz.time.<accountId>` (seconds towards the next time bonus), `fz.look` + `fz.splash.frames` (launch screen look); Cache Storage `fuzzies-icon` (your app icon);
`sessionStorage` `fz.remix` (pending remix after
sign-up), `fz.try` (what to open when a new design is started from Rewards → Use);
IndexedDB database `fuzzies` with stores `designs` and `uploads` (both indexed by `owner`).

**Backend (Neon):** tables `fz_users` (email, username, scrypt `pass`, `token_v` — bump to log out all devices),
`fz_profiles` (account JSON minus device-only fields + `updated_at` version), `fz_designs` / `fz_uploads` (PK `(owner, id)`,
`data` JSON, `deleted` tombstone, `updated_at`), `fz_login_fails` (10 wrong passwords / 15 min / email). Every query is
scoped to the token's user. Owner setup steps: `BACKEND.md`.

## 6. Rules of the codebase (gotchas)

- **Adding an account field:** add it to the `Account` type *and* to `fresh()` in `core/account.ts`; `migrate()`
  merges defaults into old saved accounts (nested objects need their own spread in `migrate()`). It syncs automatically
  (the whole account goes to the cloud minus `hash/salt/id/email/cloud/guest`). If it's a **counter**, `merge.ts` adds both
  devices' changes; if bigger-is-better (like a best score) add its key to `MAX_KEYS`; lists are unioned.
- **Cloud sync:** always write designs/uploads through `db.*` (the sync hooks there). Writes that came *from* the cloud
  pass `quiet = true`. Account changes go through `accounts.update()` as before. `accounts.store()` saves without notifying the queue's
  "changed" check (used for cloud copies). Never put `DATABASE_URL`/`AUTH_SECRET` in the app or repo (only the yes/no
  `__CLOUD__` flag reaches the browser). API errors shown to people come from `HttpError` messages only.
- **Adding an element type:** update `types.ts` (El union), `render.ts` (`drawElement`), `doc.ts` (factory + `elLabel`),
  `props.ts` (title map + section), `panels.ts` (add button + `layerIcon`). TypeScript catches most misses.
- **Fonts:** every weight listed in `content/fonts.ts` must really exist on Google Fonts, or the whole CSS request fails.
- **Game:** rules live in `crossing.ts`; views only draw. New visual effects = new `Fx` events → `view.fx()`.
  Objects wrap `OFFSCREEN` cells past the edges so they never pop in.
- **Fuzzies Land:** the town lives in `account.land` (synced; merge keeps the most recently saved town whole). The screen
  works on a copy and saves after every action (`save()`) and on hide/pagehide/leave; rules functions throw `Error`s with
  friendly messages. Everything timed is a wall-clock timestamp (`crop.at`, `queue[].end`, `doneAt`) so progress continues
  while the app is closed. Don't rebuild HUD/panel DOM on a timer (taps get lost) — update text in place.
  New buildings/goods = add to `ITEMS`/`GOODS` in `land/rules.ts` + a model in `land/models.ts` (`modelFor`).
  In dev, `window.__land = { view, state }` lets tests step frames (`view.stop(); view.frame(0.05)`).
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
| `53201c2` | **Cloud accounts + device sync**, first version on Supabase: offline queue, three-way account merge, guest/local → cloud, sign out clears device copy, delete everywhere. Branch only. |
| `923452e` | **Time bonus:** a random 2–10 Fuzzies every 30 minutes the app is open and used (pauses after 5 idle minutes); replaces +1 per 5 minutes. Rewards shows the countdown. |
| `544ffb8` | **App icon picker** (Settings → App icon): 8 Fuzzy colours × 6 backgrounds; icons drawn in the app, served by the service worker for install / Add to Home Screen; new pink-on-ink default icons replace the old purple ones. |
| `98ff876` | **Backend moved to Neon + Vercel** (owner's choice): `api/` functions (auth + data), scrypt passwords, signed tokens, login rate limit, tables auto-create; Supabase removed. Same sync engine. Tested locally against Postgres (two devices, merge, offline, privacy incl. forged token and cross-user overwrite, password change, delete) and with `vercel build`. Branch only. |
| `df837e4` | **Launch screen** (like Canva's): the Fuzzy pops in, bounces with squash & stretch and sparkles, winks, the name "fuzzies" glides up letter by letter, then the tagline; fades into the app (~2.6 s, tap to skip, once per visit, calmer with reduced motion). Lives inline in `index.html` so it shows on the first frame; follows your app-icon colours (`fz.look`, written by `core/appicon.ts`) and uses saved realistic 3D frames (`fz.splash.frames`, written by `ui/mascot.ts`) after the first visit. Branch only. |
| `bf0a29b` | **Fuzzies Land** (new tab "Fland" / sidebar "Fuzzies Land"): 3D island town — Town Hall, Crossing Gate (portal to the game), 4 house types, fields with 5 crops, Bakery/Popcorn Stand/Weaver with 3-slot queues, decor (incl. two paid in Fuzzies), orders board, barn, levels (each pays Fuzzies tokens), land expansions, speed-ups paid in Fuzzies; residents walk, breathe, blink, look at you, hop and chat; tap them to giggle. Circle-wipe transition between game and town; 4 new badges; Home card. Branch only. |
| `f20b0c1` | **Cuter mascot**: moving the mouse over the Fuzzy tickles it (no wiggle needed); a new syllable-based voice giggles "tee hee hee, ha ha ha" (formant-filtered, chained while you tickle); sparkles chime while hovering, bursts shimmer; sound works on the welcome screen too (audio wakes on the first click/tap — browsers require it). Welcome cards got Fuzzy illustrations (painting, stickers, phone, hopping) with hover animations and a "Tickle me!" hint. |
| `6ff1b6f` | **Fuzzies Land: saving, offline progress, tidier look.** Buildings now take real time to construct (construction site with scaffolding, crane and a countdown; keeps going while you're away; tap to open; speed up with Fuzzies). "While you were away…" card + a ✨ Collect-all button. Saves after every action and also on leaving/hiding/closing; a "✓ Saved" sign; adopts a newer town from another device; camera position remembered; last saves use `keepalive`. Tidy starter town (crossing streets, hall + gate corner, cottages facing the street, farm corner, free corner), Road item, wooden field edging, contact shadows, smoother lawn, thinner forest. Fixes: HUD/panels no longer rebuild every second (lost taps), negative first-frame time step (camera swoop stuck on slow phones; also in Fuzzy Crossing). |
| _(music)_ | **Soft background music in Fuzzies Land** (`game/music.ts`: live Web Audio — warm pad chords Fmaj7–Dm7–Bbmaj7–C, gentle bass, wandering music-box melody, light reverb; fades in/out; 🎵 button in town + Settings switch, `settings.music`; starts on the first tap if the browser blocked audio). **Play bonus:** 1–5 Fuzzies for every 30 minutes playing Fuzzy Crossing or Fuzzies Land (`PLAY_BONUS` in `core/rewards.ts`, shown in Rewards). |

Design exploration (not code): a Claude Design canvas with three palette mockups —
https://claude.ai/artifact/QTuketL61NYuYA21APjJn4 (private to the owner). The owner rejected all three as "too much"
and chose a single consistent brand colour instead (see §3).

## 8. Known limitations / not verified

- **Not hosted yet:** until the owner deploys on Vercel with a Neon database, accounts stay on-device.
- **No emails yet:** no password reset or email confirmation (needs an email service such as Resend). The "Forgot your
  password?" link explains the workaround (change it from a device that's still logged in).
- Fuzzies balance and unlocks are written by the app itself, so a technical user could edit their own balance via the API
  (fine for now; a server-side rewards check would fix it).
- Photos are stored inside each design's JSON row (and uploads as data URLs), so designs with many photos sync slowly.
  A single design upload is capped at ~4.5 MB by Vercel; bigger ones are skipped with a message. Vercel Blob for photos is the fix.
- Usernames can't be changed after sign-up, and the login email can't be changed in the app yet.
- App icon: phones read the icon when Fuzzies is added to the home screen, so a change shows after re-adding it.
- Share links carry the design in the URL; designs with many photos make long links (warned in the UI; hard cap ~400k chars).
- 3D performance and the mascot/intro animations were only checked via screenshots in software WebGL — **not on a real phone yet**.
- The top-scores list on the game-over card was not seen end-to-end in a browser (logic is simple; unit-checked by reading).
- No automated tests, linting or CI.
- Old accounts keep their old avatar colour; old designs keep their old colours (only defaults changed).

## 9. Next up (ideas the owner hasn't prioritised yet)

1. **Deploy on Vercel + add Neon with the owner** (follow `BACKEND.md`), then test on two real devices.
   After that: password-reset emails (Resend), photos → Vercel Blob, real short share links (a `shares` table),
   online leaderboards, change email/username.
2. More game characters / levels / power-ups; online leaderboards.
3. Editor: curved text, background remover, animation/video export, tables/charts, more templates.
4. A test suite (Vitest for rules: `crossing.ts`, `qr.ts`, `missions.ts`, `sharelink.ts`) + CI build check.
5. Real-device check of performance (low-end Android) and an adaptive-quality switch for the 3D game.
