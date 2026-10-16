/**
 * The Fuzzy assistant: a small sky-blue Fuzzy (the owner's own picture) that lives in a corner of every screen and opens a chat window.
 * Photo frames give it eyes that blink, a wink and talking mouths; a thinking and a listening pose come from CSS;
 * CSS does the bouncing, waving and listening pulse. Answers come from `core/assistant.ts` (Claude on the server with the site
 * guide, or the built-in guide when AI is off — each answer says which). Optional voice: the browser's speech synthesis, pitched up
 * and friendly, with a synthesised giggle for the "hehe"s; the microphone button uses the browser's speech recognition when it has one.
 * Mounted once at app level (ui/app.ts) and placed per screen with CSS so it never covers buttons.
 */
import { h, icon, popMenu, toast } from './dom';
import { assistant, type Msg } from '../core/assistant';
import { accounts } from '../core/account';
import { sfx } from '../game/sound';
export type AssistFace = 'open' | 'wink' | 'blink' | 'giggle' | 'talkA' | 'talkB' | 'think' | 'listen';
export type AssistFrames = Record<AssistFace, string>;

/** Screens where the helper never shows (the owner's choice: website only, not the play areas). */
const PLAY_SCREENS = new Set(['play', 'land']);

// The helper is the owner's own Fuzzy picture in sky blue (public/art/helper): open, wink, blink and two talking mouths.
const PIC = (n: string) => `/art/helper/${n}.webp`;
const frames: AssistFrames = {
  open: PIC('open'), wink: PIC('wink'), blink: PIC('blink'), giggle: PIC('wink'),
  talkA: PIC('talkA'), talkB: PIC('talkB'), think: PIC('open'), listen: PIC('open'),
};
const real = true; // the picture never swaps for a rendered model
const faces = new Set<{ img: HTMLImageElement; face: AssistFace }>();
function loadFrames(): void {
  Object.values(frames).forEach((src) => { const i = new Image(); i.src = src; }); // so face swaps never flicker
}

/** A blue Fuzzy face that can be told what to do: idle blinking, talking, thinking, listening, a wave or a cheer. */
function fuzzyFace(size: number) {
  const img = h('img', { class: 'fza-img', src: frames.open, alt: '', draggable: 'false' });
  const st = { img, face: 'open' as AssistFace };
  faces.add(st);
  const el = h('div', { class: `fza ${real ? 'real' : ''}`, style: `--s:${size}px`, 'aria-hidden': 'true' },
    h('div', { class: 'fza-shadow' }), h('div', { class: 'fza-body' }, img));
  let mode: 'idle' | 'talk' | 'think' | 'listen' = 'idle';
  let timer = 0;
  const set = (f: AssistFace) => { st.face = f; img.src = frames[f]; };
  const stopTimer = () => { clearTimeout(timer); timer = 0; };
  const idle = () => {
    stopTimer();
    if (mode !== 'idle') return;
    const r = Math.random();
    set(r < 0.18 ? 'wink' : 'blink');
    timer = window.setTimeout(() => { if (mode === 'idle') { set('open'); timer = window.setTimeout(idle, 2200 + Math.random() * 3800); } }, r < 0.18 ? 600 : 140);
  };
  const talk = () => {
    stopTimer();
    if (mode !== 'talk') return;
    const seq: AssistFace[] = ['talkA', 'open', 'talkB', 'talkA', 'open'];
    set(seq[Math.floor(Math.random() * seq.length)]);
    timer = window.setTimeout(talk, 110 + Math.random() * 90);
  };
  const api = {
    el,
    mode(m: typeof mode) {
      if (document.documentElement.dataset.motion === 'reduce' && m !== 'idle') { set(m === 'think' ? 'think' : 'open'); mode = m; return; }
      mode = m;
      el.classList.toggle('talking', m === 'talk');
      el.classList.toggle('thinking', m === 'think');
      el.classList.toggle('listening', m === 'listen');
      stopTimer();
      if (m === 'talk') talk();
      else if (m === 'think') set('think');
      else if (m === 'listen') set('listen');
      else { set('open'); timer = window.setTimeout(idle, 1500 + Math.random() * 2000); }
    },
    do(move: 'wave' | 'cheer' | 'giggle' | 'wink') {
      if (document.documentElement.dataset.motion === 'reduce') return;
      el.classList.remove('wave', 'cheer');
      void el.offsetWidth;
      if (move === 'wave') { el.classList.add('wave'); set('wink'); setTimeout(() => { if (mode === 'idle') set('open'); }, 900); }
      else if (move === 'cheer') { el.classList.add('cheer'); set('giggle'); setTimeout(() => { if (mode === 'idle') set('open'); }, 900); }
      else if (move === 'giggle') { set('giggle'); el.classList.add('cheer'); setTimeout(() => { el.classList.remove('cheer'); if (mode === 'idle') set('open'); }, 700); }
      else { set('wink'); setTimeout(() => { if (mode === 'idle') set('open'); }, 600); }
    },
    sparkle() {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + Math.random() * 0.6, d = 0.6 + Math.random() * 0.3;
        const s = h('span', { class: 'fza-spark', style: `--dx:${(Math.cos(a) * d).toFixed(2)};--dy:${(Math.sin(a) * d - 0.2).toFixed(2)}` });
        el.append(s);
        setTimeout(() => s.remove(), 900);
      }
    },
  };
  api.mode('idle');
  return api;
}

// ---------- voice ----------
type Rec = { lang: string; interimResults: boolean; continuous: boolean; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null; onend: (() => void) | null; onerror: (() => void) | null; start(): void; stop(): void; abort(): void };
const Recognition = (window as Window & { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec }).SpeechRecognition
  ?? (window as Window & { webkitSpeechRecognition?: new () => Rec }).webkitSpeechRecognition;

let chosenVoice: SpeechSynthesisVoice | null | undefined;
function pickVoice(): SpeechSynthesisVoice | null {
  if (chosenVoice !== undefined) return chosenVoice;
  const all = speechSynthesis.getVoices();
  if (!all.length) return null; // not loaded yet: try again next time
  const lang = navigator.language || 'en';
  const likes = ['Samantha', 'Google UK English Female', 'Microsoft Zira', 'Microsoft Aria', 'Karen', 'Moira', 'Tessa', 'Victoria', 'Google US English', 'Female'];
  const mine = all.filter((v) => v.lang.toLowerCase().startsWith(lang.slice(0, 2).toLowerCase()));
  const pool = mine.length ? mine : all;
  chosenVoice = likes.map((n) => pool.find((v) => v.name.includes(n))).find(Boolean) ?? pool.find((v) => v.default) ?? pool[0] ?? null;
  return chosenVoice;
}
const soundOn = () => accounts.current?.settings.sound !== false;

/** Say a reply out loud in Fuzzy's voice: giggles become the synthesised giggle, markdown and links are dropped. */
function speak(text: string, onStart: () => void, onEnd: () => void): void {
  if (!('speechSynthesis' in window)) { onEnd(); return; }
  speechSynthesis.cancel();
  const giggles = /\b(he ?he(he)*|tee ?hee+|ha ?ha(ha)*)\b[!.]?/gi;
  const plain = text.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[*_`#>]/g, '').replace(giggles, '').replace(/\s+/g, ' ').trim();
  const hadGiggle = giggles.test(text);
  const u = new SpeechSynthesisUtterance(plain);
  const v = pickVoice();
  if (v) u.voice = v;
  u.pitch = 1.45; u.rate = 1.04; u.volume = 1;
  u.onstart = onStart;
  u.onend = onEnd; u.onerror = onEnd;
  const start = () => { if (plain) speechSynthesis.speak(u); else onEnd(); };
  if (hadGiggle && soundOn()) { onStart(); const d = sfx.giggle(); setTimeout(start, Math.min(1400, d * 1000 * 0.7)); } else start();
}

// ---------- tiny markdown (bold, bullets, app links) → DOM, never innerHTML ----------
function md(text: string): HTMLElement {
  const box = h('div', { class: 'fzc-md' });
  const inline = (s: string): (Node | string)[] => {
    const out: (Node | string)[] = [];
    const re = /\*\*([^*]+)\*\*|\[([^\]]+)\]\((#\/[a-z]+)\)/g;
    let i = 0, m: RegExpExecArray | null;
    while ((m = re.exec(s))) {
      if (m.index > i) out.push(s.slice(i, m.index));
      if (m[1]) out.push(h('b', null, m[1]));
      else out.push(h('a', { class: 'fzc-link', href: m[3], onclick: () => { if (innerWidth <= 760) ui?.close(); } }, m[2], icon('chevR', 14)));
      i = m.index + m[0].length;
    }
    if (i < s.length) out.push(s.slice(i));
    return out;
  };
  let list: HTMLElement | null = null;
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) { list = null; continue; }
    const bullet = /^(?:[-•*]|\d+[.)])\s+(.*)$/.exec(line);
    if (bullet) {
      if (!list) { list = h(/^\d/.test(line) ? 'ol' : 'ul'); box.append(list); }
      list.append(h('li', null, ...inline(bullet[1])));
    } else { list = null; box.append(h('p', null, ...inline(line))); }
  }
  return box;
}

// ---------- the component ----------
interface Ui { root: HTMLElement; open(): void; close(): void; toggle(): void }
let ui: Ui | null = null;

export function mountAssistant(): void {
  if (ui) return;
  loadFrames();
  const big = fuzzyFace(64);
  const mini = fuzzyFace(40);
  const label = h('button', { class: 'fzc-hello', type: 'button', hidden: 'true' }, 'Hi! Need a hand? ', h('b', null, 'Ask me'));
  const launcher = h('button', { class: 'fzc-launch', type: 'button', 'aria-label': 'Ask Fuzzy, the helper', 'aria-expanded': 'false', title: 'Ask Fuzzy' }, big.el);

  const status = h('small', { class: 'fzc-status' }, 'Here to help');
  const voiceBtn = h('button', { class: 'fzc-ib', type: 'button', title: 'Voice replies' });
  const minBtn = h('button', { class: 'fzc-ib', type: 'button', title: 'Minimize', 'aria-label': 'Minimize' }, icon('minimize', 18));
  const moreBtn = h('button', { class: 'fzc-ib', type: 'button', title: 'More', 'aria-label': 'More options' }, icon('more', 18));
  const head = h('div', { class: 'fzc-head' }, mini.el, h('div', { class: 'fzc-who' }, h('b', null, 'Fuzzy'), status), h('div', { class: 'fzc-hb' }, voiceBtn, moreBtn, minBtn));
  const log = h('div', { class: 'fzc-log', role: 'log', 'aria-live': 'polite' });
  const chips = h('div', { class: 'fzc-chips' });
  const input = h('textarea', { class: 'fzc-input', rows: '1', placeholder: 'Ask me anything…', 'aria-label': 'Your question', maxlength: '1500' });
  const micBtn = h('button', { class: 'fzc-ib fzc-mic', type: 'button', title: 'Speak your question', 'aria-label': 'Speak your question' }, icon('mic', 18));
  const sendBtn = h('button', { class: 'fzc-send', type: 'button', title: 'Send', 'aria-label': 'Send' }, icon('send', 18));
  const foot = h('div', { class: 'fzc-foot' }, h('small', null, 'Fuzzy is a helper and can slip up — double-check anything important.'));
  const panel = h('section', { class: 'fzc-panel', role: 'dialog', 'aria-label': 'Fuzzy, the Fuzzies helper', hidden: 'true' },
    head, log, chips, h('div', { class: 'fzc-row' }, input, micBtn, sendBtn), foot);
  const root = h('div', { class: 'fz-assist' }, panel, label, launcher);
  document.body.append(root);

  let open = false, busy = false, talkingTimer = 0, listening = false, rec: Rec | null = null;
  /** The owner wants Fuzzy on the website only — never in the play areas (Fuzzy Crossing, Fuzzies Land). */
  const inPlayArea = () => PLAY_SCREENS.has(assistant.screen);
  const paintPrefs = () => {
    const p = assistant.prefs;
    const away = inPlayArea();
    root.hidden = p.hidden || away;
    if (away && open) api.close();
    voiceBtn.replaceChildren(icon(p.voice ? 'sound' : 'mute', 18));
    voiceBtn.classList.toggle('on', p.voice);
    voiceBtn.title = p.voice ? 'Voice replies on — tap to mute' : 'Voice replies off — tap to hear Fuzzy';
    voiceBtn.setAttribute('aria-pressed', String(p.voice));
    if (p.seen || open || away) label.hidden = true; // shown once, by the timer below
    if (!Recognition) micBtn.hidden = true;
  };

  const scroll = () => { log.scrollTop = log.scrollHeight; };
  const bubble = (m: Msg, reveal = false): HTMLElement => {
    const who = m.role === 'user' ? 'you' : m.kind;
    const b = h('div', { class: `fzc-msg is-${m.role} k-${m.kind}` });
    if (m.role === 'assistant') {
      b.append(h('div', { class: 'fzc-ava' }, h('img', { src: frames.open, alt: '', class: real ? 'real' : '' })));
    }
    const body = h('div', { class: 'fzc-bubble' });
    if (m.kind === 'guide' && m.role === 'assistant') body.append(h('span', { class: 'fzc-tag' }, 'From the built-in guide · not AI'));
    if (reveal) body.append(h('p', { class: 'fzc-typing' }, '')); else body.append(m.role === 'user' ? h('p', null, m.text) : md(m.text));
    b.append(body);
    b.dataset.who = who;
    return b;
  };
  const render = () => {
    log.replaceChildren(...assistant.messages.map((m) => bubble(m)));
    scroll();
  };
  const paintChips = () => {
    const list = assistant.suggestions().slice(0, assistant.messages.some((m) => m.role === 'user') ? 2 : 4); // fewer once you're chatting
    chips.replaceChildren(...list.map((q) => h('button', { class: 'fzc-chip', type: 'button', onclick: () => void send(q) }, q)));
    chips.hidden = !list.length || busy;
  };
  const setStatus = (t: string) => { status.textContent = t; };
  const stopTalking = () => {
    clearTimeout(talkingTimer);
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    big.mode('idle'); mini.mode('idle');
    if (!busy) setStatus(assistant.aiKnown === false ? 'Built-in guide (free mode)' : 'Here to help');
  };

  /** Type the answer out while Fuzzy "talks", then swap in the formatted text. */
  const reveal = (m: Msg) => {
    const b = bubble(m, true);
    log.append(b);
    const p = b.querySelector<HTMLElement>('.fzc-typing')!;
    const plain = m.text.replace(/\*\*/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
    const reduce = document.documentElement.dataset.motion === 'reduce';
    const perTick = reduce ? plain.length : Math.max(2, Math.round(plain.length / 60));
    let i = 0;
    big.mode('talk'); mini.mode('talk');
    setStatus(m.kind === 'ai' ? 'Talking…' : 'Reading from the guide…');
    const voiced = assistant.prefs.voice && m.kind === 'ai';
    let spoken = !voiced;
    if (voiced) speak(m.text, () => { big.mode('talk'); mini.mode('talk'); }, () => { spoken = true; if (i >= plain.length) stopTalking(); });
    const step = () => {
      i = Math.min(plain.length, i + perTick);
      p.textContent = plain.slice(0, i);
      // follow the typing, but never past the top of the answer (a long one used to end scrolled to its last line)
      log.scrollTop = Math.min(log.scrollHeight, Math.max(0, b.offsetTop - log.offsetTop - 8));
      if (b.offsetHeight < log.clientHeight) scroll();
      if (i < plain.length) { talkingTimer = window.setTimeout(step, 28); return; }
      p.replaceWith(md(m.text));
      if (spoken) stopTalking(); else setStatus('Talking…');
    };
    step();
  };

  const send = async (text: string) => {
    const t = text.trim();
    if (!t || busy) return;
    busy = true;
    input.value = ''; autosize();
    chips.hidden = true;
    sendBtn.disabled = true;
    stopTalking();
    try {
      const before = assistant.messages.length;
      const ask = assistant.ask(t);
      // the question shows at once; Fuzzy thinks while the answer comes
      log.append(bubble(assistant.messages[before]));
      const dots = h('div', { class: 'fzc-msg is-assistant' }, h('div', { class: 'fzc-ava' }, h('img', { src: frames.think, alt: '' })), h('div', { class: 'fzc-bubble fzc-dots' }, h('i'), h('i'), h('i')));
      log.append(dots); scroll();
      big.mode('think'); mini.mode('think'); setStatus('Thinking…');
      const m = await ask;
      dots.remove();
      busy = false;
      reveal(m);
      if (/\bhe ?he\b|tee ?hee/i.test(m.text)) big.do('giggle');
    } catch (e) {
      busy = false;
      log.querySelector('.fzc-dots')?.closest('.fzc-msg')?.remove();
      const why = e instanceof Error ? e.message : 'Something went wrong — please try again.';
      log.append(bubble({ role: 'assistant', text: why, kind: 'note', at: Date.now() }));
      scroll();
      stopTalking();
    } finally {
      sendBtn.disabled = false;
      paintChips();
      if (innerWidth > 760) input.focus();
    }
  };

  const autosize = () => { input.style.height = 'auto'; input.style.height = Math.min(120, input.scrollHeight) + 'px'; };
  input.addEventListener('input', autosize);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(input.value); }
    if (e.key === 'Escape') api.close();
  });
  sendBtn.addEventListener('click', () => void send(input.value));

  // ---- microphone ----
  const stopListening = () => {
    listening = false;
    micBtn.classList.remove('on');
    big.mode('idle'); mini.mode('idle');
    setStatus('Here to help');
    rec?.abort(); rec = null;
  };
  micBtn.addEventListener('click', () => {
    if (!Recognition) return;
    if (listening) { const v = input.value; stopListening(); if (v.trim()) void send(v); return; }
    try {
      rec = new Recognition();
      rec.lang = navigator.language || 'en-US';
      rec.interimResults = true; rec.continuous = false;
      let final = '';
      rec.onresult = (e) => {
        let text = '';
        for (let i = 0; i < e.results.length; i++) { text += e.results[i][0].transcript; if (e.results[i].isFinal) final = text; }
        input.value = text; autosize();
      };
      rec.onend = () => { const v = final || input.value; stopListening(); if (v.trim()) void send(v); };
      rec.onerror = () => { stopListening(); toast('I couldn’t hear you — check the microphone permission.', 'info'); };
      rec.start();
      listening = true;
      micBtn.classList.add('on');
      big.mode('listen'); mini.mode('listen');
      setStatus('Listening…');
    } catch { stopListening(); toast('Voice input isn’t available in this browser.', 'info'); }
  });

  // ---- header buttons ----
  voiceBtn.addEventListener('click', () => {
    const on = !assistant.prefs.voice;
    assistant.setPrefs({ voice: on });
    if (!on) stopTalking(); else if ('speechSynthesis' in window) { speechSynthesis.getVoices(); speak('Voice on! hehe', () => { big.mode('talk'); mini.mode('talk'); }, stopTalking); }
    else toast('This browser has no speech voices.', 'info');
  });
  minBtn.addEventListener('click', () => api.close());
  moreBtn.addEventListener('click', () => popMenu(moreBtn, [
    { label: 'Clear this chat', icon: 'trash', onClick: () => { assistant.clear(); greet(); render(); paintChips(); } },
    { label: 'Hide Fuzzy', icon: 'eyeOff', onClick: () => { api.close(); assistant.setPrefs({ hidden: true }); toast('Fuzzy is hidden. Bring it back in Settings → Fuzzy helper.', 'info', 4000); } },
  ]));

  const greet = () => {
    if (assistant.messages.length) return;
    const a = accounts.current;
    const name = a && !a.guest ? `, ${a.name.split(' ')[0] || a.username}` : '';
    const where: Record<string, string> = {
      home: 'What shall we make today?', templates: 'Looking for a template? Tell me the occasion.', projects: 'These are your designs. Need help organising or sharing one?',
      edit: 'I can explain any tool in the editor.', play: 'Ready to hop? Ask me about the game.', land: 'Welcome to your town! Ask me how anything here works.',
      rewards: 'Ask me how to earn or spend Fuzzies.', profile: 'Questions about your account, wallets or sync?', settings: 'I can help you find any setting.',
      welcome: 'New here? I can explain what Fuzzies is and how accounts work.', login: 'Trouble logging in? Ask me.', signup: 'Signing up? Ask me anything first.',
    };
    assistant.note(`Hi${name}! I’m Fuzzy. ${where[assistant.screen] ?? 'How can I help?'}`);
  };

  const api: Ui = {
    root,
    open() {
      if (open) return;
      open = true;
      panel.hidden = false;
      root.classList.add('open');
      launcher.setAttribute('aria-expanded', 'true');
      assistant.setPrefs({ seen: true });
      greet();
      render();
      paintChips();
      void assistant.aiAvailable().then((on) => { if (!busy) setStatus(on ? 'Here to help' : 'Built-in guide (free mode)'); });
      big.do('wave'); mini.do('wave');
      if (soundOn()) sfx.wink();
      if (innerWidth > 760) setTimeout(() => input.focus(), 50);
    },
    close() {
      if (!open) return;
      open = false;
      stopTalking();
      if (listening) stopListening();
      root.classList.remove('open');
      root.style.removeProperty('--fz-kb'); root.style.removeProperty('--fz-vvh');
      launcher.setAttribute('aria-expanded', 'false');
      setTimeout(() => { if (!open) panel.hidden = true; }, 220);
    },
    toggle() { if (open) api.close(); else api.open(); },
  };
  ui = api;
  // phones: when the keyboard opens, iOS keeps the page the same size and slides the keyboard over it. Follow the *visible*
  // area so the chat sits on top of the keyboard and keeps its shape instead of jumping or being covered.
  const vv = window.visualViewport;
  const fitKeyboard = () => {
    if (!vv || !open || innerWidth > 760) { root.style.removeProperty('--fz-kb'); root.style.removeProperty('--fz-vvh'); return; }
    const kb = Math.max(0, Math.round(innerHeight - vv.height - vv.offsetTop));
    root.style.setProperty('--fz-kb', `${kb}px`);
    root.style.setProperty('--fz-vvh', `${Math.round(vv.height)}px`);
    log.scrollTop = log.scrollHeight;
  };
  vv?.addEventListener('resize', fitKeyboard);
  vv?.addEventListener('scroll', fitKeyboard);
  input.addEventListener('focus', () => { setTimeout(fitKeyboard, 60); setTimeout(fitKeyboard, 350); });
  input.addEventListener('blur', () => setTimeout(fitKeyboard, 60));
  // phones: tuck the launcher aside while scrolling down (it sat on card titles), bring it back on the way up
  let lastY = scrollY;
  addEventListener('scroll', () => {
    const y = scrollY;
    if (innerWidth <= 760 && Math.abs(y - lastY) > 12) { root.classList.toggle('tucked', y > lastY && y > 120); lastY = y; }
  }, { passive: true });
  launcher.addEventListener('click', () => api.toggle());
  launcher.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse' && !open) big.do('wink'); });
  label.addEventListener('click', () => api.open());
  // the hello bubble says hi once per device, for a few seconds, and gets out of the way (it used to stay until the chat
  // was opened, covering buttons and catching taps meant for the page)
  const byeLabel = () => { if (label.hidden) return; label.hidden = true; assistant.setPrefs({ seen: true }); removeEventListener('scroll', byeLabel, true); };
  setTimeout(() => {
    if (assistant.prefs.seen || assistant.prefs.hidden || inPlayArea() || open) return;
    label.hidden = false; big.do('wave'); big.sparkle();
    addEventListener('scroll', byeLabel, { capture: true, passive: true });
    setTimeout(byeLabel, 7000);
  }, 6000);
  // alive while waiting: now and then a wink with a sparkle, or a tiny hop (never while the window is open or the tab is hidden)
  const fidget = () => {
    if (!open && !document.hidden && !assistant.prefs.hidden && !inPlayArea() && document.documentElement.dataset.motion !== 'reduce') {
      if (Math.random() < 0.5) { big.do('wink'); big.sparkle(); } else big.do('cheer');
    }
    setTimeout(fidget, 22_000 + Math.random() * 25_000);
  };
  setTimeout(fidget, 15_000 + Math.random() * 10_000);

  assistant.onChange(() => { paintPrefs(); if (open) paintChips(); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && open && !document.querySelector('.modal-backdrop, .qf-backdrop, .popmenu')) api.close(); });
  paintPrefs();
}

/** Used by Settings: show the Fuzzy again after it was hidden (and open it so people see it's back). */
/** The phone's top bar button opens (or closes) the helper — on phones the floating blob is gone so it never covers the page. */
export function toggleAssistant(): void { ui?.toggle(); }

export function showAssistant(): void { assistant.setPrefs({ hidden: false }); ui?.open(); }
