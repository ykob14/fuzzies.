/**
 * 3D pictures for the shop packs and the gift box, rendered on demand from the game's models (game/mascot3d.ts →
 * renderArt) and kept for the visit. Resolves to null without WebGL (the flat drawings stay).
 */
import type { Art } from '../game/mascot3d';

let art: Promise<Art | null> | null = null;

export function getArt(): Promise<Art | null> {
  art ??= (async () => {
    try {
      const c = document.createElement('canvas');
      if (!(c.getContext('webgl2') || c.getContext('webgl'))) return null;
      const m = await import('../game/mascot3d');
      return await m.renderArt();
    } catch (e) {
      console.warn('3D art unavailable', e);
      return null;
    }
  })();
  return art;
}
