/**
 * Worlds — the Fuzzy Crossing campaign map: 10 world cards (stars, levels cleared, locked/open), then a world's 15 levels on a
 * winding path with stars, milestone badges and locks, and a level card (goal, tip, best stars, Play). Starting a level calls
 * ctx.play({ kind: 'world', world, level }). A NavTarget { to: 'worlds', world, level } opens a world and highlights a level.
 */
import { h, icon } from '../../ui/dom';
import type { PanelOpen, NavTarget } from '../hub';
import * as store from '../store';
import { WORLDS, WORLD_COUNT, LEVELS_PER_WORLD, OPEN_AFTER, worldOpen, levelOpen, starsOf, clearedIn, starsIn, nextLevel, worldFlawless, type WorldDef } from '../worlds';
import { getLevel, milestoneOf, MILESTONE_NAME, MILESTONE_ICON } from '../levels';
import { CHARACTERS } from '../characters';
import { friendUrl } from '../../content/friends';
import './worlds.css';

const starRow = (n: number, of = 3) => h('span', { class: 'fzw-stars', 'aria-label': `${n} of ${of} stars` }, ...Array.from({ length: of }, (_, i) => h('i', { class: i < n ? 'on' : '' }, '★')));

/** a small illustrated scene per world (SVG shapes, no images) */
function scene(w: WorldDef): SVGSVGElement {
  const NS = 'http://www.w3.org/2000/svg';
  const s = document.createElementNS(NS, 'svg');
  s.setAttribute('viewBox', '0 0 160 70'); s.setAttribute('class', 'fzw-scene'); s.setAttribute('aria-hidden', 'true'); s.setAttribute('preserveAspectRatio', 'xMidYMax slice');
  const a = 'rgba(255,255,255,.28)', b = 'rgba(255,255,255,.45)', c = 'rgba(0,0,0,.12)';
  const art: Record<string, string> = {
    meadow: `<circle cx="128" cy="18" r="10" fill="${b}"/><path d="M0 52 Q40 34 80 50 T160 46 V70 H0z" fill="${a}"/><circle cx="34" cy="48" r="3" fill="${b}"/><circle cx="52" cy="54" r="2.5" fill="${b}"/><circle cx="104" cy="50" r="3" fill="${b}"/>`,
    city: `<path d="M8 70V36h14v34M26 70V22h18v48M48 70V40h12v30M64 70V14h20v56M88 70V30h16v40M108 70V44h12v26M124 70V24h20v46" fill="${a}"/><path d="M0 62h160v8H0z" fill="${c}"/>`,
    forest: `<path d="M10 70 22 38 34 70zM30 70 44 30 58 70zM60 70 72 42 84 70zM88 70 102 26 116 70zM118 70 130 40 142 70z" fill="${a}"/><circle cx="130" cy="16" r="7" fill="${b}"/>`,
    rail: `<path d="M0 56h160v4H0zM0 64h160v4H0z" fill="${b}"/><path d="M20 30h70v20H20z M90 36h22v14H90z" fill="${a}"/><circle cx="34" cy="52" r="5" fill="${b}"/><circle cx="76" cy="52" r="5" fill="${b}"/><path d="M28 30v-8h10v8" fill="${a}"/>`,
    storm: `<path d="M20 26a14 10 0 0 1 28-2 10 8 0 0 1 12 12H18a6 6 0 0 1 2-10z" fill="${b}"/><path d="M92 14a16 11 0 0 1 32-2 11 9 0 0 1 14 13H90a7 7 0 0 1 2-11z" fill="${a}"/><path d="M110 28 102 44h8l-6 16 16-22h-8l6-10z" fill="${b}"/><path d="M0 60 Q80 50 160 60V70H0z" fill="${a}"/>`,
    snow: `<path d="M0 70 40 24 64 50 92 16 132 58 160 40V70z" fill="${a}"/><path d="M40 24 48 34 36 34zM92 16 102 28 84 28z" fill="${b}"/>`,
    haunted: `<circle cx="126" cy="18" r="11" fill="${b}"/><path d="M18 70V44a8 8 0 0 1 16 0v26M44 70V50a6 6 0 0 1 12 0v20M98 70V46a7 7 0 0 1 14 0v24" fill="${a}"/><path d="M70 38q5-8 10 0q5-8 10 0" stroke="${b}" stroke-width="2" fill="none"/>`,
    tropical: `<path d="M0 58 Q80 48 160 58V70H0z" fill="${a}"/><path d="M40 58 44 24" stroke="${b}" stroke-width="3"/><path d="M44 24q-16-4-22 6M44 24q14-6 22 4M44 24q-6-12-16-12M44 24q8-10 18-8" stroke="${b}" stroke-width="3" fill="none"/><circle cx="124" cy="20" r="9" fill="${b}"/>`,
    neon: `<path d="M8 70V30h16v40M28 70V16h18v54M50 70V36h14v34M68 70V22h20v48M92 70V40h12v30M108 70V12h18v58M130 70V34h20v36" fill="none" stroke="${b}" stroke-width="2"/><path d="M0 64h160" stroke="${b}" stroke-width="2" stroke-dasharray="6 6"/>`,
    legend: `<path d="M56 40l8-14 8 10 8-14 8 14 8-10 8 14v8H56z" fill="${b}"/><path d="M0 62 Q80 52 160 62V70H0z" fill="${a}"/><circle cx="30" cy="20" r="2" fill="${b}"/><circle cx="130" cy="14" r="2" fill="${b}"/><circle cx="116" cy="30" r="1.5" fill="${b}"/>`,
  };
  s.innerHTML = art[w.theme.props] ?? art.meadow;
  return s;
}

/** the Fuzzy you win by clearing every level of a world (worlds 6–10) */
const prizeOf = (n: number) => CHARACTERS.find((c) => c.unlock.kind === 'world' && c.unlock.world === n);

export const open: PanelOpen = (ctx, focus) => {
  let view: { world: number; level?: number } | null = null;
  const stars = () => store.save().worlds;
  const onChange = () => render();
  addEventListener('fz:crossing', onChange);

  function render(): void {
    if (view) renderWorld(view.world, view.level); else renderMap();
  }

  function renderMap(): void {
    ctx.title('Worlds');
    const m = stars();
    let total = 0; for (let w = 1; w <= WORLD_COUNT; w++) total += starsIn(m, w);
    const cards = WORLDS.map((w) => {
      const openW = worldOpen(m, w.n);
      const done = clearedIn(m, w.n);
      const prize = prizeOf(w.n);
      const card = h('button', { class: `fzw-card ${openW ? '' : 'locked'}`, type: 'button', style: `--wc:${w.color}`, 'data-world': w.n, 'aria-label': `World ${w.n}: ${w.name}${openW ? '' : ' (locked)'}` },
        scene(w),
        h('span', { class: 'fzw-card-top' }, h('span', { class: 'fzw-emoji' }, w.emoji), h('small', null, `World ${w.n}`)),
        h('b', null, w.name),
        h('em', null, openW ? w.tagline : `Clear ${OPEN_AFTER} levels of ${WORLDS[w.n - 2]?.name ?? ''} to open`),
        h('span', { class: 'fzw-card-foot' },
          openW ? h('span', { class: 'fzw-prog' }, h('i', { style: `width:${Math.round((done / LEVELS_PER_WORLD) * 100)}%` })) : h('span', { class: 'fzw-lock' }, icon('lock', 15), ' Locked'),
          openW ? h('small', null, `${done}/15 · ★ ${starsIn(m, w.n)}/45`) : null),
        prize ? h('span', { class: `fzw-prize ${store.hasCharacter(prize.id) ? 'got' : ''}`, title: `Clear all 15 levels to win ${prize.name}` }, prize.friend ? h('img', { src: friendUrl(prize.friend), alt: '' }) : '🎁', h('small', null, store.hasCharacter(prize.id) ? 'Won' : prize.name)) : null,
        worldFlawless(m, w.n) ? h('span', { class: 'fzw-flaw', title: 'Every level with 3 stars' }, '✨') : null);
      card.addEventListener('click', () => {
        if (!openW) { card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake'); return; }
        view = { world: w.n }; render();
      });
      return card;
    });
    ctx.root.replaceChildren(h('div', { class: 'fzw' },
      h('div', { class: 'fzw-head' }, h('div', null, h('h3', null, 'Ten worlds, 150 crossings'), h('p', { class: 'muted' }, 'Clear 10 levels of a world to open the next one. Levels 5, 10 and 15 are special challenges.')),
        h('span', { class: 'fzw-total' }, '★ ', h('b', null, String(total)), h('small', null, ' / 450'))),
      h('div', { class: 'fzw-grid' }, ...cards)));
  }

  function renderWorld(n: number, pick?: number): void {
    const w = WORLDS[n - 1];
    const m = stars();
    ctx.title(`World ${n} · ${w.name}`);
    let sel = pick && levelOpen(m, n, pick) ? pick : nextLevel(m, n);
    const detail = h('div', { class: 'fzw-detail' });
    const nodes: HTMLElement[] = [];
    const path = h('div', { class: 'fzw-path' });
    for (let l = 1; l <= LEVELS_PER_WORLD; l++) {
      const open = levelOpen(m, n, l), st = starsOf(m, n, l), ms = milestoneOf(n, l);
      const node = h('button', { class: `fzw-node ${open ? '' : 'locked'} ${st ? 'done' : ''} ${ms ? 'ms' : ''}`, type: 'button', 'data-level': l, 'aria-label': `Level ${l}${ms ? ` — ${MILESTONE_NAME[ms]}` : ''}${open ? '' : ' (locked)'}` },
        h('span', { class: 'fzw-num' }, open ? String(l) : icon('lock', 14)),
        ms ? h('span', { class: 'fzw-badge', title: MILESTONE_NAME[ms] }, MILESTONE_ICON[ms]) : null,
        starRow(st));
      node.addEventListener('click', () => { if (!open) return; sel = l; paint(); });
      nodes.push(node);
      path.append(node);
    }
    function paint(): void {
      nodes.forEach((x, i) => x.classList.toggle('sel', i + 1 === sel));
      const d = getLevel(n, sel);
      const best = starsOf(m, n, sel);
      const ms = d.milestone;
      const goal = [
        `Fill ${d.goal.nests} nest${d.goal.nests > 1 ? 's' : ''}`,
        d.goal.coins ? `collect ${d.goal.coins} coins first` : null,
        d.goal.timeLimit ? `within ${d.goal.timeLimit} seconds` : null,
        d.lives === 1 ? 'one life only' : `${d.lives} lives`,
      ].filter(Boolean).join(' · ');
      if (view) view.level = sel;
      const play = h('button', { class: 'btn btn-primary btn-lg btn-block fzw-play', type: 'button' }, icon('play', 18), h('span', null, best ? 'Play again' : `Play level ${sel}`));
      play.addEventListener('click', () => ctx.play({ kind: 'world', world: n, level: sel }));
      detail.replaceChildren(
        h('div', { class: 'fzw-detail-top' },
          h('div', null, h('small', null, `Level ${sel}${ms ? ` · ${MILESTONE_ICON[ms]} ${MILESTONE_NAME[ms]}` : ''}`), h('b', null, d.name)),
          starRow(best)),
        h('p', { class: 'fzw-goal' }, h('span', { class: 'fzw-goal-ic' }, '🎯'), goal),
        h('p', { class: 'fzw-tip' }, h('span', { class: 'fzw-goal-ic' }, '💡'), d.tip),
        h('p', { class: 'fzw-starsrule muted' }, '★★★ no lives lost · ★★ one lost · ★ cleared'),
        play);
    }
    paint();
    const back = h('button', { class: 'fzw-backlink', type: 'button' }, icon('back', 16), ' All worlds');
    back.addEventListener('click', () => { view = null; render(); });
    const prize = prizeOf(n);
    ctx.root.replaceChildren(h('div', { class: 'fzw fzw-world', style: `--wc:${w.color}` },
      back,
      h('div', { class: 'fzw-banner' }, scene(w), h('span', { class: 'fzw-emoji big' }, w.emoji),
        h('div', null, h('small', null, `World ${n}`), h('b', null, w.name), h('em', null, w.tagline)),
        h('span', { class: 'fzw-banner-stat' }, h('b', null, `${clearedIn(m, n)}/15`), h('small', null, `★ ${starsIn(m, n)}/45`))),
      h('div', { class: 'fzw-teach' }, ...w.teaches.map((t) => h('span', null, t)), prize ? h('span', { class: 'prize' }, `🏆 Clear all 15: ${prize.name}`) : null),
      h('div', { class: 'fzw-body' }, path, detail)));
    if (pick) requestAnimationFrame(() => { const el = nodes[pick - 1]; el?.classList.add('focus'); el?.scrollIntoView({ block: 'nearest', inline: 'center' }); });
  }

  const f = focus as Extract<NavTarget, { to: 'worlds' }> | undefined;
  if (f?.world && worldOpen(stars(), f.world)) view = { world: f.world, level: f.level };
  render();
  return () => removeEventListener('fz:crossing', onChange);
};
