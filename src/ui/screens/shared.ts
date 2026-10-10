/** Viewer for shared design links: anyone can look, download, or remix a copy into their own Fuzzies. */
import type { Screen } from '../app';
import type { Design } from '../../editor/types';
import { readShareLink } from '../../core/sharelink';
import { pageCanvas, prepare, onAssetsLoaded } from '../../editor/render';
import { onFontsLoaded } from '../../content/fonts';
import { instantiate } from '../../editor/doc';
import { exportFiles, download } from '../../editor/export';
import { accounts } from '../../core/account';
import { track } from '../../core/missions';
import { db } from '../../core/db';
import { h, btn, logo, fuzzyMark, toast } from '../dom';

export const REMIX_KEY = 'fz.remix';

/** Copy a shared design into the signed-in account and open it in the editor. */
export async function remixShared(data: string): Promise<void> {
  const a = accounts.current;
  if (!a) return;
  try {
    const d = await readShareLink(data);
    const copy = instantiate(d, a.id, d.name);
    await db.putDesign(copy);
    accounts.update((x) => x.stats.designs++);
    track('design');
    toast('Remixed! It’s your copy now — change anything you like.', 'good', 3200);
    location.hash = `#/edit/${copy.id}`;
  } catch (e) {
    toast((e as Error).message, 'bad', 4000);
    location.hash = '#/home';
  }
}

export function sharedScreen(data: string): Screen {
  const body = h('div', { class: 'shared-body' }, h('div', { class: 'loading-screen' }, fuzzyMark(56), h('p', null, 'Opening shared design…')));
  const el = h('div', { class: 'shared' },
    h('header', { class: 'shared-top' },
      h('a', { href: '#/home' }, logo('sm')),
      accounts.current ? btn('My designs', { kind: 'ghost', size: 'sm', onClick: () => (location.hash = '#/home') }) : btn('Join Fuzzies — it’s free', { kind: 'primary', size: 'sm', onClick: () => (location.hash = '#/signup') })),
    body);
  let off: (() => void)[] = [];

  void readShareLink(data).then(async (d) => {
    await prepare(d).catch(() => {});
    show(d);
  }).catch((e) => {
    body.replaceChildren(h('div', { class: 'empty' }, fuzzyMark(56), h('h3', null, 'Hmm, this link doesn’t work'), h('p', { class: 'muted' }, (e as Error).message), btn('Go to Fuzzies', { kind: 'primary', onClick: () => (location.hash = '#/home') })));
  });

  function show(d: Design): void {
    const pages = h('div', { class: 'shared-pages' });
    const draw = () => {
      const max = Math.min(900, innerWidth - 32);
      const fit = Math.min(2, max / d.width, (innerHeight * 0.75) / d.height);
      const dpr = Math.min(2, devicePixelRatio || 1);
      pages.replaceChildren(...d.pages.map((p) => {
        const c = pageCanvas(d, p, fit * dpr);
        c.className = 'shared-page';
        c.style.width = `${Math.round(d.width * fit)}px`;
        return c;
      }));
    };
    draw();
    off = [onFontsLoaded(draw), onAssetsLoaded(draw)];
    const remix = btn('Remix this design', { kind: 'primary', size: 'lg', icon: 'wand', onClick: () => {
      if (accounts.current) void remixShared(data);
      else { sessionStorage.setItem(REMIX_KEY, data); toast('Make a free account (or continue as a guest) to remix it', 'info', 3500); location.hash = '#/signup'; }
    } });
    const dl = btn('Download', { kind: 'ghost', size: 'lg', icon: 'download', onClick: async () => download(await exportFiles(d, d.pages.length > 1 ? 'pdf' : 'png')) });
    body.replaceChildren(
      h('div', { class: 'shared-head' },
        h('div', null, h('p', { class: 'hero-kicker' }, 'Someone shared a design with you ✨'), h('h1', null, d.name), h('p', { class: 'muted' }, `${d.width} × ${d.height}${d.pages.length > 1 ? ` · ${d.pages.length} pages` : ''} · made with Fuzzies`)),
        h('div', { class: 'row' }, remix, dl)),
      pages,
      h('p', { class: 'fine' }, 'Remixing makes your own editable copy. The original stays exactly as it was.'));
  }

  return { el, destroy: () => off.forEach((f) => f()) };
}
