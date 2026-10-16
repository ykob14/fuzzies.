# Fuzzy Crossing — professional expansion: audit + plan

_Started 2026-10-16. Fuzzy Crossing is its own tab (`#/play`). It is **not** part of Fuzzies Land: separate currency (Crossing Coins), separate save (`account.crossing`), separate screens. The existing game keeps working at every step._

## 1. Audit (what was there)

| Area | Existing | Notes for the expansion |
|---|---|---|
| Rules | `src/game/crossing.ts` — `Crossing` class: 11×13 grid, 5 river lanes (logs, sinking lily pads from level 3), 5 road lanes (cars, trucks, buses), 5 nests, 3 lives, 32 s timer, pickups (Fuzzies, golden), levels (speed ×1.13 per level), `Fx` events, a `View` interface | Lanes are built by `buildLanes()` from hard-coded rows → becomes data driven (LevelDef) for worlds/endless |
| Views | `view3d.ts` (Three.js: sky, shadows, water, furry Fuzzy via the owner's GLB `glbFuzzy` or procedural `makeFuzzy`; intro cinematic; moods per level) and `view2d.ts` (canvas fallback) | Player model built in `ensurePlayer()` from `skin.colors` → characters add accessories + fur finish |
| Screen | `src/ui/screens/play.ts` — start card, HUD, d-pad, swipe/tap, pause, game over, top-10 scores, skin picker (7 skins, bought with site Fuzzies) | Start card became the Crossing hub (menu) |
| Economy | Pickups pay **site Fuzzies** (`rewards.earn`) used for templates/fonts/themes on the whole website | Kept. Crossing Coins are separate and only for Fuzzy Crossing |
| Save | `account` (localStorage + cloud sync via `core/sync.ts`; three-way merge `core/merge.ts`): `settings.skin`, `stats.bestScore/bestLevel`, `topScores` | New `account.crossing` (merges: counters add, bests max, lists union) |
| Characters | 7 colour skins (`SKINS`) | Become characters in the 50-Fuzzy collection (`legacy` ids; owned skins carry over) |
| Audio | `game/sound.ts` Web Audio synth (`sfx.*`), `game/music.ts` (Land only) | Dynamic music + more sfx in the polish stage |
| Server | Vercel `api/` + Postgres (RLS, rate limits, signed tokens) | Weekly boards need server-validated scores |
| Tests | Playwright scripts in the session scratchpad; DOM-free checks bundled with rolldown (`tools/crossing/run.sh`) | Same pattern |

Rule kept from the owner: **the Fuzzy is the owner's round fur ball** (`fuzzy.glb`). New Fuzzies are that same body with a fur finish (colour/pattern/material) and accessories — never arms, feet or eyebrows, never a redrawn face.

## 2. The 50 Fuzzies (`src/crossing/characters.ts`)

15 common · 12 rare · 10 epic · 8 legendary · 5 mythic. Ways in: start 1 · free Pass 10 · permanent shop 8 · rotating shop 5 (**only 13 of 50 can be bought, never a legendary/mythic**) · seasonal events 8 · achievements 6 · world clears 5 · endless 3 · weekly boards 2 · flawless-world 1 · secret 1. Checked by `tools/crossing/check.ts` (48 checks).

## 3. Economy

* **Crossing Coins** (`COIN` in `store.ts`): pickup 1, golden 5, nest 3, level 10, +2 per 100 score at the end of a run. A typical run ≈ 25–45 coins; a good day (runs + 3 daily missions) ≈ 250.
* Prices: common 150–400 · rare 600–1000 · epic 2000–3000. A common ≈ 1–2 days, rare ≈ 4 days, epic ≈ 1.5 weeks. Legendary/mythic are prestige unlocks.
* **Fuzzy Pass**: free, 50 levels, XP from pickups, nests, levels, runs, missions (`XP` in `pass.ts`). ~8,140 XP in total (≈ 40–60 runs). 10 Fuzzies + 14 cosmetics + ~4,900 coins on the track; level 50 = Phoenix Fuzzy. Rewards are claimed by the player.
* **Shop**: permanent shelf, daily (4 slots) and weekly (3 slots) rotation chosen deterministically from the date (same for everyone, nothing to cheat), seasonal collections during events. Purchases go through `spendCoins` + `grantCharacter/grantCosmetic`; everything persists in `account.crossing` and syncs.

## 4. Architecture

```
src/crossing/
  characters.ts   50 Fuzzies (data)        cosmetics.ts  trails / jump fx / celebrations / outfit pieces (data)
  pass.ts         Pass track + XP maths    save.ts       CrossingSave + migration (no app imports)
  store.ts        economy + unlock engine  hub.ts        screens layer + navigation (How to Unlock deep links)
  ui/kit.ts       coin mark, rarity tag    ui/locker.ts · pass.ts · shop.ts · celebrate.ts · (worlds, endless, missions, leaderboard, events)
  character3d.ts  (stage 1) builds a Fuzzy from a CharacterDef: fur finish + accessories + animations
  levels.ts / endless.ts / missions.ts / achievements.ts / shopData.ts (later stages)
  eventData.ts    seasonal events as DATA (8 events + year-keyed keepsakes)   events.ts  pure event rules   eventsLive.ts  store hooks (progress, claims, grants)
  ui/events.ts    Events screen   ui/eventFx.ts  weather layer over the board
```
Single doors: `grantCharacter/grantCosmetic` (queues the celebration), `report(event)` (the game tells the store what happened; missions/achievements subscribe with `onReport`), `evaluate()` (opens characters whose requirement is met).

## 5. Stages (each: build → automated checks → browser test at phone/tablet/desktop → fix → next)

1. **Foundation** ✅ data, save, migration, hub menu, coins/XP in the game, Pass/Locker/Shop entry tiles.
2. **Locker** — 3D showroom (rotate 360°, expressions, jump/celebration previews), accessory library for all 50, locked-Fuzzy inspector with *How to Unlock* deep links, rarity filters, collection progress, equip; in-game player uses the equipped Fuzzy; unlock celebration (3D, particles, Equip Now).
3. **Pass + Shop** — scrollable track with claim/claim-all, milestone Fuzzies; shop with daily/weekly/permanent/seasonal shelves, purchase confirm, "owned/equipped" states.
4. **Worlds** — 10 worlds × 15 levels as data (`LevelDef`), new mechanics per world (trains, ice, moving bridges, boats, wildlife, weather), solvability checks, stars, milestone challenges, world unlocks.
5. **Endless** — seeded generator that is provably crossable, coins/collectibles, events, records.
6. **Missions + achievements** — 3 daily, weekly, long-term, hidden.
7. **Weekly competitions** — server: signed run sessions, plausibility validation, weekly reset (UTC Monday), boards (score / fastest crossing / longest streak), rewards (trophies, cosmetics, Rainbow/Nebula Fuzzies).
8. **Seasonal events** ✅ (branch `q-events`) — `eventData.ts` (8 events: look, 6 challenges + finale, pickup item; year-keyed keepsakes = the only thing a new year adds), `events.ts` (pure rules: windows, progress only while on, idempotent claims, derived grants), `eventsLive.ts` (store hooks), `ui/events.ts` (Now / Calendar / Collection), `ui/eventFx.ts` (weather + colour wash over the board), event pickups in Classic (`Crossing.eventItems`). Checked by `tools/crossing/events-check.ts` + `events-browser.cjs`. Not done: per-event map decor / obstacles in the 3D scene (the `decor` tags in the theme are waiting for a view that uses them).
9. **Polish** — dynamic music, sfx, splash/weather effects, camera, victory/defeat sequences, performance on phones, full regression.

Nothing is deployed to the live site until a stage is verified **and** the owner says so.
