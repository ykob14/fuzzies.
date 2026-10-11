/** Templates screen: the library code loads on first visit (kept out of the app's first download). */
import type { Screen } from '../app';
import { h } from '../dom';

export function templatesScreen(): Screen {
  const el = h('div', { class: 'page lib' }, h('div', { class: 'lib-loading' }, h('span', { class: 'ph-spin' }), 'Loading templates…'));
  let inner: Screen | null = null;
  let gone = false;
  void import('./library').then(({ libraryScreen }) => {
    if (gone) return;
    inner = libraryScreen();
    el.replaceWith(inner.el);
  });
  return { el, destroy: () => { gone = true; inner?.destroy?.(); } };
}
