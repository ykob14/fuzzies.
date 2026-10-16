// Data checks for the Fuzzy Crossing collection, Pass and economy. Run: bash tools/crossing/run.sh check.ts
import { CHARACTERS, RARITIES, unlockText, ACHIEVEMENT_HINT, CHALLENGE_HINT } from '../../src/crossing/characters';
import { COSMETICS, SLOTS } from '../../src/crossing/cosmetics';
import { PASS_TRACK, PASS_COINS, PASS_LEVELS, xpToReach, passLevel, MAX_PASS_XP } from '../../src/crossing/pass';
import { freshCrossing, migrateCrossing } from '../../src/crossing/save';
import { CHARACTER_ACHIEVEMENTS } from '../../src/crossing/store';

let pass = 0, fail = 0;
const ok = (c: unknown, m: string) => { if (c) pass++; else { fail++; console.log('  ✗', m); } };
const count = <T,>(xs: T[], f: (x: T) => boolean) => xs.filter(f).length;

ok(CHARACTERS.length === 50, `50 characters (${CHARACTERS.length})`);
const want = { common: 15, rare: 12, epic: 10, legendary: 8, mythic: 5 };
for (const r of RARITIES) ok(count(CHARACTERS, (c) => c.rarity === r) === want[r], `${r}: ${count(CHARACTERS, (c) => c.rarity === r)} / ${want[r]}`);
ok(new Set(CHARACTERS.map((c) => c.id)).size === 50, 'unique ids');
ok(new Set(CHARACTERS.map((c) => c.name)).size === 50, 'unique names');
const kinds: Record<string, number> = {};
for (const c of CHARACTERS) kinds[c.unlock.kind + (c.unlock.kind === 'shop' ? ':' + c.unlock.slot : '')] = (kinds[c.unlock.kind + (c.unlock.kind === 'shop' ? ':' + c.unlock.slot : '')] ?? 0) + 1;
console.log('  unlock ways:', JSON.stringify(kinds));
const buyable = count(CHARACTERS, (c) => c.unlock.kind === 'shop');
ok(buyable <= 14, `only ${buyable} of 50 can be bought`);
ok(count(CHARACTERS, (c) => c.rarity === 'legendary' || c.rarity === 'mythic') === 13 && CHARACTERS.filter((c) => c.rarity === 'legendary' || c.rarity === 'mythic').every((c) => c.unlock.kind !== 'shop'), 'no legendary or mythic Fuzzy is for sale');
ok(CHARACTERS.filter((c) => c.rarity === 'mythic').every((c) => ['weekly', 'endless', 'achievement', 'challenge', 'secret'].includes(c.unlock.kind)), 'mythics are earned by skill');
ok(CHARACTERS.every((c) => unlockText(c).length > 8), 'every Fuzzy has unlock text');
ok(CHARACTERS.every((c) => c.name && c.tagline && c.personality && c.parts !== undefined), 'complete definitions');
// achievements referenced by characters exist
for (const c of CHARACTERS) if (c.unlock.kind === 'achievement') { ok(!!CHARACTER_ACHIEVEMENTS[c.unlock.id], `achievement ${c.unlock.id} defined`); ok(!!ACHIEVEMENT_HINT[c.unlock.id], `achievement ${c.unlock.id} has a hint`); }
for (const c of CHARACTERS) if (c.unlock.kind === 'challenge') ok(!!CHALLENGE_HINT[c.unlock.id], `challenge ${c.unlock.id} has a hint`);
// worlds: each world 1..10 at most once and only 5 of them give a Fuzzy
const wc = CHARACTERS.filter((c) => c.unlock.kind === 'world').map((c) => (c.unlock as { world: number }).world);
ok(new Set(wc).size === wc.length && wc.every((w) => w >= 6 && w <= 10), 'world unlocks are unique, from the late worlds');
// pass
ok(PASS_TRACK.length === PASS_LEVELS, 'pass has 50 levels');
const passChars = CHARACTERS.filter((c) => c.unlock.kind === 'pass');
ok(passChars.length === 10, `10 pass characters (${passChars.length})`);
ok(passChars.every((c) => PASS_TRACK[(c.unlock as { level: number }).level - 1].character === c.id), 'pass track places each pass character on its level');
ok(passChars.every((c, i, a) => i === 0 || true) && new Set(passChars.map((c) => (c.unlock as { level: number }).level)).size === passChars.length, 'one character per pass level');
ok(passChars.some((c) => (c.unlock as { level: number }).level >= 45), 'a grand prize at the end of the pass');
ok(PASS_TRACK.every((r) => (r.coins ?? 0) > 0), 'every level pays something');
ok(xpToReach(1) === 0 && xpToReach(2) === 100, 'xp curve starts at 100');
ok(passLevel(0).level === 1 && passLevel(99).level === 1 && passLevel(100).level === 2 && passLevel(MAX_PASS_XP).maxed && passLevel(MAX_PASS_XP + 500).level === 50, 'passLevel maths');
console.log(`  pass: ${MAX_PASS_XP} XP in total, ${PASS_COINS} coins`);
// cosmetics
ok(COSMETICS.length >= 34 && new Set(COSMETICS.map((x) => x.id)).size === COSMETICS.length, `${COSMETICS.length} unique cosmetics`);
for (const s of SLOTS) ok(COSMETICS.some((x) => x.slot === s && x.unlock.kind === 'free'), `a free default for ${s}`);
const passCos = COSMETICS.filter((x) => x.unlock.kind === 'pass');
ok(passCos.every((x) => PASS_TRACK[(x.unlock as { level: number }).level - 1].cosmetic === x.id), 'pass cosmetics are on the track');
ok(new Set(passCos.map((x) => (x.unlock as { level: number }).level)).size === passCos.length, 'one cosmetic per pass level');
// economy: prices are fair relative to income (a good day ≈ 250 coins)
const price = (c: typeof CHARACTERS[number]) => (c.unlock.kind === 'shop' ? c.unlock.price : 0);
ok(CHARACTERS.filter((c) => c.rarity === 'common' && price(c)).every((c) => price(c) <= 400), 'common prices ≤ 400');
ok(CHARACTERS.filter((c) => c.rarity === 'rare' && price(c)).every((c) => price(c) >= 600 && price(c) <= 1000), 'rare prices 600–1000');
ok(CHARACTERS.filter((c) => c.rarity === 'epic' && price(c)).every((c) => price(c) >= 2000 && price(c) <= 3000), 'epic prices 2000–3000');
// save: fresh + migration
const f = freshCrossing();
ok(f.owned.length === 1 && f.equipped.character === 'classic' && f.coins === 0, 'fresh save');
const m = migrateCrossing(undefined, ['skin-mint', 'skin-gold', 'skin-galaxy'], 'gold');
ok(m.owned.includes('mint') && m.owned.includes('golden') && m.owned.includes('galaxy') && m.equipped.character === 'golden', 'legacy skins become owned characters and the equipped one is kept');
const m2 = migrateCrossing({ owned: ['ninja', 'nope'], equipped: { character: 'nope' } as never, coins: -5 as never });
ok(m2.owned.includes('ninja') && !m2.owned.includes('nope') && m2.equipped.character === 'classic' && m2.coins === 0, 'migration cleans bad data');
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
