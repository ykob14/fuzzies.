/** Colour + gradient picker popover used across the editor. */
import type { Fill, Gradient } from './types';
import { h } from '../ui/dom';
import { fillToCss } from './render';

export const PALETTE = [
  '#000000', '#3a3a46', '#737380', '#b7b7c2', '#e6e6ee', '#ffffff',
  '#ff3b30', '#ff6b35', '#ff9f1c', '#ffd23f', '#a7e34b', '#2ec4b6',
  '#00b4d8', '#3a86ff', '#5e60ce', '#7c4dff', '#c77dff', '#ff4f9a',
  '#7f1d1d', '#9a3412', '#854d0e', '#14532d', '#134e4a', '#1e3a8a',
  '#fde2e4', '#fff1d6', '#fdf6b2', '#dcfce7', '#dbeafe', '#ede9fe',
];

export const GRADIENTS: Gradient[] = [
  ['#ff9a5a', '#ff5e7e'], ['#a18cd1', '#fbc2eb'], ['#43e97b', '#38f9d7'], ['#4facfe', '#00f2fe'],
  ['#fa709a', '#fee140'], ['#7c4dff', '#ff4f9a'], ['#30cfd0', '#330867'], ['#f6d365', '#fda085'],
  ['#0f2027', '#2c5364'], ['#ff0844', '#ffb199'], ['#c471f5', '#fa71cd'], ['#fdfbfb', '#ebedee'],
].map(([a, b]) => ({ kind: 'linear', angle: 135, stops: [{ at: 0, color: a }, { at: 1, color: b }] }));

export interface PickerOpts {
  gradient?: boolean;
  allowNone?: boolean;
  docColors?: string[];
  onInput: (f: Fill) => void; // live
  onCommit: () => void; // when the popover closes
}

let open: { el: HTMLElement; close: () => void } | null = null;

export function closePicker(): void { open?.close(); }

const toHex = (c: string): string => {
  if (/^#[0-9a-f]{6}$/i.test(c)) return c;
  if (/^#[0-9a-f]{3}$/i.test(c)) return '#' + [...c.slice(1)].map((x) => x + x).join('');
  const x = document.createElement('canvas').getContext('2d')!;
  x.fillStyle = '#000';
  x.fillStyle = c;
  const v = String(x.fillStyle);
  return v.startsWith('#') ? v : '#000000';
};

export const firstColor = (f: Fill): string => (typeof f === 'string' ? f : f.stops[0]?.color ?? '#000000');

/** A swatch button that opens the picker. */
export function colorButton(value: Fill | string, opts: PickerOpts & { title?: string }): HTMLButtonElement {
  let current: Fill = value;
  const b = h('button', { class: 'swatch-btn', type: 'button', title: opts.title ?? 'Colour', 'aria-label': opts.title ?? 'Colour' });
  const paint = () => {
    const none = current === '' || current === 'rgba(0,0,0,0)' || current === 'transparent';
    b.style.background = none ? '' : fillToCss(current);
    b.classList.toggle('none', none);
  };
  paint();
  b.addEventListener('click', (e) => {
    e.stopPropagation();
    openPicker(b, current, { ...opts, onInput: (f) => { current = f; paint(); opts.onInput(f); } });
  });
  return b;
}

export function openPicker(anchor: HTMLElement, value: Fill, opts: PickerOpts): void {
  closePicker();
  let cur: Fill = value;
  let mode: 'solid' | 'linear' | 'radial' = typeof value === 'string' ? 'solid' : value.kind;
  const pop = h('div', { class: 'picker', role: 'dialog', 'aria-label': 'Colour picker' });

  const set = (f: Fill) => { cur = f; opts.onInput(f); renderBody(); };
  const body = h('div');

  const tabs = opts.gradient ? h('div', { class: 'seg' }, ...(['solid', 'linear', 'radial'] as const).map((m) => {
    const t = h('button', { type: 'button', class: mode === m ? 'on' : '' }, m === 'solid' ? 'Solid' : m === 'linear' ? 'Gradient' : 'Radial');
    t.addEventListener('click', () => {
      mode = m;
      tabs!.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === t));
      if (m === 'solid') set(firstColor(cur));
      else {
        const g: Gradient = typeof cur === 'string' ? { kind: m, angle: 135, stops: [{ at: 0, color: cur || '#7c4dff' }, { at: 1, color: '#ff4f9a' }] } : { ...cur, kind: m };
        set(g);
      }
    });
    return t;
  })) : null;

  function swatchGrid(colors: string[], onPick: (c: string) => void): HTMLElement {
    return h('div', { class: 'swatches' }, ...colors.map((c) => {
      const s = h('button', { type: 'button', class: 'swatch', style: `background:${c}`, title: c, 'aria-label': c });
      s.addEventListener('click', () => onPick(c));
      return s;
    }));
  }

  function hexRow(color: string, onPick: (c: string) => void): HTMLElement {
    const native = h('input', { type: 'color', value: toHex(color), class: 'native-color', 'aria-label': 'Custom colour' });
    const hex = h('input', { class: 'input input-sm', value: toHex(color), maxlength: '7', 'aria-label': 'Hex colour' });
    native.addEventListener('input', () => { hex.value = native.value; onPick(native.value); });
    hex.addEventListener('change', () => { const v = hex.value.startsWith('#') ? hex.value : '#' + hex.value; if (/^#[0-9a-f]{3,6}$/i.test(v)) onPick(toHex(v)); });
    return h('div', { class: 'hex-row' }, h('label', { class: 'native-wrap', title: 'Pick any colour' }, native, h('span', null, '🎨')), hex);
  }

  function renderBody() {
    body.replaceChildren();
    if (mode === 'solid') {
      const c = typeof cur === 'string' ? cur : firstColor(cur);
      body.append(hexRow(c, (v) => set(v)));
      if (opts.allowNone) {
        const none = h('button', { type: 'button', class: 'btn btn-ghost btn-sm', style: 'width:100%;margin-bottom:8px' }, 'No colour');
        none.addEventListener('click', () => set(''));
        body.append(none);
      }
      if (opts.docColors?.length) body.append(h('div', { class: 'picker-label' }, 'In this design'), swatchGrid(opts.docColors.slice(0, 12), (v) => set(v)));
      body.append(h('div', { class: 'picker-label' }, 'Palette'), swatchGrid(PALETTE, (v) => set(v)));
      if (opts.gradient) {
        body.append(h('div', { class: 'picker-label' }, 'Gradients'), h('div', { class: 'swatches' }, ...GRADIENTS.map((g) => {
          const s = h('button', { type: 'button', class: 'swatch', style: `background:${fillToCss(g)}`, 'aria-label': 'Gradient' });
          s.addEventListener('click', () => { mode = 'linear'; tabs?.querySelectorAll('button').forEach((x, i) => x.classList.toggle('on', i === 1)); set(structuredClone(g)); });
          return s;
        })));
      }
    } else {
      const g = cur as Gradient;
      const preview = h('div', { class: 'grad-preview', style: `background:${fillToCss(g)}` });
      body.append(preview);
      g.stops.forEach((st, i) => {
        body.append(h('div', { class: 'picker-label' }, i === 0 ? 'Start colour' : 'End colour'), hexRow(st.color, (v) => {
          const ng: Gradient = { ...g, stops: g.stops.map((s, j) => (j === i ? { ...s, color: v } : s)) };
          cur = ng; opts.onInput(ng); preview.style.background = fillToCss(ng);
        }));
      });
      if (g.kind === 'linear') {
        const ang = h('input', { type: 'range', min: '0', max: '360', value: String(g.angle), class: 'range' });
        ang.addEventListener('input', () => { const ng = { ...(cur as Gradient), angle: Number(ang.value) }; cur = ng; opts.onInput(ng); preview.style.background = fillToCss(ng); });
        body.append(h('div', { class: 'picker-label' }, 'Angle'), ang);
      }
      body.append(h('div', { class: 'picker-label' }, 'Presets'), h('div', { class: 'swatches' }, ...GRADIENTS.map((pg) => {
        const s = h('button', { type: 'button', class: 'swatch', style: `background:${fillToCss({ ...pg, kind: g.kind })}`, 'aria-label': 'Gradient preset' });
        s.addEventListener('click', () => set({ ...structuredClone(pg), kind: g.kind }));
        return s;
      })));
    }
  }

  renderBody();
  pop.append(...(tabs ? [tabs] : []), body);
  document.body.append(pop);

  // position next to the anchor, kept on screen
  const r = anchor.getBoundingClientRect();
  const pw = pop.offsetWidth, ph = pop.offsetHeight;
  let x = r.left, y = r.bottom + 8;
  if (innerWidth < 640) { x = (innerWidth - pw) / 2; y = Math.max(8, innerHeight - ph - 12); }
  else {
    if (x + pw > innerWidth - 8) x = innerWidth - pw - 8;
    if (y + ph > innerHeight - 8) y = Math.max(8, r.top - ph - 8);
  }
  pop.style.left = `${Math.max(8, x)}px`;
  pop.style.top = `${y}px`;

  const off = (e: Event) => { if (!pop.contains(e.target as Node) && e.target !== anchor) close(); };
  const key = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
  function close() {
    pop.remove();
    removeEventListener('pointerdown', off, true);
    removeEventListener('keydown', key);
    if (open?.el === pop) open = null;
    opts.onCommit();
  }
  setTimeout(() => addEventListener('pointerdown', off, true));
  addEventListener('keydown', key);
  open = { el: pop, close };
}
