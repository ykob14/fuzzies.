/** Unlock celebration — simple placeholder until the 3D version lands (character appears in 3D with Equip Now). */
import { h, btn, modal } from '../../ui/dom';
import { takePending, equipCharacter } from '../store';
import { CHARACTER_BY_ID } from '../characters';
import { COSMETIC_BY_ID } from '../cosmetics';
import type { NavTarget } from '../hub';

export interface CelebrateHost { equipChanged(): void; go(t: NavTarget): void }

export async function celebrateAll(_root: HTMLElement, host: CelebrateHost): Promise<void> {
  for (let p = takePending(); p; p = takePending()) {
    const c = p.type === 'character' ? CHARACTER_BY_ID[p.id] : null;
    const x = p.type === 'cosmetic' ? COSMETIC_BY_ID[p.id] : null;
    await new Promise<void>((done) => {
      const m = modal(c ? `${c.name} unlocked!` : `${x?.name ?? 'New item'} unlocked!`, h('div', { class: 'unlock' }, h('p', null, c?.tagline ?? x?.blurb ?? '')), {
        actions: [btn('Nice!', { kind: 'ghost', onClick: () => { m.close(); done(); } }), ...(c ? [btn('Equip now', { kind: 'primary', onClick: () => { equipCharacter(c.id); host.equipChanged(); m.close(); done(); } })] : [])],
      });
    });
  }
}
