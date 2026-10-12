/**
 * What happens after a wallet signs in and isn't simply "linked to you":
 * - not linked to any account → create a new Fuzzies account with it (optionally with an email + password too, and
 *   bringing this device's guest progress along), or link it to an account you log in to with email + password;
 * - linked to a different account than the one this device is signed in to → warn, save, then switch on purpose.
 * Nothing is ever merged or switched silently.
 */
import { h, btn, modal, toast, type ModalHandle } from './dom';
import { accounts, type Account } from '../core/account';
import { cloud, type WalletResult } from '../core/cloud';
import { shortAddress } from '../core/wallet';
import { walletBadge } from './walletPicker';

const field = (label: string, input: HTMLElement, hint?: string) => h('label', { class: 'field' }, h('span', null, label), input, hint ? h('small', { class: 'muted' }, hint) : null);

export function walletOnboard(r: WalletResult, onDone: (a: Account) => void): void {
  const me = accounts.current;
  const who = h('div', { class: 'wo-wallet' }, walletBadge({ name: r.wallet || 'Wallet' }), h('div', null, h('b', null, shortAddress(r.address)), h('small', null, r.wallet || 'Wallet')));
  const err = h('p', { class: 'form-err', role: 'alert' });
  let m: ModalHandle;
  const run = async (b: HTMLButtonElement, fn: () => Promise<Account>) => {
    err.textContent = '';
    b.disabled = true;
    m.el.dataset.busy = 'true';
    try { const a = await fn(); m.close(); onDone(a); }
    catch (e) { err.textContent = (e as Error).message; }
    finally { b.disabled = false; m.el.dataset.busy = 'false'; }
  };

  // ---- linked to someone else while this device is signed in: a deliberate switch ----
  if (r.linked && !r.linked.same) {
    const other = r.linked.username;
    const go = btn(`Switch to @${other}`, { kind: 'primary', class: 'btn-block' });
    go.addEventListener('click', () => void run(go, () => cloud.switchToWallet(r)));
    if (!r.linked.active) go.replaceWith(h('p', { class: 'form-err' }, `This wallet isn’t activated for @${other} yet — log in to that account another way and activate it there first.`));
    m = modal('This wallet belongs to another account', h('div', { class: 'wo' }, who,
      h('p', null, `${shortAddress(r.address)} is linked to `, h('b', null, `@${other}`), `. You’re signed in as `, h('b', null, `@${me?.username ?? 'guest'}`), '.'),
      h('p', { class: 'muted' }, me?.cloud
        ? `Switching saves @${me.username}’s latest changes first, then opens @${other}’s town, designs and Fuzzies. The two accounts are never mixed.`
        : `Switching opens @${other}’s town, designs and Fuzzies. What you did as a guest stays on this device and is not merged.`),
      err, go, btn('Stay here', { kind: 'ghost', class: 'btn-block', onClick: () => m.close() })));
    return;
  }

  // ---- not linked yet: create a new account with it, or link it to an existing one ----
  let tab: 'new' | 'link' = me && !me.cloud ? 'new' : 'new';
  const body = h('div', { class: 'wo' });
  const suggested = `fuzzy_${r.address.slice(-4)}`;
  const guestish = !!me && !me.cloud;
  const hasProgress = !!me && (me.totalFuzzies > 10 || me.stats.designs > 0 || me.land.stats.built > 0 || me.land.level > 1);
  function render(): void {
    err.textContent = '';
    const seg = h('div', { class: 'seg' },
      h('button', { type: 'button', class: tab === 'new' ? 'on' : '', onclick: () => { tab = 'new'; render(); } }, 'New account'),
      h('button', { type: 'button', class: tab === 'link' ? 'on' : '', onclick: () => { tab = 'link'; render(); } }, 'I have an account'));
    const form = h('form', { class: 'auth-form', novalidate: true });
    if (tab === 'new') {
      const name = h('input', { class: 'input', autocomplete: 'name', placeholder: 'Sam Rivera', value: guestish && me!.name !== 'Guest' ? me!.name : '' });
      const user = h('input', { class: 'input', autocomplete: 'username', autocapitalize: 'none', placeholder: suggested, value: guestish && !me!.guest ? me!.username : suggested });
      const email = h('input', { class: 'input', type: 'email', autocomplete: 'email', placeholder: 'you@example.com' });
      const pw = h('input', { class: 'input', type: 'password', autocomplete: 'new-password', placeholder: 'At least 6 characters' });
      const extra = h('div', { class: 'wo-extra', hidden: true }, field('Email', email), field('Password', pw, 'So you can also log in without the wallet — and get back in if you ever lose it.'));
      const more = h('button', { type: 'button', class: 'link small' }, '+ Also add an email & password (recommended)');
      more.addEventListener('click', () => { extra.hidden = !extra.hidden; more.textContent = extra.hidden ? '+ Also add an email & password (recommended)' : '− Skip the email & password for now'; if (!extra.hidden) email.focus(); });
      const keep = h('input', { type: 'checkbox', checked: true });
      const keepRow = guestish && hasProgress ? h('label', { class: 'wo-keep' }, keep, h('span', null, `Bring my ${me!.guest ? 'guest' : 'on-device'} progress along (${me!.fuzzies} Fuzzies, level ${me!.land.level} town, ${me!.stats.designs} design${me!.stats.designs === 1 ? '' : 's'})`)) : null;
      const go = btn('Create my account', { kind: 'primary', size: 'lg', class: 'btn-block' });
      form.append(field('Your name', name), field('Username', user), more, extra, ...(keepRow ? [keepRow] : []), err, go);
      form.addEventListener('submit', (e) => { e.preventDefault(); void run(go, () => cloud.signUpWithWallet(r, { username: user.value, name: name.value, email: extra.hidden ? '' : email.value, password: extra.hidden ? '' : pw.value, keep: !!keepRow && keep.checked })); });
    } else {
      const email = h('input', { class: 'input', type: 'email', autocomplete: 'email', placeholder: 'you@example.com', required: true });
      const pw = h('input', { class: 'input', type: 'password', autocomplete: 'current-password', placeholder: 'Password', required: true });
      const go = btn('Log in & link this wallet', { kind: 'primary', size: 'lg', class: 'btn-block' });
      form.append(h('p', { class: 'muted' }, 'Log in with your email and password; the wallet is then linked to that account and can sign you in next time.'), field('Email', email), field('Password', pw), err, go);
      form.addEventListener('submit', (e) => { e.preventDefault(); void run(go, async () => {
        const a = await cloud.signIn(email.value, pw.value);
        try { await cloud.attachWallet(r, pw.value); toast(`Wallet linked to @${a.username} 🎉`, 'good', 3000); }
        catch (x) { toast((x as Error).message, 'bad', 5000); }
        return a;
      }); });
    }
    form.querySelectorAll('button.btn-primary').forEach((b) => b.setAttribute('type', 'submit'));
    body.replaceChildren(who, h('p', { class: 'muted' }, 'This wallet isn’t linked to a Fuzzies account yet. It signed in fine — now choose:'), seg, form);
  }
  render();
  m = modal('New wallet — welcome!', body);
}
