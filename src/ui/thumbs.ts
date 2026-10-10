/** Cached preview images for templates (re-rendered once web fonts arrive). */
import type { Template } from '../content/templates';
import { pageCanvas, onAssetsLoaded } from '../editor/render';
import { onFontsLoaded } from '../content/fonts';
import { fitText } from '../editor/render';

const cache = new Map<string, string>();
const live = new Map<string, Set<HTMLImageElement>>();

function render(t: Template, max: number): string {
  for (const p of t.design.pages) for (const el of p.elements) if (el.type === 'text') fitText(el);
  const s = max / Math.max(t.design.width, t.design.height);
  return pageCanvas(t.design, t.design.pages[0], s).toDataURL('image/jpeg', 0.85);
}

let refreshQueued = false;
function refreshAll(): void {
  if (refreshQueued) return;
  refreshQueued = true;
  setTimeout(() => {
    refreshQueued = false;
    for (const [key, imgs] of live) {
      const [id] = key.split('@');
      const t = tplIndex.get(id);
      if (!t) continue;
      const url = render(t, Number(key.split('@')[1]));
      cache.set(key, url);
      for (const img of imgs) { if (img.isConnected) img.src = url; else imgs.delete(img); }
    }
  }, 150);
}
onFontsLoaded(refreshAll);
onAssetsLoaded(refreshAll);

const tplIndex = new Map<string, Template>();

export function templateThumb(t: Template, max = 420): HTMLImageElement {
  tplIndex.set(t.id, t);
  const key = `${t.id}@${max}`;
  let url = cache.get(key);
  if (!url) { url = render(t, max); cache.set(key, url); }
  const img = new Image();
  img.alt = t.name;
  img.src = url;
  img.decoding = 'async';
  if (!live.has(key)) live.set(key, new Set());
  live.get(key)!.add(img);
  return img;
}
