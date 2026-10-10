/** Profile: avatar, name & bio, stats, saving the account (cloud sync), password and account removal. */
import type { Screen } from '../app';
import { accounts } from '../../core/account';
import { db } from '../../core/db';
import { h, btn, avatarEl, fuzzyMark, toast, pickFile, confirmDialog, icon } from '../dom';
import { fileToImageData, timeAgo } from '../../core/util';
import { cloud, CheckEmail } from '../../core/cloud';
import { sync } from '../../core/sync';
import { signOut } from '../app';
import { achievementsGrid } from '../missions';
import { ACHIEVEMENTS } from '../../core/missions';

const EMOJIS = ['🦄', '🐻', '🐰', '🦊', '🐼', '🐸', '🐙', '🦋', '🐯', '🐨', '🐶', '🐱', '🌈', '⭐', '🍕', '🎨', '🚀', '🌸', '👾', '😎'];
const COLORS = ['#d6336c', '#b0245a', '#ff8fb4', '#ffd6e4', '#18171c', '#5c5864', '#a09ca7', '#efede9', '#e8590c', '#2b9a66'];

export function profileScreen(): Screen {
  const body = h('div');

  function render(): void {
    const a = accounts.current!;
    const field = (label: string, input: HTMLElement) => h('label', { class: 'field' }, h('span', null, label), input);

    const avatarPick = h('div', { class: 'avatar-edit' },
      avatarEl(a, 96),
      h('div', { class: 'avatar-opts' },
        h('div', { class: 'emoji-row' }, ...EMOJIS.map((e) => h('button', { type: 'button', class: `emo ${!a.avatar.image && a.avatar.emoji === e ? 'on' : ''}`, onclick: () => { accounts.update((x) => { x.avatar.emoji = e; delete x.avatar.image; }); render(); } }, e))),
        h('div', { class: 'swatches' }, ...COLORS.map((c) => h('button', { type: 'button', class: `swatch ${a.avatar.color === c ? 'on' : ''}`, style: `background:${c}`, 'aria-label': c, onclick: () => { accounts.update((x) => (x.avatar.color = c)); render(); } }))),
        h('div', { class: 'row' },
          btn('Upload photo', { kind: 'soft', size: 'sm', icon: 'upload', onClick: async () => {
            const [f] = await pickFile('image/*');
            if (!f) return;
            const { src } = await fileToImageData(f, 320);
            accounts.update((x) => (x.avatar.image = src));
            render();
          } }),
          a.avatar.image ? btn('Remove photo', { kind: 'ghost', size: 'sm', onClick: () => { accounts.update((x) => delete x.avatar.image); render(); } }) : null)));

    const name = h('input', { class: 'input', value: a.name, maxlength: '40' });
    const bio = h('textarea', { class: 'input', rows: '3', maxlength: '200', placeholder: 'Tell people what you love to create…' });
    bio.value = a.bio;
    const email = h('input', { class: 'input', type: 'email', value: a.email, placeholder: 'you@example.com', ...(a.cloud ? { readonly: true, title: 'This is the email you log in with' } : {}) });
    const saveProfile = btn('Save profile', { kind: 'primary', icon: 'check', onClick: () => {
      accounts.update((x) => { x.name = name.value.trim() || x.username; x.bio = bio.value.trim(); x.email = email.value.trim(); });
      toast('Profile saved', 'good');
      render();
    } });

    const s = a.stats;
    const stats = h('div', { class: 'stat-grid' }, ...[
      ['🎨', 'Designs created', s.designs], ['📤', 'Shared & downloaded', s.exports], ['⏱️', 'Minutes creating', s.minutesActive],
      ['🐸', 'Games played', s.gamesPlayed], ['🏆', 'Best score', s.bestScore], ['🚦', 'Best level', s.bestLevel],
      ['✨', 'Fuzzies earned', a.totalFuzzies], ['🔓', 'Rewards unlocked', a.unlocked.length],
    ].map(([e, l, v]) => h('div', { class: 'stat' }, h('span', null, String(e)), h('b', null, String(v)), h('small', null, String(l)))));

    // guest / on-device account → cloud account, guest → local login, or change password
    let security: HTMLElement;
    if (!a.cloud && cloud.enabled) {
      const u = h('input', { class: 'input', placeholder: 'Pick a username', autocapitalize: 'none', value: a.guest ? '' : a.username });
      const em = h('input', { class: 'input', type: 'email', placeholder: 'you@example.com', value: a.email, autocomplete: 'email' });
      const p = h('input', { class: 'input', type: 'password', placeholder: 'At least 6 characters', autocomplete: 'new-password' });
      const err = h('p', { class: 'form-err' });
      const note = h('p', { class: 'form-note' });
      security = h('section', { class: 'card' }, h('h3', null, icon('cloud', 18), ' Save your account'),
        h('p', { class: 'muted' }, a.guest
          ? 'You’re a guest, so everything lives only on this device. Save your account to keep your designs and Fuzzies safe and use them on your phone and computer.'
          : 'This account only lives on this device. Save it to your Fuzzies account to sync your designs and Fuzzies to all your devices.'),
        field('Username', u), field('Email', em), field('Password', p), err, note,
        btn('Save & sync my account', { kind: 'primary', icon: 'cloud', onClick: async () => {
          err.textContent = note.textContent = '';
          try { await cloud.claim({ name: name.value || a.name, username: u.value, email: em.value, password: p.value }); toast('Account saved — it syncs to all your devices now 🎉', 'good', 3500); render(); }
          catch (e) { if (e instanceof CheckEmail) note.textContent = e.message; else err.textContent = (e as Error).message; }
        } }));
    } else if (a.guest) {
      const u = h('input', { class: 'input', placeholder: 'Pick a username', autocapitalize: 'none' });
      const p = h('input', { class: 'input', type: 'password', placeholder: 'At least 6 characters' });
      const err = h('p', { class: 'form-err' });
      security = h('section', { class: 'card' }, h('h3', null, 'Save your account'), h('p', { class: 'muted' }, 'You are using Fuzzies as a guest. Create a login to keep your designs and Fuzzies safe and switch between accounts.'),
        field('Username', u), field('Password', p), err,
        btn('Create my login', { kind: 'primary', onClick: async () => {
          try { await accounts.claimGuest({ name: name.value || 'Creator', username: u.value, email: email.value, password: p.value }); toast('Account saved! 🎉', 'good'); render(); } catch (e) { err.textContent = (e as Error).message; }
        } }));
    } else {
      const o = h('input', { class: 'input', type: 'password', placeholder: 'Current password', autocomplete: 'current-password' });
      const n = h('input', { class: 'input', type: 'password', placeholder: 'New password', autocomplete: 'new-password' });
      const err = h('p', { class: 'form-err' });
      security = h('section', { class: 'card' }, h('h3', null, 'Password'), field('Current password', o), field('New password', n), err,
        btn('Change password', { kind: 'soft', onClick: async () => {
          try { await cloud.changePassword(o.value, n.value); o.value = n.value = ''; err.textContent = ''; toast('Password changed', 'good'); } catch (e) { err.textContent = (e as Error).message; }
        } }));
    }

    body.replaceChildren(
      h('section', { class: 'profile-hero' }, avatarEl(a, 84), h('div', null, h('h1', null, a.name), h('p', { class: 'muted' }, `@${a.username}${a.guest ? ' · guest' : ''} · member since ${new Date(a.createdAt).toLocaleDateString()}`), a.bio ? h('p', null, a.bio) : null),
        h('a', { class: 'fz-chip big', href: '#/rewards' }, fuzzyMark(28), h('b', { class: 'fz-balance' }, String(a.fuzzies)))),
      h('div', { class: 'two-col' },
        h('section', { class: 'card' }, h('h3', null, 'Your look'), avatarPick, field('Display name', name), field('Bio', bio), field('Email', email), saveProfile),
        h('div', null,
          h('section', { class: 'card' }, h('h3', null, 'Your stats'), stats),
          h('section', { class: 'card' }, h('h3', null, `Badges · ${a.achievements.length}/${ACHIEVEMENTS.length}`), achievementsGrid(true), h('a', { class: 'link', href: '#/rewards' }, 'See all badges →')),
          syncCard(),
          security,
          h('section', { class: 'card danger-zone' }, h('h3', null, 'Account'),
            h('div', { class: 'btn-row' },
              btn('Sign out', { kind: 'ghost', icon: 'logout', onClick: () => { void signOut(); } }),
              btn('Delete account', { kind: 'danger', icon: 'trash', onClick: async () => {
                const where = a.cloud ? 'from your Fuzzies account and every device' : 'on this device';
                if (!(await confirmDialog('Delete your account?', `This removes your profile, Fuzzies, unlocks and every design ${where}. It cannot be undone.`, 'Delete everything'))) return;
                try {
                  if (cloud.enabled || a.cloud) await cloud.deleteAccount();
                  else { await db.deleteOwner(a.id); accounts.remove(); }
                  location.hash = '#/welcome';
                } catch (e) { toast((e as Error).message, 'bad'); }
              } })),
            h('p', { class: 'fine' }, icon('lock', 12), a.cloud
              ? ' Saved privately in your Fuzzies account — only you can see it.'
              : ' This account is stored privately on this device — nothing is uploaded.')))));
  }
  /** Cloud accounts: is everything saved? */
  function syncCard(): HTMLElement | null {
    const a = accounts.current!;
    if (!a.cloud) return null;
    const dot = h('span', { class: 'sync-dot' });
    const txt = h('span');
    const card = h('section', { class: 'card' }, h('h3', null, icon('cloud', 18), ' Sync'),
      h('p', { class: 'muted' }, `Your designs, photos, Fuzzies and unlocks are saved to your account. Log in with ${a.email} on any phone or computer to pick up where you left off.`),
      h('div', { class: 'sync-row' }, dot, txt, btn('Sync now', { kind: 'soft', size: 'sm', icon: 'rotate', onClick: () => void sync.pull() })));
    const update = () => {
      if (!card.isConnected && off) { off(); return; }
      dot.className = `sync-dot ${sync.state}`;
      txt.textContent = {
        synced: `All saved${sync.lastSynced ? ` · ${timeAgo(sync.lastSynced)}` : ''}`,
        syncing: 'Syncing…',
        offline: 'You’re offline — changes will sync when you’re back',
        error: 'Couldn’t sync just now — trying again soon',
        off: 'Not syncing',
      }[sync.state];
    };
    let off: (() => void) | null = null;
    update();
    off = sync.onState(update);
    return card;
  }

  render();
  return { el: h('div', { class: 'page profile' }, body) };
}
