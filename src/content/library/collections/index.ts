/**
 * Hand-made template collections. Each one belongs to a topic in taxonomy.json (`sub`) and is built with the shared
 * composition kit (./kit). Adding a holiday: draw its artwork collection (content/assets/collections), write its
 * templates here, and add one line below.
 */
import type { CollectionTemplate } from './kit';
import { HALLOWEEN, HALLOWEEN_FONTS } from './halloween';
import { CHRISTMAS, CHRISTMAS_FONTS } from './christmas';
import { HANUKKAH, HANUKKAH_FONTS } from './hanukkah';
import { PASSOVER, PASSOVER_FONTS } from './passover';

export interface CollectionSet { sub: string; label: string; cover: string; list: CollectionTemplate[]; addedAt: number }
export const COLLECTION_SETS: CollectionSet[] = [
  { sub: 'christmas', label: 'Christmas', cover: 'merry-christmas-luxe', list: CHRISTMAS, addedAt: Date.UTC(2026, 9, 12, 12) },
  { sub: 'hanukkah', label: 'Hanukkah', cover: 'chag-chanukah-sameach', list: HANUKKAH, addedAt: Date.UTC(2026, 9, 12, 12) },
  { sub: 'passover', label: 'Passover', cover: 'chag-pesach-sameach', list: PASSOVER, addedAt: Date.UTC(2026, 9, 12, 12) },
  { sub: 'halloween', label: 'Halloween', cover: 'haunted-house-party', list: HALLOWEEN, addedAt: Date.UTC(2026, 9, 11, 12) },
];
/** Every font the collections use (previews wait for them so text is measured exactly). */
export const COLLECTION_FONTS: [string, number][] = [...HALLOWEEN_FONTS, ...CHRISTMAS_FONTS, ...HANUKKAH_FONTS, ...PASSOVER_FONTS];
export { buildCollectionDoc, USES, type Use } from './kit';
