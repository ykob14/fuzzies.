/**
 * Fuzzies Land screen: the 3D town plus its HUD — level & XP, coins, population, Fuzzies — and the
 * panels for building, planting, workshops, orders and the barn. Rules: land/rules.ts. Drawing: land/view3d.ts.
 */
import type { Screen } from '../app';
import { openShop } from '../shop';
import * as L from '../../land/rules';
import type { LandView, Pick } from '../../land/view3d';
import { accounts } from '../../core/account';
import { rewards } from '../../core/rewards';
import { sfx } from '../../game/sound';
import { music } from '../../game/music';
import { travel } from '../travel';
import { h, btn, icon, fuzzyMark, toast, confirmDialog } from '../dom';
import { mascot } from '../mascot';
import { isTouch } from '../../core/util';
import { landIcon, type LandIcon } from '../landIcons';
import { TutorialManager, type Reward } from '../../land/tutorial';
import { mountTutorial, type TutTarget } from '../landTutorial';

type Panel = null | { kind: 'shop'; tab: L.Kind | 'farm' | 'fuzzies' } | { kind: 'building'; id: number } | { kind: 'orders' } | { kind: 'barn' };

const fmt = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return s >= 3600 ? `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m` : s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`;
};

export function landScreen(): Screen {
  const a = accounts.current!;
  const s: L.LandState = JSON.parse(JSON.stringify(a.land ?? L.freshLand()));
  const lastVisit = s.savedAt;
  L.refillOrders(s);

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
  const placeBar = h('div', { class: 'land-place', hidden: true });
  let view: LandView | null = null;
  let panel: Panel = null;
  let placing: { item: string; x: number; z: number; rot: L.Rot; moving?: number } | null = null;
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
  /** Another device saved a newer town (it arrived through sync): switch to it. */
  function adoptRemote(): void {
    const remote = accounts.current?.land;
    if (!remote || remote.savedAt <= s.savedAt) return;
    for (const k of Object.keys(s)) delete (s as unknown as Record<string, unknown>)[k];
    Object.assign(s, JSON.parse(JSON.stringify(remote)));
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
    const unlocked = [...L.ITEMS.filter((i) => i.level === lv).map((i) => `${i.emoji} ${i.name}`), ...L.GOODS.filter((g) => g.level === lv).map((g) => `${g.emoji} ${g.name}`)];
    const card = h('div', { class: 'land-levelup' },
      mascot(70, { sparkles: true, interactive: false }),
      h('h2', null, `Level ${lv}!`),
      h('p', { class: 'muted' }, `+${n} Fuzzies and +${50 + lv * 10} coins`),
      unlocked.length ? h('div', { class: 'land-unlocks' }, h('small', null, 'New to unlock'), h('div', null, ...unlocked.map((u) => h('span', null, u)))) : null,
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
    const sig = JSON.stringify([s.level, s.xp, s.coins, L.population(s), rewards.balance(), L.barnUsed(s), s.orders.filter((o) => L.canFill(s, o)).length, L.awaySummary(s)]);
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
          h('div', { class: 'land-lvl-t' }, h('b', null, 'Fuzzies Land'), h('div', { class: 'land-xp' }, h('div', { style: `width:${pct}%` }), h('small', null, `${s.xp} / ${need}`))))),
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
      tool('build', 'build', 'Build', () => openPanel({ kind: 'shop', tab: 'house' })),
      tool('orders', 'parcel', 'Orders', () => openPanel({ kind: 'orders' }), ready),
      tool('barn', 'barnBig', 'Barn', () => openPanel({ kind: 'barn' }), 0, h('i', { class: `land-meter ${fill > 0.85 ? 'full' : ''}`, title: `${L.barnUsed(s)} / ${L.barnCap(s.level)}` }, h('b', { style: `width:${fill * 100}%` })))].filter((x) => x !== null) as HTMLElement[]);
    dockTab.classList.toggle('alert', waiting > 0 || ready > 0);
  }
  const badges = new Map<string, number>();

  /** Harvest, collect and open everything that's ready, in one tap. */
  function collectAllNow(): void {
    const r = L.collectAll(s);
    const parts = Object.entries(r.got).map(([k, n]) => `${L.good(k).emoji}×${n}`);
    if (!parts.length && !r.built.length) { if (r.full) toast('Your barn is full — fill some orders first.', 'info'); return; }
    sfx.collect();
    const hall = s.buildings.find((b) => b.item === 'hall');
    gain({ xp: r.xp, levelUps: r.levelUps }, hall?.id ?? 0, parts.join(' ') || '✨');
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
      h('div', { class: 'land-away-head' }, mascot(46, { sparkles: false, interactive: false }), h('div', null, h('b', null, 'While you were away…'), ago ? h('small', null, `You were gone ${ago} — your town kept busy!`) : null)),
      h('div', { class: 'land-away-list' }, ...[
        away.crops ? h('span', null, `🌾 ${away.crops} field${away.crops > 1 ? 's' : ''} ready`) : null,
        away.goods ? h('span', null, `📦 ${away.goods} good${away.goods > 1 ? 's' : ''} made`) : null,
        away.built ? h('span', null, `🏠 ${away.built} building${away.built > 1 ? 's' : ''} finished`) : null,
      ].filter((x) => x !== null) as HTMLElement[]),
      h('div', { class: 'btn-row' }, btn('Collect all', { kind: 'primary', icon: 'check', onClick: collectAllNow }), btn('Later', { kind: 'ghost', onClick: () => card.remove() })));
    stage.append(card);
  }

  // ---------- panels ----------
  function openPanel(p: Panel): void {
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
    const close = btn(null, { icon: 'close', kind: 'plain', size: 'sm', title: 'Close', onClick: () => openPanel(null) });
    const head = (title: string, sub = '', ic?: Node) => h('div', { class: 'land-sheet-head' }, ic ? h('span', { class: 'land-sheet-ic' }, ic) : null, h('div', null, h('h3', null, title), sub ? h('small', { class: 'muted' }, sub) : null), close);
    sheet.dataset.kind = panel.kind;
    if (panel.kind === 'shop') sheet.replaceChildren(head('Build', 'Tap something, then choose where it goes', landIcon('hammer', 34)), shopBody(panel.tab));
    else if (panel.kind === 'orders') sheet.replaceChildren(head('Orders', 'Fuzzies ask for goods — deliver for coins & XP', landIcon('crate', 34)), ordersBody());
    else if (panel.kind === 'barn') sheet.replaceChildren(head('Barn', `${L.barnUsed(s)} / ${L.barnCap(s.level)} spaces used`, landIcon('barn', 34)), barnBody());
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
        h('small', null, `${c.coins.toLocaleString()} coins for your town`),
        h('span', { class: 'land-price' }, fuzzyMark(16), String(c.fz)));
      card.addEventListener('click', () => {
        if (rewards.balance() < c.fz) { toast(`You need ${c.fz} Fuzzies`, 'info'); void openShop(); return; }
        spendFuzzies(c.fz);
        s.coins += c.coins;
        sfx.coins();
        toast(`+${c.coins.toLocaleString()} coins for Fuzzies Land 🪙`, 'good');
        save(); renderHud(); renderPanel();
      });
      return card;
    };
    const premium = L.ITEMS.filter((i) => i.currency === 'fuzzies');
    return [
      h('p', { class: 'land-fz-lead' }, 'Spend your Fuzzies here: coin chests, special decorations — and “Finish now” on anything that’s building.'),
      h('div', { class: 'land-shop' }, ...CHESTS.map(chest), ...premium.map((it) => itemCard(it))),
      h('div', { class: 'land-fz-more' }, btn(h('span', { class: 'row' }, fuzzyMark(18), 'Get more Fuzzies'), { kind: 'primary', size: 'sm', onClick: () => void openShop() })),
    ];
  }

  function itemCard(it: L.ItemDef): HTMLElement {
    const why = L.cantBuy(s, it.id, rewards.balance());
    const locked = s.level < it.level;
    const card = h('button', { class: `land-card ${why ? 'off' : ''} ${locked ? 'locked' : ''}`, type: 'button', title: why || it.blurb, 'data-item': it.id },
      h('span', { class: 'land-card-art' }, thumb(it.id, it.emoji), locked ? h('span', { class: 'land-card-lock' }, landIcon('lock', 26), h('small', null, `Level ${it.level}`)) : null),
      h('b', null, it.name),
      h('small', null, locked ? `Unlocks at level ${it.level}` : it.blurb),
      h('span', { class: 'land-price' }, it.currency === 'fuzzies' ? fuzzyMark(16) : landIcon('coin', 16), it.cost ? String(it.cost) : 'Free'),
      it.max && !locked ? h('i', { class: 'land-max' }, `${L.count(s, it.id)}/${it.max(s.level)}`) : null);
    card.addEventListener('click', () => {
      if (why) { toast(why, 'info'); if (it.currency === 'fuzzies' && rewards.balance() < it.cost) void openShop(); return; }
      startPlacing(it.id);
    });
    return card;
  }

  function shopBody(tab: L.Kind | 'farm' | 'fuzzies'): HTMLElement {
    const tabs: [L.Kind | 'farm' | 'fuzzies', LandIcon, string][] = [['house', 'house', 'Houses'], ['farm', 'wheat', 'Farming'], ['factory', 'workshop', 'Workshops'], ['decor', 'flower', 'Decor'], ['fuzzies', 'star', 'Fuzzies']];
    const list = L.ITEMS.filter((i) => (tab === 'farm' ? i.kind === 'field' : i.kind === tab));
    return h('div', null,
      h('div', { class: 'land-tabs', role: 'tablist' }, ...tabs.map(([k, ic, label]) => h('button', { class: `land-tab ${k === tab ? 'on' : ''}`, type: 'button', role: 'tab', 'data-tab': k, 'aria-selected': String(k === tab), onclick: () => openPanel({ kind: 'shop', tab: k }) }, landIcon(ic, 22), h('span', null, label)))),
      ...(tab === 'fuzzies' ? fuzziesBody() : [
      h('div', { class: 'land-shop' }, ...list.map((it) => itemCard(it)))]));
  }

  function ordersBody(): HTMLElement {
    return h('div', { class: 'land-orders' }, ...s.orders.map((o) => {
      const ok = L.canFill(s, o);
      return h('div', { class: `land-order ${ok ? 'ready' : ''}` },
        h('div', { class: 'land-order-who' }, h('b', null, o.who), h('small', null, ok ? 'Ready to deliver!' : 'is asking for')),
        h('div', { class: 'land-order-items' }, ...Object.entries(o.items).map(([k, n]) => {
          const have = s.barn[k] ?? 0;
          return h('span', { class: have >= n ? 'have' : '' }, `${L.good(k).emoji} ${Math.min(have, n)}/${n}`);
        })),
        h('div', { class: 'land-order-reward' }, h('span', null, landIcon('coin', 16), String(o.coins)), h('span', null, landIcon('star', 16), `${o.xp} XP`), o.fuzzies ? h('span', null, fuzzyMark(16), `+${o.fuzzies}`) : null),
        h('div', { class: 'land-order-btns' },
          btn('Deliver', { kind: ok ? 'primary' : 'soft', size: 'sm', onClick: () => {
            try {
              const g = L.fill(s, o.id);
              sfx.coins();
              const hall = s.buildings.find((b) => b.item === 'hall');
              const card = document.activeElement?.closest('.land-order') as HTMLElement | null;
              const rr = (card ?? sheet).getBoundingClientRect(), sr = stage.getBoundingClientRect();
              const from = { x: rr.left + rr.width / 2 - sr.left, y: rr.top + rr.height / 2 - sr.top };
              burst('coin', from, Math.ceil(g.coins! / 6));
              setTimeout(() => burst('star', from, Math.ceil((g.xp ?? 0) / 4)), 180);
              gain({ ...g, coins: 0, xp: 0, levelUps: g.levelUps }, hall?.id ?? 0, `+${g.coins} 🪙`);
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
    if (!items.length) return h('p', { class: 'muted' }, 'Your barn is empty. Plant some crops on your fields!');
    return h('div', { class: 'land-barn' }, ...items.map((g) => h('div', { class: 'land-good' },
      h('span', { class: 'land-good-ic' }, g.emoji), h('b', null, g.name), h('small', null, `× ${s.barn[g.id]}`),
      btn(`Sell 1 · 🪙${g.sell}`, { kind: 'ghost', size: 'sm', onClick: () => { L.sellGood(s, g.id, 1); sfx.coins(); save(); renderPanel(); tut.emit('sell'); } }))));
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
      parts.push(h('div', { class: 'land-progress' }, h('span', null, '🔨 Under construction'),
        h('div', { class: 'progress' }, h('div', { style: `width:${L.buildProgress(b) * 100}%`, 'data-bar': String(b.doneAt), 'data-total': String(total) })),
        h('small', b.doneAt > now ? { 'data-end': String(b.doneAt), 'data-suffix': ' left — it keeps building while you’re away' } : null, b.doneAt > now ? `${fmt(b.doneAt - now)} left — it keeps building while you’re away` : 'Ready!')));
      parts.push(b.doneAt > now ? rushBtn(b) : btn('Open it!', { kind: 'primary', onClick: () => tapBuilding(b.id) }));
    } else if (it.kind === 'field') {
      if (b.crop) {
        const g = L.good(b.crop.good);
        const left = g.time * 1000 - (now - b.crop.at);
        const end = b.crop.at + g.time * 1000;
        parts.push(h('div', { class: 'land-progress' }, h('span', null, `${g.emoji} ${g.name}`),
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
        if (!e) return h('div', { class: 'land-slot empty' }, h('span', null, '＋'), h('small', null, 'Free'));
        const done = e.end <= now;
        return h('div', { class: `land-slot ${done ? 'done' : ''}` }, h('span', null, L.good(e.good).emoji), h('small', done ? null : { 'data-end': String(e.end) }, done ? 'Ready' : fmt(e.end - now)));
      })));
      if (L.finished(b).length) parts.push(btn('Collect', { kind: 'primary', onClick: () => tapBuilding(b.id) }));
      parts.push(rushBtn(b));
      parts.push(h('p', { class: 'pnl-label' }, 'Make'), h('div', { class: 'land-recipes' }, ...(it.recipes ?? []).map((id) => recipe(L.good(id), () => {
        L.startMaking(s, b.id, id);
        sfx.plant();
        save(); renderPanel();
      }))));
    } else if (it.kind === 'house') {
      parts.push(h('p', null, `🏡 ${it.pop} Fuzzies live here. More houses → more Fuzzies around town!`));
    } else if (b.item === 'hall') {
      const i = L.SIZES.indexOf(s.size), e = L.EXPANSION[i];
      parts.push(h('div', { class: 'land-stats' },
        h('span', null, h('b', null, String(s.level)), h('small', null, 'Level')),
        h('span', null, h('b', null, String(L.population(s))), h('small', null, 'Fuzzies')),
        h('span', null, h('b', null, String(s.stats.harvests)), h('small', null, 'Harvests')),
        h('span', null, h('b', null, String(s.stats.orders)), h('small', null, 'Orders'))));
      parts.push(e
        ? btn(`Expand the land · 🪙 ${e.cost.toLocaleString()}${s.level < e.level ? ` (level ${e.level})` : ''}`, { kind: s.level >= e.level && s.coins >= e.cost ? 'primary' : 'soft', onClick: () => {
            try { L.expand(s); sfx.build(); toast('More room to build! 🌳➡️🏡', 'good'); save(); renderPanel(); } catch (err) { toast((err as Error).message, 'info'); }
          } })
        : h('p', { class: 'muted' }, 'Your land is as big as it gets. 🏝️'));
    } else if (b.item === 'gate') {
      parts.push(btn('Hop over to Fuzzy Crossing', { kind: 'primary', onClick: () => goPlay(b.id) }));
    }
    const actions: HTMLElement[] = [];
    actions.push(btn(L.walkway(b.item) ? 'Move' : 'Move or turn', { kind: 'ghost', size: 'sm', icon: 'hand', onClick: () => startPlacing(b.item, b.id) }));
    if (it.sellable) actions.push(btn(`${L.walkway(b.item) ? 'Remove' : 'Sell'}${it.currency === 'coins' && it.cost >= 10 ? ` · 🪙${Math.floor(it.cost / 2)}` : ''}`, { kind: 'ghost', size: 'sm', icon: 'trash', onClick: async () => {
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
    const cost = g.seed ? `🪙${g.seed}` : '';
    const card = h('button', { class: `land-recipe ${locked || missing ? 'off' : ''}`, type: 'button', 'data-good': g.id },
      h('span', { class: 'land-card-ic' }, locked ? '🔒' : g.emoji),
      h('b', null, g.name),
      h('small', null, locked ? `Level ${g.level}` : inputs.length ? inputs.map(([k, n]) => `${L.good(k).emoji}${s.barn[k] ?? 0}/${n}`).join(' ') : `${cost} · ${fmt(g.time * 1000)}`),
      !locked && inputs.length ? h('small', { class: 'muted' }, fmt(g.time * 1000)) : null);
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
        sfx.collect();
        gain(g, id, `+${g.n} ${L.good(g.good).emoji}`);
        save();
        if (panel?.kind === 'building' && panel.id === id) openPanel(null);
        tut.emit('harvest');
        return;
      }
      if (it.kind === 'factory' && L.finished(b).length) {
        const g = L.collect(s, id);
        sfx.collect();
        gain(g, id, g.goods.map((x) => L.good(x).emoji).join(' '));
        save();
        if (panel?.kind === 'building') renderPanel();
        tut.emit('collect');
        return;
      }
    } catch (e) { toast((e as Error).message, 'info'); return; }
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
      btn('Move', { kind: 'soft', size: 'sm', icon: 'hand', title: 'Move (or press and hold it)', onClick: () => startPlacing(b.item, b.id) }),
      btn(null, { kind: 'soft', size: 'sm', icon: 'plus', title: 'Select more (move several together)', onClick: () => enterSelect(b.id) }),
      ...(canTurn(b.item) ? [btn('Turn', { kind: 'soft', size: 'sm', icon: 'rotate', title: 'Turn (R)', onClick: () => turnInPlace(b.id) })] : []));
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
  function startPlacing(itemId: string, moving?: number): void {
    const existing = moving !== undefined ? s.buildings.find((b) => b.id === moving) : undefined;
    panel = null;
    sheet.hidden = true;
    view?.select(null);
    // start in the middle of the screen, or where it already stands
    let x = existing?.x ?? Math.floor((view?.target.x ?? L.MAP / 2) - 0.5);
    let z = existing?.z ?? Math.floor((view?.target.z ?? L.MAP / 2) - 0.5);
    if (!existing) {
      // look for a free spot near the middle
      outer: for (let r = 0; r < 10; r++) for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
        if (L.canPlace(s, itemId, x + dx, z + dz, 0)) { x += dx; z += dz; break outer; }
      }
    }
    placing = { item: itemId, x, z, rot: existing?.rot ?? 0, moving };
    quick.hidden = true;
    const it = L.item(itemId);
    placeHint = h('small', null, hintFor(itemId, moving));
    placeBar.hidden = false;
    placeBar.replaceChildren(...[
      h('div', { class: 'land-place-info' }, h('b', null, it.name), placeHint),
      canTurn(itemId) ? btn(null, { icon: 'rotate', kind: 'soft', title: 'Turn it (R)', onClick: rotatePlacing }) : null,
      btn(null, { icon: 'close', kind: 'soft', title: 'Cancel (Esc)', onClick: cancelPlacing }),
      btn(moving !== undefined ? 'Put here' : 'Build here', { kind: 'primary', icon: 'check', title: 'Enter', onClick: confirmPlacing })].filter((x) => x !== null) as HTMLElement[]);
    updateGhost(); // show what you're carrying straight away (green or red)
  }

  function rotatePlacing(): void {
    if (!placing || !canTurn(placing.item)) return;
    placing.rot = ((placing.rot + 1) % 4) as L.Rot;
    sfx.hop();
    updateGhost();
  }

  let placeHint: HTMLElement | null = null;
  const hintFor = (itemId: string, moving?: number) => moving !== undefined ? `Moving is free — drag it, then tap “Put here”`
    : L.walkway(itemId) ? 'Drag across the grass to lay a line' : isTouch() ? 'Drag it, or tap where it should go' : 'Drag it, or click where it should go';
  function updateGhost(): void {
    if (!placing) return;
    const why = L.placeProblem(s, placing.item, placing.x, placing.z, placing.rot, placing.moving ?? -1);
    view?.setGhost({ ...placing, ok: !why });
    placeBar.classList.toggle('bad', !!why);
    if (placeHint) {
      if (why) placeHint.textContent = why;
      else placeHint.textContent = hintFor(placing.item, placing.moving);
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
    placing = null;
    placeBar.hidden = true;
    view?.setGhost(null); // the original (if moving) shows again exactly where it was
    showQuick();
  }

  function confirmPlacing(): void {
    if (!placing) return;
    const p = placing;
    try {
      if (p.moving !== undefined) { L.move(s, p.moving, p.x, p.z, p.rot); sfx.hop(); tut.emit('moved'); }
      else {
        const it = L.item(p.item);
        const why = L.cantBuy(s, p.item, rewards.balance());
        if (why) throw new Error(why);
        const g = L.place(s, p.item, p.x, p.z, p.rot); // throws (nothing spent) if the spot is taken
        if (it.currency === 'fuzzies') spendFuzzies(it.cost);
        sfx.build();
        save();
        tut.emit('placed', { item: p.item });
        const placed = s.buildings[s.buildings.length - 1];
        if (it.build) toast(`🔨 Building your ${it.name} — ready in ${fmt(it.build * 1000)}. It keeps going while you’re away.`, 'info', 3200);
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

  // ---------- multi-select & group editing ----------
  // Select mode: tap pieces to add/remove them, double-tap a road or field for its whole connected stretch, drag an empty
  // spot (mouse) or press-and-hold then drag (touch) for an area; drag any selected piece to move the whole group.
  // Moves are previewed (green / red per piece) and only happen on "Put here"; every edit can be undone.
  type EditOp = { kind: 'move'; ids: number[]; dx: number; dz: number } | { kind: 'remove'; pieces: L.Placed[]; refund: number } | { kind: 'turn'; id: number; from: L.Rot; to: L.Rot };
  let selMode = false;
  const sel = new Set<number>();
  let gmove: { dx: number; dz: number; why: string; bad: number[] } | null = null;
  const undoStack: EditOp[] = [], redoStack: EditOp[] = [];
  const editBar = h('div', { class: 'land-edit', hidden: true, role: 'toolbar', 'aria-label': 'Edit your town' });
  const selIds = () => [...sel].filter((id) => s.buildings.some((b) => b.id === id));
  const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
  function enterSelect(first?: number): void {
    if (placing) cancelPlacing();
    openPanel(null);
    selMode = true;
    if (first !== undefined) sel.add(first);
    stage.classList.add('editing');
    paintSel();
  }
  function exitSelect(): void {
    cancelGroup();
    selMode = false;
    sel.clear();
    stage.classList.remove('editing');
    paintSel();
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
  function paintEdit(): void {
    editBar.hidden = !selMode;
    if (!selMode) return;
    const n = sel.size;
    const ib = (ic: Parameters<typeof icon>[0], title: string, onClick: () => void, opts: { disabled?: boolean; cls?: string; label?: string } = {}) => {
      const b = h('button', { class: `land-edit-b ${opts.cls ?? ''}`, type: 'button', title, 'aria-label': title }, icon(ic, 20), opts.label ? h('span', null, opts.label) : null);
      b.disabled = !!opts.disabled;
      b.addEventListener('click', onClick);
      return b;
    };
    if (gmove) {
      const ok = !gmove.why && (gmove.dx || gmove.dz);
      editBar.replaceChildren(
        h('div', { class: `land-edit-msg ${gmove.why ? 'bad' : 'ok'}` }, gmove.why || (gmove.dx || gmove.dz ? `Moving ${plural(n, 'piece')}` : 'Drag to move')),
        ib('close', 'Cancel (Esc)', cancelGroup),
        ib('check', 'Put here (Enter)', confirmGroup, { disabled: !ok, cls: 'go', label: 'Put here' }));
      return;
    }
    const one = n === 1 ? s.buildings.find((b) => b.id === [...sel][0]) : undefined;
    const removable = selIds().filter((id) => L.item(s.buildings.find((b) => b.id === id)!.item).sellable).length;
    editBar.replaceChildren(
      h('div', { class: 'land-edit-count' }, h('b', null, String(n)), h('span', null, n ? 'selected' : isTouch() ? 'Tap to select' : 'Click to select')),
      h('small', { class: 'land-edit-hint' }, n ? 'Drag to move' : isTouch() ? 'Hold + drag: area' : 'Drag: area'),
      ib('rotate', 'Turn (R)', () => { if (one) turnRecorded(one.id); }, { disabled: !one || !canTurn(one.item) }),
      ib('trash', 'Remove (Delete)', () => void removeSel(), { disabled: !removable }),
      ib('undo', 'Undo (Ctrl+Z)', undo, { disabled: !undoStack.length }),
      ib('redo', 'Redo (Ctrl+Shift+Z)', redo, { disabled: !redoStack.length }),
      ib('close', 'Clear selection', () => { sel.clear(); paintSel(); }, { disabled: !n }),
      ib('check', 'Done (Esc)', exitSelect, { cls: 'done', label: 'Done' }));
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
    const ok = await confirmDialog(`Remove ${plural(pieces.length, 'piece')}?`, `${refund ? `You get ${refund} coins back. ` : ''}${growing ? 'Crops on these fields will be lost. ' : ''}You can undo this.`, 'Remove');
    if (!ok) return;
    const copies = pieces.map((b) => JSON.parse(JSON.stringify(b)) as L.Placed);
    let back = 0;
    for (const b of pieces) back += L.sell(s, b.id);
    for (const b of pieces) sel.delete(b.id);
    record({ kind: 'remove', pieces: copies, refund: back });
    sfx.coins();
    if (back) toast(`+${back} coins`, 'good');
    save();
    paintSel();
  }
  function applyOp(op: EditOp, forward: boolean): void {
    if (op.kind === 'move') {
      const d = forward ? 1 : -1;
      L.moveGroup(s, op.ids, op.dx * d, op.dz * d);
      sel.clear(); for (const id of op.ids) sel.add(id);
    } else if (op.kind === 'turn') {
      const b = s.buildings.find((o) => o.id === op.id);
      if (!b) throw new Error('That’s gone.');
      L.move(s, b.id, b.x, b.z, forward ? op.to : op.from);
    } else if (forward) {
      for (const p of op.pieces) L.sell(s, p.id);
    } else {
      if (s.coins < op.refund) throw new Error('You need the coins you got back to undo this.');
      L.restore(s, op.pieces);
      s.coins -= op.refund;
      sel.clear(); for (const p of op.pieces) sel.add(p.id);
    }
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
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 2) {
      const [p1, p2] = [...pts.values()];
      pinch = Math.hypot(p1.x - p2.x, p1.y - p2.y);
      pinchMid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
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
      const b = s.buildings.find((o) => o.id === id);
      if (!b || !drag || drag.moved || pts.size !== 1) return;
      startPlacing(b.item, b.id);
      drag.ghost = true;
      drag.picked = true;
      sfx.hop();
      try { navigator.vibrate?.(12); } catch { /* not supported */ }
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
    pts.delete(e.pointerId);
    if (pts.size < 2) { pinch = 0; pinchMid = null; }
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
    if (p.kind === 'resident') { view.poke(p.index); try { sfx.giggle(); } catch { /* */ } return; }
    tapBuilding(p.id);
  }
  wrap.addEventListener('pointerdown', onDown);
  wrap.addEventListener('pointermove', onMove);
  wrap.addEventListener('pointerup', onUp);
  wrap.addEventListener('pointercancel', (e) => { pts.delete(e.pointerId); drag = null; pinch = 0; pinchMid = null; lastPtr = null; cancelAnimationFrame(edgeRaf); wrap.classList.remove('panning'); cancelHold(); });
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
  };
  function onKeyDown(e: KeyboardEvent): void {
    if (typing(e.target) || document.querySelector('.modal-backdrop, .gift-overlay')) return;
    const k = e.key.toLowerCase();
    // editing shortcuts (select mode)
    if (selMode && (e.metaKey || e.ctrlKey) && !e.altKey) {
      if (k === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return; }
      if ((k === 'z' && e.shiftKey) || k === 'y') { e.preventDefault(); redo(); return; }
    }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (selMode) {
      if (k === 'escape') { e.preventDefault(); if (boxEl) clearBox(); else if (gmove) cancelGroup(); else if (sel.size) { sel.clear(); paintSel(); } else exitSelect(); return; }
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
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) { e.preventDefault(); keys.add(k); applyKeys(); }
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
    toast(`Pip gave you ${short} coins for this step 🪙`, 'good');
    save();
  }
  tut.on((ev) => {
    if (ev.type === 'step') tutCoins();
    if (ev.type === 'finished' && tut.state.status === 'done') { sfx.level(); toast('Tutorial complete — enjoy your town! 🎉', 'good'); }
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
  const stage = h('div', { class: 'land-wrap' }, wrap, overlay, quick, hud, side, bar, dockTab, placeBar, editBar, sheet);
  const round = (ic: Node, title: string, onClick: () => void, cls = '') => {
    const b = h('button', { class: `land-round ${cls}`, type: 'button', title, 'aria-label': title }, ic);
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
  const sideToggle = h('button', { class: 'land-side-toggle', type: 'button' }, landIcon('chevRight', 18));
  const sideBody = h('div', { class: 'land-side-body' }, ...[
    musicBtn,
    round(landIcon('select', 30), 'Select & move several', () => (selMode ? exitSelect() : enterSelect()), 'land-select'),
    round(landIcon('portal', 32), 'Play Fuzzy Crossing', () => goPlay(s.buildings.find((b) => b.item === 'gate')?.id), 'land-play'),
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
      view.sync(s);
      try {
        const cam = JSON.parse(localStorage.getItem('fz.land.cam') || 'null') as { x: number; z: number; d: number } | null;
        if (cam) { view.target.set(cam.x, 0, cam.z); view.dist = cam.d; }
      } catch { /* first visit */ }
      if (import.meta.env.DEV) (window as unknown as { __land: unknown }).__land = { view, state: s, tut, tutTarget, fuzzies: () => rewards.balance(), tutRefresh: () => tutUi?.refresh(), sel: () => [...sel], selMode: () => selMode }; // for tests
      if (!a.settings.reduceMotion) view.swoopIn();
      setTimeout(() => { if (alive && !tut.active) welcomeBack(); }, a.settings.reduceMotion ? 300 : 2300);
      // the tutorial (new players, or a replay from Settings → Help) starts once the camera has swooped in
      setTimeout(() => { if (alive) startTutorial(); }, a.settings.reduceMotion ? 300 : 2200);
      view.start();
      music.start();
      wrap.classList.remove('loading');
      requestAnimationFrame(() => dispatchEvent(new Event('fz:scene-ready')));
    }).catch((e) => { console.error(e); wrap.classList.remove('loading'); toast('Fuzzies Land couldn’t start 3D graphics', 'bad'); });
  }

  // timers in open panels and HUD badges tick every second; crops keep growing while the view shows them
  const tick = setInterval(() => {
    const now = Date.now();
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
  });

  return {
    el: h('div', { class: 'page land' }, stage),
    destroy: () => { tutUi?.destroy(); removeEventListener('keydown', onKeyDown); removeEventListener('keyup', onKeyUp); removeEventListener('blur', onBlur); cancelAnimationFrame(quickRaf); cancelAnimationFrame(edgeRaf); music.stop(); remember(); save(); alive = false; clearInterval(tick); removeEventListener('pagehide', onHide); ro.disconnect(); document.removeEventListener('visibilitychange', onVis); off(); view?.destroy(); },
  };
}
