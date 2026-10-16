/** Fuzzy Locker — placeholder until the real screen lands. */
import { h } from '../../ui/dom';
import type { PanelOpen } from '../hub';

export const open: PanelOpen = (ctx) => {
  ctx.root.replaceChildren(h('p', { class: 'muted', style: 'padding:24px;text-align:center' }, 'Fuzzy Locker is on its way.'));
};
