/**
 * POST /api/crossing  { action, ... } — Fuzzy Crossing weekly competitions and validated leaderboards.
 *   run.start  { mode:'classic' }                         → { runId, nonce, serverNow, week, expiresAt }       (login needed)
 *   run.finish { runId, nonce, result }                   → { accepted, reason?, message?, week, ranks, bests, improved }
 *   board.get  { board, week:'current'|'previous'|'2026-W42', limit }  → { rows, me, total, endsInMs … }       (public; the token only adds "you")
 *   player.get { username, week }                         → { username, avatar, boards, career }                      (public: a name on a board)
 *   weekly.status                                         → { claimable: [{ week, boards: [{ board, rank, tier, reward }] }] }
 *   weekly.claim { week:'previous'|'2026-W42' }           → { week, claimed: [{ board, rank, tier, reward, repeat }] }
 *
 * The rules of the game run in the browser, so this can only check that a result is PLAUSIBLE (api/_lib/crossing-rules.ts): a signed-in
 * player opens a run (one at a time, a secret only they hold), the SERVER times it, and the finish must fit the server's stopwatch and the
 * game's own limits. The week (ISO, UTC, Monday 00:00) is always the server's — the client's is never read. A finished week is frozen
 * (every run lands in the week it FINISHED in) and pays its rewards once per board.
 */
import { createHash, randomBytes } from 'node:crypto';
import { db, q } from './_lib/db.js';
import { handle, requireUser, clientIp, HttpError, type AuthedUser } from './_lib/auth.js';
import { hit, publicAvatar, rankOf, serverNow, valueOrder } from './_lib/crossing.js';
import { LIMITS, boardValues, friendlyReason, parseResult, validateRun } from './_lib/crossing-rules.js';
import { BOARD_IDS, isBoard, prevWeek, rewardFor, tierOf, weekKey, weekRange, WEEK_MS, type Board } from '../src/crossing/rewards-weekly.js';

const RUNS_PER_HOUR = 40;
const READS_PER_MIN = 90;
const CLAIM_WEEKS = 8; // an unclaimed finished week stays claimable this long
const MAX_ROWS = 50;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const sha = (s: string) => createHash('sha256').update(s).digest('hex');

async function optionalUser(req: Request): Promise<AuthedUser | null> {
  if (!req.headers.get('authorization')) return null;
  try { return await requireUser(req); } catch { return null; }
}

/** 'current' | 'previous' | a week key → a real week key that isn't in the future and isn't ancient */
function resolveWeek(w: unknown, now: number): string {
  const cur = weekKey(now);
  const key = w === undefined || w === 'current' ? cur : w === 'previous' ? prevWeek(cur) : typeof w === 'string' ? w : '';
  const r = key ? weekRange(key) : null;
  if (!key || !r) throw new HttpError(400, 'That week doesn’t exist.');
  if (key > cur) throw new HttpError(400, 'That week hasn’t started yet.');
  if (r.start < now - 60 * WEEK_MS) throw new HttpError(400, 'That week is too long ago.');
  return key;
}

export function GET(req: Request): Promise<Response> {
  return handle(req, async () => ({}));
}

export function POST(req: Request): Promise<Response> {
  return handle(req, async (b) => {
    await db();
    const now = serverNow(req);
    const ip = clientIp(req) || 'unknown';
    switch (b.action) {
      // ---------- a run begins ----------
      case 'run.start': {
        const u = await requireUser(req);
        if (b.mode !== undefined && b.mode !== 'classic') throw new HttpError(400, 'Only Classic runs go on the weekly boards.');
        await hit(`s:${ip}`, 3_600_000, 240, 'Lots of games from one place — please wait a little.');
        const { rows: recent } = await q<{ n: number }>('select count(*)::int as n from fz_cx_runs where user_id = $1 and started_at > $2', [u.id, now - 3_600_000]);
        if (recent[0].n >= RUNS_PER_HOUR) throw new HttpError(429, 'That’s a lot of games for one hour — the boards will be here when you’re back!');
        const nonce = randomBytes(24).toString('base64url');
        for (let attempt = 0; ; attempt++) {
          try {
            await q("update fz_cx_runs set status = 'abandoned' where user_id = $1 and status = 'open'", [u.id]); // a new run replaces the old one
            const { rows } = await q<{ id: string }>('insert into fz_cx_runs (user_id, mode, started_at, token_hash, ip) values ($1, $2, $3, $4, $5) returning id', [u.id, 'classic', now, sha(nonce), ip]);
            return { runId: rows[0].id, nonce, serverNow: now, week: weekKey(now), expiresAt: now + LIMITS.runExpireMs };
          } catch (e) {
            if ((e as { code?: string }).code === '23505' && attempt === 0) continue; // two starts at once: the second one replaces the first
            throw e;
          }
        }
      }

      // ---------- a run ends ----------
      case 'run.finish': {
        const u = await requireUser(req);
        await hit(`f:${u.id}`, 60_000, 20, 'Slow down a little — try again in a minute.');
        const runId = typeof b.runId === 'string' && UUID.test(b.runId) ? b.runId : '';
        const nonce = typeof b.nonce === 'string' && b.nonce.length <= 80 ? b.nonce : '';
        const closed = (reason: string) => ({ accepted: false, reason, message: friendlyReason(reason) });
        if (!runId || !nonce) return closed('run');
        // the run can be finished exactly once: whoever flips it from 'open' wins; everything after that is refused
        const { rows: got } = await q<{ started_at: number }>(
          "update fz_cx_runs set status = 'finishing', finished_at = $4 where id = $1 and user_id = $2 and token_hash = $3 and status = 'open' returning started_at::float8 as started_at",
          [runId, u.id, sha(nonce), now]);
        if (!got[0]) return closed('run');
        const elapsed = now - Number(got[0].started_at);
        const reject = async (reason: string, result: unknown = null) => {
          await q('update fz_cx_runs set status = $2, result = $3 where id = $1', [runId, `rejected:${reason}`.slice(0, 40), result === null ? null : JSON.stringify(result)]);
          return closed(reason);
        };
        const parsed = parseResult(b.result);
        if (typeof parsed === 'string') return reject(parsed);
        const verdict = validateRun(parsed, elapsed);
        if (!verdict.ok) return reject(verdict.reason, parsed);

        const week = weekKey(now);
        await q("update fz_cx_runs set status = 'accepted', week_key = $2, flags = $3, result = $4 where id = $1", [runId, week, verdict.flags.join(','), JSON.stringify(parsed)]);
        // the name tag shown next to the score: a snapshot of the avatar (kept here so reading a board never has to open big profiles)
        const { rows: prof } = await q('select data->\'avatar\' as avatar from fz_profiles where user_id = $1', [u.id]);
        await q(`insert into fz_cx_players (user_id, avatar, updated_at) values ($1, $2, $3)
                 on conflict (user_id) do update set avatar = excluded.avatar, updated_at = excluded.updated_at`, [u.id, JSON.stringify(publicAvatar(prof[0]?.avatar)), now]);

        const values = boardValues(parsed);
        const details = { nests: parsed.nests, pickups: parsed.pickups, golds: parsed.goldPickups, hops: parsed.hops, deaths: parsed.deaths, level: parsed.level, durationMs: parsed.timeMs, characterId: parsed.characterId, score: parsed.score, ...(verdict.flags.length ? { flags: verdict.flags } : {}) };
        const ranks: Record<string, number | null> = {}, bests: Record<string, number | null> = {}, improved: Record<string, boolean> = {};
        for (const board of BOARD_IDS) {
          const v = values[board];
          improved[board] = false;
          if (v !== null) {
            // keep the better value only; an equal one keeps the earlier time (so the earlier player wins a tie)
            const cmp = board === 'fastest' ? '<' : '>';
            const r = await q(
              `insert into fz_cx_scores (week_key, board, user_id, value, details, created_at) values ($1, $2, $3, $4, $5, $6)
               on conflict (week_key, board, user_id) do update set value = excluded.value, details = excluded.details, created_at = excluded.created_at
               where excluded.value ${cmp} fz_cx_scores.value`, [week, board, u.id, v, JSON.stringify(details), now]);
            improved[board] = (r.rowCount ?? 0) > 0;
          }
          const { rows: mine } = await q<{ value: number; created_at: number }>('select value::float8 as value, created_at::float8 as created_at from fz_cx_scores where week_key = $1 and board = $2 and user_id = $3', [week, board, u.id]);
          bests[board] = mine[0] ? Number(mine[0].value) : null;
          ranks[board] = mine[0] ? await rankOf(week, board, Number(mine[0].value), Number(mine[0].created_at), u.id) : null;
        }
        return { accepted: true, week, ranks, bests, improved, flagged: verdict.flags.length > 0 };
      }

      // ---------- reading a board (public) ----------
      case 'board.get': {
        await hit(`r:${ip}`, 60_000, READS_PER_MIN, 'Too many looks at the boards — try again in a moment.');
        if (!isBoard(b.board)) throw new HttpError(400, 'Unknown board.');
        const board: Board = b.board;
        const week = resolveWeek(b.week, now);
        const limit = Math.min(MAX_ROWS, Math.max(1, Math.floor(Number(b.limit)) || 25));
        const me = await optionalUser(req);
        const dir = valueOrder(board);
        const { rows } = await q<{ user_id: string; value: number; ch: string | null; username: string; avatar: unknown }>(
          `select s.user_id, s.value::float8 as value, s.details->>'characterId' as ch, u.username, p.avatar
             from fz_cx_scores s join fz_users u on u.id = s.user_id left join fz_cx_players p on p.user_id = s.user_id
            where s.week_key = $1 and s.board = $2 order by s.value ${dir}, s.created_at asc, s.user_id asc limit $3`, [week, board, limit]);
        const { rows: tot } = await q<{ n: number }>('select count(*)::int as n from fz_cx_scores where week_key = $1 and board = $2', [week, board]);
        let mine: { rank: number; value: number; characterId: string | null } | null = null;
        if (me) {
          const { rows: m } = await q<{ value: number; created_at: number; ch: string | null }>("select value::float8 as value, created_at::float8 as created_at, details->>'characterId' as ch from fz_cx_scores where week_key = $1 and board = $2 and user_id = $3", [week, board, me.id]);
          if (m[0]) mine = { rank: await rankOf(week, board, Number(m[0].value), Number(m[0].created_at), me.id), value: Number(m[0].value), characterId: m[0].ch };
        }
        const range = weekRange(week)!;
        return {
          board, week, current: weekKey(now), weekStart: range.start, weekEnd: range.end, now, endsInMs: Math.max(0, range.end - now),
          rows: rows.map((r, i) => ({ rank: i + 1, username: r.username, avatar: publicAvatar(r.avatar), value: Number(r.value), characterId: r.ch, you: !!me && r.user_id === me.id })),
          me: mine, total: tot[0].n,
        };
      }

      // ---------- a player on the boards (the card you get by tapping a row) ----------
      case 'player.get': {
        await hit(`r:${ip}`, 60_000, READS_PER_MIN, 'Too many looks at the boards — try again in a moment.');
        const name = typeof b.username === 'string' ? b.username.trim().slice(0, 60) : '';
        const week = resolveWeek(b.week, now);
        const { rows: who } = name ? await q<{ id: string; username: string }>(
          'select u.id, u.username from fz_users u where u.username = $1 and exists (select 1 from fz_cx_scores s where s.user_id = u.id)', [name]) : { rows: [] as { id: string; username: string }[] };
        if (!who[0]) throw new HttpError(404, 'That player isn’t on the boards.');
        const { rows: av } = await q('select avatar from fz_cx_players where user_id = $1', [who[0].id]);
        const { rows: mine } = await q<{ board: string; value: number; created_at: number; d: Record<string, unknown> }>(
          'select board, value::float8 as value, created_at::float8 as created_at, details as d from fz_cx_scores where user_id = $1 and week_key = $2', [who[0].id, week]);
        const boards: Record<string, unknown> = { score: null, fastest: null, streak: null };
        for (const m of mine) {
          if (!isBoard(m.board)) continue;
          const d = m.d ?? {};
          const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
          boards[m.board] = { rank: await rankOf(week, m.board, Number(m.value), Number(m.created_at), who[0].id), value: Number(m.value), characterId: typeof d.characterId === 'string' ? d.characterId : null, level: n(d.level), nests: n(d.nests), pickups: n(d.pickups), deaths: n(d.deaths) };
        }
        const { rows: car } = await q<{ weeks: number; wins: number; podiums: number }>(
          `select (select count(distinct week_key)::int from fz_cx_scores where user_id = $1) as weeks,
                  count(*) filter (where tier = 1)::int as wins, count(*) filter (where tier <= 3)::int as podiums from fz_cx_claims where user_id = $1`, [who[0].id]);
        return { username: who[0].username, avatar: publicAvatar(av[0]?.avatar), week, boards, career: car[0] };
      }

      // ---------- last week's rewards ----------
      case 'weekly.status': {
        const u = await requireUser(req);
        await hit(`r:${ip}`, 60_000, READS_PER_MIN, 'Too many looks at the boards — try again in a moment.');
        const cur = weekKey(now);
        const oldest = weekKey(now - CLAIM_WEEKS * WEEK_MS);
        const { rows } = await q<{ week_key: string; board: string; value: number; created_at: number }>(
          `select s.week_key, s.board, s.value::float8 as value, s.created_at::float8 as created_at from fz_cx_scores s
             left join fz_cx_claims c on c.user_id = s.user_id and c.week_key = s.week_key and c.board = s.board
            where s.user_id = $1 and c.user_id is null and s.week_key < $2 and s.week_key >= $3 order by s.week_key, s.board`, [u.id, cur, oldest]);
        const byWeek = new Map<string, { board: Board; rank: number; tier: number; reward: unknown }[]>();
        for (const r of rows) {
          if (!isBoard(r.board)) continue;
          const rank = await rankOf(r.week_key, r.board, Number(r.value), Number(r.created_at), u.id);
          const reward = rewardFor(r.week_key, r.board, rank);
          if (!reward) continue;
          byWeek.set(r.week_key, [...(byWeek.get(r.week_key) ?? []), { board: r.board, rank, tier: reward.tier, reward }]);
        }
        return { now, current: cur, claimable: [...byWeek].map(([week, boards]) => ({ week, boards })) };
      }

      case 'weekly.claim': {
        const u = await requireUser(req);
        await hit(`c:${u.id}`, 60_000, 12, 'Slow down a little — try again in a minute.');
        const cur = weekKey(now);
        const week = resolveWeek(b.week, now);
        if (week >= cur) throw new HttpError(400, 'That week isn’t finished yet — rewards come when it ends.');
        if (week < weekKey(now - CLAIM_WEEKS * WEEK_MS)) throw new HttpError(400, 'That week’s rewards have expired.');
        const { rows: mine } = await q<{ board: string; value: number; created_at: number }>('select board, value::float8 as value, created_at::float8 as created_at from fz_cx_scores where user_id = $1 and week_key = $2', [u.id, week]);
        const fresh = new Set<string>();
        for (const s of mine) {
          if (!isBoard(s.board)) continue;
          const rank = await rankOf(week, s.board, Number(s.value), Number(s.created_at), u.id);
          // the first claim records the rank for good; claiming again (or from another device) just reads it back
          const ins = await q('insert into fz_cx_claims (user_id, week_key, board, rank, tier, claimed_at) values ($1, $2, $3, $4, $5, $6) on conflict (user_id, week_key, board) do nothing', [u.id, week, s.board, rank, tierOf(rank), now]);
          if ((ins.rowCount ?? 0) > 0) fresh.add(s.board);
        }
        const { rows: done } = await q<{ board: string; rank: number }>('select board, rank from fz_cx_claims where user_id = $1 and week_key = $2 order by board', [u.id, week]);
        const claimed = done.flatMap((c) => {
          if (!isBoard(c.board)) return [];
          const reward = rewardFor(week, c.board, c.rank);
          return reward ? [{ board: c.board, rank: c.rank, tier: reward.tier, reward, repeat: !fresh.has(c.board) }] : [];
        });
        return { week, claimed };
      }

      default:
        throw new HttpError(400, 'Unknown action.');
    }
  });
}
