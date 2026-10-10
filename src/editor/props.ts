/** The inspector: every property of the selected item(s), or page settings when nothing is selected. */
import type { Editor } from './editor';
import type { El, Fill, ImageEl, Mask, ShapeEl, ShapeKind, TextEl } from './types';
import { DEFAULT_FILTERS } from './types';
import { fitText, filterCss } from './render';
import { colorButton, firstColor } from './colors';
import { SHAPE_KINDS } from './shapes';
import { SIZE_PRESETS } from './doc';
import { FONT_PACKS, ensureFont } from '../content/fonts';
import { artById } from '../content/art';
import { rewards } from '../core/rewards';
import { accounts } from '../core/account';
import { unlockDialog } from '../ui/unlock';
import { h, btn, icon, pickFile, fuzzyMark, type IconName } from '../ui/dom';
import { fileToImageData, uid } from '../core/util';
import { db } from '../core/db';

export interface Props { el: HTMLElement; open(): void; close(): void; refresh(): void }

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

  function open(): void {
    ed.root.classList.add('props-open');
    if (isPhone()) ed.panels.show(null);
    render();
  }
  function close(): void { ed.root.classList.remove('props-open'); requestAnimationFrame(() => ed.requestRender()); }

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
    title.textContent = { text: 'Text', shape: 'Shape', image: 'Photo', graphic: 'Graphic', emoji: 'Sticker', draw: 'Drawing' }[e.type];
    if (e.locked) body.append(h('div', { class: 'note' }, icon('lock', 16), 'This item is locked. ', h('button', { class: 'link', type: 'button', onclick: () => { e.locked = false; done(); render(); } }, 'Unlock')));
    if (e.type === 'text') body.append(...textProps(e));
    if (e.type === 'shape') body.append(...shapeProps(e));
    if (e.type === 'image') body.append(...imageProps(e));
    if (e.type === 'graphic') body.append(...graphicProps(e));
    if (e.type === 'draw') body.append(sec('Stroke', row('Colour', color(e.color, (f) => (e.color = firstColor(f)))), slider('Width', e.width, 1, 150, 1, (v) => (e.width = v))));
    body.append(...commonProps(e));
  }

  // ---------- text ----------
  function fontPicker(e: TextEl): HTMLElement {
    const b = h('button', { type: 'button', class: 'font-btn', style: `font-family:"${e.font}"` }, h('span', null, e.font), icon('down', 16));
    b.addEventListener('click', () => {
      document.querySelector('.font-pop')?.remove();
      const pop = h('div', { class: 'font-pop popmenu' });
      for (const pack of FONT_PACKS) {
        const locked = !rewards.isUnlocked(pack.id, pack.cost);
        pop.append(h('div', { class: 'pnl-label' }, pack.name, locked ? h('span', { class: 'lock-badge' }, fuzzyMark(14), String(pack.cost)) : null));
        for (const f of pack.fonts) {
          ensureFont(f, 400, false);
          const it = h('button', { type: 'button', class: `popmenu-item font-item ${f === e.font ? 'on' : ''} ${locked ? 'locked' : ''}`, style: `font-family:"${f}"` }, f, locked ? icon('lock', 14) : null);
          it.addEventListener('click', () => {
            pop.remove();
            if (locked) { unlockDialog({ id: pack.id, name: `${pack.name} fonts`, cost: pack.cost, kind: `Font pack · ${pack.fonts.join(', ')}`, preview: h('div', { class: 'unlock-font', style: `font-family:"${pack.fonts[0]}"` }, 'Aa Bb Cc') }, render); return; }
            for (const t of ed.selected) if (t.type === 'text') { t.font = f; fitText(t); }
            ensureFont(f, e.weight, e.italic);
            done(); render();
          });
          pop.append(it);
        }
      }
      document.body.append(pop);
      const r = b.getBoundingClientRect();
      const ph = Math.min(420, innerHeight - 24);
      pop.style.maxHeight = `${ph}px`;
      pop.style.left = `${Math.min(r.left, innerWidth - pop.offsetWidth - 8)}px`;
      pop.style.top = `${Math.max(8, Math.min(r.bottom + 6, innerHeight - ph - 12))}px`;
      pop.querySelector('.on')?.scrollIntoView({ block: 'center' });
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
          { icon: 'bolt', title: 'Bold', on: e.weight >= 700, onClick: () => { set((t) => (t.weight = t.weight >= 700 ? 400 : 700)); done(); } },
          { label: 'I', title: 'Italic', on: e.italic, onClick: () => { set((t) => (t.italic = !t.italic)); done(); } },
          { label: 'U', title: 'Underline', on: e.underline, onClick: () => { set((t) => (t.underline = !t.underline)); done(); } },
          { label: 'aA', title: 'Uppercase', on: e.uppercase, onClick: () => { set((t) => (t.uppercase = !t.uppercase)); done(); } },
        ]),
        toggles((['left', 'center', 'right'] as const).map((a) => ({ icon: a === 'left' ? 'alignL' as IconName : a === 'center' ? 'alignC' as IconName : 'alignR' as IconName, title: `Align ${a}`, on: e.align === a, onClick: () => { set((t) => (t.align = a)); done(); } }))),
        row('Colour', color(e.fill, (f) => (e.fill = f), { gradient: true })),
        slider('Line height', e.lineHeight, 0.6, 3, 0.05, (v) => set((t) => (t.lineHeight = v)), (v) => v.toFixed(2)),
        slider('Letter spacing', e.letterSpacing, -e.size * 0.15, e.size * 0.8, 0.5, (v) => set((t) => (t.letterSpacing = v)))),
      sec('Effects',
        row('Outline', color(e.strokeColor || '#1c1830', (f) => { e.strokeColor = firstColor(f); if (!e.strokeWidth) e.strokeWidth = Math.max(1, e.size * 0.03); })),
        slider('Outline width', e.strokeWidth, 0, Math.max(10, e.size * 0.2), 0.5, (v) => set((t) => (t.strokeWidth = v))),
        row('Highlight', color(e.bg, (f) => (e.bg = firstColor(f)), { allowNone: true }))),
    ];
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
    const replace = btn('Replace photo', { kind: 'ghost', icon: 'image', size: 'sm', onClick: async () => {
      const [file] = await pickFile('image/*');
      if (!file) return;
      const { src: s, w, h: ih } = await fileToImageData(file);
      const id = uid('a_');
      await db.putUpload({ id, owner: accounts.current?.id ?? '', src: s, w, h: ih, createdAt: Date.now() });
      ed.design.assets[id] = s;
      e.asset = id; e.panX = 0; e.panY = 0; e.zoom = 1;
      done(); render();
    } });
    return [
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
      h('div', { class: 'btn-row' }, replace, btn('Set as background', { kind: 'ghost', icon: 'image', size: 'sm', onClick: () => ed.imageToBackground(e) })),
    ];
  }

  function graphicProps(e: Extract<El, { type: 'graphic' }>): Node[] {
    const a = artById(e.art);
    return [sec('Colours', h('div', { class: 'row' }, ...(a?.colors ?? []).map((_, i) => color(e.colors[i] ?? a!.colors[i], (f) => { e.colors = [...e.colors]; e.colors[i] = firstColor(f); }, { title: `Colour ${i + 1}` }))))];
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

  ed.on('select', () => { if (!ed.selection.length && isPhone()) close(); render(); });
  ed.on('page', render);
  ed.on('change', () => { if (!el.contains(document.activeElement)) render(); });
  render();

  return { el, open, close, refresh: () => { if (!el.contains(document.activeElement)) render(); } };
}
