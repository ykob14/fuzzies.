/** Profile: avatar, name & bio, stats, guest upgrade, password and account removal. */
import type { Screen } from '../app';
import { accounts } from '../../core/account';
import { db } from '../../core/db';
import { h, btn, avatarEl, fuzzyMark, toast, pickFile, confirmDialog, icon } from '../dom';
import { fileToImageData } from '../../core/util';
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
    const email = h('input', { class: 'input', type: 'email', value: a.email, placeholder: 'you@example.com' });
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

    // guest → full account, or change password
    let security: HTMLElement;
    if (a.guest) {
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
          try { await accounts.changePassword(o.value, n.value); o.value = n.value = ''; err.textContent = ''; toast('Password changed', 'good'); } catch (e) { err.textContent = (e as Error).message; }
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
          security,
          h('section', { class: 'card danger-zone' }, h('h3', null, 'Account'),
            h('div', { class: 'btn-row' },
              btn('Sign out', { kind: 'ghost', icon: 'logout', onClick: () => { accounts.signOut(); location.hash = '#/welcome'; } }),
              btn('Delete account', { kind: 'danger', icon: 'trash', onClick: async () => {
                if (!(await confirmDialog('Delete your account?', 'This removes your profile, Fuzzies, unlocks and every design on this device. It cannot be undone.', 'Delete everything'))) return;
                await db.deleteOwner(a.id);
                accounts.remove();
                location.hash = '#/welcome';
              } })),
            h('p', { class: 'fine' }, icon('lock', 12), ' Accounts are stored privately on this device — nothing is uploaded.')))));
  }
  render();
  return { el: h('div', { class: 'page profile' }, body) };
}
