/**
 * The Fuzzy Crossing hub: the layer that sits over the game board and hosts the big screens (Locker, Pass, Shop, and later Worlds,
 * Endless, Missions, Leaderboard, Events). Each screen is a module in `crossing/ui/` exporting `open(ctx, focus)`; the hub loads it on
 * demand, gives it a root element and a way to go to another screen ("How to Unlock" → the Pass level / the Shop item / a world).
 * Everything stays inside the Fuzzy Crossing tab — nothing here touches Fuzzies Land.
 */
import { h, icon } from '../ui/dom';
import * as store from './store';
import { coinMark } from './ui/kit';

export type PanelName = 'locker' | 'pass' | 'shop' | 'worlds' | 'endless' | 'missions' | 'leaderboard' | 'events';
/** where "How to Unlock" and the menu tiles send the player */
export type NavTarget =
  | { to: 'locker'; id?: string }
  | { to: 'pass'; level?: number }
  | { to: 'shop'; item?: string }
  | { to: 'worlds'; world?: number; level?: number }
  | { to: 'endless' }
  | { to: 'missions' }
  | { to: 'leaderboard' }
  | { to: 'events'; id?: string }
  | { to: 'menu' };

export interface PanelCtx {
  /** the element the screen draws into (already has the back button / title bar around it) */
  root: HTMLElement;
  /** go back to the Fuzzy Crossing menu */
  close(): void;
  /** open another screen (or 'menu') */
  go(t: NavTarget): void;
  /** the equipped character changed: the menu preview and the game board should update */
  equipChanged(): void;
  /** start a game from inside a screen (worlds, endless…) */
  play(mode: { kind: 'classic' } | { kind: 'world'; world: number; level: number } | { kind: 'endless' } | { kind: 'event'; id: string }): void;
  /** set the title shown in the bar */
  title(text: string): void;
}
export type PanelOpen = (ctx: PanelCtx, focus?: NavTarget) => void | (() => void) | Promise<void | (() => void)>;

/** Panels that exist. A screen is added here when it is built, so the menu never shows a dead button. */
const LOADERS: Partial<Record<PanelName, () => Promise<{ open: PanelOpen }>>> = {
  locker: () => import('./ui/locker'),
  pass: () => import('./ui/pass'),
  shop: () => import('./ui/shop'),
  missions: () => import('./ui/missions'),
  leaderboard: () => import('./ui/leaderboard'),
};
export const panelAvailable = (n: PanelName): boolean => !!LOADERS[n];
export const PANEL_TITLE: Record<PanelName, string> = { locker: 'Fuzzy Locker', pass: 'Fuzzy Pass', shop: 'Fuzzy Shop', worlds: 'Worlds', endless: 'Endless Crossing', missions: 'Missions', leaderboard: 'Weekly Boards', events: 'Events' };

export interface HubHost {
  /** the element the layer is added to (position: relative) */
  shell: HTMLElement;
  /** back to the menu card */
  toMenu(): void;
  equipChanged(): void;
  play(mode: Parameters<PanelCtx['play']>[0]): void;
  /** called when a screen opens/closes (the game pauses its keyboard handling while a screen is up) */
  onOpen?(open: boolean): void;
}

export function createHub(host: HubHost) {
  let layer: HTMLElement | null = null;
  let cleanup: (() => void) | void;
  let current: PanelName | null = null;
  let gen = 0;
  let coinsOff: (() => void) | null = null;

  async function open(name: PanelName, focus?: NavTarget): Promise<void> {
    const load = LOADERS[name];
    if (!load) return;
    const my = ++gen;
    dispose(false);
    const titleEl = h('b', { class: 'fzx-title' }, PANEL_TITLE[name]);
    const body = h('div', { class: 'fzx-body' });
    const coinsNum = h('b', null, store.coins().toLocaleString());
    const coinsEl = h('span', { class: 'fzx-bar-coins', title: 'Your Crossing Coins' }, coinMark(20), coinsNum);
    const onCoins = () => { coinsNum.textContent = store.coins().toLocaleString(); };
    addEventListener('fz:crossing', onCoins);
    coinsOff = () => removeEventListener('fz:crossing', onCoins);
    layer = h('section', { class: `fzx-layer fzx-${name}`, role: 'dialog', 'aria-label': PANEL_TITLE[name] },
      h('header', { class: 'fzx-bar' },
        h('button', { class: 'fzx-back', type: 'button', 'aria-label': 'Back to Fuzzy Crossing', onclick: () => close() }, icon('back', 20)),
        titleEl,
        coinsEl),
      body);
    host.shell.append(layer);
    current = name;
    host.onOpen?.(true);
    const ctx: PanelCtx = {
      root: body, close, equipChanged: () => host.equipChanged(), title: (t) => { titleEl.textContent = t; },
      go: (t) => { if (t.to === 'menu') close(); else void open(t.to, t); },
      play: (m) => { dispose(true); host.play(m); },
    };
    try {
      const mod = await load();
      if (my !== gen) return;
      cleanup = await mod.open(ctx, focus);
    } catch (e) {
      console.error(e);
      body.replaceChildren(h('p', { class: 'muted' }, 'Something went wrong opening this screen. Please try again.'));
    }
  }
  function dispose(notify: boolean): void {
    try { if (typeof cleanup === 'function') cleanup(); } catch (e) { console.error(e); }
    cleanup = undefined;
    coinsOff?.(); coinsOff = null;
    layer?.remove();
    layer = null;
    current = null;
    if (notify) host.onOpen?.(false);
  }
  function close(): void { gen++; dispose(true); host.toMenu(); }
  return { open, close, current: () => current, dispose: () => { gen++; dispose(true); } };
}
export type Hub = ReturnType<typeof createHub>;
