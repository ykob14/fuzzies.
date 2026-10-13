/** Profile: avatar, name & bio, stats, saving the account (cloud sync), password and account removal. */
import type { Screen } from '../app';
import { accounts } from '../../core/account';
import { db } from '../../core/db';
import { h, btn, avatarEl, fuzzyMark, toast, pickFile, confirmDialog, icon } from '../dom';
import { FRIENDS, friendUrl } from '../../content/friends';
import { fileToImageData, timeAgo } from '../../core/util';
import { cloud, type LinkResult, type LoginInfo, type Reauth } from '../../core/cloud';
import { sync } from '../../core/sync';
import { signOut } from '../app';
import { achievementsGrid } from '../missions';
import { ACHIEVEMENTS } from '../../core/missions';
import { shortAddress, walletSession } from '../../core/wallet';
import { pickWallet, walletSafetyNote, walletBadge } from '../walletPicker';
import { walletOnboard } from '../walletOnboard';
import { modal } from '../dom';
import { openPaySheet } from '../paySheet';
import { checkGifts } from '../giftBox';
import { pay, money } from '../../core/pay';

const EMOJIS = ['🦄', '🐻', '🐰', '🦊', '🐼', '🐥', '🐙', '🦋', '🐯', '🐨', '🐶', '🐱', '🌈', '⭐', '🍕', '🎨', '🚀', '🌸', '👾', '😎'];
const COLORS = ['#d6336c', '#b0245a', '#ff8fb4', '#ffd6e4', '#18171c', '#5c5864', '#a09ca7', '#efede9', '#e8590c', '#2b9a66'];

/** Re-authenticate: the password (asked in a small window), or — for accounts without one — a linked wallet's signature. */
function confirmIdentity(what: string, hasPassword: boolean): Promise<Reauth | null> {
  return new Promise((res) => {
    if (!hasPassword) {
      pickWallet({ title: 'Confirm it’s you', intro: `To ${what}, sign once with a wallet that’s already linked to this account.`, hash: '#/profile',
        run: async (w) => { const r = await cloud.identifyWallet(w); if (!r.linked?.same) throw new Error('That wallet isn’t linked to this account — use one that is.'); res({ proof: r.proof }); } });
      return;
    }
    let done = false;
    const pw = h('input', { class: 'input', type: 'password', autocomplete: 'current-password', placeholder: 'Your Fuzzies password' });
    const go = btn('Continue', { kind: 'primary', onClick: () => { if (!pw.value) { pw.focus(); return; } done = true; res({ password: pw.value }); m.close(); } });
    pw.addEventListener('keydown', (e) => { if (e.key === 'Enter') go.click(); });
    const m = modal('Confirm it’s you', h('div', { class: 'acct-reauth' }, h('p', { class: 'muted' }, `To ${what}, please enter your password.`), pw), { actions: [btn('Cancel', { kind: 'ghost', onClick: () => m.close() }), go], onClose: () => { if (!done) res(null); } });
    setTimeout(() => pw.focus(), 60);
  });
}

export function profileScreen(): Screen {
  const body = h('div');

  function render(): void {
    const a = accounts.current!;
    const field = (label: string, input: HTMLElement) => h('label', { class: 'field' }, h('span', null, label), input);

    const avatarPick = h('div', { class: 'avatar-edit' },
      avatarEl(a, 96),
      h('div', { class: 'avatar-opts' },
        h('div', { class: 'friend-row' }, ...FRIENDS.map((f) => h('button', { type: 'button', class: `emo friend ${a.avatar.image === friendUrl(f.id) ? 'on' : ''}`, title: f.name, 'aria-label': f.name, onclick: () => { accounts.update((x) => { x.avatar.image = friendUrl(f.id); }); render(); } }, h('img', { src: friendUrl(f.id), alt: '', loading: 'lazy' })))),
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
      ['🎮', 'Games played', s.gamesPlayed], ['🏆', 'Best score', s.bestScore], ['🚦', 'Best level', s.bestLevel],
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
          catch (e) { err.textContent = (e as Error).message; }
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
    } else if (a.cloud) {
      security = accountCard(); // email + password live with the wallets in "Account & login"
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
                  if (a.cloud) {
                    // the password (or a linked wallet) too, so a borrowed logged-in device can't wipe the account
                    const auth = await confirmIdentity('delete your account', (await cloud.loginInfo()).hasPassword);
                    if (!auth) return;
                    await cloud.deleteAccount(auth);
                  } else if (cloud.enabled) await cloud.deleteAccount();
                  else { await db.deleteOwner(a.id); accounts.remove(); }
                  location.hash = '#/welcome';
                } catch (e) { toast((e as Error).message, 'bad'); }
              } })),
            h('p', { class: 'fine' }, icon('lock', 12), a.cloud
              ? ' Saved privately in your Fuzzies account — only you can see it.'
              : ' This account is stored privately on this device — nothing is uploaded.')))));
  }
  /**
   * Cloud accounts: every way into the account in one place — email + password, linked crypto wallets (with the one
   * connected in this browser), connect / switch / disconnect / remove, and adding an email + password to a wallet-only
   * account. Sensitive changes re-authenticate (password, or a signature from a wallet that's already linked).
   */
  function accountCard(): HTMLElement {
    const a = accounts.current!;
    const field = (label: string, input: HTMLElement) => h('label', { class: 'field' }, h('span', null, label), input);
    const list = h('div', { class: 'acct-methods' }, h('p', { class: 'muted' }, 'Loading…'));
    let info: LoginInfo | null = null;
    let feeCents = 0, gift = 0;
    void pay.config().then((c) => { feeCents = c.walletFeeCents; gift = c.walletGift; });
    /** The one-time activation: pay $0.50, then the gift box pops up. */
    const activate = (address: string, cents: number) => openPaySheet({
      kind: 'wallet', item: address, title: 'Activate your wallet', cents,
      what: `Activate ${shortAddress(address)}`, note: `One time only · includes a gift of ${gift || 100} Fuzzies 🎁`,
      onPaid: () => { void reload(); void checkGifts(); },
    });
    const reload = () => cloud.loginInfo().then(show).catch((e) => list.replaceChildren(h('p', { class: 'form-err' }, (e as Error).message)));
    /** Re-authenticate: the password (asked in a small window), or — for accounts without one — a linked wallet's signature. */
    const reauth = (what: string) => confirmIdentity(what, !!info?.hasPassword);
    const afterLink = (r: LinkResult) => {
      void reload();
      if (r.activate) { toast('Wallet linked — one last step: activate it', 'good', 3000); setTimeout(() => void activate(r.activate!.address, r.activate!.feeCents), 350); }
      else { toast('Wallet linked — you can log in with it now 🎉', 'good', 3500); if (r.gift) setTimeout(() => void checkGifts(), 400); }
    };
    /** Link a new wallet: password accounts type their password in the picker; wallet-only accounts sign with a linked wallet first. */
    const connectWallet = async () => {
      let auth: Reauth | null = null;
      if (!info?.hasPassword) { auth = await reauth('link a new wallet'); if (!auth) return; }
      pickWallet({ title: 'Connect a wallet', intro: 'Choose the wallet to add. It will ask you to sign a short message that proves it’s yours (free).', hash: '#/profile', password: !!info?.hasPassword,
        run: async (w, password) => afterLink(await cloud.linkWallet(w, auth ?? { password })) });
    };
    /** Switch wallet: use another wallet — yours (connected), someone else's account (switch on purpose) or a new one (link). */
    const switchWallet = () => pickWallet({ title: 'Switch wallet', intro: 'Pick the wallet to use. If it’s linked to another Fuzzies account you’ll be asked before switching; a new wallet can be linked to this account.', hash: '#/profile',
      run: async (w) => {
        const r = await cloud.identifyWallet(w);
        if (r.linked?.same) { walletSession.set({ address: r.address, wallet: r.wallet }); toast(`Connected ${shortAddress(r.address)}`, 'good'); void reload(); return; }
        if (r.linked) { setTimeout(() => walletOnboard(r, (acc) => { toast(`Switched to @${acc.username}`, 'good'); location.hash = '#/home'; }), 250); return; }
        // not linked anywhere: offer to link it to this account
        setTimeout(async () => {
          if (!(await confirmDialog('Link this wallet?', `${shortAddress(r.address)} isn’t linked to any Fuzzies account yet. Link it to @${a.username} so it can sign you in?`, 'Link it', false))) return;
          const auth = await reauth('link a wallet');
          if (!auth) return;
          try { afterLink(await cloud.attachWallet(r, 'password' in auth ? auth.password : '', 'proof' in auth ? auth.proof : undefined)); } catch (e) { toast((e as Error).message, 'bad', 5000); }
        }, 250);
      } });
    const show = (x: LoginInfo) => {
      info = x;
      const now = walletSession.get();
      const emailRow = h('div', { class: 'acct-row' }, h('span', { class: 'acct-ic' }, icon('user', 20)),
        h('div', null, h('b', null, 'Email & password'), h('small', null, x.hasPassword ? x.email : 'Not set — add one so you can get back in without your wallet')),
        btn(x.hasPassword ? 'Change' : 'Add', { kind: x.hasPassword ? 'ghost' : 'primary', size: 'sm', onClick: () => credentialsModal(x) }));
      const rows = x.wallets.map((w) => {
        const connected = now?.address === w.address;
        return h('div', { class: `acct-row wallet ${w.active ? '' : 'inactive'} ${connected ? 'now' : ''}` },
          walletBadge({ name: w.wallet }),
          h('div', null,
            h('b', { title: w.address }, shortAddress(w.address), connected ? h('span', { class: 'wallet-pill on' }, 'Connected now') : null, w.active ? null : h('span', { class: 'wallet-pill' }, 'Not active yet')),
            h('small', null, `${w.wallet || 'Wallet'} · linked ${timeAgo(new Date(w.created_at).getTime())}${w.last_used_at ? ` · last log-in ${timeAgo(new Date(w.last_used_at).getTime())}` : ''}`)),
          w.active ? null : btn(`Activate · ${money(feeCents || 50)}`, { kind: 'primary', size: 'sm', onClick: () => void activate(w.address, feeCents || 50) }),
          connected ? btn('Disconnect', { kind: 'ghost', size: 'sm', title: 'Forget this wallet in this browser (it stays linked to your account)', onClick: () => { walletSession.clear(); toast('Wallet disconnected — it’s still linked to your account', 'info'); show(info!); } }) : null,
          btn(null, { icon: 'trash', kind: 'plain', size: 'sm', title: 'Remove this wallet as a way to log in', onClick: async () => {
            if (!x.hasPassword && x.wallets.length <= 1) { toast('This wallet is the only way into your account — add an email and password first.', 'info', 4500); return; }
            if (!(await confirmDialog('Remove this wallet?', `${shortAddress(w.address)} won’t be able to log in to your account any more. Nothing happens to the wallet itself or its funds. (Disconnect only forgets it in this browser.)`, 'Remove'))) return;
            const auth = await reauth('remove a wallet');
            if (!auth) return;
            try { await cloud.unlinkWallet(w.address, auth); toast('Wallet removed', 'good'); void reload(); } catch (e) { toast((e as Error).message, 'bad', 5000); }
          } }));
      });
      list.replaceChildren(emailRow, ...rows, ...(x.wallets.length ? [] : [h('p', { class: 'muted acct-none' }, 'No wallet linked yet.')]));
    };
    /** Add or change the email + password (re-authenticated). */
    const credentialsModal = (x: LoginInfo) => {
      const email = h('input', { class: 'input', type: 'email', autocomplete: 'email', placeholder: 'you@example.com', value: x.email });
      const pw = h('input', { class: 'input', type: 'password', autocomplete: 'new-password', placeholder: 'At least 6 characters' });
      const old = h('input', { class: 'input', type: 'password', autocomplete: 'current-password', placeholder: 'Current password' });
      const err = h('p', { class: 'form-err' });
      const go = btn(x.hasPassword ? 'Save' : 'Confirm with my wallet & save', { kind: 'primary', onClick: async () => {
        err.textContent = '';
        try {
          if (x.hasPassword) { await cloud.setCredentials(email.value, pw.value, { old: old.value }); m.close(); toast('Login details saved', 'good'); void reload(); render(); return; }
          if (!email.value || pw.value.length < 6) { err.textContent = 'Enter an email and a password of at least 6 characters.'; return; }
          m.close();
          pickWallet({ title: 'Confirm it’s you', intro: 'Sign once with a wallet linked to this account, then your email and password are saved.', hash: '#/profile',
            run: async (w) => { const r = await cloud.identifyWallet(w); if (!r.linked?.same) throw new Error('That wallet isn’t linked to this account.'); await cloud.setCredentials(email.value, pw.value, { proof: r.proof }); toast('Email and password added — you can log in with them too 🎉', 'good', 3500); void reload(); render(); } });
        } catch (e) { err.textContent = (e as Error).message; }
      } });
      const m = modal(x.hasPassword ? 'Change email or password' : 'Add an email & password', h('div', { class: 'acct-form' },
        x.hasPassword ? null : h('p', { class: 'muted' }, 'Right now only your wallet can open this account. An email and password are the way back in if you ever lose it.'),
        field('Email', email), field(x.hasPassword ? 'New password' : 'Password', pw), ...(x.hasPassword ? [field('Current password', old)] : []), err),
        { actions: [btn('Cancel', { kind: 'ghost', onClick: () => m.close() }), go] });
    };
    void reload();
    const now = walletSession.get();
    const lead = h('p', { class: 'muted' }, 'Every way into this account. Each one opens the same town, designs and Fuzzies.');
    void pay.config().then((c) => { if (c.walletFeeCents) lead.append(` New wallets are activated once for ${money(c.walletFeeCents)} — with a gift of ${c.walletGift} Fuzzies 🎁`); });
    return h('section', { class: 'card acct' }, h('h3', null, icon('lock', 18), ' Account & login'),
      h('div', { class: 'acct-who' }, avatarEl(a, 44), h('div', null, h('b', null, `@${a.username}`), h('small', null, now ? `Signed in with ${now.wallet || 'a wallet'} · ${shortAddress(now.address)}` : a.email ? `Signed in with ${a.email}` : 'Signed in'))),
      lead,
      list,
      h('div', { class: 'btn-row' },
        btn('Connect a wallet', { kind: 'soft', icon: 'plus', onClick: () => void connectWallet() }),
        btn('Switch wallet', { kind: 'ghost', icon: 'wallet', onClick: switchWallet })),
      walletSafetyNote());
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
        error: sync.error ? `Couldn’t sync: ${sync.error}` : 'Couldn’t sync just now — trying again soon',
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
