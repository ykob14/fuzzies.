// Browser test for the Fuzzy Crossing weekly boards: sign up (cloud), play a real game with the keys, see the score on the board,
// look at the leaderboard on a phone / tablet / computer (light + dark), collect last week's rewards, guest view.
//   URL=http://127.0.0.1:5340/ SHOTS=/some/dir DATABASE_URL=postgresql://postgres:x@127.0.0.1:5433/fz node tools/crossing/boards-browser.cjs
// Needs the cloud dev server (see boards-api.mjs). The game runs in Classic 2D here: the software-rendered 3D view is far too slow to play.
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const pg = require('pg');
const fs = require('fs');
const URL = process.env.URL || 'http://127.0.0.1:5340/';
const SHOTS = process.env.SHOTS || '/tmp/boards-shots';
fs.mkdirSync(SHOTS, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  ✗', m); } };
const errs = [];
const tag = 'bb' + Date.now().toString(36);

async function newPage(browser, kind) {
  const opts = kind === 'phone' ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true }
    : kind === 'tablet' ? { viewport: { width: 820, height: 1180 }, deviceScaleFactor: 1, hasTouch: true }
      : { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 };
  const ctx = await browser.newContext(opts);
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errs.push(`${kind}: ${e.message}`));
  p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|favicon|WebGL|GPU stall/i.test(m.text())) errs.push(`${kind} console: ${m.text().slice(0, 200)}`); });
  return p;
}
const shot = (p, name) => p.screenshot({ path: `${SHOTS}/${name}.png` });
const text = (p, sel) => p.locator(sel).first().innerText().catch(() => '');
const setSettings = (p, js) => p.evaluate(async (code) => { const { accounts } = await import('/src/core/account.ts'); accounts.update((a) => { new Function('a', code)(a); }); }, js);
const crossingSave = (p) => p.evaluate(async () => { const s = await import('/src/crossing/store.ts'); return JSON.parse(JSON.stringify(s.save())); });

(async () => {
  const db = new pg.Client({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres:x@127.0.0.1:5433/fz' });
  await db.connect();
  const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist'] });

  // ---------- 1. a guest sees the boards but cannot compete ----------
  const G = await newPage(browser, 'phone');
  await G.goto(URL); await wait(900);
  await G.click('text=Just looking? Continue as a guest'); await wait(900);
  await G.goto(URL + '#/play'); await wait(1500);
  ok(await G.locator('.fzx-tile:has-text("Boards")').count() === 1, 'guest: the menu has a Boards tile');
  await G.click('.fzx-tile:has-text("Boards")'); await wait(1500);
  ok(/Sign in to compete/.test(await text(G, '.fzb-notice')), 'guest: sees "Sign in to compete"');
  ok(await G.locator('.fzb-tab').count() === 3, 'guest: three board tabs');
  await shot(G, '01-guest-phone');
  await G.context().close();

  // ---------- 2. a cloud player ----------
  const P = await newPage(browser, 'phone');
  await P.goto(URL); await wait(900);
  await P.click('text=Create account');
  const user = tag + 'p';
  await P.fill('input[autocomplete=name]', 'Boards Tester'); await P.fill('input[autocomplete=username]', user);
  await P.fill('input[type=email]', `${user}@example.com`); await P.fill('input[type=password]', 'fuzzy123');
  await P.click('button:has-text("Create my account")'); await wait(3000);
  ok(/#\/home/.test(P.url()), 'signed up (cloud) and landed on Home');
  const me = (await db.query('select id from fz_users where username = $1', [user])).rows[0];
  ok(!!me, 'the account exists in the database');
  await setSettings(P, "a.settings.gameGfx = 'classic'; a.settings.reduceMotion = true; a.settings.sound = false; a.settings.music = false;");

  // last week's results for this player (and eight stand-ins), seeded straight into the database
  const prevWeek = '2026-W41';
  await db.query('delete from fz_cx_scores where week_key = $1', [prevWeek]);
  const stand = [];
  for (let i = 0; i < 8; i++) {
    const u = `seed-bb-${i}`;
    let r = await db.query('select id from fz_users where username = $1', [u]);
    if (!r.rows[0]) r = await db.query('insert into fz_users (email, username, pass) values ($1, $2, null) returning id', [`${u}@example.invalid`, u]);
    stand.push(r.rows[0].id);
    await db.query(`insert into fz_cx_players (user_id, avatar, updated_at) values ($1, $2, 1) on conflict (user_id) do update set avatar = excluded.avatar`, [r.rows[0].id, JSON.stringify({ emoji: ['🦊', '🐼', '🐸', '🦄', '🐙', '🦁', '🐰', '🐨'][i], color: ['#d6336c', '#2f9e8f', '#f08c00', '#4c6ef5', '#7048e8', '#e8590c', '#12b886', '#868e96'][i] })]);
  }
  const chars = ['classic', 'mint', 'sunny', 'ocean', 'berry', 'bee', 'sprout', 'chef'];
  const t = Date.UTC(2026, 9, 7, 10);
  const put = (uid, board, value, i, ch) => db.query('insert into fz_cx_scores (week_key, board, user_id, value, details, created_at) values ($1,$2,$3,$4,$5,$6)', [prevWeek, board, uid, value, JSON.stringify({ characterId: ch }), t + i * 1000]);
  const top = [3200, 2900, 2600, 2400, 2100, 1800, 1500, 1200];
  for (let i = 0; i < 8; i++) await put(stand[i], 'score', top[i] + (i >= 1 ? 0 : 0), i, chars[i]);
  await db.query("update fz_cx_scores set value = 3600 where week_key = $1 and board = 'score' and user_id = $2", [prevWeek, stand[0]]);
  await put(me.id, 'score', 3300, 20, 'classic'); // second of nine
  for (let i = 0; i < 6; i++) await put(stand[i], 'fastest', 21_000 + i * 2500, i, chars[i]);
  await put(me.id, 'fastest', 40_000, 20, 'classic'); // seventh
  for (let i = 0; i < 8; i++) await put(stand[i], 'streak', 12 - i, i, chars[i]);

  // ---------- 3. play a real game ----------
  await P.goto(URL + '#/play'); await wait(2000);
  ok(await P.locator('.fzx-tile:has-text("Boards")').count() === 1, 'player: Boards tile in the menu');
  await wait(1200);
  ok(await P.locator('.fzx-tile:has-text("Boards") .fzx-new').count() === 1, 'player: the Boards tile shows a dot (last week’s rewards are waiting)');
  await shot(P, '02-menu-phone');
  await P.click('button:has-text("Start playing")'); await wait(900);
  let over = false;
  const t0 = Date.now();
  while (!over && Date.now() - t0 < 120_000) {
    for (const k of ['ArrowUp', 'ArrowUp', 'ArrowUp', 'ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowUp']) { await P.keyboard.press(k); await wait(130); }
    over = await P.locator('.go-card h2:has-text("Game over"), .go-card h2:has-text("best score")').count() > 0;
  }
  ok(over, `the game ended by itself after ${Math.round((Date.now() - t0) / 1000)} s of play`);
  await wait(2500);
  const line = P.locator('.fzx-boardsline');
  ok(await line.count() === 1 && await line.isVisible(), 'game over: the weekly boards line appears');
  const lineText = await text(P, '.fzx-boardsline');
  ok(/#1/.test(lineText), `and says the player is #1 (${JSON.stringify(lineText)})`);
  await shot(P, '03-gameover-phone');
  const row = (await db.query("select value, details from fz_cx_scores where user_id = $1 and board = 'score' and week_key <> $2", [me.id, prevWeek])).rows[0];
  ok(row && Number(row.value) > 0, `the score ${row?.value} is on the server’s board`);
  const runRow = (await db.query("select status, result from fz_cx_runs where user_id = $1 order by started_at desc limit 1", [me.id])).rows[0];
  ok(runRow?.status === 'accepted' && runRow.result.hops > 0 && runRow.result.deaths === 3, `the run was accepted with the app’s own stats (hops ${runRow?.result?.hops}, deaths ${runRow?.result?.deaths}, ${runRow?.result?.timeMs} ms)`);

  // ---------- 4. the leaderboard, with the claim card ----------
  await P.click('button:has-text("Menu")'); await wait(1500);
  await P.click('.fzx-tile:has-text("Boards")'); await wait(2000);
  ok(await P.locator('.fzb-row.you').count() >= 1, 'leaderboard: my row is highlighted');
  ok(/Collect rewards/.test(await text(P, '.fzb-card.claim')), 'leaderboard: "Last week’s rewards are ready" with a Collect button');
  const thisWeekRows = await P.locator('.fzb-list > .fzb-row').count();
  ok(thisWeekRows === 1, `this week lists the one player (${thisWeekRows})`);
  ok(/#1/.test(await text(P, '.fzb-me')), 'my place card says #1');
  await shot(P, '04-board-phone-claim');
  // tabs
  await P.click('#fzb-tab-fastest'); await wait(1500);
  ok(await P.locator('.fzb-empty').count() === 1 && /Be the first|Fill all 5/.test(await text(P, '.fzb-empty') + await text(P, '.fzb-mine')), 'fastest board is empty this week (calm empty state)');
  await shot(P, '05-board-phone-empty-fastest');
  await P.focus('#fzb-tab-fastest'); await P.keyboard.press('ArrowRight'); await wait(1200);
  ok(await P.locator('#fzb-tab-streak.on').count() === 1, 'arrow keys move between the tabs');
  await P.click('#fzb-tab-score');
  // last week
  await P.click('.fzb-seg button:has-text("Last week")'); await wait(1500);
  const lw = await P.locator('.fzb-list > .fzb-row').count();
  ok(lw === 9, `last week lists 9 players (${lw})`);
  const names = await P.locator('.fzb-list > .fzb-row .fzb-who b').allInnerTexts();
  ok(/You/.test(names[1] ?? '') && names[0].startsWith('seed-bb-0'), `last week: seed-bb-0 first, me second (${names.slice(0, 3).join(' | ')})`);
  ok(/Final/.test(await text(P, '.fzb-left')), 'last week shows "Final" instead of a countdown');
  await shot(P, '06-board-phone-lastweek');
  // rewards panel
  await P.click('.fzb-rewards summary'); await wait(400);
  ok(await P.locator('.fzb-tier').count() === 5, 'rewards panel lists the five tiers');
  ok(await P.locator('.fzb-tier.mine').count() === 1, 'and marks mine (top 3)');
  await P.evaluate(() => document.querySelector('.fzb-rewards')?.scrollIntoView());
  await shot(P, '07-board-phone-rewards');

  // ---------- 5. collect ----------
  await P.evaluate(() => document.querySelector('.fzx-body')?.scrollTo(0, 0));
  const before = await crossingSave(P);
  await P.click('.fzb-card.claim .btn'); await wait(2500);
  ok(/Rewards collected/.test(await text(P, '.fzb-card')), 'collect: the card turns into "Rewards collected!"');
  ok(await P.locator('.fzb-got').count() >= 4, 'collect: the chips list trophies, Fuzzy, cosmetics and coins');
  await shot(P, '08-collected-phone');
  // celebrations (one modal per new Fuzzy / cosmetic)
  let modals = 0;
  for (let i = 0; i < 8; i++) { const nice = P.locator('.modal-backdrop button:has-text("Nice!")'); if (await nice.count()) { modals++; if (modals === 1) await shot(P, '09-celebrate-phone'); await nice.first().click(); await wait(500); } else { await wait(400); if (!(await P.locator('.modal-backdrop').count())) break; } }
  ok(modals >= 2, `collect: celebrations played for the new Fuzzy / cosmetics (${modals})`);
  const after = await crossingSave(P);
  ok(after.trophies.includes('week-2026-W41-score-3') && after.trophies.includes('week-2026-W41-fastest-10'), `trophies saved (${after.trophies.join(', ')})`);
  ok(after.owned.includes('rainbow') && !after.owned.includes('nebula'), 'Rainbow Fuzzy unlocked (top 10), Nebula not (that needs #1)');
  ok(after.ownedCosmetics.includes('trail-neon') && after.ownedCosmetics.includes('cele-champion'), 'Neon trail + Champion pose unlocked');
  eq(after.weeklyBest, 2, 'weeklyBest = best placing (2)');
  ok(after.coins - before.coins >= 1000, `coins +${after.coins - before.coins} (≥ 600 + 400)`);
  // claimed once
  const twice = await P.evaluate(async () => { const n = await import('/src/crossing/net.ts'); return (await n.claimLastWeek()).length; });
  eq(twice, 0, 'nothing left to claim');
  const trophyCount = (await crossingSave(P)).trophies.length;
  eq(trophyCount, after.trophies.length, 'no duplicate trophies');
  await P.goto(URL + '#/play'); await wait(2500);
  ok(await P.locator('.fzx-tile:has-text("Boards") .fzx-new').count() === 0, 'the dot is gone after collecting');
  await P.click('.fzx-tile:has-text("Boards")'); await wait(1800);
  ok(await P.locator('.fzb-card.claim').count() === 0, 'and so is the claim card');

  // ---------- 6. other screen sizes + dark mode ----------
  // give this week's board some company so the list looks real
  const cur = (await db.query("select week_key from fz_cx_scores where user_id = $1 and week_key <> $2 limit 1", [me.id, prevWeek])).rows[0].week_key;
  for (let i = 0; i < 8; i++) await db.query('insert into fz_cx_scores (week_key, board, user_id, value, details, created_at) values ($1,$2,$3,$4,$5,$6) on conflict do nothing', [cur, 'score', stand[i], 40 + (7 - i) * 70, JSON.stringify({ characterId: chars[i] }), Date.now() - i * 5000]);
  for (let i = 0; i < 8; i++) await db.query('insert into fz_cx_scores (week_key, board, user_id, value, details, created_at) values ($1,$2,$3,$4,$5,$6) on conflict do nothing', [cur, 'fastest', stand[i], 24_000 + i * 1900, JSON.stringify({ characterId: chars[i] }), Date.now() - i * 5000]);
  await P.click('#fzb-tab-score'); await wait(1500);
  await shot(P, '10-board-phone-week');
  await setSettings(P, "a.settings.theme = 'dark';"); await wait(600);
  await P.click('#fzb-tab-fastest'); await wait(1500);
  await shot(P, '11-board-phone-dark-fastest');
  await setSettings(P, "a.settings.theme = 'light';");
  const ls = await P.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  ok(ls.sw <= ls.cw + 1, `phone: no horizontal scroll (${ls.sw} ≤ ${ls.cw})`);
  // an on-screen touch target check
  const small = await P.evaluate(() => [...document.querySelectorAll('.fzb button, .fzb a, .fzb summary')].filter((e) => { const r = e.getBoundingClientRect(); return r.width && (r.height < 36); }).map((e) => e.textContent.trim().slice(0, 20)));
  ok(small.length === 0, `phone: tap targets at least 36 px high (${small.join(', ')})`);
  const cookies = await P.context().storageState();

  for (const kind of ['tablet', 'desktop']) {
    const ctx = await browser.newContext({ storageState: cookies, ...(kind === 'tablet' ? { viewport: { width: 820, height: 1180 }, hasTouch: true } : { viewport: { width: 1280, height: 800 } }) });
    const q = await ctx.newPage();
    q.on('pageerror', (e) => errs.push(`${kind}: ${e.message}`));
    await q.goto(URL + '#/play'); await wait(2500);
    await q.click('.fzx-tile:has-text("Boards")'); await wait(2500);
    await shot(q, `12-board-${kind}`);
    const sw = await q.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
    ok(sw, `${kind}: no horizontal scroll`);
    ok(await q.locator('.fzb-row').count() >= 5, `${kind}: rows are listed`);
    await q.close(); await ctx.close();
  }
  ok(errs.length === 0, `no page errors (${errs.slice(0, 3).join(' || ')})`);

  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close(); await db.end();
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });

function eq(a, b, m) { ok(JSON.stringify(a) === JSON.stringify(b), `${m} (got ${JSON.stringify(a)})`); }
