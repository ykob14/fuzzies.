// API tests for the Fuzzy Crossing weekly boards against a real Postgres and the cloud dev server.
//   BASE=http://127.0.0.1:5340/api DATABASE_URL=postgresql://postgres:x@127.0.0.1:5433/fz node tools/crossing/boards-api.mjs
// The dev server must run with PAY_TEST=1 (the tests move the server's clock with the x-cx-now header, which production ignores).
// BASE_PROD (optional) = a second dev server started WITHOUT PAY_TEST: checks that the clock header is ignored there.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const pg = require('pg');

const BASE = process.env.BASE || 'http://127.0.0.1:5340/api';
const db = new pg.Client({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres:x@127.0.0.1:5433/fz' });
await db.connect();
// the fake weeks used below must start empty: clear the boards tables of the (local, throw-away) test database
if (!/127\.0\.0\.1|localhost/.test(db.connectionParameters.host || '')) throw new Error('refusing to clear tables on a non-local database');
await db.query('delete from fz_cx_scores; delete from fz_cx_claims; delete from fz_cx_runs; delete from fz_cx_hits; delete from fz_cx_players');

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗', m); } };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m} (got ${JSON.stringify(a)}, wanted ${JSON.stringify(b)})`);
const rnd = () => Math.floor(Math.random() * 250);
async function post(ep, body, token, o = {}) {
  const headers = { 'content-type': 'application/json', 'x-forwarded-for': o.ip ?? `10.7.${rnd()}.${rnd()}` };
  if (token) headers.authorization = `Bearer ${token}`;
  if (o.now) headers['x-cx-now'] = String(o.now);
  const r = await fetch(`${o.base ?? BASE}/${ep}`, { method: 'POST', headers, body: JSON.stringify(body) });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}
const cx = (body, token, o) => post('crossing', body, token, o);
const T = (y, m, d, h = 12, mi = 0, s = 0) => Date.UTC(y, m - 1, d, h, mi, s);
const MIN = 60_000;

const tag = 'bd' + Date.now().toString(36);
async function signup(name) {
  const u = `${tag}${name}`;
  const s = await post('auth', { action: 'signup', email: `${u}@example.com`, username: u, password: 'Password123!', name });
  if (!s.body.token) throw new Error('signup failed ' + JSON.stringify(s));
  const me = await db.query('select id from fz_users where username = $1', [u]);
  return { name: u, token: s.body.token, id: me.rows[0].id };
}
/** a believable finished run (2 levels, all lives used, ~2.5 minutes) */
const good = (over = {}) => ({ score: 1500, level: 2, nests: 7, pickups: 12, goldPickups: 2, hops: 190, deaths: 3, timeMs: 150_000, firstFiveNestsMs: 38_000, bestStreak: 5, characterId: 'classic', ...over });
/** play a whole run at a fake clock: start at t, finish `elapsed` ms later */
async function play(user, t, result, elapsed = 156_000) {
  const s = await cx({ action: 'run.start', mode: 'classic' }, user.token, { now: t });
  if (s.status !== 200) return { start: s, finish: null };
  const f = await cx({ action: 'run.finish', runId: s.body.runId, nonce: s.body.nonce, result }, user.token, { now: t + elapsed });
  return { start: s, finish: f };
}
const board = (b, week, token, limit, now) => cx({ action: 'board.get', board: b, week, limit }, token, { now });

console.log('— sign-up, runs, replay, guests');
const A = await signup('a'), B = await signup('b');
const t0 = T(2026, 10, 14); // Wednesday of 2026-W42
{
  const noTok = await cx({ action: 'run.start' }, undefined, { now: t0 });
  eq(noTok.status, 401, 'guest / no token cannot start a run');
  const bad = await cx({ action: 'run.start' }, 'garbage.token', { now: t0 });
  eq(bad.status, 401, 'a forged token cannot start a run');
  eq((await cx({ action: 'run.finish', runId: '00000000-0000-4000-8000-000000000000', nonce: 'x', result: good() }, undefined, { now: t0 })).status, 401, 'no token cannot finish');
  eq((await cx({ action: 'weekly.claim', week: 'previous' }, undefined, { now: t0 })).status, 401, 'no token cannot claim');
  eq((await cx({ action: 'weekly.status' }, undefined, { now: t0 })).status, 401, 'no token has no status');
  eq((await cx({ action: 'nope' }, A.token, { now: t0 })).status, 400, 'unknown action → 400');
  eq((await cx({ action: 'run.start', mode: 'endless' }, A.token, { now: t0 })).status, 400, 'only Classic runs count');

  const s = await cx({ action: 'run.start', mode: 'classic' }, A.token, { now: t0 });
  eq(s.status, 200, 'run.start works for a signed-in player');
  ok(/^[0-9a-f-]{36}$/.test(s.body.runId) && s.body.nonce.length >= 30, 'run id + secret nonce issued');
  eq(s.body.week, '2026-W42', 'the server says which week it is');
  eq(s.body.serverNow, t0, 'the server clock is returned');
  ok(s.body.expiresAt === t0 + 45 * MIN, 'a run lasts 45 minutes');
  const f = await cx({ action: 'run.finish', runId: s.body.runId, nonce: s.body.nonce, result: good({ week: '2020-W01', characterId: 'classic' }) }, A.token, { now: t0 + 156_000 });
  eq(f.body.accepted, true, 'the happy path is accepted');
  eq(f.body.week, '2026-W42', 'the week is the SERVER’s (the client’s week field is ignored)');
  eq(f.body.ranks, { score: 1, fastest: 1, streak: 1 }, 'first player is #1 on all three boards');
  eq(f.body.bests, { score: 1500, fastest: 38000, streak: 5 }, 'bests are returned');
  eq(f.body.improved, { score: true, fastest: true, streak: true }, 'all three improved');
  const row = (await db.query("select week_key from fz_cx_scores where user_id = $1", [A.id])).rows;
  ok(row.length === 3 && row.every((r) => r.week_key === '2026-W42'), 'three rows stored under 2026-W42');
  const again = await cx({ action: 'run.finish', runId: s.body.runId, nonce: s.body.nonce, result: good({ score: 2000 }) }, A.token, { now: t0 + 157_000 });
  eq(again.body.accepted, false, 'the same run cannot be finished twice (replay refused)');
  eq((await board('score', 'current', undefined, 5, t0)).body.rows[0].value, 1500, 'the replay did not change the score');

  const ghost = await cx({ action: 'run.finish', runId: '11111111-2222-4333-8444-555555555555', nonce: 'abc', result: good() }, A.token, { now: t0 });
  eq(ghost.body.accepted, false, 'finishing a run that was never started is refused');
  eq((await cx({ action: 'run.finish', runId: 'not-a-uuid', nonce: 'abc', result: good() }, A.token, { now: t0 })).body.accepted, false, 'a junk run id is refused');
  eq((await cx({ action: 'run.finish', result: good() }, A.token, { now: t0 })).body.accepted, false, 'missing run id is refused');
}

console.log('— other people’s runs, wrong secret, one open run');
{
  const s = await cx({ action: 'run.start' }, A.token, { now: t0 + 10 * MIN });
  const steal = await cx({ action: 'run.finish', runId: s.body.runId, nonce: s.body.nonce, result: good({ score: 2400 }) }, B.token, { now: t0 + 10 * MIN + 156_000 });
  eq(steal.body.accepted, false, 'B cannot finish A’s run even with the secret');
  const wrong = await cx({ action: 'run.finish', runId: s.body.runId, nonce: 'wrong-secret', result: good({ score: 2400 }) }, A.token, { now: t0 + 10 * MIN + 156_000 });
  eq(wrong.body.accepted, false, 'a wrong secret is refused');
  const fine = await cx({ action: 'run.finish', runId: s.body.runId, nonce: s.body.nonce, result: good({ score: 1800 }) }, A.token, { now: t0 + 10 * MIN + 156_000 });
  eq(fine.body.accepted, true, 'the real owner can still finish after those attempts (run stayed open)');
  eq(fine.body.improved.score, true, 'a better score replaces the old one'); eq(fine.body.bests.score, 1800, 'best is now 1800');
  eq(fine.body.improved.fastest, false, 'an equal fastest time is not an improvement (earlier wins)');
  // worse run: no change
  const worse = await play(A, t0 + 20 * MIN, good({ score: 1000, firstFiveNestsMs: 60_000, bestStreak: 5 }));
  eq(worse.finish.body.accepted, true, 'a worse run is still accepted');
  eq(worse.finish.body.improved, { score: false, fastest: false, streak: false }, 'but improves nothing');
  eq(worse.finish.body.bests, { score: 1800, fastest: 38000, streak: 5 }, 'the best values are kept');
  // new start abandons the old run
  const s1 = await cx({ action: 'run.start' }, B.token, { now: t0 + 30 * MIN });
  const s2 = await cx({ action: 'run.start' }, B.token, { now: t0 + 30 * MIN + 1000 });
  const old = await cx({ action: 'run.finish', runId: s1.body.runId, nonce: s1.body.nonce, result: good() }, B.token, { now: t0 + 30 * MIN + 160_000 });
  eq(old.body.accepted, false, 'starting a new run abandons the old one (one open run per player)');
  const open = (await db.query("select count(*)::int as n from fz_cx_runs where user_id = $1 and status = 'open'", [B.id])).rows[0].n;
  eq(open, 1, 'exactly one open run');
  const cur = await cx({ action: 'run.finish', runId: s2.body.runId, nonce: s2.body.nonce, result: good({ score: 1200, characterId: 'mint' }) }, B.token, { now: t0 + 30 * MIN + 160_000 });
  eq(cur.body.accepted, true, 'the newest run can be finished');
  // two starts racing
  const race = await Promise.all([cx({ action: 'run.start' }, B.token, { now: t0 + 40 * MIN }), cx({ action: 'run.start' }, B.token, { now: t0 + 40 * MIN })]);
  ok(race.every((r) => r.status === 200), 'two starts at the same moment both answer');
  eq((await db.query("select count(*)::int as n from fz_cx_runs where user_id = $1 and status = 'open'", [B.id])).rows[0].n, 1, 'still exactly one open run after a race');
}

console.log('— cheating attempts (each is one run, one shot)');
{
  const cheaters = [await signup('cheat0')];
  let used = 0;
  const attempt = async (label, result, reason, { elapsed = 156_000, startOffset = 0 } = {}) => {
    if (++used % 8 === 0) cheaters.push(await signup('cheat' + used));
    const U = cheaters[cheaters.length - 1];
    const r = await play(U, t0 + 60 * MIN + (startOffset || 0) + Math.floor(Math.random() * 1000), result, elapsed);
    ok(r.finish?.body.accepted === false, `${label}: refused`);
    if (reason) eq(r.finish?.body.reason, reason, `${label}: reason code`);
    ok(typeof r.finish?.body.message === 'string' && r.finish.body.message.length > 10 && !/hop|score|rate|plausib/i.test(r.finish.body.message), `${label}: friendly message that doesn't explain the check`);
    return r;
  };
  await attempt('impossible hop rate', good({ hops: 5000 }), 'hop_rate');
  await attempt('impossible score', good({ score: 99_999 }), 'score');
  await attempt('absurd score (parse cap)', good({ score: 9_999_999 }), 'shape');
  await attempt('too-fast fastest crossing', good({ firstFiveNestsMs: 6_000 }), 'fastest_min');
  await attempt('fastest at 9 s', good({ firstFiveNestsMs: 9_000 }), 'fastest_min');
  await attempt('streak longer than nests', good({ bestStreak: 9 }), 'streak');
  await attempt('no deaths but a short streak', good({ deaths: 0, bestStreak: 3 }), 'streak');
  await attempt('unknown Fuzzy', good({ characterId: 'ghost-in-the-machine' }), 'character');
  await attempt('prototype key as Fuzzy', good({ characterId: '__proto__' }), 'character');
  await attempt('more time than the server saw', good({ timeMs: 400_000 }), 'time_server');
  await attempt('level that does not match nests', good({ level: 9 }), 'level');
  await attempt('fewer hops than the nests need', good({ hops: 20 }), 'hops_min');
  await attempt('more pickups than tokens can spawn', good({ pickups: 300 }), 'pickup_rate');
  await attempt('float numbers', good({ score: 1500.5 }), 'shape');
  await attempt('numbers as text', good({ score: '1500' }), 'shape');
  await attempt('negative score', good({ score: -5 }), 'shape');
  await attempt('missing field', (() => { const r = good(); delete r.deaths; return r; })(), 'shape');
  await attempt('result is not an object', 'hello', 'shape');
  await attempt('oversized json', good({ junk: 'x'.repeat(2000) }), 'shape');
  await attempt('five-nest time without five nests', good({ nests: 3, level: 1, bestStreak: 3, hops: 40, score: 400, firstFiveNestsMs: 30_000 }), 'fastest_nests');
  await attempt('fastest longer than the whole run', good({ firstFiveNestsMs: 160_000 }), 'fastest_time');
  const U = cheaters[cheaters.length - 1];
  const exp = await play(U, t0 + 120 * MIN, good(), 46 * MIN);
  eq(exp.finish.body.accepted, false, 'a run finished after 45 minutes is refused'); eq(exp.finish.body.reason, 'expired', 'reason: expired');
  const none = (await db.query("select count(*)::int as n from fz_cx_scores where user_id = any($1)", [cheaters.map((c) => c.id)])).rows[0].n;
  eq(none, 0, 'none of the cheating attempts reached the boards');
  const logged = (await db.query("select count(*)::int as n from fz_cx_runs where user_id = any($1) and status like 'rejected:%'", [cheaters.map((c) => c.id)])).rows[0].n;
  ok(logged >= 20, `rejections are logged on the run rows (${logged})`);
  // a flagged-but-accepted run: a suspiciously fast (yet possible) crossing
  const sus = await play(U, t0 + 200 * MIN, good({ firstFiveNestsMs: 16_000 }));
  eq(sus.finish.body.accepted, true, 'a very fast but possible time is accepted…'); eq(sus.finish.body.flagged, true, '…and flagged for a look');
  const fl = (await db.query("select flags from fz_cx_runs where id = $1", [sus.start.body.runId])).rows[0].flags;
  ok(fl.includes('fast_nests'), 'the flag is stored on the run');
}

console.log('— boards: order, ties, you, limits, privacy');
const wk = T(2026, 11, 3); // 2026-W45 (Tue); fresh week for ranking tests
const players = [];
for (let i = 0; i < 6; i++) players.push(await signup('p' + i));
{
  // scores 2100, 2400, 2400 (tie), 900, 1500, 2000
  const scores = [2100, 2400, 2400, 900, 1500, 2000];
  const streaks = [5, 6, 6, 7, 5, 8];
  const fast = [30_000, 25_000, 25_000, null, 45_000, 22_000];
  let t = wk;
  for (let i = 0; i < 6; i++) {
    t += 30 * MIN; // p1 reaches 2400 before p2
    const nests = streaks[i], level = 1 + Math.floor(nests / 5);
    const r = await play(players[i], t, good({ score: scores[i], nests, level, deaths: 3, bestStreak: nests, hops: nests * 12 + 10, pickups: 40, goldPickups: 0, firstFiveNestsMs: fast[i], characterId: i === 3 ? 'mint' : 'classic' }));
    ok(r.finish?.body.accepted === true, `player ${i} submitted`);
    if (!r.finish?.body.accepted) console.log(JSON.stringify(r.finish?.body));
  }
  const sb = await board('score', 'current', undefined, 10, wk + 5 * 3600_000);
  eq(sb.body.rows.map((r) => r.username.replace(tag, '')), ['p1', 'p2', 'p0', 'p5', 'p4', 'p3'], 'score board: high to low, the earlier submission wins the tie');
  eq(sb.body.rows.map((r) => r.rank), [1, 2, 3, 4, 5, 6], 'ranks are 1..n');
  eq(sb.body.total, 6, 'total counts everyone');
  ok(sb.body.me === null && sb.body.rows.every((r) => r.you === false), 'a visitor has no "you"');
  const fb = await board('fastest', 'current', undefined, 10, wk + 5 * 3600_000);
  eq(fb.body.rows.map((r) => r.username.replace(tag, '')), ['p5', 'p1', 'p2', 'p0', 'p4'], 'fastest board: lowest time first, ties by who got there first, p3 has no time');
  eq(fb.body.rows.map((r) => r.value), [22_000, 25_000, 25_000, 30_000, 45_000], 'fastest values');
  const stb = await board('streak', 'current', undefined, 10, wk + 5 * 3600_000);
  eq(stb.body.rows.map((r) => r.value), [8, 7, 6, 6, 5, 5], 'streak board values');
  eq(stb.body.rows.map((r) => r.username.replace(tag, '')), ['p5', 'p3', 'p1', 'p2', 'p0', 'p4'], 'streak ties: earlier first');
  eq(sb.body.rows[5].characterId, 'mint', 'the Fuzzy that played the run is shown');
  // "you" + own rank beyond the limit
  const me = await board('score', 'current', players[3].token, 3, wk + 5 * 3600_000);
  eq(me.body.rows.length, 3, 'limit 3 returns 3 rows'); eq(me.body.me?.rank, 6, 'my own rank is computed in SQL even outside the list'); eq(me.body.me?.value, 900, 'and my value');
  ok(me.body.rows.every((r) => r.you === false), 'my row is not in the top 3');
  const me2 = await board('score', 'current', players[1].token, 10, wk + 5 * 3600_000);
  eq(me2.body.rows.filter((r) => r.you).map((r) => r.rank), [1], 'exactly my row is marked');
  eq((await board('score', 'current', 'forged.token', 5, wk)).status, 200, 'a bad token on a read just means "visitor"');
  // limits
  eq((await board('score', 'current', undefined, 500, wk)).body.rows.length, 6, 'limit above 50 is capped (6 rows exist)');
  eq((await board('score', 'current', undefined, 0, wk)).status, 200, 'limit 0 falls back to a default'); eq((await board('score', 'current', undefined, -4, wk)).status, 200, 'negative limit falls back');
  eq((await board('score', 'current', undefined, 'abc', wk)).status, 200, 'text limit falls back');
  eq((await cx({ action: 'board.get', board: 'bogus' }, undefined, { now: wk })).status, 400, 'unknown board → 400');
  eq((await cx({ action: 'board.get' }, undefined, { now: wk })).status, 400, 'missing board → 400');
  eq((await board('score', '2026-W99', undefined, 5, wk)).status, 400, 'impossible week → 400');
  eq((await board('score', '2026-W50', undefined, 5, wk)).status, 400, 'a future week → 400');
  eq((await board('score', '1999-W01', undefined, 5, wk)).status, 400, 'an ancient week → 400');
  eq((await board('score', "2026-W45'; drop table fz_users;--", undefined, 5, wk)).status, 400, 'SQL in the week → 400');
  eq((await board('score', 'previous', undefined, 5, wk)).body.rows.length, 0, 'last week (W44) is empty');
  // countdown
  const cd = await board('score', 'current', undefined, 5, T(2026, 11, 8, 23, 0));
  eq(cd.body.endsInMs, 60 * MIN, 'one hour before Monday 00:00 UTC the countdown says one hour');
  // privacy: only these fields leave the server
  const row = sb.body.rows[0];
  eq(Object.keys(row).sort(), ['avatar', 'characterId', 'rank', 'username', 'value', 'you'], 'a row has no email, id or anything else');
  ok(!JSON.stringify(sb.body).includes('@') && !JSON.stringify(sb.body).includes(players[0].id), 'no email address or user id anywhere in the answer');
  eq(Object.keys(row.avatar).filter((k) => !['emoji', 'color', 'friend'].includes(k)), [], 'avatar is emoji/colour/friend only');
}

console.log('— avatars are sanitised');
{
  const prof = (await db.query('select user_id from fz_profiles where user_id = $1', [players[0].id])).rowCount;
  const data = { name: 'x', avatar: { emoji: '<img src=x onerror=alert(1)>🙂&"\'`', color: 'red;background:url(//evil)', image: 'data:image/png;base64,AAAA' }, stats: {} };
  if (prof) await db.query('update fz_profiles set data = $2 where user_id = $1', [players[0].id, JSON.stringify(data)]);
  else await db.query('insert into fz_profiles (user_id, data, updated_at) values ($1, $2, 1)', [players[0].id, JSON.stringify(data)]);
  // the snapshot is refreshed on the player's next run
  await play(players[0], wk + 2 * 24 * 3600_000, good({ score: 100, deaths: 3, bestStreak: 5 }));
  const sb = await board('score', 'current', undefined, 10, wk + 3 * 24 * 3600_000);
  const a = sb.body.rows.find((r) => r.username === players[0].name).avatar;
  ok(!/[<>&"'`]/.test(a.emoji), `emoji is stripped of markup (${JSON.stringify(a.emoji)})`);
  eq(a.color, '#d6336c', 'a non-hex colour falls back to the brand colour'); ok(a.friend === undefined, 'a data: avatar image is never sent');
  await db.query('update fz_profiles set data = $2 where user_id = $1', [players[0].id, JSON.stringify({ avatar: { emoji: '🦊', color: '#12ab34', image: './art/friends/f07.webp' } })]);
  await play(players[0], wk + 2 * 24 * 3600_000 + 40 * MIN, good({ score: 100, deaths: 3, bestStreak: 5 }));
  const sb2 = await board('score', 'current', undefined, 10, wk + 3 * 24 * 3600_000);
  eq(sb2.body.rows.find((r) => r.username === players[0].name).avatar, { emoji: '🦊', color: '#12ab34', friend: 'f07' }, 'a Fuzzy Friend avatar is sent as its id');
}

console.log('— player cards');
{
  const pc = await cx({ action: 'player.get', username: players[1].name, week: 'current' }, undefined, { now: wk + 5 * 3600_000 });
  eq(pc.status, 200, 'anyone can open a player card');
  eq(pc.body.username, players[1].name, 'the card is for that player');
  eq(pc.body.boards.score.rank, 1, 'rank on the score board'); eq(pc.body.boards.score.value, 2400, 'value on the score board');
  eq(pc.body.boards.fastest.rank, 2, 'rank on fastest'); eq(pc.body.boards.streak.rank, 3, 'rank on streak');
  eq(Object.keys(pc.body.boards.score).sort(), ['characterId', 'deaths', 'level', 'nests', 'pickups', 'rank', 'value'], 'only game statistics, nothing private');
  ok(!JSON.stringify(pc.body).includes('@') && !JSON.stringify(pc.body).includes(players[1].id), 'no email or id on a player card');
  eq(pc.body.career.weeks >= 1, true, 'career: weeks on the boards');
  const none = await cx({ action: 'player.get', username: 'nobody-by-this-name' }, undefined, { now: wk });
  eq(none.status, 404, 'an unknown name → 404');
  const lurk = await signup('quiet');
  eq((await cx({ action: 'player.get', username: lurk.name }, undefined, { now: wk })).status, 404, 'a player with no score looks the same as an unknown one (no account probing)');
  eq((await cx({ action: 'player.get', username: { $ne: 1 } }, undefined, { now: wk })).status, 404, 'a non-text name → 404');
  eq((await cx({ action: 'player.get', username: players[1].name, week: '2026-W99' }, undefined, { now: wk })).status, 400, 'bad week → 400');
  const other = await cx({ action: 'player.get', username: players[1].name, week: 'previous' }, undefined, { now: wk + 5 * 3600_000 });
  eq(other.body.boards.score, null, 'a week with no result shows no board entry');
}

console.log('— the week rolls over; claiming last week’s rewards');
{
  const w46 = T(2026, 11, 10, 9); // Tuesday of 2026-W46
  eq((await board('score', 'current', undefined, 5, w46)).body.rows.length, 0, 'the new week’s board is empty');
  const prev = await board('score', 'previous', players[1].token, 5, w46);
  eq(prev.body.week, '2026-W45', '"previous" is the week that just ended'); eq(prev.body.rows.length, 5, 'and it still holds its scores');
  eq(prev.body.endsInMs, 0, 'a finished week has no countdown');
  const cur = await board('score', 'current', players[1].token, 5, w46);
  eq(cur.body.me, null, 'my rank in the new week: none yet');
  // a run that STARTS before midnight Sunday and ends after goes to the new week
  const lastSecond = T(2026, 11, 8, 23, 58);
  const edge = await play(players[4], lastSecond, good({ score: 2300, deaths: 3, bestStreak: 5 }), 156_000);
  eq(edge.finish.body.week, '2026-W46', 'a run finished after Monday 00:00 UTC counts for the new week');
  eq(edge.finish.body.ranks.score, 1, 'and is #1 there');
  eq((await board('score', '2026-W45', undefined, 10, w46)).body.rows.find((r) => r.username === players[4].name).value, 1500, 'last week’s board was not touched');

  // status + claim
  const st = await cx({ action: 'weekly.status' }, players[1].token, { now: w46 });
  eq(st.body.claimable.length, 1, 'p1 has one claimable week'); eq(st.body.claimable[0].week, '2026-W45', 'the week is W45');
  eq(st.body.claimable[0].boards.map((b) => [b.board, b.rank, b.tier]), [['fastest', 2, 3], ['score', 1, 1], ['streak', 3, 3]], 'ranks and tiers per board');
  const cl = await cx({ action: 'weekly.claim', week: 'previous' }, players[1].token, { now: w46 });
  eq(cl.status, 200, 'claim works for the finished week');
  eq(cl.body.week, '2026-W45', 'claimed week');
  const byBoard = Object.fromEntries(cl.body.claimed.map((c) => [c.board, c]));
  eq(byBoard.score.rank, 1, 'score rank 1'); eq(byBoard.score.reward.trophy, 'week-2026-W45-score-1', 'trophy id');
  ok(byBoard.score.reward.characters.includes('nebula') && byBoard.score.reward.cosmetics.includes('cele-champion'), '#1 reward includes Nebula + Champion pose');
  eq(byBoard.fastest.tier, 3, 'fastest rank 2 → podium tier'); eq(byBoard.streak.tier, 3, 'streak rank 3 → podium tier');
  ok(cl.body.claimed.every((c) => c.repeat === false), 'first claim: nothing is a repeat');
  // idempotent
  const again = await cx({ action: 'weekly.claim', week: 'previous' }, players[1].token, { now: w46 + 1000 });
  ok(again.body.claimed.length === 3 && again.body.claimed.every((c) => c.repeat === true), 'claiming again returns the same rewards marked as repeats');
  eq(again.body.claimed.map((c) => c.rank), cl.body.claimed.map((c) => c.rank), 'the rank is frozen at the first claim');
  eq((await cx({ action: 'weekly.status' }, players[1].token, { now: w46 })).body.claimable.length, 0, 'nothing left to claim afterwards');
  // concurrent claims → one set of rows
  const conc = await Promise.all([1, 2, 3, 4].map(() => cx({ action: 'weekly.claim', week: '2026-W45' }, players[2].token, { now: w46 })));
  eq(conc.filter((c) => c.body.claimed.some((x) => !x.repeat)).length >= 1, true, 'concurrent claims: at least one saw the fresh rewards');
  eq((await db.query('select count(*)::int as n from fz_cx_claims where user_id = $1', [players[2].id])).rows[0].n, 3, 'concurrent claims wrote exactly 3 rows');
  // refusals
  eq((await cx({ action: 'weekly.claim', week: 'current' }, players[1].token, { now: w46 })).status, 400, 'the current week cannot be claimed');
  eq((await cx({ action: 'weekly.claim', week: '2026-W46' }, players[1].token, { now: w46 })).status, 400, 'by key either');
  eq((await cx({ action: 'weekly.claim', week: '2026-W47' }, players[1].token, { now: w46 })).status, 400, 'a future week is refused');
  eq((await cx({ action: 'weekly.claim', week: '2026-W30' }, players[1].token, { now: w46 })).status, 400, 'a week older than 8 weeks has expired');
  eq((await cx({ action: 'weekly.claim', week: 'nonsense' }, players[1].token, { now: w46 })).status, 400, 'a junk week is refused');
  const nobody = await signup('lurker');
  eq((await cx({ action: 'weekly.claim', week: 'previous' }, nobody.token, { now: w46 })).body.claimed, [], 'no score in that week → nothing to claim');
  eq((await cx({ action: 'weekly.status' }, nobody.token, { now: w46 })).body.claimable, [], 'and nothing in the status');
  // a rewarded week a bit later is still claimable (missed a week)
  const w47 = T(2026, 11, 17, 9);
  const late = await cx({ action: 'weekly.claim', week: '2026-W45' }, players[0].token, { now: w47 });
  eq(late.status, 200, 'a week missed by one week can still be claimed'); ok(late.body.claimed.length === 3 && late.body.claimed.every((c) => !c.repeat), 'p0 claims W45 two weeks later');
}

console.log('— reward tiers by final rank (seeded weeks with 101+ players)');
{
  // 130 stand-in players; the tested player is placed at a chosen rank in each of six finished weeks
  const ids = [];
  const stand = (await db.query("select id from fz_users where username like 'seed-bd-%' order by username")).rows.map((r) => r.id);
  for (let i = stand.length; i < 130; i++) {
    const u = `seed-bd-${String(i).padStart(3, '0')}`;
    const r = await db.query("insert into fz_users (email, username, pass) values ($1, $2, null) returning id", [`${u}@example.invalid`, u]);
    stand.push(r.rows[0].id);
  }
  ids.push(...stand);
  const T1 = await signup('tier');
  const weeks = [['2026-W31', 1], ['2026-W32', 3], ['2026-W33', 10], ['2026-W34', 25], ['2026-W35', 100], ['2026-W36', 101]];
  const created = T(2026, 7, 1);
  for (const [w, rank] of weeks) {
    await db.query("delete from fz_cx_scores where week_key = $1", [w]);
    // the seeded players score 10_000 − i; the tested player gets the value that sits just below rank-1 seeded players
    const rows = [];
    for (let i = 0; i < 129; i++) rows.push([w, 'score', stand[i], 100_000 - 2 * i, '{}', created + i]);
    for (const r of rows) await db.query('insert into fz_cx_scores (week_key, board, user_id, value, details, created_at) values ($1,$2,$3,$4,$5,$6)', r);
    await db.query('insert into fz_cx_scores (week_key, board, user_id, value, details, created_at) values ($1,$2,$3,$4,$5,$6)', [w, 'score', T1.id, 100_001 - 2 * (rank - 1), '{}', created]);
  }
  const now = T(2026, 9, 8, 10); // Tuesday of 2026-W37: W31..W36 are all within 8 weeks
  const st = await cx({ action: 'weekly.status' }, T1.token, { now });
  eq(st.body.claimable.map((c) => c.week), ['2026-W31', '2026-W32', '2026-W33', '2026-W34', '2026-W35'], 'rank 101 has nothing to claim, all five rewarded weeks are listed');
  const results = {};
  for (const [w] of weeks) results[w] = (await cx({ action: 'weekly.claim', week: w }, T1.token, { now })).body.claimed;
  const rk = (w) => results[w][0];
  eq([rk('2026-W31').rank, rk('2026-W31').tier], [1, 1], 'rank 1 → tier 1');
  eq([rk('2026-W32').rank, rk('2026-W32').tier], [3, 3], 'rank 3 → tier 3');
  eq([rk('2026-W33').rank, rk('2026-W33').tier], [10, 10], 'rank 10 → tier 10');
  eq([rk('2026-W34').rank, rk('2026-W34').tier], [25, 25], 'rank 25 → tier 25');
  eq([rk('2026-W35').rank, rk('2026-W35').tier], [100, 100], 'rank 100 → tier 100');
  eq(results['2026-W36'], [], 'rank 101 → no reward');
  eq(rk('2026-W34').reward.cosmetics, ['trail-neon'], 'top 25: Neon trail'); eq(rk('2026-W35').reward.coins, 200, 'top 100: 200 coins');
  eq(rk('2026-W33').reward.characters, ['rainbow'], 'top 10: Rainbow Fuzzy');
  eq(rk('2026-W32').reward.trophy, 'week-2026-W32-score-3', 'top 3 trophy id');
  const stored = (await db.query("select week_key, rank from fz_cx_claims where user_id = $1 and board = 'score' order by week_key", [T1.id])).rows;
  eq(stored.map((r) => r.rank), [1, 3, 10, 25, 100, 101], 'every claim stored its frozen rank (even rank 101, so it is not asked again)');
  // a big board: the tail of the list is computed in SQL, the page is capped
  const big = await board('score', '2026-W31', T1.token, 50, now);
  eq(big.body.rows.length, 50, 'a page is at most 50 rows'); eq(big.body.total, 130, 'total counts all 130'); eq(big.body.me.rank, 1, 'my rank');
  const tail = await board('score', '2026-W36', T1.token, 50, now);
  eq(tail.body.me.rank, 101, 'rank 101 is found without loading the whole board'); ok(tail.body.rows.every((r) => !r.you), 'and I am not in the first 50');
}

console.log('— rate limits');
{
  const R = await signup('rate');
  const t = T(2026, 12, 1, 6);
  let last = null, n = 0;
  for (; n < 45; n++) { last = await cx({ action: 'run.start' }, R.token, { now: t + n * 1000 }); if (last.status !== 200) break; }
  eq(n, 40, '40 runs an hour are allowed'); eq(last.status, 429, 'the 41st run start in an hour is refused (429)');
  ok(/lot of games/.test(last.body.error), 'with a friendly message');
  eq((await cx({ action: 'run.start' }, R.token, { now: t + 61 * MIN })).status, 200, 'an hour later runs are allowed again');
  // reads from one network address
  const ip = '10.99.1.1';
  let got429 = false;
  for (let i = 0; i < 120 && !got429; i++) { const r = await cx({ action: 'board.get', board: 'score', week: 'current' }, undefined, { ip, now: t }); if (r.status === 429) got429 = true; }
  ok(got429, 'reading the boards too fast from one address is slowed down (429)');
  eq((await cx({ action: 'board.get', board: 'score' }, undefined, { ip: '10.99.2.2', now: t })).status, 200, 'another address is unaffected');
}

console.log('— the clock override is a test feature only');
if (process.env.BASE_PROD) {
  const s = await cx({ action: 'run.start' }, (await (async () => { const u = `${tag}prod`; const r = await post('auth', { action: 'signup', email: `${u}@example.com`, username: u, password: 'Password123!', name: 'x' }, undefined, { base: process.env.BASE_PROD }); return r.body.token; })()), { now: T(2020, 1, 1), base: process.env.BASE_PROD });
  ok(s.status === 200 && Math.abs(s.body.serverNow - Date.now()) < 10_000, `a server without PAY_TEST ignores x-cx-now (serverNow ${new Date(s.body.serverNow).toISOString()})`);
} else console.log('  (skipped: set BASE_PROD to a dev server started without PAY_TEST)');

console.log(`\n${pass} passed, ${fail} failed`);
await db.end();
process.exit(fail ? 1 : 0);
