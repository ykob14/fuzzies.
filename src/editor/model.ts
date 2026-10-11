/**
 * The saved design format — the "Fuzzies document". Plain JSON, versioned, shared by the editor, My Designs,
 * templates, sync, share links and .fuzzies project files.
 *
 *   Design  { v, id, owner, name, width, height, pages[], assets{}, createdAt, updatedAt, thumb?, template?, folder? }
 *   Page    { id, background, bgAsset?, elements[] }             elements[] order = layer order (index 0 = back)
 *   Element { id, type, x, y, w, h, rotation, opacity, hidden?, locked?, group?, flipX?, flipY?, shadow?, name?, …style }
 *
 * - x/y/w/h are design pixels of the un-rotated box (top-left corner); rotation is in degrees around the box centre.
 * - `group`: elements sharing a group id select, move and resize together (groups are flat, not nested).
 * - Photos live once in `assets` (id → data URL) and elements point at them, so duplicating a photo doesn't copy it.
 * - Templates are never edited in place: `instantiate()` (doc.ts) deep-copies them with fresh ids into a new design and
 *   records the origin in `template`.
 * - Undo/redo snapshots the pages + size as JSON; autosave writes the whole design to IndexedDB (and the cloud via sync).
 *
 * Version history: 1 = original format (no `v` field). 2 = adds `v`, `folder`, and guarantees the invariants below.
 * `migrateDesign()` upgrades and repairs anything older or damaged; it is idempotent and safe to run on every load.
 */
import type { Design, El, ElType, Page } from './types';
import { DEFAULT_FILTERS } from './types';
import { uid } from '../core/util';

export const DOC_VERSION = 2;

const TYPES: ElType[] = ['shape', 'text', 'image', 'graphic', 'emoji', 'draw', 'qr'];

/** Style defaults per element type (what a brand-new element of that type has). */
const DEFAULTS: Record<ElType, Record<string, unknown>> = {
  shape: { shape: 'rect', fill: '#d6336c', stroke: '#18171c', strokeWidth: 0, radius: 0 },
  text: { text: '', font: 'Poppins', size: 64, weight: 700, italic: false, underline: false, uppercase: false, align: 'center', fill: '#1c1830', lineHeight: 1.2, letterSpacing: 0, strokeColor: '', strokeWidth: 0, bg: '' },
  image: { asset: '', radius: 0, mask: 'none', filters: DEFAULT_FILTERS, stroke: '#ffffff', strokeWidth: 0, panX: 0, panY: 0, zoom: 1 },
  graphic: { art: '', colors: [] },
  emoji: { char: '⭐' },
  draw: { points: [], color: '#18171c', width: 8 },
  qr: { text: 'https://', color: '#18171c', bg: '#ffffff' },
};

const num = (v: unknown, fallback: number): number => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

/**
 * Upgrade a design from any earlier version and repair anything that would break the editor
 * (missing ids, duplicate ids, bad numbers, unknown element types). Mutates and returns the same object.
 */
export function migrateDesign(input: unknown): Design {
  if (!isObj(input)) throw new Error('This design could not be read.');
  const d = input as unknown as Design & Record<string, unknown>;
  const now = Date.now();
  d.id = typeof d.id === 'string' && d.id ? d.id : uid('d_');
  d.name = typeof d.name === 'string' && d.name.trim() ? d.name : 'Untitled design';
  d.width = Math.max(1, Math.round(num(d.width, 1080)));
  d.height = Math.max(1, Math.round(num(d.height, 1080)));
  d.assets = isObj(d.assets) ? (d.assets as Record<string, string>) : {};
  d.createdAt = num(d.createdAt, now);
  d.updatedAt = num(d.updatedAt, d.createdAt);
  if (typeof d.owner !== 'string') d.owner = '';
  if (d.folder !== undefined && (typeof d.folder !== 'string' || !d.folder.trim())) delete d.folder;

  const pages = Array.isArray(d.pages) ? d.pages.filter(isObj) as unknown as Page[] : [];
  if (!pages.length) pages.push({ id: uid('p_'), background: '#ffffff', elements: [] });
  const seen = new Set<string>();
  const fresh = (id: unknown, prefix: string) => {
    let s = typeof id === 'string' && id ? id : uid(prefix);
    if (seen.has(s)) s = uid(prefix); // duplicate ids would make two layers select as one
    seen.add(s);
    return s;
  };
  for (const p of pages) {
    p.id = fresh(p.id, 'p_');
    if (p.background === undefined || p.background === null) p.background = '#ffffff';
    if (p.bgAsset !== undefined && typeof p.bgAsset !== 'string') delete p.bgAsset;
    const els = Array.isArray(p.elements) ? p.elements : [];
    p.elements = els.filter((e): e is El => isObj(e) && TYPES.includes((e as { type: ElType }).type)).map((e) => repairEl(e, fresh));
  }
  d.pages = pages;
  d.v = DOC_VERSION;
  return d;
}

function repairEl(e: El, fresh: (id: unknown, prefix: string) => string): El {
  const r = e as El & Record<string, unknown>;
  // fill in any style property this element type should have
  for (const [k, v] of Object.entries(DEFAULTS[e.type])) if (r[k] === undefined || r[k] === null) r[k] = Array.isArray(v) ? [...v] : isObj(v) ? { ...v } : v;
  r.id = fresh(r.id, 'e_');
  r.x = num(r.x, 0); r.y = num(r.y, 0);
  r.w = Math.max(1, num(r.w, 100)); r.h = Math.max(1, num(r.h, 100));
  r.rotation = num(r.rotation, 0);
  r.opacity = Math.min(1, Math.max(0, num(r.opacity, 1)));
  if (r.group !== undefined && (typeof r.group !== 'string' || !r.group)) delete r.group;
  if (e.type === 'image' && isObj(r.filters)) r.filters = { ...DEFAULT_FILTERS, ...(r.filters as object) };
  return e;
}
