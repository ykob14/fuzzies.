/**
 * Card pictures for Fuzzies and styles. ONE place to change how a Fuzzy is pictured: today the owner's friend picture (or a coloured
 * Fuzzy mark); the 3D thumbnails (crossing/ui/showroom.ts `thumbnail(def)`) can be swapped in here later without touching a screen.
 */
import { h } from '../../ui/dom';
import { fuzzyMark } from '../../ui/dom';
import { friendUrl } from '../../content/friends';
import { RARITY_COLOR, type CharacterDef } from '../characters';
import type { CosmeticDef } from '../cosmetics';
import './portrait.css';

export function characterPortrait(def: CharacterDef, size: number): HTMLElement {
  return def.friend
    ? h('img', { class: 'fzx-portrait', src: friendUrl(def.friend), alt: '', width: size, height: size, style: `width:${size}px;height:${size}px`, draggable: 'false', loading: 'lazy' })
    : h('span', { class: 'fzx-portrait', style: `width:${size}px;height:${size}px` }, fuzzyMark(size, def.color));
}
/** a rounded tile with the style's emoji, ringed in its rarity colour */
export function cosmeticBadge(def: CosmeticDef, size: number): HTMLElement {
  return h('span', { class: 'fzx-cosbadge', style: `--rar:${RARITY_COLOR[def.rarity]};width:${size}px;height:${size}px;font-size:${Math.round(size * 0.52)}px`, 'aria-hidden': 'true' }, def.icon);
}
