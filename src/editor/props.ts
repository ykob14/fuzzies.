/** The inspector: every property of the selected item(s), or page settings when nothing is selected. */
import type { Editor } from './editor';
import type { El, Fill, ImageEl, Mask, ShapeEl, ShapeKind, TextEl } from './types';
import { DEFAULT_FILTERS } from './types';
import { fitText, filterCss, curveOf } from './render';
import { TEXT_FX, applyTextFx, currentFx } from './textfx';
import { colorButton, firstColor } from './colors';
import { SHAPE_KINDS } from './shapes';
import { qrMatrix } from './qr';
import { SIZE_PRESETS, isSticker } from './doc';
import { ALL_FONTS, FONT_GROUPS, ensureFont, fontPackOf, fontSample, isScriptOnly } from '../content/fonts';
import { ARTS, artById, artDataUrl } from '../content/art';
import { assetsIn, collectionOf } from '../content/assets';
import { rewards } from '../core/rewards';
import { accounts } from '../core/account';
import { unlockDialog } from '../ui/unlock';
import { h, btn, icon, popMenu, toast, type IconName } from '../ui/dom';
import { creditLine } from './photos';

/** `el` is the full inspector; `bar` is the smart toolbar above the canvas (only what fits the current selection). */
export interface Props { el: HTMLElement; bar: HTMLElement; open(): void; close(): void; toggle(): void; refresh(): void }

const INSPECTOR_KEY = 'fz.ed.inspector';

const FILTER_PRESETS: { name: string; f: Partial<typeof DEFAULT_FILTERS> }[] = [
  { name: 'Original', f: {} },
  { name: 'Vivid', f: { saturate: 150, contrast: 110 } },
  { name: 'Mono', f: { grayscale: 100, contrast: 110 } },
  { name: 'Warm', f: { sepia: 25, saturate: 120, brightness: 105 } },
  { name: 'Cool', f: { hue: -15, saturate: 110, brightness: 102 } },
  { name: 'Vintage', f: { sepia: 55, contrast: 90, brightness: 105 } },
  { name: 'Fade', f: { contrast: 80, brightness: 115, saturate: 80 } },
  { name: 'Drama', f: { contrast: 140, saturate: 85, brightness: 92 } },
  { name: 'Dreamy', f: { blur: 2, brightness: 110, saturate: 120 } },
];

const MASKS: { id: Mask; label: string }[] = [
  { id: 'none', label: 'None' }, { id: 'rounded', label: 'Rounded' }, { id: 'circle', label: 'Circle' }, { id: 'arch', label: 'Arch' },
  { id: 'blob', label: 'Blob' }, { id: 'heart', label: 'Heart' }, { id: 'star', label: 'Star' }, { id: 'hexagon', label: 'Hexagon' },
];

export function buildProps(ed: Editor): Props {
  const body = h('div', { class: 'props-body' });
  const title = h('h3', null, 'Page');
  const el = h('aside', { class: 'ed-props', 'aria-label': 'Properties' },
    h('div', { class: 'ed-panel-head' }, h('div', { class: 'sheet-grip' }), title, btn(null, { icon: 'close', kind: 'plain', size: 'sm', title: 'Close', onClick: () => close(), class: 'props-close' })),
    body);
  const isPhone = () => innerWidth < 760;
  const docked = () => innerWidth > 1100; // wide screens: the inspector is a docked column you can show or hide
  const remember = (on: boolean) => { if (docked()) try { localStorage.setItem(INSPECTOR_KEY, on ? '1' : '0'); } catch { /* private mode */ } };
  const isOpen = () => ed.root.classList.contains('props-open');

  function open(): void {
    ed.root.classList.add('props-open');
    if (isPhone()) ed.panels.show(null);
    remember(true);
    render(); renderBar();
  }
  function close(): void { ed.root.classList.remove('props-open'); remember(false); renderBar(); requestAnimationFrame(() => ed.requestRender()); }
  const toggle = () => (isOpen() ? close() : open());

  // ---------- control helpers ----------
  const live = (fn: () => void) => { fn(); ed.requestRender(); };
  const done = () => ed.commit();
  const sec = (label: string, ...kids: (Node | null | false)[]) => h('section', { class: 'pnl-sec' }, h('div', { class: 'pnl-label' }, label), ...kids.filter(Boolean) as Node[]);
  const row = (label: string, ...kids: Node[]) => h('label', { class: 'prop-row' }, h('span', null, label), ...kids);

  function slider(label: string, value: number, min: number, max: number, step: number, onInput: (v: number) => void, fmt: (v: number) => string = (v) => String(Math.round(v))): HTMLElement {
    const r = h('input', { type: 'range', class: 'range', min: String(min), max: String(max), step: String(step), value: String(value), 'aria-label': label });
    const out = h('input', { class: 'num', value: fmt(value), 'aria-label': `${label} value` });
    r.addEventListener('input', () => { const v = Number(r.value); out.value = fmt(v); live(() => onInput(v)); });
    r.addEventListener('change', done);
    out.addEventListener('change', () => { const v = parseFloat(out.value); if (!Number.isNaN(v)) { r.value = String(v); live(() => onInput(v)); done(); } });
    return h('div', { class: 'slider-row' }, h('span', { class: 'slider-label' }, label), r, out);
  }

  function num(label: string, value: number, onSet: (v: number) => void): HTMLElement {
    const i = h('input', { class: 'num num-wide', value: String(Math.round(value)), inputmode: 'decimal', 'aria-label': label });
    i.addEventListener('change', () => { const v = parseFloat(i.value); if (!Number.isNaN(v)) { live(() => onSet(v)); done(); } });
    return h('label', { class: 'num-field' }, h('span', null, label), i);
  }

  function toggles(items: { icon?: IconName; label?: string; title: string; on: boolean; onClick: () => void }[]): HTMLElement {
    return h('div', { class: 'tgl-row' }, ...items.map((t) => {
      const b = h('button', { type: 'button', class: `tgl ${t.on ? 'on' : ''}`, title: t.title, 'aria-label': t.title, 'aria-pressed': String(t.on) }, t.icon ? icon(t.icon, 16) : null, t.label ? h('span', null, t.label) : null);
      b.addEventListener('click', () => { t.onClick(); render(); });
      return b;
    }));
  }

  const color = (value: Fill, set: (f: Fill) => void, o: { gradient?: boolean; allowNone?: boolean; title?: string } = {}) =>
    colorButton(value, { ...o, docColors: ed.docColors(), onInput: (f) => live(() => set(f)), onCommit: done });

  // ---------- render ----------
  let lastKey = '';
  function render(): void {
    const sel = ed.selected;
    const key = `${ed.pageIndex}:${ed.selection.join(',')}`;
    const keepScroll = key === lastKey ? body.scrollTop : 0;
    lastKey = key;
    body.replaceChildren();
    requestAnimationFrame(() => (body.scrollTop = keepScroll));
    if (!sel.length) { title.textContent = 'Page'; body.append(...pageProps()); return; }
    if (sel.length > 1) { title.textContent = `${sel.length} items`; body.append(...multiProps(sel)); return; }
    const e = sel[0];
    title.textContent = ed.isPageBackground(e) ? 'Background' : { text: 'Text', shape: 'Shape', image: 'Photo', graphic: 'Graphic', emoji: 'Sticker', draw: 'Drawing', qr: 'QR code' }[e.type];
    if (e.locked) body.append(h('div', { class: 'note' }, icon('lock', 16), 'This item is locked. ', h('button', { class: 'link', type: 'button', onclick: () => { e.locked = false; done(); render(); } }, 'Unlock')));
    if (e.type === 'text') body.append(...textProps(e));
    if (e.type === 'shape') body.append(...shapeProps(e));
    if (e.type === 'image') body.append(...imageProps(e));
    if (e.type === 'graphic') body.append(...graphicProps(e));
    if (e.type === 'qr') body.append(...qrProps(e));
    if (e.type === 'draw') body.append(sec('Stroke', row('Colour', color(e.color, (f) => (e.color = firstColor(f)))), slider('Width', e.width, 1, 150, 1, (v) => (e.width = v))));
    body.append(...commonProps(e));
  }

  // ---------- text ----------
  const FONT_KEY = 'fz.ed.fonts';
  const recentFonts = (): string[] => { try { const v = JSON.parse(localStorage.getItem(FONT_KEY) ?? '[]'); return Array.isArray(v) ? v.filter((x) => typeof x === 'string').slice(0, 6) : []; } catch { return []; } };
  const rememberFont = (f: string) => { try { localStorage.setItem(FONT_KEY, JSON.stringify([f, ...recentFonts().filter((x) => x !== f)].slice(0, 6))); } catch { /* private mode */ } };

  function fontPicker(e: TextEl): HTMLElement {
    const b = h('button', { type: 'button', class: 'font-btn', style: `font-family:"${e.font}"` }, h('span', null, e.font), icon('down', 16));
    b.addEventListener('click', () => {
      document.querySelector('.font-pop')?.remove();
      const pop = h('div', { class: 'font-pop popmenu' });
      // a search box and your recent fonts on top (68 fonts in one long list was hard to use)
      const find = h('input', { class: 'input input-sm font-find', type: 'search', placeholder: 'Search fonts', 'aria-label': 'Search fonts', autocomplete: 'off' });
      find.addEventListener('keydown', (ev) => ev.stopPropagation());
      const list = h('div', { class: 'font-list' });
      pop.append(find, list);
      const item = (f: string) => {
        const pack = fontPackOf(f);
        const locked = !rewards.isUnlocked(pack.id, pack.cost);
        ensureFont(f, 400, false);
        const sample = fontSample(f);
        const it = h('button', { type: 'button', class: `popmenu-item font-item ${f === e.font ? 'on' : ''} ${locked ? 'locked' : ''}`, 'data-font': f.toLowerCase(), title: f },
          h('span', { class: 'font-name', style: isScriptOnly(f) ? '' : `font-family:"${f}"` }, f),
          sample ? h('span', { class: 'font-sample', style: `font-family:"${f}"` }, sample) : null, locked ? icon('lock', 14) : null);
        it.addEventListener('click', () => {
          pop.remove();
          if (locked) { unlockDialog({ id: pack.id, name: `${pack.name} fonts`, cost: pack.cost, kind: `Font pack · ${pack.fonts.join(', ')}`, preview: h('div', { class: 'unlock-font', style: `font-family:"${pack.fonts[0]}"` }, 'Aa Bb Cc') }, render); return; }
          for (const t of ed.selected) if (t.type === 'text') { t.font = f; fitText(t); }
          ensureFont(f, e.weight, e.italic);
          rememberFont(f);
          done(); render();
        });
        return it;
      };
      const head = (label: string) => h('div', { class: 'pnl-label font-sec' }, label);
      // fonts already in this design (most used first), your recent ones, then every font by its look and by script
      const known = new Set(ALL_FONTS);
      const uses = new Map<string, number>();
      for (const p of ed.design.pages) for (const t of p.elements) if (t.type === 'text' && known.has(t.font)) uses.set(t.font, (uses.get(t.font) ?? 0) + 1);
      const inDesign = [...uses].sort((x, y) => y[1] - x[1]).map(([f]) => f);
      if (inDesign.length) list.append(head('Fonts in this design'), ...inDesign.map(item));
      const recent = recentFonts().filter((f) => known.has(f) && !inDesign.includes(f));
      if (recent.length) list.append(head('Recently used'), ...recent.map(item));
      for (const g of FONT_GROUPS) list.append(head(g.label), ...g.fonts.map(item));
      const none = h('p', { class: 'muted font-none', hidden: 'true' }, 'No font by that name.');
      list.append(none);
      find.addEventListener('input', () => {
        const q = find.value.trim().toLowerCase();
        let any = false;
        const seen = new Set<string>(); // a font can sit in two groups (Heebo: Sans + Hebrew) — list it once while searching
        for (const it of list.querySelectorAll<HTMLElement>('.font-item')) {
          const f = it.dataset.font!;
          const show = !q || (f.includes(q) && !seen.has(f));
          if (q && show) seen.add(f);
          it.hidden = !show; any ||= show;
        }
        // a heading shows only while one of its fonts does
        for (const hd of list.querySelectorAll<HTMLElement>('.font-sec')) {
          let n = hd.nextElementSibling as HTMLElement | null, vis = false;
          while (n && !n.classList.contains('font-sec') && !n.classList.contains('font-none')) { vis ||= !n.hidden; n = n.nextElementSibling as HTMLElement | null; }
          hd.hidden = !!q && !vis;
        }
        none.hidden = any;
      });
      document.body.append(pop);
      const r = b.getBoundingClientRect();
      const ph = Math.min(420, innerHeight - 24);
      pop.style.maxHeight = `${ph}px`;
      pop.style.left = `${Math.min(r.left, innerWidth - pop.offsetWidth - 8)}px`;
      pop.style.top = `${Math.max(8, Math.min(r.bottom + 6, innerHeight - ph - 12))}px`;
      pop.querySelector('.on')?.scrollIntoView({ block: 'center' });
      if (matchMedia('(hover: hover)').matches) find.focus({ preventScroll: true }); // no keyboard pop-up on phones
      const off = (ev: Event) => { if (!pop.contains(ev.target as Node)) { pop.remove(); removeEventListener('pointerdown', off, true); } };
      setTimeout(() => addEventListener('pointerdown', off, true));
    });
    return b;
  }

  function textProps(e: TextEl): Node[] {
    const set = (fn: (t: TextEl) => void) => live(() => { fn(e); fitText(e); });
    const ta = h('textarea', { class: 'input text-input', rows: '3', 'aria-label': 'Text' });
    ta.value = e.text;
    ta.addEventListener('input', () => set((t) => (t.text = ta.value)));
    ta.addEventListener('change', done);
    const weight = h('select', { class: 'input input-sm', 'aria-label': 'Font weight' }, ...[300, 400, 500, 600, 700, 800, 900].map((w) => h('option', { value: String(w), selected: w === e.weight }, ['Light', 'Regular', 'Medium', 'Semibold', 'Bold', 'Extra bold', 'Black'][[300, 400, 500, 600, 700, 800, 900].indexOf(w)])));
    weight.addEventListener('change', () => { set((t) => (t.weight = Number(weight.value))); ensureFont(e.font, e.weight, e.italic); done(); });
    return [
      sec('Text', ta),
      sec('Font', fontPicker(e), h('div', { class: 'row' }, weight), slider('Size', e.size, 6, Math.max(400, Math.round(e.size * 2)), 1, (v) => set((t) => (t.size = v)))),
      sec('Style',
        toggles([
          { label: 'B', title: 'Bold', on: e.weight >= 700, onClick: () => { set((t) => (t.weight = t.weight >= 700 ? 400 : 700)); done(); } },
          { label: 'I', title: 'Italic', on: e.italic, onClick: () => { set((t) => (t.italic = !t.italic)); done(); } },
          { label: 'U', title: 'Underline', on: e.underline, onClick: () => { set((t) => (t.underline = !t.underline)); done(); } },
          { label: 'aA', title: 'Uppercase', on: e.uppercase, onClick: () => { set((t) => (t.uppercase = !t.uppercase)); done(); } },
        ]),
        toggles((['left', 'center', 'right'] as const).map((a) => ({ icon: a === 'left' ? 'alignL' as IconName : a === 'center' ? 'alignC' as IconName : 'alignR' as IconName, title: `Align ${a}`, on: e.align === a, onClick: () => { set((t) => (t.align = a)); done(); } }))),
        row('Colour', color(e.fill, (f) => (e.fill = f), { gradient: true })),
        slider('Line height', e.lineHeight, 0.6, 3, 0.05, (v) => set((t) => (t.lineHeight = v)), (v) => v.toFixed(2)),
        slider('Letter spacing', e.letterSpacing, -e.size * 0.15, e.size * 0.8, 0.5, (v) => set((t) => (t.letterSpacing = v)))),
      effectsSection(e, set),
    ];
  }

  /** Canva-style text effects: one-tap presets, then fine-tuning; plus Curve. */
  function effectsSection(e: TextEl, set: (fn: (t: TextEl) => void) => void): Node {
    const cur = currentFx(e);
    const grid = h('div', { class: 'fx-grid' }, ...TEXT_FX.map((fx) => {
      const b = h('button', { type: 'button', class: `fx-tile ${cur === fx.id ? 'on' : ''}`, 'aria-pressed': String(cur === fx.id), title: fx.label }, h('span', { class: `fx-sample fx-${fx.id}` }, 'Ag'), h('small', null, fx.label));
      b.addEventListener('click', () => { set((t) => applyTextFx(t, fx.id)); done(); render(); });
      return b;
    }));
    const fx = e.effect;
    const canCurve = !!e.text.trim() && (curveOf({ ...e, curve: 50 }) !== null);
    return sec('Effects', grid,
      fx ? row('Effect colour', color(fx.color, (f) => { if (e.effect) e.effect = { ...e.effect, color: firstColor(f) }; })) : null,
      fx ? slider('Offset', fx.offset, 0, Math.max(20, e.size * 0.25), 0.5, (v) => set((t) => { if (t.effect) t.effect = { ...t.effect, offset: v }; })) : null,
      e.shadow ? row('Shadow colour', color(e.shadow.color, (f) => { if (e.shadow) e.shadow = { ...e.shadow, color: firstColor(f) }; })) : null,
      e.shadow ? slider('Shadow blur', e.shadow.blur, 0, Math.max(60, e.size * 0.6), 0.5, (v) => set((t) => { if (t.shadow) t.shadow = { ...t.shadow, blur: v }; })) : null,
      row('Outline', color(e.strokeColor || '#1c1830', (f) => { e.strokeColor = firstColor(f); if (!e.strokeWidth) e.strokeWidth = Math.max(1, e.size * 0.03); })),
      slider('Outline width', e.strokeWidth, 0, Math.max(10, e.size * 0.2), 0.5, (v) => set((t) => (t.strokeWidth = v))),
      row('Highlight', color(e.bg, (f) => (e.bg = firstColor(f)), { allowNone: true })),
      canCurve ? slider('Curve', e.curve ?? 0, -100, 100, 1, (v) => set((t) => (t.curve = v)), (v) => `${Math.round(v)}`)
        : h('p', { class: 'hint' }, 'Curve works for single-script Latin, Cyrillic and Greek text (it would break joined or right-to-left scripts).'));
  }

  // ---------- shape ----------
  function shapeProps(e: ShapeEl): Node[] {
    const kind = h('select', { class: 'input input-sm', 'aria-label': 'Shape' }, ...SHAPE_KINDS.map((s) => h('option', { value: s.kind, selected: s.kind === e.shape }, s.label)));
    kind.addEventListener('change', () => { live(() => (e.shape = kind.value as ShapeKind)); done(); render(); });
    const line = e.shape === 'line', ring = e.shape === 'ring';
    return [
      sec('Shape', kind),
      sec(line || ring ? 'Colour' : 'Fill', row(line || ring ? 'Colour' : 'Fill', color(e.fill, (f) => (e.fill = f), { gradient: true, allowNone: !line && !ring }))),
      sec(line ? 'Line' : ring ? 'Ring' : 'Border',
        line || ring ? null : row('Border colour', color(e.stroke, (f) => (e.stroke = firstColor(f)))),
        slider(line ? 'Thickness' : 'Width', e.strokeWidth, 0, Math.max(60, Math.min(e.w, e.h) / 2), 1, (v) => (e.strokeWidth = v)),
        toggles([{ label: 'Dashed', title: 'Dashed', on: !!e.dash, onClick: () => { live(() => (e.dash = !e.dash)); done(); } }]),
        e.shape === 'rect' ? slider('Corner radius', e.radius, 0, Math.min(e.w, e.h) / 2, 1, (v) => (e.radius = v)) : null),
    ];
  }

  // ---------- image ----------
  function imageProps(e: ImageEl): Node[] {
    const src = ed.design.assets[e.asset];
    const presets = h('div', { class: 'filter-grid' }, ...FILTER_PRESETS.map((p) => {
      const f = { ...DEFAULT_FILTERS, ...p.f };
      const on = JSON.stringify(f) === JSON.stringify(e.filters);
      const b = h('button', { type: 'button', class: `filter-item ${on ? 'on' : ''}` }, h('img', { src, alt: '', style: `filter:${filterCss(f)}` }), h('span', null, p.name));
      b.addEventListener('click', () => { live(() => (e.filters = f)); done(); render(); });
      return b;
    }));
    const F = e.filters;
    const masks = h('div', { class: 'tgl-row wrap' }, ...MASKS.map((m) => {
      const b = h('button', { type: 'button', class: `tgl ${e.mask === m.id ? 'on' : ''}` }, m.label);
      b.addEventListener('click', () => { live(() => (e.mask = m.id)); done(); render(); });
      return b;
    }));
    const replace = btn(e.asset.startsWith('ph-') ? 'Add your photo' : 'Replace photo', { kind: 'ghost', icon: 'image', size: 'sm', onClick: () => ed.pickPhotoFor(e) });
    const c = e.credit;
    const link = (text: string, url?: string) => (url && /^https:\/\//i.test(url) ? h('a', { href: url, target: '_blank', rel: 'noopener noreferrer' }, text) : h('span', null, text));
    const credit = c ? sec('Photo credit', h('p', { class: 'credit-line' }, 'Photo', c.by ? ' by ' : '', c.by ? link(c.by, c.byUrl) : null, ' on ', link(c.source, c.sourceUrl), h('br'),
      'Licence: ', link(c.license, c.licenseUrl)),
      h('p', { class: 'hint' }, c.required ? 'This licence asks you to credit the photographer wherever you share the design.' : 'No credit needed, but photographers love it.'),
      btn('Copy credit', { kind: 'ghost', size: 'sm', icon: 'copy', onClick: () => void (navigator.clipboard?.writeText(creditLine(c)) ?? Promise.reject(new Error("no clipboard"))).then(() => toast('Credit copied', 'good'), () => toast(creditLine(c))) })) : null;
    return [
      ...(credit ? [credit] : []),
      sec('Filters', presets),
      sec('Adjust',
        slider('Brightness', F.brightness, 0, 200, 1, (v) => (F.brightness = v)),
        slider('Contrast', F.contrast, 0, 200, 1, (v) => (F.contrast = v)),
        slider('Saturation', F.saturate, 0, 250, 1, (v) => (F.saturate = v)),
        slider('Warmth', F.sepia, 0, 100, 1, (v) => (F.sepia = v)),
        slider('Hue', F.hue, -180, 180, 1, (v) => (F.hue = v)),
        slider('Black & white', F.grayscale, 0, 100, 1, (v) => (F.grayscale = v)),
        slider('Blur', F.blur, 0, 40, 0.5, (v) => (F.blur = v), (v) => v.toFixed(1))),
      sec('Crop', slider('Zoom', e.zoom, 1, 4, 0.01, (v) => (e.zoom = v), (v) => v.toFixed(2)), slider('Move ↔', e.panX, -1, 1, 0.01, (v) => (e.panX = v), (v) => v.toFixed(2)), slider('Move ↕', e.panY, -1, 1, 0.01, (v) => (e.panY = v), (v) => v.toFixed(2)), h('p', { class: 'hint' }, 'Tip: drag the side handles to crop the frame.')),
      sec('Shape', masks, e.mask === 'none' ? slider('Corner radius', e.radius, 0, Math.min(e.w, e.h) / 2, 1, (v) => (e.radius = v)) : null),
      sec('Border', row('Colour', color(e.stroke, (f) => (e.stroke = firstColor(f)))), slider('Width', e.strokeWidth, 0, 80, 1, (v) => (e.strokeWidth = v))),
      ...(isSticker(e) ? [] : [h('div', { class: 'btn-row' }, replace, btn('Set as background', { kind: 'ghost', icon: 'image', size: 'sm', onClick: () => ed.imageToBackground(e) }))]),
    ];
  }

  function qrProps(e: Extract<El, { type: 'qr' }>): Node[] {
    const input = h('input', { class: 'input', value: e.text, placeholder: 'https://your-link.com', 'aria-label': 'QR code link or text' });
    const err = h('p', { class: 'form-err' });
    input.addEventListener('input', () => {
      try { qrMatrix(input.value || ' '); err.textContent = ''; live(() => (e.text = input.value)); }
      catch (x) { err.textContent = (x as Error).message; }
    });
    input.addEventListener('change', done);
    return [
      sec('Link or text', input, err, h('p', { class: 'hint' }, 'Phones open this when they scan the code. Keep dark squares on a light background so every camera can read it.')),
      sec('Colours', row('Squares', color(e.color, (f) => (e.color = firstColor(f)))), row('Background', color(e.bg, (f) => (e.bg = firstColor(f)), { allowNone: true }))),
    ];
  }

  function graphicProps(e: Extract<El, { type: 'graphic' }>): Node[] {
    const a = artById(e.art);
    // Replace artwork: other pieces from the same pack or collection (page backgrounds swap with backgrounds of the same shape)
    const col = collectionOf(e.art);
    const shape = /-(sq|po|st|ls)$/.exec(e.art)?.[1];
    const pool = (col ? assetsIn(col) : ARTS.filter((x) => x.pack === a?.pack)).filter((x) => x.id !== e.art && (shape ? x.id.endsWith(`-${shape}`) : !/-(sq|po|st|ls)$/.test(x.id)));
    const swap = (id: string) => {
      const next = artById(id);
      if (!next) return;
      const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
      if (!shape) { const h = e.w / next.ratio; e.y = cy - h / 2; e.h = h; e.x = cx - e.w / 2; }
      e.art = id; e.colors = [...next.colors]; e.name = next.name;
      done(); render();
    };
    const replace = pool.length ? sec('Replace artwork', h('div', { class: 'el-grid swap-grid' }, ...pool.map((x) => {
      const b = h('button', { type: 'button', class: 'el-item', title: `Replace with ${x.name}`, 'aria-label': `Replace with ${x.name}` }, h('img', { src: artDataUrl(x.id, x.colors), alt: '', loading: 'lazy' }));
      b.addEventListener('click', () => swap(x.id));
      return b;
    })), h('p', { class: 'hint' }, 'Keeps the position and size — you can recolour the new one above.')) : null;
    return [sec('Colours', h('div', { class: 'row' }, ...(a?.colors ?? []).map((_, i) => color(e.colors[i] ?? a!.colors[i], (f) => { e.colors = [...e.colors]; e.colors[i] = firstColor(f); }, { title: `Colour ${i + 1}` })))), ...(replace ? [replace] : [])];
  }

  // ---------- shared ----------
  function commonProps(e: El): Node[] {
    const s = e.shadow;
    const shadowOn = !!s;
    const u = ed.unit;
    return [
      sec('Transparency', slider('Opacity', Math.round(e.opacity * 100), 0, 100, 1, (v) => (e.opacity = v / 100), (v) => `${Math.round(v)}%`)),
      sec('Shadow',
        toggles([{ label: shadowOn ? 'On' : 'Off', icon: 'sparkles', title: 'Drop shadow', on: shadowOn, onClick: () => { live(() => (e.shadow = shadowOn ? null : { color: 'rgba(0,0,0,0.35)', blur: Math.round(u * 0.02), x: 0, y: Math.round(u * 0.01) })); done(); } }]),
        s ? row('Colour', color(s.color, (f) => (s.color = firstColor(f)))) : null,
        s ? slider('Blur', s.blur, 0, Math.max(100, u * 0.1), 1, (v) => (s.blur = v)) : null,
        s ? slider('Offset X', s.x, -u * 0.05, u * 0.05, 1, (v) => (s.x = v)) : null,
        s ? slider('Offset Y', s.y, -u * 0.05, u * 0.05, 1, (v) => (s.y = v)) : null),
      sec('Position',
        h('div', { class: 'num-grid' },
          num('X', e.x, (v) => (e.x = v)), num('Y', e.y, (v) => (e.y = v)),
          num('W', e.w, (v) => { if (v > 0) { e.w = v; if (e.type === 'text') fitText(e); } }),
          num('H', e.h, (v) => { if (v > 0 && e.type !== 'text') e.h = v; }),
          num('Rotate°', e.rotation, (v) => (e.rotation = v))),
        alignRow(),
        toggles([
          { icon: 'front', title: 'Bring to front', on: false, onClick: () => ed.reorder('front') },
          { icon: 'up', title: 'Forward', on: false, onClick: () => ed.reorder('up') },
          { icon: 'down', title: 'Backward', on: false, onClick: () => ed.reorder('down') },
          { icon: 'layers', title: 'Send to back', on: false, onClick: () => ed.reorder('back') },
          { icon: 'flipH', title: 'Flip horizontal', on: !!e.flipX, onClick: () => { e.flipX = !e.flipX; done(); } },
          { icon: 'flipV', title: 'Flip vertical', on: !!e.flipY, onClick: () => { e.flipY = !e.flipY; done(); } },
        ])),
      h('div', { class: 'btn-row' },
        btn('Duplicate', { icon: 'copy', kind: 'ghost', size: 'sm', onClick: () => ed.duplicate() }),
        btn(e.locked ? 'Unlock' : 'Lock', { icon: e.locked ? 'unlock' : 'lock', kind: 'ghost', size: 'sm', onClick: () => { e.locked = !e.locked; done(); render(); } }),
        btn('Delete', { icon: 'trash', kind: 'danger', size: 'sm', onClick: () => ed.deleteSelection() })),
    ];
  }

  function alignRow(): HTMLElement {
    const items: [IconName, Parameters<Editor['align']>[0], string][] = [['alignL', 'left', 'Align left'], ['alignC', 'center', 'Align centre'], ['alignR', 'right', 'Align right'], ['alignT', 'top', 'Align top'], ['alignM', 'middle', 'Align middle'], ['alignB', 'bottom', 'Align bottom']];
    return toggles(items.map(([ic, m, t]) => ({ icon: ic, title: t, on: false, onClick: () => ed.align(m) })));
  }

  function multiProps(sel: El[]): Node[] {
    return [
      h('div', { class: 'btn-row', style: 'margin-top:0' },
        ed.canGroup ? btn('Group', { icon: 'group', kind: 'primary', size: 'sm', onClick: () => ed.group() }) : null,
        ed.canUngroup ? btn('Ungroup', { icon: 'grid', kind: 'ghost', size: 'sm', onClick: () => ed.ungroup() }) : null),
      sec('Align to each other', alignRow(), sel.length > 2 ? toggles([{ label: 'Space evenly ↔', title: 'Distribute horizontally', on: false, onClick: () => ed.distribute('x') }, { label: 'Space evenly ↕', title: 'Distribute vertically', on: false, onClick: () => ed.distribute('y') }]) : null),
      sec('Transparency', slider('Opacity', Math.round(sel[0].opacity * 100), 0, 100, 1, (v) => sel.forEach((e) => (e.opacity = v / 100)), (v) => `${Math.round(v)}%`)),
      sec('Order', toggles([
        { icon: 'front', title: 'Bring to front', on: false, onClick: () => ed.reorder('front') },
        { icon: 'layers', title: 'Send to back', on: false, onClick: () => ed.reorder('back') },
      ])),
      h('div', { class: 'btn-row' },
        btn('Duplicate', { icon: 'copy', kind: 'ghost', size: 'sm', onClick: () => ed.duplicate() }),
        btn('Delete', { icon: 'trash', kind: 'danger', size: 'sm', onClick: () => ed.deleteSelection() })),
    ];
  }

  function pageProps(): Node[] {
    const d = ed.design;
    const preset = h('select', { class: 'input input-sm', 'aria-label': 'Size preset' }, h('option', { value: '' }, 'Choose a size…'), ...SIZE_PRESETS.map((p) => h('option', { value: p.id }, `${p.name} · ${p.w}×${p.h}`)));
    const wIn = h('input', { class: 'num num-wide', value: String(d.width), inputmode: 'numeric', 'aria-label': 'Width' });
    const hIn = h('input', { class: 'num num-wide', value: String(d.height), inputmode: 'numeric', 'aria-label': 'Height' });
    preset.addEventListener('change', () => { const p = SIZE_PRESETS.find((x) => x.id === preset.value); if (p) { wIn.value = String(p.w); hIn.value = String(p.h); } });
    const scale = h('input', { type: 'checkbox', checked: true });
    const apply = btn('Resize', { kind: 'primary', size: 'sm', icon: 'crop', onClick: () => { const w = parseInt(wIn.value), hh = parseInt(hIn.value); if (w > 0 && hh > 0) ed.resizeDesign(w, hh, scale.checked); } });
    const snap = h('input', { type: 'checkbox', checked: ed.snapEnabled });
    snap.addEventListener('change', () => { ed.snapEnabled = snap.checked; accounts.update((a) => (a.settings.snap = snap.checked)); });
    return [
      sec('Background', row('Colour', color(ed.page.background, (f) => (ed.page.background = f), { gradient: true })), h('p', { class: 'hint' }, 'More colours, gradients and photo backgrounds are in the Background tab.')),
      sec('Design size', preset, h('div', { class: 'size-row' }, h('label', { class: 'num-field' }, h('span', null, 'W'), wIn), h('span', { class: 'muted' }, '×'), h('label', { class: 'num-field' }, h('span', null, 'H'), hIn)),
        h('label', { class: 'check' }, scale, 'Scale content to fit'), apply),
      sec('Pages', h('div', { class: 'btn-row' },
        btn('Add page', { icon: 'plus', kind: 'ghost', size: 'sm', onClick: () => ed.addPage() }),
        btn('Duplicate', { icon: 'copy', kind: 'ghost', size: 'sm', onClick: () => ed.addPage(true) }),
        btn('Delete', { icon: 'trash', kind: 'ghost', size: 'sm', onClick: () => ed.deletePage() }))),
      sec('Helpers', h('label', { class: 'check' }, snap, 'Snap to centre & edges (hold Shift to skip)')),
      sec('Shortcuts', h('p', { class: 'hint' }, 'T text · P draw · V select · H hand · Ctrl/Cmd + Z undo, D duplicate, C/V copy/paste, A select all · Arrows nudge · Del delete · Ctrl+scroll or pinch to zoom.')),
    ];
  }

  // ---------- smart toolbar ----------
  const bar = h('div', { class: 'ed-tools', role: 'toolbar', 'aria-label': 'Tools for the selection' });
  // the tools scroll inside `track`; on phones Done sits outside it, pinned at the left, so it never scrolls away
  const track = h('div', { class: 'tb-track' });
  let lastBarKey = '';
  const sep = () => h('span', { class: 'tb-sep', 'aria-hidden': 'true' });
  const label = (t: string) => h('span', { class: 'tb-label' }, t);
  const tb = (o: { icon?: IconName; text?: string; title: string; on?: boolean; cls?: string; onClick: (b: HTMLButtonElement) => void }) => {
    const b = h('button', { type: 'button', class: `tb-btn ${o.on ? 'on' : ''} ${o.text ? 'has-text' : ''} ${o.cls ?? ''}`, title: o.title, 'aria-label': o.title, 'aria-pressed': o.on === undefined ? null : String(o.on) },
      o.icon ? icon(o.icon, 18) : null, o.text ? h('span', null, o.text) : null);
    b.addEventListener('click', () => o.onClick(b));
    return b;
  };

  /** A small popover under a toolbar button (closes on an outside tap). */
  function popover(anchor: HTMLElement, content: HTMLElement): void {
    document.querySelector('.tb-pop')?.remove();
    const pop = h('div', { class: 'tb-pop popmenu' }, content);
    document.body.append(pop);
    const r = anchor.getBoundingClientRect();
    pop.style.left = `${Math.max(8, Math.min(r.left, innerWidth - pop.offsetWidth - 8))}px`;
    pop.style.top = `${r.bottom + 6 + pop.offsetHeight > innerHeight ? Math.max(8, r.top - pop.offsetHeight - 6) : r.bottom + 6}px`;
    const off = (ev: Event) => { if (!pop.contains(ev.target as Node) && ev.target !== anchor) { pop.remove(); removeEventListener('pointerdown', off, true); } };
    setTimeout(() => addEventListener('pointerdown', off, true));
  }
  const transparency = (sel: El[]) => tb({ icon: 'eye', title: 'Transparency', onClick: (b) => popover(b, h('div', { class: 'tb-pop-body' },
    slider('Transparency', Math.round(sel[0].opacity * 100), 0, 100, 1, (v) => sel.forEach((e) => (e.opacity = v / 100)), (v) => `${Math.round(v)}%`))) });
  const positionMenu = (b: HTMLButtonElement, single: El | null) => popMenu(b, [
    { label: 'Align left', icon: 'alignL', onClick: () => ed.align('left') },
    { label: 'Align centre', icon: 'alignC', onClick: () => ed.align('center') },
    { label: 'Align right', icon: 'alignR', onClick: () => ed.align('right') },
    { label: 'Align top', icon: 'alignT', onClick: () => ed.align('top') },
    { label: 'Align middle', icon: 'alignM', onClick: () => ed.align('middle') },
    { label: 'Align bottom', icon: 'alignB', onClick: () => ed.align('bottom') },
    ...(ed.selected.length > 2 ? [null, { label: 'Space evenly across', icon: 'alignC' as IconName, onClick: () => ed.distribute('x') }, { label: 'Space evenly down', icon: 'alignM' as IconName, onClick: () => ed.distribute('y') }] : []),
    null,
    { label: 'Bring to front', icon: 'front', onClick: () => ed.reorder('front') },
    { label: 'Bring forward', icon: 'up', onClick: () => ed.reorder('up') },
    { label: 'Send backward', icon: 'down', onClick: () => ed.reorder('down') },
    { label: 'Send to back', icon: 'layers', onClick: () => ed.reorder('back') },
    ...(single ? [null, { label: 'Flip horizontal', icon: 'flipH' as IconName, onClick: () => { single.flipX = !single.flipX; done(); } }, { label: 'Flip vertical', icon: 'flipV' as IconName, onClick: () => { single.flipY = !single.flipY; done(); } }] : []),
    null,
    { label: 'Hide', icon: 'eyeOff', onClick: () => ed.hideSelection() },
  ]);

  function sizeControl(e: TextEl): HTMLElement {
    const input = h('input', { class: 'tb-num', value: String(Math.round(e.size)), inputmode: 'decimal', 'aria-label': 'Font size' });
    const setSize = (v: number) => { const n = Math.max(6, Math.min(2000, Math.round(v))); for (const t of ed.selected) if (t.type === 'text') { t.size = n; fitText(t); } input.value = String(n); ed.requestRender(); done(); };
    input.addEventListener('change', () => { const v = parseFloat(input.value); if (!Number.isNaN(v)) setSize(v); });
    input.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') input.blur(); ev.stopPropagation(); });
    const step = (d: number) => setSize(e.size + d * Math.max(1, Math.round(e.size * 0.08)));
    return h('div', { class: 'tb-size' }, tb({ text: '−', title: 'Smaller', cls: 'tb-step', onClick: () => step(-1) }), input, tb({ text: '+', title: 'Bigger', cls: 'tb-step', onClick: () => step(1) }));
  }

  function textTools(e: TextEl): Node[] {
    const set = (fn: (t: TextEl) => void) => { for (const t of ed.selected) if (t.type === 'text') { fn(t); fitText(t); } ed.requestRender(); done(); renderBar(); };
    const nextAlign = { left: 'center', center: 'right', right: 'left' } as const;
    const font = fontPicker(e);
    font.classList.add('tb-font');
    return [
      font, sizeControl(e), color(e.fill, (f) => { for (const t of ed.selected) if (t.type === 'text') t.fill = f; }, { gradient: true, title: 'Text colour' }), sep(),
      tb({ text: 'B', cls: 'tb-bold', title: 'Bold', on: e.weight >= 700, onClick: () => { const on = e.weight < 700; set((t) => (t.weight = on ? 700 : 400)); ensureFont(e.font, e.weight, e.italic); } }),
      tb({ text: 'I', title: 'Italic', on: e.italic, cls: 'tb-italic', onClick: () => { const on = !e.italic; set((t) => (t.italic = on)); ensureFont(e.font, e.weight, e.italic); } }),
      tb({ text: 'U', title: 'Underline', on: e.underline, cls: 'tb-under', onClick: () => { const on = !e.underline; set((t) => (t.underline = on)); } }),
      tb({ text: 'aA', title: 'Uppercase', on: e.uppercase, onClick: () => { const on = !e.uppercase; set((t) => (t.uppercase = on)); } }),
      tb({ icon: e.align === 'left' ? 'alignL' : e.align === 'center' ? 'alignC' : 'alignR', title: `Text alignment: ${e.align}`, onClick: () => { const a = nextAlign[e.align]; set((t) => (t.align = a)); } }),
      tb({ icon: 'sparkles', text: 'Effects', title: 'Shadow, neon, hollow, echo, curve…', on: currentFx(e) !== 'none' || !!e.curve, onClick: () => open() }),
    ];
  }

  function renderBar(): void {
    // don't rebuild under someone typing in the size box
    if (bar.contains(document.activeElement) && document.activeElement instanceof HTMLInputElement) return;
    document.querySelector('.tb-pop')?.remove();
    const sel = ed.selected;
    const selKey = ed.selection.join(',');
    ed.root.classList.toggle('has-sel', sel.length > 0);
    const items: (Node | null)[] = [];
    // phones: the toolbar covers the tool rail while something is selected; Done brings the tools back
    if (sel.length) items.push(tb({ icon: 'check', text: 'Done', title: 'Done', cls: 'tb-done', onClick: () => ed.select([]) }));
    if (!sel.length) {
      const bgEl = ed.pageBackgroundEl();
      items.push(label('Page'),
        color(ed.page.background, (f) => (ed.page.background = f), { gradient: true, title: 'Background colour' }),
        bgEl ? tb({ icon: 'image', text: 'Background', title: 'Select the background picture (replace it or change its colours)', onClick: () => ed.select([bgEl.id]) }) : null,
        tb({ icon: 'crop', text: 'Resize', title: 'Change the design size', onClick: () => open() }),
        tb({ icon: 'plus', text: 'Add page', title: 'Add a page', onClick: () => ed.addPage() }));
    } else if (sel.length > 1) {
      // several text boxes: the same font / size / colour / style tools apply to all of them
      if (sel.every((x) => x.type === 'text')) items.push(...textTools(sel[0] as TextEl).filter((n) => !(n instanceof HTMLElement && n.title.startsWith('Shadow, neon'))), sep());
      items.push(label(`${sel.length} items`),
        ed.canGroup ? tb({ icon: 'group', text: 'Group', title: 'Group (Ctrl+G)', onClick: () => ed.group() }) : ed.canUngroup ? tb({ icon: 'grid', text: 'Ungroup', title: 'Ungroup (Ctrl+Shift+G)', onClick: () => ed.ungroup() }) : null,
        sep(), tb({ icon: 'layers', text: 'Position', title: 'Align and arrange', onClick: (b) => positionMenu(b, null) }), transparency(sel));
    } else {
      const e = sel[0];
      if (e.type === 'text') items.push(...textTools(e));
      if (e.type === 'shape') {
        const lineish = e.shape === 'line' || e.shape === 'ring';
        items.push(label(SHAPE_KINDS.find((k) => k.kind === e.shape)?.label ?? 'Shape'), color(e.fill, (f) => (e.fill = f), { gradient: true, allowNone: !lineish, title: lineish ? 'Colour' : 'Fill colour' }),
          lineish ? null : color(e.stroke, (f) => { e.stroke = firstColor(f); if (!e.strokeWidth) e.strokeWidth = Math.max(2, Math.round(Math.min(e.w, e.h) * 0.03)); }, { title: 'Border colour' }));
      }
      if (e.type === 'image' && isSticker(e)) items.push(label('Sticker'), tb({ icon: 'wand', text: 'Filters & adjust', title: 'Filters and adjustments', onClick: () => open() }));
      else if (e.type === 'image' && ed.cropping === e.id) items.push(label('Cropping'), h('span', { class: 'tb-hint' }, matchMedia('(pointer: coarse)').matches ? 'Drag to move · pinch to zoom' : 'Drag the photo to move it · scroll to zoom'), tb({ icon: 'check', text: 'Done', title: 'Finish cropping (Enter)', on: true, onClick: () => ed.endCrop() }));
      else if (e.type === 'image') items.push(label(ed.isPageBackground(e) ? 'Background' : 'Photo'), ...(e.asset.startsWith('ph-') ? [] : [tb({ icon: 'crop', text: 'Crop', title: 'Move and zoom the photo inside its frame (or double-click it)', onClick: () => ed.startCrop(e) })]), tb({ icon: 'upload', text: e.asset.startsWith('ph-') ? 'Add your photo' : 'Replace photo', title: 'Pick a picture from your computer or phone', onClick: () => ed.pickPhotoFor(e) }), tb({ icon: 'wand', text: 'Filters & adjust', title: 'Filters, adjustments and crop', onClick: () => open() }), tb({ icon: 'image', text: 'Set as background', title: 'Use this photo as the page background', onClick: () => ed.imageToBackground(e) }));
      if (e.type === 'graphic') { const a = artById(e.art); items.push(label(ed.isPageBackground(e) ? 'Background' : 'Graphic'), tb({ icon: 'image', text: 'Replace', title: 'Swap this artwork for another', onClick: () => open() }), ...(a?.colors ?? []).map((_, i) => color(e.colors[i] ?? a!.colors[i], (f) => { e.colors = [...e.colors]; e.colors[i] = firstColor(f); }, { title: `Colour ${i + 1}` }))); }
      if (e.type === 'qr') items.push(label('QR code'), color(e.color, (f) => (e.color = firstColor(f)), { title: 'Squares' }), color(e.bg, (f) => (e.bg = firstColor(f)), { allowNone: true, title: 'Background' }), tb({ icon: 'edit', text: 'Link', title: 'Change the link', onClick: () => open() }));
      if (e.type === 'draw') items.push(label('Drawing'), color(e.color, (f) => (e.color = firstColor(f)), { title: 'Stroke colour' }));
      if (e.type === 'emoji') items.push(label('Sticker'));
      items.push(sep(), tb({ icon: 'layers', text: 'Position', title: 'Align, arrange and flip', onClick: (b) => positionMenu(b, e) }), transparency(sel));
    }
    items.push(h('span', { class: 'tb-grow' }),
      tb({ icon: 'edit', text: isOpen() ? 'Hide options' : 'All options', title: isOpen() ? 'Hide the options panel' : 'Show every option for this', on: isOpen(), cls: 'tb-more', onClick: () => toggle() }));
    // when the tools don't fit, a fade and an arrow at each cut-off end say there's more (and scroll to it)
    const arrow = (side: 'l' | 'r') => {
      const x = h('button', { type: 'button', class: `tb-scroll ${side}`, 'aria-label': side === 'l' ? 'More tools to the left' : 'More tools to the right', tabindex: '-1' }, icon(side === 'l' ? 'chevL' : 'chevR', 18));
      x.addEventListener('click', () => track.scrollBy({ left: (side === 'l' ? -1 : 1) * track.clientWidth * 0.7, behavior: 'smooth' }));
      return x;
    };
    const nodes = items.filter((x): x is Node => !!x);
    const done = nodes[0] instanceof HTMLElement && nodes[0].classList.contains('tb-done') ? [nodes.shift()!] : [];
    const keep = track.scrollLeft;
    track.replaceChildren(arrow('l'), ...nodes, arrow('r'));
    bar.replaceChildren(...done, track);
    track.scrollLeft = sel.length && selKey === lastBarKey ? keep : 0; // same selection (a colour or size change): stay where you were
    lastBarKey = selKey;
    edges();
  }
  function edges(): void {
    const max = track.scrollWidth - track.clientWidth;
    bar.classList.toggle('more-l', max > 2 && track.scrollLeft > 2);
    bar.classList.toggle('more-r', max > 2 && track.scrollLeft < max - 2);
  }
  track.addEventListener('scroll', edges, { passive: true });
  new ResizeObserver(edges).observe(track);

  ed.on('select', () => { if (!ed.selection.length && isPhone()) close(); render(); renderBar(); });
  ed.on('page', () => { render(); renderBar(); });
  ed.on('change', () => { if (!el.contains(document.activeElement)) render(); if (!document.querySelector('.tb-pop')) renderBar(); });
  // wide screens start with the inspector the way you left it (hidden the first time: more room for the design)
  try { if (docked() && localStorage.getItem(INSPECTOR_KEY) === '1') ed.root.classList.add('props-open'); } catch { /* private mode */ }
  render(); renderBar();

  return { el, bar, open, close, toggle, refresh: () => { if (!el.contains(document.activeElement)) render(); renderBar(); } };
}
