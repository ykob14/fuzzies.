/**
 * Card pictures for Fuzzies and styles. ONE place to change how a Fuzzy is pictured: today the owner's friend picture (or a coloured
 * Fuzzy mark); the 3D thumbnails (crossing/ui/showroom.ts `thumbnail(def)`) can be swapped in here later without touching a screen.
 */
import { h } from '../../ui/dom';
import { fuzzyMark } from '../../ui/dom';
import { friendUrl } from '../../content/friends';
import { RARITY_COLOR, type CharacterDef } from '../characters';
import type { CosmeticDef, CosmeticSlot } from '../cosmetics';
import { gicon, type GIcon } from './gicons';
import './gameui.css';
import './portrait.css';

export function characterPortrait(def: CharacterDef, size: number): HTMLElement {
  return def.friend
    ? h('img', { class: 'fzx-portrait', src: friendUrl(def.friend), alt: '', width: size, height: size, style: `width:${size}px;height:${size}px`, draggable: 'false', loading: 'lazy' })
    : h('span', { class: 'fzx-portrait', style: `width:${size}px;height:${size}px` }, fuzzyMark(size, def.color));
}
const SLOT_ICON: Record<CosmeticSlot, GIcon> = { trail: 'trail', jump: 'jump', celebration: 'celebrate', extra: 'outfit' };
/** a picture tile for a style (one picture per kind of style), rimmed in its rarity colour — no emoji */
export function cosmeticBadge(def: CosmeticDef, size: number): HTMLElement {
  const t = h('span', { class: 'fzx-ic soft fzx-cosbadge', style: `--rar:${RARITY_COLOR[def.rarity]};--sz:${size}px`, 'aria-hidden': 'true' });
  t.append(gicon(SLOT_ICON[def.slot], Math.round(size * 0.58)));
  return t;
}
