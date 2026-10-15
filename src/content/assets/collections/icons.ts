/** Topic icons (ic-<topic>): one drawn icon per generated template topic — sports, entertainment & community, business & education.
 *  Two colour slots each [main, detail], so templates recolour them to their palette. Original artwork drawn in code. */
import type { AssetDef } from '../index';
import { ICONS_SPORTS } from './icons-sports';
import { ICONS_FUN } from './icons-fun';
import { ICONS_WORK } from './icons-work';

export const ASSETS: AssetDef[] = [...ICONS_SPORTS, ...ICONS_FUN, ...ICONS_WORK];
