/**
 * The asset library: illustration collections with searchable metadata (name, tags, kind) and a licence per asset.
 * Collections are separate lazy chunks — the editor, previews and exports load a collection the first time a design
 * uses one of its graphics (`ensureArt`), and the Elements panel loads them when shown. Graphics keep using the
 * `graphic` element (art id + colours), so everything here is recolourable and stays fully editable.
 *
 * Adding a collection: write `collections/<name>.ts` exporting `ASSETS: AssetDef[]` (ids start with the collection's
 * prefix), then add one line to COLLECTIONS below.
 */
import type { Art } from '../art';

export type AssetKind = 'illustration' | 'scene' | 'background' | 'decoration';
export interface AssetDef extends Art {
  kind: AssetKind;
  tags: string[];
  /** Licence of the artwork itself. Original Fuzzies artwork is drawn in code for this app. */
  license: string;
  author: string;
}
export interface Collection {
  id: string;
  name: string;
  blurb: string;
  prefix: string; // every asset id in the collection starts with this
  cover: string;  // asset id shown on the collection card
  load: () => Promise<{ ASSETS: AssetDef[] }>;
}

export const COLLECTIONS: Collection[] = [
  { id: 'halloween', name: 'Halloween', blurb: 'Pumpkins, ghosts, bats, haunted houses and moonlit scenes', prefix: 'hw-', cover: 'hw-jack', load: () => import('./collections/halloween') },
  { id: 'christmas', name: 'Christmas', blurb: 'Trees, ornaments, Santa, reindeer, snowflakes, presents and winter scenes', prefix: 'xm-', cover: 'xm-tree', load: () => import('./collections/christmas') },
  { id: 'hanukkah', name: 'Hanukkah', blurb: 'Hanukkiyot, dreidels, gelt, Stars of David and festival lights', prefix: 'hk-', cover: 'hk-menorah', load: () => import('./collections/hanukkah') },
  { id: 'passover', name: 'Passover', blurb: 'Seder plates, matzah, wine cups, Haggadot and spring flowers', prefix: 'ps-', cover: 'ps-seder-plate', load: () => import('./collections/passover') },
  { id: 'islamic', name: 'Ramadan & Eid', blurb: 'Lanterns, crescents, mosques, geometric patterns, dates and Eid gifts', prefix: 'is-', cover: 'is-lantern', load: () => import('./collections/islamic') },
  { id: 'jewish', name: 'Jewish holidays', blurb: 'Apples & honey, shofar, pomegranates, sukkah, lulav & etrog, Torah, Purim and more', prefix: 'jh-', cover: 'jh-apple-honey', load: () => import('./collections/jewish') },
  { id: 'christian', name: 'Easter & Christian', blurb: 'Crosses, empty tomb, lilies, eggs, palms, Advent wreath, doves, chalice and baptism shell', prefix: 'cr-', cover: 'cr-cross-sunrise', load: () => import('./collections/christian') },
  { id: 'indian', name: 'Diwali, Holi & more', blurb: 'Diyas, rangoli, marigold torans, star lanterns, mithai, Holi colours, dandiya, pookalam and dhol', prefix: 'in-', cover: 'in-diya', load: () => import('./collections/indian') },
  { id: 'baby', name: 'Baby', blurb: 'Teddy bears, clouds, moon & stars, boho rainbows, balloons, baby animals, onesies and soft flowers', prefix: 'bb-', cover: 'bb-teddy', load: () => import('./collections/baby') },
  { id: 'asian', name: 'Lunar New Year & Asian festivals', blurb: 'Red lanterns, envelopes, plum blossom, mooncakes, moon rabbit, dragon boats, zongzi and Vesak lanterns', prefix: 'as-', cover: 'as-lantern', load: () => import('./collections/asian') },
  { id: 'world', name: 'Nowruz, Kwanzaa & Día de Muertos', blurb: 'Haft-sin, sabzeh, hyacinths, kinara, unity cup, calaveras, marigolds and papel picado', prefix: 'wd-', cover: 'wd-kinara', load: () => import('./collections/world') },
  { id: 'milestones', name: 'Weddings & milestones', blurb: 'Rings, bouquets, cakes, champagne, graduation caps, houses, tiaras, tallit and gentle memorial pieces', prefix: 'ms-', cover: 'ms-rings', load: () => import('./collections/milestones') },
  { id: 'events', name: 'Parties & community events', blurb: 'Thanksgiving, birthday cakes, trophies, medals, running shoes, bingo, microphones, bunting and food trucks', prefix: 'ev-', cover: 'ev-birthday-cake', load: () => import('./collections/events') },
  { id: 'everyday', name: 'Everyday', blurb: 'Coffee, croissants, pizza, sushi, flowers, guitars, armchairs, cameras, party poppers and more', prefix: 'ed-', cover: 'ed-latte', load: () => import('./collections/everyday') },
  { id: 'icons', name: 'Topic icons', blurb: 'Sports, hobbies, events, business and school icons in your colours', prefix: 'ic-', cover: 'ic-awards', load: () => import('./collections/icons') },
  { id: 'bizart', name: 'Business & media', blurb: 'Logo marks, olive and eucalyptus sprigs, a water-cycle diagram, a phone mock-up, shop front and more', prefix: 'bz-', cover: 'bz-olive-branch', load: () => import('./collections/bizart') },
];

const loaded = new Map<string, AssetDef>();
const done = new Set<string>();
const pending = new Map<string, Promise<void>>();

/** An asset from a loaded collection (undefined until its collection has loaded). */
export const loadedAsset = (id: string): AssetDef | undefined => loaded.get(id);
export const collectionOf = (artId: string): Collection | undefined => COLLECTIONS.find((c) => artId.startsWith(c.prefix));
export const isLoaded = (c: Collection) => done.has(c.id);

export function loadCollection(c: Collection): Promise<void> {
  if (done.has(c.id)) return Promise.resolve();
  let p = pending.get(c.id);
  if (!p) {
    p = c.load().then((m) => { for (const a of m.ASSETS) loaded.set(a.id, a); done.add(c.id); }).finally(() => pending.delete(c.id));
    pending.set(c.id, p);
  }
  return p;
}

/** Make sure the collections behind these art ids are loaded. Resolves true if anything new arrived. */
export async function ensureArt(ids: Iterable<string>): Promise<boolean> {
  const need = new Set<Collection>();
  for (const id of ids) { const c = collectionOf(id); if (c && !done.has(c.id)) need.add(c); }
  if (!need.size) return false;
  await Promise.all([...need].map((c) => loadCollection(c).catch(() => {})));
  return true;
}

export const loadAllCollections = () => Promise.all(COLLECTIONS.map((c) => loadCollection(c).catch(() => {})));
export const assetsIn = (c: Collection): AssetDef[] => [...loaded.values()].filter((a) => a.id.startsWith(c.prefix));

/** Search loaded assets by name and tags (every word must match the start of a word). */
export function searchAssets(q: string): AssetDef[] {
  const words = q.toLowerCase().split(/[^a-z0-9']+/).filter(Boolean);
  if (!words.length) return [];
  return [...loaded.values()].filter((a) => {
    const hay = [a.name, ...a.tags, a.kind].join(' ').toLowerCase().split(/[^a-z0-9']+/);
    return words.every((w) => hay.some((h) => h.startsWith(w) || (w.length > 3 && w.endsWith('s') && h.startsWith(w.slice(0, -1)))));
  });
}
