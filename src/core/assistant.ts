/**
 * The Fuzzy assistant's brain on the app side: what it knows about where you are (screen + hints), the chat history for this tab,
 * device preferences (voice, hidden, minimized) and the call to the server (`api/assist.ts`), which asks Claude with the site guide.
 * When the AI isn't switched on (or this copy has no cloud), answers come from the built-in guide and are clearly labelled so — never fake AI.
 */
import { api, ApiError, cloudEnabled } from './api';
import { accounts } from './account';
import { HELP, helpFor, searchHelp, type HelpTopic } from '../content/help';

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
    const t = text.trim().slice(0, 1200);
    if (!t) throw new Error('Say something first.');
    push({ role: 'user', text: t, kind: 'note', at: Date.now() });
    if (await this.aiAvailable()) {
      try {
        const history = chat.filter((m) => m.kind !== 'note' || m.role === 'user').slice(-12).map((m) => ({ role: m.role, text: m.text }));
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

/** The built-in guide's best matches, written as a short answer (used when there is no AI). */
function guideAnswer(q: string): string {
  const hits = searchHelp(q, 2, screen);
  if (!hits.length) return 'I couldn’t find that in my guide. Try other words, or have a look around [Settings](#/settings) and [Profile](#/profile).';
  return hits.map((t) => `**${t.title}**\n${t.body.replace(/\s*\n\s*/g, ' ')}`).join('\n\n');
}

// a new log-in or sign-out starts a fresh chat (nothing about one person lingers for the next)
let lastUser = accounts.current?.id ?? '';
accounts.onChange((a) => {
  const id = a?.id ?? '';
  if (id !== lastUser) { lastUser = id; assistant.clear(); }
});
