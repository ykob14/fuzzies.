/**
 * Fuzzy Shop — Featured, Daily, Weekly, Permanent and (during an event) Seasonal shelves. What is on sale, and when it rotates, comes from
 * shopData.ts; buying goes through purchases.ts. This file only draws, and listens to `fz:crossing` so balance and ownership stay live.
 * Prices are Crossing Coins only. Legendary and mythic Fuzzies are never sold; event Fuzzies are earned, not bought.
 */
import { h, btn, modal, toast } from '../../ui/dom';
import type { NavTarget, PanelOpen } from '../hub';
import { panelAvailable } from '../hub';
import { CHARACTERS, CHARACTER_BY_ID, EVENT_NAME, RARITY_COLOR, unlockText, type CharacterDef, type EventId } from '../characters';
import { COSMETIC_BY_ID, SLOT_NAME, type CosmeticDef, type CosmeticSlot } from '../cosmetics';
import { coins, hasCharacter } from '../store';
import { buy, equipItem, owns, stateOf, type ItemState } from '../purchases';
import {
  countdown, dailyItems, dateWords, dayKeyOf, EVENT_ORDER, inDays, listingFor, nextAppearance, nextDailyReset, nextEventStart, nextWeeklyReset,
  now as shopNow, seasonalShelves, shelfOf, weekNumber, weeklyItems, permanentItems, type ShopItem,
} from '../shopData';
import { coinMark, rarityTag } from './kit';
import { gicon, gtile } from './gicons';
import './gameui.css';
import { characterPortrait, cosmeticBadge } from './portrait';
import './shop.css';

type Tab = 'featured' | 'daily' | 'weekly' | 'permanent' | 'season';
type Filter = 'all' | 'char' | CosmeticSlot;
const FILTERS: { id: Filter; label: string }[] = [{ id: 'all', label: 'All' }, { id: 'char', label: 'Fuzzies' }, { id: 'trail', label: 'Trails' }, { id: 'jump', label: 'Jump effects' }, { id: 'celebration', label: 'Celebrations' }, { id: 'extra', label: 'Outfit pieces' }];
const reduced = (): boolean => document.documentElement.dataset.motion === 'reduce';

const defOf = (it: { id: string; type: 'character' | 'cosmetic' }): CharacterDef | CosmeticDef => (it.type === 'character' ? CHARACTER_BY_ID[it.id] : COSMETIC_BY_ID[it.id]);
const kindWords = (it: { id: string; type: 'character' | 'cosmetic' }): string => (it.type === 'character' ? 'Fuzzy' : SLOT_NAME[COSMETIC_BY_ID[it.id].slot]);
const blurbOf = (it: { id: string; type: 'character' | 'cosmetic' }): string => (it.type === 'character' ? CHARACTER_BY_ID[it.id].tagline : COSMETIC_BY_ID[it.id].blurb);
const filterOf = (it: ShopItem): Filter => (it.type === 'character' ? 'char' : COSMETIC_BY_ID[it.id].slot);
const art = (it: { id: string; type: 'character' | 'cosmetic' }, size: number): HTMLElement => (it.type === 'character' ? characterPortrait(CHARACTER_BY_ID[it.id], size) : cosmeticBadge(COSMETIC_BY_ID[it.id], Math.round(size * 0.86)));

/** plain words for how a style that is NOT sold is earned (the Pass has its own screen) */
function cosmeticHow(c: CosmeticDef): { text: string; go?: NavTarget; label?: string } {
  const k = c.unlock;
  switch (k.kind) {
    case 'free': return { text: 'Every Fuzzy starts with this one.' };
    case 'pass': return { text: `Reach Fuzzy Pass level ${k.level}. It is free.`, go: { to: 'pass', level: k.level }, label: 'Open the Pass' };
    case 'weekly': return { text: k.top === 1 ? 'Finish #1 on a weekly leaderboard.' : `Finish in the top ${k.top} of a weekly leaderboard.` };
    case 'achievement': return { text: 'Earned with an achievement — keep playing.' };
    default: return { text: 'Earned by playing.' };
  }
}

export const open: PanelOpen = (ctx, focus) => {
  const t = (): number => shopNow();
  let tab: Tab = 'featured';
  let filter: Filter = 'all';
  let noteEl: HTMLElement | null = null;
  let renderedDay = dayKeyOf(t()), renderedWeek = weekNumber(t());
  let updaters: (() => void)[] = [];
  const hasPanel = (n: Parameters<typeof panelAvailable>[0]): boolean => panelAvailable(n);

  // ───────── frame ─────────
  const balNum = h('b', null, coins().toLocaleString());
  const bal = h('div', { class: 'sx-bal', 'aria-label': 'Your Crossing Coins' }, coinMark(24), balNum);
  const tabsEl = h('div', { class: 'sx-tabs', role: 'tablist', 'aria-label': 'Shop shelves' });
  const body = h('div', { class: 'sx-body', tabindex: '-1' });
  const wrap = h('div', { class: 'sx' }, h('div', { class: 'sx-top' }, bal, tabsEl), body);
  ctx.root.replaceChildren(wrap);
  ctx.root.parentElement?.classList.add('fzx-shop');
  ctx.title('Fuzzy Shop');

  const seasons = (): ReturnType<typeof seasonalShelves> => seasonalShelves(t());
  const tabList = (): { id: Tab; label: string }[] => [{ id: 'featured', label: 'Featured' }, { id: 'daily', label: 'Daily' }, { id: 'weekly', label: 'Weekly' }, { id: 'permanent', label: 'Permanent' }, ...(seasons().length ? [{ id: 'season' as Tab, label: 'Seasonal' }] : [])];
  function paintTabs(): void {
    const list = tabList();
    if (!list.some((x) => x.id === tab)) tab = 'featured';
    tabsEl.replaceChildren(...list.map((x) => {
      const b = h('button', { class: `sx-tab${tab === x.id ? ' on' : ''}`, type: 'button', role: 'tab', 'aria-selected': String(tab === x.id), onclick: () => { tab = x.id; filter = 'all'; noteEl = null; render(); body.scrollTo({ top: 0 }); } }, x.label);
      if (x.id === 'season') b.append(h('i', { class: 'sx-live' }));
      return b;
    }));
    requestAnimationFrame(() => tabsEl.querySelector<HTMLElement>('.sx-tab.on')?.scrollIntoView({ inline: 'nearest', block: 'nearest' }));
  }

  // ───────── cards ─────────
  const price = (n: number, size = 18): HTMLElement => h('span', { class: 'sx-price' }, coinMark(size), String(n.toLocaleString()));
  const ribbon = (it: { id: string; type: 'character' | 'cosmetic' }): HTMLElement => { const d = defOf(it); return h('span', { class: 'sx-rib', title: d.rarity, 'aria-hidden': 'true' }, gicon('star', 13)); };
  function footer(it: ShopItem, wrapEl: HTMLElement, mainEl: HTMLElement): HTMLElement {
    const foot = h('div', { class: 'sx-foot' });
    let last = '';
    const paint = (): void => {
      const st: ItemState = stateOf(it);
      const key = st;
      if (key === last) return; // nothing changed: leave the buttons alone (taps must never land on a replaced button)
      last = key;
      wrapEl.dataset.state = st;
      let b: HTMLElement;
      if (st === 'equipped') b = h('span', { class: 'sx-btn sx-equipped' }, gicon('check', 16), 'Equipped');
      else if (st === 'owned') b = h('button', { class: 'sx-btn sx-equip', type: 'button', onclick: () => equipNow(it) }, 'Equip');
      else if (st === 'buy') b = h('button', { class: 'fzx-bigbtn sx-btn sx-buy', type: 'button', onclick: () => sheet(it), 'aria-label': `Buy ${defOf(it).name} for ${it.price} coins` }, price(it.price));
      else b = h('button', { class: 'sx-btn sx-poor', type: 'button', onclick: () => sheet(it), 'aria-label': `${defOf(it).name}: ${it.price} coins, you need ${it.price - coins()} more` }, price(it.price));
      foot.replaceChildren(b);
      mainEl.querySelector('.sx-badge')?.remove();
      if (st === 'owned' || st === 'equipped') mainEl.append(h('span', { class: 'sx-badge' }, gicon('check', 14)));
    };
    paint(); updaters.push(paint);
    return foot;
  }
  function card(it: ShopItem, opts: { small?: boolean } = {}): HTMLElement {
    const d = defOf(it);
    const main = h('button', { class: 'sx-main', type: 'button', onclick: () => sheet(it), 'aria-label': `${d.name}, ${kindWords(it)}, ${d.rarity}` },
      ribbon(it),
      h('span', { class: 'sx-art' }, art(it, opts.small ? 64 : 76)),
      h('b', { class: 'sx-name' }, d.name));
    const el = h('article', { class: `sx-card fzx-card${opts.small ? ' small' : ''}`, 'data-id': it.id, style: `--rar:${RARITY_COLOR[d.rarity]}` }, main);
    el.append(footer(it, el, main));
    return el;
  }
  /** an event Fuzzy: shown, never sold */
  function eventFuzzy(c: CharacterDef, ev: EventId): HTMLElement {
    const main = h('div', { class: 'sx-main static' }, ribbon({ id: c.id, type: 'character' }), h('span', { class: 'sx-art' }, characterPortrait(c, 76)), h('b', { class: 'sx-name' }, c.name));
    const el = h('article', { class: 'sx-card fzx-card earn', 'data-id': c.id, style: `--rar:${RARITY_COLOR[c.rarity]}`, title: `Earn it in the ${EVENT_NAME[ev]} event` }, main);
    const foot = h('div', { class: 'sx-foot' });
    let last = '';
    const paint = (): void => {
      const key = hasCharacter(c.id) ? 'own' : 'earn';
      if (key === last) return;
      last = key;
      if (key === 'own') { foot.replaceChildren(h('span', { class: 'sx-btn sx-equipped' }, gicon('check', 16), 'Owned')); return; }
      foot.replaceChildren(hasPanel('events')
        ? h('button', { class: 'sx-btn sx-link', type: 'button', onclick: () => ctx.go({ to: 'events', id: ev }) }, 'Event')
        : h('span', { class: 'sx-btn sx-earn' }, gicon('events', 16), 'Event'));
    };
    paint(); updaters.push(paint);
    el.append(foot);
    return el;
  }

  // ───────── sections ─────────
  const grid = (...els: HTMLElement[]): HTMLElement => h('div', { class: 'sx-grid' }, ...els);
  const countLine = (label: string, until: () => number): HTMLElement => {
    const el = h('span', { class: 'sx-count' }, gicon('clock', 14), h('span', null, ''));
    const paint = (): void => { (el.lastChild as HTMLElement).textContent = `${label} ${countdown(until() - t())}`.trim(); };
    paint(); updaters.push(paint);
    return el;
  };
  const section = (title: string, sub: HTMLElement | string | null, ...content: HTMLElement[]): HTMLElement => h('section', { class: 'sx-sec' }, h('header', { class: 'sx-sec-h fzx-sh' }, h('h3', null, title), sub ? (typeof sub === 'string' ? h('span', { class: 'sx-sec-sub fzx-timer' }, sub) : sub) : null), ...content);
  function filterBar(items: ShopItem[]): HTMLElement | null {
    const counts = new Map<Filter, number>([['all', items.length]]);
    for (const it of items) counts.set(filterOf(it), (counts.get(filterOf(it)) ?? 0) + 1);
    const shown = FILTERS.filter((f) => f.id === 'all' || (counts.get(f.id) ?? 0) > 0);
    if (shown.length <= 2 || items.length < 6) return null;
    if (!shown.some((f) => f.id === filter)) filter = 'all';
    return h('div', { class: 'sx-filters', role: 'group', 'aria-label': 'Filter by type' }, ...shown.map((f) => h('button', { class: `sx-chip${filter === f.id ? ' on' : ''}`, type: 'button', 'aria-pressed': String(filter === f.id), onclick: () => { filter = f.id; render(true); } }, f.label, h('small', null, String(counts.get(f.id) ?? 0)))));
  }
  const shelf = (items: ShopItem[]): HTMLElement[] => {
    const f = filterBar(items);
    const list = filter === 'all' ? items : items.filter((it) => filterOf(it) === filter);
    return [...(f ? [f] : []), list.length ? grid(...list.map((it) => card(it))) : h('p', { class: 'muted sx-empty' }, 'Nothing here right now.')];
  };

  function hero(it: ShopItem): HTMLElement {
    const c = CHARACTER_BY_ID[it.id];
    const el = h('article', { class: 'sx-hero fzx-card', 'data-id': it.id, style: `--rar:${RARITY_COLOR[c.rarity]}` });
    const main = h('button', { class: 'sx-hero-main', type: 'button', onclick: () => sheet(it), 'aria-label': `${c.name}, this week's featured Fuzzy` },
      ribbon(it), h('span', { class: 'sx-hero-art' }, characterPortrait(c, 120)), h('b', { class: 'sx-hero-name' }, c.name));
    el.append(main, countLine('', () => nextWeeklyReset(t())), footer(it, el, main));
    return el;
  }

  function earnStrip(): HTMLElement {
    const pick = CHARACTERS.filter((c) => (c.rarity === 'legendary' || c.rarity === 'mythic') && c.unlock.kind !== 'secret').slice(0, 6);
    return h('section', { class: 'sx-earnbar fzx-card' },
      h('div', { class: 'sx-earn-art' }, ...pick.map((c) => h('span', { class: 'sx-earn-pic', style: `--rar:${RARITY_COLOR[c.rarity]}`, title: `${c.name} — not for sale` }, characterPortrait(c, 36), h('i', null, gicon('lock', 11))))),
      h('b', { class: 'sx-earn-t' }, 'Earn these'),
      h('button', { class: 'sx-btn sx-link', type: 'button', onclick: () => ctx.go({ to: 'locker' }) }, 'Locker'));
  }
  function teaser(): HTMLElement | null {
    if (seasons().length) return null;
    let best: { ev: EventId; at: number } | null = null;
    for (const ev of EVENT_ORDER) { const at = nextEventStart(ev, t()); if (at !== null && (!best || at < best.at)) best = { ev, at }; }
    if (!best) return null;
    return h('section', { class: 'sx-teaser fzx-card' }, gtile('events', 44, 'soft'), h('div', null, h('b', null, `Next event: ${EVENT_NAME[best.ev]}`), h('small', null, `${inDays(t(), best.at)} · ${dateWords(best.at)}`)));
  }

  function renderFeatured(): HTMLElement[] {
    const weekly = weeklyItems(t()), daily = dailyItems(t());
    const wkChar = weekly.find((x) => x.type === 'character'), dayChar = daily.find((x) => x.type === 'character');
    const out: HTMLElement[] = [];
    if (wkChar) out.push(hero(wkChar));
    const picks: ShopItem[] = [...(dayChar ? [dayChar] : []), ...weekly.filter((x) => x.type === 'cosmetic')];
    out.push(section('Fresh picks', countLine('', () => nextDailyReset(t())), grid(...picks.map((it) => card(it)))));
    for (const s of seasons()) {
      out.push(section(`${s.name} collection`, countLine('Ends', () => s.endsAt), grid(...s.items.slice(0, 3).map((it) => card(it)))));
    }
    out.push(earnStrip());
    const te = teaser(); if (te) out.push(te);
    return out;
  }
  function render(keepScroll = false): void {
    const top = keepScroll ? body.scrollTop : 0;
    updaters = [];
    paintTabs();
    const parts: HTMLElement[] = [];
    if (noteEl) parts.push(noteEl);
    if (tab === 'featured') parts.push(...renderFeatured());
    else if (tab === 'daily') parts.push(section('Today', countLine('', () => nextDailyReset(t())), ...shelf(dailyItems(t()))));
    else if (tab === 'weekly') parts.push(section('This week', countLine('', () => nextWeeklyReset(t())), ...shelf(weeklyItems(t()))));
    else if (tab === 'permanent') parts.push(section('Always here', null, ...shelf(permanentItems())));
    else {
      for (const s of seasons()) {
        const fuzzies = s.eventFuzzies.map((id) => CHARACTER_BY_ID[id]).filter(Boolean);
        parts.push(section(`${s.name} collection`, countLine('Ends', () => s.endsAt),
          ...(s.items.length ? shelf(s.items) : [h('p', { class: 'muted sx-empty' }, 'No styles in this collection.')]),
          ...(fuzzies.length ? [h('h4', { class: 'sx-sub-h' }, 'Event Fuzzy — earned, not bought'), grid(...fuzzies.map((c) => eventFuzzy(c, s.event)))] : [])));
      }
    }
    body.replaceChildren(...parts);
    if (keepScroll) body.scrollTop = top;
  }

  // ───────── actions ─────────
  function equipNow(it: ShopItem): void {
    if (!equipItem(it)) return;
    ctx.equipChanged();
    toast(`${defOf(it).name} equipped`, 'good', 1500);
  }
  async function celebrate(): Promise<void> {
    try { const m = await import('./celebrate'); await m.celebrateAll(ctx.root, { equipChanged: ctx.equipChanged, go: ctx.go }); } catch (e) { console.error(e); }
  }
  function sheet(it: ShopItem): void {
    const d = defOf(it);
    const st = stateOf(it);
    const err = h('p', { class: 'sx-err', role: 'status', hidden: true });
    const after = coins() - it.price;
    const body2 = h('div', { class: 'sx-sheet', style: `--rar:${RARITY_COLOR[d.rarity]}` },
      h('div', { class: 'sx-sheet-art' }, art(it, 104)),
      h('div', { class: 'sx-sheet-t' },
        h('div', { class: 'sx-sheet-row' }, h('b', null, d.name), rarityTag(d.rarity)),
        h('p', null, blurbOf(it)),
        st === 'owned' || st === 'equipped'
          ? h('div', { class: 'sx-chips' }, h('span', { class: 'fzx-chip xp' }, gicon('check', 14), st === 'equipped' ? 'Equipped' : 'Yours'))
          : h('div', { class: 'sx-chips' },
            h('span', { class: 'fzx-chip' }, coinMark(16), `${it.price.toLocaleString()}`),
            st === 'buy' ? h('span', { class: 'fzx-chip xp' }, 'Left', coinMark(15), after.toLocaleString()) : h('span', { class: 'fzx-chip' }, 'Need', coinMark(15), (it.price - coins()).toLocaleString())),
        err));
    let busy = false;
    const actions: HTMLElement[] = [btn(st === 'buy' ? 'Not now' : 'Close', { kind: 'ghost', onClick: () => m.close() })];
    if (st === 'buy') {
      const go = btn(h('span', { class: 'sx-gobtn' }, 'Buy', price(it.price, 16)), { kind: 'primary', onClick: () => {
        if (busy) return; busy = true; go.setAttribute('disabled', '');
        const r = buy(it.id, t());
        if (!r.ok) { err.hidden = false; err.textContent = r.reason; busy = false; go.removeAttribute('disabled'); if (r.code === 'owned' || r.code === 'not-for-sale') render(true); return; }
        m.close();
        render(true);
        const cardEl = body.querySelector(`[data-id="${it.id}"]`);
        if (cardEl) { cardEl.classList.add('pop'); setTimeout(() => cardEl.classList.remove('pop'), 700); if (!reduced()) burstFrom(cardEl); }
        void celebrate().then(() => { if (it.type === 'cosmetic') toast(`${d.name} is yours — tap Equip to wear it`, 'good', 2600); });
      } });
      actions.push(go);
    } else if (st === 'owned') actions.push(btn('Equip', { kind: 'primary', onClick: () => { equipNow(it); m.close(); } }));
    else if (st === 'poor') actions.push(btn('Back to the game', { kind: 'soft', onClick: () => { m.close(); ctx.close(); } }));
    const m = modal(st === 'buy' ? `Buy ${d.name}?` : d.name, body2, { actions });
  }
  function burstFrom(el: Element): void {
    const r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 3;
    const layer = h('div', { class: 'sx-burst', 'aria-hidden': 'true' });
    document.body.append(layer);
    for (let i = 0; i < 14; i++) {
      const c = h('span', { class: 'sx-flyer', style: `left:${cx}px;top:${cy}px` }, coinMark(15 + (i % 3) * 3));
      layer.append(c);
      const a = (Math.PI * 2 * i) / 14 + Math.random() * 0.4, dist = 50 + Math.random() * 80;
      c.animate([{ transform: 'translate(-50%,-50%) scale(.4)', opacity: 1 }, { transform: `translate(calc(-50% + ${Math.cos(a) * dist}px), calc(-50% + ${Math.sin(a) * dist - 34}px)) scale(1)`, opacity: 1, offset: 0.55 }, { transform: `translate(calc(-50% + ${Math.cos(a) * dist * 1.1}px), calc(-50% + ${Math.sin(a) * dist + 60}px)) scale(.7)`, opacity: 0 }], { duration: 850 + Math.random() * 250, easing: 'cubic-bezier(.2,.7,.3,1)' });
    }
    setTimeout(() => layer.remove(), 1300);
  }

  // ───────── "How to Unlock" arrives here with an item ─────────
  function focusNote(id: string): void {
    const def = CHARACTER_BY_ID[id] ?? COSMETIC_BY_ID[id];
    if (!def) return;
    const type = CHARACTER_BY_ID[id] ? 'character' : 'cosmetic';
    const listing = listingFor(id, t());
    const mine = owns({ id, type });
    if (listing) {
      tab = listing.shelf === 'season' ? 'season' : listing.shelf;
      if (mine) noteEl = noteBox(`You already own ${def.name}.`, 'It is on the shelf below.');
      requestAnimationFrame(() => requestAnimationFrame(() => highlight(id)));
      return;
    }
    const shelfName = shelfOf(id);
    if (!shelfName) {
      // never sold: say how it IS earned and take the player there
      let text: string, go: NavTarget | undefined, label: string | undefined;
      if (type === 'character') {
        const c = CHARACTER_BY_ID[id]; text = unlockText(c);
        const k = c.unlock;
        if (k.kind === 'pass') { go = { to: 'pass', level: k.level }; label = 'Go to the Pass'; }
        else if (k.kind === 'season' && hasPanel('events')) { go = { to: 'events', id: k.event }; label = 'See the event'; }
        else { go = { to: 'locker', id }; label = 'Back to the Locker'; }
      } else { const how = cosmeticHow(COSMETIC_BY_ID[id]); text = how.text; go = how.go; label = how.label; }
      noteEl = noteBox(`${def.name} isn't sold in the shop`, text, go && label ? { label, go } : undefined);
      return;
    }
    // sold, just not today
    const longHorizon = shelfName === 'season' ? 800 : 60;
    const a = nextAppearance(id, t(), longHorizon);
    if (shelfName === 'season') {
      const ev = (COSMETIC_BY_ID[id].unlock as { event: EventId }).event;
      noteEl = noteBox(`${def.name} is part of the ${EVENT_NAME[ev]} collection`, a ? `The shop opens it on ${dateWords(a.at)} (${inDays(t(), a.at)}) and it stays on sale until the event ends.` : 'It comes back when the event does.');
      tab = 'featured';
    } else {
      tab = shelfName;
      noteEl = noteBox(`${def.name} isn't in the shop today`, a ? `This ${shelfName === 'weekly' ? 'week\'s' : 'daily'} pick comes back on ${dateWords(a.at)} (${inDays(t(), a.at)}). Prices stay the same.` : 'It comes back later — check again soon.');
    }
  }
  const noteBox = (title: string, text: string, action?: { label: string; go: NavTarget }): HTMLElement => h('div', { class: 'sx-note fzx-card', role: 'status' }, gtile('help', 40, 'soft'), h('div', null, h('b', null, title), h('span', null, text)), action ? h('button', { class: 'sx-btn sx-link', type: 'button', onclick: () => ctx.go(action.go) }, action.label) : null);
  function highlight(id: string): void {
    const el = body.querySelector<HTMLElement>(`[data-id="${id}"]`);
    if (!el) return;
    el.scrollIntoView({ block: 'center', behavior: reduced() ? 'auto' : 'smooth' });
    el.classList.add('focus');
    setTimeout(() => el.classList.remove('focus'), 3200);
  }

  // ───────── live ─────────
  let raf = 0;
  const onChange = (): void => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { balNum.textContent = coins().toLocaleString(); for (const u of updaters) u(); }); };
  addEventListener('fz:crossing', onChange);
  const tick = setInterval(() => {
    if (dayKeyOf(t()) !== renderedDay || weekNumber(t()) !== renderedWeek) { renderedDay = dayKeyOf(t()); renderedWeek = weekNumber(t()); render(true); return; }
    for (const u of updaters) u();
  }, 15_000);

  const wanted = focus && focus.to === 'shop' ? focus.item : undefined;
  if (wanted) focusNote(wanted);
  render();

  return () => {
    cancelAnimationFrame(raf);
    clearInterval(tick);
    removeEventListener('fz:crossing', onChange);
    document.querySelectorAll('.sx-burst').forEach((x) => x.remove());
  };
};
