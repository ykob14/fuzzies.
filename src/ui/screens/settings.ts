/** Settings: theme & accent colour, editor, game, motion, storage and install. */
import type { Screen } from '../app';
import { accounts } from '../../core/account';
import { rewards } from '../../core/rewards';
import { THEMES, ACCENTS, applyTheme } from '../../core/themes';
import { unlockDialog } from '../unlock';
import { FONT_PACKS } from '../../content/fonts';
import { fileToImageData } from '../../core/util';
import { mascot } from '../mascot';
import { ICON_COLORS, ICON_BGS, iconSvg, applyAppIcon } from '../../core/appicon';
import { h, btn, icon, fuzzyMark, toast, pickFile } from '../dom';
import { walletConnectReady } from '../../core/walletconnect';

let installPrompt: (Event & { prompt(): Promise<void> }) | null = null;
addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installPrompt = e as typeof installPrompt; });

/** Pick the Fuzzy colour and background of the app icon on your phone / computer. */
function appIconCard(): HTMLElement {
  const card = h('section', { class: 'card appicon-card', id: 'app-icon' });
  const render = () => {
    const cur = accounts.current!.settings.appIcon;
    const pick = (patch: Partial<typeof cur>) => {
      accounts.update((x) => (x.settings.appIcon = { ...x.settings.appIcon, ...patch }));
      void applyAppIcon();
      render();
    };
    const preview = (rounded: boolean, cls: string) => {
      const d = h('div', { class: `ai-prev ${cls}` });
      d.innerHTML = iconSvg(cur, rounded);
      return d;
    };
    card.replaceChildren(
      h('h3', null, 'App icon'),
      h('p', { class: 'muted' }, 'Choose your Fuzzy’s colour for the Fuzzies icon on your phone and computer.'),
      h('div', { class: 'ai-row' },
        h('div', { class: 'ai-previews' }, preview(false, 'phone'), preview(true, 'desk')),
        h('div', { class: 'ai-opts' },
          h('div', { class: 'pnl-label' }, 'Fuzzy colour'),
          h('div', { class: 'ai-colors' }, ...ICON_COLORS.map((c) => {
            const b = h('button', { type: 'button', class: `ai-color ${cur.color === c.id ? 'on' : ''}`, title: c.name, 'aria-label': `${c.name} Fuzzy` }, fuzzyMark(34, c.colors), h('small', null, c.name));
            b.addEventListener('click', () => pick({ color: c.id }));
            return b;
          })),
          h('div', { class: 'pnl-label' }, 'Background'),
          h('div', { class: 'swatches' }, ...ICON_BGS.map((g) => h('button', { type: 'button', class: `swatch ${cur.bg === g.id ? 'on' : ''}`, style: `background:${g.color}`, title: g.name, 'aria-label': `${g.name} background`, onclick: () => pick({ bg: g.id }) }))))),
      h('p', { class: 'hint' }, icon('phone', 14), ' Already added Fuzzies to your home screen? Remove it and add it again to see the new icon (Android may update it by itself after a while). The browser tab icon changes right away.'));
  };
  render();
  return card;
}

function brandCard(): HTMLElement {
  const card = h('section', { class: 'card brand-card', id: 'brand' });
  const render = () => {
    const a = accounts.current!;
    const b = a.brand;
    const save = (fn: (x: typeof b) => void) => { accounts.update((x) => fn(x.brand)); render(); };
    const chips = b.colors.map((c, i) => h('span', { class: 'brand-chip', style: `background:${c}` },
      h('button', { type: 'button', class: 'brand-chip-x', 'aria-label': `Remove ${c}`, title: 'Remove', onclick: () => save((x) => x.colors.splice(i, 1)) }, icon('close', 12))));
    const picker = h('input', { type: 'color', value: '#d6336c', class: 'native-color', 'aria-label': 'Add a brand colour' });
    picker.addEventListener('change', () => save((x) => { if (!x.colors.includes(picker.value) && x.colors.length < 8) x.colors.push(picker.value); }));
    const addColour = b.colors.length < 8 ? h('label', { class: 'brand-add', title: 'Add a colour' }, picker, icon('plus', 18)) : null;
    // free fonts plus any font pack the user has unlocked
    const fonts = FONT_PACKS.filter((p) => rewards.isUnlocked(p.id, p.cost)).flatMap((p) => p.fonts);
    const fontSel = (label: string, cur: string, set: (f: string) => void) => {
      const s = h('select', { class: 'input input-sm', 'aria-label': label }, ...fonts.map((f) => h('option', { value: f, selected: f === cur }, f)));
      s.addEventListener('change', () => set(s.value));
      return h('label', { class: 'field' }, h('span', null, label), s, h('div', { class: 'brand-font-preview', style: `font-family:"${cur}"` }, label === 'Heading font' ? 'Big bold headline' : 'Easy-to-read body text for your designs.'));
    };
    const logo = b.logo
      ? h('div', { class: 'brand-logo' }, h('img', { src: b.logo.src, alt: 'Your logo' }), btn('Remove', { kind: 'ghost', size: 'sm', icon: 'trash', onClick: () => save((x) => delete x.logo) }))
      : btn('Upload your logo', { kind: 'soft', size: 'sm', icon: 'upload', onClick: async () => {
          const [f] = await pickFile('image/*');
          if (!f) return;
          const img = await fileToImageData(f, 1000);
          save((x) => (x.logo = { src: img.src, w: img.w, h: img.h }));
          toast('Logo saved to your brand kit', 'good');
        } });
    card.replaceChildren(
      h('h3', null, 'Brand kit'),
      h('p', { class: 'muted' }, 'Save your colours, fonts and logo once. They show up first in every colour picker, in the Text and Uploads tabs, and as “Use my brand colours” in Background.'),
      h('div', { class: 'pnl-label' }, `Colours (${b.colors.length}/8)`),
      h('div', { class: 'brand-colors' }, ...chips, addColour),
      h('div', { class: 'brand-fonts' }, fontSel('Heading font', b.heading, (f) => save((x) => (x.heading = f))), fontSel('Body font', b.body, (f) => save((x) => (x.body = f)))),
      h('div', { class: 'pnl-label' }, 'Logo'), logo);
  };
  render();
  return card;
}

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
      brandCard(),
      h('section', { class: 'card' }, h('h3', null, 'Preferences'),
        toggle('Snap to guides', 'Elements snap to the page centre, edges and each other while you drag.', a.settings.snap, (v) => set((s) => (s.snap = v))),
        toggle('Game sounds', 'Blips and bloops in Fuzzy Crossing.', a.settings.sound, (v) => set((s) => (s.sound = v))),
        toggle('Music in Fuzzies Land', 'Soft background music while you build your town.', a.settings.music !== false, (v) => set((s) => (s.music = v))),
        toggle('Seasonal effects in Fuzzies Land', 'Falling leaves, snow, lanterns and a warm glow during holidays.', a.settings.seasonFx !== false, (v) => set((s) => (s.seasonFx = v))),
        toggle('Reduce motion', 'Fewer animations across the app.', a.settings.reduceMotion, (v) => set((s) => (s.reduceMotion = v)))),
      appIconCard(),
      h('section', { class: 'card', id: 'help' }, h('h3', null, 'Help'),
        h('p', { class: 'muted' }, 'New to Fuzzies Land, or want a refresher? Pip will walk you through it again, step by step.'),
        h('div', { class: 'btn-row' }, btn(a.land?.tutorial?.status === 'active' ? 'Continue the Fuzzies Land tutorial' : 'Replay the Fuzzies Land tutorial', { kind: 'soft', icon: 'play', onClick: () => {
          // replay from step 1 (rewards already earned aren't paid twice) or carry on where you were; progress is part of your town, so it syncs
          if (accounts.current?.land?.tutorial?.status !== 'active') accounts.update((x) => { const paid = x.land.tutorial?.paid ?? []; x.land.tutorial = { status: 'active', step: 0, got: [], paid }; });
          location.hash = '#/land';
        } }))),
      h('section', { class: 'card' }, h('h3', null, 'Install Fuzzies'),
        h('p', { class: 'muted' }, 'Fuzzies works on phones, tablets and computers. Install it for a full-screen app with its own icon:'),
        h('ul', { class: 'how' },
          h('li', null, icon('phone', 16), ' iPhone/iPad: Safari → Share → “Add to Home Screen”'),
          h('li', null, icon('phone', 16), ' Android: Chrome menu → “Install app”'),
          h('li', null, icon('monitor', 16), ' Computer: the install icon in Chrome/Edge’s address bar')),
        installPrompt ? btn('Install now', { kind: 'primary', icon: 'download', onClick: async () => { await installPrompt?.prompt(); installPrompt = null; render(); } }) : null),
      h('section', { class: 'card' }, h('h3', null, 'Storage'), h('p', { class: 'muted' }, 'Designs and photos are saved in this browser.'), storage,
        h('div', { class: 'btn-row' }, btn('Ask to keep my data', { kind: 'ghost', size: 'sm', icon: 'lock', onClick: async () => { const ok = await navigator.storage?.persist?.(); toast(ok ? 'Your browser will keep Fuzzies data safe' : 'The browser decides automatically — designs are still saved', ok ? 'good' : 'info'); } }))),
      h('section', { class: 'card about' }, mascot(44), h('div', null, h('b', null, 'Fuzzies 1.0'), h('small', null, 'Dream it fuzzy. Make it sharp.'),
        walletConnectReady ? h('small', { class: 'about-legal' }, 'Wallet QR connections by WalletConnect. Portions © 2025 Reown, Inc. All Rights Reserved. ', h('a', { class: 'link', href: '/licenses/walletconnect.md', target: '_blank', rel: 'noopener' }, 'Licence')) : null)),
    );
  }
  render();
  return { el: h('div', { class: 'page' }, h('div', { class: 'page-head' }, h('div', null, h('h1', null, 'Settings'))), body) };
}
