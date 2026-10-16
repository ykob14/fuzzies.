/**
 * The Fuzzy assistant's brain on the app side: what it knows about where you are (screen + hints), the chat history for this tab,
 * device preferences (voice, hidden, minimized) and the call to the server (`api/assist.ts`), which asks Claude with the site guide.
 * When the AI isn't switched on (or this copy has no cloud), answers come from the built-in guide and are clearly labelled so — never fake AI.
 */
import { api, ApiError, cloudEnabled } from './api';
import { accounts } from './account';
import { HELP, TIPS, helpFor, searchHelp, type HelpTopic } from '../content/help';

export type Role = 'user' | 'assistant';
/** `kind`: 'ai' = Claude's answer, 'guide' = the built-in guide (no AI), 'note' = a message from the app itself. */
export interface Msg { role: Role; text: string; kind: 'ai' | 'guide' | 'note'; at: number }
export interface Prefs { voice: boolean; hidden: boolean; seen: boolean }

const PREFS_KEY = 'fz.assistant';
const CHAT_KEY = 'fz.assistant.chat';
const MAX_CHAT = 40;

const read = <T>(store: Storage, key: string, fallback: T): T => { try { return { ...fallback, ...(JSON.parse(store.getItem(key) || 'null') ?? {}) }; } catch { return fallback; } };

let prefs: Prefs = read(localStorage, PREFS_KEY, { voice: false, hidden: false, seen: false });
let chat: Msg[] = (() => { try { const v = JSON.parse(sessionStorage.getItem(CHAT_KEY) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } })();
let screen = 'home';
let hints: string[] = [];
let aiOn: boolean | null = cloudEnabled ? null : false; // null = not asked yet
const listeners = new Set<() => void>();
const notify = () => { for (const l of listeners) l(); };

export const device = (): 'phone' | 'tablet' | 'computer' => (innerWidth <= 760 ? 'phone' : innerWidth <= 1024 ? 'tablet' : 'computer');

export const assistant = {
  /** Listen for changes to the chat, prefs or context. */
  onChange(fn: () => void): () => void { listeners.add(fn); return () => listeners.delete(fn); },

  get prefs(): Prefs { return prefs; },
  setPrefs(p: Partial<Prefs>): void {
    prefs = { ...prefs, ...p };
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch { /* private mode */ }
    notify();
  },

  /** Where the person is (the router sets this); screens can add short hints such as "a text box is selected". */
  get screen(): string { return screen; },
  get hints(): string[] { return hints; },
  setScreen(name: string): void {
    const s = name.split('/')[0] || 'home';
    if (s === screen) return;
    screen = s; hints = [];
    document.documentElement.dataset.screen = s;
    notify();
  },
  setHints(list: string[]): void { hints = list.map((x) => x.slice(0, 80)).slice(0, 6); },

  get messages(): readonly Msg[] { return chat; },
  clear(): void { chat = []; sessionStorage.removeItem(CHAT_KEY); notify(); },

  /** Is the real AI switched on for this site? (asked once per tab; false without cloud) */
  async aiAvailable(): Promise<boolean> {
    if (aiOn !== null) return aiOn;
    try { aiOn = !!(await api<{ ai: boolean }>('assist', 'status', { context: context() })).ai; } catch { aiOn = false; }
    return aiOn;
  },
  get aiKnown(): boolean | null { return aiOn; },

  /** Starter questions for the current screen (from the guide). */
  suggestions(): string[] {
    const out: string[] = [];
    for (const t of helpFor(screen)) for (const a of t.asks ?? []) if (out.length < 4 && !out.includes(a)) out.push(a);
    return out;
  },
  topics(): HelpTopic[] { return helpFor(screen); },
  allTopics(): HelpTopic[] { return HELP; },

  /** Send a question. Resolves with the assistant's message once it is in the history; rejects with a readable Error. */
  async ask(text: string): Promise<Msg> {
    const t = text.trim().slice(0, 1500);
    if (!t) throw new Error('Say something first.');
    push({ role: 'user', text: t, kind: 'note', at: Date.now() });
    if (await this.aiAvailable()) {
      try {
        const history = chat.filter((m) => m.kind !== 'note' || m.role === 'user').slice(-16).map((m) => ({ role: m.role, text: m.text }));
        const r = await api<{ reply: string }>('assist', 'chat', { messages: history, context: context() });
        return push({ role: 'assistant', text: r.reply, kind: 'ai', at: Date.now() });
      } catch (e) {
        if (e instanceof ApiError && e.status === 501) { aiOn = false; notify(); } // switched off since: fall through to the guide
        else throw e instanceof Error ? e : new Error('Something went wrong — please try again.');
      }
    }
    return push({ role: 'assistant', text: guideAnswer(t), kind: 'guide', at: Date.now() });
  },

  /** A message from the app itself (greetings, notes) — never shown as an AI answer. */
  note(text: string): Msg { return push({ role: 'assistant', text, kind: 'note', at: Date.now() }); },
};

function context() {
  return { screen, device: device(), hints, cloud: cloudEnabled };
}

function push(m: Msg): Msg {
  chat = [...chat, m].slice(-MAX_CHAT);
  try { sessionStorage.setItem(CHAT_KEY, JSON.stringify(chat)); } catch { /* full */ }
  notify();
  return m;
}

let tipAt = Math.floor(Math.random() * TIPS.length);
const nextTip = () => TIPS[tipAt++ % TIPS.length];

/** Friendly built-in replies for hellos, thanks, who-are-you, jokes and "give me a tip" (no AI needed). */
function smallTalk(q: string): string | null {
  const t = q.toLowerCase().replace(/[^\p{L}\p{N}' ]+/gu, ' ').replace(/\s+/g, ' ').trim();
  if (!t) return null;
  const has = (re: RegExp) => re.test(t);
  if (has(/^(hi|hello|hey|hiya|yo|hello fuzzy|hi fuzzy|good (morning|afternoon|evening)|sup|what's up|whats up)\b/) && t.split(' ').length <= 4) return 'Hi hi! hehe. I’m Fuzzy. Ask me how to do anything here, say “tip” and I’ll share a trick, or tell me what you want to make and I’ll point you to the best place to start.';
  if (has(/^(thanks|thank you|thx|ty|cheers)\b/)) return 'You’re so welcome! hehe. I’m right here if you need anything else.';
  if (has(/\b(who|what) are you\b|\byour name\b|\bwhat can you do\b|\bhow can you help\b/)) return 'I’m Fuzzy, the fluffy helper of this site! I can show you where everything is, walk you through any tool step by step, and give design tips. Try “how do I add my own photo?”, “tips for a poster” or just say “tip”. With the real AI switched on for the site I can also chat about almost anything.';
  if (has(/\bjoke\b|make me laugh/)) return 'Why did the designer bring a ladder? To reach the **high-res** images! hehe';
  if (has(/^(tip|tips|trick|tricks|advice)\b|\b(give|tell|show) me (a |some )?(tip|tips|trick|tricks)\b|how (can|do) i (use|get the most (out )?of) (this|the site|fuzzies)( better)?|use (this|it|the site) better/)) return `Here’s a tip: ${nextTip()}\n\nSay “tip” again for another one.`;
  if (has(/\b(i('m| am) (bored|sad|tired)|bored)\b/)) return 'Aww! A little play might help: a quick round of [Fuzzy Crossing](#/play) or a stroll around your town in [Fuzzies Land](#/land). Or make something silly in the editor. hehe';
  if (has(/\b(love|like) you\b|you('re| are) (cute|great|awesome|the best|amazing)/)) return 'Aww, you’re making my fur fluffier! hehe. Thank you!';
  return null;
}

/** The built-in guide's best matches, written as a short answer (used when there is no AI). */
function guideAnswer(q: string): string {
  const talk = smallTalk(q);
  if (talk) return talk;
  let hits = searchHelp(q, 2, screen, 5);
  // a short follow-up ("and on my phone?", "what about PDF?") is read together with the question before it, like a person would
  if (!hits.length) {
    const before = [...chat].reverse().filter((m) => m.role === 'user' && m.text !== q).slice(0, 1).map((m) => m.text).join(' ');
    if (before && q.split(/\s+/).length <= 6) { const more = searchHelp(`${before} ${q}`, 2, screen, 5); if (more.length) hits = more; }
  }
  if (!hits.length) return `Hmm, that one isn’t in my built-in guide, and my full AI brain isn’t switched on here yet (the site owner can turn it on). I can still help with how to use the site, so try other words, say “tip”, or ask things like “how do I make a poster?” or “how do I earn Fuzzies?”. You can also look around [Templates](#/templates), [Settings](#/settings) and [Profile](#/profile).`;
  // one topic: the few sentences/clauses that best match the question (in their own order), kept short — not a whole page
  const [best, next] = hits;
  const words = q.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 2);
  const pieces = best.body.replace(/\s*\n\s*/g, ' ').split(/(?<=[.!?;:])\s+(?=[A-Z(“"])/).map((x) => x.trim()).filter(Boolean);
  const score = (x: string) => words.reduce((n, w) => n + (x.toLowerCase().includes(w.slice(0, Math.max(4, w.length - 2))) ? 1 : 0), 0);
  const ranked = pieces.map((x, i) => ({ x, i, n: score(x) + (i === 0 ? 0.6 : 0) })).sort((a, b) => b.n - a.n || a.i - b.i);
  const keep: typeof ranked = [];
  let len = 0;
  for (const r of ranked) { if (keep.length >= 3 || (keep.length && len + r.x.length > 520)) continue; keep.push(r); len += r.x.length; }
  const text = keep.sort((a, b) => a.i - b.i).map((r) => (r.x.length > 420 ? `${r.x.slice(0, 400).replace(/\s+\S*$/, '')}…` : r.x)).join(' ');
  return `**${best.title}**\n${text}${next ? `\n\nWant more? Ask me about **${next.title}**.` : ''}`;
}

// a new log-in or sign-out starts a fresh chat (nothing about one person lingers for the next)
let lastUser = accounts.current?.id ?? '';
accounts.onChange((a) => {
  const id = a?.id ?? '';
  if (id !== lastUser) { lastUser = id; assistant.clear(); }
});
