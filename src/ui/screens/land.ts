/**
 * Fuzzies Land screen: the 3D town plus its HUD — level & XP, coins, population, Fuzzies — and the
 * panels for building, planting, workshops, orders and the barn. Rules: land/rules.ts. Drawing: land/view3d.ts.
 */
import type { Screen } from '../app';
import * as L from '../../land/rules';
import type { LandView, Pick } from '../../land/view3d';
import { accounts } from '../../core/account';
import { rewards } from '../../core/rewards';
import { sfx } from '../../game/sound';
import { music } from '../../game/music';
import { travel } from '../travel';
import { h, btn, fuzzyMark, toast, confirmDialog } from '../dom';
import { mascot } from '../mascot';
import { isTouch } from '../../core/util';

type Panel = null | { kind: 'shop'; tab: L.Kind | 'farm' } | { kind: 'building'; id: number } | { kind: 'orders' } | { kind: 'barn' };

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
  const side = h('div', { class: 'land-side' });
  const bar = h('div', { class: 'land-bar' });
  const sheet = h('section', { class: 'land-sheet', hidden: true });
  const placeBar = h('div', { class: 'land-place', hidden: true });
  let view: LandView | null = null;
  let panel: Panel = null;
  let placing: { item: string; x: number; z: number; rot: 0 | 1; moving?: number } | null = null;
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

  function gain(g: L.Gain, at: number, label?: string): void {
    if (label) view?.float(label, at);
    if (g.xp) setTimeout(() => view?.float(`+${g.xp} XP`, at, 'xp'), 250);
    if (g.fuzzies) rewards.earn(g.fuzzies, 'Fuzzies Land order');
    for (const lv of g.levelUps ?? []) levelUp(lv);
  }

  function levelUp(lv: number): void {
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
  let hudSig = '';
  function renderHud(): void {
    // only rebuild when something shown actually changed (rebuilding every second could swallow a tap)
    const sig = JSON.stringify([s.level, s.xp, s.coins, L.population(s), rewards.balance(), L.barnUsed(s), s.orders.filter((o) => L.canFill(s, o)).length, L.awaySummary(s)]);
    if (sig === hudSig) return;
    hudSig = sig;
    const need = L.xpFor(s.level);
    const pop = L.population(s);
    const ready = s.orders.filter((o) => L.canFill(s, o)).length;
    hud.replaceChildren(
      h('div', { class: 'land-lvl', title: `${s.xp} / ${need} XP` },
        h('span', { class: 'land-lvl-n', style: `--p:${(s.xp / need) * 100}%` }, h('b', null, String(s.level))),
        h('div', null, h('b', null, 'Fuzzies Land'), h('div', { class: 'land-xp' }, h('div', { style: `width:${(s.xp / need) * 100}%` })), h('small', null, `${s.xp} / ${need} XP`))),
      h('div', { class: 'land-chips' }, savedEl,
        h('span', { class: 'land-chip', title: 'Coins' }, '🪙', h('b', null, s.coins.toLocaleString())),
        h('span', { class: 'land-chip', title: 'Fuzzies living here' }, '🏡', h('b', null, String(pop))),
        h('a', { class: 'land-chip', href: '#/rewards', title: 'Your Fuzzies' }, fuzzyMark(18), h('b', { class: 'fz-balance' }, String(rewards.balance())))));
    const tool = (ic: string, label: string, onClick: () => void, badge = '') => {
      const b = h('button', { class: 'land-tool', type: 'button' }, h('span', { class: 'land-tool-ic' }, ic), h('span', null, label), badge ? h('i', { class: 'land-badge' }, badge) : null);
      b.addEventListener('click', onClick);
      return b;
    };
    const away = L.awaySummary(s);
    const waiting = away.crops + away.goods + away.built;
    bar.replaceChildren(...[
      waiting ? tool('✨', 'Collect', collectAllNow, String(waiting)) : null,
      tool('🔨', 'Build', () => openPanel({ kind: 'shop', tab: 'house' })),
      tool('📦', 'Orders', () => openPanel({ kind: 'orders' }), ready ? String(ready) : ''),
      tool('🏚️', 'Barn', () => openPanel({ kind: 'barn' }), `${L.barnUsed(s)}/${L.barnCap(s.level)}`)].filter((x) => x !== null) as HTMLElement[]);
  }

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
    panel = p;
    view?.select(p?.kind === 'building' ? p.id : null);
    renderPanel();
  }

  function renderPanel(): void {
    if (!panel) { sheet.hidden = true; return; }
    sheet.hidden = false;
    const close = btn(null, { icon: 'close', kind: 'plain', size: 'sm', title: 'Close', onClick: () => openPanel(null) });
    const head = (title: string, sub = '') => h('div', { class: 'land-sheet-head' }, h('div', null, h('h3', null, title), sub ? h('small', { class: 'muted' }, sub) : null), close);
    if (panel.kind === 'shop') sheet.replaceChildren(head('Build', 'Tap something, then choose where it goes'), shopBody(panel.tab));
    else if (panel.kind === 'orders') sheet.replaceChildren(head('Orders', 'Fuzzies ask for goods — deliver for coins & XP'), ordersBody());
    else if (panel.kind === 'barn') sheet.replaceChildren(head('Barn', `${L.barnUsed(s)} / ${L.barnCap(s.level)} spaces used`), barnBody());
    else {
      const b = s.buildings.find((x) => x.id === (panel as { id: number }).id);
      if (!b) { openPanel(null); return; }
      const it = L.item(b.item);
      sheet.replaceChildren(head(`${it.emoji} ${it.name}`, it.blurb), buildingBody(b, it));
    }
  }

  function shopBody(tab: L.Kind | 'farm'): HTMLElement {
    const tabs: [L.Kind | 'farm', string][] = [['house', '🏠 Houses'], ['farm', '🌾 Farming'], ['factory', '🏭 Workshops'], ['decor', '🌷 Decor']];
    const list = L.ITEMS.filter((i) => (tab === 'farm' ? i.kind === 'field' : i.kind === tab));
    return h('div', null,
      h('div', { class: 'chips' }, ...tabs.map(([k, label]) => h('button', { class: `chip ${k === tab ? 'on' : ''}`, type: 'button', onclick: () => openPanel({ kind: 'shop', tab: k }) }, label))),
      h('div', { class: 'land-shop' }, ...list.map((it) => {
        const why = L.cantBuy(s, it.id, rewards.balance());
        const locked = s.level < it.level;
        const card = h('button', { class: `land-card ${why ? 'off' : ''}`, type: 'button', title: why || it.blurb },
          h('span', { class: 'land-card-ic' }, locked ? '🔒' : it.emoji),
          h('b', null, it.name),
          h('small', null, locked ? `Level ${it.level}` : it.blurb),
          h('span', { class: 'land-price' }, it.currency === 'fuzzies' ? fuzzyMark(14) : '🪙', it.cost ? String(it.cost) : 'Free'),
          it.max && !locked ? h('i', { class: 'land-max' }, `${L.count(s, it.id)}/${it.max(s.level)}`) : null);
        card.addEventListener('click', () => {
          if (why) { toast(why, 'info'); return; }
          startPlacing(it.id);
        });
        return card;
      })));
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
        h('div', { class: 'land-order-reward' }, h('span', null, `🪙 ${o.coins}`), h('span', null, `⭐ ${o.xp} XP`), o.fuzzies ? h('span', null, fuzzyMark(14), `+${o.fuzzies}`) : null),
        h('div', { class: 'land-order-btns' },
          btn('Deliver', { kind: ok ? 'primary' : 'soft', size: 'sm', onClick: () => {
            try {
              const g = L.fill(s, o.id);
              sfx.coins();
              const hall = s.buildings.find((b) => b.item === 'hall');
              gain(g, hall?.id ?? 0, `+${g.coins} 🪙`);
              save(); renderPanel();
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
      btn(`Sell 1 · 🪙${g.sell}`, { kind: 'ghost', size: 'sm', onClick: () => { L.sellGood(s, g.id, 1); sfx.coins(); save(); renderPanel(); } }))));
  }

  function rushBtn(b: L.Placed): HTMLElement | null {
    const cost = L.rushCost(b);
    if (!cost) return null;
    return btn(h('span', { class: 'row' }, 'Finish now · ', fuzzyMark(14), String(cost)), { kind: 'ghost', size: 'sm', onClick: () => {
      if (rewards.balance() < cost) { toast(`You need ${cost} Fuzzies — play Fuzzy Crossing to earn more!`, 'info'); return; }
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
      parts.push(btn('Hop over to Fuzzy Crossing 🐸', { kind: 'primary', onClick: () => goPlay(b.id) }));
    }
    const actions: HTMLElement[] = [];
    actions.push(btn('Move', { kind: 'ghost', size: 'sm', icon: 'hand', onClick: () => startPlacing(b.item, b.id) }));
    if (it.sellable) actions.push(btn(`Sell${it.currency === 'coins' ? ` · 🪙${Math.floor(it.cost / 2)}` : ''}`, { kind: 'ghost', size: 'sm', icon: 'trash', onClick: async () => {
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
    const card = h('button', { class: `land-recipe ${locked || missing ? 'off' : ''}`, type: 'button' },
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
        return;
      }
      if (it.kind === 'field' && b.crop && L.cropProgress(b) >= 1) {
        const g = L.harvest(s, id);
        sfx.collect();
        gain(g, id, `+${g.n} ${L.good(g.good).emoji}`);
        save();
        if (panel?.kind === 'building' && panel.id === id) openPanel(null);
        return;
      }
      if (it.kind === 'factory' && L.finished(b).length) {
        const g = L.collect(s, id);
        sfx.collect();
        gain(g, id, g.goods.map((x) => L.good(x).emoji).join(' '));
        save();
        if (panel?.kind === 'building') renderPanel();
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
    updateGhost();
    const it = L.item(itemId);
    placeBar.hidden = false;
    placeBar.replaceChildren(...[
      h('div', { class: 'land-place-info' }, h('b', null, `${it.emoji} ${it.name}`), h('small', null, isTouch() ? 'Drag it, or tap where it should go' : 'Drag it, or click where it should go')),
      it.w !== it.d ? btn(null, { icon: 'rotate', kind: 'soft', title: 'Turn', onClick: () => { placing!.rot = placing!.rot ? 0 : 1; updateGhost(); } }) : null,
      btn(null, { icon: 'close', kind: 'soft', title: 'Cancel', onClick: cancelPlacing }),
      btn(moving !== undefined ? 'Put here' : 'Build here', { kind: 'primary', icon: 'check', onClick: confirmPlacing })].filter((x) => x !== null) as HTMLElement[]);
  }

  function updateGhost(): void {
    if (!placing) return;
    view?.setGhost({ ...placing, ok: L.canPlace(s, placing.item, placing.x, placing.z, placing.rot, placing.moving ?? -1) });
  }

  function cancelPlacing(): void {
    placing = null;
    placeBar.hidden = true;
    view?.setGhost(null);
  }

  function confirmPlacing(): void {
    if (!placing) return;
    const p = placing;
    try {
      if (p.moving !== undefined) { L.move(s, p.moving, p.x, p.z, p.rot); sfx.hop(); }
      else {
        const it = L.item(p.item);
        const why = L.cantBuy(s, p.item, rewards.balance());
        if (why) throw new Error(why);
        if (it.currency === 'fuzzies') spendFuzzies(it.cost);
        const g = L.place(s, p.item, p.x, p.z, p.rot);
        sfx.build();
        save();
        const placed = s.buildings[s.buildings.length - 1];
        if (it.build) toast(`🔨 Building your ${it.name} — ready in ${fmt(it.build * 1000)}. It keeps going while you’re away.`, 'info', 3200);
        else gain(g, placed.id, it.kind === 'house' ? `+${it.pop} 🏡` : undefined);
        // keep building fields/paths in a row without reopening the shop
        if ((it.kind === 'field' || p.item === 'path') && !L.cantBuy(s, p.item, rewards.balance())) {
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

  // ---------- pointer: pan, pinch, tap, drag the ghost ----------
  const pts = new Map<number, { x: number; y: number }>();
  let drag: { moved: boolean; sx: number; sy: number; ghost: boolean } | null = null;
  let pinch = 0;
  function onDown(e: PointerEvent): void {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 2) { const [p1, p2] = [...pts.values()]; pinch = Math.hypot(p1.x - p2.x, p1.y - p2.y); drag = null; return; }
    let onGhost = false;
    if (placing && view) {
      const g = view.ground(e.clientX, e.clientY);
      const f = L.footprint(L.item(placing.item), placing.rot);
      onGhost = !!g && g.x >= placing.x - 0.3 && g.x <= placing.x + f.w + 0.3 && g.y >= placing.z - 0.3 && g.y <= placing.z + f.d + 0.3;
    }
    drag = { moved: false, sx: e.clientX, sy: e.clientY, ghost: onGhost };
  }
  function onMove(e: PointerEvent): void {
    const prev = pts.get(e.pointerId);
    if (!prev || !view) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 2) {
      const [p1, p2] = [...pts.values()];
      const d = Math.hypot(p1.x - p2.x, p1.y - p2.y);
      if (pinch) view.zoom(pinch / d);
      pinch = d;
      return;
    }
    if (!drag) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 7) drag.moved = true;
    if (!drag.moved) return;
    if (drag.ghost && placing) {
      const g = view.ground(e.clientX, e.clientY);
      const f = L.footprint(L.item(placing.item), placing.rot);
      if (g) { const nx = Math.round(g.x - f.w / 2), nz = Math.round(g.y - f.d / 2); if (nx !== placing.x || nz !== placing.z) { placing.x = nx; placing.z = nz; updateGhost(); } }
    } else view.pan(e.clientX - prev.x, e.clientY - prev.y);
  }
  function onUp(e: PointerEvent): void {
    pts.delete(e.pointerId);
    if (pts.size < 2) pinch = 0;
    const d = drag;
    drag = null;
    if (!d || d.moved || !view) return;
    if (placing) {
      const g = view.ground(e.clientX, e.clientY);
      if (g) { const f = L.footprint(L.item(placing.item), placing.rot); placing.x = Math.round(g.x - f.w / 2); placing.z = Math.round(g.y - f.d / 2); updateGhost(); }
      return;
    }
    const p: Pick = view.pick(e.clientX, e.clientY);
    if (!p || p.kind === 'ground') { openPanel(null); return; }
    if (p.kind === 'resident') { view.poke(p.index); try { sfx.giggle(); } catch { /* */ } return; }
    tapBuilding(p.id);
  }
  wrap.addEventListener('pointerdown', onDown);
  wrap.addEventListener('pointermove', onMove);
  wrap.addEventListener('pointerup', onUp);
  wrap.addEventListener('pointercancel', (e) => { pts.delete(e.pointerId); drag = null; pinch = 0; });
  wrap.addEventListener('wheel', (e) => { e.preventDefault(); view?.zoom(Math.exp(e.deltaY * 0.0012)); }, { passive: false });

  // ---------- what the Fuzzies say ----------
  function phrase(seed: number): string {
    const r = (seed * 9301 + 49297) % 233280 / 233280;
    const ctx: string[] = [];
    if (s.buildings.some((b) => b.crop && L.cropProgress(b) >= 1)) ctx.push('Something’s ready to harvest! 🌾', 'Ooh, the fields look ready!');
    if (s.orders.some((o) => L.canFill(s, o))) ctx.push('An order is ready to deliver! 📦', 'Pssst… check the orders board!');
    if (L.barnUsed(s) > L.barnCap(s.level) * 0.85) ctx.push('The barn is nearly full! 😮');
    if (!s.buildings.some((b) => b.item === 'bakery') && s.level >= 2) ctx.push('Can we build a bakery? 🥖');
    if (!s.buildings.some((b) => b.item === 'fountain') && s.level >= 4) ctx.push('A fountain would be sooo nice ⛲');
    const general = ['This town is so fluffy!', 'I love my cottage 🏠', 'Hehe, hi there! 👋', 'Best. Day. Ever.', 'Have you played Fuzzy Crossing? 🐸', 'Mmm, smells like fresh bread 🍞', '*happy wiggle*', 'Nice weather today ☀️', 'I made a new friend!', 'Let’s grow more Sunwheat 🌾', 'Can I have a hug? 🤗', 'Tickles! Hehe!'];
    const pool = ctx.length && r < 0.6 ? ctx : general;
    return pool[Math.floor(r * 997) % pool.length];
  }

  // ---------- setup ----------
  const stage = h('div', { class: 'land-wrap' }, wrap, overlay, hud, side, bar, placeBar, sheet);
  const musicBtn = btn(null, { kind: 'soft', size: 'sm', title: 'Music', onClick: () => {
    accounts.update((x) => (x.settings.music = !x.settings.music));
    if (accounts.current?.settings.music) music.start(); else music.stop();
    paintMusic();
  } });
  const paintMusic = () => { musicBtn.replaceChildren(accounts.current?.settings.music !== false ? '🎵' : '🔇'); musicBtn.title = accounts.current?.settings.music !== false ? 'Music on — tap to turn off' : 'Music off — tap to turn on'; };
  paintMusic();
  // browsers only allow sound after a tap/click: start the music on the first one if it couldn't start yet
  stage.addEventListener('pointerdown', () => { if (!music.playing) setTimeout(() => music.start(), 50); });
  side.append(...[
    musicBtn,
    btn(h('span', { class: 'row' }, '🐸', h('span', null, 'Crossing')), { kind: 'soft', size: 'sm', title: 'Play Fuzzy Crossing', onClick: () => goPlay(s.buildings.find((b) => b.item === 'gate')?.id) }),
    isTouch() ? null : btn(null, { icon: 'zoomIn', kind: 'soft', size: 'sm', title: 'Zoom in', onClick: () => view?.zoom(0.8) }),
    isTouch() ? null : btn(null, { icon: 'zoomOut', kind: 'soft', size: 'sm', title: 'Zoom out', onClick: () => view?.zoom(1.25) })].filter((x): x is HTMLButtonElement => !!x));
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
      if (import.meta.env.DEV) (window as unknown as { __land: unknown }).__land = { view, state: s }; // for tests
      if (!a.settings.reduceMotion) view.swoopIn();
      setTimeout(() => { if (alive) welcomeBack(); }, a.settings.reduceMotion ? 300 : 2300);
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
    destroy: () => { music.stop(); remember(); save(); alive = false; clearInterval(tick); removeEventListener('pagehide', onHide); ro.disconnect(); document.removeEventListener('visibilitychange', onVis); off(); view?.destroy(); },
  };
}
