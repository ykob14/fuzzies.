/**
 * Hand-made template collections. Each set belongs to a topic in taxonomy.json (`sub`). The holiday collections
 * (Halloween, Christmas, Hanukkah, Passover) are composed one by one with the kit (./kit); the multicultural
 * collections are themed sets (./themed) — a look + words per template, laid out by reusable layouts.
 * Adding a celebration: draw its artwork collection (content/assets/collections), add a ThemedSet to one of the
 * themed files (islamic, jewish, christian, cultural, baby, milestones, events) and a topic to taxonomy.json.
 */
import type { CollectionTemplate } from './kit';
import { fontsOf, nativeSamples, themed, type ThemedSet } from './themed';
import { HALLOWEEN, HALLOWEEN_FONTS } from './halloween';
import { CHRISTMAS, CHRISTMAS_FONTS } from './christmas';
import { HANUKKAH, HANUKKAH_FONTS } from './hanukkah';
import { PASSOVER, PASSOVER_FONTS } from './passover';
import { ISLAMIC } from './islamic';
import { JEWISH } from './jewish';
import { CHRISTIAN } from './christian';
import { CULTURAL } from './cultural';
import { BABY } from './baby';
import { MILESTONES } from './milestones';
import { EVENTS } from './events';
import { TEAM_SETS, TEAM_FONTS } from './team';
import { STYLE_SETS, STYLE_FONTS } from './teamStyles';
import { PRO_SETS, PRO_FONTS } from './proStyles';
import { CAREER_SETS, CAREER_FONTS } from './careers';

export interface CollectionSet { sub: string; label: string; cover: string; list: CollectionTemplate[]; addedAt: number }
const THEMED: ThemedSet[] = [...ISLAMIC, ...JEWISH, ...CHRISTIAN, ...CULTURAL, ...BABY, ...MILESTONES, ...EVENTS];
const ADDED = Date.UTC(2026, 9, 13, 12);

export const COLLECTION_SETS: CollectionSet[] = [
  { sub: 'christmas', label: 'Christmas', cover: 'merry-christmas-luxe', list: CHRISTMAS, addedAt: Date.UTC(2026, 9, 12, 12) },
  { sub: 'hanukkah', label: 'Hanukkah', cover: 'chag-chanukah-sameach', list: HANUKKAH, addedAt: Date.UTC(2026, 9, 12, 12) },
  { sub: 'passover', label: 'Passover', cover: 'chag-pesach-sameach', list: PASSOVER, addedAt: Date.UTC(2026, 9, 12, 12) },
  ...TEAM_SETS.map((s) => ({ ...s, addedAt: Date.UTC(2026, 9, 13, 18) })),
  ...STYLE_SETS.map((s) => ({ ...s, addedAt: Date.UTC(2026, 9, 13, 20) })),
  ...PRO_SETS.map((s) => ({ ...s, addedAt: Date.UTC(2026, 9, 13, 22) })),
  ...CAREER_SETS.map((s) => ({ ...s, addedAt: Date.UTC(2026, 9, 15, 12) })),
  { sub: 'halloween', label: 'Halloween', cover: 'haunted-house-party', list: HALLOWEEN, addedAt: Date.UTC(2026, 9, 11, 12) },
  ...THEMED.map((s) => ({ sub: s.sub, label: s.label, cover: s.specs[0].id, list: s.specs.map(themed), addedAt: ADDED })),
];
/** Every font the collections use (previews wait for them so text is measured exactly). */
export const COLLECTION_FONTS: [string, number][] = [...HALLOWEEN_FONTS, ...CHRISTMAS_FONTS, ...HANUKKAH_FONTS, ...PASSOVER_FONTS, ...TEAM_FONTS, ...STYLE_FONTS, ...PRO_FONTS, ...CAREER_FONTS, ...fontsOf(THEMED.flatMap((s) => s.specs))];
export { buildCollectionDoc, USES, type Use } from './kit';
/** Font + the actual non-Latin words set in it (loading by text fetches the right script subsets before measuring). */
export const COLLECTION_TEXT: [string, number, string][] = [
  ...nativeSamples(THEMED.flatMap((s) => s.specs)),
  // hand-made Hebrew lines (Hanukkah, Passover) use these fonts
  ...(['Frank Ruhl Libre', 'David Libre', 'Suez One', 'Secular One', 'Bellefair', 'Heebo', 'Rubik', 'Amatic SC'] as const).flatMap((f) => [400, 700].map((w) => [f, w, 'חג שמח חנוכה פסח אורים נס גדול היה שם לשנה הבאה בירושלים כשר ליל סדר'] as [string, number, string])),
];

