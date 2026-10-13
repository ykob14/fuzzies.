/**
 * Shared controls for the top-down mini-games: a virtual joystick for touch (appears where the thumb lands on the
 * left/any part of the screen, with a dead zone and a soft rim), plus WASD/arrow keys, and an optional "mouse steer"
 * (hold the mouse button to walk towards the pointer). `read()` gives a camera-relative vector (x right, z down the screen)
 * in −1…1. Call `destroy()` when the game ends.
 */
export interface Controls {
  /** the input vector this frame (screen-relative: +x right, +z towards the bottom of the screen) */
  read(): { x: number; z: number };
  /** true while an action key/button is held (Space / E / the Chop button) — games poll or listen via `onAction` */
  action: boolean;
  onAction: (() => void) | null;
  destroy(): void;
}

export function mountControls(root: HTMLElement, opts: { touch: boolean; mouseSteer?: boolean; actionKeys?: string[] }): Controls {
  const keys = new Set<string>();
  const ctl: Controls = { read, action: false, onAction: null, destroy };
  const actionKeys = opts.actionKeys ?? [' ', 'e', 'enter'];
  // ---- keyboard ----
  const onKey = (e: KeyboardEvent, down: boolean) => {
    const k = e.key.toLowerCase();
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) { e.preventDefault(); if (down) keys.add(k); else keys.delete(k); }
    if (actionKeys.includes(k)) { e.preventDefault(); if (down && !e.repeat) { ctl.action = true; ctl.onAction?.(); } if (!down) ctl.action = false; }
  };
  const kd = (e: KeyboardEvent) => onKey(e, true), ku = (e: KeyboardEvent) => onKey(e, false);
  addEventListener('keydown', kd); addEventListener('keyup', ku);
  // ---- joystick (touch) ----
  const pad = document.createElement('div'); pad.className = 'joy'; pad.hidden = true;
  const knob = document.createElement('div'); knob.className = 'joy-knob'; pad.append(knob);
  root.append(pad);
  let stick: { id: number; ox: number; oy: number; x: number; y: number } | null = null;
  let mouse: { x: number; y: number } | null = null;
  const R = 56; // knob travel in px
  const onDown = (e: PointerEvent) => {
    if ((e.target as HTMLElement).closest('button, .race-pause, .mg-btn')) return;
    if (e.pointerType === 'mouse') { if (opts.mouseSteer) { mouse = { x: e.clientX, y: e.clientY }; root.setPointerCapture(e.pointerId); } return; }
    if (stick) return;
    stick = { id: e.pointerId, ox: e.clientX, oy: e.clientY, x: 0, y: 0 };
    root.setPointerCapture(e.pointerId);
    pad.hidden = false; pad.style.left = `${e.clientX}px`; pad.style.top = `${e.clientY}px`; knob.style.transform = 'translate(-50%, -50%)';
  };
  const onMove = (e: PointerEvent) => {
    if (mouse && e.pointerType === 'mouse') { mouse.x = e.clientX; mouse.y = e.clientY; return; }
    if (!stick || e.pointerId !== stick.id) return;
    let dx = e.clientX - stick.ox, dy = e.clientY - stick.oy;
    const l = Math.hypot(dx, dy);
    if (l > R) { dx *= R / l; dy *= R / l; }
    stick.x = dx / R; stick.y = dy / R;
    knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  };
  const onUp = (e: PointerEvent) => {
    if (mouse && e.pointerType === 'mouse') { mouse = null; return; }
    if (stick && e.pointerId === stick.id) { stick = null; pad.hidden = true; }
  };
  root.addEventListener('pointerdown', onDown);
  root.addEventListener('pointermove', onMove);
  root.addEventListener('pointerup', onUp);
  root.addEventListener('pointercancel', onUp);
  function read(): { x: number; z: number } {
    let x = (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0);
    let z = (keys.has('s') || keys.has('arrowdown') ? 1 : 0) - (keys.has('w') || keys.has('arrowup') ? 1 : 0);
    if (stick) {
      const l = Math.hypot(stick.x, stick.y);
      if (l > 0.12) { const k = Math.min(1, (l - 0.12) / 0.88) / l; x = stick.x * k; z = stick.y * k; }
    } else if (mouse) {
      // walk towards the pointer, measured from the middle of the view (the Fuzzy is kept there by the camera)
      const r = root.getBoundingClientRect();
      const dx = mouse.x - (r.left + r.width / 2), dy = mouse.y - (r.top + r.height / 2), l = Math.hypot(dx, dy);
      if (l > 24) { const k = Math.min(1, (l - 24) / 120); x = dx / l * k; z = dy / l * k; }
    }
    return { x, z };
  }
  function destroy(): void {
    removeEventListener('keydown', kd); removeEventListener('keyup', ku);
    root.removeEventListener('pointerdown', onDown); root.removeEventListener('pointermove', onMove); root.removeEventListener('pointerup', onUp); root.removeEventListener('pointercancel', onUp);
    pad.remove();
  }
  return ctl;
}
