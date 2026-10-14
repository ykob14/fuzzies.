/** App shell (sidebar / top bar / phone tab bar) and the hash router. */
import { accounts } from '../core/account';
import { rewards } from '../core/rewards';
import { applyTheme, resolveTheme } from '../core/themes';
import { h, icon, logo, fuzzyMark, avatarEl, popMenu, toast, type IconName } from './dom';
import { NAV_GROUPS, openQuickFind, bindQuickFind } from './quickfind';
import { pay } from '../core/pay';
import { checkGifts } from './giftBox';
import { cloud } from '../core/cloud';
import { watchAppIcon } from '../core/appicon';
import { sync } from '../core/sync';
import { authScreen, resetScreen } from './screens/auth';
import { homeScreen } from './screens/home';
import { templatesScreen } from './screens/templates';
import { projectsScreen } from './screens/projects';
import { playScreen } from './screens/play';
import { landScreen } from './screens/land';
import { rewardsScreen } from './screens/rewards';
import { profileScreen } from './screens/profile';
import { settingsScreen } from './screens/settings';
import { openEditor } from './screens/editor';
import { sharedScreen, remixShared, REMIX_KEY } from './screens/shared';
import { createDialog } from './create';
import { startAchievements } from '../core/missions';
import { mascot, upgradeMascots } from './mascot';
import { mountAssistant } from './assistant';
import { assistant } from '../core/assistant';

export interface Screen { el: HTMLElement; destroy?: () => void }

const NAV = NAV_GROUPS.flatMap((g) => g.items);

let current: Screen | null = null;
const SIDEBAR_KEY = 'fz.sidebar';
const root = () => document.getElementById('app')!;

export function balanceChip(): HTMLElement {
  const n = h('b', { class: 'fz-balance' }, String(rewards.balance()));
  const chip = h('a', { class: 'fz-chip', href: '#/rewards', title: 'Your Fuzzies — tap to see rewards' }, fuzzyMark(22), n);
  return chip;
}

function shell(active: string, content: HTMLElement): HTMLElement {
  const a = accounts.current!;
  const navLink = (n: (typeof NAV)[number]) => h('a', { class: `nav-link ${n.id === active ? 'on' : ''}`, href: `#/${n.id}`, 'data-tip': n.label, 'aria-current': n.id === active ? 'page' : null }, icon(n.icon, 18), h('span', null, n.label));

  // the side navigation folds into a slim icon rail (remembered on this device) to give the page more room
  const mini = (() => { try { return localStorage.getItem(SIDEBAR_KEY) === 'mini'; } catch { return false; } })();
  const fold = h('button', { class: 'sidebar-fold', type: 'button' });
  const paintFold = (on: boolean) => {
    document.documentElement.classList.toggle('side-mini', on);
    fold.replaceChildren(icon(on ? 'chevR' : 'chevL', 18));
    fold.title = on ? 'Show the menu' : 'Fold the menu away';
    fold.setAttribute('aria-label', fold.title);
    fold.setAttribute('aria-expanded', String(!on));
  };
  fold.addEventListener('click', () => {
    const on = !document.documentElement.classList.contains('side-mini');
    try { localStorage.setItem(SIDEBAR_KEY, on ? 'mini' : 'full'); } catch { /* private mode */ }
    paintFold(on);
    dispatchEvent(new Event('resize')); // canvases (the editor, the game) re-fit the new space
  });
  paintFold(mini);

  const sidebar = h('aside', { class: 'sidebar' }, fold,
    h('a', { href: '#/home', class: 'sidebar-logo' }, logo('sm')),
    h('button', { class: 'btn btn-primary btn-lg btn-block create-btn', type: 'button', title: 'Create a design', onclick: () => createDialog() }, icon('plus', 20), h('span', null, 'Create a design')),
    h('nav', { class: 'nav', 'aria-label': 'Main' }, ...NAV_GROUPS.map((g) => h('div', { class: 'nav-group' }, h('div', { class: 'nav-group-label' }, g.label), ...g.items.map(navLink)))),
    h('a', { class: 'side-card', href: '#/play' },
      h('div', { class: 'side-card-top' }, mascot(38, { small: true, sparkles: false, interactive: false }), h('div', null, h('b', null, 'Take a fuzzy break'), h('small', null, 'Play to unlock rewards'))),
      h('div', { class: 'side-card-bal' }, 'Balance ', h('b', { class: 'fz-balance' }, String(rewards.balance())))));

  const av = avatarEl(a, 36);
  const avBtn = h('button', { class: 'avatar-btn', type: 'button', title: 'Account', 'aria-label': 'Account menu' }, av);
  avBtn.addEventListener('click', () => {
    const dark = resolveTheme(a.settings.theme).dark;
    popMenu(avBtn, [
      { label: `${a.name} (@${a.username})`, icon: 'user', onClick: () => (location.hash = '#/profile') },
      { label: dark ? 'Switch to light mode' : 'Switch to dark mode', icon: dark ? 'sun' : 'moon', onClick: () => { accounts.update((x) => (x.settings.theme = dark ? 'light' : 'dark')); applyTheme(); } },
      { label: 'Settings', icon: 'settings', onClick: () => (location.hash = '#/settings') },
      null,
      { label: 'Sign out', icon: 'logout', danger: true, onClick: () => { void signOut(); } },
    ]);
  });

  const top = h('header', { class: 'topbar' },
    h('a', { href: '#/home', class: 'topbar-logo' }, logo('sm', false)),
    h('div', { class: 'topbar-title' }, NAV.find((n) => n.id === active)?.label ?? ''),
    h('button', { class: 'topbar-search', type: 'button', onclick: () => openQuickFind(), 'aria-label': 'Quick find', title: 'Find anything (Ctrl/Cmd+K)' },
      icon('search', 16), h('span', null, 'Search…'), h('kbd', null, /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘K' : 'Ctrl K')),
    h('div', { class: 'topbar-right' }, balanceChip(), avBtn));

  const tab = (id: string, label: string, ic: IconName) => h('a', { class: `tab ${id === active ? 'on' : ''}`, href: `#/${id}` }, icon(ic, 22), h('span', null, label));
  const createTab = h('button', { class: 'tab tab-create', type: 'button', 'aria-label': 'Create a design', onclick: () => createDialog() }, h('span', { class: 'tab-plus' }, icon('plus', 26)));
  const tabbar = h('nav', { class: 'tabbar', 'aria-label': 'Main' }, tab('home', 'Home', 'home'), tab('templates', 'Templates', 'grid'), createTab, tab('projects', 'Designs', 'folder'), tab('play', 'Play', 'gamepad'), tab('land', 'Fland', 'town'));

  return h('div', { class: 'app' }, sidebar, h('div', { class: 'main' }, top, h('main', { class: 'content', id: 'content' }, content)), tabbar);
}

/** Sign out (a cloud account first finishes uploading) and go back to the welcome screen. */
export async function signOut(): Promise<void> {
  if (accounts.current?.cloud && sync.pending()) toast('Saving your last changes…', 'info');
  await cloud.signOut();
  location.hash = '#/welcome';
  route();
}

export function route(): void {
  const hash = location.hash.replace(/^#\/?/, '').split('?')[0] || 'home'; // '?…' carries screen state (e.g. template filters)
  const [name, arg] = hash.split('/');
  assistant.setScreen(!accounts.current && !['reset', 's'].includes(name) ? (name === 'login' || name === 'signup' ? name : 'welcome') : name);
  current?.destroy?.();
  current = null;
  document.querySelector('.popmenu')?.remove();
  document.querySelectorAll('.picker').forEach((p) => p.remove());

  // a password-reset link from an email works whether or not someone is logged in on this device
  if (name === 'reset' && arg) {
    current = resetScreen(arg);
    root().replaceChildren(current.el);
    return;
  }
  // shared design links open for everyone, signed in or not
  if (name === 's' && arg) {
    current = sharedScreen(arg);
    root().replaceChildren(current.el);
    return;
  }

  if (!accounts.current) {
    current = authScreen(name === 'login' ? 'login' : name === 'signup' ? 'signup' : 'welcome');
    root().replaceChildren(current.el);
    return;
  }
  // someone tapped "Remix" on a shared link before they had an account
  const pending = sessionStorage.getItem(REMIX_KEY);
  if (pending) {
    sessionStorage.removeItem(REMIX_KEY);
    void remixShared(pending);
    return;
  }
  if (name === 'welcome' || name === 'login' || name === 'signup') { location.replace('#/home'); return; }

  if (name === 'edit' && arg) {
    root().replaceChildren(h('div', { class: 'loading-screen' }, mascot(72), h('p', null, 'Opening your design…')));
    void openEditor(arg).then((s) => {
      if (!s) return;
      current = s;
      root().replaceChildren(s.el);
    });
    return;
  }

  const screens: Record<string, () => Screen> = {
    home: homeScreen, templates: templatesScreen, projects: projectsScreen, play: playScreen, land: landScreen,
    rewards: rewardsScreen, profile: profileScreen, settings: settingsScreen,
  };
  const make = screens[name] ?? homeScreen;
  current = make();
  // Fuzzies Land is a full-screen game world: no app sidebar, top bar or tab bar (it has its own back button)
  if (name === 'land') { root().replaceChildren(current.el); return; }
  root().replaceChildren(shell(screens[name] ? name : 'home', current.el));
  window.scrollTo(0, 0);
  document.getElementById('content')?.scrollTo(0, 0);
}

export function startApp(): void {
  accounts.restore();
  applyTheme();
  accounts.onChange(() => {
    for (const b of document.querySelectorAll('.fz-balance')) b.textContent = String(rewards.balance());
  });
  rewards.onEarn((n, reason) => {
    if (reason === 'Fuzzy Crossing') return; // the game shows its own pop-ups
    toast(`+${n} Fuzz${n === 1 ? 'y' : 'ies'} · ${reason}`, 'fuzzy');
  });
  startAchievements();
  bindQuickFind();
  watchAppIcon();
  upgradeMascots();
  addEventListener('hashchange', route);
  route();
  mountAssistant(); // the Fuzzy helper, on every screen
  if (cloud.enabled) {
    cloud.init((why) => { toast(why, 'info', 3500); location.hash = '#/login'; route(); });
    // payments sent earlier that still need confirming, then any gift waiting to be opened
    setTimeout(() => { if (accounts.current?.cloud) void pay.resume().finally(() => void checkGifts()); }, 2500);
    // designs or the profile changed on another device: refresh lists (never mid-game or mid-edit)
    sync.onRemoteChange(() => {
      applyTheme();
      const name = location.hash.replace(/^#\/?/, '').split('/')[0] || 'home';
      if (['home', 'projects', 'rewards'].includes(name)) route();
    });
  }
}
