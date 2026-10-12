/** Welcome, sign up and log in. */
import type { Screen } from '../app';
import { accounts } from '../../core/account';
import { cloud } from '../../core/cloud';
import { applyTheme } from '../../core/themes';
import { h, btn, QUOTE, toast } from '../dom';
import { mascot } from '../mascot';
import { featureArt, type Feature } from '../featureArt';
import { pickWallet } from '../walletPicker';
import { checkGifts } from '../giftBox';

/** Log in: cloud accounts first; accounts that only live on this device (made before sync existed) still work. */
async function logIn(login: string, password: string): Promise<void> {
  if (!cloud.enabled) { await accounts.signIn(login, password); return; }
  const key = login.trim().toLowerCase();
  const local = accounts.list().find((a) => !a.cloud && (a.username === key || (!!a.email && a.email.toLowerCase() === key)));
  if (local && !key.includes('@')) { await accounts.signIn(login, password); return; }
  try {
    await cloud.signIn(login, password);
  } catch (e) {
    if (!local) throw e;
    await accounts.signIn(login, password);
  }
}

export function authScreen(mode: 'welcome' | 'login' | 'signup'): Screen {
  let tab: 'signup' | 'login' = mode === 'login' ? 'login' : 'signup';
  const card = h('div', { class: 'auth-card' });
  const err = h('p', { class: 'form-err', role: 'alert' });
  const note = h('p', { class: 'form-note', role: 'status' });
  const busy = (form: HTMLFormElement, on: boolean) => form.querySelectorAll('button').forEach((b) => (b.disabled = on));

  const field = (label: string, input: HTMLInputElement) => h('label', { class: 'field' }, h('span', null, label), input);

  function render(): void {
    err.textContent = '';
    if (tab === 'signup') note.textContent = '';
    const tabs = h('div', { class: 'seg seg-lg' },
      h('button', { type: 'button', class: tab === 'signup' ? 'on' : '', onclick: () => { tab = 'signup'; render(); } }, 'Create account'),
      h('button', { type: 'button', class: tab === 'login' ? 'on' : '', onclick: () => { tab = 'login'; render(); } }, 'Log in'));
    const form = h('form', { class: 'auth-form', novalidate: true });
    if (tab === 'signup') {
      const name = h('input', { class: 'input', autocomplete: 'name', placeholder: 'Sam Rivera', required: true });
      const user = h('input', { class: 'input', autocomplete: 'username', placeholder: 'sam_creates', required: true, autocapitalize: 'none' });
      const email = h('input', { class: 'input', type: 'email', autocomplete: 'email', placeholder: cloud.enabled ? 'you@example.com' : 'you@example.com (optional)' });
      const pw = h('input', { class: 'input', type: 'password', autocomplete: 'new-password', placeholder: 'At least 6 characters', required: true });
      form.append(field('Your name', name), field('Username', user), field('Email', email), field('Password', pw), err, note,
        btn('Create my account', { kind: 'primary', size: 'lg', class: 'btn-block' }));
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = { name: name.value, username: user.value, email: email.value, password: pw.value };
        err.textContent = '';
        busy(form, true);
        try {
          await (cloud.enabled ? cloud.signUp(input) : accounts.signUp(input));
          applyTheme();
          toast('Welcome to Fuzzies! Here are 10 Fuzzies to start 🎉', 'fuzzy', 3500);
          location.hash = '#/home';
        } catch (x) { err.textContent = (x as Error).message; } finally { busy(form, false); }
      });
    } else {
      const label = cloud.enabled ? 'Email' : 'Username or email';
      const user = h('input', { class: 'input', type: cloud.enabled ? 'email' : 'text', autocomplete: cloud.enabled ? 'email' : 'username', placeholder: cloud.enabled ? 'you@example.com' : 'Username or email', required: true, autocapitalize: 'none' });
      const pw = h('input', { class: 'input', type: 'password', autocomplete: 'current-password', placeholder: 'Password', required: true });
      const forgot = cloud.enabled ? h('button', { class: 'link small', type: 'button' }, 'Forgot your password?') : null;
      forgot?.addEventListener('click', () => {
        err.textContent = '';
        note.textContent = '';
        // a small "email me a link" box, pre-filled with the email typed above
        const mail = h('input', { class: 'input', type: 'email', autocomplete: 'email', placeholder: 'you@example.com', value: user.value.includes('@') ? user.value : '' });
        const msg = h('p', { class: 'auth-reset-msg', role: 'status' });
        const send = btn('Email me a reset link', { kind: 'soft', class: 'btn-block' });
        send.addEventListener('click', async () => {
          msg.className = 'auth-reset-msg';
          msg.textContent = '';
          send.disabled = true;
          try {
            await cloud.requestReset(mail.value);
            msg.classList.add('ok');
            msg.textContent = `If there's a Fuzzies account for ${mail.value.trim()}, a reset link is on its way. Check your inbox (and spam). The link works for 1 hour.`;
          } catch (x) { msg.classList.add('bad'); msg.textContent = (x as Error).message; } finally { send.disabled = false; }
        });
        const box = h('div', { class: 'auth-reset' }, h('b', null, 'Reset your password'), h('small', null, 'We’ll email you a link to choose a new one.'), mail, send, msg);
        forgot.replaceWith(box);
        mail.focus();
      });
      form.append(field(label, user), field('Password', pw), err, note, btn('Log in', { kind: 'primary', size: 'lg', class: 'btn-block' }), ...(forgot ? [forgot] : []));
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        err.textContent = '';
        busy(form, true);
        try {
          await logIn(user.value, pw.value);
          applyTheme();
          location.hash = '#/home';
          setTimeout(() => void checkGifts(), 900);
        } catch (x) { err.textContent = (x as Error).message; } finally { busy(form, false); }
      });
    }
    // make the submit buttons actually submit
    form.querySelectorAll('button.btn-primary').forEach((b) => b.setAttribute('type', 'submit'));
    const guest = h('button', { class: 'link', type: 'button' }, 'Just looking? Continue as a guest');
    guest.addEventListener('click', () => { accounts.guest(); applyTheme(); location.hash = '#/home'; });
    const wallet = cloud.enabled && tab === 'login'
      ? h('div', { class: 'auth-or' }, h('span', null, 'or'), btn('Continue with a wallet', { kind: 'ghost', icon: 'wallet', class: 'btn-block', onClick: () => pickWallet({
        title: 'Log in with a wallet',
        intro: 'Works with a wallet you’ve linked in your Profile. Your wallet will ask you to sign a short message — that’s all.',
        hash: '#/login',
        run: async (w) => { await cloud.signInWithWallet(w); applyTheme(); toast('Welcome back! 👋', 'good'); location.hash = '#/home'; setTimeout(() => void checkGifts(), 900); },
      }) }))
      : null;
    card.replaceChildren(tabs, form, ...(wallet ? [wallet] : []), h('div', { class: 'auth-alt' }, guest),
      h('p', { class: 'fine' }, cloud.enabled
        ? 'Your account, designs and Fuzzies are saved privately in your account — log in on any phone or computer.'
        : 'Your account, designs and Fuzzies are saved privately on this device.'));
  }
  render();

  const features: [Feature, string, string][] = [
    ['design', 'Design anything', 'Posters, posts, stories, slides, cards and more'],
    ['templates', 'Templates & stickers', 'Pro templates, graphics, fonts and text effects'],
    ['share', 'Share anywhere', 'Save to your phone or computer in one tap'],
    ['play', 'Play & unlock', 'Earn Fuzzies in Fuzzy Crossing and Fuzzies Land to unlock rewards'],
  ];
  // "Tickle me!" until someone does
  const tickleSpot = h('div', { class: 'auth-mascot' }, mascot(120), h('span', { class: 'auth-tickle' }, 'Tickle me! 🪶'));
  let rubbed = 0;
  tickleSpot.addEventListener('pointermove', () => { if (++rubbed > 25) tickleSpot.classList.add('tickled'); });
  tickleSpot.addEventListener('click', () => tickleSpot.classList.add('tickled'));

  const hero = h('div', { class: 'auth-hero' },
    h('div', { class: 'auth-blob b1' }), h('div', { class: 'auth-blob b2' }), h('div', { class: 'auth-blob b3' }),
    h('div', { class: 'auth-brand' },
      tickleSpot,
      h('h1', { class: 'auth-word' }, 'fuzzies'),
      h('p', { class: 'auth-quote' }, `“${QUOTE}”`)),
    h('ul', { class: 'auth-features' }, ...features.map(([k, t, s], i) => h('li', { style: `--i:${i}` }, featureArt(k), h('div', null, h('b', null, t), h('small', null, s))))));

  return { el: h('div', { class: 'auth' }, hero, h('div', { class: 'auth-side' }, card)) };
}

/** "Choose a new password" — opened from the link in a reset email (#/reset/<token>). */
export function resetScreen(resetToken: string): Screen {
  const pw = h('input', { class: 'input', type: 'password', autocomplete: 'new-password', placeholder: 'At least 6 characters', required: true });
  const pw2 = h('input', { class: 'input', type: 'password', autocomplete: 'new-password', placeholder: 'Type it again', required: true });
  const err = h('p', { class: 'form-err', role: 'alert' });
  const form = h('form', { class: 'auth-form' },
    h('label', { class: 'field' }, h('span', null, 'New password'), pw),
    h('label', { class: 'field' }, h('span', null, 'Confirm new password'), pw2),
    err,
    btn('Save my new password', { kind: 'primary', size: 'lg', class: 'btn-block' }));
  form.querySelector('button')!.setAttribute('type', 'submit');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    err.textContent = '';
    if (pw.value !== pw2.value) { err.textContent = 'The two passwords don’t match.'; return; }
    const b = form.querySelector('button')!;
    b.disabled = true;
    try {
      await cloud.resetPassword(resetToken, pw.value);
      applyTheme();
      toast('New password saved — you’re logged in 🎉', 'good', 3500);
      location.replace('#/home');
    } catch (x) { err.textContent = (x as Error).message; } finally { b.disabled = false; }
  });
  const card = h('div', { class: 'auth-card auth-reset-card' },
    h('div', { class: 'auth-reset-head' }, mascot(64, { sparkles: true }), h('div', null, h('h2', null, 'Choose a new password'), h('small', { class: 'muted' }, 'You’ll be logged in right after.'))),
    form,
    h('div', { class: 'auth-alt' }, h('a', { class: 'link', href: '#/login' }, 'Back to log in')));
  if (!cloud.enabled) card.replaceChildren(h('h2', null, 'Password reset isn’t available'), h('p', { class: 'muted' }, 'Accounts on this site are saved on each device.'), h('a', { class: 'link', href: '#/login' }, 'Back to log in'));
  return { el: h('div', { class: 'auth auth-solo' }, h('div', { class: 'auth-side' }, card)) };
}
