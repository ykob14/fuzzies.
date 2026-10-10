/** Settings: theme & accent colour, editor, game, motion, storage and install. */
import type { Screen } from '../app';
import { accounts } from '../../core/account';
import { rewards } from '../../core/rewards';
import { THEMES, ACCENTS, applyTheme } from '../../core/themes';
import { unlockDialog } from '../unlock';
import { mascot } from '../mascot';
import { h, btn, icon, fuzzyMark, toast } from '../dom';

let installPrompt: (Event & { prompt(): Promise<void> }) | null = null;
addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installPrompt = e as typeof installPrompt; });

export function settingsScreen(): Screen {
  const body = h('div');

  function render(): void {
    const a = accounts.current!;
    const set = (fn: (s: typeof a.settings) => void) => { accounts.update((x) => fn(x.settings)); applyTheme(); render(); };

    const themeCard = (id: string, name: string, swatch: string, cost: number) => {
      const owned = rewards.isUnlocked(`theme-${id}`, cost);
      const on = a.settings.theme === id;
      const b = h('button', { type: 'button', class: `theme-card ${on ? 'on' : ''}` }, h('div', { class: 'theme-sw', style: `background:${swatch}` }, on ? icon('check', 20) : !owned ? h('span', { class: 'lock-badge' }, fuzzyMark(14), String(cost)) : null), h('span', null, name));
      b.addEventListener('click', () => {
        if (!owned) { unlockDialog({ id: `theme-${id}`, name: `${name} theme`, cost, kind: 'App theme', preview: h('div', { class: 'rw-theme big', style: `background:${swatch}` }) }, () => set((s) => (s.theme = id))); return; }
        set((s) => (s.theme = id));
      });
      return b;
    };

    const toggle = (label: string, sub: string, on: boolean, fn: (v: boolean) => void) => {
      const i = h('input', { type: 'checkbox', class: 'switch', checked: on });
      i.addEventListener('change', () => fn(i.checked));
      return h('label', { class: 'setting' }, h('div', null, h('b', null, label), h('small', null, sub)), i);
    };

    const storage = h('small', null, 'Checking…');
    void navigator.storage?.estimate?.().then((e) => { storage.textContent = `${((e.usage ?? 0) / 1e6).toFixed(1)} MB used of about ${((e.quota ?? 0) / 1e9).toFixed(1)} GB available`; }).catch(() => (storage.textContent = 'Unknown'));

    body.replaceChildren(
      h('section', { class: 'card' }, h('h3', null, 'Appearance'), h('p', { class: 'muted' }, 'Light, dark, or something colourful. Extra themes unlock with Fuzzies.'),
        h('div', { class: 'theme-grid' }, themeCard('system', 'Match device', 'linear-gradient(135deg,#ffffff 50%,#1b1825 50%)', 0), ...THEMES.map((t) => themeCard(t.id, t.name, t.swatch, t.cost))),
        h('div', { class: 'pnl-label' }, 'Accent colour'),
        h('div', { class: 'swatches' }, ...ACCENTS.map((c) => h('button', { type: 'button', class: `swatch ${a.settings.accent === c ? 'on' : ''} ${c ? '' : 'auto'}`, style: c ? `background:${c}` : '', title: c || 'Theme default', 'aria-label': c || 'Theme default', onclick: () => set((s) => (s.accent = c)) }, c ? null : 'A')))),
      h('section', { class: 'card' }, h('h3', null, 'Preferences'),
        toggle('Snap to guides', 'Elements snap to the page centre, edges and each other while you drag.', a.settings.snap, (v) => set((s) => (s.snap = v))),
        toggle('Game sounds', 'Blips and bloops in Fuzzy Crossing.', a.settings.sound, (v) => set((s) => (s.sound = v))),
        toggle('Reduce motion', 'Fewer animations across the app.', a.settings.reduceMotion, (v) => set((s) => (s.reduceMotion = v)))),
      h('section', { class: 'card' }, h('h3', null, 'Install Fuzzies'),
        h('p', { class: 'muted' }, 'Fuzzies works on phones, tablets and computers. Install it for a full-screen app with its own icon:'),
        h('ul', { class: 'how' },
          h('li', null, icon('phone', 16), ' iPhone/iPad: Safari → Share → “Add to Home Screen”'),
          h('li', null, icon('phone', 16), ' Android: Chrome menu → “Install app”'),
          h('li', null, icon('monitor', 16), ' Computer: the install icon in Chrome/Edge’s address bar')),
        installPrompt ? btn('Install now', { kind: 'primary', icon: 'download', onClick: async () => { await installPrompt?.prompt(); installPrompt = null; render(); } }) : null),
      h('section', { class: 'card' }, h('h3', null, 'Storage'), h('p', { class: 'muted' }, 'Designs and photos are saved in this browser.'), storage,
        h('div', { class: 'btn-row' }, btn('Ask to keep my data', { kind: 'ghost', size: 'sm', icon: 'lock', onClick: async () => { const ok = await navigator.storage?.persist?.(); toast(ok ? 'Your browser will keep Fuzzies data safe' : 'The browser decides automatically — designs are still saved', ok ? 'good' : 'info'); } }))),
      h('section', { class: 'card about' }, mascot(44), h('div', null, h('b', null, 'Fuzzies 1.0'), h('small', null, 'Dream it fuzzy. Make it sharp.'))),
    );
  }
  render();
  return { el: h('div', { class: 'page' }, h('div', { class: 'page-head' }, h('div', null, h('h1', null, 'Settings'))), body) };
}
