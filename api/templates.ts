/**
 * The shared template catalog. Built-in templates ship with the app; this adds the ones published from the
 * template manager, plus real usage counts for "Trending" and "Popular". Metadata (searchable) and the editable
 * document are separate: listings never carry documents.
 *
 * GET  /api/templates?stats=1                         → { popular: [[id, n]], trending: [[id, n]] }   (public)
 * GET  /api/templates?list=1&q&cat&sub&format&limit&offset → { items: Meta[], total }       (published only)
 * GET  /api/templates?id=<id>                          → { meta, doc }                        (published only)
 * GET  /api/templates?thumb=<id>&r=<revision>          → the preview picture (image)
 * POST /api/templates { action, ... }  (logged in)
 *   use     { id }                 → { ok }      counts one use per person per template per day
 *   me                             → { admin, ai } may this account manage templates? (listed in fz_admins);
 *                                                 is AI drafting switched on? (ANTHROPIC_API_KEY + ANTHROPIC_MODEL)
 *   mine                           → { items }   every template, drafts too (admin)
 *   get     { id }                 → { meta, doc } drafts too (admin)
 *   save    { meta, doc, thumb, status? } → { id, revision }  create or update (admin)
 *   publish / unpublish / delete { id } → { ok } (admin)
 *   ai      { brief, topic, n }    → { drafts: [{ title, kicker, details[2], cta, occasion }] }  wording for new
 *                                    templates, written by Claude through Anthropic's Messages API (admin; only
 *                                    when the site has its own key — never pretends without one)
 */
import { randomBytes } from 'node:crypto';
import { db, q, databaseUrl } from './_lib/db.js';
import { handle, requireUser, HttpError, type AuthedUser } from './_lib/auth.js';

const ID = /^[a-z0-9][a-z0-9_-]{2,79}$/;
const MAX_DOC = 3_500_000;   // characters of JSON (Vercel's request limit is ~4.5 MB)
const MAX_THUMB = 400_000;   // a data URL picture

const META_COLS = `id, status, name, category, sub, format, format_label, width, height, pages, style, colors, occasion, tags,
  revision, (thumb is not null) as has_thumb, extract(epoch from created_at) * 1000 as created_at, extract(epoch from updated_at) * 1000 as updated_at`;

interface Row {
  id: string; status: string; name: string; category: string; sub: string; format: string; format_label: string;
  width: number; height: number; pages: number; style: string; colors: string[]; occasion: string; tags: string[];
  revision: number; has_thumb: boolean; created_at: number; updated_at: number;
}

/** A catalog row in the shape the app's TemplateMeta uses (documents are fetched separately). */
const meta = (r: Row) => ({
  id: r.id, status: r.status, name: r.name, category: r.category, sub: r.sub, format: r.format, formatLabel: r.format_label,
  width: r.width, height: r.height, pages: r.pages, style: r.style, colors: r.colors, occasion: r.occasion, tags: r.tags,
  cost: 0, addedAt: Math.round(Number(r.created_at)), version: r.revision,
  thumb: r.has_thumb ? `./api/templates?thumb=${encodeURIComponent(r.id)}&r=${r.revision}` : undefined,
});

const str = (v: unknown, max = 120) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const words = (v: unknown, n = 30) => (Array.isArray(v) ? v : []).map((x) => str(x, 40).toLowerCase()).filter(Boolean).slice(0, n);
const int = (v: unknown, lo: number, hi: number) => { const n = Math.round(Number(v)); return Number.isFinite(n) && n >= lo && n <= hi ? n : NaN; };

/** "bask cup" → basketball, cups… : every word must match the start of a word (simple dictionary, any language). */
function tsQuery(text: string): string {
  const ws = text.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').split(/[^a-z0-9]+/).filter(Boolean).slice(0, 8);
  return ws.map((w) => `${w}:*`).join(' & ');
}

/**
 * Template managers: accounts listed in the fz_admins table (set in the database). Not by email: emails aren't
 * verified, so an email list could be claimed by whoever signs up with (or changes to) an address first.
 */
async function isAdmin(u: AuthedUser): Promise<boolean> {
  const { rows } = await q('select 1 from fz_admins where user_id = $1', [u.id]);
  return rows.length > 0;
}
async function requireAdmin(req: Request): Promise<AuthedUser> {
  const u = await requireUser(req);
  if (!(await isAdmin(u))) throw new HttpError(403, 'Only template managers can do that.');
  return u;
}

const aiKey = () => process.env.ANTHROPIC_API_KEY?.trim().replace(/^["']|["']$/g, '') ?? '';
const aiModel = () => process.env.ANTHROPIC_MODEL?.trim() ?? '';
const aiReady = () => !!(aiKey() && aiModel());

const AI_SYSTEM = `You write the words for graphic-design templates (posters, social posts, flyers, invitations) in a design app.
Reply with ONLY a JSON array, no other text. Each item: {"title": string (2-5 words, the big headline),
"kicker": string (2-6 words shown above the title), "details": [string, string] (short lines such as date/time and place;
use friendly placeholders like "Saturday · 10 AM" or "Your venue name" — never real people, brands, logos or addresses),
"cta": string (2-4 words, e.g. "Register now"), "occasion": string (one lower-case word or hyphenated phrase)}.
Make every item clearly different in tone and angle. Plain, original wording; no emoji; no copyrighted slogans.`;

/** Wording drafts from Claude (Anthropic Messages API). Throws HttpError with a readable reason on failure. */
async function aiDrafts(brief: string, topic: string, n: number) {
  let r: Response;
  try {
    r = await fetch(`${process.env.ANTHROPIC_BASE_URL?.trim().replace(/\/+$/, '') || 'https://api.anthropic.com'}/v1/messages`, {
      method: 'POST',
      headers: { 'x-api-key': aiKey(), 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: aiModel(), max_tokens: 1500, system: AI_SYSTEM,
        messages: [{ role: 'user', content: `Topic: ${topic || 'any'}\nWhat the template is for: ${brief || topic}\nWrite ${n} different versions.` }],
      }),
    });
  } catch { throw new HttpError(502, 'Couldn’t reach the AI service — try again in a moment.'); }
  if (!r.ok) {
    const why = ((await r.json().catch(() => ({}))) as { error?: { type?: string } }).error?.type ?? '';
    console.error('ai draft failed', r.status, why);
    throw new HttpError(502, `The AI service said no (${r.status}${why ? ` ${why}` : ''}). Check ANTHROPIC_API_KEY and ANTHROPIC_MODEL in Vercel.`);
  }
  const d = (await r.json()) as { content?: { type: string; text?: string }[] };
  const text = (d.content ?? []).filter((c) => c.type === 'text').map((c) => c.text ?? '').join('');
  let list: unknown;
  try { list = JSON.parse(text.slice(text.indexOf('['), text.lastIndexOf(']') + 1)); } catch { list = null; }
  if (!Array.isArray(list)) throw new HttpError(502, 'The AI answer couldn’t be read — try again.');
  const drafts = list.slice(0, n).map((x) => {
    const o = (x ?? {}) as Record<string, unknown>;
    const det = Array.isArray(o.details) ? o.details.map((v) => str(v, 60)).filter(Boolean) : [];
    return { title: str(o.title, 60), kicker: str(o.kicker, 60), details: [det[0] ?? 'Date · Time', det[1] ?? 'Place'], cta: str(o.cta, 30) || 'Learn more', occasion: str(o.occasion, 30).toLowerCase().replace(/[^a-z0-9-]+/g, '-') };
  }).filter((x) => x.title);
  if (!drafts.length) throw new HttpError(502, 'The AI answer was empty — try a clearer description.');
  return drafts;
}

const cached = (data: unknown, seconds: number) => new Response(JSON.stringify(data), {
  status: 200,
  headers: { 'content-type': 'application/json', 'cache-control': `public, max-age=${Math.min(60, seconds)}, s-maxage=${seconds}, stale-while-revalidate=${seconds * 5}` },
});
const fail = (status: number, error: string) => new Response(JSON.stringify({ error }), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

export async function GET(req: Request): Promise<Response> {
  const p = new URL(req.url).searchParams;
  if (!databaseUrl()) return fail(503, 'The database isn’t connected yet.');
  try {
    await db();
    if (p.has('stats')) {
      const top = (where: string) => q<{ template_id: string; n: number }>(
        `select template_id, count(*)::int as n from fz_template_uses ${where} group by template_id order by n desc limit 300`);
      const [all, week] = await Promise.all([top(''), top(`where day > current_date - 7`)]);
      return cached({ popular: all.rows.map((r) => [r.template_id, r.n]), trending: week.rows.map((r) => [r.template_id, r.n]) }, 300);
    }
    if (p.has('thumb')) {
      const { rows } = await q<{ thumb: string | null }>(`select thumb from fz_templates where id = $1 and status = 'published'`, [p.get('thumb')]);
      const m = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(rows[0]?.thumb ?? '');
      if (!m) return fail(404, 'No picture.');
      return new Response(Buffer.from(m[2], 'base64'), { headers: { 'content-type': m[1], 'cache-control': p.has('r') ? 'public, max-age=31536000, immutable' : 'public, max-age=300' } });
    }
    if (p.has('id')) {
      const { rows } = await q<Row & { doc: unknown }>(`select ${META_COLS}, doc from fz_templates where id = $1 and status = 'published'`, [p.get('id')]);
      if (!rows[0]) return fail(404, 'That template isn’t available any more.');
      return cached({ meta: meta(rows[0]), doc: rows[0].doc }, 300);
    }
    if (p.has('list')) {
      const args: unknown[] = [];
      const where = [`status = 'published'`];
      const add = (sql: string, v: unknown) => { args.push(v); where.push(sql.replace('$?', `$${args.length}`)); };
      const tq = tsQuery(p.get('q') ?? '');
      if (tq) add('search @@ to_tsquery(\'simple\', $?)', tq);
      if (p.get('cat')) add('category = $?', p.get('cat'));
      if (p.get('sub')) add('sub = $?', p.get('sub'));
      if (p.get('format')) add('format = $?', p.get('format'));
      const limit = Math.min(200, Math.max(1, Number(p.get('limit')) || 60));
      const offset = Math.max(0, Number(p.get('offset')) || 0);
      const order = tq ? `ts_rank(search, to_tsquery('simple', $1)) desc, created_at desc` : 'created_at desc';
      const [list, count] = await Promise.all([
        q<Row>(`select ${META_COLS} from fz_templates where ${where.join(' and ')} order by ${order} limit ${limit} offset ${offset}`, args),
        q<{ n: number }>(`select count(*)::int as n from fz_templates where ${where.join(' and ')}`, args),
      ]);
      return cached({ items: list.rows.map(meta), total: count.rows[0]?.n ?? 0 }, 60);
    }
    return handle(req, async () => ({}));
  } catch (e) {
    console.error('templates GET failed', e);
    return fail(500, 'Templates couldn’t be loaded right now.');
  }
}

export function POST(req: Request): Promise<Response> {
  return handle(req, async (b) => {
    await db();
    switch (b.action) {
      case 'use': {
        const u = await requireUser(req);
        const id = str(b.id, 80);
        if (!ID.test(id)) throw new HttpError(400, 'Unknown template.');
        await q('insert into fz_template_uses (template_id, user_id) values ($1, $2) on conflict do nothing', [id, u.id]);
        return { ok: true };
      }
      case 'me': {
        const admin = await isAdmin(await requireUser(req));
        return { admin, ai: admin && aiReady() };
      }
      case 'ai': {
        await requireAdmin(req);
        if (!aiReady()) throw new HttpError(501, 'AI drafting isn’t switched on for this site (it needs ANTHROPIC_API_KEY and ANTHROPIC_MODEL in Vercel).');
        const brief = str(b.brief, 400), topic = str(b.topic, 80);
        if (!brief && !topic) throw new HttpError(400, 'Describe the template you want first.');
        return { drafts: await aiDrafts(brief, topic, Math.min(4, Math.max(1, Math.round(Number(b.n)) || 3))) };
      }
      case 'mine': {
        await requireAdmin(req);
        const { rows } = await q<Row>(`select ${META_COLS} from fz_templates order by updated_at desc limit 500`);
        return { items: rows.map((r) => ({ ...meta(r), thumb: undefined, hasThumb: r.has_thumb })) };
      }
      case 'get': {
        await requireAdmin(req);
        const { rows } = await q<Row & { doc: unknown; thumb: string | null }>(`select ${META_COLS}, doc, thumb from fz_templates where id = $1`, [str(b.id, 80)]);
        if (!rows[0]) throw new HttpError(404, 'That template doesn’t exist.');
        return { meta: { ...meta(rows[0]), thumb: rows[0].thumb ?? undefined }, doc: rows[0].doc };
      }
      case 'save': {
        const u = await requireAdmin(req);
        const m = (b.meta ?? {}) as Record<string, unknown>;
        const name = str(m.name, 80);
        const width = int(m.width, 16, 10000), height = int(m.height, 16, 10000), pages = int(m.pages, 1, 100);
        if (!name) throw new HttpError(400, 'Give the template a name.');
        if ([width, height, pages].some(Number.isNaN)) throw new HttpError(400, 'The template’s size looks wrong.');
        const doc = b.doc as { pages?: unknown } | undefined;
        if (!doc || typeof doc !== 'object' || !Array.isArray(doc.pages) || !doc.pages.length) throw new HttpError(400, 'The design is empty.');
        const docJson = JSON.stringify(doc);
        if (docJson.length > MAX_DOC) throw new HttpError(413, 'This design is too big to publish (too many large photos).');
        const thumb = typeof b.thumb === 'string' && /^data:image\/(jpeg|png|webp);base64,/.test(b.thumb) && b.thumb.length <= MAX_THUMB ? b.thumb : null;
        const status = b.status === 'published' ? 'published' : 'draft';
        let id = str(m.id, 80);
        if (id && !ID.test(id)) throw new HttpError(400, 'Bad template id.');
        if (!id) id = `pub-${randomBytes(6).toString('hex')}`;
        const searchText = [str(m.category), str(m.sub), str(m.occasion), str(m.style), str(m.formatLabel), ...words(m.tags)].join(' ');
        const { rows } = await q<{ revision: number }>(
          `insert into fz_templates (id, status, name, category, sub, format, format_label, width, height, pages, style, colors, occasion, tags, thumb, doc, author, search)
           values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
                   setweight(to_tsvector('simple', $3), 'A') || setweight(to_tsvector('simple', $18), 'B'))
           on conflict (id) do update set status = excluded.status, name = excluded.name, category = excluded.category, sub = excluded.sub,
             format = excluded.format, format_label = excluded.format_label, width = excluded.width, height = excluded.height,
             pages = excluded.pages, style = excluded.style, colors = excluded.colors, occasion = excluded.occasion, tags = excluded.tags,
             thumb = coalesce(excluded.thumb, fz_templates.thumb), doc = excluded.doc, search = excluded.search,
             revision = fz_templates.revision + 1, updated_at = now()
           returning revision`,
          [id, status, name, str(m.category, 40), str(m.sub, 40), str(m.format, 40), str(m.formatLabel, 60), width, height, pages,
            str(m.style, 30), words(m.colors, 6), str(m.occasion, 40), words(m.tags), thumb, docJson, u.id, searchText]);
        return { id, revision: rows[0].revision };
      }
      case 'publish':
      case 'unpublish': {
        await requireAdmin(req);
        const r = await q(`update fz_templates set status = $2, updated_at = now() where id = $1`, [str(b.id, 80), b.action === 'publish' ? 'published' : 'draft']);
        if (!r.rowCount) throw new HttpError(404, 'That template doesn’t exist.');
        return { ok: true };
      }
      case 'delete': {
        await requireAdmin(req);
        await q('delete from fz_templates where id = $1', [str(b.id, 80)]);
        return { ok: true };
      }
      default:
        throw new HttpError(400, 'Unknown action.');
    }
  });
}
