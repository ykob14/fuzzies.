/** Welcome, sign up and log in. */
import type { Screen } from '../app';
import { accounts } from '../../core/account';
import { applyTheme } from '../../core/themes';
import { h, btn, QUOTE, toast } from '../dom';
import { mascot } from '../mascot';

export function authScreen(mode: 'welcome' | 'login' | 'signup'): Screen {
  let tab: 'signup' | 'login' = mode === 'login' ? 'login' : 'signup';
  const card = h('div', { class: 'auth-card' });
  const err = h('p', { class: 'form-err', role: 'alert' });

  const field = (label: string, input: HTMLInputElement) => h('label', { class: 'field' }, h('span', null, label), input);

  function render(): void {
    err.textContent = '';
    const tabs = h('div', { class: 'seg seg-lg' },
      h('button', { type: 'button', class: tab === 'signup' ? 'on' : '', onclick: () => { tab = 'signup'; render(); } }, 'Create account'),
      h('button', { type: 'button', class: tab === 'login' ? 'on' : '', onclick: () => { tab = 'login'; render(); } }, 'Log in'));
    const form = h('form', { class: 'auth-form', novalidate: true });
    if (tab === 'signup') {
      const name = h('input', { class: 'input', autocomplete: 'name', placeholder: 'Sam Rivera', required: true });
      const user = h('input', { class: 'input', autocomplete: 'username', placeholder: 'sam_creates', required: true, autocapitalize: 'none' });
      const email = h('input', { class: 'input', type: 'email', autocomplete: 'email', placeholder: 'you@example.com (optional)' });
      const pw = h('input', { class: 'input', type: 'password', autocomplete: 'new-password', placeholder: 'At least 6 characters', required: true });
      form.append(field('Your name', name), field('Username', user), field('Email', email), field('Password', pw), err,
        btn('Create my account', { kind: 'primary', size: 'lg', class: 'btn-block' }));
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          await accounts.signUp({ name: name.value, username: user.value, email: email.value, password: pw.value });
          applyTheme();
          toast('Welcome to Fuzzies! Here are 10 Fuzzies to start 🎉', 'fuzzy', 3500);
          location.hash = '#/home';
        } catch (x) { err.textContent = (x as Error).message; }
      });
    } else {
      const user = h('input', { class: 'input', autocomplete: 'username', placeholder: 'Username or email', required: true, autocapitalize: 'none' });
      const pw = h('input', { class: 'input', type: 'password', autocomplete: 'current-password', placeholder: 'Password', required: true });
      form.append(field('Username or email', user), field('Password', pw), err, btn('Log in', { kind: 'primary', size: 'lg', class: 'btn-block' }));
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          await accounts.signIn(user.value, pw.value);
          applyTheme();
          location.hash = '#/home';
        } catch (x) { err.textContent = (x as Error).message; }
      });
    }
    // make the submit buttons actually submit
    form.querySelectorAll('button.btn-primary').forEach((b) => b.setAttribute('type', 'submit'));
    const guest = h('button', { class: 'link', type: 'button' }, 'Just looking? Continue as a guest');
    guest.addEventListener('click', () => { accounts.guest(); applyTheme(); location.hash = '#/home'; });
    card.replaceChildren(tabs, form, h('div', { class: 'auth-alt' }, guest),
      h('p', { class: 'fine' }, 'Your account, designs and Fuzzies are saved privately on this device.'));
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
