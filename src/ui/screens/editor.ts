/** Loads a design and mounts the editor full screen. */
import type { Screen } from '../app';
import { Editor } from '../../editor/editor';
import { db } from '../../core/db';
import { accounts } from '../../core/account';
import { toast } from '../dom';
import { takeTryIt } from '../create';
import { ensureFont } from '../../content/fonts';
import { makeText } from '../../editor/doc';
import { migrateDesign } from '../../editor/model';
import type { Design } from '../../editor/types';

export async function openEditor(id: string): Promise<Screen | null> {
  const raw = await db.getDesign(id);
  if (!raw || raw.owner !== accounts.current?.id) {
    toast('That design could not be found', 'bad');
    location.replace('#/projects');
    return null;
  }
  let d: Design;
  try { d = migrateDesign(raw); } // older or damaged saves are upgraded/repaired here, never thrown away
  catch { toast('That design could not be opened', 'bad'); location.replace('#/projects'); return null; }
  const ed = new Editor(d, () => { location.hash = '#/home'; });
  if (import.meta.env.DEV) (window as unknown as { __ed: unknown }).__ed = ed; // for tests
  document.body.classList.add('in-editor');
  const tryIt = takeTryIt(d.id);
  if (tryIt) requestAnimationFrame(() => {
    if (tryIt.font) {
      ensureFont(tryIt.font, 400, false);
      const W = ed.design.width, H = ed.design.height;
      ed.add([makeText('Hello, gorgeous', { font: tryIt.font, weight: 400, size: Math.round(ed.unit * 0.09), w: W * 0.75 })], { x: W / 2, y: H / 2 });
    }
    if (tryIt.panel) {
      ed.panels.show(tryIt.panel);
      const label = [...ed.root.querySelectorAll<HTMLElement>('.ed-panel-body .pnl-label')].find((l) => tryIt.focus && l.textContent?.startsWith(tryIt.focus));
      const body = label?.closest<HTMLElement>('.ed-panel-body');
      if (label && body) body.scrollTop += label.getBoundingClientRect().top - body.getBoundingClientRect().top - 12;
    }
  });
  return {
    el: ed.root,
    destroy: () => {
      // leaving by browser back: make sure the latest changes are saved
      ed.finishTextEdit();
      ed.save.flush();
      ed.destroy();
      document.body.classList.remove('in-editor');
    },
  };
}
