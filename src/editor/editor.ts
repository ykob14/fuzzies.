/**
 * The design editor: canvas workspace, selection, move/resize/rotate, snapping, drawing,
 * inline text editing, pages, undo/redo and autosave. Panels and the inspector live in
 * panels.ts and props.ts and talk to this class.
 */
import type { Design, El, Fill, ImageEl, Page, TextEl } from './types';
import { drawElement, drawStroke, fitText, fontString, onAssetsLoaded, renderPage, thumbnail } from './render';
import { cloneEls, makeDraw, makeEmoji, makeGraphic, makeImage, makeShape, makeText, newPage, makeQr } from './doc';
import { firstColor, closePicker } from './colors';
import { buildPanels, type Panels } from './panels';
import { buildProps, type Props } from './props';
import { openShare } from './share';
import { onFontsLoaded } from '../content/fonts';
import { db } from '../core/db';
import { track } from '../core/missions';
import { accounts } from '../core/account';
import { clamp, debounce, deepClone, fileToImageData, uid } from '../core/util';
import { h, btn, icon, toast, popMenu, type IconName } from '../ui/dom';

type Handle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'rot';
type Tool = 'select' | 'draw' | 'hand';

interface Box { x: number; y: number; w: number; h: number }

interface Drag {
  kind: 'move' | 'resize' | 'rotate' | 'marquee' | 'pan' | 'draw' | 'erase';
  id: number;
  sx: number; sy: number; // screen start (CSS px, canvas-relative)
  px: number; py: number; // design start
  orig: Map<string, El>;
  handle?: Handle;
  group?: Box;
  moved: boolean;
  panX?: number; panY?: number;
  points?: number[];
  additive?: boolean;
  startSel?: string[];
  /** Clicking an already-selected group without dragging drills in to this single member. */
  single?: string;
}

export interface DrawSettings { color: string; width: number; highlighter: boolean; eraser: boolean }

/** Elements copied with Ctrl/Cmd+C, kept across designs together with the photos they need. */
let clipboard: { els: El[]; assets: Record<string, string> } | null = null;

const HANDLE_R = () => (matchMedia('(pointer: coarse)').matches ? 11 : 7);
const isTyping = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));

export class Editor {
  readonly root: HTMLElement;
  design: Design;
  pageIndex = 0;
  selection: string[] = [];
  tool: Tool = 'select';
  drawSettings: DrawSettings = { color: '#d6336c', width: 12, highlighter: false, eraser: false };
  zoom = 1;
  panX = 0;
  panY = 0;
  snapEnabled = accounts.current?.settings.snap ?? true;

  readonly stage: HTMLElement;
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private dpr = 1;
  private cssW = 0;
  private cssH = 0;
  private drag: Drag | null = null;
  private pointers = new Map<number, { x: number; y: number }>();
  private pinch: { d: number; zoom: number; cx: number; cy: number; panX: number; panY: number } | null = null;
  private hover: string | null = null;
  private guides: { x?: number; y?: number }[] = [];
  private marquee: Box | null = null;
  private editingText: { el: TextEl; ta: HTMLTextAreaElement } | null = null;
  private renderQueued = false;
  private undoStack: string[] = [];
  private redoStack: string[] = [];
  private lastSnap = '';
  private listeners = new Map<string, Set<() => void>>();
  private cleanup: (() => void)[] = [];
  private ctxBar: HTMLElement;
  private zoomLabel: HTMLElement;
  private nameInput: HTMLInputElement;
  private undoBtn: HTMLButtonElement;
  private redoBtn: HTMLButtonElement;
  private pagesStrip: HTMLElement;
  private saveState: HTMLElement;
  private spaceDown = false;
  private lastTap = { t: 0, id: '' };
  panels!: Panels;
  props!: Props;
  readonly save: ReturnType<typeof debounce<[]>>;

  constructor(design: Design, private onExit: () => void) {
    this.design = design;
    this.lastSnap = this.snapshot();

    this.canvas = h('canvas', { class: 'ed-canvas', 'aria-label': 'Design canvas', tabindex: '0' });
    this.ctx = this.canvas.getContext('2d')!;
    this.ctxBar = h('div', { class: 'ctxbar' });
    this.zoomLabel = h('button', { class: 'zoom-label', type: 'button', title: 'Fit to screen' }, '100%');
    this.zoomLabel.addEventListener('click', () => this.fit());
    this.pagesStrip = h('div', { class: 'pages-strip' });
    this.stage = h('div', { class: 'ed-stage' }, this.canvas, this.ctxBar,
      h('div', { class: 'ed-bottom' }, this.pagesStrip,
        h('div', { class: 'zoom-ctl' },
          btn(null, { icon: 'zoomOut', kind: 'plain', size: 'sm', title: 'Zoom out', onClick: () => this.zoomBy(1 / 1.2) }),
          this.zoomLabel,
          btn(null, { icon: 'zoomIn', kind: 'plain', size: 'sm', title: 'Zoom in', onClick: () => this.zoomBy(1.2) }))));

    this.nameInput = h('input', { class: 'ed-name', value: design.name, 'aria-label': 'Design name', maxlength: '80' });
    this.nameInput.addEventListener('change', () => { this.design.name = this.nameInput.value.trim() || 'Untitled design'; this.save(); });
    this.nameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') this.nameInput.blur(); });
    this.undoBtn = btn(null, { icon: 'undo', kind: 'plain', title: 'Undo (Ctrl+Z)', onClick: () => this.undo() });
    this.redoBtn = btn(null, { icon: 'redo', kind: 'plain', title: 'Redo (Ctrl+Shift+Z)', onClick: () => this.redo() });
    this.saveState = h('span', { class: 'save-state' }, 'Saved');

    const top = h('header', { class: 'ed-top' },
      btn(null, { icon: 'back', kind: 'plain', title: 'Back to home', onClick: () => this.exit() }),
      h('div', { class: 'ed-title' }, this.nameInput, this.saveState),
      h('div', { class: 'ed-top-mid' }, this.undoBtn, this.redoBtn),
      h('div', { class: 'ed-top-right' },
        h('span', { class: 'ed-size' }, `${design.width} × ${design.height} px`),
        btn('Share', { icon: 'share', kind: 'primary', onClick: () => openShare(this) })));

    this.root = h('div', { class: 'editor' }, top, h('div', { class: 'ed-main' }));
    this.save = debounce(() => void this.persist(), 700);

    // Panels (left) and inspector (right) are separate modules.
    this.panels = buildPanels(this);
    this.props = buildProps(this);
    this.root.querySelector('.ed-main')!.append(this.panels.rail, this.panels.panel, this.stage, this.props.el);

    this.bindPointer();
    this.bindKeys();
    this.bindDrop();
    const ro = new ResizeObserver(() => this.resize(true));
    ro.observe(this.stage);
    this.cleanup.push(() => ro.disconnect(), onAssetsLoaded(() => this.requestRender()), onFontsLoaded(() => this.refitTexts()));
    this.updateHistoryButtons();
    this.renderPages();
  }

  // ---------- events ----------
  on(ev: 'select' | 'change' | 'page' | 'tool', fn: () => void): void {
    if (!this.listeners.has(ev)) this.listeners.set(ev, new Set());
    this.listeners.get(ev)!.add(fn);
  }
  private emit(ev: 'select' | 'change' | 'page' | 'tool'): void { this.listeners.get(ev)?.forEach((f) => f()); }

  // ---------- accessors ----------
  get page(): Page { return this.design.pages[this.pageIndex]; }
  get selected(): El[] { return this.page.elements.filter((e) => this.selection.includes(e.id)); }
  byId(id: string): El | undefined { return this.page.elements.find((e) => e.id === id); }

  // ---------- history & saving ----------
  private snapshot(): string { return JSON.stringify({ w: this.design.width, h: this.design.height, pages: this.design.pages }); }

  private restore(s: string): void {
    const d = JSON.parse(s);
    this.design.width = d.w; this.design.height = d.h; this.design.pages = d.pages;
    this.pageIndex = clamp(this.pageIndex, 0, this.design.pages.length - 1);
    this.selection = this.selection.filter((id) => this.byId(id));
    this.resize(false);
    this.root.querySelector('.ed-size')!.textContent = `${this.design.width} × ${this.design.height} px`;
    this.emit('select'); this.emit('change'); this.renderPages(); this.requestRender();
  }

  /** Record an undo step after a change and schedule an autosave. */
  commit(): void {
    const s = this.snapshot();
    if (s === this.lastSnap) return;
    this.undoStack.push(this.lastSnap);
    if (this.undoStack.length > 120) this.undoStack.shift();
    this.redoStack = [];
    this.lastSnap = s;
    this.updateHistoryButtons();
    this.saveState.textContent = 'Saving…';
    this.save();
    this.emit('change');
    this.requestRender();
  }

  undo(): void {
    this.finishTextEdit();
    const prev = this.undoStack.pop();
    if (!prev) return;
    this.redoStack.push(this.lastSnap);
    this.lastSnap = prev;
    this.restore(prev);
    this.updateHistoryButtons();
    this.save();
  }

  redo(): void {
    const next = this.redoStack.pop();
    if (!next) return;
    this.undoStack.push(this.lastSnap);
    this.lastSnap = next;
    this.restore(next);
    this.updateHistoryButtons();
    this.save();
  }

  private updateHistoryButtons(): void {
    this.undoBtn.disabled = !this.undoStack.length;
    this.redoBtn.disabled = !this.redoStack.length;
  }

  private async persist(): Promise<void> {
    const d = this.design;
    d.updatedAt = Date.now();
    try {
      d.thumb = thumbnail(d);
      await db.putDesign(d);
      this.saveState.textContent = 'Saved';
      this.renderPages();
    } catch (e) {
      console.error(e);
      this.saveState.textContent = 'Not saved';
      toast('Could not save — your device storage may be full.', 'bad', 4000);
    }
  }

  /** Remove photos no longer used by any page so saved projects stay small. */
  private pruneAssets(): void {
    const used = new Set<string>();
    for (const p of this.design.pages) {
      if (p.bgAsset) used.add(p.bgAsset);
      for (const e of p.elements) if (e.type === 'image') used.add(e.asset);
    }
    for (const k of Object.keys(this.design.assets)) if (!used.has(k)) delete this.design.assets[k];
  }

  async exit(): Promise<void> {
    this.finishTextEdit();
    this.pruneAssets();
    this.save.flush();
    await this.persist();
    this.onExit();
  }

  destroy(): void {
    closePicker();
    this.cleanup.forEach((f) => f());
    document.querySelector('.popmenu')?.remove();
  }

  // ---------- view ----------
  private resize(keepCenter: boolean): void {
    const r = this.stage.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const first = !this.cssW;
    const oldW = this.cssW, oldH = this.cssH;
    this.dpr = Math.min(3, devicePixelRatio || 1);
    this.cssW = r.width; this.cssH = r.height;
    this.canvas.width = Math.round(r.width * this.dpr);
    this.canvas.height = Math.round(r.height * this.dpr);
    this.canvas.style.width = `${r.width}px`;
    this.canvas.style.height = `${r.height}px`;
    if (first || !keepCenter) this.fit();
    else { this.panX += (r.width - oldW) / 2; this.panY += (r.height - oldH) / 2; this.requestRender(); }
  }

  /** Space reserved for the page strip and zoom controls at the bottom of the stage. */
  private get bottomInset(): number { return this.cssW < 700 ? 76 : 70; }

  fit(): void {
    const pad = this.cssW < 700 ? 20 : 48;
    const availH = this.cssH - this.bottomInset - pad;
    this.zoom = Math.max(0.02, Math.min((this.cssW - pad * 2) / this.design.width, (availH - pad) / this.design.height));
    this.panX = (this.cssW - this.design.width * this.zoom) / 2;
    this.panY = (availH + pad - this.design.height * this.zoom) / 2;
    this.requestRender();
  }

  zoomBy(f: number, cx = this.cssW / 2, cy = (this.cssH - this.bottomInset) / 2): void {
    const z = clamp(this.zoom * f, 0.02, 8);
    this.panX = cx - ((cx - this.panX) * z) / this.zoom;
    this.panY = cy - ((cy - this.panY) * z) / this.zoom;
    this.zoom = z;
    this.requestRender();
  }

  toDesign(clientX: number, clientY: number): { x: number; y: number; sx: number; sy: number } {
    const r = this.canvas.getBoundingClientRect();
    const sx = clientX - r.left, sy = clientY - r.top;
    return { x: (sx - this.panX) / this.zoom, y: (sy - this.panY) / this.zoom, sx, sy };
  }
  private toScreen(x: number, y: number): [number, number] { return [x * this.zoom + this.panX, y * this.zoom + this.panY]; }

  // ---------- geometry ----------
  private corners(el: El): [number, number][] {
    const cx = el.x + el.w / 2, cy = el.y + el.h / 2;
    const a = (el.rotation * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
    return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([ux, uy]) => {
      const lx = (ux * el.w) / 2, ly = (uy * el.h) / 2;
      return [cx + lx * c - ly * s, cy + lx * s + ly * c] as [number, number];
    });
  }

  aabb(els: El[]): Box | null {
    if (!els.length) return null;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const el of els) for (const [x, y] of this.corners(el)) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }

  private hitEl(x: number, y: number): El | null {
    const els = this.page.elements;
    const tol = 4 / this.zoom;
    for (let i = els.length - 1; i >= 0; i--) {
      const el = els[i];
      if (el.hidden) continue;
      const cx = el.x + el.w / 2, cy = el.y + el.h / 2;
      const a = (-el.rotation * Math.PI) / 180;
      const dx = x - cx, dy = y - cy;
      const lx = dx * Math.cos(a) - dy * Math.sin(a), ly = dx * Math.sin(a) + dy * Math.cos(a);
      const hw = Math.max(el.w / 2, 8 / this.zoom), hh = Math.max(el.h / 2, 8 / this.zoom);
      if (Math.abs(lx) <= hw + tol && Math.abs(ly) <= hh + tol) return el;
    }
    return null;
  }

  /** Handle positions in screen space for the current selection. */
  private handles(): { h: Handle; x: number; y: number }[] {
    const sel = this.selected;
    if (!sel.length || this.editingText) return [];
    if (sel.length === 1) {
      const el = sel[0];
      if (el.locked) return [];
      const pts = this.corners(el).map(([x, y]) => this.toScreen(x, y));
      const mid = (a: number, b: number): [number, number] => [(pts[a][0] + pts[b][0]) / 2, (pts[a][1] + pts[b][1]) / 2];
      const out: { h: Handle; x: number; y: number }[] = [];
      const add = (hh: Handle, p: [number, number]) => out.push({ h: hh, x: p[0], y: p[1] });
      add('nw', pts[0]); add('ne', pts[1]); add('se', pts[2]); add('sw', pts[3]);
      const big = el.w * this.zoom > 40 || el.h * this.zoom > 40;
      if (big && el.type !== 'qr') { // QR codes only scale from the corners so they stay square
        add('e', mid(1, 2)); add('w', mid(3, 0));
        if (el.type !== 'text') { add('n', mid(0, 1)); add('s', mid(2, 3)); }
      }
      // rotation knob sits below the box along its local y axis
      const a = (el.rotation * Math.PI) / 180;
      const [bx, by] = mid(2, 3);
      add('rot', [bx - Math.sin(a) * 30, by + Math.cos(a) * 30]);
      return out;
    }
    const b = this.aabb(sel.filter((e) => !e.locked));
    if (!b) return [];
    const [x0, y0] = this.toScreen(b.x, b.y), [x1, y1] = this.toScreen(b.x + b.w, b.y + b.h);
    return [{ h: 'nw', x: x0, y: y0 }, { h: 'ne', x: x1, y: y0 }, { h: 'se', x: x1, y: y1 }, { h: 'sw', x: x0, y: y1 }];
  }

  // ---------- rendering ----------
  requestRender(): void {
    if (this.renderQueued) return;
    this.renderQueued = true;
    requestAnimationFrame(() => { this.renderQueued = false; this.draw(); });
  }

  private draw(): void {
    const { ctx, dpr, design } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(dpr * this.zoom, 0, 0, dpr * this.zoom, dpr * this.panX, dpr * this.panY);

    // page with soft shadow
    ctx.save();
    ctx.shadowColor = 'rgba(20,10,40,0.22)';
    ctx.shadowBlur = 30 * dpr;
    ctx.shadowOffsetY = 8 * dpr;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, design.width, design.height);
    ctx.restore();

    // Selected items that hang off the page show faintly outside it, like in print layout tools.
    const sel = this.selected;
    if (sel.length) {
      ctx.save();
      ctx.globalAlpha = 0.35;
      for (const el of sel) drawElement(ctx, el, design);
      ctx.restore();
    }
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, design.width, design.height);
    ctx.clip();
    renderPage(ctx, design, this.page, { skip: this.editingText?.el.id });
    ctx.restore();

    // live pen stroke
    const d = this.drag;
    if (d?.kind === 'draw' && d.points && d.points.length >= 2) {
      ctx.save();
      ctx.strokeStyle = this.drawSettings.color;
      ctx.lineWidth = this.drawSettings.width;
      ctx.lineCap = this.drawSettings.highlighter ? 'square' : 'round';
      ctx.lineJoin = 'round';
      if (this.drawSettings.highlighter) ctx.globalAlpha = 0.45;
      drawStroke(ctx, d.points, 1, 1);
      ctx.restore();
    }

    // ---- overlay in screen space ----
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#d6336c';
    const outline = (el: El, width: number, dash = false) => {
      const pts = this.corners(el).map(([x, y]) => this.toScreen(x, y));
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
      ctx.lineWidth = width;
      ctx.strokeStyle = accent;
      ctx.setLineDash(dash ? [5, 4] : []);
      ctx.stroke();
      ctx.setLineDash([]);
    };
    if (this.hover && !this.selection.includes(this.hover) && !d) {
      const el = this.byId(this.hover);
      if (el) outline(el, 1.5);
    }
    if (!this.editingText) {
      for (const el of sel) outline(el, sel.length > 1 ? 1.2 : 1.6, !!el.locked);
      if (sel.length > 1) {
        const b = this.aabb(sel);
        if (b) {
          const [x0, y0] = this.toScreen(b.x, b.y);
          ctx.setLineDash([6, 4]);
          ctx.strokeStyle = accent;
          ctx.lineWidth = 1;
          ctx.strokeRect(x0, y0, b.w * this.zoom, b.h * this.zoom);
          ctx.setLineDash([]);
        }
      }
      if (!d || d.kind === 'marquee') {
        const r = HANDLE_R();
        for (const hd of this.handles()) {
          ctx.beginPath();
          if (hd.h === 'rot') {
            ctx.arc(hd.x, hd.y, r + 3, 0, Math.PI * 2);
            ctx.fillStyle = '#fff';
            ctx.shadowColor = 'rgba(0,0,0,0.25)'; ctx.shadowBlur = 6;
            ctx.fill();
            ctx.shadowColor = 'transparent';
            ctx.strokeStyle = accent; ctx.lineWidth = 1.5; ctx.stroke();
            ctx.beginPath();
            ctx.arc(hd.x, hd.y, r - 2.5, -Math.PI * 0.9, Math.PI * 0.55);
            ctx.strokeStyle = accent; ctx.lineWidth = 1.8; ctx.stroke();
          } else if (hd.h === 'n' || hd.h === 's' || hd.h === 'e' || hd.h === 'w') {
            const vert = hd.h === 'e' || hd.h === 'w';
            const el = sel[0];
            ctx.save();
            ctx.translate(hd.x, hd.y);
            ctx.rotate((el.rotation * Math.PI) / 180);
            const w = vert ? 7 : 22, hh = vert ? 22 : 7;
            ctx.beginPath();
            ctx.roundRect(-w / 2, -hh / 2, w, hh, 4);
            ctx.fillStyle = '#fff'; ctx.shadowColor = 'rgba(0,0,0,0.25)'; ctx.shadowBlur = 5; ctx.fill();
            ctx.shadowColor = 'transparent'; ctx.strokeStyle = accent; ctx.lineWidth = 1.4; ctx.stroke();
            ctx.restore();
          } else {
            ctx.arc(hd.x, hd.y, r, 0, Math.PI * 2);
            ctx.fillStyle = '#fff';
            ctx.shadowColor = 'rgba(0,0,0,0.25)'; ctx.shadowBlur = 5;
            ctx.fill();
            ctx.shadowColor = 'transparent';
            ctx.strokeStyle = accent; ctx.lineWidth = 1.5; ctx.stroke();
          }
        }
      }
    }
    // snap guides
    ctx.strokeStyle = '#ff2fa0';
    ctx.lineWidth = 1;
    for (const g of this.guides) {
      ctx.beginPath();
      if (g.x !== undefined) { const [x] = this.toScreen(g.x, 0); ctx.moveTo(x, 0); ctx.lineTo(x, this.cssH); }
      if (g.y !== undefined) { const [, y] = this.toScreen(0, g.y); ctx.moveTo(0, y); ctx.lineTo(this.cssW, y); }
      ctx.stroke();
    }
    if (this.marquee) {
      const [x0, y0] = this.toScreen(this.marquee.x, this.marquee.y);
      ctx.fillStyle = 'rgba(124,77,255,0.1)';
      ctx.fillRect(x0, y0, this.marquee.w * this.zoom, this.marquee.h * this.zoom);
      ctx.strokeStyle = accent;
      ctx.strokeRect(x0, y0, this.marquee.w * this.zoom, this.marquee.h * this.zoom);
    }
    this.zoomLabel.textContent = `${Math.round(this.zoom * 100)}%`;
    this.positionCtxBar();
    if (this.editingText) this.positionTextArea();
  }

  // ---------- selection ----------
  select(ids: string[]): void {
    if (this.editingText && !ids.includes(this.editingText.el.id)) this.finishTextEdit();
    this.selection = ids;
    this.emit('select');
    this.buildCtxBar();
    this.requestRender();
  }

  private buildCtxBar(): void {
    const sel = this.selected;
    this.ctxBar.replaceChildren();
    if (!sel.length) { this.ctxBar.hidden = true; return; }
    this.ctxBar.hidden = false;
    const b = (ic: IconName, title: string, fn: () => void, cls = '') => {
      const x = btn(null, { icon: ic, kind: 'plain', size: 'sm', title, onClick: fn, class: cls });
      x.addEventListener('pointerdown', (e) => e.stopPropagation());
      return x;
    };
    const single = sel.length === 1 ? sel[0] : null;
    const items: HTMLElement[] = [];
    items.push(b('edit', 'Edit', () => this.props.open(), 'ctx-edit'));
    if (single?.type === 'text') items.push(b('text', 'Edit text', () => this.editText(single)));
    if (this.canGroup) items.push(b('group', 'Group (Ctrl+G)', () => this.group()));
    else if (this.canUngroup) items.push(b('grid', 'Ungroup (Ctrl+Shift+G)', () => this.ungroup()));
    items.push(b('copy', 'Duplicate (Ctrl+D)', () => this.duplicate()));
    const locked = sel.every((e) => e.locked);
    items.push(b(locked ? 'lock' : 'unlock', locked ? 'Unlock' : 'Lock', () => { for (const e of this.selected) e.locked = !locked; this.commit(); this.buildCtxBar(); }));
    items.push(b('trash', 'Delete', () => this.deleteSelection()));
    const more = b('more', 'More', () => popMenu(more, [
      { label: 'Bring to front', icon: 'front', onClick: () => this.reorder('front') },
      { label: 'Bring forward', icon: 'up', onClick: () => this.reorder('up') },
      { label: 'Send backward', icon: 'down', onClick: () => this.reorder('down') },
      { label: 'Send to back', icon: 'layers', onClick: () => this.reorder('back') },
      null,
      { label: 'Flip horizontal', icon: 'flipH', onClick: () => { for (const e of this.selected) e.flipX = !e.flipX; this.commit(); } },
      { label: 'Flip vertical', icon: 'flipV', onClick: () => { for (const e of this.selected) e.flipY = !e.flipY; this.commit(); } },
      { label: 'Copy', icon: 'clipboard', onClick: () => this.copy() },
      ...(single?.type === 'image' ? [{ label: 'Set as background', icon: 'image' as IconName, onClick: () => this.imageToBackground(single) }] : []),
    ]));
    items.push(more);
    this.ctxBar.append(...items);
  }

  private positionCtxBar(): void {
    if (this.ctxBar.hidden) return;
    const b = this.aabb(this.selected);
    if (!b || this.drag?.moved || this.editingText) { this.ctxBar.style.opacity = '0'; this.ctxBar.style.pointerEvents = 'none'; return; }
    this.ctxBar.style.opacity = '1';
    this.ctxBar.style.pointerEvents = '';
    const [x0, y0] = this.toScreen(b.x, b.y), [x1, y1] = this.toScreen(b.x + b.w, b.y + b.h);
    const bw = this.ctxBar.offsetWidth, bh = this.ctxBar.offsetHeight;
    let x = (x0 + x1) / 2 - bw / 2;
    let y = y0 - bh - 14;
    if (y < 8) y = Math.min(y1 + 46, this.cssH - this.bottomInset - bh - 8);
    x = clamp(x, 8, this.cssW - bw - 8);
    y = clamp(y, 8, Math.max(8, this.cssH - bh - 8));
    this.ctxBar.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
  }

  // ---------- pointer handling ----------
  private bindPointer(): void {
    const c = this.canvas;
    c.addEventListener('pointerdown', (e) => this.onDown(e));
    c.addEventListener('pointermove', (e) => this.onMove(e));
    c.addEventListener('pointerup', (e) => this.onUp(e));
    c.addEventListener('pointercancel', (e) => this.onUp(e));
    c.addEventListener('dblclick', (e) => {
      const p = this.toDesign(e.clientX, e.clientY);
      const el = this.hitEl(p.x, p.y);
      if (el?.type === 'text' && !el.locked) this.editText(el);
      else if (el) this.props.open();
    });
    c.addEventListener('wheel', (e) => {
      e.preventDefault();
      const p = this.toDesign(e.clientX, e.clientY);
      if (e.ctrlKey || e.metaKey) this.zoomBy(Math.exp(-e.deltaY * 0.01), p.sx, p.sy);
      else { this.panX -= e.deltaX; this.panY -= e.deltaY; this.requestRender(); }
    }, { passive: false });
    c.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const p = this.toDesign(e.clientX, e.clientY);
      const el = this.hitEl(p.x, p.y);
      if (el && !this.selection.includes(el.id)) this.select([el.id]);
      const anchor = h('div', { style: `position:fixed;left:${e.clientX}px;top:${e.clientY}px;width:1px;height:1px` });
      document.body.append(anchor);
      popMenu(anchor, el ? [
        { label: 'Copy', icon: 'clipboard', onClick: () => this.copy() },
        { label: 'Paste', icon: 'clipboard', onClick: () => this.paste() },
        { label: 'Duplicate', icon: 'copy', onClick: () => this.duplicate() },
        { label: 'Bring to front', icon: 'front', onClick: () => this.reorder('front') },
        { label: 'Send to back', icon: 'layers', onClick: () => this.reorder('back') },
        { label: 'Delete', icon: 'trash', danger: true, onClick: () => this.deleteSelection() },
      ] : [
        { label: 'Paste', icon: 'clipboard', onClick: () => this.paste() },
        { label: 'Select all', icon: 'grid', onClick: () => this.select(this.page.elements.filter((x) => !x.hidden).map((x) => x.id)) },
      ]);
      setTimeout(() => anchor.remove(), 100);
    });
  }

  private onDown(e: PointerEvent): void {
    if (e.button === 2) return;
    closePicker();
    this.canvas.focus({ preventScroll: true });
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    this.canvas.setPointerCapture(e.pointerId);
    if (this.pointers.size === 2) { this.startPinch(); return; }
    if (this.pointers.size > 2) return;
    if (this.editingText) this.finishTextEdit();

    const p = this.toDesign(e.clientX, e.clientY);
    const base = { id: e.pointerId, sx: p.sx, sy: p.sy, px: p.x, py: p.y, moved: false, orig: new Map<string, El>() };

    if (this.tool === 'hand' || this.spaceDown || e.button === 1) {
      this.drag = { ...base, kind: 'pan', panX: this.panX, panY: this.panY };
      this.canvas.style.cursor = 'grabbing';
      return;
    }
    if (this.tool === 'draw') {
      if (this.drawSettings.eraser) { this.drag = { ...base, kind: 'erase' }; this.eraseAt(p.x, p.y); }
      else this.drag = { ...base, kind: 'draw', points: [p.x, p.y] };
      this.requestRender();
      return;
    }

    // handles first
    const r = HANDLE_R() + 6;
    const hd = this.handles().find((x) => Math.hypot(x.x - p.sx, x.y - p.sy) <= r);
    if (hd) {
      const sel = this.selected.filter((x) => !x.locked);
      this.drag = { ...base, kind: hd.h === 'rot' ? 'rotate' : 'resize', handle: hd.h, group: this.aabb(sel) ?? undefined };
      for (const el of sel) this.drag.orig.set(el.id, deepClone(el));
      return;
    }

    const hit = this.hitEl(p.x, p.y);
    if (hit) {
      const additive = e.shiftKey || e.metaKey || e.ctrlKey;
      const members = hit.group && !e.altKey ? this.groupMembers(hit.group) : [hit.id];
      const wholeGroupSelected = members.length > 1 && members.every((id) => this.selection.includes(id));
      if (additive) {
        this.select(this.selection.includes(hit.id) ? this.selection.filter((x) => !members.includes(x)) : [...new Set([...this.selection, ...members])]);
      } else if (!this.selection.includes(hit.id)) this.select(members);
      // double-tap on touch screens opens text editing
      const now = performance.now();
      if (e.pointerType !== 'mouse' && hit.type === 'text' && this.lastTap.id === hit.id && now - this.lastTap.t < 350 && !hit.locked) {
        this.drag = null;
        this.editText(hit);
        return;
      }
      this.lastTap = { t: now, id: hit.id };
      this.drag = { ...base, kind: 'move', single: wholeGroupSelected && !additive ? hit.id : undefined };
      for (const el of this.selected) if (!el.locked) this.drag.orig.set(el.id, deepClone(el));
      return;
    }
    // empty space: marquee on desktop, pan or deselect on touch
    if (e.pointerType === 'mouse') {
      this.drag = { ...base, kind: 'marquee', additive: e.shiftKey, startSel: [...this.selection] };
      if (!e.shiftKey) this.select([]);
    } else {
      this.select([]);
      this.drag = { ...base, kind: 'pan', panX: this.panX, panY: this.panY };
    }
  }

  private onMove(e: PointerEvent): void {
    if (this.pointers.has(e.pointerId)) this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.pinch) { this.updatePinch(); return; }
    const p = this.toDesign(e.clientX, e.clientY);
    const d = this.drag;
    if (!d || d.id !== e.pointerId) {
      if (e.pointerType === 'mouse' && this.tool === 'select') {
        const hd = this.handles().find((x) => Math.hypot(x.x - p.sx, x.y - p.sy) <= HANDLE_R() + 6);
        const hit = hd ? null : this.hitEl(p.x, p.y);
        const id = hit?.id ?? null;
        if (id !== this.hover) { this.hover = id; this.requestRender(); }
        this.canvas.style.cursor = hd ? (hd.h === 'rot' ? 'grab' : ({ nw: 'nwse-resize', se: 'nwse-resize', ne: 'nesw-resize', sw: 'nesw-resize', n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize' } as Record<string, string>)[hd.h]) : hit ? (hit.locked ? 'default' : 'move') : 'default';
      } else this.canvas.style.cursor = this.tool === 'hand' ? 'grab' : this.tool === 'draw' ? 'crosshair' : 'default';
      return;
    }
    const dist = Math.hypot(p.sx - d.sx, p.sy - d.sy);
    if (!d.moved && dist < 3) return;
    d.moved = true;
    switch (d.kind) {
      case 'pan':
        this.panX = d.panX! + (p.sx - d.sx);
        this.panY = d.panY! + (p.sy - d.sy);
        break;
      case 'move': this.doMove(d, p.x - d.px, p.y - d.py, e.shiftKey); break;
      case 'resize': this.doResize(d, p.x, p.y, e.shiftKey); break;
      case 'rotate': this.doRotate(d, p.x, p.y, e.shiftKey); break;
      case 'marquee': {
        const x = Math.min(d.px, p.x), y = Math.min(d.py, p.y);
        this.marquee = { x, y, w: Math.abs(p.x - d.px), h: Math.abs(p.y - d.py) };
        const m = this.marquee;
        const hit = this.page.elements.filter((el) => {
          if (el.hidden) return false;
          const b = this.aabb([el])!;
          return b.x < m.x + m.w && b.x + b.w > m.x && b.y < m.y + m.h && b.y + b.h > m.y;
        }).map((el) => el.id);
        this.selection = d.additive ? [...new Set([...(d.startSel ?? []), ...hit])] : hit;
        break;
      }
      case 'draw': {
        const pts = d.points!;
        const lx = pts[pts.length - 2], ly = pts[pts.length - 1];
        if (Math.hypot(p.x - lx, p.y - ly) * this.zoom > 2) pts.push(p.x, p.y);
        break;
      }
      case 'erase': this.eraseAt(p.x, p.y); break;
    }
    this.requestRender();
  }

  private onUp(e: PointerEvent): void {
    this.pointers.delete(e.pointerId);
    if (this.pinch) {
      if (this.pointers.size < 2) { this.pinch = null; this.drag = null; }
      return;
    }
    const d = this.drag;
    if (!d || d.id !== e.pointerId) return;
    this.drag = null;
    if (d.kind === 'move' && !d.moved && d.single) this.select([d.single]);
    this.guides = [];
    this.canvas.style.cursor = '';
    if (d.kind === 'marquee') { this.marquee = null; this.emit('select'); this.buildCtxBar(); }
    if (d.kind === 'draw') this.finishStroke(d.points!);
    if (d.kind === 'erase') this.commit();
    if ((d.kind === 'move' || d.kind === 'resize' || d.kind === 'rotate') && d.moved) {
      this.commit();
      this.props.refresh();
    }
    this.requestRender();
  }

  private startPinch(): void {
    const [a, b] = [...this.pointers.values()];
    // cancel whatever the first finger started
    if (this.drag && this.drag.moved && this.drag.orig.size) {
      for (const [id, o] of this.drag.orig) { const i = this.page.elements.findIndex((x) => x.id === id); if (i >= 0) this.page.elements[i] = o; }
    }
    this.drag = null;
    this.guides = [];
    const r = this.canvas.getBoundingClientRect();
    this.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), zoom: this.zoom, cx: (a.x + b.x) / 2 - r.left, cy: (a.y + b.y) / 2 - r.top, panX: this.panX, panY: this.panY };
  }

  private updatePinch(): void {
    const pts = [...this.pointers.values()];
    if (pts.length < 2 || !this.pinch) return;
    const [a, b] = pts;
    const r = this.canvas.getBoundingClientRect();
    const p = this.pinch;
    const z = clamp((p.zoom * Math.hypot(a.x - b.x, a.y - b.y)) / Math.max(1, p.d), 0.02, 8);
    const cx = (a.x + b.x) / 2 - r.left, cy = (a.y + b.y) / 2 - r.top;
    // keep the design point under the fingers' midpoint fixed
    const dx = (p.cx - p.panX) / p.zoom, dy = (p.cy - p.panY) / p.zoom;
    this.zoom = z;
    this.panX = cx - dx * z;
    this.panY = cy - dy * z;
    this.requestRender();
  }

  // ---------- transforms ----------
  private doMove(d: Drag, dx: number, dy: number, noSnap: boolean): void {
    const origs = [...d.orig.values()];
    if (!origs.length) return;
    this.guides = [];
    if (this.snapEnabled && !noSnap) {
      const b = this.aabb(origs)!;
      const nb = { x: b.x + dx, y: b.y + dy, w: b.w, h: b.h };
      const thr = 7 / this.zoom;
      const others = this.page.elements.filter((x) => !d.orig.has(x.id) && !x.hidden);
      const xs = [0, this.design.width / 2, this.design.width];
      const ys = [0, this.design.height / 2, this.design.height];
      for (const o of others) { const ob = this.aabb([o])!; xs.push(ob.x, ob.x + ob.w / 2, ob.x + ob.w); ys.push(ob.y, ob.y + ob.h / 2, ob.y + ob.h); }
      const snap = (vals: number[], targets: number[]) => {
        let best: { off: number; t: number } | null = null;
        for (const v of vals) for (const t of targets) { const off = t - v; if (Math.abs(off) < thr && (!best || Math.abs(off) < Math.abs(best.off))) best = { off, t }; }
        return best;
      };
      const sx = snap([nb.x, nb.x + nb.w / 2, nb.x + nb.w], xs);
      const sy = snap([nb.y, nb.y + nb.h / 2, nb.y + nb.h], ys);
      if (sx) { dx += sx.off; this.guides.push({ x: sx.t }); }
      if (sy) { dy += sy.off; this.guides.push({ y: sy.t }); }
    }
    for (const [id, o] of d.orig) {
      const el = this.byId(id);
      if (el) { el.x = o.x + dx; el.y = o.y + dy; }
    }
  }

  private doResize(d: Drag, px: number, py: number, shift: boolean): void {
    const hd = d.handle!;
    const hx = hd.includes('e') ? 1 : hd.includes('w') ? -1 : 0;
    const hy = hd.includes('s') ? 1 : hd.includes('n') ? -1 : 0;
    const origs = [...d.orig.values()];
    if (origs.length === 1) {
      const o = origs[0];
      const el = this.byId(o.id)!;
      const a = (o.rotation * Math.PI) / 180, cos = Math.cos(a), sin = Math.sin(a);
      const cx0 = o.x + o.w / 2, cy0 = o.y + o.h / 2;
      const dx = px - cx0, dy = py - cy0;
      const lx = dx * cos + dy * sin, ly = -dx * sin + dy * cos; // pointer in local space
      const ax = (-hx * o.w) / 2, ay = (-hy * o.h) / 2; // fixed anchor (opposite side)
      const min = 6 / this.zoom;
      const keepRatio = (hx !== 0 && hy !== 0) && (o.type === 'shape' || o.type === 'draw' ? shift : !shift);
      let nw = o.w, nh = o.h;
      if (keepRatio) {
        const s = Math.max(min / Math.min(o.w, o.h), Math.max((hx * (lx - ax)) / o.w, (hy * (ly - ay)) / o.h));
        nw = o.w * s; nh = o.h * s;
      } else {
        if (hx) nw = Math.max(min, hx * (lx - ax));
        if (hy) nh = Math.max(min, hy * (ly - ay));
      }
      // new centre in local space, then back to design space
      const ncx = hx ? ax + (hx * nw) / 2 : 0, ncy = hy ? ay + (hy * nh) / 2 : 0;
      const wx = cx0 + ncx * cos - ncy * sin, wy = cy0 + ncx * sin + ncy * cos;
      if (o.type === 'text' && el.type === 'text') {
        if (hx && hy) {
          const s = nw / o.w;
          el.size = Math.max(4, o.size * s);
          el.letterSpacing = o.letterSpacing * s;
          el.strokeWidth = o.strokeWidth * s;
        }
        el.w = nw;
        fitText(el);
        // keep the anchored edge fixed vertically for text whose height re-flows
        const ncy2 = hy ? ay + (hy * el.h) / 2 : (el.h - o.h) / 2;
        const wx2 = cx0 + ncx * cos - ncy2 * sin, wy2 = cy0 + ncx * sin + ncy2 * cos;
        el.x = wx2 - el.w / 2; el.y = wy2 - el.h / 2;
        return;
      }
      el.w = nw; el.h = nh;
      el.x = wx - nw / 2; el.y = wy - nh / 2;
      if (el.type === 'draw' && o.type === 'draw' && keepRatio) el.width = o.width * (nw / o.w);
      if (el.type === 'shape' && o.type === 'shape' && keepRatio && o.strokeWidth) el.strokeWidth = o.strokeWidth * (nw / o.w);
      return;
    }
    // group: uniform scale from the opposite corner of the group box
    const g = d.group!;
    const ax = hx > 0 ? g.x : g.x + g.w, ay = hy > 0 ? g.y : g.y + g.h;
    const s = Math.max(0.05, Math.max((hx * (px - ax)) / g.w, (hy * (py - ay)) / g.h));
    for (const o of origs) {
      const el = this.byId(o.id)!;
      const cx = ax + (o.x + o.w / 2 - ax) * s, cy = ay + (o.y + o.h / 2 - ay) * s;
      el.w = o.w * s; el.h = o.h * s;
      if (el.type === 'text' && o.type === 'text') { el.size = o.size * s; el.letterSpacing = o.letterSpacing * s; el.strokeWidth = o.strokeWidth * s; fitText(el); }
      if (el.type === 'draw' && o.type === 'draw') el.width = o.width * s;
      el.x = cx - el.w / 2; el.y = cy - el.h / 2;
    }
  }

  private doRotate(d: Drag, px: number, py: number, shift: boolean): void {
    const o = [...d.orig.values()][0];
    if (!o) return;
    const el = this.byId(o.id)!;
    const cx = o.x + o.w / 2, cy = o.y + o.h / 2;
    let deg = (Math.atan2(py - cy, px - cx) * 180) / Math.PI - 90;
    if (shift) deg = Math.round(deg / 15) * 15;
    else { const near = Math.round(deg / 45) * 45; if (Math.abs(deg - near) < 4) deg = near; }
    el.rotation = ((Math.round(deg * 10) / 10) % 360 + 540) % 360 - 180;
  }

  // ---------- drawing ----------
  private finishStroke(pts: number[]): void {
    if (pts.length < 2) return;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let i = 0; i < pts.length; i += 2) { x0 = Math.min(x0, pts[i]); x1 = Math.max(x1, pts[i]); y0 = Math.min(y0, pts[i + 1]); y1 = Math.max(y1, pts[i + 1]); }
    const pad = this.drawSettings.width / 2;
    x0 -= pad; y0 -= pad; x1 += pad; y1 += pad;
    const w = Math.max(1, x1 - x0), h2 = Math.max(1, y1 - y0);
    const norm = pts.map((v, i) => (i % 2 ? (v - y0) / h2 : (v - x0) / w));
    const el = makeDraw(norm, x0, y0, w, h2, this.drawSettings.color, this.drawSettings.width, this.drawSettings.highlighter);
    this.page.elements.push(el);
    this.commit();
  }

  private eraseAt(x: number, y: number): void {
    const el = this.hitEl(x, y);
    if (el?.type === 'draw' && !el.locked) {
      this.page.elements = this.page.elements.filter((e) => e !== el);
      this.requestRender();
    }
  }

  setTool(t: Tool): void {
    this.tool = t;
    if (t !== 'select') this.select([]);
    this.canvas.style.cursor = t === 'hand' ? 'grab' : t === 'draw' ? 'crosshair' : '';
    this.emit('tool');
  }

  // ---------- text editing ----------
  editText(el: TextEl): void {
    if (this.editingText?.el === el) return;
    this.finishTextEdit();
    if (!this.selection.includes(el.id)) this.select([el.id]);
    const ta = h('textarea', { class: 'text-edit', spellcheck: 'true', 'aria-label': 'Edit text' });
    ta.value = el.text;
    this.stage.append(ta);
    this.editingText = { el, ta };
    ta.addEventListener('input', () => { el.text = ta.value; fitText(el); this.requestRender(); });
    ta.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Escape' || (e.key === 'Enter' && (e.metaKey || e.ctrlKey))) { e.preventDefault(); this.finishTextEdit(); }
    });
    ta.addEventListener('blur', () => setTimeout(() => { if (this.editingText?.ta === ta) this.finishTextEdit(); }, 120));
    this.positionTextArea();
    this.requestRender();
    ta.focus();
    ta.select();
    this.ctxBar.style.opacity = '0';
  }

  private positionTextArea(): void {
    const t = this.editingText;
    if (!t) return;
    const { el, ta } = t;
    const z = this.zoom;
    const [cx, cy] = this.toScreen(el.x + el.w / 2, el.y + el.h / 2);
    Object.assign(ta.style, {
      left: `${cx - (el.w * z) / 2}px`, top: `${cy - (el.h * z) / 2}px`,
      width: `${el.w * z}px`, height: `${el.h * z + 4}px`,
      transform: `rotate(${el.rotation}deg)`,
      font: fontString(el, el.size * z),
      lineHeight: String(el.lineHeight),
      letterSpacing: `${el.letterSpacing * z}px`,
      textAlign: el.align,
      color: firstColor(el.fill) || '#000',
      textTransform: el.uppercase ? 'uppercase' : 'none',
      textDecoration: el.underline ? 'underline' : 'none',
    });
  }

  finishTextEdit(): void {
    const t = this.editingText;
    if (!t) return;
    this.editingText = null;
    t.ta.remove();
    if (!t.el.text.trim()) {
      this.page.elements = this.page.elements.filter((e) => e !== t.el);
      this.selection = this.selection.filter((id) => id !== t.el.id);
      this.emit('select');
    }
    this.buildCtxBar();
    this.commit();
    this.props.refresh();
  }

  private refitTexts(): void {
    for (const p of this.design.pages) for (const el of p.elements) if (el.type === 'text') fitText(el);
    this.lastSnap = this.snapshot(); // font arrival isn't an undoable change
    this.requestRender();
  }

  // ---------- element operations ----------
  /** Add elements centred in the visible part of the page. */
  add(els: El[], at?: { x: number; y: number }): void {
    const W = this.design.width, H = this.design.height;
    const vx = clamp(((this.cssW / 2) - this.panX) / this.zoom, 0, W), vy = clamp((((this.cssH - this.bottomInset) / 2) - this.panY) / this.zoom, 0, H);
    const cx = at?.x ?? vx, cy = at?.y ?? vy;
    const b = this.aabb(els)!;
    const stagger = (this.page.elements.length % 5) * W * 0.012;
    for (const el of els) { el.x += cx - (b.x + b.w / 2) + (at ? 0 : stagger); el.y += cy - (b.y + b.h / 2) + (at ? 0 : stagger); }
    this.page.elements.push(...els);
    this.setTool('select');
    this.select(els.map((e) => e.id));
    this.commit();
  }

  get unit(): number { return Math.min(this.design.width, this.design.height); }

  addText(kind: 'heading' | 'subheading' | 'body', opts: Partial<TextEl> = {}): void {
    const u = this.unit;
    const preset = {
      heading: { text: 'Add a heading', size: u * 0.09, weight: 800 },
      subheading: { text: 'Add a subheading', size: u * 0.055, weight: 600 },
      body: { text: 'Add a little bit of body text', size: u * 0.035, weight: 400 },
    }[kind];
    const el = makeText(preset.text, { size: Math.round(preset.size), weight: preset.weight, font: 'Poppins', w: this.design.width * 0.75, fill: '#1c1830', ...opts });
    this.add([el]);
    track('text');
  }

  addShape(kind: Parameters<typeof makeShape>[0]): void {
    const s = this.unit * 0.35;
    const el = makeShape(kind, { w: kind === 'arrow' ? s * 1.4 : s, h: kind === 'line' ? Math.max(6, s * 0.03) : kind === 'arrow' ? s * 0.6 : s, fill: kind === 'line' ? '#18171c' : '#d6336c', strokeWidth: kind === 'line' ? Math.max(4, s * 0.025) : 0 });
    this.add([el]);
  }

  addGraphic(art: string): void { this.add([makeGraphic(art, this.unit * 0.4)]); }
  addQr(text: string): void { this.add([makeQr(text, Math.round(this.unit * 0.3))]); }

  addEmoji(char: string): void { this.add([makeEmoji(char, this.unit * 0.2)]); track('sticker'); }

  addImage(assetId: string, src: string, iw: number, ih: number, at?: { x: number; y: number }): void {
    this.design.assets[assetId] = src;
    const max = this.unit * 0.6;
    const s = Math.min(max / iw, max / ih);
    this.add([makeImage(assetId, iw * s, ih * s)], at);
  }

  async addFiles(files: File[], at?: { x: number; y: number }): Promise<void> {
    const imgs = files.filter((f) => f.type.startsWith('image/'));
    if (!imgs.length) { toast('Pick an image file (JPG, PNG, GIF, WebP or SVG).', 'bad'); return; }
    const owner = accounts.current?.id ?? '';
    for (const f of imgs) {
      try {
        const { src, w, h: ih } = await fileToImageData(f);
        const id = uid('a_');
        await db.putUpload({ id, owner, src, w, h: ih, createdAt: Date.now() });
        this.addImage(id, src, w, ih, at);
        track('photo');
      } catch {
        toast(`Could not open ${f.name}`, 'bad');
      }
    }
    this.panels.refreshUploads();
  }

  setBackground(fill: Fill): void { this.page.background = fill; this.requestRender(); }

  setBackgroundPhoto(assetId: string | null, src?: string): void {
    if (assetId && src) { this.design.assets[assetId] = src; this.page.bgAsset = assetId; }
    else delete this.page.bgAsset;
    this.commit();
  }

  imageToBackground(el: ImageEl): void {
    this.page.bgAsset = el.asset;
    this.page.elements = this.page.elements.filter((e) => e !== el);
    this.select([]);
    this.commit();
  }

  groupMembers(g: string): string[] {
    return this.page.elements.filter((x) => x.group === g && !x.hidden).map((x) => x.id);
  }

  /** Can the selection be grouped (2+ items not already one group) / ungrouped (has grouped items)? */
  get canGroup(): boolean { const s = this.selected; return s.length > 1 && !(s[0].group && s.every((x) => x.group === s[0].group)); }
  get canUngroup(): boolean { return this.selected.some((x) => x.group); }

  group(): void {
    if (!this.canGroup) return;
    const g = uid('g_');
    for (const el of this.selected) el.group = g;
    this.commit();
    this.buildCtxBar();
    this.emit('select');
    toast('Grouped — they now move together. Click again to pick one item.', 'info', 2600);
  }

  ungroup(): void {
    if (!this.canUngroup) return;
    for (const el of this.selected) delete el.group;
    this.commit();
    this.buildCtxBar();
    this.emit('select');
  }

  deleteSelection(): void {
    const ids = new Set(this.selected.filter((e) => !e.locked).map((e) => e.id));
    if (!ids.size) { if (this.selected.length) toast('Unlock it first to delete', 'info'); return; }
    this.page.elements = this.page.elements.filter((e) => !ids.has(e.id));
    this.select(this.selection.filter((id) => !ids.has(id)));
    this.commit();
  }

  duplicate(): void {
    const sel = this.selected;
    if (!sel.length) return;
    const off = this.unit * 0.03;
    const copies = cloneEls(sel, off);
    copies.forEach((c) => (c.locked = false));
    this.page.elements.push(...copies);
    this.select(copies.map((c) => c.id));
    this.commit();
  }

  copy(): void {
    const sel = this.selected;
    if (!sel.length) return;
    const assets: Record<string, string> = {};
    for (const e of sel) if (e.type === 'image') assets[e.asset] = this.design.assets[e.asset];
    clipboard = { els: deepClone(sel), assets };
    toast(`Copied ${sel.length > 1 ? `${sel.length} items` : 'item'}`);
  }

  paste(): void {
    if (!clipboard) { toast('Nothing to paste yet'); return; }
    Object.assign(this.design.assets, clipboard.assets);
    const copies = cloneEls(clipboard.els, this.unit * 0.03);
    clipboard.els = copies.map((c) => deepClone(c));
    this.page.elements.push(...copies);
    this.select(copies.map((c) => c.id));
    this.commit();
  }

  reorder(dir: 'front' | 'back' | 'up' | 'down'): void {
    const els = this.page.elements;
    const sel = new Set(this.selection);
    if (!sel.size) return;
    if (dir === 'front') this.page.elements = [...els.filter((e) => !sel.has(e.id)), ...els.filter((e) => sel.has(e.id))];
    else if (dir === 'back') this.page.elements = [...els.filter((e) => sel.has(e.id)), ...els.filter((e) => !sel.has(e.id))];
    else if (dir === 'up') { for (let i = els.length - 2; i >= 0; i--) if (sel.has(els[i].id) && !sel.has(els[i + 1].id)) [els[i], els[i + 1]] = [els[i + 1], els[i]]; }
    else for (let i = 1; i < els.length; i++) if (sel.has(els[i].id) && !sel.has(els[i - 1].id)) [els[i], els[i - 1]] = [els[i - 1], els[i]];
    this.commit();
  }

  /** Align the selection to the page (one item) or to the selection box (several). */
  align(mode: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom'): void {
    const sel = this.selected.filter((e) => !e.locked);
    if (!sel.length) return;
    const ref = sel.length > 1 ? this.aabb(sel)! : { x: 0, y: 0, w: this.design.width, h: this.design.height };
    for (const el of sel) {
      const b = this.aabb([el])!;
      if (mode === 'left') el.x += ref.x - b.x;
      if (mode === 'center') el.x += ref.x + ref.w / 2 - (b.x + b.w / 2);
      if (mode === 'right') el.x += ref.x + ref.w - (b.x + b.w);
      if (mode === 'top') el.y += ref.y - b.y;
      if (mode === 'middle') el.y += ref.y + ref.h / 2 - (b.y + b.h / 2);
      if (mode === 'bottom') el.y += ref.y + ref.h - (b.y + b.h);
    }
    this.commit();
  }

  distribute(axis: 'x' | 'y'): void {
    const sel = this.selected.filter((e) => !e.locked);
    if (sel.length < 3) return;
    const boxes = sel.map((el) => ({ el, b: this.aabb([el])! })).sort((a, b) => (axis === 'x' ? a.b.x - b.b.x : a.b.y - b.b.y));
    const first = boxes[0].b, last = boxes[boxes.length - 1].b;
    const total = boxes.reduce((s, x) => s + (axis === 'x' ? x.b.w : x.b.h), 0);
    const span = axis === 'x' ? last.x + last.w - first.x : last.y + last.h - first.y;
    const gap = (span - total) / (boxes.length - 1);
    let pos = axis === 'x' ? first.x : first.y;
    for (const { el, b } of boxes) {
      if (axis === 'x') { el.x += pos - b.x; pos += b.w + gap; } else { el.y += pos - b.y; pos += b.h + gap; }
    }
    this.commit();
  }

  // ---------- pages ----------
  goToPage(i: number): void {
    this.finishTextEdit();
    this.pageIndex = clamp(i, 0, this.design.pages.length - 1);
    this.selection = [];
    this.emit('select'); this.emit('page'); this.buildCtxBar();
    this.renderPages();
    this.requestRender();
  }

  addPage(copyCurrent = false): void {
    const p = copyCurrent ? { ...deepClone(this.page), id: uid('p_'), elements: cloneEls(this.page.elements) } : newPage(typeof this.page.background === 'string' ? '#ffffff' : '#ffffff');
    this.design.pages.splice(this.pageIndex + 1, 0, p);
    this.commit();
    this.goToPage(this.pageIndex + 1);
  }

  deletePage(i = this.pageIndex): void {
    if (this.design.pages.length <= 1) { toast('A design needs at least one page'); return; }
    this.design.pages.splice(i, 1);
    this.commit();
    this.goToPage(Math.min(i, this.design.pages.length - 1));
  }

  movePage(i: number, dir: -1 | 1): void {
    const j = i + dir;
    const ps = this.design.pages;
    if (j < 0 || j >= ps.length) return;
    [ps[i], ps[j]] = [ps[j], ps[i]];
    this.commit();
    this.goToPage(j);
  }

  renderPages(): void {
    const strip = this.pagesStrip;
    strip.replaceChildren();
    const d = this.design;
    const ratio = d.width / d.height;
    const th = 44, tw = Math.max(26, Math.min(80, th * ratio));
    d.pages.forEach((p, i) => {
      const c = h('canvas', { width: String(Math.round(tw * 2)), height: String(Math.round(th * 2)) });
      const x = c.getContext('2d')!;
      x.scale((tw * 2) / d.width, (th * 2) / d.height);
      renderPage(x, d, p);
      const b = h('button', { class: `page-thumb ${i === this.pageIndex ? 'on' : ''}`, type: 'button', title: `Page ${i + 1}`, style: `width:${tw}px;height:${th}px` }, c, h('span', null, String(i + 1)));
      b.addEventListener('click', () => {
        if (i !== this.pageIndex) this.goToPage(i);
        else popMenu(b, [
          { label: 'Duplicate page', icon: 'copy', onClick: () => this.addPage(true) },
          { label: 'Move left', icon: 'back', onClick: () => this.movePage(i, -1) },
          { label: 'Move right', icon: 'play', onClick: () => this.movePage(i, 1) },
          { label: 'Delete page', icon: 'trash', danger: true, onClick: () => this.deletePage(i) },
        ]);
      });
      strip.append(b);
    });
    const add = h('button', { class: 'page-add', type: 'button', title: 'Add page', 'aria-label': 'Add page' }, icon('plus', 18));
    add.addEventListener('click', () => this.addPage());
    strip.append(add);
  }

  /** Change the canvas size, optionally scaling everything to fit. */
  resizeDesign(w: number, hh: number, scaleContent: boolean): void {
    w = Math.round(clamp(w, 16, 8000)); hh = Math.round(clamp(hh, 16, 8000));
    const d = this.design;
    if (scaleContent) {
      const s = Math.min(w / d.width, hh / d.height);
      const ox = (w - d.width * s) / 2, oy = (hh - d.height * s) / 2;
      for (const p of d.pages) for (const el of p.elements) {
        el.x = el.x * s + ox; el.y = el.y * s + oy; el.w *= s; el.h *= s;
        if (el.type === 'text') { el.size *= s; el.letterSpacing *= s; el.strokeWidth *= s; fitText(el); }
        if (el.type === 'draw') el.width *= s;
        if (el.type === 'shape') el.strokeWidth *= s;
        if (el.shadow) { el.shadow.blur *= s; el.shadow.x *= s; el.shadow.y *= s; }
      }
    }
    d.width = w; d.height = hh;
    this.root.querySelector('.ed-size')!.textContent = `${w} × ${hh} px`;
    this.commit();
    this.fit();
    this.renderPages();
  }

  /** Colours already used on this page, for quick reuse in the picker. */
  docColors(): string[] {
    const set = new Set<string>();
    const add = (f: Fill | string) => { if (typeof f === 'string') { if (f && !f.startsWith('rgba(0,0,0,0)')) set.add(f.toLowerCase()); } else f.stops.forEach((s) => set.add(s.color.toLowerCase())); };
    add(this.page.background);
    for (const el of this.page.elements) {
      if (el.type === 'shape' || el.type === 'text') add(el.fill);
      if (el.type === 'graphic') el.colors.forEach(add);
      if (el.type === 'draw') add(el.color);
    }
    return [...set];
  }

  // ---------- keyboard, clipboard & drop ----------
  private bindKeys(): void {
    const onKey = (e: KeyboardEvent) => {
      if (!this.root.isConnected || document.querySelector('.modal-backdrop')) return;
      if (e.key === ' ' && !isTyping(e.target)) { this.spaceDown = e.type === 'keydown'; if (e.type === 'keydown') e.preventDefault(); return; }
      if (e.type !== 'keydown' || isTyping(e.target)) return;
      const mod = e.metaKey || e.ctrlKey;
      const k = e.key.toLowerCase();
      if (mod && k === 'z') { e.preventDefault(); e.shiftKey ? this.redo() : this.undo(); return; }
      if (mod && k === 'y') { e.preventDefault(); this.redo(); return; }
      if (mod && k === 'd') { e.preventDefault(); this.duplicate(); return; }
      if (mod && k === 'g') { e.preventDefault(); if (e.shiftKey) this.ungroup(); else this.group(); return; }
      if (mod && k === 'c') { if (this.selection.length) { e.preventDefault(); this.copy(); } return; }
      if (mod && k === 'x') { if (this.selection.length) { e.preventDefault(); this.copy(); this.deleteSelection(); } return; }
      if (mod && k === 'a') { e.preventDefault(); this.select(this.page.elements.filter((x) => !x.hidden).map((x) => x.id)); return; }
      if (mod && k === 's') { e.preventDefault(); this.save.flush(); toast('Saved', 'good', 1200); return; }
      if (mod && (k === '=' || k === '+')) { e.preventDefault(); this.zoomBy(1.2); return; }
      if (mod && k === '-') { e.preventDefault(); this.zoomBy(1 / 1.2); return; }
      if (mod && k === '0') { e.preventDefault(); this.fit(); return; }
      if (mod && k === ']') { e.preventDefault(); this.reorder(e.shiftKey ? 'front' : 'up'); return; }
      if (mod && k === '[') { e.preventDefault(); this.reorder(e.shiftKey ? 'back' : 'down'); return; }
      if (k === 'delete' || k === 'backspace') { if (this.selection.length) { e.preventDefault(); this.deleteSelection(); } return; }
      if (k === 'escape') { if (this.tool !== 'select') this.setTool('select'); else this.select([]); return; }
      if (k === 'enter') { const s = this.selected; if (s.length === 1 && s[0].type === 'text') { e.preventDefault(); this.editText(s[0]); } return; }
      if (!mod && k === 't') { this.addText('heading'); return; }
      if (!mod && k === 'p') { this.panels.show('draw'); this.setTool('draw'); return; }
      if (!mod && k === 'v') { this.setTool('select'); return; }
      if (!mod && k === 'h') { this.setTool('hand'); return; }
      const arrows: Record<string, [number, number]> = { arrowleft: [-1, 0], arrowright: [1, 0], arrowup: [0, -1], arrowdown: [0, 1] };
      if (arrows[k] && this.selection.length) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        for (const el of this.selected) if (!el.locked) { el.x += arrows[k][0] * step; el.y += arrows[k][1] * step; }
        this.requestRender();
        this.nudgeCommit();
      }
    };
    const onPaste = (e: ClipboardEvent) => {
      if (!this.root.isConnected || isTyping(e.target)) return;
      const files = [...(e.clipboardData?.files ?? [])].filter((f) => f.type.startsWith('image/'));
      if (files.length) { e.preventDefault(); void this.addFiles(files); return; }
      if (clipboard) { e.preventDefault(); this.paste(); }
    };
    addEventListener('keydown', onKey);
    addEventListener('keyup', onKey);
    addEventListener('paste', onPaste);
    this.cleanup.push(() => { removeEventListener('keydown', onKey); removeEventListener('keyup', onKey); removeEventListener('paste', onPaste); });
  }

  private nudgeCommit = debounce(() => { this.commit(); this.props.refresh(); }, 400);

  private bindDrop(): void {
    const st = this.stage;
    st.addEventListener('dragover', (e) => { e.preventDefault(); st.classList.add('drop'); });
    st.addEventListener('dragleave', () => st.classList.remove('drop'));
    st.addEventListener('drop', (e) => {
      e.preventDefault();
      st.classList.remove('drop');
      const files = [...(e.dataTransfer?.files ?? [])];
      const p = this.toDesign(e.clientX, e.clientY);
      if (files.length) { void this.addFiles(files, { x: p.x, y: p.y }); return; }
      // drags from the side panels carry a JSON payload
      const raw = e.dataTransfer?.getData('application/x-fuzzies');
      if (raw) this.panels.dropPayload(JSON.parse(raw), { x: p.x, y: p.y });
    });
  }
}
