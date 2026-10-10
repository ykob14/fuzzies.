/** Welcome, sign up and log in. */
import type { Screen } from '../app';
import { accounts } from '../../core/account';
import { cloud, CheckEmail } from '../../core/cloud';
import { applyTheme } from '../../core/themes';
import { h, btn, QUOTE, toast } from '../dom';
import { mascot } from '../mascot';

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
        } catch (x) {
          if (x instanceof CheckEmail) { tab = 'login'; render(); note.textContent = x.message; }
          else err.textContent = (x as Error).message;
        } finally { busy(form, false); }
      });
    } else {
      const label = cloud.enabled ? 'Email' : 'Username or email';
      const user = h('input', { class: 'input', type: cloud.enabled ? 'email' : 'text', autocomplete: cloud.enabled ? 'email' : 'username', placeholder: cloud.enabled ? 'you@example.com' : 'Username or email', required: true, autocapitalize: 'none' });
      const pw = h('input', { class: 'input', type: 'password', autocomplete: 'current-password', placeholder: 'Password', required: true });
      const forgot = cloud.enabled ? h('button', { class: 'link small', type: 'button' }, 'Forgot your password?') : null;
      forgot?.addEventListener('click', async () => {
        err.textContent = '';
        try { await cloud.sendReset(user.value); note.textContent = `We sent a reset link to ${user.value.trim()}. Tap it to choose a new password.`; } catch (x) { err.textContent = (x as Error).message; }
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
        } catch (x) { err.textContent = (x as Error).message; } finally { busy(form, false); }
      });
    }
    // make the submit buttons actually submit
    form.querySelectorAll('button.btn-primary').forEach((b) => b.setAttribute('type', 'submit'));
    const guest = h('button', { class: 'link', type: 'button' }, 'Just looking? Continue as a guest');
    guest.addEventListener('click', () => { accounts.guest(); applyTheme(); location.hash = '#/home'; });
    card.replaceChildren(tabs, form, h('div', { class: 'auth-alt' }, guest),
      h('p', { class: 'fine' }, cloud.enabled
        ? 'Your account, designs and Fuzzies are saved privately in your account — log in on any phone or computer.'
        : 'Your account, designs and Fuzzies are saved privately on this device.'));
  }
  render();

  const features = [
    ['🎨', 'Design anything', 'Posters, posts, stories, slides, cards and more'],
    ['✨', 'Templates & stickers', 'Pro templates, graphics, fonts and text effects'],
    ['📲', 'Share anywhere', 'Save to your phone or computer in one tap'],
    ['🐸', 'Play & unlock', 'Collect Fuzzies in Fuzzy Crossing to unlock rewards'],
  ];
  const hero = h('div', { class: 'auth-hero' },
    h('div', { class: 'auth-blob b1' }), h('div', { class: 'auth-blob b2' }), h('div', { class: 'auth-blob b3' }),
    h('div', { class: 'auth-brand' },
      h('div', { class: 'auth-mascot' }, mascot(120)),
      h('h1', { class: 'auth-word' }, 'fuzzies'),
      h('p', { class: 'auth-quote' }, `“${QUOTE}”`)),
    h('ul', { class: 'auth-features' }, ...features.map(([e, t, s]) => h('li', null, h('span', { class: 'af-ic' }, e), h('div', null, h('b', null, t), h('small', null, s))))));

  return { el: h('div', { class: 'auth' }, hero, h('div', { class: 'auth-side' }, card)) };
}
