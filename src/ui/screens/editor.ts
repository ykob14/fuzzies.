/** Loads a design and mounts the editor full screen. */
import type { Screen } from '../app';
import { Editor } from '../../editor/editor';
import { db } from '../../core/db';
import { accounts } from '../../core/account';
import { toast } from '../dom';

export async function openEditor(id: string): Promise<Screen | null> {
  const d = await db.getDesign(id);
  if (!d || d.owner !== accounts.current?.id) {
    toast('That design could not be found', 'bad');
    location.replace('#/projects');
    return null;
  }
  d.assets ??= {};
  const ed = new Editor(d, () => { location.hash = '#/home'; });
  document.body.classList.add('in-editor');
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
