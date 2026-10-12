/**
 * Fuzzies Land tutorial — the presentation. The logic is the TutorialManager (land/tutorial.ts).
 *
 * - Welcome and finale: a short scene in the middle of the town (soft vignette, Pip pops in, one line, one button).
 * - Every other step: Pip with a small speech bubble that finds free space next to what to do, a soft glow ring and a
 *   tap ripple on the control or building. When a step is done: Pip cheers, sparkles burst where you acted, a chime.
 * - Never blocks the game: the layer ignores taps except Pip's bubble; targets are found live every frame (no fixed
 *   coordinates); with no free space Pip waits as a little button; "⋯" holds hide / skip.
 */
import { h, btn } from './dom';
import { mascot, mascotDo } from './mascot';
import { sfx } from '../game/sound';
import type { TutorialManager, Reward } from '../land/tutorial';

export interface TutTarget {
  /** an on-screen control to point at */
  el?: Element | null;
  /** or a spot in the stage (e.g. a building in the 3D town), stage coordinates */
  point?: { x: number; y: number } | null;
  /** radius of the ring around a point */
  r?: number;
  /** what to do right now (what Pip says) */
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
  /** things it should rather not cover (the top bar first, then side buttons) */
  keepSoft?: () => (Element | null)[];
  reduceMotion: boolean;
  sound: () => boolean;
  /** a step was done here (stage coordinates, or null): the screen can send coins / stars flying */
  onCelebrate?: (at: { x: number; y: number } | null, r?: Reward) => void;
  /** the welcome scene was closed: a good moment for a camera move */
  onWelcomeDone?: () => void;
  /** the player is busy with something (a panel, placing, another card): the welcome / finale scene waits */
  busy?: () => boolean;
}): { refresh(): void; destroy(): void } {
  const { stage, tut } = o;
  const play = (f: () => unknown) => { if (o.sound()) { try { f(); } catch { /* audio not ready */ } } };

  const layer = h('div', { class: 'tut-layer', 'aria-live': 'polite' });
  const ring = h('div', { class: 'tut-ring', hidden: true });
  const tap = h('div', { class: 'tut-tap', hidden: true }, h('i'), h('i'));
  // the guide: Pip + speech bubble
  const pip = mascot(58, { sparkles: false, interactive: false });
  const say = h('p', { class: 'tut-say' });
  const label = h('small', { class: 'tut-label' });
  const checks = h('div', { class: 'tut-checks' });
  const menuBtn = h('button', { class: 'tut-more', type: 'button', title: 'More', 'aria-label': 'Tutorial options', 'aria-haspopup': 'menu' }, h('i'), h('i'), h('i'));
  const menu = h('div', { class: 'tut-menu', role: 'menu', hidden: true });
  const bubble = h('div', { class: 'tut-bubble' }, label, say, checks, menuBtn, menu);
  const guide = h('div', { class: 'tut-guide', role: 'dialog', 'aria-label': 'Fuzzies Land tutorial' }, h('span', { class: 'tut-pip' }, pip), bubble);
  const mini = h('button', { class: 'tut-mini', type: 'button', hidden: true, title: 'Show the tip', 'aria-label': 'Show the tutorial tip' }, mascot(48, { sparkles: false, interactive: false }), h('b', null, '!'));
  // the welcome / finale scene
  const heroPip = mascot(112, { sparkles: true, interactive: false });
  const heroTitle = h('h2', { class: 'tut-hero-title' });
  const heroText = h('p', { class: 'tut-hero-text' });
  const heroBtn = h('div', { class: 'tut-hero-btn' });
  const heroSkip = h('button', { class: 'tut-hero-skip', type: 'button' }, 'Skip tutorial');
  const hero = h('div', { class: 'tut-hero', hidden: true }, h('div', { class: 'tut-hero-card', role: 'dialog' }, h('div', { class: 'tut-hero-pip' }, heroPip), heroTitle, heroText, heroBtn, heroSkip));
  layer.append(ring, tap, guide, mini, hero);
  stage.append(layer);

  let folded = false, squeezed = false, peek = false, confirmSkip = false, shown = '', raf = 0, lastPlace = 0, alive = true;
  let scrolledTo: Element | null = null;
  let lastCenter: { x: number; y: number } | null = null;
  let heroFor = '';

  // ---------- content ----------
  function render(): void {
    if (!tut.active) { layer.hidden = true; return; }
    layer.hidden = false;
    const st = tut.step;
    if (st.button) {
      // welcome / finale: the scene in the middle of town
      guide.hidden = true; mini.hidden = true; ring.hidden = true; tap.hidden = true;
      if (heroFor !== st.id) {
        heroFor = st.id;
        hero.hidden = false;
        hero.classList.remove('out'); void hero.offsetWidth; hero.classList.add('in');
        heroTitle.textContent = st.title;
        heroText.textContent = st.text;
        heroBtn.replaceChildren(btn(st.button, { kind: 'primary', size: 'lg', onClick: () => {
          play(() => sfx.boing());
          hero.classList.add('out');
          setTimeout(() => { tut.emit('continue'); if (st.id === 'welcome') o.onWelcomeDone?.(); }, o.reduceMotion ? 0 : 260);
        } }));
        heroSkip.hidden = st.id !== 'welcome';
        setTimeout(() => { mascotDo(heroPip, 'wave'); play(() => sfx.shimmer()); }, o.reduceMotion ? 0 : 450);
      }
      return;
    }
    hero.hidden = true; heroFor = '';
    const t = o.target();
    shown = t?.hint ?? '';
    label.textContent = `${tut.index}/${tut.total - 1} · ${st.title}`;
    say.textContent = shown || st.text;
    checks.replaceChildren(...(st.checks ?? []).map((c) => h('span', { class: tut.has(c.key) ? 'done' : '' }, h('i', null, tut.has(c.key) ? '✓' : ''), c.label)));
    checks.hidden = !st.checks;
    paintMenu();
    paintFold();
  }
  function paintMenu(): void {
    const st = tut.step;
    const item = (text: string, onClick: () => void, cls = '') => { const b = h('button', { class: `tut-menu-i ${cls}`, type: 'button', role: 'menuitem' }, text); b.addEventListener('click', onClick); return b; };
    menu.replaceChildren(...[
      item('Hide tips', () => { menu.hidden = true; folded = true; paintFold(); }),
      st.optional ? item('Skip this step', () => { menu.hidden = true; tut.skipStep(); }) : null,
      item(confirmSkip ? 'Tap again to skip all' : 'Skip tutorial', () => { if (!confirmSkip) { confirmSkip = true; paintMenu(); return; } confirmSkip = false; menu.hidden = true; tut.skipAll(); }, 'quiet'),
    ].filter((x) => x !== null) as HTMLElement[]);
  }
  menuBtn.addEventListener('click', (e) => { e.stopPropagation(); confirmSkip = false; paintMenu(); menu.hidden = !menu.hidden; const g = guide.getBoundingClientRect(), st = stage.getBoundingClientRect(); menu.classList.toggle('up', g.top - st.top > 150); });
  heroSkip.addEventListener('click', () => { if (heroSkip.dataset.sure) { tut.skipAll(); return; } heroSkip.dataset.sure = '1'; heroSkip.textContent = 'Tap again to skip'; });
  function paintFold(): void {
    const small = folded || (squeezed && !peek);
    guide.hidden = small || !!tut.step.button;
    mini.hidden = !small || !!tut.step.button;
  }
  mini.addEventListener('click', () => { folded = false; peek = squeezed; paintFold(); mascotDo(pip, 'wave'); place(true); });

  /** A step was done: Pip cheers, sparkles pop where you acted, a chime. */
  function cheer(r?: Reward): void {
    mascotDo(pip, 'cheer');
    play(() => sfx.twinkle());
    if (r?.coins) setTimeout(() => play(() => sfx.coins()), 250);
    const at = lastCenter;
    if (at && !o.reduceMotion) {
      const pop = h('div', { class: 'tut-pop', style: `left:${at.x}px; top:${at.y}px` }, ...Array.from({ length: 10 }, (_, i) => h('i', { style: `--a:${i * 36}deg; --d:${38 + (i % 3) * 14}px; --c:${['#ffd34d', '#ff8fbf', '#ffffff', '#9be38a'][i % 4]}` })));
      stage.append(pop);
      setTimeout(() => pop.remove(), 900);
    }
    o.onCelebrate?.(at, r);
  }

  // ---------- where things go ----------
  const toStage = (r: DOMRect, s: DOMRect): Box => ({ x: r.left - s.left, y: r.top - s.top, w: r.width, h: r.height });
  function place(force = false): void {
    if (!tut.active) return;
    if (tut.step.button) { hero.hidden = !!o.busy?.(); return; } // the scene never sits on top of an open panel

    const s = stage.getBoundingClientRect();
    const t = o.target();
    if ((t?.hint ?? '') !== shown) render();
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
    if (T && (T.x + T.w < 0 || T.y + T.h < 0 || T.x > s.width || T.y > s.height)) T = null;
    if (T) {
      lastCenter = { x: T.x + T.w / 2, y: T.y + T.h / 2 };
      const pad = t?.el ? 5 : 0;
      ring.hidden = false;
      ring.classList.toggle('round', !t?.el);
      Object.assign(ring.style, { left: `${T.x - pad}px`, top: `${T.y - pad}px`, width: `${T.w + pad * 2}px`, height: `${T.h + pad * 2}px` });
      tap.hidden = false;
      tap.style.transform = `translate(${Math.round(lastCenter.x)}px, ${Math.round(lastCenter.y)}px)`;
    } else { ring.hidden = true; tap.hidden = true; }
    if (folded && !force) { placeMini(s); return; }
    const wasHidden = guide.hidden;
    if (wasHidden) guide.hidden = false; // measure it even while it's tucked away
    const bw = guide.offsetWidth || 280, bh = guide.offsetHeight || 90, M = 10;
    const boxes = (list: (Element | null)[]) => list.filter((e): e is Element => !!e && (e as HTMLElement).isConnected && !(e as HTMLElement).hidden)
      .map((e) => toStage(e.getBoundingClientRect(), s)).filter((b) => b.w && b.h);
    const hard = boxes(o.keepClear()), soft = boxes(o.keepSoft?.() ?? []);
    const clamp = (x: number, y: number): Box => ({ x: Math.max(M, Math.min(s.width - bw - M, x)), y: Math.max(M, Math.min(s.height - bh - M, y)), w: bw, h: bh });
    const cands: Box[] = [];
    if (T) {
      const cx = T.x + T.w / 2 - bw / 2, cy = T.y + T.h / 2 - bh / 2, G = 26;
      cands.push(clamp(cx, T.y + T.h + G), clamp(cx, T.y - bh - G), clamp(T.x + T.w + G, cy), clamp(T.x - bw - G, cy));
    }
    const topBar = soft[0];
    if (topBar) cands.push(clamp((s.width - bw) / 2, topBar.y + topBar.h + 10));
    cands.push(clamp((s.width - bw) / 2, s.height * 0.16), clamp((s.width - bw) / 2, (s.height - bh) / 2), clamp((s.width - bw) / 2, s.height - bh - s.height * 0.2));
    for (const y of [T ? T.y + T.h / 2 - bh / 2 : (s.height - bh) / 2, s.height * 0.2]) cands.push(clamp(M, y), clamp(s.width - bw - M, y));
    let best = cands[0], score = Infinity, blocked = true;
    cands.forEach((c, i) => {
      const onTarget = T ? overlap(c, { x: T.x - 10, y: T.y - 10, w: T.w + 20, h: T.h + 20 }) : 0;
      const onHard = hard.reduce((a, b) => a + overlap(c, b), 0);
      const onUi = onHard * 20 + soft.reduce((a, b) => a + overlap(c, b), 0);
      const dist = T ? Math.hypot(c.x + bw / 2 - (T.x + T.w / 2), c.y + bh / 2 - (T.y + T.h / 2)) : 0;
      const sc = onTarget * 50 + onUi * 2 + dist * 0.5 + i; // never cover the target; then stay off panels; then stay close
      if (sc < score) { score = sc; best = c; blocked = onTarget > 0 || onHard > 0; }
    });
    // nowhere free (e.g. a big panel is open on a phone): Pip waits as a little button instead of covering anything
    if (blocked !== squeezed) { squeezed = blocked; if (!squeezed) peek = false; }
    guide.hidden = wasHidden;
    paintFold();
    if (!guide.hidden) guide.style.transform = `translate(${Math.round(best.x)}px, ${Math.round(best.y)}px)`;
    else placeMini(s, hard);
    if (import.meta.env.DEV) (window as unknown as { __tutPlace: unknown }).__tutPlace = { at: performance.now(), best, score, blocked, T };
  }
  /** The little Pip button: just under the top bar on the left, clear of panels. */
  function placeMini(s: DOMRect, hard: Box[] = []): void {
    const top = (o.keepSoft?.()[0] as HTMLElement | null)?.getBoundingClientRect();
    let y = top ? top.bottom - s.top + 10 : 80;
    for (const b of hard) if (b.x < 80 && y + 60 > b.y && y < b.y + b.h) y = Math.max(10, b.y - 70);
    Object.assign(mini.style, { left: '12px', top: `${y}px` });
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
    if (ev.type === 'progress') { mascotDo(pip, 'hop'); play(() => sfx.hop()); }
    if (ev.type === 'finished' || ev.type === 'skipped' || ev.type === 'step' || ev.type === 'progress') {
      confirmSkip = false; folded = false; peek = false; menu.hidden = true;
      render(); place(true);
      if (ev.type === 'step' && !tut.step.button) setTimeout(() => mascotDo(pip, 'wave'), 350);
    }
  });
  // tapping anywhere else closes the "⋯" menu
  const closeMenu = (e: Event) => { if (!menu.hidden && !bubble.contains(e.target as Node)) menu.hidden = true; };
  addEventListener('pointerdown', closeMenu, true);
  render();
  requestAnimationFrame(() => place(true));
  raf = requestAnimationFrame(loop);

  return {
    refresh: () => { heroFor = ''; render(); place(true); },
    destroy: () => { alive = false; cancelAnimationFrame(raf); off(); removeEventListener('pointerdown', closeMenu, true); layer.remove(); },
  };
}
