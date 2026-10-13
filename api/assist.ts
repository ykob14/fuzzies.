/**
 * POST /api/assist  { action, ... } — the Fuzzy assistant (website-wide help chat).
 *   status                                   → { ai: boolean, suggestions }      is the AI switched on for this site?
 *   chat   { messages: [{role, text}], context: { screen, device, hints } } → { reply, suggestions? }
 * The answer comes from Claude (Anthropic Messages API) with the site guide as its only knowledge (_lib/guide.ts). A logged-in
 * person's own account facts (public bits of their profile) are added server-side; visitors get general help. Nothing is stored
 * except the rate-limit stamps. Without ANTHROPIC_API_KEY + ANTHROPIC_MODEL (or ASSIST_MODEL) the chat answers 501 — the app then
 * shows the built-in guide instead of pretending.
 */
import { q } from './_lib/db.js';
import { handle, requireUser, HttpError, clientIp as netOf, type AuthedUser } from './_lib/auth.js';
import { systemPrompt, suggestionsFor, type AccountFacts, type ChatContext } from './_lib/guide.js';

const aiKey = () => process.env.ANTHROPIC_API_KEY?.trim().replace(/^["']|["']$/g, '') ?? '';
const aiModel = () => (process.env.ASSIST_MODEL || process.env.ANTHROPIC_MODEL || '').trim();
const aiReady = () => !!(aiKey() && aiModel());

const MAX_TURNS = 12; // earlier messages sent back for context
const MAX_CHARS = 1200; // per message
const LIMIT_USER = 40; // messages per hour per account
const LIMIT_IP = 15; // messages per hour per network address for visitors
const LIMIT_IP_ALL = 90; // and for everyone behind one address (shared Wi-Fi is fine, floods are not)
const LIMIT_ALL = Number(process.env.ASSIST_HOURLY_CAP) || 1500; // the whole site per hour (keeps the AI bill bounded)
const TIMEOUT_MS = 25_000;

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const clientIp = (req: Request) => netOf(req) || 'unknown';
const SCREENS = new Set(['home', 'templates', 'projects', 'edit', 'play', 'land', 'rewards', 'profile', 'settings', 'welcome', 'login', 'signup', 'reset', 's']);

async function optionalUser(req: Request): Promise<AuthedUser | null> {
  if (!req.headers.get('authorization')) return null;
  try { return await requireUser(req); } catch { return null; }
}

async function limit(key: string, max: number): Promise<void> {
  const { rows } = await q<{ n: number }>("select count(*)::int as n from fz_assist where key = $1 and at > now() - interval '1 hour'", [key]);
  if (rows[0].n >= max) throw new HttpError(429, 'I need a little breather — please ask again in a bit. hehe');
}

/** The public bits of the person's own profile, straight from the database (never from the browser). */
async function facts(u: AuthedUser): Promise<AccountFacts | null> {
  const { rows } = await q<{ data: Record<string, unknown>; at: number }>('select data, updated_at::float8 as at from fz_profiles where user_id = $1', [u.id]);
  if (!rows[0]) return null;
  const d = rows[0].data ?? {};
  const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : 0);
  const len = (v: unknown) => (Array.isArray(v) ? v.length : 0);
  const stats = (d.stats ?? {}) as Record<string, unknown>;
  const land = (d.land ?? {}) as Record<string, unknown>;
  const { rows: w } = await q<{ n: number }>('select count(*)::int as n from fz_wallets where user_id = $1', [u.id]);
  const { rows: cr } = await q<{ at: string | null }>('select created_at::text as at from fz_users where id = $1', [u.id]);
  const ago = Math.max(0, Date.now() - rows[0].at);
  const syncedAgo = ago < 120_000 ? 'moments ago' : ago < 3_600_000 ? `${Math.round(ago / 60_000)} minutes ago` : ago < 86_400_000 ? `${Math.round(ago / 3_600_000)} hours ago` : `${Math.round(ago / 86_400_000)} days ago`;
  return {
    username: u.username, name: str(d.name, 40), memberSince: (cr[0]?.at ?? '').slice(0, 10) || 'unknown', hasPassword: u.has_password, wallets: w[0].n,
    fuzzies: n(d.fuzzies), totalFuzzies: n(d.totalFuzzies), designs: n(stats.designs), exports: n(stats.exports), gamesPlayed: n(stats.gamesPlayed), bestScore: n(stats.bestScore),
    landLevel: n(land.level) || 1, landCoins: n(land.coins), landBuildings: len(land.buildings), achievements: len(d.achievements), unlocked: len(d.unlocked), syncedAgo,
  };
}

async function ask(system: string, messages: { role: 'user' | 'assistant'; content: string }[]): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  let r: Response;
  try {
    r = await fetch(`${process.env.ANTHROPIC_BASE_URL?.trim().replace(/\/+$/, '') || 'https://api.anthropic.com'}/v1/messages`, {
      method: 'POST', signal: ctrl.signal,
      headers: { 'x-api-key': aiKey(), 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: aiModel(), max_tokens: 450, temperature: 0.5, system, messages }),
    });
  } catch { throw new HttpError(502, 'I couldn’t reach my brain just now — please try again in a moment.'); } finally { clearTimeout(timer); }
  if (!r.ok) {
    const why = ((await r.json().catch(() => ({}))) as { error?: { type?: string } }).error?.type ?? '';
    console.error('assist failed', r.status, why);
    if (r.status === 429 || r.status === 529) throw new HttpError(503, 'Lots of people are asking me things right now — give me a moment and try again.');
    throw new HttpError(502, `The AI service said no (${r.status}${why ? ` ${why}` : ''}). The site owner should check ANTHROPIC_API_KEY and the model name in Vercel.`);
  }
  const d = (await r.json()) as { content?: { type: string; text?: string }[] };
  const text = (d.content ?? []).filter((c) => c.type === 'text').map((c) => c.text ?? '').join('').trim();
  if (!text) throw new HttpError(502, 'I lost my words for a second — please ask again.');
  // only the app's own screens may be linked, whatever the model wrote
  return text.replace(/\]\((?!#\/(?:home|templates|projects|play|land|rewards|profile|settings)\))[^)]*\)/g, ']').slice(0, 4000);
}

function readContext(v: unknown): ChatContext {
  const c = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  const screen = str(c.screen, 20).toLowerCase();
  const device = c.device === 'phone' || c.device === 'tablet' ? c.device : 'computer';
  const hints = Array.isArray(c.hints) ? c.hints.map((x) => str(x, 80)).filter(Boolean).slice(0, 6) : [];
  return { screen: SCREENS.has(screen) ? screen : 'home', device, hints, cloud: c.cloud !== false };
}

export async function POST(req: Request): Promise<Response> {
  return handle(req, async (b) => {
    const action = String(b.action ?? '');
    const ctx = readContext(b.context);
    if (action === 'status') return { ai: aiReady(), suggestions: suggestionsFor(ctx.screen) };
    if (action !== 'chat') throw new HttpError(400, 'Unknown action.');
    if (!aiReady()) throw new HttpError(501, 'My AI brain isn’t switched on for this site yet (the owner adds ANTHROPIC_API_KEY and ANTHROPIC_MODEL in Vercel). Here’s the built-in guide instead.');

    const raw = Array.isArray(b.messages) ? b.messages : [];
    const messages: { role: 'user' | 'assistant'; content: string }[] = [];
    for (const m of raw.slice(-MAX_TURNS)) {
      const o = (m ?? {}) as Record<string, unknown>;
      const content = str(o.text, MAX_CHARS);
      const role = o.role === 'assistant' ? 'assistant' : 'user';
      if (!content) continue;
      if (messages.length && messages[messages.length - 1].role === role) messages[messages.length - 1].content += `\n${content}`; // turns must alternate
      else messages.push({ role, content });
    }
    while (messages.length && messages[0].role !== 'user') messages.shift();
    if (!messages.length || messages[messages.length - 1].role !== 'user') throw new HttpError(400, 'Say something first. hehe');

    const u = await optionalUser(req);
    const ip = clientIp(req);
    await limit('all', LIMIT_ALL);
    await limit(`ip:${ip}`, LIMIT_IP_ALL);
    await limit(u ? `u:${u.id}` : `v:${ip}`, u ? LIMIT_USER : LIMIT_IP);
    await q('insert into fz_assist (key) values ($1), ($2), ($3)', ['all', `ip:${ip}`, u ? `u:${u.id}` : `v:${ip}`]);
    if (Math.random() < 0.05) await q("delete from fz_assist where at < now() - interval '2 hours'");

    const acct = u ? await facts(u).catch(() => null) : null;
    const reply = await ask(systemPrompt(ctx, acct), messages);
    return { reply, you: u ? u.username : null };
  });
}
export const GET = POST;
