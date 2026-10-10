/** App shell (sidebar / top bar / phone tab bar) and the hash router. */
import { accounts } from '../core/account';
import { rewards } from '../core/rewards';
import { applyTheme, resolveTheme } from '../core/themes';
import { h, icon, logo, fuzzyMark, avatarEl, popMenu, toast, QUOTE, type IconName } from './dom';
import { cloud } from '../core/cloud';
import { watchAppIcon } from '../core/appicon';
import { sync } from '../core/sync';
import { authScreen } from './screens/auth';
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

export interface Screen { el: HTMLElement; destroy?: () => void }

const NAV: { id: string; label: string; icon: IconName }[] = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'templates', label: 'Templates', icon: 'grid' },
  { id: 'projects', label: 'My designs', icon: 'folder' },
  { id: 'play', label: 'Fuzzy Crossing', icon: 'gamepad' },
  { id: 'land', label: 'Fuzzies Land', icon: 'town' },
  { id: 'rewards', label: 'Rewards', icon: 'gift' },
  { id: 'profile', label: 'Profile', icon: 'user' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];

let current: Screen | null = null;
const root = () => document.getElementById('app')!;

export function balanceChip(): HTMLElement {
  const n = h('b', { class: 'fz-balance' }, String(rewards.balance()));
  const chip = h('a', { class: 'fz-chip', href: '#/rewards', title: 'Your Fuzzies — tap to see rewards' }, fuzzyMark(22), n);
  return chip;
}

function shell(active: string, content: HTMLElement): HTMLElement {
  const a = accounts.current!;
  const navLink = (n: (typeof NAV)[number]) => h('a', { class: `nav-link ${n.id === active ? 'on' : ''}`, href: `#/${n.id}` }, icon(n.icon, 20), h('span', null, n.label));

  const sidebar = h('aside', { class: 'sidebar' },
    h('a', { href: '#/home', class: 'sidebar-logo' }, logo('sm')),
    h('button', { class: 'btn btn-primary btn-lg btn-block create-btn', type: 'button', onclick: () => createDialog() }, icon('plus', 20), h('span', null, 'Create a design')),
    h('nav', { class: 'nav' }, ...NAV.map(navLink)),
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
    h('div', { class: 'topbar-quote' }, QUOTE),
    h('div', { class: 'topbar-right' }, balanceChip(), avBtn));

  const tab = (id: string, label: string, ic: IconName) => h('a', { class: `tab ${id === active ? 'on' : ''}`, href: `#/${id}` }, icon(ic, 22), h('span', null, label));
  const createTab = h('button', { class: 'tab tab-create', type: 'button', 'aria-label': 'Create a design', onclick: () => createDialog() }, h('span', { class: 'tab-plus' }, icon('plus', 26)));
  const tabbar = h('nav', { class: 'tabbar', 'aria-label': 'Main' }, tab('home', 'Home', 'home'), tab('projects', 'Designs', 'folder'), createTab, tab('play', 'Play', 'gamepad'), tab('land', 'Fland', 'town'), tab('profile', 'Me', 'user'));

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
  const hash = location.hash.replace(/^#\/?/, '') || 'home';
  const [name, arg] = hash.split('/');
  current?.destroy?.();
  current = null;
  document.querySelector('.popmenu')?.remove();
  document.querySelectorAll('.picker').forEach((p) => p.remove());

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
  watchAppIcon();
  upgradeMascots();
  addEventListener('hashchange', route);
  route();
  if (cloud.enabled) {
    cloud.init((why) => { toast(why, 'info', 3500); location.hash = '#/login'; route(); });
    // designs or the profile changed on another device: refresh lists (never mid-game or mid-edit)
    sync.onRemoteChange(() => {
      applyTheme();
      const name = location.hash.replace(/^#\/?/, '').split('/')[0] || 'home';
      if (['home', 'projects', 'rewards'].includes(name)) route();
    });
  }
}
