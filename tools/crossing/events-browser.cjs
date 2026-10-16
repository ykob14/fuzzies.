// Browser test for the Fuzzy Crossing seasonal events: the Events tile and screen (Halloween on, nothing on, an event that just ended),
// real claims, the event Fuzzy and keepsakes in the Locker data, the weather layer, a real event pickup in the Classic game.
//   URL=http://127.0.0.1:5351/ SHOTS=/some/dir node tools/crossing/events-browser.cjs   (needs `npx vite --port 5351` running in the repo)
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const fs = require('fs');
const URL = process.env.URL || 'http://127.0.0.1:5351/';
const SHOTS = process.env.SHOTS || '/tmp/events-shots';
fs.mkdirSync(SHOTS, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  ✗', m); } };
const errs = [];
const at = (y, m, d, hh = 12) => new Date(y, m - 1, d, hh).getTime();

async function newPage(browser, kind, now, extra = {}) {
  const opts = kind === 'phone' ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true } : { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 };
  const ctx = await browser.newContext({ ...opts, ...extra });
  await ctx.addInitScript((n) => { try { if (!localStorage.getItem('fz.dev.now')) localStorage.setItem('fz.dev.now', String(n)); } catch {} }, now);
  const p = await ctx.newPage(); p.setDefaultTimeout(240000);
  p.on('pageerror', (e) => errs.push(`${kind}: ${e.message}`));
  p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|favicon|WebGL|GPU stall|net::ERR/i.test(m.text())) errs.push(`${kind} console: ${m.text().slice(0, 220)}`); });
  return p;
}
const shot = (p, name) => p.screenshot({ path: `${SHOTS}/${name}.png` });
const txt = (p, sel) => p.locator(sel).first().innerText().catch(() => '');
const save = (p) => p.evaluate(async () => { const s = await import('/src/crossing/store.ts'); return JSON.parse(JSON.stringify(s.save())); });
async function toPlay(p, gfx) {
  await p.goto(URL); await wait(1200);
  await p.click('text=Just looking? Continue as a guest'); await wait(900);
  if (gfx) await p.evaluate(async (g) => { const { accounts } = await import('/src/core/account.ts'); accounts.update((a) => { a.settings.gameGfx = g; a.settings.reduceMotion = false; }); }, gfx);
  await p.goto(URL + '#/play'); await wait(2200);
}
/** unlock celebrations pop up after a claim that earns something: tap Nice! until none is left */
async function dismiss(p) { for (let i = 0; i < 8; i++) { await wait(400); if (!(await p.locator('.modal-backdrop').count())) return; await p.locator('.modal button:has-text("Nice!")').first().click().catch(() => {}); } }
async function report(p, evs) { await p.evaluate(async (list) => { const s = await import('/src/crossing/store.ts'); for (const e of list) s.report(e); }, evs); }

(async () => {
  const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist'] });

  for (const kind of ['phone', 'desktop']) {
    console.log(`── ${kind}: Halloween is on (20 Oct 2026)`);
    const p = await newPage(browser, kind, at(2026, 10, 20));
    await toPlay(p, 'classic');
    ok(await p.locator('.fzx-tile:has-text("Events")').count() === 1, `${kind}: the menu has an Events tile`);
    ok(/Halloween/.test(await txt(p, '.fzx-tile:has-text("Events")')), `${kind}: the tile says Halloween`);
    ok(await p.locator('.evfx:not([hidden])').count() === 1 && (await p.locator('.evfx').getAttribute('data-event')) === 'halloween', `${kind}: weather layer is on for Halloween`);
    ok(await p.locator('.evfx').evaluate((e) => getComputedStyle(e).pointerEvents) === 'none', `${kind}: weather layer ignores taps`);
    await shot(p, `${kind}-01-menu`);
    await p.click('.fzx-tile:has-text("Events")'); await wait(1200);
    ok(await p.locator('.fzx-events .evx-hero[data-event="halloween"]').count() === 1, `${kind}: Halloween hero`);
    ok(/Ends in/.test(await txt(p, '.evx-count')), `${kind}: countdown ("${(await txt(p, '.evx-count')).slice(0, 40)}")`);
    ok(await p.locator('.evx-card').count() === 7, `${kind}: 6 challenges + finale (${await p.locator('.evx-card').count()})`);
    ok(await p.locator('.evx-keep').count() === 3, `${kind}: 3 keepsakes this year`);
    ok(/Pumpkin Fuzzy/.test(await txt(p, '.evx-fuzzy')), `${kind}: its own Fuzzy is shown`);
    ok(await p.locator('.evx-claim[disabled]').count() === 7, `${kind}: nothing claimable yet`);
    await shot(p, `${kind}-02-halloween`);
    // play: real reports
    await report(p, [{ kind: 'start', mode: 'classic' }, ...Array.from({ length: 16 }, () => ({ kind: 'eventItem', event: 'halloween' }))]);
    await wait(500);
    ok(await p.locator('.evx-card.ready').count() === 1, `${kind}: item challenge is ready after 16 pumpkins`);
    ok(await p.locator('.evx-dot').count() === 1, `${kind}: dot on the Now tab`);
    const c0 = (await save(p)).coins;
    await p.click('.evx-card.ready .evx-claim'); await dismiss(p);
    const s1 = await save(p);
    ok(s1.coins === c0 + 60 && s1.events['halloween-2026'].claimed.includes('items'), `${kind}: claim paid 60 coins once`);
    ok(await p.locator('.evx-card.claimed').count() === 1 && await p.locator('.evx-card.ready').count() === 0, `${kind}: card shows Claimed`);
    await p.evaluate(async () => { const s = await import('/src/crossing/events.ts'); /* try to claim again through the logic */ const l = await import('/src/crossing/eventsLive.ts'); window.__again = l.claimChallenge('halloween-2026', 'items'); });
    ok((await p.evaluate(() => window.__again)) === null && (await save(p)).coins === s1.coins, `${kind}: second claim pays nothing`);
    // finish everything with real events
    await report(p, [...Array.from({ length: 160 }, () => ({ kind: 'advance' })), ...Array.from({ length: 14 }, () => ({ kind: 'nest' })), ...Array.from({ length: 44 }, () => ({ kind: 'pickup', gold: false })), { kind: 'levelClear' }, { kind: 'levelClear' }, { kind: 'run', score: 2500, level: 3, mode: 'classic' }]);
    await p.waitForFunction(() => document.querySelectorAll('.evx-card.ready').length >= 5, null, { timeout: 15000 }).catch(() => {});
    const ready = await p.locator('.evx-card.ready').count();
    ok(ready === 5, `${kind}: five more challenges ready (${ready})`);
    let sawKeep = 0;
    for (let i = 0; i < 5; i++) { await p.locator('.evx-card.ready:not(.finale) .evx-claim').first().click(); await wait(900); if (await p.locator('.modal-backdrop').count()) { sawKeep++; if (sawKeep === 1) { ok(/unlocked/.test(await p.locator('.modal').first().innerText()), `${kind}: a keepsake celebration pops up on the claim that earns it`); await shot(p, `${kind}-03a-keepsake-celebrate`); } } await dismiss(p); }
    ok(sawKeep >= 2, `${kind}: both token keepsakes (3 and 6 tokens) were celebrated (${sawKeep})`);
    const s2 = await save(p);
    ok(s2.events['halloween-2026'].claimed.length === 6, `${kind}: six claimed`);
    ok(s2.ownedCosmetics.includes('ev-halloween-2026-glow') && s2.ownedCosmetics.includes('ev-halloween-2026-candy'), `${kind}: token keepsakes are in the Locker data (3 and 6 tokens)`);
    ok(!s2.owned.includes('pumpkin'), `${kind}: the event Fuzzy waits for the finale`);
    await shot(p, `${kind}-03-finale-ready`);
    ok(await p.locator('.evx-card.finale.ready').count() === 1, `${kind}: finale ready`);
    await p.click('.evx-card.finale .evx-claim'); await wait(1500);
    const finaleModals = [];
    for (let i = 0; i < 6 && await p.locator('.modal-backdrop').count(); i++) { finaleModals.push(await p.locator('.modal').first().innerText().catch(() => '')); if (i === 0) await shot(p, `${kind}-04-celebrate`); await p.locator('.modal button:has-text("Nice!")').first().click().catch(() => {}); await wait(600); }
    ok(finaleModals.some((m) => /Pumpkin Fuzzy unlocked/.test(m)), `${kind}: unlock celebration for Pumpkin Fuzzy (${finaleModals.map((m) => m.split('\n')[0]).join(' | ')})`);
    await dismiss(p);
    const s3 = await save(p);
    ok(s3.owned.includes('pumpkin') && s3.ownedCosmetics.includes('ev-halloween-2026-cape'), `${kind}: Pumpkin Fuzzy and the finale keepsake are owned`);
    ok(s3.pending.length === 0, `${kind}: celebration queue is empty`);
    ok(await p.locator('.evx-keep.owned').count() === 3, `${kind}: all three keepsakes show as earned`);
    ok(/yours forever|in your Locker/.test(await txt(p, '.evx-fuzzy')), `${kind}: Fuzzy card says it is yours`);
    await shot(p, `${kind}-05-all-done`);
    // wear a keepsake
    await p.locator('.evx-keep.owned .evx-wear').first().click(); await wait(500);
    ok((await save(p)).equipped.trail === 'ev-halloween-2026-glow' || (await save(p)).equipped.extra === 'ev-halloween-2026-glow' || (await save(p)).equipped.jump === 'ev-halloween-2026-glow', `${kind}: Wear equips a keepsake`);
    // collection tab
    await p.click('.evx-tabs button:has-text("Collection")'); await wait(500);
    ok(await p.locator('.evx-fz-card').count() === 8, `${kind}: collection lists the 8 event Fuzzies`);
    ok(await p.locator('.evx-fz-card.owned').count() === 1, `${kind}: one of them is owned`);
    ok(await p.locator('.evx-group').count() === 8, `${kind}: keepsake groups for each event run (${await p.locator('.evx-group').count()})`);
    await shot(p, `${kind}-06-collection`);
    await p.click('.evx-tabs button:has-text("Calendar")'); await wait(500);
    ok(await p.locator('.evx-cal').count() === 8 && await p.locator('.evx-cal.live').count() === 1, `${kind}: calendar has 8 events, 1 live`);
    await p.click('.evx-cal[data-cal="easter"] .evx-cal-head'); await wait(400);
    ok(/Available again next Easter/.test(await txt(p, '.evx-cal[data-cal="easter"] .evx-cal-body')), `${kind}: Easter says "available again next Easter"`);
    ok(/2 Jan 2027/.test(await p.locator('.evx-cal[data-cal="christmas"]').innerText()), `${kind}: Christmas dates carry the right end year`);
    await shot(p, `${kind}-07-calendar`);
    // back to the menu: dot is gone and the real game picks up an event item
    await p.click('.fzx-back'); await wait(700);
    await p.context().close();
  }

  // ───────── the real Classic game drops and collects an event item ─────────
  console.log('── Classic game: event pickup');
  {
    const p = await newPage(browser, 'desktop', at(2026, 10, 20));
    await toPlay(p, 'classic');
    await p.evaluate(() => { window.__r = Math.random; Math.random = () => 0.1; }); // forces: event item, median row, column 1
    await p.click('text=Start playing'); await wait(800);
    if (await p.locator('.skip-intro:not([hidden])').count()) await p.click('.skip-intro').catch(() => {});
    await wait(5000);
    await p.evaluate(() => { Math.random = window.__r; });
    ok(await p.evaluate(() => { const c = document.querySelector('.evfx canvas'); const b = document.querySelector('canvas.game-canvas').getBoundingClientRect(), f = document.querySelector('.evfx').getBoundingClientRect(); return Math.abs(b.width - f.width) < 3 && Math.abs(b.left - f.left) < 3; }), 'the weather layer sits exactly over the game canvas');
    await shot(p, 'game-event-item');
    const r = await p.evaluate(async () => {
      const { Crossing } = await import('/src/game/crossing.ts');
      const events = []; let fuzzies = 0;
      const view = { resize() {}, render() {}, fx() {}, reset() {}, destroy() {} };
      const g = new Crossing(view, { id: 'classic', name: 'c', cost: 0, colors: ['#fff', '#000'] }, 0, { hud() {}, fuzzy: (n) => { fuzzies += n; }, over() {}, event: (e) => events.push(e) });
      g.eventItems = [{ event: 'halloween', emoji: '🎃', colors: ['#ffb066', '#e0570b'] }];
      g.start();
      const orig = Math.random; Math.random = () => 0.1; g.spawnToken(); Math.random = orig;
      const tk = g.tokens.find((t) => t.ev);
      if (!tk) return { spawned: false };
      g.px = tk.x; g.py = tk.row; g.update(0.01, true);
      g.destroy();
      return { spawned: true, row: tk.row, got: events.filter((e) => e.kind === 'collect'), fuzzies, score: g.score };
    });
    ok(r.spawned, 'the game spawns an event item when told to');
    ok(r.got && r.got.length === 1 && r.got[0].item && r.got[0].item.event === 'halloween' && r.got[0].amount === 0, 'collecting it emits a collect event with the item and no amount');
    ok(r.fuzzies === 0 && r.score === 25, `no site Fuzzies, score +25 (fuzzies ${r.fuzzies}, score ${r.score})`);
    // without eventItems the game is exactly as before
    const r2 = await p.evaluate(async () => {
      const { Crossing } = await import('/src/game/crossing.ts');
      const view = { resize() {}, render() {}, fx() {}, reset() {}, destroy() {} };
      const g = new Crossing(view, { id: 'classic', name: 'c', cost: 0, colors: ['#fff', '#000'] }, 0, { hud() {}, fuzzy() {}, over() {}, event() {} });
      g.start(); let n = 0;
      const orig = Math.random; Math.random = () => 0.1;
      for (let i = 0; i < 30; i++) { g.tokens = []; g.spawnToken(); if (g.tokens.some((t) => t.ev)) n++; }
      Math.random = orig; g.destroy();
      return n;
    });
    ok(r2 === 0, 'with no event on, no event item ever appears');
    await p.context().close();
  }

  console.log('── nothing is on (10 Sep 2026)');
  for (const kind of ['phone', 'desktop']) {
    const p = await newPage(browser, kind, at(2026, 9, 10));
    await toPlay(p, 'classic');
    ok(/Calendar/.test(await txt(p, '.fzx-tile:has-text("Events")')), `${kind}: tile says Calendar`);
    ok(await p.locator('.evfx[hidden]').count() === 1, `${kind}: no weather layer`);
    await p.click('.fzx-tile:has-text("Events")'); await wait(1000);
    ok(await p.locator('.evx-empty').count() === 1 && /Halloween starts in 35 days/.test(await txt(p, '.evx-empty')), `${kind}: "Halloween starts in 35 days" (${(await txt(p, '.evx-empty')).replace(/\n/g, ' ').slice(0, 70)})`);
    await shot(p, `${kind}-10-none`);
    // events do not count outside their window
    await report(p, [{ kind: 'eventItem', event: 'halloween' }, { kind: 'advance' }, { kind: 'nest' }]);
    ok(Object.keys((await save(p)).events).length === 0, `${kind}: nothing is counted when no event is on`);
    await p.click('.evx-tabs button:has-text("Calendar")'); await wait(400);
    ok(await p.locator('.evx-cal').count() === 8 && await p.locator('.evx-cal.live').count() === 0, `${kind}: calendar: 8 upcoming, none live`);
    await p.click('.evx-cal[data-cal="halloween"] .evx-cal-head'); await wait(400);
    ok(/Available again next Halloween/.test(await txt(p, '.evx-cal-body')) && /Pumpkin/.test(await txt(p, '.evx-cal-body')) || /Pumpkin Fuzzy is only earned during Halloween/.test(await txt(p, '.evx-cal-body')), `${kind}: honest words for the Fuzzy`);
    await shot(p, `${kind}-11-calendar-none`);
    await p.click('.evx-tabs button:has-text("Collection")'); await wait(400);
    ok(await p.locator('.evx-keep').count() === 24 && await p.locator('.evx-keep.owned').count() === 0, `${kind}: 24 keepsakes in the collection, none owned`);
    await p.context().close();
  }

  console.log('── an event that just ended: unclaimed rewards wait');
  {
    const p = await newPage(browser, 'phone', at(2026, 10, 20));
    await toPlay(p, 'classic');
    await report(p, Array.from({ length: 16 }, () => ({ kind: 'eventItem', event: 'halloween' })));
    // move the clock past Halloween
    await p.evaluate(() => localStorage.setItem('fz.dev.now', String(new Date(2026, 10, 6, 12).getTime())));
    await p.goto(URL + '#/home'); await wait(800); await p.goto(URL + '#/play'); await wait(2000);
    ok(/Calendar/.test(await txt(p, '.fzx-tile:has-text("Events")')) && await p.locator('.fzx-tile:has-text("Events") .fzx-new').count() === 1, 'tile has a dot for the waiting claim');
    await p.click('.fzx-tile:has-text("Events")'); await wait(1000);
    ok(await p.locator('.evx-past .evx-card.ready').count() === 1, 'the finished challenge is offered after the event ended');
    await shot(p, 'phone-12-after-end');
    const c0 = (await save(p)).coins;
    await p.click('.evx-past .evx-claim'); await wait(700);
    ok((await save(p)).coins === c0 + 60, 'claimed after the event for 60 coins');
    await report(p, [{ kind: 'eventItem', event: 'halloween' }, { kind: 'advance' }]);
    ok((await save(p)).events['halloween-2026'].progress.rows === 0, 'no new progress after the event ended');
    await p.context().close();
  }

  console.log('── Christmas and Hanukkah overlap');
  {
    const p = await newPage(browser, 'desktop', at(2027, 12, 30));
    await toPlay(p, 'classic');
    await p.click('.fzx-tile:has-text("Events")'); await wait(1000);
    ok(await p.locator('.evx-pick').count() === 2, 'two events on: a chip for each');
    await p.locator('.evx-pick:has-text("Hanukkah")').click(); await wait(400);
    ok(await p.locator('.evx-hero[data-event="hanukkah"]').count() === 1, 'switching shows the other event');
    await shot(p, 'desktop-13-two-events');
    await p.context().close();
  }

  console.log('── an old save (no events field) still opens');
  {
    const p = await newPage(browser, 'desktop', at(2026, 10, 20));
    await toPlay(p, 'classic');
    await p.evaluate(async () => { const { accounts } = await import('/src/core/account.ts'); accounts.update((a) => { delete a.crossing.events; }); });
    await p.reload(); await wait(2000);
    ok(await p.locator('.fzx-tile:has-text("Events")').count() === 1, 'menu loads after the field is missing');
    await p.click('.fzx-tile:has-text("Events")'); await wait(900);
    ok(await p.locator('.evx-hero').count() === 1, 'screen opens for an old save');
    await p.context().close();
  }

  await browser.close();
  console.log(errs.length ? `ERRORS (${errs.length}):\n` + errs.slice(0, 12).join('\n') : 'no console or page errors');
  ok(errs.length === 0, 'no console or page errors');
  console.log(`events-browser: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
