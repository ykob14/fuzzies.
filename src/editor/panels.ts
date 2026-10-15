/** Left side panels (bottom sheets on phones): templates, elements, text, uploads, stickers, draw, background, layers. */
import type { Editor } from './editor';
import type { El, Fill, ShapeKind } from './types';
import { SHAPE_KINDS, shapePath } from './shapes';
import { qrMatrix } from './qr';
import { fillToCss, getImage } from './render';
import { makeText, elLabel } from './doc';
import { colorButton, GRADIENTS, PALETTE } from './colors';
import { ART_PACKS, ARTS, artDataUrl } from '../content/art';
import { COLLECTIONS, assetsIn, isLoaded, loadCollection, searchAssets, type AssetDef } from '../content/assets';
import { STICKER_PACKS } from '../content/stickers';
import { FRIENDS, friendUrl, friendData } from '../content/friends';
import { TEXT_STYLES, FX_PACK } from '../content/textstyles';
import { unlockDialog } from '../ui/unlock';
import { rewards } from '../core/rewards';
import { accounts } from '../core/account';
import { db } from '../core/db';
import { h, btn, icon, toast, confirmDialog, pickFile, fuzzyMark, type IconName } from '../ui/dom';
import { deepClone, uid } from '../core/util';
import { track } from '../core/missions';
import { findPhotos, fetchPhoto, canSearch, type StockPhoto } from './photos';

export interface Panels {
  rail: HTMLElement;
  panel: HTMLElement;
  show(name: string | null): void;
  refreshUploads(): void;
  dropPayload(p: DropPayload, at: { x: number; y: number }): void;
}

type DropPayload = { kind: 'shape'; shape: ShapeKind } | { kind: 'art'; art: string } | { kind: 'emoji'; char: string } | { kind: 'friend'; id: string }
  | { kind: 'text'; text: 'heading' | 'subheading' | 'body' } | { kind: 'upload'; id: string } | { kind: 'photo'; id: string };

const TABS: { id: string; label: string; icon: IconName }[] = [
  { id: 'templates', label: 'Templates', icon: 'grid' },
  { id: 'elements', label: 'Elements', icon: 'shapes' },
  { id: 'text', label: 'Text', icon: 'text' },
  { id: 'uploads', label: 'Uploads', icon: 'upload' },
  { id: 'photos', label: 'Photos', icon: 'image' },
  { id: 'stickers', label: 'Stickers', icon: 'sticker' },
  { id: 'draw', label: 'Draw', icon: 'brush' },
  { id: 'background', label: 'Background', icon: 'palette' },
  { id: 'layers', label: 'Layers', icon: 'layers' },
];

const lockBadge = (cost: number) => h('span', { class: 'lock-badge' }, fuzzyMark(14), String(cost));

export function buildPanels(ed: Editor): Panels {
  let active: string | null = null;
  const rail = h('nav', { class: 'ed-rail', 'aria-label': 'Editor tools' });
  const body = h('div', { class: 'ed-panel-body' });
  const title = h('h3');
  const panel = h('aside', { class: 'ed-panel', hidden: true },
    h('div', { class: 'ed-panel-head' }, h('div', { class: 'sheet-grip' }), title, btn(null, { icon: 'close', kind: 'plain', size: 'sm', title: 'Close panel', onClick: () => show(null) })),
    body);

  const railBtns = new Map<string, HTMLButtonElement>();
  for (const t of TABS) {
    const b = h('button', { class: 'rail-btn', type: 'button', title: t.label }, icon(t.icon, 22), h('span', null, t.label));
    b.addEventListener('click', () => show(active === t.id ? null : t.id));
    railBtns.set(t.id, b);
    rail.append(b);
  }

  function show(name: string | null): void {
    active = name;
    for (const [id, b] of railBtns) b.classList.toggle('on', id === name);
    panel.hidden = !name;
    ed.root.classList.toggle('panel-open', !!name);
    if (name) {
      ed.props.close();
      title.textContent = TABS.find((t) => t.id === name)?.label ?? '';
      render();
    }
    if (name !== 'draw' && ed.tool === 'draw') ed.setTool('select');
    requestAnimationFrame(() => ed.requestRender());
  }

  function render(): void {
    body.replaceChildren();
    body.scrollTop = 0;
    switch (active) {
      case 'templates': body.append(templatesPanel()); break;
      case 'elements': body.append(elementsPanel()); break;
      case 'text': body.append(textPanel()); break;
      case 'uploads': body.append(uploadsPanel()); break;
      case 'photos': body.append(photosPanel()); break;
      case 'stickers': body.append(stickersPanel()); break;
      case 'draw': body.append(drawPanel()); break;
      case 'background': body.append(backgroundPanel()); break;
      case 'layers': body.append(layersPanel()); break;
    }
  }

  /** On phones, close the sheet after adding something so the result is visible. */
  const afterAdd = () => { if (innerWidth < 760) show(null); };

  /**
   * Drag an item from a panel onto the design. One pointer-based drag for mouse, pen and touch:
   * a mouse drags after a small move; a finger presses and holds (so swiping still scrolls the panel).
   * A tap or click still adds the item in the middle, as before.
   */
  const draggable = (el: HTMLElement, payload: DropPayload) => {
    el.classList.add('can-drag');
    el.addEventListener('dragstart', (e) => e.preventDefault()); // no native image drag: we draw our own preview
    el.addEventListener('contextmenu', (e) => { if (e.pointerType !== 'mouse') e.preventDefault(); });
    let started = false;
    el.addEventListener('touchmove', (e) => { if (started) e.preventDefault(); }, { passive: false }); // dragging, not scrolling
    el.addEventListener('click', (e) => { if (el.dataset.dragged) { delete el.dataset.dragged; e.stopImmediatePropagation(); e.preventDefault(); } }, true);
    el.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      const sx = e.clientX, sy = e.clientY, touch = e.pointerType !== 'mouse';
      const stage = ed.root.querySelector<HTMLElement>('.ed-stage')!;
      let ghost: HTMLElement | null = null, over = false, timer = 0, lx = sx, ly = sy;
      const place = (x: number, y: number) => {
        lx = x; ly = y;
        if (ghost) ghost.style.transform = `translate(${x - ghost.offsetWidth / 2}px, ${y - ghost.offsetHeight / 2}px) rotate(-3deg)`;
        const r = stage.getBoundingClientRect();
        over = x >= r.left && x <= r.right && y >= r.top && y <= r.bottom && !(ed.root.classList.contains('panel-open') && innerWidth > 760 && panel.contains(document.elementFromPoint(x, y)));
        stage.classList.toggle('drop-target', over);
      };
      const begin = () => {
        started = true;
        const r = el.getBoundingClientRect();
        const w = Math.min(r.width, 200), hh = Math.min(r.height, 120) * (w / r.width || 1);
        ghost = el.cloneNode(true) as HTMLElement;
        ghost.classList.add('drag-ghost');
        // canvases don't copy their pixels when cloned
        const from = el.querySelectorAll('canvas'), to = ghost.querySelectorAll('canvas');
        from.forEach((c, i) => to[i]?.getContext('2d')?.drawImage(c, 0, 0));
        ghost.style.width = `${w}px`; ghost.style.height = `${Math.max(hh, Math.min(r.height, 64))}px`;
        document.body.append(ghost);
        ed.root.classList.add('dragging');
        navigator.vibrate?.(8);
        place(lx, ly);
      };
      const cleanup = () => {
        clearTimeout(timer);
        removeEventListener('pointermove', move); removeEventListener('pointerup', up); removeEventListener('pointercancel', cleanup);
        ghost?.remove(); ghost = null;
        stage.classList.remove('drop-target');
        ed.root.classList.remove('dragging');
        started = false;
      };
      const move = (ev: PointerEvent) => {
        if (!started) {
          const d = Math.hypot(ev.clientX - sx, ev.clientY - sy);
          if (touch) { if (d > 10) cleanup(); return; } // the finger moved before the hold: it's a scroll
          if (d < 6) return;
          lx = ev.clientX; ly = ev.clientY;
          begin();
        }
        place(ev.clientX, ev.clientY);
      };
      const up = () => {
        if (started) {
          el.dataset.dragged = '1'; // swallow the click that follows a drag
          setTimeout(() => delete el.dataset.dragged, 400);
          if (over) {
            const p = ed.toDesign(lx, ly);
            dropPayload(payload, { x: Math.max(0, Math.min(ed.design.width, p.x)), y: Math.max(0, Math.min(ed.design.height, p.y)) });
            afterAdd();
          }
        }
        cleanup();
      };
      if (touch) { lx = sx; ly = sy; timer = window.setTimeout(begin, 320); }
      addEventListener('pointermove', move); addEventListener('pointerup', up); addEventListener('pointercancel', cleanup);
    });
  };

  const section = (label: string, ...kids: (Node | null)[]) => h('section', { class: 'pnl-sec' }, h('div', { class: 'pnl-label' }, label), ...kids);

  // ---------- templates (the library loads the first time this panel opens) ----------
  function templatesPanel(): HTMLElement {
    const wrap = h('div', { class: 'lib-loading' }, h('span', { class: 'ph-spin' }), 'Loading templates…');
    void import('./templatesPanel').then(({ templatesPanelBody }) => { if (wrap.isConnected || active === 'templates') wrap.replaceWith(templatesPanelBody(ed, { afterAdd, rerender: render, lockBadge })); });
    return wrap;
  }

  // ---------- elements ----------
  function shapeIcon(kind: ShapeKind): HTMLCanvasElement {
    const c = h('canvas', { width: '96', height: '96' });
    const x = c.getContext('2d')!;
    const w = kind === 'arrow' ? 80 : 70, hh = kind === 'line' ? 10 : kind === 'arrow' ? 40 : 70;
    x.translate((96 - w) / 2, (96 - hh) / 2);
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#d6336c';
    if (kind === 'line' || kind === 'ring') {
      x.strokeStyle = accent; x.lineWidth = kind === 'line' ? 6 : 9; x.lineCap = 'round';
      const p = kind === 'ring' ? new Path2D() : shapePath('line', w, hh);
      if (kind === 'ring') p.ellipse(w / 2, hh / 2, w / 2 - 5, hh / 2 - 5, 0, 0, Math.PI * 2);
      x.stroke(p);
    } else { x.fillStyle = accent; x.fill(shapePath(kind, w, hh, 12)); }
    return c;
  }

  let elQuery = '';
  function elementsPanel(): HTMLElement {
    const wrap = h('div');
    const search = h('input', { class: 'input', placeholder: 'Search graphics — “bat”, “pumpkin”, “moon”…', value: elQuery, type: 'search', 'aria-label': 'Search shapes and graphics' });
    const list = h('div');
    const fill = () => {
      list.replaceChildren();
      const q = elQuery.toLowerCase();
      if (!q || 'qr code link'.includes(q)) {
        const link = h('input', { class: 'input input-sm', placeholder: 'Paste a link, e.g. https://…', 'aria-label': 'Link for the QR code' });
        const add = () => {
          const v = link.value.trim();
          if (!v) { link.focus(); toast('Type or paste a link first'); return; }
          try { qrMatrix(v); } catch (x) { toast((x as Error).message, 'bad'); return; }
          ed.addQr(v); afterAdd();
        };
        link.addEventListener('keydown', (e) => { if (e.key === 'Enter') add(); });
        list.append(section('QR code', h('div', { class: 'qr-add' }, link, btn('Add', { kind: 'primary', size: 'sm', icon: 'plus', onClick: add }))));
      }
      const shapes = SHAPE_KINDS.filter((s) => !q || s.label.toLowerCase().includes(q));
      if (shapes.length) list.append(section('Shapes & lines', h('div', { class: 'el-grid' }, ...shapes.map((s) => {
        const b = h('button', { class: 'el-item', type: 'button', title: s.label, 'aria-label': s.label }, shapeIcon(s.kind));
        b.addEventListener('click', () => { ed.addShape(s.kind); afterAdd(); });
        draggable(b, { kind: 'shape', shape: s.kind });
        return b;
      }))));
      // illustration collections (lazy): searchable by name and tags
      for (const col of COLLECTIONS) {
        if (!isLoaded(col)) {
          list.append(h('section', { class: 'pnl-sec' }, h('div', { class: 'pnl-label' }, col.name), h('div', { class: 'ph-status' }, h('span', { class: 'ph-spin' }), 'Loading…')));
          void loadCollection(col).then(() => { if (list.isConnected) fill(); }).catch(() => {});
          continue;
        }
        const all = q ? searchAssets(q).filter((a) => a.id.startsWith(col.prefix)) : assetsIn(col);
        const art = all.filter((a) => a.kind !== 'background');
        const scenes = all.filter((a) => a.kind === 'background' && a.id.endsWith('-sq'));
        const item = (a: AssetDef, onClick: () => void, drag = true) => {
          const b = h('button', { class: `el-item ${a.kind === 'background' ? 'el-scene' : ''}`, type: 'button', title: `${a.name} · ${a.license}`, 'aria-label': a.name }, h('img', { src: artDataUrl(a.id, a.colors), alt: '', loading: 'lazy' }));
          b.addEventListener('click', onClick);
          if (drag) draggable(b, { kind: 'art', art: a.id });
          return b;
        };
        if (art.length) list.append(h('section', { class: 'pnl-sec' }, h('div', { class: 'pnl-label' }, `${col.name} · illustrations`),
          h('div', { class: 'el-grid' }, ...art.map((a) => item(a, () => { ed.addGraphic(a.id); afterAdd(); })))));
        if (scenes.length) list.append(h('section', { class: 'pnl-sec' }, h('div', { class: 'pnl-label' }, `${col.name} · page backgrounds`),
          h('div', { class: 'el-grid scenes' }, ...scenes.map((a) => item(a, () => { ed.addSceneBackground(a.id.replace(/-sq$/, ''), a.name.replace(/ \(.*\)$/, '')); afterAdd(); }, false)))));
      }
      for (const pack of ART_PACKS) {
        const arts = ARTS.filter((a) => a.pack === pack.id && (!q || a.name.toLowerCase().includes(q) || pack.name.toLowerCase().includes(q)));
        if (!arts.length) continue;
        const locked = !rewards.isUnlocked(pack.id, pack.cost);
        const head = h('div', { class: 'pnl-label' }, pack.name, locked ? lockBadge(pack.cost) : null);
        const grid = h('div', { class: `el-grid ${locked ? 'locked' : ''}` }, ...arts.map((a) => {
          const b = h('button', { class: 'el-item', type: 'button', title: a.name, 'aria-label': a.name }, h('img', { src: artDataUrl(a.id, a.colors), alt: '', loading: 'lazy' }));
          b.addEventListener('click', () => {
            if (locked) { unlockDialog({ id: pack.id, name: pack.name, cost: pack.cost, kind: `Graphics pack · ${pack.blurb}` }, fill); return; }
            ed.addGraphic(a.id); afterAdd();
          });
          if (!locked) draggable(b, { kind: 'art', art: a.id });
          return b;
        }));
        list.append(h('section', { class: 'pnl-sec' }, head, grid));
      }
      if (!list.childElementCount) list.append(h('p', { class: 'muted' }, 'Nothing found.'));
    };
    search.addEventListener('input', () => { elQuery = search.value; fill(); });
    fill();
    wrap.append(search, list);
    return wrap;
  }

  // ---------- text ----------
  function textPanel(): HTMLElement {
    const add = (kind: 'heading' | 'subheading' | 'body', label: string, cls: string) => {
      const b = h('button', { class: `text-add ${cls}`, type: 'button' }, label);
      b.addEventListener('click', () => { ed.addText(kind); afterAdd(); });
      draggable(b, { kind: 'text', text: kind });
      return b;
    };
    const fxLocked = !rewards.isUnlocked(FX_PACK.id, FX_PACK.cost);
    const styles = h('div', { class: 'style-grid' }, ...TEXT_STYLES.map((s) => {
      const locked = s.premium && fxLocked;
      const b = h('button', { class: 'style-item', type: 'button', title: s.name }, h('span', { style: s.css }, s.name), locked ? lockBadge(FX_PACK.cost) : null);
      b.addEventListener('click', () => {
        if (locked) { unlockDialog({ id: FX_PACK.id, name: FX_PACK.name, cost: FX_PACK.cost, kind: 'Neon, retro, gradient, sticker, glitch & marker text styles' }, render); return; }
        const u = ed.unit;
        const sel = ed.selected.filter((e) => e.type === 'text');
        const style = s.style(u);
        if (sel.length) {
          // restyle the selected text but keep its words
          for (const el of sel) { const { text, ...rest } = style; Object.assign(el, { shadow: null, bg: '', strokeWidth: 0, strokeColor: '' }, rest); void text; }
          ed.commit();
          ed.props.refresh();
        } else {
          const el = makeText(style.text ?? s.name, { w: ed.design.width * 0.7, ...style });
          ed.add([el]);
          track('text');
          afterAdd();
        }
      });
      return b;
    }));
    return h('div', null,
      brandText(),
      add('heading', 'Add a heading', 'th1'), add('subheading', 'Add a subheading', 'th2'), add('body', 'Add a little bit of body text', 'th3'),
      section('Text styles', h('p', { class: 'hint' }, 'Tap to add — or select text first to restyle it.'), styles),
      section('Tips', h('p', { class: 'hint' }, 'Double-click (or double-tap) text to type. Drag a corner to scale the text; drag a side to change the width. Fonts, colours, outline and shadow are in the Edit panel.')));
  }

  // ---------- brand kit ----------
  function brandText(): HTMLElement {
    const b = accounts.current?.brand;
    const setup = h('button', { class: 'link', type: 'button', onclick: () => { void ed.exit().then(() => (location.hash = '#/settings')); } }, 'Set up your brand kit');
    if (!b || (!b.colors.length && !b.logo && b.heading === 'Poppins' && b.body === 'DM Sans')) {
      return h('div', { class: 'brand-cta' }, icon('palette', 18), h('span', null, 'Save your colours, fonts and logo once and use them everywhere. '), setup);
    }
    const ink = b.colors[0] ?? '#18171c';
    const mk = (label: string, font: string, kind: 'heading' | 'body') => {
      const x = h('button', { class: `text-add brand-${kind}`, type: 'button', style: `font-family:"${font}"` }, label);
      x.addEventListener('click', () => { ed.addText(kind, { font, fill: kind === 'heading' ? ink : '#18171c', weight: kind === 'heading' ? 700 : 400 }); afterAdd(); });
      return x;
    };
    return h('section', { class: 'pnl-sec brand-sec' }, h('div', { class: 'pnl-label' }, 'Brand kit'), mk('Brand heading', b.heading, 'heading'), mk('Brand body text', b.body, 'body'));
  }

  // ---------- uploads ----------
  let uploadsGrid: HTMLElement | null = null;
  const uploadsById = new Map<string, { id: string; src: string; w: number; h: number }>();
  async function fillUploads(): Promise<void> {
    if (!uploadsGrid) return;
    const owner = accounts.current?.id ?? '';
    const list = await db.listUploads(owner);
    const grid = uploadsGrid;
    grid.replaceChildren(...list.map((u) => {
      const del = h('button', { class: 'up-del', type: 'button', title: 'Remove from uploads', 'aria-label': 'Remove from uploads' }, icon('close', 14));
      const b = h('div', { class: 'up-item', role: 'button', tabindex: '0', title: 'Add to design' }, h('img', { src: u.src, alt: '', loading: 'lazy' }), del);
      uploadsById.set(u.id, u);
      draggable(b, { kind: 'upload', id: u.id });
      b.addEventListener('click', (e) => {
        if (del.contains(e.target as Node)) return;
        ed.addImage(u.id, u.src, u.w, u.h);
        track('photo');
        afterAdd();
      });
      del.addEventListener('click', async () => {
        if (!(await confirmDialog('Remove this photo?', 'It is removed from your uploads. Designs that already use it keep their copy.', 'Remove'))) return;
        await db.deleteUpload(u.id);
        void fillUploads();
      });
      return b;
    }));
    if (!list.length) grid.append(h('p', { class: 'muted', style: 'grid-column:1/-1' }, 'Your uploaded photos appear here.'));
  }

  function uploadsPanel(): HTMLElement {
    const up = btn('Upload photos', { kind: 'primary', icon: 'upload', class: 'btn-block', onClick: async () => { const files = await pickFile('image/*', true); if (files.length) { await ed.addFiles(files); afterAdd(); } } });
    uploadsGrid = h('div', { class: 'up-grid' });
    void fillUploads();
    const logo = accounts.current?.brand.logo;
    const logoBtn = logo ? btn('Add my logo', { kind: 'soft', icon: 'star', class: 'btn-block', onClick: () => { ed.addImage(`brand-logo-${logo.src.length}`, logo.src, logo.w, logo.h, undefined, { fill: false }); afterAdd(); } }) : null;
    return h('div', null, up, logoBtn,
      h('p', { class: 'hint' }, 'Drag & drop or paste (Ctrl/Cmd+V) images straight onto the canvas. On phones you can take a photo or pick from your gallery.'),
      section('Your uploads', uploadsGrid));
  }

  // ---------- photos ----------
  const photosById = new Map<string, StockPhoto>();
  /** Download a photo and put it in the design (centred, or at a drop point), with its credit. */
  async function addPhoto(ph: StockPhoto, tile: HTMLElement | null, at?: { x: number; y: number }): Promise<void> {
    tile?.classList.add('busy');
    try {
      const { src, w, h: ih } = await fetchPhoto(ph);
      const id = uid('a_');
      const el = ed.addImage(id, src, w, ih, at); // fills a selected empty frame / the photo it was dropped on
      el.name = ph.credit.by ? `Photo · ${ph.credit.by}` : 'Photo'; el.credit = { ...ph.credit }; ed.commit();
      track('photo');
      afterAdd();
    } catch (e) {
      console.warn(e);
      toast(!navigator.onLine ? 'Photos need an internet connection.' : (e as Error).message && !/^photo/.test((e as Error).message) ? (e as Error).message : 'That photo could not be loaded — try another one.', 'bad');
    } finally { tile?.classList.remove('busy'); }
  }

  // the panel remembers the last search while the editor is open
  const photoState = { q: '', page: 0, items: [] as StockPhoto[], more: true, provider: '', providerUrl: '' };
  function photosPanel(): HTMLElement {
    const cols = [h('div', { class: 'ph-col' }), h('div', { class: 'ph-col' })];
    let heights = [0, 0];
    const status = h('div', { class: 'ph-status' });
    const source = h('p', { class: 'hint ph-source' });
    const more = btn('Load more photos', { kind: 'ghost', class: 'btn-block', onClick: () => void load(true) });
    more.hidden = true;
    const input = h('input', { class: 'input', type: 'search', placeholder: 'Search photos — “basketball”, “beach party”…', value: photoState.q, 'aria-label': 'Search photos' });
    const form = h('form', { class: 'ph-search', role: 'search' }, input);
    form.hidden = canSearch() === false;
    form.addEventListener('submit', (ev) => { ev.preventDefault(); input.blur(); start(input.value); });
    let tmr = 0;
    input.addEventListener('input', () => { clearTimeout(tmr); tmr = window.setTimeout(() => start(input.value), 450); });
    const tile = (ph: StockPhoto) => {
      photosById.set(ph.id, ph);
      const c = ph.credit;
      const img = h('img', { src: ph.thumb, alt: ph.alt || (c.by ? `Photo by ${c.by}` : 'Photo'), loading: 'lazy', referrerpolicy: 'no-referrer', style: `aspect-ratio:${ph.width}/${ph.height}` });
      const b = h('button', { class: 'ph-item', type: 'button', title: `${c.by ? `Photo by ${c.by} · ` : ''}${c.source} · ${c.license} — tap to add` }, img, h('span', { class: 'ph-by' }, c.by));
      b.addEventListener('click', () => void addPhoto(ph, b));
      draggable(b, { kind: 'photo', id: ph.id });
      return b;
    };
    const place = (list: StockPhoto[]) => {
      for (const ph of list) {
        const col = heights[0] <= heights[1] ? 0 : 1; // simple masonry: add to the shorter column
        cols[col].append(tile(ph));
        heights[col] += ph.height / ph.width;
      }
    };
    const showSource = () => {
      const p = photoState.provider;
      source.replaceChildren(...(p ? ['Photos from ', photoState.providerUrl ? h('a', { href: photoState.providerUrl, target: '_blank', rel: 'noopener noreferrer' }, p) : p,
        p === 'Openverse' ? ' (free licences that allow changes and commercial use). Credits are saved with each photo.' : p === 'Pexels' ? ' — free to use. Tap to add, or drag onto your design.' : ' photographers — free to use. Tap to add, or drag onto your design.'] : []));
    };
    let ticket = 0;
    function start(q: string): void {
      if (q.trim() === photoState.q.trim() && photoState.items.length) return;
      Object.assign(photoState, { q, page: 0, items: [], more: true });
      cols.forEach((c) => c.replaceChildren()); heights = [0, 0];
      void load(false);
    }
    async function load(next: boolean): Promise<void> {
      const my = ++ticket;
      status.replaceChildren(h('span', { class: 'ph-spin' }), photoState.q.trim() ? 'Searching photos…' : 'Loading photos…');
      more.disabled = true;
      try {
        const page = await findPhotos(photoState.q, photoState.page + 1);
        if (my !== ticket) return; // a newer search started
        photoState.page++;
        const fresh = page.items.filter((p) => !photoState.items.some((x) => x.id === p.id));
        photoState.items.push(...fresh);
        Object.assign(photoState, { more: page.more, provider: page.provider, providerUrl: page.providerUrl ?? '' });
        place(fresh);
        form.hidden = canSearch() === false;
        showSource();
        status.replaceChildren(...(photoState.items.length ? [] : [h('p', { class: 'muted' }, `No photos found for “${photoState.q.trim()}”. Try other words.`)]));
        more.hidden = !photoState.more;
      } catch (e) {
        if (my !== ticket) return;
        console.warn(e);
        const msg = !navigator.onLine ? 'Photos need an internet connection.' : (e as Error).message && !/^photos? /.test((e as Error).message) ? (e as Error).message : 'Photos could not be loaded right now.';
        status.replaceChildren(h('p', { class: 'muted' }, msg), btn('Try again', { kind: 'soft', size: 'sm', onClick: () => void load(next) }));
      } finally { if (my === ticket) more.disabled = false; }
    }
    if (photoState.items.length) { place(photoState.items); showSource(); more.hidden = !photoState.more; } else void load(false);
    return h('div', null, form, source, h('div', { class: 'ph-grid' }, ...cols), status, more);
  }

  // ---------- stickers ----------
  function stickersPanel(): HTMLElement {
    const wrap = h('div');
    // the owner's own Fuzzy Friends first (free): pictures, added as images so they export like any photo
    wrap.append(h('section', { class: 'pnl-sec' },
      h('div', { class: 'pnl-label' }, 'Fuzzy Friends'),
      h('div', { class: 'friend-grid' }, ...FRIENDS.map((f) => {
        const b = h('button', { class: 'friend-item', type: 'button', title: f.name, 'aria-label': `Sticker ${f.name}` }, h('img', { src: friendUrl(f.id), alt: '', loading: 'lazy', draggable: 'false' }));
        b.addEventListener('click', () => { void addFriend(f.id); });
        draggable(b, { kind: 'friend', id: f.id });
        return b;
      }))));
    for (const pack of STICKER_PACKS) {
      const locked = !rewards.isUnlocked(pack.id, pack.cost);
      wrap.append(h('section', { class: 'pnl-sec' },
        h('div', { class: 'pnl-label' }, pack.name, locked ? lockBadge(pack.cost) : null),
        h('div', { class: `emoji-grid ${locked ? 'locked' : ''}` }, ...pack.items.map((ch) => {
          const b = h('button', { class: 'emoji-item', type: 'button', 'aria-label': `Sticker ${ch}` }, ch);
          b.addEventListener('click', () => {
            if (locked) { unlockDialog({ id: pack.id, name: pack.name, cost: pack.cost, kind: 'Sticker pack', preview: h('div', { class: 'unlock-emoji' }, pack.items.slice(0, 6).join(' ')) }, render); return; }
            ed.addEmoji(ch); afterAdd();
          });
          if (!locked) draggable(b, { kind: 'emoji', char: ch });
          return b;
        }))));
    }
    return wrap;
  }

  async function addFriend(id: string, at?: { x: number; y: number }): Promise<void> {
    try {
      const src = await friendData(id);
      ed.addImage(`friend-${id}`, src, 256, 256, at, { fill: false });
      track('sticker');
      afterAdd();
    } catch { toast('Couldn’t load that sticker — check your connection.', 'bad'); }
  }

  // ---------- draw ----------
  function drawPanel(): HTMLElement {
    const s = ed.drawSettings;
    if (ed.tool !== 'draw') ed.setTool('draw');
    const modes: { id: 'pen' | 'hl' | 'eraser'; label: string; icon: IconName }[] = [{ id: 'pen', label: 'Pen', icon: 'brush' }, { id: 'hl', label: 'Highlighter', icon: 'edit' }, { id: 'eraser', label: 'Eraser', icon: 'eraser' }];
    const cur = s.eraser ? 'eraser' : s.highlighter ? 'hl' : 'pen';
    const seg = h('div', { class: 'seg seg-lg' }, ...modes.map((m) => {
      const b = h('button', { type: 'button', class: m.id === cur ? 'on' : '' }, icon(m.icon, 16), m.label);
      b.addEventListener('click', () => { s.eraser = m.id === 'eraser'; s.highlighter = m.id === 'hl'; if (s.highlighter && s.width < 20) s.width = 28; render(); });
      return b;
    }));
    const width = h('input', { type: 'range', class: 'range', min: '1', max: '120', value: String(s.width) });
    const wl = h('b', null, String(s.width));
    width.addEventListener('input', () => { s.width = Number(width.value); wl.textContent = width.value; });
    const sw = h('div', { class: 'swatches' }, ...['#1c1830', '#ffffff', '#ff3b30', '#ff9f1c', '#ffd23f', '#2ec4b6', '#3a86ff', '#7c4dff', '#ff4f9a'].map((c) => {
      const b = h('button', { type: 'button', class: `swatch ${c === s.color ? 'on' : ''}`, style: `background:${c}`, 'aria-label': c });
      b.addEventListener('click', () => { s.color = c; render(); });
      return b;
    }), colorButton(s.color, { title: 'Custom colour', onInput: (f) => { s.color = typeof f === 'string' ? f : f.stops[0].color; }, onCommit: () => {} }));
    const done = btn('Done drawing', { kind: 'primary', icon: 'check', class: 'btn-block', onClick: () => { ed.setTool('select'); show(null); } });
    return h('div', null, seg,
      s.eraser ? h('p', { class: 'hint' }, 'Drag over a drawing to erase it.') : h('div', null, section('Colour', sw), section('Size', h('div', { class: 'row' }, width, wl))),
      h('p', { class: 'hint' }, 'Draw with your finger, mouse or pen. Each stroke becomes its own layer you can move, recolour or delete.'),
      done);
  }

  // ---------- background ----------
  let paletteIdx = 0;
  function backgroundPanel(): HTMLElement {
    const setBg = (f: Fill) => { ed.setBackground(f); ed.commit(); };
    const solid = h('div', { class: 'swatches' }, ...PALETTE.map((c) => {
      const b = h('button', { type: 'button', class: 'swatch', style: `background:${c}`, 'aria-label': c });
      b.addEventListener('click', () => setBg(c));
      return b;
    }));
    const grads = h('div', { class: 'swatches swatches-lg' }, ...GRADIENTS.map((g) => {
      const b = h('button', { type: 'button', class: 'swatch', style: `background:${fillToCss(g)}`, 'aria-label': 'Gradient' });
      b.addEventListener('click', () => setBg(deepClone(g)));
      return b;
    }));
    const custom = h('div', { class: 'row' }, colorButton(ed.page.background, { gradient: true, docColors: ed.docColors(), title: 'Custom background', onInput: (f) => ed.setBackground(f), onCommit: () => ed.commit() }), h('span', null, 'Custom colour or gradient'));
    const photos = h('div', { class: 'up-grid' });
    void db.listUploads(accounts.current?.id ?? '').then((list) => {
      photos.replaceChildren(...list.map((u) => {
        const b = h('button', { class: 'up-item', type: 'button', title: 'Use as background' }, h('img', { src: u.src, alt: '', loading: 'lazy' }));
        b.addEventListener('click', () => ed.setBackgroundPhoto(u.id, u.src));
        return b;
      }));
      if (!list.length) photos.append(h('p', { class: 'muted', style: 'grid-column:1/-1' }, 'Upload photos in the Uploads tab to use them here.'));
    });
    const remove = ed.page.bgAsset ? btn('Remove background photo', { kind: 'ghost', icon: 'trash', class: 'btn-block', onClick: () => { ed.setBackgroundPhoto(null); render(); } }) : null;
    const magic = btn('Shuffle colour palette', { kind: 'soft', icon: 'wand', class: 'btn-block', onClick: () => { recolor(ed, PALETTES[paletteIdx++ % PALETTES.length]); } });
    const brand = accounts.current?.brand.colors ?? [];
    const brandBtn = brand.length >= 2 ? btn('Use my brand colours', { kind: 'soft', icon: 'palette', class: 'btn-block', onClick: () => recolor(ed, brand) }) : null;
    const brandSw = brand.length ? section('Brand colours', h('div', { class: 'swatches' }, ...brand.map((c) => {
      const b = h('button', { type: 'button', class: 'swatch', style: `background:${c}`, 'aria-label': c });
      b.addEventListener('click', () => setBg(c));
      return b;
    }))) : null;
    return h('div', null,
      section('Magic', magic, brandBtn, h('p', { class: 'hint' }, 'Recolours the whole page with a matching palette. Tap again for the next one.')),
      brandSw,
      section('Colours', solid), section('Gradients', grads), section('Custom', custom), section('Photo background', photos, remove));
  }

  // ---------- layers ----------
  function layersPanel(): HTMLElement {
    const list = h('div', { class: 'layers' });
    const fill = () => {
      const els = [...ed.page.elements].reverse();
      list.replaceChildren(...els.map((el) => layerRow(el)));
      if (!els.length) list.append(h('p', { class: 'muted' }, 'This page is empty. Add text, shapes or photos!'));
    };
    const layerRow = (el: El) => {
      const sel = ed.selection.includes(el.id);
      const vis = btn(null, { icon: el.hidden ? 'eyeOff' : 'eye', kind: 'plain', size: 'sm', title: el.hidden ? 'Show' : 'Hide', onClick: (e) => { e.stopPropagation(); el.hidden = !el.hidden; ed.commit(); fill(); } });
      const lock = btn(null, { icon: el.locked ? 'lock' : 'unlock', kind: 'plain', size: 'sm', title: el.locked ? 'Unlock' : 'Lock', onClick: (e) => { e.stopPropagation(); el.locked = !el.locked; ed.commit(); fill(); } });
      const up = btn(null, { icon: 'up', kind: 'plain', size: 'sm', title: 'Move up', onClick: (e) => { e.stopPropagation(); ed.select([el.id]); ed.reorder('up'); fill(); } });
      const down = btn(null, { icon: 'down', kind: 'plain', size: 'sm', title: 'Move down', onClick: (e) => { e.stopPropagation(); ed.select([el.id]); ed.reorder('down'); fill(); } });
      const grip = h('span', { class: 'layer-grip', title: 'Drag to reorder', 'aria-hidden': 'true' }, '⋮⋮');
      const name = h('span', { class: 'layer-name', title: 'Double-click to rename' }, el.group ? h('span', { class: 'layer-group', title: 'Grouped' }, '🔗 ') : null, elLabel(el));
      const row = h('div', { class: `layer ${sel ? 'on' : ''} ${el.hidden ? 'dim' : ''}`, role: 'button', tabindex: '0', 'data-id': el.id }, grip, layerIcon(el), name, up, down, vis, lock);
      row.addEventListener('click', (e) => { if (dragged) return; ed.select(e.shiftKey ? [...ed.selection, el.id] : [el.id]); fill(); });
      name.addEventListener('dblclick', (e) => { e.stopPropagation(); rename(el, name); });
      row.addEventListener('keydown', (e) => { if (e.key === 'F2') { e.preventDefault(); rename(el, name); } });
      row.addEventListener('pointerdown', (e) => startDrag(e, el, row, e.target === grip || grip.contains(e.target as Node)));
      return row;
    };
    /** Rename a layer in place (an empty name goes back to the automatic one). */
    const rename = (el: El, span: HTMLElement) => {
      const input = h('input', { class: 'input input-sm layer-rename', value: el.name ?? elLabel(el), maxlength: '60', 'aria-label': 'Layer name' });
      span.replaceWith(input);
      input.focus(); input.select();
      let done = false;
      const finish = (keep: boolean) => {
        if (done) return; done = true;
        if (keep) { const v = input.value.trim(); if (v) el.name = v; else delete el.name; ed.commit(); }
        fill();
      };
      input.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') finish(true); if (e.key === 'Escape') finish(false); });
      input.addEventListener('blur', () => finish(true));
      input.addEventListener('click', (e) => e.stopPropagation());
    };
    /** Drag a row up or down to restack (mouse: anywhere on the row; touch: by its grip, so the list still scrolls). */
    let dragged = false;
    const startDrag = (e: PointerEvent, el: El, row: HTMLElement, onGrip: boolean) => {
      if ((e.target as HTMLElement).closest('button, input') || (e.pointerType !== 'mouse' && !onGrip) || e.button > 0) return;
      const y0 = e.clientY;
      let on = false, to = -1;
      const rows = () => [...list.querySelectorAll<HTMLElement>('.layer')];
      const line = h('div', { class: 'layer-drop' });
      const move = (ev: PointerEvent) => {
        if (!on && Math.abs(ev.clientY - y0) < 5) return;
        if (!on) { on = true; dragged = true; row.classList.add('lifted'); list.append(line); try { row.setPointerCapture(ev.pointerId); } catch { /* gone */ } }
        ev.preventDefault();
        row.style.transform = `translateY(${ev.clientY - y0}px)`;
        const rs = rows().filter((r) => r !== row);
        to = rs.findIndex((r) => { const b = r.getBoundingClientRect(); return ev.clientY < b.top + b.height / 2; });
        if (to < 0) to = rs.length;
        const lr = list.getBoundingClientRect();
        const ref = rs[to]?.getBoundingClientRect() ?? rs[rs.length - 1]?.getBoundingClientRect();
        line.style.top = `${(rs[to] ? ref!.top : ref ? ref.bottom : lr.top) - lr.top + list.scrollTop - 2}px`;
      };
      const up = () => {
        removeEventListener('pointermove', move); removeEventListener('pointerup', up); removeEventListener('pointercancel', up);
        line.remove(); row.style.transform = ''; row.classList.remove('lifted');
        setTimeout(() => { dragged = false; });
        if (!on) return;
        // rows are front-first; the page keeps back-first
        const order = [...ed.page.elements].reverse().filter((x) => x !== el);
        order.splice(to, 0, el);
        const next = order.reverse();
        if (next.some((x, i) => x !== ed.page.elements[i])) { ed.page.elements = next; ed.select([el.id]); ed.commit(); }
        fill();
      };
      addEventListener('pointermove', move, { passive: false }); addEventListener('pointerup', up); addEventListener('pointercancel', up);
    };
    fill();
    return h('div', null, h('p', { class: 'hint' }, 'Top of the list = front of the design.'), list);
  }

  function layerIcon(el: El): HTMLElement {
    const box = h('span', { class: 'layer-ic' });
    if (el.type === 'image') { const src = ed.design.assets[el.asset]; if (src && getImage(src)) box.append(h('img', { src, alt: '' })); }
    else if (el.type === 'emoji') box.textContent = el.char;
    else if (el.type === 'graphic') box.append(h('img', { src: artDataUrl(el.art, el.colors), alt: '' }));
    else if (el.type === 'text') box.append(icon('text', 16));
    else if (el.type === 'draw') box.append(icon('brush', 16));
    else if (el.type === 'qr') box.append(icon('grid', 16));
    else box.append(icon('shapes', 16));
    return box;
  }

  ed.on('change', () => { if (active === 'layers') render(); });
  ed.on('select', () => { if (active === 'layers') render(); });
  ed.on('page', () => { if (active === 'layers' || active === 'background') render(); });
  ed.on('tool', () => { if (ed.tool !== 'draw' && active === 'draw') { active = null; panel.hidden = true; ed.root.classList.remove('panel-open'); railBtns.forEach((b) => b.classList.remove('on')); } });

  return {
    rail, panel, show,
    refreshUploads: () => { if (active === 'uploads') void fillUploads(); },
    dropPayload,
  };

  function dropPayload(p: DropPayload, at: { x: number; y: number }): void {
    if (p.kind === 'shape') { ed.addShape(p.shape); moveLast(at); }
    if (p.kind === 'art') { ed.addGraphic(p.art); moveLast(at); }
    if (p.kind === 'emoji') { ed.addEmoji(p.char); moveLast(at); }
    if (p.kind === 'text') { ed.addText(p.text); moveLast(at); }
    if (p.kind === 'upload') { const u = uploadsById.get(p.id); if (u) { ed.addImage(u.id, u.src, u.w, u.h, at); track('photo'); } }
    if (p.kind === 'friend') void addFriend(p.id, at);
    if (p.kind === 'photo') { const ph = photosById.get(p.id); if (ph) void addPhoto(ph, null, at); }
  }

  function moveLast(at: { x: number; y: number }) {
    const el = ed.page.elements[ed.page.elements.length - 1];
    if (!el) return;
    el.x = at.x - el.w / 2; el.y = at.y - el.h / 2;
    ed.commit();
  }
}

// ---------- palette recolour ----------
const PALETTES: string[][] = [
  ['#264653', '#2a9d8f', '#e9c46a', '#f4a261', '#e76f51'],
  ['#0b132b', '#3a506b', '#5bc0be', '#6fffe9', '#f7f7ff'],
  ['#2b2d42', '#8d99ae', '#edf2f4', '#ef233c', '#d90429'],
  ['#3d348b', '#7678ed', '#f7b801', '#f18701', '#f35b04'],
  ['#1a1423', '#3d1e6d', '#8338ec', '#ff006e', '#ffbe0b'],
  ['#283618', '#606c38', '#fefae0', '#dda15e', '#bc6c25'],
  ['#22223b', '#4a4e69', '#9a8c98', '#c9ada7', '#f2e9e4'],
  ['#03045e', '#0077b6', '#00b4d8', '#90e0ef', '#caf0f8'],
  ['#590d22', '#a4133c', '#ff4d6d', '#ff8fa3', '#fff0f3'],
  ['#10002b', '#5a189a', '#9d4edd', '#e0aaff', '#fdf4ff'],
];

function lum(c: string): number {
  const x = document.createElement('canvas').getContext('2d')!;
  x.fillStyle = c;
  const v = String(x.fillStyle);
  if (!v.startsWith('#')) { const m = v.match(/[\d.]+/g); if (!m) return 0.5; return (0.2126 * +m[0] + 0.7152 * +m[1] + 0.0722 * +m[2]) / 255; }
  const n = parseInt(v.slice(1), 16);
  return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
}

function recolor(ed: Editor, palette: string[]): void {
  const isClear = (c: string) => /rgba\([^)]*,\s*0(\.0+)?\)$/.test(c.replace(/\s/g, '')) || c === 'transparent' || c === '';
  const colors = ed.docColors().filter((c) => !isClear(c));
  if (!colors.length) return;
  const sorted = [...colors].sort((a, b) => lum(a) - lum(b));
  const pal = [...palette].sort((a, b) => lum(a) - lum(b));
  const map = new Map<string, string>();
  sorted.forEach((c, i) => map.set(c, pal[Math.round((i * (pal.length - 1)) / Math.max(1, sorted.length - 1))]));
  const sw = (c: string) => map.get(c.toLowerCase()) ?? c;
  const swF = (f: Fill): Fill => (typeof f === 'string' ? sw(f) : { ...f, stops: f.stops.map((s) => ({ ...s, color: sw(s.color) })) });
  const p = ed.page;
  p.background = swF(p.background);
  for (const el of p.elements) {
    if (el.type === 'shape' || el.type === 'text') el.fill = swF(el.fill);
    if (el.type === 'graphic') el.colors = el.colors.map(sw);
    if (el.type === 'draw') el.color = sw(el.color);
  }
  ed.commit();
}
