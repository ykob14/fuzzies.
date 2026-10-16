/**
 * Fuzzy Pass — the free 50-level reward track. A long scrollable road: a winding vertical timeline on phones and tablets, a horizontal
 * track on wide screens. Tap a reward to claim it; the level you are on is highlighted and scrolled into view. Everything is read from
 * the save (store.ts) and the data (pass.ts, characters.ts, cosmetics.ts) — this file only draws and calls store.claimPass / claimAllPass.
 */
import { h, btn, icon, modal, toast } from '../../ui/dom';
import type { PanelOpen } from '../hub';
import { PASS_LEVELS, PASS_TRACK, XP, xpToReach, type PassReward } from '../pass';
import { CHARACTER_BY_ID, RARITY_COLOR, type CharacterDef } from '../characters';
import { COSMETIC_BY_ID, SLOT_NAME, type CosmeticDef } from '../cosmetics';
import { claimAllPass, claimPass, coins, equipCosmetic, hasCharacter, hasCosmetic, passClaimable, passInfo, save } from '../store';
import { coinAmount, coinMark, rarityTag } from './kit';
import { characterPortrait, cosmeticBadge } from './portrait';
import './pass.css';

const GOLD = '#f5b014';
const reduced = (): boolean => document.documentElement.dataset.motion === 'reduce';

type NodeState = 'locked' | 'claimable' | 'claimed';

export const open: PanelOpen = (ctx, focus) => {
  const stateOf = (level: number): NodeState => (save().passClaimed.includes(level) ? 'claimed' : level <= passInfo().level ? 'claimable' : 'locked');
  const defs = (r: PassReward): { ch: CharacterDef | null; co: CosmeticDef | null } => ({ ch: r.character ? CHARACTER_BY_ID[r.character] ?? null : null, co: r.cosmetic ? COSMETIC_BY_ID[r.cosmetic] ?? null : null });
  const colorOf = (r: PassReward): string => { const { ch, co } = defs(r); return ch ? RARITY_COLOR[ch.rarity] : co ? RARITY_COLOR[co.rarity] : r.level % 5 === 0 ? GOLD : 'var(--border)'; };

  // ───────── header ─────────
  const lvNum = h('b', null, '1');
  const lvBadge = h('div', { class: 'px-lvl', 'aria-hidden': 'true' }, h('span', { class: 'px-lvl-in' }, lvNum, h('small', null, 'LEVEL')));
  const xpText = h('b', null, '');
  const xpSub = h('small', { class: 'px-xp-sub' }, '');
  const xpFill = h('i');
  const infoBtn = h('button', { class: 'px-info', type: 'button', onclick: () => xpInfo() }, icon('star', 14), 'How to earn XP');
  const claimCount = h('span', { class: 'px-badge' }, '0');
  const claimAll = h('button', { class: 'px-claimall', type: 'button', onclick: () => doClaimAll() }, h('span', null, 'Claim all'), claimCount);
  const head = h('div', { class: 'px-head' },
    lvBadge,
    h('div', { class: 'px-xp' },
      h('div', { class: 'px-xp-top' }, xpText, infoBtn),
      h('div', { class: 'px-bar', role: 'progressbar', 'aria-label': 'Fuzzy Pass XP' }, xpFill),
      xpSub),
    claimAll);

  // the next big reward
  const nextArt = h('span', { class: 'px-next-art' });
  const nextTitle = h('b', null, '');
  const nextSub = h('small', null, '');
  const nextBtn = h('button', { class: 'px-next', type: 'button' }, nextArt, h('span', { class: 'px-next-t' }, nextTitle, nextSub), h('span', { class: 'px-next-go' }, icon('down', 16)));

  // ───────── the track ─────────
  const nodes = new Map<number, { li: HTMLElement; card: HTMLButtonElement; state: HTMLElement; lv: HTMLElement }>();
  const track = h('ol', { class: 'px-track' });
  for (const r of PASS_TRACK) {
    const { ch, co } = defs(r);
    const big = !!ch;
    const art = ch ? characterPortrait(ch, 64) : co ? cosmeticBadge(co, 52) : h('span', { class: 'px-bigcoin' }, coinMark(r.level % 5 === 0 ? 46 : 38));
    const name = ch ? ch.name : co ? co.name : `${r.coins} coins`;
    const sub = ch ? 'New Fuzzy!' : co ? SLOT_NAME[co.slot] : r.level % 10 === 0 ? 'Big bonus' : r.level % 5 === 0 ? 'Bonus' : 'Level reward';
    const state = h('span', { class: 'px-state' });
    const lv = h('span', { class: 'px-lv' }, String(r.level));
    const card = h('button', { class: 'px-card', type: 'button', 'data-level': r.level, onclick: () => onCard(r.level) },
      h('span', { class: 'px-art' }, art),
      h('span', { class: 'px-txt' },
        h('b', { class: 'px-name' }, name),
        h('small', { class: 'px-sub' }, sub),
        ch || co ? h('span', { class: 'px-coins' }, coinAmount(r.coins ?? 0, 13)) : null),
      state);
    const li = h('li', { class: `px-node${big ? ' big' : ''}${r.level % 5 === 0 || ch ? ' mile' : ''}`, 'data-level': r.level, style: `--rar:${colorOf(r)}` },
      h('div', { class: 'px-rail' }, h('i', { class: 'px-you' }, 'Now'), lv),
      card);
    if (ch) card.append(h('span', { class: 'px-ribbon' }, rarityTag(ch.rarity)));
    nodes.set(r.level, { li, card, state, lv });
    track.append(li);
  }
  const scroller = h('div', { class: 'px-scroll', tabindex: '-1' }, track);
  const wrap = h('div', { class: 'px' }, head, nextBtn, scroller);
  ctx.root.replaceChildren(wrap);
  ctx.root.parentElement?.classList.add('fzx-pass');
  ctx.title('Fuzzy Pass');

  // ───────── drawing the state ─────────
  function update(): void {
    const info = passInfo(), claimable = passClaimable();
    lvNum.textContent = String(info.level);
    lvBadge.style.setProperty('--p', String(info.maxed ? 100 : Math.round((info.into / info.need) * 100)));
    xpText.textContent = info.maxed ? 'Max level reached!' : `${info.into.toLocaleString()} / ${info.need.toLocaleString()} XP`;
    xpFill.style.width = `${info.maxed ? 100 : Math.round((info.into / info.need) * 100)}%`;
    xpSub.textContent = info.maxed ? 'Every reward on the Pass is unlocked.' : `${(info.need - info.into).toLocaleString()} XP to level ${info.level + 1}`;
    claimCount.textContent = String(claimable.length);
    claimAll.classList.toggle('on', claimable.length > 0);
    claimAll.toggleAttribute('disabled', claimable.length === 0);
    claimAll.setAttribute('aria-label', claimable.length ? `Claim all ${claimable.length} rewards` : 'No rewards to claim');
    claimAll.firstElementChild!.textContent = claimable.length ? 'Claim all' : 'All claimed';
    for (const r of PASS_TRACK) {
      const n = nodes.get(r.level)!, st = stateOf(r.level);
      const { ch, co } = defs(r);
      n.li.classList.toggle('claimed', st === 'claimed');
      n.li.classList.toggle('claimable', st === 'claimable');
      n.li.classList.toggle('locked', st === 'locked');
      n.li.classList.toggle('reached', r.level <= info.level);
      n.li.classList.toggle('past', r.level < info.level);
      n.li.classList.toggle('cur', r.level === info.level);
      if (n.card.dataset.st !== st) {
        n.card.dataset.st = st;
        n.lv.replaceChildren(st === 'claimed' ? icon('check', 15) : st === 'locked' ? icon('lock', 13) : String(r.level));
        n.state.replaceChildren(st === 'claimed' ? h('span', null, icon('check', 14), 'Claimed') : st === 'claimable' ? h('span', null, 'Claim') : h('span', null, icon('lock', 13), `Level ${r.level}`));
      }
      const what = ch ? ch.name : co ? co.name : `${r.coins} coins`;
      n.card.setAttribute('aria-label', `Level ${r.level}: ${what}${ch || co ? ` and ${r.coins} coins` : ''}. ${st === 'claimed' ? 'Claimed.' : st === 'claimable' ? 'Ready to claim.' : 'Locked.'}`);
    }
    updateNext();
  }
  function updateNext(): void {
    const info = passInfo(), claimed = save().passClaimed;
    const nextChar = PASS_TRACK.find((r) => r.character && !claimed.includes(r.level));
    const nextAny = nextChar ?? PASS_TRACK.find((r) => r.cosmetic && !claimed.includes(r.level));
    nextBtn.hidden = !nextAny;
    if (!nextAny) return;
    const { ch, co } = defs(nextAny);
    const left = nextAny.level - info.level;
    nextArt.replaceChildren(ch ? characterPortrait(ch, 42) : co ? cosmeticBadge(co, 38) : coinMark(30));
    nextTitle.textContent = left <= 0 ? `Ready to claim: ${ch?.name ?? co?.name}` : `Next ${ch ? 'Fuzzy' : 'style'}: ${ch?.name ?? co?.name}`;
    nextSub.textContent = left <= 0 ? `Level ${nextAny.level} · tap to find it` : `Level ${nextAny.level} · ${left === 1 ? '1 level' : `${left} levels`} to go`;
    nextBtn.onclick = () => goTo(nextAny.level, true, true);
    nextBtn.classList.toggle('ready', left <= 0);
  }

  // ───────── layout mode (phone list / winding road / horizontal track) ─────────
  let mode: 'h' | 'zig' | 'list' = 'list';
  function layout(): void {
    const w = ctx.root.clientWidth, hh = ctx.root.clientHeight;
    const m = w >= 720 && hh < w * 1.0 ? 'h' : w >= 520 ? 'zig' : 'list';
    if (m === mode && wrap.dataset.mode) return;
    const keep = centreLevel();
    mode = m; wrap.dataset.mode = m;
    requestAnimationFrame(() => goTo(keep, false, false));
  }
  /** the level nearest the middle of the track view */
  function centreLevel(): number {
    const sr = scroller.getBoundingClientRect(); let best = passInfo().level, bd = Infinity;
    for (const [l, n] of nodes) { const r = n.li.getBoundingClientRect(); const d = mode === 'h' ? Math.abs(r.left + r.width / 2 - (sr.left + sr.width / 2)) : Math.abs(r.top + r.height / 2 - (sr.top + sr.height / 2)); if (d < bd) { bd = d; best = l; } }
    return best;
  }
  function goTo(level: number, smooth: boolean, pulse: boolean): void {
    const n = nodes.get(Math.min(PASS_LEVELS, Math.max(1, level)));
    if (!n) return;
    const sr = scroller.getBoundingClientRect(), r = n.li.getBoundingClientRect();
    const behavior: ScrollBehavior = smooth && !reduced() ? 'smooth' : 'auto';
    if (mode === 'h') scroller.scrollTo({ left: scroller.scrollLeft + (r.left - sr.left) - (sr.width - r.width) / 2, behavior });
    else scroller.scrollTo({ top: scroller.scrollTop + (r.top - sr.top) - (sr.height - r.height) / 2, behavior });
    if (pulse) { n.li.classList.remove('focus'); void n.li.offsetWidth; n.li.classList.add('focus'); setTimeout(() => n.li.classList.remove('focus'), 2600); }
  }

  // ───────── claiming ─────────
  function burst(from: Element, n = 12): void {
    if (reduced()) return;
    const r = from.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const layer = h('div', { class: 'px-burst', 'aria-hidden': 'true' });
    document.body.append(layer);
    for (let i = 0; i < n; i++) {
      const c = h('span', { class: 'px-flyer', style: `left:${cx}px;top:${cy}px` }, coinMark(16 + (i % 3) * 3));
      layer.append(c);
      const a = (Math.PI * 2 * i) / n + Math.random() * 0.4, d = 50 + Math.random() * 70;
      c.animate([{ transform: 'translate(-50%,-50%) scale(.4)', opacity: 1 }, { transform: `translate(calc(-50% + ${Math.cos(a) * d}px), calc(-50% + ${Math.sin(a) * d - 30}px)) scale(1)`, opacity: 1, offset: 0.55 }, { transform: `translate(calc(-50% + ${Math.cos(a) * d * 1.1}px), calc(-50% + ${Math.sin(a) * d + 60}px)) scale(.7)`, opacity: 0 }], { duration: 850 + Math.random() * 250, easing: 'cubic-bezier(.2,.7,.3,1)' });
    }
    setTimeout(() => layer.remove(), 1300);
  }
  async function celebrate(): Promise<void> {
    try { const m = await import('./celebrate'); await m.celebrateAll(ctx.root, { equipChanged: ctx.equipChanged, go: ctx.go }); } catch (e) { console.error(e); }
  }
  function claimOne(level: number): void {
    const r = PASS_TRACK[level - 1], n = nodes.get(level);
    if (!r || !n || stateOf(level) !== 'claimable') return;
    if (!claimPass(level)) return;
    n.li.classList.remove('pop'); void n.li.offsetWidth; n.li.classList.add('pop');
    burst(n.card);
    update();
    const { ch, co } = defs(r);
    if (ch || co) void celebrate();
    else toast(`+${r.coins} coins`, 'good', 1800);
  }
  function doClaimAll(): void {
    const list = passClaimable();
    if (!list.length) return;
    const before = coins();
    const got = claimAllPass();
    for (const l of list.slice(0, 6)) { const n = nodes.get(l); if (n) { n.li.classList.remove('pop'); void n.li.offsetWidth; n.li.classList.add('pop'); } }
    const first = nodes.get(list[0])?.card ?? claimAll;
    burst(claimAll, 16); burst(first, 8);
    update();
    const gained = coins() - before;
    if (save().pending.length) void celebrate();
    else toast(`${got} reward${got === 1 ? '' : 's'} claimed · +${gained.toLocaleString()} coins`, 'good', 2200);
  }

  function onCard(level: number): void {
    if (dragMoved) return;
    const r = PASS_TRACK[level - 1], st = stateOf(level);
    if (st === 'claimable') { claimOne(level); return; }
    const { ch, co } = defs(r);
    if (ch || co) { detail(r, st); return; }
    if (st === 'claimed') toast(`Level ${level}: ${r.coins} coins — claimed`, 'info', 1600);
    else toast(`Level ${level}: ${r.coins} coins · ${xpLeft(level)} to go`, 'info', 1900);
  }
  const xpLeft = (level: number): string => `${Math.max(0, xpToReach(level) - save().xp).toLocaleString()} XP`;

  // ───────── sheets ─────────
  function detail(r: PassReward, st: NodeState): void {
    const { ch, co } = defs(r);
    const owned = ch ? hasCharacter(ch.id) : co ? hasCosmetic(co.id) : false;
    const info = passInfo();
    const body = h('div', { class: 'px-detail', style: `--rar:${colorOf(r)}` },
      h('div', { class: 'px-detail-art' }, ch ? characterPortrait(ch, 112) : cosmeticBadge(co!, 96)),
      h('div', { class: 'px-detail-t' },
        h('div', { class: 'px-detail-row' }, h('b', null, ch?.name ?? co!.name), rarityTag((ch ?? co!).rarity)),
        h('p', null, ch ? ch.tagline : co!.blurb),
        ch ? h('p', { class: 'muted' }, ch.personality) : h('p', { class: 'muted' }, `A ${SLOT_NAME[co!.slot].toLowerCase()} for any Fuzzy.`),
        h('p', { class: `px-detail-status ${st}` },
          st === 'claimed' ? (owned ? 'Claimed — it is in your Locker.' : 'Claimed.')
            : st === 'claimable' ? 'Ready to claim!'
              : `Reach level ${r.level} — ${r.level - info.level === 1 ? '1 level' : `${r.level - info.level} levels`} to go (${xpLeft(r.level)}).`),
        h('div', { class: 'px-detail-coins' }, h('span', null, 'Also on this level:'), coinAmount(r.coins ?? 0, 15))));
    const actions: HTMLElement[] = [btn('Close', { kind: 'ghost', onClick: () => m.close() })];
    if (ch) actions.push(btn(owned ? 'Preview in Locker' : 'See in Locker', { kind: 'primary', onClick: () => { m.close(); ctx.go({ to: 'locker', id: ch.id }); } }));
    else if (co && owned) actions.push(btn('Equip', { kind: 'primary', onClick: () => { equipCosmetic(co.id); ctx.equipChanged(); toast(`${co.name} equipped`, 'good', 1500); m.close(); } }));
    const m = modal(ch ? `Level ${r.level} · ${ch.name}` : `Level ${r.level} · ${co!.name}`, body, { actions });
  }
  function xpInfo(): void {
    const row = (label: string, v: string) => h('li', null, h('span', null, label), h('b', null, v));
    const m = modal('How to earn XP', h('div', { class: 'px-xpinfo' },
      h('p', { class: 'muted' }, 'You earn XP just by playing Fuzzy Crossing. Every level of the Pass is free — nothing here costs money.'),
      h('ul', null,
        row('Collect a Fuzzy', `+${XP.pickup} XP`), row('Collect a golden Fuzzy', `+${XP.gold} XP`), row('Fill a nest', `+${XP.nest} XP`), row('Clear a level', `+${XP.level} XP`),
        row('Finish a run', `+${XP.perHundredScore} XP per 100 points`), row('Endless Crossing', `+${XP.endlessPer10Rows} XP per 10 rows`),
        row('Daily mission', `+${XP.mission} XP`), row('Weekly mission', `+${XP.weeklyMission} XP`))), { actions: [btn('Got it', { kind: 'primary', onClick: () => m.close() })] });
  }

  // ───────── scrolling: wheel → sideways, drag with a mouse, arrow keys ─────────
  let dragMoved = false;
  let drag: { x: number; y: number; sl: number; st: number; id: number } | null = null;
  scroller.addEventListener('wheel', (e) => {
    if (mode !== 'h') return;
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { scroller.scrollLeft += e.deltaY; e.preventDefault(); }
  }, { passive: false });
  scroller.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    drag = { x: e.clientX, y: e.clientY, sl: scroller.scrollLeft, st: scroller.scrollTop, id: e.pointerId }; dragMoved = false;
  });
  addEventListener('pointermove', onMove);
  addEventListener('pointerup', onUp);
  addEventListener('pointercancel', onUp);
  function onMove(e: PointerEvent): void {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!dragMoved && Math.hypot(dx, dy) > 6) { dragMoved = true; scroller.classList.add('dragging'); }
    if (dragMoved) { if (mode === 'h') scroller.scrollLeft = drag.sl - dx; else scroller.scrollTop = drag.st - dy; }
  }
  function onUp(): void { if (!drag) return; drag = null; scroller.classList.remove('dragging'); setTimeout(() => { dragMoved = false; }, 0); }
  scroller.addEventListener('keydown', (e) => {
    const fwd = mode === 'h' ? ['ArrowRight', 'ArrowDown'] : ['ArrowDown', 'ArrowRight'], back = mode === 'h' ? ['ArrowLeft', 'ArrowUp'] : ['ArrowUp', 'ArrowLeft'];
    const cards = [...nodes.values()].map((n) => n.card), i = cards.indexOf(document.activeElement as HTMLButtonElement);
    let to = -1;
    if (fwd.includes(e.key)) to = i < 0 ? 0 : Math.min(cards.length - 1, i + 1);
    else if (back.includes(e.key)) to = i < 0 ? 0 : Math.max(0, i - 1);
    else if (e.key === 'Home') to = 0; else if (e.key === 'End') to = cards.length - 1;
    if (to >= 0) { e.preventDefault(); cards[to].focus(); }
  });

  // ───────── live updates + start ─────────
  let raf = 0;
  const onChange = (): void => { cancelAnimationFrame(raf); raf = requestAnimationFrame(update); };
  addEventListener('fz:crossing', onChange);
  const ro = new ResizeObserver(() => layout());
  ro.observe(ctx.root);
  update();
  layout();
  const startLevel = focus && focus.to === 'pass' && focus.level ? focus.level : passInfo().level;
  requestAnimationFrame(() => requestAnimationFrame(() => goTo(startLevel, false, !!(focus && focus.to === 'pass' && focus.level))));

  return () => {
    cancelAnimationFrame(raf);
    removeEventListener('fz:crossing', onChange);
    removeEventListener('pointermove', onMove);
    removeEventListener('pointerup', onUp);
    removeEventListener('pointercancel', onUp);
    ro.disconnect();
    document.querySelectorAll('.px-burst').forEach((x) => x.remove());
  };
};
