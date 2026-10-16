/**
 * Fuzzies Land screen: the 3D town plus its HUD — level & XP, coins, population, Fuzzies — and the
 * panels for building, planting, workshops, orders and the barn. Rules: land/rules.ts. Drawing: land/view3d.ts.
 */
import type { Screen } from '../app';
import { openShop } from '../shop';
import * as L from '../../land/rules';
import * as E from '../../land/events';
import * as TR from '../../land/trophies';
import * as A from '../../land/adventures';
import * as PK from '../../land/parking/progress';
import type { Payment } from '../../land/parking/game';
import { conversation, dailyPill, adventuresBody, resultsScreen, scoreResults } from '../landAdventure';
import { gamesBody } from '../landGames';
import { GAME_LOADERS } from '../../land/games/index';
import { api, ApiError, cloudEnabled } from '../../core/api';
import type { LandView, Pick } from '../../land/view3d';
import { accounts } from '../../core/account';
import { rewards } from '../../core/rewards';
import { sfx } from '../../game/sound';
import { music } from '../../game/music';
import { travel } from '../travel';
import { h, btn, icon, fuzzyMark, toast, confirmDialog } from '../dom';
import { mascot } from '../mascot';
import { isTouch } from '../../core/util';
import { landIcon, goodIcon, type LandIcon } from '../landIcons';
import './../landSkin.css';
import { TutorialManager, type Reward } from '../../land/tutorial';
import { mountTutorial, type TutTarget } from '../landTutorial';

type Panel = null | { kind: 'shop'; tab: L.Kind | 'farm' | 'fuzzies' } | { kind: 'building'; id: number } | { kind: 'orders' } | { kind: 'barn' } | { kind: 'events'; tab: string } | { kind: 'adventures' } | { kind: 'games' };

/** The clock events run on (in development a test can set `fz.dev.now` to any date to see a holiday). */
/** the server's clock, once an account has talked to it (missions are issued by server time; the device clock can't hurry them) */
let clockOffset = 0;
const now = (): number => { if (import.meta.env.DEV) { const v = Number(localStorage.getItem('fz.dev.now')); if (v) return v; } return Date.now() + clockOffset; };

const fmt = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return s >= 3600 ? `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m` : s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`;
};

/** a small pill: a picture and a number/word (coins, XP, goods…) */
const chip = (ic: Node | null, text: string, cls = ''): HTMLElement => h('span', { class: `land-chip ${cls}`.trim() }, ic, text);

export function landScreen(): Screen {
  const a = accounts.current!;
  const s: L.LandState = JSON.parse(JSON.stringify(a.land ?? L.freshLand()));
  const lastVisit = s.savedAt;
  L.refillOrders(s);
  E.decorateOrders(s, now()); // orders made during a holiday pay event tokens too
  A.serverIssuesSets(!!a.cloud && cloudEnabled); // cloud accounts get their next mission set from the server (10 min after the last mission)
  const oldTrophies = TR.syncTrophies(s); // a trophy for every mini-game already played (towns from before trophies too)
  // Fuzzies Parking Escape: every town gets the parking lot (by the Town Hall, or in Storage when the land is full)
  const lotNew = L.ensureParking(s, now());
  if (lotNew) setTimeout(() => { save(); toast(lotNew === 'placed' ? 'New in town: Parking Escape! Tap the parking lot (or the car button) to play.' : 'Parking Escape is in your Storage — place it from Edit town, or tap the car button to play.', 'good', 6000); }, 3200);
  if (oldTrophies.length) setTimeout(() => { save(); toast(`${oldTrophies.length === 1 ? 'A trophy' : `${oldTrophies.length} trophies`} for the mini-games you’ve played — place ${oldTrophies.length === 1 ? 'it' : 'them'} from Build → Decor`, 'good', 5000); }, 2500);

  const wrap = h('div', { class: 'land-stage' });
  const overlay = h('div', { class: 'land-overlay', 'aria-hidden': 'true' });
  const hud = h('div', { class: 'land-hud' });
  // the Fuzzies counter opens the shop right here (or Rewards when paying isn't on)
  hud.addEventListener('click', (e) => { if ((e.target as HTMLElement).closest('[data-k="fz"]')) { e.preventDefault(); void openShop(); } });
  const side = h('div', { class: 'land-side' });
  // the toolbar and the side buttons can be tucked away (remembered on this device)
  const UI_KEY = 'fz.land.ui';
  const prefs: { dock: boolean; side: boolean } = (() => { try { return { dock: true, side: true, ...JSON.parse(localStorage.getItem(UI_KEY) || '{}') }; } catch { return { dock: true, side: true }; } })();
  const savePrefs = () => { try { localStorage.setItem(UI_KEY, JSON.stringify(prefs)); } catch { /* private mode */ } };
  const tools = h('div', { class: 'land-dock-tools' });
  const dockHide = h('button', { class: 'land-dock-hide', type: 'button', title: 'Hide the toolbar', 'aria-label': 'Hide the toolbar' }, landIcon('chevDown', 18));
  const bar = h('div', { class: 'land-dock' }, tools, dockHide);
  const dockTab = h('button', { class: 'land-dock-tab', type: 'button', title: 'Show the toolbar', 'aria-label': 'Show the toolbar' }, landIcon('chevUp', 20), h('span', null, 'Menu'), h('i', { class: 'land-dock-dot' }));
  const paintDock = () => {
    bar.classList.toggle('tucked', !prefs.dock);
    dockTab.classList.toggle('show', !prefs.dock);
    dockHide.setAttribute('aria-expanded', String(prefs.dock));
  };
  dockHide.addEventListener('click', () => { prefs.dock = false; savePrefs(); paintDock(); });
  dockTab.addEventListener('click', () => { prefs.dock = true; savePrefs(); paintDock(); });
  const sheet = h('section', { class: 'land-sheet', hidden: true });
  // The panel can be moved (owner: it was cut off at the bottom of a laptop screen). On computers and tablets it's a floating
  // window in the middle of the screen that you drag by its top edge or title row; on phones it's a bottom sheet you pull up
  // to make taller and pull down to close. Content always scrolls inside it, so nothing is ever off the screen.
  const sheetPos = { x: 0, y: 0, moved: false };
  const sheetFloat = () => matchMedia('(min-width: 761px)').matches;
  const placeSheet = () => {
    if (!sheetFloat() || !sheetPos.moved) { sheet.classList.remove('moved'); sheet.style.removeProperty('--sx'); sheet.style.removeProperty('--sy'); return; }
    const host = sheet.parentElement; if (!host) return;
    const W = host.clientWidth, H = host.clientHeight, w = sheet.offsetWidth, hh = sheet.offsetHeight;
    sheetPos.x = Math.max(8, Math.min(Math.max(8, W - w - 8), sheetPos.x));
    sheetPos.y = Math.max(8, Math.min(Math.max(8, H - hh - 8), sheetPos.y));
    sheet.style.setProperty('--sx', `${sheetPos.x}px`); sheet.style.setProperty('--sy', `${sheetPos.y}px`);
    sheet.classList.add('moved');
  };
  let sheetDrag: { id: number; sx: number; sy: number; ox: number; oy: number; h0: number; moved: boolean } | null = null;
  sheet.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || sheetDrag) return;
    const t = e.target as HTMLElement;
    if (t.closest('button, a, input, select, textarea, summary, .btn, .land-tab')) return;
    const r = sheet.getBoundingClientRect();
    if (!(t.closest('.land-sheet-top') || e.clientY - r.top < 30)) return; // the grip strip or the title row
    // the resting spot (offsetLeft/Top ignore the entry animation that may still be running)
    if (sheetFloat() && !sheetPos.moved) { sheetPos.x = sheet.offsetLeft - sheet.offsetWidth / 2; sheetPos.y = sheet.offsetTop - sheet.offsetHeight / 2; }
    sheetDrag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, ox: sheetPos.x, oy: sheetPos.y, h0: r.height, moved: false };
    try { sheet.setPointerCapture(e.pointerId); } catch { /* synthetic events */ }
    sheet.classList.add('dragging'); sheet.classList.remove('settle');
    e.preventDefault();
  });
  sheet.addEventListener('pointermove', (e) => {
    if (!sheetDrag || e.pointerId !== sheetDrag.id) return;
    const dx = e.clientX - sheetDrag.sx, dy = e.clientY - sheetDrag.sy;
    if (!sheetDrag.moved && Math.hypot(dx, dy) < 4) return;
    sheetDrag.moved = true;
    if (sheetFloat()) { sheetPos.moved = true; sheetPos.x = sheetDrag.ox + dx; sheetPos.y = sheetDrag.oy + dy; placeSheet(); }
    else if (dy > 0) { sheet.style.transform = `translate(-50%, ${dy}px)`; sheet.style.maxHeight = ''; }
    else { const host = sheet.parentElement; sheet.style.transform = ''; sheet.style.maxHeight = `${Math.min((host?.clientHeight ?? innerHeight) * 0.92, sheetDrag.h0 - dy)}px`; }
  });
  const endSheetDrag = (e: PointerEvent) => {
    if (!sheetDrag || e.pointerId !== sheetDrag.id) return;
    const dy = e.clientY - sheetDrag.sy, d = sheetDrag; sheetDrag = null;
    sheet.classList.remove('dragging');
    if (sheetFloat() || !d.moved) return;
    sheet.classList.add('settle'); sheet.style.transform = ''; sheet.style.maxHeight = '';
    if (dy > 110) openPanel(null);
    else sheet.classList.toggle('tall', dy < -50 ? true : dy > 30 ? false : sheet.classList.contains('tall'));
  };
  sheet.addEventListener('pointerup', endSheetDrag);
  sheet.addEventListener('pointercancel', endSheetDrag);
  const placeBar = h('div', { class: 'land-place', hidden: true });
  let view: LandView | null = null;
  let panel: Panel = null;
  let placing: { item: string; x: number; z: number; rot: L.Rot; moving?: number; store?: number } | null = null;
  let alive = true;

  // ---------- saving & rewards ----------
  // Every change is saved straight away (and synced to your account); timers are clock times, so
  // crops, workshops and construction keep going while you're away.
  const savedEl = h('span', { class: 'land-saved', title: 'Your town is saved' }, '✓ Saved');
  function save(): void {
    s.savedAt = Date.now();
    try {
      accounts.update((x) => { x.land = JSON.parse(JSON.stringify(s)); });
      savedEl.textContent = accounts.current?.cloud ? '☁︎ Saved' : '✓ Saved';
      savedEl.classList.remove('flash'); void savedEl.offsetWidth; savedEl.classList.add('flash');
    } catch (e) {
      console.error(e);
      savedEl.textContent = '⚠︎ Not saved';
      toast('Couldn’t save your town — your device storage may be full.', 'bad');
    }
    view?.sync(s);
    renderHud();
  }
  /** Holiday weather on the town (the soonest-ending event sets the mood), unless switched off in Settings. */
  let seasonKey = '';
  function applySeason(): void {
    const ev = E.activeEvents(now())[0];
    const on = accounts.current?.settings.seasonFx !== false;
    const key = ev && on ? ev.key : '';
    if (key === seasonKey && view) return;
    seasonKey = key;
    view?.setSeason(ev && on ? { atmo: ev.holiday.atmo, tint: ev.holiday.tint, ghosts: ev.holiday.id === 'halloween' } : null);
  }
  /** Another device saved a newer town (it arrived through sync): switch to it. */
  function adoptRemote(): void {
    const remote = accounts.current?.land;
    if (!remote || remote.savedAt <= s.savedAt) return;
    for (const k of Object.keys(s)) delete (s as unknown as Record<string, unknown>)[k];
    Object.assign(s, JSON.parse(JSON.stringify(remote)));
    TR.syncTrophies(s);
    L.ensureParking(s, now());
    // a different copy of the town: the layout kept for "Cancel editing" no longer applies
    if (session) { session = null; persistSession(); undoStack.length = 0; redoStack.length = 0; sel.clear(); if (selMode) paintSel(); }
    view?.sync(s);
    renderHud();
    renderPanel();
  }

  /** Little coins / stars that fly from where you earned them to the counter at the top. */
  function burst(kind: 'coin' | 'star', from: { x: number; y: number } | null, n: number): void {
    if (!from || a.settings.reduceMotion) return;
    const to = (kind === 'coin' ? hud.querySelector('[data-k="coins"] .land-cap-ic') : hud.querySelector('.land-lvl-n')) as HTMLElement | null;
    if (!to) return;
    const r = to.getBoundingClientRect(), sr = stage.getBoundingClientRect();
    const tx = r.left + r.width / 2 - sr.left, ty = r.top + r.height / 2 - sr.top;
    for (let i = 0; i < Math.min(8, Math.max(3, n)); i++) {
      const el = h('span', { class: 'land-fly' }, landIcon(kind, 26));
      stage.append(el);
      const sx = from.x + (Math.random() - 0.5) * 50, sy = from.y + (Math.random() - 0.5) * 30;
      const mx = (sx + tx) / 2 + (Math.random() - 0.5) * 120, my = Math.min(sy, ty) - 60 - Math.random() * 60;
      const anim = el.animate([
        { transform: `translate(${from.x}px, ${from.y}px) scale(.4)`, opacity: 0 },
        { transform: `translate(${sx}px, ${sy}px) scale(1.1)`, opacity: 1, offset: 0.18 },
        { transform: `translate(${mx}px, ${my}px) scale(1)`, opacity: 1, offset: 0.55 },
        { transform: `translate(${tx}px, ${ty}px) scale(.6)`, opacity: 0.9 },
      ], { duration: 750 + i * 70, easing: 'cubic-bezier(.45,0,.35,1)', delay: i * 45 });
      anim.onfinish = () => { el.remove(); to.classList.remove('land-hit'); void to.offsetWidth; to.classList.add('land-hit'); };
    }
  }
  const screenAt = (id: number) => { const p = view?.screenOf(id); return p ? { x: p.x, y: p.y } : null; };

  /**
   * Harvested crops / workshop goods hop out of the building, bounce once, then stream into the Barn button, which pulses and
   * fills (DOM animation — nothing for the 3D scene to draw). Several buildings at once ripple one after another.
   */
  function burstGoods(goods: string[], at: number, delay = 0): void {
    const from = screenAt(at);
    if (!from || !goods.length || a.settings.reduceMotion) return;
    const to = tools.querySelector('.land-dock-btn.is-barn .land-dock-ic') as HTMLElement | null ?? dockTab;
    const r = to.getBoundingClientRect(), sr = stage.getBoundingClientRect();
    const visible = r.width > 0 && r.bottom > sr.top && r.top < sr.bottom;
    const tx = (visible ? r.left + r.width / 2 : sr.left + sr.width / 2) - sr.left, ty = (visible ? r.top + r.height / 2 : sr.bottom - 40) - sr.top;
    goods.slice(0, 6).forEach((gid, i) => {
      const el = h('span', { class: 'land-fly land-fly-good' }, L.good(gid).emoji);
      stage.append(el);
      const sx = from.x + (i - (Math.min(6, goods.length) - 1) / 2) * 18, sy = from.y;
      const hopY = sy - 46 - Math.random() * 18;
      const anim = el.animate([
        { transform: `translate(${from.x}px, ${from.y}px) scale(.3)`, opacity: 0 },
        { transform: `translate(${sx}px, ${hopY}px) scale(1.25)`, opacity: 1, offset: 0.2 },
        { transform: `translate(${sx}px, ${sy - 8}px) scale(1, .85)`, opacity: 1, offset: 0.32 },
        { transform: `translate(${sx}px, ${sy - 14}px) scale(1)`, opacity: 1, offset: 0.42 },
        { transform: `translate(${(sx + tx) / 2}px, ${Math.min(sy, ty) - 70}px) scale(1.05)`, opacity: 1, offset: 0.7 },
        { transform: `translate(${tx}px, ${ty}px) scale(.55)`, opacity: 0.85 },
      ], { duration: 1050, easing: 'cubic-bezier(.4,0,.3,1)', delay: delay + i * 55 });
      anim.onfinish = () => { el.remove(); if (visible) { to.classList.remove('land-hit'); void to.offsetWidth; to.classList.add('land-hit'); } };
    });
  }

  function gain(g: L.Gain, at: number, label?: string): void {
    if (label) view?.float(label, at);
    if (g.coins) burst('coin', screenAt(at), Math.ceil(g.coins / 8));
    if (g.xp) setTimeout(() => burst('star', screenAt(at), Math.ceil(g.xp! / 4)), 200);
    if (g.xp) setTimeout(() => view?.float(`+${g.xp} XP`, at, 'xp'), 250);
    if (g.fuzzies) rewards.earn(g.fuzzies, 'Fuzzies Land order');
    for (const lv of g.levelUps ?? []) levelUp(lv);
  }

  function levelUp(lv: number): void {
    document.querySelector('.land-away')?.remove(); // one card at a time
    const n = L.levelFuzzies(lv);
    rewards.earn(n, `Fuzzies Land level ${lv}!`);
    sfx.level();
    const unlocked: HTMLElement[] = [...L.ITEMS.filter((i) => i.level === lv).map((i) => h('span', null, thumb(i.id, i.emoji), i.name)), ...L.GOODS.filter((g) => g.level === lv).map((g) => h('span', null, goodIcon(g.id, 34), g.name))];
    const card = h('div', { class: 'land-levelup' },
      mascot(70, { sparkles: true, interactive: false }),
      h('small', { class: 'land-levelup-k' }, 'Level up!'),
      h('h2', null, String(lv)),
      h('div', { class: 'land-levelup-rew' }, chip(fuzzyMark(20), `+${n}`), chip(landIcon('coin', 20), `+${50 + lv * 10}`)),
      unlocked.length ? h('div', { class: 'land-unlocks' }, h('small', null, 'New to unlock'), h('div', null, ...unlocked)) : null,
      btn('Yay!', { kind: 'primary', class: 'btn-block', onClick: () => card.remove() }));
    stage.append(card);
  }

  const spendFuzzies = (n: number) => { accounts.update((x) => { x.fuzzies -= n; }); };

  // ---------- HUD ----------
  const shown = new Map<string, number>();
  /** A number that counts up (or down) to its new value, like a slot machine. */
  function counter(key: string, n: number): HTMLElement {
    const el = h('b', { class: 'land-num' }, n.toLocaleString());
    const from = shown.get(key);
    shown.set(key, n);
    if (from !== undefined && from !== n && !a.settings.reduceMotion) {
      const t0 = performance.now(), dur = Math.min(700, 250 + Math.abs(n - from) * 8);
      el.classList.add('bump');
      const step = (t: number) => {
        const k = Math.min(1, (t - t0) / dur);
        el.textContent = Math.round(from + (n - from) * (1 - Math.pow(1 - k, 3))).toLocaleString();
        if (k < 1 && el.isConnected) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }
    return el;
  }
  const backBtn = h('button', { class: 'land-round land-back', type: 'button', title: 'Back to Fuzzies', 'aria-label': 'Back to Fuzzies' }, landIcon('back', 22));
  backBtn.addEventListener('click', () => { location.hash = '#/home'; });
  let hudSig = '';
  function renderHud(): void {
    // only rebuild when something shown actually changed (rebuilding every second could swallow a tap)
    const sig = JSON.stringify([s.level, s.xp, s.coins, L.population(s), rewards.balance(), L.barnUsed(s), s.orders.filter((o) => L.canFill(s, o)).length, L.awaySummary(s), E.activeEvents(now()).map((e) => e.key), E.claimable(s, now())]);
    if (sig === hudSig) return;
    hudSig = sig;
    const need = L.xpFor(s.level);
    const pct = Math.min(100, (s.xp / need) * 100);
    const pop = L.population(s);
    const ready = s.orders.filter((o) => L.canFill(s, o)).length;
    const cap = (ic: Node, key: string, n: number, title: string, href?: string) =>
      h(href ? 'a' : 'div', { class: 'land-cap', 'data-k': key, title, ...(href ? { href } : {}) }, h('span', { class: 'land-cap-ic' }, ic), counter(key, n), href ? h('i', { class: 'land-cap-plus' }, '+') : null);
    hud.replaceChildren(
      h('div', { class: 'land-hud-l' }, backBtn,
        h('div', { class: 'land-lvl', title: `${s.xp} / ${need} XP to level ${s.level + 1}` },
          h('span', { class: 'land-lvl-n', style: `--p:${pct}%` }, h('b', null, String(s.level))),
          h('div', { class: 'land-lvl-t' }, h('b', null, 'Level'), h('div', { class: 'land-xp' }, h('div', { style: `width:${pct}%` }), h('small', null, `${s.xp} / ${need}`))))),
      daily.el,
      h('div', { class: 'land-hud-r' },
        cap(landIcon('coin', 30), 'coins', s.coins, 'Coins'),
        cap(landIcon('pop', 30), 'pop', pop, 'Fuzzies living here'),
        cap(fuzzyMark(30), 'fz', rewards.balance(), 'Your Fuzzies — tap to get more', '#/rewards'),
        savedEl));
    const tool = (key: string, ic: LandIcon, label: string, onClick: () => void, badge = 0, extra: Node | null = null) => {
      const prev = badges.get(key) ?? 0;
      badges.set(key, badge);
      const b = h('button', { class: `land-dock-btn is-${key} ${badge > prev ? 'nudge' : ''}`, type: 'button', 'aria-label': badge ? `${label} (${badge})` : label },
        h('span', { class: 'land-dock-ic' }, landIcon(ic, 40)), h('span', { class: 'land-dock-l' }, label), extra,
        badge ? h('i', { class: `land-badge ${badge > prev ? 'pop' : ''}` }, String(badge)) : null);
      b.addEventListener('click', onClick);
      return b;
    };
    const away = L.awaySummary(s);
    const waiting = away.crops + away.goods + away.built;
    const fill = Math.min(1, L.barnUsed(s) / L.barnCap(s.level));
    tools.replaceChildren(...[
      waiting ? tool('collect', 'basket', 'Collect', collectAllNow, waiting) : null,
      replantN() ? tool('replant', 'wheat', 'Replant', replantNow, replantN()) : null,
      tool('build', 'build', 'Build', () => openPanel({ kind: 'shop', tab: 'house' })),
      tool('games', 'portal', 'Games', () => (panel?.kind === 'games' ? openPanel(null) : openPanel({ kind: 'games' })), A.setStatus(s, now()).ready ? 1 : 0),
      E.activeEvents(now()).length ? tool('events', 'festival', E.activeEvents(now())[0].holiday.short, () => openPanel({ kind: 'events', tab: E.activeEvents(now())[0].key }), E.claimable(s, now())) : null,
      tool('orders', 'parcel', 'Orders', () => openPanel({ kind: 'orders' }), ready),
      tool('barn', 'barnBig', 'Barn', () => openPanel({ kind: 'barn' }), 0, h('i', { class: `land-meter ${fill > 0.85 ? 'full' : ''}`, title: `${L.barnUsed(s)} / ${L.barnCap(s.level)}` }, h('b', { style: `width:${fill * 100}%` })))].filter((x) => x !== null) as HTMLElement[]);
    dockTab.classList.toggle('alert', waiting > 0 || ready > 0);
  }
  const badges = new Map<string, number>();

  /** Empty fields that remember their crop (what the Replant button would sow). */
  const replantN = () => L.replantable(s).ids.length;
  /** Sow every empty field again with what grew there last, in one tap (as far as the coins go). */
  function replantNow(): void {
    const r = L.replantAll(s);
    if (!r.planted.length) { toast('Not enough coins for seeds.', 'info'); return; }
    sfx.plant();
    r.planted.forEach((id, i) => setTimeout(() => { if (!alive) return; view?.bounce(id); const f = s.buildings.find((b) => b.id === id); if (f?.crop) view?.float(L.good(f.crop.good).emoji, id); }, i * 70));
    if (r.left) toast(`Planted ${r.planted.length} — not enough coins for the other ${r.left}.`, 'info');
    save();
    tut.emit('plant');
  }

  /** Harvest, collect and open everything that's ready, in one tap. */
  function collectAllNow(): void {
    const before = s.stats.harvests;
    const r = L.collectAll(s);
    const harvestsNow = s.stats.harvests - before;
    if (harvestsNow) { const drop = E.harvested(s, harvestsNow, now()); if (drop) setTimeout(() => toast(`+1 ${drop.event.holiday.short} token`, 'good'), 700); }
    const parts = Object.entries(r.got).map(([k, n]) => `${L.good(k).emoji}×${n}`);
    if (!parts.length && !r.built.length) { if (r.full) toast('Your barn is full — fill some orders first.', 'info'); return; }
    sfx.collect();
    const hall = s.buildings.find((b) => b.item === 'hall');
    // a ripple across the town, left to right: each building bounces and sends its goods to the barn
    const order = r.each.map((e) => ({ ...e, x: screenAt(e.id)?.x ?? 0 })).sort((p, q) => p.x - q.x);
    order.slice(0, 12).forEach((e, i) => setTimeout(() => { if (!alive) return; view?.bounce(e.id); if (e.goods.length) { view?.float(e.goods.map((g) => L.good(g).emoji).slice(0, 3).join(''), e.id); burstGoods(e.goods, e.id); } }, i * 75));
    if (order.length > 12 && hall) setTimeout(() => alive && burstGoods(order.slice(12).flatMap((e) => e.goods), hall.id), 12 * 75);
    gain({ xp: r.xp, levelUps: r.levelUps }, hall?.id ?? 0, order.length ? undefined : (parts.join(' ') || '✨'));
    for (const it of r.built) toast(`${L.item(it).emoji} ${L.item(it).name} is ready!`, 'good');
    if (r.full) toast('Your barn is full — a few things are still waiting.', 'info');
    save();
    if (Object.keys(r.got).some((k) => L.good(k).at === 'field')) tut.emit('harvest');
    tut.emit('collect');
    document.querySelector('.land-away')?.remove();
  }

  /** "While you were away…": what finished since your last visit. */
  function welcomeBack(): void {
    const away = L.awaySummary(s);
    if (!away.crops && !away.goods && !away.built) return;
    const mins = Math.round((Date.now() - lastVisit) / 60000);
    if (mins < 2) return; // only after you've actually been away (the Collect button covers the rest)
    const ago = mins < 2 ? '' : mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)} h ${mins % 60} min`;
    const card = h('div', { class: 'land-away' },
      h('div', { class: 'land-away-head' }, mascot(46, { sparkles: false, interactive: false }), h('div', null, h('b', null, 'While you were away…'), ago ? h('small', null, `Gone ${ago} — your town kept busy!`) : null)),
      h('div', { class: 'land-away-list' }, ...[
        away.crops ? chip(goodIcon('wheat', 24), `${away.crops} ready`) : null,
        away.goods ? chip(landIcon('parcel', 24), `${away.goods} made`) : null,
        away.built ? chip(landIcon('house', 24), `${away.built} built`) : null,
      ].filter((x) => x !== null) as HTMLElement[]),
      h('div', { class: 'btn-row' }, btn('Collect all', { kind: 'primary', icon: 'check', onClick: collectAllNow }), btn('Later', { kind: 'ghost', onClick: () => card.remove() })));
    stage.append(card);
  }

  // ---------- panels ----------
  function openPanel(p: Panel): void {
    if (talk) endTalk();
    if (placing) cancelPlacing();
    if (p && selMode) exitSelect();
    if (p) document.querySelector('.land-away')?.remove(); // one card at a time
    panel = p;
    if (p?.kind === 'shop') tut.emit('shopTab', { tab: p.tab });
    view?.select(p?.kind === 'building' ? p.id : null);
    renderPanel();
    showQuick();
  }

  function renderPanel(): void {
    if (!panel) { sheet.hidden = true; return; }
    sheet.hidden = false;
    placeSheet(); // keeps a moved window on the screen
    const close = btn(landIcon('close', 18), { kind: 'plain', size: 'sm', title: 'Close', onClick: () => openPanel(null) });
    // the grip strip + title row are the handle you drag the panel by (a real element so touch can't turn it into a scroll)
    const head = (title: string, sub = '', ic?: Node) => h('div', { class: 'land-sheet-top' }, h('div', { class: 'land-sheet-grip', 'aria-hidden': 'true' }), h('div', { class: 'land-sheet-head' }, ic ? h('span', { class: 'land-sheet-ic' }, ic) : null, h('div', null, h('h3', null, title), sub ? h('small', { class: 'muted' }, sub) : null), close));
    sheet.dataset.kind = panel.kind;
    if (panel.kind === 'shop') sheet.replaceChildren(head('Build', 'Pick one, then choose its spot', landIcon('hammer', 34)), shopBody(panel.tab));
    else if (panel.kind === 'orders') sheet.replaceChildren(head('Orders', 'Deliver goods for coins and XP', landIcon('crate', 34)), ordersBody());
    else if (panel.kind === 'barn') sheet.replaceChildren(head('Barn', '', landIcon('barn', 34)), barnBody());
    else if (panel.kind === 'games') sheet.replaceChildren(head('Games', 'Play, win and earn for your town', landIcon('portal', 34)), gamesBody(s, now(), { crossing: () => { openPanel(null); goPlay(s.buildings.find((b) => b.item === 'gate')?.id); }, parking: () => { openPanel(null); openParking(); }, challenges: () => openPanel({ kind: 'adventures' }) }));
    else if (panel.kind === 'adventures') {
      const st = A.setStatus(s, now());
      sheet.replaceChildren(head('Adventures', st.ready ? 'New missions are ready!' : st.allDone ? `All ${st.total} done · next in ${A.countdown(st.unlockIn)}` : `${st.doneCount} of ${st.total} done`, landIcon('compass', 34)), adventuresBody(s, now(), (id) => hostNameOf(id), (adv) => { openPanel(null); startAdventure(adv); }, (adv) => { openPanel(null); findHost(adv); }, (id) => view?.residentInfo(hostIndexOf(id))?.skin[0] ?? null));
    }
    else if (panel.kind === 'events') {
      const tab = panel.tab, live = E.activeEvents(now()), ev = live.find((e) => e.key === tab) ?? live[0], mine = tab === 'mine' || !ev;
      sheet.replaceChildren(head(mine ? 'My collection' : ev.holiday.name, mine ? 'Everything you’ve collected, yours forever' : `${ev.daysLeft} day${ev.daysLeft === 1 ? '' : 's'} left · collect, earn and decorate`, landIcon('festival', 34)), eventsBody(tab));
    }
    else {
      const b = s.buildings.find((x) => x.id === (panel as { id: number }).id);
      if (!b) { openPanel(null); return; }
      const it = L.item(b.item);
      sheet.replaceChildren(head(it.name, it.blurb, thumb(b.item, it.emoji)), buildingBody(b, it));
    }
  }

  /** A 3D picture of a building for panels (falls back to its emoji before the 3D view is ready). */
  function thumb(itemId: string, emoji: string): HTMLElement {
    let url = '';
    try { url = view?.thumbnail(itemId) ?? ''; } catch (e) { console.warn(e); }
    return url ? h('img', { class: 'land-thumb', src: url, alt: '', draggable: 'false' }) : h('span', { class: 'land-thumb land-thumb-emoji' }, emoji);
  }

  /** Coin chests: turn Fuzzies into Fuzzies Land coins (the bigger the chest, the better the deal). */
  const CHESTS = [{ fz: 20, coins: 600 }, { fz: 60, coins: 2000 }, { fz: 150, coins: 5500 }];
  function fuzziesBody(): HTMLElement[] {
    const bal = rewards.balance();
    const chest = (c: { fz: number; coins: number }, i: number) => {
      const card = h('button', { class: `land-card land-chest ${bal < c.fz ? 'off' : ''}`, type: 'button', title: `${c.coins} coins for ${c.fz} Fuzzies` },
        h('span', { class: 'land-card-art land-chest-art' }, ...Array.from({ length: i + 1 }, () => landIcon('coin', 34 + i * 4))),
        h('b', null, ['Coin pouch', 'Coin chest', 'Treasure chest'][i]),
        h('small', null, `${c.coins.toLocaleString()} coins`),
        h('span', { class: 'land-price' }, fuzzyMark(16), String(c.fz)));
      card.addEventListener('click', () => {
        if (rewards.balance() < c.fz) { toast(`You need ${c.fz} Fuzzies`, 'info'); void openShop(); return; }
        spendFuzzies(c.fz);
        s.coins += c.coins;
        sfx.coins();
        toast(`+${c.coins.toLocaleString()} coins for Fuzzies Land`, 'good');
        save(); renderHud(); renderPanel();
      });
      return card;
    };
    const premium = L.ITEMS.filter((i) => i.currency === 'fuzzies');
    return [
      h('p', { class: 'land-fz-lead' }, 'Trade Fuzzies for coins and special decorations.'),
      h('div', { class: 'land-shop' }, ...CHESTS.map(chest), ...premium.map((it) => itemCard(it))),
      h('div', { class: 'land-fz-more' }, btn(h('span', { class: 'row' }, fuzzyMark(18), 'Get more Fuzzies'), { kind: 'primary', size: 'sm', onClick: () => void openShop() })),
    ];
  }

  function itemCard(it: L.ItemDef): HTMLElement {
    const why = L.cantBuy(s, it.id, rewards.balance());
    const locked = s.level < it.level;
    // a seasonal collectible you own: placed from your collection (so many copies, no price)
    if (it.collectible) {
      const sp = E.spare(s, it.id), own = E.owned(s, it.id);
      const card = h('button', { class: `land-card land-card-col ${sp ? '' : 'off'}`, type: 'button', title: sp ? `Place (${sp} to place)` : 'All copies are already on the map or in storage', 'data-item': it.id },
        h('span', { class: 'land-card-art' }, thumb(it.id, it.emoji), h('i', { class: 'land-store-n' }, `×${own}`)),
        h('b', null, it.name), h('small', null, TR.isTrophy(it.id) ? `${TR.METAL_NAMES[TR.trophyMetal(it.id)]} trophy` : it.id.startsWith('park') ? 'Parking Escape' : E.collectionOf(it.id)?.name ?? ''),
        h('span', { class: 'land-price owned' }, landIcon('festival', 16), sp ? `${sp} to place` : 'All placed'));
      card.addEventListener('click', () => { if (!sp) { toast('Every copy is already in your town — move one, or store it from Edit town.', 'info', 3500); return; } startPlacing(it.id); });
      return card;
    }
    const card = h('button', { class: `land-card ${why ? 'off' : ''} ${locked ? 'locked' : ''}`, type: 'button', title: why || it.blurb, 'data-item': it.id },
      h('span', { class: 'land-card-art' }, thumb(it.id, it.emoji), locked ? h('span', { class: 'land-card-lock' }, landIcon('lock', 22)) : null,
        it.max && !locked ? h('i', { class: 'land-max' }, `${L.count(s, it.id)}/${it.max(s.level)}`) : null),
      h('b', null, it.name),
      locked ? null : h('small', null, it.blurb),
      locked ? h('span', { class: 'land-price lv' }, `Level ${it.level}`)
        : h('span', { class: 'land-price' }, it.currency === 'fuzzies' ? fuzzyMark(18) : landIcon('coin', 18), it.cost ? String(it.cost) : 'Free'));
    card.addEventListener('click', () => {
      if (why) { toast(why, 'info'); if (it.currency === 'fuzzies' && rewards.balance() < it.cost) void openShop(); return; }
      startPlacing(it.id);
    });
    return card;
  }

  // ---------- seasonal events: shop, challenges, my collection ----------
  function eventsBody(tab: string): HTMLElement {
    const live = E.activeEvents(now());
    const tabs = h('div', { class: 'land-tabs', role: 'tablist' },
      ...live.map((e) => h('button', { class: `land-tab ${tab === e.key ? 'on' : ''}`, type: 'button', role: 'tab', 'data-tab': e.key, onclick: () => openPanel({ kind: 'events', tab: e.key }) }, landIcon('festival', 20), h('span', null, e.holiday.short))),
      h('button', { class: `land-tab ${tab === 'mine' ? 'on' : ''}`, type: 'button', role: 'tab', 'data-tab': 'mine', onclick: () => openPanel({ kind: 'events', tab: 'mine' }) }, landIcon('star', 20), h('span', null, 'My collection')));
    if (tab === 'mine' || !live.length) return h('div', null, tabs, myCollectionBody());
    const ev = live.find((e) => e.key === tab) ?? live[0];
    const col = ev.collection;
    const parts: (HTMLElement | null)[] = [tabs];
    parts.push(h('div', { class: 'land-ev-head' },
      h('div', { class: 'land-ev-tokens', title: 'Event tokens — earned from holiday orders, harvests and challenges' }, landIcon('token', 34), h('b', null, String(E.tokens(s, ev.key))), h('small', null, 'tokens')),
      h('div', { class: 'land-ev-when' }, landIcon('clock', 22), h('b', null, `${ev.daysLeft} day${ev.daysLeft === 1 ? '' : 's'} left`))));
    if (!col) {
      parts.push(h('p', { class: 'muted land-ev-note' }, `${ev.holiday.name} is here — enjoy the weather! Decorations are coming soon.`));
      return h('div', null, ...parts.filter((x) => x !== null) as HTMLElement[]);
    }
    // challenges
    parts.push(h('p', { class: 'pnl-label' }, 'Challenges'));
    parts.push(h('div', { class: 'land-ev-challenges' }, ...col.challenges.map((c) => {
      const done = E.claimed(s, c.id), can = E.canClaim(s, ev, c);
      const p = Math.min(c.goal, E.progress(s, ev.key, c.kind));
      const reward = c.reward.item ? h('span', { class: 'land-ev-reward' }, thumb(c.reward.item, ''), h('small', null, E.collectible(c.reward.item)?.name ?? '')) : h('span', { class: 'land-ev-reward chip' }, c.reward.tokens ? landIcon('token', 20) : landIcon('coin', 20), h('small', null, `+${c.reward.tokens ?? c.reward.coins}`));
      const b = done ? h('span', { class: 'land-ev-done' }, landIcon('check', 18), 'Done') : btn(can ? 'Claim' : `${p}/${c.goal}`, { kind: can ? 'primary' : 'ghost', size: 'sm', class: can ? 'land-ev-claim' : '', onClick: () => {
        if (!can) return;
        try {
          const r = E.claim(s, ev, c);
          sfx.coins(); save();
          const from = sheet.getBoundingClientRect(), sr = stage.getBoundingClientRect();
          if (r.coins) burst('coin', { x: from.left + from.width / 2 - sr.left, y: from.top + 60 - sr.top }, 6);
          toast(r.item ? `${E.collectible(r.item)?.name} is yours — place it from the shop or Build → Decor` : r.tokens ? `+${r.tokens} event tokens` : `+${r.coins} coins`, 'good', 3500);
          renderPanel();
        } catch (e) { toast((e as Error).message, 'info'); }
      } });
      return h('div', { class: `land-ev-ch ${done ? 'done' : can ? 'ready' : ''}` }, h('div', null, h('b', null, c.name), h('div', { class: 'progress land-bar' }, h('div', { style: `width:${(p / c.goal) * 100}%` }), h('small', null, `${p} / ${c.goal}`))), reward, b);
    })));
    // shop
    parts.push(h('p', { class: 'pnl-label' }, `${col.name} collection`));
    parts.push(h('div', { class: 'land-shop land-ev-shop' }, ...col.items.map((x) => collectibleCard(x, ev))));
    parts.push(h('p', { class: 'fine' }, 'Everything you collect is yours forever.'));
    return h('div', null, ...parts.filter((x) => x !== null) as HTMLElement[]);
  }
  function collectibleCard(x: E.Collectible, ev: E.ActiveEvent): HTMLElement {
    const own = E.owned(s, x.id), sp = E.spare(s, x.id);
    const why = E.cantBuyCollectible(s, x.id, rewards.balance(), now());
    const earnOnly = !!x.earn && !x.price.coins && !x.price.fuzzies && !x.price.tokens;
    const soldOut = own >= (x.max ?? 1);
    const price = soldOut ? h('span', { class: 'land-price owned' }, landIcon('check', 16), x.max && x.max > 1 ? `Own all ${x.max}` : 'Owned')
      : earnOnly ? h('span', { class: 'land-price owned' }, landIcon('star', 16), 'Challenge')
      : h('span', { class: 'land-price' }, x.price.fuzzies ? fuzzyMark(18) : x.price.tokens ? landIcon('token', 18) : landIcon('coin', 18), String(x.price.fuzzies ?? x.price.tokens ?? x.price.coins));
    const card = h('div', { class: `land-card land-ev-card ${x.rarity} ${why && !own ? 'off' : ''}`, 'data-item': x.id, title: x.blurb },
      h('span', { class: 'land-card-art' }, thumb(x.id, ''), own ? h('i', { class: 'land-store-n' }, `×${own}`) : null, h('i', { class: `land-ev-rarity ${x.rarity}` }, E.RARITY[x.rarity])),
      h('b', null, x.name),
      h('div', { class: 'land-ev-actions' },
        soldOut || earnOnly ? price : btn(price, { kind: why ? 'soft' : 'primary', size: 'sm', title: why || `Buy ${x.name}`, onClick: () => buyCollectible(x, ev) }),
        own ? btn(sp ? `Place${sp > 1 ? ` (${sp})` : ''}` : 'All placed', { kind: 'ghost', size: 'sm', onClick: () => { if (!sp) { toast('Every copy is already in your town.', 'info'); return; } startPlacing(x.id); } }) : null));
    return card;
  }
  function buyCollectible(x: E.Collectible, ev: E.ActiveEvent): void {
    const why = E.cantBuyCollectible(s, x.id, rewards.balance(), now());
    if (why) { toast(why, 'info', 3200); if (x.price.fuzzies && rewards.balance() < x.price.fuzzies) void openShop(); return; }
    try {
      const r = E.buyCollectible(s, x.id, rewards.balance(), now());
      if (r.fuzzies) spendFuzzies(r.fuzzies);
    } catch (e) { toast((e as Error).message, 'info'); return; }
    sfx.gold();
    save();
    toast(`${x.name} added to your collection — tap Place to put it in your town`, 'good', 3500);
    renderPanel();
    void ev;
  }
  function myCollectionBody(): HTMLElement {
    const groups = E.myCollections(s);
    const total = groups.reduce((a, g) => a + g.ownedCount, 0);
    return h('div', { class: 'land-mycol' },
      h('p', { class: 'muted' }, total ? `${total} piece${total === 1 ? '' : 's'} collected — yours forever.` : 'Nothing yet. Holiday decorations you earn show up here.'),
      ...groups.map(({ col, ownedCount }) => h('section', { class: 'land-mycol-set' },
        h('div', { class: 'land-mycol-head' }, h('b', null, col.name), h('small', null, `${ownedCount}/${col.items.length}`)),
        h('div', { class: 'land-shop land-ev-shop' }, ...col.items.map((x) => {
          const own = E.owned(s, x.id), sp = E.spare(s, x.id);
          const card = h('button', { class: `land-card land-ev-card ${own ? '' : 'missing'}`, type: 'button', 'data-item': x.id, title: own ? (sp ? `Place (${sp} to place)` : 'All copies are in your town') : `Not collected yet — ${E.RARITY[x.rarity].toLowerCase()} piece from ${col.name}` },
            h('span', { class: 'land-card-art' }, thumb(x.id, ''), own ? h('i', { class: 'land-store-n' }, `×${own}`) : h('span', { class: 'land-card-lock' }, landIcon('lock', 22))),
            h('b', null, x.name), h('small', null, own ? (sp ? `${sp} to place` : 'All placed') : 'Not collected'));
          card.addEventListener('click', () => { if (!own) { toast(`${x.name}: ${E.activeEvents(now()).some((e) => e.collection?.key === col.key) ? 'find it in the event shop' : `comes back with ${E.holiday(col.holiday).short} ${col.year} — this exact piece won’t be sold again, but you keep everything you have`}`, 'info', 4000); return; } if (!sp) { toast('Every copy is already in your town.', 'info'); return; } startPlacing(x.id); });
          return card;
        })))));
  }

  function shopBody(tab: L.Kind | 'farm' | 'fuzzies'): HTMLElement {
    const tabs: [L.Kind | 'farm' | 'fuzzies', LandIcon, string][] = [['house', 'house', 'Houses'], ['farm', 'wheat', 'Farming'], ['factory', 'workshop', 'Workshops'], ['decor', 'flower', 'Decor'], ['fuzzies', 'star', 'Fuzzies']];
    const list = L.ITEMS.filter((i) => (tab === 'farm' ? i.kind === 'field' : i.kind === tab) && (!i.collectible || E.owned(s, i.id) > 0))
      .sort((x, y) => Number(TR.isTrophy(y.id)) - Number(TR.isTrophy(x.id))); // your trophies first
    return h('div', null,
      h('div', { class: 'land-tabs', role: 'tablist' }, ...tabs.map(([k, ic, label]) => h('button', { class: `land-tab ${k === tab ? 'on' : ''}`, type: 'button', role: 'tab', 'data-tab': k, 'aria-selected': String(k === tab), onclick: () => openPanel({ kind: 'shop', tab: k }) }, landIcon(ic, 22), h('span', null, label)))),
      ...(tab === 'fuzzies' ? fuzziesBody() : [
      h('div', { class: 'land-shop' }, ...list.map((it) => itemCard(it)))]));
  }

  function ordersBody(): HTMLElement {
    return h('div', { class: 'land-orders' }, ...s.orders.map((o) => {
      const ok = L.canFill(s, o);
      return h('div', { class: `land-order ${ok ? 'ready' : ''}` },
        h('div', { class: 'land-order-who' }, h('span', { class: 'land-order-av' }, fuzzyMark(34)), h('b', null, o.who), ok ? h('small', { class: 'land-order-tag' }, 'Ready') : null),
        h('div', { class: 'land-order-items' }, ...Object.entries(o.items).map(([k, n]) => {
          const have = s.barn[k] ?? 0;
          return h('span', { class: have >= n ? 'have' : '', title: L.good(k).name }, goodIcon(k, 26), h('b', null, `${Math.min(have, n)}/${n}`));
        })),
        h('div', { class: 'land-order-reward' }, chip(landIcon('coin', 18), String(o.coins)), chip(landIcon('star', 18), `${o.xp} XP`, 'xp'), o.fuzzies ? chip(fuzzyMark(18), `+${o.fuzzies}`) : null),
        h('div', { class: 'land-order-btns' },
          btn('Deliver', { kind: ok ? 'primary' : 'soft', size: 'sm', class: 'land-deliver', onClick: () => {
            try {
              const g = L.fill(s, o.id);
              const tok = E.orderDelivered(s, o, now());
              E.decorateOrders(s, now());
              if (tok) setTimeout(() => toast(`+${tok} event token${tok > 1 ? 's' : ''}`, 'good'), 600);
              sfx.coins();
              const hall = s.buildings.find((b) => b.item === 'hall');
              const card = document.activeElement?.closest('.land-order') as HTMLElement | null;
              const rr = (card ?? sheet).getBoundingClientRect(), sr = stage.getBoundingClientRect();
              const from = { x: rr.left + rr.width / 2 - sr.left, y: rr.top + rr.height / 2 - sr.top };
              burst('coin', from, Math.ceil(g.coins! / 6));
              setTimeout(() => burst('star', from, Math.ceil((g.xp ?? 0) / 4)), 180);
              gain({ ...g, coins: 0, xp: 0, levelUps: g.levelUps }, hall?.id ?? 0, `+${g.coins}`);
              if (g.xp) setTimeout(() => view?.float(`+${g.xp} XP`, hall?.id ?? 0, 'xp'), 250);
              save(); renderPanel();
              tut.emit('order');
            } catch (e) { toast((e as Error).message, 'info'); }
          } }),
          btn(null, { icon: 'trash', kind: 'plain', size: 'sm', title: 'Skip this order', onClick: () => { L.skip(s, o.id); save(); renderPanel(); } })));
    }));
  }

  function barnBody(): HTMLElement {
    const items = L.GOODS.filter((g) => (s.barn[g.id] ?? 0) > 0);
    const used = L.barnUsed(s), cap = L.barnCap(s.level);
    const meter = h('div', { class: `land-barn-meter progress land-bar ${used / cap > 0.85 ? 'full' : ''}` }, h('div', { style: `width:${Math.min(100, (used / cap) * 100)}%` }), h('small', null, `${used} / ${cap}`));
    if (!items.length) return h('div', null, meter, h('div', { class: 'land-empty' }, landIcon('barnBig', 52), h('p', null, 'Empty! Plant some crops.')));
    return h('div', null, meter, h('div', { class: 'land-barn' }, ...items.map((g) => h('div', { class: 'land-good' },
      h('span', { class: 'land-good-ic' }, goodIcon(g.id, 44), h('i', null, `×${s.barn[g.id]}`)), h('b', null, g.name),
      btn(h('span', { class: 'row' }, 'Sell', landIcon('coin', 16), String(g.sell)), { kind: 'ghost', size: 'sm', title: `Sell 1 ${g.name}`, onClick: () => { L.sellGood(s, g.id, 1); sfx.coins(); save(); renderPanel(); tut.emit('sell'); } })))));
  }

  function rushBtn(b: L.Placed): HTMLElement | null {
    const cost = L.rushCost(b);
    if (!cost) return null;
    return btn(h('span', { class: 'row' }, 'Finish now · ', fuzzyMark(14), String(cost)), { kind: 'ghost', size: 'sm', onClick: () => {
      if (rewards.balance() < cost) { toast(`You need ${cost} Fuzzies — play Fuzzy Crossing or get more`, 'info'); void openShop(); return; }
      spendFuzzies(cost);
      L.rush(b);
      sfx.wink();
      save(); renderPanel();
    } });
  }

  function buildingBody(b: L.Placed, it: L.ItemDef): HTMLElement {
    const now = Date.now();
    const parts: (HTMLElement | null)[] = [];
    if (b.doneAt) {
      const total = (it.build ?? 1) * 1000;
      parts.push(h('div', { class: 'land-progress' }, h('span', { class: 'land-progress-t' }, landIcon('hammer', 22), 'Building…'),
        h('div', { class: 'progress' }, h('div', { style: `width:${L.buildProgress(b) * 100}%`, 'data-bar': String(b.doneAt), 'data-total': String(total) })),
        h('small', b.doneAt > now ? { 'data-end': String(b.doneAt), 'data-suffix': ' left — it keeps building while you’re away' } : null, b.doneAt > now ? `${fmt(b.doneAt - now)} left — it keeps building while you’re away` : 'Ready!')));
      parts.push(b.doneAt > now ? rushBtn(b) : btn('Open it!', { kind: 'primary', onClick: () => tapBuilding(b.id) }));
    } else if (it.kind === 'field') {
      if (b.crop) {
        const g = L.good(b.crop.good);
        const left = g.time * 1000 - (now - b.crop.at);
        const end = b.crop.at + g.time * 1000;
        parts.push(h('div', { class: 'land-progress' }, h('span', { class: 'land-progress-t' }, goodIcon(g.id, 24), g.name),
          h('div', { class: 'progress' }, h('div', { style: `width:${L.cropProgress(b) * 100}%`, 'data-bar': String(end), 'data-total': String(g.time * 1000) })),
          h('small', left > 0 ? { 'data-end': String(end), 'data-suffix': ' left' } : null, left > 0 ? `${fmt(left)} left` : 'Ready!')));
        parts.push(left > 0 ? rushBtn(b) : btn('Harvest', { kind: 'primary', onClick: () => tapBuilding(b.id) }));
      } else {
        parts.push(h('p', { class: 'pnl-label' }, 'Plant something'), h('div', { class: 'land-recipes' }, ...L.GOODS.filter((g) => g.at === 'field').map((g) => recipe(g, () => {
          L.plant(s, b.id, g.id);
          sfx.plant();
          view?.float(`${g.emoji}`, b.id);
          save(); openPanel(null);
          tut.emit('plant');
        }))));
      }
    } else if (it.kind === 'factory') {
      const q = b.queue ?? [];
      parts.push(h('div', { class: 'land-slots' }, ...Array.from({ length: L.SLOTS }, (_, i) => {
        const e = q[i];
        if (!e) return h('div', { class: 'land-slot empty' }, h('span', { class: 'land-slot-plus' }, '+'), h('small', null, 'Free'));
        const done = e.end <= now;
        return h('div', { class: `land-slot ${done ? 'done' : ''}` }, goodIcon(e.good, 38), h('small', done ? null : { 'data-end': String(e.end) }, done ? 'Ready' : fmt(e.end - now)));
      })));
      if (L.finished(b).length) parts.push(btn('Collect', { kind: 'primary', onClick: () => tapBuilding(b.id) }));
      parts.push(rushBtn(b));
      parts.push(h('p', { class: 'pnl-label' }, 'Make'), h('div', { class: 'land-recipes' }, ...(it.recipes ?? []).map((id) => recipe(L.good(id), () => {
        L.startMaking(s, b.id, id);
        sfx.plant();
        save(); renderPanel();
      }))));
    } else if (it.kind === 'house') {
      parts.push(h('p', { class: 'land-house' }, chip(landIcon('pop', 22), `${it.pop} Fuzzies live here`)));
    } else if (b.item === 'hall') {
      const i = L.SIZES.indexOf(s.size), e = L.EXPANSION[i];
      parts.push(h('div', { class: 'land-stats' },
        h('span', null, h('b', null, String(s.level)), h('small', null, 'Level')),
        h('span', null, h('b', null, String(L.population(s))), h('small', null, 'Fuzzies')),
        h('span', null, h('b', null, String(s.stats.harvests)), h('small', null, 'Harvests')),
        h('span', null, h('b', null, String(s.stats.orders)), h('small', null, 'Orders'))));
      parts.push(e
        ? btn(h('span', { class: 'row' }, 'Expand the land', landIcon('coin', 18), e.cost.toLocaleString(), s.level < e.level ? ` · level ${e.level}` : ''), { kind: s.level >= e.level && s.coins >= e.cost ? 'primary' : 'soft', onClick: () => {
            try { L.expand(s); sfx.build(); toast('More room to build!', 'good'); save(); renderPanel(); } catch (err) { toast((err as Error).message, 'info'); }
          } })
        : h('p', { class: 'muted' }, 'Your land is as big as it gets.'));
    } else if (b.item === 'gate') {
      parts.push(btn('Hop over to Fuzzy Crossing', { kind: 'primary', onClick: () => goPlay(b.id) }));
    }
    const actions: HTMLElement[] = [];
    actions.push(btn(L.walkway(b.item) ? 'Move' : 'Move or turn', { kind: 'ghost', size: 'sm', icon: 'hand', onClick: () => startPlacing(b.item, b.id) }));
    if (it.sellable) actions.push(btn(h('span', { class: 'row' }, L.walkway(b.item) ? 'Remove' : 'Sell', ...(it.currency === 'coins' && it.cost >= 10 ? [landIcon('coin', 16), String(Math.floor(it.cost / 2))] : [])), { kind: 'ghost', size: 'sm', icon: 'trash', onClick: async () => {
      if (b.item === 'field' && b.crop && !(await confirmDialog('Sell this field?', 'What’s growing on it will be lost.', 'Sell'))) return;
      const back = L.sell(s, b.id);
      sfx.coins();
      if (back) toast(`+${back} coins`, 'good');
      save(); openPanel(null);
    } }));
    return h('div', { class: 'land-building' }, ...parts, h('div', { class: 'btn-row' }, ...actions));
  }

  function recipe(g: L.Good, make: () => void): HTMLElement {
    const locked = s.level < g.level;
    const inputs = Object.entries(g.inputs ?? {});
    const missing = inputs.some(([k, n]) => (s.barn[k] ?? 0) < n);
    const card = h('button', { class: `land-recipe ${locked ? 'locked' : ''} ${locked || missing ? 'off' : ''}`, type: 'button', 'data-good': g.id },
      h('span', { class: 'land-card-ic' }, locked ? landIcon('lock', 38) : goodIcon(g.id, 46)),
      h('b', null, g.name),
      locked ? h('small', { class: 'land-recipe-need' }, `Level ${g.level}`)
        : inputs.length ? h('small', { class: 'land-recipe-need' }, ...inputs.map(([k, n]) => h('span', { class: (s.barn[k] ?? 0) >= n ? 'have' : 'short' }, goodIcon(k, 18), `${s.barn[k] ?? 0}/${n}`)))
        : h('small', { class: 'land-recipe-need' }, h('span', null, landIcon('coin', 16), String(g.seed ?? 0))),
      locked ? null : h('small', { class: 'land-recipe-time' }, landIcon('clock', 14), fmt(g.time * 1000)));
    card.addEventListener('click', () => {
      try { make(); } catch (e) { toast((e as Error).message, 'info'); }
    });
    return card;
  }

  // ---------- tapping things in town ----------
  function tapBuilding(id: number): void {
    const b = s.buildings.find((x) => x.id === id);
    if (!b) return;
    const it = L.item(b.item);
    try {
      if (b.doneAt && b.doneAt <= Date.now()) {
        const g = L.finishBuild(s, id);
        sfx.build();
        gain(g, id, `${it.emoji} Ready!`);
        save();
        if (panel?.kind === 'building' && panel.id === id) openPanel(null);
        tut.emit('collect');
        return;
      }
      if (it.kind === 'field' && b.crop && L.cropProgress(b) >= 1) {
        const g = L.harvest(s, id);
        const drop = E.harvested(s, 1, now());
        if (drop) setTimeout(() => toast(`+1 ${drop.event.holiday.short} token`, 'good'), 700);
        sfx.collect();
        gain(g, id, `+${g.n} ${L.good(g.good).emoji}`);
        view?.bounce(id); burstGoods(Array(g.n).fill(g.good), id);
        save();
        if (panel?.kind === 'building' && panel.id === id) openPanel(null);
        tut.emit('harvest');
        return;
      }
      if (it.kind === 'factory' && L.finished(b).length) {
        const g = L.collect(s, id);
        sfx.collect();
        gain(g, id, g.goods.map((x) => L.good(x).emoji).join(' '));
        view?.bounce(id); burstGoods(g.goods, id);
        save();
        if (panel?.kind === 'building') renderPanel();
        tut.emit('collect');
        return;
      }
    } catch (e) { toast((e as Error).message, 'info'); return; }
    if (b.item === 'parking') { openParking(); return; }
    if (b.item === 'gate' && !panel) { openPanel({ kind: 'building', id }); return; }
    openPanel({ kind: 'building', id });
  }

  function goPlay(gateId?: number): void {
    const c = gateId !== undefined ? view?.centerOf(gateId) : null;
    if (c && view) {
      openPanel(null);
      view.flyTo(c.x, c.z + 0.5, 6, 0.9);
      setTimeout(() => travel('#/play', 'Hopping to Fuzzy Crossing…'), 650);
    } else travel('#/play', 'Hopping to Fuzzy Crossing…');
  }

  // ---------- quick actions next to the selected building (Move / Turn) ----------
  const quick = h('div', { class: 'land-quick', hidden: true });
  let quickRaf = 0;
  const canTurn = (itemId: string) => !L.walkway(itemId) && itemId !== 'field';
  function showQuick(): void {
    cancelAnimationFrame(quickRaf);
    const id = panel?.kind === 'building' ? panel.id : null;
    const b = id === null ? undefined : s.buildings.find((o) => o.id === id);
    if (!b || placing) { quick.hidden = true; return; }
    quick.replaceChildren(
      btn(h('span', { class: 'row' }, landIcon('hand', 20), 'Move'), { kind: 'soft', size: 'sm', title: 'Move (or press and hold it)', onClick: () => startPlacing(b.item, b.id) }),
      btn(h('span', { class: 'row' }, landIcon('eye', 20), 'Look'), { kind: 'soft', size: 'sm', title: 'A close-up — then stroll round it', onClick: () => { openPanel(null); view?.lookAtBuilding(b.id); } }),
      btn(landIcon('select', 22), { kind: 'soft', size: 'sm', title: 'Edit town (select several, store, rearrange)', onClick: () => enterSelect(b.id) }),
      ...(canTurn(b.item) ? [btn(h('span', { class: 'row' }, landIcon('rotate', 20), 'Turn'), { kind: 'soft', size: 'sm', title: 'Turn (R)', onClick: () => turnInPlace(b.id) })] : []));
    quick.hidden = false;
    const follow = () => {
      const p = view?.screenOf(b.id);
      if (!p || quick.hidden) return;
      quick.style.transform = `translate(${Math.round(p.x)}px, ${Math.round(p.y)}px) translate(-50%, calc(-100% - 14px))`;
      quickRaf = requestAnimationFrame(follow);
    };
    follow();
  }
  /** Turn a building where it stands (if it fits that way round), saved straight away. */
  function turnInPlace(id: number): void {
    const b = s.buildings.find((o) => o.id === id);
    if (!b || !canTurn(b.item)) return;
    const rot = ((b.rot + 1) % 4) as L.Rot;
    const why = L.placeProblem(s, b.item, b.x, b.z, rot, b.id);
    if (why) { toast(`${why} — use Move to find it a new spot`, 'info'); return; }
    L.move(s, b.id, b.x, b.z, rot);
    sfx.hop();
    save();
    view?.select(b.id);
    showQuick();
  }

  // ---------- placing & moving ----------
  /** Carry something onto the map: a new item from the shop, a building being moved (`moving`), or a piece from Storage (`store`). */
  function startPlacing(itemId: string, moving?: number, store?: number): void {
    const existing = moving !== undefined ? s.buildings.find((b) => b.id === moving) : undefined;
    const stored = store !== undefined ? L.storage(s).find((b) => b.id === store) : undefined;
    panel = null;
    sheet.hidden = true;
    view?.select(null);
    const rot: L.Rot = existing?.rot ?? stored?.rot ?? 0;
    // start in the middle of the screen, or where it already stands (a stored piece: its old spot if that's free and on screen)
    let x = existing?.x ?? Math.floor((view?.target.x ?? L.MAP / 2) - 0.5);
    let z = existing?.z ?? Math.floor((view?.target.z ?? L.MAP / 2) - 0.5);
    if (stored && L.canPlace(s, itemId, stored.x, stored.z, rot) && Math.abs(stored.x - x) < 7 && Math.abs(stored.z - z) < 7) { x = stored.x; z = stored.z; }
    else if (!existing) {
      // look for a free spot near the middle
      outer: for (let r = 0; r < 10; r++) for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
        if (L.canPlace(s, itemId, x + dx, z + dz, rot)) { x += dx; z += dz; break outer; }
      }
    }
    placing = { item: itemId, x, z, rot, moving, store };
    quick.hidden = true;
    paintEdit();
    const it = L.item(itemId);
    placeHint = h('small', null, hintFor(itemId, moving, store));
    placeBar.hidden = false;
    placeBar.replaceChildren(...[
      h('div', { class: 'land-place-info' }, h('b', null, it.name), placeHint),
      canTurn(itemId) ? btn(landIcon('rotate', 22), { kind: 'soft', class: 'land-place-r', title: 'Turn it (R)', onClick: rotatePlacing }) : null,
      btn(landIcon('close', 22), { kind: 'soft', class: 'land-place-x', title: 'Cancel (Esc)', onClick: cancelPlacing }),
      btn(h('span', { class: 'row' }, landIcon('check', 20), moving !== undefined ? 'Put here' : store !== undefined ? 'Place here' : 'Build here'), { kind: 'primary', title: 'Enter', onClick: confirmPlacing })].filter((x) => x !== null) as HTMLElement[]);
    updateGhost(); // show what you're carrying straight away (green or red)
  }

  function rotatePlacing(): void {
    if (!placing || !canTurn(placing.item)) return;
    placing.rot = ((placing.rot + 1) % 4) as L.Rot;
    sfx.hop();
    updateGhost();
  }

  let placeHint: HTMLElement | null = null;
  const hintFor = (itemId: string, moving?: number, store?: number) => moving !== undefined ? `Moving is free — drag it, then tap “Put here”`
    : store !== undefined ? `From Storage — drag it to a free spot, then tap “Place here”`
    : L.walkway(itemId) ? 'Drag across the grass to lay a line' : isTouch() ? 'Drag it, or tap where it should go' : 'Drag it, or click where it should go';
  function updateGhost(): void {
    if (!placing) return;
    const why = L.placeProblem(s, placing.item, placing.x, placing.z, placing.rot, placing.moving ?? -1);
    view?.setGhost({ item: placing.item, x: placing.x, z: placing.z, rot: placing.rot, moving: placing.moving, seed: placing.store, ok: !why });
    placeBar.classList.toggle('bad', !!why);
    if (placeHint) {
      if (why) placeHint.textContent = why;
      else placeHint.textContent = hintFor(placing.item, placing.moving, placing.store);
    }
  }

  /** Lay a road or path tile right away while dragging (each costs its price). */
  function paintTile(x: number, z: number): void {
    if (!placing || placing.moving !== undefined) return;
    const it = L.item(placing.item);
    if (L.cantBuy(s, placing.item, rewards.balance()) || !L.canPlace(s, placing.item, x, z, 0)) return;
    L.place(s, placing.item, x, z, 0);
    if (it.currency === 'fuzzies') spendFuzzies(it.cost);
    tut.emit('placed', { item: placing.item });
    sfx.plant();
    save();
  }

  function cancelPlacing(): void {
    const fromStore = placing?.store !== undefined;
    placing = null;
    placeBar.hidden = true;
    view?.setGhost(null); // the original (if moving) shows again exactly where it was
    showQuick();
    paintEdit();
    if (fromStore && selMode && L.storage(s).length) openDrawer();
  }

  function confirmPlacing(): void {
    if (!placing) return;
    const p = placing;
    try {
      if (p.store !== undefined) {
        // a piece from Storage: back on the map exactly as it was (crop, queue, timers), just here
        const placed = L.unstore(s, p.store, p.x, p.z, p.rot);
        record({ kind: 'unstore', pieces: [clone(placed)] });
        sfx.build();
        save();
        view?.settle([placed.id]);
        sel.add(placed.id);
        // more of the same kind waiting? keep placing them in a row
        const next = L.storage(s).find((b) => b.item === p.item);
        if (next) {
          const f = L.footprint(L.item(p.item), p.rot);
          placing = { ...p, store: next.id, x: p.x + f.w };
          if (!L.canPlace(s, p.item, placing.x, placing.z, p.rot)) { const sp = L.nearestFree(s, p.item, p.x, p.z, p.rot); if (sp) { placing.x = sp.x; placing.z = sp.z; } }
          if (placeHint) placeHint.textContent = `Placed ✓ — ${plural(L.storage(s).filter((b) => b.item === p.item).length, L.item(p.item).name)} left in Storage`;
          view?.setGhost({ item: placing.item, x: placing.x, z: placing.z, rot: placing.rot, seed: placing.store, ok: L.canPlace(s, placing.item, placing.x, placing.z, placing.rot) });
          placeBar.classList.remove('bad');
          return;
        }
        cancelPlacing();
        paintSel();
        return;
      }
      if (p.moving !== undefined) { L.move(s, p.moving, p.x, p.z, p.rot); sfx.hop(); tut.emit('moved'); }
      else {
        const it = L.item(p.item);
        const why = L.cantBuy(s, p.item, rewards.balance());
        if (why) throw new Error(why);
        const g = L.place(s, p.item, p.x, p.z, p.rot); // throws (nothing spent) if the spot is taken
        if (it.currency === 'fuzzies') spendFuzzies(it.cost);
        sfx.build();
        if (it.collectible) E.note(s, 'place', 1, p.item, now());
        save();
        tut.emit('placed', { item: p.item });
        const placed = s.buildings[s.buildings.length - 1];
        if (it.build) toast(`Building your ${it.name} — ready in ${fmt(it.build * 1000)}. It keeps going while you’re away.`, 'info', 3200);
        else gain(g, placed.id, it.kind === 'house' ? `+${it.pop} 🏡` : undefined);
        // keep building fields, roads and paths in a row without reopening the shop
        if ((it.kind === 'field' || L.walkway(p.item)) && !L.cantBuy(s, p.item, rewards.balance())) {
          placing = { ...p, x: p.x + 1 };
          if (!L.canPlace(s, p.item, placing.x, placing.z, p.rot)) placing.z += 1;
          updateGhost();
          return;
        }
      }
    } catch (e) { toast((e as Error).message, 'info'); return; }
    cancelPlacing();
    save();
  }

  // ---------- Town Edit Mode: select, move, store & restore ----------
  // Edit mode (the pencil button, ➕ next to a building, or Shift-click): tap pieces to add/remove them, double-tap a road or
  // field for its whole connected stretch, drag an empty spot (mouse) or press-and-hold then drag (touch) for an area; drag
  // any selected piece to move the whole group. Moves are previewed (green / red per piece) and only happen on "Put here".
  // Pieces can be lifted into Storage (whole, timers and all) and placed back later; every edit can be undone, and the layout
  // from before editing is kept (also across a refresh) until you Save — Cancel puts it back.
  type EditOp = { kind: 'move'; ids: number[]; dx: number; dz: number } | { kind: 'remove'; pieces: L.Placed[]; refund: number } | { kind: 'turn'; id: number; from: L.Rot; to: L.Rot }
    | { kind: 'store'; pieces: L.Placed[] } | { kind: 'unstore'; pieces: L.Placed[] };
  const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
  let selMode = false;
  const sel = new Set<number>();
  let gmove: { dx: number; dz: number; why: string; bad: number[] } | null = null;
  const undoStack: EditOp[] = [], redoStack: EditOp[] = [];
  const editBar = h('div', { class: 'land-edit', hidden: true, role: 'toolbar', 'aria-label': 'Edit your town' });
  const editTag = h('div', { class: 'land-edit-tag', hidden: true }, icon('edit', 14), h('span', null, 'Editing your town'));
  const drawer = h('section', { class: 'land-store', hidden: true, 'aria-label': 'Storage' });
  let drawerTab: L.StoreCat | 'all' = 'all';
  const selIds = () => [...sel].filter((id) => s.buildings.some((b) => b.id === id));
  const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
  const bag = () => L.storage(s);

  // The layout from before you started editing: kept on this device (so a refresh mid-edit loses nothing) until you Save.
  // `refund` = coins removals gave back meanwhile (Cancel takes them back, so coins can't be made out of thin air).
  const EDIT_KEY = `fz.land.edit.${a.id}`;
  let session: { buildings: L.Placed[]; storage: L.Placed[]; refund: number; at: number } | null = null;
  const persistSession = () => { try { if (session) localStorage.setItem(EDIT_KEY, JSON.stringify(session)); else localStorage.removeItem(EDIT_KEY); } catch { /* private mode */ } };
  const layoutKey = (b: L.Placed[], st: L.Placed[]) => JSON.stringify([b.map((p) => [p.id, p.x, p.z, p.rot]).sort((x, y) => x[0] - y[0]), st.map((p) => p.id).sort()]);
  const changed = () => !!session && (session.refund !== 0 || layoutKey(session.buildings, session.storage) !== layoutKey(s.buildings, bag()));
  function enterSelect(first?: number): void {
    if (placing) cancelPlacing();
    openPanel(null);
    document.querySelector('.land-away')?.remove();
    if (!session) { session = { buildings: clone(s.buildings), storage: clone(bag()), refund: 0, at: Date.now() }; persistSession(); }
    selMode = true;
    if (first !== undefined) sel.add(first);
    stage.classList.add('editing');
    editTag.hidden = false;
    view?.editMode(true);
    paintSel();
  }
  /** Leave edit mode. `commit` keeps the new layout (Save); otherwise the caller has already put the old one back. */
  function exitSelect(): void {
    if (placing) cancelPlacing();
    cancelGroup();
    closeMenu();
    drawer.hidden = true;
    selMode = false;
    sel.clear();
    undoStack.length = 0; redoStack.length = 0;
    session = null; persistSession();
    stage.classList.remove('editing');
    editTag.hidden = true;
    view?.editMode(false);
    paintSel();
  }
  function saveLayout(): void {
    const had = changed();
    exitSelect();
    if (had) { sfx.build(); toast('Layout saved ✓', 'good'); }
  }
  async function cancelEditing(): Promise<void> {
    if (!session || !changed()) { exitSelect(); return; }
    closeMenu();
    const ok = await confirmDialog('Cancel editing?', 'Your town goes back to how it was before you started editing. Nothing you built is lost.', 'Go back', false);
    if (!ok) return;
    if (s.coins < session.refund) { toast(`You spent the ${session.refund} coins you got back for removed pieces, so the old layout can’t be restored. Save instead.`, 'info', 4200); return; }
    s.coins -= session.refund;
    s.buildings = clone(session.buildings);
    s.storage = clone(session.storage);
    exitSelect();
    save();
    sfx.whoosh();
    toast('Back to how it was', 'info');
  }
  /** After a refresh (or coming back) mid-edit: pick up where you left off, with the old layout still safe. */
  function resumeEditing(): void {
    try {
      const saved = JSON.parse(localStorage.getItem(EDIT_KEY) || 'null') as typeof session;
      if (!saved || !Array.isArray(saved.buildings) || !Array.isArray(saved.storage)) return;
      // only when it belongs to this copy of the town (not one that came from another device since)
      if (saved.at > s.savedAt + 5000 || Date.now() - saved.at > 86_400_000) { localStorage.removeItem(EDIT_KEY); return; }
      session = { ...saved, refund: saved.refund || 0 };
      if (!changed()) { session = null; persistSession(); return; }
      enterSelect();
      toast('You were editing your town — Save when you’re happy, or Cancel to go back.', 'info', 4200);
    } catch { /* nothing saved */ }
  }
  function toggleSel(id: number): void {
    if (gmove) return; // finish (or cancel) the move first
    if (sel.has(id)) sel.delete(id); else sel.add(id);
    try { sfx.hop(); } catch { /* */ }
    paintSel();
  }
  function paintSel(): void {
    for (const id of [...sel]) if (!s.buildings.some((b) => b.id === id)) sel.delete(id);
    view?.select(null);
    view?.setMulti(selMode ? selIds() : []);
    paintEdit();
  }
  const LAND_GLYPH: Record<string, LandIcon> = { rotate: 'rotate', trash: 'trash', close: 'close', check: 'check', undo: 'undo', redo: 'redo' };
  const ib = (ic: Parameters<typeof icon>[0], title: string, onClick: (e: MouseEvent) => void, opts: { disabled?: boolean; cls?: string; label?: string; badge?: number; land?: LandIcon } = {}) => {
    const b = h('button', { class: `land-edit-b ${opts.cls ?? ''}`, type: 'button', title, 'aria-label': opts.badge ? `${title} (${opts.badge})` : title },
      opts.land ? landIcon(opts.land, 26) : LAND_GLYPH[ic as string] ? landIcon(LAND_GLYPH[ic as string], 22) : icon(ic, 20), opts.label ? h('span', null, opts.label) : null, opts.badge ? h('i', { class: 'land-edit-badge' }, String(opts.badge)) : null);
    b.disabled = !!opts.disabled;
    b.addEventListener('click', onClick);
    return b;
  };
  function paintEdit(): void {
    editBar.hidden = !selMode || !!placing;
    if (!drawer.hidden) paintDrawer();
    if (editBar.hidden) return;
    const n = sel.size;
    if (gmove) {
      const ok = !gmove.why && (gmove.dx || gmove.dz);
      editBar.replaceChildren(
        h('div', { class: `land-edit-msg ${gmove.why ? 'bad' : 'ok'}` }, gmove.why || (gmove.dx || gmove.dz ? `Moving ${plural(n, 'piece')}` : 'Drag to move')),
        ib('close', 'Cancel (Esc)', cancelGroup),
        ib('check', 'Put here (Enter)', confirmGroup, { disabled: !ok, cls: 'go', label: 'Put here' }));
      return;
    }
    const one = n === 1 ? s.buildings.find((b) => b.id === [...sel][0]) : undefined;
    const ids = selIds();
    const removable = ids.filter((id) => L.item(s.buildings.find((b) => b.id === id)!.item).sellable).length;
    const storable = ids.filter((id) => !L.cantStore(s.buildings.find((b) => b.id === id)!)).length;
    const stored = bag().length;
    editBar.replaceChildren(
      h('div', { class: 'land-edit-g' },
        h('div', { class: 'land-edit-count' }, h('b', null, String(n)), h('span', null, n ? 'selected' : isTouch() ? 'Tap to select' : 'Click to select')),
        h('small', { class: 'land-edit-hint' }, n ? 'Drag to move' : isTouch() ? 'Hold + drag: area' : 'Drag: area'),
        ib('rotate', 'Turn (R)', () => { if (one) turnRecorded(one.id); }, { disabled: !one || !canTurn(one.item) }),
        ib('download', n ? `Store ${plural(storable, 'piece')}` : 'Store…', (e) => { if (n) void storeSel(); else storeMenu(e.currentTarget as HTMLElement); }, { disabled: n > 0 && !storable, land: 'boxIn', label: 'Store' }),
        ib('trash', 'Remove (Delete)', () => void removeSel(), { disabled: !removable }),
        ib('close', 'Clear selection', () => { sel.clear(); paintSel(); }, { disabled: !n, cls: 'clear' })),
      h('div', { class: 'land-edit-g' },
        ib('download', stored ? `Storage (${stored})` : 'Storage', () => (drawer.hidden ? openDrawer() : closeDrawer()), { land: 'box', badge: stored, cls: drawer.hidden ? '' : 'on' }),
        ib('undo', 'Undo (Ctrl+Z)', undo, { disabled: !undoStack.length }),
        ib('redo', 'Redo (Ctrl+Shift+Z)', redo, { disabled: !redoStack.length }),
        ib('close', 'Cancel editing', () => void cancelEditing(), { cls: 'cancel' }),
        ib('check', 'Save layout (Esc)', saveLayout, { cls: 'done', label: 'Save' })));
  }
  /** Drag the group to (dx, dz) from where it stands: preview it, green where it fits and red where it doesn't. */
  function previewGroup(dx: number, dz: number): void {
    const ids = selIds();
    if (!ids.length) return;
    if (gmove && gmove.dx === dx && gmove.dz === dz) return;
    const r = L.groupProblem(s, ids, dx, dz);
    gmove = { dx, dz, why: r.why, bad: r.bad };
    view?.groupPreview({ ids, dx, dz, bad: r.bad });
    paintEdit();
  }
  function cancelGroup(): void {
    if (!gmove) return;
    gmove = null;
    view?.groupPreview(null);
    paintEdit();
  }
  function record(op: EditOp): void { undoStack.push(op); if (undoStack.length > 50) undoStack.shift(); redoStack.length = 0; }
  function confirmGroup(): void {
    if (!gmove || gmove.why || (!gmove.dx && !gmove.dz)) return;
    const ids = selIds(), { dx, dz } = gmove;
    view?.groupPreview(null);
    gmove = null;
    try { L.moveGroup(s, ids, dx, dz); } catch (e) { toast((e as Error).message, 'info'); paintEdit(); return; }
    record({ kind: 'move', ids, dx, dz });
    sfx.hop();
    save();
    view?.settle(ids);
    paintSel();
    tut.emit('moved');
  }
  function turnRecorded(id: number): void {
    const b = s.buildings.find((o) => o.id === id);
    if (!b) return;
    const from = b.rot;
    turnInPlace(id);
    if (b.rot !== from) { record({ kind: 'turn', id, from, to: b.rot }); paintSel(); }
  }
  async function removeSel(): Promise<void> {
    const pieces = selIds().map((id) => s.buildings.find((b) => b.id === id)!).filter((b) => L.item(b.item).sellable);
    if (!pieces.length) return;
    const refund = pieces.reduce((a, b) => { const it = L.item(b.item); return a + (it.currency === 'coins' ? Math.floor(it.cost / 2) : 0); }, 0);
    const growing = pieces.some((b) => b.crop);
    const ok = await confirmDialog(`Remove ${plural(pieces.length, 'piece')}?`, `${refund ? `You get ${refund} coins back. ` : ''}${growing ? 'Crops on these fields will be lost. ' : ''}Want to keep them instead? Use Store — it’s free and nothing is lost. You can undo this.`, 'Remove');
    if (!ok) return;
    const copies = clone(pieces);
    let back = 0;
    for (const b of pieces) back += L.sell(s, b.id);
    for (const b of pieces) sel.delete(b.id);
    if (session) { session.refund += back; persistSession(); }
    record({ kind: 'remove', pieces: copies, refund: back });
    sfx.coins();
    if (back) toast(`+${back} coins`, 'good');
    save();
    paintSel();
  }
  // ----- storage -----
  /** Lift the selected pieces into Storage (nothing is sold; they keep crops, queues and timers). */
  function storeSel(ids = selIds(), quiet = false): void {
    if (!ids.length) return;
    cancelGroup();
    const pieces = ids.map((id) => s.buildings.find((b) => b.id === id)!).filter((b) => !L.cantStore(b));
    if (!pieces.length) { toast(L.cantStore(s.buildings.find((b) => b.id === ids[0])!) || 'Nothing to store here.', 'info'); return; }
    for (const p of pieces) { const c = view?.centerOf(p.id); if (c) view?.sparkle(c.x, 0.5, c.z, 6); }
    const r = L.store(s, pieces.map((p) => p.id));
    for (const p of r.stored) sel.delete(p.id);
    record({ kind: 'store', pieces: clone(r.stored) });
    sfx.whoosh();
    save();
    paintSel();
    if (!quiet) toast(`${plural(r.stored.length, 'piece')} in Storage${r.kept.length ? ` — the ${r.kept.map((k) => L.item(s.buildings.find((b) => b.id === k.id)!.item).name).join(' and ')} stays` : ''}`, 'good');
  }
  /** "Store…" with nothing selected: everything, or one kind of thing. */
  function storeMenu(anchor: HTMLElement): void {
    const all = s.buildings.filter((b) => !L.cantStore(b));
    const byCat = (c: L.StoreCat) => all.filter((b) => L.storeCat(b.item) === c);
    const rows = [
      { icon: 'box' as LandIcon, label: 'Store everything', n: all.length, run: () => void storeMany(all.map((b) => b.id), 'everything') },
      ...L.STORE_CATS.map((c) => ({ icon: ({ house: 'house', factory: 'workshop', field: 'wheat', decor: 'flower', road: 'select' } as Record<L.StoreCat, LandIcon>)[c.id], label: c.name, n: byCat(c.id).length, run: () => void storeMany(byCat(c.id).map((b) => b.id), c.name.toLowerCase()) })),
    ].filter((r) => r.n > 0) as { icon: LandIcon; label: string; n: number; run: () => void }[];
    if (!rows.length) { toast('Nothing on the map can be stored — the Town Hall and Gate stay.', 'info'); return; }
    openMenu(anchor, 'Store…', rows.map((r) => ({ icon: r.icon, label: r.label, meta: String(r.n), run: r.run })));
  }
  async function storeMany(ids: number[], what: string): Promise<void> {
    if (ids.length > 3 && !(await confirmDialog(`Store ${what}?`, `${plural(ids.length, 'piece')} go into Storage. The Town Hall and Crossing Gate stay. Nothing is sold or lost — place them back any time, or Cancel editing to undo it all.`, 'Store', false))) return;
    storeSel(ids);
  }
  /** Place every stored piece back where it was (or the nearest free spot). Whatever doesn't fit stays in Storage. */
  function restoreAllNow(): void {
    cancelGroup();
    const r = L.restoreAll(s);
    if (!r.placed.length) { toast(r.left.length ? 'No room right now — move something or expand your land, then try again.' : 'Storage is empty.', 'info'); return; }
    record({ kind: 'unstore', pieces: clone(r.placed) });
    sfx.build();
    save();
    view?.settle(r.placed.map((p) => p.id));
    sel.clear(); for (const p of r.placed) sel.add(p.id);
    if (!bag().length) drawer.hidden = true; // everything is back on the map: show the town
    paintSel();
    toast(r.left.length ? `Placed ${r.placed.length} · ${plural(r.left.length, 'piece')} didn’t fit — still safe in Storage` : `Placed ${plural(r.placed.length, 'piece')} back ✓`, 'good', 3200);
  }
  /** Pick a stored piece of this kind up and carry it onto the map. */
  function placeFromStore(itemId: string): void {
    const p = bag().find((b) => b.item === itemId);
    if (!p) return;
    drawer.hidden = true;
    startPlacing(p.item, undefined, p.id);
  }
  // ----- storage drawer -----
  function openDrawer(tab = drawerTab): void { closeMenu(); drawerTab = tab; drawer.hidden = false; paintDrawer(); paintEdit(); }
  function closeDrawer(): void { drawer.hidden = true; paintEdit(); }
  function paintDrawer(): void {
    const items = bag();
    const inTab = drawerTab === 'all' ? items : items.filter((b) => L.storeCat(b.item) === drawerTab);
    const groups = new Map<string, L.Placed[]>();
    for (const b of inTab) groups.set(b.item, [...(groups.get(b.item) ?? []), b]);
    const tabs = [{ id: 'all' as const, name: 'All', n: items.length }, ...L.STORE_CATS.map((c) => ({ id: c.id, name: c.short, n: items.filter((b) => L.storeCat(b.item) === c.id).length }))].filter((t) => t.id === 'all' || t.n > 0);
    if (drawerTab !== 'all' && !tabs.some((t) => t.id === drawerTab)) { drawerTab = 'all'; paintDrawer(); return; }
    const note = (ps: L.Placed[]) => { const now = Date.now(); const g = ps.filter((p) => p.crop).length, q = ps.filter((p) => p.queue?.length).length, c = ps.filter((p) => p.doneAt && p.doneAt > now).length; return [g ? `🌱 ${g} growing` : '', q ? `⚙️ ${q} busy` : '', c ? `🔨 ${c} building` : ''].filter(Boolean).join(' · '); };
    drawer.replaceChildren(
      h('div', { class: 'land-store-head' }, h('span', { class: 'land-sheet-ic' }, landIcon('box', 30)),
        h('div', null, h('h3', null, 'Storage'), h('small', { class: 'muted' }, items.length ? `${plural(items.length, 'piece')} · tap one to place it` : 'Empty')),
        items.length ? btn(h('span', { class: 'row' }, landIcon('upload', 18), h('span', null, 'Restore all')), { kind: 'primary', size: 'sm', title: 'Put everything back where it was (or the nearest free spot)', onClick: restoreAllNow }) : null,
        btn(landIcon('close', 18), { kind: 'plain', size: 'sm', title: 'Close', onClick: closeDrawer })),
      ...(tabs.length > 2 ? [h('div', { class: 'land-tabs land-store-tabs', role: 'tablist' }, ...tabs.map((t) => h('button', { class: `land-tab ${t.id === drawerTab ? 'on' : ''}`, type: 'button', role: 'tab', 'data-tab': t.id, 'aria-selected': String(t.id === drawerTab), onclick: () => openDrawer(t.id) }, h('span', null, t.name), h('i', { class: 'land-tab-n' }, String(t.n)))))] : []),
      items.length ? h('div', { class: 'land-store-grid' }, ...[...groups.entries()].map(([itemId, ps]) => {
        const it = L.item(itemId);
        const card = h('button', { class: 'land-card land-store-card', type: 'button', 'data-item': itemId, title: `Place a ${it.name}` },
          h('span', { class: 'land-card-art' }, thumb(itemId, it.emoji), h('i', { class: 'land-store-n' }, `×${ps.length}`)),
          h('b', null, it.name), h('small', null, note(ps) || (isTouch() ? 'Tap to place' : 'Click to place')));
        card.addEventListener('click', () => placeFromStore(itemId));
        return card;
      })) : h('div', { class: 'land-store-empty' }, mascot(56, { sparkles: false, interactive: false }), h('p', null, 'Select pieces and tap Store to tuck them away safely.')));
  }
  // ----- a small cream popover menu above the toolbar (Store…) -----
  let menuEl: HTMLElement | null = null;
  const closeMenu = () => { menuEl?.remove(); menuEl = null; };
  function openMenu(anchor: HTMLElement, title: string, rows: { icon: LandIcon; label: string; meta: string; run: () => void }[]): void {
    closeMenu();
    const m = h('div', { class: 'land-menu', role: 'menu' }, h('small', null, title), ...rows.map((r) => {
      const b = h('button', { class: 'land-menu-item', type: 'button', role: 'menuitem' }, landIcon(r.icon, 22), h('span', null, r.label), h('i', null, r.meta));
      b.addEventListener('click', () => { closeMenu(); r.run(); });
      return b;
    }));
    stage.append(m);
    menuEl = m;
    const ar = anchor.getBoundingClientRect(), sr = stage.getBoundingClientRect();
    const x = Math.max(8, Math.min(sr.width - m.offsetWidth - 8, ar.left - sr.left + ar.width / 2 - m.offsetWidth / 2));
    m.style.left = `${x}px`;
    m.style.bottom = `${sr.bottom - ar.top + 10}px`;
    const off = (e: Event) => { if (!m.contains(e.target as Node)) { closeMenu(); removeEventListener('pointerdown', off, true); } };
    setTimeout(() => addEventListener('pointerdown', off, true));
  }
  // ----- undo / redo -----
  function applyOp(op: EditOp, forward: boolean): void {
    if (op.kind === 'move') {
      const d = forward ? 1 : -1;
      L.moveGroup(s, op.ids, op.dx * d, op.dz * d);
      sel.clear(); for (const id of op.ids) sel.add(id);
      view?.settle(op.ids);
    } else if (op.kind === 'turn') {
      const b = s.buildings.find((o) => o.id === op.id);
      if (!b) throw new Error('That’s gone.');
      L.move(s, b.id, b.x, b.z, forward ? op.to : op.from);
    } else if (op.kind === 'store' || op.kind === 'unstore') {
      const toStore = op.kind === 'store' ? forward : !forward;
      if (toStore) { const r = L.store(s, op.pieces.map((p) => p.id)); if (r.stored.length !== op.pieces.length) throw new Error('Some of those pieces aren’t on the map any more.'); for (const p of op.pieces) sel.delete(p.id); }
      else { L.unstoreExact(s, op.pieces); sel.clear(); for (const p of op.pieces) sel.add(p.id); view?.settle(op.pieces.map((p) => p.id)); }
    } else if (forward) {
      for (const p of op.pieces) L.sell(s, p.id);
      if (session) session.refund += op.refund;
    } else {
      if (s.coins < op.refund) throw new Error('You need the coins you got back to undo this.');
      L.restore(s, op.pieces);
      s.coins -= op.refund;
      if (session) session.refund -= op.refund;
      sel.clear(); for (const p of op.pieces) sel.add(p.id);
    }
    persistSession();
  }
  function undo(): void {
    cancelGroup();
    const op = undoStack.pop();
    if (!op) return;
    try { applyOp(op, false); redoStack.push(op); sfx.hop(); save(); }
    catch (e) { undoStack.push(op); toast(`Can’t undo — ${(e as Error).message.replace(/\.$/, '').toLowerCase()}.`, 'info'); }
    paintSel();
  }
  function redo(): void {
    cancelGroup();
    const op = redoStack.pop();
    if (!op) return;
    try { applyOp(op, true); undoStack.push(op); sfx.hop(); save(); }
    catch (e) { redoStack.push(op); toast(`Can’t redo — ${(e as Error).message.replace(/\.$/, '').toLowerCase()}.`, 'info'); }
    paintSel();
  }
  /** Everything whose middle is inside the dragged rectangle (client coordinates). */
  function selectArea(x0: number, y0: number, x1: number, y1: number, add: boolean): void {
    if (!view) return;
    const r = wrap.getBoundingClientRect();
    const [ax, bx] = [Math.min(x0, x1) - r.left, Math.max(x0, x1) - r.left], [ay, by] = [Math.min(y0, y1) - r.top, Math.max(y0, y1) - r.top];
    if (!add) sel.clear();
    let n = 0;
    for (const b of s.buildings) {
      const p = view.screenOf(b.id, 0.3);
      if (p && p.x >= ax && p.x <= bx && p.y >= ay && p.y <= by) { sel.add(b.id); n++; }
    }
    if (n) try { sfx.collect(); } catch { /* */ }
    paintSel();
  }
  let boxEl: HTMLElement | null = null;
  function drawBox(x0: number, y0: number, x1: number, y1: number): void {
    const r = stage.getBoundingClientRect();
    if (!boxEl) { boxEl = h('div', { class: 'land-box' }); stage.append(boxEl); }
    Object.assign(boxEl.style, { left: `${Math.min(x0, x1) - r.left}px`, top: `${Math.min(y0, y1) - r.top}px`, width: `${Math.abs(x1 - x0)}px`, height: `${Math.abs(y1 - y0)}px` });
  }
  const clearBox = () => { boxEl?.remove(); boxEl = null; };
  let selTap = { t: 0, id: -1 };

  // ---------- pointer: pan, pinch, tap, drag the ghost ----------
  const pts = new Map<number, { x: number; y: number }>();
  let drag: { moved: boolean; sx: number; sy: number; ghost: boolean; painted?: boolean; picked?: boolean; touch: boolean; off?: { x: number; z: number };
    group?: { g0: { x: number; y: number }; dx0: number; dz0: number }; box?: boolean; boxTimer?: number; shift?: boolean } | null = null;
  let pinch = 0;
  let pinchAng: number | null = null;
  /** Right / middle / Alt-drag with a mouse turns and tilts the view. */
  let orbitDrag: { x: number; y: number } | null = null;
  let pinchMid: { x: number; y: number } | null = null;
  let lastPtr: { x: number; y: number } | null = null;
  const FINGER_LIFT = 64; // on touch screens the carried building sits above the finger, not under it

  /** Move the carried building to the grid square under the pointer (kept on the map). */
  function ghostTo(cx: number, cy: number, touch: boolean): void {
    if (!placing || !view) return;
    const g = view.ground(cx, cy - (touch ? FINGER_LIFT : 0));
    if (!g) return;
    const f = L.footprint(L.item(placing.item), placing.rot);
    // with a mouse the building keeps the spot where you grabbed it (no jump); on touch it floats above the finger
    const off = drag?.off ?? { x: 0, z: 0 };
    const nx = Math.max(0, Math.min(L.MAP - f.w, Math.round(g.x + off.x - f.w / 2)));
    const nz = Math.max(0, Math.min(L.MAP - f.d, Math.round(g.y + off.z - f.d / 2)));
    if (nx === placing.x && nz === placing.z) return;
    // roads and paths: drawing a line lays every tile you pass over (the first one too)
    if (L.walkway(placing.item) && placing.moving === undefined && drag) { if (!drag.painted) { paintTile(placing.x, placing.z); drag.painted = true; } paintTile(nx, nz); }
    placing.x = nx; placing.z = nz; updateGhost();
  }

  /** While carrying something near the screen edge, the view scrolls along (big moves without letting go). */
  let edgeRaf = 0;
  function edgeScroll(): void {
    cancelAnimationFrame(edgeRaf);
    const tick = () => {
      if (!drag?.ghost || !placing || !lastPtr || !view) return;
      const r = wrap.getBoundingClientRect(), m = Math.min(64, r.width * 0.12);
      const vx = lastPtr.x < r.left + m ? -(1 - (lastPtr.x - r.left) / m) : lastPtr.x > r.right - m ? 1 - (r.right - lastPtr.x) / m : 0;
      const vy = lastPtr.y < r.top + m ? -(1 - (lastPtr.y - r.top) / m) : lastPtr.y > r.bottom - m ? 1 - (r.bottom - lastPtr.y) / m : 0;
      if (vx || vy) { view.nudge(-vx * 9, -vy * 9); ghostTo(lastPtr.x, lastPtr.y, drag.touch); }
      edgeRaf = requestAnimationFrame(tick);
    };
    edgeRaf = requestAnimationFrame(tick);
  }
  const lastTap = { t: 0, x: 0, y: 0 };
  function onDown(e: PointerEvent): void {
    if (e.pointerType === 'mouse' && (e.button === 2 || e.button === 1 || (e.button === 0 && e.altKey)) && !placing) {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      orbitDrag = { x: e.clientX, y: e.clientY }; view?.stopGlide(); wrap.classList.add('panning'); cancelHold();
      return;
    }
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 2) {
      const [p1, p2] = [...pts.values()];
      pinch = Math.hypot(p1.x - p2.x, p1.y - p2.y);
      pinchMid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
      pinchAng = Math.atan2(p2.y - p1.y, p2.x - p1.x);
      drag = null; cancelHold(); view?.stopGlide();
      return;
    }
    let onGhost = false;
    if (placing && view) {
      const f = L.footprint(L.item(placing.item), placing.rot);
      // touch: the building floats above the finger, so a press just below it grabs it too
      const near = (gy: number) => { const g = view!.ground(e.clientX, gy); return !!g && g.x >= placing!.x - 0.3 && g.x <= placing!.x + f.w + 0.3 && g.y >= placing!.z - 0.3 && g.y <= placing!.z + f.d + 0.3; };
      onGhost = near(e.clientY) || view.hitGhost(e.clientX, e.clientY) || (e.pointerType !== 'mouse' && near(e.clientY - FINGER_LIFT));
    }
    drag = { moved: false, sx: e.clientX, sy: e.clientY, ghost: onGhost, touch: e.pointerType !== 'mouse' };
    if (onGhost && placing && view && e.pointerType === 'mouse') {
      const g = view.ground(e.clientX, e.clientY), f = L.footprint(L.item(placing.item), placing.rot);
      if (g) drag.off = { x: placing.x + f.w / 2 - g.x, z: placing.z + f.d / 2 - g.y };
    }
    lastPtr = { x: e.clientX, y: e.clientY };
    if (onGhost) edgeScroll();
    // select mode (or Shift-click with a mouse): grab the group, tap to select, or start an area
    if (!placing && view && pts.size === 1 && (selMode || (e.shiftKey && e.pointerType === 'mouse'))) {
      drag.shift = e.shiftKey;
      const p = view.pick(e.clientX, e.clientY, true);
      if (selMode && p?.kind === 'building' && sel.has(p.id)) {
        const g = view.ground(e.clientX, e.clientY);
        if (g) { drag.group = { g0: { x: g.x, y: g.y }, dx0: gmove?.dx ?? 0, dz0: gmove?.dz ?? 0 }; view.hover(null); }
      } else if (selMode && !gmove) { // anywhere that isn't the selection (ground, or a piece you haven't picked)
        if (e.pointerType === 'mouse') drag.box = true; // drag an empty spot: select an area (the map still pans with the keys / wheel)
        else {
          // touch: press and hold an empty spot, then drag, to select an area (a quick drag still moves the map)
          const d = drag;
          d.boxTimer = window.setTimeout(() => { if (drag === d && !d.moved && pts.size === 1) { d.box = true; drawBox(d.sx, d.sy, d.sx + 1, d.sy + 1); try { navigator.vibrate?.(10); } catch { /* */ } } }, 380);
        }
      }
      return;
    }
    // touch screens: press and hold something you've built to pick it up and move it (Move Mode).
    // With a mouse, dragging always moves the map — moving a building is the Move button (no accidental moves).
    if (!placing && view && pts.size === 1 && e.pointerType !== 'mouse') {
      const p = view.pick(e.clientX, e.clientY);
      if (p?.kind === 'building') startHold(p.id, e.clientX, e.clientY);
    }
  }

  const HOLD_MS = 450;
  let hold: { timer: number; ring: HTMLElement } | null = null;
  function startHold(id: number, x: number, y: number): void {
    cancelHold();
    const sr = stage.getBoundingClientRect();
    const ring = h('div', { class: 'land-hold', style: `left:${x - sr.left}px; top:${y - sr.top}px; --t:${HOLD_MS}ms` });
    stage.append(ring);
    const timer = window.setTimeout(() => {
      cancelHold();
      // decide a moment later: a finger-move that is still queued (a janky phone) gets processed first and cancels the pick-up
      setTimeout(() => {
        const b = s.buildings.find((o) => o.id === id);
        if (!b || !drag || drag.moved || pts.size !== 1 || placing) return;
        startPlacing(b.item, b.id);
        drag.ghost = true;
        drag.picked = true;
        sfx.hop();
        try { navigator.vibrate?.(12); } catch { /* not supported */ }
      }, 30);
    }, HOLD_MS);
    hold = { timer, ring };
  }
  function cancelHold(): void {
    if (!hold) return;
    clearTimeout(hold.timer);
    hold.ring.remove();
    hold = null;
  }
  let hoverAt = 0;
  function onMove(e: PointerEvent): void {
    if (orbitDrag && view) {
      view.orbit(-(e.clientX - orbitDrag.x) * 0.006, (e.clientY - orbitDrag.y) * 0.004);
      orbitDrag = { x: e.clientX, y: e.clientY }; paintLook();
      return;
    }
    const prev = pts.get(e.pointerId);
    if (!view) return;
    if (!prev) {
      // computers: show what's under the mouse (a soft outline + pointer cursor)
      if (e.pointerType === 'mouse' && !placing && performance.now() - hoverAt > 60) {
        hoverAt = performance.now();
        const p = view.pick(e.clientX, e.clientY);
        view.hover(p?.kind === 'building' ? p.id : null);
        wrap.style.cursor = p && p.kind !== 'ground' ? 'pointer' : '';
      }
      return;
    }
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 2) {
      // two fingers: pinch to zoom and move together to pan, at the same time
      const [p1, p2] = [...pts.values()];
      const d = Math.hypot(p1.x - p2.x, p1.y - p2.y);
      const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
      // twisting the two fingers turns the town round
      const ang = Math.atan2(p2.y - p1.y, p2.x - p1.x);
      if (pinchAng !== null) { let da = ang - pinchAng; if (da > Math.PI) da -= Math.PI * 2; else if (da < -Math.PI) da += Math.PI * 2; if (Math.abs(da) > 0.004) { view.orbit(-da); paintLook(); } }
      pinchAng = ang;
      if (pinchMid) view.nudge(mid.x - pinchMid.x, mid.y - pinchMid.y);
      if (pinch && d > 0) { view.zoom(pinch / d, mid.x, mid.y); if (Math.abs(pinch - d) > 2) tut.emit('zoom'); }
      pinch = d; pinchMid = mid;
      return;
    }
    if (!drag) return;
    lastPtr = { x: e.clientX, y: e.clientY };
    // a small wobble isn't a drag (fingers move a little when tapping)
    if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > (drag.touch ? 10 : 6)) { drag.moved = true; cancelHold(); clearTimeout(drag.boxTimer); if (!drag.ghost && !drag.group && !drag.box) wrap.classList.add('panning'); }
    if (!drag.moved) return;
    if (drag.group) {
      const g = view.ground(e.clientX, e.clientY);
      if (g) previewGroup(drag.group.dx0 + Math.round(g.x - drag.group.g0.x), drag.group.dz0 + Math.round(g.y - drag.group.g0.y));
      return;
    }
    if (drag.box) { drawBox(drag.sx, drag.sy, e.clientX, e.clientY); return; }
    if (drag.ghost && placing) ghostTo(e.clientX, e.clientY, drag.touch);
    else { view.pan(e.clientX - prev.x, e.clientY - prev.y); if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 60) tut.emit('pan'); }
  }
  function onUp(e: PointerEvent): void {
    if (orbitDrag) { orbitDrag = null; wrap.classList.remove('panning'); return; }
    pts.delete(e.pointerId);
    if (pts.size < 2) { pinch = 0; pinchMid = null; pinchAng = null; }
    const d = drag;
    drag = null;
    lastPtr = null;
    cancelAnimationFrame(edgeRaf);
    wrap.classList.remove('panning');
    cancelHold();
    if (d) clearTimeout(d.boxTimer);
    if (d?.box) { clearBox(); if (d.moved) { selectArea(d.sx, d.sy, e.clientX, e.clientY, true); return; } }
    if (d?.group && d.moved) return; // the group waits where you dropped it: "Put here" or Cancel
    if (d?.moved && !d.ghost) view?.release();
    if (!d || d.moved || d.picked || !view) return;
    if (placing) { ghostTo(e.clientX, e.clientY, false); return; }
    if (selMode || (d.shift && e.pointerType === 'mouse')) {
      const p = view.pick(e.clientX, e.clientY, true);
      if (p?.kind !== 'building') return;
      if (!selMode) enterSelect();
      const now = performance.now();
      // double-tap a road, path or field: its whole connected stretch
      if (selTap.id === p.id && now - selTap.t < 500) { for (const id of L.connected(s, p.id)) sel.add(id); selTap = { t: 0, id: -1 }; try { sfx.collect(); } catch { /* */ } paintSel(); return; }
      selTap = { t: now, id: p.id };
      toggleSel(p.id);
      return;
    }
    const p: Pick = view.pick(e.clientX, e.clientY);
    // double-tap the ground to zoom in there
    const now = performance.now();
    if ((!p || p.kind === 'ground') && now - lastTap.t < 320 && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 40) { view.zoom(0.65, e.clientX, e.clientY); lastTap.t = 0; tut.emit('zoom'); return; }
    lastTap.t = now; lastTap.x = e.clientX; lastTap.y = e.clientY;
    if (!p || p.kind === 'ground') { openPanel(null); return; }
    if (p.kind === 'resident') { talkTo(p.index); return; }
    tapBuilding(p.id);
  }

  // ---------- Fuzzies Adventures: talk to a Fuzzy, today's mission, mini-games ----------
  let talk: { index: number; el: HTMLElement; destroy: () => void } | null = null;
  let playing = false; // a mini-game is on screen
  /** today's hosts: each adventure has its own Fuzzy (the headline one when no id is given) */
  const isCloud = () => !!accounts.current?.cloud && cloudEnabled;
  const hostIndexOf = (id?: string) => A.hosts(s, view?.residentCount ?? 2, now())[id ?? A.featured(s, now()).id] ?? 0;
  const hostIndex = () => hostIndexOf();
  const hostNameOf = (id?: string) => { const i = hostIndexOf(id); return view?.residentInfo(i)?.name ?? A.character(i).name; };
  const hostName = () => hostNameOf();
  /** Tap a Fuzzy: the camera glides in, it turns to you and says hello, and the conversation card opens. */
  function talkTo(index: number): void {
    if (!view || playing) return;
    const info = view.residentInfo(index);
    if (!info || !info.available) { view.poke(index); return; }
    if (placing) cancelPlacing();
    if (selMode) exitSelect();
    if (panel) { panel = null; sheet.hidden = true; }
    document.querySelector('.land-away')?.remove();
    talk?.destroy();
    const hosted = A.hostedBy(s, index, view.residentCount, now());
    const m = A.mission(s, now(), hosted?.id);
    const isHost = !!hosted;
    const c = A.character(index);
    view.focusResident(index, c.hello[Math.floor(Math.random() * c.hello.length)].split(' ').slice(0, 3).join(' ') + '…');
    try { sfx.giggle(); } catch { /* no sound */ }
    const card = conversation({
      index, name: info.name, portrait: safePortrait(index), mission: m, isHost, hostName: hostName(),
      onStart: () => { const adv = hosted ?? m.adventure; endTalk(); startAdventure(adv); },
      onLater: () => { view?.react(index, 'wave'); endTalk(); },
      onFindHost: () => { endTalk(); findHost(); },
      onChat: () => { view?.react(index, Math.random() < 0.5 ? 'hop' : 'wave'); },
      onClose: () => endTalk(),
    });
    stage.append(card.el);
    stage.classList.add('talking');
    talk = { index, el: card.el, destroy: card.destroy };
    view.react(index, 'wave');
    tut.emit('continue');
  }
  function safePortrait(index: number): string { try { return view?.portrait(index) ?? ''; } catch { return ''; } }
  function endTalk(): void {
    if (!talk) return;
    talk.destroy();
    talk = null;
    stage.classList.remove('talking');
    view?.focusResident(null);
  }
  /** Fly to the Fuzzy who has today's adventure (or a given one) and start talking. */
  function findHost(adv?: A.Adventure): void {
    const i = hostIndexOf(adv?.id);
    if (!view) return;
    const info = view.residentInfo(i);
    if (!info) return;
    if (!info.available) { toast(`${info.name} is indoors — try again in a moment.`, 'info'); return; }
    talkTo(i);
  }
  const daily = dailyPill(() => { if (panel?.kind === 'adventures') openPanel(null); else openPanel({ kind: 'adventures' }); });
  function paintDaily(): void {
    const st = A.setStatus(s, now());
    if (st.ready && isCloud()) void syncMissions(); // the next set is due: the server issues it
    daily.update(st, hostNameOf(A.featured(s, now()).id));
    paintMarks();
  }
  /** a "Completed" mark floats over the Fuzzy whose mission is done */
  function paintMarks(): void {
    if (!view) return;
    const a = A.adventures(s, now());
    const h = A.hosts(s, view.residentCount, now());
    const marked = new Set<number>();
    for (const id in h) if (a.done[id]) { view.setMark(h[id], 'Completed'); marked.add(h[id]); }
    for (let i = 0; i < view.residentCount; i++) if (!marked.has(i)) view.setMark(i, null);
  }
  /** Cloud accounts: the server issues the mission sets with its own clock; adopt its set and what's done on other devices. */
  let syncingSet = false;
  async function syncMissions(): Promise<void> {
    if (!isCloud() || syncingSet) return;
    syncingSet = true;
    try {
      const r = await api<{ now: number; set: A.MissionSet; done: Record<string, A.DoneEntry> }>('data', 'adventure.set');
      if (Number.isFinite(r.now)) clockOffset = r.now - Date.now();
      const before = A.adventures(s, now()).set?.key;
      A.adoptSet(s, r, now());
      save();
      daily.update(A.setStatus(s, now()), hostNameOf(A.featured(s, now()).id));
      paintMarks();
      if (before && before !== r.set.key) toast('New missions have arrived — three Fuzzies are waiting!', 'fuzzy');
    } catch { /* offline: the saved set stays playable; claims wait in `pending` */ }
    finally { syncingSet = false; }
  }
  /** DEV/tests: force a set (e.g. [{ id: 'forest', variant: 'deep' }]) */
  const devSet = (list: A.SetEntry[]) => { A.issueSet(s, now(), list); save(); paintDaily(); };

  /** Leave the town for a mini-game (the town keeps running its clocks; the 3D view pauses to give the game the GPU). */
  /**
   * Three town Fuzzies to play a mini-game against you, each a clearly different colour from you and from each other: the
   * host first, then the other residents, dressed as they are in town (outfit). A small town (or one where several Fuzzies
   * share a colour) is topped up with visitors in colours nobody has yet.
   */
  function pickRivals(hostIndex: number, yours: [string, string]): { index: number; name: string; skin: [string, string]; outfit?: string }[] {
    const hue = (hex: string) => { const n = parseInt(hex.slice(1), 16), r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; if (d < 0.12) return -1; const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return (h * 60 + 360) % 360; };
    const clash = (a: [string, string], b: [string, string]) => { const ha = hue(a[0]), hb = hue(b[0]); if (ha < 0 || hb < 0) return ha === hb; const d = Math.abs(ha - hb); return Math.min(d, 360 - d) < 28; };
    const taken: [string, string][] = [yours];
    const out: { index: number; name: string; skin: [string, string]; outfit?: string }[] = [];
    const order = [hostIndex, ...Array.from({ length: view?.residentCount ?? 0 }, (_, i) => i).filter((i) => i !== hostIndex)];
    for (const i of order) {
      if (out.length >= 3) break;
      const info = view?.residentInfo(i); if (!info || taken.some((t) => clash(t, info.skin))) continue;
      taken.push(info.skin); out.push({ index: i, name: info.name, skin: info.skin, outfit: info.outfit });
    }
    const VISITORS: [string, string][] = [['#7dffcf', '#22b5a0'], ['#ffe066', '#ff8c42'], ['#7ad7ff', '#2f7fe0'], ['#b8f28a', '#4f9e2f'], ['#c8a2ff', '#7048c8'], ['#ffc078', '#e8590c'], ['#ffffff', '#b9c2cf']];
    const OUTFIT_KINDS = ['beanie', 'straw', 'scarf', 'bow', 'flower'];
    const used = new Set(out.map((r) => r.name));
    for (let k = 0; out.length < 3 && k < 40; k++) {
      const skin = VISITORS[k % VISITORS.length]; if (taken.some((t) => clash(t, skin))) continue;
      let n = (view?.residentCount ?? 0) + k; while (used.has(A.character(n).name)) n++;
      const name = A.character(n).name; used.add(name); taken.push(skin);
      out.push({ index: 100 + k, name, skin, outfit: OUTFIT_KINDS[k % OUTFIT_KINDS.length] });
    }
    return out;
  }
  function startAdventure(adv: A.Adventure): void {
    if (playing || !view) return;
    if (!adv.playable) { toast(`${adv.name} isn’t playable yet — coming soon!`, 'info'); return; }
    // once a day: when it's done it's complete — no replays (the owner's rule); it comes back when its turn comes round
    const st = A.setStatus(s, now());
    if (!A.inSet(s, adv.id, now())) { toast(`${adv.short} isn’t one of your missions right now — check the compass.`, 'info'); return; }
    if (A.adventures(s, now()).done[adv.id]) { toast(st.ready ? `✓ ${adv.short} is done — new missions are ready, tap the compass!` : `✓ ${adv.short} is done — new missions in ${A.countdown(st.unlockIn)}.`, 'info'); return; }
    playing = true;
    endTalk();
    openPanel(null);
    save();
    const sound = accounts.current?.settings.sound !== false;
    const fail = (e: unknown) => { console.error(e); playing = false; view?.start(); toast('The adventure couldn’t load — please try again.', 'bad'); };
    const pause = () => { view?.stop(); music.stop(); };
    const deluxe = accounts.current?.settings.fuzzyLook !== 'classic';
    const model = deluxe ? Promise.race([import('../../game/fuzzyGlb').then((m) => m.loadFuzzyGlb()), new Promise<null>((r) => setTimeout(() => r(null), 6000))]) : Promise.resolve(null);
    const variant = A.variantOf(s, adv.id, now())?.key ?? null;
    const seed = A.setSeed(s, adv.id, now());
    const you = { name: accounts.current?.name?.split(' ')[0] || 'You', skin: ['#ff86bb', '#b8235f'] as [string, string] };
    const hostOf = (id: string) => { const i = hostIndexOf(id); const info = view?.residentInfo(i); return { index: i, name: info?.name ?? A.character(i).name, skin: info?.skin ?? (['#b8f28a', '#4f9e2f'] as [string, string]) }; };
    if (adv.id === 'boatrace') {
      const racers = pickRivals(hostIndexOf('boatrace'), you.skin); // three clearly different colours from yours and each other
      void Promise.all([import('../../land/raceView'), model]).then(([{ runRace }]) => {
        pause();
        runRace(stage, { you, rivals: racers.map((r, i) => ({ name: r.name, skin: r.skin, skill: 0.72 + i * 0.12 })), mobile: isTouch(), sound, deluxe, variant, portrait: (i: number) => (i < 0 ? '' : safePortrait(racers[i]?.index ?? i)) }, {
          onFinish: (res) => finishAdventure(adv, { place: res.place, timeMs: res.timeMs, race: res.order.map((o) => ({ ...o, index: o.you ? -1 : racers[o.index]?.index ?? o.index })) }),
          onQuit: () => backToTown(),
          onRestart: () => { playing = false; startAdventure(adv); },
        });
      }).catch(fail);
    } else if (adv.id === 'vacuum') {
      const host = hostOf('vacuum');
      void Promise.all([import('../../land/vacuumView'), model]).then(([{ runVacuum }]) => {
        pause();
        runVacuum(stage, { mobile: isTouch(), sound, deluxe, you, host: host.name, variant, seed }, {
          onFinish: (res) => finishAdventure(adv, { place: res.place, timeMs: res.timeMs, score: res.score, vacuum: { ...res, hostPortrait: safePortrait(host.index) } }),
          onQuit: () => backToTown(),
          onRestart: () => { playing = false; startAdventure(adv); },
        });
      }).catch(fail);
    } else if (adv.id === 'forest') {
      // a lumberjack contest: the host plus two more town Fuzzies cut trees against you (the host is the sharpest)
      const host = hostOf('forest');
      const skills = [0.8, 0.65, 0.45];
      const rivals = pickRivals(host.index, you.skin).map((r, k) => ({ index: r.index, name: r.name, skin: r.skin, skill: skills[k] + (variant === 'deep' ? 0.08 : 0) }));
      void Promise.all([import('../../land/forestView'), model]).then(([{ runForest }]) => {
        pause();
        runForest(stage, { mobile: isTouch(), sound, deluxe, you, host: host.name, variant, seed, rivals }, {
          onFinish: (res) => finishAdventure(adv, { place: res.place, timeMs: res.timeMs, score: res.score, forest: { ...res, hostPortrait: safePortrait(host.index) } }),
          onQuit: () => backToTown(),
          onRestart: () => { playing = false; startAdventure(adv); },
        });
      }).catch(fail);
    } else if (GAME_LOADERS[adv.id]) {
      // every other mini-game: built on the shared kit (land/mgScene.ts), loaded by id. Town rivals: the host and the next two
      // Fuzzies play the same round (two at a medium level, one really easy — land/rivals.ts); games that support it show them.
      const host = hostOf(adv.id);
      const rivals = pickRivals(host.index, you.skin);
      void Promise.all([GAME_LOADERS[adv.id](), model]).then(([{ run }]) => {
        pause();
        run(stage, { mobile: isTouch(), sound, deluxe, you, host: host.name, variant, seed, rivals }, {
          onFinish: (res) => finishAdventure(adv, { place: res.place, timeMs: res.timeMs, score: res.score, mini: { ...res, hostPortrait: safePortrait(host.index) } }),
          onQuit: () => backToTown(),
          onRestart: () => { playing = false; startAdventure(adv); },
        });
      }).catch(fail);
    } else { playing = false; toast(`${adv.name} isn’t playable yet — coming soon!`, 'info'); }
  }
  interface AdvResult { place: number; timeMs: number; score?: number; mini?: { score: number; tier: string; title?: string; stats: { label: string; value: string }[]; standings?: { name: string; score: number; you: boolean; place: number }[]; hostPortrait: string }; race?: { name: string; place: number; you: boolean; index: number }[]; forest?: { score: number; wood: number; cleared: number; total: number; perfect: number; bestCombo: number; tier: string; hostPortrait: string; standings: { name: string; score: number; you: boolean; place: number; cleared: number }[] }; vacuum?: { score: number; collected: number; count: { small: number; large: number; gold: number }; bestCombo: number; tier: string; hostPortrait: string } }
  function backToTown(): void {
    playing = false;
    stage.querySelector('.adv-results')?.remove();
    view?.start();
    if (accounts.current?.settings.music) music.start();
    paintDaily();
    renderHud();
  }
  /** A finished mini-game: record it, pay the reward once per day (cloud accounts: only after the server agrees), show the results. */
  function finishAdventure(adv: A.Adventure, res: AdvResult): void {
    const cloud = isCloud();
    let payout: A.Payout | null = null, pending = false, trophy: TR.Award | null = null;
    const metalBefore = TR.hasTrophy(s, adv.id) ? TR.metalOf(s, adv.id) : null;
    const show = () => {
      const st = A.setStatus(s, now());
      const next = st.allDone ? (st.ready ? 'New missions are ready — tap the compass in town.' : `All three done — new missions in ${A.countdown(st.unlockIn)}.`) : `${st.total - st.doneCount} mission${st.total - st.doneCount === 1 ? '' : 's'} to go.`;
      let img: string | undefined; try { img = trophy && (trophy.isNew || trophy.upgraded) ? view?.thumbnail(trophy.id) : undefined; } catch { /* no picture */ }
      const trophyNote = trophy ? { name: trophy.name, metal: TR.METAL_NAMES[trophy.metal], isNew: trophy.isNew, upgraded: trophy.upgraded, img } : null;
      const common = { adv, place: res.place, timeMs: res.timeMs, payout, pending, next, trophy: trophyNote, best: res.score !== undefined ? (A.adventures(s, now()).bestScore[adv.id] ?? null) : null, onBack: () => { screen.remove(); backToTown(); } }; // no "play again": a mission pays once
      const screen: HTMLElement = res.mini
        ? scoreResults({ ...common, score: res.mini.score, tier: res.mini.tier, title: res.mini.title, hostPortrait: res.mini.hostPortrait, standings: res.mini.standings, stats: res.mini.stats })
        : res.vacuum
        ? scoreResults({ ...common, score: res.vacuum.score, tier: res.vacuum.tier, hostPortrait: res.vacuum.hostPortrait, stats: [{ label: 'Hairballs', value: String(res.vacuum.collected) }, { label: 'Golden', value: String(res.vacuum.count.gold) }, { label: 'Big ones', value: String(res.vacuum.count.large) }, { label: 'Best chain', value: `×${res.vacuum.bestCombo}` }] })
        : res.forest
        ? scoreResults({ ...common, score: res.forest.score, tier: res.forest.tier, hostPortrait: res.forest.hostPortrait, standings: res.forest.standings, stats: [{ label: 'Trees cut', value: String(res.forest.cleared) }, { label: 'Wood', value: String(res.forest.wood) }, { label: 'Perfect hits', value: String(res.forest.perfect) }, { label: 'Best chain', value: `×${res.forest.bestCombo}` }] })
        : resultsScreen({ ...common, order: (res.race ?? []).map((o) => ({ name: o.name, place: o.place, you: o.you, portrait: o.you ? '' : safePortrait(o.index) })) });
      stage.append(screen);
      try { if (res.place === 1) sfx.gold(); else sfx.home(); } catch { /* */ }
    };
    try {
      payout = A.finish(s, { id: adv.id, place: res.place, timeMs: res.timeMs, score: res.score }, now(), !cloud);
      // wood from the forest is a resource for the town (the mission run only — practice chops don't stock the barn)
      if (res.forest && !payout.practice) A.adventures(s, now()).wood += res.forest.wood;
      // every finished mini-game has its own trophy for the town; its metal follows your best result
      trophy = TR.award(s, adv.id, metalBefore);
    } catch (e) { toast((e as Error).message, 'bad'); backToTown(); return; }
    if (!payout.practice && cloud) {
      // the server decides whether this mission's reward was already collected (a refresh can't claim twice)
      const key = A.currentSet(s, now()).key;
      api<{ ok: boolean; coins: number; xp: number }>('data', 'adventure.claim', { set: key, id: adv.id, place: res.place, ...(res.score !== undefined ? { score: res.score } : {}) }).then((r) => {
        if (r.ok) { const p = A.payout(s, r.coins, r.xp); payout = { ...payout!, coins: r.coins, xp: r.xp, levelUps: p.levelUps }; }
        else payout = { ...payout!, practice: true, coins: 0, xp: 0 };
        save(); show();
      }).catch(() => {
        // offline: remember it and try again next time the town opens
        A.adventures(s, now()).pending.push(`${key}:${adv.id}:${res.place}`);
        pending = true; save(); show();
      });
    } else { save(); show(); }
  }
  // ---------- Fuzzies Parking Escape (land/parking) — a permanent game, not one of the daily missions ----------
  /** Open the parking game over the town; the town pauses underneath and comes back exactly as it was. */
  function openParking(): void {
    if (playing || !view) return;
    playing = true;
    endTalk(); openPanel(null);
    s.parking = PK.migratePark(s.parking);
    save();
    retryParking();
    const fail = (e: unknown) => { console.error(e); playing = false; view?.start(); toast('Parking Escape couldn’t load — please try again.', 'bad'); };
    void import('../../land/parking/game').then(({ runParking }) => {
      view?.stop(); music.stop();
      return runParking(stage, { mobile: isTouch(), state: s.parking!, coins: () => s.coins, name: accounts.current?.name?.split(' ')[0] || 'You', now }, {
        save: () => save(),
        pay: payParking,
        exit: () => { renderHud(); backToTown(); },
      });
    }).catch(fail);
  }
  /** Parking rewards go into the town's coins, each once: cloud accounts ask the server first (offline → tried again later). */
  async function payParking(list: { key: string; coins: number; why: string }[]): Promise<Payment[]> {
    const p = (s.parking ??= PK.freshPark()), out: Payment[] = [];
    // a reward that comes with a town decoration (level 100, the ladders' 25th and 50th, level 500): owned for good, placed from Build → Decor
    const grant = (key: string) => { const id = PK.DECOR_FOR_KEY[key]; if (id) { s.owned ??= {}; s.owned[id] = Math.max(1, s.owned[id] ?? 0); } };
    for (const r of list) {
      if (p.paid.includes(r.key)) { out.push({ key: r.key, coins: 0, ok: false }); continue; }
      if (isCloud()) {
        try {
          const res = await api<{ ok: boolean; coins: number }>('data', 'parking.claim', { key: r.key });
          if (res.ok) s.coins += res.coins;
          PK.settle(p, r.key); grant(r.key);
          out.push({ key: r.key, coins: res.ok ? res.coins : 0, ok: res.ok });
        } catch (e) {
          // the server said no (e.g. a holiday lot after the holiday ended): settled, nothing to pay; anything else = offline, ask again later
          if (e instanceof ApiError && e.status === 400) { PK.settle(p, r.key); out.push({ key: r.key, coins: 0, ok: false }); continue; }
          if (!p.pending.includes(r.key)) p.pending.push(r.key);
          grant(r.key);
          out.push({ key: r.key, coins: r.coins, ok: false, pending: true });
        }
      } else { s.coins += r.coins; PK.settle(p, r.key); grant(r.key); out.push({ key: r.key, coins: r.coins, ok: true }); }
    }
    save();
    return out;
  }
  /** parking rewards earned while offline: ask again */
  function retryParking(): void {
    const p = s.parking; if (!p?.pending.length || !isCloud()) return;
    for (const key of [...p.pending]) {
      api<{ ok: boolean; coins: number }>('data', 'parking.claim', { key }).then((r) => {
        if (r.ok) { s.coins += r.coins; toast(`+${r.coins} coins from Parking Escape — welcome back!`, 'fuzzy'); }
        PK.settle(p, key); save(); renderHud();
      }).catch((e) => { if (e instanceof ApiError && e.status === 400) { PK.settle(p, key); save(); } /* otherwise still offline: next time */ });
    }
  }
  /** Rewards earned offline: ask the server again (once per town visit). */
  function retryPending(): void {
    const a = A.adventures(s, now());
    if (!a.pending.length || !accounts.current?.cloud || !cloudEnabled) return;
    const list = a.pending.splice(0);
    for (const key of list) {
      const [setKey, id, place] = key.split(':');
      api<{ ok: boolean; coins: number; xp: number }>('data', 'adventure.claim', { set: setKey, id, place: Number(place) }).then((r) => {
        if (r.ok) { A.payout(s, r.coins, r.xp); toast(`+${r.coins} coins from your ${A.adventure(id)?.short ?? 'adventure'} — welcome back!`, 'fuzzy'); save(); }
      }).catch(() => { A.adventures(s, now()).pending.push(key); save(); });
    }
  }
  wrap.addEventListener('pointerdown', (e) => { if (talk && !(e.target as HTMLElement).closest('.land-talk')) { /* a tap elsewhere closes the chat; onUp decides what was tapped */ } });
  wrap.addEventListener('pointerdown', onDown);
  wrap.addEventListener('pointermove', onMove);
  wrap.addEventListener('pointerup', onUp);
  wrap.addEventListener('pointercancel', (e) => { pts.delete(e.pointerId); orbitDrag = null; drag = null; pinch = 0; pinchMid = null; pinchAng = null; lastPtr = null; cancelAnimationFrame(edgeRaf); wrap.classList.remove('panning'); cancelHold(); });
  wrap.addEventListener('pointerleave', () => { if (!pts.size) { view?.hover(null); wrap.style.cursor = ''; } });
  wrap.addEventListener('wheel', (e) => {
    e.preventDefault();
    const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * 400 : e.deltaY; // lines / pages → pixels
    view?.zoom(Math.exp(Math.max(-200, Math.min(200, dy)) * 0.0015), e.clientX, e.clientY);
    tut.emit('zoom');
  }, { passive: false });
  // no browser zoom, text selection or long-press menu over the map
  wrap.addEventListener('contextmenu', (e) => e.preventDefault());
  for (const ev of ['gesturestart', 'gesturechange']) wrap.addEventListener(ev, (e) => e.preventDefault());

  // ---------- keyboard (computers) ----------
  const keys = new Set<string>();
  const typing = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName));
  const applyKeys = () => {
    const x = (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0);
    const y = (keys.has('s') || keys.has('arrowdown') ? 1 : 0) - (keys.has('w') || keys.has('arrowup') ? 1 : 0);
    view?.setKeyPan(x, y);
    if (x || y) tut.emit('pan');
    // Q / E turn the town, F / V tilt it
    view?.setKeyOrbit((keys.has('e') ? 1 : 0) - (keys.has('q') ? 1 : 0), (keys.has('f') ? 1 : 0) - (keys.has('v') ? 1 : 0));
    paintLook();
  };
  function onKeyDown(e: KeyboardEvent): void {
    if (playing) return; // a game is open on top of the town
    if (typing(e.target) || document.querySelector('.modal-backdrop, .gift-overlay')) return;
    const k = e.key.toLowerCase();
    // editing shortcuts (select mode)
    if (selMode && (e.metaKey || e.ctrlKey) && !e.altKey) {
      if (k === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return; }
      if ((k === 'z' && e.shiftKey) || k === 'y') { e.preventDefault(); redo(); return; }
    }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (k === 'escape' && talk) { e.preventDefault(); endTalk(); return; }
    if (selMode && !placing) {
      if (k === 'escape') { e.preventDefault(); if (menuEl) closeMenu(); else if (boxEl) clearBox(); else if (gmove) cancelGroup(); else if (!drawer.hidden) closeDrawer(); else if (sel.size) { sel.clear(); paintSel(); } else saveLayout(); return; }
      if (k === 'enter' && gmove) { e.preventDefault(); confirmGroup(); return; }
      if ((k === 'delete' || k === 'backspace') && sel.size && !gmove) { e.preventDefault(); void removeSel(); return; }
      if (k === 'r' && sel.size === 1) { turnRecorded([...sel][0]); return; }
    }
    if (k === 'escape') {
      if (hold) cancelHold();
      else if (placing) cancelPlacing();
      else if (panel) openPanel(null);
      else return;
      e.preventDefault(); return;
    }
    if (k === 'enter' && placing) { e.preventDefault(); confirmPlacing(); return; }
    if (k === 'r') { if (placing) rotatePlacing(); else if (panel?.kind === 'building') turnInPlace(panel.id); return; }
    if (k === '+' || k === '=') { view?.zoom(0.8); tut.emit('zoom'); return; }
    if (k === '-' || k === '_') { view?.zoom(1.25); tut.emit('zoom'); return; }
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'q', 'e', 'f', 'v'].includes(k)) { e.preventDefault(); keys.add(k); applyKeys(); }
  }
  function onKeyUp(e: KeyboardEvent): void { if (keys.delete(e.key.toLowerCase())) applyKeys(); }
  const onBlur = () => { keys.clear(); applyKeys(); };
  addEventListener('keydown', onKeyDown);
  addEventListener('keyup', onKeyUp);
  addEventListener('blur', onBlur);

  // ---------- what the Fuzzies say ----------
  function phrase(seed: number): string {
    const r = (seed * 9301 + 49297) % 233280 / 233280;
    const ctx: string[] = [];
    if (s.buildings.some((b) => b.crop && L.cropProgress(b) >= 1)) ctx.push('Something’s ready to harvest! 🌾', 'Ooh, the fields look ready!');
    if (s.orders.some((o) => L.canFill(s, o))) ctx.push('An order is ready to deliver! 📦', 'Pssst… check the orders board!');
    if (L.barnUsed(s) > L.barnCap(s.level) * 0.85) ctx.push('The barn is nearly full! 😮');
    if (!s.buildings.some((b) => b.item === 'bakery') && s.level >= 2) ctx.push('Can we build a bakery? 🥖');
    if (!s.buildings.some((b) => b.item === 'fountain') && s.level >= 4) ctx.push('A fountain would be sooo nice ⛲');
    const general = ['This town is so fluffy!', 'I love my cottage 🏠', 'Hehe, hi there! 👋', 'Best. Day. Ever.', 'Have you played Fuzzy Crossing? 🎮', 'Mmm, smells like fresh bread 🍞', '*happy wiggle*', 'Nice weather today ☀️', 'I made a new friend!', 'Let’s grow more Sunwheat 🌾', 'Can I have a hug? 🤗', 'Tickles! Hehe!'];
    const pool = ctx.length && r < 0.6 ? ctx : general;
    return pool[Math.floor(r * 997) % pool.length];
  }

  // ---------- first-time tutorial (land/tutorial.ts = the steps; ui/landTutorial.ts = Pip's bubble) ----------
  function tutGrant(r: Reward): void {
    if (r.coins) s.coins += r.coins;
    const ups = r.xp ? L.addXp(s, r.xp) : [];
    if (r.fuzzies) rewards.earn(r.fuzzies, 'Fuzzies Land tutorial');
    for (const lv of ups) levelUp(lv);
  }
  /** Coins and stars fly from where the step was done to the counters. */
  function tutCelebrate(at: { x: number; y: number } | null, r?: Reward): void {
    if (!r || !at) return;
    if (r.coins) burst('coin', at, Math.ceil(r.coins / 6));
    if (r.xp) setTimeout(() => burst('star', at, Math.ceil(r.xp! / 3)), 180);
  }
  const tut = new TutorialManager(s, tutGrant, () => save());
  /** If a step needs a few coins you don't have, Pip covers them — the tutorial can never get stuck. */
  function tutCoins(): void {
    const short = tut.coinsShort(s.coins);
    if (!short) return;
    s.coins += short;
    toast(`Pip gave you ${short} coins for this step`, 'good');
    save();
  }
  tut.on((ev) => {
    if (ev.type === 'step') tutCoins();
    if (ev.type === 'finished' && tut.state.status === 'done') { sfx.level(); toast('Tutorial complete — enjoy your town!', 'good'); }
  });
  let tutUi: { refresh(): void; destroy(): void } | null = null;
  function startTutorial(): void {
    if (tutUi) { tutUi.refresh(); return; }
    tutCoins();
    tutUi = mountTutorial({ stage, tut, target: tutTarget, onCelebrate: tutCelebrate, busy: () => !sheet.hidden || !!placing || selMode || !!stage.querySelector('.land-levelup, .land-away'),
      onWelcomeDone: () => { const hall = s.buildings.find((b) => b.item === 'hall'); const c = hall && view?.centerOf(hall.id); if (c && view) view.flyTo(c.x + 1.5, c.z + 3, Math.min(view.dist, 19), 1.4); }, keepClear: () => [prefs.dock ? bar : dockTab, placeBar, sheet, quick, stage.querySelector('.land-levelup'), stage.querySelector('.land-away')], keepSoft: () => [hud, prefs.side ? side : null], reduceMotion: !!a.settings.reduceMotion, sound: () => accounts.current?.settings.sound !== false });
  }
  let tutFly = { id: -1, at: 0 };
  /** What to point at right now, from the live game (never fixed coordinates) — and always something you can actually tap. */
  function tutTarget(): TutTarget | null {
    const t = tutTargetRaw();
    const el = t?.el as HTMLElement | null | undefined;
    if (el?.isConnected && !sheet.hidden && !sheet.contains(el)) {
      // the control is under an open panel: close the panel first
      const r = el.getBoundingClientRect();
      const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      if (top && !el.contains(top) && sheet.contains(top)) return { el: sheet.querySelector('.land-sheet-head .btn'), hint: 'Close this panel first (✕)' };
    }
    return t;
  }
  function tutTargetRaw(): TutTarget | null {
    if (!tut.active) return null;
    const touch = isTouch();
    const q = (sel: string, root: ParentNode = stage) => root.querySelector(sel);
    const dockBtn = (k: string) => (prefs.dock ? q(`.land-dock-btn.is-${k}`) : dockTab);
    const at = (id: number, y = 1.2) => {
      const p = view?.screenOf(id, y);
      if (!p || !view) return null;
      // off screen (or hidden under the bars)? glide the camera over to it — gently, and not again for a few seconds
      const w = stage.clientWidth, hh = stage.clientHeight;
      if ((p.x < 40 || p.y < 90 || p.x > w - 40 || p.y > hh - 120) && (tutFly.id !== id || Date.now() - tutFly.at > 4000)) {
        const c = view.centerOf(id);
        if (c) { tutFly = { id, at: Date.now() }; view.flyTo(c.x, c.z + 0.5, Math.min(view.dist, 20), 0.9); }
      }
      return { x: p.x, y: p.y };
    };
    const now = Date.now();
    const placeBtn = () => placeBar.querySelector('.btn-primary');
    const viaShop = (tab: string, itemId: string, tabName: string): TutTarget => {
      if (panel?.kind !== 'shop') return { el: dockBtn('build'), hint: prefs.dock ? 'Tap Build' : 'Tap Menu, then Build' };
      if (panel.tab !== tab) return { el: q(`.land-tab[data-tab="${tab}"]`, sheet), hint: `Open the ${tabName} tab` };
      return { el: q(`.land-card[data-item="${itemId}"]`, sheet), hint: `Tap the ${L.item(itemId).name}` };
    };
    // still placing something from an earlier step (roads and fields keep going in a row)? finish that first
    if (placing && !['home', 'move', 'road', 'decor'].includes(tut.step.id)) return { el: placeBar.querySelector('button[title^="Cancel"]'), hint: 'Done placing? Tap ✕ to stop' };
    const fields = s.buildings.filter((b) => b.item === 'field');
    const ready = fields.find((b) => b.crop && L.cropProgress(b) >= 1);
    const empty = fields.find((b) => !b.crop);
    const growing = fields.find((b) => b.crop);
    const secsLeft = (b: L.Placed) => Math.max(1, Math.ceil((L.good(b.crop!.good).time * 1000 - (now - b.crop!.at)) / 1000));
    /** Need goods first: lead the player to harvest (or plant, or wait for) a field. */
    const farm = (why: string): TutTarget => {
      if (ready) return { point: at(ready.id, 0.3), r: 30, hint: `${why} Tap the golden field to harvest it` };
      if (panel?.kind === 'building' && s.buildings.find((b) => b.id === (panel as { id: number }).id && b.item === 'field' && !b.crop)) return { el: q('.land-recipe[data-good="wheat"]', sheet), hint: 'Tap Sunwheat to plant it' };
      if (growing) return { point: at(growing.id, 0.3), r: 30, hint: `${why} This field is growing — about ${secsLeft(growing)}s left` };
      if (empty) return { point: at(empty.id, 0.3), r: 30, hint: `${why} Tap this empty field to plant` };
      return { hint: why };
    };
    switch (tut.step.id) {
      case 'camera': return { hint: !tut.has('pan') ? (touch ? 'Drag one finger across the map' : 'Drag the map with your mouse (or use the arrow keys)') : (touch ? 'Pinch with two fingers to zoom' : 'Scroll, or use the + and − buttons, to zoom') };
      case 'home':
        if (placing && L.item(placing.item).kind === 'house' && placing.moving === undefined) return { el: placeBtn(), hint: 'Drag it to a green spot, then tap “Build here”' };
        return viaShop('house', 'cottage', 'Houses');
      case 'move': {
        if (placing?.moving !== undefined) return { el: placeBtn(), hint: 'Drag it to a new spot, then tap “Put here”' };
        if (panel?.kind === 'building' && !quick.hidden) return { el: quick.querySelector('button'), hint: 'Tap Move' };
        const house = s.buildings.find((b) => L.item(b.item).kind === 'house' && !b.doneAt) ?? s.buildings.find((b) => L.item(b.item).kind === 'house');
        return house ? { point: at(house.id), hint: touch ? 'Tap this house (or press and hold it)' : 'Click this house' } : null;
      }
      case 'road':
        if (placing && L.walkway(placing.item)) return { el: placeBtn(), hint: 'Drag across the grass to lay the road' };
        return viaShop('decor', 'road', 'Decor');
      case 'crops':
        if (!tut.has('harvest') && ready) return { point: at(ready.id, 0.3), r: 30, hint: 'Tap the golden field to harvest it' };
        if (!tut.has('plant')) {
          if (panel?.kind === 'building' && s.buildings.find((b) => b.id === (panel as { id: number }).id && b.item === 'field' && !b.crop)) return { el: q('.land-recipe[data-good="wheat"]', sheet), hint: 'Tap Sunwheat to plant it' };
          if (empty) return { point: at(empty.id, 0.3), r: 30, hint: 'Tap this empty field' };
          return { el: dockBtn('build'), hint: 'All fields are busy — harvest one, or build a new Field (Build → Farming)' };
        }
        return growing ? { point: at(growing.id, 0.3), r: 30, hint: `It’s growing — about ${secsLeft(growing)}s left, then tap it` } : null;
      case 'collect': {
        const c = prefs.dock ? q('.land-dock-btn.is-collect') : null;
        if (c) return { el: c, hint: 'Tap Collect' };
        const done = s.buildings.find((b) => b.doneAt && b.doneAt <= now);
        if (done) return { point: at(done.id), hint: `Tap your ${L.item(done.item).name} — it’s ready!` };
        if (ready) return { point: at(ready.id, 0.3), r: 30, hint: 'Tap the golden field' };
        const busy = s.buildings.find((b) => b.doneAt);
        if (busy) return { point: at(busy.id), hint: `Your ${L.item(busy.item).name} is almost built — ${Math.max(1, Math.ceil((busy.doneAt! - now) / 1000))}s` };
        return { hint: 'Wait a moment — something will be ready soon' };
      }
      case 'order':
        if (panel?.kind === 'orders') {
          const ok = q('.land-order.ready .btn-primary', sheet);
          if (ok) return { el: ok, hint: 'Tap Deliver' };
          return farm('Not enough goods yet.');
        }
        return { el: dockBtn('orders'), hint: 'Tap Orders' };
      case 'coins':
        if (L.barnUsed(s) === 0) return farm('Your barn is empty.');
        if (panel?.kind === 'barn') { const sell = q('.land-good button', sheet); return sell ? { el: sell, hint: 'Tap Sell' } : null; }
        return { el: dockBtn('barn'), hint: 'Tap Barn' };
      case 'shop':
        if (panel?.kind !== 'shop') return { el: dockBtn('build'), hint: 'Tap Build' };
        return { el: q('.land-tab:not(.on)', sheet), hint: 'Now try another tab' };
      case 'decor':
        if (placing && L.item(placing.item).kind === 'decor' && !L.walkway(placing.item)) return { el: placeBtn(), hint: 'Drag it somewhere pretty, then tap “Build here”' };
        return viaShop('decor', 'tree', 'Decor');
      default: return null;
    }
  }

  // ---------- setup ----------
  const stage = h('div', { class: 'land-wrap' }, wrap, overlay, quick, hud, editTag, side, bar, dockTab, placeBar, drawer, editBar, sheet);
  const round = (ic: Node, title: string, onClick: () => void, cls = '', label = '') => {
    const b = h('button', { class: `land-round ${cls} ${label ? 'labeled' : ''}`, type: 'button', title, 'aria-label': title }, ic, label ? h('span', { class: 'land-round-l' }, label) : null);
    b.addEventListener('click', onClick);
    return b;
  };
  const musicBtn = round(landIcon('music', 26), 'Music', () => {
    accounts.update((x) => (x.settings.music = !x.settings.music));
    if (accounts.current?.settings.music) music.start(); else music.stop();
    paintMusic();
  });
  const paintMusic = () => {
    const on = accounts.current?.settings.music !== false;
    musicBtn.replaceChildren(landIcon(on ? 'music' : 'musicOff', 26));
    musicBtn.title = on ? 'Music on — tap to turn off' : 'Music off — tap to turn on';
  };
  paintMusic();
  // browsers only allow sound after a tap/click: start the music on the first one if it couldn't start yet
  stage.addEventListener('pointerdown', () => { if (!music.playing) setTimeout(() => music.start(), 50); });
  // "Look around": turn the town, tilt it and get close — like walking round a toy town
  const lookBtn = (ic: Parameters<typeof landIcon>[0], title: string, on: () => void, flip = false) => {
    const b = h('button', { class: `land-look-b ${flip ? 'flip' : ''}`, type: 'button', title, 'aria-label': title }, landIcon(ic, 26));
    b.addEventListener('click', () => { on(); paintLook(); });
    return b;
  };
  const lookResetBtn = lookBtn('undo', 'Back to the usual view', () => view?.resetView());
  const lookPop = h('div', { class: 'land-look', hidden: true },
    lookBtn('rotate', 'Turn left', () => view?.turnBy(-45), true), lookBtn('rotate', 'Turn right', () => view?.turnBy(45)),
    lookBtn('tiltUp', 'Look from higher up', () => view?.tiltBy(10)), lookBtn('tiltDown', 'Look from lower down', () => view?.tiltBy(-10)),
    lookBtn('zoomIn', 'Closer', () => view?.zoom(0.7)), lookBtn('zoomOut', 'Farther', () => view?.zoom(1.4)),
    lookResetBtn,
    h('small', null, isTouch() ? 'Twist two fingers to turn' : 'Right-drag or Q / E to turn'));
  stage.append(lookPop);
  function paintLook(): void {
    lookResetBtn.classList.toggle('on', !!view?.turned);
    stage.querySelector('.land-lookbtn')?.classList.toggle('turned', !!view?.turned);
  }
  function toggleLook(): void { lookPop.hidden = !lookPop.hidden; stage.querySelector('.land-lookbtn')?.classList.toggle('open', !lookPop.hidden); }
  const sideToggle = h('button', { class: 'land-side-toggle', type: 'button' }, landIcon('chevRight', 18));
  const sideBody = h('div', { class: 'land-side-body' }, ...[
    musicBtn,
    round(landIcon('compass', 30), 'Adventures — today’s mission', () => (panel?.kind === 'adventures' ? openPanel(null) : openPanel({ kind: 'adventures' })), 'land-adv-btn'),
    round(landIcon('edit', 30), 'Edit town — move, store & rearrange', () => (selMode ? saveLayout() : enterSelect()), 'land-select'),
    round(landIcon('car', 32), 'Parking Escape — the puzzle game', () => openParking(), 'land-park-btn'),
    round(landIcon('orbit', 30), 'Look around — turn, tilt and get close', () => toggleLook(), 'land-lookbtn', 'Look'),
    round(landIcon('portal', 32), 'Play Fuzzy Crossing', () => goPlay(s.buildings.find((b) => b.item === 'gate')?.id), 'land-play', 'Crossing'),
    isTouch() ? null : h('div', { class: 'land-zoom' },
      round(landIcon('zoomIn', 20), 'Zoom in', () => { view?.zoom(0.8); tut.emit('zoom'); }),
      round(landIcon('zoomOut', 20), 'Zoom out', () => { view?.zoom(1.25); tut.emit('zoom'); }))].filter((x) => x !== null) as HTMLElement[]);
  const paintSide = () => {
    side.classList.toggle('tucked', !prefs.side);
    sideToggle.replaceChildren(landIcon(prefs.side ? 'chevRight' : 'chevLeft', 18));
    sideToggle.title = prefs.side ? 'Hide these buttons' : 'Show the buttons';
    sideToggle.setAttribute('aria-label', sideToggle.title);
    sideToggle.setAttribute('aria-expanded', String(prefs.side));
  };
  sideToggle.addEventListener('click', () => { prefs.side = !prefs.side; savePrefs(); paintSide(); });
  side.append(sideToggle, sideBody);
  paintSide();
  paintDock();
  renderHud();

  const hasWebGL = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } })();
  if (!hasWebGL) {
    wrap.append(h('div', { class: 'land-nogl' }, mascot(80), h('p', null, 'Fuzzies Land needs 3D graphics, which this browser has turned off.')));
  } else {
    wrap.classList.add('loading');
    const canvas = h('canvas', { class: 'land-canvas', 'aria-label': 'Fuzzies Land — your town' });
    wrap.append(canvas);
    void import('../../land/view3d').then(({ LandView }) => {
      if (!alive) return;
      view = new LandView(canvas, overlay, isTouch(), phrase);
      // a tap on a ready bubble = a tap on its building (bigger, easier target than the building itself)
      view.onBubble = (id) => { if (!placing && !selMode && !talk && !playing) tapBuilding(id); };
      view.sync(s);
      applySeason();
      paintDaily();
      retryPending();
      retryParking();
      void syncMissions();
      // the owner's 3D Fuzzy model: swapped in once it has loaded (off in Settings → Deluxe 3D Fuzzies)
      if (accounts.current?.settings.fuzzyLook !== 'classic') void import('../../game/fuzzyGlb').then((m) => m.loadFuzzyGlb()).then((g) => { if (g && alive && view) view.useDeluxe(true); });
      // where you left the camera last time (none on a first visit): the town opens right there
      let cam: { x: number; z: number; d: number } | null = null;
      try { cam = JSON.parse(localStorage.getItem('fz.land.cam') || 'null'); if (!cam || !Number.isFinite(cam.x) || !Number.isFinite(cam.z) || !Number.isFinite(cam.d)) cam = null; } catch { cam = null; }
      if (import.meta.env.DEV) (window as unknown as { __land: unknown }).__land = { view, state: s, tut, tutTarget, fuzzies: () => rewards.balance(), tutRefresh: () => tutUi?.refresh(), sel: () => [...sel], selMode: () => selMode, storage: () => L.storage(s), session: () => session, undo: () => undoStack.length, enter: enterSelect, save: saveLayout, cancel: cancelEditing, events: E, rulesMod: L, acct: accounts, season: () => seasonKey, applySeason, openEvents: (tab: string) => openPanel({ kind: 'events', tab }), openShop: (tab: 'decor') => openPanel({ kind: 'shop', tab }), trophies: TR, adv: A, openParking, talkTo, endTalk, findHost, startAdventure, hostIndex, hostIndexOf, devSet, syncMissions, setStatus: () => A.setStatus(s, now()), talking: () => !!talk, playing: () => playing }; // for tests
      if (a.settings.reduceMotion) view.placeAt(cam); else view.swoopIn(cam);
      setTimeout(() => { if (alive && !tut.active) welcomeBack(); }, a.settings.reduceMotion ? 300 : 2300);
      // the tutorial (new players, or a replay from Settings → Help) starts once the camera has swooped in
      setTimeout(() => { if (alive) startTutorial(); }, a.settings.reduceMotion ? 300 : 2200);
      resumeEditing();
      view.start();
      music.start();
      wrap.classList.remove('loading');
      requestAnimationFrame(() => dispatchEvent(new Event('fz:scene-ready')));
    }).catch((e) => { console.error(e); wrap.classList.remove('loading'); toast('Fuzzies Land couldn’t start 3D graphics', 'bad'); });
  }

  // timers in open panels and HUD badges tick every second; crops keep growing while the view shows them
  let dailyAt = 0;
  const tick = setInterval(() => {
    const now = Date.now();
    if (now - dailyAt > 30_000) { dailyAt = now; paintDaily(); }
    let crossed = false;
    for (const el of sheet.querySelectorAll<HTMLElement>('[data-end]')) {
      const left = Number(el.dataset.end) - now;
      if (left > 0) { el.textContent = fmt(left) + (el.dataset.suffix ?? ''); continue; }
      // just finished: show "Ready!" once and redraw the panel once (not every second, or taps get lost)
      el.textContent = 'Ready!';
      el.removeAttribute('data-end');
      crossed = true;
    }
    for (const el of sheet.querySelectorAll<HTMLElement>('[data-bar]')) {
      const total = Number(el.dataset.total);
      el.style.width = `${Math.min(100, (1 - (Number(el.dataset.bar) - now) / total) * 100)}%`;
    }
    if (crossed && panel?.kind === 'building') renderPanel(); // something just finished: show Harvest / Collect
    renderHud();
    if (now % 60_000 < 1000) applySeason();
  }, 1000);
  const ro = new ResizeObserver(() => view?.resize());
  ro.observe(stage);
  const remember = () => { if (view) try { localStorage.setItem('fz.land.cam', JSON.stringify({ x: view.target.x, z: view.target.z, d: view.dist })); } catch { /* */ } };
  const onVis = () => { if (document.hidden) { view?.stop(); music.stop(); remember(); save(); } else { view?.start(); music.start(); adoptRemote(); } };
  document.addEventListener('visibilitychange', onVis);
  const onHide = () => { remember(); save(); };
  addEventListener('pagehide', onHide);
  const off = accounts.onChange(() => {
    for (const b of hud.querySelectorAll('.fz-balance')) b.textContent = String(rewards.balance());
    adoptRemote();
    applySeason();
  });

  return {
    el: h('div', { class: 'page land' }, stage),
    destroy: () => { closeMenu(); endTalk(); tutUi?.destroy(); removeEventListener('keydown', onKeyDown); removeEventListener('keyup', onKeyUp); removeEventListener('blur', onBlur); cancelAnimationFrame(quickRaf); cancelAnimationFrame(edgeRaf); music.stop(); remember(); save(); alive = false; clearInterval(tick); removeEventListener('pagehide', onHide); ro.disconnect(); document.removeEventListener('visibilitychange', onVis); off(); view?.destroy(); },
  };
}
