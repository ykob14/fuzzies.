# Fuzzies — build progress & handoff

> **For AI agents:** read this whole file before changing anything, then follow `AGENTS.md`.
> When you finish a session, update **Status**, **Build log** and **Next up** below, and commit it with your work.

_Last updated: 2026-10-13 · by Claude Code · branch `claude/fuzzies-design-app-jwv4tu` is ahead of `main` by **crypto wallets + crypto payments** (awaiting the owner's OK to go live)_

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
| **Current state** | All features below are built, type-check, build cleanly and were browser-tested. **Crypto wallets** (link MetaMask/Coinbase/Trust/Crypto.com/Robinhood/OKX/Phantom/any Ethereum wallet in Profile, log in with it) are on the branch only — ask the owner before merging to `main`. WalletConnect QR + smart wallets are built (owner created the Reown project; `VITE_WALLETCONNECT_PROJECT_ID` must be in Vercel for Production + Preview). **Crypto payments** (Fuzzies packs, $0.50 one-time wallet activation, 100-Fuzzies gift box) are built and switch on when the owner sets `PAY_EVM_ADDRESS` / `PAY_SOL_ADDRESS` (BACKEND.md → Crypto payments). |
| **In progress** | Nothing half-done in code. **Password-reset email is not working on the live site yet**: Resend answered 401 to the key pasted in Vercel (twice), so either the value got mangled when pasted or the redeploy hadn't happened. The app now names Resend's reason plus a safe key hint (`key re_…36`) in the error, and failed sends no longer count towards the 3-per-hour limit — ask the owner for the new `ref:` text. |
| **Branches** | `main` = `1965633` (live); the branch adds crypto wallets on top. Earlier: the owner said to test again and put it live ("Done another test and post and add to GitHub … save everything everyplace") on 2026-10-13. Live now: Christmas, Hanukkah & Passover (60 templates), text effects & curved text, multicultural collections (9 art collections, themed template system, 175 templates in 71 topics, 6 new categories, multilingual search). **Rollback points:** `ae74508` (Halloween, previous live), `28b65cc`. Keep working on the branch and ask before the next merge. |
| **Deploy** | Two Vercel projects (team `silver-swan-special`) both build `ykob14/fuzzies.` `main`: **`fuzzies.` → fuzzies-nine.vercel.app has the database (cloud accounts) — this is the real one**; `fuzzies.-ekp9` → fuzzies-ekp9.vercel.app has no database (on-device mode). The database is a Supabase Postgres (`supabase-fuchsia-tree`, provider-signed certificate — handled by the sslmode fallback). `RESEND_API_KEY` was added in Vercel by the owner (value rejected so far, see above). Claude's Vercel connector still gets 403 for this team scope; the Supabase connector works (read queries; a delete timed out). |

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
- **Fuzzies Land quality bar** (owner, end of session 2): "don't restart — improve the existing game", aim for the polish of
  a high-quality mobile city-builder with **its own identity**. Priorities in order: visual quality → consistent art direction
  → gameplay working → UI → camera/island → QA at all sizes. Wanted to **agree on the target look before adding features**,
  and asked for a status + next-milestone (contents and cost) write-up. The agreed-upon style lives in **`ART.md`** — every
  new Land asset must follow it.
- Fuzzies Land, later the same day: liked the new interface; asked for a living town (Fuzzies walking the streets, visiting
  houses, farming), proportionate player-placeable roads instead of the giant X, no road touching the pond, richer
  buildings/environment (Township-level polish but original), a game-like coloured toolbar that can be hidden, collapsible
  side panels, no frog icon (everything belongs to the Fuzzies universe), no expensive blur, and save compatibility.
  Wants screenshots + a short report before anything goes to `main`.

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
    cloud.ts           sign up / log in / claim guest-or-local account / sign out / change password / delete; link / list / unlink wallets, wallet log-in
    wallet.ts          browser wallets: EIP-6963 discovery (+ window.ethereum fallback), phone deep links, connect, personal_sign
    walletconnect.ts   WalletConnect (lazy SDK): QR on computers/tablets, wallet apps on phones; personal_sign-only session (pay mode: eth_sendTransaction + chain switch only), disconnect after
    pay.ts             crypto payments app side: config/quote/check, sendEvmPayment (switch to Base/Ethereum, exact transfer), pending-payment resume, gifts
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
    model.ts           the versioned document format (DOC_VERSION = 2), its invariants, and migrateDesign() (upgrade + repair)
    preview.ts         full-screen Preview and the top bar's Download menu
    photos.ts          Photos panel source: search via api/assets (Pexels or Openverse) + Lorem Picsum browse; credits
    publish.ts         "Publish as template" form (template managers only; lazy)
    render.ts          canvas renderer shared by editor, thumbnails and exports (WYSIWYG)
    editor.ts          the editor: selection, move/resize/rotate, snapping, grouping, pages, undo, autosave, keys
    panels.ts          left panels (Templates, Elements, Text, Uploads, Stickers, Draw, Background, Layers)
    props.ts           right inspector for the selection / page
    colors.ts          colour + gradient picker (brand colours shown first)
    doc.ts             factories, size presets, clone/instantiate
    export.ts / share.ts  PNG/JPG/PDF/.fuzzies export, share sheet, share links
    shapes.ts, qr.ts   shape paths; QR encoder (byte mode, level M, v1–10)
  content/             classic templates (28), art packs, sticker packs, fonts (Google Fonts), text styles
    library/           the template library (lazy chunk):
      taxonomy.json    DATA: categories › topics (keywords, palettes, starter texts). Add topics here — no code.
      layouts.ts       14 layout archetypes (split, badge, photo, ticket, matchup, editorial, burst, stack, collage,
                       certificate, bignum, confetti, circle, slides) × 8 formats; text sized by measuring the real font
      palettes.ts      28 palettes + 9 font "voices" (free Google fonts)
      catalog.ts       TemplateMeta (metadata only) for library + classic + published templates; documents built/
                       downloaded lazily (templateDoc / loadTemplateDoc); draftDesigns() for AI wording
      search.ts        search (prefix, typo, synonyms, title weight, usage boost), facets, related()
      usage.ts         real usage: this device's recent list + server counts (Trending = 7 days, Popular = all time)
      remote.ts        published templates from the server into the catalog; server search when there are more
      admin.ts         template-manager rights (server decides) + manager API (save/publish/delete/AI draft)
      collections/      hand-made collections: kit.ts (composition kit: art/scene/text/box/pill/below, Use types,
                       buildCollectionDoc), index.ts (COLLECTION_SETS + fonts), halloween/christmas/hanukkah/passover.ts (20 each);
                       themed.ts = the THEMED TEMPLATE SYSTEM (Look + Words + reusable layouts hero/split/arch/framed/
                       poster/minimal/medallion/photo); islamic/jewish/christian/cultural/baby/milestones/events.ts = ThemedSets
    assets/            the asset library: index.ts = registry (tags, kind, licence, author) + lazy collections
                       (ensureArt, searchAssets); draw.ts = shared drawing helpers (colour, svg, asset(), backgrounds(),
                       stars/snow/bokeh/mist/hills, flame, gift, lightString, davidStar, blossom, frame);
                       collections/ halloween (hw-), christmas (xm-), hanukkah (hk-), passover (ps-), islamic (is-),
                       jewish (jh-), christian (cr-), indian (in-), baby (bb-), asian (as-), world (wd-), milestones (ms-),
                       events (ev-): original SVG illustrations + scene backgrounds × 4 page shapes (-sq/-po/-st/-ls)
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
    environment.ts     the island: terrain slab + beach, shader water (shore foam), sky dome, instanced swaying forest,
                       grass tufts/wildflowers, rocks, clouds; PALETTE; islandRadius()
    models.ts, textures.ts  procedural building/crop/decor models (PAL palette, plinth/gableRoof/windowOn/doorOn helpers) and textures
  ui/
    app.ts             shell (sidebar / top bar / phone tab bar) + hash router
    mascot.ts          the living mascot component (bounce, shadow, sparkles, wink, tap hop, tickle)
    landIcons.ts       Fuzzies Land's own "sticker" icon set (coin, star, hammer, crate, barn, music, gate…)
    libthumbs.ts       lazy template previews (IntersectionObserver, one per frame, waits for fonts, cached)
    templateManager.ts "Manage templates" window (list, publish/unpublish, edit, delete, Draft with AI)
    paySheet.ts        payment window: choose coin → exact amount + address (+ Solana Pay QR) → wallet → confirming → done
    shop.ts            Fuzzies packs (Rewards "Get more Fuzzies", Fuzzies Land counter → openShop)
    giftBox.ts         gift box overlay (double-click/tap → Fuzzy pops out, sounds, +Fuzzies via gift.open); checkGifts()
    logos.ts           wallet/coin/network logos (web3icons, MIT, generated)
    walletPicker.ts    "Connect a wallet" window: password (when linking), installed wallets, popular wallets (TOP_WALLETS) with official
                       open-in-app links or in-app-browser steps + Copy address, official download pages; safety note
    travel.ts          the circle-wipe transition between Fuzzy Crossing and Fuzzies Land (waits for 'fz:scene-ready')
    missions.ts        missions card + badge grid
    screens/           auth, home, templates (lazy wrapper → library.ts gallery), projects, editor, play, land, rewards, profile, settings, shared
api/                   Vercel serverless functions (the backend)
  auth.ts              signup / login / me / password / delete / username / forgot / reset / wallet.challenge|verify|list|unlink
  data.ts              profile get/put (version-checked), designs & uploads list/get/put
  templates.ts         published template catalog (list/search/doc/thumb, public + CDN-cached), usage stats,
                       template-manager actions (ADMIN_EMAILS), AI wording (ANTHROPIC_API_KEY + ANTHROPIC_MODEL)
  assets.ts            licensed photo search (Pexels if PEXELS_API_KEY, else Openverse CC0/PD/CC BY) + allowlisted image fetcher
  _lib/db.ts           pg pool from DATABASE_URL + auto-created tables
  _lib/auth.ts         scrypt passwords, HMAC login tokens, JSON/error helpers
  pay.ts               pay.config/quote/check/history, gift.list/open
  _lib/pay.ts          prices (Coinbase+Kraken), quotes with unique amounts, on-chain checks (viem ×2 RPCs; Solana Pay ×2 RPCs), fulfil, gifts
  _lib/credits.ts      applyCredits(): adds server-side Fuzzies to fz_profiles in one statement (sync merges them)
  _lib/wallet.ts       Sign-In with Ethereum: server-written message, signature recovery (@noble/curves + @noble/hashes), EIP-55, Origin check
```

**Storage keys:** `localStorage` `fz.accounts`, `fz.session`, `fz.sync.<userId>` (pending uploads queue),
`fz.sync.base.<userId>` (last profile copy agreed with the cloud), `fz.token` (login token for the backend),
`fz.time.<accountId>` (seconds towards the next time bonus), `fz.tpl.used` (recently used templates per account), `fz.look` + `fz.splash.frames` (launch screen look); Cache Storage `fuzzies-icon` (your app icon);
`sessionStorage` `fz.remix` (pending remix after
sign-up), `fz.try` (what to open when a new design is started from Rewards → Use);
IndexedDB database `fuzzies` with stores `designs` and `uploads` (both indexed by `owner`).

**Backend (Neon):** tables `fz_users` (email, username, scrypt `pass`, `token_v` — bump to log out all devices),
`fz_profiles` (account JSON minus device-only fields + `updated_at` version), `fz_designs` / `fz_uploads` (PK `(owner, id)`,
`data` JSON, `deleted` tombstone, `updated_at`), `fz_login_fails` (10 wrong passwords / 15 min / email),
`fz_templates` (published/draft templates: searchable metadata + `search` tsvector, `doc` JSON kept apart, `thumb`, `revision`),
`fz_template_uses` (one row per person per template per day → Trending/Popular), `fz_admins` (template managers set in the database; RLS on),
`fz_wallets` (lower-case address PK → user, cascade delete, `active`), `fz_wallet_nonces` (server-written sign-in messages, single use, 10 min),
`fz_payments` (quotes/payments, exact base-unit amounts unique among open ones, `tx` unique), `fz_credits` (server-added Fuzzies, applied once),
`fz_gifts` (gift boxes), `fz_wallet_rewards` (sha256 of address → fee paid / gift given, kept after unlink). Every query is
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
- **Design documents:** every load path goes through `migrateDesign()` (`editor/model.ts`): opening in the editor, .fuzzies import,
  share links, template instantiation. It is idempotent and never throws away content. If you change the format, bump `DOC_VERSION`,
  add the upgrade step there and keep old fields readable. Templates are copied by `instantiate(src, owner, name, templateId)` — never edited.
  Layer order = array order (index 0 = back); groups are flat (`group` id). `folder` is a My Designs label (syncs with the design).
- **Editor saving:** call `commit()` after a change (undo step + autosave). Saves are serialized in `persist()`; `saveNow()` is used
  for Ctrl/Cmd+S and tab hide/close. The status chip (`setStatus`) shows Saving / Saved / Not saved · Retry.
- **Editor rendering:** while moving/resizing/rotating, `dragLayers()` caches the layers below/above the selection; pan/zoom gestures use
  `gesturePicture()`. Anything that changes pixels *during* a drag must be part of the selection or it won't show until the drag ends.
  Editor view prefs (grid on/snap/size) live in `localStorage` `fz.ed.view`; the inspector open state in `fz.ed.inspector`.
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
  **Art:** follow `ART.md` (palette `PAL` in `land/models.ts`, `PALETTE` in `land/environment.ts`; build new buildings from
  the helpers `plinth`, `gableRoof`, `windowOn`, `doorOn`, `cornerTrims`, `chimney`, `bush`). Land is **full screen** (the router
  renders it without the app shell) with its own fixed cream UI tokens (`--lc`, `--link`, `--lacc`… on `.page.land`, which
  also overrides `--surface`/`--text` so panels look the same in dark mode). Shop cards show 3D pictures from
  `view.thumbnail(itemId)` (rendered once into a corner of the canvas, cached as PNG data URLs).
  Rules can be checked without a browser: `node --experimental-strip-types` on a copy of `land/rules.ts` (it has no imports).
  **Placement:** use `placeProblem()` (returns the reason) / `canPlace()`; `Placed.rot` is 0–3 (odd = width/depth swapped,
  model rotation `-rot·90°`, front door faces +z at rot 0). Items with `water: true` keep a grass tile from roads.
  **Layout migration:** `migrateLand` runs `tidyOldStarter` once (`layout` field → 2) — only when the first-version starter
  streets are completely untouched; player-built things never move. **Roads** are drawn by `view.buildRoads()` (asphalt
  outline + sidewalk pieces, no polygons with holes); road nodes are empty groups for picking. **Residents** (`view3d.ts`):
  `plan()` picks a goal (visit a door from `node.userData.door`, work a field, sit on a bench, stroll the streets),
  `route()` is Dijkstra preferring walkways (`blocked` 1 = solid, 2 = walkway); doors are `doorleaf` groups swung via
  `userData.doorOpen`; chimneys via `userData.chimney`. Land UI prefs (toolbar/side tucked) live in `localStorage` `fz.land.ui`;
  the app sidebar fold in `fz.sidebar`.
  **Move Mode:** tap a building → "Move or turn", or press and hold it (450 ms, `startHold` in `ui/screens/land.ts`) — both use
  `startPlacing(item, id)`; `view.setGhost({…, moving})` hides the original; `L.move()` is free.
- **Template library:** new categories/topics = edit `content/library/taxonomy.json` only (each topic gets 4–5 templates built
  from different archetypes/formats/palettes; `generate: false` = menu only). New layouts = an `Archetype` in `layouts.ts`
  (`kinds` it suits, `also` topic ids, `fits(ev)` to refuse texts it can't show). Library template ids are `${topic}--${arch}`
  and are referenced by usage stats and `design.template` — renaming a topic or archetype id breaks those links.
  Template metadata never contains documents; `loadTemplateDoc()` builds/downloads them. Previews must wait for fonts
  (`waitFonts()` in `ui/libthumbs.ts`) because text is sized by measuring. Published template ids start with `pub-`; a design
  whose `template` is a `pub-` id offers "Update template" to managers. Stock photos keep `credit` on the image element.
- **Asset collections:** graphics from collections are normal `graphic` elements (art id + colours). `artById()` finds
  built-in packs first, then loaded collections; `prepare()` and `drawGraphic()` load a collection on demand (`ensureArt`),
  so any code that draws designs must go through `prepare()` or tolerate a first frame without the picture. New
  collection = `content/assets/collections/<name>.ts` exporting `ASSETS` (ids share one prefix) + one line in `COLLECTIONS`.
  Every asset needs `tags`, `license`, `author`. Shading must derive from the colour slots (`dk`/`lt`/`mix`) so recolouring
  works. Scene backgrounds come in 4 shapes; `ed.addSceneBackground(base)` picks the closest and swaps an existing one.
  Collection templates: compose with the kit (`content/library/collections/kit.ts`), give each a `use` (greeting /
  invitation / party / social / flyer / poster — the holiday filter chips), place text under titles with `below()` (titles
  wrap), keep everything as layers, render a contact sheet and look at it before committing. New holiday = art collection +
  templates file + one line in `collections/index.ts` (+ topic in taxonomy.json, `generate: false` if it has no typographic set).
  **Jewish holiday accuracy:** hanukkiyot always have 8 lights in a row + a raised shamash (never the 7-branch menorah); dreidel
  letters נ ג ה ש are drawn shapes; the seder plate shows zeroa, beitzah, maror, charoset, karpas, chazeret. Hebrew text goes in
  Hebrew-capable fonts (Frank Ruhl Libre, David Libre, Suez One, Secular One, Bellefair, Heebo, Rubik, Amatic SC) without
  punctuation (canvas lays it out RTL by itself). **Search** normalises with Unicode letters (Hebrew kept, niqqud dropped);
  spellings/Hebrew synonyms live in `SYNONYMS` (search.ts). Graphics have **Replace artwork** (props.ts → graphicProps).
  **Themed templates (most new celebrations):** add a `spec(...)` to a ThemedSet in `collections/<group>.ts` — id, name, format,
  use, layout, style, colour words, occasion, tags, a `Look` (scene base id, palette, fonts, hero/top/corner/frame art, optional
  `photo` slot) and `Words` (eyebrow, title, `native` greeting in its own script, sub, details, cta). Template ids are
  `${sub}--${spec id}` — never rename them. Palette text colours: `title/ink/muted` are for words on the scene,
  `panelTitle/panelInk/panelMuted` for words on a panel (arch, medallion disc, details card) — set both on dark scenes
  with light panels or text disappears. Don't put a big `hero` on scenes that already draw a skyline (is-bg-night, is-bg-dusk);
  use is-bg-starry etc. `settle()` grows/shrinks the hero and centres the block in arch/framed/photo layouts. Native lines
  carry no letter spacing (Arabic must join) and no Latin punctuation; never mix two scripts in one text line. Dates in sample
  wording are real weekdays (2026–27). After changing a layout, render all contact sheets (`hwtpl.cjs`) — layouts are shared.
  **Categories:** taxonomy.json now has Islamic, Jewish, Christian, Cultural festivals, Baby and Milestones (kind
  `celebrations`, so moved topics keep their generated templates and ids). Classic templates follow their topic's category.
  **Search** keeps Indic vowel signs inside words, drops Arabic harakat and folds Arabic letter variants; multilingual
  spellings live in topic keywords + `SYNONYMS`. Gallery previews are also cached in Cache Storage (`fz-template-previews-v1`,
  keyed by a hash of the page, pruned to 900).
- **Crypto wallets:** the app may only call `eth_requestAccounts`, `eth_chainId` and `personal_sign` — never transactions,
  approvals or chain switches. The server writes the whole message and checks the signature against its stored copy
  (`wallet.verify` deletes the nonce first, so it works once). Wallet log-in only works for wallets linked while logged in
  (purpose `link` is bound to that user). A signature mismatch is a 400, not 401 (a 401 makes the app log the user out).
  Smart wallets: `verifySmartWallet()` (viem `verifyMessage`, ERC-1271/6492) on chains in `NETWORKS` (+ `WALLET_RPC_<id>`),
  two providers must agree and report the right chain id; the challenge stores `chain_id`. WalletConnect: keep `methods` and
  `optionalMethods` = `['personal_sign']` (the SDK's defaults include transactions!), call `done()` after every attempt;
  pin SDK versions that are a few weeks old. Test chain: hardhat nodes + `WALLET_RPC_31337`.
  `siteOf()` uses Host/X-Forwarded-Host for the message domain and refuses a different Origin. Linking needs the password
  (`wallet.challenge` purpose `link`; wrong ones go into `fz_login_fails`, answered with 400) and emails the owner
  (`walletLinkedEmail`, best effort). `TOP_WALLETS` links must be the wallet maker's official site/documented deep link
  only — fake wallet downloads are the top crypto scam. `vercel.json` sends security headers (frame-ancestors 'none' etc.). Wallet icons are only
  accepted as `data:image/…` and names are sanitised. Crypto test: compare `recoverSigner` with ethers' `signMessage` and
  parse the message with the `siwe` package (both in a scratch folder — not project dependencies).
- **Crypto payments:** never trust the browser — `pay.check` re-reads the chain through two providers; amounts are exact base
  units (bigint strings), unique among open payments (partial unique index), and only reusable after the 1-hour grace. Fuzzies
  are credited only server-side (`fz_credits` → `applyCredits`, also run on `profile.get`/`gift.list`); `fulfil()` is idempotent.
  Test-only overrides (`PAY_TEST_USDC_*`, `PRICE_TEST_*`) are ignored when NODE_ENV=production. Test rig: hardhat node with
  chainId 8453 + MockUSDC, a Solana RPC stand-in (`solmock.cjs`), `pay-test.mjs` (48 checks) and `pay-browser.cjs` (scratchpad).
- **Mission/achievement tracking:** call `track('<event>')` from `core/missions.ts` where the user does the thing.
  Earn toasts for reason `'Fuzzy Crossing'` are suppressed (the game shows its own pop-ups).
- **Scrolling (computers):** inside the app shell the `.main` panel scrolls, not the window (≥961 px); phones/tablets still scroll the window.
- **Theme:** use `var(--accent)`, `var(--on-accent)`, `var(--text)`, etc. Never hard-code purple or gradients in UI chrome.
  Shadows `--shadow-xs` / `--shadow` / `--shadow-md` / `--shadow-lg`, hover tint `--hover`, easing `--ease`. The "Polish v2" blocks at the end of
  `styles.css` refine the older rules above them (same class names) — put new chrome styling there.
- **Navigation:** the sidebar groups and quick find share `NAV_GROUPS` in `ui/quickfind.ts` — add a new screen there (and to the router).
- **Editor toolbar:** selection-specific quick controls live in `renderBar()` in `editor/props.ts` (reuse the inspector helpers `color()`,
  `fontPicker()`, `slider()`); the inspector (`render()`) keeps every option. Panel items become drag-and-droppable with `draggable(el, payload)`
  in `editor/panels.ts` + a case in `dropPayload()`.
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
| `4cb87c8` | **Soft background music in Fuzzies Land** (`game/music.ts`: live Web Audio — warm pad chords Fmaj7–Dm7–Bbmaj7–C, gentle bass, wandering music-box melody, light reverb; fades in/out; 🎵 button in town + Settings switch, `settings.music`; starts on the first tap if the browser blocked audio). **Play bonus:** 1–5 Fuzzies for every 30 minutes playing Fuzzy Crossing or Fuzzies Land (`PLAY_BONUS` in `core/rewards.ts`, shown in Rewards). |
| `a704b64` | **Fuzzies Land visual pass** (same starting town, much higher polish; owner wanted to agree the look first). `ART.md` art direction. New island (`land/environment.ts`): rounded grassy slab with cliffs and beach, shader sea with shore foam and glints, sky dome + sky reflections, instanced forest and grass/flowers swaying in the wind, rocks, drifting clouds. Lighting: warm sun, soft shadows following the camera, neutral tone mapping, MSAA + gentle grade/vignette. Rebuilt in one style: cottages (4 looks), Mushroom House, Treehouse, Cloud Villa, Town Hall (clock tower, porch, gold dome), Crossing Gate (hedge arch, pond), Bakery, Popcorn Stand, Weaver, raised fields, flower beds; light stone bases. Auto-joining roads with kerbs and lane lines. Camera: 30° lens / 50° pitch, zoom to cursor/pinch point, pan inertia, soft island limits, closer start (phones look further up the street). Residents got feet and soft shadows. **Full-screen Land UI**: back button, level badge with XP ring, resource capsules with count-up numbers, sticker icons (`ui/landIcons.ts`), chunky lip-button dock and side buttons, cream panels, icon tabs, shop cards with 3D building pictures. Checked: 19 rules checks, click-through play test, screenshots at desktop/tablet/phone. |
| `aae8447` | **Living town pass** (branch only, awaiting the owner's OK). Compact starter streets (T junction) with sidewalks, rounded ends/turns, curved junction corners, zebra crossings, lane lines, street lamps; drag to lay roads/paths; old towns tidied once by a safe migration. 4-way rotation, placement reasons, water–road spacing rule. Fuzzies with names, outfits and personalities walk the pavements, go into houses (doors open), tend fields, sit on benches, chat (happy/sleepy faces). Richer buildings (shingle roofs, hinged doors, lanterns, picket fences, stepping stones, mailboxes, banners, workshop props, chimney smoke); Crossing Gate rebuilt with a natural pond inside its plot (raspberry sign). Farm fences, landscaping around buildings and sidewalks, clover/daisy lawn, butterflies. Coloured game toolbar with illustrated icons, small badges, barn meter, hide/show tab; collapsible side buttons; flying coins/stars; larger shop pictures with lock badges; foldable app sidebar; frog icon removed; automatic quality steps; double-tap zoom. |
| `0ab7081` | **Toolbar fix + Move Mode.** Toolbar regression fixed at the root: icons now live in a fixed icon box inside each button (grid layout, no absolute positioning), equal padding so labels line up, badges on the button corner clear of the icon, barn meter in a fixed slot under its label; Build icon's hammer redrawn (no stray diamond). Natural grey stepping stones. **Press and hold** any placed object to pick it up (ring shows the hold), drag it, green/red marker drawn on top of everything with the reason shown, Put here / Cancel; the original is hidden while carried; moving is free and saved (tested across a page refresh). |
| _(go-live)_ | Final check of the production build on a computer and a phone (every screen, editor, Fuzzies Land toolbar/panels/back button, side-menu fold: all pass, no errors). Fixed the side-menu fold button being half-covered by the top bar (sidebar now above it). Frog removed from the random/choosable avatar emoji. **Merged to `main` (live).** |
| _(fix)_ | **Sign-up "Something went wrong on our side" (owner hit it on the live site, cloud mode).** Backend made resilient for Neon: pool `connectionTimeoutMillis`/`idleTimeoutMillis`, `pool.on('error')` so a connection dropped while idle can't crash the function, `q()` retries a query once on dropped-connection errors; setup errors are tagged. Errors now carry a safe reference (`ref: setup 28P01` etc.) and `GET /api/auth?check` is a browser health check (see BACKEND.md → Troubleshooting). Tested against real Postgres (sign-up, log-in, duplicate, connections killed mid-way, wrong password → `setup 28P01`) and with `vercel build` + the built function. |
| _(fix 2)_ | **Live sign-up: `ref: setup SELF_SIGNED_CERT_IN_CHAIN`.** The owner's database presents a provider-signed certificate (Supabase-style), and pg treated `sslmode=require` as verify-against-public-CAs. `api/_lib/db.ts` now reads/strips sslmode itself: verify first, and on a not-publicly-signed certificate fall back to encrypted-without-verification (libpq `require`), unless `verify-full`/`verify-ca` or a `DATABASE_CA` is set (then strict). Reproduced with a test Postgres using its own CA, fixed, and checked with `vercel build`. |
| _(reset)_ | **Password reset by email** (owner asked). "Forgot your password?" → email box → `forgot` emails a single-use link valid 1 hour (only a SHA-256 of the token is stored in `fz_resets`; same answer whether or not the account exists; 3 emails/account/hour) → `#/reset/<token>` screen (new password ×2) → `reset` sets it, logs out other devices, clears failed-login counter, logs in. Email via Resend's HTTP API (`api/_lib/mail.ts`, no new packages): needs `RESEND_API_KEY` in Vercel (optional `MAIL_FROM`, `APP_URL`); without it the app says email isn't switched on yet. Tested end to end with a mock email service + real Postgres. |
| _(updates)_ | **"A new version is ready" banner** (`core/updates.ts`): the owner kept seeing an old screen because the single-page app keeps running the version a tab was opened with. The app now compares its main script with the live `index.html` every 2 minutes and on returning to the tab, and offers a one-tap Refresh. Service worker (`fuzzies-v3`): `cache: 'no-store'` requests and `index.html` always go to the network (the old one answered the version check from cache). Tested with the service worker on and off. |
| `1fc6159` | **Reset email fixes (live):** a reset link whose email failed is deleted, so failed tries don't use up the 3-per-hour limit; stray spaces/quotes around `RESEND_API_KEY` are ignored; errors show Resend's reason + a safe key hint. On `main`. |
| _(polish)_ | **Canva-easy, Linear-clean polish pass** (owner asked; nothing rebuilt, all features kept). Shell: sidebar grouped into Create / Play / You with tighter type, tooltips on the folded rail, tablets (761–960 px) get the slim rail instead of the tab bar; top bar shows the page title + a search box; **quick find** (`ui/quickfind.ts`, Ctrl/Cmd+K) jumps to screens, templates and your designs. Styling: layered low-contrast shadows (`--shadow-xs/-md`), `--ease`, refined buttons/inputs/chips/menus/modals, hover states, page fade-in — all in the "Polish v2" sections at the end of `styles.css`. Editor: **smart toolbar** above the canvas (`props.bar`, built in `editor/props.ts` → `renderBar()`): text = font, size −/+, colour, B/I/U/aA, align; shapes = fill/border; graphics/QR = colours; Position menu + Transparency for everything; page colour/Resize/Add page when nothing is selected. The full inspector is a docked column shown on demand ("All options", remembered in `fz.ed.inspector`); the design re-fits when space changes unless zoomed by hand (`fitZoom`). The size label in the top bar opens page settings. Phones: the toolbar slides up over the tool rail while something is selected (Done brings the rail back). **Drag and drop** from panels (shapes, graphics, stickers, text, uploads) with mouse or finger (press-and-hold on touch so swiping still scrolls). Fix: phones with a folded sidebar saved got a squashed page. Tested at 1440/834/390 px, light and dark, plus the production smoke test (every screen, editor, Fuzzies Land): no errors. Merged to `main` (live). |
| `2d9ab5f` | **Bolder look** (owner: the polish pass "still looks the same"). Home: raspberry banner "What will you design today?" with a big search box (opens quick find with what you type) and round size shortcuts (Instagram, Story, Poster, Presentation, YouTube, Logo, Invitation, Custom); order is now Recent designs → Popular templates (one swipeable equal-height row) → Play & earn (game + town side by side) → missions. Computers (≥961 px): sidebar on the page colour, each screen in a raised white panel that scrolls itself (`.main` is the scroller), active menu item is a white pill. Re-checked before going live: production smoke test (every screen, editor, Fuzzies Land) on computer + phone, editor toolbar/undo and drag-and-drop on 3 sizes, panel scrolling, folded menu, daily bonus, shortcuts, quick find, dark mode (banner deepened): no errors. Merged to `main` (live). |
| _(editor)_ | **Editor upgrade** (owner: Create → Templates / My Designs only, competitive with pro tools). Kept the app's own Canvas 2D engine after weighing Konva/Fabric (both MIT, but a switch would mean rewriting the renderer shared by editor/thumbnails/exports and migrating every saved design for no feature gain). **Document format v2** (`editor/model.ts`): versioned, documented invariants, `migrateDesign()` upgrades/repairs old or damaged saves on every load path; designs remember their template; `folder`. **Autosave**: serialized writes, save on tab hide/close, Ctrl/Cmd+S, Saving/Saved/Not saved·Retry chip, thumbnail at creation. **Performance**: cached layers while dragging + page picture while panning (400-object design: 1–16 ms per frame), accent colour cached. **Editing**: View menu (smart guides, show grid, snap to grid, grid size), Preview (full-screen pages), Download menu (PNG/JPG/PDF/.fuzzies), Hide in menus, Tab/Shift+Tab through objects. **Photos** tab (free Unsplash-licensed photos via Lorem Picsum; tested with simulated responses — the container can't reach it). **Templates**: shape filter, count, Blank design card. **My Designs**: folders. Tested: save/reload/reopen identical, hide-tab save, old-format design repaired, grid snap, hide+undo, preview, PNG/PDF downloads, drag-and-drop, toolbar/undo on 3 sizes, production smoke test (computer + phone, no errors). Merged to `main` (live). |
| _(library)_ | **Template library** (owner: Create → Templates / My Designs only, "large-scale, searchable, inspired by Canva", original templates, licensed assets, no scraping). Data-driven taxonomy: 7 categories, 83 topics (27 sports incl. pickleball/softball/gymnastics/surfing, entertainment, celebrations, community, business, education, creators). 14 layout archetypes × 8 formats × 28 palettes × 9 font voices → **335 original templates** with real differences (4–5 per topic, never near-duplicates), plus the 28 classics placed in topics (363 in all). Gallery: search (typos, synonyms), category tree, format/style/colour/occasion/free filters, Recently used / Trending / Popular (real usage only, hidden until there is data) / Recently added, lazy previews, infinite paging, preview with similar templates, blank starters; editor Templates panel searches the same library. Backend: `fz_templates` catalog with Postgres full-text search + paging, documents and pictures served separately, revisions; usage counts. **Publishing:** template managers (`ADMIN_EMAILS`) get Download → Publish as template / Update template and Manage templates (publish, unpublish, edit, delete); **Draft with AI** only when `ANTHROPIC_API_KEY` + `ANTHROPIC_MODEL` are set (Claude writes wording, the layout engine lays it out). **Photos:** search through Pexels (with a key) or Openverse (CC0/public domain/CC BY), safe image fetcher (allowlisted hosts), credits saved with each photo, inspector credit + Download → Photo credits. Tested: 33 catalog API checks + AI checks on real Postgres and a fake AI service, 23 photo-API checks (incl. blocked hosts/redirects/size), browser runs of gallery, editor panel, photo search/credits, publish → user finds and uses it, manager, AI drafts, at desktop and phone sizes. Merged to `main` (live). |
| _(halloween)_ | **Asset system + illustrated Halloween collection** (owner: go beyond the look; production-quality platform; Halloween with pumpkins, ghosts, haunted houses, bats — no text-only flyers; audit first). `PLATFORM-PLAN.md` = audit + prioritized plan (Canva concepts from Claude's knowledge — canva.dev was not reachable from the container). Asset registry with tags/licence/author and lazy collections; 34 original recolourable illustrations + 6 scene backgrounds in 4 shapes; Elements panel collection sections, tag search, page backgrounds (replace the existing one); free "Spooky Season" fonts (Creepster, Griffy, Henny Penny, Mystery Quest, Jolly Lodger — checked on Google Fonts). **20 hand-composed Halloween templates** (fully layered: scene, illustrations, live text, shapes) replace the typographic Halloween layouts. Tested: contact sheets reviewed and overlaps fixed, gallery search/topic, open → 10 editable layers, reload, PNG export, graphic recolour slots, Elements search + background swap, phone, production smoke test (every screen): no errors. Merged to `main` (live). |
| _(holidays)_ | **Christmas, Hanukkah & Passover collections** (owner: same quality as Halloween; accurate Jewish symbolism; Hebrew; holiday search incl. Chanukah/Hanukah/חנוכה and Pesach/פסח; sub-filters Greetings/Invitations/Parties/Social/Flyers/Posters; nothing removed). Shared drawing kit + composition kit (Halloween moved onto it unchanged). Art: Christmas 29 illustrations + 6 backgrounds, Hanukkah 18 + 5 (hanukkiyot 8 + shamash in gold/silver/oil, window scene, dreidels with נ ג ה ש, gelt, Stars of David, sufganiyot, latkes, oil jug…), Passover 17 + 5 (seder plate with its six items, matzah, Kiddush cup, Cup of Elijah, Haggadot, flowers, almond blossom, wheat, candlesticks, seder table, frog, pomegranate…). **60 hand-composed templates** (20 each) with Hebrew greetings (חג חנוכה שמח, חג אורים שמח, נס גדול היה שם, חג פסח שמח, חג כשר ושמח, ליל סדר, לשנה הבאה בירושלים). Free font packs Festive & Elegant + Hebrew (all checked on Google Fonts). Gallery: Holiday collections row, type chips with counts (URL `use=`), collection templates rank first; Passover topic added; existing typographic Christmas/Hanukkah templates kept. Editor: Replace artwork for graphics (toolbar + inspector, keeps size, undoable). Tested: contact sheets reviewed and layouts fixed, Hebrew read RTL correctly, 17 holiday searches, chips, open → layers → reload in My Designs, Elements search (menorah/seder/reindeer), Replace + undo, phone, production smoke (every screen): no errors. Merged to `main` (live) with the multicultural release. |
| _(multicultural)_ | **Multicultural collections** (owner: Islamic, Jewish, Christian, global festivals, baby and milestone categories; accurate symbolism; Arabic/Hebrew RTL; alternative spellings and multilingual search; reusable system; 5 benchmark templates first; LidoJS evaluated). LidoJS has no licence (no code reused; ideas only — see PLATFORM-PLAN.md). **Text effects & curved text** in the editor (`04b10d4`). **Themed template system** (`collections/themed.ts`: looks + words + 8 reusable layouts, vertical balancing, photo slots, panel-aware colours). **9 new art collections** (176 original illustrations + 47 scene backgrounds in 4 shapes): Ramadan & Eid, Jewish holidays, Easter & Christian, Diwali/Holi/Indian festivals, Baby, Lunar New Year & Asian festivals, Nowruz/Kwanzaa/Día de Muertos, weddings & milestones, parties & community events. **175 themed templates in 71 topics** (benchmark: Ramadan Kareem, Shana Tova, He Is Risen, Diwali Night, Oh Baby) with greetings in Arabic, Hebrew, Hindi, Malayalam, Punjabi, Chinese and Persian (new free font packs: Arabic & Persian, Indian scripts, Chinese, Soft & Sweet). Taxonomy: 6 new categories, 50+ new topics with spellings/other-language keywords; gallery "Illustrated collections" row with category chips; persistent preview cache. Tested: every template rendered on contact sheets and fixed (overlaps, invisible text, crowded skylines), 40+ multilingual searches, open → edit native greeting via Layers + Enter → reload → PNG export for Arabic, Hebrew, Hindi, Chinese, Persian and a photo card, phone flow, production smoke (computer + phone): no errors. Re-tested on the production build before going live (smoke test, editing/export in 7 scripts, 80 earlier holiday templates re-rendered). **Merged to `main` (live).** |

| _(wallets)_ | **Crypto wallet sign-in** (owner: connect Trust Wallet, MetaMask, Coinbase Wallet and others, "super safe"). Profile → **Crypto wallets** card (link up to 5, remove with confirm) and Log in → **Continue with a wallet**. Picker finds every installed Ethereum wallet (EIP-6963) with its own icon; phones without one get official "Open in MetaMask / Trust Wallet / Coinbase Wallet" links; computers without one get the official download pages. Sign-In with Ethereum (EIP-4361): the server writes a one-time, 10-minute message naming the site, wallet and account; signature checked with audited `@noble/curves`/`@noble/hashes` (new dependencies — never hand-rolled crypto); Origin check; rate limits; one account per wallet; safety note on every screen ("we never ask for your recovery phrase"). No payments, transactions or funds. Tested: 1,040 crypto checks against ethers + the reference `siwe` parser/verifier, 40 API attack checks on real Postgres (replay, wrong signer, edited message, expired, other account's link, wallet owned elsewhere, foreign Origin, bad input, unlink scope, 5-wallet cap, cascade delete, rate limit), browser flow with a fake EIP-6963 wallet (link, cancel, log in, remove, unlinked wallet) on computer and phone, the Vercel-built function. Branch only. |

| _(wallets 2)_ | **More wallets + more safety** (owner: "log in with any top wallets like crypto.com wallet and robinhood wallet… safety always number one"). Picker now lists popular wallets under the installed ones — MetaMask, Coinbase, Trust, **Crypto.com Onchain**, **Robinhood Wallet**, OKX, Phantom, Rabby, Rainbow — each with the safe way in: official open-in-app links (MetaMask, Coinbase, Trust, Phantom), otherwise steps for the wallet's own browser (Robinhood: Web3 tab / globe icon; Crypto.com: dapp browser search bar) with Copy address; official download pages only (checked by hand). Safety: **password required to link a wallet** (a stolen logged-in device can't add a back door; guesses lock after 10), **email to the owner on every new link**, last log-in time per wallet in Profile, "check your wallet shows <site>" tip, site-wide security headers (no framing/click-jacking, nosniff, referrer policy, no camera/mic/payment), email sending times out after 10 s. WalletConnect researched and **not added** (closed licence, paid above 500 monthly wallets) — asked the owner. Tested: 48 API checks (incl. password, lock-out, one email per new link), browser flow on computer + phone (password, wrong password, cancel, link, log in, remove, popular-wallet help, copy address), Vercel build with headers. Branch only. |

| _(wallets 3)_ | **QR codes on every device + smart wallets** (owner: "QR code scans … phones and computer and tablets, as do smart wallets … professional … safe"). **WalletConnect** (official Reown SDK, lazy-loaded): computers show "Scan QR code with your phone", tablets "Scan QR code or use a wallet app", phones "Use a wallet app" (Robinhood, Crypto.com, Rainbow, Ledger… 500+); popular-wallet rows offer it too; brand-coloured window with swaps/buy/send/email/social/analytics off; session limited to `personal_sign` (verified), fresh each time, disconnected after; window can't be closed by accident while waiting; licence notice in Settings + `/licenses/walletconnect.md`. **Smart wallets** (Coinbase Smart Wallet, Safe, Argent…): ERC-1271 + ERC-6492 checked on Ethereum/Base/Optimism/Arbitrum/Polygon with viem, two independent providers must agree and be on the right network, unreachable = refused. Dependencies pinned to versions ≥ 3 weeks old (supply-chain safety), `npm audit` clean. Tested: local blockchains with a sample smart wallet (deployed + not deployed, thief, wrong factory, edited message, providers disagreeing, provider down, unsupported network, junk/oversized signatures: 22 checks), earlier 48 API + 1,040 signature checks re-run, namespace check (only `personal_sign`), browser: smart wallet link + log-in, QR window opens and closes cleanly on computer, tablet and phone layouts, Vercel build + built function. Live QR scanning needs the Project ID (container can't reach WalletConnect). Branch only. |

| _(payments)_ | **Crypto payments + gift box + wallet logos** (owner: logos for each wallet, $0.50 fee — chose *once per wallet* —, buy Fuzzies with SOL/ETH/ETH on Base/other safe coins, 100 Fuzzies gift box on wallet log-in, professional, no errors). **Buy Fuzzies** with ETH or USDC on Base/Ethereum, SOL or USDC on Solana (packs 100/$0.99 · 550/$4.99 · 1,200/$9.99 · 3,000/$19.99) from Rewards → *Get more Fuzzies* and the Fuzzies counter in Fuzzies Land. **Wallet activation** $0.50 once per wallet (after linking), then a **gift box** pops up: double-click/tap → lid flies off, the Fuzzy pops out with sparkles, giggle and coins, +100 Fuzzies (once per wallet, ever). Payment window: coin choice with fees, exact amount + address + countdown, wallet payment (installed or WalletConnect pay session limited to sending + network switch), Solana Pay QR / open-in-wallet, live confirmation, explorer link; sent payments resume if the app closes. Server: dual price sources, unique amounts, two-provider on-chain checks, one tx = one payment, idempotent crediting into the synced profile, rate limits. **Real logos** (web3icons, MIT) for wallets, coins and networks. Fixed: Rewards page overflowing on phones (old bug). Tested: 48 payment attack checks (ETH/USDC on a local Base chain, SOL/USDC via a Solana stand-in: wrong amount/recipient/token, reverted, replayed/hijacked tx, other users, expiry, providers disagreeing, fee+gift once per wallet, limits), earlier suites (48 API, 1,040 signature, 16 smart-wallet, 6 provider), browser: link → activate → gift → buy with ETH → buy with SOL → wallet log-in (balances verified), phone shop/pay/gift, Fuzzies Land shop, full smoke test computer+phone: no errors. Not tried with real money (no internet here). Branch only. |

Design exploration (not code): a Claude Design canvas with three palette mockups —
https://claude.ai/artifact/QTuketL61NYuYA21APjJn4 (private to the owner). The owner rejected all three as "too much"
and chose a single consistent brand colour instead (see §3).

## 8. Known limitations / not verified

- **Crypto payments:** tested on local test chains and a Solana stand-in only — do one small real purchase on each network after
  setting the addresses. Price sources (Coinbase, Kraken) and public providers couldn't be reached from the container. Refunds are
  manual. Purchased Fuzzies count towards the "Earn N Fuzzies" badges. Sent-but-unconfirmed payments are remembered per device
  (another device won't know the transaction id; Solana payments don't need it). Fuzzies balances are still written by the app,
  so a technical user could edit their own balance (server-side balance checks would fix it).
- **Crypto wallets:** tested with a simulated wallet only (no real MetaMask/Trust/Coinbase in the container) — try it on the
  live site with a real wallet on a computer and a phone. Smart-contract wallets (Coinbase Smart Wallet, Safe) aren't
  QR/WalletConnect could not be tried end-to-end here (no internet to WalletConnect's servers) — test with a real phone
  wallet after the Project ID is set. Smart-wallet checks use free public network providers by default (can be slow or
  rate-limited; set `WALLET_RPC_<id>` for your own). WalletConnect is free up to 500 wallets a month (then a paid licence). Robinhood/Crypto.com/OKX on phones need the in-app browser steps (no official deep link found). Wallet logos come
  from the wallets themselves when installed; others show a letter. You can't create an account with only a
  wallet — log in with email first, then link. The link-notice email depends on Resend working (see Status). Ethereum-style wallets only (no Solana/Bitcoin sign-in). No payments.

- **Multicultural collections:** native-script greetings were checked against reference spellings and visually (RTL order,
  Arabic joining, Devanagari/Gurmukhi/Malayalam shaping) in Chromium only — a native speaker review is still worth doing,
  and Safari/real phones are untested. Editing a greeting to a much longer one can wrap onto the line below (layers don't
  reflow). Vesak and Kwanzaa have English/Swahili wording only (no Sinhala/Pali). Photo slots use soft placeholders.
  The collections row shows 75 sets; Sports/Entertainment/Community appear there only through a few event templates.

- **Holiday collections:** checked in Chromium only (not Safari / a real phone). Hebrew lines are single phrases without punctuation;
  editing mixed Hebrew + English in one text box follows the browser's bidi rules. Replace artwork offers pieces from the same
  collection/pack only. The server-side search for *published* templates (Postgres) still only understands Latin words.

- **Halloween collection:** drawn and checked in Chromium only (SVG with gradients/patterns drawn to canvas); not yet seen in Safari
  or on a real phone. Photos are not used in these templates. Canva's docs couldn't be opened from the container, so the plan's
  Canva comparison is from Claude's knowledge. Review/approval workflow, quality checks, seasonal rows and AI design generation
  are planned (PLATFORM-PLAN.md), not built.

- **Template library:** Pexels, Openverse and the AI drafting were tested only against simulated answers (no internet in the Claude
  container) — check them on the live site once the keys are set. Openverse without a key has low anonymous rate limits (searches
  are CDN-cached for an hour). Published templates' photos are stored inside the template JSON (3.5 MB cap per template).
  Trending/Popular appear only after people use templates while logged in to cloud accounts. Search runs in the browser over
  the loaded catalog; the server is asked only when more than 200 templates are published.

- **Photos panel** was only tested against simulated picsum.photos responses (the Claude container has no internet). Check it on the live
  site; if picsum is ever down the panel shows a friendly "Try again". No photo search (picsum has none) — a real search needs an
  Unsplash/Pexels API key.
- Snap to grid applies to moving, not to resizing. Rotation/resizing of a multi-selection keeps the old behaviour.

- **Password-reset email on the live site:** not confirmed working yet (Resend rejected the key in Vercel — see Status). The Resend account has two keys ("Fuzzies password reset" — unused, its value was lost; "Fuzzies (Vercel)") plus whichever the owner made; the unused one can be deleted with the owner's OK.
- Polish pass: drag-and-drop with a real finger and the phone selection toolbar were tested with emulated touch only, not on a real phone.

- **Cloud sign-up on the live site** failed once for the owner with a generic 500 (cause not visible from Claude's side: no Vercel log access). If it happens again, ask for the `ref:` code or the `/api/auth?check` output.
- **Password reset emails need `RESEND_API_KEY` in Vercel** (owner step, BACKEND.md). Until a domain is verified in Resend,
  emails only reach the Resend account's own address. No email confirmation at sign-up yet.
- Fuzzies balance and unlocks are written by the app itself, so a technical user could edit their own balance via the API
  (fine for now; a server-side rewards check would fix it).
- Photos are stored inside each design's JSON row (and uploads as data URLs), so designs with many photos sync slowly.
  A single design upload is capped at ~4.5 MB by Vercel; bigger ones are skipped with a message. Vercel Blob for photos is the fix.
- Usernames can't be changed after sign-up, and the login email can't be changed in the app yet.
- App icon: phones read the icon when Fuzzies is added to the home screen, so a change shows after re-adding it.
- Share links carry the design in the URL; designs with many photos make long links (warned in the UI; hard cap ~400k chars).
- 3D performance and the mascot/intro animations were only checked via screenshots in software WebGL — **not on a real phone yet**.
  Fuzzies Land now uses post-processing (MSAA), soft shadows and instanced foliage; it needs a real-phone check and an automatic
  quality switch (lower shadows/MSAA/foliage on slow phones) before launch.
- Fuzzies Land decorations (bench, lamp post, fountain, statue, rainbow arch), crops and the construction site still use the
  older, simpler style. No first-time tutorial. Prices/timers untuned. No day/night cycle yet.
- Residents don't avoid each other (they can pass through one another) and the Popcorn Stand has no door to visit.
- Adaptive quality was only exercised in code review; it has not been seen stepping down on a real slow phone.
- The top-scores list on the game-over card was not seen end-to-end in a browser (logic is simple; unit-checked by reading).
- No automated tests, linting or CI.
- Old accounts keep their old avatar colour; old designs keep their old colours (only defaults changed).

## 9. Next up (ideas the owner hasn't prioritised yet)

0. **Crypto wallets are on the branch** (browser wallets, top-wallet guidance, WalletConnect QR, smart wallets) — owner adds
   `VITE_WALLETCONNECT_PROJECT_ID`, tests with a real wallet, then ask to merge to `main`. Possible next: sign up with a wallet only.
   **Christmas/Hanukkah/Passover, text effects and the multicultural collections are live** — collect the owner's feedback. Then: native-speaker review of greetings; more templates per topic (the system makes it data);
   frames/tables/rich-text runs in the editor (Workstream A); seasonal ordering of the collections row.
   **Halloween collection is live** — next per PLATFORM-PLAN.md: quality checks + review stage for publishing, a seasonal
   "Halloween" row in October, more collections (Christmas, Diwali, Lunar New Year…) with the same asset system.
   **Template library is live.** The owner (hotlavayaniv@gmail.com) was made a template manager through the new `fz_admins` table
   (Claude's Vercel connector still gets 403, so `ADMIN_EMAILS` couldn't be set; either way works). Remaining owner steps (BACKEND.md →
   "Template library extras"): `ADMIN_EMAILS` (their own login email) to publish templates; optional `PEXELS_API_KEY`;
   optional `ANTHROPIC_API_KEY` + `ANTHROPIC_MODEL` for Draft with AI. Then publish a few real templates and check photo search live.
   **Editor upgrade is live** — check the Photos panel on the live site (untested against the real service); collect feedback; finish the reset-email setup (ask for the new `ref:` code).
   **Live for testing** (owner approved). Collect the owner's feedback from real devices (performance on their phone!).
   Next for Fuzzies Land: restyle the decorations (bench, lamps, fountain, statue, rainbow arch), crops and construction site;
   residents carrying goods to the barn and avoiding each other; a guided first 5 minutes; day-to-dusk light; real-phone
   check of performance; balance levels 1–10; turn the rules/migration checks into an automated test suite.
1. **Deploy on Vercel + add Neon with the owner** (follow `BACKEND.md`), then test on two real devices.
   After that: password-reset emails (Resend), photos → Vercel Blob, real short share links (a `shares` table),
   online leaderboards, change email/username.
2. More game characters / levels / power-ups; online leaderboards.
3. Editor: curved text, background remover, animation/video export, tables/charts, more templates.
4. A test suite (Vitest for rules: `crossing.ts`, `qr.ts`, `missions.ts`, `sharelink.ts`) + CI build check.
5. Real-device check of performance (low-end Android) and an adaptive-quality switch for the 3D game.
