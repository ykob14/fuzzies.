/**
 * Fuzzies Land tutorial — the presentation: Pip (the mascot) in a speech bubble, a soft highlight ring around the control or
 * building to use next, and a small arrow. The logic is the TutorialManager (land/tutorial.ts).
 *
 * - Nothing here blocks the game: the layer ignores taps except on the bubble itself.
 * - Targets are found every frame from the live UI (an element, or a building's spot on screen) — never fixed coordinates.
 * - The bubble picks the free space around the target (never on top of it, and away from open panels and bars), and can
 *   be folded down to a little Pip button if it's ever in the way.
 */
import { h, btn } from './dom';
import { mascot } from './mascot';
import { sfx } from '../game/sound';
import { STEPS, type TutorialManager, type Reward } from '../land/tutorial';

export interface TutTarget {
  /** an on-screen control to point at */
  el?: Element | null;
  /** or a spot in the stage (e.g. a building in the 3D town), stage coordinates */
  point?: { x: number; y: number } | null;
  /** radius of the ring around a point */
  r?: number;
  /** what to do right now (shown under the step text) */
  hint?: string;
}

interface Box { x: number; y: number; w: number; h: number }
const overlap = (a: Box, b: Box) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));

export function mountTutorial(o: {
  stage: HTMLElement;
  tut: TutorialManager;
  target: () => TutTarget | null;
  /** controls the bubble must never cover (toolbar, open panels, the place bar) */
  keepClear: () => (Element | null)[];
  /** things it should rather not cover (the top bar, side buttons) */
  keepSoft?: () => (Element | null)[];
  reduceMotion: boolean;
  sound: () => boolean;
}): { refresh(): void; destroy(): void } {
  const { stage, tut } = o;
  const layer = h('div', { class: 'tut-layer', 'aria-live': 'polite' });
  const ring = h('div', { class: 'tut-ring', hidden: true });
  const arrow = h('div', { class: 'tut-arrow', hidden: true }, h('span', null));
  const bubble = h('div', { class: 'tut-bubble', role: 'dialog', 'aria-label': 'Fuzzies Land tutorial' });
  const mini = h('button', { class: 'tut-mini', type: 'button', hidden: true, title: 'Show Pip’s tip', 'aria-label': 'Show the tutorial tip' }, mascot(46, { sparkles: false, interactive: false }));
  layer.append(ring, arrow, bubble, mini);
  stage.append(layer);

  // folded = the player tucked Pip away; squeezed = no free space right now (Pip waits as a little button until there is)
  let folded = false, squeezed = false, peek = false, confirmSkip = false, hintShown = '', raf = 0, lastPlace = 0, alive = true;
  let scrolledTo: Element | null = null;
  const pip = mascot(54, { sparkles: true, interactive: false });

  function render(): void {
    if (!tut.active) { layer.hidden = true; return; }
    layer.hidden = false;
    const st = tut.step;
    const t = o.target();
    hintShown = t?.hint ?? '';
    const checks = st.checks ? h('ul', { class: 'tut-checks' }, ...st.checks.map((c) => h('li', { class: tut.has(c.key) ? 'done' : '' }, h('i', null, tut.has(c.key) ? '✓' : ''), c.label))) : null;
    const actions: HTMLElement[] = [];
    if (st.button) actions.push(btn(st.button, { kind: 'primary', size: 'sm', onClick: () => tut.emit('continue') }));
    if (st.optional) actions.push(btn('Skip this step', { kind: 'ghost', size: 'sm', onClick: () => tut.skipStep() }));
    const fold = h('button', { class: 'tut-fold', type: 'button', title: 'Fold Pip away (tap Pip to bring the tip back)', 'aria-label': 'Fold the tip away' }, '–');
    fold.addEventListener('click', () => { folded = true; paintFold(); });
    const skip = h('button', { class: 'link small tut-skip', type: 'button' }, confirmSkip ? 'Yes, skip the tutorial' : 'Skip tutorial');
    skip.addEventListener('click', () => {
      if (!confirmSkip) { confirmSkip = true; render(); return; }
      confirmSkip = false; tut.skipAll();
    });
    const keep = confirmSkip ? h('button', { class: 'link small', type: 'button' }, 'Keep going') : null;
    keep?.addEventListener('click', () => { confirmSkip = false; render(); });
    bubble.classList.toggle('welcome', st.id === 'welcome' || st.id === 'next');
    bubble.replaceChildren(...[
      h('div', { class: 'tut-head' }, h('span', { class: 'tut-pip' }, pip), h('div', null,
        h('small', { class: 'tut-count' }, `Step ${tut.index + 1} of ${tut.total}`),
        h('b', { class: 'tut-title' }, st.title)), fold),
      h('p', { class: 'tut-text' }, st.text),
      checks,
      hintShown ? h('p', { class: 'tut-hint' }, h('span', { class: 'tut-hint-dot' }), hintShown) : null,
      h('div', { class: 'tut-dots', 'aria-hidden': 'true' }, ...STEPS.map((_, i) => h('i', { class: i < tut.index ? 'done' : i === tut.index ? 'now' : '' }))),
      actions.length ? h('div', { class: 'tut-actions' }, ...actions) : null,
      h('div', { class: 'tut-foot' }, skip, keep)].filter((x) => x !== null) as HTMLElement[]);
    paintFold();
  }
  function paintFold(): void {
    const small = folded || (squeezed && !peek);
    bubble.hidden = small;
    mini.hidden = !small;
  }
  mini.addEventListener('click', () => { folded = false; peek = squeezed; paintFold(); place(true); });

  /** A short "+30 coins" cheer where the bubble is, when a step is done. */
  function cheer(r?: Reward): void {
    if (o.sound()) { try { sfx.twinkle(); } catch { /* audio not ready */ } }
    const parts = r ? [r.coins ? `+${r.coins} coins` : '', r.xp ? `+${r.xp} XP` : '', r.fuzzies ? `+${r.fuzzies} Fuzzies` : ''].filter(Boolean) : [];
    const el = h('div', { class: 'tut-cheer' }, h('b', null, 'Nice!'), parts.length ? h('span', null, parts.join(' · ')) : null);
    const b = bubble.hidden ? mini.getBoundingClientRect() : bubble.getBoundingClientRect(), s = stage.getBoundingClientRect();
    el.style.left = `${b.left - s.left + b.width / 2}px`; el.style.top = `${b.top - s.top}px`;
    stage.append(el);
    setTimeout(() => el.remove(), o.reduceMotion ? 1200 : 1600);
  }

  // ---------- where things go ----------
  const toStage = (r: DOMRect, s: DOMRect): Box => ({ x: r.left - s.left, y: r.top - s.top, w: r.width, h: r.height });
  function place(force = false): void {
    if (!tut.active) return;
    const s = stage.getBoundingClientRect();
    const t = o.target();
    // the hint can change as you go (e.g. "now tap Build here"): update the text only when it really changed
    if ((t?.hint ?? '') !== hintShown) render();
    let T: Box | null = null;
    if (t?.el && (t.el as HTMLElement).isConnected) {
      let r = t.el.getBoundingClientRect();
      // inside a panel but scrolled out of sight (small screens): scroll it into view, once per new target
      if (r.width && r.height && (r.bottom > s.bottom - 4 || r.top < s.top + 4) && scrolledTo !== t.el) {
        scrolledTo = t.el;
        t.el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: o.reduceMotion ? 'auto' : 'smooth' });
        r = t.el.getBoundingClientRect();
      }
      if (r.width && r.height) T = toStage(r, s);
    } else if (t?.point) {
      const rr = t.r ?? 34;
      T = { x: t.point.x - rr, y: t.point.y - rr, w: rr * 2, h: rr * 2 };
    }
    // keep the target on screen to count it
    if (T && (T.x + T.w < 0 || T.y + T.h < 0 || T.x > s.width || T.y > s.height)) T = null;
    if (T) {
      ring.hidden = false;
      const pad = t?.el ? 6 : 0;
      ring.classList.toggle('round', !t?.el);
      Object.assign(ring.style, { left: `${T.x - pad}px`, top: `${T.y - pad}px`, width: `${T.w + pad * 2}px`, height: `${T.h + pad * 2}px` });
    } else ring.hidden = true;
    if (folded && !force) { placeMini(s); placeArrow(T, mini.getBoundingClientRect(), s); return; }
    const wasHidden = bubble.hidden;
    if (wasHidden) bubble.hidden = false; // measure it even while it's tucked away
    const bw = bubble.offsetWidth || 300, bh = bubble.offsetHeight || 160, M = 10;
    const boxes = (list: (Element | null)[]) => list.filter((e): e is Element => !!e && (e as HTMLElement).isConnected && !(e as HTMLElement).hidden)
      .map((e) => toStage(e.getBoundingClientRect(), s)).filter((b) => b.w && b.h);
    const hard = boxes(o.keepClear()), soft = boxes(o.keepSoft?.() ?? []);
    const clamp = (x: number, y: number): Box => ({ x: Math.max(M, Math.min(s.width - bw - M, x)), y: Math.max(M, Math.min(s.height - bh - M, y)), w: bw, h: bh });
    const cands: Box[] = [];
    if (T) {
      const cx = T.x + T.w / 2 - bw / 2, cy = T.y + T.h / 2 - bh / 2, G = 50; // room for the arrow between them
      cands.push(clamp(cx, T.y + T.h + G), clamp(cx, T.y - bh - G), clamp(T.x + T.w + G, cy), clamp(T.x - bw - G, cy));
    }
    cands.push(clamp((s.width - bw) / 2, s.height * 0.16), clamp((s.width - bw) / 2, (s.height - bh) / 2), clamp((s.width - bw) / 2, s.height - bh - s.height * 0.2), clamp(M, s.height * 0.16), clamp(s.width - bw - M, s.height * 0.16));
    // the left and right edges (beside a centred panel on wide screens)
    for (const y of [T ? T.y + T.h / 2 - bh / 2 : (s.height - bh) / 2, s.height * 0.2]) cands.push(clamp(M, y), clamp(s.width - bw - M, y));
    // also just under the top bar
    const topBar = soft[0];
    if (topBar) cands.push(clamp((s.width - bw) / 2, topBar.y + topBar.h + 8));
    let best = cands[0], score = Infinity, blocked = true;
    cands.forEach((c, i) => {
      const onTarget = T ? overlap(c, { x: T.x - 12, y: T.y - 12, w: T.w + 24, h: T.h + 24 }) : 0;
      const onHard = hard.reduce((a, b) => a + overlap(c, b), 0);
      const onUi = onHard * 20 + soft.reduce((a, b) => a + overlap(c, b), 0);
      const dist = T ? Math.hypot(c.x + bw / 2 - (T.x + T.w / 2), c.y + bh / 2 - (T.y + T.h / 2)) : 0;
      const sc = onTarget * 50 + onUi * 2 + dist * 0.5 + i; // never cover the target; then stay off panels; then stay close
      if (sc < score) { score = sc; best = c; blocked = onTarget > 0 || onHard > 0; }
    });
    // nowhere free (e.g. a big panel is open on a phone): Pip waits as a little button instead of covering anything
    if (blocked !== squeezed) { squeezed = blocked; if (!squeezed) peek = false; }
    bubble.hidden = wasHidden;
    paintFold();
    if (!bubble.hidden) bubble.style.transform = `translate(${Math.round(best.x)}px, ${Math.round(best.y)}px)`;
    else placeMini(s, hard);
    placeArrow(T, bubble.hidden ? mini.getBoundingClientRect() : null, s, bubble.hidden ? undefined : best);
    if (import.meta.env.DEV) (window as unknown as { __tutPlace: unknown }).__tutPlace = { at: performance.now(), best, score, blocked, T };
  }
  /** The little Pip button: just under the top bar on the left, clear of panels. */
  function placeMini(s: DOMRect, hard: Box[] = []): void {
    const top = (o.keepSoft?.()[0] as HTMLElement | null)?.getBoundingClientRect();
    let y = top ? top.bottom - s.top + 10 : 80;
    for (const b of hard) if (b.x < 80 && y + 60 > b.y && y < b.y + b.h) y = Math.max(10, b.y - 70);
    Object.assign(mini.style, { left: '12px', top: `${y}px`, right: 'auto', bottom: 'auto' });
  }
  /** A small arrow just outside the target, pointing at it from the bubble's side. */
  function placeArrow(T: Box | null, from: DOMRect | null, s: DOMRect, b?: Box): void {
    if (!T) { arrow.hidden = true; return; }
    const src = b ? { x: b.x + b.w / 2, y: b.y + b.h / 2 } : from ? { x: from.left - s.left + from.width / 2, y: from.top - s.top + from.height / 2 } : null;
    if (!src) { arrow.hidden = true; return; }
    const tx = T.x + T.w / 2, ty = T.y + T.h / 2;
    const ang = Math.atan2(ty - src.y, tx - src.x);
    const reach = Math.max(T.w, T.h) / 2 + 12;
    arrow.hidden = false;
    arrow.style.transform = `translate(${tx - Math.cos(ang) * reach}px, ${ty - Math.sin(ang) * reach}px) rotate(${ang}rad)`;
  }
  const loop = () => {
    if (!alive) return;
    raf = requestAnimationFrame(loop);
    // ~20 times a second follows the camera (time-based, so slow phones drawing few frames still keep up)
    const now = performance.now();
    if (tut.active && now - lastPlace >= 50) { lastPlace = now; try { place(); } catch (e) { console.warn('tutorial', e); } }
  };

  const off = tut.on((ev) => {
    if (ev.type === 'complete') cheer(ev.reward);
    if (ev.type === 'finished' || ev.type === 'skipped' || ev.type === 'step' || ev.type === 'progress') { confirmSkip = false; folded = false; peek = false; render(); place(true); }
    if (ev.type === 'progress' && o.sound()) { try { sfx.hop(); } catch { /* */ } }
  });
  render();
  requestAnimationFrame(() => place(true));
  raf = requestAnimationFrame(loop);

  return {
    refresh: () => { render(); place(true); },
    destroy: () => { alive = false; cancelAnimationFrame(raf); off(); layer.remove(); },
  };
}
