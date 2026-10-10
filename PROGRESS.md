# Fuzzies — build progress & handoff

> **For AI agents:** read this whole file before changing anything, then follow `AGENTS.md`.
> When you finish a session, update **Status**, **Build log** and **Next up** below, and commit it with your work.

_Last updated: 2026-10-10 · by Claude Code · last commit before this file: `7e2dcbc`_

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
| **Current state** | All features below are built, type-check, build cleanly and were browser-tested. `main` = latest. |
| **In progress** | Nothing half-done. The last session ended after merging everything to `main`. |
| **Branches** | `main` (live) and `claude/fuzzies-design-app-jwv4tu` (same commit as `main` right now). |
| **Deploy** | Vercel-ready (`vercel.json`). Whether the owner has connected Vercel is unknown — ask before assuming. |

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

## 5. Tech & architecture

TypeScript + Vite, **no UI framework** (small `h()` DOM helper in `src/ui/dom.ts`). Three.js only for the game's
3D view and the mascot renders (lazy-loaded chunk). All data is **on-device** — there is no backend.

```
src/
  main.ts              boot: fonts, router, activity rewards, service worker
  styles.css           all styling; theme tokens are CSS variables (set by core/themes.ts)
  core/
    account.ts         local accounts (PBKDF2-hashed passwords), profile, stats, missions state, brand kit, settings
    db.ts              IndexedDB: designs + uploads
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

**Storage keys:** `localStorage` `fz.accounts`, `fz.session`; `sessionStorage` `fz.remix` (pending remix after sign-up);
IndexedDB database `fuzzies` with stores `designs` and `uploads` (both indexed by `owner`).

## 6. Rules of the codebase (gotchas)

- **Adding an account field:** add it to the `Account` type *and* to `fresh()` in `core/account.ts`; `migrate()`
  merges defaults into old saved accounts (nested objects need their own spread in `migrate()`).
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

Design exploration (not code): a Claude Design canvas with three palette mockups —
https://claude.ai/artifact/QTuketL61NYuYA21APjJn4 (private to the owner). The owner rejected all three as "too much"
and chose a single consistent brand colour instead (see §3).

## 8. Known limitations / not verified

- **No backend:** accounts, designs and Fuzzies exist only in that browser on that device (no sync, no password reset).
- Share links carry the design in the URL; designs with many photos make long links (warned in the UI; hard cap ~400k chars).
- 3D performance and the mascot/intro animations were only checked via screenshots in software WebGL — **not on a real phone yet**.
- The top-scores list on the game-over card was not seen end-to-end in a browser (logic is simple; unit-checked by reading).
- No automated tests, linting or CI.
- Old accounts keep their old avatar colour; old designs keep their old colours (only defaults changed).

## 9. Next up (ideas the owner hasn't prioritised yet)

1. Cloud accounts + sync (e.g. Supabase/Firebase behind `core/account.ts` + `core/db.ts`), real short share links.
2. More game characters / levels / power-ups; online leaderboards.
3. Editor: curved text, background remover, animation/video export, tables/charts, more templates.
4. A test suite (Vitest for rules: `crossing.ts`, `qr.ts`, `missions.ts`, `sharelink.ts`) + CI build check.
5. Real-device check of performance (low-end Android) and an adaptive-quality switch for the 3D game.
