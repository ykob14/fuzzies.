/**
 * Bots for the town rivals (land/rivals.ts) — RULES only (no DOM, no Three.js). Each bot plays one game's rules the way a
 * person would: it looks, decides every so often (`skill.think`), sometimes gets it wrong (`skill.miss`), aims a little off
 * (`skill.noise`) and reacts late to new things (`skill.react`). Medium bots land around a silver score, easy ones around
 * bronze, so a player who plays well wins. Calibrated in `adv/rivals-check.ts`.
 */
import type { Bot, BotCtx, BotOut, RivalBot } from '../rivals';
import type { Vec2 } from '../arcade';
import { BASKET, type FruitSim, type Falling } from './fruit';
import type { BalloonSim, Balloon } from './balloon';
import type { FishingSim } from './fishing';
import { LANES, type RunSim, type Thing } from './obstacle';
import type { HarvestSim } from './harvest';
import type { GardenSim } from './garden';
import type { DeliverySim } from './delivery';
import type { MiningSim } from './mining';
import type { SnowballSim } from './snowball';
import type { BeachSim } from './beach';
import type { SkateSim } from './skate';
import { BEACH, type TreasureSim } from './treasure';

const clamp = (v: number) => Math.max(-1, Math.min(1, v));
const decide = (c: BotCtx, k = 1): boolean => {
  const next = (c.mem.next as number | undefined) ?? c.skill.react;
  if (c.t < next) return false;
  c.mem.next = c.t + c.skill.think * k * (0.75 + c.rnd() * 0.5);
  return true;
};
/** a timer per action: true when `key` has waited its reaction time since it was first wanted */
const after = (c: BotCtx, key: string, wait: number): boolean => {
  const at = c.mem[key] as number | undefined;
  if (at === undefined) { c.mem[key] = c.t + wait * (0.6 + c.rnd() * 0.8); return false; }
  if (c.t < at) return false;
  delete c.mem[key]; return true;
};
const dist = (a: Vec2, b: Vec2) => Math.hypot(a.x - b.x, a.z - b.z);
/** a stick push towards `t`, a little off course (noise), slowing when close */
const toward = (from: Vec2, t: Vec2, c: BotCtx, stop = 0.2): BotOut => {
  const dx = t.x - from.x, dz = t.z - from.z, d = Math.hypot(dx, dz);
  if (d < stop) return { x: 0, z: 0 };
  const wob = ((c.mem.wob as number | undefined) ?? 0);
  const a = Math.atan2(dx, dz) + wob;
  const k = d < 1.2 ? Math.max(0.35, d / 1.2) : 1;
  return { x: Math.sin(a) * k, z: Math.cos(a) * k };
};
/** pick the nearest of `list` — or, on a slip, a random one — and keep it until the next decision */
function choose<T extends { x: number; z: number }>(c: BotCtx, key: string, list: T[], from: Vec2, alive: (t: T) => boolean, rank?: (t: T) => number): T | null {
  let cur = c.mem[key] as T | undefined;
  if (cur && !alive(cur)) cur = undefined;
  if (!cur || decide(c)) {
    c.mem.wob = (c.rnd() - 0.5) * c.skill.noise * 1.2;
    const pool = list.filter(alive);
    if (!pool.length) { delete c.mem[key]; return null; }
    if (c.rnd() < c.skill.miss) cur = pool[Math.floor(c.rnd() * pool.length)];
    else { const r = rank ?? ((t: T) => dist(t, from)); cur = pool.reduce((a, b) => (r(b) < r(a) ? b : a)); }
    c.mem[key] = cur;
  }
  return cur ?? null;
}

/** Fruit Catcher: run under the next fruit to land (aim a little off), dodge pinecones when it notices them. */
export const fruitBot: Bot<FruitSim> = (s, c) => {
  if (decide(c, 1.3)) {
    const live = s.live;
    // it only notices fruit once it has dropped a bit (late reactions see less of the sky)
    const seen = (it: Falling) => it.y < 6.4 - c.skill.react * 2.2;
    let best: Falling | null = null, bt = Infinity;
    if (c.rnd() < c.skill.miss) { const pool = live.filter((it) => it.kind !== 'cone' && seen(it)); best = pool.length ? pool[Math.floor(c.rnd() * pool.length)] : null; }
    else for (const it of live) { if (it.kind === 'cone' || !seen(it)) continue; const h = it.y - (BASKET.y + it.r); const t = h <= 0 ? 0 : h / Math.max(it.vy, 2); if (t < bt) { bt = t; best = it; } }
    let tx = best ? best.x + (c.rnd() - 0.5) * c.skill.noise * 2.4 : (c.mem.tx as number | undefined) ?? s.x;
    if (c.rnd() > c.skill.miss) for (const it of live) if (it.kind === 'cone' && it.y < 3 && Math.abs(it.x - s.x) < BASKET.hw + 0.5 && (!best || it.y < best.y)) tx = it.x >= s.x ? s.x - 2.2 : s.x + 2.2;
    c.mem.tx = Math.max(-s.hw, Math.min(s.hw, tx));
  }
  const tx = (c.mem.tx as number | undefined) ?? s.x;
  return { x: clamp((tx - s.x) * 1.4 - s.vx * 0.12) };
};

/** Balloon Pop: taps at a steady pace — shiny and high ones first; now and then a tap misses or hits a spiky one. */
export const balloonBot: Bot<BalloonSim> = (s, c) => {
  if (!decide(c, 2.6)) return {};
  if (c.rnd() < c.skill.miss) return {}; // a tap that missed
  const seen = s.live.filter((b) => b.y > 0.6 + c.skill.react * 1.6);
  if (!seen.length) return {};
  let pick: Balloon | undefined;
  if (c.rnd() < c.skill.noise * 0.25) pick = seen[Math.floor(c.rnd() * seen.length)]; // grabbed whatever was nearest, spiky or not
  else {
    const good = seen.filter((b) => b.kind !== 'spiky');
    good.sort((a, b) => (b.kind === 'shiny' ? 1 : 0) - (a.kind === 'shiny' ? 1 : 0) || b.y - a.y);
    pick = good[c.rnd() < c.skill.noise ? Math.floor(c.rnd() * good.length) : 0];
  }
  if (pick) s.pop(pick.id);
  return {};
};

/** Fishing Frenzy: casts at the nearest ripples, hooks when the float dips (a little late), reels while the fish is calm. */
export const fishingBot: Bot<FishingSim> = (s, c) => {
  if (s.phase === 'idle') { if (after(c, 'cast', c.skill.react * 1.5)) s.castAuto(); return { hold: false }; }
  if (s.phase === 'bite') { if (after(c, 'hook', c.skill.react * 0.5 + c.skill.think * 0.4)) s.press(); return { hold: false }; }
  if (s.phase === 'reeling') {
    if (decide(c, 0.5)) c.mem.reel = c.rnd() < c.skill.miss * 0.5 ? !s.calm : s.calm;
    return { hold: !!c.mem.reel };
  }
  return { hold: false };
};

/** Obstacle Run: picks the safest lane ahead (rocks, carts and boulders worst, puddles and mud a nuisance), reaches for stars
 *  and power-ups, jumps logs and puddles and ducks vines — but only what it noticed in time. */
export const obstacleBot: Bot<RunSim> = (s, c) => {
  const look = 18 - c.skill.react * 5, notice = 1 - c.skill.miss * 0.6, seeks = Math.max(0, 1 - c.skill.noise * 2), v = s.pace;
  const noticed = (c.mem.noticed as Map<number, boolean> | undefined) ?? (c.mem.noticed = new Map<number, boolean>()) as Map<number, boolean>;
  const ah = s.ahead.filter((t) => t.d > s.dist - 0.2 && t.d - s.dist < look && (noticed.has(t.id) ? noticed.get(t.id) : (noticed.set(t.id, c.rnd() < notice), noticed.get(t.id))));
  if (noticed.size > 400) noticed.clear();
  const laneOf = (t: Thing) => (t.kind === 'cart' ? [t.lane, t.phase] : [Math.round((t.x - LANES[0]) / 2.2)]);
  const HARD = ['rock', 'boulder', 'cart'];
  const danger = (l: number, within: number) => ah.filter((t) => t.d - s.dist < within && laneOf(t).includes(l) && HARD.includes(t.kind));
  const soft = (l: number) => ah.filter((t) => t.lane === l && (t.kind === 'puddle' || t.kind === 'mud' || t.kind === 'sprinkler')).length;
  const gain = (l: number) => ah.filter((t) => t.lane === l && ['star', 'gold', 'super', 'mushroom', 'shield', 'magnet', 'boost'].includes(t.kind)).reduce((n, t) => n + (t.kind === 'star' ? 1 : 3), 0);
  const bridge = s.sections.find((b) => b.kind === 'bridge' && b.d0 - s.dist < look && b.d1 > s.dist);
  if (decide(c)) {
    const score = (l: number) => (danger(l, look).length ? -100 + (danger(l, look)[0].d - s.dist) : 0) + gain(l) * seeks - soft(l) * 2 - Math.abs(l - s.lane) * 0.3 + (bridge ? (l === 1 ? 50 : -50) : 0);
    let want = [0, 1, 2].sort((a, b) => score(b) - score(a))[0];
    if (Math.abs(want - s.lane) === 2 && danger(1, 3).length) want = s.lane; // never step through a rock
    c.mem.want = want;
  }
  c.mem.toggle = !c.mem.toggle;
  const want = (c.mem.want as number | undefined) ?? s.lane;
  let out: BotOut = { x: 0, z: 0 };
  if (want !== s.lane && c.mem.toggle) out = { x: want > s.lane ? 1 : -1, z: 0 };
  const n = ah.filter((t) => Math.abs(t.x - s.x) < 1 && t.d > s.dist).sort((a, b) => a.d - b.d).find((t) => t.kind !== 'star' || t.y > 1);
  if (n && !s.airborne) {
    const dd = n.d - s.dist;
    if (['log', 'branch', 'bucket', 'puddle', 'mud'].includes(n.kind) && dd < v * 0.36 && dd > v * 0.12) out = { x: out.x, z: -1 };
    else if (n.kind === 'bar' && dd < v * 0.42) out = { x: out.x, z: 1 };
    else if ((n.kind === 'star' || n.kind === 'gold') && n.y > 1 && n.y < 1.8 && dd < v * 0.34 && dd > v * 0.25 && c.rnd() < seeks) out = { x: out.x, z: -1 };
  }
  return out;
};

/** Farm Harvest Rush: walks to a ripe plant (usually the nearest) and picks it. */
export const harvestBot: Bot<HarvestSim> = (s, c) => {
  if (s.reachable()) { if (after(c, 'pick', c.skill.react * 0.6)) s.pick(); return { x: 0, z: 0 }; }
  const t = choose(c, 't', s.ripe, s.you.pos, (p) => s.ripe.includes(p));
  return t ? toward(s.you.pos, { x: t.x, z: t.z + 0.75 }, c, 0.25) : { x: 0, z: 0 };
};

/** Garden Cleanup: walks to the nearest weed and holds PULL on it; saves blooming buds nearby. */
export const gardenBot: Bot<GardenSim> = (s, c) => {
  if (s.reachable()) return { x: 0, z: 0, hold: after(c, 'pull', c.skill.react * 0.4) || !!c.mem.pulling ? ((c.mem.pulling = true), true) : false };
  c.mem.pulling = false;
  const t = choose(c, 't', s.up, s.you.pos, (w) => w.state === 'up');
  return t ? toward(s.you.pos, t, c, 0.1) : { x: 0, z: 0 };
};

/** Package Delivery: loads at the depot, drives to the nearest door on board. */
export const deliveryBot: Bot<DeliverySim> = (s, c) => {
  const D = { x: 0, z: 7.4 };
  const doors = s.cart.map((p) => ({ x: s.houses[p.house].door.x, z: s.houses[p.house].door.z, h: p.house }));
  const t = doors.length ? choose(c, 't', doors, s.you.pos, (d) => s.cart.some((p) => p.house === d.h)) : D;
  if (!t) return { x: 0, z: 0 };
  const go = toward(s.you.pos, t, c, 0);
  const d = dist(s.you.pos, t), k = d < 2.5 ? 0.3 : 0.12;
  const vx = (go.x ?? 0) - s.you.vel.x * k, vz = (go.z ?? 0) - s.you.vel.z * k, l = Math.max(1, Math.hypot(vx, vz));
  return { x: vx / l, z: vz / l };
};

/** Mining Adventure: digs the nearest gem pile, steps away from a rumbling ceiling (if it hears it). */
export const miningBot: Bot<MiningSim> = (s, c) => {
  const d = s.danger;
  if (d && (c.mem.heard ?? (c.mem.heard = c.rnd() >= c.skill.miss))) { const dx = s.you.pos.x - d.x, dz = s.you.pos.z - d.z, l = Math.hypot(dx, dz) || 1; return { x: dx / l, z: dz / l }; }
  if (!d) delete c.mem.heard;
  if (s.reachable()) { if (after(c, 'dig', c.skill.react * 0.5 + 0.1)) s.dig(); return { x: 0, z: 0 }; }
  const t = choose(c, 't', s.up, s.you.pos, (p) => p.state === 'up');
  return t ? toward(s.you.pos, { x: t.x, z: t.z + 0.6 }, c, 0.2) : { x: 0, z: 0 };
};

/** Snowball Challenge: throws at moving / far targets first, leading the moving ones — not always quite right. */
export const snowballBot: Bot<SnowballSim> = (s, c) => {
  if (s.cooldown > 0 || !decide(c, 5)) return {};
  const ups = s.live.filter((t) => t.state === 'up' && !t.hit);
  if (!ups.length) return {};
  const rank: Record<string, number> = { moving: 3, far: 2, near: 1 };
  const tg = c.rnd() < c.skill.miss ? ups[Math.floor(c.rnd() * ups.length)] : ups.sort((a, b) => rank[b.kind] - rank[a.kind])[0];
  const d = Math.hypot(tg.x, tg.z);
  const p = s.predict(tg, (0.45 + d * 0.065) * (1 + (c.rnd() - 0.5) * c.skill.noise * 0.6));
  const off = c.skill.noise * 2.2;
  s.throwAt(p.x + (c.rnd() - 0.5) * off, p.z + (c.rnd() - 0.5) * off);
  return {};
};

/** Beach Cleanup: picks up the nearest litter, empties a full bag in the bin, hops over crabs (sometimes). */
export const beachBot: Bot<BeachSim> = (s, c) => {
  const B = { x: 9.4, z: 5.6 };
  if (s.bag.length >= 6) return toward(s.you.pos, B, c, 0);
  const crab = s.crabs.find((k) => Math.hypot(k.x - s.you.pos.x, k.z - s.you.pos.z) < 1.1);
  if (crab && after(c, 'hop', c.skill.react * 0.4) && c.rnd() >= c.skill.miss) { s.you.heading = Math.atan2(s.you.pos.x - crab.x, s.you.pos.z - crab.z); s.hop(); }
  const t = choose(c, 't', s.sand, s.you.pos, (l) => l.state === 'sand');
  return t ? toward(s.you.pos, t, c, 0) : { x: 0, z: 0 };
};

/** Ice Skating: leans towards the lit gate (the way a player does — the skater's assist carves it in), now and then spins on a straight. */
export const skateBot: Bot<SkateSim> = (s, c) => {
  if (decide(c, 1.1)) {
    const a = s.aim();
    const err = Math.atan2(Math.sin(Math.atan2(a.x - s.pos.x, a.z - s.pos.z) - s.heading), Math.cos(Math.atan2(a.x - s.pos.x, a.z - s.pos.z) - s.heading));
    const wrong = c.rnd() < c.skill.miss * 0.35;
    c.mem.lean = Math.abs(err) < 0.12 ? 0 : (wrong ? 1 : -1) * Math.sign(err) * clamp(0.45 + c.skill.speed * 0.55);
    if (!s.spun && s.spinning === 0 && s.speed > 3 && Math.abs(err) < 0.5 && c.rnd() < 0.55 * (1 - c.skill.miss)) s.spin();
  }
  return { x: (c.mem.lean as number | undefined) ?? 0, z: 0 };
};

/** Island Treasure Hunt: reads the treasure meter like you do — walks the warmer way, wanders when it's cold, digs when it glows. */
export const treasureBot: Bot<TreasureSim> = (s, c) => {
  const me = s.you.pos;
  if (s.hot) { if (after(c, 'dig', c.skill.react * 0.6 + 0.2)) s.dig(); return { x: 0, z: 0 }; }
  if (decide(c, 2.2)) {
    let best = -1, ang = 0;
    const off = c.rnd() * Math.PI;
    for (let k = 0; k < 4; k++) { const a = off + (k / 4) * Math.PI * 2; const h = s.heatAt(me.x + Math.sin(a) * 1.5, me.z + Math.cos(a) * 1.5); if (h > best) { best = h; ang = a; } }
    if (best < 0.04 || c.rnd() < c.skill.miss * 0.5) {
      // cold: keep wandering towards a spot on the island
      const w = c.mem.wander as Vec2 | undefined;
      if (!w || dist(me, w) < 1.2 || c.rnd() < 0.15) c.mem.wander = { x: (c.rnd() - 0.5) * 2 * (BEACH.hw - 1.5), z: (c.rnd() - 0.5) * 2 * (BEACH.hd - 1.5) };
      c.mem.aim = c.mem.wander;
    } else { const a = ang + (c.rnd() - 0.5) * c.skill.noise * 1.6; c.mem.aim = { x: me.x + Math.sin(a) * 3, z: me.z + Math.cos(a) * 3 }; }
    // now and then digs a warm spot that isn't quite it
    if (s.warm && c.rnd() < c.skill.miss * 0.3) s.dig();
  }
  const aim = c.mem.aim as Vec2 | undefined;
  return aim ? toward(me, aim, c, 0.3) : { x: 0, z: 0 };
};

/**
 * Every game with town rivals: its bot, how its `step` takes the bot's output, and how much of the round each skill spends
 * idle (`lazy`, the knob that sets the difficulty). Tuned in `adv/rivals-check.ts` so a medium rival scores about a third of
 * the way from silver to gold and an easy one a little over bronze — play at gold level and you win.
 */
export const BOTS = {
  fruit: { play: fruitBot, kind: 'input' },
  balloon: { play: balloonBot, kind: 'none' },
  fishing: { play: fishingBot, kind: 'hold', lazy: { medium: 0.2, easy: 0.43 } },
  obstacle: { play: obstacleBot, kind: 'input', lazy: { medium: 0.62, easy: 0 } },
  harvest: { play: harvestBot, kind: 'input', lazy: { medium: 0.37, easy: 0.72 } },
  garden: { play: gardenBot, kind: 'inputHold', lazy: { medium: 0.07, easy: 0.3 } },
  delivery: { play: deliveryBot, kind: 'input', lazy: { medium: 0.26, easy: 0.55 } },
  mining: { play: miningBot, kind: 'input', lazy: { medium: 0.33, easy: 0.5 } },
  snowball: { play: snowballBot, kind: 'none', lazy: { medium: 0.83, easy: 0.68 } },
  beach: { play: beachBot, kind: 'input', lazy: { medium: 0.46, easy: 0.68 } },
  skate: { play: skateBot, kind: 'input', lazy: { medium: 0.55, easy: 0.72 } },
  treasure: { play: treasureBot, kind: 'input', lazy: { medium: 0.88, easy: 0.9 } },
} satisfies Record<string, RivalBot<any>>;
